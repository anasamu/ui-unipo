'use client';
import * as React from 'react';
import { CircleDot, Lock, LockOpen } from 'lucide-react';
import { cn } from '../lib/cn';
import { Alert } from '../components/display';
import { Badge } from '../components/actions';
import { Select, type SelectOption } from '../components/select';
import { useToast } from '../components/overlays';
import { useOptionalSiakad, useSiakadQuery } from './provider';

/**
 * Kunci periode akademik (SIAKAD docs/KUNCI_PERIODE.md). Semua periode sebelum periode aktif DITUTUP: perubahan datanya
 * ditolak API dengan 423 `periode_ditutup` untuk semua peran. Pengecualian waktu jenis "Buka kembali periode" membuka
 * sementara untuk fitur + prodi tertentu.
 */

/** Fitur yang bisa dibuka kembali per bagian (sama dengan KunciPeriode::MODUL di SIAKAD). */
export type FiturKunci =
  | 'krs' | 'nilai' | 'jadwal' | 'presensi' | 'ujian' | 'ta' | 'bkd' | 'keuangan' | 'beasiswa' | 'status' | 'mbkm' | 'edom' | 'lms' | 'lp2m' | 'kelulusan' | 'kalender' | 'lain';

export interface BukaKembaliBerlaku {
  id: string;
  /** Fitur, atau "*" untuk semua fitur. */
  modul: string;
  /** Kode prodi, atau "*" untuk semua prodi. */
  kode_prodi: string;
  mulai: string | null;
  sampai: string;
  alasan: string;
  oleh: string | null;
}

/** Satu baris `GET /v1/kalender/kunci`. */
export interface StatusPeriode {
  tahun_id: string;
  nama: string;
  aktif: boolean;
  ditutup: boolean;
  keadaan: 'aktif' | 'dibuka' | 'ditutup' | 'dibuka_kembali';
  sejak: string | null;
  oleh: string | null;
  alasan: string | null;
  sumber: 'bawaan' | 'otomatis' | 'manual' | null;
  buka_kembali: BukaKembaliBerlaku[];
  dibuka_kembali_sampai: string | null;
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** "30 Apr 2026" atau "30 Apr 2026, 16.00". */
export function tanggalKunci(v: string | null | undefined): string {
  if (!v) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(v);
  if (!m) return v;
  const jam = m[4] && !['00:00', '23:59'].includes(`${m[4]}:${m[5]}`) ? `, ${m[4]}.${m[5]}` : '';
  return `${Number(m[3])} ${BULAN[Number(m[2]) - 1]} ${m[1]}${jam}`;
}

/** Status kunci semua periode (dibagi semua pemakai, segar tiap menit). Diam (data kosong) bila API belum mendukung. */
export function useKunciPeriode() {
  const q = useSiakadQuery<StatusPeriode[]>(['kalender', 'kunci'], (s, signal) => s.request<StatusPeriode[]>({ method: 'GET', path: '/v1/kalender/kunci', query: { batas: 60 } }, { signal }) as never, {
    staleTime: 60_000,
  });
  const peta = React.useMemo(() => new Map((q.data ?? []).map((p) => [p.tahun_id, p])), [q.data]);
  const meta = (q.meta ?? {}) as { aktif?: string; modul?: Record<string, string>; boleh_buka_kembali?: boolean };
  return { ...q, peta, aktif: meta.aktif ?? null, modul: meta.modul ?? {}, bolehBukaKembali: Boolean(meta.boleh_buka_kembali) };
}

/** Buka kembali yang cocok untuk fitur + prodi (aturan sama dengan penjaga API). */
export function bukaKembaliCocok(s: StatusPeriode | null | undefined, fitur: string = 'lain', prodi: string[] = []): BukaKembaliBerlaku | null {
  if (!s) return null;
  const calon = s.buka_kembali.filter((b) => b.modul === '*' || b.modul === fitur);
  const semua = calon.find((b) => b.kode_prodi === '*');
  if (semua) return semua;
  if (!prodi.length) return null;
  return prodi.every((p) => calon.some((b) => b.kode_prodi === p)) ? (calon[0] ?? null) : null;
}

export interface PeriodeTerkunci {
  /** true = tombol tambah/ubah/hapus untuk fitur ini dinonaktifkan. */
  terkunci: boolean;
  status: StatusPeriode | null;
  /** Buka kembali yang membuat fitur ini boleh diubah sementara. */
  bukaKembali: BukaKembaliBerlaku | null;
  /** Kalimat siap tampil. */
  pesan: string;
  loading: boolean;
}

/**
 * Apakah perubahan data periode ini (untuk fitur + prodi) dikunci? Halaman memakai `terkunci` untuk menonaktifkan tombol
 * tambah/ubah/hapus dan menampilkan <BannerPeriodeTerkunci />. API tetap penentu akhir (423).
 */
export function usePeriodeTerkunci(periode: string | null | undefined, opsi: { fitur?: FiturKunci; prodi?: string | string[] | null } = {}): PeriodeTerkunci {
  const { peta, loading } = useKunciPeriode();
  const s = periode ? (peta.get(periode) ?? null) : null;
  const prodi = opsi.prodi ? (Array.isArray(opsi.prodi) ? opsi.prodi : [opsi.prodi]) : [];
  const bk = bukaKembaliCocok(s, opsi.fitur ?? 'lain', prodi);
  const terkunci = Boolean(s?.ditutup) && !bk;
  const pesan = !s
    ? ''
    : terkunci
      ? `Periode ${s.nama} sudah ditutup${s.sejak ? ` sejak ${tanggalKunci(s.sejak)}` : ''}. Data hanya bisa dilihat.`
      : bk
        ? `Periode ${s.nama} dibuka kembali s.d. ${tanggalKunci(bk.sampai)}${bk.alasan ? ` (${bk.alasan})` : ''}.`
        : s.aktif
          ? `Periode ${s.nama} sedang aktif.`
          : `Periode ${s.nama} dibuka.`;
  return { terkunci, status: s, bukaKembali: bk, pesan, loading };
}

/** Lencana status periode: Aktif, Ditutup (gembok), Dibuka kembali s.d. … */
export function LencanaPeriode({ status, className }: { status: StatusPeriode | null | undefined; className?: string }) {
  if (!status) return null;
  if (status.keadaan === 'aktif')
    return (
      <Badge variant="success" className={cn('u-lencana-periode', className)}>
        <CircleDot aria-hidden /> Aktif
      </Badge>
    );
  if (status.keadaan === 'dibuka_kembali')
    return (
      <Badge variant="warning" className={cn('u-lencana-periode', className)} title={status.buka_kembali.map((b) => b.alasan).join('; ')}>
        <LockOpen aria-hidden /> Dibuka kembali s.d. {tanggalKunci(status.dibuka_kembali_sampai)}
      </Badge>
    );
  if (status.keadaan === 'ditutup')
    return (
      <Badge variant="neutral" className={cn('u-lencana-periode', className)} title={status.alasan ?? undefined}>
        <Lock aria-hidden /> Ditutup
      </Badge>
    );
  return null;
}

/** Keterangan kecil untuk opsi pemilih periode. */
export function keteranganPeriode(s: StatusPeriode | null | undefined): string | undefined {
  if (!s) return undefined;
  if (s.keadaan === 'aktif') return 'Periode aktif';
  if (s.keadaan === 'dibuka_kembali') return `Dibuka kembali s.d. ${tanggalKunci(s.dibuka_kembali_sampai)}`;
  if (s.keadaan === 'ditutup') return `Ditutup${s.sejak ? ` sejak ${tanggalKunci(s.sejak)}` : ''} · hanya lihat`;
  return undefined;
}

/**
 * Opsi Select periode dengan status kunci: label nama periode, ikon gembok untuk periode ditutup, keterangan "Periode
 * aktif" / "Ditutup sejak …" / "Dibuka kembali s.d. …". `daftar` dari aplikasi (tahun_id + nama), status dari API.
 */
export function useOpsiPeriode(daftar: Array<{ tahun_id: string; nama?: string | null }>, label?: (tahunId: string) => string): SelectOption<string>[] {
  const { peta } = useKunciPeriode();
  return daftar.map((t) => {
    const s = peta.get(t.tahun_id);
    return {
      value: t.tahun_id,
      label: label ? label(t.tahun_id) : (t.nama ?? s?.nama ?? t.tahun_id),
      description: keteranganPeriode(s),
      icon: s?.keadaan === 'ditutup' ? <Lock aria-hidden className="u-opsi-periode-ikon" data-keadaan="ditutup" /> : s?.keadaan === 'dibuka_kembali' ? <LockOpen aria-hidden className="u-opsi-periode-ikon" data-keadaan="dibuka_kembali" /> : s?.keadaan === 'aktif' ? <CircleDot aria-hidden className="u-opsi-periode-ikon" data-keadaan="aktif" /> : undefined,
    };
  });
}

export interface PilihPeriodeAkademikProps {
  value: string | null;
  onValueChange: (tahunId: string) => void;
  /** Daftar periode dari aplikasi; kosong = dari API kunci periode (60 terbaru). */
  daftar?: Array<{ tahun_id: string; nama?: string | null }>;
  label?: (tahunId: string) => string;
  className?: string;
  'aria-label'?: string;
  /** Tampilkan lencana status di dalam isian pemilih (rata kanan, tidak menggeser penjajaran saringan). Bawaan true. */
  lencana?: boolean;
}

/** Pemilih periode akademik dengan status kunci (aktif, ditutup, dibuka kembali). */
export function PilihPeriodeAkademik({ value, onValueChange, daftar, label, className, lencana = true, ...rest }: PilihPeriodeAkademikProps) {
  const k = useKunciPeriode();
  const sumber = daftar ?? (k.data ?? []).map((s) => ({ tahun_id: s.tahun_id, nama: s.nama }));
  const opsi = useOpsiPeriode(sumber, label);
  return (
    <div className={cn('u-pilih-periode-akademik', className)}>
      <Select
        options={opsi}
        value={value}
        onValueChange={(v) => v && onValueChange(String(v))}
        aria-label={rest['aria-label'] ?? 'Periode akademik'}
        lencana={lencana ? <LencanaPeriode status={value ? k.peta.get(value) : null} /> : null}
      />
    </div>
  );
}

export interface BannerPeriodeTerkunciProps {
  periode: string | null | undefined;
  fitur?: FiturKunci;
  prodi?: string | string[] | null;
  /** Tampilkan juga saat periode dibuka kembali (bawaan true). */
  tampilkanBukaKembali?: boolean;
  className?: string;
}

/** Banner "Periode ditutup — hanya lihat" (atau "dibuka kembali s.d. …") di halaman tulis berperiode. */
export function BannerPeriodeTerkunci({ periode, fitur, prodi, tampilkanBukaKembali = true, className }: BannerPeriodeTerkunciProps) {
  const t = usePeriodeTerkunci(periode, { fitur, prodi });
  if (!t.status) return null;
  if (t.terkunci)
    return (
      <Alert variant="warning" icon={<Lock aria-hidden />} title="Periode ditutup — hanya lihat" className={cn('u-banner-periode', className)}>
        {t.pesan} Perubahan hanya lewat Pengecualian waktu jenis "Buka kembali periode" di BAAK.
      </Alert>
    );
  if (t.bukaKembali && tampilkanBukaKembali)
    return (
      <Alert variant="info" icon={<LockOpen aria-hidden />} title={`Dibuka kembali s.d. ${tanggalKunci(t.bukaKembali.sampai)}`} className={cn('u-banner-periode', className)}>
        {t.pesan} Setelah tanggal itu periode otomatis terkunci lagi.
      </Alert>
    );
  return null;
}

// ---------------------------------------------------------------- Penanganan 423 global

export interface GalatPeriodeDitutup {
  message: string;
  details?: { tahun_id?: string; nama?: string; ditutup_sejak?: string | null; modul_label?: string; saran?: string };
}

let terakhir: GalatPeriodeDitutup | null = null;
const pendengar = new Set<(g: GalatPeriodeDitutup) => void>();

/** Laporkan galat 423 periode_ditutup (otomatis oleh fetchPemeliharaan). Komponen <PemberitahuanPeriodeDitutup /> menampilkan toast. */
export function laporPeriodeDitutup(g: GalatPeriodeDitutup) {
  terakhir = g;
  pendengar.forEach((l) => l(g));
}

/** Galat 423 terakhir (null bila belum ada). */
export function galatPeriodeTerakhir() {
  return terakhir;
}

/**
 * Toast rapi untuk setiap penolakan 423 dari API (dipasang otomatis oleh <UnipoProvider>). Juga menyegarkan status kunci
 * (mis. masa buka kembali baru berakhir).
 */
export function PemberitahuanPeriodeDitutup() {
  const toast = useToast();
  const siakad = useOptionalSiakad();
  React.useEffect(() => {
    const l = (g: GalatPeriodeDitutup) => {
      toast.add({ title: 'Periode ditutup', description: g.message, type: 'warning' });
    };
    pendengar.add(l);
    return () => void pendengar.delete(l);
  }, [toast, siakad]);
  return null;
}

/** Apakah galat SDK ini penolakan kunci periode? */
export function galatPeriodeDitutup(e: unknown): boolean {
  const err = e as { status?: number; code?: string } | null;
  return err?.status === 423;
}
