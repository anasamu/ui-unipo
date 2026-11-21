import * as React from 'react';
import { Badge, Field, PilihIkon, PilihWarna, SwitchBaris, warnaToken, IKON_PILIHAN } from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'PilihIkon, PilihWarna & SwitchBaris',
  category: 'Pilihan',
  layout: 'narrow',
  description:
    'Pemilih ikon (kisi berpencarian dengan label Indonesia) dan warna dari token tema untuk menu, kategori, dan label; SwitchBaris untuk halaman pengaturan yang langsung tersimpan. Pilihan kartu (radio/checkbox) memakai RadioGroup/CheckboxGroup variant="card".',
  importLine: "import { PilihIkon, PilihWarna, SwitchBaris } from 'unipo-ui';",
  demos: { IkonWarna: 'Kategori pengumuman', Pengaturan: 'Pengaturan notifikasi (SwitchBaris)' },
  notes: ['PilihWarna menyimpan nama token (mis. "success"), bukan kode hex, sehingga warna tetap terbaca di mode gelap. Tampilkan dengan warnaToken(token).'],
};

export function IkonWarna() {
  const [ikon, setIkon] = React.useState<string | null>('Megaphone');
  const [warna, setWarna] = React.useState('info');
  const I = ikon ? IKON_PILIHAN[ikon]?.ikon : null;
  return (
    <div className="demo-stack">
      <Field label="Ikon kategori">
        <PilihIkon value={ikon} onValueChange={setIkon} />
      </Field>
      <Field label="Warna label">
        <PilihWarna value={warna} onValueChange={setWarna} />
      </Field>
      <div>
        Pratinjau:{' '}
        <Badge style={{ background: `color-mix(in oklab, ${warnaToken(warna)} 15%, transparent)`, color: warnaToken(warna) }}>
          {I && <I size={12} />} Pengumuman akademik
        </Badge>
      </div>
    </div>
  );
}

export function Pengaturan() {
  return (
    <div>
      <SwitchBaris label="Email saat nilai keluar" keterangan="Mahasiswa menerima email setiap dosen mengunci nilai." defaultChecked onCheckedChange={() => new Promise((r) => setTimeout(r, 600))} />
      <SwitchBaris label="Pengingat tagihan" keterangan="Dikirim 7 hari sebelum jatuh tempo." onCheckedChange={() => new Promise((_, gagal) => setTimeout(() => gagal(new Error('Tidak tersimpan: koneksi terputus. Coba lagi.')), 600))} />
      <SwitchBaris label="Izinkan KRS lewat batas" keterangan="Mahasiswa bisa mengisi KRS setelah tahapan ditutup." disabled alasan="Diatur oleh BAAK menurut kalender akademik." />
      <SwitchBaris label="Mode ujian aman" keterangan="Hanya-baca untuk peran Anda." checked readOnly />
    </div>
  );
}
