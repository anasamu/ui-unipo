'use client';
import * as React from 'react';
import {
  AlarmClock,
  ArchiveRestore,
  BadgeCheck,
  Ban,
  CalendarRange,
  CircleAlert,
  CircleCheck,
  CircleSlash,
  CircleX,
  Download,
  FileBadge,
  FileText,
  FlaskConical,
  Gauge,
  GitBranch,
  History,
  ListChecks,
  MessageSquareText,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Scale,
  Search,
  ShieldCheck,
  ShieldHalf,
  Target,
  Trash2,
  TriangleAlert,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { ProgressTenggat } from '../components/progres';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton, Tag } from '../components/actions';
import { Alert, Card, DescriptionList, Empty, Progress, Tabs } from '../components/display';
import { Field, Input, SegmentedControl, Textarea } from '../components/forms';
import { BagianForm, HitungKarakter, IsianDaftar, IsianTanggal, PanelForm, Pilihan, PilihanBanyak } from '../components/formulir';
import { ConfirmDialog, Dialog, Menu, useToast } from '../components/overlays';
import type { SelectOption } from '../components/select';
import { useAkunSaya } from './akun';
import { PilihTahunAkademik } from './cari';
import { GalatApi } from './galat';
import { PilihEntitas } from './pilih';
import { PilihBerkas } from './pilih-berkas';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { PilihNomorSK } from './isian-sk';

/*
 * Aturan akademik, kelulusan, dan keuangan dinamis (/v1/aturan): aturan disusun di satu titik penerapan (langkah
 * bisnis, mis. krs.ambil), wajib ber-SK sebelum aktif, bisa diberi dispensasi, dan diperiksa oleh mesin yang sama
 * dengan logika bisnis SIAKAD. Komponen di sini hanya memakai endpoint /v1/aturan; validasi di peramban meniru
 * Katalog::kondisi/parameter/cakupan dan AturanService::validasi di backend.
 */

// ================================================================ Tipe
export type KategoriAturan = 'akademik' | 'kelulusan' | 'keuangan' | 'kemahasiswaan' | 'kepegawaian' | 'penelitian' | 'mutu' | 'umum';
export type JenisAturan = 'syarat' | 'batas_waktu' | 'batas_nilai';
export type ModeAturan = 'blokir' | 'peringatan';
export type StatusAturan = 'draf' | 'aktif' | 'nonaktif';
export type OpAturan = '>=' | '>' | '<=' | '<' | '=' | '!=' | 'dalam' | 'bukan_dalam' | 'memuat' | 'tidak_memuat' | 'benar' | 'salah';
export type TipeIndikator = 'angka' | 'teks' | 'benar_salah' | 'daftar';

export interface KondisiDasar {
  indikator: string;
  op: OpAturan;
  nilai?: unknown;
  pesan?: string;
}
export type GrupKondisi = { semua: ItemKondisi[] } | { salah_satu: ItemKondisi[] };
export type ItemKondisi = KondisiDasar | GrupKondisi;

export interface CakupanAturan {
  prodi?: string[];
  fakultas?: string[];
  jenjang?: string[];
  kelas?: string[];
  angkatan_min?: string;
  angkatan_max?: string;
  /** Titik bersubjek pegawai: kode unit SDM (berlaku untuk unit itu dan turunannya). */
  unit?: string[];
  jenis_pegawai?: Array<'dosen' | 'tendik'>;
  kategori_pegawai?: Array<'tetap' | 'tidak_tetap'>;
  status_kepegawaian?: string[];
}
export interface ParameterBatasWaktu {
  mulai: string;
  selesai: string;
}
export interface ParameterBatasNilai {
  target: string;
  op: '<=' | '<' | '>=' | '>';
  nilai?: number;
  tabel?: Array<{ jika: GrupKondisi; nilai: number }>;
}

export interface Aturan {
  id: string;
  kode: string | null;
  nama: string;
  keterangan: string | null;
  titik: string;
  titik_judul: string | null;
  kategori: KategoriAturan;
  jenis: JenisAturan;
  cakupan: CakupanAturan;
  kondisi: GrupKondisi | null;
  parameter: ParameterBatasWaktu | ParameterBatasNilai | null;
  tahun_id: string | null;
  berlaku_mulai: string | null;
  berlaku_selesai: string | null;
  mode: ModeAturan;
  pesan: string | null;
  prioritas: number;
  status: StatusAturan;
  versi: number;
  diaktifkan_oleh: string | null;
  diaktifkan_at: string | null;
  dibuat_oleh: string | null;
  diubah_oleh: string | null;
  created_at: string;
  updated_at: string;
  dihapus_at: string | null;
  /** Hanya di daftar. */
  jumlah_sk?: number;
}
export interface LampiranAturan {
  id: string;
  jenis: 'sk' | 'lampiran';
  nomor: string | null;
  tanggal: string | null;
  perihal: string | null;
  berkas_id: string;
  nama_file: string | null;
  mime: string | null;
  ukuran: number | null;
  dilepas_at: string | null;
  oleh: string | null;
  waktu: string;
}
export interface PengecualianAturan {
  id: string;
  subjek_jenis: 'mahasiswa' | 'dosen' | 'prodi' | 'pegawai';
  subjek: string;
  alasan: string;
  berlaku_sampai: string | null;
  berkas_id: string | null;
  oleh: string | null;
  waktu: string;
  berlaku: boolean;
}
export interface PengaturBaris {
  titik: string | null;
  jenis: 'peran' | 'izin';
  kode: string;
  keterangan: string | null;
}
export interface DetailAturan extends Aturan {
  lampiran: LampiranAturan[];
  /** null bila pengguna bukan pengatur aturan ini. */
  pengecualian: PengecualianAturan[] | null;
  pengatur: unknown;
  boleh_atur: boolean;
}
export interface RiwayatAturanItem {
  versi: number;
  aksi: string;
  catatan: string | null;
  oleh: string | null;
  waktu: string;
  data: unknown;
}
export interface TulisTembusAturan {
  diterapkan: boolean;
  alasan: string | null;
  jenis_lama: string | null;
  baris: Array<{ id?: string | number; kode_prodi?: string; idkp?: string | number; dari?: Record<string, unknown> | string | null; menjadi?: Record<string, unknown> | string | null }>;
}
export interface TitikAturan {
  kode: string;
  judul: string;
  keterangan: string;
  kategori: KategoriAturan[];
  subjek: 'mahasiswa' | 'kelas' | 'pegawai' | 'umum';
  jenis: JenisAturan[];
  konteks: string[];
  indikator: string[];
  batas_lama: string | null;
  penerapan: string[];
}
export interface IndikatorAturan {
  kode: string;
  judul: string;
  tipe: TipeIndikator;
  subjek: string;
  sumber: 'siakad' | 'konteks';
  keterangan: string;
}
export interface KatalogAturan {
  kategori: Array<{ kode: KategoriAturan; judul: string; izin_bawaan: string }>;
  jenis: Array<{ kode: JenisAturan; judul: string }>;
  operator: OpAturan[];
  titik: TitikAturan[];
  indikator: IndikatorAturan[];
}
export interface AturanSaya {
  admin: boolean;
  kategori: Array<{ kategori: KategoriAturan; judul: string; boleh_atur: boolean; prodi: string[] | null; semua_prodi: boolean; pengatur?: unknown }>;
}
export interface PelanggaranAturan {
  id: string;
  uuid?: string;
  kode: string | null;
  nama: string;
  kategori: KategoriAturan;
  jenis: JenisAturan;
  mode: ModeAturan;
  pesan: string;
  rincian?: Array<{ indikator: string; op: OpAturan; nilai?: unknown; sekarang?: unknown; pesan: string }>;
}
export interface HasilPeriksaAturan {
  titik: string;
  judul?: string;
  tahun_id?: string | null;
  waktu?: string;
  subjek?: Record<string, string>;
  boleh: boolean;
  pelanggaran: PelanggaranAturan[];
  peringatan: PelanggaranAturan[];
  diterapkan: string[];
  dikecualikan: Array<string | { id: string; nama?: string; alasan?: string }>;
  batas: { waktu?: { mulai: string | null; selesai: string | null }; [target: string]: { op?: string; nilai?: number; mulai?: string | null; selesai?: string | null } | undefined };
  indikator: Record<string, unknown>;
}
export interface PeriksaAturanInput {
  titik: string;
  nim?: string;
  /** Titik bersubjek pegawai (sdm.*): ID pegawai SDM; bawaan pegawai pemilik akun. */
  pegawai_id?: number | string;
  kode_prodi?: string;
  kelas?: string;
  dosen?: string;
  tahun_id?: string;
  konteks?: Record<string, number | string>;
  /** YYYY-MM-DD[ HH:MM]: periksa seolah-olah pada waktu itu (hanya untuk uji). */
  waktu?: string;
}
export interface FilterAturan {
  titik?: string;
  kategori?: string;
  jenis?: string;
  mode?: string;
  status?: string;
  prodi?: string;
  tahun_id?: string;
  q?: string;
  terhapus?: boolean;
  page?: number;
  per_page?: number;
}

// ================================================================ Label
export const LABEL_KATEGORI_ATURAN: Record<KategoriAturan, string> = {
  akademik: 'Akademik',
  kelulusan: 'Kelulusan',
  keuangan: 'Keuangan',
  kemahasiswaan: 'Kemahasiswaan',
  kepegawaian: 'Kepegawaian',
  penelitian: 'Penelitian & PkM',
  mutu: 'Mutu (SPMI)',
  umum: 'Umum',
};

export const LABEL_JENIS_PEGAWAI_ATURAN = { dosen: 'Dosen', tendik: 'Tendik' } as const;
export const LABEL_KATEGORI_PEGAWAI_ATURAN = { tetap: 'Tetap', tidak_tetap: 'Tidak tetap' } as const;
export const LABEL_STATUS_KEPEGAWAIAN_ATURAN: Record<string, string> = {
  pns: 'PNS',
  pppk: 'PPPK',
  dpk: 'DPK',
  tetap_yayasan: 'Tetap yayasan',
  kontrak: 'Kontrak',
  honorer: 'Honorer',
};
export const LABEL_JENIS_ATURAN: Record<JenisAturan, { label: string; keterangan: string }> = {
  syarat: { label: 'Syarat', keterangan: 'Semua kondisi harus terpenuhi sebelum langkah dijalankan.' },
  batas_waktu: { label: 'Batas waktu', keterangan: 'Langkah hanya bisa dijalankan di antara tanggal mulai dan selesai.' },
  batas_nilai: { label: 'Batas nilai', keterangan: 'Nilai (mis. SKS yang diambil) tidak boleh melewati batas, bisa bertingkat.' },
};
export const LABEL_STATUS_ATURAN: Record<StatusAturan, string> = { draf: 'Draf', aktif: 'Aktif', nonaktif: 'Nonaktif' };
const VARIAN_STATUS = { draf: 'warning', aktif: 'success', nonaktif: 'neutral' } as const;

/** Arti operator dalam kalimat ("IPK paling sedikit 2"). */
export const LABEL_OP_ATURAN: Record<OpAturan, { simbol: string; label: string }> = {
  '>=': { simbol: '≥', label: 'paling sedikit (≥)' },
  '>': { simbol: '>', label: 'lebih dari (>)' },
  '<=': { simbol: '≤', label: 'paling banyak (≤)' },
  '<': { simbol: '<', label: 'kurang dari (<)' },
  '=': { simbol: '=', label: 'sama dengan (=)' },
  '!=': { simbol: '≠', label: 'bukan (≠)' },
  dalam: { simbol: '∈', label: 'salah satu dari' },
  bukan_dalam: { simbol: '∉', label: 'bukan salah satu dari' },
  memuat: { simbol: '∋', label: 'memuat' },
  tidak_memuat: { simbol: '∌', label: 'tidak memuat' },
  benar: { simbol: '✓', label: 'harus ya' },
  salah: { simbol: '✗', label: 'harus tidak/belum' },
};
const OP_TIPE: Record<TipeIndikator, OpAturan[]> = {
  angka: ['>=', '>', '<=', '<', '=', '!=', 'dalam', 'bukan_dalam'],
  teks: ['=', '!=', 'dalam', 'bukan_dalam'],
  benar_salah: ['benar', 'salah'],
  daftar: ['memuat', 'tidak_memuat'],
};
/** Operator yang sah untuk tipe indikator (Katalog::nilaiOp). */
export const opUntukTipe = (tipe: TipeIndikator): OpAturan[] => OP_TIPE[tipe] ?? OP_TIPE.angka;

/** Kode status mahasiswa SIAKAD (m_mahasiswa.status_aktif). */
export const STATUS_MAHASISWA_ATURAN: SelectOption<string>[] = [
  { value: 'A', label: 'Aktif' },
  { value: 'C', label: 'Cuti' },
  { value: 'N', label: 'Non-aktif' },
  { value: 'L', label: 'Lulus' },
  { value: 'D', label: 'Drop out' },
  { value: 'K', label: 'Keluar' },
  { value: 'G', label: 'Sedang double degree' },
];
/** Kode jenjang SIAKAD (m_program_studi.kode_jenjang). */
export const JENJANG_ATURAN: SelectOption<string>[] = [
  { value: 'C', label: 'S1' },
  { value: 'B', label: 'S2' },
  { value: 'A', label: 'S3' },
  { value: 'D', label: 'D4' },
  { value: 'E', label: 'D3' },
  { value: 'F', label: 'D2' },
  { value: 'G', label: 'D1' },
  { value: 'J', label: 'Profesi' },
  { value: 'H', label: 'Sp-1' },
  { value: 'I', label: 'Sp-2' },
];
const HARI: SelectOption<string>[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((h, i) => ({ value: String(i + 1), label: h }));
const KEUANGAN = new Set(['tunggakan', 'bayar_syarat_krs', 'bayar_syarat_ujian', 'persen_bayar_periode', 'tagihan_periode_lunas', 'dispensasi_keuangan']);

const AKSI_RIWAYAT: Record<string, { label: string; ikon: React.ReactNode; nada?: string }> = {
  dibuat: { label: 'Dibuat', ikon: <Plus />, nada: 'primary' },
  diubah: { label: 'Diubah', ikon: <Pencil /> },
  aktif: { label: 'Diaktifkan', ikon: <Power />, nada: 'success' },
  diaktifkan: { label: 'Diaktifkan', ikon: <Power />, nada: 'success' },
  nonaktif: { label: 'Dinonaktifkan', ikon: <PowerOff />, nada: 'warning' },
  dinonaktifkan: { label: 'Dinonaktifkan', ikon: <PowerOff />, nada: 'warning' },
  tulis_tembus: { label: 'Tanggal ditulis ke menu lama', ikon: <GitBranch />, nada: 'info' },
  dihapus: { label: 'Dipindah ke sampah', ikon: <Trash2 />, nada: 'danger' },
  dipulihkan: { label: 'Dipulihkan', ikon: <ArchiveRestore />, nada: 'success' },
  lampiran: { label: 'Lampiran', ikon: <FileBadge /> },
  pengecualian: { label: 'Dispensasi', ikon: <UserCheck /> },
};

// ================================================================ Format
const angka = (v: unknown) => (typeof v === 'number' ? v.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : String(v ?? ''));
const keDate = (s: string | null | undefined) => (s ? new Date(s.length <= 10 ? `${s}T00:00:00` : s.replace(' ', 'T')) : null);
/** "20 Des 2026" atau "20 Des 2026, 17.00" bila ada jam selain 00:00/23:59. */
export function formatWaktuAturan(s: string | null | undefined, opsi: { jam?: boolean } = {}): string {
  const d = keDate(s);
  if (!d || Number.isNaN(d.getTime())) return s ?? '–';
  const tgl = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const hm = s && s.length > 10 ? s.slice(11, 16) : '';
  const tampilJam = opsi.jam ?? (hm !== '' && hm !== '00:00' && hm !== '23:59');
  return tampilJam ? `${tgl}, ${hm.replace(':', '.')}` : tgl;
}
const formatTahun = (t: string | null | undefined) => (t ? `${t.slice(0, 4)}/${Number(t.slice(0, 4)) + 1} ${t.endsWith('1') ? 'Ganjil' : t.endsWith('2') ? 'Genap' : 'Pendek'}` : 'Semua periode');
const isGrup = (k: ItemKondisi): k is GrupKondisi => typeof k === 'object' && k !== null && ('semua' in k || 'salah_satu' in k);
const kunciGrup = (g: GrupKondisi): 'semua' | 'salah_satu' => ('salah_satu' in g ? 'salah_satu' : 'semua');
const isiGrup = (g: GrupKondisi): ItemKondisi[] => ('salah_satu' in g ? g.salah_satu : g.semua) ?? [];
const buatGrup = (k: 'semua' | 'salah_satu', isi: ItemKondisi[]): GrupKondisi => (k === 'semua' ? { semua: isi } : { salah_satu: isi });

function petaIndikator(katalog: KatalogAturan | undefined) {
  return new Map((katalog?.indikator ?? []).map((i) => [i.kode, i]));
}

/** Teks nilai kondisi untuk kalimat. */
function teksNilai(c: KondisiDasar, ind?: IndikatorAturan): string {
  const v = c.nilai;
  const satu = (x: unknown) => {
    if (c.indikator === 'status_aktif') return String(STATUS_MAHASISWA_ATURAN.find((s) => s.value === x)?.label ?? x);
    if (c.indikator === 'hari') return String(HARI.find((s) => s.value === String(x))?.label ?? x);
    if (c.indikator === 'angkatan') return formatTahun(String(x));
    if (c.indikator === 'tunggakan' && typeof x === 'number') return `Rp${angka(x)}`;
    if (ind?.kode === 'persen_bayar_periode' || ind?.kode === 'presensi_persen') return `${angka(x)}%`;
    return angka(x);
  };
  if (Array.isArray(v)) return v.map(satu).join(', ');
  return v === undefined || v === null ? '' : satu(v);
}

/** Satu kondisi sebagai kalimat, mis. "IPK paling sedikit 2,75". */
export function kalimatKondisi(c: KondisiDasar, katalog?: KatalogAturan): string {
  const ind = petaIndikator(katalog).get(c.indikator);
  const judul = ind?.judul ?? c.indikator;
  if (c.op === 'benar') return judul;
  if (c.op === 'salah') return `Belum/tidak: ${judul.charAt(0).toLowerCase()}${judul.slice(1)}`;
  const kata = {
    '>=': 'minimal',
    '>': 'lebih dari',
    '<=': 'maksimal',
    '<': 'kurang dari',
    '=': ':',
    '!=': 'bukan',
    dalam: 'salah satu dari',
    bukan_dalam: 'bukan',
    memuat: 'termasuk',
    tidak_memuat: 'tidak termasuk',
  }[c.op];
  return `${judul}${kata === ':' ? ':' : ` ${kata}`} ${teksNilai(c, ind)}`;
}

/** Seluruh kondisi sebagai satu kalimat dengan "dan"/"atau" (kelompok dalam kurung). */
export function ringkasKondisi(g: GrupKondisi | null | undefined, katalog?: KatalogAturan): string {
  if (!g) return '';
  const sambung = kunciGrup(g) === 'semua' ? ' dan ' : ' atau ';
  return isiGrup(g)
    .map((k) => (isGrup(k) ? `(${ringkasKondisi(k, katalog)})` : kalimatKondisi(k, katalog)))
    .join(sambung);
}

/** Ringkasan cakupan, mis. "Informatika, Sistem Informasi · S1 · angkatan 2023 ganjil ke atas". */
export function ringkasCakupan(c: CakupanAturan | null | undefined, namaProdi?: (kode: string) => string): string {
  if (!c) return 'Semua';
  const bag: string[] = [];
  if (c.jenis_pegawai?.length) bag.push(c.jenis_pegawai.map((j) => LABEL_JENIS_PEGAWAI_ATURAN[j] ?? j).join(' & '));
  if (c.kategori_pegawai?.length) bag.push(c.kategori_pegawai.map((j) => LABEL_KATEGORI_PEGAWAI_ATURAN[j] ?? j).join('/'));
  if (c.status_kepegawaian?.length) bag.push(c.status_kepegawaian.map((j) => LABEL_STATUS_KEPEGAWAIAN_ATURAN[j] ?? j).join('/'));
  if (c.unit?.length) bag.push(`Unit ${c.unit.join(', ')}`);
  if (c.prodi?.length) bag.push(c.prodi.map((p) => namaProdi?.(p) ?? p).join(', '));
  if (c.fakultas?.length) bag.push(`Fakultas ${c.fakultas.join(', ')}`);
  if (c.jenjang?.length) bag.push(c.jenjang.map((j) => JENJANG_ATURAN.find((x) => x.value === j)?.label ?? j).join('/'));
  if (c.kelas?.length) bag.push(`Kelas ${c.kelas.join(', ')}`);
  if (c.angkatan_min && c.angkatan_max) bag.push(`Angkatan ${formatTahun(c.angkatan_min)} s.d. ${formatTahun(c.angkatan_max)}`);
  else if (c.angkatan_min) bag.push(`Angkatan ${formatTahun(c.angkatan_min)} ke atas`);
  else if (c.angkatan_max) bag.push(`Angkatan sampai ${formatTahun(c.angkatan_max)}`);
  return bag.length ? bag.join(' · ') : 'Semua prodi dan angkatan';
}

/** Posisi saat ini terhadap jendela batas waktu. */
export function posisiBatasWaktu(p: { mulai?: string | null; selesai?: string | null } | null | undefined, kini = new Date()) {
  const m = keDate(p?.mulai ?? null);
  const s = keDate(p?.selesai && p.selesai.length <= 10 ? `${p.selesai} 23:59:59` : (p?.selesai ?? null));
  if (m && kini < m) return { tahap: 'belum' as const, persen: 0, sisaHari: Math.ceil((m.getTime() - kini.getTime()) / 86_400_000) };
  if (s && kini > s) return { tahap: 'lewat' as const, persen: 100, sisaHari: 0 };
  const persen = m && s ? Math.round(((kini.getTime() - m.getTime()) / Math.max(1, s.getTime() - m.getTime())) * 100) : 50;
  return { tahap: 'buka' as const, persen, sisaHari: s ? Math.max(0, Math.ceil((s.getTime() - kini.getTime()) / 86_400_000)) : null };
}

// ================================================================ Hook
const qs = (f: object) =>
  Object.fromEntries(
    Object.entries(f)
      .filter(([, v]) => v !== undefined && v !== '' && v !== false)
      .map(([k, v]) => [k, v === true ? '1' : v]),
  );

/** Katalog titik penerapan, indikator, operator (GET /v1/aturan/katalog). */
export function useKatalogAturan() {
  return useSiakadQuery<KatalogAturan>(['aturan', 'katalog'], (s, signal) => s.request<KatalogAturan>({ method: 'GET', path: '/v1/aturan/katalog' }, { signal }), { staleTime: 30 * 60_000 });
}
/** Kategori yang boleh diatur akun ini (GET /v1/aturan/saya). */
export function useAturanSaya() {
  return useSiakadQuery<AturanSaya>(['aturan', 'saya'], (s, signal) => s.request<AturanSaya>({ method: 'GET', path: '/v1/aturan/saya' }, { signal }), { staleTime: 5 * 60_000 });
}
/** Daftar aturan (pengatur juga melihat draf dan nonaktif). */
export function useDaftarAturan(filter: FilterAturan = {}, opsi: { enabled?: boolean } = {}) {
  return useSiakadQuery<Aturan[]>(['aturan', 'daftar', filter], (s, signal) => s.request<Aturan[]>({ method: 'GET', path: '/v1/aturan', query: qs(filter) }, { signal }), opsi);
}
export function useAturan(id: string | null | undefined) {
  return useSiakadQuery<DetailAturan>(['aturan', 'detail', id ?? ''], (s, signal) => s.request<DetailAturan>({ method: 'GET', path: `/v1/aturan/${id}` }, { signal }), { enabled: Boolean(id) });
}
export function useRiwayatAturan(id: string | null | undefined) {
  return useSiakadQuery<RiwayatAturanItem[]>(['aturan', 'riwayat', id ?? ''], (s, signal) => s.request<RiwayatAturanItem[]>({ method: 'GET', path: `/v1/aturan/${id}/riwayat` }, { signal }), {
    enabled: Boolean(id),
  });
}
/** Pemeriksaan aturan di satu titik (POST /v1/aturan/periksa). Mahasiswa hanya untuk dirinya. */
export function usePeriksaAturan(input: PeriksaAturanInput | null, opsi: { enabled?: boolean } = {}) {
  return useSiakadQuery<HasilPeriksaAturan>(
    ['aturan', 'periksa', input],
    (s, signal) => s.request<HasilPeriksaAturan>({ method: 'POST', path: '/v1/aturan/periksa', body: input as unknown as Record<string, unknown> }, { signal }),
    { enabled: Boolean(input?.titik) && opsi.enabled !== false, staleTime: 15_000 },
  );
}

/** Rincian pelanggaran dari galat 409 `aturan_dilanggar` (error.details.aturan), mis. setelah POST KRS ditolak. */
export function hasilDariGalatAturan(e: unknown): HasilPeriksaAturan | null {
  const err = e as { status?: number; code?: string; details?: Record<string, unknown> } | null;
  if (!err || err.status !== 409 || !err.details) return null;
  const a = err.details.aturan as HasilPeriksaAturan | undefined;
  if (!a || typeof a !== 'object') return null;
  return {
    ...a,
    pelanggaran: a.pelanggaran ?? [],
    peringatan: a.peringatan ?? [],
    diterapkan: a.diterapkan ?? [],
    dikecualikan: a.dikecualikan ?? [],
    batas: a.batas ?? {},
    indikator: a.indikator ?? {},
    boleh: false,
  };
}

function useNamaProdi() {
  const { data } = useSiakadQuery(['referensi', 'prodi'], (s, signal) => s.referensi.getProdi({}, { signal }), { staleTime: 10 * 60_000 });
  return React.useMemo(() => {
    const prodi: SelectOption<string>[] = (data ?? []).map((p) => ({ value: String(p.kode_prodi), label: String(p.nama_prodi), group: p.nama_fakultas ?? undefined }));
    const fak = new Map<string, string>();
    for (const p of data ?? []) if (p.kode_fakultas) fak.set(String(p.kode_fakultas), String(p.nama_fakultas ?? p.kode_fakultas));
    const fakultas: SelectOption<string>[] = [...fak].map(([value, label]) => ({ value, label }));
    const nama = (k: string) => prodi.find((p) => p.value === k)?.label?.toString() ?? k;
    return { prodi, fakultas, nama };
  }, [data]);
}

// ================================================================ Lencana
/** Lencana status aturan dinamis (draf, aktif, nonaktif), atau "Dihapus" untuk aturan di sampah. */
export function StatusAturanBadge({ status, dihapus }: { status: StatusAturan; dihapus?: boolean }) {
  if (dihapus) return <Badge variant="danger">Di sampah</Badge>;
  return (
    <Badge variant={VARIAN_STATUS[status]} dot>
      {LABEL_STATUS_ATURAN[status]}
    </Badge>
  );
}
/** Lencana mode aturan: blokir (menolak aksi) atau peringatan (hanya memberi tahu). */
export function ModeAturanBadge({ mode }: { mode: ModeAturan }) {
  return mode === 'blokir' ? (
    <Badge variant="danger" className="u-aturan-mode">
      <Ban aria-hidden /> Blokir
    </Badge>
  ) : (
    <Badge variant="warning" className="u-aturan-mode">
      <TriangleAlert aria-hidden /> Peringatan
    </Badge>
  );
}
const IKON_JENIS: Record<JenisAturan, React.ReactNode> = { syarat: <ListChecks />, batas_waktu: <CalendarRange />, batas_nilai: <Gauge /> };

// ================================================================ Kartu dan daftar
export interface KartuAturanProps {
  aturan: Aturan;
  katalog?: KatalogAturan;
  onBuka?: (a: Aturan) => void;
  className?: string;
}

/** Ringkasan satu aturan: titik, jenis, status, mode, ketentuan dalam kalimat, cakupan, SK. */
export function KartuAturan({ aturan: a, katalog, onBuka, className }: KartuAturanProps) {
  const { nama } = useNamaProdi();
  const ketentuan = ringkasKetentuan(a, katalog);
  return (
    <Card
      interactive={Boolean(onBuka)}
      className={cn('u-aturan-kartu', className)}
      data-status={a.dihapus_at ? 'dihapus' : a.status}
      render={onBuka ? <button type="button" onClick={() => onBuka(a)} /> : undefined}
    >
      <div className="u-aturan-kartu-kepala">
        <span className="u-aturan-ikon" data-jenis={a.jenis} aria-hidden>
          {IKON_JENIS[a.jenis]}
        </span>
        <div className="u-aturan-kartu-judul">
          <strong>{a.nama}</strong>
          <span>{a.titik_judul ?? a.titik}</span>
        </div>
        <StatusAturanBadge status={a.status} dihapus={Boolean(a.dihapus_at)} />
      </div>
      {ketentuan && <p className="u-aturan-kartu-isi">{ketentuan}</p>}
      <div className="u-aturan-kartu-meta">
        <ModeAturanBadge mode={a.mode} />
        <Badge variant="outline">{LABEL_KATEGORI_ATURAN[a.kategori] ?? a.kategori}</Badge>
        <span>
          <Users aria-hidden /> {ringkasCakupan(a.cakupan, nama)}
        </span>
        <span>
          <CalendarRange aria-hidden /> {formatTahun(a.tahun_id)}
        </span>
        {a.jumlah_sk !== undefined && (
          <span data-kurang={a.jumlah_sk === 0 || undefined}>
            <FileBadge aria-hidden /> {a.jumlah_sk ? `${a.jumlah_sk} SK` : 'Belum ada SK'}
          </span>
        )}
      </div>
    </Card>
  );
}

/** Ketentuan aturan dalam satu kalimat (dipakai kartu dan daftar). */
export function ringkasKetentuan(a: Pick<Aturan, 'jenis' | 'kondisi' | 'parameter'>, katalog?: KatalogAturan): string {
  const bila = a.kondisi ? ringkasKondisi(a.kondisi, katalog) : '';
  if (a.jenis === 'syarat') return bila;
  if (a.jenis === 'batas_waktu') {
    const p = a.parameter as ParameterBatasWaktu | null;
    const w = p ? `${formatWaktuAturan(p.mulai)} – ${formatWaktuAturan(p.selesai)}` : '';
    return bila ? `${w}, bila ${bila}` : w;
  }
  const p = a.parameter as ParameterBatasNilai | null;
  if (!p) return '';
  const ind = petaIndikator(katalog).get(p.target);
  const kata = p.op === '<=' || p.op === '<' ? 'maksimal' : 'minimal';
  const tingkat = (p.tabel ?? []).map((b) => `${b.nilai} bila ${ringkasKondisi(b.jika, katalog)}`);
  const dasar = p.nilai !== undefined ? `${p.tabel?.length ? 'selain itu ' : ''}${p.nilai}` : '';
  return `${ind?.judul ?? p.target} ${kata} ${[...tingkat, dasar].filter(Boolean).join('; ')}`;
}

export interface DaftarAturanProps {
  /** Saringan tetap, mis. `{ titik: 'krs.ambil' }` untuk halaman KRS. */
  filter?: FilterAturan;
  onBuka?: (a: Aturan) => void;
  /** Tampilkan bilah saring (cari, titik, kategori, status). Bawaan true. */
  saring?: boolean;
  aksi?: React.ReactNode;
  className?: string;
}

/** Daftar aturan dengan bilah saring dan kartu ringkas. */
export function DaftarAturan({ filter: tetap = {}, onBuka, saring = true, aksi, className }: DaftarAturanProps) {
  const katalog = useKatalogAturan();
  const [q, setQ] = React.useState('');
  const [qTunda, setQTunda] = React.useState('');
  const [titik, setTitik] = React.useState<string | null>(null);
  const [kategori, setKategori] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<'semua' | StatusAturan>('semua');
  const [perHal, setPerHal] = React.useState(24);
  React.useEffect(() => {
    const t = setTimeout(() => setQ(qTunda.trim()), 300);
    return () => clearTimeout(t);
  }, [qTunda]);
  const filter: FilterAturan = {
    ...tetap,
    q: q || undefined,
    titik: tetap.titik ?? titik ?? undefined,
    kategori: tetap.kategori ?? kategori ?? undefined,
    status: tetap.status ?? (status === 'semua' ? undefined : status),
    per_page: perHal,
  };
  const d = useDaftarAturan(filter);
  const total = (d.meta as { total?: number } | undefined)?.total ?? d.data?.length ?? 0;
  const opsiTitik = (katalog.data?.titik ?? []).map((t) => ({ value: t.kode, label: t.judul, group: LABEL_KATEGORI_ATURAN[t.kategori[0]] }));
  const disaring = Boolean(q || titik || kategori || status !== 'semua');

  return (
    <div className={cn('u-aturan-daftar', className)}>
      {saring && (
        <div className="u-aturan-saring">
          <div className="u-aturan-cari">
            <Search aria-hidden />
            <Input value={qTunda} onChange={(e) => setQTunda(e.target.value)} placeholder="Cari nama atau kode aturan" aria-label="Cari aturan" />
          </div>
          {!tetap.titik && <Pilihan tampilan="cari" options={opsiTitik} value={titik} onValueChange={setTitik} placeholder="Semua titik penerapan" aria-label="Titik penerapan" />}
          {!tetap.kategori && (
            <Pilihan
              tampilan="daftar"
              options={[{ value: 'semua', label: 'Semua kategori' }, ...Object.entries(LABEL_KATEGORI_ATURAN).map(([value, label]) => ({ value, label }))]}
              value={kategori ?? 'semua'}
              onValueChange={(v) => setKategori(v && v !== 'semua' ? v : null)}
              aria-label="Kategori"
            />
          )}
          {!tetap.status && (
            <SegmentedControl<'semua' | StatusAturan>
              aria-label="Status"
              value={status}
              onValueChange={setStatus}
              options={[
                { value: 'semua', label: 'Semua' },
                { value: 'aktif', label: 'Aktif' },
                { value: 'draf', label: 'Draf' },
                { value: 'nonaktif', label: 'Nonaktif' },
              ]}
            />
          )}
          {aksi && <div className="u-aturan-saring-aksi">{aksi}</div>}
        </div>
      )}
      {d.error ? (
        <GalatApi error={d.error} onRetry={d.refetch} />
      ) : d.loading && !d.data ? (
        <div className="u-aturan-kisi">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={148} />
          ))}
        </div>
      ) : !d.data?.length ? (
        <Empty
          bordered
          icon={<Scale />}
          title={disaring ? 'Tidak ada aturan yang cocok' : 'Belum ada aturan'}
          description={disaring ? 'Ubah kata kunci atau saringan.' : 'Aturan yang ditambahkan akan muncul di sini sebagai draf sampai SK dilampirkan dan diaktifkan.'}
          actions={
            disaring ? (
              <Button
                variant="outline"
                onClick={() => {
                  setQTunda('');
                  setTitik(null);
                  setKategori(null);
                  setStatus('semua');
                }}
              >
                Hapus saringan
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="u-aturan-kisi" aria-busy={d.loading || undefined}>
            {d.data.map((a) => (
              <KartuAturan key={a.id} aturan={a} katalog={katalog.data} onBuka={onBuka} />
            ))}
          </div>
          {total > d.data.length && (
            <div className="u-aturan-lagi">
              <Button variant="outline" loading={d.loading} onClick={() => setPerHal((n) => Math.min(200, n + 24))}>
                Tampilkan lebih banyak ({total - d.data.length} lagi)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ================================================================ Penyusun kondisi
const MAKS_KONDISI = 30;
const MAKS_TINGKAT = 3;

function nilaiAwal(ind: IndikatorAturan | undefined, op: OpAturan): unknown {
  if (op === 'benar' || op === 'salah') return undefined;
  if (op === 'dalam' || op === 'bukan_dalam') return [];
  if (ind?.tipe === 'angka') return '';
  return '';
}
function kondisiBaru(ind: IndikatorAturan | undefined): KondisiDasar {
  const op = ind ? opUntukTipe(ind.tipe)[0] : '>=';
  const c: KondisiDasar = { indikator: ind?.kode ?? '', op };
  const n = nilaiAwal(ind, op);
  if (n !== undefined) c.nilai = n;
  return c;
}

/** Periksa kondisi seperti Katalog::kondisi; kembalikan pesan galat pertama atau null. */
export function periksaKondisi(g: GrupKondisi | null | undefined, katalog: KatalogAturan | undefined, tingkat = 0): string | null {
  if (!g) return null;
  const isi = isiGrup(g);
  if (!isi.length) return 'Kelompok kondisi masih kosong.';
  if (isi.length > MAKS_KONDISI) return `Paling banyak ${MAKS_KONDISI} kondisi per kelompok.`;
  if (tingkat > MAKS_TINGKAT) return `Kelompok bersarang paling dalam ${MAKS_TINGKAT} tingkat.`;
  const peta = petaIndikator(katalog);
  for (const k of isi) {
    if (isGrup(k)) {
      const g2 = periksaKondisi(k, katalog, tingkat + 1);
      if (g2) return g2;
      continue;
    }
    const ind = peta.get(k.indikator);
    if (!k.indikator) return 'Pilih indikator untuk setiap kondisi.';
    if (k.op === 'benar' || k.op === 'salah') continue;
    const judul = ind?.judul ?? k.indikator;
    if (k.op === 'dalam' || k.op === 'bukan_dalam') {
      if (!Array.isArray(k.nilai) || !k.nilai.length) return `${judul}: isi minimal satu nilai.`;
      if (k.nilai.length > 200) return `${judul}: paling banyak 200 nilai.`;
      continue;
    }
    if (k.nilai === '' || k.nilai === undefined || k.nilai === null) return `${judul}: nilai belum diisi.`;
    if (ind?.tipe === 'angka' && Number.isNaN(Number(k.nilai))) return `${judul}: nilai harus angka.`;
  }
  return null;
}

/** Bersihkan kondisi untuk dikirim: angka jadi number, pesan kosong dibuang. */
export function rapikanKondisi(g: GrupKondisi, katalog?: KatalogAturan): GrupKondisi {
  const peta = petaIndikator(katalog);
  const isi = isiGrup(g).map((k): ItemKondisi => {
    if (isGrup(k)) return rapikanKondisi(k, katalog);
    const ind = peta.get(k.indikator);
    const out: KondisiDasar = { indikator: k.indikator, op: k.op };
    if (k.op !== 'benar' && k.op !== 'salah') {
      const ubah = (x: unknown) => (ind?.tipe === 'angka' && x !== '' && !Number.isNaN(Number(x)) ? Number(x) : x);
      out.nilai = Array.isArray(k.nilai) ? k.nilai.map(ubah) : ubah(k.nilai);
    }
    if (k.pesan?.trim()) out.pesan = k.pesan.trim();
    return out;
  });
  return buatGrup(kunciGrup(g), isi);
}

function IsianNilaiKondisi({ c, ind, onChange, id }: { c: KondisiDasar; ind?: IndikatorAturan; onChange: (nilai: unknown) => void; id?: string }) {
  if (c.op === 'benar' || c.op === 'salah') return <span className="u-kondisi-tanpa-nilai" aria-hidden />;
  const banyak = c.op === 'dalam' || c.op === 'bukan_dalam';
  const arr = Array.isArray(c.nilai) ? c.nilai.map(String) : [];
  const satu = Array.isArray(c.nilai) ? '' : String(c.nilai ?? '');
  if (c.indikator === 'status_aktif')
    return banyak ? (
      <PilihanBanyak id={id} options={STATUS_MAHASISWA_ATURAN} value={arr} onValueChange={onChange} placeholder="Pilih status" aria-label="Status" />
    ) : (
      <Pilihan id={id} tampilan="daftar" options={STATUS_MAHASISWA_ATURAN} value={satu || null} onValueChange={(v) => onChange(v ?? '')} placeholder="Pilih status" aria-label="Status" />
    );
  if (c.indikator === 'hari')
    return banyak ? (
      <PilihanBanyak id={id} options={HARI} value={arr} onValueChange={onChange} placeholder="Pilih hari" aria-label="Hari" />
    ) : (
      <Pilihan id={id} tampilan="daftar" options={HARI} value={satu || null} onValueChange={(v) => onChange(v ?? '')} placeholder="Pilih hari" aria-label="Hari" />
    );
  if (c.indikator === 'angkatan' && !banyak) return <PilihTahunAkademik id={id} value={satu || null} onValueChange={(v) => onChange(v ?? '')} placeholder="Semester masuk" aria-label="Angkatan" />;
  if (ind?.tipe === 'daftar') return <PilihEntitas id={id} jenis="mata-kuliah" value={satu || null} onValueChange={(v) => onChange(v ?? '')} placeholder="Cari mata kuliah" aria-label="Mata kuliah" />;
  if (banyak) return <IsianDaftar id={id} value={arr} angka={ind?.tipe === 'angka'} onValueChange={onChange} />;
  return (
    <Input
      id={id}
      value={satu}
      type={ind?.tipe === 'angka' ? 'number' : 'text'}
      inputMode={ind?.tipe === 'angka' ? 'decimal' : undefined}
      step="any"
      placeholder={ind?.tipe === 'angka' ? '0' : 'Nilai'}
      aria-label={`Nilai ${ind?.judul ?? ''}`}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function opsiIndikator(katalog: KatalogAturan | undefined, kode: string[]): SelectOption<string>[] {
  const peta = petaIndikator(katalog);
  return kode
    .map((k) => peta.get(k))
    .filter((i): i is IndikatorAturan => Boolean(i))
    .map((i) => ({
      value: i.kode,
      label: i.judul,
      description: i.keterangan,
      group: i.sumber === 'konteks' ? 'Dari langkah ini' : i.subjek === 'pegawai' ? 'Kepegawaian' : KEUANGAN.has(i.kode) ? 'Keuangan' : i.subjek === 'umum' ? 'Umum' : 'Akademik',
    }));
}

function BarisKondisi({
  c,
  katalog,
  indikator,
  onChange,
  onHapus,
  idDasar,
}: {
  c: KondisiDasar;
  katalog?: KatalogAturan;
  indikator: string[];
  onChange: (c: KondisiDasar) => void;
  onHapus: () => void;
  idDasar: string;
}) {
  const peta = petaIndikator(katalog);
  const ind = peta.get(c.indikator);
  const [pesan, setPesan] = React.useState(Boolean(c.pesan));
  const opsi = opsiIndikator(katalog, indikator);
  return (
    <div className="u-kondisi-baris">
      <div className="u-kondisi-isian">
        <Pilihan
          tampilan="cari"
          options={opsi}
          value={c.indikator || null}
          aria-label="Indikator"
          placeholder="Pilih indikator"
          onValueChange={(v) => {
            const i = v ? peta.get(v) : undefined;
            onChange({ ...kondisiBaru(i), pesan: c.pesan });
          }}
        />
        <Pilihan
          tampilan="daftar"
          options={(ind ? opUntukTipe(ind.tipe) : OP_TIPE.angka).map((o) => ({ value: o, label: LABEL_OP_ATURAN[o].label }))}
          value={c.op}
          aria-label="Operator"
          onValueChange={(v) => {
            if (!v) return;
            const op = v as OpAturan;
            const lamaBanyak = c.op === 'dalam' || c.op === 'bukan_dalam';
            const baruBanyak = op === 'dalam' || op === 'bukan_dalam';
            const n: KondisiDasar = { indikator: c.indikator, op, pesan: c.pesan };
            if (op !== 'benar' && op !== 'salah') n.nilai = lamaBanyak === baruBanyak ? c.nilai : nilaiAwal(ind, op);
            onChange(n);
          }}
        />
        <IsianNilaiKondisi id={`${idDasar}-nilai`} c={c} ind={ind} onChange={(nilai) => onChange({ ...c, nilai })} />
      </div>
      <div className="u-kondisi-aksi">
        <Button
          variant={pesan ? 'soft' : 'ghost'}
          size="sm"
          iconOnly
          aria-label="Pesan khusus"
          aria-pressed={pesan}
          onClick={() => (pesan ? (setPesan(false), onChange({ ...c, pesan: undefined })) : setPesan(true))}
        >
          <MessageSquareText />
        </Button>
        <Button variant="ghost" size="sm" iconOnly aria-label="Hapus kondisi" onClick={onHapus}>
          <X />
        </Button>
      </div>
      {pesan && (
        <Input
          className="u-kondisi-pesan"
          value={c.pesan ?? ''}
          maxLength={300}
          placeholder={`Pesan bila tidak terpenuhi, mis. "${kalimatKondisi(c, katalog)}."`}
          aria-label="Pesan bila tidak terpenuhi"
          onChange={(e) => onChange({ ...c, pesan: e.target.value })}
        />
      )}
    </div>
  );
}

function SimpulGrup({
  grup,
  onChange,
  onHapus,
  katalog,
  indikator,
  tingkat,
  idDasar,
}: {
  grup: GrupKondisi;
  onChange: (g: GrupKondisi) => void;
  onHapus?: () => void;
  katalog?: KatalogAturan;
  indikator: string[];
  tingkat: number;
  idDasar: string;
}) {
  const kunci = kunciGrup(grup);
  const isi = isiGrup(grup);
  const set = (i: number, k: ItemKondisi | null) => onChange(buatGrup(kunci, k === null ? isi.filter((_, j) => j !== i) : isi.map((x, j) => (j === i ? k : x))));
  const indAwal = petaIndikator(katalog).get(indikator[0]);
  const penuh = isi.length >= MAKS_KONDISI;
  return (
    <div className="u-kondisi-grup" data-tingkat={tingkat} data-sambung={kunci}>
      <div className="u-kondisi-grup-kepala">
        <SegmentedControl<'semua' | 'salah_satu'>
          aria-label="Cara menggabungkan"
          value={kunci}
          onValueChange={(v) => onChange(buatGrup(v, isi))}
          options={[
            { value: 'semua', label: 'Semua terpenuhi' },
            { value: 'salah_satu', label: 'Salah satu terpenuhi' },
          ]}
        />
        {onHapus && (
          <Button variant="ghost" size="sm" onClick={onHapus}>
            <Trash2 /> Hapus kelompok
          </Button>
        )}
      </div>
      <ol className="u-kondisi-daftar">
        {isi.map((k, i) => (
          <li key={i} className="u-kondisi-butir">
            {i > 0 && <span className="u-kondisi-sambung">{kunci === 'semua' ? 'dan' : 'atau'}</span>}
            {isGrup(k) ? (
              <SimpulGrup grup={k} onChange={(g) => set(i, g)} onHapus={() => set(i, null)} katalog={katalog} indikator={indikator} tingkat={tingkat + 1} idDasar={`${idDasar}-${i}`} />
            ) : (
              <BarisKondisi c={k} onChange={(c) => set(i, c)} onHapus={() => set(i, null)} katalog={katalog} indikator={indikator} idDasar={`${idDasar}-${i}`} />
            )}
          </li>
        ))}
      </ol>
      <div className="u-kondisi-tambah">
        <Button variant="soft" size="sm" disabled={penuh} onClick={() => onChange(buatGrup(kunci, [...isi, kondisiBaru(indAwal)]))}>
          <Plus /> Kondisi
        </Button>
        {tingkat < MAKS_TINGKAT && (
          <Button variant="ghost" size="sm" disabled={penuh} onClick={() => onChange(buatGrup(kunci, [...isi, buatGrup(kunci === 'semua' ? 'salah_satu' : 'semua', [kondisiBaru(indAwal)])]))}>
            <GitBranch /> Kelompok {kunci === 'semua' ? '“atau”' : '“dan”'}
          </Button>
        )}
      </div>
    </div>
  );
}

export interface PenyusunKondisiProps {
  /** Titik penerapan; menentukan indikator yang tersedia. */
  titik: string;
  value: GrupKondisi | null;
  onValueChange: (v: GrupKondisi | null) => void;
  /** Boleh dikosongkan (untuk "berlaku bila" di batas waktu/nilai). */
  opsional?: boolean;
  /** Tampilkan kalimat ringkasan di bawah. Bawaan true. */
  ringkasan?: boolean;
  galat?: string;
  id?: string;
}

/**
 * Penyusun kondisi visual: kelompok "semua"/"salah satu" bersarang sampai 3 tingkat, indikator sesuai titik,
 * operator sesuai tipe indikator, isian nilai sesuai jenisnya (angka, status, angkatan, mata kuliah, daftar), dan
 * pesan khusus per kondisi. Hasilnya JSON `kondisi` yang diterima POST /v1/aturan.
 */
export function PenyusunKondisi({ titik, value, onValueChange, opsional, ringkasan = true, galat, id = 'kondisi' }: PenyusunKondisiProps) {
  const katalog = useKatalogAturan();
  const t = katalog.data?.titik.find((x) => x.kode === titik);
  const indikator = t?.indikator ?? [];
  if (!katalog.data) return <Skeleton height={96} />;
  if (!value)
    return (
      <div className="u-kondisi-kosong" id={id}>
        <p>{opsional ? 'Berlaku untuk semua mahasiswa dalam cakupan.' : 'Belum ada kondisi.'}</p>
        <Button variant="soft" size="sm" disabled={!indikator.length} onClick={() => onValueChange({ semua: [kondisiBaru(petaIndikator(katalog.data).get(indikator[0]))] })}>
          <Plus /> {opsional ? 'Tambah syarat berlaku' : 'Tambah kondisi'}
        </Button>
      </div>
    );
  const kalimat = ringkasKondisi(value, katalog.data);
  return (
    <div className="u-kondisi" id={id} data-invalid={galat ? '' : undefined}>
      <SimpulGrup grup={value} onChange={(g) => onValueChange(isiGrup(g).length ? g : opsional ? null : g)} katalog={katalog.data} indikator={indikator} tingkat={0} idDasar={id} />
      {ringkasan && kalimat && (
        <p className="u-kondisi-kalimat">
          <ShieldCheck aria-hidden />
          <span>{kalimat}.</span>
        </p>
      )}
      {galat && (
        <p className="u-field-error" role="alert">
          {galat}
        </p>
      )}
    </div>
  );
}

/** Tampilan baca-saja kondisi sebagai daftar bertingkat. Bila `hasil` diisi, tiap kondisi ditandai lulus/gagal. */
export function PohonKondisi({ kondisi, katalog: katalogProp, gagal }: { kondisi: GrupKondisi | null | undefined; katalog?: KatalogAturan; gagal?: Set<string> }) {
  const k = useKatalogAturan();
  const katalog = katalogProp ?? k.data;
  if (!kondisi) return null;
  const isi = isiGrup(kondisi);
  return (
    <div className="u-kondisi-pohon" data-sambung={kunciGrup(kondisi)}>
      <p className="u-kondisi-pohon-judul">{kunciGrup(kondisi) === 'semua' ? 'Semua berikut terpenuhi' : 'Salah satu berikut terpenuhi'}</p>
      <ul>
        {isi.map((c, i) => (
          <li key={i}>
            {isGrup(c) ? (
              <PohonKondisi kondisi={c} katalog={katalog} gagal={gagal} />
            ) : (
              <span className="u-kondisi-pohon-baris" data-gagal={gagal?.has(c.indikator) || undefined}>
                {gagal ? gagal.has(c.indikator) ? <CircleX aria-hidden /> : <CircleCheck aria-hidden /> : <span className="u-kondisi-titik" aria-hidden />}
                <span>
                  {kalimatKondisi(c, katalog)}
                  {c.pesan && <em> — {c.pesan}</em>}
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ================================================================ Isian waktu
function IsianWaktu({ value, onValueChange, id, akhirHari, disabled }: { value: string; onValueChange: (v: string) => void; id?: string; akhirHari?: boolean; disabled?: boolean }) {
  const tgl = value.slice(0, 10);
  const jam = value.length > 10 ? value.slice(11, 16) : '';
  return (
    <div className="u-aturan-waktu">
      <IsianTanggal id={id} value={tgl || null} disabled={disabled} onValueChange={(v) => onValueChange(v ? (jam ? `${v} ${jam}` : v) : '')} />
      <Input
        type="time"
        value={jam}
        disabled={disabled || !tgl}
        aria-label="Jam"
        title={akhirHari ? 'Kosong = sampai 23.59' : 'Kosong = mulai 00.00'}
        onChange={(e) => onValueChange(e.target.value ? `${tgl} ${e.target.value}` : tgl)}
      />
    </div>
  );
}

// ================================================================ Formulir aturan
interface IsiAturan {
  titik: string;
  kategori: string;
  jenis: JenisAturan | '';
  nama: string;
  kode: string;
  keterangan: string;
  prioritas: string;
  kondisi: GrupKondisi | null;
  mulai: string;
  selesai: string;
  target: string;
  opBatas: ParameterBatasNilai['op'];
  nilaiBatas: string;
  tabel: Array<{ jika: GrupKondisi | null; nilai: string }>;
  prodi: string[];
  fakultas: string[];
  jenjang: string[];
  kelas: string[];
  angkatan_min: string;
  angkatan_max: string;
  unit: string[];
  jenis_pegawai: string[];
  kategori_pegawai: string[];
  status_kepegawaian: string[];
  tahun_id: string;
  berlaku_mulai: string;
  berlaku_selesai: string;
  mode: ModeAturan;
  pesan: string;
  catatan: string;
}

/** Isian cakupan untuk titik bersubjek pegawai (sdm.*): jenis, kategori, status kepegawaian, dan unit SDM. */
function CakupanPegawai({ isi, set, galat }: { isi: IsiAturan; set: <K extends keyof IsiAturan>(k: K, v: IsiAturan[K]) => void; galat: Record<string, string> }) {
  const unit = useSiakadQuery<Array<{ kode: string; nama: string; jenis?: string }>>(
    ['aturan', 'unit-sdm'],
    (s, signal) => s.request<Array<{ kode: string; nama: string; jenis?: string }>>({ method: 'GET', path: '/v1/sdm/master/unit', query: { aktif: '1' } }, { signal }),
    { staleTime: 600_000 },
  );
  const opsi = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }));
  return (
    <>
      <Field label="Jenis pegawai" optional error={galat['cakupan.jenis_pegawai'] || undefined}>
        <PilihanBanyak id="aturan-jenis_pegawai" options={opsi(LABEL_JENIS_PEGAWAI_ATURAN)} value={isi.jenis_pegawai} onValueChange={(v) => set('jenis_pegawai', v)} placeholder="Dosen dan tendik" />
      </Field>
      <Field label="Kategori" optional error={galat['cakupan.kategori_pegawai'] || undefined}>
        <PilihanBanyak
          id="aturan-kategori_pegawai"
          options={opsi(LABEL_KATEGORI_PEGAWAI_ATURAN)}
          value={isi.kategori_pegawai}
          onValueChange={(v) => set('kategori_pegawai', v)}
          placeholder="Tetap dan tidak tetap"
        />
      </Field>
      <Field label="Status kepegawaian" optional error={galat['cakupan.status_kepegawaian'] || undefined}>
        <PilihanBanyak
          id="aturan-status_kepegawaian"
          options={opsi(LABEL_STATUS_KEPEGAWAIAN_ATURAN)}
          value={isi.status_kepegawaian}
          onValueChange={(v) => set('status_kepegawaian', v)}
          placeholder="Semua status"
        />
      </Field>
      <Field label="Unit kerja" optional description="Berlaku untuk unit itu dan unit di bawahnya." error={galat['cakupan.unit'] || undefined}>
        <PilihanBanyak
          id="aturan-unit"
          options={(unit.data ?? []).map((u) => ({ value: u.kode, label: u.nama, description: u.jenis }))}
          value={isi.unit}
          onValueChange={(v) => set('unit', v)}
          placeholder={isi.unit.length ? 'Tambah unit' : 'Semua unit'}
        />
      </Field>
    </>
  );
}

function isiDari(a: Partial<Aturan> | null | undefined, titikAwal?: string): IsiAturan {
  const pw = a?.jenis === 'batas_waktu' ? (a.parameter as ParameterBatasWaktu | null) : null;
  const pn = a?.jenis === 'batas_nilai' ? (a.parameter as ParameterBatasNilai | null) : null;
  const pendek = (s?: string | null) => (s ? (s.slice(11, 16) === '00:00' || s.slice(11, 16) === '23:59' || s.length <= 10 ? s.slice(0, 10) : s.slice(0, 16)) : '');
  return {
    titik: a?.titik ?? titikAwal ?? '',
    kategori: a?.kategori ?? '',
    jenis: a?.jenis ?? '',
    nama: a?.nama ?? '',
    kode: a?.kode ?? '',
    keterangan: a?.keterangan ?? '',
    prioritas: String(a?.prioritas ?? 0),
    kondisi: a?.kondisi ?? null,
    mulai: pendek(pw?.mulai),
    selesai: pendek(pw?.selesai),
    target: pn?.target ?? 'sks_diambil',
    opBatas: pn?.op ?? '<=',
    nilaiBatas: pn?.nilai !== undefined ? String(pn.nilai) : '',
    tabel: (pn?.tabel ?? []).map((b) => ({ jika: b.jika, nilai: String(b.nilai) })),
    prodi: a?.cakupan?.prodi ?? [],
    fakultas: a?.cakupan?.fakultas ?? [],
    jenjang: a?.cakupan?.jenjang ?? [],
    kelas: a?.cakupan?.kelas ?? [],
    angkatan_min: a?.cakupan?.angkatan_min ?? '',
    angkatan_max: a?.cakupan?.angkatan_max ?? '',
    unit: a?.cakupan?.unit ?? [],
    jenis_pegawai: a?.cakupan?.jenis_pegawai ?? [],
    kategori_pegawai: a?.cakupan?.kategori_pegawai ?? [],
    status_kepegawaian: a?.cakupan?.status_kepegawaian ?? [],
    tahun_id: a?.tahun_id ?? '',
    berlaku_mulai: pendek(a?.berlaku_mulai),
    berlaku_selesai: pendek(a?.berlaku_selesai),
    mode: a?.mode ?? 'blokir',
    pesan: a?.pesan ?? '',
    catatan: '',
  };
}

/** Validasi sisi peramban yang sama dengan AturanService::validasi + Katalog::parameter/cakupan. */
export function periksaIsianAturan(x: IsiAturan, katalog: KatalogAturan | undefined): Record<string, string> {
  const g: Record<string, string> = {};
  const t = katalog?.titik.find((y) => y.kode === x.titik);
  if (!x.titik) g.titik = 'Pilih titik penerapan.';
  if (t && x.kategori && !t.kategori.includes(x.kategori as KategoriAturan)) g.kategori = `Titik ini menerima: ${t.kategori.map((k) => LABEL_KATEGORI_ATURAN[k]).join(', ')}.`;
  if (!x.kategori) g.kategori = 'Pilih kategori.';
  if (!x.jenis) g.jenis = 'Pilih jenis aturan.';
  else if (t && !t.jenis.includes(x.jenis)) g.jenis = 'Jenis ini tidak tersedia di titik yang dipilih.';
  if (!x.nama.trim()) g.nama = 'Nama aturan wajib diisi.';
  else if (x.nama.length > 200) g.nama = 'Maksimal 200 karakter.';
  if (x.kode && !/^[A-Za-z0-9_.-]{1,60}$/.test(x.kode)) g.kode = 'Huruf, angka, _ . - (maks. 60).';
  if (x.prioritas && !/^-?\d+$/.test(x.prioritas)) g.prioritas = 'Angka bulat.';
  if (x.jenis === 'syarat' && !x.kondisi) g.kondisi = 'Aturan syarat wajib punya minimal satu kondisi.';
  const gk = periksaKondisi(x.kondisi, katalog);
  if (gk) g.kondisi = gk;
  if (x.jenis === 'batas_waktu') {
    if (!x.mulai) g.mulai = 'Isi tanggal mulai.';
    if (!x.selesai) g.selesai = 'Isi tanggal selesai.';
    if (x.mulai && x.selesai && x.selesai.slice(0, 10) < x.mulai.slice(0, 10)) g.selesai = 'Tidak boleh sebelum tanggal mulai.';
  }
  if (x.jenis === 'batas_nilai') {
    if (!x.target) g.target = 'Pilih nilai yang dibatasi.';
    if (x.nilaiBatas === '' && !x.tabel.length) g.nilaiBatas = 'Isi batas bawaan atau tambah tingkat batas.';
    if (x.nilaiBatas !== '' && Number.isNaN(Number(x.nilaiBatas))) g.nilaiBatas = 'Harus angka.';
    if (x.tabel.length > 30) g.tabel = 'Paling banyak 30 tingkat.';
    x.tabel.forEach((b, i) => {
      if (b.nilai === '' || Number.isNaN(Number(b.nilai))) g[`tabel.${i}`] = 'Isi batas berupa angka.';
      const gj = b.jika ? periksaKondisi(b.jika, katalog) : 'Isi kondisi tingkat ini.';
      if (gj) g[`tabel.${i}`] = gj;
    });
  }
  if (x.angkatan_min && x.angkatan_max && x.angkatan_max < x.angkatan_min) g.angkatan_max = 'Tidak boleh sebelum angkatan awal.';
  if (x.berlaku_mulai && x.berlaku_selesai && x.berlaku_selesai.slice(0, 10) < x.berlaku_mulai.slice(0, 10)) g.berlaku_selesai = 'Tidak boleh sebelum tanggal mulai berlaku.';
  if (x.pesan.length > 500) g.pesan = 'Maksimal 500 karakter.';
  return g;
}

function bodyAturan(x: IsiAturan, katalog: KatalogAturan | undefined, ubah: boolean): Record<string, unknown> {
  const cakupan: CakupanAturan = {};
  if (x.prodi.length) cakupan.prodi = x.prodi;
  if (x.fakultas.length) cakupan.fakultas = x.fakultas;
  if (x.jenjang.length) cakupan.jenjang = x.jenjang;
  if (x.kelas.length) cakupan.kelas = x.kelas;
  if (x.angkatan_min) cakupan.angkatan_min = x.angkatan_min;
  if (x.angkatan_max) cakupan.angkatan_max = x.angkatan_max;
  if (x.unit.length) cakupan.unit = x.unit;
  if (x.jenis_pegawai.length) cakupan.jenis_pegawai = x.jenis_pegawai as CakupanAturan['jenis_pegawai'];
  if (x.kategori_pegawai.length) cakupan.kategori_pegawai = x.kategori_pegawai as CakupanAturan['kategori_pegawai'];
  if (x.status_kepegawaian.length) cakupan.status_kepegawaian = x.status_kepegawaian;
  let parameter: ParameterBatasWaktu | ParameterBatasNilai | null = null;
  if (x.jenis === 'batas_waktu') parameter = { mulai: x.mulai, selesai: x.selesai };
  if (x.jenis === 'batas_nilai') {
    const p: ParameterBatasNilai = { target: x.target, op: x.opBatas };
    if (x.nilaiBatas !== '') p.nilai = Number(x.nilaiBatas);
    if (x.tabel.length) p.tabel = x.tabel.map((b) => ({ jika: rapikanKondisi(b.jika as GrupKondisi, katalog), nilai: Number(b.nilai) }));
    parameter = p;
  }
  const body: Record<string, unknown> = {
    kategori: x.kategori,
    jenis: x.jenis,
    nama: x.nama.trim(),
    kode: x.kode.trim() || null,
    keterangan: x.keterangan.trim() || null,
    prioritas: Number(x.prioritas || 0),
    kondisi: x.kondisi ? rapikanKondisi(x.kondisi, katalog) : null,
    parameter,
    cakupan,
    tahun_id: x.tahun_id || null,
    berlaku_mulai: x.berlaku_mulai || null,
    berlaku_selesai: x.berlaku_selesai || null,
    mode: x.mode,
    pesan: x.pesan.trim() || null,
  };
  if (!ubah) body.titik = x.titik;
  if (ubah && x.catatan.trim()) body.catatan = x.catatan.trim();
  return body;
}

export interface FormAturanProps {
  /** Aturan yang diubah; kosong = tambah (draf). */
  aturan?: Aturan | null;
  /** Titik awal saat menambah, mis. dari halaman KRS. */
  titik?: string;
  /** Kategori awal saat menambah. */
  kategori?: KategoriAturan;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactElement;
  onTersimpan?: (a: DetailAturan & { tulis_tembus?: TulisTembusAturan }) => void;
}

/**
 * Tambah atau ubah aturan (POST /v1/aturan, POST /v1/aturan/{id}): titik penerapan, kategori, jenis, ketentuan
 * (penyusun kondisi, rentang waktu, atau batas bertingkat), cakupan, masa berlaku, mode, dan pesan. Aturan baru
 * tersimpan sebagai draf; mengubah aturan aktif menaikkan versi dan mencatat riwayat.
 */
export function FormAturan({ aturan, titik: titikAwal, kategori: kategoriAwal, open, onOpenChange, trigger, onTersimpan }: FormAturanProps) {
  const katalog = useKatalogAturan();
  const saya = useAturanSaya();
  const siakad = useSiakad();
  const toast = useToast();
  const { prodi: opsiProdi, fakultas: opsiFakultas } = useNamaProdi();
  const ubah = Boolean(aturan);
  const awal = React.useMemo(() => {
    const x = isiDari(aturan, titikAwal);
    if (!aturan && kategoriAwal) x.kategori = kategoriAwal;
    const ta = katalog.data?.titik.find((y) => y.kode === x.titik);
    if (!aturan && ta) {
      const boleh = (k: string) => !saya.data || saya.data.admin || saya.data.kategori.some((s) => s.kategori === k && s.boleh_atur);
      if (!x.kategori || !ta.kategori.includes(x.kategori as KategoriAturan)) x.kategori = ta.kategori.find(boleh) ?? '';
      if (!x.jenis) x.jenis = ta.jenis[0] ?? '';
    }
    return x;
  }, [aturan, titikAwal, kategoriAwal, katalog.data, saya.data]);
  const [isi, setIsi] = React.useState<IsiAturan>(awal);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [inner, setInner] = React.useState(false);
  const isOpen = open ?? inner;
  React.useEffect(() => {
    if (isOpen) {
      setIsi(awal);
      setGalat({});
    }
  }, [isOpen, awal]);
  const set = <K extends keyof IsiAturan>(k: K, v: IsiAturan[K]) => {
    setIsi((x) => ({ ...x, [k]: v }));
    setGalat((g) => (g[k] ? { ...g, [k]: '' } : g));
  };
  const t = katalog.data?.titik.find((y) => y.kode === isi.titik);
  const peta = petaIndikator(katalog.data);
  const bolehKategori = (k: string) => !saya.data || saya.data.admin || saya.data.kategori.some((s) => s.kategori === k && s.boleh_atur);
  const opsiTitik: SelectOption<string>[] = (katalog.data?.titik ?? []).map((y) => ({
    value: y.kode,
    label: y.judul,
    group: LABEL_KATEGORI_ATURAN[y.kategori[0]],
    disabled: saya.data ? !y.kategori.some(bolehKategori) : false,
  }));
  const opsiKategori: SelectOption<string>[] = (t?.kategori ?? []).map((k) => ({ value: k, label: LABEL_KATEGORI_ATURAN[k], disabled: !bolehKategori(k) }));
  const opsiJenis: SelectOption<string>[] = (t?.jenis ?? []).map((j) => ({ value: j, label: LABEL_JENIS_ATURAN[j].label, icon: IKON_JENIS[j] }));
  const opsiTarget = (t?.indikator ?? []).filter((k) => peta.get(k)?.tipe === 'angka').map((k) => ({ value: k, label: peta.get(k)?.judul ?? k }));
  const berubah = JSON.stringify(isi) !== JSON.stringify(awal);
  const prodiSaya = saya.data?.kategori.find((k) => k.kategori === isi.kategori);
  const prodiTerbatas = Boolean(saya.data && !saya.data.admin && prodiSaya && !prodiSaya.semua_prodi && prodiSaya.prodi);
  const tulisTembus = Boolean(t?.batas_lama && isi.jenis === 'batas_waktu');

  return (
    <PanelForm
      open={isOpen}
      onOpenChange={(o) => {
        setInner(o);
        onOpenChange?.(o);
      }}
      trigger={trigger}
      size="xl"
      title={ubah ? `Ubah aturan: ${aturan?.nama}` : 'Tambah aturan'}
      description={
        ubah
          ? aturan?.status === 'aktif'
            ? 'Aturan ini aktif. Perubahan langsung berlaku, versi naik, dan tercatat di riwayat.'
            : 'Perubahan tercatat di riwayat aturan.'
          : 'Aturan baru tersimpan sebagai draf. Lampirkan SK lalu aktifkan agar mulai ditegakkan.'
      }
      berubah={berubah}
      labelSimpan={ubah ? 'Simpan perubahan' : 'Simpan draf'}
      disabled={!katalog.data}
      onSimpan={async () => {
        const g = periksaIsianAturan(isi, katalog.data);
        setGalat(g);
        const k = Object.keys(g).find((x) => g[x]);
        if (k) {
          requestAnimationFrame(() => document.getElementById(`aturan-${k.split('.')[0]}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
          return 'Periksa isian yang ditandai.';
        }
        let r: DetailAturan & { tulis_tembus?: TulisTembusAturan };
        try {
          r = (
            await siakad.request<DetailAturan & { tulis_tembus?: TulisTembusAturan }>({
              method: 'POST',
              path: ubah ? `/v1/aturan/${aturan!.id}` : '/v1/aturan',
              body: bodyAturan(isi, katalog.data, ubah),
            })
          ).data;
        } catch (e) {
          const f = (e as { fields?: Record<string, unknown> }).fields;
          if (f && Object.keys(f).length) {
            const peta2: Record<string, string> = {};
            for (const [kk, v] of Object.entries(f)) {
              const kunci = kk.startsWith('parameter.tabel.')
                ? `tabel.${kk.split('.')[2]}`
                : kk.startsWith('parameter.selesai')
                  ? 'selesai'
                  : kk.startsWith('parameter')
                    ? isi.jenis === 'batas_waktu'
                      ? 'mulai'
                      : 'nilaiBatas'
                    : kk.startsWith('kondisi')
                      ? 'kondisi'
                      : kk.startsWith('cakupan.')
                        ? kk.slice(8)
                        : kk;
              peta2[kunci] = String(v);
            }
            setGalat(peta2);
            return 'Periksa isian yang ditandai.';
          }
          throw e;
        }
        invalidateSiakad('aturan');
        toast.add({
          title: ubah ? 'Aturan diperbarui' : 'Draf aturan tersimpan',
          description: r.tulis_tembus?.diterapkan
            ? `Tanggal juga ditulis ke menu batas waktu lama (${r.tulis_tembus.baris.length} baris).`
            : ubah
              ? `Versi ${r.versi}.`
              : 'Lampirkan SK lalu aktifkan.',
          type: 'success',
        });
        onTersimpan?.(r);
      }}
    >
      <BagianForm judul="Di mana aturan ditegakkan" keterangan="Titik penerapan adalah langkah bisnis yang memeriksa aturan ini. Titik tidak bisa diubah setelah disimpan." ikon={<Target />}>
        <Field label="Titik penerapan" required className="u-form-lebar" error={galat.titik || undefined} description={t?.keterangan}>
          <Pilihan
            id="aturan-titik"
            tampilan="cari"
            options={opsiTitik}
            value={isi.titik || null}
            disabled={ubah}
            placeholder="Cari langkah, mis. KRS, input nilai, wisuda"
            onValueChange={(v) => {
              const baru = katalog.data?.titik.find((y) => y.kode === v);
              setIsi((x) => ({
                ...x,
                titik: v ?? '',
                kategori: baru?.kategori.includes(x.kategori as KategoriAturan) ? x.kategori : (baru?.kategori.find(bolehKategori) ?? ''),
                jenis: baru?.jenis.includes(x.jenis as JenisAturan) ? x.jenis : (baru?.jenis[0] ?? ''),
                kondisi: null,
                tabel: [],
                target: baru?.konteks.includes('sks_diambil') ? 'sks_diambil' : (baru?.indikator.find((k) => peta.get(k)?.tipe === 'angka') ?? ''),
              }));
              setGalat({});
            }}
          />
        </Field>
        {t && (
          <>
            <Field label="Kategori" required error={galat.kategori || undefined} description="Menentukan siapa yang berwenang mengatur.">
              <Pilihan id="aturan-kategori" options={opsiKategori} value={isi.kategori || null} required onValueChange={(v) => set('kategori', v ?? '')} />
            </Field>
            <Field label="Jenis aturan" required error={galat.jenis || undefined} description={isi.jenis ? LABEL_JENIS_ATURAN[isi.jenis].keterangan : undefined}>
              <Pilihan id="aturan-jenis" tampilan="tombol" options={opsiJenis} value={isi.jenis || null} required onValueChange={(v) => set('jenis', (v ?? '') as JenisAturan)} />
            </Field>
            {t.penerapan.length > 0 && (
              <details className="u-aturan-penerapan u-form-lebar">
                <summary>Ditegakkan di {t.penerapan.length} langkah</summary>
                <ul>
                  {t.penerapan.map((p) => (
                    <li key={p}>
                      <code>{p}</code>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </BagianForm>

      <BagianForm judul="Identitas" ikon={<FileText />}>
        <Field label="Nama aturan" required className="u-form-lebar" error={galat.nama || undefined}>
          <Input id="aturan-nama" value={isi.nama} maxLength={200} placeholder="Mis. Batas SKS KRS menurut IPS" onChange={(e) => set('nama', e.target.value)} />
        </Field>
        <Field label="Kode" optional error={galat.kode || undefined} description="Unik, untuk dirujuk aplikasi lain.">
          <Input id="aturan-kode" value={isi.kode} maxLength={60} placeholder="mis. krs.batas-sks" onChange={(e) => set('kode', e.target.value)} />
        </Field>
        <Field label="Prioritas" optional error={galat.prioritas || undefined} description="Angka lebih besar diperiksa lebih dulu.">
          <Input id="aturan-prioritas" type="number" inputMode="numeric" value={isi.prioritas} onChange={(e) => set('prioritas', e.target.value)} />
        </Field>
        <Field label="Keterangan" optional className="u-form-lebar">
          <Textarea id="aturan-keterangan" rows={2} value={isi.keterangan} placeholder="Dasar aturan, mis. Peraturan Akademik Pasal 12." onChange={(e) => set('keterangan', e.target.value)} />
        </Field>
      </BagianForm>

      {t && isi.jenis === 'syarat' && (
        <BagianForm judul="Syarat" keterangan="Susun kondisi yang harus dipenuhi. Kelompok “salah satu” untuk alternatif, mis. bebas tunggakan atau punya dispensasi." ikon={<ListChecks />} kolom={1}>
          <PenyusunKondisi id="aturan-kondisi" titik={isi.titik} value={isi.kondisi} onValueChange={(v) => set('kondisi', v)} galat={galat.kondisi || undefined} />
        </BagianForm>
      )}

      {t && isi.jenis === 'batas_waktu' && (
        <BagianForm judul="Rentang waktu" keterangan="Langkah hanya bisa dijalankan di antara waktu ini. Jam kosong berarti sepanjang hari." ikon={<CalendarRange />}>
          <Field label="Mulai" required error={galat.mulai || undefined}>
            <IsianWaktu id="aturan-mulai" value={isi.mulai} onValueChange={(v) => set('mulai', v)} />
          </Field>
          <Field label="Selesai" required error={galat.selesai || undefined}>
            <IsianWaktu id="aturan-selesai" value={isi.selesai} akhirHari onValueChange={(v) => set('selesai', v)} />
          </Field>
          {tulisTembus && (
            <Alert variant="info" className="u-form-lebar" icon={<GitBranch />} title="Ikut menu batas waktu lama">
              Bila periode diisi dan cakupan hanya prodi/fakultas tanpa syarat berlaku, tanggal ini ditulis ke menu Tahun Akademik saat diaktifkan, sehingga halaman web lama memakai tanggal yang sama.
            </Alert>
          )}
          <Field label="Berlaku bila" optional className="u-form-lebar" description="Mis. batas khusus mahasiswa semester 1–2.">
            <PenyusunKondisi id="aturan-kondisi" titik={isi.titik} opsional value={isi.kondisi} onValueChange={(v) => set('kondisi', v)} galat={galat.kondisi || undefined} />
          </Field>
        </BagianForm>
      )}

      {t && isi.jenis === 'batas_nilai' && (
        <BagianForm judul="Batas nilai" keterangan="Tingkat pertama yang kondisinya terpenuhi dipakai; bila tidak ada, batas bawaan." ikon={<Gauge />}>
          <Field label="Nilai yang dibatasi" required error={galat.target || undefined}>
            <Pilihan id="aturan-target" options={opsiTarget} value={isi.target || null} onValueChange={(v) => set('target', v ?? '')} />
          </Field>
          <Field label="Arah batas" required>
            <Pilihan
              tampilan="tombol"
              required
              options={[
                { value: '<=', label: 'Maksimal (≤)' },
                { value: '<', label: 'Kurang dari' },
                { value: '>=', label: 'Minimal (≥)' },
                { value: '>', label: 'Lebih dari' },
              ]}
              value={isi.opBatas}
              onValueChange={(v) => v && set('opBatas', v as IsiAturan['opBatas'])}
            />
          </Field>
          <div className="u-form-lebar u-aturan-tingkat" id="aturan-tabel">
            {isi.tabel.map((b, i) => (
              <div key={i} className="u-aturan-tingkat-baris" data-invalid={galat[`tabel.${i}`] ? '' : undefined}>
                <div className="u-aturan-tingkat-kepala">
                  <strong>Tingkat {i + 1}</strong>
                  <div className="u-aturan-tingkat-nilai">
                    <span>batas</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={b.nilai}
                      aria-label={`Batas tingkat ${i + 1}`}
                      onChange={(e) =>
                        set(
                          'tabel',
                          isi.tabel.map((x, j) => (j === i ? { ...x, nilai: e.target.value } : x)),
                        )
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    aria-label={`Hapus tingkat ${i + 1}`}
                    onClick={() =>
                      set(
                        'tabel',
                        isi.tabel.filter((_, j) => j !== i),
                      )
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
                <PenyusunKondisi
                  id={`aturan-tabel-${i}`}
                  titik={isi.titik}
                  value={b.jika}
                  ringkasan={false}
                  onValueChange={(v) =>
                    set(
                      'tabel',
                      isi.tabel.map((x, j) => (j === i ? { ...x, jika: v } : x)),
                    )
                  }
                  galat={galat[`tabel.${i}`] || undefined}
                />
              </div>
            ))}
            <Button
              variant="soft"
              size="sm"
              disabled={isi.tabel.length >= 30}
              onClick={() => set('tabel', [...isi.tabel, { jika: { semua: [kondisiBaru(peta.get(t.indikator.includes('ips_lalu') ? 'ips_lalu' : t.indikator[0]))] }, nilai: '' }])}
            >
              <Plus /> Tambah tingkat
            </Button>
          </div>
          <Field label={isi.tabel.length ? 'Batas selain itu' : 'Batas'} required={!isi.tabel.length} optional={isi.tabel.length > 0} error={galat.nilaiBatas || undefined}>
            <Input id="aturan-nilaiBatas" type="number" inputMode="decimal" value={isi.nilaiBatas} placeholder="mis. 18" onChange={(e) => set('nilaiBatas', e.target.value)} />
          </Field>
          <Field label="Berlaku bila" optional className="u-form-lebar">
            <PenyusunKondisi id="aturan-kondisi" titik={isi.titik} opsional value={isi.kondisi} onValueChange={(v) => set('kondisi', v)} galat={galat.kondisi || undefined} />
          </Field>
        </BagianForm>
      )}

      <BagianForm
        judul="Cakupan"
        keterangan={
          prodiTerbatas
            ? 'Anda hanya bisa mengatur prodi dalam unit Anda.'
            : t?.subjek === 'pegawai'
              ? 'Kosongkan untuk semua dosen dan tendik. Prodi/fakultas = homebase pegawai.'
              : 'Kosongkan untuk semua mahasiswa.'
        }
        ikon={<Users />}
      >
        <Field label="Program studi" optional error={galat.prodi || undefined}>
          <PilihanBanyak
            id="aturan-prodi"
            options={prodiTerbatas ? opsiProdi.filter((p) => prodiSaya?.prodi?.includes(p.value)) : opsiProdi}
            value={isi.prodi}
            onValueChange={(v) => set('prodi', v)}
            placeholder={isi.prodi.length ? 'Tambah prodi' : 'Semua prodi'}
          />
        </Field>
        <Field label="Fakultas" optional error={galat.fakultas || undefined}>
          <PilihanBanyak
            id="aturan-fakultas"
            options={opsiFakultas}
            value={isi.fakultas}
            onValueChange={(v) => set('fakultas', v)}
            placeholder={isi.fakultas.length ? 'Tambah fakultas' : 'Semua fakultas'}
          />
        </Field>
        {t?.subjek === 'pegawai' ? (
          <CakupanPegawai isi={isi} set={set} galat={galat} />
        ) : (
          <>
            <Field label="Jenjang" optional className="u-form-lebar" error={galat.jenjang || undefined}>
              <IsianDaftar
                id="aturan-jenjang"
                value={isi.jenjang}
                onValueChange={(v) => set('jenjang', v)}
                enumNilai={JENJANG_ATURAN.map((j) => j.value)}
                labelOpsi={(v) => JENJANG_ATURAN.find((j) => j.value === v)?.label ?? v}
              />
            </Field>
            <Field label="Angkatan dari" optional error={galat.angkatan_min || undefined}>
              <PilihTahunAkademik id="aturan-angkatan_min" value={isi.angkatan_min || null} onValueChange={(v) => set('angkatan_min', v ?? '')} placeholder="Semua angkatan" />
            </Field>
            <Field label="Angkatan sampai" optional error={galat.angkatan_max || undefined}>
              <PilihTahunAkademik id="aturan-angkatan_max" value={isi.angkatan_max || null} onValueChange={(v) => set('angkatan_max', v ?? '')} placeholder="Semua angkatan" />
            </Field>
            <Field label="Kelas" optional className="u-form-lebar" description="Kode kelas, mis. R (reguler) atau K (karyawan). Tekan Enter tiap kode." error={galat.kelas || undefined}>
              <IsianDaftar id="aturan-kelas" value={isi.kelas} onValueChange={(v) => set('kelas', v)} />
            </Field>
          </>
        )}
      </BagianForm>

      <BagianForm judul="Masa berlaku dan penegakan" ikon={<ShieldHalf />}>
        <Field label="Periode" optional description="Kosong = semua periode." error={galat.tahun_id || undefined}>
          <PilihTahunAkademik id="aturan-tahun_id" value={isi.tahun_id || null} onValueChange={(v) => set('tahun_id', v ?? '')} placeholder="Semua periode" />
        </Field>
        <Field label="Mode" required description={isi.mode === 'blokir' ? 'Langkah ditolak bila aturan tidak terpenuhi.' : 'Langkah tetap jalan; pesan ditampilkan sebagai peringatan.'}>
          <Pilihan
            id="aturan-mode"
            tampilan="tombol"
            required
            options={[
              { value: 'blokir', label: 'Blokir', icon: <Ban /> },
              { value: 'peringatan', label: 'Peringatan', icon: <TriangleAlert /> },
            ]}
            value={isi.mode}
            onValueChange={(v) => v && set('mode', v as ModeAturan)}
          />
        </Field>
        <Field label="Berlaku mulai" optional error={galat.berlaku_mulai || undefined}>
          <IsianWaktu id="aturan-berlaku_mulai" value={isi.berlaku_mulai} onValueChange={(v) => set('berlaku_mulai', v)} />
        </Field>
        <Field label="Berlaku sampai" optional error={galat.berlaku_selesai || undefined}>
          <IsianWaktu id="aturan-berlaku_selesai" value={isi.berlaku_selesai} akhirHari onValueChange={(v) => set('berlaku_selesai', v)} />
        </Field>
        <Field
          label={
            <>
              Pesan untuk pengguna <HitungKarakter nilai={isi.pesan} maks={500} />
            </>
          }
          optional
          className="u-form-lebar"
          description="Menggantikan pesan otomatis. Kosongkan agar pesan dibuat dari kondisi, mis. “SKS lulus minimal 100 (sekarang 92).”"
          error={galat.pesan || undefined}
        >
          <Textarea id="aturan-pesan" rows={2} value={isi.pesan} onChange={(e) => set('pesan', e.target.value)} />
        </Field>
        {ubah && (
          <Field label="Catatan perubahan" optional className="u-form-lebar" description="Masuk riwayat aturan, mis. nomor SK perubahan.">
            <Input id="aturan-catatan" value={isi.catatan} maxLength={500} onChange={(e) => set('catatan', e.target.value)} />
          </Field>
        )}
      </BagianForm>
    </PanelForm>
  );
}

// ================================================================ Ketentuan (baca)
/** Ketentuan satu aturan: kondisi bertingkat, rentang waktu dengan posisi hari ini, atau tabel batas bertingkat. */
export function KetentuanAturan({ aturan: a }: { aturan: Pick<Aturan, 'jenis' | 'kondisi' | 'parameter'> }) {
  const katalog = useKatalogAturan();
  const peta = petaIndikator(katalog.data);
  if (a.jenis === 'batas_waktu') {
    const p = a.parameter as ParameterBatasWaktu | null;
    const pos = posisiBatasWaktu(p);
    return (
      <div className="u-aturan-ketentuan">
        <div className="u-aturan-rentang" data-tahap={pos.tahap}>
          <div>
            <span>Mulai</span>
            <strong>{formatWaktuAturan(p?.mulai)}</strong>
          </div>
          {p?.mulai && p.selesai ? (
            <ProgressTenggat mulai={p.mulai.replace(' ', 'T')} selesai={p.selesai.length <= 10 ? p.selesai : p.selesai.replace(' ', 'T')} />
          ) : (
            <Progress value={pos.persen} size="sm" tone={pos.tahap === 'lewat' ? 'secondary' : pos.tahap === 'buka' ? 'success' : 'primary'} />
          )}
          <div>
            <span>Selesai</span>
            <strong>{formatWaktuAturan(p?.selesai)}</strong>
          </div>
        </div>
        <p className="u-aturan-rentang-status">
          {pos.tahap === 'belum'
            ? `Dibuka ${pos.sisaHari} hari lagi.`
            : pos.tahap === 'lewat'
              ? 'Sudah ditutup.'
              : pos.sisaHari != null
                ? `Sedang dibuka, ${pos.sisaHari ? `${pos.sisaHari} hari lagi` : 'hari terakhir'}.`
                : 'Sedang dibuka.'}
        </p>
        {a.kondisi && (
          <>
            <p className="u-aturan-sub">Berlaku bila</p>
            <PohonKondisi kondisi={a.kondisi} katalog={katalog.data} />
          </>
        )}
      </div>
    );
  }
  if (a.jenis === 'batas_nilai') {
    const p = a.parameter as ParameterBatasNilai | null;
    const judul = p ? (peta.get(p.target)?.judul ?? p.target) : '';
    const kata = p?.op === '>=' || p?.op === '>' ? 'minimal' : 'maksimal';
    return (
      <div className="u-aturan-ketentuan">
        <ol className="u-aturan-tabel-batas">
          {(p?.tabel ?? []).map((b, i) => (
            <li key={i}>
              <span className="u-aturan-tabel-bila">Bila {ringkasKondisi(b.jika, katalog.data)}</span>
              <strong>
                {judul} {kata} {b.nilai}
              </strong>
            </li>
          ))}
          {p?.nilai !== undefined && (
            <li data-bawaan>
              <span className="u-aturan-tabel-bila">{p.tabel?.length ? 'Selain itu' : 'Untuk semua'}</span>
              <strong>
                {judul} {kata} {p.nilai}
              </strong>
            </li>
          )}
        </ol>
        {a.kondisi && (
          <>
            <p className="u-aturan-sub">Berlaku bila</p>
            <PohonKondisi kondisi={a.kondisi} katalog={katalog.data} />
          </>
        )}
      </div>
    );
  }
  return (
    <div className="u-aturan-ketentuan">
      <PohonKondisi kondisi={a.kondisi} katalog={katalog.data} />
    </div>
  );
}

// ================================================================ Lampiran SK
function ukuranBerkas(n: number | null) {
  if (!n) return '';
  return n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

/** SK dan lampiran aturan: daftar, unduh, lampirkan dari berkas terpusat, lepas. SK wajib sebelum aktif. */
export function LampiranSkAturan({ aturan: a, onBerubah }: { aturan: DetailAturan; onBerubah?: () => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [unduh, setUnduh] = React.useState<string | null>(null);
  const sk = a.lampiran.filter((l) => l.jenis === 'sk');
  const lepas = async (l: LampiranAturan) => {
    await siakad.request({ method: 'POST', path: `/v1/aturan/${a.id}/lampiran/${l.id}/hapus` });
    invalidateSiakad('aturan');
    toast.add({ title: 'Lampiran dilepas', type: 'success' });
    onBerubah?.();
  };
  const ambil = async (l: LampiranAturan) => {
    setUnduh(l.id);
    try {
      const r = await siakad.request<unknown>({ method: 'GET', path: `/v1/aturan/${a.id}/lampiran/${l.id}/unduh`, query: { unduh: '1' } });
      const d = r.data as { blob?: () => Blob } | Blob | null;
      const blob = d instanceof Blob ? d : d && typeof d === 'object' && typeof d.blob === 'function' ? d.blob() : null;
      if (!blob) throw new Error('Berkas tidak dapat diunduh.');
      const url = URL.createObjectURL(blob);
      const el = document.createElement('a');
      el.href = url;
      el.download = l.nama_file ?? `SK-${l.nomor ?? l.id}.pdf`;
      el.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      toast.add({ title: 'Gagal mengunduh', description: pesanGalat(e), type: 'error' });
    } finally {
      setUnduh(null);
    }
  };
  return (
    <div className="u-aturan-lampiran">
      {!sk.length && (
        <Alert variant={a.status === 'draf' ? 'warning' : 'neutral'} title="Belum ada SK">
          Aturan hanya bisa diaktifkan setelah SK dilampirkan.
        </Alert>
      )}
      {a.lampiran.length > 0 && (
        <ul className="u-aturan-berkas">
          {a.lampiran.map((l) => {
            const skTerakhir = l.jenis === 'sk' && sk.length === 1 && a.status === 'aktif';
            return (
              <li key={l.id}>
                <span className="u-aturan-berkas-ikon" data-jenis={l.jenis} aria-hidden>
                  {l.jenis === 'sk' ? <FileBadge /> : <FileText />}
                </span>
                <div className="u-aturan-berkas-isi">
                  <strong>{l.jenis === 'sk' ? `SK ${l.nomor ?? ''}`.trim() : (l.perihal ?? 'Lampiran')}</strong>
                  <span>{[l.tanggal && formatWaktuAturan(l.tanggal), l.jenis === 'sk' ? l.perihal : null, l.nama_file, ukuranBerkas(l.ukuran)].filter(Boolean).join(' · ')}</span>
                </div>
                <Button variant="ghost" size="sm" iconOnly aria-label={`Unduh ${l.nama_file ?? 'berkas'}`} loading={unduh === l.id} onClick={() => ambil(l)}>
                  <Download />
                </Button>
                {a.boleh_atur && (
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="sm" iconOnly aria-label="Lepas lampiran" disabled={skTerakhir} title={skTerakhir ? 'SK terakhir aturan aktif tidak bisa dilepas' : undefined}>
                        <Trash2 />
                      </Button>
                    }
                    title="Lepas lampiran?"
                    description="Lampiran tetap tersimpan di riwayat dan berkas terpusat, tetapi tidak lagi menjadi dasar aturan."
                    confirmLabel="Lepas lampiran"
                    tone="danger"
                    onConfirm={() => lepas(l)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
      {a.boleh_atur && (
        <FormLampiranAturan
          aturanId={a.id}
          onTersimpan={onBerubah}
          trigger={
            <Button variant={sk.length ? 'outline' : 'primary'} size="sm">
              <Plus /> {sk.length ? 'Tambah lampiran' : 'Lampirkan SK'}
            </Button>
          }
        />
      )}
    </div>
  );
}

/** Formulir lampirkan SK/lampiran (POST /v1/aturan/{id}/lampiran) dengan unggah atau pilih dari berkas saya. */
export function FormLampiranAturan({
  aturanId,
  trigger,
  open,
  onOpenChange,
  onTersimpan,
}: {
  aturanId: string;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  onTersimpan?: () => void;
}) {
  const siakad = useSiakad();
  const toast = useToast();
  const kosong = { berkas_id: '', jenis: 'sk', nomor: '', tanggal: '', perihal: '' };
  const [isi, setIsi] = React.useState(kosong);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [inner, setInner] = React.useState(false);
  const isOpen = open ?? inner;
  React.useEffect(() => {
    if (isOpen) {
      setIsi(kosong);
      setGalat({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  const set = (k: keyof typeof kosong, v: string) => {
    setIsi((x) => ({ ...x, [k]: v }));
    setGalat((g) => ({ ...g, [k]: '' }));
  };
  return (
    <PanelForm
      open={isOpen}
      onOpenChange={(o) => {
        setInner(o);
        onOpenChange?.(o);
      }}
      trigger={trigger}
      tampilan="dialog"
      title="Lampirkan dokumen"
      description="SK menjadi dasar hukum aturan dan terbuka untuk semua pengguna saat aturan aktif."
      berubah={JSON.stringify(isi) !== JSON.stringify(kosong)}
      labelSimpan="Lampirkan"
      onSimpan={async () => {
        const g: Record<string, string> = {};
        if (!isi.berkas_id) g.berkas_id = 'Unggah atau pilih berkas.';
        if (isi.jenis === 'sk' && !isi.nomor.trim()) g.nomor = 'Nomor SK wajib diisi.';
        if (isi.jenis === 'sk' && !isi.tanggal) g.tanggal = 'Tanggal SK wajib diisi.';
        setGalat(g);
        if (Object.keys(g).length) return 'Periksa isian yang ditandai.';
        try {
          await siakad.request({
            method: 'POST',
            path: `/v1/aturan/${aturanId}/lampiran`,
            body: { berkas_id: isi.berkas_id, jenis: isi.jenis, nomor: isi.nomor.trim() || null, tanggal: isi.tanggal || null, perihal: isi.perihal.trim() || null },
          });
        } catch (e) {
          const f = (e as { fields?: Record<string, unknown> }).fields;
          if (f && Object.keys(f).length) {
            setGalat(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, String(v)])));
            return 'Periksa isian yang ditandai.';
          }
          throw e;
        }
        invalidateSiakad('aturan');
        toast.add({ title: isi.jenis === 'sk' ? 'SK dilampirkan' : 'Lampiran ditambahkan', type: 'success' });
        onTersimpan?.();
      }}
    >
      <BagianForm kolom={2}>
        <Field label="Jenis" required className="u-form-lebar">
          <Pilihan
            tampilan="tombol"
            required
            options={[
              { value: 'sk', label: 'Surat keputusan' },
              { value: 'lampiran', label: 'Lampiran lain' },
            ]}
            value={isi.jenis}
            onValueChange={(v) => v && set('jenis', v)}
          />
        </Field>
        <Field label="Berkas" required className="u-form-lebar" error={galat.berkas_id || undefined}>
          <PilihBerkas value={isi.berkas_id || null} onValueChange={(v) => set('berkas_id', v ?? '')} accept=".pdf,.jpg,.jpeg,.png" invalid={Boolean(galat.berkas_id)} />
        </Field>
        <Field label="Nomor" required={isi.jenis === 'sk'} optional={isi.jenis !== 'sk'} error={galat.nomor || undefined}>
          {isi.jenis === 'sk' ? (
            <PilihNomorSK
              value={isi.nomor || null}
              onValueChange={(nomor, sk) => {
                set('nomor', nomor ?? '');
                if (sk?.tanggal && !isi.tanggal) set('tanggal', sk.tanggal);
                if (sk?.perihal && !isi.perihal) set('perihal', sk.perihal);
              }}
            />
          ) : (
            <Input value={isi.nomor} maxLength={100} placeholder="mis. 123/UNIPO/SK/XII/2026" onChange={(e) => set('nomor', e.target.value)} />
          )}
        </Field>
        <Field label="Tanggal" required={isi.jenis === 'sk'} optional={isi.jenis !== 'sk'} error={galat.tanggal || undefined}>
          <IsianTanggal value={isi.tanggal || null} onValueChange={(v) => set('tanggal', v)} />
        </Field>
        <Field label="Perihal" optional className="u-form-lebar">
          <Input value={isi.perihal} maxLength={255} placeholder="mis. Penetapan batas SKS KRS" onChange={(e) => set('perihal', e.target.value)} />
        </Field>
      </BagianForm>
    </PanelForm>
  );
}

// ================================================================ Pengecualian (dispensasi)
const LABEL_SUBJEK: Record<PengecualianAturan['subjek_jenis'], string> = { mahasiswa: 'Mahasiswa', dosen: 'Dosen', prodi: 'Program studi', pegawai: 'Pegawai' };

/** Dispensasi aturan untuk satu mahasiswa, dosen, atau prodi: satu-satunya cara melonggarkan aturan yang tercatat. */
export function PengecualianAturanPanel({ aturan: a, onBerubah }: { aturan: DetailAturan; onBerubah?: () => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const daftar = a.pengecualian ?? [];
  if (a.pengecualian === null) return <Alert title="Hanya untuk pengatur">Daftar dispensasi hanya bisa dilihat pengatur aturan ini.</Alert>;
  return (
    <div className="u-aturan-dispensasi">
      {daftar.length === 0 ? (
        <Empty icon={<UserCheck />} title="Belum ada dispensasi" description="Beri dispensasi bila seseorang dikecualikan dari aturan ini, dengan alasan dan batas waktunya." />
      ) : (
        <ul className="u-aturan-berkas">
          {daftar.map((p) => (
            <li key={p.id} data-kedaluwarsa={!p.berlaku || undefined}>
              <span className="u-aturan-berkas-ikon" aria-hidden>
                <UserCheck />
              </span>
              <div className="u-aturan-berkas-isi">
                <strong>
                  {LABEL_SUBJEK[p.subjek_jenis]} {p.subjek}
                </strong>
                <span>{p.alasan}</span>
                <span>
                  {p.berlaku_sampai ? `Sampai ${formatWaktuAturan(p.berlaku_sampai)}` : 'Tanpa batas waktu'} · oleh {p.oleh ?? '–'}
                </span>
              </div>
              <Badge variant={p.berlaku ? 'success' : 'neutral'}>{p.berlaku ? 'Berlaku' : 'Kedaluwarsa'}</Badge>
              {a.boleh_atur && (
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="sm" iconOnly aria-label="Cabut dispensasi">
                      <Trash2 />
                    </Button>
                  }
                  title="Cabut dispensasi?"
                  description={`${LABEL_SUBJEK[p.subjek_jenis]} ${p.subjek} akan kembali diperiksa aturan ini.`}
                  confirmLabel="Cabut dispensasi"
                  tone="danger"
                  onConfirm={async () => {
                    await siakad.request({ method: 'POST', path: `/v1/aturan/${a.id}/pengecualian/${p.id}/hapus` });
                    invalidateSiakad('aturan');
                    toast.add({ title: 'Dispensasi dicabut', type: 'success' });
                    onBerubah?.();
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {a.boleh_atur && (
        <FormPengecualianAturan
          aturanId={a.id}
          pegawai={a.kategori === 'kepegawaian'}
          onTersimpan={onBerubah}
          trigger={
            <Button variant="outline" size="sm">
              <Plus /> Beri dispensasi
            </Button>
          }
        />
      )}
    </div>
  );
}

/** Formulir dispensasi (POST /v1/aturan/{id}/pengecualian); subjek dipilih dari data, bukan diketik. */
export function FormPengecualianAturan({
  aturanId,
  trigger,
  open,
  onOpenChange,
  onTersimpan,
  pegawai = false,
}: {
  aturanId: string;
  /** Aturan kepegawaian: subjek dispensasi pegawai (sdm_pegawai) atau dosen. */
  pegawai?: boolean;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  onTersimpan?: () => void;
}) {
  const siakad = useSiakad();
  const toast = useToast();
  const kosong = { subjek_jenis: (pegawai ? 'pegawai' : 'mahasiswa') as PengecualianAturan['subjek_jenis'], subjek: '', alasan: '', berlaku_sampai: '', berkas_id: '' };
  const [isi, setIsi] = React.useState(kosong);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [inner, setInner] = React.useState(false);
  const isOpen = open ?? inner;
  React.useEffect(() => {
    if (isOpen) {
      setIsi(kosong);
      setGalat({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  const set = <K extends keyof typeof kosong>(k: K, v: (typeof kosong)[K]) => {
    setIsi((x) => ({ ...x, [k]: v }));
    setGalat((g) => ({ ...g, [k]: '' }));
  };
  return (
    <PanelForm
      open={isOpen}
      onOpenChange={(o) => {
        setInner(o);
        onOpenChange?.(o);
      }}
      trigger={trigger}
      tampilan="dialog"
      title="Beri dispensasi"
      description="Orang atau prodi ini tidak diperiksa aturan ini sampai batas waktunya. Tercatat di riwayat."
      berubah={JSON.stringify(isi) !== JSON.stringify(kosong)}
      labelSimpan="Beri dispensasi"
      onSimpan={async () => {
        const g: Record<string, string> = {};
        if (!isi.subjek) g.subjek = `Pilih ${LABEL_SUBJEK[isi.subjek_jenis].toLowerCase()}.`;
        if (!isi.alasan.trim()) g.alasan = 'Alasan wajib diisi.';
        setGalat(g);
        if (Object.keys(g).length) return 'Periksa isian yang ditandai.';
        try {
          await siakad.request({
            method: 'POST',
            path: `/v1/aturan/${aturanId}/pengecualian`,
            body: { subjek_jenis: isi.subjek_jenis, subjek: isi.subjek, alasan: isi.alasan.trim(), berlaku_sampai: isi.berlaku_sampai || null, berkas_id: isi.berkas_id || null },
          });
        } catch (e) {
          const f = (e as { fields?: Record<string, unknown> }).fields;
          if (f && Object.keys(f).length) {
            setGalat(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, String(v)])));
            return 'Periksa isian yang ditandai.';
          }
          throw e;
        }
        invalidateSiakad('aturan');
        toast.add({ title: 'Dispensasi diberikan', type: 'success' });
        onTersimpan?.();
      }}
    >
      <BagianForm kolom={2}>
        <Field label="Untuk" required className="u-form-lebar">
          <Pilihan
            tampilan="tombol"
            required
            options={(pegawai ? (['pegawai', 'dosen'] as const) : (['mahasiswa', 'dosen', 'prodi'] as const)).map((j) => ({ value: j, label: LABEL_SUBJEK[j] }))}
            value={isi.subjek_jenis}
            onValueChange={(v) => v && setIsi((x) => ({ ...x, subjek_jenis: v as PengecualianAturan['subjek_jenis'], subjek: '' }))}
          />
        </Field>
        <Field label={LABEL_SUBJEK[isi.subjek_jenis]} required className="u-form-lebar" error={galat.subjek || undefined}>
          <PilihEntitas key={isi.subjek_jenis} jenis={isi.subjek_jenis} value={isi.subjek || null} onValueChange={(v) => set('subjek', v ?? '')} />
        </Field>
        <Field
          label={
            <>
              Alasan <HitungKarakter nilai={isi.alasan} maks={500} />
            </>
          }
          required
          className="u-form-lebar"
          error={galat.alasan || undefined}
        >
          <Textarea rows={3} value={isi.alasan} placeholder="mis. Sakit dengan surat dokter, disetujui Wakil Rektor I." onChange={(e) => set('alasan', e.target.value)} />
        </Field>
        <Field label="Berlaku sampai" optional description="Kosong = tanpa batas waktu." error={galat.berlaku_sampai || undefined}>
          <IsianTanggal value={isi.berlaku_sampai || null} onValueChange={(v) => set('berlaku_sampai', v)} />
        </Field>
        <Field label="Surat pendukung" optional error={galat.berkas_id || undefined}>
          <PilihBerkas value={isi.berkas_id || null} onValueChange={(v) => set('berkas_id', v ?? '')} accept=".pdf,.jpg,.jpeg,.png" />
        </Field>
      </BagianForm>
    </PanelForm>
  );
}

// ================================================================ Riwayat
/** Linimasa versi aturan (GET /v1/aturan/{id}/riwayat), termasuk tanggal yang ditulis-tembus ke tabel lama. */
export function RiwayatAturan({ id }: { id: string }) {
  const q = useRiwayatAturan(id);
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  if (!q.data) return <Skeleton height={160} />;
  if (!q.data.length) return <Empty icon={<History />} title="Belum ada riwayat" />;
  return (
    <ol className="u-aturan-riwayat">
      {q.data.map((r, i) => {
        const a = AKSI_RIWAYAT[r.aksi] ?? { label: r.aksi, ikon: <History /> };
        const baris = r.aksi === 'tulis_tembus' ? ((r.data as { baris?: TulisTembusAturan['baris'] } | null)?.baris ?? []) : [];
        return (
          <li key={i} data-nada={a.nada}>
            <span className="u-aturan-riwayat-ikon" aria-hidden>
              {a.ikon}
            </span>
            <div>
              <p className="u-aturan-riwayat-judul">
                <strong>{a.label}</strong> <Badge variant="outline">v{r.versi}</Badge>
              </p>
              {r.catatan && <p>{r.catatan}</p>}
              {baris.length > 0 && (
                <ul className="u-aturan-tembus">
                  {baris.slice(0, 6).map((b, j) => (
                    <li key={j}>
                      {b.kode_prodi ?? 'Semua prodi'}: {teksTembus(b.dari)} → <strong>{teksTembus(b.menjadi)}</strong>
                    </li>
                  ))}
                  {baris.length > 6 && <li>dan {baris.length - 6} baris lain</li>}
                </ul>
              )}
              <p className="u-aturan-riwayat-meta">
                {r.oleh ?? 'Sistem'} · {formatWaktuAturan(r.waktu, { jam: true })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
function teksTembus(v: unknown): string {
  if (!v) return '–';
  if (typeof v === 'string') return formatWaktuAturan(v);
  const o = v as Record<string, unknown>;
  const m = (o.mulai ?? o.tgl_mulai ?? o.tanggal_mulai) as string | undefined;
  const s = (o.selesai ?? o.tgl_selesai ?? o.tanggal_selesai) as string | undefined;
  return m || s ? `${formatWaktuAturan(m ?? null)} – ${formatWaktuAturan(s ?? null)}` : JSON.stringify(v);
}

// ================================================================ Hasil periksa
/** Hasil pemeriksaan aturan (dari /periksa, /uji, atau galat 409 aturan_dilanggar). */
export function HasilPeriksaAturanPanel({ hasil, indikator = true, className }: { hasil: HasilPeriksaAturan; indikator?: boolean; className?: string }) {
  const katalog = useKatalogAturan();
  const peta = petaIndikator(katalog.data);
  const batas = Object.entries(hasil.batas ?? {}).filter(([k, v]) => k !== 'waktu' && v && (v as { nilai?: number }).nilai !== undefined) as Array<[string, { op?: string; nilai?: number }]>;
  const ind = Object.entries(hasil.indikator ?? {});
  return (
    <div className={cn('u-aturan-hasil', className)} data-boleh={hasil.boleh || undefined}>
      <div className="u-aturan-hasil-kepala">
        <span className="u-aturan-hasil-ikon" aria-hidden>
          {hasil.boleh ? <BadgeCheck /> : <CircleSlash />}
        </span>
        <div>
          <strong>{hasil.boleh ? (hasil.peringatan.length ? 'Boleh, dengan peringatan' : 'Memenuhi semua aturan') : 'Belum memenuhi aturan'}</strong>
          <span>
            {hasil.judul ?? hasil.titik}
            {hasil.waktu ? ` · diperiksa ${formatWaktuAturan(hasil.waktu, { jam: true })}` : ''}
          </span>
        </div>
      </div>
      {hasil.pelanggaran.map((p) => (
        <PesanPelanggaran key={p.id} p={p} nada="danger" />
      ))}
      {hasil.peringatan.map((p) => (
        <PesanPelanggaran key={p.id} p={p} nada="warning" />
      ))}
      {(hasil.batas?.waktu || batas.length > 0) && (
        <div className="u-aturan-hasil-batas">
          {hasil.batas?.waktu && (
            <span>
              <AlarmClock aria-hidden /> Dibuka {formatWaktuAturan(hasil.batas.waktu.mulai)} – {formatWaktuAturan(hasil.batas.waktu.selesai)}
            </span>
          )}
          {batas.map(([k, v]) => (
            <span key={k}>
              <Gauge aria-hidden /> {peta.get(k)?.judul ?? k} {v.op === '>=' || v.op === '>' ? 'minimal' : 'maksimal'} <strong>{v.nilai}</strong>
              {hasil.indikator?.[k] !== undefined && <> (sekarang {angka(hasil.indikator[k])})</>}
            </span>
          ))}
        </div>
      )}
      {hasil.dikecualikan.length > 0 && (
        <Alert variant="info" icon={<UserCheck />} title={`Dispensasi berlaku untuk ${hasil.dikecualikan.length} aturan`}>
          {hasil.dikecualikan.map((d) => (typeof d === 'string' ? d : (d.nama ?? d.id))).join(', ')}
        </Alert>
      )}
      {indikator && ind.length > 0 && (
        <details className="u-aturan-hasil-data">
          <summary>Data yang dinilai ({ind.length})</summary>
          <DescriptionList items={ind.map(([k, v]) => ({ label: peta.get(k)?.judul ?? k, value: typeof v === 'boolean' ? (v ? 'Ya' : 'Tidak') : Array.isArray(v) ? `${v.length} item` : angka(v) }))} />
        </details>
      )}
    </div>
  );
}
function PesanPelanggaran({ p, nada }: { p: PelanggaranAturan; nada: 'danger' | 'warning' }) {
  return (
    <div className="u-aturan-langgar" data-nada={nada}>
      {nada === 'danger' ? <CircleX aria-hidden /> : <CircleAlert aria-hidden />}
      <div>
        <strong>{p.nama}</strong>
        <p>{p.pesan}</p>
        {p.rincian && p.rincian.length > 1 && (
          <ul>
            {p.rincian.map((r, i) => (
              <li key={i}>{r.pesan}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ================================================================ Uji
/** Uji satu aturan (termasuk draf) terhadap mahasiswa contoh dan waktu tertentu (POST /v1/aturan/{id}/uji). */
export function UjiAturan({ aturan: a }: { aturan: Aturan }) {
  const siakad = useSiakad();
  const katalog = useKatalogAturan();
  const t = katalog.data?.titik.find((x) => x.kode === a.titik);
  const peta = petaIndikator(katalog.data);
  const kelas = t?.subjek === 'kelas';
  const pegawai = t?.subjek === 'pegawai';
  const [nim, setNim] = React.useState('');
  const [prodi, setProdi] = React.useState('');
  const [tahun, setTahun] = React.useState(a.tahun_id ?? '');
  const [waktu, setWaktu] = React.useState('');
  const [konteks, setKonteks] = React.useState<Record<string, string>>({});
  const [hasil, setHasil] = React.useState<HasilPeriksaAturan | null>(null);
  const [galat, setGalat] = React.useState<unknown>(null);
  const [jalan, setJalan] = React.useState(false);
  const { prodi: opsiProdi } = useNamaProdi();
  const siap = kelas ? Boolean(prodi) : Boolean(nim);
  const teksKonteks = (k: string) => peta.get(k)?.tipe !== 'angka';
  const uji = async () => {
    setJalan(true);
    setGalat(null);
    try {
      const body: Record<string, unknown> = { tahun_id: tahun || undefined, waktu: waktu || undefined };
      if (kelas) body.kode_prodi = prodi;
      else if (pegawai) body.pegawai_id = nim;
      else body.nim = nim;
      const k = Object.fromEntries(
        Object.entries(konteks)
          .filter(([, v]) => v !== '')
          .map(([kk, v]) => [kk, peta.get(kk)?.tipe === 'benar_salah' ? v === '1' : teksKonteks(kk) ? v : Number(v)]),
      );
      if (Object.keys(k).length) body.konteks = k;
      setHasil((await siakad.request<HasilPeriksaAturan>({ method: 'POST', path: `/v1/aturan/${a.id}/uji`, body })).data);
    } catch (e) {
      setGalat(e);
      setHasil(null);
    } finally {
      setJalan(false);
    }
  };
  return (
    <div className="u-aturan-uji">
      <p className="u-aturan-sub">Coba aturan ini sebelum diaktifkan. Hasil uji tidak mengubah data apa pun.</p>
      <div className="u-form-wadah">
        <div className="u-form-kisi" data-kolom="2">
          {kelas ? (
            <Field label="Program studi" required>
              <Pilihan options={opsiProdi} value={prodi || null} onValueChange={(v) => setProdi(v ?? '')} />
            </Field>
          ) : pegawai ? (
            <Field label="Pegawai contoh" required>
              <PilihEntitas jenis="pegawai" value={nim || null} onValueChange={(v) => setNim(v ?? '')} />
            </Field>
          ) : (
            <Field label="Mahasiswa contoh" required>
              <PilihEntitas jenis="mahasiswa" value={nim || null} onValueChange={(v) => setNim(v ?? '')} />
            </Field>
          )}
          <Field label="Periode" optional>
            <PilihTahunAkademik value={tahun || null} onValueChange={(v) => setTahun(v ?? '')} placeholder="Periode berjalan" />
          </Field>
          {(t?.konteks ?? []).map((k) => (
            <Field key={k} label={peta.get(k)?.judul ?? k} optional description="Nilai yang dikirim langkah ini.">
              {peta.get(k)?.tipe === 'benar_salah' ? (
                <Pilihan
                  options={[
                    { value: '1', label: 'Ya' },
                    { value: '0', label: 'Tidak' },
                  ]}
                  value={konteks[k] || null}
                  onValueChange={(v) => setKonteks((x) => ({ ...x, [k]: v ?? '' }))}
                />
              ) : (
                <Input
                  type={teksKonteks(k) ? 'text' : 'number'}
                  inputMode={teksKonteks(k) ? 'text' : 'decimal'}
                  value={konteks[k] ?? ''}
                  onChange={(e) => setKonteks((x) => ({ ...x, [k]: e.target.value }))}
                />
              )}
            </Field>
          ))}
          <Field label="Seolah-olah pada" optional description="Untuk menguji batas waktu.">
            <IsianWaktu value={waktu} onValueChange={setWaktu} />
          </Field>
        </div>
      </div>
      <div>
        <Button onClick={uji} loading={jalan} disabled={!siap}>
          <FlaskConical /> Uji aturan
        </Button>
      </div>
      {Boolean(galat) && <GalatApi error={galat} title="Uji gagal" />}
      {hasil && <HasilPeriksaAturanPanel hasil={hasil} />}
    </div>
  );
}

// ================================================================ Syarat saya (mahasiswa)
export interface SyaratSayaProps {
  /** Titik, mis. `krs.ambil`, `wisuda.daftar`, `kkn.daftar`. */
  titik: string;
  tahunId?: string;
  konteks?: Record<string, number>;
  /** NIM; bawaan dari akun yang masuk. */
  nim?: string;
  /** Titik kepegawaian (sdm.*): ID pegawai SDM; bawaan pegawai pemilik akun (dosen/tendik). */
  pegawaiId?: number | string;
  judul?: React.ReactNode;
  className?: string;
}

/**
 * Daftar periksa untuk mahasiswa sebelum mencoba suatu langkah (KRS, KKN, yudisium, wisuda): tiap aturan aktif di
 * titik itu ditandai terpenuhi, belum, peringatan, atau dispensasi, lengkap dengan pesan, jendela waktu, dan batas.
 */
export function SyaratSaya({ titik, tahunId, konteks, nim: nimProp, pegawaiId, judul, className }: SyaratSayaProps) {
  // Titik kepegawaian (sdm.*) memeriksa pegawai: pegawai_id atau pegawai pemilik akun (ditentukan API).
  const pegawai = titik.startsWith('sdm.');
  const akun = useAkunSaya({ foto: false });
  const nim = pegawai ? undefined : (nimProp ?? (akun.data?.identitas.peran === 'mahasiswa' ? akun.data.identitas.kunci : undefined));
  const siap = pegawai || Boolean(nim);
  const katalog = useKatalogAturan();
  const daftar = useDaftarAturan({ titik, status: 'aktif', tahun_id: tahunId }, { enabled: siap });
  const periksa = usePeriksaAturan(siap ? { titik, ...(pegawai ? (pegawaiId != null ? { pegawai_id: pegawaiId } : {}) : { nim }), tahun_id: tahunId, konteks } : null);
  const t = katalog.data?.titik.find((x) => x.kode === titik);
  const err = periksa.error ?? daftar.error ?? (pegawai ? null : akun.error);
  if (err) return <GalatApi error={err} onRetry={() => (periksa.refetch(), daftar.refetch())} className={className} />;
  if (!pegawai && !akun.loading && !nim) return <Alert className={className}>Daftar syarat hanya untuk akun mahasiswa.</Alert>;
  const h = periksa.data;
  if (!h || !daftar.data) return <Skeleton height={200} className={className} />;
  const langgar = new Map(h.pelanggaran.map((p) => [p.id, p]));
  const ingat = new Map(h.peringatan.map((p) => [p.id, p]));
  const kecuali = new Set(h.dikecualikan.map((d) => (typeof d === 'string' ? d : d.id)));
  const terap = new Set(h.diterapkan);
  const aturan = daftar.data.filter((a) => terap.has(a.id) || langgar.has(a.id) || ingat.has(a.id) || kecuali.has(a.id));
  const lulus = aturan.filter((a) => !langgar.has(a.id)).length;
  const w = h.batas?.waktu;
  const pos = w ? posisiBatasWaktu(w) : null;
  return (
    <Card className={cn('u-syarat-saya', className)} data-boleh={h.boleh || undefined}>
      <div className="u-syarat-saya-kepala">
        <div>
          <p className="u-syarat-saya-judul">{judul ?? t?.judul ?? h.judul ?? titik}</p>
          <p className="u-syarat-saya-status">
            {h.boleh ? <CircleCheck aria-hidden /> : <CircleX aria-hidden />}
            {h.boleh ? 'Anda memenuhi syarat' : `${aturan.length - lulus} syarat belum terpenuhi`}
          </p>
        </div>
        {aturan.length > 0 && <ProgressLingkar nilai={lulus} total={aturan.length} />}
      </div>
      {w && pos && (
        <div className="u-syarat-saya-waktu" data-tahap={pos.tahap}>
          <AlarmClock aria-hidden />
          <span>
            {pos.tahap === 'belum' ? 'Dibuka' : pos.tahap === 'lewat' ? 'Ditutup sejak' : 'Dibuka sampai'}{' '}
            <strong>{pos.tahap === 'belum' ? formatWaktuAturan(w.mulai) : formatWaktuAturan(w.selesai)}</strong>
            {pos.tahap === 'buka' && pos.sisaHari != null && ` (${pos.sisaHari ? `${pos.sisaHari} hari lagi` : 'hari terakhir'})`}
            {pos.tahap === 'belum' && ` (${pos.sisaHari} hari lagi)`}
          </span>
        </div>
      )}
      {w?.mulai && w.selesai && pos?.tahap === 'buka' && (
        <ProgressTenggat mulai={w.mulai.replace(' ', 'T')} selesai={w.selesai.length <= 10 ? w.selesai : w.selesai.replace(' ', 'T')} className="u-syarat-saya-tenggat" />
      )}
      {aturan.length === 0 ? (
        <p className="u-syarat-saya-kosong">Tidak ada syarat khusus untuk langkah ini.</p>
      ) : (
        <ul className="u-syarat-saya-daftar">
          {aturan.map((a) => {
            const p = langgar.get(a.id) ?? ingat.get(a.id);
            const st = kecuali.has(a.id) ? 'dispensasi' : langgar.has(a.id) ? 'gagal' : ingat.has(a.id) ? 'peringatan' : 'lulus';
            return (
              <li key={a.id} data-status={st}>
                <span className="u-syarat-saya-ikon" aria-hidden>
                  {st === 'lulus' ? <CircleCheck /> : st === 'gagal' ? <CircleX /> : st === 'peringatan' ? <CircleAlert /> : <UserCheck />}
                </span>
                <div>
                  <strong>{a.nama}</strong>
                  <p>{p ? p.pesan : st === 'dispensasi' ? 'Anda mendapat dispensasi untuk aturan ini.' : ringkasKetentuan(a, katalog.data) || 'Terpenuhi.'}</p>
                  {p?.rincian && p.rincian.length > 1 && (
                    <ul>
                      {p.rincian.map((r, i) => (
                        <li key={i}>{r.pesan}</li>
                      ))}
                    </ul>
                  )}
                </div>
                {st === 'gagal' && a.mode === 'peringatan'
                  ? null
                  : st !== 'lulus' && (
                      <Badge variant={st === 'gagal' ? 'danger' : st === 'peringatan' ? 'warning' : 'info'}>{st === 'gagal' ? 'Belum' : st === 'peringatan' ? 'Peringatan' : 'Dispensasi'}</Badge>
                    )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
function ProgressLingkar({ nilai, total }: { nilai: number; total: number }) {
  const r = 18;
  const k = 2 * Math.PI * r;
  return (
    <span className="u-syarat-saya-cincin" role="img" aria-label={`${nilai} dari ${total} syarat terpenuhi`}>
      <svg viewBox="0 0 44 44" aria-hidden>
        <circle cx="22" cy="22" r={r} />
        <circle cx="22" cy="22" r={r} strokeDasharray={k} strokeDashoffset={k * (1 - nilai / Math.max(1, total))} />
      </svg>
      <span>
        {nilai}/{total}
      </span>
    </span>
  );
}

// ================================================================ Pengatur
interface PengaturKategori {
  kategori: KategoriAturan;
  judul: string;
  pengatur: PengaturBaris[];
  bawaan: { jenis: 'izin'; kode: string };
  boleh_saya?: boolean;
}

/** Siapa yang berhak mengatur aturan per kategori (GET /v1/aturan/pengatur); admin bisa mengubahnya. */
export function PengaturAturan({ className }: { className?: string }) {
  const q = useSiakadQuery<PengaturKategori[]>(['aturan', 'pengatur'], (s, signal) => s.request<PengaturKategori[]>({ method: 'GET', path: '/v1/aturan/pengatur' }, { signal }));
  const saya = useAturanSaya();
  const katalog = useKatalogAturan();
  const [ubah, setUbah] = React.useState<PengaturKategori | null>(null);
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  if (!q.data) return <Skeleton height={200} className={className} />;
  const judulTitik = (k: string | null) => (k ? (katalog.data?.titik.find((t) => t.kode === k)?.judul ?? k) : null);
  return (
    <div className={cn('u-aturan-pengatur', className)}>
      {q.data.map((k) => {
        const perTitik = new Map<string, PengaturBaris[]>();
        for (const p of k.pengatur) perTitik.set(p.titik ?? '', [...(perTitik.get(p.titik ?? '') ?? []), p]);
        const umum = perTitik.get('') ?? [];
        perTitik.delete('');
        return (
          <Card key={k.kategori} className="u-aturan-pengatur-kartu">
            <div className="u-aturan-pengatur-kepala">
              <div>
                <strong>{LABEL_KATEGORI_ATURAN[k.kategori] ?? k.judul}</strong>
                <span>{k.judul}</span>
              </div>
              {k.boleh_saya || saya.data?.kategori.find((s) => s.kategori === k.kategori)?.boleh_atur ? <Badge variant="success">Anda boleh mengatur</Badge> : null}
              {saya.data?.admin && (
                <Button variant="ghost" size="sm" onClick={() => setUbah(k)}>
                  <Pencil /> Atur
                </Button>
              )}
            </div>
            <div className="u-aturan-pengatur-isi">
              {umum.length ? (
                <div className="u-aturan-pengatur-tag">
                  {umum.map((p) => (
                    <Tag key={p.jenis + p.kode} size="sm" icon={p.jenis === 'peran' ? <Users /> : <ShieldCheck />}>
                      {p.keterangan ?? p.kode}
                    </Tag>
                  ))}
                </div>
              ) : (
                <p className="u-aturan-sub">
                  Bawaan: pemegang izin <code>{k.bawaan.kode}</code>
                </p>
              )}
              {[...perTitik].map(([titik, rows]) => (
                <div key={titik} className="u-aturan-pengatur-titik">
                  <span>{judulTitik(titik)}</span>
                  <div className="u-aturan-pengatur-tag">
                    {rows.map((p) => (
                      <Tag key={p.jenis + p.kode} size="sm" icon={p.jenis === 'peran' ? <Users /> : <ShieldCheck />}>
                        {p.keterangan ?? p.kode}
                      </Tag>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
      {ubah && <FormPengaturAturan kategori={ubah} open onOpenChange={(o) => !o && setUbah(null)} onTersimpan={() => setUbah(null)} />}
    </div>
  );
}

function FormPengaturAturan({ kategori: k, open, onOpenChange, onTersimpan }: { kategori: PengaturKategori; open: boolean; onOpenChange: (o: boolean) => void; onTersimpan: () => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const katalog = useKatalogAturan();
  const peran = useSiakadQuery<Array<{ kode: string; nama: string }>>(
    ['rbac', 'peran'],
    (s, signal) => s.request<Array<{ kode: string; nama: string }>>({ method: 'GET', path: '/v1/rbac/peran', query: { per_page: 200 } }, { signal }),
    { staleTime: 5 * 60_000 },
  );
  const [titik, setTitik] = React.useState('');
  const awalUntuk = React.useCallback((tt: string) => k.pengatur.filter((p) => (p.titik ?? '') === tt).map((p) => ({ jenis: p.jenis, kode: p.kode, keterangan: p.keterangan ?? '' })), [k]);
  const [baris, setBaris] = React.useState(() => awalUntuk(''));
  React.useEffect(() => setBaris(awalUntuk(titik)), [titik, awalUntuk]);
  const opsiPeran = (peran.data ?? []).map((p) => ({ value: p.kode, label: p.nama, description: p.kode }));
  const opsiTitik = [
    { value: '', label: 'Semua titik di kategori ini' },
    ...(katalog.data?.titik ?? []).filter((t) => t.kategori.includes(k.kategori)).map((t) => ({ value: t.kode, label: t.judul })),
  ];
  const simpan = async (isi: typeof baris) => {
    await siakad.request({
      method: 'POST',
      path: '/v1/aturan/pengatur',
      body: { kategori: k.kategori, titik: titik || null, pengatur: isi.filter((b) => b.kode).map((b) => ({ jenis: b.jenis, kode: b.kode, keterangan: b.keterangan || null })) },
    });
    invalidateSiakad('aturan');
    toast.add({ title: isi.length ? 'Pengatur disimpan' : 'Kembali ke izin bawaan', type: 'success' });
    onTersimpan();
  };
  return (
    <PanelForm
      open={open}
      onOpenChange={onOpenChange}
      title={`Pengatur aturan ${LABEL_KATEGORI_ATURAN[k.kategori]?.toLowerCase() ?? k.kategori}`}
      description={`Tanpa pengatur khusus, yang berhak adalah pemegang izin ${k.bawaan.kode}. Peran berlingkup unit (mis. kaprodi) hanya mengatur aturan di unitnya.`}
      berubah={JSON.stringify(baris) !== JSON.stringify(awalUntuk(titik))}
      labelSimpan="Simpan pengatur"
      aksiTambahan={
        <Button variant="ghost" onClick={() => simpan([])}>
          Kembalikan bawaan
        </Button>
      }
      onSimpan={async () => {
        if (baris.some((b) => !b.kode)) return 'Lengkapi peran atau izin di setiap baris.';
        await simpan(baris);
      }}
    >
      <BagianForm kolom={1}>
        <Field label="Berlaku untuk">
          <Pilihan tampilan="cari" options={opsiTitik} value={titik} onValueChange={(v) => setTitik(v ?? '')} />
        </Field>
        <div className="u-aturan-pengatur-baris-daftar">
          {baris.map((b, i) => (
            <div key={i} className="u-aturan-pengatur-baris">
              <Pilihan
                tampilan="tombol"
                required
                aria-label="Jenis"
                options={[
                  { value: 'peran', label: 'Peran' },
                  { value: 'izin', label: 'Izin' },
                ]}
                value={b.jenis}
                onValueChange={(v) => v && setBaris((x) => x.map((y, j) => (j === i ? { ...y, jenis: v as 'peran' | 'izin', kode: '' } : y)))}
              />
              {b.jenis === 'peran' ? (
                <Pilihan
                  tampilan="cari"
                  aria-label="Peran"
                  options={opsiPeran}
                  value={b.kode || null}
                  onValueChange={(v) =>
                    setBaris((x) => x.map((y, j) => (j === i ? { ...y, kode: v ?? '', keterangan: y.keterangan || String(opsiPeran.find((o) => o.value === v)?.label ?? '') } : y)))
                  }
                  placeholder="Pilih peran"
                />
              ) : (
                <Input aria-label="Izin" value={b.kode} placeholder="mis. aturan:akademik" onChange={(e) => setBaris((x) => x.map((y, j) => (j === i ? { ...y, kode: e.target.value } : y)))} />
              )}
              <Input aria-label="Keterangan" value={b.keterangan} placeholder="Keterangan" onChange={(e) => setBaris((x) => x.map((y, j) => (j === i ? { ...y, keterangan: e.target.value } : y)))} />
              <Button variant="ghost" size="sm" iconOnly aria-label="Hapus baris" onClick={() => setBaris((x) => x.filter((_, j) => j !== i))}>
                <X />
              </Button>
            </div>
          ))}
          <Button variant="soft" size="sm" onClick={() => setBaris((x) => [...x, { jenis: 'peran', kode: '', keterangan: '' }])}>
            <Plus /> Tambah pengatur
          </Button>
        </div>
      </BagianForm>
    </PanelForm>
  );
}

// ================================================================ Detail + modul
export interface PanelDetailAturanProps {
  id: string;
  onUbah?: (a: DetailAturan) => void;
  /** Dipanggil setelah aturan dihapus (mis. untuk menutup panel). */
  onDihapus?: () => void;
}

/** Detail aturan dengan aksi aktifkan/nonaktifkan/hapus/pulihkan dan tab ketentuan, SK, dispensasi, uji, riwayat. */
export function PanelDetailAturan({ id, onUbah, onDihapus }: PanelDetailAturanProps) {
  const q = useAturan(id);
  const saya = useAturanSaya();
  const siakad = useSiakad();
  const toast = useToast();
  const { nama } = useNamaProdi();
  const [tembus, setTembus] = React.useState<TulisTembusAturan | null>(null);
  const [konfirmasi, setKonfirmasi] = React.useState<null | 'aktifkan' | 'nonaktifkan' | 'hapus'>(null);
  const [catatan, setCatatan] = React.useState('');
  React.useEffect(() => setTembus(null), [id]);
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  const a = q.data;
  if (!a) return <Skeleton height={320} />;
  const adaSk = a.lampiran.some((l) => l.jenis === 'sk');
  const dihapus = Boolean(a.dihapus_at);
  const aksi = async (jenis: 'aktifkan' | 'nonaktifkan' | 'hapus' | 'pulihkan') => {
    const body = jenis === 'hapus' ? { alasan: catatan || null } : { catatan: catatan || null };
    const r = await siakad.request<DetailAturan & { tulis_tembus?: TulisTembusAturan }>({ method: 'POST', path: `/v1/aturan/${a.id}/${jenis}`, body });
    invalidateSiakad('aturan');
    setCatatan('');
    if (jenis === 'aktifkan') setTembus(r.data?.tulis_tembus ?? null);
    toast.add({
      title: { aktifkan: 'Aturan diaktifkan', nonaktifkan: 'Aturan dinonaktifkan', hapus: 'Aturan dipindah ke sampah', pulihkan: 'Aturan dipulihkan sebagai draf' }[jenis],
      type: 'success',
    });
    if (jenis === 'hapus') onDihapus?.();
  };
  const menu = [{ label: 'Pindah ke sampah', icon: <Trash2 />, onSelect: () => setKonfirmasi('hapus'), destructive: true }];
  return (
    <div className="u-aturan-detail">
      <div className="u-aturan-detail-kepala">
        <span className="u-aturan-ikon" data-jenis={a.jenis} aria-hidden>
          {IKON_JENIS[a.jenis]}
        </span>
        <div className="u-aturan-detail-judul">
          <div className="u-aturan-detail-lencana">
            <StatusAturanBadge status={a.status} dihapus={dihapus} />
            <ModeAturanBadge mode={a.mode} />
            <Badge variant="outline">{LABEL_JENIS_ATURAN[a.jenis].label}</Badge>
            <Badge variant="outline">v{a.versi}</Badge>
          </div>
          <h3>{a.nama}</h3>
          <p>
            {a.titik_judul ?? a.titik}
            {a.kode && (
              <>
                {' '}
                · <code>{a.kode}</code>
              </>
            )}
          </p>
        </div>
      </div>

      {a.boleh_atur && (
        <div className="u-aturan-detail-aksi">
          {dihapus ? (
            saya.data?.admin && (
              <Button variant="outline" onClick={() => aksi('pulihkan').catch((e) => toast.add({ title: 'Gagal memulihkan', description: pesanGalat(e), type: 'error' }))}>
                <ArchiveRestore /> Pulihkan
              </Button>
            )
          ) : (
            <>
              {a.status !== 'aktif' ? (
                <Button onClick={() => setKonfirmasi('aktifkan')} disabled={!adaSk} title={adaSk ? undefined : 'Lampirkan SK dulu'}>
                  <Power /> Aktifkan
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setKonfirmasi('nonaktifkan')}>
                  <PowerOff /> Nonaktifkan
                </Button>
              )}
              <Button variant="outline" onClick={() => onUbah?.(a)}>
                <Pencil /> Ubah
              </Button>
              <Menu
                trigger={
                  <Button variant="ghost" iconOnly aria-label="Aksi lain">
                    <MoreHorizontal />
                  </Button>
                }
                items={menu}
              />
            </>
          )}
        </div>
      )}
      {!adaSk && a.status === 'draf' && a.boleh_atur && !dihapus && (
        <Alert variant="warning" title="Belum bisa diaktifkan">
          Lampirkan SK di tab “SK” lalu aktifkan.
        </Alert>
      )}
      {tembus && (
        <Alert
          variant={tembus.diterapkan ? 'success' : 'info'}
          icon={<GitBranch />}
          title={tembus.diterapkan ? `Tanggal ditulis ke menu batas waktu lama (${tembus.baris.length} baris)` : 'Tanggal tidak ditulis ke menu lama'}
        >
          {tembus.diterapkan ? 'Halaman web lama dan API sekarang memakai tanggal yang sama. Tanggal sebelumnya tersimpan di riwayat.' : (tembus.alasan ?? 'Aturan tetap ditegakkan lewat API.')}
        </Alert>
      )}

      <Tabs
        items={[
          {
            value: 'ketentuan',
            label: 'Ketentuan',
            icon: <ListChecks />,
            content: (
              <div className="u-aturan-detail-isi">
                <KetentuanAturan aturan={a} />
                <DescriptionList
                  items={[
                    { label: 'Cakupan', value: ringkasCakupan(a.cakupan, nama) },
                    { label: 'Periode', value: formatTahun(a.tahun_id) },
                    {
                      label: 'Masa berlaku',
                      value:
                        a.berlaku_mulai || a.berlaku_selesai
                          ? `${formatWaktuAturan(a.berlaku_mulai) ?? ''} – ${a.berlaku_selesai ? formatWaktuAturan(a.berlaku_selesai) : 'seterusnya'}`
                          : 'Selama aktif',
                    },
                    { label: 'Kategori', value: LABEL_KATEGORI_ATURAN[a.kategori] },
                    { label: 'Pesan', value: a.pesan ?? 'Dibuat otomatis dari kondisi' },
                    { label: 'Prioritas', value: a.prioritas },
                    { label: 'Diaktifkan', value: a.diaktifkan_at ? `${formatWaktuAturan(a.diaktifkan_at, { jam: true })} oleh ${a.diaktifkan_oleh ?? '–'}` : '–' },
                    { label: 'Diubah', value: `${formatWaktuAturan(a.updated_at, { jam: true })} oleh ${a.diubah_oleh ?? a.dibuat_oleh ?? '–'}` },
                  ]}
                />
                {a.keterangan && <p className="u-aturan-sub">{a.keterangan}</p>}
              </div>
            ),
          },
          { value: 'sk', label: 'SK', icon: <FileBadge />, count: a.lampiran.length, content: <LampiranSkAturan aturan={a} onBerubah={q.refetch} /> },
          ...(a.boleh_atur
            ? [
                {
                  value: 'dispensasi',
                  label: 'Dispensasi',
                  icon: <UserCheck />,
                  count: a.pengecualian?.filter((p) => p.berlaku).length,
                  content: <PengecualianAturanPanel aturan={a} onBerubah={q.refetch} />,
                },
                { value: 'uji', label: 'Uji', icon: <FlaskConical />, content: <UjiAturan aturan={a} /> },
                { value: 'riwayat', label: 'Riwayat', icon: <History />, content: <RiwayatAturan id={a.id} /> },
              ]
            : []),
        ]}
      />

      <ConfirmDialog
        open={konfirmasi !== null}
        onOpenChange={(o) => !o && setKonfirmasi(null)}
        title={konfirmasi === 'aktifkan' ? `Aktifkan “${a.nama}”?` : konfirmasi === 'nonaktifkan' ? `Nonaktifkan “${a.nama}”?` : `Hapus “${a.nama}”?`}
        description={
          konfirmasi === 'aktifkan'
            ? `Aturan langsung ditegakkan di ${a.titik_judul ?? a.titik}${a.mode === 'blokir' ? ' dan langkah yang tidak memenuhi akan ditolak' : ''}.`
            : konfirmasi === 'nonaktifkan'
              ? 'Aturan berhenti ditegakkan. Tanggal yang sudah ditulis ke menu lama tidak dikembalikan otomatis.'
              : 'Aturan dipindah ke sampah dan berhenti ditegakkan. Admin bisa memulihkannya sebagai draf.'
        }
        confirmLabel={konfirmasi === 'aktifkan' ? 'Aktifkan aturan' : konfirmasi === 'nonaktifkan' ? 'Nonaktifkan aturan' : 'Hapus aturan'}
        tone={konfirmasi === 'aktifkan' ? 'primary' : konfirmasi === 'nonaktifkan' ? 'warning' : 'danger'}
        onConfirm={async () => {
          if (!konfirmasi) return;
          try {
            await aksi(konfirmasi);
          } catch (e) {
            toast.add({ title: 'Gagal', description: pesanGalat(e), type: 'error' });
          }
        }}
      >
        <Field label={konfirmasi === 'hapus' ? 'Alasan' : 'Catatan'} optional>
          <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={500} placeholder={konfirmasi === 'hapus' ? 'mis. Diganti aturan baru' : 'Masuk riwayat aturan'} />
        </Field>
      </ConfirmDialog>
    </div>
  );
}

export interface KelolaAturanProps {
  /** Batasi ke satu kategori (mis. halaman keuangan). */
  kategori?: KategoriAturan;
  /** Batasi ke satu titik (mis. pengaturan KRS). */
  titik?: string;
  judul?: React.ReactNode;
  className?: string;
}

/**
 * Modul lengkap aturan dinamis: ringkasan, daftar dengan saringan, tambah/ubah, detail (SK, dispensasi, uji, riwayat),
 * aktifkan/nonaktifkan/hapus, sampah (admin), dan pengatur per kategori. Hak akses mengikuti GET /v1/aturan/saya.
 */
export function KelolaAturan({ kategori, titik, judul = 'Aturan akademik dinamis', className }: KelolaAturanProps) {
  const saya = useAturanSaya();
  const ringkas = useDaftarAturan({ kategori, titik, per_page: 200 });
  const [tab, setTab] = React.useState<'aturan' | 'sampah' | 'pengatur'>('aturan');
  const [buka, setBuka] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<{ aturan: Aturan | null } | null>(null);
  const bolehTambah = saya.data ? saya.data.admin || saya.data.kategori.some((k) => k.boleh_atur && (!kategori || k.kategori === kategori)) : false;
  const hitung = (s: StatusAturan) => ringkas.data?.filter((a) => a.status === s).length ?? 0;
  const tanpaSk = ringkas.data?.filter((a) => a.status === 'draf' && !a.jumlah_sk).length ?? 0;
  const tombolTambah = bolehTambah ? (
    <Button onClick={() => setForm({ aturan: null })}>
      <Plus /> Tambah aturan
    </Button>
  ) : null;
  return (
    <div className={cn('u-aturan-modul', className)}>
      <div className="u-aturan-modul-kepala">
        <div>
          <h2>{judul}</h2>
          <p>Syarat, batas waktu, dan batas nilai yang ditegakkan SIAKAD di setiap langkah. Aturan aktif wajib ber-SK.</p>
        </div>
        {tombolTambah}
      </div>
      <div className="u-aturan-statistik">
        {[
          { label: 'Aktif', nilai: hitung('aktif'), ikon: <Power />, nada: 'success' },
          { label: 'Draf', nilai: hitung('draf'), ikon: <Pencil />, nada: 'warning', catatan: tanpaSk ? `${tanpaSk} belum ber-SK` : undefined },
          { label: 'Nonaktif', nilai: hitung('nonaktif'), ikon: <PowerOff />, nada: 'neutral' },
          { label: 'Mode blokir', nilai: ringkas.data?.filter((a) => a.status === 'aktif' && a.mode === 'blokir').length ?? 0, ikon: <Ban />, nada: 'danger' },
        ].map((s) => (
          <div key={s.label} className="u-aturan-stat" data-nada={s.nada}>
            <span aria-hidden>{s.ikon}</span>
            <div>
              <strong>{ringkas.data ? s.nilai : '–'}</strong>
              <span>{s.label}</span>
              {s.catatan && <em>{s.catatan}</em>}
            </div>
          </div>
        ))}
      </div>
      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'aturan', label: 'Aturan', icon: <Scale />, content: <DaftarAturan filter={{ kategori, titik }} onBuka={(a) => setBuka(a.id)} /> },
          ...(saya.data?.admin
            ? [{ value: 'sampah' as const, label: 'Sampah', icon: <Trash2 />, content: <DaftarAturan filter={{ kategori, titik, terhapus: true }} onBuka={(a) => setBuka(a.id)} /> }]
            : []),
          { value: 'pengatur', label: 'Pengatur', icon: <ShieldCheck />, content: <PengaturAturan /> },
        ]}
      />
      <Dialog open={buka !== null} onOpenChange={(o) => !o && setBuka(null)} side="right" size="lg" title="Detail aturan">
        {buka && <PanelDetailAturan id={buka} onUbah={(a) => setForm({ aturan: a })} onDihapus={() => setBuka(null)} />}
      </Dialog>
      <FormAturan
        open={form !== null}
        onOpenChange={(o) => !o && setForm(null)}
        aturan={form?.aturan ?? null}
        titik={titik}
        kategori={kategori}
        onTersimpan={(a) => {
          setForm(null);
          setBuka(a.id);
        }}
      />
    </div>
  );
}
