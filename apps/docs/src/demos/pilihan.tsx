import { Building2, GraduationCap, Laptop, Moon, Sun } from 'lucide-react';
import { Checkbox, CheckboxGroup, Choice, RadioGroup, Switch } from '@unipo/ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Checkbox, Radio & Switch',
  category: 'Pilihan',
  description: 'Kontrol pilihan modern dengan dua tampilan: daftar dan kartu. Kartu cocok untuk memilih jalur pendaftaran, kelas, atau paket.',
  importLine: "import { Checkbox, CheckboxGroup, RadioGroup, Switch, Choice } from '@unipo/ui';",
  demos: { Tunggal: 'Checkbox dan Switch', Daftar: 'Grup checkbox', Radio: 'Grup radio', Kartu: 'Kartu pilihan (radio)', KartuCek: 'Kartu pilihan (checkbox)' },
};

export function Tunggal() {
  return (
    <div className="demo-stack" style={{ maxWidth: 420 }}>
      <Choice control={<Checkbox defaultChecked />} label="Saya menyatakan data yang diisi benar" description="Data akan diverifikasi panitia PMB." />
      <Choice control={<Checkbox indeterminate />} label="Pilih semua mata kuliah semester 3" />
      <Choice control={<Switch defaultChecked />} label="Notifikasi email" description="Kirim pemberitahuan saat nilai keluar." />
      <Choice control={<Switch size="sm" />} label="Mode ringkas" />
    </div>
  );
}

export function Daftar() {
  return (
    <CheckboxGroup
      defaultValue={['krs']}
      options={[
        { value: 'krs', label: 'KRS disetujui', description: 'Saat dosen PA menyetujui KRS.' },
        { value: 'nilai', label: 'Nilai keluar' },
        { value: 'tagihan', label: 'Tagihan jatuh tempo' },
        { value: 'agenda', label: 'Agenda kampus', disabled: true },
      ]}
    />
  );
}

export function Radio() {
  return (
    <RadioGroup
      orientation="horizontal"
      defaultValue="reguler"
      options={[
        { value: 'reguler', label: 'Kelas reguler' },
        { value: 'karyawan', label: 'Kelas karyawan' },
        { value: 'daring', label: 'Kelas daring' },
      ]}
    />
  );
}

export function Kartu() {
  return (
    <div style={{ width: '100%', maxWidth: 640 }}>
      <RadioGroup
        variant="card"
        columns={3}
        defaultValue="reguler"
        options={[
          { value: 'reguler', label: 'Reguler', description: 'Tes tulis berbasis komputer', icon: <GraduationCap /> },
          { value: 'prestasi', label: 'Prestasi', description: 'Nilai rapor & sertifikat', icon: <Building2 /> },
          { value: 'kip', label: 'KIP Kuliah', description: 'Kuota terbatas', icon: <Laptop /> },
        ]}
      />
    </div>
  );
}

export function KartuCek() {
  return (
    <div style={{ width: '100%', maxWidth: 520 }}>
      <CheckboxGroup
        variant="card"
        columns={2}
        defaultValue={['pagi']}
        options={[
          { value: 'pagi', label: 'Sesi pagi', description: '08.00 – 12.00 WITA', icon: <Sun /> },
          { value: 'malam', label: 'Sesi malam', description: '18.30 – 21.30 WITA', icon: <Moon /> },
        ]}
      />
    </div>
  );
}
