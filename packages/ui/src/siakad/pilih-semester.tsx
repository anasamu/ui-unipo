'use client';
import { AlertTriangle, GraduationCap } from 'lucide-react';
import { cn } from '../lib/cn';

export type JenisPeriodeSemester = 'ganjil' | 'genap' | 'pendek' | 'khusus';

/** Batas semester lazim per jenjang (kode PDDikti atau label). */
export const MAKS_SEMESTER_JENJANG: Record<string, number> = {
  D1: 4, G: 4, D2: 6, F: 6, D3: 10, E: 10, D4: 14, D: 14, S1: 14, C: 14, S2: 8, B: 8, S3: 14, A: 14, Profesi: 4, J: 4,
};

/** Jenis periode dari tahun_id: 20261 ganjil, 20262 genap, 20263 pendek, lainnya khusus. */
export function jenisPeriodeDari(tahunId?: string | null): JenisPeriodeSemester | null {
  if (!tahunId || !/^\d{5}$/.test(tahunId)) return null;
  return ({ '1': 'ganjil', '2': 'genap', '3': 'pendek' } as const)[tahunId[4] as '1' | '2' | '3'] ?? 'khusus';
}

/** Semester yang lazim di periode: ganjil 1,3,5,…; genap 2,4,6,…; pendek/khusus semua. */
export function semesterUntukPeriode(jenis: JenisPeriodeSemester | null | undefined, maks = 14): number[] {
  const semua = Array.from({ length: maks }, (_, i) => i + 1);
  if (jenis === 'ganjil') return semua.filter((n) => n % 2 === 1);
  if (jenis === 'genap') return semua.filter((n) => n % 2 === 0);
  return semua;
}

/**
 * Angkatan (tahun masuk ganjil) mahasiswa yang berada di semester ini pada periode itu, mis. semester 3 di 20261 →
 * 2025. null bila periode tidak diketahui atau semester tidak cocok dengan jenis periodenya.
 */
export function angkatanSemester(semester: number, tahunId?: string | null): number | null {
  const j = jenisPeriodeDari(tahunId);
  if (!j || !tahunId) return null;
  const y = Number(tahunId.slice(0, 4));
  if (j === 'ganjil') return semester % 2 === 1 ? y - (semester - 1) / 2 : null;
  if (j === 'genap') return semester % 2 === 0 ? y - (semester / 2 - 1) : null;
  return null;
}

export interface PilihSemesterProps {
  /** tahun_id periode yang sedang diatur (mis. 20261). Menentukan jenis periode dan label angkatan. */
  periode?: string | null;
  /** Jenis periode bila tahun_id tidak tersedia. */
  jenisPeriode?: JenisPeriodeSemester | null;
  /** Jenjang (kode PDDikti C/E/B atau label S1/D3/S2) untuk batas semester lazim. */
  jenjang?: string | null;
  /** Semester tertinggi; menimpa batas jenjang. Bawaan 14. */
  maks?: number;
  /** banyak (bawaan) atau tunggal. */
  mode?: 'banyak' | 'tunggal';
  value: number[];
  onValueChange: (semester: number[]) => void;
  /** Pilihan "Maba (semester 1)" terpisah (hanya periode ganjil). Bila diisi, semester 1 dikelola lewat maba. */
  maba?: boolean;
  onMabaChange?: (maba: boolean) => void;
  disabled?: boolean;
  /** Label grup untuk pembaca layar. */
  'aria-label'?: string;
  className?: string;
}

/**
 * Pemilih semester sasaran yang mengikuti periode: periode ganjil hanya menawarkan semester 1, 3, 5, …; genap 2, 4,
 * 6, …; pendek/khusus semua. Label menyebut angkatan bila periode diketahui ("Semester 3 · angkatan 2025"), batas
 * semester mengikuti jenjang. Nilai tersimpan yang tidak cocok dengan periode tetap ditampilkan dengan peringatan
 * (bukan dibuang diam-diam) sehingga pengguna bisa menghapusnya sendiri.
 */
export function PilihSemester({ periode, jenisPeriode, jenjang, maks, mode = 'banyak', value, onValueChange, maba, onMabaChange, disabled, className, ...rest }: PilihSemesterProps) {
  const jenis = jenisPeriode ?? jenisPeriodeDari(periode);
  const batas = maks ?? (jenjang ? MAKS_SEMESTER_JENJANG[jenjang] : undefined) ?? 14;
  const pakaiMaba = jenis === 'ganjil' && onMabaChange !== undefined;
  const pilihan = semesterUntukPeriode(jenis, batas).filter((n) => !(pakaiMaba && n === 1));
  const tidakCocok = value.filter((n) => !semesterUntukPeriode(jenis, Math.max(batas, n)).includes(n) || n > batas);
  const pilih = (n: number) => {
    if (disabled) return;
    if (mode === 'tunggal') onValueChange(value.includes(n) ? [] : [n]);
    else onValueChange(value.includes(n) ? value.filter((x) => x !== n) : [...value, n].sort((a, b) => a - b));
  };
  const label = (n: number) => {
    const a = angkatanSemester(n, periode);
    return a ? `Semester ${n} · angkatan ${a}` : `Semester ${n}`;
  };
  return (
    <div className={cn('u-pilih-semester', className)}>
      <div className="u-pilih-semester-daftar" role="group" aria-label={rest['aria-label'] ?? 'Semester'}>
        {pakaiMaba ? (
          <button type="button" className="u-pilih-semester-chip" data-maba="" aria-pressed={!!maba} disabled={disabled} onClick={() => onMabaChange!(!maba)}>
            <GraduationCap aria-hidden /> Maba (semester 1){periode && angkatanSemester(1, periode) ? ` · ${angkatanSemester(1, periode)}` : ''}
          </button>
        ) : null}
        {pilihan.map((n) => (
          <button key={n} type="button" className="u-pilih-semester-chip" aria-pressed={value.includes(n)} disabled={disabled} onClick={() => pilih(n)} title={label(n)}>
            <strong>{n}</strong>
            {angkatanSemester(n, periode) ? <small>{angkatanSemester(n, periode)}</small> : null}
          </button>
        ))}
        {tidakCocok.map((n) => (
          <button key={`x${n}`} type="button" className="u-pilih-semester-chip" data-salah="" aria-pressed disabled={disabled} onClick={() => pilih(n)} title={`Semester ${n} tidak ada di periode ${jenis ?? 'ini'}. Klik untuk menghapus.`}>
            <AlertTriangle aria-hidden /> <strong>{n}</strong>
          </button>
        ))}
      </div>
      <p className="u-pilih-semester-ket">
        {tidakCocok.length ? (
          <span className="u-pilih-semester-galat">
            Semester {tidakCocok.join(', ')} tidak cocok dengan periode {jenis}. Hapus atau ganti sebelum menyimpan.
          </span>
        ) : jenis === 'ganjil' ? (
          'Periode ganjil: semester 1, 3, 5, … (angka kecil = angkatan).'
        ) : jenis === 'genap' ? (
          'Periode genap: semester 2, 4, 6, … (angka kecil = angkatan).'
        ) : jenis ? (
          `Periode ${jenis}: semua semester.`
        ) : (
          'Pilih periode untuk menyaring semester.'
        )}
      </p>
    </div>
  );
}
