import { AppLogo, APP_GLYPHS, LogoAplikasi, UnipoAppLogo, UnipoMark, type UnipoApp } from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Logo aplikasi',
  category: 'Identitas',
  layout: 'wide',
  description: 'Logo vektor yang mengikuti tema, dengan banyak varian: bentuk tanda, tata letak, nada warna, ukuran, dan logo siap pakai untuk tiap aplikasi di ekosistem UNIPO. Logo resmi bisa dipasang lewat prop src.',
  importLine: "import { AppLogo, UnipoAppLogo, UnipoMark } from 'unipo-ui';",
  demos: {
    Bentuk: 'Bentuk tanda',
    TataLetak: 'Tata letak',
    Nada: 'Nada warna',
    Ekosistem: 'Logo tiap aplikasi',
    Terdaftar: 'LogoAplikasi: logo aplikasi yang terdaftar di Pustikom',
    Gambar: 'Logo unggahan: bentuk, nada, dan tata letak',
  },
  props: [
    ['layout', "'horizontal' | 'stacked' | 'mark' | 'wordmark'", 'Susunan tanda dan teks.'],
    ['shape', "'square' | 'circle' | 'shield' | 'plain'", 'Bentuk tanda.'],
    ['tone', "'brand' | 'mono' | 'inverse'", 'inverse untuk latar gelap/berwarna.'],
    ['size', "'sm' | 'md' | 'lg' | 'xl'", 'Ukuran tanda 24/32/40/56 px.'],
    ['src', 'string', 'Gambar logo resmi. Dipotong mengikuti shape dan tone; layout="full" menampilkan gambar utuh tanpa teks.'],
    ['color', 'string', 'Warna tanda vektor, atau warna pelat di belakang logo gambar (cocok untuk PNG transparan).'],
    ['fit', "'cover' | 'contain'", 'Logo gambar memenuhi bentuk (cover) atau utuh dengan jarak (contain).'],
    ['LogoAplikasi.kode', 'string', 'Kode aplikasi di Pustikom. Logo diambil dari src, lalu logo publik klien SSO (/logos/<client_id>.png).'],
    ['LogoAplikasi.ssoUrl', 'string | null', 'Bawaan https://sso.unipo.ac.id; null = hanya memakai src.'],
  ],
  notes: [
    'Urutan logo LogoAplikasi: prop src (mis. aplikasi.logo dari useAplikasiTerpadu), logo unggahan klien SSO, glyph bawaan aplikasi UNIPO, lalu inisial nama dengan warna tetap per kode. Logo yang sudah dicek disimpan selama sesi.',
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

const svg = (isi: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${isi}</svg>`)}`;
const LOGO_KULIAHKU = svg('<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8a3d"/><stop offset="1" stop-color="#e0306b"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><path d="M18 20h8v24h-8zM30 32l14-12h10L39 33l16 11H44z" fill="#fff"/>');
const LOGO_PERPUS = svg('<path d="M10 14c8-3 15-3 22 2 7-5 14-5 22-2v36c-8-3-15-3-22 2-7-5-14-5-22-2z" fill="#0f8a6a"/><path d="M32 16v36" stroke="#fff" stroke-width="3"/>');
const LOGO_PENUH = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 64"><rect width="64" height="64" rx="14" fill="#1d4ed8"/><circle cx="32" cy="32" r="14" fill="none" stroke="#fff" stroke-width="5"/><circle cx="32" cy="32" r="4" fill="#fbbf24"/><text x="78" y="30" font-family="Arial,sans-serif" font-size="22" font-weight="800" fill="#1d4ed8">SIPEKA</text><text x="78" y="50" font-family="Arial,sans-serif" font-size="12" fill="#64748b">Pelaporan Kinerja</text></svg>')}`;

export function Terdaftar() {
  return (
    <div className="demo-grid" style={{ ['--min' as string]: '13rem' }}>
      <div className="u-card" data-variant="flat" style={{ padding: 16 }}>
        <LogoAplikasi kode="kuliahku" name="KuliahKu" src={LOGO_KULIAHKU} ssoUrl={null} />
      </div>
      <div className="u-card" data-variant="flat" style={{ padding: 16 }}>
        <LogoAplikasi kode="perpus" name="Perpustakaan" src={LOGO_PERPUS} color="#e8f5ef" ssoUrl={null} />
      </div>
      <div className="u-card" data-variant="flat" style={{ padding: 16 }}>
        <LogoAplikasi kode="pmb" ssoUrl={null} />
      </div>
      <div className="u-card" data-variant="flat" style={{ padding: 16 }}>
        <LogoAplikasi kode="sipeka" name="Sistem Pelaporan Kinerja" ssoUrl={null} />
      </div>
    </div>
  );
}

export function Gambar() {
  return (
    <div style={{ display: 'grid', gap: 28 }}>
      <div className="demo-row" style={{ gap: 24 }}>
        <AppLogo layout="mark" size="xl" src={LOGO_KULIAHKU} shape="square" name="KuliahKu" />
        <AppLogo layout="mark" size="xl" src={LOGO_KULIAHKU} shape="circle" name="KuliahKu" />
        <AppLogo layout="mark" size="xl" src={LOGO_KULIAHKU} shape="shield" name="KuliahKu" />
        <AppLogo layout="mark" size="xl" src={LOGO_PERPUS} shape="square" color="#e8f5ef" name="Perpustakaan" />
        <AppLogo layout="mark" size="xl" src={LOGO_PERPUS} shape="plain" name="Perpustakaan" />
      </div>
      <div className="demo-row" style={{ gap: 40, alignItems: 'center' }}>
        <AppLogo src={LOGO_KULIAHKU} name="KuliahKu" tagline="Universitas Pohuwato" size="lg" />
        <AppLogo src={LOGO_KULIAHKU} name="KuliahKu" tagline="Universitas Pohuwato" layout="stacked" size="lg" shape="circle" />
        <AppLogo src={LOGO_PENUH} name="Logo penuh" layout="full" size="xl" />
      </div>
      <div className="demo-grid" style={{ ['--min' as string]: '14rem' }}>
        <div className="u-card" style={{ padding: 20 }}>
          <AppLogo src={LOGO_KULIAHKU} name="KuliahKu" tagline="Nada brand" />
        </div>
        <div className="u-card" style={{ padding: 20 }}>
          <AppLogo src={LOGO_KULIAHKU} name="KuliahKu" tagline="Nada mono" tone="mono" />
        </div>
        <div className="u-card" style={{ padding: 20, background: '#0d1220', borderColor: 'transparent' }}>
          <AppLogo src={LOGO_PERPUS} name="Perpustakaan" tagline="Nada inverse" tone="inverse" />
        </div>
      </div>
    </div>
  );
}
