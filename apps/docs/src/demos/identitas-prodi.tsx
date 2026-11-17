import * as React from 'react';
import { SegmentedControl } from 'unipo-ui';
import { LabelProdi, type VarianLabelProdi } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';
import { PRODI } from '../mock/siakad';

export const meta: DemoMeta = {
  title: 'Identitas prodi',
  category: 'Terhubung SDK',
  layout: 'wide',
  order: 5,
  badge: 'baru',
  description:
    'Satu komponen untuk identitas program studi di mana pun: logo fakultas, nama fakultas (kecil, di atas), nama prodi (tebal, di bawah), lalu lencana jenjang dan akreditasi yang rata tengah terhadap kedua baris. Pilih tampilan lewat varian: baku, ringkas, kartu, header, sidebar, chip, daftar, vertikal. Nama panjang dipotong, dan di layar sempit lencana turun ke bawah teks.',
  importLine: "import { LabelProdi } from 'unipo-ui/siakad';",
  demos: {
    Baku: 'Baku (bawaan): fakultas di atas, prodi di bawah, lencana di kanan',
    SemuaVarian: 'Semua varian',
    Ukuran: 'Ukuran sm, md, lg dan bentuk logo',
    Statistik: 'Dengan jumlah mahasiswa dan dosen',
  },
  props: [
    ['varian', "'baku' | 'ringkas' | 'kartu' | 'header' | 'sidebar' | 'chip' | 'daftar' | 'vertikal'", 'Tampilan. Bawaan baku.'],
    ['kode / prodi / nama', 'string / ProdiReferensi / string', 'Cukup kode prodi; data lain dilengkapi dari /v1/referensi/prodi (cache bersama).'],
    ['ukuran', "'sm' | 'md' | 'lg'", 'Ukuran logo dan teks. Bawaan md.'],
    ['bentukLogo', "'kotak' | 'bulat'", 'Bentuk logo fakultas.'],
    ['sub', "'fakultas' | 'kode' | ReactNode | false", 'Baris di atas nama prodi. Bawaan nama fakultas.'],
    ['akreditasi', 'boolean', 'Tampilkan lencana akreditasi. Bawaan true.'],
    ['statistik', '{ mahasiswa?, dosen? }', 'Angka opsional di bawah identitas.'],
    ['onClick / href', 'fungsi / string', 'Jadikan tombol atau tautan (berguna untuk varian kartu, daftar, chip).'],
  ],
  notes: [
    'Varian kartu menampilkan masa berlaku dan nomor SK akreditasi. Varian sidebar menyembunyikan lencana akreditasi agar ringkas. Varian chip menampilkan titik warna akreditasi (tooltip berisi peringkatnya).',
  ],
};

const P = PRODI as unknown as Array<Parameters<typeof LabelProdi>[0]['prodi']>;
const VARIAN: VarianLabelProdi[] = ['baku', 'ringkas', 'kartu', 'header', 'sidebar', 'chip', 'daftar', 'vertikal'];

export function Baku() {
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 560 }}>
      {P.slice(0, 3).map((p, i) => (
        <LabelProdi key={i} prodi={p} />
      ))}
    </div>
  );
}

export function SemuaVarian() {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {VARIAN.map((v) => (
        <div key={v} style={{ display: 'grid', gap: 6 }}>
          <code style={{ fontSize: 12, color: 'var(--u-muted-foreground)' }}>varian=&quot;{v}&quot;</code>
          {v === 'vertikal' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(12rem, 1fr))', gap: 12 }}>
              {P.slice(0, 3).map((p, i) => (
                <LabelProdi key={i} prodi={p} varian="vertikal" />
              ))}
            </div>
          ) : v === 'daftar' ? (
            <div style={{ display: 'grid', maxWidth: 560, border: '1px solid var(--u-border)', borderRadius: 12, padding: 4 }}>
              {P.slice(0, 3).map((p, i) => (
                <LabelProdi key={i} prodi={p} varian="daftar" onClick={() => {}} />
              ))}
            </div>
          ) : v === 'chip' ? (
            <p style={{ margin: 0, lineHeight: 2.2 }}>
              Mahasiswa dari {P.slice(0, 2).map((p, i) => (
                <React.Fragment key={i}>
                  <LabelProdi prodi={p} varian="chip" />{' '}
                </React.Fragment>
              ))}
              mengikuti kegiatan ini.
            </p>
          ) : v === 'sidebar' ? (
            <div style={{ width: 248, padding: 12, border: '1px solid var(--u-border)', borderRadius: 12, background: 'var(--u-surface)' }}>
              <LabelProdi prodi={P[0]} varian="sidebar" />
            </div>
          ) : (
            <div style={{ maxWidth: v === 'header' ? 720 : 560 }}>
              <LabelProdi prodi={P[0]} varian={v} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function Ukuran() {
  const [bentuk, setBentuk] = React.useState<'kotak' | 'bulat'>('kotak');
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <SegmentedControl value={bentuk} onValueChange={(v) => setBentuk(v as 'kotak' | 'bulat')} options={[{ value: 'kotak', label: 'Logo kotak' }, { value: 'bulat', label: 'Logo bulat' }]} aria-label="Bentuk logo" />
      {(['sm', 'md', 'lg'] as const).map((u) => (
        <LabelProdi key={u} prodi={P[1]} ukuran={u} bentukLogo={bentuk} />
      ))}
    </div>
  );
}

export function Statistik() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(16rem, 1fr))', gap: 12 }}>
      <LabelProdi prodi={P[0]} varian="kartu" statistik={{ mahasiswa: 412, dosen: 18 }} />
      <LabelProdi prodi={P[1]} varian="vertikal" statistik={{ mahasiswa: 1260, dosen: 32 }} />
    </div>
  );
}
