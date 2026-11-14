import * as React from 'react';
import { Tabs } from 'unipo-ui';
import { HalamanModul, INDEKS_KATALOG } from './impor';

/** Semua modul satu grup katalog sebagai tab, masing-masing halaman modul lengkap (server tiruan dari katalog). */
export function FiturGrup({ grup }: { grup: string }) {
  const modul = INDEKS_KATALOG.modul.filter((m) => m.group === grup);
  const [aktif, setAktif] = React.useState(modul[0]?.key ?? '');
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Tabs variant="pill" items={modul.map((m) => ({ value: m.key, label: m.title }))} value={aktif} onValueChange={setAktif} />
      <HalamanModul key={aktif} modul={aktif} />
    </div>
  );
}
