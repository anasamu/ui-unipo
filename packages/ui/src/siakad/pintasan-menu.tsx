'use client';
import * as React from 'react';
import { Popover as BasePopover } from '@base-ui/react/popover';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { ArrowDown, ArrowUp, EyeOff, GripVertical, Star } from 'lucide-react';
import { Button } from '../components/actions';
import type { NavGroup, NavItem, SidebarProps } from '../components/layout';
import { Dialog, Tooltip } from '../components/overlays';
import { cn } from '../lib/cn';

/**
 * Pintasan menu per aplikasi + pengguna (disimpan di browser): menu yang disematkan (urutan pilihan pengguna, maks. 8)
 * dan menu yang sering dibuka (otomatis dari hitungan kunjungan). Sidebar TIDAK diubah oleh pintasan: item tetap di
 * grupnya, yang disematkan hanya diberi bintang. Pintasan tampil di tombol bintang bilah atas (`TombolPintasan`),
 * pencarian fitur (Ctrl/⌘K), navigasi bawah ponsel (hanya yang disematkan), dan beranda (`PintasanBeranda`).
 */

/** Batas menu yang disematkan. */
export const MAKS_SEMATAN = 8;
/** Batas menu "Sering dibuka" yang ditampilkan. */
export const MAKS_SERING = 6;

interface DataPintasan {
  hitung: Record<string, number>;
  sematan: string[];
  /** Disembunyikan dari "Sering dibuka". */
  sembunyi?: string[];
}
const KOSONG: DataPintasan = { hitung: {}, sematan: [], sembunyi: [] };

export type ItemPintasan = NavItem & {
  /** Label teks (untuk tooltip, aria-label, navigasi bawah). */
  teks: string;
  /** Kelompok menu asal, mis. "Akademik › Jadwal". */
  kelompok?: string;
  /** Jumlah kunjungan tercatat. */
  kali: number;
  disematkan: boolean;
};

export interface PintasanMenu {
  /** Fitur pintasan aktif (prop `pintasan` KerangkaAplikasi). */
  aktif: boolean;
  /** Menu yang disematkan, sesuai urutan pengguna. */
  disematkan: ItemPintasan[];
  /** Menu yang sering dibuka (≥ 2 kali), belum disematkan dan tidak disembunyikan. Paling banyak MAKS_SERING. */
  sering: ItemPintasan[];
  /** @deprecated pakai `disematkan`. */
  items: ItemPintasan[];
  /** Sudah MAKS_SEMATAN disematkan. */
  penuh: boolean;
  /** Menu ini bisa menjadi pintasan (ada di menu, punya alamat, bukan Beranda). */
  bisa: (key?: string) => boolean;
  apakahDisematkan: (key?: string) => boolean;
  /** Bisa disematkan sekarang (bisa, belum disematkan, belum penuh). */
  bolehSematkan: (key?: string) => boolean;
  sematkan: (key: string) => void;
  lepas: (key: string) => void;
  /** Sematkan bila belum, lepas bila sudah. */
  alihkan: (key: string) => void;
  /** Sembunyikan dari "Sering dibuka" (sampai disematkan). */
  sembunyikan: (key: string) => void;
  /** Geser satu langkah dalam daftar sematan (-1 naik, 1 turun). */
  pindah: (key: string, arah: -1 | 1) => void;
  /** Pindahkan sematan ke posisi `ke` (seret). */
  pindahKe: (key: string, ke: number) => void;
}

function baca(kunci: string): string | null {
  try {
    return localStorage.getItem(kunci);
  } catch {
    return null;
  }
}
function simpan(kunci: string, nilai: string) {
  try {
    localStorage.setItem(kunci, nilai);
  } catch {
    /* penyimpanan diblokir */
  }
}
function bacaData(kunci: string): DataPintasan {
  try {
    const v = JSON.parse(baca(kunci) ?? 'null') as Partial<DataPintasan> | null;
    if (!v || typeof v !== 'object') return KOSONG;
    return {
      hitung: v.hitung && typeof v.hitung === 'object' ? v.hitung : {},
      sematan: Array.isArray(v.sematan) ? v.sematan.filter((x) => typeof x === 'string') : [],
      sembunyi: Array.isArray(v.sembunyi) ? v.sembunyi.filter((x) => typeof x === 'string') : [],
    };
  } catch {
    return KOSONG;
  }
}

const teksDari = (n: React.ReactNode): string => (typeof n === 'string' || typeof n === 'number' ? String(n) : '');

/** Ratakan menu (termasuk sub menu) menjadi kandidat pintasan dengan kelompok asalnya. */
function ratakanMenu(groups: NavGroup[]): Array<NavItem & { teks: string; kelompok?: string }> {
  const out: Array<NavItem & { teks: string; kelompok?: string }> = [];
  for (const g of groups)
    for (const it of g.items) {
      const kg = teksDari(g.label);
      if (it.children?.length) {
        const ki = it.labelTeks ?? teksDari(it.label);
        for (const c of it.children) out.push({ ...c, icon: c.icon ?? it.icon, teks: c.labelTeks ?? (teksDari(c.label) || c.key), kelompok: [kg, ki].filter(Boolean).join(' › ') || undefined });
      } else out.push({ ...it, teks: it.labelTeks ?? (teksDari(it.label) || it.key), kelompok: kg || undefined });
    }
  // Tautan keluar (aplikasi lain) tidak dijadikan pintasan.
  return out.filter((x) => x.href && !x.disabled && !x.luar);
}

/**
 * Data pintasan menu (localStorage `unipo.pintasan.<kode>.<pengguna>`, format lama tetap terbaca). Kunjungan dihitung
 * sekali per perpindahan halaman, dan baru setelah akun selesai dimuat (`siap`) supaya tidak tercatat ke "tamu".
 */
export function usePintasanMenu(kode: string, pengguna: string | null, groups: NavGroup[], activeKey: string | undefined, aktif = true, beranda?: string, siap = true): PintasanMenu {
  const kunci = `unipo.pintasan.${kode}.${pengguna ?? 'tamu'}`;
  const [data, setData] = React.useState<DataPintasan>(KOSONG);
  React.useEffect(() => {
    setData(bacaData(kunci));
    // Tab lain mengubah pintasan: ikut diperbarui.
    const f = (e: StorageEvent) => e.key === kunci && setData(bacaData(kunci));
    window.addEventListener('storage', f);
    return () => window.removeEventListener('storage', f);
  }, [kunci]);
  const ubah = React.useCallback(
    (fn: (d: DataPintasan) => DataPintasan) =>
      setData((d) => {
        const baru = fn(d);
        simpan(kunci, JSON.stringify(baru));
        return baru;
      }),
    [kunci],
  );
  // Beranda selalu ada di atas sidebar, jadi tidak ikut pintasan.
  const semua = React.useMemo(() => ratakanMenu(groups).filter((x) => !beranda || x.href !== beranda), [groups, beranda]);
  const byKey = React.useMemo(() => new Map(semua.map((x) => [x.key, x])), [semua]);
  const terakhir = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!aktif || !siap) return;
    const tanda = `${kunci}|${activeKey ?? ''}`;
    // Halaman di luar daftar (Beranda, menu belum dimuat) tetap dicatat sebagai posisi terakhir, supaya kembali ke
    // menu yang sama dihitung lagi; bila menunya baru muncul belakangan, tetap dihitung sekali.
    if (!activeKey || !byKey.has(activeKey)) return void (terakhir.current = `${tanda}|luar`);
    if (terakhir.current === tanda) return;
    terakhir.current = tanda;
    ubah((d) => ({ ...d, hitung: { ...d.hitung, [activeKey]: (d.hitung[activeKey] ?? 0) + 1 } }));
  }, [activeKey, aktif, siap, byKey, kunci, ubah]);

  return React.useMemo<PintasanMenu>(() => {
    const jadi = (k: string, disematkan: boolean): ItemPintasan | null => {
      const x = byKey.get(k);
      return x ? { ...x, kali: data.hitung[k] ?? 0, disematkan } : null;
    };
    const disematkan = aktif ? data.sematan.map((k) => jadi(k, true)).filter((x): x is ItemPintasan => Boolean(x)) : [];
    const sembunyi = data.sembunyi ?? [];
    const sering = aktif
      ? Object.entries(data.hitung)
          .filter(([k, n]) => n >= 2 && !data.sematan.includes(k) && !sembunyi.includes(k) && byKey.has(k))
          .sort((a, b) => b[1] - a[1])
          .slice(0, MAKS_SERING)
          .map(([k]) => jadi(k, false)!)
      : [];
    const penuh = disematkan.length >= MAKS_SEMATAN;
    const bisa = (key?: string) => aktif && Boolean(key) && byKey.has(key!);
    const apakahDisematkan = (key?: string) => Boolean(key) && data.sematan.includes(key!);
    const sematkan = (key: string) =>
      ubah((d) => {
        const ada = d.sematan.filter((k) => byKey.has(k));
        if (d.sematan.includes(key) || ada.length >= MAKS_SEMATAN) return d;
        return { ...d, sematan: [...d.sematan, key], sembunyi: (d.sembunyi ?? []).filter((k) => k !== key) };
      });
    const lepas = (key: string) => ubah((d) => ({ ...d, sematan: d.sematan.filter((k) => k !== key) }));
    const pindahKe = (key: string, ke: number) =>
      ubah((d) => {
        const s = d.sematan.filter((k) => k !== key);
        if (s.length === d.sematan.length) return d;
        s.splice(Math.max(0, Math.min(ke, s.length)), 0, key);
        return { ...d, sematan: s };
      });
    return {
      aktif,
      disematkan,
      sering,
      items: disematkan,
      penuh,
      bisa,
      apakahDisematkan,
      bolehSematkan: (key) => bisa(key) && !apakahDisematkan(key) && !penuh,
      sematkan,
      lepas,
      alihkan: (key) => (data.sematan.includes(key) ? lepas(key) : sematkan(key)),
      sembunyikan: (key) => ubah((d) => ({ ...d, sembunyi: [...(d.sembunyi ?? []).filter((k) => k !== key), key] })),
      pindah: (key, arah) => pindahKe(key, data.sematan.indexOf(key) + arah),
      pindahKe,
    };
  }, [aktif, byKey, data, ubah]);
}

// ================================================================ konteks kerangka

interface NilaiKonteksPintasan {
  pin: PintasanMenu;
  activeKey?: string;
  renderLink?: SidebarProps['renderLink'];
}
const KonteksPintasan = React.createContext<NilaiKonteksPintasan | null>(null);
/** Dipasang KerangkaAplikasi; komponen beranda membaca pintasan dari sini. */
export const PenyediaPintasan = KonteksPintasan.Provider;
/** Pintasan menu dari KerangkaAplikasi terdekat (null di luar kerangka). */
export function usePintasanKerangka(): NilaiKonteksPintasan | null {
  return React.useContext(KonteksPintasan);
}

function TautanPintasan({ it, renderLink, className, onClick, children, ...rest }: { it: NavItem; renderLink?: SidebarProps['renderLink']; className?: string; onClick?: () => void; children: React.ReactNode } & Record<`aria-${string}`, string | undefined>) {
  const props = { className, onClick, children, ...rest };
  return renderLink ? renderLink(it, { ...props, href: it.href }) : <a {...props} href={it.href} />;
}

/** Tombol bintang kecil: isi = disematkan. Dipakai di sidebar, panel, beranda. */
export function BintangPintasan({ pin, item, className, label }: { pin: PintasanMenu; item: { key: string; teks?: string; labelTeks?: string; label?: React.ReactNode }; className?: string; label?: string }) {
  const di = pin.apakahDisematkan(item.key);
  const nama = label ?? item.teks ?? item.labelTeks ?? teksDari(item.label);
  const penuh = !di && pin.penuh;
  return (
    <Tooltip content={di ? 'Lepas dari Pintasan' : penuh ? `Pintasan penuh (maks. ${MAKS_SEMATAN})` : 'Sematkan ke Pintasan'}>
      <button
        type="button"
        className={cn('u-pin-bintang', className)}
        data-disematkan={di ? '' : undefined}
        aria-pressed={di}
        aria-disabled={penuh || undefined}
        aria-label={di ? `Lepas ${nama} dari Pintasan` : `Sematkan ${nama} ke Pintasan`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!penuh) pin.alihkan(item.key);
        }}
      >
        <Star aria-hidden />
      </button>
    </Tooltip>
  );
}

// ================================================================ panel bilah atas

function useSempit(): boolean {
  const q = '(max-width: 639px)';
  return React.useSyncExternalStore(
    (l) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const m = window.matchMedia(q);
      m.addEventListener('change', l);
      return () => m.removeEventListener('change', l);
    },
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q).matches : false),
    () => false,
  );
}

function IsiPintasan({ pin, activeKey, renderLink, onTutup }: { pin: PintasanMenu; activeKey?: string; renderLink?: SidebarProps['renderLink']; onTutup: () => void }) {
  const [seret, setSeret] = React.useState<string | null>(null);
  const [sasaran, setSasaran] = React.useState<number | null>(null);
  const kosong = !pin.disematkan.length && !pin.sering.length;
  const bolehIni = pin.bolehSematkan(activeKey);
  const isiBaris = (it: ItemPintasan) => (
    <>
      <span className="u-pin-ikon" aria-hidden>
        {it.icon ?? <Star />}
      </span>
      <span className="u-pin-teks">
        <span>{it.teks}</span>
        {it.kelompok && <small>{it.kelompok}</small>}
      </span>
    </>
  );
  return (
    <div className="u-pin-panel">
      <div className="u-kabar-kepala">
        <span className="u-kabar-judul">Pintasan</span>
        {bolehIni ? (
          <Button variant="soft" size="xs" onClick={() => activeKey && pin.sematkan(activeKey)}>
            <Star aria-hidden /> Sematkan halaman ini
          </Button>
        ) : pin.apakahDisematkan(activeKey) ? (
          <span className="u-kabar-hitung">Halaman ini sudah disematkan</span>
        ) : null}
      </div>
      {kosong ? (
        <div className="u-pin-kosong">
          <span className="u-pin-kosong-ikon" aria-hidden>
            <Star />
          </span>
          <b>Belum ada pintasan</b>
          <p>
            Arahkan kursor ke menu di sidebar lalu klik ikon bintang, atau buka halaman yang Anda perlukan lalu pilih <i>Sematkan halaman ini</i>. Menu yang sering Anda buka
            juga akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="u-kabar-daftar">
          <div className="u-kabar-sub u-pin-sub">
            <span>Disematkan</span>
            <span className="u-pin-jumlah">
              {pin.disematkan.length}/{MAKS_SEMATAN}
            </span>
          </div>
          {pin.disematkan.length ? (
            <ul className="u-pin-daftar" aria-label="Disematkan">
              {pin.disematkan.map((it, i) => (
                <li
                  key={it.key}
                  className="u-pin-baris"
                  draggable
                  data-seret={seret === it.key ? '' : undefined}
                  data-sasaran={sasaran === i && seret && seret !== it.key ? '' : undefined}
                  data-aktif={it.key === activeKey ? '' : undefined}
                  onDragStart={(e) => {
                    setSeret(it.key);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', it.key);
                  }}
                  onDragOver={(e) => {
                    if (!seret) return;
                    e.preventDefault();
                    setSasaran(i);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (seret) pin.pindahKe(seret, i);
                    setSeret(null);
                    setSasaran(null);
                  }}
                  onDragEnd={() => {
                    setSeret(null);
                    setSasaran(null);
                  }}
                >
                  <GripVertical className="u-pin-pegangan" aria-hidden />
                  <TautanPintasan it={it} renderLink={renderLink} className="u-pin-tautan" onClick={onTutup} aria-current={it.key === activeKey ? 'page' : undefined}>
                    {isiBaris(it)}
                  </TautanPintasan>
                  <span className="u-pin-aksi">
                    <Tooltip content="Naikkan">
                      <button type="button" className="u-pin-tombol" aria-label={`Naikkan ${it.teks}`} disabled={i === 0} onClick={() => pin.pindah(it.key, -1)}>
                        <ArrowUp aria-hidden />
                      </button>
                    </Tooltip>
                    <Tooltip content="Turunkan">
                      <button type="button" className="u-pin-tombol" aria-label={`Turunkan ${it.teks}`} disabled={i === pin.disematkan.length - 1} onClick={() => pin.pindah(it.key, 1)}>
                        <ArrowDown aria-hidden />
                      </button>
                    </Tooltip>
                  </span>
                  <BintangPintasan pin={pin} item={it} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="u-pin-petunjuk">Belum ada. Klik ikon bintang pada menu untuk menyematkannya di sini.</p>
          )}
          {pin.sering.length > 0 && (
            <>
              <div className="u-kabar-sub u-pin-sub">
                <span>Sering dibuka</span>
              </div>
              <ul className="u-pin-daftar" aria-label="Sering dibuka">
                {pin.sering.map((it) => (
                  <li key={it.key} className="u-pin-baris" data-aktif={it.key === activeKey ? '' : undefined}>
                    <TautanPintasan it={it} renderLink={renderLink} className="u-pin-tautan" onClick={onTutup} aria-current={it.key === activeKey ? 'page' : undefined}>
                      {isiBaris(it)}
                      <span className="u-pin-kali">{it.kali}×</span>
                    </TautanPintasan>
                    <span className="u-pin-aksi">
                      <Tooltip content="Sembunyikan dari Sering dibuka">
                        <button type="button" className="u-pin-tombol" aria-label={`Sembunyikan ${it.teks} dari Sering dibuka`} onClick={() => pin.sembunyikan(it.key)}>
                          <EyeOff aria-hidden />
                        </button>
                      </Tooltip>
                    </span>
                    <BintangPintasan pin={pin} item={it} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      <p className="u-pin-kaki">Pintasan tersimpan di peramban ini. Urutkan dengan menyeret atau tombol panah.</p>
    </div>
  );
}

export interface TombolPintasanProps {
  pin: PintasanMenu;
  activeKey?: string;
  renderLink?: SidebarProps['renderLink'];
  className?: string;
}

/**
 * Tombol bintang di bilah atas: panel "Disematkan" (urutkan dengan seret atau panah, lepas) dan "Sering dibuka"
 * (sematkan, sembunyikan), "Sematkan halaman ini". Di ponsel menjadi lembar bawah.
 */
export function TombolPintasan({ pin, activeKey, renderLink, className }: TombolPintasanProps) {
  const [buka, setBuka] = React.useState(false);
  const sempit = useSempit();
  if (!pin.aktif) return null;
  const isi = buka && <IsiPintasan pin={pin} activeKey={activeKey} renderLink={renderLink} onTutup={() => setBuka(false)} />;
  const tombol = (
    <Button variant="ghost" size="sm" iconOnly className="u-kabar-tombol u-pin-pemicu" aria-label={pin.disematkan.length ? `Pintasan, ${pin.disematkan.length} disematkan` : 'Pintasan'} onClick={sempit ? () => setBuka(true) : undefined}>
      <Star />
    </Button>
  );
  if (sempit)
    return (
      <>
        {tombol}
        <Dialog open={buka} onOpenChange={setBuka} side="bottom" title="Pintasan" className={cn('u-kabar-lembar u-pin-lembar', className)}>
          {isi}
        </Dialog>
      </>
    );
  return (
    <BaseTooltip.Root>
      <BasePopover.Root open={buka} onOpenChange={(o) => setBuka(o)}>
        <BasePopover.Trigger render={<BaseTooltip.Trigger render={tombol} delay={300} />} />
        <BasePopover.Portal>
          <BasePopover.Positioner className="u-popup-positioner" side="bottom" align="end" sideOffset={8}>
            <BasePopover.Popup className={cn('u-popover u-kabar-panel u-pin-popover', className)} aria-label="Pintasan">
              {isi}
            </BasePopover.Popup>
          </BasePopover.Positioner>
        </BasePopover.Portal>
      </BasePopover.Root>
      {!buka && (
        <BaseTooltip.Portal>
          <BaseTooltip.Positioner className="u-popup-positioner" side="bottom" sideOffset={8}>
            <BaseTooltip.Popup className="u-tooltip">Pintasan</BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
      )}
    </BaseTooltip.Root>
  );
}

// ================================================================ beranda

export interface PintasanBerandaProps {
  /** "kartu" = petak berikon (bawaan); "ringkas" = deret chip kecil (dipakai di SapaanBeranda). */
  varian?: 'kartu' | 'ringkas';
  judul?: React.ReactNode;
  /** Paling banyak item. Bawaan 8. */
  maks?: number;
  /** Tampilkan "Sering dibuka" setelah yang disematkan. Bawaan true. */
  sering?: boolean;
  /** Keadaan kosong: tampilkan ajakan menyematkan (bawaan true untuk kartu, false untuk ringkas). */
  ajakan?: boolean;
  className?: string;
}

/**
 * Pintasan pengguna untuk beranda aplikasi (data sama dengan tombol Pintasan bilah atas): yang disematkan lalu yang
 * sering dibuka, dengan bintang sematkan/lepas dan ajakan saat kosong. Hanya tampil di dalam KerangkaAplikasi.
 *
 * ```tsx
 * <PintasanBeranda />
 * ```
 */
export function PintasanBeranda({ varian = 'kartu', judul = 'Pintasan Anda', maks = 8, sering = true, ajakan, className }: PintasanBerandaProps) {
  const ctx = usePintasanKerangka();
  if (!ctx?.pin.aktif) return null;
  const { pin, renderLink } = ctx;
  const items = [...pin.disematkan, ...(sering ? pin.sering : [])].slice(0, maks);
  const ajak = ajakan ?? varian === 'kartu';
  if (!items.length && !ajak) return null;
  if (varian === 'ringkas')
    return (
      <nav className={cn('u-pin-ringkas', className)} aria-label="Pintasan">
        {items.map((it) => (
          <TautanPintasan key={it.key} it={it} renderLink={renderLink} className="u-pin-chip" aria-label={it.disematkan ? `${it.teks} (disematkan)` : it.teks}>
            <span className="u-pin-chip-ikon" aria-hidden>
              {it.icon}
            </span>
            <span>{it.teks}</span>
            {it.disematkan && <Star className="u-pin-chip-bintang" aria-hidden />}
          </TautanPintasan>
        ))}
        {!items.length && <span className="u-pin-ringkas-ajak">Sematkan menu dengan ikon bintang agar muncul di sini.</span>}
      </nav>
    );
  return (
    <section className={cn('u-pin-beranda', className)} aria-label="Pintasan">
      {judul && (
        <div className="u-pin-beranda-kepala">
          <h3>{judul}</h3>
          {items.length > 0 && <small>{pin.disematkan.length ? `${pin.disematkan.length} disematkan` : 'Sering Anda buka'}</small>}
        </div>
      )}
      {items.length ? (
        <ul className="u-pin-petak">
          {items.map((it) => (
            <li key={it.key} data-disematkan={it.disematkan ? '' : undefined}>
              <TautanPintasan it={it} renderLink={renderLink} className="u-pin-petak-tautan">
                <span className="u-pin-ikon" aria-hidden>
                  {it.icon ?? <Star />}
                </span>
                <span className="u-pin-teks">
                  <span>{it.teks}</span>
                  {it.kelompok && <small>{it.kelompok}</small>}
                </span>
              </TautanPintasan>
              <BintangPintasan pin={pin} item={it} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="u-pin-kosong u-pin-kosong-beranda">
          <span className="u-pin-kosong-ikon" aria-hidden>
            <Star />
          </span>
          <b>Belum ada pintasan</b>
          <p>Klik ikon bintang di samping menu sidebar atau tombol bintang di bagian atas untuk menyematkan halaman yang sering Anda pakai.</p>
        </div>
      )}
    </section>
  );
}
