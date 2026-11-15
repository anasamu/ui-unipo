'use client';
import * as React from 'react';
import { ChevronRight, ChevronsDownUp, ChevronsUpDown, Mail, Maximize2, Minus, Plus, Search, UserRound, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { Avatar } from './display';
import { Dialog, Tooltip } from './overlays';

// ================================================================ Struktur organisasi

export interface NodeStruktur {
  id: string;
  jabatan: string;
  /** Kosong = jabatan belum diisi (lowong). */
  nama?: string | null;
  foto?: string | null;
  /** Unit di bawah jabatan, mis. "Fakultas Ilmu Komputer". */
  unit?: string | null;
  /** Grup tampilan, mis. "Pimpinan", "Senat", "Lembaga". */
  grup?: string | null;
  periode?: string | null;
  email?: string | null;
  keterangan?: string | null;
  /** Garis koordinasi (putus-putus) alih-alih garis komando, mis. Senat atau SPI. */
  koordinasi?: boolean;
  anak?: NodeStruktur[];
}

/** Ubah daftar datar `{ id, induk_id }` menjadi pohon. Baris tanpa induk (atau induknya tidak ada) menjadi akar. */
export function strukturDariDaftar<T extends Omit<NodeStruktur, 'anak'> & { induk_id?: string | number | null }>(daftar: T[]): NodeStruktur[] {
  const peta = new Map<string, NodeStruktur>();
  daftar.forEach((d) => peta.set(String(d.id), { ...d, id: String(d.id), anak: [] }));
  const akar: NodeStruktur[] = [];
  daftar.forEach((d) => {
    const n = peta.get(String(d.id))!;
    const induk = d.induk_id != null ? peta.get(String(d.induk_id)) : undefined;
    if (induk && induk !== n) induk.anak!.push(n);
    else akar.push(n);
  });
  return akar;
}

export type VarianStruktur = 'bagan' | 'pohon' | 'grup' | 'daftar';

export interface StrukturOrganisasiProps {
  /** Satu akar atau beberapa akar. */
  data: NodeStruktur | NodeStruktur[];
  varian?: VarianStruktur;
  /** Kedalaman yang terbuka di awal (bagan dan pohon). Bawaan 2. */
  buka?: number;
  /** Kotak cari jabatan/nama. Bawaan true. */
  cari?: boolean;
  /** Bagan berganti menjadi pohon bila lebar kurang dari ini (px). 0 = tidak. Bawaan 560. */
  pohonDiBawah?: number;
  /** Klik node: bawaan membuka dialog detail. */
  onPilih?: (n: NodeStruktur) => void;
  /** Judul di atas komponen. */
  judul?: React.ReactNode;
  /** Bentuk kartu node pada bagan. */
  kartu?: 'foto' | 'ringkas';
  className?: string;
}

function jalan(n: NodeStruktur[], fn: (x: NodeStruktur, tingkat: number, induk: NodeStruktur | null) => void, tingkat = 0, induk: NodeStruktur | null = null) {
  n.forEach((x) => {
    fn(x, tingkat, induk);
    if (x.anak?.length) jalan(x.anak, fn, tingkat + 1, x);
  });
}

const cocok = (n: NodeStruktur, q: string) => !!q && [n.jabatan, n.nama, n.unit].some((x) => x?.toLowerCase().includes(q));

function DetailNode({ n, tutup, jumlahBawahan }: { n: NodeStruktur | null; tutup: () => void; jumlahBawahan: number }) {
  return (
    <Dialog open={Boolean(n)} onOpenChange={(o) => !o && tutup()} title={n?.jabatan ?? ''} description={n?.unit ?? undefined} size="sm">
      {n && (
        <div className="u-org-detail">
          {n.foto ? <img src={n.foto} alt={`Foto ${n.nama ?? n.jabatan}`} /> : <Avatar name={n.nama || n.jabatan} size="2xl" />}
          <b>{n.nama || 'Belum diisi'}</b>
          <dl>
            {n.periode && (
              <div>
                <dt>Masa jabatan</dt>
                <dd>{n.periode}</dd>
              </div>
            )}
            {n.grup && (
              <div>
                <dt>Grup</dt>
                <dd>{n.grup}</dd>
              </div>
            )}
            {jumlahBawahan > 0 && (
              <div>
                <dt>Membawahi</dt>
                <dd>{jumlahBawahan} jabatan</dd>
              </div>
            )}
            {n.email && (
              <div>
                <dt>Surel</dt>
                <dd>
                  <a href={`mailto:${n.email}`}>
                    <Mail aria-hidden /> {n.email}
                  </a>
                </dd>
              </div>
            )}
          </dl>
          {n.keterangan && <p>{n.keterangan}</p>}
        </div>
      )}
    </Dialog>
  );
}

function KartuNode({ n, kartu, sorot, redup, onPilih }: { n: NodeStruktur; kartu: 'foto' | 'ringkas'; sorot?: boolean; redup?: boolean; onPilih: (n: NodeStruktur) => void }) {
  return (
    <button
      type="button"
      className="u-org-node"
      data-kartu={kartu}
      data-sorot={sorot ? '' : undefined}
      data-redup={redup ? '' : undefined}
      data-lowong={n.nama ? undefined : ''}
      data-koordinasi={n.koordinasi ? '' : undefined}
      onClick={() => onPilih(n)}
      aria-label={`${n.jabatan}: ${n.nama || 'belum diisi'}`}
    >
      {kartu === 'foto' &&
        (n.nama ? (
          <Avatar name={n.nama} src={n.foto ?? undefined} size="lg" />
        ) : (
          <span className="u-org-lowong-ikon">
            <UserRound aria-hidden />
          </span>
        ))}
      <span className="u-org-node-teks">
        <small>{n.jabatan}</small>
        <b>{n.nama || 'Belum diisi'}</b>
        {n.unit && kartu === 'foto' && <span>{n.unit}</span>}
      </span>
    </button>
  );
}

/**
 * Struktur organisasi universitas, fakultas, atau unit. Empat varian: bagan (bagan berjenjang dengan garis, bisa
 * dilipat, diperbesar/diperkecil, dan berganti ke pohon di layar sempit), pohon (daftar bertingkat), grup (kartu per
 * tingkat atau per grup), dan daftar (tabel jabatan). Pencarian menyorot node yang cocok dan membuka cabangnya.
 */
export function StrukturOrganisasi({ data, varian = 'bagan', buka = 2, cari = true, pohonDiBawah = 560, onPilih, judul, kartu = 'foto', className }: StrukturOrganisasiProps) {
  const akar = React.useMemo(() => (Array.isArray(data) ? data : [data]), [data]);
  const ref = React.useRef<HTMLDivElement>(null);
  const [sempit, setSempit] = React.useState(false);
  const [q, setQ] = React.useState('');
  const kata = q.trim().toLowerCase();
  const [skala, setSkala] = React.useState(1);
  const [pilih, setPilih] = React.useState<NodeStruktur | null>(null);

  const info = React.useMemo(() => {
    const induk = new Map<string, string | null>();
    const tingkat = new Map<string, number>();
    const bawahan = new Map<string, number>();
    const semua: NodeStruktur[] = [];
    jalan(akar, (x, t, p) => {
      induk.set(x.id, p?.id ?? null);
      tingkat.set(x.id, t);
      semua.push(x);
    });
    const hitung = (x: NodeStruktur): number => {
      const n = (x.anak ?? []).reduce((a, c) => a + 1 + hitung(c), 0);
      bawahan.set(x.id, n);
      return n;
    };
    akar.forEach(hitung);
    return { induk, tingkat, bawahan, semua };
  }, [akar]);

  const awal = React.useCallback(() => new Set(info.semua.filter((x) => (info.tingkat.get(x.id) ?? 0) < buka - 1 || buka <= 0).map((x) => x.id)), [info, buka]);
  const [terbuka, setTerbuka] = React.useState<Set<string>>(awal);
  React.useEffect(() => setTerbuka(awal()), [awal]);

  // Cari: buka leluhur semua yang cocok.
  const cocokId = React.useMemo(() => new Set(kata ? info.semua.filter((x) => cocok(x, kata)).map((x) => x.id) : []), [kata, info]);
  React.useEffect(() => {
    if (!cocokId.size) return;
    setTerbuka((t) => {
      const n = new Set(t);
      cocokId.forEach((id) => {
        for (let p = info.induk.get(id); p; p = info.induk.get(p)) n.add(p);
      });
      return n;
    });
  }, [cocokId, info]);
  // Geser kanvas ke hasil pertama (setelah cabangnya terbuka).
  React.useEffect(() => {
    if (!cocokId.size) return;
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>('[data-sorot]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }), 60);
    return () => clearTimeout(t);
  }, [cocokId]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !pohonDiBawah || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setSempit(e.contentRect.width < pohonDiBawah));
    ro.observe(el);
    return () => ro.disconnect();
  }, [pohonDiBawah]);

  const alih = (id: string) =>
    setTerbuka((t) => {
      const n = new Set(t);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const klik = (n: NodeStruktur) => (onPilih ? onPilih(n) : setPilih(n));
  const v = varian === 'bagan' && sempit ? 'pohon' : varian;
  const semuaTerbuka = info.semua.every((x) => !x.anak?.length || terbuka.has(x.id));

  const bagan = (n: NodeStruktur[]): React.ReactNode => (
    <ul>
      {n.map((x) => {
        const punya = (x.anak?.length ?? 0) > 0;
        const b = terbuka.has(x.id);
        return (
          <li key={x.id} data-koordinasi={x.koordinasi ? '' : undefined}>
            <div className="u-org-sel">
              <KartuNode n={x} kartu={kartu} sorot={cocokId.has(x.id)} redup={kata !== '' && !cocokId.has(x.id)} onPilih={klik} />
              {punya && (
                <button type="button" className="u-org-lipat" aria-expanded={b} aria-label={`${b ? 'Lipat' : 'Buka'} bawahan ${x.jabatan}`} onClick={() => alih(x.id)}>
                  {b ? <Minus aria-hidden /> : <span>{x.anak!.length}</span>}
                </button>
              )}
            </div>
            {punya && b && bagan(x.anak!)}
          </li>
        );
      })}
    </ul>
  );

  const pohon = (n: NodeStruktur[], t = 0): React.ReactNode => (
    <ul role={t === 0 ? 'tree' : 'group'} aria-label={t === 0 ? 'Struktur organisasi' : undefined}>
      {n.map((x) => {
        const punya = (x.anak?.length ?? 0) > 0;
        const b = terbuka.has(x.id);
        return (
          <li key={x.id} role="treeitem" aria-expanded={punya ? b : undefined} aria-selected={false}>
            <div className="u-org-pohon-baris" data-sorot={cocokId.has(x.id) ? '' : undefined} data-redup={kata !== '' && !cocokId.has(x.id) ? '' : undefined}>
              {punya ? (
                <button type="button" className="u-org-pohon-panah" aria-label={`${b ? 'Lipat' : 'Buka'} ${x.jabatan}`} onClick={() => alih(x.id)}>
                  <ChevronRight aria-hidden data-buka={b ? '' : undefined} />
                </button>
              ) : (
                <span className="u-org-pohon-panah" />
              )}
              <button type="button" className="u-org-pohon-isi" onClick={() => klik(x)}>
                <Avatar name={x.nama || x.jabatan} src={x.foto ?? undefined} size="sm" />
                <span>
                  <b>{x.nama || 'Belum diisi'}</b>
                  <small>{x.jabatan}</small>
                </span>
                {punya && <span className="u-org-hitung">{info.bawahan.get(x.id)}</span>}
              </button>
            </div>
            {punya && b && pohon(x.anak!, t + 1)}
          </li>
        );
      })}
    </ul>
  );

  const grup = () => {
    const kelompok = new Map<string, NodeStruktur[]>();
    info.semua.forEach((x) => {
      if (kata && !cocokId.has(x.id)) return;
      const k = x.grup || (info.tingkat.get(x.id) === 0 ? 'Pimpinan' : `Tingkat ${(info.tingkat.get(x.id) ?? 0) + 1}`);
      kelompok.set(k, [...(kelompok.get(k) ?? []), x]);
    });
    return [...kelompok.entries()].map(([k, d], i) => (
      <section key={k} className="u-org-grup" data-utama={i === 0 ? '' : undefined}>
        <h3>{k}</h3>
        <div className="u-org-grup-kisi">
          {d.map((x) => (
            <button key={x.id} type="button" className="u-org-grup-kartu" data-lowong={x.nama ? undefined : ''} onClick={() => klik(x)}>
              {x.foto ? <img src={x.foto} alt="" loading="lazy" /> : <span className="u-org-grup-inisial">{x.nama ? <Avatar name={x.nama} size="xl" /> : <UserRound aria-hidden />}</span>}
              <span>
                <b>{x.nama || 'Belum diisi'}</b>
                <small>{x.jabatan}</small>
                {x.unit && <small className="u-org-unit">{x.unit}</small>}
              </span>
            </button>
          ))}
        </div>
      </section>
    ));
  };

  const daftar = () => (
    <div className="u-org-tabel" role="table" aria-label="Daftar jabatan">
      <div role="row" className="u-org-tabel-kepala">
        <span role="columnheader">Jabatan</span>
        <span role="columnheader">Nama</span>
        <span role="columnheader">Atasan</span>
      </div>
      {info.semua
        .filter((x) => !kata || cocokId.has(x.id))
        .map((x) => {
          const p = info.induk.get(x.id);
          const atasan = p ? info.semua.find((y) => y.id === p) : null;
          return (
            <button key={x.id} type="button" role="row" className="u-org-tabel-baris" onClick={() => klik(x)} style={{ ['--t' as string]: info.tingkat.get(x.id) ?? 0 }}>
              <span role="cell" className="u-org-tabel-jabatan">
                {x.jabatan}
              </span>
              <span role="cell" className="u-org-tabel-nama">
                <Avatar name={x.nama || x.jabatan} src={x.foto ?? undefined} size="xs" />
                {x.nama || <i>Belum diisi</i>}
              </span>
              <span role="cell" className="u-org-tabel-atasan">
                {atasan?.jabatan ?? '—'}
              </span>
            </button>
          );
        })}
    </div>
  );

  return (
    <div className={cn('u-org', className)} data-varian={v} ref={ref}>
      {(judul || cari || v === 'bagan' || v === 'pohon') && (
        <div className="u-org-alat">
          {judul && <h2 className="u-org-judul">{judul}</h2>}
          {cari && (
            <div className="u-org-cari">
              <Search aria-hidden />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari jabatan atau nama" aria-label="Cari jabatan atau nama" />
              {q && (
                <button type="button" aria-label="Hapus pencarian" onClick={() => setQ('')}>
                  <X aria-hidden />
                </button>
              )}
            </div>
          )}
          {kata && (
            <span className="u-org-hasil" aria-live="polite">
              {cocokId.size} cocok
            </span>
          )}
          {(v === 'bagan' || v === 'pohon') && (
            <div className="u-org-tombol">
              <Tooltip content={semuaTerbuka ? 'Lipat semua' : 'Buka semua'}>
                <button
                  type="button"
                  aria-label={semuaTerbuka ? 'Lipat semua' : 'Buka semua'}
                  onClick={() => setTerbuka(semuaTerbuka ? new Set(akar.map((x) => x.id)) : new Set(info.semua.map((x) => x.id)))}
                >
                  {semuaTerbuka ? <ChevronsDownUp aria-hidden /> : <ChevronsUpDown aria-hidden />}
                </button>
              </Tooltip>
              {v === 'bagan' && (
                <>
                  <Tooltip content="Perkecil">
                    <button type="button" aria-label="Perkecil" disabled={skala <= 0.5} onClick={() => setSkala((s) => Math.max(0.5, +(s - 0.1).toFixed(2)))}>
                      <Minus aria-hidden />
                    </button>
                  </Tooltip>
                  <span className="u-org-skala" aria-live="polite">
                    {Math.round(skala * 100)}%
                  </span>
                  <Tooltip content="Perbesar">
                    <button type="button" aria-label="Perbesar" disabled={skala >= 1.5} onClick={() => setSkala((s) => Math.min(1.5, +(s + 0.1).toFixed(2)))}>
                      <Plus aria-hidden />
                    </button>
                  </Tooltip>
                  <Tooltip content="Ukuran asli">
                    <button type="button" aria-label="Ukuran asli" onClick={() => setSkala(1)}>
                      <Maximize2 aria-hidden />
                    </button>
                  </Tooltip>
                </>
              )}
            </div>
          )}
        </div>
      )}
      {v === 'bagan' ? (
        <div className="u-org-kanvas" tabIndex={0} aria-label="Bagan struktur organisasi, geser untuk melihat semua">
          <div className="u-org-bagan" style={{ zoom: skala } as React.CSSProperties}>
            {bagan(akar)}
          </div>
        </div>
      ) : v === 'pohon' ? (
        <div className="u-org-pohon">{pohon(akar)}</div>
      ) : v === 'grup' ? (
        <div className="u-org-grup-wadah">{grup()}</div>
      ) : (
        daftar()
      )}
      {kata && !cocokId.size && <p className="u-org-kosong">Tidak ada jabatan atau nama yang cocok dengan “{q.trim()}”.</p>}
      <DetailNode n={pilih} tutup={() => setPilih(null)} jumlahBawahan={pilih ? (info.bawahan.get(pilih.id) ?? 0) : 0} />
    </div>
  );
}
