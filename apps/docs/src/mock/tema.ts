import { tambahRute } from './siakad';

/** Tema aplikasi tiruan (/v1/tema) untuk PengaturanTema dan TemaAplikasi. Lapis kampus → aplikasi → lingkup. */
type Lapis = { tema: Record<string, unknown>; tata: Record<string, unknown>; versi: number; oleh: string; pada: string };
const LAPIS = new Map<string, Lapis>([['kampus/', { tema: { font: 'jakarta' }, tata: {}, versi: 1, oleh: 'admin', pada: '2026-11-15 08:00:00' }]]);
const RIWAYAT: Array<{ id: number; kunci: string; versi: number; aksi: string; tema: Record<string, unknown>; tata: Record<string, unknown>; catatan: string | null; oleh: string; pada: string }> = [];
const sekarang = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

function ambil(aplikasi: string, lingkup: string) {
  const urut: Array<[string, string]> = [['kampus', ''], ...(aplikasi === 'kampus' ? [] : [[aplikasi, ''] as [string, string]]), ...(lingkup ? [[aplikasi, lingkup] as [string, string]] : [])];
  let tema = {};
  let tata = {};
  const warisan = { tema: {}, tata: {} };
  let sendiri: Lapis | undefined;
  const sumber = [];
  for (const [i, [a, l]] of urut.entries()) {
    const r = LAPIS.get(`${a}/${l}`);
    if (!r) continue;
    if (i === urut.length - 1) sendiri = r;
    else Object.assign(warisan.tema, r.tema), Object.assign(warisan.tata, r.tata);
    tema = { ...tema, ...r.tema };
    tata = { ...tata, ...r.tata };
    sumber.push({ aplikasi: a, lingkup: l, versi: r.versi, diubah_pada: r.pada });
  }
  return {
    data: { aplikasi, lingkup, tema, tata, sendiri: { tema: sendiri?.tema ?? {}, tata: sendiri?.tata ?? {} }, warisan, sumber, versi: sendiri?.versi ?? 0, diubah_oleh: sendiri?.oleh ?? null, diubah_pada: sendiri?.pada ?? null, tersedia: true },
  };
}

const bagian = (u: URL) => {
  const [, , , aplikasi = '', ...sisa] = u.pathname.split('/');
  return { aplikasi, lingkup: u.searchParams.get('lingkup') ?? '', sisa };
};

function simpan(aplikasi: string, lingkup: string, d: Record<string, unknown>, aksi = 'diubah') {
  const k = `${aplikasi}/${lingkup}`;
  const versi = (LAPIS.get(k)?.versi ?? 0) + 1;
  const isi = { tema: (d.tema as Record<string, unknown>) ?? {}, tata: (d.tata as Record<string, unknown>) ?? {}, versi, oleh: 'dekan.ft', pada: sekarang() };
  LAPIS.set(k, isi);
  RIWAYAT.unshift({ id: RIWAYAT.length + 1, kunci: k, versi, aksi, tema: isi.tema, tata: isi.tata, catatan: (d.catatan as string) ?? null, oleh: isi.oleh, pada: isi.pada });
  return ambil(aplikasi, lingkup);
}

tambahRute(/^\/v1\/tema\/[a-z0-9_-]+(\/.*)?$/, async (u, init) => {
  const { aplikasi, lingkup, sisa } = bagian(u);
  const metode = (init?.method ?? 'GET').toUpperCase();
  if (sisa[0] === 'akses') return { data: { aplikasi, lingkup, boleh: true, admin: false, tersedia: true } };
  if (sisa[0] === 'riwayat' && sisa[2] === 'pulihkan') {
    const r = RIWAYAT.find((x) => x.id === Number(sisa[1]));
    return r ? simpan(aplikasi, lingkup, { tema: r.tema, tata: r.tata, catatan: `Dipulihkan dari versi ${r.versi}` }, 'dipulihkan') : { __status: 404, error: { code: 'not_found', message: 'Versi tema tidak ditemukan.' } };
  }
  if (sisa[0] === 'riwayat') return { data: { riwayat: RIWAYAT.filter((r) => r.kunci === `${aplikasi}/${lingkup}`) } };
  if (metode === 'POST') return simpan(aplikasi, lingkup, init?.body ? JSON.parse(String(init.body)) : {});
  return ambil(aplikasi, lingkup);
});
