import * as React from 'react';
import { Moon, Sun } from 'lucide-react';

const Github = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
  </svg>
);
import { AppLogo, Badge, Button, CodeBlock, DocsSidebar, Select, TableOfContents, Toaster, Tooltip, TooltipProvider, cn, setelPlatform } from 'unipo-ui';
import { CATEGORIES, PAGES, type DocPage } from './registry';
import { ThemeControls } from './ThemeControls';
import { Playground } from './Playground';
import { Galeri } from './Galeri';
import { PratinjauTema } from './PratinjauTema';

declare const __VERSI_UI__: string;

const EMBED = new URLSearchParams(location.search).has('embed');
/** ?polos: hanya isi halaman (tanpa bilah atas dan sidebar), untuk pratinjau di pembuat tema. */
const POLOS = new URLSearchParams(location.search).has('polos');

function useHashRoute(): [string, (s: string) => void] {
  const read = () => decodeURIComponent(location.hash.replace(/^#\/?/, '')) || (EMBED ? 'galeri' : PAGES[0]?.slug);
  const [slug, setSlug] = React.useState(read);
  React.useEffect(() => {
    const on = () => {
      setSlug(read());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return [slug, (s) => (location.hash = `/${s}`)];
}

function Page({ page }: { page: DocPage }) {
  const { meta } = page;
  const toc = [
    ...(meta.playground ? [{ id: `${page.slug}--playground`, label: meta.playground.title ?? 'Playground' }] : []),
    ...page.demos.map((d) => ({ id: `${page.slug}--${d.name}`, label: d.title })),
  ];
  return (
    <div className="docs-page-grid">
      <article className="docs-article" data-layout={meta.layout ?? 'normal'}>
        <header className="docs-page-header">
          <p className="docs-eyebrow">{meta.category}</p>
          <h1>{meta.title}</h1>
          <p className="docs-lead">{meta.description}</p>
          {meta.importLine && <CodeBlock code={meta.importLine} language="tsx" lineNumbers={false} windowControls={false} theme="auto" />}
        </header>
        {meta.playground && <Playground spec={meta.playground} slug={page.slug} />}
        {page.demos.map((d) =>
          meta.prose ? (
            <section key={d.name} id={`${page.slug}--${d.name}`} className="docs-prose">
              <h2>{d.title}</h2>
              <d.Component />
            </section>
          ) : (
            <section key={d.name} id={`${page.slug}--${d.name}`} className="docs-demo">
              <h2>{d.title}</h2>
              <div className="docs-preview" data-demo={`${page.slug}--${d.name}`}>
                <div className="docs-preview-inner">
                  <d.Component />
                </div>
              </div>
              <details className="docs-code">
                <summary>Lihat kode</summary>
                <CodeBlock code={d.code} language="tsx" windowControls={false} maxHeight={420} />
              </details>
            </section>
          ),
        )}
        {meta.props && (
          <section id={`${page.slug}--props`} className="docs-demo">
            <h2>Props</h2>
            <div className="u-table-wrap">
              <table className="u-table">
                <thead>
                  <tr>
                    <th>Prop</th>
                    <th>Tipe</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {meta.props.map(([n, t, k]) => (
                    <tr key={n}>
                      <td>
                        <code className="u-inline-code">{n}</code>
                      </td>
                      <td className="u-mono" style={{ color: 'var(--u-muted-foreground)' }}>
                        {t}
                      </td>
                      <td>{k}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {meta.notes?.map((n, i) => (
          <p key={i} className="docs-note">
            {n}
          </p>
        ))}
      </article>
      {!meta.prose && toc.length > 1 && (
        <div className="docs-toc">
          <TableOfContents items={[...toc, ...(meta.props ? [{ id: `${page.slug}--props`, label: 'Props' }] : [])]} />
        </div>
      )}
    </div>
  );
}

/** Pratinjau per perangkat: semua komponen mengikuti setelPlatform() (web, desktop, mobile iOS/Android). */
const PERANGKAT = [
  { value: 'auto', label: 'Perangkat: otomatis' },
  { value: 'web', label: 'Web' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile-ios', label: 'Mobile iOS' },
  { value: 'mobile-android', label: 'Mobile Android' },
];
function terapkanPerangkat(v: string) {
  const [platform, os] = v.split('-') as ['auto' | 'web' | 'desktop' | 'mobile', 'ios' | 'android' | undefined];
  setelPlatform({ platform, os: os ?? 'auto' });
  document.documentElement.dataset.docsPerangkat = v;
}
function PilihPerangkat() {
  const [v, setV] = React.useState(() => {
    const p = new URLSearchParams(location.search).get('perangkat');
    let simpan: string | null = null;
    try {
      simpan = localStorage.getItem('docs-perangkat');
    } catch {
      /* penyimpanan diblokir */
    }
    return p ?? simpan ?? 'auto';
  });
  React.useEffect(() => {
    terapkanPerangkat(v);
    try {
      localStorage.setItem('docs-perangkat', v);
    } catch {
      /* abaikan */
    }
  }, [v]);
  React.useEffect(() => {
    // Halaman induk (galeri api.unipo.ac.id) boleh mengganti perangkat pratinjau lewat postMessage.
    const on = (e: MessageEvent) => {
      if (e.origin === location.origin && e.data?.type === 'unipo-ui:perangkat' && typeof e.data.perangkat === 'string') setV(e.data.perangkat);
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, []);
  return <Select size="sm" aria-label="Perangkat pratinjau" options={PERANGKAT} value={v} onValueChange={(x) => setV(x ?? 'auto')} className="docs-perangkat" />;
}

export function App() {
  const [slug, go] = useHashRoute();
  const [dark, setDark] = React.useState(() => matchMedia('(prefers-color-scheme: dark)').matches && !new URLSearchParams(location.search).has('light'));
  React.useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get('theme') === 'dark') setDark(true);
    if (p.get('theme') === 'light') setDark(false);
    // Saat disematkan (iframe), halaman induk dari origin yang sama boleh mengganti tema tanpa memuat ulang.
    const on = (e: MessageEvent) => {
      if (e.origin !== location.origin) return;
      if (e.data?.type === 'unipo-ui:tema') setDark(!!e.data.gelap);
      // CSS tema dari pembuat tema (api.unipo.ac.id/docs/tema): dipasang di <style> paling akhir agar menimpa bawaan.
      if (e.data?.type === 'unipo-ui:css' && typeof e.data.css === 'string') {
        let el = document.getElementById('unipo-tema-kustom') as HTMLStyleElement | null;
        if (!el) {
          el = document.createElement('style');
          el.id = 'unipo-tema-kustom';
          document.head.appendChild(el);
        }
        el.textContent = e.data.css;
      }
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, []);
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  const galeri = slug === 'galeri';
  const pratinjau = slug === 'pratinjau-tema';
  const page = PAGES.find((p) => p.slug === slug) ?? PAGES[0];
  const sections = CATEGORIES.map((c) => ({
    title: c,
    items: [
      ...(c === 'Mulai'
        ? [
            { key: 'galeri', label: 'Galeri komponen', href: '#/galeri' },
            { key: 'pratinjau-tema', label: 'Pratinjau tema', href: '#/pratinjau-tema' },
          ]
        : []),
      ...PAGES.filter((p) => p.meta.category === c).map((p) => ({ key: p.slug, label: p.meta.title, href: `#/${p.slug}`, badge: p.meta.badge })),
    ],
  })).filter((s) => s.items.length);

  return (
    <TooltipProvider>
      <Toaster>
        <div className={cn('u-root', 'docs')} data-embed={EMBED ? '' : undefined} data-polos={POLOS ? '' : undefined}>
          {!POLOS && (
            <header className="docs-topbar">
              {!EMBED && (
                <>
                  <a href="#/" className="docs-brand" onClick={(e) => (e.preventDefault(), go(PAGES[0].slug))}>
                    <AppLogo name="UNIPO UI" tagline="Sistem desain Universitas Pohuwato" />
                  </a>
                  <Badge variant="outline" shape="square">
                    v{__VERSI_UI__}
                  </Badge>
                </>
              )}
              <div className="docs-topbar-actions">
                <PilihPerangkat />
                <ThemeControls />
                <Tooltip content={dark ? 'Mode terang' : 'Mode gelap'}>
                  <Button variant="ghost" size="sm" iconOnly aria-label="Ganti mode warna" onClick={() => setDark(!dark)}>
                    {dark ? <Sun /> : <Moon />}
                  </Button>
                </Tooltip>
                {!EMBED && (
                  <Tooltip content="Repositori">
                    <Button variant="ghost" size="sm" iconOnly aria-label="Repositori GitHub" render={<a href="https://github.com/anasamu/ui-unipo" target="_blank" rel="noreferrer" />}>
                      <Github />
                    </Button>
                  </Tooltip>
                )}
              </div>
            </header>
          )}
          <div className="docs-body">
            {!POLOS && (
              <div className="docs-sidebar">
                <DocsSidebar sections={sections} activeKey={galeri || pratinjau ? slug : page?.slug} />
              </div>
            )}
            <main className="docs-main">{galeri ? <Galeri go={go} /> : pratinjau ? <PratinjauTema /> : page && <Page key={page.slug} page={page} />}</main>
          </div>
        </div>
      </Toaster>
    </TooltipProvider>
  );
}
