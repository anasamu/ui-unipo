import * as React from 'react';
import { Button, Card, CardContent } from 'unipo-ui';
import { AlurStatus, FormulirSkema, KelolaSumber, WizardSumber, useFormulirSkema, useSumber, validasiNilai, type Skema } from 'unipo-ui/katalog';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Formulir & aturan backend',
  category: 'Fitur API',
  layout: 'wide',
  order: 2,
  badge: 'baru',
  description:
    'Formulir, wizard, dan alur status dibangun dari skema endpoint. Aturan validasinya cermin PusatData\\Aturan di backend (teks:N, kode:N, enum, int:min:max, tanggal, waktu, jam, email, url, telepon, json, ref, wajib) dengan pesan galat yang sama, dan aksi alur kerja mengikuti "Status harus A, menjadi B".',
  importLine: "import { FormulirSkema, useFormulirSkema, WizardSumber, AlurStatus, validasiNilai } from 'unipo-ui/katalog';",
  demos: { Formulir: 'Formulir dari skema (program beasiswa)', Wizard: 'Wizard bertahap (peminjaman ruang)', Alur: 'Alur status dan aksi', Kelola: 'Kelola satu sumber data', Aturan: 'Aturan validasi = backend' },
};

export function Formulir() {
  const st = useSumber('/v1/kemahasiswaan/beasiswa');
  const skema = st.op(st.sumber?.create)?.b?.s;
  const form = useFormulirSkema(skema);
  const [hasil, setHasil] = React.useState<string>('');
  if (!skema) return <p>Memuat katalog…</p>;
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <FormulirSkema skema={skema} form={form} />
      <div style={{ display: 'flex', gap: '.5rem' }}>
        <Button onClick={() => { const b = form.kirim(); setHasil(b ? JSON.stringify(b, null, 2) : ''); }}>Periksa & bentuk body</Button>
        <Button variant="ghost" onClick={form.reset}>Atur ulang</Button>
      </div>
      {hasil && <pre className="u-nilai-json">{hasil}</pre>}
    </div>
  );
}

export function Wizard() {
  const [selesai, setSelesai] = React.useState<Record<string, unknown> | null>(null);
  if (selesai) return <Card><CardContent>Terkirim dengan ID {String(selesai.id)}. <Button variant="ghost" size="sm" onClick={() => setSelesai(null)}>Ajukan lagi</Button></CardContent></Card>;
  return <WizardSumber sumber="/v1/sarpras/peminjaman" title="Ajukan peminjaman ruang" description="Isian dibagi per langkah dari skema API." onSelesai={setSelesai} />;
}

export function Alur() {
  const st = useSumber('/v1/kemahasiswaan/beasiswa');
  const [status, setStatus] = React.useState('buka');
  const aksi = (st.sumber?.actions ?? []).map((a) => st.op(a)!).filter(Boolean);
  const e = (st.skemaBaris?.pr?.status?.e ?? []).map(String);
  return (
    <div style={{ display: 'grid', gap: '.75rem' }}>
      <AlurStatus status={e} sekarang={status} aksi={aksi} skemaBaris={st.skemaBaris} />
      <div style={{ display: 'flex', gap: '.375rem', flexWrap: 'wrap' }}>
        {e.map((s) => <Button key={s} size="sm" variant={s === status ? 'primary' : 'outline'} onClick={() => setStatus(s)}>{s}</Button>)}
      </div>
    </div>
  );
}

export function Kelola() {
  return <KelolaSumber sumber="/v1/kemahasiswaan/beasiswa" />;
}

const CONTOH: Array<[string, Skema, unknown]> = [
  ['kode', { t: 'string', max: 40, p: '^[A-Za-z0-9._\\-/]+$' }, 'BEA 2026'],
  ['kuota', { t: 'integer', min: 1, mx: 100000 }, 0],
  ['jenis', { t: 'string', e: ['prestasi', 'ekonomi'] }, 'lainnya'],
  ['daftar_mulai', { t: 'string', f: 'date' }, '2026-02-30'],
  ['email', { t: 'string', f: 'email' }, 'anas@'],
  ['jam_mulai', { t: 'string', p: '^\\d{2}:\\d{2}$' }, '25:00'],
  ['mitra_id', { t: 'integer', ds: 'ID di kerjasama_mitra' }, 'abc'],
];
export function Aturan() {
  return (
    <div className="u-table-wrap">
    <table className="u-table" style={{ width: '100%' }}>
      <thead><tr><th>Kolom</th><th>Nilai</th><th>Galat (sama dengan respons 422)</th></tr></thead>
      <tbody>
        {CONTOH.map(([k, s, v]) => <tr key={k}><td className="u-mono">{k}</td><td className="u-mono">{JSON.stringify(v)}</td><td>{validasiNilai(k, s, v) ?? 'lolos'}</td></tr>)}
      </tbody>
    </table>
    </div>
  );
}
