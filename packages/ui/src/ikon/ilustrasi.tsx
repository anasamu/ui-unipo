'use client';
import * as React from 'react';
import {
  Archive,
  Ban,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  ClipboardPen,
  CloudOff,
  FileQuestion,
  Fingerprint,
  Hourglass,
  LockKeyhole,
  MailCheck,
  MessagesSquare,
  NotebookPen,
  Presentation,
  QrCode,
  Receipt,
  School,
  ShieldX,
  Smartphone,
  Stamp,
  TimerOff,
  Trophy,
  UserCheck,
  UserSearch,
  WifiOff,
  Award,
  BadgeCheck,
  Bell,
  BookMarked,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Compass,
  Contact,
  Database,
  DoorOpen,
  FileCheck2,
  FileSearch,
  Gauge,
  GraduationCap,
  Handshake,
  IdCard,
  KeyRound,
  Landmark,
  Library,
  LifeBuoy,
  ListTree,
  Lock,
  Megaphone,
  MessageSquareText,
  MonitorPlay,
  Newspaper,
  PartyPopper,
  Plug,
  Repeat,
  Route,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TriangleAlert,
  UserPlus,
  UserRound,
  Users,
  Wallet,
  Warehouse,
  Wrench,
} from 'lucide-react';
import { cn } from '../lib/cn';
import type { NadaIkon } from './kotak';
import {
  IkonAkreditasi,
  IkonBeasiswa,
  IkonKampus,
  IkonKhs,
  IkonKkn,
  IkonKrs,
  IkonKtm,
  IkonOrmawa,
  IkonPenelitian,
  IkonPinjamRuang,
  IkonSinkronPddikti,
  IkonSkripsi,
  IkonSurat,
  IkonToga,
  IkonUkt,
} from './unipo';

type Ik = React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number }>;

/** Pose tokoh. */
export type PoseTokoh = 'jalan' | 'tunjuk' | 'duduk';
/** Gaya rambut/penutup kepala tokoh. */
export type GayaTokoh = 'cepol' | 'pendek' | 'hijab' | 'peci';
/** Ekspresi wajah tokoh. */
export type EkspresiTokoh = 'datar' | 'senang' | 'sedih' | 'kaget' | 'bingung';
/**
 * Aksesori tokoh. Kepala: toga (topi wisuda), kacamata, headset. Badan: jubah (jubah wisuda + selempang), jas, ransel.
 * Tangan (pilih satu): laptop, kaca (kaca pembesar), dokumen, ijazah, ponsel, buku, kunci, piala, kartu.
 */
export type AksesoriTokoh = 'toga' | 'kacamata' | 'headset' | 'jubah' | 'jas' | 'ransel' | 'laptop' | 'kaca' | 'dokumen' | 'ijazah' | 'ponsel' | 'buku' | 'kunci' | 'piala' | 'kartu';

/** Rincian satu tokoh dalam adegan. */
export interface SpekTokoh {
  pose: PoseTokoh;
  gaya?: GayaTokoh;
  ekspresi?: EkspresiTokoh;
  aksesori?: AksesoriTokoh[];
  /** Warna kulit kedua (lebih gelap) agar dua tokoh terlihat berbeda. */
  kulit?: 'terang' | 'sawo';
}

interface Adegan {
  nada: NadaIkon;
  /** Ikon utama di kotak besar. */
  ikon: Ik;
  /** Ikon kedua di kotak kecil yang miring. */
  ikon2?: Ik;
  /** Tokoh utama (kiri). */
  tokoh?: PoseTokoh | SpekTokoh;
  /** Tokoh kedua (kanan, menghadap ke kiri), mis. dosen dan mahasiswa bimbingan. */
  teman?: SpekTokoh;
}

/** Adegan ilustrasi untuk tiap modul katalog dan keadaan umum. */
export const ADEGAN: Record<string, Adegan> = {
  // Grup
  sistem: { nada: 'indigo', ikon: ShieldCheck, ikon2: KeyRound },
  referensi: { nada: 'toska', ikon: Database, ikon2: ListTree },
  akademik: { nada: 'biru', ikon: GraduationCap, ikon2: IkonKrs },
  kemahasiswaan: { nada: 'merah-muda', ikon: IkonOrmawa, ikon2: Award },
  alumni: { nada: 'ungu', ikon: Compass, ikon2: Briefcase },
  kelembagaan: { nada: 'kuning', ikon: Landmark, ikon2: IkonAkreditasi },
  layanan: { nada: 'hijau', ikon: FileCheck2, ikon2: IkonSurat },
  sarana: { nada: 'oranye', ikon: Warehouse, ikon2: IkonPinjamRuang },
  humas: { nada: 'mawar', ikon: Megaphone, ikon2: Newspaper },
  // Modul
  akses: { nada: 'indigo', ikon: ShieldCheck, ikon2: KeyRound },
  'portal-api': { nada: 'indigo', ikon: Plug, ikon2: KeyRound },
  profil: { nada: 'indigo', ikon: UserRound, ikon2: IkonKtm },
  notifikasi: { nada: 'indigo', ikon: Bell, ikon2: Send },
  integrasi: { nada: 'indigo', ikon: Plug, ikon2: Sparkles },
  pddikti: { nada: 'indigo', ikon: IkonSinkronPddikti, ikon2: Send },
  dasbor: { nada: 'indigo', ikon: Gauge, ikon2: Target },
  'referensi-akademik': { nada: 'toska', ikon: ListTree, ikon2: Database },
  master: { nada: 'toska', ikon: Database, ikon2: IkonKampus },
  induk: { nada: 'toska', ikon: Building2, ikon2: Users },
  perkuliahan: { nada: 'biru', ikon: GraduationCap, ikon2: IkonKrs },
  kurikulum: { nada: 'biru', ikon: BookOpen, ikon2: Target },
  kalender: { nada: 'biru', ikon: CalendarDays, ikon2: Bell },
  admisi: { nada: 'biru', ikon: DoorOpen, ikon2: IkonUkt },
  pmb: { nada: 'biru', ikon: UserPlus, ikon2: IkonKtm },
  lms: { nada: 'biru', ikon: MonitorPlay, ikon2: BookOpen },
  cbt: { nada: 'biru', ikon: ClipboardCheck, ikon2: IkonKhs },
  edom: { nada: 'biru', ikon: MessageSquareText, ikon2: BadgeCheck },
  mbkm: { nada: 'biru', ikon: Route, ikon2: Briefcase },
  rpl: { nada: 'biru', ikon: Repeat, ikon2: IkonKhs },
  kelulusan: { nada: 'biru', ikon: IkonToga, ikon2: Award },
  tracer: { nada: 'ungu', ikon: Compass, ikon2: IkonToga },
  karier: { nada: 'ungu', ikon: Briefcase, ikon2: Handshake },
  fakultas: { nada: 'kuning', ikon: Landmark, ikon2: IkonKampus },
  sdm: { nada: 'kuning', ikon: IdCard, ikon2: Users },
  keu: { nada: 'kuning', ikon: Wallet, ikon2: IkonUkt },
  lppm: { nada: 'kuning', ikon: IkonPenelitian, ikon2: IkonKkn },
  spmi: { nada: 'kuning', ikon: BadgeCheck, ikon2: IkonAkreditasi },
  iku: { nada: 'kuning', ikon: Target, ikon2: Gauge },
  kerjasama: { nada: 'kuning', ikon: Handshake, ikon2: IkonSurat },
  arsip: { nada: 'hijau', ikon: Archive, ikon2: IkonSurat },
  helpdesk: { nada: 'hijau', ikon: LifeBuoy, ikon2: MessageSquareText },
  sarpras: { nada: 'oranye', ikon: Warehouse, ikon2: IkonPinjamRuang },
  perpustakaan: { nada: 'oranye', ikon: BookMarked, ikon2: Library },
  repositori: { nada: 'oranye', ikon: Library, ikon2: IkonSkripsi },
  portal: { nada: 'mawar', ikon: Newspaper, ikon2: Megaphone },
  crm: { nada: 'mawar', ikon: Contact, ikon2: Target },
  beasiswa: { nada: 'merah-muda', ikon: IkonBeasiswa, ikon2: Award },
  // Fitur (dengan tokoh yang aksesorinya sesuai fitur)
  'kelulusan-saya': { nada: 'biru', ikon: IkonToga, ikon2: Award, tokoh: { pose: 'jalan', ekspresi: 'senang', aksesori: ['toga', 'jubah', 'ijazah'] } },
  wisuda: {
    nada: 'ungu',
    ikon: IkonToga,
    tokoh: { pose: 'tunjuk', ekspresi: 'senang', gaya: 'pendek', aksesori: ['toga', 'jubah', 'ijazah'] },
    teman: { pose: 'jalan', ekspresi: 'senang', gaya: 'hijab', aksesori: ['toga', 'jubah', 'ijazah'], kulit: 'sawo' },
  },
  yudisium: { nada: 'biru', ikon: Stamp, ikon2: Award, tokoh: { pose: 'tunjuk', ekspresi: 'senang', gaya: 'pendek', aksesori: ['jas', 'ijazah'] } },
  'e-learning': { nada: 'biru', ikon: MonitorPlay, ikon2: BookOpen, tokoh: { pose: 'duduk', ekspresi: 'senang', gaya: 'hijab', aksesori: ['headset', 'laptop'] } },
  keamanan: { nada: 'indigo', ikon: ShieldCheck, ikon2: Fingerprint, tokoh: { pose: 'tunjuk', gaya: 'pendek', aksesori: ['kunci'] } },
  'salah-password': { nada: 'mawar', ikon: LockKeyhole, ikon2: KeyRound, tokoh: { pose: 'duduk', ekspresi: 'bingung', aksesori: ['ponsel'] } },
  'ganti-password': { nada: 'indigo', ikon: KeyRound, ikon2: ShieldCheck, tokoh: { pose: 'tunjuk', ekspresi: 'senang', gaya: 'peci', aksesori: ['kunci'], kulit: 'sawo' } },
  verifikasi: { nada: 'indigo', ikon: MailCheck, ikon2: Smartphone, tokoh: { pose: 'tunjuk', ekspresi: 'senang', gaya: 'hijab', aksesori: ['ponsel'] } },
  pendaftaran: { nada: 'biru', ikon: ClipboardPen, ikon2: UserPlus, tokoh: { pose: 'jalan', ekspresi: 'senang', aksesori: ['ransel', 'dokumen'] } },
  maba: {
    nada: 'merah-muda',
    ikon: School,
    tokoh: { pose: 'jalan', ekspresi: 'senang', gaya: 'peci', aksesori: ['ransel', 'buku'], kulit: 'sawo' },
    teman: { pose: 'jalan', ekspresi: 'senang', gaya: 'hijab', aksesori: ['ransel', 'kartu'] },
  },
  'pencarian-mahasiswa': { nada: 'langit', ikon: UserSearch, ikon2: IkonKtm, tokoh: { pose: 'tunjuk', gaya: 'pendek', aksesori: ['kacamata', 'kaca'] } },
  mahasiswa: { nada: 'biru', ikon: IkonKtm, ikon2: GraduationCap, tokoh: { pose: 'jalan', ekspresi: 'senang', aksesori: ['ransel', 'buku'] } },
  dosen: { nada: 'kuning', ikon: Presentation, ikon2: IkonPenelitian, tokoh: { pose: 'tunjuk', gaya: 'pendek', aksesori: ['jas', 'kacamata', 'buku'] } },
  tendik: { nada: 'toska', ikon: Briefcase, ikon2: IdCard, tokoh: { pose: 'jalan', gaya: 'hijab', aksesori: ['jas', 'kartu'], kulit: 'sawo' } },
  'wali-mahasiswa': {
    nada: 'merah-muda',
    ikon: Users,
    tokoh: { pose: 'jalan', ekspresi: 'senang', gaya: 'peci', aksesori: ['jas'], kulit: 'sawo' },
    teman: { pose: 'jalan', ekspresi: 'senang', gaya: 'cepol', aksesori: ['ransel'] },
  },
  bimbingan: {
    nada: 'biru',
    ikon: MessagesSquare,
    tokoh: { pose: 'tunjuk', gaya: 'pendek', aksesori: ['jas', 'kacamata', 'dokumen'] },
    teman: { pose: 'jalan', ekspresi: 'senang', gaya: 'hijab', aksesori: ['ransel', 'buku'], kulit: 'sawo' },
  },
  krs: { nada: 'biru', ikon: IkonKrs, ikon2: CalendarCheck, tokoh: { pose: 'tunjuk', ekspresi: 'senang', aksesori: ['ransel', 'ponsel'] } },
  jadwal: { nada: 'biru', ikon: CalendarClock, ikon2: Bell, tokoh: { pose: 'tunjuk', gaya: 'peci', aksesori: ['buku'], kulit: 'sawo' } },
  presensi: { nada: 'hijau', ikon: UserCheck, ikon2: QrCode, tokoh: { pose: 'tunjuk', ekspresi: 'senang', gaya: 'hijab', aksesori: ['ponsel'] } },
  nilai: { nada: 'biru', ikon: IkonKhs, ikon2: Trophy, tokoh: { pose: 'jalan', ekspresi: 'senang', gaya: 'pendek', aksesori: ['piala'] } },
  skripsi: { nada: 'oranye', ikon: IkonSkripsi, ikon2: NotebookPen, tokoh: { pose: 'duduk', gaya: 'pendek', aksesori: ['kacamata', 'laptop'] } },
  pembayaran: { nada: 'hijau', ikon: Wallet, ikon2: Receipt, tokoh: { pose: 'tunjuk', ekspresi: 'senang', aksesori: ['ponsel'] } },
  'surat-layanan': { nada: 'hijau', ikon: IkonSurat, ikon2: Stamp, tokoh: { pose: 'tunjuk', gaya: 'hijab', aksesori: ['dokumen'] } },
  'cuti-akademik': { nada: 'kuning', ikon: CalendarX, ikon2: Hourglass, tokoh: { pose: 'duduk', gaya: 'peci', aksesori: ['buku'], kulit: 'sawo' } },
  pengumuman: { nada: 'mawar', ikon: Megaphone, ikon2: Bell, tokoh: { pose: 'tunjuk', ekspresi: 'kaget', aksesori: ['ponsel'] } },
  obrolan: { nada: 'indigo', ikon: MessagesSquare, ikon2: LockKeyhole, tokoh: { pose: 'duduk', ekspresi: 'senang', gaya: 'hijab', aksesori: ['ponsel'] } },
  // Keadaan
  kosong: { nada: 'langit', ikon: FileSearch, tokoh: { pose: 'tunjuk', ekspresi: 'bingung' } },
  cari: { nada: 'langit', ikon: Search, tokoh: { pose: 'tunjuk', aksesori: ['kaca'] } },
  galat: { nada: 'mawar', ikon: TriangleAlert, tokoh: { pose: 'duduk', ekspresi: 'sedih' } },
  pemeliharaan: { nada: 'kuning', ikon: Wrench, tokoh: { pose: 'duduk', gaya: 'pendek', aksesori: ['laptop'] } },
  terkunci: { nada: 'indigo', ikon: Lock, tokoh: { pose: 'tunjuk', aksesori: ['kunci'] } },
  sukses: { nada: 'hijau', ikon: PartyPopper, tokoh: { pose: 'jalan', ekspresi: 'senang' } },
  'selamat-datang': { nada: 'biru', ikon: Sparkles, ikon2: IkonKampus, tokoh: { pose: 'jalan', ekspresi: 'senang', aksesori: ['ransel'] } },
  'sesi-habis': { nada: 'kuning', ikon: TimerOff, ikon2: Hourglass, tokoh: { pose: 'duduk', ekspresi: 'kaget', aksesori: ['laptop'] } },
  'tidak-ditemukan': { nada: 'langit', ikon: FileQuestion, tokoh: { pose: 'tunjuk', ekspresi: 'bingung', gaya: 'pendek', aksesori: ['kaca'] } },
  'akses-ditolak': { nada: 'mawar', ikon: Ban, ikon2: ShieldX, tokoh: { pose: 'tunjuk', ekspresi: 'sedih', gaya: 'peci', kulit: 'sawo' } },
  offline: { nada: 'oranye', ikon: WifiOff, ikon2: CloudOff, tokoh: { pose: 'duduk', ekspresi: 'sedih', gaya: 'hijab', aksesori: ['ponsel'] } },
};

/** Kunci adegan keadaan (kosong, galat, sesi habis, …) dan adegan fitur (wisuda, KRS, …) yang memakai tokoh. */
export const ILUSTRASI_KEADAAN = ['kosong', 'cari', 'galat', 'pemeliharaan', 'terkunci', 'sukses', 'selamat-datang', 'sesi-habis', 'tidak-ditemukan', 'akses-ditolak', 'offline'] as const;
export const ILUSTRASI_FITUR = [
  'kelulusan-saya',
  'wisuda',
  'yudisium',
  'e-learning',
  'keamanan',
  'salah-password',
  'ganti-password',
  'verifikasi',
  'pendaftaran',
  'maba',
  'pencarian-mahasiswa',
  'mahasiswa',
  'dosen',
  'tendik',
  'wali-mahasiswa',
  'bimbingan',
  'krs',
  'jadwal',
  'presensi',
  'nilai',
  'skripsi',
  'pembayaran',
  'surat-layanan',
  'cuti-akademik',
  'pengumuman',
  'obrolan',
] as const;

/** Nama adegan yang tersedia. */
export type NamaIlustrasi = keyof typeof ADEGAN | (string & {});

export interface IlustrasiProps extends Omit<React.SVGProps<SVGSVGElement>, 'children'> {
  /** Kunci adegan: modul katalog (akademik, keu, …), grup, fitur (wisuda, krs, salah-password, …), atau keadaan (kosong, galat, …). */
  nama: NamaIlustrasi;
  /** Lebar (px/CSS). Tinggi ikut rasio 4:3. */
  lebar?: number | string;
  /** Bentuk melayang dan tokoh bergerak pelan (bawaan true; mati bila pengguna memilih kurangi gerakan). */
  bergerak?: boolean;
  /** Ganti warna/ikon. */
  nada?: NadaIkon;
  ikon?: Ik;
  /** Teks alternatif; kosong = dekoratif. */
  label?: string;
  /** Pose tokoh pada adegan apa pun; false menyembunyikannya. Bawaan mengikuti adegan. */
  tokoh?: PoseTokoh | false;
  /** Ganti gaya rambut, ekspresi, atau aksesori tokoh utama. */
  gaya?: GayaTokoh;
  ekspresi?: EkspresiTokoh;
  aksesori?: AksesoriTokoh[];
  /** Tokoh kedua; false menyembunyikannya. */
  teman?: SpekTokoh | false;
}

/**
 * Ilustrasi vektor bergaya 3D lembut (clay) untuk modul, fitur, dan keadaan: kotak ikon timbul, bentuk geometris
 * melayang, dan tokoh dengan gaya rambut (cepol, pendek, hijab, peci), ekspresi, dan aksesori sesuai fitur
 * (toga, jubah, laptop, kaca pembesar, ponsel, ransel, …). Warna mengikuti tema dan mode gelap.
 *   <Ilustrasi nama="wisuda" lebar={240} />
 *   <Ilustrasi nama="kosong" ekspresi="senang" aksesori={['laptop']} />
 */
export function Ilustrasi({ nama, lebar = 240, bergerak = true, nada, ikon, label, tokoh, gaya, ekspresi, aksesori, teman, className, style, ...rest }: IlustrasiProps) {
  const a = ADEGAN[nama] ?? { nada: 'primary' as const, ikon: Sparkles };
  const uid = React.useId().replace(/:/g, '');
  const Ikon = ikon ?? a.ikon;
  const g = (n: string) => `${uid}-${n}`;
  const dasar: SpekTokoh | undefined = typeof a.tokoh === 'string' ? { pose: a.tokoh } : a.tokoh;
  const utama: SpekTokoh | undefined =
    tokoh === false
      ? undefined
      : tokoh || dasar
        ? { ...(dasar ?? { pose: 'tunjuk' }), ...(tokoh ? { pose: tokoh } : {}), ...(gaya ? { gaya } : {}), ...(ekspresi ? { ekspresi } : {}), ...(aksesori ? { aksesori } : {}) }
        : undefined;
  const kedua = utama && teman !== false ? (teman ?? a.teman) : undefined;
  const ada = Boolean(utama);
  const Ikon2 = kedua ? undefined : a.ikon2;
  const kx = kedua ? 120 : ada ? 128 : 78; // posisi kotak utama
  return (
    <svg
      viewBox="0 0 240 180"
      width={lebar}
      className={cn('u-ilustrasi', className)}
      data-nada={nada ?? a.nada}
      data-bergerak={bergerak || undefined}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={style}
      {...rest}
    >
      <defs>
        <radialGradient id={g('latar')} cx="50%" cy="45%" r="60%">
          <stop offset="0" className="u-ilus-latar-1" />
          <stop offset="1" className="u-ilus-latar-2" />
        </radialGradient>
        <linearGradient id={g('kotak')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="u-ilus-terang" />
          <stop offset="1" className="u-ilus-gelap" />
        </linearGradient>
        <linearGradient id={g('kilap')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="u-ilus-kilap-1" />
          <stop offset="0.6" className="u-ilus-kilap-2" />
        </linearGradient>
        <filter id={g('bayang')} x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" className="u-ilus-bayang" />
        </filter>
      </defs>

      {/* Latar lembut */}
      <ellipse cx="120" cy="92" rx="104" ry="78" fill={`url(#${g('latar')})`} />

      {/* Bentuk melayang (segitiga, cincin, belah ketupat) */}
      <g className="u-ilus-bentuk">
        <path className="u-ilus-b1 u-ilus-isi-a1" d="M28 40l10-3 -3 10z" />
        <path className="u-ilus-b2 u-ilus-isi-a2" d="M200 28l14 6-12 9z" />
        <circle className="u-ilus-b3 u-ilus-garis-a3" cx="214" cy="104" r="7" fill="none" strokeWidth="4.5" />
        <circle className="u-ilus-b4 u-ilus-garis-a4" cx="26" cy="122" r="6" fill="none" strokeWidth="4" />
        <path className="u-ilus-b5 u-ilus-garis-a1" d="M190 146l7 -9 4 11z" fill="none" strokeWidth="2.5" strokeLinejoin="round" />
        <rect className="u-ilus-b6 u-ilus-isi-a1" x="52" y="18" width="8" height="8" rx="1.5" transform="rotate(25 56 22)" opacity=".85" />
      </g>

      {/* Bayangan lantai */}
      <ellipse cx="120" cy="160" rx={kedua ? 96 : ada ? 78 : 56} ry="6" className="u-ilus-lantai" />

      {/* Kotak kedua (miring di belakang) */}
      {Ikon2 && (
        <g className="u-ilus-kotak2" transform={`translate(${kx + 52} 70) rotate(12)`}>
          <rect x="-22" y="-22" width="44" height="44" rx="12" fill={`url(#${g('kotak')})`} filter={`url(#${g('bayang')})`} opacity=".92" />
          <rect x="-22" y="-22" width="44" height="44" rx="12" fill={`url(#${g('kilap')})`} />
          <Ikon2 x={-11} y={-11} width={22} height={22} strokeWidth={2.2} className="u-ilus-ikon" />
        </g>
      )}

      {/* Kotak utama timbul (mengecil dan naik bila ada dua tokoh) */}
      <g transform={kedua ? 'translate(120 58) scale(.66)' : `translate(${kx} 96)`}>
        <g className="u-ilus-kotak">
          <rect x="-38" y="-34" width="76" height="76" rx="20" className="u-ilus-sisi" />
          <rect x="-38" y="-40" width="76" height="76" rx="20" fill={`url(#${g('kotak')})`} filter={`url(#${g('bayang')})`} />
          <rect x="-38" y="-40" width="76" height="76" rx="20" fill={`url(#${g('kilap')})`} />
          <Ikon x={-19} y={-21} width={38} height={38} strokeWidth={2} className="u-ilus-ikon" />
        </g>
      </g>

      {/* Tokoh */}
      {utama && <Tokoh spek={utama} g={(n) => g(`t1-${n}`)} geser={kedua ? -4 : 0} />}
      {kedua && (
        <g transform="translate(240 0) scale(-1 1)">
          <Tokoh spek={kedua} g={(n) => g(`t2-${n}`)} geser={-4} kedua />
        </g>
      )}
    </svg>
  );
}

const TANGAN: Record<PoseTokoh, [number, number]> = { tunjuk: [102, 56], duduk: [93, 100], jalan: [98, 60] };

/** Tokoh bergaya clay: rambut/penutup kepala, ekspresi, baju, celana, sepatu, dan aksesori sesuai fitur. */
function Tokoh({ spek, g, geser = 0, kedua }: { spek: SpekTokoh; g: (n: string) => string; geser?: number; kedua?: boolean }) {
  const { pose, gaya = 'cepol', ekspresi = 'datar', aksesori = [], kulit = 'terang' } = spek;
  const punya = (x: AksesoriTokoh) => aksesori.includes(x);
  const jubah = punya('jubah');
  const kaki =
    pose === 'duduk' ? (
      <>
        <path d="M50 118 L74 120 L76 150" stroke={`url(#${g('celana')})`} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M44 120 L66 126 L64 152" stroke={`url(#${g('celana')})`} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <ellipse cx="80" cy="154" rx="9" ry="5" className="u-ilus-sepatu" strokeWidth="2" />
        <ellipse cx="68" cy="156" rx="9" ry="5" className="u-ilus-sepatu" strokeWidth="2" />
      </>
    ) : (
      <>
        <path className="u-ilus-kaki-b" d="M52 112 L36 132 L28 150" stroke={`url(#${g('celana')})`} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path className="u-ilus-kaki-d" d="M60 112 L72 132 L84 146" stroke={`url(#${g('celana')})`} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <ellipse cx="24" cy="153" rx="9" ry="5" transform="rotate(-20 24 153)" className="u-ilus-sepatu" strokeWidth="2" />
        <ellipse cx="89" cy="149" rx="9" ry="5" transform="rotate(15 89 149)" className="u-ilus-sepatu" strokeWidth="2" />
      </>
    );
  const lenganDepan = pose === 'tunjuk' ? 'M68 76 L86 66 L100 58' : pose === 'duduk' ? 'M68 78 L78 96 L90 100' : 'M68 76 L84 70 L96 62';
  const [tx, ty] = TANGAN[pose];
  const barang = aksesori.find((x) => BARANG_TANGAN.includes(x));
  const badan = jubah
    ? 'M38 72 Q38 60 54 60 L62 60 Q76 60 76 74 L80 126 Q80 132 72 132 L42 132 Q34 132 35 126 Z'
    : 'M40 72 Q40 60 54 60 L62 60 Q74 60 74 74 L72 112 Q72 120 64 120 L48 120 Q40 120 40 112 Z';
  return (
    <g
      className="u-ilus-tokoh"
      data-pose={pose}
      data-ekspresi={ekspresi}
      data-kedua={kedua || undefined}
      data-kulit={kulit}
      transform={pose === 'duduk' || geser ? `translate(${(pose === 'duduk' ? 4 : 0) + geser} 0)` : undefined}
    >
      {/* Gradien per tokoh: mengikuti variabel CSS di grup ini (tokoh kedua punya warna baju/kulit sendiri). */}
      <defs>
        <linearGradient id={g('baju')} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" className="u-ilus-baju-1" />
          <stop offset="1" className="u-ilus-baju-2" />
        </linearGradient>
        <linearGradient id={g('jubah')} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" className="u-ilus-jubah-1" />
          <stop offset="1" className="u-ilus-jubah-2" />
        </linearGradient>
        <linearGradient id={g('celana')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="u-ilus-celana-1" />
          <stop offset="1" className="u-ilus-celana-2" />
        </linearGradient>
        <radialGradient id={g('kulit')} cx="40%" cy="35%" r="70%">
          <stop offset="0" className="u-ilus-kulit-1" />
          <stop offset="1" className="u-ilus-kulit-2" />
        </radialGradient>
      </defs>
      {kaki}
      {/* ransel di punggung */}
      {punya('ransel') && (
        <g className="u-ilus-ransel">
          <rect x="26" y="64" width="20" height="40" rx="8" className="u-ilus-ransel-isi" />
          <rect x="24" y="82" width="12" height="14" rx="4" className="u-ilus-ransel-saku" />
        </g>
      )}
      {/* lengan belakang */}
      <path className={cn('u-ilus-lengan-b', jubah && 'u-ilus-lengan-jubah')} d="M44 78 L32 94 L28 104" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="27" cy="107" r="5.5" fill={`url(#${g('kulit')})`} />
      {/* badan */}
      <path d={badan} fill={`url(#${g(jubah ? 'jubah' : 'baju')})`} />
      {punya('jas') && !jubah && (
        <g className="u-ilus-jas">
          <path d="M52 60 L58 76 L64 60 Z" className="u-ilus-kemeja" />
          <path d="M58 64 L56 74 L58 80 L60 74 Z" className="u-ilus-dasi" />
          <path d="M50 61 L57 80 L50 84 M66 61 L59 80 L66 84" className="u-ilus-kerah-jas" strokeWidth="2.4" strokeLinejoin="round" fill="none" />
        </g>
      )}
      {jubah && (
        <g>
          <path d="M50 60 L58 72 L66 60" className="u-ilus-kerah-jubah" strokeWidth="4" strokeLinejoin="round" fill="none" />
          <path d="M46 64 L72 112" className="u-ilus-selempang" strokeWidth="6" strokeLinecap="round" />
        </g>
      )}
      {!punya('jas') && !jubah && <path d="M44 66 Q56 62 66 64" className="u-ilus-kerah" strokeWidth="3" strokeLinecap="round" fill="none" />}
      {punya('ransel') && <path d="M45 62 Q50 80 46 100" className="u-ilus-tali-ransel" strokeWidth="4" strokeLinecap="round" fill="none" />}
      {/* laptop di pangkuan (pose duduk) */}
      {pose === 'duduk' && barang === 'laptop' && (
        <g className="u-ilus-laptop">
          <path d="M58 112 L96 112 L98 116 L56 116 Z" className="u-ilus-benda-gelap" />
          <path d="M86 113 L95 88 Q96 86 98 86 L104 86 L95 113 Z" className="u-ilus-benda" />
          <circle cx="98" cy="99" r="2" className="u-ilus-benda-titik" />
        </g>
      )}
      {/* lengan depan + barang di tangan */}
      <path className={cn('u-ilus-lengan u-ilus-lengan-d', jubah && 'u-ilus-lengan-jubah-d')} d={lenganDepan} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {barang && !(pose === 'duduk' && barang === 'laptop') && (
        <g className="u-ilus-barang" transform={`translate(${tx} ${ty})`}>
          <Barang jenis={barang} />
        </g>
      )}
      <circle cx={tx} cy={ty} r="5.5" fill={`url(#${g('kulit')})`} />
      {/* kepala */}
      <g className="u-ilus-kepala">
        {gaya === 'hijab' && (
          <>
            <path d="M38 44 Q38 24 58 24 Q78 24 78 44 Q78 60 72 66 L46 68 Q38 60 38 44 Z" className="u-ilus-hijab" />
            <path d="M44 62 Q58 74 74 62 L76 70 Q58 80 42 70 Z" className="u-ilus-hijab u-ilus-hijab-bawah" />
          </>
        )}
        <circle cx="58" cy="44" r="14" fill={`url(#${g('kulit')})`} />
        {gaya === 'hijab' && <path d="M44 40 Q46 28 58 28 Q72 28 74 38 Q64 32 56 33 Q48 34 44 40 Z" className="u-ilus-hijab" />}
        {gaya === 'cepol' && (
          <>
            <path d="M44 42 Q45 28 59 29 Q72 30 72 42 Q66 36 58 37 Q50 37 44 42 Z" className="u-ilus-rambut" />
            {!punya('toga') && <circle cx="57" cy="24" r="7" className="u-ilus-rambut" />}
            {!punya('toga') && <path d="M51 29 Q57 33 63 29" className="u-ilus-pita" strokeWidth="3" strokeLinecap="round" fill="none" />}
            <path d="M44 42 Q42 52 47 58" className="u-ilus-rambut-garis" strokeWidth="4" strokeLinecap="round" fill="none" />
          </>
        )}
        {(gaya === 'pendek' || gaya === 'peci') && <path d="M44 46 Q42 30 57 29 Q72 28 73 40 Q70 35 63 35 Q60 39 54 38 Q50 40 48 46 Z" className="u-ilus-rambut" />}
        {gaya === 'peci' && !punya('toga') && (
          <g>
            <path d="M44 34 Q44 22 58 22 Q72 22 72 34 Q58 30 44 34 Z" className="u-ilus-peci" />
            <path d="M44 34 Q58 30 72 34" className="u-ilus-peci-garis" strokeWidth="1.2" fill="none" />
          </g>
        )}
        {/* telinga */}
        {gaya !== 'hijab' && <ellipse cx="48" cy="46" rx="3" ry="4" fill={`url(#${g('kulit')})`} />}
        <Wajah ekspresi={ekspresi} />
        {punya('kacamata') && (
          <g className="u-ilus-kacamata">
            <circle cx="64.5" cy="45" r="4.6" strokeWidth="1.6" fill="none" />
            <path d="M59.9 44.5 L49 43" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </g>
        )}
        {punya('headset') && (
          <g className="u-ilus-headset">
            <path d="M46 44 Q46 26 60 27 Q72 28 71 40" strokeWidth="3" strokeLinecap="round" fill="none" />
            <rect x="43" y="40" width="7" height="11" rx="3.5" />
            <path d="M46 51 Q50 58 60 56" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <circle cx="61" cy="56" r="2" />
          </g>
        )}
        {punya('toga') && (
          <g className="u-ilus-toga">
            <path d="M48 33 Q58 29 68 33 L67 38 Q58 35 49 38 Z" className="u-ilus-toga-dasar" />
            <path d="M36 28 L58 19 L80 28 L58 36 Z" className="u-ilus-toga-atas" />
            <path d="M58 27 L76 30 L77 41" className="u-ilus-toga-rumbai" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <circle cx="77" cy="42.5" r="2.2" className="u-ilus-toga-bola" />
            <circle cx="58" cy="27.5" r="1.6" className="u-ilus-toga-bola" />
          </g>
        )}
      </g>
      {ekspresi === 'bingung' && <path d="M76 18 Q76 12 81 12 Q86 12 86 17 Q86 21 81 22 L81 25 M81 29 L81 29.5" className="u-ilus-tanya" strokeWidth="2.6" strokeLinecap="round" fill="none" />}
      {ekspresi === 'kaget' && <path d="M76 32 Q73 37 76 39 Q79 37 76 32 Z" className="u-ilus-keringat" />}
    </g>
  );
}

const BARANG_TANGAN: AksesoriTokoh[] = ['laptop', 'kaca', 'dokumen', 'ijazah', 'ponsel', 'buku', 'kunci', 'piala', 'kartu'];

function Wajah({ ekspresi }: { ekspresi: EkspresiTokoh }) {
  switch (ekspresi) {
    case 'senang':
      return (
        <>
          <path d="M62 45.5 Q64.2 42.8 66.4 45.5" className="u-ilus-mulut" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M60.5 49.5 Q64.5 50.5 68 48.6 Q67.4 54 63.6 54 Q60.8 53.6 60.5 49.5 Z" className="u-ilus-mata" />
          <ellipse cx="58" cy="51.5" rx="4" ry="2.5" className="u-ilus-pipi" />
        </>
      );
    case 'sedih':
      return (
        <>
          <path d="M61 40.6 Q64 39 67.4 40" className="u-ilus-mulut" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <circle cx="64" cy="45" r="1.4" className="u-ilus-mata" />
          <path d="M61 53 Q64 50.4 67 52.4" className="u-ilus-mulut" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <path d="M65.6 48 Q64.6 50 65.6 51.2 Q66.6 50 65.6 48 Z" className="u-ilus-air-mata" />
          <ellipse cx="58" cy="52" rx="4" ry="2.5" className="u-ilus-pipi" />
        </>
      );
    case 'kaget':
      return (
        <>
          <path d="M61 39.4 Q64 37 67.4 39" className="u-ilus-mulut" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <circle cx="64" cy="45" r="2.1" className="u-ilus-mata" />
          <circle cx="64.7" cy="44.3" r=".7" fill="white" />
          <ellipse cx="64" cy="52" rx="1.9" ry="2.5" className="u-ilus-mata" />
          <ellipse cx="57.5" cy="51" rx="4" ry="2.5" className="u-ilus-pipi" />
        </>
      );
    case 'bingung':
      return (
        <>
          <path d="M61.4 40.4 Q64 38.2 67 39.8" className="u-ilus-mulut" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <circle cx="64" cy="45" r="1.5" className="u-ilus-mata" />
          <path d="M60.6 52 Q62.4 50.4 64 52 Q65.6 53.4 67.2 51.4" className="u-ilus-mulut" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <ellipse cx="58" cy="52" rx="4" ry="2.5" className="u-ilus-pipi" />
        </>
      );
    default:
      return (
        <>
          <circle cx="64" cy="45" r="1.4" className="u-ilus-mata" />
          <path d="M61 51 Q64 53 67 50" className="u-ilus-mulut" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <ellipse cx="58" cy="52" rx="4" ry="2.5" className="u-ilus-pipi" />
        </>
      );
  }
}

/** Barang di tangan depan; titik (0,0) = posisi tangan. */
function Barang({ jenis }: { jenis: AksesoriTokoh }) {
  switch (jenis) {
    case 'kaca':
      return (
        <>
          <path d="M0 0 L9 -9" className="u-ilus-benda-garis" strokeWidth="4" strokeLinecap="round" />
          <circle cx="15" cy="-15" r="9" className="u-ilus-lensa" strokeWidth="3.4" />
          <path d="M10 -18 Q12 -21 15 -21" stroke="white" strokeOpacity=".8" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </>
      );
    case 'dokumen':
      return (
        <g transform="rotate(-8)">
          <rect x="-4" y="-26" width="20" height="26" rx="2.5" className="u-ilus-kertas" strokeWidth="1.4" />
          <path d="M0 -20 H12 M0 -15 H12 M0 -10 H8" className="u-ilus-kertas-garis" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      );
    case 'ijazah':
      return (
        <g transform="rotate(-30)">
          <rect x="-4" y="-5" width="26" height="9" rx="4.5" className="u-ilus-kertas" strokeWidth="1.4" />
          <path d="M8 -5 V4" className="u-ilus-pita" strokeWidth="3" />
          <path d="M8 4 L5 10 M8 4 L11 10" className="u-ilus-pita" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case 'ponsel':
      return (
        <g transform="rotate(-12)">
          <rect x="-3" y="-20" width="12" height="21" rx="3" className="u-ilus-benda-gelap" />
          <rect x="-1.4" y="-18" width="8.8" height="15" rx="1.6" className="u-ilus-layar" />
        </g>
      );
    case 'buku':
      return (
        <g transform="rotate(-10)">
          <rect x="-4" y="-18" width="22" height="17" rx="2.5" className="u-ilus-buku" />
          <path d="M-1 -3 H16" stroke="white" strokeOpacity=".9" strokeWidth="2" strokeLinecap="round" />
          <path d="M2 -14 H12" stroke="white" strokeOpacity=".6" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      );
    case 'kunci':
      return (
        <g transform="rotate(-40)">
          <circle cx="0" cy="-8" r="5.5" className="u-ilus-emas" strokeWidth="3" fill="none" />
          <path d="M0 -14 V-30 M0 -24 H5 M0 -29 H4" className="u-ilus-emas" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'piala':
      return (
        <g>
          <path d="M-6 -26 H14 V-18 Q14 -10 4 -10 Q-6 -10 -6 -18 Z" className="u-ilus-emas-isi" />
          <path d="M-6 -23 Q-11 -23 -10 -18 Q-9 -15 -5 -15 M14 -23 Q19 -23 18 -18 Q17 -15 13 -15" className="u-ilus-emas" strokeWidth="2" fill="none" />
          <path d="M4 -10 V-4 M-2 -2 H10" className="u-ilus-emas" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case 'kartu':
      return (
        <g transform="rotate(-14)">
          <rect x="-4" y="-16" width="22" height="15" rx="2.5" className="u-ilus-kertas" strokeWidth="1.4" />
          <rect x="-1" y="-13" width="6" height="7.5" rx="1.2" className="u-ilus-layar" />
          <path d="M8 -12 H15 M8 -8 H13" className="u-ilus-kertas-garis" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      );
    case 'laptop':
      return (
        <g transform="rotate(-6)">
          <rect x="-6" y="-16" width="26" height="17" rx="2.5" className="u-ilus-benda" />
          <circle cx="7" cy="-7.5" r="1.8" className="u-ilus-benda-titik" />
        </g>
      );
    default:
      return null;
  }
}
