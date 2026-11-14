'use client';
import * as React from 'react';
import { ArrowDownRight, ArrowUpRight, Check, Minus } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { formatNumber } from '../lib/format';
import { Skeleton } from './actions';

/**
 * Grafik ringan tanpa pustaka luar (SVG + CSS). Warna kategori memakai --u-chart-1 … --u-chart-8 dengan urutan tetap
 * (sudah diuji aman untuk buta warna pada mode terang dan gelap). Grafik satu seri memakai --u-primary.
 * Semua grafik punya tooltip saat disorot dan nilai tertulis di legenda, jadi warna tidak pernah satu-satunya penanda.
 */
export const CHART_COLORS = Array.from({ length: 8 }, (_, i) => `var(--u-chart-${i + 1})`);
export const chartColor = (i: number) => CHART_COLORS[i % CHART_COLORS.length]!;

const fmt = (n: number | null | undefined, f?: (n: number) => string) => (n == null ? '–' : f ? f(n) : formatNumber(n));

// ================================================================ Tooltip bersama
interface Tip {
  x: number;
  y: number;
  content: React.ReactNode;
}
function useTip() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [tip, setTip] = React.useState<Tip | null>(null);
  const show = (e: React.PointerEvent | React.FocusEvent, content: React.ReactNode) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const t = (e.target as Element).getBoundingClientRect();
    const px = 'clientX' in e && e.pointerType === 'mouse' ? e.clientX : t.left + t.width / 2;
    setTip({ x: px - box.left, y: t.top - box.top, content });
  };
  const el = tip ? (
    <div className="u-chart-tip" role="status" style={{ left: tip.x, top: tip.y }}>
      {tip.content}
    </div>
  ) : null;
  /** Tampilkan di koordinat layar (clientX/clientY). */
  const showAt = (clientX: number, clientY: number, content: React.ReactNode) => {
    const box = ref.current?.getBoundingClientRect();
    if (box) setTip({ x: clientX - box.left, y: clientY - box.top, content });
  };
  return { ref, show, showAt, hide: () => setTip(null), el };
}

// ================================================================ Sparkline
export function Sparkline({
  data,
  width = 96,
  height = 28,
  tone = 'var(--u-primary)',
  area = true,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  tone?: string;
  area?: boolean;
  className?: string;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * (width - 4) + 2, height - 3 - ((v - min) / span) * (height - 6)] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1]!;
  return (
    <svg className={cn('u-spark', className)} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ color: tone }}>
      {area && <path d={`${d} L${last[0]} ${height} L${pts[0]![0]} ${height} Z`} fill="currentColor" opacity={0.12} />}
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.75} fill="currentColor" stroke="var(--u-card)" strokeWidth={1.5} />
    </svg>
  );
}

// ================================================================ Kartu statistik
export interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Perubahan dibanding periode lalu, mis. 12.5 (persen) atau -3. */
  delta?: number | null;
  deltaLabel?: React.ReactNode;
  /** Naik itu buruk (mis. jumlah DO): warna delta dibalik. */
  inverse?: boolean;
  /** Satuan delta. Bawaan '%'. */
  deltaUnit?: string;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  trend?: number[];
  /** Isi kecil di bawah, mis. Progress. */
  footer?: React.ReactNode;
  href?: string;
  loading?: boolean;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
}

/** Kartu angka utama: label, nilai besar, perubahan naik/turun dengan ikon, sparkline, dan keterangan. */
export function StatCard({ label, value, delta, deltaLabel = 'dari periode lalu', inverse, deltaUnit = '%', hint, icon, trend, footer, href, loading, tone = 'primary', className }: StatCardProps) {
  const arah = delta == null ? null : delta > 0 ? 'naik' : delta < 0 ? 'turun' : 'tetap';
  const baik = arah === 'tetap' || arah == null ? null : (arah === 'naik') !== !!inverse;
  const Tag = href ? 'a' : 'div';
  return (
    <Tag className={cn('u-stat', className)} data-tone={tone} {...(href ? { href } : {})}>
      <div className="u-stat-top">
        <span className="u-stat-label">{label}</span>
        {icon && <span className="u-stat-icon">{icon}</span>}
      </div>
      {loading ? (
        <Skeleton style={{ height: 30, width: '55%' }} />
      ) : (
        <div className="u-stat-row">
          <span className="u-stat-value">{value}</span>
          {trend && trend.length > 1 && <Sparkline data={trend} tone={`var(--u-${tone === 'neutral' ? 'muted-foreground' : tone})`} />}
        </div>
      )}
      {(arah || hint) && !loading && (
        <div className="u-stat-foot">
          {arah && (
            <span className="u-stat-delta" data-good={baik == null ? undefined : String(baik)}>
              {arah === 'naik' ? <ArrowUpRight aria-hidden /> : arah === 'turun' ? <ArrowDownRight aria-hidden /> : <Minus aria-hidden />}
              <span className="u-sr-only">{arah} </span>
              {formatNumber(Math.abs(delta!), { maximumFractionDigits: 1 })}
              {deltaUnit}
            </span>
          )}
          {arah && <span>{deltaLabel}</span>}
          {hint && <span>{hint}</span>}
        </div>
      )}
      {footer}
    </Tag>
  );
}

/**
 * Grid kartu statistik. Jumlah kolom dihitung dari lebar wadah lalu diseimbangkan, jadi 5 kartu jadi 3+2 dan 6 kartu jadi 3+3,
 * bukan 4+1 atau 4+2.
 */
export function StatGrid({ children, min = 200, className }: { children: React.ReactNode; min?: number; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const n = React.Children.toArray(children).filter(Boolean).length;
  const [cols, setCols] = React.useState<number | null>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const hitung = () => {
      const gap = parseFloat(getComputedStyle(el).columnGap) || 16;
      const muat = Math.max(1, Math.floor((el.clientWidth + gap) / (min + gap)));
      if (muat >= n) return setCols(n);
      const baris = Math.ceil(n / muat);
      setCols(Math.ceil(n / baris));
    };
    hitung();
    const ro = new ResizeObserver(hitung);
    ro.observe(el);
    return () => ro.disconnect();
  }, [min, n]);
  return (
    <div ref={ref} className={cn('u-stat-grid', className)} style={{ '--min': `${min}px`, ...(cols ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } : {}) } as React.CSSProperties}>
      {children}
    </div>
  );
}

// ================================================================ Grafik batang (vertikal, satu seri)
export interface BarChartProps {
  data: Array<{ label: string; value: number; /** Label panjang untuk tooltip. */ title?: string }>;
  height?: number;
  format?: (n: number) => string;
  /** Tandai batang terakhir (mis. periode berjalan). */
  highlightLast?: boolean;
  tone?: string;
  /** Tampilkan nilai di atas batang tertinggi dan terakhir. */
  labels?: boolean;
  loading?: boolean;
  className?: string;
  'aria-label'?: string;
}

/** Batang vertikal untuk tren per periode (semester, bulan, hari). Garis bantu tipis, tooltip per batang. */
export function BarChart({ data, height = 180, format, highlightLast, tone = 'var(--u-primary)', labels = true, loading, className, ...aria }: BarChartProps) {
  const tip = useTip();
  if (loading) return <Skeleton className={className} style={{ height, width: '100%' }} />;
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = niceMax(max);
  const imax = data.reduce((b, d, i) => (d.value > data[b]!.value ? i : b), 0);
  const step = data.length > 16 ? Math.ceil(data.length / 8) : 1;
  return (
    <div className={cn('u-bars', className)} ref={tip.ref} role="img" aria-label={aria['aria-label'] ?? data.map((d) => `${d.title ?? d.label}: ${fmt(d.value, format)}`).join(', ')}>
      <div className="u-bars-plot" style={{ height }}>
        {[0, 0.5, 1].map((g) => (
          <span key={g} className="u-bars-grid" style={{ bottom: `${g * 100}%` }}>
            <span>{fmt(nice * g, format)}</span>
          </span>
        ))}
        <div className="u-bars-cols">
          {data.map((d, i) => (
            <div
              key={i}
              className="u-bars-col"
              tabIndex={0}
              onPointerEnter={(e) => tip.show(e, <TipBody label={d.title ?? d.label} value={fmt(d.value, format)} />)}
              onPointerLeave={tip.hide}
              onFocus={(e) => tip.show(e, <TipBody label={d.title ?? d.label} value={fmt(d.value, format)} />)}
              onBlur={tip.hide}
            >
              <span className="u-bars-bar" data-last={dataFlag(highlightLast && i === data.length - 1)} style={{ height: `${(d.value / nice) * 100}%`, background: tone }}>
                {labels && (i === imax || (highlightLast && i === data.length - 1)) && d.value > 0 && <span className="u-bars-val">{fmt(d.value, format)}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="u-bars-x" aria-hidden data-many={data.length > 6 ? '' : undefined}>
        {data.map((d, i) => (
          <span key={i}>{i % step === 0 || i === data.length - 1 ? d.label : ''}</span>
        ))}
      </div>
      {tip.el}
    </div>
  );
}

// ================================================================ Batang berkelompok (2–4 seri)
export interface ChartSeries {
  label: string;
  /** Nilai per titik, urut sama dengan `labels`. */
  values: number[];
  color?: string;
}

/** Batang berkelompok untuk membandingkan 2–4 seri per periode (mis. surat masuk vs keluar per bulan). Legenda berisi total tiap seri. */
export function GroupedBarChart({
  labels,
  titles,
  series,
  height = 180,
  format,
  loading,
  className,
}: {
  labels: string[];
  /** Label panjang untuk tooltip. */ titles?: string[];
  series: ChartSeries[];
  height?: number;
  format?: (n: number) => string;
  loading?: boolean;
  className?: string;
}) {
  const tip = useTip();
  if (loading) return <Skeleton className={className} style={{ height, width: '100%' }} />;
  const nice = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const step = labels.length > 16 ? Math.ceil(labels.length / 8) : 1;
  const isi = (i: number) => (
    <>
      <span className="u-chart-tip-label">{titles?.[i] ?? labels[i]}</span>
      {series.map((s, j) => (
        <span key={j} className="u-chart-tip-row">
          <i style={{ background: s.color ?? chartColor(j) }} />
          {s.label}
          <b>{fmt(s.values[i], format)}</b>
        </span>
      ))}
    </>
  );
  return (
    <div
      className={cn('u-bars', className)}
      ref={tip.ref}
      role="img"
      aria-label={labels.map((l, i) => `${titles?.[i] ?? l}: ${series.map((s) => `${s.label} ${fmt(s.values[i], format)}`).join(', ')}`).join('; ')}
    >
      <ul className="u-legend" data-inline="" aria-hidden>
        {series.map((s, j) => (
          <li key={j}>
            <i style={{ background: s.color ?? chartColor(j) }} />
            <span className="u-legend-label">{s.label}</span>
            <span className="u-legend-value">
              {fmt(
                s.values.reduce((a, b) => a + b, 0),
                format,
              )}
            </span>
          </li>
        ))}
      </ul>
      <div className="u-bars-plot" style={{ height }}>
        {[0, 0.5, 1].map((g) => (
          <span key={g} className="u-bars-grid" style={{ bottom: `${g * 100}%` }}>
            <span>{fmt(nice * g, format)}</span>
          </span>
        ))}
        <div className="u-bars-cols">
          {labels.map((_, i) => (
            <div key={i} className="u-bars-col" data-group="" tabIndex={0} onPointerEnter={(e) => tip.show(e, isi(i))} onPointerLeave={tip.hide} onFocus={(e) => tip.show(e, isi(i))} onBlur={tip.hide}>
              {series.map((s, j) => (
                <span key={j} className="u-bars-bar" style={{ height: `${((s.values[i] ?? 0) / nice) * 100}%`, background: s.color ?? chartColor(j) }} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="u-bars-x" aria-hidden data-many={labels.length > 6 ? '' : undefined}>
        {labels.map((l, i) => (
          <span key={i}>{i % step === 0 || i === labels.length - 1 ? l : ''}</span>
        ))}
      </div>
      {tip.el}
    </div>
  );
}

// ================================================================ Garis (1–4 seri, harian)
/** Garis untuk deret harian/mingguan. Garis bantu silang dan tooltip semua seri saat disorot; legenda berisi total. */
export function LineChart({
  labels,
  titles,
  series,
  height = 180,
  format,
  area = true,
  loading,
  legendValue = 'total',
  max,
  className,
}: {
  labels: string[];
  titles?: string[];
  series: ChartSeries[];
  height?: number;
  format?: (n: number) => string;
  area?: boolean;
  loading?: boolean;
  /** Angka di legenda: jumlah seluruh titik (bawaan), nilai titik terakhir, atau tanpa angka. */
  legendValue?: 'total' | 'akhir' | 'tidak';
  /** Batas atas sumbu Y (mis. 4 untuk IPK). Bawaan dibulatkan dari data. */
  max?: number;
  className?: string;
}) {
  const tip = useTip();
  const [aktif, setAktif] = React.useState<number | null>(null);
  const plot = React.useRef<HTMLDivElement>(null);
  if (loading) return <Skeleton className={className} style={{ height, width: '100%' }} />;
  const n = labels.length;
  const nice = max ?? niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const W = 1000;
  const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => height - (v / nice) * (height - 4) - 2;
  const step = n > 12 ? Math.ceil(n / 6) : 1;
  const isi = (i: number) => (
    <>
      <span className="u-chart-tip-label">{titles?.[i] ?? labels[i]}</span>
      {series.map((s, j) => (
        <span key={j} className="u-chart-tip-row">
          <i style={{ background: s.color ?? (series.length === 1 ? 'var(--u-primary)' : chartColor(j)) }} />
          {s.label}
          <b>{fmt(s.values[i], format)}</b>
        </span>
      ))}
    </>
  );
  const sorot = (e: React.PointerEvent) => {
    const box = plot.current?.getBoundingClientRect();
    if (!box || n === 0) return;
    const i = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - box.left) / box.width) * (n - 1))));
    setAktif(i);
    tip.showAt(box.left + (x(i) / W) * box.width, box.top, isi(i));
  };
  return (
    <div
      className={cn('u-line', className)}
      ref={tip.ref}
      role="img"
      aria-label={series
        .map(
          (s) =>
            `${s.label}: total ${fmt(
              s.values.reduce((a, b) => a + b, 0),
              format,
            )}`,
        )
        .join('; ')}
    >
      {series.length > 1 && (
        <ul className="u-legend" data-inline="" aria-hidden>
          {series.map((s, j) => (
            <li key={j}>
              <i style={{ background: s.color ?? chartColor(j) }} />
              <span className="u-legend-label">{s.label}</span>
              {legendValue !== 'tidak' && <span className="u-legend-value">{fmt(legendValue === 'akhir' ? (s.values[s.values.length - 1] ?? 0) : s.values.reduce((a, b) => a + b, 0), format)}</span>}
            </li>
          ))}
        </ul>
      )}
      <div className="u-bars-plot" style={{ height }} ref={plot} onPointerMove={sorot} onPointerLeave={() => (setAktif(null), tip.hide())}>
        {[0, 0.5, 1].map((g) => (
          <span key={g} className="u-bars-grid" style={{ bottom: `${g * 100}%` }}>
            <span>{fmt(nice * g, format)}</span>
          </span>
        ))}
        <svg className="u-line-svg" viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" width="100%" height={height} aria-hidden>
          {series.map((s, j) => {
            const c = s.color ?? (series.length === 1 ? 'var(--u-primary)' : chartColor(j));
            const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
            return (
              <g key={j} style={{ color: c }}>
                {area && series.length === 1 && <path d={`${d} L${x(n - 1)} ${height} L${x(0)} ${height} Z`} fill="currentColor" opacity={0.1} />}
                <path d={d} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
              </g>
            );
          })}
        </svg>
        {aktif != null && (
          <>
            <span className="u-line-cross" style={{ left: `${(x(aktif) / W) * 100}%` }} />
            {series.map((s, j) => (
              <span
                key={j}
                className="u-line-dot"
                style={{ left: `${(x(aktif) / W) * 100}%`, top: y(s.values[aktif] ?? 0), background: s.color ?? (series.length === 1 ? 'var(--u-primary)' : chartColor(j)) }}
              />
            ))}
          </>
        )}
      </div>
      <div className="u-line-x" aria-hidden>
        {labels.map((l, i) =>
          i % step === 0 || i === n - 1 ? (
            <span key={i} style={{ left: `${(x(i) / W) * 100}%` }} data-edge={i === 0 ? 'start' : i === n - 1 ? 'end' : undefined}>
              {l}
            </span>
          ) : null,
        )}
      </div>
      {tip.el}
    </div>
  );
}

function niceMax(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function TipBody({ label, value, color, extra }: { label: React.ReactNode; value: React.ReactNode; color?: string; extra?: React.ReactNode }) {
  return (
    <>
      <span className="u-chart-tip-label">
        {color && <i style={{ background: color }} />}
        {label}
      </span>
      <b>{value}</b>
      {extra && <span className="u-chart-tip-extra">{extra}</span>}
    </>
  );
}

// ================================================================ Daftar batang (horizontal, peringkat)
export interface BarListItem {
  label: React.ReactNode;
  value: number;
  /** Nilai kedua yang ditampilkan, mis. persen. */
  secondary?: React.ReactNode;
  href?: string;
  color?: string;
}

/** Batang horizontal berperingkat: label di kiri, nilai di kanan. Cocok untuk per prodi, per unit, per sumber. */
export function BarList({
  items,
  format,
  max: maxProp,
  limit,
  loading,
  empty = 'Belum ada data.',
  className,
}: {
  items: BarListItem[];
  format?: (n: number) => string;
  max?: number;
  limit?: number;
  loading?: boolean;
  empty?: React.ReactNode;
  className?: string;
}) {
  if (loading)
    return (
      <div className={cn('u-barlist', className)}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} style={{ height: 28, width: `${90 - i * 15}%` }} />
        ))}
      </div>
    );
  const list = limit ? items.slice(0, limit) : items;
  if (!list.length) return <div className="u-chart-empty">{empty}</div>;
  const max = maxProp ?? Math.max(1, ...list.map((i) => i.value));
  return (
    <ul className={cn('u-barlist', className)}>
      {list.map((it, i) => {
        const Tag = it.href ? 'a' : 'div';
        return (
          <li key={i}>
            <Tag className="u-barlist-row" {...(it.href ? { href: it.href } : {})}>
              <span className="u-barlist-fill" style={{ width: `${Math.max(1.5, (it.value / max) * 100)}%`, background: it.color }} aria-hidden />
              <span className="u-barlist-label">{it.label}</span>
            </Tag>
            <span className="u-barlist-value">
              {fmt(it.value, format)}
              {it.secondary != null && <span>{it.secondary}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ================================================================ Donat
export interface DonutSegment {
  label: string;
  value: number;
  color?: string;
}

/** Donat komposisi (≤ 6 bagian; sisanya digabung "Lainnya"), angka total di tengah, legenda dengan nilai dan persen. */
export function DonutChart({
  data,
  size = 148,
  thickness = 18,
  centerLabel = 'Total',
  centerValue,
  format,
  maxSegments = 6,
  loading,
  className,
}: {
  data: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: React.ReactNode;
  centerValue?: React.ReactNode;
  format?: (n: number) => string;
  maxSegments?: number;
  loading?: boolean;
  className?: string;
}) {
  const tip = useTip();
  if (loading)
    return (
      <div className={cn('u-donut', className)}>
        <Skeleton shape="circle" style={{ width: size, height: size }} />
      </div>
    );
  const sorted = data.filter((d) => d.value > 0);
  let segs = sorted;
  if (sorted.length > maxSegments) {
    const rest = [...sorted].sort((a, b) => b.value - a.value);
    const keep = new Set(rest.slice(0, maxSegments - 1));
    segs = [...sorted.filter((d) => keep.has(d)), { label: 'Lainnya', value: rest.slice(maxSegments - 1).reduce((s, d) => s + d.value, 0), color: 'var(--u-muted-foreground)' }];
  }
  const total = segs.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const gap = segs.length > 1 ? 2 : 0;
  let acc = 0;
  return (
    <div className={cn('u-donut', className)} ref={tip.ref}>
      <div className="u-donut-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={segs.map((s) => `${s.label}: ${fmt(s.value, format)}`).join(', ')}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--u-muted)" strokeWidth={thickness} />
          {segs.map((s, i) => {
            const len = total ? (s.value / total) * c : 0;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color ?? chartColor(i)}
                strokeWidth={thickness}
                strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
                strokeDashoffset={-acc}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className="u-donut-seg"
                onPointerEnter={(e) => tip.show(e, <TipBody label={s.label} color={s.color ?? chartColor(i)} value={fmt(s.value, format)} extra={`${((s.value / total) * 100).toFixed(1)}%`} />)}
                onPointerLeave={tip.hide}
              />
            );
            acc += len;
            return el;
          })}
        </svg>
        <span className="u-donut-center">
          <b data-long={String(centerValue ?? fmt(total, format)).length > 6 ? '' : undefined}>{centerValue ?? fmt(total, format)}</b>
          <span>{centerLabel}</span>
        </span>
      </div>
      <ul className="u-legend">
        {segs.map((s, i) => (
          <li key={i}>
            <i style={{ background: s.color ?? chartColor(i) }} aria-hidden />
            <span className="u-legend-label">{s.label}</span>
            <span className="u-legend-value">
              {fmt(s.value, format)}
              <span>{total ? `${Math.round((s.value / total) * 100)}%` : ''}</span>
            </span>
          </li>
        ))}
      </ul>
      {tip.el}
    </div>
  );
}

// ================================================================ Batang bertumpuk 100% (komposisi satu baris)
/** Satu bilah komposisi (mis. status kegiatan) dengan legenda bernilai. */
export function SegmentBar({ data, format, className }: { data: DonutSegment[]; format?: (n: number) => string; className?: string }) {
  const tip = useTip();
  const segs = data.filter((d) => d.value > 0);
  const total = segs.reduce((s, d) => s + d.value, 0);
  return (
    <div className={cn('u-segbar', className)} ref={tip.ref}>
      <div className="u-segbar-track" role="img" aria-label={segs.map((s) => `${s.label}: ${fmt(s.value, format)}`).join(', ')}>
        {segs.map((s, i) => (
          <span
            key={i}
            style={{ flexGrow: s.value, background: s.color ?? chartColor(i) }}
            onPointerEnter={(e) => tip.show(e, <TipBody label={s.label} color={s.color ?? chartColor(i)} value={fmt(s.value, format)} extra={`${((s.value / total) * 100).toFixed(1)}%`} />)}
            onPointerLeave={tip.hide}
          />
        ))}
      </div>
      <ul className="u-legend" data-inline="">
        {segs.map((s, i) => (
          <li key={i}>
            <i style={{ background: s.color ?? chartColor(i) }} aria-hidden />
            <span className="u-legend-label">{s.label}</span>
            <span className="u-legend-value">{fmt(s.value, format)}</span>
          </li>
        ))}
      </ul>
      {tip.el}
    </div>
  );
}

// ================================================================ Corong (funnel)
export interface FunnelStage {
  label: React.ReactNode;
  value: number;
  hint?: React.ReactNode;
}

/** Corong tahapan (mis. PMB: akun → diajukan → terverifikasi → lulus → daftar ulang) dengan persen lanjut antar tahap. */
export function Funnel({ stages, format, loading, className }: { stages: FunnelStage[]; format?: (n: number) => string; loading?: boolean; className?: string }) {
  if (loading)
    return (
      <div className={cn('u-funnel', className)}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} style={{ height: 40, width: `${100 - i * 18}%` }} />
        ))}
      </div>
    );
  const top = Math.max(1, stages[0]?.value ?? 1);
  return (
    <ol className={cn('u-funnel', className)}>
      {stages.map((s, i) => {
        const prev = i > 0 ? stages[i - 1]!.value : null;
        const conv = prev ? Math.round((s.value / prev) * 100) : null;
        return (
          <li key={i}>
            <div className="u-funnel-bar" style={{ width: `${Math.max(6, (s.value / top) * 100)}%` }} />
            <div className="u-funnel-text">
              <span className="u-funnel-label">{s.label}</span>
              <span className="u-funnel-value">{fmt(s.value, format)}</span>
            </div>
            {conv != null && (
              <span className="u-funnel-conv" title="Lanjut dari tahap sebelumnya">
                {conv}%
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ================================================================ Anggaran vs realisasi
/** Meteran realisasi terhadap target (mis. serapan anggaran): terpakai, dalam proses, dan sisa. */
export function BudgetMeter({
  target,
  used,
  pending = 0,
  format,
  label,
  className,
}: {
  target: number;
  used: number;
  pending?: number;
  format?: (n: number) => string;
  label?: React.ReactNode;
  className?: string;
}) {
  const p = (n: number) => (target > 0 ? Math.min(100, (n / target) * 100) : 0);
  const pct = target > 0 ? (used / target) * 100 : 0;
  const sisa = Math.max(0, target - used - pending);
  return (
    <div className={cn('u-budget', className)}>
      <div className="u-budget-head">
        {label && <span className="u-budget-label">{label}</span>}
        <b>{pct.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%</b>
      </div>
      <div className="u-budget-track" role="img" aria-label={`Terpakai ${fmt(used, format)} dari ${fmt(target, format)}`}>
        <span className="u-budget-used" style={{ width: `${p(used)}%` }} />
        {pending > 0 && <span className="u-budget-pending" style={{ width: `${p(pending)}%` }} />}
      </div>
      <dl className="u-budget-legend">
        <div>
          <dt>
            <i data-k="used" /> Terpakai
          </dt>
          <dd>{fmt(used, format)}</dd>
        </div>
        {pending > 0 && (
          <div>
            <dt>
              <i data-k="pending" /> Dalam proses
            </dt>
            <dd>{fmt(pending, format)}</dd>
          </div>
        )}
        <div>
          <dt>
            <i data-k="sisa" /> Sisa
          </dt>
          <dd>{fmt(sisa, format)}</dd>
        </div>
      </dl>
    </div>
  );
}

// ================================================================ Siklus / tahapan dengan status
export interface CycleStep {
  label: React.ReactNode;
  done: boolean;
  detail?: React.ReactNode;
}

/** Tahapan siklus (mis. PPEPP SPMI) dengan tanda terpenuhi dan bukti singkat. */
export function CycleSteps({ steps, className }: { steps: CycleStep[]; className?: string }) {
  return (
    <ol className={cn('u-cycle', className)}>
      {steps.map((s, i) => (
        <li key={i} data-done={dataFlag(s.done)}>
          <span className="u-cycle-mark" aria-hidden>
            {s.done ? <Check /> : i + 1}
          </span>
          <span className="u-cycle-label">
            {s.label}
            <span className="u-sr-only">{s.done ? ' (terpenuhi)' : ' (belum)'}</span>
          </span>
          {s.detail && <span className="u-cycle-detail">{s.detail}</span>}
        </li>
      ))}
    </ol>
  );
}

// ================================================================ Panel dasbor
/** Bingkai widget dasbor: judul, keterangan, aksi kanan, isi. */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
  span,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Lebar kolom di DashboardGrid. */ span?: 1 | 2 | 3 | 'full';
}) {
  return (
    <section className={cn('u-panel', className)} data-span={span}>
      {(title || actions) && (
        <header className="u-panel-head">
          <div>
            {title && <h3 className="u-panel-title">{title}</h3>}
            {description && <p className="u-panel-desc">{description}</p>}
          </div>
          {actions && <div className="u-panel-actions">{actions}</div>}
        </header>
      )}
      <div className="u-panel-body">{children}</div>
    </section>
  );
}

/** Grid dasbor 3 kolom yang turun ke 2 dan 1 kolom sesuai lebar wadah. Anak bisa diberi `span` lewat Panel. */
export function DashboardGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('u-dash-wrap', className)}>
      <div className="u-dash">{children}</div>
    </div>
  );
}

// ================================================================ Daftar tindakan
export interface ActionItem {
  key?: string;
  label: React.ReactNode;
  count: number;
  description?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  /** warning bila ada antrean, danger untuk yang lewat batas. Bawaan: warning saat count > 0. */
  tone?: 'neutral' | 'warning' | 'danger' | 'info';
}

/** Antrean kerja yang perlu ditangani (mis. usulan menunggu review). Baris bernilai nol diredam, bukan disembunyikan. */
export function ActionList({ items, loading, className }: { items: ActionItem[]; loading?: boolean; className?: string }) {
  if (loading) return <Skeleton className={className} style={{ height: items.length * 44 || 132 }} />;
  return (
    <ul className={cn('u-actions-list', className)}>
      {items.map((it, i) => {
        const tone = it.tone ?? (it.count > 0 ? 'warning' : 'neutral');
        const isi = (
          <>
            {it.icon && (
              <span className="u-actions-icon" aria-hidden>
                {it.icon}
              </span>
            )}
            <span className="u-actions-text">
              <span className="u-actions-label">{it.label}</span>
              {it.description && <span className="u-actions-desc">{it.description}</span>}
            </span>
            <span className="u-actions-count" data-tone={it.count > 0 ? tone : 'neutral'}>
              {formatNumber(it.count)}
            </span>
          </>
        );
        return (
          <li key={it.key ?? i} data-zero={dataFlag(it.count === 0)}>
            {it.href ? (
              <a href={it.href} className="u-actions-row">
                {isi}
              </a>
            ) : it.onClick ? (
              <button type="button" className="u-actions-row" onClick={it.onClick}>
                {isi}
              </button>
            ) : (
              <div className="u-actions-row">{isi}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ================================================================ Linimasa aktivitas
export interface FeedItem {
  id: React.Key;
  title: React.ReactNode;
  meta?: React.ReactNode;
  time?: React.ReactNode;
  icon?: React.ReactNode;
  href?: string;
}

/** Linimasa ringkas (aktivitas terbaru, antrean review, jadwal terbit). */
export function ActivityFeed({ items, loading, empty = 'Belum ada aktivitas.', className }: { items: FeedItem[]; loading?: boolean; empty?: React.ReactNode; className?: string }) {
  if (loading)
    return (
      <div className={cn('u-feed', className)}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} style={{ height: 40 }} />
        ))}
      </div>
    );
  if (!items.length) return <p className="u-chart-empty">{empty}</p>;
  return (
    <ol className={cn('u-feed', className)}>
      {items.map((it) => (
        <li key={it.id}>
          <span className="u-feed-icon" aria-hidden>
            {it.icon ?? <span className="u-feed-dot" />}
          </span>
          <span className="u-feed-body">
            {it.href ? (
              <a href={it.href} className="u-feed-title">
                {it.title}
              </a>
            ) : (
              <span className="u-feed-title">{it.title}</span>
            )}
            {(it.meta || it.time) && (
              <span className="u-feed-meta">
                {it.meta}
                {it.meta && it.time && ' · '}
                {it.time}
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
