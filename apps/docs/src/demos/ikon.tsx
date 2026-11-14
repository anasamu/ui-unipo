import * as React from 'react';
import { Bell, CalendarDays, Wallet } from 'lucide-react';
import { IKON_UNIPO, IkonKotak, Input, type NadaIkon } from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Ikon',
  category: 'Fondasi',
  layout: 'wide',
  order: 41,
  badge: 'baru',
  description:
    'unipo-ui/ikon berisi semua ikon lucide (1.700+, garis modern) ditambah ikon khas kampus yang tidak ada di pustaka umum: KTM, KRS, KHS, SKS, ijazah, toga, skripsi, UKT, beasiswa, yudisium, presensi QR, akreditasi, ormawa, KKN, penelitian, surat, tanda tangan elektronik, sinkron PDDikti, dan lainnya. Tidak perlu memasang paket ikon lain. IkonKotak membungkus ikon dalam kotak bergaya clay (timbul lembut) dengan warna per fitur.',
  importLine: "import { Bell, IkonKrs, IkonKotak } from 'unipo-ui/ikon';",
  demos: { Khas: 'Ikon khas kampus (garis dan duotone)', Kotak: 'Kotak ikon: gaya dan warna' },
  props: [
    ['size / strokeWidth', 'number', 'Sama dengan lucide.'],
    ['duo', 'boolean', 'Isi lembut warna kedua (duotone).'],
    ['<IkonKotak nada gaya ukuran gerak>', '', 'nada: primary…info, biru, indigo, ungu, merah-muda, mawar, oranye, kuning, hijau, toska, langit, abu. gaya: clay, lembut, padat, garis.'],
  ],
};

export function Khas() {
  const [q, setQ] = React.useState('');
  const items = Object.entries(IKON_UNIPO).filter(([n]) => n.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Input placeholder="Cari ikon" value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(8.5rem, 1fr))', gap: '.5rem' }}>
        {items.map(([n, I]) => (
          <div key={n} style={{ display: 'grid', justifyItems: 'center', gap: '.4rem', padding: '1rem .5rem', border: '1px solid var(--u-border)', borderRadius: 'var(--u-radius)' }}>
            <div style={{ display: 'flex', gap: '.75rem', color: 'var(--u-primary)' }}>
              <I />
              <I duo />
            </div>
            <code style={{ fontSize: '.7rem' }}>{n}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

const NADA: NadaIkon[] = ['biru', 'indigo', 'ungu', 'merah-muda', 'mawar', 'oranye', 'kuning', 'hijau', 'toska', 'langit'];
export function Kotak() {
  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {(['clay', 'lembut', 'padat', 'garis'] as const).map((g) => (
        <div key={g} style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <code style={{ width: '4rem' }}>{g}</code>
          {NADA.map((n, i) => (
            <IkonKotak key={n} nada={n} gaya={g} ukuran="lg" gerak={i % 3 === 0 ? 'ayun' : 'angkat'}>
              {i % 3 === 0 ? <Bell /> : i % 3 === 1 ? <Wallet /> : <CalendarDays />}
            </IkonKotak>
          ))}
        </div>
      ))}
    </div>
  );
}
