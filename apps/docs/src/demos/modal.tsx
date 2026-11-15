import * as React from 'react';
import { Button, DialogWizard, Field, FormGrid, Input, KonfirmasiKetik, WizardReview, useToast } from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Modal khusus',
  category: 'Overlay',
  layout: 'normal',
  order: 60,
  badge: 'baru',
  description: 'Konfirmasi dengan mengetik kata kunci untuk aksi yang tidak bisa dibatalkan (hapus permanen, reset data), dan wizard di dalam dialog untuk formulir bertahap singkat.',
  importLine: "import { KonfirmasiKetik, DialogWizard } from 'unipo-ui';",
  demos: { Ketik: 'Konfirmasi ketik', Wizard: 'Wizard di dalam dialog' },
  props: [
    ['word', 'string', 'Kata yang harus diketik persis sebelum tombol aktif.'],
    ['confirmLabel', 'string', 'Label tombol, berupa kata kerja (mis. "Hapus 12 data").'],
    ['DialogWizard', 'WizardProps + dialogTitle', 'Semua props Wizard; dialog tertutup sendiri setelah onFinish berhasil.'],
  ],
};

export function Ketik() {
  const toast = useToast();
  return (
    <KonfirmasiKetik
      trigger={<Button variant="destructive">Hapus angkatan 2019</Button>}
      title="Hapus data angkatan 2019?"
      description="312 data mahasiswa beserta KRS dan nilainya akan dihapus permanen."
      word="angkatan-2019"
      confirmLabel="Hapus 312 data"
      onConfirm={() => void toast.add({ title: 'Data dihapus (contoh).' })}
    />
  );
}

export function Wizard() {
  const toast = useToast();
  const [nama, setNama] = React.useState('');
  const [ruang, setRuang] = React.useState('');
  return (
    <DialogWizard
      trigger={<Button>Pinjam ruang</Button>}
      dialogTitle="Ajukan peminjaman ruang"
      onFinish={() => void toast.add({ title: 'Pengajuan terkirim (contoh).' })}
      steps={[
        {
          id: 'kegiatan',
          title: 'Kegiatan',
          content: (
            <FormGrid>
              <Field label="Nama kegiatan" required>
                <Input value={nama} onChange={(e) => setNama(e.target.value)} />
              </Field>
            </FormGrid>
          ),
          onNext: () => (nama.trim() ? null : 'Nama kegiatan wajib diisi'),
        },
        {
          id: 'ruang',
          title: 'Ruang',
          content: (
            <FormGrid>
              <Field label="Ruang" required>
                <Input value={ruang} onChange={(e) => setRuang(e.target.value)} placeholder="mis. Aula Utama" />
              </Field>
            </FormGrid>
          ),
          onNext: () => (ruang.trim() ? null : 'Ruang wajib diisi'),
        },
        { id: 'tinjau', title: 'Tinjau', content: <WizardReview sections={[{ title: 'Peminjaman', items: [{ label: 'Kegiatan', value: nama }, { label: 'Ruang', value: ruang }] }]} /> },
      ]}
    />
  );
}
