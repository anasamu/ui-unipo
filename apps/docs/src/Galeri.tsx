import * as React from 'react';
import { Search } from 'lucide-react';
import { Badge, Input, InputGroup } from 'unipo-ui';
import { CATEGORIES, PAGES, type DocPage } from './registry';

/** Pratinjau kecil yang baru dirender saat terlihat, agar puluhan widget tidak dimuat sekaligus. */
function Thumb({ page }: { page: DocPage }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [lihat, setLihat] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && (setLihat(true), io.disconnect()), { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const D = page.demos[0]?.Component;
  return (
    <div ref={ref} className="docs-thumb" aria-hidden inert>
      {lihat && D && (
        <div className="docs-thumb-scale" data-layout={page.meta.layout ?? 'normal'}>
          <D />
        </div>
      )}
    </div>
  );
}

const KHUSUS = new Set(['Mulai']);

/** Semua halaman komponen per kategori, dari komponen dasar sampai widget per fitur, dengan pratinjau langsung. */
export function Galeri({ go }: { go: (slug: string) => void }) {
  const [cari, setCari] = React.useState('');
  const kata = cari.trim().toLowerCase();
  const halaman = PAGES.filter((p) => !KHUSUS.has(p.meta.category) && !p.meta.prose);
  const cocok = (p: DocPage) => !kata || [p.meta.title, p.meta.description, p.meta.importLine ?? '', p.meta.category].some((x) => x.toLowerCase().includes(kata));
  const kategori = CATEGORIES.filter((c) => !KHUSUS.has(c))
    .map((c) => ({ c, items: halaman.filter((p) => p.meta.category === c && cocok(p)) }))
    .filter((x) => x.items.length);
  const jumlahContoh = halaman.reduce((n, p) => n + p.demos.length + (p.meta.playground ? 1 : 0), 0);
  return (
    <div className="docs-galeri">
      <header className="docs-page-header">
        <p className="docs-eyebrow">Mulai</p>
        <h1>Galeri komponen</h1>
        <p className="docs-lead">
          {halaman.length} halaman komponen dalam {kategori.length} kategori dan {jumlahContoh} contoh langsung, mulai dari komponen dasar sampai widget khusus tiap fitur SIAKAD. Buka satu halaman
          untuk melihat kodenya, mengubah props di playground, dan mencoba tema lewat tombol Tema di kanan atas.
        </p>
        <InputGroup start={<Search />} className="docs-galeri-cari">
          <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari komponen, mis. tabel, wizard, log" aria-label="Cari komponen" />
        </InputGroup>
      </header>
      {kategori.map(({ c, items }) => (
        <section key={c} className="docs-galeri-kategori">
          <h2>
            {c} <span>{items.length}</span>
          </h2>
          <div className="docs-galeri-grid">
            {items.map((p) => (
              <a
                key={p.slug}
                href={`#/${p.slug}`}
                className="docs-galeri-kartu"
                onClick={(e) => {
                  e.preventDefault();
                  go(p.slug);
                }}
              >
                <Thumb page={p} />
                <span className="docs-galeri-teks">
                  <strong>
                    {p.meta.title}
                    {p.meta.playground && (
                      <Badge variant="primary" size="md">
                        Playground
                      </Badge>
                    )}
                  </strong>
                  <small>{p.meta.description}</small>
                  <em>{p.demos.length} contoh</em>
                </span>
              </a>
            ))}
          </div>
        </section>
      ))}
      {!kategori.length && <p className="docs-lead">Tidak ada komponen yang cocok dengan “{cari}”.</p>}
    </div>
  );
}
