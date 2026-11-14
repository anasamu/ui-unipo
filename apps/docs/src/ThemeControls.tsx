import * as React from 'react';
import { ExternalLink, Palette, RotateCcw } from 'lucide-react';
import { Button, CodeBlock, Popover, SegmentedControl, Select } from 'unipo-ui';
import { FONT, NETRAL, PRESET_TEMA, TEMA_BAWAAN, buatTema, opsiDariParam, paramTema, urlGoogleFont, type OpsiTema } from 'unipo-ui/tema';

const PRIMARY = ['#244ce6', '#0f766e', '#9f1d35', '#15803d', '#6d28d9', '#334155'];
const SECONDARY = ['#f2b42a', '#f97316', '#38bdf8', '#a3e635', '#ec4899'];
const KUNCI = 'unipo-ui-docs-tema-v2';

function baca(): OpsiTema {
  try {
    const simpan = JSON.parse(localStorage.getItem(KUNCI) ?? '{}');
    const url = opsiDariParam(location.search);
    const dariUrl = Object.fromEntries(Object.entries(url).filter(([k, v]) => new URLSearchParams(location.search).has(k) && v !== undefined));
    return { ...TEMA_BAWAAN, ...simpan, ...dariUrl };
  } catch {
    return TEMA_BAWAAN;
  }
}

/** Pasang CSS tema ke <style> milik studio; kosongkan bila tema bawaan. */
function terapkan(t: OpsiTema) {
  let el = document.getElementById('unipo-tema-studio') as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = 'unipo-tema-studio';
    // Sebelum CSS kustom dari pembuat tema (bila ada), agar kiriman halaman induk tetap menang.
    document.head.insertBefore(el, document.getElementById('unipo-tema-kustom'));
  }
  const bawaan = !paramTema(t);
  el.textContent = bawaan ? '' : buatTema({ ...t, muatFont: false });
  const font = bawaan ? '' : urlGoogleFont(t);
  let link = document.getElementById('unipo-tema-font') as HTMLLinkElement | null;
  if (font && !link) {
    link = document.createElement('link');
    link.id = 'unipo-tema-font';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  if (link && link.href !== font) font ? (link.href = font) : link.remove();
}

/**
 * Studio tema ringkas: preset, warna primer/sekunder, netral, sudut, huruf, ukuran teks, bayangan. Berlaku ke seluruh
 * halaman, tersimpan di browser, dan CSS lengkapnya bisa disalin. Pengaturan lengkap + CSS siap impor ada di
 * pembuat tema api.unipo.ac.id/docs/tema.
 */
export function ThemeControls() {
  const [t, setT] = React.useState<OpsiTema>(baca);
  const set = <K extends keyof OpsiTema>(k: K, v: OpsiTema[K]) => setT((x) => ({ ...x, [k]: v }));
  React.useEffect(() => {
    terapkan(t);
    try {
      localStorage.setItem(KUNCI, JSON.stringify(t));
    } catch {
      /* penyimpanan browser tidak tersedia */
    }
  }, [t]);
  const q = paramTema(t);
  const ubah = q.length > 0;
  return (
    <Popover
      align="end"
      width={360}
      title="Atur tema"
      description="Berlaku langsung ke semua contoh di halaman ini."
      trigger={
        <Button variant={ubah ? 'soft' : 'ghost'} size="sm" aria-label="Atur tema">
          <Palette /> <span className="docs-hide-sm">Tema</span>
        </Button>
      }
    >
      <div className="docs-theme">
        <span className="u-label">Preset</span>
        <div className="docs-preset">
          {PRESET_TEMA.map((p) => (
            <button key={p.nama} type="button" onClick={() => setT({ ...TEMA_BAWAAN, ...p.opsi })} aria-pressed={paramTema({ ...TEMA_BAWAAN, ...p.opsi }) === q}>
              <span style={{ background: p.opsi.primary ?? TEMA_BAWAAN.primary }} />
              <span style={{ background: p.opsi.secondary ?? TEMA_BAWAAN.secondary }} />
              {p.nama}
            </button>
          ))}
        </div>
        <span className="u-label">Warna primer</span>
        <div className="docs-swatches">
          {PRIMARY.map((c) => (
            <button key={c} type="button" title={c} aria-label={`Primer ${c}`} aria-pressed={t.primary === c} style={{ background: c }} onClick={() => set('primary', c)} />
          ))}
          <label className="docs-color" title="Warna bebas">
            <input type="color" value={t.primary} onChange={(e) => set('primary', e.target.value)} aria-label="Warna primer bebas" />
          </label>
        </div>
        <span className="u-label">Warna sekunder</span>
        <div className="docs-swatches">
          {SECONDARY.map((c) => (
            <button key={c} type="button" title={c} aria-label={`Sekunder ${c}`} aria-pressed={t.secondary === c} style={{ background: c }} onClick={() => set('secondary', c)} />
          ))}
          <label className="docs-color" title="Warna bebas">
            <input type="color" value={t.secondary} onChange={(e) => set('secondary', e.target.value)} aria-label="Warna sekunder bebas" />
          </label>
        </div>
        <div className="docs-theme-dua">
          <div>
            <span className="u-label">Netral</span>
            <Select size="sm" value={t.netral} onValueChange={(v) => v && set('netral', v)} options={Object.entries(NETRAL).map(([value, n]) => ({ value: value as OpsiTema['netral'], label: n.label }))} aria-label="Netral" />
          </div>
          <div>
            <span className="u-label">Huruf</span>
            <Select size="sm" value={t.font} onValueChange={(v) => v && set('font', v)} options={Object.entries(FONT).map(([value, f]) => ({ value: value as OpsiTema['font'], label: f.label }))} aria-label="Huruf" />
          </div>
        </div>
        <span className="u-label">Sudut</span>
        <SegmentedControl
          fullWidth
          value={String(t.radius)}
          onValueChange={(v) => set('radius', Number(v))}
          options={[
            { value: '0', label: 'Siku' },
            { value: '5', label: 'Tegas' },
            { value: '10', label: 'Bawaan' },
            { value: '16', label: 'Bulat' },
          ]}
        />
        <span className="u-label">Ukuran teks isi</span>
        <SegmentedControl fullWidth value={String(t.teks)} onValueChange={(v) => set('teks', Number(v))} options={[13, 14, 15, 16].map((n) => ({ value: String(n), label: `${n} px` }))} />
        <span className="u-label">Bayangan</span>
        <SegmentedControl
          fullWidth
          value={t.bayangan}
          onValueChange={(v) => set('bayangan', v as OpsiTema['bayangan'])}
          options={[
            { value: 'tanpa', label: 'Tanpa' },
            { value: 'halus', label: 'Halus' },
            { value: 'normal', label: 'Normal' },
            { value: 'tegas', label: 'Tegas' },
          ]}
        />
        <CodeBlock code={buatTema(t)} language="css" filename="unipo-tema.css" windowControls={false} lineNumbers={false} maxHeight={180} className="docs-theme-code" />
        <div className="docs-theme-aksi">
          <Button variant="outline" size="sm" disabled={!ubah} onClick={() => setT(TEMA_BAWAAN)}>
            <RotateCcw /> Bawaan
          </Button>
          <Button variant="soft" size="sm" render={<a href={`https://api.unipo.ac.id/docs/tema${q ? `?${q}` : ''}`} target="_blank" rel="noreferrer" />}>
            <ExternalLink /> Pembuat tema lengkap
          </Button>
        </div>
      </div>
    </Popover>
  );
}
