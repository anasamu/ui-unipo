'use client';
import * as React from 'react';
import {
  ArrowRight,
  BellRing,
  CalendarRange,
  Check,
  CheckCheck,
  ClipboardCheck,
  Download,
  FileText,
  Inbox,
  PenLine,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { formatDate, formatNumber } from '../lib/format';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Card, CardContent, CardHeader, Empty, Progress, ProgressRing, Tabs } from '../components/display';
import { Checkbox, Field, Input, SegmentedControl, Switch, Textarea } from '../components/forms';
import { GridForm, IsianTanggal, PanelForm, Pilihan, PilihanBanyak } from '../components/formulir';
import { ConfirmDialog, Sheet, useToast } from '../components/overlays';
import { DataTable, type DataColumn } from '../components/data-table';
import { StatCard, StatGrid } from '../components/charts';
import { Cluster, PageHeader, Stack, Text } from '../components/tata-letak';
import { GalatApi } from './galat';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { AturanVerifikasiData } from './aturan-verifikasi';

// ================================================================ Tipe /v1/profil/pemutakhiran/{pemilik}

export type PemilikPemutakhiran = 'sdm' | 'baak' | 'bauk';
export type ModeIsianPemutakhiran = 'langsung' | 'verifikasi';

export interface IsianKatalogPemutakhiran {
  kode: string;
  label: string;
  /** Aturan bawaan yang berlaku (bawaan kode atau aturan verifikasi unit, lihat AturanVerifikasiData). */
  bawaan: 'langsung' | 'verifikasi' | 'ajukan' | 'baca';
  bukti: boolean;
  rahasia: boolean;
  peran: string[] | null;
  wajib: boolean;
  pemeriksa?: 'pusat' | 'unit';
}
export interface BagianKatalogPemutakhiran {
  sasaran: 'pegawai' | 'mahasiswa';
  kode: string;
  label: string;
  keterangan: string;
  isian: IsianKatalogPemutakhiran[];
}
export interface KatalogPemutakhiran {
  pemilik: PemilikPemutakhiran;
  pemilik_label: string;
  peran: string[];
  bagian: BagianKatalogPemutakhiran[];
  hak: { kelola: boolean; verifikasi: boolean; global: boolean; lingkup: { fakultas: string[]; prodi: string[] } | null };
  referensi: { fakultas: Array<{ kode: string; nama: string }>; prodi: Array<{ kode: string; nama: string; fakultas: string }>; unit: Array<{ id: number; nama: string; jenis: string }> };
}
export interface RingkasPemutakhiran {
  total: number;
  sudah: number;
  belum: number;
  persen: number;
  menunggu: number;
}
export interface PeriodePemutakhiran {
  id: number;
  uuid: string;
  pemilik: PemilikPemutakhiran;
  judul: string;
  keterangan: string | null;
  aktif: boolean;
  berjalan?: boolean;
  mulai: string | null;
  selesai: string | null;
  peran: string[];
  cakupan: { fakultas: string[]; prodi: string[]; unit: number[]; angkatan: number[] };
  isian: Record<string, { mode: ModeIsianPemutakhiran; bukti: boolean }>;
  ringkas?: RingkasPemutakhiran;
  updated_at?: string;
}
export interface ProgresPemutakhiran {
  username: string;
  nama: string;
  peran: string;
  kode_prodi: string | null;
  unit: string | null;
  status: 'sudah' | 'belum';
  terakhir: string | null;
  perubahan: number;
  menunggu: number;
}
export interface IsianPengajuanPemutakhiran {
  id: number;
  kode: string;
  label: string;
  rahasia?: boolean;
  wajib_bukti?: boolean;
  sebelum: string | null;
  sesudah: string | null;
  status: 'diajukan' | 'diterima' | 'ditolak' | 'dibatalkan';
  alasan_tolak?: string | null;
  diputus_oleh?: string | null;
  diputus_at?: string | null;
  bukti?: Array<{ uuid: string; nama: string; mime: string | null; ukuran: number | null }>;
}
export interface PengajuanPemutakhiran {
  id: number;
  uuid: string;
  username: string;
  nama: string | null;
  peran: string;
  pemilik: PemilikPemutakhiran;
  pemilik_label: string;
  bagian: string;
  bagian_label: string;
  pengaturan_id: number | null;
  kode_prodi: string | null;
  kode_fakultas: string | null;
  angkatan: number | null;
  status: 'diajukan' | 'sebagian' | 'diterima' | 'ditolak' | 'dibatalkan';
  status_label: string;
  alasan: string | null;
  jumlah_isian: number;
  diputus_oleh: string | null;
  diputus_at: string | null;
  created_at: string;
  isian: IsianPengajuanPemutakhiran[];
}

export const STATUS_PENGAJUAN_PEMUTAKHIRAN: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'danger' | 'neutral' }> = {
  diajukan: { label: 'Menunggu verifikasi', variant: 'warning' },
  sebagian: { label: 'Diputus sebagian', variant: 'info' },
  diterima: { label: 'Diterima', variant: 'success' },
  ditolak: { label: 'Ditolak', variant: 'danger' },
  dibatalkan: { label: 'Dibatalkan', variant: 'neutral' },
};
const STATUS_ISIAN: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' | 'neutral' }> = {
  diajukan: { label: 'Menunggu', variant: 'warning' },
  diterima: { label: 'Diterima', variant: 'success' },
  ditolak: { label: 'Ditolak', variant: 'danger' },
  dibatalkan: { label: 'Dibatalkan', variant: 'neutral' },
};
const PERAN_LABEL: Record<string, string> = { dosen: 'Dosen', tendik: 'Tendik', mahasiswa: 'Mahasiswa' };
const BAWAAN_LABEL: Record<string, string> = { langsung: 'langsung', verifikasi: 'diverifikasi', ajukan: 'pengajuan', baca: 'hanya baca' };
const P = (pemilik: string) => `/v1/profil/pemutakhiran/${pemilik}`;

/** Status periode untuk lencana. */
export function statusPeriodePemutakhiran(p: Pick<PeriodePemutakhiran, 'aktif' | 'mulai' | 'selesai'>): { label: string; variant: 'success' | 'info' | 'neutral' | 'warning' } {
  const hari = new Date().toISOString().slice(0, 10);
  if (!p.aktif) return { label: 'Nonaktif', variant: 'neutral' };
  if (p.mulai && p.mulai > hari) return { label: 'Terjadwal', variant: 'info' };
  if (p.selesai && p.selesai < hari) return { label: 'Berakhir', variant: 'warning' };
  return { label: 'Berjalan', variant: 'success' };
}

function masa(p: Pick<PeriodePemutakhiran, 'mulai' | 'selesai'>): string {
  if (!p.mulai && !p.selesai) return 'Tanpa batas waktu';
  return `${p.mulai ? formatDate(p.mulai, 'medium') : 'sekarang'} – ${p.selesai ? formatDate(p.selesai, 'medium') : 'seterusnya'}`;
}

function useKatalog(pemilik: PemilikPemutakhiran) {
  return useSiakadQuery<KatalogPemutakhiran>(['pemutakhiran', pemilik, 'katalog'], (s, signal) => s.request<KatalogPemutakhiran>({ method: 'GET', path: `${P(pemilik)}/katalog` }, { signal }), { staleTime: 300_000 });
}

function ringkasCakupan(p: PeriodePemutakhiran, k?: KatalogPemutakhiran): string {
  const c = p.cakupan;
  const bagian: string[] = [];
  const nama = (daftar: Array<{ kode: string; nama: string }> | undefined, kode: string) => daftar?.find((x) => x.kode === kode)?.nama ?? kode;
  if (c.fakultas.length) bagian.push(c.fakultas.map((f) => nama(k?.referensi.fakultas, f)).join(', '));
  if (c.prodi.length) bagian.push(c.prodi.map((f) => nama(k?.referensi.prodi, f)).join(', '));
  if (c.unit.length) bagian.push(c.unit.map((u) => k?.referensi.unit.find((x) => x.id === u)?.nama ?? `unit ${u}`).join(', '));
  if (c.angkatan.length) bagian.push('angkatan ' + c.angkatan.join(', '));
  return `${p.peran.map((x) => PERAN_LABEL[x] ?? x).join(' & ')} · ${bagian.length ? bagian.join(' · ') : 'semua unit'}`;
}

// ================================================================ Halaman unit pemilik data

export interface HalamanPemutakhiranProps {
  pemilik: PemilikPemutakhiran;
  /** Judul halaman, mis. "Pemutakhiran data pegawai". */
  judul: string;
  deskripsi?: React.ReactNode;
  /** Awalan BFF untuk unduhan CSV/bukti (bawaan "/bff/api"). */
  bffApi?: string;
  /** Tampilkan tab "Aturan verifikasi" (AturanVerifikasiData) bagi unit yang tidak punya halaman pengaturan sendiri. */
  tabAturan?: boolean;
  className?: string;
}

/**
 * Halaman pemutakhiran data mandiri untuk unit pemilik data (SDM: dosen & tendik, BAAK: mahasiswa, BAUK: data
 * keuangan): dasbor progres, antrean verifikasi pengajuan berkelompok, dan pengaturan periode. Tab mengikuti izin
 * <pemilik>.pemutakhiran.kelola / .verifikasi dari GET /v1/profil/pemutakhiran/{pemilik}/katalog.
 */
export function HalamanPemutakhiran({ pemilik, judul, deskripsi, bffApi = '/bff/api', tabAturan = false, className }: HalamanPemutakhiranProps) {
  const k = useKatalog(pemilik);
  const [tab, setTab] = React.useState<string | null>(null);
  const antrean = useSiakadQuery<PengajuanPemutakhiran[]>(
    ['pemutakhiran', pemilik, 'antrean', 'hitung'],
    (s, signal) => s.request<PengajuanPemutakhiran[]>({ method: 'GET', path: `${P(pemilik)}/pengajuan`, query: { per_page: 1 } }, { signal }),
    { enabled: !!k.data?.hak.verifikasi },
  );
  if (k.error) return <GalatApi error={k.error} onRetry={k.refetch} className={className} />;
  if (!k.data) return <Skeleton className={className} height={360} />;
  const hak = k.data.hak;
  const menunggu = (antrean.meta as { hitung?: Record<string, number> } | undefined)?.hitung?.diajukan ?? 0;
  const items = [
    ...(hak.kelola ? [{ value: 'dasbor', label: 'Dasbor progres', icon: <Users />, content: <DasborPemutakhiran pemilik={pemilik} katalog={k.data} bffApi={bffApi} /> }] : []),
    ...(hak.verifikasi ? [{ value: 'antrean', label: 'Antrean verifikasi', icon: <Inbox />, count: menunggu || undefined, content: <AntreanPemutakhiran pemilik={pemilik} katalog={k.data} bffApi={bffApi} /> }] : []),
    ...(hak.kelola ? [{ value: 'periode', label: 'Periode & isian', icon: <Settings2 />, content: <PeriodeDaftar pemilik={pemilik} katalog={k.data} /> }] : []),
    ...(hak.kelola && tabAturan ? [{ value: 'aturan', label: 'Aturan verifikasi', icon: <ShieldCheck />, content: <AturanVerifikasiData pemilik={pemilik} /> }] : []),
  ];
  return (
    <Stack gap={6} className={cn('u-pmk', className)}>
      <PageHeader
        title={judul}
        description={
          deskripsi ??
          `Buka periode pemutakhiran agar ${k.data.peran.map((x) => (PERAN_LABEL[x] ?? x).toLowerCase()).join(' dan ')} memperbarui datanya sendiri dari aplikasi Profil. Isian bisa langsung tersimpan atau diverifikasi petugas ${k.data.pemilik_label}.`
        }
        badge={!hak.global && hak.lingkup ? <Badge variant="info">Lingkup unit Anda</Badge> : undefined}
      />
      {items.length === 0 ? (
        <Empty bordered icon={<ShieldCheck />} title="Belum ada akses" description={`Halaman ini untuk petugas ${k.data.pemilik_label} dengan izin pemutakhiran data.`} />
      ) : (
        <Tabs value={tab ?? items[0].value} onValueChange={setTab} items={items} />
      )}
    </Stack>
  );
}

// ================================================================ Dasbor progres

function DasborPemutakhiran({ pemilik, katalog, bffApi }: { pemilik: PemilikPemutakhiran; katalog: KatalogPemutakhiran; bffApi: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const daftar = useSiakadQuery<PeriodePemutakhiran[]>(['pemutakhiran', pemilik, 'pengaturan'], (s, signal) => s.request<PeriodePemutakhiran[]>({ method: 'GET', path: `${P(pemilik)}/pengaturan` }, { signal }));
  const [pilih, setPilih] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<'semua' | 'belum' | 'sudah'>('belum');
  const [q, setQ] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(25);
  const [ingat, setIngat] = React.useState(false);
  const [pesan, setPesan] = React.useState('');
  const periode = daftar.data?.find((p) => String(p.id) === pilih) ?? daftar.data?.find((p) => p.berjalan) ?? daftar.data?.[0];
  const progres = useSiakadQuery<ProgresPemutakhiran[]>(
    ['pemutakhiran', pemilik, 'progres', periode?.id, status, q, page, perPage],
    (s, signal) =>
      s.request<ProgresPemutakhiran[]>({ method: 'GET', path: `${P(pemilik)}/pengaturan/${periode!.id}/progres`, query: { status: status === 'semua' ? undefined : status, q: q || undefined, page, per_page: perPage } }, { signal }),
    { enabled: !!periode },
  );
  if (daftar.error) return <GalatApi error={daftar.error} onRetry={daftar.refetch} />;
  if (!daftar.data) return <Skeleton height={300} />;
  if (!periode) {
    return <Empty bordered icon={<CalendarRange />} title="Belum ada periode pemutakhiran" description="Buat periode di tab Periode & isian, lalu pantau progresnya di sini." />;
  }
  const r = ((progres.meta as { ringkas?: RingkasPemutakhiran } | undefined)?.ringkas ?? periode.ringkas) as RingkasPemutakhiran | undefined;
  const st = statusPeriodePemutakhiran(periode);
  const unduh = `${bffApi}${P(pemilik)}/pengaturan/${periode.id}/progres.csv${status !== 'semua' ? `?status=${status}` : ''}`;

  const kolom: DataColumn<ProgresPemutakhiran>[] = [
    {
      key: 'nama',
      header: 'Nama',
      mobile: 'title',
      cell: (x) => (
        <Stack gap={0}>
          <Text size="sm" weight="medium">
            {x.nama}
          </Text>
          <Text size="xs" tone="muted" mono>
            {x.username}
          </Text>
        </Stack>
      ),
    },
    { key: 'unit', header: 'Prodi/unit', cell: (x) => x.unit ?? x.kode_prodi ?? '—', mobile: 'subtitle' },
    { key: 'peran', header: 'Peran', shrink: true, cell: (x) => PERAN_LABEL[x.peran] ?? x.peran },
    {
      key: 'status',
      header: 'Status',
      shrink: true,
      mobile: 'badge',
      cell: (x) => (
        <Badge variant={x.status === 'sudah' ? 'success' : 'neutral'} dot>
          {x.status === 'sudah' ? 'Sudah' : 'Belum'}
        </Badge>
      ),
    },
    { key: 'terakhir', header: 'Terakhir', cell: (x) => (x.terakhir ? formatDate(x.terakhir, 'medium') : '—') },
    { key: 'menunggu', header: 'Menunggu', shrink: true, cell: (x) => (x.menunggu ? <Badge variant="warning">{x.menunggu}</Badge> : '—') },
  ];

  return (
    <Stack gap={5}>
      <Card>
        <CardContent>
          <div className="u-pmk-dasbor">
            <ProgressRing value={r?.persen ?? 0} size={112} thickness={11} tone={(r?.persen ?? 0) >= 80 ? 'success' : 'primary'} label={`${r?.persen ?? 0}%`} />
            <Stack gap={2} className="u-pmk-dasbor-isi">
              <Cluster gap={2}>
                <Badge variant={st.variant} dot>
                  {st.label}
                </Badge>
                <Text size="xs" tone="muted">
                  {masa(periode)}
                </Text>
              </Cluster>
              <Text as="strong" size="lg" weight="semibold">
                {periode.judul}
              </Text>
              <Text size="sm" tone="muted">
                {ringkasCakupan(periode, katalog)} · {Object.keys(periode.isian).length} isian dibuka
              </Text>
              <Progress value={r?.persen ?? 0} label={`${formatNumber(r?.sudah ?? 0)} dari ${formatNumber(r?.total ?? 0)} sudah memperbarui`} tone={(r?.persen ?? 0) >= 80 ? 'success' : 'primary'} size="sm" format={(v) => `${v}%`} />
            </Stack>
            <Stack gap={2} className="u-pmk-dasbor-aksi">
              {daftar.data.length > 1 ? (
                <Pilihan options={daftar.data.map((p) => ({ value: String(p.id), label: p.judul }))} value={String(periode.id)} onValueChange={(v) => { setPilih(v); setPage(1); }} required />
              ) : null}
              <Cluster gap={2}>
                <Button variant="outline" size="sm" render={<a href={unduh} />}>
                  <Download /> Unduh daftar
                </Button>
                <Button size="sm" onClick={() => setIngat(true)} disabled={!r?.belum}>
                  <BellRing /> Kirim pengingat
                </Button>
              </Cluster>
            </Stack>
          </div>
        </CardContent>
      </Card>
      <StatGrid min={160}>
        <StatCard label="Sasaran" value={formatNumber(r?.total ?? 0)} icon={<Users />} hint={periode.peran.map((x) => PERAN_LABEL[x] ?? x).join(', ')} />
        <StatCard label="Sudah memperbarui" value={formatNumber(r?.sudah ?? 0)} icon={<CheckCheck />} tone="success" hint="perubahan atau konfirmasi" />
        <StatCard label="Belum" value={formatNumber(r?.belum ?? 0)} icon={<Users />} tone="warning" hint="bisa diingatkan" />
        <StatCard label="Menunggu verifikasi" value={formatNumber(r?.menunggu ?? 0)} icon={<ClipboardCheck />} tone="info" hint="pengajuan periode ini" />
      </StatGrid>
      <DataTable<ProgresPemutakhiran>
        columns={kolom}
        rows={progres.data}
        rowKey={(x) => x.username}
        loading={progres.loading}
        error={progres.error}
        onRetry={progres.refetch}
        page={page}
        perPage={perPage}
        total={(progres.meta as { total?: number } | undefined)?.total}
        onPageChange={setPage}
        onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
        toolbar={
          <Cluster gap={2}>
            <SegmentedControl
              value={status}
              onValueChange={(v) => { setStatus(v as typeof status); setPage(1); }}
              options={[
                { value: 'belum', label: 'Belum' },
                { value: 'sudah', label: 'Sudah' },
                { value: 'semua', label: 'Semua' },
              ]}
            />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Cari nama atau NIDN/NIM" className="u-pmk-cari" />
          </Cluster>
        }
        empty={{ icon: <CheckCheck />, title: status === 'belum' ? 'Semua sudah memperbarui' : 'Tidak ada data', description: 'Coba ubah saringan.' }}
      />
      <ConfirmDialog
        open={ingat}
        onOpenChange={setIngat}
        tone="primary"
        icon={<BellRing />}
        title={`Kirim pengingat ke ${formatNumber(r?.belum ?? 0)} orang?`}
        description="Notifikasi masuk ke kotak notifikasi (dan email/WhatsApp bila diaktifkan penerima) semua sasaran yang belum memperbarui."
        confirmLabel="Kirim pengingat"
        onConfirm={async () => {
          try {
            const h = await siakad.request<{ terkirim: number }>({ method: 'POST', path: `${P(pemilik)}/pengaturan/${periode.id}/pengingat`, body: { pesan: pesan || undefined } });
            toast.add({ title: `Pengingat terkirim ke ${formatNumber(h.data.terkirim)} orang`, type: 'success' });
            setPesan('');
          } catch (e) {
            toast.add({ title: 'Gagal mengirim pengingat', description: pesanGalat(e), type: 'error' });
          }
        }}
      >
        <Field label="Pesan" optional description="Kosongkan untuk memakai pesan bawaan (batas waktu dan cara memperbarui).">
          <Textarea rows={3} value={pesan} onChange={(e) => setPesan(e.target.value)} placeholder="Mis. Mohon lengkapi data sebelum 30 Desember untuk migrasi sistem kepegawaian." />
        </Field>
      </ConfirmDialog>
    </Stack>
  );
}

// ================================================================ Antrean verifikasi

function AntreanPemutakhiran({ pemilik, katalog, bffApi }: { pemilik: PemilikPemutakhiran; katalog: KatalogPemutakhiran; bffApi: string }) {
  const [status, setStatus] = React.useState('diajukan');
  const [q, setQ] = React.useState('');
  const [fak, setFak] = React.useState<string | null>(null);
  const [bagian, setBagian] = React.useState<string | null>(null);
  const [dari, setDari] = React.useState<string | null>(null);
  const [sampai, setSampai] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [buka, setBuka] = React.useState<PengajuanPemutakhiran | null>(null);
  const data = useSiakadQuery<PengajuanPemutakhiran[]>(
    ['pemutakhiran', pemilik, 'antrean', status, q, fak, bagian, dari, sampai, page],
    (s, signal) =>
      s.request<PengajuanPemutakhiran[]>(
        { method: 'GET', path: `${P(pemilik)}/pengajuan`, query: { status, q: q || undefined, kode_fakultas: fak ?? undefined, bagian: bagian ?? undefined, dari: dari ?? undefined, sampai: sampai ?? undefined, page, per_page: 25 } },
        { signal },
      ),
  );
  const hitung = (data.meta as { hitung?: Record<string, number> } | undefined)?.hitung ?? {};
  const bagianOpsi = [...new Map(katalog.bagian.map((b) => [b.kode, b.label])).entries()].map(([value, label]) => ({ value, label }));
  const kolom: DataColumn<PengajuanPemutakhiran>[] = [
    {
      key: 'nama',
      header: 'Pengaju',
      mobile: 'title',
      cell: (p) => (
        <Stack gap={0}>
          <Text size="sm" weight="medium">
            {p.nama ?? p.username}
          </Text>
          <Text size="xs" tone="muted">
            <span className="u-mono">{p.username}</span> · {PERAN_LABEL[p.peran] ?? p.peran}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'bagian',
      header: 'Perubahan',
      mobile: 'subtitle',
      cell: (p) => (
        <Stack gap={1}>
          <Text size="sm">{p.bagian_label}</Text>
          <Cluster gap={1}>
            {p.isian.map((i) => (
              <Badge key={i.id} variant={STATUS_ISIAN[i.status]?.variant ?? 'neutral'}>
                {i.label}
              </Badge>
            ))}
          </Cluster>
        </Stack>
      ),
    },
    { key: 'created_at', header: 'Diajukan', cell: (p) => formatDate(p.created_at, 'medium') },
    {
      key: 'status',
      header: 'Status',
      shrink: true,
      mobile: 'badge',
      cell: (p) => (
        <Badge variant={STATUS_PENGAJUAN_PEMUTAKHIRAN[p.status]?.variant ?? 'neutral'} dot>
          {p.status_label}
        </Badge>
      ),
    },
  ];
  return (
    <Stack gap={4}>
      <DataTable<PengajuanPemutakhiran>
        columns={kolom}
        rows={data.data}
        rowKey={(p) => String(p.id)}
        loading={data.loading}
        error={data.error}
        onRetry={data.refetch}
        onRowClick={setBuka}
        page={page}
        perPage={25}
        total={(data.meta as { total?: number } | undefined)?.total}
        onPageChange={setPage}
        toolbar={
          <Stack gap={2}>
            <SegmentedControl
              value={status}
              onValueChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: 'diajukan', label: `Menunggu${hitung.diajukan ? ` (${hitung.diajukan})` : ''}` },
                { value: 'sebagian', label: 'Sebagian' },
                { value: 'diterima', label: 'Diterima' },
                { value: 'ditolak', label: 'Ditolak' },
                { value: 'semua', label: 'Semua' },
              ]}
            />
            <div className="u-pmk-saring">
              <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Cari nama atau username" className="u-pmk-cari" />
              {katalog.referensi.fakultas.length > 1 && (katalog.hak.global || (katalog.hak.lingkup?.fakultas.length ?? 0) > 1) ? (
                <Pilihan options={katalog.referensi.fakultas.map((f) => ({ value: f.kode, label: f.nama }))} value={fak} onValueChange={(v) => { setFak(v); setPage(1); }} placeholder="Semua fakultas" tampilan="daftar" />
              ) : null}
              <Pilihan options={bagianOpsi} value={bagian} onValueChange={(v) => { setBagian(v); setPage(1); }} placeholder="Semua bagian" tampilan="daftar" />
              <IsianTanggal value={dari} onValueChange={(v) => { setDari(v || null); setPage(1); }} />
              <IsianTanggal value={sampai} onValueChange={(v) => { setSampai(v || null); setPage(1); }} />
            </div>
          </Stack>
        }
        empty={{ icon: <Inbox />, title: status === 'diajukan' ? 'Antrean kosong' : 'Tidak ada pengajuan', description: status === 'diajukan' ? 'Semua pengajuan sudah diputus.' : 'Coba ubah saringan.' }}
      />
      {buka ? <RincianPengajuanPetugas pemilik={pemilik} ringkas={buka} bffApi={bffApi} onTutup={() => setBuka(null)} /> : null}
    </Stack>
  );
}

function RincianPengajuanPetugas({ pemilik, ringkas, bffApi, onTutup }: { pemilik: PemilikPemutakhiran; ringkas: PengajuanPemutakhiran; bffApi: string; onTutup: () => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useSiakadQuery<PengajuanPemutakhiran>(['pemutakhiran', pemilik, 'rinci', ringkas.id], (s, signal) => s.request<PengajuanPemutakhiran>({ method: 'GET', path: `${P(pemilik)}/pengajuan/${ringkas.id}` }, { signal }), { staleTime: 0 });
  const [putus, setPutus] = React.useState<Record<number, { status: 'diterima' | 'ditolak' | null; alasan: string }>>({});
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [simpan, setSimpan] = React.useState(false);
  const p = q.data;
  const menunggu = p?.isian.filter((i) => i.status === 'diajukan') ?? [];
  const pilihan = Object.entries(putus).filter(([, v]) => v.status !== null);

  const kirim = async (semua?: boolean) => {
    const keputusan: Record<string, { status: string; alasan?: string }> = {};
    if (semua) menunggu.forEach((i) => (keputusan[i.id] = { status: 'diterima' }));
    else pilihan.forEach(([id, v]) => (keputusan[id] = { status: v.status!, alasan: v.alasan || undefined }));
    setSimpan(true);
    setGalat({});
    try {
      const r = await siakad.request<PengajuanPemutakhiran>({ method: 'POST', path: `${P(pemilik)}/pengajuan/${ringkas.id}/putus`, body: { keputusan } });
      toast.add({ title: STATUS_PENGAJUAN_PEMUTAKHIRAN[r.data.status]?.label ?? 'Keputusan tersimpan', description: 'Pengaju mendapat notifikasi.', type: 'success' });
      invalidateSiakad('pemutakhiran');
      onTutup();
    } catch (e) {
      const f = (e as { fields?: Record<string, unknown> }).fields;
      if (f) setGalat(Object.fromEntries(Object.entries(f).map(([k, v]) => [k.replace('keputusan.', ''), String(Array.isArray(v) ? v[0] : v)])));
      else toast.add({ title: 'Gagal menyimpan keputusan', description: pesanGalat(e), type: 'error' });
    } finally {
      setSimpan(false);
    }
  };

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onTutup()}
      size="lg"
      title={`${ringkas.bagian_label}: ${ringkas.nama ?? ringkas.username}`}
      description={`Diajukan ${formatDate(ringkas.created_at, 'long')} · ${ringkas.jumlah_isian} isian`}
      footer={
        menunggu.length > 0 ? (
          <>
            <Button variant="ghost" onClick={onTutup}>
              Tutup
            </Button>
            <Button variant="outline" onClick={() => void kirim(true)} loading={simpan}>
              <CheckCheck /> Terima semua
            </Button>
            <Button onClick={() => void kirim()} disabled={pilihan.length === 0} loading={simpan}>
              <Check /> Simpan keputusan ({pilihan.length})
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={onTutup}>
            Tutup
          </Button>
        )
      }
    >
      {q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : !p ? (
        <Skeleton height={240} />
      ) : (
        <Stack gap={4}>
          <div className="u-pmk-pengaju">
            <div>
              <small>Pengaju</small>
              <strong>{p.nama}</strong>
              <span className="u-mono">{p.username}</span>
            </div>
            <div>
              <small>Peran</small>
              <strong>{PERAN_LABEL[p.peran] ?? p.peran}</strong>
              <span>{[p.kode_prodi, p.angkatan ? `angkatan ${p.angkatan}` : null].filter(Boolean).join(' · ') || '—'}</span>
            </div>
            <div>
              <small>Status</small>
              <Badge variant={STATUS_PENGAJUAN_PEMUTAKHIRAN[p.status]?.variant ?? 'neutral'} dot>
                {p.status_label}
              </Badge>
            </div>
          </div>
          {p.alasan ? (
            <Alert variant="neutral" title="Keterangan pengaju">
              {p.alasan}
            </Alert>
          ) : null}
          {galat.keputusan ? <Alert variant="danger">{galat.keputusan}</Alert> : null}
          <div className="u-pmk-isian-daftar">
            {p.isian.map((i) => {
              const k = putus[i.id] ?? { status: null, alasan: '' };
              return (
                <section key={i.id} className={cn('u-pmk-isian', k.status === 'ditolak' && 'is-tolak', k.status === 'diterima' && 'is-terima')}>
                  <header>
                    <strong>{i.label}</strong>
                    <Badge variant={STATUS_ISIAN[i.status]?.variant ?? 'neutral'}>{STATUS_ISIAN[i.status]?.label ?? i.status}</Badge>
                  </header>
                  <div className="u-pmk-banding">
                    <div>
                      <small>Sebelum</small>
                      <span className={cn(!i.sebelum && 'u-muted')}>{i.sebelum ?? 'Belum diisi'}</span>
                    </div>
                    <ArrowRight aria-label="menjadi" />
                    <div>
                      <small>Sesudah</small>
                      <strong>{i.sesudah ?? '(dikosongkan)'}</strong>
                    </div>
                  </div>
                  {i.bukti?.length ? (
                    <Cluster gap={2}>
                      {i.bukti.map((b) => (
                        <Button key={b.uuid} size="xs" variant="outline" render={<a href={`${bffApi}${P(pemilik)}/pengajuan/${p.id}/bukti/${b.uuid}`} target="_blank" rel="noopener" />}>
                          <FileText /> {b.nama}
                        </Button>
                      ))}
                    </Cluster>
                  ) : i.wajib_bukti ? (
                    <Text size="xs" tone="muted">
                      Bukti wajib tetapi tidak ada lampiran.
                    </Text>
                  ) : null}
                  {i.status === 'diajukan' ? (
                    <Stack gap={2}>
                      <SegmentedControl
                        value={k.status ?? ''}
                        onValueChange={(v) => setPutus((x) => ({ ...x, [i.id]: { ...k, status: (v || null) as 'diterima' | 'ditolak' | null } }))}
                        options={[
                          { value: 'diterima', label: 'Terima', icon: <Check /> },
                          { value: 'ditolak', label: 'Tolak', icon: <X /> },
                        ]}
                      />
                      {k.status === 'ditolak' ? (
                        <Field label="Alasan penolakan" required error={galat[i.id]}>
                          <Input value={k.alasan} onChange={(e) => setPutus((x) => ({ ...x, [i.id]: { ...k, alasan: e.target.value } }))} placeholder="Mis. bukti tidak terbaca, unggah ulang yang jelas." />
                        </Field>
                      ) : galat[i.id] ? (
                        <Text size="xs" tone="danger">
                          {galat[i.id]}
                        </Text>
                      ) : null}
                    </Stack>
                  ) : i.alasan_tolak ? (
                    <Text size="sm" tone="danger">
                      Alasan: {i.alasan_tolak}
                    </Text>
                  ) : i.diputus_oleh ? (
                    <Text size="xs" tone="muted">
                      Diputus {i.diputus_oleh}
                      {i.diputus_at ? ` · ${formatDate(i.diputus_at, 'medium')}` : ''}
                    </Text>
                  ) : null}
                </section>
              );
            })}
          </div>
        </Stack>
      )}
    </Sheet>
  );
}

// ================================================================ Periode & isian

function PeriodeDaftar({ pemilik, katalog }: { pemilik: PemilikPemutakhiran; katalog: KatalogPemutakhiran }) {
  const daftar = useSiakadQuery<PeriodePemutakhiran[]>(['pemutakhiran', pemilik, 'pengaturan'], (s, signal) => s.request<PeriodePemutakhiran[]>({ method: 'GET', path: `${P(pemilik)}/pengaturan` }, { signal }));
  const [ubah, setUbah] = React.useState<PeriodePemutakhiran | 'baru' | null>(null);
  const siakad = useSiakad();
  const toast = useToast();
  const [hapus, setHapus] = React.useState<PeriodePemutakhiran | null>(null);
  if (daftar.error) return <GalatApi error={daftar.error} onRetry={daftar.refetch} />;
  if (!daftar.data) return <Skeleton height={240} />;
  return (
    <Stack gap={4}>
      <Cluster justify="between">
        <Text size="sm" tone="muted">
          Isian yang tidak dibuka tetap memakai aturan verifikasi bawaan unit (di luar periode); periode menimpanya untuk isian yang dibuka.
        </Text>
        <Button onClick={() => setUbah('baru')}>
          <Plus /> Periode baru
        </Button>
      </Cluster>
      {daftar.data.length === 0 ? (
        <Empty
          bordered
          icon={<CalendarRange />}
          title="Belum ada periode pemutakhiran"
          description="Buat periode, mis. 1–30 Desember, pilih sasaran dan isian yang boleh diperbarui, lalu aktifkan."
          actions={
            <Button onClick={() => setUbah('baru')}>
              <Plus /> Periode baru
            </Button>
          }
        />
      ) : (
        <div className="u-pmk-periode-grid">
          {daftar.data.map((p) => {
            const st = statusPeriodePemutakhiran(p);
            const langsung = Object.values(p.isian).filter((x) => x.mode === 'langsung').length;
            return (
              <Card key={p.id} className="u-pmk-periode">
                <CardHeader
                  title={p.judul}
                  description={masa(p)}
                  action={
                    <Badge variant={st.variant} dot>
                      {st.label}
                    </Badge>
                  }
                />
                <CardContent>
                  <Stack gap={3}>
                    <Text size="sm" tone="muted">
                      {ringkasCakupan(p, katalog)}
                    </Text>
                    <Cluster gap={1}>
                      <Badge variant="success">{langsung} langsung</Badge>
                      <Badge variant="info">{Object.keys(p.isian).length - langsung} diverifikasi</Badge>
                      <Badge variant="outline">{Object.values(p.isian).filter((x) => x.bukti).length} wajib bukti</Badge>
                    </Cluster>
                    {p.ringkas ? <Progress value={p.ringkas.persen} label={`${formatNumber(p.ringkas.sudah)} / ${formatNumber(p.ringkas.total)} memperbarui`} size="sm" format={(v) => `${v}%`} /> : null}
                    <Cluster gap={2}>
                      <Button size="sm" variant="outline" onClick={() => setUbah(p)}>
                        <PenLine /> Ubah
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          try {
                            await siakad.request({ method: 'POST', path: `${P(pemilik)}/pengaturan/${p.id}/ubah`, body: { aktif: !p.aktif } });
                            toast.add({ title: p.aktif ? 'Periode dinonaktifkan' : 'Periode diaktifkan', type: 'success' });
                            invalidateSiakad('pemutakhiran');
                          } catch (e) {
                            toast.add({ title: 'Gagal', description: pesanGalat(e), type: 'error' });
                          }
                        }}
                      >
                        <RefreshCw /> {p.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setHapus(p)} aria-label="Hapus periode">
                        <Trash2 />
                      </Button>
                    </Cluster>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {ubah ? <FormPeriode pemilik={pemilik} katalog={katalog} awal={ubah === 'baru' ? null : ubah} onTutup={() => setUbah(null)} /> : null}
      <ConfirmDialog
        open={hapus !== null}
        onOpenChange={(o) => !o && setHapus(null)}
        title="Hapus periode ini?"
        description="Pengajuan dan riwayat perubahan yang sudah ada tetap tersimpan."
        confirmLabel="Hapus periode"
        onConfirm={async () => {
          try {
            await siakad.request({ method: 'POST', path: `${P(pemilik)}/pengaturan/${hapus!.id}/hapus` });
            invalidateSiakad('pemutakhiran');
          } catch (e) {
            toast.add({ title: 'Gagal menghapus', description: pesanGalat(e), type: 'error' });
          }
        }}
      />
    </Stack>
  );
}

type JenisCakupan = 'semua' | 'fakultas' | 'prodi' | 'unit' | 'angkatan';

function FormPeriode({ pemilik, katalog, awal, onTutup }: { pemilik: PemilikPemutakhiran; katalog: KatalogPemutakhiran; awal: PeriodePemutakhiran | null; onTutup: () => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [judul, setJudul] = React.useState(awal?.judul ?? '');
  const [ket, setKet] = React.useState(awal?.keterangan ?? '');
  const [aktif, setAktif] = React.useState(awal?.aktif ?? true);
  const [mulai, setMulai] = React.useState<string | null>(awal?.mulai ?? null);
  const [selesai, setSelesai] = React.useState<string | null>(awal?.selesai ?? null);
  const [peran, setPeran] = React.useState<string[]>(awal?.peran ?? katalog.peran);
  const c = awal?.cakupan;
  const jenisAwal: JenisCakupan = c?.prodi.length ? 'prodi' : c?.fakultas.length ? 'fakultas' : c?.unit.length ? 'unit' : c?.angkatan.length ? 'angkatan' : katalog.hak.global ? 'semua' : 'fakultas';
  const [jenis, setJenis] = React.useState<JenisCakupan>(jenisAwal);
  const [nilai, setNilai] = React.useState<string[]>(
    (jenisAwal === 'prodi' ? c?.prodi : jenisAwal === 'fakultas' ? c?.fakultas : jenisAwal === 'unit' ? c?.unit.map(String) : jenisAwal === 'angkatan' ? c?.angkatan.map(String) : []) ?? [],
  );
  const [angkatanEkstra, setAngkatanEkstra] = React.useState<string[]>(jenisAwal !== 'angkatan' ? (c?.angkatan.map(String) ?? []) : []);
  const [isian, setIsian] = React.useState<Record<string, { mode: ModeIsianPemutakhiran; bukti: boolean }>>(awal?.isian ?? {});
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  // "Perubahan belum disimpan" hanya setelah ada isian yang diubah (periode baru selalu dianggap berubah).
  const [dirty, setDirty] = React.useState(false);
  const pertama = React.useRef(true);
  React.useEffect(() => {
    if (pertama.current) {
      pertama.current = false;
      return;
    }
    setDirty(true);
  }, [judul, ket, aktif, mulai, selesai, peran, jenis, nilai, angkatanEkstra, isian]);
  const adaMhs = peran.includes('mahasiswa');
  const adaPegawai = peran.includes('dosen') || peran.includes('tendik');
  const lingkup = katalog.hak.lingkup;
  const fakOpsi = katalog.referensi.fakultas.filter((f) => katalog.hak.global || lingkup?.fakultas.includes(f.kode)).map((f) => ({ value: f.kode, label: f.nama }));
  const prodiOpsi = katalog.referensi.prodi.filter((p) => katalog.hak.global || lingkup?.prodi.includes(p.kode) || lingkup?.fakultas.includes(p.fakultas)).map((p) => ({ value: p.kode, label: p.nama }));
  const tahun = new Date().getFullYear();
  const angkatanOpsi = Array.from({ length: 12 }, (_, i) => String(tahun - i)).map((t) => ({ value: t, label: t }));
  const jenisOpsi = [
    ...(katalog.hak.global ? [{ value: 'semua', label: 'Semua' }] : []),
    { value: 'fakultas', label: 'Fakultas' },
    { value: 'prodi', label: 'Prodi' },
    ...(adaPegawai && katalog.hak.global ? [{ value: 'unit', label: 'Unit SDM' }] : []),
    ...(adaMhs && katalog.hak.global ? [{ value: 'angkatan', label: 'Angkatan' }] : []),
  ];
  const bagian = katalog.bagian.filter((b) => (b.sasaran === 'mahasiswa' ? adaMhs : adaPegawai));

  const aturBagian = (b: BagianKatalogPemutakhiran, mode: ModeIsianPemutakhiran | 'tutup') =>
    setIsian((x) => {
      const n = { ...x };
      b.isian.forEach((i) => {
        if (mode === 'tutup') delete n[i.kode];
        else n[i.kode] = { mode, bukti: mode === 'verifikasi' && i.bukti };
      });
      return n;
    });

  return (
    <PanelForm
      open
      onOpenChange={(o) => !o && onTutup()}
      size="xl"
      title={awal ? 'Ubah periode pemutakhiran' : 'Periode pemutakhiran baru'}
      description="Atur siapa yang diminta memperbarui data, kapan, dan isian mana yang langsung tersimpan atau diverifikasi petugas."
      labelSimpan={awal ? 'Simpan perubahan' : 'Buat periode'}
      berubah={!awal || dirty}
      onSimpan={async () => {
        const cakupan = { fakultas: [] as string[], prodi: [] as string[], unit: [] as number[], angkatan: angkatanEkstra.map(Number) };
        if (jenis === 'fakultas') cakupan.fakultas = nilai;
        if (jenis === 'prodi') cakupan.prodi = nilai;
        if (jenis === 'unit') cakupan.unit = nilai.map(Number);
        if (jenis === 'angkatan') cakupan.angkatan = nilai.map(Number);
        const body = { judul, keterangan: ket, aktif, mulai, selesai, peran, cakupan, isian };
        try {
          await siakad.request({ method: 'POST', path: awal ? `${P(pemilik)}/pengaturan/${awal.id}/ubah` : `${P(pemilik)}/pengaturan`, body });
          toast.add({ title: awal ? 'Periode diperbarui' : 'Periode dibuat', description: aktif ? 'Sasaran melihat ikon pensil di aplikasi Profil.' : 'Aktifkan bila sudah siap.', type: 'success' });
          invalidateSiakad('pemutakhiran');
        } catch (e) {
          const f = (e as { fields?: Record<string, unknown> }).fields;
          if (f) {
            setGalat(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, String(Array.isArray(v) ? v[0] : v)])));
            return 'Periksa isian yang ditandai.';
          }
          throw e;
        }
      }}
    >
      <Stack gap={6}>
        <GridForm>
          <Field label="Judul" required error={galat.judul} className="u-form-lebar">
            <Input value={judul} onChange={(e) => setJudul(e.target.value)} placeholder={pemilik === 'baak' ? 'Pemutakhiran data mahasiswa Desember 2026' : pemilik === 'bauk' ? 'Pemutakhiran rekening dan NPWP 2026' : 'Pemutakhiran data dosen dan tendik Desember 2026'} />
          </Field>
          <Field label="Mulai" error={galat.mulai} description="Kosong = mulai saat diaktifkan.">
            <IsianTanggal value={mulai} onValueChange={(v) => setMulai(v || null)} />
          </Field>
          <Field label="Selesai" error={galat.selesai} description="Kosong = sampai dinonaktifkan.">
            <IsianTanggal value={selesai} onValueChange={(v) => setSelesai(v || null)} />
          </Field>
          <Field label="Pesan untuk sasaran" optional className="u-form-lebar" description="Tampil di aplikasi Profil selama periode berjalan.">
            <Textarea rows={2} value={ket} onChange={(e) => setKet(e.target.value)} placeholder="Mis. Data dipakai untuk migrasi sistem kepegawaian. Periksa setiap bagian, perbarui bila perlu." />
          </Field>
          <Field label="Aktif" className="u-form-lebar">
            <Cluster gap={2}>
              <Switch checked={aktif} onCheckedChange={setAktif} />
              <Text size="sm" tone="muted">
                {aktif ? 'Periode berlaku di masa yang ditentukan.' : 'Tersimpan sebagai draf; sasaran belum melihatnya.'}
              </Text>
            </Cluster>
          </Field>
        </GridForm>

        <Stack gap={3}>
          <Text as="strong" weight="semibold">
            Sasaran
          </Text>
          {katalog.peran.length > 1 ? (
            <Field label="Peran" required error={galat.peran}>
              <Cluster gap={4}>
                {katalog.peran.map((r) => (
                  <label key={r} className="u-pmk-cek">
                    <Checkbox checked={peran.includes(r)} onCheckedChange={(v) => setPeran((x) => (v ? [...new Set([...x, r])] : x.filter((y) => y !== r)))} />
                    {PERAN_LABEL[r] ?? r}
                  </label>
                ))}
              </Cluster>
            </Field>
          ) : null}
          <Field label="Cakupan" error={galat.cakupan}>
            <Stack gap={2}>
              <SegmentedControl value={jenis} onValueChange={(v) => { setJenis(v as JenisCakupan); setNilai([]); }} options={jenisOpsi} />
              {jenis === 'fakultas' ? <PilihanBanyak options={fakOpsi} value={nilai} onValueChange={setNilai} placeholder="Pilih fakultas" /> : null}
              {jenis === 'prodi' ? <PilihanBanyak options={prodiOpsi} value={nilai} onValueChange={setNilai} placeholder="Pilih program studi" /> : null}
              {jenis === 'unit' ? <PilihanBanyak options={katalog.referensi.unit.map((u) => ({ value: String(u.id), label: u.nama }))} value={nilai} onValueChange={setNilai} placeholder="Pilih unit (termasuk unit di bawahnya)" /> : null}
              {jenis === 'angkatan' ? <PilihanBanyak options={angkatanOpsi} value={nilai} onValueChange={setNilai} placeholder="Pilih angkatan" /> : null}
              {adaMhs && jenis !== 'angkatan' && jenis !== 'semua' ? (
                <PilihanBanyak options={angkatanOpsi} value={angkatanEkstra} onValueChange={setAngkatanEkstra} placeholder="Batasi angkatan (opsional)" />
              ) : null}
            </Stack>
          </Field>
        </Stack>

        <Stack gap={3}>
          <Cluster justify="between">
            <Text as="strong" weight="semibold">
              Isian yang boleh diperbarui
            </Text>
            {galat.isian ? (
              <Text size="sm" tone="danger">
                {galat.isian}
              </Text>
            ) : null}
          </Cluster>
          {bagian.map((b) => (
            <section key={`${b.sasaran}-${b.kode}`} className="u-pmk-atur">
              <header>
                <div>
                  <strong>{b.label}</strong>
                  <small>
                    {b.sasaran === 'mahasiswa' ? 'Mahasiswa' : 'Pegawai'} · {b.keterangan}
                  </small>
                </div>
                <Cluster gap={1}>
                  <Button size="xs" variant="ghost" onClick={() => aturBagian(b, 'langsung')}>
                    Semua langsung
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => aturBagian(b, 'verifikasi')}>
                    Semua diverifikasi
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => aturBagian(b, 'tutup')}>
                    Tutup semua
                  </Button>
                </Cluster>
              </header>
              <div className="u-pmk-atur-baris">
                {b.isian.map((i) => {
                  const a = isian[i.kode];
                  return (
                    <div key={i.kode} className={cn('u-pmk-atur-isian', a && 'is-buka')}>
                      <div className="u-pmk-atur-label">
                        <span>{i.label}</span>
                        <small>
                          Bawaan: {BAWAAN_LABEL[i.bawaan] ?? i.bawaan}
                          {i.bukti && i.bawaan !== 'langsung' ? ' + bukti' : ''}
                          {i.rahasia ? ' · rahasia' : ''}
                          {i.peran ? ` · ${i.peran.map((x) => PERAN_LABEL[x] ?? x).join('/')}` : ''}
                        </small>
                      </div>
                      <SegmentedControl
                        value={a?.mode ?? 'tutup'}
                        onValueChange={(v) =>
                          setIsian((x) => {
                            const n = { ...x };
                            if (v === 'tutup') delete n[i.kode];
                            else n[i.kode] = { mode: v as ModeIsianPemutakhiran, bukti: v === 'verifikasi' && (x[i.kode]?.bukti ?? i.bukti) };
                            return n;
                          })
                        }
                        options={[
                          { value: 'tutup', label: 'Bawaan' },
                          { value: 'langsung', label: 'Langsung' },
                          { value: 'verifikasi', label: 'Diverifikasi' },
                        ]}
                      />
                      <label className={cn('u-pmk-cek', a?.mode !== 'verifikasi' && 'is-mati')}>
                        <Switch size="sm" checked={!!a?.bukti} disabled={a?.mode !== 'verifikasi'} onCheckedChange={(v) => setIsian((x) => ({ ...x, [i.kode]: { mode: 'verifikasi', bukti: v } }))} />
                        Wajib bukti
                      </label>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </Stack>
      </Stack>
    </PanelForm>
  );
}
