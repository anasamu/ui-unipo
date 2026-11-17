'use client';
import * as React from 'react';

/** Atribut tautan yang diteruskan ke `renderLink`: `href`, `className`, `children`, `aria-*`, dan seterusnya. */
export type PropsTautan = React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: React.ReactNode };

/**
 * Cara merender tautan internal tanpa memuat ulang halaman (SPA), mis. react-router:
 * `renderLink={({ href, ...p }) => <Link to={href} {...p} />}`. Tanpa `renderLink`, komponen memakai `<a href>` biasa.
 */
export type RenderLink = (props: PropsTautan) => React.ReactNode;

const KonteksTautan = React.createContext<RenderLink | undefined>(undefined);

/**
 * Pasang sekali di akar aplikasi supaya semua komponen yang mendukung `renderLink` (StatCard, AksiCepat, ActionList,
 * ActivityFeed, Breadcrumb) membuka tautan lewat router. Prop `renderLink` pada komponen tetap didahulukan.
 */
export function PenyediaTautan({ renderLink, children }: { renderLink: RenderLink; children: React.ReactNode }) {
  return <KonteksTautan.Provider value={renderLink}>{children}</KonteksTautan.Provider>;
}

/** `renderLink` yang berlaku: prop komponen, lalu PenyediaTautan, lalu undefined (`<a>` biasa). */
export function useRenderLink(renderLink?: RenderLink): RenderLink | undefined {
  const ctx = React.useContext(KonteksTautan);
  return renderLink ?? ctx;
}

/** `<a>` biasa, atau hasil `renderLink` bila diberikan (lewat prop atau PenyediaTautan). Tautan eksternal tetap `<a>`. */
export function Tautan({ renderLink, ...props }: PropsTautan & { renderLink?: RenderLink }) {
  const render = useRenderLink(renderLink);
  const eksternal = /^[a-z][a-z0-9+.-]*:|^\/\//i.test(props.href) || props.target === '_blank' || props.download != null;
  return render && !eksternal ? <>{render(props)}</> : <a {...props} />;
}
