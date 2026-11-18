'use client';
import * as React from 'react';
import {
  ChevronsDownUp, ChevronsUpDown, Download, FileImage, FileText, Info, Layers, Maximize, Minimize, Minus, MoveHorizontal, MoveVertical, Plus, Printer, ScanSearch, UsersRound,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { hueFromString, initials } from '../lib/format';
import { Button } from './actions';
import { SegmentedControl } from './forms';
import { Dialog, Menu } from './overlays';

// ================================================================ Bagan organisasi (struktur organisasi v2)

/**
 * Bagan struktur organisasi bertingkat sungguhan dari data datar `{ id, induk_id }`, digambar sebagai SVG.
 *
 * - Orientasi **vertikal** (atas → bawah, bawaan) atau **horizontal** (kiri → kanan); gaya **modern** (kartu membulat,
 *   warna lembut, avatar) atau **resmi** (kotak tegas bergaya dokumen kelembagaan, siap cetak). Pilihan pengguna tersimpan
 *   (localStorage) dan ikut ke unduhan PNG/PDF/cetak.
 * - Jenis garis per unit (`garis`): **lini** (komando, garis tegas), **staf** (putus-putus), **koordinasi** (titik-titik),
 *   **pembinaan** (fungsional, garis tipis berwarna). Selain lini, unit tampil di samping garis utama induknya. Legenda
 *   garis dan warna jenis (bisa disembunyikan), tooltip di tiap garis ("Koordinasi: Senat ↔ Universitas"), label singkat
 *   opsional di garis (`labelGaris`).
 * - Unit `kelompok` (mis. Rektorat = Rektor + Wakil Rektor) tampil sebagai label tipis dengan bingkai pengelompokan, bukan
 *   kotak berjabatan. `bingkai` membingkai cabang (mis. kampus pengembangan); `sorot` menyorot satu cabang.
 * - Kotak berukuran seragam per tingkat (`seragam`), anak daun ditumpuk (vertikal), lipat/buka cabang, zoom, geser, paskan
 *   layar, layar penuh, peta mini; unduh PNG (hingga 300 dpi), PDF A4/A3 lanskap/potret, cetak vektor dengan judul, dasar
 *   SK (`dasar`), tanggal berlaku (`berlaku`), dan legenda di sudut.
 *
 *   <BaganOrganisasi data={unit} judulBerkas="Struktur Organisasi Universitas Pohuwato" dasar="SK Rektor No. 12/2026" />
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

/** Jenis garis ke induk. */
export type GarisBagan = 'lini' | 'staf' | 'koordinasi' | 'pembinaan';

export interface UnitBagan {
  id: string;
  induk_id?: string | null;
  nama: string;
  singkatan?: string | null;
  /** yayasan, universitas, kelompok, rektorat, kampus, biro, fakultas, prodi, lembaga, upt, bagian, unit, atau lainnya. */
  jenis?: string | null;
  /** Jenis garis ke induk. Bawaan lini (atau koordinasi bila `koordinasi`). */
  garis?: GarisBagan;
  /** Lama: hubungan koordinasi ke induk (= garis 'koordinasi'). */
  koordinasi?: boolean;
  /** Label singkat di garis ke induk (mis. "pembina"); bawaan nama jenis garis bila `labelGaris` di bagan aktif. */
  labelGaris?: string | null;
  /** Lencana kecil di pojok kanan atas kartu, mis. kampus tempat unit tersedia ("Kampus II"). */
  lencana?: string | null;
  /** Bingkai di sekeliling cabang unit ini (mis. kampus pengembangan). */
  bingkai?: { label: string; warna?: string } | null;
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

/** Warna kalem per jenis unit. */
export const GAYA_JENIS_BAGAN: Record<string, GayaJenisBagan> = {
  yayasan: { label: 'Badan penyelenggara', warna: '#8a6a3f' },
  universitas: { label: 'Universitas', warna: '#1e3a8a' },
  kelompok: { label: 'Pengelompokan', warna: '#64748b' },
  rektorat: { label: 'Pimpinan', warna: '#4338ca' },
  kampus: { label: 'Kampus pengembangan', warna: '#9d174d' },
  biro: { label: 'Biro', warna: '#6d28d9' },
  bagian: { label: 'Bagian', warna: '#64748b' },
  lembaga: { label: 'Lembaga', warna: '#b45309' },
  upt: { label: 'UPT', warna: '#0f766e' },
  fakultas: { label: 'Fakultas', warna: '#0369a1' },
  prodi: { label: 'Program studi', warna: '#047857' },
  unit: { label: 'Unit', warna: '#475569' },
};

/** Gaya garis: label legenda, pola putus, tebal. */
export const GARIS_BAGAN: Record<GarisBagan, { label: string; keterangan: string; dash?: string; tebal: number; warna?: string; cap?: 'round' }> = {
  lini: { label: 'Lini / komando', keterangan: 'Lini', tebal: 1.75 },
  staf: { label: 'Staf', keterangan: 'Staf', dash: '8 5', tebal: 1.5 },
  koordinasi: { label: 'Koordinasi', keterangan: 'Koordinasi', dash: '0.1 5', tebal: 2.4, cap: 'round' },
  pembinaan: { label: 'Pembinaan / fungsional', keterangan: 'Pembinaan', tebal: 1.25, warna: '#0d9488' },
};

const URUT_JENIS = ['yayasan', 'universitas', 'kelompok', 'rektorat', 'kampus', 'fakultas', 'lembaga', 'biro', 'bagian', 'upt', 'unit', 'prodi'];

export type OrientasiBagan = 'vertikal' | 'horizontal';
export type GayaBagan = 'modern' | 'resmi';

/**
 * Lapisan tambahan yang bisa ditampilkan/disembunyikan dari bilah alat (mis. organisasi mahasiswa di bagan kampus).
 * Simpul lapisan menempel ke unit bagan lewat `induk_id` (id unit kampus); warna jenisnya digabung ke `gayaJenis`.
 */
export interface LapisanBagan {
  kunci: string;
  /** Label tombol, mis. "Organisasi mahasiswa". */
  label: string;
  data: UnitBagan[];
  gayaJenis?: Record<string, GayaJenisBagan>;
  /** Urutan jenis simpul lapisan di antara saudara (ditambahkan di belakang urutJenis bagan). */
  urutJenis?: string[];
  /** Tampil sejak awal. Bawaan false. */
  awal?: boolean;
}

export interface BaganOrganisasiProps {
  data: UnitBagan[];
  /** Lapisan opsional dengan sakelar di bilah alat (mis. "Tampilkan organisasi mahasiswa"). Tidak mengubah `data`. */
  lapisan?: LapisanBagan[];
  /** id unit akar (bagan sub-pohon, mis. satu fakultas). Bawaan: semua akar. */
  akar?: string | null;
  judul?: React.ReactNode;
  /** Teks judul untuk berkas unduhan/cetak (bawaan dari judul bila string). */
  judulBerkas?: string;
  subjudul?: string;
  /** Dasar penetapan di kepala unduhan/cetak, mis. "SK Rektor No. 12/UNIPO/2026 tentang Statuta". */
  dasar?: string | null;
  /** Tanggal berlaku struktur (teks bebas atau YYYY-MM-DD). */
  berlaku?: string | null;
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
  /** Orientasi awal (pilihan pengguna yang tersimpan lebih diutamakan). */
  orientasi?: OrientasiBagan;
  /** Gaya awal (pilihan pengguna yang tersimpan lebih diutamakan). */
  gaya?: GayaBagan;
  /** Kotak berukuran seragam per tingkat. Bawaan true. */
  seragam?: boolean;
  /** Label singkat di garis staf/koordinasi/pembinaan. Bawaan true. */
  labelGaris?: boolean;
  /** id unit yang cabangnya disorot (mis. kampus terpilih); cabang lain diredupkan. */
  sorot?: string | null;
  /** Kunci penyimpanan pilihan tampilan. Bawaan "unipo-bagan-tampilan". */
  kunciSimpan?: string;
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
const H_RINGKAS = 132;
const BARIS = 40;
const KEPALA = 66;
const H_KELOMPOK = 34;
const STAF_MAKS = 3;
const STAF_BARIS = 22;

const garisUnit = (u: UnitBagan): GarisBagan => u.garis ?? (u.koordinasi ? 'koordinasi' : 'lini');
const samping = (u: UnitBagan) => garisUnit(u) !== 'lini';
const kelompok = (u: UnitBagan) => u.jenis === 'kelompok';

interface Simpul {
  u: UnitBagan;
  /** Induk (untuk tooltip garis). */
  induk?: Simpul;
  anak: Simpul[];
  koord: Simpul[];
  tingkat: number;
  turunan: number;
  tutup: boolean;
  tumpuk: boolean;
  /** Kolom virtual (tanpa kartu) berisi saudara-saudara daun yang ditumpuk, di samping cabang lain. */
  virtual?: boolean;
  /** Ukuran kartu. */
  w: number;
  h: number;
  /** Ukuran melintang (across) dan sepanjang kedalaman (depth): vertikal A = w, D = h; horizontal A = h, D = w. */
  A: number;
  D: number;
  sA: number;
  sD: number;
  pa: number;
  pd: number;
  x: number;
  y: number;
}

function tinggiInti(u: UnitBagan, rinci: boolean): number {
  if (kelompok(u)) return H_KELOMPOK;
  if (!rinci) return H_RINGKAS;
  return KEPALA + Math.max(1, u.jabatan?.length ?? 0) * BARIS + 12;
}

function tinggiStaf(u: UnitBagan): number {
  const n = u.staf?.length ?? 0;
  return n ? 30 + Math.min(n, STAF_MAKS) * STAF_BARIS + (n > STAF_MAKS ? 20 : 0) + 4 : 0;
}

function tinggiKartu(u: UnitBagan, rinci: boolean, staf: boolean): number {
  return tinggiInti(u, rinci) + (staf && !kelompok(u) ? tinggiStaf(u) : 0);
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

interface OpsiTata {
  rinci: boolean;
  staf: boolean;
  orientasi: OrientasiBagan;
  seragam: boolean;
}

/** Susun pohon dari data datar dan hitung posisi (dalam sumbu melintang/kedalaman, lalu dipetakan ke x/y). */
function tata(data: UnitBagan[], akar: string | null | undefined, tertutup: Set<string>, urutJenis: string[], o: OpsiTata) {
  const W = o.rinci ? W_RINCI : W_RINGKAS;
  const vert = o.orientasi === 'vertikal';
  const GA = vert ? 28 : 18;
  const GD = vert ? 64 : 76;
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
  const baru = (u: UnitBagan, tingkat: number, extra: Partial<Simpul> = {}): Simpul => {
    const h = extra.virtual ? 0 : tinggiKartu(u, o.rinci, o.staf);
    return { u, tingkat, turunan: 0, tutup: false, anak: [], koord: [], tumpuk: false, w: W, h, A: vert ? W : h, D: vert ? h : W, sA: 0, sD: 0, pa: 0, pd: 0, x: 0, y: 0, ...extra };
  };
  const dilihat = new Set<string>();
  const bangun = (u: UnitBagan, tingkat: number): Simpul => {
    dilihat.add(u.id);
    const semua = (anakDari.get(u.id) ?? []).filter((x) => !dilihat.has(x.id)).map((x, i) => ({ x, i }));
    semua.sort((a, b) => ur(a.x.jenis) - ur(b.x.jenis) || a.i - b.i);
    const s = baru(u, tingkat);
    const anakS = semua.map(({ x }) => bangun(x, tingkat + 1));
    anakS.forEach((a) => { a.induk = s; });
    s.turunan = anakS.reduce((n, a) => n + 1 + a.turunan, 0);
    s.tutup = tertutup.has(u.id) && anakS.length > 0;
    let biasa = s.tutup ? [] : anakS.filter((a) => !samping(a.u));
    // Vertikal: saudara campuran yang daun (tanpa anak terlihat) dikumpulkan dalam satu kolom bertumpuk supaya tidak melebar.
    const daun = biasa.filter((a) => a.anak.length === 0 && a.koord.length === 0 && !kelompok(a.u) && !a.u.bingkai);
    if (vert && daun.length >= 2 && daun.length < biasa.length) {
      const v = baru({ id: `${u.id}#daun`, nama: '' }, tingkat + 1, { anak: daun, tumpuk: true, virtual: true });
      daun.forEach((a) => { a.induk = s; });
      // Kolom tumpukan menempati posisi daun pertama supaya urutan saudara tetap terbaca.
      const pertama = biasa.indexOf(daun[0]);
      const sisa = biasa.filter((a) => !daun.includes(a));
      biasa = [...sisa.slice(0, biasa.slice(0, pertama).filter((a) => !daun.includes(a)).length), v, ...sisa.slice(biasa.slice(0, pertama).filter((a) => !daun.includes(a)).length)];
    }
    s.anak = biasa;
    s.koord = s.tutup ? [] : anakS.filter((a) => samping(a.u));
    return s;
  };
  const akarU = akar ? [peta.get(akar)].filter((x): x is UnitBagan => !!x) : anakDari.get(null) ?? [];
  const akarS = akarU.map((u) => bangun(u, 0));

  const semua: Simpul[] = [];
  const jalan = (s: Simpul) => {
    semua.push(s);
    s.koord.forEach(jalan);
    s.anak.forEach(jalan);
  };
  akarS.forEach(jalan);

  // Kotak seragam per tingkat (bukan label pengelompokan): tinggi kartu = tertinggi di tingkatnya.
  if (o.seragam) {
    const maks = new Map<number, number>();
    for (const s of semua) if (!s.virtual && !kelompok(s.u)) maks.set(s.tingkat, Math.max(maks.get(s.tingkat) ?? 0, s.h));
    for (const s of semua) {
      if (s.virtual || kelompok(s.u)) continue;
      s.h = maks.get(s.tingkat) ?? s.h;
      s.A = vert ? s.w : s.h;
      s.D = vert ? s.h : s.w;
    }
  }

  // Ukuran sub-pohon.
  const ukur = (s: Simpul) => {
    s.anak.forEach(ukur);
    s.koord.forEach(ukur);
    const daun = s.anak.length > 0 && s.anak.every((a) => a.anak.length === 0 && a.koord.length === 0 && !a.virtual && !kelompok(a.u));
    s.tumpuk = vert && (!!s.virtual || (daun && s.tingkat > 0 && s.anak.length > 1));
    let lebarAnak = 0;
    let tinggiAnak = 0;
    if (s.tumpuk) {
      lebarAnak = IND + W;
      tinggiAnak = s.anak.reduce((t, a) => t + a.D + 16, 0) - 16;
    } else if (s.anak.length) {
      lebarAnak = s.anak.reduce((t, a) => t + a.sA, 0) + GA * (s.anak.length - 1);
      tinggiAnak = Math.max(...s.anak.map((a) => a.sD));
    }
    let lebarKoord = 0;
    let tinggiKoord = 0;
    if (s.koord.length) {
      const kiriN = Math.ceil(s.koord.length / 2);
      const sisi = (l: Simpul[]) => l.reduce((t, k) => t + k.A, 0) + GA * Math.max(0, l.length - 1);
      lebarKoord = 2 * Math.max(sisi(s.koord.slice(0, kiriN)), sisi(s.koord.slice(kiriN))) + GA * 2;
      tinggiKoord = Math.max(...s.koord.map((k) => k.D)) + GD * 0.55;
    }
    s.sA = Math.max(s.A, lebarAnak, lebarKoord);
    s.sD = s.virtual ? tinggiAnak : s.D + tinggiKoord + (s.anak.length ? GD + tinggiAnak : 0);
  };
  const letak = (s: Simpul, kiri: number, atas: number) => {
    s.pd = atas;
    s.pa = s.tumpuk ? kiri + (s.sA - (IND + W)) / 2 : kiri + (s.sA - s.A) / 2;
    const ca = s.pa + s.A / 2;
    let d = atas + s.D;
    if (s.koord.length) {
      d += GD * 0.55;
      const kiriN = Math.ceil(s.koord.length / 2);
      let ka = ca - GA;
      s.koord.slice(0, kiriN).forEach((k) => {
        letak(k, ka - k.A - (k.sA - k.A) / 2, d);
        ka -= k.A + GA;
      });
      let kb = ca + GA;
      s.koord.slice(kiriN).forEach((k) => {
        letak(k, kb - (k.sA - k.A) / 2, d);
        kb += k.A + GA;
      });
      d += Math.max(...s.koord.map((k) => k.D));
    }
    if (!s.anak.length) return;
    if (!s.virtual) d += GD;
    if (s.tumpuk) {
      let dd = d;
      for (const a of s.anak) {
        a.sA = a.A;
        letak(a, s.pa + IND, dd);
        dd += a.D + 16;
      }
      return;
    }
    const total = s.anak.reduce((t, a) => t + a.sA, 0) + GA * (s.anak.length - 1);
    let x = kiri + (s.sA - total) / 2;
    for (const a of s.anak) {
      letak(a, x, d);
      x += a.sA + GA;
    }
  };
  let x = 0;
  for (const s of akarS) {
    ukur(s);
    letak(s, x, 0);
    x += s.sA + GA * 2;
  }
  for (const s of semua) {
    s.x = vert ? s.pa : s.pd;
    s.y = vert ? s.pd : s.pa;
  }
  const kartu = semua.filter((s) => !s.virtual);
  const minX = Math.min(0, ...kartu.map((s) => s.x));
  const minY = Math.min(0, ...kartu.map((s) => s.y));
  const maxX = Math.max(...kartu.map((s) => s.x + s.w), 0);
  const maxY = Math.max(...kartu.map((s) => s.y + s.h), 0);
  return { akar: akarS, semua, vert, GD, kotak: { x: minX, y: minY, w: maxX - minX, h: maxY - minY } };
}

type Hasil = ReturnType<typeof tata>;

/** Batas cabang (kartu unit dan semua turunannya yang terlihat). */
function batasCabang(s: Simpul): { x1: number; y1: number; x2: number; y2: number } {
  const b = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
  const jalan = (n: Simpul) => {
    if (!n.virtual) {
      b.x1 = Math.min(b.x1, n.x);
      b.y1 = Math.min(b.y1, n.y);
      b.x2 = Math.max(b.x2, n.x + n.w);
      b.y2 = Math.max(b.y2, n.y + n.h);
    }
    n.koord.forEach(jalan);
    n.anak.forEach(jalan);
  };
  jalan(s);
  return b;
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

const PALET_CETAK: Palet = { kartu: '#ffffff', teks: '#171a21', redup: '#5f6877', garis: '#5b6472', tepi: '#c9cfd8', sorot: '#1e3a8a', latar: '#ffffff', kosong: '#f5f6f8' };
const PALET_LAYAR: Palet = {
  // Garis penghubung lebih tegas dari border kartu supaya alur terbaca di latar bertitik.
  kartu: 'var(--u-card, #fff)', teks: 'var(--u-foreground, #171a21)', redup: 'var(--u-muted-foreground, #6b7482)', garis: 'color-mix(in srgb, var(--u-muted-foreground, #6b7482) 70%, transparent)', tepi: 'var(--u-border, #d5dae1)',
  sorot: 'var(--u-primary, #244ce6)', latar: 'transparent', kosong: 'var(--u-muted, #f7f8fa)',
};

const warnaAvatar = (nama: string) => `hsl(${hueFromString(nama)} 45% 42%)`;

// ---------------------------------------------------------------- SVG

interface SvgProps {
  hasil: Hasil;
  rinci: boolean;
  palet: Palet;
  gaya: Record<string, GayaJenisBagan>;
  tampilan: GayaBagan;
  labelGaris: boolean;
  sorot?: string | null;
  ekspor?: boolean;
  onToggle?: (id: string) => void;
  onPilih?: (u: UnitBagan) => void;
  onIsi?: (u: UnitBagan, j: JabatanBagan) => void;
  staf?: boolean;
  onSemuaStaf?: (u: UnitBagan) => void;
  onPilihStaf?: (s: StafBagan, u: UnitBagan) => void;
}

/** Tooltip garis (diisi BaganOrganisasi): teks + posisi layar, atau null saat keluar. */
const TipGaris = React.createContext<((t: { teks: string; x: number; y: number } | null) => void) | null>(null);

function GarisSatu({ d, jenis, judul, p, label, lx, ly, ekspor }: { d: string; jenis: GarisBagan; judul: string; p: Palet; label?: string | null; lx?: number; ly?: number; ekspor?: boolean }) {
  const g = GARIS_BAGAN[jenis];
  const tip = React.useContext(TipGaris);
  return (
    <g
      className={ekspor ? undefined : 'u-bagan-garis'}
      onPointerMove={tip && !ekspor ? (e) => tip({ teks: judul, x: e.clientX, y: e.clientY }) : undefined}
      onPointerLeave={tip && !ekspor ? () => tip(null) : undefined}
    >
      <title>{judul}</title>
      {!ekspor && <path d={d} stroke="transparent" strokeWidth={12} fill="none" />}
      <path className="u-bagan-garis-vis" d={d} stroke={g.warna ?? p.garis} strokeWidth={g.tebal} strokeDasharray={g.dash} strokeLinecap={g.cap} fill="none" />
      {label && lx !== undefined && ly !== undefined && (
        <text x={lx} y={ly} textAnchor="middle" fontSize={9.5} fontStyle="italic" fill={g.warna ?? p.redup} stroke={ekspor ? '#ffffff' : 'var(--u-background, #fff)'} strokeWidth={3} paintOrder="stroke">{label}</text>
      )}
    </g>
  );
}

function Garis({ s, hasil, p, labelGaris, ekspor }: { s: Simpul; hasil: Hasil; p: Palet; labelGaris: boolean; ekspor?: boolean }) {
  const vert = hasil.vert;
  const GD = hasil.GD;
  const pt = (a: number, d: number) => (vert ? `${a},${d}` : `${d},${a}`);
  const xy = (a: number, d: number) => (vert ? { x: a, y: d } : { x: d, y: a });
  const ca = s.pa + s.A / 2;
  const bawah = s.virtual ? s.pd : s.pd + s.D;
  const r = 10;
  const out: React.ReactNode[] = [];
  const nama = (n?: Simpul) => (n ? n.u.singkatan || n.u.nama : '');
  const indukNyata = s.virtual ? s.induk : s;
  if (s.koord.length) {
    const kd = s.koord.map((k) => k.pd + k.D / 2);
    const ujung = s.anak.length ? s.anak[0].pd - GD / 2 : Math.max(...kd);
    out.push(<GarisSatu key="tk" d={`M${pt(ca, bawah)} L${pt(ca, Math.max(ujung, ...kd))}`} jenis="lini" judul={`Lini: ${nama(s)}`} p={p} ekspor={ekspor} />);
    s.koord.forEach((k, i) => {
      const jenis = garisUnit(k.u);
      const g = GARIS_BAGAN[jenis];
      const kanan = k.pa > ca;
      const ujungA = kanan ? k.pa : k.pa + k.A;
      const mid = (ca + ujungA) / 2;
      const l = xy(mid, kd[i] - 5);
      out.push(
        <GarisSatu key={`k${i}`} d={`M${pt(ca, kd[i])} L${pt(ujungA, kd[i])}`} jenis={jenis} p={p} ekspor={ekspor}
          judul={`${g.keterangan}: ${nama(k)} ${jenis === 'lini' ? '→' : '↔'} ${nama(s)}`}
          label={labelGaris ? (k.u.labelGaris ?? g.keterangan.toLowerCase()) : k.u.labelGaris} lx={l.x} ly={vert ? l.y : l.y - 4} />,
      );
    });
  }
  if (!s.anak.length) return <>{out}</>;
  if (s.tumpuk) {
    const sa = s.pa + IND / 2;
    const akhir = s.anak[s.anak.length - 1];
    out.push(<GarisSatu key="tt" d={`M${pt(sa, s.virtual ? s.pd : bawah)} L${pt(sa, akhir.pd + 28 - r)}`} jenis="lini" judul={`Lini: ${nama(indukNyata)}`} p={p} ekspor={ekspor} />);
    s.anak.forEach((a, i) => {
      const dd = a.pd + 28;
      out.push(<GarisSatu key={`t${i}`} d={`M${pt(sa, dd - r)} Q${pt(sa, dd)} ${pt(sa + r, dd)} L${pt(a.pa, dd)}`} jenis="lini" judul={`Lini: ${nama(indukNyata)} → ${nama(a)}`} p={p} ekspor={ekspor} />);
    });
    return <>{out}</>;
  }
  const midD = s.anak[0].pd - GD / 2;
  const mulai = s.koord.length ? Math.max(bawah, ...s.koord.map((k) => k.pd + k.D / 2)) : bawah;
  out.push(<GarisSatu key="tr" d={`M${pt(ca, mulai)} L${pt(ca, midD)}`} jenis="lini" judul={`Lini: ${nama(s)}`} p={p} ekspor={ekspor} />);
  s.anak.forEach((a, i) => {
    const aa = a.virtual ? a.pa + IND / 2 : a.pa + a.A / 2;
    const d = Math.abs(aa - ca) < 1 ? `M${pt(aa, midD)} L${pt(aa, a.pd)}` : `M${pt(ca, midD)} L${pt(aa + (aa > ca ? -r : r), midD)} Q${pt(aa, midD)} ${pt(aa, midD + r)} L${pt(aa, a.pd)}`;
    out.push(<GarisSatu key={`a${i}`} d={d} jenis="lini" judul={a.virtual ? `Lini: ${nama(s)}` : `Lini: ${nama(s)} → ${nama(a)}`} p={p} ekspor={ekspor} />);
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

function LabelKelompok({ s, p, g, ekspor }: { s: Simpul; p: Palet; g: GayaJenisBagan; ekspor?: boolean }) {
  const teks = potong(s.u.nama, s.w - 40, 12, 1)[0];
  const lebar = Math.min(s.w, teks.length * 7.2 + 40);
  const x0 = (s.w - lebar) / 2;
  return (
    <g>
      <rect x={x0} y={4} width={lebar} height={s.h - 8} rx={(s.h - 8) / 2} fill={p.kartu} stroke={g.warna} strokeOpacity={0.55} strokeWidth={1} />
      <text x={s.w / 2} y={s.h / 2 + 4} textAnchor="middle" fontSize={12} fontWeight={650} letterSpacing={0.3} fill={ekspor ? g.warna : p.teks}>{teks}</text>
    </g>
  );
}

function Kartu(props: SvgProps & { s: Simpul; redup?: boolean }) {
  const { s, rinci, palet: p, gaya, tampilan, ekspor, onToggle, onPilih, onIsi, staf, onSemuaStaf, onPilihStaf, redup } = props;
  const W = s.w;
  const u = s.u;
  const g = gaya[u.jenis ?? ''] ?? { label: u.jenis ?? 'Unit', warna: '#475569' };
  const nonaktif = u.aktif === false;
  const resmi = tampilan === 'resmi';
  const judul = potong(u.nama, W - 28, 13, 2);
  const pimpinan = (u.jabatan ?? []).find((j) => j.nama);
  const kosongN = (u.jabatan ?? []).filter((j) => !j.nama).length;
  const isiN = (u.jabatan ?? []).length - kosongN;
  const uid = `bo-${u.id.replace(/[^a-z0-9_-]/gi, '')}`;
  const bisaKlik = !ekspor && !!onPilih && !kelompok(u);
  const jenisGaris = garisUnit(u);
  const putus = jenisGaris === 'staf' || jenisGaris === 'koordinasi';
  const rx = resmi ? 3 : 14;
  const labelJenis = `${g.label}${jenisGaris !== 'lini' ? ` · ${GARIS_BAGAN[jenisGaris].keterangan.toLowerCase()}` : ''}${nonaktif ? ' · nonaktif' : ''}`;
  return (
    <g transform={`translate(${s.x},${s.y})`} opacity={nonaktif ? 0.55 : redup ? 0.32 : 1}>
      {kelompok(u) ? (
        <LabelKelompok s={s} p={p} g={g} ekspor={ekspor} />
      ) : (
        <g
          className={bisaKlik ? 'u-bagan-kartu' : undefined}
          role={bisaKlik ? 'button' : undefined}
          tabIndex={bisaKlik ? 0 : undefined}
          aria-label={bisaKlik ? `${u.nama}: lihat detail` : undefined}
          onClick={bisaKlik ? () => onPilih?.(u) : undefined}
          onKeyDown={bisaKlik ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPilih?.(u); } } : undefined}
        >
          <rect width={W} height={s.h} rx={rx} fill={p.kartu}
            stroke={putus ? g.warna : resmi ? (ekspor ? '#334155' : 'color-mix(in srgb, var(--u-foreground, #171a21) 55%, transparent)') : p.tepi}
            strokeDasharray={putus ? GARIS_BAGAN[jenisGaris].dash === '0.1 5' ? '2 4' : '6 4' : undefined} strokeWidth={resmi ? 1.25 : putus ? 1.5 : 1}
            filter={ekspor || resmi ? undefined : 'url(#bo-bayang)'} />
          <clipPath id={`${uid}-c`}><rect width={W} height={s.h} rx={rx} /></clipPath>
          {resmi ? (
            <>
              <rect x={0} y={0} width={W} height={36} fill={g.warna} fillOpacity={0.1} clipPath={`url(#${uid}-c)`} />
              <rect x={0} y={0} width={4} height={s.h} fill={g.warna} clipPath={`url(#${uid}-c)`} />
              <text x={14} y={23} fontSize={10} fontWeight={700} letterSpacing={0.6} fill={g.warna}>{labelJenis.toUpperCase()}</text>
            </>
          ) : (
            <>
              <rect x={0} y={0} width={W} height={5} fill={g.warna} clipPath={`url(#${uid}-c)`} />
              <rect x={14} y={14} width={Math.min(W - 28, labelJenis.length * 6.2 + 16)} height={18} rx={9} fill={g.warna} fillOpacity={ekspor ? 0.12 : 0.14} />
              <text x={22} y={27} fontSize={10.5} fontWeight={600} fill={ekspor ? g.warna : `color-mix(in srgb, ${g.warna} 72%, var(--u-foreground, #171a21))`}>{labelJenis}</text>
            </>
          )}
          {u.lencana && <text x={W - 14} y={resmi ? 23 : 27} textAnchor="end" fontSize={10} fontWeight={600} fill={p.redup}>{potong(u.lencana, 96, 10, 1)[0]}</text>}
          {judul.map((b, i) => <text key={i} x={14} y={54 + i * 16} fontSize={13} fontWeight={resmi ? 700 : 650} fill={p.teks}>{b}</text>)}
          {!rinci ? (
            <>
              <line x1={14} x2={W - 14} y1={88} y2={88} stroke={p.tepi} strokeWidth={0.75} />
              <Avatar x={30} y={109} r={14} nama={pimpinan?.nama} foto={ekspor ? null : pimpinan?.foto} kosong={!pimpinan} p={p} id={`${uid}-a`} />
              <text x={52} y={106} fontSize={12} fontWeight={600} fill={pimpinan ? p.teks : p.redup} fontStyle={pimpinan ? undefined : 'italic'} opacity={pimpinan ? 1 : 0.8}>{potong(pimpinan ? `${pimpinan.status ? `${pimpinan.status === 'plt' ? 'Plt.' : 'Plh.'} ` : ''}${pimpinan.nama}` : 'Belum diisi', W - 66, 12, 1)[0]}</text>
              <text x={52} y={121} fontSize={10.5} fill={p.redup}>{potong(pimpinan?.jabatan ?? (u.jabatan?.[0]?.jabatan ?? 'Pimpinan unit'), W - 66, 10.5, 1)[0]}{isiN > 1 ? ` · +${isiN - 1} pejabat` : ''}</text>
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
                  <text x={48} y={19} fontSize={11.5} fontWeight={600} fill={kosong ? p.redup : p.teks} fontStyle={kosong ? 'italic' : undefined} opacity={kosong ? 0.8 : 1}>{potong(kosong ? 'Belum diisi' : `${j.status ? `${j.status === 'plt' ? 'Plt.' : 'Plh.'} ` : ''}${j.nama}`, W - (tampilIsi ? 104 : 62), 11.5, 1)[0]}</text>
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
      )}
      {s.turunan > 0 && !ekspor && (
        <g
          className="u-bagan-lipat"
          role="button"
          tabIndex={0}
          aria-label={s.tutup ? `Buka cabang ${u.nama}` : `Tutup cabang ${u.nama}`}
          aria-expanded={!s.tutup}
          transform={s.tumpuk ? `translate(${IND / 2},${s.h})` : props.hasil.vert ? `translate(${W / 2},${s.h})` : `translate(${W},${s.h / 2})`}
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

/** Bingkai cabang: pengelompokan (Rektorat), kampus pengembangan, atau cabang yang disorot. */
function Bingkai({ s, g, jenis }: { s: Simpul; p?: Palet; g: GayaJenisBagan; jenis: 'kelompok' | 'bingkai' | 'sorot'; ekspor?: boolean }) {
  const b = batasCabang(s);
  if (!Number.isFinite(b.x1)) return null;
  const pad = jenis === 'kelompok' ? 12 : 16;
  const atas = jenis === 'kelompok' ? 0 : 20;
  const warna = jenis === 'kelompok' ? g.warna : s.u.bingkai?.warna ?? g.warna;
  const labelPenuh = jenis === 'kelompok' ? null : s.u.bingkai?.label ?? s.u.nama;
  const label = labelPenuh ? potong(labelPenuh.toUpperCase(), b.x2 - b.x1 + pad * 2 - 24, 10.5, 1)[0] : null;
  return (
    <g pointerEvents="none">
      <rect x={b.x1 - pad} y={b.y1 - pad - atas} width={b.x2 - b.x1 + pad * 2} height={b.y2 - b.y1 + pad * 2 + atas} rx={jenis === 'kelompok' ? 18 : 14}
        fill={warna} fillOpacity={jenis === 'sorot' ? 0.07 : jenis === 'kelompok' ? 0.025 : 0.04}
        stroke={warna} strokeOpacity={jenis === 'sorot' ? 0.9 : 0.45} strokeWidth={jenis === 'sorot' ? 2 : 1.25} strokeDasharray={jenis === 'kelompok' ? '4 4' : undefined} />
      {label && (
        <text x={b.x1 - pad + 12} y={b.y1 - pad - atas + 15} fontSize={10.5} fontWeight={700} letterSpacing={0.5} fill={warna}>{label}</text>
      )}
    </g>
  );
}

function IsiSvg(props: SvgProps) {
  const { hasil, sorot } = props;
  const sorotS = sorot ? hasil.semua.find((s) => s.u.id === sorot) : undefined;
  const dalamSorot = React.useMemo(() => {
    if (!sorotS) return null;
    const set = new Set<string>();
    const jalan = (n: Simpul) => {
      set.add(n.u.id);
      n.koord.forEach(jalan);
      n.anak.forEach(jalan);
    };
    jalan(sorotS);
    // Jalur induk tetap jelas.
    for (let n = sorotS.induk; n; n = n.induk) set.add(n.u.id);
    return set;
  }, [sorotS]);
  const gayaDari = (s: Simpul) => props.gaya[s.u.jenis ?? ''] ?? { label: 'Unit', warna: '#475569' };
  return (
    <>
      <defs>
        <filter id="bo-bayang" x="-10%" y="-10%" width="120%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.08" />
        </filter>
      </defs>
      <g>
        {hasil.semua.filter((s) => !s.virtual && kelompok(s.u)).map((s) => <Bingkai key={`bk${s.u.id}`} s={s} p={props.palet} g={gayaDari(s)} jenis="kelompok" ekspor={props.ekspor} />)}
        {hasil.semua.filter((s) => !s.virtual && s.u.bingkai && s.u.id !== sorot).map((s) => <Bingkai key={`bb${s.u.id}`} s={s} p={props.palet} g={gayaDari(s)} jenis="bingkai" ekspor={props.ekspor} />)}
        {sorotS && <Bingkai s={sorotS} p={props.palet} g={gayaDari(sorotS)} jenis="sorot" ekspor={props.ekspor} />}
      </g>
      <g>{hasil.semua.map((s) => <Garis key={`g${s.u.id}`} s={s} hasil={hasil} p={props.palet} labelGaris={props.labelGaris} ekspor={props.ekspor} />)}</g>
      <g>{hasil.semua.filter((s) => !s.virtual).map((s) => <Kartu key={s.u.id} {...props} s={s} redup={!!dalamSorot && !dalamSorot.has(s.u.id)} />)}</g>
    </>
  );
}

/** Legenda di dalam SVG (unduhan/cetak): warna jenis dan jenis garis. */
/** Lebar legenda unduhan: menyesuaikan label terpanjang (mis. jenis lapisan ormawa yang panjang). */
function lebarLegendaSvg(jenis: [string, GayaJenisBagan][], garis: GarisBagan[]): number {
  const teks = [...garis.map((g) => `Garis ${GARIS_BAGAN[g].label.toLowerCase()}`), ...jenis.map(([, j]) => j.label), 'Keterangan'];
  return Math.max(180, Math.ceil(Math.max(...teks.map((t) => t.length)) * 6.3) + 62);
}

function LegendaSvg({ x, y, jenis, garis }: { x: number; y: number; jenis: [string, GayaJenisBagan][]; garis: GarisBagan[] }) {
  const baris = [...garis.map((g) => ({ t: 'g' as const, g })), ...jenis.map(([, j]) => ({ t: 'j' as const, j }))];
  const tinggi = 30 + baris.length * 18;
  return (
    <g transform={`translate(${x},${y})`}>
      <rect width={lebarLegendaSvg(jenis, garis)} height={tinggi} rx={6} fill="#ffffff" stroke="#c9cfd8" />
      <text x={12} y={20} fontSize={11} fontWeight={700} fill="#171a21">Keterangan</text>
      {baris.map((b, i) => (
        <g key={i} transform={`translate(12,${36 + i * 18})`}>
          {b.t === 'g' ? (
            <line x1={0} x2={28} y1={-4} y2={-4} stroke={GARIS_BAGAN[b.g].warna ?? '#5b6472'} strokeWidth={GARIS_BAGAN[b.g].tebal} strokeDasharray={GARIS_BAGAN[b.g].dash} strokeLinecap={GARIS_BAGAN[b.g].cap} />
          ) : (
            <rect x={8} y={-9} width={10} height={10} rx={2} fill={b.j.warna} />
          )}
          <text x={38} y={0} fontSize={10.5} fill="#3f4753">{b.t === 'g' ? `Garis ${GARIS_BAGAN[b.g].label.toLowerCase()}` : b.j.label}</text>
        </g>
      ))}
    </g>
  );
}

// ---------------------------------------------------------------- unduh dan cetak

const KERTAS = { a4l: [841.89, 595.28], a4p: [595.28, 841.89], a3l: [1190.55, 841.89], a3p: [841.89, 1190.55] } as const;

export type KertasBagan = 'otomatis' | 'a4l' | 'a3l' | 'a4p' | 'a3p';

function kertasUntuk(w: number, h: number, pilih: KertasBagan = 'otomatis'): readonly [number, number] {
  if (pilih !== 'otomatis') return KERTAS[pilih];
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
async function unduhPdf(svg: SVGSVGElement, nama: string, judul: string, kertas: KertasBagan = 'otomatis') {
  const w = Number(svg.getAttribute('width'));
  const h = Number(svg.getAttribute('height'));
  const [ptW, ptH] = kertasUntuk(w, h, kertas);
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

function cetak(svg: SVGSVGElement, judul: string, pilih: KertasBagan = 'otomatis') {
  const w = Number(svg.getAttribute('width'));
  const h = Number(svg.getAttribute('height'));
  const [ptW, ptH] = kertasUntuk(w, h, pilih);
  const kertas = `${ptW === 1190.55 || ptH === 1190.55 ? 'A3' : 'A4'} ${ptW > ptH ? 'landscape' : 'portrait'}`;
  const jendela = window.open('', '_blank');
  if (!jendela) return;
  jendela.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${judul.replace(/</g, '')}</title><style>@page{size:${kertas};margin:10mm}html,body{margin:0}svg{width:100%;height:auto;max-height:100vh;display:block}</style></head><body>${teksSvg(svg)}</body></html>`);
  jendela.document.close();
  jendela.focus();
  setTimeout(() => jendela.print(), 300);
}

// ---------------------------------------------------------------- komponen

interface Tampilan {
  orientasi: OrientasiBagan;
  gaya: GayaBagan;
  legenda: boolean;
}

function bacaTampilan(kunci: string): Partial<Tampilan> {
  try {
    const v = typeof window !== 'undefined' ? window.localStorage.getItem(kunci) : null;
    return v ? (JSON.parse(v) as Partial<Tampilan>) : {};
  } catch {
    return {};
  }
}

function simpanTampilan(kunci: string, t: Tampilan) {
  try {
    window.localStorage.setItem(kunci, JSON.stringify(t));
  } catch {
    // Penyimpanan tidak tersedia (mode privat): pilihan berlaku untuk sesi ini saja.
  }
}

const tanggalTeks = (v?: string | null) => {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : v;
};

export function BaganOrganisasi({
  data: dataUnit, akar, judul, judulBerkas, subjudul, dasar, berlaku, rinci: rinciAwal = false, gantiRinci = true, buka = 3, tinggi = 640, gayaJenis: gayaUnit = GAYA_JENIS_BAGAN,
  urutJenis: urutUnit = URUT_JENIS, onPilihUnit, onIsiJabatan, namaBerkas = 'struktur-organisasi', petaMini = true, className,
  tampilStaf: tampilStafAwal = true, onPilihStaf, lapisan, orientasi: orientasiAwal = 'vertikal', gaya: gayaAwal = 'modern', seragam = true, labelGaris = true, sorot,
  kunciSimpan = 'unipo-bagan-tampilan',
}: BaganOrganisasiProps) {
  // Lapisan aktif digabung ke data, warna, dan urutan jenis bagan.
  const [lapisanAktif, setLapisanAktif] = React.useState<Set<string>>(() => new Set((lapisan ?? []).filter((l) => l.awal).map((l) => l.kunci)));
  const terpakai = React.useMemo(() => (lapisan ?? []).filter((l) => lapisanAktif.has(l.kunci)), [lapisan, lapisanAktif]);
  const data = React.useMemo(() => (terpakai.length ? [...dataUnit, ...terpakai.flatMap((l) => l.data)] : dataUnit), [dataUnit, terpakai]);
  const gayaJenis = React.useMemo<Record<string, GayaJenisBagan>>(() => terpakai.reduce((a, l) => ({ ...a, ...(l.gayaJenis ?? {}) }), gayaUnit), [gayaUnit, terpakai]);
  const urutJenis = React.useMemo(() => (terpakai.length ? [...urutUnit, ...terpakai.flatMap((l) => l.urutJenis ?? [])] : urutUnit), [urutUnit, terpakai]);
  const adaStaf = React.useMemo(() => data.some((u) => (u.staf?.length ?? 0) > 0), [data]);
  const [tampilStaf, setTampilStaf] = React.useState(tampilStafAwal);
  React.useEffect(() => setTampilStaf(tampilStafAwal), [tampilStafAwal]);
  const staf = adaStaf && tampilStaf;
  const [daftarStaf, setDaftarStaf] = React.useState<UnitBagan | null>(null);
  const [rinci, setRinci] = React.useState(rinciAwal);
  React.useEffect(() => setRinci(rinciAwal), [rinciAwal]);
  const [tampilan, setTampilanState] = React.useState<Tampilan>(() => ({ orientasi: orientasiAwal, gaya: gayaAwal, legenda: true, ...bacaTampilan(kunciSimpan) }));
  const setTampilan = (t: Partial<Tampilan>) => setTampilanState((x) => {
    const n = { ...x, ...t };
    simpanTampilan(kunciSimpan, n);
    return n;
  });
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
        // Label pengelompokan tidak dihitung sebagai tingkat.
        if (!kelompok(x)) t++;
      }
      return t;
    };
    const punyaAnak = new Set(data.map((u) => u.induk_id).filter(Boolean) as string[]);
    return new Set(data.filter((u) => punyaAnak.has(u.id) && !kelompok(u) && tingkat(u) >= buka).map((u) => u.id));
  }, [data, akar, buka]);
  const [tertutup, setTertutup] = React.useState<Set<string>>(awalTutup);
  const kunciData = React.useMemo(() => data.map((u) => u.id).join(','), [data]);
  React.useEffect(() => setTertutup(awalTutup()), [kunciData, akar]); // eslint-disable-line react-hooks/exhaustive-deps

  const opsi: OpsiTata = { rinci, staf, orientasi: tampilan.orientasi, seragam };
  const hasil = React.useMemo(() => tata(data, akar, tertutup, urutJenis, opsi), [data, akar, rinci, tertutup, urutJenis, staf, tampilan.orientasi, seragam]); // eslint-disable-line react-hooks/exhaustive-deps
  const hasilPenuh = React.useMemo(() => tata(data, akar, new Set(), urutJenis, opsi), [data, akar, rinci, urutJenis, staf, tampilan.orientasi, seragam]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const k = Math.max(0.15, Math.min(1.25, (ukuran.w - PAD * 2) / kotak.w, (ukuran.h - PAD * 2) / Math.max(kotak.h, 1)));
    // Tampilan awal: bila seluruh bagan terlalu kecil untuk dibaca, mulai dari akar dengan skala terbaca.
    const akarS = hasil.akar[0];
    if (terbaca && k < 0.55 && akarS) {
      const kb = 0.6;
      setLihat(hasil.vert
        ? { k: kb, x: ukuran.w / 2 - (akarS.x + akarS.w / 2) * kb, y: PAD - kotak.y * kb }
        : { k: kb, x: PAD - kotak.x * kb, y: ukuran.h / 2 - (akarS.y + akarS.h / 2) * kb });
      return;
    }
    setLihat({ k, x: (ukuran.w - kotak.w * k) / 2 - kotak.x * k, y: hasil.vert ? PAD - kotak.y * k : (ukuran.h - kotak.h * k) / 2 - kotak.y * k });
  }, [hasil, ukuran]);
  const sudahPas = React.useRef('');
  React.useEffect(() => {
    const kunci = `${kunciData}|${akar ?? ''}|${Math.round(ukuran.w / 100)}|${rinci}|${tampilan.orientasi}`;
    if (sudahPas.current !== kunci && ukuran.w > 0) {
      sudahPas.current = kunci;
      paskan(true);
    }
  }, [kunciData, akar, ukuran.w, rinci, tampilan.orientasi, paskan]);

  const zoom = (f: number, cx = ukuran.w / 2, cy = ukuran.h / 2) =>
    setLihat((v) => {
      const k = Math.max(0.1, Math.min(2.5, v.k * f));
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

  // Legenda: jenis unit dan jenis garis yang muncul.
  const legenda = Object.entries(gayaJenis).filter(([j]) => hasilPenuh.semua.some((s) => !s.virtual && s.u.jenis === j && !kelompok(s.u)));
  const garisAda = (['lini', 'staf', 'koordinasi', 'pembinaan'] as GarisBagan[]).filter((g) => g === 'lini' ? hasilPenuh.semua.length > 1 : hasilPenuh.semua.some((s) => garisUnit(s.u) === g && !!s.u.induk_id));

  // SVG ekspor: semua cabang terbuka, palet terang, kepala berjudul (+ dasar SK, tanggal berlaku), legenda di sudut.
  const kepalaEkspor = dasar || berlaku ? 96 : 76;
  const lebarLegenda = lebarLegendaSvg(legenda, garisAda);
  const tinggiLegenda = 30 + (legenda.length + garisAda.length) * 18;
  const ew = Math.max(hasilPenuh.kotak.w + 80, 760, lebarLegenda + 60);
  const eh = hasilPenuh.kotak.h + kepalaEkspor + 60 + (tampilan.legenda ? tinggiLegenda + 20 : 0);
  const tglCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const jalankan = async (jenis: 'png' | 'pdf' | 'cetak', kertas: KertasBagan = 'otomatis') => {
    const svg = svgEkspor.current;
    if (!svg) return;
    setGalat(null);
    try {
      if (jenis === 'cetak') return cetak(svg, teksJudul, kertas);
      setSibuk(jenis);
      if (jenis === 'png') await unduhPng(svg, namaBerkas);
      else await unduhPdf(svg, namaBerkas, teksJudul, kertas);
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
  const vy = (-lihat.y / lihat.k - hasil.kotak.y) * mk;
  const vw = (ukuran.w / lihat.k) * mk;
  const vh = (ukuran.h / lihat.k) * mk;
  const svgProps = { rinci, gaya: gayaJenis, tampilan: tampilan.gaya, labelGaris, sorot, staf };
  const [tip, setTip] = React.useState<{ teks: string; x: number; y: number } | null>(null);
  const kotakWadah = wadah.current?.getBoundingClientRect();

  return (
    <div className={cn('u-bagan', penuh && 'u-bagan-penuh', tampilan.gaya === 'resmi' && 'u-bagan-resmi', className)}>
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
          <Button variant="outline" size="sm" onClick={() => setTertutup(semuaTerbuka ? new Set(data.filter((u) => data.some((x) => x.induk_id === u.id) && u.id !== (akar ?? '') && !!u.induk_id && !kelompok(u)).map((u) => u.id)) : new Set())}>
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
          {(lapisan ?? []).map((l) => {
            const on = lapisanAktif.has(l.kunci);
            return (
              <Button
                key={l.kunci}
                variant={on ? 'soft' : 'outline'}
                size="sm"
                aria-pressed={on}
                title={l.data.length ? undefined : 'Belum ada data'}
                onClick={() => setLapisanAktif((s) => { const n = new Set(s); if (n.has(l.kunci)) n.delete(l.kunci); else n.add(l.kunci); return n; })}
              >
                <Layers />{on ? `${l.label} tampil` : `Tampilkan ${l.label.toLowerCase()}`}
              </Button>
            );
          })}
        </div>
        <div className="u-bagan-alat-grup">
          <SegmentedControl<OrientasiBagan>
            aria-label="Orientasi bagan"
            value={tampilan.orientasi}
            onValueChange={(v) => setTampilan({ orientasi: v })}
            options={[{ value: 'vertikal', label: 'Vertikal', icon: <MoveVertical aria-hidden /> }, { value: 'horizontal', label: 'Horizontal', icon: <MoveHorizontal aria-hidden /> }]}
          />
          <SegmentedControl<GayaBagan>
            aria-label="Gaya bagan"
            value={tampilan.gaya}
            onValueChange={(v) => setTampilan({ gaya: v })}
            options={[{ value: 'modern', label: 'Modern' }, { value: 'resmi', label: 'Resmi' }]}
          />
          <Button variant={tampilan.legenda ? 'soft' : 'outline'} size="sm" aria-pressed={tampilan.legenda} onClick={() => setTampilan({ legenda: !tampilan.legenda })}><Info />Keterangan</Button>
          <Menu
            trigger={<Button variant="outline" size="sm" loading={!!sibuk}><Download />Unduh</Button>}
            items={[
              { label: 'Gambar PNG', icon: <FileImage />, onSelect: () => void jalankan('png') },
              { label: 'PDF (ukuran otomatis)', icon: <FileText />, onSelect: () => void jalankan('pdf') },
              { label: 'PDF A4 lanskap', icon: <FileText />, onSelect: () => void jalankan('pdf', 'a4l') },
              { label: 'PDF A3 lanskap', icon: <FileText />, onSelect: () => void jalankan('pdf', 'a3l') },
              { type: 'separator' },
              { label: 'Cetak A4 lanskap', icon: <Printer />, onSelect: () => void jalankan('cetak', 'a4l') },
              { label: 'Cetak A3 lanskap', icon: <Printer />, onSelect: () => void jalankan('cetak', 'a3l') },
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
          <TipGaris.Provider value={setTip}>
            <svg width="100%" height="100%" role="group" aria-label={teksJudul}>
              <g transform={`translate(${lihat.x},${lihat.y}) scale(${lihat.k})`}>
                <IsiSvg hasil={hasil} palet={PALET_LAYAR} {...svgProps} onToggle={toggle} onPilih={onPilihUnit} onIsi={onIsiJabatan} onSemuaStaf={setDaftarStaf} onPilihStaf={onPilihStaf} />
              </g>
            </svg>
          </TipGaris.Provider>
        )}
        {tip && kotakWadah && (
          <div className="u-bagan-tip" role="tooltip" style={{ left: tip.x - kotakWadah.left + 12, top: tip.y - kotakWadah.top + 12 }}>{tip.teks}</div>
        )}
        {tampilan.legenda && (legenda.length > 1 || garisAda.length > 1) && (
          <div className="u-bagan-legenda-sudut" aria-label="Keterangan bagan">
            <b>Keterangan</b>
            {garisAda.map((g) => (
              <span key={g} title={GARIS_BAGAN[g].label}>
                <svg width="30" height="8" aria-hidden><line x1="1" x2="29" y1="4" y2="4" stroke={GARIS_BAGAN[g].warna ?? 'currentColor'} strokeWidth={GARIS_BAGAN[g].tebal} strokeDasharray={GARIS_BAGAN[g].dash} strokeLinecap={GARIS_BAGAN[g].cap} /></svg>
                Garis {GARIS_BAGAN[g].label.toLowerCase()}
              </span>
            ))}
            {legenda.map(([j, g]) => <span key={j}><i style={{ background: g.warna }} />{g.label}</span>)}
          </div>
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
              const ty = (e.clientY - r.top - 6) / mk + hasil.kotak.y;
              setLihat((v) => ({ ...v, x: ukuran.w / 2 - tx * v.k, y: ukuran.h / 2 - ty * v.k }));
            }}
          >
            <g transform="translate(6,6)">
              {hasil.semua.filter((s) => !s.virtual && (s.u.bingkai || s.u.id === sorot)).map((s) => {
                const b = batasCabang(s);
                const g = gayaJenis[s.u.jenis ?? ''] ?? { warna: '#475569' };
                return <rect key={`mb${s.u.id}`} x={(b.x1 - hasil.kotak.x) * mk - 2} y={(b.y1 - hasil.kotak.y) * mk - 2} width={(b.x2 - b.x1) * mk + 4} height={(b.y2 - b.y1) * mk + 4} rx={2} fill="none" stroke={s.u.bingkai?.warna ?? g.warna} strokeWidth={1} />;
              })}
              {hasil.semua.filter((s) => !s.virtual).map((s) => (
                <rect key={s.u.id} x={(s.x - hasil.kotak.x) * mk} y={(s.y - hasil.kotak.y) * mk} width={s.w * mk} height={Math.max(2, s.h * mk)} rx={1.5} fill={(gayaJenis[s.u.jenis ?? ''] ?? { warna: '#475569' }).warna} opacity={0.7} />
              ))}
              <rect x={vx} y={vy} width={vw} height={vh} fill="none" stroke="var(--u-primary, #244ce6)" strokeWidth={1.5} rx={2} />
            </g>
          </svg>
        )}
      </div>
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
      {/* Salinan untuk unduh/cetak: semua cabang terbuka, palet terang, orientasi & gaya pilihan pengguna. */}
      <div className="u-bagan-ekspor" aria-hidden>
        <svg ref={svgEkspor} xmlns="http://www.w3.org/2000/svg" width={ew} height={eh} viewBox={`0 0 ${ew} ${eh}`} fontFamily="Inter, 'Segoe UI', system-ui, sans-serif">
          <rect width={ew} height={eh} fill="#ffffff" />
          <text x={ew / 2} y={40} textAnchor="middle" fontSize={22} fontWeight={700} fill="#171a21" letterSpacing={0.3}>{teksJudul}</text>
          {dasar && <text x={ew / 2} y={62} textAnchor="middle" fontSize={12} fill="#3f4753">Dasar: {dasar}</text>}
          <text x={ew / 2} y={dasar ? 80 : 62} textAnchor="middle" fontSize={11} fill="#6b7482">
            {[subjudul, berlaku ? `Berlaku sejak ${tanggalTeks(berlaku)}` : null, `Dicetak ${tglCetak}`].filter(Boolean).join(' · ')}
          </text>
          <line x1={40} x2={ew - 40} y1={kepalaEkspor - 8} y2={kepalaEkspor - 8} stroke="#c9cfd8" />
          <g transform={`translate(${40 - hasilPenuh.kotak.x + (ew - 80 - hasilPenuh.kotak.w) / 2},${kepalaEkspor + 16 - hasilPenuh.kotak.y})`}>
            <IsiSvg hasil={hasilPenuh} palet={PALET_CETAK} {...svgProps} ekspor />
          </g>
          {tampilan.legenda && <LegendaSvg x={ew - lebarLegenda - 20} y={eh - tinggiLegenda - 20} jenis={legenda} garis={garisAda} />}
        </svg>
      </div>
    </div>
  );
}
