'use client';
import * as React from 'react';
import { Archive, BadgeCheck, Briefcase, Building2, Calendar, CircleDot, Clock, Flag, FolderOpen, GraduationCap, Inbox, Layers, Lock, Send, ShieldCheck, Users } from 'lucide-react';
import { FilterBar, type FilterBarProps, type FilterField, type FilterOption } from '../components/filter';
import { useSiakadQuery } from './provider';
import { LogoFakultas, judulProdi, type ProdiReferensi } from './prodi';

const opt = (pairs: Array<[string, string]>): FilterOption[] => pairs.map(([value, label]) => ({ value, label, text: label }));

/** Opsi program studi dari SDK (referensi.getProdi), untuk dipakai di saringan mana pun. */
export function useProdiOptions(): FilterOption[] {
  const { data } = useSiakadQuery(['referensi', 'prodi'], (s, signal) => s.referensi.getProdi({}, { signal }), { staleTime: 10 * 60_000 });
  return React.useMemo(
    () =>
      (data ?? []).map((p) => {
        const r = p as unknown as ProdiReferensi;
        return { value: String(p.kode_prodi), label: judulProdi(r), text: `${judulProdi(r)} ${p.kode_prodi}`, icon: <LogoFakultas kode={r.kode_fak} nama={r.nama_fakultas} ukuran="sm" /> };
      }),
    [data],
  );
}

/** Opsi tahun akademik dari SDK (referensi.getTahunAkademik). */
export function useTahunOptions(enabled = true): FilterOption[] {
  const { data } = useSiakadQuery(['referensi', 'tahun'], (s, signal) => s.referensi.getTahunAkademik({}, { signal }), { staleTime: 10 * 60_000, enabled });
  return React.useMemo(() => ((data as Array<Record<string, unknown>> | undefined) ?? []).map((t) => ({ value: String(t.tahun_id), label: String(t.nama_tahun ?? t.tahun_id) })), [data]);
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
export const KEAMANAN_SURAT = opt([
  ['biasa', 'Biasa'],
  ['terbatas', 'Terbatas'],
  ['rahasia', 'Rahasia'],
  ['sangat_rahasia', 'Sangat rahasia'],
]);
export const AKSES_ARSIP = opt([
  ['publik', 'Publik'],
  ['internal', 'Internal'],
  ['terbatas', 'Terbatas'],
  ['rahasia', 'Rahasia'],
]);
export const PEMILIK_ARSIP = opt([
  ['universitas', 'Universitas'],
  ['fakultas', 'Fakultas'],
  ['prodi', 'Program studi'],
  ['unit', 'Unit'],
  ['dosen', 'Dosen'],
  ['mahasiswa', 'Mahasiswa'],
]);
export const STATUS_PEGAWAI = opt([
  ['aktif', 'Aktif'],
  ['cuti', 'Cuti'],
  ['tugas_belajar', 'Tugas belajar'],
  ['izin_belajar', 'Izin belajar'],
  ['diperbantukan', 'Diperbantukan'],
  ['nonaktif', 'Non-aktif'],
  ['pensiun', 'Pensiun'],
  ['keluar', 'Keluar'],
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
  const tahun = useTahunOptions(jenis === 'mata-kuliah');
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
        ];
      case 'pegawai':
        return [
          { key: 'jenis', label: 'Jenis', type: 'select', options: opt([['dosen', 'Dosen'], ['tendik', 'Tenaga kependidikan']]), icon: <Users /> },
          { key: 'kategori', label: 'Kategori', type: 'select', options: opt([['tetap', 'Tetap'], ['tidak_tetap', 'Tidak tetap']]), icon: <Briefcase /> },
          { key: 'status_aktif', label: 'Status', type: 'select', options: STATUS_PEGAWAI, icon: <CircleDot /> },
          { key: 'kode_prodi', label: 'Prodi', type: 'select', options: prodi, icon: <Building2 />, searchable: true },
          { key: 'serdos', label: 'Bersertifikat dosen', type: 'boolean', icon: <BadgeCheck /> },
        ];
      case 'mata-kuliah':
        return [
          fProdi,
          { key: 'semester', label: 'Semester', type: 'select', options: Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: `Semester ${i + 1}` })), icon: <Layers /> },
          { key: 'tahun_id', label: 'Tahun akademik', type: 'select', options: tahun, icon: <Calendar /> },
        ];
      case 'dokumen':
        return [
          { key: 'pemilik_jenis', label: 'Pemilik', type: 'select', options: PEMILIK_ARSIP, icon: <Users /> },
          { key: 'status_verifikasi', label: 'Verifikasi', type: 'select', options: STATUS_VERIFIKASI, icon: <ShieldCheck /> },
          { key: 'status_arsip', label: 'Status arsip', type: 'select', options: STATUS_ARSIP, icon: <Archive /> },
          { key: 'akses', label: 'Akses', type: 'select', options: AKSES_ARSIP, icon: <Lock /> },
          { key: 'berlaku', label: 'Masa berlaku', type: 'select', options: opt([['berlaku', 'Masih berlaku'], ['akan_habis', 'Akan habis (90 hari)'], ['habis', 'Sudah habis']]), icon: <Calendar /> },
        ];
      case 'berkas':
        return [
          { key: 'status', label: 'Status berkas', type: 'select', options: opt([['terbuka', 'Terbuka'], ['ditutup', 'Ditutup']]), icon: <FolderOpen /> },
          { key: 'status_arsip', label: 'Status arsip', type: 'select', options: STATUS_ARSIP, icon: <Archive /> },
          { key: 'tahun', label: 'Tahun', type: 'select', options: angkatanOptions(10), icon: <Calendar /> },
        ];
      case 'surat-masuk':
        return [
          { key: 'status', label: 'Status', type: 'multi', options: STATUS_SURAT_MASUK, icon: <Inbox /> },
          { key: 'sifat', label: 'Sifat', type: 'multi', options: SIFAT_SURAT, icon: <Flag /> },
          { key: 'keamanan', label: 'Keamanan', type: 'multi', options: KEAMANAN_SURAT, icon: <Lock /> },
          { key: 'tanggal', label: 'Tanggal surat', type: 'date-range', params: ['dari', 'sampai'], icon: <Calendar /> },
          { key: 'perlu_tindakan', label: 'Perlu tindakan saya', type: 'boolean', icon: <BadgeCheck /> },
          { key: 'lewat_batas', label: 'Lewat batas waktu', type: 'boolean', icon: <Clock /> },
        ];
      case 'surat-keluar':
        return [
          { key: 'status', label: 'Status', type: 'multi', options: STATUS_SURAT_KELUAR, icon: <Send /> },
          { key: 'sifat', label: 'Sifat', type: 'multi', options: SIFAT_SURAT, icon: <Flag /> },
          { key: 'keamanan', label: 'Keamanan', type: 'multi', options: KEAMANAN_SURAT, icon: <Lock /> },
          { key: 'tanggal', label: 'Tanggal', type: 'date-range', params: ['dari', 'sampai'], icon: <Calendar /> },
          { key: 'perlu_tindakan', label: 'Menunggu persetujuan saya', type: 'boolean', icon: <BadgeCheck /> },
        ];
    }
  }, [jenis, prodi, tahun]);
}

export type FilterPreset = 'mahasiswa' | 'dosen' | 'pegawai' | 'mata-kuliah' | 'dokumen' | 'berkas' | 'surat-masuk' | 'surat-keluar';

const PLACEHOLDER: Record<FilterPreset, [string, string]> = {
  mahasiswa: ['Cari NIM atau nama', 'mahasiswa'],
  dosen: ['Cari NIDN atau nama', 'dosen'],
  pegawai: ['Cari nama, NIP, NIDN', 'pegawai'],
  'mata-kuliah': ['Cari kode atau nama MK', 'mata kuliah'],
  dokumen: ['Cari judul atau nomor dokumen', 'dokumen'],
  berkas: ['Cari nomor atau judul berkas', 'berkas'],
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
/** Saringan dosen: prodi, status → dosen.list(query). Jabatan dan serdos ada di FilterPegawai (sdm.getPegawai). */
export const FilterDosen = makePreset('dosen');
/** Saringan pegawai/tendik: jenis, kategori, status, prodi, serdos → sdm.getPegawai(query). */
export const FilterPegawai = makePreset('pegawai');
/** Saringan mata kuliah: prodi, semester, tahun akademik → mataKuliah.list(query). */
export const FilterMataKuliah = makePreset('mata-kuliah');
/** Saringan dokumen arsip: pemilik, verifikasi, status arsip, akses, masa berlaku → arsip.getDokumen(query). */
export const FilterDokumen = makePreset('dokumen');
/** Saringan berkas arsip: status berkas, status arsip, tahun → arsip.getBerkas(query). */
export const FilterBerkas = makePreset('berkas');
/** Saringan surat masuk: status, sifat, keamanan, tanggal (dari/sampai), perlu tindakan, lewat batas → arsip.getSuratMasuk(query). */
export const FilterSuratMasuk = makePreset('surat-masuk');
/** Saringan surat keluar: status, sifat, keamanan, tanggal (dari/sampai), menunggu persetujuan → arsip.getSuratKeluar(query). */
export const FilterSuratKeluar = makePreset('surat-keluar');
