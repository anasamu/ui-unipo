'use client';
import * as React from 'react';
import { Avatar as BaseAvatar } from '@base-ui/react/avatar';
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { Accordion as BaseAccordion } from '@base-ui/react/accordion';
import { Collapsible as BaseCollapsible } from '@base-ui/react/collapsible';
import { Progress as BaseProgress } from '@base-ui/react/progress';
import { ScrollArea as BaseScrollArea } from '@base-ui/react/scroll-area';
import { useRender } from '@base-ui/react/use-render';
import { mergeProps } from '@base-ui/react/merge-props';
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { hueFromString, initials } from '../lib/format';
import { Select } from './select';
import { Tautan, type RenderLink } from '../lib/tautan';

// ---------------------------------------------------------------- Card
export interface CardProps extends useRender.ComponentProps<'div'> {
  variant?: 'default' | 'flat' | 'muted' | 'elevated';
  interactive?: boolean;
}
export function Card({ variant = 'default', interactive, className, render, ...props }: CardProps) {
  return useRender({
    render,
    defaultTagName: 'div',
    props: mergeProps<'div'>({ className: cn('u-card', className), 'data-variant': variant, 'data-interactive': dataFlag(interactive) } as React.ComponentProps<'div'>, props),
  });
}
export function CardHeader({
  title,
  description,
  action,
  className,
  children,
  ...props
}: { title?: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode } & Omit<React.ComponentProps<'div'>, 'title'>) {
  return (
    <div className={cn('u-card-header', className)} {...props}>
      <div>
        {title && <h3 className="u-card-title">{title}</h3>}
        {description && <p className="u-card-description">{description}</p>}
        {children}
      </div>
      {action}
    </div>
  );
}
export function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('u-card-content', className)} {...props} />;
}
export function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('u-card-footer', className)} {...props} />;
}

// ---------------------------------------------------------------- Alert
export type AlertVariant = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger';
const ALERT_ICON: Record<AlertVariant, React.ReactNode> = {
  neutral: <Info />,
  primary: <Info />,
  info: <Info />,
  success: <CircleCheck />,
  warning: <TriangleAlert />,
  danger: <CircleAlert />,
};
export interface AlertProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  variant?: AlertVariant;
  title?: React.ReactNode;
  icon?: React.ReactNode | false;
  actions?: React.ReactNode;
}
export function Alert({ variant = 'neutral', title, icon, actions, className, children, ...props }: AlertProps) {
  return (
    <div role={variant === 'danger' || variant === 'warning' ? 'alert' : 'status'} className={cn('u-alert', className)} data-variant={variant} {...props}>
      {icon === false ? <span /> : (icon ?? ALERT_ICON[variant])}
      <div className="u-alert-body">
        {title && <p className="u-alert-title">{title}</p>}
        {children && <div className="u-alert-description">{children}</div>}
      </div>
      {actions && <div className="u-alert-actions">{actions}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- Avatar
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export interface AvatarProps extends Omit<React.ComponentProps<typeof BaseAvatar.Root>, 'children'> {
  /** Nama lengkap: dipakai untuk inisial, warna latar, dan teks alternatif. */
  name: string;
  src?: string | null;
  size?: AvatarSize;
  shape?: 'circle' | 'square';
  status?: 'online' | 'offline' | 'busy' | 'away';
  /** Lencana kecil di pojok (mis. ikon terverifikasi). */
  badge?: React.ReactNode;
}
/** Foto profil dengan cadangan inisial berwarna stabil per nama. */
export function Avatar({ name, src, size = 'md', shape, status, badge, className, style, ...props }: AvatarProps) {
  const hue = hueFromString(name);
  return (
    <BaseAvatar.Root
      className={cn('u-avatar', className)}
      data-size={size}
      data-shape={shape}
      style={{ '--u-avatar-bg': `oklch(0.93 0.04 ${hue})`, '--u-avatar-fg': `oklch(0.42 0.1 ${hue})`, ...(style as object) } as React.CSSProperties}
      {...props}
    >
      {src && <BaseAvatar.Image className="u-avatar-image" src={src} alt={name} />}
      <BaseAvatar.Fallback className="u-avatar-fallback" delay={src ? 400 : 0}>
        {initials(name)}
      </BaseAvatar.Fallback>
      {status && <span className="u-avatar-status" data-status={status} aria-label={status} />}
      {badge && <span className="u-avatar-badge">{badge}</span>}
    </BaseAvatar.Root>
  );
}
export function AvatarGroup({ people, max = 4, size = 'sm' }: { people: Array<{ name: string; src?: string | null }>; max?: number; size?: AvatarSize }) {
  const shown = people.slice(0, max);
  const more = people.length - shown.length;
  return (
    <div className="u-avatar-group">
      {shown.map((p, i) => (
        <Avatar key={i} name={p.name} src={p.src} size={size} />
      ))}
      {more > 0 && (
        <span className="u-avatar" data-size={size} title={`${more} lainnya`}>
          +{more}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Tabs
export interface TabItem<V extends string = string> {
  value: V;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
  disabled?: boolean;
  content?: React.ReactNode;
}
export interface TabsProps<V extends string> {
  items: TabItem<V>[];
  value?: V;
  defaultValue?: V;
  onValueChange?: (v: V) => void;
  variant?: 'underline' | 'pill';
  /**
   * horizontal (bawaan): deret tab di atas isi. vertical: daftar tab di kiri dan isi di kanan, cocok untuk sub tab
   * yang banyak atau labelnya panjang (jenis riwayat, data master). Di wadah sempit (< 40rem) daftar vertikal
   * otomatis menjadi pilihan tarik-turun supaya isi tetap selebar layar.
   */
  orientation?: 'horizontal' | 'vertical';
  /** Label daftar tab untuk pembaca layar dan pilihan tarik-turun (mode vertikal di layar sempit). */
  'aria-label'?: string;
  className?: string;
  /** Isi tambahan di area isi (di bawah panel tab). Di mode vertikal tampil di kolom kanan. */
  children?: React.ReactNode;
}
export function Tabs<V extends string>({ items, value, defaultValue, onValueChange, variant = 'underline', orientation = 'horizontal', className, children, ...rest }: TabsProps<V>) {
  const vertikal = orientation === 'vertical';
  const [inner, setInner] = React.useState<V | undefined>(defaultValue ?? items[0]?.value);
  const aktif = value ?? inner;
  const ganti = (v: V) => {
    setInner(v);
    onValueChange?.(v);
  };
  const panel = items.map((t) =>
    t.content !== undefined ? (
      <BaseTabs.Panel key={t.value} value={t.value} className="u-tabs-panel">
        {t.content}
      </BaseTabs.Panel>
    ) : null,
  );
  const daftar = (
    <BaseTabs.List className="u-tabs-list" data-variant={vertikal ? 'side' : variant} aria-label={rest['aria-label']}>
      {items.map((t) => (
        <BaseTabs.Tab key={t.value} value={t.value} disabled={t.disabled} className="u-tab">
          {t.icon}
          <span className="u-tab-label">{t.label}</span>
          {t.count != null && (
            <span className="u-badge" data-variant="neutral">
              {t.count}
            </span>
          )}
        </BaseTabs.Tab>
      ))}
      <BaseTabs.Indicator className="u-tabs-indicator" />
    </BaseTabs.List>
  );
  const root = (
    <BaseTabs.Root
      className={cn('u-tabs', className)}
      data-orientation={orientation}
      orientation={orientation}
      value={aktif}
      onValueChange={(v) => ganti(v as V)}
    >
      {vertikal ? (
        <>
          <div className="u-tabs-samping">
            {daftar}
            <Select<string>
              className="u-tabs-pilih"
              aria-label={rest['aria-label'] ?? 'Pilih bagian'}
              options={items.map((t) => ({ value: t.value, label: t.label, disabled: t.disabled, icon: t.icon }))}
              value={aktif ?? null}
              onValueChange={(v) => v && ganti(v as V)}
            />
          </div>
          <div className="u-tabs-isi">
            {panel}
            {children}
          </div>
        </>
      ) : (
        <>
          {daftar}
          {panel}
          {children}
        </>
      )}
    </BaseTabs.Root>
  );
  return vertikal ? <div className="u-tabs-wadah">{root}</div> : root;
}

// ---------------------------------------------------------------- Accordion / Collapsible
export interface AccordionItem {
  value: string;
  title: React.ReactNode;
  content: React.ReactNode;
}
export function Accordion({
  items,
  variant,
  multiple,
  defaultValue,
  className,
}: {
  items: AccordionItem[];
  variant?: 'line' | 'card';
  multiple?: boolean;
  defaultValue?: string[];
  className?: string;
}) {
  return (
    <BaseAccordion.Root className={cn('u-accordion', className)} data-variant={variant} multiple={multiple} defaultValue={defaultValue}>
      {items.map((it) => (
        <BaseAccordion.Item key={it.value} value={it.value} className="u-accordion-item">
          <BaseAccordion.Header className="u-accordion-header">
            <BaseAccordion.Trigger className="u-accordion-trigger">
              {it.title}
              <ChevronDown />
            </BaseAccordion.Trigger>
          </BaseAccordion.Header>
          <BaseAccordion.Panel className="u-accordion-panel">
            <div className="u-accordion-content">{it.content}</div>
          </BaseAccordion.Panel>
        </BaseAccordion.Item>
      ))}
    </BaseAccordion.Root>
  );
}
export const Collapsible = BaseCollapsible.Root;
export const CollapsibleTrigger = BaseCollapsible.Trigger;
export function CollapsiblePanel({ className, ...props }: React.ComponentProps<typeof BaseCollapsible.Panel>) {
  return <BaseCollapsible.Panel className={cn('u-collapsible-panel', className)} {...props} />;
}

// ---------------------------------------------------------------- Progress / ProgressRing
export type Tone = 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
export interface ProgressProps {
  value: number | null;
  max?: number;
  label?: React.ReactNode;
  showValue?: boolean;
  tone?: Tone;
  size?: 'sm' | 'md';
  className?: string;
  format?: (value: number, max: number) => string;
}
export function Progress({ value, max = 100, label, showValue = Boolean(label), tone, size, className, format }: ProgressProps) {
  return (
    <BaseProgress.Root value={value} max={max} className={cn('u-progress', className)}>
      {label && <BaseProgress.Label className="u-progress-label">{label}</BaseProgress.Label>}
      {showValue && <span className="u-progress-value">{value == null ? '' : format ? format(value, max) : `${Math.round((value / max) * 100)}%`}</span>}
      <BaseProgress.Track className="u-progress-track" data-size={size}>
        <BaseProgress.Indicator className="u-progress-indicator" data-tone={tone} />
      </BaseProgress.Track>
    </BaseProgress.Root>
  );
}

/** Progres melingkar, mis. kelengkapan profil, IPK terhadap 4.00, kehadiran. */
export function ProgressRing({
  value,
  max = 100,
  size = 64,
  thickness = 6,
  tone,
  label,
  className,
}: {
  value: number;
  max?: number;
  size?: number;
  thickness?: number;
  tone?: Tone;
  label?: React.ReactNode;
  className?: string;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const color = tone ? `var(--u-${tone === 'danger' ? 'danger' : tone})` : undefined;
  return (
    <div
      className={cn('u-progress-ring', className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
      aria-valuemin={0}
      style={{ width: size, height: size, ...(color ? ({ '--u-progress-color': color } as React.CSSProperties) : {}) }}
    >
      <svg width={size} height={size}>
        <circle className="u-ring-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} />
        <circle className="u-ring-indicator" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <span className="u-progress-ring-label" style={{ fontSize: size * 0.24 }}>
        {label ?? `${Math.round(pct * 100)}%`}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- Pagination
function pageList(page: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => set.add(p));
  if (page >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => set.add(p));
  const sorted = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: Array<number | '…'> = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}
export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Total data, untuk teks "1–10 dari 245". */
  total?: number;
  perPage?: number;
  className?: string;
  /** Tampilan ringkas: hanya tombol sebelum/berikut. */
  compact?: boolean;
}
export function Pagination({ page, totalPages, onPageChange, total, perPage, className, compact }: PaginationProps) {
  const from = total != null && perPage ? (page - 1) * perPage + 1 : null;
  const to = total != null && perPage ? Math.min(total, page * perPage) : null;
  return (
    <nav className={cn('u-pagination', className)} aria-label="Halaman">
      <span className="u-pagination-info">
        {total != null && from != null ? (
          total === 0 ? (
            'Tidak ada data'
          ) : (
            <>
              <strong>
                {from.toLocaleString('id-ID')}–{to!.toLocaleString('id-ID')}
              </strong>{' '}
              dari <strong>{total.toLocaleString('id-ID')}</strong>
            </>
          )
        ) : (
          <>
            Halaman <strong>{page}</strong> dari <strong>{Math.max(1, totalPages)}</strong>
          </>
        )}
      </span>
      <ul className="u-pagination-list">
        <li>
          <button type="button" className="u-pagination-item" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Halaman sebelumnya">
            <ChevronLeft />
          </button>
        </li>
        {!compact &&
          pageList(page, Math.max(1, totalPages)).map((p, i) =>
            p === '…' ? (
              <li key={`e${i}`} className="u-pagination-ellipsis" aria-hidden>
                …
              </li>
            ) : (
              <li key={p}>
                <button type="button" className="u-pagination-item" aria-current={p === page ? 'page' : undefined} onClick={() => onPageChange(p)}>
                  {p}
                </button>
              </li>
            ),
          )}
        <li>
          <button type="button" className="u-pagination-item" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Halaman berikutnya">
            <ChevronRight />
          </button>
        </li>
      </ul>
    </nav>
  );
}

// ---------------------------------------------------------------- Breadcrumb
export function Breadcrumb({
  items,
  renderLink,
  className,
}: {
  items: Array<{ label: React.ReactNode; href?: string; onClick?: () => void }>;
  /** Render tautan lewat router (SPA). Bawaan: `<a href>` atau PenyediaTautan. */
  renderLink?: RenderLink;
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className={cn('u-breadcrumb', className)}>
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <React.Fragment key={i}>
              <li>
                {last ? (
                  <span aria-current="page">{it.label}</span>
                ) : it.href ? (
                  <Tautan href={it.href} onClick={it.onClick} renderLink={renderLink}>
                    {it.label}
                  </Tautan>
                ) : (
                  <span>{it.label}</span>
                )}
              </li>
              {!last && (
                <li aria-hidden>
                  <ChevronRight />
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

// ---------------------------------------------------------------- Empty
export function Empty({
  icon,
  title,
  description,
  actions,
  bordered,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  bordered?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('u-empty', className)} data-bordered={dataFlag(bordered)}>
      {icon && <span className="u-empty-icon">{icon}</span>}
      <p className="u-empty-title">{title}</p>
      {description && <p className="u-empty-description">{description}</p>}
      {actions && <div className="u-empty-actions">{actions}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- Table (primitif)
export function TableContainer({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('u-table-wrap', className)} {...props} />;
}
export function Table({ className, density, striped, ...props }: { density?: 'comfortable' | 'compact'; striped?: boolean } & React.ComponentProps<'table'>) {
  return <table className={cn('u-table', className)} data-density={density} data-striped={dataFlag(striped)} {...props} />;
}
export function SortButton({ direction, onClick, children }: { direction?: 'asc' | 'desc' | null; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="u-table-sort" data-sorted={dataFlag(Boolean(direction))} onClick={onClick}>
      {children}
      {direction === 'asc' ? <ArrowUp /> : direction === 'desc' ? <ArrowDown /> : <ArrowUpDown style={{ opacity: 0.5 }} />}
    </button>
  );
}
/** Sel utama: avatar/ikon + judul + subjudul. */
export function CellPrimary({ media, title, subtitle }: { media?: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <div className="u-cell-primary">
      {media}
      <div style={{ minWidth: 0 }}>
        <span className="u-cell-title">{title}</span>
        {subtitle && <span className="u-cell-subtitle">{subtitle}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- ScrollArea
export function ScrollArea({ className, style, maxHeight, children }: { className?: string; style?: React.CSSProperties; maxHeight?: number | string; children: React.ReactNode }) {
  return (
    <BaseScrollArea.Root className={cn('u-scroll-area', className)} style={style}>
      <BaseScrollArea.Viewport className="u-scroll-viewport" style={{ maxHeight }}>
        {children}
      </BaseScrollArea.Viewport>
      <BaseScrollArea.Scrollbar className="u-scrollbar" orientation="vertical">
        <BaseScrollArea.Thumb className="u-scroll-thumb" />
      </BaseScrollArea.Scrollbar>
    </BaseScrollArea.Root>
  );
}

// ---------------------------------------------------------------- Stepper
export interface StepItem {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Tandai langkah bermasalah (mis. berkas ditolak). */
  error?: boolean;
}
export interface StepperProps {
  steps: StepItem[];
  /** Indeks langkah aktif (mulai 0). */
  current: number;
  orientation?: 'horizontal' | 'vertical';
  /** Horizontal saja: 'center' menaruh penanda dan teks di tengah tiap langkah (simetris, cocok untuk landing). */
  align?: 'start' | 'center';
  /** Bila diisi, langkah yang sudah lewat bisa diklik. */
  onStepClick?: (index: number) => void;
  className?: string;
}
export function Stepper({ steps, current, orientation = 'horizontal', align = 'start', onStepClick, className }: StepperProps) {
  return (
    <ol className={cn('u-stepper', className)} data-orientation={orientation} data-align={align} data-collapse="">
      {steps.map((s, i) => {
        const state = s.error ? 'error' : i < current ? 'complete' : i === current ? 'current' : 'upcoming';
        const clickable = onStepClick && i < current;
        const Marker = clickable ? 'button' : 'span';
        return (
          <li key={i} className="u-step" data-state={state} aria-current={i === current ? 'step' : undefined}>
            {i < steps.length - 1 && <span className="u-step-line" aria-hidden />}
            <Marker className="u-step-marker" {...(clickable ? { type: 'button' as const, onClick: () => onStepClick!(i), 'aria-label': `Kembali ke langkah ${i + 1}` } : {})}>
              {state === 'complete' ? <Check /> : state === 'error' ? <CircleAlert /> : i + 1}
            </Marker>
            <span className="u-step-text">
              <span className="u-step-title">{s.title}</span>
              {s.description && <span className="u-step-description">{s.description}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------- DescriptionList
export function DescriptionList({ items, className }: { items: Array<{ label: React.ReactNode; value: React.ReactNode }>; className?: string }) {
  return (
    <dl className={cn('u-dl', className)}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          <dt>{it.label}</dt>
          <dd>{it.value ?? '–'}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
