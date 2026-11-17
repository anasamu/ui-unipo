'use client';
import * as React from 'react';
import { ArrowLeft, Download, Pin } from 'lucide-react';
import { Badge, Button, Skeleton } from '../components/actions';
import { AnnouncementList, type AnnouncementVariant } from '../components/content';
import { Alert } from '../components/display';
import type { UnipoApp } from '../components/identity';
import { Footer, PitaPengumuman, TopbarKontak, type FooterProps, type ItemPita, type KontakSitus } from '../components/kaki-situs';
import { ModalFitur } from '../components/modal-fitur';
import type { NavbarColumn, NavbarLink } from '../components/navbar';
import { KontenHtml } from '../components/tata-letak';
import { KodeLaporan } from '../components/galat';
import { formatDate } from '../lib/format';
import { PengumumanTampil, usePengumumanTayang } from './pengumuman-lintas';
import { hrefMenuPortal, LogoSitus, NavbarPortal, type MenuPortal, type NavbarPortalProps } from './navigasi';
import { hrefKontenBawaan, kePengumuman, type HrefKonten, type KontenPortal } from './portal';
import { pesanGalat, useSiakadQuery } from './provider';

/**
 * Kerangka situs portal dari `/v1/portal`: kaki halaman, pita atas, pita pengumuman, popup, pengumuman untuk
 * pengguna yang masuk, detail pengumuman, dan KerangkaPortal yang menyusun semuanya dengan NavbarPortal.
 */

type Row = Record<string, any>;

/** Profil situs (`/v1/portal/situs/{kode}`); kunci cache sama dengan LogoSitus sehingga hanya diambil sekali. */
function useSitus(situs: string) {
  return useSiakadQuery<Row>(['portal-situs', situs], (s, signal) => s.portal.getSitusByKode(situs, {}, { signal }) as never, { staleTime: 10 * 60_000 });
}

function useMenu(situs: string, lokasi: 'utama' | 'atas' | 'footer' | 'sidebar') {
  return useSiakadQuery<Record<string, MenuPortal[]>>(['portal-menu', situs, lokasi], (s, signal) => s.portal.getSitusByKodeMenu(situs, { lokasi }, { signal }) as never, { staleTime: 5 * 60_000 });
}

/** Kontak situs (kolom alamat, telepon, email, whatsapp, lintang/bujur) + jam layanan dari pengaturan `jam_layanan`. */
export function kontakSitus(d?: Row | null): KontakSitus {
  if (!d) return {};
  const peta = d.lintang != null && d.bujur != null ? `https://www.google.com/maps?q=${d.lintang},${d.bujur}` : null;
  const jam = d.pengaturan?.jam_layanan;
  return { alamat: d.alamat ?? undefined, telepon: d.telepon, email: d.email, whatsapp: d.whatsapp, peta, jam: typeof jam === 'string' ? jam : undefined };
}

/** media_sosial situs ({ instagram: url, … }) → [{ jenis, url }] untuk SocialLinks. */
export function sosialSitus(d?: Row | null): Array<{ jenis: string; url: string }> {
  return Object.entries((d?.media_sosial ?? {}) as Record<string, unknown>)
    .filter(([, u]) => typeof u === 'string' && /^https?:\/\//.test(u))
    .map(([jenis, url]) => ({ jenis, url: url as string }));
}

const keLink =
  (href: (m: MenuPortal) => string | undefined, bahasa?: 'id' | 'en') =>
  (m: MenuPortal): NavbarLink => ({ key: String(m.id), label: (bahasa === 'en' && m.label_en) || m.label, href: href(m), external: Boolean(Number(m.tab_baru)) });

// ================================================================ Footer portal
const JUDUL_GRUP: Record<string, string> = { layanan: 'Layanan', terkait: 'Tautan terkait', mitra: 'Mitra' };

export interface FooterPortalProps extends Partial<Omit<FooterProps, 'kontak' | 'sosial'>> {
  /** Kode situs portal. */
  situs: string;
  /** Logo cadangan bila situs belum punya logo. */
  app?: UnipoApp;
  /** Grup tautan cepat (`/v1/portal/tautan`) yang dijadikan kolom. Bawaan ['layanan']. [] mematikan. */
  grupTautan?: Array<'layanan' | 'terkait' | 'mitra'>;
  /** Kolom tambahan setelah kolom dari menu footer dan tautan. */
  kolomTambahan?: NavbarColumn[];
  href?: (m: MenuPortal) => string | undefined;
  bahasa?: 'id' | 'en';
}

/**
 * Kaki halaman dari pengaturan portal: identitas + kontak + media sosial dari profil situs, kolom dari menu `footer`
 * (item bertingkat menjadi kolom berjudul, item tunggal dikumpulkan di kolom "Tautan"), dan kolom tautan cepat.
 */
export function FooterPortal({ situs, app, grupTautan = ['layanan'], kolomTambahan = [], href = hrefMenuPortal, bahasa, columns, brand, description, namaHakCipta, ...rest }: FooterPortalProps) {
  const s = useSitus(situs);
  const m = useMenu(situs, 'footer');
  const t = useSiakadQuery<Row[]>(['portal-tautan', situs], (sdk, signal) => sdk.portal.getTautan({ situs, per_page: 100 }, { signal }) as never, {
    staleTime: 10 * 60_000,
    enabled: grupTautan.length > 0,
  });
  const kolom = React.useMemo<NavbarColumn[]>(() => {
    const link = keLink(href, bahasa);
    const pohon = m.data?.footer ?? [];
    const tunggal = pohon.filter((x) => !x.anak?.length);
    const dariMenu: NavbarColumn[] = [
      ...pohon.filter((x) => x.anak?.length).map((x) => ({ title: (bahasa === 'en' && x.label_en) || x.label, items: x.anak!.map(link) })),
      ...(tunggal.length ? [{ title: bahasa === 'en' ? 'Links' : 'Tautan', items: tunggal.map(link) }] : []),
    ];
    const dariTautan = grupTautan
      .map((g) => ({
        title: JUDUL_GRUP[g],
        items: (t.data ?? []).filter((x) => x.grup === g).map((x) => ({ key: `t${x.id}`, label: (bahasa === 'en' && x.nama_en) || x.nama, href: x.url, external: /^https?:/.test(String(x.url)) })),
      }))
      .filter((c) => c.items.length);
    return [...dariMenu, ...dariTautan, ...kolomTambahan];
  }, [m.data, t.data, grupTautan, kolomTambahan, href, bahasa]);
  const d = s.data;
  return (
    <Footer
      brand={brand ?? <LogoSitus situs={situs} app={app} />}
      description={description ?? (bahasa === 'en' ? d?.meta_deskripsi_en : undefined) ?? d?.meta_deskripsi ?? d?.tagline}
      kontak={kontakSitus(d)}
      sosial={sosialSitus(d)}
      columns={columns ?? (rest.variant === 'ringkas' ? kolom.filter((c) => c.title === 'Tautan' || c.title === 'Links').slice(0, 1) : kolom)}
      namaHakCipta={namaHakCipta ?? d?.nama ?? 'Universitas Pohuwato'}
      {...rest}
    />
  );
}

// ================================================================ Pita atas navbar
export interface TopbarPortalProps {
  situs: string;
  href?: (m: MenuPortal) => string | undefined;
  bahasa?: 'id' | 'en';
  /** Slot paling kanan, mis. pilihan bahasa. */
  extra?: React.ReactNode;
  className?: string;
}

/** Isi `topbar` Navbar: telepon, email, jam layanan dari profil situs + menu lokasi `atas` (SIAKAD, e-learning, PPID). */
export function TopbarPortal({ situs, href = hrefMenuPortal, bahasa, extra, className }: TopbarPortalProps) {
  const s = useSitus(situs);
  const m = useMenu(situs, 'atas');
  const links = (m.data?.atas ?? []).map(keLink(href, bahasa));
  return <TopbarKontak className={className} kontak={kontakSitus(s.data)} links={links} extra={extra} />;
}

// ================================================================ Pita pengumuman
export interface PitaPengumumanPortalProps {
  situs: string;
  /** Ikutkan pengumuman situs turunan. */
  turunan?: boolean;
  /** Prioritas pengumuman yang naik ke pita (bawaan darurat dan penting). */
  prioritas?: Array<'darurat' | 'penting' | 'biasa'>;
  /** Ikutkan banner posisi `pita` (bawaan true). */
  banner?: boolean;
  href?: HrefKonten;
  /** Pita yang ditutup tidak muncul lagi sampai isinya berubah (bawaan true). */
  ingat?: boolean;
  interval?: number;
  className?: string;
}

/** Pita di atas navbar dari pengumuman penting/darurat yang masih berlaku dan banner posisi `pita`. */
export function PitaPengumumanPortal({ situs, turunan, prioritas = ['darurat', 'penting'], banner = true, href = hrefKontenBawaan, ingat = true, interval, className }: PitaPengumumanPortalProps) {
  const qp = { situs, turunan: turunan ? '1' : undefined, per_page: 20 };
  const p = useSiakadQuery<KontenPortal[]>(['portal-pengumuman', qp], (s, signal) => s.portal.getPengumuman(qp, { signal }) as never, { staleTime: 120_000 });
  const b = useSiakadQuery<Row[]>(['portal-banner', situs, 'pita'], (s, signal) => s.portal.getBanner({ situs, posisi: 'pita' }, { signal }) as never, { staleTime: 120_000, enabled: banner });
  const urut = { darurat: 0, penting: 1, biasa: 2 } as Record<string, number>;
  const items: ItemPita[] = [
    ...(p.data ?? [])
      .filter((k) => prioritas.includes((k.prioritas ?? 'biasa') as never))
      .sort((a, c) => (urut[a.prioritas ?? 'biasa'] ?? 2) - (urut[c.prioritas ?? 'biasa'] ?? 2))
      .map((k) => ({ id: `p${k.id}`, title: k.judul, href: href('pengumuman', k), priority: k.prioritas ?? 'biasa' })),
    ...(banner ? (b.data ?? []) : []).map((x) => ({
      id: `b${x.id}`,
      title: [x.judul, x.keterangan].filter(Boolean).join(' · '),
      href: x.tautan ?? undefined,
      cta: x.teks_tombol ?? undefined,
      external: /^https?:/.test(String(x.tautan ?? '')),
      priority: 'biasa',
    })),
  ];
  // Pengumuman lintas aplikasi yang menyasar pengunjung publik (/v1/notif/pita?aplikasi=publik), mode pita.
  const lintas = usePengumumanTayang('publik', true, situs);
  const dariLintas: ItemPita[] = lintas.items
    .filter((x) => x.mode === 'pita')
    .map((x) => ({ id: `n:${x.id}`, title: x.judul, detail: x.isi ?? undefined, href: x.tautan ?? undefined, cta: x.teks_tautan ?? undefined, external: /^https?:/.test(x.tautan ?? ''), priority: x.nada, dapatDitutup: x.dapat_ditutup }));
  const [tutupLokal, setTutupLokal] = React.useState(false);
  const semua = [...dariLintas, ...(tutupLokal ? [] : items)];
  return (
    <PitaPengumuman
      className={className}
      items={semua}
      interval={interval}
      ingat={dariLintas.length ? undefined : ingat ? `unipo-pita-${situs}` : undefined}
      onTutupItem={
        dariLintas.length
          ? (it) => {
              const x = lintas.items.find((y) => `n:${y.id}` === it.id);
              if (x) lintas.tutup(x);
              else setTutupLokal(true);
            }
          : undefined
      }
    />
  );
}

// ================================================================ Popup
export interface PopupPengumumanPortalProps {
  situs: string;
  /** Tunda tampil (ms) agar tidak menutupi halaman saat baru dibuka. Bawaan 800. */
  tunda?: number;
  /** Popup yang ditutup tidak muncul lagi (bawaan true). false = muncul tiap kunjungan. */
  ingat?: boolean;
}

/** Banner posisi `popup` yang sedang tayang (`/v1/portal/banner`), satu per kunjungan, dengan gambar atau ilustrasi. */
export function PopupPengumumanPortal({ situs, tunda = 800, ingat = true }: PopupPengumumanPortalProps) {
  const b = useSiakadQuery<Row[]>(['portal-banner', situs, 'popup'], (s, signal) => s.portal.getBanner({ situs, posisi: 'popup' }, { signal }) as never, { staleTime: 300_000 });
  const kunci = (id: unknown) => `unipo-popup-${situs}-${id}`;
  const [tampil, setTampil] = React.useState<Row | null>(null);
  React.useEffect(() => {
    const calon = (b.data ?? []).find((x) => {
      if (!ingat) return true;
      try {
        return localStorage.getItem(kunci(x.id)) == null;
      } catch {
        return true;
      }
    });
    if (!calon) return;
    const t = setTimeout(() => setTampil(calon), tunda);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.data, ingat, tunda]);
  if (!tampil) return null;
  const tutup = () => {
    if (ingat)
      try {
        localStorage.setItem(kunci(tampil.id), '1');
      } catch {
        /* abaikan */
      }
    setTampil(null);
  };
  const gambar = tampil.media?.url as string | undefined;
  return (
    <ModalFitur
      open
      onOpenChange={(o) => !o && tutup()}
      size={gambar ? 'md' : 'sm'}
      ilustrasi={gambar ? undefined : 'pengumuman'}
      title={tampil.judul ?? 'Pengumuman'}
      description={tampil.keterangan ?? undefined}
      aksi={
        tampil.tautan
          ? {
              label: tampil.teks_tombol || 'Lihat selengkapnya',
              onClick: () => {
                tutup();
                window.open(tampil.tautan, /^https?:/.test(tampil.tautan) ? '_blank' : '_self', 'noopener');
              },
            }
          : undefined
      }
    >
      {gambar && <img className="u-popup-gambar" src={gambar} alt={tampil.media?.alt ?? ''} />}
    </ModalFitur>
  );
}

// ================================================================ Pengumuman untuk pengguna yang masuk
export interface PengumumanSayaProps {
  jumlah?: number;
  /** Bawaan ringkas (cocok di dasbor). */
  variant?: AnnouncementVariant;
  href?: HrefKonten;
  className?: string;
}

/**
 * Pengumuman yang sasarannya cocok dengan akun yang masuk (kelompok, prodi, angkatan dari SIAKAD):
 * `/v1/portal/pengumuman/saya`. Untuk dasbor SIAKAD, LMS, PMB, dan aplikasi lain.
 */
export function PengumumanSaya({ jumlah = 5, variant = 'ringkas', href = hrefKontenBawaan, className }: PengumumanSayaProps) {
  const q = { per_page: jumlah };
  const { data, loading, error, refetch } = useSiakadQuery<KontenPortal[]>(['portal-pengumuman-saya', q], (s, signal) => s.portal.getPengumumanSaya(q, { signal }) as never, { staleTime: 120_000 });
  if (error)
    return (
      <Alert
        variant="danger"
        title="Pengumuman gagal dimuat"
        actions={
          <Button size="sm" variant="outline" onClick={refetch}>
            Coba lagi
          </Button>
        }
      >
        {pesanGalat(error)}
        <KodeLaporan error={error} />
      </Alert>
    );
  const items = (data ?? []).map((k) => kePengumuman(k, href)).sort((a, b) => Number(b.pinned) - Number(a.pinned));
  return <AnnouncementList className={className} variant={variant} loading={loading && !data} items={items} empty="Tidak ada pengumuman untuk Anda saat ini." />;
}

// ================================================================ Detail pengumuman
const PRIORITAS: Record<string, { label: string; variant: 'danger' | 'warning' }> = {
  darurat: { label: 'Darurat', variant: 'danger' },
  penting: { label: 'Penting', variant: 'warning' },
};

export interface DetailPengumumanPortalProps {
  /** ID atau slug. Slug butuh `situs`. */
  id: string | number;
  situs?: string;
  /** Tombol kembali ke daftar. */
  onKembali?: () => void;
  bahasa?: 'id' | 'en';
  className?: string;
}

/** Isi lengkap satu pengumuman (`/v1/portal/pengumuman/{id}`): prioritas, nomor, masa berlaku, isi HTML yang disaring, dan lampiran. */
export function DetailPengumumanPortal({ id, situs, onKembali, bahasa, className }: DetailPengumumanPortalProps) {
  const q = situs ? { situs } : {};
  const {
    data: d,
    loading,
    error,
    refetch,
  } = useSiakadQuery<Row>(['portal-pengumuman-detail', id, situs], (s, signal) => s.portal.getPengumumanById(id, q, { signal }) as never, { staleTime: 120_000 });
  if (error)
    return (
      <Alert
        variant="danger"
        title="Pengumuman tidak dapat dibuka"
        actions={
          <Button size="sm" variant="outline" onClick={refetch}>
            Coba lagi
          </Button>
        }
      >
        {pesanGalat(error)}
        <KodeLaporan error={error} />
      </Alert>
    );
  if (loading || !d)
    return (
      <div className={className} style={{ display: 'grid', gap: 12 }} aria-busy>
        <Skeleton style={{ height: 14, width: 120 }} />
        <Skeleton style={{ height: 30, width: '80%' }} />
        <Skeleton style={{ height: 14, width: '50%' }} />
        <Skeleton style={{ height: 160 }} />
      </div>
    );
  const pr = PRIORITAS[d.prioritas ?? ''];
  const lewat = d.berlaku_sampai && new Date(String(d.berlaku_sampai).replace(' ', 'T')).getTime() < Date.now();
  const lampiran = d.lampiran as Row | null | undefined;
  return (
    <article className={['u-pengumuman-detail', className].filter(Boolean).join(' ')} data-priority={d.prioritas ?? 'biasa'}>
      {onKembali && (
        <Button variant="ghost" size="sm" onClick={onKembali} className="u-pengumuman-kembali">
          <ArrowLeft /> Semua pengumuman
        </Button>
      )}
      <header>
        <div className="u-pengumuman-tanda">
          {pr && <Badge variant={pr.variant}>{pr.label}</Badge>}
          {d.sematkan && (
            <Badge variant="info">
              <Pin /> Disematkan
            </Badge>
          )}
          {d.kategori?.nama && <Badge variant="neutral">{d.kategori.nama}</Badge>}
          {lewat && <Badge variant="neutral">Sudah berakhir</Badge>}
        </div>
        <h1>{(bahasa === 'en' && d.judul_en) || d.judul}</h1>
        <dl>
          {d.nomor && (
            <div>
              <dt>Nomor</dt>
              <dd className="u-mono">{d.nomor}</dd>
            </div>
          )}
          {d.terbit_pada && (
            <div>
              <dt>Terbit</dt>
              <dd>{formatDate(String(d.terbit_pada).replace(' ', 'T'), 'long')}</dd>
            </div>
          )}
          {d.berlaku_sampai && (
            <div>
              <dt>Berlaku sampai</dt>
              <dd>{formatDate(String(d.berlaku_sampai).replace(' ', 'T'), 'long')}</dd>
            </div>
          )}
          {d.situs?.nama && (
            <div>
              <dt>Penerbit</dt>
              <dd>{d.situs.nama}</dd>
            </div>
          )}
        </dl>
      </header>
      <KontenHtml html={(bahasa === 'en' && d.isi_en) || d.isi} />
      {lampiran?.url && (
        <a className="u-pengumuman-lampiran" href={lampiran.url} target="_blank" rel="noopener noreferrer" download>
          <Download aria-hidden />
          <span>
            <b>{lampiran.nama ?? lampiran.judul ?? 'Lampiran'}</b>
            {lampiran.ukuran ? <small>{(Number(lampiran.ukuran) / 1024 / 1024).toFixed(1).replace('.', ',')} MB</small> : null}
          </span>
        </a>
      )}
    </article>
  );
}

// ================================================================ Kerangka lengkap
export interface KerangkaPortalProps {
  situs: string;
  app?: UnipoApp;
  children?: React.ReactNode;
  /** Pita pengumuman penting di atas navbar (bawaan true). */
  pita?: boolean | Omit<PitaPengumumanPortalProps, 'situs'>;
  /** Popup banner (bawaan true). */
  popup?: boolean;
  /** Pita kontak di atas navbar (bawaan true). */
  topbar?: boolean;
  /** Props tambahan untuk NavbarPortal (actions, search, transparent, menuTambahan, …). */
  navbar?: Omit<NavbarPortalProps, 'situs'>;
  /** Props tambahan untuk FooterPortal (variant, ajakan, grupTautan, …). */
  footer?: Omit<FooterPortalProps, 'situs'>;
  href?: (m: MenuPortal) => string | undefined;
  bahasa?: 'id' | 'en';
  className?: string;
}

/**
 * Kerangka satu situs portal dalam satu komponen: pita pengumuman, navbar dengan menu utama + mega menu dan pita
 * kontak, isi halaman, kaki halaman, dan popup banner. Semua dari pengaturan situs di `/v1/portal`.
 *
 * ```tsx
 * <KerangkaPortal situs="univ" navbar={{ actions: <Button>Daftar</Button> }}>…</KerangkaPortal>
 * ```
 */
export function KerangkaPortal({ situs, app, children, pita = true, popup = true, topbar = true, navbar, footer, href, bahasa, className }: KerangkaPortalProps) {
  return (
    <div className={['u-kerangka-portal', className].filter(Boolean).join(' ')}>
      {pita && <PitaPengumumanPortal situs={situs} {...(typeof pita === 'object' ? pita : {})} />}
      {pita && <PengumumanTampil aplikasi="publik" situs={situs} bagian={['lapis']} />}
      <NavbarPortal
        situs={situs}
        app={app}
        href={href}
        bahasa={bahasa}
        topbar={topbar ? <TopbarPortal situs={situs} href={href} bahasa={bahasa} /> : undefined}
        {...(navbar as NavbarPortalProps | undefined)}
      />
      <main className="u-kerangka-portal-isi">{children}</main>
      <FooterPortal situs={situs} app={app} href={href} bahasa={bahasa} {...footer} />
      {popup && <PopupPengumumanPortal situs={situs} />}
    </div>
  );
}
