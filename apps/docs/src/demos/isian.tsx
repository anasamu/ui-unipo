import { AtSign, Eye, EyeOff, Mail, Search } from 'lucide-react';
import * as React from 'react';
import { Button, Field, Fieldset, Input, InputGroup, Textarea } from 'unipo-ui';
import type { DemoMeta } from '../registry';
import { jsxProps } from '../Playground';

export const meta: DemoMeta = {
  title: 'Input & Field',
  category: 'Formulir',
  layout: 'narrow',
  description: 'Field menyatukan label, kontrol, deskripsi, dan pesan galat; atribut aria terhubung otomatis. Galat ditampilkan setelah pengguna meninggalkan isian, bukan saat mengetik.',
  importLine: "import { Field, Fieldset, Input, InputGroup, Textarea } from 'unipo-ui';",
  demos: { Dasar: 'Isian dengan label', Galat: 'Galat dan deskripsi', Grup: 'Ikon dan imbuhan', Sandi: 'Kata sandi', Area: 'Teks panjang', Kelompok: 'Fieldset' },
  props: [
    ['label', 'ReactNode', 'Label terlihat (wajib untuk aksesibilitas).'],
    ['description', 'ReactNode', 'Petunjuk format di bawah kontrol.'],
    ['error', 'ReactNode', 'Pesan galat; menandai field tidak valid.'],
    ['required / optional', 'boolean', 'Tanda * atau "(opsional)" pada label.'],
  ],
  playground: {
    controls: [
      { name: 'label', type: 'text', default: 'Email kampus' },
      { name: 'placeholder', type: 'text', default: 'nama@unipo.ac.id' },
      { name: 'description', type: 'text', default: 'Dipakai untuk notifikasi nilai dan tagihan.' },
      { name: 'error', type: 'text', default: '' },
      { name: 'size', type: 'select', options: ['sm', 'md', 'lg'], default: 'md' },
      { name: 'required', type: 'boolean', default: true },
      { name: 'disabled', type: 'boolean', default: false },
    ],
    render: ({ label, description, error, required, placeholder, size, disabled }) => (
      <div style={{ width: '100%', maxWidth: 360 }}>
        <Field label={label} description={description || undefined} error={error || undefined} required={required}>
          <Input placeholder={placeholder} size={size} disabled={disabled} />
        </Field>
      </div>
    ),
    code: ({ label, description, error, required, placeholder, size, disabled }) =>
      `<Field${jsxProps({ label, description, error, required }, { required: false })}>\n  <Input${jsxProps({ placeholder, size, disabled }, { size: 'md', disabled: false })} />\n</Field>`,
  },
};

export function Dasar() {
  return (
    <Field label="Nama lengkap" required>
      <Input placeholder="Sesuai ijazah" defaultValue="Siti Nurhaliza Putri" />
    </Field>
  );
}

export function Galat() {
  const [nik, setNik] = React.useState('75010');
  const [touched, setTouched] = React.useState(true);
  const error = touched && nik.length !== 16 ? 'NIK harus 16 angka. Periksa kembali di KTP atau KK.' : undefined;
  return (
    <div className="demo-stack">
      <Field label="NIK" required error={error} description="16 angka sesuai KTP/KK.">
        <Input inputMode="numeric" value={nik} onChange={(e) => setNik(e.target.value.replace(/\D/g, '').slice(0, 16))} onBlur={() => setTouched(true)} />
      </Field>
      <Field label="Nomor WhatsApp" optional description="Untuk pengingat jadwal ujian dan pembayaran.">
        <Input placeholder="08xxxxxxxxxx" inputMode="tel" />
      </Field>
    </div>
  );
}

export function Grup() {
  return (
    <div className="demo-stack">
      <Field label="Email kampus">
        <InputGroup start={<Mail />} end="@unipo.ac.id" boxed>
          <Input placeholder="nama.anda" />
        </InputGroup>
      </Field>
      <Field label="Biaya per SKS">
        <InputGroup start="Rp" boxed end="/SKS">
          <Input inputMode="numeric" defaultValue="150.000" />
        </InputGroup>
      </Field>
      <InputGroup start={<Search />} size="lg">
        <Input aria-label="Cari" placeholder="Cari berita, agenda, pengumuman…" />
      </InputGroup>
    </div>
  );
}

export function Sandi() {
  const [show, setShow] = React.useState(false);
  return (
    <Field label="Kata sandi" description="Minimal 8 karakter, campuran huruf dan angka.">
      <InputGroup
        start={<AtSign />}
        end={
          <Button variant="ghost" size="xs" iconOnly aria-label={show ? 'Sembunyikan sandi' : 'Tampilkan sandi'} onClick={() => setShow(!show)}>
            {show ? <EyeOff /> : <Eye />}
          </Button>
        }
      >
        <Input type={show ? 'text' : 'password'} defaultValue="rahasia123" />
      </InputGroup>
    </Field>
  );
}

export function Area() {
  return (
    <Field label="Alasan pengajuan cuti" description="Jelaskan singkat; akan dibaca Kaprodi dan BAAK.">
      <Textarea placeholder="Contoh: mengikuti program magang di luar daerah…" rows={4} />
    </Field>
  );
}

export function Kelompok() {
  return (
    <Fieldset legend="Alamat domisili">
      <Field label="Jalan / dusun">
        <Input />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="RT">
          <Input inputMode="numeric" />
        </Field>
        <Field label="RW">
          <Input inputMode="numeric" />
        </Field>
      </div>
    </Fieldset>
  );
}
