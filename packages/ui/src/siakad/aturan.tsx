'use client';
import * as React from 'react';
import {
  AlarmClock,
  ArchiveRestore,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Ban,
  CalendarRange,
  ChevronDown,
  Check,
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
  Lock,
  MessageSquareText,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Scale,
  Search,
  Send,
  Siren,
  Sparkle,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Undo2,
  UserCheck,
  Users,
  Waypoints,
  X,
} from 'lucide-react';
import { ProgressTenggat } from '../components/progres';
import { cn } from '../lib/cn';
import { IsianPemenuhan, type ParameterPemenuhan } from './pemenuhan-aturan';
import { Badge, Button, Skeleton, Tag } from '../components/actions';
import { Alert, Card, DescriptionList, Empty, Progress, Stepper, Tabs } from '../components/display';
import { Field, Input, SegmentedControl, Textarea } from '../components/forms';
import { BagianForm, HitungKarakter, IsianDaftar, IsianTanggal, PanelForm, Pilihan, PilihanBanyak } from '../components/formulir';
import { ConfirmDialog, Dialog, Menu, useToast } from '../components/overlays';
import type { SelectOption } from '../components/select';
import { useAkunSaya } from './akun';
import { PilihTahunAkademik } from './cari';
import { GalatApi } from './galat';
import { AlurPemeriksa, LabelPemeriksa, type TahapPemeriksa } from './pemeriksa';
import { PilihUnit, useUnitSdm } from './pilih-unit';
import { PilihEntitas } from './pilih';
import { PilihBerkas } from './pilih-berkas';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { IsianSK, PilihSK, type NilaiSK } from './isian-sk';
import { LinimasaPengajuan } from './pengajuan';
import { KelolaTitikAturan } from './aturan-titik';
import { DaftarAturanKelompok, rapikanNamaUnit } from './aturan-kelompok';
import {
  AjukanPengecualianAturan,
  AktifkanDaruratAturan,
  AntreanDaruratAturan,
  AntreanPengecualianAturan,
  DaruratAturanBadge,
  PejabatPenyetujuAturan,
  PesanAturanDilanggar,
  PilihSifatAturan,
  SifatAturanBadge,
  namaPenyetuju,
  useAjuanPengecualianAturan,
  type AjukanPengecualianAturanProps,
} from './aturan-keputusan';
import { DasarPedoman } from './pedoman';
import { DasarSkAturanDaftar, LencanaDasarSk, PanelAjukanAturan, ValidatorAturan, WizardTemplatAturan, type DasarSkAturan, type UnitRingkas } from './aturan-sk';

/*
 * Aturan akademik, kelulusan, dan keuangan dinamis (/v1/aturan): aturan disusun di satu titik penerapan (langkah
 * bisnis, mis. krs.ambil), wajib ber-SK sebelum aktif, bisa diberi dispensasi, dan diperiksa oleh mesin yang sama
 * dengan logika bisnis SIAKAD. Komponen di sini hanya memakai endpoint /v1/aturan; validasi di peramban meniru
 * Katalog::kondisi/parameter/cakupan dan AturanService::validasi di backend.
 */

// ================================================================ Tipe
export type KategoriAturan = 'akademik' | 'kelulusan' | 'keuangan' | 'kemahasiswaan' | 'kepegawaian' | 'penelitian' | 'mutu' | 'akun' | 'umum';
export type JenisAturan = 'syarat' | 'batas_waktu' | 'batas_nilai';
export type ModeAturan = 'blokir' | 'peringatan';
export type SifatAturan = 'ketat' | 'boleh_pengecualian';
/** Status aturan. `diajukan`/`disetujui`/`dikembalikan` dari alur persetujuan (SIAKAD terbaru). */
export type StatusAturan = 'draf' | 'diajukan' | 'disetujui' | 'dikembalikan' | 'aktif' | 'nonaktif';
/**
 * Operator kondisi. `antara` hanya dipakai penyusun di peramban (nilai `[min, maks]`); saat dikirim diubah menjadi
 * dua kondisi `>=` dan `<=` karena backend tidak punya operator antara.
 */
export type OpAturan = '>=' | '>' | '<=' | '<' | '=' | '!=' | 'dalam' | 'bukan_dalam' | 'memuat' | 'tidak_memuat' | 'benar' | 'salah' | 'antara';
export type TipeIndikator = 'angka' | 'teks' | 'benar_salah' | 'daftar' | 'pilihan' | 'tanggal';

export interface KondisiDasar {
  indikator: string;
  op: OpAturan;
  nilai?: unknown;
  pesan?: string;
  /** Bila data subjek tidak ada: gagal (bawaan), peringatan (lewati + beri tahu), lolos. Indikator dosen (aturan fakultas). */
  bila_kosong?: 'gagal' | 'peringatan' | 'lolos';
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
  /** Kampus (m_kampus.idkp / induk_kampus): aturan khusus kampus pengembangan. Kosong = semua kampus (aturan universitas). */
  kampus?: string[];
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
  /** Aturan bawaan kampus (diisi sistem). Tetap wajib SK; tanpa SK berstatus draf. SIAKAD terbaru. */
  bawaan?: boolean;
  /** Draf yang menunggu SK sebelum bisa diaktifkan. SIAKAD terbaru. */
  menunggu_sk?: boolean;
  /** Belum ada SK terlampir. */
  tanpa_sk?: boolean;
  /** Aturan aktif tanpa SK (aturan bawaan yang aktif otomatis): tampilkan "Belum ada SK, lampirkan". */
  perlu_lampir_sk?: boolean;
  /** Unit pemilik (aturan bawaan). SIAKAD terbaru. */
  unit?: string | null;
  /** SK terbaru aturan (di daftar). SIAKAD terbaru. */
  sk?: { id?: string; nomor: string | null; tanggal: string | null } | null;
  /** Usulan yang sedang berjalan (ringkas di daftar). SIAKAD terbaru. */
  usulan?: UsulanAturan | null;
  /** `ketat` = tidak bisa dilewati (kecuali dispensasi keuangan resmi); `boleh_pengecualian` = bisa diajukan pengecualian berdokumen. */
  sifat?: SifatAturan | null;
  /** Siapa yang memutus pengajuan pengecualian; kosong = pengatur titik. */
  pengecualian_oleh?: Array<{ jenis: 'peran' | 'izin'; kode: string; keterangan?: string | null }> | null;
  /** Aktif lewat jalur darurat, menunggu pengesahan susulan penyetuju. */
  darurat?: boolean;
  darurat_info?: { label?: string | null; alasan?: string | null; oleh?: string | null; waktu?: string | null } | null;
  /** Dasar SK aturan (SIAKAD docs/ATURAN-SK.md): berlaku, diubah, tidak_berlaku, belum. */
  dasar_sk?: DasarSkAturan | null;
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
  /** Tempat berkas disimpan: ruang berkas unit pembuat, folder "SK Aturan". SIAKAD terbaru. */
  lokasi?: { unit: string; unit_nama?: string | null; folder?: string | null } | null;
}
export interface PengecualianAturan {
  id: string;
  subjek_jenis: 'mahasiswa' | 'dosen' | 'prodi' | 'pegawai' | 'pendaftar' | 'akun';
  subjek: string;
  /** Nama subjek untuk tampilan (SIAKAD terbaru). */
  subjek_nama?: string | null;
  alasan: string;
  berlaku_sampai: string | null;
  berlaku_mulai?: string | null;
  berkas_id: string | null;
  oleh: string | null;
  waktu: string;
  berlaku: boolean;
  /** Pengajuan pengecualian berdokumen: diajukan, disetujui, ditolak. Kosong = dispensasi langsung oleh pengatur. */
  status?: 'diajukan' | 'disetujui' | 'ditolak' | null;
  nomor_dokumen?: string | null;
  tanggal_dokumen?: string | null;
  cakupan?: { tahun_id?: string | null } | null;
  catatan_putusan?: string | null;
  /** Di antrean lintas aturan. */
  aturan_id?: string;
  aturan_nama?: string;
  titik?: string;
  titik_judul?: string | null;
}
export interface PengaturBaris {
  titik: string | null;
  jenis: 'peran' | 'izin';
  kode: string;
  keterangan: string | null;
}
export interface TelaahAturan {
  oleh: string | null;
  nama_oleh?: string | null;
  catatan: string;
  waktu: string;
}
/** Usulan yang sedang berjalan: aktifkan (aturan baru/nonaktif) atau ubah (versi baru aturan aktif). SIAKAD terbaru. */
export interface UsulanAturan {
  id?: string;
  jenis?: 'aktifkan' | 'ubah' | 'darurat';
  status?: 'draf' | 'diajukan' | 'disetujui' | 'dikembalikan' | 'dibatalkan';
  versi_dasar?: number;
  /** Isi aturan versi baru (jenis `ubah`). */
  data?: Partial<Aturan> | null;
  sk?: { id?: string; nomor: string | null; tanggal: string | null } | null;
  catatan?: string | null;
  diajukan_oleh?: string | null;
  diajukan_at?: string | null;
  diputus_oleh?: string | null;
  diputus_at?: string | null;
  catatan_putusan?: string | null;
  telaah?: TelaahAturan[];
  jumlah_telaah?: number;
  /** Alur pemeriksa (docs/PEMERIKSA.md SIAKAD): pejabat penyetuju lalu telaah SPMI (berjalan bersamaan). */
  pemeriksa?: TahapPemeriksa[];
  pemeriksa_label?: string | null;
  /** Rantai validator pengajuan ini (docs/ATURAN-SK.md): posisi, SK dasar, unit pengaju, validator berikutnya. */
  validasi?: {
    id: string;
    status: 'berjalan' | 'disetujui' | 'dikembalikan' | 'ditolak' | 'dibatalkan';
    tahap_ke: number;
    jumlah_tahap: number;
    sk_dasar: { id: string; nomor: string; penerbit?: UnitRingkas | null } | null;
    unit_pengaju: UnitRingkas | null;
    pengaturan: string | null;
    berikutnya: Array<{ username: string; nama: string | null; sebagai: string }>;
  } | null;
}
/** Satu langkah alur persetujuan aturan (diajukan, disetujui, dikembalikan, ditelaah). SIAKAD terbaru. */
export interface LangkahPersetujuanAturan {
  aksi: 'diajukan' | 'disetujui' | 'dikembalikan' | 'ditelaah' | 'diaktifkan' | string;
  oleh: string | null;
  nama_oleh?: string | null;
  peran?: string | null;
  catatan?: string | null;
  waktu: string;
  versi?: number;
}
export interface DetailAturan extends Aturan {
  lampiran: LampiranAturan[];
  /** null bila pengguna bukan pengatur aturan ini. */
  pengecualian: PengecualianAturan[] | null;
  pengatur: unknown;
  boleh_atur: boolean;
  /** Versi baru aturan aktif yang menunggu persetujuan; versi sekarang tetap berlaku. SIAKAD terbaru. */
  usulan?: UsulanAturan | null;
  /** Linimasa alur persetujuan (bila server mengirim terpisah; selain itu dibaca dari riwayat). */
  persetujuan?: LangkahPersetujuanAturan[];
  /** Catatan telaah SPMI (tidak memblokir); SIAKAD terbaru mengirimnya di `usulan.telaah`. */
  telaah?: TelaahAturan[];
  boleh_setujui?: boolean;
  /** Validator tahap berjalan boleh menolak (rantai validator, docs/ATURAN-SK.md). */
  boleh_tolak?: boolean;
  /** Unit pengaju bawaan (unit pemilik aturan) untuk simulasi rantai. */
  unit_pengaju_bawaan?: UnitRingkas | null;
  boleh_telaah?: boolean;
  boleh_darurat?: boolean;
  /** Pengguna ini boleh mengajukan pengecualian (aturan `boleh_pengecualian`). */
  boleh_ajukan_pengecualian?: boolean;
  /** Pengguna ini boleh memutus pengajuan pengecualian aturan ini. */
  boleh_putus_pengecualian?: boolean;
  /** Siapa yang menyetujui aturan kategori ini. */
  penyetuju?: {
    kategori: string;
    bidang?: string | null;
    jabatan?: string | null;
    keterangan?: string | null;
    rektor?: boolean;
    orang?: Array<{ username: string; nama?: string | null; sebagai?: string | null }>;
  } | null;
  telaah_spmi?: boolean;
  /** Ruang berkas unit tempat SK disimpan. */
  unit_sk?: { unit: string; unit_nama?: string | null; folder?: string | null } | null;
  /** Dokumen SPMI tempat SK didaftarkan saat disetujui. */
  spmi?: Array<{ spmi_dokumen_id: number | string; versi?: number; status?: string; status_dokumen?: string; waktu?: string }>;
}
export interface RiwayatAturanItem {
  versi: number;
  aksi: string;
  catatan: string | null;
  oleh: string | null;
  /** Nama dan jabatan pelaku (mis. penyetuju). SIAKAD terbaru. */
  nama_oleh?: string | null;
  jabatan?: string | null;
  waktu: string;
  data: unknown;
}
export interface TulisTembusAturan {
  diterapkan: boolean;
  alasan: string | null;
  jenis_lama: string | null;
  baris: Array<{ id?: string | number; kode_prodi?: string; idkp?: string | number; dari?: Record<string, unknown> | string | null; menjadi?: Record<string, unknown> | string | null }>;
}
/** Contoh aturan siap pakai untuk satu titik (templat "Mulai dari contoh"). */
export interface ContohTitikAturan {
  judul: string;
  keterangan?: string;
  jenis: JenisAturan;
  mode?: ModeAturan;
  kategori?: KategoriAturan;
  kondisi?: GrupKondisi | null;
  parameter?: ParameterBatasWaktu | ParameterBatasNilai | null;
}
export interface TitikAturan {
  kode: string;
  judul: string;
  keterangan: string;
  kategori: KategoriAturan[];
  /** dosen = titik penetapan dosen PA/pembimbing/penguji (aturan fakultas). */
  subjek: 'mahasiswa' | 'kelas' | 'pegawai' | 'pendaftar' | 'akun' | 'dosen' | 'umum';
  jenis: JenisAturan[];
  konteks: string[];
  indikator: string[];
  batas_lama: string | null;
  penerapan: string[];
  /** Unit pemilik titik: baak, bauk, pmb, pustikom, fakultas, ... (lihat LABEL_UNIT_TITIK_ATURAN). SIAKAD terbaru. */
  unit?: string;
  /** Kelompok bidang, mis. Akademik, Keuangan, PMB. SIAKAD terbaru. */
  kelompok?: string;
  contoh?: ContohTitikAturan[];
  /** false = dinonaktifkan admin: tampil tetapi tidak bisa dipilih untuk aturan baru. */
  aktif?: boolean;
  bawaan?: boolean;
  kustom?: boolean;
}
export interface OpsiIndikatorAturan {
  nilai: string;
  label: string;
}
export interface IndikatorAturan {
  kode: string;
  judul: string;
  tipe: TipeIndikator;
  subjek: string;
  sumber: 'siakad' | 'konteks';
  keterangan: string;
  /** Kelompok di daftar pilihan, mis. Akademik, Keuangan, "Data dari langkah ini". SIAKAD terbaru. */
  kelompok?: string;
  /** Satuan angka: SKS, %, Rp, tahun, hari. */
  satuan?: string;
  /** Pilihan nilai untuk tipe `pilihan`. */
  opsi?: OpsiIndikatorAturan[];
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
  /** Boleh menyetujui/mengembalikan aturan yang diajukan (WR sesuai bidang). SIAKAD terbaru. */
  boleh_setujui?: boolean;
  /** Boleh menelaah (izin `aturan.telaah`). SIAKAD terbaru. */
  boleh_telaah?: boolean;
  /** Izin terkait aturan milik akun, mis. `aturan.telaah`. */
  izin?: string[];
  /** Boleh mengaktifkan aturan lewat jalur darurat (izin `aturan.darurat`). */
  boleh_darurat?: boolean;
  /** Boleh memutus pengajuan pengecualian di sebagian titik. */
  boleh_pengecualian?: boolean;
  /** Jumlah pengajuan aturan yang menunggu validasi saya (rantai validator). */
  validasi_saya?: number;
  boleh_validator_lihat?: boolean;
  boleh_validator_atur?: boolean;
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
  /** Aturan bersifat boleh pengecualian: subjek/operator bisa mengajukan pengecualian berdokumen. */
  boleh_pengecualian?: boolean;
  /** UUID aturan untuk pengajuan pengecualian (bawaan `id`). */
  aturan_id?: string;
  sifat?: SifatAturan;
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
  /** Prasyarat bawaan titik (mis. status mahasiswa), selalu diperiksa walau belum ada aturan. SIAKAD terbaru. */
  bawaan?: PrasyaratBawaan[];
}
export interface PrasyaratBawaan {
  kode: string;
  nama: string;
  terpenuhi: boolean;
  sekarang?: string | null;
  pesan?: string | null;
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
  /** Antrean alur persetujuan: `persetujuan_saya` atau `telaah`. SIAKAD terbaru. */
  antrean?: 'persetujuan_saya' | 'telaah';
  bawaan?: boolean;
  /** Unit pemilik aturan bawaan: baak, bauk, pmb, sdm, spmi, lppm, pustikom, fakultas. */
  unit?: string;
  menunggu_sk?: boolean;
  /** 1 = hanya aturan aktif tanpa SK (aturan bawaan aktif otomatis). */
  tanpa_sk?: boolean;
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
  akun: 'Akun pengguna',
  umum: 'Umum',
};

/** Label kategori; kategori baru dari server yang belum dikenal tetap tampil terbaca. */
export function labelKategoriAturan(k: string): string {
  return LABEL_KATEGORI_ATURAN[k as KategoriAturan] ?? (k.charAt(0).toUpperCase() + k.slice(1)).replace(/_/g, ' ');
}

/** Contoh isian formulir aturan menurut kategori/unit, supaya aplikasi SDM tidak menampilkan contoh KRS, dst. */
export interface ContohAturan {
  cariTitik: string;
  nama: string;
  kode: string;
  dasar: string;
  pesan: string;
  alternatif: string;
  berlakuBila: string;
  batas: string;
}
export const CONTOH_ATURAN: Record<KategoriAturan, ContohAturan> = {
  akademik: {
    cariTitik: 'Cari langkah, mis. KRS, input nilai, ujian',
    nama: 'Mis. Batas SKS KRS menurut IPS',
    kode: 'mis. krs.batas-sks',
    dasar: 'Dasar aturan, mis. Peraturan Akademik Pasal 12.',
    pesan: '“SKS lulus minimal 100 (sekarang 92).”',
    alternatif: 'mis. bebas tunggakan atau punya dispensasi',
    berlakuBila: 'Mis. batas khusus mahasiswa semester 1–2.',
    batas: 'mis. 24',
  },
  kelulusan: {
    cariTitik: 'Cari langkah, mis. yudisium, wisuda',
    nama: 'Mis. Syarat yudisium minimal 144 SKS',
    kode: 'mis. yudisium.sks-minimal',
    dasar: 'Dasar aturan, mis. Pedoman Akademik Bab Kelulusan.',
    pesan: '“SKS lulus minimal 144 (sekarang 138).”',
    alternatif: 'mis. sertifikat TOEFL atau lulus tes bahasa internal',
    berlakuBila: 'Mis. hanya untuk angkatan 2022 ke atas.',
    batas: 'mis. 144',
  },
  keuangan: {
    cariTitik: 'Cari langkah, mis. KRS, ujian, dispensasi, cicilan',
    nama: 'Mis. Wajib lunas 50% sebelum KRS',
    kode: 'mis. krs.syarat-bayar',
    dasar: 'Dasar aturan, mis. SK Rektor tentang Biaya Pendidikan.',
    pesan: '“Pembayaran semester minimal 50% (sekarang 30%).”',
    alternatif: 'mis. lunas atau punya dispensasi pembayaran',
    berlakuBila: 'Mis. hanya mahasiswa kelas reguler.',
    batas: 'mis. 3',
  },
  kemahasiswaan: {
    cariTitik: 'Cari langkah, mis. KKN, cuti, layanan, beasiswa',
    nama: 'Mis. Cuti akademik paling banyak 2 semester',
    kode: 'mis. cuti.maks-semester',
    dasar: 'Dasar aturan, mis. Pedoman Kemahasiswaan Pasal 5.',
    pesan: '“Cuti akademik paling banyak 2 semester (sudah 2).”',
    alternatif: 'mis. aktif berorganisasi atau punya rekomendasi dosen wali',
    berlakuBila: 'Mis. hanya mahasiswa semester 5 ke atas.',
    batas: 'mis. 2',
  },
  kepegawaian: {
    cariTitik: 'Cari langkah, mis. cuti, presensi, BKD, usulan kenaikan',
    nama: 'Mis. Studi lanjut minimal masa kerja 2 tahun',
    kode: 'mis. usulan.studi-lanjut',
    dasar: 'Dasar aturan, mis. Peraturan Rektor tentang Kepegawaian Pasal 8.',
    pesan: '“Masa kerja minimal 2 tahun (sekarang 1 tahun).”',
    alternatif: 'mis. BKD memenuhi atau ada izin pimpinan',
    berlakuBila: 'Mis. hanya untuk tendik kontrak.',
    batas: 'mis. 12',
  },
  penelitian: {
    cariTitik: 'Cari langkah, mis. usulan hibah, laporan, luaran, KKN',
    nama: 'Mis. Ketua hibah internal minimal Lektor',
    kode: 'mis. hibah.ketua-lektor',
    dasar: 'Dasar aturan, mis. Panduan Penelitian dan PkM LP2M 2026.',
    pesan: '“Laporan hibah sebelumnya belum diunggah.”',
    alternatif: 'mis. punya luaran jurnal atau HKI',
    berlakuBila: 'Mis. hanya skema hibah internal.',
    batas: 'mis. 2',
  },
  mutu: {
    cariTitik: 'Cari langkah, mis. capaian, temuan, audit, dokumen mutu',
    nama: 'Mis. Capaian indikator diisi paling lambat 31 Januari',
    kode: 'mis. capaian.batas-isi',
    dasar: 'Dasar aturan, mis. Manual SPMI Bab Pelaksanaan.',
    pesan: '“Minimal 80% indikator unit terisi (sekarang 60%).”',
    alternatif: 'mis. ada bukti dukung atau catatan auditor',
    berlakuBila: 'Mis. hanya unit prodi.',
    batas: 'mis. 80',
  },
  akun: {
    cariTitik: 'Cari langkah, mis. pembuatan akun',
    nama: 'Mis. Akun mahasiswa hanya untuk yang ber-NIM',
    kode: 'mis. akun.ber-nim',
    dasar: 'Dasar aturan, mis. SK Rektor tentang Layanan Akun.',
    pesan: '“Akun mahasiswa hanya untuk yang sudah punya NIM.”',
    alternatif: 'mis. bukan akun mahasiswa atau sudah punya NIM',
    berlakuBila: 'Mis. hanya untuk jenis akun mahasiswa.',
    batas: 'mis. 1',
  },
  umum: {
    cariTitik: 'Cari langkah layanan',
    nama: 'Mis. Layanan hanya dibuka pada jam kerja',
    kode: 'mis. layanan.jam-kerja',
    dasar: 'Dasar aturan, mis. nomor dan pasal SK yang mengatur.',
    pesan: '“Layanan dibuka pukul 08.00–16.00.”',
    alternatif: 'mis. syarat A atau syarat B',
    berlakuBila: 'Mis. hanya untuk unit tertentu.',
    batas: 'mis. 10',
  },
};
export const contohAturan = (k?: string | null): ContohAturan => CONTOH_ATURAN[k as KategoriAturan] ?? CONTOH_ATURAN.umum;

/**
 * Keterangan titik dari katalog ditulis untuk pengembang dan kadang memuat alamat API atau nama tabel, mis.
 * "(/pegawai/{id}/cek-syarat)" atau "GET /v1/...". Bagian teknis itu dibuang sebelum ditampilkan ke pengguna.
 */
export function keteranganTitikRamah(teks?: string | null): string {
  if (!teks) return '';
  return teks
    .replace(/\s*\([^()]*(?:\/|\{|\b[a-z]+_[a-z_]+\b)[^()]*\)/g, '')
    .replace(/\b(?:GET|POST|PUT|PATCH|DELETE)\s+\/\S+/g, '')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

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
export const LABEL_STATUS_ATURAN: Record<StatusAturan, string> = {
  draf: 'Draf',
  diajukan: 'Diajukan',
  disetujui: 'Disetujui',
  dikembalikan: 'Dikembalikan',
  aktif: 'Aktif',
  nonaktif: 'Nonaktif',
};
const VARIAN_STATUS = { draf: 'warning', diajukan: 'info', disetujui: 'primary', dikembalikan: 'danger', aktif: 'success', nonaktif: 'neutral' } as const;

/** Arti operator dalam kalimat ("IPK paling sedikit 2"). */
export const LABEL_OP_ATURAN: Record<OpAturan, { simbol: string; label: string }> = {
  '>=': { simbol: '≥', label: 'minimal' },
  '>': { simbol: '>', label: 'lebih dari' },
  '<=': { simbol: '≤', label: 'paling banyak' },
  '<': { simbol: '<', label: 'kurang dari' },
  '=': { simbol: '=', label: 'sama dengan' },
  '!=': { simbol: '≠', label: 'bukan' },
  dalam: { simbol: '∈', label: 'salah satu dari' },
  bukan_dalam: { simbol: '∉', label: 'bukan salah satu dari' },
  memuat: { simbol: '∋', label: 'termasuk' },
  tidak_memuat: { simbol: '∌', label: 'tidak termasuk' },
  benar: { simbol: '✓', label: 'ya' },
  salah: { simbol: '✗', label: 'tidak' },
  antara: { simbol: '↔', label: 'antara' },
};
const OP_TIPE: Record<TipeIndikator, OpAturan[]> = {
  angka: ['>=', '<=', '=', 'antara', '>', '<', '!=', 'dalam', 'bukan_dalam'],
  teks: ['=', '!=', 'dalam', 'bukan_dalam'],
  pilihan: ['=', '!=', 'dalam', 'bukan_dalam'],
  benar_salah: ['benar', 'salah'],
  daftar: ['memuat', 'tidak_memuat'],
  tanggal: ['>=', '<=', '=', 'antara'],
};
/** Operator yang ditawarkan langsung di penyusun; sisanya hanya muncul bila kondisi lama memakainya. */
const OP_UTAMA: Record<TipeIndikator, OpAturan[]> = {
  angka: ['>=', '<=', '=', 'antara'],
  teks: ['=', '!=', 'dalam', 'bukan_dalam'],
  pilihan: ['=', '!=', 'dalam', 'bukan_dalam'],
  benar_salah: ['benar', 'salah'],
  daftar: ['memuat', 'tidak_memuat'],
  tanggal: ['>=', '<=', '=', 'antara'],
};
/** Kata operator per tipe, mis. pilihan "adalah", tanggal "sejak". */
function labelOp(op: OpAturan, tipe: TipeIndikator | undefined): string {
  if (tipe === 'pilihan' || tipe === 'teks') {
    if (op === '=') return 'adalah';
    if (op === '!=') return 'bukan';
  }
  if (tipe === 'tanggal') {
    if (op === '>=') return 'sejak';
    if (op === '<=') return 'paling lambat';
    if (op === '=') return 'tepat pada';
  }
  return LABEL_OP_ATURAN[op]?.label ?? op;
}
/** Operator yang sah untuk tipe indikator (Katalog::nilaiOp), termasuk `antara` untuk angka dan tanggal. */
export const opUntukTipe = (tipe: TipeIndikator): OpAturan[] => OP_TIPE[tipe] ?? OP_TIPE.teks;

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
  diajukan: { label: 'Diajukan untuk disetujui', ikon: <Send />, nada: 'info' },
  disetujui: { label: 'Disetujui', ikon: <BadgeCheck />, nada: 'success' },
  dikembalikan: { label: 'Dikembalikan', ikon: <Undo2 />, nada: 'warning' },
  ditelaah: { label: 'Telaah SPMI', ikon: <MessageSquareText />, nada: 'info' },
  usulan_ubah: { label: 'Usulan versi baru', ikon: <Pencil /> },
  darurat: { label: 'Diaktifkan lewat jalur darurat', ikon: <Siren />, nada: 'danger' },
  darurat_disahkan: { label: 'Jalur darurat disahkan', ikon: <BadgeCheck />, nada: 'success' },
  darurat_dicabut: { label: 'Jalur darurat dicabut', ikon: <CircleX />, nada: 'danger' },
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

/** Nilai kondisi kosong (belum diisi), termasuk daftar kosong dan rentang `antara` yang belum lengkap. */
export function nilaiKondisiKosong(c: KondisiDasar): boolean {
  if (c.op === 'benar' || c.op === 'salah') return false;
  const v = c.nilai;
  const kosong = (x: unknown) => x === undefined || x === null || x === '';
  if (c.op === 'antara') return !Array.isArray(v) || v.length < 2 || kosong(v[0]) || kosong(v[1]);
  if (Array.isArray(v)) return v.length === 0;
  return kosong(v);
}

/** Teks nilai kondisi untuk kalimat (dengan satuan dan label pilihan). */
function teksNilai(c: KondisiDasar, ind?: IndikatorAturan): string {
  const v = c.nilai;
  const satu = (x: unknown) => {
    const opsi = ind?.opsi?.find((o) => String(o.nilai) === String(x));
    if (opsi) return opsi.label;
    if (c.indikator === 'status_aktif') return String(STATUS_MAHASISWA_ATURAN.find((s) => s.value === x)?.label ?? x);
    if (c.indikator === 'hari') return String(HARI.find((s) => s.value === String(x))?.label ?? x);
    if (c.indikator === 'angkatan') return formatTahun(String(x));
    if (ind?.tipe === 'tanggal') return formatWaktuAturan(String(x));
    const n = typeof x === 'string' && x.trim() !== '' && !Number.isNaN(Number(x)) && ind?.tipe === 'angka' ? Number(x) : x;
    const satuan = ind?.satuan ?? (c.indikator === 'tunggakan' ? 'Rp' : ind?.kode === 'persen_bayar_periode' || ind?.kode === 'presensi_persen' ? '%' : undefined);
    if (satuan === 'Rp') return `Rp${angka(n)}`;
    if (satuan === '%') return `${angka(n)}%`;
    return satuan ? `${angka(n)} ${satuan}` : angka(n);
  };
  if (c.op === 'antara' && Array.isArray(v)) {
    const [a, b] = v;
    const tanpaSatuan = ind?.satuan && ind.satuan !== 'Rp' && ind.satuan !== '%';
    return `${tanpaSatuan ? angka(Number(a)) : satu(a)} dan ${satu(b)}`;
  }
  if (Array.isArray(v)) {
    const t = v.map(satu);
    return t.length > 2 ? `${t.slice(0, -1).join(', ')}, atau ${t[t.length - 1]}` : t.join(' atau ');
  }
  return v === undefined || v === null ? '' : satu(v);
}

const hurufKecil = (s: string) => (/^[A-ZÀ-Ý][a-zà-ÿ]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/**
 * Satu kondisi sebagai kalimat, mis. "IPK minimal 2,75" atau "Jenis pegawai adalah Dosen". Nilai yang belum diisi
 * ditulis "…" (barisnya diberi peringatan "Nilai belum diisi"). `kecil` menurunkan huruf awal untuk dipakai di tengah kalimat.
 */
export function kalimatKondisi(c: KondisiDasar, katalog?: KatalogAturan, opsi: { kecil?: boolean } = {}): string {
  const ind = petaIndikator(katalog).get(c.indikator);
  const judulAsli = ind?.judul ?? (c.indikator || 'Indikator belum dipilih');
  const judul = opsi.kecil ? hurufKecil(judulAsli) : judulAsli;
  if (c.op === 'benar') return judul;
  if (c.op === 'salah') return `${opsi.kecil ? 'tidak' : 'Tidak'} ${hurufKecil(judulAsli)}`;
  if (nilaiKondisiKosong(c)) return `${judul} ${labelOp(c.op, ind?.tipe)} …`;
  return `${judul} ${labelOp(c.op, ind?.tipe)} ${teksNilai(c, ind)}`;
}

/** Seluruh kondisi sebagai satu kalimat dengan "dan"/"atau" (kelompok dalam kurung). */
export function ringkasKondisi(g: GrupKondisi | null | undefined, katalog?: KatalogAturan, opsi: { kecil?: boolean } = {}): string {
  if (!g) return '';
  const n = gabungAntara(g);
  const isi = isiGrup(n).filter((k) => isGrup(k) || k.indikator);
  const sambung = kunciGrup(n) === 'semua' ? ' dan ' : ' atau ';
  return isi.map((k, i) => (isGrup(k) ? `(${ringkasKondisi(k, katalog, { kecil: true })})` : kalimatKondisi(k, katalog, { kecil: opsi.kecil || i > 0 }))).join(sambung);
}

/** Kalimat utuh untuk ringkasan, mis. "Boleh dijalankan jika jenis pegawai adalah Dosen dan masa kerja minimal 1 tahun." */
export function kalimatSyarat(g: GrupKondisi | null | undefined, katalog?: KatalogAturan, awalan = 'Boleh dijalankan jika'): string {
  const isi = ringkasKondisi(g, katalog, { kecil: true });
  return isi ? `${awalan} ${isi}${isi.endsWith('…') ? '' : '.'}` : '';
}

/**
 * Pasangan `>=` lalu `<=` pada indikator yang sama (hasil `antara` yang dikirim) disatukan kembali menjadi satu
 * kondisi `antara`, baik berdampingan di kelompok "semua" maupun sebagai kelompok "semua" berisi dua kondisi itu.
 */
export function gabungAntara(g: GrupKondisi): GrupKondisi {
  const pasangan = (a: ItemKondisi | undefined, b: ItemKondisi | undefined): KondisiDasar | null =>
    a && b && !isGrup(a) && !isGrup(b) && a.indikator === b.indikator && a.op === '>=' && b.op === '<=' && !a.pesan && !b.pesan
      ? { indikator: a.indikator, op: 'antara', nilai: [a.nilai, b.nilai] }
      : null;
  const kunci = kunciGrup(g);
  const asal = isiGrup(g);
  const out: ItemKondisi[] = [];
  for (let i = 0; i < asal.length; i++) {
    const k = asal[i]!;
    if (isGrup(k)) {
      const dalam = isiGrup(k);
      const p = kunciGrup(k) === 'semua' && dalam.length === 2 ? pasangan(dalam[0], dalam[1]) : null;
      out.push(p ?? gabungAntara(k));
      continue;
    }
    const p = kunci === 'semua' ? pasangan(k, asal[i + 1]) : null;
    if (p) {
      out.push(p);
      i++;
    } else out.push(k);
  }
  return buatGrup(kunci, out);
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
  if (c.kampus?.length) bag.push(`Kampus ${c.kampus.join(', ')}`);
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
    const fakProdi = new Map((data ?? []).map((p) => [String(p.kode_prodi), p.kode_fakultas ? String(p.kode_fakultas) : undefined]));
    const fakDari = (k: string) => fakProdi.get(k);
    return { prodi, fakultas, nama, fakDari };
  }, [data]);
}

// ================================================================ Lencana
/** Lencana status aturan dinamis (draf, aktif, nonaktif), atau "Dihapus" untuk aturan di sampah. */
export function StatusAturanBadge({ status, dihapus }: { status: StatusAturan; dihapus?: boolean }) {
  if (dihapus) return <Badge variant="danger">Di sampah</Badge>;
  return (
    <Badge variant={VARIAN_STATUS[status] ?? 'neutral'} dot>
      {LABEL_STATUS_ATURAN[status] ?? status}
    </Badge>
  );
}
/** Status untuk lencana: draf yang usulannya sedang diajukan tampil "Diajukan". */
export function statusTampil(a: Pick<Aturan, 'status' | 'usulan'>): StatusAturan {
  if (a.status !== 'aktif' && a.usulan?.status === 'diajukan') return 'diajukan';
  if (a.status === 'draf' && a.usulan?.status === 'dikembalikan') return 'dikembalikan';
  return a.status;
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
        <div className="u-aturan-kartu-lencana">
          {a.bawaan && <Badge variant="info">Bawaan</Badge>}
          <StatusAturanBadge status={statusTampil(a)} dihapus={Boolean(a.dihapus_at)} />
          {a.status === 'aktif' && a.usulan?.status === 'diajukan' && <Badge variant="info">Versi baru diajukan</Badge>}
          {a.usulan?.status === 'diajukan' && a.usulan.pemeriksa?.length ? <LabelPemeriksa pemeriksa={a.usulan.pemeriksa} /> : null}
          {a.dasar_sk && a.dasar_sk.status !== 'berlaku' && a.status === 'aktif' ? <LencanaDasarSk dasar={a.dasar_sk} ringkas /> : null}
        </div>
      </div>
      {ketentuan && <p className="u-aturan-kartu-isi">{ketentuan}</p>}
      <div className="u-aturan-kartu-meta">
        <DaruratAturanBadge aturan={a} />
        <ModeAturanBadge mode={a.mode} />
        <SifatAturanBadge sifat={a.sifat} />
        <Badge variant="outline">{LABEL_KATEGORI_ATURAN[a.kategori] ?? a.kategori}</Badge>
        <span>
          <Users aria-hidden /> {ringkasCakupan(a.cakupan, nama)}
        </span>
        <span>
          <CalendarRange aria-hidden /> {formatTahun(a.tahun_id)}
        </span>
        {(a.jumlah_sk !== undefined || a.sk) && (
          <span data-kurang={(!a.sk?.nomor && a.jumlah_sk === 0) || undefined}>
            <FileBadge aria-hidden /> {a.sk?.nomor ? `SK ${a.sk.nomor}` : a.jumlah_sk ? `${a.jumlah_sk} SK` : a.bawaan && a.status !== 'aktif' ? 'Menunggu SK' : 'Belum ada SK'}
          </span>
        )}
        {a.perlu_lampir_sk && <LencanaLampirSK />}
      </div>
    </Card>
  );
}

/** Ketentuan aturan dalam satu kalimat (dipakai kartu dan daftar). */
export function ringkasKetentuan(a: Pick<Aturan, 'jenis' | 'kondisi' | 'parameter'>, katalog?: KatalogAturan): string {
  const bila = a.kondisi ? ringkasKondisi(a.kondisi, katalog, { kecil: a.jenis !== 'syarat' }) : '';
  if (a.jenis === 'syarat') return bila;
  if (a.jenis === 'batas_waktu') {
    const p = a.parameter as ParameterBatasWaktu | null;
    const w = p ? `${formatWaktuAturan(p.mulai)} – ${formatWaktuAturan(p.selesai)}` : '';
    return bila ? `${w}, bila ${bila}` : w;
  }
  const p = a.parameter as ParameterBatasNilai | null;
  if (!p) return '';
  const ind = petaIndikator(katalog).get(p.target);
  const kata = p.op === '<=' || p.op === '<' ? 'paling banyak' : 'paling sedikit';
  const tingkat = (p.tabel ?? []).map((b) => `${b.nilai} bila ${ringkasKondisi(b.jika, katalog, { kecil: true })}`);
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
  const opsiTitik = (katalog.data?.titik ?? [])
    .filter((t) => !tetap.kategori || t.kategori.includes(tetap.kategori as KategoriAturan))
    .map((t) => ({ value: t.kode, label: t.judul, group: labelKategoriAturan(t.kategori[0]) }));
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
                { value: 'diajukan', label: 'Diajukan' },
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
          description={disaring ? 'Ubah kata kunci atau saringan.' : 'Aturan yang ditambahkan akan muncul di sini sebagai draf sampai SK dilampirkan dan disetujui.'}
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
  if (op === 'antara') return ['', ''];
  return '';
}
function kondisiBaru(ind: IndikatorAturan | undefined): KondisiDasar {
  const op: OpAturan = ind ? (OP_UTAMA[ind.tipe] ?? OP_UTAMA.teks)[0]! : '>=';
  const c: KondisiDasar = { indikator: ind?.kode ?? '', op };
  // Indikator dosen (aturan fakultas): data SDM yang belum ada bawaannya hanya peringatan.
  if (ind?.subjek === 'dosen' && ind.sumber !== 'konteks') c.bila_kosong = 'peringatan';
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
    if (!k.indikator) return 'Pilih data yang diperiksa untuk setiap kondisi.';
    if (k.op === 'benar' || k.op === 'salah') continue;
    const judul = ind?.judul ?? k.indikator;
    if (k.op === 'dalam' || k.op === 'bukan_dalam') {
      if (!Array.isArray(k.nilai) || !k.nilai.length) return `${judul}: pilih minimal satu nilai.`;
      if (k.nilai.length > 200) return `${judul}: paling banyak 200 nilai.`;
      continue;
    }
    if (nilaiKondisiKosong(k)) return `${judul}: nilai belum diisi.`;
    if (ind?.tipe === 'angka') {
      const daftar = Array.isArray(k.nilai) ? k.nilai : [k.nilai];
      if (daftar.some((x) => Number.isNaN(Number(x)))) return `${judul}: nilai harus angka.`;
      if (k.op === 'antara' && Number(daftar[0]) > Number(daftar[1])) return `${judul}: angka pertama harus lebih kecil.`;
    }
    if (ind?.tipe === 'tanggal' && k.op === 'antara' && Array.isArray(k.nilai) && String(k.nilai[0]) > String(k.nilai[1])) return `${judul}: tanggal awal harus lebih dulu.`;
  }
  return null;
}

/**
 * Bersihkan kondisi untuk dikirim: angka jadi number, pesan kosong dibuang, dan `antara` dipecah menjadi `>=` dan
 * `<=` (berdampingan di kelompok "semua", atau kelompok "semua" baru di dalam kelompok "salah satu").
 */
export function rapikanKondisi(g: GrupKondisi, katalog?: KatalogAturan): GrupKondisi {
  const peta = petaIndikator(katalog);
  const kunci = kunciGrup(g);
  const isi: ItemKondisi[] = [];
  for (const k of isiGrup(g)) {
    if (isGrup(k)) {
      isi.push(rapikanKondisi(k, katalog));
      continue;
    }
    const ind = peta.get(k.indikator);
    const ubah = (x: unknown) => (ind?.tipe === 'angka' && x !== '' && !Number.isNaN(Number(x)) ? Number(x) : x);
    if (k.op === 'antara') {
      const [a, b] = Array.isArray(k.nilai) ? k.nilai : [];
      const dua: KondisiDasar[] = [
        { indikator: k.indikator, op: '>=', nilai: ubah(a) },
        { indikator: k.indikator, op: '<=', nilai: ubah(b) },
      ];
      if (k.pesan?.trim()) dua.forEach((d) => (d.pesan = k.pesan!.trim()));
      if (kunci === 'semua') isi.push(...dua);
      else isi.push({ semua: dua });
      continue;
    }
    const out: KondisiDasar = { indikator: k.indikator, op: k.op };
    if (k.op !== 'benar' && k.op !== 'salah') out.nilai = Array.isArray(k.nilai) ? k.nilai.map(ubah) : ubah(k.nilai);
    if (k.pesan?.trim()) out.pesan = k.pesan.trim();
    if (k.bila_kosong && k.bila_kosong !== 'gagal') out.bila_kosong = k.bila_kosong;
    isi.push(out);
  }
  return buatGrup(kunci, isi);
}

/** Pilihan nilai tetap untuk indikator: dari katalog (`opsi`) atau daftar yang dikenal pustaka. */
function opsiNilai(c: KondisiDasar, ind?: IndikatorAturan): SelectOption<string>[] | null {
  if (ind?.opsi?.length) return ind.opsi.map((o) => ({ value: String(o.nilai), label: o.label }));
  if (c.indikator === 'status_aktif') return STATUS_MAHASISWA_ATURAN;
  if (c.indikator === 'hari') return HARI;
  if (c.indikator === 'jenis_pegawai') return Object.entries(LABEL_JENIS_PEGAWAI_ATURAN).map(([value, label]) => ({ value, label }));
  if (c.indikator === 'kategori_pegawai') return Object.entries(LABEL_KATEGORI_PEGAWAI_ATURAN).map(([value, label]) => ({ value, label }));
  if (c.indikator === 'status_kepegawaian') return Object.entries(LABEL_STATUS_KEPEGAWAIAN_ATURAN).map(([value, label]) => ({ value, label }));
  return null;
}

function IsianAngka({ value, onChange, satuan, label, id }: { value: unknown; onChange: (v: string) => void; satuan?: string; label: string; id?: string }) {
  return (
    <div className="u-kondisi-angka" data-satuan-depan={satuan === 'Rp' || undefined}>
      {satuan === 'Rp' && <span className="u-kondisi-satuan">Rp</span>}
      <Input id={id} value={String(value ?? '')} type="number" inputMode="decimal" step="any" placeholder="0" aria-label={label} onChange={(e) => onChange(e.target.value)} />
      {satuan && satuan !== 'Rp' && <span className="u-kondisi-satuan">{satuan}</span>}
    </div>
  );
}

function IsianNilaiKondisi({ c, ind, onChange, id }: { c: KondisiDasar; ind?: IndikatorAturan; onChange: (nilai: unknown) => void; id?: string }) {
  if (c.op === 'benar' || c.op === 'salah') return null;
  const banyak = c.op === 'dalam' || c.op === 'bukan_dalam';
  const arr = Array.isArray(c.nilai) ? c.nilai.map((x) => String(x ?? '')) : [];
  const satu = Array.isArray(c.nilai) ? '' : String(c.nilai ?? '');
  const judul = ind?.judul ?? 'nilai';
  if (c.op === 'antara') {
    const [a = '', b = ''] = arr;
    return (
      <div className="u-kondisi-antara">
        {ind?.tipe === 'tanggal' ? (
          <>
            <IsianTanggal id={id} value={a || null} aria-label={`${judul} dari`} onValueChange={(v) => onChange([v ?? '', b])} />
            <span>sampai</span>
            <IsianTanggal value={b || null} aria-label={`${judul} sampai`} onValueChange={(v) => onChange([a, v ?? ''])} />
          </>
        ) : (
          <>
            <IsianAngka id={id} value={a} satuan={ind?.satuan === 'Rp' ? 'Rp' : undefined} label={`${judul} dari`} onChange={(v) => onChange([v, b])} />
            <span>dan</span>
            <IsianAngka value={b} satuan={ind?.satuan} label={`${judul} sampai`} onChange={(v) => onChange([a, v])} />
          </>
        )}
      </div>
    );
  }
  const opsi = opsiNilai(c, ind);
  if (opsi)
    return banyak ? (
      <PilihanBanyak id={id} options={opsi} value={arr} onValueChange={onChange} placeholder="Pilih satu atau lebih" aria-label={judul} />
    ) : (
      <Pilihan id={id} tampilan={opsi.length > 8 ? 'cari' : 'daftar'} options={opsi} value={satu || null} onValueChange={(v) => onChange(v ?? '')} placeholder="Pilih" aria-label={judul} />
    );
  if (ind?.tipe === 'tanggal') return <IsianTanggal id={id} value={satu || null} aria-label={judul} onValueChange={(v) => onChange(v ?? '')} />;
  if (c.indikator === 'angkatan' && !banyak) return <PilihTahunAkademik id={id} value={satu || null} onValueChange={(v) => onChange(v ?? '')} placeholder="Semester masuk" aria-label="Angkatan" />;
  if (ind?.tipe === 'daftar') return <PilihEntitas id={id} jenis="mata-kuliah" value={satu || null} onValueChange={(v) => onChange(v ?? '')} placeholder="Cari mata kuliah" aria-label="Mata kuliah" />;
  if (banyak) return <IsianDaftar id={id} value={arr} angka={ind?.tipe === 'angka'} onValueChange={onChange} />;
  if (ind?.tipe === 'angka') return <IsianAngka id={id} value={satu} satuan={ind.satuan} label={judul} onChange={onChange} />;
  return <Input id={id} value={satu} placeholder="Ketik nilai" aria-label={judul} onChange={(e) => onChange(e.target.value)} />;
}

/** Kelompok indikator untuk daftar pilihan; katalog lama tanpa `kelompok` ditebak dari subjek dan sumber. */
function kelompokIndikator(i: IndikatorAturan): string {
  if (i.kelompok) return i.kelompok;
  if (i.sumber === 'konteks') return 'Data dari langkah ini';
  if (i.subjek === 'pegawai') return 'Kepegawaian';
  if (KEUANGAN.has(i.kode)) return 'Keuangan';
  if (i.subjek === 'umum') return 'Umum';
  return 'Akademik';
}

function opsiIndikator(katalog: KatalogAturan | undefined, kode: string[]): SelectOption<string>[] {
  const peta = petaIndikator(katalog);
  const opsi = kode
    .map((k) => peta.get(k))
    .filter((i): i is IndikatorAturan => Boolean(i))
    .map((i) => ({ value: i.kode, label: i.judul, description: keteranganTitikRamah(i.keterangan) || undefined, group: kelompokIndikator(i) }));
  // Kelompok "Data dari langkah ini" dan "Umum" di akhir; sisanya mengikuti urutan pertama muncul.
  const akhir = (g?: string) => (g === 'Data dari langkah ini' ? 2 : g === 'Umum' ? 1 : 0);
  const urut = [...new Set(opsi.map((o) => o.group))].sort((a, b) => akhir(a) - akhir(b));
  return urut.flatMap((g) => opsi.filter((o) => o.group === g));
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
  const opsi = React.useMemo(() => opsiIndikator(katalog, indikator), [katalog, indikator]);
  const tipe = ind?.tipe ?? 'angka';
  const daftarOp = [...new Set([...(OP_UTAMA[tipe] ?? OP_UTAMA.teks), ...(opUntukTipe(tipe).includes(c.op) ? [c.op] : [])])];
  const kosong = Boolean(c.indikator) && nilaiKondisiKosong(c);
  const gantiOp = (op: OpAturan) => {
    const lamaBanyak = c.op === 'dalam' || c.op === 'bukan_dalam';
    const baruBanyak = op === 'dalam' || op === 'bukan_dalam';
    const n: KondisiDasar = { indikator: c.indikator, op, pesan: c.pesan, bila_kosong: c.bila_kosong };
    if (op === 'benar' || op === 'salah') return onChange(n);
    if (op === 'antara') n.nilai = c.op === 'antara' ? c.nilai : [Array.isArray(c.nilai) ? '' : (c.nilai ?? ''), ''];
    else if (c.op === 'antara') n.nilai = baruBanyak ? [] : ((Array.isArray(c.nilai) ? c.nilai[0] : '') ?? '');
    else if (lamaBanyak !== baruBanyak) n.nilai = baruBanyak ? (c.nilai !== '' && c.nilai != null && !Array.isArray(c.nilai) ? [c.nilai] : []) : Array.isArray(c.nilai) ? (c.nilai[0] ?? '') : '';
    else n.nilai = c.nilai ?? nilaiAwal(ind, op);
    onChange(n);
  };
  return (
    <div className="u-kondisi-baris" data-kosong={kosong || undefined}>
      <div className="u-kondisi-isian" data-tipe={tipe}>
        <Pilihan
          tampilan="cari"
          options={opsi}
          value={c.indikator || null}
          aria-label="Data yang diperiksa"
          placeholder="Pilih data yang diperiksa"
          onValueChange={(v) => {
            const i = v ? peta.get(v) : undefined;
            onChange({ ...kondisiBaru(i), pesan: c.pesan });
          }}
        />
        {tipe === 'benar_salah' ? (
          <SegmentedControl<'benar' | 'salah'>
            aria-label={`${ind?.judul ?? 'Kondisi'}: ya atau tidak`}
            value={c.op === 'salah' ? 'salah' : 'benar'}
            onValueChange={(v) => gantiOp(v)}
            options={[
              { value: 'benar', label: 'Ya' },
              { value: 'salah', label: 'Tidak' },
            ]}
          />
        ) : (
          <Pilihan
            tampilan="daftar"
            options={daftarOp.map((o) => ({ value: o, label: labelOp(o, tipe) }))}
            value={c.op}
            aria-label="Cara membandingkan"
            onValueChange={(v) => v && gantiOp(v as OpAturan)}
          />
        )}
        {tipe !== 'benar_salah' && <IsianNilaiKondisi id={`${idDasar}-nilai`} c={c} ind={ind} onChange={(nilai) => onChange({ ...c, nilai })} />}
      </div>
      <div className="u-kondisi-aksi">
        <Button
          variant={pesan ? 'soft' : 'ghost'}
          size="sm"
          iconOnly
          aria-label="Pesan khusus bila tidak terpenuhi"
          title="Pesan khusus bila tidak terpenuhi"
          aria-pressed={pesan}
          onClick={() => (pesan ? (setPesan(false), onChange({ ...c, pesan: undefined })) : setPesan(true))}
        >
          <MessageSquareText />
        </Button>
        <Button variant="ghost" size="sm" iconOnly aria-label="Hapus kondisi" title="Hapus kondisi" onClick={onHapus}>
          <X />
        </Button>
      </div>
      {ind?.keterangan && <p className="u-kondisi-keterangan">{keteranganTitikRamah(ind.keterangan)}</p>}
      {ind?.subjek === 'dosen' && ind.sumber !== 'konteks' && (
        <div className="u-kondisi-bila-kosong">
          <span>Bila data dosen belum ada</span>
          <Pilihan
            tampilan="daftar"
            size="sm"
            aria-label="Bila data dosen belum ada"
            options={[
              { value: 'peringatan', label: 'Beri peringatan, tetap izinkan' },
              { value: 'gagal', label: 'Anggap tidak memenuhi' },
              { value: 'lolos', label: 'Lewati tanpa peringatan' },
            ]}
            value={c.bila_kosong ?? 'gagal'}
            onValueChange={(v) => onChange({ ...c, bila_kosong: (v ?? 'gagal') as KondisiDasar['bila_kosong'] })}
          />
        </div>
      )}
      {kosong && (
        <p className="u-kondisi-peringatan" role="status">
          <CircleAlert aria-hidden /> Nilai belum diisi
        </p>
      )}
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
  const penuh = isi.length >= MAKS_KONDISI;
  const kataSambung = kunci === 'semua' ? 'dan' : 'atau';
  return (
    <div className="u-kondisi-grup" data-tingkat={tingkat} data-sambung={kunci}>
      <div className="u-kondisi-grup-kepala">
        {tingkat === 0 ? (
          <SegmentedControl<'semua' | 'salah_satu'>
            aria-label="Cara menggabungkan"
            value={kunci}
            onValueChange={(v) => onChange(buatGrup(v, isi))}
            options={[
              { value: 'semua', label: 'Semua terpenuhi' },
              { value: 'salah_satu', label: 'Salah satu terpenuhi' },
            ]}
          />
        ) : (
          <p className="u-kondisi-grup-judul">
            <GitBranch aria-hidden />
            {kunci === 'salah_satu' ? 'Salah satu dari berikut terpenuhi' : 'Semua berikut terpenuhi'}
          </p>
        )}
        {onHapus && (
          <Button variant="ghost" size="sm" onClick={onHapus}>
            <Trash2 /> Hapus kelompok
          </Button>
        )}
      </div>
      <ol className="u-kondisi-daftar">
        {isi.map((k, i) => (
          <li key={i} className="u-kondisi-butir">
            {i > 0 && <span className="u-kondisi-sambung">{kataSambung}</span>}
            {isGrup(k) ? (
              <SimpulGrup grup={k} onChange={(g) => set(i, g)} onHapus={() => set(i, null)} katalog={katalog} indikator={indikator} tingkat={tingkat + 1} idDasar={`${idDasar}-${i}`} />
            ) : (
              <BarisKondisi c={k} onChange={(c) => set(i, c)} onHapus={() => set(i, null)} katalog={katalog} indikator={indikator} idDasar={`${idDasar}-${i}`} />
            )}
          </li>
        ))}
      </ol>
      <div className="u-kondisi-tambah">
        <Button variant="soft" size="sm" disabled={penuh} onClick={() => onChange(buatGrup(kunci, [...isi, kondisiBaru(undefined)]))}>
          <Plus /> Tambah kondisi
        </Button>
        {tingkat < MAKS_TINGKAT && (
          <Button
            variant="ghost"
            size="sm"
            disabled={penuh}
            onClick={() => onChange(buatGrup(kunci, [...isi, buatGrup(kunci === 'semua' ? 'salah_satu' : 'semua', [kondisiBaru(undefined), kondisiBaru(undefined)])]))}
          >
            <GitBranch /> {kunci === 'semua' ? 'Tambah pilihan “atau”' : 'Tambah kelompok “dan”'}
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
  /** Boleh dikosongkan (untuk "berlaku untuk siapa" di batas waktu/nilai). */
  opsional?: boolean;
  /** Tampilkan kalimat ringkasan di bawah. Bawaan true. */
  ringkasan?: boolean;
  /** Awal kalimat ringkasan. Bawaan "Boleh dijalankan jika" ("Berlaku untuk yang" bila `opsional`). */
  awalanRingkasan?: string;
  /** Teks saat kondisi kosong dan `opsional`. */
  teksKosong?: React.ReactNode;
  galat?: string;
  id?: string;
}

/**
 * Penyusun kondisi visual: pilih data yang diperiksa (dikelompokkan per unit, dengan pencarian dan keterangan),
 * cara membandingkan dalam kata sesuai tipe (minimal/paling banyak/antara, adalah/salah satu dari, Ya/Tidak,
 * tanggal), nilai sesuai tipe, kelompok "salah satu" sebagai kartu bersarang, dan kalimat ringkasan utuh.
 * Hasilnya JSON `kondisi` yang diterima POST /v1/aturan (setelah `rapikanKondisi`).
 */
export function PenyusunKondisi({ titik, value, onValueChange, opsional, ringkasan = true, awalanRingkasan, teksKosong, galat, id = 'kondisi' }: PenyusunKondisiProps) {
  const katalog = useKatalogAturan();
  const t = katalog.data?.titik.find((x) => x.kode === titik);
  const indikator = React.useMemo(() => t?.indikator ?? [], [t]);
  const tampil = React.useMemo(() => (value ? gabungAntara(value) : null), [value]);
  if (!katalog.data) return <Skeleton height={96} />;
  if (!tampil)
    return (
      <div className="u-kondisi-kosong" id={id}>
        <p>{teksKosong ?? (opsional ? 'Berlaku untuk semua orang dalam cakupan.' : 'Belum ada kondisi.')}</p>
        <Button variant="soft" size="sm" disabled={!indikator.length} onClick={() => onValueChange({ semua: [kondisiBaru(undefined)] })}>
          <Plus /> {opsional ? 'Batasi untuk orang tertentu' : 'Tambah kondisi'}
        </Button>
      </div>
    );
  const kalimat = kalimatSyarat(tampil, katalog.data, awalanRingkasan ?? (opsional ? 'Berlaku untuk yang' : 'Boleh dijalankan jika'));
  return (
    <div className="u-kondisi" id={id} data-invalid={galat ? '' : undefined}>
      <SimpulGrup grup={tampil} onChange={(g) => onValueChange(isiGrup(g).length ? g : opsional ? null : g)} katalog={katalog.data} indikator={indikator} tingkat={0} idDasar={id} />
      {ringkasan && kalimat && (
        <p className="u-kondisi-kalimat">
          <ShieldCheck aria-hidden />
          <span>{kalimat}</span>
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

// ================================================================ Formulir aturan (wizard)
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
  kampus: string[];
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
  /** SK baru yang dilampirkan saat menyimpan (IsianSK). */
  sk: NilaiSK | null;
  sifat: SifatAturan;
  penyetujuPengecualian: string[];
  /** Ubah aturan aktif: id lampiran SK lama yang dipakai sebagai dasar versi baru. */
  skLama: string;
  /** Aturan syarat: cara memenuhi (otomatis/unggah/isian/ceklis/plagiasi) dan unit pemilik; lihat pemenuhan-aturan.tsx. */
  pemenuhan: ParameterPemenuhan | null;
}

/** Isian cakupan untuk titik bersubjek pegawai (sdm.*): jenis, kategori, status kepegawaian, dan unit SDM. */
function CakupanPegawai({ isi, set, galat }: { isi: IsiAturan; set: <K extends keyof IsiAturan>(k: K, v: IsiAturan[K]) => void; galat: Record<string, string> }) {
  const unit = useUnitSdm();
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
        <PilihUnit
          id="aturan-unit"
          multiple
          sumber="sdm"
          value={isi.unit.map((k) => String(unit.data?.find((u) => u.kode === k)?.id ?? k))}
          onValueChange={(_, units) => set('unit', units.map((u) => u.kode || String(u.id)))}
          placeholder="Semua unit"
          aria-label="Unit kerja"
        />
      </Field>
    </>
  );
}

const waktuPendek = (s?: string | null) => (s ? (s.slice(11, 16) === '00:00' || s.slice(11, 16) === '23:59' || s.length <= 10 ? s.slice(0, 10) : s.slice(0, 16)) : '');

function isiDari(a: Partial<Aturan> | null | undefined, titikAwal?: string): IsiAturan {
  const pw = a?.jenis === 'batas_waktu' ? (a.parameter as ParameterBatasWaktu | null) : null;
  const pn = a?.jenis === 'batas_nilai' ? (a.parameter as ParameterBatasNilai | null) : null;
  return {
    titik: a?.titik ?? titikAwal ?? '',
    kategori: a?.kategori ?? '',
    jenis: a?.jenis ?? '',
    nama: a?.nama ?? '',
    kode: a?.kode ?? '',
    keterangan: a?.keterangan ?? '',
    prioritas: String(a?.prioritas ?? 0),
    kondisi: a?.kondisi ? gabungAntara(a.kondisi) : null,
    mulai: waktuPendek(pw?.mulai),
    selesai: waktuPendek(pw?.selesai),
    target: pn?.target ?? 'sks_diambil',
    opBatas: pn?.op ?? '<=',
    nilaiBatas: pn?.nilai !== undefined ? String(pn.nilai) : '',
    tabel: (pn?.tabel ?? []).map((b) => ({ jika: b.jika ? gabungAntara(Array.isArray(b.jika) ? { semua: b.jika as ItemKondisi[] } : b.jika) : null, nilai: String(b.nilai) })),
    prodi: a?.cakupan?.prodi ?? [],
    fakultas: a?.cakupan?.fakultas ?? [],
    jenjang: a?.cakupan?.jenjang ?? [],
    kelas: a?.cakupan?.kelas ?? [],
    kampus: a?.cakupan?.kampus ?? [],
    angkatan_min: a?.cakupan?.angkatan_min ?? '',
    angkatan_max: a?.cakupan?.angkatan_max ?? '',
    unit: a?.cakupan?.unit ?? [],
    jenis_pegawai: a?.cakupan?.jenis_pegawai ?? [],
    kategori_pegawai: a?.cakupan?.kategori_pegawai ?? [],
    status_kepegawaian: a?.cakupan?.status_kepegawaian ?? [],
    tahun_id: a?.tahun_id ?? '',
    berlaku_mulai: waktuPendek(a?.berlaku_mulai),
    berlaku_selesai: waktuPendek(a?.berlaku_selesai),
    mode: a?.mode ?? 'blokir',
    pesan: a?.pesan ?? '',
    catatan: '',
    sk: null,
    skLama: '',
    sifat: a?.sifat ?? 'ketat',
    penyetujuPengecualian: (a?.pengecualian_oleh ?? []).filter((p) => p.jenis === 'peran').map((p) => p.kode),
    pemenuhan: a?.jenis === 'syarat' && a.parameter && typeof a.parameter === 'object' ? (a.parameter as unknown as ParameterPemenuhan) : null,
  };
}

/** SK lengkap untuk dilampirkan: nomor dari arsip, tanggal, dan berkas. */
/** SK dari registri (sk_id) sudah lengkap di sana; nomor baru butuh tanggal dan berkas untuk diajukan ke registri. */
const skLengkap = (sk: NilaiSK | null | undefined): sk is NilaiSK & { berkas_id: string; tanggal: string } => Boolean(sk?.sk_id || (sk?.nomor && sk.tanggal && sk.berkas_id));

/** Validasi sisi peramban yang sama dengan AturanService::validasi + Katalog::parameter/cakupan. */
export function periksaIsianAturan(x: IsiAturan, katalog: KatalogAturan | undefined): Record<string, string> {
  const g: Record<string, string> = {};
  const t = katalog?.titik.find((y) => y.kode === x.titik);
  if (!x.titik) g.titik = 'Pilih langkah tempat aturan diterapkan.';
  if (t && x.kategori && !t.kategori.includes(x.kategori as KategoriAturan)) g.kategori = `Langkah ini menerima: ${t.kategori.map((k) => labelKategoriAturan(k)).join(', ')}.`;
  if (!x.kategori) g.kategori = 'Pilih bagian yang mengatur.';
  if (!x.jenis) g.jenis = 'Pilih jenis aturan.';
  else if (t && !t.jenis.includes(x.jenis)) g.jenis = 'Jenis ini tidak tersedia di langkah yang dipilih.';
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
    if (!x.target) g.target = 'Pilih angka yang dibatasi.';
    if (x.nilaiBatas === '' && !x.tabel.length) g.nilaiBatas = 'Isi batas untuk semua orang atau tambah tingkat.';
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
  if (x.sk && !skLengkap(x.sk)) g.sk = 'Lengkapi nomor, tanggal, dan berkas SK, atau kosongkan untuk menyimpan draf saja.';
  return g;
}

function bodyAturan(x: IsiAturan, katalog: KatalogAturan | undefined, ubah: boolean): Record<string, unknown> {
  const cakupan: CakupanAturan = {};
  if (x.prodi.length) cakupan.prodi = x.prodi;
  if (x.fakultas.length) cakupan.fakultas = x.fakultas;
  if (x.jenjang.length) cakupan.jenjang = x.jenjang;
  if (x.kelas.length) cakupan.kelas = x.kelas;
  if (x.kampus.length) cakupan.kampus = x.kampus;
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
  if (x.jenis === 'syarat' && x.pemenuhan) parameter = x.pemenuhan as unknown as ParameterBatasWaktu;
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
  body.sifat = x.sifat;
  body.pengecualian_oleh = x.sifat === 'boleh_pengecualian' && x.penyetujuPengecualian.length ? x.penyetujuPengecualian.map((kode) => ({ jenis: 'peran', kode })) : null;
  if (ubah && x.catatan.trim()) {
    body.catatan = x.catatan.trim();
    body.alasan = x.catatan.trim();
  }
  return body;
}

/** Ubah isi formulir dari contoh titik (templat "Mulai dari contoh"). */
function terapkanContoh(x: IsiAturan, c: ContohTitikAturan): IsiAturan {
  const pw = c.jenis === 'batas_waktu' ? (c.parameter as ParameterBatasWaktu | null | undefined) : null;
  const pn = c.jenis === 'batas_nilai' ? (c.parameter as ParameterBatasNilai | null | undefined) : null;
  return {
    ...x,
    jenis: c.jenis,
    kategori: c.kategori ?? x.kategori,
    mode: c.mode ?? x.mode,
    nama: x.nama.trim() ? x.nama : c.judul,
    keterangan: x.keterangan.trim() ? x.keterangan : (c.keterangan ?? ''),
    kondisi: c.kondisi ? gabungAntara(c.kondisi) : null,
    mulai: pw ? waktuPendek(pw.mulai) : x.mulai,
    selesai: pw ? waktuPendek(pw.selesai) : x.selesai,
    target: pn?.target ?? x.target,
    opBatas: pn?.op ?? x.opBatas,
    nilaiBatas: pn?.nilai !== undefined ? String(pn.nilai) : pn ? '' : x.nilaiBatas,
    tabel: pn ? (pn.tabel ?? []).map((b) => ({ jika: b.jika ? gabungAntara(Array.isArray(b.jika) ? { semua: b.jika as ItemKondisi[] } : b.jika) : null, nilai: String(b.nilai) })) : x.tabel,
  };
}

/** Kalimat utuh satu aturan untuk langkah Tinjau, mis. "Langkah “Pendaftaran KKN” hanya boleh dijalankan jika ...". */
export function kalimatAturan(a: Pick<Aturan, 'jenis' | 'kondisi' | 'parameter'>, katalog?: KatalogAturan, judulTitik?: string): string {
  const langkah = judulTitik ? `“${judulTitik}”` : 'ini';
  const siapa = a.kondisi ? ringkasKondisi(a.kondisi, katalog, { kecil: true }) : '';
  if (a.jenis === 'syarat') return siapa ? `Langkah ${langkah} hanya boleh dijalankan jika ${siapa}.` : '';
  if (a.jenis === 'batas_waktu') {
    const p = a.parameter as ParameterBatasWaktu | null;
    if (!p?.mulai || !p.selesai) return '';
    return `Langkah ${langkah} hanya dibuka ${formatWaktuAturan(p.mulai)} sampai ${formatWaktuAturan(p.selesai)}${siapa ? `, untuk yang ${siapa}` : ''}.`;
  }
  const p = a.parameter as ParameterBatasNilai | null;
  if (!p?.target) return '';
  const ind = petaIndikator(katalog).get(p.target);
  const judul = hurufKecil(ind?.judul ?? p.target);
  const kata = p.op === '<=' ? 'paling banyak' : p.op === '<' ? 'kurang dari' : p.op === '>=' ? 'paling sedikit' : 'lebih dari';
  const nilai = (n: number) => teksNilai({ indikator: p.target, op: '=', nilai: n }, ind);
  const tingkat = (p.tabel ?? []).map((b, i) => `${i === 0 ? '' : ''}${nilai(b.nilai)} bila ${ringkasKondisi(b.jika, katalog, { kecil: true })}`);
  const bawaan = p.nilai !== undefined ? (tingkat.length ? `selain itu ${nilai(p.nilai)}` : nilai(p.nilai)) : '';
  const isi = [...tingkat, bawaan].filter(Boolean).join('; ');
  return `Di langkah ${langkah}, ${judul} ${kata} ${isi}${siapa ? `. Berlaku untuk yang ${siapa}` : ''}.`;
}

// ---------------------------------------------------------------- Langkah 1: titik
/** Label unit pemilik titik penerapan (`unit` di katalog). */
export const LABEL_UNIT_TITIK_ATURAN: Record<string, string> = {
  baak: 'BAAK',
  bauk: 'BAUK/Keuangan',
  pmb: 'PMB',
  pustikom: 'Pustikom',
  fakultas: 'Fakultas/Prodi',
  kemahasiswaan: 'Kemahasiswaan',
  lppm: 'LPPM',
  sdm: 'SDM',
  spmi: 'SPMI',
  perpustakaan: 'Perpustakaan',
  sarpras: 'Sarpras',
  sekretariat: 'Sekretariat',
};
/** Kelompok titik: unit pemilik (`unit`), lalu `kelompok`, lalu kategori pertama. */
export const kelompokTitik = (t: Pick<TitikAturan, 'unit' | 'kelompok' | 'kategori'>) =>
  (t.unit ? (LABEL_UNIT_TITIK_ATURAN[t.unit] ?? t.unit) : null) ?? t.kelompok ?? labelKategoriAturan(t.kategori[0] ?? 'umum');

function PilihTitikAturan({
  titik,
  value,
  onValueChange,
  bolehTitik,
  terkunci,
}: {
  titik: TitikAturan[];
  value: string;
  onValueChange: (kode: string) => void;
  bolehTitik: (t: TitikAturan) => string | null;
  terkunci?: boolean;
}) {
  const [q, setQ] = React.useState('');
  const kata = q.trim().toLowerCase();
  const cocok = titik.filter((t) => !kata || `${t.judul} ${t.keterangan} ${t.kode} ${kelompokTitik(t)}`.toLowerCase().includes(kata));
  const grup = [...new Set(cocok.map(kelompokTitik))];
  return (
    <div className="u-aturan-titik-pilih">
      <div className="u-aturan-cari">
        <Search aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari langkah, mis. KRS, KKN, cuti, wisuda" aria-label="Cari langkah" disabled={terkunci} />
      </div>
      {!cocok.length && <p className="u-aturan-sub">Tidak ada langkah yang cocok dengan “{q}”.</p>}
      <div className="u-aturan-titik-grup-daftar" role="radiogroup" aria-label="Langkah tempat aturan diterapkan">
        {grup.map((g) => (
          <section key={g} className="u-aturan-titik-grup">
            <h4>{g}</h4>
            <div className="u-aturan-titik-kisi">
              {cocok
                .filter((t) => kelompokTitik(t) === g)
                .map((t) => {
                  const alasan = bolehTitik(t);
                  const pilih = value === t.kode;
                  const contoh = t.contoh?.[0]?.judul;
                  return (
                    <button
                      key={t.kode}
                      type="button"
                      role="radio"
                      aria-checked={pilih}
                      className="u-aturan-titik-opsi"
                      data-pilih={pilih || undefined}
                      disabled={Boolean(alasan) || (terkunci && !pilih)}
                      title={alasan ?? undefined}
                      onClick={() => onValueChange(t.kode)}
                    >
                      <span className="u-aturan-titik-opsi-judul">
                        <strong>{t.judul}</strong>
                        {pilih && <CircleCheck aria-hidden />}
                      </span>
                      {t.keterangan && <span className="u-aturan-titik-opsi-ket">{ringkasKeterangan(t.keterangan)}</span>}
                      {alasan ? <span className="u-aturan-titik-opsi-alasan">{alasan}</span> : contoh ? <span className="u-aturan-titik-opsi-contoh">Contoh: {contoh}</span> : null}
                    </button>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
/** Keterangan titik tanpa bagian teknis dan tanpa "Contoh aturan: ..." (contoh tampil terpisah). */
function ringkasKeterangan(s: string) {
  return keteranganTitikRamah(s)
    .replace(/\s*Contoh aturan( kampus)?:.*$/i, '')
    .trim();
}

const JUDUL_JENIS_PANEL: Record<JenisAturan, string> = { syarat: 'Syarat', batas_waktu: 'Batas waktu', batas_nilai: 'Batas nilai' };

/** Aturan aktif dan draf di satu titik, dikelompokkan per jenis, supaya pengatur melihat gabungannya sebelum menambah. */
export function AturanDiTitik({ titik, kecuali, className }: { titik: string; kecuali?: string | null; className?: string }) {
  const katalog = useKatalogAturan();
  const d = useDaftarAturan({ titik, per_page: 200 });
  const daftar = (d.data ?? []).filter((a) => a.id !== kecuali && (a.status === 'aktif' || a.status === 'draf'));
  return (
    <section className={cn('u-aturan-di-titik', className)} aria-label="Aturan yang sudah berlaku di langkah ini">
      <div className="u-aturan-di-titik-kepala">
        <strong>Aturan yang sudah ada di langkah ini</strong>
        <span>{d.data ? (daftar.length ? `${daftar.length} aturan aktif atau draf` : 'Belum ada') : 'Memuat…'}</span>
      </div>
      {d.error ? (
        <GalatApi error={d.error} onRetry={d.refetch} />
      ) : !d.data ? (
        <Skeleton height={72} />
      ) : !daftar.length ? (
        <p className="u-aturan-sub">Belum ada aturan di langkah ini. Aturan yang Anda buat akan menjadi yang pertama.</p>
      ) : (
        (['syarat', 'batas_waktu', 'batas_nilai'] as JenisAturan[])
          .filter((j) => daftar.some((a) => a.jenis === j))
          .map((j) => (
            <div key={j} className="u-aturan-di-titik-jenis">
              <p className="u-aturan-di-titik-label">
                <span className="u-aturan-ikon" data-jenis={j} data-ukuran="sm" aria-hidden>
                  {IKON_JENIS[j]}
                </span>
                {JUDUL_JENIS_PANEL[j]}
              </p>
              <ul>
                {daftar
                  .filter((a) => a.jenis === j)
                  .sort((x, y) => y.prioritas - x.prioritas)
                  .map((a) => (
                    <li key={a.id}>
                      <div>
                        <strong>{a.nama}</strong>
                        <span>{ringkasKetentuan(a, katalog.data) || '–'}</span>
                        <span className="u-aturan-di-titik-sk">{teksSkRingkas(a)}</span>
                      </div>
                      <div className="u-aturan-di-titik-meta">
                        {a.bawaan && <Badge variant="info">Bawaan</Badge>}
                        <StatusAturanBadge status={statusTampil(a)} />
                        <DaruratAturanBadge aturan={a} />
                        <ModeAturanBadge mode={a.mode} />
                        <SifatAturanBadge sifat={a.sifat} />
                        <span title="Prioritas: angka lebih besar diperiksa lebih dulu">Prioritas {a.prioritas}</span>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          ))
      )}
    </section>
  );
}

/** "SK 12/UNIPO/2026 · 3 Jan 2026" bila server mengirim `sk`, selain itu jumlah SK. */
function teksSkRingkas(a: Aturan): string {
  if (a.usulan?.status === 'diajukan' && a.usulan.validasi?.sk_dasar) return `SK dasar ${a.usulan.validasi.sk_dasar.nomor}${a.usulan.validasi.sk_dasar.penerbit ? ` · ${rapikanNamaUnit(a.usulan.validasi.sk_dasar.penerbit.nama)}` : ''}`;
  if (a.dasar_sk?.sk) return `SK dasar ${a.dasar_sk.sk.nomor}${a.dasar_sk.sk.penerbit ? ` · ${rapikanNamaUnit(a.dasar_sk.sk.penerbit)}` : ''}`;
  if (a.sk?.nomor) return `SK ${a.sk.nomor}${a.sk.tanggal ? ` · ${formatWaktuAturan(a.sk.tanggal)}` : ''}`;
  if (a.jumlah_sk === undefined) return '';
  return a.jumlah_sk ? `${a.jumlah_sk} SK terlampir` : 'Belum ada SK';
}

// ---------------------------------------------------------------- Langkah 2: jenis
const PENJELASAN_JENIS: Record<JenisAturan, { judul: string; kalimat: string; contoh: string }> = {
  syarat: { judul: 'Syarat', kalimat: 'Hanya boleh jika …', contoh: 'Hanya boleh daftar KKN jika SKS lulus minimal 100.' },
  batas_waktu: { judul: 'Batas waktu', kalimat: 'Hanya boleh pada tanggal …', contoh: 'KRS hanya dibuka 1–14 Agustus. Bisa dibatasi untuk orang tertentu, mis. mahasiswa semester 1.' },
  batas_nilai: {
    judul: 'Batas nilai',
    kalimat: 'Paling banyak atau paling sedikit …',
    contoh: 'Paling banyak 24 SKS bila IPS ≥ 3,00; 21 SKS bila IPS ≥ 2,50; selain itu 18 SKS.',
  },
};

// ---------------------------------------------------------------- Wizard
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
  /** Langkah pertama yang dibuka (0 = titik … 5 = tinjau). Bawaan: 0 saat tambah, 2 saat ubah. */
  langkahAwal?: number;
  /** Periode awal saat menambah (mis. "Tambah aturan untuk periode ini" dari Kalender & periode). */
  tahunId?: string;
  /**
   * Aturan fakultas: kode fakultas (m_fakultas). Cakupan dikunci ke fakultas ini (prodi hanya prodi fakultas itu),
   * aturan baru dikirim bertingkat fakultas/prodi (SK Dekan, disahkan Dekan). docs/ATURAN-FAKULTAS.md SIAKAD.
   */
  lingkupFakultas?: string;
  /** Batasi pilihan titik (mis. titik penetapan dosen di halaman Aturan fakultas). */
  pilihanTitik?: string[];
}

const LANGKAH: Array<{ judul: string; ket: string; kunci: string[] }> = [
  { judul: 'Di mana', ket: 'Langkah yang diperiksa', kunci: ['titik'] },
  { judul: 'Jenis', ket: 'Syarat, waktu, atau batas', kunci: ['jenis', 'kategori'] },
  { judul: 'Ketentuan', ket: 'Kondisi dan nilai', kunci: ['kondisi', 'mulai', 'selesai', 'target', 'nilaiBatas', 'tabel'] },
  {
    judul: 'Identitas',
    ket: 'Nama dan cakupan',
    kunci: ['nama', 'kode', 'prioritas', 'angkatan_min', 'angkatan_max', 'berlaku_mulai', 'berlaku_selesai', 'tahun_id', 'prodi', 'fakultas', 'jenjang', 'kelas', 'kampus', 'unit'],
  },
  { judul: 'Dasar hukum', ket: 'SK aturan', kunci: ['sk', 'lampiran'] },
  { judul: 'Tinjau', ket: 'Mode, uji, simpan', kunci: ['pesan', 'mode', 'catatan'] },
];
const langkahGalat = (k: string) => {
  const dasar = k.split('.')[0]!.replace(/^cakupan$/, 'prodi');
  const i = LANGKAH.findIndex((l) => l.kunci.includes(dasar));
  return i < 0 ? 3 : i;
};

/**
 * Tambah atau ubah aturan dalam wizar enam langkah: di mana diterapkan (dengan aturan yang sudah ada di langkah itu),
 * jenis aturan dengan contoh, susun ketentuan, identitas dan cakupan, dasar hukum (SK dari arsip), lalu tinjau (mode,
 * uji ke contoh subjek, simpan draf atau aktifkan). Aturan tanpa SK tetap draf. Mengubah aturan aktif menaikkan versi
 * dan wajib memakai SK baru atau SK yang sudah dilampirkan.
 */
export function FormAturan({ aturan, titik: titikAwal, kategori: kategoriAwal, open, onOpenChange, trigger, onTersimpan, langkahAwal, tahunId: tahunAwal, lingkupFakultas, pilihanTitik }: FormAturanProps) {
  const katalog = useKatalogAturan();
  const saya = useAturanSaya();
  const siakad = useSiakad();
  const toast = useToast();
  const { prodi: opsiProdiSemua, fakultas: opsiFakultas, fakDari } = useNamaProdi();
  // Aturan fakultas: hanya prodi di fakultas itu.
  const opsiProdi = lingkupFakultas ? opsiProdiSemua.filter((p) => fakDari(p.value) === lingkupFakultas) : opsiProdiSemua;
  const [inner, setInner] = React.useState(false);
  const isOpen = open ?? inner;
  const [idTersimpan, setIdTersimpan] = React.useState<string | null>(null);
  const id = aturan?.id ?? idTersimpan;
  const ubah = Boolean(id);
  const aktif = aturan?.status === 'aktif';
  const detail = useAturan(isOpen && id ? id : null);
  const skAda = (detail.data?.lampiran ?? []).filter((l) => l.jenis === 'sk' && !l.dilepas_at);
  // Halaman aturan fakultas: pengatur titik dosen berlingkup fakultas (hak diperiksa server per titik).
  const bolehKategori = React.useCallback((k: string) => Boolean(lingkupFakultas) || !saya.data || saya.data.admin || saya.data.kategori.some((s) => s.kategori === k && s.boleh_atur), [saya.data, lingkupFakultas]);
  const awal = React.useMemo(() => {
    const x = isiDari(aturan, titikAwal);
    if (!aturan && kategoriAwal) x.kategori = kategoriAwal;
    if (!aturan && tahunAwal) x.tahun_id = tahunAwal;
    if (!aturan && lingkupFakultas) {
      x.fakultas = [lingkupFakultas];
      x.sifat = 'boleh_pengecualian';
    }
    const ta = katalog.data?.titik.find((y) => y.kode === x.titik);
    if (!aturan && ta) {
      if (!x.kategori || !ta.kategori.includes(x.kategori as KategoriAturan)) x.kategori = ta.kategori.find(bolehKategori) ?? '';
      if (!x.jenis) x.jenis = ta.jenis[0] ?? '';
    }
    return x;
  }, [aturan, titikAwal, kategoriAwal, tahunAwal, katalog.data, bolehKategori, lingkupFakultas]);
  const [isi, setIsi] = React.useState<IsiAturan>(awal);
  const [simpanan, setSimpanan] = React.useState<IsiAturan>(awal);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [langkah, setLangkah] = React.useState(0);
  const [dikunjungi, setDikunjungi] = React.useState(0);
  const [sibuk, setSibuk] = React.useState<null | 'draf' | 'aktif' | 'uji'>(null);
  const [galatSimpan, setGalatSimpan] = React.useState<unknown>(null);
  const [tanyaTutup, setTanyaTutup] = React.useState(false);
  const [daruratUntuk, setDaruratUntuk] = React.useState<Aturan | null>(null);
  const [disimpanPada, setDisimpanPada] = React.useState<Date | null>(null);
  const kepalaRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!isOpen) return;
    const l = langkahAwal ?? (aturan ? 2 : titikAwal ? 1 : 0);
    setIsi(awal);
    setSimpanan(awal);
    setGalat({});
    setGalatSimpan(null);
    setIdTersimpan(null);
    setDisimpanPada(null);
    setLangkah(l);
    setDikunjungi(aturan ? LANGKAH.length - 1 : l);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  React.useEffect(() => {
    // Katalog datang setelah dialog terbuka: isi ulang kategori/jenis bawaan selama belum diubah.
    if (isOpen && !aturan && JSON.stringify(isi) === JSON.stringify({ ...awal, kategori: isi.kategori, jenis: isi.jenis }) && (!isi.kategori || !isi.jenis)) {
      setIsi(awal);
      setSimpanan(awal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awal]);
  React.useEffect(() => {
    kepalaRef.current?.closest('.u-dialog-body')?.scrollTo({ top: 0 });
  }, [langkah]);

  const set = <K extends keyof IsiAturan>(k: K, v: IsiAturan[K]) => {
    setIsi((x) => ({ ...x, [k]: v }));
    setGalat((g) => (g[k] ? { ...g, [k]: '' } : g));
  };
  const t = katalog.data?.titik.find((y) => y.kode === isi.titik);
  const peta = petaIndikator(katalog.data);
  const berubah = JSON.stringify(isi) !== JSON.stringify(simpanan);
  const prodiSaya = saya.data?.kategori.find((k) => k.kategori === isi.kategori);
  const prodiTerbatas = !lingkupFakultas && Boolean(saya.data && !saya.data.admin && prodiSaya && !prodiSaya.semua_prodi && prodiSaya.prodi);
  const tulisTembus = Boolean(t?.batas_lama && isi.jenis === 'batas_waktu');
  const opsiKategori = (t?.kategori ?? []).filter((k) => !kategoriAwal || ubah || k === kategoriAwal || t?.kategori.length === 1);
  const contoh = contohAturan(isi.kategori || kategoriAwal || t?.kategori[0]);
  const opsiTarget = (t?.indikator ?? []).filter((k) => peta.get(k)?.tipe === 'angka').map((k) => ({ value: k, label: peta.get(k)?.judul ?? k, description: peta.get(k)?.satuan }));
  const indTarget = peta.get(isi.target);
  const daftarTitik = (katalog.data?.titik ?? []).filter((y) => (!kategoriAwal || ubah || y.kategori.includes(kategoriAwal)) && (!pilihanTitik || ubah || pilihanTitik.includes(y.kode)));
  const alasanTitik = (y: TitikAturan): string | null => {
    if (y.kode === isi.titik) return null;
    if (y.aktif === false) return 'Langkah ini dinonaktifkan admin, belum bisa diberi aturan baru.';
    if (saya.data && !y.kategori.some(bolehKategori)) return 'Anda tidak berwenang mengatur langkah ini.';
    return null;
  };
  const skBaruLengkap = skLengkap(isi.sk);
  const skLamaDipakai = Boolean(isi.skLama && skAda.some((l) => l.id === isi.skLama));
  const adaSk = skBaruLengkap || skAda.length > 0;
  // Ubah aturan aktif = versi baru: wajib SK baru atau memilih SK yang sudah ada.
  const skVersiBaru = aktif ? skBaruLengkap || skLamaDipakai : true;
  const terakhir = langkah === LANGKAH.length - 1;
  const draf: Aturan = {
    ...(aturan ?? ({} as Aturan)),
    jenis: (isi.jenis || 'syarat') as JenisAturan,
    kondisi: isi.kondisi,
    parameter: (bodyAturan(isi, katalog.data, true).parameter as Aturan['parameter']) ?? null,
  };

  const periksaLangkah = (i: number): Record<string, string> => {
    const g = periksaIsianAturan(isi, katalog.data);
    if (i === 4 && aktif && !skVersiBaru) g.sk = 'Aturan ini aktif. Pilih SK yang sudah dilampirkan atau lampirkan SK baru untuk versi ini.';
    return Object.fromEntries(Object.entries(g).filter(([k, v]) => v && langkahGalat(k) <= i && langkahGalat(k) >= (i === LANGKAH.length - 1 ? 0 : i)));
  };
  const lanjut = () => {
    const g = periksaLangkah(langkah);
    if (Object.keys(g).length) {
      setGalat(g);
      return;
    }
    setGalat({});
    const n = Math.min(LANGKAH.length - 1, langkah + 1);
    setLangkah(n);
    setDikunjungi((v) => Math.max(v, n));
  };
  const keLangkah = (i: number) => {
    if (i > dikunjungi) return;
    setGalat({});
    setLangkah(i);
  };

  /** Simpan (tambah atau ubah), lampirkan SK baru bila lengkap, lalu aktifkan bila diminta. */
  const simpan = async (cara: 'draf' | 'aktif' | 'uji'): Promise<(DetailAturan & { tulis_tembus?: TulisTembusAturan }) | null> => {
    const semua = periksaIsianAturan(isi, katalog.data);
    if (cara !== 'draf' && aktif && !skVersiBaru) semua.sk = 'Pilih SK yang sudah dilampirkan atau lampirkan SK baru untuk versi ini.';
    if (cara === 'aktif' && !adaSk) semua.sk = 'Lampirkan SK dulu. Tanpa SK aturan hanya bisa disimpan sebagai draf.';
    if (cara === 'aktif' && aktif && !skVersiBaru) semua.sk = 'Pilih SK yang sudah dilampirkan atau lampirkan SK baru untuk versi ini.';
    const kunci = Object.keys(semua).filter((k) => semua[k]);
    if (kunci.length) {
      setGalat(semua);
      setLangkah(Math.min(...kunci.map(langkahGalat)));
      return null;
    }
    setSibuk(cara);
    setGalatSimpan(null);
    try {
      const body = bodyAturan(isi, katalog.data, ubah);
      if (lingkupFakultas) {
        // Aturan fakultas: cakupan dikunci ke fakultas; tingkat fakultas, atau prodi bila dipersempit ke prodi tertentu.
        body.cakupan = { ...(body.cakupan as CakupanAturan), fakultas: [lingkupFakultas] };
        if (!ubah) {
          body.tingkat = isi.prodi.length ? 'prodi' : 'fakultas';
          body.lingkup_fakultas = lingkupFakultas;
        }
      }
      if (aktif) {
        // Versi baru aturan aktif membawa dasar SK-nya (nama kolom mengikuti docs/ATURAN.md SIAKAD).
        if (skBaruLengkap) body.sk = isi.sk!.sk_id ? { sk_id: isi.sk!.sk_id } : { berkas_id: isi.sk!.berkas_id, nomor: isi.sk!.nomor, tanggal: isi.sk!.tanggal, perihal: isi.sk!.perihal ?? null };
        else if (skLamaDipakai) body.lampiran_id = isi.skLama;
        if (cara === 'aktif') body.ajukan = true;
      }
      let r: DetailAturan & { tulis_tembus?: TulisTembusAturan };
      try {
        r = (await siakad.request<DetailAturan & { tulis_tembus?: TulisTembusAturan }>({ method: 'POST', path: ubah ? `/v1/aturan/${id}` : '/v1/aturan', body })).data;
      } catch (e) {
        const f = (e as { fields?: Record<string, unknown> }).fields;
        if (f && Object.keys(f).length) {
          const peta2: Record<string, string> = {};
          for (const [kk, v] of Object.entries(f)) {
            const k2 = kk.startsWith('parameter.tabel.')
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
                      : kk.startsWith('sk')
                        ? 'sk'
                        : kk;
            peta2[k2] = String(v);
          }
          setGalat(peta2);
          setLangkah(Math.min(...Object.keys(peta2).map(langkahGalat)));
          return null;
        }
        throw e;
      }
      // SK baru dilampirkan terpisah, kecuali sudah ikut dikirim sebagai dasar versi baru aturan aktif.
      if (skBaruLengkap && !aktif) {
        await siakad.request({
          method: 'POST',
          path: `/v1/aturan/${r.id}/lampiran`,
          body: isi.sk!.sk_id ? { sk_id: isi.sk!.sk_id, jenis: 'sk' } : { berkas_id: isi.sk!.berkas_id, jenis: 'sk', nomor: isi.sk!.nomor, tanggal: isi.sk!.tanggal, perihal: isi.sk!.perihal ?? `Penetapan ${isi.nama.trim()}` },
        });
      }
      if (cara === 'aktif' && !aktif) {
        // Alur persetujuan: draf -> diajukan (SK wajib) -> disetujui -> aktif. SIAKAD lama tanpa /ajukan langsung aktifkan.
        const catatan = { catatan: isi.catatan.trim() || null };
        try {
          r = (await siakad.request<DetailAturan & { tulis_tembus?: TulisTembusAturan }>({ method: 'POST', path: `/v1/aturan/${r.id}/ajukan`, body: catatan })).data ?? r;
        } catch (e) {
          if ((e as { status?: number }).status !== 404) throw e;
          if (r.status !== 'aktif') r = (await siakad.request<DetailAturan & { tulis_tembus?: TulisTembusAturan }>({ method: 'POST', path: `/v1/aturan/${r.id}/aktifkan`, body: catatan })).data ?? r;
        }
      }
      invalidateSiakad('aturan');
      const bersih = { ...isi, sk: skBaruLengkap && !aktif ? null : isi.sk };
      setIsi(bersih);
      setSimpanan(bersih);
      setIdTersimpan(r.id);
      setDisimpanPada(new Date());
      if (cara === 'uji') return r;
      toast.add({
        title: cara === 'aktif' ? (r.status === 'aktif' && !aktif ? 'Aturan aktif' : 'Diajukan untuk disetujui') : aktif ? 'Versi baru tersimpan' : 'Draf tersimpan',
        description: r.tulis_tembus?.diterapkan
          ? `Tanggal juga ditulis ke menu batas waktu lama (${r.tulis_tembus.baris.length} baris).`
          : cara === 'aktif'
            ? r.status === 'aktif' && !aktif
              ? `Mulai ditegakkan di ${t?.judul ?? isi.titik}.`
              : aktif
                ? 'Versi sekarang tetap berlaku sampai versi baru disetujui.'
                : 'Aturan aktif setelah disetujui pimpinan bidang.'
            : aktif
              ? `Versi ${r.versi}.`
              : adaSk
                ? 'Ajukan untuk disetujui bila sudah siap.'
                : 'Lampirkan SK agar bisa diajukan.',
        type: 'success',
      });
      setInner(false);
      onOpenChange?.(false);
      onTersimpan?.(r);
      return r;
    } catch (e) {
      setGalatSimpan(e);
      return null;
    } finally {
      setSibuk(null);
    }
  };

  const tutup = (o: boolean) => {
    if (o) {
      setInner(true);
      onOpenChange?.(true);
      return;
    }
    if (sibuk) return;
    if (berubah) return setTanyaTutup(true);
    setInner(false);
    onOpenChange?.(false);
  };

  const tabelBaru = () => ({ jika: { semua: [kondisiBaru(peta.get(t?.indikator.includes('ips_lalu') ? 'ips_lalu' : (t?.indikator[0] ?? '')))] } as GrupKondisi, nilai: '' });

  // ------------------------------------------------------------ isi tiap langkah
  const isiLangkah = [
    // 0 Di mana
    <div key="titik" className="u-aturan-langkah">
      <p className="u-aturan-langkah-ket">
        {ubah ? 'Langkah tidak bisa diubah setelah aturan disimpan.' : 'Pilih langkah yang akan diperiksa aturan ini. Aturan berlaku di semua aplikasi yang menjalankan langkah itu.'}
      </p>
      {!katalog.data ? (
        <Skeleton height={240} />
      ) : (
        <div className="u-aturan-titik-tata" data-ada={isi.titik ? '' : undefined}>
          <PilihTitikAturan
            titik={daftarTitik}
            value={isi.titik}
            terkunci={ubah}
            bolehTitik={alasanTitik}
            onValueChange={(v) => {
              const baru = katalog.data?.titik.find((y) => y.kode === v);
              setIsi((x) => ({
                ...x,
                titik: v,
                kategori: baru?.kategori.includes(x.kategori as KategoriAturan) ? x.kategori : (baru?.kategori.find(bolehKategori) ?? ''),
                jenis: baru?.jenis.includes(x.jenis as JenisAturan) ? x.jenis : (baru?.jenis[0] ?? ''),
                kondisi: x.titik === v ? x.kondisi : null,
                tabel: x.titik === v ? x.tabel : [],
                target: baru?.konteks.includes('sks_diambil') ? 'sks_diambil' : (baru?.indikator.find((k) => peta.get(k)?.tipe === 'angka') ?? ''),
              }));
              setGalat({});
            }}
          />
          {isi.titik && (
            <div className="u-aturan-titik-samping">
              {t && (
                <div className="u-aturan-titik-terpilih">
                  <span className="u-aturan-sub">Langkah terpilih</span>
                  <strong>{t.judul}</strong>
                  {t.keterangan && <p>{ringkasKeterangan(t.keterangan)}</p>}
                  {t.penerapan.length > 0 && (
                    <p className="u-aturan-penerapan">
                      <ShieldCheck aria-hidden />
                      {t.penerapan.length === 1 ? 'Diperiksa otomatis setiap kali langkah ini dijalankan.' : `Diperiksa otomatis di ${t.penerapan.length} tempat yang menjalankan langkah ini.`}
                    </p>
                  )}
                </div>
              )}
              <AturanDiTitik titik={isi.titik} kecuali={id} />
            </div>
          )}
        </div>
      )}
      {galat.titik && (
        <p className="u-field-error" role="alert">
          {galat.titik}
        </p>
      )}
    </div>,

    // 1 Jenis
    <div key="jenis" className="u-aturan-langkah">
      <p className="u-aturan-langkah-ket">Pilih bentuk aturannya. Hanya jenis yang bisa dipakai di langkah ini yang bisa dipilih.</p>
      <div className="u-aturan-jenis-kisi" role="radiogroup" aria-label="Jenis aturan" id="aturan-jenis">
        {(['syarat', 'batas_waktu', 'batas_nilai'] as JenisAturan[]).map((j) => {
          const boleh = Boolean(t?.jenis.includes(j)) && !(ubah && aturan && aturan.jenis !== j);
          const pilih = isi.jenis === j;
          return (
            <button
              key={j}
              type="button"
              role="radio"
              aria-checked={pilih}
              disabled={!boleh}
              className="u-aturan-jenis-opsi"
              data-pilih={pilih || undefined}
              onClick={() => {
                set('jenis', j);
                if (j !== isi.jenis) set('kondisi', null);
              }}
            >
              <span className="u-aturan-ikon" data-jenis={j} aria-hidden>
                {IKON_JENIS[j]}
              </span>
              <strong>{PENJELASAN_JENIS[j].judul}</strong>
              <span className="u-aturan-jenis-kalimat">{PENJELASAN_JENIS[j].kalimat}</span>
              <span className="u-aturan-jenis-contoh">{PENJELASAN_JENIS[j].contoh}</span>
              {!boleh && <span className="u-aturan-titik-opsi-alasan">{ubah ? 'Jenis tidak bisa diganti setelah disimpan' : 'Tidak tersedia di langkah ini'}</span>}
            </button>
          );
        })}
      </div>
      {galat.jenis && (
        <p className="u-field-error" role="alert">
          {galat.jenis}
        </p>
      )}
      {opsiKategori.length > 1 && (
        <Field label="Bagian yang mengatur" required error={galat.kategori || undefined} description="Menentukan siapa yang berwenang mengubah aturan ini.">
          <Pilihan
            id="aturan-kategori"
            tampilan="tombol"
            required
            options={opsiKategori.map((k) => ({ value: k, label: labelKategoriAturan(k), disabled: !bolehKategori(k) }))}
            value={isi.kategori || null}
            onValueChange={(v) => set('kategori', v ?? '')}
          />
        </Field>
      )}
      <div className="u-aturan-siapa">
        <p className="u-aturan-di-titik-label">Bisakah aturan ini dikecualikan?</p>
        <PilihSifatAturan value={isi.sifat} onValueChange={(v) => set('sifat', v)} penyetuju={isi.penyetujuPengecualian} onPenyetujuChange={(v) => set('penyetujuPengecualian', v)} />
      </div>
      {!ubah && (t?.contoh?.length ?? 0) > 0 && (
        <div className="u-aturan-contoh">
          <p className="u-aturan-contoh-judul">
            <Sparkle aria-hidden /> Mulai dari contoh
          </p>
          <div className="u-aturan-contoh-kisi">
            {t!
              .contoh!.filter((c) => t!.jenis.includes(c.jenis))
              .map((c, i) => (
                <button
                  key={i}
                  type="button"
                  className="u-aturan-contoh-opsi"
                  onClick={() => {
                    setIsi((x) => terapkanContoh(x, c));
                    setGalat({});
                    setLangkah(2);
                    setDikunjungi((v) => Math.max(v, 2));
                  }}
                >
                  <span className="u-aturan-ikon" data-jenis={c.jenis} data-ukuran="sm" aria-hidden>
                    {IKON_JENIS[c.jenis]}
                  </span>
                  <span>
                    <strong>{c.judul}</strong>
                    {c.keterangan && <span>{c.keterangan}</span>}
                    <em>
                      {PENJELASAN_JENIS[c.jenis].judul} · {c.mode === 'peringatan' ? 'Peringatan' : 'Blokir'}
                    </em>
                  </span>
                  <ArrowRight aria-hidden />
                </button>
              ))}
          </div>
        </div>
      )}
    </div>,

    // 2 Ketentuan
    <div key="ketentuan" className="u-aturan-langkah">
      {isi.jenis === 'syarat' && (
        <>
          <p className="u-aturan-langkah-ket">Susun kondisi yang harus dipenuhi. Untuk alternatif ({contoh.alternatif}), pakai Tambah pilihan “atau”.</p>
          <IsianPemenuhan value={isi.pemenuhan} onValueChange={(v) => set('pemenuhan', v)} kondisi={isi.kondisi} onKondisi={(v) => set('kondisi', v)} indikator={katalog.data?.indikator ?? []} />
          <PenyusunKondisi id="aturan-kondisi" titik={isi.titik} value={isi.kondisi} onValueChange={(v) => set('kondisi', v)} galat={galat.kondisi || undefined} />
        </>
      )}
      {isi.jenis === 'batas_waktu' && (
        <>
          <p className="u-aturan-langkah-ket">Langkah hanya bisa dijalankan di antara dua waktu ini. Jam kosong berarti sepanjang hari.</p>
          <div className="u-form-kisi" data-kolom="2">
            <Field label="Mulai" required error={galat.mulai || undefined}>
              <IsianWaktu id="aturan-mulai" value={isi.mulai} onValueChange={(v) => set('mulai', v)} />
            </Field>
            <Field label="Selesai" required error={galat.selesai || undefined}>
              <IsianWaktu id="aturan-selesai" value={isi.selesai} akhirHari onValueChange={(v) => set('selesai', v)} />
            </Field>
          </div>
          {tulisTembus && (
            <Alert variant="info" icon={<GitBranch />} title="Ikut menu batas waktu lama">
              Bila periode diisi dan cakupan hanya prodi atau fakultas, tanggal ini juga ditulis ke menu Tahun Akademik saat diaktifkan, sehingga halaman web lama memakai tanggal yang sama.
            </Alert>
          )}
          <BagianKondisiSiapa titik={isi.titik} value={isi.kondisi} onValueChange={(v) => set('kondisi', v)} galat={galat.kondisi} contoh={contoh.berlakuBila} />
        </>
      )}
      {isi.jenis === 'batas_nilai' && (
        <>
          <p className="u-aturan-langkah-ket">Tentukan angka yang dibatasi, lalu batasnya. Tingkat pertama yang kondisinya terpenuhi yang dipakai.</p>
          <div className="u-form-kisi" data-kolom="2">
            <Field label="Angka yang dibatasi" required error={galat.target || undefined}>
              <Pilihan id="aturan-target" tampilan={opsiTarget.length > 8 ? 'cari' : 'daftar'} options={opsiTarget} value={isi.target || null} onValueChange={(v) => set('target', v ?? '')} />
            </Field>
            <Field label="Batasnya" required>
              <SegmentedControl<'<=' | '>='>
                aria-label="Arah batas"
                value={isi.opBatas === '>=' || isi.opBatas === '>' ? '>=' : '<='}
                onValueChange={(v) => set('opBatas', v)}
                options={[
                  { value: '<=', label: 'Paling banyak' },
                  { value: '>=', label: 'Paling sedikit' },
                ]}
              />
            </Field>
          </div>
          <div className="u-aturan-tingkat" id="aturan-tabel">
            {isi.tabel.map((b, i) => (
              <div key={i} className="u-aturan-tingkat-baris" data-invalid={galat[`tabel.${i}`] ? '' : undefined}>
                <div className="u-aturan-tingkat-kepala">
                  <span className="u-aturan-tingkat-no">{i + 1}</span>
                  <div className="u-aturan-tingkat-nilai">
                    <span>{isi.opBatas === '>=' || isi.opBatas === '>' ? 'Paling sedikit' : 'Paling banyak'}</span>
                    <IsianAngka
                      value={b.nilai}
                      satuan={indTarget?.satuan}
                      label={`Batas tingkat ${i + 1}`}
                      onChange={(v) =>
                        set(
                          'tabel',
                          isi.tabel.map((x, j) => (j === i ? { ...x, nilai: v } : x)),
                        )
                      }
                    />
                    <span>bila</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    aria-label={`Hapus tingkat ${i + 1}`}
                    title={`Hapus tingkat ${i + 1}`}
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
            <div className="u-aturan-tingkat-baris" data-bawaan>
              <div className="u-aturan-tingkat-kepala">
                <span className="u-aturan-tingkat-no">{isi.tabel.length ? '–' : '1'}</span>
                <div className="u-aturan-tingkat-nilai">
                  <span>
                    {isi.tabel.length ? 'Selain itu' : 'Untuk semua'}, {isi.opBatas === '>=' || isi.opBatas === '>' ? 'paling sedikit' : 'paling banyak'}
                  </span>
                  <IsianAngka id="aturan-nilaiBatas" value={isi.nilaiBatas} satuan={indTarget?.satuan} label="Batas bawaan" onChange={(v) => set('nilaiBatas', v)} />
                </div>
              </div>
              {galat.nilaiBatas && (
                <p className="u-field-error" role="alert">
                  {galat.nilaiBatas}
                </p>
              )}
            </div>
            <div>
              <Button variant="soft" size="sm" disabled={isi.tabel.length >= 30} onClick={() => set('tabel', [...isi.tabel, tabelBaru()])}>
                <Plus /> Tambah tingkat bersyarat
              </Button>
            </div>
          </div>
          {kalimatAturan(draf, katalog.data, t?.judul) && (
            <p className="u-kondisi-kalimat">
              <ShieldCheck aria-hidden />
              <span>{kalimatAturan(draf, katalog.data, t?.judul)}</span>
            </p>
          )}
          <BagianKondisiSiapa titik={isi.titik} value={isi.kondisi} onValueChange={(v) => set('kondisi', v)} galat={galat.kondisi} contoh={contoh.berlakuBila} />
        </>
      )}
      {!isi.jenis && <Alert variant="warning">Pilih jenis aturan dulu.</Alert>}
    </div>,

    // 3 Identitas
    <div key="identitas" className="u-aturan-langkah">
      <div className="u-form-kisi" data-kolom="2">
        <Field label="Nama aturan" required className="u-form-lebar" error={galat.nama || undefined}>
          <Input id="aturan-nama" value={isi.nama} maxLength={200} placeholder={contoh.nama} onChange={(e) => set('nama', e.target.value)} />
        </Field>
        <Field label="Keterangan atau dasar aturan" optional className="u-form-lebar">
          <Textarea id="aturan-keterangan" rows={2} value={isi.keterangan} placeholder={contoh.dasar} onChange={(e) => set('keterangan', e.target.value)} />
        </Field>
      </div>
      <BagianForm
        judul="Berlaku untuk"
        keterangan={
          prodiTerbatas
            ? 'Anda hanya bisa mengatur prodi dalam unit Anda.'
            : t?.subjek === 'dosen'
              ? 'Prodi/fakultas = prodi mahasiswa yang dibimbing/diuji, bukan homebase dosen. Kosongkan untuk semua.'
              : t?.subjek === 'pegawai'
              ? 'Kosongkan untuk semua dosen dan tendik. Prodi/fakultas = homebase pegawai.'
              : 'Kosongkan untuk semua.'
        }
        ikon={<Users />}
      >
        {t?.subjek !== 'pendaftar' && t?.subjek !== 'akun' && (
          <>
            <Field label="Program studi" optional error={galat.prodi || undefined}>
              <PilihanBanyak
                id="aturan-prodi"
                options={prodiTerbatas ? opsiProdi.filter((p) => prodiSaya?.prodi?.includes(p.value)) : opsiProdi}
                value={isi.prodi}
                onValueChange={(v) => set('prodi', v)}
                placeholder={isi.prodi.length ? 'Tambah prodi' : 'Semua prodi'}
              />
            </Field>
            {lingkupFakultas ? (
              <Field label="Fakultas" description="Aturan fakultas hanya berlaku untuk mahasiswa/prodi fakultas ini dan tidak bisa diperluas ke fakultas lain.">
                <Input id="aturan-fakultas" value={opsiFakultas.find((f) => f.value === lingkupFakultas)?.label?.toString() ?? lingkupFakultas} disabled readOnly />
              </Field>
            ) : (
              <Field label="Fakultas" optional error={galat.fakultas || undefined}>
                <PilihanBanyak
                  id="aturan-fakultas"
                  options={opsiFakultas}
                  value={isi.fakultas}
                  onValueChange={(v) => set('fakultas', v)}
                  placeholder={isi.fakultas.length ? 'Tambah fakultas' : 'Semua fakultas'}
                />
              </Field>
            )}
          </>
        )}
        {t?.subjek === 'pegawai' ? (
          <CakupanPegawai isi={isi} set={set} galat={galat} />
        ) : t?.subjek === 'mahasiswa' || t?.subjek === 'kelas' ? (
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
        ) : null}
        <Field label="Kampus" optional className="u-form-lebar" description="Kode kampus (mis. 02 untuk kampus pengembangan). Kosong = semua kampus: kampus pengembangan mengikuti aturan universitas kecuali ada aturan khusus kampusnya." error={galat.kampus || undefined}>
          <IsianDaftar id="aturan-kampus" value={isi.kampus} onValueChange={(v) => set('kampus', v)} />
        </Field>
      </BagianForm>
      <BagianForm judul="Masa berlaku" keterangan="Kosongkan bila berlaku selama aturan aktif." ikon={<CalendarRange />}>
        <Field label="Periode" optional description="Kosong = semua periode." error={galat.tahun_id || undefined}>
          <PilihTahunAkademik id="aturan-tahun_id" value={isi.tahun_id || null} onValueChange={(v) => set('tahun_id', v ?? '')} placeholder="Semua periode" />
        </Field>
        <span aria-hidden />
        <Field label="Berlaku mulai" optional error={galat.berlaku_mulai || undefined}>
          <IsianWaktu id="aturan-berlaku_mulai" value={isi.berlaku_mulai} onValueChange={(v) => set('berlaku_mulai', v)} />
        </Field>
        <Field label="Berlaku sampai" optional error={galat.berlaku_selesai || undefined}>
          <IsianWaktu id="aturan-berlaku_selesai" value={isi.berlaku_selesai} akhirHari onValueChange={(v) => set('berlaku_selesai', v)} />
        </Field>
      </BagianForm>
      <details className="u-aturan-lanjutan" open={Boolean(galat.kode || galat.prioritas) || undefined}>
        <summary>Lanjutan: kode dan prioritas</summary>
        <div className="u-form-kisi" data-kolom="2">
          <Field label="Kode" optional error={galat.kode || undefined} description="Unik, untuk dirujuk aplikasi lain.">
            <Input id="aturan-kode" value={isi.kode} maxLength={60} placeholder={contoh.kode} onChange={(e) => set('kode', e.target.value)} />
          </Field>
          <Field label="Prioritas" optional error={galat.prioritas || undefined} description="Angka lebih besar diperiksa lebih dulu.">
            <Input id="aturan-prioritas" type="number" inputMode="numeric" value={isi.prioritas} onChange={(e) => set('prioritas', e.target.value)} />
          </Field>
        </div>
      </details>
    </div>,

    // 4 Dasar hukum (SK)
    <div key="sk" className="u-aturan-langkah">
      <p className="u-aturan-langkah-ket">
        {aktif
          ? 'Aturan ini sedang aktif. Perubahan menjadi versi baru dan wajib punya dasar SK: pilih SK yang sudah dilampirkan atau lampirkan SK baru.'
          : 'Setiap aturan wajib punya SK sebelum diajukan untuk disetujui. Tanpa SK aturan tetap draf dan tidak diperiksa. Langkah ini boleh dilewati bila Anda hanya menyimpan draf.'}
      </p>
      {skAda.length > 0 && (
        <div className="u-aturan-sk-ada">
          <p className="u-aturan-di-titik-label">SK yang sudah dilampirkan</p>
          <ul className="u-aturan-berkas">
            {skAda.map((l) => (
              <li key={l.id} data-pilih={isi.skLama === l.id || undefined}>
                <span className="u-aturan-berkas-ikon" data-jenis="sk" aria-hidden>
                  <FileBadge />
                </span>
                <div className="u-aturan-berkas-isi">
                  <strong>SK {l.nomor ?? ''}</strong>
                  <span>{[l.tanggal && formatWaktuAturan(l.tanggal), l.perihal].filter(Boolean).join(' · ')}</span>
                </div>
                {aktif && (
                  <Button
                    variant={isi.skLama === l.id ? 'soft' : 'outline'}
                    size="sm"
                    aria-pressed={isi.skLama === l.id}
                    onClick={() => setIsi((x) => ({ ...x, skLama: x.skLama === l.id ? '' : l.id, sk: null }))}
                  >
                    {isi.skLama === l.id ? (
                      <>
                        <Check /> Dipakai
                      </>
                    ) : (
                      'Pakai untuk versi ini'
                    )}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="u-aturan-sk-baru" id="aturan-sk">
        <p className="u-aturan-di-titik-label">{skAda.length ? 'Atau lampirkan SK baru' : 'Lampirkan SK'}</p>
        <IsianSK
          value={isi.sk}
          bolehBaru={false}
          onValueChange={(v) => {
            setIsi((x) => ({ ...x, sk: v, skLama: v ? '' : x.skLama }));
            setGalat((g) => (g.sk ? { ...g, sk: '' } : g));
          }}
          error={galat.sk || undefined}
        />
        <p className="u-aturan-sub">Bila SK belum tercatat di arsip, minta bagian persuratan mencatatnya dulu.</p>
      </div>
    </div>,

    // 5 Tinjau
    <div key="tinjau" className="u-aturan-langkah">
      <div className="u-aturan-tinjau-kalimat">
        <span className="u-aturan-ikon" data-jenis={isi.jenis || 'syarat'} aria-hidden>
          {IKON_JENIS[(isi.jenis || 'syarat') as JenisAturan]}
        </span>
        <div>
          <strong>{isi.nama || 'Tanpa nama'}</strong>
          <p>{kalimatAturan(draf, katalog.data, t?.judul) || 'Ketentuan belum lengkap.'}</p>
          <span className="u-aturan-sub">
            {[
              labelKategoriAturan(isi.kategori || 'umum'),
              ringkasCakupan(bodyAturan(isi, katalog.data, true).cakupan as CakupanAturan, (k) => opsiProdi.find((p) => p.value === k)?.label?.toString() ?? k),
              isi.tahun_id ? formatTahun(isi.tahun_id) : 'Semua periode',
            ].join(' · ')}
          </span>
        </div>
      </div>
      <div className="u-aturan-tinjau-sk" data-ada={adaSk || undefined}>
        <FileBadge aria-hidden />
        {skBaruLengkap ? (
          <span>
            SK {isi.sk!.nomor} · {formatWaktuAturan(isi.sk!.tanggal)} akan dilampirkan
          </span>
        ) : skAda.length ? (
          <span>{skLamaDipakai ? `Versi ini memakai SK ${skAda.find((l) => l.id === isi.skLama)?.nomor ?? ''}` : `${skAda.length} SK sudah dilampirkan`}</span>
        ) : (
          <span>Belum ada SK. Aturan disimpan sebagai draf dan belum diperiksa.</span>
        )}
        <Button variant="ghost" size="sm" onClick={() => setLangkah(4)}>
          {adaSk ? 'Ubah' : 'Lampirkan SK'}
        </Button>
      </div>
      <Field label="Bila aturan tidak terpenuhi" required>
        <div className="u-aturan-mode-kisi" role="radiogroup" aria-label="Mode">
          {(
            [
              { v: 'blokir', judul: 'Blokir', ikon: <Ban />, ket: 'Langkah ditolak. Pengguna melihat pesan dan tidak bisa melanjutkan.' },
              { v: 'peringatan', judul: 'Peringatan', ikon: <TriangleAlert />, ket: 'Langkah tetap jalan. Pengguna hanya melihat pesan peringatan.' },
            ] as const
          ).map((m) => (
            <button
              key={m.v}
              type="button"
              role="radio"
              aria-checked={isi.mode === m.v}
              className="u-aturan-mode-opsi"
              data-mode={m.v}
              data-pilih={isi.mode === m.v || undefined}
              onClick={() => set('mode', m.v)}
            >
              <span aria-hidden>{m.ikon}</span>
              <strong>{m.judul}</strong>
              <span>{m.ket}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field
        label={
          <>
            Pesan untuk pengguna <HitungKarakter nilai={isi.pesan} maks={500} />
          </>
        }
        optional
        description={`Kosongkan agar pesan dibuat otomatis dari kondisi, mis. ${contoh.pesan}`}
        error={galat.pesan || undefined}
      >
        <Textarea id="aturan-pesan" rows={2} value={isi.pesan} onChange={(e) => set('pesan', e.target.value)} />
      </Field>
      {ubah && aturan && (
        <Field
          label={aturan.status === 'aktif' ? 'Alasan perubahan' : 'Catatan perubahan'}
          required={aturan.status === 'aktif'}
          optional={aturan.status !== 'aktif'}
          description={aturan.status === 'aktif' ? 'Wajib (minimal 10 karakter): mengapa aturan aktif diubah. Masuk riwayat, usulan, dan pemeriksaan pedoman.' : 'Masuk riwayat aturan.'}
          error={galat.catatan || undefined}
        >
          <Input id="aturan-catatan" value={isi.catatan} maxLength={500} onChange={(e) => set('catatan', e.target.value)} />
        </Field>
      )}
      <UjiDiWizard titik={t} id={id} berubah={berubah || !id} tahunId={isi.tahun_id} sibuk={sibuk === 'uji'} simpanDulu={() => simpan('uji')} />
    </div>,
  ];

  const bolehAktifkan = !aktif && adaSk && aturan?.status !== 'diajukan';
  const bolehDarurat = !aktif && Boolean(saya.data?.boleh_darurat ?? (saya.data?.izin?.includes('aturan.darurat') || saya.data?.admin));
  return (
    <>
      {trigger && React.cloneElement(trigger as React.ReactElement<{ onClick?: () => void }>, { onClick: () => tutup(true) })}
      <Dialog
        open={isOpen}
        onOpenChange={tutup}
        size="xl"
        className="u-aturan-wizard"
        initialFocus={false}
        title={ubah && aturan ? `Ubah aturan: ${aturan.nama}` : isi.nama.trim() && langkah > 3 ? isi.nama : 'Tambah aturan'}
        description={
          aktif
            ? 'Aturan ini aktif. Perubahan menjadi versi baru dan tercatat di riwayat.'
            : ubah
              ? 'Perubahan tercatat di riwayat aturan.'
              : 'Aturan tersimpan sebagai draf sampai SK dilampirkan dan disetujui.'
        }
        footer={
          <>
            <span className="u-panel-form-status" data-berubah={berubah || undefined} aria-live="polite">
              {berubah ? 'Perubahan belum disimpan' : disimpanPada ? `Draf tersimpan ${disimpanPada.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : null}
            </span>
            {langkah > 0 ? (
              <Button variant="ghost" disabled={Boolean(sibuk)} onClick={() => keLangkah(langkah - 1)}>
                <ArrowLeft /> Kembali
              </Button>
            ) : (
              <Button variant="ghost" disabled={Boolean(sibuk)} onClick={() => tutup(false)}>
                Batal
              </Button>
            )}
            {!terakhir ? (
              <>
                {langkah === 4 && !aktif && !isi.sk && (
                  <Button variant="outline" disabled={Boolean(sibuk)} onClick={lanjut}>
                    Lewati langkah ini
                  </Button>
                )}
                <Button onClick={lanjut} disabled={!katalog.data}>
                  Lanjut <ArrowRight />
                </Button>
              </>
            ) : aktif ? (
              <Button loading={sibuk === 'aktif'} disabled={Boolean(sibuk)} onClick={() => void simpan('aktif')}>
                <Send /> Ajukan versi baru
              </Button>
            ) : (
              <>
                {bolehDarurat && (
                  <Button
                    variant="destructive-soft"
                    loading={sibuk === 'uji'}
                    disabled={Boolean(sibuk)}
                    onClick={async () => {
                      const r = await simpan('uji');
                      if (r) setDaruratUntuk(r);
                    }}
                  >
                    <Siren /> Jalur darurat
                  </Button>
                )}
                <Button variant={bolehAktifkan ? 'outline' : 'primary'} loading={sibuk === 'draf'} disabled={Boolean(sibuk)} onClick={() => void simpan('draf')}>
                  Simpan draf
                </Button>
                {bolehAktifkan && (
                  <Button loading={sibuk === 'aktif'} disabled={Boolean(sibuk)} onClick={() => void simpan('aktif')}>
                    <Send /> Ajukan untuk disetujui
                  </Button>
                )}
              </>
            )}
          </>
        }
      >
        <div className="u-aturan-wizard-kepala" ref={kepalaRef}>
          <Stepper
            steps={LANGKAH.map((l, i) => ({ title: l.judul, description: l.ket, error: Object.entries(galat).some(([k, v]) => v && langkahGalat(k) === i) }))}
            current={langkah}
            onStepClick={keLangkah}
          />
        </div>
        {galatSimpan != null && <GalatApi error={galatSimpan} title="Belum tersimpan" />}
        {isiLangkah[langkah]}
      </Dialog>
      {daruratUntuk && (
        <AktifkanDaruratAturan
          aturan={daruratUntuk}
          open
          onOpenChange={(o) => !o && setDaruratUntuk(null)}
          onSelesai={() => {
            const r = daruratUntuk as DetailAturan;
            setDaruratUntuk(null);
            setInner(false);
            onOpenChange?.(false);
            onTersimpan?.(r);
          }}
        />
      )}
      <ConfirmDialog
        open={tanyaTutup}
        onOpenChange={setTanyaTutup}
        title="Tutup tanpa menyimpan?"
        description="Isian yang Anda ubah belum disimpan dan akan hilang."
        confirmLabel="Buang perubahan"
        cancelLabel="Lanjut mengisi"
        tone="warning"
        onConfirm={() => {
          setTanyaTutup(false);
          setInner(false);
          onOpenChange?.(false);
        }}
      />
    </>
  );
}

/** "Berlaku untuk siapa" pada batas waktu/nilai: kondisi opsional dengan teks awam. */
function BagianKondisiSiapa({
  titik,
  value,
  onValueChange,
  galat,
  contoh,
}: {
  titik: string;
  value: GrupKondisi | null;
  onValueChange: (v: GrupKondisi | null) => void;
  galat?: string;
  contoh: string;
}) {
  return (
    <div className="u-aturan-siapa">
      <p className="u-aturan-di-titik-label">Berlaku untuk siapa</p>
      <p className="u-aturan-sub">Kosongkan bila berlaku untuk semua. {contoh}</p>
      <PenyusunKondisi id="aturan-kondisi" titik={titik} opsional value={value} onValueChange={onValueChange} galat={galat || undefined} teksKosong="Berlaku untuk semua orang dalam cakupan." />
    </div>
  );
}

/** Subjek uji menurut titik: kunci body /uji dan isiannya. */
function subjekUji(t?: TitikAturan): { kunci: string; label: string } {
  switch (t?.subjek) {
    case 'pegawai':
      return { kunci: 'pegawai_id', label: 'Pegawai contoh' };
    case 'kelas':
      return { kunci: 'kode_prodi', label: 'Program studi contoh' };
    case 'pendaftar':
      return { kunci: 'pendaftar', label: 'Nomor pendaftaran contoh' };
    case 'akun':
      return { kunci: 'username', label: 'Username contoh' };
    case 'dosen':
      return { kunci: 'dosen', label: 'Dosen contoh' };
    case 'umum':
      return { kunci: '', label: '' };
    default:
      return { kunci: 'nim', label: 'Mahasiswa contoh' };
  }
}

/** Uji di langkah Tinjau: simpan draf dulu bila perlu, lalu POST /v1/aturan/{id}/uji ke satu contoh subjek. */
function UjiDiWizard({
  titik: t,
  id,
  berubah,
  tahunId,
  sibuk,
  simpanDulu,
}: {
  titik?: TitikAturan;
  id: string | null;
  berubah: boolean;
  tahunId: string;
  sibuk: boolean;
  simpanDulu: () => Promise<Aturan | null>;
}) {
  const siakad = useSiakad();
  const katalog = useKatalogAturan();
  const peta = petaIndikator(katalog.data);
  const { prodi: opsiProdi } = useNamaProdi();
  const s = subjekUji(t);
  const [subjek, setSubjek] = React.useState('');
  const [nimDosen, setNimDosen] = React.useState('');
  const [konteks, setKonteks] = React.useState<Record<string, string>>({});
  const [waktu, setWaktu] = React.useState('');
  const [hasil, setHasil] = React.useState<HasilPeriksaAturan | null>(null);
  const [galat, setGalat] = React.useState<unknown>(null);
  const [jalan, setJalan] = React.useState(false);
  const uji = async () => {
    setGalat(null);
    setHasil(null);
    let idUji = id;
    if (!idUji || berubah) {
      const r = await simpanDulu();
      if (!r) return;
      idUji = r.id;
    }
    setJalan(true);
    try {
      const body: Record<string, unknown> = { tahun_id: tahunId || undefined, waktu: waktu || undefined };
      if (s.kunci) body[s.kunci] = subjek;
      if (s.kunci === 'dosen' && nimDosen) body.nim = nimDosen;
      const k = Object.fromEntries(
        Object.entries(konteks)
          .filter(([, v]) => v !== '')
          .map(([kk, v]) => [kk, peta.get(kk)?.tipe === 'benar_salah' ? v === '1' : peta.get(kk)?.tipe === 'angka' ? Number(v) : v]),
      );
      if (Object.keys(k).length) body.konteks = k;
      setHasil((await siakad.request<HasilPeriksaAturan>({ method: 'POST', path: `/v1/aturan/${idUji}/uji`, body })).data);
    } catch (e) {
      setGalat(e);
    } finally {
      setJalan(false);
    }
  };
  return (
    <section className="u-aturan-uji-wizard" aria-label="Uji aturan">
      <p className="u-aturan-di-titik-label">
        <FlaskConical aria-hidden /> Uji ke contoh
      </p>
      <p className="u-aturan-sub">Lihat hasilnya untuk satu orang sebelum diajukan. Uji tidak mengubah data apa pun{!id || berubah ? '; isian disimpan sebagai draf dulu' : ''}.</p>
      <div className="u-aturan-uji-baris">
        {s.kunci === 'nim' && <PilihEntitas jenis="mahasiswa" value={subjek || null} onValueChange={(v) => setSubjek(v ?? '')} aria-label={s.label} placeholder="Cari NIM atau nama mahasiswa" />}
        {s.kunci === 'pegawai_id' && <PilihEntitas jenis="pegawai" value={subjek || null} onValueChange={(v) => setSubjek(v ?? '')} aria-label={s.label} placeholder="Cari nama atau ID pegawai" />}
        {s.kunci === 'dosen' && (
          <>
            <PilihEntitas jenis="dosen" value={subjek || null} onValueChange={(v) => setSubjek(v ?? '')} aria-label={s.label} placeholder="Dosen yang ditetapkan" />
            <PilihEntitas jenis="mahasiswa" value={nimDosen || null} onValueChange={(v) => setNimDosen(v ?? '')} aria-label="Mahasiswa yang dibimbing/diuji" placeholder="Untuk mahasiswa (opsional)" />
          </>
        )}
        {s.kunci === 'kode_prodi' && (
          <Pilihan tampilan="cari" options={opsiProdi} value={subjek || null} onValueChange={(v) => setSubjek(v ?? '')} aria-label={s.label} placeholder="Pilih program studi" />
        )}
        {(s.kunci === 'pendaftar' || s.kunci === 'username') && (
          <Input value={subjek} onChange={(e) => setSubjek(e.target.value.trim())} aria-label={s.label} placeholder={s.kunci === 'username' ? 'Username akun' : 'Nomor pendaftaran'} />
        )}
        <IsianWaktu value={waktu} onValueChange={setWaktu} />
        <Button variant="outline" onClick={() => void uji()} loading={jalan || sibuk} disabled={Boolean(s.kunci) && !subjek}>
          <FlaskConical /> {!id || berubah ? 'Simpan draf & uji' : 'Uji'}
        </Button>
      </div>
      <p className="u-aturan-sub">Isi tanggal bila ingin menguji seolah-olah pada waktu itu; kosong berarti sekarang.</p>
      {(t?.konteks.length ?? 0) > 0 && (
        <div className="u-form-kisi" data-kolom="3">
          {t!.konteks.map((kk) => {
            const ind = peta.get(kk);
            const opsi = ind?.opsi?.map((o) => ({ value: String(o.nilai), label: o.label }));
            return (
              <Field key={kk} label={ind?.judul ?? kk} optional description="Data yang dikirim langkah ini.">
                {ind?.tipe === 'benar_salah' || opsi ? (
                  <Pilihan
                    tampilan="daftar"
                    options={
                      opsi ?? [
                        { value: '1', label: 'Ya' },
                        { value: '0', label: 'Tidak' },
                      ]
                    }
                    value={konteks[kk] || null}
                    onValueChange={(v) => setKonteks((x) => ({ ...x, [kk]: v ?? '' }))}
                  />
                ) : (
                  <Input type={ind?.tipe === 'angka' ? 'number' : 'text'} value={konteks[kk] ?? ''} onChange={(e) => setKonteks((x) => ({ ...x, [kk]: e.target.value }))} />
                )}
              </Field>
            );
          })}
        </div>
      )}
      {Boolean(galat) && <GalatApi error={galat} title="Uji gagal" />}
      {hasil && <HasilPeriksaAturanPanel hasil={hasil} />}
    </section>
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
        <Alert variant={a.status === 'draf' || a.status === 'aktif' ? 'warning' : 'neutral'} title={a.status === 'aktif' ? 'Belum ada SK, lampirkan' : 'Belum ada SK'}>
          {a.status === 'aktif'
            ? 'Aturan bawaan ini sudah aktif dan ditegakkan, tetapi belum punya dasar hukum. Lampirkan SK dari registri SK (Lampirkan SK di bawah); SK-nya ikut terdaftar di SPMI.'
            : 'Aturan hanya bisa diajukan untuk disetujui setelah SK dilampirkan.'}
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
  const kosong = { berkas_id: '', jenis: 'sk', nomor: '', tanggal: '', perihal: '', sk_id: '' };
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
        // SK dipilih dari registri SK tunggal (berkasnya dari registri, tidak diunggah ulang); lampiran lain diunggah.
        if (isi.jenis === 'sk' && !isi.sk_id) g.sk_id = 'Pilih SK dari registri, atau ajukan pencatatannya bila belum ada.';
        if (isi.jenis !== 'sk' && !isi.berkas_id) g.berkas_id = 'Unggah atau pilih berkas.';
        setGalat(g);
        if (Object.keys(g).length) return 'Periksa isian yang ditandai.';
        try {
          await siakad.request({
            method: 'POST',
            path: `/v1/aturan/${aturanId}/lampiran`,
            body: isi.jenis === 'sk' ? { sk_id: isi.sk_id, jenis: 'sk' } : { berkas_id: isi.berkas_id, jenis: isi.jenis, nomor: isi.nomor.trim() || null, tanggal: isi.tanggal || null, perihal: isi.perihal.trim() || null },
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
        {isi.jenis === 'sk' ? (
          <PilihSK
            className="u-form-lebar"
            value={isi.sk_id || null}
            onValueChange={(id) => set('sk_id', id ?? '')}
            jenis="aturan"
            catatSekarang={{ label: 'Catat SK aturan sekarang', isian: { jenis: 'aturan' } }}
            label="SK dari registri"
            required
            error={galat.sk_id || galat.nomor || undefined}
          />
        ) : (
          <>
            <Field label="Berkas" required className="u-form-lebar" error={galat.berkas_id || undefined}>
              <PilihBerkas value={isi.berkas_id || null} onValueChange={(v) => set('berkas_id', v ?? '')} accept=".pdf,.jpg,.jpeg,.png" invalid={Boolean(galat.berkas_id)} />
            </Field>
            <Field label="Nomor" optional error={galat.nomor || undefined}>
              <Input value={isi.nomor} maxLength={100} placeholder="mis. 123/UNIPO/SK/XII/2026" onChange={(e) => set('nomor', e.target.value)} />
            </Field>
            <Field label="Tanggal" optional error={galat.tanggal || undefined}>
              <IsianTanggal value={isi.tanggal || null} onValueChange={(v) => set('tanggal', v)} />
            </Field>
            <Field label="Perihal" optional className="u-form-lebar">
              <Input value={isi.perihal} maxLength={255} placeholder="mis. Penetapan aturan yang dilampirkan" onChange={(e) => set('perihal', e.target.value)} />
            </Field>
          </>
        )}
      </BagianForm>
    </PanelForm>
  );
}

// ================================================================ Pengecualian (dispensasi)
const LABEL_SUBJEK: Record<PengecualianAturan['subjek_jenis'], string> = { mahasiswa: 'Mahasiswa', dosen: 'Dosen', prodi: 'Program studi', pegawai: 'Pegawai', pendaftar: 'Pendaftar', akun: 'Akun' };

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
              {p.status === 'diajukan' ? (
                <Badge variant="info">Menunggu keputusan</Badge>
              ) : p.status === 'ditolak' ? (
                <Badge variant="danger">Ditolak</Badge>
              ) : (
                <Badge variant={p.berlaku ? 'success' : 'neutral'}>{p.berlaku ? 'Berlaku' : 'Kedaluwarsa'}</Badge>
              )}
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
      {a.sifat === 'ketat' && (
        <Alert icon={<Lock />} title="Aturan ketat">
          Aturan ini tidak bisa dikecualikan untuk siapa pun. Untuk aturan keuangan, pelonggaran hanya lewat dispensasi pembayaran resmi.
        </Alert>
      )}
      {a.boleh_atur && a.sifat !== 'ketat' && (
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
          <PilihEntitas key={isi.subjek_jenis} jenis={isi.subjek_jenis as 'mahasiswa' | 'dosen' | 'prodi' | 'pegawai'} value={isi.subjek || null} onValueChange={(v) => set('subjek', v ?? '')} />
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
          <Textarea rows={3} value={isi.alasan} placeholder="mis. Sakit dengan surat dokter, disetujui pimpinan yang berwenang." onChange={(e) => set('alasan', e.target.value)} />
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
                {namaPenyetuju(r)} · {formatWaktuAturan(r.waktu, { jam: true })}
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
export function HasilPeriksaAturanPanel({
  hasil,
  indikator = true,
  subjek,
  className,
}: {
  hasil: HasilPeriksaAturan;
  indikator?: boolean;
  /** Subjek untuk tombol "Ajukan pengecualian" pada aturan yang boleh dikecualikan. */
  subjek?: AjukanPengecualianAturanProps['subjek'];
  className?: string;
}) {
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
      <PesanAturanDilanggar hasil={hasil} subjek={subjek} />
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

// ================================================================ Uji
/** Uji satu aturan (termasuk draf) terhadap mahasiswa contoh dan waktu tertentu (POST /v1/aturan/{id}/uji). */
export function UjiAturan({ aturan: a }: { aturan: Aturan }) {
  const siakad = useSiakad();
  const katalog = useKatalogAturan();
  const t = katalog.data?.titik.find((x) => x.kode === a.titik);
  const peta = petaIndikator(katalog.data);
  const kelas = t?.subjek === 'kelas';
  const pegawai = t?.subjek === 'pegawai';
  const subjekLain = t?.subjek === 'pendaftar' || t?.subjek === 'akun';
  const dosenT = t?.subjek === 'dosen';
  const [dosen, setDosen] = React.useState('');
  const [nim, setNim] = React.useState('');
  const [prodi, setProdi] = React.useState('');
  const [tahun, setTahun] = React.useState(a.tahun_id ?? '');
  const [waktu, setWaktu] = React.useState('');
  const [konteks, setKonteks] = React.useState<Record<string, string>>({});
  const [hasil, setHasil] = React.useState<HasilPeriksaAturan | null>(null);
  const [galat, setGalat] = React.useState<unknown>(null);
  const [jalan, setJalan] = React.useState(false);
  const { prodi: opsiProdi } = useNamaProdi();
  const siap = kelas ? Boolean(prodi) : t?.subjek === 'umum' ? true : dosenT ? Boolean(dosen) : Boolean(nim);
  const teksKonteks = (k: string) => peta.get(k)?.tipe !== 'angka';
  const uji = async () => {
    setJalan(true);
    setGalat(null);
    try {
      const body: Record<string, unknown> = { tahun_id: tahun || undefined, waktu: waktu || undefined };
      if (kelas) body.kode_prodi = prodi;
      else if (dosenT) {
        body.dosen = dosen;
        if (nim) body.nim = nim;
      } else if (subjekLain) body[subjekUji(t).kunci] = nim;
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
          ) : dosenT ? (
            <>
              <Field label="Dosen yang ditetapkan" required>
                <PilihEntitas jenis="dosen" value={dosen || null} onValueChange={(v) => setDosen(v ?? '')} />
              </Field>
              <Field label="Untuk mahasiswa" optional description="Prodi/fakultas mahasiswa menentukan aturan fakultas yang berlaku.">
                <PilihEntitas jenis="mahasiswa" value={nim || null} onValueChange={(v) => setNim(v ?? '')} />
              </Field>
            </>
          ) : subjekLain ? (
            <Field label={subjekUji(t).label} required>
              <Input value={nim} onChange={(e) => setNim(e.target.value.trim())} />
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
              {peta.get(k)?.tipe === 'benar_salah' || peta.get(k)?.opsi?.length ? (
                <Pilihan
                  options={
                    peta.get(k)?.opsi?.map((o) => ({ value: String(o.nilai), label: o.label })) ?? [
                      { value: '1', label: 'Ya' },
                      { value: '0', label: 'Tidak' },
                    ]
                  }
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
  konteks?: Record<string, number | string>;
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
  const bawaan = h.bawaan ?? [];
  const lulus = aturan.filter((a) => !langgar.has(a.id)).length + bawaan.filter((b) => b.terpenuhi).length;
  const total = aturan.length + bawaan.length;
  const w = h.batas?.waktu;
  const pos = w ? posisiBatasWaktu(w) : null;
  return (
    <Card className={cn('u-syarat-saya', className)} data-boleh={h.boleh || undefined}>
      <div className="u-syarat-saya-kepala">
        <div>
          <p className="u-syarat-saya-judul">{judul ?? t?.judul ?? h.judul ?? titik}</p>
          <p className="u-syarat-saya-status">
            {h.boleh ? <CircleCheck aria-hidden /> : <CircleX aria-hidden />}
            {h.boleh ? 'Anda memenuhi syarat' : `${Math.max(1, total - lulus)} syarat belum terpenuhi`}
          </p>
        </div>
        {total > 0 && <ProgressLingkar nilai={lulus} total={total} />}
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
      {total === 0 ? (
        <p className="u-syarat-saya-kosong">Tidak ada syarat khusus untuk langkah ini.</p>
      ) : (
        <ul className="u-syarat-saya-daftar">
          {bawaan.map((b) => (
            <li key={`bawaan-${b.kode}`} data-status={b.terpenuhi ? 'lulus' : 'gagal'}>
              <span className="u-syarat-saya-ikon" aria-hidden>
                {b.terpenuhi ? <CircleCheck /> : <CircleX />}
              </span>
              <div>
                <strong>{b.nama}</strong>
                <p>{b.terpenuhi ? 'Terpenuhi (syarat dasar SIAKAD).' : b.pesan}</p>
              </div>
              {!b.terpenuhi && <Badge variant="danger">Belum</Badge>}
            </li>
          ))}
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
const SINGKATAN_PERAN = new Set(['baak', 'bauk', 'bak', 'pmb', 'lppm', 'lp2m', 'sdm', 'spmi', 'lpm', 'wr', 'it', 'tu', 'pkm']);
/** Kode peran menjadi label terbaca bila nama peran tidak bisa diambil, mis. "kepala-baak" → "Kepala BAAK". */
export function labelKodePeran(kode: string): string {
  const t = kode
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => (SINGKATAN_PERAN.has(w.toLowerCase()) ? w.toUpperCase() : w));
  const kal = t.join(' ');
  return kal.charAt(0).toUpperCase() + kal.slice(1);
}
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
  const peran = useSiakadQuery<Array<{ kode: string; nama: string }>>(
    ['rbac', 'peran'],
    (s, signal) => s.request<Array<{ kode: string; nama: string }>>({ method: 'GET', path: '/v1/rbac/peran', query: { per_page: 100 } }, { signal }),
    { staleTime: 5 * 60_000 },
  );
  const saya = useAturanSaya();
  const katalog = useKatalogAturan();
  const [ubah, setUbah] = React.useState<PengaturKategori | null>(null);
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  if (!q.data) return <Skeleton height={200} className={className} />;
  const judulTitik = (k: string | null) => (k ? (katalog.data?.titik.find((t) => t.kode === k)?.judul ?? k) : null);
  const namaPeran = new Map((peran.data ?? []).map((p) => [p.kode, p.nama]));
  const daftarPengatur = (rows: PengaturBaris[]) => {
    const pr = rows.filter((p) => p.jenis === 'peran');
    const iz = rows.filter((p) => p.jenis === 'izin');
    return (
      <div className="u-aturan-pengatur-daftar">
        {pr.length > 0 && (
          <div className="u-aturan-pengatur-tag">
            {pr.map((p) => (
              <Tag key={p.kode} size="sm" icon={<Users />} title={p.keterangan ?? undefined}>
                {namaPeran.get(p.kode) ?? labelKodePeran(p.kode)}
              </Tag>
            ))}
          </div>
        )}
        {iz.length > 0 && (
          <span className="u-aturan-sub">
            {pr.length ? 'Juga pemegang izin' : 'Pemegang izin'} {iz.map((p) => p.kode).join(', ')}
          </span>
        )}
      </div>
    );
  };
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
                daftarPengatur(umum)
              ) : (
                <p className="u-aturan-sub">
                  Bawaan: pemegang izin <code>{k.bawaan.kode}</code>
                </p>
              )}
              {[...perTitik].map(([titik, rows]) => (
                <div key={titik} className="u-aturan-pengatur-titik">
                  <span>Khusus {judulTitik(titik)}</span>
                  {daftarPengatur(rows)}
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
    (s, signal) => s.request<Array<{ kode: string; nama: string }>>({ method: 'GET', path: '/v1/rbac/peran', query: { per_page: 100 } }, { signal }),
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

/** Hak akun di alur persetujuan; dibaca dari GET /v1/aturan/saya (bentuk SIAKAD terbaru, dengan cadangan `izin`). */
function hakAlur(saya?: AturanSaya | null, a?: DetailAturan | null) {
  const izin = saya?.izin ?? [];
  return {
    setujui: Boolean(a?.boleh_setujui ?? saya?.boleh_setujui ?? izin.includes('aturan.setujui')),
    telaah: Boolean(a?.boleh_telaah ?? saya?.boleh_telaah ?? izin.includes('aturan.telaah')),
  };
}

const JUDUL_LANGKAH_ALUR: Record<string, string> = {
  diajukan: 'Diajukan untuk disetujui',
  disetujui: 'Disetujui',
  dikembalikan: 'Dikembalikan untuk diperbaiki',
  ditelaah: 'Telaah SPMI',
  diaktifkan: 'Diaktifkan',
};

/** SK aturan: nomor, tanggal, dan tempat simpannya (berkas unit, SPMI) bila server mengirimnya. */
function DasarHukumAturan({ a }: { a: DetailAturan }) {
  const sk = a.lampiran.filter((l) => l.jenis === 'sk' && !l.dilepas_at);
  if (!sk.length) return <span className="u-aturan-sub">{a.bawaan ? 'Aturan bawaan, menunggu SK' : 'Belum ada SK'}</span>;
  const spmi = (a.spmi ?? []).some((d) => d.status !== 'dicabut');
  return (
    <ul className="u-aturan-dasar">
      {sk.map((l) => {
        const unit = l.lokasi?.unit_nama ?? (l.lokasi?.unit ? l.lokasi.unit.toUpperCase() : null);
        return (
          <li key={l.id}>
            <strong>SK {l.nomor ?? ''}</strong>
            {l.tanggal && <span> · {formatWaktuAturan(l.tanggal)}</span>}
            {(unit || spmi) && <span className="u-aturan-dasar-simpan">{[unit ? `SK tersimpan di Berkas ${unit}` : null, spmi ? 'terdaftar di SPMI' : null].filter(Boolean).join(' · ')}</span>}
          </li>
        );
      })}
    </ul>
  );
}

/** Detail aturan dengan aksi ajukan/setujui/aktifkan/nonaktifkan/hapus/pulihkan dan tab ketentuan, SK, dispensasi, uji, riwayat. */
export function PanelDetailAturan({ id, onUbah, onDihapus }: PanelDetailAturanProps) {
  const q = useAturan(id);
  const saya = useAturanSaya();
  const siakad = useSiakad();
  const toast = useToast();
  const { nama } = useNamaProdi();
  const [tembus, setTembus] = React.useState<TulisTembusAturan | null>(null);
  const [konfirmasi, setKonfirmasi] = React.useState<null | 'aktifkan' | 'nonaktifkan' | 'hapus' | 'ajukan'>(null);
  const [alur, setAlur] = React.useState<null | 'setujui' | 'kembalikan' | 'tolak' | 'telaah' | 'sahkan' | 'cabut'>(null);
  const [panelAjukan, setPanelAjukan] = React.useState(false);
  const [catatan, setCatatan] = React.useState('');
  const riwayat = useRiwayatAturan(q.data?.boleh_atur || q.data?.boleh_setujui || q.data?.boleh_telaah ? id : null);
  React.useEffect(() => setTembus(null), [id]);
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  const a = q.data;
  if (!a) return <Skeleton height={320} />;
  const hak = hakAlur(saya.data, a);
  const adaSk = a.lampiran.some((l) => l.jenis === 'sk' && !l.dilepas_at);
  const dihapus = Boolean(a.dihapus_at);
  const usulan = a.usulan ?? null;
  const diajukan = (a.status === 'diajukan' || usulan?.status === 'diajukan') && usulan?.jenis !== 'darurat';
  // SIAKAD dengan dasar SK (docs/ATURAN-SK.md): SK induk dari Registri SK dipilih saat mengajukan; lampiran SK tidak wajib.
  const pakaiDasarSk = a.dasar_sk !== undefined;
  const adaDasar = adaSk || pakaiDasarSk;
  const bisaAjukan = (a.status === 'draf' || a.status === 'dikembalikan') && adaDasar && !diajukan;
  const mintaAjukan = () => (pakaiDasarSk ? setPanelAjukan(true) : setKonfirmasi('ajukan'));
  const usulanDraf = a.status === 'aktif' && usulan?.jenis === 'ubah' && usulan.status === 'draf';
  // SIAKAD belum mengirim hak jalur darurat; admin aturan ditampilkan tombolnya dan server yang memutuskan (403 bila tidak berhak).
  const bolehDarurat = Boolean(a.boleh_darurat ?? saya.data?.boleh_darurat ?? (saya.data?.izin?.includes('aturan.darurat') || saya.data?.admin));
  const aksi = async (jenis: 'aktifkan' | 'nonaktifkan' | 'hapus' | 'pulihkan' | 'ajukan') => {
    const body = jenis === 'hapus' ? { alasan: catatan || null } : { catatan: catatan || null };
    let r: { data: DetailAturan & { tulis_tembus?: TulisTembusAturan } };
    try {
      r = await siakad.request<DetailAturan & { tulis_tembus?: TulisTembusAturan }>({ method: 'POST', path: `/v1/aturan/${a.id}/${jenis}`, body });
    } catch (e) {
      // SIAKAD tanpa alur persetujuan: ajukan = aktifkan langsung.
      if (jenis !== 'ajukan' || (e as { status?: number }).status !== 404) throw e;
      r = await siakad.request<DetailAturan & { tulis_tembus?: TulisTembusAturan }>({ method: 'POST', path: `/v1/aturan/${a.id}/aktifkan`, body });
      jenis = 'aktifkan';
    }
    invalidateSiakad('aturan');
    setCatatan('');
    if (jenis === 'aktifkan') setTembus(r.data?.tulis_tembus ?? null);
    toast.add({
      title: { aktifkan: 'Aturan diaktifkan', nonaktifkan: 'Aturan dinonaktifkan', hapus: 'Aturan dipindah ke sampah', pulihkan: 'Aturan dipulihkan sebagai draf', ajukan: 'Diajukan untuk disetujui' }[
        jenis
      ],
      type: 'success',
    });
    if (jenis === 'hapus') onDihapus?.();
  };
  const kirimAlur = async (jenis: 'setujui' | 'kembalikan' | 'tolak' | 'telaah' | 'sahkan' | 'cabut') => {
    // Jalur darurat disahkan lewat /setujui dan dicabut lewat /kembalikan (usulan jenis darurat).
    const path = jenis === 'sahkan' ? 'setujui' : jenis === 'cabut' ? 'kembalikan' : jenis;
    await siakad.request({ method: 'POST', path: `/v1/aturan/${a.id}/${path}`, body: { catatan: catatan.trim() || null } });
    invalidateSiakad('aturan');
    setCatatan('');
    setAlur(null);
    toast.add({ title: JUDUL_TOAST_ALUR[jenis], type: 'success' });
  };
  const menu = a.bawaan ? [] : [{ label: 'Pindah ke sampah', icon: <Trash2 />, onSelect: () => setKonfirmasi('hapus'), destructive: true }];
  const sumberAlur: LangkahPersetujuanAturan[] =
    a.persetujuan ??
    (riwayat.data ?? [])
      .filter((r) => ['diajukan', 'ditelaah', 'disetujui', 'dikembalikan'].includes(r.aksi))
      .map((r) => ({ aksi: r.aksi, oleh: r.oleh, catatan: r.catatan, waktu: r.waktu, versi: r.versi }))
      .reverse();
  const langkahAlur = sumberAlur.map((l) => ({
    aksi: l.aksi,
    judul: `${JUDUL_LANGKAH_ALUR[l.aksi] ?? l.aksi}${l.versi ? ` (versi ${l.versi})` : ''}`,
    status: ['diajukan', 'disetujui', 'dikembalikan', 'ditelaah'].includes(l.aksi) ? l.aksi : null,
    catatan: l.catatan ?? null,
    berkas: null,
    oleh: l.oleh ?? 'Sistem',
    nama_oleh: l.nama_oleh ? `${l.nama_oleh}${l.peran ? ` (${l.peran})` : ''}` : null,
    waktu: l.waktu,
  }));
  const kembali =
    usulan?.status === 'dikembalikan' && usulan.catatan_putusan
      ? { oleh: usulan.diputus_oleh ?? null, nama_oleh: null as string | null, catatan: usulan.catatan_putusan }
      : [...sumberAlur].reverse().find((l) => l.aksi === 'dikembalikan');
  const telaah = a.telaah ?? usulan?.telaah ?? [];
  return (
    <div className="u-aturan-detail">
      <div className="u-aturan-detail-kepala">
        <span className="u-aturan-ikon" data-jenis={a.jenis} aria-hidden>
          {IKON_JENIS[a.jenis]}
        </span>
        <div className="u-aturan-detail-judul">
          <div className="u-aturan-detail-lencana">
            {a.bawaan && <Badge variant="info">Bawaan</Badge>}
            <StatusAturanBadge status={a.status === 'draf' && usulan?.status === 'diajukan' ? 'diajukan' : a.status} dihapus={dihapus} />
            {a.dasar_sk && (a.dasar_sk.status !== 'belum' || a.status === 'aktif') && <LencanaDasarSk dasar={a.dasar_sk} />}
            {a.status === 'aktif' && usulan?.status === 'diajukan' && <Badge variant="info">Versi baru diajukan</Badge>}
            {usulan?.status === 'dikembalikan' && <Badge variant="danger">Dikembalikan</Badge>}
            <DaruratAturanBadge aturan={a} />
            <ModeAturanBadge mode={a.mode} />
            <SifatAturanBadge sifat={a.sifat} />
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
      {/* Dasar pedoman (modul Pedoman): pasal dasar, "Berbeda dari pedoman", atau "Belum diatur pedoman". */}
      <DasarPedoman targetJenis="mesin_aturan" targetRef={a.id} />

      {(a.boleh_atur || ((diajukan || a.darurat) && hak.setujui) || (diajukan && hak.telaah)) && !dihapus && (
        <div className="u-aturan-detail-aksi">
          {a.darurat && (a.boleh_setujui ?? hak.setujui) && (
            <>
              <Button onClick={() => setAlur('sahkan')}>
                <BadgeCheck /> Sahkan
              </Button>
              <Button variant="outline" onClick={() => setAlur('cabut')}>
                <CircleX /> Cabut
              </Button>
            </>
          )}
          {diajukan && hak.setujui && (
            <>
              <Button onClick={() => setAlur('setujui')}>
                <BadgeCheck /> Setujui
              </Button>
              <Button variant="outline" onClick={() => setAlur('kembalikan')}>
                <Undo2 /> Kembalikan
              </Button>
              {a.boleh_tolak && (
                <Button variant="destructive-soft" onClick={() => setAlur('tolak')}>
                  <CircleX /> Tolak
                </Button>
              )}
            </>
          )}
          {diajukan && hak.telaah && (
            <Button variant="outline" onClick={() => setAlur('telaah')}>
              <MessageSquareText /> Telaah SPMI
            </Button>
          )}
          {a.boleh_atur && (
            <>
              {usulanDraf ? (
                <Button onClick={mintaAjukan}>
                  <Send /> Ajukan versi baru
                </Button>
              ) : diajukan ? null : a.status === 'draf' || a.status === 'dikembalikan' ? (
                <Button onClick={mintaAjukan} disabled={!bisaAjukan} title={adaDasar ? undefined : 'Lampirkan SK dulu'}>
                  <Send /> {pakaiDasarSk ? 'Ajukan untuk divalidasi' : 'Ajukan untuk disetujui'}
                </Button>
              ) : a.status === 'aktif' ? (
                <Button variant="outline" onClick={() => setKonfirmasi('nonaktifkan')}>
                  <PowerOff /> Nonaktifkan
                </Button>
              ) : a.status === 'nonaktif' ? (
                <Button variant="outline" onClick={mintaAjukan} disabled={!adaDasar}>
                  <Send /> Ajukan aktif kembali
                </Button>
              ) : null}
              {bolehDarurat && a.status !== 'aktif' && !a.darurat && !dihapus && (
                <AktifkanDaruratAturan
                  aturan={a}
                  onSelesai={q.refetch}
                  trigger={
                    <Button variant="destructive-soft">
                      <Siren /> Aktifkan lewat jalur darurat
                    </Button>
                  }
                />
              )}
              {!diajukan && (
                <Button variant="outline" onClick={() => onUbah?.(a)}>
                  <Pencil /> Ubah
                </Button>
              )}
              {menu.length > 0 && (
                <Menu
                  trigger={
                    <Button variant="ghost" iconOnly aria-label="Aksi lain">
                      <MoreHorizontal />
                    </Button>
                  }
                  items={menu}
                />
              )}
            </>
          )}
        </div>
      )}
      {a.bawaan && a.boleh_atur && !dihapus && <p className="u-aturan-sub u-aturan-bawaan-catatan">Aturan bawaan tidak bisa dihapus; nonaktifkan atau ubah isinya.</p>}
      {a.boleh_ajukan_pengecualian && a.status === 'aktif' && !dihapus && (
        <div className="u-aturan-detail-aksi">
          <AjukanPengecualianAturan
            aturan={a}
            trigger={
              <Button variant="soft" size="sm">
                <FileBadge /> Ajukan pengecualian
              </Button>
            }
          />
        </div>
      )}
      {dihapus && a.boleh_atur && saya.data?.admin && (
        <div className="u-aturan-detail-aksi">
          <Button variant="outline" onClick={() => aksi('pulihkan').catch((e) => toast.add({ title: 'Gagal memulihkan', description: pesanGalat(e), type: 'error' }))}>
            <ArchiveRestore /> Pulihkan
          </Button>
        </div>
      )}
      {a.dasar_sk && (a.dasar_sk.status === 'tidak_berlaku' || a.dasar_sk.status === 'diubah') && a.status === 'aktif' && (
        <Alert variant={a.dasar_sk.status === 'tidak_berlaku' ? 'danger' : 'warning'} title={a.dasar_sk.status === 'tidak_berlaku' ? 'Dasar SK tidak berlaku lagi' : 'SK dasar telah diubah'}>
          SK {a.dasar_sk.sk?.nomor} {a.dasar_sk.status === 'tidak_berlaku' ? 'dicabut atau tidak berlaku' : 'diubah oleh SK lain'}. Aturan tetap berlaku sampai ditinjau ulang
          {a.dasar_sk.ditinjau ? ` (sudah ditinjau: ${a.dasar_sk.catatan_tinjau ?? ''})` : ': ganti SK dasar, atau nonaktifkan, di Dasar SK aturan'}.
        </Alert>
      )}
      {a.dasar_sk?.status === 'belum' && a.status === 'aktif' && a.boleh_atur && (
        <Alert variant="warning" title="Belum berdasar SK">Aturan ini sudah berlaku sebelum dasar SK diwajibkan. Lengkapi SK dasarnya di Dasar SK aturan.</Alert>
      )}
      {!adaDasar && (a.status === 'draf' || a.status === 'dikembalikan') && a.boleh_atur && !dihapus && (
        <Alert variant="warning" title={a.bawaan ? 'Aturan bawaan menunggu SK' : 'Belum bisa diajukan'}>
          Lampirkan SK di tab “SK”, lalu ajukan untuk disetujui. Tanpa SK aturan tidak diperiksa.
        </Alert>
      )}
      {!diajukan && a.status !== 'aktif' && kembali?.catatan && (
        <Alert variant="danger" icon={<Undo2 />} title={`Dikembalikan oleh ${kembali.nama_oleh ?? kembali.oleh ?? 'penyetuju'}`}>
          “{kembali.catatan}”
        </Alert>
      )}
      {diajukan && usulan?.validasi && (
        <Alert variant="info" title={usulan.pemeriksa_label ?? 'Menunggu validasi'}>
          {a.status === 'aktif' ? 'Versi sekarang tetap berlaku sampai versi baru divalidasi.' : 'Aturan belum diperiksa sampai semua tahap validasi menyetujui.'} Tahap {usulan.validasi.tahap_ke} dari {usulan.validasi.jumlah_tahap}
          {usulan.validasi.berikutnya.length ? `: ${usulan.validasi.berikutnya.map((o) => o.nama ?? o.username).join(', ')}` : ''}
          {usulan.diajukan_at ? ` · diajukan ${formatWaktuAturan(usulan.diajukan_at, { jam: true })}` : ''}. Dasar: SK {usulan.validasi.sk_dasar?.nomor ?? '–'}
          {usulan.validasi.sk_dasar?.penerbit ? ` (${usulan.validasi.sk_dasar.penerbit.nama})` : ''}.
        </Alert>
      )}
      {diajukan && !usulan?.validasi && (
        <Alert variant="info" title="Menunggu persetujuan">
          {a.status === 'aktif' ? 'Versi sekarang tetap berlaku sampai versi baru disetujui' : 'Aturan belum diperiksa sampai disetujui'}
          {a.penyetuju ? ` oleh ${a.penyetuju.keterangan ?? a.penyetuju.jabatan ?? 'pimpinan bidang'}` : ' pimpinan bidang'}.
          {a.telaah_spmi !== false ? ' Telaah SPMI hanya catatan dan tidak menahan persetujuan.' : ''}
          {a.penyetuju && !a.penyetuju.orang?.length ? ' Belum ada pejabat penyetuju yang tercatat; hubungi admin.' : ''}
        </Alert>
      )}
      {usulan?.pemeriksa?.length && usulan.status !== 'draf' ? <AlurPemeriksa pemeriksa={usulan.pemeriksa} judul="Siapa yang memeriksa usulan ini" /> : null}
      {a.darurat && (
        <Alert variant="danger" icon={<Siren />} title={a.darurat_info?.label ?? 'Aktif lewat jalur darurat'}>
          Aturan sudah diperiksa, tetapi masih menunggu pengesahan susulan penyetuju.
          {a.darurat_info?.alasan ? ` Alasan: ${a.darurat_info.alasan}` : ''}
          {a.darurat_info?.oleh ? ` Diaktifkan ${a.darurat_info.oleh}${a.darurat_info.waktu ? `, ${formatWaktuAturan(a.darurat_info.waktu, { jam: true })}` : ''}.` : ''}
        </Alert>
      )}
      {a.usulan?.jenis === 'ubah' && a.status === 'aktif' && (a.usulan.status === 'diajukan' || a.usulan.status === 'draf') && (
        <div className="u-aturan-usulan">
          <p className="u-aturan-di-titik-label">
            <GitBranch aria-hidden /> Versi baru menunggu persetujuan; versi sekarang tetap berlaku
          </p>
          {a.usulan.data && <KetentuanAturan aturan={{ jenis: (a.usulan.data.jenis ?? a.jenis) as JenisAturan, kondisi: a.usulan.data.kondisi ?? null, parameter: a.usulan.data.parameter ?? null }} />}
          {a.usulan.sk?.nomor && (
            <p className="u-aturan-sub">
              Dasar: SK {a.usulan.sk.nomor}
              {a.usulan.sk.tanggal ? ` · ${formatWaktuAturan(a.usulan.sk.tanggal)}` : ''}
            </p>
          )}
        </div>
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
                    ...(pakaiDasarSk
                      ? [
                          {
                            label: 'SK dasar',
                            value: a.dasar_sk?.sk
                              ? `${a.dasar_sk.sk.nomor}${a.dasar_sk.sk.penerbit ? ` · ${a.dasar_sk.sk.penerbit}` : ''}${a.dasar_sk.sk.perihal ? ` · ${a.dasar_sk.sk.perihal}` : ''}`
                              : usulan?.validasi?.sk_dasar
                                ? `${usulan.validasi.sk_dasar.nomor}${usulan.validasi.sk_dasar.penerbit ? ` · ${usulan.validasi.sk_dasar.penerbit.nama}` : ''} (diajukan)`
                                : 'Belum ada; pilih saat mengajukan',
                          },
                        ]
                      : []),
                    ...(adaSk || !pakaiDasarSk ? [{ label: pakaiDasarSk ? 'SK penetapan' : 'Dasar hukum', value: <DasarHukumAturan a={a} /> }] : []),
                    ...(a.penyetuju && !pakaiDasarSk
                      ? [
                          {
                            label: 'Penyetuju',
                            value: [a.penyetuju.keterangan ?? a.penyetuju.jabatan ?? (a.penyetuju.rektor ? 'Rektor' : '–'), a.penyetuju.orang?.map((o) => o.nama ?? o.username).join(', ')]
                              .filter(Boolean)
                              .join(' · '),
                          },
                        ]
                      : []),
                    { label: 'Cakupan', value: ringkasCakupan(a.cakupan, nama) },
                    { label: 'Periode', value: formatTahun(a.tahun_id) },
                    {
                      label: 'Masa berlaku',
                      value:
                        a.berlaku_mulai || a.berlaku_selesai
                          ? `${formatWaktuAturan(a.berlaku_mulai) ?? ''} – ${a.berlaku_selesai ? formatWaktuAturan(a.berlaku_selesai) : 'seterusnya'}`
                          : 'Selama aktif',
                    },
                    { label: 'Kategori', value: labelKategoriAturan(a.kategori) },
                    { label: 'Pesan', value: a.pesan ?? 'Dibuat otomatis dari kondisi' },
                    { label: 'Prioritas', value: a.prioritas },
                    { label: 'Diaktifkan', value: a.diaktifkan_at ? `${formatWaktuAturan(a.diaktifkan_at, { jam: true })} oleh ${a.diaktifkan_oleh ?? '–'}` : '–' },
                    { label: 'Diubah', value: `${formatWaktuAturan(a.updated_at, { jam: true })} oleh ${a.diubah_oleh ?? a.dibuat_oleh ?? '–'}` },
                  ]}
                />
                {a.keterangan && <p className="u-aturan-sub">{a.keterangan}</p>}
                {(langkahAlur.length > 0 || telaah.length > 0) && (
                  <div className="u-aturan-alur">
                    <p className="u-aturan-di-titik-label">Persetujuan dan telaah SPMI</p>
                    {langkahAlur.length > 0 && <LinimasaPengajuan langkah={langkahAlur} />}
                    {telaah.map((tl, i) => (
                      <div key={i} className="u-aturan-telaah">
                        <MessageSquareText aria-hidden />
                        <div>
                          <strong>Telaah SPMI</strong> · {tl.nama_oleh ?? tl.oleh ?? '–'} · {formatWaktuAturan(tl.waktu, { jam: true })}
                          <p>{tl.catatan}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  content: (
                    <div className="u-aturan-detail-isi">
                      {a.boleh_putus_pengecualian && <AntreanPengecualianAturan aturanId={a.id} />}
                      <PengecualianAturanPanel aturan={a} onBerubah={q.refetch} />
                    </div>
                  ),
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
        title={
          konfirmasi === 'aktifkan'
            ? `Aktifkan “${a.nama}”?`
            : konfirmasi === 'ajukan'
              ? `Ajukan “${a.nama}” untuk disetujui?`
              : konfirmasi === 'nonaktifkan'
                ? `Nonaktifkan “${a.nama}”?`
                : `Hapus “${a.nama}”?`
        }
        description={
          konfirmasi === 'aktifkan'
            ? `Aturan langsung diperiksa di ${a.titik_judul ?? a.titik}${a.mode === 'blokir' ? ' dan langkah yang tidak memenuhi akan ditolak' : ''}.`
            : konfirmasi === 'ajukan'
              ? 'Pimpinan bidang memeriksa dan menyetujui aturan ini. Aturan mulai diperiksa setelah disetujui.'
              : konfirmasi === 'nonaktifkan'
                ? 'Aturan berhenti diperiksa. Tanggal yang sudah ditulis ke menu lama tidak dikembalikan otomatis.'
                : 'Aturan dipindah ke sampah dan berhenti diperiksa. Admin bisa memulihkannya sebagai draf.'
        }
        confirmLabel={konfirmasi === 'aktifkan' ? 'Aktifkan aturan' : konfirmasi === 'ajukan' ? 'Ajukan' : konfirmasi === 'nonaktifkan' ? 'Nonaktifkan aturan' : 'Hapus aturan'}
        tone={konfirmasi === 'aktifkan' || konfirmasi === 'ajukan' ? 'primary' : konfirmasi === 'nonaktifkan' ? 'warning' : 'danger'}
        onConfirm={async () => {
          if (!konfirmasi) return;
          try {
            await aksi(konfirmasi);
          } catch (e) {
            const bawaan = (e as { status?: number; details?: { bawaan?: unknown } }).status === 409 && (e as { details?: { bawaan?: unknown } }).details?.bawaan;
            toast.add({ title: 'Gagal', description: bawaan ? 'Aturan bawaan tidak bisa dihapus; nonaktifkan atau ubah isinya.' : pesanGalat(e), type: 'error' });
          }
        }}
      >
        <Field label={konfirmasi === 'hapus' ? 'Alasan' : 'Catatan'} optional>
          <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={500} placeholder={konfirmasi === 'hapus' ? 'mis. Diganti aturan baru' : 'Masuk riwayat aturan'} />
        </Field>
      </ConfirmDialog>
      <DialogAlurAturan jenis={alur} nama={a.nama} catatan={catatan} setCatatan={setCatatan} onTutup={() => setAlur(null)} onKirim={kirimAlur} />
      {pakaiDasarSk && <PanelAjukanAturan aturan={a} open={panelAjukan} onOpenChange={setPanelAjukan} onSelesai={q.refetch} />}
    </div>
  );
}

const JUDUL_TOAST_ALUR = {
  setujui: 'Aturan disetujui',
  kembalikan: 'Aturan dikembalikan ke pengusul',
  tolak: 'Pengajuan aturan ditolak',
  telaah: 'Catatan telaah SPMI terkirim',
  sahkan: 'Jalur darurat disahkan',
  cabut: 'Aturan dicabut',
} as const;

/** Dialog setujui / kembalikan (catatan wajib) / telaah SPMI (catatan wajib). */
function DialogAlurAturan({
  jenis,
  nama,
  catatan,
  setCatatan,
  onTutup,
  onKirim,
}: {
  jenis: null | 'setujui' | 'kembalikan' | 'tolak' | 'telaah' | 'sahkan' | 'cabut';
  nama: string;
  catatan: string;
  setCatatan: (v: string) => void;
  onTutup: () => void;
  onKirim: (j: 'setujui' | 'kembalikan' | 'tolak' | 'telaah' | 'sahkan' | 'cabut') => Promise<void>;
}) {
  const toast = useToast();
  const [galat, setGalat] = React.useState('');
  const wajib = jenis === 'kembalikan' || jenis === 'tolak' || jenis === 'telaah' || jenis === 'cabut';
  return (
    <ConfirmDialog
      open={jenis !== null}
      onOpenChange={(o) => {
        if (!o) {
          setGalat('');
          onTutup();
        }
      }}
      title={
        jenis === 'setujui'
          ? `Setujui “${nama}”?`
          : jenis === 'kembalikan'
            ? `Kembalikan “${nama}”?`
            : jenis === 'tolak'
              ? `Tolak “${nama}”?`
              : jenis === 'sahkan'
              ? `Sahkan “${nama}”?`
              : jenis === 'cabut'
                ? `Cabut “${nama}”?`
                : `Telaah SPMI: “${nama}”`
      }
      description={
        jenis === 'setujui'
          ? 'Aturan mulai diperiksa setelah disetujui.'
          : jenis === 'kembalikan'
            ? 'Aturan kembali menjadi draf. Tulis apa yang perlu diperbaiki pengusul.'
            : jenis === 'tolak'
              ? 'Pengajuan ditolak dan aturan tidak berlaku (versi yang sedang berlaku tetap). Tulis alasannya.'
              : jenis === 'sahkan'
              ? 'Aturan yang aktif lewat jalur darurat tetap berlaku sebagai aturan yang disetujui biasa.'
              : jenis === 'cabut'
                ? 'Aturan berhenti diperiksa sekarang dan kembali menjadi draf. Pengaktif dikabari.'
                : 'Catatan telaah SPMI terlihat oleh pengusul dan penyetuju. Catatan ini tidak menahan persetujuan.'
      }
      confirmLabel={{ setujui: 'Setujui', kembalikan: 'Kembalikan', tolak: 'Tolak', telaah: 'Kirim telaah', sahkan: 'Sahkan', cabut: 'Cabut' }[jenis ?? 'setujui']}
      tone={jenis === 'kembalikan' ? 'warning' : jenis === 'cabut' || jenis === 'tolak' ? 'danger' : 'primary'}
      onConfirm={async () => {
        if (!jenis) return;
        if (wajib && !catatan.trim()) {
          setGalat('Catatan wajib diisi.');
          throw new Error('Catatan wajib diisi.');
        }
        try {
          await onKirim(jenis);
          setGalat('');
        } catch (e) {
          toast.add({ title: 'Gagal', description: pesanGalat(e), type: 'error' });
          throw e;
        }
      }}
    >
      <Field label="Catatan" required={wajib} optional={!wajib} error={galat || undefined}>
        <Textarea
          rows={3}
          value={catatan}
          maxLength={1000}
          onChange={(e) => (setCatatan(e.target.value), setGalat(''))}
          placeholder={jenis === 'kembalikan' ? 'mis. Batas SKS belum sesuai Peraturan Akademik Pasal 14' : jenis === 'telaah' ? 'mis. Selaras dengan standar akademik SPMI' : 'Masuk riwayat aturan'}
        />
      </Field>
    </ConfirmDialog>
  );
}

/**
 * Antrean aturan yang menunggu persetujuan akun ini (GET /v1/aturan?antrean=persetujuan_saya): setujui, atau
 * kembalikan dengan catatan. Bisa dipasang di dasbor pimpinan.
 */
export function AntreanPersetujuanAturan({ kategori, onBuka, className }: { kategori?: KategoriAturan; onBuka?: (a: Aturan) => void; className?: string }) {
  return <AntreanAlurAturan antrean="persetujuan_saya" kategori={kategori} onBuka={onBuka} className={className} />;
}
/** Antrean telaah SPMI (GET /v1/aturan?antrean=telaah): catatan telaah yang tidak memblokir. Untuk aplikasi SPMI. */
export function AntreanTelaahAturan({ kategori, onBuka, className }: { kategori?: KategoriAturan; onBuka?: (a: Aturan) => void; className?: string }) {
  return (
    <>
      <PengingatSkAturan kategori={kategori} />
      <AntreanAlurAturan antrean="telaah" kategori={kategori} onBuka={onBuka} className={className} />
    </>
  );
}

function AntreanAlurAturan({ antrean, kategori, onBuka, className }: { antrean: 'persetujuan_saya' | 'telaah'; kategori?: KategoriAturan; onBuka?: (a: Aturan) => void; className?: string }) {
  const katalog = useKatalogAturan();
  const siakad = useSiakad();
  const toast = useToast();
  const d = useDaftarAturan({ antrean, kategori, per_page: 100 });
  const [alur, setAlur] = React.useState<{ a: Aturan; jenis: 'setujui' | 'kembalikan' | 'telaah' | 'sahkan' | 'cabut' } | null>(null);
  const [catatan, setCatatan] = React.useState('');
  const [buka, setBuka] = React.useState<string | null>(null);
  if (d.error) {
    const st = (d.error as { status?: number }).status;
    if (st === 404 || st === 422) return <Alert className={className}>Antrean persetujuan belum tersedia di server SIAKAD ini.</Alert>;
    return <GalatApi error={d.error} onRetry={d.refetch} className={className} />;
  }
  if (!d.data) return <Skeleton height={160} className={className} />;
  const daftar = d.data.filter((a) => a.usulan?.jenis !== 'darurat');
  if (!daftar.length)
    return (
      <Empty
        className={className}
        bordered
        icon={antrean === 'telaah' ? <MessageSquareText /> : <BadgeCheck />}
        title={antrean === 'telaah' ? 'Tidak ada aturan yang perlu ditelaah' : 'Tidak ada aturan yang menunggu persetujuan Anda'}
        description={antrean === 'telaah' ? 'Aturan yang diajukan akan muncul di sini untuk diberi catatan telaah SPMI.' : 'Aturan yang diajukan bagian di bidang Anda akan muncul di sini.'}
      />
    );
  return (
    <div className={cn('u-aturan-antrean', className)}>
      {daftar.map((a) => (
        <Card key={a.id} className="u-aturan-antrean-baris">
          <span className="u-aturan-ikon" data-jenis={a.jenis} aria-hidden>
            {IKON_JENIS[a.jenis]}
          </span>
          <div className="u-aturan-antrean-isi">
            <div className="u-aturan-detail-lencana">
              {a.bawaan && <Badge variant="info">Bawaan</Badge>}
              <StatusAturanBadge status={statusTampil(a)} />
              {a.status === 'aktif' && <Badge variant="info">Versi baru</Badge>}
              <ModeAturanBadge mode={a.mode} />
              <SifatAturanBadge sifat={a.sifat} />
            </div>
            <strong>{a.nama}</strong>
            <span>{a.titik_judul ?? a.titik}</span>
            <p>{kalimatAturan(a, katalog.data, a.titik_judul ?? undefined) || ringkasKetentuan(a, katalog.data)}</p>
            <span className="u-aturan-di-titik-sk">{teksSkRingkas(a)}</span>
          </div>
          <div className="u-aturan-antrean-aksi">
            {antrean === 'persetujuan_saya' ? (
              <>
                <Button size="sm" onClick={() => setAlur({ a, jenis: 'setujui' })}>
                  <BadgeCheck /> Setujui
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAlur({ a, jenis: 'kembalikan' })}>
                  <Undo2 /> Kembalikan
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setAlur({ a, jenis: 'telaah' })}>
                <MessageSquareText /> Tulis telaah
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => (onBuka ? onBuka(a) : setBuka(a.id))}>
              Lihat detail
            </Button>
          </div>
        </Card>
      ))}
      <DialogAlurAturan
        jenis={alur?.jenis ?? null}
        nama={alur?.a.nama ?? ''}
        catatan={catatan}
        setCatatan={setCatatan}
        onTutup={() => setAlur(null)}
        onKirim={async (j) => {
          await siakad.request({ method: 'POST', path: `/v1/aturan/${alur!.a.id}/${j}`, body: { catatan: catatan.trim() || null } });
          invalidateSiakad('aturan');
          setCatatan('');
          setAlur(null);
          toast.add({ title: JUDUL_TOAST_ALUR[j], type: 'success' });
        }}
      />
      {!onBuka && (
        <Dialog open={buka !== null} onOpenChange={(o) => !o && setBuka(null)} side="right" size="lg" title="Detail aturan">
          {buka && <PanelDetailAturan id={buka} />}
        </Dialog>
      )}
    </div>
  );
}

export interface KelolaAturanProps {
  /** Batasi ke satu kategori (mis. halaman keuangan). */
  kategori?: KategoriAturan;
  /** Batasi ke satu titik (mis. pengaturan KRS). */
  titik?: string;
  judul?: React.ReactNode;
  /** Tampilkan tab "Titik penerapan" untuk admin (GET/POST /v1/aturan/titik). Bawaan false. */
  tampilTitik?: boolean;
  /** Halaman tempat mengisi pejabat (data induk), untuk tab "Pejabat penyetuju". */
  tautanPejabat?: string;
  /** Unit aplikasi untuk bagian "Aturan bawaan" (baak, bauk, pmb, sdm, spmi, lppm, pustikom, fakultas). Kosong = per kategori. */
  unit?: string;
  /**
   * `kartu` (bawaan): panel aturan bawaan + kisi kartu. `kelompok`: registri berkelompok per bidang langkah, aturan
   * berjudul sama di beberapa fakultas jadi satu baris induk, saring lingkup/status, lampiran SK massal.
   */
  tampilan?: 'kartu' | 'kelompok';
  /** Portal Fakultas (tampilan kelompok): hanya aturan universitas umum + aturan yang lingkupnya fakultas ini. */
  fakultas?: string | null;
  className?: string;
}

interface RingkasBawaan {
  total: number;
  menunggu_sk: number;
  draf?: number;
  diajukan?: number;
  aktif: number;
  nonaktif?: number;
}

/**
 * Aturan bawaan kampus untuk aplikasi ini (GET /v1/aturan?bawaan=1&unit=|kategori=): ringkas jumlah per status dan
 * daftar dengan tombol "Lampirkan SK & ajukan" untuk yang masih draf tanpa SK. Tidak tampil bila tidak ada.
 */
export function AturanBawaanPanel({
  kategori,
  unit,
  bolehAtur = true,
  onBuka,
  onLampirkan,
  className,
}: {
  kategori?: KategoriAturan;
  unit?: string;
  bolehAtur?: boolean;
  onBuka?: (a: Aturan) => void;
  onLampirkan?: (a: Aturan) => void;
  className?: string;
}) {
  const katalog = useKatalogAturan();
  const d = useDaftarAturan({ bawaan: true, kategori: unit ? undefined : kategori, unit, per_page: 100 });
  const [buka, setBuka] = React.useState<boolean | null>(null);
  const [lampir, setLampir] = React.useState<string | null>(null);
  if (!d.data) return null;
  const daftar = d.data.filter((a) => a.bawaan !== false && !a.dihapus_at);
  if (!daftar.length) return null;
  const meta = (d.meta as { bawaan?: RingkasBawaan & { per_unit?: Record<string, RingkasBawaan>; per_kategori?: Record<string, RingkasBawaan> } } | undefined)?.bawaan;
  const r: RingkasBawaan = (unit ? meta?.per_unit?.[unit] : kategori ? meta?.per_kategori?.[kategori] : meta) ?? {
    total: daftar.length,
    menunggu_sk: daftar.filter((a) => a.menunggu_sk).length,
    aktif: daftar.filter((a) => a.status === 'aktif').length,
  };
  const diajukan = daftar.filter((a) => statusTampil(a) === 'diajukan').length;
  const tanpaSkAktif = daftar.filter((a) => a.perlu_lampir_sk).length;
  const terbuka = buka ?? (r.menunggu_sk > 0 || tanpaSkAktif > 0);
  const statusBawaan = (a: Aturan) =>
    a.status === 'aktif' ? (
      <span className="u-aturan-lencana-baris">
        <Badge variant="success" dot>
          Aktif
        </Badge>
        {a.perlu_lampir_sk ? <LencanaLampirSK /> : null}
      </span>
    ) : statusTampil(a) === 'diajukan' ? (
      <Badge variant="info" dot>
        Diajukan
      </Badge>
    ) : (a.menunggu_sk ?? (!a.jumlah_sk && !a.sk?.nomor)) ? (
      <Badge variant="warning" dot>
        Menunggu SK
      </Badge>
    ) : (
      <StatusAturanBadge status={statusTampil(a)} />
    );
  return (
    <section className={cn('u-aturan-bawaan', className)} data-perlu={r.menunggu_sk > 0 || tanpaSkAktif > 0 || undefined}>
      <button type="button" className="u-aturan-bawaan-kepala" aria-expanded={terbuka} onClick={() => setBuka(!terbuka)}>
        <span className="u-aturan-ikon" data-ukuran="sm" aria-hidden>
          <FileBadge />
        </span>
        <span className="u-aturan-bawaan-judul">
          <strong>Aturan bawaan kampus</strong>
          <span>
            {r.total} aturan · {r.aktif} aktif{tanpaSkAktif ? ` · ${tanpaSkAktif} belum ada SK` : ''}
            {r.menunggu_sk ? ` · ${r.menunggu_sk} menunggu SK` : ''}
            {diajukan ? ` · ${diajukan} diajukan` : ''}
          </span>
        </span>
        <ChevronDown aria-hidden data-buka={terbuka || undefined} />
      </button>
      {terbuka && (
        <>
          <p className="u-aturan-sub">
            Aturan bawaan disiapkan sistem untuk kebijakan kampus yang umum dan sudah aktif (ditegakkan) tanpa menunggu SK. Lampirkan SK dari registri SK sebagai dasar hukumnya; SK-nya ikut
            terdaftar di SPMI. Aturan bawaan tidak bisa dihapus; nonaktifkan atau ubah isinya.
          </p>
          <ul className="u-aturan-bawaan-daftar">
            {daftar.map((a) => {
              const tunggu = a.status !== 'aktif' && statusTampil(a) !== 'diajukan' && (a.menunggu_sk ?? (!a.jumlah_sk && !a.sk?.nomor));
              return (
                <li key={a.id}>
                  <div>
                    <strong>{a.nama}</strong>
                    <span>
                      {a.titik_judul ?? a.titik}
                      {ringkasKetentuan(a, katalog.data) ? ` · ${ringkasKetentuan(a, katalog.data)}` : ''}
                    </span>
                  </div>
                  {statusBawaan(a)}
                  <div className="u-aturan-bawaan-aksi">
                    {a.perlu_lampir_sk && bolehAtur ? (
                      <Button size="sm" onClick={() => setLampir(a.id)}>
                        Lampirkan SK
                      </Button>
                    ) : null}
                    {tunggu && bolehAtur && onLampirkan ? (
                      <Button size="sm" onClick={() => onLampirkan(a)}>
                        Lampirkan SK & ajukan
                      </Button>
                    ) : null}
                    {onBuka && (
                      <Button size="sm" variant="ghost" onClick={() => onBuka(a)}>
                        Lihat
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {lampir && (
        <FormLampiranAturan
          aturanId={lampir}
          open
          onOpenChange={(o) => !o && setLampir(null)}
          onTersimpan={() => {
            setLampir(null);
            d.refetch();
          }}
        />
      )}
    </section>
  );
}

/** Lencana "Belum ada SK, lampirkan" untuk aturan aktif tanpa SK (aturan bawaan yang aktif otomatis). */
export function LencanaLampirSK() {
  return (
    <Badge variant="warning" dot>
      Belum ada SK, lampirkan
    </Badge>
  );
}

/**
 * Pengingat di beranda/antrean (SPMI, Pustikom, aplikasi unit): jumlah aturan bawaan yang aktif tanpa SK dengan tombol
 * menuju daftar aturan. Diam bila nol atau akun tidak bisa melihat aturan.
 */
export function PengingatSkAturan({ unit, kategori, href, onBuka, className }: { unit?: string; kategori?: KategoriAturan; href?: string; onBuka?: () => void; className?: string }) {
  // SIAKAD dengan dasar SK (docs/ATURAN-SK.md): hitung aturan aktif yang belum berdasar SK; selain itu aturan bawaan tanpa lampiran SK.
  const dasar = useSiakadQuery<{ kelompok: Array<{ nama: string; jumlah: number }> }>(
    ['aturan', 'dasar-sk', 'pengingat', unit, kategori],
    (s, signal) => s.request({ method: 'GET', path: '/v1/aturan/dasar-sk', query: { status: 'belum', kategori, unit: unit?.toUpperCase() } }, { signal }),
  );
  const pakaiDasar = Boolean(dasar.data);
  const d = useDaftarAturan({ tanpa_sk: true, bawaan: true, unit, kategori, per_page: 100 });
  // Kelompokkan per nama aturan (aturan bawaan fakultas bernama sama di tiap fakultas): "Syarat dosen PA (6 unit)".
  const kel = new Map<string, number>();
  if (pakaiDasar) for (const k of dasar.data!.kelompok) kel.set(k.nama, k.jumlah);
  else for (const a of d.data ?? []) kel.set(a.nama, (kel.get(a.nama) ?? 0) + 1);
  const daftar = [...kel.entries()].sort((x, y) => y[1] - x[1]);
  const n = daftar.reduce((s, [, j]) => s + j, 0);
  if (!n) return null;
  return (
    <Alert
      variant="warning"
      className={className}
      title={pakaiDasar ? `${n} aturan berlaku belum berdasar SK` : `${n} aturan bawaan belum punya SK`}
      actions={
        href ? (
          <Button size="sm" render={<a href={href} />}>
            Lengkapi SK dasar
          </Button>
        ) : onBuka ? (
          <Button size="sm" onClick={onBuka}>
            Lengkapi SK dasar
          </Button>
        ) : undefined
      }
    >
      <span className="u-aturan-pengingat-isi">
        Sudah berlaku; lengkapi SK dasarnya:{' '}
        {daftar
          .slice(0, 3)
          .map(([nm, j]) => (j > 1 ? `${nm} (${j} unit)` : nm))
          .join('; ')}
        {daftar.length > 3 ? `; dan ${daftar.length - 3} jenis lain` : ''}.
      </span>
    </Alert>
  );
}

/**
 * Modul lengkap aturan dinamis: ringkasan, daftar dengan saringan, tambah/ubah (wizard), detail (SK, dispensasi, uji,
 * riwayat), alur persetujuan (menunggu persetujuan saya, telaah SPMI), sampah (admin), pengatur, dan titik penerapan.
 * Hak akses mengikuti GET /v1/aturan/saya.
 */
export function KelolaAturan({ kategori, titik, unit, judul = 'Aturan akademik dinamis', tampilTitik = false, tautanPejabat, tampilan = 'kartu', fakultas, className }: KelolaAturanProps) {
  const kelompok = tampilan === 'kelompok' && !titik;
  const saya = useAturanSaya();
  const ringkas = useDaftarAturan({ kategori, titik, per_page: 200 });
  const hakSaya = hakAlur(saya.data);
  // GET /v1/aturan/saya belum memuat hak menyetujui/menelaah: antrean yang berisi juga menandakan berhak.
  const antreanSetuju = useDaftarAturan({ antrean: 'persetujuan_saya', kategori, per_page: 100 });
  const antreanTelaah = useDaftarAturan({ antrean: 'telaah', kategori, per_page: 1 });
  const ajuanPengecualian = useAjuanPengecualianAturan({ antrean: 'saya', status: 'diajukan' });
  const jumlahDarurat = antreanSetuju.data?.filter((a) => a.usulan?.jenis === 'darurat').length ?? 0;
  const jumlahSetuju = (antreanSetuju.data?.length ?? 0) - jumlahDarurat;
  const hak = {
    setujui: hakSaya.setujui || jumlahSetuju > 0,
    telaah: hakSaya.telaah || Boolean(antreanTelaah.data?.length),
    darurat: hakSaya.setujui || jumlahDarurat > 0,
    pengecualian: Boolean(saya.data?.boleh_pengecualian || saya.data?.admin || ajuanPengecualian.data?.length),
  };
  const [tab, setTab] = React.useState<'aturan' | 'persetujuan' | 'telaah' | 'darurat' | 'pengecualian' | 'sampah' | 'pengatur' | 'penyetuju' | 'validator' | 'dasar' | 'titik'>('aturan');
  const [wizardContoh, setWizardContoh] = React.useState(false);
  const [buka, setBuka] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<{ aturan: Aturan | null; langkah?: number } | null>(null);
  const bolehTambah = saya.data ? saya.data.admin || saya.data.kategori.some((k) => k.boleh_atur && (!kategori || k.kategori === kategori)) : false;
  const hitung = (s: StatusAturan) => ringkas.data?.filter((a) => a.status === s).length ?? 0;
  const tanpaSk = ringkas.data?.filter((a) => (a.status === 'draf' || a.status === 'dikembalikan') && !a.jumlah_sk && !a.sk?.nomor).length ?? 0;
  const tombolTambah = bolehTambah ? (
    <div className="u-aturan-modul-tombol">
      <Button onClick={() => setWizardContoh(true)}>
        <Sparkle /> Buat dari contoh
      </Button>
      <Button variant="outline" onClick={() => setForm({ aturan: null })}>
        <Plus /> Susun sendiri
      </Button>
    </div>
  ) : null;
  return (
    <div className={cn('u-aturan-modul', className)}>
      <div className="u-aturan-modul-kepala">
        <div>
          <h2>{judul}</h2>
          <p>Syarat, batas waktu, dan batas nilai yang diperiksa SIAKAD di setiap langkah. Aturan buatan unit berlaku setelah ber-SK dan disetujui; aturan bawaan kampus sudah aktif dan tinggal dilampiri SK.</p>
        </div>
        {tombolTambah}
      </div>
      {kelompok ? null : <div className="u-aturan-statistik">
        {[
          { label: 'Aktif', nilai: hitung('aktif'), ikon: <Power />, nada: 'success' },
          { label: 'Draf', nilai: hitung('draf') + hitung('dikembalikan'), ikon: <Pencil />, nada: 'warning', catatan: tanpaSk ? `${tanpaSk} belum ber-SK` : undefined },
          { label: 'Diajukan', nilai: hitung('diajukan') + hitung('disetujui'), ikon: <Send />, nada: 'info' },
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
      </div>}
      <Tabs
        value={tab === 'persetujuan' && !hak.setujui ? 'aturan' : tab}
        onValueChange={setTab}
        items={[
          {
            value: 'aturan',
            label: 'Aturan',
            icon: <Scale />,
            content: kelompok ? (
              <DaftarAturanKelompok
                kategori={kategori}
                fakultas={fakultas}
                bolehAtur={Boolean(saya.data?.admin || saya.data?.kategori.some((k) => k.boleh_atur && k.semua_prodi && (!kategori || k.kategori === kategori)))}
                bolehAturFakultas={Boolean(saya.data?.admin) || (Boolean(fakultas) && bolehTambah)}
                onBuka={(a) => setBuka(a.id)}
                onLampirkan={(a) => setForm({ aturan: a, langkah: 4 })}
                catatanFakultas={fakultas ? null : undefined}
              />
            ) : (
              <div className="u-aturan-detail-isi">
                {!titik && <AturanBawaanPanel kategori={kategori} unit={unit} bolehAtur={bolehTambah} onBuka={(a) => setBuka(a.id)} onLampirkan={(a) => setForm({ aturan: a, langkah: 4 })} />}
                <DaftarAturan filter={{ kategori, titik }} onBuka={(a) => setBuka(a.id)} />
              </div>
            ),
          },
          ...(hak.setujui
            ? [
                {
                  value: 'persetujuan' as const,
                  label: 'Menunggu persetujuan saya',
                  icon: <BadgeCheck />,
                  count: jumlahSetuju || undefined,
                  content: <AntreanPersetujuanAturan kategori={kategori} onBuka={(a) => setBuka(a.id)} />,
                },
              ]
            : []),
          ...(hak.telaah
            ? [
                {
                  value: 'telaah' as const,
                  label: 'Perlu telaah SPMI',
                  icon: <MessageSquareText />,
                  count: (antreanTelaah.meta as { total?: number } | undefined)?.total || undefined,
                  content: <AntreanTelaahAturan kategori={kategori} onBuka={(a) => setBuka(a.id)} />,
                },
              ]
            : []),
          ...(hak.darurat
            ? [
                {
                  value: 'darurat' as const,
                  label: 'Jalur darurat',
                  icon: <Siren />,
                  count: jumlahDarurat || undefined,
                  content: <AntreanDaruratAturan kategori={kategori} onBuka={(a) => setBuka(a.id)} />,
                },
              ]
            : []),
          ...(hak.pengecualian
            ? [{ value: 'pengecualian' as const, label: 'Pengajuan pengecualian', icon: <UserCheck />, count: ajuanPengecualian.data?.length || undefined, content: <AntreanPengecualianAturan /> }]
            : []),
          ...(saya.data?.admin
            ? [{ value: 'sampah' as const, label: 'Sampah', icon: <Trash2 />, content: <DaftarAturan filter={{ kategori, titik, terhapus: true }} onBuka={(a) => setBuka(a.id)} /> }]
            : []),
          ...(bolehTambah ? [{ value: 'dasar' as const, label: 'Dasar SK', icon: <FileBadge />, content: <DasarSkAturanDaftar kategori={kategori} /> }] : []),
          { value: 'pengatur', label: 'Pengatur', icon: <ShieldCheck />, content: <PengaturAturan /> },
          ...(saya.data?.admin ? [{ value: 'penyetuju' as const, label: 'Pejabat penyetuju', icon: <BadgeCheck />, content: <PejabatPenyetujuAturan tautanPejabat={tautanPejabat} /> }] : []),
          ...(saya.data?.boleh_validator_lihat ? [{ value: 'validator' as const, label: 'Validator aturan', icon: <GitBranch />, content: <ValidatorAturan /> }] : []),
          ...(tampilTitik && saya.data?.admin ? [{ value: 'titik' as const, label: 'Titik penerapan', icon: <Waypoints />, content: <KelolaTitikAturan /> }] : []),
        ]}
      />
      <Dialog open={buka !== null} onOpenChange={(o) => !o && setBuka(null)} side="right" size="lg" title="Detail aturan">
        {buka && <PanelDetailAturan id={buka} onUbah={(a) => setForm({ aturan: a })} onDihapus={() => setBuka(null)} />}
      </Dialog>
      <WizardTemplatAturan
        open={wizardContoh}
        onOpenChange={setWizardContoh}
        fakultas={fakultas ?? null}
        onTersimpan={(id) => {
          setWizardContoh(false);
          setBuka(id);
        }}
      />
      <FormAturan
        open={form !== null}
        onOpenChange={(o) => !o && setForm(null)}
        aturan={form?.aturan ?? null}
        titik={titik}
        kategori={kategori}
        langkahAwal={form?.langkah}
        onTersimpan={(a) => {
          setForm(null);
          setBuka(a.id);
        }}
      />
    </div>
  );
}
