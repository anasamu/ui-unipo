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
    'Pengganti kolom "Nomor SK" yang diketik manual. Ketik sebagian nomor atau perihal untuk memilih SK yang sudah tercatat di arsip surat keluar (dan sumber aplikasi Anda, mis. nomor SK penugasan sebelumnya). Bila belum ada, pakai nomor baru lalu unggah pindaian SK; berkasnya tersimpan di /v1/berkas dan bisa dilampirkan ke baris data Anda.',
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
    'Simpan berkas_id sebagai lampiran baris yang memakai SK itu, mis. POST /v1/rbac/penugasan/{id}/berkas { berkas_id, jenis: "sk" }.',
    'Dipakai di Pustikom (Beri peran ke pengguna) dan lampiran SK aturan dinamis.',
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
