'use client';
import * as React from 'react';
import type { Siakad } from 'unipo-siakad-sdk';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  Check,
  CheckCheck,
  CircleCheck,
  CircleX,
  ClipboardList,
  Clock,
  Cloud,
  CloudOff,
  Copy,
  ExternalLink,
  FileQuestion,
  FileText,
  Flag,
  GraduationCap,
  Info,
  KeyRound,
  LayoutGrid,
  Link2,
  ListChecks,
  Lock,
  MapPin,
  Megaphone,
  MessageSquare,
  MessagesSquare,
  Paperclip,
  PlayCircle,
  Plus,
  RefreshCw,
  Reply,
  RotateCcw,
  Search,
  Send,
  Star,
  Timer,
  Upload,
  UserCheck,
  Users,
  Video,
  X,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { formatBytes, formatDate, formatNumber, formatRelative, formatTime } from '../lib/format';
import { Badge, Button, Skeleton, type BadgeVariant } from '../components/actions';
import { Accordion, Alert, Avatar, DescriptionList, Empty, Pagination, Progress, ProgressRing, Tabs, type TabItem } from '../components/display';
import { Field, Input, InputGroup, SegmentedControl, Textarea } from '../components/forms';
import { ConfirmDialog, Dialog, Sheet, useToast } from '../components/overlays';
import { Dropzone } from '../components/calendar';
import { FilterBar, type FilterValues } from '../components/filter';
import { StatCard, StatGrid } from '../components/charts';
import { KodeLaporan } from '../components/galat';
import { invalidateSiakad, pesanGalat, useOptionalSiakad, useSiakadQuery, type QueryState } from './provider';
import { NavigasiSoal, SoalCbt, TimerUjian, type JawabanCbt, type SoalCbtData } from './cbt';
import { HADIR_MIN_BAWAAN, SampulKelas, nadaNilaiLms, namaKelasRapiLms, sisaTenggat, type KelasLms } from './lms';
import { KalenderAkademik } from './kalender';
import type { CalendarEvent } from '../components/schedule';
import { PenandaKurikulum, SiapkanKelasDariRps } from './kurikulum-aturan';
import { TombolPilihBerkas } from '../components/pilih-berkas-lokal';

/*
 * Komponen belajar LMS (/v1/lms) untuk mahasiswa e-learning: isi kelas per pertemuan, materi (bacaan, berkas, video,
 * tautan, kelas daring Zoom/Google Meet), tugas dan pengumpulannya, kuis (ruang kuis memakai SoalCbt/NavigasiSoal/TimerUjian),
 * forum diskusi bertingkat, presensi dengan kode, buku nilai, peserta, notifikasi, dan katalog kelas terbuka.
 *
 * Semua tautan memakai `href` biasa. Rute bawaan (/kelas/:id, /materi/:id, ...) bisa diganti lewat <LmsRuteProvider>.
 * Berkas /v1/lms/file/... dibuka lewat alamat SDK (mis. BFF /bff/api), jadi ikut sesi pengguna.
 */

// ================================================================ Tipe

export interface FileLms {
  id?: number;
  uuid?: string;
  nama: string;
  mime?: string | null;
  ukuran?: number | null;
  url?: string | null;
}
export interface ProgresItemLms {
  dilihat_at?: string | null;
  selesai_at?: string | null;
}
export type JenisMateriLms = 'teks' | 'berkas' | 'video' | 'tautan' | 'konferensi' | string;
export interface MateriLms {
  id: number;
  kelas_id: number;
  topik_id: number | null;
  jenis: JenisMateriLms;
  judul: string;
  konten?: string | null;
  url?: string | null;
  mulai?: string | null;
  selesai?: string | null;
  wajib_selesai?: boolean;
  lampiran?: FileLms[];
  progres?: ProgresItemLms | null;
}
export interface RubrikLms {
  kriteria: string;
  deskripsi?: string | null;
  skor_maks: number;
}
export type StatusJawabanLms = 'draf' | 'dikumpulkan' | 'dinilai' | 'dikembalikan';
export interface JawabanTugasLms {
  id?: number;
  tugas_id?: number;
  teks?: string | null;
  status: StatusJawabanLms | string;
  dikumpulkan_at?: string | null;
  terlambat?: boolean;
  nilai?: number | null;
  nilai_rubrik?: Record<string, number> | null;
  umpan_balik?: string | null;
  dinilai_at?: string | null;
  lampiran?: FileLms[];
}
export interface TugasLms {
  id: number;
  kelas_id: number;
  topik_id?: number | null;
  judul: string;
  instruksi?: string | null;
  jenis_pengumpulan?: 'file' | 'teks' | 'keduanya' | 'luring' | string;
  maks_file?: number;
  ekstensi?: string[] | null;
  mulai?: string | null;
  tenggat?: string | null;
  batas_akhir?: string | null;
  terima_terlambat?: boolean;
  nilai_maks?: number;
  rubrik?: RubrikLms[] | null;
  lampiran?: FileLms[];
  jawaban_saya?: (Partial<JawabanTugasLms> & { status: string }) | null;
}
export interface PercobaanKuis {
  id: number;
  kuis_id?: number;
  judul?: string;
  percobaan_ke: number;
  status: 'berlangsung' | 'selesai' | string;
  mulai_at?: string;
  selesai_at?: string | null;
  batas_at?: string | null;
  sisa_detik?: number | null;
  skor?: number | null;
  skor_maks?: number | null;
  nilai?: number | null;
  perlu_koreksi?: boolean;
  hasil_terbuka?: boolean;
  soal?: SoalKuisLms[];
}
export interface SoalKuisLms extends Omit<SoalCbtData, 'ragu' | 'poin'> {
  poin?: number | null;
  poin_maks?: number;
  lampiran?: FileLms[];
  benar?: boolean | null;
  kunci?: unknown;
  umpan_balik?: string | null;
  pembahasan?: string | null;
}
export interface KuisLms {
  id: number;
  kelas_id: number;
  topik_id?: number | null;
  judul: string;
  deskripsi?: string | null;
  mulai?: string | null;
  selesai?: string | null;
  durasi_menit?: number | null;
  maks_percobaan?: number | null;
  metode_nilai?: 'tertinggi' | 'terakhir' | 'pertama' | 'rata_rata' | string;
  tampil_hasil?: 'segera' | 'setelah_tutup' | 'manual' | string;
  nilai_maks?: number;
  berkata_sandi?: boolean;
  jumlah_soal?: number;
  percobaan_saya?: Array<Pick<PercobaanKuis, 'nilai' | 'status'>> | null;
}
export interface ForumLms {
  id: number;
  kelas_id: number;
  jenis: 'pengumuman' | 'diskusi' | string;
  judul: string;
  deskripsi?: string | null;
  terkunci?: boolean;
  jumlah_utas?: number;
  post_terakhir?: string | null;
}
export interface PostForumLms {
  id: number;
  induk_id?: number | null;
  judul?: string | null;
  isi: string;
  disematkan?: boolean;
  diedit?: boolean;
  penulis?: { username?: string; nama?: string | null; level?: string | null; foto?: string | null } | null;
  jumlah_balasan?: number | null;
  lampiran?: FileLms[] | null;
  created_at?: string | null;
  balasan?: PostForumLms[];
}
export interface UtasLms {
  forum: ForumLms;
  utas: PostForumLms;
  balasan: PostForumLms[];
}
export interface SesiPresensiLms {
  id: number;
  topik_id?: number | null;
  pertemuan_ke: number;
  tanggal: string;
  jam_mulai?: string | null;
  jam_selesai?: string | null;
  metode?: 'kode' | 'manual' | string;
  bahasan?: string | null;
  terbuka?: boolean;
  dibuka_at?: string | null;
  ditutup_at?: string | null;
  presensi_saya?: { status: 'H' | 'I' | 'S' | 'A' | string; waktu?: string | null } | null;
}
export interface PresensiKelasData {
  sesi: SesiPresensiLms[];
  rekap: { H: number; I: number; S: number; A: number; belum: number; persen_hadir: number } | null;
}
export type ItemTopikLms = (
  | ({ tipe: 'materi' } & MateriLms)
  | ({ tipe: 'tugas' } & TugasLms)
  | ({ tipe: 'kuis' } & KuisLms)
  | { tipe: 'forum'; id: number; judul: string; jenis?: string | null; jumlah_utas?: number | null }
) & { progres?: ProgresItemLms | null };
export interface TopikLms {
  id: number;
  judul: string;
  deskripsi?: string | null;
  pertemuan_ke?: number | null;
  tanggal?: string | null;
  urutan?: number;
  item?: ItemTopikLms[];
  presensi?: SesiPresensiLms[];
}
export interface KontenKelasData {
  kelas: KelasLms;
  peran: string;
  umum: { id: null; judul: string; item: ItemTopikLms[]; presensi?: SesiPresensiLms[] };
  topik: TopikLms[];
}
export interface JadwalKelasLms {
  idj: number;
  hari: string;
  jamke?: number;
  /** Jam mulai/selesai (HH:MM:SS) dan nama ruang; diisi API bila tersedia atau dari jadwal kuliah mahasiswa. */
  jam_mulai?: string | null;
  jam_selesai?: string | null;
  ruang?: string | null;
  nama_ruang?: string | null;
  kode_mk: string;
  nama_mk: string;
  sks: number;
  semester?: string | number;
  nama_dosen?: string | null;
}
export interface KelasLmsDetail extends KelasLms {
  jadwal?: JadwalKelasLms | null;
  jumlah?: { materi?: number; tugas?: number; kuis?: number; forum?: number } | null;
}
export interface RapatLms {
  id?: string;
  driver?: 'zoom' | 'google_meet' | 'tautan' | string;
  penyedia?: string;
  judul?: string;
  agenda?: string | null;
  mulai?: string | null;
  selesai?: string | null;
  durasi_menit?: number;
  zona_waktu?: string;
  status?: string;
  waktu?: 'akan_datang' | 'berlangsung' | 'selesai' | 'dibatalkan';
  url_gabung?: string | null;
  kata_sandi?: string | null;
  id_rapat?: string | null;
}
export interface ItemNilaiLms {
  id: number;
  sumber: 'tugas' | 'kuis' | 'manual' | string;
  sumber_id: number | null;
  nama: string;
  komponen: string;
  nilai_maks: number;
  bobot: number;
}
export interface BukuNilaiSaya {
  item: ItemNilaiLms[];
  persen_siakad: Record<string, number>;
  mahasiswa: {
    nim: string;
    nama: string;
    nilai: Array<{ item_id: number; nilai: number | null; catatan: string | null }>;
    komponen: Record<string, number>;
    nilai_akhir_perkiraan: number | null;
  } | null;
}
export interface PesertaLms {
  username: string;
  nama?: string | null;
  peran: string;
}
export interface NotifikasiLms {
  id: number;
  jenis?: string | null;
  judul: string;
  isi?: string | null;
  tautan?: string | null;
  kelas_id?: number | null;
  dibaca_at?: string | null;
  created_at?: string | null;
}
export interface AgendaLmsRinci {
  jenis: string;
  id: number;
  kelas_id: number;
  kelas: string;
  judul: string;
  waktu: string;
  selesai?: string | null;
  tautan?: string | null;
}
export interface KelasTerbukaLms {
  id: number;
  judul: string;
  ringkasan?: string | null;
  kode_prodi?: string | null;
  pengajar?: string | null;
  mulai?: string | null;
  selesai?: string | null;
  topik: number;
  materi: number;
  peserta: number;
}
export interface JadwalKuliahMhs {
  idj: number;
  kode_mk: string;
  nama_mk: string;
  sks: number;
  hari: string;
  jam_mulai: string | null;
  jam_selesai: string | null;
  ruang: string | null;
  nama_ruang?: string | null;
  kelas: string;
  dosen: { nidn: string; nama: string } | null;
}

// ================================================================ Rute
export interface RuteLms {
  kelas: (id: number, tab?: string) => string;
  materi: (id: number) => string;
  tugas: (id: number) => string;
  kuis: (id: number) => string;
  kerjakanKuis: (id: number) => string;
  hasilKuis: (percobaanId: number, kuisId?: number) => string;
  forum: (id: number, kelasId?: number) => string;
  utas: (id: number) => string;
  /** Daftar ujian CBT mahasiswa (UTS, UAS, kuis CBT kelas); tempat ujian dimulai. Opsional demi kompatibilitas. */
  ujianSaya?: string;
  /** Cara pindah halaman setelah aksi (mulai kuis, kirim kuis, utas baru, klik notifikasi). Bawaan window.location.assign; isi dengan navigate() router SPA. */
  pindah?: (href: string) => void;
}
export const RUTE_LMS: RuteLms = {
  kelas: (id, tab) => (tab && tab !== 'materi' ? `/kelas/${id}/${tab}` : `/kelas/${id}`),
  materi: (id) => `/materi/${id}`,
  tugas: (id) => `/tugas/${id}`,
  kuis: (id) => `/kuis/${id}`,
  kerjakanKuis: (id) => `/kuis/${id}/kerjakan`,
  hasilKuis: (p, k) => `/kuis/percobaan/${p}${k ? `?kuis=${k}` : ''}`,
  forum: (id, k) => `/forum/${id}${k ? `?kelas=${k}` : ''}`,
  utas: (id) => `/utas/${id}`,
  ujianSaya: '/ujian',
};
const RuteCtx = React.createContext<RuteLms>(RUTE_LMS);
/** Ganti alamat halaman LMS yang dipakai tautan di komponen (bawaan RUTE_LMS). */
export function LmsRuteProvider({ rute, children }: { rute?: Partial<RuteLms>; children: React.ReactNode }) {
  const v = React.useMemo(() => ({ ...RUTE_LMS, ...rute }), [rute]);
  return <RuteCtx.Provider value={v}>{children}</RuteCtx.Provider>;
}
/** Baca alamat halaman LMS dari `LmsRuteProvider` (bawaan `RUTE_LMS`). */
export const useRuteLms = () => React.useContext(RuteCtx);
/** Pindah halaman lewat `rute.pindah` bila ada, selain itu memuat alamat baru. */
const pindahKe = (rute: RuteLms, href: string): void => (rute.pindah ? rute.pindah(href) : window.location.assign(href));

/** Rute halaman untuk satu item kelas. */
export function ruteItemLms(i: ItemTopikLms, rute: RuteLms = RUTE_LMS, kelasId?: number): string {
  if (i.tipe === 'forum') return rute.forum(i.id, kelasId);
  if (i.tipe === 'tugas') return rute.tugas(i.id);
  if (i.tipe === 'kuis') return rute.kuis(i.id);
  return rute.materi(i.id);
}

/** Alamat API di notifikasi/kalender (/v1/lms/tugas/16) menjadi rute halaman (/tugas/16). */
export function ruteDariTautanLms(tautan?: string | null, kelasId?: number | null, rute: RuteLms = RUTE_LMS): string | null {
  const m = tautan?.match(/^\/v1\/lms\/(kelas|tugas|kuis|materi|presensi|forum\/post|forum)\/(\d+)/);
  if (!m) return kelasId ? rute.kelas(kelasId) : null;
  const id = Number(m[2]);
  switch (m[1]) {
    case 'kelas':
      return rute.kelas(id);
    case 'tugas':
      return rute.tugas(id);
    case 'kuis':
      return rute.kuis(id);
    case 'materi':
      return rute.materi(id);
    case 'forum/post':
      return rute.utas(id);
    case 'forum':
      return rute.forum(id, kelasId ?? undefined);
    case 'presensi':
      return kelasId ? rute.kelas(kelasId, 'presensi') : null;
  }
  return null;
}

// ================================================================ Bantuan
/** "2026-11-17 12:00:00" -> Date (waktu server). */
export function tglLms(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}
const fmtWaktu = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
/** "Sen, 17 Nov 12.00". */
export function waktuLms(s?: string | null): string {
  const d = tglLms(s);
  return d ? fmtWaktu.format(d) : '–';
}
const relatif = (s?: string | null) => {
  const d = tglLms(s);
  return d ? formatRelative(d) : '';
};
const tglIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** HTML ke teks polos untuk cuplikan. */
export const teksPolosLms = (html?: string | null) =>
  (html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
/** Teks dari kotak isian menjadi HTML sederhana (paragraf + baris baru) untuk API. */
export function teksKeHtmlLms(teks: string): string | null {
  const t = teks.trim();
  if (!t) return null;
  const esc = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<p>${esc.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
}
const htmlKeTeks = (html?: string | null) =>
  (html ?? '')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<\/p>\s*<p>/g, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** Alamat berkas LMS yang bisa dibuka peramban: path /v1/... diawali alamat SDK (mis. /bff/api). */
export function urlFileLms(siakad: Pick<Siakad, 'url'> | null, url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('/v1/') && siakad) return siakad.url + url;
  return url;
}
function useFileUrl() {
  const s = useOptionalSiakad();
  return React.useCallback((u?: string | null) => urlFileLms(s, u), [s]);
}

/** Isi HTML dari API (sudah disaring server SIAKAD). */
export function IsiHtmlLms({ html, className }: { html?: string | null; className?: string }) {
  if (!html) return null;
  return <div className={cn('ub-konten u-lmsb-html', className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

function Galat({ q, judul }: { q: Pick<QueryState<unknown>, 'error' | 'refetch'>; judul?: string }) {
  const st = (q.error as { status?: number } | null)?.status;
  if (st === 404 || st === 403) return <Empty icon={<Lock />} title={judul ?? 'Tidak tersedia'} description={pesanGalat(q.error, { kode: false })} bordered />;
  return (
    <div className="u-widget-error" role="alert">
      <span>
        {pesanGalat(q.error, { kode: false })}
        <KodeLaporan error={q.error} />
      </span>
      <Button size="sm" variant="ghost" onClick={q.refetch}>
        <RefreshCw /> Muat ulang
      </Button>
    </div>
  );
}
/** Kotak galat hasil query LMS: pesan, kode laporan (request_id), dan tombol muat ulang. 403/404 tampil sebagai "Tidak tersedia". */
export const GalatLms = Galat;
const muatDari = (q: QueryState<unknown>) => q.loading && !q.data;
const segarkan = () => invalidateSiakad('lms');

/** Jalankan aksi SDK dengan status sibuk + galat. */
function useAksi() {
  const siakad = useOptionalSiakad();
  const [sibuk, setSibuk] = React.useState(false);
  const [galat, setGalat] = React.useState<unknown>(null);
  const jalan = React.useCallback(
    async <T,>(fn: (s: Siakad) => Promise<T>): Promise<T | undefined> => {
      if (!siakad) {
        setGalat(new Error('SDK belum dipasang di <UnipoProvider>.'));
        return undefined;
      }
      setSibuk(true);
      setGalat(null);
      try {
        return await fn(siakad);
      } catch (e) {
        setGalat(e);
        throw e;
      } finally {
        setSibuk(false);
      }
    },
    [siakad],
  );
  return { siakad, sibuk, galat, setGalat, jalan };
}

const JENIS_SOAL: Record<string, string> = {
  pilihan_ganda: 'Pilihan ganda',
  pilihan_ganda_banyak: 'Pilih semua yang benar',
  benar_salah: 'Benar/salah',
  isian_singkat: 'Isian singkat',
  esai: 'Esai',
  menjodohkan: 'Menjodohkan',
};
const KOMPONEN_NILAI: Record<string, string> = { Harian: 'Kuis/harian', Tugas: 'Tugas', UTS: 'UTS', UAS: 'UAS', HDR: 'Kehadiran' };
const STATUS_JAWABAN: Record<string, { label: string; variant: BadgeVariant }> = {
  draf: { label: 'Draf tersimpan', variant: 'neutral' },
  dikumpulkan: { label: 'Dikumpulkan', variant: 'info' },
  dinilai: { label: 'Dinilai', variant: 'success' },
  dikembalikan: { label: 'Perlu revisi', variant: 'warning' },
};
const STATUS_HADIR: Record<string, { label: string; variant: BadgeVariant }> = {
  H: { label: 'Hadir', variant: 'success' },
  I: { label: 'Izin', variant: 'info' },
  S: { label: 'Sakit', variant: 'warning' },
  A: { label: 'Alpa', variant: 'danger' },
};

/** Nama hari jadwal SIAKAD: kode 1–7 (Senin–Minggu) atau nama hari apa adanya (LMS-24). */
const HARI_SIAKAD: Record<string, string> = { '1': 'Senin', '2': 'Selasa', '3': 'Rabu', '4': 'Kamis', '5': 'Jumat', '6': 'Sabtu', '7': 'Minggu' };
export function namaHariLms(h?: string | number | null): string {
  if (h == null || h === '') return '';
  return HARI_SIAKAD[String(h).trim()] ?? String(h);
}
/** Label periode akademik dari kode (20261 → "Ganjil 2026/2027"); kode lain apa adanya. */
export function labelPeriodeLms(t?: string | null): string {
  if (!t) return '';
  if (!/^\d{5}$/.test(t)) return t;
  const th = Number(t.slice(0, 4));
  return `${({ '1': 'Ganjil', '2': 'Genap', '3': 'Pendek' } as Record<string, string>)[t[4]!] ?? 'Semester'} ${th}/${th + 1}`;
}
/**
 * Jadwal kelas yang terbaca awam: "Jumat, 09.45–11.25" (jam dari jadwal kuliah SIAKAD bila ada, selain itu "jam ke-3")
 * dan nama ruang ("Lab Hukum") bila tersedia, bukan kode hari/ruang mentah (LMS-24).
 */
export function teksJadwalLms(j: Pick<JadwalKelasLms, 'hari' | 'jamke' | 'jam_mulai' | 'jam_selesai'> | null | undefined): string {
  if (!j || !j.hari) return '';
  const jam = j.jam_mulai ? `${j.jam_mulai.slice(0, 5).replace(':', '.')}${j.jam_selesai ? `–${j.jam_selesai.slice(0, 5).replace(':', '.')}` : ''}` : j.jamke ? `jam ke-${j.jamke}` : '';
  return [namaHariLms(j.hari), jam].filter(Boolean).join(', ');
}
export function teksRuangLms(j: Pick<JadwalKelasLms, 'ruang' | 'nama_ruang'> | null | undefined): string {
  if (!j) return '';
  const nama = j.nama_ruang?.trim();
  return nama || (j.ruang ? `Ruang ${j.ruang}` : '');
}

// ================================================================ Hook data
const opt = { staleTime: 30_000 };
const enabledId = (id: unknown) => id != null && id !== '' && id !== 0;
export function useKelasLmsDetail(id: number | undefined) {
  return useSiakadQuery<KelasLmsDetail>(['lms-kelas', String(id)], (s, signal) => s.lms.getKelasById(id!, {}, { signal }) as never, { ...opt, enabled: enabledId(id) });
}
export function useKontenKelas(id: number | undefined) {
  return useSiakadQuery<KontenKelasData>(['lms-konten', String(id)], (s, signal) => s.lms.getKelasByIdKonten(id!, {}, { signal }) as never, { ...opt, enabled: enabledId(id) });
}
export function useMateriLms(id: number | undefined) {
  return useSiakadQuery<MateriLms>(['lms-materi', String(id)], (s, signal) => s.lms.getMateriById(id!, {}, { signal }) as never, { ...opt, enabled: enabledId(id) });
}
export function useRapatMateri(id: number | undefined, aktif = true) {
  return useSiakadQuery<RapatLms>(['lms-rapat', String(id)], (s, signal) => s.lms.getMateriByIdRapat(id!, {}, { signal }) as never, { staleTime: 60_000, enabled: enabledId(id) && aktif });
}
export function useTugasKelas(kelasId: number | undefined) {
  return useSiakadQuery<TugasLms[]>(['lms-tugas-kelas', String(kelasId)], (s, signal) => s.lms.getKelasByIdTugas(kelasId!, {}, { signal }) as never, { ...opt, enabled: enabledId(kelasId) });
}
export function useTugasLms(id: number | undefined) {
  return useSiakadQuery<TugasLms>(['lms-tugas', String(id)], (s, signal) => s.lms.getTugasById(id!, {}, { signal }) as never, { ...opt, enabled: enabledId(id) });
}
export function useJawabanTugas(id: number | undefined) {
  return useSiakadQuery<Array<JawabanTugasLms | null>>(['lms-tugas-jawaban', String(id)], (s, signal) => s.lms.getTugasByIdJawaban(id!, {}, { signal }) as never, { ...opt, enabled: enabledId(id) });
}
export function useKuisKelas(kelasId: number | undefined) {
  return useSiakadQuery<KuisLms[]>(['lms-kuis-kelas', String(kelasId)], (s, signal) => s.lms.getKelasByIdKuis(kelasId!, {}, { signal }) as never, { ...opt, enabled: enabledId(kelasId) });
}
export function useKuisLms(id: number | undefined) {
  return useSiakadQuery<KuisLms>(['lms-kuis', String(id)], (s, signal) => s.lms.getKuisById(id!, {}, { signal }) as never, { ...opt, enabled: enabledId(id) });
}
export function usePercobaanKuisSaya(kuisId: number | undefined) {
  return useSiakadQuery<PercobaanKuis[]>(['lms-kuis-percobaan', String(kuisId)], (s, signal) => s.lms.getKuisByIdPercobaan(kuisId!, {}, { signal }) as never, {
    ...opt,
    enabled: enabledId(kuisId),
  });
}
export function usePercobaanKuis(id: number | undefined) {
  return useSiakadQuery<PercobaanKuis>(['lms-percobaan', String(id)], (s, signal) => s.lms.getKuisPercobaanById(id!, {}, { signal }) as never, { ...opt, enabled: enabledId(id) });
}
export function useForumKelas(kelasId: number | undefined) {
  return useSiakadQuery<ForumLms[]>(['lms-forum-kelas', String(kelasId)], (s, signal) => s.lms.getKelasByIdForum(kelasId!, {}, { signal }) as never, { ...opt, enabled: enabledId(kelasId) });
}
/** Utas satu forum per halaman (disematkan lebih dulu, lalu yang terakhir aktif). */
export function useUtasForum(forumId: number | undefined, page = 1, perPage = 20) {
  return useSiakadQuery<PostForumLms[]>(
    ['lms-forum-post', String(forumId), page, perPage],
    (s, signal) => s.lms.getForumByIdPost(forumId!, { page, per_page: perPage } as never, { signal }) as never,
    { ...opt, enabled: enabledId(forumId) },
  );
}
export function useUtasLms(postId: number | undefined) {
  return useSiakadQuery<UtasLms>(['lms-utas', String(postId)], (s, signal) => s.lms.getForumPostById(postId!, {}, { signal }) as never, { ...opt, enabled: enabledId(postId) });
}
export function usePresensiKelas(kelasId: number | undefined) {
  return useSiakadQuery<PresensiKelasData>(['lms-presensi', String(kelasId)], (s, signal) => s.lms.getKelasByIdPresensi(kelasId!, {}, { signal }) as never, { ...opt, enabled: enabledId(kelasId) });
}
export function useNilaiKelas(kelasId: number | undefined) {
  return useSiakadQuery<BukuNilaiSaya>(['lms-nilai', String(kelasId)], (s, signal) => s.lms.getKelasByIdNilai(kelasId!, {}, { signal }) as never, { ...opt, enabled: enabledId(kelasId) });
}
export function usePesertaKelas(kelasId: number | undefined) {
  return useSiakadQuery<PesertaLms[]>(['lms-peserta', String(kelasId)], (s, signal) => s.lms.getKelasByIdPeserta(kelasId!, {}, { signal }) as never, {
    staleTime: 120_000,
    enabled: enabledId(kelasId),
  });
}
export function useNotifikasiLms(perPage = 50) {
  return useSiakadQuery<NotifikasiLms[]>(['lms-notifikasi', perPage], (s, signal) => s.lms.getNotifikasi({ per_page: perPage } as never, { signal }) as never, { staleTime: 30_000 });
}
export function useAgendaLmsRentang(dari: string, sampai: string, kelasId?: number) {
  return useSiakadQuery<AgendaLmsRinci[]>(
    ['lms-kalender', dari, sampai, kelasId ?? null],
    (s, signal) => s.lms.getKalender({ dari, sampai, ...(kelasId ? { kelas_id: kelasId } : {}) } as never, { signal }) as never,
    { staleTime: 60_000, enabled: Boolean(dari && sampai) },
  );
}
/** Katalog kelas terbuka (tanpa token): bisa dipakai di landing page. */
export function useKelasTerbuka(q: { q?: string; per_page?: number } = {}) {
  return useSiakadQuery<KelasTerbukaLms[]>(
    ['lms-terbuka', q],
    (s, signal) => s.request<KelasTerbukaLms[]>({ method: 'GET', path: '/v1/lms/terbuka', query: { per_page: 12, ...q } as never }, { signal }),
    { staleTime: 300_000 },
  );
}
export function useJadwalKuliahMhs(nim: string | undefined) {
  return useSiakadQuery<{ nim: string; tahun_id: string; jadwal: JadwalKuliahMhs[] }>(
    ['lms-jadwal-mhs', nim ?? ''],
    (s, signal) => s.mahasiswa.getByNimJadwal(nim!, {} as never, { signal }) as never,
    { staleTime: 300_000, enabled: Boolean(nim) },
  );
}
/** Satu bagian data (tugas, kuis, nilai, presensi) untuk banyak kelas sekaligus. */
export function useSemuaKelasLms<T>(kelasIds: number[] | undefined, bagian: 'tugas' | 'kuis' | 'nilai' | 'presensi' | 'progres') {
  const ids = kelasIds ?? [];
  return useSiakadQuery<Array<{ kelas_id: number; data: T | null }>>(
    ['lms-semua', bagian, ids.join(',')],
    async (s, signal) => {
      const ambil: Record<string, (id: number) => Promise<{ data: unknown }>> = {
        tugas: (id) => s.lms.getKelasByIdTugas(id, {}, { signal }),
        kuis: (id) => s.lms.getKelasByIdKuis(id, {}, { signal }),
        nilai: (id) => s.lms.getKelasByIdNilai(id, {}, { signal }),
        presensi: (id) => s.lms.getKelasByIdPresensi(id, {}, { signal }),
        progres: (id) => s.lms.getKelasByIdProgres(id, {}, { signal }),
      };
      const hasil = await Promise.all(
        ids.map((id) =>
          ambil[bagian]!(id).then(
            (r) => ({ kelas_id: id, data: r.data as T }),
            () => ({ kelas_id: id, data: null }),
          ),
        ),
      );
      return { data: hasil } as never;
    },
    { staleTime: 60_000, enabled: kelasIds != null },
  );
}

// ================================================================ Keadaan kuis & tugas
/** Keadaan kuis LMS menurut waktu mulai/selesai: belum dibuka, dibuka, segera ditutup, atau ditutup, dengan warna lencana dan apakah bisa dikerjakan. */
export function keadaanKuis(k: Pick<KuisLms, 'mulai' | 'selesai'>, kini = Date.now()): { label: string; variant: BadgeVariant; buka: boolean } {
  const m = tglLms(k.mulai)?.getTime();
  const s = tglLms(k.selesai)?.getTime();
  if (m && kini < m) return { label: `Dibuka ${waktuLms(k.mulai)}`, variant: 'neutral', buka: false };
  if (s && kini > s) return { label: 'Ditutup', variant: 'danger', buka: false };
  if (s && s - kini < 86_400_000) return { label: 'Segera ditutup', variant: 'warning', buka: true };
  return { label: 'Dibuka', variant: 'success', buka: true };
}
/** Tugas sudah dikumpulkan (bukan draf/dikembalikan). */
export const tugasSelesai = (t: Pick<TugasLms, 'jawaban_saya'>) => !!t.jawaban_saya && !['draf', 'dikembalikan'].includes(t.jawaban_saya.status);
/** Tugas sudah tidak menerima pengumpulan. */
export function tugasDitutup(t: Pick<TugasLms, 'batas_akhir' | 'terima_terlambat' | 'tenggat'>, kini = Date.now()) {
  const b = tglLms(t.batas_akhir ?? (t.terima_terlambat ? null : t.tenggat))?.getTime();
  return !!b && b < kini;
}

// ================================================================ Berkas
function ikonBerkas(mime?: string | null) {
  if (!mime) return <FileText />;
  if (mime.startsWith('video/')) return <PlayCircle />;
  return <FileText />;
}
/** Daftar lampiran LMS (unduh/buka di tab baru). */
export function DaftarLampiranLms({ files, className, onHapus }: { files?: FileLms[] | null; className?: string; onHapus?: (f: FileLms) => void }) {
  const url = useFileUrl();
  if (!files?.length) return null;
  return (
    <ul className={cn('u-lmsb-berkas', className)}>
      {files.map((f, i) => {
        const ext = f.nama.split('.').pop()?.toUpperCase();
        return (
          <li key={f.uuid ?? f.id ?? i}>
            <a href={url(f.url) ?? undefined} target="_blank" rel="noopener noreferrer">
              <span className="u-lmsb-berkas-ikon" data-ext={ext}>
                {ikonBerkas(f.mime)}
              </span>
              <span className="u-lmsb-berkas-nama">
                <b>{f.nama}</b>
                <small>
                  {ext}
                  {f.ukuran ? ` · ${formatBytes(f.ukuran)}` : ''}
                </small>
              </span>
              <ExternalLink className="u-lmsb-berkas-buka" aria-hidden />
            </a>
            {onHapus && (
              <Button size="xs" variant="ghost" iconOnly aria-label={`Hapus ${f.nama}`} onClick={() => onHapus(f)}>
                <X />
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ================================================================ Kepala kelas
/** Jadwal kelas dilengkapi jam dan nama ruang dari jadwal kuliah mahasiswa (sama idj) bila API kelas belum mengirimnya. */
function useJadwalKelasLengkap(k: KelasLmsDetail | undefined, nim?: string): JadwalKelasLms | null {
  const mhs = useJadwalKuliahMhs(nim && k?.idj ? nim : undefined);
  const j = k?.jadwal ?? null;
  if (!j) return null;
  const m = mhs.data?.jadwal?.find((x) => x.idj === j.idj);
  if (!m) return j;
  return { ...j, jam_mulai: j.jam_mulai ?? m.jam_mulai, jam_selesai: j.jam_selesai ?? m.jam_selesai, nama_ruang: j.nama_ruang ?? m.nama_ruang ?? null };
}

/** Kepala halaman kelas: sampul, kode MK, judul, pengampu, jadwal, dan cincin progres mahasiswa. */
export function KepalaKelasLms({ kelasId, nim, aksi, className }: { kelasId: number; /** NIM mahasiswa: jam & nama ruang dilengkapi dari jadwal kuliah SIAKAD. */ nim?: string; aksi?: React.ReactNode; className?: string }) {
  const q = useKelasLmsDetail(kelasId);
  const j = useJadwalKelasLengkap(q.data, nim);
  const p = useSiakadQuery<{ mahasiswa: Array<{ persen: number | null; selesai: number; total: number }> }>(
    ['lms-progres', String(kelasId)],
    (s, signal) => s.lms.getKelasByIdProgres(kelasId, {}, { signal }) as never,
    { staleTime: 60_000 },
  );
  if (q.error) return <Galat q={q} judul="Kelas tidak tersedia" />;
  const k = q.data;
  const saya = p.data?.mahasiswa?.length === 1 ? p.data.mahasiswa[0] : undefined;
  return (
    <header className={cn('u-lmsb-kepala', className)}>
      <span className="u-lmsb-kepala-sampul" aria-hidden>
        {k?.sampul_url ? <img src={k.sampul_url} alt="" /> : <SampulKelas seed={kelasId} />}
      </span>
      <div className="u-lmsb-kepala-isi">
        {!k ? (
          <>
            <Skeleton style={{ height: 14, width: 160 }} />
            <Skeleton style={{ height: 30, width: '60%' }} />
            <Skeleton style={{ height: 14, width: 240 }} />
          </>
        ) : (
          <>
            <p className="u-lmsb-kepala-meta">
              {k.kode_mk && <span className="u-kur-code">{k.kode_mk}</span>}
              {j && (
                <span>
                  {j.sks} SKS{j.semester ? ` · Semester ${j.semester}` : ''}
                </span>
              )}
              {k.kelas && <span>Kelas {k.kelas}</span>}
            </p>
            <h1>{namaKelasRapiLms(j?.nama_mk ?? k.judul)}</h1>
            <p className="u-lmsb-kepala-info">
              {(j?.nama_dosen || k.pengajar) && (
                <span>
                  <GraduationCap aria-hidden />
                  {j?.nama_dosen ?? k.pengajar}
                </span>
              )}
              {teksJadwalLms(j) && (
                <span>
                  <CalendarCheck aria-hidden />
                  {teksJadwalLms(j)}
                </span>
              )}
              {teksRuangLms(j) && (
                <span>
                  <MapPin aria-hidden />
                  {teksRuangLms(j)}
                </span>
              )}
            </p>
            {aksi && <div className="u-lmsb-kepala-aksi">{aksi}</div>}
          </>
        )}
      </div>
      {saya && (
        <div className="u-lmsb-kepala-progres">
          <ProgressRing value={saya.persen ?? 0} size={84} thickness={7} tone={(saya.persen ?? 0) >= 100 ? 'success' : 'primary'} label={<b>{Math.round(saya.persen ?? 0)}%</b>} />
          <small>
            {saya.selesai}/{saya.total} aktivitas
          </small>
        </div>
      )}
    </header>
  );
}

// ================================================================ Isi kelas per topik
const IKON_ITEM: Record<string, React.ReactNode> = {
  materi: <FileText />,
  video: <PlayCircle />,
  tautan: <Link2 />,
  konferensi: <Video />,
  tugas: <ClipboardList />,
  kuis: <FileQuestion />,
  forum: <MessagesSquare />,
};
function subItem(i: ItemTopikLms): React.ReactNode {
  switch (i.tipe) {
    case 'tugas':
      return i.tenggat ? `Tenggat ${waktuLms(i.tenggat)}` : 'Tugas';
    case 'kuis':
      return (
        [i.jumlah_soal ? `${i.jumlah_soal} soal` : null, i.durasi_menit ? `${i.durasi_menit} menit` : null, i.selesai ? `tutup ${waktuLms(i.selesai)}` : null].filter(Boolean).join(' · ') || 'Kuis'
      );
    case 'forum':
      return `${i.jenis === 'pengumuman' ? 'Pengumuman' : 'Diskusi'}${i.jumlah_utas != null ? ` · ${i.jumlah_utas} utas` : ''}`;
    default:
      return i.jenis === 'konferensi'
        ? `Kelas daring${i.mulai ? ` · ${waktuLms(i.mulai)}` : ''}`
        : i.jenis === 'video'
          ? 'Video'
          : i.jenis === 'tautan'
            ? 'Tautan'
            : i.lampiran?.length
              ? `${i.lampiran.length} berkas`
              : 'Bacaan';
  }
}
/** Satu baris item kelas (materi, tugas, kuis, forum) dengan status penyelesaian. */
export function ItemTopikLmsBaris({ item: i, href, onTandaiSelesai }: { item: ItemTopikLms; href?: string; onTandaiSelesai?: (m: MateriLms) => void }) {
  const jenis = i.tipe === 'materi' ? (i.jenis === 'video' || i.jenis === 'tautan' || i.jenis === 'konferensi' ? i.jenis : 'materi') : i.tipe;
  const selesai = (i.tipe === 'materi' && !!i.progres?.selesai_at) || (i.tipe === 'tugas' && tugasSelesai(i)) || (i.tipe === 'kuis' && !!i.percobaan_saya?.some((p) => p.status !== 'berlangsung'));
  const nilai = i.tipe === 'tugas' ? i.jawaban_saya?.nilai : i.tipe === 'kuis' ? i.percobaan_saya?.find((p) => p.nilai != null)?.nilai : null;
  const wajib = i.tipe === 'materi' && i.wajib_selesai;
  return (
    <div className="u-lmsb-item" data-selesai={selesai || undefined}>
      <a className="u-lmsb-item-utama" href={href}>
        <span className="u-lmsb-item-ikon" data-jenis={jenis}>
          {IKON_ITEM[jenis]}
        </span>
        <span className="u-lmsb-item-teks">
          <b>{i.judul}</b>
          <small>{subItem(i)}</small>
        </span>
      </a>
      {nilai != null && <Badge variant="success">{formatNumber(nilai)}</Badge>}
      {i.tipe === 'tugas' && i.jawaban_saya && !selesai && STATUS_JAWABAN[i.jawaban_saya.status] && (
        <Badge variant={STATUS_JAWABAN[i.jawaban_saya.status]!.variant}>{STATUS_JAWABAN[i.jawaban_saya.status]!.label}</Badge>
      )}
      {i.tipe === 'tugas' &&
        !i.jawaban_saya &&
        i.tenggat &&
        (() => {
          const s = sisaTenggat(i.tenggat);
          return <Badge variant={s.tone}>{s.teks}</Badge>;
        })()}
      {wajib && !selesai && onTandaiSelesai ? (
        <Button size="xs" variant="outline" onClick={() => onTandaiSelesai(i as MateriLms)}>
          <Check /> Selesai
        </Button>
      ) : selesai ? (
        <span className="u-lmsb-centang" aria-label="Selesai">
          <Check />
        </span>
      ) : null}
    </div>
  );
}

/** Topik/pertemuan yang tanggalnya paling dekat dengan hari ini (dibuka di awal). */
function topikKini(topik: TopikLms[]): number | undefined {
  const kini = Date.now();
  let pilih: TopikLms | undefined;
  for (const t of topik) if (t.tanggal && (tglLms(t.tanggal)?.getTime() ?? 0) <= kini + 86_400_000) pilih = t;
  return (pilih ?? topik[0])?.id;
}

/** Daftar topik/pertemuan dalam accordion. Isi bisa dari useKontenKelas atau data sendiri. */
export function DaftarTopikLms({
  topik,
  kelasId,
  bukaAwal,
  onTandaiSelesai,
  className,
}: {
  topik: TopikLms[];
  kelasId?: number;
  bukaAwal?: string[];
  onTandaiSelesai?: (m: MateriLms) => void;
  className?: string;
}) {
  const rute = useRuteLms();
  if (!topik.length) return <Empty icon={<BookOpen />} title="Belum ada materi" description="Materi dari dosen akan muncul per pertemuan di sini." bordered className={className} />;
  return (
    <Accordion
      variant="card"
      multiple
      className={cn('u-lmsb-topik', className)}
      defaultValue={bukaAwal ?? [String(topik[0]!.id)]}
      items={topik.map((t) => {
        const item = t.item ?? [];
        const wajib = item.filter((i) => i.tipe !== 'forum');
        const beres = wajib.filter((i) => (i.tipe === 'materi' && i.progres?.selesai_at) || (i.tipe === 'tugas' && tugasSelesai(i)) || (i.tipe === 'kuis' && i.percobaan_saya?.length)).length;
        return {
          value: String(t.id),
          title: (
            <span className="u-lmsb-topik-judul">
              {t.pertemuan_ke ? (
                <span className="u-lmsb-topik-no">{t.pertemuan_ke}</span>
              ) : (
                <span className="u-lmsb-topik-no" data-umum>
                  <Megaphone />
                </span>
              )}
              <span>
                <b>{t.judul}</b>
                <small>{[t.tanggal ? formatDate(t.tanggal, 'medium') : null, `${item.length} aktivitas`].filter(Boolean).join(' · ')}</small>
              </span>
              {wajib.length > 0 && (
                <span className="u-lmsb-topik-hitung" data-tuntas={beres >= wajib.length || undefined}>
                  {beres}/{wajib.length}
                </span>
              )}
            </span>
          ),
          content: (
            <div className="u-lmsb-topik-isi">
              {t.deskripsi && <IsiHtmlLms html={t.deskripsi} className="u-lmsb-topik-desk" />}
              {item.length ? (
                <ul>
                  {item.map((i) => (
                    <li key={`${i.tipe}-${i.id}`}>
                      <ItemTopikLmsBaris item={i} href={ruteItemLms(i, rute, kelasId)} onTandaiSelesai={onTandaiSelesai} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="u-lmsb-redup">Belum ada aktivitas di pertemuan ini.</p>
              )}
            </div>
          ),
        };
      })}
    />
  );
}

/** Isi kelas lengkap: pemberitahuan presensi yang dibuka + topik per pertemuan; materi wajib bisa ditandai selesai. */
export function KontenKelasLms({ kelasId, className }: { kelasId: number; className?: string }) {
  const q = useKontenKelas(kelasId);
  const pq = usePresensiKelas(kelasId);
  const toast = useToast();
  const { jalan } = useAksi();
  const [isi, setIsi] = React.useState<SesiPresensiLms | null>(null);
  if (q.error) return <Galat q={q} />;
  if (muatDari(q))
    return (
      <div className={cn('u-lmsb-tumpuk', className)}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} style={{ height: 64 }} />
        ))}
      </div>
    );
  const d = q.data!;
  const topik: TopikLms[] = [...(d.umum.item.length ? [{ id: 0, judul: d.umum.judul || 'Umum', deskripsi: null, item: d.umum.item } as TopikLms] : []), ...d.topik];
  const kini = topikKini(d.topik);
  const terbuka = (pq.data?.sesi ?? []).filter((s) => s.terbuka && !s.presensi_saya);
  const tandai = (m: MateriLms) =>
    jalan((s) => s.lms.postMateriByIdSelesai(m.id, { selesai: true }))
      .then(() => {
        segarkan();
        toast.add({ title: 'Ditandai selesai', description: m.judul, type: 'success' });
      })
      .catch((e) => toast.add({ title: 'Gagal menandai selesai', description: pesanGalat(e), type: 'error' }));
  return (
    <div className={cn('u-lmsb-tumpuk', className)}>
      {terbuka.map((s) => (
        <Alert
          key={s.id}
          variant="success"
          title={`Presensi pertemuan ${s.pertemuan_ke} sedang dibuka`}
          actions={
            <Button size="sm" onClick={() => setIsi(s)}>
              <UserCheck /> Isi presensi
            </Button>
          }
        >
          Masukkan kode dari dosen sebelum sesi ditutup.
        </Alert>
      ))}
      <DaftarTopikLms key={topik.length} topik={topik} kelasId={kelasId} bukaAwal={[...(topik[0]?.id === 0 ? ['0'] : []), ...(kini != null ? [String(kini)] : [])]} onTandaiSelesai={tandai} />
      <IsiPresensiLms sesi={isi} onTutup={() => setIsi(null)} />
    </div>
  );
}

// ================================================================ Materi
/** Alamat sematan untuk YouTube/Vimeo; null bila bukan keduanya. */
export function sematanVideo(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}
const NAMA_RAPAT: Record<string, string> = { zoom: 'Zoom', google_meet: 'Google Meet', tautan: 'Tautan rapat' };

/** Keadaan sesi kelas daring dari waktu mulai/selesai (tombol gabung aktif 15 menit sebelum mulai). */
export function keadaanRapat(r: Pick<RapatLms, 'mulai' | 'selesai' | 'durasi_menit' | 'waktu'>, kini = Date.now()): NonNullable<RapatLms['waktu']> {
  if (r.waktu) return r.waktu;
  const m = tglLms(r.mulai)?.getTime();
  if (!m) return 'berlangsung';
  const s = tglLms(r.selesai)?.getTime() ?? m + (r.durasi_menit ?? 120) * 60_000;
  if (kini < m - 15 * 60_000) return 'akan_datang';
  if (kini > s) return 'selesai';
  return 'berlangsung';
}

/** Kartu gabung kelas daring Zoom/Google Meet dari materi berjenis konferensi. */
export function KartuKelasDaring({ materi, className }: { materi: Pick<MateriLms, 'id' | 'url' | 'mulai' | 'selesai'>; className?: string }) {
  const q = useRapatMateri(materi.id);
  const toast = useToast();
  const [, setDetak] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setDetak((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 200 }} />;
  const st = (q.error as { status?: number } | null)?.status;
  if (q.error && st !== 404) return <Galat q={q} />;
  const r: RapatLms = q.data ?? { driver: 'tautan', url_gabung: materi.url ?? null, mulai: materi.mulai ?? null, selesai: materi.selesai ?? null };
  const waktu = keadaanRapat(r);
  const bisa = !!r.url_gabung && waktu === 'berlangsung';
  const salin = (t: string) => void navigator.clipboard?.writeText(t).then(() => toast.add({ title: 'Disalin', type: 'success' }));
  return (
    <section className={cn('u-lmsb-daring', className)} data-waktu={waktu}>
      <div className="u-lmsb-daring-atas">
        <div className="u-lmsb-daring-label">
          <Badge variant={waktu === 'berlangsung' ? 'solid' : 'primary'}>
            <Video /> {NAMA_RAPAT[r.driver ?? ''] ?? r.penyedia ?? 'Kelas daring'}
          </Badge>
          {waktu === 'berlangsung' && <span className="u-lmsb-langsung">Sedang berlangsung</span>}
          {waktu === 'akan_datang' && <Badge variant="info">Akan datang</Badge>}
          {waktu === 'selesai' && <Badge variant="neutral">Sudah selesai</Badge>}
          {waktu === 'dibatalkan' && <Badge variant="danger">Dibatalkan</Badge>}
        </div>
        <p className="u-lmsb-daring-waktu">
          {r.mulai ? waktuLms(r.mulai) : 'Waktu menyusul'}
          {r.selesai ? ` – ${formatTime(tglLms(r.selesai))}` : ''}
        </p>
        <p className="u-lmsb-redup">
          {!r.zona_waktu || r.zona_waktu === 'Asia/Makassar' ? 'WITA' : r.zona_waktu}
          {r.durasi_menit ? ` · ${r.durasi_menit} menit` : ''}
        </p>
        {r.url_gabung && waktu !== 'dibatalkan' && (
          <Button size="lg" disabled={!bisa} render={bisa ? <a href={r.url_gabung} target="_blank" rel="noopener noreferrer" /> : undefined}>
            <Video /> {bisa ? 'Gabung kelas daring' : waktu === 'selesai' ? 'Sesi sudah selesai' : 'Aktif 15 menit sebelum mulai'}
          </Button>
        )}
      </div>
      {(r.id_rapat || r.kata_sandi || r.agenda) && (
        <div className="u-lmsb-daring-bawah">
          <div className="u-lmsb-salin">
            {r.id_rapat && (
              <Button variant="outline" size="sm" onClick={() => salin(r.id_rapat!)}>
                <small>ID rapat</small>
                <b>{r.id_rapat}</b>
                <Copy aria-hidden />
              </Button>
            )}
            {r.kata_sandi && (
              <Button variant="outline" size="sm" onClick={() => salin(r.kata_sandi!)}>
                <small>Kata sandi</small>
                <b>{r.kata_sandi}</b>
                <Copy aria-hidden />
              </Button>
            )}
          </div>
          <IsiHtmlLms html={r.agenda} />
          <p className="u-lmsb-redup">Masuk dengan nama lengkap dan NIM agar dosen mudah mengenali. Presensi diisi dengan kode yang dibagikan dosen.</p>
        </div>
      )}
    </section>
  );
}

/** Isi satu materi sesuai jenisnya: bacaan + berkas (pratinjau PDF), video, tautan, atau kelas daring. */
export function IsiMateriLms({ materi: m, className }: { materi: MateriLms; className?: string }) {
  const url = useFileUrl();
  const lampiran = (m.lampiran ?? []).map((f) => ({ ...f, url: url(f.url) }));
  const pdf = lampiran.find((f) => (f.mime ?? '').includes('pdf'));
  const vid = lampiran.find((f) => (f.mime ?? '').startsWith('video/'));
  if (m.jenis === 'konferensi')
    return (
      <div className={cn('u-lmsb-tumpuk', className)}>
        <KartuKelasDaring materi={m} />
        {m.konten && <IsiHtmlLms html={m.konten} className="u-lmsb-kartu" />}
      </div>
    );
  if (m.jenis === 'video') {
    const s = m.url ? sematanVideo(m.url) : null;
    return (
      <div className={cn('u-lmsb-tumpuk', className)}>
        {s ? (
          <div className="u-lmsb-video">
            <iframe src={s} title={m.judul} allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen />
          </div>
        ) : vid?.url ? (
          <video className="u-lmsb-video" controls src={vid.url} />
        ) : m.url ? (
          <Button variant="outline" render={<a href={m.url} target="_blank" rel="noopener noreferrer" />}>
            <PlayCircle /> Buka video
          </Button>
        ) : null}
        {m.konten && <IsiHtmlLms html={m.konten} className="u-lmsb-kartu" />}
        <DaftarLampiranLms files={m.lampiran?.filter((f) => f !== vid)} />
      </div>
    );
  }
  if (m.jenis === 'tautan')
    return (
      <div className={cn('u-lmsb-tumpuk', className)}>
        {m.url && (
          <a className="u-lmsb-tautan" href={m.url} target="_blank" rel="noopener noreferrer">
            <span className="u-lmsb-item-ikon" data-jenis="tautan">
              <Link2 />
            </span>
            <span>
              <b>{m.judul}</b>
              <small>{m.url}</small>
            </span>
            <ExternalLink aria-hidden />
          </a>
        )}
        {m.konten && <IsiHtmlLms html={m.konten} className="u-lmsb-kartu" />}
      </div>
    );
  return (
    <div className={cn('u-lmsb-tumpuk', className)}>
      {m.konten && <IsiHtmlLms html={m.konten} className="u-lmsb-kartu" />}
      {pdf?.url && (
        <div className="u-lmsb-pdf">
          <iframe src={pdf.url} title={pdf.nama} />
        </div>
      )}
      <DaftarLampiranLms files={m.lampiran} />
      {!m.konten && !lampiran.length && <Empty icon={<FileText />} title="Materi ini belum berisi" bordered />}
    </div>
  );
}

/** Halaman materi: judul, tandai selesai, isi, dan navigasi ke aktivitas sebelum/berikutnya di kelas. */
export function HalamanMateriLms({ materiId, className }: { materiId: number; className?: string }) {
  const q = useMateriLms(materiId);
  const m = q.data;
  const konten = useKontenKelas(m?.kelas_id);
  const rute = useRuteLms();
  const toast = useToast();
  const { jalan, sibuk } = useAksi();
  if (q.error) return <Galat q={q} judul="Materi tidak tersedia" />;
  if (!m) return <Skeleton className={className} style={{ height: 380 }} />;
  const semua: ItemTopikLms[] = konten.data ? [...konten.data.umum.item, ...konten.data.topik.flatMap((t) => t.item ?? [])] : [];
  const pos = semua.findIndex((i) => i.tipe === 'materi' && i.id === materiId);
  const sebelum = pos > 0 ? semua[pos - 1] : null;
  const sesudah = pos >= 0 && pos < semua.length - 1 ? semua[pos + 1] : null;
  const sudah = !!(m.progres?.selesai_at || semua[pos]?.progres?.selesai_at);
  const topik = konten.data?.topik.find((t) => t.id === m.topik_id);
  const jenis = m.jenis === 'video' || m.jenis === 'tautan' || m.jenis === 'konferensi' ? m.jenis : 'materi';
  const tandai = () =>
    jalan((s) => s.lms.postMateriByIdSelesai(materiId, { selesai: true }))
      .then(() => {
        segarkan();
        toast.add({ title: 'Ditandai selesai', type: 'success' });
      })
      .catch((e) => toast.add({ title: 'Gagal', description: pesanGalat(e), type: 'error' }));
  return (
    <article className={cn('u-lmsb-halaman', className)}>
      <header className="u-lmsb-judul">
        <a className="u-lmsb-kembali" href={rute.kelas(m.kelas_id)}>
          <ArrowLeft aria-hidden /> {konten.data?.kelas.judul ?? 'Kembali ke kelas'}
        </a>
        <div className="u-lmsb-judul-baris">
          <span className="u-lmsb-item-ikon" data-jenis={jenis} data-besar>
            {IKON_ITEM[jenis]}
          </span>
          <div>
            <h1>{m.judul}</h1>
            {topik && <p>{topik.judul}</p>}
          </div>
          {m.wajib_selesai &&
            (sudah ? (
              <Badge variant="success" dot>
                Selesai
              </Badge>
            ) : (
              <Button variant="outline" loading={sibuk} onClick={tandai}>
                <CircleCheck /> Tandai selesai
              </Button>
            ))}
        </div>
      </header>
      <IsiMateriLms materi={m} />
      <nav className="u-lmsb-navigasi" aria-label="Aktivitas lain">
        {sebelum ? (
          <a href={ruteItemLms(sebelum, rute, m.kelas_id)}>
            <ArrowLeft aria-hidden />
            <span>
              <small>Sebelumnya</small>
              <b>{sebelum.judul}</b>
            </span>
          </a>
        ) : (
          <span />
        )}
        {sesudah ? (
          <a href={ruteItemLms(sesudah, rute, m.kelas_id)} data-kanan>
            <span>
              <small>Berikutnya</small>
              <b>{sesudah.judul}</b>
            </span>
            <ArrowRight aria-hidden />
          </a>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}

// ================================================================ Tugas
/** Kartu tugas: tenggat, sisa waktu, status pengumpulan, nilai. */
export function KartuTugasLms({ tugas: t, kelas, href, className }: { tugas: TugasLms; kelas?: string; href?: string; className?: string }) {
  const j = t.jawaban_saya;
  const st = j ? STATUS_JAWABAN[j.status] : null;
  const s = t.tenggat ? sisaTenggat(t.tenggat) : null;
  const selesai = tugasSelesai(t);
  const Tag = href ? 'a' : 'div';
  return (
    <Tag className={cn('u-lmsb-kartu-aktivitas', className)} data-selesai={selesai || undefined} {...(href ? { href } : {})}>
      <span className="u-lmsb-item-ikon" data-jenis="tugas">
        <ClipboardList />
      </span>
      <span className="u-lmsb-item-teks">
        {kelas && <small className="u-lmsb-kelas-label">{kelas}</small>}
        <b>{t.judul}</b>
        <small>
          {t.tenggat ? `Tenggat ${waktuLms(t.tenggat)}` : 'Tanpa tenggat'}
          {t.nilai_maks ? ` · nilai maks. ${t.nilai_maks}` : ''}
        </small>
      </span>
      <span className="u-lmsb-kartu-status">
        {j?.nilai != null ? (
          <b className="u-lmsb-nilai">
            {formatNumber(j.nilai)}
            <small>/{t.nilai_maks ?? 100}</small>
          </b>
        ) : st ? (
          <Badge variant={st.variant} dot>
            {st.label}
          </Badge>
        ) : s && !selesai ? (
          <Badge variant={s.tone}>{s.teks}</Badge>
        ) : null}
        {j?.terlambat && <small className="u-lmsb-telat">Terlambat</small>}
      </span>
    </Tag>
  );
}

/** Tugas satu kelas: yang belum dikumpulkan di atas, diurutkan menurut tenggat. */
export function DaftarTugasKelasLms({ kelasId, className }: { kelasId: number; className?: string }) {
  const q = useTugasKelas(kelasId);
  const rute = useRuteLms();
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 180 }} />;
  const data = [...(q.data ?? [])].sort((a, b) => Number(tugasSelesai(a)) - Number(tugasSelesai(b)) || (a.tenggat ?? '9').localeCompare(b.tenggat ?? '9'));
  if (!data.length) return <Empty icon={<ClipboardList />} title="Belum ada tugas" description="Tugas dari dosen akan muncul di sini." bordered className={className} />;
  return (
    <div className={cn('u-lmsb-grid-aktivitas', className)}>
      {data.map((t) => (
        <KartuTugasLms key={t.id} tugas={t} href={rute.tugas(t.id)} />
      ))}
    </div>
  );
}

export interface KumpulkanTugasLmsProps {
  tugas: TugasLms;
  jawaban?: JawabanTugasLms | null;
  /** Dipanggil setelah draf disimpan atau tugas dikumpulkan. */
  onTerkirim?: (kumpulkan: boolean) => void;
  className?: string;
}
type BerkasUnggah = { kunci: string; nama: string; ukuran: number; status: 'mengunggah' | 'selesai' | 'gagal'; hasil?: FileLms; galat?: string };

/** Formulir jawaban tugas: teks dan/atau berkas (diunggah ke /v1/lms/file), simpan draf, kumpulkan. */
export function KumpulkanTugasLms({ tugas: t, jawaban: j, onTerkirim, className }: KumpulkanTugasLmsProps) {
  const { jalan, sibuk, galat } = useAksi();
  const toast = useToast();
  const [teks, setTeks] = React.useState(() => htmlKeTeks(j?.teks));
  const [lama, setLama] = React.useState<FileLms[]>(j?.lampiran ?? []);
  const [baru, setBaru] = React.useState<BerkasUnggah[]>([]);
  const [yakin, setYakin] = React.useState(false);
  React.useEffect(() => {
    setTeks(htmlKeTeks(j?.teks));
    setLama(j?.lampiran ?? []);
    setBaru([]);
  }, [j?.id, j?.status, j?.teks, j?.lampiran]);

  const status = j?.status;
  const terkunci = status === 'dikumpulkan' || status === 'dinilai';
  const ditutup = tugasDitutup(t);
  const pakaiTeks = t.jenis_pengumpulan !== 'file' && t.jenis_pengumpulan !== 'luring';
  const pakaiBerkas = t.jenis_pengumpulan !== 'teks' && t.jenis_pengumpulan !== 'luring';
  const maks = t.maks_file ?? 5;
  const jumlahBerkas = lama.length + baru.filter((b) => b.status !== 'gagal').length;
  const mengunggah = baru.some((b) => b.status === 'mengunggah');

  if (t.jenis_pengumpulan === 'luring')
    return (
      <Alert variant="info" title="Dikumpulkan di kelas" className={className}>
        Tugas ini dikumpulkan langsung kepada dosen. Nilai akan muncul di sini setelah dinilai.
      </Alert>
    );

  const unggah = (files: File[]) => {
    const sisa = Math.max(0, maks - jumlahBerkas);
    const pakai = files.slice(0, sisa);
    if (files.length > sisa) toast.add({ title: `Maksimal ${maks} berkas`, type: 'warning' });
    for (const f of pakai) {
      const kunci = `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 7)}`;
      setBaru((b) => [...b, { kunci, nama: f.name, ukuran: f.size, status: 'mengunggah' }]);
      jalan((s) => s.lms.postFile({ file: f, kelas_id: t.kelas_id, konteks: 'jawaban' }))
        .then((r) => setBaru((b) => b.map((x) => (x.kunci === kunci ? { ...x, status: 'selesai', hasil: r?.data as FileLms } : x))))
        .catch((e) => setBaru((b) => b.map((x) => (x.kunci === kunci ? { ...x, status: 'gagal', galat: pesanGalat(e) } : x))));
    }
  };

  const kirim = (kumpulkan: boolean) =>
    jalan((s) =>
      s.lms.putTugasByIdJawaban(t.id, {
        teks: pakaiTeks ? teksKeHtmlLms(teks) : null,
        kumpulkan,
        file_ids: [...lama.map((f) => f.id), ...baru.filter((b) => b.status === 'selesai').map((b) => b.hasil?.id)].filter((x): x is number => typeof x === 'number'),
      } as never),
    )
      .then(() => {
        segarkan();
        toast.add({ title: kumpulkan ? 'Tugas dikumpulkan' : 'Draf disimpan', description: kumpulkan ? 'Dosen menerima pemberitahuan.' : undefined, type: 'success' });
        onTerkirim?.(kumpulkan);
      })
      .catch(() => undefined);

  const kosong = !teks.trim() && jumlahBerkas === 0;
  const ext = t.ekstensi?.length ? t.ekstensi.map((e) => `.${e.replace(/^\./, '')}`).join(',') : undefined;

  return (
    <section className={cn('u-lmsb-kumpul', className)}>
      <header>
        <h3>Jawaban saya</h3>
        {status && STATUS_JAWABAN[status] && (
          <Badge variant={STATUS_JAWABAN[status]!.variant} dot>
            {STATUS_JAWABAN[status]!.label}
            {j?.terlambat ? ' · terlambat' : ''}
          </Badge>
        )}
      </header>
      {status === 'dikembalikan' && (
        <Alert variant="warning" title="Dikembalikan untuk diperbaiki">
          {j?.umpan_balik ?? 'Perbaiki jawaban lalu kumpulkan lagi.'}
        </Alert>
      )}
      {terkunci ? (
        <div className="u-lmsb-tumpuk">
          {j?.teks && <IsiHtmlLms html={j.teks} className="u-lmsb-kartu" />}
          <DaftarLampiranLms files={j?.lampiran} />
          {j?.dikumpulkan_at && <p className="u-lmsb-redup">Dikumpulkan {waktuLms(j.dikumpulkan_at)}.</p>}
        </div>
      ) : ditutup ? (
        <Alert variant="neutral" title="Pengumpulan sudah ditutup">
          Batas pengumpulan tugas ini sudah lewat.
        </Alert>
      ) : (
        <div className="u-lmsb-tumpuk">
          {pakaiTeks && (
            <Field label="Jawaban teks">
              <Textarea value={teks} onChange={(e) => setTeks(e.target.value)} rows={7} placeholder="Tulis jawaban Anda di sini…" />
            </Field>
          )}
          {pakaiBerkas && (
            <div className="u-lmsb-tumpuk-kecil">
              <DaftarLampiranLms files={lama} onHapus={(f) => setLama((l) => l.filter((x) => x !== f))} />
              {baru.length > 0 && (
                <ul className="u-lmsb-unggah">
                  {baru.map((b) => (
                    <li key={b.kunci} data-status={b.status}>
                      <Paperclip aria-hidden />
                      <span>
                        <b>{b.nama}</b>
                        <small>{b.status === 'gagal' ? b.galat : b.status === 'mengunggah' ? 'Mengunggah…' : formatBytes(b.ukuran)}</small>
                      </span>
                      {b.status === 'mengunggah' ? <Progress value={null} size="sm" /> : b.status === 'selesai' ? <CircleCheck className="u-lmsb-ok" /> : <CircleX className="u-lmsb-gagal" />}
                      <Button size="xs" variant="ghost" iconOnly aria-label={`Hapus ${b.nama}`} onClick={() => setBaru((x) => x.filter((y) => y.kunci !== b.kunci))}>
                        <X />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {jumlahBerkas < maks && (
                <Dropzone
                  onFiles={unggah}
                  multiple={maks - jumlahBerkas > 1}
                  accept={ext}
                  maxSize={50 * 1024 * 1024}
                  onReject={(m) => toast.add({ title: m, type: 'error' })}
                  title="Seret berkas ke sini atau pilih berkas"
                  hint={`Maks. ${maks} berkas${t.ekstensi?.length ? ` · ${t.ekstensi.join(', ')}` : ''} · 50 MB per berkas`}
                />
              )}
            </div>
          )}
          {galat != null && (
            <Alert variant="danger" title="Jawaban belum terkirim">
              {pesanGalat(galat, { kode: false })}
              <KodeLaporan error={galat} />
            </Alert>
          )}
          <div className="u-lmsb-aksi">
            <Button variant="outline" disabled={sibuk || mengunggah || kosong} onClick={() => void kirim(false)}>
              Simpan draf
            </Button>
            <Button disabled={sibuk || mengunggah || kosong} loading={sibuk} onClick={() => setYakin(true)}>
              <Send /> Kumpulkan tugas
            </Button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={yakin}
        onOpenChange={setYakin}
        tone="primary"
        title="Kumpulkan tugas sekarang?"
        description="Setelah dikumpulkan, jawaban tidak bisa diubah kecuali dosen mengembalikannya."
        confirmLabel="Kumpulkan"
        onConfirm={() => kirim(true)}
      />
    </section>
  );
}

/** Halaman tugas lengkap: instruksi, lampiran dosen, jawaban/pengumpulan, nilai + umpan balik, rincian, rubrik. */
export function HalamanTugasLms({ tugasId, className }: { tugasId: number; className?: string }) {
  const q = useTugasLms(tugasId);
  const jq = useJawabanTugas(tugasId);
  const kelas = useKelasLmsDetail(q.data?.kelas_id);
  const rute = useRuteLms();
  if (q.error) return <Galat q={q} judul="Tugas tidak tersedia" />;
  const t = q.data;
  if (!t || muatDari(jq)) return <Skeleton className={className} style={{ height: 420 }} />;
  const j = (jq.data?.[0] ?? null) as JawabanTugasLms | null;
  const s = t.tenggat && !tugasSelesai({ jawaban_saya: j }) ? sisaTenggat(t.tenggat) : null;
  return (
    <article className={cn('u-lmsb-halaman', className)}>
      <header className="u-lmsb-judul">
        <a className="u-lmsb-kembali" href={rute.kelas(t.kelas_id, 'tugas')}>
          <ArrowLeft aria-hidden /> {kelas.data?.judul ? namaKelasRapiLms(kelas.data.judul) : 'Kembali ke kelas'}
        </a>
        <div className="u-lmsb-judul-baris">
          <span className="u-lmsb-item-ikon" data-jenis="tugas" data-besar>
            <ClipboardList />
          </span>
          <div>
            <h1>{t.judul}</h1>
            <p>
              <CalendarClock aria-hidden /> {t.tenggat ? `Tenggat ${waktuLms(t.tenggat)}` : 'Tanpa tenggat'}
            </p>
          </div>
          {s && <Badge variant={s.tone}>{s.teks}</Badge>}
        </div>
      </header>
      <div className="u-lmsb-dua-kolom">
        <div className="u-lmsb-tumpuk">
          {(t.instruksi || t.lampiran?.length) && (
            <section className="u-lmsb-kartu">
              <h3 className="u-lmsb-subjudul">Instruksi</h3>
              <IsiHtmlLms html={t.instruksi} />
              <DaftarLampiranLms files={t.lampiran} />
            </section>
          )}
          {j?.status === 'dinilai' && j.umpan_balik && (
            <Alert variant="info" title="Umpan balik dosen">
              {j.umpan_balik}
            </Alert>
          )}
          <KumpulkanTugasLms tugas={t} jawaban={j} />
        </div>
        <aside className="u-lmsb-tumpuk">
          {j?.nilai != null && (
            <div className="u-lmsb-skor">
              <small>
                <Star aria-hidden /> Nilai Anda
              </small>
              <b>
                {formatNumber(j.nilai)}
                <span>/ {t.nilai_maks ?? 100}</span>
              </b>
              {j.dinilai_at && <small>Dinilai {waktuLms(j.dinilai_at)}</small>}
            </div>
          )}
          <section className="u-lmsb-kartu">
            <h3 className="u-lmsb-subjudul">Rincian</h3>
            <DescriptionList
              items={[
                { label: 'Dibuka', value: t.mulai ? waktuLms(t.mulai) : 'Sejak dibuat' },
                { label: 'Tenggat', value: t.tenggat ? waktuLms(t.tenggat) : '–' },
                { label: 'Batas akhir', value: t.batas_akhir ? `${waktuLms(t.batas_akhir)}${t.terima_terlambat ? ' (terlambat diterima)' : ''}` : '–' },
                {
                  label: 'Pengumpulan',
                  value: t.jenis_pengumpulan === 'file' ? 'Berkas' : t.jenis_pengumpulan === 'teks' ? 'Teks' : t.jenis_pengumpulan === 'luring' ? 'Luring di kelas' : 'Berkas dan/atau teks',
                },
                { label: 'Berkas', value: `Maks. ${t.maks_file ?? 5}${t.ekstensi?.length ? ` · ${t.ekstensi.join(', ')}` : ''}` },
                { label: 'Nilai maksimum', value: t.nilai_maks ?? 100 },
                ...(j?.dikumpulkan_at ? [{ label: 'Dikumpulkan', value: waktuLms(j.dikumpulkan_at) }] : []),
              ]}
            />
          </section>
          {!!t.rubrik?.length && (
            <section className="u-lmsb-kartu">
              <h3 className="u-lmsb-subjudul">Rubrik penilaian</h3>
              <ul className="u-lmsb-rubrik">
                {t.rubrik.map((r) => {
                  const v = j?.nilai_rubrik?.[r.kriteria];
                  return (
                    <li key={r.kriteria}>
                      <span>
                        <b>{r.kriteria}</b>
                        {r.deskripsi && <small>{r.deskripsi}</small>}
                      </span>
                      <span className="u-lmsb-rubrik-skor">
                        {v != null && <b>{v}</b>}
                        {v != null ? '/' : ''}
                        {r.skor_maks}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}

// ================================================================ Kuis
/** Kartu kuis: jumlah soal, durasi, percobaan, keadaan buka/tutup, nilai terbaik. */
export function KartuKuisLms({ kuis: k, kelas, href, className }: { kuis: KuisLms; kelas?: string; href?: string; className?: string }) {
  const st = keadaanKuis(k);
  const nilai = (k.percobaan_saya ?? []).map((p) => p.nilai).filter((x): x is number => x != null);
  const Tag = href ? 'a' : 'div';
  return (
    <Tag className={cn('u-lmsb-kartu-aktivitas', className)} data-selesai={nilai.length > 0 || undefined} {...(href ? { href } : {})}>
      <span className="u-lmsb-item-ikon" data-jenis={st.buka ? 'kuis' : 'kunci'}>
        {st.buka ? <FileQuestion /> : <Lock />}
      </span>
      <span className="u-lmsb-item-teks">
        {kelas && <small className="u-lmsb-kelas-label">{kelas}</small>}
        <b>{k.judul}</b>
        <small>
          {[
            k.jumlah_soal != null ? `${k.jumlah_soal} soal` : null,
            k.durasi_menit ? `${k.durasi_menit} menit` : null,
            k.maks_percobaan ? `maks. ${k.maks_percobaan}× percobaan` : null,
            k.selesai ? `tutup ${waktuLms(k.selesai)}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </small>
      </span>
      <span className="u-lmsb-kartu-status">
        {nilai.length ? (
          <b className="u-lmsb-nilai">
            {formatNumber(Math.max(...nilai))}
            <small>/{k.nilai_maks ?? 100}</small>
          </b>
        ) : (
          <Badge variant={st.variant}>{st.label}</Badge>
        )}
      </span>
    </Tag>
  );
}

/** Daftar kuis satu kelas LMS untuk mahasiswa, dengan keadaan tiap kuis dan tombol mengerjakan. */
export function DaftarKuisKelasLms({ kelasId, className }: { kelasId: number; className?: string }) {
  const q = useKuisKelas(kelasId);
  const rute = useRuteLms();
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 160 }} />;
  const data = [...(q.data ?? [])].sort((a, b) => Number(keadaanKuis(b).buka) - Number(keadaanKuis(a).buka) || (a.selesai ?? '9').localeCompare(b.selesai ?? '9'));
  if (!data.length) return <Empty icon={<FileQuestion />} title="Belum ada kuis" description="Kuis dari dosen akan muncul di sini." bordered className={className} />;
  return (
    <div className={cn('u-lmsb-grid-aktivitas', className)}>
      {data.map((k) => (
        <KartuKuisLms key={k.id} kuis={k} href={rute.kuis(k.id)} />
      ))}
    </div>
  );
}

export interface UjianKelasLms {
  id: number;
  nama: string;
  status: string;
  durasi_menit: number;
  mulai: string | null;
  selesai: string | null;
  jumlah_soal: number;
  peserta_id?: number | null;
  status_saya?: string | null;
  nilai?: number | null;
}
export function useUjianKelasLms(kelasId: number | undefined) {
  return useSiakadQuery<UjianKelasLms[]>(
    ['lms-ujian-kelas', String(kelasId)],
    (s, signal) => s.request<UjianKelasLms[]>({ method: 'GET', path: `/v1/lms/kelas/${kelasId}/ujian` }, { signal }) as never,
    { ...opt, enabled: enabledId(kelasId) },
  );
}
const STATUS_UJIAN_SAYA: Record<string, { label: string; variant: BadgeVariant }> = {
  terdaftar: { label: 'Belum dikerjakan', variant: 'neutral' },
  mengerjakan: { label: 'Sedang dikerjakan', variant: 'warning' },
  selesai: { label: 'Selesai', variant: 'success' },
  diskualifikasi: { label: 'Dibatalkan pengawas', variant: 'danger' },
};
/**
 * Kuis berbasis komputer (mesin ujian CBT, satu mesin untuk kuliah dan e-learning) milik kelas: jadwal, status saya,
 * dan nilai bila dosen menampilkan hasil. Dikerjakan dari halaman Ujian saya (layar penuh, simpan otomatis).
 */
export function DaftarUjianKelasLms({ kelasId, className }: { kelasId: number; className?: string }) {
  const q = useUjianKelasLms(kelasId);
  const rute = useRuteLms();
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 120 }} />;
  const data = q.data ?? [];
  if (!data.length) return null;
  const kini = Date.now();
  return (
    <div className={cn('u-lmsb-grid-aktivitas', className)}>
      {data.map((u) => {
        const buka = (!u.mulai || (tglLms(u.mulai)?.getTime() ?? 0) <= kini) && (!u.selesai || (tglLms(u.selesai)?.getTime() ?? 0) >= kini);
        const st = u.status_saya ? STATUS_UJIAN_SAYA[u.status_saya] : null;
        return (
          <a key={u.id} className="u-lmsb-kartu-aktivitas" href={rute.ujianSaya ?? '/ujian'}>
            <span className="u-lmsb-item-ikon" data-jenis="kuis">
              <FileQuestion />
            </span>
            <span className="u-lmsb-item-teks">
              <b>{u.nama}</b>
              <small>
                {[`${u.jumlah_soal} soal`, `${u.durasi_menit} menit`, u.mulai ? `${waktuLms(u.mulai)}${u.selesai ? ` – ${formatTime(tglLms(u.selesai)!)}` : ''}` : null].filter(Boolean).join(' · ')}
              </small>
              {u.nilai != null && <small>Nilai {formatNumber(u.nilai)}</small>}
            </span>
            {st ? <Badge variant={st.variant}>{st.label}</Badge> : <Badge variant={buka ? 'success' : 'neutral'}>{buka ? 'Dibuka' : 'Terjadwal'}</Badge>}
          </a>
        );
      })}
    </div>
  );
}

const METODE_NILAI: Record<string, string> = { tertinggi: 'Nilai tertinggi', terakhir: 'Percobaan terakhir', pertama: 'Percobaan pertama', rata_rata: 'Rata-rata' };

/** Halaman kuis sebelum mengerjakan: aturan, percobaan saya, tombol mulai (dengan kata sandi bila perlu). */
export function HalamanKuisLms({ kuisId, onMulai, className }: { kuisId: number; /** Bawaan: pindah ke rute.kerjakanKuis. */ onMulai?: (kataSandi?: string) => void; className?: string }) {
  const q = useKuisLms(kuisId);
  const pq = usePercobaanKuisSaya(kuisId);
  const kelas = useKelasLmsDetail(q.data?.kelas_id);
  const rute = useRuteLms();
  const [minta, setMinta] = React.useState(false);
  const [sandi, setSandi] = React.useState('');
  if (q.error) return <Galat q={q} judul="Kuis tidak tersedia" />;
  const k = q.data;
  if (!k) return <Skeleton className={className} style={{ height: 380 }} />;
  const daftar = pq.data ?? [];
  const berjalan = daftar.find((p) => p.status === 'berlangsung');
  const selesai = daftar.filter((p) => p.status !== 'berlangsung');
  const habis = !!k.maks_percobaan && selesai.length >= k.maks_percobaan;
  const st = keadaanKuis(k);
  const mulai = (s?: string) => {
    if (onMulai) onMulai(s);
    else {
      try {
        if (s) sessionStorage.setItem(`lms-kuis-sandi-${kuisId}`, s);
      } catch {
        /* abaikan */
      }
      pindahKe(rute, rute.kerjakanKuis(kuisId));
    }
  };
  const tekan = () => (k.berkata_sandi && !berjalan ? setMinta(true) : mulai());
  return (
    <article className={cn('u-lmsb-halaman', className)}>
      <header className="u-lmsb-judul">
        <a className="u-lmsb-kembali" href={rute.kelas(k.kelas_id, 'kuis')}>
          <ArrowLeft aria-hidden /> {kelas.data?.judul ? namaKelasRapiLms(kelas.data.judul) : 'Kembali ke kelas'}
        </a>
        <div className="u-lmsb-judul-baris">
          <span className="u-lmsb-item-ikon" data-jenis="kuis" data-besar>
            <FileQuestion />
          </span>
          <div>
            <h1>{k.judul}</h1>
            <p>{k.selesai ? `Ditutup ${waktuLms(k.selesai)}` : 'Tanpa batas waktu tutup'}</p>
          </div>
          <Badge variant={st.variant}>{st.label}</Badge>
        </div>
      </header>
      <div className="u-lmsb-dua-kolom">
        <section className="u-lmsb-kartu u-lmsb-tumpuk">
          <IsiHtmlLms html={k.deskripsi} />
          <div className="u-lmsb-angka-kuis">
            <span>
              <ListChecks aria-hidden />
              <b>{k.jumlah_soal ?? '–'}</b>
              <small>soal</small>
            </span>
            <span>
              <Timer aria-hidden />
              <b>{k.durasi_menit ?? '∞'}</b>
              <small>menit</small>
            </span>
            <span>
              <RotateCcw aria-hidden />
              <b>
                {selesai.length}/{k.maks_percobaan ?? '∞'}
              </b>
              <small>percobaan</small>
            </span>
          </div>
          {berjalan ? (
            <Button size="lg" fullWidth onClick={tekan}>
              <PlayCircle /> Lanjutkan percobaan
            </Button>
          ) : habis ? (
            <Alert variant="neutral">Batas percobaan sudah habis.</Alert>
          ) : st.buka ? (
            <Button size="lg" fullWidth onClick={tekan}>
              <PlayCircle /> {selesai.length ? 'Coba lagi' : 'Mulai kerjakan'}
            </Button>
          ) : (
            <Alert variant="neutral">{st.label}.</Alert>
          )}
          {k.durasi_menit && (st.buka || berjalan) ? (
            <p className="u-lmsb-redup u-lmsb-tengah">Waktu {k.durasi_menit} menit berjalan sejak tombol ditekan dan tidak berhenti walau halaman ditutup. Jawaban tersimpan otomatis.</p>
          ) : null}
        </section>
        <aside className="u-lmsb-tumpuk">
          <section className="u-lmsb-kartu">
            <h3 className="u-lmsb-subjudul">Ketentuan</h3>
            <DescriptionList
              items={[
                { label: 'Dibuka', value: k.mulai ? waktuLms(k.mulai) : '–' },
                { label: 'Ditutup', value: k.selesai ? waktuLms(k.selesai) : '–' },
                { label: 'Nilai dihitung dari', value: METODE_NILAI[k.metode_nilai ?? ''] ?? k.metode_nilai ?? '–' },
                { label: 'Hasil', value: k.tampil_hasil === 'segera' ? 'Langsung setelah selesai' : k.tampil_hasil === 'setelah_tutup' ? 'Setelah kuis ditutup' : 'Diumumkan dosen' },
              ]}
            />
          </section>
          <section className="u-lmsb-kartu">
            <h3 className="u-lmsb-subjudul">Percobaan saya</h3>
            {muatDari(pq) ? (
              <Skeleton style={{ height: 48 }} />
            ) : !daftar.length ? (
              <p className="u-lmsb-redup">Belum ada percobaan.</p>
            ) : (
              <ul className="u-lmsb-percobaan">
                {daftar.map((p) => (
                  <li key={p.id}>
                    <a href={p.status === 'berlangsung' ? rute.kerjakanKuis(kuisId) : rute.hasilKuis(p.id, kuisId)}>
                      <span className="u-lmsb-percobaan-no">{p.percobaan_ke}</span>
                      <span>
                        <b>{p.status === 'berlangsung' ? 'Sedang dikerjakan' : `Selesai ${waktuLms(p.selesai_at)}`}</b>
                        {p.perlu_koreksi && <small>Menunggu koreksi esai</small>}
                      </span>
                      {p.nilai != null ? (
                        <b className="u-lmsb-nilai">{formatNumber(p.nilai)}</b>
                      ) : p.status === 'berlangsung' ? (
                        <Badge variant="info">Lanjut</Badge>
                      ) : (
                        <CircleCheck className="u-lmsb-redup" />
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
      <Dialog
        open={minta}
        onOpenChange={setMinta}
        title="Kuis berkata sandi"
        description="Minta kata sandi kepada dosen pengawas."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setMinta(false)}>
              Batal
            </Button>
            <Button disabled={!sandi} onClick={() => mulai(sandi)}>
              <PlayCircle /> Mulai
            </Button>
          </>
        }
      >
        <Field label="Kata sandi">
          <Input type="password" value={sandi} onChange={(e) => setSandi(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && sandi && mulai(sandi)} />
        </Field>
      </Dialog>
    </article>
  );
}

type StatusSimpan = 'tersimpan' | 'menyimpan' | 'gagal';

/**
 * Ruang mengerjakan kuis LMS: satu soal per layar, simpan otomatis (ditunda 0,8 detik), tandai ragu, peta soal,
 * hitung mundur dari server, kirim otomatis saat waktu habis. Memakai SoalCbt, NavigasiSoal, dan TimerUjian.
 */
export function RuangKuisLms({
  kuisId,
  kataSandi,
  onSelesai,
  onKeluar,
  className,
}: {
  kuisId: number;
  kataSandi?: string;
  /** Setelah dikirim. Bawaan: pindah ke halaman hasil. */
  onSelesai?: (p: PercobaanKuis) => void;
  onKeluar?: () => void;
  className?: string;
}) {
  const siakad = useOptionalSiakad();
  const rute = useRuteLms();
  const [p, setP] = React.useState<PercobaanKuis | null>(null);
  const [galat, setGalat] = React.useState<unknown>(null);
  const [soal, setSoal] = React.useState<SoalKuisLms[]>([]);
  const [no, setNo] = React.useState(1);
  const [ragu, setRagu] = React.useState<Set<number>>(new Set());
  const [sisa, setSisa] = React.useState<number | null>(null);
  const [simpan, setSimpan] = React.useState<StatusSimpan>('tersimpan');
  const [yakin, setYakin] = React.useState(false);
  const [peta, setPeta] = React.useState(false);
  const [mengirim, setMengirim] = React.useState(false);
  const antre = React.useRef(new Map<number, unknown>());
  const pemicu = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const dimulai = React.useRef(false);

  React.useEffect(() => {
    if (dimulai.current || !siakad) return;
    dimulai.current = true;
    let sandi = kataSandi;
    try {
      sandi ??= sessionStorage.getItem(`lms-kuis-sandi-${kuisId}`) ?? undefined;
      sessionStorage.removeItem(`lms-kuis-sandi-${kuisId}`);
    } catch {
      /* abaikan */
    }
    siakad.lms
      .postKuisByIdMulai(kuisId, sandi ? { kata_sandi: sandi } : {})
      .then((r) => {
        const d = r.data as unknown as PercobaanKuis;
        setP(d);
        setSoal(d.soal ?? []);
        setSisa(d.sisa_detik ?? null);
        try {
          setRagu(new Set(JSON.parse(sessionStorage.getItem(`lms-ragu-${d.id}`) ?? '[]') as number[]));
        } catch {
          /* abaikan */
        }
      })
      .catch(setGalat);
  }, [siakad, kuisId, kataSandi]);

  const kirimAntrean = React.useCallback(async () => {
    if (!p || !siakad || !antre.current.size) return;
    const isi = [...antre.current.entries()].map(([soal_id, jawaban]) => ({ soal_id, jawaban }));
    antre.current.clear();
    setSimpan('menyimpan');
    try {
      const r = await siakad.lms.putKuisPercobaanByIdJawaban(p.id, { jawaban: isi });
      const s = (r.data as { sisa_detik?: number | null } | undefined)?.sisa_detik;
      if (s != null) setSisa(s);
      setSimpan(antre.current.size ? 'menyimpan' : 'tersimpan');
    } catch {
      isi.forEach((x) => {
        if (!antre.current.has(x.soal_id)) antre.current.set(x.soal_id, x.jawaban);
      });
      setSimpan('gagal');
      clearTimeout(pemicu.current);
      pemicu.current = setTimeout(() => void kirimAntrean(), 5000);
    }
  }, [p, siakad]);

  const jawab = (soalId: number, jawaban: JawabanCbt) => {
    setSoal((d) => d.map((s) => (s.soal_id === soalId ? { ...s, jawaban } : s)));
    antre.current.set(soalId, jawaban);
    setSimpan('menyimpan');
    clearTimeout(pemicu.current);
    pemicu.current = setTimeout(() => void kirimAntrean(), 800);
  };

  const selesai = React.useCallback(async () => {
    if (!p || !siakad || mengirim) return;
    setMengirim(true);
    try {
      clearTimeout(pemicu.current);
      await kirimAntrean();
      const r = await siakad.lms.postKuisPercobaanByIdSelesai(p.id);
      try {
        sessionStorage.removeItem(`lms-ragu-${p.id}`);
      } catch {
        /* abaikan */
      }
      segarkan();
      const hasil = { ...(r.data as unknown as PercobaanKuis), kuis_id: kuisId };
      if (onSelesai) onSelesai(hasil);
      else pindahKe(rute, rute.hasilKuis(p.id, kuisId));
    } catch (e) {
      setGalat(e);
      setMengirim(false);
    }
  }, [p, siakad, mengirim, kirimAntrean, onSelesai, rute, kuisId]);

  React.useEffect(() => {
    const f = (e: BeforeUnloadEvent) => {
      if (antre.current.size) {
        void kirimAntrean();
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', f);
    return () => window.removeEventListener('beforeunload', f);
  }, [kirimAntrean]);

  const tandaRagu = (id: number) =>
    setRagu((r) => {
      const x = new Set(r);
      if (x.has(id)) x.delete(id);
      else x.add(id);
      try {
        sessionStorage.setItem(`lms-ragu-${p?.id}`, JSON.stringify([...x]));
      } catch {
        /* abaikan */
      }
      return x;
    });

  if (galat && !p)
    return (
      <div className={cn('u-lmsb-ruang-galat', className)}>
        <Alert variant="danger" title="Kuis tidak bisa dimulai">
          {pesanGalat(galat, { kode: false })}
          <KodeLaporan error={galat} />
        </Alert>
        <Button variant="outline" onClick={() => (onKeluar ? onKeluar() : pindahKe(rute, rute.kuis(kuisId)))}>
          <ArrowLeft /> Kembali
        </Button>
      </div>
    );
  if (!p)
    return (
      <div className={cn('u-lmsb-ruang-galat', className)}>
        <Skeleton style={{ height: 320, width: '100%' }} />
        <p className="u-lmsb-redup">Menyiapkan soal…</p>
      </div>
    );

  const nomor = soal.map((s, i) => ({ ...s, nomor: i + 1, ragu: ragu.has(s.soal_id) }));
  const s = nomor[no - 1];
  const dijawab = nomor.filter((x) => x.jawaban != null && x.jawaban !== '' && !(Array.isArray(x.jawaban) && !x.jawaban.length)).length;
  const lampiran = s?.lampiran ?? [];
  const peta_ = <NavigasiSoal soal={nomor} aktif={no} onPilih={(x) => (setNo(x), setPeta(false))} />;

  return (
    <div className={cn('u-lmsb-ruang', className)}>
      <header className="u-lmsb-ruang-atas">
        <div className="u-lmsb-ruang-judul">
          <b>{p.judul ?? 'Kuis'}</b>
          <small data-status={simpan}>
            {simpan === 'menyimpan' ? (
              <>
                <Cloud aria-hidden /> Menyimpan…
              </>
            ) : simpan === 'gagal' ? (
              <>
                <CloudOff aria-hidden /> Belum tersimpan, mencoba lagi
              </>
            ) : (
              <>
                <CheckCheck aria-hidden /> Jawaban tersimpan
              </>
            )}
            <span>
              · {dijawab}/{nomor.length} dijawab
            </span>
          </small>
        </div>
        {sisa != null && <TimerUjian sisaDetik={sisa} onHabis={() => void selesai()} />}
        <Button variant="outline" size="sm" className="u-lmsb-ruang-peta-btn" onClick={() => setPeta(true)}>
          <LayoutGrid /> Soal
        </Button>
        <Button size="sm" onClick={() => setYakin(true)} loading={mengirim}>
          <Send /> Selesai
        </Button>
        <Progress value={nomor.length ? (dijawab / nomor.length) * 100 : 0} size="sm" className="u-lmsb-ruang-bar" />
      </header>
      <div className="u-lmsb-ruang-isi">
        <main>
          {s && (
            <div className="u-lmsb-ruang-soal" key={s.soal_id}>
              <div className="u-lmsb-ruang-soal-atas">
                <Badge variant="primary">
                  Soal {no} dari {nomor.length}
                </Badge>
                <Button size="xs" variant={ragu.has(s.soal_id) ? 'soft' : 'ghost'} onClick={() => tandaRagu(s.soal_id)} aria-pressed={ragu.has(s.soal_id)}>
                  <Flag /> {ragu.has(s.soal_id) ? 'Ragu-ragu' : 'Tandai ragu'}
                </Button>
              </div>
              <SoalCbt soal={{ ...s, poin: s.poin_maks ?? s.poin ?? 0, ragu: ragu.has(s.soal_id) } as SoalCbtData} onJawab={(j) => jawab(s.soal_id, j)} />
              {lampiran.length > 0 && <LampiranSoal files={lampiran} />}
            </div>
          )}
          <div className="u-lmsb-aksi u-lmsb-aksi-antara">
            <Button variant="outline" disabled={no <= 1} onClick={() => setNo((x) => x - 1)}>
              <ArrowLeft /> Sebelumnya
            </Button>
            {no < nomor.length ? (
              <Button onClick={() => setNo((x) => x + 1)}>
                Berikutnya <ArrowRight />
              </Button>
            ) : (
              <Button onClick={() => setYakin(true)}>
                <Send /> Selesai &amp; kirim
              </Button>
            )}
          </div>
        </main>
        <aside className="u-lmsb-ruang-samping">
          <h3 className="u-lmsb-subjudul">Navigasi soal</h3>
          {peta_}
        </aside>
      </div>
      <Sheet open={peta} onOpenChange={setPeta} side="bottom" title="Navigasi soal">
        {peta_}
      </Sheet>
      <ConfirmDialog
        open={yakin}
        onOpenChange={setYakin}
        tone="primary"
        title="Kirim jawaban sekarang?"
        description={`${dijawab} dari ${nomor.length} soal sudah dijawab.${ragu.size ? ` ${ragu.size} soal masih ditandai ragu-ragu.` : ''} Setelah dikirim, jawaban tidak bisa diubah.`}
        confirmLabel="Kirim jawaban"
        onConfirm={selesai}
      >
        {dijawab < nomor.length && (
          <Alert variant="warning" title="Masih ada soal yang belum dijawab">
            Periksa peta soal sebelum mengirim.
          </Alert>
        )}
        {galat != null && (
          <Alert variant="danger">
            {pesanGalat(galat, { kode: false })}
            <KodeLaporan error={galat} />
          </Alert>
        )}
      </ConfirmDialog>
    </div>
  );
}

function LampiranSoal({ files }: { files: FileLms[] }) {
  const url = useFileUrl();
  const gambar = files.filter((f) => (f.mime ?? '').startsWith('image/'));
  const lain = files.filter((f) => !(f.mime ?? '').startsWith('image/'));
  return (
    <div className="u-lmsb-lampiran-soal">
      {gambar.map((f, i) => (
        <img key={f.uuid ?? i} src={url(f.url) ?? ''} alt={f.nama} />
      ))}
      <DaftarLampiranLms files={lain} />
    </div>
  );
}

const HURUF = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** Pembahasan satu soal: jawaban saya dibandingkan kunci, poin, umpan balik, dan pembahasan dosen. */
export function PembahasanSoalLms({ soal: s, className }: { soal: SoalKuisLms; className?: string }) {
  const kunci = s.kunci;
  const adaKunci = kunci !== undefined && kunci !== null;
  const opsi = Array.isArray(s.opsi) ? s.opsi : [];
  const j = s.jawaban;
  const nada = s.benar === true ? 'benar' : s.benar === false ? 'salah' : 'koreksi';
  return (
    <section className={cn('u-lmsb-bahas', className)} data-nada={nada}>
      <header>
        <Badge variant="neutral">Soal {s.nomor}</Badge>
        <small>{JENIS_SOAL[s.jenis] ?? s.jenis}</small>
        <span>
          {s.benar === true ? (
            <Badge variant="success">
              <Check /> Benar · {s.poin ?? 0}/{s.poin_maks ?? 0}
            </Badge>
          ) : s.benar === false ? (
            <Badge variant="danger">
              <X /> {s.poin ? `Sebagian · ${s.poin}/${s.poin_maks}` : `Salah · 0/${s.poin_maks ?? 0}`}
            </Badge>
          ) : (
            <Badge variant="warning">{s.poin != null ? `${s.poin}/${s.poin_maks}` : 'Dikoreksi dosen'}</Badge>
          )}
        </span>
      </header>
      <IsiHtmlLms html={s.pertanyaan} />
      {(s.jenis === 'pilihan_ganda' || s.jenis === 'pilihan_ganda_banyak') && (
        <ul className="u-lmsb-bahas-opsi">
          {opsi.map((o, i) => {
            const banyak = s.jenis === 'pilihan_ganda_banyak';
            const dipilih = banyak ? Array.isArray(j) && (j as string[]).includes(o.id) : j === o.id;
            const benar = adaKunci ? (banyak ? Array.isArray(kunci) && (kunci as string[]).includes(o.id) : kunci === o.id) : null;
            return (
              <li key={o.id} data-dipilih={dipilih || undefined} data-tanda={benar ? 'benar' : dipilih && benar === false ? 'salah' : undefined}>
                <span className="u-cbt-huruf">{HURUF[i]}</span>
                <span dangerouslySetInnerHTML={{ __html: o.teks }} />
                {benar ? <Check aria-label="Kunci" /> : dipilih && benar === false ? <X aria-label="Jawaban salah" /> : null}
              </li>
            );
          })}
        </ul>
      )}
      {s.jenis === 'benar_salah' && (
        <ul className="u-lmsb-bahas-opsi" data-dua>
          {[true, false].map((v) => (
            <li key={String(v)} data-dipilih={j === v || undefined} data-tanda={adaKunci && kunci === v ? 'benar' : j === v && adaKunci ? 'salah' : undefined}>
              <span className="u-cbt-huruf">{v ? 'B' : 'S'}</span>
              <span>{v ? 'Benar' : 'Salah'}</span>
            </li>
          ))}
        </ul>
      )}
      {(s.jenis === 'isian_singkat' || s.jenis === 'esai') && (
        <div className="u-lmsb-bahas-jawab">
          <small>Jawaban Anda</small>
          <p>{(j as string) || '–'}</p>
          {Array.isArray(kunci) && <small className="u-lmsb-ok">Jawaban yang diterima: {(kunci as string[]).join(' / ')}</small>}
        </div>
      )}
      {s.jenis === 'menjodohkan' && s.opsi && !Array.isArray(s.opsi) && (
        <ul className="u-lmsb-bahas-jodoh">
          {s.opsi.kiri.map((ki) => {
            const peta = (j as Record<string, string> | null) ?? {};
            const kn = kunci as Record<string, string> | undefined;
            const pilihan = (s.opsi as { kanan: { id: string; teks: string }[] }).kanan;
            const pasang = pilihan.find((x) => x.id === peta[ki.id]);
            const benar = kn ? pilihan.find((x) => x.id === kn[ki.id]) : undefined;
            return (
              <li key={ki.id} data-tanda={kn ? (kn[ki.id] === peta[ki.id] ? 'benar' : 'salah') : undefined}>
                <span dangerouslySetInnerHTML={{ __html: ki.teks }} />
                <ArrowRight aria-hidden />
                <span>{pasang ? teksPolosLms(pasang.teks) : '–'}</span>
                {kn && kn[ki.id] !== peta[ki.id] && benar && <small className="u-lmsb-ok">Benar: {teksPolosLms(benar.teks)}</small>}
              </li>
            );
          })}
        </ul>
      )}
      {s.umpan_balik && (
        <Alert variant="info" title="Umpan balik">
          {s.umpan_balik}
        </Alert>
      )}
      {s.pembahasan && (
        <div className="u-lmsb-bahas-isi">
          <small>Pembahasan</small>
          <IsiHtmlLms html={s.pembahasan} />
        </div>
      )}
    </section>
  );
}

/** Hasil satu percobaan kuis: nilai, ringkasan benar/salah, lalu pembahasan per soal bila dibuka dosen. */
export function HasilKuisLms({ percobaanId, kuisId, className }: { percobaanId: number; kuisId?: number; className?: string }) {
  const q = usePercobaanKuis(percobaanId);
  const p = q.data;
  const kid = p?.kuis_id ?? kuisId;
  const kq = useKuisLms(kid);
  const kelasQ = useKelasLmsDetail(kq.data?.kelas_id);
  const rute = useRuteLms();
  if (q.error) return <Galat q={q} judul="Hasil tidak tersedia" />;
  if (!p) return <Skeleton className={className} style={{ height: 380 }} />;
  const k = kq.data;
  const soal = p.soal ?? [];
  const benar = soal.filter((s) => s.benar === true).length;
  const salah = soal.filter((s) => s.benar === false).length;
  const koreksi = soal.filter((s) => s.benar == null).length;
  const persen = p.nilai != null ? (p.nilai / (k?.nilai_maks ?? 100)) * 100 : null;
  return (
    <article className={cn('u-lmsb-halaman', className)}>
      <header className="u-lmsb-judul">
        <a className="u-lmsb-kembali" href={kid ? rute.kuis(kid) : '/'}>
          <ArrowLeft aria-hidden /> {k?.judul ?? 'Kembali'}
        </a>
        <div className="u-lmsb-judul-baris">
          <span className="u-lmsb-item-ikon" data-jenis="kuis" data-besar>
            <FileQuestion />
          </span>
          <div>
            <h1>Hasil percobaan {p.percobaan_ke}</h1>
            <p>{p.selesai_at ? `Dikirim ${waktuLms(p.selesai_at)}` : 'Belum dikirim'}</p>
          </div>
        </div>
      </header>
      <div className="u-lmsb-hasil">
        <div className="u-lmsb-hasil-nilai">
          <ProgressRing
            value={persen ?? 0}
            size={132}
            thickness={10}
            tone={nadaNilaiLms(persen, kelasQ.data?.aturan?.skala)}
            label={
              <span className="u-lmsb-hasil-angka">
                <b>{p.nilai != null ? formatNumber(p.nilai, { maximumFractionDigits: 1 }) : '–'}</b>
                <small>dari {k?.nilai_maks ?? 100}</small>
              </span>
            }
          />
          {p.skor != null && (
            <small>
              Skor {formatNumber(p.skor)} dari {formatNumber(p.skor_maks)} poin
            </small>
          )}
        </div>
        <StatGrid min={140}>
          <StatCard label="Benar" value={p.hasil_terbuka ? benar : '–'} icon={<CircleCheck />} />
          <StatCard label="Salah" value={p.hasil_terbuka ? salah : '–'} icon={<CircleX />} />
          <StatCard label="Dikoreksi dosen" value={p.hasil_terbuka ? koreksi : '–'} icon={<Clock />} />
        </StatGrid>
      </div>
      {p.perlu_koreksi && (
        <Alert variant="info" title="Menunggu koreksi">
          Ada soal esai yang dinilai dosen. Nilai akhir bisa berubah setelah dikoreksi.
        </Alert>
      )}
      {!p.hasil_terbuka ? (
        <Alert variant="neutral" title="Jawaban sudah terkirim">
          {k?.tampil_hasil === 'setelah_tutup' ? 'Rincian hasil dibuka setelah kuis ditutup.' : 'Rincian hasil diumumkan oleh dosen.'}
        </Alert>
      ) : (
        <div className="u-lmsb-tumpuk">
          {soal.map((s) => (
            <PembahasanSoalLms key={s.soal_id} soal={s} />
          ))}
        </div>
      )}
      {k && (
        <div className="u-lmsb-aksi">
          <Button variant="outline" render={<a href={rute.kelas(k.kelas_id)} />}>
            <ArrowLeft /> Kembali ke kelas
          </Button>
        </div>
      )}
    </article>
  );
}

// ================================================================ Forum
/** Forum satu kelas: pengumuman dan diskusi. */
export function DaftarForumKelasLms({ kelasId, className }: { kelasId: number; className?: string }) {
  const q = useForumKelas(kelasId);
  const rute = useRuteLms();
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 140 }} />;
  const data = q.data ?? [];
  if (!data.length) return <Empty icon={<MessageSquare />} title="Belum ada forum" description="Forum diskusi dibuat oleh dosen." bordered className={className} />;
  return (
    <div className={cn('u-lmsb-grid-aktivitas', className)}>
      {data.map((f) => {
        const umum = f.jenis === 'pengumuman';
        return (
          <a key={f.id} className="u-lmsb-kartu-aktivitas" href={rute.forum(f.id, kelasId)}>
            <span className="u-lmsb-item-ikon" data-jenis={umum ? 'pengumuman' : 'forum'}>
              {umum ? <Megaphone /> : <MessagesSquare />}
            </span>
            <span className="u-lmsb-item-teks">
              <b>
                {f.judul} {f.terkunci && <Lock className="u-lmsb-ikon-kecil" aria-label="Terkunci" />}
              </b>
              {f.deskripsi && <small className="u-lmsb-dua-baris">{teksPolosLms(f.deskripsi)}</small>}
              <small>
                {f.jumlah_utas ?? 0} utas{f.post_terakhir ? ` · aktif ${relatif(f.post_terakhir)}` : ''}
              </small>
            </span>
            <Badge variant={umum ? 'warning' : 'secondary'}>{umum ? 'Pengumuman' : 'Diskusi'}</Badge>
          </a>
        );
      })}
    </div>
  );
}

/** Daftar utas di satu forum + tombol mulai diskusi baru. Meta forum diambil dari daftar forum kelas (`kelasId`). */
export function UtasForumLms({ forumId, kelasId, onUtasDibuat, className }: { forumId: number; kelasId?: number; onUtasDibuat?: (p: PostForumLms) => void; className?: string }) {
  const daftar = useForumKelas(kelasId);
  const kelas = useKelasLmsDetail(kelasId);
  const [hal, setHal] = React.useState(1);
  const q = useUtasForum(forumId, hal);
  const rute = useRuteLms();
  const [baru, setBaru] = React.useState(false);
  const [cari, setCari] = React.useState('');
  const [urut, setUrut] = React.useState<'aktif' | 'terbaru' | 'belum'>('aktif');
  const f = daftar.data?.find((x) => x.id === forumId);
  const kata = cari.trim().toLowerCase();
  // Cari dan urut berlaku pada halaman yang sedang dimuat; urutan bawaan server: disematkan, lalu terakhir aktif.
  const utas = (q.data ?? [])
    .filter((u) => !kata || `${u.judul ?? ''} ${teksPolosLms(u.isi)} ${u.penulis?.nama ?? ''}`.toLowerCase().includes(kata))
    .filter((u) => urut !== 'belum' || !u.jumlah_balasan)
    .sort((a, b) => (urut === 'terbaru' ? (b.created_at ?? '').localeCompare(a.created_at ?? '') : 0));
  const totalHal = q.meta?.total_pages ?? 1;
  const pengumuman = f?.jenis === 'pengumuman';
  const bisaTulis = !!f && !f.terkunci && !pengumuman;
  return (
    <article className={cn('u-lmsb-halaman', className)}>
      <header className="u-lmsb-judul">
        {kelasId ? (
          <a className="u-lmsb-kembali" href={rute.kelas(kelasId, 'forum')}>
            <ArrowLeft aria-hidden /> {kelas.data?.judul ? namaKelasRapiLms(kelas.data.judul) : 'Kembali ke kelas'}
          </a>
        ) : null}
        <div className="u-lmsb-judul-baris">
          <span className="u-lmsb-item-ikon" data-jenis={pengumuman ? 'pengumuman' : 'forum'} data-besar>
            {pengumuman ? <Megaphone /> : <MessagesSquare />}
          </span>
          <div>
            <h1>{f?.judul ?? 'Forum'}</h1>
            <p>{f?.deskripsi ? teksPolosLms(f.deskripsi) : pengumuman ? 'Pengumuman dari dosen' : 'Diskusi kelas'}</p>
          </div>
          {bisaTulis ? (
            <Button onClick={() => setBaru(true)}>
              <Plus /> Diskusi baru
            </Button>
          ) : f?.terkunci ? (
            <Badge variant="neutral">
              <Lock /> Terkunci
            </Badge>
          ) : null}
        </div>
      </header>
      {(q.data?.length ?? 0) > 0 && (
        <div className="u-lmsb-utas-alat">
          <InputGroup start={<Search />} size="sm" className="u-lmsb-cari">
            <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari utas…" aria-label="Cari utas" />
          </InputGroup>
          <SegmentedControl
            value={urut}
            onValueChange={setUrut}
            aria-label="Urutkan utas"
            options={[
              { value: 'aktif', label: 'Terakhir aktif' },
              { value: 'terbaru', label: 'Terbaru' },
              { value: 'belum', label: 'Belum dibalas' },
            ]}
          />
        </div>
      )}
      {q.error ? (
        <Galat q={q} />
      ) : muatDari(q) ? (
        <Skeleton style={{ height: 200 }} />
      ) : q.data?.length && !utas.length ? (
        <Empty icon={<MessageSquare />} title="Tidak ada utas yang cocok" description="Ubah kata kunci atau urutan." bordered />
      ) : !q.data?.length ? (
        <Empty
          icon={<MessageSquare />}
          title="Belum ada diskusi"
          description={pengumuman ? 'Belum ada pengumuman.' : 'Jadilah yang pertama bertanya.'}
          actions={
            bisaTulis ? (
              <Button onClick={() => setBaru(true)}>
                <Plus /> Diskusi baru
              </Button>
            ) : undefined
          }
          bordered
        />
      ) : (
        <ul className="u-lmsb-utas">
          {utas.map((u) => (
            <li key={u.id}>
              <a href={rute.utas(u.id)}>
                <Avatar name={u.penulis?.nama ?? '?'} src={u.penulis?.foto} size="md" />
                <span className="u-lmsb-utas-isi">
                  <b>{u.judul}</b>
                  {pengumuman ? <IsiHtmlLms html={u.isi} /> : <small className="u-lmsb-dua-baris">{teksPolosLms(u.isi)}</small>}
                  <small>
                    {u.disematkan && <Badge variant="warning">Disematkan</Badge>} <span>{u.penulis?.nama}</span>
                    {u.penulis?.level && u.penulis.level !== 'MAHASISWA' && <Badge variant="primary">Dosen</Badge>}
                    {u.created_at && <span>· {relatif(u.created_at)}</span>}
                  </small>
                </span>
                <span className="u-lmsb-utas-balas">
                  <b>{u.jumlah_balasan ?? 0}</b>
                  <small>balasan</small>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {totalHal > 1 && <Pagination page={hal} totalPages={totalHal} total={q.meta?.total ?? undefined} perPage={20} onPageChange={setHal} />}
      <UtasBaruLms forumId={forumId} open={baru} onOpenChange={setBaru} onDibuat={(p) => (onUtasDibuat ? onUtasDibuat(p) : pindahKe(rute, rute.utas(p.id)))} />
    </article>
  );
}

/** Dialog memulai utas diskusi baru. */
export function UtasBaruLms({ forumId, open, onOpenChange, onDibuat }: { forumId: number; open: boolean; onOpenChange: (o: boolean) => void; onDibuat?: (p: PostForumLms) => void }) {
  const { jalan, sibuk, galat } = useAksi();
  const toast = useToast();
  const [judul, setJudul] = React.useState('');
  const [isi, setIsi] = React.useState('');
  const kirim = () =>
    jalan((s) => s.lms.postForumByIdPost(forumId, { judul: judul.trim(), isi: teksKeHtmlLms(isi) } as never))
      .then((r) => {
        segarkan();
        toast.add({ title: 'Utas dibuat', type: 'success' });
        setJudul('');
        setIsi('');
        onOpenChange(false);
        if (r) onDibuat?.(r.data as unknown as PostForumLms);
      })
      .catch(() => undefined);
  return (
    <Dialog
      side="right"
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Mulai diskusi baru"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button loading={sibuk} disabled={!judul.trim() || !isi.trim()} onClick={kirim}>
            <Send /> Kirim
          </Button>
        </>
      }
    >
      <div className="u-lmsb-tumpuk">
        <Field label="Judul" required>
          <Input value={judul} onChange={(e) => setJudul(e.target.value)} maxLength={200} placeholder="Ringkas pertanyaan atau topik Anda" autoFocus />
        </Field>
        <Field label="Isi" required error={galat ? pesanGalat(galat, { kode: false }) : undefined}>
          <Textarea value={isi} onChange={(e) => setIsi(e.target.value)} rows={7} placeholder="Jelaskan pertanyaan atau pendapat Anda…" />
        </Field>
      </div>
    </Dialog>
  );
}

/** Satu kiriman forum dengan balasan bertingkat. */
export function KirimanForumLms({ post: p, onBalas, tingkat = 0 }: { post: PostForumLms; onBalas?: (p: PostForumLms) => void; tingkat?: number }) {
  const dosen = p.penulis?.level && p.penulis.level !== 'MAHASISWA';
  return (
    <div className="u-lmsb-kiriman" data-tingkat={Math.min(tingkat, 3)}>
      <Avatar name={p.penulis?.nama ?? '?'} src={p.penulis?.foto} size={tingkat ? 'sm' : 'md'} />
      <div className="u-lmsb-kiriman-isi">
        <p className="u-lmsb-kiriman-penulis">
          <b>{p.penulis?.nama ?? 'Pengguna'}</b>
          {dosen && <Badge variant="primary">Dosen</Badge>}
          {p.created_at && <small>{relatif(p.created_at)}</small>}
          {p.diedit && <small>(diedit)</small>}
        </p>
        {tingkat === 0 && p.judul && <h2>{p.judul}</h2>}
        <IsiHtmlLms html={p.isi} />
        <DaftarLampiranLms files={p.lampiran} />
        {onBalas && (
          <Button size="xs" variant="ghost" onClick={() => onBalas(p)}>
            <Reply /> Balas
          </Button>
        )}
        {!!p.balasan?.length && (
          <div className="u-lmsb-kiriman-balasan">
            {p.balasan.map((b) => (
              <KirimanForumLms key={b.id} post={b} onBalas={onBalas} tingkat={tingkat + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Satu utas lengkap: kiriman awal, pohon balasan (dari induk_id), dan kotak balas. */
export function DiskusiLms({ postId, className }: { postId: number; className?: string }) {
  const q = useUtasLms(postId);
  const rute = useRuteLms();
  const toast = useToast();
  const { jalan, sibuk } = useAksi();
  const [isi, setIsi] = React.useState('');
  const [balasKe, setBalasKe] = React.useState<PostForumLms | null>(null);
  const kotak = React.useRef<HTMLDivElement>(null);
  if (q.error) return <Galat q={q} judul="Diskusi tidak tersedia" />;
  const d = q.data;
  if (!d) return <Skeleton className={className} style={{ height: 320 }} />;
  const semua = d.balasan.map((b) => ({ ...b, balasan: [] as PostForumLms[] }));
  const peta = new Map(semua.map((b) => [b.id, b]));
  const akar: PostForumLms[] = [];
  for (const b of semua) {
    const induk = b.induk_id && b.induk_id !== postId ? peta.get(b.induk_id) : null;
    if (induk) induk.balasan.push(b);
    else akar.push(b);
  }
  const bisaBalas = !d.forum.terkunci && d.forum.jenis !== 'pengumuman';
  const balas = bisaBalas
    ? (p: PostForumLms) => {
        setBalasKe(p.id === postId ? null : p);
        kotak.current?.querySelector('textarea')?.focus();
      }
    : undefined;
  const kirim = () =>
    jalan((s) => s.lms.postForumByIdPost(d.forum.id, { induk_id: balasKe?.id ?? postId, isi: teksKeHtmlLms(isi) } as never))
      .then(() => {
        setIsi('');
        setBalasKe(null);
        segarkan();
        toast.add({ title: 'Balasan terkirim', type: 'success' });
      })
      .catch((e) => toast.add({ title: 'Gagal mengirim', description: pesanGalat(e), type: 'error' }));
  return (
    <article className={cn('u-lmsb-halaman u-lmsb-sempit', className)}>
      <header className="u-lmsb-judul">
        <a className="u-lmsb-kembali" href={rute.forum(d.forum.id, d.forum.kelas_id)}>
          <ArrowLeft aria-hidden /> {d.forum.judul}
        </a>
      </header>
      <div className="u-lmsb-kartu">
        <KirimanForumLms post={{ ...d.utas, balasan: akar }} onBalas={balas} />
      </div>
      {bisaBalas && (
        <div className="u-lmsb-balas" ref={kotak}>
          {balasKe && (
            <p className="u-lmsb-redup">
              Membalas <b>{balasKe.penulis?.nama}</b>{' '}
              <Button size="xs" variant="ghost" iconOnly aria-label="Batal membalas" onClick={() => setBalasKe(null)}>
                <X />
              </Button>
            </p>
          )}
          <Textarea value={isi} onChange={(e) => setIsi(e.target.value)} rows={3} placeholder="Tulis balasan…" aria-label="Balasan" />
          <div className="u-lmsb-aksi">
            <Button loading={sibuk} disabled={!isi.trim()} onClick={kirim}>
              <Send /> Kirim balasan
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

// ================================================================ Presensi
/** Dialog mengisi presensi dengan kode yang ditampilkan dosen. */
export function IsiPresensiLms({ sesi, onTutup }: { sesi: Pick<SesiPresensiLms, 'id' | 'pertemuan_ke'> | null; onTutup: () => void }) {
  const { jalan, sibuk, galat, setGalat } = useAksi();
  const toast = useToast();
  const [kode, setKode] = React.useState('');
  const kirim = () =>
    jalan((s) => s.lms.postPresensiByIdHadir(sesi!.id, { kode: kode.trim() }))
      .then(() => {
        segarkan();
        toast.add({ title: 'Presensi tercatat', description: `Anda hadir di pertemuan ${sesi!.pertemuan_ke}.`, type: 'success' });
        setKode('');
        onTutup();
      })
      .catch(() => undefined);
  return (
    <Dialog
      open={!!sesi}
      onOpenChange={(o) => {
        if (!o) {
          setGalat(null);
          onTutup();
        }
      }}
      size="sm"
      title={`Presensi pertemuan ${sesi?.pertemuan_ke ?? ''}`}
      description="Masukkan kode presensi yang ditampilkan dosen."
      footer={
        <>
          <Button variant="outline" onClick={onTutup}>
            Batal
          </Button>
          <Button loading={sibuk} disabled={kode.trim().length < 4} onClick={kirim}>
            <UserCheck /> Kirim kehadiran
          </Button>
        </>
      }
    >
      <Field label="Kode presensi" error={galat ? pesanGalat(galat, { kode: false }) : undefined}>
        <Input
          value={kode}
          onChange={(e) => setKode(e.target.value.toUpperCase())}
          maxLength={10}
          autoFocus
          className="u-lmsb-kode"
          autoComplete="off"
          onKeyDown={(e) => e.key === 'Enter' && kode.trim().length >= 4 && kirim()}
        />
      </Field>
    </Dialog>
  );
}

/** Presensi satu kelas: sesi yang dibuka, daftar pertemuan dengan status saya, dan rekap kehadiran. */
export function PresensiKelasLms({ kelasId, minimal: minimalProp, className }: { kelasId: number; /** Batas minimal kehadiran (%) untuk ikut UAS; bawaan dari aturan kelas (ber-SK). */ minimal?: number; className?: string }) {
  const q = usePresensiKelas(kelasId);
  const kd = useKelasLmsDetail(kelasId);
  const hadirMin = kd.data?.aturan?.hadir_min;
  const minimal = minimalProp ?? hadirMin?.nilai ?? HADIR_MIN_BAWAAN;
  const [isi, setIsi] = React.useState<SesiPresensiLms | null>(null);
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 240 }} />;
  const sesi = q.data?.sesi ?? [];
  const r = q.data?.rekap;
  const terbuka = sesi.filter((s) => s.terbuka && !s.presensi_saya);
  const persen = r?.persen_hadir ?? 0;
  return (
    <div className={cn('u-lmsb-dua-kolom', className)}>
      <div className="u-lmsb-tumpuk">
        {terbuka.map((s) => (
          <Alert
            key={s.id}
            variant="success"
            title={`Presensi pertemuan ${s.pertemuan_ke} sedang dibuka`}
            actions={
              <Button size="sm" onClick={() => setIsi(s)}>
                <UserCheck /> Isi presensi
              </Button>
            }
          >
            Masukkan kode dari dosen sebelum sesi ditutup.
          </Alert>
        ))}
        {!sesi.length ? (
          <Empty icon={<CalendarCheck />} title="Belum ada sesi presensi" description="Sesi dibuat dosen setiap pertemuan." bordered />
        ) : (
          <ul className="u-lmsb-sesi">
            {sesi.map((s) => {
              const st = s.presensi_saya ? STATUS_HADIR[s.presensi_saya.status] : null;
              return (
                <li key={s.id} data-terbuka={s.terbuka || undefined}>
                  <span className="u-lmsb-sesi-no">{s.pertemuan_ke}</span>
                  <span className="u-lmsb-item-teks">
                    <b>{s.bahasan || `Pertemuan ${s.pertemuan_ke}`}</b>
                    <small>
                      {formatDate(s.tanggal, 'full')}
                      {s.jam_mulai ? ` · ${s.jam_mulai.slice(0, 5)}${s.jam_selesai ? `–${s.jam_selesai.slice(0, 5)}` : ''}` : ''}
                    </small>
                  </span>
                  {st ? (
                    <Badge variant={st.variant} dot>
                      {st.label}
                    </Badge>
                  ) : s.terbuka ? (
                    <Button size="sm" onClick={() => setIsi(s)}>
                      Isi
                    </Button>
                  ) : (tglLms(s.tanggal)?.getTime() ?? 0) <= Date.now() ? (
                    <Badge variant="neutral">Belum diisi</Badge>
                  ) : (
                    <small className="u-lmsb-redup">Akan datang</small>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <aside className="u-lmsb-kartu u-lmsb-rekap">
        <h3 className="u-lmsb-subjudul">Rekap kehadiran</h3>
        <ProgressRing value={persen} size={112} thickness={9} tone={persen >= minimal ? 'success' : 'warning'} label={<b>{Math.round(persen)}%</b>} />
        <ul className="u-lmsb-rekap-angka">
          {(['H', 'I', 'S', 'A'] as const).map((k) => (
            <li key={k} data-k={k}>
              <b>{r?.[k] ?? 0}</b>
              <small>{STATUS_HADIR[k]!.label}</small>
            </li>
          ))}
        </ul>
        <p className="u-lmsb-redup">
          {persen >= minimal ? `Kehadiran memenuhi syarat ${formatNumber(minimal)}% untuk ikut UAS.` : `Kehadiran di bawah ${formatNumber(minimal)}%, syarat ikut UAS.`}
          {hadirMin && <small className="u-lmsb-redup"> {hadirMin.sumber === 'bawaan' ? 'Batas bawaan sistem; BAAK belum menetapkan aturannya.' : `Dasar: ${hadirMin.keterangan}.`}</small>}
          {r?.belum ? ` ${r.belum} sesi belum diisi.` : ''}
        </p>
      </aside>
      <IsiPresensiLms sesi={isi} onTutup={() => setIsi(null)} />
    </div>
  );
}

// ================================================================ Nilai
/** Buku nilai mahasiswa di satu kelas + perkiraan nilai akhir dengan bobot komponen SIAKAD. */
export function NilaiKelasSayaLms({ kelasId, className }: { kelasId: number; className?: string }) {
  const q = useNilaiKelas(kelasId);
  const kd = useKelasLmsDetail(kelasId);
  const rute = useRuteLms();
  if (q.error) return <Galat q={q} />;
  if (muatDari(q) || !q.data) return <Skeleton className={className} style={{ height: 240 }} />;
  const d = q.data;
  if (!d.item.length) return <Empty icon={<GraduationCap />} title="Buku nilai masih kosong" description="Nilai tugas dan kuis muncul setelah dinilai dosen." bordered className={className} />;
  const saya = new Map((d.mahasiswa?.nilai ?? []).map((x) => [x.item_id, x]));
  const ke = (i: ItemNilaiLms) => (i.sumber_id && i.sumber === 'tugas' ? rute.tugas(i.sumber_id) : i.sumber_id && i.sumber === 'kuis' ? rute.kuis(i.sumber_id) : null);
  return (
    <div className={cn('u-lmsb-dua-kolom', className)}>
      <section className="u-lmsb-kartu u-lmsb-kartu-tabel">
        <h3 className="u-lmsb-subjudul">Buku nilai</h3>
        <ul className="u-lmsb-nilai-daftar">
          {d.item.map((i) => {
            const v = saya.get(i.id);
            const href = ke(i);
            return (
              <li key={i.id}>
                <span className="u-lmsb-item-ikon" data-jenis={i.sumber === 'kuis' ? 'kuis' : i.sumber === 'tugas' ? 'tugas' : 'materi'}>
                  {i.sumber === 'kuis' ? <FileQuestion /> : i.sumber === 'tugas' ? <ClipboardList /> : <Star />}
                </span>
                <span className="u-lmsb-item-teks">
                  {href ? (
                    <a href={href}>
                      <b>{i.nama}</b>
                    </a>
                  ) : (
                    <b>{i.nama}</b>
                  )}
                  <small>
                    {KOMPONEN_NILAI[i.komponen] ?? i.komponen}
                    {v?.catatan ? ` · ${v.catatan}` : ''}
                  </small>
                </span>
                {v?.nilai != null ? (
                  <b className="u-lmsb-nilai">
                    {formatNumber(v.nilai)}
                    <small>/{i.nilai_maks}</small>
                  </b>
                ) : (
                  <span className="u-lmsb-redup">–</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <aside className="u-lmsb-kartu">
        <h3 className="u-lmsb-subjudul">Perkiraan nilai akhir</h3>
        {d.mahasiswa?.nilai_akhir_perkiraan != null && (
          <p className="u-lmsb-perkiraan">
            {formatNumber(d.mahasiswa.nilai_akhir_perkiraan, { maximumFractionDigits: 1 })}
            <small> /100</small>
          </p>
        )}
        <ul className="u-lmsb-komponen">
          {Object.entries(d.persen_siakad).map(([k, persen]) => {
            const v = d.mahasiswa?.komponen?.[k];
            return (
              <li key={k}>
                <span>
                  {KOMPONEN_NILAI[k] ?? k} <small>({persen}%)</small>
                </span>
                <b>{v != null ? formatNumber(v, { maximumFractionDigits: 1 }) : <small>dari SIAKAD</small>}</b>
                <Progress value={v ?? 0} size="sm" tone={nadaNilaiLms(v, kd.data?.aturan?.skala)} />
              </li>
            );
          })}
        </ul>
        <p className="u-lmsb-redup">Perkiraan dari aktivitas LMS saja. Nilai UTS, UAS, dan nilai huruf resmi ada di KHS SIAKAD setelah dosen mengimpor nilai.</p>
      </aside>
    </div>
  );
}

/** Rekap semua kelas: kehadiran, aktivitas dinilai, dan perkiraan nilai per mata kuliah. */
export function RekapNilaiKelasLms({ kelas, className }: { kelas: KelasLms[] | undefined; className?: string }) {
  const ids = kelas?.map((k) => k.id);
  const nq = useSemuaKelasLms<BukuNilaiSaya>(ids, 'nilai');
  const pq = useSemuaKelasLms<PresensiKelasData>(ids, 'presensi');
  const rute = useRuteLms();
  if (nq.error) return <Galat q={nq} />;
  if (!kelas || muatDari(nq)) return <Skeleton className={className} style={{ height: 200 }} />;
  if (!kelas.length) return <Empty icon={<GraduationCap />} title="Belum ada kelas" bordered className={className} />;
  const nilai = new Map((nq.data ?? []).map((x) => [x.kelas_id, x.data]));
  const hadir = new Map((pq.data ?? []).map((x) => [x.kelas_id, x.data?.rekap?.persen_hadir ?? null]));
  return (
    <ul className={cn('u-lmsb-rekap-kelas', className)}>
      {kelas.map((k) => {
        const n = nilai.get(k.id);
        const h = hadir.get(k.id);
        const dinilai = (n?.mahasiswa?.nilai ?? []).filter((x) => x.nilai != null).length;
        return (
          <li key={k.id}>
            <a href={rute.kelas(k.id, 'nilai')}>
              <span className="u-lmsb-item-teks">
                <b>{namaKelasRapiLms(k.judul)}</b>
                <small>
                  {k.kode_mk}
                  {n ? ` · ${dinilai}/${n.item.length} dinilai` : ''}
                </small>
              </span>
              <span className="u-lmsb-rekap-hadir">
                <Progress value={h ?? 0} size="sm" tone={h == null ? undefined : h >= (k.aturan?.hadir_min.nilai ?? HADIR_MIN_BAWAAN) ? 'success' : 'danger'} />
                <small>{h != null ? `${Math.round(h)}% hadir` : 'Kehadiran –'}</small>
              </span>
              <b className="u-lmsb-nilai">{n?.mahasiswa?.nilai_akhir_perkiraan != null ? formatNumber(n.mahasiswa.nilai_akhir_perkiraan, { maximumFractionDigits: 1 }) : '–'}</b>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

// ================================================================ Peserta & info
/** Pengajar dan mahasiswa satu kelas. */
export function PesertaKelasLms({ kelasId, className }: { kelasId: number; className?: string }) {
  const q = usePesertaKelas(kelasId);
  const [cari, setCari] = React.useState('');
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 200 }} />;
  const pengajar = (q.data ?? []).filter((p) => p.peran !== 'mahasiswa');
  const t = cari.trim().toLowerCase();
  const mhs = (q.data ?? []).filter((p) => p.peran === 'mahasiswa').filter((p) => !t || `${p.nama ?? ''} ${p.username}`.toLowerCase().includes(t));
  return (
    <div className={cn('u-lmsb-dua-kolom u-lmsb-dua-kolom-kiri', className)}>
      <section className="u-lmsb-kartu">
        <h3 className="u-lmsb-subjudul">Pengajar</h3>
        <ul className="u-lmsb-orang">
          {pengajar.map((p) => (
            <li key={p.username}>
              <Avatar name={p.nama ?? p.username} size="md" />
              <span>
                <b>{p.nama ?? p.username}</b>
                <small>{p.peran === 'asisten' ? 'Asisten' : p.peran === 'pengajar' ? 'Dosen pengampu' : p.peran}</small>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="u-lmsb-kartu">
        <header className="u-lmsb-kartu-kepala">
          <h3 className="u-lmsb-subjudul">Mahasiswa ({(q.data ?? []).filter((p) => p.peran === 'mahasiswa').length})</h3>
          <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama…" aria-label="Cari peserta" className="u-lmsb-cari" />
        </header>
        {mhs.length ? (
          <ul className="u-lmsb-orang" data-kisi>
            {mhs.map((p) => (
              <li key={p.username}>
                <Avatar name={p.nama ?? p.username} size="sm" />
                <span>
                  <b>{p.nama ?? p.username}</b>
                  <small>{p.username}</small>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon={<Users />} title={t ? 'Tidak ada yang cocok' : 'Belum ada peserta'} />
        )}
      </section>
    </div>
  );
}

/** Info kelas dari SIAKAD: ringkasan, mata kuliah, SKS, periode, jadwal, ruang. */
export function InfoKelasLms({ kelasId, nim, className }: { kelasId: number; nim?: string; className?: string }) {
  const q = useKelasLmsDetail(kelasId);
  const j = useJadwalKelasLengkap(q.data, nim);
  if (q.error) return <Galat q={q} />;
  const k = q.data;
  if (!k) return <Skeleton className={className} style={{ height: 200 }} />;
  const periode = labelPeriodeLms(k.tahun_id);
  return (
    <section className={cn('u-lmsb-kartu u-lmsb-tumpuk', className)}>
      <h3 className="u-lmsb-subjudul">Tentang kelas</h3>
      {k.ringkasan ? <IsiHtmlLms html={k.ringkasan} /> : <p className="u-lmsb-redup">Belum ada ringkasan kelas.</p>}
      <DescriptionList
        items={[
          { label: 'Mata kuliah', value: `${j?.nama_mk ?? k.judul}${k.kode_mk ? ` (${k.kode_mk})` : ''}` },
          { label: 'SKS', value: j?.sks ?? '–' },
          { label: 'Periode', value: periode || '–' },
          { label: 'Kelas', value: k.kelas ?? '–' },
          { label: 'Jadwal', value: teksJadwalLms(j) || '–' },
          { label: 'Ruang', value: teksRuangLms(j) || '–' },
          { label: 'Pengampu', value: j?.nama_dosen ?? k.pengajar ?? '–' },
          { label: 'Format', value: k.format === 'mingguan' ? 'Per pertemuan' : k.format === 'topik' ? 'Per topik' : '–' },
          { label: 'Masa kelas', value: k.mulai || k.selesai ? `${k.mulai ? formatDate(k.mulai) : '–'} s.d. ${k.selesai ? formatDate(k.selesai) : '–'}` : '–' },
        ]}
      />
      <p className="u-lmsb-redup">Data jadwal dan pengampu diambil langsung dari SIAKAD.</p>
    </section>
  );
}

// ================================================================ Halaman kelas bertab
export type TabKelasLms = 'materi' | 'tugas' | 'kuis' | 'forum' | 'presensi' | 'nilai' | 'peserta' | 'info' | 'kurikulum';
export const TAB_KELAS_LMS: TabKelasLms[] = ['materi', 'tugas', 'kuis', 'forum', 'presensi', 'nilai', 'peserta', 'info', 'kurikulum'];

/**
 * Ruang kelas: kepala kelas + daftar bagian vertikal (aturan G4: sub-navigasi tingkat kedua vertikal) yang dikelompokkan
 * Belajar (materi per pertemuan, tugas, kuis & ujian, forum), Kehadiran & nilai, dan Kelas. Di layar sempit daftar
 * bagian menjadi pilihan tarik-turun supaya isi tetap selebar layar. `nim` melengkapi jam & ruang dari jadwal kuliah.
 */
export function HalamanKelasLms({ kelasId, nim, tab = 'materi', onTabChange, className }: { kelasId: number; nim?: string; tab?: TabKelasLms; onTabChange?: (t: TabKelasLms) => void; className?: string }) {
  const k = useKelasLmsDetail(kelasId);
  const [aktif, setAktif] = React.useState<TabKelasLms>(tab);
  React.useEffect(() => setAktif(tab), [tab]);
  const ganti = (t: TabKelasLms) => {
    setAktif(t);
    onTabChange?.(t);
  };
  const jml = k.data?.jumlah;
  const B = 'Belajar';
  const N = 'Kehadiran & nilai';
  const K = 'Kelas';
  const items: TabItem<TabKelasLms>[] = [
    { value: 'materi', group: B, label: 'Materi', icon: <BookOpen />, count: jml?.materi, content: <KontenKelasLms kelasId={kelasId} /> },
    { value: 'tugas', group: B, label: 'Tugas', icon: <ClipboardList />, count: jml?.tugas, content: <DaftarTugasKelasLms kelasId={kelasId} /> },
    {
      value: 'kuis',
      group: B,
      label: 'Kuis & ujian',
      icon: <FileQuestion />,
      count: jml?.kuis,
      content: (
        <div className="u-lmsb-tumpuk">
          <DaftarUjianKelasLms kelasId={kelasId} />
          <DaftarKuisKelasLms kelasId={kelasId} />
        </div>
      ),
    },
    { value: 'forum', group: B, label: 'Forum', icon: <MessageSquare />, count: jml?.forum, content: <DaftarForumKelasLms kelasId={kelasId} /> },
    { value: 'presensi', group: N, label: 'Presensi', icon: <CalendarCheck />, content: <PresensiKelasLms kelasId={kelasId} /> },
    { value: 'nilai', group: N, label: 'Nilai', icon: <GraduationCap />, content: <NilaiKelasSayaLms kelasId={kelasId} /> },
    { value: 'peserta', group: K, label: 'Peserta', icon: <Users />, content: <PesertaKelasLms kelasId={kelasId} /> },
    { value: 'info', group: K, label: 'Info kelas', icon: <Info />, content: <InfoKelasLms kelasId={kelasId} nim={nim} /> },
    // Kurikulum (pengajar/pengelola): siapkan kelas dari RPS, penanda CPMK/tingkat kognitif tugas & kuis (aturan kurikulum).
    ...(k.data && ['pengajar', 'asisten', 'admin', 'pengelola'].includes(String(k.data.peran ?? '')) && k.data.kode_prodi && k.data.kode_mk
      ? [{ value: 'kurikulum' as const, group: K, label: 'Kurikulum', icon: <GraduationCap />, content: <KurikulumKelasLms kelasId={kelasId} prodi={String(k.data.kode_prodi)} kodeMk={String(k.data.kode_mk)} /> }]
      : []),
  ];
  return (
    <div className={cn('u-lmsb-kelas', className)}>
      <KepalaKelasLms kelasId={kelasId} nim={nim} />
      {k.error ? null : <Tabs items={items} value={aktif} onValueChange={ganti} orientation="vertical" aria-label="Bagian kelas" className="u-lmsb-tab" />}
    </div>
  );
}

// ================================================================ Beranda & lintas kelas
/** Tenggat tugas dan kuis yang dibuka, digabung dan diurutkan dari yang paling dekat. */
export function TenggatLms({ batas = 7, className }: { batas?: number; className?: string }) {
  const q = useSiakadQuery<{
    tugas_mendatang?: Array<{ id: number; kelas: string; judul: string; tenggat: string | null; status_jawaban?: string | null }>;
    kuis_terbuka?: Array<{ id: number; kelas: string; judul: string; selesai: string | null }>;
  }>(['lms-saya'], (s, signal) => s.lms.getSaya({}, { signal }) as never, { staleTime: 60_000 });
  const rute = useRuteLms();
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 220 }} />;
  const data = [
    ...(q.data?.kuis_terbuka ?? []).map((k) => ({ jenis: 'kuis' as const, id: k.id, kelas: k.kelas, judul: k.judul, waktu: k.selesai, status: null as string | null })),
    ...(q.data?.tugas_mendatang ?? [])
      .filter((t) => t.status_jawaban !== 'dikumpulkan' && t.status_jawaban !== 'dinilai')
      .map((t) => ({ jenis: 'tugas' as const, id: t.id, kelas: t.kelas, judul: t.judul, waktu: t.tenggat, status: t.status_jawaban ?? null })),
  ]
    .sort((a, b) => (a.waktu ?? '9').localeCompare(b.waktu ?? '9'))
    .slice(0, batas);
  if (!data.length) return <Empty icon={<CircleCheck />} title="Semua beres" description="Tidak ada tugas atau kuis yang menunggu." className={className} />;
  return (
    <ul className={cn('u-lmsb-tenggat', className)}>
      {data.map((x) => {
        const s = x.waktu ? sisaTenggat(x.waktu) : null;
        return (
          <li key={x.jenis + x.id}>
            <a href={x.jenis === 'kuis' ? rute.kuis(x.id) : rute.tugas(x.id)}>
              <span className="u-lmsb-item-ikon" data-jenis={x.jenis}>
                {x.jenis === 'kuis' ? <FileQuestion /> : <ClipboardList />}
              </span>
              <span className="u-lmsb-item-teks">
                <b>{x.judul}</b>
                <small>
                  {namaKelasRapiLms(x.kelas)} · {x.jenis === 'kuis' ? 'ditutup' : 'tenggat'} {waktuLms(x.waktu)}
                </small>
              </span>
              {x.status && STATUS_JAWABAN[x.status] ? (
                <Badge variant={STATUS_JAWABAN[x.status]!.variant}>{STATUS_JAWABAN[x.status]!.label}</Badge>
              ) : s ? (
                <Badge variant={s.tone}>{s.teks}</Badge>
              ) : null}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** Kelas daring (Zoom/Meet) yang sedang berlangsung atau dalam 7 hari ke depan. Kosong = tidak dirender. */
export function KelasDaringMendatang({ batas = 3, className }: { batas?: number; className?: string }) {
  const [r] = React.useState(() => {
    const d = new Date();
    return { dari: tglIso(new Date(d.getTime() - 86_400_000)), sampai: tglIso(new Date(d.getTime() + 7 * 86_400_000)) };
  });
  const q = useAgendaLmsRentang(r.dari, r.sampai);
  const rute = useRuteLms();
  const kini = Date.now();
  const data = (q.data ?? [])
    .filter((a) => a.jenis === 'konferensi')
    .filter((a) => (tglLms(a.selesai ?? a.waktu)?.getTime() ?? 0) + 2 * 3600_000 > kini)
    .sort((a, b) => a.waktu.localeCompare(b.waktu))
    .slice(0, batas);
  if (!data.length) return null;
  return (
    <div className={cn('u-lmsb-daring-grid', className)}>
      {data.map((a) => {
        const w = keadaanRapat({ mulai: a.waktu, selesai: a.selesai });
        return (
          <a key={a.id} href={rute.materi(a.id)} className="u-lmsb-daring-mini" data-waktu={w}>
            <span className="u-lmsb-daring-label">
              {w === 'berlangsung' ? (
                <span className="u-lmsb-langsung">Berlangsung</span>
              ) : (
                <Badge variant="secondary">
                  <Video /> Kelas daring
                </Badge>
              )}
              <small>{waktuLms(a.waktu)}</small>
            </span>
            <b>{a.judul}</b>
            <small>{namaKelasRapiLms(a.kelas)}</small>
            <span className="u-lmsb-daring-cta">
              {w === 'berlangsung' ? 'Gabung sekarang' : 'Lihat detail'} <ArrowRight aria-hidden />
            </span>
          </a>
        );
      })}
    </div>
  );
}

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
/** Jadwal kuliah hari ini dari SIAKAD (mahasiswa), ditautkan ke kelas LMS-nya bila ada. */
export function JadwalHariIniLms({ nim, kelas, className }: { nim: string; kelas?: KelasLms[]; className?: string }) {
  const q = useJadwalKuliahMhs(nim);
  const rute = useRuteLms();
  const hari = HARI[new Date().getDay()]!;
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 140 }} />;
  const data = (q.data?.jadwal ?? []).filter((j) => j.hari === hari).sort((a, b) => (a.jam_mulai ?? '').localeCompare(b.jam_mulai ?? ''));
  const idj = new Map((kelas ?? []).map((k) => [k.idj, k.id]));
  if (!data.length) return <Empty icon={<CalendarClock />} title="Tidak ada kuliah hari ini" description="Gunakan waktunya untuk menyelesaikan tugas." className={className} />;
  return (
    <ul className={cn('u-lmsb-jadwal', className)}>
      {data.map((j) => {
        const id = idj.get(j.idj);
        const isi = (
          <>
            <span className="u-lmsb-jadwal-jam">
              <b>{j.jam_mulai?.slice(0, 5) ?? '–'}</b>
              <small>{j.jam_selesai?.slice(0, 5)}</small>
            </span>
            <span className="u-lmsb-item-teks">
              <b>{j.nama_mk}</b>
              <small>
                <MapPin aria-hidden /> {j.nama_ruang || j.ruang || '–'}
                {j.dosen?.nama ? ` · ${j.dosen.nama}` : ''}
              </small>
            </span>
          </>
        );
        return <li key={j.idj}>{id ? <a href={rute.kelas(id)}>{isi}</a> : <div>{isi}</div>}</li>;
      })}
    </ul>
  );
}

/**
 * Kemajuan belajar per kelas (materi wajib selesai, tugas dikumpulkan, kuis dikerjakan dibanding seluruh aktivitas),
 * kelas yang paling tertinggal lebih dulu. Ringkasan di atas: rata-rata dan jumlah kelas tuntas.
 */
export function KemajuanBelajarLms({ kelas, nim, batas = 5, className }: { kelas: KelasLms[] | undefined; nim?: string; batas?: number; className?: string }) {
  const ids = kelas?.filter((k) => k.peran === 'mahasiswa' || !k.peran).map((k) => k.id);
  const q = useSemuaKelasLms<ProgresKelasDataLms>(ids, 'progres');
  const rute = useRuteLms();
  if (!kelas || muatDari(q)) return <Skeleton className={className} style={{ height: 180 }} />;
  const nama = new Map(kelas.map((k) => [k.id, namaKelasRapiLms(k.judul)]));
  const baris = (q.data ?? [])
    .map((r) => {
      const m = r.data?.mahasiswa?.find((x) => !nim || x.nim === nim) ?? (r.data?.mahasiswa?.length === 1 ? r.data.mahasiswa[0] : undefined);
      return m && m.total > 0 ? { id: r.kelas_id, nama: nama.get(r.kelas_id) ?? 'Kelas', persen: m.persen ?? 0, selesai: m.selesai, total: m.total } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => a.persen - b.persen);
  if (!baris.length)
    return <Empty icon={<ListChecks />} title="Belum ada aktivitas" description="Kemajuan dihitung setelah dosen menambahkan materi wajib, tugas, atau kuis." className={className} />;
  const rata = Math.round(baris.reduce((a, b) => a + b.persen, 0) / baris.length);
  const tuntas = baris.filter((b) => b.persen >= 100).length;
  return (
    <div className={cn('u-lmsb-kemajuan', className)}>
      <p className="u-lmsb-kemajuan-ringkas">
        <b>{rata}%</b>
        <small>
          rata-rata dari {baris.length} kelas · {tuntas} tuntas
        </small>
      </p>
      <ul>
        {baris.slice(0, batas).map((b) => (
          <li key={b.id}>
            <a href={rute.kelas(b.id)}>
              <Progress
                value={b.persen}
                size="sm"
                label={b.nama}
                format={(v) => `${Math.round(v)}% · ${b.selesai}/${b.total}`}
                showValue
                tone={b.persen >= 100 ? 'success' : b.persen < 50 ? 'warning' : undefined}
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
interface ProgresKelasDataLms {
  mahasiswa?: Array<{ nim: string; persen: number | null; selesai: number; total: number }>;
}

type BarisTugasSaya = TugasLms & { kelas?: string };
/** Kelompok tenggat tugas yang belum dikumpulkan: terlambat (masih diterima), minggu ini, nanti, tanpa tenggat. */
function kelompokTenggat(t: Pick<TugasLms, 'tenggat'>, kini: number): 'terlambat' | 'minggu' | 'nanti' | 'tanpa' {
  const w = tglLms(t.tenggat)?.getTime();
  if (w == null) return 'tanpa';
  if (w < kini) return 'terlambat';
  return w - kini <= 7 * 86_400_000 ? 'minggu' : 'nanti';
}
const JUDUL_KELOMPOK: Record<ReturnType<typeof kelompokTenggat>, { judul: string; ket: string }> = {
  terlambat: { judul: 'Lewat tenggat', ket: 'Masih bisa dikumpulkan, ditandai terlambat' },
  minggu: { judul: '7 hari ke depan', ket: 'Tenggat terdekat lebih dulu' },
  nanti: { judul: 'Nanti', ket: 'Tenggat lebih dari seminggu lagi' },
  tanpa: { judul: 'Tanpa tenggat', ket: 'Kumpulkan kapan saja selama kelas berjalan' },
};

/**
 * Tugas & kuis lintas kelas: cari judul, saring per kelas, tab Perlu dikerjakan (dikelompokkan menurut tenggat), Kuis,
 * dan Selesai/ditutup. Kelas yang gagal dimuat diberitahukan, bukan ditelan diam-diam (LMS-16/17).
 */
export function TugasKuisSayaLms({ kelas, className }: { kelas: KelasLms[] | undefined; className?: string }) {
  const ids = kelas?.map((k) => k.id);
  const tq = useSemuaKelasLms<TugasLms[]>(ids, 'tugas');
  const kq = useSemuaKelasLms<KuisLms[]>(ids, 'kuis');
  const rute = useRuteLms();
  const [saring, setSaring] = React.useState<'menunggu' | 'kuis' | 'selesai'>('menunggu');
  const [f, setF] = React.useState<FilterValues>({});
  const nama = new Map((kelas ?? []).map((k) => [k.id, namaKelasRapiLms(k.judul)]));
  const kata = String(f.q ?? '').trim().toLowerCase();
  const kelasPilih = f.kelas ? Number(f.kelas) : null;
  const cocok = (kelasId: number, judul: string) => (!kelasPilih || kelasPilih === kelasId) && (!kata || `${judul} ${nama.get(kelasId) ?? ''}`.toLowerCase().includes(kata));
  const semua: BarisTugasSaya[] = (tq.data ?? []).flatMap((x) => (x.data ?? []).filter((t) => cocok(x.kelas_id, t.judul)).map((t) => ({ ...t, kelas: nama.get(x.kelas_id) })));
  const menunggu = semua.filter((t) => !tugasSelesai(t) && !tugasDitutup(t)).sort((a, b) => (a.tenggat ?? '9').localeCompare(b.tenggat ?? '9'));
  const selesai = semua.filter((t) => tugasSelesai(t) || tugasDitutup(t)).sort((a, b) => (b.tenggat ?? '').localeCompare(a.tenggat ?? ''));
  const kuis = (kq.data ?? [])
    .flatMap((x) => (x.data ?? []).filter((k) => cocok(x.kelas_id, k.judul)).map((k) => ({ ...k, kelas: nama.get(x.kelas_id) })))
    .sort((a, b) => Number(keadaanKuis(b).buka) - Number(keadaanKuis(a).buka) || (a.selesai ?? '9').localeCompare(b.selesai ?? '9'));
  const gagal = [...(tq.data ?? []), ...(kq.data ?? [])].filter((x) => x.data == null).map((x) => nama.get(x.kelas_id) ?? `kelas ${x.kelas_id}`);
  const muat = !kelas || muatDari(tq) || muatDari(kq);
  const kini = Date.now();
  const kelompok = (['terlambat', 'minggu', 'nanti', 'tanpa'] as const).map((g) => ({ g, data: menunggu.filter((t) => kelompokTenggat(t, kini) === g) })).filter((x) => x.data.length);
  const adaSaring = !!kata || !!kelasPilih;
  const kosong = (judul: string, ket?: string) => (
    <Empty
      icon={saring === 'kuis' ? <FileQuestion /> : <ClipboardList />}
      title={adaSaring ? 'Tidak ada yang cocok' : judul}
      description={adaSaring ? 'Ubah kata kunci atau saringan kelas.' : ket}
      actions={
        adaSaring ? (
          <Button variant="outline" onClick={() => setF({})}>
            Hapus saringan
          </Button>
        ) : undefined
      }
      bordered
    />
  );
  return (
    <div className={cn('u-lmsb-tumpuk', className)}>
      <FilterBar
        value={f}
        onValueChange={setF}
        search={{ placeholder: 'Cari judul tugas atau kuis…' }}
        fields={[{ key: 'kelas', label: 'Kelas', type: 'select', searchable: true, options: (kelas ?? []).map((k) => ({ value: String(k.id), label: nama.get(k.id) ?? k.judul })) }]}
        resultCount={saring === 'kuis' ? kuis.length : saring === 'menunggu' ? menunggu.length : selesai.length}
        resultLabel={saring === 'kuis' ? 'kuis' : 'tugas'}
      />
      <SegmentedControl
        value={saring}
        onValueChange={setSaring}
        aria-label="Saring tugas"
        options={[
          { value: 'menunggu', label: `Perlu dikerjakan (${menunggu.length})` },
          { value: 'kuis', label: `Kuis (${kuis.filter((k) => keadaanKuis(k).buka).length} dibuka)` },
          { value: 'selesai', label: `Selesai/ditutup (${selesai.length})` },
        ]}
      />
      {gagal.length > 0 && !muat && (
        <Alert variant="warning" title="Sebagian kelas gagal dimuat">
          {gagal.slice(0, 3).join(', ')}
          {gagal.length > 3 ? ` dan ${gagal.length - 3} lainnya` : ''}. Muat ulang halaman untuk mencoba lagi.
        </Alert>
      )}
      {tq.error ? (
        <Galat q={tq} />
      ) : muat ? (
        <Skeleton style={{ height: 200 }} />
      ) : saring === 'kuis' ? (
        kuis.length ? (
          <div className="u-lmsb-grid-aktivitas">
            {kuis.map((k) => (
              <KartuKuisLms key={k.id} kuis={k} kelas={k.kelas} href={rute.kuis(k.id)} />
            ))}
          </div>
        ) : (
          kosong('Belum ada kuis', 'Kuis dari dosen akan muncul di sini. Ujian CBT (UTS, UAS, kuis CBT) ada di Ujian saya.')
        )
      ) : saring === 'menunggu' ? (
        kelompok.length ? (
          kelompok.map(({ g, data }) => (
            <section key={g} className="u-lmsb-kelompok" data-kelompok={g}>
              <header className="u-lmsb-kelompok-kepala">
                <h3 className="u-lmsb-subjudul">
                  {JUDUL_KELOMPOK[g].judul} <Badge variant={g === 'terlambat' ? 'danger' : 'neutral'}>{data.length}</Badge>
                </h3>
                <small>{JUDUL_KELOMPOK[g].ket}</small>
              </header>
              <div className="u-lmsb-grid-aktivitas">
                {data.map((t) => (
                  <KartuTugasLms key={t.id} tugas={t} kelas={t.kelas} href={rute.tugas(t.id)} />
                ))}
              </div>
            </section>
          ))
        ) : (
          kosong('Tidak ada tugas yang menunggu', 'Semua tugas sudah dikumpulkan.')
        )
      ) : selesai.length ? (
        <div className="u-lmsb-grid-aktivitas">
          {selesai.map((t) => (
            <KartuTugasLms key={t.id} tugas={t} kelas={t.kelas} href={rute.tugas(t.id)} />
          ))}
        </div>
      ) : (
        kosong('Belum ada tugas yang selesai')
      )}
    </div>
  );
}

// ================================================================ Notifikasi
const IKON_NOTIF: Record<string, React.ReactNode> = {
  tugas: <ClipboardList />,
  nilai: <Star />,
  kuis: <FileQuestion />,
  materi: <BookOpen />,
  forum: <MessagesSquare />,
  pengumuman: <Megaphone />,
  konferensi: <Video />,
  presensi: <UserCheck />,
};
function jenisNotif(j?: string | null) {
  const k = (j ?? '').split('.')[0] ?? '';
  return IKON_NOTIF[k] ? k : 'materi';
}

/** Notifikasi LMS: tandai dibaca saat dibuka, tombol tandai semua dibaca. */
export function DaftarNotifikasiLms({
  batas,
  onPilih,
  className,
}: {
  batas?: number;
  /** Bawaan: buka rute dari tautan notifikasi. */ onPilih?: (n: NotifikasiLms, href: string | null) => void;
  className?: string;
}) {
  const q = useNotifikasiLms();
  const rute = useRuteLms();
  const { jalan, sibuk } = useAksi();
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 200 }} />;
  const data = (q.data ?? []).slice(0, batas ?? undefined);
  const belum = (q.data ?? []).filter((x) => !x.dibaca_at).length;
  if (!data.length) return <Empty icon={<CheckCheck />} title="Tidak ada notifikasi" description="Pemberitahuan tugas, nilai, dan forum muncul di sini." className={className} />;
  const baca = (isi: { id?: number[]; semua?: boolean }) => jalan((s) => s.lms.postNotifikasiBaca(isi as never)).then(segarkan, () => undefined);
  const buka = (x: NotifikasiLms) => {
    if (!x.dibaca_at) void baca({ id: [x.id] });
    const href = ruteDariTautanLms(x.tautan, x.kelas_id, rute);
    if (onPilih) onPilih(x, href);
    else if (href) pindahKe(rute, href);
  };
  return (
    <div className={cn('u-lmsb-notif', className)}>
      {belum > 0 && batas == null && (
        <div className="u-lmsb-notif-atas">
          <small>{belum} belum dibaca</small>
          <Button size="xs" variant="ghost" loading={sibuk} onClick={() => void baca({ semua: true })}>
            <CheckCheck /> Tandai semua dibaca
          </Button>
        </div>
      )}
      <ul>
        {data.map((x) => (
          <li key={x.id}>
            <a
              href={ruteDariTautanLms(x.tautan, x.kelas_id, rute) ?? '#'}
              onClick={(e) => {
                e.preventDefault();
                buka(x);
              }}
              data-baru={!x.dibaca_at || undefined}
            >
              <span className="u-lmsb-item-ikon" data-jenis={jenisNotif(x.jenis)}>
                {IKON_NOTIF[jenisNotif(x.jenis)]}
              </span>
              <span className="u-lmsb-item-teks">
                <b>{x.judul}</b>
                {x.isi && <small className="u-lmsb-dua-baris">{teksPolosLms(x.isi)}</small>}
                {x.created_at && <small>{relatif(x.created_at)}</small>}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ================================================================ Kelas terbuka (landing)
/** Kartu kelas terbuka untuk katalog/landing page. */
export function KartuKelasTerbuka({ kelas: k, onGabung, className }: { kelas: KelasTerbukaLms; onGabung?: (k: KelasTerbukaLms) => void; className?: string }) {
  return (
    <article className={cn('u-lms-kelas u-lmsb-terbuka', className)}>
      <span className="u-lms-kelas-sampul">
        <SampulKelas seed={k.id} />
        <Badge variant="success">Terbuka</Badge>
      </span>
      <span className="u-lms-kelas-body">
        <span className="u-lms-kelas-judul">{k.judul}</span>
        {k.pengajar && <span className="u-lms-kelas-pengajar">{k.pengajar}</span>}
        {k.ringkasan && <span className="u-lmsb-dua-baris u-lmsb-redup">{teksPolosLms(k.ringkasan)}</span>}
        <span className="u-lmsb-terbuka-angka">
          <span>
            <BookOpen aria-hidden /> {k.topik} topik
          </span>
          <span>
            <FileText aria-hidden /> {k.materi} materi
          </span>
          <span>
            <Users aria-hidden /> {formatNumber(k.peserta)} peserta
          </span>
        </span>
        {onGabung && (
          <Button variant="soft" size="sm" onClick={() => onGabung(k)}>
            <Plus /> Ikuti kelas
          </Button>
        )}
      </span>
    </article>
  );
}

/** Katalog kelas terbuka (MOOC internal) dari /v1/lms/terbuka, tanpa login. */
export function KatalogKelasTerbuka({
  batas = 6,
  onGabung,
  kosong,
  className,
}: {
  batas?: number;
  onGabung?: (k: KelasTerbukaLms) => void;
  /** Tampilan bila katalog kosong (bawaan: tidak dirender). */ kosong?: React.ReactNode;
  className?: string;
}) {
  const q = useKelasTerbuka({ per_page: batas });
  if (q.error) return <>{kosong ?? null}</>;
  if (muatDari(q))
    return (
      <div className={cn('u-lms-kelas-grid', className)}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} style={{ height: 260 }} />
        ))}
      </div>
    );
  if (!q.data?.length) return <>{kosong ?? null}</>;
  return (
    <div className={cn('u-lms-kelas-grid', className)}>
      {q.data.map((k) => (
        <KartuKelasTerbuka key={k.id} kelas={k} onGabung={onGabung} />
      ))}
    </div>
  );
}

/** Ikuti kelas terbuka (akun mahasiswa). */
export function useGabungKelasTerbuka() {
  const a = useAksi();
  const gabung = (id: number) => a.jalan((s) => s.request({ method: 'POST', path: `/v1/lms/terbuka/${id}/gabung` })).then((r) => (segarkan(), r));
  return { gabung, sibuk: a.sibuk, galat: a.galat };
}

/** Dialog gabung kelas tambahan dengan kode dari dosen. */
export function GabungKelasKodeLms({ open, onOpenChange, onBergabung }: { open: boolean; onOpenChange: (o: boolean) => void; onBergabung?: (k: KelasLms) => void }) {
  const { jalan, sibuk, galat, setGalat } = useAksi();
  const toast = useToast();
  const [kode, setKode] = React.useState('');
  const kirim = () =>
    jalan((s) => s.lms.postKelasGabung({ kode: kode.trim() } as never))
      .then((r) => {
        segarkan();
        const k = r?.data as unknown as KelasLms;
        toast.add({ title: 'Berhasil bergabung', description: k?.judul, type: 'success' });
        setKode('');
        onOpenChange(false);
        if (k) onBergabung?.(k);
      })
      .catch(() => undefined);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setGalat(null);
        onOpenChange(o);
      }}
      size="sm"
      title="Gabung kelas dengan kode"
      description="Untuk kelas tambahan di luar KRS. Kelas dari KRS sudah otomatis muncul."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button loading={sibuk} disabled={kode.trim().length < 4} onClick={kirim}>
            <KeyRound /> Gabung
          </Button>
        </>
      }
    >
      <Field label="Kode kelas" error={galat ? pesanGalat(galat, { kode: false }) : undefined}>
        <Input
          value={kode}
          onChange={(e) => setKode(e.target.value.toUpperCase())}
          autoFocus
          className="u-lmsb-kode"
          autoComplete="off"
          onKeyDown={(e) => e.key === 'Enter' && kode.trim().length >= 4 && kirim()}
        />
      </Field>
    </Dialog>
  );
}

/** Kartu ringkas tombol unggah (dipakai bila Dropzone terlalu besar). */
export function TombolUnggahLms({ onFiles, label = 'Pilih berkas', accept }: { onFiles: (f: File[]) => void; label?: string; accept?: string }) {
  return (
    <TombolPilihBerkas multiple accept={accept} onFiles={onFiles}>
      <Upload /> {label}
    </TombolPilihBerkas>
  );
}

// ================================================================ Kalender gabungan
const JENIS_AGENDA_LMS: Record<string, string> = { tugas: 'Tenggat tugas', kuis: 'Kuis', presensi: 'Pertemuan', konferensi: 'Kelas daring' };
const WARNA_AGENDA_LMS: Record<string, string> = { tugas: 'var(--u-warning)', kuis: 'var(--u-danger)', presensi: 'var(--u-success)', konferensi: 'var(--u-primary)' };

const WARNA_JENIS_LMS = Object.fromEntries(Object.entries(WARNA_AGENDA_LMS).map(([k, v]) => [`lms_${k}`, v]));

/** Ubah agenda LMS (/v1/lms/kalender) menjadi kegiatan kalender. */
export function agendaKeEvent(a: AgendaLmsRinci, rute: RuteLms = RUTE_LMS): CalendarEvent {
  const jam = (s?: string | null) => (s && s.length > 10 ? s.slice(11, 16).replace(':', '.') : null);
  const mulai = jam(a.waktu);
  const selesai = a.jenis !== 'kuis' ? jam(a.selesai) : null;
  return {
    id: `lms-${a.jenis}-${a.id}`,
    title: `${JENIS_AGENDA_LMS[a.jenis] ? `${JENIS_AGENDA_LMS[a.jenis]}: ` : ''}${a.judul}`,
    start: a.waktu.slice(0, 10),
    end: a.jenis === 'kuis' && a.selesai ? a.selesai.slice(0, 10) : null,
    kind: `lms_${a.jenis}`,
    color: WARNA_AGENDA_LMS[a.jenis],
    time: mulai ? `${mulai}${selesai ? `–${selesai}` : ''}` : undefined,
    description: a.kelas,
    href: ruteDariTautanLms(a.tautan, a.kelas_id, rute) ?? rute.kelas(a.kelas_id),
  };
}

/**
 * Kalender belajar: tenggat tugas, kuis, pertemuan, dan kelas daring dari LMS digabung dengan kalender akademik SIAKAD.
 * Klik kegiatan LMS membuka halamannya (lewat `onBuka`, bawaan pindah alamat).
 */
export function KalenderLms({ onBuka, className }: { onBuka?: (href: string) => void; className?: string }) {
  const rute = useRuteLms();
  const [rentang, setRentang] = React.useState<[string, string] | null>(null);
  const q = useAgendaLmsRentang(rentang?.[0] ?? '', rentang?.[1] ?? '');
  const tambahan = React.useMemo(() => (rentang ? (q.data ?? []).map((a) => agendaKeEvent(a, rute)) : []), [q.data, rentang, rute]);
  const ganti = React.useCallback((dari: string, sampai: string) => setRentang((r) => (r?.[0] === dari && r[1] === sampai ? r : [dari, sampai])), []);
  const label = React.useMemo(() => Object.fromEntries(Object.entries(JENIS_AGENDA_LMS).map(([k, v]) => [`lms_${k}`, v])), []);
  return (
    <div className={cn('u-lmsb-tumpuk', className)}>
      {q.error ? <Galat q={q} /> : null}
      <KalenderAkademik
        tambahan={tambahan}
        labelJenis={label}
        warnaJenis={WARNA_JENIS_LMS}
        onRentangChange={ganti}
        onKegiatanClick={(e) => {
          if (!e.href || !String(e.id ?? '').startsWith('lms-')) return;
          if (onBuka) onBuka(e.href);
          else pindahKe(rute, e.href);
        }}
      />
    </div>
  );
}

/** Tab Kurikulum kelas LMS (pengajar): siapkan kelas dari RPS, penanda CPMK & tingkat kognitif tiap tugas dan kuis. */
function KurikulumKelasLms({ kelasId, prodi, kodeMk }: { kelasId: number; prodi: string; kodeMk: string }) {
  const tugas = useTugasKelas(kelasId);
  const kuis = useKuisKelas(kelasId);
  return (
    <div className="u-kur-penanda">
      <p className="u-bkd-keterangan">Nilai tugas/kuis yang bertanda CPMK ikut dihitung ke ketercapaian CPMK/CPL mata kuliah ini.</p>
      <div><SiapkanKelasDariRps kelasId={kelasId} onSelesai={segarkan} /></div>
      {(tugas.data ?? []).map((t) => (
        <details key={`t${t.id}`} className="u-lmsb-penanda">
          <summary>Tugas: {t.judul}</summary>
          <PenandaKurikulum entitas="lms_tugas" entitasId={Number(t.id)} prodi={prodi} kodeMk={kodeMk} />
        </details>
      ))}
      {(kuis.data ?? []).map((q) => (
        <details key={`k${q.id}`} className="u-lmsb-penanda">
          <summary>Kuis: {q.judul}</summary>
          <PenandaKurikulum entitas="lms_kuis" entitasId={Number(q.id)} prodi={prodi} kodeMk={kodeMk} />
        </details>
      ))}
    </div>
  );
}
