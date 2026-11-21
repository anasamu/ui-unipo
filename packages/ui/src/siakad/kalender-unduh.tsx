'use client';
import * as React from 'react';
import { Download, FileImage, FileText, Printer } from 'lucide-react';
import { cn } from '../lib/cn';
import { matriksQr } from '../lib/qr';
import { Button } from '../components/actions';
import { UnipoMark } from '../components/identity';
import { Checkbox } from '../components/forms';

// ================================================================ Tipe

/** Satu kegiatan/tahapan pada desain kalender. Tanggal ISO `YYYY-MM-DD[ HH:MM[:SS]]`. */
export interface TahapanDesain {
  id: string;
  judul: string;
  mulai: string;
  selesai?: string | null;
  /** Warna tahapan (#RRGGBB); bawaan warna utama. */
  warna?: string | null;
  libur?: boolean;
  /** Label jenis, mis. "UTS", "Pengisian KRS" (legenda). */
  jenis?: string | null;
  /** Sasaran ringkas, mis. "SMT 3, 5, 7", "Maba". */
  sasaran?: string | null;
  /** Kelompok untuk saringan: akademik (bawaan), libur, kegiatan. */
  kelompok?: 'akademik' | 'libur' | 'kegiatan';
}

/** Identitas kalender resmi. */
export interface InfoDesainKalender {
  /** Judul utama, bawaan "Kalender Akademik". */
  judul?: string;
  /** Periode, mis. "2026/2027 Ganjil". */
  periode: string;
  instansi?: string;
  unit?: string;
  /** URL atau data URL logo (PNG/SVG). Kosong = tanda UNIPO. */
  logo?: string | null;
  sk?: { nomor?: string | null; tanggal?: string | null } | null;
  /** Penetap: tempat, tanggal, jabatan, nama, tanda tangan (URL/data URL gambar). */
  penetap?: { tempat?: string | null; tanggal?: string | null; jabatan?: string | null; nama?: string | null; ttd?: string | null } | null;
  /** QR (mis. tautan verifikasi atau langganan kalender) dan labelnya. */
  qr?: { url: string; label?: string } | null;
}

export type VarianDesainKalender = 'linimasa' | 'gantt' | 'kisi' | 'poster' | 'resmi' | 'minimal';
export type UkuranDesainKalender = 'a4p' | 'a4l' | 'a3p' | 'f4p' | 'poster45' | 'poster916';

export const VARIAN_DESAIN_KALENDER: { value: VarianDesainKalender; label: string; keterangan: string }[] = [
  { value: 'linimasa', label: 'Garis waktu', keterangan: 'Garis waktu vertikal modern dengan kartu berwarna.' },
  { value: 'gantt', label: 'Gantt per bulan', keterangan: 'Batang tahapan di sumbu bulan, cocok untuk rapat.' },
  { value: 'kisi', label: 'Kisi kalender', keterangan: 'Kalender bulan dengan pita tahapan berwarna.' },
  { value: 'poster', label: 'Poster ringkas', keterangan: 'Satu halaman untuk media sosial dan papan pengumuman.' },
  { value: 'resmi', label: 'Agenda resmi', keterangan: 'Tabel formal ber-kop untuk lampiran SK.' },
  { value: 'minimal', label: 'Minimal hemat tinta', keterangan: 'Monokrom, garis tipis, tanpa blok warna.' },
];

/** Ukuran halaman dalam px CSS (96 dpi) dan pt PDF. */
export const UKURAN_DESAIN_KALENDER: Record<UkuranDesainKalender, { label: string; w: number; h: number; ptW: number; ptH: number; gambar?: boolean }> = {
  a4p: { label: 'A4 potret', w: 794, h: 1123, ptW: 595.28, ptH: 841.89 },
  a4l: { label: 'A4 lanskap', w: 1123, h: 794, ptW: 841.89, ptH: 595.28 },
  a3p: { label: 'A3 potret', w: 1123, h: 1587, ptW: 841.89, ptH: 1190.55 },
  f4p: { label: 'F4 potret', w: 816, h: 1247, ptW: 609.45, ptH: 935.43 },
  poster45: { label: 'Poster 1080×1350', w: 1080, h: 1350, ptW: 810, ptH: 1012.5, gambar: true },
  poster916: { label: 'Poster 1080×1920', w: 1080, h: 1920, ptW: 810, ptH: 1440, gambar: true },
};

export interface DesainKalenderProps {
  tahapan: TahapanDesain[];
  info: InfoDesainKalender;
  varian?: VarianDesainKalender;
  ukuran?: UkuranDesainKalender;
  /** Tema poster/garis waktu: terang (bawaan) atau gelap. */
  tema?: 'terang' | 'gelap';
  /** Jumlah bulan untuk varian kisi (6 atau 12). Bawaan menyesuaikan rentang. */
  bulan?: 6 | 12;
  className?: string;
  style?: React.CSSProperties;
}

// ================================================================ Bantu

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI = ['S', 'S', 'R', 'K', 'J', 'S', 'M'];
const FONT = "Inter, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const tgl = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00`);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "24 Jul – 11 Agu 2026", "19 – 24 Okt 2026", "22 Des 2026 – 3 Jan 2027". */
export function rentangDesain(m: string, s?: string | null): string {
  const a = tgl(m);
  const b = tgl(s || m);
  if (iso(a) === iso(b)) return `${a.getDate()} ${BLN[a.getMonth()]} ${a.getFullYear()}`;
  if (a.getFullYear() !== b.getFullYear()) return `${a.getDate()} ${BLN[a.getMonth()]} ${a.getFullYear()} – ${b.getDate()} ${BLN[b.getMonth()]} ${b.getFullYear()}`;
  if (a.getMonth() !== b.getMonth()) return `${a.getDate()} ${BLN[a.getMonth()]} – ${b.getDate()} ${BLN[b.getMonth()]} ${b.getFullYear()}`;
  return `${a.getDate()} – ${b.getDate()} ${BLN[b.getMonth()]} ${b.getFullYear()}`;
}

const tglPanjang = (s?: string | null) => {
  if (!s) return '';
  const d = tgl(s);
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
};

function hex(c?: string | null): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(c ?? '');
  const v = m ? parseInt(m[1]!, 16) : 0x2563eb;
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
/** Campur warna dengan putih/hitam: t = 0..1 porsi warna. */
function campur(c: string | null | undefined, t: number, dasar: [number, number, number] = [255, 255, 255]): string {
  const [r, g, b] = hex(c);
  const f = (x: number, y: number) => Math.round(x * t + y * (1 - t));
  return `rgb(${f(r, dasar[0])},${f(g, dasar[1])},${f(b, dasar[2])})`;
}
/** Warna teks yang terbaca di atas warna penuh. */
function teksDi(c?: string | null): string {
  const [r, g, b] = hex(c);
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? '#0f172a' : '#ffffff';
}
/** Versi lebih gelap untuk aksen/teks berwarna. */
const gelap = (c?: string | null) => campur(c, 0.72, [15, 23, 42]);

/** Bungkus teks ke beberapa baris berdasarkan perkiraan lebar karakter. */
function bungkus(teks: string, lebar: number, ukuranHuruf: number, maksBaris = 4): string[] {
  const muat = Math.max(4, Math.floor(lebar / (ukuranHuruf * 0.53)));
  const kata = teks.split(/\s+/);
  const baris: string[] = [];
  let kini = '';
  for (const k of kata) {
    if ((kini + ' ' + k).trim().length > muat && kini) {
      baris.push(kini);
      kini = k;
    } else kini = (kini + ' ' + k).trim();
  }
  if (kini) baris.push(kini);
  if (baris.length > maksBaris) {
    const potong = baris.slice(0, maksBaris);
    potong[maksBaris - 1] = potong[maksBaris - 1]!.replace(/.{0,2}$/, '…');
    return potong;
  }
  return baris;
}

function Teks({ x, y, baris, size, weight = 400, fill, anchor = 'start', lh = 1.3, italic }: { x: number; y: number; baris: string[]; size: number; weight?: number; fill: string; anchor?: 'start' | 'middle' | 'end'; lh?: number; italic?: boolean }) {
  return (
    <text x={x} y={y} fontSize={size} fontWeight={weight} fill={fill} textAnchor={anchor} fontFamily={FONT} fontStyle={italic ? 'italic' : undefined}>
      {baris.map((b, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : size * lh}>
          {b}
        </tspan>
      ))}
    </text>
  );
}

function Qr({ url, x, y, size, warna = '#0f172a' }: { url: string; x: number; y: number; size: number; warna?: string }) {
  let m: ReturnType<typeof matriksQr> | null = null;
  try {
    m = matriksQr(url, 'M');
  } catch {
    return null;
  }
  const n = m.n + 2;
  const s = size / n;
  let d = '';
  for (let yy = 0; yy < m.n; yy++) for (let xx = 0; xx < m.n; xx++) if (m.gelap(xx, yy)) d += `M${(xx + 1) * s} ${(yy + 1) * s}h${s}v${s}h${-s}z`;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={size} height={size} fill="#fff" rx={4} />
      <path d={d} fill={warna} />
    </g>
  );
}

function Logo({ info, x, y, size, warna, aksen }: { info: InfoDesainKalender; x: number; y: number; size: number; warna: string; aksen: string }) {
  if (info.logo) return <image href={info.logo} x={x} y={y} width={size} height={size} preserveAspectRatio="xMidYMid meet" />;
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="0 0 32 32">
      <UnipoMark size={32} color={warna} accent={aksen} />
    </svg>
  );
}

/** Blok penetap: tempat, tanggal, jabatan, tanda tangan, nama (rata kiri pada x). */
function Penetap({ info, x, y, warna, redup, lebar = 260, skala = 1 }: { info: InfoDesainKalender; x: number; y: number; warna: string; redup: string; lebar?: number; skala?: number }) {
  const p = info.penetap;
  if (!p || (!p.jabatan && !p.nama)) return null;
  const tt = [p.tempat, tglPanjang(p.tanggal)].filter(Boolean).join(', ');
  return (
    <g transform={skala === 1 ? undefined : `translate(${x} ${y}) scale(${skala}) translate(${-x} ${-y})`}>
      {tt ? <Teks x={x} y={y} baris={[tt]} size={12} fill={redup} /> : null}
      <Teks x={x} y={y + 17} baris={bungkus(p.jabatan ?? '', lebar, 12, 2)} size={12} weight={600} fill={warna} />
      {p.ttd ? <image href={p.ttd} x={x} y={y + 30} width={140} height={56} preserveAspectRatio="xMinYMid meet" /> : null}
      <line x1={x} x2={x + Math.min(lebar, 230)} y1={y + 104} y2={y + 104} stroke={redup} strokeWidth={0.6} />
      <Teks x={x} y={y + 100} baris={[p.nama ?? '']} size={13} weight={700} fill={warna} />
    </g>
  );
}

function Legenda({ tahapan, x, y, lebar, warnaTeks, ukuran = 11 }: { tahapan: TahapanDesain[]; x: number; y: number; lebar: number; warnaTeks: string; ukuran?: number }) {
  const unik = new Map<string, string>();
  for (const t of tahapan) {
    const k = t.jenis || t.judul;
    if (!unik.has(k)) unik.set(k, t.warna || '#2563eb');
  }
  let cx = x;
  let cy = y;
  const el: React.ReactNode[] = [];
  for (const [k, w] of unik) {
    const pj = k.length * ukuran * 0.53 + 26;
    if (cx + pj > x + lebar) {
      cx = x;
      cy += ukuran + 9;
    }
    el.push(
      <g key={k}>
        <rect x={cx} y={cy - ukuran + 2} width={ukuran} height={ukuran} rx={3} fill={w} />
        <Teks x={cx + ukuran + 6} y={cy} baris={[k]} size={ukuran} fill={warnaTeks} />
      </g>,
    );
    cx += pj;
  }
  return <g>{el}</g>;
}

// ================================================================ Desain

/**
 * Desain kalender akademik siap cetak/unduh sebagai SVG murni (tanpa foreignObject), sehingga bisa diubah ke PNG/PDF di
 * peramban. Enam varian: garis waktu vertikal, Gantt per bulan, kisi kalender, poster ringkas, agenda resmi ber-kop,
 * dan minimal hemat tinta. Palet diambil dari warna tahapan.
 */
export const DesainKalender = React.forwardRef<SVGSVGElement, DesainKalenderProps>(function DesainKalender(
  { tahapan: semua, info, varian = 'linimasa', ukuran = 'a4p', tema = 'terang', bulan, className, style },
  ref,
) {
  const u = UKURAN_DESAIN_KALENDER[ukuran];
  const W = u.w;
  const H = u.h;
  const tahapan = React.useMemo(() => [...semua].sort((a, b) => a.mulai.localeCompare(b.mulai)), [semua]);
  const gelapTema = tema === 'gelap' && (varian === 'poster' || varian === 'linimasa');
  const latar = gelapTema ? '#0b1220' : '#ffffff';
  const teks = gelapTema ? '#e5e7eb' : '#0f172a';
  const redup = gelapTema ? '#94a3b8' : '#64748b';
  const utama = tahapan[0]?.warna && varian !== 'minimal' ? gelap(tahapan.find((t) => !t.libur)?.warna ?? tahapan[0].warna) : '#1e293b';
  const isi = (() => {
    switch (varian) {
      case 'gantt':
        return <Gantt tahapan={tahapan} info={info} W={W} H={H} />;
      case 'kisi':
        return <Kisi tahapan={tahapan} info={info} W={W} H={H} bulan={bulan} />;
      case 'poster':
        return <Poster tahapan={tahapan} info={info} W={W} H={H} gelapTema={gelapTema} />;
      case 'resmi':
        return <Resmi tahapan={tahapan} info={info} W={W} H={H} mono={false} />;
      case 'minimal':
        return <Minimal tahapan={tahapan} info={info} W={W} H={H} />;
      default:
        return <Linimasa tahapan={tahapan} info={info} W={W} H={H} gelapTema={gelapTema} />;
    }
  })();
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className={cn('u-desain-kalender', className)}
      style={style}
      role="img"
      aria-label={`${info.judul ?? 'Kalender Akademik'} ${info.periode}`}
      data-utama={utama}
    >
      <rect width={W} height={H} fill={latar} />
      <g color={teks}>{isi}</g>
      {tahapan.length === 0 ? <Teks x={W / 2} y={H / 2} baris={['Belum ada tahapan']} size={18} fill={redup} anchor="middle" /> : null}
    </svg>
  );
});

interface BagianProps {
  tahapan: TahapanDesain[];
  info: InfoDesainKalender;
  W: number;
  H: number;
}

/** Kepala modern: logo, instansi, judul besar, periode, nomor SK. */
function Kepala({ info, W, warna, redup, aksen, y = 40, kecil }: { info: InfoDesainKalender; W: number; warna: string; redup: string; aksen: string; y?: number; kecil?: boolean }) {
  const s = kecil ? 0.85 : 1;
  const xt = 44 + 66 * s;
  const lebar = W - xt - 44;
  const judul = info.judul ?? 'Kalender Akademik';
  const hJudul = Math.min(26 * s, lebar / Math.max(8, judul.length * 0.56));
  const periode = bungkus(info.periode, lebar, 15 * s, 1)[0] ?? '';
  return (
    <g>
      <Logo info={info} x={44} y={y + 2} size={54 * s} warna={aksen} aksen="#f59e0b" />
      <Teks x={xt} y={y + 14 * s} baris={[(info.instansi ?? 'Universitas Pohuwato').toUpperCase()]} size={11 * s} weight={700} fill={redup} />
      <Teks x={xt} y={y + 40 * s} baris={[judul]} size={hJudul} weight={800} fill={warna} />
      <Teks x={xt} y={y + 62 * s} baris={[periode]} size={15 * s} weight={600} fill={aksen} />
      {info.sk?.nomor ? (
        <g>
          <rect x={44} y={y + 76 * s} width={Math.min(W - 88, (info.sk.nomor.length + (info.sk.tanggal ? 20 : 0)) * 6.6 + 90)} height={24} rx={12} fill={campur(aksen, 0.12)} />
          <Teks x={58} y={y + 76 * s + 16} baris={[`SK Rektor ${info.sk.nomor}${info.sk.tanggal ? ` · ${tglPanjang(info.sk.tanggal)}` : ''}`]} size={11.5} weight={600} fill={aksen} />
        </g>
      ) : null}
    </g>
  );
}

function Kaki({ info, tahapan, W, H, warna, redup }: BagianProps & { warna: string; redup: string }) {
  const qr = info.qr ? 64 : 0;
  const xPenetap = W - 290;
  const lebarLeg = xPenetap - 44 - (qr ? qr + 120 : 0) - 24;
  return (
    <g>
      <line x1={44} x2={W - 44} y1={H - 170} y2={H - 170} stroke={redup} strokeOpacity={0.35} />
      <Teks x={44} y={H - 146} baris={['Keterangan warna']} size={11} weight={700} fill={redup} />
      <Legenda tahapan={tahapan} x={44} y={H - 124} lebar={lebarLeg} warnaTeks={warna} ukuran={10} />
      {info.qr ? (
        <g>
          <Qr url={info.qr.url} x={xPenetap - qr - 120} y={H - 150} size={qr} />
          <Teks x={xPenetap - 114} y={H - 136} baris={bungkus(info.qr.label ?? 'Pindai untuk langganan kalender', 100, 9.5, 5)} size={9.5} fill={redup} />
        </g>
      ) : null}
      <Penetap info={info} x={xPenetap} y={H - 150} warna={warna} redup={redup} lebar={246} />
    </g>
  );
}

// ---------------------------------------------------------------- 1. Garis waktu vertikal

function Linimasa({ tahapan, info, W, H, gelapTema }: BagianProps & { gelapTema: boolean }) {
  const warna = gelapTema ? '#f8fafc' : '#0f172a';
  const redup = gelapTema ? '#94a3b8' : '#64748b';
  const aksen = gelap(tahapan.find((t) => !t.libur)?.warna) ?? '#1d4ed8';
  const atas = 160;
  const bawah = H - 190;
  const n = Math.max(1, tahapan.length);
  const langkah = (bawah - atas) / n;
  const kartuH = Math.min(78, langkah * 2 - 10);
  const sumbu = W / 2;
  const lebarKartu = sumbu - 74;
  const hurufJudul = Math.max(10, Math.min(14, kartuH / 5));
  return (
    <g>
      <Kepala info={info} W={W} warna={warna} redup={redup} aksen={aksen} y={36} />
      <line x1={sumbu} x2={sumbu} y1={atas - 10} y2={bawah + 6} stroke={gelapTema ? '#334155' : '#cbd5e1'} strokeWidth={3} strokeLinecap="round" />
      {tahapan.map((t, i) => {
        const kiri = i % 2 === 0;
        const cy = atas + langkah * i + langkah / 2;
        const x = kiri ? 44 : sumbu + 30;
        const w = lebarKartu;
        const y = cy - kartuH / 2;
        const c = t.warna || '#2563eb';
        const latar = gelapTema ? campur(c, 0.22, [11, 18, 32]) : campur(c, 0.14);
        const tepi = gelapTema ? campur(c, 0.6, [11, 18, 32]) : campur(c, 0.45);
        const baris = bungkus(t.judul, w - 34, hurufJudul, kartuH > 60 ? 2 : 1);
        return (
          <g key={t.id}>
            <line x1={kiri ? x + w : sumbu} x2={kiri ? sumbu : x} y1={cy} y2={cy} stroke={tepi} strokeWidth={1.5} strokeDasharray="3 3" />
            <circle cx={sumbu} cy={cy} r={7} fill={c} stroke={gelapTema ? '#0b1220' : '#fff'} strokeWidth={3} />
            <rect x={x} y={y} width={w} height={kartuH} rx={12} fill={latar} stroke={tepi} strokeWidth={1} />
            <rect x={x} y={y} width={6} height={kartuH} rx={3} fill={c} />
            <Teks x={x + 18} y={y + 18} baris={[rentangDesain(t.mulai, t.selesai)]} size={Math.max(9.5, hurufJudul - 2)} weight={700} fill={gelapTema ? campur(c, 0.85, [255, 255, 255]) : gelap(c)} />
            <Teks x={x + 18} y={y + 18 + hurufJudul + 4} baris={baris} size={hurufJudul} weight={600} fill={warna} lh={1.2} />
            {t.sasaran ? (
              <g>
                <rect x={x + w - 12 - (t.sasaran.length * 6.2 + 14)} y={y + 7} width={t.sasaran.length * 6.2 + 14} height={17} rx={8.5} fill={gelapTema ? '#0b1220' : '#fff'} fillOpacity={0.85} />
                <Teks x={x + w - 12 - (t.sasaran.length * 6.2 + 7)} y={y + 19} baris={[t.sasaran]} size={10} weight={600} fill={gelapTema ? '#e2e8f0' : gelap(c)} />
              </g>
            ) : null}
          </g>
        );
      })}
      <Kaki info={info} tahapan={tahapan} W={W} H={H} warna={warna} redup={redup} />
    </g>
  );
}

// ---------------------------------------------------------------- 2. Gantt per bulan

function rentangBulan(tahapan: TahapanDesain[]): Date[] {
  if (!tahapan.length) return [];
  const a = tgl(tahapan.reduce((m, t) => (t.mulai < m ? t.mulai : m), tahapan[0]!.mulai));
  const b = tgl(tahapan.reduce((m, t) => ((t.selesai ?? t.mulai) > m ? (t.selesai ?? t.mulai) : m), tahapan[0]!.selesai ?? tahapan[0]!.mulai));
  const out: Date[] = [];
  for (let d = new Date(a.getFullYear(), a.getMonth(), 1); d <= b; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) out.push(d);
  return out;
}

function Gantt({ tahapan, info, W, H }: BagianProps) {
  const warna = '#0f172a';
  const redup = '#64748b';
  const aksen = gelap(tahapan.find((t) => !t.libur)?.warna) ?? '#1d4ed8';
  const bulan = rentangBulan(tahapan);
  const kiri = Math.min(300, W * 0.32);
  const x0 = 44 + kiri;
  const x1 = W - 44;
  const atas = 170;
  const bawah = H - 200;
  const t0 = bulan[0]?.getTime() ?? 0;
  const tAkhir = bulan.length ? new Date(bulan[bulan.length - 1]!.getFullYear(), bulan[bulan.length - 1]!.getMonth() + 1, 1).getTime() : 1;
  const pos = (d: Date) => x0 + ((d.getTime() - t0) / Math.max(1, tAkhir - t0)) * (x1 - x0);
  const tinggi = Math.min(54, (bawah - atas - 30) / Math.max(1, tahapan.length));
  const huruf = Math.max(9, Math.min(12.5, tinggi * 0.32));
  const duaBaris = tinggi >= 34;
  return (
    <g>
      <Kepala info={info} W={W} warna={warna} redup={redup} aksen={aksen} y={36} />
      {bulan.map((b, i) => {
        const xa = pos(b);
        const xb = pos(new Date(b.getFullYear(), b.getMonth() + 1, 1));
        return (
          <g key={i}>
            <rect x={xa} y={atas} width={xb - xa} height={bawah - atas} fill={i % 2 ? '#f8fafc' : '#ffffff'} />
            <line x1={xa} x2={xa} y1={atas} y2={bawah} stroke="#e2e8f0" />
            <Teks x={(xa + xb) / 2} y={atas + 18} baris={[`${BLN[b.getMonth()]}${i === 0 || b.getMonth() === 0 ? ` ${b.getFullYear()}` : ''}`]} size={11} weight={700} fill={redup} anchor="middle" />
          </g>
        );
      })}
      {tahapan.map((t, i) => {
        const y = atas + 30 + i * tinggi;
        const xa = pos(tgl(t.mulai));
        const xb = Math.max(xa + 5, pos(new Date(tgl(t.selesai ?? t.mulai).getTime() + 86_400_000)));
        const c = t.warna || '#2563eb';
        return (
          <g key={t.id}>
            <line x1={44} x2={x1} y1={y + tinggi} y2={y + tinggi} stroke="#eef2f7" />
            <Teks x={44} y={y + tinggi / 2 + huruf / 2 - 2 - (duaBaris ? huruf * 0.6 : 0)} baris={[bungkus(t.judul, kiri - 12, huruf, 1)[0]!]} size={huruf} weight={600} fill={warna} />
            {duaBaris ? <Teks x={44} y={y + tinggi / 2 + huruf * 1.05} baris={[bungkus(rentangDesain(t.mulai, t.selesai) + (t.sasaran ? ` · ${t.sasaran}` : ''), kiri - 12, huruf * 0.85, 1)[0]!]} size={huruf * 0.85} fill={redup} /> : null}
            <rect x={xa} y={y + tinggi * 0.18} width={xb - xa} height={tinggi * 0.64} rx={Math.min(8, tinggi * 0.3)} fill={c} />
            {!duaBaris && xb - xa > 90 ? <Teks x={xa + 8} y={y + tinggi / 2 + huruf / 2 - 2} baris={[rentangDesain(t.mulai, t.selesai)]} size={huruf - 1} weight={600} fill={teksDi(c)} /> : null}
          </g>
        );
      })}
      <Kaki info={info} tahapan={tahapan} W={W} H={H} warna={warna} redup={redup} />
    </g>
  );
}

// ---------------------------------------------------------------- 3. Kisi kalender

function Kisi({ tahapan, info, W, H, bulan: jml }: BagianProps & { bulan?: 6 | 12 }) {
  const warna = '#0f172a';
  const redup = '#64748b';
  const aksen = gelap(tahapan.find((t) => !t.libur)?.warna) ?? '#1d4ed8';
  const semuaBulan = rentangBulan(tahapan);
  const n = jml ?? (semuaBulan.length > 6 ? 12 : 6);
  const daftar = (semuaBulan.length ? semuaBulan : [new Date()]).slice(0, n);
  while (daftar.length < Math.min(n, 6)) daftar.push(new Date(daftar[daftar.length - 1]!.getFullYear(), daftar[daftar.length - 1]!.getMonth() + 1, 1));
  const lanskap = W > H;
  const kol = lanskap ? (daftar.length > 6 ? 4 : 3) : daftar.length > 6 ? 3 : 2;
  const brs = Math.ceil(daftar.length / kol);
  const atas = 160;
  const bawah = H - 190;
  const gap = 18;
  const cw = (W - 88 - gap * (kol - 1)) / kol;
  const ch = (bawah - atas - gap * (brs - 1)) / brs;
  // Pita harian hanya untuk tahapan pendek (<= 45 hari) supaya kisi tidak penuh; tahapan panjang tampil di daftar bulan.
  const pendek = tahapan.filter((t) => (tgl(t.selesai ?? t.mulai).getTime() - tgl(t.mulai).getTime()) / 86_400_000 <= 45);
  const warnaHari = (d: string) => pendek.filter((t) => t.mulai.slice(0, 10) <= d && (t.selesai ?? t.mulai).slice(0, 10) >= d);
  return (
    <g>
      <Kepala info={info} W={W} warna={warna} redup={redup} aksen={aksen} y={36} />
      {daftar.map((b, i) => {
        const x = 44 + (i % kol) * (cw + gap);
        const y = atas + Math.floor(i / kol) * (ch + gap);
        const awal = (b.getDay() + 6) % 7;
        const hari = new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate();
        const sel = cw / 7;
        const tinggiSel = Math.min(sel * 0.82, (ch * 0.62 - 34) / 6);
        const kegiatan = tahapan.filter((t) => {
          const m = t.mulai.slice(0, 7);
          const s = (t.selesai ?? t.mulai).slice(0, 7);
          const k = iso(b).slice(0, 7);
          return m <= k && s >= k;
        });
        return (
          <g key={i}>
            <rect x={x} y={y} width={cw} height={ch} rx={12} fill="#ffffff" stroke="#e2e8f0" />
            <Teks x={x + 12} y={y + 22} baris={[`${BULAN[b.getMonth()]} ${b.getFullYear()}`]} size={13} weight={800} fill={warna} />
            {HARI.map((h, j) => (
              <Teks key={j} x={x + sel * j + sel / 2} y={y + 40} baris={[h]} size={9} weight={700} fill={j === 6 ? '#dc2626' : redup} anchor="middle" />
            ))}
            {Array.from({ length: hari }, (_, k) => {
              const p = awal + k;
              const cx = x + (p % 7) * sel;
              const cy = y + 46 + Math.floor(p / 7) * tinggiSel;
              const d = iso(new Date(b.getFullYear(), b.getMonth(), k + 1));
              const kena = warnaHari(d);
              const libur = kena.some((t) => t.libur) || p % 7 === 6;
              const pita = kena.filter((t) => !t.libur).slice(0, 3);
              return (
                <g key={k}>
                  {pita.length ? <rect x={cx + 1.5} y={cy + 1} width={sel - 3} height={tinggiSel - 2} rx={4} fill={campur(pita[0]!.warna, 0.28)} /> : null}
                  {pita.map((t, q) => (
                    <rect key={q} x={cx + 3} y={cy + tinggiSel - 4 - q * 3} width={sel - 6} height={2} rx={1} fill={t.warna || '#2563eb'} />
                  ))}
                  <Teks x={cx + sel / 2} y={cy + tinggiSel / 2 + 3} baris={[String(k + 1)]} size={Math.min(10, tinggiSel * 0.5)} weight={libur ? 700 : 500} fill={libur ? '#dc2626' : warna} anchor="middle" />
                </g>
              );
            })}
            {kegiatan.slice(0, Math.max(1, Math.floor((ch - (46 + 6 * tinggiSel) - 8) / 13))).map((t, q) => (
              <g key={t.id}>
                <rect x={x + 12} y={y + 52 + 6 * tinggiSel + q * 13} width={7} height={7} rx={2} fill={t.warna || '#2563eb'} />
                <Teks x={x + 24} y={y + 59 + 6 * tinggiSel + q * 13} baris={[bungkus(`${t.judul} · ${rentangDesain(t.mulai, t.selesai).replace(/ \d{4}$/, '')}`, cw - 34, 9, 1)[0]!]} size={9} fill={warna} />
              </g>
            ))}
          </g>
        );
      })}
      <Kaki info={info} tahapan={tahapan} W={W} H={H} warna={warna} redup={redup} />
    </g>
  );
}

// ---------------------------------------------------------------- 4. Poster ringkas

function Poster({ tahapan, info, W, H, gelapTema }: BagianProps & { gelapTema: boolean }) {
  const aksen = tahapan.find((t) => !t.libur)?.warna ?? '#2563eb';
  const warna = gelapTema ? '#f8fafc' : '#0f172a';
  const redup = gelapTema ? '#94a3b8' : '#475569';
  const atas = 300;
  const kaki = info.qr || info.penetap?.nama ? 190 : 80;
  const n = Math.max(1, tahapan.length);
  const baris = Math.min(H > 1500 ? 104 : 72, (H - atas - kaki) / n);
  const huruf = Math.max(14, Math.min(28, baris * 0.34));
  const id = 'pg' + Math.abs(hashTeks(info.periode)).toString(36);
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={gelapTema ? campur(aksen, 0.55, [11, 18, 32]) : campur(aksen, 0.95)} />
          <stop offset="1" stopColor={gelapTema ? '#0b1220' : campur(aksen, 0.55, [15, 23, 42])} />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={W} height={260} fill={`url(#${id})`} />
      <circle cx={W - 80} cy={40} r={150} fill="#ffffff" fillOpacity={0.07} />
      <circle cx={W - 10} cy={210} r={90} fill="#ffffff" fillOpacity={0.06} />
      <Logo info={info} x={60} y={54} size={64} warna={gelap(aksen)} aksen="#fde68a" />
      <Teks x={140} y={80} baris={[(info.instansi ?? 'Universitas Pohuwato').toUpperCase()]} size={18} weight={700} fill="#ffffff" />
      <Teks x={140} y={106} baris={[info.unit ?? 'Biro Administrasi Akademik']} size={15} fill="#e2e8f0" />
      <Teks x={60} y={186} baris={[info.judul ?? 'Kalender Akademik']} size={52} weight={900} fill="#ffffff" />
      <Teks x={60} y={232} baris={[info.periode + (info.sk?.nomor ? `  ·  SK ${info.sk.nomor}` : '')]} size={22} weight={600} fill="#f1f5f9" />
      {tahapan.map((t, i) => {
        const y = atas + i * baris;
        const c = t.warna || '#2563eb';
        const a = tgl(t.mulai);
        return (
          <g key={t.id}>
            <rect x={60} y={y} width={W - 120} height={baris - 8} rx={14} fill={gelapTema ? '#111a2e' : campur(c, 0.1)} />
            <rect x={60} y={y} width={baris - 8 + 34} height={baris - 8} rx={14} fill={c} />
            <Teks x={60 + (baris - 8 + 34) / 2} y={y + (baris - 8) / 2 + huruf * 0.35} baris={[`${a.getDate()} ${BLN[a.getMonth()]}`]} size={huruf * 0.95} weight={800} fill={teksDi(c)} anchor="middle" />
            <Teks x={60 + baris - 8 + 52} y={y + (baris - 8) / 2 - 2} baris={[bungkus(t.judul, W - 120 - (baris + 70), huruf, 1)[0]!]} size={huruf} weight={700} fill={warna} />
            <Teks x={60 + baris - 8 + 52} y={y + (baris - 8) / 2 + huruf * 0.95} baris={[rentangDesain(t.mulai, t.selesai) + (t.sasaran ? `  ·  ${t.sasaran}` : '')]} size={huruf * 0.68} fill={redup} />
          </g>
        );
      })}
      {info.qr ? (
        <g>
          <Qr url={info.qr.url} x={60} y={H - 160} size={110} />
          <Teks x={186} y={H - 110} baris={bungkus(info.qr.label ?? 'Pindai untuk langganan kalender', 280, 16, 3)} size={16} fill={redup} />
        </g>
      ) : null}
      <Penetap info={info} x={W - 380} y={H - 170} warna={warna} redup={redup} lebar={240} skala={1.35} />
    </g>
  );
}

function hashTeks(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

// ---------------------------------------------------------------- 5/6. Agenda resmi dan minimal

function Resmi({ tahapan, info, W, H, mono }: BagianProps & { mono: boolean }) {
  const warna = '#0f172a';
  const redup = '#475569';
  const aksen = mono ? '#0f172a' : gelap(tahapan.find((t) => !t.libur)?.warna) ?? '#1e3a8a';
  const atas = 210;
  const bawah = H - 200;
  const n = Math.max(1, tahapan.length);
  const tinggi = Math.min(40, (bawah - atas - 34) / n);
  const huruf = Math.max(9.5, Math.min(13, tinggi * 0.36));
  const kol = [44, 86, W * 0.56, W * 0.8, W - 44];
  return (
    <g>
      {/* Kop resmi */}
      <Logo info={info} x={44} y={34} size={70} warna={mono ? '#0f172a' : aksen} aksen={mono ? '#475569' : '#f59e0b'} />
      <Teks x={W / 2 + 30} y={58} baris={[(info.instansi ?? 'Universitas Pohuwato').toUpperCase()]} size={20} weight={800} fill={warna} anchor="middle" />
      <Teks x={W / 2 + 30} y={80} baris={[info.unit ?? 'Biro Administrasi Akademik dan Kemahasiswaan']} size={13} fill={redup} anchor="middle" />
      <line x1={44} x2={W - 44} y1={114} y2={114} stroke={warna} strokeWidth={2.2} />
      <line x1={44} x2={W - 44} y1={118} y2={118} stroke={warna} strokeWidth={0.7} />
      <Teks x={W / 2} y={150} baris={[`${(info.judul ?? 'Kalender Akademik').toUpperCase()} ${info.periode.toUpperCase()}`]} size={16} weight={800} fill={warna} anchor="middle" />
      {info.sk?.nomor ? <Teks x={W / 2} y={170} baris={[`Lampiran SK Rektor Nomor ${info.sk.nomor}${info.sk.tanggal ? ` tanggal ${tglPanjang(info.sk.tanggal)}` : ''}`]} size={11} fill={redup} anchor="middle" /> : null}
      {/* Tabel */}
      <rect x={44} y={atas - 8} width={W - 88} height={30} fill={mono ? '#ffffff' : campur(aksen, 0.12)} stroke={mono ? '#0f172a' : 'none'} strokeWidth={mono ? 0.8 : 0} />
      {[['No', kol[0]!], ['Kegiatan', kol[1]!], ['Waktu', kol[2]!], ['Sasaran', kol[3]!]].map(([l, x]) => (
        <Teks key={l as string} x={(x as number) + 8} y={atas + 11} baris={[l as string]} size={11} weight={800} fill={mono ? '#0f172a' : aksen} />
      ))}
      {tahapan.map((t, i) => {
        const y = atas + 22 + i * tinggi;
        const c = t.warna || '#2563eb';
        return (
          <g key={t.id}>
            {!mono && i % 2 === 1 ? <rect x={44} y={y} width={W - 88} height={tinggi} fill="#f8fafc" /> : null}
            <line x1={44} x2={W - 44} y1={y + tinggi} y2={y + tinggi} stroke={mono ? '#94a3b8' : '#e2e8f0'} strokeWidth={mono ? 0.5 : 1} />
            <Teks x={kol[0]! + 8} y={y + tinggi / 2 + huruf / 2 - 2} baris={[String(i + 1)]} size={huruf} fill={redup} />
            {mono ? (
              <circle cx={kol[1]! + 12} cy={y + tinggi / 2} r={3.5} fill="none" stroke="#0f172a" strokeWidth={1} />
            ) : (
              <rect x={kol[1]! + 8} y={y + tinggi / 2 - 5} width={10} height={10} rx={2.5} fill={c} />
            )}
            <Teks x={kol[1]! + 26} y={y + tinggi / 2 + huruf / 2 - 2} baris={[bungkus(t.judul + (t.libur ? ' (libur)' : ''), kol[2]! - kol[1]! - 34, huruf, 1)[0]!]} size={huruf} weight={600} fill={warna} />
            <Teks x={kol[2]! + 8} y={y + tinggi / 2 + huruf / 2 - 2} baris={[rentangDesain(t.mulai, t.selesai)]} size={huruf} fill={warna} />
            <Teks x={kol[3]! + 8} y={y + tinggi / 2 + huruf / 2 - 2} baris={[bungkus(t.sasaran || 'Semua', kol[4]! - kol[3]! - 12, huruf, 1)[0]!]} size={huruf} fill={redup} />
          </g>
        );
      })}
      {/* Kaki */}
      {info.qr ? (
        <g>
          <Qr url={info.qr.url} x={W - 300 - 190} y={H - 160} size={64} />
          <Teks x={W - 300 - 118} y={H - 146} baris={bungkus(info.qr.label ?? 'Pindai untuk langganan kalender', 100, 9.5, 5)} size={9.5} fill={redup} />
        </g>
      ) : null}
      {!mono ? <Legenda tahapan={tahapan} x={44} y={H - 150} lebar={W - 88 - 300 - (info.qr ? 210 : 20)} warnaTeks={warna} ukuran={10} /> : null}
      <Penetap info={info} x={W - 290} y={H - 160} warna={warna} redup={redup} lebar={246} />
    </g>
  );
}

/** Minimal hemat tinta: tanpa blok warna, dikelompokkan per bulan mulai, garis rambut. */
function Minimal({ tahapan, info, W, H }: BagianProps) {
  const hitam = '#111827';
  const abu = '#6b7280';
  const kelompok = new Map<string, TahapanDesain[]>();
  for (const t of tahapan) {
    const d = tgl(t.mulai);
    const k = `${BULAN[d.getMonth()]} ${d.getFullYear()}`;
    kelompok.set(k, [...(kelompok.get(k) ?? []), t]);
  }
  const atas = 150;
  const bawah = H - 180;
  const jumlahBaris = tahapan.length + kelompok.size * 1.4;
  const tinggi = Math.min(30, (bawah - atas) / Math.max(1, jumlahBaris));
  const huruf = Math.max(9.5, Math.min(12.5, tinggi * 0.45));
  let y = atas;
  const el: React.ReactNode[] = [];
  for (const [bln, daftar] of kelompok) {
    el.push(<Teks key={'b' + bln} x={44} y={y + tinggi * 0.9} baris={[bln.toUpperCase()]} size={huruf * 0.9} weight={700} fill={abu} />);
    y += tinggi * 1.4;
    for (const t of daftar) {
      el.push(
        <g key={t.id}>
          <Teks x={64} y={y + tinggi * 0.65} baris={[bungkus(t.judul + (t.sasaran ? ` — ${t.sasaran}` : '') + (t.libur ? ' (libur)' : ''), W * 0.58, huruf, 1)[0]!]} size={huruf} fill={hitam} />
          <Teks x={W - 44} y={y + tinggi * 0.65} baris={[rentangDesain(t.mulai, t.selesai)]} size={huruf} fill={hitam} anchor="end" />
          <line x1={64} x2={W - 44} y1={y + tinggi} y2={y + tinggi} stroke="#d1d5db" strokeWidth={0.5} />
        </g>,
      );
      y += tinggi;
    }
  }
  return (
    <g>
      <Teks x={44} y={58} baris={[(info.instansi ?? 'Universitas Pohuwato').toUpperCase()]} size={11} weight={700} fill={abu} />
      <Teks x={44} y={92} baris={[info.judul ?? 'Kalender Akademik']} size={26} weight={300} fill={hitam} />
      <Teks x={44} y={116} baris={[info.periode + (info.sk?.nomor ? `  ·  SK ${info.sk.nomor}` : '')]} size={12} fill={abu} />
      <line x1={44} x2={W - 44} y1={132} y2={132} stroke={hitam} strokeWidth={0.8} />
      {el}
      {info.qr ? (
        <g>
          <Qr url={info.qr.url} x={44} y={H - 150} size={64} warna={hitam} />
          <Teks x={118} y={H - 136} baris={bungkus(info.qr.label ?? 'Pindai untuk langganan kalender', 150, 9.5, 5)} size={9.5} fill={abu} />
        </g>
      ) : null}
      <Penetap info={info} x={W - 290} y={H - 160} warna={hitam} redup={abu} lebar={246} />
    </g>
  );
}

// ================================================================ Ekspor

/** Ubah URL gambar menjadi data URL supaya ikut terekspor (gambar luar tidak dimuat dalam SVG-sebagai-gambar). */
export async function keDataUrl(url?: string | null): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  try {
    const r = await fetch(url, { credentials: 'include' });
    if (!r.ok) return null;
    const b = await r.blob();
    return await new Promise((res) => {
      const f = new FileReader();
      f.onload = () => res(String(f.result));
      f.onerror = () => res(null);
      f.readAsDataURL(b);
    });
  } catch {
    return null;
  }
}

function teksSvg(svg: SVGSVGElement): string {
  const s = new XMLSerializer().serializeToString(svg);
  return s.includes('xmlns="http://www.w3.org/2000/svg"') ? s : s.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
}

async function keKanvas(svg: SVGSVGElement, skala: number): Promise<HTMLCanvasElement> {
  const w = Number(svg.getAttribute('width'));
  const h = Number(svg.getAttribute('height'));
  const url = URL.createObjectURL(new Blob([teksSvg(svg)], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    img.decoding = 'sync';
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('Desain gagal digambar.'));
      img.src = url;
    });
    const c = document.createElement('canvas');
    c.width = Math.round(w * skala);
    c.height = Math.round(h * skala);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function unduhBlob(b: Blob, nama: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/** PNG resolusi tinggi (bawaan 300 dpi untuk ukuran kertas, 2× untuk poster). */
export async function unduhPngKalender(svg: SVGSVGElement, nama: string, skala = 300 / 96): Promise<void> {
  const c = await keKanvas(svg, skala);
  const b = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
  if (!b) throw new Error('PNG gagal dibuat.');
  unduhBlob(b, nama.endsWith('.png') ? nama : `${nama}.png`);
}

/**
 * PDF satu halaman dengan ukuran kertas yang tepat, berisi gambar desain resolusi tinggi (JPEG kualitas tinggi,
 * bawaan 300 dpi). Ditulis langsung tanpa pustaka tambahan sehingga andal di semua peramban. Untuk PDF vektor, pakai
 * "Cetak" lalu "Simpan sebagai PDF".
 */
export async function unduhPdfKalender(svg: SVGSVGElement, nama: string, ptW: number, ptH: number, skala = 300 / 96): Promise<void> {
  const c = await keKanvas(svg, skala);
  const b = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.93));
  if (!b) throw new Error('PDF gagal dibuat.');
  const jpg = new Uint8Array(await b.arrayBuffer());
  const enc = new TextEncoder();
  const bagian: Uint8Array[] = [];
  const offset: number[] = [];
  let pjg = 0;
  const tulis = (x: string | Uint8Array) => {
    const u = typeof x === 'string' ? enc.encode(x) : x;
    bagian.push(u);
    pjg += u.length;
  };
  const obj = (n: number, isi: string) => {
    offset[n] = pjg;
    tulis(`${n} 0 obj\n${isi}\nendobj\n`);
  };
  const isiHalaman = `q ${ptW.toFixed(2)} 0 0 ${ptH.toFixed(2)} 0 0 cm /Im0 Do Q`;
  tulis('%PDF-1.4\n%âãÏÓ\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW.toFixed(2)} ${ptH.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offset[4] = pjg;
  tulis(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);
  tulis(jpg);
  tulis('\nendstream\nendobj\n');
  obj(5, `<< /Length ${isiHalaman.length} >>\nstream\n${isiHalaman}\nendstream`);
  obj(6, `<< /Title (Kalender Akademik) /Producer (unipo-ui) /CreationDate (D:${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}) >>`);
  const xref = pjg;
  let x = 'xref\n0 7\n0000000000 65535 f \n';
  for (let i = 1; i <= 6; i++) x += `${String(offset[i]).padStart(10, '0')} 00000 n \n`;
  tulis(x + `trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  unduhBlob(new Blob(bagian as BlobPart[], { type: 'application/pdf' }), nama.endsWith('.pdf') ? nama : `${nama}.pdf`);
}

/** Cetak desain sebagai vektor lewat dialog cetak peramban (Simpan sebagai PDF = PDF vektor). */
export function cetakKalender(svg: SVGSVGElement, ukuran: UkuranDesainKalender): void {
  const u = UKURAN_DESAIN_KALENDER[ukuran];
  const w = window.open('', '_blank', 'noopener=no');
  if (!w) return;
  const kertas = ukuran === 'a4p' ? 'A4 portrait' : ukuran === 'a4l' ? 'A4 landscape' : ukuran === 'a3p' ? 'A3 portrait' : `${(u.ptW / 72).toFixed(2)}in ${(u.ptH / 72).toFixed(2)}in`;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Kalender akademik</title><style>@page{size:${kertas};margin:0}html,body{margin:0}svg{width:100vw;height:auto;display:block}</style></head><body>${teksSvg(svg)}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

// ================================================================ Panel unduh

export interface UnduhKalenderProps {
  tahapan: TahapanDesain[];
  info: InfoDesainKalender;
  /** Nama berkas tanpa ekstensi. */
  namaBerkas?: string;
  /** Pilihan saringan sasaran/prodi tambahan dari aplikasi (mis. pemilih prodi). */
  saringan?: React.ReactNode;
  className?: string;
}

/**
 * Pratinjau dan unduh kalender akademik: varian desain, ukuran (A4/A3/F4, poster 1080×1350 dan 1080×1920), tema,
 * saring libur/kegiatan/sasaran, lalu unduh PNG (resolusi tinggi), PDF (ukuran kertas tepat), atau cetak vektor.
 */
export function UnduhKalender({ tahapan, info, namaBerkas = 'kalender-akademik', saringan, className }: UnduhKalenderProps) {
  const [varian, setVarian] = React.useState<VarianDesainKalender>('linimasa');
  const [ukuran, setUkuran] = React.useState<UkuranDesainKalender>('a4p');
  const [tema, setTema] = React.useState<'terang' | 'gelap'>('terang');
  const [libur, setLibur] = React.useState(true);
  const [kegiatan, setKegiatan] = React.useState(true);
  const [sasaran, setSasaran] = React.useState<string>('');
  const [sibuk, setSibuk] = React.useState<null | 'png' | 'pdf'>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [gambar, setGambar] = React.useState<{ logo: string | null; ttd: string | null }>({ logo: null, ttd: null });
  const ref = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    let batal = false;
    void Promise.all([keDataUrl(info.logo), keDataUrl(info.penetap?.ttd)]).then(([logo, ttd]) => !batal && setGambar({ logo, ttd }));
    return () => {
      batal = true;
    };
  }, [info.logo, info.penetap?.ttd]);

  React.useEffect(() => {
    if (UKURAN_DESAIN_KALENDER[ukuran].gambar && varian !== 'poster' && varian !== 'linimasa') setVarian('poster');
  }, [ukuran, varian]);

  const daftarSasaran = React.useMemo(() => [...new Set(tahapan.map((t) => t.sasaran).filter((x): x is string => Boolean(x)))], [tahapan]);
  const tersaring = React.useMemo(
    () =>
      tahapan.filter(
        (t) =>
          (libur || !(t.libur || t.kelompok === 'libur')) &&
          (kegiatan || t.kelompok !== 'kegiatan') &&
          (!sasaran || !t.sasaran || t.sasaran === sasaran || (sasaran === 'Maba' ? /maba/i.test(t.sasaran) : t.sasaran.includes(sasaran.replace('SMT ', '')))),
      ),
    [tahapan, libur, kegiatan, sasaran],
  );
  const infoEkspor: InfoDesainKalender = { ...info, logo: gambar.logo ?? (info.logo?.startsWith('data:') ? info.logo : null), penetap: info.penetap ? { ...info.penetap, ttd: gambar.ttd } : info.penetap };
  const u = UKURAN_DESAIN_KALENDER[ukuran];
  const nama = `${namaBerkas}-${varian}-${ukuran}`;

  async function unduh(jenis: 'png' | 'pdf') {
    if (!ref.current) return;
    setSibuk(jenis);
    setGalat(null);
    try {
      const skala = u.gambar ? 2 : 300 / 96;
      if (jenis === 'png') await unduhPngKalender(ref.current, nama, skala);
      else await unduhPdfKalender(ref.current, nama, u.ptW, u.ptH, skala);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Unduhan gagal.');
    } finally {
      setSibuk(null);
    }
  }

  const pilih = <T extends string>(label: string, nilai: T, set: (v: T) => void, opsi: { value: T; label: string; disabled?: boolean }[]) => (
    <label className="u-unduh-kal-pilih">
      <span>{label}</span>
      <select value={nilai} onChange={(e) => set(e.target.value as T)}>
        {opsi.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className={cn('u-unduh-kal', className)}>
      <div className="u-unduh-kal-alat">
        <div className="u-unduh-kal-varian" role="radiogroup" aria-label="Varian desain">
          {VARIAN_DESAIN_KALENDER.map((v) => (
            <button key={v.value} type="button" role="radio" aria-checked={varian === v.value} disabled={u.gambar && v.value !== 'poster' && v.value !== 'linimasa'} onClick={() => setVarian(v.value)} title={v.keterangan}>
              <strong>{v.label}</strong>
              <span>{v.keterangan}</span>
            </button>
          ))}
        </div>
        <div className="u-unduh-kal-baris">
          {pilih('Ukuran', ukuran, setUkuran, (Object.keys(UKURAN_DESAIN_KALENDER) as UkuranDesainKalender[]).map((k) => ({ value: k, label: UKURAN_DESAIN_KALENDER[k].label })))}
          {pilih('Tema', tema, setTema, [
            { value: 'terang', label: 'Terang' },
            { value: 'gelap', label: 'Gelap (poster, garis waktu)' },
          ])}
          {daftarSasaran.length ? pilih('Sasaran', sasaran, setSasaran, [{ value: '', label: 'Semua sasaran' }, ...daftarSasaran.map((s) => ({ value: s, label: s }))]) : null}
          <label className="u-unduh-kal-cek">
            <Checkbox checked={libur} onCheckedChange={(c) => setLibur(c)} /> Libur
          </label>
          <label className="u-unduh-kal-cek">
            <Checkbox checked={kegiatan} onCheckedChange={(c) => setKegiatan(c)} /> Kegiatan
          </label>
          {saringan}
        </div>
      </div>
      <div className="u-unduh-kal-pratinjau" aria-label="Pratinjau">
        <DesainKalender ref={ref} tahapan={tersaring} info={infoEkspor} varian={varian} ukuran={ukuran} tema={tema} style={{ width: '100%', height: 'auto', maxWidth: u.w > u.h ? 900 : 620 }} />
      </div>
      {galat ? <p className="u-unduh-kal-galat">{galat}</p> : null}
      <div className="u-unduh-kal-aksi">
        <Button variant="outline" onClick={() => ref.current && cetakKalender(ref.current, ukuran)}>
          <Printer /> Cetak (PDF vektor)
        </Button>
        <Button variant="outline" loading={sibuk === 'png'} onClick={() => unduh('png')}>
          <FileImage /> Unduh PNG
        </Button>
        <Button loading={sibuk === 'pdf'} onClick={() => unduh('pdf')}>
          {sibuk ? <Download /> : <FileText />} Unduh PDF
        </Button>
      </div>
    </div>
  );
}
