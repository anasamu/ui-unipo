import * as React from 'react';
import { RotateCcw } from 'lucide-react';
import { Button, CodeBlock, Input, SegmentedControl, Select, Switch } from 'unipo-ui';

export type PlaygroundControl =
  | { name: string; label?: string; type: 'select'; options: string[]; default: string }
  | { name: string; label?: string; type: 'boolean'; default: boolean }
  | { name: string; label?: string; type: 'text'; default: string }
  | { name: string; label?: string; type: 'number'; default: number; min?: number; max?: number; step?: number };

export interface PlaygroundSpec {
  /** Judul bagian (bawaan "Playground"). */
  title?: string;
  controls: PlaygroundControl[];
  render: (p: Record<string, any>) => React.ReactNode;
  /** Kode JSX sesuai pilihan saat ini. */
  code: (p: Record<string, any>) => string;
}

const awal = (c: PlaygroundControl[]): Record<string, any> => Object.fromEntries(c.map((x) => [x.name, x.default]));

/** Atribut JSX dari nilai props; nilai bawaan dilewati agar kode tetap ringkas. */
export function jsxProps(p: Record<string, any>, bawaan: Record<string, any> = {}, lewati: string[] = []): string {
  return Object.entries(p)
    .filter(([k, v]) => !lewati.includes(k) && v !== bawaan[k] && v !== '' && v !== undefined)
    .map(([k, v]) => (v === true ? ` ${k}` : v === false ? ` ${k}={false}` : typeof v === 'number' ? ` ${k}={${v}}` : ` ${k}="${v}"`))
    .join('');
}

/** Pratinjau langsung + panel kontrol props + kode yang ikut berubah. */
export function Playground({ spec, slug }: { spec: PlaygroundSpec; slug: string }) {
  const [p, setP] = React.useState<Record<string, any>>(() => awal(spec.controls));
  const set = (k: string, v: unknown) => setP((x) => ({ ...x, [k]: v }));
  return (
    <section id={`${slug}--playground`} className="docs-demo docs-playground">
      <h2>{spec.title ?? 'Playground'}</h2>
      <div className="docs-playground-grid">
        <div className="docs-preview" data-demo={`${slug}--playground`}>
          <div className="docs-preview-inner">{spec.render(p)}</div>
        </div>
        <form className="docs-playground-controls" onSubmit={(e) => e.preventDefault()} aria-label="Atur props">
          <div className="docs-playground-head">
            <span>Props</span>
            <Button variant="ghost" size="xs" onClick={() => setP(awal(spec.controls))}>
              <RotateCcw /> Atur ulang
            </Button>
          </div>
          {spec.controls.map((c) => (
            <label key={c.name} className="docs-playground-row" data-type={c.type}>
              <span>
                <code>{c.name}</code>
                {c.label && c.label.toLowerCase() !== c.name.toLowerCase() && <small>{c.label}</small>}
              </span>
              {c.type === 'boolean' ? (
                <Switch checked={!!p[c.name]} onCheckedChange={(v) => set(c.name, v)} size="sm" />
              ) : c.type === 'select' ? (
                c.options.length <= 3 && c.options.join('').length <= 18 ? (
                  <SegmentedControl value={p[c.name]} onValueChange={(v) => set(c.name, v)} options={c.options.map((o) => ({ value: o, label: o }))} fullWidth />
                ) : (
                  <Select size="sm" value={p[c.name]} onValueChange={(v) => set(c.name, v)} options={c.options.map((o) => ({ value: o, label: o }))} aria-label={c.name} />
                )
              ) : c.type === 'number' ? (
                <Input size="sm" type="number" value={p[c.name]} min={c.min} max={c.max} step={c.step} onChange={(e) => set(c.name, Number(e.target.value))} />
              ) : (
                <Input size="sm" value={p[c.name]} onChange={(e) => set(c.name, e.target.value)} />
              )}
            </label>
          ))}
        </form>
      </div>
      <CodeBlock code={spec.code(p)} language="tsx" windowControls={false} lineNumbers={false} className="docs-playground-code" />
    </section>
  );
}
