'use client';
import * as React from 'react';
import {
  Archive,
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
import { IkonAkreditasi, IkonBeasiswa, IkonKampus, IkonKhs, IkonKkn, IkonKrs, IkonKtm, IkonOrmawa, IkonPenelitian, IkonPinjamRuang, IkonSinkronPddikti, IkonSkripsi, IkonSurat, IkonToga, IkonUkt } from './unipo';

type Ik = React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number }>;
interface Adegan {
  nada: NadaIkon;
  /** Ikon utama di kotak besar. */
  ikon: Ik;
  /** Ikon kedua di kotak kecil yang miring. */
  ikon2?: Ik;
  /** Tampilkan tokoh. */
  tokoh?: 'jalan' | 'tunjuk' | 'duduk';
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
  // Keadaan
  kosong: { nada: 'langit', ikon: FileSearch, tokoh: 'tunjuk' },
  cari: { nada: 'langit', ikon: Search, tokoh: 'tunjuk' },
  galat: { nada: 'mawar', ikon: TriangleAlert, tokoh: 'duduk' },
  pemeliharaan: { nada: 'kuning', ikon: Wrench, tokoh: 'duduk' },
  terkunci: { nada: 'indigo', ikon: Lock, tokoh: 'tunjuk' },
  sukses: { nada: 'hijau', ikon: PartyPopper, tokoh: 'jalan' },
  'selamat-datang': { nada: 'biru', ikon: Sparkles, ikon2: IkonKampus, tokoh: 'jalan' },
};

/** Nama adegan yang tersedia. */
export type NamaIlustrasi = keyof typeof ADEGAN | (string & {});

export interface IlustrasiProps extends Omit<React.SVGProps<SVGSVGElement>, 'children'> {
  /** Kunci modul katalog (akademik, keu, sarpras, …), grup, atau keadaan (kosong, galat, pemeliharaan, sukses, terkunci, cari, selamat-datang). */
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
}

/**
 * Ilustrasi vektor bergaya 3D lembut (clay) untuk modul dan keadaan: kotak ikon timbul, bentuk geometris
 * melayang, dan tokoh untuk keadaan kosong/galat/sukses. Warna mengikuti tema dan mode gelap.
 *   <Ilustrasi nama="beasiswa" lebar={240} />
 */
export function Ilustrasi({ nama, lebar = 240, bergerak = true, nada, ikon, label, className, style, ...rest }: IlustrasiProps) {
  const a = ADEGAN[nama] ?? { nada: 'primary' as const, ikon: Sparkles };
  const uid = React.useId().replace(/:/g, '');
  const Ikon = ikon ?? a.ikon;
  const Ikon2 = a.ikon2;
  const g = (n: string) => `${uid}-${n}`;
  const ada = Boolean(a.tokoh);
  const kx = ada ? 128 : 78; // posisi kotak utama
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
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={g('baju')} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#4aa3f0" />
          <stop offset="1" stopColor="#1f6fd1" />
        </linearGradient>
        <linearGradient id={g('celana')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3f55" />
          <stop offset="1" stopColor="#1e2233" />
        </linearGradient>
        <radialGradient id={g('kulit')} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#ffe3cf" />
          <stop offset="1" stopColor="#f2b896" />
        </radialGradient>
        <filter id={g('bayang')} x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* Latar lembut */}
      <ellipse cx="120" cy="92" rx="104" ry="78" fill={`url(#${g('latar')})`} />

      {/* Bentuk melayang (segitiga, cincin, belah ketupat) */}
      <g className="u-ilus-bentuk">
        <path className="u-ilus-b1" d="M28 40l10-3 -3 10z" fill="#5fd4c4" />
        <path className="u-ilus-b2" d="M200 28l14 6-12 9z" fill="#ec8cc8" />
        <circle className="u-ilus-b3" cx="214" cy="104" r="7" fill="none" stroke="#7c7cf0" strokeWidth="4.5" />
        <circle className="u-ilus-b4" cx="26" cy="122" r="6" fill="none" stroke="#f4c95d" strokeWidth="4" />
        <path className="u-ilus-b5" d="M190 146l7 -9 4 11z" fill="none" stroke="#5fd4c4" strokeWidth="2.5" strokeLinejoin="round" />
        <rect className="u-ilus-b6" x="52" y="18" width="8" height="8" rx="1.5" transform="rotate(25 56 22)" fill="#5fd4c4" opacity=".85" />
      </g>

      {/* Bayangan lantai */}
      <ellipse cx={ada ? 120 : 120} cy="160" rx={ada ? 78 : 56} ry="6" className="u-ilus-lantai" />

      {/* Kotak kedua (miring di belakang) */}
      {Ikon2 && (
        <g className="u-ilus-kotak2" transform={`translate(${kx + 52} 70) rotate(12)`}>
          <rect x="-22" y="-22" width="44" height="44" rx="12" fill={`url(#${g('kotak')})`} filter={`url(#${g('bayang')})`} opacity=".92" />
          <rect x="-22" y="-22" width="44" height="44" rx="12" fill={`url(#${g('kilap')})`} />
          <Ikon2 x={-11} y={-11} width={22} height={22} stroke="#fff" strokeWidth={2.2} />
        </g>
      )}

      {/* Kotak utama timbul */}
      <g className="u-ilus-kotak" transform={`translate(${kx} 96)`}>
        <rect x="-38" y="-34" width="76" height="76" rx="20" className="u-ilus-sisi" />
        <rect x="-38" y="-40" width="76" height="76" rx="20" fill={`url(#${g('kotak')})`} filter={`url(#${g('bayang')})`} />
        <rect x="-38" y="-40" width="76" height="76" rx="20" fill={`url(#${g('kilap')})`} />
        <Ikon x={-19} y={-21} width={38} height={38} stroke="#fff" strokeWidth={2} />
      </g>

      {/* Tokoh */}
      {a.tokoh && <Tokoh pose={a.tokoh} g={g} />}
    </svg>
  );
}

/** Tokoh bergaya clay: rambut cepol, sweter biru, celana gelap, sepatu putih. */
function Tokoh({ pose, g }: { pose: 'jalan' | 'tunjuk' | 'duduk'; g: (n: string) => string }) {
  const kaki =
    pose === 'duduk' ? (
      <>
        <path d="M50 118 L74 120 L76 150" stroke={`url(#${g('celana')})`} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M44 120 L66 126 L64 152" stroke={`url(#${g('celana')})`} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <ellipse cx="80" cy="154" rx="9" ry="5" fill="#eef1f8" stroke="#1e2233" strokeWidth="2" />
        <ellipse cx="68" cy="156" rx="9" ry="5" fill="#eef1f8" stroke="#1e2233" strokeWidth="2" />
      </>
    ) : (
      <>
        <path className="u-ilus-kaki-b" d="M52 112 L36 132 L28 150" stroke={`url(#${g('celana')})`} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path className="u-ilus-kaki-d" d="M60 112 L72 132 L84 146" stroke={`url(#${g('celana')})`} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <ellipse cx="24" cy="153" rx="9" ry="5" transform="rotate(-20 24 153)" fill="#eef1f8" stroke="#1e2233" strokeWidth="2" />
        <ellipse cx="89" cy="149" rx="9" ry="5" transform="rotate(15 89 149)" fill="#eef1f8" stroke="#1e2233" strokeWidth="2" />
      </>
    );
  const lenganDepan = pose === 'tunjuk' ? 'M68 76 L86 66 L100 58' : pose === 'duduk' ? 'M68 78 L78 96 L90 100' : 'M68 76 L84 70 L96 62';
  const tanganDepan = pose === 'tunjuk' ? [102, 56] : pose === 'duduk' ? [93, 100] : [98, 60];
  return (
    <g className="u-ilus-tokoh" data-pose={pose} transform={pose === 'duduk' ? 'translate(4 0)' : undefined}>
      {kaki}
      {/* lengan belakang */}
      <path d="M44 78 L32 94 L28 104" stroke="#1f6fd1" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="27" cy="107" r="5.5" fill={`url(#${g('kulit')})`} />
      {/* badan */}
      <path d="M40 72 Q40 60 54 60 L62 60 Q74 60 74 74 L72 112 Q72 120 64 120 L48 120 Q40 120 40 112 Z" fill={`url(#${g('baju')})`} />
      <path d="M44 66 Q56 62 66 64" stroke="#fff" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* lengan depan */}
      <path className="u-ilus-lengan" d={lenganDepan} stroke="#3a8ee6" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx={tanganDepan[0]} cy={tanganDepan[1]} r="5.5" fill={`url(#${g('kulit')})`} />
      {/* kepala */}
      <g className="u-ilus-kepala">
        <circle cx="58" cy="44" r="14" fill={`url(#${g('kulit')})`} />
        <path d="M44 42 Q45 28 59 29 Q72 30 72 42 Q66 36 58 37 Q50 37 44 42 Z" fill="#1e2233" />
        <circle cx="57" cy="24" r="7" fill="#1e2233" />
        <path d="M51 29 Q57 33 63 29" stroke="#f4c95d" strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="64" cy="45" r="1.4" fill="#1e2233" />
        <path d="M61 51 Q64 53 67 50" stroke="#1e2233" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <ellipse cx="58" cy="52" rx="4" ry="2.5" fill="#f08bb3" opacity=".45" />
      </g>
    </g>
  );
}
