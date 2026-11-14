import * as React from 'react';
import { Field } from 'unipo-ui';
import { Bendera, CariDosen, CariMahasiswa, CariMataKuliah, CariNegara, CariPegawai, CariPerguruanTinggi, CariSekolah, CariWilayah, PilihProdi, PilihTahunAkademik, type MahasiswaOption, type Negara } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Pencarian data (Cari*)',
  category: 'Terhubung SDK',
  layout: 'narrow',
  order: 2,
  description: 'Isian pencarian yang langsung memanggil API SIAKAD lewat SDK: mahasiswa, dosen, pegawai, mata kuliah, sekolah, perguruan tinggi, negara (dengan bendera), dan wilayah. Cukup bungkus aplikasi dengan <UnipoProvider siakad={…}>.',
  importLine: "import { CariMahasiswa, CariDosen, CariNegara, PilihProdi } from 'unipo-ui/siakad';",
  demos: {
    Mahasiswa: 'Cari mahasiswa (mahasiswa.list)',
    Dosen: 'Cari dosen dan pegawai',
    MataKuliah: 'Cari mata kuliah per prodi',
    Sekolah: 'Sekolah asal dan perguruan tinggi',
    Negara: 'Cari negara dengan bendera',
    Wilayah: 'Provinsi lalu kabupaten/kota',
    Referensi: 'Pilih prodi dan tahun akademik',
  },
  props: [
    ['value / onValueChange', 'T | null', 'Butir terpilih (objek data lengkap dari API).'],
    ['filter', 'object', 'Saringan tambahan yang diteruskan ke SDK, mis. { prodi: "55201", status: "A" }.'],
    ['limit', 'number', 'Jumlah hasil per pencarian (per_page). Bawaan 10.'],
    ['load', '(q, signal) => Promise<T[]>', 'Ganti sumber data (mis. BFF sendiri) tanpa mengubah tampilan.'],
  ],
  notes: [
    'Semua komponen memakai debounce 250 ms dan membatalkan permintaan lama otomatis, jadi aman untuk API yang dibatasi laju.',
    'API SIAKAD belum punya daftar perguruan tinggi nasional; CariPerguruanTinggi memakai data mitra kerja sama (kerjasama.getMitra) sampai endpoint PDDikti tersedia, atau isi prop load sendiri.',
    'Daftar negara tidak memerlukan API: memakai kode ISO 3166 dengan nama bahasa Indonesia dari Intl.DisplayNames. Bendera bawaan dari CDN country-flag-icons; untuk server tanpa internet luar, salin SVG-nya ke folder publik lalu panggil configureFlags((kode) => `/bendera/${kode}.svg`).',
  ],
};

export function Mahasiswa() {
  const [m, setM] = React.useState<MahasiswaOption | null>(null);
  return (
    <Field label="Mahasiswa" description={m ? `Terpilih: ${m.nim} · ${m.nama_prodi}` : 'Ketik NIM atau nama, mis. "Siti".'}>
      <CariMahasiswa value={m} onValueChange={setM} />
    </Field>
  );
}

export function Dosen() {
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Field label="Dosen pembimbing akademik">
        <CariDosen />
      </Field>
      <Field label="Tenaga kependidikan" description="Modul SDM: jenis tendik saja.">
        <CariPegawai jenis="tendik" />
      </Field>
    </div>
  );
}

export function MataKuliah() {
  return (
    <Field label="Mata kuliah Informatika">
      <CariMataKuliah filter={{ prodi: '55201' }} />
    </Field>
  );
}

export function Sekolah() {
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Field label="Sekolah asal" description="Minimal 3 huruf, mis. &quot;Marisa&quot;.">
        <CariSekolah />
      </Field>
      <Field label="Perguruan tinggi asal (pindahan)">
        <CariPerguruanTinggi />
      </Field>
    </div>
  );
}

export function Negara() {
  const [n, setN] = React.useState<Negara | null>({ kode: 'ID', nama: 'Indonesia' });
  return (
    <Field label="Kewarganegaraan" description={n ? <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Bendera kode={n.kode} size={16} /> {n.nama} ({n.kode})</span> : 'Belum dipilih'}>
      <CariNegara value={n} onValueChange={setN} />
    </Field>
  );
}

export function Wilayah() {
  const [prov, setProv] = React.useState<{ kode: string; nama: string } | null>({ kode: '75', nama: 'Gorontalo' });
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Field label="Provinsi">
        <CariWilayah value={prov} onValueChange={setProv} />
      </Field>
      <Field label="Kabupaten/kota">
        <CariWilayah key={prov?.kode} propinsi={prov?.kode} disabled={!prov} />
      </Field>
    </div>
  );
}

export function Referensi() {
  const [prodi, setProdi] = React.useState<string | null>(null);
  const [tahun, setTahun] = React.useState<string | null>('20251');
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Field label="Program studi">
        <PilihProdi value={prodi} onValueChange={setProdi} />
      </Field>
      <Field label="Tahun akademik">
        <PilihTahunAkademik value={tahun} onValueChange={setTahun} />
      </Field>
    </div>
  );
}
