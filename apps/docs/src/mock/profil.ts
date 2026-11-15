// Data contoh modul profil per peran (/v1/profil/saya, keluarga, riwayat, keuangan, SDM, LPPM). Isi rekaan.
import { tambahRute } from './siakad';

export type PeranDemo = 'mahasiswa' | 'dosen' | 'tendik';
let peran: PeranDemo = 'mahasiswa';
const pendengar = new Set<() => void>();
/** Ganti peran akun tiruan (demo profil). */
export function setPeranDemo(p: PeranDemo) {
  peran = p;
  pendengar.forEach((f) => f());
}
export const peranDemo = () => peran;
export function dengarPeranDemo(f: () => void) {
  pendengar.add(f);
  return () => void pendengar.delete(f);
}
const badan = (init?: RequestInit) => (init?.body ? JSON.parse(String(init.body)) : {}) as Record<string, any>;
const ip = (kode: string, label: string, kelompok: string, nilai: string | null, ubah: boolean, tampil?: string) => ({
  kode,
  label,
  kelompok,
  jenis: 'teks',
  nilai,
  tampil: tampil ?? nilai,
  bisa_diubah: ubah,
  bisa_diajukan: !ubah,
});

const AKUN = {
  mahasiswa: { username: '2304110001', nama: 'Nurul Aini Hasan', level: 'MAHASISWA', email: 'nurul.aini@mhs.unipo.ac.id' },
  dosen: { username: '0912088301', nama: 'Rahmat Pakaya', level: 'DOSEN', email: 'rahmat.pakaya@unipo.ac.id' },
  tendik: { username: 'K2019004', nama: 'Wulan Gobel', level: 'BAK', email: 'wulan.gobel@unipo.ac.id' },
};
function profilSaya() {
  const a = AKUN[peran];
  const identitas =
    peran === 'mahasiswa'
      ? { peran: 'mahasiswa', peran_label: 'Mahasiswa', kunci: a.username, kunci_label: 'NIM', kode_prodi: '55201', nama_prodi: 'Teknik Informatika', jenjang: 'S1', fakultas: 'Fakultas Teknik' }
      : peran === 'dosen'
        ? { peran: 'dosen', peran_label: 'Dosen', kunci: a.username, kunci_label: 'NIDN', kode_prodi: '55201', nama_prodi: 'Teknik Informatika', jenjang: 'S1', fakultas: 'Fakultas Teknik' }
        : { peran: 'tendik', peran_label: 'Tenaga kependidikan', kunci: a.username, kunci_label: 'NIK pegawai', kode_prodi: null, nama_prodi: null, jenjang: null, fakultas: null };
  const data_pribadi = [
    ip('nama', 'Nama lengkap', 'identitas', a.nama, false),
    ip('tempat_lahir', 'Tempat lahir', 'identitas', 'Marisa', false),
    ip('tanggal_lahir', 'Tanggal lahir', 'identitas', '2005-03-14', false, '14 Maret 2005'),
    ip('jenis_kelamin', 'Jenis kelamin', 'identitas', peran === 'dosen' ? 'L' : 'P', false, peran === 'dosen' ? 'Laki-laki' : 'Perempuan'),
    ip('agama', 'Agama', 'identitas', 'I', false, 'Islam'),
    ip(peran === 'dosen' ? 'nik_dosen' : 'nik', 'NIK', 'identitas', null, true),
    ip('hp', 'Nomor HP', 'kontak', '081234567890', true),
    ip('email', 'Email', 'kontak', a.email, true),
    ip('alamat', 'Alamat (jalan)', 'alamat', 'Jl. Trans Sulawesi No. 12', true),
    ip('desa', 'Desa/kelurahan', 'alamat', 'Botubarani', true),
    ip('kode_pos', 'Kode pos', 'alamat', '96266', true),
    ...(peran === 'mahasiswa' ? [ip('nama_ibu_kandung', 'Nama ibu kandung', 'keluarga', 'Sri Lamato', true), ip('nama_ayah', 'Nama ayah', 'keluarga', 'Yusuf Hasan', true)] : []),
  ];
  return {
    akun: { ...a, login_terakhir: '2026-11-15 08:12:00', bisa_ganti_password: true },
    identitas,
    data_pribadi,
    kelompok_data: { identitas: 'Identitas', kontak: 'Kontak', alamat: 'Alamat', keluarga: 'Keluarga' },
    profil: { nama_panggilan: a.nama.split(' ')[0], judul: peran === 'dosen' ? 'Lektor · Rekayasa Perangkat Lunak' : null, punya_foto: peran === 'mahasiswa', foto_versi: 'a1b2c3d4', keahlian: [] },
    ringkasan: { pekerjaan: riwayat.pekerjaan.length, pendidikan: riwayat.pendidikan.length, prestasi: riwayat.prestasi.length, organisasi: riwayat.organisasi.length, dokumen: 4 },
    kelengkapan: peran === 'tendik' ? null : { persen_wajib: 86, lengkap: false, kurang: [{ kolom: peran === 'dosen' ? 'nik_dosen' : 'nik', label: 'NIK', wajib: true, bisa_diisi_sendiri: true }] },
  };
}
/** Dipakai juga oleh rute /v1/profil/saya di mock lain. */
export function balasProfilSaya() {
  return { data: profilSaya() };
}

let urut = 100;
const riwayat: Record<string, Array<Record<string, any>>> = {
  pendidikan: [
    { id: 1, jenjang: 'SMA', institusi: 'SMA Negeri 1 Marisa', program_studi: 'IPA', tahun_masuk: 2020, tahun_lulus: 2023, masih_studi: 0, ipk: null },
    { id: 2, jenjang: 'S1', institusi: 'Universitas Pohuwato', program_studi: 'Teknik Informatika', tahun_masuk: 2023, tahun_lulus: null, masih_studi: 1 },
  ],
  pekerjaan: [
    { id: 3, instansi: 'CV Data Gorontalo', jabatan: 'Pengembang web (magang)', jenis: 'magang', sektor: 'swasta', lokasi: 'Gorontalo', mulai: '2025-07-01', selesai: '2025-09-30', masih_bekerja: 0 },
  ],
  prestasi: [
    { id: 4, jenis: 'kompetisi', judul: 'Juara 2 Gemastik Pengembangan Aplikasi', penyelenggara: 'Puspresnas', tingkat: 'nasional', peringkat: 'Juara 2', tanggal: '2025-10-20' },
    { id: 5, jenis: 'sertifikasi', judul: 'Junior Web Developer', penyelenggara: 'BNSP', tingkat: 'nasional', tanggal: '2025-05-12' },
  ],
  organisasi: [{ id: 6, nama_organisasi: 'Himpunan Mahasiswa Informatika', jabatan: 'Sekretaris', jenis: 'kemahasiswaan', mulai: '2024-02-01', masih_aktif: 1 }],
};
tambahRute(/^\/v1\/profil\/saya\/keluarga$/, () => ({
  data:
    peran !== 'mahasiswa'
      ? { berlaku: false, anggota: [] }
      : {
          berlaku: true,
          anggota: [
            {
              hubungan: 'AYAH',
              nama: 'Yusuf Hasan',
              tanggal_lahir: '1972-08-02',
              pendidikan_label: 'SMA/sederajat',
              pekerjaan_label: 'Petani',
              penghasilan_label: 'Rp1.000.000 - Rp1.999.999',
              hidup_label: 'Masih hidup',
              agama_label: 'Islam',
              alamat: 'Jl. Trans Sulawesi No. 12',
              kota: 'Pohuwato',
              propinsi: 'Gorontalo',
              hp: '081355501234',
            },
            {
              hubungan: 'IBU',
              nama: 'Sri Lamato',
              tanggal_lahir: '1976-01-19',
              pendidikan_label: 'D3',
              pekerjaan_label: 'Guru honorer',
              penghasilan_label: 'Rp500.000 - Rp999.999',
              hidup_label: 'Masih hidup',
              agama_label: 'Islam',
              alamat: 'Jl. Trans Sulawesi No. 12',
              kota: 'Pohuwato',
              propinsi: 'Gorontalo',
              hp: '085240009876',
              email: 'sri.lamato@contoh.id',
            },
            {
              hubungan: 'WALI',
              nama: 'Andi Daud',
              pendidikan_label: 'S1',
              pekerjaan_label: 'PNS',
              penghasilan_label: 'Rp2.000.000 - Rp4.999.999',
              hidup_label: 'Masih hidup',
              kota: 'Gorontalo',
              hp: '081244400055',
            },
          ],
        },
}));
tambahRute(/^\/v1\/profil\/saya\/data-pribadi$/, (_u, init) => {
  const b = badan(init);
  if (b.hp && !/^08\d{8,12}$/.test(b.hp)) return { __status: 422, error: { code: 'validation', message: 'Data tidak valid.', details: { hp: 'Nomor HP Indonesia diawali 08.' } } };
  return { data: { ok: true } };
});
tambahRute(/^\/v1\/profil\/permohonan$/, (_u, init) => ({ __status: 201, data: { id: 77, status: 'diajukan', ...badan(init) } }));
tambahRute(/^\/v1\/profil\/(pendidikan|pekerjaan|prestasi|organisasi)$/, (u, init) => {
  const j = u.pathname.split('/')[3]!;
  if (init?.method === 'POST') {
    const r = { id: ++urut, ...badan(init) };
    riwayat[j]!.unshift(r);
    return { __status: 201, data: r };
  }
  return { data: riwayat[j], meta: { total: riwayat[j]!.length } };
});
tambahRute(/^\/v1\/profil\/(pendidikan|pekerjaan|prestasi|organisasi)\/\d+\/(ubah|hapus)$/, (u, init) => {
  const [, , , j, id, aksi] = u.pathname.split('/');
  const daftar = riwayat[j!]!;
  const i = daftar.findIndex((x) => String(x.id) === id);
  if (aksi === 'hapus') daftar.splice(i, 1);
  else daftar[i] = { ...daftar[i], ...badan(init) };
  return { data: daftar[i] ?? { id } };
});

const item = (kode: number, jenis: string, tagihan: number, dibayar: number, tgl?: string) => ({
  kode_biaya: kode,
  jenis_biaya: jenis,
  tagihan,
  dibayar,
  potongan: 0,
  sisa: tagihan - dibayar,
  pembayaran: dibayar ? [{ id: kode * 7, tanggal: tgl ?? '2026-08-20', jumlah: dibayar, keterangan: 'VA BSI' }] : [],
});
const per = (tahun_id: string, it: ReturnType<typeof item>[]) => ({
  tahun_id,
  item: it,
  ringkasan: { tagihan: it.reduce((s, x) => s + x.tagihan, 0), dibayar: it.reduce((s, x) => s + x.dibayar, 0), potongan: 0, sisa: it.reduce((s, x) => s + x.sisa, 0) },
});
tambahRute(/^\/v1\/keuangan\/mahasiswa\/[^/]+$/, () => {
  const periode = [
    per('20231', [item(1, 'UKT', 3_500_000, 3_500_000, '2023-08-14'), item(2, 'Jas almamater dan PKKMB', 450_000, 450_000, '2023-08-14')]),
    per('20232', [item(1, 'UKT', 3_500_000, 3_500_000, '2024-02-10')]),
    per('20241', [item(1, 'UKT', 3_500_000, 3_500_000, '2024-08-11')]),
    per('20242', [item(1, 'UKT', 3_500_000, 3_500_000, '2025-02-09')]),
    per('20251', [item(1, 'UKT', 3_500_000, 3_500_000, '2025-08-12'), item(3, 'KKN', 750_000, 750_000, '2025-09-01')]),
    per('20252', [item(1, 'UKT', 3_500_000, 3_500_000, '2026-02-08')]),
    per('20261', [item(1, 'UKT', 3_500_000, 1_750_000, '2026-08-20')]),
  ];
  const r = periode.reduce((s, p) => ({ tagihan: s.tagihan + p.ringkasan.tagihan, dibayar: s.dibayar + p.ringkasan.dibayar, potongan: 0, sisa: s.sisa + p.ringkasan.sisa }), {
    tagihan: 0,
    dibayar: 0,
    potongan: 0,
    sisa: 0,
  });
  return {
    data: {
      nim: '2304110001',
      mode_tagihan: 'tagihan_mahasiswa',
      periode,
      ringkasan: r,
      deposit: 0,
      invoice_aktif: [{ id: 9, nomor: 'INV-20261-0091', tahun_id: '20261', kode_biaya: 1, jumlah: 1_750_000, berlaku_sampai: '2026-11-30' }],
      dispensasi: [],
    },
  };
});

tambahRute(/^\/v1\/sdm\/saya$/, () => ({
  data:
    peran === 'dosen'
      ? {
          id: 21,
          nama_lengkap: 'Rahmat Pakaya, S.Kom., M.Kom.',
          jenis: 'dosen',
          nidn: '0912088301',
          nip: null,
          unit_nama: 'Prodi Teknik Informatika',
          jabatan_akademik: 'Lektor',
          golongan: 'III/c',
          pangkat: 'Penata',
          tmt_masuk: '2014-09-01',
          masa_kerja: { tahun: 12, bulan: 2 },
          tanggal_pensiun_perkiraan: '2048-09-01',
          serdos: true,
          atasan_nama: 'Dr. Fajar Ismail, M.T.',
          jabatan_aktif: [
            { id: 3, jabatan: 'Sekretaris program studi', nama_jabatan: 'Sekretaris Prodi Teknik Informatika', unit: 'Fakultas Teknik', tmt_mulai: '2024-03-01', tmt_selesai: '2028-02-28' },
          ],
          jumlah_riwayat: { 'jabatan-akademik': 2, pangkat: 3, jabatan: 1, pendidikan: 2, diklat: 4, sertifikasi: 1 },
        }
      : {
          id: 44,
          nama_lengkap: 'Wulan Gobel, S.E.',
          jenis: 'tendik',
          nip: '198906122019042004',
          unit_nama: 'Biro Administrasi Akademik',
          golongan: 'III/a',
          pangkat: 'Penata Muda',
          tmt_masuk: '2019-04-01',
          masa_kerja: { tahun: 7, bulan: 7 },
          tanggal_pensiun_perkiraan: '2047-07-01',
          serdos: false,
          atasan_nama: 'Indah Usman, S.Pd., M.M.',
          jabatan_aktif: [{ id: 8, jabatan: 'Kepala subbagian', nama_jabatan: 'Kasubag Registrasi', unit: 'BAAK', tmt_mulai: '2023-01-02' }],
          jumlah_riwayat: { pangkat: 2, jabatan: 2, pendidikan: 1, diklat: 3 },
        },
}));
tambahRute(/^\/v1\/sdm\/pegawai\/\d+\/[a-z-]+$/, (u) => {
  const j = u.pathname.split('/').pop();
  const data: Record<string, Array<Record<string, unknown>>> = {
    'jabatan-akademik': [
      { id: 1, jabatan_akademik: 'Lektor', nomor_sk: '12345/M/KP/2021', tmt: '2021-04-01', status_verifikasi: 'disetujui' },
      { id: 2, jabatan_akademik: 'Asisten Ahli', nomor_sk: '771/K9/KP/2017', tmt: '2017-10-01', status_verifikasi: 'disetujui' },
    ],
    pangkat: [{ id: 3, golongan: 'III/c', nomor_sk: 'SK-YYS/031/2023', tmt: '2023-04-01', status_verifikasi: 'disetujui' }],
    diklat: [
      { id: 5, nama: 'Pekerti', penyelenggara: 'LLDIKTI XVI', tahun: 2016, status_verifikasi: 'disetujui' },
      { id: 6, nama: 'Applied Approach', penyelenggara: 'LLDIKTI XVI', tahun: 2018, status_verifikasi: 'diajukan' },
    ],
  };
  return { data: data[j!] ?? [{ id: 9, nama: 'Contoh riwayat', tahun: 2024, status_verifikasi: 'disetujui' }] };
});
tambahRute(/^\/v1\/lppm\/peneliti\/[^/]+$/, () => ({
  data: {
    dosen: { nidn: '0912088301', nama: 'Rahmat Pakaya, S.Kom., M.Kom.' },
    profil: { sinta_id: '6712345', scopus_id: '57211234567', scholar_id: 'aB3dEfGhIj', orcid: '0000-0002-1234-5678', skor_sinta: 412 },
    rekap_per_tahun: [{ tahun: 2026, penelitian: 1, pengabdian: 1, dana: 27_500_000 }],
    kegiatan: [
      {
        id: 1,
        judul: 'Model prediksi putus studi berbasis data SIAKAD',
        jenis: 'penelitian',
        skema_nama: 'Penelitian Dosen Pemula',
        sumber_dana: 'Kemdiktisaintek',
        tahun_pelaksanaan: 2026,
        dana_disetujui: 20_000_000,
        status: 'berjalan',
      },
      {
        id: 2,
        judul: 'Pelatihan literasi digital aparatur desa Botubarani',
        jenis: 'pengabdian',
        skema_nama: 'PkM Internal',
        sumber_dana: 'Universitas',
        tahun_pelaksanaan: 2026,
        dana_disetujui: 7_500_000,
        status: 'selesai',
      },
      {
        id: 3,
        judul: 'Sistem rekomendasi mata kuliah pilihan',
        jenis: 'penelitian',
        skema_nama: 'Penelitian Internal',
        sumber_dana: 'Universitas',
        tahun_pelaksanaan: 2025,
        dana_disetujui: 10_000_000,
        status: 'selesai',
      },
    ],
    luaran: [
      {
        id: 1,
        judul: 'Prediksi putus studi dengan gradient boosting',
        kategori: 'jurnal',
        wadah: 'Jurnal Teknologi Informasi (SINTA 3)',
        peringkat: 'sinta_3',
        tahun: 2026,
        verifikasi: 'terverifikasi',
      },
      { id: 2, judul: 'Aplikasi rekomendasi mata kuliah', kategori: 'hki', wadah: 'Hak cipta program komputer', tahun: 2025, verifikasi: 'terverifikasi' },
    ],
  },
}));
