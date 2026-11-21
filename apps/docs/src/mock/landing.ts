import { tambahRute } from './siakad';

/**
 * Halaman landing tiruan (/v1/tema/{aplikasi}/halaman/{halaman}) untuk PenyuntingLanding dan LandingAplikasi:
 * draf, terbit, revisi (409), riwayat, pulihkan ke draf. Isi tidak dibersihkan seketat server SIAKAD.
 */
type Dok = { versi: 1; blok: unknown[]; halaman?: Record<string, unknown> };
interface Baris {
  draf: Dok | null;
  revisi: number;
  draf_oleh: string | null;
  draf_pada: string | null;
  terbit: Dok | null;
  versi: number;
  terbit_oleh: string | null;
  terbit_pada: string | null;
}
const HALAMAN = new Map<string, Baris>();
const RIWAYAT: Array<{ id: number; kunci: string; versi: number; aksi: string; isi: Dok; catatan: string | null; oleh: string; pada: string }> = [];
const sekarang = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const baru = (): Baris => ({ draf: null, revisi: 0, draf_oleh: null, draf_pada: null, terbit: null, versi: 0, terbit_oleh: null, terbit_pada: null });

function keluaran(aplikasi: string, lingkup: string, halaman: string, draf: boolean) {
  const r = HALAMAN.get(`${aplikasi}/${lingkup}/${halaman}`) ?? baru();
  return {
    data: {
      aplikasi,
      lingkup,
      halaman,
      terbit: r.terbit,
      versi: r.versi,
      terbit_oleh: r.terbit_oleh,
      terbit_pada: r.terbit_pada,
      sumber: r.versi ? { aplikasi, lingkup } : null,
      tersedia: true,
      berkas: {},
      ...(draf ? { draf: r.draf, revisi: r.revisi, draf_oleh: r.draf_oleh, draf_pada: r.draf_pada } : {}),
    },
  };
}

const konflik = (r: Baris) => ({ __status: 409, error: { code: 'draf_berubah', message: `Draf halaman ini baru disimpan ${r.draf_oleh ?? 'pengguna lain'}. Muat ulang draf terbaru sebelum menyimpan agar perubahannya tidak tertimpa.` } });

tambahRute(/^\/v1\/tema\/[a-z0-9_-]+\/halaman\/[a-z0-9-]+(\/.*)?$/, async (u, init) => {
  const [, , , aplikasi = '', , halaman = 'beranda', ...sisa] = u.pathname.split('/');
  const lingkup = u.searchParams.get('lingkup') ?? '';
  const kunci = `${aplikasi}/${lingkup}/${halaman}`;
  const metode = (init?.method ?? 'GET').toUpperCase();
  const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
  const r = HALAMAN.get(kunci) ?? baru();
  HALAMAN.set(kunci, r);
  const cekRevisi = () => typeof body.revisi === 'number' && body.revisi !== r.revisi;
  if (metode === 'GET' && !sisa.length) return keluaran(aplikasi, lingkup, halaman, u.searchParams.get('draf') === '1');
  if (sisa[0] === 'draf' && sisa[1] === 'buang') {
    Object.assign(r, { draf: null, draf_oleh: null, draf_pada: null, revisi: r.revisi + 1 });
    return keluaran(aplikasi, lingkup, halaman, true);
  }
  if (sisa[0] === 'draf') {
    if (cekRevisi()) return konflik(r);
    Object.assign(r, { draf: body.dokumen as Dok, revisi: r.revisi + 1, draf_oleh: 'pustikom.admin', draf_pada: sekarang() });
    return keluaran(aplikasi, lingkup, halaman, true);
  }
  if (sisa[0] === 'terbit') {
    if (cekRevisi()) return konflik(r);
    const isi = (body.dokumen as Dok | undefined) ?? r.draf;
    if (!isi) return { __status: 422, error: { code: 'draf_kosong', message: 'Belum ada draf untuk diterbitkan.' } };
    Object.assign(r, { terbit: isi, versi: r.versi + 1, terbit_oleh: 'pustikom.admin', terbit_pada: sekarang(), draf: null, draf_oleh: null, draf_pada: null, revisi: r.revisi + 1 });
    RIWAYAT.unshift({ id: RIWAYAT.length + 1, kunci, versi: r.versi, aksi: 'terbit', isi, catatan: (body.catatan as string) ?? null, oleh: 'pustikom.admin', pada: r.terbit_pada! });
    return keluaran(aplikasi, lingkup, halaman, true);
  }
  if (sisa[0] === 'riwayat') {
    const v = sisa[1] ? RIWAYAT.find((x) => x.id === Number(sisa[1]) && x.kunci === kunci) : null;
    if (sisa[1] && !v) return { __status: 404, error: { code: 'not_found', message: 'Versi halaman tidak ditemukan.' } };
    if (v && sisa[2] === 'pulihkan') {
      Object.assign(r, { draf: v.isi, revisi: r.revisi + 1, draf_oleh: 'pustikom.admin', draf_pada: sekarang() });
      return keluaran(aplikasi, lingkup, halaman, true);
    }
    if (v) return { data: { id: v.id, versi: v.versi, aksi: v.aksi, dokumen: v.isi, catatan: v.catatan, oleh: v.oleh, pada: v.pada, berkas: {} } };
    return { data: { riwayat: RIWAYAT.filter((x) => x.kunci === kunci).map(({ isi, kunci: _k, ...x }) => ({ ...x, jumlah_blok: isi.blok.length })) } };
  }
  return { __status: 404, error: { code: 'not_found', message: 'Rute tidak dikenal.' } };
});

tambahRute(/\/v1\/portal\/situs\/[^/]+\/statistik$/, () => ({ data: { prodi: 14, mahasiswa_aktif: 3127, dosen_aktif: 168, lulusan: 5412, per_prodi: [] } }));
