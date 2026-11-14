'use client';
import * as React from 'react';
import { BookOpen, Check, ChevronRight, Maximize2, CircleAlert, ClipboardList, FileText, GraduationCap, Info, Layers, ListChecks, Network, RefreshCw, Target, TriangleAlert } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { formatDate, formatNumber, formatPersen } from '../lib/format';
import { Badge, Button, Skeleton, type BadgeVariant } from '../components/actions';
import { Alert, Empty, Progress, ProgressRing, Table, TableContainer } from '../components/display';
import { ActivityFeed, Panel, SegmentBar, StatCard, StatGrid } from '../components/charts';
import { Sheet } from '../components/overlays';
import { invalidateSiakad, pesanGalat, useOptionalSiakad, useSiakadQuery, type QueryState } from './provider';

/*
 * Widget Kurikulum OBE (/v1/kurikulum-obe, Permendiktisaintek 39/2025): daftar kurikulum, ringkasan & alur status,
 * validasi SN Dikti, profil lulusan, CPL per ranah, matriks pemetaan (profil–CPL, CPL–BK, CPL–MK, BK–MK) yang bisa diubah,
 * struktur MK per semester dengan batas SKS, CPMK & sub-CPMK, RPS, capaian CPL (prodi dan per mahasiswa),
 * status migrasi dari kurikulum lama, ekuivalensi MK, dan catatan peninjauan.
 */

// ================================================================ Tipe
type Angka = number | string | null | undefined;
const n = (v: Angka) => (v == null || v === '' ? 0 : Number(v) || 0);
const daftar = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map((x) => (typeof x === 'object' && x ? String((x as { kode_mk?: string; kode?: string }).kode_mk ?? (x as { kode?: string }).kode ?? '') : String(x)))
    : typeof v === 'string' && v
      ? v.split(',')
      : [];

export type StatusKurikulum = 'draf' | 'diajukan' | 'disahkan' | 'berlaku' | 'arsip';
export interface Kurikulum {
  id: number;
  kode_prodi: string;
  nama_prodi?: string | null;
  kode_jenjang?: string | null;
  kode: string;
  nama: string;
  status: StatusKurikulum;
  versi?: number;
  sumber?: 'baru' | 'migrasi' | 'salinan';
  tahun_berlaku?: number | null;
  tahun_id_mulai?: string | null;
  regulasi?: string | null;
  no_sk?: string | null;
  tanggal_sk?: string | null;
  masa_tempuh?: number | null;
  sks_lulus?: Angka;
  sks_wajib?: Angka;
  sks_pilihan?: Angka;
  ipk_min_lulus?: Angka;
  jumlah_mk?: Angka;
  total_sks_mk?: Angka;
  jumlah_cpl?: Angka;
  jenjang?: { nama?: string; sks_min?: number | null; masa_tempuh?: number | null; batas_semester?: boolean } | null;
  ringkasan?: Partial<Record<'profil_lulusan' | 'cpl' | 'bahan_kajian' | 'mata_kuliah' | 'sks_wajib_mk' | 'sks_pilihan_mk' | 'cpmk' | 'mk_dengan_rps_disahkan', Angka>>;
  angkatan?: number[];
  transisi_status?: StatusKurikulum[];
  disahkan_at?: string | null;
  updated_at?: string | null;
}
export interface MkKurikulum {
  id: number;
  kode_mk: string;
  nama: string;
  semester: number | null;
  sks: Angka;
  jenis: 'A' | 'B' | 'C' | 'D' | 'S' | 'W' | string;
  jumlah_cpmk?: Angka;
  cpl?: string[] | string | null;
  prasyarat?: unknown;
  status_rps?: string | null;
  modalitas?: string | null;
  deskripsi?: string | null;
  cpmk?: Cpmk[];
}
export interface Cpmk {
  id: number;
  kode: string;
  deskripsi: string;
  target?: Angka;
  cpl?: Array<{ cpl_id: number; kode: string; bobot?: Angka }>;
  sub_cpmk?: Array<{ id: number; kode: string; deskripsi: string; indikator?: string | null }>;
}
export type RanahCpl = 'sikap' | 'pengetahuan' | 'keterampilan_umum' | 'keterampilan_khusus';
export interface Cpl {
  id: number;
  kode: string;
  ranah: RanahCpl;
  kelompok_sn?: string | null;
  deskripsi: string;
  sumber?: string | null;
  target?: Angka;
  mata_kuliah?: Array<{ mk_id: number; kode_mk: string; nama: string; bobot?: Angka }>;
}
export interface ProfilLulusan {
  id: number;
  kode: string;
  nama: string;
  deskripsi?: string | null;
}
export interface BahanKajian {
  id: number;
  kode: string;
  nama: string;
  deskripsi?: string | null;
}
export type NamaMatriks = 'profil-cpl' | 'cpl-bk' | 'cpl-mk' | 'bk-mk';
export type MatriksKurikulumData = Record<NamaMatriks, Array<Record<string, number>>>;
export interface ValidasiKurikulumData {
  ringkasan: {
    galat: number;
    peringatan: number;
    info: number;
    regulasi?: string;
    jenjang?: string;
    sks_wajib_mk?: Angka;
    sks_pilihan_mk?: Angka;
    jumlah_mk?: Angka;
    jumlah_cpl?: Angka;
    kelengkapan_persen?: Angka;
    siap_disahkan?: boolean;
  };
  temuan: Array<{ tingkat: 'galat' | 'peringatan' | 'info'; kode: string; pesan: string; pasal?: string | null }>;
}
export interface CapaianCplData {
  angkatan?: number | null;
  sampai_tahun_id?: string | null;
  metode?: string | null;
  cpl: Array<{ cpl_id: number; kode: string; ranah: string; deskripsi: string; target: Angka; jumlah_mk: Angka; jumlah_mahasiswa: Angka; rata_rata: Angka; persen_tercapai: Angka }>;
}
export interface CapaianMahasiswaData {
  mahasiswa: { nim: string; nama: string; kode_prodi: string; angkatan: number };
  kurikulum: { id: number; kode: string; nama: string; status: string };
  cpl: Array<{
    cpl_id: number;
    kode: string;
    ranah: string;
    deskripsi: string;
    target: Angka;
    nilai: Angka;
    tercapai: boolean | null;
    mk_sudah_dinilai: number;
    mk_total: number;
    mata_kuliah: Array<{ mk_id: number; kode_mk: string; nama: string; bobot: Angka; nilai: Angka }>;
  }>;
}
export interface Rps {
  id: number;
  versi: number;
  status: 'draf' | 'disahkan' | 'arsip';
  tahun_id?: string | null;
  deskripsi?: string | null;
  materi_pokok?: string | null;
  pustaka_utama?: string[];
  pustaka_pendukung?: string[];
  dosen_pengampu?: string[];
  disahkan_at?: string | null;
  mata_kuliah?: { kode_mk?: string; nama?: string; sks?: Angka; semester?: number | null };
  cpl?: Array<{ kode: string; deskripsi: string }>;
  cpmk?: Cpmk[];
  pertemuan: Array<{
    pertemuan_ke: number;
    sampai_ke?: number | null;
    sub_cpmk_id?: number | null;
    materi?: string | null;
    indikator?: string | null;
    metode?: string | null;
    modalitas?: string | null;
    waktu_menit?: number | null;
    penugasan?: string | null;
    bobot?: Angka;
    ujian?: boolean;
  }>;
  evaluasi: Array<{ jenis_evaluasi: number; nama: string; bobot: Angka; komponen_siakad?: string | null; cpmk?: Array<{ cpmk_id: number; bobot: Angka }> }>;
  total_bobot_evaluasi?: Angka;
}
export interface StatusMigrasiProdi {
  kode_prodi: string;
  nama_prodi: string;
  jenjang?: string;
  tahap: '1_belum' | '2_dilengkapi' | '3_disahkan' | '4_diterbitkan';
  lama?: { jumlah_semester: number; semester_terakhir?: string | null; mk_semester_terakhir?: number };
  impor_terakhir?: { tahun_id: string; waktu: string } | null;
  terbit_terakhir?: { tahun_id: string; waktu: string } | null;
}
export interface Ekuivalensi {
  id: number;
  kode_mk_lama: string;
  nama_mk_lama?: string | null;
  sks_lama?: Angka;
  kode_mk?: string | null;
  nama_mk?: string | null;
  sks_mk?: Angka;
  jenis: 'setara' | 'gabung' | 'pecah' | 'dihapus';
  catatan?: string | null;
}
export interface Peninjauan {
  id: number;
  jenis: string;
  judul: string;
  tanggal?: string | null;
  pelaksana?: string | null;
  ringkasan?: string | null;
  status?: 'rencana' | 'berjalan' | 'selesai';
}

// ================================================================ Label & warna
export const STATUS_KURIKULUM: Record<StatusKurikulum, { label: string; variant: BadgeVariant }> = {
  draf: { label: 'Draf', variant: 'neutral' },
  diajukan: { label: 'Diajukan', variant: 'warning' },
  disahkan: { label: 'Disahkan', variant: 'info' },
  berlaku: { label: 'Berlaku', variant: 'success' },
  arsip: { label: 'Arsip', variant: 'outline' },
};
export const RANAH_CPL: Record<RanahCpl, string> = { sikap: 'Sikap', pengetahuan: 'Pengetahuan', keterampilan_umum: 'Keterampilan umum', keterampilan_khusus: 'Keterampilan khusus' };
export const JENIS_MK: Record<string, string> = { A: 'Wajib', B: 'Pilihan', C: 'Wajib peminatan', D: 'Pilihan peminatan', S: 'Tugas akhir', W: 'Wajib nasional' };
const JENIS_EVALUASI: Record<number, string> = { 1: 'Aktivitas partisipatif', 2: 'Hasil proyek', 3: 'Kognitif: tugas', 4: 'Kognitif: ujian' };
const AKSI_STATUS: Record<StatusKurikulum, string> = { draf: 'Kembalikan ke draf', diajukan: 'Ajukan', disahkan: 'Sahkan', berlaku: 'Berlakukan', arsip: 'Arsipkan' };
/** Batas SKS per semester (Pasal 17–18): 20 untuk semester 1–2, 24 sesudahnya. */
export const maksSksSemester = (s: number) => (s <= 2 ? 20 : 24);

export function StatusKurikulumBadge({ status }: { status: StatusKurikulum | string }) {
  const s = STATUS_KURIKULUM[status as StatusKurikulum] ?? { label: status, variant: 'neutral' as const };
  return (
    <Badge variant={s.variant} dot>
      {s.label}
    </Badge>
  );
}

function Galat({ q }: { q: QueryState<unknown> }) {
  return (
    <div className="u-widget-error" role="alert">
      <span>{pesanGalat(q.error)}</span>
      <Button size="sm" variant="ghost" onClick={q.refetch}>
        <RefreshCw /> Muat ulang
      </Button>
    </div>
  );
}
const muatDari = (q: QueryState<unknown>) => q.loading && !q.data;

// ================================================================ Hook data
const P = '/v1/kurikulum-obe';
const opt = { staleTime: 60_000 };
export function useDaftarKurikulum(q: { prodi?: string; status?: StatusKurikulum; q?: string } = {}) {
  return useSiakadQuery<Kurikulum[]>(['kur-daftar', q], (s, signal) => s.kurikulumObe.getKurikulum({ ...q, per_page: 100 } as never, { signal }) as never, opt);
}
export function useKurikulum(id: number | string | undefined) {
  return useSiakadQuery<Kurikulum>(['kur', String(id)], (s, signal) => s.kurikulumObe.getKurikulumById(id!, {}, { signal }) as never, { ...opt, enabled: id != null });
}
export function useMkKurikulum(id: number | string | undefined, q: { semester?: string; jenis?: string } = {}) {
  return useSiakadQuery<MkKurikulum[]>(['kur', String(id), 'mk', q], (s, signal) => s.kurikulumObe.getKurikulumByIdMk(id!, q, { signal }) as never, { ...opt, enabled: id != null });
}
export function useCplKurikulum(id: number | string | undefined) {
  return useSiakadQuery<Cpl[]>(['kur', String(id), 'cpl'], (s, signal) => s.kurikulumObe.getKurikulumByIdCpl(id!, {}, { signal }) as never, { ...opt, enabled: id != null });
}
export function useProfilLulusan(id: number | string | undefined) {
  return useSiakadQuery<ProfilLulusan[]>(['kur', String(id), 'profil'], (s, signal) => s.kurikulumObe.getKurikulumByIdProfilLulusan(id!, {}, { signal }) as never, { ...opt, enabled: id != null });
}
export function useBahanKajian(id: number | string | undefined) {
  return useSiakadQuery<BahanKajian[]>(['kur', String(id), 'bk'], (s, signal) => s.kurikulumObe.getKurikulumByIdBahanKajian(id!, {}, { signal }) as never, { ...opt, enabled: id != null });
}
export function useMatriksKurikulum(id: number | string | undefined) {
  return useSiakadQuery<MatriksKurikulumData>(['kur', String(id), 'matriks'], (s, signal) => s.kurikulumObe.getKurikulumByIdMatriks(id!, {}, { signal }) as never, { ...opt, enabled: id != null });
}
export function useValidasiKurikulum(id: number | string | undefined) {
  return useSiakadQuery<ValidasiKurikulumData>(['kur', String(id), 'validasi'], (s, signal) => s.kurikulumObe.getKurikulumByIdValidasi(id!, {}, { signal }) as never, { ...opt, enabled: id != null });
}
export function useCapaianCpl(id: number | string | undefined, q: { angkatan?: number; sampai?: string } = {}) {
  return useSiakadQuery<CapaianCplData>(['kur', String(id), 'capaian', q], (s, signal) => s.kurikulumObe.getKurikulumByIdCapaian(id!, q, { signal }) as never, {
    staleTime: 300_000,
    enabled: id != null,
  });
}
export function useCapaianCplMahasiswa(nim: string | undefined, kurikulumId?: number) {
  return useSiakadQuery<CapaianMahasiswaData>(['kur-capaian-mhs', nim, kurikulumId], (s, signal) => s.kurikulumObe.getCapaianMahasiswaByNim(nim!, { kurikulum_id: kurikulumId }, { signal }) as never, {
    staleTime: 300_000,
    enabled: !!nim,
  });
}
export function useMataKuliahObe(mkId: number | string | undefined) {
  return useSiakadQuery<MkKurikulum>(['kur-mk', String(mkId)], (s, signal) => s.kurikulumObe.getMkByMk(mkId!, {}, { signal }) as never, { ...opt, enabled: mkId != null });
}
export function useRps(rpsId: number | string | undefined) {
  return useSiakadQuery<Rps>(['kur-rps', String(rpsId)], (s, signal) => s.kurikulumObe.getRpsByRps(rpsId!, {}, { signal }) as never, { ...opt, enabled: rpsId != null });
}
export function useStatusMigrasiKurikulum() {
  return useSiakadQuery<StatusMigrasiProdi[]>(['kur-migrasi-status'], (s, signal) => s.kurikulumObe.getMigrasiStatus({}, { signal }) as never, opt);
}
export function useEkuivalensi(id: number | string | undefined) {
  return useSiakadQuery<Ekuivalensi[]>(['kur', String(id), 'ekuivalensi'], (s, signal) => s.kurikulumObe.getKurikulumByIdEkuivalensi(id!, {}, { signal }) as never, { ...opt, enabled: id != null });
}
export function usePeninjauan(id: number | string | undefined) {
  return useSiakadQuery<Peninjauan[]>(['kur', String(id), 'peninjauan'], (s, signal) => s.kurikulumObe.getKurikulumByIdPeninjauan(id!, {}, { signal }) as never, { ...opt, enabled: id != null });
}

// ================================================================ Daftar kurikulum
/** Kartu satu kurikulum: kode, nama, prodi, status, versi, MK, SKS, CPL. */
export function KartuKurikulum({ data, href, onClick, className }: { data: Kurikulum; href?: string; onClick?: () => void; className?: string }) {
  const Tag = href ? 'a' : onClick ? 'button' : 'div';
  return (
    <Tag className={cn('u-kur-card', className)} {...(href ? { href } : onClick ? { type: 'button' as const, onClick } : {})}>
      <div className="u-kur-card-top">
        <span className="u-kur-code">{data.kode}</span>
        <StatusKurikulumBadge status={data.status} />
      </div>
      <p className="u-kur-card-title">{data.nama}</p>
      <p className="u-kur-card-sub">
        {[data.nama_prodi ?? data.kode_prodi, data.tahun_berlaku ? `berlaku ${data.tahun_berlaku}` : null, data.versi && data.versi > 1 ? `versi ${data.versi}` : null].filter(Boolean).join(' · ')}
      </p>
      <dl className="u-kur-card-stats">
        <div>
          <dt>MK</dt>
          <dd>{formatNumber(n(data.jumlah_mk))}</dd>
        </div>
        <div>
          <dt>SKS</dt>
          <dd>
            {formatNumber(n(data.total_sks_mk))}
            {data.sks_lulus ? <small>/{formatNumber(n(data.sks_lulus))}</small> : null}
          </dd>
        </div>
        <div>
          <dt>CPL</dt>
          <dd>{formatNumber(n(data.jumlah_cpl))}</dd>
        </div>
      </dl>
    </Tag>
  );
}

/** Daftar kurikulum OBE per prodi (kartu). */
export function DaftarKurikulum({
  prodi,
  status,
  href,
  onPilih,
  className,
}: {
  prodi?: string;
  status?: StatusKurikulum;
  /** Tautan per kurikulum. */ href?: (k: Kurikulum) => string;
  onPilih?: (k: Kurikulum) => void;
  className?: string;
}) {
  const q = useDaftarKurikulum({ prodi, status });
  if (q.error) return <Galat q={q} />;
  if (muatDari(q))
    return (
      <div className={cn('u-kur-grid', className)}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} style={{ height: 156 }} />
        ))}
      </div>
    );
  if (!q.data?.length) return <Empty icon={<BookOpen />} title="Belum ada kurikulum OBE" description="Buat kurikulum baru atau impor dari kurikulum lama lewat menu migrasi." bordered />;
  return (
    <div className={cn('u-kur-grid', className)}>
      {q.data.map((k) => (
        <KartuKurikulum key={k.id} data={k} href={href?.(k)} onClick={onPilih ? () => onPilih(k) : undefined} />
      ))}
    </div>
  );
}

// ================================================================ Ringkasan & alur status
/** Kepala kurikulum: identitas, status, SKS terhadap syarat lulus, kelengkapan OBE, dan tombol alur status. */
export function RingkasanKurikulum({
  kurikulumId,
  bolehUbahStatus,
  onStatusBerubah,
  className,
}: {
  kurikulumId: number | string;
  /** Tampilkan tombol transisi status (butuh scope kurikulum:write). */ bolehUbahStatus?: boolean;
  onStatusBerubah?: (k: Kurikulum) => void;
  className?: string;
}) {
  const q = useKurikulum(kurikulumId);
  const siakad = useOptionalSiakad();
  const [sibuk, setSibuk] = React.useState<string | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  if (q.error) return <Galat q={q} />;
  const k = q.data;
  const r = k?.ringkasan ?? {};
  const muat = muatDari(q);
  const sksMk = n(r.sks_wajib_mk) + n(r.sks_pilihan_mk);
  const syarat = n(k?.sks_lulus) || n(k?.jenjang?.sks_min);
  const rpsPersen = n(r.mata_kuliah) ? (n(r.mk_dengan_rps_disahkan) / n(r.mata_kuliah)) * 100 : 0;
  const ubah = async (status: StatusKurikulum) => {
    if (!siakad || !k) return;
    setSibuk(status);
    setGalat(null);
    try {
      const res = await siakad.kurikulumObe.postKurikulumByIdStatus(k.id, { status } as never);
      invalidateSiakad('kur');
      onStatusBerubah?.(res.data as unknown as Kurikulum);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSibuk(null);
    }
  };
  return (
    <section className={cn('u-kur-head', className)}>
      <div className="u-kur-head-main">
        {muat ? (
          <Skeleton style={{ height: 64, width: '60%' }} />
        ) : (
          <>
            <div className="u-kur-head-meta">
              <span className="u-kur-code">{k?.kode}</span>
              <StatusKurikulumBadge status={k!.status} />
              {k?.sumber === 'migrasi' && <Badge variant="outline">Dari kurikulum lama</Badge>}
            </div>
            <h2 className="u-kur-head-title">{k?.nama}</h2>
            <p className="u-kur-head-sub">{[k?.nama_prodi, k?.jenjang?.nama, k?.tahun_berlaku ? `Berlaku ${k.tahun_berlaku}` : null, k?.no_sk ? `SK ${k.no_sk}` : null].filter(Boolean).join(' · ')}</p>
            {!!k?.angkatan?.length && <p className="u-kur-head-sub">Dipakai angkatan {k.angkatan.join(', ')}</p>}
          </>
        )}
        {bolehUbahStatus && !!k?.transisi_status?.length && (
          <div className="u-kur-head-actions">
            {k.transisi_status.map((t) => (
              <Button key={t} size="sm" variant={t === 'draf' || t === 'arsip' ? 'outline' : 'primary'} loading={sibuk === t} disabled={!!sibuk} onClick={() => void ubah(t)}>
                {AKSI_STATUS[t] ?? t}
              </Button>
            ))}
          </div>
        )}
        {galat && (
          <p className="u-kur-error" role="alert">
            <CircleAlert aria-hidden /> {galat}
          </p>
        )}
      </div>
      <StatGrid min={150}>
        <StatCard
          label="SKS mata kuliah"
          icon={<Layers />}
          loading={muat}
          value={formatNumber(sksMk)}
          hint={syarat ? `syarat lulus ${formatNumber(syarat)} SKS` : `${formatNumber(n(r.sks_wajib_mk))} wajib · ${formatNumber(n(r.sks_pilihan_mk))} pilihan`}
          tone={syarat && sksMk < syarat ? 'warning' : 'primary'}
          footer={!muat && syarat ? <Progress value={Math.min(100, (sksMk / syarat) * 100)} size="sm" tone={sksMk < syarat ? 'warning' : 'success'} /> : undefined}
        />
        <StatCard label="Mata kuliah" icon={<BookOpen />} loading={muat} value={formatNumber(n(r.mata_kuliah))} hint={`${formatNumber(n(r.cpmk))} CPMK`} tone="neutral" />
        <StatCard
          label="CPL"
          icon={<Target />}
          loading={muat}
          value={formatNumber(n(r.cpl))}
          hint={`${formatNumber(n(r.profil_lulusan))} profil lulusan · ${formatNumber(n(r.bahan_kajian))} bahan kajian`}
          tone="info"
        />
        <StatCard
          label="RPS disahkan"
          icon={<FileText />}
          loading={muat}
          value={formatPersen(rpsPersen, 0)}
          hint={`${formatNumber(n(r.mk_dengan_rps_disahkan))} dari ${formatNumber(n(r.mata_kuliah))} MK`}
          tone={rpsPersen >= 100 ? 'success' : 'warning'}
          footer={!muat ? <Progress value={rpsPersen} size="sm" /> : undefined}
        />
      </StatGrid>
    </section>
  );
}

// ================================================================ Validasi
const IKON_TINGKAT = { galat: <CircleAlert />, peringatan: <TriangleAlert />, info: <Info /> };
/** Validasi kurikulum terhadap SN Dikti dan kelengkapan OBE: persen kelengkapan, galat, peringatan, info beserta pasal. */
export function ValidasiKurikulum({ kurikulumId, className }: { kurikulumId: number | string; className?: string }) {
  const q = useValidasiKurikulum(kurikulumId);
  const [tingkat, setTingkat] = React.useState<'semua' | 'galat' | 'peringatan' | 'info'>('semua');
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 220 }} />;
  const d = q.data!;
  const r = d.ringkasan;
  const persen = n(r.kelengkapan_persen);
  const temuan = d.temuan.filter((t) => tingkat === 'semua' || t.tingkat === tingkat);
  return (
    <section className={cn('u-kur-validasi', className)}>
      <div className="u-kur-validasi-top">
        <ProgressRing value={persen} size={84} thickness={8} tone={r.galat > 0 ? 'danger' : persen >= 100 ? 'success' : 'warning'} label={<b>{formatPersen(persen, 0)}</b>} />
        <div>
          <p className="u-kur-validasi-title">{r.siap_disahkan ? 'Siap disahkan' : r.galat > 0 ? `${r.galat} galat perlu diperbaiki` : 'Belum lengkap'}</p>
          <p className="u-kur-validasi-sub">{r.regulasi ?? 'Permendiktisaintek 39/2025'}</p>
          <div className="u-kur-filter" role="group" aria-label="Saring temuan">
            {(['semua', 'galat', 'peringatan', 'info'] as const).map((t) => (
              <button key={t} type="button" data-active={dataFlag(tingkat === t)} data-tingkat={t} onClick={() => setTingkat(t)}>
                {t === 'semua' ? 'Semua' : t.charAt(0).toUpperCase() + t.slice(1)}
                <span>{t === 'semua' ? d.temuan.length : n(r[t])}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {temuan.length ? (
        <ul className="u-kur-temuan">
          {temuan.map((t, i) => (
            <li key={i} data-tingkat={t.tingkat}>
              <span className="u-kur-temuan-icon" aria-hidden>
                {IKON_TINGKAT[t.tingkat]}
              </span>
              <span className="u-kur-temuan-text">
                {t.pesan}
                {t.pasal && <small>{t.pasal}</small>}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="u-chart-empty">
          <Check aria-hidden /> Tidak ada temuan.
        </p>
      )}
    </section>
  );
}

// ================================================================ Profil lulusan & CPL
/** Profil lulusan sebagai kartu bernomor. */
export function DaftarProfilLulusan({ kurikulumId, className }: { kurikulumId: number | string; className?: string }) {
  const q = useProfilLulusan(kurikulumId);
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 120 }} />;
  if (!q.data?.length) return <Empty icon={<GraduationCap />} title="Profil lulusan belum diisi" bordered />;
  return (
    <ul className={cn('u-kur-profil', className)}>
      {q.data.map((p) => (
        <li key={p.id}>
          <span className="u-kur-code">{p.kode}</span>
          <b>{p.nama}</b>
          {p.deskripsi && <p>{p.deskripsi}</p>}
        </li>
      ))}
    </ul>
  );
}

/** CPL dikelompokkan per ranah (sikap, pengetahuan, keterampilan umum, keterampilan khusus) dengan jumlah MK pendukung. */
export function DaftarCpl({ kurikulumId, onPilih, className }: { kurikulumId: number | string; onPilih?: (c: Cpl) => void; className?: string }) {
  const q = useCplKurikulum(kurikulumId);
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 240 }} />;
  if (!q.data?.length) return <Empty icon={<Target />} title="CPL belum diisi" bordered />;
  return (
    <div className={cn('u-kur-cpl', className)}>
      {(Object.keys(RANAH_CPL) as RanahCpl[]).map((ranah) => {
        const isi = q.data!.filter((c) => c.ranah === ranah);
        if (!isi.length) return null;
        return (
          <section key={ranah} data-ranah={ranah}>
            <h4>
              {RANAH_CPL[ranah]} <span>{isi.length}</span>
            </h4>
            <ul>
              {isi.map((c) => {
                const mk = c.mata_kuliah?.length ?? 0;
                const Tag = onPilih ? 'button' : 'div';
                return (
                  <li key={c.id}>
                    <Tag className="u-kur-cpl-row" {...(onPilih ? { type: 'button' as const, onClick: () => onPilih(c) } : {})}>
                      <span className="u-kur-code">{c.kode}</span>
                      <span className="u-kur-cpl-desc">{c.deskripsi}</span>
                      <span className="u-kur-cpl-meta" data-kosong={dataFlag(mk === 0)}>
                        {mk === 0 ? 'Belum ada MK' : `${mk} MK`}
                      </span>
                    </Tag>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// ================================================================ Matriks pemetaan
const MATRIKS: Record<NamaMatriks, { baris: 'profil' | 'cpl' | 'bk' | 'mk'; kolom: 'profil' | 'cpl' | 'bk' | 'mk'; kunciBaris: string; kunciKolom: string; judul: string }> = {
  'profil-cpl': { baris: 'cpl', kolom: 'profil', kunciBaris: 'cpl_id', kunciKolom: 'profil_id', judul: 'CPL × profil lulusan' },
  'cpl-bk': { baris: 'cpl', kolom: 'bk', kunciBaris: 'cpl_id', kunciKolom: 'bk_id', judul: 'CPL × bahan kajian' },
  'cpl-mk': { baris: 'mk', kolom: 'cpl', kunciBaris: 'mk_id', kunciKolom: 'cpl_id', judul: 'Mata kuliah × CPL' },
  'bk-mk': { baris: 'mk', kolom: 'bk', kunciBaris: 'mk_id', kunciKolom: 'bk_id', judul: 'Mata kuliah × bahan kajian' },
};

/**
 * Matriks pemetaan OBE sebagai tabel centang. Baris/kolom tanpa pasangan ditandai (mis. CPL yang belum didukung MK).
 * Dengan `editable`, klik sel menyimpan langsung lewat PUT /matriks/{nama} (tambah/hapus satu pasangan).
 */
export function MatriksKurikulum({ kurikulumId, jenis = 'cpl-mk', editable, className }: { kurikulumId: number | string; jenis?: NamaMatriks; editable?: boolean; className?: string }) {
  const m = useMatriksKurikulum(kurikulumId);
  const cpl = useCplKurikulum(kurikulumId);
  const profil = useProfilLulusan(kurikulumId);
  const bk = useBahanKajian(kurikulumId);
  const mk = useMkKurikulum(kurikulumId);
  const siakad = useOptionalSiakad();
  const [lokal, setLokal] = React.useState<Record<string, boolean>>({});
  const [galat, setGalat] = React.useState<string | null>(null);
  const def = MATRIKS[jenis];
  const sumber = { cpl, profil, bk, mk } as const;
  const semua = [m, sumber[def.baris], sumber[def.kolom]] as Array<QueryState<unknown>>;
  const err = semua.find((x) => x.error);
  React.useEffect(() => setLokal({}), [m.data]);
  if (err) return <Galat q={err} />;
  if (semua.some(muatDari)) return <Skeleton className={className} style={{ height: 260 }} />;
  const label = (x: { kode?: string; kode_mk?: string; nama?: string; deskripsi?: string }) => ({ kode: x.kode_mk ?? x.kode ?? '', nama: x.nama ?? x.deskripsi ?? '' });
  const baris = ((sumber[def.baris].data as Array<{ id: number }>) ?? []).map((x) => ({ id: x.id, ...label(x as never) }));
  const kolom = ((sumber[def.kolom].data as Array<{ id: number }>) ?? []).map((x) => ({ id: x.id, ...label(x as never) }));
  const ada = new Set((m.data?.[jenis] ?? []).map((p) => `${p[def.kunciBaris]}:${p[def.kunciKolom]}`));
  const cek = (b: number, k: number) => lokal[`${b}:${k}`] ?? ada.has(`${b}:${k}`);
  const jumlahBaris = (b: number) => kolom.filter((k) => cek(b, k.id)).length;
  const jumlahKolom = (k: number) => baris.filter((b) => cek(b.id, k)).length;
  const ganti = async (b: number, k: number) => {
    if (!siakad || !editable) return;
    const kunci = `${b}:${k}`;
    const baru = !cek(b, k);
    setLokal((l) => ({ ...l, [kunci]: baru }));
    setGalat(null);
    // Pasangan selalu ditulis dengan nama kolom API (kiri = kunci pertama nama matriks).
    const pasangan = { [def.kunciBaris]: b, [def.kunciKolom]: k };
    try {
      await siakad.request({ method: 'PUT', path: `${P}/kurikulum/${kurikulumId}/matriks/${jenis}`, body: baru ? { tambah: [pasangan] } : { hapus: [pasangan] } });
      invalidateSiakad('kur');
    } catch (e) {
      setLokal((l) => ({ ...l, [kunci]: !baru }));
      setGalat(pesanGalat(e));
    }
  };
  if (!baris.length || !kolom.length) return <Empty icon={<Network />} title="Matriks belum bisa diisi" description="Isi dulu kedua sisi matriks (mis. CPL dan mata kuliah)." bordered />;
  return (
    <div className={cn('u-matriks', className)}>
      {galat && (
        <Alert variant="danger" title="Pemetaan gagal disimpan">
          {galat}
        </Alert>
      )}
      <div className="u-matriks-scroll" tabIndex={0} role="region" aria-label={def.judul}>
        <table>
          <thead>
            <tr>
              <th scope="col" className="u-matriks-corner">
                {def.judul}
              </th>
              {kolom.map((k) => (
                <th key={k.id} scope="col" title={k.nama} data-kosong={dataFlag(jumlahKolom(k.id) === 0)}>
                  <span>{k.kode}</span>
                </th>
              ))}
              <th scope="col" className="u-matriks-sum">
                Σ
              </th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b) => (
              <tr key={b.id} data-kosong={dataFlag(jumlahBaris(b.id) === 0)}>
                <th scope="row" title={b.nama}>
                  <span className="u-kur-code">{b.kode}</span>
                  <span className="u-matriks-nama">{b.nama}</span>
                </th>
                {kolom.map((k) => {
                  const on = cek(b.id, k.id);
                  return (
                    <td key={k.id}>
                      {editable ? (
                        <button type="button" className="u-matriks-cell" aria-pressed={on} aria-label={`${b.kode} – ${k.kode}`} onClick={() => void ganti(b.id, k.id)}>
                          {on && <Check aria-hidden />}
                        </button>
                      ) : (
                        <span className="u-matriks-cell" data-on={dataFlag(on)} aria-label={on ? `${b.kode} – ${k.kode}` : undefined}>
                          {on && <Check aria-hidden />}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="u-matriks-sum">{jumlahBaris(b.id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="u-dasbor-note">Baris dan kolom bergaris kuning belum punya pasangan. {editable ? 'Klik sel untuk memetakan atau melepas.' : ''}</p>
    </div>
  );
}

// ================================================================ Struktur MK per semester
/** Sebaran mata kuliah per semester dengan total SKS terhadap batas per semester, jenis MK, CPL, dan status RPS. */
export function StrukturKurikulum({ kurikulumId, onPilihMk, className }: { kurikulumId: number | string; onPilihMk?: (mk: MkKurikulum) => void; className?: string }) {
  const q = useMkKurikulum(kurikulumId);
  if (q.error) return <Galat q={q} />;
  if (muatDari(q))
    return (
      <div className={cn('u-struktur', className)}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} style={{ height: 280 }} />
        ))}
      </div>
    );
  const mk = q.data ?? [];
  if (!mk.length) return <Empty icon={<BookOpen />} title="Belum ada mata kuliah" bordered />;
  const semester = [...new Set(mk.map((m) => m.semester ?? 0))].sort((a, b) => (a || 99) - (b || 99));
  return (
    <div className={cn('u-struktur-wrap', className)}>
      <div className="u-struktur">
        {semester.map((s) => {
          const isi = mk.filter((m) => (m.semester ?? 0) === s);
          const sks = isi.reduce((a, m) => a + (m.jenis === 'B' || m.jenis === 'D' ? 0 : n(m.sks)), 0);
          const pilihan = isi.reduce((a, m) => a + (m.jenis === 'B' || m.jenis === 'D' ? n(m.sks) : 0), 0);
          const maks = s ? maksSksSemester(s) : 0;
          return (
            <section key={s} className="u-struktur-col" data-lebih={dataFlag(!!maks && sks > maks)}>
              <header>
                <b>{s ? `Semester ${s}` : 'Pilihan bebas'}</b>
                <span>
                  {formatNumber(sks)}
                  {maks ? `/${maks}` : ''} SKS{pilihan ? ` + ${formatNumber(pilihan)} pilihan` : ''}
                </span>
                {!!maks && <Progress value={Math.min(100, (sks / maks) * 100)} size="sm" tone={sks > maks ? 'danger' : 'primary'} />}
              </header>
              <ul>
                {isi.map((m) => {
                  const cpl = daftar(m.cpl);
                  const Tag = onPilihMk ? 'button' : 'div';
                  return (
                    <li key={m.id}>
                      <Tag className="u-mk-card" data-jenis={m.jenis} {...(onPilihMk ? { type: 'button' as const, onClick: () => onPilihMk(m) } : {})}>
                        <span className="u-mk-card-top">
                          <span className="u-kur-code">{m.kode_mk}</span>
                          <span className="u-mk-sks">{formatNumber(n(m.sks))} SKS</span>
                        </span>
                        <span className="u-mk-card-title">{m.nama}</span>
                        <span className="u-mk-card-foot">
                          <span className="u-mk-jenis">{JENIS_MK[m.jenis] ?? m.jenis}</span>
                          {cpl.length > 0 ? <span title={cpl.join(', ')}>{cpl.length} CPL</span> : <span data-warn="">tanpa CPL</span>}
                          {m.status_rps === 'disahkan' ? (
                            <span data-ok="">RPS</span>
                          ) : (
                            <span data-warn="" title={m.status_rps ? `RPS ${m.status_rps}` : 'RPS belum dibuat'}>
                              RPS {m.status_rps ?? 'belum'}
                            </span>
                          )}
                        </span>
                      </Tag>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

// ================================================================ CPMK
/** Satu mata kuliah: CPMK, sub-CPMK, dan CPL yang didukung beserta bobot. */
export function CpmkMataKuliah({ mkId, className }: { mkId: number | string; className?: string }) {
  const q = useMataKuliahObe(mkId);
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 220 }} />;
  const m = q.data!;
  return (
    <section className={cn('u-cpmk', className)}>
      <header className="u-cpmk-head">
        <span className="u-kur-code">{m.kode_mk}</span>
        <h3>{m.nama}</h3>
        <p>{[`${formatNumber(n(m.sks))} SKS`, m.semester ? `Semester ${m.semester}` : 'Pilihan bebas', JENIS_MK[m.jenis] ?? m.jenis, m.modalitas].filter(Boolean).join(' · ')}</p>
        {m.deskripsi && <p className="u-cpmk-desc">{m.deskripsi}</p>}
      </header>
      {!m.cpmk?.length ? (
        <Empty icon={<ListChecks />} title="CPMK belum diisi" />
      ) : (
        <ol className="u-cpmk-list">
          {m.cpmk.map((c) => (
            <li key={c.id}>
              <div className="u-cpmk-row">
                <span className="u-kur-code">{c.kode}</span>
                <p>{c.deskripsi}</p>
                <span className="u-cpmk-cpl">
                  {(c.cpl ?? []).map((x) => (
                    <Badge key={x.cpl_id} variant="secondary" title={x.bobot != null ? `bobot ${x.bobot}` : undefined}>
                      {x.kode}
                    </Badge>
                  ))}
                </span>
              </div>
              {!!c.sub_cpmk?.length && (
                <ul className="u-cpmk-sub">
                  {c.sub_cpmk.map((s) => (
                    <li key={s.id}>
                      <span className="u-kur-code">{s.kode}</span>
                      <span>
                        {s.deskripsi}
                        {s.indikator && <small>Indikator: {s.indikator}</small>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ================================================================ RPS
/** RPS lengkap: identitas, CPL & CPMK, rencana pertemuan per minggu, dan bobot evaluasi. */
export function RpsMataKuliah({ rpsId, className }: { rpsId: number | string; className?: string }) {
  const q = useRps(rpsId);
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 360 }} />;
  const r = q.data!;
  const mk = r.mata_kuliah ?? {};
  const subKode = new Map((r.cpmk ?? []).flatMap((c) => (c.sub_cpmk ?? []).map((s) => [s.id, s.kode] as const)));
  const totalEval = r.evaluasi.reduce((a, e) => a + n(e.bobot), 0);
  return (
    <article className={cn('u-rps', className)}>
      <header className="u-rps-head">
        <div>
          <span className="u-kur-code">{mk.kode_mk}</span>
          <h3>{mk.nama}</h3>
          <p>
            {[
              mk.sks != null ? `${formatNumber(n(mk.sks))} SKS` : null,
              mk.semester ? `Semester ${mk.semester}` : null,
              `Versi ${r.versi}`,
              r.dosen_pengampu?.length ? `Pengampu: ${r.dosen_pengampu.join(', ')}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <Badge variant={r.status === 'disahkan' ? 'success' : r.status === 'draf' ? 'warning' : 'outline'} dot>
          {r.status === 'disahkan' ? `Disahkan${r.disahkan_at ? ' ' + formatDate(r.disahkan_at) : ''}` : r.status === 'draf' ? 'Draf' : 'Arsip'}
        </Badge>
      </header>
      {r.deskripsi && <p className="u-rps-desc">{r.deskripsi}</p>}
      <div className="u-rps-grid">
        <Panel title="CPMK">
          <ol className="u-rps-cpmk">
            {(r.cpmk ?? []).map((c) => (
              <li key={c.id}>
                <span className="u-kur-code">{c.kode}</span>
                <span>{c.deskripsi}</span>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="Bobot evaluasi" description={totalEval !== 100 ? `Total ${formatNumber(totalEval)}%, seharusnya 100%` : 'Total 100%'}>
          <SegmentBar format={(v) => `${formatNumber(v)}%`} data={r.evaluasi.map((e) => ({ label: e.nama || JENIS_EVALUASI[e.jenis_evaluasi] || '-', value: n(e.bobot) }))} />
        </Panel>
      </div>
      <TableContainer>
        <Table density="compact">
          <thead>
            <tr>
              <th style={{ width: 64 }}>Minggu</th>
              <th style={{ width: 96 }}>Sub-CPMK</th>
              <th>Materi & indikator</th>
              <th>Metode</th>
              <th style={{ width: 72, textAlign: 'right' }}>Bobot</th>
            </tr>
          </thead>
          <tbody>
            {r.pertemuan.map((p) => (
              <tr key={p.pertemuan_ke} data-ujian={dataFlag(p.ujian)}>
                <td>{p.sampai_ke && p.sampai_ke !== p.pertemuan_ke ? `${p.pertemuan_ke}–${p.sampai_ke}` : p.pertemuan_ke}</td>
                <td>{p.sub_cpmk_id ? <span className="u-kur-code">{subKode.get(p.sub_cpmk_id) ?? p.sub_cpmk_id}</span> : '–'}</td>
                <td>
                  {p.ujian ? <b>{p.materi ?? 'Ujian'}</b> : p.materi}
                  {p.indikator && <small className="u-rps-ind">{p.indikator}</small>}
                </td>
                <td>
                  {p.metode}
                  {p.modalitas && <small className="u-rps-ind">{p.modalitas}</small>}
                </td>
                <td style={{ textAlign: 'right' }}>{p.bobot != null && n(p.bobot) > 0 ? `${formatNumber(n(p.bobot))}%` : ''}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableContainer>
      {!!r.pustaka_utama?.length && (
        <div className="u-rps-pustaka">
          <h4>Pustaka utama</h4>
          <ol>
            {r.pustaka_utama.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}

// ================================================================ Capaian CPL
function BarisCpl({
  kode,
  deskripsi,
  nilai,
  target,
  kanan,
  status,
}: {
  kode: string;
  deskripsi: string;
  nilai: number | null;
  target: number;
  kanan: React.ReactNode;
  status: 'tercapai' | 'belum' | 'kosong';
}) {
  return (
    <li className="u-cpl-bar" data-status={status}>
      <span className="u-kur-code">{kode}</span>
      <span className="u-cpl-bar-main">
        <span className="u-cpl-bar-desc" title={deskripsi}>
          {deskripsi}
        </span>
        <span className="u-cpl-bar-track" role="img" aria-label={`${kode}: ${nilai == null ? 'belum ada nilai' : formatNumber(nilai, { maximumFractionDigits: 1 })} dari target ${target}`}>
          <span className="u-cpl-bar-fill" style={{ width: `${Math.min(100, nilai ?? 0)}%` }} />
          <span className="u-cpl-bar-target" style={{ left: `${Math.min(100, target)}%` }} />
        </span>
      </span>
      <span className="u-cpl-bar-val">{kanan}</span>
    </li>
  );
}

/** Capaian CPL prodi per angkatan: rata-rata skor tiap CPL terhadap target dan persen mahasiswa yang mencapainya. */
export function CapaianCplKurikulum({ kurikulumId, angkatan, sampai, className }: { kurikulumId: number | string; angkatan?: number; sampai?: string; className?: string }) {
  const q = useCapaianCpl(kurikulumId, { angkatan, sampai });
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 260 }} />;
  const d = q.data!;
  if (!d.cpl.length) return <Empty icon={<Target />} title="Belum ada capaian CPL" description="Capaian muncul setelah nilai MK yang dipetakan ke CPL masuk." />;
  const tercapai = d.cpl.filter((c) => n(c.rata_rata) >= n(c.target)).length;
  return (
    <div className={cn('u-cpl-capaian', className)}>
      <p className="u-cpl-capaian-sum">
        <b>{tercapai}</b> dari {d.cpl.length} CPL rata-ratanya mencapai target
        {d.angkatan ? ` · angkatan ${d.angkatan}` : ''}
        {d.cpl[0] ? ` · ${formatNumber(n(d.cpl[0].jumlah_mahasiswa))} mahasiswa` : ''}
      </p>
      <ul className="u-cpl-bars">
        {d.cpl.map((c) => (
          <BarisCpl
            key={c.cpl_id}
            kode={c.kode}
            deskripsi={c.deskripsi}
            nilai={c.rata_rata == null ? null : n(c.rata_rata)}
            target={n(c.target)}
            status={c.rata_rata == null ? 'kosong' : n(c.rata_rata) >= n(c.target) ? 'tercapai' : 'belum'}
            kanan={
              <>
                <b>{c.rata_rata == null ? '–' : formatNumber(n(c.rata_rata), { maximumFractionDigits: 1 })}</b>
                <small>{formatPersen(n(c.persen_tercapai), 0)} mhs tercapai</small>
              </>
            }
          />
        ))}
      </ul>
      <p className="u-dasbor-note">Garis tegak = target CPL. Skor 0–100 dihitung dari nilai MK yang dipetakan ke CPL, sesuai bobot pemetaan.</p>
    </div>
  );
}

/** Capaian CPL satu mahasiswa (untuk profil mahasiswa, dosen PA, atau SKPI). */
export function CapaianCplMahasiswa({ nim, kurikulumId, className }: { nim: string; kurikulumId?: number; className?: string }) {
  const q = useCapaianCplMahasiswa(nim, kurikulumId);
  const [buka, setBuka] = React.useState<number | null>(null);
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 260 }} />;
  const d = q.data!;
  const dinilai = d.cpl.filter((c) => c.tercapai != null);
  const ok = d.cpl.filter((c) => c.tercapai).length;
  return (
    <div className={cn('u-cpl-capaian', className)}>
      <div className="u-cpl-mhs-head">
        <ProgressRing value={d.cpl.length ? (ok / d.cpl.length) * 100 : 0} size={72} thickness={7} tone="success" label={<b>{`${ok}/${d.cpl.length}`}</b>} />
        <div>
          <p className="u-kur-validasi-title">{d.mahasiswa.nama}</p>
          <p className="u-kur-validasi-sub">
            {d.mahasiswa.nim} · angkatan {d.mahasiswa.angkatan} · {d.kurikulum.nama}
          </p>
          <p className="u-kur-validasi-sub">
            {ok} CPL tercapai, {dinilai.length - ok} belum, {d.cpl.length - dinilai.length} belum ada nilai
          </p>
        </div>
      </div>
      <ul className="u-cpl-bars">
        {d.cpl.map((c) => (
          <React.Fragment key={c.cpl_id}>
            <BarisCpl
              kode={c.kode}
              deskripsi={c.deskripsi}
              nilai={c.nilai == null ? null : n(c.nilai)}
              target={n(c.target)}
              status={c.tercapai == null ? 'kosong' : c.tercapai ? 'tercapai' : 'belum'}
              kanan={
                <button type="button" className="u-cpl-bar-more" aria-expanded={buka === c.cpl_id} onClick={() => setBuka((b) => (b === c.cpl_id ? null : c.cpl_id))}>
                  <b>{c.nilai == null ? '–' : formatNumber(n(c.nilai), { maximumFractionDigits: 1 })}</b>
                  <small>
                    {c.mk_sudah_dinilai}/{c.mk_total} MK
                  </small>
                </button>
              }
            />
            {buka === c.cpl_id && (
              <li className="u-cpl-mk">
                <ul>
                  {c.mata_kuliah.map((m) => (
                    <li key={m.mk_id}>
                      <span className="u-kur-code">{m.kode_mk}</span>
                      <span>{m.nama}</span>
                      <b>{m.nilai == null ? 'belum dinilai' : formatNumber(n(m.nilai), { maximumFractionDigits: 1 })}</b>
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </React.Fragment>
        ))}
      </ul>
    </div>
  );
}

// ================================================================ Migrasi
const TAHAP = ['1_belum', '2_dilengkapi', '3_disahkan', '4_diterbitkan'] as const;
const LABEL_TAHAP = ['Belum mulai', 'Dilengkapi', 'Disahkan', 'Diterbitkan'];
// Tahap berurutan: abu-abu → biru makin pekat → hijau saat sudah terbit.
const WARNA_TAHAP = ['color-mix(in oklab, var(--u-muted-foreground) 45%, var(--u-muted))', 'color-mix(in oklab, var(--u-primary) 45%, var(--u-card))', 'var(--u-primary)', 'var(--u-success)'];
/** Kemajuan migrasi kurikulum lama ke OBE per prodi: belum → dilengkapi → disahkan → diterbitkan ke SIAKAD lama. */
export function StatusMigrasiKurikulum({ onPilihProdi, className }: { onPilihProdi?: (p: StatusMigrasiProdi) => void; className?: string }) {
  const q = useStatusMigrasiKurikulum();
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 240 }} />;
  const data = q.data ?? [];
  const per = TAHAP.map((t) => data.filter((p) => p.tahap === t).length);
  return (
    <div className={cn('u-migrasi', className)}>
      <SegmentBar data={LABEL_TAHAP.map((l, i) => ({ label: l, value: per[i]!, color: WARNA_TAHAP[i] }))} format={(v) => `${v} prodi`} />
      <ul className="u-migrasi-list">
        {data.map((p) => {
          const idx = TAHAP.indexOf(p.tahap);
          const Tag = onPilihProdi ? 'button' : 'div';
          return (
            <li key={p.kode_prodi}>
              <Tag className="u-migrasi-row" {...(onPilihProdi ? { type: 'button' as const, onClick: () => onPilihProdi(p) } : {})}>
                <span className="u-migrasi-prodi">
                  <b>{p.nama_prodi}</b>
                  <small>
                    {[
                      p.jenjang,
                      p.lama?.jumlah_semester ? `${p.lama.jumlah_semester} semester data lama` : null,
                      p.terbit_terakhir ? `terbit ${p.terbit_terakhir.tahun_id}` : p.impor_terakhir ? `impor ${p.impor_terakhir.tahun_id}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </small>
                </span>
                <span className="u-migrasi-steps" aria-label={`Tahap: ${LABEL_TAHAP[idx]}`}>
                  {LABEL_TAHAP.map((l, i) => (
                    <span key={l} data-state={i <= idx ? 'done' : 'todo'} title={l} style={i <= idx ? { background: WARNA_TAHAP[idx] } : undefined} />
                  ))}
                </span>
                <span className="u-migrasi-label" data-tahap={p.tahap}>
                  {LABEL_TAHAP[idx]}
                </span>
              </Tag>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ================================================================ Ekuivalensi & peninjauan
const JENIS_EKUIVALENSI: Record<Ekuivalensi['jenis'], { label: string; variant: BadgeVariant }> = {
  setara: { label: 'Setara', variant: 'success' },
  gabung: { label: 'Digabung', variant: 'info' },
  pecah: { label: 'Dipecah', variant: 'warning' },
  dihapus: { label: 'Dihapus', variant: 'danger' },
};
/** Tabel ekuivalensi MK kurikulum lama ke MK kurikulum baru (untuk konversi nilai mahasiswa lama). */
export function EkuivalensiKurikulum({ kurikulumId, className }: { kurikulumId: number | string; className?: string }) {
  const q = useEkuivalensi(kurikulumId);
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 200 }} />;
  if (!q.data?.length) return <Empty icon={<ClipboardList />} title="Belum ada ekuivalensi" description="Buat otomatis dari kecocokan kode dan nama MK, lalu periksa satu per satu." bordered />;
  return (
    <TableContainer className={className}>
      <Table density="compact">
        <thead>
          <tr>
            <th>MK lama</th>
            <th style={{ width: 56, textAlign: 'right' }}>SKS</th>
            <th style={{ width: 112 }}>Hubungan</th>
            <th>MK baru</th>
            <th style={{ width: 56, textAlign: 'right' }}>SKS</th>
          </tr>
        </thead>
        <tbody>
          {q.data.map((e) => (
            <tr key={e.id}>
              <td>
                <span className="u-kur-code">{e.kode_mk_lama}</span> {e.nama_mk_lama}
              </td>
              <td style={{ textAlign: 'right' }}>{e.sks_lama != null ? formatNumber(n(e.sks_lama)) : '–'}</td>
              <td>
                <Badge variant={JENIS_EKUIVALENSI[e.jenis]?.variant ?? 'neutral'}>{JENIS_EKUIVALENSI[e.jenis]?.label ?? e.jenis}</Badge>
              </td>
              <td>
                {e.kode_mk ? (
                  <>
                    <span className="u-kur-code">{e.kode_mk}</span> {e.nama_mk}
                  </>
                ) : (
                  <span className="u-muted">Tidak ada padanan</span>
                )}
              </td>
              <td style={{ textAlign: 'right' }}>{e.sks_mk != null ? formatNumber(n(e.sks_mk)) : '–'}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </TableContainer>
  );
}

const JENIS_PENINJAUAN: Record<string, string> = {
  evaluasi_tahunan: 'Evaluasi tahunan',
  peninjauan: 'Peninjauan kurikulum',
  audit_mutu: 'Audit mutu',
  masukan_pemangku: 'Masukan pemangku kepentingan',
  lainnya: 'Lainnya',
};
/** Linimasa evaluasi dan peninjauan kurikulum (bahan akreditasi dan siklus PPEPP). */
export function PeninjauanKurikulum({ kurikulumId, className }: { kurikulumId: number | string; className?: string }) {
  const q = usePeninjauan(kurikulumId);
  if (q.error) return <Galat q={q} />;
  return (
    <ActivityFeed
      className={className}
      loading={muatDari(q)}
      empty="Belum ada catatan peninjauan."
      items={(q.data ?? []).map((p) => ({
        id: p.id,
        title: p.judul,
        icon: p.status === 'selesai' ? <Check /> : p.status === 'berjalan' ? <RefreshCw /> : <ClipboardList />,
        meta: [JENIS_PENINJAUAN[p.jenis] ?? p.jenis, p.pelaksana, p.status === 'selesai' ? null : p.status].filter(Boolean).join(' · '),
        time: p.tanggal ? formatDate(p.tanggal) : undefined,
      }))}
    />
  );
}

// ================================================================ Tabel struktur per semester
/** Detail satu MK kurikulum: ringkasan, prasyarat, CPL, lalu CPMK & sub-CPMK. Dipakai di baris terbuka dan popup. */
export function DetailMkKurikulum({ mk, judul, className }: { mk: MkKurikulum; judul?: boolean; className?: string }) {
  const cpl = daftar(mk.cpl);
  const prasyarat = daftar(mk.prasyarat);
  return (
    <div className={cn('u-tsk-detail', className)}>
      {judul && (
        <header className="u-tsk-detail-head">
          <span className="u-kur-code">{mk.kode_mk}</span>
          <h3>{mk.nama}</h3>
          <p>{[`${formatNumber(n(mk.sks))} SKS`, mk.semester ? `Semester ${mk.semester}` : 'Pilihan bebas'].join(' · ')}</p>
          {mk.deskripsi && <p className="u-tsk-detail-desc">{mk.deskripsi}</p>}
        </header>
      )}
      {!judul && mk.deskripsi && <p className="u-tsk-detail-desc">{mk.deskripsi}</p>}
      <dl className="u-tsk-detail-info">
        <div>
          <dt>Jenis</dt>
          <dd>{JENIS_MK[mk.jenis] ?? mk.jenis}</dd>
        </div>
        <div>
          <dt>Modalitas</dt>
          <dd>{mk.modalitas ?? '–'}</dd>
        </div>
        <div>
          <dt>Prasyarat</dt>
          <dd>
            {prasyarat.length
              ? prasyarat.map((p) => (
                  <span key={p} className="u-kur-code">
                    {p}
                  </span>
                ))
              : 'Tidak ada'}
          </dd>
        </div>
        <div>
          <dt>CPL didukung</dt>
          <dd>
            {cpl.length ? (
              cpl.map((c) => (
                <Badge key={c} variant="secondary">
                  {c}
                </Badge>
              ))
            ) : (
              <span data-warn="">Belum dipetakan</span>
            )}
          </dd>
        </div>
      </dl>
      <CpmkMataKuliah mkId={mk.id} />
    </div>
  );
}

/** DetailMkKurikulum dalam panel samping. */
export function SheetMkKurikulum({ mk, onOpenChange }: { mk: MkKurikulum | null | undefined; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={!!mk} onOpenChange={onOpenChange} title="Detail mata kuliah" size="lg" className="u-sheet-detail">
      {mk && <DetailMkKurikulum mk={mk} judul />}
    </Sheet>
  );
}

export interface TabelStrukturKurikulumProps {
  kurikulumId: number | string;
  /** Cara membuka detail MK: 'baris' (lipat di dalam tabel, bawaan), 'popup' (panel samping), atau 'keduanya'. */
  detail?: 'baris' | 'popup' | 'keduanya';
  /** Ganti perilaku klik MK sepenuhnya, mis. pindah ke halaman MK. */
  onPilihMk?: (mk: MkKurikulum) => void;
  /** Semester yang terbuka di awal (bawaan semua). */
  semesterTerbuka?: number[];
  /** ID MK yang detailnya terbuka di awal (mode baris). */
  mkTerbuka?: number[];
  /** Kotak cari kode/nama MK (bawaan true). */
  cari?: boolean;
  className?: string;
}

/**
 * Struktur kurikulum sebagai tabel dikelompokkan per semester: kepala semester bisa dilipat, total SKS terhadap batas,
 * dan detail tiap MK (CPMK, sub-CPMK, CPL, prasyarat) dibuka di baris atau di panel samping.
 */
export function TabelStrukturKurikulum({ kurikulumId, detail = 'baris', onPilihMk, semesterTerbuka, mkTerbuka, cari = true, className }: TabelStrukturKurikulumProps) {
  const q = useMkKurikulum(kurikulumId);
  const [tutup, setTutup] = React.useState<Set<number>>(new Set());
  const [buka, setBuka] = React.useState<Set<number>>(() => new Set(mkTerbuka));
  const [popup, setPopup] = React.useState<MkKurikulum | null>(null);
  const [kata, setKata] = React.useState('');
  const awal = React.useRef(false);
  const mk = q.data ?? [];
  const semester = [...new Set(mk.map((m) => m.semester ?? 0))].sort((a, b) => (a || 99) - (b || 99));
  React.useEffect(() => {
    if (awal.current || !semesterTerbuka || !semester.length) return;
    awal.current = true;
    setTutup(new Set(semester.filter((s) => !semesterTerbuka.includes(s))));
  }, [semester.join(','), semesterTerbuka]); // eslint-disable-line react-hooks/exhaustive-deps

  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 420 }} />;
  if (!mk.length) return <Empty icon={<BookOpen />} title="Belum ada mata kuliah" bordered />;

  const k = kata.trim().toLowerCase();
  const cocok = (m: MkKurikulum) => !k || m.kode_mk.toLowerCase().includes(k) || m.nama.toLowerCase().includes(k);
  const wajib = (m: MkKurikulum) => !(m.jenis === 'B' || m.jenis === 'D');
  const totalWajib = mk.filter(wajib).reduce((a, m) => a + n(m.sks), 0);
  const totalPilihan = mk.filter((m) => !wajib(m)).reduce((a, m) => a + n(m.sks), 0);
  const baris = detail === 'baris' || detail === 'keduanya';
  const pakaiPopup = detail === 'popup' || detail === 'keduanya';
  const klik = (m: MkKurikulum) => (onPilihMk ? onPilihMk(m) : baris ? setBuka((s) => toggle(s, m.id)) : setPopup(m));
  const semuaTutup = tutup.size === semester.length;

  return (
    <div className={cn('u-tsk', className)}>
      <div className="u-tsk-toolbar">
        {cari && <input className="u-input" data-size="sm" type="search" placeholder="Cari kode atau nama MK" value={kata} onChange={(e) => setKata(e.target.value)} aria-label="Cari mata kuliah" />}
        <span className="u-tsk-total">
          {mk.length} MK · <b>{formatNumber(totalWajib)}</b> SKS wajib{totalPilihan ? ` · ${formatNumber(totalPilihan)} SKS pilihan` : ''}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setTutup(semuaTutup ? new Set() : new Set(semester))}>
          <Layers /> {semuaTutup ? 'Buka semua' : 'Lipat semua'}
        </Button>
      </div>
      <div className="u-tabel-nilai-wrap">
        <table className="u-tabel-nilai u-tsk-table">
          <thead>
            <tr>
              <th aria-label="Buka" />
              <th>Kode</th>
              <th>Mata kuliah</th>
              <th data-angka>SKS</th>
              <th>Jenis</th>
              <th>CPL</th>
              <th>RPS</th>
              {pakaiPopup && baris && <th aria-label="Aksi" />}
            </tr>
          </thead>
          {semester.map((s) => {
            const isi = mk.filter((m) => (m.semester ?? 0) === s);
            const tampil = isi.filter(cocok);
            if (k && !tampil.length) return null;
            const sks = isi.filter(wajib).reduce((a, m) => a + n(m.sks), 0);
            const pilihan = isi.filter((m) => !wajib(m)).reduce((a, m) => a + n(m.sks), 0);
            const maks = s ? maksSksSemester(s) : 0;
            const terlipat = tutup.has(s) && !k;
            const kolom = pakaiPopup && baris ? 8 : 7;
            return (
              <tbody key={s} className="u-tsk-group" data-terlipat={dataFlag(terlipat)}>
                <tr className="u-tsk-head" data-lebih={dataFlag(!!maks && sks > maks)}>
                  <td colSpan={kolom}>
                    <button type="button" aria-expanded={!terlipat} onClick={() => setTutup((t) => toggle(t, s))}>
                      <ChevronRight className="u-tsk-chevron" aria-hidden />
                      <b>{s ? `Semester ${s}` : 'Pilihan bebas'}</b>
                      <span className="u-tsk-head-meta">
                        {isi.length} MK · {formatNumber(sks)}
                        {maks ? `/${maks}` : ''} SKS{pilihan ? ` + ${formatNumber(pilihan)} pilihan` : ''}
                      </span>
                      {!!maks && <Progress value={Math.min(100, (sks / maks) * 100)} size="sm" tone={sks > maks ? 'danger' : 'primary'} className="u-tsk-progress" />}
                    </button>
                  </td>
                </tr>
                {!terlipat &&
                  tampil.map((m) => {
                    const cpl = daftar(m.cpl);
                    const terbuka = buka.has(m.id);
                    return (
                      <React.Fragment key={m.id}>
                        <tr
                          className="u-tsk-row"
                          data-terbuka={dataFlag(terbuka)}
                          data-jenis={m.jenis}
                          tabIndex={0}
                          onClick={() => klik(m)}
                          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), klik(m))}
                          aria-expanded={baris && !onPilihMk ? terbuka : undefined}
                        >
                          <td data-tengah>{baris && !onPilihMk ? <ChevronRight className="u-tsk-chevron" aria-hidden /> : null}</td>
                          <td>
                            <span className="u-kur-code">{m.kode_mk}</span>
                          </td>
                          <td>
                            <span className="u-tsk-nama">{m.nama}</span>
                          </td>
                          <td data-angka>{formatNumber(n(m.sks))}</td>
                          <td>
                            <span className="u-mk-jenis" data-jenis={m.jenis}>
                              {JENIS_MK[m.jenis] ?? m.jenis}
                            </span>
                          </td>
                          <td>{cpl.length ? <span title={cpl.join(', ')}>{cpl.length} CPL</span> : <span className="u-tsk-warn">belum</span>}</td>
                          <td>
                            {m.status_rps === 'disahkan' ? (
                              <Badge variant="success">Disahkan</Badge>
                            ) : (
                              <Badge variant="warning">{m.status_rps ? m.status_rps[0]!.toUpperCase() + m.status_rps.slice(1) : 'Belum'}</Badge>
                            )}
                          </td>
                          {pakaiPopup && baris && (
                            <td data-tengah onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" iconOnly aria-label={`Detail ${m.nama}`} onClick={() => setPopup(m)}>
                                <Maximize2 />
                              </Button>
                            </td>
                          )}
                        </tr>
                        {baris && terbuka && !onPilihMk && (
                          <tr className="u-tsk-expand">
                            <td colSpan={kolom}>
                              <DetailMkKurikulum mk={m} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
              </tbody>
            );
          })}
        </table>
      </div>
      {pakaiPopup && <SheetMkKurikulum mk={popup} onOpenChange={(o) => !o && setPopup(null)} />}
    </div>
  );
}
function toggle<T>(s: Set<T>, v: T): Set<T> {
  const x = new Set(s);
  if (x.has(v)) x.delete(v);
  else x.add(v);
  return x;
}
