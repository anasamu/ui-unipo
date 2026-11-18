import * as React from 'react';
import { Card, CardContent, Field } from 'unipo-ui';
import { IsianSK, PilihNomorSK, type NilaiSK, type SKDitemukan } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Nomor SK (cari atau unggah)',
  category: 'Terhubung SDK',
  layout: 'narrow',
  order: 5,
  badge: 'baru',
  description:
    'Kompatibel mundur dengan form lama. Kini mencari di registri SK tunggal (/v1/sk); SK yang dipilih dari registri membawa sk_id dan tidak meminta tanggal/berkas lagi. Nomor baru diperiksa ganda lebih dulu (tulisan berbeda dari SK yang sudah tercatat langsung disarankan), lalu diajukan pencatatannya oleh server. Untuk form baru pakai PilihSK.',
  importLine: "import { IsianSK, PilihNomorSK } from 'unipo-ui/siakad';",
  demos: { Lengkap: 'Nomor, tanggal, dan berkas SK', Nomor: 'Nomor SK saja' },
  props: [
    ['value / onValueChange', 'NilaiSK { nomor, tanggal?, berkas_id?, perihal? }', 'IsianSK. PilihNomorSK memakai string nomor.'],
    ['cari', '(q, signal) => Promise<SKDitemukan[]>', 'Sumber tambahan yang digabung dengan arsip, mis. nomor_sk dari tabel aplikasi.'],
    ['arsip', 'boolean', 'Cari juga di /v1/arsip/surat-keluar (diam bila tidak punya akses). Bawaan true.'],
    ['bolehBaru', 'boolean', 'Izinkan nomor baru yang belum tercatat. Bawaan true.'],
    ['tanggal / berkas', 'boolean', 'Tampilkan tanggal SK dan unggah/pilih berkas SK. Bawaan true.'],
  ],
  notes: [
    'Kirim bodySK(nilai): { sk_id } bila SK dari registri, selain itu { nomor, tanggal, berkas_id } (server mencari/mengajukan di registri).',
    'Jangan melampirkan berkas SK ke setiap baris; berkasnya ada di registri dan dibaca lewat /v1/sk/{id}/berkas.',
  ],
};

const SK_PENUGASAN: SKDitemukan[] = [
  { nomor: '045/SK/UNIPO/IX/2026', tanggal: '2026-09-02', perihal: 'Operator Pustikom', asal: 'Penugasan peran' },
  { nomor: '061/SK/UNIPO/X/2026', tanggal: '2026-10-14', perihal: 'Tim SPMI fakultas', asal: 'Penugasan peran' },
];
const cariPenugasan = async (q: string) => SK_PENUGASAN.filter((s) => !q || `${s.nomor} ${s.perihal}`.toLowerCase().includes(q.toLowerCase()));

export function Lengkap() {
  const [sk, setSk] = React.useState<NilaiSK | null>(null);
  return (
    <Card>
      <CardContent style={{ display: 'grid', gap: '1rem' }}>
        <IsianSK value={sk} onValueChange={setSk} cari={cariPenugasan} />
        <pre className="u-mono" style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(sk, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}

export function Nomor() {
  const [nomor, setNomor] = React.useState<string | null>('045/SK/UNIPO/IX/2026');
  return (
    <Field label="Nomor SK" description={nomor ? `Nilai: ${nomor}` : undefined}>
      <PilihNomorSK value={nomor} onValueChange={(n) => setNomor(n)} cari={cariPenugasan} />
    </Field>
  );
}
