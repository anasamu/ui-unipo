'use client';
import * as React from 'react';
import { BellDot, BookOpen, CalendarClock, ClipboardCheck, FileQuestion, ListTodo, RefreshCw, UserCheck, Video } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatDate, formatNumber, formatPersen, formatTime } from '../lib/format';
import { Badge, Button, Skeleton, type BadgeVariant } from '../components/actions';
import { Empty, Progress, ProgressRing } from '../components/display';
import { StatCard, StatGrid } from '../components/charts';
import { pesanGalat, useSiakadQuery, type QueryState } from './provider';
import { KodeLaporan } from '../components/galat';
import { Tekan } from '../components/tekan';

/*
 * Widget LMS (/v1/lms) untuk e-learning: ringkasan beranda, kartu kelas dengan sampul abstrak dan progres,
 * tugas mendatang dengan hitung mundur tenggat, kuis yang sedang dibuka, agenda (tugas, kuis, kelas daring, presensi),
 * dan progres penyelesaian per mahasiswa untuk pengajar.
 */

// ================================================================ Tipe
type Angka = number | string | null | undefined;
const n = (v: Angka) => (v == null || v === '' ? 0 : Number(v) || 0);

export type PeranKelas = 'pengajar' | 'asisten' | 'mahasiswa' | 'pengamat' | 'pengelola' | string;
export interface KelasLms {
  id: number;
  idj?: number | null;
  tahun_id?: string | null;
  kode_prodi?: string | null;
  kode_mk?: string | null;
  kelas?: string | null;
  judul: string;
  /** Nama pendek MK dari prodi (≤ 22 huruf, akademik_mk_nama_pendek); null = aplikasi meringkas judul. */
  nama_pendek?: string | null;
  ringkasan?: string | null;
  format?: 'mingguan' | 'topik';
  status: 'draf' | 'aktif' | 'selesai' | 'arsip';
  mulai?: string | null;
  selesai?: string | null;
  sampul_url?: string | null;
  peran?: PeranKelas | null;
  pengajar?: string | null;
  jumlah_peserta?: Angka;
  /** Aturan kampus ber-SK untuk kelas ini (LMS-18/19): syarat hadir UAS dan skala nilai huruf prodi. */
  aturan?: AturanKelasLms | null;
}
/** Sumber nilai aturan: aturan ber-SK, pengaturan periode BAAK, atau bawaan sistem (belum ditetapkan unit berwenang). */
export type SumberAturanLms = 'aturan' | 'periode' | 'bawaan';
export interface AturanKelasLms {
  hadir_min: { nilai: number; sumber: SumberAturanLms; keterangan: string };
  skala: { baris: { huruf: string; min: number; bobot: number; lulus: boolean }[]; lulus_min: number; sumber: SumberAturanLms; keterangan: string };
}
/** Syarat hadir bawaan bila aturan belum termuat (sama dengan bawaan server). */
export const HADIR_MIN_BAWAAN = 75;
/** Nada nilai 0-100 menurut skala nilai prodi: huruf kedua teratas ke atas = baik, di atas batas lulus = cukup. */
export function nadaNilaiLms(v: number | null | undefined, skala?: AturanKelasLms['skala'] | null): 'success' | 'warning' | 'danger' | undefined {
  if (v == null) return undefined;
  const baris = skala?.baris?.length ? skala.baris : null;
  const baik = baris ? (baris[1] ?? baris[0])!.min : 75;
  const lulus = skala ? skala.lulus_min : 50;
  return v >= baik ? 'success' : v >= lulus ? 'warning' : 'danger';
}
export interface TugasMendatangItem {
  id: number;
  kelas_id: number;
  kelas: string;
  judul: string;
  tenggat: string;
  status_jawaban?: 'draf' | 'dikumpulkan' | 'dinilai' | 'dikembalikan' | null;
}
export interface KuisTerbukaItem {
  id: number;
  kelas_id: number;
  kelas: string;
  judul: string;
  mulai?: string | null;
  selesai?: string | null;
}
export interface LmsSayaData {
  pengguna?: { username?: string; nama?: string; level?: string };
  jumlah_kelas?: number;
  notifikasi_belum_dibaca?: number;
  tugas_mendatang?: TugasMendatangItem[];
  kuis_terbuka?: KuisTerbukaItem[];
  /** Hanya pengajar: jawaban tugas yang menunggu dinilai dan kuis yang perlu dikoreksi. */
  perlu_dinilai?: { tugas?: number; kuis?: number } | null;
}
export interface ProgresMahasiswa {
  nim: string;
  nama?: string | null;
  materi_selesai: number;
  tugas_dikumpulkan: number;
  kuis_dikerjakan: number;
  selesai: number;
  total: number;
  persen: number | null;
}
export interface ProgresKelasData {
  total_aktivitas: { materi_wajib: number; tugas: number; kuis: number };
  mahasiswa: ProgresMahasiswa[];
}
export type JenisAgendaLms = 'tugas' | 'kuis' | 'konferensi' | 'presensi';
export interface AgendaLmsItem {
  jenis: JenisAgendaLms;
  id: number;
  kelas_id: number;
  kelas: string;
  judul: string;
  waktu: string;
  selesai?: string | null;
  tautan?: string;
}

const KATA_KECIL = new Set(['dan', 'di', 'ke', 'dari', 'untuk', 'yang', 'pada', 'dengan', 'atau', 'dalam', 'bagi', 'serta', 'terhadap', 'of', 'and', 'the', 'for', 'in', 'to', 'on']);
/**
 * Nama kelas yang enak dibaca (LMS-22): tanpa akhiran " - Kelas 05", dan nama MK SIAKAD yang ditulis kapital semua
 * diubah ke huruf judul (kata sambung kecil; singkatan dalam kurung, angka Romawi, dan kata berangka tetap). Nama yang
 * sudah bercampur huruf besar-kecil dibiarkan.
 */
export function namaKelasRapiLms(judul: string | null | undefined): string {
  const dasar = String(judul ?? '').replace(/\s+-\s+Kelas\s+[A-Z0-9]+$/i, '').trim();
  if (!dasar || dasar !== dasar.toUpperCase()) return dasar;
  return dasar
    .split(/(\s+)/)
    .map((w, i) => {
      if (/^\s+$/.test(w) || /\d/.test(w) || /^\(.*\)$/.test(w) || /^(I|II|III|IV|V|VI|VII|VIII|IX|X)$/.test(w)) return w;
      const l = w.toLowerCase();
      if (i > 0 && KATA_KECIL.has(l)) return l;
      return l.replace(/(^|[-/&(])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
    })
    .join('');
}

// ================================================================ Hook data
const opt = { staleTime: 60_000 };
export function useLmsSaya() {
  return useSiakadQuery<LmsSayaData>(['lms-saya'], (s, signal) => s.lms.getSaya({}, { signal }) as never, opt);
}
export function useKelasLms(q: { status?: KelasLms['status']; tahun_id?: string; q?: string } = {}) {
  return useSiakadQuery<KelasLms[]>(['lms-kelas', q], (s, signal) => s.lms.getKelas({ per_page: 50, ...q } as never, { signal }) as never, opt);
}
export function useProgresKelas(kelasId: number | string | undefined) {
  return useSiakadQuery<ProgresKelasData>(['lms-progres', String(kelasId)], (s, signal) => s.lms.getKelasByIdProgres(kelasId!, {}, { signal }) as never, { ...opt, enabled: kelasId != null });
}
export function useAnggotaKelas(kelasId: number | string | undefined, aktif = true) {
  return useSiakadQuery<Array<{ username: string; nama?: string | null; peran: PeranKelas }>>(
    ['lms-peserta', String(kelasId)],
    (s, signal) => s.lms.getKelasByIdPeserta(kelasId!, {}, { signal }) as never,
    {
      ...opt,
      enabled: kelasId != null && aktif,
    },
  );
}
export function useKalenderLms(q: { dari?: string; sampai?: string; kelas_id?: number } = {}) {
  return useSiakadQuery<AgendaLmsItem[]>(['lms-kalender', q], (s, signal) => s.lms.getKalender(q as never, { signal }) as never, opt);
}

// ================================================================ Bantuan
function Galat({ q }: { q: QueryState<unknown> }) {
  return (
    <div className="u-widget-error" role="alert">
      <span>
        {pesanGalat(q.error, { kode: false })}
        <KodeLaporan error={q.error} />
      </span>
      <Button size="sm" variant="ghost" onClick={q.refetch}>
        <RefreshCw /> Muat ulang
      </Button>
    </div>
  );
}
const muatDari = (q: QueryState<unknown>) => q.loading && !q.data;
const tglIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Sisa waktu ke tenggat dalam bahasa sehari-hari, plus nada warna untuk lencana. */
export function sisaTenggat(tenggat: string | Date, now: Date = new Date()): { teks: string; tone: BadgeVariant; lewat: boolean } {
  const t = new Date(typeof tenggat === 'string' ? tenggat.replace(' ', 'T') : tenggat).getTime();
  const menit = Math.round((t - now.getTime()) / 60_000);
  if (menit < 0) return { teks: 'Lewat tenggat', tone: 'danger', lewat: true };
  if (menit < 60) return { teks: `${Math.max(1, menit)} menit lagi`, tone: 'danger', lewat: false };
  const jam = Math.floor(menit / 60);
  if (jam < 24) return { teks: `${jam} jam lagi`, tone: 'danger', lewat: false };
  const hari = Math.floor(jam / 24);
  if (hari === 1) return { teks: 'Besok', tone: 'warning', lewat: false };
  return { teks: `${hari} hari lagi`, tone: hari <= 3 ? 'warning' : 'neutral', lewat: false };
}

/** 20251 → "Ganjil 2025/2026". */
const labelTahun = (t: string) =>
  t.length === 5 ? `${({ '1': 'Ganjil', '2': 'Genap', '3': 'Pendek' } as Record<string, string>)[t[4]!] ?? 'Semester'} ${t.slice(0, 4)}/${Number(t.slice(0, 4)) + 1}` : t;
const STATUS_JAWABAN: Record<string, { label: string; variant: BadgeVariant }> = {
  draf: { label: 'Draf', variant: 'neutral' },
  dikumpulkan: { label: 'Dikumpulkan', variant: 'info' },
  dinilai: { label: 'Dinilai', variant: 'success' },
  dikembalikan: { label: 'Perlu revisi', variant: 'warning' },
};
const LABEL_PERAN: Record<string, string> = { pengajar: 'Pengajar', asisten: 'Asisten', mahasiswa: 'Mahasiswa', pengamat: 'Pengamat', pengelola: 'Pengelola' };

// ================================================================ Sampul abstrak
function acak(seed: number) {
  // mulberry32: seed berurutan (ID kelas) tetap menghasilkan pola yang berbeda jauh.
  let a = (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ 0xc2b2ae35) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Sampul kelas berupa pola geometris yang ditentukan dari ID kelas: tiap kelas punya warna dan bentuk tetap, tanpa foto. */
export function SampulKelas({ seed, className }: { seed: number; className?: string }) {
  const r = acak(seed + 7);
  // Hanya --u-chart-1..6 yang ada di token; nomor di luar itu membuat sampul hitam.
  const hue = Math.floor(r() * 6) + 1;
  const hue2 = ((hue + 1) % 6) + 1;
  const pola = Math.floor(r() * 3);
  const bentuk = Array.from({ length: 5 }, () => ({ x: r() * 320, y: r() * 120, s: 30 + r() * 70 }));
  return (
    <svg className={cn('u-lms-sampul', className)} viewBox="0 0 320 120" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="320" height="120" fill={`color-mix(in oklab, var(--u-chart-${hue}) 16%, var(--u-card))`} />
      {pola === 0 && bentuk.map((b, i) => <circle key={i} cx={b.x} cy={b.y} r={b.s / 2} fill={`var(--u-chart-${i % 2 ? hue2 : hue})`} opacity={0.18 + i * 0.06} />)}
      {pola === 1 &&
        bentuk.map((b, i) => (
          <rect
            key={i}
            x={b.x - b.s / 2}
            y={b.y - b.s / 2}
            width={b.s}
            height={b.s}
            rx={10}
            transform={`rotate(${i * 17} ${b.x} ${b.y})`}
            fill={`var(--u-chart-${i % 2 ? hue2 : hue})`}
            opacity={0.16 + i * 0.06}
          />
        ))}
      {pola === 2 &&
        Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M ${-40 + i * 44} 130 Q ${i * 44} ${40 + r() * 40} ${40 + i * 44} 130`} fill="none" stroke={`var(--u-chart-${i % 3 ? hue : hue2})`} strokeWidth={10} opacity={0.22} />
        ))}
    </svg>
  );
}

// ================================================================ Ringkasan beranda
/** Kartu angka beranda LMS: kelas, tugas 14 hari ke depan, kuis dibuka, dan notifikasi (atau antrean penilaian untuk pengajar). */
export function RingkasanLms({ className }: { className?: string }) {
  const q = useLmsSaya();
  if (q.error) return <Galat q={q} />;
  const d = q.data;
  const muat = muatDari(q);
  const belum = (d?.tugas_mendatang ?? []).filter((t) => !t.status_jawaban || t.status_jawaban === 'draf' || t.status_jawaban === 'dikembalikan').length;
  const pengajar = d?.perlu_dinilai != null;
  return (
    <StatGrid className={className}>
      <StatCard label="Kelas" value={formatNumber(d?.jumlah_kelas ?? 0)} icon={<BookOpen />} loading={muat} />
      {pengajar ? (
        <StatCard
          label="Perlu dinilai"
          value={formatNumber(n(d?.perlu_dinilai?.tugas) + n(d?.perlu_dinilai?.kuis))}
          hint={`${n(d?.perlu_dinilai?.tugas)} tugas · ${n(d?.perlu_dinilai?.kuis)} kuis`}
          icon={<ClipboardCheck />}
          loading={muat}
        />
      ) : (
        <StatCard label="Tugas belum dikumpulkan" value={formatNumber(belum)} hint="tenggat 14 hari ke depan" icon={<ListTodo />} loading={muat} />
      )}
      <StatCard label="Kuis dibuka" value={formatNumber(d?.kuis_terbuka?.length ?? 0)} icon={<FileQuestion />} loading={muat} />
      <StatCard label="Notifikasi baru" value={formatNumber(d?.notifikasi_belum_dibaca ?? 0)} icon={<BellDot />} loading={muat} />
    </StatGrid>
  );
}

// ================================================================ Kelas
export interface KartuKelasProps {
  kelas: KelasLms;
  /** Persen penyelesaian (0–100). undefined = sembunyikan; null (mahasiswa) = kelas belum punya aktivitas wajib. */
  progres?: number | null;
  href?: string;
  onPilih?: (k: KelasLms) => void;
  className?: string;
}
/** Satu kartu kelas: sampul abstrak, kode MK, judul, pengajar, peran, dan progres. */
export function KartuKelas({ kelas: k, progres, href, onPilih, className }: KartuKelasProps) {
  const isi = (
    <>
      <span className="u-lms-kelas-sampul">
        {k.sampul_url ? <img src={k.sampul_url} alt="" loading="lazy" /> : <SampulKelas seed={k.id} />}
        {k.status !== 'aktif' && <Badge variant={k.status === 'draf' ? 'warning' : 'neutral'}>{k.status === 'draf' ? 'Draf' : k.status === 'selesai' ? 'Selesai' : 'Arsip'}</Badge>}
      </span>
      <span className="u-lms-kelas-body">
        <span className="u-lms-kelas-meta">
          {k.kode_mk && <span className="u-kur-code">{k.kode_mk}</span>}
          {k.kelas && <span>Kelas {k.kelas}</span>}
          {k.peran && k.peran !== 'mahasiswa' && <span className="u-lms-peran">{LABEL_PERAN[k.peran] ?? k.peran}</span>}
        </span>
        <span className="u-lms-kelas-judul" title={k.judul}>{namaKelasRapiLms(k.judul)}</span>
        {(k.pengajar || k.tahun_id) && <span className="u-lms-kelas-pengajar">{k.pengajar ?? labelTahun(k.tahun_id!)}</span>}
        {progres === null && k.peran === 'mahasiswa' && (
          <span className="u-lms-kelas-progres">
            <small>Belum ada aktivitas wajib</small>
          </span>
        )}
        {progres != null && (
          <span className="u-lms-kelas-progres">
            <Progress value={progres} size="sm" tone={progres >= 100 ? 'success' : 'primary'} />
            <small>{progres >= 100 ? 'Tuntas' : `${formatPersen(progres, 0)} selesai`}</small>
          </span>
        )}
      </span>
    </>
  );
  if (href)
    return (
      <a className={cn('u-lms-kelas', className)} href={href}>
        {isi}
      </a>
    );
  if (onPilih)
    return (
      <Tekan elemen="div" className={cn('u-lms-kelas', className)} onClick={() => onPilih(k)}>
        {isi}
      </Tekan>
    );
  return <div className={cn('u-lms-kelas', className)}>{isi}</div>;
}

function KartuKelasDenganProgres(p: KartuKelasProps) {
  const q = useProgresKelas(p.kelas.peran === 'mahasiswa' ? p.kelas.id : undefined);
  const saya = q.data?.mahasiswa?.[0];
  return <KartuKelas {...p} progres={p.kelas.peran !== 'mahasiswa' || !q.data ? undefined : (saya?.persen ?? null)} />;
}

/** Kelas milik pengguna. Mahasiswa melihat progres penyelesaiannya di tiap kartu. */
export function DaftarKelasLms({
  status = 'aktif',
  href,
  onPilih,
  tampilProgres = true,
  className,
}: {
  status?: KelasLms['status'];
  href?: (k: KelasLms) => string;
  onPilih?: (k: KelasLms) => void;
  tampilProgres?: boolean;
  className?: string;
}) {
  const q = useKelasLms({ status });
  if (q.error) return <Galat q={q} />;
  if (muatDari(q))
    return (
      <div className={cn('u-lms-kelas-grid', className)}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} style={{ height: 236 }} />
        ))}
      </div>
    );
  const data = q.data ?? [];
  if (!data.length) return <Empty icon={<BookOpen />} title="Belum ada kelas" description="Kelas muncul di sini setelah KRS disetujui atau dosen menambahkan Anda." bordered className={className} />;
  const Kartu = tampilProgres ? KartuKelasDenganProgres : KartuKelas;
  return (
    <div className={cn('u-lms-kelas-grid', className)}>
      {data.map((k) => (
        <Kartu key={k.id} kelas={k} href={href?.(k)} onPilih={onPilih} />
      ))}
    </div>
  );
}

// ================================================================ Tugas & kuis
/** Tugas dengan tenggat terdekat dan status pengumpulan. Tenggat < 24 jam ditandai merah. */
export function TugasMendatang({ batas = 6, href, className }: { batas?: number; href?: (t: TugasMendatangItem) => string; className?: string }) {
  const q = useLmsSaya();
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 220 }} />;
  const data = (q.data?.tugas_mendatang ?? []).toSorted((a, b) => a.tenggat.localeCompare(b.tenggat)).slice(0, batas);
  if (!data.length) return <Empty icon={<ListTodo />} title="Tidak ada tugas mendekati tenggat" description="Tugas dengan tenggat 14 hari ke depan akan muncul di sini." className={className} />;
  return (
    <ul className={cn('u-lms-tugas', className)}>
      {data.map((t) => {
        const s = sisaTenggat(t.tenggat);
        const st = t.status_jawaban ? STATUS_JAWABAN[t.status_jawaban] : null;
        const selesai = t.status_jawaban === 'dikumpulkan' || t.status_jawaban === 'dinilai';
        const Tag = href ? 'a' : 'div';
        return (
          <li key={t.id}>
            <Tag className="u-lms-tugas-row" data-selesai={selesai || undefined} {...(href ? { href: href(t) } : {})}>
              <span className="u-lms-tugas-tgl" aria-hidden>
                <b>{new Date(t.tenggat.replace(' ', 'T')).getDate()}</b>
                <small>{new Date(t.tenggat.replace(' ', 'T')).toLocaleDateString('id-ID', { month: 'short' })}</small>
              </span>
              <span className="u-lms-tugas-main">
                <span className="u-lms-tugas-judul">{t.judul}</span>
                <span className="u-lms-tugas-kelas">
                  {t.kelas} · {formatTime(t.tenggat)}
                </span>
              </span>
              <span className="u-lms-tugas-status">
                {selesai ? (
                  <Badge variant={st!.variant} dot>
                    {st!.label}
                  </Badge>
                ) : (
                  <Badge variant={s.tone}>{s.teks}</Badge>
                )}
                {!selesai && st && <small>{st.label}</small>}
              </span>
            </Tag>
          </li>
        );
      })}
    </ul>
  );
}

/** Kuis yang sedang dibuka di kelas pengguna, dengan waktu tutup. */
export function KuisTerbuka({ href, className }: { href?: (k: KuisTerbukaItem) => string; className?: string }) {
  const q = useLmsSaya();
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 140 }} />;
  const data = q.data?.kuis_terbuka ?? [];
  if (!data.length) return <Empty icon={<FileQuestion />} title="Tidak ada kuis yang dibuka" className={className} />;
  return (
    <ul className={cn('u-lms-kuis', className)}>
      {data.map((k) => {
        const s = k.selesai ? sisaTenggat(k.selesai) : null;
        return (
          <li key={k.id} className="u-lms-kuis-row">
            <span className="u-lms-ikon" data-jenis="kuis">
              <FileQuestion />
            </span>
            <span className="u-lms-tugas-main">
              <span className="u-lms-tugas-judul">{k.judul}</span>
              <span className="u-lms-tugas-kelas">
                {k.kelas}
                {s && ` · ditutup ${s.teks.toLowerCase()}`}
              </span>
            </span>
            {href && (
              <Button size="sm" render={<a href={href(k)} />}>
                Kerjakan
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ================================================================ Agenda
const IKON_AGENDA: Record<JenisAgendaLms, React.ReactNode> = { tugas: <ListTodo />, kuis: <FileQuestion />, konferensi: <Video />, presensi: <UserCheck /> };
const LABEL_AGENDA: Record<JenisAgendaLms, string> = { tugas: 'Tenggat tugas', kuis: 'Kuis', konferensi: 'Kelas daring', presensi: 'Presensi' };

/** Agenda pembelajaran beberapa hari ke depan, dikelompokkan per tanggal. */
export function AgendaLms({ hari = 14, kelasId, onPilih, className }: { hari?: number; kelasId?: number; onPilih?: (a: AgendaLmsItem) => void; className?: string }) {
  const [rentang] = React.useState(() => {
    const d = new Date();
    const s = new Date(d.getTime() + hari * 86_400_000);
    return { dari: tglIso(d), sampai: tglIso(s) };
  });
  const q = useKalenderLms({ ...rentang, ...(kelasId ? { kelas_id: kelasId } : {}) });
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 260 }} />;
  const data = q.data ?? [];
  if (!data.length) return <Empty icon={<CalendarClock />} title="Agenda kosong" description={`Tidak ada kegiatan ${hari} hari ke depan.`} className={className} />;
  const grup = new Map<string, AgendaLmsItem[]>();
  for (const a of data) {
    const k = a.waktu.slice(0, 10);
    grup.set(k, [...(grup.get(k) ?? []), a]);
  }
  const hariIni = tglIso(new Date());
  return (
    <div className={cn('u-lms-agenda', className)}>
      {[...grup].map(([tgl, isi]) => (
        <section key={tgl}>
          <h4>
            {tgl === hariIni ? 'Hari ini' : formatDate(tgl, 'full').replace(/ \d{4}$/, '')}
            <span>{isi.length}</span>
          </h4>
          <ul>
            {isi.map((a) => {
              const Tag = onPilih ? 'button' : 'div';
              return (
                <li key={`${a.jenis}-${a.id}`}>
                  <Tag className="u-lms-agenda-row" {...(onPilih ? { type: 'button' as const, onClick: () => onPilih(a) } : {})}>
                    <span className="u-lms-agenda-jam">{a.waktu.slice(11, 16) === '00:00' ? 'Sehari' : a.waktu.slice(11, 16)}</span>
                    <span className="u-lms-ikon" data-jenis={a.jenis}>
                      {IKON_AGENDA[a.jenis]}
                    </span>
                    <span className="u-lms-tugas-main">
                      <span className="u-lms-tugas-judul">{a.judul}</span>
                      <span className="u-lms-tugas-kelas">
                        {LABEL_AGENDA[a.jenis]} · {namaKelasRapiLms(a.kelas)}
                      </span>
                    </span>
                  </Tag>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ================================================================ Progres kelas
/**
 * Progres penyelesaian kelas. Untuk mahasiswa tampil cincin progres dirinya; untuk pengajar tampil semua peserta,
 * diurutkan dari yang paling tertinggal agar mudah ditindaklanjuti.
 */
export function ProgresKelas({ kelasId, ambang = 50, className }: { kelasId: number; ambang?: number; className?: string }) {
  const q = useProgresKelas(kelasId);
  // Progres hanya memuat NIM; nama diambil dari daftar peserta (hanya untuk tampilan pengajar).
  const banyak = (q.data?.mahasiswa.length ?? 0) > 1;
  const pq = useAnggotaKelas(kelasId, banyak);
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 220 }} />;
  const d = q.data;
  if (!d) return null;
  const nama = new Map((pq.data ?? []).map((a) => [a.username, a.nama]));
  const tot = d.total_aktivitas;
  const rincian = (m: ProgresMahasiswa) => [
    { label: 'Materi wajib', v: m.materi_selesai, t: tot.materi_wajib },
    { label: 'Tugas', v: m.tugas_dikumpulkan, t: tot.tugas },
    { label: 'Kuis', v: m.kuis_dikerjakan, t: tot.kuis },
  ];
  if (d.mahasiswa.length === 1) {
    const m = d.mahasiswa[0]!;
    return (
      <div className={cn('u-lms-progres-saya', className)}>
        <ProgressRing value={m.persen ?? 0} size={96} thickness={8} tone={(m.persen ?? 0) >= 100 ? 'success' : 'primary'} label={<b>{formatPersen(m.persen ?? 0, 0)}</b>} />
        <ul>
          {rincian(m).map((r) => (
            <li key={r.label}>
              <span>{r.label}</span>
              <Progress value={r.t ? (r.v / r.t) * 100 : 0} size="sm" />
              <b>
                {r.v}/{r.t}
              </b>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const urut = d.mahasiswa.map((m) => ({ ...m, nama: m.nama ?? nama.get(m.nim) ?? null })).sort((a, b) => (a.persen ?? 0) - (b.persen ?? 0));
  const rata = urut.length ? urut.reduce((s, m) => s + (m.persen ?? 0), 0) / urut.length : 0;
  const tertinggal = urut.filter((m) => (m.persen ?? 0) < ambang).length;
  return (
    <div className={cn('u-lms-progres', className)}>
      <div className="u-lms-progres-head">
        <span>
          <b>{formatPersen(rata, 0)}</b> rata-rata penyelesaian
        </span>
        <span>
          {tot.materi_wajib} materi wajib · {tot.tugas} tugas · {tot.kuis} kuis
        </span>
        {tertinggal > 0 && (
          <Badge variant="warning">
            {tertinggal} mahasiswa di bawah {ambang}%
          </Badge>
        )}
      </div>
      <ul className="u-lms-progres-list">
        {urut.map((m) => (
          <li key={m.nim} data-tertinggal={(m.persen ?? 0) < ambang || undefined}>
            <span className="u-lms-progres-nama">
              <span>{m.nama ?? m.nim}</span>
              {m.nama && <small>{m.nim}</small>}
            </span>
            <Progress value={m.persen ?? 0} size="sm" tone={(m.persen ?? 0) < ambang ? 'warning' : (m.persen ?? 0) >= 100 ? 'success' : 'primary'} />
            <span className="u-lms-progres-angka">
              <b>{formatPersen(m.persen ?? 0, 0)}</b>
              <small>
                {m.selesai}/{m.total}
              </small>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
