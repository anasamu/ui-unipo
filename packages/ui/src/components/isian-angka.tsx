'use client';
import * as React from 'react';
import { Clock, Minus, Plus } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { formatRupiah, terbilang } from '../lib/format';
import { formatRibuan, geserJam, gabungTanggalWaktu, periksaBatasAngka, pisahTanggalWaktu, rapikanKetikan, uraiAngka, uraiJam } from '../lib/angka';
import { Button, Skeleton } from './actions';
import { Input, type ControlSize } from './forms';
import { DatePicker, toISODate, parseISODate, type OpsiKalenderAkademik } from './calendar';

// ================================================================ dasar bersama
interface IsianDasarProps {
  id?: string;
  name?: string;
  placeholder?: string;
  size?: ControlSize;
  disabled?: boolean;
  /** Tampil tetapi tidak bisa diubah (nilai tetap ikut terkirim dan bisa disalin). */
  readOnly?: boolean;
  required?: boolean;
  /** Tampilkan kerangka saat data awal belum siap. */
  memuat?: boolean;
  /** Galat dari luar (mis. validasi server). Menimpa galat isian sendiri. */
  galat?: string | null;
  /** Dipanggil dengan pesan galat isian (null bila beres), mis. untuk menahan tombol simpan. */
  onGalat?: (pesan: string | null) => void;
  /** Tampilkan pesan galat di bawah isian (bawaan true). false bila dibungkus Field yang menampilkan `error`. */
  tampilGalat?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

function PesanIsian({ id, galat, info }: { id: string; galat: string | null; info?: React.ReactNode }) {
  if (galat)
    return (
      <span id={id} className="u-isian-pesan" data-tone="danger" role="alert">
        {galat}
      </span>
    );
  if (info)
    return (
      <span id={id} className="u-isian-pesan">
        {info}
      </span>
    );
  return null;
}

// ================================================================ IsianAngka
export interface IsianAngkaProps extends IsianDasarProps {
  /** Nilai angka mentah (bukan teks berformat). null = kosong. */
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (nilai: number | null) => void;
  min?: number;
  max?: number;
  /** Jumlah angka di belakang koma yang boleh diketik. Bawaan 0 (bilangan bulat). */
  desimal?: number;
  /** Boleh negatif (bawaan tidak). */
  negatif?: boolean;
  /** Langkah tombol −/+ dan panah atas/bawah. Bawaan 1. Shift+panah = 10× langkah. */
  langkah?: number;
  /** Tampilkan tombol −/+ di kedua sisi. */
  tombol?: boolean;
  /** Teks di kiri isian, mis. "Rp". */
  awalan?: React.ReactNode;
  /** Satuan di kanan isian, mis. "SKS", "%", "orang". */
  satuan?: React.ReactNode;
  /** Keterangan di bawah isian bila tidak ada galat. Fungsi menerima nilai terkini, mis. terbilang. */
  info?: React.ReactNode | ((nilai: number | null) => React.ReactNode);
  /** Penulisan angka di pesan batas (bawaan format ribuan). */
  formatPesan?: (n: number) => string;
  /** Rata kanan (bawaan untuk uang). */
  rataKanan?: boolean;
  /** Titik pemisah ribuan (bawaan true). false untuk tahun, angkatan, atau nomor urut: "2026", bukan "2.026". */
  ribuan?: boolean;
}

/**
 * Isian angka gaya Indonesia: titik ribuan muncul selagi mengetik, koma untuk desimal, nilai keluar tetap `number`.
 * Panah atas/bawah menambah/mengurangi; batas min/maks diperiksa saat keluar isian dengan pesan awam.
 * Pengganti `<input type="number">` dan `<Input type="number">`.
 */
export function IsianAngka({
  value,
  defaultValue = null,
  onValueChange,
  min,
  max,
  desimal = 0,
  negatif,
  langkah = 1,
  tombol,
  awalan,
  satuan,
  info,
  formatPesan,
  rataKanan,
  ribuan = true,
  id,
  name,
  placeholder,
  size,
  disabled,
  readOnly,
  required,
  memuat,
  galat: galatLuar,
  onGalat,
  tampilGalat = true,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
}: IsianAngkaProps) {
  const terkendali = value !== undefined;
  const [dalam, setDalam] = React.useState<number | null>(defaultValue);
  const nilai = terkendali ? (value ?? null) : dalam;
  const [teks, setTeks] = React.useState(() => formatRibuan(nilai, desimal, ribuan));
  const [fokus, setFokus] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const ref = React.useRef<HTMLInputElement>(null);
  const idPesan = React.useId();
  const negatifBoleh = negatif ?? (min !== undefined && min < 0);

  // Nilai dari luar berubah saat tidak sedang diketik: samakan teks.
  React.useEffect(() => {
    if (!fokus) setTeks(formatRibuan(nilai, desimal, ribuan));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nilai, desimal]);

  const setGalatDanLapor = (g: string | null) => {
    setGalat(g);
    onGalat?.(g);
  };
  const terapkan = (n: number | null) => {
    if (!terkendali) setDalam(n);
    if (n !== nilai) onValueChange?.(n);
  };
  const batas = (n: number | null) => periksaBatasAngka(n, { min, max, wajib: required, fmt: formatPesan ?? (ribuan ? undefined : String) });

  const ubahTeks = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const r = rapikanKetikan(el.value, el.selectionStart ?? el.value.length, { desimal, negatif: negatifBoleh, ribuan });
    setTeks(r.teks);
    requestAnimationFrame(() => {
      if (document.activeElement === el) el.setSelectionRange(r.kursor, r.kursor);
    });
    const u = uraiAngka(r.teks, { desimal, negatif: negatifBoleh });
    if (u.ok) {
      terapkan(u.nilai);
      if (galat) setGalatDanLapor(null);
    }
  };
  const keluar = () => {
    setFokus(false);
    const u = uraiAngka(teks, { desimal, negatif: negatifBoleh });
    if (!u.ok) return setGalatDanLapor(u.pesan);
    setTeks(formatRibuan(u.nilai, desimal, ribuan));
    terapkan(u.nilai);
    setGalatDanLapor(batas(u.nilai));
  };
  const geser = (arah: 1 | -1, kali = 1) => {
    if (disabled || readOnly) return;
    let n = (nilai ?? (arah > 0 ? (min ?? 0) - langkah : (max ?? 0) + langkah)) + arah * langkah * kali;
    n = Number(n.toFixed(desimal));
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    if (!negatifBoleh) n = Math.max(0, n);
    setTeks(formatRibuan(n, desimal, ribuan));
    terapkan(n);
    setGalatDanLapor(null);
  };

  const galatTampil = galatLuar ?? galat;
  const infoTeks = typeof info === 'function' ? info(nilai) : info;
  if (memuat) return <Skeleton className={cn('u-isian-kerangka', className)} data-size={size} />;

  const kurangiNonaktif = disabled || readOnly || (min !== undefined && nilai !== null && nilai <= min);
  const tambahNonaktif = disabled || readOnly || (max !== undefined && nilai !== null && nilai >= max);
  return (
    <div className={cn('u-isian-angka', className)} data-disabled={dataFlag(disabled)} data-readonly={dataFlag(readOnly)}>
      <div className="u-input-group" data-size={size} data-invalid={dataFlag(Boolean(galatTampil))} data-readonly={dataFlag(readOnly)}>
        {tombol && (
          <span className="u-input-addon" data-align="start">
            <Button variant="ghost" size="xs" iconOnly aria-label="Kurangi" tabIndex={-1} disabled={kurangiNonaktif} onClick={() => geser(-1)}>
              <Minus />
            </Button>
          </span>
        )}
        {awalan != null && (
          <span className="u-input-addon u-isian-awalan" data-align="start" aria-hidden>
            {awalan}
          </span>
        )}
        <Input
          ref={ref}
          id={id}
          name={name}
          inputMode={desimal > 0 ? 'decimal' : 'numeric'}
          autoComplete="off"
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          value={teks}
          data-align={rataKanan ? 'end' : undefined}
          aria-label={ariaLabel}
          aria-invalid={galatTampil ? true : undefined}
          aria-describedby={cn(ariaDescribedby, Boolean(galatTampil || infoTeks) && tampilGalat && idPesan) || undefined}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={nilai ?? undefined}
          onFocus={() => setFokus(true)}
          onBlur={keluar}
          onChange={ubahTeks}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              geser(e.key === 'ArrowUp' ? 1 : -1, e.shiftKey ? 10 : 1);
            } else if (e.key === 'Enter') keluar();
          }}
        />
        {satuan != null && (
          <span className="u-input-addon u-isian-satuan" data-align="end">
            {satuan}
          </span>
        )}
        {tombol && (
          <span className="u-input-addon" data-align="end">
            <Button variant="ghost" size="xs" iconOnly aria-label="Tambah" tabIndex={-1} disabled={tambahNonaktif} onClick={() => geser(1)}>
              <Plus />
            </Button>
          </span>
        )}
      </div>
      {tampilGalat && <PesanIsian id={idPesan} galat={galatTampil} info={infoTeks} />}
    </div>
  );
}

// ================================================================ IsianRupiah
export interface IsianRupiahProps extends Omit<IsianAngkaProps, 'awalan' | 'desimal' | 'formatPesan' | 'negatif' | 'info'> {
  /** Izinkan sen (2 angka di belakang koma). Bawaan tidak: rupiah bulat. */
  sen?: boolean;
  /** Tampilkan terbilang di bawah isian ("dua puluh lima juta rupiah"). Bawaan true. */
  tampilTerbilang?: boolean;
  /** Keterangan tambahan (mis. "Batas dana hibah internal menurut SK Rektor 12/2026"). Tampil sebelum terbilang. */
  info?: React.ReactNode;
}

/**
 * Isian uang: awalan "Rp", titik ribuan selagi diketik, tanpa desimal (kecuali `sen`), nilai keluar `number` mentah,
 * dan terbilang di bawahnya untuk mencegah salah ketik nol. Batas min/maks (mis. dari skema API atau SK) tampil
 * dalam format Rupiah. Bawaan min 0.
 */
export function IsianRupiah({ sen, tampilTerbilang = true, info, min = 0, rataKanan = true, ...p }: IsianRupiahProps) {
  return (
    <IsianAngka
      {...p}
      min={min}
      awalan="Rp"
      desimal={sen ? 2 : 0}
      rataKanan={rataKanan}
      formatPesan={formatRupiah}
      info={(n) =>
        info || (tampilTerbilang && n) ? (
          <>
            {info}
            {info && tampilTerbilang && n ? ' · ' : null}
            {tampilTerbilang && n ? <span className="u-isian-terbilang">{kapital(terbilang(Math.trunc(n)))}</span> : null}
          </>
        ) : null
      }
    />
  );
}
const kapital = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

// ================================================================ IsianJam
export interface IsianJamProps extends IsianDasarProps {
  /** Jam "HH:mm" (24 jam). null = kosong. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (jam: string | null) => void;
  /** Batas "HH:mm". */
  min?: string;
  max?: string;
  /** Langkah panah atas/bawah dalam menit (bawaan 15). Shift+panah = 1 jam. */
  langkahMenit?: number;
}

/** Isian jam 24 jam: ketik "0830", "8.30", atau "14:00"; panah atas/bawah menggeser per `langkahMenit`. Pengganti `<input type="time">`. */
export function IsianJam({
  value,
  defaultValue = null,
  onValueChange,
  min,
  max,
  langkahMenit = 15,
  id,
  name,
  placeholder = 'jj:mm',
  size,
  disabled,
  readOnly,
  required,
  memuat,
  galat: galatLuar,
  onGalat,
  tampilGalat = true,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
}: IsianJamProps) {
  const terkendali = value !== undefined;
  const [dalam, setDalam] = React.useState<string | null>(defaultValue);
  const nilai = terkendali ? (value ?? null) : dalam;
  const [teks, setTeks] = React.useState(nilai ?? '');
  const [fokus, setFokus] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const idPesan = React.useId();
  React.useEffect(() => {
    if (!fokus) setTeks(nilai ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nilai]);
  const lapor = (g: string | null) => {
    setGalat(g);
    onGalat?.(g);
  };
  const terapkan = (j: string | null) => {
    if (!terkendali) setDalam(j);
    if (j !== nilai) onValueChange?.(j);
  };
  const cekBatas = (j: string | null) => {
    if (!j) return required ? 'Wajib diisi.' : null;
    if (min && j < min) return `Paling awal pukul ${min}.`;
    if (max && j > max) return `Paling lambat pukul ${max}.`;
    return null;
  };
  const keluar = () => {
    setFokus(false);
    const u = uraiJam(teks);
    if (!u.ok) return lapor(u.pesan);
    setTeks(u.nilai ?? '');
    terapkan(u.nilai);
    lapor(cekBatas(u.nilai));
  };
  const galatTampil = galatLuar ?? galat;
  if (memuat) return <Skeleton className={cn('u-isian-kerangka', className)} data-size={size} />;
  return (
    <div className={cn('u-isian-jam', className)} data-disabled={dataFlag(disabled)}>
      <div className="u-input-group" data-size={size} data-invalid={dataFlag(Boolean(galatTampil))} data-readonly={dataFlag(readOnly)}>
        <span className="u-input-addon" data-align="start" aria-hidden>
          <Clock />
        </span>
        <Input
          id={id}
          name={name}
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          value={teks}
          maxLength={5}
          aria-label={ariaLabel}
          aria-invalid={galatTampil ? true : undefined}
          aria-describedby={cn(ariaDescribedby, galatTampil && tampilGalat && idPesan) || undefined}
          onFocus={() => setFokus(true)}
          onBlur={keluar}
          onChange={(e) => {
            setTeks(e.target.value.replace(/[^\d:.]/g, ''));
            if (galat) lapor(null);
          }}
          onKeyDown={(e) => {
            if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !readOnly && !disabled) {
              e.preventDefault();
              const awal = uraiJam(teks);
              const dasar = awal.ok ? awal.nilai : nilai;
              const j = geserJam(dasar ?? (min || '07:00'), (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 60 : dasar ? langkahMenit : 0));
              setTeks(j);
              terapkan(j);
              lapor(cekBatas(j));
            } else if (e.key === 'Enter') keluar();
          }}
        />
      </div>
      {tampilGalat && <PesanIsian id={idPesan} galat={galatTampil} />}
    </div>
  );
}

// ================================================================ IsianTanggalWaktu
export interface IsianTanggalWaktuProps extends Omit<IsianDasarProps, 'placeholder'>, OpsiKalenderAkademik {
  /** Nilai API: "YYYY-MM-DDTHH:mm" (seperti datetime-local) atau "YYYY-MM-DD HH:mm:ss". null = kosong. */
  value?: string | null;
  onValueChange?: (nilai: string | null) => void;
  /** Format nilai keluar: 'lokal' = "YYYY-MM-DDTHH:mm" (bawaan), 'sql' = "YYYY-MM-DD HH:mm:00". */
  format?: 'lokal' | 'sql';
  /** Batas dalam format yang sama dengan value. */
  min?: string | null;
  max?: string | null;
  /** Jam yang dipakai saat tanggal dipilih tetapi jam belum diisi (bawaan "08:00"). */
  jamBawaan?: string;
  langkahMenit?: number;
}

/**
 * Pemilih tanggal + jam dalam satu baris (bertumpuk di ponsel): kalender akademik sama dengan DatePicker
 * (tahapan, libur, periode ditutup), jam diketik atau digeser panah. Pengganti `<input type="datetime-local">`.
 */
export function IsianTanggalWaktu({
  value,
  onValueChange,
  format = 'lokal',
  min,
  max,
  jamBawaan = '08:00',
  langkahMenit,
  id,
  name,
  size,
  disabled,
  readOnly,
  required,
  memuat,
  galat: galatLuar,
  onGalat,
  tampilGalat = true,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  ...kalender
}: IsianTanggalWaktuProps) {
  const { tanggal, jam } = pisahTanggalWaktu(value);
  const batasBawah = pisahTanggalWaktu(min);
  const batasAtas = pisahTanggalWaktu(max);
  const [galat, setGalat] = React.useState<string | null>(null);
  const idPesan = React.useId();
  const lapor = (g: string | null) => {
    setGalat(g);
    onGalat?.(g);
  };
  const kirim = (t: string | null, j: string | null) => {
    const n = gabungTanggalWaktu(t, t ? (j ?? jamBawaan) : null, format);
    onValueChange?.(n);
    const lokal = n?.replace(' ', 'T').slice(0, 16) ?? null;
    if (!lokal) return lapor(required ? 'Wajib diisi.' : null);
    const mn = min ? gabungTanggalWaktu(batasBawah.tanggal, batasBawah.jam ?? '00:00') : null;
    const mx = max ? gabungTanggalWaktu(batasAtas.tanggal, batasAtas.jam ?? '23:59') : null;
    if (mn && lokal < mn) return lapor(`Paling awal ${tampil(mn)}.`);
    if (mx && lokal > mx) return lapor(`Paling lambat ${tampil(mx)}.`);
    lapor(null);
  };
  const galatTampil = galatLuar ?? galat;
  if (memuat) return <Skeleton className={cn('u-isian-kerangka', className)} data-size={size} />;
  const idJam = id ? `${id}-jam` : undefined;
  return (
    <div className={cn('u-isian-tanggal-waktu', className)} role="group" aria-label={ariaLabel} data-disabled={dataFlag(disabled)}>
      <div className="u-isian-tanggal-waktu-baris">
        <DatePicker
          {...kalender}
          id={id}
          size={size}
          disabled={disabled || readOnly}
          required={required}
          aria-label={ariaLabel ? `${ariaLabel}: tanggal` : 'Tanggal'}
          aria-describedby={cn(ariaDescribedby, galatTampil && tampilGalat && idPesan) || undefined}
          value={tanggal ? parseISODate(tanggal) : null}
          min={batasBawah.tanggal ? parseISODate(batasBawah.tanggal) : undefined}
          max={batasAtas.tanggal ? parseISODate(batasAtas.tanggal) : undefined}
          onValueChange={(d) => kirim(d ? toISODate(d) : null, jam)}
        />
        <IsianJam
          id={idJam}
          size={size}
          value={jam}
          disabled={disabled || !tanggal}
          readOnly={readOnly}
          langkahMenit={langkahMenit}
          tampilGalat={false}
          aria-label={ariaLabel ? `${ariaLabel}: jam` : 'Jam'}
          onValueChange={(j) => kirim(tanggal, j)}
          onGalat={(g) => g && lapor(g)}
        />
      </div>
      {name && <input type="hidden" name={name} value={value ?? ''} />}
      {tampilGalat && <PesanIsian id={idPesan} galat={galatTampil} />}
    </div>
  );
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
function tampil(lokal: string): string {
  const { tanggal, jam } = pisahTanggalWaktu(lokal);
  if (!tanggal) return lokal;
  const [y, m, d] = tanggal.split('-').map(Number);
  return `${d} ${BULAN[(m ?? 1) - 1]} ${y}, pukul ${jam ?? '00:00'}`;
}
