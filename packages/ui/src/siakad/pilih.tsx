'use client';
import * as React from 'react';
import { BookOpen, Briefcase, Building2, GraduationCap, Landmark, Network, UserRound, Users, UsersRound } from 'lucide-react';
import { Combobox, OptionContent } from '../components/select';
import type { ControlSize } from '../components/forms';
import { Avatar } from '../components/display';
import { Dialog } from '../components/overlays';
import { useOptionalSiakad } from './provider';
import { PilihUnit } from './pilih-unit';
import { BarisProdi, LogoFakultas, judulProdi, namaRapi, type ProdiReferensi } from './prodi';

type Baris = Record<string, unknown>;
const teks = (v: unknown) => (v == null ? '' : String(v));
const gabung = (...xs: unknown[]) => xs.filter((x) => x != null && x !== '').join(' · ');

/**
 * Sumber data untuk {@link PilihEntitas}: endpoint daftar (dengan pencarian `q`), kolom yang menjadi nilai
 * (ID/NIM/NIDN/username), dan cara menampilkan satu baris. Isi sendiri untuk tabel yang belum ada di
 * {@link SUMBER_ENTITAS}, mis. dari katalog OpenAPI.
 */
export interface SumberEntitas {
  /** Nama tunggal untuk teks bantuan, mis. "mahasiswa", "organisasi mahasiswa". */
  nama: string;
  /** Endpoint daftar, mis. `/v1/kemahasiswaan/ormawa`. Harus menerima `q` dan `per_page` (kecuali `klien`). */
  path: string;
  /** Kolom baris yang menjadi nilai, mis. `id`, `nim`, `username`. */
  kunci: string;
  /** Endpoint satu data untuk menampilkan nilai awal, dengan `{id}`, mis. `/v1/mahasiswa/{id}`. */
  satu?: string;
  /** Bila tidak ada `satu`: parameter daftar untuk mencari nilai awal, mis. `username`. Bawaan `q`. */
  saringKunci?: string;
  /** Daftar kecil tanpa pencarian server: dimuat sekali, disaring di browser. */
  klien?: boolean;
  /** Parameter tetap untuk endpoint daftar. */
  query?: Record<string, string | number | boolean | undefined>;
  judul: (r: Baris) => string;
  meta?: (r: Baris) => string;
  /** Avatar inisial/foto (orang) atau ikon (lainnya). */
  avatar?: boolean;
  ikon?: React.ReactNode;
  placeholder?: string;
  /** Tampilan baris sendiri di daftar pilihan (menggantikan avatar/ikon + judul + meta). */
  tampil?: (r: Baris) => React.ReactNode;
}

/** Sumber bawaan. Kunci objek ini dipakai sebagai `jenis` di <PilihEntitas jenis="mahasiswa" />. */
export const SUMBER_ENTITAS = {
  mahasiswa: {
    nama: 'mahasiswa',
    path: '/v1/mahasiswa',
    kunci: 'nim',
    satu: '/v1/mahasiswa/{id}',
    judul: (r) => teks(r.nama),
    meta: (r) => gabung(r.nim, namaRapi(teks(r.nama_prodi)), r.tahun_masuk),
    avatar: true,
    ikon: <GraduationCap />,
    placeholder: 'Cari NIM atau nama mahasiswa',
  },
  dosen: {
    nama: 'dosen',
    path: '/v1/dosen',
    kunci: 'nidn',
    satu: '/v1/dosen/{id}',
    judul: (r) => teks(r.nama_lengkap || r.nama),
    meta: (r) => gabung(r.nidn && `NIDN ${r.nidn}`, r.jabatan_akademik, namaRapi(teks(r.nama_prodi))),
    avatar: true,
    ikon: <UserRound />,
    placeholder: 'Cari NIDN atau nama dosen',
  },
  pegawai: {
    nama: 'pegawai',
    path: '/v1/sdm/pegawai',
    kunci: 'id',
    satu: '/v1/sdm/pegawai/{id}',
    judul: (r) => teks(r.nama_lengkap || r.nama),
    meta: (r) => gabung(r.nip && `NIP ${r.nip}`, r.nidn && `NIDN ${r.nidn}`, r.unit_nama),
    avatar: true,
    ikon: <Users />,
    placeholder: 'Cari nama, NIP, atau NIDN pegawai',
  },
  /** Akun pengguna (user.username): mahasiswa, dosen, tendik, admin. */
  pengguna: {
    nama: 'pengguna',
    path: '/v1/induk/orang',
    kunci: 'username',
    saringKunci: 'username',
    judul: (r) => teks(r.nama),
    meta: (r) => gabung(r.username, r.email),
    avatar: true,
    ikon: <UserRound />,
    placeholder: 'Cari nama, username, atau email',
  },
  /** Orang (identitas tunggal, induk_orang.id). */
  orang: {
    nama: 'orang',
    path: '/v1/induk/orang',
    kunci: 'id',
    satu: '/v1/induk/orang/{id}',
    judul: (r) => teks(r.nama),
    meta: (r) => gabung(r.username, r.email),
    avatar: true,
    ikon: <UserRound />,
    placeholder: 'Cari nama, NIK, username, atau email',
  },
  /** Orang dicocokkan dengan NIK. */
  nik: {
    nama: 'orang',
    path: '/v1/induk/orang',
    kunci: 'nik',
    saringKunci: 'nik',
    judul: (r) => teks(r.nama),
    meta: (r) => gabung(r.nik && `NIK ${r.nik}`, r.username),
    avatar: true,
    ikon: <UserRound />,
    placeholder: 'Cari nama atau NIK',
  },
  ormawa: {
    nama: 'organisasi mahasiswa',
    path: '/v1/kemahasiswaan/ormawa',
    kunci: 'id',
    satu: '/v1/kemahasiswaan/ormawa/{id}',
    judul: (r) => teks(r.nama),
    meta: (r) => gabung(r.kode, r.jenis, r.bidang),
    ikon: <UsersRound />,
    placeholder: 'Cari nama atau kode ormawa',
  },
  'mata-kuliah': {
    nama: 'mata kuliah',
    path: '/v1/mata-kuliah',
    kunci: 'kode_mk',
    judul: (r) => teks(r.nama_mk),
    meta: (r) => gabung(r.kode_mk, r.sks_mk != null && `${r.sks_mk} SKS`, r.semester && `Semester ${r.semester}`),
    ikon: <BookOpen />,
    placeholder: 'Cari kode atau nama mata kuliah',
  },
  prodi: {
    nama: 'program studi',
    path: '/v1/referensi/prodi',
    kunci: 'kode_prodi',
    klien: true,
    judul: (r) => judulProdi(r as unknown as ProdiReferensi),
    meta: (r) => gabung(r.kode_prodi, namaRapi(teks(r.nama_fakultas))),
    // Logo fakultas, "S1 Teknik Sipil", kode + fakultas, lencana akreditasi dan status prodi.
    tampil: (r) => <BarisProdi prodi={r as unknown as ProdiReferensi} ringkas />,
    ikon: <GraduationCap />,
    placeholder: 'Cari program studi',
  },
  fakultas: {
    nama: 'fakultas',
    path: '/v1/referensi/fakultas',
    kunci: 'kode_fakultas',
    klien: true,
    judul: (r) => namaRapi(teks(r.nama_fakultas || r.nama)),
    meta: (r) => teks(r.kode_fakultas),
    tampil: (r) => (
      <>
        <LogoFakultas kode={teks(r.kode_fakultas)} nama={teks(r.nama_fakultas || r.nama)} logo={(r.logo as string | null | undefined) ?? null} ukuran="sm" />
        <OptionContent title={namaRapi(teks(r.nama_fakultas || r.nama))} meta={teks(r.kode_fakultas)} />
      </>
    ),
    ikon: <Landmark />,
    placeholder: 'Cari fakultas',
  },
  unit: {
    nama: 'unit',
    path: '/v1/induk/unit',
    // Unit nonaktif (mis. unit bawaan yang tidak ada di kampus ini) tidak ditawarkan; nilai lama tetap terbaca lewat `satu`.
    query: { aktif: 1 },
    kunci: 'id',
    satu: '/v1/induk/unit/{id}',
    judul: (r) => teks(r.nama),
    meta: (r) => gabung(r.singkatan || r.kode, r.jenis),
    ikon: <Network />,
    placeholder: 'Cari nama atau kode unit',
  },
  jabatan: {
    nama: 'jabatan',
    path: '/v1/induk/jabatan',
    kunci: 'id',
    satu: '/v1/induk/jabatan/{id}',
    judul: (r) => teks(r.nama),
    meta: (r) => gabung(r.kode, r.kelompok),
    ikon: <Briefcase />,
    placeholder: 'Cari jabatan',
  },
} satisfies Record<string, SumberEntitas>;

export type JenisEntitas = keyof typeof SUMBER_ENTITAS;

/**
 * Tebak jenis entitas dari nama kolom dan keterangannya, untuk formulir yang dibangun otomatis dari skema API.
 * Contoh: `pengaju_nim` + "m_mahasiswa.NIM" → mahasiswa, `konselor` + "user.username" → pengguna,
 * `ormawa_id` + "ID di kmhs_ormawa" → ormawa. Mengembalikan null bila bukan rujukan ke data lain
 * (kolom isian biasa seperti NIK pada formulir data pribadi tetap diketik).
 */
export function jenisEntitasDariKolom(nama: string, keterangan = ''): JenisEntitas | null {
  const n = nama.toLowerCase();
  const k = keterangan.toLowerCase();
  if (/m_mahasiswa\.nim|\bnim\b/.test(k) || /(^|_)nim$/.test(n)) return 'mahasiswa';
  if (/m_dosen|\bnidn\b/.test(k) || /(^|_)nidn$/.test(n)) return 'dosen';
  if (/user\.username|\busername\b/.test(k) || /(^|_)username$/.test(n)) return 'pengguna';
  if (/kmhs_ormawa|kemahasiswaan_ormawa/.test(k) || n === 'ormawa_id') return 'ormawa';
  if (/sdm_pegawai/.test(k) || n === 'pegawai_id' || n === 'sdm_pegawai_id') return 'pegawai';
  if (/induk_orang\.nik/.test(k)) return 'nik';
  if (/induk_orang/.test(k) || n === 'orang_id') return 'orang';
  if (/induk_unit|sdm_unit/.test(k) || n === 'unit_id') return 'unit';
  if (/induk_jabatan/.test(k) || n === 'jabatan_id') return 'jabatan';
  if (/m_mata_kuliah|kode_mk/.test(k) || n === 'kode_mk') return 'mata-kuliah';
  if (/(^|_)kode_prodi$/.test(n) || /m_prodi|kode_prodi/.test(k)) return 'prodi';
  if (/(^|_)kode_fakultas$/.test(n) || /m_fakultas|kode_fakultas/.test(k)) return 'fakultas';
  return null;
}

export interface PilihEntitasProps {
  /** Jenis bawaan (`mahasiswa`, `dosen`, `pegawai`, `pengguna`, `orang`, `nik`, `ormawa`, `mata-kuliah`, `prodi`, `fakultas`, `unit`, `jabatan`) atau sumber sendiri. */
  jenis: JenisEntitas | SumberEntitas;
  /** Nilai = isi kolom kunci (ID, NIM, NIDN, username). */
  value?: string | number | null;
  defaultValue?: string | number | null;
  /** Dipanggil dengan nilai kunci (string) dan baris lengkapnya; null saat dikosongkan. */
  onValueChange?: (value: string | null, item: Baris | null) => void;
  /** Saringan tambahan ke endpoint daftar, mis. `{ prodi: '55201' }`. */
  query?: Record<string, string | number | boolean | undefined>;
  /** Ganti pemuat (data contoh/uji). */
  load?: (q: string, signal: AbortSignal) => Promise<Baris[]>;
  limit?: number;
  placeholder?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
  size?: ControlSize;
  className?: string;
  'aria-label'?: string;
  /**
   * Izinkan menambah data baru bila yang dicari tidak ditemukan (tombol "Tambah …" di kaki daftar). Isi `form` untuk
   * membuka dialog formulir (panggil `selesai(barisBaru)` setelah tersimpan), atau `onTambah` untuk menyimpan langsung.
   * Data baru langsung terpilih.
   */
  tambah?: TambahEntitas;
}

export interface TambahEntitas {
  /** Judul dialog. Bawaan "Tambah <nama entitas>". */
  judul?: React.ReactNode;
  label?: (kata: string) => React.ReactNode;
  /** Tampilkan tombol tambah hanya bila pencarian tidak menemukan apa pun. */
  hanyaKosong?: boolean;
  form?: (ctx: { kata: string; selesai: (baris: Record<string, unknown> | null) => void }) => React.ReactNode;
  onTambah?: (kata: string) => Promise<Record<string, unknown> | null>;
}

/**
 * Isian cari-dan-pilih untuk merujuk data lain, pengganti isian ID/NIM/NIDN/username yang diketik manual.
 * Nilainya tetap kunci (mis. NIM), jadi bisa langsung dipakai di formulir dan dikirim ke API. Nilai awal
 * ditampilkan sebagai nama, bukan angka.
 *
 * ```tsx
 * <PilihEntitas jenis="mahasiswa" value={nim} onValueChange={setNim} />
 * <PilihEntitas jenis="ormawa" name="ormawa_id" defaultValue={baris.ormawa_id} />
 * <PilihEntitas jenis={jenisEntitasDariKolom(kolom.nama, kolom.keterangan) ?? 'pengguna'} ... />
 * ```
 */
export function PilihEntitas(props: PilihEntitasProps) {
  // Unit organisasi memakai pemilih berpohon yang sama di semua aplikasi (kecuali pemuat/tambah sendiri).
  if (props.jenis === 'unit' && !props.load && !props.tambah) {
    const { value, defaultValue, onValueChange, placeholder, name, id, disabled, size, className } = props;
    return (
      <PilihUnit
        value={value}
        defaultValue={defaultValue}
        onValueChange={(v, u) => onValueChange?.(v == null ? null : String(v), (u as Baris | null) ?? null)}
        placeholder={placeholder}
        name={name}
        id={id}
        disabled={disabled}
        size={size}
        className={className}
        aria-label={props['aria-label']}
      />
    );
  }
  return <PilihEntitasDasar {...props} />;
}

function PilihEntitasDasar({ jenis, value, defaultValue, onValueChange, query, load, limit = 20, placeholder, name, id, disabled, size, className, tambah, ...rest }: PilihEntitasProps) {
  const [dialogTambah, setDialogTambah] = React.useState<{ kata: string; selesai: (b: Baris | null) => void } | null>(null);
  const siakad = useOptionalSiakad();
  const src: SumberEntitas = typeof jenis === 'string' ? SUMBER_ENTITAS[jenis] : jenis;
  const kunciDari = React.useCallback((r: Baris) => teks(r[src.kunci]), [src.kunci]);
  const [inner, setInner] = React.useState<string | null>(defaultValue == null || defaultValue === '' ? null : String(defaultValue));
  const nilai = value !== undefined ? (value == null || value === '' ? null : String(value)) : inner;
  const [item, setItem] = React.useState<Baris | null>(null);
  const q = JSON.stringify(query ?? {});

  // Cache daftar kecil (mode klien) per komponen.
  const semua = React.useRef<Promise<Baris[]> | null>(null);
  React.useEffect(() => {
    semua.current = null;
  }, [src.path, q]);

  const ambilDaftar = React.useCallback(
    async (kata: string, signal: AbortSignal, ekstra: Record<string, unknown> = {}): Promise<Baris[]> => {
      if (load) return load(kata, signal);
      if (!siakad) throw new Error('SDK belum dipasang di <UnipoProvider>.');
      if (src.klien) {
        semua.current ??= siakad.request<Baris[]>({ method: 'GET', path: src.path, query: { ...src.query, ...JSON.parse(q) } }).then((r) => (Array.isArray(r.data) ? r.data : []));
        const rows = await semua.current;
        const t = kata.trim().toLowerCase();
        return t ? rows.filter((r) => `${src.judul(r)} ${src.meta?.(r) ?? ''} ${kunciDari(r)}`.toLowerCase().includes(t)) : rows;
      }
      const r = await siakad.request<Baris[]>({ method: 'GET', path: src.path, query: { ...src.query, ...JSON.parse(q), q: kata || undefined, per_page: limit, ...ekstra } }, { signal });
      return Array.isArray(r.data) ? r.data : [];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [siakad, load, src.path, src.klien, q, limit],
  );

  // Nilai dari luar (mis. formulir ubah) → muat barisnya agar tampil sebagai nama.
  React.useEffect(() => {
    if (!nilai) return setItem(null);
    if (item && kunciDari(item) === nilai) return;
    const stub: Baris = { [src.kunci]: nilai, __stub: true };
    setItem(stub);
    const ctrl = new AbortController();
    (async () => {
      if (src.satu && siakad && !load) {
        const r = await siakad.request<Baris>({ method: 'GET', path: src.satu, query: { id: nilai } }, { signal: ctrl.signal });
        return r.data;
      }
      const rows = await ambilDaftar(src.saringKunci ? '' : nilai, ctrl.signal, src.saringKunci ? { [src.saringKunci]: nilai } : {});
      return rows.find((r) => kunciDari(r) === nilai) ?? null;
    })()
      .then((r) => !ctrl.signal.aborted && r && kunciDari(r) === nilai && setItem(r))
      .catch(() => undefined);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nilai, src.path, src.kunci]);

  const label = (r: Baris) => (r.__stub ? teks(r[src.kunci]) : src.judul(r) || kunciDari(r));
  const opsiTambah = tambah
    ? {
        label: tambah.label ?? ((k: string) => (k ? `Tambah ${src.nama} “${k}”` : `Tambah ${src.nama} baru`)),
        hanyaKosong: tambah.hanyaKosong,
        onTambah: (kata: string): Promise<Baris | null> => {
          if (tambah.form) return new Promise((resolve) => setDialogTambah({ kata, selesai: resolve }));
          return tambah.onTambah ? tambah.onTambah(kata) : Promise.resolve(null);
        },
      }
    : undefined;
  const selesaiTambah = (b: Baris | null) => {
    dialogTambah?.selesai(b);
    setDialogTambah(null);
    if (b) semua.current = null;
  };
  return (
    <>
      <Combobox<Baris>
        tambah={opsiTambah}
        {...rest}
        id={id}
        name={name}
        size={size}
        disabled={disabled}
        className={className}
        placeholder={placeholder ?? src.placeholder ?? `Cari ${src.nama}`}
        icon={src.ikon}
        loadItems={ambilDaftar}
        value={item}
        onValueChange={(r) => {
          const k = r ? kunciDari(r) : null;
          setItem(r);
          setInner(k);
          onValueChange?.(k, r);
        }}
        itemToString={label}
        itemKey={kunciDari}
        emptyText={`Tidak ada ${src.nama} yang cocok.`}
        renderItem={(r) =>
          src.tampil && !r.__stub ? (
            src.tampil(r)
          ) : (
            <>
              {src.avatar ? (
                <Avatar name={label(r)} src={typeof r.foto === 'string' ? r.foto : undefined} size="sm" />
              ) : (
                <span className="u-option-media" data-shape="square">
                  {src.ikon ?? <Building2 size={14} />}
                </span>
              )}
              <OptionContent title={label(r)} meta={src.meta?.(r)} />
            </>
          )
        }
      />
      {tambah?.form && (
        <Dialog open={Boolean(dialogTambah)} onOpenChange={(o) => !o && selesaiTambah(null)} title={tambah.judul ?? `Tambah ${src.nama}`}>
          {dialogTambah && tambah.form({ kata: dialogTambah.kata, selesai: selesaiTambah })}
        </Dialog>
      )}
    </>
  );
}
