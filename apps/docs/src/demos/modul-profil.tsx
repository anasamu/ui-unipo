import * as React from 'react';
import { Button } from 'unipo-ui';
import { DataPribadiSaya, KepegawaianSaya, KeuanganMahasiswa, LampiranProfil, ModulProfilSaya, OrangTuaWali, PenelitianDosen, RiwayatProfilSaya, invalidateSiakad } from 'unipo-ui/siakad';
import { setPeranDemo, type PeranDemo } from '../mock/profil';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Modul profil',
  category: 'Profil',
  layout: 'wide',
  order: 1,
  badge: 'baru',
  description:
    'Modul profil siap pakai untuk mahasiswa, dosen, dan tendik. Cukup pasang <ModulProfilSaya />: peran dibaca dari akun yang masuk (/v1/profil/saya), lalu tab disusun otomatis. Mahasiswa mendapat data pribadi, orang tua dan wali, data akademik + riwayat studi, keuangan/UKT, serta riwayat pendidikan, pekerjaan, prestasi, dan organisasi. Dosen mendapat kepegawaian, mahasiswa PA, jadwal mengajar, dan penelitian & PkM (LPPM). Tendik mendapat kepegawaian dan riwayat. Setiap bagian juga bisa dipakai sendiri sebagai widget.',
  importLine: "import { ModulProfilSaya, KepalaProfilSaya, DataPribadiSaya, OrangTuaWali, RiwayatProfilSaya, LampiranProfil, KeuanganMahasiswa, KepegawaianSaya, PenelitianDosen } from 'unipo-ui/siakad';",
  demos: {
    Modul: 'ModulProfilSaya: satu komponen, tab mengikuti peran (ganti peran tiruan di atas)',
    Pribadi: 'DataPribadiSaya: ubah sendiri atau ajukan perubahan data induk',
    Keluarga: 'OrangTuaWali: ayah, ibu, wali (GET /v1/profil/saya/keluarga)',
    Riwayat: 'RiwayatProfilSaya: linimasa + tambah/ubah/hapus',
    Lampiran: 'LampiranProfil: berkas satu baris profil (unggah, buka, hapus; terkunci untuk dokumen terverifikasi)',
    Keuangan: 'KeuanganMahasiswa: UKT dan biaya lain per periode',
    Kepegawaian: 'KepegawaianSaya: jabatan, pangkat, masa kerja, riwayat SDM',
    Penelitian: 'PenelitianDosen: SINTA/Scopus, kegiatan, luaran (LPPM)',
  },
  props: [
    [
      'ModulProfilSaya.tab',
      'TabProfil[]',
      "Batasi/urutkan tab: 'pribadi' | 'keluarga' | 'akademik' | 'keuangan' | 'pendidikan' | 'pekerjaan' | 'prestasi' | 'organisasi' | 'bimbingan' | 'mengajar' | 'kepegawaian' | 'penelitian'.",
    ],
    ['ModulProfilSaya.aksi', 'ReactNode', 'Tombol di kepala profil.'],
    ['RiwayatProfilSaya.jenis', "'pendidikan' | 'pekerjaan' | 'prestasi' | 'organisasi'", 'Tabel profil_riwayat_*; baris difilter ?username= akun sendiri.'],
    ['RiwayatProfilSaya.lampiran', 'LampiranProfilProps (tanpa path/id)', 'Tombol "Bukti & lampiran" per baris yang membuka LampiranProfil.'],
    ['RiwayatProfilSaya.judul', 'ReactNode | false', 'false menyembunyikan judul bila halaman sudah punya PageHeader.'],
    ['LampiranProfil.path / id', 'string / number', 'Baris /v1/profil/{path}/{id}; berkas diunggah ke …/berkas (multipart) dan dihapus lewat …/berkas/{uuid}/hapus.'],
    ['LampiranProfil.berkas', 'BerkasProfil[]', 'Opsional; bila kosong diambil dari GET /v1/profil/{path}/{id}.'],
    ['LampiranProfil.terkunci / urlBerkas', 'boolean / (path, id, uuid) => string', 'Hanya lihat; alamat buka berkas (mis. lewat BFF).'],
    ['KeuanganMahasiswa.nim / PenelitianDosen.nidn', 'string', 'Opsional; bawaan akun yang masuk. Pengelola memilih lewat PilihMahasiswa/PilihDosen.'],
    ['useProfilSaya()', 'QueryState<ProfilSayaLengkap>', 'Data mentah /v1/profil/saya untuk tampilan sendiri.'],
  ],
  notes: [
    'Scope token: profil:read + profil:write, mahasiswa:read (+ mahasiswa:pii untuk biodata), keuangan:read, sdm:read, lppm:read, dosen:read.',
    'Isian yang boleh diubah sendiri (NIK, HP, email, alamat, nama orang tua) divalidasi server sama dengan wizard kelengkapan PDDikti. Nama, tanggal lahir, agama, dan gelar hanya lewat permohonan yang diputus BAK/SDM.',
    'Data orang tua/wali hanya dibaca; perubahan tetap lewat menu Profil Mahasiswa SIAKAD.',
  ],
};

export function Modul() {
  const [p, setP] = React.useState<PeranDemo>('mahasiswa');
  const ganti = (x: PeranDemo) => {
    setPeranDemo(x);
    setP(x);
    invalidateSiakad('');
  };
  React.useEffect(() => () => setPeranDemo('mahasiswa'), []);
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }} role="group" aria-label="Peran tiruan">
        {(['mahasiswa', 'dosen', 'tendik'] as PeranDemo[]).map((x) => (
          <Button key={x} size="sm" variant={p === x ? 'primary' : 'outline'} onClick={() => ganti(x)}>
            Masuk sebagai {x}
          </Button>
        ))}
      </div>
      <ModulProfilSaya key={p} />
    </div>
  );
}

export function Pribadi() {
  return <DataPribadiSaya />;
}
export function Keluarga() {
  return <OrangTuaWali />;
}
export function Riwayat() {
  return <RiwayatProfilSaya jenis="prestasi" />;
}
export function Lampiran() {
  return (
    <LampiranProfil
      path="pendidikan"
      id={1}
      berkas={[
        { uuid: 'a1', nama: 'ijazah-s1.pdf', ukuran: 412_000 },
        { uuid: 'a2', nama: 'transkrip.jpg', ukuran: 1_240_000 },
      ]}
      keterangan="Unggah ijazah atau transkrip sebagai bukti (PDF/JPG)."
    />
  );
}
export function Keuangan() {
  return <KeuanganMahasiswa />;
}
export function Kepegawaian() {
  return <KepegawaianSaya />;
}
export function Penelitian() {
  return <PenelitianDosen nidn="0912088301" />;
}
