'use client';
import * as React from 'react';
import {
  AppWindow,
  ArrowUpRight,
  Award,
  Bell,
  BellOff,
  BellRing,
  BookOpen,
  CalendarDays,
  CheckCheck,
  Check,
  ChevronDown,
  ClipboardCheck,
  Compass,
  Database,
  Eraser,
  FileCheck,
  FileCheck2,
  Flag,
  FlaskConical,
  FolderOpen,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  Library,
  LifeBuoy,
  Mail,
  Megaphone,
  RefreshCw,
  Rocket,
  Scale,
  ScanSearch,
  ServerCog,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  UsersRound,
  Wallet,
} from 'lucide-react';
import { Button, Skeleton } from '../components/actions';
import { Empty } from '../components/display';
import { Dialog, Popover, Tooltip } from '../components/overlays';
import { cn } from '../lib/cn';
import { useOptionalSiakad } from './provider';
import { useSinyalRealtime } from './realtime';
import { SegmentedControl } from '../components/forms';
import { Tekan } from '../components/tekan';

/**
 * Notifikasi terpusat SIAKAD (`/v1/notif`, docs/NOTIFIKASI.md di siakad_unipo): jumlah belum dibaca per label, kotak
 * masuk milik pengguna, tandai dibaca, bersihkan (hapus lunak + urungkan), bisukan label. Butuh scope `notif:read`
 * (baca) dan `notif:write` (tandai dibaca, bersihkan, bisukan) di token aplikasi.
 *
 * Semua instans (lonceng di bilah atas, halaman /notifikasi, tab lain di aplikasi yang sama) saling memberi tahu setelah
 * perubahan, jadi lencana dan daftar langsung ikut berubah. Aplikasi lain (subdomain lain) menyusul saat tabnya dilihat
 * atau difokuskan lagi.
 */

/** Satu baris `notif_kotak`. */
export interface Notifikasi {
  id: number;
  username: string;
  modul: string | null;
  judul: string;
  isi: string | null;
  tautan: string | null;
  entitas?: string | null;
  entitas_id?: number | null;
  dibaca_pada: string | null;
  created_at: string;
}

/** Jumlah notifikasi per label (modul pengirim) dari `/v1/notif/ringkas`. */
export interface LabelNotifikasi {
  modul: string;
  total: number;
  belum: number;
  bisu: boolean;
}

export interface OpsiNotifikasi {
  /** Jeda pembaruan jumlah belum dibaca (ms). Bawaan 60 detik; berhenti saat tab tersembunyi. 0 = tanpa polling. */
  interval?: number;
  /** Username pemilik kotak (untuk pengelola yang membuka kotak orang lain). Bawaan: kotak milik sendiri. */
  username?: string;
  /** Jumlah notifikasi per muatan saat panel dibuka. Bawaan 15. */
  jumlah?: number;
  enabled?: boolean;
}

export interface KeadaanNotifikasi {
  /** false bila akun/token tidak punya akses notifikasi (401/403/404): sembunyikan ikonnya. */
  tersedia: boolean;
  /** Belum dibaca, tanpa label yang dibisukan. */
  belum: number;
  /** Jumlah per label (hanya label yang punya notifikasi). Kosong bila server lama. */
  label: LabelNotifikasi[];
  /** Label yang dibisukan akun ini. */
  bisu: string[];
  /** Username pemilik kotak menurut server (null bila server lama). */
  username: string | null;
  /** Daftar sederhana (kompatibilitas): diisi oleh `muatDaftar`. */
  daftar: Notifikasi[] | null;
  memuat: boolean;
  /** Muat ulang ringkasan dan (bila sudah pernah dimuat) daftar. */
  segarkan: () => void;
  muatDaftar: () => Promise<void>;
  baca: (n: Notifikasi | Notifikasi[]) => Promise<void>;
  /** Tandai semua dibaca; dengan `modul` hanya satu label. */
  bacaSemua: (modul?: string) => Promise<void>;
  /** Hapus lunak; jawab id yang dibersihkan (untuk `pulihkan`). */
  bersihkan: (cakupan: 'dibaca' | 'semua' | 'pilih', opsi?: { modul?: string; id?: number[] }) => Promise<number[]>;
  pulihkan: (id: number[]) => Promise<void>;
  setelBisu: (modul: string, bisu: boolean) => Promise<void>;
}

const P = '/v1/notif';
const diam = (e: unknown) => [401, 403, 404].includes(Number((e as { status?: number })?.status));

/** Pesan obrolan punya ikon dan lencana sendiri (TombolPesan), jadi tidak ditampilkan di kotak notifikasi. */
const bukanObrolan = (n: { modul?: string | null }) => n.modul !== 'obrolan';

// ---------------------------------------------------------------- kabar perubahan antar-instans

const BUS: EventTarget | null = typeof window !== 'undefined' && typeof EventTarget !== 'undefined' ? new EventTarget() : null;
let KANAL: BroadcastChannel | null = null;
try {
  if (BUS && typeof BroadcastChannel !== 'undefined') {
    KANAL = new BroadcastChannel('unipo-notifikasi');
    KANAL.onmessage = () => BUS.dispatchEvent(new CustomEvent('ubah', { detail: null }));
  }
} catch {
  KANAL = null;
}

/** Beri tahu semua instans (dan tab lain di aplikasi yang sama) bahwa kotak berubah. `asal` = instans pengubah. */
function umumkan(asal: object | null) {
  BUS?.dispatchEvent(new CustomEvent('ubah', { detail: asal }));
  try {
    KANAL?.postMessage(1);
  } catch {
    /* abaikan */
  }
}

function useDengarUbah(asal: object, fn: () => void) {
  const ref = React.useRef(fn);
  ref.current = fn;
  React.useEffect(() => {
    if (!BUS) return;
    const h = (e: Event) => {
      if ((e as CustomEvent).detail !== asal) ref.current();
    };
    BUS.addEventListener('ubah', h);
    return () => BUS.removeEventListener('ubah', h);
  }, [asal]);
}

// ---------------------------------------------------------------- ringkasan + aksi

/**
 * Keadaan notifikasi untuk komponen kustom. Gagal karena izin (401/403/404) tidak dilaporkan sebagai galat:
 * `tersedia` menjadi false dan polling berhenti.
 */
export function useNotifikasi({ interval = 60_000, username, jumlah = 15, enabled = true }: OpsiNotifikasi = {}): KeadaanNotifikasi {
  const siakad = useOptionalSiakad();
  const [saya] = React.useState(() => ({}));
  const [tersedia, setTersedia] = React.useState(true);
  const [belum, setBelum] = React.useState(0);
  const [label, setLabel] = React.useState<LabelNotifikasi[]>([]);
  const [bisu, setBisu] = React.useState<string[]>([]);
  const [pemilik, setPemilik] = React.useState<string | null>(null);
  const [daftar, setDaftar] = React.useState<Notifikasi[] | null>(null);
  const [memuat, setMemuat] = React.useState(false);
  const aktif = enabled && Boolean(siakad) && tersedia;

  const ringkas = React.useCallback(async () => {
    if (!siakad) return;
    try {
      const r = await siakad.request<{ belum_dibaca: number; username?: string; label?: LabelNotifikasi[]; bisu?: string[] }>({ method: 'GET', path: `${P}/ringkas` }, { maxRetries: 0 });
      setBelum(Number(r.data?.belum_dibaca ?? 0));
      setLabel(Array.isArray(r.data?.label) ? r.data.label.filter(bukanObrolan) : []);
      setBisu(Array.isArray(r.data?.bisu) ? r.data.bisu : []);
      setPemilik(r.data?.username ?? null);
    } catch (e) {
      if (diam(e)) setTersedia(false);
    }
  }, [siakad]);

  const muatDaftar = React.useCallback(async () => {
    if (!siakad) return;
    setMemuat(true);
    try {
      const query: Record<string, string> = { per_page: String(jumlah) };
      if (username) query.username = username;
      const r = await siakad.request<Notifikasi[]>({ method: 'GET', path: `${P}/kotak`, query });
      setDaftar(Array.isArray(r.data) ? r.data.filter(bukanObrolan) : []);
    } catch (e) {
      if (diam(e)) setTersedia(false);
      setDaftar((d) => d ?? []);
    } finally {
      setMemuat(false);
    }
  }, [siakad, jumlah, username]);

  React.useEffect(() => {
    if (!aktif) return;
    void ringkas();
    const lihat = () => document.visibilityState === 'visible' && void ringkas();
    // Notifikasi yang dibaca di aplikasi lain (akun sama) ikut berubah saat tab ini dilihat atau difokuskan lagi.
    document.addEventListener('visibilitychange', lihat);
    window.addEventListener('focus', lihat);
    const t = interval
      ? setInterval(() => {
          if (typeof document === 'undefined' || document.visibilityState === 'visible') void ringkas();
        }, interval)
      : undefined;
    return () => {
      if (t) clearInterval(t);
      document.removeEventListener('visibilitychange', lihat);
      window.removeEventListener('focus', lihat);
    };
  }, [aktif, interval, ringkas]);

  useDengarUbah(saya, () => {
    if (!aktif) return;
    void ringkas();
    if (daftar) void muatDaftar();
  });

  // Integrasi WebSocket aktif (Pustikom » Integrasi » Realtime): notifikasi baru/dibaca/dibersihkan di perangkat atau
  // aplikasi lain langsung tampil. Tanpa integrasi, hanya polling `interval` seperti biasa.
  useSinyalRealtime(
    'notif',
    () => {
      void ringkas();
      if (daftar) void muatDaftar();
    },
    aktif && !username,
  );

  const kirim = React.useCallback(
    async <T,>(path: string, body: Record<string, unknown>): Promise<T | undefined> => {
      if (!siakad) return undefined;
      try {
        const r = await siakad.request<T>({ method: 'POST', path, body });
        return r.data;
      } finally {
        await ringkas();
        umumkan(saya);
      }
    },
    [siakad, ringkas, saya],
  );

  const baca = React.useCallback(
    async (n: Notifikasi | Notifikasi[]) => {
      const belumDibaca = (Array.isArray(n) ? n : [n]).filter((x) => !x.dibaca_pada);
      if (!belumDibaca.length) return;
      const ids = new Set(belumDibaca.map((x) => x.id));
      const kini = new Date().toISOString();
      setDaftar((d) => d?.map((x) => (ids.has(x.id) ? { ...x, dibaca_pada: kini } : x)) ?? d);
      setBelum((b) => Math.max(0, b - ids.size));
      // Gagal: ringkasan dimuat ulang dari server (kirim), daftar instans lain ikut disegarkan.
      try {
        if (ids.size === 1) await kirim(`${P}/kotak/${belumDibaca[0].id}/baca`, {});
        else await kirim(`${P}/kotak/baca-semua`, { id: [...ids] });
      } catch {
        /* sudah disegarkan */
      }
    },
    [kirim],
  );

  const bacaSemua = React.useCallback(
    async (modul?: string) => {
      const kini = new Date().toISOString();
      setDaftar((d) => d?.map((x) => (!modul || x.modul === modul ? { ...x, dibaca_pada: x.dibaca_pada ?? kini } : x)) ?? d);
      if (!modul) setBelum(0);
      try {
        await kirim(`${P}/kotak/baca-semua`, modul ? { modul } : {});
      } catch {
        /* sudah disegarkan */
      }
    },
    [kirim],
  );

  const bersihkan = React.useCallback(
    async (cakupan: 'dibaca' | 'semua' | 'pilih', opsi: { modul?: string; id?: number[] } = {}) => {
      const r = await kirim<{ dibersihkan: number; id: number[] }>(`${P}/kotak/bersihkan`, { cakupan, ...opsi });
      const id = r?.id ?? [];
      setDaftar((d) => d?.filter((x) => !id.includes(x.id)) ?? d);
      return id;
    },
    [kirim],
  );

  const pulihkan = React.useCallback(
    async (id: number[]) => {
      if (id.length) await kirim(`${P}/kotak/pulihkan`, { id });
    },
    [kirim],
  );

  const setelBisu = React.useCallback(
    async (modul: string, b: boolean) => {
      setBisu((x) => (b ? [...new Set([...x, modul])] : x.filter((m) => m !== modul)));
      try {
        await kirim(`${P}/kotak/bisu`, { modul, bisu: b });
      } catch {
        /* ringkasan dari server mengembalikan keadaan sebenarnya */
      }
    },
    [kirim],
  );

  const segarkan = React.useCallback(() => {
    void ringkas();
    if (daftar) void muatDaftar();
  }, [ringkas, muatDaftar, daftar]);

  return {
    tersedia: tersedia && Boolean(siakad) && enabled,
    belum,
    label,
    bisu,
    username: pemilik,
    daftar,
    memuat,
    segarkan,
    muatDaftar,
    baca,
    bacaSemua,
    bersihkan,
    pulihkan,
    setelBisu,
  };
}

// ---------------------------------------------------------------- daftar bertahap

interface OpsiDaftar {
  aktif: boolean;
  modul?: string;
  hanyaBelum?: boolean;
  kecuali?: string[];
  username?: string;
  /** Saring baris milik akun lain (server lama memberi pengelola kotak semua orang). */
  pemilik?: string | null;
  perHalaman: number;
}

/** Daftar kotak masuk dengan muat bertahap; ikut dimuat ulang saat instans lain mengubah kotak. */
function useDaftarNotifikasi({ aktif, modul, hanyaBelum, kecuali, username, pemilik, perHalaman }: OpsiDaftar) {
  const siakad = useOptionalSiakad();
  const [saya] = React.useState(() => ({}));
  const [items, setItems] = React.useState<Notifikasi[] | null>(null);
  const [halaman, setHalaman] = React.useState(1);
  const [adaLagi, setAdaLagi] = React.useState(false);
  const [memuat, setMemuat] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const urutan = React.useRef(0);
  const kecualiStr = (kecuali ?? []).join(',');
  const jumlahRef = React.useRef(0);
  jumlahRef.current = items?.length ?? 0;

  const muat = React.useCallback(
    async (hal: number, ganti: boolean, per = perHalaman) => {
      if (!siakad) return;
      const no = ++urutan.current;
      setMemuat(true);
      setGalat(null);
      const query: Record<string, string> = { per_page: String(per), page: String(hal), urut: '-created_at' };
      if (hanyaBelum) query.belum = '1';
      if (modul) query.modul = modul;
      else if (kecualiStr) query.kecuali = kecualiStr;
      if (username) query.username = username;
      try {
        const r = await siakad.request<Notifikasi[]>({ method: 'GET', path: `${P}/kotak`, query });
        if (no !== urutan.current) return;
        const data = (Array.isArray(r.data) ? r.data : []).filter((x) => bukanObrolan(x) && (!pemilik || username || x.username === pemilik));
        setItems((d) => (ganti ? data : [...(d ?? []), ...data.filter((x) => !(d ?? []).some((y) => y.id === x.id))]));
        setHalaman(hal);
        const meta = r.meta as { page?: number; total_pages?: number } | undefined;
        setAdaLagi(meta?.total_pages !== undefined ? (meta.page ?? hal) < meta.total_pages : (Array.isArray(r.data) ? r.data.length : 0) === per);
      } catch (e) {
        if (no !== urutan.current) return;
        setGalat(diam(e) ? 'Akun ini belum punya akses notifikasi.' : String((e as Error)?.message ?? e));
        setItems((d) => d ?? []);
      } finally {
        if (no === urutan.current) setMemuat(false);
      }
    },
    [siakad, hanyaBelum, modul, kecualiStr, username, pemilik, perHalaman],
  );

  React.useEffect(() => {
    if (!aktif) return;
    setItems(null);
    void muat(1, true);
  }, [aktif, muat]);

  /** Muat ulang sebanyak yang sudah tampil (setelah perubahan dari instans/tab lain). */
  const segarkan = React.useCallback(() => {
    if (!aktif) return;
    const per = Math.min(100, Math.max(perHalaman, jumlahRef.current));
    void muat(1, true, per).then(() => setHalaman(Math.max(1, Math.ceil(per / perHalaman))));
  }, [aktif, muat, perHalaman]);

  useDengarUbah(saya, segarkan);

  const muatLagi = React.useCallback(() => {
    if (!memuat && adaLagi) void muat(halaman + 1, false);
  }, [memuat, adaLagi, muat, halaman]);

  return { items, setItems, memuat, adaLagi, galat, muatLagi, segarkan };
}

// ---------------------------------------------------------------- utilitas tampilan

/** "baru saja", "5 menit lalu", "3 jam lalu", "kemarin", lalu tanggal. */
export function waktuRelatif(s: string, kini = Date.now()): string {
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T'));
  const detik = Math.round((kini - d.getTime()) / 1000);
  if (!Number.isFinite(detik)) return '';
  if (detik < 60) return 'baru saja';
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`;
  if (detik < 86_400) return `${Math.floor(detik / 3600)} jam lalu`;
  if (detik < 172_800) return 'kemarin';
  if (detik < 7 * 86_400) return `${Math.floor(detik / 86_400)} hari lalu`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: d.getFullYear() === new Date(kini).getFullYear() ? undefined : 'numeric' });
}

/** Jam dan tanggal lengkap untuk tooltip/riwayat, mis. "18 Nov 2026 20.29". */
function waktuLengkap(s: string): string {
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Buka tautan notifikasi: jalur internal lewat `navigasi`, alamat luar di tab yang sama. */
export function bukaTautan(tautan: string, navigasi?: (href: string) => void) {
  if (typeof window === 'undefined') return;
  if (tautan.startsWith('/') && !tautan.startsWith('//')) {
    if (navigasi) navigasi(tautan);
    else window.location.assign(tautan);
    return;
  }
  try {
    const u = new URL(tautan, window.location.href);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
    if (u.origin === window.location.origin && navigasi) navigasi(u.pathname + u.search + u.hash);
    else window.location.assign(u.href);
  } catch {
    /* tautan tidak valid: abaikan */
  }
}

/** Nama manusiawi dan ikon per label (modul pengirim). Pola dicocokkan berurutan; yang tidak dikenal = nama kodenya. */
const LABEL: Array<[RegExp, string, React.ComponentType]> = [
  [/^sistem$/, 'Sistem', ServerCog],
  [/^(sdm|pegawai|presensi|kepegawaian)/, 'SDM', Users],
  [/^(akademik|krs|nilai|kurikulum|kelulusan|wisuda)/, 'Akademik', GraduationCap],
  [/^(keu|keuangan|biaya|gaji|kasir|bauk)/, 'Keuangan', Wallet],
  [/^(lppm|lp2m|penelitian|pengabdian|kkn)/, 'LP2M', FlaskConical],
  [/^(pmb|admisi)/, 'PMB', UserPlus],
  [/^(spmi|mutu)/, 'SPMI', ShieldCheck],
  [/^aturan/, 'Aturan', Scale],
  [/^(humas|portal|pengumuman)/, 'Pengumuman', Megaphone],
  [/^(lms|kelas|cbt)/, 'E-learning', BookOpen],
  [/^(tracer|karier|alumni)/, 'Alumni', Compass],
  [/^(dasbor|rektorat)/, 'Dasbor', LayoutDashboard],
  [/^kalender/, 'Kalender', CalendarDays],
  [/^(kemahasiswaan|ormawa)/, 'Kemahasiswaan', Flag],
  [/^mbkm/, 'MBKM', Rocket],
  [/^registrasi/, 'Registrasi', ClipboardCheck],
  [/^rpl/, 'RPL', Award],
  [/^(ujian_ta|ta$|skripsi)/, 'Ujian TA', FileCheck],
  [/^plagiasi/, 'Plagiasi', ScanSearch],
  [/^(perpustakaan|pustaka)/, 'Perpustakaan', Library],
  [/^layanan/, 'Layanan', LifeBuoy],
  [/^panitia/, 'Kepanitiaan', UsersRound],
  [/^pimpinan/, 'Pimpinan', Landmark],
  [/^induk/, 'Data induk', Database],
  [/^pemutakhiran/, 'Pemutakhiran data', RefreshCw],
  [/^bukti_syarat/, 'Bukti syarat', FileCheck2],
  [/^(surat|arsip|dokumen|persuratan|sk$)/, 'Persuratan', Mail],
  [/^berkas/, 'Berkas', FolderOpen],
  [/^(aplikasi|notif)$/, 'Aplikasi', AppWindow],
];

function cariLabel(modul?: string | null) {
  const m = (modul ?? '').toLowerCase();
  return LABEL.find(([re]) => re.test(m));
}

/** Nama label manusiawi, mis. "sdm" → "SDM", "ujian_ta" → "Ujian TA". */
export function namaLabelNotifikasi(modul?: string | null): string {
  const l = cariLabel(modul);
  if (l) return l[1];
  const m = (modul ?? '').replace(/[_-]+/g, ' ').trim();
  return m ? m.charAt(0).toUpperCase() + m.slice(1) : 'Lainnya';
}

/** Ikon per modul pengirim notifikasi. */
export function ikonModulNotifikasi(modul?: string | null): React.ReactNode {
  const I = cariLabel(modul)?.[2] ?? Bell;
  return <I />;
}

/** Kelompokkan notifikasi per hari: Hari ini, Kemarin, Minggu ini, Lebih lama. */
export function kelompokHari<T extends { created_at: string }>(daftar: T[], kini = new Date()): Array<{ label: string; items: T[] }> {
  const awal = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate()).getTime();
  const label = (s: string) => {
    const t = new Date(s.includes('T') ? s : s.replace(' ', 'T')).getTime();
    if (t >= awal) return 'Hari ini';
    if (t >= awal - 86_400_000) return 'Kemarin';
    if (t >= awal - 6 * 86_400_000) return 'Minggu ini';
    return 'Lebih lama';
  };
  const waktu = (s: string) => new Date(s.includes('T') ? s : s.replace(' ', 'T')).getTime() || 0;
  const URUT = ['Hari ini', 'Kemarin', 'Minggu ini', 'Lebih lama'];
  const out: Array<{ label: string; items: T[] }> = [];
  // Terbaru di atas, apa pun urutan dari server (id tidak selalu searah waktu).
  for (const x of daftar.toSorted((a, b) => waktu(b.created_at) - waktu(a.created_at))) {
    const l = label(x.created_at);
    const g = out.find((y) => y.label === l);
    if (g) g.items.push(x);
    else out.push({ label: l, items: [x] });
  }
  return out.sort((a, b) => URUT.indexOf(a.label) - URUT.indexOf(b.label));
}

/** Notifikasi identik (label, judul, tautan sama) dalam satu kelompok waktu digabung jadi satu baris "×N". */
export interface GrupNotifikasi {
  kunci: string;
  /** Yang terbaru. */
  utama: Notifikasi;
  semua: Notifikasi[];
  belum: boolean;
}

export function gabungNotifikasi(daftar: Notifikasi[]): GrupNotifikasi[] {
  const peta = new Map<string, GrupNotifikasi>();
  for (const x of daftar) {
    const k = `${x.modul ?? ''}\u0000${x.judul.trim()}\u0000${x.tautan ?? ''}`;
    const g = peta.get(k);
    if (g) {
      g.semua.push(x);
      g.belum ||= !x.dibaca_pada;
    } else peta.set(k, { kunci: `${k}\u0000${x.id}`, utama: x, semua: [x], belum: !x.dibaca_pada });
  }
  return [...peta.values()];
}

/** true bila layar sempit (ponsel): panel tampil sebagai lembar bawah. */
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

// ---------------------------------------------------------------- isi panel / halaman

interface IsiNotifikasiProps {
  n: KeadaanNotifikasi;
  mode: 'panel' | 'lembar' | 'halaman' | 'ringkas';
  onNavigasi?: (href: string) => void;
  /** Dipanggil sesudah membuka tautan (panel ditutup). */
  onTutup?: () => void;
  /** Saring satu label tetap (tanpa tab). */
  modul?: string;
  perHalaman: number;
  username?: string;
  semuaHref?: string;
}

type Konfirmasi = null | 'pilih' | 'semua';

function IsiNotifikasi({ n, mode, onNavigasi, onTutup, modul: modulTetap, perHalaman, username, semuaHref }: IsiNotifikasiProps) {
  const [tab, setTab] = React.useState<string>('semua');
  const [hanyaBelum, setHanyaBelum] = React.useState(false);
  const [luas, setLuas] = React.useState<Set<string>>(() => new Set());
  const [konfirmasi, setKonfirmasi] = React.useState<Konfirmasi>(null);
  const [urung, setUrung] = React.useState<{ pesan: string; id: number[] } | null>(null);
  const [sibuk, setSibuk] = React.useState(false);
  const ringkas = mode === 'ringkas';
  const modul = modulTetap ?? (tab === 'semua' ? undefined : tab);
  const labelTab = React.useMemo(
    () => [...n.label].filter((l) => l.total > 0).sort((a, b) => Number(a.bisu) - Number(b.bisu) || b.belum - a.belum || namaLabelNotifikasi(a.modul).localeCompare(namaLabelNotifikasi(b.modul))),
    [n.label],
  );
  const d = useDaftarNotifikasi({ aktif: n.tersedia, modul, hanyaBelum, kecuali: modul ? undefined : n.bisu, username, pemilik: n.username, perHalaman });

  // Tab label yang sudah kosong (dibersihkan) kembali ke "Semua".
  React.useEffect(() => {
    if (tab !== 'semua' && n.label.length && !n.label.some((l) => l.modul === tab && l.total > 0)) setTab('semua');
  }, [n.label, tab]);

  React.useEffect(() => {
    if (!urung) return;
    const t = setTimeout(() => setUrung(null), 7000);
    return () => clearTimeout(t);
  }, [urung]);

  const daftarRef = React.useRef<HTMLDivElement>(null);
  const ujungRef = React.useRef<HTMLDivElement>(null);
  const { muatLagi, adaLagi } = d;
  React.useEffect(() => {
    const el = ujungRef.current;
    if (!el || ringkas || typeof IntersectionObserver === 'undefined' || !adaLagi) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && muatLagi(), { root: mode === 'halaman' ? null : daftarRef.current, rootMargin: '120px' });
    io.observe(el);
    return () => io.disconnect();
  }, [muatLagi, adaLagi, ringkas, mode, d.items]);

  const tampil = (d.items ?? []).filter((x) => !hanyaBelum || !x.dibaca_pada);
  const grup = kelompokHari(ringkas ? tampil.slice(0, perHalaman) : tampil).map((g) => ({ label: g.label, grup: gabungNotifikasi(g.items) }));
  const infoTab = modul ? n.label.find((l) => l.modul === modul) : undefined;
  const belumTab = modul ? (infoTab?.belum ?? tampil.filter((x) => !x.dibaca_pada).length) : n.belum;
  const totalTab = modul ? (infoTab?.total ?? tampil.length) : n.label.filter((l) => !l.bisu).reduce((a, l) => a + l.total, 0) || tampil.length;
  const dibacaTab = Math.max(0, totalTab - belumTab);
  const namaTab = modul ? namaLabelNotifikasi(modul) : null;

  const tandai = (g: GrupNotifikasi) => {
    const ids = new Set(g.semua.map((x) => x.id));
    const kini = new Date().toISOString();
    d.setItems((xs) => xs?.map((x) => (ids.has(x.id) ? { ...x, dibaca_pada: x.dibaca_pada ?? kini } : x)) ?? xs);
    void n.baca(g.semua);
  };
  const hapus = async (g: GrupNotifikasi) => {
    const ids = g.semua.map((x) => x.id);
    d.setItems((xs) => xs?.filter((x) => !ids.includes(x.id)) ?? xs);
    try {
      const id = await n.bersihkan('pilih', { id: ids });
      setUrung({ pesan: ids.length > 1 ? `${ids.length} notifikasi dihapus` : 'Notifikasi dihapus', id });
    } catch {
      d.segarkan();
    }
  };
  const bersihkan = async (cakupan: 'dibaca' | 'semua') => {
    setSibuk(true);
    try {
      const id = await n.bersihkan(cakupan, modul ? { modul } : {});
      d.setItems((xs) => xs?.filter((x) => !id.includes(x.id)) ?? xs);
      setUrung({ pesan: id.length ? `${id.length} notifikasi dibersihkan` : 'Tidak ada yang dibersihkan', id });
      setKonfirmasi(null);
    } catch {
      setUrung({ pesan: 'Gagal membersihkan. Coba lagi.', id: [] });
    } finally {
      setSibuk(false);
    }
  };
  const urungkan = async () => {
    if (!urung) return;
    const id = urung.id;
    setUrung(null);
    try {
      await n.pulihkan(id);
    } finally {
      d.segarkan();
    }
  };
  const bacaSemuaTab = async () => {
    const kini = new Date().toISOString();
    d.setItems((xs) => xs?.map((x) => ({ ...x, dibaca_pada: x.dibaca_pada ?? kini })) ?? xs);
    await n.bacaSemua(modul);
  };
  const buka = (x: Notifikasi, g: GrupNotifikasi) => {
    tandai(g);
    if (!x.tautan) return;
    onTutup?.();
    bukaTautan(x.tautan, onNavigasi);
  };
  const ubahLuas = (g: GrupNotifikasi) => {
    setLuas((s) => {
      const b = new Set(s);
      if (b.has(g.kunci)) b.delete(g.kunci);
      else b.add(g.kunci);
      return b;
    });
    if (g.belum) tandai(g);
  };
  const bisuTab = Boolean(modul && n.bisu.includes(modul));

  const kosong = (
    <Empty
      icon={hanyaBelum ? <CheckCheck /> : <BellOff />}
      title={hanyaBelum ? (namaTab ? `Notifikasi ${namaTab} sudah dibaca semua` : 'Semua sudah dibaca') : namaTab ? `Belum ada notifikasi ${namaTab}` : 'Tidak ada notifikasi'}
      description={hanyaBelum ? 'Notifikasi baru akan tampil di sini.' : 'Pemberitahuan dari semua aplikasi UNIPO tampil di sini.'}
    />
  );

  return (
    <div className={cn('u-notif', `u-notif-${mode}`)}>
      {!ringkas && (
        <div className="u-notif-kepala">
          {mode === 'panel' && <span className="u-kabar-judul">Notifikasi</span>}
          <div className="u-notif-alat">
            <Tekan className="u-notif-saklar" terpilih={hanyaBelum} onClick={() => setHanyaBelum((v) => !v)}>
              <span aria-hidden className="u-notif-saklar-titik" />
              Belum dibaca
            </Tekan>
            <Tooltip content={namaTab ? `Tandai semua ${namaTab} dibaca` : 'Tandai semua dibaca'}>
              <Button variant="ghost" size="xs" iconOnly aria-label={namaTab ? `Tandai semua ${namaTab} dibaca` : 'Tandai semua dibaca'} disabled={!belumTab} onClick={() => void bacaSemuaTab()}>
                <CheckCheck />
              </Button>
            </Tooltip>
            <Tooltip content="Bersihkan">
              <Button variant="ghost" size="xs" iconOnly aria-label="Bersihkan notifikasi" aria-expanded={konfirmasi !== null} disabled={!tampil.length && !totalTab} onClick={() => setKonfirmasi((k) => (k ? null : 'pilih'))}>
                <Eraser />
              </Button>
            </Tooltip>
            {modul && !modulTetap && (
              <Tooltip content={bisuTab ? `Bunyikan lagi ${namaTab}` : `Bisukan ${namaTab}`}>
                <Button variant="ghost" size="xs" iconOnly aria-label={bisuTab ? `Bunyikan lagi notifikasi ${namaTab}` : `Bisukan notifikasi ${namaTab}`} aria-pressed={bisuTab} onClick={() => void n.setelBisu(modul, !bisuTab)}>
                  {bisuTab ? <BellRing /> : <BellOff />}
                </Button>
              </Tooltip>
            )}
          </div>
        </div>
      )}
      {!ringkas && !modulTetap && labelTab.length > 0 && (
        <div className="u-notif-tab" role="tablist" aria-label="Label notifikasi">
          <Tekan role="tab" terpilih={tab === 'semua'} onClick={() => setTab('semua')}>
            Semua
            {n.belum > 0 && <span className="u-notif-tab-angka">{n.belum > 99 ? '99+' : n.belum}</span>}
          </Tekan>
          {labelTab.map((l) => (
            <Tekan key={l.modul} role="tab" terpilih={tab === l.modul} data-bisu={l.bisu ? '' : undefined} onClick={() => setTab(l.modul)} title={l.bisu ? `${namaLabelNotifikasi(l.modul)} dibisukan` : undefined}>
              <span className="u-notif-tab-ikon" aria-hidden>
                {l.bisu ? <BellOff /> : ikonModulNotifikasi(l.modul)}
              </span>
              {namaLabelNotifikasi(l.modul)}
              {l.belum > 0 && <span className="u-notif-tab-angka">{l.belum > 99 ? '99+' : l.belum}</span>}
            </Tekan>
          ))}
        </div>
      )}
      {konfirmasi && (
        <div className="u-notif-konfirmasi" role="region" aria-label="Bersihkan notifikasi">
          {konfirmasi === 'pilih' ? (
            <>
              <p>
                Bersihkan notifikasi{namaTab ? ` ${namaTab}` : ''}
                {bisuTab || modul ? '' : ' (label yang dibisukan tidak ikut)'}?
              </p>
              <div>
                <Button variant="outline" size="xs" disabled={sibuk || !dibacaTab} loading={sibuk} onClick={() => void bersihkan('dibaca')}>
                  Yang sudah dibaca{dibacaTab ? ` (${dibacaTab})` : ''}
                </Button>
                <Button variant="outline" size="xs" disabled={sibuk || !totalTab} onClick={() => setKonfirmasi('semua')}>
                  Semua{totalTab ? ` (${totalTab})` : ''}
                </Button>
                <Button variant="ghost" size="xs" onClick={() => setKonfirmasi(null)}>
                  Batal
                </Button>
              </div>
            </>
          ) : (
            <>
              <p>
                Hapus semua {totalTab} notifikasi{namaTab ? ` ${namaTab}` : ''}, termasuk yang belum dibaca? Masih bisa diurungkan sesaat setelahnya.
              </p>
              <div>
                <Button variant="destructive" size="xs" loading={sibuk} onClick={() => void bersihkan('semua')}>
                  <Trash2 /> Bersihkan semua
                </Button>
                <Button variant="ghost" size="xs" disabled={sibuk} onClick={() => setKonfirmasi('pilih')}>
                  Kembali
                </Button>
              </div>
            </>
          )}
        </div>
      )}
      {d.galat && !d.items?.length ? (
        <Empty icon={<BellOff />} title="Notifikasi tidak dapat dimuat" description={d.galat} />
      ) : d.items === null ? (
        <div className="u-kabar-daftar" aria-busy>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={64} />
          ))}
        </div>
      ) : grup.length ? (
        <div className="u-kabar-daftar" ref={daftarRef}>
          {grup.map((k) => (
            <div key={k.label} role="group" aria-label={k.label} className="u-kabar-grup">
              <div className="u-kabar-sub">{k.label}</div>
              {k.grup.map((g) => {
                const x = g.utama;
                const terbuka = luas.has(g.kunci);
                return (
                  <div key={g.kunci} className="u-notif-item" data-belum={g.belum ? '' : undefined} data-luas={terbuka ? '' : undefined}>
                    <span className="u-kabar-ikon" data-label={(x.modul ?? '').toLowerCase()} aria-hidden>
                      {ikonModulNotifikasi(x.modul)}
                    </span>
                    <div className="u-notif-item-badan">
                      <Tekan className="u-notif-item-utama" aria-expanded={terbuka} onClick={() => ubahLuas(g)}>
                        <span className="u-notif-item-judul">{x.judul}</span>
                        {x.isi && <span className="u-notif-item-isi">{x.isi}</span>}
                      </Tekan>
                      {terbuka && g.semua.length > 1 && (
                        <ul className="u-notif-item-riwayat" aria-label="Notifikasi serupa">
                          {g.semua.map((y) => (
                            <li key={y.id}>
                              <time dateTime={y.created_at}>{waktuLengkap(y.created_at)}</time>
                              {y.isi && y.isi !== x.isi ? <span>{y.isi}</span> : null}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="u-notif-item-meta">
                        {!modul && <span className="u-kabar-item-modul">{namaLabelNotifikasi(x.modul)}</span>}
                        {g.semua.length > 1 && (
                          <span className="u-notif-item-kali" title={`${g.semua.length} notifikasi serupa`}>
                            ×{g.semua.length}
                          </span>
                        )}
                        <time dateTime={x.created_at} title={waktuLengkap(x.created_at)}>
                          {waktuRelatif(x.created_at)}
                        </time>
                        <Tekan className="u-notif-item-lagi" aria-hidden tabIndex={-1} onClick={() => ubahLuas(g)}>
                          <ChevronDown />
                        </Tekan>
                        {x.tautan && (
                          <Tekan className="u-notif-item-buka" onClick={() => buka(x, g)}>
                            Buka <ArrowUpRight />
                          </Tekan>
                        )}
                      </div>
                    </div>
                    <div className="u-notif-item-aksi">
                      {g.belum && (
                        <Tooltip content="Tandai dibaca">
                          <Button variant="ghost" size="xs" iconOnly aria-label={`Tandai dibaca: ${x.judul}`} onClick={() => tandai(g)}>
                            <Check />
                          </Button>
                        </Tooltip>
                      )}
                      <Tooltip content="Hapus">
                        <Button variant="ghost" size="xs" iconOnly aria-label={`Hapus: ${x.judul}`} onClick={() => void hapus(g)}>
                          <Trash2 />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {!ringkas && adaLagi && (
            <div ref={ujungRef} className="u-notif-ujung">
              <Button variant="ghost" size="sm" loading={d.memuat} onClick={muatLagi}>
                Muat lebih banyak
              </Button>
            </div>
          )}
        </div>
      ) : (
        kosong
      )}
      {urung && (
        <div className="u-notif-urung" role="status">
          <span>{urung.pesan}</span>
          {urung.id.length > 0 && (
            <Button variant="ghost" size="xs" onClick={() => void urungkan()}>
              Urungkan
            </Button>
          )}
        </div>
      )}
      {semuaHref && mode !== 'halaman' && !ringkas && (
        <div className="u-kabar-kaki">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onTutup?.();
              bukaTautan(semuaHref, onNavigasi);
            }}
          >
            Lihat semua notifikasi
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- tombol lonceng

export interface TombolNotifikasiProps extends OpsiNotifikasi {
  /**
   * Jumlah belum dibaca dari sumber notifikasi milik aplikasi (mis. notifikasi LMS atau LPPM). Bila diisi, ikon
   * yang sama tampil dengan lencana ini dan langsung membuka `semuaHref` (tanpa membaca /v1/notif).
   */
  belumLuar?: number;
  /** Navigasi jalur internal (mis. `useNavigate()` React Router). Bawaan `location.assign`. */
  onNavigasi?: (href: string) => void;
  /** Halaman semua notifikasi di aplikasi ini (tombol "Lihat semua"). */
  semuaHref?: string;
  className?: string;
}

/**
 * Ikon lonceng di bilah atas: lencana jumlah belum dibaca (GET /v1/notif/ringkas, diperbarui tiap menit selama tab
 * terlihat) dan panel kotak masuk dengan tab per label, filter belum dibaca, tandai dibaca, bersihkan (bisa
 * diurungkan), dan bisukan label. Di ponsel panel menjadi lembar bawah. Tidak tampil bila akun atau token tidak punya
 * akses notifikasi.
 */
export function TombolNotifikasi({ onNavigasi, semuaHref, belumLuar, className, ...opsi }: TombolNotifikasiProps) {
  const luar = belumLuar !== undefined;
  const n = useNotifikasi({ ...opsi, enabled: !luar && opsi.enabled !== false });
  const [buka, setBuka] = React.useState(false);
  const sempit = useSempit();
  if (luar)
    return (
      <Button variant="ghost" size="sm" iconOnly className={cn('u-kabar-tombol', className)} aria-label={belumLuar ? `Notifikasi, ${belumLuar} belum dibaca` : 'Notifikasi'} onClick={() => semuaHref && bukaTautan(semuaHref, onNavigasi)}>
        <Bell />
        {belumLuar > 0 && <span className="u-kabar-lencana">{belumLuar > 99 ? '99+' : belumLuar}</span>}
      </Button>
    );
  if (!n.tersedia) return null;
  const tombol = (
    <Button variant="ghost" size="sm" iconOnly className="u-kabar-tombol" aria-label={n.belum ? `Notifikasi, ${n.belum} belum dibaca` : 'Notifikasi'} onClick={sempit ? () => setBuka(true) : undefined}>
      <Bell />
      {n.belum > 0 && <span className="u-kabar-lencana">{n.belum > 99 ? '99+' : n.belum}</span>}
    </Button>
  );
  const isi = (mode: 'panel' | 'lembar') =>
    buka && <IsiNotifikasi n={n} mode={mode} onNavigasi={onNavigasi} onTutup={() => setBuka(false)} perHalaman={opsi.jumlah ?? 15} username={opsi.username} semuaHref={semuaHref} />;
  if (sempit)
    return (
      <>
        {tombol}
        <Dialog open={buka} onOpenChange={setBuka} side="bottom" title="Notifikasi" className={cn('u-kabar-lembar', className)}>
          {isi('lembar')}
        </Dialog>
      </>
    );
  return (
    <Popover open={buka} onOpenChange={setBuka} align="end" width={416} className={cn('u-kabar-panel', className)} trigger={tombol}>
      {isi('panel')}
    </Popover>
  );
}

/** Tab kecil "Semua | Belum dibaca" di panel bilah atas (pesan). */
export function TabKabar({ nilai, onUbah, belum }: { nilai: 'semua' | 'belum'; onUbah: (v: 'semua' | 'belum') => void; belum?: number }) {
  return (
    <div className="u-kabar-tab">
      <SegmentedControl<'semua' | 'belum'>
        aria-label="Saring pesan"
        value={nilai}
        onValueChange={onUbah}
        options={[
          { value: 'semua', label: 'Semua' },
          {
            value: 'belum',
            label: (
              <>
                Belum dibaca
                {belum ? <span className="u-kabar-tab-jumlah">{belum > 99 ? '99+' : belum}</span> : null}
              </>
            ),
          },
        ]}
      />
    </div>
  );
}

// ================================================================ Halaman kotak masuk

export interface KotakNotifikasiProps {
  /** Navigasi jalur internal saat notifikasi dibuka. */
  onNavigasi?: (href: string) => void;
  /** Saring per modul pengirim (mis. "lms"); kosong = semua label dengan tab per label. */
  modul?: string;
  /** Jumlah per muatan. Bawaan 20. */
  perHalaman?: number;
  /** Tampilan ringkas untuk panel beranda: tanpa tab dan alat, tanpa muat lebih banyak. */
  ringkas?: boolean;
  className?: string;
}

/**
 * Halaman kotak masuk notifikasi pusat (/v1/notif/kotak) untuk rute /notifikasi tiap aplikasi: tab per label, filter
 * belum dibaca, dikelompokkan per hari, notifikasi identik digabung, tandai dibaca, bersihkan, gulir tak hingga.
 */
export function KotakNotifikasi({ onNavigasi, modul, perHalaman = 20, ringkas, className }: KotakNotifikasiProps) {
  const n = useNotifikasi({ interval: 0 });
  if (!n.tersedia) return <Empty icon={<BellOff />} title="Notifikasi tidak tersedia" description="Akun ini belum punya akses notifikasi." />;
  return (
    <div className={cn('u-kotak-notif', className)} data-ringkas={ringkas ? '' : undefined}>
      <IsiNotifikasi n={n} mode={ringkas ? 'ringkas' : 'halaman'} onNavigasi={onNavigasi} modul={modul} perHalaman={perHalaman} />
    </div>
  );
}
