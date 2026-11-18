'use client';
import * as React from 'react';
import { cn } from '../lib/cn';

/** Satu baris garis waktu (mis. satu tahapan periode). Tanggal ISO `YYYY-MM-DD[ HH:MM[:SS]]`. */
export interface BarisGarisWaktu {
  id: string;
  judul: React.ReactNode;
  mulai: string;
  /** Kosong = satu hari. */
  selesai?: string | null;
  /** Warna batang (#RRGGBB). Bawaan warna utama. */
  warna?: string | null;
  /** Teks kecil di bawah judul (mis. rentang tanggal atau cakupan). */
  keterangan?: React.ReactNode;
  /** Lencana/ikon di kanan judul. */
  lencana?: React.ReactNode;
  /** Batang bergaris (mis. libur). */
  libur?: boolean;
  /** Batang pudar (mis. tidak tampil di kalender). */
  redup?: boolean;
  /** Teks tooltip batang. */
  title?: string;
}

export interface GarisWaktuProps {
  baris: BarisGarisWaktu[];
  /** Awal sumbu; bawaan tanggal paling awal (awal bulan). */
  dari?: string;
  /** Akhir sumbu; bawaan tanggal paling akhir (akhir bulan). */
  sampai?: string;
  /** Penanda hari ini; bawaan tanggal hari ini, `false` = tanpa penanda. */
  hariIni?: string | false;
  onPilih?: (b: BarisGarisWaktu) => void;
  /** Isi saat baris kosong. */
  kosong?: React.ReactNode;
  /** Label kolom judul. */
  labelKolom?: React.ReactNode;
  'aria-label'?: string;
  className?: string;
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI = 86_400_000;
const keWaktu = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00`).getTime();
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Garis waktu (gantt sederhana) per baris: sumbu bulan, batang berwarna per rentang, penanda hari ini. Dipakai untuk
 * tahapan periode akademik di Kalender & periode; di layar sempit judul berada di atas batangnya.
 */
export function GarisWaktu({ baris, dari, sampai, hariIni, onPilih, kosong, labelKolom = 'Tahapan', className, ...rest }: GarisWaktuProps) {
  const [a, b] = React.useMemo(() => {
    if (!baris.length && !(dari && sampai)) return [0, 0];
    const awal = dari ?? baris.reduce((m, x) => (x.mulai < m ? x.mulai : m), baris[0]!.mulai);
    const akhir = sampai ?? baris.reduce((m, x) => ((x.selesai ?? x.mulai) > m ? (x.selesai ?? x.mulai) : m), baris[0]!.selesai ?? baris[0]!.mulai);
    const d0 = new Date(keWaktu(awal));
    const d1 = new Date(keWaktu(akhir));
    return [new Date(d0.getFullYear(), d0.getMonth(), 1).getTime(), new Date(d1.getFullYear(), d1.getMonth() + 1, 1).getTime()];
  }, [baris, dari, sampai]);
  if (!baris.length) return <div className={cn('u-garis-waktu-kosong', className)}>{kosong ?? 'Belum ada tahapan.'}</div>;
  const total = Math.max(HARI, b - a);
  const pos = (t: number) => Math.min(100, Math.max(0, ((t - a) / total) * 100));
  const bulan: { label: string; kiri: number; lebar: number }[] = [];
  for (let d = new Date(a); d.getTime() < b; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const n = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    bulan.push({ label: `${BULAN[d.getMonth()]}${d.getMonth() === 0 || bulan.length === 0 ? ` ${d.getFullYear()}` : ''}`, kiri: pos(d.getTime()), lebar: pos(n) - pos(d.getTime()) });
  }
  const kini = hariIni === false ? null : keWaktu(hariIni ?? iso(new Date()));
  const tampilKini = kini !== null && kini >= a && kini < b;

  return (
    <div className={cn('u-garis-waktu', className)} role="table" aria-label={rest['aria-label'] ?? 'Garis waktu'}>
      <div className="u-garis-waktu-kepala" role="row">
        <span className="u-garis-waktu-label" role="columnheader">{labelKolom}</span>
        <div className="u-garis-waktu-sumbu" role="columnheader" aria-label="Bulan">
          {bulan.map((m, i) => (
            <span key={i} className="u-garis-waktu-bulan" style={{ left: `${m.kiri}%`, width: `${m.lebar}%` }}>{m.label}</span>
          ))}
        </div>
      </div>
      <div className="u-garis-waktu-badan">
        {baris.map((x) => {
          const m = keWaktu(x.mulai);
          const s = keWaktu(x.selesai ?? x.mulai) + HARI;
          const kiri = pos(m);
          const lebar = Math.max(0.6, pos(s) - kiri);
          const Tag = onPilih ? 'button' : 'div';
          return (
            <div key={x.id} className="u-garis-waktu-baris" role="row" data-redup={x.redup || undefined}>
              <div className="u-garis-waktu-label" role="cell">
                <span className="u-garis-waktu-judul">{x.judul}{x.lencana}</span>
                {x.keterangan ? <span className="u-garis-waktu-ket">{x.keterangan}</span> : null}
              </div>
              <div className="u-garis-waktu-jalur" role="cell">
                {bulan.map((mm, i) => <span key={i} className="u-garis-waktu-garis" style={{ left: `${mm.kiri}%` }} aria-hidden />)}
                {tampilKini ? <span className="u-garis-waktu-kini" style={{ left: `${pos(kini!)}%` }} aria-hidden /> : null}
                <Tag
                  type={onPilih ? 'button' : undefined}
                  className="u-garis-waktu-batang"
                  data-libur={x.libur || undefined}
                  style={{ left: `${kiri}%`, width: `${lebar}%`, ['--warna' as string]: x.warna || 'var(--u-primary)' }}
                  title={x.title}
                  onClick={onPilih ? () => onPilih(x) : undefined}
                  aria-label={x.title}
                />
              </div>
            </div>
          );
        })}
      </div>
      {tampilKini ? <div className="u-garis-waktu-legenda"><span className="u-garis-waktu-kini-tanda" aria-hidden /> Hari ini</div> : null}
    </div>
  );
}
