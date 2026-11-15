import * as React from 'react';
import { Button } from 'unipo-ui';
import { AmbilKrs, DaftarKelasNilai, InputNilaiKelas, IsiEdom, PendaftaranWisuda, PersetujuanKrs } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Alur akademik',
  category: 'Akademik',
  layout: 'wide',
  order: 5,
  badge: 'baru',
  description:
    'Widget alur bisnis yang langsung memanggil API SIAKAD dengan aturan yang sama dengan halaman web lama: ambil KRS (batas SKS, prasyarat, kelas penuh, jadwal bentrok), persetujuan KRS oleh dosen PA, input nilai per kelas, pengisian EDOM, dan pendaftaran wisuda. Semua pemeriksaan tetap diulang di server; tampilan hanya memberi tahu lebih awal.',
  importLine: "import { AmbilKrs, PersetujuanKrs, InputNilaiKelas, DaftarKelasNilai, IsiEdom, PendaftaranWisuda } from 'unipo-ui/siakad';",
  demos: {
    Krs: 'AmbilKrs: penawaran → pilih MK dan kelas → POST /v1/mahasiswa/{nim}/krs',
    Persetujuan: 'PersetujuanKrs: antrian dosen PA, setujui banyak, detail + konsultasi',
    Nilai: 'DaftarKelasNilai + InputNilaiKelas: kelas yang diampu → lembar nilai',
    Edom: 'IsiEdom: daftar mata kuliah → kuesioner per dosen',
    Wisuda: 'PendaftaranWisuda: syarat, periode, kelengkapan toga',
  },
  props: [
    ['AmbilKrs.nim', 'string', 'NIM mahasiswa yang login. Token mahasiswa hanya boleh NIM-nya sendiri.'],
    ['AmbilKrs.onTersimpan', '(hasil) => void', 'Hasil server: tersimpan, sudah_ada, kelas penuh, bentrok, melebihi batas.'],
    ['PersetujuanKrs.prodi / tahunId', 'string', 'Opsional. Dosen PA otomatis hanya melihat mahasiswa bimbingannya.'],
    ['InputNilaiKelas.idj', 'number', 'ID jadwal dari DaftarKelasNilai. Di luar batas tanggal input, tabel hanya bisa dibaca.'],
    ['IsiEdom.tahunId', 'string', 'Opsional, bawaan periode aktif.'],
    ['PendaftaranWisuda.onTerdaftar', '(pendaftaran) => void', 'Setelah POST /v1/kelulusan/wisuda/daftar berhasil.'],
    ['perkiraanNilai(komponen, persen, skala)', '{ angka, huruf }', 'Perkiraan nilai akhir di browser; nilai resmi dihitung server saat disimpan.'],
    ['bentrokKrs(mk, pilihan)', 'Array<[mk, mk]>', 'Pasangan MK yang jadwalnya bentrok (hari + jam ke sama).'],
  ],
  notes: [
    'Scope token: krs:read + krs:write (ambil KRS), akademik:read + akademik:write (persetujuan dan nilai), edom:read + edom:write, kelulusan:read + kelulusan:write.',
    'Input nilai hanya mengirim sel yang berubah. Nilai akhir dan huruf memakai skala prodi dari server; kolom Akhir yang miring adalah perkiraan sebelum disimpan.',
    'Pendaftaran wisuda yang sudah diterima prodi terkunci; perubahan lewat operator prodi.',
  ],
};

export function Krs() {
  return <AmbilKrs nim="2304110001" />;
}

export function Persetujuan() {
  return <PersetujuanKrs />;
}

export function Nilai() {
  const [idj, setIdj] = React.useState<number | null>(null);
  return idj ? (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <Button variant="ghost" size="sm" onClick={() => setIdj(null)} style={{ justifySelf: 'start' }}>
        ← Daftar kelas
      </Button>
      <InputNilaiKelas idj={idj} />
    </div>
  ) : (
    <DaftarKelasNilai onPilih={setIdj} />
  );
}

export function Edom() {
  return <IsiEdom />;
}

export function Wisuda() {
  return <PendaftaranWisuda />;
}
