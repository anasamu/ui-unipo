'use client';
import { BookOpen, CalendarRange, Database, GraduationCap, Layers, Scale, Target, UserRound } from 'lucide-react';
import { IsianDaftar, IsianTanggal, opsiDariPeta } from '../components/formulir';
import { NumberField } from '../components/forms';
import { PilihEntitas } from '../siakad/pilih';
import { sumberDariAcuan, type BagianSkema, type IsianSkemaProps } from './isian';
import { FormulirSumber, type FormulirSumberProps } from './kelola';
import type { NilaiForm } from './aturan';
import type { Baris } from './tipe';

/**
 * Formulir tambah/ubah per fitur yang dibangun di atas skema katalog: aturan validasi, kolom wajib, dan galat 422
 * sama persis dengan backend, sedangkan tata letaknya dirancang per fitur (bagian berjudul, pilihan dengan
 * pencarian, angka dengan tombol +/−, tanggal, dan rujukan data lain lewat pilih-cari).
 */

type Dasar = Omit<FormulirSumberProps, 'sumber' | 'bagian'>;

// ================================================================ Rujukan dan konstanta backend
/** Jenis MK (Neo Feeder, KurikulumObe\Support\Regulasi::JENIS_MK). */
export const JENIS_MK_OBE: Record<string, string> = {
  A: 'Wajib',
  B: 'Pilihan',
  C: 'Wajib peminatan',
  D: 'Pilihan peminatan',
  S: 'Tugas akhir/skripsi/tesis/disertasi',
  W: 'Wajib nasional',
};
/** Kelompok MK lama (r_kode aplikasi 10). */
export const KELOMPOK_MK_OBE: Record<string, string> = {
  A: 'MPK - Pengembangan kepribadian',
  B: 'MKK - Keilmuan dan keterampilan',
  C: 'MKB - Keahlian berkarya',
  D: 'MPB - Perilaku berkarya',
  E: 'MBB - Berkehidupan bermasyarakat',
  F: 'MKU/MKDU',
  G: 'MKDK',
  H: 'MKK',
};
/** Bentuk pembelajaran Pasal 16 ayat 1 Permendiktisaintek 39/2025. */
export const BENTUK_PEMBELAJARAN_OBE = [
  'kuliah',
  'responsi',
  'tutorial',
  'seminar',
  'praktikum',
  'praktik',
  'studio',
  'penelitian',
  'perancangan',
  'pengembangan',
  'tugas_akhir',
  'pelatihan_bela_negara',
  'pertukaran_pelajar',
  'magang',
  'wirausaha',
  'pengabdian_masyarakat',
  'proyek',
  'lainnya',
];

const TAHUN_AKADEMIK = sumberDariAcuan({ l: '/v1/referensi/tahun-akademik', k: 'tahun_id', q: 0 }, 'tahun_akademik');
const angka = (v: unknown) => (v === '' || v == null || Number.isNaN(Number(v)) ? 0 : Number(v));

/** Pilih-cari tahun akademik (semester) untuk isian `tahun_id_*`. */
function renderTahun(p: IsianSkemaProps) {
  return (
    <PilihEntitas
      id={p.id}
      jenis={TAHUN_AKADEMIK}
      value={p.value ? String(p.value) : null}
      disabled={p.disabled}
      onValueChange={(v) => {
        p.onValueChange(v ?? '');
        p.onBlur?.();
      }}
    />
  );
}
/** Angka dengan tombol +/− (SKS, semester, masa tempuh). */
function renderAngka(opsi: { min?: number; max?: number; step?: number } = {}) {
  return function IsianAngka(p: IsianSkemaProps) {
    const v = p.value === '' || p.value == null ? null : Number(p.value);
    return (
      <NumberField
        id={p.id}
        value={Number.isNaN(v as number) ? null : v}
        min={opsi.min ?? p.skema.min}
        max={opsi.max ?? p.skema.mx}
        step={opsi.step ?? 1}
        disabled={p.disabled}
        onValueChange={(x) => p.onValueChange(x ?? '')}
      />
    );
  };
}
function renderTanggal(p: IsianSkemaProps) {
  return <IsianTanggal id={p.id} value={typeof p.value === 'string' ? p.value : null} disabled={p.disabled} onValueChange={(v) => (p.onValueChange(v), p.onBlur?.())} />;
}

// ================================================================ Kurikulum
/** Bagian formulir kurikulum OBE, urut seperti dokumen kurikulum. */
export const BAGIAN_KURIKULUM: BagianSkema[] = [
  { judul: 'Identitas kurikulum', keterangan: 'Program studi, kode (unik per prodi), dan nama kurikulum.', ikon: <BookOpen />, kolom: ['kode_prodi', 'kode', 'nama', 'nama_en'] },
  {
    judul: 'Masa berlaku dan penetapan',
    keterangan: 'Semester mulai dan akhir berlaku, regulasi acuan, dan SK penetapan.',
    ikon: <CalendarRange />,
    kolom: ['tahun_id_mulai', 'tahun_id_selesai', 'tahun_berlaku', 'regulasi', 'no_sk', 'tanggal_sk'],
  },
  {
    judul: 'Beban dan masa studi',
    keterangan: 'Masa studi maksimal paling lama dua kali masa tempuh. SKS wajib + pilihan sebaiknya sama dengan SKS lulus.',
    ikon: <Scale />,
    kolom: ['masa_tempuh', 'masa_studi_maks', 'ipk_min_lulus', 'sks_lulus', 'sks_wajib', 'sks_pilihan'],
    columns: 3,
  },
  {
    judul: 'Rumusan kurikulum',
    keterangan: 'Bagian naratif dokumen kurikulum (Pasal 9–10 dan 16).',
    ikon: <Target />,
    kolom: ['visi_keilmuan', 'kompetensi_utama', 'metode_pembelajaran', 'modalitas_pembelajaran', 'syarat_masuk', 'penilaian', 'tata_cara_penerimaan', 'tugas_akhir'],
    columns: 1,
  },
  { judul: 'Integrasi PDDikti', keterangan: 'Diisi otomatis saat sinkron Neo Feeder; ubah hanya bila perlu.', ikon: <Database />, kolom: ['id_kurikulum_feeder', 'keterangan'] },
];

/** Ringkasan SKS kurikulum: wajib + pilihan dibandingkan SKS lulus. */
export function RingkasanSksKurikulum({ nilai }: { nilai: NilaiForm }) {
  const lulus = angka(nilai.sks_lulus);
  const wajib = angka(nilai.sks_wajib);
  const pilihan = angka(nilai.sks_pilihan);
  if (!lulus && !wajib && !pilihan) return null;
  const jumlah = wajib + pilihan;
  const nada = !lulus || jumlah === lulus ? 'baik' : 'peringatan';
  return (
    <p className="u-form-ringkas-sks" data-nada={nada} aria-live="polite">
      <span>
        Wajib <b>{wajib}</b> + pilihan <b>{pilihan}</b> = <b>{jumlah}</b> SKS
      </span>
      {lulus > 0 && <span>{jumlah === lulus ? `sesuai SKS lulus (${lulus})` : `SKS lulus ${lulus}, selisih ${Math.abs(lulus - jumlah)}`}</span>}
    </p>
  );
}

export type FormKurikulumProps = Dasar;

/**
 * Tambah/ubah kurikulum OBE (POST /v1/kurikulum-obe/kurikulum, PUT …/{id}). Prodi dan semester berlaku dipilih
 * lewat pencarian, beban studi dengan tombol +/−, dan ringkasan SKS ikut berubah saat diketik.
 *
 * ```tsx
 * <FormKurikulum trigger={<Button>Tambah kurikulum</Button>} />
 * <FormKurikulum baris={kurikulum} open={ubah} onOpenChange={setUbah} />
 * ```
 */
export function FormKurikulum(props: FormKurikulumProps) {
  return (
    <FormulirSumber
      sumber="/v1/kurikulum-obe/kurikulum"
      bagian={BAGIAN_KURIKULUM}
      size="xl"
      judul={props.baris ? 'Ubah kurikulum' : 'Tambah kurikulum'}
      labelSimpan={props.baris ? 'Simpan perubahan' : 'Tambah kurikulum'}
      lebar={['nama', 'nama_en']}
      label={{
        kode_prodi: 'Program studi',
        kode: 'Kode kurikulum',
        nama_en: 'Nama (bahasa Inggris)',
        tahun_id_mulai: 'Mulai berlaku',
        tahun_id_selesai: 'Berakhir',
        no_sk: 'Nomor SK',
        tanggal_sk: 'Tanggal SK',
        ipk_min_lulus: 'IPK minimal lulus',
        id_kurikulum_feeder: 'ID kurikulum Neo Feeder',
      }}
      keterangan={{ regulasi: 'Mis. Permendiktisaintek No. 39 Tahun 2025', tahun_id_selesai: 'Kosongkan bila masih berlaku' }}
      render={{
        tahun_id_mulai: renderTahun,
        tahun_id_selesai: renderTahun,
        tanggal_sk: renderTanggal,
        tahun_berlaku: renderAngka({ min: 2000, max: 2100 }),
        masa_tempuh: renderAngka({ min: 1, max: 14 }),
        masa_studi_maks: renderAngka({ min: 1, max: 28 }),
        sks_lulus: renderAngka({ min: 0, max: 300 }),
        sks_wajib: renderAngka({ min: 0, max: 300 }),
        sks_pilihan: renderAngka({ min: 0, max: 300 }),
        ipk_min_lulus: renderAngka({ min: 0, max: 4, step: 0.01 }),
      }}
      setelah={{ sks_pilihan: (n) => <RingkasanSksKurikulum nilai={n} /> }}
      {...props}
    />
  );
}

// ================================================================ Mata kuliah kurikulum
export const BAGIAN_MK_KURIKULUM: BagianSkema[] = [
  { judul: 'Identitas mata kuliah', keterangan: 'Kode, nama, jenis, dan letak semester.', ikon: <BookOpen />, kolom: ['kode_mk', 'nama', 'nama_en', 'jenis', 'semester', 'urutan'] },
  {
    judul: 'Bobot SKS',
    keterangan: 'Satu SKS = 45 jam belajar per semester. Total SKS sebaiknya sama dengan jumlah komponennya.',
    ikon: <Scale />,
    kolom: ['sks', 'sks_tatap_muka', 'sks_praktikum', 'sks_praktik_lapangan', 'sks_simulasi', 'pertemuan'],
    columns: 3,
  },
  {
    judul: 'Pembelajaran dan penilaian',
    keterangan: 'Bentuk pembelajaran (boleh lebih dari satu), modalitas, dan bentuk nilai.',
    ikon: <GraduationCap />,
    kolom: ['bentuk_pembelajaran', 'modalitas', 'bentuk_nilai', 'luar_prodi'],
  },
  { judul: 'Pengelompokan', ikon: <Layers />, kolom: ['kelompok', 'kode_kurikulum', 'idks'] },
  { judul: 'Koordinator dan deskripsi', ikon: <UserRound />, kolom: ['nidn_koordinator', 'deskripsi'] },
  { judul: 'Integrasi PDDikti', ikon: <Database />, kolom: ['id_matkul_feeder'] },
];

const KOMPONEN_SKS = ['sks_tatap_muka', 'sks_praktikum', 'sks_praktik_lapangan', 'sks_simulasi'];

/** Ringkasan bobot SKS mata kuliah: jumlah komponen dibandingkan total. */
export function RingkasanSksMk({ nilai }: { nilai: NilaiForm }) {
  const total = angka(nilai.sks);
  const komponen = KOMPONEN_SKS.reduce((t, k) => t + angka(nilai[k]), 0);
  if (!total && !komponen) return null;
  const sama = Math.abs(total - komponen) < 0.001;
  return (
    <p className="u-form-ringkas-sks" data-nada={sama ? 'baik' : 'peringatan'} aria-live="polite">
      <span>
        Komponen <b>{komponen}</b> SKS · total <b>{total || komponen}</b> SKS
      </span>
      <span>
        {sama ? `≈ ${Math.round((total || komponen) * 45)} jam belajar per semester` : !total ? 'Total diisi otomatis dari komponen saat disimpan' : `Selisih ${Math.abs(total - komponen)} SKS`}
      </span>
    </p>
  );
}

export interface FormMataKuliahKurikulumProps extends Dasar {
  /** ID kurikulum untuk menambah MK baru (POST /v1/kurikulum-obe/kurikulum/{id}/mk). Tidak perlu saat mengubah. */
  kurikulumId?: number | string;
  /** Saringan pilih koordinator, mis. `{ prodi: '55201' }`. */
  prodi?: string;
}

/**
 * Tambah MK ke kurikulum atau ubah MK (PUT /v1/kurikulum-obe/mk/{mk}). Jenis, kelompok, dan bentuk pembelajaran
 * berupa pilihan dari konstanta backend; koordinator dipilih dari daftar dosen; bobot SKS dengan tombol +/−
 * dan total otomatis bila dikosongkan.
 */
export function FormMataKuliahKurikulum({ kurikulumId, baris, prodi, olahBody, ...props }: FormMataKuliahKurikulumProps) {
  const ubah = Boolean(baris);
  const sks = renderAngka({ min: 0, max: 24, step: 1 });
  return (
    <FormulirSumber
      sumber={ubah ? '/v1/kurikulum-obe/mk' : '/v1/kurikulum-obe/kurikulum/{id}/mk'}
      induk={ubah ? undefined : { id: kurikulumId }}
      baris={baris as Baris | null | undefined}
      bagian={BAGIAN_MK_KURIKULUM}
      size="xl"
      judul={ubah ? 'Ubah mata kuliah' : 'Tambah mata kuliah'}
      deskripsi={ubah ? undefined : 'Isi total SKS saja (dianggap tatap muka) atau rinci per komponen; total dihitung otomatis.'}
      labelSimpan={ubah ? 'Simpan perubahan' : 'Tambah mata kuliah'}
      lebar={['nama', 'nama_en']}
      label={{
        kode_mk: 'Kode MK',
        nama_en: 'Nama (bahasa Inggris)',
        sks: 'Total SKS',
        sks_tatap_muka: 'Tatap muka',
        sks_praktikum: 'Praktikum',
        sks_praktik_lapangan: 'Praktik lapangan',
        sks_simulasi: 'Simulasi',
        luar_prodi: 'Bisa ditempuh di luar prodi',
        kode_kurikulum: 'Sifat',
        idks: 'Konsentrasi',
        nidn_koordinator: 'Dosen koordinator',
        id_matkul_feeder: 'ID mata kuliah Neo Feeder',
      }}
      keterangan={{
        semester: 'Kosongkan untuk MK pilihan bebas',
        sks: 'Kosongkan agar dihitung dari komponen',
        kelompok: 'Kelompok MK kurikulum lama (MPK, MKK, …)',
        kode_kurikulum: 'Kurikulum inti atau institusional',
        idks: 'Kosongkan bila berlaku untuk semua konsentrasi',
      }}
      opsi={{
        kelompok: opsiDariPeta(KELOMPOK_MK_OBE),
        kode_kurikulum: [
          { value: 'A', label: 'Inti' },
          { value: 'B', label: 'Institusi' },
        ],
        bentuk_nilai: [
          { value: 'ip', label: 'Huruf mutu (A–E)' },
          { value: 'lulus', label: 'Lulus/tidak lulus' },
        ],
      }}
      render={{
        semester: renderAngka({ min: 1, max: 14 }),
        urutan: renderAngka({ min: 0, max: 999 }),
        pertemuan: renderAngka({ min: 0, max: 32 }),
        sks,
        sks_tatap_muka: sks,
        sks_praktikum: sks,
        sks_praktik_lapangan: sks,
        sks_simulasi: sks,
        bentuk_pembelajaran: (p) => (
          <IsianDaftar id={p.id} value={Array.isArray(p.value) ? p.value.map(String) : []} onValueChange={p.onValueChange} disabled={p.disabled} enumNilai={BENTUK_PEMBELAJARAN_OBE} />
        ),
        nidn_koordinator: (p) => (
          <PilihEntitas
            id={p.id}
            jenis="dosen"
            value={p.value ? String(p.value) : null}
            query={prodi ? { prodi } : undefined}
            disabled={p.disabled}
            onValueChange={(v) => {
              p.onValueChange(v ?? '');
              p.onBlur?.();
            }}
          />
        ),
      }}
      setelah={{ pertemuan: (n) => <RingkasanSksMk nilai={n} /> }}
      olahBody={(b, n) => {
        const out = { ...b };
        const komponen = KOMPONEN_SKS.reduce((t, k) => t + angka(n[k]), 0);
        if ((n.sks === '' || n.sks == null) && komponen > 0) out.sks = komponen;
        return olahBody ? olahBody(out, n) : out;
      }}
      {...props}
    />
  );
}
