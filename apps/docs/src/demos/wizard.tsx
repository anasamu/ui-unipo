import { Phone } from 'lucide-react';
import { Field, FormGrid, Input, Wizard, WizardReview } from 'unipo-ui';
import { WizardBiodata, WizardPendaftaranPmb } from 'unipo-ui/siakad';
import { useState } from 'react';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Wizard formulir',
  category: 'Widget fitur',
  layout: 'full',
  order: 3,
  description:
    'Formulir bertahap untuk pendaftaran PMB dan pemutakhiran biodata. Tiap langkah disimpan sendiri, jadi pendaftar bisa berhenti dan melanjutkan kapan saja. Daftar langkah di kiri pada layar lebar, bilah kemajuan pada ponsel. Galat validasi dari server (422) muncul di field terkait.',
  importLine: "import { WizardPendaftaranPmb, WizardBiodata } from 'unipo-ui/siakad';\nimport { Wizard, WizardReview, FormGrid } from 'unipo-ui';",
  demos: {
    Pmb: 'WizardPendaftaranPmb (pmb.getSayaPendaftaranById + patch + ajukan)',
    Biodata: 'WizardBiodata dengan onSimpan sendiri',
    Dasar: 'Wizard dengan langkah sendiri',
  },
  props: [
    ['id', 'string', 'UUID pendaftaran milik akun PMB yang login.'],
    ['onDiajukan', '({ no_pmb, status }) => void', 'Setelah POST /ajukan berhasil.'],
    ['kontak', 'ReactNode', 'Kontak panitia di bawah daftar langkah.'],
    ['WizardStep.onNext', '() => string | void | Promise', 'Simpan langkah; kembalikan teks galat untuk menahan.'],
    ['Wizard.savedAt', 'Date', 'Menampilkan "Tersimpan 10.42" di kaki panel.'],
  ],
  notes: [
    'WizardPendaftaranPmb mengirim hanya bagian dari langkah yang sedang diisi (pribadi, alamat, asal_sekolah, orang_tua, pilihan) ke PATCH /v1/pmb/saya/pendaftaran/{id}, sesuai cara SIAKAD menggabungkan draf.',
    'SIAKAD belum punya endpoint umum untuk mengubah biodata mahasiswa, jadi WizardBiodata menyerahkan penyimpanan ke onSimpan (mis. dikirim sebagai pengajuan perubahan data ke BAAK).',
  ],
};

export function Pmb() {
  return (
    <WizardPendaftaranPmb
      id="pmb-demo"
      kontak={
        <>
          <b style={{ color: 'var(--u-foreground)', display: 'block', marginBottom: 4 }}>Butuh bantuan?</b>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <Phone size={14} /> Panitia PMB: 0812-0000-0000
          </span>
        </>
      }
    />
  );
}

export function Biodata() {
  return <WizardBiodata nilaiAwal={{ pribadi: { nama: 'Mahasiswa Contoh', jenis_kelamin: 'L', agama: '1' } }} onSimpan={async () => new Promise((r) => setTimeout(r, 400))} />;
}

export function Dasar() {
  const [nama, setNama] = useState('');
  return (
    <Wizard
      title="Pengajuan surat aktif kuliah"
      onFinish={() => undefined}
      finishLabel="Ajukan surat"
      steps={[
        {
          id: 'data',
          title: 'Keperluan',
          content: (
            <FormGrid>
              <Field label="Keperluan" required style={{ gridColumn: '1 / -1' }}>
                <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. tunjangan orang tua" />
              </Field>
            </FormGrid>
          ),
          onNext: () => (nama.trim() ? undefined : 'Isi keperluan surat terlebih dahulu.'),
        },
        { id: 'tinjau', title: 'Tinjau', content: <WizardReview sections={[{ title: 'Surat', items: [{ label: 'Keperluan', value: nama }] }]} /> },
      ]}
    />
  );
}
