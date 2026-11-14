import * as React from 'react';
import { Calendar, DatePicker, Dropzone, Field, FileList, toISODate, useToast, type UploadedFile } from '@unipo/ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Kalender, tanggal & unggah',
  category: 'Tanggal & berkas',
  description: 'Kalender bulanan (mulai Senin, akhir pekan merah, titik agenda, mode rentang, navigasi panah), pemilih tanggal, dan unggah berkas dengan seret-lepas.',
  importLine: "import { Calendar, DatePicker, Dropzone, FileList } from '@unipo/ui';",
  demos: { Bulanan: 'Kalender dengan penanda', Rentang: 'Pilih rentang', Pemilih: 'DatePicker', Unggah: 'Dropzone + daftar berkas' },
};

export function Bulanan() {
  const [d, setD] = React.useState(new Date(2026, 10, 17));
  const m = (day: number) => toISODate(new Date(2026, 10, day));
  return (
    <Calendar
      bordered
      value={d}
      onValueChange={setD}
      month={new Date(2026, 10, 1)}
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
  return <Calendar bordered range={r} onRangeChange={setR} month={new Date(2026, 10, 1)} />;
}

export function Pemilih() {
  const [d, setD] = React.useState<Date | null>(null);
  return (
    <div style={{ width: 300 }}>
      <Field label="Tanggal lahir" required>
        <DatePicker value={d} onValueChange={setD} max={new Date()} />
      </Field>
    </div>
  );
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
