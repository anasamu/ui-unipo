import * as React from 'react';
import { Palette } from 'lucide-react';
import { Button, Popover, SegmentedControl } from 'unipo-ui';

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

/** Contoh nyata mengganti tema saat runtime: cukup ubah --u-primary / --u-secondary / --u-radius. */
export function ThemeControls() {
  const [primary, setPrimary] = React.useState('');
  const [secondary, setSecondary] = React.useState('');
  const [radius, setRadius] = React.useState('default');
  React.useEffect(() => {
    const s = document.documentElement.style;
    primary ? s.setProperty('--u-primary', primary) : s.removeProperty('--u-primary');
    secondary ? s.setProperty('--u-secondary', secondary) : s.removeProperty('--u-secondary');
    radius === 'default' ? s.removeProperty('--u-radius') : s.setProperty('--u-radius', radius);
  }, [primary, secondary, radius]);
  return (
    <Popover
      align="end"
      width={280}
      title="Coba tema"
      description="Mengubah --u-primary, --u-secondary, dan --u-radius di :root."
      trigger={
        <Button variant="ghost" size="sm" iconOnly aria-label="Atur tema">
          <Palette />
        </Button>
      }
    >
      <div className="docs-theme">
        <span className="u-label">Primer</span>
        <div className="docs-swatches">
          {PRIMARY.map((c) => (
            <button key={c.name} type="button" title={c.name} aria-label={c.name} aria-pressed={primary === c.value} style={{ background: c.value || '#244ce6' }} onClick={() => setPrimary(c.value)} />
          ))}
        </div>
        <span className="u-label">Sekunder</span>
        <div className="docs-swatches">
          {SECONDARY.map((c) => (
            <button key={c.name} type="button" title={c.name} aria-label={c.name} aria-pressed={secondary === c.value} style={{ background: c.value || '#f2b42a' }} onClick={() => setSecondary(c.value)} />
          ))}
        </div>
        <span className="u-label">Sudut</span>
        <SegmentedControl
          fullWidth
          value={radius}
          onValueChange={setRadius}
          options={[
            { value: '0.25rem', label: 'Tegas' },
            { value: 'default', label: 'Bawaan' },
            { value: '1rem', label: 'Bulat' },
          ]}
        />
      </div>
    </Popover>
  );
}
