'use client';
import * as React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, FileText, UploadCloud, X } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { formatBytes, formatDate } from '../lib/format';
import { Button } from './actions';
import { Popover } from './overlays';

// ---------------------------------------------------------------- utilitas tanggal (tanpa dependensi)
export const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseISODate = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** 42 sel (6 minggu) dimulai Senin. */
export function monthMatrix(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - offset + i));
}
const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export interface CalendarMarker {
  /** Warna titik (variabel CSS atau warna). */
  color?: string;
}

export interface CalendarProps {
  value?: Date | null;
  onValueChange?: (date: Date) => void;
  /** Rentang terpilih (mode rentang). */
  range?: { from: Date | null; to: Date | null };
  onRangeChange?: (range: { from: Date | null; to: Date | null }) => void;
  /** Bulan yang ditampilkan (terkendali). */
  month?: Date;
  onMonthChange?: (month: Date) => void;
  /** Titik penanda per tanggal ISO, mis. { '2026-11-17': [{ color: 'var(--u-danger)' }] }. */
  markers?: Record<string, CalendarMarker[]>;
  min?: Date;
  max?: Date;
  isDisabled?: (date: Date) => boolean;
  bordered?: boolean;
  /** Ukuran sel dalam px (bawaan 36). */
  cellSize?: number;
  className?: string;
  /** Sabtu/Minggu ditandai merah. */
  highlightWeekend?: boolean;
}

/** Kalender bulanan dengan navigasi keyboard, penanda agenda, dan mode rentang. */
export function Calendar({ value, onValueChange, range, onRangeChange, month, onMonthChange, markers, min, max, isDisabled, bordered, cellSize, className, highlightWeekend = true }: CalendarProps) {
  const today = React.useMemo(() => new Date(), []);
  const [innerMonth, setInnerMonth] = React.useState(() => month ?? value ?? range?.from ?? today);
  const view = month ?? innerMonth;
  const [focus, setFocus] = React.useState<Date>(value ?? range?.from ?? today);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const setView = (d: Date) => {
    const m = new Date(d.getFullYear(), d.getMonth(), 1);
    setInnerMonth(m);
    onMonthChange?.(m);
  };
  const days = monthMatrix(view.getFullYear(), view.getMonth());
  const title = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(view);
  const disabled = (d: Date) => (min && d < new Date(min.getFullYear(), min.getMonth(), min.getDate())) || (max && d > max) || isDisabled?.(d) || false;

  const pick = (d: Date) => {
    if (disabled(d)) return;
    setFocus(d);
    if (onRangeChange) {
      if (!range?.from || range.to) onRangeChange({ from: d, to: null });
      else onRangeChange(d < range.from ? { from: d, to: range.from } : { from: range.from, to: d });
    } else onValueChange?.(d);
    if (d.getMonth() !== view.getMonth()) setView(d);
  };

  const move = (deltaDays: number) => {
    const n = new Date(focus.getFullYear(), focus.getMonth(), focus.getDate() + deltaDays);
    setFocus(n);
    if (n.getMonth() !== view.getMonth() || n.getFullYear() !== view.getFullYear()) setView(n);
  };
  React.useEffect(() => {
    const el = gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${toISODate(focus)}"]`);
    if (el && gridRef.current?.contains(document.activeElement)) el.focus();
  }, [focus]);

  return (
    <div className={cn('u-calendar', className)} data-bordered={dataFlag(bordered)} style={cellSize ? ({ '--u-cal-cell': `${cellSize}px` } as React.CSSProperties) : undefined}>
      <div className="u-calendar-header">
        <span className="u-calendar-title" aria-live="polite">
          {title}
        </span>
        <div className="u-calendar-nav">
          <Button variant="ghost" size="xs" iconOnly aria-label="Bulan sebelumnya" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}>
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="xs" iconOnly aria-label="Bulan berikutnya" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}>
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div
        ref={gridRef}
        className="u-calendar-grid"
        role="grid"
        aria-label={title}
        onKeyDown={(e) => {
          const map: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
          if (e.key in map) {
            e.preventDefault();
            move(map[e.key]);
          } else if (e.key === 'PageUp' || e.key === 'PageDown') {
            e.preventDefault();
            const n = new Date(focus.getFullYear(), focus.getMonth() + (e.key === 'PageUp' ? -1 : 1), focus.getDate());
            setFocus(n);
            setView(n);
          }
        }}
      >
        {WEEKDAYS.map((w) => (
          <span key={w} className="u-calendar-weekday" role="columnheader">
            {w}
          </span>
        ))}
        {days.map((d) => {
          const iso = toISODate(d);
          const outside = d.getMonth() !== view.getMonth();
          const selected = (value && sameDay(d, value)) || (range?.from && sameDay(d, range.from)) || (range?.to && sameDay(d, range.to));
          const inRange = range?.from && range?.to && d > range.from && d < range.to;
          const weekend = highlightWeekend && (d.getDay() === 0 || d.getDay() === 6);
          const m = markers?.[iso];
          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              className="u-calendar-day"
              data-date={iso}
              data-outside={dataFlag(outside)}
              data-today={dataFlag(sameDay(d, today))}
              data-selected={dataFlag(Boolean(selected))}
              data-in-range={dataFlag(Boolean(inRange))}
              data-weekend={dataFlag(weekend)}
              aria-selected={Boolean(selected)}
              aria-label={formatDate(d, 'full') + (m?.length ? `, ${m.length} agenda` : '')}
              tabIndex={sameDay(d, focus) ? 0 : -1}
              disabled={disabled(d)}
              onClick={() => pick(d)}
            >
              {d.getDate()}
              {m && m.length > 0 && (
                <span className="u-calendar-dots" aria-hidden>
                  {m.slice(0, 3).map((mk, i) => (
                    <span key={i} style={mk.color ? ({ '--u-dot': mk.color } as React.CSSProperties) : undefined} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- DatePicker
export interface DatePickerProps {
  value?: Date | null;
  onValueChange?: (date: Date | null) => void;
  placeholder?: string;
  min?: Date;
  max?: Date;
  disabled?: boolean;
  className?: string;
  id?: string;
}
export function DatePicker({ value, onValueChange, placeholder = 'Pilih tanggal', min, max, disabled, className, id }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="start"
      width="auto"
      className="u-datepicker-popup"
      trigger={
        <button type="button" id={id} className={cn('u-select-trigger', className)} disabled={disabled} data-disabled={dataFlag(disabled)}>
          <span className="u-select-value" data-placeholder={value ? undefined : ''}>
            {value ? formatDate(value, 'long') : placeholder}
          </span>
          <span className="u-select-icon">
            <CalendarDays />
          </span>
        </button>
      }
    >
      <Calendar
        value={value}
        min={min}
        max={max}
        onValueChange={(d) => {
          onValueChange?.(d);
          setOpen(false);
        }}
      />
    </Popover>
  );
}

// ---------------------------------------------------------------- Dropzone / unggah berkas
export interface UploadedFile {
  id: string;
  file?: File;
  name: string;
  size: number;
  /** 0–100 saat diunggah; undefined = selesai. */
  progress?: number;
  error?: string;
  url?: string;
}
export interface DropzoneProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  /** Batas ukuran per berkas (byte). Berkas lebih besar ditolak dengan pesan. */
  maxSize?: number;
  disabled?: boolean;
  title?: React.ReactNode;
  hint?: React.ReactNode;
  onReject?: (message: string) => void;
  className?: string;
}
export function Dropzone({ onFiles, accept, multiple, maxSize, disabled, title, hint, onReject, className }: DropzoneProps) {
  const input = React.useRef<HTMLInputElement>(null);
  const [drag, setDrag] = React.useState(false);
  const handle = (list: FileList | null) => {
    if (!list || disabled) return;
    const files = [...list];
    const ok = files.filter((f) => !maxSize || f.size <= maxSize);
    if (ok.length < files.length) onReject?.(`Berkas melebihi batas ${formatBytes(maxSize!)}.`);
    if (ok.length) onFiles(multiple ? ok : ok.slice(0, 1));
  };
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={cn('u-dropzone', className)}
      data-dragging={dataFlag(drag)}
      data-disabled={dataFlag(disabled)}
      aria-disabled={disabled}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.current?.click())}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handle(e.dataTransfer.files);
      }}
    >
      <span className="u-dropzone-icon">
        <UploadCloud />
      </span>
      <span className="u-dropzone-title">{title ?? <><span>Pilih berkas</span> atau seret ke sini</>}</span>
      <span className="u-dropzone-hint">{hint ?? [accept?.replace(/\./g, '').toUpperCase().replace(/,/g, ', '), maxSize && `maks. ${formatBytes(maxSize)}`].filter(Boolean).join(' · ')}</span>
      <input ref={input} type="file" hidden accept={accept} multiple={multiple} onChange={(e) => (handle(e.target.files), (e.target.value = ''))} />
    </div>
  );
}

function fileKind(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'img';
  if (['doc', 'docx', 'odt'].includes(ext)) return 'doc';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'xls';
  return 'file';
}
export function FileList({ files, onRemove }: { files: UploadedFile[]; onRemove?: (id: string) => void }) {
  if (!files.length) return null;
  return (
    <ul className="u-file-list">
      {files.map((f) => {
        const kind = fileKind(f.name);
        return (
          <li key={f.id} className="u-file-item">
            <span className="u-file-icon" data-type={kind}>
              {kind === 'file' ? <FileText size={16} /> : f.name.split('.').pop()!.toUpperCase().slice(0, 4)}
            </span>
            <span className="u-file-body">
              <span className="u-file-name">{f.url ? <a href={f.url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{f.name}</a> : f.name}</span>
              {f.progress != null ? (
                <span className="u-progress-track" data-size="sm">
                  <span className="u-progress-indicator" style={{ width: `${f.progress}%`, display: 'block' }} />
                </span>
              ) : (
                <span className="u-file-meta" style={f.error ? { color: 'var(--u-danger-text)' } : undefined}>
                  {f.error ?? formatBytes(f.size)}
                </span>
              )}
            </span>
            {onRemove && (
              <Button variant="ghost" size="xs" iconOnly aria-label={`Hapus ${f.name}`} onClick={() => onRemove(f.id)}>
                <X />
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
