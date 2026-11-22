'use client';
import * as React from 'react';
import { AlertTriangle, CheckCircle2, Clock, Loader2, RefreshCw, XCircle, Wrench } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatTime } from '../lib/format';
import { Button } from './actions';
import { Tooltip } from './overlays';

// ================================================================ Tipe
/** ok = normal, degraded = lambat/sebagian, down = gangguan, maintenance = pemeliharaan, off = tidak aktif, checking = sedang diperiksa. */
export type ServiceState = 'ok' | 'degraded' | 'down' | 'maintenance' | 'off' | 'checking';

export interface ServiceInfo {
  key: string;
  name: React.ReactNode;
  /** Baris kedua: alamat, keterangan, atau pesan galat. */
  description?: React.ReactNode;
  icon?: React.ReactNode;
  status: ServiceState;
  /** Ganti teks lencana, mis. "Aktif". */
  statusLabel?: string;
  /** Waktu tanggap dalam milidetik. */
  latency?: number | null;
  /** Kode HTTP atau pesan singkat saat gangguan. */
  detail?: React.ReactNode;
  /** Riwayat 30–90 hari terakhir untuk bilah uptime (urutan lama → baru). */
  history?: Array<{ date: string; status: Exclude<ServiceState, 'checking' | 'off'>; note?: string }>;
  href?: string;
}

const LABEL: Record<ServiceState, string> = { ok: 'Normal', degraded: 'Lambat', down: 'Gangguan', maintenance: 'Pemeliharaan', off: 'Nonaktif', checking: 'Memeriksa' };
const ICON: Record<ServiceState, React.ReactNode> = {
  ok: <CheckCircle2 />,
  degraded: <AlertTriangle />,
  down: <XCircle />,
  maintenance: <Wrench />,
  off: <XCircle />,
  checking: <Loader2 className="u-spin" />,
};

/** Status gabungan: gangguan > lambat > pemeliharaan > memeriksa > normal. */
export function overallStatus(states: ServiceState[]): ServiceState {
  for (const s of ['down', 'degraded', 'maintenance', 'checking'] as const) if (states.includes(s)) return s;
  return 'ok';
}

// ================================================================ Lencana & latensi
export function ServiceStatusBadge({ status, children, className }: { status: ServiceState; children?: React.ReactNode; className?: string }) {
  return (
    <span className={cn('u-svc-badge', className)} data-status={status}>
      <span className="u-svc-dot" aria-hidden />
      {children ?? LABEL[status]}
    </span>
  );
}

/** Waktu tanggap dengan warna: < lambat (bawaan 800 ms) netral, di atasnya kuning, di atas 3× merah. */
export function LatencyIndicator({ ms, slow = 800, className }: { ms?: number | null; slow?: number; className?: string }) {
  if (ms == null) return null;
  const tone = ms >= slow * 3 ? 'down' : ms >= slow ? 'degraded' : 'ok';
  return (
    <span className={cn('u-svc-latency', className)} data-tone={tone} title="Waktu tanggap">
      <Clock aria-hidden />
      {ms.toLocaleString('id-ID')} ms
    </span>
  );
}

// ================================================================ Banner
export interface StatusBannerProps {
  status: ServiceState;
  title?: React.ReactNode;
  /** Waktu pemeriksaan terakhir. */
  checkedAt?: Date | null;
  /** Teks tambahan, mis. "diperbarui tiap menit". */
  note?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}
const TITLE: Record<ServiceState, string> = {
  ok: 'Semua layanan berjalan normal',
  degraded: 'Sebagian layanan melambat',
  down: 'Sebagian layanan terganggu',
  maintenance: 'Sedang ada pemeliharaan terjadwal',
  off: 'Layanan tidak aktif',
  checking: 'Memeriksa layanan…',
};
/** Spanduk status keseluruhan, seperti halaman status layanan. */
export function StatusBanner({ status, title, checkedAt, note, action, className }: StatusBannerProps) {
  return (
    <div className={cn('u-status-banner', className)} data-status={status} role="status" aria-live="polite">
      <span className="u-status-banner-icon">{ICON[status]}</span>
      <div className="u-status-banner-text">
        <p className="u-status-banner-title">{title ?? TITLE[status]}</p>
        {(checkedAt || note) && (
          <p className="u-status-banner-note">
            {checkedAt && <>Diperiksa {formatTime(checkedAt)}</>}
            {checkedAt && note && ' · '}
            {note}
          </p>
        )}
      </div>
      {action && <div className="u-status-banner-action">{action}</div>}
    </div>
  );
}

// ================================================================ Bilah uptime
export function UptimeBar({ history, label }: { history: NonNullable<ServiceInfo['history']>; label?: string }) {
  const ok = history.filter((h) => h.status === 'ok').length;
  const pct = history.length ? (ok / history.length) * 100 : 100;
  return (
    <div className="u-uptime">
      <div className="u-uptime-bars" role="img" aria-label={`${label ?? 'Ketersediaan'} ${pct.toFixed(2)}% dalam ${history.length} hari`}>
        {history.map((h) => (
          <Tooltip key={h.date} content={`${h.date}: ${h.note ?? LABEL[h.status]}`}>
            <span className="u-uptime-bar" data-status={h.status} />
          </Tooltip>
        ))}
      </div>
      <div className="u-uptime-legend">
        <span>{history.length} hari lalu</span>
        <span>{pct.toFixed(pct === 100 ? 0 : 2)}% tersedia</span>
        <span>Hari ini</span>
      </div>
    </div>
  );
}

// ================================================================ Daftar layanan
export interface ServiceListProps {
  services: ServiceInfo[];
  /** Ambang lambat untuk warna latensi. */
  slowMs?: number;
  className?: string;
}
/** Daftar layanan: ikon, nama, alamat/keterangan, latensi, dan lencana status. */
export function ServiceList({ services, slowMs, className }: ServiceListProps) {
  return (
    <ul className={cn('u-svc-list', className)}>
      {services.map((s) => (
        <li key={s.key} className="u-svc-row" data-status={s.status}>
          <div className="u-svc-main">
            {s.icon && <span className="u-svc-icon">{s.icon}</span>}
            <div className="u-svc-text">
              <p className="u-svc-name">{s.href ? <a href={s.href}>{s.name}</a> : s.name}</p>
              {s.description && <p className="u-svc-desc">{s.description}</p>}
            </div>
            <LatencyIndicator ms={s.status === 'checking' ? null : s.latency} slow={slowMs} className="u-svc-hide-sm" />
            <ServiceStatusBadge status={s.status}>
              {s.statusLabel ?? LABEL[s.status]}
              {s.detail && s.status !== 'ok' ? <span className="u-svc-detail"> ({s.detail})</span> : null}
            </ServiceStatusBadge>
          </div>
          {s.history && s.history.length > 0 && <UptimeBar history={s.history} label={typeof s.name === 'string' ? s.name : undefined} />}
        </li>
      ))}
    </ul>
  );
}

// ================================================================ Pemeriksa
export interface ServiceCheck {
  key: string;
  name: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  href?: string;
  /**
   * Fungsi pemeriksa. Lempar galat bila gagal; kembalikan objek untuk menimpa hasil
   * (mis. { status: 'degraded', detail: 'antrean penuh' }). Latensi diukur otomatis.
   */
  check: (signal: AbortSignal) => Promise<void | Partial<Pick<ServiceInfo, 'status' | 'detail' | 'description'>>>;
}

/** Periksa beberapa layanan sekaligus, ukur latensi, dan ulangi tiap `intervalMs` (0 = tidak otomatis). */
export function useServiceChecks(checks: ServiceCheck[], { intervalMs = 60_000, timeoutMs = 10_000, slowMs = 2_000 }: { intervalMs?: number; timeoutMs?: number; slowMs?: number } = {}) {
  const [results, setResults] = React.useState<Record<string, Partial<ServiceInfo>>>({});
  const [checking, setChecking] = React.useState(false);
  const [checkedAt, setCheckedAt] = React.useState<Date | null>(null);
  const ref = React.useRef(checks);
  ref.current = checks;
  const run = React.useCallback(async () => {
    setChecking(true);
    const out: Record<string, Partial<ServiceInfo>> = {};
    await Promise.all(
      ref.current.map(async (c) => {
        const signal = AbortSignal.timeout(Math.max(1, timeoutMs));
        const t = performance.now();
        try {
          const r = (await c.check(signal)) || {};
          const ms = Math.round(performance.now() - t);
          out[c.key] = { status: ms > slowMs ? 'degraded' : 'ok', latency: ms, ...r };
        } catch (e) {
          const err = e as { status?: number; name?: string; message?: string };
          out[c.key] = { status: 'down', latency: Math.round(performance.now() - t), detail: signal.aborted ? 'waktu habis' : err?.status ? String(err.status) : err?.message?.slice(0, 40) };
        }
      }),
    );
    setResults(out);
    setCheckedAt(new Date());
    setChecking(false);
  }, [timeoutMs, slowMs]);
  React.useEffect(() => {
    void run();
    if (!intervalMs) return;
    const id = setInterval(() => void run(), intervalMs);
    return () => clearInterval(id);
  }, [run, intervalMs]);
  const services: ServiceInfo[] = checks.map((c) => ({ key: c.key, name: c.name, description: c.description, icon: c.icon, href: c.href, status: 'checking', ...results[c.key] }) as ServiceInfo);
  return { services, checking, checkedAt, recheck: run, status: checkedAt ? overallStatus(services.map((s) => s.status)) : ('checking' as ServiceState) };
}

// ================================================================ Panel lengkap
export interface ServiceStatusPanelProps {
  checks: ServiceCheck[];
  intervalMs?: number;
  /** Ambang lambat (ms). Bawaan 2000. */
  slowMs?: number;
  title?: React.ReactNode;
  className?: string;
}
/** Panel status siap pakai: banner + daftar layanan + tombol Periksa ulang, dengan pemeriksaan otomatis. */
export function ServiceStatusPanel({ checks, intervalMs = 60_000, slowMs = 2_000, title, className }: ServiceStatusPanelProps) {
  const { services, checking, checkedAt, recheck, status } = useServiceChecks(checks, { intervalMs, slowMs });
  const tiap = intervalMs >= 60_000 ? `tiap ${Math.round(intervalMs / 60_000)} menit` : `tiap ${Math.round(intervalMs / 1000)} detik`;
  return (
    <div className={cn('u-status-panel', className)}>
      <StatusBanner status={status} title={title} checkedAt={checkedAt} note={intervalMs ? `diperbarui ${tiap.replace('tiap 1 menit', 'tiap menit')}` : undefined} />
      <ServiceList services={services} slowMs={slowMs / 2} />
      <div className="u-status-panel-footer">
        <Button variant="outline" size="sm" loading={checking} onClick={() => void recheck()}>
          {!checking && <RefreshCw />} Periksa ulang
        </Button>
      </div>
    </div>
  );
}
