import * as React from 'react';
import { Field, SegmentedControl, Select, Switch } from 'unipo-ui';
import { Kwitansi, KwitansiResmi, RincianPembayaran, VARIAN_KWITANSI, contohKwitansi, type PenerbitKwitansi, type VarianKwitansi } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Kwitansi resmi & rincian pembayaran',
  category: 'Per kegunaan',
  layout: 'wide',
  order: 8,
  badge: 'baru',
  description:
    'Kwitansi resmi UNIPO (Bukti Kas Masuk) untuk semua unit penerbit: Keuangan universitas, BAAK, PMB, dan fakultas dibedakan lewat lencana, kode awalan nomor bukti (KEU-, BAAK-, PMB-, FAK05-), dan warna aksen. Tujuh varian gaya (klasik, modern, minimal, setengah A4, dengan potongan arsip, struk thermal 80/58 mm) memuat isian yang sama dengan kwitansi lama: nomor & tanggal bayar, program studi, kelas, terima dari + NIM, sebesar (terbilang), keterangan, biaya, jumlah dibayar, sisa, status bayar, catatan, diberikan potongan, diterima oleh dengan tanda tangan & stempel, ditambah QR verifikasi, cap status, dan tanda SALINAN. Cetak memakai ukuran kertas sesuai varian; mode gelap hanya untuk layar. RincianPembayaran dipakai juga di luar kwitansi (halaman tagihan/riwayat bayar).',
  importLine: "import { Kwitansi, KwitansiResmi, RincianPembayaran, PengaturanKwitansi, DaftarKwitansiTerbit, cetakKwitansi, contohKwitansi } from 'unipo-ui/siakad';",
  demos: {
    Galeri: 'Pemilih varian × penerbit (data rekaan)',
    DenganAlat: 'KwitansiResmi: bilah alat varian, salinan, cetak',
    Rincian: 'RincianPembayaran: lengkap, ringkas, cetak',
  },
  props: [
    ['Kwitansi.data', 'KwitansiResmiData', 'Bentuk dari GET /v1/kasir|keuangan/transaksi/{id}/kwitansi, /v1/kwitansi/terbit/{id}, /v1/pmb/.../tagihan/{id}/kwitansi.'],
    ['Kwitansi.varian', "'klasik' | 'modern' | 'minimal' | 'a5' | 'arsip' | 'thermal80' | 'thermal58'", 'Bawaan: varian pilihan penerbit.'],
    ['Kwitansi.salinan', 'boolean', 'Tanda SALINAN untuk cetak ulang.'],
    ['KwitansiResmi.sumber', "{ jenis: 'keuangan' | 'kasir' | 'terbit' | 'pmb-admin', id } | { jenis: 'pmb-saya', pendaftaran, id }", 'Dimuat lewat SDK; cetak dicatat ke /v1/kwitansi/terbit/{id}/cetak.'],
    ['KwitansiResmi.aksi', 'ReactNode', 'Tombol tambahan, mis. Terbitkan PDF.'],
    ['RincianPembayaran.varian', "'ringkas' | 'lengkap' | 'cetak'", 'Ringkas di kwitansi, lengkap di halaman tagihan, cetak hitam-putih.'],
    ['PengaturanKwitansi.unitId', 'number', 'Batasi ke satu unit penerbit (aplikasi fakultas/PMB/BAAK).'],
  ],
  notes: [
    'Pengaturan per unit penerbit (varian bawaan, warna, awalan nomor, tanda tangan, stempel, catatan kaki) dan aturan catatan pembayaran dinamis diatur dengan PengaturanKwitansi (panel samping bertahap) lewat /v1/kwitansi. Izin RBAC: kwitansi.atur, kwitansi.lihat (berlingkup unit).',
    'Catatan pembayaran: prioritas jenis + unit > unit > jenis > bawaan, berlaku mulai/sampai, variabel {batas_tanggal}, {sisa}, {jenis_biaya}, …; teks dipotret saat kwitansi terbit.',
    'QR mengarah ke /api/v1/kwitansi/v/{kode}: halaman verifikasi publik yang hanya menampilkan nomor, tanggal, jumlah, status, dan penerbit.',
    'Data di halaman ini rekaan.',
  ],
};

const PENERBIT: Record<string, Partial<PenerbitKwitansi>> = {
  keuangan: { jenis: 'keuangan', kode: 'KEU', label: 'Keuangan Universitas', warna: '#0b6b3a', jabatan_penerima: 'Kasir BAUK' },
  baak: { jenis: 'baak', kode: 'BAAK', label: 'Biro Administrasi Akademik', warna: '#1d4ed8', jabatan_penerima: 'Petugas BAAK' },
  pmb: { jenis: 'pmb', kode: 'PMB', label: 'Penerimaan Mahasiswa Baru', warna: '#c2410c', jabatan_penerima: 'Bendahara PMB' },
  fakultas: { jenis: 'fakultas', kode: 'FAK04', label: 'Fakultas Hukum', warna: '#9f1239', jabatan_penerima: 'Bendahara Fakultas' },
};

export function Galeri() {
  const [varian, setVarian] = React.useState<VarianKwitansi>('klasik');
  const [penerbit, setPenerbit] = React.useState('keuangan');
  const [salinan, setSalinan] = React.useState(false);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'end' }}>
        <Field label="Varian">
          <Select<VarianKwitansi> value={varian} onValueChange={(v) => v && setVarian(v)} options={VARIAN_KWITANSI.map((v) => ({ value: v.value, label: v.label, description: v.kertas }))} />
        </Field>
        <Field label="Penerbit">
          <SegmentedControl value={penerbit} onValueChange={setPenerbit} options={Object.keys(PENERBIT).map((k) => ({ value: k, label: PENERBIT[k]!.kode! }))} />
        </Field>
        <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <Switch checked={salinan} onCheckedChange={(c: boolean) => setSalinan(c)} /> Salinan
        </label>
      </div>
      <Kwitansi data={contohKwitansi(PENERBIT[penerbit])} varian={varian} salinan={salinan} />
    </div>
  );
}

export function DenganAlat() {
  return <KwitansiResmi data={contohKwitansi(PENERBIT.fakultas, { status_bayar: 'LUNAS', sisa: 0, jumlah: 2_000_000, terbilang: 'dua juta rupiah' })} catatCetak={false} />;
}

export function Rincian() {
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <RincianPembayaran
        varian="lengkap"
        judul="Rincian pembayaran semester"
        rincian={[
          { uraian: 'Uang Kuliah Tunggal', periode: 'Ganjil 2026/2027', nominal: 2_500_000, potongan: 500_000, ket_potongan: 'Beasiswa prestasi', subtotal: 2_000_000, dibayar: 1_250_000 },
          { uraian: 'Praktikum', periode: 'Ganjil 2026/2027', nominal: 350_000, subtotal: 350_000, dibayar: 350_000 },
        ]}
        riwayat={[
          { tanggal: '2026-09-02', nomor: 'KEU-KW260902-00031', metode: 'Transfer bank', jumlah: 350_000 },
          { tanggal: '2026-11-19', nomor: 'KEU-KW261119-00012', metode: 'Tunai', jumlah: 1_250_000, ini: true },
        ]}
        metode="Tunai"
        jatuhTempo="2026-12-15"
        terbilang
      />
      <RincianPembayaran varian="ringkas" rincian={[{ uraian: 'Biaya pendaftaran', periode: 'Gelombang 1', nominal: 300_000, dibayar: 300_000 }]} aksen="#c2410c" />
    </div>
  );
}
