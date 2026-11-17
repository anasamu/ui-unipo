'use client';
import * as React from 'react';
import { ArrowDownRight, ArrowUpRight, Check, Minus } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { formatNumber } from '../lib/format';
import { Skeleton } from './actions';
import { Tautan, useRenderLink, type RenderLink } from '../lib/tautan';

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
  const tipRef = React.useRef<HTMLDivElement>(null);
  const [tip, setTip] = React.useState<Tip | null>(null);
  // Tooltip tidak boleh keluar dari sisi kiri/kanan grafik (kartu sempit di ponsel): geser masuk setelah lebarnya diketahui.
  React.useLayoutEffect(() => {
    const el = tipRef.current;
    const box = ref.current;
    if (!el || !box || !tip) return;
    const w = el.offsetWidth;
    el.style.left = `${Math.max(w / 2, Math.min(box.clientWidth - w / 2, tip.x))}px`;
  }, [tip]);
  const show = (e: React.PointerEvent | React.FocusEvent, content: React.ReactNode) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const t = (e.target as Element).getBoundingClientRect();
    const px = 'clientX' in e && e.pointerType === 'mouse' ? e.clientX : t.left + t.width / 2;
    setTip({ x: px - box.left, y: t.top - box.top, content });
  };
  /** Tampilkan di atas elemen (tengah, tepi atas). Untuk kelompok, tepi atas = anak tertinggi. */
  const anchor = (el: Element | null | undefined, content: React.ReactNode) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box || !el) return;
    const t = el.getBoundingClientRect();
    const anak = Array.from(el.children).map((c) => c.getBoundingClientRect().top);
    setTip({ x: t.left + t.width / 2 - box.left, y: Math.min(t.top, ...anak) - box.top, content });
  };
  /** Tampilkan di koordinat layar (clientX/clientY). */
  const showAt = (clientX: number, clientY: number, content: React.ReactNode) => {
    const box = ref.current?.getBoundingClientRect();
    if (box) setTip({ x: clientX - box.left, y: clientY - box.top, content });
  };
  const el = tip ? (
    <div className="u-chart-tip" ref={tipRef} aria-hidden style={{ left: tip.x, top: tip.y }}>
      {tip.content}
    </div>
  ) : null;
  return { ref, show, anchor, showAt, hide: () => setTip(null), el };
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
  /** Render `href` lewat router (SPA). Bawaan: `<a href>` atau PenyediaTautan. */
  renderLink?: RenderLink;
  loading?: boolean;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
}

/** Kartu angka utama: label, nilai besar, perubahan naik/turun dengan ikon, sparkline, dan keterangan. */
export function StatCard({
  label,
  value,
  delta,
  deltaLabel = 'dari periode lalu',
  inverse,
  deltaUnit = '%',
  hint,
  icon,
  trend,
  footer,
  href,
  renderLink,
  loading,
  tone = 'primary',
  className,
}: StatCardProps) {
  const arah = delta == null ? null : delta > 0 ? 'naik' : delta < 0 ? 'turun' : 'tetap';
  const baik = arah === 'tetap' || arah == null ? null : (arah === 'naik') !== !!inverse;
  const bungkus = (isi: React.ReactNode) =>
    href ? (
      <Tautan className={cn('u-stat', className)} data-tone={tone} href={href} renderLink={renderLink}>
        {isi}
      </Tautan>
    ) : (
      <div className={cn('u-stat', className)} data-tone={tone}>
        {isi}
      </div>
    );
  return bungkus(
    <>
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
    </>,
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

// ================================================================ Sumbu bersama (batang & garis)
type Nilai = number | null | undefined;
const ada = (v: Nilai): v is number => v != null && Number.isFinite(v);

/** Lebar elemen terkini. Ref berupa callback supaya tetap terpasang bila elemen baru muncul setelah memuat. */
function useLebar() {
  const [el, setEl] = React.useState<HTMLElement | null>(null);
  const [w, setW] = React.useState(0);
  React.useLayoutEffect(() => {
    if (!el) return;
    const baca = () => setW(el.clientWidth);
    baca();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(baca);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, w] as const;
}

/** Garis bantu 0, ½, dan maks di dalam plot (tanpa teks; angka ada di SumbuY). */
function GarisBantu() {
  return (
    <>
      {[0, 0.5, 1].map((g) => (
        <span key={g} className="u-bars-grid" style={{ bottom: `${g * 100}%` }} />
      ))}
    </>
  );
}

/** Angka sumbu Y di kolom sendiri; lebar kolom mengikuti angka terpanjang, jadi "Rp 11,1 M" tidak keluar kartu. */
function SumbuY({ max, format, height }: { max: number; format?: (n: number) => string; height: number }) {
  const ticks = [0, 0.5, 1].map((g) => [g, fmt(max * g, format)] as const);
  return (
    <div className="u-axis-y" style={{ height }} aria-hidden>
      <span className="u-axis-y-ukur">
        {ticks.map(([g, t]) => (
          <span key={g}>{t}</span>
        ))}
      </span>
      {ticks.map(([g, t]) => (
        <span key={g} className="u-axis-y-label" style={{ bottom: `${g * 100}%` }}>
          {t}
        </span>
      ))}
    </div>
  );
}

/**
 * Label sumbu X. `pos(i)` = titik tengah label sebagai pecahan lebar plot (pita: (i + ½) / n, titik: i / (n − 1)), jadi
 * tiap label tepat di bawah batang/titiknya. Lebar label diukur lalu label dijarangkan sesuai ruang (label terakhir,
 * periode terbaru, selalu tampil); label di tepi digeser masuk dan yang tetap kepanjangan disingkat dengan elipsis.
 */
function SumbuX({ labels, pos }: { labels: string[]; pos: (i: number) => number }) {
  const [refLebar, W] = useLebar();
  const ukur = React.useRef<HTMLSpanElement>(null);
  const [lebar, setLebar] = React.useState<number[]>([]);
  const kunci = labels.join('\u0000');
  React.useLayoutEffect(() => {
    const el = ukur.current;
    if (!el) return;
    const baca = () => setLebar(Array.from(el.children, (c) => (c as HTMLElement).offsetWidth));
    baca();
    // Fon web selesai dimuat → lebar label berubah → ukur ulang.
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(baca);
    ro.observe(el);
    return () => ro.disconnect();
  }, [kunci]);
  const n = labels.length;
  const tampil: Array<{ i: number; left: number }> = [];
  if (W > 0 && lebar.length === n && n > 0) {
    const jarak = W * (Math.abs(pos(1) - pos(0)) || 1);
    // Langkah terkecil yang membuat semua label (setelah label tepi digeser masuk) tidak bertabrakan; jarak tetap rata.
    for (let step = Math.max(1, Math.ceil((Math.max(...lebar) + 10) / jarak)); step <= n; step++) {
      tampil.length = 0;
      let batas = Infinity;
      let bentrok = false;
      for (let i = n - 1; i >= 0; i -= step) {
        const w = Math.min(lebar[i]!, W);
        const left = Math.max(0, Math.min(W - w, pos(i) * W - w / 2));
        if (left + w > batas - 6) {
          bentrok = true;
          break;
        }
        tampil.unshift({ i, left });
        batas = left;
      }
      if (!bentrok) break;
    }
  }
  return (
    <div className="u-axis-x" ref={refLebar} aria-hidden>
      <span className="u-axis-x-ukur" ref={ukur}>
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </span>
      {tampil.map(({ i, left }) => (
        <span key={i} className="u-axis-x-label" style={{ left, maxWidth: W }}>
          {labels[i]}
        </span>
      ))}
    </div>
  );
}

/** Fokus bergulir antar kolom: satu Tab masuk ke grafik, panah kiri/kanan (Home/End) pindah kolom. */
function useNavKolom(n: number) {
  const [aktif, setAktif] = React.useState<number | null>(null);
  const fokus = aktif != null && aktif < n ? aktif : n - 1;
  return (i: number) => ({
    tabIndex: i === fokus ? 0 : -1,
    onFocusCapture: () => setAktif(i),
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      const ke = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null;
      if (ke == null || ke < 0 || ke >= n || ke === i) return;
      e.preventDefault();
      (e.currentTarget.parentElement?.children[ke] as HTMLElement | undefined)?.focus();
    },
  });
}

// ================================================================ Grafik batang (vertikal, satu seri)
export interface BarChartProps {
  /** `value` null/undefined = belum ada data: kolom tetap ada di sumbu, digambar sebagai celah bertanda samar, bukan batang 0. */
  data: Array<{ label: string; value: number | null | undefined; /** Label panjang untuk tooltip. */ title?: string }>;
  height?: number;
  format?: (n: number) => string;
  /** Tandai batang terakhir (mis. periode berjalan). */
  highlightLast?: boolean;
  tone?: string;
  /** Tulis nilai batang yang ditandai `highlightLast` secara tetap di atasnya. Nilai semua batang tampil di tooltip saat disorot/difokus. */
  labels?: boolean;
  /** Batas atas sumbu Y (mis. 4 untuk IPS/IPK). Bawaan dibulatkan dari data. */
  max?: number;
  /** Teks untuk nilai kosong. Bawaan "Belum ada data". */
  emptyLabel?: string;
  loading?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * Batang vertikal untuk tren per periode (semester, bulan, hari). Skala pita: batang mengisi lebar plot dan tiap label
 * tepat di bawah batangnya. Tooltip nilai saat disorot atau difokus (Tab lalu panah kiri/kanan).
 */
export function BarChart({ data, height = 180, format, highlightLast, tone = 'var(--u-primary)', labels = true, max, emptyLabel = 'Belum ada data', loading, className, ...aria }: BarChartProps) {
  const tip = useTip();
  const nav = useNavKolom(data.length);
  if (loading) return <Skeleton className={className} style={{ height, width: '100%' }} />;
  if (!data.length) return <div className={cn('u-chart-empty', className)}>{emptyLabel}</div>;
  const nice = max ?? niceMax(Math.max(1, ...data.map((d) => (ada(d.value) ? d.value : 0))));
  const nilai = (d: BarChartProps['data'][number]) => (ada(d.value) ? fmt(d.value, format) : emptyLabel);
  const isi = (d: BarChartProps['data'][number]) => <TipBody label={d.title ?? d.label} value={nilai(d)} />;
  return (
    <div className={cn('u-bars', className)} ref={tip.ref} role="group" aria-label={aria['aria-label'] ?? 'Grafik batang'}>
      <div className="u-chart-body">
        <SumbuY max={nice} format={format} height={height} />
        <div className="u-bars-plot" style={{ height }}>
          <GarisBantu />
          <div className="u-bars-cols" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
            {data.map((d, i) => {
              const kosong = !ada(d.value);
              const akhir = !!highlightLast && i === data.length - 1;
              const tunjuk = (el: HTMLElement) => tip.anchor(el.firstElementChild, isi(d));
              return (
                <div
                  key={i}
                  className="u-bars-col"
                  role="img"
                  aria-label={`${d.title ?? d.label}: ${nilai(d)}`}
                  data-empty={dataFlag(kosong)}
                  {...nav(i)}
                  onPointerEnter={(e) => tunjuk(e.currentTarget)}
                  onPointerLeave={tip.hide}
                  onFocus={(e) => tunjuk(e.currentTarget)}
                  onBlur={tip.hide}
                >
                  {kosong ? (
                    <span className="u-bars-none" />
                  ) : (
                    <span className="u-bars-bar" data-last={dataFlag(akhir)} style={{ height: `${Math.min(100, (d.value! / nice) * 100)}%`, background: tone }}>
                      {labels && akhir && <span className="u-bars-val">{fmt(d.value, format)}</span>}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <span />
        <SumbuX labels={data.map((d) => d.label)} pos={(i) => (i + 0.5) / data.length} />
      </div>
      {tip.el}
    </div>
  );
}

// ================================================================ Batang berkelompok (2–4 seri)
export interface ChartSeries {
  label: string;
  /** Nilai per titik, urut sama dengan `labels`. null = belum ada data (celah, bukan 0). */
  values: Array<number | null | undefined>;
  color?: string;
}

const jumlah = (v: ChartSeries['values']) => v.reduce<number>((a, b) => a + (ada(b) ? b : 0), 0);

/** Batang berkelompok untuk membandingkan 2–4 seri per periode (mis. surat masuk vs keluar per bulan). Legenda berisi total tiap seri. */
export function GroupedBarChart({
  labels,
  titles,
  series,
  height = 180,
  format,
  max,
  loading,
  className,
}: {
  labels: string[];
  /** Label panjang untuk tooltip. */ titles?: string[];
  series: ChartSeries[];
  height?: number;
  format?: (n: number) => string;
  /** Batas atas sumbu Y. Bawaan dibulatkan dari data. */
  max?: number;
  loading?: boolean;
  className?: string;
}) {
  const tip = useTip();
  const nav = useNavKolom(labels.length);
  if (loading) return <Skeleton className={className} style={{ height, width: '100%' }} />;
  const nice = max ?? niceMax(Math.max(1, ...series.flatMap((s) => s.values.filter(ada))));
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
    <div className={cn('u-bars', className)} ref={tip.ref} role="group" aria-label={series.map((s) => s.label).join(' dan ')}>
      <ul className="u-legend" data-inline="" aria-hidden>
        {series.map((s, j) => (
          <li key={j}>
            <i style={{ background: s.color ?? chartColor(j) }} />
            <span className="u-legend-label">{s.label}</span>
            <span className="u-legend-value">{fmt(jumlah(s.values), format)}</span>
          </li>
        ))}
      </ul>
      <div className="u-chart-body">
        <SumbuY max={nice} format={format} height={height} />
        <div className="u-bars-plot" style={{ height }}>
          <GarisBantu />
          <div className="u-bars-cols" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
            {labels.map((l, i) => {
              const kosong = series.every((s) => !ada(s.values[i]));
              return (
                <div
                  key={i}
                  className="u-bars-col"
                  data-group=""
                  data-empty={dataFlag(kosong)}
                  role="img"
                  aria-label={`${titles?.[i] ?? l}: ${series.map((s) => `${s.label} ${fmt(s.values[i], format)}`).join(', ')}`}
                  {...nav(i)}
                  onPointerEnter={(e) => tip.anchor(e.currentTarget, isi(i))}
                  onPointerLeave={tip.hide}
                  onFocus={(e) => tip.anchor(e.currentTarget, isi(i))}
                  onBlur={tip.hide}
                >
                  {kosong ? (
                    <span className="u-bars-none" />
                  ) : (
                    series.map((s, j) => {
                      const v = s.values[i];
                      return ada(v) ? (
                        <span key={j} className="u-bars-bar" style={{ height: `${Math.min(100, (v / nice) * 100)}%`, background: s.color ?? chartColor(j) }} />
                      ) : (
                        <span key={j} className="u-bars-bar" data-none="" />
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <span />
        <SumbuX labels={labels} pos={(i) => (i + 0.5) / labels.length} />
      </div>
      {tip.el}
    </div>
  );
}

// ================================================================ Garis (1–4 seri, harian)
/**
 * Garis untuk deret harian/mingguan/semester. Garis bantu silang dan tooltip semua seri saat disorot atau difokus
 * (panah kiri/kanan); legenda berisi total. Nilai null memutus garis (celah), bukan turun ke 0.
 */
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
  /** Angka di legenda: jumlah seluruh titik (bawaan), nilai titik terakhir yang terisi, atau tanpa angka. */
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
  const nice = max ?? niceMax(Math.max(1, ...series.flatMap((s) => s.values.filter(ada))));
  const W = 1000;
  const fx = (i: number) => (n <= 1 ? 0.5 : i / (n - 1));
  const x = (i: number) => fx(i) * W;
  const y = (v: number) => height - (Math.min(v, nice) / nice) * (height - 4) - 2;
  const warna = (s: ChartSeries, j: number) => s.color ?? (series.length === 1 ? 'var(--u-primary)' : chartColor(j));
  const isi = (i: number) => (
    <>
      <span className="u-chart-tip-label">{titles?.[i] ?? labels[i]}</span>
      {series.map((s, j) => (
        <span key={j} className="u-chart-tip-row">
          <i style={{ background: warna(s, j) }} />
          {s.label}
          <b>{fmt(s.values[i], format)}</b>
        </span>
      ))}
    </>
  );
  const pilih = (i: number) => {
    const box = plot.current?.getBoundingClientRect();
    if (!box) return;
    setAktif(i);
    tip.showAt(box.left + fx(i) * box.width, box.top, isi(i));
  };
  const sorot = (e: React.PointerEvent) => {
    const box = plot.current?.getBoundingClientRect();
    if (!box || n === 0) return;
    pilih(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - box.left) / box.width) * (n - 1)))));
  };
  const lepas = () => (setAktif(null), tip.hide());
  const tombol = (e: React.KeyboardEvent) => {
    const i = aktif ?? n - 1;
    const ke = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null;
    if (ke == null || ke < 0 || ke >= n) return;
    e.preventDefault();
    pilih(ke);
  };
  // Potong deret menjadi ruas tanpa null.
  const ruas = (s: ChartSeries) => {
    const hasil: number[][] = [];
    let kini: number[] = [];
    s.values.forEach((v, i) => {
      if (ada(v)) kini.push(i);
      else if (kini.length) (hasil.push(kini), (kini = []));
    });
    if (kini.length) hasil.push(kini);
    return hasil;
  };
  const akhirTerisi = (s: ChartSeries) => [...s.values].reverse().find(ada);
  return (
    <div className={cn('u-line', className)} ref={tip.ref}>
      {series.length > 1 && (
        <ul className="u-legend" data-inline="" aria-hidden>
          {series.map((s, j) => (
            <li key={j}>
              <i style={{ background: warna(s, j) }} />
              <span className="u-legend-label">{s.label}</span>
              {legendValue !== 'tidak' && <span className="u-legend-value">{fmt(legendValue === 'akhir' ? akhirTerisi(s) : jumlah(s.values), format)}</span>}
            </li>
          ))}
        </ul>
      )}
      <div className="u-chart-body">
        <SumbuY max={nice} format={format} height={height} />
        <div
          className="u-bars-plot"
          style={{ height }}
          ref={plot}
          tabIndex={n ? 0 : undefined}
          role="img"
          aria-label={`${series.map((s) => `${s.label}: ${legendValue === 'akhir' ? `terakhir ${fmt(akhirTerisi(s), format)}` : `total ${fmt(jumlah(s.values), format)}`}`).join('; ')}. Panah kiri/kanan untuk nilai per titik.`}
          onPointerMove={sorot}
          onPointerLeave={lepas}
          onFocus={() => pilih(aktif ?? n - 1)}
          onBlur={lepas}
          onKeyDown={tombol}
        >
          <GarisBantu />
          <svg className="u-line-svg" viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" width="100%" height={height} aria-hidden>
            {series.map((s, j) => (
              <g key={j} style={{ color: warna(s, j) }}>
                {ruas(s).map((r, k) => {
                  const d = r.map((i, m) => `${m ? 'L' : 'M'}${x(i).toFixed(1)} ${y(s.values[i] as number).toFixed(1)}`).join(' ');
                  return (
                    <React.Fragment key={k}>
                      {area && series.length === 1 && r.length > 1 && <path d={`${d} L${x(r[r.length - 1]!)} ${height} L${x(r[0]!)} ${height} Z`} fill="currentColor" opacity={0.1} />}
                      <path d={d} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
                    </React.Fragment>
                  );
                })}
              </g>
            ))}
          </svg>
          {/* Titik tunggal (diapit celah) tidak punya garis, jadi digambar sebagai titik. */}
          {series.map((s, j) =>
            ruas(s)
              .filter((r) => r.length === 1)
              .map(([i]) => <span key={`${j}-${i}`} className="u-line-dot" style={{ left: `${fx(i!) * 100}%`, top: y(s.values[i!] as number), background: warna(s, j) }} />),
          )}
          {aktif != null && (
            <>
              <span className="u-line-cross" style={{ left: `${fx(aktif) * 100}%` }} />
              {series.map((s, j) => {
                const v = s.values[aktif];
                return ada(v) ? <span key={j} className="u-line-dot" style={{ left: `${fx(aktif) * 100}%`, top: y(v), background: warna(s, j) }} /> : null;
              })}
            </>
          )}
        </div>
        <span />
        <SumbuX labels={labels} pos={fx} />
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
  /** Status rinci; `berjalan` = tahap yang sedang dikerjakan (ditandai jelas, bukan sekadar "belum"). Bawaan dari `done`. */
  status?: 'selesai' | 'berjalan' | 'belum';
  detail?: React.ReactNode;
}

const LABEL_TAHAP = { selesai: ' (terpenuhi)', berjalan: ' (sedang berjalan)', belum: ' (belum)' } as const;

/** Tahapan siklus (mis. PPEPP SPMI) dengan tanda terpenuhi, tahap berjalan, dan bukti singkat. */
export function CycleSteps({ steps, className }: { steps: CycleStep[]; className?: string }) {
  return (
    <ol className={cn('u-cycle', className)}>
      {steps.map((s, i) => {
        const st = s.status ?? (s.done ? 'selesai' : 'belum');
        return (
          <li key={i} data-done={dataFlag(st === 'selesai')} data-status={st} aria-current={st === 'berjalan' ? 'step' : undefined}>
            <span className="u-cycle-mark" aria-hidden>
              {st === 'selesai' ? <Check /> : i + 1}
            </span>
            <span className="u-cycle-label">
              {s.label}
              <span className="u-sr-only">{LABEL_TAHAP[st]}</span>
            </span>
            {s.detail && <span className="u-cycle-detail">{s.detail}</span>}
          </li>
        );
      })}
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
export function DashboardGrid({
  children,
  rata,
  className,
}: {
  children: React.ReactNode;
  /** `stretch`: panel satu baris sama tinggi. Bawaan `start`: tinggi panel mengikuti isinya. */
  rata?: 'start' | 'stretch';
  className?: string;
}) {
  return (
    <div className={cn('u-dash-wrap', className)}>
      <div className="u-dash" data-rata={rata}>
        {children}
      </div>
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
export function ActionList({
  items,
  loading,
  renderLink,
  className,
}: {
  items: ActionItem[];
  loading?: boolean;
  /** Render `href` lewat router (SPA). Bawaan: `<a href>` atau PenyediaTautan. */
  renderLink?: RenderLink;
  className?: string;
}) {
  const render = useRenderLink(renderLink);
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
              <Tautan href={it.href} className="u-actions-row" renderLink={render}>
                {isi}
              </Tautan>
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
export function ActivityFeed({
  items,
  loading,
  empty = 'Belum ada aktivitas.',
  renderLink,
  className,
}: {
  items: FeedItem[];
  loading?: boolean;
  /** Isi saat kosong; boleh berupa blok (mis. <Empty />). */
  empty?: React.ReactNode;
  /** Render `href` lewat router (SPA). Bawaan: `<a href>` atau PenyediaTautan. */
  renderLink?: RenderLink;
  className?: string;
}) {
  const render = useRenderLink(renderLink);
  if (loading)
    return (
      <div className={cn('u-feed', className)}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} style={{ height: 40 }} />
        ))}
      </div>
    );
  if (!items.length) return <div className={cn('u-chart-empty', className)}>{empty}</div>;
  return (
    <ol className={cn('u-feed', className)}>
      {items.map((it) => (
        <li key={it.id}>
          <span className="u-feed-icon" aria-hidden>
            {it.icon ?? <span className="u-feed-dot" />}
          </span>
          <span className="u-feed-body">
            {it.href ? (
              <Tautan href={it.href} className="u-feed-title" renderLink={render}>
                {it.title}
              </Tautan>
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
