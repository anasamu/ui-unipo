'use client';
import * as React from 'react';
import { Archive, ArchiveRestore, Ban, Bell, BellRing, BookOpen, Building2, CalendarClock, CalendarDays, CircleCheck, CircleDot, Clock, Copy, EllipsisVertical, ExternalLink, Eye, FileText, Globe, GraduationCap, Headset, Image, Info, LayoutPanelTop, Link2, Megaphone, MessageSquareText, PanelBottom, PanelTop, PartyPopper, Pencil, Plus, Search, Shapes, Siren, Sparkles, SquareStack, Star, Trash2, TriangleAlert, Type, UserPlus, Users, Wallet, Wifi, Wrench, X } from 'lucide-react';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Empty, Tabs } from '../components/display';
import { Field, Input, InputGroup, SegmentedControl, Switch, Textarea } from '../components/forms';
import { BagianForm, PanelForm, PilihanBanyak } from '../components/formulir';
import { PitaPengumuman, type ItemPita } from '../components/kaki-situs';
import { ConfirmDialog, Dialog, Menu, Tooltip, useToast, type MenuEntry } from '../components/overlays';
import { Combobox, Select } from '../components/select';
import { ADEGAN, Ilustrasi } from '../ikon/ilustrasi';
import { cn } from '../lib/cn';
import { GalatApi } from './galat';
import { PilihUnit, useUnitOrganisasi } from './pilih-unit';
import { invalidateSiakad, pesanGalat, useOptionalSiakad, useSiakad, useSiakadQuery } from './provider';
import { IsianAngka, IsianTanggalWaktu } from '../components/isian-angka';
import { keAngka } from '../lib/angka';

// ================================================================ Pengumuman lintas aplikasi (/v1/notif/pita)
//
// Unit membuat pengumuman singkat dengan sasaran aplikasi, unit, dan peran (termasuk jenis akun `akun:mahasiswa`, ...),
// serta saklar publik (tanpa login). KerangkaAplikasi dan
// KerangkaPortal menampilkannya otomatis lewat <PengumumanTampil>, dengan cara tampil per pengumuman: pita, banner,
// popup, toast, atau bilah bawah (ponsel).

export type NadaPengumuman = 'info' | 'penting' | 'darurat' | 'pemeliharaan' | 'sukses';
export type ModePengumuman = 'pita' | 'banner' | 'popup' | 'toast' | 'bawah';
export type JenisSasaran = 'mahasiswa' | 'alumni' | 'dosen' | 'tendik' | 'pendaftar' | 'publik';
/** Visual pengumuman: ikon dalam lingkaran, ilustrasi bawaan unipo-ui, gambar (`gambar`), atau tanpa visual. */
export type VisualPengumuman = 'ikon' | 'ilustrasi' | 'gambar' | 'tanpa';

export interface OpsiPengumuman {
  ulang?: 'sekali' | 'sesi';
  hilang_detik?: number;
  /** Kosong = perilaku lama: ikon sesuai nada, gambar bila diisi (banner/popup). */
  visual?: VisualPengumuman;
  /** Kunci {@link IKON_PENGUMUMAN}; kosong = ikon sesuai nada. */
  ikon?: string;
  /** Kunci {@link ILUSTRASI_PENGUMUMAN}. */
  ilustrasi?: string;
}

export interface PengumumanTayang {
  id: string;
  judul: string;
  isi?: string | null;
  tautan?: string | null;
  teks_tautan?: string | null;
  nada: NadaPengumuman;
  mode: ModePengumuman;
  gambar?: string | null;
  opsi?: OpsiPengumuman;
  prioritas?: number;
  dapat_ditutup: boolean;
  mulai?: string | null;
  selesai?: string | null;
}

/** Konten portal yang dirujuk tautan "Selengkapnya" (GET /v1/notif/pita/tautan). */
export interface RujukanTautan {
  jenis: 'berita' | 'pengumuman' | 'agenda' | 'halaman';
  id: number;
  judul?: string | null;
  situs?: string | null;
  situs_nama?: string | null;
  tanggal?: string | null;
  /** Alamat baca publik (newsroom). */
  url?: string | null;
  /** false = konten tidak terbit lagi (pengumuman tampil tanpa tautan). */
  tersedia?: boolean;
}

export interface PengumumanKelola extends PengumumanTayang {
  status: 'draf' | 'terbit' | 'arsip';
  tayang: 'aktif' | 'terjadwal' | 'berakhir' | 'draf' | 'arsip';
  aplikasi: string[] | null;
  /** `["publik"]` atau null; rekaman lama bisa masih berisi jenis akun (tetap berlaku bersama peran). */
  jenis: JenisSasaran[] | null;
  /** Tampil juga untuk pengunjung tanpa login. */
  publik?: boolean;
  tautan_ref?: RujukanTautan | null;
  unit: string[] | null;
  peran: string[] | null;
  unit_pemilik?: string | null;
  unit_pemilik_nama?: string | null;
  dibuat_oleh?: string | null;
  dibuat_at?: string | null;
}

export const PILIHAN_NADA: Array<{ value: NadaPengumuman; label: string }> = [
  { value: 'info', label: 'Info' },
  { value: 'penting', label: 'Penting' },
  { value: 'darurat', label: 'Darurat' },
  { value: 'pemeliharaan', label: 'Pemeliharaan' },
  { value: 'sukses', label: 'Kabar baik' },
];

export const PILIHAN_MODE: Array<{ value: ModePengumuman; label: string; keterangan: string; ikon: React.ReactNode }> = [
  { value: 'pita', label: 'Pita', keterangan: 'Bilah tipis di atas semua halaman', ikon: <PanelTop /> },
  { value: 'banner', label: 'Banner', keterangan: 'Kartu di atas isi halaman, bisa bergambar', ikon: <LayoutPanelTop /> },
  { value: 'popup', label: 'Popup', keterangan: 'Jendela saat aplikasi dibuka', ikon: <SquareStack /> },
  { value: 'toast', label: 'Toast', keterangan: 'Kartu kecil dari kanan, bisa hilang sendiri', ikon: <MessageSquareText /> },
  { value: 'bawah', label: 'Bilah bawah', keterangan: 'Bilah di bawah layar ponsel', ikon: <PanelBottom /> },
];

/** Kode aplikasi sasaran (sama dengan `kode` KerangkaAplikasi; `siakad-lama` = SIAKAD lama, `publik` = portal publik). */
export const APLIKASI_PENGUMUMAN: Array<{ value: string; label: string }> = [
  { value: 'siakad-lama', label: 'SIAKAD (lama)' },
  { value: 'pustikom', label: 'Pustikom' },
  { value: 'baak', label: 'BAAK' },
  { value: 'bauk', label: 'BAUK (keuangan)' },
  { value: 'sdm', label: 'SDM' },
  { value: 'lms', label: 'E-learning' },
  { value: 'pmb', label: 'PMB' },
  { value: 'humas', label: 'Humas' },
  { value: 'fakultas', label: 'Fakultas' },
  { value: 'lp2m', label: 'LPPM' },
  { value: 'spmi', label: 'SPMI' },
  { value: 'tracer', label: 'Alumni (tracer)' },
  { value: 'dashboard', label: 'Dasbor pimpinan' },
  { value: 'profile', label: 'Profil' },
  { value: 'api', label: 'Portal API' },
  { value: 'publik', label: 'Portal publik (situs)' },
];

/** @deprecated Sasaran jenis pengguna diganti peran `akun:*` ({@link PERAN_AKUN}) dan saklar publik. */
export const JENIS_SASARAN: Array<{ value: JenisSasaran; label: string }> = [
  { value: 'mahasiswa', label: 'Mahasiswa' },
  { value: 'dosen', label: 'Dosen' },
  { value: 'tendik', label: 'Tendik' },
  { value: 'alumni', label: 'Alumni' },
  { value: 'pendaftar', label: 'Pendaftar PMB' },
  { value: 'publik', label: 'Publik (tanpa login)' },
];

const IKON_NADA: Record<NadaPengumuman, React.ReactNode> = {
  info: <Info />,
  penting: <Megaphone />,
  darurat: <Siren />,
  pemeliharaan: <Wrench />,
  sukses: <CircleCheck />,
};

/** Ikon pilihan untuk visual "Ikon" (daftar putih sama dengan server: Pita::IKON). Warna mengikuti nada. */
export const IKON_PENGUMUMAN: Array<{ value: string; label: string; ikon: React.ReactNode }> = [
  { value: 'toa', label: 'Toa', ikon: <Megaphone /> },
  { value: 'info', label: 'Info', ikon: <Info /> },
  { value: 'peringatan', label: 'Peringatan', ikon: <TriangleAlert /> },
  { value: 'darurat', label: 'Darurat', ikon: <Siren /> },
  { value: 'sukses', label: 'Berhasil', ikon: <CircleCheck /> },
  { value: 'kalender', label: 'Kalender', ikon: <CalendarDays /> },
  { value: 'jam', label: 'Batas waktu', ikon: <Clock /> },
  { value: 'dompet', label: 'Keuangan', ikon: <Wallet /> },
  { value: 'toga', label: 'Akademik', ikon: <GraduationCap /> },
  { value: 'buku', label: 'Buku', ikon: <BookOpen /> },
  { value: 'dokumen', label: 'Dokumen', ikon: <FileText /> },
  { value: 'alat', label: 'Pemeliharaan', ikon: <Wrench /> },
  { value: 'bintang', label: 'Bintang', ikon: <Star /> },
  { value: 'perayaan', label: 'Perayaan', ikon: <PartyPopper /> },
  { value: 'lonceng', label: 'Lonceng', ikon: <Bell /> },
  { value: 'pendaftaran', label: 'Pendaftaran', ikon: <UserPlus /> },
  { value: 'layanan', label: 'Layanan', ikon: <Headset /> },
  { value: 'jaringan', label: 'Jaringan', ikon: <Wifi /> },
];

/** Ilustrasi pilihan untuk visual "Ilustrasi" (adegan {@link Ilustrasi}; daftar putih server: Pita::ILUSTRASI). */
export const ILUSTRASI_PENGUMUMAN: Array<{ value: string; label: string }> = [
  { value: 'pengumuman', label: 'Pengumuman' },
  { value: 'jadwal', label: 'Akademik & kalender' },
  { value: 'krs', label: 'KRS & perkuliahan' },
  { value: 'pembayaran', label: 'Keuangan' },
  { value: 'peringatan', label: 'Peringatan' },
  { value: 'wisuda', label: 'Perayaan & wisuda' },
  { value: 'pemeliharaan', label: 'Pemeliharaan sistem' },
  { value: 'pendaftaran', label: 'PMB & pendaftaran' },
  { value: 'surat-layanan', label: 'Layanan' },
];

export const PILIHAN_VISUAL: Array<{ value: VisualPengumuman; label: string; ikon: React.ReactNode }> = [
  { value: 'ikon', label: 'Ikon', ikon: <Shapes /> },
  { value: 'ilustrasi', label: 'Ilustrasi', ikon: <Sparkles /> },
  { value: 'gambar', label: 'Gambar', ikon: <Image /> },
  { value: 'tanpa', label: 'Tanpa', ikon: <Ban /> },
];

/** Visual yang berlaku untuk mode pengumuman ini (gambar hanya untuk banner dan popup). */
export function visualPengumuman(p: Pick<PengumumanTayang, 'opsi' | 'gambar' | 'mode'>): VisualPengumuman {
  const bergambar = p.mode === 'banner' || p.mode === 'popup';
  const v = p.opsi?.visual ?? (p.gambar && bergambar ? 'gambar' : 'ikon');
  if (v === 'gambar' && (!bergambar || !p.gambar)) return 'ikon';
  if (v === 'ilustrasi' && !(p.opsi?.ilustrasi && ADEGAN[p.opsi.ilustrasi])) return 'ikon';
  return v;
}

/** Ikon kecil pengumuman: ikon pilihan, ikon utama ilustrasi, atau ikon nada. */
function ikonPengumuman(p: Pick<PengumumanTayang, 'opsi' | 'nada'>): React.ReactNode {
  const pilih = p.opsi?.ikon ? IKON_PENGUMUMAN.find((x) => x.value === p.opsi!.ikon)?.ikon : undefined;
  if (pilih && p.opsi?.visual !== 'ilustrasi') return pilih;
  const adegan = p.opsi?.visual === 'ilustrasi' && p.opsi.ilustrasi ? ADEGAN[p.opsi.ilustrasi] : undefined;
  if (adegan) {
    const Ik = adegan.ikon;
    return <Ik />;
  }
  return IKON_NADA[p.nada];
}

/**
 * Visual pengumuman menurut ukuran: `besar` (popup: lingkaran ikon, ilustrasi penuh, atau gambar), `sedang` (banner),
 * `kecil` (toast). Null bila tanpa visual.
 */
function VisualTampil({ p, ukuran }: { p: PengumumanTayang; ukuran: 'besar' | 'sedang' | 'kecil' }) {
  const v = visualPengumuman(p);
  if (v === 'tanpa') return null;
  if (v === 'gambar') return <img className={ukuran === 'besar' ? 'u-pgm-popup-gambar' : 'u-pgm-gambar'} src={p.gambar!} alt="" loading="lazy" />;
  if (v === 'ilustrasi') {
    return <Ilustrasi nama={p.opsi!.ilustrasi!} lebar={ukuran === 'besar' ? 200 : ukuran === 'sedang' ? 120 : 64} tokoh={ukuran === 'kecil' ? false : undefined} className={cn('u-pgm-ilus', `u-pgm-ilus-${ukuran}`)} />;
  }
  return (
    <span className={ukuran === 'besar' ? 'u-pgm-popup-ikon' : 'u-pgm-ikon'} aria-hidden>
      {ikonPengumuman(p)}
    </span>
  );
}

// ---------------------------------------------------------------- data tayang + tutup

const KUNCI_TUTUP = 'unipo.pengumuman.tutup';
const KUNCI_SESI = 'unipo.pengumuman.sesi';
const ditutup = new Set<string>();
const pendengarTutup = new Set<() => void>();
let dimuatLokal = false;

function muatLokal() {
  if (dimuatLokal || typeof window === 'undefined') return;
  dimuatLokal = true;
  try {
    for (const id of JSON.parse(localStorage.getItem(KUNCI_TUTUP) ?? '[]') as string[]) ditutup.add(id);
    for (const id of JSON.parse(sessionStorage.getItem(KUNCI_SESI) ?? '[]') as string[]) ditutup.add(`sesi:${id}`);
  } catch {
    /* penyimpanan diblokir */
  }
}

function simpanLokal(kunci: string, id: string, store: Storage | undefined) {
  try {
    if (!store) return;
    const l = new Set<string>(JSON.parse(store.getItem(kunci) ?? '[]') as string[]);
    l.add(id);
    store.setItem(kunci, JSON.stringify([...l].slice(-200)));
  } catch {
    /* abaikan */
  }
}

function useDitutup(): Set<string> {
  muatLokal();
  const [, setN] = React.useState(0);
  React.useEffect(() => {
    const f = () => setN((n) => n + 1);
    pendengarTutup.add(f);
    return () => void pendengarTutup.delete(f);
  }, []);
  return ditutup;
}

/**
 * Pengumuman yang sedang tayang untuk pemanggil di aplikasi `aplikasi` (GET /v1/notif/pita), disegarkan tiap 5 menit
 * selama tab terlihat. `tutup(item)` menyembunyikan di semua aplikasi (per akun di server; tanpa login di browser ini).
 */
export function usePengumumanTayang(aplikasi: string, enabled = true, situs?: string) {
  const siakad = useOptionalSiakad();
  const q = useSiakadQuery<PengumumanTayang[]>(['notif-pita', aplikasi, situs ?? ''], (s, signal) => s.request<PengumumanTayang[]>({ method: 'GET', path: '/v1/notif/pita', query: { aplikasi, situs } }, { signal, maxRetries: 0 }), {
    staleTime: 120_000,
    enabled: enabled && Boolean(siakad),
  });
  const tutupSet = useDitutup();
  React.useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => document.visibilityState === 'visible' && invalidateSiakad('notif-pita'), 300_000);
    return () => clearInterval(t);
  }, [enabled]);
  const items = (q.data ?? []).filter((x) => !tutupSet.has(x.id));
  const tutup = React.useCallback(
    (item: PengumumanTayang, cara: 'permanen' | 'sesi' = 'permanen') => {
      if (cara === 'sesi') {
        ditutup.add(`sesi:${item.id}`);
        simpanLokal(KUNCI_SESI, item.id, typeof sessionStorage !== 'undefined' ? sessionStorage : undefined);
      } else {
        ditutup.add(item.id);
        simpanLokal(KUNCI_TUTUP, item.id, typeof localStorage !== 'undefined' ? localStorage : undefined);
        void siakad?.request({ method: 'POST', path: `/v1/notif/pita/${item.id}/tutup`, body: {} }, { maxRetries: 0 }).catch(() => {});
      }
      pendengarTutup.forEach((f) => f());
    },
    [siakad],
  );
  return { items, semua: q.data ?? [], loading: q.loading, tutup, sudahDitutup: (id: string) => tutupSet.has(id) || tutupSet.has(`sesi:${id}`) };
}

// ---------------------------------------------------------------- tampilan per mode (juga dipakai pratinjau)

const nadaKePita = (n: NadaPengumuman): ItemPita['priority'] => (n === 'penting' ? 'penting' : n);

function Tautan({ p, className, children }: { p: PengumumanTayang; className?: string; children?: React.ReactNode }) {
  if (!p.tautan) return null;
  const luar = /^https?:/.test(p.tautan);
  return (
    <a className={className} href={p.tautan} target={luar ? '_blank' : undefined} rel={luar ? 'noreferrer' : undefined}>
      {children ?? (p.teks_tautan || 'Selengkapnya')}
    </a>
  );
}

/** Kartu banner di atas isi halaman: visual (ikon, ilustrasi sedang, gambar, atau tanpa), judul, keterangan, tombol tautan. */
export function BannerPengumuman({ p, onTutup, className }: { p: PengumumanTayang; onTutup?: () => void; className?: string }) {
  return (
    <div className={cn('u-pgm-banner', className)} data-nada={p.nada} data-visual={visualPengumuman(p)} role="region" aria-label="Pengumuman">
      <VisualTampil p={p} ukuran="sedang" />
      <div className="u-pgm-teks">
        <strong>{p.judul}</strong>
        {p.isi && <p>{p.isi}</p>}
        {p.tautan && <Tautan p={p} className="u-button u-pgm-cta" />}
      </div>
      {onTutup && p.dapat_ditutup && (
        <button type="button" className="u-pgm-tutup" aria-label="Tutup pengumuman" onClick={onTutup}>
          <X />
        </button>
      )}
    </div>
  );
}

/** Kartu toast (ikon atau ilustrasi kecil) dan isi bilah bawah (ikon kecil). */
export function ToastPengumuman({ p, onTutup, bawah, className }: { p: PengumumanTayang; onTutup?: () => void; bawah?: boolean; className?: string }) {
  return (
    <div className={cn(bawah ? 'u-pgm-bawah' : 'u-pgm-toast', className)} data-nada={p.nada} data-visual={bawah ? undefined : visualPengumuman(p)} role="status">
      {bawah ? (
        visualPengumuman(p) !== 'tanpa' && (
          <span className="u-pgm-ikon" aria-hidden>
            {ikonPengumuman(p)}
          </span>
        )
      ) : (
        <VisualTampil p={p} ukuran="kecil" />
      )}
      <div className="u-pgm-teks">
        <strong>{p.judul}</strong>
        {p.isi && !bawah && <p>{p.isi}</p>}
        <Tautan p={p} className="u-pgm-tautan" />
      </div>
      {onTutup && (
        <button type="button" className="u-pgm-tutup" aria-label="Tutup pengumuman" onClick={onTutup}>
          <X />
        </button>
      )}
    </div>
  );
}

/**
 * Isi popup rata tengah untuk pratinjau: visual di atas, judul, keterangan. Popup sungguhan ({@link PengumumanTampil})
 * menaruh visual dan judul di judul Dialog yang sama tata letaknya.
 */
export function IsiPopupPengumuman({ p, judul = true }: { p: PengumumanTayang; judul?: boolean }) {
  return (
    <div className="u-pgm-popup" data-nada={p.nada} data-visual={visualPengumuman(p)}>
      <VisualTampil p={p} ukuran="besar" />
      {judul && <strong className="u-pgm-popup-judul">{p.judul || 'Judul pengumuman'}</strong>}
      {p.isi && <p>{p.isi}</p>}
    </div>
  );
}

export interface PengumumanTampilProps {
  /** Kode aplikasi pemanggil (sama dengan `kode` KerangkaAplikasi; portal publik: `publik`). */
  aplikasi: string;
  /** Kode situs portal (untuk `publik`): pengumuman publik milik unit hanya tayang di situs unit itu. */
  situs?: string;
  /**
   * Bagian yang dirender: `atas` = pita (taruh di atas header), `isi` = banner (taruh di atas isi halaman),
   * `lapis` = popup, toast, dan bilah bawah (lapisan di atas halaman). Bawaan semua.
   */
  bagian?: Array<'atas' | 'isi' | 'lapis'>;
  className?: string;
}

/**
 * Tampilkan pengumuman lintas aplikasi sesuai mode masing-masing. KerangkaAplikasi memasangnya otomatis; pakai
 * langsung di tata letak sendiri (mis. halaman publik) bila perlu. Popup tampil satu per satu menurut prioritas.
 */
export function PengumumanTampil({ aplikasi, situs, bagian = ['atas', 'isi', 'lapis'], className }: PengumumanTampilProps) {
  const { items, tutup, sudahDitutup } = usePengumumanTayang(aplikasi, true, situs);
  const [sembunyi, setSembunyi] = React.useState<Set<string>>(new Set());
  const pita = items.filter((x) => x.mode === 'pita');
  const banner = items.filter((x) => x.mode === 'banner');
  const popup = items.find((x) => x.mode === 'popup' && !sudahDitutup(x.id));
  const toast = items.filter((x) => (x.mode === 'toast' || x.mode === 'bawah') && !sembunyi.has(x.id));
  const bawah = toast.filter((x) => x.mode === 'bawah');
  const kanan = toast.filter((x) => x.mode === 'toast');

  React.useEffect(() => {
    // Toast yang punya hilang_detik hilang sendiri (untuk sesi ini saja; muncul lagi saat aplikasi dibuka ulang).
    const t = kanan
      .filter((x) => (x.opsi?.hilang_detik ?? 0) > 0)
      .map((x) => setTimeout(() => setSembunyi((s) => new Set(s).add(x.id)), (x.opsi!.hilang_detik ?? 8) * 1000));
    return () => t.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kanan.map((x) => x.id).join(',')]);

  const tutupPopup = () => {
    if (!popup) return;
    tutup(popup, popup.opsi?.ulang === 'sesi' || !popup.dapat_ditutup ? 'sesi' : 'permanen');
  };

  return (
    <>
      {bagian.includes('atas') && pita.length > 0 && (
        <PitaPengumuman
          className={cn('u-pgm-pita', className)}
          interval={7000}
          items={pita.map((p) => ({ id: p.id, title: p.judul, detail: p.isi ?? undefined, href: p.tautan ?? undefined, cta: p.teks_tautan ?? undefined, external: /^https?:/.test(p.tautan ?? ''), priority: nadaKePita(p.nada), dapatDitutup: p.dapat_ditutup, icon: ikonPengumuman(p) }))}
          onTutupItem={(it) => {
            const p = pita.find((x) => x.id === it.id);
            if (p) tutup(p);
          }}
        />
      )}
      {bagian.includes('isi') && banner.length > 0 && (
        <div className="u-pgm-banner-daftar">
          {banner.map((p) => (
            <BannerPengumuman key={p.id} p={p} onTutup={() => tutup(p)} />
          ))}
        </div>
      )}
      {bagian.includes('lapis') && (
        <>
          {popup && (
            <Dialog
              open
              onOpenChange={(o) => !o && tutupPopup()}
              className={cn('u-pgm-dialog', `u-pgm-dialog-${visualPengumuman(popup)}`)}
              size={visualPengumuman(popup) === 'gambar' ? 'md' : 'sm'}
              title={
                // Visual di atas judul, rata tengah; nama yang dibaca pembaca layar tetap judul (visual dekoratif).
                <>
                  {visualPengumuman(popup) !== 'tanpa' && (
                    <span className="u-pgm-dialog-visual" data-nada={popup.nada}>
                      <VisualTampil p={popup} ukuran="besar" />
                    </span>
                  )}
                  <span className="u-pgm-dialog-judul">{popup.judul}</span>
                </>
              }
              description={popup.isi || undefined}
              footer={
                <>
                  <Button variant="outline" onClick={tutupPopup}>
                    Tutup
                  </Button>
                  {popup.tautan && (
                    <Button render={<a href={popup.tautan} target={/^https?:/.test(popup.tautan) ? '_blank' : undefined} rel="noreferrer" />} onClick={tutupPopup}>
                      {popup.teks_tautan || 'Selengkapnya'}
                    </Button>
                  )}
                </>
              }
            />
          )}
          {kanan.length > 0 && (
            <div className="u-pgm-toast-daftar" aria-live="polite">
              {kanan.slice(0, 3).map((p) => (
                <ToastPengumuman key={p.id} p={p} onTutup={() => (p.dapat_ditutup ? tutup(p) : setSembunyi((s) => new Set(s).add(p.id)))} />
              ))}
            </div>
          )}
          {bawah.length > 0 && (
            <div className="u-pgm-bawah-wadah">
              <ToastPengumuman bawah p={bawah[0]!} onTutup={() => (bawah[0]!.dapat_ditutup ? tutup(bawah[0]!) : setSembunyi((s) => new Set(s).add(bawah[0]!.id)))} />
            </div>
          )}
        </>
      )}
    </>
  );
}

/** Pratinjau satu pengumuman dalam mode tertentu (untuk formulir). */
export function PratinjauPengumuman({ p }: { p: PengumumanTayang }) {
  return (
    <div className="u-pgm-pratinjau" data-mode={p.mode} aria-label={`Pratinjau ${p.mode}`}>
      <div className="u-pgm-pratinjau-layar">
        {p.mode === 'pita' && (
          <PitaPengumuman interval={0} items={[{ id: 'x', title: p.judul || 'Judul pengumuman', detail: p.isi ?? undefined, href: p.tautan || undefined, cta: p.teks_tautan ?? undefined, priority: nadaKePita(p.nada), dapatDitutup: p.dapat_ditutup, icon: ikonPengumuman(p) }]} onTutupItem={() => {}} />
        )}
        <div className="u-pgm-pratinjau-kepala">
          <i />
          <i />
          <i />
        </div>
        <div className="u-pgm-pratinjau-isi">
          {p.mode === 'banner' && <BannerPengumuman p={{ ...p, judul: p.judul || 'Judul pengumuman' }} onTutup={() => {}} />}
          <i className="u-pgm-pratinjau-baris" />
          <i className="u-pgm-pratinjau-baris" />
          <i className="u-pgm-pratinjau-baris" data-pendek="" />
        </div>
        {p.mode === 'popup' && (
          <div className="u-pgm-pratinjau-lapis">
            <div className="u-pgm-pratinjau-dialog">
              <IsiPopupPengumuman p={p} />
              <div className="u-pgm-popup-aksi">
                <span className="u-pgm-pratinjau-tombol">Tutup</span>
                {p.tautan && <span className="u-pgm-pratinjau-tombol" data-utama="">{p.teks_tautan || 'Selengkapnya'}</span>}
              </div>
            </div>
          </div>
        )}
        {p.mode === 'toast' && (
          <div className="u-pgm-pratinjau-toast">
            <ToastPengumuman p={{ ...p, judul: p.judul || 'Judul pengumuman' }} onTutup={() => {}} />
          </div>
        )}
        {p.mode === 'bawah' && (
          <div className="u-pgm-pratinjau-bawah">
            <ToastPengumuman bawah p={{ ...p, judul: p.judul || 'Judul pengumuman' }} onTutup={() => {}} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- formulir

interface HakPengumuman {
  semua: boolean;
  /** Boleh menandai publik (unit: hanya tayang di situs portal unitnya). */
  publik: boolean;
  unit: Array<{ id: number; kode: string; nama: string }> | null;
  /** Boleh mengisi URL bebas untuk "Selengkapnya" (pembuat tingkat universitas). */
  tautan_manual?: boolean;
  /** Peran khusus jenis akun (`akun:mahasiswa`, ...). */
  peran_akun?: Array<{ kode: string; nama: string }>;
}

/** Peran khusus jenis akun (server: Pita::JENIS_AKUN); cadangan bila /hak belum mengirim `peran_akun`. */
export const PERAN_AKUN: Array<{ value: string; label: string }> = [
  { value: 'akun:mahasiswa', label: 'Mahasiswa' },
  { value: 'akun:dosen', label: 'Dosen' },
  { value: 'akun:tendik', label: 'Tendik' },
  { value: 'akun:alumni', label: 'Alumni' },
  { value: 'akun:pendaftar', label: 'Pendaftar PMB' },
];

/** Peran RBAC dasar yang diwakili "Jenis akun" di pemilih peran. */
const PERAN_DASAR = ['mahasiswa', 'dosen', 'tendik', 'maba'];

const JENIS_TAUTAN: Record<RujukanTautan['jenis'], string> = { berita: 'Berita', pengumuman: 'Pengumuman', agenda: 'Agenda', halaman: 'Halaman' };

type Draf = Omit<PengumumanKelola, 'id' | 'tayang' | 'dibuat_oleh' | 'dibuat_at' | 'unit_pemilik' | 'unit_pemilik_nama'> & { id?: string; publik: boolean; tautan_ref: RujukanTautan | null };

const DRAF_KOSONG: Draf = {
  judul: '',
  isi: '',
  tautan: '',
  teks_tautan: '',
  tautan_ref: null,
  nada: 'info',
  mode: 'pita',
  gambar: '',
  opsi: { visual: 'ikon' },
  prioritas: 0,
  dapat_ditutup: true,
  mulai: null,
  selesai: null,
  status: 'terbit',
  aplikasi: null,
  jenis: null,
  publik: false,
  unit: null,
  peran: null,
};

/** Opsi yang dikirim: hanya kunci yang relevan untuk mode dan visual terpilih. */
function opsiBersih(o: OpsiPengumuman | undefined, mode: ModePengumuman): OpsiPengumuman {
  const v = o?.visual ?? 'ikon';
  return {
    ulang: mode === 'popup' ? o?.ulang : undefined,
    hilang_detik: mode === 'toast' ? o?.hilang_detik : undefined,
    visual: v,
    ikon: v === 'ikon' ? o?.ikon : undefined,
    ilustrasi: v === 'ilustrasi' ? (o?.ilustrasi ?? ILUSTRASI_PENGUMUMAN[0]!.value) : undefined,
  };
}

const keInputWaktu = (v?: string | null) => (v ? v.replace(' ', 'T').slice(0, 16) : '');
const dariInputWaktu = (v: string) => (v ? `${v.replace('T', ' ')}:00` : null);
/** Jenis akun lama (selain publik) yang belum dipindah ke peran akun:* (rekaman lama yang juga punya peran). */
const jenisLama = (j?: JenisSasaran[] | null) => (j ?? []).filter((x) => x !== 'publik');

function drafAwal(awal: PengumumanKelola | null | undefined, salin: boolean, aplikasiBawaan?: string[] | null): Draf {
  if (!awal) return { ...DRAF_KOSONG, aplikasi: aplikasiBawaan ?? null };
  const d: Draf = {
    ...awal,
    isi: awal.isi ?? '',
    tautan: awal.tautan_ref ? '' : (awal.tautan ?? ''),
    teks_tautan: awal.teks_tautan ?? '',
    tautan_ref: awal.tautan_ref ?? null,
    gambar: awal.gambar ?? '',
    publik: awal.publik ?? (awal.jenis ?? []).includes('publik'),
    // Rekaman lama tanpa opsi.visual: gambar bila diisi, selain itu ikon nada.
    opsi: { ...awal.opsi, visual: awal.opsi?.visual ?? (awal.gambar ? 'gambar' : 'ikon') },
  };
  if (salin) {
    delete d.id;
    d.judul = `${awal.judul} (salinan)`.slice(0, 200);
    d.status = 'draf';
  }
  return d;
}

function useFormPengumuman({ awal, salin, aplikasiBawaan, onSelesai }: { awal?: PengumumanKelola | null; salin?: boolean; aplikasiBawaan?: string[] | null; onSelesai?: (p: PengumumanKelola) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const hak = useSiakadQuery<HakPengumuman>(['notif-pita-hak'], (s, signal) => s.request<HakPengumuman>({ method: 'GET', path: '/v1/notif/pita/hak' }, { signal }));
  const [mula] = React.useState(() => drafAwal(awal, Boolean(salin), aplikasiBawaan));
  const [d, setD] = React.useState<Draf>(mula);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [proses, setProses] = React.useState(false);
  const [perkiraan, setPerkiraan] = React.useState<{ jumlah: number | null; keterangan: string } | null>(null);
  const ubah = <K extends keyof Draf>(k: K, v: Draf[K]) => setD((x) => ({ ...x, [k]: v }));
  const berubah = salin || JSON.stringify(d) !== JSON.stringify(mula);
  const ubahId = awal && !salin ? awal.id : null;

  const sasaranKunci = JSON.stringify([d.unit, d.peran, d.publik, jenisLama(d.jenis)]);
  React.useEffect(() => {
    const t = setTimeout(() => {
      siakad
        .request<{ jumlah: number | null; keterangan: string }>({ method: 'POST', path: '/v1/notif/pita/perkiraan', body: { unit: d.unit ?? [], peran: d.peran ?? [], publik: d.publik, jenis: jenisLama(d.jenis) } }, { maxRetries: 0 })
        .then((r) => setPerkiraan(r.data))
        .catch(() => setPerkiraan(null));
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sasaranKunci, siakad]);

  /** Simpan; true bila berhasil. */
  const simpan = async (status: Draf['status']): Promise<boolean> => {
    setProses(true);
    setGalat({});
    try {
      const lama = jenisLama(d.jenis);
      const body = {
        judul: d.judul,
        isi: d.isi || null,
        tautan: d.tautan_ref ? null : d.tautan || null,
        tautan_ref: d.tautan_ref ? { jenis: d.tautan_ref.jenis, id: d.tautan_ref.id } : null,
        teks_tautan: d.teks_tautan || null,
        nada: d.nada,
        mode: d.mode,
        gambar: (d.mode === 'banner' || d.mode === 'popup') && d.opsi?.visual === 'gambar' ? d.gambar || null : null,
        opsi: opsiBersih(d.opsi, d.mode),
        prioritas: d.prioritas,
        dapat_ditutup: d.dapat_ditutup,
        mulai: d.mulai,
        selesai: d.selesai,
        status,
        aplikasi: d.aplikasi,
        unit: d.unit,
        peran: d.peran,
        publik: d.publik,
        jenis: lama.length ? lama : null,
      };
      const r = await siakad.request<PengumumanKelola>({ method: 'POST', path: ubahId ? `/v1/notif/pita/kelola/${ubahId}` : '/v1/notif/pita/kelola', body });
      invalidateSiakad('notif-pita');
      invalidateSiakad('notif-pita-kelola');
      toast.add({ type: 'success', title: status === 'terbit' ? (ubahId && awal?.status === 'terbit' ? 'Pengumuman disimpan' : 'Pengumuman diterbitkan') : 'Draf disimpan' });
      onSelesai?.(r.data);
      return true;
    } catch (e) {
      const det = (e as { details?: Record<string, string> }).details;
      if (det && typeof det === 'object') setGalat(det);
      toast.add({ type: 'error', title: 'Belum bisa disimpan', description: pesanGalat(e) });
      return false;
    } finally {
      setProses(false);
    }
  };

  return { hak, d, setD, ubah, galat, proses, perkiraan, simpan, berubah, ubahId };
}

type StateForm = ReturnType<typeof useFormPengumuman>;

/** Layar ponsel (< 640px): panel formulir dibuka layar penuh, bukan lembar bawah. */
function useLayarSempit() {
  const q = '(max-width: 639px)';
  const [v, setV] = React.useState(() => typeof window !== 'undefined' && window.matchMedia?.(q).matches);
  React.useEffect(() => {
    const m = window.matchMedia?.(q);
    if (!m) return;
    const f = () => setV(m.matches);
    f();
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return Boolean(v);
}

/** Pilih tautan "Selengkapnya" dari konten portal yang terbit; URL bebas hanya untuk pembuat tingkat universitas. */
function PilihTautan({ f }: { f: StateForm }) {
  const siakad = useSiakad();
  const { d, setD, galat, hak } = f;
  const manualBoleh = Boolean(hak.data?.tautan_manual);
  const [manual, setManual] = React.useState(() => Boolean(d.tautan) && !d.tautan_ref);
  const muat = React.useCallback(
    (q: string, signal: AbortSignal) => siakad.request<RujukanTautan[]>({ method: 'GET', path: '/v1/notif/pita/tautan', query: { q: q || undefined, per_page: 20 } }, { signal, maxRetries: 0 }).then((r) => r.data ?? []),
    [siakad],
  );
  const ref = d.tautan_ref;
  const pilih = (r: RujukanTautan | null) => setD((x) => ({ ...x, tautan_ref: r, tautan: '' }));

  if (manual) {
    return (
      <Field
        label="Tautan Selengkapnya"
        className="u-form-lebar"
        error={galat.tautan}
        description={
          <>
            {manualBoleh ? 'URL http(s) atau jalur diawali /.' : 'Tautan lama tetap dipakai.'}{' '}
            <button
              type="button"
              className="u-pgm-tautan-ganti"
              onClick={() => {
                setManual(false);
                if (!manualBoleh) setD((x) => ({ ...x, tautan: '' }));
              }}
            >
              Pilih dari konten portal
            </button>
          </>
        }
      >
        <InputGroup start={<Link2 />}>
          <Input value={d.tautan ?? ''} readOnly={!manualBoleh} onChange={(e) => setD((x) => ({ ...x, tautan: e.target.value, tautan_ref: null }))} placeholder="https://… atau /halaman" aria-label="URL tautan" />
        </InputGroup>
      </Field>
    );
  }
  const kePilihManual = manualBoleh ? (
    <button type="button" className="u-pgm-tautan-ganti" onClick={() => (setManual(true), pilih(null))}>
      Tautan lain (URL)
    </button>
  ) : null;
  return (
    <Field
      label="Tautan Selengkapnya"
      className="u-form-lebar"
      error={galat.tautan}
      description={
        <>
          {ref && ref.tersedia === false ? 'Konten yang dirujuk tidak terbit lagi: pengumuman tampil tanpa tautan sampai Anda memilih yang lain.' : 'Opsional. Berita, pengumuman, atau agenda portal yang terbit; alamatnya selalu mengikuti konten.'} {kePilihManual}
        </>
      }
    >
      <Combobox<RujukanTautan>
        loadItems={muat}
        value={ref}
        onValueChange={pilih}
        itemKey={(r) => `${r.jenis}:${r.id}`}
        itemToString={(r) => r.judul ?? `${JENIS_TAUTAN[r.jenis]} #${r.id}`}
        renderItem={(r) => (
          <span className="u-pgm-tautan-opsi">
            <strong>{r.judul}</strong>
            <small>{[JENIS_TAUTAN[r.jenis], r.situs_nama, tanggalSingkat(r.tanggal)].filter(Boolean).join(' · ')}</small>
          </span>
        )}
        icon={<Link2 />}
        placeholder="Cari judul berita, pengumuman, atau agenda…"
        emptyText="Tidak ada konten terbit yang cocok."
        aria-label="Tautan Selengkapnya"
      />
    </Field>
  );
}

/** Pilihan visual (bagian Tampilan): ikon dalam lingkaran, ilustrasi, gambar (banner/popup), atau tanpa. */
function PilihVisual({ f }: { f: StateForm }) {
  const { d, setD, galat } = f;
  const bergambar = d.mode === 'banner' || d.mode === 'popup';
  const visual = d.opsi?.visual ?? 'ikon';
  const efektif = visual === 'gambar' && !bergambar ? 'ikon' : visual;
  const ubahOpsi = (o: Partial<OpsiPengumuman>) => setD((x) => ({ ...x, opsi: { ...x.opsi, ...o } }));
  const keterangan: Record<ModePengumuman, string> = {
    popup: 'Tampil di tengah atas popup.',
    banner: 'Tampil di kiri banner (ilustrasi ukuran sedang).',
    toast: 'Toast memakai ikon atau ilustrasi kecil.',
    pita: 'Pita hanya menampilkan ikon kecil.',
    bawah: 'Bilah bawah hanya menampilkan ikon kecil.',
  };
  return (
    <>
      <Field label="Visual" description={keterangan[d.mode]} className="u-form-lebar">
        <SegmentedControl
          fullWidth
          value={efektif}
          onValueChange={(v) => ubahOpsi({ visual: v as VisualPengumuman, ...(v === 'ilustrasi' && !d.opsi?.ilustrasi ? { ilustrasi: ILUSTRASI_PENGUMUMAN[0]!.value } : {}) })}
          options={PILIHAN_VISUAL.filter((v) => v.value !== 'gambar' || bergambar).map((v) => ({ value: v.value, label: v.label }))}
          aria-label="Visual"
        />
      </Field>
      {efektif === 'ikon' && (
        <Field label="Ikon" description="Warna mengikuti nada." error={galat['opsi.ikon']} className="u-form-lebar">
          <div className="u-pgm-ikon-pilih" role="radiogroup" aria-label="Ikon" data-nada={d.nada}>
            <button type="button" role="radio" aria-checked={!d.opsi?.ikon} aria-label="Sesuai nada" title="Sesuai nada" data-aktif={!d.opsi?.ikon ? '' : undefined} onClick={() => ubahOpsi({ ikon: undefined })}>
              {IKON_NADA[d.nada]}
              <small>Nada</small>
            </button>
            {IKON_PENGUMUMAN.map((k) => (
              <button key={k.value} type="button" role="radio" aria-checked={d.opsi?.ikon === k.value} aria-label={k.label} title={k.label} data-aktif={d.opsi?.ikon === k.value ? '' : undefined} onClick={() => ubahOpsi({ ikon: k.value })}>
                {k.ikon}
              </button>
            ))}
          </div>
        </Field>
      )}
      {efektif === 'ilustrasi' && (
        <Field label="Ilustrasi" description="Warna mengikuti tema aplikasi." error={galat['opsi.ilustrasi']} className="u-form-lebar">
          <div className="u-pgm-ilus-pilih" role="radiogroup" aria-label="Ilustrasi">
            {ILUSTRASI_PENGUMUMAN.map((k) => {
              const aktif = (d.opsi?.ilustrasi ?? ILUSTRASI_PENGUMUMAN[0]!.value) === k.value;
              return (
                <button key={k.value} type="button" role="radio" aria-checked={aktif} data-aktif={aktif ? '' : undefined} onClick={() => ubahOpsi({ ilustrasi: k.value })}>
                  <Ilustrasi nama={k.value} lebar="100%" bergerak={false} />
                  <small>{k.label}</small>
                </button>
              );
            })}
          </div>
        </Field>
      )}
      {efektif === 'gambar' && (
        <Field label="URL gambar" description="Gambar publik http(s) atau jalur diawali /, mis. dari media portal. Rasio lebar (mis. 16:9) paling pas." error={galat.gambar} className="u-form-lebar">
          <InputGroup start={<Image />}>
            <Input value={d.gambar ?? ''} onChange={(e) => setD((x) => ({ ...x, gambar: e.target.value }))} placeholder="https://…" aria-label="URL gambar" />
          </InputGroup>
        </Field>
      )}
    </>
  );
}

/** Isian formulir pengumuman (bagian Isi, Tampilan + pratinjau, Sasaran, Jadwal) untuk panel atau halaman. */
function IsiFormPengumuman({ f }: { f: StateForm }) {
  const { hak, d, ubah, setD, galat, perkiraan } = f;
  const peranQ = useSiakadQuery<Array<{ kode: string; nama: string; aktif?: boolean }>>(['rbac-peran-pilih'], (s, signal) => s.request({ method: 'GET', path: '/v1/rbac/peran' }, { signal, maxRetries: 0 }), { staleTime: 600_000 });
  const unitData = useUnitOrganisasi();
  const unitTerbatas = hak.data && !hak.data.semua;
  const akun = hak.data?.peran_akun?.map((p) => ({ value: p.kode, label: p.nama })) ?? PERAN_AKUN;
  const peranOpsi = [
    ...akun.map((p) => ({ ...p, group: 'Jenis akun' })),
    // Peran RBAC dasar yang setara jenis akun disembunyikan (pakai "Jenis akun"), kecuali sudah terpilih.
    ...(peranQ.data ?? []).filter((p) => p.aktif !== false && (!PERAN_DASAR.includes(p.kode) || (d.peran ?? []).includes(p.kode))).map((p) => ({ value: p.kode, label: p.nama, group: 'Peran' })),
  ];
  const lama = jenisLama(d.jenis);
  const ref = d.tautan_ref;
  const contoh: PengumumanTayang = {
    id: 'pratinjau',
    judul: d.judul,
    isi: d.isi,
    tautan: ref ? (ref.tersedia === false ? null : (ref.url ?? '#')) : d.tautan,
    teks_tautan: d.teks_tautan || null,
    nada: d.nada,
    mode: d.mode,
    gambar: d.gambar || null,
    opsi: d.opsi,
    dapat_ditutup: d.dapat_ditutup,
  };

  if (hak.error) return <GalatApi error={hak.error} onRetry={hak.refetch} />;

  return (
    <div
      className="u-pgm-form"
      onKeyDown={(e) => {
        // Enter di isian tidak langsung menerbitkan (Ctrl/⌘+Enter tetap menyimpan).
        const t = e.target as HTMLElement;
        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && t.tagName === 'INPUT') e.preventDefault();
      }}
    >
      <BagianForm judul="Isi" keterangan="Judul singkat dan keterangan yang dibaca pengguna." ikon={<Type />} kolom={1} className="u-pgm-bag-isi">
        <Field label="Judul" error={galat.judul} className="u-form-lebar">
          <Input value={d.judul} maxLength={200} onChange={(e) => ubah('judul', e.target.value)} placeholder="Mis. Pemeliharaan server SIAKAD Sabtu malam" />
        </Field>
        <Field label="Keterangan singkat" description="Opsional, maksimal 500 karakter." error={galat.isi} className="u-form-lebar">
          <Textarea rows={2} maxLength={500} value={d.isi ?? ''} onChange={(e) => ubah('isi', e.target.value)} />
        </Field>
        <PilihTautan f={f} />
        {(ref || d.tautan) && (
          <Field label="Teks tautan" className="u-form-lebar">
            <Input value={d.teks_tautan ?? ''} maxLength={60} onChange={(e) => ubah('teks_tautan', e.target.value)} placeholder="Selengkapnya" />
          </Field>
        )}
      </BagianForm>

      <BagianForm judul="Tampilan" keterangan="Cara pengumuman muncul di aplikasi sasaran." ikon={<LayoutPanelTop />} kolom={1} className="u-pgm-bag-tampilan">
        <Field label="Cara tampil" className="u-form-lebar">
          <div className="u-pgm-mode" role="radiogroup" aria-label="Cara tampil">
            {PILIHAN_MODE.map((m) => (
              <button key={m.value} type="button" role="radio" aria-checked={d.mode === m.value} className="u-pgm-mode-pil" data-aktif={d.mode === m.value ? '' : undefined} onClick={() => ubah('mode', m.value)}>
                {m.ikon}
                <strong>{m.label}</strong>
                <small>{m.keterangan}</small>
              </button>
            ))}
          </div>
        </Field>
        <Field label="Nada" className="u-form-lebar">
          <Select value={d.nada} onValueChange={(v) => v && ubah('nada', v as NadaPengumuman)} options={PILIHAN_NADA.map((n) => ({ ...n, icon: <span className="u-pgm-nada-ikon" data-nada={n.value}>{IKON_NADA[n.value]}</span> }))} aria-label="Nada" />
        </Field>
        <PilihVisual f={f} />
        {d.mode === 'popup' && (
          <Field label="Tampilkan popup" className="u-form-lebar">
            <SegmentedControl
              fullWidth
              value={d.opsi?.ulang ?? 'sekali'}
              onValueChange={(v) => ubah('opsi', { ...d.opsi, ulang: v as 'sekali' | 'sesi' })}
              options={[
                { value: 'sekali', label: 'Sekali per akun' },
                { value: 'sesi', label: 'Setiap membuka aplikasi' },
              ]}
              aria-label="Ulang popup"
            />
          </Field>
        )}
        {d.mode === 'toast' && (
          <Field label="Hilang otomatis" description="Detik; 0 = tetap sampai ditutup." className="u-form-lebar">
            <IsianAngka value={keAngka(d.opsi?.hilang_detik ?? 0)} min={0} max={120} onValueChange={(n) => ubah('opsi', { ...d.opsi, hilang_detik: n || undefined })} />
          </Field>
        )}
        <label className="u-pgm-saklar u-form-lebar">
          <span>
            <strong>Bisa ditutup pengguna</strong>
            <small>Pengumuman yang ditutup tidak tampil lagi untuk akun itu di semua aplikasi.</small>
          </span>
          <Switch checked={d.dapat_ditutup} onCheckedChange={(v) => ubah('dapat_ditutup', v)} />
        </label>
      </BagianForm>

      <aside className="u-pgm-form-pratinjau" aria-label="Pratinjau">
        <div className="u-pgm-form-pratinjau-kepala">
          <span className="u-label">Pratinjau</span>
          <Badge variant="neutral">
            {PILIHAN_MODE.find((m) => m.value === d.mode)?.ikon} {PILIHAN_MODE.find((m) => m.value === d.mode)?.label}
          </Badge>
        </div>
        <PratinjauPengumuman p={contoh} />
        {ref && (
          <p className="u-pgm-pratinjau-tautan">
            <Link2 aria-hidden />
            <span>
              {ref.tersedia === false ? 'Konten tidak terbit lagi' : ref.judul}
              <small>{[JENIS_TAUTAN[ref.jenis], ref.situs_nama].filter(Boolean).join(' · ')}</small>
            </span>
            {ref.url && ref.tersedia !== false && (
              <a href={ref.url} target="_blank" rel="noreferrer" aria-label="Buka konten di tab baru">
                <ExternalLink />
              </a>
            )}
          </p>
        )}
      </aside>

      <BagianForm judul="Sasaran" keterangan="Kosong = semua pengguna yang masuk di semua aplikasi." ikon={<Users />} kolom={1} className="u-pgm-bag-sasaran">
        <Field label="Aplikasi" description="Kosong = semua aplikasi, termasuk SIAKAD lama." className="u-form-lebar">
          <PilihanBanyak options={APLIKASI_PENGUMUMAN} value={d.aplikasi ?? []} onValueChange={(v) => ubah('aplikasi', v.length ? v : null)} placeholder="Semua aplikasi" aria-label="Aplikasi sasaran" />
        </Field>
        <Field
          label="Unit"
          className="u-form-lebar"
          description={unitTerbatas ? `Anda hanya bisa menyasar unit Anda: ${(hak.data?.unit ?? []).map((u) => u.nama).join(', ')} (dan unit di bawahnya).` : 'Kosong = semua unit. Unit mencakup unit di bawahnya (fakultas → prodi).'}
          error={galat.unit}
        >
          <PilihUnit
            multiple
            value={(d.unit ?? []).map((x) => String(unitData.data?.find((u) => u.kode === x || String(u.id) === x)?.id ?? x))}
            onValueChange={(_, units) => ubah('unit', units.length ? units.map((u) => u.kode || String(u.id)) : null)}
            akar={unitTerbatas ? (hak.data?.unit ?? []).map((u) => u.id) : null}
            placeholder="Semua unit"
            aria-label="Unit sasaran"
            invalid={Boolean(galat.unit)}
          />
        </Field>
        <Field label="Peran" description="Jenis akun (mahasiswa, dosen, tendik, alumni, pendaftar PMB) atau peran RBAC. Beberapa pilihan = salah satu cocok. Kosong = semua." error={galat.peran} className="u-form-lebar">
          <PilihanBanyak options={peranOpsi} value={d.peran ?? []} onValueChange={(v) => ubah('peran', v.length ? v : null)} placeholder="Semua peran" aria-label="Peran sasaran" />
        </Field>
        {lama.length > 0 && (
          <Alert variant="warning" className="u-form-lebar" title="Sasaran lama">
            Pengumuman ini masih dibatasi jenis pengguna {lama.map((j) => PERAN_AKUN.find((p) => p.value === `akun:${j}`)?.label ?? j).join(', ')} (berlaku bersama peran di atas).{' '}
            <Button size="sm" variant="link" type="button" onClick={() => setD((x) => ({ ...x, jenis: x.publik ? ['publik'] : null, peran: [...new Set([...(x.peran ?? []), ...lama.map((j) => `akun:${j}`)])] }))}>
              Pindahkan ke peran
            </Button>
          </Alert>
        )}
        {hak.data?.publik && (
          <label className="u-pgm-saklar u-form-lebar">
            <span>
              <strong>
                <Globe aria-hidden /> Tampilkan untuk publik (tanpa login)
              </strong>
              <small>{unitTerbatas ? 'Hanya di situs portal unit Anda (bukan portal universitas atau situs unit lain).' : 'Di portal universitas dan semua situs, selain untuk pengguna yang masuk.'}</small>
            </span>
            <Switch checked={d.publik} onCheckedChange={(v) => ubah('publik', v)} aria-label="Tampilkan untuk publik" />
          </label>
        )}
        {(galat.publik || galat.jenis) && <p className="u-pgm-galat u-form-lebar">{galat.publik ?? galat.jenis}</p>}
        {perkiraan && (
          <p className="u-pgm-perkiraan u-form-lebar">
            <Eye aria-hidden /> {perkiraan.jumlah == null ? perkiraan.keterangan : <span>Sekitar <strong>{perkiraan.jumlah.toLocaleString('id-ID')}</strong> akun. <small>{perkiraan.keterangan}</small></span>}
          </p>
        )}
      </BagianForm>

      <BagianForm judul="Jadwal" keterangan="Kapan pengumuman tayang dan urutannya." ikon={<CalendarClock />} kolom={2} className="u-pgm-bag-jadwal">
        <Field label="Mulai tayang" description="Kosong = sekarang." error={galat.mulai}>
          <IsianTanggalWaktu value={keInputWaktu(d.mulai) || null} onValueChange={(v) => ubah('mulai', dariInputWaktu(v ?? ''))} />
        </Field>
        <Field label="Selesai" description="Kosong = sampai diarsipkan." error={galat.selesai}>
          <IsianTanggalWaktu value={keInputWaktu(d.selesai) || null} onValueChange={(v) => ubah('selesai', dariInputWaktu(v ?? ''))} />
        </Field>
        <Field label="Prioritas" description="Lebih tinggi tampil lebih dulu (pita berganti, popup antre)." className="u-form-lebar">
          <Select value={String(d.prioritas ?? 0)} onValueChange={(v) => v != null && ubah('prioritas', Number(v))} options={[{ value: '0', label: 'Normal' }, { value: '10', label: 'Tinggi' }, { value: '50', label: 'Paling atas' }]} aria-label="Prioritas" />
        </Field>
      </BagianForm>
    </div>
  );
}

export interface FormPengumumanProps {
  /** Pengumuman yang diubah; kosong = buat baru. */
  awal?: PengumumanKelola | null;
  /** true = buat salinan `awal` sebagai draf baru (Duplikat). */
  salin?: boolean;
  /** Sasaran aplikasi bawaan untuk pengumuman baru (mis. aplikasi tempat formulir dibuka). */
  aplikasiBawaan?: string[] | null;
  onSelesai?: (p: PengumumanKelola) => void;
  onBatal?: () => void;
}

/**
 * Formulir pengumuman di halaman sendiri (tanpa panel): isi, tampilan dengan pratinjau langsung, sasaran (aplikasi,
 * unit, peran termasuk jenis akun, saklar publik) beserta perkiraan penerima, dan jadwal. Untuk panel samping pakai
 * {@link PanelPengumuman}.
 */
export function FormPengumuman({ awal, salin, aplikasiBawaan, onSelesai, onBatal }: FormPengumumanProps) {
  const f = useFormPengumuman({ awal, salin, aplikasiBawaan, onSelesai });
  return (
    <div className="u-pgm-form-halaman">
      <IsiFormPengumuman f={f} />
      <div className="u-pgm-form-aksi">
        {onBatal && (
          <Button variant="ghost" onClick={onBatal} disabled={f.proses}>
            Batal
          </Button>
        )}
        <Button variant="outline" onClick={() => void f.simpan('draf')} loading={f.proses} disabled={!f.d.judul.trim()}>
          Simpan draf
        </Button>
        <Button onClick={() => void f.simpan('terbit')} loading={f.proses} disabled={!f.d.judul.trim()}>
          <BellRing /> {f.ubahId && awal?.status === 'terbit' ? 'Simpan' : 'Terbitkan'}
        </Button>
      </div>
    </div>
  );
}

export interface PanelPengumumanProps extends Omit<FormPengumumanProps, 'onBatal'> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Buat/ubah pengumuman di panel samping (layar penuh di ponsel): kepala panel, isi bergulir per bagian dengan
 * pratinjau yang menempel, kaki panel Batal/Simpan draf/Terbitkan, dan konfirmasi bila perubahan belum disimpan.
 */
export function PanelPengumuman({ open, onOpenChange, awal, salin, aplikasiBawaan, onSelesai }: PanelPengumumanProps) {
  const f = useFormPengumuman({ awal, salin, aplikasiBawaan, onSelesai });
  const sempit = useLayarSempit();
  const ubahTerbit = Boolean(f.ubahId && awal?.status === 'terbit');
  return (
    <PanelForm
      open={open}
      onOpenChange={onOpenChange}
      title={salin ? 'Duplikat pengumuman' : awal ? 'Ubah pengumuman' : 'Buat pengumuman'}
      description={salin ? 'Salinan disimpan sebagai pengumuman baru.' : undefined}
      size={sempit ? 'full' : 'xl'}
      className="u-pgm-panel"
      berubah={f.berubah}
      disabled={!f.d.judul.trim() || f.proses}
      labelSimpan={
        <>
          <BellRing /> {ubahTerbit ? 'Simpan' : 'Terbitkan'}
        </>
      }
      onSimpan={async () => ((await f.simpan('terbit')) ? undefined : false)}
      aksiTambahan={
        <Button variant="outline" type="button" loading={f.proses} disabled={!f.d.judul.trim()} onClick={async () => (await f.simpan('draf')) && onOpenChange(false)}>
          {ubahTerbit ? 'Jadikan draf' : 'Simpan draf'}
        </Button>
      }
    >
      <IsiFormPengumuman f={f} />
    </PanelForm>
  );
}

// ---------------------------------------------------------------- halaman kelola

type Tab = 'semua' | PengumumanKelola['tayang'];

const LABEL_TAYANG: Record<PengumumanKelola['tayang'], { label: string; variant: 'success' | 'info' | 'neutral' | 'warning' }> = {
  aktif: { label: 'Aktif', variant: 'success' },
  terjadwal: { label: 'Terjadwal', variant: 'info' },
  draf: { label: 'Draf', variant: 'warning' },
  berakhir: { label: 'Berakhir', variant: 'neutral' },
  arsip: { label: 'Diarsipkan', variant: 'neutral' },
};

const TAB: Array<{ value: Tab; label: string; kosong: string }> = [
  { value: 'semua', label: 'Semua', kosong: 'Belum ada pengumuman' },
  { value: 'aktif', label: 'Aktif', kosong: 'Tidak ada yang sedang tayang' },
  { value: 'terjadwal', label: 'Terjadwal', kosong: 'Belum ada yang terjadwal' },
  { value: 'draf', label: 'Draf', kosong: 'Tidak ada draf' },
  { value: 'berakhir', label: 'Berakhir', kosong: 'Belum ada yang berakhir' },
  { value: 'arsip', label: 'Arsip', kosong: 'Arsip kosong' },
];

const tanggalSingkat = (v?: string | null) => (v ? new Date(v.replace(' ', 'T')).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null);
const waktuSingkat = (v?: string | null) => (v ? new Date(v.replace(' ', 'T')).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null);

function labelPeran(k: string, rbac: Array<{ kode: string; nama: string }> | undefined) {
  return PERAN_AKUN.find((p) => p.value === k)?.label ?? rbac?.find((p) => p.kode === k)?.nama ?? k;
}

/** Ringkasan sasaran satu baris: aplikasi · peran/jenis · unit · publik. */
function ringkasSasaran(p: PengumumanKelola, rbac?: Array<{ kode: string; nama: string }>): string {
  const app = p.aplikasi ? (p.aplikasi.length > 2 ? `${p.aplikasi.length} aplikasi` : p.aplikasi.map((a) => APLIKASI_PENGUMUMAN.find((x) => x.value === a)?.label ?? a).join(', ')) : 'Semua aplikasi';
  const lama = jenisLama(p.jenis).map((j) => PERAN_AKUN.find((x) => x.value === `akun:${j}`)?.label ?? j);
  const peran = [...lama, ...(p.peran ?? []).map((k) => labelPeran(k, rbac))];
  const siapa = peran.length ? (peran.length > 3 ? `${peran.slice(0, 3).join(', ')} +${peran.length - 3}` : peran.join(', ')) : 'semua pengguna';
  const unit = p.unit ? (p.unit.length > 2 ? `${p.unit.length} unit` : `unit ${p.unit.join(', ')}`) : null;
  const publik = p.publik ?? (p.jenis ?? []).includes('publik');
  return [app, siapa, unit, publik ? 'publik' : null].filter(Boolean).join(' · ');
}

function jadwal(p: PengumumanKelola) {
  const m = waktuSingkat(p.mulai);
  const s = waktuSingkat(p.selesai);
  if (!m && !s) return 'Tanpa batas waktu';
  return `${m ?? 'Sejak terbit'} – ${s ?? 'tanpa batas'}`;
}

export interface KelolaPengumumanProps {
  /** Aplikasi tempat halaman dibuka (sasaran bawaan pengumuman baru). Kosong = semua aplikasi. */
  aplikasi?: string;
  className?: string;
}

/**
 * Halaman kelola pengumuman lintas aplikasi: ringkasan yang sedang tayang, tab status (aktif, terjadwal, draf,
 * berakhir, arsip) dengan pencarian dan saring cara tampil, daftar rata kiri dengan aksi per baris (ubah, pratinjau,
 * duplikat, arsipkan/pulihkan, hapus), serta buat/ubah di {@link PanelPengumuman}. Hak mengikuti /v1/notif/pita/hak.
 */
export function KelolaPengumuman({ aplikasi, className }: KelolaPengumumanProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useSiakadQuery<PengumumanKelola[]>(['notif-pita-kelola'], (s, signal) => s.request<PengumumanKelola[]>({ method: 'GET', path: '/v1/notif/pita/kelola' }, { signal }));
  const peranQ = useSiakadQuery<Array<{ kode: string; nama: string }>>(['rbac-peran-pilih'], (s, signal) => s.request({ method: 'GET', path: '/v1/rbac/peran' }, { signal, maxRetries: 0 }), { staleTime: 600_000 });
  const [tab, setTab] = React.useState<Tab>('semua');
  const [cari, setCari] = React.useState('');
  const [mode, setMode] = React.useState<'semua' | ModePengumuman>('semua');
  const [panel, setPanel] = React.useState<{ awal: PengumumanKelola | null; salin?: boolean; kunci: number } | null>(null);
  const [panelBuka, setPanelBuka] = React.useState(false);
  const [lihat, setLihat] = React.useState<PengumumanKelola | null>(null);
  const [hapus, setHapus] = React.useState<PengumumanKelola | null>(null);
  const data = q.data ?? [];
  const kata = cari.trim().toLowerCase();
  const saring = data.filter((p) => (mode === 'semua' || p.mode === mode) && (!kata || `${p.judul} ${p.isi ?? ''}`.toLowerCase().includes(kata)));
  const tampil = tab === 'semua' ? saring : saring.filter((p) => p.tayang === tab);
  const hitung = (t: Tab) => (t === 'semua' ? saring.length : saring.filter((p) => p.tayang === t).length);
  const tayang = data.filter((p) => p.tayang === 'aktif');
  const berikut = data.filter((p) => p.tayang === 'terjadwal').sort((a, b) => String(a.mulai).localeCompare(String(b.mulai)))[0];

  const buka = (awal: PengumumanKelola | null, salin?: boolean) => {
    setPanel({ awal, salin, kunci: Date.now() });
    setPanelBuka(true);
  };
  const segarkan = () => {
    invalidateSiakad('notif-pita');
    invalidateSiakad('notif-pita-kelola');
  };
  const arsipkan = async (p: PengumumanKelola) => {
    const pulih = p.status === 'arsip';
    try {
      await siakad.request({ method: 'POST', path: `/v1/notif/pita/kelola/${p.id}`, body: { status: pulih ? 'draf' : 'arsip' } });
      segarkan();
      toast.add({ type: 'success', title: pulih ? 'Dipulihkan sebagai draf' : 'Diarsipkan', description: pulih ? 'Terbitkan lagi dari panel Ubah bila sudah siap.' : 'Tidak tayang lagi; pulihkan dari tab Arsip.' });
    } catch (e) {
      toast.add({ type: 'error', title: 'Gagal', description: pesanGalat(e) });
    }
  };

  const menu = (p: PengumumanKelola): MenuEntry[] => [
    { label: 'Ubah', icon: <Pencil />, onSelect: () => buka(p) },
    { label: 'Pratinjau', icon: <Eye />, onSelect: () => setLihat(p) },
    { label: 'Duplikat', icon: <Copy />, onSelect: () => buka(p, true) },
    p.status === 'arsip' ? { label: 'Pulihkan', icon: <ArchiveRestore />, onSelect: () => void arsipkan(p) } : { label: 'Arsipkan', icon: <Archive />, onSelect: () => void arsipkan(p) },
    { type: 'separator' },
    { label: 'Hapus', icon: <Trash2 />, destructive: true, onSelect: () => setHapus(p) },
  ];

  return (
    <div className={cn('u-pgm-kelola', className)}>
      <div className="u-pgm-kelola-alat">
        <InputGroup start={<Search />} className="u-pgm-kelola-cari">
          <Input type="search" value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari judul atau isi" aria-label="Cari pengumuman" />
        </InputGroup>
        <Select
          className="u-pgm-kelola-mode"
          value={mode}
          onValueChange={(v) => setMode((v ?? 'semua') as typeof mode)}
          options={[{ value: 'semua', label: 'Semua cara tampil' }, ...PILIHAN_MODE.map((m) => ({ value: m.value, label: m.label, icon: m.ikon }))]}
          aria-label="Saring cara tampil"
        />
        <Button onClick={() => buka(null)} className="u-pgm-kelola-buat">
          <Plus /> Buat pengumuman
        </Button>
      </div>

      {data.length > 0 && (
        <section className="u-pgm-tayang" aria-label="Sedang tayang">
          <span className="u-pgm-tayang-kepala" data-ada={tayang.length ? '' : undefined}>
            <CircleDot aria-hidden /> {tayang.length ? `Sedang tayang (${tayang.length})` : 'Tidak ada yang tayang sekarang'}
          </span>
          {tayang.length > 0 ? (
            <div className="u-pgm-tayang-daftar">
              {tayang.slice(0, 6).map((p) => (
                <button key={p.id} type="button" className="u-pgm-tayang-item" data-nada={p.nada} onClick={() => setLihat(p)} title="Pratinjau">
                  {PILIHAN_MODE.find((m) => m.value === p.mode)?.ikon}
                  <span>{p.judul}</span>
                  <small>{p.selesai ? `s.d. ${waktuSingkat(p.selesai)}` : 'tanpa batas'}</small>
                </button>
              ))}
            </div>
          ) : berikut ? (
            <span className="u-pgm-tayang-berikut">
              Berikutnya: <strong>{berikut.judul}</strong>, {waktuSingkat(berikut.mulai)}
            </span>
          ) : null}
        </section>
      )}

      <Tabs<Tab> items={TAB.map((t) => ({ value: t.value, label: t.label, count: hitung(t.value) }))} value={tab} onValueChange={setTab} aria-label="Saring status" className="u-pgm-kelola-tab" />

      {q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : q.loading && !q.data ? (
        <div className="u-pgm-daftar">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={76} />
          ))}
        </div>
      ) : tampil.length === 0 ? (
        <Empty
          bordered
          icon={<Megaphone />}
          title={data.length === 0 ? 'Belum ada pengumuman' : kata || mode !== 'semua' ? 'Tidak ada yang cocok' : (TAB.find((t) => t.value === tab)?.kosong ?? 'Kosong')}
          description={data.length === 0 ? 'Pengumuman tampil di aplikasi sasaran sebagai pita, banner, popup, toast, atau bilah bawah.' : kata || mode !== 'semua' ? 'Ubah kata kunci atau saringan cara tampil.' : undefined}
          actions={
            data.length === 0 ? (
              <Button onClick={() => buka(null)}>
                <Plus /> Buat pengumuman
              </Button>
            ) : kata || mode !== 'semua' ? (
              <Button variant="outline" onClick={() => (setCari(''), setMode('semua'))}>
                Hapus saringan
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="u-pgm-daftar" aria-label="Daftar pengumuman">
          {tampil.map((p) => {
            const t = LABEL_TAYANG[p.tayang];
            const m = PILIHAN_MODE.find((x) => x.value === p.mode);
            return (
              <li key={p.id} className="u-pgm-item" data-nada={p.nada} data-tayang={p.tayang}>
                <span className="u-pgm-ikon" aria-hidden>
                  {ikonPengumuman(p)}
                </span>
                <div className="u-pgm-item-isi">
                  <div className="u-pgm-item-judul">
                    <button type="button" className="u-pgm-item-buka" onClick={() => buka(p)}>
                      {p.judul}
                    </button>
                    <Badge variant={t.variant} dot={p.tayang === 'aktif'}>
                      {t.label}
                    </Badge>
                    <Badge variant="neutral" className="u-pgm-item-mode">
                      {m?.ikon} {m?.label}
                    </Badge>
                  </div>
                  {p.isi && <p className="u-pgm-item-ringkas">{p.isi}</p>}
                  <div className="u-pgm-item-meta">
                    <span>
                      <CalendarClock aria-hidden /> {jadwal(p)}
                    </span>
                    <span>
                      <Users aria-hidden /> {ringkasSasaran(p, peranQ.data)}
                    </span>
                    {(p.unit_pemilik || p.dibuat_oleh) && (
                      <span>
                        <Building2 aria-hidden /> {[p.unit_pemilik_nama ?? p.unit_pemilik, p.dibuat_oleh].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="u-pgm-item-aksi">
                  <Tooltip content="Ubah">
                    <Button size="sm" variant="ghost" iconOnly aria-label={`Ubah ${p.judul}`} onClick={() => buka(p)} className="u-pgm-item-aksi-lebar">
                      <Pencil />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Pratinjau">
                    <Button size="sm" variant="ghost" iconOnly aria-label={`Pratinjau ${p.judul}`} onClick={() => setLihat(p)} className="u-pgm-item-aksi-lebar">
                      <Eye />
                    </Button>
                  </Tooltip>
                  <Menu
                    items={menu(p)}
                    trigger={
                      <Button size="sm" variant="ghost" iconOnly aria-label={`Aksi lain untuk ${p.judul}`}>
                        <EllipsisVertical />
                      </Button>
                    }
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {panel && (
        <PanelPengumuman
          key={panel.kunci}
          open={panelBuka}
          onOpenChange={setPanelBuka}
          awal={panel.awal}
          salin={panel.salin}
          aplikasiBawaan={aplikasi ? [aplikasi] : null}
          onSelesai={() => (setPanelBuka(false), segarkan())}
        />
      )}
      <Dialog open={Boolean(lihat)} onOpenChange={(o) => !o && setLihat(null)} title={lihat?.judul ?? 'Pratinjau'} description={lihat ? `${PILIHAN_MODE.find((m) => m.value === lihat.mode)?.label} · ${ringkasSasaran(lihat, peranQ.data)}` : undefined} size="md">
        {lihat && <PratinjauPengumuman p={lihat} />}
      </Dialog>
      <ConfirmDialog
        open={Boolean(hapus)}
        onOpenChange={(o) => !o && setHapus(null)}
        title="Hapus pengumuman ini?"
        description="Pengumuman langsung hilang dari semua aplikasi dan dari daftar ini. Untuk menyimpannya, arsipkan saja."
        confirmLabel="Hapus"
        tone="danger"
        onConfirm={async () => {
          if (!hapus) return;
          try {
            await siakad.request({ method: 'POST', path: `/v1/notif/pita/kelola/${hapus.id}/hapus`, body: {} });
            segarkan();
            toast.add({ type: 'success', title: 'Pengumuman dihapus' });
          } catch (e) {
            toast.add({ type: 'error', title: 'Gagal menghapus', description: pesanGalat(e) });
          }
          setHapus(null);
        }}
      />
    </div>
  );
}
