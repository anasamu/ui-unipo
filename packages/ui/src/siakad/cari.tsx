'use client';
import * as React from 'react';
import type { Siakad } from 'unipo-siakad-sdk';
import { BookOpen, Building2, Globe2, GraduationCap, MapPin, School, UserRound, Users } from 'lucide-react';
import { Combobox, OptionContent, Select, type ComboboxProps, type SelectOption } from '../components/select';
import { Avatar } from '../components/display';
import { Badge } from '../components/actions';
import { Bendera, daftarNegara, type Negara } from './negara';
import { useOptionalSiakad, useSiakadQuery } from './provider';

/** Props bersama semua komponen Cari*. */
export type CariProps<T> = Omit<ComboboxProps<T>, 'items' | 'loadItems' | 'itemToString' | 'itemKey' | 'renderItem'> & {
  /** Ganti sumber data (mis. data contoh atau endpoint lain). */
  load?: (q: string, signal: AbortSignal) => Promise<T[]>;
  /** Jumlah hasil per pencarian. Bawaan 20. */
  limit?: number;
};

function useLoader<T>(defaultLoad: ((s: Siakad, q: string, signal: AbortSignal, limit: number) => Promise<T[]>) | null, custom: CariProps<T>['load'], limit = 20) {
  const siakad = useOptionalSiakad();
  return React.useCallback(
    (q: string, signal: AbortSignal) => {
      if (custom) return custom(q, signal);
      if (!siakad || !defaultLoad) return Promise.reject(new Error('SDK belum dipasang di <UnipoProvider>.'));
      return defaultLoad(siakad, q, signal, limit);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [siakad, custom, limit],
  );
}

// ================================================================ Mahasiswa
export interface MahasiswaOption {
  nim: string;
  nama: string;
  nama_prodi?: string | null;
  tahun_masuk?: string | null;
  status_aktif?: string | null;
  status_aktif_label?: string | null;
  foto?: string | null;
  [k: string]: unknown;
}
const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = { A: 'success', C: 'warning', D: 'danger', K: 'danger', L: 'info', N: 'neutral' };

export interface CariMahasiswaProps extends CariProps<MahasiswaOption> {
  /** Saringan tambahan ke GET /v1/mahasiswa (prodi, angkatan, status, nidn_pa, kelas). */
  filter?: { prodi?: string; angkatan?: string; status?: string; nidn_pa?: string; kelas?: string };
}
/** Cari mahasiswa berdasarkan NIM atau nama (SDK: mahasiswa.list). Token dosen otomatis dibatasi ke mahasiswa bimbingannya. */
export function CariMahasiswa({ load, limit, filter, placeholder = 'Cari NIM atau nama mahasiswa', ...props }: CariMahasiswaProps) {
  const f = JSON.stringify(filter ?? {});
  const loader = useLoader<MahasiswaOption>(
    async (s, q, signal, per_page) => (await s.mahasiswa.list({ ...JSON.parse(f), q: q || undefined, per_page }, { signal })).data as MahasiswaOption[],
    load,
    limit,
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const keyed = React.useCallback(loader, [loader, f]);
  return (
    <Combobox<MahasiswaOption>
      {...props}
      placeholder={placeholder}
      icon={<GraduationCap />}
      loadItems={keyed}
      itemToString={(m) => `${m.nim} · ${m.nama}`}
      itemKey={(m) => m.nim}
      emptyText="Mahasiswa tidak ditemukan."
      renderItem={(m) => (
        <>
          <Avatar name={m.nama} src={m.foto} size="sm" />
          <span className="u-option-text" style={{ flex: 1 }}>
            <span>{m.nama}</span>
            <span className="u-option-meta">
              <span className="u-mono">{m.nim}</span>
              {m.nama_prodi ? ` · ${m.nama_prodi}` : ''}
              {m.tahun_masuk ? ` · ${m.tahun_masuk}` : ''}
            </span>
          </span>
          {m.status_aktif_label && (
            <Badge variant={STATUS_TONE[m.status_aktif ?? ''] ?? 'neutral'} dot>
              {m.status_aktif_label}
            </Badge>
          )}
        </>
      )}
    />
  );
}

// ================================================================ Dosen
export interface DosenOption {
  nidn: string;
  nama: string;
  nama_lengkap?: string | null;
  nama_prodi?: string | null;
  jabatan_akademik?: string | null;
  foto?: string | null;
  [k: string]: unknown;
}
/** Cari dosen berdasarkan NIDN atau nama (SDK: dosen.list). */
export function CariDosen({ load, limit, filter, placeholder = 'Cari NIDN atau nama dosen', ...props }: CariProps<DosenOption> & { filter?: { prodi?: string; status?: string } }) {
  const f = JSON.stringify(filter ?? {});
  const loader = useLoader<DosenOption>(async (s, q, signal, per_page) => (await s.dosen.list({ ...JSON.parse(f), q: q || undefined, per_page }, { signal })).data as DosenOption[], load, limit);
  return (
    <Combobox<DosenOption>
      {...props}
      placeholder={placeholder}
      icon={<UserRound />}
      loadItems={loader}
      itemToString={(d) => d.nama_lengkap || d.nama}
      itemKey={(d) => d.nidn}
      emptyText="Dosen tidak ditemukan."
      renderItem={(d) => (
        <>
          <Avatar name={d.nama} src={d.foto} size="sm" />
          <OptionContent title={d.nama_lengkap || d.nama} meta={[d.nidn && `NIDN ${d.nidn}`, d.jabatan_akademik, d.nama_prodi].filter(Boolean).join(' · ')} />
        </>
      )}
    />
  );
}

// ================================================================ Pegawai (dosen + tendik)
export interface PegawaiOption {
  id: number;
  nama: string;
  nama_lengkap?: string | null;
  jenis?: 'dosen' | 'tendik';
  nidn?: string | null;
  nip?: string | null;
  unit_nama?: string | null;
  foto?: string | null;
  [k: string]: unknown;
}
/** Cari pegawai/tendik/dosen dari modul SDM (SDK: sdm.getPegawai). */
export function CariPegawai({ load, limit, jenis, placeholder = 'Cari nama, NIP, atau NIDN pegawai', ...props }: CariProps<PegawaiOption> & { jenis?: 'dosen' | 'tendik' }) {
  const loader = useLoader<PegawaiOption>(async (s, q, signal, per_page) => (await s.sdm.getPegawai({ jenis, q: q || undefined, per_page }, { signal })).data as PegawaiOption[], load, limit);
  return (
    <Combobox<PegawaiOption>
      {...props}
      placeholder={placeholder}
      icon={<Users />}
      loadItems={loader}
      itemToString={(p) => p.nama_lengkap || p.nama}
      itemKey={(p) => String(p.id)}
      emptyText="Pegawai tidak ditemukan."
      renderItem={(p) => (
        <>
          <Avatar name={p.nama} src={p.foto} size="sm" />
          <span className="u-option-text" style={{ flex: 1 }}>
            <span>{p.nama_lengkap || p.nama}</span>
            <span className="u-option-meta">{[p.nip && `NIP ${p.nip}`, p.unit_nama].filter(Boolean).join(' · ')}</span>
          </span>
          {p.jenis && <Badge variant={p.jenis === 'dosen' ? 'primary' : 'secondary'}>{p.jenis === 'dosen' ? 'Dosen' : 'Tendik'}</Badge>}
        </>
      )}
    />
  );
}

// ================================================================ Mata kuliah
export interface MataKuliahOption {
  id?: number;
  kode_mk: string;
  nama_mk: string;
  sks_mk?: number | null;
  semester?: string | number | null;
  kode_prodi?: string | null;
  [k: string]: unknown;
}
/** Cari mata kuliah berdasarkan kode atau nama (SDK: mataKuliah.list). */
export function CariMataKuliah({ load, limit, filter, placeholder = 'Cari kode atau nama mata kuliah', ...props }: CariProps<MataKuliahOption> & { filter?: { prodi?: string; tahun_id?: string; semester?: string } }) {
  const f = JSON.stringify(filter ?? {});
  const loader = useLoader<MataKuliahOption>(async (s, q, signal, per_page) => (await s.mataKuliah.list({ ...JSON.parse(f), q: q || undefined, per_page }, { signal })).data as MataKuliahOption[], load, limit);
  return (
    <Combobox<MataKuliahOption>
      {...props}
      placeholder={placeholder}
      icon={<BookOpen />}
      loadItems={loader}
      itemToString={(m) => `${m.kode_mk} · ${m.nama_mk}`}
      itemKey={(m) => `${m.kode_prodi ?? ''}:${m.kode_mk}`}
      emptyText="Mata kuliah tidak ditemukan."
      renderItem={(m) => (
        <>
          <span className="u-option-media" data-shape="square">
            <BookOpen size={14} />
          </span>
          <span className="u-option-text" style={{ flex: 1 }}>
            <span>{m.nama_mk}</span>
            <span className="u-option-meta">
              <span className="u-mono">{m.kode_mk}</span>
              {m.semester ? ` · Semester ${m.semester}` : ''}
            </span>
          </span>
          {m.sks_mk != null && <Badge variant="primary" shape="square">{m.sks_mk} SKS</Badge>}
        </>
      )}
    />
  );
}

// ================================================================ Sekolah asal
export interface SekolahOption {
  kode: string;
  nama: string;
  kota?: string | null;
  jenis?: string | null;
  [k: string]: unknown;
}
/** Cari sekolah asal (SMA/SMK/MA) untuk formulir PMB (SDK: pmb.getInfoSekolah, publik, minimal 3 huruf). */
export function CariSekolah({ load, limit, placeholder = 'Ketik nama sekolah, mis. SMA Negeri 1 Marisa', ...props }: CariProps<SekolahOption>) {
  const loader = useLoader<SekolahOption>(async (s, q, signal) => (await s.pmb.getInfoSekolah({ q }, { signal })).data as SekolahOption[], load, limit);
  return (
    <Combobox<SekolahOption>
      {...props}
      placeholder={placeholder}
      icon={<School />}
      loadItems={loader}
      minQueryLength={3}
      hintText="Ketik minimal 3 huruf nama atau NPSN sekolah."
      itemToString={(s) => s.nama}
      itemKey={(s) => s.kode}
      emptyText="Sekolah tidak ditemukan. Periksa ejaan atau hubungi panitia."
      renderItem={(s) => (
        <>
          <span className="u-option-media" data-shape="square">
            <School size={14} />
          </span>
          <OptionContent title={s.nama} meta={[s.jenis, s.kota].filter(Boolean).join(' · ')} />
        </>
      )}
    />
  );
}

// ================================================================ Perguruan tinggi
export interface PerguruanTinggiOption {
  kode: string;
  nama: string;
  singkatan?: string | null;
  kota?: string | null;
  logo?: string | null;
  [k: string]: unknown;
}
/**
 * Cari perguruan tinggi (mis. asal mahasiswa pindahan, mitra kerja sama, studi lanjut dosen).
 * API SIAKAD belum punya endpoint daftar PT nasional, jadi isi `load` (mis. dari mitra kerja sama atau data PDDikti Anda).
 */
export function CariPerguruanTinggi({ load, limit, placeholder = 'Cari nama perguruan tinggi', ...props }: CariProps<PerguruanTinggiOption>) {
  const loader = useLoader<PerguruanTinggiOption>(
    async (s, q, signal, per_page) =>
      ((await s.kerjasama.getMitra({ q: q || undefined, per_page }, { signal })).data as Array<Record<string, unknown>>).map((m) => ({
        kode: String(m.id ?? m.kode ?? m.nama),
        nama: String(m.nama ?? ''),
        kota: (m.kota as string) ?? null,
        logo: (m.logo_url as string) ?? null,
      })),
    load,
    limit,
  );
  return (
    <Combobox<PerguruanTinggiOption>
      {...props}
      placeholder={placeholder}
      icon={<Building2 />}
      loadItems={loader}
      itemToString={(p) => p.nama}
      itemKey={(p) => p.kode}
      emptyText="Perguruan tinggi tidak ditemukan."
      renderItem={(p) => (
        <>
          <span className="u-option-media" data-shape="square">
            {p.logo ? <img src={p.logo} alt="" /> : <Building2 size={14} />}
          </span>
          <OptionContent title={p.nama} meta={[p.singkatan, p.kota].filter(Boolean).join(' · ')} />
        </>
      )}
    />
  );
}

// ================================================================ Negara (data lokal + bendera)
/** Cari negara dengan bendera (kewarganegaraan, negara asal mahasiswa asing, alamat luar negeri). Tidak butuh API. */
export function CariNegara({ placeholder = 'Cari negara', ...props }: Omit<ComboboxProps<Negara>, 'items' | 'loadItems' | 'itemToString' | 'itemKey' | 'renderItem'>) {
  const items = React.useMemo(daftarNegara, []);
  const value = props.value;
  return (
    <Combobox<Negara>
      {...props}
      placeholder={placeholder}
      icon={value ? <Bendera kode={value.kode} size={18} /> : <Globe2 />}
      items={items}
      itemToString={(n) => n.nama}
      itemKey={(n) => n.kode}
      emptyText="Negara tidak ditemukan."
      renderItem={(n) => (
        <>
          <span className="u-option-media" data-shape="flag">
            <Bendera kode={n.kode} size={22} />
          </span>
          <span className="u-option-text" style={{ flex: 1 }}>
            <span>{n.nama}</span>
          </span>
          <span className="u-option-meta u-mono">{n.kode}</span>
        </>
      )}
    />
  );
}

// ================================================================ Wilayah
export interface WilayahOption {
  kode: string;
  nama: string;
  [k: string]: unknown;
}
/** Pilih provinsi lalu kabupaten/kota (SDK: tracer.getReferensiWilayah). */
export function CariWilayah({ propinsi, placeholder, ...props }: CariProps<WilayahOption> & { /** Kode provinsi: bila diisi, menampilkan kabupaten/kota di provinsi itu. */ propinsi?: string }) {
  const { data, loading } = useSiakadQuery(['wilayah', propinsi ?? ''], (s, signal) => s.tracer.getReferensiWilayah(propinsi ? { propinsi } : {}, { signal }));
  const items = ((data as Array<Record<string, unknown>> | undefined) ?? []).map((w) => ({ kode: String(w.kode ?? w.id), nama: String(w.nama ?? '') }));
  return (
    <Combobox<WilayahOption>
      {...props}
      placeholder={placeholder ?? (propinsi ? 'Cari kabupaten/kota' : 'Cari provinsi')}
      icon={<MapPin />}
      items={items}
      emptyText={loading ? 'Memuat…' : 'Wilayah tidak ditemukan.'}
      itemToString={(w) => w.nama}
      itemKey={(w) => w.kode}
    />
  );
}

// ================================================================ Pilihan referensi (Select)
type PilihProps<V> = { value?: V | null; onValueChange?: (v: V | null) => void; placeholder?: string; className?: string; id?: string; disabled?: boolean; size?: 'sm' | 'md' | 'lg'; 'aria-label'?: string };

/** Pilih program studi, dikelompokkan per fakultas (SDK: referensi.getProdi). */
export function PilihProdi({ placeholder = 'Semua program studi', ...props }: PilihProps<string>) {
  const { data } = useSiakadQuery(['referensi', 'prodi'], (s, signal) => s.referensi.getProdi({}, { signal }), { staleTime: 10 * 60_000 });
  const options: SelectOption<string>[] = (data ?? []).map((p) => ({
    value: String(p.kode_prodi),
    label: `${p.kode_jenjang ? p.kode_jenjang + ' ' : ''}${p.nama_prodi}`,
    group: p.nama_fakultas ?? undefined,
  }));
  return <Select<string> {...props} placeholder={placeholder} options={options} />;
}

/** Pilih tahun akademik/periode (SDK: referensi.getTahunAkademik). */
export function PilihTahunAkademik({ placeholder = 'Pilih periode', ...props }: PilihProps<string>) {
  const { data } = useSiakadQuery(['referensi', 'tahun'], (s, signal) => s.referensi.getTahunAkademik({}, { signal }), { staleTime: 10 * 60_000 });
  const options: SelectOption<string>[] = ((data as Array<Record<string, unknown>> | undefined) ?? []).map((t) => ({
    value: String(t.tahun_id),
    label: String(t.nama_tahun ?? t.tahun_id),
    description: t.aktif === true || t.buka === 'Y' ? 'Aktif' : undefined,
  }));
  return <Select<string> {...props} placeholder={placeholder} options={options} />;
}

