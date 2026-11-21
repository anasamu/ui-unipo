'use client';
import * as React from 'react';
import {
  BadgeCheck,
  Ban,
  Camera,
  CameraOff,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Clock,
  DoorOpen,
  FileText,
  History,
  KeyRound,
  ListChecks,
  LocateFixed,
  MapPin,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  QrCode,
  ScanLine,
  ShieldAlert,
  Square,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Card, DescriptionList, Empty, Progress, Table, TableContainer, Tabs } from '../components/display';
import { Field, Input, SegmentedControl, Switch, Textarea } from '../components/forms';
import { IsianTanggal, PanelForm, Pilihan } from '../components/formulir';
import { ConfirmDialog, Dialog, Menu, useToast } from '../components/overlays';
import type { SelectOption } from '../components/select';
import { useAkunSaya } from './akun';
import { GalatApi } from './galat';
import { PilihEntitas, type SumberEntitas } from './pilih';
import { PilihBerkas } from './pilih-berkas';
import { KodeQrSiakad } from './qr';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { PilihLokasiPeta, titikDariTeks } from '../components/peta';
import { IsianJam, IsianAngka } from '../components/isian-angka';
import { keAngka, teksAngka } from '../lib/angka';

/*
 * Presensi QR (/v1/presensi) untuk mahasiswa (kuliah), dosen (mengajar dan kerja), tendik (kerja), dan kegiatan.
 * QR berganti setiap `interval_detik` dan ditandatangani server; komponen di sini hanya menampilkan isi QR terbaru,
 * memindai, dan mengelola sesi. Sesi kuliah yang ditutup disahkan ke presensi SIAKAD (t_dosen_presensi,
 * t_mahasiswa_presensi) dan disalin ke kelas LMS bila ada; titik kerja menulis ke presensi SDM.
 */

// ================================================================ Tipe
export type StatusSesiPresensi = 'draf' | 'buka' | 'tutup' | 'disahkan' | 'batal';
export type StatusHadir = 'H' | 'I' | 'S' | 'A';
export type JenisSubjekPresensi = 'mahasiswa' | 'dosen' | 'tendik';
export type PesertaSesiPresensi = 'kelas' | 'undangan' | 'terbuka' | 'mahasiswa' | 'pegawai';

export interface RingkasanPresensi {
  peserta: number | null;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  terlambat: number;
  curiga: number;
  belum: number | null;
  persen_hadir: number | null;
}

export interface SesiPresensi {
  id: string;
  jenis: 'kuliah' | 'kegiatan';
  judul: string;
  keterangan: string | null;
  status: StatusSesiPresensi;
  tanggal: string;
  mulai_at: string | null;
  selesai_at: string | null;
  dibuka_at: string | null;
  ditutup_at: string | null;
  kuliah: {
    idj: number;
    kode_prodi: string;
    tahun_id: string;
    kode_mk: string;
    kelas: string;
    nidn: string | null;
    jam: number | null;
    jam_selesai: number | null;
    lama: number;
    bahasan: string | null;
    siakad_iddm: number | null;
    lms_kelas_id: number | null;
    lms_sesi_id: number | null;
  } | null;
  peserta: PesertaSesiPresensi;
  unit: string | null;
  interval_detik: number;
  pakai_kode: boolean;
  izinkan_kartu: boolean;
  terlambat_menit: number | null;
  lokasi: { lat: number; lng: number; radius_m: number; wajib: boolean } | null;
  tolak_perangkat_ganda: boolean;
  status_kosong: 'A' | 'I' | 'S';
  jumlah_hadir: number | null;
  disahkan_at: string | null;
  disahkan_oleh: string | null;
  dibuat_oleh: string | null;
  created_at: string;
  /** Hanya di detail. */
  hak?: { kelola: boolean; bantu: boolean };
  ringkasan?: RingkasanPresensi;
  kode?: string | null;
  petugas?: string[];
}

export interface QrPresensi {
  token: string;
  /** Isi yang dijadikan gambar QR (token mentah, atau URL `...?t=` bila PRESENSI_URL diisi). */
  isi: string;
  jendela: number;
  berlaku_sampai: string;
  sisa_detik: number;
  interval_detik: number;
  gaya: { kode: 'presensi'; bagian: string | null };
  /** SVG dari generator QR SIAKAD (bila diminta dengan `svg=1` dan modul QR terpasang). */
  svg?: string | null;
  kode?: string | null;
  ringkasan?: RingkasanPresensi;
  terbaru?: Array<{ jenis: JenisSubjekPresensi; subjek: string; nama: string | null; waktu: string; cara: string; terlambat: number | boolean; curiga: number | boolean }>;
  peringatan?: string;
  titik?: TitikPresensi;
  hari_ini?: { masuk: number; pulang: number };
  pemilik?: { jenis: JenisSubjekPresensi; subjek: string };
}

export interface HadirPresensi {
  jenis: JenisSubjekPresensi | null;
  subjek: string | null;
  nama: string | null;
  status: StatusHadir | null;
  waktu: string | null;
  cara: string | null;
  terlambat: boolean;
  terlambat_menit: number;
  jarak_m: number | null;
  curiga: boolean;
}

export interface HasilPindaiPresensi {
  pesan: string;
  sudah?: boolean;
  hadir?: HadirPresensi;
  sesi?: { id: string; jenis: 'kuliah' | 'kegiatan'; judul: string; tanggal: string; kelas: string | null; kode_mk: string | null };
  /** Titik kerja. */
  aksi?: 'masuk' | 'pulang';
  titik?: { id: string; kode: string; nama: string };
}

export interface PesertaPresensi {
  jenis: JenisSubjekPresensi;
  subjek: string;
  nama: string | null;
  peran?: string | null;
  status: StatusHadir | null;
  waktu: string | null;
  cara: string | null;
  terlambat: boolean;
  terlambat_menit: number;
  jarak_m: number | null;
  curiga: boolean;
  alasan_curiga: string | null;
  catatan: string | null;
  dicatat_oleh: string | null;
  izin: { id: string; jenis: 'izin' | 'sakit'; status: string } | null;
}

export interface DaftarPesertaPresensi {
  sesi: SesiPresensi;
  ringkasan: RingkasanPresensi;
  peserta: PesertaPresensi[];
  pengajar: PesertaPresensi[];
}

export interface IzinPresensi {
  id: string;
  sesi_id: string | null;
  sesi_judul: string | null;
  idj: number | null;
  tanggal: string | null;
  jenis_subjek: JenisSubjekPresensi;
  subjek: string;
  nama: string | null;
  jenis: 'izin' | 'sakit';
  alasan: string;
  berkas_id: string | null;
  status: 'diajukan' | 'disetujui' | 'ditolak' | 'batal';
  diproses_oleh: string | null;
  diproses_at: string | null;
  catatan_proses: string | null;
  created_at: string;
}

export interface TitikPresensi {
  id: string;
  kode: string;
  nama: string;
  jenis: 'gerbang' | 'kantor' | 'ruang' | 'lainnya';
  untuk: 'pegawai' | 'dosen' | 'tendik';
  unit: string | null;
  lokasi: { lat: number; lng: number; radius_m: number } | null;
  wajib_lokasi: boolean;
  interval_detik: number;
  aktif: boolean;
  keterangan: string | null;
  updated_at: string;
}

export interface PresensiSayaData {
  pemilik: { jenis: JenisSubjekPresensi; subjek: string };
  berlangsung: Array<SesiPresensi & { saya: { status: StatusHadir; waktu: string } | null }>;
  riwayat: Array<{
    sesi_id: string;
    jenis: 'kuliah' | 'kegiatan';
    judul: string;
    tanggal: string;
    kode_mk: string | null;
    kelas: string | null;
    status_sesi: StatusSesiPresensi;
    status: StatusHadir;
    waktu: string;
    cara: string;
    terlambat: boolean;
    terlambat_menit: number;
  }>;
}

export interface LogPindaiPresensi {
  subjek: string | null;
  cara?: string;
  hasil: 'ok' | 'ditolak';
  alasan: string | null;
  ip: string | null;
  perangkat: string | null;
  created_at: string;
}

/** Fungsi gambar QR dari aplikasi (mis. generator QR bergaya). Bawaan: SVG dari server bila tersedia. */
export type RenderQrPresensi = (isi: string, opsi: { ukuran: number; gaya: QrPresensi['gaya'] }) => React.ReactNode;

const P = '/v1/presensi';

// ================================================================ Label
export const LABEL_STATUS_HADIR: Record<StatusHadir, string> = { H: 'Hadir', I: 'Izin', S: 'Sakit', A: 'Alpa' };
const VARIAN_HADIR: Record<StatusHadir, 'success' | 'info' | 'warning' | 'danger'> = { H: 'success', I: 'info', S: 'warning', A: 'danger' };
export const LABEL_STATUS_SESI: Record<StatusSesiPresensi, string> = { draf: 'Draf', buka: 'Dibuka', tutup: 'Ditutup', disahkan: 'Disahkan', batal: 'Batal' };
const VARIAN_SESI: Record<StatusSesiPresensi, 'neutral' | 'success' | 'warning' | 'primary' | 'danger'> = {
  draf: 'neutral',
  buka: 'success',
  tutup: 'warning',
  disahkan: 'primary',
  batal: 'danger',
};
const LABEL_CARA: Record<string, string> = { qr: 'QR', kode: 'Kode', kartu: 'Kartu', manual: 'Manual', izin: 'Izin', buka: 'Membuka sesi' };
const LABEL_PESERTA: Record<PesertaSesiPresensi, string> = {
  kelas: 'Peserta KRS kelas',
  undangan: 'Daftar undangan',
  terbuka: 'Semua pengguna',
  mahasiswa: 'Semua mahasiswa',
  pegawai: 'Semua dosen dan tendik',
};

const jam = (w?: string | null) => (w ? w.slice(11, 16) : '');
function tanggalPanjang(t?: string | null): string {
  if (!t) return '';
  const d = new Date(`${t.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return t;
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** Lencana status kehadiran peserta (H hadir, I izin, S sakit, A alpa), dengan tanda terlambat. */
export function BadgeStatusHadir({ status, terlambat }: { status: StatusHadir | null | undefined; terlambat?: boolean }) {
  if (!status) return <Badge variant="outline">Belum</Badge>;
  return (
    <Badge variant={VARIAN_HADIR[status]} dot>
      {LABEL_STATUS_HADIR[status]}
      {terlambat && status === 'H' ? ', terlambat' : ''}
    </Badge>
  );
}

/** Lencana status sesi presensi (draf, dibuka, ditutup, disahkan, batal). */
export function BadgeStatusSesi({ status }: { status: StatusSesiPresensi }) {
  return (
    <Badge variant={VARIAN_SESI[status]} dot={status === 'buka'}>
      {LABEL_STATUS_SESI[status]}
    </Badge>
  );
}

/** Judul ringkas sesi: "Algoritma, kelas 01" untuk kuliah, judul kegiatan untuk lainnya. */
export function judulSesiPresensi(s: Pick<SesiPresensi, 'judul' | 'kuliah'>): string {
  return s.judul + (s.kuliah?.kelas ? `, kelas ${s.kuliah.kelas}` : '');
}

/**
 * Pesan galat presensi. Galat yang punya kode (qr_kedaluwarsa, di_luar_lokasi, lokasi_wajib, perangkat_ganda,
 * sesi_tidak_dibuka) dan galat isian 422 memakai pesan server yang sudah menjelaskan langkah berikutnya.
 */
export function pesanGalatPresensi(e: unknown): string {
  const err = e as { status?: number; code?: string; message?: string; details?: Record<string, unknown> } | null;
  if (err?.status === 422 && err.details) {
    const isi = Object.values((err.details.fields ?? err.details) as Record<string, unknown>).find((v) => typeof v === 'string');
    if (typeof isi === 'string') return isi;
  }
  if (err?.code && ['qr_kedaluwarsa', 'di_luar_lokasi', 'lokasi_wajib', 'perangkat_ganda', 'sesi_tidak_dibuka', 'bukan_peserta'].includes(err.code) && err.message) return err.message;
  if ((err?.status === 403 || err?.status === 409) && err.message && err.code !== 'insufficient_scope') return err.message;
  return pesanGalat(e);
}

// ================================================================ Perangkat dan lokasi
const KUNCI_PERANGKAT = 'unipo-presensi-perangkat';

/** ID acak per instalasi peramban/aplikasi (disimpan di localStorage), dikirim sebagai `perangkat` saat memindai. */
export function idPerangkatPresensi(): string {
  try {
    const ada = localStorage.getItem(KUNCI_PERANGKAT);
    if (ada) return ada;
    const baru = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(KUNCI_PERANGKAT, baru);
    return baru;
  } catch {
    return 'tanpa-penyimpanan';
  }
}

/** Lokasi sekarang sebagai "lat,lng" (null bila ditolak/tidak tersedia). */
export function ambilLokasiPresensi(batasMs = 8000): Promise<string | null> {
  return new Promise((selesai) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return selesai(null);
    navigator.geolocation.getCurrentPosition(
      (p) => selesai(`${p.coords.latitude.toFixed(7)},${p.coords.longitude.toFixed(7)}`),
      () => selesai(null),
      { enableHighAccuracy: true, timeout: batasMs, maximumAge: 30_000 },
    );
  });
}

/** Token dari tautan `...?t=<token>` (QR dibuka dengan kamera ponsel biasa). */
export function tokenPresensiDariUrl(url?: string): string | null {
  try {
    const u = new URL(url ?? (typeof location !== 'undefined' ? location.href : ''));
    return u.searchParams.get('t');
  } catch {
    return null;
  }
}

// ================================================================ QR berganti
/**
 * Ambil QR dari endpoint presensi (`/sesi/{id}/qr`, `/titik/{id}/qr`, `/kartu`) dan ambil ulang tepat saat QR
 * berganti (`sisa_detik`). `sisa` menghitung mundur per detik untuk bilah waktu.
 */
export function useQrBerganti(path: string | null, opsi: { /** Minta SVG dari server juga (bawaan tidak; QR digambar di browser). */ svg?: boolean; aktif?: boolean } = {}) {
  const siakad = useSiakad();
  const { svg = false, aktif = true } = opsi;
  const [data, setData] = React.useState<QrPresensi | null>(null);
  const [error, setError] = React.useState<unknown>(null);
  const [sisa, setSisa] = React.useState(0);
  const [putaran, setPutaran] = React.useState(0);

  React.useEffect(() => {
    if (!path || !aktif) return;
    const ctrl = new AbortController();
    let waktu: ReturnType<typeof setTimeout> | undefined;
    siakad
      .request<QrPresensi>({ method: 'GET', path, query: svg ? { svg: 1 } : {} }, { signal: ctrl.signal })
      .then((r) => {
        setData(r.data);
        setError(null);
        setSisa(r.data.sisa_detik);
        waktu = setTimeout(() => setPutaran((n) => n + 1), Math.max(1, r.data.sisa_detik) * 1000 + 150);
      })
      .catch((e: Error) => {
        if (ctrl.signal.aborted || e?.name === 'AbortError') return;
        setError(e);
        waktu = setTimeout(() => setPutaran((n) => n + 1), 5000);
      });
    return () => {
      ctrl.abort();
      if (waktu) clearTimeout(waktu);
    };
  }, [siakad, path, svg, aktif, putaran]);

  React.useEffect(() => {
    if (!data) return;
    const t = setInterval(() => setSisa((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [data]);

  return { data, error, sisa, muatUlang: () => setPutaran((n) => n + 1) };
}

/**
 * Gambar QR presensi: `renderQr` dari aplikasi, atau `KodeQrSiakad` dengan gaya `presensi` bagian sesi/titik
 * (digambar di browser, jadi pergantian QR tiap beberapa detik tidak membebani server).
 */
export function GambarQrPresensi({ qr, ukuran = 320, renderQr, className }: { qr: QrPresensi; ukuran?: number; renderQr?: RenderQrPresensi; className?: string }) {
  return (
    <div className={cn('u-presensi-qr-gambar', className)} style={{ width: ukuran }}>
      {renderQr ? renderQr(qr.isi, { ukuran, gaya: qr.gaya }) : <KodeQrSiakad nilai={qr.isi} kodeGaya={qr.gaya.kode} bagian={qr.gaya.bagian} ukuran={ukuran} label="QR presensi" />}
    </div>
  );
}

function BilahWaktuQr({ sisa, interval }: { sisa: number; interval: number }) {
  const persen = Math.max(0, Math.min(100, (sisa / Math.max(1, interval)) * 100));
  return (
    <div className="u-presensi-waktu" role="timer" aria-label={`QR berganti dalam ${sisa} detik`}>
      <span className="u-presensi-waktu-bilah" style={{ width: `${persen}%` }} />
      <span className="u-presensi-waktu-teks">Berganti dalam {sisa} dtk</span>
    </div>
  );
}

function AngkaRingkasan({ r }: { r: RingkasanPresensi }) {
  const isi: Array<[string, React.ReactNode, string?]> = [
    ['Hadir', r.peserta != null ? `${r.hadir}/${r.peserta}` : r.hadir, 'success'],
    ['Izin', r.izin],
    ['Sakit', r.sakit],
    ['Terlambat', r.terlambat, r.terlambat ? 'warning' : undefined],
    ['Perlu dicek', r.curiga, r.curiga ? 'danger' : undefined],
  ];
  return (
    <dl className="u-presensi-angka">
      {isi.map(([l, v, nada]) => (
        <div key={l} data-nada={nada}>
          <dt>{l}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

// ================================================================ Layar QR sesi
export interface LayarQrPresensiProps {
  /** UUID sesi yang sedang dibuka. */
  sesiId: string;
  renderQr?: RenderQrPresensi;
  /** Ukuran QR (px). Bawaan 340; mode layar penuh memakai tinggi layar. */
  ukuran?: number;
  /** Tampilkan tombol tutup sesi (bawaan true). */
  tombolTutup?: boolean;
  onTutup?: (sesi: SesiPresensi) => void;
  className?: string;
}

/**
 * Layar dosen/panitia: QR berganti yang ditampilkan di proyektor, kode cadangan, hitungan hadir, dan pemindai
 * terbaru. Tombol layar penuh untuk proyektor; tutup sesi langsung mengesahkan kuliah ke SIAKAD.
 */
export function LayarQrPresensi({ sesiId, renderQr, ukuran = 340, tombolTutup = true, onTutup, className }: LayarQrPresensiProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const ref = React.useRef<HTMLDivElement>(null);
  const [penuh, setPenuh] = React.useState(false);
  const sesi = useSiakadQuery<SesiPresensi>(['presensi', 'sesi', sesiId], (s, signal) => s.request({ method: 'GET', path: `${P}/sesi/${sesiId}` }, { signal }));
  const qr = useQrBerganti(sesi.data?.status === 'buka' ? `${P}/sesi/${sesiId}/qr` : null);

  React.useEffect(() => {
    const ubah = () => setPenuh(document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', ubah);
    return () => document.removeEventListener('fullscreenchange', ubah);
  }, []);
  const alihPenuh = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void ref.current?.requestFullscreen?.();
  };

  if (sesi.loading && !sesi.data) return <Skeleton style={{ height: 420 }} />;
  if (sesi.error) return <GalatApi error={sesi.error} onRetry={sesi.refetch} />;
  const s = sesi.data!;
  if (s.status !== 'buka') {
    return (
      <Empty
        bordered
        icon={<QrCode aria-hidden />}
        title={s.status === 'draf' ? 'Sesi belum dibuka' : `Sesi ${LABEL_STATUS_SESI[s.status].toLowerCase()}`}
        description={s.status === 'draf' ? 'Buka sesi agar QR mulai berlaku.' : 'QR hanya tampil selama sesi dibuka.'}
      />
    );
  }
  const q = qr.data;
  const ukuranQr = penuh ? Math.min(typeof window !== 'undefined' ? window.innerHeight - 220 : 640, 720) : ukuran;
  return (
    <div ref={ref} className={cn('u-presensi-layar', className)} data-penuh={penuh || undefined}>
      <header className="u-presensi-layar-kepala">
        <div>
          <p className="u-presensi-layar-sub">
            {s.jenis === 'kuliah' ? `${s.kuliah?.kode_mk} · kelas ${s.kuliah?.kelas}` : LABEL_PESERTA[s.peserta]} · {tanggalPanjang(s.tanggal)}
          </p>
          <h2 className="u-presensi-layar-judul">{s.judul}</h2>
        </div>
        <div className="u-presensi-layar-aksi">
          <Button variant="ghost" size="sm" iconOnly aria-label={penuh ? 'Keluar layar penuh' : 'Layar penuh'} onClick={alihPenuh}>
            {penuh ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
          </Button>
          {tombolTutup && s.hak?.kelola && (
            <ConfirmDialog
              tone="primary"
              trigger={
                <Button variant="outline" size="sm">
                  <Square aria-hidden /> Tutup sesi
                </Button>
              }
              title="Tutup sesi presensi?"
              description={
                s.jenis === 'kuliah'
                  ? 'Pindaian berhenti diterima dan presensi pertemuan ini langsung disahkan ke SIAKAD. Peserta yang belum hadir dicatat sesuai pengaturan sesi.'
                  : 'Pindaian berhenti diterima. Anda masih bisa mengoreksi daftar hadir sebelum mengesahkan.'
              }
              confirmLabel="Tutup sesi"
              onConfirm={async () => {
                try {
                  const r = await siakad.request<SesiPresensi>({ method: 'POST', path: `${P}/sesi/${sesiId}/tutup` });
                  invalidateSiakad('presensi');
                  toast.add({ title: r.data.status === 'disahkan' ? 'Sesi ditutup dan disahkan' : 'Sesi ditutup', type: 'success' });
                  onTutup?.(r.data);
                } catch (e) {
                  toast.add({ title: 'Sesi belum bisa ditutup', description: pesanGalatPresensi(e), type: 'error' });
                }
              }}
            />
          )}
        </div>
      </header>

      <div className="u-presensi-layar-isi">
        <div className="u-presensi-layar-qr">
          {q ? (
            <>
              <GambarQrPresensi qr={q} ukuran={ukuranQr} renderQr={renderQr} />
              <BilahWaktuQr sisa={qr.sisa} interval={q.interval_detik} />
            </>
          ) : qr.error ? (
            <GalatApi error={qr.error} message={pesanGalatPresensi(qr.error)} onRetry={qr.muatUlang} />
          ) : (
            <Skeleton style={{ width: ukuranQr, maxWidth: '100%', aspectRatio: '1' }} />
          )}
        </div>
        <aside className="u-presensi-layar-samping">
          <p className="u-presensi-petunjuk">
            <ScanLine aria-hidden /> Pindai dengan aplikasi UNIPO, menu Presensi.
          </p>
          {q?.kode && (
            <div className="u-presensi-kode">
              <span>Tanpa kamera? Masukkan kode</span>
              <strong aria-label={`Kode ${q.kode.split('').join(' ')}`}>{q.kode}</strong>
            </div>
          )}
          {q?.ringkasan && <AngkaRingkasan r={q.ringkasan} />}
          {q?.ringkasan?.peserta ? <Progress value={q.ringkasan.hadir} max={q.ringkasan.peserta} label="Kehadiran" showValue format={(v, m) => `${Math.round((v / (m || 1)) * 100)}%`} /> : null}
          {q?.terbaru && q.terbaru.length > 0 && (
            <ol className="u-presensi-terbaru" aria-label="Pemindai terbaru">
              {q.terbaru.map((t) => (
                <li key={`${t.jenis}${t.subjek}`}>
                  <span className="u-presensi-terbaru-nama">{t.nama ?? t.subjek}</span>
                  <span className="u-presensi-terbaru-waktu">
                    {Boolean(t.curiga) && <ShieldAlert aria-label="Perlu dicek" />}
                    {jam(t.waktu)}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {q?.peringatan && <Alert variant="warning">{q.peringatan}</Alert>}
        </aside>
      </div>
    </div>
  );
}

// ================================================================ Pemindai kamera
type Detektor = (sumber: HTMLVideoElement, kanvas: HTMLCanvasElement) => Promise<string | null>;

async function buatDetektor(): Promise<Detektor> {
  const BD = (globalThis as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (s: CanvasImageSource) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
  if (BD) {
    try {
      const d = new BD({ formats: ['qr_code'] });
      return async (v) => (await d.detect(v))[0]?.rawValue ?? null;
    } catch {
      // jatuh ke jsQR
    }
  }
  const jsQR = (await import('jsqr')).default;
  return async (v, c) => {
    const w = v.videoWidth;
    const h = v.videoHeight;
    if (!w || !h) return null;
    const skala = Math.min(1, 640 / Math.max(w, h));
    c.width = Math.round(w * skala);
    c.height = Math.round(h * skala);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const img = ctx.getImageData(0, 0, c.width, c.height);
    return jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })?.data ?? null;
  };
}

/**
 * Kamera pemindai QR: BarcodeDetector bila peramban mendukung, selain itu jsQR (Safari iOS). `onBaca` dipanggil
 * sekali per isi QR yang berbeda; kamera berhenti saat `aktif` false.
 */
export function KameraPindaiQr({ aktif, onBaca, onGalat, className }: { aktif: boolean; onBaca: (isi: string) => void; /** Kamera tidak bisa dipakai (ditolak, tidak ada). */ onGalat?: (pesan: string) => void; className?: string }) {
  const video = React.useRef<HTMLVideoElement>(null);
  const kanvas = React.useRef<HTMLCanvasElement | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const terakhir = React.useRef<{ isi: string; at: number } | null>(null);
  const baca = React.useRef(onBaca);
  baca.current = onBaca;
  const lapor = React.useRef(onGalat);
  lapor.current = onGalat;

  React.useEffect(() => {
    if (!aktif) return;
    let berhenti = false;
    let aliran: MediaStream | null = null;
    let detik: ReturnType<typeof setTimeout> | undefined;
    kanvas.current ??= document.createElement('canvas');
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Peramban ini tidak bisa membuka kamera.');
        aliran = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (berhenti) return aliran.getTracks().forEach((t) => t.stop());
        const v = video.current!;
        v.srcObject = aliran;
        await v.play().catch(() => undefined);
        const deteksi = await buatDetektor();
        const putar = async () => {
          if (berhenti) return;
          try {
            const isi = await deteksi(v, kanvas.current!);
            const kini = Date.now();
            if (isi && (terakhir.current?.isi !== isi || kini - terakhir.current.at > 4000)) {
              terakhir.current = { isi, at: kini };
              baca.current(isi);
            }
          } catch {
            // bingkai belum siap
          }
          detik = setTimeout(putar, 250);
        };
        setGalat(null);
        void putar();
      } catch (e) {
        const nama = (e as { name?: string })?.name;
        const pesan =
          nama === 'NotAllowedError'
            ? 'Izin kamera ditolak. Izinkan kamera di pengaturan peramban, atau masukkan kode dari layar.'
            : nama === 'NotFoundError' || nama === 'OverconstrainedError'
              ? 'Kamera tidak ditemukan di perangkat ini. Masukkan kode dari layar.'
              : nama === 'NotReadableError'
                ? 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu, atau masukkan kode dari layar.'
                : 'Kamera tidak bisa dibuka. Masukkan kode dari layar.';
        setGalat(pesan);
        lapor.current?.(pesan);
      }
    })();
    return () => {
      berhenti = true;
      if (detik) clearTimeout(detik);
      aliran?.getTracks().forEach((t) => t.stop());
    };
  }, [aktif]);

  return (
    <div className={cn('u-presensi-kamera', className)} data-aktif={aktif || undefined}>
      {galat ? (
        <div className="u-presensi-kamera-galat">
          <CameraOff aria-hidden />
          <p>{galat}</p>
        </div>
      ) : (
        <>
          <video ref={video} muted playsInline aria-label="Pratinjau kamera" />
          <span className="u-presensi-kamera-bingkai" aria-hidden />
        </>
      )}
    </div>
  );
}

// ================================================================ Pindai (peserta)
export interface PindaiPresensiProps {
  /** Token dari tautan (`?t=`), langsung dikirim saat dibuka. Bawaan dibaca dari URL halaman. */
  token?: string | null;
  /** Kirim lokasi perangkat (bawaan true). Sesi yang mewajibkan lokasi menolak pindaian tanpa lokasi. */
  kirimLokasi?: boolean;
  onBerhasil?: (hasil: HasilPindaiPresensi) => void;
  className?: string;
}

/**
 * Pindai QR presensi oleh mahasiswa, dosen, atau tendik: kamera, atau kode 6 huruf dari layar. Lokasi dan ID
 * perangkat ikut dikirim untuk pemeriksaan anti-titip absen. Juga menangani QR titik kerja (masuk/pulang).
 */
export function PindaiPresensi({ token, kirimLokasi = true, onBerhasil, className }: PindaiPresensiProps) {
  const siakad = useSiakad();
  const [mode, setMode] = React.useState<'kamera' | 'kode'>('kamera');
  const [kode, setKode] = React.useState('');
  const [sibuk, setSibuk] = React.useState(false);
  const [hasil, setHasil] = React.useState<HasilPindaiPresensi | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const awal = React.useRef(token === undefined ? tokenPresensiDariUrl() : token);

  const kirim = React.useCallback(
    async (isi: { token?: string; kode?: string }) => {
      setSibuk(true);
      setGalat(null);
      try {
        const lokasi = kirimLokasi ? await ambilLokasiPresensi() : null;
        const r = await siakad.request<HasilPindaiPresensi>({ method: 'POST', path: `${P}/pindai`, body: { ...isi, lokasi, perangkat: idPerangkatPresensi() } });
        setHasil(r.data);
        invalidateSiakad('presensi');
        onBerhasil?.(r.data);
      } catch (e) {
        setGalat(pesanGalatPresensi(e));
      } finally {
        setSibuk(false);
      }
    },
    [siakad, kirimLokasi, onBerhasil],
  );

  React.useEffect(() => {
    if (awal.current) {
      const t = awal.current;
      awal.current = null;
      void kirim({ token: t });
    }
  }, [kirim]);

  if (hasil) {
    return (
      <div className={cn('u-presensi-hasil', className)} data-sudah={hasil.sudah || undefined}>
        <span className="u-presensi-hasil-ikon">{hasil.aksi ? <DoorOpen aria-hidden /> : <CircleCheck aria-hidden />}</span>
        <h3>{hasil.aksi ? (hasil.aksi === 'masuk' ? 'Selamat bekerja' : 'Terima kasih, hati-hati di jalan') : hasil.sudah ? 'Sudah tercatat' : 'Presensi tercatat'}</h3>
        <p>{hasil.pesan}</p>
        {hasil.sesi && (
          <DescriptionList
            items={[
              { label: hasil.sesi.jenis === 'kuliah' ? 'Kuliah' : 'Kegiatan', value: hasil.sesi.judul + (hasil.sesi.kelas ? `, kelas ${hasil.sesi.kelas}` : '') },
              { label: 'Waktu', value: `${jam(hasil.hadir?.waktu)}${hasil.hadir?.terlambat ? ` (terlambat ${hasil.hadir.terlambat_menit} menit)` : ''}` },
            ]}
          />
        )}
        {hasil.titik && <DescriptionList items={[{ label: 'Titik', value: hasil.titik.nama }]} />}
        {hasil.hadir?.curiga && (
          <Alert variant="warning" title="Ditandai untuk diperiksa">
            Pengelola sesi akan memeriksa pindaian ini (lokasi jauh atau perangkat dipakai akun lain).
          </Alert>
        )}
        <Button variant="outline" onClick={() => setHasil(null)}>
          <ScanLine aria-hidden /> Pindai lagi
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('u-presensi-pindai', className)}>
      <SegmentedControl
        fullWidth
        aria-label="Cara presensi"
        value={mode}
        onValueChange={setMode}
        options={[
          { value: 'kamera', label: 'Pindai QR', icon: <Camera aria-hidden /> },
          { value: 'kode', label: 'Masukkan kode', icon: <KeyRound aria-hidden /> },
        ]}
      />
      {mode === 'kamera' ? (
        <>
          <KameraPindaiQr aktif={!sibuk && !hasil} onBaca={(isi) => void kirim({ token: isi })} onGalat={() => setMode('kode')} />
          <p className="u-presensi-petunjuk">Arahkan kamera ke QR di layar. QR berganti tiap beberapa detik, jadi pindai QR yang sedang tampil.</p>
        </>
      ) : (
        <form
          className="u-presensi-form-kode"
          onSubmit={(e) => {
            e.preventDefault();
            if (kode.trim().length >= 4) void kirim({ kode: kode.trim().toUpperCase() });
          }}
        >
          <Field label="Kode dari layar" description="6 huruf/angka yang dibacakan atau tampil di samping QR.">
            <Input
              value={kode}
              onChange={(e) => setKode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
              autoComplete="off"
              autoCapitalize="characters"
              inputMode="text"
              className="u-presensi-isian-kode"
              placeholder="Mis. K7M2QX"
            />
          </Field>
          <Button type="submit" loading={sibuk} disabled={kode.trim().length < 4}>
            <ClipboardCheck aria-hidden /> Catat kehadiran
          </Button>
        </form>
      )}
      {sibuk && (
        <p className="u-presensi-petunjuk" role="status">
          <LocateFixed aria-hidden /> Mencatat kehadiran…
        </p>
      )}
      {galat && (
        <Alert variant="danger" title="Presensi belum tercatat" actions={<Button size="sm" variant="ghost" onClick={() => setGalat(null)}>Coba lagi</Button>}>
          {galat}
        </Alert>
      )}
    </div>
  );
}

// ================================================================ Kartu QR saya
/** Kartu QR pribadi (berganti tiap 30 detik) untuk dipindai petugas di meja registrasi acara atau ujian. */
export function KartuQrSaya({ renderQr, ukuran = 240, className }: { renderQr?: RenderQrPresensi; ukuran?: number; className?: string }) {
  const akun = useAkunSaya({ foto: false });
  const qr = useQrBerganti(`${P}/kartu`);
  return (
    <Card className={cn('u-presensi-kartu', className)}>
      <div className="u-presensi-kartu-kepala">
        <p className="u-presensi-layar-sub">Kartu presensi</p>
        <h3>{akun.data?.akun.nama ?? <Skeleton style={{ width: 160, height: 20 }} />}</h3>
        <p className="u-presensi-kartu-id">{qr.data?.pemilik?.subjek ?? akun.data?.akun.username}</p>
      </div>
      {qr.data ? (
        <>
          <GambarQrPresensi qr={qr.data} ukuran={ukuran} renderQr={renderQr} />
          <BilahWaktuQr sisa={qr.sisa} interval={qr.data.interval_detik} />
        </>
      ) : qr.error ? (
        <GalatApi error={qr.error} onRetry={qr.muatUlang} />
      ) : (
        <Skeleton style={{ width: ukuran, maxWidth: '100%', aspectRatio: '1' }} />
      )}
      <p className="u-presensi-petunjuk">Tunjukkan ke petugas. Tangkapan layar tidak berlaku karena QR berganti.</p>
    </Card>
  );
}

// ================================================================ Pindai kartu (petugas)
/** Petugas memindai kartu QR peserta berturut-turut; hasil terakhir tampil di daftar. */
export function PindaiKartuPresensi({ sesiId, className }: { sesiId: string; className?: string }) {
  const siakad = useSiakad();
  const [log, setLog] = React.useState<Array<{ ok: boolean; teks: string; at: string }>>([]);
  const [sibuk, setSibuk] = React.useState(false);
  const tambah = (ok: boolean, teks: string) => setLog((l) => [{ ok, teks, at: new Date().toTimeString().slice(0, 8) }, ...l].slice(0, 30));
  return (
    <div className={cn('u-presensi-pindai', className)}>
      <KameraPindaiQr
        aktif={!sibuk}
        onBaca={async (isi) => {
          setSibuk(true);
          try {
            const r = await siakad.request<HasilPindaiPresensi>({ method: 'POST', path: `${P}/sesi/${sesiId}/pindai-kartu`, body: { token: isi } });
            tambah(true, `${r.data.hadir?.nama ?? r.data.hadir?.subjek ?? ''}: ${r.data.pesan}`);
            invalidateSiakad('presensi');
          } catch (e) {
            tambah(false, pesanGalatPresensi(e));
          } finally {
            setTimeout(() => setSibuk(false), 900);
          }
        }}
      />
      <ol className="u-presensi-log-kartu" aria-live="polite">
        {log.map((l, i) => (
          <li key={i} data-ok={l.ok || undefined}>
            {l.ok ? <CircleCheck aria-hidden /> : <CircleX aria-hidden />}
            <span>{l.teks}</span>
            <time>{l.at}</time>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ================================================================ Presensi saya
export function usePresensiSaya() {
  return useSiakadQuery<PresensiSayaData>(['presensi', 'saya'], (s, signal) => s.request({ method: 'GET', path: `${P}/saya`, query: { per_page: 30 } }, { signal }), { staleTime: 15_000 });
}

/**
 * Beranda presensi peserta: sesi yang sedang dibuka untuk saya (dengan status saya), tombol pindai, dan riwayat
 * kehadiran QR. Rekap kuliah per mata kuliah tetap dari /v1/mahasiswa/{nim}/presensi.
 */
export function PresensiSaya({ onPindai, onAjukanIzin, className }: { onPindai?: () => void; onAjukanIzin?: (sesi: SesiPresensi) => void; className?: string }) {
  const q = usePresensiSaya();
  if (q.loading && !q.data) return <Skeleton style={{ height: 280 }} />;
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  const d = q.data!;
  return (
    <div className={cn('u-presensi-saya', className)}>
      <section>
        <div className="u-presensi-bagian-kepala">
          <h3>Sedang berlangsung</h3>
          {onPindai && (
            <Button size="sm" onClick={onPindai}>
              <ScanLine aria-hidden /> Pindai QR
            </Button>
          )}
        </div>
        {d.berlangsung.length === 0 ? (
          <Empty icon={<Clock aria-hidden />} title="Tidak ada sesi yang dibuka untuk Anda" description="Sesi kuliah atau kegiatan muncul di sini saat dosen atau panitia membukanya." />
        ) : (
          <ul className="u-presensi-daftar-sesi">
            {d.berlangsung.map((s) => (
              <li key={s.id}>
                <div>
                  <p className="u-presensi-sesi-judul">{judulSesiPresensi(s)}</p>
                  <p className="u-presensi-sesi-meta">
                    {s.jenis === 'kuliah' ? s.kuliah?.kode_mk : LABEL_PESERTA[s.peserta]} · dibuka {jam(s.dibuka_at)}
                    {s.lokasi?.wajib ? ' · wajib di lokasi' : ''}
                  </p>
                </div>
                <div className="u-presensi-sesi-aksi">
                  <BadgeStatusHadir status={s.saya?.status ?? null} />
                  {!s.saya && onAjukanIzin && (
                    <Button size="xs" variant="ghost" onClick={() => onAjukanIzin(s)}>
                      Ajukan izin
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <div className="u-presensi-bagian-kepala">
          <h3>Riwayat</h3>
        </div>
        {d.riwayat.length === 0 ? (
          <Empty icon={<History aria-hidden />} title="Belum ada riwayat presensi QR" />
        ) : (
          <ul className="u-presensi-daftar-sesi" data-ringkas>
            {d.riwayat.map((r) => (
              <li key={r.sesi_id}>
                <div>
                  <p className="u-presensi-sesi-judul">{r.judul + (r.kelas ? `, kelas ${r.kelas}` : '')}</p>
                  <p className="u-presensi-sesi-meta">
                    {tanggalPanjang(r.tanggal)} · {jam(r.waktu)} · {LABEL_CARA[r.cara] ?? r.cara}
                  </p>
                </div>
                <BadgeStatusHadir status={r.status} terlambat={r.terlambat} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ================================================================ Daftar hadir sesi
export function usePesertaSesiPresensi(sesiId: string | null | undefined) {
  return useSiakadQuery<DaftarPesertaPresensi>(['presensi', 'sesi', sesiId, 'peserta'], (s, signal) => s.request({ method: 'GET', path: `${P}/sesi/${sesiId}/peserta` }, { signal }), {
    enabled: !!sesiId,
    staleTime: 5_000,
  });
}

type SaringHadir = 'semua' | 'belum' | 'H' | 'izin' | 'A' | 'curiga';

/**
 * Daftar hadir satu sesi untuk pengelola/petugas: status per peserta, cara, waktu, terlambat, tanda curiga, izin
 * yang diajukan. Status bisa dikoreksi sebelum disahkan; "isi yang belum" mengisi semua yang belum berstatus.
 */
export function DaftarHadirSesi({ sesiId, segarkanDetik = 10, className }: { sesiId: string; segarkanDetik?: number; className?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = usePesertaSesiPresensi(sesiId);
  const [saring, setSaring] = React.useState<SaringHadir>('semua');
  const [cari, setCari] = React.useState('');
  const [sibuk, setSibuk] = React.useState<string | null>(null);
  const { refetch } = q;
  const buka = q.data?.sesi.status === 'buka';

  React.useEffect(() => {
    if (!buka || !segarkanDetik) return;
    const t = setInterval(refetch, segarkanDetik * 1000);
    return () => clearInterval(t);
  }, [buka, segarkanDetik, refetch]);

  if (q.loading && !q.data) return <Skeleton style={{ height: 320 }} />;
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  const d = q.data!;
  const bisaUbah = ['draf', 'buka', 'tutup'].includes(d.sesi.status);
  const kata = cari.trim().toLowerCase();
  const baris = d.peserta.filter((p) => {
    if (kata && !`${p.nama ?? ''} ${p.subjek}`.toLowerCase().includes(kata)) return false;
    if (saring === 'belum') return !p.status;
    if (saring === 'H' || saring === 'A') return p.status === saring;
    if (saring === 'izin') return p.status === 'I' || p.status === 'S' || !!p.izin;
    if (saring === 'curiga') return p.curiga;
    return true;
  });

  const ubah = async (body: Record<string, unknown>, kunci: string, judul: string) => {
    setSibuk(kunci);
    try {
      await siakad.request({ method: 'POST', path: `${P}/sesi/${sesiId}/peserta`, body });
      invalidateSiakad('presensi');
      toast.add({ title: judul, type: 'success' });
    } catch (e) {
      toast.add({ title: 'Status belum tersimpan', description: pesanGalatPresensi(e), type: 'error' });
    } finally {
      setSibuk(null);
    }
  };
  const bersihkan = async (p: PesertaPresensi) => {
    setSibuk(`${p.jenis}${p.subjek}`);
    try {
      await siakad.request({ method: 'POST', path: `${P}/sesi/${sesiId}/curiga`, body: { jenis: p.jenis, subjek: p.subjek, catatan: 'Sudah diperiksa' } });
      invalidateSiakad('presensi');
    } catch (e) {
      toast.add({ title: 'Tanda belum terhapus', description: pesanGalatPresensi(e), type: 'error' });
    } finally {
      setSibuk(null);
    }
  };

  return (
    <div className={cn('u-presensi-hadir', className)}>
      <AngkaRingkasan r={d.ringkasan} />
      <div className="u-presensi-alat">
        <Input type="search" placeholder="Cari nama atau NIM" value={cari} onChange={(e) => setCari(e.target.value)} aria-label="Cari peserta" size="sm" />
        <SegmentedControl<SaringHadir>
          aria-label="Saring status"
          value={saring}
          onValueChange={setSaring}
          options={[
            { value: 'semua', label: `Semua ${d.peserta.length}` },
            { value: 'belum', label: `Belum ${d.ringkasan.belum ?? d.peserta.filter((p) => !p.status).length}` },
            { value: 'H', label: 'Hadir' },
            { value: 'izin', label: 'Izin/sakit' },
            { value: 'curiga', label: `Dicek ${d.ringkasan.curiga}` },
          ]}
        />
        {bisaUbah && (d.ringkasan.belum ?? 0) > 0 && (
          <Menu
            trigger={
              <Button size="sm" variant="outline">
                Isi yang belum <MoreHorizontal aria-hidden />
              </Button>
            }
            items={(['A', 'H', 'I', 'S'] as StatusHadir[]).map((st) => ({
              label: `Tandai semua ${LABEL_STATUS_HADIR[st].toLowerCase()}`,
              onSelect: () => void ubah({ peserta: [], lainnya: st }, 'semua', `Peserta yang belum ditandai ${LABEL_STATUS_HADIR[st].toLowerCase()}`),
            }))}
          />
        )}
      </div>
      {d.pengajar.length > 0 && (
        <p className="u-presensi-petunjuk">
          <BadgeCheck aria-hidden /> Pengajar hadir: {d.pengajar.map((p) => `${p.nama ?? p.subjek} (${jam(p.waktu)})`).join(', ')}
        </p>
      )}
      {baris.length === 0 ? (
        <Empty icon={<Users aria-hidden />} title="Tidak ada peserta yang cocok" description="Ubah saringan atau kata pencarian." />
      ) : (
        <TableContainer>
          <Table density="compact">
            <thead>
              <tr>
                <th>Peserta</th>
                <th>Status</th>
                <th>Waktu</th>
                <th>Cara</th>
                {bisaUbah && <th aria-label="Ubah status" />}
              </tr>
            </thead>
            <tbody>
              {baris.map((p) => {
                const kunci = `${p.jenis}${p.subjek}`;
                return (
                  <tr key={kunci} data-curiga={p.curiga || undefined}>
                    <td>
                      <span className="u-presensi-nama">{p.nama ?? p.subjek}</span>
                      <span className="u-presensi-sub">
                        {p.subjek}
                        {p.peran ? ` · ${p.peran}` : ''}
                      </span>
                    </td>
                    <td>
                      <div className="u-presensi-sel-status">
                        <BadgeStatusHadir status={p.status} terlambat={p.terlambat} />
                        {p.izin && !p.status && <Badge variant="info">{p.izin.jenis === 'sakit' ? 'Sakit' : 'Izin'} {p.izin.status}</Badge>}
                        {p.curiga && (
                          <Button size="xs" variant="ghost" title={p.alasan_curiga ?? undefined} loading={sibuk === kunci} onClick={() => void bersihkan(p)}>
                            <ShieldAlert aria-hidden /> Tandai sudah dicek
                          </Button>
                        )}
                      </div>
                      {p.curiga && p.alasan_curiga && <span className="u-presensi-sub">{p.alasan_curiga}</span>}
                    </td>
                    <td>{p.waktu ? jam(p.waktu) + (p.terlambat ? ` (+${p.terlambat_menit}′)` : '') : '-'}</td>
                    <td>{p.cara ? (LABEL_CARA[p.cara] ?? p.cara) + (p.jarak_m != null ? ` · ${p.jarak_m} m` : '') : '-'}</td>
                    {bisaUbah && (
                      <td>
                        <Menu
                          trigger={
                            <Button size="xs" variant="ghost" iconOnly aria-label={`Ubah status ${p.nama ?? p.subjek}`} loading={sibuk === kunci}>
                              <Pencil aria-hidden />
                            </Button>
                          }
                          items={(['H', 'I', 'S', 'A'] as StatusHadir[]).map((st) => ({
                            label: `Tandai ${LABEL_STATUS_HADIR[st].toLowerCase()}`,
                            disabled: p.status === st,
                            onSelect: () => void ubah({ peserta: [{ jenis: p.jenis, subjek: p.subjek, status: st }] }, kunci, `${p.nama ?? p.subjek}: ${LABEL_STATUS_HADIR[st]}`),
                          }))}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}

// ================================================================ Formulir sesi
/** Sumber PilihEntitas untuk kelas kuliah (/v1/jadwal) periode berjalan. */
export const SUMBER_KELAS_KULIAH: SumberEntitas = {
  nama: 'kelas kuliah',
  path: '/v1/jadwal',
  kunci: 'idj',
  satu: '/v1/jadwal/{id}',
  klien: true,
  query: { per_page: 100 },
  judul: (r) => `${String(r.nama_mk ?? r.kode_mk ?? '')}, kelas ${String(r.kelas ?? '')}`,
  meta: (r) => [r.kode_mk, r.hari, r.jam_mulai && `${String(r.jam_mulai).slice(0, 5)}`, r.nama_ruang ?? r.ruang].filter(Boolean).join(' · '),
  placeholder: 'Cari mata kuliah atau kelas',
};

interface UndanganIsian {
  jenis: JenisSubjekPresensi;
  subjek: string;
  nama?: string | null;
  peran?: string;
}

export interface FormSesiPresensiProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactElement;
  /** Sesi untuk diubah; kosong = buat baru. */
  sesi?: SesiPresensi | null;
  /** Jenis untuk sesi baru (bawaan kuliah). */
  jenis?: 'kuliah' | 'kegiatan';
  /** Kunci kelas: dari jadwal SIAKAD atau kelas LMS (mis. tombol "Buka presensi QR" di kelas LMS). */
  idj?: number;
  lmsKelasId?: number;
  /** Batasi pilihan kelas, mis. `{ prodi: '55201' }` atau `{ nidn }`. Dosen bawaan ke kelas yang diampu. */
  queryKelas?: Record<string, string | number | undefined>;
  onSimpan?: (sesi: SesiPresensi) => void;
}

/** Tambah/ubah sesi presensi kuliah atau kegiatan, langsung dibuka atau disimpan sebagai draf. */
export function FormSesiPresensi({ open, onOpenChange, trigger, sesi, jenis: jenisAwal = 'kuliah', idj: idjAwal, lmsKelasId, queryKelas, onSimpan }: FormSesiPresensiProps) {
  const siakad = useSiakad();
  const akun = useAkunSaya({ foto: false });
  const ubah = !!sesi;
  const kosong = React.useCallback(
    () => ({
      jenis: (sesi?.jenis ?? (lmsKelasId || idjAwal ? 'kuliah' : jenisAwal)) as 'kuliah' | 'kegiatan',
      idj: sesi?.kuliah?.idj ? String(sesi.kuliah.idj) : idjAwal ? String(idjAwal) : null,
      judul: sesi?.judul ?? '',
      keterangan: sesi?.keterangan ?? '',
      bahasan: sesi?.kuliah?.bahasan ?? '',
      tanggal: sesi?.tanggal ?? '',
      mulai: sesi?.mulai_at?.slice(11, 16) ?? '',
      selesai: sesi?.selesai_at?.slice(11, 16) ?? '',
      peserta: (sesi?.peserta ?? 'undangan') as PesertaSesiPresensi,
      undangan: [] as UndanganIsian[],
      petugas: (sesi?.petugas ?? []) as string[],
      unit: sesi?.unit ?? null,
      pakai_kode: sesi?.pakai_kode ?? true,
      izinkan_kartu: sesi?.izinkan_kartu ?? true,
      lokasi: sesi?.lokasi ? `${sesi.lokasi.lat},${sesi.lokasi.lng}` : '',
      radius_m: String(sesi?.lokasi?.radius_m ?? 100),
      wajib_lokasi: sesi?.lokasi?.wajib ?? false,
      tolak_perangkat_ganda: sesi?.tolak_perangkat_ganda ?? false,
      terlambat_menit: sesi?.terlambat_menit != null ? String(sesi.terlambat_menit) : '15',
      interval_detik: String(sesi?.interval_detik ?? 20),
      status_kosong: sesi?.status_kosong ?? 'A',
      buka: !ubah,
    }),
    [sesi, idjAwal, lmsKelasId, jenisAwal, ubah],
  );
  const [f, setF] = React.useState(kosong);
  const [berubah, setBerubah] = React.useState(false);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [undJenis, setUndJenis] = React.useState<JenisSubjekPresensi>('mahasiswa');
  const [cariLokasi, setCariLokasi] = React.useState(false);
  React.useEffect(() => {
    if (open) {
      setF(kosong());
      setBerubah(false);
      setGalat({});
    }
  }, [open, kosong]);
  const set = <K extends keyof ReturnType<typeof kosong>>(k: K, v: ReturnType<typeof kosong>[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setBerubah(true);
  };
  const dosen = akun.data?.akun.level === 'DOSEN';
  const qKelas = { ...(dosen ? { nidn: akun.data!.akun.username } : {}), ...queryKelas };
  const tglWaktu = (t: string, j: string) => (t && j ? `${t} ${j}:00` : null);

  const simpan = async () => {
    const err: Record<string, string> = {};
    if (f.jenis === 'kuliah' && !ubah && !f.idj && !lmsKelasId) err.idj = 'Pilih kelas kuliah.';
    if (f.jenis === 'kegiatan' && !f.judul.trim()) err.judul = 'Tulis nama kegiatan.';
    if (f.jenis === 'kegiatan' && f.peserta === 'undangan' && !ubah && f.undangan.length === 0) err.undangan = 'Tambahkan minimal satu peserta undangan.';
    if (f.wajib_lokasi && !f.lokasi) err.lokasi = 'Isi lokasi agar jarak peserta bisa diperiksa.';
    setGalat(err);
    if (Object.keys(err).length) return false;
    const tanggal = f.tanggal || undefined;
    const body: Record<string, unknown> = {
      keterangan: f.keterangan || null,
      pakai_kode: f.pakai_kode,
      izinkan_kartu: f.izinkan_kartu,
      lokasi: f.lokasi || null,
      radius_m: Number(f.radius_m) || 100,
      wajib_lokasi: f.wajib_lokasi,
      tolak_perangkat_ganda: f.tolak_perangkat_ganda,
      terlambat_menit: f.terlambat_menit === '' ? null : Number(f.terlambat_menit),
      interval_detik: Number(f.interval_detik) || 20,
      status_kosong: f.status_kosong,
      petugas: f.petugas,
    };
    if (f.jenis === 'kuliah') {
      Object.assign(body, { bahasan: f.bahasan || null });
      if (!ubah) Object.assign(body, { jenis: 'kuliah', ...(lmsKelasId ? { lms_kelas_id: lmsKelasId } : { idj: Number(f.idj) }), tanggal });
    } else {
      Object.assign(body, {
        judul: f.judul.trim(),
        unit: f.unit,
        mulai_at: tglWaktu(f.tanggal || sesi?.tanggal || hariIni(), f.mulai),
        selesai_at: tglWaktu(f.tanggal || sesi?.tanggal || hariIni(), f.selesai),
        ...(f.undangan.length ? { undangan: f.undangan.map(({ jenis, subjek, peran }) => ({ jenis, subjek, peran: peran || null })) } : {}),
      });
      if (!ubah) Object.assign(body, { jenis: 'kegiatan', peserta: f.peserta, tanggal });
    }
    if (!ubah && f.buka) body.buka = true;
    try {
      const r = await siakad.request<SesiPresensi>({ method: 'POST', path: ubah ? `${P}/sesi/${sesi!.id}` : `${P}/sesi`, body });
      invalidateSiakad('presensi');
      onSimpan?.(r.data);
    } catch (e) {
      const d = (e as { status?: number; details?: Record<string, unknown> }).details;
      if ((e as { status?: number }).status === 422 && d) {
        const isi = (d.fields ?? d) as Record<string, string>;
        setGalat(Object.fromEntries(Object.entries(isi).filter(([, v]) => typeof v === 'string')));
        return Object.values(isi).find((v) => typeof v === 'string') ?? false;
      }
      throw e;
    }
  };

  return (
    <PanelForm
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={ubah ? 'Ubah sesi presensi' : 'Sesi presensi baru'}
      description={f.jenis === 'kuliah' ? 'Satu pertemuan kuliah. Saat ditutup, presensi disahkan ke SIAKAD dan kelas LMS.' : 'Rapat, seminar, upacara, pelatihan, atau kegiatan ormawa.'}
      onSimpan={simpan}
      berubah={berubah}
      labelSimpan={ubah ? 'Simpan perubahan' : f.buka ? 'Buat dan buka sesi' : 'Simpan sebagai draf'}
    >
      <div className="u-presensi-form">
        {!ubah && !lmsKelasId && !idjAwal && (
          <Field label="Jenis sesi">
            <SegmentedControl
              fullWidth
              value={f.jenis}
              onValueChange={(v) => set('jenis', v)}
              options={[
                { value: 'kuliah', label: 'Pertemuan kuliah' },
                { value: 'kegiatan', label: 'Kegiatan' },
              ]}
            />
          </Field>
        )}
        {f.jenis === 'kuliah' ? (
          <>
            {!ubah && !lmsKelasId && (
              <Field label="Kelas kuliah" required error={galat.idj} description={dosen ? 'Kelas yang Anda ampu periode ini.' : undefined}>
                <PilihEntitas jenis={SUMBER_KELAS_KULIAH} value={f.idj} onValueChange={(v) => set('idj', v)} query={qKelas} />
              </Field>
            )}
            {lmsKelasId && !ubah && <Alert variant="info">Sesi dibuat untuk kelas LMS ini; jadwal SIAKAD-nya dipakai otomatis.</Alert>}
            <Field label="Bahasan pertemuan" optional description="Masuk ke berita acara perkuliahan.">
              <Textarea rows={2} value={f.bahasan} onChange={(e) => set('bahasan', e.target.value)} />
            </Field>
          </>
        ) : (
          <>
            <Field label="Nama kegiatan" required error={galat.judul}>
              <Input value={f.judul} onChange={(e) => set('judul', e.target.value)} placeholder="Mis. Rapat senat fakultas" />
            </Field>
            <Field label="Penyelenggara" optional description="Unit, prodi, atau fakultas. Juga menentukan gaya QR.">
              <PilihEntitas jenis="unit" value={f.unit} onValueChange={(v) => set('unit', v)} />
            </Field>
            <div className="u-presensi-form-baris">
              <Field label="Mulai" optional>
                <IsianJam value={f.mulai || null} onValueChange={(v) => set('mulai', v ?? '')} />
              </Field>
              <Field label="Selesai" optional description="Pindaian berhenti setelah jam ini.">
                <IsianJam value={f.selesai || null} onValueChange={(v) => set('selesai', v ?? '')} />
              </Field>
            </div>
            {!ubah && (
              <Field label="Peserta">
                <Pilihan
                  required
                  value={f.peserta}
                  onValueChange={(v) => v && set('peserta', v as PesertaSesiPresensi)}
                  options={(['undangan', 'terbuka', 'mahasiswa', 'pegawai'] as PesertaSesiPresensi[]).map((v) => ({ value: v, label: LABEL_PESERTA[v] }))}
                />
              </Field>
            )}
            {(f.peserta === 'undangan' || ubah) && (
              <Field label={ubah ? 'Tambah undangan' : 'Daftar undangan'} error={galat.undangan} description="Cari dan pilih satu per satu.">
                <div className="u-presensi-undangan">
                  <div className="u-presensi-form-baris">
                    <Pilihan
                      tampilan="tombol"
                      required
                      value={undJenis}
                      onValueChange={(v) => v && setUndJenis(v as JenisSubjekPresensi)}
                      options={[
                        { value: 'mahasiswa', label: 'Mahasiswa' },
                        { value: 'dosen', label: 'Dosen' },
                        { value: 'tendik', label: 'Tendik' },
                      ]}
                    />
                    <PilihEntitas
                      key={`${undJenis}-${f.undangan.length}`}
                      jenis={undJenis === 'mahasiswa' ? 'mahasiswa' : undJenis === 'dosen' ? 'dosen' : 'pengguna'}
                      value={null}
                      onValueChange={(v, item) => {
                        if (!v || f.undangan.some((u) => u.jenis === undJenis && u.subjek === v)) return;
                        set('undangan', [...f.undangan, { jenis: undJenis, subjek: v, nama: (item?.nama as string) ?? null }]);
                      }}
                    />
                  </div>
                  {f.undangan.length > 0 && (
                    <ul className="u-presensi-undangan-daftar">
                      {f.undangan.map((u, i) => (
                        <li key={`${u.jenis}${u.subjek}`}>
                          <span>
                            {u.nama ?? u.subjek} <small>{u.jenis}</small>
                          </span>
                          <Input size="sm" placeholder="Peran (opsional)" value={u.peran ?? ''} onChange={(e) => set('undangan', f.undangan.map((x, j) => (j === i ? { ...x, peran: e.target.value } : x)))} aria-label="Peran" />
                          <Button size="xs" variant="ghost" iconOnly aria-label={`Hapus ${u.nama ?? u.subjek}`} onClick={() => set('undangan', f.undangan.filter((_, j) => j !== i))}>
                            <X aria-hidden />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Field>
            )}
          </>
        )}
        {!ubah && (
          <Field label="Tanggal" optional description="Kosong = hari ini.">
            <IsianTanggal value={f.tanggal} onValueChange={(v) => set('tanggal', v)} />
          </Field>
        )}

        <fieldset className="u-presensi-fieldset">
          <legend>Pengaman</legend>
          <Field label="Lokasi sesi" optional error={galat.lokasi} description="Koordinat ruang/gedung. Pindaian jauh dari sini ditandai atau ditolak.">
            <div className="u-presensi-form-baris">
              <Input value={f.lokasi} onChange={(e) => set('lokasi', e.target.value)} placeholder="lat,lng" inputMode="decimal" />
              <Button
                variant="outline"
                loading={cariLokasi}
                onClick={async () => {
                  setCariLokasi(true);
                  const l = await ambilLokasiPresensi();
                  setCariLokasi(false);
                  if (l) set('lokasi', l);
                  else setGalat((g) => ({ ...g, lokasi: 'Lokasi perangkat tidak bisa dibaca. Izinkan lokasi atau ketik koordinat.' }));
                }}
              >
                <MapPin aria-hidden /> Pakai lokasi saya
              </Button>
            </div>
          </Field>
          {f.lokasi && (
            <div className="u-presensi-form-baris">
              <Field label="Radius (meter)">
                <IsianAngka value={keAngka(f.radius_m)} min={10} max={5000} onValueChange={(n) => set('radius_m', teksAngka(n))} />
              </Field>
              <Field label="Wajib di lokasi" description="Tolak pindaian tanpa lokasi atau di luar radius.">
                <Switch checked={f.wajib_lokasi} onCheckedChange={(v) => set('wajib_lokasi', v)} />
              </Field>
            </div>
          )}
          <div className="u-presensi-form-baris">
            <Field label="Terlambat setelah (menit)" optional>
              <IsianAngka value={keAngka(f.terlambat_menit)} min={0} max={240} onValueChange={(n) => set('terlambat_menit', teksAngka(n))} />
            </Field>
            <Field label="QR berganti tiap (detik)">
              <IsianAngka value={keAngka(f.interval_detik)} min={10} max={300} onValueChange={(n) => set('interval_detik', teksAngka(n))} />
            </Field>
          </div>
          <Field label="Kode cadangan 6 huruf" description="Untuk peserta yang kameranya bermasalah.">
            <Switch checked={f.pakai_kode} onCheckedChange={(v) => set('pakai_kode', v)} />
          </Field>
          <Field label="Tolak satu ponsel untuk dua peserta" description="Bila mati, hanya ditandai untuk diperiksa.">
            <Switch checked={f.tolak_perangkat_ganda} onCheckedChange={(v) => set('tolak_perangkat_ganda', v)} />
          </Field>
        </fieldset>

        <fieldset className="u-presensi-fieldset">
          <legend>Petugas dan pengesahan</legend>
          <Field label="Petugas" optional description="Boleh memindai kartu peserta dan mengisi status manual.">
            <div className="u-presensi-undangan">
              <PilihEntitas key={f.petugas.length} jenis="pengguna" value={null} onValueChange={(v) => v && !f.petugas.includes(v) && set('petugas', [...f.petugas, v])} />
              {f.petugas.length > 0 && (
                <ul className="u-presensi-undangan-daftar">
                  {f.petugas.map((u) => (
                    <li key={u}>
                      <span>{u}</span>
                      <Button size="xs" variant="ghost" iconOnly aria-label={`Hapus petugas ${u}`} onClick={() => set('petugas', f.petugas.filter((x) => x !== u))}>
                        <X aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Field>
          <Field label="Yang tidak hadir dicatat" description="Saat sesi disahkan.">
            <Pilihan
              tampilan="tombol"
              required
              value={f.status_kosong}
              onValueChange={(v) => v && set('status_kosong', v as 'A' | 'I' | 'S')}
              options={[
                { value: 'A', label: 'Alpa' },
                { value: 'I', label: 'Izin' },
                { value: 'S', label: 'Sakit' },
              ]}
            />
          </Field>
          {!ubah && (
            <Field label="Langsung buka sesi" description="QR mulai berlaku setelah disimpan.">
              <Switch checked={f.buka} onCheckedChange={(v) => set('buka', v)} />
            </Field>
          )}
        </fieldset>
      </div>
    </PanelForm>
  );
}

const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ================================================================ Detail dan kelola sesi
/** Detail sesi untuk pengelola: QR, daftar hadir, izin, jejak pindaian, dan aksi buka/tutup/sahkan/batal. */
export function DetailSesiPresensi({ sesiId, renderQr, onKembali, className }: { sesiId: string; renderQr?: RenderQrPresensi; onKembali?: () => void; className?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useSiakadQuery<SesiPresensi>(['presensi', 'sesi', sesiId], (s, signal) => s.request({ method: 'GET', path: `${P}/sesi/${sesiId}` }, { signal }), { staleTime: 5_000 });
  const [tab, setTab] = React.useState<'layar' | 'hadir' | 'izin' | 'jejak' | 'kartu'>('hadir');
  const [ubah, setUbah] = React.useState(false);
  const [sahkan, setSahkan] = React.useState<null | { gabung: boolean }>(null);

  React.useEffect(() => {
    if (q.data?.status === 'buka') setTab((t) => (t === 'hadir' ? 'layar' : t));
  }, [q.data?.status]);

  if (q.loading && !q.data) return <Skeleton style={{ height: 360 }} />;
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  const s = q.data!;
  const kelola = s.hak?.kelola;
  const aksi = async (nama: string, body: Record<string, unknown> = {}, judul = 'Tersimpan') => {
    try {
      await siakad.request<SesiPresensi>({ method: 'POST', path: `${P}/sesi/${sesiId}/${nama}`, body: { ...body, ...(nama === 'buka' ? { lokasi: await ambilLokasiPresensi(4000), perangkat: idPerangkatPresensi() } : {}) } });
      invalidateSiakad('presensi');
      toast.add({ title: judul, type: 'success' });
    } catch (e) {
      const err = e as { status?: number; message?: string };
      if (nama === 'sahkan' || nama === 'tutup') {
        if (err.status === 409 && /sudah tercatat|gabung/i.test(err.message ?? '')) return setSahkan({ gabung: true });
      }
      toast.add({ title: 'Belum berhasil', description: pesanGalatPresensi(e), type: 'error' });
    }
  };

  return (
    <div className={cn('u-presensi-detail', className)}>
      <header className="u-presensi-detail-kepala">
        <div>
          {onKembali && (
            <Button size="xs" variant="link" onClick={onKembali}>
              Semua sesi
            </Button>
          )}
          <h2>{judulSesiPresensi(s)}</h2>
          <p className="u-presensi-sesi-meta">
            <BadgeStatusSesi status={s.status} /> {tanggalPanjang(s.tanggal)}
            {s.dibuka_at ? ` · dibuka ${jam(s.dibuka_at)}` : ''}
            {s.ditutup_at ? ` · ditutup ${jam(s.ditutup_at)}` : ''}
          </p>
        </div>
        {kelola && (
          <div className="u-presensi-layar-aksi">
            {s.status === 'draf' && (
              <Button onClick={() => void aksi('buka', {}, 'Sesi dibuka')}>
                <Play aria-hidden /> Buka sesi
              </Button>
            )}
            {s.status === 'buka' && (
              <ConfirmDialog
                tone="primary"
                trigger={
                  <Button>
                    <Square aria-hidden /> Tutup sesi
                  </Button>
                }
                title="Tutup sesi presensi?"
                description={s.jenis === 'kuliah' ? 'Presensi pertemuan ini langsung disahkan ke SIAKAD.' : 'Pindaian berhenti diterima. Sahkan setelah daftar hadir diperiksa.'}
                confirmLabel="Tutup sesi"
                onConfirm={() => aksi('tutup', {}, 'Sesi ditutup')}
              />
            )}
            {s.status === 'tutup' && (
              <Button onClick={() => setSahkan({ gabung: false })}>
                <BadgeCheck aria-hidden /> Sahkan
              </Button>
            )}
            <Menu
              trigger={
                <Button variant="outline" iconOnly aria-label="Aksi lain">
                  <MoreHorizontal aria-hidden />
                </Button>
              }
              items={[
                { label: 'Ubah sesi', icon: <Pencil aria-hidden />, onSelect: () => setUbah(true), disabled: ['disahkan', 'batal'].includes(s.status) },
                { label: 'Ganti kode cadangan', icon: <KeyRound aria-hidden />, onSelect: () => void aksi('kode-baru', {}, 'Kode baru dibuat'), disabled: !s.pakai_kode || s.status !== 'buka' },
                { type: 'separator' },
                { label: 'Batalkan sesi', icon: <Ban aria-hidden />, destructive: true, onSelect: () => void aksi('batal', {}, 'Sesi dibatalkan'), disabled: ['disahkan', 'batal'].includes(s.status) },
              ]}
            />
          </div>
        )}
      </header>

      {s.status === 'disahkan' && s.kuliah && (
        <Alert variant="success" icon={<BadgeCheck aria-hidden />} title="Sudah disahkan ke SIAKAD">
          Pertemuan tercatat di presensi kelas{s.kuliah.lms_sesi_id ? ' dan disalin ke kelas LMS' : ''}. Koreksi selanjutnya lewat menu presensi kelas.
        </Alert>
      )}

      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'layar', label: 'Layar QR', icon: <QrCode aria-hidden />, disabled: s.status !== 'buka', content: <LayarQrPresensi sesiId={s.id} renderQr={renderQr} tombolTutup={false} /> },
          { value: 'hadir', label: 'Daftar hadir', icon: <ListChecks aria-hidden />, content: <DaftarHadirSesi sesiId={s.id} /> },
          ...(s.izinkan_kartu && s.status === 'buka' && s.hak?.bantu
            ? [{ value: 'kartu' as const, label: 'Pindai kartu', icon: <ScanLine aria-hidden />, content: <PindaiKartuPresensi sesiId={s.id} /> }]
            : []),
          { value: 'izin', label: 'Izin', icon: <FileText aria-hidden />, content: <DaftarIzinPresensi sesiId={s.id} sebagai="penyetuju" /> },
          ...(kelola ? [{ value: 'jejak' as const, label: 'Jejak pindaian', icon: <History aria-hidden />, content: <JejakPindaiSesi sesiId={s.id} /> }] : []),
        ]}
      />

      <FormSesiPresensi open={ubah} onOpenChange={setUbah} sesi={s} onSimpan={() => setUbah(false)} />
      <Dialog
        open={!!sahkan}
        onOpenChange={(o) => !o && setSahkan(null)}
        title={sahkan?.gabung ? 'Pertemuan ini sudah tercatat' : 'Sahkan presensi?'}
        description={
          sahkan?.gabung
            ? 'Presensi pertemuan ini sudah diisi (mis. lewat halaman web). Gabungkan: status mahasiswa diperbarui dari hasil QR.'
            : s.jenis === 'kuliah'
              ? 'Status semua peserta KRS ditulis ke presensi SIAKAD. Yang belum hadir dicatat sesuai pengaturan sesi.'
              : 'Undangan yang tidak hadir dicatat sesuai pengaturan sesi.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setSahkan(null)}>
              Batal
            </Button>
            <Button
              onClick={async () => {
                const g = sahkan?.gabung;
                setSahkan(null);
                await aksi('sahkan', g ? { gabung: true } : {}, 'Presensi disahkan');
              }}
            >
              {sahkan?.gabung ? 'Gabungkan dan sahkan' : 'Sahkan presensi'}
            </Button>
          </>
        }
      />
    </div>
  );
}

function JejakPindaiSesi({ sesiId }: { sesiId: string }) {
  const q = useSiakadQuery<{ log: LogPindaiPresensi[] }>(['presensi', 'sesi', sesiId, 'log'], (s, signal) => s.request({ method: 'GET', path: `${P}/sesi/${sesiId}/log` }, { signal }), { staleTime: 5_000 });
  if (q.loading && !q.data) return <Skeleton style={{ height: 200 }} />;
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  return <TabelJejak log={q.data!.log} />;
}

function TabelJejak({ log }: { log: LogPindaiPresensi[] }) {
  if (log.length === 0) return <Empty icon={<History aria-hidden />} title="Belum ada pindaian" />;
  return (
    <TableContainer>
      <Table density="compact">
        <thead>
          <tr>
            <th>Waktu</th>
            <th>Akun</th>
            <th>Hasil</th>
            <th>Keterangan</th>
            <th>Perangkat</th>
          </tr>
        </thead>
        <tbody>
          {log.map((l, i) => (
            <tr key={i}>
              <td>{l.created_at.slice(11, 19)}</td>
              <td>{l.subjek ?? '-'}</td>
              <td>{l.hasil === 'ok' ? <Badge variant="success">Diterima</Badge> : <Badge variant="danger">Ditolak</Badge>}</td>
              <td>{[l.cara && (LABEL_CARA[l.cara] ?? l.cara), l.alasan].filter(Boolean).join(' · ')}</td>
              <td>
                <code className="u-presensi-perangkat">{l.perangkat ? l.perangkat.slice(0, 8) : '-'}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </TableContainer>
  );
}

export function useDaftarSesiPresensi(query: Record<string, string | number | undefined> = {}) {
  const q = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== ''));
  return useSiakadQuery<SesiPresensi[]>(['presensi', 'sesi', 'daftar', q], (s, signal) => s.request({ method: 'GET', path: `${P}/sesi`, query: { per_page: 50, ...q } }, { signal }), {
    staleTime: 10_000,
  });
}

export interface KelolaSesiPresensiProps {
  /** Saring ke satu kelas: jadwal SIAKAD atau kelas LMS (dasbor kelas di LMS/fakultas). */
  idj?: number;
  lmsKelasId?: number;
  jenis?: 'kuliah' | 'kegiatan';
  renderQr?: RenderQrPresensi;
  className?: string;
}

/**
 * Modul pengelola sesi presensi: daftar sesi (hari ini, terbuka, riwayat), buat sesi, dan detail sesi. Untuk dosen
 * di halaman kelas, panitia kegiatan, dan admin presensi. Kirim `idj` atau `lmsKelasId` untuk satu kelas.
 */
export function KelolaSesiPresensi({ idj, lmsKelasId, jenis, renderQr, className }: KelolaSesiPresensiProps) {
  const [status, setStatus] = React.useState<'semua' | 'buka' | 'draf' | 'tutup' | 'disahkan'>('semua');
  const [pilih, setPilih] = React.useState<string | null>(null);
  const [baru, setBaru] = React.useState(false);
  const q = useDaftarSesiPresensi({ idj, lms_kelas_id: lmsKelasId, jenis, status: status === 'semua' ? undefined : status });

  if (pilih) return <DetailSesiPresensi sesiId={pilih} renderQr={renderQr} onKembali={() => setPilih(null)} className={className} />;
  const daftar = q.data ?? [];
  return (
    <div className={cn('u-presensi-kelola', className)}>
      <div className="u-presensi-alat">
        <SegmentedControl
          aria-label="Saring status sesi"
          value={status}
          onValueChange={setStatus}
          options={[
            { value: 'semua', label: 'Semua' },
            { value: 'buka', label: 'Dibuka' },
            { value: 'draf', label: 'Draf' },
            { value: 'tutup', label: 'Ditutup' },
            { value: 'disahkan', label: 'Disahkan' },
          ]}
        />
        <Button onClick={() => setBaru(true)}>
          <Plus aria-hidden /> Sesi baru
        </Button>
      </div>
      {q.loading && !q.data ? (
        <Skeleton style={{ height: 240 }} />
      ) : q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : daftar.length === 0 ? (
        <Empty
          bordered
          icon={<QrCode aria-hidden />}
          title={status === 'semua' ? 'Belum ada sesi presensi' : 'Tidak ada sesi dengan status ini'}
          description="Buat sesi, buka, lalu tampilkan QR di layar kelas atau ruang kegiatan."
          actions={
            <Button onClick={() => setBaru(true)}>
              <Plus aria-hidden /> Buat sesi presensi
            </Button>
          }
        />
      ) : (
        <ul className="u-presensi-daftar-sesi" data-interaktif>
          {daftar.map((s) => (
            <li key={s.id}>
              <button type="button" className="u-presensi-sesi-tombol" onClick={() => setPilih(s.id)}>
                <div>
                  <p className="u-presensi-sesi-judul">{judulSesiPresensi(s)}</p>
                  <p className="u-presensi-sesi-meta">
                    {tanggalPanjang(s.tanggal)}
                    {s.jenis === 'kuliah' ? ` · ${s.kuliah?.kode_mk}` : ` · ${LABEL_PESERTA[s.peserta]}`}
                    {s.jumlah_hadir != null ? ` · ${s.jumlah_hadir} hadir` : ''}
                  </p>
                </div>
                <BadgeStatusSesi status={s.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <FormSesiPresensi
        open={baru}
        onOpenChange={setBaru}
        jenis={jenis}
        idj={idj}
        lmsKelasId={lmsKelasId}
        onSimpan={(s) => {
          setBaru(false);
          setPilih(s.id);
        }}
      />
    </div>
  );
}

// ================================================================ Izin
export function useDaftarIzinPresensi(query: { sebagai?: 'saya' | 'penyetuju'; status?: string; sesi_id?: string } = {}) {
  const q = Object.fromEntries(Object.entries(query).filter(([, v]) => v));
  return useSiakadQuery<IzinPresensi[]>(['presensi', 'izin', q], (s, signal) => s.request({ method: 'GET', path: `${P}/izin`, query: { per_page: 50, ...q } }, { signal }), { staleTime: 10_000 });
}

export interface PengajuanIzinPresensiProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactElement;
  /** Izin untuk satu sesi (kuliah atau kegiatan). */
  sesi?: Pick<SesiPresensi, 'id' | 'judul' | 'kuliah' | 'tanggal'> | null;
  /** Atau untuk pertemuan kuliah yang sesinya belum dibuat (mahasiswa): kelas + tanggal. */
  idj?: number;
  tanggal?: string;
  onSimpan?: (izin: IzinPresensi) => void;
}

/** Ajukan izin/sakit dengan surat (unggah ke /v1/berkas). Disetujui pengelola sesi atau dosen pengampu. */
export function PengajuanIzinPresensi({ open, onOpenChange, trigger, sesi, idj, tanggal, onSimpan }: PengajuanIzinPresensiProps) {
  const siakad = useSiakad();
  const [jenis, setJenis] = React.useState<'izin' | 'sakit'>('izin');
  const [alasan, setAlasan] = React.useState('');
  const [berkas, setBerkas] = React.useState<string | null>(null);
  const [tgl, setTgl] = React.useState(tanggal ?? '');
  const [kelas, setKelas] = React.useState<string | null>(idj ? String(idj) : null);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (open) {
      setJenis('izin');
      setAlasan('');
      setBerkas(null);
      setTgl(tanggal ?? '');
      setKelas(idj ? String(idj) : null);
      setGalat({});
    }
  }, [open, tanggal, idj]);

  return (
    <PanelForm
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      size="md"
      title={jenis === 'sakit' ? 'Ajukan keterangan sakit' : 'Ajukan izin'}
      description={sesi ? judulSesiPresensi(sesi) : 'Untuk pertemuan kuliah pada tanggal tertentu.'}
      berubah={!!alasan || !!berkas}
      labelSimpan="Kirim pengajuan"
      onSimpan={async () => {
        const err: Record<string, string> = {};
        if (alasan.trim().length < 5) err.alasan = 'Tulis alasan singkat (minimal 5 huruf).';
        if (!sesi && !kelas) err.idj = 'Pilih kelas kuliah.';
        if (!sesi && !tgl) err.tanggal = 'Pilih tanggal pertemuan.';
        if (jenis === 'sakit' && !berkas) err.berkas = 'Lampirkan surat keterangan sakit.';
        setGalat(err);
        if (Object.keys(err).length) return false;
        try {
          const r = await siakad.request<IzinPresensi>({
            method: 'POST',
            path: `${P}/izin`,
            body: { ...(sesi ? { sesi_id: sesi.id } : { idj: Number(kelas), tanggal: tgl }), jenis, alasan: alasan.trim(), berkas_id: berkas },
          });
          invalidateSiakad('presensi');
          onSimpan?.(r.data);
        } catch (e) {
          return pesanGalatPresensi(e);
        }
      }}
    >
      <div className="u-presensi-form">
        <Field label="Jenis">
          <SegmentedControl
            fullWidth
            value={jenis}
            onValueChange={setJenis}
            options={[
              { value: 'izin', label: 'Izin' },
              { value: 'sakit', label: 'Sakit' },
            ]}
          />
        </Field>
        {!sesi && (
          <>
            <Field label="Kelas kuliah" required error={galat.idj}>
              <PilihEntitas jenis={SUMBER_KELAS_KULIAH} value={kelas} onValueChange={setKelas} />
            </Field>
            <Field label="Tanggal pertemuan" required error={galat.tanggal}>
              <IsianTanggal value={tgl} onValueChange={setTgl} />
            </Field>
          </>
        )}
        <Field label="Alasan" required error={galat.alasan}>
          <Textarea rows={3} maxLength={500} value={alasan} onChange={(e) => setAlasan(e.target.value)} />
        </Field>
        <Field label={jenis === 'sakit' ? 'Surat keterangan sakit' : 'Surat izin'} required={jenis === 'sakit'} optional={jenis === 'izin'} error={galat.berkas}>
          <PilihBerkas value={berkas} onValueChange={(id) => setBerkas(id)} accept=".pdf,.jpg,.jpeg,.png" kategori="presensi" modul="presensi" />
        </Field>
      </div>
    </PanelForm>
  );
}

const VARIAN_IZIN = { diajukan: 'warning', disetujui: 'success', ditolak: 'danger', batal: 'neutral' } as const;

/**
 * Daftar izin: milik saya (`sebagai="saya"`) atau yang menunggu persetujuan saya (`penyetuju`). Penyetuju bisa
 * membuka surat dan menyetujui/menolak; izin yang disetujui mengubah status A menjadi I/S di SIAKAD.
 */
export function DaftarIzinPresensi({ sebagai = 'saya', sesiId, className }: { sebagai?: 'saya' | 'penyetuju'; sesiId?: string; className?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [status, setStatus] = React.useState<'diajukan' | 'semua'>(sebagai === 'penyetuju' ? 'diajukan' : 'semua');
  const [tolak, setTolak] = React.useState<IzinPresensi | null>(null);
  const [catatan, setCatatan] = React.useState('');
  const q = useDaftarIzinPresensi({ sebagai, sesi_id: sesiId, status: status === 'semua' ? undefined : status });

  const proses = async (i: IzinPresensi, aksi: 'setujui' | 'tolak' | 'batal', cat?: string) => {
    try {
      await siakad.request({ method: 'POST', path: `${P}/izin/${i.id}/${aksi}`, body: cat ? { catatan: cat } : {} });
      invalidateSiakad('presensi');
      toast.add({ title: aksi === 'setujui' ? 'Izin disetujui' : aksi === 'tolak' ? 'Izin ditolak' : 'Pengajuan dibatalkan', type: 'success' });
    } catch (e) {
      toast.add({ title: 'Belum berhasil', description: pesanGalatPresensi(e), type: 'error' });
    }
  };
  const lihatSurat = async (i: IzinPresensi) => {
    try {
      const r = await siakad.request<unknown>({ method: 'GET', path: `${P}/izin/${i.id}/berkas`, query: { unduh: '1' } });
      const d = r.data as { blob?: () => Blob } | Blob | null;
      const blob = d instanceof Blob ? d : d && typeof d === 'object' && typeof d.blob === 'function' ? d.blob() : null;
      if (!blob) throw new Error('Surat tidak dapat dibuka.');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      toast.add({ title: 'Surat tidak bisa dibuka', description: pesanGalat(e), type: 'error' });
    }
  };

  const daftar = q.data ?? [];
  return (
    <div className={cn('u-presensi-izin', className)}>
      <SegmentedControl
        aria-label="Saring izin"
        value={status}
        onValueChange={setStatus}
        options={[
          { value: 'diajukan', label: 'Menunggu' },
          { value: 'semua', label: 'Semua' },
        ]}
      />
      {q.loading && !q.data ? (
        <Skeleton style={{ height: 160 }} />
      ) : q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : daftar.length === 0 ? (
        <Empty icon={<FileText aria-hidden />} title={status === 'diajukan' ? 'Tidak ada izin yang menunggu' : 'Belum ada pengajuan izin'} />
      ) : (
        <ul className="u-presensi-daftar-sesi">
          {daftar.map((i) => (
            <li key={i.id}>
              <div>
                <p className="u-presensi-sesi-judul">
                  {sebagai === 'penyetuju' ? `${i.nama ?? i.subjek} · ` : ''}
                  {i.jenis === 'sakit' ? 'Sakit' : 'Izin'}: {i.sesi_judul ?? `kelas ${i.idj}`}
                </p>
                <p className="u-presensi-sesi-meta">
                  {tanggalPanjang(i.tanggal)} · {i.alasan}
                </p>
                {i.catatan_proses && <p className="u-presensi-sub">Catatan: {i.catatan_proses}</p>}
              </div>
              <div className="u-presensi-sesi-aksi">
                <Badge variant={VARIAN_IZIN[i.status]}>{i.status}</Badge>
                {i.berkas_id && (
                  <Button size="xs" variant="ghost" onClick={() => void lihatSurat(i)}>
                    <FileText aria-hidden /> Surat
                  </Button>
                )}
                {sebagai === 'penyetuju' && i.status === 'diajukan' && (
                  <>
                    <Button size="xs" onClick={() => void proses(i, 'setujui')}>
                      Setujui
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        setCatatan('');
                        setTolak(i);
                      }}
                    >
                      Tolak
                    </Button>
                  </>
                )}
                {sebagai === 'saya' && i.status === 'diajukan' && (
                  <Button size="xs" variant="ghost" onClick={() => void proses(i, 'batal')}>
                    Batalkan
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={!!tolak}
        onOpenChange={(o) => !o && setTolak(null)}
        title="Tolak pengajuan izin?"
        description="Peserta melihat catatan ini. Status kehadirannya tidak berubah."
        footer={
          <>
            <Button variant="ghost" onClick={() => setTolak(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                const i = tolak!;
                setTolak(null);
                await proses(i, 'tolak', catatan.trim() || undefined);
              }}
            >
              Tolak izin
            </Button>
          </>
        }
      >
        <Field label="Catatan untuk peserta" optional>
          <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        </Field>
      </Dialog>
    </div>
  );
}

// ================================================================ Titik kerja (kiosk)
/**
 * Layar kiosk titik presensi kerja (tablet/TV di gerbang atau kantor). Memakai token aplikasi berscope
 * `presensi:kiosk`; QR berganti dan jam besar. Dosen/tendik memindai dengan PindaiPresensi untuk masuk/pulang.
 */
export function LayarKioskPresensi({ titik, renderQr, className }: { titik: string; renderQr?: RenderQrPresensi; className?: string }) {
  const qr = useQrBerganti(`${P}/titik/${encodeURIComponent(titik)}/qr`);
  const [kini, setKini] = React.useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setKini(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const q = qr.data;
  return (
    <div className={cn('u-presensi-kiosk', className)}>
      <header>
        <p className="u-presensi-layar-sub">{q?.titik?.untuk === 'dosen' ? 'Presensi dosen' : q?.titik?.untuk === 'tendik' ? 'Presensi tendik' : 'Presensi pegawai'}</p>
        <h2>{q?.titik?.nama ?? ' '}</h2>
      </header>
      <time className="u-presensi-kiosk-jam" dateTime={kini.toISOString()}>
        {kini.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </time>
      <p className="u-presensi-kiosk-tanggal">{kini.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      {q ? (
        <>
          <GambarQrPresensi qr={q} ukuran={360} renderQr={renderQr} />
          <BilahWaktuQr sisa={qr.sisa} interval={q.interval_detik} />
          {q.hari_ini && (
            <p className="u-presensi-kiosk-hitung">
              {q.hari_ini.masuk} masuk · {q.hari_ini.pulang} pulang hari ini
            </p>
          )}
        </>
      ) : qr.error ? (
        <GalatApi error={qr.error} title="QR titik belum bisa dimuat" message={pesanGalatPresensi(qr.error)} onRetry={qr.muatUlang} />
      ) : (
        <Skeleton style={{ width: 360, maxWidth: '100%', aspectRatio: '1' }} />
      )}
      <p className="u-presensi-petunjuk">
        <ScanLine aria-hidden /> Pindai dengan aplikasi UNIPO untuk masuk atau pulang.
      </p>
    </div>
  );
}

export function useDaftarTitikPresensi(semua = false) {
  return useSiakadQuery<TitikPresensi[]>(['presensi', 'titik', semua], (s, signal) => s.request({ method: 'GET', path: `${P}/titik`, query: semua ? { semua: 1 } : {} }, { signal }));
}

const LABEL_JENIS_TITIK: Record<TitikPresensi['jenis'], string> = { gerbang: 'Gerbang', kantor: 'Kantor', ruang: 'Ruang', lainnya: 'Lainnya' };
const LABEL_UNTUK_TITIK: Record<TitikPresensi['untuk'], string> = { pegawai: 'Dosen dan tendik', dosen: 'Dosen saja', tendik: 'Tendik saja' };

/** Tambah/ubah titik presensi kerja. */
export function FormTitikPresensi({ open, onOpenChange, titik, onSimpan }: { open: boolean; onOpenChange: (o: boolean) => void; titik?: TitikPresensi | null; onSimpan?: (t: TitikPresensi) => void }) {
  const siakad = useSiakad();
  const awal = React.useCallback(
    () => ({
      kode: titik?.kode ?? '',
      nama: titik?.nama ?? '',
      jenis: titik?.jenis ?? 'kantor',
      untuk: titik?.untuk ?? 'pegawai',
      unit: titik?.unit ?? null,
      lokasi: titik?.lokasi ? `${titik.lokasi.lat},${titik.lokasi.lng}` : '',
      radius_m: String(titik?.lokasi?.radius_m ?? 150),
      wajib_lokasi: titik?.wajib_lokasi ?? true,
      interval_detik: String(titik?.interval_detik ?? 20),
      aktif: titik?.aktif ?? true,
      keterangan: titik?.keterangan ?? '',
      ganti_rahasia: false,
    }),
    [titik],
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
      title={titik ? `Ubah titik ${titik.nama}` : 'Titik presensi baru'}
      description="Tablet atau TV di gerbang/kantor yang menampilkan QR untuk masuk dan pulang."
      berubah={berubah}
      onSimpan={async () => {
        const err: Record<string, string> = {};
        if (!/^[A-Za-z0-9_.-]{2,40}$/.test(f.kode)) err.kode = 'Huruf, angka, titik, atau garis; 2-40 karakter.';
        if (!f.nama.trim()) err.nama = 'Tulis nama titik.';
        if (f.wajib_lokasi && !f.lokasi) err.lokasi = 'Isi koordinat titik agar lokasi pemindai bisa diperiksa.';
        setGalat(err);
        if (Object.keys(err).length) return false;
        try {
          const r = await siakad.request<TitikPresensi>({
            method: 'POST',
            path: titik ? `${P}/titik/${titik.id}` : `${P}/titik`,
            body: {
              ...f,
              nama: f.nama.trim(),
              lokasi: f.lokasi || null,
              radius_m: Number(f.radius_m) || 150,
              interval_detik: Number(f.interval_detik) || 20,
              keterangan: f.keterangan || null,
            },
          });
          invalidateSiakad('presensi');
          onSimpan?.(r.data);
        } catch (e) {
          return pesanGalatPresensi(e);
        }
      }}
    >
      <div className="u-presensi-form">
        <div className="u-presensi-form-baris">
          <Field label="Nama" required error={galat.nama}>
            <Input value={f.nama} onChange={(e) => set('nama', e.target.value)} placeholder="Mis. Gerbang utama" />
          </Field>
          <Field label="Kode" required error={galat.kode} description="Dipakai di alamat layar kiosk.">
            <Input value={f.kode} onChange={(e) => set('kode', e.target.value)} placeholder="gerbang-utama" />
          </Field>
        </div>
        <div className="u-presensi-form-baris">
          <Field label="Jenis">
            <Pilihan required value={f.jenis} onValueChange={(v) => v && set('jenis', v as TitikPresensi['jenis'])} options={Object.entries(LABEL_JENIS_TITIK).map(([value, label]) => ({ value, label }))} />
          </Field>
          <Field label="Untuk">
            <Pilihan required value={f.untuk} onValueChange={(v) => v && set('untuk', v as TitikPresensi['untuk'])} options={Object.entries(LABEL_UNTUK_TITIK).map(([value, label]) => ({ value, label }))} />
          </Field>
        </div>
        <Field label="Unit" optional description="Pemilik titik; juga menentukan gaya QR.">
          <PilihEntitas jenis="unit" value={f.unit} onValueChange={(v) => set('unit', v)} />
        </Field>
        <Field label="Lokasi" error={galat.lokasi} optional={!f.wajib_lokasi}>
          <PilihLokasiPeta
            value={titikDariTeks(f.lokasi)}
            onChange={(t) => set('lokasi', t ? `${t.lat},${t.lng}` : '')}
            radius={Number(f.radius_m) || 150}
            onRadiusChange={(m) => set('radius_m', String(m))}
            tinggi={260}
          />
        </Field>
        <div className="u-presensi-form-baris">
          <Field label="QR berganti tiap (detik)">
            <IsianAngka value={keAngka(f.interval_detik)} min={10} max={300} onValueChange={(n) => set('interval_detik', teksAngka(n))} />
          </Field>
        </div>
        <Field label="Wajib di lokasi" description="Tolak pindaian tanpa lokasi atau di luar radius.">
          <Switch checked={f.wajib_lokasi} onCheckedChange={(v) => set('wajib_lokasi', v)} />
        </Field>
        <Field label="Aktif">
          <Switch checked={f.aktif} onCheckedChange={(v) => set('aktif', v)} />
        </Field>
        {titik && (
          <Field label="Ganti kunci QR" description="QR yang sedang tampil langsung tidak berlaku. Pakai bila layar kiosk pernah difoto dan disebar.">
            <Switch checked={f.ganti_rahasia} onCheckedChange={(v) => set('ganti_rahasia', v)} />
          </Field>
        )}
        <Field label="Keterangan" optional>
          <Textarea rows={2} value={f.keterangan} onChange={(e) => set('keterangan', e.target.value)} />
        </Field>
      </div>
    </PanelForm>
  );
}

/** Kelola titik presensi kerja: daftar, tambah/ubah, hapus, dan jejak pindaian hari ini. Admin presensi/SDM. */
export function KelolaTitikPresensi({ alamatKiosk, className }: { /** Bentuk alamat layar kiosk, mis. `(kode) => \`/kiosk/${kode}\``. */ alamatKiosk?: (kode: string) => string; className?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useDaftarTitikPresensi(true);
  const [form, setForm] = React.useState<TitikPresensi | null | false>(false);
  const [jejak, setJejak] = React.useState<TitikPresensi | null>(null);
  const daftar = q.data ?? [];
  return (
    <div className={cn('u-presensi-kelola', className)}>
      <div className="u-presensi-alat">
        <p className="u-presensi-petunjuk">Perangkat kiosk memakai token aplikasi dengan scope presensi:kiosk.</p>
        <Button onClick={() => setForm(null)}>
          <Plus aria-hidden /> Titik baru
        </Button>
      </div>
      {q.loading && !q.data ? (
        <Skeleton style={{ height: 200 }} />
      ) : q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : daftar.length === 0 ? (
        <Empty
          bordered
          icon={<DoorOpen aria-hidden />}
          title="Belum ada titik presensi kerja"
          description="Tambahkan gerbang atau kantor, lalu pasang layar kiosk di sana."
          actions={
            <Button onClick={() => setForm(null)}>
              <Plus aria-hidden /> Tambah titik
            </Button>
          }
        />
      ) : (
        <ul className="u-presensi-daftar-sesi">
          {daftar.map((t) => (
            <li key={t.id} data-nonaktif={!t.aktif || undefined}>
              <div>
                <p className="u-presensi-sesi-judul">{t.nama}</p>
                <p className="u-presensi-sesi-meta">
                  {LABEL_JENIS_TITIK[t.jenis]} · {LABEL_UNTUK_TITIK[t.untuk]} · {t.lokasi ? `radius ${t.lokasi.radius_m} m${t.wajib_lokasi ? ', wajib' : ''}` : 'tanpa lokasi'}
                </p>
              </div>
              <div className="u-presensi-sesi-aksi">
                {!t.aktif && <Badge>Nonaktif</Badge>}
                <Menu
                  trigger={
                    <Button size="xs" variant="ghost" iconOnly aria-label={`Aksi ${t.nama}`}>
                      <MoreHorizontal aria-hidden />
                    </Button>
                  }
                  items={[
                    ...(alamatKiosk ? [{ label: 'Buka layar kiosk', icon: <QrCode aria-hidden />, href: alamatKiosk(t.kode) }] : []),
                    { label: 'Jejak hari ini', icon: <History aria-hidden />, onSelect: () => setJejak(t) },
                    { label: 'Ubah', icon: <Pencil aria-hidden />, onSelect: () => setForm(t) },
                    { type: 'separator' as const },
                    {
                      label: 'Hapus',
                      icon: <Trash2 aria-hidden />,
                      destructive: true,
                      onSelect: async () => {
                        try {
                          await siakad.request({ method: 'POST', path: `${P}/titik/${t.id}/hapus` });
                          invalidateSiakad('presensi');
                          toast.add({ title: `Titik ${t.nama} dihapus`, type: 'success' });
                        } catch (e) {
                          toast.add({ title: 'Belum terhapus', description: pesanGalatPresensi(e), type: 'error' });
                        }
                      },
                    },
                  ]}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <FormTitikPresensi open={form !== false} onOpenChange={(o) => !o && setForm(false)} titik={form || null} onSimpan={() => setForm(false)} />
      <Dialog open={!!jejak} onOpenChange={(o) => !o && setJejak(null)} title={`Jejak ${jejak?.nama ?? ''}`} description="Pindaian hari ini, termasuk yang ditolak." size="lg">
        {jejak && <JejakTitik id={jejak.id} />}
      </Dialog>
    </div>
  );
}

function JejakTitik({ id }: { id: string }) {
  const q = useSiakadQuery<{ log: LogPindaiPresensi[] }>(['presensi', 'titik', id, 'log'], (s, signal) => s.request({ method: 'GET', path: `${P}/titik/${id}/log` }, { signal }), { staleTime: 5_000 });
  if (q.loading && !q.data) return <Skeleton style={{ height: 160 }} />;
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  return <TabelJejak log={q.data!.log} />;
}

// ================================================================ Modul peserta
/**
 * Halaman presensi peserta lengkap: pindai, kartu QR, sesi berlangsung + riwayat, dan izin saya. Untuk aplikasi
 * mahasiswa (LMS), dosen, dan tendik.
 */
export function ModulPresensiSaya({ renderQr, className }: { renderQr?: RenderQrPresensi; className?: string }) {
  const [tab, setTab] = React.useState<'beranda' | 'pindai' | 'kartu' | 'izin'>(() => (tokenPresensiDariUrl() ? 'pindai' : 'beranda'));
  const [izin, setIzin] = React.useState<SesiPresensi | null | false>(false);
  return (
    <div className={cn('u-presensi-modul', className)}>
      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'beranda', label: 'Presensi', icon: <ListChecks aria-hidden />, content: <PresensiSaya onPindai={() => setTab('pindai')} onAjukanIzin={(s) => setIzin(s)} /> },
          { value: 'pindai', label: 'Pindai', icon: <ScanLine aria-hidden />, content: <PindaiPresensi onBerhasil={() => undefined} /> },
          { value: 'kartu', label: 'Kartu QR', icon: <QrCode aria-hidden />, content: <KartuQrSaya renderQr={renderQr} /> },
          {
            value: 'izin',
            label: 'Izin',
            icon: <FileText aria-hidden />,
            content: (
              <div className="u-presensi-izin">
                <Button variant="outline" onClick={() => setIzin(null)}>
                  <Plus aria-hidden /> Ajukan izin kuliah
                </Button>
                <DaftarIzinPresensi sebagai="saya" />
              </div>
            ),
          },
        ]}
      />
      <PengajuanIzinPresensi open={izin !== false} onOpenChange={(o) => !o && setIzin(false)} sesi={izin || null} onSimpan={() => setIzin(false)} />
    </div>
  );
}

/** Pilihan untuk <Pilihan>: status hadir. */
export const OPSI_STATUS_HADIR: SelectOption<string>[] = (['H', 'I', 'S', 'A'] as StatusHadir[]).map((v) => ({ value: v, label: LABEL_STATUS_HADIR[v] }));

