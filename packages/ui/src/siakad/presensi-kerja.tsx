'use client';
import * as React from 'react';
import {
  Ban,
  Camera,
  CircleCheck,
  CircleX,
  Clock,
  Hourglass,
  LocateFixed,
  LogIn,
  LogOut,
  MapPin,
  MapPinned,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  Trash2,
  Wifi,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton, type BadgeVariant } from '../components/actions';
import { Alert, Card, Empty, Pagination } from '../components/display';
import { DataTable } from '../components/data-table';
import { CheckboxGroup, Field, Input, SegmentedControl, Switch, Textarea } from '../components/forms';
import { IsianTanggal, PanelForm, Pilihan } from '../components/formulir';
import { ConfirmDialog, Dialog, Menu, useToast } from '../components/overlays';
import { Peta, PilihLokasiPeta, jarakPeta, usePosisi, type AreaPeta, type PenandaPeta, type TitikPeta, type WarnaPeta } from '../components/peta';
import { useUrlBerkas } from './berkas';
import { GalatApi } from './galat';
import { PilihEntitas } from './pilih';
import { PilihUnit } from './pilih-unit';
import { PilihBerkas } from './pilih-berkas';
import { idPerangkatPresensi } from './presensi';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { IsianJam, IsianAngka } from '../components/isian-angka';
import { keAngka, teksAngka } from '../lib/angka';

/*
 * Presensi kerja berbasis lokasi (/v1/sdm/presensi) untuk dosen dan tendik: layar presensi hari ini (peta, jam
 * server, swafoto), riwayat percobaan + tinjauan atasan, peta kehadiran, koreksi, perangkat, serta kelola area,
 * jadwal/shift, dan penugasan. Keputusan selalu di server; pratinjau area di sini hanya tampilan.
 *
 *   <PresensiKerjaSaya />                       // pegawai (web)
 *   <AntreanTinjauPresensi />                   // atasan / petugas SDM
 *   <KelolaAreaPresensi /> <KelolaJadwalKerja /> <KelolaPenugasanPresensi />   // admin SDM
 */

const P = '/v1/sdm/presensi';
const KUNCI_CACHE = 'sdm-presensi';

// ================================================================ Tipe
export type StatusKejadianPresensi = 'diterima' | 'ditinjau' | 'ditolak';

export interface AreaPresensi {
  id: number | null;
  uuid: string | null;
  kode: string;
  nama: string;
  jenis: 'kampus' | 'gedung' | 'kantor' | 'lapangan' | 'lainnya';
  kampus: string | null;
  unit_id: number | null;
  unit_nama?: string | null;
  alamat: string | null;
  lat: number;
  lng: number;
  radius_m: number;
  poligon: Array<[number, number]> | null;
  ada_jaringan: boolean;
  jaringan?: string | null;
  aktif: boolean;
  keterangan: string | null;
  lama?: boolean;
}

export interface JadwalPresensiHari {
  kerja: boolean;
  libur: string | null;
  masuk: string | null;
  pulang: string | null;
  masuk_at: string | null;
  pulang_at: string | null;
  buka_at: string | null;
  tutup_at: string | null;
  kode: string;
  nama: string;
  jenis: 'tetap' | 'shift' | 'fleksibel';
  toleransi_terlambat_menit: number;
  min_kerja_menit: number | null;
  lintas_hari: boolean;
  wajib_lokasi: boolean;
  wajib_foto: boolean;
  mode_lokasi: 'area' | 'bebas';
}

export interface PresensiHarianKerja {
  id: number;
  pegawai_id: number;
  tanggal: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
  status: 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'cuti' | 'dinas' | 'alpa' | 'libur';
  terlambat_menit: number;
  pulang_cepat_menit: number;
  sumber: string;
  keterangan: string | null;
}

export interface KejadianPresensi {
  id: string;
  pegawai_id: number;
  pegawai_nama: string | null;
  pegawai_jenis?: string | null;
  tanggal: string;
  aksi: 'masuk' | 'pulang';
  waktu: string;
  waktu_perangkat: string | null;
  lat: number | null;
  lng: number | null;
  akurasi_m: number | null;
  lokasi: { id: number; nama: string | null } | null;
  jarak_m: number | null;
  di_area: boolean;
  sumber: 'web' | 'mobile' | 'qr' | 'kiosk' | 'mesin';
  platform: string | null;
  perangkat_id: number | null;
  lokasi_palsu: boolean;
  foto_berkas_id: string | null;
  status: StatusKejadianPresensi;
  alasan: string | null;
  tanda: string[];
  tanda_label: string[];
  skor_risiko: number;
  catatan: string | null;
  ditinjau_oleh: string | null;
  ditinjau_at: string | null;
  catatan_tinjau: string | null;
}

export interface PresensiHariIni {
  server_waktu: string;
  zona: string;
  tanggal: string;
  jadwal: JadwalPresensiHari;
  presensi: PresensiHarianKerja | null;
  cuti: { id: number; nama: string; status_presensi: string; tanggal_mulai: string; tanggal_selesai: string } | null;
  mode_lokasi: 'area' | 'bebas';
  lokasi: AreaPresensi[];
  aksi_berikut: 'masuk' | 'pulang' | null;
  bisa: boolean;
  alasan: string | null;
  aturan: {
    wajib_lokasi: boolean;
    wajib_foto: boolean;
    akurasi_maks_m: number;
    luar_area: 'tolak' | 'tinjau';
    lokasi_palsu: 'tolak' | 'tinjau';
    hari_libur: 'tolak' | 'tinjau' | 'izinkan';
    batas_perangkat: number;
    perangkat_baru: 'otomatis' | 'persetujuan';
  };
  kejadian: KejadianPresensi[];
  perangkat?: { status: 'aktif' | 'menunggu' | 'diblokir' | 'baru' };
}

export interface HasilCatatPresensi {
  status: 'diterima' | 'ditinjau';
  aksi: 'masuk' | 'pulang';
  pesan: string;
  ulang: boolean;
  kejadian: KejadianPresensi | null;
  presensi: PresensiHarianKerja | null;
}

export interface JadwalKerja {
  id: number | null;
  uuid: string | null;
  kode: string;
  nama: string;
  jenis: 'tetap' | 'shift' | 'fleksibel';
  hari: Record<string, { masuk: string; pulang: string }>;
  toleransi_terlambat_menit: number;
  buka_masuk_menit: number;
  batas_pulang_menit: number;
  min_kerja_menit: number | null;
  lintas_hari: boolean;
  ikut_libur: boolean;
  wajib_lokasi: boolean;
  wajib_foto: boolean;
  aktif: boolean;
  keterangan?: string | null;
  dipakai: number | null;
  bawaan: boolean;
}

export interface PenugasanPresensi {
  id: number;
  sasaran: 'semua' | 'jenis' | 'unit' | 'pegawai';
  jenis_pegawai: 'dosen' | 'tendik' | null;
  unit_id: number | null;
  pegawai_id: number | null;
  jadwal_id: number;
  mode_lokasi: 'area' | 'bebas';
  lokasi_ids: number[] | null;
  mulai: string;
  selesai: string | null;
  keterangan: string | null;
  jadwal_nama: string | null;
  jadwal_uuid: string | null;
  unit_nama: string | null;
  pegawai_nama: string | null;
  lokasi_nama: string[] | null;
}

export interface PerangkatPresensi {
  id: number;
  pegawai_id: number;
  pegawai_nama?: string | null;
  pegawai_jenis?: string | null;
  perangkat: string;
  nama: string | null;
  platform: string | null;
  versi_app: string | null;
  status: 'aktif' | 'menunggu' | 'diblokir';
  terakhir_at: string | null;
  terakhir_ip: string | null;
  created_at: string;
  dipakai_pegawai?: number;
}

export type JenisKoreksiPresensi = 'lupa_masuk' | 'lupa_pulang' | 'salah_jam' | 'luar_area' | 'gangguan' | 'lainnya';
export interface KoreksiPresensi {
  id: string;
  pegawai_id: number;
  pegawai_nama: string | null;
  tanggal: string;
  jenis: JenisKoreksiPresensi;
  jam_masuk: string | null;
  jam_pulang: string | null;
  alasan: string;
  berkas_id: string | null;
  kejadian_id: string | null;
  status: 'diajukan' | 'disetujui' | 'ditolak' | 'dibatalkan';
  atasan_nama: string | null;
  diputuskan_oleh: string | null;
  diputuskan_at: string | null;
  catatan_keputusan: string | null;
  presensi_masuk: string | null;
  presensi_pulang: string | null;
  presensi_status: string | null;
  bisa_putuskan: boolean;
  created_at: string;
}

export interface PetaKehadiranData {
  tanggal: string;
  lokasi: AreaPresensi[];
  titik: KejadianPresensi[];
  ringkasan: { diterima: number; ditinjau: number; ditolak: number; di_area: number; luar_area: number };
}

// ================================================================ Label dan pembantu
export const LABEL_STATUS_KEJADIAN: Record<StatusKejadianPresensi, string> = { diterima: 'Diterima', ditinjau: 'Menunggu tinjauan', ditolak: 'Ditolak' };
const VARIAN_STATUS_KEJADIAN: Record<StatusKejadianPresensi, BadgeVariant> = { diterima: 'success', ditinjau: 'warning', ditolak: 'danger' };
const WARNA_STATUS_KEJADIAN: Record<StatusKejadianPresensi, WarnaPeta> = { diterima: 'success', ditinjau: 'warning', ditolak: 'danger' };
export const LABEL_STATUS_HARIAN: Record<PresensiHarianKerja['status'], string> = {
  hadir: 'Hadir',
  terlambat: 'Terlambat',
  izin: 'Izin',
  sakit: 'Sakit',
  cuti: 'Cuti',
  dinas: 'Dinas luar',
  alpa: 'Alpa',
  libur: 'Libur',
};
export const LABEL_JENIS_AREA: Record<AreaPresensi['jenis'], string> = { kampus: 'Kampus', gedung: 'Gedung', kantor: 'Kantor', lapangan: 'Lapangan', lainnya: 'Lainnya' };
export const LABEL_JENIS_JADWAL: Record<JadwalKerja['jenis'], string> = { tetap: 'Jam tetap', shift: 'Shift', fleksibel: 'Fleksibel' };
export const LABEL_JENIS_KOREKSI: Record<JenisKoreksiPresensi, string> = {
  lupa_masuk: 'Lupa presensi masuk',
  lupa_pulang: 'Lupa presensi pulang',
  salah_jam: 'Jam tercatat salah',
  luar_area: 'Tugas di luar area',
  gangguan: 'Gangguan aplikasi/GPS',
  lainnya: 'Lainnya',
};
const LABEL_STATUS_KOREKSI: Record<KoreksiPresensi['status'], [string, BadgeVariant]> = {
  diajukan: ['Diajukan', 'warning'],
  disetujui: ['Disetujui', 'success'],
  ditolak: ['Ditolak', 'danger'],
  dibatalkan: ['Dibatalkan', 'neutral'],
};
const LABEL_STATUS_PERANGKAT: Record<PerangkatPresensi['status'], [string, BadgeVariant]> = {
  aktif: ['Aktif', 'success'],
  menunggu: ['Menunggu persetujuan', 'warning'],
  diblokir: ['Diblokir', 'danger'],
};
const NAMA_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

/** "YYYY-MM-DD HH:MM:SS" → "HH:MM". */
const jam = (s: string | null | undefined) => (s ? s.slice(11, 16) : '–');
/** "YYYY-MM-DD" → "Senin, 17 Nov 2026". */
function tanggalPanjang(s: string): string {
  const d = new Date(`${s.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
}
const tanggalPendek = (s: string) => {
  const d = new Date(`${s.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};
function jarakTeks(m: number | null | undefined): string {
  if (m == null) return '–';
  return m >= 1000 ? `${(m / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} km` : `${Math.round(m)} m`;
}

/** Kode galat tetap dari POST /presensi/catat. */
export const KODE_GALAT_PRESENSI_KERJA = [
  'lokasi_wajib',
  'akurasi_rendah',
  'di_luar_area',
  'alasan_wajib',
  'lokasi_palsu',
  'perangkat_menunggu',
  'perangkat_diblokir',
  'di_luar_jendela',
  'hari_libur',
  'sedang_cuti',
  'foto_wajib',
  'sudah_masuk',
  'belum_masuk',
  'terlalu_cepat',
] as const;

/** Pesan galat presensi kerja: pesan server untuk kode presensi dan galat isian, selain itu pesan umum. */
export function pesanGalatPresensiKerja(e: unknown): string {
  const err = e as { status?: number; code?: string; message?: string; details?: Record<string, unknown> } | null;
  if (err?.code && (KODE_GALAT_PRESENSI_KERJA as readonly string[]).includes(err.code) && err.message) return err.message;
  if (err?.status === 422 && err.details) {
    const isi = Object.values((err.details.fields ?? err.details) as Record<string, unknown>).find((v) => typeof v === 'string');
    if (typeof isi === 'string') return isi;
  }
  if ((err?.status === 403 || err?.status === 409 || err?.status === 422) && err.message && err.code !== 'insufficient_scope') return err.message;
  return pesanGalat(e);
}

function dalamPoligon(t: TitikPeta, poligon: Array<[number, number]>): boolean {
  let dalam = false;
  for (let i = 0, j = poligon.length - 1; i < poligon.length; j = i++) {
    const [yi, xi] = poligon[i] as [number, number];
    const [yj, xj] = poligon[j] as [number, number];
    if (yi > t.lat !== yj > t.lat && t.lng < ((xj - xi) * (t.lat - yi)) / (yj - yi || 1e-12) + xi) dalam = !dalam;
  }
  return dalam;
}

/** Pratinjau sisi klien: di area mana posisi berada, atau seberapa jauh dari area terdekat (meter). */
export function cocokkanAreaPresensi(area: AreaPresensi[], posisi: TitikPeta): { diArea: boolean; area: AreaPresensi | null; jarakM: number | null } {
  let terdekat: AreaPresensi | null = null;
  let min = Infinity;
  for (const a of area) {
    let j: number;
    if (a.poligon && a.poligon.length >= 3) {
      if (dalamPoligon(posisi, a.poligon)) return { diArea: true, area: a, jarakM: 0 };
      j = Math.min(...a.poligon.map(([lat, lng]) => jarakPeta(posisi, { lat, lng })));
    } else {
      j = Math.max(0, jarakPeta(posisi, a) - a.radius_m);
    }
    if (j <= 0) return { diArea: true, area: a, jarakM: 0 };
    if (j < min) {
      min = j;
      terdekat = a;
    }
  }
  return { diArea: false, area: terdekat, jarakM: terdekat ? Math.ceil(min) : null };
}

const keAreaPeta = (a: AreaPresensi, warna: WarnaPeta = 'primary'): AreaPeta => ({ id: String(a.uuid ?? a.kode), lat: a.lat, lng: a.lng, radius_m: a.radius_m, poligon: a.poligon, warna, label: a.nama });

function kunciAcak(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return c?.randomUUID ? c.randomUUID() : `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Data layar presensi hari ini. */
export function usePresensiHariIni(perangkat?: string) {
  return useSiakadQuery<PresensiHariIni>([KUNCI_CACHE, 'hari-ini', perangkat ?? ''], (s, signal) => s.request<PresensiHariIni>({ method: 'GET', path: `${P}/hari-ini`, query: perangkat ? { perangkat } : undefined }, { signal }), {
    staleTime: 15_000,
  });
}

/** Jam server berjalan (selisih dengan jam perangkat dihitung sekali dari `server_waktu`). */
function useJamServer(serverWaktu: string | undefined, zona: string | undefined) {
  const selisih = React.useMemo(() => (serverWaktu ? Date.parse(serverWaktu) - Date.now() : 0), [serverWaktu]);
  const [kini, setKini] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setKini(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const d = new Date(kini + selisih);
  const opsi: Intl.DateTimeFormatOptions = { timeZone: zona || undefined };
  return {
    jam: d.toLocaleTimeString('id-ID', { ...opsi, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':'),
    tanggal: d.toLocaleDateString('id-ID', { ...opsi, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    selisihDetik: Math.round(selisih / 1000),
  };
}

const ZONA_SINGKAT: Record<string, string> = { 'Asia/Jakarta': 'WIB', 'Asia/Makassar': 'WITA', 'Asia/Jayapura': 'WIT' };

// ================================================================ Swafoto
/** Ambil swafoto dari kamera depan; hasil data URI JPEG (lebar ≤ 640 px). */
export function AmbilSwafoto({ open, onOpenChange, onAmbil, judul = 'Swafoto presensi' }: { open: boolean; onOpenChange: (o: boolean) => void; onAmbil: (dataUri: string) => void; judul?: string }) {
  const video = React.useRef<HTMLVideoElement>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [siap, setSiap] = React.useState(false);
  const [hasil, setHasil] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!open) return;
    setHasil(null);
    setSiap(false);
    setGalat(null);
    let aliran: MediaStream | null = null;
    let batal = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Peramban ini tidak bisa membuka kamera.');
        aliran = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } }, audio: false });
        if (batal) return aliran.getTracks().forEach((t) => t.stop());
        if (video.current) {
          video.current.srcObject = aliran;
          await video.current.play().catch(() => undefined);
          setSiap(true);
        }
      } catch (e) {
        const nama = (e as { name?: string }).name;
        setGalat(nama === 'NotAllowedError' ? 'Izin kamera ditolak. Izinkan kamera untuk situs ini lalu coba lagi.' : (e as Error).message || 'Kamera tidak tersedia.');
      }
    })();
    return () => {
      batal = true;
      aliran?.getTracks().forEach((t) => t.stop());
    };
  }, [open]);
  const potret = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const lebar = Math.min(640, v.videoWidth);
    const c = document.createElement('canvas');
    c.width = lebar;
    c.height = Math.round((v.videoHeight / v.videoWidth) * lebar);
    c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height);
    setHasil(c.toDataURL('image/jpeg', 0.8));
  };
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={judul}
      description="Wajah terlihat jelas, tanpa masker atau kacamata gelap."
      footer={
        hasil ? (
          <>
            <Button variant="outline" onClick={() => setHasil(null)}>
              Ulangi
            </Button>
            <Button onClick={() => onAmbil(hasil)}>Pakai foto ini</Button>
          </>
        ) : (
          <Button disabled={!siap} onClick={potret}>
            <Camera aria-hidden /> Ambil foto
          </Button>
        )
      }
    >
      <div className="u-presensi-kerja-swafoto">
        {galat ? <Alert variant="danger">{galat}</Alert> : hasil ? <img src={hasil} alt="Pratinjau swafoto" /> : <video ref={video} playsInline muted aria-label="Kamera depan" />}
      </div>
    </Dialog>
  );
}

// ================================================================ Layar presensi hari ini
export interface PresensiKerjaSayaProps {
  /** Identitas perangkat; bawaan ID acak peramban ini dengan platform `web`. */
  perangkat?: { id: string; nama?: string; platform?: 'android' | 'ios' | 'web' | 'desktop'; versi_app?: string };
  /** Tinggi peta (px). */
  tinggiPeta?: number;
  onTercatat?: (h: HasilCatatPresensi) => void;
  className?: string;
}

/**
 * Layar presensi kerja pegawai: jam server, jadwal hari ini, peta area + posisi saat ini, tombol masuk/pulang
 * (kunci idempoten, swafoto bila wajib, alasan bila di luar area dan kebijakan "tinjau"), dan percobaan hari ini.
 */
export function PresensiKerjaSaya({ perangkat, tinggiPeta = 300, onTercatat, className }: PresensiKerjaSayaProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const idPerangkat = React.useMemo(() => perangkat?.id ?? idPerangkatPresensi(), [perangkat?.id]);
  const q = usePresensiHariIni(idPerangkat);
  const d = q.data;
  const perluLokasi = !!d && d.mode_lokasi === 'area' && d.jadwal.wajib_lokasi && !!d.aksi_berikut;
  const lacak = usePosisi(!!d && !!d.aksi_berikut && (perluLokasi || d.mode_lokasi === 'bebas'));
  const waktu = useJamServer(d?.server_waktu, d?.zona);
  const [kirim, setKirim] = React.useState(false);
  const [hasil, setHasil] = React.useState<HasilCatatPresensi | null>(null);
  const [galat, setGalat] = React.useState<{ pesan: string; kode?: string } | null>(null);
  const [minta, setMinta] = React.useState<null | 'foto' | 'alasan'>(null);
  const [alasan, setAlasan] = React.useState('');
  const [foto, setFoto] = React.useState<string | null>(null);
  // Kunci dipakai ulang hanya bila percobaan sebelumnya putus jaringan (hasilnya tidak diketahui).
  const kunciUlang = React.useRef<string | null>(null);

  const cocok = d && lacak.posisi ? cocokkanAreaPresensi(d.lokasi, lacak.posisi) : null;
  const akurasiBuruk = !!(d && lacak.posisi?.akurasi && lacak.posisi.akurasi > d.aturan.akurasi_maks_m);

  const catat = async (tambahan: { catatan?: string; foto?: string } = {}) => {
    if (!d?.aksi_berikut) return;
    setKirim(true);
    setGalat(null);
    const kunci = kunciUlang.current ?? kunciAcak();
    const pos = lacak.posisi;
    try {
      const r = await siakad.request<HasilCatatPresensi>({
        method: 'POST',
        path: `${P}/catat`,
        body: {
          aksi: d.aksi_berikut,
          ...(pos ? { lat: pos.lat, lng: pos.lng, akurasi: pos.akurasi ?? undefined } : {}),
          perangkat: { id: idPerangkat, platform: 'web', ...perangkat, ...(perangkat?.nama ? {} : { nama: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 100) : undefined }) },
          waktu_perangkat: new Date().toISOString(),
          kunci,
          ...(tambahan.catatan ? { catatan: tambahan.catatan } : {}),
          ...(tambahan.foto ? { foto: tambahan.foto } : {}),
        },
      });
      kunciUlang.current = null;
      setHasil(r.data);
      setMinta(null);
      setAlasan('');
      setFoto(null);
      toast.add({ title: r.data.pesan, type: r.data.status === 'diterima' ? 'success' : 'warning' });
      invalidateSiakad(KUNCI_CACHE);
      q.refetch();
      onTercatat?.(r.data);
    } catch (e) {
      const err = e as { status?: number; code?: string };
      kunciUlang.current = err.status ? null : kunci;
      if (err.code === 'alasan_wajib') {
        setMinta('alasan');
      } else if (err.code === 'foto_wajib') {
        setMinta('foto');
      } else {
        setGalat({ pesan: pesanGalatPresensiKerja(e), kode: err.code });
        if (err.status) q.refetch();
      }
    } finally {
      setKirim(false);
    }
  };

  const tekan = () => {
    if (!d) return;
    if (d.jadwal.wajib_foto && !foto) return setMinta('foto');
    void catat({ foto: foto ?? undefined });
  };

  if (q.loading && !d) return <Skeleton className={className} style={{ height: 520 }} />;
  if (q.error && !d) return <GalatApi error={q.error} onRetry={q.refetch} />;
  if (!d) return null;

  const zona = ZONA_SINGKAT[d.zona] ?? d.zona;
  const p = d.presensi;
  const aksi = d.aksi_berikut;
  const statusPerangkat = d.perangkat?.status;
  const area = d.lokasi.map((a) => keAreaPeta(a, cocok?.diArea && cocok.area === a ? 'success' : 'primary'));

  return (
    <div className={cn('u-presensi-kerja', className)}>
      <Card className="u-presensi-kerja-kepala">
        <div className="u-presensi-kerja-jam">
          <span className="u-presensi-kerja-jam-angka" aria-live="off">
            {waktu.jam}
          </span>
          <span className="u-presensi-kerja-jam-zona">{zona}</span>
          <p className="u-presensi-kerja-jam-tanggal">{waktu.tanggal}</p>
        </div>
        <dl className="u-presensi-kerja-ringkas">
          <div>
            <dt>Jadwal</dt>
            <dd>
              {d.jadwal.kerja ? (d.jadwal.jenis === 'fleksibel' ? `Fleksibel, min. ${Math.round((d.jadwal.min_kerja_menit ?? 0) / 60)} jam` : `${d.jadwal.masuk ?? '–'} – ${d.jadwal.pulang ?? '–'}`) : (d.jadwal.libur ?? 'Bukan hari kerja')}
              <span className="u-presensi-sub">
                {d.jadwal.nama}
                {d.jadwal.lintas_hari ? ' · lintas hari' : ''}
                {d.jadwal.toleransi_terlambat_menit ? ` · toleransi ${d.jadwal.toleransi_terlambat_menit} menit` : ''}
              </span>
            </dd>
          </div>
          <div>
            <dt>Masuk</dt>
            <dd>
              {jam(p?.jam_masuk)}
              {p?.terlambat_menit ? <span className="u-presensi-sub">terlambat {p.terlambat_menit} menit</span> : null}
            </dd>
          </div>
          <div>
            <dt>Pulang</dt>
            <dd>
              {jam(p?.jam_pulang)}
              {p?.pulang_cepat_menit ? <span className="u-presensi-sub">lebih cepat {p.pulang_cepat_menit} menit</span> : null}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              {p ? <Badge variant={p.status === 'hadir' ? 'success' : p.status === 'terlambat' ? 'warning' : p.status === 'alpa' ? 'danger' : 'info'}>{LABEL_STATUS_HARIAN[p.status]}</Badge> : d.cuti ? <Badge variant="info">{d.cuti.nama}</Badge> : <Badge>Belum presensi</Badge>}
            </dd>
          </div>
        </dl>
      </Card>

      {statusPerangkat === 'menunggu' && (
        <Alert variant="warning" title="Perangkat menunggu persetujuan" icon={<Smartphone aria-hidden />}>
          Petugas SDM perlu menyetujui perangkat ini sebelum bisa dipakai presensi.
        </Alert>
      )}
      {statusPerangkat === 'diblokir' && (
        <Alert variant="danger" title="Perangkat diblokir" icon={<Ban aria-hidden />}>
          Hubungi petugas SDM, atau gunakan perangkat lain yang sudah terdaftar.
        </Alert>
      )}
      {Math.abs(waktu.selisihDetik) > 300 && (
        <Alert variant="info" title="Jam perangkat berbeda dengan server">
          Jam perangkat selisih {Math.round(Math.abs(waktu.selisihDetik) / 60)} menit. Presensi tetap memakai jam server.
        </Alert>
      )}

      <Card className="u-presensi-kerja-lokasi">
        {d.mode_lokasi === 'bebas' ? (
          <p className="u-presensi-kerja-status" data-nada="info">
            <Wifi aria-hidden /> Kerja jarak jauh: lokasi dicatat tanpa batas area.
          </p>
        ) : !d.jadwal.wajib_lokasi ? (
          <p className="u-presensi-kerja-status" data-nada="info">
            <MapPin aria-hidden /> Jadwal ini tidak mewajibkan lokasi.
          </p>
        ) : d.lokasi.length === 0 ? (
          <p className="u-presensi-kerja-status" data-nada="warning">
            <ShieldAlert aria-hidden /> Belum ada area presensi untuk unit Anda. Hubungi petugas SDM.
          </p>
        ) : lacak.galat ? (
          <p className="u-presensi-kerja-status" data-nada="danger">
            <LocateFixed aria-hidden /> {lacak.galat}
            <Button size="xs" variant="outline" onClick={lacak.ulang}>
              Coba lagi
            </Button>
          </p>
        ) : !lacak.posisi ? (
          <p className="u-presensi-kerja-status" data-nada="muted">
            <LocateFixed aria-hidden /> {aksi ? 'Mencari lokasi Anda…' : 'Presensi hari ini selesai.'}
          </p>
        ) : cocok?.diArea ? (
          <p className="u-presensi-kerja-status" data-nada="success">
            <CircleCheck aria-hidden /> Di dalam area {cocok.area?.nama}
            <span className="u-presensi-sub">Akurasi ±{lacak.posisi.akurasi ?? '?'} m</span>
          </p>
        ) : (
          <p className="u-presensi-kerja-status" data-nada="warning">
            <MapPinned aria-hidden /> {jarakTeks(cocok?.jarakM)} dari {cocok?.area?.nama ?? 'area presensi'}
            <span className="u-presensi-sub">
              Akurasi ±{lacak.posisi.akurasi ?? '?'} m{d.aturan.luar_area === 'tinjau' ? ' · di luar area perlu alasan dan ditinjau atasan' : ''}
            </span>
          </p>
        )}
        {akurasiBuruk && (
          <p className="u-presensi-kerja-status" data-nada="warning">
            <LocateFixed aria-hidden /> Akurasi lokasi lebih buruk dari {d.aturan.akurasi_maks_m} m. Pindah ke tempat terbuka atau nyalakan GPS presisi tinggi.
          </p>
        )}
        <Peta
          tinggi={tinggiPeta}
          area={d.mode_lokasi === 'area' ? area : []}
          posisi={lacak.posisi}
          pusat={lacak.posisi ?? d.lokasi[0]}
          kunciTampilan={`${d.lokasi.length}-${lacak.posisi ? 1 : 0}`}
          aria-label="Peta area presensi dan posisi Anda"
        />
      </Card>

      {hasil && (
        <Alert variant={hasil.status === 'diterima' ? 'success' : 'warning'} title={hasil.pesan}>
          {hasil.status === 'ditinjau' ? 'Presensi belum dihitung sampai atasan atau petugas SDM menerimanya.' : hasil.ulang ? 'Permintaan yang sama sudah tercatat sebelumnya.' : null}
        </Alert>
      )}
      {galat && (
        <Alert variant="danger" title="Presensi belum tercatat">
          {galat.pesan}
        </Alert>
      )}

      <div className="u-presensi-kerja-aksi">
        {aksi ? (
          <Button size="lg" variant={aksi === 'masuk' ? 'primary' : 'secondary'} loading={kirim} disabled={!d.bisa || statusPerangkat === 'diblokir' || statusPerangkat === 'menunggu'} onClick={tekan}>
            {aksi === 'masuk' ? <LogIn aria-hidden /> : <LogOut aria-hidden />}
            {aksi === 'masuk' ? 'Presensi masuk' : p?.jam_pulang ? 'Perbarui jam pulang' : 'Presensi pulang'}
          </Button>
        ) : (
          <Button size="lg" variant="outline" disabled>
            <CircleCheck aria-hidden /> {p?.jam_pulang ? 'Presensi hari ini lengkap' : 'Tidak ada presensi'}
          </Button>
        )}
        {!d.bisa && d.alasan && <p className="u-presensi-petunjuk">{d.alasan}</p>}
        {d.jadwal.wajib_foto && aksi && (
          <p className="u-presensi-petunjuk">
            <Camera aria-hidden /> Jadwal ini mewajibkan swafoto.
          </p>
        )}
      </div>

      {d.kejadian.length > 0 && (
        <Card className="u-presensi-kerja-riwayat">
          <h3>Percobaan hari ini</h3>
          <ul>
            {d.kejadian.map((k) => (
              <li key={k.id}>
                <span className="u-presensi-kerja-riwayat-jam">{jam(k.waktu)}</span>
                <span>
                  <span className="u-presensi-nama">
                    {k.aksi === 'masuk' ? 'Masuk' : 'Pulang'}
                    {k.lokasi?.nama ? ` · ${k.lokasi.nama}` : ''}
                    {k.jarak_m != null && !k.di_area ? ` · ${jarakTeks(k.jarak_m)} dari area` : ''}
                  </span>
                  {(k.status !== 'diterima' || k.tanda_label.length > 0) && <span className="u-presensi-sub">{k.status === 'ditolak' ? k.alasan : k.tanda_label.join(', ')}</span>}
                </span>
                <Badge variant={VARIAN_STATUS_KEJADIAN[k.status]}>
                  {LABEL_STATUS_KEJADIAN[k.status]}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <AmbilSwafoto
        open={minta === 'foto'}
        onOpenChange={(o) => !o && setMinta(null)}
        onAmbil={(uri) => {
          setFoto(uri);
          setMinta(null);
          void catat({ foto: uri, catatan: alasan || undefined });
        }}
      />
      <Dialog
        open={minta === 'alasan'}
        onOpenChange={(o) => !o && setMinta(null)}
        title="Anda di luar area presensi"
        description="Tulis alasan (mis. tugas luar, rapat di instansi lain). Presensi akan ditinjau atasan sebelum dihitung."
        footer={
          <>
            <Button variant="outline" onClick={() => setMinta(null)}>
              Batal
            </Button>
            <Button loading={kirim} disabled={alasan.trim().length < 5} onClick={() => catat({ catatan: alasan.trim(), foto: foto ?? undefined })}>
              Kirim untuk ditinjau
            </Button>
          </>
        }
      >
        <Field label="Alasan" required description="Minimal 5 karakter.">
          <Textarea rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} autoFocus />
        </Field>
      </Dialog>
    </div>
  );
}

// ================================================================ Riwayat dan tinjauan
export interface RiwayatPresensiKerjaProps {
  /** saya = percobaan sendiri; penyetuju = bawahan/unit yang bisa ditinjau; semua = petugas SDM. */
  sebagai?: 'saya' | 'penyetuju' | 'semua';
  status?: StatusKejadianPresensi;
  /** Tampilkan saringan status dan tanggal. Bawaan true. */
  saring?: boolean;
  perHalaman?: number;
  className?: string;
}

/** Daftar percobaan presensi (bukti lokasi, tanda risiko, status) dengan tombol tinjau untuk atasan/petugas SDM. */
export function RiwayatPresensiKerja({ sebagai = 'saya', status, saring = true, perHalaman = 25, className }: RiwayatPresensiKerjaProps) {
  const [st, setSt] = React.useState<StatusKejadianPresensi | ''>(status ?? '');
  const [dari, setDari] = React.useState<string | null>(null);
  const [sampai, setSampai] = React.useState<string | null>(null);
  const [hal, setHal] = React.useState(1);
  const [tinjau, setTinjau] = React.useState<KejadianPresensi | null>(null);
  const query = { sebagai, status: st || undefined, dari: dari ?? undefined, sampai: sampai ?? undefined, page: hal, per_page: perHalaman };
  const q = useSiakadQuery<KejadianPresensi[]>([KUNCI_CACHE, 'kejadian', query], (s, signal) => s.request<KejadianPresensi[]>({ method: 'GET', path: `${P}/kejadian`, query }, { signal }), { staleTime: 10_000 });
  const daftar = q.data ?? [];
  const bisaTinjau = sebagai !== 'saya';
  return (
    <div className={cn('u-presensi-kerja-daftar', className)}>
      {saring && (
        <div className="u-presensi-alat">
          <SegmentedControl
            aria-label="Status"
            value={st || 'semua'}
            onValueChange={(v) => {
              setSt(v === 'semua' ? '' : (v as StatusKejadianPresensi));
              setHal(1);
            }}
            options={[
              { value: 'semua', label: 'Semua' },
              { value: 'ditinjau', label: 'Menunggu' },
              { value: 'diterima', label: 'Diterima' },
              { value: 'ditolak', label: 'Ditolak' },
            ]}
          />
          <div className="u-presensi-kerja-rentang">
            <IsianTanggal value={dari} onValueChange={(v) => (setDari(v || null), setHal(1))} placeholder="Dari" />
            <IsianTanggal value={sampai} onValueChange={(v) => (setSampai(v || null), setHal(1))} placeholder="Sampai" />
          </div>
        </div>
      )}
      {q.loading && !q.data ? (
        <Skeleton style={{ height: 240 }} />
      ) : q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : daftar.length === 0 ? (
        <Empty bordered icon={<Clock aria-hidden />} title={st === 'ditinjau' ? 'Tidak ada presensi yang menunggu tinjauan' : 'Belum ada percobaan presensi'} description={st === 'ditinjau' ? 'Presensi di luar area atau berisiko akan muncul di sini.' : undefined} />
      ) : (
        <DataTable<(typeof daftar)[number]>
          className="u-presensi-kerja-tabel"
          columns={[
            {
              key: 'waktu',
              header: 'Waktu',
              mobile: 'title',
              cell: (k) => (
                <>
                  <span className="u-presensi-nama">
                    {k.aksi === 'masuk' ? 'Masuk' : 'Pulang'} {jam(k.waktu)}
                  </span>
                  <span className="u-presensi-sub">
                    {tanggalPendek(k.tanggal)} · {k.platform && k.platform !== k.sumber ? k.platform : k.sumber}
                  </span>
                </>
              ),
            },
            ...(sebagai !== 'saya'
              ? [
                  {
                    key: 'pegawai_nama',
                    header: 'Pegawai',
                    value: (k: (typeof daftar)[number]) => k.pegawai_nama ?? '',
                    cell: (k: (typeof daftar)[number]) => (
                      <>
                        <span className="u-presensi-nama">{k.pegawai_nama ?? 'Pegawai'}</span>
                        {k.pegawai_jenis && <span className="u-presensi-sub">{k.pegawai_jenis === 'dosen' ? 'Dosen' : 'Tendik'}</span>}
                      </>
                    ),
                  },
                ]
              : []),
            {
              key: 'lokasi',
              header: 'Lokasi',
              cell: (k) => (
                <>
                  <span className="u-presensi-nama">{k.lat == null ? 'Tanpa lokasi' : k.di_area ? (k.lokasi?.nama ?? 'Di area') : `${jarakTeks(k.jarak_m)} dari ${k.lokasi?.nama ?? 'area'}`}</span>
                  {k.akurasi_m != null && <span className="u-presensi-sub">akurasi ±{k.akurasi_m} m</span>}
                </>
              ),
            },
            {
              key: 'tanda',
              header: 'Tanda',
              value: (k) => k.tanda_label.join(', '),
              cell: (k) => (
                <>
                  {k.tanda_label.length ? (
                    <span className="u-presensi-kerja-tanda">
                      {k.tanda_label.map((t) => (
                        <Badge key={t} variant="warning">
                          {t}
                        </Badge>
                      ))}
                    </span>
                  ) : (
                    <span className="u-presensi-sub">–</span>
                  )}
                  {k.skor_risiko > 0 && <span className="u-presensi-sub">skor risiko {k.skor_risiko}</span>}
                </>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              mobile: 'badge',
              value: (k) => LABEL_STATUS_KEJADIAN[k.status],
              cell: (k) => (
                <>
                  <Badge variant={VARIAN_STATUS_KEJADIAN[k.status]}>{LABEL_STATUS_KEJADIAN[k.status]}</Badge>
                  {k.status === 'ditolak' && k.alasan && <span className="u-presensi-sub">{k.alasan}</span>}
                </>
              ),
            },
            ...(bisaTinjau
              ? [
                  {
                    key: 'aksi',
                    header: <span className="u-sr-only">Aksi</span>,
                    label: 'Aksi',
                    shrink: true,
                    hideable: false,
                    cell: (k: (typeof daftar)[number]) => (
                      <Button size="xs" variant={k.status === 'ditinjau' ? 'primary' : 'ghost'} onClick={() => setTinjau(k)}>
                        {k.status === 'ditinjau' ? 'Tinjau' : 'Rincian'}
                      </Button>
                    ),
                  },
                ]
              : []),
          ]}
          rows={daftar}
          rowKey={(k) => String(k.id)}
          pagination={false}
          defaultDensity="compact"
        />
      )}
      {(q.meta?.total_pages ?? 1) > 1 && <Pagination page={hal} totalPages={q.meta?.total_pages ?? 1} total={q.meta?.total ?? undefined} perPage={perHalaman} onPageChange={setHal} />}
      <TinjauKejadianPresensi kejadian={tinjau} onOpenChange={(o) => !o && setTinjau(null)} />
    </div>
  );
}

/** Antrean tinjauan untuk atasan langsung atau petugas SDM. */
export function AntreanTinjauPresensi({ className }: { className?: string }) {
  return <RiwayatPresensiKerja sebagai="penyetuju" status="ditinjau" className={className} />;
}

/** Dialog rincian percobaan presensi: peta titik vs area, tanda risiko, swafoto, dan keputusan terima/tolak. */
export function TinjauKejadianPresensi({ kejadian: k, onOpenChange }: { kejadian: KejadianPresensi | null; onOpenChange: (o: boolean) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [catatan, setCatatan] = React.useState('');
  const [proses, setProses] = React.useState<'terima' | 'tolak' | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const area = useSiakadQuery<AreaPresensi[]>([KUNCI_CACHE, 'lokasi', 'aktif'], (s, signal) => s.request<AreaPresensi[]>({ method: 'GET', path: `${P}/lokasi` }, { signal }), { enabled: !!k, staleTime: 120_000 });
  React.useEffect(() => {
    setCatatan('');
    setGalat(null);
  }, [k?.id]);
  const putuskan = async (keputusan: 'terima' | 'tolak') => {
    if (!k) return;
    if (keputusan === 'tolak' && !catatan.trim()) return setGalat('Tulis alasan penolakan.');
    setProses(keputusan);
    setGalat(null);
    try {
      await siakad.request({ method: 'POST', path: `${P}/kejadian/${k.id}/tinjau`, body: { keputusan, catatan: catatan.trim() || undefined } });
      toast.add({ title: keputusan === 'terima' ? 'Presensi diterima dan dihitung' : 'Presensi ditolak', type: keputusan === 'terima' ? 'success' : 'info' });
      invalidateSiakad(KUNCI_CACHE);
      onOpenChange(false);
    } catch (e) {
      setGalat(pesanGalatPresensiKerja(e));
    } finally {
      setProses(null);
    }
  };
  const penanda: PenandaPeta[] = k && k.lat != null && k.lng != null ? [{ id: k.id, lat: k.lat, lng: k.lng, warna: WARNA_STATUS_KEJADIAN[k.status], label: k.pegawai_nama ?? 'Titik presensi' }] : [];
  return (
    <Dialog
      side="right"
      open={!!k}
      onOpenChange={onOpenChange}
      size="lg"
      title={k ? `${k.aksi === 'masuk' ? 'Masuk' : 'Pulang'} ${jam(k.waktu)} · ${k.pegawai_nama ?? 'Presensi'}` : ''}
      description={k ? `${tanggalPanjang(k.tanggal)} · ${LABEL_STATUS_KEJADIAN[k.status]}` : undefined}
      footer={
        k?.status === 'ditinjau' ? (
          <>
            <Button variant="destructive-soft" loading={proses === 'tolak'} disabled={!!proses} onClick={() => putuskan('tolak')}>
              <CircleX aria-hidden /> Tolak
            </Button>
            <Button loading={proses === 'terima'} disabled={!!proses} onClick={() => putuskan('terima')}>
              <CircleCheck aria-hidden /> Terima presensi
            </Button>
          </>
        ) : undefined
      }
    >
      {k && (
        <div className="u-presensi-kerja-tinjau">
          {penanda.length > 0 ? (
            <Peta tinggi={240} area={(area.data ?? []).map((a) => keAreaPeta(a))} penanda={penanda} posisi={k.akurasi_m ? { lat: k.lat!, lng: k.lng!, akurasi: k.akurasi_m } : null} kunciTampilan={k.id} aria-label="Titik presensi dan area" />
          ) : (
            <Alert variant="neutral">Percobaan ini tanpa koordinat (jaringan kampus, kerja jarak jauh tanpa lokasi, atau lokasi tidak dikirim).</Alert>
          )}
          <dl className="u-presensi-kerja-rincian">
            <div>
              <dt>Lokasi</dt>
              <dd>{k.lat == null ? '–' : k.di_area ? `Di area ${k.lokasi?.nama ?? ''}` : `${jarakTeks(k.jarak_m)} dari ${k.lokasi?.nama ?? 'area'}`}</dd>
            </div>
            <div>
              <dt>Akurasi</dt>
              <dd>{k.akurasi_m != null ? `±${k.akurasi_m} m` : '–'}</dd>
            </div>
            <div>
              <dt>Perangkat</dt>
              <dd>
                {k.sumber}
                {k.platform ? ` · ${k.platform}` : ''}
              </dd>
            </div>
            <div>
              <dt>Skor risiko</dt>
              <dd>{k.skor_risiko}</dd>
            </div>
            {k.tanda_label.length > 0 && (
              <div className="u-presensi-kerja-rincian-lebar">
                <dt>Tanda</dt>
                <dd className="u-presensi-kerja-tanda">
                  {k.tanda_label.map((t) => (
                    <Badge key={t} variant="warning">
                      {t}
                    </Badge>
                  ))}
                </dd>
              </div>
            )}
            {k.catatan && (
              <div className="u-presensi-kerja-rincian-lebar">
                <dt>Alasan pegawai</dt>
                <dd>{k.catatan}</dd>
              </div>
            )}
            {k.ditinjau_oleh && (
              <div className="u-presensi-kerja-rincian-lebar">
                <dt>Ditinjau</dt>
                <dd>
                  {k.ditinjau_oleh} · {k.ditinjau_at?.slice(0, 16)}
                  {k.catatan_tinjau ? ` · ${k.catatan_tinjau}` : ''}
                </dd>
              </div>
            )}
          </dl>
          {k.foto_berkas_id && <FotoKejadian berkasId={k.foto_berkas_id} />}
          {k.status === 'ditinjau' && (
            <Field label="Catatan" description="Wajib bila ditolak." error={galat ?? undefined}>
              <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
            </Field>
          )}
          {galat && k.status !== 'ditinjau' && <Alert variant="danger">{galat}</Alert>}
        </div>
      )}
    </Dialog>
  );
}

function FotoKejadian({ berkasId }: { berkasId: string }) {
  const url = useUrlBerkas(berkasId, 300);
  if (url.error) return <p className="u-presensi-petunjuk">Swafoto tidak bisa dimuat (hanya pegawai, atasan, atau petugas SDM yang berhak).</p>;
  return <div className="u-presensi-kerja-foto">{url.data?.url ? <img src={url.data.url} alt="Swafoto presensi" /> : <Skeleton style={{ height: 160, width: 120 }} />}</div>;
}

// ================================================================ Peta kehadiran
/** Peta kehadiran satu tanggal: area, titik presensi (warna status), dan ringkasan. Untuk pimpinan/petugas SDM. */
export function PetaKehadiran({ tinggi = 420, className }: { tinggi?: number; className?: string }) {
  const [tanggal, setTanggal] = React.useState<string | null>(null);
  const [unit, setUnit] = React.useState<string | null>(null);
  const [ditolak, setDitolak] = React.useState(false);
  const [pilih, setPilih] = React.useState<KejadianPresensi | null>(null);
  const query = { tanggal: tanggal ?? undefined, unit_id: unit ?? undefined };
  const q = useSiakadQuery<PetaKehadiranData>([KUNCI_CACHE, 'peta', query], (s, signal) => s.request<PetaKehadiranData>({ method: 'GET', path: `${P}/peta`, query }, { signal }), { staleTime: 15_000 });
  const d = q.data;
  const titik = (d?.titik ?? []).filter((k) => k.lat != null && k.lng != null && (ditolak || k.status !== 'ditolak'));
  const penanda: PenandaPeta[] = titik.map((k) => ({
    id: k.id,
    lat: k.lat!,
    lng: k.lng!,
    warna: WARNA_STATUS_KEJADIAN[k.status],
    label: `${k.pegawai_nama ?? '#' + k.pegawai_id} · ${k.aksi} ${jam(k.waktu)}`,
    keterangan: `${k.pegawai_nama ?? ''}\n${k.aksi === 'masuk' ? 'Masuk' : 'Pulang'} ${jam(k.waktu)} · ${LABEL_STATUS_KEJADIAN[k.status]}\n${k.di_area ? `Di ${k.lokasi?.nama ?? 'area'}` : `${jarakTeks(k.jarak_m)} dari area`}`,
  }));
  return (
    <div className={cn('u-presensi-kerja-peta', className)}>
      <div className="u-presensi-alat">
        <div className="u-presensi-kerja-rentang">
          <IsianTanggal value={tanggal ?? d?.tanggal ?? null} onValueChange={(v) => setTanggal(v || null)} placeholder="Tanggal" />
          <PilihUnit sumber="sdm" semua value={unit} onValueChange={(v) => setUnit(v == null ? null : String(v))} placeholder="Semua unit" aria-label="Saring unit kerja" />
        </div>
        <label className="u-presensi-kerja-saklar">
          <Switch size="sm" checked={ditolak} onCheckedChange={setDitolak} /> Tampilkan yang ditolak
        </label>
      </div>
      {d && (
        <div className="u-presensi-kerja-statistik">
          <Statistik label="Diterima" nilai={d.ringkasan.diterima} nada="success" />
          <Statistik label="Menunggu tinjauan" nilai={d.ringkasan.ditinjau} nada="warning" />
          <Statistik label="Ditolak" nilai={d.ringkasan.ditolak} nada="danger" />
          <Statistik label="Di luar area" nilai={d.ringkasan.luar_area} nada="muted" />
        </div>
      )}
      {q.error && !d ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : (
        <Peta
          tinggi={tinggi}
          area={(d?.lokasi ?? []).map((a) => keAreaPeta(a))}
          penanda={penanda}
          onPilihPenanda={(id) => setPilih(d?.titik.find((k) => k.id === id) ?? null)}
          kunciTampilan={`${d?.tanggal ?? ''}-${unit ?? ''}`}
          aria-label="Peta kehadiran"
        />
      )}
      {d && titik.length === 0 && <p className="u-presensi-petunjuk">Belum ada presensi berlokasi pada tanggal ini.</p>}
      <TinjauKejadianPresensi kejadian={pilih} onOpenChange={(o) => !o && setPilih(null)} />
    </div>
  );
}

function Statistik({ label, nilai, nada }: { label: string; nilai: number; nada: 'success' | 'warning' | 'danger' | 'muted' }) {
  return (
    <div className="u-presensi-kerja-stat" data-nada={nada}>
      <span className="u-presensi-kerja-stat-angka">{nilai.toLocaleString('id-ID')}</span>
      <span className="u-presensi-kerja-stat-label">{label}</span>
    </div>
  );
}

// ================================================================ Area presensi
/** Daftar area presensi (lihat semua bila `semua`). */
export function useAreaPresensi(semua = false) {
  return useSiakadQuery<AreaPresensi[]>([KUNCI_CACHE, 'lokasi', semua ? 'semua' : 'aktif'], (s, signal) => s.request<AreaPresensi[]>({ method: 'GET', path: `${P}/lokasi`, query: semua ? { semua: '1' } : undefined }, { signal }), {
    staleTime: 60_000,
  });
}

export function FormAreaPresensi({ open, onOpenChange, area, areaLain, onSimpan }: { open: boolean; onOpenChange: (o: boolean) => void; area?: AreaPresensi | null; areaLain?: AreaPresensi[]; onSimpan?: (a: AreaPresensi) => void }) {
  const siakad = useSiakad();
  const awal = React.useCallback(
    () => ({
      nama: area?.nama ?? '',
      kode: area?.kode ?? '',
      jenis: area?.jenis ?? ('kampus' as AreaPresensi['jenis']),
      kampus: area?.kampus ?? '',
      unit_id: area?.unit_id != null ? String(area.unit_id) : null,
      alamat: area?.alamat ?? '',
      titik: area ? ({ lat: area.lat, lng: area.lng } as TitikPeta | null) : null,
      radius_m: area?.radius_m ?? 150,
      poligon: area?.poligon ?? null,
      jaringan: area?.jaringan ?? '',
      aktif: area?.aktif ?? true,
      keterangan: area?.keterangan ?? '',
    }),
    [area],
  );
  const [f, setF] = React.useState(awal);
  const [berubah, setBerubah] = React.useState(false);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (open) {
      setF(awal());
      setBerubah(false);
      setGalat({});
    }
  }, [open, awal]);
  const set = <K extends keyof ReturnType<typeof awal>>(k: K, v: ReturnType<typeof awal>[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setBerubah(true);
  };
  return (
    <PanelForm
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={area ? `Ubah area ${area.nama}` : 'Area presensi baru'}
      description="Titik pusat dengan radius, atau poligon mengikuti batas lahan. Pegawai hanya bisa presensi di dalam area unitnya."
      berubah={berubah}
      onSimpan={async () => {
        const err: Record<string, string> = {};
        if (!f.nama.trim()) err.nama = 'Tulis nama area.';
        if (!/^[A-Za-z0-9_.-]{2,40}$/.test(f.kode)) err.kode = 'Huruf, angka, titik, atau garis; 2-40 karakter.';
        if (!f.titik) err.titik = 'Pilih titik di peta.';
        if (f.poligon && f.poligon.length > 0 && f.poligon.length < 3) err.titik = 'Poligon butuh minimal 3 titik.';
        setGalat(err);
        if (Object.keys(err).length) return false;
        try {
          const r = await siakad.request<AreaPresensi>({
            method: 'POST',
            path: area ? `${P}/lokasi/${area.uuid ?? area.id}` : `${P}/lokasi`,
            body: {
              nama: f.nama.trim(),
              kode: f.kode,
              jenis: f.jenis,
              kampus: f.kampus.trim() || null,
              unit_id: f.unit_id ? Number(f.unit_id) : null,
              alamat: f.alamat.trim() || null,
              lat: f.titik!.lat,
              lng: f.titik!.lng,
              radius_m: Math.round(f.radius_m),
              poligon: f.poligon && f.poligon.length >= 3 ? f.poligon : null,
              jaringan: f.jaringan.trim() || null,
              aktif: f.aktif,
              keterangan: f.keterangan.trim() || null,
            },
          });
          invalidateSiakad(KUNCI_CACHE);
          onSimpan?.(r.data);
        } catch (e) {
          return pesanGalatPresensiKerja(e);
        }
      }}
    >
      <div className="u-presensi-form">
        <div className="u-presensi-form-baris">
          <Field label="Nama" required error={galat.nama}>
            <Input value={f.nama} onChange={(e) => set('nama', e.target.value)} placeholder="Mis. Kampus 1 UNIPO" />
          </Field>
          <Field label="Kode" required error={galat.kode}>
            <Input value={f.kode} onChange={(e) => set('kode', e.target.value)} placeholder="kampus-1" />
          </Field>
        </div>
        <div className="u-presensi-form-baris">
          <Field label="Jenis">
            <Pilihan required value={f.jenis} onValueChange={(v) => v && set('jenis', v as AreaPresensi['jenis'])} options={Object.entries(LABEL_JENIS_AREA).map(([value, label]) => ({ value, label }))} />
          </Field>
          <Field label="Kampus" optional>
            <Input value={f.kampus} onChange={(e) => set('kampus', e.target.value)} placeholder="Kampus 1" />
          </Field>
        </div>
        <Field label="Unit" optional description="Kosong = berlaku untuk semua unit. Petugas unit hanya bisa membuat area untuk unitnya.">
          <PilihUnit sumber="sdm" value={f.unit_id} onValueChange={(v) => set('unit_id', v == null ? null : String(v))} />
        </Field>
        <Field label="Lokasi" required error={galat.titik}>
          <PilihLokasiPeta
            value={f.titik}
            onChange={(t) => set('titik', t)}
            radius={f.radius_m}
            onRadiusChange={(m) => set('radius_m', m)}
            poligon={f.poligon}
            onPoligonChange={(p) => set('poligon', p)}
            areaLain={(areaLain ?? []).filter((a) => a.uuid !== area?.uuid).map((a) => keAreaPeta(a, 'muted'))}
            radiusMaks={20000}
          />
        </Field>
        <Field label="Alamat" optional>
          <Input value={f.alamat} onChange={(e) => set('alamat', e.target.value)} />
        </Field>
        <Field label="Jaringan kampus" optional description="IP publik atau CIDR dipisah koma. Presensi dari jaringan ini dianggap di area walau GPS lemah (di dalam gedung).">
          <Input value={f.jaringan} onChange={(e) => set('jaringan', e.target.value)} placeholder="103.10.20.0/24" inputMode="decimal" />
        </Field>
        <Field label="Aktif">
          <Switch checked={f.aktif} onCheckedChange={(v) => set('aktif', v)} />
        </Field>
        <Field label="Keterangan" optional>
          <Textarea rows={2} value={f.keterangan} onChange={(e) => set('keterangan', e.target.value)} />
        </Field>
      </div>
    </PanelForm>
  );
}

/** Kelola area presensi: peta semua area, daftar, tambah/ubah/hapus. Admin SDM dan petugas SDM unit. */
export function KelolaAreaPresensi({ className }: { className?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useAreaPresensi(true);
  const [form, setForm] = React.useState<AreaPresensi | null | false>(false);
  const [hapus, setHapus] = React.useState<AreaPresensi | null>(null);
  const daftar = (q.data ?? []).filter((a) => !a.lama);
  return (
    <div className={cn('u-presensi-kerja-kelola', className)}>
      <div className="u-presensi-alat">
        <p className="u-presensi-petunjuk">
          <MapPin aria-hidden /> Peta: OpenStreetMap. Area aktif dipakai untuk memeriksa lokasi presensi.
        </p>
        <Button onClick={() => setForm(null)}>
          <Plus aria-hidden /> Area baru
        </Button>
      </div>
      {q.loading && !q.data ? (
        <Skeleton style={{ height: 320 }} />
      ) : q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : daftar.length === 0 ? (
        <Empty
          bordered
          icon={<MapPinned aria-hidden />}
          title="Belum ada area presensi"
          description="Tambahkan Kampus 1, Kampus 2, atau kantor unit. Sebelum ada area, titik di Pengaturan SDM yang dipakai."
          actions={
            <Button onClick={() => setForm(null)}>
              <Plus aria-hidden /> Tambah area
            </Button>
          }
        />
      ) : (
        <>
          <Peta tinggi={300} area={daftar.map((a) => keAreaPeta(a, a.aktif ? 'primary' : 'muted'))} aria-label="Peta semua area presensi" />
          <ul className="u-presensi-daftar-sesi">
            {daftar.map((a) => (
              <li key={a.uuid ?? a.kode} data-nonaktif={!a.aktif || undefined}>
                <div>
                  <p className="u-presensi-sesi-judul">{a.nama}</p>
                  <p className="u-presensi-sesi-meta">
                    {LABEL_JENIS_AREA[a.jenis]}
                    {a.kampus ? ` · ${a.kampus}` : ''} · {a.poligon ? `poligon ${a.poligon.length} titik` : `radius ${a.radius_m} m`} · {a.unit_nama ?? 'semua unit'}
                    {a.ada_jaringan ? ' · jaringan kampus' : ''}
                  </p>
                </div>
                <div className="u-presensi-sesi-aksi">
                  {!a.aktif && <Badge>Nonaktif</Badge>}
                  <Menu
                    trigger={
                      <Button size="xs" variant="ghost" iconOnly aria-label={`Aksi ${a.nama}`}>
                        <MoreHorizontal aria-hidden />
                      </Button>
                    }
                    items={[
                      { label: 'Ubah', icon: <Pencil aria-hidden />, onSelect: () => setForm(a) },
                      { type: 'separator' as const },
                      { label: 'Hapus', icon: <Trash2 aria-hidden />, destructive: true, onSelect: () => setHapus(a) },
                    ]}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      <FormAreaPresensi open={form !== false} onOpenChange={(o) => !o && setForm(false)} area={form || null} areaLain={daftar} onSimpan={() => setForm(false)} />
      <ConfirmDialog
        open={!!hapus}
        onOpenChange={(o) => !o && setHapus(null)}
        title={`Hapus area ${hapus?.nama ?? ''}?`}
        description="Pegawai yang hanya memakai area ini tidak bisa presensi sampai ada area lain. Riwayat presensi tetap tersimpan."
        confirmLabel="Hapus area"
        onConfirm={async () => {
          if (!hapus) return;
          try {
            await siakad.request({ method: 'POST', path: `${P}/lokasi/${hapus.uuid ?? hapus.id}/hapus` });
            invalidateSiakad(KUNCI_CACHE);
            toast.add({ title: `Area ${hapus.nama} dihapus`, type: 'success' });
          } catch (e) {
            toast.add({ title: 'Area belum terhapus', description: pesanGalatPresensiKerja(e), type: 'error' });
          }
        }}
      />
    </div>
  );
}

// ================================================================ Jadwal kerja
export function useJadwalKerja() {
  return useSiakadQuery<JadwalKerja[]>([KUNCI_CACHE, 'jadwal'], (s, signal) => s.request<JadwalKerja[]>({ method: 'GET', path: `${P}/jadwal` }, { signal }), { staleTime: 60_000 });
}

function ringkasHari(h: JadwalKerja['hari']): string {
  const ada = Object.keys(h)
    .map(Number)
    .sort((a, b) => a - b);
  if (!ada.length) return 'Tanpa hari kerja';
  const kelompok = new Map<string, number[]>();
  for (const i of ada) {
    const k = `${h[String(i)]!.masuk}–${h[String(i)]!.pulang}`;
    kelompok.set(k, [...(kelompok.get(k) ?? []), i]);
  }
  return [...kelompok.entries()].map(([jamKerja, hari]) => `${hari.length > 2 && hari[hari.length - 1]! - hari[0]! === hari.length - 1 ? `${NAMA_HARI[hari[0]! - 1]}–${NAMA_HARI[hari[hari.length - 1]! - 1]}` : hari.map((x) => NAMA_HARI[x - 1]!.slice(0, 3)).join(', ')} ${jamKerja}`).join(' · ');
}

export function FormJadwalKerja({ open, onOpenChange, jadwal, onSimpan }: { open: boolean; onOpenChange: (o: boolean) => void; jadwal?: JadwalKerja | null; onSimpan?: (j: JadwalKerja) => void }) {
  const siakad = useSiakad();
  const awal = React.useCallback(() => {
    const hari: Record<string, { aktif: boolean; masuk: string; pulang: string }> = {};
    for (let i = 1; i <= 7; i++) {
      const h = jadwal?.hari[String(i)];
      hari[String(i)] = { aktif: jadwal ? !!h : i <= 5, masuk: h?.masuk ?? '07:30', pulang: h?.pulang ?? (i === 5 ? '16:30' : '16:00') };
    }
    return {
      nama: jadwal?.nama ?? '',
      kode: jadwal?.kode ?? '',
      jenis: jadwal?.jenis ?? ('tetap' as JadwalKerja['jenis']),
      hari,
      toleransi_terlambat_menit: String(jadwal?.toleransi_terlambat_menit ?? 15),
      buka_masuk_menit: String(jadwal?.buka_masuk_menit ?? 120),
      batas_pulang_menit: String(jadwal?.batas_pulang_menit ?? 360),
      min_kerja_menit: String(jadwal?.min_kerja_menit ?? 480),
      lintas_hari: jadwal?.lintas_hari ?? false,
      ikut_libur: jadwal?.ikut_libur ?? true,
      wajib_lokasi: jadwal?.wajib_lokasi ?? true,
      wajib_foto: jadwal?.wajib_foto ?? false,
      aktif: jadwal?.aktif ?? true,
      keterangan: jadwal?.keterangan ?? '',
    };
  }, [jadwal]);
  const [f, setF] = React.useState(awal);
  const [berubah, setBerubah] = React.useState(false);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (open) {
      setF(awal());
      setBerubah(false);
      setGalat({});
    }
  }, [open, awal]);
  const set = <K extends keyof ReturnType<typeof awal>>(k: K, v: ReturnType<typeof awal>[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setBerubah(true);
  };
  const setHari = (i: string, v: Partial<{ aktif: boolean; masuk: string; pulang: string }>) => set('hari', { ...f.hari, [i]: { ...f.hari[i]!, ...v } });
  return (
    <PanelForm
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={jadwal ? `Ubah jadwal ${jadwal.nama}` : 'Jadwal kerja baru'}
      description="Jam masuk dan pulang per hari, jendela presensi, dan aturan bukti."
      berubah={berubah}
      onSimpan={async () => {
        const err: Record<string, string> = {};
        if (!f.nama.trim()) err.nama = 'Tulis nama jadwal.';
        if (!/^[A-Za-z0-9_.-]{2,40}$/.test(f.kode)) err.kode = 'Huruf, angka, titik, atau garis; 2-40 karakter.';
        if (!Object.values(f.hari).some((h) => h.aktif)) err.hari = 'Pilih minimal satu hari kerja.';
        if (f.jenis === 'fleksibel' && !(Number(f.min_kerja_menit) > 0)) err.min_kerja_menit = 'Isi lama kerja minimal.';
        setGalat(err);
        if (Object.keys(err).length) return false;
        const hari: Record<string, { masuk: string; pulang: string }> = {};
        for (const [i, h] of Object.entries(f.hari)) if (h.aktif) hari[i] = { masuk: h.masuk, pulang: h.pulang };
        try {
          const r = await siakad.request<JadwalKerja>({
            method: 'POST',
            path: jadwal ? `${P}/jadwal/${jadwal.uuid ?? jadwal.id}` : `${P}/jadwal`,
            body: {
              nama: f.nama.trim(),
              kode: f.kode,
              jenis: f.jenis,
              hari,
              toleransi_terlambat_menit: Number(f.toleransi_terlambat_menit) || 0,
              buka_masuk_menit: Number(f.buka_masuk_menit) || 0,
              batas_pulang_menit: Number(f.batas_pulang_menit) || 0,
              min_kerja_menit: f.jenis === 'fleksibel' ? Number(f.min_kerja_menit) : null,
              lintas_hari: f.lintas_hari,
              ikut_libur: f.ikut_libur,
              wajib_lokasi: f.wajib_lokasi,
              wajib_foto: f.wajib_foto,
              aktif: f.aktif,
              keterangan: f.keterangan.trim() || null,
            },
          });
          invalidateSiakad(KUNCI_CACHE);
          onSimpan?.(r.data);
        } catch (e) {
          return pesanGalatPresensiKerja(e);
        }
      }}
    >
      <div className="u-presensi-form">
        <div className="u-presensi-form-baris">
          <Field label="Nama" required error={galat.nama}>
            <Input value={f.nama} onChange={(e) => set('nama', e.target.value)} placeholder="Mis. Shift malam satpam" />
          </Field>
          <Field label="Kode" required error={galat.kode}>
            <Input value={f.kode} onChange={(e) => set('kode', e.target.value)} placeholder="shift-malam" />
          </Field>
        </div>
        <Field label="Jenis" description={f.jenis === 'fleksibel' ? 'Tidak ada jam terlambat; yang dihitung lama kerja.' : f.jenis === 'shift' ? 'Jam pulang boleh lebih kecil dari jam masuk (lewat tengah malam).' : undefined}>
          <SegmentedControl aria-label="Jenis jadwal" value={f.jenis} onValueChange={(v) => set('jenis', v)} options={Object.entries(LABEL_JENIS_JADWAL).map(([value, label]) => ({ value: value as JadwalKerja['jenis'], label }))} />
        </Field>
        <Field label="Hari dan jam kerja" error={galat.hari}>
          <div className="u-presensi-kerja-hari">
            {Object.entries(f.hari).map(([i, h]) => (
              <div key={i} className="u-presensi-kerja-hari-baris" data-libur={!h.aktif || undefined}>
                <label>
                  <Switch size="sm" checked={h.aktif} onCheckedChange={(v) => setHari(i, { aktif: v })} aria-label={`${NAMA_HARI[Number(i) - 1]} hari kerja`} />
                  {NAMA_HARI[Number(i) - 1]}
                </label>
                <IsianJam value={h.masuk || null} disabled={!h.aktif} aria-label={`Masuk ${NAMA_HARI[Number(i) - 1]}`} onValueChange={(v) => setHari(i, { masuk: v ?? '' })} />
                <span aria-hidden>–</span>
                <IsianJam value={h.pulang || null} disabled={!h.aktif} aria-label={`Pulang ${NAMA_HARI[Number(i) - 1]}`} onValueChange={(v) => setHari(i, { pulang: v ?? '' })} />
              </div>
            ))}
          </div>
        </Field>
        <div className="u-presensi-form-baris">
          {f.jenis === 'fleksibel' ? (
            <Field label="Lama kerja minimal (menit)" error={galat.min_kerja_menit}>
              <IsianAngka value={keAngka(f.min_kerja_menit)} min={30} max={1440} onValueChange={(n) => set('min_kerja_menit', teksAngka(n))} />
            </Field>
          ) : (
            <Field label="Toleransi terlambat (menit)">
              <IsianAngka value={keAngka(f.toleransi_terlambat_menit)} min={0} max={240} onValueChange={(n) => set('toleransi_terlambat_menit', teksAngka(n))} />
            </Field>
          )}
          <Field label="Masuk dibuka (menit sebelum)">
            <IsianAngka value={keAngka(f.buka_masuk_menit)} min={0} max={720} onValueChange={(n) => set('buka_masuk_menit', teksAngka(n))} />
          </Field>
          <Field label="Pulang ditutup (menit setelah)">
            <IsianAngka value={keAngka(f.batas_pulang_menit)} min={0} max={1080} onValueChange={(n) => set('batas_pulang_menit', teksAngka(n))} />
          </Field>
        </div>
        <div className="u-presensi-kerja-saklar-grid">
          <label className="u-presensi-kerja-saklar">
            <Switch size="sm" checked={f.lintas_hari} onCheckedChange={(v) => set('lintas_hari', v)} /> Lintas hari (shift malam)
          </label>
          <label className="u-presensi-kerja-saklar">
            <Switch size="sm" checked={f.ikut_libur} onCheckedChange={(v) => set('ikut_libur', v)} /> Libur di hari libur nasional
          </label>
          <label className="u-presensi-kerja-saklar">
            <Switch size="sm" checked={f.wajib_lokasi} onCheckedChange={(v) => set('wajib_lokasi', v)} /> Wajib di area presensi
          </label>
          <label className="u-presensi-kerja-saklar">
            <Switch size="sm" checked={f.wajib_foto} onCheckedChange={(v) => set('wajib_foto', v)} /> Wajib swafoto
          </label>
          <label className="u-presensi-kerja-saklar">
            <Switch size="sm" checked={f.aktif} onCheckedChange={(v) => set('aktif', v)} /> Aktif
          </label>
        </div>
        <Field label="Keterangan" optional>
          <Textarea rows={2} value={f.keterangan} onChange={(e) => set('keterangan', e.target.value)} />
        </Field>
      </div>
    </PanelForm>
  );
}

/** Kelola jadwal kerja (admin SDM). Jadwal bawaan berasal dari Pengaturan SDM dan hanya ditampilkan. */
export function KelolaJadwalKerja({ className }: { className?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useJadwalKerja();
  const [form, setForm] = React.useState<JadwalKerja | null | false>(false);
  const [hapus, setHapus] = React.useState<JadwalKerja | null>(null);
  const daftar = q.data ?? [];
  return (
    <div className={cn('u-presensi-kerja-kelola', className)}>
      <div className="u-presensi-alat">
        <p className="u-presensi-petunjuk">
          <Clock aria-hidden /> Pegawai tanpa penugasan memakai jam kerja bawaan dari Pengaturan SDM.
        </p>
        <Button onClick={() => setForm(null)}>
          <Plus aria-hidden /> Jadwal baru
        </Button>
      </div>
      {q.loading && !q.data ? (
        <Skeleton style={{ height: 200 }} />
      ) : q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : (
        <ul className="u-presensi-daftar-sesi">
          {daftar.map((j) => (
            <li key={j.uuid ?? j.kode} data-nonaktif={!j.aktif || undefined}>
              <div>
                <p className="u-presensi-sesi-judul">
                  {j.nama} {j.bawaan && <Badge>Bawaan</Badge>}
                </p>
                <p className="u-presensi-sesi-meta">
                  {LABEL_JENIS_JADWAL[j.jenis]} · {ringkasHari(j.hari)}
                  {j.jenis === 'fleksibel' && j.min_kerja_menit ? ` · min. ${Math.round(j.min_kerja_menit / 60)} jam` : ` · toleransi ${j.toleransi_terlambat_menit} menit`}
                  {j.wajib_foto ? ' · swafoto' : ''}
                  {!j.wajib_lokasi ? ' · tanpa batas lokasi' : ''}
                  {j.dipakai ? ` · ${j.dipakai} penugasan` : ''}
                </p>
              </div>
              {!j.bawaan && (
                <div className="u-presensi-sesi-aksi">
                  {!j.aktif && <Badge>Nonaktif</Badge>}
                  <Menu
                    trigger={
                      <Button size="xs" variant="ghost" iconOnly aria-label={`Aksi ${j.nama}`}>
                        <MoreHorizontal aria-hidden />
                      </Button>
                    }
                    items={[
                      { label: 'Ubah', icon: <Pencil aria-hidden />, onSelect: () => setForm(j) },
                      { type: 'separator' as const },
                      { label: 'Hapus', icon: <Trash2 aria-hidden />, destructive: true, onSelect: () => setHapus(j) },
                    ]}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <FormJadwalKerja open={form !== false} onOpenChange={(o) => !o && setForm(false)} jadwal={form || null} onSimpan={() => setForm(false)} />
      <ConfirmDialog
        open={!!hapus}
        onOpenChange={(o) => !o && setHapus(null)}
        title={`Hapus jadwal ${hapus?.nama ?? ''}?`}
        description="Jadwal yang masih dipakai penugasan tidak bisa dihapus; nonaktifkan atau akhiri penugasannya dulu."
        confirmLabel="Hapus jadwal"
        onConfirm={async () => {
          if (!hapus) return;
          try {
            await siakad.request({ method: 'POST', path: `${P}/jadwal/${hapus.uuid ?? hapus.id}/hapus` });
            invalidateSiakad(KUNCI_CACHE);
            toast.add({ title: `Jadwal ${hapus.nama} dihapus`, type: 'success' });
          } catch (e) {
            toast.add({ title: 'Jadwal belum terhapus', description: pesanGalatPresensiKerja(e), type: 'error' });
          }
        }}
      />
    </div>
  );
}

// ================================================================ Penugasan
const LABEL_SASARAN: Record<PenugasanPresensi['sasaran'], string> = { semua: 'Semua pegawai', jenis: 'Jenis pegawai', unit: 'Unit', pegawai: 'Satu pegawai' };

export function FormPenugasanPresensi({ open, onOpenChange, penugasan, onSimpan }: { open: boolean; onOpenChange: (o: boolean) => void; penugasan?: PenugasanPresensi | null; onSimpan?: () => void }) {
  const siakad = useSiakad();
  const jadwal = useJadwalKerja();
  const area = useAreaPresensi(false);
  const awal = React.useCallback(
    () => ({
      sasaran: penugasan?.sasaran ?? ('unit' as PenugasanPresensi['sasaran']),
      jenis_pegawai: penugasan?.jenis_pegawai ?? 'tendik',
      unit_id: penugasan?.unit_id != null ? String(penugasan.unit_id) : null,
      pegawai_id: penugasan?.pegawai_id != null ? String(penugasan.pegawai_id) : null,
      jadwal_id: penugasan?.jadwal_uuid ?? null,
      mode_lokasi: penugasan?.mode_lokasi ?? ('area' as PenugasanPresensi['mode_lokasi']),
      lokasi_ids: (penugasan?.lokasi_ids ?? []).map(String),
      mulai: penugasan?.mulai ?? new Date().toISOString().slice(0, 10),
      selesai: penugasan?.selesai ?? null,
      keterangan: penugasan?.keterangan ?? '',
    }),
    [penugasan],
  );
  const [f, setF] = React.useState(awal);
  const [berubah, setBerubah] = React.useState(false);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (open) {
      setF(awal());
      setBerubah(false);
      setGalat({});
    }
  }, [open, awal]);
  const set = <K extends keyof ReturnType<typeof awal>>(k: K, v: ReturnType<typeof awal>[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setBerubah(true);
  };
  const opsiArea = (area.data ?? []).filter((a) => !a.lama && a.id != null);
  return (
    <PanelForm
      open={open}
      onOpenChange={onOpenChange}
      title={penugasan ? 'Ubah penugasan' : 'Penugasan baru'}
      description="Siapa memakai jadwal dan area mana. Prioritas: pegawai, lalu unit terdekat, jenis pegawai, semua."
      berubah={berubah}
      onSimpan={async () => {
        const err: Record<string, string> = {};
        if (!f.jadwal_id) err.jadwal_id = 'Pilih jadwal.';
        if (f.sasaran === 'unit' && !f.unit_id) err.unit_id = 'Pilih unit.';
        if (f.sasaran === 'pegawai' && !f.pegawai_id) err.pegawai_id = 'Pilih pegawai.';
        if (f.selesai && f.selesai < f.mulai) err.selesai = 'Tanggal selesai sebelum mulai.';
        setGalat(err);
        if (Object.keys(err).length) return false;
        try {
          await siakad.request({
            method: 'POST',
            path: penugasan ? `${P}/penugasan/${penugasan.id}` : `${P}/penugasan`,
            body: {
              sasaran: f.sasaran,
              jenis_pegawai: f.sasaran === 'jenis' ? f.jenis_pegawai : null,
              unit_id: f.sasaran === 'unit' ? Number(f.unit_id) : null,
              pegawai_id: f.sasaran === 'pegawai' ? Number(f.pegawai_id) : null,
              jadwal_id: f.jadwal_id,
              mode_lokasi: f.mode_lokasi,
              lokasi_ids: f.mode_lokasi === 'area' && f.lokasi_ids.length ? f.lokasi_ids : null,
              mulai: f.mulai,
              selesai: f.selesai,
              keterangan: f.keterangan.trim() || null,
            },
          });
          invalidateSiakad(KUNCI_CACHE);
          onSimpan?.();
        } catch (e) {
          return pesanGalatPresensiKerja(e);
        }
      }}
    >
      <div className="u-presensi-form">
        <Field label="Berlaku untuk">
          <Pilihan required value={f.sasaran} onValueChange={(v) => v && set('sasaran', v as PenugasanPresensi['sasaran'])} options={Object.entries(LABEL_SASARAN).map(([value, label]) => ({ value, label }))} />
        </Field>
        {f.sasaran === 'jenis' && (
          <Field label="Jenis pegawai">
            <Pilihan
              required
              value={f.jenis_pegawai}
              onValueChange={(v) => v && set('jenis_pegawai', v as 'dosen' | 'tendik')}
              options={[
                { value: 'dosen', label: 'Dosen' },
                { value: 'tendik', label: 'Tendik' },
              ]}
            />
          </Field>
        )}
        {f.sasaran === 'unit' && (
          <Field label="Unit" required error={galat.unit_id} description="Termasuk unit di bawahnya.">
            <PilihUnit sumber="sdm" value={f.unit_id} onValueChange={(v) => set('unit_id', v == null ? null : String(v))} />
          </Field>
        )}
        {f.sasaran === 'pegawai' && (
          <Field label="Pegawai" required error={galat.pegawai_id}>
            <PilihEntitas jenis="pegawai" value={f.pegawai_id} onValueChange={(v) => set('pegawai_id', v == null ? null : String(v))} />
          </Field>
        )}
        <Field label="Jadwal" required error={galat.jadwal_id}>
          <Pilihan
            required
            value={f.jadwal_id}
            onValueChange={(v) => set('jadwal_id', v)}
            placeholder={jadwal.loading ? 'Memuat…' : 'Pilih jadwal'}
            options={(jadwal.data ?? []).filter((j) => !j.bawaan && j.uuid && j.aktif).map((j) => ({ value: j.uuid!, label: j.nama }))}
          />
        </Field>
        <Field label="Lokasi" description={f.mode_lokasi === 'bebas' ? 'Kerja jarak jauh: lokasi dicatat sebagai bukti, tanpa batas area.' : undefined}>
          <SegmentedControl
            aria-label="Mode lokasi"
            value={f.mode_lokasi}
            onValueChange={(v) => set('mode_lokasi', v)}
            options={[
              { value: 'area', label: 'Di area' },
              { value: 'bebas', label: 'Bebas (jarak jauh)' },
            ]}
          />
        </Field>
        {f.mode_lokasi === 'area' && (
          <Field label="Area" optional description="Kosong = area unit pegawai dan area untuk semua unit.">
            {opsiArea.length ? (
              <CheckboxGroup value={f.lokasi_ids} onValueChange={(v) => set('lokasi_ids', v)} options={opsiArea.map((a) => ({ value: String(a.id), label: a.nama, description: a.kampus ?? undefined }))} />
            ) : (
              <p className="u-presensi-petunjuk">Belum ada area presensi.</p>
            )}
          </Field>
        )}
        <div className="u-presensi-form-baris">
          <Field label="Mulai" required>
            <IsianTanggal value={f.mulai} onValueChange={(v) => set('mulai', v)} />
          </Field>
          <Field label="Selesai" optional error={galat.selesai}>
            <IsianTanggal value={f.selesai} onValueChange={(v) => set('selesai', v || null)} />
          </Field>
        </div>
        <Field label="Keterangan" optional>
          <Textarea rows={2} value={f.keterangan} onChange={(e) => set('keterangan', e.target.value)} />
        </Field>
      </div>
    </PanelForm>
  );
}

/** Kelola penugasan jadwal dan area (admin SDM). */
export function KelolaPenugasanPresensi({ className }: { className?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useSiakadQuery<PenugasanPresensi[]>([KUNCI_CACHE, 'penugasan'], (s, signal) => s.request<PenugasanPresensi[]>({ method: 'GET', path: `${P}/penugasan` }, { signal }), { staleTime: 30_000 });
  const [form, setForm] = React.useState<PenugasanPresensi | null | false>(false);
  const [hapus, setHapus] = React.useState<PenugasanPresensi | null>(null);
  const daftar = q.data ?? [];
  const sasaran = (p: PenugasanPresensi) => (p.sasaran === 'semua' ? 'Semua pegawai' : p.sasaran === 'jenis' ? (p.jenis_pegawai === 'dosen' ? 'Semua dosen' : 'Semua tendik') : p.sasaran === 'unit' ? (p.unit_nama ?? `Unit #${p.unit_id}`) : (p.pegawai_nama ?? `Pegawai #${p.pegawai_id}`));
  return (
    <div className={cn('u-presensi-kerja-kelola', className)}>
      <div className="u-presensi-alat">
        <p className="u-presensi-petunjuk">Penugasan paling spesifik yang berlaku pada tanggal itu yang dipakai.</p>
        <Button onClick={() => setForm(null)}>
          <Plus aria-hidden /> Penugasan baru
        </Button>
      </div>
      {q.loading && !q.data ? (
        <Skeleton style={{ height: 200 }} />
      ) : q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : daftar.length === 0 ? (
        <Empty bordered icon={<Clock aria-hidden />} title="Belum ada penugasan" description="Semua pegawai memakai jam kerja bawaan dan area unitnya." actions={<Button onClick={() => setForm(null)}>Buat penugasan</Button>} />
      ) : (
        <DataTable<(typeof daftar)[number]>
          columns={[
            {
              key: 'sasaran',
              header: 'Untuk',
              mobile: 'title',
              value: (p) => sasaran(p),
              cell: (p) => (
                <>
                  <span className="u-presensi-nama">{sasaran(p)}</span>
                  <span className="u-presensi-sub">{LABEL_SASARAN[p.sasaran]}</span>
                </>
              ),
            },
            { key: 'jadwal_nama', header: 'Jadwal', cell: (p) => p.jadwal_nama ?? '–' },
            {
              key: 'lokasi',
              header: 'Lokasi',
              value: (p) => (p.mode_lokasi === 'bebas' ? 'Jarak jauh' : (p.lokasi_nama ?? []).join(', ')),
              cell: (p) => (p.mode_lokasi === 'bebas' ? <Badge variant="info">Jarak jauh</Badge> : p.lokasi_nama?.length ? p.lokasi_nama.join(', ') : <span className="u-presensi-sub">Area unit</span>),
            },
            { key: 'mulai', header: 'Berlaku', value: (p) => p.mulai, cell: (p) => `${tanggalPendek(p.mulai)} – ${p.selesai ? tanggalPendek(p.selesai) : 'seterusnya'}` },
          ]}
          rows={daftar}
          rowKey={(p) => String(p.id)}
          rowActions={(p) => [
            { label: 'Ubah', icon: <Pencil aria-hidden />, onSelect: () => setForm(p) },
            { type: 'separator' as const },
            { label: 'Hapus', icon: <Trash2 aria-hidden />, destructive: true, onSelect: () => setHapus(p) },
          ]}
          pagination={false}
          defaultDensity="compact"
        />
      )}
      <FormPenugasanPresensi open={form !== false} onOpenChange={(o) => !o && setForm(false)} penugasan={form || null} onSimpan={() => setForm(false)} />
      <ConfirmDialog
        open={!!hapus}
        onOpenChange={(o) => !o && setHapus(null)}
        title="Hapus penugasan ini?"
        description={hapus ? `${sasaran(hapus)} kembali memakai penugasan yang lebih umum atau jam kerja bawaan.` : undefined}
        confirmLabel="Hapus penugasan"
        onConfirm={async () => {
          if (!hapus) return;
          try {
            await siakad.request({ method: 'POST', path: `${P}/penugasan/${hapus.id}/hapus` });
            invalidateSiakad(KUNCI_CACHE);
            toast.add({ title: 'Penugasan dihapus', type: 'success' });
          } catch (e) {
            toast.add({ title: 'Penugasan belum terhapus', description: pesanGalatPresensiKerja(e), type: 'error' });
          }
        }}
      />
    </div>
  );
}

// ================================================================ Perangkat
/** Perangkat presensi: `saya` (lepas perangkat sendiri) atau `kelola` (petugas SDM: setujui, blokir, lepas). */
export function DaftarPerangkatPresensi({ sebagai = 'saya', className }: { sebagai?: 'saya' | 'kelola'; className?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [status, setStatus] = React.useState<'' | PerangkatPresensi['status']>(sebagai === 'kelola' ? 'menunggu' : '');
  const query = { sebagai, status: status || undefined };
  const q = useSiakadQuery<PerangkatPresensi[]>([KUNCI_CACHE, 'perangkat', query], (s, signal) => s.request<PerangkatPresensi[]>({ method: 'GET', path: `${P}/perangkat`, query }, { signal }), { staleTime: 15_000 });
  const ini = React.useMemo(() => (typeof window === 'undefined' ? null : idPerangkatPresensi()), []);
  const ubah = async (p: PerangkatPresensi, st: 'aktif' | 'diblokir' | 'lepas') => {
    try {
      await siakad.request({ method: 'POST', path: `${P}/perangkat/${p.id}`, body: { status: st } });
      invalidateSiakad(KUNCI_CACHE);
      toast.add({ title: st === 'aktif' ? 'Perangkat disetujui' : st === 'diblokir' ? 'Perangkat diblokir' : 'Perangkat dilepas', type: 'success' });
    } catch (e) {
      toast.add({ title: 'Perangkat belum diubah', description: pesanGalatPresensiKerja(e), type: 'error' });
    }
  };
  const daftar = q.data ?? [];
  return (
    <div className={cn('u-presensi-kerja-kelola', className)}>
      {sebagai === 'kelola' && (
        <div className="u-presensi-alat">
          <SegmentedControl
            aria-label="Status perangkat"
            value={status || 'semua'}
            onValueChange={(v) => setStatus(v === 'semua' ? '' : (v as PerangkatPresensi['status']))}
            options={[
              { value: 'menunggu', label: 'Menunggu' },
              { value: 'aktif', label: 'Aktif' },
              { value: 'diblokir', label: 'Diblokir' },
              { value: 'semua', label: 'Semua' },
            ]}
          />
        </div>
      )}
      {q.loading && !q.data ? (
        <Skeleton style={{ height: 160 }} />
      ) : q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : daftar.length === 0 ? (
        <Empty bordered icon={<Smartphone aria-hidden />} title={sebagai === 'saya' ? 'Belum ada perangkat terdaftar' : 'Tidak ada perangkat'} description={sebagai === 'saya' ? 'Perangkat terdaftar otomatis saat pertama kali presensi.' : undefined} />
      ) : (
        <ul className="u-presensi-daftar-sesi">
          {daftar.map((p) => (
            <li key={p.id} data-nonaktif={p.status === 'diblokir' || undefined}>
              <div>
                <p className="u-presensi-sesi-judul">
                  {sebagai === 'kelola' ? `${p.pegawai_nama ?? `#${p.pegawai_id}`} · ` : ''}
                  {p.nama ?? p.platform ?? 'Perangkat'}
                  {p.perangkat === ini && sebagai === 'saya' ? ' (perangkat ini)' : ''}
                </p>
                <p className="u-presensi-sesi-meta">
                  {p.platform ?? '–'}
                  {p.versi_app ? ` · versi ${p.versi_app}` : ''} · terakhir {p.terakhir_at?.slice(0, 16) ?? '–'}
                  {(p.dipakai_pegawai ?? 1) > 1 ? ` · dipakai ${p.dipakai_pegawai} pegawai` : ''}
                </p>
              </div>
              <div className="u-presensi-sesi-aksi">
                <Badge variant={LABEL_STATUS_PERANGKAT[p.status][1]}>{LABEL_STATUS_PERANGKAT[p.status][0]}</Badge>
                {sebagai === 'kelola' && p.status !== 'aktif' && (
                  <Button size="xs" onClick={() => ubah(p, 'aktif')}>
                    Setujui
                  </Button>
                )}
                <Menu
                  trigger={
                    <Button size="xs" variant="ghost" iconOnly aria-label="Aksi perangkat">
                      <MoreHorizontal aria-hidden />
                    </Button>
                  }
                  items={[
                    ...(sebagai === 'kelola' && p.status !== 'diblokir' ? [{ label: 'Blokir', icon: <Ban aria-hidden />, onSelect: () => ubah(p, 'diblokir') }] : []),
                    { label: 'Lepas perangkat', icon: <Trash2 aria-hidden />, destructive: true, onSelect: () => ubah(p, 'lepas') },
                  ]}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ================================================================ Koreksi
export function FormKoreksiPresensi({ open, onOpenChange, kejadian, tanggal, onSimpan }: { open: boolean; onOpenChange: (o: boolean) => void; kejadian?: KejadianPresensi | null; tanggal?: string; onSimpan?: () => void }) {
  const siakad = useSiakad();
  const awal = React.useCallback(() => {
    const tgl = kejadian?.tanggal ?? tanggal ?? new Date().toISOString().slice(0, 10);
    return {
      tanggal: tgl,
      jenis: (kejadian?.tanggal ? 'luar_area' : 'lupa_masuk') as JenisKoreksiPresensi,
      jam_masuk: kejadian?.aksi === 'masuk' ? kejadian.waktu.slice(11, 16) : '',
      jam_pulang: kejadian?.aksi === 'pulang' ? kejadian.waktu.slice(11, 16) : '',
      pulang_esok: false,
      alasan: '',
      berkas_id: null as string | null,
    };
  }, [kejadian, tanggal]);
  const [f, setF] = React.useState(awal);
  const [berubah, setBerubah] = React.useState(false);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (open) {
      setF(awal());
      setBerubah(false);
      setGalat({});
    }
  }, [open, awal]);
  const set = <K extends keyof ReturnType<typeof awal>>(k: K, v: ReturnType<typeof awal>[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setBerubah(true);
  };
  const tanggalPulang = () => {
    if (!f.pulang_esok) return f.tanggal;
    const d = new Date(`${f.tanggal}T00:00:00`);
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  return (
    <PanelForm
      open={open}
      onOpenChange={onOpenChange}
      title="Ajukan koreksi presensi"
      description="Untuk lupa presensi, jam tercatat salah, atau tugas di luar area. Diputuskan atasan langsung atau petugas SDM."
      berubah={berubah}
      labelSimpan="Ajukan"
      onSimpan={async () => {
        const err: Record<string, string> = {};
        if (!f.jam_masuk && !f.jam_pulang) err.jam = 'Isi jam masuk, jam pulang, atau keduanya.';
        if (f.alasan.trim().length < 5) err.alasan = 'Jelaskan alasannya (minimal 5 karakter).';
        setGalat(err);
        if (Object.keys(err).length) return false;
        try {
          await siakad.request({
            method: 'POST',
            path: `${P}/koreksi`,
            body: {
              tanggal: f.tanggal,
              jenis: f.jenis,
              jam_masuk: f.jam_masuk ? `${f.tanggal} ${f.jam_masuk}` : null,
              jam_pulang: f.jam_pulang ? `${tanggalPulang()} ${f.jam_pulang}` : null,
              alasan: f.alasan.trim(),
              berkas_id: f.berkas_id,
              kejadian_id: kejadian?.id ?? null,
            },
          });
          invalidateSiakad(KUNCI_CACHE);
          onSimpan?.();
        } catch (e) {
          return pesanGalatPresensiKerja(e);
        }
      }}
    >
      <div className="u-presensi-form">
        <div className="u-presensi-form-baris">
          <Field label="Tanggal kerja" required>
            <IsianTanggal value={f.tanggal} onValueChange={(v) => v && set('tanggal', v)} max={new Date().toISOString().slice(0, 10)} />
          </Field>
          <Field label="Jenis">
            <Pilihan required tampilan="cari" value={f.jenis} onValueChange={(v) => v && set('jenis', v as JenisKoreksiPresensi)} options={Object.entries(LABEL_JENIS_KOREKSI).map(([value, label]) => ({ value, label }))} />
          </Field>
        </div>
        <div className="u-presensi-form-baris">
          <Field label="Jam masuk" optional error={galat.jam}>
            <IsianJam value={f.jam_masuk || null} onValueChange={(v) => set('jam_masuk', v ?? '')} />
          </Field>
          <Field label="Jam pulang" optional>
            <IsianJam value={f.jam_pulang || null} onValueChange={(v) => set('jam_pulang', v ?? '')} />
          </Field>
        </div>
        <label className="u-presensi-kerja-saklar">
          <Switch size="sm" checked={f.pulang_esok} onCheckedChange={(v) => set('pulang_esok', v)} /> Pulang esok hari (shift malam)
        </label>
        <Field label="Alasan" required error={galat.alasan}>
          <Textarea rows={3} value={f.alasan} onChange={(e) => set('alasan', e.target.value)} placeholder="Mis. ponsel tertinggal, rapat di kantor Bupati." />
        </Field>
        <Field label="Bukti" optional description="Surat tugas, foto kegiatan, atau tangkapan layar galat.">
          <PilihBerkas value={f.berkas_id} onValueChange={(id) => set('berkas_id', id)} accept=".pdf,.jpg,.jpeg,.png" kategori="presensi" modul="sdm" />
        </Field>
      </div>
    </PanelForm>
  );
}

/** Daftar koreksi presensi: `saya` (ajukan, batalkan) atau `penyetuju` (setujui/tolak). */
export function KoreksiPresensiKerja({ sebagai = 'saya', className }: { sebagai?: 'saya' | 'penyetuju'; className?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [status, setStatus] = React.useState<'' | KoreksiPresensi['status']>(sebagai === 'penyetuju' ? 'diajukan' : '');
  const [hal, setHal] = React.useState(1);
  const [form, setForm] = React.useState(false);
  const [putus, setPutus] = React.useState<{ k: KoreksiPresensi; aksi: 'setujui' | 'tolak' } | null>(null);
  const [catatan, setCatatan] = React.useState('');
  const query = { sebagai, status: status || undefined, page: hal, per_page: 20 };
  const q = useSiakadQuery<KoreksiPresensi[]>([KUNCI_CACHE, 'koreksi', query], (s, signal) => s.request<KoreksiPresensi[]>({ method: 'GET', path: `${P}/koreksi`, query }, { signal }), { staleTime: 15_000 });
  const daftar = q.data ?? [];
  const proses = async (k: KoreksiPresensi, aksi: 'setujui' | 'tolak' | 'batal', cat?: string) => {
    await siakad.request({ method: 'POST', path: `${P}/koreksi/${k.id}/${aksi}`, body: cat ? { catatan: cat } : {} });
    invalidateSiakad(KUNCI_CACHE);
    toast.add({ title: aksi === 'setujui' ? 'Koreksi disetujui; presensi diperbarui' : aksi === 'tolak' ? 'Koreksi ditolak' : 'Pengajuan dibatalkan', type: aksi === 'setujui' ? 'success' : 'info' });
  };
  return (
    <div className={cn('u-presensi-kerja-kelola', className)}>
      <div className="u-presensi-alat">
        <SegmentedControl
          aria-label="Status koreksi"
          value={status || 'semua'}
          onValueChange={(v) => {
            setStatus(v === 'semua' ? '' : (v as KoreksiPresensi['status']));
            setHal(1);
          }}
          options={[
            { value: 'diajukan', label: 'Diajukan' },
            { value: 'disetujui', label: 'Disetujui' },
            { value: 'ditolak', label: 'Ditolak' },
            { value: 'semua', label: 'Semua' },
          ]}
        />
        {sebagai === 'saya' && (
          <Button onClick={() => setForm(true)}>
            <Plus aria-hidden /> Ajukan koreksi
          </Button>
        )}
      </div>
      {q.loading && !q.data ? (
        <Skeleton style={{ height: 160 }} />
      ) : q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : daftar.length === 0 ? (
        <Empty bordered icon={<Hourglass aria-hidden />} title={sebagai === 'penyetuju' ? 'Tidak ada koreksi yang perlu diputuskan' : 'Belum ada pengajuan koreksi'} />
      ) : (
        <ul className="u-presensi-daftar-sesi">
          {daftar.map((k) => (
            <li key={k.id}>
              <div>
                <p className="u-presensi-sesi-judul">
                  {sebagai === 'penyetuju' ? `${k.pegawai_nama ?? `#${k.pegawai_id}`} · ` : ''}
                  {tanggalPanjang(k.tanggal)} · {LABEL_JENIS_KOREKSI[k.jenis]}
                </p>
                <p className="u-presensi-sesi-meta">
                  Diajukan masuk {jam(k.jam_masuk)}, pulang {jam(k.jam_pulang)} · tercatat masuk {jam(k.presensi_masuk)}, pulang {jam(k.presensi_pulang)}
                </p>
                <p className="u-presensi-sesi-meta">{k.alasan}</p>
                {k.catatan_keputusan && <p className="u-presensi-sesi-meta">Catatan: {k.catatan_keputusan}</p>}
              </div>
              <div className="u-presensi-sesi-aksi">
                <Badge variant={LABEL_STATUS_KOREKSI[k.status][1]}>{LABEL_STATUS_KOREKSI[k.status][0]}</Badge>
                {sebagai === 'penyetuju' && k.status === 'diajukan' && k.bisa_putuskan && (
                  <>
                    <Button size="xs" variant="destructive-soft" onClick={() => (setCatatan(''), setPutus({ k, aksi: 'tolak' }))}>
                      Tolak
                    </Button>
                    <Button size="xs" onClick={() => (setCatatan(''), setPutus({ k, aksi: 'setujui' }))}>
                      Setujui
                    </Button>
                  </>
                )}
                {sebagai === 'saya' && k.status === 'diajukan' && (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => proses(k, 'batal').catch((e) => toast.add({ title: 'Belum dibatalkan', description: pesanGalatPresensiKerja(e), type: 'error' }))}
                  >
                    Batalkan
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {(q.meta?.total_pages ?? 1) > 1 && <Pagination page={hal} totalPages={q.meta?.total_pages ?? 1} onPageChange={setHal} compact />}
      <FormKoreksiPresensi open={form} onOpenChange={setForm} onSimpan={() => setForm(false)} />
      <ConfirmDialog
        open={!!putus}
        onOpenChange={(o) => !o && setPutus(null)}
        tone={putus?.aksi === 'tolak' ? 'danger' : 'primary'}
        title={putus?.aksi === 'setujui' ? 'Setujui koreksi?' : 'Tolak koreksi?'}
        description={putus ? `${putus.k.pegawai_nama ?? ''} · ${tanggalPanjang(putus.k.tanggal)}. ${putus.aksi === 'setujui' ? 'Jam presensi diganti sesuai pengajuan.' : ''}` : undefined}
        confirmLabel={putus?.aksi === 'setujui' ? 'Setujui' : 'Tolak'}
        onConfirm={async () => {
          if (!putus) return;
          if (putus.aksi === 'tolak' && !catatan.trim()) {
            toast.add({ title: 'Tulis alasan penolakan', type: 'error' });
            throw new Error('catatan');
          }
          try {
            await proses(putus.k, putus.aksi, catatan.trim() || undefined);
          } catch (e) {
            toast.add({ title: 'Keputusan belum tersimpan', description: pesanGalatPresensiKerja(e), type: 'error' });
          }
        }}
      >
        <Field label="Catatan" optional={putus?.aksi === 'setujui'} required={putus?.aksi === 'tolak'}>
          <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        </Field>
      </ConfirmDialog>
    </div>
  );
}

// ================================================================ Modul siap pakai
/** Halaman presensi kerja pegawai: hari ini, riwayat, koreksi, perangkat. */
export function ModulPresensiKerjaSaya({ perangkat, className }: { perangkat?: PresensiKerjaSayaProps['perangkat']; className?: string }) {
  const [tab, setTab] = React.useState<'hari-ini' | 'riwayat' | 'koreksi' | 'perangkat'>('hari-ini');
  const tombol: Array<{ value: typeof tab; label: string; icon: React.ReactNode }> = [
    { value: 'hari-ini', label: 'Hari ini', icon: <MapPin aria-hidden /> },
    { value: 'riwayat', label: 'Riwayat', icon: <Clock aria-hidden /> },
    { value: 'koreksi', label: 'Koreksi', icon: <RefreshCw aria-hidden /> },
    { value: 'perangkat', label: 'Perangkat', icon: <Smartphone aria-hidden /> },
  ];
  return (
    <div className={cn('u-presensi-kerja-modul', className)}>
      <SegmentedControl aria-label="Bagian presensi" value={tab} onValueChange={setTab} options={tombol.map((t) => ({ value: t.value, label: t.label, icon: t.icon }))} />
      {tab === 'hari-ini' && <PresensiKerjaSaya perangkat={perangkat} />}
      {tab === 'riwayat' && <RiwayatPresensiKerja sebagai="saya" />}
      {tab === 'koreksi' && <KoreksiPresensiKerja sebagai="saya" />}
      {tab === 'perangkat' && <DaftarPerangkatPresensi sebagai="saya" />}
    </div>
  );
}
