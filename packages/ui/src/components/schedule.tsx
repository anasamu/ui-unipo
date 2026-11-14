"use client";
import * as React from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
} from "lucide-react";
import { cn, dataFlag } from "../lib/cn";
import { Button, Skeleton } from "./actions";
import { monthMatrix, parseISODate, toISODate } from "./calendar";

// ================================================================ Tipe
export interface CalendarEvent {
  id?: string | number;
  title: React.ReactNode;
  /** Tanggal mulai, YYYY-MM-DD atau ISO lengkap. */
  start: string;
  /** Tanggal selesai (inklusif). Kosong = satu hari. */
  end?: string | null;
  /** Jenis kegiatan: menentukan warna bila `color` kosong. */
  kind?: string;
  color?: string;
  location?: React.ReactNode;
  /** Jam, mis. "08.00–10.00". */
  time?: React.ReactNode;
  description?: React.ReactNode;
  href?: string;
  /** Hari libur: tanggalnya diberi warna merah. */
  holiday?: boolean;
}

/** Warna bawaan per jenis kegiatan (jenis dari kalender SIAKAD). Bisa ditimpa lewat prop `colors`. */
export const EVENT_COLORS: Record<string, string> = {
  akademik: "var(--u-primary)",
  perkuliahan: "#0891b2",
  ujian: "#7c3aed",
  krs: "var(--u-info)",
  nilai: "#0d9488",
  libur: "var(--u-danger)",
  cuti_bersama: "var(--u-danger)",
  wisuda: "#c026d3",
  pmb: "var(--u-secondary, #f59e0b)",
  keuangan: "var(--u-warning)",
  kemahasiswaan: "#16a34a",
  rapat: "#64748b",
  lainnya: "#64748b",
};

const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const BULAN_PENDEK = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const HARI_PANJANG = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const iso = (s: string) => s.slice(0, 10);
export function eventColor(
  e: CalendarEvent,
  colors: Record<string, string> = EVENT_COLORS,
): string {
  return e.color ?? (e.kind ? colors[e.kind] : undefined) ?? "var(--u-primary)";
}

/** Kelompokkan kegiatan per tanggal ISO (kegiatan beberapa hari muncul di tiap harinya). */
export function eventsByDay(
  events: CalendarEvent[],
  from?: string,
  to?: string,
): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const a = iso(e.start);
    const b = e.end ? iso(e.end) : a;
    const d = parseISODate(from && a < from ? from : a);
    const last = to && b > to ? to : b;
    for (let i = 0; i < 400 && toISODate(d) <= last; i++) {
      const k = toISODate(d);
      (map.get(k) ?? map.set(k, []).get(k)!).push(e);
      d.setDate(d.getDate() + 1);
    }
  }
  return map;
}

/** "12–14 Nov 2026", "12 Nov – 3 Des 2026", atau "Selasa, 12 November 2026". */
export function formatEventRange(
  start: string,
  end?: string | null,
  long = false,
): string {
  const a = parseISODate(iso(start));
  const b = end && iso(end) !== iso(start) ? parseISODate(iso(end)) : null;
  if (!b)
    return long
      ? `${HARI_PANJANG[a.getDay()]}, ${a.getDate()} ${BULAN[a.getMonth()]} ${a.getFullYear()}`
      : `${a.getDate()} ${BULAN_PENDEK[a.getMonth()]} ${a.getFullYear()}`;
  const M = long ? BULAN : BULAN_PENDEK;
  if (a.getFullYear() !== b.getFullYear())
    return `${a.getDate()} ${M[a.getMonth()]} ${a.getFullYear()} – ${b.getDate()} ${M[b.getMonth()]} ${b.getFullYear()}`;
  if (a.getMonth() !== b.getMonth())
    return `${a.getDate()} ${M[a.getMonth()]} – ${b.getDate()} ${M[b.getMonth()]} ${b.getFullYear()}`;
  return `${a.getDate()}–${b.getDate()} ${M[a.getMonth()]} ${a.getFullYear()}`;
}

// ================================================================ Tile tanggal
/** Tile tanggal (bulan + angka) untuk daftar agenda dan kartu acara. */
export function DateTile({
  date,
  tone,
  size = "md",
  className,
}: {
  date: string | Date;
  tone?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const d = typeof date === "string" ? parseISODate(iso(date)) : date;
  return (
    <span
      className={cn("u-date-tile", className)}
      data-size={size}
      style={tone ? ({ "--tone": tone } as React.CSSProperties) : undefined}
    >
      <span className="u-date-tile-month">{BULAN_PENDEK[d.getMonth()]}</span>
      <span className="u-date-tile-day">{d.getDate()}</span>
    </span>
  );
}

// ================================================================ Kalender acara (bulanan)
export interface EventCalendarProps {
  events: CalendarEvent[];
  /** Bulan yang ditampilkan (terkendali). */
  month?: Date;
  onMonthChange?: (month: Date) => void;
  selected?: string | null;
  onSelect?: (isoDate: string, events: CalendarEvent[]) => void;
  onEventClick?: (event: CalendarEvent) => void;
  /** Maksimal baris acara per minggu sebelum "+n lagi". Bawaan 3. */
  maxPerDay?: number;
  loading?: boolean;
  colors?: Record<string, string>;
  /** Isi tambahan di kanan judul bulan (filter, tombol unduh .ics, dll). */
  toolbar?: React.ReactNode;
  className?: string;
}

interface Segmen {
  e: CalendarEvent;
  from: number;
  to: number;
  lane: number;
  head: boolean;
  tail: boolean;
}

/** Susun acara satu minggu ke jalur (lane): acara beberapa hari jadi satu bilah memanjang. */
function susunMinggu(events: CalendarEvent[], days: string[]): Segmen[] {
  const a = days[0]!;
  const b = days[6]!;
  const segs = events
    .filter(
      (e) => iso(e.start) <= b && (e.end ? iso(e.end) : iso(e.start)) >= a,
    )
    .map((e) => {
      const s = iso(e.start);
      const t = e.end ? iso(e.end) : s;
      return {
        e,
        from: s < a ? 0 : days.indexOf(s),
        to: t > b ? 6 : days.indexOf(t),
        lane: 0,
        head: s >= a,
        tail: t <= b,
      };
    })
    .sort((x, y) => x.from - y.from || y.to - y.from - (x.to - x.from));
  const lanes: number[] = [];
  for (const s of segs) {
    let l = lanes.findIndex((end) => end < s.from);
    if (l < 0) l = lanes.push(-1) - 1;
    lanes[l] = s.to;
    s.lane = l;
  }
  return segs;
}

/** Kalender bulanan: acara beberapa hari tampil sebagai satu bilah memanjang, "+n lagi" per hari, hari libur merah, titik warna di ponsel. */
export function EventCalendar({
  events,
  month: monthProp,
  onMonthChange,
  selected,
  onSelect,
  onEventClick,
  maxPerDay = 3,
  loading,
  colors,
  toolbar,
  className,
}: EventCalendarProps) {
  const [monthState, setMonthState] = React.useState(
    () => monthProp ?? new Date(),
  );
  const month = monthProp ?? monthState;
  const setMonth = (m: Date) => {
    setMonthState(m);
    onMonthChange?.(m);
  };
  const days = monthMatrix(month.getFullYear(), month.getMonth());
  const from = toISODate(days[0]!);
  const to = toISODate(days[41]!);
  const byDay = React.useMemo(
    () => eventsByDay(events, from, to),
    [events, from, to],
  );
  const today = toISODate(new Date());
  const go = (n: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const rows = days[35]!.getMonth() !== month.getMonth() ? 5 : 6;

  return (
    <div className={cn("u-evcal", className)} data-loading={dataFlag(loading)}>
      <div className="u-evcal-head">
        <div className="u-evcal-nav">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setMonth(
                new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              )
            }
          >
            Hari ini
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Bulan sebelumnya"
            onClick={() => go(-1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Bulan berikutnya"
            onClick={() => go(1)}
          >
            <ChevronRight />
          </Button>
        </div>
        <h3 className="u-evcal-title" aria-live="polite">
          {BULAN[month.getMonth()]} <span>{month.getFullYear()}</span>
        </h3>
        {toolbar && <div className="u-evcal-toolbar">{toolbar}</div>}
      </div>
      <div
        className="u-evcal-grid"
        role="grid"
        aria-label={`${BULAN[month.getMonth()]} ${month.getFullYear()}`}
      >
        <div className="u-evcal-weekdays" role="row">
          {HARI.map((h) => (
            <span key={h} role="columnheader">
              {h}
            </span>
          ))}
        </div>
        {Array.from({ length: rows }, (_, r) => {
          const week = days.slice(r * 7, r * 7 + 7);
          const keys = week.map(toISODate);
          const segs = loading ? [] : susunMinggu(events, keys);
          const shown = segs.filter(
            (s) =>
              s.lane < maxPerDay - 1 ||
              (s.lane === maxPerDay - 1 &&
                keys
                  .slice(s.from, s.to + 1)
                  .every((k) => (byDay.get(k)?.length ?? 0) <= maxPerDay)),
          );
          return (
            <div
              className="u-evcal-week"
              role="row"
              key={r}
              style={{ "--lanes": maxPerDay } as React.CSSProperties}
            >
              {week.map((d, c) => {
                const k = keys[c]!;
                const list = byDay.get(k) ?? [];
                const hidden =
                  list.length -
                  shown.filter((s) => s.from <= c && s.to >= c).length;
                return (
                  <div
                    key={k}
                    role="gridcell"
                    className="u-evcal-day"
                    style={{ gridColumn: c + 1 }}
                    data-outside={dataFlag(d.getMonth() !== month.getMonth())}
                    data-today={dataFlag(k === today)}
                    data-selected={dataFlag(k === selected)}
                    data-weekend={dataFlag(d.getDay() === 0)}
                    data-holiday={dataFlag(list.some((e) => e.holiday))}
                    aria-selected={k === selected}
                  >
                    <button
                      type="button"
                      className="u-evcal-date"
                      onClick={() => onSelect?.(k, list)}
                      aria-label={`${formatEventRange(k, null, true)}, ${list.length} kegiatan`}
                    >
                      {d.getDate()}
                    </button>
                    {loading && (r + c) % 4 === 1 && (
                      <Skeleton className="u-evcal-skel" />
                    )}
                    {hidden > 0 && (
                      <button
                        type="button"
                        className="u-evcal-more"
                        onClick={() => onSelect?.(k, list)}
                      >
                        +{hidden} lagi
                      </button>
                    )}
                    {list.length > 0 && (
                      <span className="u-evcal-dots" aria-hidden>
                        {list.slice(0, 3).map((e, i) => (
                          <i
                            key={i}
                            style={{ background: eventColor(e, colors) }}
                          />
                        ))}
                      </span>
                    )}
                  </div>
                );
              })}
              {shown.map((s, i) => (
                <button
                  key={`${s.e.id ?? i}-${i}`}
                  type="button"
                  className="u-evcal-chip"
                  title={typeof s.e.title === "string" ? s.e.title : undefined}
                  data-span={dataFlag(
                    !!s.e.end && iso(s.e.end) !== iso(s.e.start),
                  )}
                  data-head={dataFlag(s.head)}
                  data-tail={dataFlag(s.tail)}
                  style={
                    {
                      gridColumn: `${s.from + 1} / ${s.to + 2}`,
                      gridRow: s.lane + 2,
                      "--tone": eventColor(s.e, colors),
                    } as React.CSSProperties
                  }
                  onClick={() =>
                    onEventClick
                      ? onEventClick(s.e)
                      : onSelect?.(
                          keys[s.from]!,
                          byDay.get(keys[s.from]!) ?? [],
                        )
                  }
                >
                  {s.e.time && !s.e.end ? (
                    <span className="u-evcal-chip-time">{s.e.time}</span>
                  ) : null}
                  {s.e.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ================================================================ Daftar agenda
export interface AgendaListProps {
  events: CalendarEvent[];
  /** 'day' = dikelompokkan per tanggal; 'none' = daftar datar dengan tile tanggal. */
  groupBy?: "day" | "none";
  colors?: Record<string, string>;
  /** Label jenis untuk lencana kecil. */
  kindLabels?: Record<string, string>;
  onEventClick?: (event: CalendarEvent) => void;
  empty?: React.ReactNode;
  loading?: boolean;
  /** Tampilan rapat untuk sidebar. */
  compact?: boolean;
  limit?: number;
  className?: string;
}

/** Daftar agenda: tile tanggal, garis warna per jenis, rentang tanggal, lokasi, dan jam. */
export function AgendaList({
  events,
  groupBy = "none",
  colors,
  kindLabels,
  onEventClick,
  empty,
  loading,
  compact,
  limit,
  className,
}: AgendaListProps) {
  if (loading)
    return (
      <ul
        className={cn("u-agenda", className)}
        data-compact={dataFlag(compact)}
        aria-busy
      >
        {Array.from({ length: compact ? 3 : 4 }, (_, i) => (
          <li key={i} className="u-agenda-item">
            <Skeleton className="u-agenda-skel-tile" />
            <div style={{ flex: 1, display: "grid", gap: 6 }}>
              <Skeleton style={{ height: 14, width: "70%" }} />
              <Skeleton style={{ height: 12, width: "40%" }} />
            </div>
          </li>
        ))}
      </ul>
    );
  const list = limit ? events.slice(0, limit) : events;
  if (!list.length)
    return (
      <div className={cn("u-agenda-empty", className)}>
        {empty ?? (
          <>
            <CalendarDays aria-hidden /> Tidak ada kegiatan.
          </>
        )}
      </div>
    );

  const item = (e: CalendarEvent, i: number, tile: boolean) => {
    const color = eventColor(e, colors);
    const Tag = e.href ? "a" : onEventClick ? "button" : "div";
    return (
      <li
        key={`${e.id ?? i}-${i}`}
        className="u-agenda-item"
        style={{ "--tone": color } as React.CSSProperties}
      >
        <Tag
          className="u-agenda-link"
          {...(e.href
            ? { href: e.href }
            : onEventClick
              ? { type: "button" as const, onClick: () => onEventClick(e) }
              : {})}
        >
          {tile ? (
            <DateTile
              date={e.start}
              tone={color}
              size={compact ? "sm" : "md"}
            />
          ) : (
            <span className="u-agenda-bar" aria-hidden />
          )}
          <span className="u-agenda-body">
            <span className="u-agenda-title">{e.title}</span>
            <span className="u-agenda-meta">
              {(tile || e.end) && (
                <span>{formatEventRange(e.start, e.end)}</span>
              )}
              {e.time && (
                <span>
                  <Clock aria-hidden />
                  {e.time}
                </span>
              )}
              {e.location && (
                <span>
                  <MapPin aria-hidden />
                  {e.location}
                </span>
              )}
            </span>
            {!compact && e.description && (
              <span className="u-agenda-desc">{e.description}</span>
            )}
          </span>
          {e.kind && kindLabels?.[e.kind] && !compact && (
            <span className="u-agenda-kind">{kindLabels[e.kind]}</span>
          )}
        </Tag>
      </li>
    );
  };

  if (groupBy === "none")
    return (
      <ul
        className={cn("u-agenda", className)}
        data-compact={dataFlag(compact)}
      >
        {list.map((e, i) => item(e, i, true))}
      </ul>
    );

  const groups = new Map<string, CalendarEvent[]>();
  for (const e of list)
    (
      groups.get(iso(e.start)) ??
      groups.set(iso(e.start), []).get(iso(e.start))!
    ).push(e);
  return (
    <div
      className={cn("u-agenda-groups", className)}
      data-compact={dataFlag(compact)}
    >
      {[...groups].map(([day, evs]) => (
        <section key={day} className="u-agenda-group">
          <h4 className="u-agenda-day">{formatEventRange(day, null, true)}</h4>
          <ul className="u-agenda">{evs.map((e, i) => item(e, i, false))}</ul>
        </section>
      ))}
    </div>
  );
}

// ================================================================ Legenda
export function EventLegend({
  kinds,
  labels,
  colors = EVENT_COLORS,
  hidden,
  onToggle,
  className,
}: {
  kinds: string[];
  labels?: Record<string, string>;
  colors?: Record<string, string>;
  /** Jenis yang disembunyikan; bila `onToggle` diisi, legenda jadi filter. */
  hidden?: string[];
  onToggle?: (kind: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("u-ev-legend", className)}
      role={onToggle ? "group" : undefined}
      aria-label="Jenis kegiatan"
    >
      {kinds.map((k) => {
        const off = hidden?.includes(k);
        const content = (
          <>
            <i
              style={{ background: colors[k] ?? "var(--u-primary)" }}
              aria-hidden
            />
            {labels?.[k] ?? k}
          </>
        );
        return onToggle ? (
          <button
            key={k}
            type="button"
            className="u-ev-legend-item"
            aria-pressed={!off}
            data-off={dataFlag(off)}
            onClick={() => onToggle(k)}
          >
            {content}
          </button>
        ) : (
          <span key={k} className="u-ev-legend-item">
            {content}
          </span>
        );
      })}
    </div>
  );
}
