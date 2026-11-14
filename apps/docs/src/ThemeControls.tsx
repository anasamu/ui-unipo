import * as React from 'react';
import { Palette, RotateCcw } from 'lucide-react';
import { Button, CodeBlock, Popover, SegmentedControl, Select } from 'unipo-ui';

const PRIMARY = [
  { name: 'Biru UNIPO', value: '' },
  { name: 'Hijau toska', value: '#0f766e' },
  { name: 'Marun', value: '#9f1d35' },
  { name: 'Hijau', value: '#15803d' },
  { name: 'Ungu', value: '#6d28d9' },
  { name: 'Grafit', value: '#334155' },
];
const SECONDARY = [
  { name: 'Emas', value: '' },
  { name: 'Jingga', value: '#f97316' },
  { name: 'Biru langit', value: '#38bdf8' },
  { name: 'Hijau limau', value: '#a3e635' },
];
const FONT: Record<string, { label: string; css: string }> = {
  bawaan: { label: 'Plus Jakarta Sans (bawaan)', css: '' },
  sistem: { label: 'Huruf sistem', css: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  serif: { label: 'Serif', css: 'Georgia, "Times New Roman", serif' },
  mono: { label: 'Monospace', css: '"JetBrains Mono Variable", ui-monospace, monospace' },
};

interface Tema {
  primary: string;
  secondary: string;
  radius: string;
  font: string;
  teks: string;
}
const BAWAAN: Tema = { primary: '', secondary: '', radius: '', font: 'bawaan', teks: '' };
const KUNCI = 'unipo-ui-docs-tema';

function baca(): Tema {
  try {
    const p = new URLSearchParams(location.search);
    const dariUrl = { primary: p.get('primary') ?? undefined, secondary: p.get('secondary') ?? undefined };
    return { ...BAWAAN, ...JSON.parse(localStorage.getItem(KUNCI) ?? '{}'), ...Object.fromEntries(Object.entries(dariUrl).filter(([, v]) => v)) };
  } catch {
    return BAWAAN;
  }
}

/** Variabel CSS yang berubah dari bawaan. */
function variabel(t: Tema): Array<[string, string]> {
  return [
    ['--u-primary', t.primary],
    ['--u-secondary', t.secondary],
    ['--u-radius', t.radius],
    ['--u-font-sans', FONT[t.font]?.css ?? ''],
    ['--u-text-base', t.teks],
  ].filter(([, v]) => v) as Array<[string, string]>;
}

function kodeTema(t: Tema) {
  const v = variabel(t);
  const scss: string[] = [];
  if (t.primary) scss.push(`$u-primary: ${t.primary}`);
  if (t.secondary) scss.push(`$u-secondary: ${t.secondary}`);
  if (t.radius) scss.push(`$u-radius-base: ${t.radius}`);
  if (FONT[t.font]?.css) scss.push(`$u-font-sans: string.unquote('${FONT[t.font]!.css}')`);
  if (t.teks) scss.push(`$u-text-base: ${t.teks}`);
  return [
    { label: 'CSS', language: 'css' as const, code: v.length ? `:root {\n${v.map(([k, x]) => `  ${k}: ${x};`).join('\n')}\n}` : '/* Tema bawaan: belum ada yang diubah. */' },
    { label: 'SCSS', language: 'scss' as const, code: scss.length ? `@use 'sass:string';\n@use 'unipo-ui/scss' with (\n${scss.map((x) => `  ${x}`).join(',\n')}\n);` : "@use 'unipo-ui/scss';" },
  ];
}

/**
 * Studio tema: warna primer/sekunder (pilihan atau warna bebas), sudut, huruf, dan ukuran teks. Diterapkan langsung
 * ke seluruh halaman lewat variabel CSS, disimpan di browser, dan kodenya bisa disalin (CSS atau SCSS).
 */
export function ThemeControls() {
  const [t, setT] = React.useState<Tema>(baca);
  const set = (k: keyof Tema, v: string) => setT((x) => ({ ...x, [k]: v }));
  React.useEffect(() => {
    const s = document.documentElement.style;
    for (const k of ['--u-primary', '--u-secondary', '--u-radius', '--u-font-sans', '--u-text-base']) s.removeProperty(k);
    for (const [k, v] of variabel(t)) s.setProperty(k, v);
    try {
      localStorage.setItem(KUNCI, JSON.stringify(t));
    } catch {
      /* penyimpanan browser tidak tersedia */
    }
  }, [t]);
  const ubah = variabel(t).length > 0;
  return (
    <Popover
      align="end"
      width={340}
      title="Atur tema"
      description="Berlaku langsung ke semua contoh di halaman ini."
      trigger={
        <Button variant={ubah ? 'soft' : 'ghost'} size="sm" aria-label="Atur tema">
          <Palette /> <span className="docs-hide-sm">Tema</span>
        </Button>
      }
    >
      <div className="docs-theme">
        <span className="u-label">Warna primer</span>
        <div className="docs-swatches">
          {PRIMARY.map((c) => (
            <button
              key={c.name}
              type="button"
              title={c.name}
              aria-label={c.name}
              aria-pressed={t.primary === c.value}
              style={{ background: c.value || '#244ce6' }}
              onClick={() => set('primary', c.value)}
            />
          ))}
          <label className="docs-color" title="Warna bebas">
            <input type="color" value={t.primary || '#244ce6'} onChange={(e) => set('primary', e.target.value)} aria-label="Warna primer bebas" />
          </label>
        </div>
        <span className="u-label">Warna sekunder</span>
        <div className="docs-swatches">
          {SECONDARY.map((c) => (
            <button
              key={c.name}
              type="button"
              title={c.name}
              aria-label={c.name}
              aria-pressed={t.secondary === c.value}
              style={{ background: c.value || '#f2b42a' }}
              onClick={() => set('secondary', c.value)}
            />
          ))}
          <label className="docs-color" title="Warna bebas">
            <input type="color" value={t.secondary || '#f2b42a'} onChange={(e) => set('secondary', e.target.value)} aria-label="Warna sekunder bebas" />
          </label>
        </div>
        <span className="u-label">Sudut</span>
        <SegmentedControl
          fullWidth
          value={t.radius || 'bawaan'}
          onValueChange={(v) => set('radius', v === 'bawaan' ? '' : v)}
          options={[
            { value: '0rem', label: 'Siku' },
            { value: '0.3rem', label: 'Tegas' },
            { value: 'bawaan', label: 'Bawaan' },
            { value: '1rem', label: 'Bulat' },
          ]}
        />
        <span className="u-label">Ukuran teks isi</span>
        <SegmentedControl
          fullWidth
          value={t.teks || 'bawaan'}
          onValueChange={(v) => set('teks', v === 'bawaan' ? '' : v)}
          options={[
            { value: '0.8125rem', label: '13 px' },
            { value: 'bawaan', label: '14 px' },
            { value: '0.9375rem', label: '15 px' },
            { value: '1rem', label: '16 px' },
          ]}
        />
        <span className="u-label">Huruf</span>
        <Select size="sm" value={t.font} onValueChange={(v) => set('font', v ?? 'bawaan')} options={Object.entries(FONT).map(([value, f]) => ({ value, label: f.label }))} aria-label="Huruf" />
        <CodeBlock tabs={kodeTema(t)} windowControls={false} lineNumbers={false} maxHeight={180} wrap className="docs-theme-code" />
        <Button variant="outline" size="sm" disabled={!ubah} onClick={() => setT(BAWAAN)}>
          <RotateCcw /> Kembali ke tema bawaan
        </Button>
      </div>
    </Popover>
  );
}
