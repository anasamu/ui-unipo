'use client';
import * as React from 'react';
import { Activity, AppWindow, Ban, Gauge, KeyRound, LogIn, LogOut, MonitorSmartphone, Settings2, ShieldAlert, ShieldCheck, TriangleAlert, Users } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatDate, formatNumber, formatPersen, formatRelative, formatTime } from '../lib/format';
import { Badge, Button, Skeleton, type BadgeVariant } from '../components/actions';
import { Alert, DescriptionList, Empty, Pagination } from '../components/display';
import { BarList, LineChart, Panel, SegmentBar, StatCard, StatGrid } from '../components/charts';
import { CopyButton } from '../components/code';
import { FilterBar, type FilterValues, type DateRangeValue } from '../components/filter';
import { SegmentedControl } from '../components/forms';
import { ConfirmDialog, Sheet } from '../components/overlays';
import { DataTable, type DataColumn } from '../components/data-table';
import { pesanGalat, useSiakadQuery } from './provider';
import { invalidateSso, useSsoAdmin, useSsoQuery } from './aplikasi';

/*
 * Log untuk admin: permintaan API SIAKAD (/v1/rbac/log-api, dari storage/logs/api-*.log), ringkasan grafiknya,
 * log aktivitas SSO (/api/admin/audit: login, gagal login, logout, perubahan admin), dan keamanan akun satu pengguna
 * (sesi aktif + riwayat login, keluarkan dari semua perangkat).
 */

const hariIni = () => new Date().toISOString().slice(0, 10);
const mundur = (hari: number) => new Date(Date.now() - (hari - 1) * 86_400_000).toISOString().slice(0, 10);

// ================================================================ Log API
export interface BarisLogApi {
  waktu: string;
  request_id?: string | null;
  method: string;
  path: string;
  query?: string | null;
  status: number;
  ms: number;
  client_id?: string | null;
  username?: string | null;
  level?: string | null;
  lingkungan?: string | null;
  ip?: string | null;
}

export const nadaStatus = (st: number): BadgeVariant => (st >= 500 ? 'danger' : st >= 400 ? 'warning' : st >= 300 ? 'info' : 'success');
const nadaMs = (ms: number) => (ms >= 2000 ? 'danger' : ms >= 800 ? 'warning' : undefined);

export function LencanaMetode({ method }: { method: string }) {
  return (
    <span className="u-http-method" data-method={method.toUpperCase()}>
      {method.toUpperCase()}
    </span>
  );
}

export interface LogApiProps {
  /** Batasi ke satu aplikasi (klien API). */
  clientId?: string;
  username?: string;
  /** Rentang awal dalam hari (bawaan 1 = hari ini, maks 31). */
  hari?: number;
  perPage?: number;
  /** Tampilkan bilah saringan (bawaan true). */
  saringan?: boolean;
  className?: string;
}

/**
 * Tabel permintaan API terbaru dulu: metode, path, status, durasi, aplikasi, pengguna. Saring status, metode, tanggal,
 * dan path; klik baris untuk rincian (request ID, IP, query, database).
 */
export function LogApi({ clientId, username, hari = 1, perPage: pp = 50, saringan = true, className }: LogApiProps) {
  const [f, setF] = React.useState<FilterValues>({});
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(pp);
  const [pilih, setPilih] = React.useState<BarisLogApi | null>(null);
  const tgl = (f.tanggal ?? {}) as DateRangeValue;
  const query = {
    dari: tgl.from || (tgl.to ? undefined : mundur(hari)),
    sampai: tgl.to || (tgl.from ? undefined : hariIni()),
    client_id: clientId ?? ((f.client_id as string) || undefined),
    username: username ?? ((f.username as string) || undefined),
    status: (f.status as string) || undefined,
    method: (f.method as string) || undefined,
    path: (f.path as string)?.trim() || undefined,
    page,
    per_page: perPage,
  };
  const q = useSiakadQuery<BarisLogApi[]>(['rbac', 'log-api', query], (s, signal) => s.request({ method: 'GET', path: '/v1/rbac/log-api', query }, { signal }), { staleTime: 15_000 });
  const kolom: DataColumn<BarisLogApi>[] = [
    {
      key: 'waktu',
      header: 'Waktu',
      shrink: true,
      cell: (r) => (
        <time dateTime={r.waktu} title={formatDate(r.waktu, 'long')} className="u-log-time">
          {query.dari !== query.sampai && <small>{formatDate(r.waktu, 'short')}</small>}
          {formatTime(r.waktu)}
        </time>
      ),
      mobile: 'subtitle',
    },
    {
      key: 'path',
      header: 'Endpoint',
      cell: (r) => (
        <span className="u-log-path">
          <LencanaMetode method={r.method} />
          <code>{r.path}</code>
        </span>
      ),
      mobile: 'title',
    },
    {
      key: 'status',
      header: 'Status',
      shrink: true,
      cell: (r) => (
        <Badge variant={nadaStatus(r.status)} shape="square">
          {r.status}
        </Badge>
      ),
      mobile: 'badge',
    },
    {
      key: 'ms',
      header: 'Durasi',
      align: 'end',
      shrink: true,
      cell: (r) => (
        <span className="u-log-ms" data-tone={nadaMs(r.ms)}>
          {formatNumber(r.ms)} ms
        </span>
      ),
    },
    ...(clientId ? [] : [{ key: 'client_id', header: 'Aplikasi', cell: (r: BarisLogApi) => (r.client_id ? <code>{r.client_id}</code> : '–') }]),
    ...(username ? [] : [{ key: 'username', header: 'Pengguna', cell: (r: BarisLogApi) => r.username || <span className="u-app-muted">token aplikasi</span> }]),
  ];
  const ubah = (v: FilterValues) => {
    setF(v);
    setPage(1);
  };
  return (
    <div className={cn('u-log', className)}>
      <DataTable
        columns={kolom}
        rows={q.data}
        rowKey={(r) => `${r.request_id ?? ''}${r.waktu}${r.path}`}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
        page={page}
        perPage={perPage}
        total={Number(q.meta?.total ?? q.data?.length ?? 0)}
        onPageChange={setPage}
        onPerPageChange={(n) => (setPerPage(n), setPage(1))}
        perPageOptions={[25, 50, 100, 200]}
        onRowClick={setPilih}
        defaultDensity="compact"
        columnToggle={false}
        exportCsv="log-api"
        filtered={Object.values(f).some(Boolean)}
        emptyFiltered={{ onReset: () => ubah({}) }}
        empty={{ icon: <Activity />, title: 'Belum ada permintaan', description: 'Tidak ada permintaan API pada rentang tanggal ini.' }}
        toolbar={
          saringan ? (
            <FilterBar
              value={f}
              onValueChange={ubah}
              search={{ placeholder: 'Cari path, mis. /v1/krs', key: 'path' }}
              fields={[
                { key: 'tanggal', label: 'Tanggal', type: 'date-range' },
                {
                  key: 'status',
                  label: 'Status',
                  type: 'select',
                  options: [
                    { value: 'sukses', label: 'Berhasil (< 400)' },
                    { value: 'galat', label: 'Galat (≥ 400)' },
                    { value: '4xx', label: '4xx' },
                    { value: '5xx', label: '5xx' },
                  ],
                },
                { key: 'method', label: 'Metode', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => ({ value: m, label: m })) },
              ]}
            />
          ) : undefined
        }
      />
      {q.meta?.terpotong ? <Alert variant="warning">Log terlalu besar untuk dibaca sekaligus; persempit rentang tanggal atau saringan.</Alert> : null}
      <Sheet open={pilih != null} onOpenChange={(o) => !o && setPilih(null)} title="Rincian permintaan" size="md">
        {pilih && <RincianLogApi baris={pilih} />}
      </Sheet>
    </div>
  );
}

export function RincianLogApi({ baris: r }: { baris: BarisLogApi }) {
  return (
    <div className="u-log-detail">
      <p className="u-log-path u-log-path-lg">
        <LencanaMetode method={r.method} />
        <code>
          {r.path}
          {r.query ? `?${r.query}` : ''}
        </code>
      </p>
      <DescriptionList
        items={[
          { label: 'Waktu', value: `${formatDate(r.waktu, 'long')} ${formatTime(r.waktu)}` },
          { label: 'Status', value: <Badge variant={nadaStatus(r.status)}>{r.status}</Badge> },
          { label: 'Durasi', value: `${formatNumber(r.ms)} ms` },
          {
            label: 'Request ID',
            value: r.request_id ? (
              <span className="u-app-id">
                <code>{r.request_id}</code>
                <CopyButton text={r.request_id} label="Salin request ID" />
              </span>
            ) : null,
          },
          { label: 'Aplikasi', value: r.client_id ? <code>{r.client_id}</code> : null },
          { label: 'Pengguna', value: r.username ? `${r.username}${r.level ? ` (${r.level})` : ''}` : 'Token aplikasi' },
          { label: 'Database', value: r.lingkungan ? (r.lingkungan === 'live' ? 'Live' : 'Development') : null },
          { label: 'IP', value: r.ip ? <code>{r.ip}</code> : null },
        ]}
      />
      <p className="u-app-muted">Log tidak menyimpan token, password, maupun isi permintaan.</p>
    </div>
  );
}

// ================================================================ Ringkasan log API
export interface RingkasanLogApiData {
  dari: string;
  sampai: string;
  per: 'jam' | 'hari';
  jumlah: number;
  galat_4xx: number;
  galat_5xx: number;
  tingkat_galat: number;
  ms_rata: number;
  ms_p50: number;
  ms_p95: number;
  pengguna_unik: number;
  seri: Array<{ waktu: string; jumlah: number; galat: number }>;
  status: Array<{ status: number; jumlah: number }>;
  endpoint_teratas: Array<{ endpoint: string; jumlah: number; galat: number; ms_rata: number }>;
  klien_teratas: Array<{ client_id: string; jumlah: number; galat: number }>;
  terpotong: boolean;
}

export interface RingkasanLogApiProps {
  clientId?: string;
  /** Rentang awal: 1, 7, atau 30 hari (bawaan 7). */
  hari?: 1 | 7 | 30;
  /** Hanya kartu angka + grafik (untuk tab detail aplikasi). */
  ringkas?: boolean;
  className?: string;
}

/** Dasbor log API: angka (permintaan, tingkat galat, p95, pengguna), grafik per jam/hari, sebaran status, endpoint dan aplikasi teratas. */
export function RingkasanLogApi({ clientId, hari: awal = 7, ringkas, className }: RingkasanLogApiProps) {
  const [hari, setHari] = React.useState<1 | 7 | 30>(awal);
  const query = { dari: mundur(hari), sampai: hariIni(), client_id: clientId };
  const q = useSiakadQuery<RingkasanLogApiData>(['rbac', 'log-api-ringkasan', query], (s, signal) => s.request({ method: 'GET', path: '/v1/rbac/log-api/ringkasan', query }, { signal }), {
    staleTime: 30_000,
  });
  const d = q.data;
  const muat = q.loading && !d;
  if (q.error && !d)
    return (
      <Alert variant="danger" title="Ringkasan log gagal dimuat">
        {pesanGalat(q.error)}
      </Alert>
    );
  const label = (w: string) => (d?.per === 'jam' ? w.slice(11, 16) : new Date(`${w}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
  const statusKel = [2, 3, 4, 5].map((k) => ({ label: `${k}xx`, value: (d?.status ?? []).filter((s) => Math.floor(s.status / 100) === k).reduce((n, s) => n + s.jumlah, 0) }));
  const warna: Record<string, string> = { '2xx': 'var(--u-success)', '3xx': 'var(--u-info)', '4xx': 'var(--u-warning)', '5xx': 'var(--u-danger)' };
  return (
    <div className={cn('u-log-summary', className)}>
      <div className="u-log-summary-bar">
        <SegmentedControl<'1' | '7' | '30'>
          value={String(hari) as '1' | '7' | '30'}
          onValueChange={(v) => setHari(Number(v) as 1 | 7 | 30)}
          options={[
            { value: '1', label: 'Hari ini' },
            { value: '7', label: '7 hari' },
            { value: '30', label: '30 hari' },
          ]}
          aria-label="Rentang waktu"
        />
        {d?.terpotong && <Badge variant="warning">Sebagian log tidak terbaca</Badge>}
      </div>
      <StatGrid>
        <StatCard label="Permintaan" value={formatNumber(d?.jumlah)} icon={<Activity />} loading={muat} trend={d?.seri.map((s) => s.jumlah)} />
        <StatCard
          label="Tingkat galat"
          value={formatPersen((d?.tingkat_galat ?? 0) * 100)}
          hint={d ? `${formatNumber(d.galat_4xx)} 4xx · ${formatNumber(d.galat_5xx)} 5xx` : undefined}
          icon={<TriangleAlert />}
          tone={d && d.tingkat_galat > 0.05 ? 'danger' : 'neutral'}
          loading={muat}
        />
        <StatCard
          label="Waktu tanggap p95"
          value={`${formatNumber(d?.ms_p95)} ms`}
          hint={d ? `median ${formatNumber(d.ms_p50)} ms` : undefined}
          icon={<Gauge />}
          tone={d && d.ms_p95 > 1500 ? 'warning' : 'info'}
          loading={muat}
        />
        <StatCard label="Pengguna unik" value={formatNumber(d?.pengguna_unik)} icon={<Users />} tone="neutral" loading={muat} />
      </StatGrid>
      <Panel title={d?.per === 'jam' ? 'Permintaan per jam' : 'Permintaan per hari'}>
        <LineChart
          labels={(d?.seri ?? []).map((s) => label(s.waktu))}
          series={[
            { label: 'Permintaan', values: (d?.seri ?? []).map((s) => s.jumlah) },
            { label: 'Galat', values: (d?.seri ?? []).map((s) => s.galat), color: 'var(--u-danger)' },
          ]}
          loading={muat}
          height={200}
        />
      </Panel>
      {!ringkas && (
        <div className="u-log-summary-grid">
          <Panel title="Endpoint teratas" description="Path dengan ID digabung, mis. /v1/mahasiswa/{id}">
            <BarList
              loading={muat}
              items={(d?.endpoint_teratas ?? []).map((e) => ({
                label: <code className="u-log-endpoint">{e.endpoint}</code>,
                value: e.jumlah,
                secondary: `${formatNumber(e.ms_rata)} ms${e.galat ? ` · ${formatNumber(e.galat)} galat` : ''}`,
              }))}
            />
          </Panel>
          <div className="u-log-summary-col">
            {!clientId && (
              <Panel title="Aplikasi teratas">
                <BarList
                  loading={muat}
                  items={(d?.klien_teratas ?? []).map((k) => ({ label: <code>{k.client_id}</code>, value: k.jumlah, secondary: k.galat ? `${formatNumber(k.galat)} galat` : undefined }))}
                />
              </Panel>
            )}
            <Panel title="Sebaran status">
              {muat ? <Skeleton style={{ height: 40 }} /> : <SegmentBar data={statusKel.map((s) => ({ ...s, color: warna[s.label] }))} format={(n) => formatNumber(n)} />}
              <ul className="u-log-status">
                {(d?.status ?? []).map((s) => (
                  <li key={s.status}>
                    <Badge variant={nadaStatus(s.status)} shape="square">
                      {s.status}
                    </Badge>
                    <span>{formatNumber(s.jumlah)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================ Log aktivitas SSO
export interface BarisAudit {
  id: number;
  time: string;
  event: string;
  username: string;
  client_id: string;
  ip: string;
  detail: string;
}

type Nada = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'primary';
/** Label dan nada tiap peristiwa SSO. */
export const PERISTIWA_SSO: Record<string, { label: string; nada: Nada; icon: React.ReactNode }> = {
  login: { label: 'Masuk', nada: 'success', icon: <LogIn /> },
  login_failed: { label: 'Gagal masuk', nada: 'danger', icon: <Ban /> },
  login_locked: { label: 'Akun dikunci sementara', nada: 'danger', icon: <ShieldAlert /> },
  login_suspicious: { label: 'Login mencurigakan', nada: 'warning', icon: <ShieldAlert /> },
  login_confirmed: { label: 'Login dikonfirmasi pengguna', nada: 'success', icon: <ShieldCheck /> },
  login_reported: { label: 'Login dilaporkan bukan pemilik', nada: 'danger', icon: <ShieldAlert /> },
  login_captcha_failed: { label: 'Captcha salah', nada: 'warning', icon: <Ban /> },
  logout: { label: 'Keluar', nada: 'neutral', icon: <LogOut /> },
  authorize: { label: 'Membuka aplikasi', nada: 'info', icon: <AppWindow /> },
  access_denied: { label: 'Akses aplikasi ditolak', nada: 'danger', icon: <Ban /> },
  token_authorization_code: { label: 'Token diterbitkan (login)', nada: 'info', icon: <KeyRound /> },
  token_refresh_token: { label: 'Token diperbarui', nada: 'info', icon: <KeyRound /> },
  password_reset_requested: { label: 'Minta reset password', nada: 'info', icon: <KeyRound /> },
  password_reset: { label: 'Password direset', nada: 'warning', icon: <KeyRound /> },
  password_reset_failed: { label: 'Reset password gagal', nada: 'danger', icon: <KeyRound /> },
  password_reset_mail_failed: { label: 'Email reset gagal terkirim', nada: 'warning', icon: <KeyRound /> },
  password_reset_unknown: { label: 'Reset untuk akun tak dikenal', nada: 'warning', icon: <KeyRound /> },
  session_revoked: { label: 'Sesi diakhiri', nada: 'warning', icon: <MonitorSmartphone /> },
  session_hijack_blocked: { label: 'Pembajakan sesi dicegah', nada: 'danger', icon: <ShieldAlert /> },
  device_trusted: { label: 'Perangkat dipercaya', nada: 'info', icon: <MonitorSmartphone /> },
  device_untrusted: { label: 'Perangkat tidak dipercaya lagi', nada: 'neutral', icon: <MonitorSmartphone /> },
  history_export: { label: 'Riwayat diunduh', nada: 'neutral', icon: <Activity /> },
  admin_client_create: { label: 'Aplikasi dibuat', nada: 'primary', icon: <Settings2 /> },
  admin_client_update: { label: 'Aplikasi diubah', nada: 'primary', icon: <Settings2 /> },
  admin_client_delete: { label: 'Aplikasi dihapus', nada: 'danger', icon: <Settings2 /> },
  admin_client_logo: { label: 'Logo aplikasi diganti', nada: 'primary', icon: <Settings2 /> },
  admin_client_secret: { label: 'Secret aplikasi diganti', nada: 'warning', icon: <KeyRound /> },
  admin_session_revoke: { label: 'Admin mengeluarkan pengguna', nada: 'warning', icon: <MonitorSmartphone /> },
};
export const labelPeristiwa = (e: string) =>
  PERISTIWA_SSO[e] ??
  (e.startsWith('token_')
    ? { label: `Token diterbitkan (${e.slice(6).replace(/_/g, ' ')})`, nada: 'info' as Nada, icon: <KeyRound /> }
    : { label: e.replace(/_/g, ' '), nada: 'neutral' as Nada, icon: <Activity /> });

const GRUP: Array<{ value: string; label: string }> = [
  { value: 'login', label: 'Masuk & gagal masuk' },
  { value: 'logout', label: 'Keluar' },
  { value: 'authorize', label: 'Membuka aplikasi' },
  { value: 'access', label: 'Akses ditolak' },
  { value: 'password', label: 'Password' },
  { value: 'session', label: 'Sesi' },
  { value: 'token', label: 'Token' },
  { value: 'device', label: 'Perangkat' },
  { value: 'admin', label: 'Perubahan admin' },
];

export interface LogAktivitasProps {
  username?: string;
  /** Batasi ke satu aplikasi SSO. */
  clientId?: string;
  /** Kelompok awal, mis. 'login' atau 'admin'. */
  grup?: string;
  perPage?: number;
  saringan?: boolean;
  /** Klik nama pengguna (mis. buka KeamananPengguna). */
  onPilihPengguna?: (username: string) => void;
  className?: string;
}

/**
 * Linimasa aktivitas SSO terbaru dulu: masuk, gagal masuk, keluar, membuka aplikasi, reset password, sesi dicabut,
 * dan perubahan aplikasi oleh admin. Chip jumlah per peristiwa bisa diklik untuk menyaring.
 */
export function LogAktivitas({ username, clientId, grup, perPage = 30, saringan = true, onPilihPengguna, className }: LogAktivitasProps) {
  const [f, setF] = React.useState<FilterValues>(grup ? { grup } : {});
  const [event, setEvent] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const tgl = (f.tanggal ?? {}) as DateRangeValue;
  const query = {
    username: username ?? ((f.username as string) || undefined),
    client_id: clientId,
    grup: (f.grup as string) || undefined,
    event: event ?? undefined,
    q: (f.q as string)?.trim() || undefined,
    dari: tgl.from,
    sampai: tgl.to,
    page,
    per_page: perPage,
  };
  const q = useSsoQuery<BarisAudit[]>(['audit', query], (sso, signal) => sso.request('GET', '/audit', { query, signal }));
  const meta = q.meta as { total?: number; last_page?: number; per_event?: Array<{ event: string; jumlah: number }> } | undefined;
  const ubah = (v: FilterValues) => {
    setF(v);
    setEvent(null);
    setPage(1);
  };
  return (
    <div className={cn('u-audit', className)}>
      {saringan && (
        <FilterBar
          value={f}
          onValueChange={ubah}
          search={{ placeholder: 'Cari pengguna, aplikasi, IP', key: 'q' }}
          resultCount={meta?.total}
          resultLabel="peristiwa"
          fields={[
            { key: 'grup', label: 'Jenis', type: 'select', options: GRUP },
            { key: 'tanggal', label: 'Tanggal', type: 'date-range' },
          ]}
        />
      )}
      {meta?.per_event && meta.per_event.length > 1 && (
        <div className="u-audit-chips" role="group" aria-label="Saring per peristiwa">
          {meta.per_event.slice(0, 8).map((p) => {
            const l = labelPeristiwa(p.event);
            const on = event === p.event;
            return (
              <button key={p.event} type="button" data-on={on ? '' : undefined} data-tone={l.nada} onClick={() => (setEvent(on ? null : p.event), setPage(1))}>
                {l.label}
                <span>{formatNumber(p.jumlah)}</span>
              </button>
            );
          })}
        </div>
      )}
      {q.error && !q.data ? (
        <Alert
          variant="danger"
          title="Log aktivitas gagal dimuat"
          actions={
            <Button size="sm" variant="outline" onClick={q.refetch}>
              Coba lagi
            </Button>
          }
        >
          {pesanGalat(q.error)}
        </Alert>
      ) : q.loading && !q.data ? (
        <div className="u-audit-list">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} style={{ height: 52 }} />
          ))}
        </div>
      ) : !q.data?.length ? (
        <Empty bordered icon={<Activity />} title="Belum ada aktivitas" description="Tidak ada peristiwa yang cocok dengan saringan ini." />
      ) : (
        <ol className="u-audit-list" data-loading={q.loading ? '' : undefined}>
          {q.data.map((r) => {
            const l = labelPeristiwa(r.event);
            return (
              <li key={r.id}>
                <span className="u-audit-icon" data-tone={l.nada} aria-hidden>
                  {l.icon}
                </span>
                <div className="u-audit-body">
                  <p>
                    <strong>{l.label}</strong>
                    {r.username && (
                      <>
                        {' · '}
                        {onPilihPengguna ? (
                          <button type="button" className="u-audit-user" onClick={() => onPilihPengguna(r.username)}>
                            {r.username}
                          </button>
                        ) : (
                          <span className="u-audit-user">{r.username}</span>
                        )}
                      </>
                    )}
                  </p>
                  <p className="u-audit-meta">
                    {r.client_id && !clientId && <code>{r.client_id}</code>}
                    {r.ip && <span>{r.ip}</span>}
                    {r.detail && <span className="u-audit-detail">{r.detail}</span>}
                  </p>
                </div>
                <time dateTime={r.time} title={`${formatDate(r.time, 'long')} ${formatTime(r.time)}`}>
                  {formatRelative(r.time)}
                </time>
              </li>
            );
          })}
        </ol>
      )}
      {(meta?.last_page ?? 1) > 1 && <Pagination page={page} totalPages={meta!.last_page!} total={meta?.total} perPage={perPage} onPageChange={setPage} />}
    </div>
  );
}

// ================================================================ Keamanan akun pengguna
export interface KeamananPenggunaData {
  username: string;
  sessions: Array<{ id: string; device: string; user_agent: string; ip: string; last_ip?: string; auth_time: string; last_seen: string; expires_at: string }>;
  history: Array<{ time: string; status: string; device: string; ip: string; flags: string[]; suspicious: boolean }>;
}

const STATUS_LOGIN: Record<string, { label: string; nada: BadgeVariant }> = {
  ok: { label: 'Berhasil', nada: 'success' },
  gagal: { label: 'Gagal', nada: 'danger' },
  diblokir: { label: 'Diblokir', nada: 'danger' },
  diakhiri: { label: 'Sesi diakhiri', nada: 'neutral' },
};
const FLAG: Record<string, string> = {
  perangkat_baru: 'Perangkat baru',
  jaringan_baru: 'Jaringan baru',
  setelah_gagal: 'Setelah gagal',
  dipercaya: 'Perangkat tepercaya',
  ip_berubah: 'IP berubah',
  browser_lain: 'Browser lain',
};

/**
 * Keamanan akun satu pengguna untuk admin/helpdesk: sesi SSO aktif per perangkat, riwayat login dengan tanda mencurigakan,
 * dan tombol keluarkan dari semua perangkat.
 */
export function KeamananPengguna({ username, limit = 30, className }: { username: string; limit?: number; className?: string }) {
  const sso = useSsoAdmin();
  const q = useSsoQuery<KeamananPenggunaData>(['security', username, limit], (s, signal) => s.request('GET', `/users/${encodeURIComponent(username)}/security`, { query: { limit }, signal }));
  const [cabut, setCabut] = React.useState(false);
  const [info, setInfo] = React.useState<string | null>(null);
  const d = q.data;
  const kolom: DataColumn<KeamananPenggunaData['history'][number]>[] = [
    { key: 'time', header: 'Waktu', cell: (r) => `${formatDate(r.time, 'medium')} ${formatTime(r.time)}`, mobile: 'subtitle' },
    {
      key: 'status',
      header: 'Hasil',
      shrink: true,
      cell: (r) => {
        const s = STATUS_LOGIN[r.status] ?? { label: r.status, nada: 'neutral' as BadgeVariant };
        return <Badge variant={s.nada}>{s.label}</Badge>;
      },
      mobile: 'badge',
    },
    { key: 'device', header: 'Perangkat', mobile: 'title' },
    { key: 'ip', header: 'IP', cell: (r) => <code>{r.ip}</code> },
    {
      key: 'flags',
      header: 'Tanda',
      cell: (r) =>
        r.suspicious || r.flags.length ? (
          <span className="u-app-badges">
            {r.suspicious && <Badge variant="warning">Mencurigakan</Badge>}
            {r.flags.map((x) => (
              <Badge key={x} variant="outline">
                {FLAG[x] ?? x}
              </Badge>
            ))}
          </span>
        ) : (
          '–'
        ),
    },
  ];
  if (q.error && !d)
    return (
      <Alert variant="danger" title="Data keamanan akun gagal dimuat">
        {pesanGalat(q.error)}
      </Alert>
    );
  return (
    <div className={cn('u-security', className)}>
      {info && (
        <Alert variant="success" onClick={() => setInfo(null)}>
          {info}
        </Alert>
      )}
      <Panel
        title="Sesi aktif"
        description={d ? `${d.sessions.length} perangkat sedang masuk sebagai ${username}` : undefined}
        actions={
          <Button variant="destructive-soft" size="sm" disabled={!d?.sessions.length || !sso} onClick={() => setCabut(true)}>
            <LogOut /> Keluarkan dari semua perangkat
          </Button>
        }
      >
        {q.loading && !d ? (
          <Skeleton style={{ height: 96 }} />
        ) : d?.sessions.length ? (
          <ul className="u-sessions">
            {d.sessions.map((s) => (
              <li key={s.id}>
                <span className="u-sessions-icon" aria-hidden>
                  <MonitorSmartphone />
                </span>
                <div>
                  <strong>{s.device}</strong>
                  <p>
                    <code>{s.last_ip || s.ip}</code> · masuk {formatRelative(s.auth_time)} · aktif {formatRelative(s.last_seen)}
                  </p>
                </div>
                <small>berakhir {formatDate(s.expires_at, 'medium')}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="u-app-muted">Tidak ada sesi aktif.</p>
        )}
      </Panel>
      <Panel title="Riwayat login" description="Termasuk percobaan yang gagal dan tanda mencurigakan.">
        <DataTable
          columns={kolom}
          rows={d?.history}
          rowKey={(r) => `${r.time}${r.ip}${r.status}`}
          loading={q.loading}
          columnToggle={false}
          densityToggle={false}
          defaultDensity="compact"
          empty={{ title: 'Belum ada riwayat login' }}
        />
      </Panel>
      <ConfirmDialog
        open={cabut}
        onOpenChange={setCabut}
        title={`Keluarkan ${username} dari semua perangkat?`}
        description="Semua sesi SSO pengguna ini berakhir; mereka harus memasukkan password lagi. Sesi yang sudah terbuka di aplikasi lain tetap berjalan sampai sesi aplikasi itu berakhir."
        confirmLabel="Keluarkan"
        tone="danger"
        onConfirm={async () => {
          const r = await sso!.request<{ revoked: number }>('POST', `/users/${encodeURIComponent(username)}/revoke`);
          setInfo(`${formatNumber(r.data.revoked)} sesi diakhiri.`);
          invalidateSso();
        }}
      />
    </div>
  );
}
