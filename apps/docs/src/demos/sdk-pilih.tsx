import * as React from 'react';
import { Button, DialogClose, Field, Input, Select, Sheet, Textarea } from 'unipo-ui';
import { GalatApi, PilihEntitas, jenisEntitasDariKolom, useSiakadQuery } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';
import { DOSEN, MAHASISWA } from '../mock/siakad';

export const meta: DemoMeta = {
  title: 'Pilih data (PilihEntitas)',
  category: 'Terhubung SDK',
  layout: 'narrow',
  order: 3,
  badge: 'baru',
  description:
    'Pengganti isian ID, NIM, NIDN, NIK, atau username yang diketik manual. Pengguna mencari dengan nama, sedangkan nilai yang dikirim ke API tetap kuncinya. Nilai awal (formulir ubah) tampil sebagai nama. Satu komponen untuk mahasiswa, dosen, pegawai, pengguna, orang/NIK, ormawa, mata kuliah, prodi, fakultas, unit, dan jabatan; tabel lain cukup diberi sumber sendiri.',
  importLine: "import { PilihEntitas, jenisEntitasDariKolom, GalatApi } from 'unipo-ui/siakad';",
  demos: {
    Formulir: 'Formulir di panel samping (contoh konseling)',
    NilaiAwal: 'Nilai awal tampil sebagai nama',
    Sumber: 'Tabel lain dengan sumber sendiri',
    Otomatis: 'Formulir otomatis dari skema',
    Galat: 'Kotak galat dengan kode laporan',
  },
  props: [
    ['jenis', 'JenisEntitas | SumberEntitas', 'mahasiswa, dosen, pegawai, pengguna, orang, nik, ormawa, mata-kuliah, prodi, fakultas, unit, jabatan; atau { nama, path, kunci, satu?, judul, meta? }.'],
    ['value / defaultValue', 'string | number | null', 'Isi kolom kunci (NIM, NIDN, username, ID).'],
    ['onValueChange', '(nilai, baris) => void', 'Nilai kunci dan baris lengkap dari API; null saat dikosongkan.'],
    ['name', 'string', 'Nama isian untuk formulir HTML; yang terkirim adalah nilai kunci.'],
    ['query', 'object', 'Saringan tambahan ke endpoint daftar, mis. { prodi: "55201" }.'],
    ['load', '(q, signal) => Promise<Baris[]>', 'Ganti sumber data (BFF sendiri, data uji).'],
  ],
  notes: [
    'jenisEntitasDariKolom(nama, keterangan) menebak jenis dari nama kolom dan keterangan skema: "m_mahasiswa.NIM" → mahasiswa, "user.username" → pengguna, "ID di kmhs_ormawa" → ormawa, unit_id → unit. Kolom isian biasa (mis. NIK di formulir data pribadi) tetap diketik.',
    'GalatApi menampilkan pesan ramah, kode laporan (request_id dari SDK) yang bisa disalin, dan tombol coba lagi. KodeLaporan bisa dipasang di kotak galat buatan sendiri; pesanGalat() juga menyertakan kode laporan untuk toast.',
  ],
};

export function Formulir() {
  const [nim, setNim] = React.useState<string | null>(null);
  const [konselor, setKonselor] = React.useState<string | null>(null);
  return (
    <Sheet
      trigger={<Button>Ajukan konseling</Button>}
      title="Ajukan konseling"
      description="Pengelola menugaskan konselor; mahasiswa hanya melihat miliknya sendiri."
      footer={
        <>
          <DialogClose render={<Button variant="ghost" />}>Batal</DialogClose>
          <Button disabled={!nim}>Simpan</Button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: '1rem' }}>
        <Field label="Mahasiswa" required description={nim ? `NIM terkirim: ${nim}` : 'Cari dengan nama atau NIM.'}>
          <PilihEntitas jenis="mahasiswa" value={nim} onValueChange={setNim} />
        </Field>
        <Field label="Konselor" description={konselor ? `username: ${konselor}` : 'Hanya pengelola.'}>
          <PilihEntitas jenis="pengguna" value={konselor} onValueChange={setKonselor} />
        </Field>
        <Field label="Jenis">
          <Select options={['akademik', 'pribadi', 'karier', 'lainnya'].map((v) => ({ value: v, label: v[0]!.toUpperCase() + v.slice(1) }))} defaultValue="lainnya" />
        </Field>
        <Field label="Topik" required>
          <Input />
        </Field>
      </div>
      <Field label="Uraian" style={{ marginTop: '1rem' }}>
        <Textarea rows={4} />
      </Field>
    </Sheet>
  );
}

export function NilaiAwal() {
  // Data dari API hanya berisi kunci; komponen memuat nama untuk ditampilkan.
  const baris = { ormawa_id: 3, pengaju_nim: MAHASISWA[3]!.nim, pembina_nidn: DOSEN[2]!.nidn };
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Field label="Ormawa" required>
        <PilihEntitas jenis="ormawa" name="ormawa_id" defaultValue={baris.ormawa_id} />
      </Field>
      <Field label="Pengaju">
        <PilihEntitas jenis="mahasiswa" name="pengaju_nim" defaultValue={baris.pengaju_nim} />
      </Field>
      <Field label="Pembina">
        <PilihEntitas jenis="dosen" name="pembina_nidn" defaultValue={baris.pembina_nidn} />
      </Field>
    </div>
  );
}

export function Sumber() {
  const [id, setId] = React.useState<string | null>('5');
  return (
    <Field label="Unit kegiatan" description={`id terpilih: ${id ?? '-'}`}>
      <PilihEntitas
        jenis={{
          nama: 'unit kegiatan',
          path: '/v1/kemahasiswaan/ormawa',
          kunci: 'id',
          satu: '/v1/kemahasiswaan/ormawa/{id}',
          query: { jenis: 'ukm' },
          judul: (r) => String(r.nama),
          meta: (r) => String(r.bidang ?? ''),
        }}
        value={id}
        onValueChange={setId}
      />
    </Field>
  );
}

const KOLOM = [
  { nama: 'ormawa_id', label: 'Ormawa', keterangan: 'ID di kmhs_ormawa' },
  { nama: 'pengaju_nim', label: 'Pengaju', keterangan: 'm_mahasiswa.NIM' },
  { nama: 'konselor', label: 'Konselor', keterangan: 'user.username (hanya pengelola)' },
  { nama: 'lokasi', label: 'Lokasi', keterangan: '' },
];
export function Otomatis() {
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {KOLOM.map((k) => {
        const jenis = jenisEntitasDariKolom(k.nama, k.keterangan);
        return (
          <Field key={k.nama} label={k.label} description={jenis ? `Dikenali sebagai ${jenis}` : 'Isian biasa'}>
            {jenis ? <PilihEntitas jenis={jenis} name={k.nama} /> : <Input name={k.nama} />}
          </Field>
        );
      })}
    </div>
  );
}

export function Galat() {
  const q = useSiakadQuery(['contoh-galat'], (s, signal) => s.request({ method: 'GET', path: '/v1/contoh/galat' }, { signal }));
  if (!q.error) return <p className="u-field-description">Memuat…</p>;
  return <GalatApi error={q.error} onRetry={q.refetch} />;
}
