'use client';
import * as React from 'react';
import { Pilihan } from '../components/formulir';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BadgePercent,
  BookOpen,
  BookOpenCheck,
  Briefcase,
  Building2,
  CalendarDays,
  Calculator,
  ClipboardList,
  Clock,
  FileCheck2,
  Globe,
  GraduationCap,
  Heart,
  Info,
  Laptop,
  Layers,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  Newspaper,
  Phone,
  ReceiptText,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import { formatDate, formatRupiah, formatTime } from '../lib/format';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Card, CardContent, CardHeader, Empty, Pagination, Table, TableContainer } from '../components/display';
import { Checkbox, InputGroup, Input, SegmentedControl } from '../components/forms';
import { Select } from '../components/select';
import { Sheet } from '../components/overlays';
import { Hero, NewsCard, NewsCardSkeleton, Section, AnnouncementList } from '../components/content';
import { Faq } from '../components/faq';
import { AngkaBerjalan, Animasi } from '../components/animasi';
import { ChatWidget, CtaBand, FactBoard, FeatureGrid, Gallery, SectionNav, SocialLinks, StatStrip, TestimonialGrid, Timeline, cocokkanFaq, type TimelineItem } from '../components/landing';
import { Cluster, Container, Grid, KontenHtml, PageHeader, Split, Stack, Text, teksPolos } from '../components/tata-letak';
import { pesanGalat, useSiakadQuery } from './provider';

/**
 * Halaman publik PMB (pmb.unipo.ac.id) di atas `GET /v1/pmb/info/*`: landing lengkap, detail gelombang, dan
 * pengumuman. Semua komponen membaca SDK dari <UnipoProvider> dan konteks kampus/rute dari <PmbProvider>.
 */

// ================================================================ Tipe data /v1/pmb/info
export interface JalurRingkasPmb {
  id: number;
  nama: string;
  slug: string;
}
export interface GelombangPmb {
  id: number;
  slug: string;
  nama: string;
  periode_id: string;
  tahun_akademik: string;
  jalur: JalurRingkasPmb | null;
  deskripsi: string | null;
  poster: string | null;
  sedang_buka: boolean;
  pendaftaran: { mulai: string | null; selesai: string | null };
  ujian: { mulai: string | null; selesai: string | null };
  pembayaran: { mulai: string | null; selesai: string | null };
  pengumuman_mulai: string | null;
  biaya_pendaftaran: number | null;
  maks_pilihan: number;
  kuota: number | null;
  perlu_tes: boolean;
  kontak_panitia: string | null;
}
export interface ProdiGelombangPmb {
  kode_prodi: string;
  nama_prodi: string;
  jenjang: string | null;
  kode_fakultas: string | null;
  kuota: number | null;
  jumlah_peminat: number;
}
export interface JadwalGelombangPmb {
  id?: number;
  tahap: string;
  judul: string;
  mulai: string;
  selesai: string | null;
  lokasi: string | null;
  keterangan: string | null;
}
export interface BiayaGelombangPmb {
  id?: number;
  kode_prodi: string | null;
  jenis: string;
  nama: string;
  nominal: number;
  wajib: boolean;
  bisa_dicicil: boolean;
  keterangan: string | null;
}
export interface SyaratBerkasPmb {
  jenis: string;
  nama: string;
  keterangan?: string | null;
  wajib: boolean;
  ekstensi: string[] | string;
  maks_kb: number;
  status?: string;
}
export interface GelombangDetailPmb extends GelombangPmb {
  prodi: ProdiGelombangPmb[];
  jadwal: JadwalGelombangPmb[];
  biaya: BiayaGelombangPmb[];
  syarat_berkas: SyaratBerkasPmb[];
  perlu_rapor: boolean;
  perlu_prestasi: boolean;
}
export interface JalurPmb {
  id: number;
  nama: string;
  slug: string;
  deskripsi: string | null;
  persyaratan: string | null;
  perlu_tes: boolean | number;
  perlu_wawancara?: boolean | number;
  perlu_rapor: boolean | number;
  perlu_prestasi: boolean | number;
}
export interface PengumumanPmb {
  id: number;
  slug: string;
  judul: string;
  cuplikan?: string;
  isi?: string;
  penting: boolean;
  gelombang_id: number | null;
  terbit_at: string | null;
}
export interface HeroLandingPmb {
  lencana?: string | null;
  judul?: string | null;
  sorot?: string | null;
  sub?: string | null;
  cta_utama?: string | null;
  cta_kedua?: string | null;
  gambar?: string | null;
  video?: string | null;
  poin?: string[];
}
export interface BantuanPmb {
  whatsapp?: string | null;
  email?: string | null;
  jam_layanan?: string | null;
  sapaan?: string | null;
  pesan_wa?: string | null;
  sosial?: { jenis: string; url: string }[];
}
export interface PotonganPmb {
  nama: string;
  persen: number;
  keterangan?: string | null;
}
export interface TestimoniPmb {
  id: number;
  nama: string;
  peran: string | null;
  kode_prodi: string | null;
  nama_prodi: string | null;
  foto: string | null;
  isi: string;
  rating: number | null;
  video_url: string | null;
}
export interface FaqPmb {
  id: number;
  kategori: string;
  pertanyaan: string;
  jawaban: string;
}
export interface ProdiInfoPmb {
  kode_prodi: string;
  nama_prodi: string | null;
  tagline: string | null;
  ringkasan: string | null;
  keunggulan: string[];
  prospek_karier: string[];
  akreditasi: string | null;
  gelar: string | null;
  gambar: string | null;
  video_url: string | null;
  unggulan: boolean;
}
/** Isi `GET /v1/pmb/info/landing` (diatur panitia). */
export interface LandingPmb {
  pengaturan: {
    hero: HeroLandingPmb | null;
    statistik: { nilai: string; label: string }[] | null;
    keunggulan: { ikon: string; judul: string; teks?: string | null }[] | null;
    galeri: { gambar: string; judul?: string | null }[] | null;
    bantuan: BantuanPmb | null;
    simulasi: { catatan?: string | null; potongan?: PotonganPmb[] } | null;
  };
  testimoni: TestimoniPmb[];
  faq: FaqPmb[];
  prodi: ProdiInfoPmb[];
}
/** Prodi di landing: gabungan prodi dari gelombang + profil prodi dari panitia. */
export type ProdiLandingPmb = ProdiGelombangPmb & { info?: ProdiInfoPmb };

// ================================================================ Konteks aplikasi PMB
export interface KampusPmb {
  nama: string;
  singkatan: string;
  kontak_wa?: string | null;
  kontak_email?: string | null;
  alamat?: string | null;
  situs?: string | null;
}
export interface RutePmb {
  beranda: string;
  daftar: (gelombangId?: number) => string;
  masuk: string;
  dasbor: string;
  /** Daftar gelombang lain bagi pendaftar yang sudah masuk. */
  daftarGelombang: (gelombangId: number) => string;
  gelombang: (g: { id: number; slug?: string | null }) => string;
  pengumuman: (slug?: string) => string;
  /** Area pendaftar (dasbor maba). */
  formulir: (langkah?: string) => string;
  berkas: string;
  pembayaran: string;
  ujian: string;
  ruangUjian: (pendaftaranId: string, pesertaId: number) => string;
  kartu: string;
  hasil: string;
  notifikasi: string;
  akun: string;
  pilihGelombang: string;
}
export const RUTE_PMB_BAWAAN: RutePmb = {
  beranda: '/',
  daftar: (id) => (id ? `/daftar?gelombang=${id}` : '/daftar'),
  masuk: '/masuk',
  dasbor: '/maba',
  daftarGelombang: (id) => `/maba/daftar-gelombang?gelombang=${id}`,
  gelombang: (g) => `/gelombang/${g.slug || g.id}`,
  pengumuman: (slug) => (slug ? `/pengumuman/${slug}` : '/pengumuman'),
  formulir: (langkah) => (langkah ? `/maba/formulir?langkah=${langkah}` : '/maba/formulir'),
  berkas: '/maba/berkas',
  pembayaran: '/maba/pembayaran',
  ujian: '/maba/ujian',
  ruangUjian: (pid, peserta) => `/maba/ujian/${pid}/${peserta}`,
  kartu: '/maba/kartu',
  hasil: '/maba/hasil',
  notifikasi: '/maba/notifikasi',
  akun: '/maba/akun',
  pilihGelombang: '/maba/daftar-gelombang',
};
export type RenderTautanPmb = (href: string, props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children?: React.ReactNode }) => React.ReactElement;
export interface PmbContextValue {
  kampus: KampusPmb;
  /** Pendaftar sudah masuk: tombol daftar menjadi "Buka dasbor". */
  pendaftar: boolean;
  rute: RutePmb;
  /** Tautan internal lewat router aplikasi, mis. (href, p) => <Link to={href} {...p} />. */
  renderLink?: RenderTautanPmb;
  /** Alamat umpan kabar kampus (BFF humas), mis. "/bff/kabar". Kosong = bagian kabar disembunyikan. */
  kabarUrl?: string;
  /**
   * Alamat langsung (untuk <img>/<a>) ke berkas pendaftar, mis. path => `/bff/saya${path}`. Path diawali
   * `/v1/pmb/saya/...` dipotong menjadi `/pendaftaran/...`.
   */
  urlBerkas?: (path: string) => string;
  /** Gambar kode QR (QRIS, kartu peserta). Tanpa ini QR tampil sebagai teks. */
  renderQr?: (teks: string, ukuran: number) => React.ReactNode;
}
const PmbCtx = React.createContext<PmbContextValue>({ kampus: { nama: 'Universitas Pohuwato', singkatan: 'UNIPO' }, pendaftar: false, rute: RUTE_PMB_BAWAAN });

/** Pasang sekali di aplikasi PMB (di dalam <UnipoProvider>). */
export function PmbProvider({ children, rute, ...v }: Omit<PmbContextValue, 'rute'> & { rute?: Partial<RutePmb>; children: React.ReactNode }) {
  const nilai = React.useMemo(() => ({ ...v, rute: { ...RUTE_PMB_BAWAAN, ...rute } }), [v.kampus, v.pendaftar, v.renderLink, v.kabarUrl, v.urlBerkas, v.renderQr, rute]); // eslint-disable-line react-hooks/exhaustive-deps
  return <PmbCtx.Provider value={nilai}>{children}</PmbCtx.Provider>;
}
export const usePmb = () => React.useContext(PmbCtx);

/** Tautan internal PMB (lewat router aplikasi bila renderLink dipasang). */
export function TautanPmb({ href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const { renderLink } = usePmb();
  return renderLink && !/^(https?:|mailto:|tel:|#)/.test(href) ? renderLink(href, props) : <a href={href} {...props} />;
}

// ================================================================ Utilitas
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const keDate = (s?: string | null) => {
  if (!s) return null;
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
};
/** "12 Jan 2026". */
export const tanggalPmb = (s?: string | null) => {
  const d = keDate(s);
  return d ? `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}` : '-';
};
/** Tanggal saja bila jamnya 00:00 (kegiatan sepanjang hari), selain itu tanggal + jam. */
export const waktuPmb = (s?: string | null) => (!s ? '-' : /[ T]00:00(:00)?$/.test(s) || s.length <= 10 ? tanggalPmb(s) : `${tanggalPmb(s)}, ${formatTime(keDate(s))}`);
export const rentangPmb = (a?: string | null, b?: string | null) => (!a && !b ? '-' : !b || a === b ? tanggalPmb(a) : `${tanggalPmb(a)} – ${tanggalPmb(b)}`);
/** Sisa hari sampai tanggal (null bila lewat). */
export const sisaHari = (s?: string | null) => {
  if (!s) return null;
  const n = Math.ceil((new Date(`${s.slice(0, 10)}T23:59:59`).getTime() - Date.now()) / 86_400_000);
  return n >= 0 ? n : null;
};
/** Kode periode SIAKAD "20261" -> "2026/2027". */
export const labelTahunPmb = (ta?: string | null) => (ta && /^\d{5}$/.test(ta) ? `${ta.slice(0, 4)}/${Number(ta.slice(0, 4)) + 1}` : (ta ?? ''));
const JENJANG: Record<string, string> = { A: 'S3', B: 'S2', C: 'S1', D: 'D4', E: 'D3', F: 'D2', G: 'D1', H: 'Sp-1', I: 'Sp-2', J: 'Profesi' };
/** Kode jenjang SIAKAD (C = S1, E = D3, ...) ke label. */
export const labelJenjang = (j?: string | null) => (j ? (JENJANG[j] ?? j) : 'S1');
const KATA_KECIL = new Set(['dan', 'di', 'ke', 'dari', 'atau', 'untuk', 'pada', 'dengan', 'yang']);
/** "FAKULTAS ILMU SOSIAL DAN ILMU POLITIK" -> "Fakultas Ilmu Sosial dan Ilmu Politik". */
export const hurufJudul = (s: string) =>
  s
    .toLowerCase()
    .replace(/[\p{L}\p{N}]+/gu, (w, i: number) => (i > 0 && KATA_KECIL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)));
const rupiahAtauGratis = (n?: number | null) => (n == null ? '-' : n === 0 ? 'Gratis' : formatRupiah(n));
const ya = (v: unknown) => v === true || v === 1 || v === '1';

/** Gelombang yang sedang buka paling dulu, lalu yang akan datang, lalu yang sudah tutup. */
export function urutkanGelombang<G extends GelombangPmb>(d: G[] = []): G[] {
  const kini = new Date().toISOString().slice(0, 10);
  const skor = (g: G) => (g.sedang_buka ? 0 : (g.pendaftaran.mulai ?? '') > kini ? 1 : 2);
  return [...d].sort((a, b) => skor(a) - skor(b) || (a.pendaftaran.selesai ?? '').localeCompare(b.pendaftaran.selesai ?? ''));
}
export function keadaanGelombang(g: GelombangPmb): { label: string; variant: 'success' | 'warning' | 'neutral' } {
  const kini = new Date().toISOString().slice(0, 10);
  if (g.sedang_buka) return { label: 'Sedang dibuka', variant: 'success' };
  if ((g.pendaftaran.mulai ?? '') > kini) return { label: 'Segera dibuka', variant: 'warning' };
  return { label: 'Ditutup', variant: 'neutral' };
}
/** Nomor WA ke format wa.me (08xx -> 628xx). */
export const nomorWa = (hp?: string | null) => (hp ? hp.replace(/\D/g, '').replace(/^0/, '62') : null);
/** Kontak bantuan dari pengaturan landing, dengan cadangan kontak kampus. */
export function kontakBantuanPmb(b: BantuanPmb | null | undefined, kampus: KampusPmb) {
  const wa = nomorWa(b?.whatsapp || kampus.kontak_wa);
  const pesan = b?.pesan_wa || 'Halo panitia PMB, saya ingin bertanya tentang pendaftaran.';
  return {
    wa,
    pesan,
    tautanWa: wa ? `https://wa.me/${wa}?text=${encodeURIComponent(pesan)}` : null,
    email: b?.email || kampus.kontak_email || null,
    jam: b?.jam_layanan || null,
    sapaan: b?.sapaan || 'Halo! Ada yang bisa kami bantu soal pendaftaran?',
    sosial: b?.sosial ?? [],
  };
}
/** Buka jendela tanya jawab PMB dari mana saja, opsional dengan pertanyaan awal. */
export const bukaAsistenPmb = (tanya?: string) => window.dispatchEvent(new CustomEvent('pmb:buka-chat', { detail: tanya }));

const LABEL_TAHAP: Record<string, string> = {
  pendaftaran: 'Pendaftaran',
  pembayaran: 'Pembayaran',
  verifikasi_berkas: 'Verifikasi berkas',
  tes: 'Tes seleksi',
  wawancara: 'Wawancara',
  pengumuman: 'Pengumuman',
  daftar_ulang: 'Daftar ulang',
  pkkmb: 'PKKMB',
  lainnya: 'Kegiatan',
};
const IKON_KEUNGGULAN: Record<string, React.ComponentType<{ 'aria-hidden'?: boolean }>> = {
  laptop: Laptop,
  shield: ShieldCheck,
  users: Users,
  award: Award,
  book: BookOpen,
  building: Building2,
  globe: Globe,
  heart: Heart,
  briefcase: Briefcase,
  sparkles: Sparkles,
  graduation: GraduationCap,
  wallet: Wallet,
  clock: Clock,
  star: Star,
};
/** Nama ikon pilihan panitia ("laptop", "award", ...) ke ikon. */
export function IkonKeunggulan({ nama }: { nama?: string | null }) {
  const I = IKON_KEUNGGULAN[nama ?? ''] ?? Sparkles;
  return <I aria-hidden />;
}

// ================================================================ Hook data
export const useGelombangPmb = () => useSiakadQuery<GelombangPmb[]>(['pmb-info', 'gelombang'], (s, signal) => s.pmb.getInfoGelombang({}, { signal }) as never, { staleTime: 60_000 });
export const useGelombangDetailPmb = (id?: string | number | null) =>
  useSiakadQuery<GelombangDetailPmb>(['pmb-info', 'gelombang', String(id)], (s, signal) => s.pmb.getInfoGelombangById(id!, {}, { signal }) as never, {
    enabled: id != null && id !== '',
    staleTime: 60_000,
  });
export const useJalurPmb = () => useSiakadQuery<JalurPmb[]>(['pmb-info', 'jalur'], (s, signal) => s.pmb.getInfoJalur({}, { signal }) as never, { staleTime: 300_000 });
export const usePengumumanPmb = (q: { page?: number; per_page?: number; gelombang_id?: number } = {}) =>
  useSiakadQuery<PengumumanPmb[]>(
    ['pmb-info', 'pengumuman', q],
    (s, signal) => s.pmb.getInfoPengumuman({ ...q, gelombang_id: q.gelombang_id ? String(q.gelombang_id) : undefined }, { signal }) as never,
  );
export const usePengumumanDetailPmb = (slug?: string) =>
  useSiakadQuery<PengumumanPmb>(['pmb-info', 'pengumuman', slug], (s, signal) => s.pmb.getInfoPengumumanBySlug(slug!, {}, { signal }) as never, { enabled: !!slug });
export const useLandingPmb = () => useSiakadQuery<LandingPmb>(['pmb-info', 'landing'], (s, signal) => s.pmb.getInfoLanding({}, { signal }) as never, { staleTime: 300_000 });

/** Rincian beberapa gelombang sekaligus (prodi, biaya, jadwal). */
export function useGelombangDetailBanyakPmb(ids: number[]) {
  const kunci = ids.join(',');
  return useSiakadQuery<GelombangDetailPmb[]>(
    ['pmb-info', 'gelombang-banyak', kunci],
    async (s, signal) => {
      const hasil = await Promise.all(ids.map((id) => s.pmb.getInfoGelombangById(id, {}, { signal }).catch(() => null)));
      const data = hasil.filter(Boolean).map((r) => r!.data as unknown as GelombangDetailPmb);
      return { data, status: 200, requestId: null, environment: null, headers: {} } as never;
    },
    { enabled: ids.length > 0, staleTime: 60_000 },
  );
}

/**
 * Data landing PMB terolah: gelombang terurut, yang sedang buka, prodi gabungan dari gelombang yang dibuka (diperkaya
 * profil prodi panitia), dan gelombang untuk simulasi biaya (yang sudah punya rincian biaya didahulukan).
 */
export function useDataLandingPmb() {
  const landing = useLandingPmb();
  const gel = useGelombangPmb();
  const jalur = useJalurPmb();
  const urut = React.useMemo(() => urutkanGelombang(gel.data ?? []), [gel.data]);
  const buka = urut.filter((g) => g.sedang_buka);
  const sumber = (buka.length ? buka : urut).slice(0, 6);
  const detail = useGelombangDetailBanyakPmb(sumber.map((g) => g.id));
  const prodi = React.useMemo(() => {
    const info = new Map((landing.data?.prodi ?? []).map((i) => [i.kode_prodi, i]));
    const m = new Map<string, ProdiLandingPmb>();
    (detail.data ?? []).forEach((d) =>
      d.prodi.forEach((x) => {
        const ada = m.get(x.kode_prodi);
        m.set(
          x.kode_prodi,
          ada
            ? { ...ada, kuota: ada.kuota == null || x.kuota == null ? null : ada.kuota + x.kuota, jumlah_peminat: (ada.jumlah_peminat ?? 0) + (x.jumlah_peminat ?? 0) }
            : { ...x, info: info.get(x.kode_prodi) },
        );
      }),
    );
    if (!m.size)
      info.forEach((i) => m.set(i.kode_prodi, { kode_prodi: i.kode_prodi, nama_prodi: i.nama_prodi ?? i.kode_prodi, jenjang: null, kode_fakultas: null, kuota: null, jumlah_peminat: 0, info: i }));
    return [...m.values()].sort((a, b) => (a.nama_prodi ?? '').localeCompare(b.nama_prodi ?? ''));
  }, [detail.data, landing.data]);
  const adaBiaya = new Set((detail.data ?? []).filter((d) => d.biaya.length).map((d) => d.id));
  const gelombangSimulasi = [...(buka.length ? buka : urut)].sort((a, b) => Number(adaBiaya.has(b.id)) - Number(adaBiaya.has(a.id)));
  const biayaTermurah = buka.length ? Math.min(...buka.map((g) => g.biaya_pendaftaran ?? 0)) : null;
  return {
    landing: landing.data,
    gelombang: urut,
    buka,
    utama: buka[0] ?? urut[0],
    jalur: jalur.data ?? [],
    prodi,
    gelombangSimulasi,
    biayaTermurah,
    memuat: { landing: landing.loading, gelombang: gel.loading, jalur: jalur.loading, prodi: gel.loading || landing.loading || detail.loading },
    galat: landing.error ?? gel.error,
  };
}

// ================================================================ Tombol daftar
/** Tombol utama: "Daftar sekarang" bagi pengunjung, "Buka dasbor saya" bagi pendaftar yang sudah masuk. */
export function TombolDaftarPmb({
  gelombang,
  label,
  size = 'lg',
  variant = 'primary',
  fullWidth,
  className,
}: {
  gelombang?: GelombangPmb;
  label?: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'outline' | 'soft';
  fullWidth?: boolean;
  className?: string;
}) {
  const { pendaftar, rute } = usePmb();
  const href = pendaftar ? rute.dasbor : rute.daftar(gelombang?.sedang_buka ? gelombang.id : undefined);
  return (
    <Button size={size} variant={variant} fullWidth={fullWidth} className={className} render={<TautanPmb href={href} />}>
      {pendaftar ? 'Buka dasbor saya' : (label ?? 'Daftar sekarang')} <ArrowRight aria-hidden />
    </Button>
  );
}

// ================================================================ Hero
const ALUR_DAFTAR: [string, string][] = [
  ['Buat akun', 'Daftar dengan email aktif, lalu verifikasi.'],
  ['Isi formulir dan unggah berkas', 'Pilih jalur, gelombang, dan program studi.'],
  ['Bayar formulir', 'Lewat virtual account atau QRIS.'],
  ['Ikuti seleksi', 'Ujian CBT atau seleksi berkas sesuai jalur, lalu lihat pengumuman.'],
];

export interface HeroPmbProps {
  hero?: HeroLandingPmb | null;
  gelombang?: GelombangPmb;
  biaya?: number | null;
  jalur?: string[];
  jumlahProdi?: number;
  galeri?: { gambar: string; judul?: string | null }[] | null;
  loading?: boolean;
  /** Tautan tombol kedua; bawaan "#jalur". */
  hrefKedua?: string;
}
/** Hero landing PMB: judul resmi, tombol daftar, foto kampus (atau alur pendaftaran), dan papan fakta pendaftaran. */
export function HeroPmb({ hero: h, gelombang: g, biaya, jalur = [], jumlahProdi = 0, galeri, loading, hrefKedua = '#jalur' }: HeroPmbProps) {
  const { kampus } = usePmb();
  const tahun = labelTahunPmb(g?.tahun_akademik);
  const sisa = g?.sedang_buka ? sisaHari(g.pendaftaran.selesai) : null;
  const foto = h?.gambar || galeri?.[0]?.gambar || null;
  const ket = h?.gambar ? null : galeri?.[0]?.judul;
  const nominal = biaya ?? g?.biaya_pendaftaran;
  // Lencana tidak mengulang tahun bila panitia sudah menuliskannya.
  const dasar = h?.lencana || 'Penerimaan Mahasiswa Baru';
  const lencana = tahun && !dasar.includes(tahun) ? `${dasar} ${tahun}` : dasar;
  return (
    <div className="u-pmb-hero">
      <Container>
        <Hero
          eyebrow={g?.sedang_buka ? undefined : lencana}
          announcement={
            g?.sedang_buka ? (
              <>
                <Badge variant="success" dot>
                  {tahun ? `PMB ${tahun}` : 'PMB'}
                </Badge>
                <span>
                  {g.nama} dibuka{sisa != null ? ` · tinggal ${sisa} hari` : ''}
                </span>
              </>
            ) : undefined
          }
          title={
            <>
              {h?.judul || 'Penerimaan Mahasiswa Baru'} <span className="u-pmb-sorot">{h?.sorot || kampus.nama}</span>
            </>
          }
          description={h?.sub || 'Pendaftaran, pembayaran, ujian, dan pengumuman hasil seleksi dilakukan secara online.'}
          actions={
            <>
              <TombolDaftarPmb gelombang={g} label={h?.cta_utama || undefined} />
              <Button size="lg" variant="ghost" render={<a href={hrefKedua} />}>
                {h?.cta_kedua || 'Lihat jalur dan jadwal'}
              </Button>
            </>
          }
          media={
            foto ? (
              <figure className="u-pmb-hero-foto">
                <img src={foto} alt={ket || `Kampus ${kampus.nama}`} />
                {ket && <figcaption>{ket}</figcaption>}
              </figure>
            ) : (
              <div className="u-pmb-alur">
                <p className="u-pmb-alur-judul">Alur pendaftaran</p>
                <ol>
                  {ALUR_DAFTAR.map(([j, t], i) => (
                    <li key={j}>
                      <span>{i + 1}</span>
                      <div>
                        <strong>{j}</strong>
                        <p>{t}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )
          }
        />
        {!!h?.poin?.length && (
          <ul className="u-pmb-poin">
            {h.poin.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        <FactBoard
          loading={loading}
          className="u-pmb-fakta"
          items={[
            {
              icon: <CalendarDays aria-hidden />,
              label: g?.sedang_buka ? 'Pendaftaran dibuka' : 'Pendaftaran',
              value: g ? `s.d. ${tanggalPmb(g.pendaftaran.selesai)}` : 'Segera diumumkan',
              hint: g ? (sisa != null ? `${g.nama} · tinggal ${sisa} hari` : g.nama) : undefined,
            },
            { icon: <Wallet aria-hidden />, label: 'Biaya formulir', value: rupiahAtauGratis(nominal), hint: g ? 'Bayar lewat VA atau QRIS' : undefined },
            { icon: <Route aria-hidden />, label: 'Jalur masuk', value: jalur.length ? `${jalur.length} jalur` : '-', hint: jalur.slice(0, 3).join(', ') || undefined },
            { icon: <GraduationCap aria-hidden />, label: 'Program studi', value: jumlahProdi ? `${jumlahProdi} prodi` : '-', hint: g ? `Pilih hingga ${g.maks_pilihan} prodi` : undefined },
          ]}
        />
      </Container>
    </div>
  );
}

// ================================================================ Sekilas kampus
/** Angka, keunggulan, dan galeri kampus yang diatur panitia. */
export function SekilasPmb({ landing, id = 'sekilas' }: { landing?: LandingPmb; id?: string }) {
  const { kampus } = usePmb();
  const p = landing?.pengaturan;
  if (!p?.statistik?.length && !p?.keunggulan?.length && !p?.galeri?.length) return null;
  return (
    <Section id={id} className="u-pmb-bagian" eyebrow={`Mengenal ${kampus.singkatan}`} title={`Kenapa kuliah di ${kampus.singkatan}?`}>
      <Stack gap={8}>
        {!!p.statistik?.length && <StatStrip items={p.statistik.map((s) => ({ value: s.nilai, label: s.label }))} />}
        {!!p.keunggulan?.length && (
          <FeatureGrid columns={p.keunggulan.length % 3 === 0 ? 3 : 2} items={p.keunggulan.map((k) => ({ icon: <IkonKeunggulan nama={k.ikon} />, title: k.judul, text: k.teks ?? undefined }))} />
        )}
        {!!p.galeri?.length && <Gallery items={p.galeri.map((g) => ({ src: g.gambar, caption: g.judul ?? undefined, alt: g.judul ?? '' }))} />}
      </Stack>
    </Section>
  );
}

// ================================================================ Jalur & jadwal
function statusJadwal(j: JadwalGelombangPmb, kini: number): 'done' | 'active' | 'upcoming' {
  const a = keDate(j.mulai)?.getTime() ?? 0;
  const b = j.selesai ? (keDate(j.selesai)?.getTime() ?? a) : a + 86_400_000;
  return kini > b ? 'done' : kini >= a ? 'active' : 'upcoming';
}
/** Jadwal gelombang ke butir garis waktu (pendaftaran ditambahkan bila tidak ada di jadwal). */
export function jadwalKeLinimasa(g: GelombangDetailPmb | GelombangPmb, jadwal: JadwalGelombangPmb[] = []): TimelineItem[] {
  const j = [...jadwal];
  if (!j.some((x) => x.tahap === 'pendaftaran') && g.pendaftaran.mulai)
    j.unshift({ tahap: 'pendaftaran', judul: 'Pendaftaran online', mulai: g.pendaftaran.mulai, selesai: g.pendaftaran.selesai, lokasi: null, keterangan: null });
  if (!jadwal.length) {
    if (g.perlu_tes && g.ujian.mulai) j.push({ tahap: 'tes', judul: 'Ujian seleksi', mulai: g.ujian.mulai, selesai: g.ujian.selesai, lokasi: null, keterangan: null });
    if (g.pengumuman_mulai) j.push({ tahap: 'pengumuman', judul: 'Pengumuman hasil', mulai: g.pengumuman_mulai, selesai: null, lokasi: null, keterangan: null });
  }
  const kini = Date.now();
  return j
    .sort((a, b) => a.mulai.localeCompare(b.mulai))
    .map((x, i) => {
      const st = statusJadwal(x, kini);
      return {
        id: `${x.tahap}-${i}`,
        title: x.judul,
        time: x.selesai ? `${waktuPmb(x.mulai)} – ${waktuPmb(x.selesai)}` : waktuPmb(x.mulai),
        place: x.lokasi ?? undefined,
        description: x.keterangan ?? undefined,
        status: st,
        badge: st === 'upcoming' ? (LABEL_TAHAP[x.tahap] ?? x.tahap) : undefined,
      };
    });
}

function LinimasaGelombang({ g }: { g: GelombangPmb }) {
  const d = useGelombangDetailPmb(g.id);
  return <Timeline loading={d.loading} items={jadwalKeLinimasa(d.data ?? g, d.data?.jadwal)} empty={<Empty title="Jadwal segera diumumkan" />} />;
}

function syaratJalur(j: JalurPmb) {
  return [
    ya(j.perlu_tes) && { ikon: <BookOpenCheck aria-hidden />, t: 'Tes CBT' },
    ya(j.perlu_wawancara) && { ikon: <MessagesSquare aria-hidden />, t: 'Wawancara' },
    ya(j.perlu_rapor) && { ikon: <ClipboardList aria-hidden />, t: 'Nilai rapor' },
    ya(j.perlu_prestasi) && { ikon: <Trophy aria-hidden />, t: 'Prestasi' },
  ].filter(Boolean) as { ikon: React.ReactNode; t: string }[];
}

/** Kartu satu gelombang (status, tanggal, biaya formulir). */
export function KartuGelombangPmb({ g, dipilih, onPilih, tautan = true }: { g: GelombangPmb; dipilih?: boolean; onPilih?: () => void; tautan?: boolean }) {
  const { rute } = usePmb();
  const st = keadaanGelombang(g);
  const isi = (
    <>
      <Cluster justify="between" align="start" wrap={false}>
        <Text weight="semibold">{g.nama}</Text>
        <Badge variant={st.variant} dot>
          {st.label}
        </Badge>
      </Cluster>
      <Text size="sm" tone="muted">
        {rentangPmb(g.pendaftaran.mulai, g.pendaftaran.selesai)} · formulir {g.biaya_pendaftaran ? formatRupiah(g.biaya_pendaftaran) : 'gratis'}
      </Text>
    </>
  );
  return (
    <div className="u-pmb-gelombang" data-dipilih={dipilih || undefined}>
      {onPilih ? (
        <button type="button" onClick={onPilih} aria-pressed={dipilih} className="u-pmb-gelombang-pilih">
          {isi}
        </button>
      ) : (
        <div className="u-pmb-gelombang-pilih">{isi}</div>
      )}
      {tautan && (dipilih || !onPilih) && (
        <TautanPmb href={rute.gelombang(g)} className="u-pmb-tautan">
          Detail & syarat <ArrowRight aria-hidden />
        </TautanPmb>
      )}
    </div>
  );
}

/** Jalur masuk (pilih untuk menyaring gelombang), daftar gelombang, dan jadwal penting gelombang terpilih. */
export function JalurJadwalPmb({ jalur = [], gelombang = [], loading, id = 'jalur' }: { jalur?: JalurPmb[]; gelombang?: GelombangPmb[]; loading?: boolean; id?: string }) {
  const [pilihJalur, setPilihJalur] = React.useState<number | null>(null);
  const tersaring = pilihJalur ? gelombang.filter((g) => g.jalur?.id === pilihJalur) : gelombang;
  const [pilihG, setPilihG] = React.useState<number | null>(null);
  const g = tersaring.find((x) => x.id === pilihG) ?? tersaring[0];
  return (
    <Section
      id={id}
      className="u-pmb-bagian"
      eyebrow="Jalur & jadwal"
      title="Jalur masuk dan tanggal penting"
      description="Setiap jalur punya syarat dan tahapan sendiri. Pilih jalur untuk melihat gelombang dan jadwalnya."
    >
      <Grid min={220} gap={4}>
        {loading && [1, 2, 3, 4].map((i) => <Skeleton key={i} height={150} />)}
        {jalur.map((j, i) => {
          const aktif = pilihJalur === j.id;
          const jml = gelombang.filter((x) => x.jalur?.id === j.id && x.sedang_buka).length;
          return (
            <Animasi key={j.id} jenis="masuk" tunda={i} pemicu="terlihat">
              <button
                type="button"
                className="u-pmb-jalur"
                aria-pressed={aktif}
                onClick={() => {
                  setPilihJalur(aktif ? null : j.id);
                  setPilihG(null);
                }}
              >
                <span className="u-pmb-jalur-nama">{j.nama}</span>
                {j.deskripsi && <span className="u-pmb-jalur-desk">{teksPolos(j.deskripsi)}</span>}
                <span className="u-pmb-jalur-tag">
                  {syaratJalur(j).map((s) => (
                    <span key={s.t}>
                      {s.ikon}
                      {s.t}
                    </span>
                  ))}
                  {jml > 0 && <span data-tone="success">{jml} gelombang buka</span>}
                </span>
              </button>
            </Animasi>
          );
        })}
      </Grid>
      <Split
        id="gelombang"
        className="u-pmb-gelombang-split"
        asideWidth={460}
        breakpoint={960}
        gap={8}
        aside={
          <Stack gap={3}>
            <div>
              <Text as="div" weight="bold" size="lg">
                Jadwal penting
              </Text>
              <Text size="sm" tone="muted">
                {g ? g.nama : 'Pilih gelombang'}
              </Text>
            </div>
            {g ? <LinimasaGelombang g={g} /> : <Empty title="Pilih gelombang" />}
          </Stack>
        }
      >
        <Stack gap={3}>
          <Text as="div" weight="bold" size="lg">
            Gelombang {pilihJalur ? jalur.find((j) => j.id === pilihJalur)?.nama : 'pendaftaran'}
          </Text>
          {loading && <Skeleton height={96} />}
          {!loading && !tersaring.length && <Empty title="Belum ada gelombang" description="Pantau halaman ini atau hubungi panitia." />}
          {tersaring.map((x) => (
            <KartuGelombangPmb key={x.id} g={x} dipilih={g?.id === x.id} onPilih={() => setPilihG(x.id)} />
          ))}
        </Stack>
      </Split>
    </Section>
  );
}

// ================================================================ Program studi
function KartuProdi({ p, onBuka }: { p: ProdiLandingPmb; onBuka: () => void }) {
  const i = p.info;
  return (
    <button type="button" className="u-pmb-prodi" onClick={onBuka}>
      {i?.gambar && <img src={i.gambar} alt="" loading="lazy" className="u-pmb-prodi-img" />}
      <span className="u-pmb-prodi-meta">
        {labelJenjang(p.jenjang)}
        {i?.unggulan && (
          <Badge variant="warning">
            <Star aria-hidden /> Unggulan
          </Badge>
        )}
      </span>
      <span className="u-pmb-prodi-nama">{hurufJudul(p.nama_prodi ?? p.kode_prodi).replace(/\//g, '/​')}</span>
      {i?.tagline && <span className="u-pmb-prodi-tagline">{i.tagline}</span>}
      <span className="u-pmb-prodi-kaki">
        {i?.akreditasi && (
          <span>
            <BadgeCheck aria-hidden /> Akreditasi {i.akreditasi}
          </span>
        )}
        {p.kuota ? (
          <span>
            <Users aria-hidden /> Kuota {p.kuota}
          </span>
        ) : null}
        <span className="u-pmb-tautan">
          Detail <ArrowRight aria-hidden />
        </span>
      </span>
    </button>
  );
}

/** Rincian satu prodi (keunggulan, prospek karier, gelar) dalam panel samping. */
export function DetailProdiPmb({ prodi: p, onClose }: { prodi: ProdiLandingPmb | null; onClose: () => void }) {
  const { rute } = usePmb();
  const i = p?.info;
  return (
    <Sheet
      open={!!p}
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={p ? hurufJudul(p.nama_prodi ?? p.kode_prodi) : ''}
      description={p ? [labelJenjang(p.jenjang), i?.gelar, i?.akreditasi && `Akreditasi ${i.akreditasi}`].filter(Boolean).join(' · ') : ''}
      footer={
        <Button render={<TautanPmb href={rute.daftar()} />}>
          Daftar ke prodi ini <ArrowRight aria-hidden />
        </Button>
      }
    >
      {p && (
        <Stack gap={5}>
          {i?.gambar && <img src={i.gambar} alt="" className="u-pmb-prodi-sampul" />}
          {i?.tagline && (
            <Text size="lg" weight="semibold">
              {i.tagline}
            </Text>
          )}
          {i?.ringkasan && (
            <Text tone="muted" style={{ whiteSpace: 'pre-line' }}>
              {i.ringkasan}
            </Text>
          )}
          <Grid cols={3} gap={3}>
            {[
              ['Kuota', p.kuota ?? 'Tidak dibatasi'],
              ['Peminat saat ini', p.jumlah_peminat ?? 0],
              ['Gelar lulusan', i?.gelar ?? '-'],
            ].map(([l, v]) => (
              <div key={String(l)} className="u-pmb-kotak">
                <Text size="xs" tone="muted">
                  {l}
                </Text>
                <Text weight="bold">{v}</Text>
              </div>
            ))}
          </Grid>
          {!!i?.keunggulan.length && (
            <Stack gap={2}>
              <Text weight="semibold">Keunggulan</Text>
              <FeatureGrid columns={2} items={i.keunggulan.map((k) => ({ icon: <Sparkles aria-hidden />, title: k }))} />
            </Stack>
          )}
          {!!i?.prospek_karier.length && (
            <Stack gap={2}>
              <Text weight="semibold">Prospek karier</Text>
              <Cluster gap={2}>
                {i.prospek_karier.map((k) => (
                  <Badge key={k} variant="primary">
                    {k}
                  </Badge>
                ))}
              </Cluster>
            </Stack>
          )}
          {i?.video_url && (
            <a href={i.video_url} target="_blank" rel="noopener noreferrer" className="u-pmb-tautan">
              Tonton video profil prodi <ArrowRight aria-hidden />
            </a>
          )}
          {!i && <Alert variant="info">Panitia belum menambahkan profil lengkap prodi ini. Hubungi panitia untuk informasi lebih lanjut.</Alert>}
        </Stack>
      )}
    </Sheet>
  );
}

/** Program studi yang dibuka, dengan saring jenjang, pencarian, dan panel detail. */
export function ProdiPmb({ prodi = [], loading, id = 'prodi', batas = 8 }: { prodi?: ProdiLandingPmb[]; loading?: boolean; id?: string; batas?: number }) {
  const [cari, setCari] = React.useState('');
  const [jenjang, setJenjang] = React.useState('semua');
  const [detail, setDetail] = React.useState<ProdiLandingPmb | null>(null);
  const [semua, setSemua] = React.useState(false);
  const daftarJenjang = React.useMemo(() => [...new Set(prodi.map((p) => labelJenjang(p.jenjang)))], [prodi]);
  const tampil = React.useMemo(
    () =>
      prodi
        .filter((p) => jenjang === 'semua' || labelJenjang(p.jenjang) === jenjang)
        .filter((p) => !cari || `${p.nama_prodi} ${p.info?.tagline ?? ''} ${p.info?.prospek_karier.join(' ') ?? ''}`.toLowerCase().includes(cari.toLowerCase()))
        .sort((a, b) => Number(!!b.info?.unggulan) - Number(!!a.info?.unggulan)),
    [prodi, cari, jenjang],
  );
  const potong = semua || cari ? tampil : tampil.slice(0, batas);
  return (
    <Section
      id={id}
      className="u-pmb-bagian"
      eyebrow="Program studi"
      title="Program studi yang dibuka"
      description="Pilih program studi untuk melihat keunggulan, prospek karier, dan gelar lulusannya."
      actions={
        <Cluster gap={2}>
          {daftarJenjang.length > 1 && (
            <SegmentedControl value={jenjang} onValueChange={(v) => setJenjang(v)} options={[{ value: 'semua', label: 'Semua' }, ...daftarJenjang.map((j) => ({ value: j, label: j }))]} />
          )}
          <InputGroup start={<Search aria-hidden />} className="u-pmb-cari">
            <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari prodi atau karier…" aria-label="Cari program studi" />
          </InputGroup>
        </Cluster>
      }
    >
      <Grid min={240} gap={4}>
        {loading && [1, 2, 3, 4].map((i) => <Skeleton key={i} height={160} />)}
        {!loading &&
          potong.map((p, i) => (
            <Animasi key={p.kode_prodi} jenis="masuk" tunda={i % 4} pemicu="terlihat">
              <KartuProdi p={p} onBuka={() => setDetail(p)} />
            </Animasi>
          ))}
      </Grid>
      {!loading && !semua && !cari && tampil.length > batas && (
        <Cluster justify="center" style={{ marginTop: 'var(--u-space-6)' }}>
          <Button variant="outline" onClick={() => setSemua(true)}>
            Lihat semua {tampil.length} program studi <ArrowRight aria-hidden />
          </Button>
        </Cluster>
      )}
      {!loading && !tampil.length && (
        <Empty
          bordered
          title={prodi.length ? 'Prodi tidak ditemukan' : 'Daftar prodi segera diumumkan'}
          description={prodi.length ? 'Coba kata kunci lain.' : 'Program studi tampil saat gelombang pendaftaran dibuka.'}
        />
      )}
      <DetailProdiPmb prodi={detail} onClose={() => setDetail(null)} />
    </Section>
  );
}

// ================================================================ Simulasi biaya
/** Jenis biaya yang menerima potongan (beasiswa/diskon) dalam simulasi. */
const KENA_POTONGAN = ['ukt', 'spp', 'bpp', 'sks'];
const BUKAN_DAFTAR_ULANG = ['formulir', 'pendaftaran'];

/** Rincian biaya resmi per gelombang + simulasi (prodi, biaya opsional, potongan) dengan total yang bergulir. */
export function SimulasiBiayaPmb({ gelombang = [], simulasi, loading, id = 'biaya' }: { gelombang?: GelombangPmb[]; simulasi?: LandingPmb['pengaturan']['simulasi']; loading?: boolean; id?: string }) {
  const { rute } = usePmb();
  const [gid, setGid] = React.useState<string | null>(null);
  const g = gelombang.find((x) => String(x.id) === gid) ?? gelombang[0];
  const d = useGelombangDetailPmb(g?.id);
  const [prodi, setProdi] = React.useState<string | null>(null);
  const [opsional, setOpsional] = React.useState<Record<string, boolean>>({});
  const [potongan, setPotongan] = React.useState('-1');
  const daftarProdi = d.data?.prodi ?? [];
  const kodeProdi = daftarProdi.some((p) => p.kode_prodi === prodi) ? prodi! : (daftarProdi[0]?.kode_prodi ?? '');
  const kunci = (b: BiayaGelombangPmb, i: number) => String(b.id ?? `${b.jenis}-${i}`);
  const item = React.useMemo(() => (d.data?.biaya ?? []).filter((b) => !BUKAN_DAFTAR_ULANG.includes(b.jenis) && (!b.kode_prodi || b.kode_prodi === kodeProdi)), [d.data, kodeProdi]);
  const pot = simulasi?.potongan?.[Number(potongan)];
  const hitung = React.useMemo(() => {
    const formulir = g?.biaya_pendaftaran ?? 0;
    let daftarUlang = 0;
    let hemat = 0;
    item.forEach((b, i) => {
      if (!b.wajib && !opsional[kunci(b, i)]) return;
      daftarUlang += b.nominal;
      if (pot && KENA_POTONGAN.includes(b.jenis)) hemat += Math.round((b.nominal * pot.persen) / 100);
    });
    return { formulir, daftarUlang, hemat, total: formulir + daftarUlang - hemat };
  }, [g, item, opsional, pot]);
  const bisaCicil = item.filter((b, i) => b.bisa_dicicil && (b.wajib || opsional[kunci(b, i)]));

  return (
    <Section
      id={id}
      className="u-pmb-bagian"
      eyebrow="Biaya"
      title="Rincian dan simulasi biaya"
      description="Komponen biaya sesuai ketetapan panitia untuk setiap gelombang. Pilih gelombang dan program studi untuk melihat perkiraan biaya awal."
    >
      {loading && <Skeleton height={380} />}
      {!loading && !g && <Empty bordered title="Biaya diumumkan bersama gelombang" description="Simulasi tersedia setelah panitia membuka gelombang pendaftaran." />}
      {g && (
        <Split
          breakpoint={960}
          asideWidth={360}
          sticky
          aside={
            <div className="u-pmb-total">
              <p className="u-pmb-total-label">
                <Calculator aria-hidden /> Perkiraan total biaya awal
              </p>
              <AngkaBerjalan nilai={hitung.total} format={(n) => formatRupiah(Math.round(n))} className="u-pmb-total-angka" />
              <dl>
                <div>
                  <dt>
                    <Wallet aria-hidden /> Formulir
                  </dt>
                  <dd>{formatRupiah(hitung.formulir)}</dd>
                </div>
                <div>
                  <dt>
                    <Layers aria-hidden /> Daftar ulang
                  </dt>
                  <dd>{formatRupiah(hitung.daftarUlang)}</dd>
                </div>
                {hitung.hemat > 0 && (
                  <div data-tone="success">
                    <dt>
                      <BadgePercent aria-hidden /> Potongan {pot?.nama}
                    </dt>
                    <dd>-{formatRupiah(hitung.hemat)}</dd>
                  </div>
                )}
              </dl>
              {bisaCicil.length > 0 && <p className="u-pmb-total-cicil">{bisaCicil.map((b) => b.nama).join(', ')} bisa dicicil. Jadwal cicilan tampil di dasbor setelah kamu dinyatakan lulus.</p>}
              <Button fullWidth size="lg" variant="secondary" render={<TautanPmb href={rute.daftar(g.id)} />}>
                Daftar di gelombang ini <ArrowRight aria-hidden />
              </Button>
              <p className="u-pmb-total-catatan">
                <Info aria-hidden /> {simulasi?.catatan || 'Simulasi bersifat perkiraan. Rincian resmi tampil di dasbor setelah kamu mendaftar.'}
              </p>
            </div>
          }
        >
          <Card>
            <CardContent>
              <Stack gap={5}>
                <Grid cols={2} gap={4}>
                  <label className="u-pmb-label">
                    <span>Gelombang</span>
                    <Select
                      value={String(g.id)}
                      onValueChange={(v) => {
                        setGid(v);
                        setOpsional({});
                      }}
                      options={gelombang.map((x) => ({ value: String(x.id), label: `${x.nama}${x.jalur ? ` (${x.jalur.nama})` : ''}` }))}
                    />
                  </label>
                  <label className="u-pmb-label">
                    <span>Program studi</span>
                    <Pilihan
                      tampilan={daftarProdi.length > 8 ? 'cari' : 'daftar'}
                      value={kodeProdi || null}
                      onValueChange={setProdi}
                      placeholder={d.loading ? 'Memuat…' : 'Belum ada prodi'}
                      disabled={!daftarProdi.length}
                      options={daftarProdi.map((p) => ({ value: p.kode_prodi, label: hurufJudul(p.nama_prodi ?? p.kode_prodi) }))}
                    />
                  </label>
                </Grid>
                <Stack gap={3}>
                  <Text weight="semibold">
                    <ReceiptText aria-hidden className="u-pmb-ikon-teks" /> Rincian biaya
                  </Text>
                  <ul className="u-pmb-rincian">
                    <li>
                      <span>
                        <strong>Formulir pendaftaran</strong>
                        <small>Dibayar saat mendaftar</small>
                      </span>
                      <span className="u-pmb-nominal">{hitung.formulir ? formatRupiah(hitung.formulir) : 'Gratis'}</span>
                    </li>
                    {d.loading && (
                      <li>
                        <Skeleton height={24} />
                      </li>
                    )}
                    {item.map((b, i) => {
                      const k = kunci(b, i);
                      const aktif = b.wajib || !!opsional[k];
                      return (
                        <li key={k} data-mati={!aktif || undefined}>
                          <label>
                            {b.wajib ? (
                              <BadgeCheck aria-hidden className="u-pmb-wajib" />
                            ) : (
                              <Checkbox checked={aktif} onCheckedChange={(c) => setOpsional({ ...opsional, [k]: !!c })} aria-label={`Sertakan ${b.nama}`} />
                            )}
                            <span>
                              <strong>{b.nama}</strong>
                              <small>
                                {[b.wajib ? 'Wajib saat daftar ulang' : 'Opsional', b.kode_prodi && 'khusus prodi ini', b.bisa_dicicil && 'bisa dicicil', b.keterangan].filter(Boolean).join(' · ')}
                              </small>
                            </span>
                          </label>
                          <span className="u-pmb-nominal">{formatRupiah(b.nominal)}</span>
                        </li>
                      );
                    })}
                    {!d.loading && !item.length && (
                      <li>
                        <Text size="sm" tone="muted">
                          Rincian biaya daftar ulang belum ditetapkan untuk gelombang ini.
                        </Text>
                      </li>
                    )}
                  </ul>
                </Stack>
                {!!simulasi?.potongan?.length && (
                  <Stack gap={3}>
                    <Text weight="semibold">
                      <BadgePercent aria-hidden className="u-pmb-ikon-teks" /> Potongan / beasiswa (perkiraan)
                    </Text>
                    <Grid min={200} gap={2}>
                      {[{ nama: 'Tanpa potongan', persen: 0, keterangan: null as string | null | undefined }, ...simulasi.potongan].map((p, i) => {
                        const v = String(i - 1);
                        return (
                          <button key={p.nama} type="button" className="u-pmb-potongan" aria-pressed={potongan === v} onClick={() => setPotongan(v)}>
                            <span>
                              {p.nama}
                              {p.persen > 0 && <Badge variant="warning">-{p.persen}%</Badge>}
                            </span>
                            {p.keterangan && <small>{p.keterangan}</small>}
                          </button>
                        );
                      })}
                    </Grid>
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Split>
      )}
    </Section>
  );
}

// ================================================================ Testimoni, pengumuman, kabar
export function TestimoniPmbBagian({ testimoni = [], id = 'testimoni' }: { testimoni?: TestimoniPmb[]; id?: string }) {
  if (!testimoni.length) return null;
  return (
    <Section id={id} className="u-pmb-bagian" eyebrow="Testimoni" title="Kata mereka tentang kuliah di sini">
      <TestimonialGrid
        items={testimoni.map((t) => ({
          id: t.id,
          quote: t.isi,
          name: t.nama,
          role: [t.peran, t.nama_prodi && hurufJudul(t.nama_prodi)].filter(Boolean).join(' · ') || undefined,
          avatar: t.foto,
          rating: t.rating,
          videoUrl: t.video_url,
        }))}
      />
    </Section>
  );
}

/** Pengumuman resmi panitia terbaru. */
export function PengumumanTerbaruPmb({ jumlah = 4, id = 'pengumuman' }: { jumlah?: number; id?: string }) {
  const { rute } = usePmb();
  const q = usePengumumanPmb({ per_page: jumlah });
  return (
    <Section
      id={id}
      className="u-pmb-bagian"
      eyebrow="Pengumuman"
      title="Informasi resmi panitia"
      actions={
        <TautanPmb href={rute.pengumuman()} className="u-pmb-tautan">
          Semua pengumuman <ArrowRight aria-hidden />
        </TautanPmb>
      }
    >
      {q.error ? (
        <Alert variant="danger">{pesanGalat(q.error)}</Alert>
      ) : (
        <AnnouncementList
          loading={q.loading}
          empty={<Empty icon={<Megaphone aria-hidden />} title="Belum ada pengumuman" />}
          items={(q.data ?? []).map((p) => ({ id: p.id, title: p.judul, href: rute.pengumuman(p.slug), priority: p.penting ? 'penting' : 'biasa', date: p.terbit_at ?? undefined }))}
        />
      )}
    </Section>
  );
}

interface ItemKabar {
  id: number;
  judul: string;
  ringkasan?: string | null;
  terbit_pada?: string | null;
  mulai?: string | null;
  lokasi?: string | null;
  gambar?: { url?: string | null; alt?: string | null } | null;
  tautan_baca?: string | null;
}
interface UmpanKabar {
  topik?: { kode: string; nama: string } | null;
  berita?: ItemKabar[];
  agenda?: ItemKabar[];
}
/** Kabar kampus bertopik PMB dari ruang redaksi humas (umpan BFF, mis. GET /bff/kabar). */
export function useKabarKampusPmb(url?: string, q: Record<string, number> = { berita: 4, agenda: 3, pengumuman: 0, galeri: 0 }) {
  const [s, setS] = React.useState<{ data?: UmpanKabar; loading: boolean }>({ loading: !!url });
  const kunci = JSON.stringify(q);
  React.useEffect(() => {
    if (!url) return;
    const ctrl = new AbortController();
    const qs = new URLSearchParams(Object.entries(q).map(([k, v]) => [k, String(v)])).toString();
    fetch(`${url}?${qs}`, { signal: ctrl.signal, credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((j: { data?: UmpanKabar }) => setS({ data: j.data, loading: false }))
      .catch(() => !ctrl.signal.aborted && setS({ loading: false }));
    return () => ctrl.abort();
  }, [url, kunci]); // eslint-disable-line react-hooks/exhaustive-deps
  return s;
}

/** Berita PMB/beasiswa terbaru dan agenda mendatang dari humas. Tidak tampil bila belum ada kabar. */
export function KabarKampusPmb({ id = 'kabar' }: { id?: string }) {
  const { kabarUrl } = usePmb();
  const { data, loading } = useKabarKampusPmb(kabarUrl);
  const berita = data?.berita ?? [];
  const agenda = data?.agenda ?? [];
  if (!kabarUrl || (!loading && !berita.length && !agenda.length)) return null;
  let semua: string | null = null;
  try {
    const contoh = berita[0]?.tautan_baca ?? agenda[0]?.tautan_baca;
    if (contoh && data?.topik) semua = `${new URL(contoh).origin}/topik/${data.topik.kode}`;
  } catch {
    semua = null;
  }
  return (
    <Section
      id={id}
      className="u-pmb-bagian"
      eyebrow="Kabar kampus"
      title={data?.topik?.nama ? `Kabar ${data.topik.nama}` : 'Kabar terbaru'}
      actions={
        semua ? (
          <a href={semua} target="_blank" rel="noopener" className="u-pmb-tautan">
            Semua kabar <ArrowRight aria-hidden />
          </a>
        ) : undefined
      }
    >
      <Split
        breakpoint={960}
        asideWidth={320}
        aside={
          agenda.length ? (
            <Stack gap={3}>
              <Text weight="semibold">
                <CalendarDays aria-hidden className="u-pmb-ikon-teks" /> Agenda mendatang
              </Text>
              {agenda.map((a) => (
                <a key={a.id} href={a.tautan_baca ?? '#'} target="_blank" rel="noopener" className="u-pmb-agenda">
                  <span className="u-pmb-agenda-tgl">
                    <strong>{keDate(a.mulai)?.getDate() ?? '-'}</strong>
                    <small>{keDate(a.mulai) ? BULAN[keDate(a.mulai)!.getMonth()] : ''}</small>
                  </span>
                  <span>
                    <strong>{a.judul}</strong>
                    {a.lokasi && (
                      <small>
                        <MapPin aria-hidden /> {a.lokasi}
                      </small>
                    )}
                  </span>
                </a>
              ))}
            </Stack>
          ) : null
        }
      >
        <Grid min={240} gap={4}>
          {loading && [1, 2].map((i) => <NewsCardSkeleton key={i} />)}
          {berita.map((b) => (
            <NewsCard
              key={b.id}
              item={{ id: b.id, title: b.judul, excerpt: b.ringkasan ?? undefined, href: b.tautan_baca ?? '#', image: b.gambar?.url ?? undefined, date: b.terbit_pada ?? undefined }}
            />
          ))}
          {!loading && !berita.length && <Empty icon={<Newspaper aria-hidden />} title="Belum ada berita" />}
        </Grid>
      </Split>
    </Section>
  );
}

// ================================================================ FAQ + kontak + asisten
/** Kartu kontak panitia: WhatsApp, email, tanya cepat, media sosial. */
export function KontakPanitiaPmb({ bantuan, judul = 'Hubungi panitia PMB' }: { bantuan?: BantuanPmb | null; judul?: React.ReactNode }) {
  const { kampus } = usePmb();
  const k = kontakBantuanPmb(bantuan, kampus);
  return (
    <Card>
      <CardHeader
        title={judul}
        description={
          k.jam ? (
            <>
              <Clock aria-hidden className="u-pmb-ikon-teks" /> {k.jam}
            </>
          ) : undefined
        }
      />
      <CardContent>
        <Stack gap={2}>
          {k.tautanWa && (
            <Button fullWidth variant="primary" className="u-pmb-wa" render={<a href={k.tautanWa} target="_blank" rel="noopener noreferrer" />}>
              <MessageCircle aria-hidden /> WhatsApp
            </Button>
          )}
          {k.email && (
            <Button fullWidth variant="outline" render={<a href={`mailto:${k.email}`} />}>
              <Mail aria-hidden /> {k.email}
            </Button>
          )}
          <Button fullWidth variant="outline" onClick={() => bukaAsistenPmb()}>
            <MessagesSquare aria-hidden /> Tanya cepat (jawaban dari FAQ)
          </Button>
          {!!k.sosial.length && <SocialLinks items={k.sosial} className="u-pmb-sosial" />}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function FaqPmbBagian({ faq = [], bantuan, loading, id = 'faq' }: { faq?: FaqPmb[]; bantuan?: BantuanPmb | null; loading?: boolean; id?: string }) {
  return (
    <section id={id} className="u-pmb-bagian">
      <Split breakpoint={960} asideWidth={340} sticky aside={<KontakPanitiaPmb bantuan={bantuan} />}>
        <Faq
          title="Pertanyaan yang sering diajukan"
          description="Belum menemukan jawaban? Tanyakan langsung ke panitia."
          loading={loading}
          openFirst
          searchable
          items={faq.map((f) => ({ id: f.id, question: f.pertanyaan, answer: <KontenHtml html={f.jawaban} compact />, category: f.kategori, searchText: teksPolos(f.jawaban) }))}
        />
      </Split>
    </section>
  );
}

/** Asisten tanya jawab mengambang: jawab dari FAQ resmi, lalu teruskan ke WhatsApp/email panitia. Buka dengan bukaAsistenPmb(). */
export function AsistenPmb({ faq = [], bantuan }: { faq?: FaqPmb[]; bantuan?: BantuanPmb | null }) {
  const { kampus } = usePmb();
  const k = kontakBantuanPmb(bantuan, kampus);
  const tombol = (q?: string) => (
    <Cluster gap={2}>
      {k.wa && (
        <Button
          size="xs"
          className="u-pmb-wa"
          render={<a href={`https://wa.me/${k.wa}?text=${encodeURIComponent(q ? `${k.pesan}\n\nPertanyaan: ${q}` : k.pesan)}`} target="_blank" rel="noopener noreferrer" />}
        >
          <MessageCircle aria-hidden /> Tanya via WhatsApp
        </Button>
      )}
      {k.email && (
        <Button size="xs" variant="soft" render={<a href={`mailto:${k.email}?subject=${encodeURIComponent('Pertanyaan PMB')}&body=${encodeURIComponent(q ?? '')}`} />}>
          <Mail aria-hidden /> Email
        </Button>
      )}
    </Cluster>
  );
  return (
    <ChatWidget
      title="Tanya jawab PMB"
      subtitle={k.jam ? `Panitia: ${k.jam}` : 'Jawaban cepat dari tanya jawab resmi'}
      greeting={k.sapaan}
      launcherLabel="Tanya panitia"
      eventName="pmb:buka-chat"
      suggestions={faq.slice(0, 4).map((f) => f.pertanyaan)}
      onAsk={(q) => {
        const f = cocokkanFaq(q, faq);
        return f
          ? {
              content: (
                <>
                  <strong>{f.pertanyaan}</strong>
                  <p>{teksPolos(f.jawaban)}</p>
                  <small>Masih bingung? Tanyakan ke panitia:</small>
                </>
              ),
              actions: tombol(q),
            }
          : { content: 'Maaf, saya belum menemukan jawabannya. Pertanyaanmu bisa langsung diteruskan ke panitia.', actions: tombol(q) };
      }}
      footer={
        k.tautanWa ? (
          <a href={k.tautanWa} target="_blank" rel="noopener noreferrer">
            <MessageCircle aria-hidden /> Chat langsung dengan panitia di WhatsApp
          </a>
        ) : undefined
      }
    />
  );
}

// ================================================================ Sidebar + ajakan
export interface BagianHalamanPmb {
  id: string;
  label: string;
}
/** Kolom kiri landing: daftar isi yang mengikuti gulir, status pendaftaran, dan kontak panitia. */
export function SidebarLandingPmb({ bagian, gelombang: g, bantuan }: { bagian: BagianHalamanPmb[]; gelombang?: GelombangPmb; bantuan?: BantuanPmb | null }) {
  const { kampus, pendaftar, rute } = usePmb();
  const sisa = g?.sedang_buka ? sisaHari(g.pendaftaran.selesai) : null;
  const k = kontakBantuanPmb(bantuan, kampus);
  return (
    <Stack gap={6} className="u-pmb-sidebar">
      <SectionNav items={bagian} />
      <div className="u-pmb-status">
        <Text size="xs" weight="semibold" tone="muted" className="u-pmb-label-kecil">
          {g?.sedang_buka ? 'Pendaftaran dibuka' : 'Pendaftaran'}
        </Text>
        {g ? (
          <>
            <Text weight="semibold">{g.nama}</Text>
            <Text size="sm" tone="muted">
              Sampai {tanggalPmb(g.pendaftaran.selesai)}
              {sisa != null ? ` (${sisa} hari lagi)` : ''}
            </Text>
          </>
        ) : (
          <Text size="sm" tone="muted">
            Jadwal segera diumumkan.
          </Text>
        )}
        <TombolDaftarPmb gelombang={g} size="md" fullWidth label={pendaftar ? undefined : 'Daftar sekarang'} />
        {!pendaftar && (
          <TautanPmb href={rute.masuk} className="u-pmb-tautan-redup">
            Sudah daftar? Masuk
          </TautanPmb>
        )}
      </div>
      {(k.tautanWa || k.email) && (
        <Stack gap={2}>
          <Text size="xs" weight="semibold" tone="muted" className="u-pmb-label-kecil">
            Tanya panitia
          </Text>
          {k.tautanWa && (
            <a href={k.tautanWa} target="_blank" rel="noopener noreferrer" className="u-pmb-tautan-redup">
              <MessageCircle aria-hidden /> WhatsApp
            </a>
          )}
          {k.email && (
            <a href={`mailto:${k.email}`} className="u-pmb-tautan-redup">
              <Mail aria-hidden /> {k.email}
            </a>
          )}
          {k.jam && (
            <Text size="xs" tone="muted">
              {k.jam}
            </Text>
          )}
        </Stack>
      )}
    </Stack>
  );
}

/** Pita ajakan penutup: tenggat gelombang yang sedang dibuka dan tombol daftar. */
export function AjakanPmb({ gelombang: g, teksCta }: { gelombang?: GelombangPmb; teksCta?: string | null }) {
  const { kampus } = usePmb();
  const buka = g?.sedang_buka;
  return (
    <CtaBand
      tone="dark"
      title={buka ? `Pendaftaran ${g!.nama} ditutup ${tanggalPmb(g!.pendaftaran.selesai)}.` : `Siapkan pendaftaranmu di ${kampus.nama}.`}
      description={buka ? 'Buat akun, isi formulir, dan unggah berkas sebelum tenggat.' : 'Buat akun sekarang, lalu lanjutkan saat gelombang berikutnya dibuka.'}
      actions={<TombolDaftarPmb gelombang={g} variant="secondary" label={teksCta || undefined} />}
    />
  );
}

// ================================================================ Landing lengkap
/**
 * Landing page PMB lengkap dari API: hero + papan fakta, sekilas kampus, jalur & jadwal, prodi, simulasi biaya,
 * testimoni, pengumuman, kabar kampus, FAQ + kontak, ajakan penutup, dan asisten tanya jawab.
 */
export function LandingPmbLengkap() {
  const { kampus } = usePmb();
  const d = useDataLandingPmb();
  const p = d.landing?.pengaturan;
  const adaSekilas = !!p?.statistik?.length || !!p?.keunggulan?.length || !!p?.galeri?.length;
  const testimoni = d.landing?.testimoni ?? [];
  const bagian: BagianHalamanPmb[] = [
    ...(adaSekilas ? [{ id: 'sekilas', label: `Mengenal ${kampus.singkatan}` }] : []),
    { id: 'jalur', label: 'Jalur dan jadwal' },
    { id: 'prodi', label: 'Program studi' },
    { id: 'biaya', label: 'Biaya kuliah' },
    ...(testimoni.length ? [{ id: 'testimoni', label: 'Testimoni' }] : []),
    { id: 'pengumuman', label: 'Pengumuman' },
    { id: 'kabar', label: 'Kabar kampus' },
    { id: 'faq', label: 'Tanya jawab' },
  ];
  return (
    <div className="u-pmb-landing">
      <HeroPmb
        hero={p?.hero}
        gelombang={d.utama}
        biaya={d.biayaTermurah}
        jalur={d.jalur.map((j) => j.nama)}
        jumlahProdi={d.prodi.length}
        galeri={p?.galeri}
        loading={d.memuat.gelombang || d.memuat.landing}
      />
      <div className="u-pmb-bar-bagian">
        <SectionNav items={bagian} variant="bar" />
      </div>
      <Container>
        {d.galat && !d.landing && !d.gelombang.length && <Alert variant="danger">{pesanGalat(d.galat)}</Alert>}
        <Split side="start" asideWidth={230} breakpoint={1100} gap={12} sticky aside={<SidebarLandingPmb bagian={bagian} gelombang={d.utama} bantuan={p?.bantuan} />} className="u-pmb-landing-isi">
          <SekilasPmb landing={d.landing} />
          <JalurJadwalPmb jalur={d.jalur} gelombang={d.gelombang} loading={d.memuat.gelombang || d.memuat.jalur} />
          <ProdiPmb prodi={d.prodi} loading={d.memuat.prodi} />
          <SimulasiBiayaPmb gelombang={d.gelombangSimulasi} simulasi={p?.simulasi} loading={d.memuat.gelombang} />
          <TestimoniPmbBagian testimoni={testimoni} />
          <PengumumanTerbaruPmb />
          <KabarKampusPmb />
          <FaqPmbBagian faq={d.landing?.faq} bantuan={p?.bantuan} loading={d.memuat.landing} />
        </Split>
      </Container>
      <AjakanPmb gelombang={d.buka[0]} teksCta={p?.hero?.cta_utama} />
      <AsistenPmb faq={d.landing?.faq} bantuan={p?.bantuan} />
    </div>
  );
}

// ================================================================ Detail gelombang
/** Halaman detail gelombang: status, prodi & kuota, syarat berkas, jadwal, rincian biaya, kontak panitia. */
export function DetailGelombangPmb({ id }: { id: string | number }) {
  const { pendaftar, rute } = usePmb();
  const q = useGelombangDetailPmb(id);
  const g = q.data;
  if (q.error)
    return (
      <Container padY={10}>
        <Alert
          variant="danger"
          actions={
            <Button size="sm" variant="outline" onClick={q.refetch}>
              Coba lagi
            </Button>
          }
        >
          {pesanGalat(q.error)}
        </Alert>
      </Container>
    );
  if (!g)
    return (
      <Container padY={10}>
        <Stack gap={4}>
          <Skeleton height={40} width="50%" />
          <Skeleton height={160} />
        </Stack>
      </Container>
    );
  const st = keadaanGelombang(g);
  return (
    <Container padY={10}>
      <PageHeader
        back={<TautanPmb href={`${rute.beranda}#gelombang`}>Semua gelombang</TautanPmb>}
        eyebrow={`Jalur ${g.jalur?.nama ?? '-'} · Tahun akademik ${labelTahunPmb(g.tahun_akademik)}`}
        title={g.nama}
        badge={
          <Badge variant={st.variant} dot>
            {st.label}
          </Badge>
        }
        description={g.deskripsi ?? undefined}
        actions={
          g.sedang_buka ? (
            <Button size="lg" render={<TautanPmb href={pendaftar ? rute.daftarGelombang(g.id) : rute.daftar(g.id)} />}>
              Daftar di gelombang ini <ArrowRight aria-hidden />
            </Button>
          ) : undefined
        }
      />
      <Split
        breakpoint={960}
        asideWidth={380}
        gap={8}
        aside={
          <Stack gap={6}>
            <Card>
              <CardHeader
                title={
                  <>
                    <CalendarDays aria-hidden className="u-pmb-ikon-teks" /> Jadwal
                  </>
                }
              />
              <CardContent>
                <Timeline items={jadwalKeLinimasa(g, g.jadwal)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader
                title={
                  <>
                    <Wallet aria-hidden className="u-pmb-ikon-teks" /> Rincian biaya
                  </>
                }
                description={`Pembayaran: ${rentangPmb(g.pembayaran.mulai, g.pembayaran.selesai)}`}
              />
              <CardContent>
                <ul className="u-pmb-rincian">
                  <li>
                    <span>Formulir pendaftaran</span>
                    <span className="u-pmb-nominal">{rupiahAtauGratis(g.biaya_pendaftaran ?? 0)}</span>
                  </li>
                  {g.biaya.map((b, i) => (
                    <li key={i}>
                      <span>
                        {b.nama}
                        <small>{[b.bisa_dicicil && 'bisa dicicil', !b.wajib && 'opsional'].filter(Boolean).join(' · ')}</small>
                      </span>
                      <span className="u-pmb-nominal">{formatRupiah(b.nominal)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            {g.kontak_panitia && (
              <Alert variant="neutral" icon={<Phone aria-hidden />}>
                {g.kontak_panitia}
              </Alert>
            )}
          </Stack>
        }
      >
        <Stack gap={8}>
          <Stack gap={3}>
            <Text as="div" weight="semibold" size="lg">
              <GraduationCap aria-hidden className="u-pmb-ikon-teks" /> Program studi dan kuota
            </Text>
            <Text size="sm" tone="muted">
              Maksimal {g.maks_pilihan} pilihan program studi.
            </Text>
            <TableContainer>
              <Table>
                <thead>
                  <tr>
                    <th>Program studi</th>
                    <th>Jenjang</th>
                    <th style={{ textAlign: 'right' }}>Kuota</th>
                    <th style={{ textAlign: 'right' }}>Peminat</th>
                  </tr>
                </thead>
                <tbody>
                  {g.prodi.map((p) => (
                    <tr key={p.kode_prodi}>
                      <td>{hurufJudul(p.nama_prodi ?? p.kode_prodi)}</td>
                      <td>{labelJenjang(p.jenjang)}</td>
                      <td style={{ textAlign: 'right' }}>{p.kuota ?? '-'}</td>
                      <td style={{ textAlign: 'right' }}>{p.jumlah_peminat}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableContainer>
          </Stack>
          <Stack gap={3}>
            <Text as="div" weight="semibold" size="lg">
              <FileCheck2 aria-hidden className="u-pmb-ikon-teks" /> Syarat berkas
            </Text>
            <Grid min={240} gap={3}>
              {g.syarat_berkas.map((s) => (
                <div key={s.jenis} className="u-pmb-kotak">
                  <Cluster justify="between">
                    <Text weight="medium">{s.nama}</Text>
                    <Badge variant={s.wajib ? 'danger' : 'neutral'}>{s.wajib ? 'Wajib' : 'Opsional'}</Badge>
                  </Cluster>
                  <Text size="xs" tone="muted">
                    {(Array.isArray(s.ekstensi) ? s.ekstensi.join(', ') : s.ekstensi).toUpperCase()} · maks {Math.round((s.maks_kb / 1024) * 10) / 10} MB{s.keterangan ? ` · ${s.keterangan}` : ''}
                  </Text>
                </div>
              ))}
              {g.perlu_rapor && (
                <div className="u-pmb-kotak" data-garis="putus">
                  Nilai rapor semester 1-5 diisi di formulir.
                </div>
              )}
              {g.perlu_prestasi && (
                <div className="u-pmb-kotak" data-garis="putus">
                  Daftar prestasi beserta sertifikat diisi di formulir.
                </div>
              )}
            </Grid>
          </Stack>
        </Stack>
      </Split>
    </Container>
  );
}

// ================================================================ Pengumuman
/** Daftar pengumuman resmi panitia berhalaman. */
export function DaftarPengumumanPmb({ perHalaman = 10 }: { perHalaman?: number }) {
  const { rute } = usePmb();
  const [hal, setHal] = React.useState(1);
  const q = usePengumumanPmb({ page: hal, per_page: perHalaman });
  const total = Number(q.meta?.total ?? 0);
  return (
    <Container size="md" padY={10}>
      <PageHeader eyebrow="Pengumuman" title="Informasi resmi panitia PMB" />
      {q.error && (
        <Alert
          variant="danger"
          actions={
            <Button size="sm" variant="outline" onClick={q.refetch}>
              Coba lagi
            </Button>
          }
        >
          {pesanGalat(q.error)}
        </Alert>
      )}
      <AnnouncementList
        loading={q.loading}
        empty={<Empty icon={<Megaphone aria-hidden />} title="Belum ada pengumuman" />}
        items={(q.data ?? []).map((p) => ({ id: p.id, title: p.judul, href: rute.pengumuman(p.slug), priority: p.penting ? 'penting' : 'biasa', date: p.terbit_at ?? undefined }))}
      />
      {total > perHalaman && <Pagination page={hal} totalPages={Math.ceil(total / perHalaman)} total={total} perPage={perHalaman} onPageChange={setHal} className="u-pmb-paginasi" />}
    </Container>
  );
}

/** Isi satu pengumuman (HTML disaring). */
export function DetailPengumumanPmb({ slug }: { slug: string }) {
  const { rute } = usePmb();
  const q = usePengumumanDetailPmb(slug);
  return (
    <Container size="md" padY={10} as="article">
      {q.error && <Alert variant="danger">{pesanGalat(q.error)}</Alert>}
      {q.loading && (
        <Stack gap={3}>
          <Skeleton height={36} width="75%" />
          <Skeleton height={200} />
        </Stack>
      )}
      {q.data && (
        <>
          <PageHeader
            back={<TautanPmb href={rute.pengumuman()}>Pengumuman</TautanPmb>}
            eyebrow={formatDate(q.data.terbit_at, 'long')}
            title={q.data.judul}
            badge={q.data.penting ? <Badge variant="danger">Penting</Badge> : undefined}
          />
          <KontenHtml html={q.data.isi} />
        </>
      )}
    </Container>
  );
}
