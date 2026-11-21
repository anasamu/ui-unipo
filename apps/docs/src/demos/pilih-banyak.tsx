import * as React from 'react';
import { Field, MultiPilih } from 'unipo-ui';
import { PilihEntitasBanyak, PilihSurat } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'MultiPilih & pemilih rujukan',
  category: 'Pilihan',
  layout: 'narrow',
  description:
    'Pilih banyak dengan pencarian dan chip: pengganti daftar checkbox panjang dan Textarea "satu NIM per baris". PilihEntitasBanyak memuat dari API SIAKAD (mahasiswa, pengguna, dosen, unit, ...) dan menyimpan kunci, bukan nama. PilihPengguna dan PilihSurat adalah pintasan untuk akun dan registri surat.',
  importLine: "import { MultiPilih } from 'unipo-ui';\nimport { PilihEntitasBanyak, PilihPengguna, PilihSurat } from 'unipo-ui/siakad';",
  demos: { Statis: 'MultiPilih daftar statis', Reviewer: 'Reviewer (PilihEntitasBanyak + tidak boleh)', Surat: 'Surat dasar (PilihSurat)', Keadaan: 'Hanya-baca, nonaktif, galat' },
  props: [
    ['items | loadItems', 'T[] | (q, signal) => Promise<T[]>', 'Daftar statis atau pencarian server (debounce otomatis).'],
    ['value / onValueChange', 'T[]', 'Butir terpilih (MultiPilih) atau kunci (PilihEntitasBanyak).'],
    ['maks', 'number', 'Batas jumlah pilihan; sisa butir nonaktif dan hitungan tampil.'],
    ['itemDisabled / tidakBoleh', '(item) => string | boolean', 'Butir tidak bisa dipilih beserta alasannya (mis. "Anggota tim").'],
    ['readOnly / disabled / memuat / galat', '', 'Keadaan lengkap.'],
  ],
  notes: ['Keyboard: ketik untuk mencari, Enter memilih, Backspace pada isian kosong menghapus chip terakhir, panah kiri/kanan berpindah chip.'],
};

const PRODI = ['Teknik Informatika', 'Sistem Informasi', 'Manajemen', 'Akuntansi', 'Ilmu Hukum', 'Agribisnis', 'Pendidikan Bahasa Inggris', 'Kesehatan Masyarakat'].map((n, i) => ({ kode: `P${i}`, nama: n }));

export function Statis() {
  const [v, setV] = React.useState([PRODI[0]!, PRODI[2]!]);
  return (
    <Field label="Prodi peserta" description="Pilih paling banyak 4 prodi.">
      <MultiPilih items={PRODI} value={v} onValueChange={setV} itemKey={(p) => p.kode} itemToString={(p) => p.nama} maks={4} placeholder="Cari prodi" />
    </Field>
  );
}

const DOSEN = [
  { nidn: '0901036601', nama: 'Dr. Rahmat Hidayat, M.Kom.', unit_nama: 'Teknik Informatika', bidang: 'Rekayasa perangkat lunak' },
  { nidn: '0912078802', nama: 'Siti Aminah, S.E., M.M.', unit_nama: 'Manajemen', bidang: 'Keuangan' },
  { nidn: '0905029003', nama: 'Andi Pratama, S.H., M.H.', unit_nama: 'Ilmu Hukum', bidang: 'Hukum agraria' },
  { nidn: '0921118504', nama: 'Nur Aisyah, M.P.', unit_nama: 'Agribisnis', bidang: 'Pertanian' },
];
const muatDosen = async (q: string) => {
  await new Promise((r) => setTimeout(r, 300));
  return DOSEN.filter((d) => `${d.nama} ${d.nidn} ${d.bidang}`.toLowerCase().includes(q.toLowerCase()));
};

export function Reviewer() {
  const [v, setV] = React.useState<string[]>(['0912078802']);
  return (
    <Field label="Reviewer proposal" description="Ketua dan anggota tim tidak bisa dipilih (konflik kepentingan).">
      <PilihEntitasBanyak
        jenis="dosen"
        load={muatDosen}
        value={v}
        onValueChange={(k) => setV(k)}
        maks={2}
        tidakBoleh={(r) => (r.nidn === '0901036601' ? 'Ketua tim pengusul' : null)}
      />
    </Field>
  );
}

const SURAT = [
  { id: 1, nomor_surat: '012/UNIPO/LP2M/XI/2026', perihal: 'Undangan seleksi hibah internal', tanggal_surat: '2026-11-03', arah: 'keluar', unit_nama: 'LP2M' },
  { id: 2, nomor_surat: '045/DIKTI/2026', perihal: 'Pemberitahuan pendanaan BIMA', tanggal_surat: '2026-10-21', arah: 'masuk', pengirim_instansi: 'Kemdiktisaintek' },
];

export function Surat() {
  const [v, setV] = React.useState<string | null>('1');
  return (
    <Field label="Surat dasar" description={`Rujukan surat dari arsip unit; yang tersimpan ID surat (${v ?? 'kosong'}), yang tampil nomor dan perihal.`}>
      <PilihSurat value={v} onValueChange={setV} load={async (q) => SURAT.filter((s) => String(s.id) === q || `${s.nomor_surat} ${s.perihal}`.toLowerCase().includes(q.toLowerCase()))} />
    </Field>
  );
}

export function Keadaan() {
  return (
    <div className="demo-stack">
      <Field label="Hanya-baca">
        <MultiPilih items={PRODI} value={[PRODI[1]!, PRODI[4]!]} readOnly itemKey={(p) => p.kode} itemToString={(p) => p.nama} />
      </Field>
      <Field label="Nonaktif">
        <MultiPilih items={PRODI} value={[PRODI[3]!]} disabled itemKey={(p) => p.kode} itemToString={(p) => p.nama} />
      </Field>
      <Field label="Galat server">
        <MultiPilih items={PRODI} value={[]} galat="Pilih minimal satu prodi." itemKey={(p) => p.kode} itemToString={(p) => p.nama} />
      </Field>
    </div>
  );
}
