import * as React from 'react';
import { Button, Field, IsianAngka, IsianJam, IsianRupiah, IsianTanggalWaktu, formatRupiah } from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Isian uang, angka & waktu',
  category: 'Formulir',
  layout: 'narrow',
  description:
    'Pengganti <input type="number">, <input type="time"> dan <input type="datetime-local">. Titik ribuan muncul selagi mengetik, nilai keluar tetap angka mentah, batas diperiksa dengan pesan awam, dan tanggal-jam memakai kalender akademik yang sama dengan DatePicker.',
  importLine: "import { IsianRupiah, IsianAngka, IsianJam, IsianTanggalWaktu } from 'unipo-ui';",
  demos: { Rupiah: 'Dana hibah (IsianRupiah)', Angka: 'Angka dengan satuan dan tombol', TanggalWaktu: 'Jadwal ujian (IsianTanggalWaktu)', Keadaan: 'Memuat, hanya-baca, nonaktif, galat server' },
  props: [
    ['value / onValueChange', 'number | null', 'Nilai mentah (IsianAngka/IsianRupiah); teks "YYYY-MM-DDTHH:mm" (IsianTanggalWaktu); "HH:mm" (IsianJam).'],
    ['min / max', 'number | string', 'Batas; pesan "Paling sedikit Rp 1.000.000." tampil saat keluar isian.'],
    ['desimal / sen', 'number / boolean', 'Jumlah angka di belakang koma. Rupiah bawaan bulat.'],
    ['awalan / satuan / tombol', 'ReactNode / boolean', 'Teks kiri/kanan dan tombol −/+ (IsianAngka).'],
    ['format', "'lokal' | 'sql'", 'IsianTanggalWaktu: "2026-11-22T08:30" atau "2026-11-22 08:30:00".'],
    ['memuat / readOnly / disabled', 'boolean', 'Kerangka saat data awal belum siap, tampil tanpa bisa diubah, nonaktif.'],
    ['galat / onGalat / tampilGalat', 'string / fn / boolean', 'Galat dari server; laporan galat isian ke form; sembunyikan pesan bila Field sudah menampilkannya.'],
  ],
  notes: [
    'Keyboard: panah atas/bawah menambah/mengurangi (Shift = 10× langkah atau 1 jam), Enter menerapkan ketikan.',
    'Rupiah menampilkan terbilang di bawah isian agar salah ketik nol langsung terlihat. Batas dana sebaiknya berasal dari kebijakan ber-SK (dikirim API), bukan angka di kode halaman.',
  ],
};

export function Rupiah() {
  const [dana, setDana] = React.useState<number | null>(25000000);
  const [galat, setGalat] = React.useState<string | null>(null);
  return (
    <div className="demo-stack">
      <Field label="Dana diusulkan" required>
        <IsianRupiah value={dana} onValueChange={setDana} min={1000000} max={50000000} required onGalat={setGalat} info="Batas hibah internal Rp 1.000.000 – Rp 50.000.000 (SK Rektor 12/2026)" />
      </Field>
      <p style={{ margin: 0, fontSize: 13 }}>
        Nilai terkirim: <code>{JSON.stringify(dana)}</code> {dana != null && `(${formatRupiah(dana)})`}
      </p>
      <Button disabled={Boolean(galat)}>Simpan usulan</Button>
    </div>
  );
}

export function Angka() {
  const [sks, setSks] = React.useState<number | null>(3);
  const [ipk, setIpk] = React.useState<number | null>(3.5);
  return (
    <div className="demo-stack">
      <Field label="Bobot SKS">
        <IsianAngka value={sks} onValueChange={setSks} min={1} max={6} tombol satuan="SKS" />
      </Field>
      <Field label="IPK minimal">
        <IsianAngka value={ipk} onValueChange={setIpk} min={0} max={4} desimal={2} langkah={0.25} />
      </Field>
    </div>
  );
}

export function TanggalWaktu() {
  const [mulai, setMulai] = React.useState<string | null>('2026-12-07T08:00');
  const [jam, setJam] = React.useState<string | null>('13:30');
  return (
    <div className="demo-stack">
      <Field label="Mulai ujian" description="Ketik tanggal atau pilih dari kalender; jam bisa diketik 0800 atau digeser dengan panah.">
        <IsianTanggalWaktu value={mulai} onValueChange={setMulai} min="2026-12-01T07:00" max="2026-12-31T18:00" aria-label="Mulai ujian" />
      </Field>
      <Field label="Jam pulang">
        <IsianJam value={jam} onValueChange={setJam} min="12:00" max="17:00" />
      </Field>
      <p style={{ margin: 0, fontSize: 13 }}>
        Nilai: <code>{JSON.stringify({ mulai, jam })}</code>
      </p>
    </div>
  );
}

export function Keadaan() {
  return (
    <div className="demo-stack">
      <Field label="Memuat">
        <IsianRupiah memuat />
      </Field>
      <Field label="Hanya-baca (sudah disetujui)">
        <IsianRupiah value={15000000} readOnly tampilTerbilang={false} />
      </Field>
      <Field label="Nonaktif">
        <IsianAngka value={2} disabled satuan="orang" />
      </Field>
      <Field label="Galat dari server">
        <IsianRupiah value={75000000} galat="Melebihi sisa pagu fakultas (Rp 40.000.000)." />
      </Field>
    </div>
  );
}
