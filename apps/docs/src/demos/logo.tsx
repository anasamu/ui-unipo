import { AppLogo, APP_GLYPHS, UnipoAppLogo, UnipoMark, type UnipoApp } from '@unipo/ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Logo aplikasi',
  category: 'Identitas',
  layout: 'wide',
  description: 'Logo vektor yang mengikuti tema, dengan banyak varian: bentuk tanda, tata letak, nada warna, ukuran, dan logo siap pakai untuk tiap aplikasi di ekosistem UNIPO. Logo resmi bisa dipasang lewat prop src.',
  importLine: "import { AppLogo, UnipoAppLogo, UnipoMark } from '@unipo/ui';",
  demos: { Bentuk: 'Bentuk tanda', TataLetak: 'Tata letak', Nada: 'Nada warna', Ekosistem: 'Logo tiap aplikasi' },
  props: [
    ['layout', "'horizontal' | 'stacked' | 'mark' | 'wordmark'", 'Susunan tanda dan teks.'],
    ['shape', "'square' | 'circle' | 'shield' | 'plain'", 'Bentuk tanda.'],
    ['tone', "'brand' | 'mono' | 'inverse'", 'inverse untuk latar gelap/berwarna.'],
    ['size', "'sm' | 'md' | 'lg' | 'xl'", 'Ukuran tanda 24/32/40/56 px.'],
    ['src', 'string', 'Gambar logo resmi, menggantikan tanda vektor.'],
  ],
};

export function Bentuk() {
  return (
    <div className="demo-row" style={{ gap: 24 }}>
      <UnipoMark size={56} shape="square" />
      <UnipoMark size={56} shape="circle" />
      <UnipoMark size={56} shape="shield" />
      <UnipoMark size={56} shape="plain" />
    </div>
  );
}

export function TataLetak() {
  return (
    <div className="demo-row" style={{ gap: 40, alignItems: 'center' }}>
      <AppLogo name="UNIPO" tagline="Universitas Pohuwato" size="lg" />
      <AppLogo name="UNIPO" tagline="Universitas Pohuwato" layout="stacked" size="lg" shape="shield" />
      <AppLogo name="UNIPO" layout="mark" size="lg" shape="circle" />
      <AppLogo name="Universitas Pohuwato" layout="wordmark" size="lg" />
    </div>
  );
}

export function Nada() {
  return (
    <div className="demo-grid" style={{ ['--min' as string]: '14rem' }}>
      <div className="u-card" style={{ padding: 20 }}><AppLogo tagline="Universitas Pohuwato" /></div>
      <div className="u-card" style={{ padding: 20, color: 'var(--u-foreground)' }}><AppLogo tagline="Universitas Pohuwato" tone="mono" /></div>
      <div className="u-card" style={{ padding: 20, background: 'var(--u-primary)', borderColor: 'transparent' }}><AppLogo tagline="Universitas Pohuwato" tone="inverse" /></div>
      <div className="u-card" style={{ padding: 20, background: '#0d1220', borderColor: 'transparent' }}><AppLogo tagline="Universitas Pohuwato" tone="inverse" shape="shield" /></div>
    </div>
  );
}

export function Ekosistem() {
  return (
    <div className="demo-grid" style={{ ['--min' as string]: '13rem' }}>
      {(Object.keys(APP_GLYPHS) as UnipoApp[]).map((app) => (
        <div key={app} className="u-card" data-variant="flat" style={{ padding: 16 }}>
          <UnipoAppLogo app={app} />
        </div>
      ))}
    </div>
  );
}
