import * as React from 'react';
import { CalendarDays, Pencil, Plus, UserRound } from 'lucide-react';
import { BagianForm, Button, Field, Input, IsianTanggal, PanelForm, Pilihan, Textarea, useToast } from 'unipo-ui';
import { FormKurikulum, FormMataKuliahKurikulum } from 'unipo-ui/katalog';
import { DataPribadiSaya, FormProfilSaya, PilihProdi, RiwayatProfilSaya, useDaftarKurikulum, useMkKurikulum } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Formulir tambah/ubah per fitur',
  category: 'Per kegunaan',
  layout: 'wide',
  order: 2,
  badge: 'baru',
  description:
    'Formulir tambah dan ubah untuk tiap fitur memakai bahan yang sama: bagian berjudul dengan grid yang menyesuaikan lebar panel, Pilihan yang memilih bentuknya sendiri (tombol untuk 2–4 opsi, daftar untuk 5–8, isian cari untuk lebih dari 8), angka dengan tombol +/−, tanggal, dan rujukan data lain lewat pilih-cari (prodi, dosen, semester, kecamatan). Panel menandai perubahan yang belum disimpan, meminta konfirmasi sebelum membuangnya, menyimpan dengan Ctrl/⌘+Enter, dan memetakan galat 422 ke isian. Formulir kurikulum dan mata kuliah dibangun dari skema katalog, jadi aturan wajib dan validasinya sama dengan backend.',
  importLine:
    "import { PanelForm, BagianForm, GridForm, Pilihan, IsianTanggal, HitungKarakter } from 'unipo-ui';\nimport { FormKurikulum, FormMataKuliahKurikulum, FormulirSumber } from 'unipo-ui/katalog';\nimport { FormProfilSaya, DataPribadiSaya, RiwayatProfilSaya, PilihKecamatan } from 'unipo-ui/siakad';",
  demos: {
    Kurikulum: 'FormKurikulum: identitas, masa berlaku, beban studi dengan ringkasan SKS, rumusan',
    MataKuliah: 'FormMataKuliahKurikulum: jenis, bobot SKS +/−, bentuk pembelajaran, koordinator dari daftar dosen',
    Profil: 'FormProfilSaya: nama panggilan, bio, keahlian, tautan akademik',
    DataPribadi: 'DataPribadiSaya: ubah alamat dengan pencarian kecamatan dan pilihan jenis tinggal',
    Riwayat: 'RiwayatProfilSaya: tanggal, pilihan, dan "masih bekerja" yang mematikan tanggal selesai',
    Bahan: 'Rakit sendiri: PanelForm + BagianForm + Pilihan + IsianTanggal',
  },
  props: [
    ['Pilihan.tampilan', "'otomatis' | 'tombol' | 'daftar' | 'cari'", 'Otomatis: ≤ 4 opsi pendek jadi tombol, > 8 opsi jadi isian cari, sisanya daftar.'],
    ['PanelForm.onSimpan', '() => void | false | string | Promise<…>', 'Kembalikan teks untuk menahan panel dengan pesan; lempar galat untuk kotak galat + kode laporan.'],
    ['PanelForm.berubah', 'boolean', 'Tampilkan "Perubahan belum disimpan" dan minta konfirmasi sebelum ditutup.'],
    ['BagianForm.kolom', '1 | 2 | 3', 'Kolom di panel lebar; mengikuti lebar wadah, bukan layar. Isian selebar bagian: className="u-form-lebar".'],
    ['FormulirSkema.bagian', 'BagianSkema[]', 'Kelompokkan isian skema per bagian; sisanya masuk "Lainnya".'],
    ['FormulirSumber', '{ bagian, render, opsi, label, keterangan, setelah, olahBody, judul, size }', 'Panel tambah/ubah sumber katalog dengan tata letak per fitur.'],
  ],
  notes: [
    'Enum dari skema otomatis jadi Pilihan, dan labelnya diambil dari keterangan backend bila ditulis "A wajib, B pilihan, …".',
    'Isian daftar yang keterangannya berisi kode ("kuliah, responsi, …") menjadi tag pilihan ganda.',
    'Di ponsel panel menjadi lembar bawah setinggi 94% layar dengan tombol Batal dan Simpan berdampingan.',
    'Scope token: kurikulum:write (kurikulum dan MK), profil:write (profil saya, data pribadi, riwayat).',
  ],
};

export function Kurikulum() {
  const q = useDaftarKurikulum();
  const k = q.data?.[0];
  return (
    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
      <FormKurikulum
        trigger={
          <Button>
            <Plus /> Tambah kurikulum
          </Button>
        }
      />
      {k && (
        <FormKurikulum
          baris={k as unknown as Record<string, unknown>}
          trigger={
            <Button variant="outline">
              <Pencil /> Ubah {k.nama}
            </Button>
          }
        />
      )}
    </div>
  );
}

export function MataKuliah() {
  const q = useDaftarKurikulum();
  const id = q.data?.[0]?.id;
  const mk = useMkKurikulum(id);
  const contoh = mk.data?.[0];
  return (
    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
      {id && (
        <FormMataKuliahKurikulum
          kurikulumId={id}
          prodi="55201"
          trigger={
            <Button>
              <Plus /> Tambah mata kuliah
            </Button>
          }
        />
      )}
      {contoh && (
        <FormMataKuliahKurikulum
          baris={contoh as unknown as Record<string, unknown>}
          prodi="55201"
          trigger={
            <Button variant="outline">
              <Pencil /> Ubah {contoh.nama}
            </Button>
          }
        />
      )}
    </div>
  );
}

export function Profil() {
  return (
    <FormProfilSaya
      trigger={
        <Button>
          <UserRound /> Ubah profil
        </Button>
      }
    />
  );
}

export function DataPribadi() {
  return <DataPribadiSaya />;
}

export function Riwayat() {
  return <RiwayatProfilSaya jenis="pekerjaan" />;
}

const KOTA: Array<[string, string, string]> = [
  ['7504', 'Kab. Pohuwato', 'Gorontalo'],
  ['7501', 'Kab. Gorontalo', 'Gorontalo'],
  ['7502', 'Kab. Boalemo', 'Gorontalo'],
  ['7503', 'Kab. Bone Bolango', 'Gorontalo'],
  ['7505', 'Kab. Gorontalo Utara', 'Gorontalo'],
  ['7571', 'Kota Gorontalo', 'Gorontalo'],
  ['7101', 'Kab. Bolaang Mongondow', 'Sulawesi Utara'],
  ['7171', 'Kota Manado', 'Sulawesi Utara'],
  ['7201', 'Kab. Banggai', 'Sulawesi Tengah'],
  ['7206', 'Kab. Parigi Moutong', 'Sulawesi Tengah'],
  ['7271', 'Kota Palu', 'Sulawesi Tengah'],
  ['7371', 'Kota Makassar', 'Sulawesi Selatan'],
];

export function Bahan() {
  const toast = useToast();
  const kosong = { judul: '', jenis: '', tingkat: '', lokasi: '', prodi: '', tanggal: '', ringkasan: '' };
  const [isi, setIsi] = React.useState(kosong);
  const set = (k: keyof typeof kosong) => (v: string | null) => setIsi((x) => ({ ...x, [k]: v ?? '' }));
  return (
    <PanelForm
      title="Ajukan kegiatan"
      description="Contoh formulir buatan sendiri dengan bahan yang sama."
      berubah={JSON.stringify(isi) !== JSON.stringify(kosong)}
      trigger={
        <Button variant="outline">
          <CalendarDays /> Buka formulir kegiatan
        </Button>
      }
      onSimpan={() => {
        if (!isi.judul.trim()) return 'Judul kegiatan wajib diisi.';
        toast.add({ title: 'Kegiatan diajukan (contoh)', type: 'success' });
        setIsi(kosong);
      }}
      labelSimpan="Ajukan"
    >
      <BagianForm judul="Kegiatan" keterangan="Judul, jenis, dan tingkat kegiatan.">
        <Field label="Judul kegiatan" required className="u-form-lebar">
          <Input value={isi.judul} onChange={(e) => set('judul')(e.target.value)} placeholder="Mis. Seminar nasional teknologi pertanian" />
        </Field>
        <Field label="Jenis" description="3 opsi: tombol">
          <Pilihan
            value={isi.jenis || null}
            onValueChange={set('jenis')}
            options={[
              { value: 'seminar', label: 'Seminar' },
              { value: 'pelatihan', label: 'Pelatihan' },
              { value: 'lomba', label: 'Lomba' },
            ]}
          />
        </Field>
        <Field label="Tingkat" description="5 opsi: daftar">
          <Pilihan
            value={isi.tingkat || null}
            onValueChange={set('tingkat')}
            options={['Internal', 'Kabupaten', 'Provinsi', 'Nasional', 'Internasional'].map((x) => ({ value: x.toLowerCase(), label: x }))}
          />
        </Field>
        <Field label="Kabupaten/kota lokasi" description="Lebih dari 8 opsi: isian cari">
          <Pilihan value={isi.lokasi || null} onValueChange={set('lokasi')} options={KOTA.map(([value, label, prov]) => ({ value, label, description: prov }))} />
        </Field>
        <Field label="Program studi penyelenggara" description="PilihProdi: daftar per fakultas, jadi cari bila lebih dari 8 prodi">
          <PilihProdi value={isi.prodi || null} onValueChange={set('prodi')} placeholder="Pilih program studi" />
        </Field>
        <Field label="Tanggal pelaksanaan">
          <IsianTanggal value={isi.tanggal || null} onValueChange={set('tanggal')} />
        </Field>
      </BagianForm>
      <BagianForm judul="Ringkasan" kolom={1}>
        <Field label="Ringkasan kegiatan" optional>
          <Textarea rows={4} value={isi.ringkasan} onChange={(e) => set('ringkasan')(e.target.value)} />
        </Field>
      </BagianForm>
    </PanelForm>
  );
}
