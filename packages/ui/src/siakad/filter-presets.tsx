'use client';
import * as React from 'react';
import { Archive, BadgeCheck, BookOpen, Briefcase, Building2, Calendar, CircleDot, FileType2, Flag, GraduationCap, Inbox, Layers, Send, ShieldCheck, Tag, Users } from 'lucide-react';
import { FilterBar, type FilterBarProps, type FilterField, type FilterOption } from '../components/filter';
import { useSiakadQuery } from './provider';

const opt = (pairs: Array<[string, string]>): FilterOption[] => pairs.map(([value, label]) => ({ value, label, text: label }));

/** Opsi program studi dari SDK (referensi.getProdi), untuk dipakai di saringan mana pun. */
export function useProdiOptions(): FilterOption[] {
  const { data } = useSiakadQuery(['referensi', 'prodi'], (s, signal) => s.referensi.getProdi({}, { signal }), { staleTime: 10 * 60_000 });
  return React.useMemo(() => (data ?? []).map((p) => ({ value: String(p.kode_prodi), label: `${p.kode_jenjang ?? ''} ${p.nama_prodi ?? ''}`.trim(), text: String(p.nama_prodi ?? '') })), [data]);
}

function angkatanOptions(n = 8): FilterOption[] {
  const y = new Date().getFullYear();
  return Array.from({ length: n }, (_, i) => ({ value: String(y - i), label: String(y - i) }));
}

// ---------------------------------------------------------------- Kode status
export const STATUS_MAHASISWA = opt([
  ['A', 'Aktif'],
  ['C', 'Cuti'],
  ['N', 'Non-aktif'],
  ['L', 'Lulus'],
  ['K', 'Keluar'],
  ['D', 'Drop out'],
]);
export const SIFAT_SURAT = opt([
  ['biasa', 'Biasa'],
  ['penting', 'Penting'],
  ['segera', 'Segera'],
  ['sangat_segera', 'Sangat segera'],
]);
export const STATUS_SURAT_MASUK = opt([
  ['baru', 'Baru'],
  ['didisposisi', 'Didisposisi'],
  ['diproses', 'Diproses'],
  ['selesai', 'Selesai'],
  ['diarsipkan', 'Diarsipkan'],
  ['dibatalkan', 'Dibatalkan'],
]);
export const STATUS_SURAT_KELUAR = opt([
  ['draf', 'Draf'],
  ['review', 'Ditinjau'],
  ['revisi', 'Revisi'],
  ['disetujui', 'Disetujui'],
  ['terkirim', 'Terkirim'],
  ['diarsipkan', 'Diarsipkan'],
  ['dibatalkan', 'Dibatalkan'],
]);
export const STATUS_ARSIP = opt([
  ['aktif', 'Aktif'],
  ['inaktif', 'Inaktif'],
  ['permanen', 'Permanen'],
  ['dimusnahkan', 'Dimusnahkan'],
  ['diserahkan', 'Diserahkan'],
]);
export const STATUS_VERIFIKASI = opt([
  ['diajukan', 'Diajukan'],
  ['terverifikasi', 'Terverifikasi'],
  ['ditolak', 'Ditolak'],
  ['tidak_perlu', 'Tidak perlu'],
]);
export const JABATAN_AKADEMIK = opt([
  ['tenaga_pengajar', 'Tenaga pengajar'],
  ['asisten_ahli', 'Asisten Ahli'],
  ['lektor', 'Lektor'],
  ['lektor_kepala', 'Lektor Kepala'],
  ['guru_besar', 'Guru Besar'],
]);

// ---------------------------------------------------------------- Definisi saringan per data
/** Saringan siap pakai: kunci field sama dengan parameter query endpoint SDK terkait. */
export function useFilterFields(jenis: FilterPreset): FilterField[] {
  const prodi = useProdiOptions();
  return React.useMemo(() => {
    const fProdi: FilterField = { key: 'prodi', label: 'Prodi', type: 'select', options: prodi, icon: <Building2 />, searchable: true };
    switch (jenis) {
      case 'mahasiswa':
        return [
          fProdi,
          { key: 'angkatan', label: 'Angkatan', type: 'select', options: angkatanOptions(), icon: <GraduationCap /> },
          { key: 'status', label: 'Status', type: 'select', options: STATUS_MAHASISWA, icon: <CircleDot /> },
          { key: 'kelas', label: 'Kelas', type: 'select', options: opt([['R', 'Reguler'], ['K', 'Karyawan'], ['D', 'Daring']]), icon: <Users /> },
        ];
      case 'dosen':
        return [
          fProdi,
          { key: 'status', label: 'Status', type: 'select', options: opt([['A', 'Aktif'], ['T', 'Tugas belajar'], ['C', 'Cuti'], ['K', 'Keluar']]), icon: <CircleDot /> },
          { key: 'jabatan', label: 'Jabatan', type: 'multi', options: JABATAN_AKADEMIK, icon: <Briefcase /> },
          { key: 'serdos', label: 'Bersertifikat dosen', type: 'boolean', icon: <BadgeCheck /> },
        ];
      case 'pegawai':
        return [
          { key: 'jenis', label: 'Jenis', type: 'select', options: opt([['dosen', 'Dosen'], ['tendik', 'Tenaga kependidikan']]), icon: <Users /> },
          { key: 'kategori', label: 'Kategori', type: 'select', options: opt([['tetap', 'Tetap'], ['tidak_tetap', 'Tidak tetap']]), icon: <Briefcase /> },
          { key: 'status_aktif', label: 'Status', type: 'select', options: opt([['aktif', 'Aktif'], ['cuti', 'Cuti'], ['tugas_belajar', 'Tugas belajar'], ['pensiun', 'Pensiun'], ['keluar', 'Keluar']]), icon: <CircleDot /> },
          { key: 'kode_prodi', label: 'Prodi', type: 'select', options: prodi, icon: <Building2 />, searchable: true },
        ];
      case 'mata-kuliah':
        return [
          fProdi,
          { key: 'semester', label: 'Semester', type: 'select', options: Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: `Semester ${i + 1}` })), icon: <Layers /> },
          { key: 'sifat', label: 'Sifat', type: 'select', options: opt([['W', 'Wajib'], ['P', 'Pilihan']]), icon: <Tag /> },
          { key: 'sks', label: 'SKS', type: 'multi', options: ['1', '2', '3', '4', '6'].map((v) => ({ value: v, label: `${v} SKS` })), icon: <BookOpen /> },
        ];
      case 'dokumen':
        return [
          { key: 'jenis', label: 'Jenis', type: 'multi', options: opt([['ijazah', 'Ijazah'], ['transkrip', 'Transkrip'], ['sk', 'Surat keputusan'], ['sertifikat', 'Sertifikat'], ['kontrak', 'Kontrak'], ['lainnya', 'Lainnya']]), icon: <FileType2 /> },
          { key: 'status_verifikasi', label: 'Verifikasi', type: 'select', options: STATUS_VERIFIKASI, icon: <ShieldCheck /> },
          { key: 'status_arsip', label: 'Status arsip', type: 'select', options: STATUS_ARSIP, icon: <Archive /> },
          { key: 'tanggal', label: 'Tanggal', type: 'date-range', icon: <Calendar /> },
        ];
      case 'berkas':
        return [
          { key: 'tipe', label: 'Tipe berkas', type: 'multi', options: opt([['pdf', 'PDF'], ['gambar', 'Gambar'], ['dokumen', 'Dokumen (Word)'], ['spreadsheet', 'Spreadsheet'], ['arsip', 'Arsip (ZIP)']]), icon: <FileType2 /> },
          { key: 'ukuran', label: 'Ukuran', type: 'select', options: opt([['kecil', '< 1 MB'], ['sedang', '1 – 10 MB'], ['besar', '> 10 MB']]), icon: <Layers /> },
          { key: 'diunggah', label: 'Diunggah', type: 'date-range', icon: <Calendar /> },
          { key: 'milik_saya', label: 'Milik saya', type: 'boolean', icon: <Users /> },
        ];
      case 'surat-masuk':
        return [
          { key: 'status', label: 'Status', type: 'multi', options: STATUS_SURAT_MASUK, icon: <Inbox /> },
          { key: 'sifat', label: 'Sifat', type: 'multi', options: SIFAT_SURAT, icon: <Flag /> },
          { key: 'tanggal', label: 'Tanggal surat', type: 'date-range', icon: <Calendar /> },
          { key: 'perlu_tindakan', label: 'Perlu tindakan saya', type: 'boolean', icon: <BadgeCheck /> },
        ];
      case 'surat-keluar':
        return [
          { key: 'status', label: 'Status', type: 'multi', options: STATUS_SURAT_KELUAR, icon: <Send /> },
          { key: 'sifat', label: 'Sifat', type: 'multi', options: SIFAT_SURAT, icon: <Flag /> },
          { key: 'tanggal', label: 'Tanggal', type: 'date-range', icon: <Calendar /> },
          { key: 'tujuan', label: 'Tujuan', type: 'select', options: opt([['unit', 'Unit internal'], ['dosen', 'Dosen'], ['mahasiswa', 'Mahasiswa'], ['eksternal', 'Pihak luar']]), icon: <Users /> },
        ];
    }
  }, [jenis, prodi]);
}

export type FilterPreset = 'mahasiswa' | 'dosen' | 'pegawai' | 'mata-kuliah' | 'dokumen' | 'berkas' | 'surat-masuk' | 'surat-keluar';

const PLACEHOLDER: Record<FilterPreset, [string, string]> = {
  mahasiswa: ['Cari NIM atau nama', 'mahasiswa'],
  dosen: ['Cari NIDN atau nama', 'dosen'],
  pegawai: ['Cari nama, NIP, NIDN', 'pegawai'],
  'mata-kuliah': ['Cari kode atau nama MK', 'mata kuliah'],
  dokumen: ['Cari judul atau nomor dokumen', 'dokumen'],
  berkas: ['Cari nama berkas', 'berkas'],
  'surat-masuk': ['Cari nomor, perihal, atau pengirim', 'surat'],
  'surat-keluar': ['Cari nomor, perihal, atau tujuan', 'surat'],
};

export type PresetFilterProps = Omit<FilterBarProps, 'fields'> & {
  /** Tambah atau ganti field bawaan. */
  extraFields?: FilterField[];
  /** Sembunyikan field bawaan berdasarkan key. */
  hide?: string[];
};

function makePreset(jenis: FilterPreset) {
  function Preset({ extraFields = [], hide = [], search, resultLabel, ...props }: PresetFilterProps) {
    const base = useFilterFields(jenis).filter((f) => !hide.includes(f.key));
    const fields = [...base.filter((f) => !extraFields.some((e) => e.key === f.key)), ...extraFields];
    return <FilterBar fields={fields} search={search ?? { placeholder: PLACEHOLDER[jenis][0] }} resultLabel={resultLabel ?? PLACEHOLDER[jenis][1]} {...props} />;
  }
  Preset.displayName = `Filter(${jenis})`;
  return Preset;
}

/** Saringan mahasiswa: prodi (dari SDK), angkatan, status, kelas → cocok untuk mahasiswa.list(query). */
export const FilterMahasiswa = makePreset('mahasiswa');
/** Saringan dosen: prodi, status, jabatan akademik, serdos → dosen.list(query). */
export const FilterDosen = makePreset('dosen');
/** Saringan pegawai/tendik: jenis, kategori, status, prodi → sdm.getPegawai(query). */
export const FilterPegawai = makePreset('pegawai');
/** Saringan mata kuliah: prodi, semester, sifat, SKS → mataKuliah.list(query). */
export const FilterMataKuliah = makePreset('mata-kuliah');
/** Saringan dokumen arsip: jenis, verifikasi, status arsip, tanggal. */
export const FilterDokumen = makePreset('dokumen');
/** Saringan berkas: tipe, ukuran, tanggal unggah, milik saya. */
export const FilterBerkas = makePreset('berkas');
/** Saringan surat masuk: status, sifat, tanggal, perlu tindakan. */
export const FilterSuratMasuk = makePreset('surat-masuk');
/** Saringan surat keluar: status, sifat, tanggal, tujuan. */
export const FilterSuratKeluar = makePreset('surat-keluar');
