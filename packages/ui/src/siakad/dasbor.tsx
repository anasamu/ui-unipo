'use client';
import * as React from 'react';
import {
  Archive,
  BadgeCheck,
  BookOpenCheck,
  Briefcase,
  CalendarClock,
  ClipboardCheck,
  FileClock,
  FileText,
  FlaskConical,
  GraduationCap,
  Inbox,
  Mail,
  MessageSquare,
  Newspaper,
  PiggyBank,
  Receipt,
  RefreshCw,
  Send,
  ShieldAlert,
  TriangleAlert,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { formatDate, formatNumber, formatPersen, formatRelative, formatRupiahRingkas } from '../lib/format';
import { Button } from '../components/actions';
import { Alert, Empty, Progress } from '../components/display';
import {
  ActionList,
  ActivityFeed,
  BarChart,
  BarList,
  BudgetMeter,
  CycleSteps,
  DashboardGrid,
  DonutChart,
  Funnel,
  GroupedBarChart,
  LineChart,
  Panel,
  SegmentBar,
  StatCard,
  StatGrid,
} from '../components/charts';
import { pesanGalat, useSiakadQuery, type QueryState } from './provider';
import { KodeLaporan } from '../components/galat';
import { LabelProdi } from './prodi';

/*
 * Widget per fitur untuk tiap unit kerja (BAAK, keuangan, kepegawaian, SPMI, LPPM, arsip, humas, PMB, tracer).
 * Tiap modul punya: hook data (mis. useStatistikPmb), kartu ringkasan (RingkasanPmb), widget panel kecil
 * (CorongPmb, PendaftarHarianPmb, …), dan dasbor utuh (DasborPmb) yang hanya menyusun widget-widget itu.
 * Widget dengan kueri yang sama berbagi satu panggilan API.
 */

// ================================================================ Bantuan bersama
type Angka = number | string | null | undefined;
const n = (v: Angka) => (v == null || v === '' ? 0 : Number(v) || 0);
/** Seperti n(), tetapi kosong tetap null (grafik menggambarnya sebagai celah "belum ada", bukan 0). */
const nAtauNull = (v: Angka) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
/** Peta {kunci: jumlah} dari API (PHP mengirim [] untuk peta kosong). */
const peta = (m: unknown): Array<[string, number]> => (m && typeof m === 'object' && !Array.isArray(m) ? Object.entries(m as Record<string, Angka>).map(([k, v]) => [k, n(v)]) : []);
const judulKunci = (k: string) => (k === 'belum_diisi' || k === '' ? 'Belum diisi' : k.length <= 3 ? k.toUpperCase() : (k.charAt(0).toUpperCase() + k.slice(1)).replace(/_/g, ' '));
const ubah = (cur: number, prev: number | undefined) => (prev ? ((cur - prev) / prev) * 100 : null);

/** "20241" → "2024/2025 Ganjil"; pendek: "24/25 Gj". */
export function labelSemester(id: string | number, pendek = false): string {
  const s = String(id);
  const y = Number(s.slice(0, 4));
  const k = s.slice(4);
  if (!y) return s;
  const nama = k === '1' ? 'Ganjil' : k === '2' ? 'Genap' : k === '3' ? 'Pendek' : '';
  return pendek ? `${String(y).slice(2)}/${String(y + 1).slice(2)} ${({ Ganjil: 'Gj', Genap: 'Gn', Pendek: 'Pd' } as Record<string, string>)[nama] ?? ''}`.trim() : `${y}/${y + 1} ${nama}`.trim();
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const tglPendek = (iso: string) => {
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? iso : `${d.getDate()} ${BULAN[d.getMonth()]}`;
};

export interface DasborBaseProps {
  /** Judul dasbor. Isi `null` untuk menyembunyikan kepala. */
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Kontrol di kanan kepala, mis. pilihan periode/unit. */
  actions?: React.ReactNode;
  className?: string;
}

/** Kerangka dasbor: kepala (judul, keterangan, aksi), galat dengan tombol muat ulang, lalu isi. */
export function KerangkaDasbor({
  title,
  description,
  actions,
  error,
  onRetry,
  atas,
  children,
  className,
}: DasborBaseProps & { error?: Error | null; onRetry?: () => void; /** Isi di bawah kepala yang tetap tampil walau data dasbor gagal dimuat. */ atas?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={cn('u-dasbor', className)}>
      {(title || actions) && (
        <header className="u-dasbor-head">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions && <div className="u-dasbor-actions">{actions}</div>}
        </header>
      )}
      {atas}
      {error ? (
        <Alert
          variant="danger"
          title="Data dasbor gagal dimuat"
          actions={
            onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RefreshCw /> Muat ulang
              </Button>
            )
          }
        >
          {pesanGalat(error, { kode: false })}
          <KodeLaporan error={error} />
        </Alert>
      ) : (
        children
      )}
    </div>
  );
}

const galatDari = (...qs: Array<QueryState<unknown>>) => qs.find((q) => q.error)?.error ?? null;
const ulangSemua =
  (...qs: Array<QueryState<unknown>>) =>
  () =>
    qs.forEach((q) => q.refetch());

// ================================================================ Pabrik widget
export interface WidgetProps {
  /** Ganti judul bawaan panel. */
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Lebar kolom di DashboardGrid. */
  span?: 1 | 2 | 3 | 'full';
  className?: string;
}

function GalatWidget({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="u-widget-error" role="alert">
      <span>{pesanGalat(error, { kode: false })}<KodeLaporan error={error} /></span>
      <Button size="sm" variant="ghost" onClick={onRetry}>
        <RefreshCw /> Muat ulang
      </Button>
    </div>
  );
}

/**
 * Membuat widget panel kecil dari satu hook data. Widget yang memakai hook dan kueri yang sama berbagi satu panggilan API,
 * jadi memasang beberapa widget di satu halaman tidak menambah beban server.
 */
function buatWidget<Q extends object, D>(
  nama: string,
  useData: (q: Q) => QueryState<D>,
  bawaan: { title: string; description?: string; span?: WidgetProps['span'] },
  isi: (d: D | undefined, muat: boolean, q: Q) => React.ReactNode,
) {
  function Widget(props: Q & WidgetProps) {
    const r = useData(props);
    return (
      <Panel title={props.title ?? bawaan.title} description={props.description ?? bawaan.description} actions={props.actions} span={props.span ?? bawaan.span} className={props.className}>
        {r.error ? <GalatWidget error={r.error} onRetry={r.refetch} /> : isi(r.data, r.loading && !r.data, props)}
      </Panel>
    );
  }
  Widget.displayName = nama;
  return Widget;
}

/** Bungkus kartu ringkasan: galat ringkas atau grid kartu. */
function KartuRingkas({ q, min = 190, className, children }: { q: Array<QueryState<unknown>>; min?: number; className?: string; children: React.ReactNode }) {
  const e = galatDari(...q);
  if (e) return <GalatWidget error={e} onRetry={ulangSemua(...q)} />;
  return (
    <StatGrid min={min} className={className}>
      {children}
    </StatGrid>
  );
}
const muatDari = (r: QueryState<unknown>) => r.loading && !r.data;

// ================================================================ BAAK / akademik
export interface RingkasAkademik {
  tahun_id: string;
  total: Partial<Record<'mahasiswa_aktif' | 'status_aktif_semester' | 'cuti' | 'nonaktif' | 'mengisi_krs' | 'mahasiswa_baru' | 'lulusan' | 'dosen' | 'ews_tinggi', Angka>>;
  per_prodi: Array<{
    kode_prodi: string;
    nama_prodi: string;
    jenjang?: string;
    mahasiswa_aktif: Angka;
    mengisi_krs?: Angka;
    dosen?: Angka;
    rasio_dosen_mahasiswa?: Angka;
    persen_krs?: Angka;
    rata_ipk_lulusan?: Angka;
    rata_sks_krs?: Angka;
    ews_tinggi?: Angka;
  }>;
}
export interface TrenAkademik {
  tahun_id: string;
  mengisi_krs: Angka;
  mahasiswa_baru: Angka;
  lulusan: Angka;
  rata_ips: Angka;
}
export interface KueriAkademik {
  /** Semester, mis. "20261". Bawaan semester aktif. */
  tahunId?: string;
  kodeProdi?: string;
  /** Jumlah semester untuk tren (2–20). Bawaan 8. */
  semester?: number;
}
/** GET /v1/dasbor/ringkas. */
export function useRingkasAkademik({ tahunId, kodeProdi }: KueriAkademik) {
  const q = { tahun_id: tahunId, kode_prodi: kodeProdi };
  return useSiakadQuery<RingkasAkademik>(['dasbor-ringkas', q], (s, signal) => s.dasbor.getRingkas(q, { signal }) as never, { staleTime: 300_000 });
}
/** GET /v1/dasbor/tren, diurutkan dari semester terlama. */
export function useTrenAkademik({ semester = 8, kodeProdi }: KueriAkademik) {
  const r = useSiakadQuery<TrenAkademik[]>(['dasbor-tren', semester, kodeProdi], (s, signal) => s.dasbor.getTren({ semester, kode_prodi: kodeProdi }, { signal }) as never, { staleTime: 300_000 });
  const data = React.useMemo(() => {
    if (!r.data) return undefined;
    const urut = [...r.data].sort((a, b) => String(a.tahun_id).localeCompare(String(b.tahun_id)));
    // Semester mendatang (belum ada KRS, maba, lulusan, maupun IPS) tidak dijadikan entri sumbu.
    const kosong = (t: TrenAkademik) => !n(t.mengisi_krs) && !n(t.mahasiswa_baru) && !n(t.lulusan) && nAtauNull(t.rata_ips) == null;
    while (urut.length > 1 && kosong(urut[urut.length - 1]!)) urut.pop();
    return urut;
  }, [r.data]);
  return { ...r, data };
}

/** Kartu angka BAAK: mahasiswa aktif, pengisi KRS, mahasiswa baru, lulusan, dosen, EWS. */
export function RingkasanAkademik({ hrefEws, className, ...k }: KueriAkademik & { hrefEws?: string; className?: string }) {
  const ringkas = useRingkasAkademik(k);
  const tren = useTrenAkademik(k);
  const t = ringkas.data?.total ?? {};
  const seri = tren.data ?? [];
  const muat = muatDari(ringkas);
  const akhir = seri[seri.length - 1];
  // Bandingkan dengan semester sejenis tahun lalu (ganjil dengan ganjil).
  const lalu = akhir ? [...seri].reverse().find((r) => r !== akhir && String(r.tahun_id).slice(4) === String(akhir.tahun_id).slice(4)) : undefined;
  const banding = (key: keyof TrenAkademik) => (akhir && lalu ? ubah(n(akhir[key]), n(lalu[key])) : null);
  const labelLalu = lalu ? `dari ${labelSemester(lalu.tahun_id)}` : undefined;
  const aktif = n(t.mahasiswa_aktif);
  const dosen = n(t.dosen);
  return (
    <KartuRingkas q={[ringkas, tren]} className={className}>
      <StatCard label="Mahasiswa aktif" icon={<Users />} loading={muat} value={formatNumber(aktif)} hint={`${formatNumber(n(t.status_aktif_semester))} aktif semester ini`} />
      <StatCard
        label="Mengisi KRS"
        icon={<BookOpenCheck />}
        loading={muat}
        value={formatNumber(n(t.mengisi_krs))}
        delta={banding('mengisi_krs')}
        deltaLabel={labelLalu}
        trend={seri.map((r) => n(r.mengisi_krs))}
        footer={!muat && aktif > 0 ? <Progress value={Math.min(100, (n(t.mengisi_krs) / aktif) * 100)} size="sm" /> : undefined}
      />
      <StatCard label="Mahasiswa baru" icon={<UserPlus />} loading={muat} value={formatNumber(n(t.mahasiswa_baru))} delta={banding('mahasiswa_baru')} deltaLabel={labelLalu} tone="info" />
      <StatCard label="Lulusan" icon={<GraduationCap />} loading={muat} value={formatNumber(n(t.lulusan))} delta={banding('lulusan')} deltaLabel={labelLalu} tone="success" />
      <StatCard
        label="Dosen"
        icon={<UserCheck />}
        loading={muat}
        value={formatNumber(dosen)}
        hint={dosen ? `Rasio 1 : ${formatNumber(aktif / dosen, { maximumFractionDigits: 0 })}` : 'Belum ada data dosen'}
        tone="neutral"
      />
      <StatCard
        label="Risiko tinggi (EWS)"
        icon={<TriangleAlert />}
        loading={muat}
        value={formatNumber(n(t.ews_tinggi))}
        hint="mahasiswa perlu pendampingan"
        tone={n(t.ews_tinggi) > 0 ? 'danger' : 'neutral'}
        href={hrefEws}
      />
    </KartuRingkas>
  );
}

/** Pengisi KRS per semester (batang, semester berjalan ditandai). */
export const KrsPerSemester = buatWidget('KrsPerSemester', useTrenAkademik, { title: 'Pengisi KRS per semester', description: 'Semester terakhir', span: 2 }, (seri, muat) => (
  <BarChart loading={muat} highlightLast data={(seri ?? []).map((r) => ({ label: labelSemester(r.tahun_id, true), title: labelSemester(r.tahun_id), value: n(r.mengisi_krs) }))} />
));

/** Mahasiswa baru dan lulusan per semester (batang berkelompok). */
export const MabaLulusanPerSemester = buatWidget('MabaLulusanPerSemester', useTrenAkademik, { title: 'Mahasiswa baru & lulusan', span: 2 }, (seri, muat) => (
  <GroupedBarChart
    loading={muat}
    labels={(seri ?? []).map((r) => labelSemester(r.tahun_id, true))}
    titles={(seri ?? []).map((r) => labelSemester(r.tahun_id))}
    series={[
      { label: 'Mahasiswa baru', values: (seri ?? []).map((r) => n(r.mahasiswa_baru)) },
      { label: 'Lulusan', values: (seri ?? []).map((r) => n(r.lulusan)) },
    ]}
  />
));

/** Rata-rata IPS per semester. */
export const IpsPerSemester = buatWidget('IpsPerSemester', useTrenAkademik, { title: 'Rata-rata IPS', description: 'Per semester' }, (seri, muat) => (
  <BarChart
    loading={muat}
    height={150}
    max={4}
    format={(v) => formatNumber(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    emptyLabel="Belum ada IPS"
    data={(seri ?? []).map((r) => ({ label: labelSemester(r.tahun_id, true), title: labelSemester(r.tahun_id), value: nAtauNull(r.rata_ips) }))}
  />
));

/** Komposisi aktif, cuti, nonaktif semester berjalan. */
export const StatusMahasiswa = buatWidget('StatusMahasiswa', useRingkasAkademik, { title: 'Status mahasiswa', description: 'Semester berjalan' }, (d, muat) => (
  <DonutChart
    loading={muat}
    size={132}
    centerLabel="mahasiswa"
    data={[
      { label: 'Aktif', value: n(d?.total.status_aktif_semester) },
      { label: 'Cuti', value: n(d?.total.cuti) },
      { label: 'Nonaktif', value: n(d?.total.nonaktif) },
    ]}
  />
));

/** Mahasiswa aktif per prodi dengan persen pengisian KRS. */
export const MahasiswaPerProdi = buatWidget('MahasiswaPerProdi', useRingkasAkademik, { title: 'Mahasiswa aktif per prodi', description: 'Persentase pengisian KRS di kanan', span: 2 }, (d, muat) => (
  <BarList
    loading={muat}
    limit={8}
    items={[...(d?.per_prodi ?? [])]
      .sort((a, b) => n(b.mahasiswa_aktif) - n(a.mahasiswa_aktif))
      .map((p) => ({
        label: <LabelProdi kode={p.kode_prodi} nama={p.nama_prodi} prodi={{ kode_jenjang: p.jenjang }} sub={false} />,
        value: n(p.mahasiswa_aktif),
        secondary: p.persen_krs != null ? `KRS ${formatPersen(n(p.persen_krs), 0)}` : undefined,
      }))}
  />
));

/** Rasio dosen : mahasiswa per prodi (makin kecil makin baik). */
export const RasioDosenPerProdi = buatWidget('RasioDosenPerProdi', useRingkasAkademik, { title: 'Mahasiswa per dosen', description: 'Per prodi, makin kecil makin baik' }, (d, muat) => (
  <BarList
    loading={muat}
    limit={8}
    format={(v) => `1 : ${formatNumber(v, { maximumFractionDigits: 0 })}`}
    items={(d?.per_prodi ?? [])
      .filter((p) => n(p.dosen) > 0)
      .map((p) => ({ label: <LabelProdi kode={p.kode_prodi} nama={p.nama_prodi} prodi={{ kode_jenjang: p.jenjang }} sub={false} />, value: n(p.mahasiswa_aktif) / n(p.dosen), secondary: `${formatNumber(n(p.dosen))} dosen` }))
      .sort((a, b) => b.value - a.value)}
  />
));

/** Dasbor BAAK lengkap. Semua bagian juga tersedia sebagai widget terpisah. */
export function DasborAkademik({
  tahunId,
  kodeProdi,
  semester = 8,
  hrefEws,
  title = 'Dasbor akademik',
  description,
  actions,
  className,
}: DasborBaseProps & KueriAkademik & { /** Tautan daftar mahasiswa berisiko (EWS). */ hrefEws?: string }) {
  const k = { tahunId, kodeProdi, semester };
  const ringkas = useRingkasAkademik(k);
  return (
    <KerangkaDasbor
      title={title}
      description={description ?? (ringkas.data ? `Tahun akademik ${labelSemester(ringkas.data.tahun_id)}` : undefined)}
      actions={actions}
      error={ringkas.error}
      onRetry={ringkas.refetch}
      className={className}
    >
      <RingkasanAkademik {...k} hrefEws={hrefEws} />
      <DashboardGrid>
        <KrsPerSemester {...k} description={`${semester} semester terakhir`} />
        <StatusMahasiswa {...k} />
        <MahasiswaPerProdi {...k} />
        <IpsPerSemester {...k} />
      </DashboardGrid>
    </KerangkaDasbor>
  );
}

// ================================================================ Keuangan
export interface SerapanAnggaran {
  periode?: { id: number; kode?: string; nama?: string; mulai?: string; selesai?: string; status?: string } | null;
  anggaran: Angka;
  realisasi: Angka;
  persen: Angka;
  penerimaan_lain?: Angka;
  per_unit: Array<{ unit_id: number; unit: string | null; anggaran: Angka; realisasi: Angka; dalam_proses: Angka; sisa: Angka; persen: Angka }>;
  per_akun: Array<{ akun_id: number; akun_kode?: string | null; akun_nama?: string | null; anggaran: Angka; realisasi: Angka; dalam_proses: Angka; sisa: Angka; persen: Angka }>;
}
export interface KueriKeuangan {
  periodeId?: number;
  unitId?: number;
}
/** GET /v1/keu/serapan. */
export function useSerapanAnggaran({ periodeId, unitId }: KueriKeuangan) {
  const q = { periode_id: periodeId, unit_id: unitId };
  return useSiakadQuery<SerapanAnggaran>(['keu-serapan', q], (s, signal) => s.keu.getSerapan(q, { signal }) as never, { staleTime: 120_000 });
}
const prosesDari = (d?: SerapanAnggaran) => (d?.per_unit ?? []).reduce((a, u) => a + n(u.dalam_proses), 0);

/** Kartu angka keuangan: pagu, realisasi, dalam proses, sisa, penerimaan lain. */
export function RingkasanKeuangan({ className, ...k }: KueriKeuangan & { className?: string }) {
  const r = useSerapanAnggaran(k);
  const d = r.data;
  const muat = muatDari(r);
  const proses = prosesDari(d);
  const sisa = n(d?.anggaran) - n(d?.realisasi) - proses;
  return (
    <KartuRingkas q={[r]} className={className}>
      <StatCard label="Pagu anggaran" icon={<Wallet />} loading={muat} value={formatRupiahRingkas(n(d?.anggaran))} hint="RKA disetujui" tone="neutral" />
      <StatCard
        label="Realisasi"
        icon={<Receipt />}
        loading={muat}
        value={formatRupiahRingkas(n(d?.realisasi))}
        hint={`${formatPersen(n(d?.persen))} dari pagu`}
        footer={!muat ? <Progress value={Math.min(100, n(d?.persen))} size="sm" /> : undefined}
      />
      <StatCard label="Dalam proses" icon={<FileClock />} loading={muat} value={formatRupiahRingkas(proses)} hint="diajukan, belum disetujui" tone="warning" />
      <StatCard
        label="Sisa anggaran"
        icon={<PiggyBank />}
        loading={muat}
        value={formatRupiahRingkas(sisa)}
        tone={sisa < 0 ? 'danger' : 'success'}
        hint={sisa < 0 ? 'melebihi pagu' : 'belum terpakai'}
      />
      {d?.penerimaan_lain != null && <StatCard label="Penerimaan lain" icon={<Inbox />} value={formatRupiahRingkas(n(d.penerimaan_lain))} tone="info" hint="di luar UKT" />}
    </KartuRingkas>
  );
}

/** Meter pagu: terpakai, dalam proses, sisa. */
export const PosisiAnggaran = buatWidget('PosisiAnggaran', useSerapanAnggaran, { title: 'Posisi anggaran' }, (d, muat) =>
  muat ? <Progress value={null} /> : <BudgetMeter target={n(d?.anggaran)} used={n(d?.realisasi)} pending={prosesDari(d)} format={formatRupiahRingkas} label={d?.periode?.nama ?? 'Pagu periode'} />,
);

/** Persen serapan per unit kerja. */
export const SerapanPerUnit = buatWidget('SerapanPerUnit', useSerapanAnggaran, { title: 'Serapan per unit', description: 'Persen realisasi terhadap pagu unit', span: 2 }, (d, muat) => (
  <BarList
    loading={muat}
    max={100}
    format={(v) => formatPersen(v, 0)}
    items={[...(d?.per_unit ?? [])]
      .sort((a, b) => n(b.persen) - n(a.persen))
      .map((u) => ({ label: u.unit ?? `Unit ${u.unit_id}`, value: n(u.persen), secondary: `${formatRupiahRingkas(n(u.realisasi))} dari ${formatRupiahRingkas(n(u.anggaran))}` }))}
  />
));

/** Realisasi per akun belanja (delapan terbesar). */
export const RealisasiPerAkun = buatWidget('RealisasiPerAkun', useSerapanAnggaran, { title: 'Realisasi per akun', description: 'Delapan akun terbesar', span: 'full' }, (d, muat) => (
  <BarList
    loading={muat}
    limit={8}
    format={formatRupiahRingkas}
    items={[...(d?.per_akun ?? [])]
      .sort((a, b) => n(b.realisasi) - n(a.realisasi))
      .map((a) => ({ label: a.akun_nama ?? a.akun_kode ?? '-', value: n(a.realisasi), secondary: [a.akun_kode, a.persen != null ? formatPersen(n(a.persen), 0) : null].filter(Boolean).join(' · ') }))}
  />
));

/** Dasbor keuangan lengkap. */
export function DasborKeuangan({ periodeId, unitId, title = 'Serapan anggaran', description, actions, className }: DasborBaseProps & KueriKeuangan) {
  const k = { periodeId, unitId };
  const r = useSerapanAnggaran(k);
  const per = r.data?.periode;
  return (
    <KerangkaDasbor
      title={title}
      description={description ?? (per ? `${per.nama ?? per.kode}${per.mulai && per.selesai ? ` · ${formatDate(per.mulai)} – ${formatDate(per.selesai)}` : ''}` : undefined)}
      actions={actions}
      error={r.error}
      onRetry={r.refetch}
      className={className}
    >
      <RingkasanKeuangan {...k} />
      <DashboardGrid>
        <PosisiAnggaran {...k} />
        <SerapanPerUnit {...k} />
        <RealisasiPerAkun {...k} />
      </DashboardGrid>
    </KerangkaDasbor>
  );
}

// ================================================================ Kepegawaian
export interface DataSdm {
  total: Angka;
  per_jenis?: Record<string, Angka>;
  per_status_kepegawaian?: Record<string, Angka>;
  per_jenis_kelamin?: Record<string, Angka>;
  per_pendidikan?: Record<string, Angka>;
  per_golongan?: Record<string, Angka>;
  per_kelompok_usia?: Record<string, Angka>;
  dosen?: { per_jabatan_akademik?: Record<string, Angka>; per_pendidikan?: Record<string, Angka>; serdos?: Record<string, Angka>; per_prodi?: Record<string, Angka> };
  tendik?: { per_jenis_tendik?: Record<string, Angka> };
  catatan?: string;
}
export interface KueriSdm {
  unitId?: number | string;
}
/** GET /v1/sdm/laporan/ringkasan. */
export function useRingkasanSdm({ unitId }: KueriSdm) {
  const q = { unit_id: unitId == null ? undefined : String(unitId) };
  return useSiakadQuery<DataSdm>(['sdm-ringkasan', q], (s, signal) => s.sdm.getLaporanRingkasan(q, { signal }) as never, { staleTime: 300_000 });
}
const URUT_JAD = ['Guru Besar', 'Lektor Kepala', 'Lektor', 'Asisten Ahli', 'Tenaga Pengajar'];
const URUT_DIDIK = ['S3', 'S2', 'Sp-2', 'Sp-1', 'Profesi', 'S1', 'D4', 'D3', 'D2', 'D1', 'SMA', 'SMK', 'SMP', 'SD'];
const URUT_USIA = ['<30', '30-39', '40-49', '50-59', '60+'];
const urutMenurut = (urut: string[]) => (a: [string, number], b: [string, number]) => {
  const i = (x: string) => (urut.indexOf(x) < 0 ? 99 : urut.indexOf(x));
  return i(a[0]) - i(b[0]) || b[1] - a[1];
};

/** Kartu angka kepegawaian: pegawai, dosen, tendik, dosen tetap bersertifikat. */
export function RingkasanKepegawaian({ className, ...k }: KueriSdm & { className?: string }) {
  const r = useRingkasanSdm(k);
  const d = r.data;
  const muat = muatDari(r);
  const jenis = Object.fromEntries(peta(d?.per_jenis));
  const serdos = Object.fromEntries(peta(d?.dosen?.serdos));
  const tetap = n(serdos.sudah) + n(serdos.belum);
  const didik = Object.fromEntries(peta(d?.dosen?.per_pendidikan));
  const jk = Object.fromEntries(peta(d?.per_jenis_kelamin));
  return (
    <KartuRingkas q={[r]} className={className}>
      <StatCard label="Pegawai" icon={<Users />} loading={muat} value={formatNumber(n(d?.total))} tone="neutral" hint={`${formatNumber(n(jk.L))} laki-laki · ${formatNumber(n(jk.P))} perempuan`} />
      <StatCard label="Dosen" icon={<GraduationCap />} loading={muat} value={formatNumber(n(jenis.dosen))} hint={`${formatNumber(n(didik.S3))} bergelar doktor`} />
      <StatCard label="Tenaga kependidikan" icon={<Briefcase />} loading={muat} value={formatNumber(n(jenis.tendik))} tone="info" />
      <StatCard
        label="Dosen tetap bersertifikat"
        icon={<BadgeCheck />}
        loading={muat}
        value={tetap ? formatPersen((n(serdos.sudah) / tetap) * 100, 0) : '–'}
        hint={`${formatNumber(n(serdos.sudah))} dari ${formatNumber(tetap)} dosen tetap`}
        tone="success"
        footer={!muat && tetap ? <Progress value={(n(serdos.sudah) / tetap) * 100} size="sm" tone="success" /> : undefined}
      />
    </KartuRingkas>
  );
}

/** Jabatan akademik dosen, urut dari Guru Besar. */
export const JabatanAkademikDosen = buatWidget('JabatanAkademikDosen', useRingkasanSdm, { title: 'Jabatan akademik dosen', span: 2 }, (d, muat) => (
  <BarList
    loading={muat}
    items={peta(d?.dosen?.per_jabatan_akademik)
      .sort(urutMenurut(URUT_JAD))
      .map(([k, v]) => ({ label: k === 'belum_diisi' ? 'Belum punya jabatan' : k, value: v }))}
  />
));
/** Status kepegawaian (tetap, kontrak, honorer, …). */
export const StatusKepegawaian = buatWidget('StatusKepegawaian', useRingkasanSdm, { title: 'Status kepegawaian' }, (d, muat) => (
  <DonutChart
    loading={muat}
    size={128}
    centerLabel="pegawai"
    data={peta(d?.per_status_kepegawaian)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ label: judulKunci(k), value: v }))}
  />
));
/** Pendidikan tertinggi semua pegawai. */
export const PendidikanPegawai = buatWidget('PendidikanPegawai', useRingkasanSdm, { title: 'Pendidikan tertinggi', description: 'Semua pegawai' }, (d, muat) =>
  muat ? (
    <Progress value={null} />
  ) : (
    <SegmentBar
      data={peta(d?.per_pendidikan)
        .sort(urutMenurut(URUT_DIDIK))
        .map(([k, v]) => ({ label: judulKunci(k), value: v }))}
    />
  ),
);
/** Sebaran kelompok usia pegawai. */
export const UsiaPegawai = buatWidget('UsiaPegawai', useRingkasanSdm, { title: 'Kelompok usia' }, (d, muat) => (
  <BarChart
    loading={muat}
    height={140}
    data={peta(d?.per_kelompok_usia)
      .filter(([k]) => k !== 'belum_diisi')
      .sort(urutMenurut(URUT_USIA))
      .map(([k, v]) => ({ label: k, title: `Usia ${k}`, value: v }))}
  />
));
/** Tenaga kependidikan per jenis tugas. */
export const TendikPerJenis = buatWidget('TendikPerJenis', useRingkasanSdm, { title: 'Tenaga kependidikan per jenis' }, (d, muat) => (
  <BarList
    loading={muat}
    limit={6}
    items={peta(d?.tendik?.per_jenis_tendik)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ label: judulKunci(k), value: v }))}
  />
));
/** Pegawai per golongan. */
export const GolonganPegawai = buatWidget('GolonganPegawai', useRingkasanSdm, { title: 'Golongan', span: 'full' }, (d, muat) => (
  <BarChart
    loading={muat}
    height={140}
    data={peta(d?.per_golongan)
      .filter(([k]) => k !== 'belum_diisi')
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => ({ label: k, title: `Golongan ${k}`, value: v }))}
  />
));

/** Dasbor kepegawaian lengkap. */
export function DasborKepegawaian({ unitId, title = 'Dasbor kepegawaian', description, actions, className }: DasborBaseProps & KueriSdm) {
  const k = { unitId };
  const r = useRingkasanSdm(k);
  return (
    <KerangkaDasbor title={title} description={description ?? r.data?.catatan} actions={actions} error={r.error} onRetry={r.refetch} className={className}>
      <RingkasanKepegawaian {...k} />
      <DashboardGrid>
        <JabatanAkademikDosen {...k} />
        <StatusKepegawaian {...k} />
        <PendidikanPegawai {...k} />
        <UsiaPegawai {...k} />
        <TendikPerJenis {...k} />
        <GolonganPegawai {...k} />
      </DashboardGrid>
    </KerangkaDasbor>
  );
}

// ================================================================ SPMI
interface RekapCapaian {
  kunci: string;
  total: Angka;
  tercapai: Angka;
  melampaui: Angka;
  tidak_tercapai: Angka;
  belum: Angka;
  terisi: Angka;
  persen_terpenuhi: Angka;
  persen_terisi: Angka;
}
export interface DasborSpmiData {
  periode?: { id: number; nama?: string; tahun?: number | string } | null;
  ppepp: Record<'penetapan' | 'pelaksanaan' | 'evaluasi' | 'pengendalian' | 'peningkatan', { terpenuhi: boolean; bukti: Record<string, unknown> }>;
  capaian: RekapCapaian | null;
  capaian_per_bidang: RekapCapaian[];
  ami: Array<{ status: string; n: Angka }>;
  temuan: Partial<Record<'total' | 'terbuka' | 'kts_mayor' | 'kts_minor' | 'observasi' | 'terlambat' | 'ditutup', Angka>>;
  survei?: Array<{ status: string; n: Angka }>;
  risiko_tinggi_terbuka?: Angka;
  akreditasi?: Partial<Record<'kedaluwarsa' | 'segera_ajukan' | 'belum_ada_data' | 'aman', Angka>>;
  pelaporan?: { butir: Angka; dilaporkan: Angka; valid: Angka } | null;
}
export interface KueriSpmi {
  periodeId?: number;
  unitId?: number;
}
/** GET /v1/spmi/dasbor. */
export function useDasborSpmi({ periodeId, unitId }: KueriSpmi) {
  const q = { periode_id: periodeId, unit_id: unitId };
  return useSiakadQuery<DasborSpmiData>(['spmi-dasbor', q], (s, signal) => s.spmi.getDasbor(q, { signal }) as never, { staleTime: 120_000 });
}

/** API SPMI menjawab 404 ("Data tidak ditemukan") bila belum ada periode SPMI: keadaan kosong, bukan galat. */
const belumAdaPeriode = (e: unknown) => Number((e as { status?: number } | null)?.status) === 404;
function SpmiBelumAdaPeriode({ className }: { className?: string }) {
  return (
    <Empty
      icon={<ClipboardCheck />}
      title="Belum ada periode SPMI"
      description="Angka mutu tampil setelah unit penjaminan mutu membuka periode SPMI dan menetapkan standar."
      bordered
      className={className}
    />
  );
}

/** Kartu angka SPMI: indikator terpenuhi, capaian terisi, temuan terbuka, akreditasi. Belum ada periode: keadaan kosong. */
export function RingkasanSpmi({ className, ...k }: KueriSpmi & { className?: string }) {
  const r = useDasborSpmi(k);
  const d = r.data;
  if (belumAdaPeriode(r.error)) return <SpmiBelumAdaPeriode className={className} />;
  const muat = muatDari(r);
  const c = d?.capaian;
  const tm = d?.temuan ?? {};
  const ak = d?.akreditasi ?? {};
  return (
    <KartuRingkas q={[r]} className={className}>
      <StatCard
        label="Indikator terpenuhi"
        icon={<ClipboardCheck />}
        loading={muat}
        value={c?.persen_terpenuhi != null ? formatPersen(n(c.persen_terpenuhi), 0) : '–'}
        hint={`${formatNumber(n(c?.tercapai) + n(c?.melampaui))} tercapai/melampaui`}
        tone="success"
      />
      <StatCard
        label="Capaian terisi"
        icon={<FileText />}
        loading={muat}
        value={c?.persen_terisi != null ? formatPersen(n(c.persen_terisi), 0) : '–'}
        hint={`${formatNumber(n(c?.terisi))} dari ${formatNumber(n(c?.total))} indikator`}
        footer={!muat ? <Progress value={n(c?.persen_terisi)} size="sm" /> : undefined}
      />
      <StatCard
        label="Temuan terbuka"
        icon={<ShieldAlert />}
        loading={muat}
        value={formatNumber(n(tm.terbuka))}
        hint={`${formatNumber(n(tm.terlambat))} lewat batas waktu`}
        tone={n(tm.terlambat) > 0 ? 'danger' : n(tm.terbuka) > 0 ? 'warning' : 'neutral'}
      />
      <StatCard
        label="Akreditasi perlu diurus"
        icon={<BadgeCheck />}
        loading={muat}
        value={formatNumber(n(ak.kedaluwarsa) + n(ak.segera_ajukan))}
        hint={`${formatNumber(n(ak.kedaluwarsa))} kedaluwarsa · ${formatNumber(n(ak.aman))} aman`}
        tone={n(ak.kedaluwarsa) > 0 ? 'danger' : 'neutral'}
      />
    </KartuRingkas>
  );
}

/** Lima tahap PPEPP dengan bukti singkat. */
export const SiklusPpepp = buatWidget('SiklusPpepp', useDasborSpmi, { title: 'Siklus PPEPP', description: 'Penetapan, pelaksanaan, evaluasi, pengendalian, peningkatan', span: 'full' }, (d, muat) => {
  if (muat || !d?.ppepp) return <Progress value={null} />;
  const b = (key: keyof DasborSpmiData['ppepp'], f: string) => n(d.ppepp[key]?.bukti?.[f] as Angka);
  return (
    <CycleSteps
      steps={[
        { label: 'Penetapan', done: !!d.ppepp.penetapan?.terpenuhi, detail: `${b('penetapan', 'standar_berlaku')} standar berlaku` },
        { label: 'Pelaksanaan', done: !!d.ppepp.pelaksanaan?.terpenuhi, detail: `${formatPersen(b('pelaksanaan', 'capaian_terisi_persen'), 0)} capaian terisi` },
        { label: 'Evaluasi', done: !!d.ppepp.evaluasi?.terpenuhi, detail: `${b('evaluasi', 'auditee_ami_selesai')} auditee AMI selesai` },
        { label: 'Pengendalian', done: !!d.ppepp.pengendalian?.terpenuhi, detail: `${b('pengendalian', 'temuan_ditutup')} temuan ditutup` },
        { label: 'Peningkatan', done: !!d.ppepp.peningkatan?.terpenuhi, detail: `${b('peningkatan', 'keputusan_peningkatan_standar')} keputusan peningkatan` },
      ]}
    />
  );
});
/** Persen indikator terpenuhi per bidang standar. */
export const CapaianPerBidang = buatWidget(
  'CapaianPerBidang',
  useDasborSpmi,
  { title: 'Capaian per bidang', description: 'Persen indikator terpenuhi dari yang sudah dinilai', span: 2 },
  (d, muat) => (
    <BarList
      loading={muat}
      max={100}
      format={(v) => formatPersen(v, 0)}
      items={(d?.capaian_per_bidang ?? []).map((x) => ({
        label: judulKunci(String(x.kunci)),
        value: n(x.persen_terpenuhi),
        secondary: `${formatNumber(n(x.terisi))}/${formatNumber(n(x.total))} terisi`,
      }))}
    />
  ),
);
/** Melampaui, tercapai, tidak tercapai, belum dinilai. */
export const PemenuhanIndikator = buatWidget('PemenuhanIndikator', useDasborSpmi, { title: 'Pemenuhan indikator' }, (d, muat) => (
  <DonutChart
    loading={muat}
    size={128}
    centerLabel="indikator"
    data={[
      { label: 'Melampaui', value: n(d?.capaian?.melampaui) },
      { label: 'Tercapai', value: n(d?.capaian?.tercapai) },
      { label: 'Tidak tercapai', value: n(d?.capaian?.tidak_tercapai) },
      { label: 'Belum dinilai', value: n(d?.capaian?.belum) },
    ]}
  />
));
/** Temuan AMI per kategori dan yang sudah ditutup. */
export const TemuanAmi = buatWidget('TemuanAmi', useDasborSpmi, { title: 'Temuan audit' }, (d, muat) => {
  if (muat) return <Progress value={null} />;
  const tm = d?.temuan ?? {};
  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <SegmentBar
        data={[
          { label: 'KTS mayor', value: n(tm.kts_mayor) },
          { label: 'KTS minor', value: n(tm.kts_minor) },
          { label: 'Observasi', value: n(tm.observasi) },
        ]}
      />
      <Progress label="Temuan ditutup" value={n(tm.ditutup)} max={Math.max(1, n(tm.total))} tone="success" format={(v, m) => `${v} dari ${m}`} />
    </div>
  );
});
/** Antrean SPMI yang perlu ditangani. */
export const TindakanSpmi = buatWidget('TindakanSpmi', useDasborSpmi, { title: 'Perlu tindakan' }, (d, muat) => (
  <ActionList
    loading={muat}
    items={[
      { label: 'Temuan lewat batas waktu', count: n(d?.temuan?.terlambat), tone: 'danger', icon: <TriangleAlert /> },
      { label: 'Risiko tinggi terbuka', count: n(d?.risiko_tinggi_terbuka), tone: 'danger', icon: <ShieldAlert /> },
      { label: 'Akreditasi segera diajukan', count: n(d?.akreditasi?.segera_ajukan), icon: <BadgeCheck /> },
      { label: 'Unit belum punya data akreditasi', count: n(d?.akreditasi?.belum_ada_data), tone: 'info', icon: <FileText /> },
    ]}
  />
));
/** Butir pelaporan PDDikti: dilaporkan dan valid. */
export const PelaporanPddikti = buatWidget('PelaporanPddikti', useDasborSpmi, { title: 'Pelaporan PDDikti' }, (d, muat) => {
  const pl = d?.pelaporan;
  if (muat) return <Progress value={null} />;
  if (!pl || !n(pl.butir)) return <p className="u-chart-empty">Belum ada butir pelaporan periode ini.</p>;
  return (
    <div style={{ display: 'grid', gap: '0.875rem' }}>
      <Progress label="Dilaporkan" value={n(pl.dilaporkan)} max={n(pl.butir)} format={(v, m) => `${v}/${m}`} />
      <Progress label="Dinyatakan valid" value={n(pl.valid)} max={n(pl.butir)} tone="success" format={(v, m) => `${v}/${m}`} />
    </div>
  );
});

/** Dasbor SPMI lengkap. */
export function DasborSpmi({ periodeId, unitId, title = 'Penjaminan mutu internal', description, actions, className }: DasborBaseProps & KueriSpmi) {
  const k = { periodeId, unitId };
  const r = useDasborSpmi(k);
  const p = r.data?.periode;
  if (belumAdaPeriode(r.error))
    return (
      <KerangkaDasbor title={title} description={description} actions={actions} className={className}>
        <SpmiBelumAdaPeriode />
      </KerangkaDasbor>
    );
  return (
    <KerangkaDasbor title={title} description={description ?? (p ? `Periode ${p.nama ?? p.tahun}` : undefined)} actions={actions} error={r.error} onRetry={r.refetch} className={className}>
      <RingkasanSpmi {...k} />
      <DashboardGrid>
        <SiklusPpepp {...k} />
        <CapaianPerBidang {...k} />
        <PemenuhanIndikator {...k} />
        <TemuanAmi {...k} />
        <TindakanSpmi {...k} />
        <PelaporanPddikti {...k} />
      </DashboardGrid>
    </KerangkaDasbor>
  );
}

// ================================================================ LPPM
export interface RekapLppm {
  tahun?: string | null;
  kegiatan_per_status: Array<{ jenis: string; status: string; jumlah: Angka; dana_usulan?: Angka; dana_disetujui?: Angka }>;
  kegiatan_per_sumber_dana: Array<{ jenis: string; sumber_dana: string | null; jumlah: Angka; dana: Angka }>;
  kegiatan_per_skema: Array<{ kode?: string; nama: string; jenis: string; jumlah: Angka; didanai: Angka }>;
  luaran_per_jenis: Array<{ kategori?: string; kode?: string; nama: string; jumlah: Angka; terverifikasi: Angka }>;
  dosen_terlibat: Angka;
  mahasiswa_terlibat: Angka;
  tugas_pengelola?: Partial<Record<'usulan_menunggu_review' | 'usulan_menunggu_penetapan' | 'laporan_menunggu' | 'luaran_menunggu_verifikasi' | 'pencairan_diajukan', Angka>> | null;
}
export interface KueriLppm {
  tahun?: string | number;
  kodeProdi?: string;
}
/** GET /v1/lppm/rekap/dasbor. */
export function useRekapLppm({ tahun, kodeProdi }: KueriLppm) {
  const q = { tahun: tahun == null ? undefined : String(tahun), kode_prodi: kodeProdi };
  return useSiakadQuery<RekapLppm>(['lppm-rekap', q], (s, signal) => s.lppm.getRekapDasbor(q, { signal }) as never, { staleTime: 120_000 });
}
const JENIS_LPPM: Record<string, string> = { penelitian: 'Penelitian', pkm: 'PkM', pengabdian: 'PkM' };
const jumlahJenis = (d: RekapLppm | undefined, j: string) => (d?.kegiatan_per_status ?? []).filter((x) => (JENIS_LPPM[x.jenis] ?? x.jenis) === j).reduce((a, x) => a + n(x.jumlah), 0);

/** Kartu angka LPPM: penelitian, PkM, dana disetujui, dosen terlibat. */
export function RingkasanLppm({ className, ...k }: KueriLppm & { className?: string }) {
  const r = useRekapLppm(k);
  const d = r.data;
  const muat = muatDari(r);
  return (
    <KartuRingkas q={[r]} className={className}>
      <StatCard label="Penelitian" icon={<FlaskConical />} loading={muat} value={formatNumber(jumlahJenis(d, 'Penelitian'))} hint="kegiatan" />
      <StatCard label="Pengabdian (PkM)" icon={<Users />} loading={muat} value={formatNumber(jumlahJenis(d, 'PkM'))} hint="kegiatan" tone="info" />
      <StatCard label="Dana disetujui" icon={<Wallet />} loading={muat} value={formatRupiahRingkas((d?.kegiatan_per_status ?? []).reduce((a, x) => a + n(x.dana_disetujui), 0))} tone="success" />
      <StatCard
        label="Dosen terlibat"
        icon={<UserCheck />}
        loading={muat}
        value={formatNumber(n(d?.dosen_terlibat))}
        hint={`${formatNumber(n(d?.mahasiswa_terlibat))} mahasiswa terlibat`}
        tone="neutral"
      />
    </KartuRingkas>
  );
}

const TUGAS_LPPM: Array<[keyof NonNullable<RekapLppm['tugas_pengelola']>, string]> = [
  ['usulan_menunggu_review', 'Usulan menunggu review'],
  ['usulan_menunggu_penetapan', 'Usulan menunggu penetapan'],
  ['laporan_menunggu', 'Laporan menunggu diperiksa'],
  ['luaran_menunggu_verifikasi', 'Luaran menunggu verifikasi'],
  ['pencairan_diajukan', 'Pencairan dana diajukan'],
];
/** Antrean pengelola LPPM. Hanya berisi bila token milik pengelola. */
export const AntreanLppm = buatWidget(
  'AntreanLppm',
  (q: KueriLppm & { hrefTugas?: Partial<Record<string, string>> }) => useRekapLppm(q),
  { title: 'Perlu tindakan', description: 'Antrean pengelola LPPM' },
  (d, muat, q) =>
    !muat && !d?.tugas_pengelola ? (
      <p className="u-chart-empty">Antrean hanya tampil untuk pengelola LPPM.</p>
    ) : (
      <ActionList loading={muat} items={TUGAS_LPPM.map(([key, label]) => ({ key, label, count: n(d?.tugas_pengelola?.[key]), href: q.hrefTugas?.[key] }))} />
    ),
);
/** Kegiatan per status, dirinci penelitian/PkM. */
export const KegiatanLppmPerStatus = buatWidget('KegiatanLppmPerStatus', useRekapLppm, { title: 'Kegiatan per status', span: 2 }, (d, muat) => {
  const gab = new Map<string, Record<string, number>>();
  (d?.kegiatan_per_status ?? []).forEach((x) => {
    const m = gab.get(x.status) ?? {};
    const j = JENIS_LPPM[x.jenis] ?? x.jenis;
    m[j] = (m[j] ?? 0) + n(x.jumlah);
    gab.set(x.status, m);
  });
  return (
    <BarList
      loading={muat}
      items={[...gab]
        .map(([s, m]) => ({
          label: judulKunci(s),
          value: Object.values(m).reduce((a, b) => a + b, 0),
          secondary: Object.entries(m)
            .map(([j, v]) => `${v} ${j}`)
            .join(' · '),
        }))
        .sort((a, b) => b.value - a.value)}
    />
  );
});
/** Dana kegiatan per sumber pendanaan. */
export const DanaLppmPerSumber = buatWidget('DanaLppmPerSumber', useRekapLppm, { title: 'Dana per sumber' }, (d, muat) => {
  const sumber = new Map<string, number>();
  (d?.kegiatan_per_sumber_dana ?? []).forEach((x) => sumber.set(x.sumber_dana ?? 'belum_diisi', (sumber.get(x.sumber_dana ?? 'belum_diisi') ?? 0) + n(x.dana)));
  return (
    <DonutChart loading={muat} size={136} format={formatRupiahRingkas} centerLabel="total dana" data={[...sumber].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: judulKunci(k), value: v }))} />
  );
});
/** Usulan per skema hibah dan yang didanai. */
export const SkemaHibah = buatWidget('SkemaHibah', useRekapLppm, { title: 'Skema hibah', description: 'Jumlah usulan dan yang didanai', span: 2 }, (d, muat) => (
  <BarList
    loading={muat}
    limit={8}
    items={[...(d?.kegiatan_per_skema ?? [])].sort((a, b) => n(b.jumlah) - n(a.jumlah)).map((x) => ({ label: x.nama, value: n(x.jumlah), secondary: `${formatNumber(n(x.didanai))} didanai` }))}
  />
));
/** Luaran penelitian/PkM per jenis. */
export const LuaranLppm = buatWidget('LuaranLppm', useRekapLppm, { title: 'Luaran', description: 'Publikasi, HKI, dan luaran lain', span: 'full' }, (d, muat) => (
  <BarList
    loading={muat}
    limit={10}
    items={[...(d?.luaran_per_jenis ?? [])]
      .sort((a, b) => n(b.jumlah) - n(a.jumlah))
      .map((x) => ({ label: x.nama, value: n(x.jumlah), secondary: `${formatNumber(n(x.terverifikasi))} terverifikasi` }))}
  />
));

/** Dasbor LPPM lengkap. */
export function DasborLppm({
  tahun,
  kodeProdi,
  hrefTugas,
  title = 'Penelitian & pengabdian',
  description,
  actions,
  className,
}: DasborBaseProps & KueriLppm & { /** Tautan per antrean pengelola, mis. { usulan_menunggu_review: '/lppm/review' }. */ hrefTugas?: Partial<Record<string, string>> }) {
  const k = { tahun, kodeProdi };
  const r = useRekapLppm(k);
  const pengelola = !!r.data?.tugas_pengelola;
  return (
    <KerangkaDasbor title={title} description={description ?? (r.data?.tahun ? `Tahun ${r.data.tahun}` : 'Semua tahun')} actions={actions} error={r.error} onRetry={r.refetch} className={className}>
      <RingkasanLppm {...k} />
      <DashboardGrid>
        {pengelola && <AntreanLppm {...k} hrefTugas={hrefTugas} />}
        <DanaLppmPerSumber {...k} />
        <KegiatanLppmPerStatus {...k} span={pengelola ? 'full' : 2} />
        <SkemaHibah {...k} />
        <LuaranLppm {...k} />
      </DashboardGrid>
    </KerangkaDasbor>
  );
}

// ================================================================ Arsip
export interface LaporanArsip {
  tahun: number | string;
  surat_per_bulan: Array<{ bulan: number; masuk: Angka; keluar: Angka }>;
  surat_per_status: Array<{ arah: string; status: string; jumlah: Angka }>;
  surat_per_klasifikasi: Array<{ kode: string; nama: string; jumlah: Angka }>;
  disposisi?: Partial<Record<'total' | 'aktif' | 'lewat_batas' | 'selesai' | 'rata_jam_selesai', Angka>> | null;
  dokumen?: Partial<Record<'total' | 'kedaluwarsa' | 'akan_kedaluwarsa_90_hari', Angka>> | null;
  retensi_jatuh_tempo?: { pemindahan: Angka; pemusnahan_penyerahan: Angka };
  peminjaman_aktif?: Angka;
}
export interface KueriArsip {
  unitId?: number | string;
  tahun?: number | string;
  /** Sertakan unit turunan. */
  turunan?: boolean;
}
/** GET /v1/arsip/laporan/ringkasan. */
export function useLaporanArsip({ unitId, tahun, turunan }: KueriArsip) {
  const q = { unit_id: unitId == null ? undefined : String(unitId), tahun: tahun == null ? undefined : String(tahun), turunan: turunan ? '1' : undefined };
  return useSiakadQuery<LaporanArsip>(['arsip-ringkasan', q], (s, signal) => s.arsip.getLaporanRingkasan(q, { signal }) as never, { staleTime: 120_000 });
}

/** Kartu angka arsip: surat masuk/keluar, disposisi aktif, dokumen kedaluwarsa. */
export function RingkasanArsip({ className, ...k }: KueriArsip & { className?: string }) {
  const r = useLaporanArsip(k);
  const d = r.data;
  const muat = muatDari(r);
  const bln = d?.surat_per_bulan ?? [];
  const ds = d?.disposisi ?? {};
  const dk = d?.dokumen ?? {};
  return (
    <KartuRingkas q={[r]} className={className}>
      <StatCard label="Surat masuk" icon={<Mail />} loading={muat} value={formatNumber(bln.reduce((a, x) => a + n(x.masuk), 0))} trend={bln.map((x) => n(x.masuk))} />
      <StatCard label="Surat keluar" icon={<Send />} loading={muat} value={formatNumber(bln.reduce((a, x) => a + n(x.keluar), 0))} trend={bln.map((x) => n(x.keluar))} tone="info" />
      <StatCard
        label="Disposisi aktif"
        icon={<Inbox />}
        loading={muat}
        value={formatNumber(n(ds.aktif))}
        hint={ds.rata_jam_selesai != null ? `rata-rata selesai ${formatNumber(n(ds.rata_jam_selesai))} jam` : undefined}
        tone={n(ds.lewat_batas) > 0 ? 'warning' : 'neutral'}
      />
      <StatCard
        label="Dokumen kedaluwarsa"
        icon={<FileClock />}
        loading={muat}
        value={formatNumber(n(dk.kedaluwarsa))}
        hint={`${formatNumber(n(dk.akan_kedaluwarsa_90_hari))} lagi dalam 90 hari`}
        tone={n(dk.kedaluwarsa) > 0 ? 'danger' : 'neutral'}
      />
    </KartuRingkas>
  );
}
/** Surat masuk vs keluar per bulan. */
export const SuratPerBulan = buatWidget('SuratPerBulan', useLaporanArsip, { title: 'Surat per bulan', span: 2 }, (d, muat) => {
  const bln = d?.surat_per_bulan ?? [];
  return (
    <GroupedBarChart
      loading={muat}
      labels={bln.map((x) => BULAN[x.bulan - 1] ?? String(x.bulan))}
      series={[
        { label: 'Masuk', values: bln.map((x) => n(x.masuk)) },
        { label: 'Keluar', values: bln.map((x) => n(x.keluar)) },
      ]}
    />
  );
});
/** Disposisi lewat batas, retensi jatuh tempo, peminjaman. */
export const TindakanArsip = buatWidget('TindakanArsip', useLaporanArsip, { title: 'Perlu tindakan' }, (d, muat) => (
  <ActionList
    loading={muat}
    items={[
      { label: 'Disposisi lewat batas waktu', count: n(d?.disposisi?.lewat_batas), tone: 'danger', icon: <TriangleAlert /> },
      { label: 'Jatuh tempo pindah ke inaktif', count: n(d?.retensi_jatuh_tempo?.pemindahan), icon: <Archive /> },
      { label: 'Jatuh tempo musnah/serah', count: n(d?.retensi_jatuh_tempo?.pemusnahan_penyerahan), icon: <Archive /> },
      { label: 'Peminjaman arsip aktif', count: n(d?.peminjaman_aktif), tone: 'info', icon: <BookOpenCheck /> },
    ]}
  />
));
/** Klasifikasi surat terbanyak tahun ini. */
export const KlasifikasiSurat = buatWidget('KlasifikasiSurat', useLaporanArsip, { title: 'Klasifikasi terbanyak', span: 2 }, (d, muat) => (
  <BarList loading={muat} limit={8} items={(d?.surat_per_klasifikasi ?? []).map((x) => ({ label: x.nama, value: n(x.jumlah), secondary: x.kode }))} />
));
/** Surat per status (masuk dan keluar digabung). */
export const StatusSurat = buatWidget('StatusSurat', useLaporanArsip, { title: 'Status surat' }, (d, muat) => {
  const m = new Map<string, number>();
  (d?.surat_per_status ?? []).forEach((x) => m.set(x.status, (m.get(x.status) ?? 0) + n(x.jumlah)));
  return <DonutChart loading={muat} size={128} centerLabel="surat" data={[...m].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: judulKunci(k), value: v }))} />;
});

/** Dasbor arsip lengkap. */
export function DasborArsip({ unitId, tahun, turunan, title = 'Arsip & persuratan', description, actions, className }: DasborBaseProps & KueriArsip) {
  const k = { unitId, tahun, turunan };
  const r = useLaporanArsip(k);
  return (
    <KerangkaDasbor title={title} description={description ?? (r.data ? `Tahun ${r.data.tahun}` : undefined)} actions={actions} error={r.error} onRetry={r.refetch} className={className}>
      <RingkasanArsip {...k} />
      <DashboardGrid>
        <SuratPerBulan {...k} />
        <TindakanArsip {...k} />
        <KlasifikasiSurat {...k} />
        <StatusSurat {...k} />
      </DashboardGrid>
    </KerangkaDasbor>
  );
}

// ================================================================ Humas
interface KontenRingkas {
  jenis: string;
  id: number;
  judul: string;
  situs?: string | null;
  updated_at?: string;
  terbit_pada?: string;
  tayang?: number;
  aksi?: string;
  username?: string;
  waktu?: string;
}
export interface DataHumas {
  jumlah: Record<string, Partial<Record<'draf' | 'review' | 'terbit' | 'arsip', Angka>>>;
  terjadwal: Angka;
  pesan_baru: Angka;
  antrean_review: KontenRingkas[];
  terjadwal_daftar: KontenRingkas[];
  tayang_harian: Array<{ tanggal: string; tayang: Angka }>;
  tayang_total: Angka;
  populer: KontenRingkas[];
  aktivitas: KontenRingkas[];
  topik?: Array<{ kode: string; nama: string; warna?: string | null; jumlah: Angka }>;
}
export interface KueriHumas {
  situs?: string;
  /** Rentang tayangan (7–90 hari). Bawaan 30. */
  hari?: number;
  /** Tautan ke editor konten. */
  hrefKonten?: (k: { jenis: string; id: number }) => string;
}
/** GET /v1/humas/ringkasan. */
export function useRingkasanHumas({ situs, hari = 30 }: KueriHumas) {
  const q = { situs, hari: String(hari) };
  return useSiakadQuery<DataHumas>(['humas-ringkasan', q], (s, signal) => s.humas.getRingkasan(q, { signal }) as never, { staleTime: 60_000 });
}
const AKSI_HUMAS: Record<string, string> = { buat: 'membuat', ubah: 'mengubah', terbit: 'menerbitkan', review: 'mengajukan review', arsip: 'mengarsipkan', hapus: 'menghapus', pulihkan: 'memulihkan' };
const totalHumas = (d: DataHumas | undefined, key: 'draf' | 'review' | 'terbit') => Object.values(d?.jumlah ?? {}).reduce((a, x) => a + n(x[key]), 0);

/** Kartu angka redaksi: tayangan, terbit, review, terjadwal, pesan baru. */
export function RingkasanHumas({ className, ...k }: KueriHumas & { className?: string }) {
  const r = useRingkasanHumas(k);
  const d = r.data;
  const muat = muatDari(r);
  const hari = k.hari ?? 30;
  return (
    <KartuRingkas q={[r]} min={180} className={className}>
      <StatCard label="Tayangan" icon={<Newspaper />} loading={muat} value={formatNumber(n(d?.tayang_total))} hint={`${hari} hari terakhir`} trend={(d?.tayang_harian ?? []).map((x) => n(x.tayang))} />
      <StatCard label="Konten terbit" icon={<BadgeCheck />} loading={muat} value={formatNumber(totalHumas(d, 'terbit'))} tone="success" />
      <StatCard
        label="Menunggu review"
        icon={<ClipboardCheck />}
        loading={muat}
        value={formatNumber(totalHumas(d, 'review'))}
        tone={totalHumas(d, 'review') > 0 ? 'warning' : 'neutral'}
        hint={`${formatNumber(totalHumas(d, 'draf'))} draf`}
      />
      <StatCard label="Terjadwal" icon={<CalendarClock />} loading={muat} value={formatNumber(n(d?.terjadwal))} tone="info" />
      <StatCard label="Pesan baru" icon={<MessageSquare />} loading={muat} value={formatNumber(n(d?.pesan_baru))} tone={n(d?.pesan_baru) > 0 ? 'warning' : 'neutral'} />
    </KartuRingkas>
  );
}
/** Tayangan portal per hari. */
export const TayanganHarian = buatWidget('TayanganHarian', useRingkasanHumas, { title: 'Tayangan harian', span: 2 }, (d, muat) => {
  const seri = d?.tayang_harian ?? [];
  return (
    <LineChart
      loading={muat}
      labels={seri.map((x) => tglPendek(x.tanggal))}
      titles={seri.map((x) => formatDate(x.tanggal, 'long'))}
      series={[{ label: 'Tayangan', values: seri.map((x) => n(x.tayang)) }]}
    />
  );
});
/** Konten paling banyak dibaca dalam rentang hari. */
export const KontenTerpopuler = buatWidget('KontenTerpopuler', useRingkasanHumas, { title: 'Terpopuler' }, (d, muat, q) => (
  <BarList loading={muat} limit={6} items={(d?.populer ?? []).map((k) => ({ label: k.judul, value: n(k.tayang), secondary: judulKunci(k.jenis), href: q.hrefKonten?.(k) }))} />
));
/** Konten yang menunggu review redaktur. */
export const AntreanReview = buatWidget('AntreanReview', useRingkasanHumas, { title: 'Antrean review' }, (d, muat, q) => (
  <ActivityFeed
    loading={muat}
    empty="Tidak ada konten yang menunggu review."
    items={(d?.antrean_review ?? [])
      .slice(0, 6)
      .map((k) => ({
        id: `${k.jenis}-${k.id}`,
        title: k.judul,
        href: q.hrefKonten?.(k),
        icon: <ClipboardCheck />,
        meta: [judulKunci(k.jenis), k.situs].filter(Boolean).join(' · '),
        time: k.updated_at ? formatRelative(k.updated_at) : undefined,
      }))}
  />
));
/** Konten terjadwal terbit. */
export const JadwalTerbit = buatWidget('JadwalTerbit', useRingkasanHumas, { title: 'Jadwal terbit' }, (d, muat, q) => (
  <ActivityFeed
    loading={muat}
    empty="Belum ada konten terjadwal."
    items={(d?.terjadwal_daftar ?? [])
      .slice(0, 6)
      .map((k) => ({
        id: `${k.jenis}-${k.id}`,
        title: k.judul,
        href: q.hrefKonten?.(k),
        icon: <CalendarClock />,
        meta: judulKunci(k.jenis),
        time: k.terbit_pada ? formatDate(k.terbit_pada, 'medium') : undefined,
      }))}
  />
));
/** Riwayat perubahan konten terbaru. */
export const AktivitasRedaksi = buatWidget('AktivitasRedaksi', useRingkasanHumas, { title: 'Aktivitas terbaru' }, (d, muat, q) => (
  <ActivityFeed
    loading={muat}
    items={(d?.aktivitas ?? [])
      .slice(0, 6)
      .map((k, i) => ({
        id: `${k.jenis}-${k.id}-${i}`,
        title: k.judul,
        href: q.hrefKonten?.(k),
        meta: `${k.username ?? 'Seseorang'} ${AKSI_HUMAS[k.aksi ?? ''] ?? k.aksi ?? ''}`,
        time: k.waktu ? formatRelative(k.waktu) : undefined,
      }))}
  />
));

/** Dasbor ruang redaksi lengkap. */
export function DasborHumas({ situs, hari = 30, hrefKonten, title = 'Ruang redaksi', description, actions, className }: DasborBaseProps & KueriHumas) {
  const k = { situs, hari, hrefKonten };
  const r = useRingkasanHumas(k);
  return (
    <KerangkaDasbor title={title} description={description ?? `Tayangan ${hari} hari terakhir`} actions={actions} error={r.error} onRetry={r.refetch} className={className}>
      <RingkasanHumas {...k} />
      <DashboardGrid>
        <TayanganHarian {...k} />
        <KontenTerpopuler {...k} />
        <AntreanReview {...k} />
        <JadwalTerbit {...k} />
        <AktivitasRedaksi {...k} />
      </DashboardGrid>
    </KerangkaDasbor>
  );
}

// ================================================================ PMB
export interface StatistikPmb {
  akun_terdaftar: Angka;
  corong: Partial<Record<'pendaftaran' | 'draf' | 'diajukan' | 'perlu_perbaikan' | 'terverifikasi' | 'ditolak' | 'mengundurkan_diri' | 'bayar_formulir' | 'lulus' | 'daftar_ulang', Angka>>;
  per_prodi: Array<{ kode_prodi: string; nama_prodi: string | null; peminat: Angka; pilihan_pertama: Angka; lulus?: Angka; daftar_ulang?: Angka }>;
  per_sumber_informasi: Array<{ sumber: string; jumlah: Angka; diajukan?: Angka }>;
  per_referal?: Array<{ kode: string; nama: string; jenis?: string; jumlah: Angka; diajukan?: Angka }>;
  harian_30_hari: Array<{ tanggal: string; akun_mulai: Angka; diajukan: Angka }>;
}
export interface KueriPmb {
  gelombangId?: number | string;
}
/** GET /v1/pmb/admin/statistik. */
export function useStatistikPmb({ gelombangId }: KueriPmb) {
  const q = { gelombang_id: gelombangId == null ? undefined : String(gelombangId) };
  return useSiakadQuery<StatistikPmb>(['pmb-statistik', q], (s, signal) => s.pmb.getAdminStatistik(q, { signal }) as never, { staleTime: 60_000 });
}

/** Kartu angka PMB: akun, formulir diajukan (7 hari vs 7 hari sebelumnya), perlu perbaikan, lulus, daftar ulang. */
export function RingkasanPmb({ className, ...k }: KueriPmb & { className?: string }) {
  const r = useStatistikPmb(k);
  const d = r.data;
  const muat = muatDari(r);
  const c = d?.corong ?? {};
  const h = d?.harian_30_hari ?? [];
  const tujuh = (key: 'akun_mulai' | 'diajukan', dari: number) => h.slice(Math.max(0, h.length - dari - 7), h.length - dari).reduce((a, x) => a + n(x[key]), 0);
  return (
    <KartuRingkas q={[r]} min={180} className={className}>
      <StatCard
        label="Akun terdaftar"
        icon={<UserPlus />}
        loading={muat}
        value={formatNumber(n(d?.akun_terdaftar))}
        trend={h.map((x) => n(x.akun_mulai))}
        delta={ubah(tujuh('akun_mulai', 0), tujuh('akun_mulai', 7))}
        deltaLabel="7 hari terakhir"
      />
      <StatCard
        label="Formulir diajukan"
        icon={<Send />}
        loading={muat}
        value={formatNumber(n(c.diajukan))}
        trend={h.map((x) => n(x.diajukan))}
        delta={ubah(tujuh('diajukan', 0), tujuh('diajukan', 7))}
        deltaLabel="7 hari terakhir"
        tone="info"
      />
      <StatCard
        label="Perlu perbaikan"
        icon={<TriangleAlert />}
        loading={muat}
        value={formatNumber(n(c.perlu_perbaikan))}
        tone={n(c.perlu_perbaikan) > 0 ? 'warning' : 'neutral'}
        hint="menunggu pendaftar"
      />
      <StatCard
        label="Lulus seleksi"
        icon={<BadgeCheck />}
        loading={muat}
        value={formatNumber(n(c.lulus))}
        tone="success"
        hint={n(c.terverifikasi) ? `dari ${formatNumber(n(c.terverifikasi))} terverifikasi` : undefined}
      />
      <StatCard
        label="Daftar ulang"
        icon={<GraduationCap />}
        loading={muat}
        value={formatNumber(n(c.daftar_ulang))}
        hint={n(c.lulus) ? `${formatPersen((n(c.daftar_ulang) / n(c.lulus)) * 100, 0)} dari yang lulus` : undefined}
        tone="success"
      />
    </KartuRingkas>
  );
}
/** Corong akun → diajukan → terverifikasi → lulus → daftar ulang. */
export const CorongPmb = buatWidget('CorongPmb', useStatistikPmb, { title: 'Corong pendaftaran', description: 'Persentase konversi dari tahap sebelumnya' }, (d, muat) => (
  <Funnel
    loading={muat}
    stages={[
      { label: 'Akun dibuat', value: n(d?.akun_terdaftar) },
      { label: 'Formulir diajukan', value: n(d?.corong.diajukan) },
      { label: 'Terverifikasi', value: n(d?.corong.terverifikasi) },
      { label: 'Lulus seleksi', value: n(d?.corong.lulus) },
      { label: 'Daftar ulang', value: n(d?.corong.daftar_ulang) },
    ]}
  />
));
/** Akun baru dan formulir diajukan per hari (30 hari). */
export const PendaftarHarianPmb = buatWidget('PendaftarHarianPmb', useStatistikPmb, { title: 'Pendaftar harian', description: '30 hari terakhir', span: 2 }, (d, muat) => {
  const h = d?.harian_30_hari ?? [];
  return (
    <LineChart
      loading={muat}
      labels={h.map((x) => tglPendek(x.tanggal))}
      titles={h.map((x) => formatDate(x.tanggal, 'long'))}
      series={[
        { label: 'Akun baru', values: h.map((x) => n(x.akun_mulai)) },
        { label: 'Formulir diajukan', values: h.map((x) => n(x.diajukan)) },
      ]}
    />
  );
});
/** Peminat per prodi dan pilihan pertama. */
export const PeminatPerProdi = buatWidget('PeminatPerProdi', useStatistikPmb, { title: 'Peminat per prodi', description: 'Semua pilihan; pilihan pertama di kanan', span: 2 }, (d, muat) => (
  <BarList
    loading={muat}
    limit={10}
    items={[...(d?.per_prodi ?? [])]
      .sort((a, b) => n(b.peminat) - n(a.peminat))
      .map((p) => ({ label: <LabelProdi kode={p.kode_prodi} nama={p.nama_prodi} sub={false} />, value: n(p.peminat), secondary: `${formatNumber(n(p.pilihan_pertama))} pilihan 1` }))}
  />
));
/** Dari mana pendaftar mengenal UNIPO. */
export const SumberInformasiPmb = buatWidget('SumberInformasiPmb', useStatistikPmb, { title: 'Sumber informasi' }, (d, muat) => (
  <DonutChart
    loading={muat}
    size={128}
    centerLabel="pendaftar"
    data={[...(d?.per_sumber_informasi ?? [])].sort((a, b) => n(b.jumlah) - n(a.jumlah)).map((x) => ({ label: x.sumber, value: n(x.jumlah) }))}
  />
));
/** Kode referal teratas (sekolah, alumni, mitra). */
export const ReferalPmb = buatWidget('ReferalPmb', useStatistikPmb, { title: 'Referal teratas', span: 'full' }, (d, muat) => (
  <BarList
    loading={muat}
    limit={8}
    empty="Belum ada pendaftar lewat referal."
    items={[...(d?.per_referal ?? [])].sort((a, b) => n(b.jumlah) - n(a.jumlah)).map((x) => ({ label: x.nama, value: n(x.jumlah), secondary: `${x.kode} · ${formatNumber(n(x.diajukan))} diajukan` }))}
  />
));

export type WidgetDasborPmb = 'harian' | 'corong' | 'peminat' | 'sumber' | 'referal';
export interface DasborPmbProps extends DasborBaseProps, KueriPmb {
  /** Isi di atas kartu ringkasan, mis. kartu antrean kerja panitia. */
  atas?: React.ReactNode;
  /** Widget tambahan di ujung DashboardGrid (beri `span` lewat Panel). */
  children?: React.ReactNode;
  /**
   * Lebar tiap widget di grid. Bawaan menyusun baris penuh tanpa celah (3 kolom): harian 2 + corong 1,
   * peminat 2 + sumber 1, referal penuh.
   */
  lebar?: Partial<Record<WidgetDasborPmb, WidgetProps['span']>>;
  /** Sembunyikan widget tertentu, mis. { referal: false }. Referal juga disembunyikan otomatis bila kosong. */
  widget?: Partial<Record<WidgetDasborPmb, boolean>>;
}

/** Dasbor panitia PMB lengkap. */
export function DasborPmb({ gelombangId, title = 'Penerimaan mahasiswa baru', description, actions, atas, children, lebar = {}, widget = {}, className }: DasborPmbProps) {
  const k = { gelombangId };
  const r = useStatistikPmb(k);
  const w = (x: WidgetDasborPmb) => widget[x] !== false;
  return (
    <KerangkaDasbor title={title} description={description} actions={actions} error={r.error} onRetry={r.refetch} atas={atas} className={className}>
      <RingkasanPmb {...k} />
      <DashboardGrid>
        {w('harian') && <PendaftarHarianPmb {...k} span={lebar.harian ?? 2} />}
        {w('corong') && <CorongPmb {...k} span={lebar.corong ?? 1} />}
        {w('peminat') && <PeminatPerProdi {...k} span={lebar.peminat ?? 2} />}
        {w('sumber') && <SumberInformasiPmb {...k} span={lebar.sumber ?? 1} />}
        {w('referal') && !!r.data?.per_referal?.length && <ReferalPmb {...k} span={lebar.referal ?? 'full'} />}
        {children}
      </DashboardGrid>
    </KerangkaDasbor>
  );
}

// ================================================================ Tracer study
export interface StatistikTracer {
  alumni: Angka;
  terlacak: Angka;
  persen_terlacak: Angka;
  per_status: Array<{ status: string | null; label: string; jumlah: Angka }>;
  per_tahun_lulus: Array<{ tahun: number; jumlah: Angka; terlacak: Angka }>;
  per_prodi: Array<{ kode_prodi: string; nama_prodi: string | null; jumlah: Angka; terlacak: Angka; bekerja_wirausaha_studi: Angka }>;
  instansi_teratas: Array<{ instansi: string; jumlah: Angka }>;
  lowongan_aktif?: Angka;
}
export interface KueriTracer {
  /** Kode prodi. */
  prodi?: string;
}
/** GET /v1/tracer/statistik. */
export function useStatistikTracer({ prodi }: KueriTracer) {
  const q = { prodi };
  return useSiakadQuery<StatistikTracer>(['tracer-statistik', q], (s, signal) => s.tracer.getStatistik(q, { signal }) as never, { staleTime: 300_000 });
}
const positifTracer = (d?: StatistikTracer) => (d?.per_status ?? []).filter((x) => x.status != null && ['1', '3', '4'].includes(String(x.status))).reduce((a, x) => a + n(x.jumlah), 0);

/** Kartu angka tracer: alumni, terlacak, bekerja/wirausaha/studi, lowongan. */
export function RingkasanTracer({ className, ...k }: KueriTracer & { className?: string }) {
  const r = useStatistikTracer(k);
  const d = r.data;
  const muat = muatDari(r);
  const terlacak = n(d?.terlacak);
  const positif = positifTracer(d);
  return (
    <KartuRingkas q={[r]} className={className}>
      <StatCard label="Alumni" icon={<GraduationCap />} loading={muat} value={formatNumber(n(d?.alumni))} tone="neutral" />
      <StatCard
        label="Terlacak"
        icon={<UserCheck />}
        loading={muat}
        value={formatPersen(n(d?.persen_terlacak), 0)}
        hint={`${formatNumber(terlacak)} alumni mengisi`}
        footer={!muat ? <Progress value={n(d?.persen_terlacak)} size="sm" /> : undefined}
      />
      <StatCard
        label="Bekerja, wirausaha, atau studi"
        icon={<Briefcase />}
        loading={muat}
        value={terlacak ? formatPersen((positif / terlacak) * 100, 0) : '–'}
        hint={`${formatNumber(positif)} dari yang terlacak`}
        tone="success"
      />
      <StatCard label="Lowongan aktif" icon={<Inbox />} loading={muat} value={formatNumber(n(d?.lowongan_aktif))} tone="info" />
    </KartuRingkas>
  );
}
/** Status alumni terlacak (bekerja, wiraswasta, studi, mencari kerja, …). */
export const StatusAlumni = buatWidget('StatusAlumni', useStatistikTracer, { title: 'Status alumni terlacak' }, (d, muat) => (
  <DonutChart loading={muat} size={128} centerLabel="terlacak" data={(d?.per_status ?? []).filter((x) => x.status != null).map((x) => ({ label: x.label, value: n(x.jumlah) }))} />
));
/** Alumni dan yang terlacak per tahun lulus. */
export const AlumniPerTahunLulus = buatWidget('AlumniPerTahunLulus', useStatistikTracer, { title: 'Per tahun lulus', description: 'Jumlah alumni dan yang terlacak', span: 2 }, (d, muat) => {
  const thn = [...(d?.per_tahun_lulus ?? [])].sort((a, b) => a.tahun - b.tahun).slice(-8);
  return (
    <GroupedBarChart
      loading={muat}
      labels={thn.map((x) => String(x.tahun))}
      series={[
        { label: 'Alumni', values: thn.map((x) => n(x.jumlah)) },
        { label: 'Terlacak', values: thn.map((x) => n(x.terlacak)), color: 'var(--u-chart-3)' },
      ]}
    />
  );
});
/** Persen alumni terlacak per prodi. */
export const KeterlacakanPerProdi = buatWidget('KeterlacakanPerProdi', useStatistikTracer, { title: 'Keterlacakan per prodi', span: 2 }, (d, muat) => (
  <BarList
    loading={muat}
    max={100}
    format={(v) => formatPersen(v, 0)}
    items={(d?.per_prodi ?? [])
      .map((p) => ({ label: <LabelProdi kode={p.kode_prodi} nama={p.nama_prodi} sub={false} />, value: n(p.jumlah) ? (n(p.terlacak) / n(p.jumlah)) * 100 : 0, secondary: `${formatNumber(n(p.terlacak))}/${formatNumber(n(p.jumlah))}` }))
      .sort((a, b) => b.value - a.value)}
  />
));
/** Instansi tempat alumni paling banyak bekerja. */
export const InstansiAlumni = buatWidget('InstansiAlumni', useStatistikTracer, { title: 'Instansi teratas' }, (d, muat) => (
  <BarList loading={muat} limit={8} items={(d?.instansi_teratas ?? []).map((x) => ({ label: x.instansi, value: n(x.jumlah) }))} />
));

/** Dasbor tracer study lengkap. */
export function DasborTracer({ prodi, title = 'Tracer study alumni', description, actions, className }: DasborBaseProps & KueriTracer) {
  const k = { prodi };
  const r = useStatistikTracer(k);
  return (
    <KerangkaDasbor title={title} description={description} actions={actions} error={r.error} onRetry={r.refetch} className={className}>
      <RingkasanTracer {...k} />
      <DashboardGrid>
        <StatusAlumni {...k} />
        <AlumniPerTahunLulus {...k} />
        <KeterlacakanPerProdi {...k} />
        <InstansiAlumni {...k} />
      </DashboardGrid>
    </KerangkaDasbor>
  );
}
