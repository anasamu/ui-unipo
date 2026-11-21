'use client';
import * as React from 'react';
import { CalendarDays, Megaphone } from 'lucide-react';
import { NewsGrid, type NewsItem } from '../components/content';
import { Empty } from '../components/display';
import { HalamanLanding, type AksiLanding, type ButirAngka, type HalamanLandingProps, type PenyediaLanding, type SlotLanding } from '../components/landing-blok';
import { landingBawaan } from '../components/landing-kit';
import { normalisasiDokumen, urlAman, type DokumenLanding, type IsiBlok } from '../components/landing-skema';
import { formatDate } from '../lib/format';
import { useOptionalSiakad, useSiakadQuery } from './provider';

/** Data halaman dari GET /v1/tema/{aplikasi}/halaman/{halaman}. */
export interface DataHalamanLanding {
  aplikasi: string;
  lingkup: string;
  halaman: string;
  /** Isi yang tampil ke pengunjung; null = belum pernah diterbitkan (pakai templat bawaan). */
  terbit: DokumenLanding | null;
  versi: number;
  terbit_oleh: string | null;
  terbit_pada: string | null;
  sumber: { aplikasi: string; lingkup: string } | null;
  tersedia: boolean;
  berkas: Record<string, string>;
  /** Hanya dengan draf=1 (penyunting). */
  draf?: DokumenLanding | null;
  revisi?: number;
  draf_oleh?: string | null;
  draf_pada?: string | null;
}

export const pathHalaman = (aplikasi: string, halaman = 'beranda', sub = '') => `/v1/tema/${encodeURIComponent(aplikasi)}/halaman/${encodeURIComponent(halaman)}${sub}`;

/** Halaman landing terbit (publik, tanpa login). */
export function useHalamanLanding(aplikasi: string, opts: { lingkup?: string; halaman?: string; enabled?: boolean } = {}) {
  const { lingkup, halaman = 'beranda', enabled = true } = opts;
  return useSiakadQuery<DataHalamanLanding>(
    ['tema-halaman', aplikasi, lingkup ?? '', halaman],
    (s, signal) => s.request<DataHalamanLanding>({ method: 'GET', path: pathHalaman(aplikasi, halaman), query: lingkup ? { lingkup } : undefined, public: true }, { signal, maxRetries: 1 }),
    { staleTime: 60_000, enabled },
  );
}

// ---------------------------------------------------------------- penyedia data dinamis (portal)

interface KontenPortal {
  id: number;
  slug?: string;
  judul: string;
  ringkasan?: string | null;
  nomor?: string | null;
  terbit_pada?: string | null;
  mulai?: string | null;
  lokasi?: string | null;
  url?: string | null;
  gambar?: { url?: string | null; alt?: string | null } | null;
  situs?: { kode?: string; domain?: string | null } | null;
}

const JALUR_KABAR: Record<string, string> = { berita: 'berita', pengumuman: 'pengumuman', agenda: 'agenda' };

function tautanKonten(k: KontenPortal, jenis: string): string | undefined {
  const langsung = urlAman(k.url);
  if (langsung && !langsung.startsWith('aksi:')) return langsung;
  const domain = k.situs?.domain;
  return domain && /^[a-z0-9.-]+$/i.test(domain) && k.slug ? `https://${domain}/${jenis}/${encodeURIComponent(k.slug)}` : undefined;
}

/** Berita/pengumuman/agenda terbit dari /v1/portal (blok `kabar`). Tidak tampil apa pun bila kosong atau tidak terjangkau, kecuali di penyunting. */
export function KabarPortal({ isi, pratinjau }: { isi: IsiBlok; pratinjau?: boolean }) {
  const jenis = JALUR_KABAR[String(isi.jenis)] ?? 'berita';
  const jumlah = Math.max(2, Math.min(9, Number(isi.jumlah) || 3));
  const situs = typeof isi.situs === 'string' && isi.situs ? isi.situs : undefined;
  const q = useSiakadQuery<KontenPortal[]>(
    ['landing-kabar', jenis, situs ?? '', jumlah],
    (s, signal) =>
      s.request<KontenPortal[]>({ method: 'GET', path: `/v1/portal/${jenis}`, query: { situs, per_page: jumlah, ...(jenis === 'agenda' ? { waktu: 'mendatang' } : {}) }, public: true }, { signal, maxRetries: 0 }),
    { staleTime: 300_000 },
  );
  const data = (Array.isArray(q.data) ? q.data : []).slice(0, jumlah);
  if (q.error || (!q.loading && !data.length))
    return pratinjau ? <Empty bordered icon={jenis === 'agenda' ? <CalendarDays /> : <Megaphone />} title={q.error ? 'Kabar portal belum dapat dibaca' : `Belum ada ${jenis} terbit`} description={q.error ? 'Aplikasi ini belum diizinkan membaca portal Humas, atau portal sedang tidak terjangkau. Blok tidak tampil ke pengunjung.' : 'Blok ini tampil otomatis saat Humas menerbitkan isi.'} /> : null;
  const items: NewsItem[] = data.map((k) => ({
    id: k.id,
    title: k.judul,
    href: tautanKonten(k, jenis),
    excerpt: k.ringkasan ?? (jenis === 'pengumuman' ? (k.nomor ?? undefined) : undefined),
    image: jenis === 'berita' ? (k.gambar?.url ?? null) : null,
    imageAlt: k.gambar?.alt ?? '',
    date: (jenis === 'agenda' ? k.mulai : k.terbit_pada)?.replace(' ', 'T') ?? null,
    badge: jenis === 'agenda' && k.lokasi ? k.lokasi : undefined,
  }));
  if (isi.tampilan === 'daftar')
    return (
      <ul className="ul-kabar-daftar">
        {items.map((it) => (
          <li key={it.id}>
            <time>{it.date ? formatDate(String(it.date)) : ''}</time>
            {it.href ? <a href={it.href}>{it.title}</a> : <span>{it.title}</span>}
            {it.excerpt && <p>{it.excerpt}</p>}
          </li>
        ))}
      </ul>
    );
  return <NewsGrid items={items} loading={q.loading} skeletonCount={jumlah} minColumn={jenis === 'berita' ? 260 : 220} />;
}

interface StatistikSitus {
  prodi: number;
  mahasiswa_aktif: number;
  dosen_aktif: number;
  lulusan: number;
}

const angka = (n: number) => n.toLocaleString('id-ID');

/** Angka kampus dari /v1/portal/situs/{situs}/statistik (blok `statistik` bersumber kampus). */
export function StatistikKampusPortal({ isi, render }: { isi: IsiBlok; render: (butir: ButirAngka[] | null, memuat: boolean) => React.ReactNode }) {
  const situs = typeof isi.situs === 'string' && isi.situs ? isi.situs : 'univ';
  const q = useSiakadQuery<StatistikSitus>(['landing-statistik', situs], (s, signal) => s.request<StatistikSitus>({ method: 'GET', path: `/v1/portal/situs/${encodeURIComponent(situs)}/statistik`, public: true }, { signal, maxRetries: 0 }), { staleTime: 600_000 });
  const d = q.data;
  const butir: ButirAngka[] | null = d
    ? [
        { nilai: angka(d.prodi), label: 'Program studi', ikon: 'sekolah' },
        { nilai: angka(d.mahasiswa_aktif), label: 'Mahasiswa aktif', ikon: 'orang' },
        { nilai: angka(d.dosen_aktif), label: 'Dosen aktif', ikon: 'toga' },
        { nilai: angka(d.lulusan), label: 'Lulusan', ikon: 'penghargaan' },
      ]
    : null;
  return <>{render(q.error ? null : butir, q.loading)}</>;
}

export const PENYEDIA_SIAKAD: PenyediaLanding = { Kabar: KabarPortal, StatistikKampus: StatistikKampusPortal };

// ---------------------------------------------------------------- landing aplikasi

export interface LandingAplikasiProps extends Omit<HalamanLandingProps, 'dokumen' | 'berkas' | 'penyedia' | 'pratinjau' | 'terpilih' | 'onPilih'> {
  /** Kode aplikasi (lms, tracer, pmb, ...). */
  aplikasi: string;
  lingkup?: string;
  halaman?: string;
  /** Kunci templat bawaan bila halaman belum pernah diterbitkan (lms, tracer, pmb, unit, umum). Bawaan = kode aplikasi. */
  bawaan?: string;
  slot?: Record<string, SlotLanding>;
  aksi?: Record<string, AksiLanding>;
  /** Pasang judul tab dan meta deskripsi dari dokumen (bawaan true). */
  aturJudul?: boolean;
  /** Ditampilkan selama kunjungan pertama memuat (belum ada salinan di peramban). Bawaan: ruang kosong setinggi layar. */
  memuat?: React.ReactNode;
}

/**
 * Landing page aplikasi bawaan dari SIAKAD: isi terbit (diatur di Pengaturan tema → Halaman depan), atau templat
 * bawaan unipo-ui bila belum pernah diterbitkan / SIAKAD tidak terjangkau. Berita dan angka kampus otomatis.
 *
 *   <LandingAplikasi aplikasi="lms" slot={{ 'kelas-terbuka': { label: 'Kelas terbuka', render: <KatalogKelasTerbuka /> } }}
 *     aksi={{ masuk: { label: 'Masuk', href: masukUrl('/') } }} merek={<Logo />} />
 */
export function LandingAplikasi({ aplikasi, lingkup, halaman, bawaan, aturJudul = true, memuat, ...rest }: LandingAplikasiProps) {
  const siakad = useOptionalSiakad();
  const q = useHalamanLanding(aplikasi, { lingkup, halaman, enabled: !!siakad });
  const kunci = `unipo.landing.${aplikasi}.${lingkup ?? ''}.${halaman ?? 'beranda'}`;
  // Isi terbit terakhir di peramban ini: kunjungan berikutnya langsung tampil tanpa menunggu API (tanpa kedip templat).
  const [cache] = React.useState<DokumenLanding | null>(() => {
    try {
      const v = typeof localStorage !== 'undefined' ? localStorage.getItem(kunci) : null;
      return v ? normalisasiDokumen(JSON.parse(v)) : null;
    } catch {
      return null;
    }
  });
  const cadangan = React.useMemo(() => landingBawaan(bawaan ?? aplikasi), [bawaan, aplikasi]);
  const terbit = q.data?.terbit;
  React.useEffect(() => {
    if (!q.data) return;
    try {
      if (terbit) localStorage.setItem(kunci, JSON.stringify(terbit));
      else localStorage.removeItem(kunci);
    } catch {
      // penyimpanan peramban tidak tersedia: tanpa cache
    }
  }, [q.data, terbit, kunci]);
  const dok = React.useMemo(() => (terbit ? normalisasiDokumen(terbit) : q.data || q.error || !siakad ? cadangan : cache), [terbit, q.data, q.error, siakad, cadangan, cache]);
  React.useEffect(() => {
    if (!aturJudul || !dok || typeof document === 'undefined') return;
    const j = dok.halaman?.judul;
    if (j) document.title = j;
    const d = dok.halaman?.deskripsi;
    if (d) {
      let m = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!m) {
        m = document.createElement('meta');
        m.name = 'description';
        document.head.appendChild(m);
      }
      m.content = d;
    }
  }, [aturJudul, dok]);
  if (!dok) return <>{memuat ?? <div className="ul-halaman-muat" aria-busy="true" aria-label="Memuat halaman" />}</>;
  return <HalamanLanding dokumen={dok} berkas={q.data?.berkas} penyedia={PENYEDIA_SIAKAD} {...rest} />;
}
