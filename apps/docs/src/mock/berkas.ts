import { tambahRute } from './siakad';

/** Berkas terpusat tiruan (/v1/berkas) untuk PilihBerkas, UnggahBerkas, dan lampiran katalog. */
interface B {
  id: string;
  nama: string;
  ekstensi: string;
  mime: string;
  ukuran: number;
  status: 'tersedia';
  kategori: string;
  url: string;
}
const uuid = () => '6f1c2d3e-xxxx-4xxx-9xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
const b = (nama: string, ukuran: number, kategori: string): B => {
  const ekstensi = nama.split('.').pop() ?? '';
  const mime =
    {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      png: 'image/png',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }[ekstensi] ?? 'application/octet-stream';
  return { id: uuid(), nama, ekstensi, mime, ukuran, status: 'tersedia', kategori, url: '#' };
};
const BERKAS: B[] = [
  b('SK Rektor tentang kalender akademik 2026.pdf', 412_000, 'dokumen'),
  b('Surat undangan rapat senat.pdf', 188_400, 'dokumen'),
  b('Ijazah S2 - Dr. Rahmawati.pdf', 1_120_000, 'dokumen'),
  b('Sertifikat pendidik dosen.pdf', 640_000, 'dokumen'),
  b('Laporan AMI prodi Informatika 2026.docx', 2_350_000, 'lampiran'),
  b('Rekap presensi Oktober.xlsx', 96_000, 'lampiran'),
  b('Pas foto 4x6.jpg', 210_000, 'foto'),
  b('Bukti bayar UKT semester ganjil.png', 380_000, 'lampiran'),
];

tambahRute(/^\/v1\/berkas\/info$/, () => ({
  data: {
    maks_byte: 50 * 1024 * 1024,
    maks_mb: 50,
    batas_sekali_unggah_byte: 8 * 1024 * 1024,
    ukuran_potongan: 2 * 1024 * 1024,
    ekstensi: ['pdf', 'jpg', 'png', 'docx', 'xlsx'],
    penyimpanan: { driver: 'r2', kode: 'r2', nama: 'Cloudflare R2' },
  },
}));
tambahRute(/^\/v1\/berkas\/[0-9a-f-]{36}$/, (u) => {
  const x = BERKAS.find((r) => r.id === u.pathname.split('/').pop());
  return x ? { data: x } : { __status: 404, error: { message: 'Berkas tidak ditemukan.' } };
});
tambahRute(/^\/v1\/berkas$/, async (u, init) => {
  if (init?.method === 'POST') {
    const f = init.body instanceof FormData ? init.body.get('berkas') : null;
    const baru = b(f instanceof File ? f.name : 'berkas.pdf', f instanceof File ? f.size : 1000, String((init.body as FormData).get('kategori') ?? 'dokumen'));
    BERKAS.unshift(baru);
    return { __status: 201, data: baru };
  }
  const q = (u.searchParams.get('q') ?? '').toLowerCase();
  const kat = u.searchParams.get('kategori');
  const rows = BERKAS.filter((r) => (!q || r.nama.toLowerCase().includes(q)) && (!kat || r.kategori === kat));
  const per = Number(u.searchParams.get('per_page') ?? 20);
  const page = Number(u.searchParams.get('page') ?? 1);
  return { data: rows.slice((page - 1) * per, page * per), meta: { page, per_page: per, total: rows.length, total_pages: Math.max(1, Math.ceil(rows.length / per)) } };
});
