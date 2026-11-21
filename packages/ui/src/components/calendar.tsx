'use client';
import * as React from 'react';
import { Popover as BasePopover } from '@base-ui/react/popover';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, FileText, UploadCloud, X } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { formatBytes, formatDate } from '../lib/format';
import { usePlatform } from '../lib/platform';
import { formatIsianTanggal, maskerTanggal, namaBulan, uraiTanggal } from '../lib/tanggal';
import { Button } from './actions';
import { Input } from './forms';
import { Dialog } from './overlays';

export { formatIsianTanggal, formatPanjangTanggal, indeksBulan, maskerTanggal, namaBulan, uraiTanggal, type HasilUraiTanggal, type OpsiUraiTanggal } from '../lib/tanggal';

// ---------------------------------------------------------------- utilitas tanggal (tanpa dependensi)
export const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseISODate = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const awalHari = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const hariDalamBulan = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
/** Geser k bulan; tanggal dijepit ke akhir bulan (31 Jan + 1 bulan = 28/29 Feb). */
const geserBulan = (d: Date, k: number) => {
  const y = d.getFullYear();
  const m = d.getMonth() + k;
  return new Date(y, m, Math.min(d.getDate(), hariDalamBulan(y, m)));
};

/** 42 sel (6 minggu) dimulai Senin. */
export function monthMatrix(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - offset + i));
}
const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const NAMA_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const TAHUN_PER_HALAMAN = 12;
const awalHalamanTahun = (y: number) => y - (((y % TAHUN_PER_HALAMAN) + TAHUN_PER_HALAMAN) % TAHUN_PER_HALAMAN);

export interface CalendarMarker {
  /** Warna titik (variabel CSS atau warna). */
  color?: string;
}

/** Tampilan kalender: grid hari, 12 bulan, atau 12 tahun per halaman. */
export type TampilanKalender = 'hari' | 'bulan' | 'tahun';

// ---------------------------------------------------------------- sumber data kalender akademik (opsional)
/** Tahapan/kegiatan beberapa hari (KRS, UTS, perkuliahan, …). Tanggal ISO `YYYY-MM-DD`. */
export interface TahapanKalender {
  judul: string;
  /** Jenis kegiatan: krs, ujian, nilai, perkuliahan, keuangan, wisuda, akademik, … */
  jenis: string;
  /** Kode tahapan SIAKAD: krs, perubahan_krs, uts, uas, input_nilai_dosen, … (kolom lama dinormalkan). */
  tahap?: string | null;
  mulai: string;
  selesai: string | null;
  warna?: string | null;
  tahunId?: string | null;
  /** false = tidak digambar sebagai latar (mis. perkuliahan yang sepanjang semester); tetap di tooltip. */
  latar?: boolean;
}
export interface AgendaKalender {
  judul: string;
  jenis: string;
  warna?: string | null;
}
export interface DataBulanKalender {
  /** ISO → nama libur. */
  libur: Record<string, string>;
  /** ISO → agenda satu hari (titik). */
  agenda: Record<string, AgendaKalender[]>;
  tahapan: TahapanKalender[];
}
/**
 * Sumber data untuk Calendar/DatePicker/DateRangePicker (libur, agenda, tahapan, kunci periode).
 * Dipasang oleh `KalenderAkademikProvider` (unipo-ui/siakad; otomatis di `UnipoProvider` dengan SDK) atau sendiri.
 */
export interface SumberKalenderTanggal {
  /** Minta data bulan (bulan 0–11); dipanggil Calendar saat bulan tampil berubah. Hasil disimpan per bulan. */
  muatBulan: (tahun: number, bulan: number) => void;
  /** Data bulan yang sudah dimuat (null bila belum/galat). */
  dataBulan: (tahun: number, bulan: number) => DataBulanKalender | null;
  /** Tahapan periode-periode terbaru (lepas dari bulan tampil) untuk `batasTahapan` dan preset. */
  tahapan: TahapanKalender[];
  /** Pesan bila tanggal ISO jatuh di periode yang sudah ditutup (kunci periode), selainnya null. */
  periodeDitutup: (iso: string) => string | null;
  /** Preset rentang dari kalender: Semester ini, Periode KRS, Masa UTS, Masa UAS. */
  preset: PresetRentang[];
  warna: (jenis: string) => string;
  label: (jenis: string) => string;
}
export const KonteksKalenderTanggal = React.createContext<SumberKalenderTanggal | null>(null);
/** Sumber kalender akademik terdekat (null tanpa penyedia atau bila `aktif` false). */
export function useSumberKalenderTanggal(aktif = true): SumberKalenderTanggal | null {
  const s = React.useContext(KonteksKalenderTanggal);
  return aktif ? s : null;
}

/** Kode tahapan kolom lama `m_tahun` → kode tahapan kalender modern. */
const TAHAP_LAMA: Record<string, string> = {
  bayar_mulai: 'pembayaran',
  krs_online_mulai: 'krs',
  krs_ubah_mulai: 'perubahan_krs',
  kss_cetak_mulai: 'cetak_krs',
  akhir_kss: 'cetak_krs',
  kuliah_mulai: 'perkuliahan',
  uts_mulai: 'uts',
  uas_mulai: 'uas',
  nilai_mulai: 'input_nilai',
};
/** Kode tahapan baku (kolom lama dinormalkan). */
export const kodeTahapan = (t: Pick<TahapanKalender, 'tahap' | 'jenis'>) => {
  const k = t.tahap ?? '';
  return TAHAP_LAMA[k] ?? (k || t.jenis);
};
/** Tahapan cocok dengan kunci, mis. 'krs' cocok krs/perubahan_krs/cetak_krs, 'nilai' cocok input_nilai_dosen. */
export function cocokTahapan(t: Pick<TahapanKalender, 'tahap' | 'jenis'>, kunci: string | string[]): boolean {
  const kode = kodeTahapan(t);
  return (Array.isArray(kunci) ? kunci : [kunci]).some((k) => kode === k || kode.split('_').includes(k));
}
const dalamTahapan = (iso: string, t: TahapanKalender) => t.mulai <= iso && (t.selesai ?? t.mulai) >= iso;
/** Urutan latar bila beberapa tahapan bertumpuk: yang lebih spesifik di depan. */
const PRIORITAS_JENIS = ['ujian', 'krs', 'nilai', 'wisuda', 'keuangan', 'akademik', 'kemahasiswaan', 'pmb'];
const prioritas = (j: string) => {
  const i = PRIORITAS_JENIS.indexOf(j);
  return i < 0 ? PRIORITAS_JENIS.length : i;
};

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
  /** Tampilan saat pertama dibuka: 'hari' (bawaan), 'bulan', atau 'tahun' (mis. tanggal lahir/SK lama). */
  tampilanAwal?: TampilanKalender;
  /** Bulan yang dibuka bila belum ada nilai (bawaan: hari ini, dijepit ke min/max). */
  awal?: Date;
  /** Tombol "Hari ini" di kaki kalender. */
  tombolHariIni?: boolean;
  /** Hari libur per tanggal ISO → nama libur; ditandai merah seperti akhir pekan. */
  libur?: Record<string, string>;
  /** Isi tambahan di kaki kalender (mis. tombol Hapus). */
  kaki?: React.ReactNode;
  /** Pakai data kalender akademik dari penyedia (libur, agenda, latar tahapan, legenda). Bawaan true; tanpa penyedia tidak berpengaruh. */
  kalenderAkademik?: boolean;
  /** Hanya tanggal di tahapan ini yang bisa dipilih, mis. 'krs' atau ['uts', 'uas']. Tanpa data tahapan tidak membatasi. */
  batasTahapan?: string | string[];
  /** Tanggal di periode yang sudah ditutup tidak bisa dipilih (bawaan: hanya diberi tanda). */
  blokirDitutup?: boolean;
  /** Legenda kecil jenis kegiatan di kaki (bawaan true bila ada data kalender akademik di bulan itu). */
  legenda?: boolean;
}

/**
 * Kalender bulanan dengan lompat cepat (klik nama bulan → 12 bulan, klik tahun → 12 tahun per halaman),
 * tombol Hari ini, navigasi keyboard (panah, PageUp/PageDown bulan, Shift+PageUp/PageDown tahun, Home/End minggu),
 * penanda agenda, hari libur, dan mode rentang.
 */
export function Calendar({
  value,
  onValueChange,
  range,
  onRangeChange,
  month,
  onMonthChange,
  markers,
  min,
  max,
  isDisabled,
  bordered,
  cellSize,
  className,
  highlightWeekend = true,
  tampilanAwal = 'hari',
  awal,
  tombolHariIni,
  libur,
  kaki,
  kalenderAkademik = true,
  batasTahapan,
  blokirDitutup,
  legenda = true,
}: CalendarProps) {
  const today = React.useMemo(() => awalHari(new Date()), []);
  const minH = min ? awalHari(min) : null;
  const maxH = max ? awalHari(max) : null;
  const jepit = (d: Date) => (minH && d < minH ? minH : maxH && d > maxH ? maxH : d);
  const [innerMonth, setInnerMonth] = React.useState(() => month ?? value ?? range?.from ?? awal ?? jepit(today));
  const view = month ?? innerMonth;
  const vy = view.getFullYear();
  const vm = view.getMonth();
  const [mode, setModeState] = React.useState<TampilanKalender>(tampilanAwal);
  const [focus, setFocus] = React.useState<Date>(() => value ?? range?.from ?? awal ?? jepit(today));
  const [awalTahun, setAwalTahun] = React.useState(() => awalHalamanTahun(vy));
  const [sorotBulan, setSorotBulan] = React.useState(vm);
  const [sorotTahun, setSorotTahun] = React.useState(vy);
  const akarRef = React.useRef<HTMLDivElement>(null);
  const mintaFokus = React.useRef(false);

  const setView = (d: Date) => {
    const m = new Date(d.getFullYear(), d.getMonth(), 1);
    setInnerMonth(m);
    onMonthChange?.(m);
  };
  const setMode = (m: TampilanKalender, fokuskan = true) => {
    if (m === 'bulan') setSorotBulan(vm);
    if (m === 'tahun') {
      setSorotTahun(vy);
      setAwalTahun(awalHalamanTahun(vy));
    }
    mintaFokus.current = fokuskan;
    setModeState(m);
  };

  const dalamView = (d?: Date | null): boolean => !!d && d.getFullYear() === vy && d.getMonth() === vm;
  const fokus = dalamView(focus) ? focus : dalamView(value) ? value! : dalamView(range?.from) ? range!.from! : new Date(vy, vm, Math.min(focus.getDate(), hariDalamBulan(vy, vm)));

  const days = monthMatrix(vy, vm);
  const title = `${namaBulan(vm)} ${vy}`;

  // Data kalender akademik (bila ada penyedia): dimuat per bulan tampil.
  const sumber = useSumberKalenderTanggal(kalenderAkademik);
  const muatBulan = sumber?.muatBulan;
  React.useEffect(() => {
    muatBulan?.(vy, vm);
  }, [muatBulan, vy, vm]);
  const dataBulan = sumber?.dataBulan(vy, vm) ?? null;
  const liburGabung = dataBulan && Object.keys(dataBulan.libur).length ? { ...dataBulan.libur, ...libur } : libur;
  const tahapBulan = dataBulan?.tahapan ?? [];
  const tahapBatas = batasTahapan && sumber ? [...sumber.tahapan, ...tahapBulan].filter((t) => cocokTahapan(t, batasTahapan)) : [];
  const diluarBatas = (iso: string) => tahapBatas.length > 0 && !tahapBatas.some((t) => dalamTahapan(iso, t));
  const ditutup = (iso: string) => sumber?.periodeDitutup(iso) ?? null;
  const disabled = (d: Date) => {
    if ((minH && d < minH) || (maxH && d > maxH) || isDisabled?.(d)) return true;
    if (!sumber) return false;
    const iso = toISODate(d);
    return diluarBatas(iso) || Boolean(blokirDitutup && ditutup(iso));
  };
  const bulanNonaktif = (y: number, m: number) => Boolean((maxH && new Date(y, m, 1) > maxH) || (minH && new Date(y, m + 1, 0) < minH));
  const tahunNonaktif = (y: number) => Boolean((maxH && y > maxH.getFullYear()) || (minH && y < minH.getFullYear()));

  const pick = (d: Date) => {
    if (disabled(d)) return;
    setFocus(d);
    if (onRangeChange) {
      if (!range?.from || range.to) onRangeChange({ from: d, to: null });
      else onRangeChange(d < range.from ? { from: d, to: range.from } : { from: range.from, to: d });
    } else onValueChange?.(d);
    if (!dalamView(d)) setView(d);
  };

  const keTanggal = (n: Date) => {
    setFocus(n);
    if (!dalamView(n)) setView(n);
  };

  // Pindahkan fokus ke sel aktif bila fokus sudah di dalam grid, atau setelah ganti tampilan.
  React.useEffect(() => {
    const akar = akarRef.current;
    if (!akar) return;
    const aktif = document.activeElement as HTMLElement | null;
    if (!mintaFokus.current && !(aktif && akar.contains(aktif) && aktif.closest('[data-u-cal-grid]'))) return;
    mintaFokus.current = false;
    akar.querySelector<HTMLElement>('[data-u-cal-grid] [tabindex="0"]')?.focus();
  }, [mode, fokus.getTime(), sorotBulan, sorotTahun, vy, vm]);

  const sebelumNonaktif =
    mode === 'hari' ? Boolean(minH && new Date(vy, vm, 0) < minH) : mode === 'bulan' ? Boolean(minH && vy - 1 < minH.getFullYear()) : Boolean(minH && awalTahun - 1 < minH.getFullYear());
  const sesudahNonaktif =
    mode === 'hari'
      ? Boolean(maxH && new Date(vy, vm + 1, 1) > maxH)
      : mode === 'bulan'
        ? Boolean(maxH && vy + 1 > maxH.getFullYear())
        : Boolean(maxH && awalTahun + TAHUN_PER_HALAMAN > maxH.getFullYear());
  const geser = (arah: -1 | 1) => {
    if (mode === 'hari') {
      setView(new Date(vy, vm + arah, 1));
      setFocus(geserBulan(fokus, arah));
    } else if (mode === 'bulan') setView(new Date(vy + arah, vm, 1));
    else setAwalTahun(awalTahun + arah * TAHUN_PER_HALAMAN);
  };
  const labelGeser = (arah: -1 | 1) =>
    mode === 'hari' ? (arah < 0 ? 'Bulan sebelumnya' : 'Bulan berikutnya') : mode === 'bulan' ? (arah < 0 ? 'Tahun sebelumnya' : 'Tahun berikutnya') : arah < 0 ? '12 tahun sebelumnya' : '12 tahun berikutnya';

  const pilihBulan = (m: number) => {
    if (bulanNonaktif(vy, m)) return;
    setView(new Date(vy, m, 1));
    setFocus(jepit(new Date(vy, m, Math.min(fokus.getDate(), hariDalamBulan(vy, m)))));
    mintaFokus.current = true;
    setModeState('hari');
  };
  const pilihTahun = (y: number) => {
    if (tahunNonaktif(y)) return;
    const m = jepit(new Date(y, vm, 1));
    const bulan = m.getFullYear() === y ? m.getMonth() : vm;
    setView(new Date(y, bulan, 1));
    setSorotBulan(bulan);
    mintaFokus.current = true;
    setModeState('bulan');
  };

  const hariIni = () => {
    if (disabled(today)) return;
    pick(today);
    setView(today);
    mintaFokus.current = true;
    setModeState('hari');
  };

  const tombolJudul = (isi: React.ReactNode, label: string, ke: TampilanKalender, buka: boolean) => (
    <button type="button" className="u-calendar-title-btn" aria-label={label} aria-expanded={buka} onClick={() => setMode(buka ? 'hari' : ke)}>
      {isi}
      <ChevronDown aria-hidden data-open={dataFlag(buka)} />
    </button>
  );

  return (
    <div
      ref={akarRef}
      className={cn('u-calendar', className)}
      data-bordered={dataFlag(bordered)}
      data-mode={mode}
      style={cellSize ? ({ '--u-cal-cell': `${cellSize}px` } as React.CSSProperties) : undefined}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && mode !== 'hari') {
          // Esc di tampilan bulan/tahun kembali ke grid hari; Esc berikutnya menutup popup.
          e.preventDefault();
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation?.();
          setMode('hari');
        }
      }}
    >
      <div className="u-calendar-header">
        <div className="u-calendar-title" aria-live="polite">
          {mode === 'hari' && (
            <>
              {tombolJudul(namaBulan(vm), `${namaBulan(vm)}: pilih bulan`, 'bulan', false)}
              {tombolJudul(vy, `${vy}: pilih tahun`, 'tahun', false)}
            </>
          )}
          {mode === 'bulan' && tombolJudul(vy, `${vy}: pilih tahun`, 'tahun', false)}
          {mode === 'tahun' && (
            <span className="u-calendar-title-text">
              {awalTahun}–{awalTahun + TAHUN_PER_HALAMAN - 1}
            </span>
          )}
        </div>
        <div className="u-calendar-nav">
          <Button variant="ghost" size="xs" iconOnly aria-label={labelGeser(-1)} disabled={sebelumNonaktif} onClick={() => geser(-1)}>
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="xs" iconOnly aria-label={labelGeser(1)} disabled={sesudahNonaktif} onClick={() => geser(1)}>
            <ChevronRight />
          </Button>
        </div>
      </div>

      {mode === 'hari' && (
        <div
          data-u-cal-grid=""
          className="u-calendar-grid"
          role="grid"
          aria-label={title}
          onKeyDown={(e) => {
            const map: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
            const hariKe = (fokus.getDay() + 6) % 7; // 0 = Senin
            let n: Date | null = null;
            if (e.key in map) n = new Date(fokus.getFullYear(), fokus.getMonth(), fokus.getDate() + map[e.key]!);
            else if (e.key === 'PageUp' || e.key === 'PageDown') n = geserBulan(fokus, (e.key === 'PageUp' ? -1 : 1) * (e.shiftKey ? 12 : 1));
            else if (e.key === 'Home') n = new Date(fokus.getFullYear(), fokus.getMonth(), fokus.getDate() - hariKe);
            else if (e.key === 'End') n = new Date(fokus.getFullYear(), fokus.getMonth(), fokus.getDate() + 6 - hariKe);
            if (n) {
              e.preventDefault();
              mintaFokus.current = true;
              keTanggal(n);
            }
          }}
        >
          {WEEKDAYS.map((w, i) => (
            <span key={w} className="u-calendar-weekday" role="columnheader" aria-label={NAMA_HARI[i]} data-weekend={dataFlag(highlightWeekend && i >= 5)}>
              {w}
            </span>
          ))}
          {days.map((d) => {
            const iso = toISODate(d);
            const outside = d.getMonth() !== vm;
            const selected = (value && sameDay(d, value)) || (range?.from && sameDay(d, range.from)) || (range?.to && sameDay(d, range.to));
            const inRange = range?.from && range?.to && d > range.from && d < range.to;
            const weekend = highlightWeekend && (d.getDay() === 0 || d.getDay() === 6);
            const namaLibur = liburGabung?.[iso];
            const isToday = sameDay(d, today);
            const agenda = dataBulan?.agenda[iso] ?? [];
            const m = agenda.length
              ? [...(markers?.[iso] ?? []), ...agenda.map((a) => ({ color: a.warna || sumber!.warna(a.jenis) }))]
              : markers?.[iso];
            const tahapHari = tahapBulan.filter((t) => dalamTahapan(iso, t));
            const latar = tahapHari.filter((t) => t.latar !== false).sort((a, b) => prioritas(a.jenis) - prioritas(b.jenis))[0];
            const pesanTutup = sumber ? ditutup(iso) : null;
            const keterangan = [namaLibur && `Libur: ${namaLibur}`, ...tahapHari.map((t) => t.judul), ...agenda.map((a) => a.judul), pesanTutup].filter(Boolean) as string[];
            return (
              <button
                key={iso}
                type="button"
                role="gridcell"
                className="u-calendar-day"
                data-date={iso}
                data-outside={dataFlag(outside)}
                data-today={dataFlag(isToday)}
                data-selected={dataFlag(Boolean(selected))}
                data-in-range={dataFlag(Boolean(inRange))}
                data-weekend={dataFlag(weekend)}
                data-holiday={dataFlag(Boolean(namaLibur))}
                data-tahap={latar ? latar.jenis : undefined}
                data-ditutup={dataFlag(Boolean(pesanTutup))}
                style={latar ? ({ '--u-cal-tahap': latar.warna || sumber!.warna(latar.jenis) } as React.CSSProperties) : undefined}
                title={keterangan.length ? keterangan.join('\n') : undefined}
                aria-selected={Boolean(selected)}
                aria-current={isToday ? 'date' : undefined}
                aria-label={
                  formatDate(d, 'full') +
                  (isToday ? ', hari ini' : '') +
                  (namaLibur ? `, libur: ${namaLibur}` : '') +
                  tahapHari.map((t) => `, ${t.judul}`).join('') +
                  (agenda.length ? agenda.map((a) => `, ${a.judul}`).join('') : m?.length ? `, ${m.length} agenda` : '') +
                  (pesanTutup ? ', periode ditutup' : '')
                }
                tabIndex={sameDay(d, fokus) ? 0 : -1}
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
      )}

      {mode === 'bulan' && (
        <div
          data-u-cal-grid=""
          className="u-calendar-pilihan"
          role="group"
          aria-label={`Pilih bulan tahun ${vy}`}
          onKeyDown={(e) => {
            const map: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3, PageUp: -12, PageDown: 12 };
            let n: number | null = null;
            if (e.key in map) n = sorotBulan + map[e.key]!;
            else if (e.key === 'Home') n = 0;
            else if (e.key === 'End') n = 11;
            if (n == null) return;
            e.preventDefault();
            mintaFokus.current = true;
            const dy = Math.floor(n / 12);
            if (dy) setView(new Date(vy + dy, vm, 1));
            setSorotBulan(((n % 12) + 12) % 12);
          }}
        >
          {BULAN_PENDEK.map((b, i) => {
            const terpilih = value ? value.getFullYear() === vy && value.getMonth() === i : false;
            const kini = today.getFullYear() === vy && today.getMonth() === i;
            return (
              <button
                key={b}
                type="button"
                className="u-calendar-sel"
                data-selected={dataFlag(terpilih)}
                data-current={dataFlag(i === vm)}
                data-today={dataFlag(kini)}
                aria-label={`${namaBulan(i)} ${vy}`}
                aria-pressed={i === vm}
                tabIndex={i === sorotBulan ? 0 : -1}
                disabled={bulanNonaktif(vy, i)}
                onFocus={() => setSorotBulan(i)}
                onClick={() => pilihBulan(i)}
              >
                {b}
              </button>
            );
          })}
        </div>
      )}

      {mode === 'tahun' && (
        <div
          data-u-cal-grid=""
          className="u-calendar-pilihan"
          role="group"
          aria-label={`Pilih tahun ${awalTahun}–${awalTahun + TAHUN_PER_HALAMAN - 1}`}
          onKeyDown={(e) => {
            const map: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3, PageUp: -12, PageDown: 12 };
            let n: number | null = null;
            if (e.key in map) n = sorotTahun + map[e.key]! * (e.shiftKey && e.key.startsWith('Page') ? 10 : 1);
            else if (e.key === 'Home') n = awalTahun;
            else if (e.key === 'End') n = awalTahun + TAHUN_PER_HALAMAN - 1;
            if (n == null) return;
            e.preventDefault();
            mintaFokus.current = true;
            setSorotTahun(n);
            if (n < awalTahun || n >= awalTahun + TAHUN_PER_HALAMAN) setAwalTahun(awalHalamanTahun(n));
          }}
        >
          {Array.from({ length: TAHUN_PER_HALAMAN }, (_, i) => awalTahun + i).map((y) => (
            <button
              key={y}
              type="button"
              className="u-calendar-sel"
              data-selected={dataFlag(value?.getFullYear() === y)}
              data-current={dataFlag(y === vy)}
              data-today={dataFlag(today.getFullYear() === y)}
              aria-label={`Tahun ${y}`}
              aria-pressed={y === vy}
              tabIndex={y === sorotTahun ? 0 : -1}
              disabled={tahunNonaktif(y)}
              onFocus={() => setSorotTahun(y)}
              onClick={() => pilihTahun(y)}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {legenda && mode === 'hari' && dataBulan && <LegendaKalender data={dataBulan} sumber={sumber!} ditutup={days.some((d) => !!ditutup(toISODate(d)))} />}

      {(tombolHariIni || kaki) && (
        <div className="u-calendar-kaki">
          {tombolHariIni && (
            <Button variant="ghost" size="xs" disabled={disabled(today)} onClick={hariIni}>
              Hari ini
            </Button>
          )}
          {kaki}
        </div>
      )}
    </div>
  );
}

/** Legenda kecil jenis kegiatan di bulan tampil. */
function LegendaKalender({ data, sumber, ditutup }: { data: DataBulanKalender; sumber: SumberKalenderTanggal; ditutup: boolean }) {
  const jenis = new Map<string, string>();
  if (Object.keys(data.libur).length) jenis.set('libur', 'var(--u-danger)');
  for (const t of [...data.tahapan].filter((t) => t.latar !== false).sort((a, b) => prioritas(a.jenis) - prioritas(b.jenis))) if (!jenis.has(t.jenis)) jenis.set(t.jenis, t.warna || sumber.warna(t.jenis));
  for (const a of Object.values(data.agenda).flat()) if (!jenis.has(a.jenis)) jenis.set(a.jenis, a.warna || sumber.warna(a.jenis));
  if (!jenis.size && !ditutup) return null;
  return (
    <ul className="u-calendar-legenda" aria-label="Keterangan warna">
      {[...jenis].map(([j, w]) => (
        <li key={j} data-jenis={j}>
          <i style={{ background: w }} aria-hidden />
          {sumber.label(j)}
        </li>
      ))}
      {ditutup && (
        <li data-jenis="ditutup">
          <i data-ditutup="" aria-hidden />
          Periode ditutup
        </li>
      )}
    </ul>
  );
}

// ---------------------------------------------------------------- isian ketik + popup bersama
interface OpsiIsian {
  value: Date | null | undefined;
  onCommit: (d: Date | null) => void;
  min?: Date;
  max?: Date;
  onGalat?: (pesan: string | null) => void;
  /** Pemeriksaan tambahan setelah tanggal sah (mis. batas tahapan); kembalikan pesan untuk menolak. */
  cek?: (d: Date) => string | null;
}

/** Status satu isian tanggal yang bisa diketik: teks, pratinjau (kalender mengikuti ketikan), galat. */
function useIsianTanggal({ value, onCommit, min, max, onGalat, cek }: OpsiIsian) {
  const [fokus, setFokus] = React.useState(false);
  const [teks, setTeks] = React.useState('');
  const [galat, setGalatState] = React.useState<string | null>(null);
  const [pratinjau, setPratinjau] = React.useState<Date | null>(null);
  const setGalat = (g: string | null) => {
    setGalatState(g);
    if (g !== galat) onGalat?.(g);
  };
  /** Terapkan teks. Mengembalikan tanggal/null bila berhasil, undefined bila galat. */
  const terapkan = (): Date | null | undefined => {
    const h = uraiTanggal(teks, { min, max });
    setPratinjau(null);
    if (h === null) {
      setGalat(null);
      if (value) onCommit(null);
      return null;
    }
    if (!h.ok) {
      setGalat(h.pesan);
      return undefined;
    }
    const tolak = cek?.(h.tanggal);
    if (tolak) {
      setGalat(tolak);
      return undefined;
    }
    setGalat(null);
    setTeks(formatIsianTanggal(h.tanggal));
    if (!value || !sameDay(value, h.tanggal)) onCommit(h.tanggal);
    return h.tanggal;
  };
  /** Dipanggil setelah memilih dari kalender. */
  const setelDari = (d: Date | null) => {
    setTeks(formatIsianTanggal(d));
    setPratinjau(null);
    setGalat(null);
  };
  const tampil = fokus || galat ? teks : value ? formatDate(value, 'long') : '';
  return {
    fokus,
    galat,
    pratinjau,
    terapkan,
    setelDari,
    berubah: fokus ? (() => {
      const h = uraiTanggal(teks, { min, max });
      return h === null ? Boolean(value) : !h.ok || !value || !sameDay(value, h.tanggal);
    })() : false,
    inputProps: {
      value: tampil,
      autoComplete: 'off',
      spellCheck: false,
      onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
        setFokus(true);
        const awal = galat ? teks : formatIsianTanggal(value);
        if (!galat) setTeks(awal);
        // Pilih semua setelah klik selesai, kecuali pengguna sudah mulai mengetik.
        const el = e.currentTarget;
        requestAnimationFrame(() => {
          if (document.activeElement === el && el.value === awal) el.select();
        });
      },
      onBlur: () => {
        setFokus(false);
        terapkan();
      },
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const t = maskerTanggal(e.target.value, teks);
        setTeks(t);
        const h = uraiTanggal(t, { min, max });
        setPratinjau(h && h.ok ? h.tanggal : null);
        if (galat && (!h || h.ok)) setGalat(null);
      },
    },
  };
}

interface PopupTanggalProps {
  open: boolean;
  /** `kembali` = fokus kembali ke isian (Esc/tombol tutup), bukan saat klik di luar. */
  onOpenChange: (open: boolean, kembali: boolean) => void;
  jangkar: React.RefObject<HTMLDivElement | null>;
  /** true: fokus pindah ke kalender saat dibuka (tombol/panah bawah); false: tetap di isian (klik isian). */
  fokusKalender: React.RefObject<boolean>;
  /** Isian yang difokus lagi setelah tutup (Esc/pilih). */
  kembaliKe: React.RefObject<HTMLInputElement | null>;
  judul: string;
  children: React.ReactNode;
}

/** Popover di desktop, lembar bawah di ponsel. */
function PopupTanggal({ open, onOpenChange, jangkar, fokusKalender, kembaliKe, judul, children }: PopupTanggalProps) {
  const plat = usePlatform();
  const isiRef = React.useRef<HTMLDivElement>(null);
  const selAktif = () => isiRef.current?.querySelector<HTMLElement>('[data-u-cal-grid] [tabindex="0"]') ?? null;
  if (plat.mobile) {
    return (
      <Dialog open={open} onOpenChange={(o) => onOpenChange(o, true)} title={judul} side="bottom" size="sm" className="u-datepicker-sheet" initialFocus={() => selAktif() ?? true}>
        <div ref={isiRef} className="u-datepicker-isi">
          {children}
        </div>
      </Dialog>
    );
  }
  return (
    <BasePopover.Root
      open={open}
      onOpenChange={(o, d) => {
        if (!o && (d.reason === 'outside-press' || d.reason === 'focus-out')) {
          const ev = d.event as Event & { relatedTarget?: EventTarget | null };
          const t = (ev && 'relatedTarget' in ev && ev.relatedTarget) || ev?.target;
          if (t instanceof Node && jangkar.current?.contains(t)) return;
        }
        onOpenChange(o, d.reason !== 'outside-press' && d.reason !== 'focus-out');
      }}
    >
      <BasePopover.Portal>
        <BasePopover.Positioner className="u-popup-positioner" anchor={jangkar} side="bottom" align="start" sideOffset={6}>
          <BasePopover.Popup
            className="u-popover u-datepicker-popup"
            aria-label={judul}
            initialFocus={() => (fokusKalender.current ? (selAktif() ?? true) : false)}
            finalFocus={() => kembaliKe.current ?? false}
          >
            <div ref={isiRef} className="u-datepicker-isi">
              {children}
            </div>
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}

/** Pemeriksa isian dari batas tahapan / periode ditutup + pesan peringatan periode ditutup. */
function useAturanAkademik(sumber: SumberKalenderTanggal | null, batasTahapan: string | string[] | undefined, blokirDitutup: boolean | undefined) {
  return React.useCallback(
    (d: Date): string | null => {
      if (!sumber) return null;
      const iso = toISODate(d);
      if (batasTahapan) {
        const t = sumber.tahapan.filter((x) => cocokTahapan(x, batasTahapan));
        if (t.length && !t.some((x) => dalamTahapan(iso, x))) {
          const dekat = t.filter((x) => (x.selesai ?? x.mulai) >= toISODate(new Date())).sort((a, b) => a.mulai.localeCompare(b.mulai))[0] ?? t[t.length - 1]!;
          return `Di luar tahapan yang diizinkan (${dekat.judul}: ${formatDate(dekat.mulai, 'medium')}${dekat.selesai ? ` – ${formatDate(dekat.selesai, 'medium')}` : ''}).`;
        }
      }
      if (blokirDitutup) return sumber.periodeDitutup(iso);
      return null;
    },
    [sumber, batasTahapan, blokirDitutup],
  );
}

/** Opsi kalender akademik yang sama untuk DatePicker dan DateRangePicker. */
export interface OpsiKalenderAkademik {
  /** Pakai data kalender akademik dari penyedia (bawaan true). false = kalender polos. */
  kalenderAkademik?: boolean;
  /** Hanya tanggal di tahapan ini yang boleh, mis. `batasTahapan="krs"`. Tanpa data tahapan tidak membatasi. */
  batasTahapan?: string | string[];
  /** Tolak tanggal di periode yang sudah ditutup (bawaan: hanya peringatan). */
  blokirDitutup?: boolean;
  /** Legenda warna di kaki kalender (bawaan true). */
  legenda?: boolean;
}

// ---------------------------------------------------------------- DatePicker
export interface DatePickerProps extends OpsiKalenderAkademik {
  value?: Date | null;
  onValueChange?: (date: Date | null) => void;
  placeholder?: string;
  min?: Date;
  max?: Date;
  disabled?: boolean;
  className?: string;
  /** id isian (untuk label). */
  id?: string;
  name?: string;
  required?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
  /** Tampilan kalender saat dibuka tanpa nilai: 'tahun' cocok untuk tanggal lahir/SK lama. */
  tampilanAwal?: TampilanKalender;
  /** Bulan yang dibuka bila belum ada nilai (mis. `new Date(2000, 0, 1)` untuk tanggal lahir). */
  awal?: Date;
  /** Isian bisa diketik `dd/mm/yyyy` (bawaan true). false = hanya lewat kalender. */
  bisaDiketik?: boolean;
  /** Tombol "Hari ini" (bawaan true). */
  tombolHariIni?: boolean;
  /** Tombol "Hapus" saat ada nilai (bawaan true). */
  bisaDihapus?: boolean;
  /** Hari libur per tanggal ISO → nama. */
  libur?: Record<string, string>;
  isDisabled?: (date: Date) => boolean;
  /** Pesan galat ketikan (null bila beres). Pesan juga tampil di bawah isian kecuali `tampilGalat={false}`. */
  onGalat?: (pesan: string | null) => void;
  tampilGalat?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Pemilih tanggal: ketik langsung (`20/07/2018`, `20-7-18`, `2018-07-20`, `20 jul 2018`; Enter/keluar menerapkan)
 * atau pilih dari kalender dengan lompat cepat bulan/tahun. Nilai keluar tetap `Date | null`.
 */
export function DatePicker({
  value,
  onValueChange,
  placeholder = 'Pilih tanggal',
  min,
  max,
  disabled,
  className,
  id,
  name,
  required,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  tampilanAwal,
  awal,
  bisaDiketik = true,
  tombolHariIni = true,
  bisaDihapus = true,
  libur,
  isDisabled,
  onGalat,
  tampilGalat = true,
  size,
  kalenderAkademik = true,
  batasTahapan,
  blokirDitutup,
  legenda = true,
}: DatePickerProps) {
  const plat = usePlatform();
  const sumber = useSumberKalenderTanggal(kalenderAkademik);
  const cek = useAturanAkademik(sumber, batasTahapan, blokirDitutup);
  const [open, setOpen] = React.useState(false);
  const [bulan, setBulan] = React.useState<Date | undefined>(undefined);
  const jangkar = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const fokusKalender = React.useRef(true);
  const kembaliKe = React.useRef<HTMLInputElement | null>(null);
  const idGalat = React.useId();
  const isian = useIsianTanggal({ value, onCommit: (d) => onValueChange?.(d), min, max, onGalat, cek });
  const nilaiKalender = isian.pratinjau ?? value ?? null;
  const idPeringatan = React.useId();
  const peringatan = !isian.galat && value && sumber && !blokirDitutup ? sumber.periodeDitutup(toISODate(value)) : null;

  React.useEffect(() => {
    if (isian.pratinjau) setBulan(new Date(isian.pratinjau.getFullYear(), isian.pratinjau.getMonth(), 1));
  }, [isian.pratinjau?.getTime()]);

  const buka = (keKalender: boolean) => {
    if (disabled) return;
    fokusKalender.current = keKalender;
    kembaliKe.current = keKalender ? inputRef.current : null;
    setBulan(undefined);
    setOpen(true);
  };
  const tutup = (kembali: boolean) => {
    kembaliKe.current = kembali ? inputRef.current : null;
    setOpen(false);
  };
  const pilih = (d: Date | null) => {
    onValueChange?.(d);
    isian.setelDari(d);
    tutup(true);
  };

  return (
    <div className={cn('u-datepicker', className)} data-disabled={dataFlag(disabled)}>
      <div ref={jangkar} className="u-input-group u-datepicker-kotak" data-size={size} data-invalid={dataFlag(Boolean(isian.galat))}>
        <Input
          ref={inputRef}
          id={id}
          name={name}
          required={required}
          disabled={disabled}
          readOnly={!bisaDiketik}
          aria-label={ariaLabel}
          aria-invalid={isian.galat ? true : undefined}
          aria-describedby={cn(ariaDescribedby, isian.galat && tampilGalat && idGalat, peringatan && idPeringatan) || undefined}
          aria-haspopup="dialog"
          aria-expanded={open}
          placeholder={bisaDiketik && isian.fokus ? 'dd/mm/yyyy' : placeholder}
          {...isian.inputProps}
          onClick={() => {
            if (!bisaDiketik) buka(true);
            else if (!plat.mobile && !open) buka(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || (e.key === ' ' && !bisaDiketik)) {
              e.preventDefault();
              buka(true);
            } else if (e.key === 'Escape' && open) {
              e.preventDefault();
              tutup(false);
            } else if (e.key === 'Enter' && bisaDiketik) {
              const berubah = isian.berubah;
              const hasil = isian.terapkan();
              if (berubah || open || hasil === undefined) e.preventDefault();
              if (hasil !== undefined && open) tutup(false);
            }
          }}
        />
        <span className="u-input-addon" data-align="end">
          <Button variant="ghost" size="xs" iconOnly aria-label="Buka kalender" disabled={disabled} onClick={() => (open ? tutup(true) : buka(true))}>
            <CalendarDays />
          </Button>
        </span>
      </div>
      {tampilGalat && isian.galat && (
        <span id={idGalat} className="u-datepicker-galat" role="alert">
          {isian.galat}
        </span>
      )}
      {peringatan && (
        <span id={idPeringatan} className="u-datepicker-peringatan" role="status">
          {peringatan}
        </span>
      )}
      <PopupTanggal open={open} onOpenChange={(o, kembali) => (o ? setOpen(true) : tutup(kembali))} jangkar={jangkar} fokusKalender={fokusKalender} kembaliKe={kembaliKe} judul="Pilih tanggal">
        <Calendar
          value={nilaiKalender}
          month={bulan}
          onMonthChange={setBulan}
          min={min}
          max={max}
          isDisabled={isDisabled}
          libur={libur}
          awal={awal}
          tampilanAwal={value ? 'hari' : tampilanAwal}
          tombolHariIni={tombolHariIni}
          kalenderAkademik={kalenderAkademik}
          batasTahapan={batasTahapan}
          blokirDitutup={blokirDitutup}
          legenda={legenda}
          onValueChange={pilih}
          kaki={
            bisaDihapus && value ? (
              <Button variant="ghost" size="xs" onClick={() => pilih(null)}>
                Hapus
              </Button>
            ) : null
          }
        />
      </PopupTanggal>
    </div>
  );
}

// ---------------------------------------------------------------- DateRangePicker
export interface RentangNilai {
  from: Date | null;
  to: Date | null;
}
export interface PresetRentang {
  label: string;
  dari: Date;
  sampai: Date;
  /** Keterangan (tooltip), mis. "KRS online Ganjil 2026/2027". */
  keterangan?: string;
}
export type KunciPresetRentang = 'hari_ini' | '7_hari' | '30_hari' | 'bulan_ini' | 'bulan_lalu' | 'tahun_ini';

/**
 * Preset untuk `DateRangePicker`. Semester ditambahkan bila datanya ada (dari kalender akademik):
 * `presetRentang(['hari_ini', '7_hari', 'bulan_ini'], { semester: { dari: '2026-09-01', sampai: '2027-01-31' } })`.
 */
export function presetRentang(
  kunci: KunciPresetRentang[] = ['hari_ini', '7_hari', '30_hari', 'bulan_ini'],
  opsi: { kini?: Date; semester?: { dari: Date | string; sampai: Date | string; label?: string } | null } = {},
): PresetRentang[] {
  const k = awalHari(opsi.kini ?? new Date());
  const y = k.getFullYear();
  const m = k.getMonth();
  const mundur = (n: number) => new Date(y, m, k.getDate() - n);
  const daftar: Record<KunciPresetRentang, PresetRentang> = {
    hari_ini: { label: 'Hari ini', dari: k, sampai: k },
    '7_hari': { label: '7 hari terakhir', dari: mundur(6), sampai: k },
    '30_hari': { label: '30 hari terakhir', dari: mundur(29), sampai: k },
    bulan_ini: { label: 'Bulan ini', dari: new Date(y, m, 1), sampai: new Date(y, m + 1, 0) },
    bulan_lalu: { label: 'Bulan lalu', dari: new Date(y, m - 1, 1), sampai: new Date(y, m, 0) },
    tahun_ini: { label: 'Tahun ini', dari: new Date(y, 0, 1), sampai: new Date(y, 11, 31) },
  };
  const out = kunci.map((x) => daftar[x]);
  const s = opsi.semester;
  if (s) {
    const ke = (v: Date | string) => (typeof v === 'string' ? parseISODate(v) : awalHari(v));
    out.push({ label: s.label ?? 'Semester ini', dari: ke(s.dari), sampai: ke(s.sampai) });
  }
  return out;
}

export interface DateRangePickerProps extends OpsiKalenderAkademik {
  value: RentangNilai;
  onValueChange: (value: RentangNilai) => void;
  min?: Date;
  max?: Date;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** Pilihan cepat di samping kalender (lihat `presetRentang`). */
  preset?: PresetRentang[];
  /** Tambahkan preset dari kalender akademik (Semester ini, Periode KRS, Masa UTS, Masa UAS) bila ada penyedia. Bawaan true. */
  presetAkademik?: boolean;
  placeholderDari?: string;
  placeholderSampai?: string;
  tampilanAwal?: TampilanKalender;
  awal?: Date;
  libur?: Record<string, string>;
  isDisabled?: (date: Date) => boolean;
  tombolHariIni?: boolean;
  onGalat?: (pesan: string | null) => void;
  tampilGalat?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/** Pemilih rentang: tanggal awal & akhir bisa diketik, kalender rentang dengan lompat cepat, preset opsional. */
export function DateRangePicker({
  value,
  onValueChange,
  min,
  max,
  disabled,
  className,
  id,
  preset,
  placeholderDari = 'Tanggal awal',
  placeholderSampai = 'Tanggal akhir',
  tampilanAwal,
  awal,
  libur,
  isDisabled,
  tombolHariIni = true,
  onGalat,
  tampilGalat = true,
  size,
  presetAkademik = true,
  kalenderAkademik = true,
  batasTahapan,
  blokirDitutup,
  legenda = true,
}: DateRangePickerProps) {
  const plat = usePlatform();
  const sumber = useSumberKalenderTanggal(kalenderAkademik);
  const cek = useAturanAkademik(sumber, batasTahapan, blokirDitutup);
  const presetGabung = [...(preset ?? []), ...(presetAkademik && sumber ? sumber.preset : [])];
  const [open, setOpen] = React.useState(false);
  const [bulan, setBulan] = React.useState<Date | undefined>(undefined);
  const jangkar = React.useRef<HTMLDivElement>(null);
  const dariRef = React.useRef<HTMLInputElement>(null);
  const sampaiRef = React.useRef<HTMLInputElement>(null);
  const fokusKalender = React.useRef(true);
  const kembaliKe = React.useRef<HTMLInputElement | null>(null);
  const idGalat = React.useId();
  const urut = (r: RentangNilai): RentangNilai => (r.from && r.to && r.from > r.to ? { from: r.to, to: r.from } : r);
  const dari = useIsianTanggal({ value: value.from, onCommit: (d) => onValueChange(urut({ from: d, to: value.to })), min, max, onGalat, cek });
  const sampai = useIsianTanggal({ value: value.to, onCommit: (d) => onValueChange(urut({ from: value.from, to: d })), min, max, onGalat, cek });
  const galat = dari.galat ?? sampai.galat;
  const peringatan = !galat && sumber && !blokirDitutup ? ((value.from && sumber.periodeDitutup(toISODate(value.from))) || (value.to && sumber.periodeDitutup(toISODate(value.to))) || null) : null;
  const pratinjau = dari.pratinjau ?? sampai.pratinjau;

  React.useEffect(() => {
    if (pratinjau) setBulan(new Date(pratinjau.getFullYear(), pratinjau.getMonth(), 1));
  }, [pratinjau?.getTime()]);

  const buka = (keKalender: boolean, isian: HTMLInputElement | null) => {
    if (disabled) return;
    fokusKalender.current = keKalender;
    kembaliKe.current = keKalender ? isian : null;
    setBulan(undefined);
    setOpen(true);
  };
  const tutup = (kembali: boolean) => {
    kembaliKe.current = kembali ? (kembaliKe.current ?? dariRef.current) : null;
    setOpen(false);
  };
  const terapkanRentang = (r: RentangNilai, selesai: boolean) => {
    onValueChange(r);
    dari.setelDari(r.from);
    sampai.setelDari(r.to);
    if (selesai) tutup(true);
  };
  const sama = (a: Date | null, b: Date | null) => (a && b ? sameDay(a, b) : a === b);

  const isianProps = (is: ReturnType<typeof useIsianTanggal>, ref: React.RefObject<HTMLInputElement | null>, label: string, ph: string) => ({
    ref,
    className: 'u-input',
    disabled,
    'aria-label': label,
    'aria-invalid': is.galat ? true : undefined,
    'aria-describedby': is.galat && tampilGalat ? idGalat : undefined,
    'aria-haspopup': 'dialog' as const,
    'aria-expanded': open,
    placeholder: is.fokus ? 'dd/mm/yyyy' : ph,
    ...is.inputProps,
    onClick: () => !plat.mobile && !open && buka(false, ref.current),
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        buka(true, ref.current);
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        tutup(false);
      } else if (e.key === 'Enter') {
        const berubah = is.berubah;
        const hasil = is.terapkan();
        if (berubah || open || hasil === undefined) e.preventDefault();
      }
    },
  });

  return (
    <div className={cn('u-datepicker u-daterangepicker', className)} data-disabled={dataFlag(disabled)}>
      <div ref={jangkar} className="u-input-group u-datepicker-kotak" data-size={size} data-invalid={dataFlag(Boolean(galat))}>
        <input id={id} {...isianProps(dari, dariRef, 'Tanggal awal', placeholderDari)} />
        <span className="u-datepicker-sd" aria-hidden>
          s.d.
        </span>
        <input {...isianProps(sampai, sampaiRef, 'Tanggal akhir', placeholderSampai)} />
        <span className="u-input-addon" data-align="end">
          <Button variant="ghost" size="xs" iconOnly aria-label="Buka kalender rentang" disabled={disabled} onClick={() => (open ? tutup(true) : buka(true, dariRef.current))}>
            <CalendarDays />
          </Button>
        </span>
      </div>
      {tampilGalat && galat && (
        <span id={idGalat} className="u-datepicker-galat" role="alert">
          {galat}
        </span>
      )}
      {peringatan && (
        <span className="u-datepicker-peringatan" role="status">
          {peringatan}
        </span>
      )}
      <PopupTanggal open={open} onOpenChange={(o, kembali) => (o ? setOpen(true) : tutup(kembali))} jangkar={jangkar} fokusKalender={fokusKalender} kembaliKe={kembaliKe} judul="Pilih rentang tanggal">
        <div className="u-daterangepicker-isi" data-preset={dataFlag(presetGabung.length > 0)}>
          {presetGabung.length > 0 && (
            <div className="u-daterangepicker-preset" role="group" aria-label="Rentang cepat">
              {presetGabung.map((p, i) => {
                const aktif = sama(value.from, p.dari) && sama(value.to, p.sampai);
                return (
                  <button key={`${p.label}-${i}`} type="button" className="u-facet-preset" data-active={dataFlag(aktif)} aria-pressed={aktif} title={p.keterangan ?? `${formatDate(p.dari, 'medium')} – ${formatDate(p.sampai, 'medium')}`} onClick={() => terapkanRentang({ from: p.dari, to: p.sampai }, true)}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          )}
          <Calendar
            range={{ from: dari.pratinjau ?? value.from, to: sampai.pratinjau ?? value.to }}
            onRangeChange={(r) => terapkanRentang(r, Boolean(r.from && r.to))}
            month={bulan}
            onMonthChange={setBulan}
            min={min}
            max={max}
            isDisabled={isDisabled}
            libur={libur}
            awal={awal}
            tampilanAwal={value.from ? 'hari' : tampilanAwal}
            tombolHariIni={tombolHariIni}
            kalenderAkademik={kalenderAkademik}
            batasTahapan={batasTahapan}
            blokirDitutup={blokirDitutup}
            legenda={legenda}
            kaki={
              value.from || value.to ? (
                <Button variant="ghost" size="xs" onClick={() => terapkanRentang({ from: null, to: null }, false)}>
                  Hapus
                </Button>
              ) : null
            }
          />
        </div>
      </PopupTanggal>
    </div>
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
