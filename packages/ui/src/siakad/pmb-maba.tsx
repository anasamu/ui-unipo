'use client';
import * as React from 'react';
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  FileUp,
  GraduationCap,
  Hourglass,
  IdCard,
  KeyRound,
  LogOut,
  Mail,
  MailWarning,
  MapPin,
  MonitorCheck,
  MonitorPlay,
  PartyPopper,
  PlayCircle,
  Plus,
  Printer,
  QrCode,

  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  Video,
  Wallet,
  X,
  XCircle,
  Receipt,
} from 'lucide-react';
import { formatBytes, formatRelative, formatRupiah } from '../lib/format';
import { Badge, Button, Skeleton, type BadgeVariant } from '../components/actions';
import { Alert, Card, CardContent, CardHeader, DescriptionList, Empty, Progress, Stepper, Table, TableContainer } from '../components/display';
import { Field, Input } from '../components/forms';
import { ConfirmDialog, Dialog, Sheet, useToast } from '../components/overlays';
import { DatePicker, toISODate } from '../components/calendar';
import { StatCard } from '../components/charts';
import { CentangSukses } from '../components/animasi';
import { Cluster, Grid, PageHeader, Split, Stack, Text } from '../components/tata-letak';
import { idPerangkatCbt, LembarUjian } from './cbt';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { LabelProdi } from './prodi';
import { WizardPendaftaranPmb } from './pmb';
import { KwitansiResmi, RincianPembayaran } from './kwitansi';
import {
  TautanPmb,
  hurufJudul,
  keadaanGelombang,
  labelTahunPmb,
  rentangPmb,
  tanggalPmb,
  urutkanGelombang,
  useGelombangPmb,
  usePmb,
  type SyaratBerkasPmb,
} from './pmb-publik';
import { IsianBerkas, TombolPilihBerkas } from '../components/pilih-berkas-lokal';
import { Select } from '../components/select';

/**
 * Area pendaftar PMB (`/v1/pmb/saya/*`): dasbor tahapan, pilih gelombang, formulir, berkas, tagihan dan pembayaran
 * online, kartu peserta, ujian CBT, hasil seleksi, notifikasi, dan akun. SDK di <UnipoProvider> harus memakai sesi
 * pendaftar (mis. baseUrl BFF `/bff/saya`).
 */

// ================================================================ Tipe
export interface AkunPendaftarPmb {
  id: string;
  nama: string;
  email: string;
  hp: string | null;
  email_terverifikasi: boolean;
  email_terverifikasi_at: string | null;
  status: string;
  login_terakhir_at: string | null;
  dibuat_at: string;
}
export interface TahapPmb {
  kode: string;
  label: string;
}
export interface BerkasPendaftarPmb {
  id: number;
  jenis: string;
  jenis_nama: string | null;
  nama_asli: string;
  mime: string;
  ukuran: number;
  status: 'menunggu' | 'valid' | 'ditolak';
  catatan: string | null;
  diverifikasi_at: string | null;
  diunggah_at: string;
}
export interface PembayaranPmb {
  id: number;
  sumber: string;
  referensi: string | null;
  jumlah: number;
  dibayar_at: string | null;
  ada_bukti: boolean | number;
  status: string;
  catatan: string | null;
  created_at: string;
}
export interface TagihanPmb {
  id: number;
  nomor: string;
  jenis: 'formulir' | 'daftar_ulang' | 'lainnya';
  keterangan: string | null;
  nominal: number;
  potongan: number;
  total: number;
  kanal: string | null;
  nomor_va: string | null;
  status: 'belum_bayar' | 'menunggu_konfirmasi' | 'lunas' | 'kedaluwarsa' | 'batal';
  kedaluwarsa_at: string | null;
  lunas_at: string | null;
  dibuat_at: string;
  pembayaran?: PembayaranPmb[];
}
export interface PilihanPendaftarPmb {
  urut: number;
  kode_prodi: string;
  nama_prodi: string | null;
  jenjang: string | null;
  lulus: boolean | null;
  diterima: boolean;
  nim: string | null;
}
export interface JadwalTesPmb {
  sesi_id: number;
  jenis: string;
  nama: string;
  tanggal: string;
  mulai: string;
  selesai: string;
  ruang_nama: string | null;
  lokasi: string | null;
  tautan: string | null;
  nomor_kursi: string | null;
  kehadiran: string;
  nilai: number | null;
}
export interface PendaftaranRingkasPmb {
  id: string;
  no_pmb: string | null;
  nama: string | null;
  gelombang: { id: number; nama: string; periode_id: string };
  status: string;
  tahap: TahapPmb;
  diajukan_at: string | null;
  dibuat_at: string;
}
export interface PendaftaranPmb {
  id: string;
  no_pmb: string | null;
  nomor_peserta: string | null;
  gelombang: { id: number; nama: string; periode_id: string; jalur: string | null; pengumuman_mulai: string | null };
  status: string;
  tahap: TahapPmb;
  pilihan: PilihanPendaftarPmb[];
  berkas: BerkasPendaftarPmb[];
  syarat_berkas: SyaratBerkasPmb[];
  kelengkapan: Record<string, string> | [];
  tagihan: TagihanPmb[];
  jadwal_tes: JadwalTesPmb[];
  catatan_verifikasi: string | null;
  diajukan_at: string | null;
  dibuat_at: string;
}
export interface NotifikasiPendaftarPmb {
  id: number;
  judul: string;
  isi: string | null;
  dibaca_at: string | null;
  created_at: string;
}
export interface MetodeBayarPmb {
  penyedia: string;
  nama: string;
  utama: boolean;
  metode: { metode: 'checkout' | 'va' | 'qris'; kanal: string[]; keterangan?: string }[];
}
export interface TransaksiPmb {
  id: string;
  order_id: string;
  metode: string;
  kanal: string | null;
  jumlah: number;
  status: string;
  url_bayar: string | null;
  nomor_va: string | null;
  qr_string: string | null;
  kedaluwarsa_at: string | null;
}
export interface UjianPendaftarPmb {
  id: number;
  status: 'terdaftar' | 'mengerjakan' | 'selesai' | 'diskualifikasi' | 'tidak_hadir';
  ujian: string;
  kode: string;
  durasi_menit: number;
  petunjuk: string | null;
  sesi: string;
  mulai: string;
  selesai: string;
  sesi_status: string;
  sisa_detik: number | null;
  bisa_mulai: boolean;
}

// ================================================================ Label & status
export const LABEL_STATUS_PMB: Record<string, string> = {
  draf: 'Draf',
  diajukan: 'Diajukan',
  perlu_perbaikan: 'Perlu perbaikan',
  terverifikasi: 'Terverifikasi',
  ditolak: 'Ditolak',
  mengundurkan_diri: 'Mengundurkan diri',
};
export const VARIAN_STATUS_PMB: Record<string, BadgeVariant> = {
  draf: 'neutral',
  diajukan: 'info',
  perlu_perbaikan: 'warning',
  terverifikasi: 'success',
  ditolak: 'danger',
  mengundurkan_diri: 'neutral',
  belum_bayar: 'warning',
  menunggu_konfirmasi: 'info',
  lunas: 'success',
  kedaluwarsa: 'neutral',
  batal: 'neutral',
  menunggu: 'info',
  valid: 'success',
};
export const LABEL_TAGIHAN_PMB: Record<string, string> = { belum_bayar: 'Belum dibayar', menunggu_konfirmasi: 'Menunggu konfirmasi', lunas: 'Lunas', kedaluwarsa: 'Kedaluwarsa', batal: 'Dibatalkan' };
/** Enam langkah besar pendaftar untuk penunjuk tahap. */
export const LANGKAH_PMB = [
  { title: 'Formulir', description: 'Isi data & berkas' },
  { title: 'Pembayaran', description: 'Biaya pendaftaran' },
  { title: 'Verifikasi', description: 'Diperiksa panitia' },
  { title: 'Seleksi', description: 'Tes / penilaian' },
  { title: 'Pengumuman', description: 'Hasil seleksi' },
  { title: 'Daftar ulang', description: 'Jadi mahasiswa' },
];
/** Urutan (0-based) tahap pendaftaran PMB dari kodenya, untuk progres langkah calon mahasiswa; 0 bila tidak dikenal. */
export function indeksTahapPmb(kode: string): number {
  return (
    {
      mengisi_formulir: 0,
      perlu_perbaikan: 0,
      menunggu_pembayaran: 1,
      menunggu_verifikasi: 2,
      seleksi: 3,
      menunggu_pengumuman: 4,
      tidak_lulus: 4,
      lulus_seleksi: 5,
      diterima: 6,
    } as Record<string, number>
  )[kode] ?? 0;
}
const LABEL_FIELD: Record<string, string> = {
  'pribadi.nama': 'Nama lengkap',
  'pribadi.no_identitas': 'NIK',
  'pribadi.jenis_kelamin': 'Jenis kelamin',
  'pribadi.tempat_lahir': 'Tempat lahir',
  'pribadi.tanggal_lahir': 'Tanggal lahir',
  'pribadi.agama': 'Agama',
  'pribadi.warga_negara': 'Kewarganegaraan',
  'pribadi.hp': 'Nomor HP',
  'pribadi.email': 'Email',
  'alamat.alamat': 'Alamat',
  'alamat.desa': 'Desa/kelurahan',
  'alamat.kecamatan': 'Kecamatan',
  'asal_sekolah.status_masuk': 'Status masuk',
  'asal_sekolah.nama_sekolah': 'Sekolah asal',
  'orang_tua.ayah.nama': 'Nama ayah',
  'orang_tua.ibu.nama': 'Nama ibu',
  pilihan: 'Pilihan program studi',
};
/** Label isian dari kunci kelengkapan API ("pribadi.nama"). */
export const labelKelengkapanPmb = (k: string) => LABEL_FIELD[k] ?? (k.startsWith('berkas.') ? `Berkas ${k.slice(7).replace(/_/g, ' ')}` : k.replace(/[._]/g, ' '));
/** Halaman tempat isian berada: berkas, atau formulir + id langkah wizard. */
export function letakKelengkapanPmb(k: string): { berkas: true } | { berkas: false; langkah: string } {
  if (k.startsWith('berkas.')) return { berkas: true };
  const b = k.split('.')[0];
  return { berkas: false, langkah: b === 'orang_tua' ? 'ortu' : b === 'asal_sekolah' ? 'asal' : b === 'pilihan' ? 'prodi' : b === 'nilai' ? 'rapor' : b };
}
const bisaDiubah = (p?: Pick<PendaftaranPmb, 'status'> | null) => !!p && (p.status === 'draf' || p.status === 'perlu_perbaikan');
const jam = (s?: string | null) => (s ? (/(\d{2}):(\d{2})/.exec(s)?.slice(1).join('.') ?? s) : '-');
const waktu = (s?: string | null) => (s ? `${tanggalPmb(s)}${/\d{2}:\d{2}/.test(s) ? `, ${jam(s)}` : ''}` : '-');

// ================================================================ Hook data
function useBerkala(refetch: () => void, ms: number, aktif = true) {
  const r = React.useRef(refetch);
  r.current = refetch;
  React.useEffect(() => {
    if (!aktif) return;
    const t = setInterval(() => document.visibilityState === 'visible' && r.current(), ms);
    return () => clearInterval(t);
  }, [ms, aktif]);
}
export const useAkunPendaftarPmb = () => useSiakadQuery<AkunPendaftarPmb>(['pmb-saya', 'akun'], (s, signal) => s.pmb.getSaya({}, { signal }) as never);
export const useDaftarPendaftaranPmb = () => useSiakadQuery<PendaftaranRingkasPmb[]>(['pmb-saya', 'pendaftaran'], (s, signal) => s.pmb.getSayaPendaftaran({}, { signal }) as never, { staleTime: 15_000 });
export const usePendaftaranPmb = (id?: string | null) =>
  useSiakadQuery<PendaftaranPmb>(['pmb-saya', 'pendaftaran', id], (s, signal) => s.pmb.getSayaPendaftaranById(id!, {}, { signal }) as never, { enabled: !!id, staleTime: 15_000 });
export const useTagihanPmb = (id?: string | null) =>
  useSiakadQuery<TagihanPmb[]>(['pmb-saya', 'tagihan', id], (s, signal) => s.pmb.getSayaPendaftaranByIdTagihan(id!, {}, { signal }) as never, { enabled: !!id, staleTime: 10_000 });
export const useMetodeBayarPmb = () => useSiakadQuery<MetodeBayarPmb[]>(['pmb-saya', 'metode-bayar'], (s, signal) => s.pmb.getSayaPembayaranMetode({}, { signal }) as never, { staleTime: 300_000 });
export function useTransaksiPmb(id: string, tagihan: number, aktif: boolean) {
  const q = useSiakadQuery<TransaksiPmb | null>(['pmb-saya', 'transaksi', id, tagihan], (s, signal) => s.pmb.getSayaPendaftaranByIdTagihanByTagihanBayar(id, tagihan, { segarkan: 1 } as never, { signal }) as never, {
    enabled: aktif,
    staleTime: 0,
  });
  useBerkala(q.refetch, 20_000, aktif && !!q.data);
  return q;
}
export function useUjianPendaftarPmb(id?: string | null, aktif = true) {
  const q = useSiakadQuery<UjianPendaftarPmb[]>(['pmb-ujian', id], (s, signal) => s.pmb.getSayaPendaftaranByIdUjian(id!, {}, { signal, headers: { 'X-Perangkat': idPerangkatCbt() } }) as never, {
    enabled: !!id && aktif,
    staleTime: 10_000,
  });
  useBerkala(q.refetch, 30_000, !!id && aktif);
  return q;
}
export function useNotifikasiPendaftarPmb() {
  const q = useSiakadQuery<NotifikasiPendaftarPmb[]>(['pmb-saya', 'notifikasi'], (s, signal) => s.pmb.getSayaNotifikasi({ per_page: 50 }, { signal }) as never, { staleTime: 30_000 });
  useBerkala(q.refetch, 60_000);
  return q;
}
/** Segarkan semua data pendaftar (daftar, detail, tagihan, ujian) setelah perubahan. */
export const segarkanPendaftarPmb = () => {
  invalidateSiakad('pmb-saya');
  invalidateSiakad('pmb-pendaftaran');
  invalidateSiakad('pmb-ujian');
};

// ================================================================ Pendaftaran aktif
interface KonteksPendaftar {
  daftar: PendaftaranRingkasPmb[];
  memuatDaftar: boolean;
  /** Pendaftaran yang sedang dipakai: pilihan pengguna, atau yang terbaru dan belum mundur. */
  aktif: PendaftaranRingkasPmb | null;
  detail: PendaftaranPmb | undefined;
  memuatDetail: boolean;
  galat: Error | null;
  pilih: (id: string) => void;
}
const PendaftarCtx = React.createContext<KonteksPendaftar | null>(null);
const SIMPAN_AKTIF = 'pmb.pendaftaran-aktif';

/** Simpan pendaftaran aktif (satu akun boleh mendaftar di beberapa gelombang). */
export function PendaftaranAktifPmbProvider({ children }: { children: React.ReactNode }) {
  const q = useDaftarPendaftaranPmb();
  const daftar = React.useMemo(() => q.data ?? [], [q.data]);
  const [dipilih, setDipilih] = React.useState<string | null>(() => {
    try {
      return localStorage.getItem(SIMPAN_AKTIF);
    } catch {
      return null;
    }
  });
  const aktif = React.useMemo(() => {
    if (!daftar.length) return null;
    return daftar.find((x) => x.id === dipilih) ?? [...daftar].sort((a, b) => Number(a.status === 'mengundurkan_diri') - Number(b.status === 'mengundurkan_diri') || b.dibuat_at.localeCompare(a.dibuat_at))[0];
  }, [daftar, dipilih]);
  const d = usePendaftaranPmb(aktif?.id);
  const pilih = React.useCallback((id: string) => {
    setDipilih(id);
    try {
      localStorage.setItem(SIMPAN_AKTIF, id);
    } catch {
      /* abaikan */
    }
  }, []);
  const nilai = React.useMemo(
    () => ({ daftar, memuatDaftar: q.loading, aktif, detail: d.data, memuatDetail: d.loading, galat: q.error ?? d.error, pilih }),
    [daftar, q.loading, q.error, aktif, d.data, d.loading, d.error, pilih],
  );
  return <PendaftarCtx.Provider value={nilai}>{children}</PendaftarCtx.Provider>;
}
/** Pendaftaran PMB yang sedang dipilih calon mahasiswa beserta daftar pendaftarannya, dari provider dasbor maba. */
export function usePendaftaranAktifPmb(): KonteksPendaftar {
  const c = React.useContext(PendaftarCtx);
  if (!c) throw new Error('usePendaftaranAktifPmb harus di dalam <PendaftaranAktifPmbProvider>.');
  return c;
}

/** Pilihan pendaftaran aktif (tampil bila lebih dari satu). */
export function PemilihPendaftaranPmb() {
  const { daftar, aktif, pilih } = usePendaftaranAktifPmb();
  if (daftar.length < 2) return null;
  return (
    <div className="u-pmb-pemilih">
      <span>Pendaftaran</span>
      <Select<string>
        size="sm"
        aria-label="Pilih pendaftaran"
        value={aktif?.id != null ? String(aktif.id) : null}
        onValueChange={(v) => v && pilih(v)}
        options={daftar.map((p) => ({ value: String(p.id), label: `${p.gelombang.nama}${p.no_pmb ? ` · ${p.no_pmb}` : ''}` }))}
      />
    </div>
  );
}

// ================================================================ Bantuan tampilan
function Memuat({ tinggi = 280 }: { tinggi?: number }) {
  return <Skeleton height={tinggi} />;
}
function Galat({ e, ulang }: { e: unknown; ulang?: () => void }) {
  return (
    <Alert
      variant="danger"
      actions={
        ulang ? (
          <Button size="sm" variant="outline" onClick={ulang}>
            <RefreshCw aria-hidden /> Coba lagi
          </Button>
        ) : undefined
      }
    >
      {pesanGalat(e)}
    </Alert>
  );
}
function SalinTeks({ teks }: { teks: string }) {
  const [ok, setOk] = React.useState(false);
  return (
    <Button
      size="xs"
      variant="ghost"
      onClick={() =>
        void navigator.clipboard?.writeText(teks).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        })
      }
    >
      {ok ? <Check aria-hidden /> : <Copy aria-hidden />} {ok ? 'Tersalin' : 'Salin'}
    </Button>
  );
}
function KodeQr({ teks, ukuran }: { teks: string; ukuran: number }) {
  const { renderQr } = usePmb();
  if (renderQr) return <>{renderQr(teks, ukuran)}</>;
  return (
    <div className="u-pmb-qr-teks" style={{ width: ukuran }}>
      <QrCode aria-hidden />
      <code>{teks}</code>
    </div>
  );
}

// ================================================================ Verifikasi email
/** Pengingat verifikasi email + tombol kirim ulang. `onKirimUlang` memanggil BFF/SSO aplikasi. */
export function BannerVerifikasiEmailPmb({ email, onKirimUlang }: { email: string; onKirimUlang: () => Promise<unknown> }) {
  const [proses, setProses] = React.useState(false);
  const [terkirim, setTerkirim] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  return (
    <Alert
      variant="warning"
      icon={<MailWarning aria-hidden />}
      title="Verifikasi email Anda"
      actions={
        <Button
          size="sm"
          variant="outline"
          loading={proses}
          disabled={terkirim}
          onClick={async () => {
            setProses(true);
            setGalat(null);
            try {
              await onKirimUlang();
              setTerkirim(true);
            } catch (e) {
              setGalat(pesanGalat(e));
            } finally {
              setProses(false);
            }
          }}
        >
          {terkirim ? 'Terkirim' : 'Kirim ulang'}
        </Button>
      }
    >
      Kami sudah mengirim tautan verifikasi ke <b>{email}</b>. Formulir pendaftaran bisa diisi setelah email terverifikasi.
      {galat && <span className="u-pmb-galat-kecil"> {galat}</span>}
    </Alert>
  );
}

// ================================================================ Dasbor
function aksiTahap(kode: string, rute: ReturnType<typeof usePmb>['rute']): { label: string; href: string } | null {
  switch (kode) {
    case 'mengisi_formulir':
    case 'perlu_perbaikan':
      return { label: 'Lengkapi formulir', href: rute.formulir() };
    case 'menunggu_pembayaran':
      return { label: 'Bayar biaya pendaftaran', href: rute.pembayaran };
    case 'seleksi':
      return { label: 'Lihat jadwal & ujian', href: rute.ujian };
    case 'lulus_seleksi':
      return { label: 'Daftar ulang sekarang', href: rute.hasil };
    case 'diterima':
    case 'tidak_lulus':
    case 'menunggu_pengumuman':
      return { label: 'Lihat hasil seleksi', href: rute.hasil };
    default:
      return null;
  }
}

/** Kartu tahap pendaftaran: gelombang, status, nomor, aksi utama, dan penunjuk enam langkah. */
export function KartuTahapPmb({ p }: { p: PendaftaranPmb }) {
  const { rute } = usePmb();
  const i = indeksTahapPmb(p.tahap.kode);
  const aksi = aksiTahap(p.tahap.kode, rute);
  const berhenti = p.status === 'ditolak' || p.status === 'mengundurkan_diri';
  return (
    <section className="u-pmb-tahap">
      <div className="u-pmb-tahap-kepala">
        <Text size="xs" className="u-pmb-tahap-gel">
          {p.gelombang.nama}
          {p.gelombang.jalur ? ` · Jalur ${p.gelombang.jalur}` : ''}
        </Text>
        <Cluster gap={3}>
          <h2>{p.tahap.label}</h2>
          <Badge variant={VARIAN_STATUS_PMB[p.status] ?? 'neutral'}>{LABEL_STATUS_PMB[p.status] ?? p.status}</Badge>
        </Cluster>
        <Cluster gap={4} className="u-pmb-tahap-meta">
          <span>
            No. pendaftaran: <b>{p.no_pmb ?? 'belum ada (diajukan dulu)'}</b>
          </span>
          {p.nomor_peserta && (
            <span>
              No. peserta: <b>{p.nomor_peserta}</b>
            </span>
          )}
          {p.diajukan_at && <span>Diajukan {tanggalPmb(p.diajukan_at)}</span>}
        </Cluster>
        {aksi && !berhenti && (
          <Button variant="secondary" render={<TautanPmb href={aksi.href} />}>
            {aksi.label} <ArrowRight aria-hidden />
          </Button>
        )}
      </div>
      <div className="u-pmb-tahap-isi">
        {berhenti ? (
          <Alert variant="danger" icon={<XCircle aria-hidden />}>
            {p.status === 'ditolak' ? 'Pendaftaran ini ditolak panitia.' : 'Anda mengundurkan diri dari pendaftaran ini.'}
            {p.catatan_verifikasi && <> Catatan: {p.catatan_verifikasi}</>}
          </Alert>
        ) : p.tahap.kode === 'diterima' ? (
          <Alert variant="success" icon={<PartyPopper aria-hidden />}>
            Selamat, Anda sudah resmi menjadi mahasiswa baru.
          </Alert>
        ) : (
          <Stepper steps={LANGKAH_PMB.map((l, n) => ({ ...l, error: n === 0 && p.status === 'perlu_perbaikan' }))} current={i} className="u-pmb-tahap-stepper" />
        )}
        {p.status === 'perlu_perbaikan' && p.catatan_verifikasi && (
          <Alert variant="warning" title="Catatan panitia">
            {p.catatan_verifikasi}
          </Alert>
        )}
      </div>
    </section>
  );
}

/** Isian/berkas yang masih kurang sebelum pendaftaran bisa diajukan. */
export function DaftarTugasPmb({ p }: { p: PendaftaranPmb }) {
  const { rute } = usePmb();
  if (!bisaDiubah(p)) return null;
  const kurang = Object.keys(Array.isArray(p.kelengkapan) ? {} : (p.kelengkapan ?? {}));
  const total = 16 + p.syarat_berkas.filter((s) => s.wajib).length;
  const selesai = Math.max(0, total - kurang.length);
  const href = (k: string) => {
    const l = letakKelengkapanPmb(k);
    return l.berkas ? rute.berkas : rute.formulir(l.langkah);
  };
  return (
    <Card>
      <CardHeader title="Yang perlu dilengkapi" description={kurang.length ? `${kurang.length} isian lagi sebelum bisa diajukan` : 'Semua isian wajib sudah lengkap'} />
      <CardContent>
        <Stack gap={4}>
          <Progress value={selesai} max={total} tone={kurang.length ? 'primary' : 'success'} />
          {kurang.length === 0 ? (
            <Button variant="soft" fullWidth render={<TautanPmb href={rute.formulir('tinjau')} />}>
              <CheckCircle2 aria-hidden /> Tinjau dan ajukan pendaftaran
            </Button>
          ) : (
            <ul className="u-pmb-tugas">
              {kurang.slice(0, 8).map((k) => (
                <li key={k}>
                  <TautanPmb href={href(k)}>
                    <Circle aria-hidden /> {labelKelengkapanPmb(k)} <ChevronRight aria-hidden />
                  </TautanPmb>
                </li>
              ))}
              {kurang.length > 8 && (
                <li>
                  <Text size="xs" tone="muted">
                    dan {kurang.length - 8} lainnya
                  </Text>
                </li>
              )}
            </ul>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

/** Ringkasan tagihan pendaftar. */
export function RingkasTagihanPmb({ tagihan }: { tagihan: TagihanPmb[] }) {
  const { rute } = usePmb();
  const aktif = tagihan.filter((t) => t.status !== 'batal');
  return (
    <Card>
      <CardHeader title="Tagihan" action={<TautanPmb href={rute.pembayaran} className="u-pmb-tautan">Semua</TautanPmb>} />
      <CardContent>
        {aktif.length === 0 ? (
          <Empty icon={<CreditCard aria-hidden />} title="Belum ada tagihan" description="Tagihan biaya pendaftaran muncul setelah formulir diajukan." />
        ) : (
          <ul className="u-pmb-baris">
            {aktif.map((t) => (
              <li key={t.id}>
                <span>
                  <strong>{t.keterangan ?? (t.jenis === 'formulir' ? 'Biaya pendaftaran' : 'Daftar ulang')}</strong>
                  <small>{t.status === 'lunas' ? `Lunas ${tanggalPmb(t.lunas_at)}` : t.kedaluwarsa_at ? `Bayar sebelum ${tanggalPmb(t.kedaluwarsa_at)}` : t.nomor}</small>
                </span>
                <span className="u-pmb-baris-kanan">
                  <strong>{formatRupiah(t.total)}</strong>
                  <Badge variant={VARIAN_STATUS_PMB[t.status] ?? 'neutral'}>{LABEL_TAGIHAN_PMB[t.status] ?? t.status}</Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Jadwal tes yang sudah ditetapkan panitia. */
export function JadwalTesPendaftarPmb({ jadwal }: { jadwal: JadwalTesPmb[] }) {
  const { rute } = usePmb();
  return (
    <Card>
      <CardHeader title="Jadwal tes" action={<TautanPmb href={rute.ujian} className="u-pmb-tautan">Detail</TautanPmb>} />
      <CardContent>
        {jadwal.length === 0 ? (
          <Empty icon={<CalendarClock aria-hidden />} title="Belum dijadwalkan" description="Panitia akan menempatkan Anda di sesi tes setelah pembayaran dan verifikasi." />
        ) : (
          <ul className="u-pmb-baris">
            {jadwal.map((j) => {
              const d = new Date(j.tanggal);
              return (
                <li key={j.sesi_id}>
                  <span className="u-pmb-agenda-tgl">
                    <strong>{d.getDate()}</strong>
                    <small>{d.toLocaleDateString('id-ID', { month: 'short' })}</small>
                  </span>
                  <span>
                    <strong>{j.nama}</strong>
                    <small>
                      {tanggalPmb(j.tanggal)} · {jam(j.mulai)}–{jam(j.selesai)}
                    </small>
                    <small>
                      {j.tautan ? (
                        <>
                          <Video aria-hidden /> Daring
                        </>
                      ) : (
                        <>
                          <MapPin aria-hidden /> {j.ruang_nama ?? j.lokasi ?? '-'}
                          {j.nomor_kursi && ` · kursi ${j.nomor_kursi}`}
                        </>
                      )}
                    </small>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Ajakan mulai pendaftaran bagi akun yang belum punya pendaftaran. */
export function MulaiPendaftaranPmb({ nama }: { nama: string }) {
  const { rute } = usePmb();
  return (
    <section className="u-pmb-mulai">
      <GraduationCap aria-hidden />
      <h2>Halo, {nama.split(' ')[0]}! Mulai pendaftaranmu.</h2>
      <p>Pilih gelombang dan jalur yang sedang dibuka. Formulir bisa diisi bertahap dan disimpan sebagai draf.</p>
      <Button variant="secondary" render={<TautanPmb href={rute.pilihGelombang} />}>
        Pilih gelombang <ArrowRight aria-hidden />
      </Button>
    </section>
  );
}

/** Beranda dasbor pendaftar: tahap, angka singkat, tugas, tagihan, jadwal tes. */
export function DasborPendaftarPmb({ nama, banner }: { nama: string; banner?: React.ReactNode }) {
  const { rute } = usePmb();
  const { daftar, memuatDaftar, detail, memuatDetail, galat } = usePendaftaranAktifPmb();
  if (memuatDaftar || (daftar.length > 0 && memuatDetail && !detail))
    return (
      <Stack gap={4}>
        <Memuat tinggi={200} />
        <Grid cols={2} gap={4}>
          <Memuat tinggi={220} />
          <Memuat tinggi={220} />
        </Grid>
      </Stack>
    );
  if (!daftar.length || !detail)
    return (
      <Stack gap={4}>
        {banner}
        {galat ? <Galat e={galat} /> : <MulaiPendaftaranPmb nama={nama} />}
      </Stack>
    );
  const belumLunas = detail.tagihan.filter((t) => t.status === 'belum_bayar' || t.status === 'menunggu_konfirmasi').reduce((a, t) => a + t.total, 0);
  return (
    <Stack gap={6}>
      {banner}
      <PageHeader
        eyebrow="Selamat datang,"
        title={nama}
        actions={
          <Button variant="ghost" size="sm" render={<TautanPmb href={rute.pilihGelombang} />}>
            <Plus aria-hidden /> Daftar gelombang lain
          </Button>
        }
      />
      <KartuTahapPmb p={detail} />
      <Grid cols={3} gap={4}>
        <StatCard label="Berkas diunggah" value={`${detail.berkas.length}/${detail.syarat_berkas.length}`} icon={<FileUp aria-hidden />} tone="info" href={rute.berkas} />
        <StatCard label="Tagihan belum lunas" value={formatRupiah(belumLunas)} icon={<CreditCard aria-hidden />} tone="warning" href={rute.pembayaran} />
        <StatCard label="Jadwal tes" value={detail.jadwal_tes.length} icon={<MonitorCheck aria-hidden />} tone="primary" href={rute.ujian} />
      </Grid>
      <Grid cols={2} gap={6}>
        <DaftarTugasPmb p={detail} />
        <RingkasTagihanPmb tagihan={detail.tagihan} />
        <JadwalTesPendaftarPmb jadwal={detail.jadwal_tes} />
      </Grid>
    </Stack>
  );
}

// ================================================================ Pilih gelombang
/** Pilih gelombang yang sedang dibuka lalu buat pendaftaran (draf). */
export function PilihGelombangPendaftarPmb({ awal, onDibuat, banner }: { awal?: number | null; onDibuat?: (id: string) => void; banner?: React.ReactNode }) {
  const siakad = useSiakad();
  const q = useGelombangPmb();
  const { daftar, pilih: pakai } = usePendaftaranAktifPmb();
  const [pilih, setPilih] = React.useState<number | null>(awal ?? null);
  const [proses, setProses] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const sudah = new Set(daftar.filter((p) => p.status !== 'mengundurkan_diri').map((p) => p.gelombang.id));
  const data = urutkanGelombang(q.data ?? []);
  const mulai = async () => {
    if (!pilih) return;
    setProses(true);
    setGalat(null);
    try {
      const r = await siakad.pmb.postSayaPendaftaran({ gelombang_id: pilih } as never);
      const id = (r.data as { id: string }).id;
      segarkanPendaftarPmb();
      pakai(id);
      onDibuat?.(id);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setProses(false);
    }
  };
  return (
    <Stack gap={5}>
      {banner}
      <PageHeader title="Pilih gelombang pendaftaran" description="Satu akun bisa mendaftar di beberapa gelombang atau jalur. Pilih yang sesuai dengan Anda." />
      {q.loading ? (
        <Grid cols={2} gap={4}>
          <Memuat tinggi={180} />
          <Memuat tinggi={180} />
        </Grid>
      ) : q.error ? (
        <Galat e={q.error} ulang={q.refetch} />
      ) : !data.length ? (
        <Empty bordered icon={<CalendarDays aria-hidden />} title="Belum ada gelombang yang dibuka" description="Pantau pengumuman PMB untuk jadwal gelombang berikutnya." />
      ) : (
        <>
          <Grid min={300} gap={4}>
            {data.map((g) => {
              const k = keadaanGelombang(g);
              const terdaftar = sudah.has(g.id);
              const bisa = g.sedang_buka && !terdaftar;
              return (
                <button key={g.id} type="button" className="u-pmb-pilih-gel" disabled={!bisa} aria-pressed={pilih === g.id} onClick={() => setPilih(g.id)}>
                  {pilih === g.id && <CheckCircle2 aria-hidden className="u-pmb-pilih-cek" />}
                  <Cluster gap={2}>
                    <Badge variant={k.variant} dot>
                      {k.label}
                    </Badge>
                    {terdaftar && <Badge variant="info">Sudah terdaftar</Badge>}
                  </Cluster>
                  <strong>{g.nama}</strong>
                  <small>
                    Jalur {g.jalur?.nama ?? '-'} · {labelTahunPmb(g.tahun_akademik)}
                  </small>
                  <span className="u-pmb-pilih-meta">
                    <span>
                      <CalendarDays aria-hidden /> {rentangPmb(g.pendaftaran.mulai, g.pendaftaran.selesai)}
                    </span>
                    <span>
                      <Wallet aria-hidden /> {g.biaya_pendaftaran ? formatRupiah(g.biaya_pendaftaran) : 'Gratis'}
                    </span>
                    <span>
                      <ClipboardCheck aria-hidden /> {g.perlu_tes ? 'Dengan tes seleksi' : 'Tanpa tes'} · maks. {g.maks_pilihan} pilihan prodi
                    </span>
                  </span>
                </button>
              );
            })}
          </Grid>
          {galat && <Alert variant="danger">{galat}</Alert>}
          <div className="u-pmb-aksi-lekat">
            <Button size="lg" disabled={!pilih} loading={proses} onClick={() => void mulai()}>
              Daftar di gelombang ini
            </Button>
          </div>
        </>
      )}
    </Stack>
  );
}

// ================================================================ Formulir
/** Halaman formulir untuk pendaftaran aktif (wizard lengkap). */
export function FormulirPendaftarPmb({ langkah, onLangkahChange, kodeReferal, kunci, kontak, banner }: { langkah?: string | null; onLangkahChange?: (id: string) => void; kodeReferal?: string | null; kunci?: React.ReactNode; kontak?: React.ReactNode; banner?: React.ReactNode }) {
  const { aktif, memuatDaftar } = usePendaftaranAktifPmb();
  if (memuatDaftar) return <Memuat tinggi={420} />;
  if (!aktif) return <MulaiPendaftaranPmb nama="" />;
  return (
    <Stack gap={5}>
      {banner}
      <PageHeader title="Formulir pendaftaran" description={`${aktif.gelombang.nama}${aktif.no_pmb ? ` · No. ${aktif.no_pmb}` : ''}`} />
      <WizardPendaftaranPmb key={aktif.id} id={aktif.id} langkah={langkah} onLangkahChange={onLangkahChange} kodeReferal={kodeReferal} kunci={kunci} kontak={kontak} onDiajukan={() => segarkanPendaftarPmb()} />
    </Stack>
  );
}

// ================================================================ Berkas
const STATUS_BERKAS = {
  menunggu: { label: 'Menunggu diperiksa', variant: 'info' as const },
  valid: { label: 'Valid', variant: 'success' as const },
  ditolak: { label: 'Ditolak, unggah ulang', variant: 'danger' as const },
};
/** Satu syarat berkas: status, unggah/ganti, lihat, hapus. */
export function KartuSyaratBerkasPmb({ pendaftaranId, syarat, berkas, kunci }: { pendaftaranId: string; syarat: SyaratBerkasPmb; berkas?: BerkasPendaftarPmb; kunci: boolean }) {
  const siakad = useSiakad();
  const { urlBerkas } = usePmb();
  const [proses, setProses] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const ekstensi = (Array.isArray(syarat.ekstensi) ? syarat.ekstensi : String(syarat.ekstensi).split(',')).map((e) => e.trim().toLowerCase()).filter(Boolean);
  const st = berkas ? STATUS_BERKAS[berkas.status] : null;
  const bolehGanti = !kunci && (!berkas || berkas.status !== 'valid');
  const unggah = async (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (ekstensi.length && !ekstensi.includes(ext)) return setGalat(`Format tidak sesuai. Gunakan ${ekstensi.join(', ').toUpperCase()}.`);
    if (f.size > syarat.maks_kb * 1024) return setGalat(`Berkas terlalu besar. Maksimal ${formatBytes(syarat.maks_kb * 1024)}.`);
    setProses(true);
    setGalat(null);
    try {
      await siakad.pmb.postSayaPendaftaranByIdBerkas(pendaftaranId, { jenis: syarat.jenis, berkas: f } as never);
      segarkanPendaftarPmb();
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setProses(false);
    }
  };
  const hapus = async () => {
    if (!berkas) return;
    setProses(true);
    try {
      await siakad.pmb.deleteSayaPendaftaranByIdBerkasByBerkas(pendaftaranId, berkas.id);
      segarkanPendaftarPmb();
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setProses(false);
    }
  };
  const url = berkas ? (urlBerkas ?? ((p: string) => `/bff/saya${p.replace('/v1/pmb/saya', '')}`))(`/v1/pmb/saya/pendaftaran/${pendaftaranId}/berkas/${berkas.id}`) : null;
  return (
    <Card className="u-pmb-syarat">
      <CardContent>
        <Stack gap={3}>
          <Cluster justify="between" align="start" wrap={false}>
            <div>
              <Text weight="semibold">
                {syarat.nama} {syarat.wajib ? <span className="u-pmb-wajib-tanda">*</span> : <Text as="span" size="xs" tone="muted">(opsional)</Text>}
              </Text>
              <Text size="xs" tone="muted">
                {ekstensi.join(', ').toUpperCase()} · maks. {formatBytes(syarat.maks_kb * 1024)}
              </Text>
              {syarat.keterangan && (
                <Text size="xs" tone="muted">
                  {syarat.keterangan}
                </Text>
              )}
            </div>
            {st ? (
              <Badge variant={st.variant} dot>
                {st.label}
              </Badge>
            ) : (
              <Badge variant={syarat.wajib ? 'warning' : 'neutral'}>Belum diunggah</Badge>
            )}
          </Cluster>
          {berkas && (
            <div className="u-pmb-berkas">
              <FileUp aria-hidden />
              <span>
                <strong>{berkas.nama_asli}</strong>
                <small>
                  {formatBytes(berkas.ukuran)} · {tanggalPmb(berkas.diunggah_at)}
                </small>
              </span>
              {url && (
                <Button size="sm" variant="ghost" iconOnly aria-label="Lihat berkas" render={<a href={url} target="_blank" rel="noreferrer" />}>
                  <Eye />
                </Button>
              )}
              {bolehGanti && (
                <Button size="sm" variant="ghost" iconOnly aria-label="Hapus berkas" disabled={proses} onClick={() => void hapus()}>
                  <Trash2 />
                </Button>
              )}
            </div>
          )}
          {berkas?.status === 'ditolak' && berkas.catatan && <Alert variant="danger">Catatan panitia: {berkas.catatan}</Alert>}
          {galat && <Alert variant="danger">{galat}</Alert>}
          {bolehGanti && (
            <>
              <div>
                <TombolPilihBerkas size="sm" variant={berkas ? 'outline' : 'primary'} loading={proses} accept={ekstensi.map((e) => `.${e}`).join(',')} onFiles={(f) => void unggah(f[0])}>
                  {berkas ? <RefreshCw aria-hidden /> : <FileUp aria-hidden />} {berkas ? 'Ganti berkas' : 'Unggah'}
                </TombolPilihBerkas>
              </div>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

/** Halaman berkas persyaratan sesuai jalur. `kunci` = email belum diverifikasi. */
export function BerkasPendaftarPmb({ kunci: kunciLuar, banner }: { kunci?: boolean; banner?: React.ReactNode }) {
  const { aktif, detail, memuatDaftar, memuatDetail, galat } = usePendaftaranAktifPmb();
  if (memuatDaftar || (memuatDetail && !detail)) return <Memuat tinggi={380} />;
  if (!aktif) return <MulaiPendaftaranPmb nama="" />;
  if (!detail) return <Galat e={galat} />;
  const kunci = !!kunciLuar || !['draf', 'perlu_perbaikan', 'diajukan'].includes(detail.status);
  const terbaru = (jenis: string) => detail.berkas.filter((b) => b.jenis === jenis).sort((a, b) => b.diunggah_at.localeCompare(a.diunggah_at))[0];
  const wajib = detail.syarat_berkas.filter((s) => s.wajib);
  const lengkap = wajib.filter((s) => terbaru(s.jenis)).length;
  return (
    <Stack gap={5}>
      {banner}
      <PageHeader title="Berkas persyaratan" description="Unggah dokumen yang jelas dan terbaca. Panitia akan memeriksa setiap berkas." />
      {detail.syarat_berkas.length === 0 ? (
        <Empty bordered icon={<FileUp aria-hidden />} title="Tidak ada berkas yang diminta" />
      ) : (
        <>
          <Card>
            <CardContent>
              <Progress value={lengkap} max={wajib.length || 1} label={`${lengkap} dari ${wajib.length} berkas wajib terunggah`} tone={lengkap === wajib.length ? 'success' : 'primary'} />
            </CardContent>
          </Card>
          {detail.berkas.some((b) => b.status === 'ditolak') && <Alert variant="warning">Ada berkas yang ditolak panitia. Unggah ulang berkas tersebut.</Alert>}
          <Grid cols={2} gap={4}>
            {detail.syarat_berkas.map((s) => (
              <KartuSyaratBerkasPmb key={s.jenis} pendaftaranId={detail.id} syarat={s} berkas={terbaru(s.jenis)} kunci={kunci} />
            ))}
          </Grid>
        </>
      )}
    </Stack>
  );
}

// ================================================================ Pembayaran
const LABEL_METODE: Record<string, string> = { va: 'Virtual account', qris: 'QRIS', checkout: 'Halaman pembayaran' };
const SUMBER_BAYAR: Record<string, string> = { unggah_bukti: 'Bukti transfer', callback: 'Pembayaran online / bank', manual: 'Dicatat petugas' };
const STATUS_BAYAR: Record<string, string> = { menunggu: 'Diperiksa', diterima: 'Diterima', ditolak: 'Ditolak' };

interface OpsiBayar {
  kunci: string;
  penyedia: string;
  metode: 'checkout' | 'va' | 'qris';
  kanal: string | null;
  label: string;
  sub: string;
}
function PilihMetodeBayar({ pendaftaranId, tagihan, metode, onSelesai }: { pendaftaranId: string; tagihan: number; metode: MetodeBayarPmb[]; onSelesai: () => void }) {
  const siakad = useSiakad();
  const { rute } = usePmb();
  const [pilih, setPilih] = React.useState('');
  const [proses, setProses] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const opsi = React.useMemo<OpsiBayar[]>(() => {
    const out: OpsiBayar[] = [];
    for (const p of [...metode].sort((a, b) => Number(b.utama) - Number(a.utama)))
      for (const m of p.metode) {
        if (m.metode === 'va') m.kanal.forEach((k) => out.push({ kunci: `${p.penyedia}|va|${k}`, penyedia: p.penyedia, metode: 'va', kanal: k, label: `Virtual account ${k.toUpperCase()}`, sub: 'Transfer dari m-banking / ATM' }));
        else out.push({ kunci: `${p.penyedia}|${m.metode}`, penyedia: p.penyedia, metode: m.metode, kanal: null, label: m.metode === 'qris' ? 'QRIS' : 'Metode lain', sub: m.keterangan ?? (m.metode === 'qris' ? 'Semua bank & e-wallet' : `Kartu, e-wallet, gerai (${p.nama})`) });
      }
    return out.filter((o, i, a) => a.findIndex((x) => x.metode === o.metode && x.kanal === o.kanal) === i);
  }, [metode]);
  const bayar = async () => {
    const o = opsi.find((x) => x.kunci === pilih);
    if (!o) return;
    setProses(true);
    setGalat(null);
    try {
      await siakad.pmb.postSayaPendaftaranByIdTagihanByTagihanBayar(pendaftaranId, tagihan, { penyedia: o.penyedia, metode: o.metode, kanal: o.kanal ?? undefined, url_kembali: `${window.location.origin}${rute.pembayaran}` } as never);
      onSelesai();
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setProses(false);
    }
  };
  const IKON = { va: Building2, qris: QrCode, checkout: CreditCard };
  return (
    <Stack gap={3}>
      <Text weight="medium" size="sm">
        Bayar online
      </Text>
      <Grid min={220} gap={2}>
        {opsi.map((o) => {
          const I = IKON[o.metode];
          return (
            <button key={o.kunci} type="button" className="u-pmb-metode" aria-pressed={pilih === o.kunci} onClick={() => setPilih(o.kunci)}>
              <span className="u-pmb-metode-ikon">
                <I aria-hidden />
              </span>
              <span>
                <strong>{o.label}</strong>
                <small>{o.sub}</small>
              </span>
            </button>
          );
        })}
      </Grid>
      {galat && <Alert variant="danger">{galat}</Alert>}
      <div>
        <Button disabled={!pilih} loading={proses} onClick={() => void bayar()}>
          Bayar sekarang
        </Button>
      </div>
    </Stack>
  );
}

function TransaksiAktif({ pendaftaranId, tagihan, trx, onSegarkan }: { pendaftaranId: string; tagihan: number; trx: TransaksiPmb; onSegarkan: () => void }) {
  const siakad = useSiakad();
  const [batal, setBatal] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  return (
    <div className="u-pmb-trx">
      <Cluster gap={2}>
        <Text weight="semibold">
          {LABEL_METODE[trx.metode] ?? trx.metode}
          {trx.kanal ? ` ${trx.kanal.toUpperCase()}` : ''}
        </Text>
        <Badge variant="info" dot>
          Menunggu pembayaran
        </Badge>
        {trx.kedaluwarsa_at && (
          <Text size="xs" tone="muted" className="u-pmb-trx-batas">
            Berlaku sampai {waktu(trx.kedaluwarsa_at)}
          </Text>
        )}
      </Cluster>
      <Text size="sm" tone="muted">
        Jumlah: <b>{formatRupiah(trx.jumlah)}</b> · Order {trx.order_id}
      </Text>
      {trx.nomor_va && (
        <div className="u-pmb-trx-kotak">
          <Text size="xs" tone="muted">
            Nomor virtual account {trx.kanal?.toUpperCase()}
          </Text>
          <Cluster gap={2}>
            <span className="u-pmb-va">{trx.nomor_va}</span>
            <SalinTeks teks={trx.nomor_va} />
          </Cluster>
          <Text size="xs" tone="muted">
            Bayar lewat m-banking, ATM, atau teller {trx.kanal?.toUpperCase()}. Status berubah otomatis setelah pembayaran diterima.
          </Text>
        </div>
      )}
      {trx.qr_string && (
        <div className="u-pmb-trx-kotak" data-tengah>
          <KodeQr teks={trx.qr_string} ukuran={220} />
          <Text size="xs" tone="muted">
            Pindai dengan aplikasi bank atau dompet digital yang mendukung QRIS.
          </Text>
        </div>
      )}
      {trx.url_bayar && !trx.nomor_va && !trx.qr_string && (
        <div>
          <Button render={<a href={trx.url_bayar} target="_blank" rel="noreferrer" />}>
            Lanjutkan ke halaman pembayaran <ExternalLink aria-hidden />
          </Button>
        </div>
      )}
      {galat && <Alert variant="danger">{galat}</Alert>}
      <Cluster gap={2}>
        <Button size="sm" variant="outline" onClick={onSegarkan}>
          <RefreshCw aria-hidden /> Cek status
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setBatal(true)}>
          <X aria-hidden /> Ganti metode
        </Button>
      </Cluster>
      <ConfirmDialog
        open={batal}
        onOpenChange={setBatal}
        title="Batalkan transaksi ini?"
        description="Nomor VA/QRIS ini tidak bisa dipakai lagi. Jangan batalkan bila Anda sudah membayar."
        confirmLabel="Batalkan transaksi"
        onConfirm={async () => {
          try {
            await siakad.pmb.deleteSayaPendaftaranByIdTagihanByTagihanBayar(pendaftaranId, tagihan);
            onSegarkan();
          } catch (e) {
            setGalat(pesanGalat(e));
          }
        }}
      />
    </div>
  );
}

function UnggahBukti({ open, onOpenChange, pendaftaranId, tagihan, onSelesai }: { open: boolean; onOpenChange: (o: boolean) => void; pendaftaranId: string; tagihan: TagihanPmb; onSelesai: () => void }) {
  const siakad = useSiakad();
  const [berkas, setBerkas] = React.useState<File | null>(null);
  const [jumlah, setJumlah] = React.useState(String(tagihan.total));
  const [tgl, setTgl] = React.useState<Date | null>(new Date());
  const [proses, setProses] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const kirim = async () => {
    if (!berkas) return;
    setProses(true);
    setGalat(null);
    try {
      await siakad.pmb.postSayaPendaftaranByIdTagihanByTagihanBukti(pendaftaranId, tagihan.id, { bukti: berkas, jumlah: Number(jumlah), tanggal_bayar: tgl ? toISODate(tgl) : undefined } as never);
      onSelesai();
      onOpenChange(false);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setProses(false);
    }
  };
  return (
    <Dialog
      side="right"
      open={open}
      onOpenChange={onOpenChange}
      title="Unggah bukti transfer"
      description={`${tagihan.keterangan ?? tagihan.nomor} · ${formatRupiah(tagihan.total)}`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button loading={proses} disabled={!berkas || !jumlah} onClick={() => void kirim()}>
            Kirim bukti
          </Button>
        </>
      }
    >
      <Stack gap={4}>
        {tagihan.nomor_va && (
          <Alert variant="neutral">
            Transfer ke nomor <b>{tagihan.nomor_va}</b>
            {tagihan.kanal ? ` (${tagihan.kanal})` : ''}.
          </Alert>
        )}
        <Field label="Foto / PDF bukti transfer" required description="JPG, PNG, atau PDF, maksimal 2 MB.">
          <IsianBerkas value={berkas} onValueChange={setBerkas} accept=".jpg,.jpeg,.png,.pdf" maxSize={2 * 1024 * 1024} info={false} />
        </Field>
        <Grid cols={2} gap={4}>
          <Field label="Jumlah ditransfer" required>
            <Input value={jumlah} onChange={(e) => setJumlah(e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
          </Field>
          <Field label="Tanggal transfer">
            <DatePicker value={tgl} onValueChange={setTgl} max={new Date()} />
          </Field>
        </Grid>
        {galat && <Alert variant="danger">{galat}</Alert>}
      </Stack>
    </Dialog>
  );
}

/** Satu tagihan: rincian, bayar online (VA/QRIS/checkout), unggah bukti, riwayat pembayaran. */
export function KartuTagihanPmb({ pendaftaranId, t, metode }: { pendaftaranId: string; t: TagihanPmb; metode: MetodeBayarPmb[] }) {
  const bisaBayar = t.status === 'belum_bayar' || t.status === 'kedaluwarsa';
  const online = bisaBayar && metode.length > 0;
  const trx = useTransaksiPmb(pendaftaranId, t.id, online);
  const [bukti, setBukti] = React.useState(false);
  const [kwitansi, setKwitansi] = React.useState(false);
  const segarkan = () => {
    trx.refetch();
    segarkanPendaftarPmb();
  };
  return (
    <Card className="u-pmb-tagihan">
      <CardHeader
        title={t.keterangan ?? (t.jenis === 'formulir' ? 'Biaya pendaftaran' : t.jenis === 'daftar_ulang' ? 'Biaya daftar ulang' : 'Tagihan')}
        description={`No. ${t.nomor} · dibuat ${tanggalPmb(t.dibuat_at)}${t.kedaluwarsa_at && bisaBayar ? ` · jatuh tempo ${waktu(t.kedaluwarsa_at)}` : ''}`}
        action={
          <div className="u-pmb-tagihan-jumlah">
            <strong>{formatRupiah(t.total)}</strong>
            {t.potongan > 0 && <s>{formatRupiah(t.nominal)}</s>}
            <Badge variant={VARIAN_STATUS_PMB[t.status] ?? 'neutral'} dot>
              {LABEL_TAGIHAN_PMB[t.status] ?? t.status}
            </Badge>
          </div>
        }
      />
      <CardContent>
        <Stack gap={5}>
          {t.status === 'lunas' && (
            <Alert variant="success" title={`Lunas pada ${waktu(t.lunas_at)}. Terima kasih.`}>
              <Button size="sm" variant="outline" onClick={() => setKwitansi(true)}>
                <Receipt aria-hidden /> Lihat & cetak kwitansi
              </Button>
            </Alert>
          )}
          <RincianPembayaran
            varian="lengkap"
            judul="Rincian pembayaran"
            rincian={[{ uraian: t.keterangan ?? (t.jenis === 'formulir' ? 'Biaya pendaftaran' : t.jenis === 'daftar_ulang' ? 'Biaya daftar ulang' : 'Tagihan'), nominal: t.nominal, potongan: t.potongan, subtotal: t.total }]}
            ringkasan={{
              dibayar: t.status === 'lunas' ? t.total : (t.pembayaran ?? []).filter((b) => b.status === 'diterima').reduce((a, b) => a + b.jumlah, 0),
            }}
            riwayat={(t.pembayaran ?? []).filter((b) => b.status === 'diterima').map((b) => ({ tanggal: b.dibayar_at ?? b.created_at, nomor: b.referensi ?? null, metode: SUMBER_BAYAR[b.sumber] ?? b.sumber, jumlah: b.jumlah }))}
            kanal={t.nomor_va ? `${t.kanal ? t.kanal.toUpperCase() + ' ' : ''}VA ${t.nomor_va}` : t.kanal}
            jatuhTempo={bisaBayar ? t.kedaluwarsa_at : null}
          />
          {t.status === 'menunggu_konfirmasi' && <Alert variant="info">Bukti pembayaran sudah dikirim dan sedang diperiksa petugas keuangan (biasanya 1×24 jam kerja).</Alert>}
          {online && (trx.data ? <TransaksiAktif pendaftaranId={pendaftaranId} tagihan={t.id} trx={trx.data} onSegarkan={segarkan} /> : !trx.loading && <PilihMetodeBayar pendaftaranId={pendaftaranId} tagihan={t.id} metode={metode} onSelesai={segarkan} />)}
          {bisaBayar && !trx.data && (
            <Stack gap={2} className={online ? 'u-pmb-garis-atas' : undefined}>
              <Text weight="medium" size="sm">
                {online ? 'Atau transfer manual' : 'Cara pembayaran'}
              </Text>
              <Text size="sm" tone="muted">
                {t.nomor_va ? (
                  <>
                    Transfer ke nomor virtual account <b>{t.nomor_va}</b>
                    {t.kanal ? ` (${t.kanal})` : ''}, lalu unggah buktinya.
                  </>
                ) : (
                  'Transfer ke rekening resmi PMB yang tercantum di pengumuman, lalu unggah bukti transfer.'
                )}
              </Text>
              <div>
                <Button size="sm" variant="outline" onClick={() => setBukti(true)}>
                  <Upload aria-hidden /> Unggah bukti transfer
                </Button>
              </div>
            </Stack>
          )}
          {!!t.pembayaran?.length && (
            <Stack gap={2}>
              <Text size="xs" weight="semibold" tone="muted" className="u-pmb-label-kecil">
                Riwayat pembayaran
              </Text>
              <ul className="u-pmb-baris">
                {t.pembayaran.map((b) => (
                  <li key={b.id}>
                    <span>
                      <strong>
                        {formatRupiah(b.jumlah)} · {SUMBER_BAYAR[b.sumber] ?? b.sumber}
                      </strong>
                      <small>
                        {waktu(b.dibayar_at ?? b.created_at)}
                        {b.catatan ? ` · ${b.catatan}` : ''}
                      </small>
                    </span>
                    <Badge variant={b.status === 'diterima' ? 'success' : b.status === 'ditolak' ? 'danger' : 'info'}>{STATUS_BAYAR[b.status] ?? b.status}</Badge>
                  </li>
                ))}
              </ul>
            </Stack>
          )}
        </Stack>
      </CardContent>
      {bisaBayar && <UnggahBukti open={bukti} onOpenChange={setBukti} pendaftaranId={pendaftaranId} tagihan={t} onSelesai={segarkan} />}
      {t.status === 'lunas' && (
        <Sheet open={kwitansi} onOpenChange={setKwitansi} size="xl" title={`Kwitansi ${t.nomor}`} description="Bukti Kas Masuk resmi Panitia PMB dengan QR verifikasi keaslian.">
          {kwitansi && <KwitansiResmi sumber={{ jenis: 'pmb-saya', pendaftaran: pendaftaranId, id: t.id }} catatCetak={false} />}
        </Sheet>
      )}
    </Card>
  );
}

/** Halaman pembayaran: semua tagihan pendaftaran aktif. */
export function PembayaranPendaftarPmb() {
  const { aktif, memuatDaftar } = usePendaftaranAktifPmb();
  const tagihan = useTagihanPmb(aktif?.id);
  const metode = useMetodeBayarPmb();
  if (memuatDaftar) return <Memuat />;
  if (!aktif) return <MulaiPendaftaranPmb nama="" />;
  const data = (tagihan.data ?? []).filter((t) => t.status !== 'batal');
  return (
    <Stack gap={5}>
      <PageHeader title="Pembayaran" description="Tagihan biaya pendaftaran dan daftar ulang." />
      {tagihan.loading && !tagihan.data ? (
        <Memuat />
      ) : tagihan.error ? (
        <Galat e={tagihan.error} ulang={tagihan.refetch} />
      ) : !data.length ? (
        <Empty bordered icon={<CreditCard aria-hidden />} title="Belum ada tagihan" description={aktif.no_pmb ? 'Tidak ada tagihan untuk pendaftaran ini.' : 'Tagihan biaya pendaftaran dibuat setelah formulir diajukan.'} />
      ) : (
        <>
          {data.map((t) => (
            <KartuTagihanPmb key={t.id} pendaftaranId={aktif.id} t={t} metode={metode.data ?? []} />
          ))}
          <Text size="xs" tone="muted">
            <ShieldCheck aria-hidden className="u-pmb-ikon-teks" /> Pembayaran hanya ke nomor VA/QRIS yang tampil di halaman ini atau rekening resmi kampus. Panitia tidak pernah meminta transfer ke rekening pribadi.
          </Text>
        </>
      )}
    </Stack>
  );
}

// ================================================================ Ujian
const STATUS_UJIAN: Record<UjianPendaftarPmb['status'], { label: string; variant: BadgeVariant }> = {
  terdaftar: { label: 'Belum dikerjakan', variant: 'warning' },
  mengerjakan: { label: 'Sedang dikerjakan', variant: 'info' },
  selesai: { label: 'Selesai', variant: 'success' },
  diskualifikasi: { label: 'Diskualifikasi', variant: 'danger' },
  tidak_hadir: { label: 'Tidak hadir', variant: 'neutral' },
};
const durasi = (d: number) => {
  const j = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);
  return `${j > 0 ? `${j}:` : ''}${String(m).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`;
};

function DialogToken({ u, pendaftaranId, onClose, onMulai }: { u: UjianPendaftarPmb | null; pendaftaranId: string; onClose: () => void; onMulai: (pesertaId: number) => void }) {
  const siakad = useSiakad();
  const [token, setToken] = React.useState('');
  const [galat, setGalat] = React.useState<string | null>(null);
  const [proses, setProses] = React.useState(false);
  const mulai = async () => {
    if (!u) return;
    setProses(true);
    setGalat(null);
    try {
      await siakad.pmb.postSayaPendaftaranByIdUjianByPesertaMulai(pendaftaranId, u.id, { token: token.trim().toUpperCase() } as never, { headers: { 'X-Perangkat': idPerangkatCbt() } });
      try {
        await document.documentElement.requestFullscreen?.();
      } catch {
        /* layar penuh tidak wajib */
      }
      invalidateSiakad('pmb-ujian');
      onMulai(u.id);
    } catch (e) {
      const d = (e as { details?: Record<string, unknown> }).details;
      setGalat(d?.token ? String(d.token) : pesanGalat(e));
    } finally {
      setProses(false);
    }
  };
  return (
    <Dialog
      open={!!u}
      onOpenChange={(o) => !o && onClose()}
      title="Mulai ujian"
      description={u?.ujian}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button loading={proses} disabled={token.trim().length < 4} onClick={() => void mulai()}>
            Mulai sekarang
          </Button>
        </>
      }
    >
      <Stack gap={4}>
        {u?.petunjuk && <Alert variant="neutral">{u.petunjuk}</Alert>}
        <ul className="u-pmb-aturan">
          <li>
            <ShieldAlert aria-hidden /> Waktu {u?.durasi_menit} menit berjalan sejak tombol mulai ditekan dan tidak bisa dihentikan.
          </li>
          <li>
            <ShieldAlert aria-hidden /> Jangan pindah tab atau aplikasi; setiap kejadian tercatat dan terlihat pengawas.
          </li>
          <li>
            <ShieldAlert aria-hidden /> Ujian terkunci di perangkat ini. Bila perangkat bermasalah, minta pengawas me-reset.
          </li>
        </ul>
        <Field label="Token ujian" error={galat ?? undefined} description="Token 6 karakter diberikan pengawas saat sesi dibuka.">
          <Input value={token} onChange={(e) => setToken(e.target.value.toUpperCase())} maxLength={10} autoFocus className="u-pmb-token" onKeyDown={(e) => e.key === 'Enter' && void mulai()} />
        </Field>
      </Stack>
    </Dialog>
  );
}

/** Halaman ujian: daftar ujian CBT (mulai dengan token, lanjutkan), jadwal tes, dan tautan kartu peserta. */
export function UjianPendaftarPmb({ onMulai }: { onMulai?: (pendaftaranId: string, pesertaId: number) => void }) {
  const { rute } = usePmb();
  const { aktif, detail, memuatDaftar, memuatDetail } = usePendaftaranAktifPmb();
  const ujian = useUjianPendaftarPmb(aktif?.id, !!aktif?.no_pmb);
  const [mulai, setMulai] = React.useState<UjianPendaftarPmb | null>(null);
  if (memuatDaftar || (memuatDetail && !detail)) return <Memuat />;
  if (!aktif || !detail) return <MulaiPendaftaranPmb nama="" />;
  const lunas = detail.tagihan.some((t) => t.jenis === 'formulir' && t.status === 'lunas') || !detail.tagihan.some((t) => t.jenis === 'formulir');
  const keRuang = (peserta: number) => (onMulai ? onMulai(aktif.id, peserta) : window.location.assign(rute.ruangUjian(aktif.id, peserta)));
  return (
    <Stack gap={5}>
      <PageHeader
        title="Ujian & jadwal tes"
        description="Ujian seleksi berbasis komputer (CBT) dikerjakan di sini saat sesi dibuka pengawas."
        actions={
          detail.no_pmb && lunas ? (
            <Button variant="outline" render={<TautanPmb href={rute.kartu} />}>
              <IdCard aria-hidden /> Kartu peserta
            </Button>
          ) : undefined
        }
      />
      {!detail.no_pmb ? (
        <Alert variant="info">Ujian dan jadwal tes tersedia setelah pendaftaran diajukan dan biaya pendaftaran lunas.</Alert>
      ) : (
        <Split breakpoint={960} asideWidth={340} aside={<JadwalTesPendaftarPmb jadwal={detail.jadwal_tes} />}>
          <Stack gap={3}>
            <Text size="xs" weight="semibold" tone="muted" className="u-pmb-label-kecil">
              Ujian CBT
            </Text>
            {ujian.loading && !ujian.data ? (
              <Memuat tinggi={160} />
            ) : ujian.error ? (
              <Galat e={ujian.error} ulang={ujian.refetch} />
            ) : !(ujian.data ?? []).length ? (
              <Empty bordered icon={<MonitorCheck aria-hidden />} title="Belum ada ujian" description="Ujian CBT muncul di sini setelah panitia mendaftarkan Anda ke sesi ujian." />
            ) : (
              <Grid min={260} gap={4}>
                {ujian.data!.map((u) => {
                  const s = STATUS_UJIAN[u.status];
                  return (
                    <Card key={u.id}>
                      <CardContent>
                        <Stack gap={3}>
                          <Cluster justify="between" align="start" wrap={false}>
                            <Cluster gap={3} wrap={false}>
                              <span className="u-pmb-metode-ikon">
                                <MonitorPlay aria-hidden />
                              </span>
                              <div>
                                <Text weight="semibold">{u.ujian}</Text>
                                <Text size="xs" tone="muted">
                                  {u.kode} · {u.sesi}
                                </Text>
                              </div>
                            </Cluster>
                            <Badge variant={s.variant} dot>
                              {s.label}
                            </Badge>
                          </Cluster>
                          <Text size="sm" tone="muted">
                            <CalendarClock aria-hidden className="u-pmb-ikon-teks" />
                            {tanggalPmb(u.mulai)}, {jam(u.mulai)}–{jam(u.selesai)}
                          </Text>
                          <Text size="sm" tone="muted">
                            <Clock aria-hidden className="u-pmb-ikon-teks" />
                            Durasi {u.durasi_menit} menit{u.status === 'mengerjakan' && u.sisa_detik != null ? ` · sisa ${durasi(u.sisa_detik)}` : ''}
                          </Text>
                          <div>
                            {u.status === 'mengerjakan' ? (
                              <Button onClick={() => keRuang(u.id)}>
                                <PlayCircle aria-hidden /> Lanjutkan ujian
                              </Button>
                            ) : u.status === 'terdaftar' ? (
                              <Button disabled={!u.bisa_mulai} onClick={() => setMulai(u)}>
                                <PlayCircle aria-hidden /> {u.bisa_mulai ? 'Mulai ujian' : u.sesi_status === 'dibuka' ? 'Belum waktunya' : 'Menunggu sesi dibuka'}
                              </Button>
                            ) : u.status === 'selesai' ? (
                              <Button variant="link" onClick={() => keRuang(u.id)}>
                                Lihat ringkasan
                              </Button>
                            ) : null}
                          </div>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Grid>
            )}
          </Stack>
        </Split>
      )}
      <DialogToken key={mulai?.id ?? 0} u={mulai} pendaftaranId={aktif.id} onClose={() => setMulai(null)} onMulai={(p) => keRuang(p)} />
    </Stack>
  );
}

/** Ruang ujian CBT pendaftar (layar penuh, simpan luring, pengawasan) di atas LembarUjian. */
export function RuangUjianPmb({ pendaftaranId, pesertaId, subjudul, onSelesai }: { pendaftaranId: string; pesertaId: number; subjudul?: React.ReactNode; onSelesai?: () => void }) {
  return <LembarUjian pesertaId={pesertaId} basePath={`/v1/pmb/saya/pendaftaran/${pendaftaranId}/ujian/${pesertaId}`} subjudul={subjudul} onSelesai={onSelesai} />;
}

// ================================================================ Kartu peserta
interface DataKartuPeserta {
  no_pmb: string;
  nomor_peserta: string | null;
  nama: string | null;
  gelombang: string;
  pilihan: { urut: number; kode_prodi: string; nama_prodi: string }[];
  foto_berkas_id: number | null;
  jadwal_tes: JadwalTesPmb[];
}
/** Kartu peserta ujian siap cetak (pas foto, nomor, pilihan prodi, QR, jadwal tes). */
export function KartuPesertaPmb({ pendaftaranId }: { pendaftaranId: string }) {
  const { kampus, urlBerkas, rute } = usePmb();
  const q = useSiakadQuery<DataKartuPeserta>(['pmb-saya', 'kartu', pendaftaranId], (s, signal) => s.pmb.getSayaPendaftaranByIdKartu(pendaftaranId, {}, { signal }) as never);
  if (q.loading && !q.data) return <Memuat tinggi={420} />;
  if (q.error || !q.data) return <Galat e={q.error ?? new Error('Kartu belum tersedia.')} ulang={q.refetch} />;
  const k = q.data;
  const foto = k.foto_berkas_id ? (urlBerkas ?? ((p: string) => `/bff/saya${p.replace('/v1/pmb/saya', '')}`))(`/v1/pmb/saya/pendaftaran/${pendaftaranId}/berkas/${k.foto_berkas_id}`) : null;
  return (
    <div className="u-pmb-kartu-wadah">
      <Cluster justify="between" className="u-pmb-cetak-sembunyi">
        <TautanPmb href={rute.ujian} className="u-pmb-tautan-redup">
          ← Kembali
        </TautanPmb>
        <Button onClick={() => window.print()}>
          <Printer aria-hidden /> Cetak kartu
        </Button>
      </Cluster>
      <article className="u-pmb-kartu">
        <header>
          <div>
            <p className="u-pmb-label-kecil">Kartu peserta ujian seleksi</p>
            <strong>PMB {kampus.nama}</strong>
            <small>{k.gelombang}</small>
          </div>
        </header>
        <div className="u-pmb-kartu-isi">
          <div className="u-pmb-kartu-foto">{foto ? <img src={foto} alt="Pas foto" /> : <span>Pas foto</span>}</div>
          <DescriptionList
            items={[
              { label: 'Nama', value: <strong className="u-pmb-kartu-nama">{k.nama}</strong> },
              { label: 'No. pendaftaran', value: <code>{k.no_pmb}</code> },
              { label: 'No. peserta', value: <code>{k.nomor_peserta ?? '-'}</code> },
              {
                label: 'Pilihan program studi',
                value: (
                  <>
                    {k.pilihan.map((x) => (
                      <span key={x.urut} className="u-pmb-blok">
                        {x.urut}. <LabelProdi kode={x.kode_prodi} nama={hurufJudul(x.nama_prodi ?? x.kode_prodi)} sub={false} />
                      </span>
                    ))}
                  </>
                ),
              },
            ]}
          />
          <KodeQr teks={k.no_pmb} ukuran={110} />
        </div>
        <section className="u-pmb-kartu-jadwal">
          <p className="u-pmb-label-kecil">Jadwal tes</p>
          {!k.jadwal_tes.length ? (
            <Text size="sm" tone="muted">
              Jadwal belum ditentukan panitia.
            </Text>
          ) : (
            <TableContainer>
              {/* unipo-ui-izinkan tabel-primitif: jadwal di kartu tes yang dicetak/diunduh peserta, tata letak kartu */}
              <Table density="compact">
                <thead>
                  <tr>
                    <th>Tes</th>
                    <th>Tanggal</th>
                    <th>Waktu</th>
                    <th>Ruang/kursi</th>
                  </tr>
                </thead>
                <tbody>
                  {k.jadwal_tes.map((j) => (
                    <tr key={j.sesi_id}>
                      <td>{j.nama}</td>
                      <td>{tanggalPmb(j.tanggal)}</td>
                      <td>
                        {jam(j.mulai)}–{jam(j.selesai)}
                      </td>
                      <td>{j.tautan ? 'Daring' : `${j.ruang_nama ?? j.lokasi ?? '-'}${j.nomor_kursi ? ` / ${j.nomor_kursi}` : ''}`}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableContainer>
          )}
        </section>
        <ul className="u-pmb-kartu-catatan">
          <li>Bawa kartu ini dan KTP/kartu pelajar asli saat tes.</li>
          <li>Hadir 30 menit sebelum tes dimulai. Ujian CBT memakai token dari pengawas.</li>
          <li>Kartu ini sah tanpa tanda tangan dan dapat diverifikasi lewat QR.</li>
        </ul>
      </article>
    </div>
  );
}

// ================================================================ Hasil
/** Hasil seleksi: menunggu, lulus (+ daftar ulang), tidak lulus, atau diterima dengan NIM. */
export function HasilSeleksiPmb() {
  const { rute } = usePmb();
  const { aktif, detail, memuatDaftar, memuatDetail } = usePendaftaranAktifPmb();
  if (memuatDaftar || (memuatDetail && !detail)) return <Memuat />;
  if (!aktif || !detail) return <MulaiPendaftaranPmb nama="" />;
  const kode = detail.tahap.kode;
  const lulus = detail.pilihan.find((x) => x.lulus);
  const diterima = detail.pilihan.find((x) => x.diterima);
  const du = detail.tagihan.filter((t) => t.jenis === 'daftar_ulang' && t.status !== 'batal');
  return (
    <Stack gap={5}>
      <PageHeader title="Hasil seleksi" description={detail.gelombang.nama} />
      {kode === 'diterima' ? (
        <section className="u-pmb-hasil" data-tone="success">
          <CentangSukses ukuran={56} />
          <h2>Selamat, Anda resmi menjadi mahasiswa baru!</h2>
          <p>
            Program studi <b>{hurufJudul(diterima?.nama_prodi ?? '')}</b>
          </p>
          {diterima?.nim && (
            <p className="u-pmb-nim">
              NIM <span>{diterima.nim}</span>
            </p>
          )}
          <p>Informasi PKKMB dan akun SIAKAD disampaikan lewat pengumuman dan email.</p>
        </section>
      ) : kode === 'lulus_seleksi' ? (
        <>
          <section className="u-pmb-hasil" data-tone="primary">
            <PartyPopper aria-hidden />
            <h2>Selamat, Anda lulus seleksi!</h2>
            <p>
              Diterima di program studi <b>{hurufJudul(lulus?.nama_prodi ?? '')}</b>. Lakukan daftar ulang agar mendapat NIM.
            </p>
          </section>
          <Card>
            <CardHeader title="Daftar ulang" description="Setelah pembayaran daftar ulang lunas, panitia menetapkan NIM dan status Anda berubah menjadi mahasiswa." />
            <CardContent>
              {du.length ? (
                <ul className="u-pmb-baris">
                  {du.map((t) => (
                    <li key={t.id}>
                      <span>
                        <strong>{t.keterangan ?? 'Biaya daftar ulang'}</strong>
                        <small>{t.kedaluwarsa_at ? `Bayar sebelum ${tanggalPmb(t.kedaluwarsa_at)}` : t.nomor}</small>
                      </span>
                      <span className="u-pmb-baris-kanan">
                        <strong>{formatRupiah(t.total)}</strong>
                        {t.status === 'lunas' ? (
                          <Badge variant="success">Lunas</Badge>
                        ) : (
                          <Button size="xs" render={<TautanPmb href={rute.pembayaran} />}>
                            Bayar
                          </Button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Text size="sm" tone="muted">
                  Tagihan daftar ulang akan dibuat panitia. Pantau notifikasi dan email Anda.
                </Text>
              )}
            </CardContent>
          </Card>
        </>
      ) : kode === 'tidak_lulus' ? (
        <section className="u-pmb-hasil">
          <XCircle aria-hidden />
          <h2>Anda belum lulus pada gelombang ini</h2>
          <p>Jangan berkecil hati. Anda masih bisa mendaftar di gelombang atau jalur berikutnya.</p>
          <Button render={<TautanPmb href={rute.pilihGelombang} />}>Lihat gelombang lain</Button>
        </section>
      ) : (
        <section className="u-pmb-hasil" data-tengah>
          {kode === 'menunggu_pengumuman' ? <Hourglass aria-hidden /> : <GraduationCap aria-hidden />}
          <h2>{kode === 'menunggu_pengumuman' ? 'Menunggu pengumuman' : 'Hasil belum tersedia'}</h2>
          <p>{detail.tahap.label}.</p>
          {detail.gelombang.pengumuman_mulai && (
            <Badge variant="neutral" size="lg">
              <CalendarClock aria-hidden /> Pengumuman: {tanggalPmb(detail.gelombang.pengumuman_mulai)}
            </Badge>
          )}
        </section>
      )}
      {detail.pilihan.length > 0 && kode !== 'menunggu_pengumuman' && kode !== 'seleksi' && (
        <Card>
          <CardHeader title="Pilihan program studi" />
          <CardContent>
            <ul className="u-pmb-baris">
              {detail.pilihan.map((x) => (
                <li key={x.urut}>
                  <span className="u-pmb-urut">{x.urut}</span>
                  <LabelProdi kode={x.kode_prodi} nama={hurufJudul(x.nama_prodi ?? '')} ukuran="md" />
                  {x.diterima ? (
                    <Badge variant="success">Diterima{x.nim ? ` · ${x.nim}` : ''}</Badge>
                  ) : x.lulus ? (
                    <Badge variant="info">Lulus</Badge>
                  ) : x.lulus === false ? (
                    <Badge>Tidak lulus</Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

// ================================================================ Notifikasi
/** Jumlah notifikasi belum dibaca (untuk lencana menu). */
export function useJumlahNotifikasiPmb() {
  const q = useNotifikasiPendaftarPmb();
  return (q.data ?? []).filter((n) => !n.dibaca_at).length;
}
/** Kotak masuk pendaftar dengan tandai dibaca. */
export function NotifikasiPendaftarPmbDaftar() {
  const siakad = useSiakad();
  const q = useNotifikasiPendaftarPmb();
  const data = q.data ?? [];
  const belum = data.filter((n) => !n.dibaca_at).length;
  const baca = async (id?: number) => {
    await siakad.pmb.postSayaNotifikasiBaca((id ? { id } : {}) as never).catch(() => undefined);
    q.refetch();
  };
  return (
    <Stack gap={5}>
      <PageHeader
        title="Notifikasi"
        description={belum ? `${belum} belum dibaca` : 'Semua sudah dibaca'}
        actions={
          belum > 0 ? (
            <Button size="sm" variant="outline" onClick={() => void baca()}>
              <CheckCheck aria-hidden /> Tandai semua dibaca
            </Button>
          ) : undefined
        }
      />
      {q.loading && !q.data ? (
        <Memuat tinggi={240} />
      ) : !data.length ? (
        <Empty bordered icon={<Bell aria-hidden />} title="Belum ada notifikasi" />
      ) : (
        <ul className="u-pmb-notif">
          {data.map((n) => (
            <li key={n.id}>
              <button type="button" data-baru={!n.dibaca_at || undefined} onClick={() => !n.dibaca_at && void baca(n.id)}>
                <span className="u-pmb-notif-titik" aria-hidden />
                <span>
                  <span className="u-pmb-notif-kepala">
                    <strong>{n.judul}</strong>
                    <small title={waktu(n.created_at)}>{formatRelative(n.created_at)}</small>
                  </span>
                  {n.isi && <span className="u-pmb-notif-isi">{n.isi}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Stack>
  );
}

// ================================================================ Akun
/** Penilaian password: minimal 8 karakter berisi huruf dan angka. */
export function nilaiPasswordPmb(pw: string) {
  const skor = [pw.length >= 8, /[a-z]/i.test(pw) && /\d/.test(pw), pw.length >= 12, /[^a-z0-9]/i.test(pw)].filter(Boolean).length;
  return { skor, memenuhi: pw.length >= 8 && /[a-z]/i.test(pw) && /\d/.test(pw), label: ['Terlalu lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'][skor] };
}
/** Bilah kekuatan password. */
export function KekuatanPasswordPmb({ password }: { password: string }) {
  if (!password) return null;
  const n = nilaiPasswordPmb(password);
  return <Progress value={n.skor} max={4} size="sm" tone={n.skor <= 1 ? 'danger' : n.skor === 2 ? 'warning' : 'success'} label={n.label} showValue={false} />;
}

/** Profil akun pendaftar, ganti password, keluar. */
export function AkunPendaftarPmbHalaman({ onKeluar, onPasswordDiganti, onAkunBerubah, banner }: { onKeluar: () => void; onPasswordDiganti?: () => void; onAkunBerubah?: (a: AkunPendaftarPmb) => void; banner?: React.ReactNode }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useAkunPendaftarPmb();
  const akun = q.data;
  const [f, setF] = React.useState<{ nama: string; hp: string } | null>(null);
  const [pw, setPw] = React.useState({ lama: '', baru: '', ulang: '' });
  const [proses, setProses] = React.useState<'' | 'profil' | 'pw'>('');
  const [galat, setGalat] = React.useState<{ profil?: string; pw?: string }>({});
  React.useEffect(() => {
    if (akun && !f) setF({ nama: akun.nama, hp: akun.hp ?? '' });
  }, [akun, f]);
  if (q.loading && !akun) return <Memuat />;
  if (!akun || !f) return <Galat e={q.error} ulang={q.refetch} />;
  const simpanProfil = async () => {
    setProses('profil');
    setGalat({});
    try {
      const r = await siakad.pmb.patchSaya({ nama: f.nama.trim(), hp: f.hp.trim() || undefined } as never);
      onAkunBerubah?.(r.data as unknown as AkunPendaftarPmb);
      q.refetch();
      toast.add({ title: 'Profil disimpan', type: 'success' });
    } catch (e) {
      setGalat({ profil: pesanGalat(e) });
    } finally {
      setProses('');
    }
  };
  const gantiPassword = async () => {
    if (!nilaiPasswordPmb(pw.baru).memenuhi || pw.baru !== pw.ulang) return setGalat({ pw: 'Password baru minimal 8 karakter berisi huruf dan angka, dan kedua isian harus sama.' });
    setProses('pw');
    setGalat({});
    try {
      await siakad.pmb.postSayaGantiPassword({ password_lama: pw.lama, password_baru: pw.baru } as never);
      toast.add({ title: 'Password diganti', description: 'Silakan masuk lagi dengan password baru.', type: 'success' });
      onPasswordDiganti?.();
    } catch (e) {
      setGalat({ pw: pesanGalat(e) });
    } finally {
      setProses('');
    }
  };
  return (
    <Stack gap={5} className="u-pmb-akun">
      {banner}
      <PageHeader
        title="Akun saya"
        actions={
          <Button variant="outline" onClick={onKeluar}>
            <LogOut aria-hidden /> Keluar
          </Button>
        }
      />
      <Card>
        <CardHeader title="Informasi akun" />
        <CardContent>
          <DescriptionList
            items={[
              {
                label: 'Email',
                value: (
                  <Cluster gap={2}>
                    {akun.email} <Badge variant={akun.email_terverifikasi ? 'success' : 'warning'}>{akun.email_terverifikasi ? 'Terverifikasi' : 'Belum diverifikasi'}</Badge>
                  </Cluster>
                ),
              },
              { label: 'Terdaftar sejak', value: waktu(akun.dibuat_at) },
              { label: 'Login terakhir', value: waktu(akun.login_terakhir_at) },
            ]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="Profil" description={<><Mail aria-hidden className="u-pmb-ikon-teks" />Email tidak bisa diubah. Hubungi panitia bila perlu mengganti email.</>} />
        <CardContent>
          <Stack gap={4}>
            <Grid cols={2} gap={4}>
              <Field label="Nama lengkap">
                <Input value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} maxLength={100} autoComplete="name" />
              </Field>
              <Field label="Nomor HP / WhatsApp">
                <Input value={f.hp} onChange={(e) => setF({ ...f, hp: e.target.value })} type="tel" autoComplete="tel" />
              </Field>
            </Grid>
            {galat.profil && <Alert variant="danger">{galat.profil}</Alert>}
            <div>
              <Button loading={proses === 'profil'} onClick={() => void simpanProfil()}>
                Simpan profil
              </Button>
            </div>
          </Stack>
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="Ganti password" description="Semua sesi lain akan keluar otomatis." />
        <CardContent>
          <Stack gap={4}>
            <Grid cols={3} gap={4}>
              <Field label="Password lama">
                <Input type="password" value={pw.lama} onChange={(e) => setPw({ ...pw, lama: e.target.value })} autoComplete="current-password" />
              </Field>
              <Field label="Password baru">
                <Input type="password" value={pw.baru} onChange={(e) => setPw({ ...pw, baru: e.target.value })} autoComplete="new-password" />
                <KekuatanPasswordPmb password={pw.baru} />
              </Field>
              <Field label="Ulangi password baru">
                <Input type="password" value={pw.ulang} onChange={(e) => setPw({ ...pw, ulang: e.target.value })} autoComplete="new-password" />
              </Field>
            </Grid>
            {galat.pw && <Alert variant="danger">{galat.pw}</Alert>}
            <div>
              <Button loading={proses === 'pw'} disabled={!pw.lama || !pw.baru} onClick={() => void gantiPassword()}>
                <KeyRound aria-hidden /> Ganti password
              </Button>
            </div>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

