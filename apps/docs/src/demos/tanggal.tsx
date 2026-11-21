import * as React from 'react';
import { Calendar, DatePicker, DateRangePicker, Dropzone, Field, FileList, presetRentang, toISODate, useToast, type RentangNilai, type UploadedFile } from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Kalender, tanggal & unggah',
  category: 'Tanggal & berkas',
  description:
    'Kalender bulanan (mulai Senin, akhir pekan & libur merah, titik agenda, mode rentang) dengan lompat cepat: klik nama bulan untuk 12 bulan, klik tahun untuk 12 tahun per halaman. DatePicker dan DateRangePicker bisa diketik langsung (20/07/2018, 20-7-18, 2018-07-20, 20 jul 2018), punya tombol Hari ini, dan menjadi lembar bawah di ponsel.',
  importLine: "import { Calendar, DatePicker, DateRangePicker, presetRentang, uraiTanggal, Dropzone, FileList } from 'unipo-ui';",
  demos: {
    Pemilih: 'DatePicker: ketik atau pilih',
    TanggalLahir: 'Tanggal lahir: buka di tampilan tahun',
    PemilihRentang: 'DateRangePicker dengan preset',
    Bulanan: 'Kalender dengan penanda & libur',
    Rentang: 'Kalender mode rentang',
    Unggah: 'Dropzone + daftar berkas',
  },
  props: [
    ['DatePicker.value / onValueChange', 'Date | null', 'Sama seperti sebelumnya (kompatibel mundur).'],
    ['bisaDiketik', 'boolean = true', 'Isian bisa diketik dd/mm/yyyy; Enter atau keluar dari isian menerapkan. Tanggal tak ada (30/02) atau di luar min/max ditolak dengan pesan.'],
    ['tampilanAwal', "'hari' | 'bulan' | 'tahun'", "Tampilan kalender saat dibuka tanpa nilai. 'tahun' untuk tanggal lahir/SK lama."],
    ['awal', 'Date', 'Bulan yang dibuka bila belum ada nilai (bawaan hari ini, dijepit ke min/max).'],
    ['tombolHariIni / bisaDihapus', 'boolean = true', 'Tombol Hari ini dan Hapus di kaki kalender.'],
    ['libur', 'Record<iso, nama>', 'Hari libur ditandai merah (juga di Calendar).'],
    ['onGalat / tampilGalat', '(pesan | null) => void / boolean', 'Pesan galat ketikan; bawaan tampil di bawah isian.'],
    ['DateRangePicker.value', '{ from: Date | null; to: Date | null }', 'Tanggal awal & akhir, keduanya bisa diketik.'],
    ['DateRangePicker.preset', 'PresetRentang[]', "Pilihan cepat. presetRentang(['hari_ini', '7_hari', 'bulan_ini'], { semester }) — Semester ini hanya bila datanya ada."],
    ['uraiTanggal(teks, { min, max })', '{ ok, tanggal } | { ok: false, pesan } | null', 'Pengurai yang dipakai isian, bisa dipakai sendiri.'],
  ],
  notes: [
    'Keyboard di kalender: panah antar hari, PageUp/PageDown bulan, Shift+PageUp/PageDown tahun, Home/End awal/akhir minggu, Enter memilih, Esc kembali dari tampilan bulan/tahun lalu menutup. Di isian: panah bawah membuka kalender.',
    'Contoh lompat ke 20 Juli 2018 dari November 2026: klik "2026" → klik "2018" → klik "Jul" → klik 20. Atau ketik 20/07/2018 lalu Enter.',
  ],
};

export function Pemilih() {
  const [d, setD] = React.useState<Date | null>(new Date(2026, 10, 21));
  return (
    <div style={{ width: 300 }}>
      <Field label="Tanggal SK" description="Ketik dd/mm/yyyy atau pilih dari kalender.">
        <DatePicker value={d} onValueChange={setD} placeholder="Tanggal SK" />
      </Field>
      <p style={{ marginTop: 8, fontSize: 12, color: 'var(--u-muted-foreground)' }} data-nilai-demo>
        Nilai: {d ? toISODate(d) : 'kosong'}
      </p>
    </div>
  );
}

export function TanggalLahir() {
  const [d, setD] = React.useState<Date | null>(null);
  return (
    <div style={{ width: 300 }}>
      <Field label="Tanggal lahir" required>
        <DatePicker value={d} onValueChange={setD} min={new Date(1940, 0, 1)} max={new Date()} tampilanAwal="tahun" awal={new Date(2005, 0, 1)} />
      </Field>
    </div>
  );
}

export function PemilihRentang() {
  const [r, setR] = React.useState<RentangNilai>({ from: null, to: null });
  return (
    <div style={{ width: 360 }}>
      <Field label="Periode laporan">
        <DateRangePicker value={r} onValueChange={setR} preset={presetRentang(['hari_ini', '7_hari', 'bulan_ini'], { semester: { dari: '2026-09-01', sampai: '2027-01-31' } })} />
      </Field>
      <p style={{ marginTop: 8, fontSize: 12, color: 'var(--u-muted-foreground)' }} data-nilai-demo>
        {r.from ? toISODate(r.from) : '…'} s.d. {r.to ? toISODate(r.to) : '…'}
      </p>
    </div>
  );
}

export function Bulanan() {
  const [d, setD] = React.useState(new Date(2026, 10, 17));
  const m = (day: number) => toISODate(new Date(2026, 10, day));
  return (
    <Calendar
      bordered
      value={d}
      onValueChange={setD}
      tombolHariIni
      libur={{ '2026-12-25': 'Hari Raya Natal' }}
      markers={{
        [m(3)]: [{ color: 'var(--u-primary)' }],
        [m(10)]: [{ color: 'var(--u-danger)' }],
        [m(17)]: [{ color: 'var(--u-secondary)' }, { color: 'var(--u-primary)' }],
        [m(24)]: [{ color: 'var(--u-success)' }],
      }}
    />
  );
}

export function Rentang() {
  const [r, setR] = React.useState<{ from: Date | null; to: Date | null }>({ from: new Date(2026, 10, 9), to: new Date(2026, 10, 14) });
  return <Calendar bordered range={r} onRangeChange={setR} />;
}

export function Unggah() {
  const toast = useToast();
  const [files, setFiles] = React.useState<UploadedFile[]>([
    { id: '1', name: 'ijazah-sma.pdf', size: 842_000 },
    { id: '2', name: 'pas-foto.jpg', size: 312_000 },
    { id: '3', name: 'kartu-keluarga.pdf', size: 1_240_000, progress: 64 },
  ]);
  return (
    <div style={{ width: '100%', maxWidth: 480 }}>
      <Dropzone
        accept=".pdf,.jpg,.png"
        multiple
        maxSize={2 * 1024 * 1024}
        onReject={(msg) => toast.add({ title: 'Berkas ditolak', description: msg, type: 'error' })}
        onFiles={(fs) => setFiles((cur) => [...cur, ...fs.map((f) => ({ id: crypto.randomUUID(), name: f.name, size: f.size, file: f }))])}
      />
      <FileList files={files} onRemove={(id) => setFiles(files.filter((f) => f.id !== id))} />
    </div>
  );
}
