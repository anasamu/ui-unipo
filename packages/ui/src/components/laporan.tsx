'use client';
import * as React from 'react';
import { Download, Printer } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatNumber, formatPersen, formatRupiah, formatRupiahRingkas } from '../lib/format';
import { Button, Skeleton } from './actions';
import { Input } from './forms';
import { Select } from './select';
import { StatCard, StatGrid, type StatCardProps } from './charts';

/*
 * Laporan bersama untuk semua aplikasi UNIPO: kerangka laporan siap cetak/PDF dan CSV, kepala surat cetak,
 * tabel laporan berjenjang (grup, akun, subtotal, total) dengan format akuntansi, pemilih periode, dan
 * ringkasan statistik. Dipakai laporan keuangan BAUK, rekap BAAK, statistik SDM, transparansi biaya fakultas.
 */

// ================================================================ Format
export type FormatNilai = 'rupiah' | 'rupiah-ringkas' | 'akuntansi' | 'angka' | 'persen' | 'teks';

/** Format akuntansi: angka negatif dalam kurung, nol sebagai "–". */
export function formatAkuntansi(n: number | null | undefined, opsi: { rp?: boolean; nol?: string } = {}): string {
  if (n == null || Number.isNaN(n)) return '';
  if (Math.abs(n) < 0.005) return opsi.nol ?? '–';
  const s = formatNumber(Math.abs(n), { maximumFractionDigits: 0 });
  const t = opsi.rp ? `Rp ${s}` : s;
  return n < 0 ? `(${t})` : t;
}

export function formatNilai(v: unknown, f: FormatNilai = 'teks'): string {
  if (v == null || v === '') return '';
  if (f === 'teks' || typeof v !== 'number') return String(v);
  switch (f) {
    case 'rupiah':
      return formatRupiah(v);
    case 'rupiah-ringkas':
      return formatRupiahRingkas(v);
    case 'akuntansi':
      return formatAkuntansi(v);
    case 'persen':
      return formatPersen(v);
    default:
      return formatNumber(v);
  }
}

// ================================================================ CSV
type SelCsv = string | number | boolean | null | undefined;

/** Unduh CSV (pemisah titik koma agar langsung terbaca Excel berbahasa Indonesia, dengan BOM UTF-8). */
export function unduhCsv(namaFile: string, kolom: string[], baris: SelCsv[][], pemisah = ';') {
  const sel = (v: SelCsv) => {
    if (v == null) return '';
    const s = typeof v === 'number' ? String(Math.round(v * 100) / 100).replace('.', pemisah === ';' ? ',' : '.') : String(v);
    return /[";\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const teks = [kolom, ...baris].map((r) => r.map(sel).join(pemisah)).join('\r\n');
  const blob = new Blob(['﻿' + teks], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = namaFile.endsWith('.csv') ? namaFile : `${namaFile}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ================================================================ Cetak
/**
 * Cetak/PDF. Di dalam KerangkaLaporan hanya laporan itu yang tercetak (bagian lain halaman disembunyikan);
 * di luar kerangka mencetak seluruh halaman.
 */
export function TombolCetak({ label = 'Cetak / PDF', target, variant = 'outline', size, className }: { label?: React.ReactNode; /** Elemen yang dicetak. Bawaan: KerangkaLaporan terdekat. */ target?: React.RefObject<HTMLElement | null>; variant?: 'outline' | 'ghost' | 'secondary'; size?: 'sm' | 'md'; className?: string }) {
  const cetak = (e: React.MouseEvent<HTMLElement>) => {
    const el = target?.current ?? e.currentTarget.closest<HTMLElement>('.u-laporan') ?? null;
    if (!el) return window.print();
    el.setAttribute('data-cetak', '');
    document.documentElement.setAttribute('data-u-cetak', '');
    const selesai = () => {
      el.removeAttribute('data-cetak');
      document.documentElement.removeAttribute('data-u-cetak');
      window.removeEventListener('afterprint', selesai);
    };
    window.addEventListener('afterprint', selesai);
    window.print();
    setTimeout(selesai, 1500);
  };
  return (
    <Button type="button" variant={variant} size={size} onClick={cetak} className={cn('u-cetak-sembunyi', className)}>
      <Printer /> {label}
    </Button>
  );
}

/** Tombol unduh CSV. `data` dipanggil saat diklik agar CSV selalu dari data terbaru. */
export function TombolCsv({ namaFile, data, label = 'CSV', disabled, size, className }: { namaFile: string; data: () => { kolom: string[]; baris: SelCsv[][] }; label?: React.ReactNode; disabled?: boolean; size?: 'sm' | 'md'; className?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      disabled={disabled}
      className={cn('u-cetak-sembunyi', className)}
      onClick={() => {
        const d = data();
        unduhCsv(namaFile, d.kolom, d.baris);
      }}
    >
      <Download /> {label}
    </Button>
  );
}

export interface KepalaCetakProps {
  /** Nama lembaga. Bawaan "Universitas Pohuwato". */
  instansi?: React.ReactNode;
  /** Unit penerbit, mis. "Biro Administrasi Umum dan Keuangan". */
  unit?: React.ReactNode;
  judul: React.ReactNode;
  /** Baris kecil: periode, lingkup, dsb. */
  sub?: React.ReactNode;
  logo?: React.ReactNode;
  /** Tampilkan juga di layar (bawaan hanya saat dicetak). */
  tampil?: boolean;
  /** Tanpa cap waktu cetak. */
  tanpaWaktu?: boolean;
  className?: string;
}

/** Kepala laporan saat dicetak: logo, lembaga, unit, judul, periode, dan waktu cetak. */
export function KepalaCetak({ instansi = 'Universitas Pohuwato', unit, judul, sub, logo, tampil, tanpaWaktu, className }: KepalaCetakProps) {
  return (
    <div className={cn('u-kepala-cetak', className)} data-tampil={tampil ? '' : undefined}>
      {logo && <div className="u-kepala-cetak-logo">{logo}</div>}
      <div className="u-kepala-cetak-teks">
        <strong>{instansi}</strong>
        {unit && <span className="u-kepala-cetak-unit">{unit}</span>}
        <span className="u-kepala-cetak-judul">{judul}</span>
        {(sub || !tanpaWaktu) && (
          <small>
            {sub}
            {sub && !tanpaWaktu ? ' · ' : ''}
            {!tanpaWaktu && `dicetak ${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}`}
          </small>
        )}
      </div>
    </div>
  );
}

export interface Penandatangan {
  /** Mis. "Kepala BAUK". */
  jabatan: React.ReactNode;
  nama?: React.ReactNode;
  /** NIP/NIDN/NIK. */
  nomor?: React.ReactNode;
  /** Teks di atas jabatan, mis. "Gorontalo, 16 November 2026". */
  tempatTanggal?: React.ReactNode;
}

/** Blok tanda tangan di bawah laporan (tampil di layar dan cetak). */
export function TandaTanganLaporan({ penandatangan, className }: { penandatangan: Penandatangan[]; className?: string }) {
  if (!penandatangan.length) return null;
  return (
    <div className={cn('u-ttd-laporan', className)} style={{ ['--u-ttd-kolom' as string]: penandatangan.length }}>
      {penandatangan.map((p, i) => (
        <div key={i} className="u-ttd-laporan-item">
          {p.tempatTanggal && <span>{p.tempatTanggal}</span>}
          <span>{p.jabatan}</span>
          <div className="u-ttd-laporan-ruang" />
          <strong>{p.nama ?? '……………………………'}</strong>
          {p.nomor && <small>{p.nomor}</small>}
        </div>
      ))}
    </div>
  );
}

// ================================================================ Kerangka
export interface KerangkaLaporanProps {
  judul: React.ReactNode;
  /** Penjelasan singkat untuk pembaca awam (tidak dicetak). */
  deskripsi?: React.ReactNode;
  /** Periode atau tanggal posisi, tampil di kepala cetak. */
  periode?: React.ReactNode;
  instansi?: React.ReactNode;
  unit?: React.ReactNode;
  logo?: React.ReactNode;
  /** Kontrol penyaring (PilihPeriode, Select unit, dsb.). Tidak dicetak. */
  filter?: React.ReactNode;
  /** Tombol tambahan di kanan. */
  aksi?: React.ReactNode;
  /** Data CSV; bila diisi muncul tombol CSV. */
  csv?: { namaFile: string; data: () => { kolom: string[]; baris: SelCsv[][] } };
  /** Sembunyikan tombol cetak. */
  tanpaCetak?: boolean;
  /** Lencana status, mis. "Seimbang". */
  lencana?: React.ReactNode;
  /** Catatan kaki laporan (dicetak). */
  catatan?: React.ReactNode;
  penandatangan?: Penandatangan[];
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Kerangka satu laporan: judul + penjelasan, baris filter, tombol Cetak/PDF dan CSV, kepala cetak, isi,
 * catatan kaki, dan tanda tangan. Saat dicetak dari tombolnya hanya kerangka ini yang tercetak.
 */
export function KerangkaLaporan({ judul, deskripsi, periode, instansi, unit, logo, filter, aksi, csv, tanpaCetak, lencana, catatan, penandatangan, loading, children, className }: KerangkaLaporanProps) {
  return (
    <section className={cn('u-laporan', className)} aria-busy={loading || undefined}>
      <KepalaCetak instansi={instansi} unit={unit} logo={logo} judul={judul} sub={periode} />
      <header className="u-laporan-kepala u-cetak-sembunyi">
        <div className="u-laporan-judul">
          <h2>
            {judul} {lencana}
          </h2>
          {(periode || deskripsi) && (
            <p>
              {periode && <span className="u-laporan-periode">{periode}</span>}
              {periode && deskripsi ? ' · ' : ''}
              {deskripsi}
            </p>
          )}
        </div>
        <div className="u-laporan-aksi">
          {aksi}
          {csv && <TombolCsv namaFile={csv.namaFile} data={csv.data} size="sm" disabled={loading} />}
          {!tanpaCetak && <TombolCetak size="sm" />}
        </div>
      </header>
      {filter && <div className="u-laporan-filter u-cetak-sembunyi">{filter}</div>}
      <div className="u-laporan-isi">{loading ? <Skeleton style={{ height: 240, width: '100%' }} /> : children}</div>
      {catatan && <div className="u-laporan-catatan">{catatan}</div>}
      {penandatangan && <TandaTanganLaporan penandatangan={penandatangan} />}
    </section>
  );
}

// ================================================================ Tabel laporan
export interface KolomLaporan {
  label: React.ReactNode;
  /** Bawaan 'akuntansi'. */
  format?: FormatNilai;
  /** Label CSV bila `label` bukan teks. */
  csv?: string;
  lebar?: number | string;
}

export interface BarisLaporan {
  /** grup = judul kelompok tanpa angka; item = baris biasa; subtotal/total = bergaris; catatan = teks miring. */
  jenis?: 'grup' | 'item' | 'subtotal' | 'total' | 'catatan';
  label: React.ReactNode;
  /** Kode akun/kode baris (kolom kiri, opsional). */
  kode?: React.ReactNode;
  /** Nilai per kolom, urut sama dengan `kolom`. */
  nilai?: Array<number | string | null | undefined>;
  /** Tingkat indentasi (0 = rata kiri). */
  tingkat?: number;
  /** Klik baris (mis. buka buku besar akun). */
  onClick?: () => void;
  /** Teks label untuk CSV bila `label` bukan teks. */
  labelCsv?: string;
}

export interface TabelLaporanProps {
  kolom: KolomLaporan[];
  baris: BarisLaporan[];
  /** Judul kolom label. Bawaan "Uraian". */
  labelKolom?: React.ReactNode;
  /** Tampilkan kolom kode. */
  denganKode?: boolean;
  kosong?: React.ReactNode;
  /** Rapat (untuk laporan panjang). */
  rapat?: boolean;
  className?: string;
}

/** Tabel laporan keuangan/statistik berjenjang: grup, item berindentasi, subtotal dan total bergaris, angka negatif dalam kurung. */
export function TabelLaporan({ kolom, baris, labelKolom = 'Uraian', denganKode, kosong = 'Tidak ada data pada periode ini.', rapat, className }: TabelLaporanProps) {
  return (
    <div className={cn('u-tabel-laporan-wrap', className)}>
      <table className="u-tabel-laporan" data-rapat={rapat ? '' : undefined}>
        <thead>
          <tr>
            {denganKode && <th className="u-tl-kode">Kode</th>}
            <th>{labelKolom}</th>
            {kolom.map((k, i) => (
              <th key={i} className="u-tl-angka" style={{ width: k.lebar }}>
                {k.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {baris.length === 0 && (
            <tr>
              <td colSpan={kolom.length + (denganKode ? 2 : 1)} className="u-tl-kosong">
                {kosong}
              </td>
            </tr>
          )}
          {baris.map((b, i) => {
            const jenis = b.jenis ?? 'item';
            return (
              <tr key={i} data-jenis={jenis} data-klik={b.onClick ? '' : undefined} onClick={b.onClick} tabIndex={b.onClick ? 0 : undefined} onKeyDown={b.onClick ? (e) => (e.key === 'Enter' ? b.onClick?.() : undefined) : undefined}>
                {denganKode && <td className="u-tl-kode">{b.kode}</td>}
                <td className="u-tl-label" style={{ paddingInlineStart: `calc(0.75rem + ${(b.tingkat ?? 0) * 1.25}rem)` }} colSpan={jenis === 'grup' || jenis === 'catatan' ? kolom.length + 1 : undefined}>
                  {b.label}
                </td>
                {jenis !== 'grup' &&
                  jenis !== 'catatan' &&
                  kolom.map((k, j) => {
                    const v = b.nilai?.[j];
                    return (
                      <td key={j} className="u-tl-angka" data-negatif={typeof v === 'number' && v < 0 ? '' : undefined}>
                        {formatNilai(v, k.format ?? 'akuntansi')}
                      </td>
                    );
                  })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Ubah TabelLaporan menjadi data CSV (angka mentah, grup sebagai baris judul). */
export function tabelLaporanKeCsv(kolom: KolomLaporan[], baris: BarisLaporan[], opsi: { labelKolom?: string; denganKode?: boolean } = {}): { kolom: string[]; baris: SelCsv[][] } {
  const teks = (n: React.ReactNode, cad?: string) => cad ?? (typeof n === 'string' || typeof n === 'number' ? String(n) : '');
  return {
    kolom: [...(opsi.denganKode ? ['Kode'] : []), opsi.labelKolom ?? 'Uraian', ...kolom.map((k) => k.csv ?? teks(k.label))],
    baris: baris.map((b) => [...(opsi.denganKode ? [teks(b.kode)] : []), '  '.repeat(b.tingkat ?? 0) + teks(b.label, b.labelCsv), ...kolom.map((_, j) => b.nilai?.[j] ?? null)]),
  };
}

// ================================================================ Periode
export interface RentangTanggal {
  dari: string;
  sampai: string;
}
export type PresetPeriode = 'bulan_ini' | 'bulan_lalu' | 'triwulan_ini' | 'semester_ini' | 'tahun_ini' | 'tahun_lalu' | 'tahun_akademik';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Rentang tanggal untuk preset. Tahun akademik: 1 September – 31 Agustus. */
export function rentangPreset(p: PresetPeriode, kini: Date = new Date()): RentangTanggal {
  const y = kini.getFullYear();
  const m = kini.getMonth();
  switch (p) {
    case 'bulan_ini':
      return { dari: iso(new Date(y, m, 1)), sampai: iso(new Date(y, m + 1, 0)) };
    case 'bulan_lalu':
      return { dari: iso(new Date(y, m - 1, 1)), sampai: iso(new Date(y, m, 0)) };
    case 'triwulan_ini': {
      const q = Math.floor(m / 3) * 3;
      return { dari: iso(new Date(y, q, 1)), sampai: iso(new Date(y, q + 3, 0)) };
    }
    case 'semester_ini':
      return m < 6 ? { dari: `${y}-01-01`, sampai: `${y}-06-30` } : { dari: `${y}-07-01`, sampai: `${y}-12-31` };
    case 'tahun_lalu':
      return { dari: `${y - 1}-01-01`, sampai: `${y - 1}-12-31` };
    case 'tahun_akademik': {
      const a = m >= 8 ? y : y - 1;
      return { dari: `${a}-09-01`, sampai: `${a + 1}-08-31` };
    }
    default:
      return { dari: `${y}-01-01`, sampai: `${y}-12-31` };
  }
}

const LABEL_PRESET: Record<PresetPeriode, string> = {
  bulan_ini: 'Bulan ini',
  bulan_lalu: 'Bulan lalu',
  triwulan_ini: 'Triwulan ini',
  semester_ini: 'Semester ini',
  tahun_ini: 'Tahun ini',
  tahun_lalu: 'Tahun lalu',
  tahun_akademik: 'Tahun akademik',
};

/** "1 Januari 2026 s.d. 31 Desember 2026" atau "per 31 Desember 2026". */
export function labelPeriode(r: Partial<RentangTanggal> & { tanggal?: string }): string {
  const f = (s?: string) => (s ? new Date(`${s}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  if (r.tanggal) return `Per ${f(r.tanggal)}`;
  if (r.dari && r.sampai) return `${f(r.dari)} s.d. ${f(r.sampai)}`;
  return f(r.sampai ?? r.dari);
}

export interface PilihPeriodeProps {
  value: RentangTanggal;
  onChange: (v: RentangTanggal) => void;
  preset?: PresetPeriode[];
  /** Mode satu tanggal (posisi per tanggal): hanya `sampai` yang dipakai. */
  satuTanggal?: boolean;
  className?: string;
}

/** Pemilih periode: preset (bulan ini, tahun ini, tahun akademik, …) dan tanggal dari–sampai. */
export function PilihPeriode({ value, onChange, preset = ['bulan_ini', 'bulan_lalu', 'triwulan_ini', 'tahun_ini', 'tahun_lalu', 'tahun_akademik'], satuTanggal, className }: PilihPeriodeProps) {
  const aktif = preset.find((p) => {
    const r = rentangPreset(p);
    return satuTanggal ? r.sampai === value.sampai : r.dari === value.dari && r.sampai === value.sampai;
  });
  return (
    <div className={cn('u-pilih-periode', className)}>
      <Select<string>
        size="sm"
        aria-label="Periode cepat"
        placeholder="Periode khusus"
        value={aktif ?? null}
        options={preset.map((p) => ({ value: p, label: satuTanggal ? `Akhir ${LABEL_PRESET[p].toLowerCase()}` : LABEL_PRESET[p] }))}
        onValueChange={(p) => p && onChange(rentangPreset(p as PresetPeriode))}
      />
      {!satuTanggal && (
        <>
          <Input type="date" size="sm" aria-label="Dari tanggal" value={value.dari} max={value.sampai} onChange={(e) => e.target.value && onChange({ ...value, dari: e.target.value })} />
          <span className="u-pilih-periode-sd">s.d.</span>
        </>
      )}
      <Input type="date" size="sm" aria-label={satuTanggal ? 'Per tanggal' : 'Sampai tanggal'} value={value.sampai} min={satuTanggal ? undefined : value.dari} onChange={(e) => e.target.value && onChange({ ...value, sampai: e.target.value })} />
    </div>
  );
}

// ================================================================ Statistik ringkas
export interface ItemStatistik {
  label: React.ReactNode;
  nilai: number | string | null | undefined;
  format?: FormatNilai;
  /** Perubahan persen dibanding periode lalu. */
  perubahan?: number | null;
  /** Naik itu buruk (mis. tunggakan). */
  terbalik?: boolean;
  keterangan?: React.ReactNode;
  ikon?: React.ReactNode;
  tren?: number[];
  nada?: StatCardProps['tone'];
  /** Progres 0–100 di bawah angka. */
  progres?: number | null;
  href?: string;
}

/** Deret kartu statistik dari daftar item; cocok untuk kepala dasbor statistik aplikasi mana pun. */
export function StatistikRingkas({ items, loading, min = 200, className }: { items: ItemStatistik[]; loading?: boolean; min?: number; className?: string }) {
  return (
    <StatGrid min={min} className={className}>
      {items.map((it, i) => (
        <StatCard
          key={i}
          label={it.label}
          value={typeof it.nilai === 'number' ? formatNilai(it.nilai, it.format ?? 'angka') : (it.nilai ?? '–')}
          delta={it.perubahan}
          inverse={it.terbalik}
          hint={it.keterangan}
          icon={it.ikon}
          trend={it.tren}
          tone={it.nada}
          href={it.href}
          loading={loading}
          footer={
            it.progres != null ? (
              <div className="u-statistik-progres" aria-label={`${Math.round(it.progres)}%`}>
                <i style={{ width: `${Math.max(0, Math.min(100, it.progres))}%` }} />
              </div>
            ) : undefined
          }
        />
      ))}
    </StatGrid>
  );
}

// ================================================================ Tabel rekap
export interface KolomRekap<T> {
  key: string;
  label: React.ReactNode;
  nilai: (b: T) => number | string | null | undefined;
  format?: FormatNilai;
  /** Tampilkan batang proporsi di sel (untuk kolom angka). */
  batang?: boolean;
  /** Jumlahkan di baris total. */
  total?: boolean;
  csv?: string;
}

/**
 * Tabel rekap sederhana (per prodi, per jenis biaya, per unit) dengan baris total, batang proporsi di sel, dan klik baris.
 * Untuk laporan akuntansi berjenjang gunakan TabelLaporan.
 */
export function TabelRekap<T>({ kolom, baris, kunci, onPilih, total = true, kosong = 'Belum ada data.', className }: { kolom: KolomRekap<T>[]; baris: T[]; kunci: (b: T) => string; onPilih?: (b: T) => void; total?: boolean | string; kosong?: React.ReactNode; className?: string }) {
  const maks = React.useMemo(() => Object.fromEntries(kolom.filter((k) => k.batang).map((k) => [k.key, Math.max(1, ...baris.map((b) => Math.abs(Number(k.nilai(b)) || 0)))])), [kolom, baris]);
  const jumlah = (k: KolomRekap<T>) => baris.reduce((s, b) => s + (Number(k.nilai(b)) || 0), 0);
  return (
    <div className={cn('u-tabel-laporan-wrap', className)}>
      <table className="u-tabel-laporan u-tabel-rekap">
        <thead>
          <tr>
            {kolom.map((k, i) => (
              <th key={k.key} className={i > 0 && k.format !== 'teks' ? 'u-tl-angka' : undefined}>
                {k.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {baris.length === 0 && (
            <tr>
              <td colSpan={kolom.length} className="u-tl-kosong">
                {kosong}
              </td>
            </tr>
          )}
          {baris.map((b) => (
            <tr key={kunci(b)} data-klik={onPilih ? '' : undefined} onClick={onPilih ? () => onPilih(b) : undefined} tabIndex={onPilih ? 0 : undefined} onKeyDown={onPilih ? (e) => (e.key === 'Enter' ? onPilih(b) : undefined) : undefined}>
              {kolom.map((k, i) => {
                const v = k.nilai(b);
                const angka = i > 0 && k.format !== 'teks';
                return (
                  <td key={k.key} className={angka ? 'u-tl-angka' : undefined}>
                    {k.batang && typeof v === 'number' ? (
                      <span className="u-rekap-batang">
                        <i style={{ width: `${(Math.abs(v) / (maks[k.key] ?? 1)) * 100}%` }} data-nada={k.format === 'persen' ? (v >= 90 ? 'baik' : v >= 70 ? 'sedang' : 'buruk') : undefined} />
                        <span>{formatNilai(v, k.format ?? 'angka')}</span>
                      </span>
                    ) : (
                      formatNilai(v, angka ? (k.format ?? 'angka') : 'teks')
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {total && baris.length > 1 && (
          <tfoot>
            <tr data-jenis="total">
              {kolom.map((k, i) => (
                <td key={k.key} className={i > 0 ? 'u-tl-angka' : undefined}>
                  {i === 0 ? (typeof total === 'string' ? total : 'Total') : k.total ? formatNilai(jumlah(k), k.format ?? 'angka') : ''}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

/** CSV dari TabelRekap. */
export function rekapKeCsv<T>(kolom: KolomRekap<T>[], baris: T[]): { kolom: string[]; baris: SelCsv[][] } {
  return {
    kolom: kolom.map((k) => k.csv ?? (typeof k.label === 'string' ? k.label : k.key)),
    baris: baris.map((b) => kolom.map((k) => k.nilai(b) ?? null)),
  };
}
