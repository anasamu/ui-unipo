import * as React from 'react';
import { Button, Card, CardContent, SegmentedControl } from 'unipo-ui';
import { FormKurikulumObe, KelolaMkKurikulum, KelolaPeninjauan, RujukanAturan, invalidateSiakad, useAturanKurikulumBerlaku, useKurikulum } from 'unipo-ui/siakad';
import { modeAturan, setelModeAturan, type ModeAturan } from '../mock/kurikulum-aturan';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Wizard kurikulum (mengikuti aturan berversi)',
  category: 'Akademik',
  layout: 'full',
  order: 7,
  badge: 'baru',
  description:
    'Form panjang kurikulum sebagai wizard di panel samping: identitas kurikulum, mata kuliah, dan catatan peninjauan. Langkah dan isian wajib dibaca dari aturan kurikulum berversi yang berlaku untuk prodi (kerangka sebagai data): kerangka OBE memunculkan langkah profil lulusan, CPL, bahan kajian, bagian dinamis, dan CPL yang didukung MK; kerangka lain hanya menampilkan bagian yang dituntutnya. Ganti versi aturan di atas untuk melihat bedanya.',
  importLine: "import { FormKurikulumObe, KelolaMkKurikulum, KelolaPeninjauan, useAturanKurikulumBerlaku } from 'unipo-ui/siakad';",
  demos: {
    Identitas: 'FormKurikulumObe: kurikulum baru dan ubah kurikulum',
    MataKuliah: 'KelolaMkKurikulum: tambah atau klik MK untuk membuka wizard mata kuliah',
    Peninjauan: 'KelolaPeninjauan: catat atau klik catatan untuk membuka wizard peninjauan',
  },
  props: [
    ['FormKurikulumObe.kurikulum', 'Kurikulum', 'Isi = mode ubah (lompat ke langkah mana pun). Kosong = kurikulum baru.'],
    ['FormKurikulumObe.pilihanProdi', 'Array<{ kode_prodi, nama_prodi }>', 'Batasi prodi. Kosong = prodi dari /v1/kurikulum-aturan/referensi.'],
    ['useAturanKurikulumBerlaku', '({ prodi, kurikulumId?, angkatan? }) => AturanKurikulumBerlaku', 'Versi aturan + definisi kerangka yang berlaku: bagian aktif, isian MK wajib, batas SKS semester, rujukan SK.'],
  ],
  notes: [
    'Payload dan endpoint sama dengan form lama: POST/PUT /v1/kurikulum-obe/kurikulum, /kurikulum/{id}/mk, /mk/{id}, /peninjauan. Butir baru (profil lulusan, CPL, bahan kajian), prasyarat, pemetaan CPL/bahan kajian, dan isian kerangka memakai endpoint tab masing-masing.',
    'Isian yang belum disimpan tersimpan di peramban dan dipulihkan saat panel dibuka lagi.',
  ],
};

/** Pemilih versi aturan contoh + aturan yang sedang berlaku (hook tetap terpasang agar ganti versi memuat ulang). */
function PilihAturan() {
  const [m, setM] = React.useState<ModeAturan>(modeAturan());
  React.useEffect(() => {
    const l = () => setM(modeAturan());
    globalThis.addEventListener?.('mode-aturan', l);
    return () => globalThis.removeEventListener?.('mode-aturan', l);
  }, []);
  const kur = useKurikulum(12);
  const a = useAturanKurikulumBerlaku({ prodi: '55201', kurikulumId: 12, angkatan: kur.data?.tahun_berlaku ?? 2025 });
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <SegmentedControl<ModeAturan>
        aria-label="Versi aturan contoh"
        value={m}
        onValueChange={(v) => {
          setelModeAturan(v);
          setM(v);
          invalidateSiakad('kurikulum-aturan');
        }}
        options={[
          { value: 'obe', label: 'Aturan 2025 (OBE)' },
          { value: 'kbk', label: 'Aturan 2016 (KBK)' },
          { value: 'tanpa', label: 'Belum ada aturan' },
        ]}
      />
      <RujukanAturan aturan={a} />
    </div>
  );
}

export function Identitas() {
  const [buka, setBuka] = React.useState<'baru' | 'ubah' | null>(null);
  const kur = useKurikulum(12);
  return (
    <Card>
      <CardContent style={{ display: 'grid', gap: 14 }}>
        <PilihAturan />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button onClick={() => setBuka('baru')}>Kurikulum baru</Button>
          <Button variant="outline" onClick={() => setBuka('ubah')} disabled={!kur.data}>
            Ubah {kur.data?.kode ?? 'kurikulum'}
          </Button>
        </div>
        <FormKurikulumObe open={buka === 'baru'} onOpenChange={(o) => !o && setBuka(null)} kodeProdi="55201" />
        {kur.data ? <FormKurikulumObe open={buka === 'ubah'} onOpenChange={(o) => !o && setBuka(null)} kurikulum={kur.data} /> : null}
      </CardContent>
    </Card>
  );
}

export function MataKuliah() {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <PilihAturan />
      <KelolaMkKurikulum kurikulumId={12} bolehUbah />
    </div>
  );
}

export function Peninjauan() {
  return <KelolaPeninjauan kurikulumId={12} bolehUbah />;
}
