import * as React from 'react';
import { Card, CardContent, Field } from 'unipo-ui';
import { PilihUnit, type UnitOrganisasi } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Pilih unit organisasi',
  category: 'Terhubung SDK',
  layout: 'narrow',
  order: 5,
  badge: 'baru',
  description:
    'Satu pemilih untuk semua isian unit organisasi (induk_unit): unit penerbit SK, unit pejabat, lingkup peran, unit kerja, unit pengusul, dan seterusnya. Pohon bertingkat dengan garis penghubung, ikon dan lencana jenis berwarna (sama dengan Pustikom » Organisasi & pejabat), kode/singkatan, lipat/buka, dan cari dengan jalur induk. Data dimuat sekali dari /v1/induk/unit-pohon dan dibagi semua pemakai di halaman.',
  importLine: "import { PilihUnit, NamaUnit, useUnitOrganisasi, IkonJenisUnit, LencanaJenisUnit, jalurUnit } from 'unipo-ui/siakad';",
  demos: {
    Tunggal: 'Unit penerbit SK dengan keterangan dan unit yang tidak boleh dipilih',
    Jenis: 'Hanya fakultas/prodi di bawah satu fakultas',
    Banyak: 'Banyak unit (chip berpohon)',
    NilaiLama: 'Nilai lama yang kini nonaktif',
  },
  props: [
    ['value / onValueChange', 'number | null, (id, unit) => void', 'ID induk_unit. Dengan multiple: number[] dan unit[].'],
    ['multiple / maks', 'boolean / number', 'Banyak unit, tampil sebagai chip dengan jalur induk.'],
    ['jenis', "string[]", "Hanya jenis ini yang bisa dipilih, mis. ['fakultas', 'prodi']; induknya tampil sebagai jalur."],
    ['akar', 'ID/kode | ID[]', 'Hanya unit ini dan turunannya (kode fakultas/prodi juga diterima).'],
    ['boleh / alasan / nonaktifkan', '(u) => boolean / string / ID[] | {id: alasan}', 'Unit yang tidak boleh dipilih tampil redup dengan alasan (title dan kaki popup).'],
    ['sembunyikanTerlarang', 'boolean', 'Sembunyikan unit yang tidak boleh (induknya tetap tampil).'],
    ['kecuali', 'ID', 'Unit ini dan turunannya tidak bisa dipilih (memilih induk unit).'],
    ['keterangan', '(u) => ReactNode', 'Lencana kecil per unit, mis. "Pencatat SK".'],
    ['kampus / semua / buka', 'string / boolean / number', 'Saring kampus; tawarkan unit nonaktif; tingkat terbuka awal (bawaan sampai fakultas).'],
    ['data', 'UnitOrganisasi[]', 'Sumber sendiri (mis. /v1/sk/penerbit). Tanpa ini memakai useUnitOrganisasi().'],
  ],
  notes: [
    'Papan ketik: ↑ ↓ pindah, → buka cabang / ke anak, ← tutup cabang / ke induk, Enter pilih, Esc hapus kata cari lalu tutup. Mengetik di tombol langsung membuka pencarian.',
    'Unit nonaktif tidak ditawarkan; nilai lama yang nonaktif tetap tampil dengan peringatan. PilihEntitas jenis="unit" kini memakai PilihUnit.',
    'Klien API aplikasi butuh scope induk:read.',
  ],
};

const u = (id: number, induk_id: number | null, kode: string, jenis: string, nama: string, singkatan: string, aktif = true): UnitOrganisasi => ({ id, induk_id, kode, jenis, nama, singkatan, aktif });

export const UNIT_CONTOH: UnitOrganisasi[] = [
  u(1, null, 'UNIPO', 'universitas', 'Universitas Pohuwato', 'UNIPO'),
  u(43, 1, 'REKTORAT', 'rektorat', 'Rektorat', 'Rektorat'),
  u(44, 43, 'WR1', 'rektorat', 'Wakil Rektor I Bidang Akademik', 'WR I'),
  u(51, 44, 'BAAK', 'biro', 'Biro Administrasi Akademik', 'BAAK'),
  u(52, 44, 'PMB', 'unit', 'Panitia Penerimaan Mahasiswa Baru', 'PMB'),
  u(53, 44, 'PERPUSTAKAAN', 'upt', 'UPT Perpustakaan', 'Perpustakaan', false),
  u(45, 43, 'WR2', 'rektorat', 'Wakil Rektor II Bidang Keuangan dan Umum', 'WR II'),
  u(56, 45, 'BAUK', 'biro', 'Biro Administrasi Umum dan Keuangan', 'BAUK'),
  u(57, 45, 'SDM', 'biro', 'Biro Sumber Daya Manusia', 'SDM'),
  u(46, 43, 'WR3', 'rektorat', 'Wakil Rektor III Bidang Kemahasiswaan dan Kerja Sama', 'WR III'),
  u(62, 46, 'HUMAS', 'bagian', 'Bagian Humas dan Kerja Sama', 'Humas'),
  u(63, 46, 'KARIER', 'upt', 'Pusat Karier dan Tracer Study', 'Pusat Karier'),
  u(21, 43, 'PUSTIKOM', 'upt', 'Pusat Teknologi Informasi dan Komunikasi', 'Pustikom'),
  u(48, 43, 'LP2M', 'lembaga', 'Lembaga Penelitian dan Pengabdian kepada Masyarakat', 'LP2M'),
  u(49, 43, 'LPM', 'lembaga', 'Lembaga Penjaminan Mutu', 'LPM'),
  u(5, 1, 'FAK-04', 'fakultas', 'FAKULTAS HUKUM', 'FH'),
  u(16, 5, '74201', 'prodi', 'Program Studi ILMU HUKUM', 'IH'),
  u(2, 1, 'FAK-01', 'fakultas', 'FAKULTAS ILMU KOMPUTER', 'FIK'),
  u(13, 2, '55201', 'prodi', 'Program Studi INFORMATIKA', 'I'),
  u(14, 2, '57201', 'prodi', 'Program Studi SISTEM INFORMASI', 'SI'),
  u(3, 1, 'FAK-02', 'fakultas', 'FAKULTAS TEKNIK DAN PERENCANAAN', 'FTP'),
  u(8, 3, '22201', 'prodi', 'Program Studi TEKNIK SIPIL', 'TS'),
  u(9, 3, '23201', 'prodi', 'Program Studi ARSITEKTUR', 'A'),
  u(10, 3, '35201', 'prodi', 'Program Studi PERENCANAAN WILAYAH', 'PW'),
  u(7, 1, 'FAK-06', 'fakultas', 'FAKULTAS KEGURUAN DAN ILMU PENDIDIKAN', 'FKIP'),
  u(17, 7, '84202', 'prodi', 'Program Studi PENDIDIKAN MATEMATIKA', 'PM'),
  u(19, 7, '86206', 'prodi', 'Program Studi PENDIDIKAN GURU SEKOLAH DASAR', 'PGSD'),
];

export function Tunggal() {
  const [v, setV] = React.useState<number | null>(51);
  const pencatat = new Set([1, 43, 51]);
  return (
    <Card>
      <CardContent>
        <Field label="Unit penerbit" description="Unit yang bukan wewenang Anda tampil redup beserta alasannya.">
          <PilihUnit
            data={UNIT_CONTOH}
            value={v}
            onValueChange={(id) => setV(id)}
            keterangan={(x) => (pencatat.has(Number(x.id)) ? 'Anda pencatat SK' : null)}
            nonaktifkan={{ 21: 'Pustikom tidak menerbitkan SK.' }}
          />
        </Field>
      </CardContent>
    </Card>
  );
}

export function Jenis() {
  const [v, setV] = React.useState<number | null>(null);
  return (
    <Card>
      <CardContent>
        <Field label="Program studi pengusul">
          <PilihUnit data={UNIT_CONTOH} jenis={['prodi']} akar="FAK-01" value={v} onValueChange={(id) => setV(id)} placeholder="Pilih prodi di FIK" />
        </Field>
      </CardContent>
    </Card>
  );
}

export function Banyak() {
  const [v, setV] = React.useState<number[]>([13, 51]);
  return (
    <Card>
      <CardContent>
        <Field label="Unit penerima">
          <PilihUnit multiple data={UNIT_CONTOH} value={v} onValueChange={(ids) => setV(ids)} placeholder="Semua unit" />
        </Field>
      </CardContent>
    </Card>
  );
}

export function NilaiLama() {
  const [v, setV] = React.useState<number | null>(53);
  return (
    <Card>
      <CardContent>
        <Field label="Unit kerja (data lama)">
          <PilihUnit data={UNIT_CONTOH} value={v} onValueChange={(id) => setV(id)} />
        </Field>
      </CardContent>
    </Card>
  );
}
