import * as React from 'react';
import { Pilihan } from 'unipo-ui';
import { BukuKas, JurnalUmum, Kasir, KwitansiPembayaran, RiwayatPembayaranMahasiswa, SesiKasir } from 'unipo-ui/siakad';
import { MAHASISWA } from '../mock/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Kasir, riwayat bayar, buku kas & jurnal',
  category: 'Per kegunaan',
  layout: 'wide',
  order: 7,
  badge: 'baru',
  description:
    'Kasir modern untuk loket BAUK, fakultas, dan PMB: buka sesi kasir, cari pembayar, pilih tagihan (boleh cicil), pilih metode, uang diterima dengan tombol nominal cepat dan kembalian, lalu kwitansi digital ber-QR yang bisa dicetak. Dilengkapi riwayat pembayaran mahasiswa (3 varian), buku kas unit dengan saldo berjalan, dan jurnal umum (buat, posting, batalkan). Semua lewat SDK ke /v1/keuangan, /v1/pmb, dan /v1/keu; tampilan mengikuti perangkat (bilah bawah + lembar di mobile).',
  importLine: "import { Kasir, SesiKasir, KwitansiPembayaran, RiwayatPembayaranMahasiswa, BukuKas, JurnalUmum, FormJurnal, DetailJurnal } from 'unipo-ui/siakad';",
  demos: {
    KasirKeuangan: 'Kasir konteks keuangan (BAUK): semua prodi',
    KasirFakultas: 'Kasir konteks fakultas: pencarian dibatasi prodi fakultas',
    KasirPmb: 'Kasir konteks PMB: tagihan pendaftar yang belum dibayar',
    Sesi: 'SesiKasir: buka/tutup loket dengan setoran dan selisih',
    Kwitansi: 'KwitansiPembayaran: kwitansi digital ber-QR verifikasi',
    Riwayat: 'RiwayatPembayaranMahasiswa: linimasa, tabel, kartu',
    Kas: 'BukuKas: kas masuk/keluar unit dengan saldo berjalan',
    Jurnal: 'JurnalUmum: daftar, detail, formulir jurnal, posting, batal',
  },
  props: [
    ['Kasir.konteks', "'keuangan' | 'fakultas' | 'pmb'", 'Menentukan sumber tagihan dan saringan pencarian.'],
    ['Kasir.kodeProdi / kodeFakultas', 'string', 'Saringan pencarian mahasiswa untuk kasir fakultas.'],
    ['Kasir.urlVerifikasi', 'string', 'Alamat dasar QR kwitansi; bawaan url_verifikasi dari API.'],
    ['Kasir.onSelesai', '({ transaksi, pmb }) => void', 'Dipanggil setelah pembayaran tercatat.'],
    ['RiwayatPembayaranMahasiswa.nim', 'string', 'Bawaan akun mahasiswa yang masuk.'],
    ['RiwayatPembayaranMahasiswa.varian', "'linimasa' | 'tabel' | 'kartu'", 'Gaya tampilan.'],
    ['BukuKas.unitId / turunan', 'number / boolean', 'Unit (fakultas/prodi/biro) dan ikut unit turunan.'],
    ['JurnalUmum.bolehPosting', 'boolean', 'Bawaan dari GET /v1/keuangan/saya (admin).'],
  ],
  notes: [
    'Endpoint: GET /v1/keuangan/saya, GET /v1/keuangan/mahasiswa/{nim}, POST /v1/keuangan/transaksi (referensi idempoten, aman diulang), GET /v1/keuangan/transaksi/{id}/kwitansi, POST /v1/keuangan/kasir/buka, POST /v1/keuangan/kasir/{id}/tutup, GET /v1/pmb/admin/tagihan, POST /v1/pmb/admin/tagihan/{id}/lunas, GET /v1/keu/kas, GET/POST /v1/keu/jurnal.',
    'Scope token: keuangan:read, keuangan:write, pmb:admin (kasir PMB), keu:read, keu:write.',
    'Pembayaran tunai masuk ke sesi kasir yang terbuka; saat tutup, setoran dibandingkan dengan tunai tercatat dan selisihnya ditampilkan.',
    'Data di halaman ini rekaan.',
  ],
};

export function KasirKeuangan() {
  return <Kasir konteks="keuangan" judul="Kasir BAUK" />;
}

export function KasirFakultas() {
  return <Kasir konteks="fakultas" kodeFakultas="FIK" kodeProdi={MAHASISWA[0]!.kode_prodi} judul="Kasir Fakultas Ilmu Komputer" />;
}

export function KasirPmb() {
  return <Kasir konteks="pmb" judul="Kasir PMB" />;
}

export function Sesi() {
  return <SesiKasir />;
}

export function Kwitansi() {
  // Biasanya cukup transaksiId; di sini data diisi langsung agar contoh tampil tanpa transaksi.
  return (
    <KwitansiPembayaran
      data={{
        nomor: 'KW/20261116/5012',
        tanggal: '2026-11-16',
        status: 'sah',
        perguruan_tinggi: { nama_pt: 'Universitas Pohuwato', singkatan: 'UNIPO', alamat: 'Jl. Trans Sulawesi, Marisa, Pohuwato' },
        mahasiswa: { nim: MAHASISWA[0]!.nim, nama: MAHASISWA[0]!.nama, angkatan: String(MAHASISWA[0]!.tahun_masuk) },
        prodi: { nama_prodi: 'Teknik Informatika', kode_jenjang: 'S1' },
        tahun_id: '20251',
        kode_biaya: 'SPP',
        jenis_biaya: 'SPP semester',
        jumlah: 2_500_000,
        terbilang: 'dua juta lima ratus ribu rupiah',
        metode: 'tunai',
        petugas: 'kasir.bauk',
        kode_verifikasi: 'a1b2c3d4e5f6a7b8c9d0a1b2c3d4e5f6',
        url_verifikasi: 'https://siakad.unipo.ac.id/api/v1/keuangan/kwitansi/verifikasi/a1b2c3d4e5f6a7b8c9d0a1b2c3d4e5f6',
      }}
    />
  );
}

export function Riwayat() {
  const [v, setV] = React.useState<'linimasa' | 'tabel' | 'kartu'>('linimasa');
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Pilihan
        value={v}
        onValueChange={(x) => setV(x as typeof v)}
        options={[
          { value: 'linimasa', label: 'Linimasa' },
          { value: 'tabel', label: 'Tabel' },
          { value: 'kartu', label: 'Kartu' },
        ]}
      />
      <RiwayatPembayaranMahasiswa nim={MAHASISWA[1]!.nim} varian={v} />
    </div>
  );
}

export function Kas() {
  return <BukuKas unitId={4} turunan judul="Buku kas Fakultas Ilmu Komputer" />;
}

export function Jurnal() {
  return <JurnalUmum bolehPosting />;
}
