import * as React from 'react';
import { Field, NumberField, OtpField, SegmentedControl, Slider, Toggle, ToggleGroup } from 'unipo-ui';
import { Bold, Italic, LayoutGrid, List, Underline } from 'lucide-react';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Angka, OTP & Toggle',
  category: 'Pilihan',
  description: 'Kontrol khusus: jumlah (SKS, kuota), rentang (IPK), kode OTP verifikasi, dan tombol tekan/segmen untuk mengganti tampilan.',
  importLine: "import { NumberField, Slider, OtpField, Toggle, ToggleGroup, SegmentedControl } from 'unipo-ui';",
  demos: { Jumlah: 'NumberField', Rentang: 'Slider', Otp: 'Kode OTP', Segmen: 'SegmentedControl', Tekan: 'Toggle' },
};

export function Jumlah() {
  return (
    <Field label="Kuota kelas">
      <NumberField defaultValue={40} min={1} max={120} />
    </Field>
  );
}

export function Rentang() {
  const [ipk, setIpk] = React.useState<number[]>([2.75, 4]);
  return (
    <div style={{ width: 320 }}>
      <div className="u-label" style={{ marginBottom: 12 }}>
        IPK {ipk[0].toFixed(2)} – {ipk[1].toFixed(2)}
      </div>
      <Slider value={ipk} onValueChange={(v) => setIpk(v as number[])} min={0} max={4} step={0.05} />
    </div>
  );
}

export function Otp() {
  return (
    <div className="demo-stack" style={{ alignItems: 'center' }}>
      <OtpField length={6} separatorAfter={3} defaultValue="4821" aria-label="Kode verifikasi" />
      <span className="u-field-description">Kode dikirim ke 0812••••7731 · kirim ulang dalam 0:45</span>
    </div>
  );
}

export function Segmen() {
  return (
    <div className="demo-row">
      <SegmentedControl
        aria-label="Rentang waktu"
        defaultValue="minggu"
        options={[
          { value: 'hari', label: 'Hari' },
          { value: 'minggu', label: 'Minggu' },
          { value: 'bulan', label: 'Bulan' },
          { value: 'semester', label: 'Semester' },
        ]}
      />
      <SegmentedControl
        aria-label="Tampilan"
        defaultValue="grid"
        options={[
          { value: 'grid', label: '', icon: <LayoutGrid size={16} />, 'aria-label': 'Kisi' },
          { value: 'list', label: '', icon: <List size={16} />, 'aria-label': 'Daftar' },
        ]}
      />
    </div>
  );
}

export function Tekan() {
  return (
    <ToggleGroup multiple defaultValue={['bold']} aria-label="Format teks">
      <Toggle value="bold" aria-label="Tebal"><Bold /></Toggle>
      <Toggle value="italic" aria-label="Miring"><Italic /></Toggle>
      <Toggle value="underline" aria-label="Garis bawah"><Underline /></Toggle>
    </ToggleGroup>
  );
}
