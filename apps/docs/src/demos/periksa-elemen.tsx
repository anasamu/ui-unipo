import { CodeBlock } from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Pemeriksa elemen bawaan',
  category: 'Mulai',
  order: 9,
  prose: true,
  description:
    'Perintah `npx unipo-ui periksa-elemen` menolak <input>, <select>, <textarea>, <table>, Table primitif, <button> polos, dan window.confirm/prompt/alert di halaman aplikasi (folder pages/ atau halaman/), lalu menyebut komponen unipo-ui penggantinya.',
  demos: { Pakai: 'Pasang di aplikasi', Pengecualian: 'Pengecualian tertulis', Aturan: 'Daftar aturan' },
};

export function Pakai() {
  return (
    <CodeBlock
      language="bash"
      lineNumbers={false}
      code={`# 1. Catat pelanggaran yang ada sekarang (sekali), lalu kurangi per menu
npx unipo-ui periksa-elemen --tulis-dasar .unipo-ui-dasar.json

# 2. Di package.json: gagal hanya bila pelanggaran BERTAMBAH
"periksa:elemen": "unipo-ui periksa-elemen --dasar .unipo-ui-dasar.json"

# Lainnya
npx unipo-ui periksa-elemen            # halaman saja (pages/, halaman/), gagal bila ada pelanggaran
npx unipo-ui periksa-elemen --semua    # seluruh src, termasuk komponen lokal
npx unipo-ui periksa-elemen --src frontend/src --json`}
    />
  );
}

export function Pengecualian() {
  return (
    <CodeBlock
      tabs={[
        { label: 'Komentar', language: 'tsx', code: `{/* unipo-ui-izinkan tabel-bawaan: tata letak cetak kwitansi A5 */}\n<table className="kw-cetak">…</table>` },
        {
          label: 'unipo-ui-periksa.json',
          language: 'json',
          code: `{\n  "abaikan": ["src/halaman/cetak/"],\n  "pengecualian": [\n    { "berkas": "src/halaman/Laporan.tsx", "aturan": "tabel-bawaan", "alasan": "lampiran borang LKPS sesuai format resmi" }\n  ]\n}`,
        },
      ]}
      lineNumbers={false}
    />
  );
}

export function Aturan() {
  return (
    <CodeBlock
      language="text"
      lineNumbers={false}
      code={`input-tanggal    <Input type="date|month">          → DatePicker / IsianTanggal
input-waktu      <Input type="datetime-local|time"> → IsianTanggalWaktu / IsianJam
input-angka      <Input type="number">              → IsianAngka / IsianRupiah / NumberField
input-berkas     <input type="file">                → UnggahBerkas / Dropzone
pilihan-bawaan   <input type="checkbox|radio">      → Checkbox / RadioGroup / Switch / MultiPilih
input-bawaan     <input> lain (kecuali hidden)      → Input / InputGroup
select-bawaan    <select>                           → Select / Combobox / PilihEntitas / MultiPilih
textarea-bawaan  <textarea>                         → Textarea
tabel-bawaan     <table>                            → DataTable
tabel-primitif   <Table>                            → DataTable
tombol-bawaan    <button>                           → Button / BilahAksi / MenuAksiBaris
dialog-peramban  confirm() / prompt() / alert()     → useKonfirmasi / KonfirmasiAksi / toast`}
    />
  );
}
