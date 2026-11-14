'use client';
import * as React from 'react';
import { Download } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from '../components/actions';
import { Calendar, toISODate } from '../components/calendar';
import { Alert } from '../components/display';
import { AgendaList, EVENT_COLORS, EventCalendar, EventLegend, eventsByDay, formatEventRange, type CalendarEvent } from '../components/schedule';
import { pesanGalat, useSiakadQuery } from './provider';
import { KodeLaporan } from '../components/galat';

/** Satu baris dari `GET /v1/kalender/terpadu`. */
export interface KegiatanTerpadu {
  sumber: 'kalender' | 'libur' | 'tahun' | 'batas' | 'portal' | 'pmb' | string;
  jenis: string;
  judul: string;
  mulai: string;
  selesai: string | null;
  id?: number;
  libur?: boolean;
  lokasi?: string | null;
  tautan?: string | null;
  warna?: string | null;
  keterangan?: string | null;
  tahun_id?: string | null;
  kode_prodi?: string | null;
}

export const JENIS_KEGIATAN: Record<string, string> = {
  akademik: 'Akademik',
  perkuliahan: 'Perkuliahan',
  ujian: 'Ujian',
  krs: 'KRS',
  nilai: 'Nilai',
  libur: 'Libur',
  cuti_bersama: 'Cuti bersama',
  wisuda: 'Wisuda',
  pmb: 'PMB',
  keuangan: 'Keuangan',
  kemahasiswaan: 'Kemahasiswaan',
  rapat: 'Rapat',
  lainnya: 'Lainnya',
};

/** Ubah baris kalender terpadu menjadi `CalendarEvent`. */
export function keEvent(k: KegiatanTerpadu, i = 0): CalendarEvent {
  return {
    id: `${k.sumber}-${k.id ?? i}`,
    title: k.judul,
    start: k.mulai,
    end: k.selesai,
    kind: k.jenis,
    color: k.warna || undefined,
    location: k.lokasi || undefined,
    description: k.keterangan || undefined,
    href: k.tautan || undefined,
    holiday: !!k.libur || k.jenis === 'libur' || k.jenis === 'cuti_bersama',
  };
}

interface KalenderQuery {
  kodeProdi?: string;
  tahunId?: string;
  /** Sumber yang diambil, mis. ['kalender','libur','tahun']. Bawaan semua. */
  sumber?: string[];
}

function useKalender(dari: string, sampai: string, { kodeProdi, tahunId, sumber }: KalenderQuery) {
  return useSiakadQuery<KegiatanTerpadu[]>(
    ['kalender-terpadu', dari, sampai, kodeProdi, tahunId, sumber?.join(',')],
    (s, signal) =>
      s.kalender.getTerpadu(
        {
          dari,
          sampai,
          kode_prodi: kodeProdi,
          tahun_id: tahunId,
          sumber: sumber?.join(','),
        },
        { signal },
      ) as never,
  );
}

const awalBulan = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const rentangGrid = (m: Date) => {
  const first = awalBulan(m);
  const off = (first.getDay() + 6) % 7;
  return [toISODate(new Date(first.getFullYear(), first.getMonth(), 1 - off)), toISODate(new Date(first.getFullYear(), first.getMonth(), 42 - off))] as const;
};

// ================================================================ Kalender akademik penuh
export interface KalenderAkademikProps extends KalenderQuery {
  /** Bulan awal. Bawaan bulan ini. */
  initialMonth?: Date;
  /** Tautan langganan .ics (mis. `${baseUrl}/v1/kalender/ics`) untuk tombol "Langganan". */
  icsUrl?: string;
  /** Klik kegiatan; bawaan membuka panel tanggal itu. */
  onKegiatanClick?: (k: CalendarEvent) => void;
  className?: string;
}

/**
 * Kalender akademik dari `kalender.getTerpadu`: grid bulan + panel agenda tanggal terpilih,
 * legenda yang bisa dipakai menyaring jenis kegiatan, dan tombol langganan .ics.
 */
export function KalenderAkademik({ initialMonth, icsUrl, onKegiatanClick, className, ...q }: KalenderAkademikProps) {
  const [month, setMonth] = React.useState(() => awalBulan(initialMonth ?? new Date()));
  const [selected, setSelected] = React.useState<string>(() => toISODate(new Date()));
  const [hidden, setHidden] = React.useState<string[]>([]);
  const [dari, sampai] = rentangGrid(month);
  const { data, loading, error, refetch } = useKalender(dari, sampai, q);

  const events = React.useMemo(() => (data ?? []).map(keEvent), [data]);
  const visible = React.useMemo(() => events.filter((e) => !hidden.includes(e.kind ?? '')), [events, hidden]);
  const kinds = React.useMemo(() => [...new Set(events.map((e) => e.kind ?? 'lainnya'))].sort((a, b) => Object.keys(JENIS_KEGIATAN).indexOf(a) - Object.keys(JENIS_KEGIATAN).indexOf(b)), [events]);
  const byDay = React.useMemo(() => eventsByDay(visible), [visible]);
  const hariIni = byDay.get(selected) ?? [];
  // Mendatang: 5 kegiatan berikutnya setelah tanggal terpilih (untuk panel saat tanggal kosong).
  const mendatang = React.useMemo(() => visible.filter((e) => e.start.slice(0, 10) > selected).slice(0, 5), [visible, selected]);

  return (
    <div className={cn('u-kalender-wrap', className)}>
      <div className="u-kalender">
        <div style={{ display: 'grid', gap: '0.75rem', minWidth: 0 }}>
          <EventCalendar
            events={visible}
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            onSelect={(d) => setSelected(d)}
            onEventClick={(e) => (onKegiatanClick ? onKegiatanClick(e) : setSelected(e.start.slice(0, 10) < dari ? dari : e.start.slice(0, 10)))}
            loading={loading && !data}
            toolbar={
              icsUrl ? (
                <Button variant="outline" size="sm" render={<a href={icsUrl} />}>
                  <Download /> Langganan .ics
                </Button>
              ) : undefined
            }
          />
          {error && (
            <Alert
              variant="danger"
              title="Kalender gagal dimuat"
              actions={
                <Button size="sm" variant="outline" onClick={refetch}>
                  Coba lagi
                </Button>
              }
            >
              {pesanGalat(error, { kode: false })}
              <KodeLaporan error={error} />
            </Alert>
          )}
          {kinds.length > 0 && <EventLegend kinds={kinds} labels={JENIS_KEGIATAN} hidden={hidden} onToggle={(k) => setHidden((h) => (h.includes(k) ? h.filter((x) => x !== k) : [...h, k]))} />}
        </div>
        <aside className="u-kalender-side" aria-label="Agenda tanggal terpilih">
          <h4>{formatEventRange(selected, null, true)}</h4>
          <p>{hariIni.length ? `${hariIni.length} kegiatan` : 'Tidak ada kegiatan di tanggal ini'}</p>
          {hariIni.length > 0 && <AgendaList events={hariIni} onEventClick={onKegiatanClick} compact />}
          <h4 className="u-kalender-sub">Berikutnya</h4>
          <AgendaList events={mendatang} loading={loading && !data} onEventClick={onKegiatanClick} compact empty="Belum ada kegiatan terjadwal." />
        </aside>
      </div>
    </div>
  );
}

// ================================================================ Versi sidebar
export interface KalenderSidebarProps extends KalenderQuery {
  /** Judul widget. */
  title?: React.ReactNode;
  /** Jumlah kegiatan mendatang yang ditampilkan. Bawaan 4. */
  limit?: number;
  /** Tautan "Lihat semua". */
  href?: string;
  onKegiatanClick?: (k: CalendarEvent) => void;
  className?: string;
}

/**
 * Kalender ringkas untuk sidebar portal/dasbor: kalender kecil dengan titik warna per kegiatan.
 * Klik tanggal untuk melihat kegiatannya; tanpa pilihan, tampil kegiatan mendatang.
 */
export function KalenderSidebar({ title = 'Kalender akademik', limit = 4, href, onKegiatanClick, className, ...q }: KalenderSidebarProps) {
  const [month, setMonth] = React.useState(() => awalBulan(new Date()));
  const [selected, setSelected] = React.useState<Date | null>(null);
  const [dari, sampai] = rentangGrid(month);
  const { data, loading } = useKalender(dari, sampai, q);
  const events = React.useMemo(() => (data ?? []).map(keEvent), [data]);
  const byDay = React.useMemo(() => eventsByDay(events, dari, sampai), [events, dari, sampai]);
  const markers = React.useMemo(() => {
    const m: Record<string, { color?: string }[]> = {};
    byDay.forEach(
      (list, k) =>
        (m[k] = list.slice(0, 3).map((e) => ({
          color: e.color ?? EVENT_COLORS[e.kind ?? ''] ?? 'var(--u-primary)',
        }))),
    );
    return m;
  }, [byDay]);
  const today = toISODate(new Date());
  const sel = selected ? toISODate(selected) : null;
  const list = sel ? (byDay.get(sel) ?? []) : events.filter((e) => e.start.slice(0, 10) >= today);

  return (
    <section className={cn('u-kalender-mini', className)}>
      <div className="u-kalender-mini-head">
        <h4>{title}</h4>
        {href && (
          <a className="u-kalender-link" href={href}>
            Lihat semua
          </a>
        )}
      </div>
      <Calendar value={selected} onValueChange={(d) => setSelected(sel === toISODate(d) ? null : d)} month={month} onMonthChange={setMonth} markers={markers} cellSize={34} />
      <div className="u-kalender-mini-head">
        <h4
          style={{
            fontSize: 'var(--u-text-xs)',
            color: 'var(--u-muted-foreground)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {sel ? formatEventRange(sel, null, true) : 'Mendatang'}
        </h4>
        {sel && (
          <Button variant="link" size="xs" onClick={() => setSelected(null)}>
            Tampilkan mendatang
          </Button>
        )}
      </div>
      <AgendaList events={list} limit={limit} loading={loading && !data} onEventClick={onKegiatanClick} compact empty={sel ? 'Tidak ada kegiatan.' : 'Belum ada kegiatan terjadwal.'} />
    </section>
  );
}
