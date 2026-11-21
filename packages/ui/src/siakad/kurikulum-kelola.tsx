'use client';
import * as React from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Download,
  Copy,
  FileText,
  GitBranch,
  GraduationCap,
  Layers,
  ListChecks,
  MoreHorizontal,
  Network,
  PenLine,
  Plus,
  Printer,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Undo2,
  Upload,
  Users,
  Wand2,
} from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { formatBytes, formatDate, formatNumber } from '../lib/format';
import { Badge, Button } from '../components/actions';
import { Alert, Empty, Progress, Table, TableContainer, Tabs } from '../components/display';
import { Panel } from '../components/charts';
import { ConfirmDialog, Dialog, Menu, Sheet, useToast, type MenuEntry } from '../components/overlays';
import { Checkbox, CheckboxGroup, Field, Input, SegmentedControl, Switch, Textarea } from '../components/forms';
import { Select, type SelectOption } from '../components/select';
import { DataTable, type DataColumn } from '../components/data-table';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { PilihEntitas } from './pilih';
import { PilihBerkas } from './pilih-berkas';
import { PilihNomorSK } from './isian-sk';
import { PilihTahunAkademik } from './cari';
import { RpsMenurutKerangka, type IsianKerangka } from './kurikulum-aturan';
import { PanelLangkah, type PanelLangkahStep } from '../components/panel-langkah';
import { WizardReview } from '../components/wizard';
import {
  DrafDipulihkan,
  IsianKerangkaDinamis,
  RujukanAturan,
  nilaiKirim,
  periksaIsianKerangka,
  ringkasNilaiIsian,
  useAturanKurikulumBerlaku,
  useDrafWizard,
  wajibMenurut,
} from './kurikulum-wizard';
import {
  CapaianCplKurikulum,
  JENIS_MK,
  MatriksKurikulum,
  RANAH_CPL,
  RingkasanKurikulum,
  RpsMataKuliah,
  StatusKurikulumBadge,
  ValidasiKurikulum,
  maksSksSemester,
  useBahanKajian,
  useCplKurikulum,
  useDaftarKurikulum,
  useEkuivalensi,
  useKurikulum,
  useMataKuliahObe,
  useMkKurikulum,
  usePeninjauan,
  useProfilLulusan,
  useRps,
  type BahanKajian,
  type Cpl,
  type Cpmk,
  type Ekuivalensi,
  type Kurikulum,
  type MkKurikulum,
  type NamaMatriks,
  type Peninjauan,
  type ProfilLulusan,
  type RanahCpl,
  type Rps,
  type StatusKurikulum,
} from './kurikulum';
import { IsianAngka } from '../components/isian-angka';
import { IsianTanggal } from '../components/formulir';
import { keAngka, teksAngka } from '../lib/angka';

/*
 * Kelola Kurikulum OBE (/v1/kurikulum-obe, Permendiktisaintek 39/2025) untuk prodi, fakultas, dan BAAK:
 * identitas & beban belajar, alur status (ajukan, sahkan dengan SK, berlakukan, arsip, revisi), angkatan pengguna,
 * profil lulusan, CPL, bahan kajian, mata kuliah per semester dengan batas SKS dan prasyarat, CPMK & sub-CPMK, RPS
 * (identitas, rencana pertemuan, rencana evaluasi berbobot, pengesahan), matriks pemetaan, ekuivalensi MK lama-baru,
 * peninjauan kurikulum, capaian CPL, dan penerbitan ke tabel mata kuliah SIAKAD lama.
 *
 * Tombol ubah mengikuti `hak` dari API (GET /kurikulum/{id} → hak), dan dapat dipersempit lewat prop `hak`.
 */

// ================================================================ Tipe & util
const P = '/v1/kurikulum-obe';
type Angka = number | string | null | undefined;
const n = (v: Angka) => (v == null || v === '' ? 0 : Number(v) || 0);
const kosongJadiNull = (v: string | null | undefined) => (v == null || v.trim() === '' ? null : v.trim());
const angkaAtauNull = (v: string | number | null | undefined) => (v == null || v === '' ? null : Number(v));

/** Hak pengguna atas satu kurikulum (dari API `hak`, bisa dipersempit aplikasi). */
export interface HakKurikulum {
  /** Menyusun isi kurikulum prodi (kaprodi/sekprodi/pengelola kurikulum). */
  susun?: boolean;
  /** Mengubah struktur: hanya saat draf/diajukan. */
  ubah_struktur?: boolean;
  /** Mengesahkan/memberlakukan/mengarsipkan kurikulum (pimpinan). */
  sahkan?: boolean;
  /** Impor/terbit ke tabel SIAKAD lama (BAAK/operator). */
  migrasi?: boolean;
  /** Menyusun RPS. */
  rps?: boolean;
}
type KurikulumLengkap = Kurikulum & {
  hak?: HakKurikulum;
  transisi_saya?: StatusKurikulum[];
  nama_en?: string | null;
  masa_studi_maks?: number | null;
  visi_keilmuan?: string | null;
  kompetensi_utama?: string | null;
  metode_pembelajaran?: string | null;
  modalitas_pembelajaran?: string | null;
  syarat_masuk?: string | null;
  penilaian?: string | null;
  tata_cara_penerimaan?: string | null;
  tugas_akhir?: string | null;
  keterangan?: string | null;
  id_kurikulum_feeder?: string | null;
  tahun_id_selesai?: string | null;
  induk_id?: number | null;
};
type MkDetail = MkKurikulum & {
  kurikulum_id?: number;
  nama_en?: string | null;
  sks_tatap_muka?: Angka;
  sks_praktikum?: Angka;
  sks_praktik_lapangan?: Angka;
  sks_simulasi?: Angka;
  kelompok?: string | null;
  kode_kurikulum?: string | null;
  bentuk_nilai?: string | null;
  bentuk_pembelajaran?: string[] | null;
  luar_prodi?: boolean | number | null;
  pertemuan?: number | null;
  nidn_koordinator?: string | null;
  nama_koordinator?: string | null;
  id_matkul_feeder?: string | null;
  legacy_id?: number | null;
  bahan_kajian?: Array<{ id: number; kode: string; nama: string }>;
  rps?: Array<{ id: number; versi: number; tahun_id?: string | null; status: string; disahkan_at?: string | null; updated_at?: string | null }>;
  prasyarat_rinci?: Array<{ prasyarat_id: number; kode_mk: string; nama: string; jenis: string; nilai_min?: string | null }>;
};

const SEMESTER_OPSI: SelectOption<string>[] = [
  ...Array.from({ length: 14 }, (_, i) => ({ value: String(i + 1), label: `Semester ${i + 1}` })),
  { value: '', label: 'Pilihan bebas (tanpa semester paket)' },
];
const JENIS_MK_OPSI: SelectOption<string>[] = Object.entries(JENIS_MK).map(([value, label]) => ({ value, label }));
const KELOMPOK_MK: Record<string, string> = {
  A: 'MPK – Pengembangan kepribadian',
  B: 'MKK – Keilmuan dan keterampilan',
  C: 'MKB – Keahlian berkarya',
  D: 'MPB – Perilaku berkarya',
  E: 'MBB – Berkehidupan bermasyarakat',
  F: 'MKU/MKDU',
  G: 'MKDK',
  H: 'MKK',
};
const BENTUK_PEMBELAJARAN = [
  'kuliah', 'responsi', 'tutorial', 'seminar', 'praktikum', 'praktik', 'studio', 'penelitian', 'perancangan', 'pengembangan',
  'tugas_akhir', 'pelatihan_bela_negara', 'pertukaran_pelajar', 'magang', 'wirausaha', 'pengabdian_masyarakat', 'proyek', 'lainnya',
];
const MODALITAS: SelectOption<string>[] = [
  { value: 'luring', label: 'Luring (tatap muka)' },
  { value: 'daring', label: 'Daring' },
  { value: 'bauran', label: 'Bauran (blended)' },
];
const JENIS_EVALUASI_OPSI: SelectOption<string>[] = [
  { value: '1', label: 'Aktivitas partisipatif' },
  { value: '2', label: 'Hasil proyek' },
  { value: '3', label: 'Kognitif: tugas' },
  { value: '4', label: 'Kognitif: ujian' },
];
const KOMPONEN_SIAKAD: SelectOption<string>[] = [
  { value: '', label: 'Tidak dipetakan' },
  { value: 'Harian', label: 'Harian' },
  { value: 'Tugas', label: 'Tugas' },
  { value: 'HDR', label: 'Kehadiran (HDR)' },
  { value: 'UTS', label: 'UTS' },
  { value: 'UAS', label: 'UAS' },
];
const label = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const tahunLabel = (t?: string | null) => (t && t.length === 5 ? `${t.slice(0, 4)}/${Number(t.slice(0, 4)) + 1} ${t[4] === '1' ? 'Ganjil' : t[4] === '2' ? 'Genap' : 'Pendek'}` : (t ?? '–'));
const pilihan = (m: { jenis?: string }) => m.jenis === 'B' || m.jenis === 'D';

/** Ambil pesan per kolom dari galat 422 (details = { kolom: pesan }). */
function galatKolom(e: unknown): Record<string, string> {
  const d = (e as { status?: number; details?: Record<string, unknown> } | null)?.details;
  if (!d || typeof d !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(d)) if (typeof v === 'string') out[k] = v;
  return out;
}

/** Kirim permintaan tulis + toast + invalidasi cache kurikulum. */
function useKirim() {
  const siakad = useSiakad();
  const toast = useToast();
  const [sibuk, setSibuk] = React.useState(false);
  const [galat, setGalat] = React.useState<unknown>(null);
  const kirim = React.useCallback(
    async <T,>(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown, sukses?: string): Promise<T | undefined> => {
      setSibuk(true);
      setGalat(null);
      try {
        const res = await siakad.request<T>({ method, path, body });
        if (sukses) toast.add({ title: sukses, type: 'success' });
        invalidateSiakad('kur');
        return ((res as { data?: T })?.data ?? (res as T)) as T;
      } catch (e) {
        setGalat(e);
        throw e;
      } finally {
        setSibuk(false);
      }
    },
    [siakad, toast],
  );
  return { kirim, sibuk, galat, setGalat, kolom: galatKolom(galat) };
}
const abaikan = () => undefined;

function KotakGalat({ galat }: { galat: unknown }) {
  if (!galat) return null;
  const kolom = galatKolom(galat);
  const rinci = Object.entries(kolom);
  return (
    <Alert variant="danger" title={pesanGalat(galat)}>
      {rinci.length > 0 && (
        <ul className="u-kk-galat-list">
          {rinci.map(([k, v]) => (
            <li key={k}>
              <code>{k}</code> {v}
            </li>
          ))}
        </ul>
      )}
    </Alert>
  );
}

/** Gabung hak dari API dan aplikasi: aplikasi hanya bisa mempersempit. */
export function useHakKurikulum(kurikulumId: number | string | undefined, batas?: HakKurikulum): HakKurikulum & { data?: KurikulumLengkap } {
  const q = useKurikulum(kurikulumId);
  const k = q.data as KurikulumLengkap | undefined;
  const api = k?.hak ?? {};
  const pakai = (x: keyof HakKurikulum) => !!api[x] && (batas?.[x] ?? true);
  return { susun: pakai('susun'), ubah_struktur: pakai('ubah_struktur'), sahkan: pakai('sahkan'), migrasi: pakai('migrasi'), rps: pakai('rps'), data: k };
}

// ================================================================ Identitas kurikulum
export interface FormKurikulumObeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Isi untuk mengubah; kosong = kurikulum baru (draf). */
  kurikulum?: KurikulumLengkap | null;
  /** Prodi bawaan saat membuat. */
  kodeProdi?: string;
  /** Batasi pilihan prodi (mis. prodi yang dikelola kaprodi). Kosong = semua prodi dari referensi aturan kurikulum. */
  pilihanProdi?: Array<{ kode_prodi: string; nama_prodi: string }>;
  onSelesai?: (k: KurikulumLengkap) => void;
}

const A_KUR = '/v1/kurikulum-aturan';
/** Bagian kerangka (primitif) yang diisi berupa daftar butir di wizard identitas, dengan endpoint butirnya. */
const BUTIR_KERANGKA: Record<string, JenisButir> = { profil_lulusan: 'profil-lulusan', cpl: 'cpl', bahan_kajian: 'bahan-kajian' };
const NAMA_BAWAAN: Record<string, string> = { profil_lulusan: 'Profil lulusan', cpl: 'Capaian pembelajaran lulusan (CPL)', bahan_kajian: 'Bahan kajian' };
type ButirBaru = { kode: string; nama: string; deskripsi: string; ranah: RanahCpl };
type DaftarBaru = Record<JenisButir, ButirBaru[]>;
const BARU_KOSONG: DaftarBaru = { 'profil-lulusan': [], cpl: [], 'bahan-kajian': [] };
type NilaiIsian = Record<string, Record<string, unknown>>;
interface IsianKurikulum {
  skema: Array<{ kode: string; nama: string; isian: IsianKerangka[] }>;
  nilai: NilaiIsian;
}
const potong = (s: string, n = 140) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * Identitas kurikulum sebagai WIZARD di panel samping. Langkah mengikuti aturan kurikulum berversi yang berlaku untuk
 * prodi & tahun berlakunya (kerangka sebagai data): Identitas → Beban belajar (batas dari aturan) → Uraian → bagian
 * kerangka berbentuk daftar (profil lulusan, CPL, bahan kajian; hanya yang dituntut kerangka, wajib minimal satu) →
 * isian bagian kerangka dinamis (mode ubah) → Tinjau. Payload identitas tetap POST/PUT /kurikulum; butir baru dikirim
 * ke endpoint butir yang sama dengan tab CPL/profil/bahan kajian; isian dinamis ke PUT /v1/kurikulum-aturan/isian.
 * Mode ubah bisa lompat ke langkah mana pun. Isian yang belum disimpan dipulihkan saat panel dibuka lagi.
 */
export function FormKurikulumObe({ open, onOpenChange, kurikulum, kodeProdi, pilihanProdi, onSelesai }: FormKurikulumObeProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const ubah = !!kurikulum;
  const terkunci = ubah && !['draf', 'diajukan'].includes(kurikulum!.status);
  const prodiAwal = kurikulum?.kode_prodi ?? kodeProdi ?? pilihanProdi?.[0]?.kode_prodi ?? '';
  const awal = React.useMemo(
    () => ({
      kode_prodi: prodiAwal,
      kode: kurikulum?.kode ?? '',
      nama: kurikulum?.nama ?? '',
      nama_en: kurikulum?.nama_en ?? '',
      tahun_berlaku: String(kurikulum?.tahun_berlaku ?? new Date().getFullYear()),
      sks_lulus: kurikulum?.sks_lulus != null ? String(kurikulum.sks_lulus) : '',
      sks_wajib: kurikulum?.sks_wajib != null ? String(kurikulum.sks_wajib) : '',
      sks_pilihan: kurikulum?.sks_pilihan != null ? String(kurikulum.sks_pilihan) : '',
      masa_tempuh: kurikulum?.masa_tempuh != null ? String(kurikulum.masa_tempuh) : '',
      masa_studi_maks: kurikulum?.masa_studi_maks != null ? String(kurikulum.masa_studi_maks) : '',
      ipk_min_lulus: kurikulum?.ipk_min_lulus != null ? String(kurikulum.ipk_min_lulus) : '',
      visi_keilmuan: kurikulum?.visi_keilmuan ?? '',
      kompetensi_utama: kurikulum?.kompetensi_utama ?? '',
      metode_pembelajaran: kurikulum?.metode_pembelajaran ?? '',
      penilaian: kurikulum?.penilaian ?? '',
      tugas_akhir: kurikulum?.tugas_akhir ?? '',
      syarat_masuk: kurikulum?.syarat_masuk ?? '',
      keterangan: kurikulum?.keterangan ?? '',
      id_kurikulum_feeder: kurikulum?.id_kurikulum_feeder ?? '',
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kurikulum, prodiAwal],
  );
  const [f, setF] = React.useState(awal);
  const [baru, setBaru] = React.useState<DaftarBaru>(BARU_KOSONG);
  const [isian, setIsian] = React.useState<NilaiIsian | null>(null);
  const [step, setStep] = React.useState(0);
  const dibuat = React.useRef<KurikulumLengkap | null>(null);
  const { kirim, kolom, setGalat } = useKirim();
  React.useEffect(() => {
    if (!open) return;
    setF(awal);
    setBaru(BARU_KOSONG);
    setIsian(null);
    setStep(0);
    setGalat(null);
    dibuat.current = null;
  }, [open, awal, setGalat]);
  const drafKunci = ubah ? `kurikulum:${kurikulum!.id}` : `kurikulum:baru:${prodiAwal}`;
  const draf = useDrafWizard(
    drafKunci,
    open,
    React.useMemo(() => ({ f, baru, isian }), [f, baru, isian]),
    (d) => {
      setF({ ...awal, ...d.f });
      setBaru({ ...BARU_KOSONG, ...d.baru });
      if (d.isian) setIsian(d.isian);
    },
    (d) => JSON.stringify(d.f) === JSON.stringify(awal) && Object.values(d.baru).every((x) => !x.length) && d.isian === null,
  );
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const ref = useSiakadQuery<{ prodi: Array<{ kode_prodi: string; nama: string }> }>(['kurikulum-aturan', 'referensi'], (s, signal) => s.request({ method: 'GET', path: `${A_KUR}/referensi` }, { signal }), {
    enabled: open && !ubah && !pilihanProdi?.length,
    staleTime: 120_000,
  });
  const opsiProdi = pilihanProdi?.length ? pilihanProdi.map((p) => ({ value: p.kode_prodi, label: p.nama_prodi })) : (ref.data?.prodi ?? []).map((p) => ({ value: p.kode_prodi, label: p.nama }));
  const namaProdi = kurikulum?.nama_prodi ?? opsiProdi.find((p) => p.value === f.kode_prodi)?.label ?? f.kode_prodi;

  const a = useAturanKurikulumBerlaku({ prodi: f.kode_prodi || null, kurikulumId: kurikulum?.id, angkatan: Number(f.tahun_berlaku) || undefined, aktif: open });
  const st = a.isi?.struktur;
  const sksMin = st?.sks_lulus ?? kurikulum?.jenjang?.sks_min ?? null;
  const studiMaks = st?.masa_studi?.maks ?? null;
  const tempuhNormal = st?.masa_studi?.normal ?? kurikulum?.jenjang?.masa_tempuh ?? null;
  const ipkMin = a.isi?.kelulusan?.ipk_min ?? null;
  const sumberBatas = a.versi ? `menurut ${a.versi.nama} v${a.versi.versi}` : 'menurut ketentuan jenjang';

  // Bagian berbentuk daftar butir: dari kerangka aturan bila ada; tanpa aturan ditampilkan tanpa kewajiban.
  const bagianButir = (a.versi ? a.bagian.filter((b) => BUTIR_KERANGKA[b.kode]) : Object.keys(BUTIR_KERANGKA).map((kode) => ({ kode, nama: NAMA_BAWAAN[kode]! }))).map((b) => ({
    kode: b.kode,
    nama: b.nama,
    jenis: BUTIR_KERANGKA[b.kode]!,
    wajib: !!a.versi,
  }));
  const idKur = kurikulum?.id;
  const adaProfil = useProfilLulusan(open && idKur ? idKur : undefined);
  const adaCpl = useCplKurikulum(open && idKur ? idKur : undefined);
  const adaBk = useBahanKajian(open && idKur ? idKur : undefined);
  const ada: Record<JenisButir, Array<{ kode: string; teks: string }>> = {
    'profil-lulusan': (adaProfil.data ?? []).map((x) => ({ kode: x.kode, teks: x.nama })),
    cpl: (adaCpl.data ?? []).map((x) => ({ kode: x.kode, teks: x.deskripsi })),
    'bahan-kajian': (adaBk.data ?? []).map((x) => ({ kode: x.kode, teks: x.nama })),
  };
  const isianQ = useSiakadQuery<IsianKurikulum>(['kurikulum-aturan', 'isian', 'kurikulum', idKur], (s, signal) => s.request({ method: 'GET', path: `${A_KUR}/isian`, query: { entitas: 'kurikulum', kunci: String(idKur) } }, { signal }), {
    enabled: open && !!idKur,
    staleTime: 0,
  });
  const skema = (isianQ.data?.skema ?? []).filter((b) => b.isian.length);
  const nilaiIsian = isian ?? isianQ.data?.nilai ?? {};

  const angka = (k: keyof typeof f) => (f[k] === '' ? null : Number(String(f[k]).replace(',', '.')));
  const cekBeban = (): string | null => {
    if (terkunci) return null;
    const sks = angka('sks_lulus');
    const wajib = angka('sks_wajib');
    const pil = angka('sks_pilihan');
    const tempuh = angka('masa_tempuh');
    const maks = angka('masa_studi_maks');
    const ipk = angka('ipk_min_lulus');
    if ([sks, wajib, pil, tempuh, maks, ipk].some((x) => x != null && (!Number.isFinite(x) || x < 0))) return 'Isian beban belajar harus angka positif.';
    if (sks != null && sksMin && sks < sksMin) return `SKS lulus paling sedikit ${sksMin} ${sumberBatas}.`;
    if (sks != null && wajib != null && pil != null && wajib + pil > sks) return `SKS wajib (${wajib}) + pilihan (${pil}) melebihi SKS lulus (${sks}).`;
    if (tempuh != null && maks != null && maks < tempuh) return 'Masa studi paling lama tidak boleh lebih pendek dari masa tempuh.';
    if (tempuh != null && maks != null && maks > tempuh * 2) return 'Masa studi paling lama maksimal 2× masa tempuh.';
    if (maks != null && studiMaks && maks > studiMaks) return `Masa studi paling lama ${studiMaks} semester ${sumberBatas}.`;
    if (ipk != null && (ipk < 0 || ipk > 4)) return 'IPK minimal lulus antara 0 dan 4.';
    return null;
  };
  const cekButir = (b: (typeof bagianButir)[number]): string | null => {
    const rows = baru[b.jenis];
    const cpl = b.jenis === 'cpl';
    if (rows.some((r) => !r.kode.trim() || (cpl ? !r.deskripsi.trim() : !r.nama.trim()))) return `Lengkapi kode dan ${cpl ? 'rumusan' : 'nama'} setiap ${b.nama.toLowerCase()}, atau hapus barisnya.`;
    const kode = [...ada[b.jenis].map((x) => x.kode), ...rows.map((r) => r.kode.trim())].map((x) => x.toLowerCase());
    const ganda = kode.find((x, i) => kode.indexOf(x) !== i);
    if (ganda) return `Kode ${ganda.toUpperCase()} dipakai lebih dari sekali.`;
    if (b.wajib && !terkunci && ada[b.jenis].length + rows.length === 0) return `Tambahkan minimal satu ${b.nama.toLowerCase()}. ${wajibMenurut(a)}`;
    return null;
  };
  const setBaris = (j: JenisButir, i: number, x: Partial<ButirBaru>) => setBaru((s) => ({ ...s, [j]: s[j].map((r, k) => (k === i ? { ...r, ...x } : r)) }));

  const steps: PanelLangkahStep[] = [
    {
      id: 'identitas',
      title: 'Identitas',
      description: 'Program studi, kode, nama, dan tahun mulai berlaku. Aturan kurikulum yang berlaku dibaca dari sini.',
      error: !!(kolom.kode || kolom.nama || kolom.kode_prodi || kolom.tahun_berlaku),
      validate: () => {
        if (!ubah && !f.kode_prodi) return 'Pilih program studi.';
        if (a.memuat) return 'Tunggu sebentar, aturan kurikulum sedang dimuat.';
        if (!f.kode.trim()) return 'Isi kode kurikulum.';
        if (!f.nama.trim()) return 'Isi nama kurikulum.';
        const t = Number(f.tahun_berlaku);
        if (f.tahun_berlaku && (!Number.isInteger(t) || t < 2000 || t > 2100)) return 'Tahun berlaku tidak wajar.';
        return null;
      },
      content: (
        <div className="u-kk-form">
          <DrafDipulihkan waktu={draf.dipulihkan} onBuang={() => { draf.buang(); setF(awal); setBaru(BARU_KOSONG); setIsian(null); }} />
          {terkunci && (
            <Alert variant="info" title="Kurikulum sudah disahkan">
              Kode, beban belajar, dan kompetensi utama terkunci. Ubah lewat revisi (versi baru); uraian lain dan id Feeder tetap bisa diubah.
            </Alert>
          )}
          {!ubah && (
            <Field label="Program studi" required error={kolom.kode_prodi}>
              <Select value={f.kode_prodi || null} onValueChange={(v) => set('kode_prodi')(v ? String(v) : '')} options={opsiProdi} placeholder="Pilih…" />
            </Field>
          )}
          <div className="u-kk-grid">
            <Field label="Kode kurikulum" required error={kolom.kode} description="Unik per prodi, mis. K2026">
              <Input value={f.kode} disabled={terkunci} onChange={(e) => set('kode')(e.target.value)} placeholder="K2026" />
            </Field>
            <Field label="Tahun mulai berlaku" error={kolom.tahun_berlaku} description="Menentukan versi aturan kurikulum yang diikuti.">
              <IsianAngka ribuan={false} value={keAngka(f.tahun_berlaku)} onValueChange={(n) => set('tahun_berlaku')(teksAngka(n))} />
            </Field>
          </div>
          <Field label="Nama kurikulum" required error={kolom.nama}>
            <Input value={f.nama} onChange={(e) => set('nama')(e.target.value)} placeholder="Kurikulum OBE 2026" />
          </Field>
          <Field label="Nama dalam bahasa Inggris" optional error={kolom.nama_en}>
            <Input value={f.nama_en} onChange={(e) => set('nama_en')(e.target.value)} placeholder="OBE Curriculum 2026" />
          </Field>
          <RujukanAturan aturan={a} prodiDipilih={!!f.kode_prodi} />
        </div>
      ),
    },
    {
      id: 'beban',
      title: 'Beban belajar',
      description: terkunci ? 'Terkunci karena kurikulum sudah disahkan.' : `Kosongkan untuk memakai ketentuan bawaan. Batas ${sumberBatas}.`,
      optional: true,
      error: !!(kolom.sks_lulus || kolom.sks_wajib || kolom.sks_pilihan || kolom.masa_tempuh || kolom.masa_studi_maks || kolom.ipk_min_lulus),
      validate: cekBeban,
      content: (
        <div className="u-kk-form">
          <div className="u-kk-grid u-kk-grid-3">
            <Field label="SKS untuk lulus" error={kolom.sks_lulus} description={sksMin ? `Minimal ${sksMin} SKS ${sumberBatas}.` : 'Kosongkan = minimal jenjang.'}>
              <IsianAngka value={keAngka(f.sks_lulus)} disabled={terkunci} placeholder={sksMin ? String(sksMin) : undefined} onValueChange={(n) => set('sks_lulus')(teksAngka(n))} />
            </Field>
            <Field label="SKS mata kuliah wajib" error={kolom.sks_wajib}>
              <IsianAngka value={keAngka(f.sks_wajib)} disabled={terkunci} onValueChange={(n) => set('sks_wajib')(teksAngka(n))} />
            </Field>
            <Field label="SKS mata kuliah pilihan" error={kolom.sks_pilihan}>
              <IsianAngka value={keAngka(f.sks_pilihan)} disabled={terkunci} onValueChange={(n) => set('sks_pilihan')(teksAngka(n))} />
            </Field>
            <Field label="Masa tempuh normal (semester)" error={kolom.masa_tempuh}>
              <IsianAngka value={keAngka(f.masa_tempuh)} disabled={terkunci} placeholder={tempuhNormal ? String(tempuhNormal) : undefined} onValueChange={(n) => set('masa_tempuh')(teksAngka(n))} />
            </Field>
            <Field label="Masa studi paling lama" error={kolom.masa_studi_maks} description={studiMaks ? `Paling lama ${studiMaks} semester ${sumberBatas}.` : 'Paling lama 2× masa tempuh.'}>
              <IsianAngka value={keAngka(f.masa_studi_maks)} disabled={terkunci} placeholder={studiMaks ? String(studiMaks) : undefined} onValueChange={(n) => set('masa_studi_maks')(teksAngka(n))} />
            </Field>
            <Field label="IPK minimal lulus" error={kolom.ipk_min_lulus} description={ipkMin ? `Aturan: ${ipkMin}` : undefined}>
              <IsianAngka value={keAngka(f.ipk_min_lulus)} desimal={2} langkah={0.01} disabled={terkunci} placeholder={ipkMin ? String(ipkMin) : undefined} onValueChange={(n) => set('ipk_min_lulus')(teksAngka(n))} />
            </Field>
          </div>
          {a.pasal('struktur') ? <p className="u-kw-bantuan">Dasar: {a.pasal('struktur')}</p> : null}
        </div>
      ),
    },
    {
      id: 'uraian',
      title: 'Uraian kurikulum',
      description: 'Uraian naratif dokumen kurikulum (Pasal 44). Semua tidak wajib dan bisa dilengkapi nanti.',
      optional: true,
      content: (
        <div className="u-kk-form">
          <Field label="Visi keilmuan" optional>
            <Textarea rows={2} value={f.visi_keilmuan} onChange={(e) => set('visi_keilmuan')(e.target.value)} />
          </Field>
          <Field label="Kompetensi utama lulusan" optional description={terkunci ? 'Terkunci setelah disahkan.' : undefined}>
            <Textarea rows={3} disabled={terkunci} value={f.kompetensi_utama} onChange={(e) => set('kompetensi_utama')(e.target.value)} />
          </Field>
          <Field label="Metode dan modalitas pembelajaran" optional>
            <Textarea rows={2} value={f.metode_pembelajaran} onChange={(e) => set('metode_pembelajaran')(e.target.value)} />
          </Field>
          <Field label="Sistem penilaian" optional>
            <Textarea rows={2} value={f.penilaian} onChange={(e) => set('penilaian')(e.target.value)} />
          </Field>
          <Field label="Tugas akhir" optional description="Bentuk tugas akhir (skripsi, proyek, prototipe, dll.)">
            <Textarea rows={2} value={f.tugas_akhir} onChange={(e) => set('tugas_akhir')(e.target.value)} />
          </Field>
          <Field label="Syarat masuk" optional>
            <Textarea rows={2} value={f.syarat_masuk} onChange={(e) => set('syarat_masuk')(e.target.value)} />
          </Field>
          <div className="u-kk-grid">
            <Field label="id_kurikulum Neo Feeder" optional description="Untuk pelaporan PDDikti.">
              <Input value={f.id_kurikulum_feeder} onChange={(e) => set('id_kurikulum_feeder')(e.target.value)} />
            </Field>
            <Field label="Keterangan" optional>
              <Input value={f.keterangan} onChange={(e) => set('keterangan')(e.target.value)} />
            </Field>
          </div>
        </div>
      ),
    },
    ...bagianButir.map(
      (b): PanelLangkahStep => ({
        id: `bagian-${b.kode}`,
        title: b.nama,
        description: b.wajib ? wajibMenurut(a, 'minimal satu') : 'Tidak diwajibkan aturan; bisa dilengkapi nanti di ruang kerja kurikulum.',
        optional: !b.wajib,
        validate: () => cekButir(b),
        content: (
          <div className="u-kk-form">
            {ada[b.jenis].length ? (
              <>
                <p className="u-kw-bantuan">Sudah tercatat ({ada[b.jenis].length}). Ubah atau hapus di tab {b.nama} ruang kerja kurikulum.</p>
                <ul className="u-kw-ada">
                  {ada[b.jenis].map((x) => (
                    <li key={x.kode}>
                      <b>{x.kode}</b>
                      <span>{potong(x.teks)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {terkunci ? (
              <Alert variant="info">Kurikulum sudah disahkan; butir baru ditambahkan lewat revisi.</Alert>
            ) : (
              <>
                {baru[b.jenis].map((r, i) => (
                  <div key={i} className="u-kw-baris">
                    <header>
                      <span>
                        {b.nama} baru {i + 1}
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => setBaru((s) => ({ ...s, [b.jenis]: s[b.jenis].filter((_, k) => k !== i) }))}>
                        <Trash2 /> Hapus
                      </Button>
                    </header>
                    <div className="u-kk-grid">
                      <Field label="Kode" required>
                        <Input value={r.kode} onChange={(e) => setBaris(b.jenis, i, { kode: e.target.value })} placeholder={NAMA_BUTIR[b.jenis].contoh} />
                      </Field>
                      {b.jenis === 'cpl' ? (
                        <Field label="Ranah" required>
                          <Select value={r.ranah} onValueChange={(v) => setBaris(b.jenis, i, { ranah: (v ?? 'sikap') as RanahCpl })} options={Object.entries(RANAH_CPL).map(([value, l]) => ({ value, label: l }))} placeholder="Pilih…" />
                        </Field>
                      ) : (
                        <Field label="Nama" required>
                          <Input value={r.nama} onChange={(e) => setBaris(b.jenis, i, { nama: e.target.value })} />
                        </Field>
                      )}
                    </div>
                    <Field label={b.jenis === 'cpl' ? 'Rumusan' : 'Deskripsi'} required={b.jenis === 'cpl'} optional={b.jenis !== 'cpl'} description={b.jenis === 'cpl' ? 'Mulai dengan kata kerja terukur, mis. "Mampu merancang…"' : undefined}>
                      <Textarea rows={2} value={r.deskripsi} onChange={(e) => setBaris(b.jenis, i, { deskripsi: e.target.value })} />
                    </Field>
                  </div>
                ))}
                <div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setBaru((s) => ({
                        ...s,
                        [b.jenis]: [...s[b.jenis], { kode: `${NAMA_BUTIR[b.jenis].contoh.replace(/\d+$/, '')}${ada[b.jenis].length + s[b.jenis].length + 1}`, nama: '', deskripsi: '', ranah: 'keterampilan_khusus' as RanahCpl }],
                      }))
                    }
                  >
                    <Plus /> Tambah {b.nama.toLowerCase()}
                  </Button>
                </div>
              </>
            )}
          </div>
        ),
      }),
    ),
    ...(skema.length
      ? [
          {
            id: 'isian-kerangka',
            title: skema.length === 1 ? skema[0]!.nama : 'Isian kerangka',
            description: `Isian tambahan yang dituntut kerangka ${a.kerangka ?? ''}. Bertanda * wajib.`,
            validate: () => {
              for (const b of skema) {
                const p = periksaIsianKerangka(b.isian, nilaiIsian[b.kode] ?? {});
                if (p) return skema.length > 1 ? `${b.nama}: ${p}` : p;
              }
              return null;
            },
            content: (
              <div className="u-kk-form">
                {skema.map((b) => (
                  <fieldset key={b.kode} className="u-kk-fieldset">
                    {skema.length > 1 ? <legend>{b.nama}</legend> : null}
                    <IsianKerangkaDinamis
                      isian={b.isian}
                      nilai={nilaiIsian[b.kode] ?? {}}
                      rujukan={a.rujukan}
                      onChange={(kode, v) => setIsian({ ...nilaiIsian, [b.kode]: { ...(nilaiIsian[b.kode] ?? {}), [kode]: v } })}
                    />
                  </fieldset>
                ))}
              </div>
            ),
          } as PanelLangkahStep,
        ]
      : []),
    {
      id: 'tinjau',
      title: 'Tinjau',
      description: ubah ? 'Periksa perubahan sebelum disimpan.' : 'Periksa ringkasan. Kurikulum disimpan sebagai draf dan bisa dilengkapi di ruang kerja.',
      content: (
        <div className="u-kk-form">
          <WizardReview
            sections={[
              {
                title: 'Identitas',
                onEdit: () => setStep(0),
                items: [
                  { label: 'Program studi', value: namaProdi },
                  { label: 'Kurikulum', value: f.kode && f.nama ? `${f.kode.trim()} · ${f.nama.trim()}` : '' },
                  ...(f.nama_en.trim() ? [{ label: 'Nama Inggris', value: f.nama_en.trim() }] : []),
                  { label: 'Mulai berlaku', value: f.tahun_berlaku ? `Tahun ${f.tahun_berlaku}` : '' },
                  { label: 'Aturan yang diikuti', value: a.rujukan ?? 'Ketentuan jenjang (belum ada aturan berversi)' },
                ],
              },
              {
                title: 'Beban belajar',
                onEdit: () => setStep(1),
                items: [
                  { label: 'Syarat lulus', value: `${f.sks_lulus || (sksMin ? `${sksMin} (bawaan)` : 'bawaan jenjang')} SKS${f.sks_wajib || f.sks_pilihan ? ` (wajib ${f.sks_wajib || '–'}, pilihan ${f.sks_pilihan || '–'})` : ''}` },
                  { label: 'Lama studi', value: `${f.masa_tempuh || tempuhNormal || '–'} semester, paling lama ${f.masa_studi_maks || studiMaks || '–'} semester` },
                  { label: 'IPK minimal lulus', value: f.ipk_min_lulus || (ipkMin ? `${ipkMin} (bawaan)` : 'Bawaan jenjang') },
                ],
              },
              {
                title: 'Uraian kurikulum',
                onEdit: () => setStep(2),
                items: (
                  [
                    ['visi_keilmuan', 'Visi keilmuan'],
                    ['kompetensi_utama', 'Kompetensi utama'],
                    ['metode_pembelajaran', 'Metode pembelajaran'],
                    ['penilaian', 'Sistem penilaian'],
                    ['tugas_akhir', 'Tugas akhir'],
                    ['syarat_masuk', 'Syarat masuk'],
                  ] as const
                ).map(([k, l]) => ({ label: l, value: f[k].trim() ? potong(f[k].trim(), 120) : '' })),
              },
              ...bagianButir.map((b, i) => {
                const pesan = cekButir(b);
                return {
                  title: b.nama,
                  onEdit: () => setStep(3 + i),
                  missing: pesan ?? undefined,
                  items: [
                    { label: 'Sudah tercatat', value: ada[b.jenis].length ? `${ada[b.jenis].length} butir` : 'Belum ada' },
                    { label: 'Ditambahkan sekarang', value: baru[b.jenis].length ? baru[b.jenis].map((r) => r.kode.trim()).join(', ') : 'Tidak ada' },
                  ],
                };
              }),
              ...skema.map((b) => ({
                title: b.nama,
                onEdit: () => setStep(3 + bagianButir.length),
                items: b.isian.map((i) => ({ label: i.nama, value: ringkasNilaiIsian(i, (nilaiIsian[b.kode] ?? {})[i.kode]) })),
              })),
            ]}
          />
          {!ubah && a.bagian.some((b) => !b.primitif && b.isian.length) ? (
            <Alert variant="info">
              Setelah draf dibuat, lengkapi juga {a.bagian.filter((b) => !b.primitif && b.isian.length).map((b) => b.nama.toLowerCase()).join(', ')} lewat Ubah kurikulum.
            </Alert>
          ) : null}
          {a.rujukan ? <p className="u-kw-bantuan">Langkah dan isian wajib di atas mengikuti {a.rujukan}.</p> : null}
        </div>
      ),
    },
  ];

  const simpan = async (): Promise<string | null> => {
    const body: Record<string, unknown> = {
      kode: f.kode.trim(),
      nama: f.nama.trim(),
      nama_en: kosongJadiNull(f.nama_en),
      tahun_berlaku: angkaAtauNull(f.tahun_berlaku),
      visi_keilmuan: kosongJadiNull(f.visi_keilmuan),
      kompetensi_utama: kosongJadiNull(f.kompetensi_utama),
      metode_pembelajaran: kosongJadiNull(f.metode_pembelajaran),
      penilaian: kosongJadiNull(f.penilaian),
      tugas_akhir: kosongJadiNull(f.tugas_akhir),
      syarat_masuk: kosongJadiNull(f.syarat_masuk),
      keterangan: kosongJadiNull(f.keterangan),
      id_kurikulum_feeder: kosongJadiNull(f.id_kurikulum_feeder),
    };
    if (!terkunci) {
      for (const k of ['sks_lulus', 'sks_wajib', 'sks_pilihan', 'masa_tempuh', 'masa_studi_maks', 'ipk_min_lulus'] as const) {
        if (f[k] !== '') body[k] = Number(f[k]);
      }
    } else {
      delete body.kode;
      delete body.kompetensi_utama;
    }
    const id = kurikulum?.id ?? dibuat.current?.id;
    if (!id) body.kode_prodi = f.kode_prodi;
    let k: KurikulumLengkap | undefined;
    try {
      k = await kirim<KurikulumLengkap>(id ? 'PUT' : 'POST', id ? `${P}/kurikulum/${id}` : `${P}/kurikulum`, body);
    } catch (e) {
      return pesanGalat(e);
    }
    const kid = k?.id ?? id;
    if (!kid) return 'Server tidak mengembalikan kurikulum yang disimpan.';
    if (!ubah && k) dibuat.current = k;
    const gagal: string[] = [];
    if (!terkunci) {
      for (const b of bagianButir) {
        const sisa: ButirBaru[] = [];
        for (const r of baru[b.jenis]) {
          const isi = b.jenis === 'cpl' ? { kode: r.kode.trim(), ranah: r.ranah, deskripsi: r.deskripsi.trim(), kelompok_sn: null, sumber: null, target: null } : { kode: r.kode.trim(), nama: r.nama.trim(), deskripsi: kosongJadiNull(r.deskripsi) };
          try {
            await siakad.request({ method: 'POST', path: `${P}/kurikulum/${kid}/${b.jenis}`, body: isi });
          } catch (e) {
            gagal.push(`${r.kode.trim()} (${pesanGalat(e)})`);
            sisa.push(r);
          }
        }
        setBaru((s) => ({ ...s, [b.jenis]: sisa }));
      }
    }
    if (isian) {
      for (const b of skema) {
        const lama = isianQ.data?.nilai?.[b.kode] ?? {};
        const kini = isian[b.kode] ?? {};
        if (JSON.stringify(lama) === JSON.stringify(kini)) continue;
        try {
          await siakad.request({ method: 'PUT', path: `${A_KUR}/isian`, body: { entitas: 'kurikulum', kunci: String(kid), bagian: b.kode, nilai: Object.fromEntries(Object.entries({ ...lama, ...kini }).map(([x, v]) => [x, nilaiKirim(v)])) } });
        } catch (e) {
          gagal.push(`${b.nama} (${pesanGalat(e)})`);
        }
      }
    }
    invalidateSiakad('kur');
    invalidateSiakad('kurikulum-aturan');
    if (gagal.length) return `Identitas kurikulum tersimpan, tetapi belum semua isian tersimpan: ${gagal.join('; ')}. Perbaiki lalu simpan lagi.`;
    toast.add({ title: ubah ? 'Kurikulum disimpan.' : 'Draf kurikulum dibuat.', type: 'success' });
    draf.selesai();
    const hasil = k ?? dibuat.current;
    if (hasil) onSelesai?.(hasil);
    return null;
  };

  return (
    <PanelLangkah
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      mode={ubah ? 'ubah' : 'buat'}
      title={ubah ? 'Ubah kurikulum' : 'Kurikulum baru'}
      description={ubah ? `${kurikulum!.kode} · ${kurikulum!.nama}` : 'Dimulai sebagai draf. Langkah dan isian wajib mengikuti aturan kurikulum yang berlaku untuk prodi.'}
      steps={steps}
      step={step}
      onStepChange={setStep}
      finishLabel={ubah ? 'Simpan kurikulum' : 'Buat draf'}
      footerNote="Bertanda * wajib. Isian tersimpan sementara bila panel ditutup."
      onFinish={simpan}
    />
  );
}

// ================================================================ Alur status
const LANGKAH: Array<{ status: StatusKurikulum; label: string; ket: string }> = [
  { status: 'draf', label: 'Disusun', ket: 'Prodi menyusun isi kurikulum' },
  { status: 'diajukan', label: 'Diajukan', ket: 'Menunggu pengesahan pimpinan' },
  { status: 'disahkan', label: 'Disahkan', ket: 'Ber-SK, isi terkunci' },
  { status: 'berlaku', label: 'Berlaku', ket: 'Dipakai mulai semester tertentu' },
];
const AKSI: Record<StatusKurikulum, { label: string; ikon: React.ReactNode; varian: 'primary' | 'outline' }> = {
  diajukan: { label: 'Ajukan pengesahan', ikon: <Send />, varian: 'primary' },
  disahkan: { label: 'Sahkan kurikulum', ikon: <ShieldCheck />, varian: 'primary' },
  berlaku: { label: 'Berlakukan', ikon: <CheckCircle2 />, varian: 'primary' },
  draf: { label: 'Kembalikan ke draf', ikon: <Undo2 />, varian: 'outline' },
  arsip: { label: 'Arsipkan', ikon: <ClipboardList />, varian: 'outline' },
};

export interface AlurKurikulumProps {
  kurikulumId: number | string;
  hak?: HakKurikulum;
  /** Setelah revisi dibuat: buka kurikulum baru. */
  onRevisi?: (k: KurikulumLengkap) => void;
  /** Setelah draf dihapus. */
  onHapus?: () => void;
  className?: string;
}

/**
 * Alur kurikulum: langkah draf → diajukan → disahkan → berlaku, tombol transisi yang boleh dijalankan pengguna
 * (sahkan meminta nomor & tanggal SK, berlakukan meminta semester mulai), revisi (salin jadi versi baru),
 * hapus draf, dan angkatan pengguna kurikulum.
 */
export function AlurKurikulum({ kurikulumId, hak: batas, onRevisi, onHapus, className }: AlurKurikulumProps) {
  const h = useHakKurikulum(kurikulumId, batas);
  const k = h.data;
  const [dialog, setDialog] = React.useState<StatusKurikulum | 'revisi' | 'angkatan' | 'hapus' | null>(null);
  const { kirim, sibuk } = useKirim();
  const toast = useToast();
  if (!k) return null;
  const idx = LANGKAH.findIndex((l) => l.status === k.status);
  const transisi = (k.transisi_saya ?? k.transisi_status ?? []).filter((t) => (t === 'diajukan' || (t === 'draf' && k.status === 'diajukan') ? h.susun : h.sahkan));
  const langsung = async (t: StatusKurikulum) => {
    try {
      await kirim('POST', `${P}/kurikulum/${k.id}/status`, { status: t }, t === 'diajukan' ? 'Kurikulum diajukan untuk disahkan.' : `Status menjadi ${label(t)}.`);
    } catch (e) {
      toast.add({ title: pesanGalat(e), type: 'error' });
    }
  };
  return (
    <section className={cn('u-kk-alur', className)}>
      <ol className="u-kk-langkah" aria-label="Alur kurikulum">
        {LANGKAH.map((l, i) => (
          <li key={l.status} data-state={k.status === 'arsip' ? 'done' : i < idx ? 'done' : i === idx ? 'current' : 'todo'}>
            <span className="u-kk-langkah-titik">{i < idx || k.status === 'arsip' ? <CheckCircle2 aria-hidden /> : i + 1}</span>
            <span>
              <b>{l.label}</b>
              <small>{l.ket}</small>
            </span>
          </li>
        ))}
      </ol>
      <div className="u-kk-alur-info">
        <StatusKurikulumBadge status={k.status} />
        {k.no_sk && (
          <span>
            SK <b>{k.no_sk}</b>
            {k.tanggal_sk ? ` (${formatDate(k.tanggal_sk)})` : ''}
          </span>
        )}
        {k.tahun_id_mulai && <span>Berlaku mulai {tahunLabel(k.tahun_id_mulai)}</span>}
        <span>{k.angkatan?.length ? `Angkatan ${k.angkatan.join(', ')}` : 'Belum ada angkatan pengguna'}</span>
      </div>
      {(transisi.length > 0 || h.susun) && (
        <div className="u-kk-alur-aksi">
          {transisi.map((t) => (
            <Button
              key={t}
              size="sm"
              variant={AKSI[t].varian}
              loading={sibuk && dialog === null}
              onClick={() => (t === 'disahkan' || t === 'berlaku' ? setDialog(t) : void langsung(t))}
            >
              {AKSI[t].ikon} {AKSI[t].label}
            </Button>
          ))}
          {h.susun && (
            <Button size="sm" variant="outline" onClick={() => setDialog('angkatan')}>
              <Users /> Angkatan pengguna
            </Button>
          )}
          {h.susun && k.status !== 'draf' && (
            <Button size="sm" variant="outline" onClick={() => setDialog('revisi')}>
              <GitBranch /> Buat revisi
            </Button>
          )}
          {h.susun && k.status === 'draf' && (
            <Button size="sm" variant="destructive-soft" onClick={() => setDialog('hapus')}>
              <Trash2 /> Hapus draf
            </Button>
          )}
        </div>
      )}
      {k.status === 'diajukan' && !h.sahkan && (
        <p className="u-kk-catatan">Kurikulum menunggu pengesahan pimpinan (rektor/WR I). Isi masih bisa diperbaiki selama belum disahkan.</p>
      )}
      <DialogSahkan open={dialog === 'disahkan'} onOpenChange={(o) => !o && setDialog(null)} k={k} />
      <DialogBerlaku open={dialog === 'berlaku'} onOpenChange={(o) => !o && setDialog(null)} k={k} />
      <DialogRevisi open={dialog === 'revisi'} onOpenChange={(o) => !o && setDialog(null)} k={k} onSelesai={onRevisi} />
      <DialogAngkatan open={dialog === 'angkatan'} onOpenChange={(o) => !o && setDialog(null)} k={k} />
      <ConfirmDialog
        open={dialog === 'hapus'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Hapus draf kurikulum?"
        description={`${k.kode} · ${k.nama} beserta profil lulusan, CPL, MK, CPMK, dan RPS-nya akan dihapus.`}
        confirmLabel="Hapus draf"
        onConfirm={async () => {
          await kirim('DELETE', `${P}/kurikulum/${k.id}`, undefined, 'Draf kurikulum dihapus.');
          onHapus?.();
        }}
      />
    </section>
  );
}

function DialogSahkan({ open, onOpenChange, k }: { open: boolean; onOpenChange: (o: boolean) => void; k: KurikulumLengkap }) {
  const [sk, setSk] = React.useState<{ no_sk: string | null; tanggal_sk: string }>({ no_sk: k.no_sk ?? null, tanggal_sk: k.tanggal_sk ?? '' });
  const [abaikan, setAbaikan] = React.useState(false);
  const { kirim, sibuk, galat, setGalat } = useKirim();
  React.useEffect(() => {
    if (open) {
      setSk({ no_sk: k.no_sk ?? null, tanggal_sk: k.tanggal_sk ?? '' });
      setAbaikan(false);
      setGalat(null);
    }
  }, [open, k, setGalat]);
  const galatValidasi = (galat as { status?: number; details?: { galat?: Array<{ pesan: string }> } } | null)?.details?.galat;
  return (
    <Dialog
      side="right"
      open={open}
      onOpenChange={onOpenChange}
      title="Sahkan kurikulum"
      description="Kurikulum yang disahkan terkunci; perubahan berikutnya lewat revisi."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            loading={sibuk}
            disabled={!sk.no_sk}
            onClick={async () => {
              try {
                await kirim('POST', `${P}/kurikulum/${k.id}/status`, { status: 'disahkan', no_sk: sk.no_sk, tanggal_sk: sk.tanggal_sk || null, abaikan_galat: abaikan || undefined }, 'Kurikulum disahkan.');
                onOpenChange(false);
              } catch {
                /* tampil */
              }
            }}
          >
            <ShieldCheck /> Sahkan
          </Button>
        </>
      }
    >
      <div className="u-kk-form">
        {galatValidasi?.length ? (
          <Alert variant="warning" title="Validasi masih menemukan galat">
            <ul className="u-kk-galat-list">
              {galatValidasi.slice(0, 6).map((g, i) => (
                <li key={i}>{g.pesan}</li>
              ))}
            </ul>
          </Alert>
        ) : (
          <KotakGalat galat={galat} />
        )}
        <Field label="Nomor SK pengesahan" required>
          <PilihNomorSK value={sk.no_sk} onValueChange={(v) => setSk((s) => ({ ...s, no_sk: v }))} />
        </Field>
        <Field label="Tanggal SK" optional>
          <IsianTanggal value={sk.tanggal_sk} onValueChange={(v) => setSk((s) => ({ ...s, tanggal_sk: v }))} />
        </Field>
        {galatValidasi?.length ? (
          <label className="u-kk-centang">
            <Checkbox checked={abaikan} onCheckedChange={(v) => setAbaikan(!!v)} /> Tetap sahkan walau masih ada galat validasi (dicatat).
          </label>
        ) : null}
      </div>
    </Dialog>
  );
}

function DialogBerlaku({ open, onOpenChange, k }: { open: boolean; onOpenChange: (o: boolean) => void; k: KurikulumLengkap }) {
  const [mulai, setMulai] = React.useState<string | null>(k.tahun_id_mulai ?? null);
  const { kirim, sibuk, galat } = useKirim();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Berlakukan kurikulum"
      description="Kurikulum dipakai mulai semester yang dipilih. Penerbitan mata kuliah ke SIAKAD (KRS, jadwal, nilai) dilakukan BAAK."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            loading={sibuk}
            disabled={!mulai}
            onClick={async () => {
              try {
                await kirim('POST', `${P}/kurikulum/${k.id}/status`, { status: 'berlaku', tahun_id_mulai: mulai }, 'Kurikulum diberlakukan.');
                onOpenChange(false);
              } catch {
                /* tampil */
              }
            }}
          >
            <CheckCircle2 /> Berlakukan
          </Button>
        </>
      }
    >
      <div className="u-kk-form">
        <KotakGalat galat={galat} />
        <Field label="Berlaku mulai semester" required>
          <PilihTahunAkademik value={mulai} onValueChange={setMulai} />
        </Field>
      </div>
    </Dialog>
  );
}

function DialogRevisi({ open, onOpenChange, k, onSelesai }: { open: boolean; onOpenChange: (o: boolean) => void; k: KurikulumLengkap; onSelesai?: (k: KurikulumLengkap) => void }) {
  const [f, setF] = React.useState({ kode: '', nama: '', tahun_berlaku: '' });
  const { kirim, sibuk, galat, kolom } = useKirim();
  React.useEffect(() => {
    if (open) setF({ kode: `${k.kode}-R${(k.versi ?? 1) + 1}`, nama: `${k.nama} (revisi)`, tahun_berlaku: String(new Date().getFullYear()) });
  }, [open, k]);
  return (
    <Dialog
      side="right"
      open={open}
      onOpenChange={onOpenChange}
      title="Buat revisi kurikulum"
      description="Seluruh isi (profil lulusan, CPL, bahan kajian, MK, prasyarat, CPMK, matriks, RPS terakhir) disalin menjadi draf versi baru. Kurikulum ini tidak berubah."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            loading={sibuk}
            disabled={!f.kode.trim()}
            onClick={async () => {
              try {
                const baru = await kirim<KurikulumLengkap>('POST', `${P}/kurikulum/${k.id}/revisi`, { kode: f.kode.trim(), nama: f.nama.trim() || undefined, tahun_berlaku: angkaAtauNull(f.tahun_berlaku) ?? undefined }, 'Revisi dibuat sebagai draf.');
                onOpenChange(false);
                if (baru) onSelesai?.(baru);
              } catch {
                /* tampil */
              }
            }}
          >
            <GitBranch /> Buat revisi
          </Button>
        </>
      }
    >
      <div className="u-kk-form">
        <KotakGalat galat={galat} />
        <div className="u-kk-grid">
          <Field label="Kode versi baru" required error={kolom.kode}>
            <Input value={f.kode} onChange={(e) => setF({ ...f, kode: e.target.value })} />
          </Field>
          <Field label="Tahun berlaku">
            <IsianAngka ribuan={false} value={keAngka(f.tahun_berlaku)} onValueChange={(n) => setF({ ...f, tahun_berlaku: teksAngka(n) })} />
          </Field>
        </div>
        <Field label="Nama">
          <Input value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} />
        </Field>
      </div>
    </Dialog>
  );
}

function DialogAngkatan({ open, onOpenChange, k }: { open: boolean; onOpenChange: (o: boolean) => void; k: KurikulumLengkap }) {
  const [teks, setTeks] = React.useState('');
  const [pindah, setPindah] = React.useState(false);
  const { kirim, sibuk, galat, setGalat } = useKirim();
  React.useEffect(() => {
    if (open) {
      setTeks((k.angkatan ?? []).join(', '));
      setPindah(false);
      setGalat(null);
    }
  }, [open, k, setGalat]);
  const daftar = teks
    .split(/[\s,;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  const salah = daftar.filter((x) => !/^\d{4}$/.test(x));
  const bentrok = (galat as { status?: number; details?: Record<string, string> } | null)?.status === 409 ? (galat as { details?: Record<string, string> }).details : null;
  const kini = new Date().getFullYear();
  return (
    <Dialog
      side="right"
      open={open}
      onOpenChange={onOpenChange}
      title="Angkatan pengguna kurikulum"
      description="Satu angkatan memakai satu kurikulum per prodi. Dipakai untuk capaian CPL, syarat lulus, dan ekuivalensi nilai."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            loading={sibuk}
            disabled={salah.length > 0}
            onClick={async () => {
              try {
                await kirim('PUT', `${P}/kurikulum/${k.id}/angkatan`, { angkatan: daftar.map(Number), pindahkan: pindah || undefined }, 'Angkatan pengguna disimpan.');
                onOpenChange(false);
              } catch {
                /* tampil */
              }
            }}
          >
            Simpan angkatan
          </Button>
        </>
      }
    >
      <div className="u-kk-form">
        {bentrok ? (
          <Alert variant="warning" title="Sebagian angkatan sudah memakai kurikulum lain">
            <ul className="u-kk-galat-list">
              {Object.entries(bentrok).map(([a, v]) => (
                <li key={a}>
                  {a}: {String(v)}
                </li>
              ))}
            </ul>
            <label className="u-kk-centang">
              <Checkbox checked={pindah} onCheckedChange={(v) => setPindah(!!v)} /> Pindahkan angkatan itu ke kurikulum ini
            </label>
          </Alert>
        ) : (
          <KotakGalat galat={galat} />
        )}
        <Field label="Tahun angkatan" description="Pisahkan dengan koma, mis. 2025, 2026" error={salah.length ? `Bukan tahun: ${salah.join(', ')}` : undefined}>
          <Input value={teks} onChange={(e) => setTeks(e.target.value)} placeholder={`${kini - 1}, ${kini}`} />
        </Field>
        <div className="u-kk-chip-row">
          {[kini - 3, kini - 2, kini - 1, kini, kini + 1].map((t) => {
            const ada = daftar.includes(String(t));
            return (
              <button key={t} type="button" className="u-kk-chip" data-active={dataFlag(ada)} onClick={() => setTeks((ada ? daftar.filter((x) => x !== String(t)) : [...daftar, String(t)]).sort().join(', '))}>
                {t}
              </button>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}

// ================================================================ Profil lulusan, CPL, bahan kajian
type JenisButir = 'profil-lulusan' | 'cpl' | 'bahan-kajian';
type Butir = ProfilLulusan | Cpl | BahanKajian;
const NAMA_BUTIR: Record<JenisButir, { satu: string; contoh: string; ikon: React.ReactNode }> = {
  'profil-lulusan': { satu: 'profil lulusan', contoh: 'PL1', ikon: <GraduationCap /> },
  cpl: { satu: 'CPL', contoh: 'CPL1', ikon: <Target /> },
  'bahan-kajian': { satu: 'bahan kajian', contoh: 'BK1', ikon: <BookOpen /> },
};
const SUMBER_CPL: SelectOption<string>[] = [
  { value: '', label: 'Tidak dicatat' },
  { value: 'sn_dikti', label: 'SN Dikti' },
  { value: 'kkni', label: 'KKNI' },
  { value: 'asosiasi', label: 'Asosiasi prodi' },
  { value: 'prodi', label: 'Ciri khas prodi' },
  { value: 'dudika', label: 'Masukan DUDIKA' },
];
const KELOMPOK_SN: SelectOption<string>[] = [
  { value: '', label: 'Tidak dicatat' },
  { value: 'a', label: 'a. Sikap' },
  { value: 'b', label: 'b. Pengetahuan' },
  { value: 'c', label: 'c. Keterampilan umum' },
  { value: 'd', label: 'd. Keterampilan khusus' },
];

export interface KelolaButirKurikulumProps {
  kurikulumId: number | string;
  jenis: JenisButir;
  /** Boleh tambah/ubah/hapus (kurikulum draf/diajukan dan pengguna penyusun). */
  bolehUbah?: boolean;
  className?: string;
}

/** Tabel profil lulusan, CPL (per ranah, target, sumber, MK pendukung), atau bahan kajian dengan tambah/ubah/hapus. */
export function KelolaButirKurikulum({ kurikulumId, jenis, bolehUbah, className }: KelolaButirKurikulumProps) {
  const qP = useProfilLulusan(jenis === 'profil-lulusan' ? kurikulumId : undefined);
  const qC = useCplKurikulum(jenis === 'cpl' ? kurikulumId : undefined);
  const qB = useBahanKajian(jenis === 'bahan-kajian' ? kurikulumId : undefined);
  const q = (jenis === 'cpl' ? qC : jenis === 'profil-lulusan' ? qP : qB) as { data?: Butir[]; loading: boolean; error: unknown; refetch: () => void };
  const [form, setForm] = React.useState<Partial<Butir & Cpl> | null>(null);
  const [hapus, setHapus] = React.useState<Butir | null>(null);
  const { kirim } = useKirim();
  const nm = NAMA_BUTIR[jenis];
  const kolom: DataColumn<Butir>[] = [
    { key: 'kode', header: 'Kode', shrink: true, mobile: 'badge', cell: (b) => <span className="u-kur-code">{b.kode}</span> },
    {
      key: 'isi',
      header: jenis === 'cpl' ? 'Rumusan CPL' : 'Nama',
      mobile: 'title',
      cell: (b) =>
        jenis === 'cpl' ? (
          <span className="u-kk-teks">{(b as Cpl).deskripsi}</span>
        ) : (
          <span className="u-kk-teks">
            <b>{(b as ProfilLulusan).nama}</b>
            {(b as ProfilLulusan).deskripsi && <small>{(b as ProfilLulusan).deskripsi}</small>}
          </span>
        ),
      value: (b) => (jenis === 'cpl' ? (b as Cpl).deskripsi : (b as ProfilLulusan).nama),
    },
    ...(jenis === 'cpl'
      ? ([
          { key: 'ranah', header: 'Ranah', shrink: true, mobile: 'subtitle', cell: (b) => <Badge variant="secondary">{RANAH_CPL[(b as Cpl).ranah] ?? (b as Cpl).ranah}</Badge> },
          { key: 'target', header: 'Target', shrink: true, align: 'end', cell: (b) => ((b as Cpl).target != null ? formatNumber(n((b as Cpl).target)) : '–') },
          {
            key: 'mk',
            header: 'MK pendukung',
            shrink: true,
            cell: (b) => {
              const j = (b as Cpl).mata_kuliah?.length ?? 0;
              return j ? `${j} MK` : <span className="u-kk-warn">Belum ada</span>;
            },
          },
        ] as DataColumn<Butir>[])
      : []),
  ];
  return (
    <div className={cn('u-kk-blok', className)}>
      <DataTable<Butir>
        columns={kolom}
        rows={q.data}
        rowKey={(b) => String(b.id)}
        loading={q.loading && !q.data}
        error={q.error}
        onRetry={q.refetch}
        columnToggle={false}
        densityToggle={false}
        exportCsv={`${jenis}.csv`}
        actions={
          bolehUbah ? (
            <Button size="sm" onClick={() => setForm({})}>
              <Plus /> Tambah {nm.satu}
            </Button>
          ) : undefined
        }
        rowActions={
          bolehUbah
            ? (b) => [
                { label: 'Ubah', icon: <PenLine />, onSelect: () => setForm(b as never) },
                { label: 'Hapus', icon: <Trash2 />, destructive: true, onSelect: () => setHapus(b) },
              ]
            : undefined
        }
        empty={{ icon: nm.ikon, title: `Belum ada ${nm.satu}`, description: bolehUbah ? `Tambahkan ${nm.satu} pertama kurikulum ini.` : undefined }}
      />
      {form && <FormButir kurikulumId={kurikulumId} jenis={jenis} awal={form} onTutup={() => setForm(null)} />}
      <ConfirmDialog
        open={!!hapus}
        onOpenChange={(o) => !o && setHapus(null)}
        title={`Hapus ${nm.satu} ${hapus?.kode ?? ''}?`}
        description="Pemetaan yang memakai butir ini ikut terhapus."
        confirmLabel={`Hapus ${nm.satu}`}
        onConfirm={async () => {
          if (hapus) await kirim('DELETE', `${P}/kurikulum/${kurikulumId}/${jenis}/${hapus.id}`, undefined, `${label(nm.satu)} dihapus.`).catch(abaikan);
        }}
      />
    </div>
  );
}

function FormButir({ kurikulumId, jenis, awal, onTutup }: { kurikulumId: number | string; jenis: JenisButir; awal: Partial<Butir & Cpl>; onTutup: () => void }) {
  const cpl = jenis === 'cpl';
  const [f, setF] = React.useState({
    kode: awal.kode ?? '',
    nama: (awal as ProfilLulusan).nama ?? '',
    deskripsi: awal.deskripsi ?? '',
    ranah: (awal.ranah ?? 'sikap') as RanahCpl,
    kelompok_sn: awal.kelompok_sn ?? '',
    sumber: awal.sumber ?? '',
    target: awal.target != null ? String(awal.target) : '',
  });
  const { kirim, sibuk, galat, kolom } = useKirim();
  const nm = NAMA_BUTIR[jenis];
  const simpan = async () => {
    const body = cpl
      ? { kode: f.kode.trim(), ranah: f.ranah, deskripsi: f.deskripsi.trim(), kelompok_sn: f.kelompok_sn || null, sumber: f.sumber || null, target: angkaAtauNull(f.target) }
      : { kode: f.kode.trim(), nama: f.nama.trim(), deskripsi: kosongJadiNull(f.deskripsi) };
    try {
      await kirim(awal.id ? 'PUT' : 'POST', awal.id ? `${P}/kurikulum/${kurikulumId}/${jenis}/${awal.id}` : `${P}/kurikulum/${kurikulumId}/${jenis}`, body, `${label(nm.satu)} disimpan.`);
      onTutup();
    } catch {
      /* tampil */
    }
  };
  return (
    <Dialog
      side="right"
      open
      onOpenChange={(o) => !o && onTutup()}
      title={`${awal.id ? 'Ubah' : 'Tambah'} ${nm.satu}`}
      footer={
        <>
          <Button variant="ghost" onClick={onTutup}>
            Batal
          </Button>
          <Button loading={sibuk} disabled={!f.kode.trim() || (cpl ? !f.deskripsi.trim() : !f.nama.trim())} onClick={simpan}>
            Simpan {nm.satu}
          </Button>
        </>
      }
    >
      <div className="u-kk-form">
        <KotakGalat galat={galat} />
        <div className="u-kk-grid">
          <Field label="Kode" required error={kolom.kode}>
            <Input value={f.kode} onChange={(e) => setF({ ...f, kode: e.target.value })} placeholder={nm.contoh} />
          </Field>
          {cpl && (
            <Field label="Ranah" required error={kolom.ranah}>
              <Select value={f.ranah} onValueChange={(v) => setF({ ...f, ranah: (v ?? 'sikap') as RanahCpl })} options={Object.entries(RANAH_CPL).map(([value, l]) => ({ value, label: l }))} />
            </Field>
          )}
        </div>
        {!cpl && (
          <Field label="Nama" required error={kolom.nama}>
            <Input value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} />
          </Field>
        )}
        <Field label={cpl ? 'Rumusan CPL' : 'Deskripsi'} required={cpl} optional={!cpl} error={kolom.deskripsi} description={cpl ? 'Mulai dengan kata kerja terukur, mis. "Mampu merancang…"' : undefined}>
          <Textarea rows={cpl ? 4 : 3} value={f.deskripsi} onChange={(e) => setF({ ...f, deskripsi: e.target.value })} />
        </Field>
        {cpl && (
          <div className="u-kk-grid u-kk-grid-3">
            <Field label="Kelompok SN Dikti" optional>
              <Select value={f.kelompok_sn} onValueChange={(v) => setF({ ...f, kelompok_sn: v ?? '' })} options={KELOMPOK_SN} />
            </Field>
            <Field label="Sumber" optional>
              <Select value={f.sumber} onValueChange={(v) => setF({ ...f, sumber: v ?? '' })} options={SUMBER_CPL} />
            </Field>
            <Field label="Target capaian" optional description="Skor 0–100" error={kolom.target}>
              <IsianAngka value={keAngka(f.target)} min={0} max={100} placeholder="70" onValueChange={(n) => setF({ ...f, target: teksAngka(n) })} />
            </Field>
          </div>
        )}
      </div>
    </Dialog>
  );
}

// ================================================================ Mata kuliah per semester
export interface KelolaMkKurikulumProps {
  kurikulumId: number | string;
  bolehUbah?: boolean;
  /** Buka ruang kerja MK (CPMK, RPS). */
  onBukaMk?: (mk: MkKurikulum) => void;
  className?: string;
}

/**
 * Sebaran mata kuliah per semester: total SKS wajib terhadap batas semester (20 di semester 1–2, 24 sesudahnya),
 * peringatan MK tanpa CPL/RPS, tambah/ubah/hapus MK, prasyarat, dan pintu ke CPMK & RPS tiap MK.
 */
export function KelolaMkKurikulum({ kurikulumId, bolehUbah, onBukaMk, className }: KelolaMkKurikulumProps) {
  const q = useMkKurikulum(kurikulumId);
  const kur = useKurikulum(kurikulumId);
  const [kata, setKata] = React.useState('');
  const [form, setForm] = React.useState<Partial<MkDetail> | null>(null);
  const [syarat, setSyarat] = React.useState<MkKurikulum | null>(null);
  const [hapus, setHapus] = React.useState<MkKurikulum | null>(null);
  const { kirim } = useKirim();
  const mk = q.data ?? [];
  const k = kata.trim().toLowerCase();
  const tampil = mk.filter((m) => !k || m.kode_mk.toLowerCase().includes(k) || m.nama.toLowerCase().includes(k));
  const semester = [...new Set(mk.map((m) => m.semester ?? 0))].sort((a, b) => (a || 99) - (b || 99));
  const sksWajib = mk.filter((m) => !pilihan(m)).reduce((a, m) => a + n(m.sks), 0);
  const sksPilihan = mk.filter(pilihan).reduce((a, m) => a + n(m.sks), 0);
  const syaratLulus = n(kur.data?.sks_lulus);
  const tanpaCpl = mk.filter((m) => !(Array.isArray(m.cpl) ? m.cpl.length : m.cpl)).length;
  const tanpaRps = mk.filter((m) => m.status_rps !== 'disahkan').length;
  const lebih = semester.filter((s) => s && mk.filter((m) => (m.semester ?? 0) === s && !pilihan(m)).reduce((a, m) => a + n(m.sks), 0) > maksSksSemester(s));
  return (
    <div className={cn('u-kk-blok', className)}>
      <div className="u-kk-mk-ringkas">
        <div>
          <b>{formatNumber(sksWajib)}</b>
          <span>SKS wajib{syaratLulus ? ` dari ${formatNumber(syaratLulus)} syarat lulus` : ''}</span>
          {syaratLulus > 0 && <Progress value={Math.min(100, ((sksWajib + sksPilihan) / syaratLulus) * 100)} size="sm" tone={sksWajib + sksPilihan >= syaratLulus ? 'success' : 'warning'} />}
        </div>
        <div>
          <b>{formatNumber(sksPilihan)}</b>
          <span>SKS pilihan</span>
        </div>
        <div>
          <b>{mk.length}</b>
          <span>mata kuliah</span>
        </div>
        <div data-warn={dataFlag(tanpaCpl > 0)}>
          <b>{tanpaCpl}</b>
          <span>MK belum dipetakan ke CPL</span>
        </div>
        <div data-warn={dataFlag(tanpaRps > 0)}>
          <b>{tanpaRps}</b>
          <span>MK tanpa RPS sah</span>
        </div>
      </div>
      {lebih.length > 0 && (
        <Alert variant="warning" title="Beban SKS melebihi batas">
          Semester {lebih.join(', ')} melebihi batas SKS per semester (20 SKS di semester 1–2, 24 SKS sesudahnya; Pasal 17–18).
        </Alert>
      )}
      <div className="u-kk-toolbar">
        <Input size="sm" type="search" placeholder="Cari kode atau nama MK" value={kata} onChange={(e) => setKata(e.target.value)} aria-label="Cari mata kuliah" />
        {bolehUbah && (
          <Button size="sm" onClick={() => setForm({ jenis: 'A', semester: semester.find((s) => s) ?? 1 })}>
            <Plus /> Tambah mata kuliah
          </Button>
        )}
      </div>
      {q.error ? (
        <Alert variant="danger" title={pesanGalat(q.error)} />
      ) : q.loading && !q.data ? (
        <Progress value={null} size="sm" />
      ) : !mk.length ? (
        <Empty icon={<Layers />} title="Belum ada mata kuliah" description={bolehUbah ? 'Tambah MK satu per satu, atau impor dari kurikulum lama.' : undefined} bordered />
      ) : (
        <div className="u-kk-semester-list">
          {semester.map((s) => {
            const isi = tampil.filter((m) => (m.semester ?? 0) === s);
            if (!isi.length) return null;
            const semua = mk.filter((m) => (m.semester ?? 0) === s);
            const wajib = semua.filter((m) => !pilihan(m)).reduce((a, m) => a + n(m.sks), 0);
            const pil = semua.filter(pilihan).reduce((a, m) => a + n(m.sks), 0);
            const maks = s ? maksSksSemester(s) : 0;
            return (
              <section key={s} className="u-kk-semester" data-lebih={dataFlag(!!maks && wajib > maks)}>
                <header>
                  <h4>{s ? `Semester ${s}` : 'Pilihan bebas'}</h4>
                  <span>
                    {semua.length} MK · <b>{formatNumber(wajib)}</b>
                    {maks ? `/${maks}` : ''} SKS{pil ? ` + ${formatNumber(pil)} pilihan` : ''}
                  </span>
                  {!!maks && <Progress value={Math.min(100, (wajib / maks) * 100)} size="sm" tone={wajib > maks ? 'danger' : 'primary'} />}
                </header>
                <DataTable<(typeof isi)[number]>
                  columns={[
                    { key: 'kode_mk', header: 'Kode', width: 110, sortable: true, mobile: 'subtitle', cell: (m) => <span className="u-kur-code">{m.kode_mk}</span> },
                    { key: 'nama', header: 'Mata kuliah', sortable: true, mobile: 'title', cell: (m) => <span className="u-kk-nama-mk">{m.nama}</span> },
                    { key: 'sks', header: 'SKS', width: 70, align: 'end', sortable: true, value: (m) => n(m.sks), cell: (m) => <span className="u-kk-angka">{formatNumber(n(m.sks))}</span> },
                    {
                      key: 'jenis',
                      header: 'Sifat',
                      width: 130,
                      sortable: true,
                      value: (m) => JENIS_MK[m.jenis] ?? m.jenis,
                      cell: (m) => (
                        <span className="u-mk-jenis" data-jenis={m.jenis}>
                          {JENIS_MK[m.jenis] ?? m.jenis}
                        </span>
                      ),
                    },
                    {
                      key: 'prasyarat',
                      header: 'Prasyarat',
                      width: 110,
                      value: (m) => prasyaratMk(m).join(', '),
                      cell: (m) => {
                        const pras = prasyaratMk(m);
                        return pras.length ? <span title={pras.join(', ')}>{pras.join(', ')}</span> : <span className="u-kk-muted">–</span>;
                      },
                    },
                    {
                      key: 'cpl',
                      header: 'CPL',
                      width: 90,
                      value: (m) => cplMk(m).length,
                      cell: (m) => {
                        const cpl = cplMk(m);
                        return cpl.length ? <span title={cpl.join(', ')}>{cpl.length} CPL</span> : <span className="u-kk-warn">belum</span>;
                      },
                    },
                    { key: 'jumlah_cpmk', header: 'CPMK', width: 70, align: 'end', value: (m) => n(m.jumlah_cpmk), cell: (m) => <span className="u-kk-angka">{n(m.jumlah_cpmk) || <span className="u-kk-warn">0</span>}</span> },
                    {
                      key: 'status_rps',
                      header: 'RPS',
                      width: 100,
                      mobile: 'badge',
                      value: (m) => (m.status_rps ? label(m.status_rps) : 'Belum'),
                      cell: (m) => (m.status_rps === 'disahkan' ? <Badge variant="success">Disahkan</Badge> : <Badge variant="warning">{m.status_rps ? label(m.status_rps) : 'Belum'}</Badge>),
                    },
                  ]}
                  rows={isi}
                  rowKey={(m) => String(m.id)}
                  onRowClick={onBukaMk ? (m) => onBukaMk(m) : undefined}
                  rowActions={(m) => [
                    { label: 'Buka CPMK & RPS', icon: <ListChecks />, onSelect: () => onBukaMk?.(m) },
                    ...(bolehUbah
                      ? ([
                          { label: 'Ubah mata kuliah', icon: <PenLine />, onSelect: () => setForm(m as MkDetail) },
                          { label: 'Atur prasyarat', icon: <Network />, onSelect: () => setSyarat(m) },
                          { type: 'separator' },
                          { label: 'Hapus', icon: <Trash2 />, destructive: true, onSelect: () => setHapus(m) },
                        ] as MenuEntry[])
                      : []),
                  ]}
                  pagination={false}
                  columnToggle={false}
                  densityToggle={false}
                  defaultDensity="compact"
                />
              </section>
            );
          })}
        </div>
      )}
      {form && <FormMk kurikulumId={kurikulumId} awal={form} onTutup={() => setForm(null)} />}
      {syarat && <FormPrasyarat kurikulumId={kurikulumId} mk={syarat} onTutup={() => setSyarat(null)} />}
      <ConfirmDialog
        open={!!hapus}
        onOpenChange={(o) => !o && setHapus(null)}
        title={`Hapus ${hapus?.kode_mk ?? ''} ${hapus?.nama ?? ''}?`}
        description="CPMK, sub-CPMK, RPS, dan pemetaannya ikut terhapus."
        confirmLabel="Hapus mata kuliah"
        onConfirm={async () => {
          if (hapus) await kirim('DELETE', `${P}/mk/${hapus.id}`, undefined, 'Mata kuliah dihapus.').catch(abaikan);
        }}
      />
    </div>
  );
}

const cplMk = (m: { cpl?: unknown }): string[] => (Array.isArray(m.cpl) ? (m.cpl as string[]) : m.cpl ? String(m.cpl).split(',') : []);
const prasyaratMk = (m: { prasyarat?: unknown }): string[] =>
  Array.isArray(m.prasyarat) ? (m.prasyarat as Array<{ kode_mk?: string } | string>).map((p) => (typeof p === 'string' ? p : (p.kode_mk ?? ''))) : [];
/** Kategori MK untuk perangkat wajib aturan (AturanKurikulum::JENIS_MK): teori, praktikum, lapangan, mbkm, ta. */
const kategoriMk = (f: { jenis: string; sks_praktikum: string; sks_praktik_lapangan: string; luar_prodi: boolean }) =>
  f.jenis === 'S' ? 'ta' : f.luar_prodi ? 'mbkm' : n(f.sks_praktik_lapangan) > 0 ? 'lapangan' : n(f.sks_praktikum) > 0 ? 'praktikum' : 'teori';
const NAMA_KATEGORI: Record<string, string> = { teori: 'teori', praktikum: 'praktikum/praktik', lapangan: 'praktik lapangan', mbkm: 'kegiatan MBKM', ta: 'tugas akhir' };
type BarisPrasyarat = { prasyarat_id: string; jenis: string; nilai_min: string };
const JENIS_PRASYARAT = [
  { value: 'lulus', label: 'Harus lulus' },
  { value: 'pernah_ambil', label: 'Pernah ambil' },
  { value: 'bersamaan', label: 'Bersamaan' },
];

/**
 * Mata kuliah kurikulum sebagai WIZARD di panel samping: Identitas → SKS & semester (batas SKS semester dari aturan) →
 * Pembelajaran → Prasyarat → CPL/bahan kajian yang didukung (hanya bila kerangka memuat CPL & CPMK) → isian MK tambahan
 * kerangka → Tinjau (termasuk perangkat yang wajib menurut aturan). Isian wajib mengikuti `mata_kuliah.isian_wajib`
 * aturan versi kurikulum. Payload MK tetap POST /kurikulum/{id}/mk atau PUT /mk/{id}; prasyarat, pemetaan, dan isian
 * tambahan memakai endpoint yang sama dengan tab masing-masing.
 */
function FormMk({ kurikulumId, awal, onTutup }: { kurikulumId: number | string; awal: Partial<MkDetail>; onTutup: () => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  // Daftar MK hanya membawa ringkasan; ambil detail lengkap saat mengubah.
  const det = useMataKuliahObe(awal.id);
  const d = (det.data as MkDetail | undefined) ?? awal;
  const kur = useKurikulum(kurikulumId);
  const k = kur.data as KurikulumLengkap | undefined;
  const semuaMk = useMkKurikulum(kurikulumId);
  const cplQ = useCplKurikulum(kurikulumId);
  const bkQ = useBahanKajian(kurikulumId);
  const a = useAturanKurikulumBerlaku({ prodi: k?.kode_prodi, kurikulumId: Number(kurikulumId) || null, angkatan: k?.angkatan?.[0] ?? k?.tahun_berlaku ?? undefined });
  const isi = React.useCallback(
    (m: Partial<MkDetail>) => ({
      kode_mk: m.kode_mk ?? '',
      nama: m.nama ?? '',
      nama_en: m.nama_en ?? '',
      semester: m.semester == null ? '' : String(m.semester),
      jenis: m.jenis ?? 'A',
      kelompok: m.kelompok ?? '',
      sks_tatap_muka: m.sks_tatap_muka != null ? String(m.sks_tatap_muka) : m.id ? '' : '2',
      sks_praktikum: m.sks_praktikum != null && n(m.sks_praktikum) ? String(m.sks_praktikum) : '',
      sks_praktik_lapangan: m.sks_praktik_lapangan != null && n(m.sks_praktik_lapangan) ? String(m.sks_praktik_lapangan) : '',
      sks_simulasi: m.sks_simulasi != null && n(m.sks_simulasi) ? String(m.sks_simulasi) : '',
      modalitas: m.modalitas ?? 'luring',
      bentuk_nilai: m.bentuk_nilai ?? 'ip',
      bentuk_pembelajaran: (m.bentuk_pembelajaran ?? ['kuliah']) as string[],
      pertemuan: m.pertemuan != null ? String(m.pertemuan) : '16',
      luar_prodi: !!Number(m.luar_prodi ?? 0),
      nidn_koordinator: m.nidn_koordinator ?? null,
      deskripsi: m.deskripsi ?? '',
      id_matkul_feeder: m.id_matkul_feeder ?? '',
    }),
    [],
  );
  const cplDari = React.useCallback(
    (m: Partial<MkDetail>): string[] =>
      ((m.cpl as unknown as Array<{ cpl_id?: number } | string> | null | undefined) ?? [])
        .map((x) => (typeof x === 'string' ? cplQ.data?.find((c) => c.kode === x)?.id : x?.cpl_id))
        .filter((x): x is number => x != null)
        .map(String),
    [cplQ.data],
  );
  const prasyaratDari = (m: Partial<MkDetail>): BarisPrasyarat[] =>
    ((m.prasyarat as Array<{ prasyarat_id: number; jenis: string; nilai_min?: string | null }> | undefined) ?? []).map((x) => ({ prasyarat_id: String(x.prasyarat_id), jenis: x.jenis, nilai_min: x.nilai_min ?? '' }));
  const [f, setF] = React.useState(() => isi(awal));
  const [pras, setPras] = React.useState<BarisPrasyarat[]>([]);
  const [cpl, setCpl] = React.useState<string[] | null>(null);
  const [bk, setBk] = React.useState<string[] | null>(null);
  const [isianMk, setIsianMk] = React.useState<Record<string, unknown> | null>(null);
  const [step, setStep] = React.useState(0);
  const dibuat = React.useRef<number | null>(null);
  const dimuat = React.useRef(false);
  const draf = useDrafWizard(
    `mk:${kurikulumId}:${awal.id ?? 'baru'}`,
    true,
    React.useMemo(() => ({ f, pras, cpl, bk, isianMk }), [f, pras, cpl, bk, isianMk]),
    (x) => {
      dimuat.current = true;
      setF({ ...isi(awal), ...x.f });
      setPras(x.pras ?? []);
      setCpl(x.cpl ?? null);
      setBk(x.bk ?? null);
      setIsianMk(x.isianMk ?? null);
    },
    (x) => JSON.stringify(x.f) === JSON.stringify(isi(d)) && x.cpl === null && x.bk === null && x.isianMk === null && JSON.stringify(x.pras) === JSON.stringify(prasyaratDari(d)),
  );
  React.useEffect(() => {
    if (det.data && !dimuat.current) {
      dimuat.current = true;
      setF(isi(det.data as MkDetail));
      setPras(prasyaratDari(det.data as MkDetail));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [det.data, isi]);
  const { kirim, kolom } = useKirim();

  const W = new Set(a.isianMkWajib);
  const wajib = { nama_en: W.has('nama_en'), nidn: W.has('nidn'), metode: W.has('metode'), pertemuan: W.has('pertemuan'), kelompok: W.has('kelompok'), cpmk: W.has('cpmk') };
  const bantuWajib = (kode: string, teks?: string) => (W.has(kode) ? [teks, wajibMenurut(a)].filter(Boolean).join(' ') : teks);
  const pertemuanMin = a.isi?.mata_kuliah?.pertemuan_min ?? a.definisi?.rps?.pertemuan_min ?? null;
  const total = n(f.sks_tatap_muka) + n(f.sks_praktikum) + n(f.sks_praktik_lapangan) + n(f.sks_simulasi);
  const sem = f.semester === '' ? null : Number(f.semester);
  const lain = (semuaMk.data ?? []).filter((m) => m.id !== d.id);
  const bebanSemester = sem ? lain.filter((m) => (m.semester ?? 0) === sem && !pilihan(m)).reduce((x, m) => x + n(m.sks), 0) : 0;
  const maksAturan = sem ? a.maksSksSemester(sem) : null;
  const maks = sem ? (maksAturan ?? maksSksSemester(sem)) : null;
  const sesudah = bebanSemester + (pilihan(f) ? 0 : total);
  const pakaiCpl = !!a.punya('cpl') && (!!a.punya('cpmk') || wajib.cpmk);
  const pakaiBk = pakaiCpl && !!a.punya('bahan_kajian');
  const cplAwal = cplDari(d);
  const bkAwal = (d.bahan_kajian ?? []).map((x) => String(x.id));
  const cplPilih = cpl ?? cplAwal;
  const bkPilih = bk ?? bkAwal;
  const skemaMk = (a.definisi?.isian_mk ?? []).map((i) => ({ ...i, wajib: i.wajib || W.has(i.kode) }));
  const kunciIsian = k?.kode_prodi && f.kode_mk.trim() ? `${k.kode_prodi}:${(d.kode_mk ?? f.kode_mk).trim()}` : '';
  const isianQ = useSiakadQuery<{ nilai: Record<string, Record<string, unknown>> }>(['kurikulum-aturan', 'isian', 'mk', kunciIsian], (s, signal) => s.request({ method: 'GET', path: '/v1/kurikulum-aturan/isian', query: { entitas: 'mk', kunci: kunciIsian } }, { signal }), {
    enabled: !!d.id && !!kunciIsian && skemaMk.length > 0,
    staleTime: 0,
  });
  const nilaiMk = isianMk ?? isianQ.data?.nilai?.[''] ?? {};
  const perangkat = (a.isi?.mata_kuliah?.perangkat ?? []).filter((p) => !p.wajib_untuk?.length || p.wajib_untuk.includes(kategoriMk(f)));
  const opsiPras = lain
    .slice()
    .sort((x, y) => (x.semester ?? 99) - (y.semester ?? 99))
    .map((m) => ({ value: String(m.id), label: `${m.kode_mk} · ${m.nama}`, description: m.semester ? `Semester ${m.semester}` : 'Pilihan bebas', group: m.semester && sem && m.semester >= sem ? 'Semester sama/sesudahnya' : 'Semester sebelumnya' }));
  const namaMk = (id: string) => {
    const m = lain.find((x) => String(x.id) === id);
    return m ? `${m.kode_mk} ${m.nama}` : `MK #${id}`;
  };
  const kelompokOpsi = [...(wajib.kelompok ? [] : [{ value: '', label: 'Tidak dicatat' }]), ...Object.entries(KELOMPOK_MK).map(([value, l]) => ({ value, label: l }))];

  const steps: PanelLangkahStep[] = [
    {
      id: 'identitas',
      title: 'Identitas',
      description: 'Kode, nama, dan sifat mata kuliah.',
      error: !!(kolom.kode_mk || kolom.nama || kolom.jenis),
      validate: () => {
        if (a.memuat) return 'Tunggu sebentar, aturan kurikulum sedang dimuat.';
        const kode = f.kode_mk.trim();
        if (!kode) return 'Isi kode mata kuliah.';
        if (lain.some((m) => m.kode_mk.toLowerCase() === kode.toLowerCase())) return `Kode ${kode} sudah dipakai mata kuliah lain di kurikulum ini.`;
        if (!f.nama.trim()) return 'Isi nama mata kuliah.';
        if (wajib.nama_en && !f.nama_en.trim()) return `Isi nama dalam bahasa Inggris. ${wajibMenurut(a)}`;
        if (wajib.kelompok && !f.kelompok) return `Pilih kelompok MK. ${wajibMenurut(a)}`;
        return null;
      },
      content: (
        <div className="u-kk-form">
          <DrafDipulihkan waktu={draf.dipulihkan} onBuang={() => { draf.buang(); setF(isi(d)); setPras(prasyaratDari(d)); setCpl(null); setBk(null); setIsianMk(null); }} />
          <div className="u-kk-grid">
            <Field label="Kode MK" required error={kolom.kode_mk}>
              <Input value={f.kode_mk} onChange={(e) => setF({ ...f, kode_mk: e.target.value.toUpperCase() })} placeholder="IF101" />
            </Field>
            <Field label="Sifat" required error={kolom.jenis}>
              <Select value={f.jenis} onValueChange={(v) => setF({ ...f, jenis: v ?? 'A' })} options={JENIS_MK_OPSI} placeholder="Pilih…" />
            </Field>
          </div>
          <Field label="Nama mata kuliah" required error={kolom.nama}>
            <Input value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} />
          </Field>
          <Field label="Nama dalam bahasa Inggris" required={wajib.nama_en} optional={!wajib.nama_en} error={kolom.nama_en} description={bantuWajib('nama_en')}>
            <Input value={f.nama_en} onChange={(e) => setF({ ...f, nama_en: e.target.value })} />
          </Field>
          <Field label="Kelompok MK" required={wajib.kelompok} optional={!wajib.kelompok} error={kolom.kelompok} description={bantuWajib('kelompok')}>
            <Select value={f.kelompok || null} onValueChange={(v) => setF({ ...f, kelompok: v ?? '' })} options={kelompokOpsi} placeholder="Pilih…" />
          </Field>
          <Field label="Deskripsi singkat" optional>
            <Textarea rows={3} value={f.deskripsi} onChange={(e) => setF({ ...f, deskripsi: e.target.value })} />
          </Field>
          <RujukanAturan aturan={a} prodiDipilih={!!k} />
        </div>
      ),
    },
    {
      id: 'sks',
      title: 'SKS & semester',
      description: 'Total SKS dihitung dari tatap muka, praktikum, praktik lapangan, dan simulasi.',
      error: !!(kolom.semester || kolom.sks_tatap_muka || kolom.pertemuan),
      validate: () => {
        const bagian = [f.sks_tatap_muka, f.sks_praktikum, f.sks_praktik_lapangan, f.sks_simulasi];
        if (bagian.some((x) => x !== '' && (!Number.isFinite(Number(x)) || Number(x) < 0))) return 'SKS harus angka 0 atau lebih.';
        if (total <= 0) return 'Isi SKS minimal di satu komponen.';
        const p = f.pertemuan === '' ? null : Number(f.pertemuan);
        if (wajib.pertemuan && p == null) return `Isi jumlah pertemuan. ${wajibMenurut(a)}`;
        if (p != null && (!Number.isInteger(p) || p < 1 || p > 32)) return 'Jumlah pertemuan 1–32.';
        if (p != null && pertemuanMin && p < pertemuanMin) return `Jumlah pertemuan paling sedikit ${pertemuanMin} ${a.versi ? `menurut ${a.versi.nama} v${a.versi.versi}` : ''}.`.trim();
        return null;
      },
      content: (
        <div className="u-kk-form">
          <Field label="Semester" error={kolom.semester}>
            <Select value={f.semester} onValueChange={(v) => setF({ ...f, semester: v ?? '' })} options={SEMESTER_OPSI} placeholder="Pilih…" />
          </Field>
          <fieldset className="u-kk-fieldset">
            <legend>
              Beban SKS <span className="u-kk-total">Total {formatNumber(total)} SKS</span>
            </legend>
            <div className="u-kk-grid u-kk-grid-4">
              <Field label="Tatap muka" error={kolom.sks_tatap_muka}>
                <IsianAngka value={keAngka(f.sks_tatap_muka)} desimal={1} langkah={0.5} min={0} onValueChange={(n) => setF({ ...f, sks_tatap_muka: teksAngka(n) })} />
              </Field>
              <Field label="Praktikum">
                <IsianAngka value={keAngka(f.sks_praktikum)} desimal={1} langkah={0.5} min={0} onValueChange={(n) => setF({ ...f, sks_praktikum: teksAngka(n) })} />
              </Field>
              <Field label="Praktik lapangan">
                <IsianAngka value={keAngka(f.sks_praktik_lapangan)} desimal={1} langkah={0.5} min={0} onValueChange={(n) => setF({ ...f, sks_praktik_lapangan: teksAngka(n) })} />
              </Field>
              <Field label="Simulasi">
                <IsianAngka value={keAngka(f.sks_simulasi)} desimal={1} langkah={0.5} min={0} onValueChange={(n) => setF({ ...f, sks_simulasi: teksAngka(n) })} />
              </Field>
            </div>
          </fieldset>
          {sem && maks ? (
            sesudah > maks ? (
              <Alert variant="warning" title={`Semester ${sem} melebihi batas ${maks} SKS`}>
                MK wajib lain di semester ini {formatNumber(bebanSemester)} SKS; dengan MK ini jadi {formatNumber(sesudah)} SKS. Batas {maksAturan != null && a.versi ? `menurut ${a.versi.nama} v${a.versi.versi}` : 'menurut SN Dikti Pasal 17–18'}.
              </Alert>
            ) : (
              <p className="u-kw-beban">
                Semester {sem}: <b>{formatNumber(sesudah)}</b> dari batas <b>{maks}</b> SKS {maksAturan != null && a.versi ? `(${a.versi.nama} v${a.versi.versi})` : '(SN Dikti Pasal 17–18)'}
              </p>
            )
          ) : null}
          <Field label="Jumlah pertemuan" required={wajib.pertemuan} optional={!wajib.pertemuan} error={kolom.pertemuan} description={bantuWajib('pertemuan', pertemuanMin ? `Paling sedikit ${pertemuanMin} pertemuan.` : undefined)}>
            <IsianAngka value={keAngka(f.pertemuan)} min={1} max={32} onValueChange={(n) => setF({ ...f, pertemuan: teksAngka(n) })} />
          </Field>
        </div>
      ),
    },
    {
      id: 'pembelajaran',
      title: 'Pembelajaran',
      description: 'Cara mata kuliah dilaksanakan dan dinilai, serta dosen koordinatornya.',
      error: !!(kolom.bentuk_pembelajaran || kolom.nidn_koordinator),
      validate: () => {
        if (wajib.metode && !f.bentuk_pembelajaran.length) return `Pilih minimal satu bentuk pembelajaran. ${wajibMenurut(a)}`;
        if (wajib.nidn && !f.nidn_koordinator) return `Pilih dosen koordinator. ${wajibMenurut(a)}`;
        return null;
      },
      content: (
        <div className="u-kk-form">
          <div className="u-kk-grid">
            <Field label="Modalitas">
              <Select value={f.modalitas} onValueChange={(v) => setF({ ...f, modalitas: v ?? 'luring' })} options={MODALITAS} placeholder="Pilih…" />
            </Field>
            <Field label="Bentuk nilai">
              <Select
                value={f.bentuk_nilai}
                onValueChange={(v) => setF({ ...f, bentuk_nilai: v ?? 'ip' })}
                options={[
                  { value: 'ip', label: 'Huruf (masuk IP)' },
                  { value: 'lulus', label: 'Lulus/tidak lulus' },
                ]}
                placeholder="Pilih…"
              />
            </Field>
          </div>
          <Field label="Bentuk pembelajaran" required={wajib.metode} error={kolom.bentuk_pembelajaran} description={bantuWajib('metode', 'Pasal 15: kuliah, praktikum, praktik, proyek, magang, dll.')}>
            <CheckboxGroup columns={3} value={f.bentuk_pembelajaran} onValueChange={(v) => setF({ ...f, bentuk_pembelajaran: v })} options={BENTUK_PEMBELAJARAN.map((b) => ({ value: b, label: label(b) }))} />
          </Field>
          <Field label="Dosen koordinator" required={wajib.nidn} optional={!wajib.nidn} error={kolom.nidn_koordinator} description={bantuWajib('nidn', 'Koordinator dapat menyusun RPS mata kuliah ini.')}>
            <PilihEntitas jenis="dosen" value={f.nidn_koordinator} onValueChange={(v) => setF({ ...f, nidn_koordinator: v })} />
          </Field>
          {a.isi?.mbkm?.aktif || f.luar_prodi || !a.versi ? (
            <label className="u-kk-centang">
              <Switch checked={f.luar_prodi} onCheckedChange={(v) => setF({ ...f, luar_prodi: !!v })} /> Dapat ditempuh di luar prodi/kampus (MBKM)
            </label>
          ) : null}
          <Field label="id_matkul Neo Feeder" optional description="Untuk pelaporan PDDikti.">
            <Input value={f.id_matkul_feeder} onChange={(e) => setF({ ...f, id_matkul_feeder: e.target.value })} />
          </Field>
        </div>
      ),
    },
    {
      id: 'prasyarat',
      title: 'Prasyarat',
      description: 'Lulus = harus lulus dengan nilai minimal; pernah ambil = pernah menempuh; bersamaan = boleh di semester yang sama.',
      optional: true,
      validate: () => {
        if (pras.some((b) => !b.prasyarat_id)) return 'Pilih mata kuliah untuk setiap baris prasyarat, atau hapus barisnya.';
        const id = pras.map((b) => b.prasyarat_id);
        if (new Set(id).size !== id.length) return 'Ada mata kuliah prasyarat yang dipilih dua kali.';
        return null;
      },
      content: (
        <div className="u-kk-form">
          {!pras.length && <p className="u-kw-bantuan">Belum ada prasyarat. Mata kuliah ini dapat diambil tanpa syarat.</p>}
          {pras.map((b, i) => (
            <div key={i} className="u-kk-prasyarat">
              <Select value={b.prasyarat_id || null} onValueChange={(v) => setPras(pras.map((x, j) => (j === i ? { ...x, prasyarat_id: v ?? '' } : x)))} options={opsiPras} placeholder="Pilih…" aria-label="MK prasyarat" />
              <Select value={b.jenis} onValueChange={(v) => setPras(pras.map((x, j) => (j === i ? { ...x, jenis: v ?? 'lulus' } : x)))} options={JENIS_PRASYARAT} aria-label="Jenis prasyarat" />
              <Select
                value={b.nilai_min}
                disabled={b.jenis !== 'lulus'}
                onValueChange={(v) => setPras(pras.map((x, j) => (j === i ? { ...x, nilai_min: v ?? '' } : x)))}
                options={[{ value: '', label: 'Nilai bebas' }, ...['A', 'B', 'C', 'D'].map((x) => ({ value: x, label: `Minimal ${x}` }))]}
                aria-label="Nilai minimal"
              />
              <Button size="sm" variant="ghost" iconOnly aria-label="Hapus prasyarat" onClick={() => setPras(pras.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
            </div>
          ))}
          <div>
            <Button size="sm" variant="outline" onClick={() => setPras([...pras, { prasyarat_id: '', jenis: 'lulus', nilai_min: 'C' }])}>
              <Plus /> Tambah prasyarat
            </Button>
          </div>
        </div>
      ),
    },
    ...(pakaiCpl
      ? [
          {
            id: 'cpl',
            title: pakaiBk ? 'CPL & bahan kajian' : 'CPL yang didukung',
            description: wajib.cpmk ? wajibMenurut(a, a.punya('cpmk')?.nama ?? 'CPMK terpetakan ke CPL') : 'CPL kurikulum yang didukung mata kuliah ini. Bobot per CPL diatur lewat CPMK di ruang mata kuliah.',
            optional: !wajib.cpmk,
            validate: () => (wajib.cpmk && !cplPilih.length ? `Pilih minimal satu CPL yang didukung. ${wajibMenurut(a)}` : null),
            content: (
              <div className="u-kk-form">
                <Field label={a.punya('cpl')?.nama ?? 'CPL'} required={wajib.cpmk} description="Bobot per CPL diatur lewat CPMK di ruang mata kuliah.">
                  {cplQ.data?.length ? (
                    <CheckboxGroup columns={1} value={cplPilih} onValueChange={(v) => setCpl(v)} options={cplQ.data.map((c) => ({ value: String(c.id), label: `${c.kode} · ${RANAH_CPL[c.ranah] ?? c.ranah}`, description: potong(c.deskripsi, 160) }))} />
                  ) : (
                    <p className="u-kw-bantuan">{cplQ.loading ? 'Memuat CPL…' : 'Kurikulum belum punya CPL. Isi dulu di langkah CPL pada identitas kurikulum.'}</p>
                  )}
                </Field>
                {pakaiBk ? (
                  <Field label={a.punya('bahan_kajian')?.nama ?? 'Bahan kajian'} optional>
                    {bkQ.data?.length ? (
                      <CheckboxGroup columns={2} value={bkPilih} onValueChange={(v) => setBk(v)} options={bkQ.data.map((b) => ({ value: String(b.id), label: `${b.kode} · ${b.nama}` }))} />
                    ) : (
                      <p className="u-kw-bantuan">{bkQ.loading ? 'Memuat bahan kajian…' : 'Kurikulum belum punya bahan kajian.'}</p>
                    )}
                  </Field>
                ) : null}
              </div>
            ),
          } as PanelLangkahStep,
        ]
      : []),
    ...(skemaMk.length
      ? [
          {
            id: 'isian-mk',
            title: 'Isian tambahan',
            description: `Isian mata kuliah yang dituntut kerangka ${a.kerangka ?? ''}.`,
            validate: () => periksaIsianKerangka(skemaMk, nilaiMk),
            content: (
              <div className="u-kk-form">
                <IsianKerangkaDinamis isian={skemaMk} nilai={nilaiMk} rujukan={a.rujukan} onChange={(kode, v) => setIsianMk({ ...nilaiMk, [kode]: v })} />
              </div>
            ),
          } as PanelLangkahStep,
        ]
      : []),
    {
      id: 'tinjau',
      title: 'Tinjau',
      description: 'Periksa ringkasan mata kuliah sebelum disimpan.',
      content: (
        <div className="u-kk-form">
          <WizardReview
            sections={[
              {
                title: 'Identitas',
                onEdit: () => setStep(0),
                items: [
                  { label: 'Mata kuliah', value: f.kode_mk && f.nama ? `${f.kode_mk.trim()} · ${f.nama.trim()}` : '' },
                  ...(f.nama_en.trim() ? [{ label: 'Nama Inggris', value: f.nama_en.trim() }] : []),
                  { label: 'Sifat', value: JENIS_MK[f.jenis] ?? f.jenis },
                  { label: 'Kelompok', value: f.kelompok ? (KELOMPOK_MK[f.kelompok] ?? f.kelompok) : wajib.kelompok ? '' : 'Tidak dicatat' },
                ],
              },
              {
                title: 'SKS & semester',
                onEdit: () => setStep(1),
                missing: sem && maks && sesudah > maks ? `Semester ${sem} jadi ${formatNumber(sesudah)} SKS, melebihi batas ${maks}.` : undefined,
                items: [
                  { label: 'Beban', value: `${formatNumber(total)} SKS (${[['tatap muka', f.sks_tatap_muka], ['praktikum', f.sks_praktikum], ['lapangan', f.sks_praktik_lapangan], ['simulasi', f.sks_simulasi]].filter(([, v]) => n(v)).map(([l, v]) => `${l} ${v}`).join(', ') || '–'})` },
                  { label: 'Ditawarkan', value: sem ? `Semester ${sem}` : 'Pilihan bebas (tanpa semester paket)' },
                  { label: 'Pertemuan', value: f.pertemuan ? `${f.pertemuan} kali` : '' },
                ],
              },
              {
                title: 'Pembelajaran',
                onEdit: () => setStep(2),
                items: [
                  { label: 'Cara belajar', value: `${MODALITAS.find((m) => m.value === f.modalitas)?.label ?? f.modalitas}; ${f.bentuk_pembelajaran.map(label).join(', ') || '–'}` },
                  { label: 'Nilai', value: f.bentuk_nilai === 'lulus' ? 'Lulus/tidak lulus (tidak masuk IP)' : 'Huruf, dihitung dalam IP' },
                  { label: 'Dosen koordinator', value: f.nidn_koordinator ? (d.nidn_koordinator === f.nidn_koordinator && d.nama_koordinator ? d.nama_koordinator : `NIDN ${f.nidn_koordinator}`) : wajib.nidn ? '' : 'Belum ditentukan' },
                  ...(f.luar_prodi ? [{ label: 'MBKM', value: 'Dapat ditempuh di luar prodi/kampus' }] : []),
                ],
              },
              {
                title: 'Prasyarat',
                onEdit: () => setStep(3),
                items: [{ label: 'Syarat mengambil', value: pras.length ? pras.map((b) => `${namaMk(b.prasyarat_id)} (${JENIS_PRASYARAT.find((j) => j.value === b.jenis)?.label.toLowerCase()}${b.jenis === 'lulus' && b.nilai_min ? `, min. ${b.nilai_min}` : ''})`).join('; ') : 'Tanpa prasyarat' }],
              },
              ...(pakaiCpl
                ? [
                    {
                      title: pakaiBk ? 'CPL & bahan kajian' : 'CPL yang didukung',
                      onEdit: () => setStep(4),
                      missing: wajib.cpmk && !cplPilih.length ? 'Belum ada CPL yang didukung.' : undefined,
                      items: [
                        { label: 'CPL', value: cplPilih.map((id) => cplQ.data?.find((c) => String(c.id) === id)?.kode ?? id).join(', ') },
                        ...(pakaiBk ? [{ label: 'Bahan kajian', value: bkPilih.map((id) => bkQ.data?.find((b) => String(b.id) === id)?.kode ?? id).join(', ') || 'Tidak ada' }] : []),
                      ],
                    },
                  ]
                : []),
              ...(skemaMk.length ? [{ title: 'Isian tambahan', onEdit: () => setStep(steps.length - 2), items: skemaMk.map((i) => ({ label: i.nama, value: ringkasNilaiIsian(i, nilaiMk[i.kode]) })) }] : []),
            ]}
          />
          {a.versi ? (
            <Alert variant="info" title="Perangkat yang wajib dilengkapi setelah disimpan">
              {perangkat.length
                ? `Untuk mata kuliah ${NAMA_KATEGORI[kategoriMk(f)]}: ${perangkat.map((p) => p.nama).join(', ')} (bukti diunggah dan diverifikasi di tab Perangkat). `
                : `Aturan tidak mewajibkan perangkat untuk mata kuliah ${NAMA_KATEGORI[kategoriMk(f)]}. `}
              Menurut {a.rujukan}.
            </Alert>
          ) : null}
        </div>
      ),
    },
  ];

  const simpan = async (): Promise<string | null> => {
    const body = {
      kode_mk: f.kode_mk.trim(),
      nama: f.nama.trim(),
      nama_en: kosongJadiNull(f.nama_en),
      semester: f.semester === '' ? null : Number(f.semester),
      jenis: f.jenis,
      kelompok: f.kelompok || null,
      sks_tatap_muka: n(f.sks_tatap_muka),
      sks_praktikum: n(f.sks_praktikum),
      sks_praktik_lapangan: n(f.sks_praktik_lapangan),
      sks_simulasi: n(f.sks_simulasi),
      modalitas: f.modalitas,
      bentuk_nilai: f.bentuk_nilai,
      bentuk_pembelajaran: f.bentuk_pembelajaran,
      pertemuan: angkaAtauNull(f.pertemuan),
      luar_prodi: f.luar_prodi,
      nidn_koordinator: f.nidn_koordinator || null,
      deskripsi: kosongJadiNull(f.deskripsi),
      id_matkul_feeder: kosongJadiNull(f.id_matkul_feeder),
    };
    const id0 = d.id ?? dibuat.current;
    let hasil: MkDetail | undefined;
    try {
      hasil = await kirim<MkDetail>(id0 ? 'PUT' : 'POST', id0 ? `${P}/mk/${id0}` : `${P}/kurikulum/${kurikulumId}/mk`, body);
    } catch (e) {
      return pesanGalat(e);
    }
    const id = hasil?.id ?? id0;
    if (!id) return 'Server tidak mengembalikan mata kuliah yang disimpan.';
    if (!d.id) dibuat.current = id;
    const gagal: string[] = [];
    const tulis = async (nama: string, method: 'PUT', path: string, isiBody: unknown) => {
      try {
        await siakad.request({ method, path, body: isiBody });
      } catch (e) {
        gagal.push(`${nama} (${pesanGalat(e)})`);
      }
    };
    if (JSON.stringify(pras) !== JSON.stringify(prasyaratDari(d)))
      await tulis('prasyarat', 'PUT', `${P}/mk/${id}/prasyarat`, { prasyarat: pras.map((b) => ({ prasyarat_id: Number(b.prasyarat_id), jenis: b.jenis, nilai_min: b.jenis === 'lulus' && b.nilai_min ? b.nilai_min : null })) });
    const beda = (awal0: string[], kini: string[]) => ({ tambah: kini.filter((x) => !awal0.includes(x)), hapus: awal0.filter((x) => !kini.includes(x)) });
    if (pakaiCpl && cpl) {
      const x = beda(cplAwal, cpl);
      if (x.tambah.length || x.hapus.length)
        await tulis('pemetaan CPL', 'PUT', `${P}/kurikulum/${kurikulumId}/matriks/cpl-mk`, { tambah: x.tambah.map((c) => ({ mk_id: id, cpl_id: Number(c) })), hapus: x.hapus.map((c) => ({ mk_id: id, cpl_id: Number(c) })) });
    }
    if (pakaiBk && bk) {
      const x = beda(bkAwal, bk);
      if (x.tambah.length || x.hapus.length)
        await tulis('pemetaan bahan kajian', 'PUT', `${P}/kurikulum/${kurikulumId}/matriks/bk-mk`, { tambah: x.tambah.map((b) => ({ mk_id: id, bk_id: Number(b) })), hapus: x.hapus.map((b) => ({ mk_id: id, bk_id: Number(b) })) });
    }
    if (isianMk && k?.kode_prodi)
      await tulis('isian tambahan', 'PUT', '/v1/kurikulum-aturan/isian', { entitas: 'mk', kunci: `${k.kode_prodi}:${body.kode_mk}`, bagian: '', nilai: Object.fromEntries(Object.entries({ ...(isianQ.data?.nilai?.[''] ?? {}), ...isianMk }).map(([x, v]) => [x, nilaiKirim(v)])) });
    invalidateSiakad('kur');
    invalidateSiakad('kurikulum-aturan');
    if (gagal.length) return `Mata kuliah tersimpan, tetapi belum semua tersimpan: ${gagal.join('; ')}. Perbaiki lalu simpan lagi.`;
    toast.add({ title: d.id ? 'Mata kuliah disimpan.' : 'Mata kuliah ditambahkan.', type: 'success' });
    draf.selesai();
    return null;
  };

  return (
    <PanelLangkah
      open
      onOpenChange={(o) => !o && onTutup()}
      size="lg"
      mode={d.id ? 'ubah' : 'buat'}
      title={d.id ? `Ubah ${d.kode_mk}` : 'Tambah mata kuliah'}
      description={d.id ? d.nama : 'Isian wajib mengikuti aturan kurikulum yang berlaku.'}
      steps={steps}
      step={step}
      onStepChange={setStep}
      finishLabel="Simpan mata kuliah"
      footerNote="Bertanda * wajib. Isian tersimpan sementara bila panel ditutup."
      onFinish={simpan}
    />
  );
}

function FormPrasyarat({ kurikulumId, mk, onTutup }: { kurikulumId: number | string; mk: MkKurikulum; onTutup: () => void }) {
  const semua = useMkKurikulum(kurikulumId);
  const det = useMataKuliahObe(mk.id);
  const [baris, setBaris] = React.useState<Array<{ prasyarat_id: string; jenis: string; nilai_min: string }>>([]);
  const dimuat = React.useRef(false);
  React.useEffect(() => {
    const p = (det.data as MkDetail | undefined)?.prasyarat as Array<{ prasyarat_id: number; jenis: string; nilai_min?: string | null }> | undefined;
    if (p && !dimuat.current) {
      dimuat.current = true;
      setBaris(p.map((x) => ({ prasyarat_id: String(x.prasyarat_id), jenis: x.jenis, nilai_min: x.nilai_min ?? '' })));
    }
  }, [det.data]);
  const { kirim, sibuk, galat } = useKirim();
  const opsi = (semua.data ?? [])
    .filter((m) => m.id !== mk.id)
    .sort((a, b) => (a.semester ?? 99) - (b.semester ?? 99))
    .map((m) => ({ value: String(m.id), label: `${m.kode_mk} · ${m.nama}`, description: m.semester ? `Semester ${m.semester}` : 'Pilihan bebas', group: m.semester && mk.semester && m.semester >= mk.semester ? 'Semester sama/sesudahnya' : 'Semester sebelumnya' }));
  return (
    <Dialog
      side="right"
      open
      size="lg"
      onOpenChange={(o) => !o && onTutup()}
      title={`Prasyarat ${mk.kode_mk} ${mk.nama}`}
      description="Lulus = harus lulus dengan nilai minimal; pernah ambil = pernah menempuh; bersamaan = boleh diambil di semester yang sama. Prasyarat melingkar ditolak."
      footer={
        <>
          <Button variant="ghost" onClick={onTutup}>
            Batal
          </Button>
          <Button
            loading={sibuk}
            disabled={baris.some((b) => !b.prasyarat_id)}
            onClick={async () => {
              try {
                await kirim('PUT', `${P}/mk/${mk.id}/prasyarat`, { prasyarat: baris.map((b) => ({ prasyarat_id: Number(b.prasyarat_id), jenis: b.jenis, nilai_min: b.jenis === 'lulus' && b.nilai_min ? b.nilai_min : null })) }, 'Prasyarat disimpan.');
                onTutup();
              } catch {
                /* tampil */
              }
            }}
          >
            Simpan prasyarat
          </Button>
        </>
      }
    >
      <div className="u-kk-form">
        <KotakGalat galat={galat} />
        {!baris.length && <p className="u-kk-catatan">Belum ada prasyarat. MK ini dapat diambil tanpa syarat.</p>}
        {baris.map((b, i) => (
          <div key={i} className="u-kk-prasyarat">
            <Select value={b.prasyarat_id} onValueChange={(v) => setBaris(baris.map((x, j) => (j === i ? { ...x, prasyarat_id: v ?? '' } : x)))} options={opsi} placeholder="Pilih MK prasyarat" aria-label="MK prasyarat" />
            <Select
              value={b.jenis}
              onValueChange={(v) => setBaris(baris.map((x, j) => (j === i ? { ...x, jenis: v ?? 'lulus' } : x)))}
              options={[
                { value: 'lulus', label: 'Harus lulus' },
                { value: 'pernah_ambil', label: 'Pernah ambil' },
                { value: 'bersamaan', label: 'Bersamaan' },
              ]}
              aria-label="Jenis prasyarat"
            />
            <Select
              value={b.nilai_min}
              disabled={b.jenis !== 'lulus'}
              onValueChange={(v) => setBaris(baris.map((x, j) => (j === i ? { ...x, nilai_min: v ?? '' } : x)))}
              options={[{ value: '', label: 'Nilai bebas' }, ...['A', 'B', 'C', 'D'].map((x) => ({ value: x, label: `Minimal ${x}` }))]}
              aria-label="Nilai minimal"
            />
            <Button size="sm" variant="ghost" iconOnly aria-label="Hapus prasyarat" onClick={() => setBaris(baris.filter((_, j) => j !== i))}>
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => setBaris([...baris, { prasyarat_id: '', jenis: 'lulus', nilai_min: 'C' }])}>
          <Plus /> Tambah prasyarat
        </Button>
      </div>
    </Dialog>
  );
}

// ================================================================ CPMK & sub-CPMK
export interface KelolaCpmkProps {
  mkId: number | string;
  kurikulumId: number | string;
  bolehUbah?: boolean;
  className?: string;
}

/** CPMK satu mata kuliah beserta CPL yang didukung (berbobot) dan sub-CPMK + indikator, dengan tambah/ubah/hapus. */
export function KelolaCpmk({ mkId, kurikulumId, bolehUbah, className }: KelolaCpmkProps) {
  const q = useMataKuliahObe(mkId);
  const [cpmk, setCpmk] = React.useState<Partial<Cpmk> | null>(null);
  const [sub, setSub] = React.useState<{ cpmkId: number; awal: Partial<NonNullable<Cpmk['sub_cpmk']>[number]> } | null>(null);
  const [hapus, setHapus] = React.useState<{ jenis: 'cpmk' | 'sub'; id: number; kode: string } | null>(null);
  const { kirim } = useKirim();
  const m = q.data as MkDetail | undefined;
  const daftar = m?.cpmk ?? [];
  const cplMk = (m?.cpl ?? []) as unknown as Array<{ cpl_id: number; kode: string }>;
  return (
    <div className={cn('u-kk-blok', className)}>
      <div className="u-kk-toolbar">
        <p className="u-kk-catatan">
          {cplMk.length ? (
            <>
              MK ini dipetakan ke {cplMk.map((c) => c.kode).join(', ')}. Tiap CPMK sebaiknya mendukung minimal satu CPL itu.
            </>
          ) : (
            'MK ini belum dipetakan ke CPL. Petakan lewat tab Matriks atau saat menambah CPMK.'
          )}
        </p>
        {bolehUbah && (
          <Button size="sm" onClick={() => setCpmk({ kode: `CPMK${daftar.length + 1}` })}>
            <Plus /> Tambah CPMK
          </Button>
        )}
      </div>
      {q.loading && !m ? (
        <Progress value={null} size="sm" />
      ) : !daftar.length ? (
        <Empty icon={<ListChecks />} title="CPMK belum diisi" description="CPMK menurunkan CPL ke tingkat mata kuliah; sub-CPMK menjadi capaian tiap pertemuan di RPS." bordered />
      ) : (
        <ol className="u-kk-cpmk">
          {daftar.map((c) => (
            <li key={c.id}>
              <div className="u-kk-cpmk-kepala">
                <span className="u-kur-code">{c.kode}</span>
                <p>{c.deskripsi}</p>
                <span className="u-kk-cpmk-cpl">
                  {(c.cpl ?? []).map((x) => (
                    <Badge key={x.cpl_id} variant="secondary" title={x.bobot != null ? `bobot ${x.bobot}` : undefined}>
                      {x.kode}
                      {x.bobot != null && n(x.bobot) !== 1 ? ` ×${formatNumber(n(x.bobot))}` : ''}
                    </Badge>
                  ))}
                  {!c.cpl?.length && <span className="u-kk-warn">tanpa CPL</span>}
                </span>
                {bolehUbah && (
                  <Menu
                    trigger={
                      <Button size="sm" variant="ghost" iconOnly aria-label={`Aksi ${c.kode}`}>
                        ⋯
                      </Button>
                    }
                    items={[
                      { label: 'Ubah CPMK', icon: <PenLine />, onSelect: () => setCpmk(c) },
                      { label: 'Tambah sub-CPMK', icon: <Plus />, onSelect: () => setSub({ cpmkId: c.id, awal: { kode: `Sub-${c.kode}.${(c.sub_cpmk?.length ?? 0) + 1}` } }) },
                      { type: 'separator' },
                      { label: 'Hapus CPMK', icon: <Trash2 />, destructive: true, onSelect: () => setHapus({ jenis: 'cpmk', id: c.id, kode: c.kode }) },
                    ]}
                  />
                )}
              </div>
              {!!c.sub_cpmk?.length && (
                <ul className="u-kk-sub">
                  {c.sub_cpmk.map((s) => (
                    <li key={s.id}>
                      <span className="u-kur-code">{s.kode}</span>
                      <span>
                        {s.deskripsi}
                        {s.indikator && <small>Indikator: {s.indikator}</small>}
                      </span>
                      {bolehUbah && (
                        <span className="u-kk-sub-aksi">
                          <Button size="xs" variant="ghost" iconOnly aria-label={`Ubah ${s.kode}`} onClick={() => setSub({ cpmkId: c.id, awal: s })}>
                            <PenLine />
                          </Button>
                          <Button size="xs" variant="ghost" iconOnly aria-label={`Hapus ${s.kode}`} onClick={() => setHapus({ jenis: 'sub', id: s.id, kode: s.kode })}>
                            <Trash2 />
                          </Button>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
      {cpmk && <FormCpmk mkId={mkId} kurikulumId={kurikulumId} awal={cpmk} onTutup={() => setCpmk(null)} />}
      {sub && <FormSubCpmk cpmkId={sub.cpmkId} awal={sub.awal} onTutup={() => setSub(null)} />}
      <ConfirmDialog
        open={!!hapus}
        onOpenChange={(o) => !o && setHapus(null)}
        title={`Hapus ${hapus?.kode ?? ''}?`}
        description={hapus?.jenis === 'cpmk' ? 'Sub-CPMK dan pemetaannya ke RPS ikut terhapus.' : 'Pertemuan RPS yang memakai sub-CPMK ini kehilangan rujukannya.'}
        confirmLabel="Hapus"
        onConfirm={async () => {
          if (hapus) await kirim('DELETE', hapus.jenis === 'cpmk' ? `${P}/cpmk/${hapus.id}` : `${P}/sub-cpmk/${hapus.id}`, undefined, `${hapus.kode} dihapus.`).catch(abaikan);
        }}
      />
    </div>
  );
}

function FormCpmk({ mkId, kurikulumId, awal, onTutup }: { mkId: number | string; kurikulumId: number | string; awal: Partial<Cpmk>; onTutup: () => void }) {
  const cpl = useCplKurikulum(kurikulumId);
  const [f, setF] = React.useState({ kode: awal.kode ?? '', deskripsi: awal.deskripsi ?? '', target: awal.target != null ? String(awal.target) : '' });
  const [peta, setPeta] = React.useState<Record<number, string>>(() => Object.fromEntries((awal.cpl ?? []).map((c) => [c.cpl_id, String(c.bobot ?? 1)])));
  const { kirim, sibuk, galat, kolom } = useKirim();
  return (
    <Dialog
      side="right"
      open
      size="lg"
      onOpenChange={(o) => !o && onTutup()}
      title={awal.id ? `Ubah ${awal.kode}` : 'Tambah CPMK'}
      footer={
        <>
          <Button variant="ghost" onClick={onTutup}>
            Batal
          </Button>
          <Button
            loading={sibuk}
            disabled={!f.kode.trim() || !f.deskripsi.trim()}
            onClick={async () => {
              const body = { kode: f.kode.trim(), deskripsi: f.deskripsi.trim(), target: angkaAtauNull(f.target), cpl: Object.entries(peta).map(([id, b]) => ({ cpl_id: Number(id), bobot: n(b) || 1 })) };
              try {
                await kirim(awal.id ? 'PUT' : 'POST', awal.id ? `${P}/cpmk/${awal.id}` : `${P}/mk/${mkId}/cpmk`, body, 'CPMK disimpan.');
                onTutup();
              } catch {
                /* tampil */
              }
            }}
          >
            Simpan CPMK
          </Button>
        </>
      }
    >
      <div className="u-kk-form">
        <KotakGalat galat={galat} />
        <div className="u-kk-grid">
          <Field label="Kode" required error={kolom.kode}>
            <Input value={f.kode} onChange={(e) => setF({ ...f, kode: e.target.value })} />
          </Field>
          <Field label="Target capaian" optional description="Skor 0–100">
            <IsianAngka value={keAngka(f.target)} min={0} max={100} onValueChange={(n) => setF({ ...f, target: teksAngka(n) })} />
          </Field>
        </div>
        <Field label="Rumusan CPMK" required error={kolom.deskripsi}>
          <Textarea rows={3} value={f.deskripsi} onChange={(e) => setF({ ...f, deskripsi: e.target.value })} placeholder="Mahasiswa mampu…" />
        </Field>
        <Field label="CPL yang didukung" description="Centang CPL, isi bobot kontribusi (bawaan 1).">
          <ul className="u-kk-pilih-cpl">
            {(cpl.data ?? []).map((c) => {
              const on = peta[c.id] != null;
              return (
                <li key={c.id} data-on={dataFlag(on)}>
                  <label>
                    <Checkbox
                      checked={on}
                      onCheckedChange={(v) =>
                        setPeta((p) => {
                          const x = { ...p };
                          if (v) x[c.id] = '1';
                          else delete x[c.id];
                          return x;
                        })
                      }
                    />
                    <span className="u-kur-code">{c.kode}</span>
                    <span className="u-kk-teks">{c.deskripsi}</span>
                  </label>
                  {on && <IsianAngka value={keAngka(peta[c.id])} desimal={1} langkah={0.5} size="sm" min={0} aria-label={`Bobot ${c.kode}`} onValueChange={(n) => setPeta({ ...peta, [c.id]: teksAngka(n) })} />}
                </li>
              );
            })}
            {!cpl.data?.length && <li className="u-kk-catatan">Kurikulum ini belum punya CPL.</li>}
          </ul>
        </Field>
      </div>
    </Dialog>
  );
}

function FormSubCpmk({ cpmkId, awal, onTutup }: { cpmkId: number; awal: { id?: number; kode?: string; deskripsi?: string; indikator?: string | null }; onTutup: () => void }) {
  const [f, setF] = React.useState({ kode: awal.kode ?? '', deskripsi: awal.deskripsi ?? '', indikator: awal.indikator ?? '' });
  const { kirim, sibuk, galat, kolom } = useKirim();
  return (
    <Dialog
      side="right"
      open
      onOpenChange={(o) => !o && onTutup()}
      title={awal.id ? `Ubah ${awal.kode}` : 'Tambah sub-CPMK'}
      footer={
        <>
          <Button variant="ghost" onClick={onTutup}>
            Batal
          </Button>
          <Button
            loading={sibuk}
            disabled={!f.kode.trim() || !f.deskripsi.trim()}
            onClick={async () => {
              try {
                await kirim(awal.id ? 'PUT' : 'POST', awal.id ? `${P}/sub-cpmk/${awal.id}` : `${P}/cpmk/${cpmkId}/sub`, { kode: f.kode.trim(), deskripsi: f.deskripsi.trim(), indikator: kosongJadiNull(f.indikator) }, 'Sub-CPMK disimpan.');
                onTutup();
              } catch {
                /* tampil */
              }
            }}
          >
            Simpan sub-CPMK
          </Button>
        </>
      }
    >
      <div className="u-kk-form">
        <KotakGalat galat={galat} />
        <Field label="Kode" required error={kolom.kode}>
          <Input value={f.kode} onChange={(e) => setF({ ...f, kode: e.target.value })} />
        </Field>
        <Field label="Rumusan sub-CPMK" required error={kolom.deskripsi}>
          <Textarea rows={3} value={f.deskripsi} onChange={(e) => setF({ ...f, deskripsi: e.target.value })} />
        </Field>
        <Field label="Indikator penilaian" optional>
          <Textarea rows={2} value={f.indikator} onChange={(e) => setF({ ...f, indikator: e.target.value })} />
        </Field>
      </div>
    </Dialog>
  );
}

// ================================================================ RPS
export interface KelolaRpsProps {
  mkId: number | string;
  /** Boleh membuat/menyusun RPS draf (penyusun prodi atau dosen koordinator/pengampu). */
  bolehSusun?: boolean;
  /** Boleh mengesahkan RPS (program studi). */
  bolehSahkan?: boolean;
  className?: string;
}

/**
 * Versi RPS satu mata kuliah: buat versi baru (kosong atau salin dari versi lain), susun identitas, rencana pertemuan
 * per minggu (sub-CPMK, materi, metode, modalitas, waktu, bobot), rencana evaluasi berbobot total 100 dengan pemetaan
 * ke CPMK dan komponen nilai SIAKAD, sahkan, dan cetak.
 */
export function KelolaRps({ mkId, bolehSusun, bolehSahkan, className }: KelolaRpsProps) {
  const q = useMataKuliahObe(mkId);
  const m = q.data as MkDetail | undefined;
  const versi = m?.rps ?? [];
  const [pilih, setPilih] = React.useState<number | null>(null);
  const { kirim, sibuk } = useKirim();
  const toast = useToast();
  React.useEffect(() => {
    if (pilih == null && versi.length) setPilih((versi.find((v) => v.status === 'draf') ?? versi.find((v) => v.status === 'disahkan') ?? versi[0])!.id);
  }, [versi, pilih]);
  const buat = async (salin?: number) => {
    try {
      const r = await kirim<Rps>('POST', `${P}/mk/${mkId}/rps`, salin ? { salin_dari: salin } : {}, salin ? 'RPS baru disalin dari versi sebelumnya.' : 'RPS draf dibuat.');
      if (r?.id) setPilih(r.id);
    } catch (e) {
      toast.add({ title: pesanGalat(e), type: 'error' });
    }
  };
  const aktif = versi.find((v) => v.id === pilih);
  const sah = versi.find((v) => v.status === 'disahkan');
  return (
    <div className={cn('u-kk-blok', className)}>
      <div className="u-kk-toolbar">
        <div className="u-kk-versi" role="tablist" aria-label="Versi RPS">
          {versi.map((v) => (
            <button key={v.id} type="button" role="tab" aria-selected={v.id === pilih} data-active={dataFlag(v.id === pilih)} onClick={() => setPilih(v.id)}>
              Versi {v.versi}
              <Badge variant={v.status === 'disahkan' ? 'success' : v.status === 'draf' ? 'warning' : 'outline'}>{label(v.status)}</Badge>
            </button>
          ))}
        </div>
        {bolehSusun && !versi.some((v) => v.status === 'draf') && (
          <span className="u-kk-aksi">
            {versi.length > 0 && (
              <Button size="sm" variant="outline" loading={sibuk} onClick={() => void buat((sah ?? versi[0])!.id)}>
                <Copy /> Revisi dari versi {(sah ?? versi[0])!.versi}
              </Button>
            )}
            <Button size="sm" loading={sibuk} onClick={() => void buat()}>
              <Plus /> {versi.length ? 'RPS kosong' : 'Buat RPS'}
            </Button>
          </span>
        )}
      </div>
      {q.loading && !m ? (
        <Progress value={null} size="sm" />
      ) : !versi.length ? (
        <Empty icon={<FileText />} title="RPS belum dibuat" description={bolehSusun ? 'Buat RPS: susun rencana pertemuan dari sub-CPMK, lalu rencana evaluasi berbobot 100%.' : 'RPS disusun dosen koordinator/pengampu dan disahkan program studi.'} bordered />
      ) : aktif ? (
        aktif.status === 'draf' && bolehSusun ? (
          <EditorRps key={aktif.id} rpsId={aktif.id} bolehSahkan={bolehSahkan} />
        ) : (
          <div className="u-kk-rps-lihat">
            <div className="u-kk-toolbar">
              <p className="u-kk-catatan">
                {aktif.status === 'disahkan' ? `Disahkan ${aktif.disahkan_at ? formatDate(aktif.disahkan_at) : ''}.` : aktif.status === 'arsip' ? 'Versi lama (arsip).' : 'Draf: hanya penyusun yang dapat mengubah.'}
              </p>
              <Button size="sm" variant="outline" onClick={() => cetakRps(aktif.id)}>
                <Printer /> Cetak
              </Button>
            </div>
            <div id={`u-kk-rps-${aktif.id}`}>
              <RpsMataKuliah rpsId={aktif.id} />
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}

function cetakRps(rpsId: number) {
  const el = typeof document !== 'undefined' ? document.getElementById(`u-kk-rps-${rpsId}`) : null;
  if (!el) return;
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return;
  const gaya = [...document.querySelectorAll('style, link[rel="stylesheet"]')].map((s) => s.outerHTML).join('');
  w.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>RPS</title>${gaya}<style>body{background:#fff;padding:24px}@page{size:A4;margin:16mm}</style></head><body>${el.innerHTML}</body></html>`);
  w.document.close();
  w.addEventListener('load', () => w.print());
}

type BarisPertemuan = Rps['pertemuan'][number] & { _k: number };
type BarisEvaluasi = Rps['evaluasi'][number] & { _k: number };
let kunciBaris = 0;

/** Penyusun RPS draf: identitas, rencana pertemuan, rencana evaluasi, pratinjau, dan pengesahan. */
export function EditorRps({ rpsId, bolehSahkan, className }: { rpsId: number | string; bolehSahkan?: boolean; className?: string }) {
  const q = useRps(rpsId);
  const r = q.data;
  const [tab, setTab] = React.useState<'identitas' | 'pertemuan' | 'evaluasi' | 'pratinjau' | 'kerangka'>('pertemuan');
  const [sahkan, setSahkan] = React.useState(false);
  const [hapus, setHapus] = React.useState(false);
  const { kirim, sibuk, galat } = useKirim();
  if (!r) return <Progress value={null} size="sm" />;
  const totalEval = r.evaluasi.reduce((a, e) => a + n(e.bobot), 0);
  const syarat = [
    { ok: (r.cpmk ?? []).length > 0, teks: 'MK punya CPMK' },
    { ok: r.pertemuan.length > 0, teks: `Rencana pertemuan diisi (${r.pertemuan.length})` },
    { ok: Math.abs(totalEval - 100) < 0.01, teks: `Bobot evaluasi total 100% (sekarang ${formatNumber(totalEval)}%)` },
  ];
  return (
    <div className={cn('u-kk-rps', className)}>
      <div className="u-kk-rps-syarat">
        {syarat.map((s) => (
          <span key={s.teks} data-ok={dataFlag(s.ok)}>
            {s.ok ? <CheckCircle2 aria-hidden /> : <CircleAlert aria-hidden />} {s.teks}
          </span>
        ))}
        <span className="u-kk-aksi">
          <Button size="sm" variant="destructive-soft" onClick={() => setHapus(true)}>
            <Trash2 /> Hapus draf
          </Button>
          {bolehSahkan && (
            <Button size="sm" disabled={!syarat.every((s) => s.ok)} onClick={() => setSahkan(true)}>
              <ShieldCheck /> Sahkan RPS
            </Button>
          )}
        </span>
      </div>
      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'pertemuan', label: 'Rencana pertemuan', count: r.pertemuan.length },
          { value: 'evaluasi', label: 'Rencana evaluasi', count: r.evaluasi.length },
          { value: 'identitas', label: 'Identitas & pustaka' },
          { value: 'pratinjau', label: 'Pratinjau' },
          { value: 'kerangka', label: 'Templat & pengesahan' },
        ]}
      />
      {tab === 'identitas' && <IdentitasRps r={r} />}
      {tab === 'pertemuan' && <EditorPertemuan r={r} />}
      {tab === 'evaluasi' && <EditorEvaluasi r={r} />}
      {tab === 'pratinjau' && (
        <div className="u-kk-cetak">
          <Button size="sm" variant="outline" onClick={() => window.print()}>Cetak RPS (PDF)</Button>
          <RpsMataKuliah rpsId={r.id} />
        </div>
      )}
      {tab === 'kerangka' && <RpsMenurutKerangka rpsId={Number(r.id)} onCetak={() => { setTab('pratinjau'); setTimeout(() => window.print(), 400); }} />}
      <ConfirmDialog
        open={sahkan}
        onOpenChange={setSahkan}
        tone="primary"
        title="Sahkan RPS ini?"
        description="RPS sah dipakai dosen pengampu dan dilaporkan ke Neo Feeder (rencana pembelajaran & evaluasi). Versi sah sebelumnya diarsipkan."
        confirmLabel="Sahkan RPS"
        onConfirm={async () => {
          await kirim('POST', `${P}/rps/${r.id}/sahkan`, {}, 'RPS disahkan.').catch(abaikan);
        }}
      />
      <ConfirmDialog
        open={hapus}
        onOpenChange={setHapus}
        title="Hapus RPS draf?"
        confirmLabel="Hapus draf"
        onConfirm={async () => {
          await kirim('DELETE', `${P}/rps/${r.id}`, undefined, 'RPS draf dihapus.').catch(abaikan);
        }}
      />
      {galat && !sibuk ? <KotakGalat galat={galat} /> : null}
    </div>
  );
}

function IdentitasRps({ r }: { r: Rps & { media_perangkat_lunak?: string | null; media_perangkat_keras?: string | null; catatan?: string | null } }) {
  const baris = (a?: string[]) => (a ?? []).join('\n');
  const [f, setF] = React.useState({
    tahun_id: r.tahun_id ?? null,
    deskripsi: r.deskripsi ?? '',
    materi_pokok: r.materi_pokok ?? '',
    pustaka_utama: baris(r.pustaka_utama),
    pustaka_pendukung: baris(r.pustaka_pendukung),
    media_perangkat_lunak: r.media_perangkat_lunak ?? '',
    media_perangkat_keras: r.media_perangkat_keras ?? '',
    dosen_pengampu: (r.dosen_pengampu ?? []).join(', '),
    catatan: r.catatan ?? '',
  });
  const { kirim, sibuk, galat } = useKirim();
  const pecah = (s: string) =>
    s
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);
  return (
    <div className="u-kk-form">
      <KotakGalat galat={galat} />
      <div className="u-kk-grid">
        <Field label="Berlaku mulai semester" optional>
          <PilihTahunAkademik value={f.tahun_id} onValueChange={(v) => setF({ ...f, tahun_id: v })} />
        </Field>
        <Field label="Tim dosen pengampu (NIDN)" optional description="Pisahkan dengan koma; mereka dapat ikut menyusun RPS.">
          <Input value={f.dosen_pengampu} onChange={(e) => setF({ ...f, dosen_pengampu: e.target.value })} />
        </Field>
      </div>
      <Field label="Deskripsi mata kuliah" optional>
        <Textarea rows={3} value={f.deskripsi} onChange={(e) => setF({ ...f, deskripsi: e.target.value })} />
      </Field>
      <Field label="Bahan kajian / materi pokok" optional>
        <Textarea rows={3} value={f.materi_pokok} onChange={(e) => setF({ ...f, materi_pokok: e.target.value })} />
      </Field>
      <div className="u-kk-grid">
        <Field label="Pustaka utama" optional description="Satu pustaka per baris">
          <Textarea rows={4} value={f.pustaka_utama} onChange={(e) => setF({ ...f, pustaka_utama: e.target.value })} />
        </Field>
        <Field label="Pustaka pendukung" optional description="Satu pustaka per baris">
          <Textarea rows={4} value={f.pustaka_pendukung} onChange={(e) => setF({ ...f, pustaka_pendukung: e.target.value })} />
        </Field>
        <Field label="Media: perangkat lunak" optional>
          <Input value={f.media_perangkat_lunak} onChange={(e) => setF({ ...f, media_perangkat_lunak: e.target.value })} />
        </Field>
        <Field label="Media: perangkat keras" optional>
          <Input value={f.media_perangkat_keras} onChange={(e) => setF({ ...f, media_perangkat_keras: e.target.value })} />
        </Field>
      </div>
      <div className="u-kk-simpan">
        <Button
          loading={sibuk}
          onClick={() =>
            void kirim(
              'PUT',
              `${P}/rps/${r.id}`,
              {
                tahun_id: f.tahun_id,
                deskripsi: kosongJadiNull(f.deskripsi),
                materi_pokok: kosongJadiNull(f.materi_pokok),
                pustaka_utama: pecah(f.pustaka_utama),
                pustaka_pendukung: pecah(f.pustaka_pendukung),
                media_perangkat_lunak: kosongJadiNull(f.media_perangkat_lunak),
                media_perangkat_keras: kosongJadiNull(f.media_perangkat_keras),
                dosen_pengampu: f.dosen_pengampu
                  .split(/[\s,;]+/)
                  .map((x) => x.trim())
                  .filter(Boolean),
                catatan: kosongJadiNull(f.catatan),
              },
              'Identitas RPS disimpan.',
            ).catch(abaikan)
          }
        >
          Simpan identitas
        </Button>
      </div>
    </div>
  );
}

function EditorPertemuan({ r }: { r: Rps }) {
  const [baris, setBaris] = React.useState<BarisPertemuan[]>(() => r.pertemuan.map((p) => ({ ...p, _k: ++kunciBaris })));
  const [ubah, setUbah] = React.useState(false);
  const { kirim, sibuk, galat } = useKirim();
  const sub = (r.cpmk ?? []).flatMap((c) => (c.sub_cpmk ?? []).map((s) => ({ value: String(s.id), label: s.kode, description: s.deskripsi, group: c.kode })));
  const set = (i: number, patch: Partial<BarisPertemuan>) => {
    setUbah(true);
    setBaris((b) => b.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  };
  const isiOtomatis = () => {
    const jumlah = 16;
    setUbah(true);
    setBaris(
      Array.from({ length: jumlah }, (_, i) => {
        const ke = i + 1;
        const uts = ke === 8;
        const uas = ke === 16;
        return {
          _k: ++kunciBaris,
          pertemuan_ke: ke,
          materi: uts ? 'Ujian Tengah Semester' : uas ? 'Ujian Akhir Semester' : '',
          metode: uts || uas ? 'Ujian' : 'Kuliah, diskusi',
          modalitas: 'luring',
          waktu_menit: 150,
          ujian: uts || uas,
          bobot: null,
        } as BarisPertemuan;
      }),
    );
  };
  const totalBobot = baris.reduce((a, b) => a + n(b.bobot), 0);
  return (
    <div className="u-kk-form">
      <KotakGalat galat={galat} />
      <div className="u-kk-toolbar">
        <p className="u-kk-catatan">
          {baris.length} pertemuan{totalBobot ? ` · bobot pertemuan ${formatNumber(totalBobot)}%` : ''}. Hubungkan tiap pertemuan ke sub-CPMK agar capaian bisa ditelusuri.
        </p>
        <span className="u-kk-aksi">
          {!baris.length && (
            <Button size="sm" variant="outline" onClick={isiOtomatis}>
              <Wand2 /> Isi 16 pertemuan
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setUbah(true);
              setBaris([...baris, { _k: ++kunciBaris, pertemuan_ke: (baris[baris.length - 1]?.sampai_ke ?? baris[baris.length - 1]?.pertemuan_ke ?? 0) + 1, modalitas: 'luring', waktu_menit: 150 } as BarisPertemuan]);
            }}
          >
            <Plus /> Tambah pertemuan
          </Button>
        </span>
      </div>
      {baris.length > 0 && (
        <TableContainer>
          {/* unipo-ui-izinkan tabel-primitif: kisi isian (sel = isian angka/teks), bukan tabel data */}
          <Table density="compact" className="u-kk-tabel-isi">
            <thead>
              <tr>
                <th style={{ width: 64 }}>Ke</th>
                <th style={{ width: 64 }}>s.d.</th>
                <th style={{ width: 150 }}>Sub-CPMK</th>
                <th>Materi & indikator</th>
                <th style={{ width: 150 }}>Metode</th>
                <th style={{ width: 120 }}>Modalitas</th>
                <th style={{ width: 80 }}>Menit</th>
                <th style={{ width: 70 }}>Bobot %</th>
                <th style={{ width: 56 }}>Ujian</th>
                <th style={{ width: 40 }} aria-label="Hapus" />
              </tr>
            </thead>
            <tbody>
              {baris.map((b, i) => (
                <tr key={b._k} data-ujian={dataFlag(!!b.ujian)}>
                  <td>
                    <IsianAngka value={keAngka(b.pertemuan_ke)} size="sm" min={1} aria-label="Pertemuan ke" onValueChange={(n) => set(i, { pertemuan_ke: n ?? 0 })} />
                  </td>
                  <td>
                    <IsianAngka value={keAngka(b.sampai_ke)} size="sm" min={1} aria-label="Sampai pertemuan" onValueChange={(n) => set(i, { sampai_ke: n })} />
                  </td>
                  <td>
                    <Select size="sm" value={b.sub_cpmk_id != null ? String(b.sub_cpmk_id) : ''} onValueChange={(v) => set(i, { sub_cpmk_id: v ? Number(v) : null })} options={[{ value: '', label: '–' }, ...sub]} aria-label="Sub-CPMK" />
                  </td>
                  <td>
                    <Textarea rows={2} value={b.materi ?? ''} onChange={(e) => set(i, { materi: e.target.value })} placeholder="Materi" aria-label="Materi" />
                    <Input size="sm" value={b.indikator ?? ''} onChange={(e) => set(i, { indikator: e.target.value })} placeholder="Indikator (opsional)" aria-label="Indikator" />
                  </td>
                  <td>
                    <Input size="sm" value={b.metode ?? ''} onChange={(e) => set(i, { metode: e.target.value })} placeholder="Kuliah, diskusi" aria-label="Metode" />
                  </td>
                  <td>
                    <Select size="sm" value={b.modalitas ?? 'luring'} onValueChange={(v) => set(i, { modalitas: v })} options={MODALITAS} aria-label="Modalitas" />
                  </td>
                  <td>
                    <IsianAngka value={keAngka(b.waktu_menit)} size="sm" min={0} aria-label="Menit" onValueChange={(n) => set(i, { waktu_menit: n })} />
                  </td>
                  <td>
                    <IsianAngka value={keAngka(b.bobot)} size="sm" min={0} max={100} aria-label="Bobot" onValueChange={(n) => set(i, { bobot: n })} />
                  </td>
                  <td data-tengah>
                    <Checkbox checked={!!b.ujian} onCheckedChange={(v) => set(i, { ujian: !!v })} aria-label="Ujian" />
                  </td>
                  <td>
                    <Button
                      size="xs"
                      variant="ghost"
                      iconOnly
                      aria-label="Hapus pertemuan"
                      onClick={() => {
                        setUbah(true);
                        setBaris(baris.filter((_, j) => j !== i));
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableContainer>
      )}
      <div className="u-kk-simpan">
        {ubah && <span className="u-kk-catatan">Ada perubahan yang belum disimpan.</span>}
        <Button
          loading={sibuk}
          disabled={!ubah}
          onClick={async () => {
            try {
              await kirim(
                'PUT',
                `${P}/rps/${r.id}/pertemuan`,
                {
                  pertemuan: baris.map(({ _k, ...p }) => ({
                    pertemuan_ke: p.pertemuan_ke,
                    sampai_ke: p.sampai_ke ?? null,
                    sub_cpmk_id: p.sub_cpmk_id ?? null,
                    materi: kosongJadiNull(p.materi),
                    indikator: kosongJadiNull(p.indikator),
                    metode: kosongJadiNull(p.metode),
                    modalitas: p.modalitas ?? null,
                    waktu_menit: p.waktu_menit ?? null,
                    penugasan: kosongJadiNull(p.penugasan),
                    bobot: p.bobot ?? null,
                    ujian: !!p.ujian,
                  })),
                },
                'Rencana pertemuan disimpan.',
              );
              setUbah(false);
            } catch {
              /* tampil */
            }
          }}
        >
          Simpan rencana pertemuan
        </Button>
      </div>
    </div>
  );
}

function EditorEvaluasi({ r }: { r: Rps }) {
  const [baris, setBaris] = React.useState<BarisEvaluasi[]>(() => r.evaluasi.map((e) => ({ ...e, _k: ++kunciBaris })));
  const [ubah, setUbah] = React.useState(false);
  const { kirim, sibuk, galat } = useKirim();
  const cpmk = r.cpmk ?? [];
  const total = baris.reduce((a, b) => a + n(b.bobot), 0);
  const set = (i: number, patch: Partial<BarisEvaluasi>) => {
    setUbah(true);
    setBaris((b) => b.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  };
  const contoh = () => {
    setUbah(true);
    setBaris(
      [
        { jenis_evaluasi: 1, nama: 'Partisipasi & kehadiran', bobot: 10, komponen_siakad: 'HDR' },
        { jenis_evaluasi: 3, nama: 'Tugas', bobot: 20, komponen_siakad: 'Tugas' },
        { jenis_evaluasi: 2, nama: 'Proyek', bobot: 20, komponen_siakad: 'Harian' },
        { jenis_evaluasi: 4, nama: 'UTS', bobot: 20, komponen_siakad: 'UTS' },
        { jenis_evaluasi: 4, nama: 'UAS', bobot: 30, komponen_siakad: 'UAS' },
      ].map((x) => ({ ...x, cpmk: cpmk.map((c) => ({ cpmk_id: c.id, bobot: 1 })), _k: ++kunciBaris })),
    );
  };
  return (
    <div className="u-kk-form">
      <KotakGalat galat={galat} />
      <div className="u-kk-toolbar">
        <p className="u-kk-catatan">
          Total bobot <b data-ok={dataFlag(Math.abs(total - 100) < 0.01)} className="u-kk-total">{formatNumber(total)}%</b> (harus 100%). Komponen SIAKAD menentukan kolom nilai yang diisi dosen.
        </p>
        <span className="u-kk-aksi">
          {!baris.length && (
            <Button size="sm" variant="outline" onClick={contoh}>
              <Sparkles /> Pakai contoh komposisi
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setUbah(true);
              setBaris([...baris, { _k: ++kunciBaris, jenis_evaluasi: 3, nama: '', bobot: 0, cpmk: [] }]);
            }}
          >
            <Plus /> Tambah evaluasi
          </Button>
        </span>
      </div>
      <Progress value={Math.min(100, total)} size="sm" tone={Math.abs(total - 100) < 0.01 ? 'success' : total > 100 ? 'danger' : 'warning'} />
      {baris.length > 0 && (
        <TableContainer>
          {/* unipo-ui-izinkan tabel-primitif: kisi isian (sel = isian angka/teks), bukan tabel data */}
          <Table density="compact" className="u-kk-tabel-isi">
            <thead>
              <tr>
                <th style={{ width: 170 }}>Jenis (Neo Feeder)</th>
                <th>Nama evaluasi</th>
                <th style={{ width: 90 }}>Bobot %</th>
                <th style={{ width: 150 }}>Komponen SIAKAD</th>
                <th>CPMK yang diukur</th>
                <th style={{ width: 40 }} aria-label="Hapus" />
              </tr>
            </thead>
            <tbody>
              {baris.map((b, i) => {
                const dipilih = new Set((b.cpmk ?? []).map((c) => c.cpmk_id));
                return (
                  <tr key={b._k}>
                    <td>
                      <Select size="sm" value={String(b.jenis_evaluasi)} onValueChange={(v) => set(i, { jenis_evaluasi: Number(v ?? 3) })} options={JENIS_EVALUASI_OPSI} aria-label="Jenis evaluasi" />
                    </td>
                    <td>
                      <Input size="sm" value={b.nama} onChange={(e) => set(i, { nama: e.target.value })} placeholder="mis. UTS" aria-label="Nama evaluasi" />
                    </td>
                    <td>
                      <IsianAngka value={keAngka(b.bobot)} size="sm" min={0} max={100} aria-label="Bobot" onValueChange={(n) => set(i, { bobot: n ?? 0 })} />
                    </td>
                    <td>
                      <Select size="sm" value={b.komponen_siakad ?? ''} onValueChange={(v) => set(i, { komponen_siakad: v || null })} options={KOMPONEN_SIAKAD} aria-label="Komponen SIAKAD" />
                    </td>
                    <td>
                      <span className="u-kk-chip-row">
                        {cpmk.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="u-kk-chip"
                            data-active={dataFlag(dipilih.has(c.id))}
                            title={c.deskripsi}
                            onClick={() => set(i, { cpmk: dipilih.has(c.id) ? (b.cpmk ?? []).filter((x) => x.cpmk_id !== c.id) : [...(b.cpmk ?? []), { cpmk_id: c.id, bobot: 1 }] })}
                          >
                            {c.kode}
                          </button>
                        ))}
                        {!cpmk.length && <span className="u-kk-warn">MK belum punya CPMK</span>}
                      </span>
                    </td>
                    <td>
                      <Button
                        size="xs"
                        variant="ghost"
                        iconOnly
                        aria-label="Hapus evaluasi"
                        onClick={() => {
                          setUbah(true);
                          setBaris(baris.filter((_, j) => j !== i));
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </TableContainer>
      )}
      <div className="u-kk-simpan">
        {ubah && <span className="u-kk-catatan">Ada perubahan yang belum disimpan.</span>}
        <Button
          loading={sibuk}
          disabled={!ubah || baris.some((b) => !b.nama.trim())}
          onClick={async () => {
            try {
              await kirim(
                'PUT',
                `${P}/rps/${r.id}/evaluasi`,
                {
                  evaluasi: baris.map(({ _k, ...e }) => ({ jenis_evaluasi: e.jenis_evaluasi, nama: e.nama.trim(), bobot: n(e.bobot), komponen_siakad: e.komponen_siakad || null, cpmk: e.cpmk ?? [] })),
                  izinkan_total_bukan_100: Math.abs(total - 100) >= 0.01 || undefined,
                },
                Math.abs(total - 100) < 0.01 ? 'Rencana evaluasi disimpan.' : 'Disimpan. Total bobot belum 100%, RPS belum bisa disahkan.',
              );
              setUbah(false);
            } catch {
              /* tampil */
            }
          }}
        >
          Simpan rencana evaluasi
        </Button>
      </div>
    </div>
  );
}

// ================================================================ Ruang kerja satu MK
export interface RuangMkKurikulumProps {
  mkId: number | string | null | undefined;
  kurikulumId: number | string;
  hak?: HakKurikulum;
  onOpenChange: (open: boolean) => void;
}

/** Panel samping satu mata kuliah: ringkasan (prasyarat, CPL, bahan kajian, koordinator), CPMK, RPS, dan dokumen RPS/silabus/bahan ajar. */
export function RuangMkKurikulum({ mkId, kurikulumId, hak: batas, onOpenChange }: RuangMkKurikulumProps) {
  const h = useHakKurikulum(kurikulumId, batas);
  const q = useMataKuliahObe(mkId ?? undefined);
  const m = q.data as MkDetail | undefined;
  const [tab, setTab] = React.useState<'ringkas' | 'cpmk' | 'rps' | 'perangkat'>('cpmk');
  const perangkat = usePerangkatMk(mkId);
  React.useEffect(() => setTab('cpmk'), [mkId]);
  return (
    <Sheet open={mkId != null} onOpenChange={onOpenChange} size="xl" title={m ? `${m.kode_mk} · ${m.nama}` : 'Mata kuliah'} description={m ? [`${formatNumber(n(m.sks))} SKS`, m.semester ? `Semester ${m.semester}` : 'Pilihan bebas', JENIS_MK[m.jenis] ?? m.jenis].join(' · ') : undefined} className="u-kk-sheet">
      {mkId != null && (
        <div className="u-kk-ruang-mk">
          <Tabs
            value={tab}
            onValueChange={setTab}
            items={[
              { value: 'cpmk', label: 'CPMK & sub-CPMK', count: m?.cpmk?.length },
              { value: 'rps', label: 'RPS', count: m?.rps?.length },
              { value: 'perangkat', label: 'Dokumen RPS & bahan ajar', count: perangkat.data?.length || undefined },
              { value: 'ringkas', label: 'Ringkasan' },
            ]}
          />
          {tab === 'ringkas' && m && <RingkasMk m={m} />}
          {tab === 'cpmk' && <KelolaCpmk mkId={mkId} kurikulumId={kurikulumId} bolehUbah={h.ubah_struktur} />}
          {tab === 'rps' && <KelolaRps mkId={mkId} bolehSusun={h.rps} bolehSahkan={h.susun} />}
          {tab === 'perangkat' && <KelolaPerangkatMk mkId={mkId} bolehUbah={h.rps || h.susun} />}
        </div>
      )}
    </Sheet>
  );
}

function RingkasMk({ m }: { m: MkDetail }) {
  const pras = (m.prasyarat as Array<{ kode_mk: string; nama: string; jenis: string; nilai_min?: string | null }> | undefined) ?? [];
  const cpl = (m.cpl as unknown as Array<{ cpl_id: number; kode: string; deskripsi: string; bobot?: number }> | undefined) ?? [];
  const rinci = [
    ['Tatap muka', m.sks_tatap_muka],
    ['Praktikum', m.sks_praktikum],
    ['Praktik lapangan', m.sks_praktik_lapangan],
    ['Simulasi', m.sks_simulasi],
  ].filter(([, v]) => n(v as Angka) > 0);
  return (
    <dl className="u-kk-info">
      <div>
        <dt>SKS</dt>
        <dd>
          {formatNumber(n(m.sks))} {rinci.length ? `(${rinci.map(([l, v]) => `${l} ${formatNumber(n(v as Angka))}`).join(', ')})` : ''}
        </dd>
      </div>
      <div>
        <dt>Kelompok</dt>
        <dd>{m.kelompok ? (KELOMPOK_MK[m.kelompok] ?? m.kelompok) : '–'}</dd>
      </div>
      <div>
        <dt>Modalitas</dt>
        <dd>{m.modalitas ? label(m.modalitas) : '–'}</dd>
      </div>
      <div>
        <dt>Bentuk pembelajaran</dt>
        <dd>{m.bentuk_pembelajaran?.length ? m.bentuk_pembelajaran.map(label).join(', ') : '–'}</dd>
      </div>
      <div>
        <dt>Pertemuan</dt>
        <dd>{m.pertemuan ?? '–'}</dd>
      </div>
      <div>
        <dt>Koordinator</dt>
        <dd>{m.nama_koordinator ?? m.nidn_koordinator ?? '–'}</dd>
      </div>
      <div className="u-kk-info-lebar">
        <dt>Prasyarat</dt>
        <dd>
          {pras.length
            ? pras.map((p) => (
                <span key={p.kode_mk} className="u-kk-pras">
                  <span className="u-kur-code">{p.kode_mk}</span> {p.nama} <small>({p.jenis === 'lulus' ? `lulus${p.nilai_min ? ` min. ${p.nilai_min}` : ''}` : label(p.jenis)})</small>
                </span>
              ))
            : 'Tidak ada'}
        </dd>
      </div>
      <div className="u-kk-info-lebar">
        <dt>CPL didukung</dt>
        <dd>
          {cpl.length ? (
            <ul className="u-kk-cpl-mini">
              {cpl.map((c) => (
                <li key={c.cpl_id}>
                  <span className="u-kur-code">{c.kode}</span> {c.deskripsi}
                </li>
              ))}
            </ul>
          ) : (
            <span className="u-kk-warn">Belum dipetakan</span>
          )}
        </dd>
      </div>
      <div className="u-kk-info-lebar">
        <dt>Bahan kajian</dt>
        <dd>{m.bahan_kajian?.length ? m.bahan_kajian.map((b) => `${b.kode} ${b.nama}`).join(', ') : '–'}</dd>
      </div>
      {m.deskripsi && (
        <div className="u-kk-info-lebar">
          <dt>Deskripsi</dt>
          <dd>{m.deskripsi}</dd>
        </div>
      )}
    </dl>
  );
}

// ================================================================ Matriks (empat jenis)
const MATRIKS_OPSI: Array<{ value: NamaMatriks; label: string }> = [
  { value: 'cpl-mk', label: 'CPL × MK' },
  { value: 'profil-cpl', label: 'Profil × CPL' },
  { value: 'cpl-bk', label: 'CPL × BK' },
  { value: 'bk-mk', label: 'BK × MK' },
];
/** Empat matriks pemetaan OBE dalam satu tempat; dapat diubah saat kurikulum draf/diajukan. */
export function KelolaMatriksKurikulum({ kurikulumId, editable, className }: { kurikulumId: number | string; editable?: boolean; className?: string }) {
  const [j, setJ] = React.useState<NamaMatriks>('cpl-mk');
  return (
    <div className={cn('u-kk-blok', className)}>
      <SegmentedControl options={MATRIKS_OPSI} value={j} onValueChange={setJ} aria-label="Jenis matriks" />
      <MatriksKurikulum key={j} kurikulumId={kurikulumId} jenis={j} editable={editable} />
    </div>
  );
}

// ================================================================ Ekuivalensi
const JENIS_EKV: SelectOption<Ekuivalensi['jenis']>[] = [
  { value: 'setara', label: 'Setara (satu lawan satu)' },
  { value: 'gabung', label: 'Digabung (beberapa MK lama → satu MK baru)' },
  { value: 'pecah', label: 'Dipecah (satu MK lama → beberapa MK baru)' },
  { value: 'dihapus', label: 'Dihapus (tidak ada padanan)' },
];
/** Ekuivalensi MK lama → MK kurikulum ini untuk konversi nilai: buat otomatis, tambah/ubah/hapus manual. */
export function KelolaEkuivalensi({ kurikulumId, kodeProdi, bolehUbah, className }: { kurikulumId: number | string; kodeProdi?: string; bolehUbah?: boolean; className?: string }) {
  const q = useEkuivalensi(kurikulumId);
  const [form, setForm] = React.useState<Partial<Ekuivalensi & { mk_id: number | null }> | null>(null);
  const [oto, setOto] = React.useState(false);
  const [hapus, setHapus] = React.useState<Ekuivalensi | null>(null);
  const { kirim } = useKirim();
  const kolom: DataColumn<Ekuivalensi>[] = [
    {
      key: 'lama',
      header: 'MK lama',
      mobile: 'title',
      cell: (e) => (
        <span>
          <span className="u-kur-code">{e.kode_mk_lama}</span> {e.nama_mk_lama}
        </span>
      ),
      value: (e) => e.kode_mk_lama,
    },
    { key: 'sks_lama', header: 'SKS', shrink: true, align: 'end', cell: (e) => (e.sks_lama != null ? formatNumber(n(e.sks_lama)) : '–') },
    { key: 'jenis', header: 'Hubungan', shrink: true, mobile: 'badge', cell: (e) => <Badge variant={e.jenis === 'setara' ? 'success' : e.jenis === 'dihapus' ? 'danger' : 'info'}>{label(e.jenis)}</Badge> },
    {
      key: 'baru',
      header: 'MK baru',
      mobile: 'subtitle',
      cell: (e) =>
        e.kode_mk ? (
          <span>
            <span className="u-kur-code">{e.kode_mk}</span> {e.nama_mk}
          </span>
        ) : (
          <span className="u-kk-muted">Tidak ada padanan</span>
        ),
      value: (e) => e.kode_mk ?? '',
    },
    { key: 'sks_mk', header: 'SKS', shrink: true, align: 'end', cell: (e) => (e.sks_mk != null ? formatNumber(n(e.sks_mk)) : '–') },
    { key: 'catatan', header: 'Catatan', defaultHidden: true },
  ];
  return (
    <div className={cn('u-kk-blok', className)}>
      <p className="u-kk-catatan">MK dengan kode sama otomatis dianggap setara. Baris di sini untuk MK lama yang berganti kode, digabung, dipecah, atau dihapus; dipakai konversi nilai dan capaian CPL mahasiswa angkatan lama.</p>
      <DataTable<Ekuivalensi>
        columns={kolom}
        rows={q.data}
        rowKey={(e) => String(e.id)}
        loading={q.loading && !q.data}
        error={q.error}
        onRetry={q.refetch}
        exportCsv="ekuivalensi.csv"
        densityToggle={false}
        actions={
          bolehUbah ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setOto(true)}>
                <Wand2 /> Buat otomatis
              </Button>
              <Button size="sm" onClick={() => setForm({ jenis: 'setara' })}>
                <Plus /> Tambah
              </Button>
            </>
          ) : undefined
        }
        rowActions={
          bolehUbah
            ? (e) => [
                { label: 'Ubah', icon: <PenLine />, onSelect: () => setForm(e as never) },
                { label: 'Hapus', icon: <Trash2 />, destructive: true, onSelect: () => setHapus(e) },
              ]
            : undefined
        }
        empty={{ icon: <ClipboardList />, title: 'Belum ada ekuivalensi', description: bolehUbah ? 'Buat otomatis dari kurikulum lain atau MK lama satu semester, lalu periksa satu per satu.' : undefined }}
      />
      {form && <FormEkuivalensi kurikulumId={kurikulumId} awal={form} onTutup={() => setForm(null)} />}
      {oto && <DialogEkuivalensiOtomatis kurikulumId={kurikulumId} kodeProdi={kodeProdi} onTutup={() => setOto(false)} />}
      <ConfirmDialog
        open={!!hapus}
        onOpenChange={(o) => !o && setHapus(null)}
        title={`Hapus ekuivalensi ${hapus?.kode_mk_lama ?? ''}?`}
        confirmLabel="Hapus ekuivalensi"
        onConfirm={async () => {
          if (hapus) await kirim('DELETE', `${P}/kurikulum/${kurikulumId}/ekuivalensi/${hapus.id}`, undefined, 'Ekuivalensi dihapus.').catch(abaikan);
        }}
      />
    </div>
  );
}

function FormEkuivalensi({ kurikulumId, awal, onTutup }: { kurikulumId: number | string; awal: Partial<Ekuivalensi & { mk_id: number | null }>; onTutup: () => void }) {
  const mk = useMkKurikulum(kurikulumId);
  const [f, setF] = React.useState({
    kode_mk_lama: awal.kode_mk_lama ?? '',
    nama_mk_lama: awal.nama_mk_lama ?? '',
    sks_lama: awal.sks_lama != null ? String(awal.sks_lama) : '',
    jenis: (awal.jenis ?? 'setara') as Ekuivalensi['jenis'],
    mk_id: awal.mk_id != null ? String(awal.mk_id) : '',
    catatan: awal.catatan ?? '',
  });
  const { kirim, sibuk, galat, kolom } = useKirim();
  return (
    <Dialog
      side="right"
      open
      onOpenChange={(o) => !o && onTutup()}
      title={awal.id ? 'Ubah ekuivalensi' : 'Tambah ekuivalensi'}
      footer={
        <>
          <Button variant="ghost" onClick={onTutup}>
            Batal
          </Button>
          <Button
            loading={sibuk}
            disabled={!f.kode_mk_lama.trim() || (f.jenis !== 'dihapus' && !f.mk_id)}
            onClick={async () => {
              const body = {
                kode_mk_lama: f.kode_mk_lama.trim(),
                nama_mk_lama: kosongJadiNull(f.nama_mk_lama),
                sks_lama: angkaAtauNull(f.sks_lama),
                jenis: f.jenis,
                mk_id: f.jenis === 'dihapus' ? null : Number(f.mk_id),
                catatan: kosongJadiNull(f.catatan),
              };
              try {
                await kirim(awal.id ? 'PUT' : 'POST', awal.id ? `${P}/kurikulum/${kurikulumId}/ekuivalensi/${awal.id}` : `${P}/kurikulum/${kurikulumId}/ekuivalensi`, body, 'Ekuivalensi disimpan.');
                onTutup();
              } catch {
                /* tampil */
              }
            }}
          >
            Simpan ekuivalensi
          </Button>
        </>
      }
    >
      <div className="u-kk-form">
        <KotakGalat galat={galat} />
        <div className="u-kk-grid u-kk-grid-3">
          <Field label="Kode MK lama" required error={kolom.kode_mk_lama}>
            <Input value={f.kode_mk_lama} onChange={(e) => setF({ ...f, kode_mk_lama: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Nama MK lama" optional>
            <Input value={f.nama_mk_lama} onChange={(e) => setF({ ...f, nama_mk_lama: e.target.value })} />
          </Field>
          <Field label="SKS lama" optional>
            <IsianAngka value={keAngka(f.sks_lama)} onValueChange={(n) => setF({ ...f, sks_lama: teksAngka(n) })} />
          </Field>
        </div>
        <Field label="Hubungan" required>
          <Select value={f.jenis} onValueChange={(v) => setF({ ...f, jenis: (v ?? 'setara') as Ekuivalensi['jenis'] })} options={JENIS_EKV} />
        </Field>
        {f.jenis !== 'dihapus' && (
          <Field label="MK kurikulum ini" required error={kolom.mk_id}>
            <Select value={f.mk_id} onValueChange={(v) => setF({ ...f, mk_id: v ?? '' })} options={(mk.data ?? []).map((m) => ({ value: String(m.id), label: `${m.kode_mk} · ${m.nama}`, description: `${formatNumber(n(m.sks))} SKS` }))} placeholder="Pilih MK baru" />
          </Field>
        )}
        <Field label="Catatan" optional>
          <Input value={f.catatan} onChange={(e) => setF({ ...f, catatan: e.target.value })} />
        </Field>
      </div>
    </Dialog>
  );
}

function DialogEkuivalensiOtomatis({ kurikulumId, kodeProdi, onTutup }: { kurikulumId: number | string; kodeProdi?: string; onTutup: () => void }) {
  const daftar = useDaftarKurikulum(kodeProdi ? { prodi: kodeProdi } : {});
  const [sumber, setSumber] = React.useState<'kurikulum' | 'semester'>('kurikulum');
  const [kurLama, setKurLama] = React.useState('');
  const [tahun, setTahun] = React.useState<string | null>(null);
  const [hasil, setHasil] = React.useState<{ dibuat: number; kode_sama: number; tanpa_pasangan: Array<{ kode_mk: string; nama?: string }> } | null>(null);
  const { kirim, sibuk, galat } = useKirim();
  return (
    <Dialog
      side="right"
      open
      onOpenChange={(o) => !o && onTutup()}
      title="Buat ekuivalensi otomatis"
      description="MK lama dengan nama sama dianggap setara. MK lama tanpa pasangan dilaporkan agar dipasangkan manual."
      footer={
        hasil ? (
          <Button onClick={onTutup}>Selesai</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onTutup}>
              Batal
            </Button>
            <Button
              loading={sibuk}
              disabled={sumber === 'kurikulum' ? !kurLama : !tahun}
              onClick={async () => {
                try {
                  const r = await kirim<typeof hasil>('POST', `${P}/kurikulum/${kurikulumId}/ekuivalensi/otomatis`, sumber === 'kurikulum' ? { kurikulum_lama_id: Number(kurLama) } : { tahun_id_lama: tahun }, 'Ekuivalensi otomatis dibuat.');
                  setHasil(r ?? null);
                } catch {
                  /* tampil */
                }
              }}
            >
              <Wand2 /> Buat
            </Button>
          </>
        )
      }
    >
      <div className="u-kk-form">
        <KotakGalat galat={galat} />
        {hasil ? (
          <>
            <Alert variant="success" title={`${hasil.dibuat} ekuivalensi dibuat`}>
              {hasil.kode_sama} MK berkode sama tidak perlu baris ekuivalensi.
            </Alert>
            {hasil.tanpa_pasangan?.length > 0 && (
              <Alert variant="warning" title={`${hasil.tanpa_pasangan.length} MK lama tanpa pasangan`}>
                <ul className="u-kk-galat-list">
                  {hasil.tanpa_pasangan.slice(0, 30).map((m) => (
                    <li key={m.kode_mk}>
                      <span className="u-kur-code">{m.kode_mk}</span> {m.nama}
                    </li>
                  ))}
                </ul>
              </Alert>
            )}
          </>
        ) : (
          <>
            <SegmentedControl
              value={sumber}
              onValueChange={setSumber}
              options={[
                { value: 'kurikulum', label: 'Dari kurikulum OBE lain' },
                { value: 'semester', label: 'Dari MK lama satu semester' },
              ]}
            />
            {sumber === 'kurikulum' ? (
              <Field label="Kurikulum lama" required>
                <Select
                  value={kurLama}
                  onValueChange={(v) => setKurLama(v ?? '')}
                  options={(daftar.data ?? []).filter((k) => String(k.id) !== String(kurikulumId)).map((k) => ({ value: String(k.id), label: `${k.kode} · ${k.nama}`, description: label(k.status) }))}
                  placeholder="Pilih kurikulum"
                />
              </Field>
            ) : (
              <Field label="Semester data MK lama (m_mata_kuliah)" required>
                <PilihTahunAkademik value={tahun} onValueChange={setTahun} />
              </Field>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}

// ================================================================ Peninjauan
const JENIS_TINJAU: SelectOption<string>[] = [
  { value: 'evaluasi_tahunan', label: 'Evaluasi tahunan' },
  { value: 'peninjauan', label: 'Peninjauan kurikulum' },
  { value: 'audit_mutu', label: 'Audit mutu (AMI)' },
  { value: 'masukan_pemangku', label: 'Masukan pemangku kepentingan' },
  { value: 'lainnya', label: 'Lainnya' },
];
type PeninjauanLengkap = Peninjauan & { temuan?: string | null; tindak_lanjut?: string | null; tautan_dokumen?: string | null };
/** Catatan evaluasi/peninjauan kurikulum (siklus PPEPP, bahan akreditasi) dengan tambah/ubah/hapus. */
export function KelolaPeninjauan({ kurikulumId, bolehUbah, className }: { kurikulumId: number | string; bolehUbah?: boolean; className?: string }) {
  const q = usePeninjauan(kurikulumId);
  const [form, setForm] = React.useState<Partial<PeninjauanLengkap> | null>(null);
  const [hapus, setHapus] = React.useState<Peninjauan | null>(null);
  const { kirim } = useKirim();
  const kolom: DataColumn<PeninjauanLengkap>[] = [
    { key: 'tanggal', header: 'Tanggal', shrink: true, mobile: 'meta', cell: (p) => (p.tanggal ? formatDate(p.tanggal) : '–'), value: (p) => p.tanggal ?? '' },
    {
      key: 'judul',
      header: 'Kegiatan',
      mobile: 'title',
      cell: (p) => (
        <span className="u-kk-teks">
          <b>{p.judul}</b>
          {p.ringkasan && <small>{p.ringkasan}</small>}
        </span>
      ),
      value: (p) => p.judul,
    },
    { key: 'jenis', header: 'Jenis', shrink: true, mobile: 'subtitle', cell: (p) => JENIS_TINJAU.find((j) => j.value === p.jenis)?.label ?? p.jenis },
    { key: 'pelaksana', header: 'Pelaksana', shrink: true },
    { key: 'status', header: 'Status', shrink: true, mobile: 'badge', cell: (p) => <Badge variant={p.status === 'selesai' ? 'success' : p.status === 'berjalan' ? 'info' : 'neutral'}>{label(p.status ?? 'rencana')}</Badge> },
  ];
  return (
    <div className={cn('u-kk-blok', className)}>
      <DataTable<PeninjauanLengkap>
        columns={kolom}
        rows={q.data as PeninjauanLengkap[] | undefined}
        rowKey={(p) => String(p.id)}
        loading={q.loading && !q.data}
        error={q.error}
        onRetry={q.refetch}
        densityToggle={false}
        exportCsv="peninjauan-kurikulum.csv"
        onRowClick={bolehUbah ? (p) => setForm(p) : undefined}
        actions={
          bolehUbah ? (
            <Button size="sm" onClick={() => setForm({ jenis: 'evaluasi_tahunan', status: 'rencana' })}>
              <Plus /> Catat peninjauan
            </Button>
          ) : undefined
        }
        rowActions={
          bolehUbah
            ? (p) => [
                { label: 'Ubah', icon: <PenLine />, onSelect: () => setForm(p) },
                { label: 'Hapus', icon: <Trash2 />, destructive: true, onSelect: () => setHapus(p) },
              ]
            : undefined
        }
        empty={{ icon: <ClipboardList />, title: 'Belum ada catatan peninjauan', description: 'Catat evaluasi tahunan, masukan pemangku kepentingan, dan hasil audit mutu sebagai dasar revisi kurikulum.' }}
      />
      {form && <FormPeninjauan kurikulumId={kurikulumId} awal={form} onTutup={() => setForm(null)} />}
      <ConfirmDialog
        open={!!hapus}
        onOpenChange={(o) => !o && setHapus(null)}
        title={`Hapus catatan "${hapus?.judul ?? ''}"?`}
        confirmLabel="Hapus catatan"
        onConfirm={async () => {
          if (hapus) await kirim('DELETE', `${P}/kurikulum/${kurikulumId}/peninjauan/${hapus.id}`, undefined, 'Catatan dihapus.').catch(abaikan);
        }}
      />
    </div>
  );
}

interface JenisEvaluasiKerangka {
  kode: string;
  nama: string;
  tingkat: 'mk' | 'prodi';
  siklus: string;
  siklus_tahun: number | null;
  instrumen: IsianKerangka[];
  tahap: { judul: string }[];
  hasil_versi: boolean;
}
interface EvaluasiRingkas {
  id: number;
  jenis: string;
  nama_jenis: string;
  kode_mk: string | null;
  periode: string;
  status: string;
  updated_at: string;
}
const SIKLUS_TINJAU: Record<string, string> = { semester: 'tiap semester', tahunan: 'tiap tahun', n_tahun: 'berkala' };
const STATUS_TINJAU: SelectOption<string>[] = [
  { value: 'rencana', label: 'Rencana' },
  { value: 'berjalan', label: 'Berjalan' },
  { value: 'selesai', label: 'Selesai' },
];

/**
 * Catatan peninjauan kurikulum sebagai WIZARD di panel samping: Lingkup & dasar → Masukan & temuan (bisa diambil dari
 * evaluasi kurikulum prodi yang sudah berjalan) → Usulan perubahan → Tinjau. Jenis evaluasi, siklus, dan instrumen
 * wajibnya dibaca dari definisi kerangka yang berlaku (GET /v1/kurikulum-aturan/evaluasi/definisi): bila kerangka
 * mewajibkan instrumen, temuan dan usulan wajib diisi saat status Selesai. Payload tetap POST/PUT /peninjauan.
 */
function FormPeninjauan({ kurikulumId, awal, onTutup }: { kurikulumId: number | string; awal: Partial<PeninjauanLengkap>; onTutup: () => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const isiAwal = (p: Partial<PeninjauanLengkap>) => ({
    jenis: p.jenis ?? 'evaluasi_tahunan',
    judul: p.judul ?? '',
    tanggal: p.tanggal ?? '',
    pelaksana: p.pelaksana ?? '',
    status: p.status ?? 'rencana',
    ringkasan: p.ringkasan ?? '',
    temuan: p.temuan ?? '',
    tindak_lanjut: p.tindak_lanjut ?? '',
    tautan_dokumen: p.tautan_dokumen ?? '',
  });
  const [f, setF] = React.useState(() => isiAwal(awal));
  const [step, setStep] = React.useState(0);
  const [ambil, setAmbil] = React.useState<number | null>(null);
  const draf = useDrafWizard(`peninjauan:${kurikulumId}:${awal.id ?? 'baru'}`, true, f, (x) => setF({ ...isiAwal(awal), ...x }), (x) => JSON.stringify(x) === JSON.stringify(isiAwal(awal)));
  const { kirim, kolom } = useKirim();
  const kur = useKurikulum(kurikulumId);
  const prodi = kur.data?.kode_prodi;
  const qa = <T,>(path: string) => (s: ReturnType<typeof useSiakad>, signal: AbortSignal) => s.request<T>({ method: 'GET', path, query: { prodi: String(prodi) } }, { signal });
  const def = useSiakadQuery<{ aturan: { nama: string; versi: number } | null; jenis: JenisEvaluasiKerangka[] }>(['kurikulum-aturan', 'evaluasi-def', prodi], qa('/v1/kurikulum-aturan/evaluasi/definisi'), { enabled: !!prodi });
  const evals = useSiakadQuery<EvaluasiRingkas[]>(['kurikulum-aturan', 'evaluasi', prodi], qa('/v1/kurikulum-aturan/evaluasi'), { enabled: !!prodi });
  const jenisDef = def.data?.jenis.find((j) => j.kode === f.jenis) ?? (f.jenis === 'evaluasi_tahunan' ? def.data?.jenis.find((j) => j.tingkat === 'prodi' && j.siklus === 'tahunan') : undefined);
  const instrumenWajib = (jenisDef?.instrumen ?? []).filter((i) => i.wajib);
  const rujukan = def.data?.aturan ? `${def.data.aturan.nama} v${def.data.aturan.versi}` : null;
  const perluIsi = f.status === 'selesai' && instrumenWajib.length > 0;
  const bantuWajib = perluIsi ? `Wajib saat status Selesai menurut ${rujukan ?? 'kerangka'} (${instrumenWajib.map((i) => i.nama.toLowerCase()).join('; ')}).` : undefined;
  const evalProdi = (evals.data ?? []).filter((e) => !e.kode_mk && ['proses', 'disahkan'].includes(e.status));
  const pakaiEvaluasi = async (e: EvaluasiRingkas) => {
    setAmbil(e.id);
    try {
      const r = await siakad.request<{ definisi: { instrumen: IsianKerangka[] } | null; isian: Record<string, string> }>({ method: 'GET', path: `/v1/kurikulum-aturan/evaluasi/${e.id}` });
      const x = (r as { data?: unknown })?.data ?? r;
      const det = x as { definisi: { instrumen: IsianKerangka[] } | null; isian: Record<string, string> };
      const teks = (det.definisi?.instrumen ?? [])
        .filter((i) => (det.isian?.[i.kode] ?? '').trim())
        .map((i) => `${i.nama}: ${det.isian[i.kode]!.trim()}`)
        .join('\n\n');
      if (!teks) {
        toast.add({ title: 'Evaluasi itu belum berisi isian.', type: 'info' });
        return;
      }
      setF((v) => ({ ...v, temuan: [v.temuan.trim(), `Dari ${e.nama_jenis} ${e.periode}:\n${teks}`].filter(Boolean).join('\n\n') }));
    } catch (err) {
      toast.add({ title: pesanGalat(err), type: 'error' });
    } finally {
      setAmbil(null);
    }
  };

  const steps: PanelLangkahStep[] = [
    {
      id: 'lingkup',
      title: 'Lingkup & dasar',
      description: 'Kegiatan apa, kapan, oleh siapa, dan sampai mana.',
      error: !!(kolom.judul || kolom.tanggal || kolom.jenis),
      validate: () => (!f.judul.trim() ? 'Isi judul kegiatan.' : null),
      content: (
        <div className="u-kk-form">
          <DrafDipulihkan waktu={draf.dipulihkan} onBuang={() => { draf.buang(); setF(isiAwal(awal)); }} />
          <Field label="Judul kegiatan" required error={kolom.judul}>
            <Input value={f.judul} onChange={(e) => setF({ ...f, judul: e.target.value })} placeholder="Peninjauan kurikulum 2026" />
          </Field>
          <div className="u-kk-grid u-kk-grid-3">
            <Field label="Jenis" error={kolom.jenis}>
              <Select value={f.jenis} onValueChange={(v) => setF({ ...f, jenis: v ?? 'lainnya' })} options={JENIS_TINJAU} placeholder="Pilih…" />
            </Field>
            <Field label="Tanggal" error={kolom.tanggal}>
              <IsianTanggal value={f.tanggal} onValueChange={(v) => setF({ ...f, tanggal: v })} />
            </Field>
            <Field label="Status">
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: (v ?? 'rencana') as 'rencana' })} options={STATUS_TINJAU} placeholder="Pilih…" />
            </Field>
          </div>
          <Field label="Pelaksana" optional>
            <Input value={f.pelaksana} onChange={(e) => setF({ ...f, pelaksana: e.target.value })} placeholder="Tim kurikulum prodi, GKM, asosiasi" />
          </Field>
          {jenisDef ? (
            <div className="u-kw-rujukan">
              <BookOpen aria-hidden />
              <div>
                <strong>
                  {jenisDef.nama} dilakukan {SIKLUS_TINJAU[jenisDef.siklus] ?? jenisDef.siklus}
                  {jenisDef.siklus === 'n_tahun' && jenisDef.siklus_tahun ? ` (${jenisDef.siklus_tahun} tahun sekali)` : ''}
                </strong>
                <span>Menurut {rujukan ?? 'kerangka kurikulum'}. Tahap: {jenisDef.tahap.map((t) => t.judul).join(' → ')}{jenisDef.hasil_versi ? ' → draf versi kurikulum baru' : ''}.</span>
                {instrumenWajib.length ? <span>Bila selesai, wajib mencatat: {instrumenWajib.map((i) => i.nama).join('; ')}.</span> : null}
              </div>
            </div>
          ) : prodi && def.loading ? (
            <p className="u-kw-rujukan" data-memuat="">Memuat aturan evaluasi kurikulum…</p>
          ) : null}
        </div>
      ),
    },
    {
      id: 'masukan',
      title: 'Masukan & temuan',
      description: 'Ringkasan masukan pemangku kepentingan dan hasil evaluasi. Bisa diambil dari evaluasi kurikulum prodi.',
      optional: !perluIsi,
      error: !!(kolom.ringkasan || kolom.temuan),
      validate: () => (perluIsi && !f.temuan.trim() ? `Isi temuan. ${bantuWajib}` : null),
      content: (
        <div className="u-kk-form">
          {evalProdi.length ? (
            <fieldset className="u-kk-fieldset">
              <legend>Hasil evaluasi kurikulum prodi</legend>
              <ul className="u-kw-ada">
                {evalProdi.slice(0, 5).map((e) => (
                  <li key={e.id}>
                    <b>{e.nama_jenis}</b>
                    <span>
                      Periode {e.periode} · {e.status === 'disahkan' ? 'disahkan' : 'sedang diperiksa'}{' '}
                      <Button size="sm" variant="ghost" loading={ambil === e.id} onClick={() => void pakaiEvaluasi(e)}>
                        <Copy /> Pakai isiannya
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </fieldset>
          ) : null}
          <Field label="Ringkasan" optional error={kolom.ringkasan}>
            <Textarea rows={2} value={f.ringkasan} onChange={(e) => setF({ ...f, ringkasan: e.target.value })} />
          </Field>
          <Field label="Temuan" required={perluIsi} optional={!perluIsi} error={kolom.temuan} description={bantuWajib ?? 'Masukan pemangku kepentingan, perkembangan keilmuan, regulasi, dan capaian CPL.'}>
            <Textarea rows={5} value={f.temuan} onChange={(e) => setF({ ...f, temuan: e.target.value })} />
          </Field>
        </div>
      ),
    },
    {
      id: 'usulan',
      title: 'Usulan perubahan',
      description: 'Rekomendasi atau tindak lanjut, serta dokumen pendukung.',
      optional: !perluIsi,
      error: !!(kolom.tindak_lanjut || kolom.tautan_dokumen),
      validate: () => {
        if (perluIsi && !f.tindak_lanjut.trim()) return `Isi usulan perubahan/tindak lanjut. ${bantuWajib}`;
        if (f.tautan_dokumen.trim() && !/^https?:\/\/\S+$/i.test(f.tautan_dokumen.trim())) return 'Tautan dokumen harus diawali http:// atau https://.';
        return null;
      },
      content: (
        <div className="u-kk-form">
          <Field label="Usulan perubahan / tindak lanjut" required={perluIsi} optional={!perluIsi} error={kolom.tindak_lanjut} description={bantuWajib ?? (jenisDef?.hasil_versi ? 'Peninjauan yang disahkan menjadi dasar versi kurikulum berikutnya.' : undefined)}>
            <Textarea rows={5} value={f.tindak_lanjut} onChange={(e) => setF({ ...f, tindak_lanjut: e.target.value })} />
          </Field>
          <Field label="Tautan dokumen" optional error={kolom.tautan_dokumen} description="Notulen, laporan, atau berkas di Berkas UNIPO.">
            <Input type="url" value={f.tautan_dokumen} onChange={(e) => setF({ ...f, tautan_dokumen: e.target.value })} placeholder="https://" />
          </Field>
        </div>
      ),
    },
    {
      id: 'tinjau',
      title: 'Tinjau',
      description: 'Periksa catatan sebelum disimpan.',
      content: (
        <WizardReview
          sections={[
            {
              title: 'Lingkup & dasar',
              onEdit: () => setStep(0),
              items: [
                { label: 'Kegiatan', value: f.judul.trim() },
                { label: 'Jenis', value: JENIS_TINJAU.find((j) => j.value === f.jenis)?.label ?? f.jenis },
                { label: 'Waktu', value: f.tanggal ? formatDate(f.tanggal) : '' },
                { label: 'Pelaksana', value: f.pelaksana.trim() },
                { label: 'Status', value: STATUS_TINJAU.find((s) => s.value === f.status)?.label },
              ],
            },
            {
              title: 'Masukan & temuan',
              onEdit: () => setStep(1),
              missing: perluIsi && !f.temuan.trim() ? 'Temuan wajib saat status Selesai.' : undefined,
              items: [
                { label: 'Ringkasan', value: f.ringkasan.trim() ? potong(f.ringkasan.trim()) : '' },
                { label: 'Temuan', value: f.temuan.trim() ? potong(f.temuan.trim(), 220) : '' },
              ],
            },
            {
              title: 'Usulan perubahan',
              onEdit: () => setStep(2),
              missing: perluIsi && !f.tindak_lanjut.trim() ? 'Usulan wajib saat status Selesai.' : undefined,
              items: [
                { label: 'Usulan / tindak lanjut', value: f.tindak_lanjut.trim() ? potong(f.tindak_lanjut.trim(), 220) : '' },
                { label: 'Dokumen', value: f.tautan_dokumen.trim() },
              ],
            },
          ]}
        />
      ),
    },
  ];

  return (
    <PanelLangkah
      open
      onOpenChange={(o) => !o && onTutup()}
      size="lg"
      mode={awal.id ? 'ubah' : 'buat'}
      title={awal.id ? 'Ubah catatan peninjauan' : 'Catat peninjauan kurikulum'}
      description="Bahan siklus PPEPP dan akreditasi. Isian wajib mengikuti kerangka evaluasi kurikulum yang berlaku."
      steps={steps}
      step={step}
      onStepChange={setStep}
      finishLabel="Simpan catatan"
      footerNote="Bertanda * wajib. Isian tersimpan sementara bila panel ditutup."
      onFinish={async () => {
        const body = {
          jenis: f.jenis,
          judul: f.judul.trim(),
          tanggal: f.tanggal || null,
          pelaksana: kosongJadiNull(f.pelaksana),
          status: f.status,
          ringkasan: kosongJadiNull(f.ringkasan),
          temuan: kosongJadiNull(f.temuan),
          tindak_lanjut: kosongJadiNull(f.tindak_lanjut),
          tautan_dokumen: kosongJadiNull(f.tautan_dokumen),
        };
        try {
          await kirim(awal.id ? 'PUT' : 'POST', awal.id ? `${P}/kurikulum/${kurikulumId}/peninjauan/${awal.id}` : `${P}/kurikulum/${kurikulumId}/peninjauan`, body, 'Catatan peninjauan disimpan.');
          draf.selesai();
          return null;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

// ================================================================ Capaian CPL
/** Capaian CPL per angkatan, rekam capaian (bahan akreditasi), dan riwayat rekaman. */
export function KelolaCapaianCpl({ kurikulumId, bolehRekam, className }: { kurikulumId: number | string; bolehRekam?: boolean; className?: string }) {
  const k = useKurikulum(kurikulumId).data as KurikulumLengkap | undefined;
  const [angkatan, setAngkatan] = React.useState<string>('');
  const [rekam, setRekam] = React.useState(false);
  const [tahun, setTahun] = React.useState<string | null>(null);
  const riwayat = useSiakadQuery<Array<{ cpl_id: number; kode: string; tahun_id: string; angkatan: number | null; rata_rata: number | null; persen_tercapai: number | null; jumlah_mahasiswa: number; dihitung_at: string }>>(
    ['kur', String(kurikulumId), 'capaian-riwayat'],
    (s, signal) => s.request({ method: 'GET', path: `${P}/kurikulum/${kurikulumId}/capaian/riwayat` }, { signal }),
    { staleTime: 60_000 },
  );
  const { kirim, sibuk, galat } = useKirim();
  const per = new Map<string, NonNullable<typeof riwayat.data>>();
  for (const r of riwayat.data ?? []) {
    const kunci = `${r.tahun_id}|${r.angkatan ?? ''}`;
    per.set(kunci, [...(per.get(kunci) ?? []), r]);
  }
  return (
    <div className={cn('u-kk-blok', className)}>
      <div className="u-kk-toolbar">
        <SegmentedControl
          aria-label="Angkatan"
          value={angkatan}
          onValueChange={setAngkatan}
          options={[{ value: '', label: 'Angkatan kurikulum' }, ...(k?.angkatan ?? []).map((a) => ({ value: String(a), label: String(a) }))]}
        />
        {bolehRekam && (
          <Button size="sm" variant="outline" onClick={() => setRekam(true)}>
            <Upload /> Rekam capaian
          </Button>
        )}
      </div>
      <CapaianCplKurikulum kurikulumId={kurikulumId} angkatan={angkatan ? Number(angkatan) : undefined} />
      {per.size > 0 && (
        <Panel title="Riwayat capaian terekam" description="Rekaman tetap walau nilai berubah; dipakai untuk evaluasi kurikulum dan akreditasi.">
          <DataTable<{ kunci: string; rows: (typeof per extends Map<string, infer R> ? R : never) }>
            columns={[
              { key: 'tahun', header: 'Semester', mobile: 'title', value: (x) => x.rows[0]!.tahun_id, cell: (x) => tahunLabel(x.rows[0]!.tahun_id) },
              { key: 'angkatan', header: 'Angkatan', value: (x) => x.rows[0]!.angkatan ?? '', cell: (x) => x.rows[0]!.angkatan ?? 'Semua' },
              { key: 'mahasiswa', header: 'Mahasiswa', align: 'end', value: (x) => x.rows[0]!.jumlah_mahasiswa, cell: (x) => formatNumber(x.rows[0]!.jumlah_mahasiswa) },
              { key: 'cpl', header: 'CPL tercapai (rata-rata ≥ target)', value: (x) => x.rows.map((r) => `${r.kode} ${r.rata_rata ?? '–'}`).join(' · '), cell: (x) => x.rows.map((r) => `${r.kode} ${r.rata_rata == null ? '–' : formatNumber(r.rata_rata, { maximumFractionDigits: 1 })}`).join(' · ') },
              { key: 'dihitung_at', header: 'Direkam', value: (x) => x.rows[0]!.dihitung_at, cell: (x) => formatDate(x.rows[0]!.dihitung_at) },
            ]}
            rows={[...per.entries()].map(([kunci, rows]) => ({ kunci, rows }))}
            rowKey={(x) => x.kunci}
            pagination={false}
            columnToggle={false}
            densityToggle={false}
            defaultDensity="compact"
            exportCsv={`riwayat-capaian-cpl-${kurikulumId}`}
          />
        </Panel>
      )}
      <Dialog
        open={rekam}
        onOpenChange={setRekam}
        title="Rekam capaian CPL"
        description="Menyimpan rekap capaian saat ini untuk satu semester (dan angkatan bila dipilih)."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRekam(false)}>
              Batal
            </Button>
            <Button
              loading={sibuk}
              disabled={!tahun}
              onClick={async () => {
                try {
                  await kirim('POST', `${P}/kurikulum/${kurikulumId}/capaian/rekam`, { tahun_id: tahun, angkatan: angkatan ? Number(angkatan) : undefined }, 'Capaian CPL direkam.');
                  setRekam(false);
                } catch {
                  /* tampil */
                }
              }}
            >
              Rekam
            </Button>
          </>
        }
      >
        <div className="u-kk-form">
          <KotakGalat galat={galat} />
          <Field label="Semester" required>
            <PilihTahunAkademik value={tahun} onValueChange={setTahun} />
          </Field>
          <p className="u-kk-catatan">Angkatan: {angkatan || 'angkatan yang ditetapkan memakai kurikulum ini'}.</p>
        </div>
      </Dialog>
    </div>
  );
}

// ================================================================ Terbit ke SIAKAD lama
interface HasilMigrasi {
  pratinjau: boolean;
  ringkasan: Record<string, unknown>;
  rencana?: unknown;
  catatan?: string;
}
interface Selisih {
  tahun_id: string;
  hanya_di_baru: Array<{ kode_mk: string; nama: string; sks: number; semester: number | null }>;
  hanya_di_lama: Array<{ kode_mk: string; nama: string; sks: number; semester: number }>;
  beda: Array<{ kode_mk: string; perbedaan: Record<string, { baru: unknown; lama: unknown }> }>;
  sama: number;
}
interface RiwayatMigrasi {
  id: number;
  jenis: 'impor' | 'terbit';
  kurikulum_id: number | null;
  tahun_id: string | null;
  status: 'selesai' | 'dibatalkan';
  oleh?: string | null;
  created_at?: string | null;
  ringkasan?: Record<string, unknown>;
}

/**
 * Terbitkan MK kurikulum yang disahkan/berlaku ke tabel mata kuliah SIAKAD lama untuk satu semester, agar KRS,
 * jadwal, nilai, dan Feeder memakai kurikulum ini. Bandingkan dulu, pratinjau, jalankan; bisa dibatalkan selama
 * MK yang diterbitkan belum dipakai jadwal/KRS/nilai.
 */
export function TerbitKurikulum({ kurikulumId, className }: { kurikulumId: number | string; className?: string }) {
  const k = useKurikulum(kurikulumId).data as KurikulumLengkap | undefined;
  const [tahun, setTahun] = React.useState<string | null>(null);
  const [semester, setSemester] = React.useState<'semua' | 'ganjil' | 'genap'>('semua');
  const [perbarui, setPerbarui] = React.useState(false);
  const [bulatkan, setBulatkan] = React.useState(true);
  const [hasil, setHasil] = React.useState<HasilMigrasi | null>(null);
  const [batal, setBatal] = React.useState<RiwayatMigrasi | null>(null);
  const selisih = useSiakadQuery<Selisih>(['kur', String(kurikulumId), 'selisih', tahun], (s, signal) => s.request({ method: 'GET', path: `${P}/migrasi/selisih`, query: { kurikulum_id: kurikulumId, tahun_id: tahun } }, { signal }), { enabled: !!tahun });
  const riwayat = useSiakadQuery<RiwayatMigrasi[]>(['kur', 'migrasi', k?.kode_prodi], (s, signal) => s.request({ method: 'GET', path: `${P}/migrasi`, query: { prodi: k?.kode_prodi, jenis: 'terbit', per_page: 50 } }, { signal }), { enabled: !!k });
  const { kirim, sibuk, galat } = useKirim();
  const boleh = k && ['disahkan', 'berlaku'].includes(k.status);
  const jalankan = async (jalan: boolean) => {
    try {
      const r = await kirim<HasilMigrasi>('POST', `${P}/migrasi/terbit`, { kurikulum_id: Number(kurikulumId), tahun_id: tahun, semester, perbarui: perbarui || undefined, bulatkan_sks: bulatkan || undefined, jalankan: jalan }, jalan ? 'Mata kuliah diterbitkan ke SIAKAD.' : undefined);
      setHasil(r ?? null);
    } catch {
      /* tampil */
    }
  };
  const s = selisih.data;
  return (
    <div className={cn('u-kk-blok', className)}>
      {!boleh && (
        <Alert variant="info" title="Belum bisa diterbitkan">
          Hanya kurikulum berstatus disahkan atau berlaku yang dapat diterbitkan ke tabel mata kuliah SIAKAD.
        </Alert>
      )}
      <Panel title="Terbitkan ke SIAKAD" description="Menambah baris mata kuliah, prasyarat, dan jumlah SKS kurikulum untuk satu semester. Baris lama tidak diubah.">
        <div className="u-kk-form">
          <KotakGalat galat={galat} />
          <div className="u-kk-grid u-kk-grid-3">
            <Field label="Semester tujuan" required>
              <PilihTahunAkademik value={tahun} onValueChange={(v) => (setTahun(v), setHasil(null))} />
            </Field>
            <Field label="Semester paket">
              <Select
                value={semester}
                onValueChange={(v) => (setSemester((v ?? 'semua') as 'semua'), setHasil(null))}
                options={[
                  { value: 'semua', label: 'Semua MK' },
                  { value: 'ganjil', label: 'Semester paket ganjil' },
                  { value: 'genap', label: 'Semester paket genap' },
                ]}
              />
            </Field>
            <div className="u-kk-opsi">
              <label className="u-kk-centang">
                <Checkbox checked={perbarui} onCheckedChange={(v) => setPerbarui(!!v)} /> Perbarui baris terbitan sebelumnya
              </label>
              <label className="u-kk-centang">
                <Checkbox checked={bulatkan} onCheckedChange={(v) => setBulatkan(!!v)} /> Bulatkan SKS desimal
              </label>
            </div>
          </div>
          {s && (
            <div className="u-kk-selisih">
              <span>
                <b>{s.sama}</b> sama
              </span>
              <span data-warn={dataFlag(s.hanya_di_baru.length > 0)}>
                <b>{s.hanya_di_baru.length}</b> hanya di kurikulum ini
              </span>
              <span>
                <b>{s.hanya_di_lama.length}</b> hanya di SIAKAD semester itu
              </span>
              <span data-warn={dataFlag(s.beda.length > 0)}>
                <b>{s.beda.length}</b> berbeda
              </span>
            </div>
          )}
          {s && s.beda.length > 0 && (
            <details className="u-kk-detail">
              <summary>Lihat MK yang berbeda</summary>
              <ul className="u-kk-galat-list">
                {s.beda.map((b) => (
                  <li key={b.kode_mk}>
                    <span className="u-kur-code">{b.kode_mk}</span>{' '}
                    {Object.entries(b.perbedaan)
                      .map(([f, v]) => `${f}: ${String(v.lama)} → ${String(v.baru)}`)
                      .join('; ')}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {hasil && (
            <Alert variant={hasil.pratinjau ? 'info' : 'success'} title={hasil.pratinjau ? 'Pratinjau terbit' : 'Terbit selesai'}>
              <span className="u-kk-chip-row">
                {Object.entries(hasil.ringkasan ?? {})
                  .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
                  .map(([kk, v]) => (
                    <span key={kk} className="u-kk-chip" data-active="">
                      {label(kk)}: {String(v)}
                    </span>
                  ))}
              </span>
              {hasil.catatan && <p>{hasil.catatan}</p>}
            </Alert>
          )}
          <div className="u-kk-simpan">
            <Button variant="outline" loading={sibuk && !hasil} disabled={!boleh || !tahun} onClick={() => void jalankan(false)}>
              Pratinjau
            </Button>
            <Button loading={sibuk && !!hasil} disabled={!boleh || !tahun || !hasil?.pratinjau} onClick={() => void jalankan(true)}>
              <Upload /> Terbitkan
            </Button>
          </div>
        </div>
      </Panel>
      <Panel title="Riwayat terbit prodi ini">
        <DataTable<RiwayatMigrasi>
          columns={[
            { key: 'tahun_id', header: 'Semester', cell: (r) => tahunLabel(r.tahun_id) },
            { key: 'kurikulum_id', header: 'Kurikulum', cell: (r) => (String(r.kurikulum_id) === String(kurikulumId) ? 'Kurikulum ini' : `#${r.kurikulum_id}`) },
            { key: 'oleh', header: 'Oleh' },
            { key: 'created_at', header: 'Waktu', cell: (r) => (r.created_at ? formatDate(r.created_at, 'short') : '–') },
            { key: 'status', header: 'Status', shrink: true, cell: (r) => <Badge variant={r.status === 'selesai' ? 'success' : 'neutral'}>{label(r.status)}</Badge> },
          ]}
          rows={riwayat.data}
          rowKey={(r) => String(r.id)}
          loading={riwayat.loading && !riwayat.data}
          error={riwayat.error}
          onRetry={riwayat.refetch}
          columnToggle={false}
          densityToggle={false}
          rowActions={(r) => (r.status === 'selesai' ? [{ label: 'Batalkan terbit', icon: <Undo2 />, destructive: true, onSelect: () => setBatal(r) }] : [])}
          empty={{ icon: <Upload />, title: 'Belum pernah diterbitkan' }}
        />
      </Panel>
      <ConfirmDialog
        open={!!batal}
        onOpenChange={(o) => !o && setBatal(null)}
        title={`Batalkan terbit ${tahunLabel(batal?.tahun_id)}?`}
        description="Baris mata kuliah yang ditambahkan terbit ini dihapus dari SIAKAD. Ditolak bila sudah dipakai jadwal, KRS, atau nilai."
        confirmLabel="Batalkan terbit"
        onConfirm={async () => {
          if (batal) await kirim('POST', `${P}/migrasi/${batal.id}/batal`, {}, 'Terbit dibatalkan.').catch(abaikan);
        }}
      />
    </div>
  );
}

// ================================================================ Ruang kerja kurikulum
export type TabRuangKurikulum = 'ringkasan' | 'cpl' | 'bk' | 'mk' | 'matriks' | 'ekuivalensi' | 'capaian' | 'peninjauan' | 'buku' | 'terbit';
export interface RuangKurikulumObeProps {
  kurikulumId: number | string;
  /** Persempit hak dari API, mis. `{ migrasi: false }` di dasbor fakultas. */
  hak?: HakKurikulum;
  tab?: TabRuangKurikulum;
  onTabChange?: (t: TabRuangKurikulum) => void;
  /** Tombol kembali ke daftar. */
  onKembali?: () => void;
  /** Pindah ke kurikulum lain (setelah revisi dibuat) atau ke daftar (setelah draf dihapus: null). */
  onBukaKurikulum?: (id: number | null) => void;
  className?: string;
}

/**
 * Ruang kerja lengkap satu kurikulum OBE: alur & identitas, validasi SN Dikti, profil lulusan & CPL, bahan kajian,
 * mata kuliah per semester (CPMK & RPS di panel MK), matriks, ekuivalensi, capaian CPL, peninjauan, dan terbit ke
 * SIAKAD (bila pengguna punya hak migrasi). Cukup pasang `<RuangKurikulumObe kurikulumId={id} />`.
 */
export function RuangKurikulumObe({ kurikulumId, hak: batas, tab: tabProp, onTabChange, onKembali, onBukaKurikulum, className }: RuangKurikulumObeProps) {
  const h = useHakKurikulum(kurikulumId, batas);
  const k = h.data;
  const [tabDalam, setTabDalam] = React.useState<TabRuangKurikulum>('ringkasan');
  const tab = tabProp ?? tabDalam;
  const setTab = (t: TabRuangKurikulum) => (onTabChange ? onTabChange(t) : setTabDalam(t));
  const [mk, setMk] = React.useState<number | null>(null);
  const [ubah, setUbah] = React.useState(false);
  const r = k?.ringkasan ?? {};
  const item: Array<{ value: TabRuangKurikulum; label: string; count?: number; icon: React.ReactNode }> = [
    { value: 'ringkasan', label: 'Ringkasan', icon: <ShieldCheck /> },
    { value: 'cpl', label: 'Profil & CPL', count: n(r.cpl) || undefined, icon: <Target /> },
    { value: 'bk', label: 'Bahan kajian', count: n(r.bahan_kajian) || undefined, icon: <BookOpen /> },
    { value: 'mk', label: 'Mata kuliah', count: n(r.mata_kuliah) || undefined, icon: <Layers /> },
    { value: 'matriks', label: 'Matriks', icon: <Network /> },
    { value: 'ekuivalensi', label: 'Ekuivalensi', icon: <ClipboardList /> },
    { value: 'capaian', label: 'Capaian CPL', icon: <GraduationCap /> },
    { value: 'peninjauan', label: 'Peninjauan', icon: <FileText /> },
    { value: 'buku', label: 'Buku kurikulum', icon: <Printer /> },
    ...(h.migrasi ? [{ value: 'terbit' as const, label: 'Terbit', icon: <Upload /> }] : []),
  ];
  return (
    <div className={cn('u-kk', className)}>
      {onKembali && (
        <div className="u-kk-kembali">
          <Button size="sm" variant="ghost" onClick={onKembali}>
            <ArrowLeft /> Semua kurikulum
          </Button>
          {h.susun && k && (
            <Button size="sm" variant="outline" onClick={() => setUbah(true)}>
              <PenLine /> Ubah identitas
            </Button>
          )}
        </div>
      )}
      <RingkasanKurikulum kurikulumId={kurikulumId} />
      <AlurKurikulum kurikulumId={kurikulumId} hak={batas} onRevisi={(b) => onBukaKurikulum?.(b.id)} onHapus={() => onBukaKurikulum?.(null)} />
      {k && !h.ubah_struktur && h.susun && (
        <Alert variant="info" title={`Kurikulum ${label(k.status).toLowerCase()} terkunci`}>
          {k.status === 'arsip' ? 'Kurikulum arsip hanya untuk dilihat.' : 'Isi tidak bisa diubah. Buat revisi untuk menyusun versi berikutnya, atau minta pimpinan mengembalikannya ke draf.'}
        </Alert>
      )}
      <Tabs value={tab} onValueChange={setTab} items={item} className="u-kk-tabs" />
      <div className="u-kk-isi">
        {tab === 'ringkasan' && (
          <div className="u-kk-dua">
            <Panel title="Validasi SN Dikti & kelengkapan OBE" description="Diperiksa ulang setiap kali isi kurikulum berubah.">
              <ValidasiKurikulum kurikulumId={kurikulumId} />
            </Panel>
            <Panel
              title="Identitas & beban belajar"
              actions={
                h.susun && !onKembali ? (
                  <Button size="sm" variant="outline" onClick={() => setUbah(true)}>
                    <PenLine /> Ubah
                  </Button>
                ) : undefined
              }
            >
              {k && <IdentitasKurikulum k={k} />}
            </Panel>
          </div>
        )}
        {tab === 'cpl' && (
          <div className="u-kk-tumpuk">
            <Panel title="Profil lulusan" description="Peran yang dapat dijalankan lulusan di masyarakat/dunia kerja.">
              <KelolaButirKurikulum kurikulumId={kurikulumId} jenis="profil-lulusan" bolehUbah={h.ubah_struktur} />
            </Panel>
            <Panel title="Capaian pembelajaran lulusan (CPL)" description="Sikap, pengetahuan, keterampilan umum, keterampilan khusus (Pasal 7).">
              <KelolaButirKurikulum kurikulumId={kurikulumId} jenis="cpl" bolehUbah={h.ubah_struktur} />
            </Panel>
          </div>
        )}
        {tab === 'bk' && (
          <Panel title="Bahan kajian" description="Bidang ilmu yang dipelajari untuk mencapai CPL; dasar pembentukan mata kuliah.">
            <KelolaButirKurikulum kurikulumId={kurikulumId} jenis="bahan-kajian" bolehUbah={h.ubah_struktur} />
          </Panel>
        )}
        {tab === 'mk' && <KelolaMkKurikulum kurikulumId={kurikulumId} bolehUbah={h.ubah_struktur} onBukaMk={(m) => setMk(m.id)} />}
        {tab === 'matriks' && <KelolaMatriksKurikulum kurikulumId={kurikulumId} editable={h.ubah_struktur} />}
        {tab === 'ekuivalensi' && <KelolaEkuivalensi kurikulumId={kurikulumId} kodeProdi={k?.kode_prodi} bolehUbah={h.susun} />}
        {tab === 'capaian' && <KelolaCapaianCpl kurikulumId={kurikulumId} bolehRekam={h.susun} />}
        {tab === 'peninjauan' && <KelolaPeninjauan kurikulumId={kurikulumId} bolehUbah={h.susun} />}
        {tab === 'buku' && <BukuKurikulum kurikulumId={kurikulumId} />}
        {tab === 'terbit' && h.migrasi && <TerbitKurikulum kurikulumId={kurikulumId} />}
      </div>
      <RuangMkKurikulum mkId={mk} kurikulumId={kurikulumId} hak={batas} onOpenChange={(o) => !o && setMk(null)} />
      {k && <FormKurikulumObe open={ubah} onOpenChange={setUbah} kurikulum={k} />}
    </div>
  );
}

function IdentitasKurikulum({ k }: { k: KurikulumLengkap }) {
  const baris: Array<[string, React.ReactNode]> = [
    ['Program studi', [k.nama_prodi, k.jenjang?.nama].filter(Boolean).join(' · ') || k.kode_prodi],
    ['Versi', `${k.versi ?? 1}${k.sumber === 'migrasi' ? ' (impor kurikulum lama)' : k.sumber === 'salinan' ? ' (revisi)' : ''}`],
    ['Tahun berlaku', k.tahun_berlaku ?? '–'],
    ['SKS lulus', k.sks_lulus != null ? `${formatNumber(n(k.sks_lulus))} SKS${k.jenjang?.sks_min ? ` (minimal jenjang ${k.jenjang.sks_min})` : ''}` : '–'],
    ['SKS wajib / pilihan', `${k.sks_wajib ?? '–'} / ${k.sks_pilihan ?? '–'}`],
    ['Masa tempuh', k.masa_tempuh ? `${k.masa_tempuh} semester (maks. ${k.masa_studi_maks ?? '–'})` : '–'],
    ['IPK minimal lulus', k.ipk_min_lulus ?? '–'],
    ['Regulasi', k.regulasi ?? 'Permendiktisaintek 39/2025'],
  ];
  const narasi: Array<[string, string | null | undefined]> = [
    ['Visi keilmuan', k.visi_keilmuan],
    ['Kompetensi utama', k.kompetensi_utama],
    ['Metode pembelajaran', k.metode_pembelajaran],
    ['Penilaian', k.penilaian],
    ['Tugas akhir', k.tugas_akhir],
  ];
  return (
    <dl className="u-kk-info">
      {baris.map(([l, v]) => (
        <div key={l}>
          <dt>{l}</dt>
          <dd>{v}</dd>
        </div>
      ))}
      {narasi
        .filter(([, v]) => v)
        .map(([l, v]) => (
          <div key={l} className="u-kk-info-lebar">
            <dt>{l}</dt>
            <dd className="u-kk-pre">{v}</dd>
          </div>
        ))}
    </dl>
  );
}

// ================================================================ Perangkat pembelajaran per MK
export type JenisPerangkatMk = 'silabus' | 'rps' | 'bahan_ajar' | 'modul' | 'lainnya';
export const JENIS_PERANGKAT_MK: Record<JenisPerangkatMk, string> = {
  rps: 'RPS (dokumen)',
  silabus: 'Silabus',
  bahan_ajar: 'Bahan ajar',
  modul: 'Modul/praktikum',
  lainnya: 'Lainnya',
};
export interface PerangkatMk {
  id: number;
  mk_id: number;
  jenis: JenisPerangkatMk;
  nama_jenis: string;
  judul: string;
  keterangan: string | null;
  berkas_id: string;
  nama: string;
  ukuran: number;
  mime: string | null;
  dibuat_oleh: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Perangkat pembelajaran satu MK (silabus, RPS dokumen, bahan ajar, modul) dari /v1/kurikulum-obe/mk/{mk}/berkas. */
export function usePerangkatMk(mkId: number | string | null | undefined) {
  return useSiakadQuery<PerangkatMk[]>(
    ['kur-perangkat', String(mkId)],
    (s, signal) => s.request<PerangkatMk[]>({ method: 'GET', path: `${P}/mk/${mkId}/berkas` }, { signal }),
    { enabled: mkId != null },
  );
}

/** Buka atau unduh isi file perangkat (lewat token, jadi diambil sebagai blob). */
function useBukaPerangkat() {
  const siakad = useSiakad();
  const toast = useToast();
  const [sibuk, setSibuk] = React.useState<number | null>(null);
  const buka = async (p: PerangkatMk, unduh: boolean) => {
    // Jendela dibuka dulu (sinkron dengan klik) agar tidak diblokir peramban.
    const w = !unduh && typeof window !== 'undefined' ? window.open('', '_blank') : null;
    setSibuk(p.id);
    try {
      const r = await siakad.request<unknown>({ method: 'GET', path: `${P}/mk-berkas/${p.id}/isi`, query: unduh ? { unduh: '1' } : undefined });
      const d = r.data as { blob?: () => Blob; url?: string } | Blob | null;
      if (d && !(d instanceof Blob) && typeof d === 'object' && typeof d.url === 'string') {
        if (w) w.location.href = d.url;
        else window.open(d.url, '_blank');
        return;
      }
      const blob = d instanceof Blob ? d : d && typeof d === 'object' && typeof d.blob === 'function' ? d.blob() : null;
      if (!blob) throw new Error('Berkas tidak dapat dibuka.');
      const url = URL.createObjectURL(blob);
      if (w) {
        w.location.href = url;
      } else {
        const el = document.createElement('a');
        el.href = url;
        el.download = p.nama;
        el.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      w?.close();
      toast.add({ title: 'Gagal membuka berkas', description: pesanGalat(e), type: 'error' });
    } finally {
      setSibuk(null);
    }
  };
  return { buka, sibuk };
}

export interface KelolaPerangkatMkProps {
  mkId: number | string;
  /** Boleh mengunggah/mengubah/menghapus (penyusun kurikulum, atau dosen koordinator/pengampu MK). */
  bolehUbah?: boolean;
  /** Jenis yang dipilih saat membuka form (mis. "rps"). */
  jenisAwal?: JenisPerangkatMk;
  className?: string;
}

/**
 * Perangkat pembelajaran satu mata kuliah: unggah RPS (dokumen yang sudah ditandatangani), silabus, bahan ajar, dan
 * modul ke berkas terpusat, lalu lihat, unduh, ubah judul, atau hapus. Perangkat tetap bisa ditambah saat kurikulum
 * sudah berlaku.
 */
export function KelolaPerangkatMk({ mkId, bolehUbah, jenisAwal = 'rps', className }: KelolaPerangkatMkProps) {
  const q = usePerangkatMk(mkId);
  const daftar = q.data ?? [];
  const { kirim, sibuk, galat, setGalat, kolom } = useKirim();
  const { buka, sibuk: membuka } = useBukaPerangkat();
  const [form, setForm] = React.useState<null | { id?: number; jenis: JenisPerangkatMk; judul: string; keterangan: string; berkas_id: string | null }>(null);
  const [hapus, setHapus] = React.useState<PerangkatMk | null>(null);
  const kelompok = (Object.keys(JENIS_PERANGKAT_MK) as JenisPerangkatMk[]).map((j) => ({ j, isi: daftar.filter((p) => p.jenis === j) })).filter((g) => g.isi.length);
  const adaRps = daftar.some((p) => p.jenis === 'rps');
  const simpan = async () => {
    if (!form) return;
    const body = { jenis: form.jenis, judul: form.judul.trim() || undefined, keterangan: form.keterangan.trim() || null };
    try {
      if (form.id) await kirim('PUT', `${P}/mk-berkas/${form.id}`, body, 'Perangkat diperbarui.');
      else await kirim('POST', `${P}/mk/${mkId}/berkas`, { ...body, berkas_id: form.berkas_id }, 'Perangkat diunggah.');
      setForm(null);
    } catch {
      /* tampil di form */
    }
  };
  return (
    <div className={cn('u-kk-perangkat', className)}>
      <div className="u-kk-perangkat-kepala">
        <p>
          {adaRps ? (
            <>
              <CheckCircle2 aria-hidden className="u-kk-ok" /> Dokumen RPS sudah diunggah.
            </>
          ) : (
            <>
              <CircleAlert aria-hidden className="u-kk-awas" /> Belum ada dokumen RPS. Unggah RPS yang sudah ditandatangani, atau susun di tab RPS.
            </>
          )}
        </p>
        {bolehUbah && (
          <Button
            size="sm"
            onClick={() => {
              setGalat(null);
              setForm({ jenis: adaRps && jenisAwal === 'rps' ? 'bahan_ajar' : jenisAwal, judul: '', keterangan: '', berkas_id: null });
            }}
          >
            <Upload /> Unggah perangkat
          </Button>
        )}
      </div>
      {q.loading && <Progress value={null} size="sm" />}
      {!q.loading && !daftar.length && (
        <Empty
          icon={<FileText />}
          title="Belum ada perangkat pembelajaran"
          description={bolehUbah ? 'Unggah RPS, silabus, bahan ajar, atau modul untuk mata kuliah ini.' : 'Penyusun kurikulum atau dosen pengampu belum mengunggah perangkat.'}
          bordered
        />
      )}
      {kelompok.map((g) => (
        <section key={g.j} className="u-kk-perangkat-grup">
          <h4>
            {JENIS_PERANGKAT_MK[g.j]} <Badge variant="secondary">{g.isi.length}</Badge>
          </h4>
          <ul>
            {g.isi.map((p) => (
              <li key={p.id}>
                <FileText aria-hidden className="u-kk-perangkat-ikon" />
                <span className="u-kk-perangkat-teks">
                  <button type="button" className="u-kk-perangkat-judul" onClick={() => buka(p, false)} disabled={membuka === p.id}>
                    {p.judul}
                  </button>
                  <small>{[p.nama, formatBytes(p.ukuran), p.updated_at ? formatDate(p.updated_at) : null].filter(Boolean).join(' · ')}</small>
                  {p.keterangan && <small className="u-kk-perangkat-ket">{p.keterangan}</small>}
                </span>
                <span className="u-kk-aksi">
                  <Button size="sm" variant="ghost" iconOnly aria-label={`Unduh ${p.judul}`} loading={membuka === p.id} onClick={() => buka(p, true)}>
                    <Download />
                  </Button>
                  {bolehUbah && (
                    <Menu
                      trigger={
                        <Button size="sm" variant="ghost" iconOnly aria-label={`Aksi ${p.judul}`}>
                          <MoreHorizontal />
                        </Button>
                      }
                      items={[
                        { label: 'Ubah judul/jenis', icon: <PenLine />, onSelect: () => setForm({ id: p.id, jenis: p.jenis, judul: p.judul, keterangan: p.keterangan ?? '', berkas_id: p.berkas_id }) },
                        { label: 'Hapus', icon: <Trash2 />, destructive: true, onSelect: () => setHapus(p) },
                      ]}
                    />
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <Dialog
        side="right"
        open={form != null}
        onOpenChange={(o) => !o && setForm(null)}
        title={form?.id ? 'Ubah perangkat' : 'Unggah perangkat pembelajaran'}
        description="File disimpan di berkas terpusat UNIPO. PDF disarankan untuk RPS dan silabus."
        footer={
          <>
            <Button variant="ghost" onClick={() => setForm(null)}>
              Batal
            </Button>
            <Button loading={sibuk} disabled={!form || (!form.id && !form.berkas_id)} onClick={simpan}>
              {form?.id ? 'Simpan perubahan' : 'Simpan perangkat'}
            </Button>
          </>
        }
      >
        {form && (
          <div className="u-kk-form">
            <KotakGalat galat={galat} />
            <Field label="Jenis" required error={kolom.jenis}>
              <Select value={form.jenis} onValueChange={(v) => setForm({ ...form, jenis: (v ?? 'rps') as JenisPerangkatMk })} options={Object.entries(JENIS_PERANGKAT_MK).map(([value, l]) => ({ value, label: l }))} />
            </Field>
            {!form.id && (
              <Field label="File" required error={kolom.berkas_id}>
                <PilihBerkas
                  value={form.berkas_id}
                  onValueChange={(id, b) => setForm((f) => (f ? { ...f, berkas_id: id, judul: f.judul || (b?.nama ? b.nama.replace(/\.[^.]+$/, '') : '') } : f))}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.jpg,.png"
                  kategori="kurikulum"
                  modul="kurikulum"
                />
              </Field>
            )}
            <Field label="Judul" optional description="Kosong = jenis + nama mata kuliah." error={kolom.judul}>
              <Input value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} placeholder="mis. RPS Logika dan Pemrograman 2025/2026" />
            </Field>
            <Field label="Keterangan" optional error={kolom.keterangan}>
              <Textarea rows={2} value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} placeholder="Versi, tanggal pengesahan, atau catatan untuk dosen pengampu" />
            </Field>
          </div>
        )}
      </Dialog>
      <ConfirmDialog
        open={hapus != null}
        onOpenChange={(o) => !o && setHapus(null)}
        title="Hapus perangkat?"
        description={hapus ? `${hapus.judul} (${hapus.nama}) dilepas dari mata kuliah ini.` : undefined}
        confirmLabel="Hapus perangkat"
        onConfirm={async () => {
          if (hapus) await kirim('DELETE', `${P}/mk-berkas/${hapus.id}`, undefined, 'Perangkat dihapus.');
          setHapus(null);
        }}
      />
    </div>
  );
}

// ================================================================ Buku kurikulum
interface MkBuku {
  id: number;
  kode_mk: string;
  nama: string;
  nama_en: string | null;
  sks: number;
  sks_tatap_muka: number;
  sks_praktikum: number;
  sks_praktik_lapangan: number;
  sks_simulasi: number;
  jenis: string;
  nama_jenis: string;
  kelompok: string | null;
  deskripsi: string | null;
  koordinator: string | null;
  prasyarat: Array<{ kode_mk: string; nama: string; jenis: string }>;
  cpl: string[];
  cpmk: Array<{ kode: string; deskripsi: string }>;
  status_rps: 'disahkan' | 'draf' | null;
  perangkat: Partial<Record<JenisPerangkatMk, number>>;
}
export interface BukuKurikulumData {
  kurikulum: KurikulumLengkap & Record<string, unknown>;
  profil_lulusan: Array<{ kode: string; nama: string; deskripsi: string | null }>;
  cpl: Array<{ kode: string; ranah: string; nama_ranah: string; deskripsi: string; target: number | null }>;
  bahan_kajian: Array<{ kode: string; nama: string; deskripsi: string | null }>;
  semester: Array<{ semester: number; sks_wajib: number; sks_pilihan: number; mk: MkBuku[] }>;
  ekuivalensi: Array<{ kode_mk_lama: string; nama_mk_lama: string | null; sks_lama: number | null; kode_mk: string | null; nama: string | null; sks: number | null; jenis: string; catatan: string | null }>;
  peninjauan: Array<{ jenis: string; judul: string; tanggal: string | null; pelaksana: string | null; ringkasan: string | null; status: string | null }>;
  dibuat_at: string;
}

export function useBukuKurikulum(kurikulumId: number | string | undefined) {
  return useSiakadQuery<BukuKurikulumData>(
    ['kur-buku', String(kurikulumId)],
    (s, signal) => s.request<BukuKurikulumData>({ method: 'GET', path: `${P}/kurikulum/${kurikulumId}/buku` }, { signal }),
    { enabled: kurikulumId != null },
  );
}

function cetakBuku(id: string, judul: string) {
  const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
  if (!el) return;
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return;
  const gaya = [...document.querySelectorAll('style, link[rel="stylesheet"]')].map((s) => s.outerHTML).join('');
  w.document.write(
    `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${judul.replace(/</g, '&lt;')}</title>${gaya}<style>body{background:#fff;padding:0;margin:0}@page{size:A4;margin:16mm}</style></head><body class="u-kk-buku-cetak">${el.outerHTML}</body></html>`,
  );
  w.document.close();
  w.addEventListener('load', () => w.print());
}

const NARASI_BUKU: Array<[string, string]> = [
  ['visi_keilmuan', 'Visi keilmuan program studi'],
  ['kompetensi_utama', 'Kompetensi utama lulusan'],
  ['metode_pembelajaran', 'Metode pembelajaran'],
  ['modalitas_pembelajaran', 'Modalitas pembelajaran'],
  ['penilaian', 'Penilaian'],
  ['tugas_akhir', 'Tugas akhir'],
  ['syarat_masuk', 'Syarat masuk'],
  ['tata_cara_penerimaan', 'Tata cara penerimaan'],
];

export interface BukuKurikulumProps {
  kurikulumId: number | string;
  /** Nama institusi di sampul. */
  institusi?: string;
  className?: string;
}

/**
 * Buku kurikulum siap cetak (A4) atau simpan sebagai PDF lewat dialog cetak peramban: identitas dan SK, narasi
 * Pasal 44, profil lulusan, CPL per ranah, bahan kajian, struktur mata kuliah per semester (SKS, prasyarat, CPL,
 * CPMK, koordinator, status RPS, perangkat), ekuivalensi, dan riwayat peninjauan.
 */
export function BukuKurikulum({ kurikulumId, institusi = 'Universitas Pohuwato', className }: BukuKurikulumProps) {
  const q = useBukuKurikulum(kurikulumId);
  const b = q.data;
  const id = `u-kk-buku-${kurikulumId}`;
  if (q.loading || !b) return q.error ? <KotakGalat galat={q.error} /> : <Progress value={null} size="sm" />;
  const k = b.kurikulum;
  const totalWajib = b.semester.reduce((a, s) => a + s.sks_wajib, 0);
  const totalPilihan = b.semester.reduce((a, s) => a + s.sks_pilihan, 0);
  const jumlahMk = b.semester.reduce((a, s) => a + s.mk.length, 0);
  const rpsSah = b.semester.reduce((a, s) => a + s.mk.filter((m) => m.status_rps === 'disahkan').length, 0);
  const rpsDok = b.semester.reduce((a, s) => a + s.mk.filter((m) => (m.perangkat.rps ?? 0) > 0).length, 0);
  const ranah = [...new Set(b.cpl.map((c) => c.nama_ranah))];
  const narasi = NARASI_BUKU.filter(([f]) => typeof k[f] === 'string' && (k[f] as string).trim());
  let bab = 0;
  return (
    <div className={cn('u-kk-buku-wadah', className)}>
      <div className="u-kk-buku-alat">
        <span>
          {jumlahMk} mata kuliah · {formatNumber(totalWajib + totalPilihan)} SKS · RPS disahkan {rpsSah}/{jumlahMk} · dokumen RPS {rpsDok}/{jumlahMk}
        </span>
        <Button size="sm" onClick={() => cetakBuku(id, `Buku Kurikulum ${k.kode}`)}>
          <Printer /> Cetak / simpan PDF
        </Button>
      </div>
      <article id={id} className="u-kk-buku">
        <header className="u-kk-buku-sampul">
          <p className="u-kk-buku-inst">{institusi}</p>
          <h1>Buku Kurikulum</h1>
          <p className="u-kk-buku-prodi">
            Program Studi {k.nama_prodi ?? k.kode_prodi}
            {k.jenjang?.nama ? ` (${k.jenjang.nama})` : ''}
          </p>
          <p className="u-kk-buku-nama">
            {k.nama} <span>({k.kode})</span>
          </p>
          <dl>
            <div>
              <dt>Status</dt>
              <dd>{label(k.status)}</dd>
            </div>
            <div>
              <dt>Tahun berlaku</dt>
              <dd>{k.tahun_berlaku ?? '–'}</dd>
            </div>
            <div>
              <dt>SK</dt>
              <dd>{k.no_sk ? `${k.no_sk}${k.tanggal_sk ? `, ${formatDate(k.tanggal_sk)}` : ''}` : 'Belum ada'}</dd>
            </div>
            <div>
              <dt>Acuan</dt>
              <dd>{k.regulasi ?? 'Permendiktisaintek 39/2025'}</dd>
            </div>
          </dl>
        </header>

        <section>
          <h2>{++bab}. Identitas dan beban belajar</h2>
          {/* unipo-ui-izinkan tabel-bawaan: tata letak dokumen buku kurikulum (cetak/PDF), bukan tabel data */}
          <table className="u-kk-buku-tabel u-kk-buku-kv">
            <tbody>
              <tr>
                <th>Beban studi lulus</th>
                <td>{formatNumber(n(k.sks_lulus))} SKS (wajib {formatNumber(n(k.sks_wajib))}, pilihan {formatNumber(n(k.sks_pilihan))})</td>
              </tr>
              <tr>
                <th>Masa tempuh</th>
                <td>{k.masa_tempuh ? `${k.masa_tempuh} semester` : '–'}</td>
              </tr>
              <tr>
                <th>IPK minimal lulus</th>
                <td>{k.ipk_min_lulus != null && k.ipk_min_lulus !== '' ? formatNumber(n(k.ipk_min_lulus)) : '–'}</td>
              </tr>
              <tr>
                <th>Struktur mata kuliah</th>
                <td>
                  {jumlahMk} MK, {formatNumber(totalWajib)} SKS wajib, {formatNumber(totalPilihan)} SKS pilihan
                </td>
              </tr>
            </tbody>
          </table>
          {narasi.map(([f, l]) => (
            <div key={f} className="u-kk-buku-narasi">
              <h3>{l}</h3>
              <p>{k[f] as string}</p>
            </div>
          ))}
        </section>

        <section>
          <h2>{++bab}. Profil lulusan</h2>
          {b.profil_lulusan.length ? ( // unipo-ui-izinkan tabel-bawaan: tata letak dokumen buku kurikulum (cetak/PDF), bukan tabel data
            <table className="u-kk-buku-tabel">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Profil</th>
                  <th>Deskripsi</th>
                </tr>
              </thead>
              <tbody>
                {b.profil_lulusan.map((p) => (
                  <tr key={p.kode}>
                    <td className="u-kk-buku-kode">{p.kode}</td>
                    <td>{p.nama}</td>
                    <td>{p.deskripsi ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="u-kk-buku-kosong">Belum diisi.</p>
          )}
        </section>

        <section>
          <h2>{++bab}. Capaian pembelajaran lulusan (CPL)</h2>
          {ranah.length ? (
            ranah.map((r) => (
              <div key={r}>
                <h3>{r}</h3>
                {/* unipo-ui-izinkan tabel-bawaan: tata letak dokumen buku kurikulum (cetak/PDF), bukan tabel data */}
                <table className="u-kk-buku-tabel">
                  <tbody>
                    {b.cpl
                      .filter((c) => c.nama_ranah === r)
                      .map((c) => (
                        <tr key={c.kode}>
                          <td className="u-kk-buku-kode">{c.kode}</td>
                          <td>{c.deskripsi}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ))
          ) : (
            <p className="u-kk-buku-kosong">Belum diisi.</p>
          )}
        </section>

        {b.bahan_kajian.length > 0 && (
          <section>
            <h2>{++bab}. Bahan kajian</h2>
            {/* unipo-ui-izinkan tabel-bawaan: tata letak dokumen buku kurikulum (cetak/PDF), bukan tabel data */}
            <table className="u-kk-buku-tabel">
              <tbody>
                {b.bahan_kajian.map((x) => (
                  <tr key={x.kode}>
                    <td className="u-kk-buku-kode">{x.kode}</td>
                    <td>
                      <strong>{x.nama}</strong>
                      {x.deskripsi ? <> · {x.deskripsi}</> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section>
          <h2>{++bab}. Struktur mata kuliah per semester</h2>
          {b.semester.map((s) => (
            <div key={s.semester} className="u-kk-buku-smt">
              <h3>
                {s.semester ? `Semester ${s.semester}` : 'Pilihan bebas'} <small>({formatNumber(s.sks_wajib + s.sks_pilihan)} SKS)</small>
              </h3>
              {/* unipo-ui-izinkan tabel-bawaan: tata letak dokumen buku kurikulum (cetak/PDF), bukan tabel data */}
              <table className="u-kk-buku-tabel">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Mata kuliah</th>
                    <th className="u-kk-buku-angka">SKS</th>
                    <th>Jenis</th>
                    <th>Prasyarat</th>
                    <th>CPL</th>
                    <th>RPS</th>
                  </tr>
                </thead>
                <tbody>
                  {s.mk.map((m) => (
                    <tr key={m.id}>
                      <td className="u-kk-buku-kode">{m.kode_mk}</td>
                      <td>
                        {m.nama}
                        {m.koordinator && <small className="u-kk-buku-sub">Koordinator: {m.koordinator}</small>}
                      </td>
                      <td className="u-kk-buku-angka">{formatNumber(m.sks)}</td>
                      <td>{m.nama_jenis}</td>
                      <td>{m.prasyarat.map((p) => p.kode_mk).join(', ') || '–'}</td>
                      <td>{m.cpl.join(', ') || '–'}</td>
                      <td>{m.status_rps === 'disahkan' ? 'Disahkan' : m.perangkat.rps ? 'Dokumen' : m.status_rps === 'draf' ? 'Draf' : '–'}</td>
                    </tr>
                  ))}
                  <tr className="u-kk-buku-jumlah">
                    <td colSpan={2}>Jumlah</td>
                    <td className="u-kk-buku-angka">{formatNumber(s.sks_wajib + s.sks_pilihan)}</td>
                    <td colSpan={4}>{s.sks_pilihan ? `wajib ${formatNumber(s.sks_wajib)}, pilihan ${formatNumber(s.sks_pilihan)}` : ''}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </section>

        {b.semester.some((s) => s.mk.some((m) => m.cpmk.length || m.deskripsi)) && (
          <section>
            <h2>{++bab}. Deskripsi mata kuliah dan CPMK</h2>
            {b.semester.flatMap((s) =>
              s.mk
                .filter((m) => m.cpmk.length || m.deskripsi)
                .map((m) => (
                  <div key={m.id} className="u-kk-buku-mk">
                    <h3>
                      {m.kode_mk} · {m.nama} <small>({formatNumber(m.sks)} SKS)</small>
                    </h3>
                    {m.deskripsi && <p>{m.deskripsi}</p>}
                    {m.cpmk.length > 0 && (
                      <ul>
                        {m.cpmk.map((c) => (
                          <li key={c.kode}>
                            <strong>{c.kode}</strong> {c.deskripsi}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )),
            )}
          </section>
        )}

        {b.ekuivalensi.length > 0 && (
          <section>
            <h2>{++bab}. Ekuivalensi mata kuliah</h2>
            {/* unipo-ui-izinkan tabel-bawaan: tata letak dokumen buku kurikulum (cetak/PDF), bukan tabel data */}
            <table className="u-kk-buku-tabel">
              <thead>
                <tr>
                  <th>MK lama</th>
                  <th className="u-kk-buku-angka">SKS</th>
                  <th>MK baru</th>
                  <th className="u-kk-buku-angka">SKS</th>
                  <th>Jenis</th>
                </tr>
              </thead>
              <tbody>
                {b.ekuivalensi.map((e, i) => (
                  <tr key={i}>
                    <td>
                      <span className="u-kk-buku-kode">{e.kode_mk_lama}</span> {e.nama_mk_lama ?? ''}
                    </td>
                    <td className="u-kk-buku-angka">{e.sks_lama != null ? formatNumber(e.sks_lama) : ''}</td>
                    <td>{e.kode_mk ? <><span className="u-kk-buku-kode">{e.kode_mk}</span> {e.nama}</> : 'Dihapus'}</td>
                    <td className="u-kk-buku-angka">{e.sks != null ? formatNumber(e.sks) : ''}</td>
                    <td>{label(e.jenis)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {b.peninjauan.length > 0 && (
          <section>
            <h2>{++bab}. Riwayat evaluasi dan peninjauan</h2>
            {/* unipo-ui-izinkan tabel-bawaan: tata letak dokumen buku kurikulum (cetak/PDF), bukan tabel data */}
            <table className="u-kk-buku-tabel">
              <tbody>
                {b.peninjauan.map((p, i) => (
                  <tr key={i}>
                    <td>{p.tanggal ? formatDate(p.tanggal) : '–'}</td>
                    <td>
                      <strong>{p.judul}</strong> ({label(p.jenis)}){p.pelaksana ? `, ${p.pelaksana}` : ''}
                      {p.ringkasan && <small className="u-kk-buku-sub">{p.ringkasan}</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        <footer className="u-kk-buku-kaki">Dicetak dari SIAKAD UNIPO, {formatDate(b.dibuat_at)}.</footer>
      </article>
    </div>
  );
}
