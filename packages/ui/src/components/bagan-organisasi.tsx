'use client';
import * as React from 'react';
import { ChevronsDownUp, ChevronsUpDown, Download, FileImage, FileText, Maximize, Minimize, Minus, Plus, Printer, ScanSearch, UsersRound } from 'lucide-react';
import { cn } from '../lib/cn';
import { hueFromString, initials } from '../lib/format';
import { Button } from './actions';
import { Dialog, Menu } from './overlays';

// ================================================================ Bagan organisasi (struktur organisasi v2)

/**
 * Bagan struktur organisasi bertingkat sungguhan: tata letak pohon vertikal per tingkat, garis siku penghubung, kartu unit
 * dengan pimpinan (foto/inisial), lencana jenis berwarna, dan jumlah pejabat/sub-unit. Anak yang semuanya daun (mis. prodi
 * di bawah fakultas, biro di bawah Wakil Rektor) ditumpuk vertikal supaya bagan tidak melebar; unit berhubungan koordinasi
 * (Senat, Yayasan) tampil di samping garis utama dengan garis putus. Bisa dilipat per cabang, diperbesar/dikecilkan,
 * digeser, dipaskan ke layar, dilihat dengan peta mini, serta diunduh PNG/PDF atau dicetak (vektor).
 *
 * Data datar `{ id, induk_id }`; urutan saudara mengikuti `urutJenis` lalu urutan masukan.
 *
 *   <BaganOrganisasi data={unit} judul="Struktur Organisasi Universitas Pohuwato" onPilihUnit={(u) => buka(u.id)} />
 *   <BaganOrganisasi data={unit} akar="fak-01" rinci onIsiJabatan={(u, j) => isi(u.id, j.jabatan_id)} />
 */

export interface JabatanBagan {
  /** Nama jabatan, mis. "Dekan". */
  jabatan: string;
  /** Kosong = jabatan belum diisi (tampil "Belum diisi"). */
  nama?: string | null;
  foto?: string | null;
  /** Pelaksana tugas / harian. */
  status?: 'plt' | 'plh' | null;
  /** Data tambahan pemanggil (mis. jabatan_id), dikembalikan di onIsiJabatan/onPilihPejabat. */
  ref?: unknown;
}

export interface UnitBagan {
  id: string;
  induk_id?: string | null;
  nama: string;
  singkatan?: string | null;
  /** universitas, rektorat, biro, fakultas, prodi, lembaga, upt, bagian, unit, atau jenis lain (warna netral). */
  jenis?: string | null;
  /** Hubungan koordinasi ke induk (garis putus, di samping garis utama). */
  koordinasi?: boolean;
  /** Lencana kecil di pojok kanan atas kartu, mis. kampus tempat unit tersedia ("Kampus II"). */
  lencana?: string | null;
  aktif?: boolean;
  /** Jabatan terisi dan kosong; yang pertama terisi menjadi pimpinan di kartu ringkas. */
  jabatan?: JabatanBagan[];
  /** Tendik dan staf unit (mis. dari SDM): tampil sebagai kelompok kecil di kartu (beberapa + "+N lainnya"). */
  staf?: StafBagan[];
}

export interface StafBagan {
  nama: string;
  /** Tugas/jabatan fungsional, mis. "Operator akademik", "Laboran". */
  tugas?: string | null;
  /** Data tambahan pemanggil (mis. id pegawai), dikembalikan di onPilihStaf. */
  ref?: unknown;
}

export interface GayaJenisBagan {
  label: string;
  warna: string;
}

export const GAYA_JENIS_BAGAN: Record<string, GayaJenisBagan> = {
  universitas: { label: 'Universitas', warna: '#244ce6' },
  rektorat: { label: 'Rektorat', warna: '#4f46e5' },
  kampus: { label: 'Kampus', warna: '#be185d' },
  biro: { label: 'Biro', warna: '#7c3aed' },
  bagian: { label: 'Bagian', warna: '#64748b' },
  lembaga: { label: 'Lembaga', warna: '#d97706' },
  upt: { label: 'UPT', warna: '#0f9f8f' },
  fakultas: { label: 'Fakultas', warna: '#0284c7' },
  prodi: { label: 'Program studi', warna: '#059669' },
  unit: { label: 'Unit', warna: '#5b7083' },
};

const URUT_JENIS = ['universitas', 'rektorat', 'kampus', 'lembaga', 'biro', 'bagian', 'upt', 'unit', 'fakultas', 'prodi'];

export interface BaganOrganisasiProps {
  data: UnitBagan[];
  /** id unit akar (bagan sub-pohon, mis. satu fakultas). Bawaan: semua akar. */
  akar?: string | null;
  judul?: React.ReactNode;
  /** Teks judul untuk berkas unduhan/cetak (bawaan dari judul bila string). */
  judulBerkas?: string;
  subjudul?: string;
  /** Kartu memuat semua jabatan (terisi dan kosong), bukan hanya pimpinan. */
  rinci?: boolean;
  /** Tampilkan tombol ringkas/rinci di bilah alat. Bawaan true. */
  gantiRinci?: boolean;
  /** Tingkat yang terbuka di awal (0 = akar saja). Bawaan 3. */
  buka?: number;
  /** Tinggi area bagan. Bawaan 640. */
  tinggi?: number | string;
  gayaJenis?: Record<string, GayaJenisBagan>;
  urutJenis?: string[];
  onPilihUnit?: (u: UnitBagan) => void;
  /** Klik "Isi" pada jabatan kosong (mis. buka formulir pejabat). Tanpa ini tombol Isi tidak tampil. */
  onIsiJabatan?: (u: UnitBagan, j: JabatanBagan) => void;
  /** Tampilkan tendik/staf di kartu (bila data punya `staf`). Bawaan true; bisa disembunyikan dari bilah alat. */
  tampilStaf?: boolean;
  /** Klik nama tendik/staf (mis. buka profil pegawai di SDM). */
  onPilihStaf?: (s: StafBagan, u: UnitBagan) => void;
  /** Nama berkas unduhan tanpa ekstensi. */
  namaBerkas?: string;
  /** Peta mini di pojok. Bawaan true. */
  petaMini?: boolean;
  className?: string;
}

// ---------------------------------------------------------------- ukuran

/** Lebar kartu; kartu rinci (semua jabatan) lebih lebar supaya nama jabatan berbidang terbaca. */
const W_RINGKAS = 248;
const W_RINCI = 296;
const IND = 30;
const GAP_X = 28;
const GAP_Y = 64;
const H_RINGKAS = 132;
const BARIS = 40;
const KEPALA = 66;

interface Simpul {
  u: UnitBagan;
  anak: Simpul[];
  koord: Simpul[];
  tingkat: number;
  turunan: number;
  tutup: boolean;
  tumpuk: boolean;
  /** Kolom virtual (tanpa kartu) berisi saudara-saudara daun yang ditumpuk, di samping cabang lain. */
  virtual?: boolean;
  w: number;
  h: number;
  sw: number;
  sh: number;
  x: number;
  y: number;
}

const STAF_MAKS = 3;
const STAF_BARIS = 22;

function tinggiInti(u: UnitBagan, rinci: boolean): number {
  if (!rinci) return H_RINGKAS;
  return KEPALA + Math.max(1, u.jabatan?.length ?? 0) * BARIS + 12;
}

function tinggiStaf(u: UnitBagan): number {
  const n = u.staf?.length ?? 0;
  return n ? 30 + Math.min(n, STAF_MAKS) * STAF_BARIS + (n > STAF_MAKS ? 20 : 0) + 4 : 0;
}

function tinggiKartu(u: UnitBagan, rinci: boolean, staf: boolean): number {
  return tinggiInti(u, rinci) + (staf ? tinggiStaf(u) : 0);
}

function potong(teks: string, lebar: number, ukuran: number, maks: number): string[] {
  // Huruf kapital lebih lebar dari rata-rata huruf kecil.
  const kapital = teks.replace(/[^A-Za-z]/g, '');
  const rasio = kapital && kapital === kapital.toUpperCase() ? 0.68 : 0.56;
  const cw = ukuran * rasio;
  const per = Math.max(4, Math.floor(lebar / cw));
  const kata = teks.split(/\s+/).filter(Boolean);
  const baris: string[] = [];
  let kini = '';
  for (const k of kata) {
    const coba = kini ? `${kini} ${k}` : k;
    if (coba.length <= per) kini = coba;
    else {
      if (kini) baris.push(kini);
      kini = k.length > per ? `${k.slice(0, per - 1)}…` : k;
    }
    if (baris.length === maks) break;
  }
  if (baris.length < maks && kini) baris.push(kini);
  if (baris.length === maks && kata.join(' ').length > baris.join(' ').length) {
    const t = baris[maks - 1];
    baris[maks - 1] = t.length >= per ? `${t.slice(0, per - 1)}…` : `${t}…`;
  }
  return baris;
}

/** Susun pohon dari data datar dan hitung posisi. */
function tata(data: UnitBagan[], akar: string | null | undefined, rinci: boolean, tertutup: Set<string>, urutJenis: string[], staf = false) {
  const W = rinci ? W_RINCI : W_RINGKAS;
  const peta = new Map(data.map((u) => [u.id, u]));
  const anakDari = new Map<string | null, UnitBagan[]>();
  for (const u of data) {
    const p = u.induk_id && peta.has(u.induk_id) && u.induk_id !== u.id ? u.induk_id : null;
    const l = anakDari.get(p);
    if (l) l.push(u);
    else anakDari.set(p, [u]);
  }
  const ur = (j?: string | null) => {
    const i = urutJenis.indexOf(j ?? '');
    return i < 0 ? urutJenis.length : i;
  };
  const dilihat = new Set<string>();
  const bangun = (u: UnitBagan, tingkat: number): Simpul => {
    dilihat.add(u.id);
    const semua = (anakDari.get(u.id) ?? []).filter((x) => !dilihat.has(x.id)).map((x, i) => ({ x, i }));
    semua.sort((a, b) => ur(a.x.jenis) - ur(b.x.jenis) || a.i - b.i);
    const anakS = semua.map(({ x }) => bangun(x, tingkat + 1));
    const turunan = anakS.reduce((n, a) => n + 1 + a.turunan, 0);
    const tutup = tertutup.has(u.id) && anakS.length > 0;
    let biasa = tutup ? [] : anakS.filter((a) => !a.u.koordinasi);
    // Saudara campuran: yang daun (tanpa anak terlihat) dikumpulkan dalam satu kolom bertumpuk supaya tidak melebar.
    const daun = biasa.filter((a) => a.anak.length === 0 && a.koord.length === 0);
    if (daun.length >= 2 && daun.length < biasa.length) {
      const v: Simpul = {
        u: { id: `${u.id}#daun`, nama: '' }, tingkat: tingkat + 1, turunan: 0, tutup: false, anak: daun, koord: [], tumpuk: true, virtual: true,
        w: W, h: 0, sw: 0, sh: 0, x: 0, y: 0,
      };
      biasa = [...biasa.filter((a) => !daun.includes(a)), v];
    }
    return {
      u, tingkat, turunan, tutup,
      anak: biasa,
      koord: tutup ? [] : anakS.filter((a) => a.u.koordinasi),
      tumpuk: false, w: W, h: tinggiKartu(u, rinci, staf), sw: 0, sh: 0, x: 0, y: 0,
    };
  };
  const akarU = akar ? [peta.get(akar)].filter((x): x is UnitBagan => !!x) : anakDari.get(null) ?? [];
  const akarS = akarU.map((u) => bangun(u, 0));

  // Ukuran sub-pohon (lebar sw, tinggi sh).
  const ukur = (s: Simpul) => {
    s.anak.forEach(ukur);
    s.koord.forEach(ukur);
    const daun = s.anak.length > 0 && s.anak.every((a) => a.anak.length === 0 && a.koord.length === 0 && !a.virtual);
    s.tumpuk = s.virtual || (daun && s.tingkat > 0 && s.anak.length > 1);
    let lebarAnak = 0;
    let tinggiAnak = 0;
    if (s.tumpuk) {
      lebarAnak = IND + W;
      tinggiAnak = s.anak.reduce((t, a) => t + a.h + 16, 0) - 16;
    } else if (s.anak.length) {
      lebarAnak = s.anak.reduce((t, a) => t + a.sw, 0) + GAP_X * (s.anak.length - 1);
      tinggiAnak = Math.max(...s.anak.map((a) => a.sh));
    }
    const kiri = Math.ceil(s.koord.length / 2);
    const lebarKoord = s.koord.length ? 2 * kiri * (W + GAP_X) + GAP_X : 0;
    const tinggiKoord = s.koord.length ? Math.max(...s.koord.map((k) => k.h)) + GAP_Y * 0.6 : 0;
    s.sw = Math.max(W, lebarAnak, lebarKoord);
    s.sh = s.virtual ? tinggiAnak : s.h + (s.koord.length ? GAP_Y * 0.6 + tinggiKoord : 0) + (s.anak.length ? GAP_Y + tinggiAnak : 0);
  };
  // Posisi.
  const letak = (s: Simpul, kiri: number, atas: number) => {
    s.y = atas;
    s.x = s.tumpuk ? kiri + (s.sw - (IND + W)) / 2 : kiri + (s.sw - W) / 2;
    const cx = s.x + W / 2;
    let y = atas + s.h;
    if (s.koord.length) {
      y += GAP_Y * 0.6;
      const kiriN = Math.ceil(s.koord.length / 2);
      s.koord.forEach((k, i) => {
        const sisiKiri = i < kiriN;
        const pos = sisiKiri ? kiriN - 1 - i : i - kiriN;
        const kx = sisiKiri ? cx - GAP_X / 2 - (pos + 1) * W - pos * GAP_X : cx + GAP_X / 2 + pos * (W + GAP_X);
        letak(k, kx - (k.sw - W) / 2, y);
      });
      y += Math.max(...s.koord.map((k) => k.h));
    }
    if (!s.anak.length) return;
    if (!s.virtual) y += GAP_Y;
    if (s.tumpuk) {
      let yy = y;
      for (const a of s.anak) {
        a.sw = W;
        letak(a, s.x + IND, yy);
        yy += a.h + 16;
      }
      return;
    }
    const total = s.anak.reduce((t, a) => t + a.sw, 0) + GAP_X * (s.anak.length - 1);
    let x = kiri + (s.sw - total) / 2;
    for (const a of s.anak) {
      letak(a, x, y);
      x += a.sw + GAP_X;
    }
  };
  let x = 0;
  for (const s of akarS) {
    ukur(s);
    letak(s, x, 0);
    x += s.sw + GAP_X * 2;
  }
  const semua: Simpul[] = [];
  const jalan = (s: Simpul) => {
    semua.push(s);
    s.koord.forEach(jalan);
    s.anak.forEach(jalan);
  };
  akarS.forEach(jalan);
  const minX = Math.min(0, ...semua.map((s) => s.x));
  const maxX = Math.max(...semua.map((s) => s.x + W), 0);
  const maxY = Math.max(...semua.map((s) => s.y + s.h), 0);
  return { akar: akarS, semua, kotak: { x: minX, y: 0, w: maxX - minX, h: maxY } };
}

// ---------------------------------------------------------------- warna

interface Palet {
  kartu: string;
  teks: string;
  redup: string;
  garis: string;
  /** Tepi kartu dan pemisah di dalam kartu. */
  tepi: string;
  sorot: string;
  latar: string;
  kosong: string;
}

const PALET_CETAK: Palet = { kartu: '#ffffff', teks: '#171a21', redup: '#6b7482', garis: '#9aa2ae', tepi: '#d5dae1', sorot: '#244ce6', latar: '#ffffff', kosong: '#f7f8fa' };
const PALET_LAYAR: Palet = {
  // Garis penghubung lebih tegas dari border kartu supaya alur terbaca di latar bertitik.
  kartu: 'var(--u-card, #fff)', teks: 'var(--u-foreground, #171a21)', redup: 'var(--u-muted-foreground, #6b7482)', garis: 'color-mix(in srgb, var(--u-muted-foreground, #6b7482) 55%, transparent)', tepi: 'var(--u-border, #d5dae1)',
  sorot: 'var(--u-primary, #244ce6)', latar: 'transparent', kosong: 'var(--u-muted, #f7f8fa)',
};

const warnaAvatar = (nama: string) => `hsl(${hueFromString(nama)} 55% 45%)`;

// ---------------------------------------------------------------- SVG

interface SvgProps {
  hasil: ReturnType<typeof tata>;
  rinci: boolean;
  palet: Palet;
  gaya: Record<string, GayaJenisBagan>;
  ekspor?: boolean;
  onToggle?: (id: string) => void;
  onPilih?: (u: UnitBagan) => void;
  onIsi?: (u: UnitBagan, j: JabatanBagan) => void;
  staf?: boolean;
  onSemuaStaf?: (u: UnitBagan) => void;
  onPilihStaf?: (s: StafBagan, u: UnitBagan) => void;
}

function Garis({ s, p, tumpul = 10 }: { s: Simpul; p: Palet; tumpul?: number }) {
  const W = s.w;
  const cx = s.x + W / 2;
  const bawah = s.y + s.h;
  const out: React.ReactNode[] = [];
  const r = tumpul;
  if (s.koord.length) {
    const ky = s.koord[0].y + s.koord[0].h / 2;
    const ujung = s.anak.length ? (s.tumpuk ? s.anak[0].y - GAP_Y / 2 : s.anak[0].y - GAP_Y / 2) : ky;
    out.push(<path key="tk" d={`M${cx},${bawah} V${Math.max(ujung, ky)}`} stroke={p.garis} strokeWidth={1.5} fill="none" />);
    s.koord.forEach((k, i) => {
      const kanan = k.x > cx;
      out.push(<path key={`k${i}`} d={`M${cx},${k.y + k.h / 2} H${kanan ? k.x : k.x + W}`} stroke={p.garis} strokeWidth={1.5} strokeDasharray="6 5" fill="none" />);
    });
  }
  if (!s.anak.length) return <>{out}</>;
  if (s.tumpuk) {
    const sx = s.x + IND / 2;
    const akhir = s.anak[s.anak.length - 1];
    out.push(<path key="tt" d={`M${sx},${s.virtual ? s.y : bawah} V${akhir.y + 28 - r}`} stroke={p.garis} strokeWidth={1.5} fill="none" />);
    s.anak.forEach((a, i) => {
      const yy = a.y + 28;
      out.push(<path key={`t${i}`} d={`M${sx},${yy - r} Q${sx},${yy} ${sx + r},${yy} H${a.x}`} stroke={p.garis} strokeWidth={1.5} fill="none" />);
    });
    return <>{out}</>;
  }
  const midY = s.anak[0].y - GAP_Y / 2;
  out.push(<path key="tr" d={`M${cx},${s.koord.length ? Math.max(bawah, s.koord[0].y + s.koord[0].h / 2) : bawah} V${midY}`} stroke={p.garis} strokeWidth={1.5} fill="none" />);
  s.anak.forEach((a, i) => {
    const ax = a.virtual ? a.x + IND / 2 : a.x + W / 2;
    const d = Math.abs(ax - cx) < 1 ? `M${ax},${midY} V${a.y}` : `M${cx},${midY} H${ax + (ax > cx ? -r : r)} Q${ax},${midY} ${ax},${midY + r} V${a.y}`;
    out.push(<path key={`a${i}`} d={d} stroke={p.garis} strokeWidth={1.5} fill="none" />);
  });
  return <>{out}</>;
}

function Avatar({ x, y, r, nama, foto, kosong, p, id }: { x: number; y: number; r: number; nama?: string | null; foto?: string | null; kosong?: boolean; p: Palet; id: string }) {
  if (kosong || !nama) return <circle cx={x} cy={y} r={r} fill={p.kosong} stroke={p.tepi} strokeDasharray="3 3" />;
  if (foto) {
    return (
      <g>
        <clipPath id={id}><circle cx={x} cy={y} r={r} /></clipPath>
        <image href={foto} x={x - r} y={y - r} width={r * 2} height={r * 2} clipPath={`url(#${id})`} preserveAspectRatio="xMidYMid slice" />
      </g>
    );
  }
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={warnaAvatar(nama)} />
      <text x={x} y={y + r * 0.36} textAnchor="middle" fontSize={r * 0.9} fontWeight={600} fill="#fff">{initials(nama)}</text>
    </g>
  );
}

function Kartu({ s, rinci, palet: p, gaya, ekspor, onToggle, onPilih, onIsi, staf, onSemuaStaf, onPilihStaf }: SvgProps & { s: Simpul }) {
  const W = s.w;
  const u = s.u;
  const g = gaya[u.jenis ?? ''] ?? { label: u.jenis ?? 'Unit', warna: '#5b7083' };
  const nonaktif = u.aktif === false;
  const judul = potong(u.nama, W - 28, 13, 2);
  const pimpinan = (u.jabatan ?? []).find((j) => j.nama);
  const kosongN = (u.jabatan ?? []).filter((j) => !j.nama).length;
  const isiN = (u.jabatan ?? []).length - kosongN;
  const uid = `bo-${u.id.replace(/[^a-z0-9_-]/gi, '')}`;
  const bisaKlik = !ekspor && !!onPilih;
  return (
    <g transform={`translate(${s.x},${s.y})`} opacity={nonaktif ? 0.55 : 1}>
      <g
        className={bisaKlik ? 'u-bagan-kartu' : undefined}
        role={bisaKlik ? 'button' : undefined}
        tabIndex={bisaKlik ? 0 : undefined}
        aria-label={bisaKlik ? `${u.nama}: lihat detail` : undefined}
        onClick={bisaKlik ? () => onPilih?.(u) : undefined}
        onKeyDown={bisaKlik ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPilih?.(u); } } : undefined}
      >
        <rect width={W} height={s.h} rx={14} fill={p.kartu} stroke={u.koordinasi ? g.warna : p.tepi} strokeDasharray={u.koordinasi ? '6 4' : undefined} strokeWidth={u.koordinasi ? 1.5 : 1} filter={ekspor ? undefined : 'url(#bo-bayang)'} />
        <clipPath id={`${uid}-c`}><rect width={W} height={s.h} rx={14} /></clipPath>
        <rect x={0} y={0} width={W} height={5} fill={g.warna} clipPath={`url(#${uid}-c)`} />
        <rect x={14} y={14} width={Math.min(W - 28, (g.label.length + (u.koordinasi ? 13 : 0) + (nonaktif ? 11 : 0)) * 6.2 + 16)} height={18} rx={9} fill={g.warna} fillOpacity={ekspor ? 0.12 : 0.16} />
        <text x={22} y={27} fontSize={10.5} fontWeight={600} fill={ekspor ? g.warna : `color-mix(in srgb, ${g.warna} 72%, var(--u-foreground, #171a21))`}>{g.label}{u.koordinasi ? ' · koordinasi' : ''}{nonaktif ? ' · nonaktif' : ''}</text>
        {u.lencana && <text x={W - 14} y={27} textAnchor="end" fontSize={10} fontWeight={600} fill={p.redup}>{potong(u.lencana, 90, 10, 1)[0]}</text>}
        {judul.map((b, i) => <text key={i} x={14} y={52 + i * 16} fontSize={13} fontWeight={650} fill={p.teks}>{b}</text>)}
        {!rinci ? (
          <>
            <line x1={14} x2={W - 14} y1={86} y2={86} stroke={p.tepi} strokeWidth={0.75} />
            <Avatar x={30} y={108} r={14} nama={pimpinan?.nama} foto={ekspor ? null : pimpinan?.foto} kosong={!pimpinan} p={p} id={`${uid}-a`} />
            <text x={52} y={104} fontSize={12} fontWeight={600} fill={pimpinan ? p.teks : p.redup} fontStyle={pimpinan ? undefined : 'italic'}>{potong(pimpinan ? `${pimpinan.status ? `${pimpinan.status === 'plt' ? 'Plt.' : 'Plh.'} ` : ''}${pimpinan.nama}` : 'Belum diisi', W - 66, 12, 1)[0]}</text>
            <text x={52} y={119} fontSize={10.5} fill={p.redup}>{potong(pimpinan?.jabatan ?? (u.jabatan?.[0]?.jabatan ?? 'Pimpinan unit'), W - 66, 10.5, 1)[0]}{isiN > 1 ? ` · +${isiN - 1} pejabat` : ''}</text>
          </>
        ) : (
          (u.jabatan?.length ? u.jabatan : [{ jabatan: 'Belum ada jabatan tercatat' } as JabatanBagan]).map((j, i) => {
            const y = KEPALA + i * BARIS;
            const kosong = !j.nama;
            const tampilIsi = kosong && !!onIsi && !ekspor && !!u.jabatan?.length;
            return (
              <g key={i} transform={`translate(0,${y})`}>
                <line x1={14} x2={W - 14} y1={2} y2={2} stroke={p.tepi} strokeWidth={0.75} />
                <Avatar x={28} y={22} r={12} nama={j.nama} foto={ekspor ? null : j.foto} kosong={kosong} p={p} id={`${uid}-${i}`} />
                <text x={48} y={19} fontSize={11.5} fontWeight={600} fill={kosong ? p.redup : p.teks} fontStyle={kosong ? 'italic' : undefined}>{potong(kosong ? 'Belum diisi' : `${j.status ? `${j.status === 'plt' ? 'Plt.' : 'Plh.'} ` : ''}${j.nama}`, W - (tampilIsi ? 104 : 62), 11.5, 1)[0]}</text>
                <text x={48} y={33} fontSize={10} fill={p.redup}>{potong(j.jabatan, W - (tampilIsi ? 104 : 62), 10, 1)[0]}</text>
                {tampilIsi && (
                  <g
                    className="u-bagan-isi"
                    role="button"
                    tabIndex={0}
                    aria-label={`Isi ${j.jabatan} ${u.nama}`}
                    onClick={(e) => { e.stopPropagation(); onIsi?.(u, j); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onIsi?.(u, j); } }}
                  >
                    <rect x={W - 52} y={11} width={38} height={22} rx={11} fill={p.sorot} fillOpacity={0.12} />
                    <text x={W - 33} y={26} textAnchor="middle" fontSize={11} fontWeight={600} fill={p.sorot}>Isi</text>
                  </g>
                )}
              </g>
            );
          })
        )}
        {staf && !!u.staf?.length && (
          <g transform={`translate(0,${tinggiInti(u, rinci)})`}>
            <line x1={14} x2={W - 14} y1={2} y2={2} stroke={p.tepi} strokeWidth={0.75} strokeDasharray="3 3" />
            <text x={14} y={20} fontSize={10} fontWeight={600} fill={p.redup}>Tendik & staf · {u.staf.length}</text>
            {u.staf.slice(0, STAF_MAKS).map((t, i) => {
              const bisa = !ekspor && !!onPilihStaf;
              const nama = potong(t.nama, t.tugas ? 132 : W - 52, 11, 1)[0];
              const lebarNama = Math.min(t.tugas ? 132 : W - 52, nama.length * (nama === nama.toUpperCase() ? 7.4 : 6.2));
              const tugas = t.tugas ? potong(t.tugas, W - 52 - lebarNama - 8, 10, 1)[0] : '';
              return (
                <g
                  key={i}
                  transform={`translate(0,${30 + i * STAF_BARIS})`}
                  className={bisa ? 'u-bagan-staf' : undefined}
                  role={bisa ? 'button' : undefined}
                  tabIndex={bisa ? 0 : undefined}
                  aria-label={bisa ? `${t.nama}: lihat profil` : undefined}
                  onClick={bisa ? (e) => { e.stopPropagation(); onPilihStaf?.(t, u); } : undefined}
                  onKeyDown={bisa ? (e) => { if (e.key === 'Enter') { e.stopPropagation(); onPilihStaf?.(t, u); } } : undefined}
                >
                  <Avatar x={22} y={8} r={8} nama={t.nama} p={p} id={`${uid}-s${i}`} />
                  <text x={36} y={12} fontSize={11} fill={p.teks}>
                    <tspan fontWeight={600}>{nama}</tspan>
                    {tugas && <tspan fill={p.redup} fontSize={10}>{`  ${tugas}`}</tspan>}
                  </text>
                </g>
              );
            })}
            {u.staf.length > STAF_MAKS && (
              <g
                transform={`translate(0,${30 + STAF_MAKS * STAF_BARIS})`}
                className={!ekspor && onSemuaStaf ? 'u-bagan-staf' : undefined}
                role={!ekspor && onSemuaStaf ? 'button' : undefined}
                tabIndex={!ekspor && onSemuaStaf ? 0 : undefined}
                aria-label={`Semua tendik dan staf ${u.nama}`}
                onClick={!ekspor && onSemuaStaf ? (e) => { e.stopPropagation(); onSemuaStaf(u); } : undefined}
                onKeyDown={!ekspor && onSemuaStaf ? (e) => { if (e.key === 'Enter') { e.stopPropagation(); onSemuaStaf(u); } } : undefined}
              >
                <text x={36} y={10} fontSize={10.5} fontWeight={600} fill={p.sorot}>+{u.staf.length - STAF_MAKS} lainnya</text>
              </g>
            )}
          </g>
        )}
      </g>
      {s.turunan > 0 && !ekspor && (
        <g
          className="u-bagan-lipat"
          role="button"
          tabIndex={0}
          aria-label={s.tutup ? `Buka cabang ${u.nama}` : `Tutup cabang ${u.nama}`}
          aria-expanded={!s.tutup}
          transform={`translate(${s.tumpuk ? IND / 2 : W / 2},${s.h})`}
          onClick={() => onToggle?.(u.id)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle?.(u.id); } }}
        >
          <circle r={s.tutup ? 13 : 10} fill={p.kartu} stroke={s.tutup ? g.warna : p.garis} strokeWidth={1.25} />
          {s.tutup ? (
            <text y={4} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={g.warna}>{s.turunan > 99 ? '99+' : `+${s.turunan}`}</text>
          ) : (
            <path d="M-4,0 H4" stroke={p.redup} strokeWidth={1.75} strokeLinecap="round" />
          )}
        </g>
      )}
    </g>
  );
}

function IsiSvg(props: SvgProps) {
  const { hasil } = props;
  return (
    <>
      <defs>
        <filter id="bo-bayang" x="-10%" y="-10%" width="120%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.08" />
        </filter>
      </defs>
      <g>{hasil.semua.map((s) => <Garis key={`g${s.u.id}`} s={s} p={props.palet} />)}</g>
      <g>{hasil.semua.filter((s) => !s.virtual).map((s) => <Kartu key={s.u.id} {...props} s={s} />)}</g>
    </>
  );
}

// ---------------------------------------------------------------- unduh dan cetak

const KERTAS = { a4l: [841.89, 595.28], a4p: [595.28, 841.89], a3l: [1190.55, 841.89], a3p: [841.89, 1190.55] } as const;

function kertasUntuk(w: number, h: number): readonly [number, number] {
  const lanskap = w >= h;
  const besar = Math.max(w, h) > 1800;
  return lanskap ? (besar ? KERTAS.a3l : KERTAS.a4l) : besar ? KERTAS.a3p : KERTAS.a4p;
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
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('Bagan gagal digambar.'));
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

function simpanBlob(b: Blob, nama: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/** Skala gambar: target ~300 dpi, dibatasi 9000 px sisi terpanjang (batas kanvas peramban). */
const skalaAman = (w: number, h: number, target = 300 / 96) => Math.max(1, Math.min(target, 9000 / Math.max(w, h)));

async function unduhPng(svg: SVGSVGElement, nama: string) {
  const w = Number(svg.getAttribute('width'));
  const h = Number(svg.getAttribute('height'));
  const c = await keKanvas(svg, skalaAman(w, h));
  const b = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
  if (!b) throw new Error('PNG gagal dibuat.');
  simpanBlob(b, `${nama}.png`);
}

/** PDF satu halaman (A4/A3, arah mengikuti bentuk bagan) berisi gambar resolusi tinggi; tanpa pustaka tambahan. */
async function unduhPdf(svg: SVGSVGElement, nama: string, judul: string) {
  const w = Number(svg.getAttribute('width'));
  const h = Number(svg.getAttribute('height'));
  const [ptW, ptH] = kertasUntuk(w, h);
  const c = await keKanvas(svg, skalaAman(w, h));
  const b = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.92));
  if (!b) throw new Error('PDF gagal dibuat.');
  const jpg = new Uint8Array(await b.arrayBuffer());
  const m = 24;
  const sk = Math.min((ptW - 2 * m) / w, (ptH - 2 * m) / h);
  const iw = w * sk;
  const ih = h * sk;
  const ix = (ptW - iw) / 2;
  const iy = (ptH - ih) / 2;
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
  const isiHalaman = `q ${iw.toFixed(2)} 0 0 ${ih.toFixed(2)} ${ix.toFixed(2)} ${iy.toFixed(2)} cm /Im0 Do Q`;
  const aman = judul.replace(/[()\\]/g, '').replace(/[^\x20-\x7e]/g, '');
  tulis('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW.toFixed(2)} ${ptH.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offset[4] = pjg;
  tulis(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);
  tulis(jpg);
  tulis('\nendstream\nendobj\n');
  obj(5, `<< /Length ${isiHalaman.length} >>\nstream\n${isiHalaman}\nendstream`);
  obj(6, `<< /Title (${aman || 'Struktur Organisasi'}) /Producer (unipo-ui) >>`);
  const xref = pjg;
  let x = 'xref\n0 7\n0000000000 65535 f \n';
  for (let i = 1; i <= 6; i++) x += `${String(offset[i]).padStart(10, '0')} 00000 n \n`;
  tulis(`${x}trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  simpanBlob(new Blob(bagian as BlobPart[], { type: 'application/pdf' }), `${nama}.pdf`);
}

function cetak(svg: SVGSVGElement, judul: string) {
  const w = Number(svg.getAttribute('width'));
  const h = Number(svg.getAttribute('height'));
  const [ptW, ptH] = kertasUntuk(w, h);
  const kertas = `${ptW === 1190.55 || ptH === 1190.55 ? 'A3' : 'A4'} ${ptW > ptH ? 'landscape' : 'portrait'}`;
  const jendela = window.open('', '_blank');
  if (!jendela) return;
  jendela.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${judul.replace(/</g, '')}</title><style>@page{size:${kertas};margin:10mm}html,body{margin:0}svg{width:100%;height:auto;max-height:100vh;display:block}</style></head><body>${teksSvg(svg)}</body></html>`);
  jendela.document.close();
  jendela.focus();
  setTimeout(() => jendela.print(), 300);
}

// ---------------------------------------------------------------- komponen

export function BaganOrganisasi({
  data, akar, judul, judulBerkas, subjudul, rinci: rinciAwal = false, gantiRinci = true, buka = 3, tinggi = 640, gayaJenis = GAYA_JENIS_BAGAN,
  urutJenis = URUT_JENIS, onPilihUnit, onIsiJabatan, namaBerkas = 'struktur-organisasi', petaMini = true, className,
  tampilStaf: tampilStafAwal = true, onPilihStaf,
}: BaganOrganisasiProps) {
  const adaStaf = React.useMemo(() => data.some((u) => (u.staf?.length ?? 0) > 0), [data]);
  const [tampilStaf, setTampilStaf] = React.useState(tampilStafAwal);
  React.useEffect(() => setTampilStaf(tampilStafAwal), [tampilStafAwal]);
  const staf = adaStaf && tampilStaf;
  const [daftarStaf, setDaftarStaf] = React.useState<UnitBagan | null>(null);
  const [rinci, setRinci] = React.useState(rinciAwal);
  React.useEffect(() => setRinci(rinciAwal), [rinciAwal]);
  // Cabang tertutup awal: tingkat >= buka.
  const awalTutup = React.useCallback(() => {
    const peta = new Map(data.map((u) => [u.id, u]));
    const tingkat = (u: UnitBagan): number => {
      let t = 0;
      let x = u;
      const lihat = new Set<string>();
      while (x.induk_id && peta.has(x.induk_id) && x.id !== akar && !lihat.has(x.id)) {
        lihat.add(x.id);
        x = peta.get(x.induk_id)!;
        t++;
      }
      return t;
    };
    const punyaAnak = new Set(data.map((u) => u.induk_id).filter(Boolean) as string[]);
    return new Set(data.filter((u) => punyaAnak.has(u.id) && tingkat(u) >= buka).map((u) => u.id));
  }, [data, akar, buka]);
  const [tertutup, setTertutup] = React.useState<Set<string>>(awalTutup);
  const kunciData = React.useMemo(() => data.map((u) => u.id).join(','), [data]);
  React.useEffect(() => setTertutup(awalTutup()), [kunciData, akar]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasil = React.useMemo(() => tata(data, akar, rinci, tertutup, urutJenis, staf), [data, akar, rinci, tertutup, urutJenis, staf]);
  const hasilPenuh = React.useMemo(() => tata(data, akar, rinci, new Set(), urutJenis, staf), [data, akar, rinci, urutJenis, staf]);

  const wadah = React.useRef<HTMLDivElement>(null);
  const svgEkspor = React.useRef<SVGSVGElement>(null);
  const [lihat, setLihat] = React.useState({ k: 1, x: 0, y: 0 });
  const [ukuran, setUkuran] = React.useState({ w: 800, h: 600 });
  const [penuh, setPenuh] = React.useState(false);
  const [sibuk, setSibuk] = React.useState<null | 'png' | 'pdf'>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const seret = React.useRef<{ x: number; y: number; lx: number; ly: number } | null>(null);
  const PAD = 32;

  React.useEffect(() => {
    const el = wadah.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setUkuran({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const paskan = React.useCallback((terbaca = false) => {
    const { kotak } = hasil;
    if (!kotak.w || !ukuran.w) return;
    const k = Math.max(0.2, Math.min(1.25, (ukuran.w - PAD * 2) / kotak.w, (ukuran.h - PAD * 2) / Math.max(kotak.h, 1)));
    // Tampilan awal: bila seluruh bagan terlalu kecil untuk dibaca, mulai dari akar dengan skala terbaca.
    const akar = hasil.akar[0];
    if (terbaca && k < 0.6 && akar) {
      const kb = 0.6;
      setLihat({ k: kb, x: ukuran.w / 2 - (akar.x + akar.w / 2) * kb, y: PAD });
      return;
    }
    setLihat({ k, x: (ukuran.w - kotak.w * k) / 2 - kotak.x * k, y: PAD });
  }, [hasil, ukuran]);
  const sudahPas = React.useRef('');
  React.useEffect(() => {
    const kunci = `${kunciData}|${akar ?? ''}|${Math.round(ukuran.w / 100)}|${rinci}`;
    if (sudahPas.current !== kunci && ukuran.w > 0) {
      sudahPas.current = kunci;
      paskan(true);
    }
  }, [kunciData, akar, ukuran.w, rinci, paskan]);

  const zoom = (f: number, cx = ukuran.w / 2, cy = ukuran.h / 2) =>
    setLihat((v) => {
      const k = Math.max(0.15, Math.min(2.5, v.k * f));
      return { k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k };
    });

  React.useEffect(() => {
    const el = wadah.current;
    if (!el) return;
    const roda = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) zoom(Math.exp(-e.deltaY * 0.0025), e.clientX - r.left, e.clientY - r.top);
      else setLihat((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    };
    el.addEventListener('wheel', roda, { passive: false });
    return () => el.removeEventListener('wheel', roda);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    const ubah = () => setPenuh(document.fullscreenElement === wadah.current?.parentElement);
    document.addEventListener('fullscreenchange', ubah);
    return () => document.removeEventListener('fullscreenchange', ubah);
  }, []);

  const toggle = (id: string) =>
    setTertutup((t) => {
      const n = new Set(t);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const semuaTerbuka = tertutup.size === 0;
  const teksJudul = judulBerkas ?? (typeof judul === 'string' ? judul : 'Struktur Organisasi');

  // SVG ekspor: semua cabang terbuka, palet terang, berjudul.
  const kepalaEkspor = 72;
  const legenda = Object.entries(gayaJenis).filter(([j]) => hasilPenuh.semua.some((s) => s.u.jenis === j));
  const ew = Math.max(hasilPenuh.kotak.w + 80, 640);
  const eh = hasilPenuh.kotak.h + kepalaEkspor + 80;

  const jalankan = async (jenis: 'png' | 'pdf' | 'cetak') => {
    const svg = svgEkspor.current;
    if (!svg) return;
    setGalat(null);
    try {
      if (jenis === 'cetak') return cetak(svg, teksJudul);
      setSibuk(jenis);
      if (jenis === 'png') await unduhPng(svg, namaBerkas);
      else await unduhPdf(svg, namaBerkas, teksJudul);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Unduhan gagal.');
    } finally {
      setSibuk(null);
    }
  };

  const layarPenuh = () => {
    const el = wadah.current?.parentElement;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  // Peta mini.
  const MW = 168;
  const mk = hasil.kotak.w ? Math.min(MW / hasil.kotak.w, 110 / Math.max(hasil.kotak.h, 1)) : 1;
  const mh = hasil.kotak.h * mk;
  const vx = (-lihat.x / lihat.k - hasil.kotak.x) * mk;
  const vy = (-lihat.y / lihat.k) * mk;
  const vw = (ukuran.w / lihat.k) * mk;
  const vh = (ukuran.h / lihat.k) * mk;

  return (
    <div className={cn('u-bagan', penuh && 'u-bagan-penuh', className)}>
      {(judul || subjudul) && (
        <div className="u-bagan-judul">
          {judul && <h3>{judul}</h3>}
          {subjudul && <p>{subjudul}</p>}
        </div>
      )}
      <div className="u-bagan-alat" role="toolbar" aria-label="Alat bagan">
        <div className="u-bagan-alat-grup">
          <Button variant="outline" size="sm" iconOnly aria-label="Perkecil" onClick={() => zoom(1 / 1.2)}><Minus /></Button>
          <span className="u-bagan-persen" aria-live="polite">{Math.round(lihat.k * 100)}%</span>
          <Button variant="outline" size="sm" iconOnly aria-label="Perbesar" onClick={() => zoom(1.2)}><Plus /></Button>
          <Button variant="outline" size="sm" onClick={() => paskan()}><ScanSearch />Paskan layar</Button>
          <Button variant="outline" size="sm" onClick={() => setTertutup(semuaTerbuka ? new Set(data.filter((u) => data.some((x) => x.induk_id === u.id) && u.id !== (akar ?? '') && !!u.induk_id).map((u) => u.id)) : new Set())}>
            {semuaTerbuka ? <ChevronsDownUp /> : <ChevronsUpDown />}{semuaTerbuka ? 'Tutup cabang' : 'Buka semua'}
          </Button>
          {gantiRinci && (
            <Button variant={rinci ? 'soft' : 'outline'} size="sm" aria-pressed={rinci} onClick={() => setRinci((r) => !r)}>
              {rinci ? 'Semua jabatan' : 'Pimpinan saja'}
            </Button>
          )}
          {adaStaf && (
            <Button variant={tampilStaf ? 'soft' : 'outline'} size="sm" aria-pressed={tampilStaf} onClick={() => setTampilStaf((t) => !t)}>
              <UsersRound />{tampilStaf ? 'Tendik tampil' : 'Tendik disembunyikan'}
            </Button>
          )}
        </div>
        <div className="u-bagan-alat-grup">
          <Menu
            trigger={<Button variant="outline" size="sm" loading={!!sibuk}><Download />Unduh</Button>}
            items={[
              { label: 'Gambar PNG', icon: <FileImage />, onSelect: () => void jalankan('png') },
              { label: 'PDF', icon: <FileText />, onSelect: () => void jalankan('pdf') },
              { type: 'separator' },
              { label: 'Cetak', icon: <Printer />, onSelect: () => void jalankan('cetak') },
            ]}
          />
          <Button variant="outline" size="sm" iconOnly aria-label={penuh ? 'Keluar layar penuh' : 'Layar penuh'} onClick={layarPenuh}>{penuh ? <Minimize /> : <Maximize />}</Button>
        </div>
      </div>
      {galat && <p className="u-bagan-galat" role="alert">{galat}</p>}
      <div
        ref={wadah}
        className="u-bagan-kanvas"
        style={{ height: penuh ? undefined : tinggi }}
        onPointerDown={(e) => {
          if ((e.target as Element).closest('[role="button"]')) return;
          seret.current = { x: e.clientX, y: e.clientY, lx: lihat.x, ly: lihat.y };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const s = seret.current;
          if (s) setLihat((v) => ({ ...v, x: s.lx + e.clientX - s.x, y: s.ly + e.clientY - s.y }));
        }}
        onPointerUp={() => { seret.current = null; }}
        onPointerCancel={() => { seret.current = null; }}
      >
        {!hasil.semua.length ? (
          <p className="u-bagan-kosong">Belum ada unit untuk ditampilkan.</p>
        ) : (
          <svg width="100%" height="100%" role="group" aria-label={teksJudul}>
            <g transform={`translate(${lihat.x},${lihat.y}) scale(${lihat.k})`}>
              <IsiSvg hasil={hasil} rinci={rinci} palet={PALET_LAYAR} gaya={gayaJenis} onToggle={toggle} onPilih={onPilihUnit} onIsi={onIsiJabatan} staf={staf} onSemuaStaf={setDaftarStaf} onPilihStaf={onPilihStaf} />
            </g>
          </svg>
        )}
        {petaMini && hasil.semua.length > 3 && (
          <svg
            className="u-bagan-mini"
            width={MW + 12}
            height={mh + 12}
            aria-label="Peta mini: klik untuk berpindah"
            onPointerDown={(e) => {
              e.stopPropagation();
              const r = e.currentTarget.getBoundingClientRect();
              const tx = (e.clientX - r.left - 6) / mk + hasil.kotak.x;
              const ty = (e.clientY - r.top - 6) / mk;
              setLihat((v) => ({ ...v, x: ukuran.w / 2 - tx * v.k, y: ukuran.h / 2 - ty * v.k }));
            }}
          >
            <g transform="translate(6,6)">
              {hasil.semua.filter((s) => !s.virtual).map((s) => (
                <rect key={s.u.id} x={(s.x - hasil.kotak.x) * mk} y={s.y * mk} width={s.w * mk} height={Math.max(2, s.h * mk)} rx={1.5} fill={(gayaJenis[s.u.jenis ?? ''] ?? { warna: '#5b7083' }).warna} opacity={0.7} />
              ))}
              <rect x={vx} y={vy} width={vw} height={vh} fill="none" stroke="var(--u-primary, #244ce6)" strokeWidth={1.5} rx={2} />
            </g>
          </svg>
        )}
      </div>
      {legenda.length > 1 && (
        <div className="u-bagan-legenda" aria-label="Keterangan warna">
          {legenda.map(([j, g]) => <span key={j}><i style={{ background: g.warna }} />{g.label}</span>)}
          {hasilPenuh.semua.some((s) => s.u.koordinasi) && <span><i className="u-bagan-legenda-putus" />Garis koordinasi</span>}
        </div>
      )}
      {daftarStaf && (
        <Dialog open onOpenChange={(o) => !o && setDaftarStaf(null)} title={`Tendik & staf ${daftarStaf.nama}`} description={`${daftarStaf.staf?.length ?? 0} orang`} size="sm">
          <ul className="u-bagan-daftar-staf">
            {(daftarStaf.staf ?? []).map((t, i) => (
              <li key={i}>
                {onPilihStaf ? (
                  <button type="button" onClick={() => { onPilihStaf(t, daftarStaf); setDaftarStaf(null); }}><b>{t.nama}</b>{t.tugas && <span>{t.tugas}</span>}</button>
                ) : (
                  <div><b>{t.nama}</b>{t.tugas && <span>{t.tugas}</span>}</div>
                )}
              </li>
            ))}
          </ul>
        </Dialog>
      )}
      {/* Salinan untuk unduh/cetak: semua cabang terbuka, palet terang. */}
      <div className="u-bagan-ekspor" aria-hidden>
        <svg ref={svgEkspor} xmlns="http://www.w3.org/2000/svg" width={ew} height={eh} viewBox={`0 0 ${ew} ${eh}`} fontFamily="Inter, 'Segoe UI', system-ui, sans-serif">
          <rect width={ew} height={eh} fill="#ffffff" />
          <text x={40} y={44} fontSize={22} fontWeight={700} fill="#171a21">{teksJudul}</text>
          <text x={40} y={64} fontSize={12} fill="#6b7482">{subjudul ? `${subjudul} · ` : ''}Dicetak {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</text>
          <g transform={`translate(${40 - hasilPenuh.kotak.x + (ew - 80 - hasilPenuh.kotak.w) / 2},${kepalaEkspor + 16})`}>
            <IsiSvg hasil={hasilPenuh} rinci={rinci} palet={PALET_CETAK} gaya={gayaJenis} ekspor staf={staf} />
          </g>
          <g transform={`translate(40,${eh - 20})`}>
            {legenda.map(([j, g], i) => (
              <g key={j} transform={`translate(${i * 120},0)`}>
                <rect y={-9} width={10} height={10} rx={2} fill={g.warna} />
                <text x={16} y={0} fontSize={11} fill="#4f5866">{g.label}</text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
