'use client';
import * as React from 'react';
import { BookOpen, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Empty } from '../../components/display';
import { Select } from '../../components/select';
import { labelTahunAkademik } from '../akademik';
import { DeretAngka, KakiCetak, KepalaAkademik, KepalaCetak, LegendaSkalaNilai, TabelNilaiCetak, TabelNilaiMk, TombolCetakAkademik, keadaanData, type KeadaanDataProps } from './bersama';
import { penentuSkala, type SkalaPerPeriode, type SumberSkala } from './skala';
import { adaAngka, angka, duaDesimal, type IdentitasAkademik, type PeriodeKhs } from './tipe';

export interface LembarKhsProps extends KeadaanDataProps {
  /** `periode` dari GET /v1/mahasiswa/{nim}/khs (semua periode), atau satu periode. */
  periode?: ReadonlyArray<PeriodeKhs> | PeriodeKhs | null;
  /** Periode terpilih (terkendali). Bawaan periode terbaru. */
  tahunId?: string | null;
  onTahunIdChange?: (tahunId: string) => void;
  /**
   * Skala nilai server untuk warna nilai dan legenda. Baris m_nilai mentah (`useSkalaNilai().baris`) atau fungsi
   * periode → skala: KHS memakai versi skala yang berlaku di periode KHS yang ditampilkan.
   */
  skala?: SumberSkala | SkalaPerPeriode | null;
  /** Kode prodi untuk memilih baris m_nilai prodi. */
  prodi?: string | null;
  /** Identitas untuk versi cetak (nama, NIM, prodi, dosen PA). */
  identitas?: IdentitasAkademik | null;
  /** Kop surat/logo untuk versi cetak. */
  kop?: React.ReactNode;
  judul?: React.ReactNode | false;
  /** Aksi tambahan di kanan kepala (mis. Terbitkan KHS resmi). */
  aksi?: React.ReactNode;
  /** Tombol cetak (bawaan true). */
  cetak?: boolean;
  /** Tampilkan legenda skala nilai di bawah tabel (bawaan true bila skala ada). */
  legenda?: boolean;
  className?: string;
}

const urutTerbaru = (p: ReadonlyArray<PeriodeKhs>) => [...p].filter((x) => x.tahun_id).sort((a, b) => String(b.tahun_id).localeCompare(String(a.tahun_id)));

/**
 * Kartu hasil studi satu periode: pemilih periode, IPS (naik/turun dari semester lalu), IPK, SKS semester dan
 * kumulatif, tabel nilai (DataTable, kartu di ponsel), legenda skala, dan versi cetak A4 berkop.
 */
export function LembarKhs({ periode, tahunId, onTahunIdChange, skala, prodi, identitas, kop, judul, aksi, cetak = true, legenda, className, ...k }: LembarKhsProps) {
  const ref = React.useRef<HTMLElement>(null);
  const semua = React.useMemo(() => (periode ? urutTerbaru(Array.isArray(periode) ? (periode as PeriodeKhs[]) : [periode as PeriodeKhs]) : []), [periode]);
  const [pilihSendiri, setPilih] = React.useState<string | null>(null);
  const skalaUntuk = React.useMemo(() => penentuSkala(skala, { prodi }), [skala, prodi]);
  const keadaan = keadaanData(k, !!periode, 320, className);
  if (keadaan) return keadaan;
  if (!semua.length) return <Empty icon={<BookOpen />} title="Belum ada KHS" description="KHS muncul setelah nilai semester diumumkan." className={className} />;
  const pilih = tahunId ?? pilihSendiri;
  const i = Math.max(0, semua.findIndex((p) => p.tahun_id === pilih));
  const aktif = semua[i]!;
  const s = skalaUntuk(aktif.tahun_id);
  const lalu = semua[i + 1];
  const mk = aktif.mata_kuliah ?? [];
  const ips = adaAngka(aktif.ips?.nilai) ? Number(aktif.ips!.nilai) : null;
  const ipsLalu = adaAngka(lalu?.ips?.nilai) ? Number(lalu!.ips!.nilai) : null;
  const beda = ips != null && ipsLalu != null ? ips - ipsLalu : null;
  const sksSmt = adaAngka(aktif.jumlah_sks) ? angka(aktif.jumlah_sks) : adaAngka(aktif.ips?.sks) ? angka(aktif.ips?.sks) : mk.reduce((a, m) => a + angka(m.sks), 0);
  const belumRilis = mk.filter((m) => m.nilai_ditampilkan === false).length;
  const ganti = (v: string | null) => {
    if (!v) return;
    setPilih(v);
    onTahunIdChange?.(v);
  };
  const pemilih =
    semua.length > 1 ? (
      <Select<string>
        aria-label="Periode"
        size="sm"
        className="u-ak-pilih-periode"
        value={aktif.tahun_id ?? null}
        onValueChange={ganti}
        options={semua.map((p) => ({ value: p.tahun_id!, label: labelTahunAkademik(p.tahun_id) }))}
      />
    ) : null;
  return (
    <section ref={ref} className={cn('u-ak-blok u-ak-dok', className)}>
      <KepalaCetak kop={kop} judul="Kartu Hasil Studi" sub={labelTahunAkademik(aktif.tahun_id)} identitas={identitas} />
      {judul !== false && (
        <KepalaAkademik
          className="u-ak-layar"
          judul={judul ?? 'Kartu hasil studi'}
          meta={`${labelTahunAkademik(aktif.tahun_id)} · ${mk.length} mata kuliah`}
          aksi={
            pemilih || aksi || cetak ? (
              <>
                {pemilih}
                {aksi}
                {cetak && <TombolCetakAkademik target={ref} />}
              </>
            ) : undefined
          }
        />
      )}
      <DeretAngka
        items={[
          {
            label: 'IPS',
            nilai: (
              <span className="u-ak-ip">
                {duaDesimal(ips)}
                {beda != null && beda !== 0 && (beda > 0 ? <TrendingUp aria-label="Naik dari semester lalu" data-arah="naik" /> : <TrendingDown aria-label="Turun dari semester lalu" data-arah="turun" />)}
              </span>
            ),
            keterangan: beda != null ? `${beda >= 0 ? '+' : ''}${beda.toFixed(2)} dari ${labelTahunAkademik(lalu?.tahun_id, true)}` : undefined,
          },
          { label: 'IPK', nilai: duaDesimal(aktif.ipk?.nilai) },
          { label: 'SKS semester', nilai: sksSmt },
          { label: 'SKS kumulatif', nilai: adaAngka(aktif.ipk?.sks) ? angka(aktif.ipk?.sks) : '–' },
        ]}
      />
      {belumRilis > 0 && <p className="u-ak-catatan u-ak-layar">{belumRilis} nilai belum dirilis dosen; IPS dihitung dari nilai yang sudah dirilis.</p>}
      <div className="u-ak-layar">
        <TabelNilaiMk data={mk} skala={s} ekspor={`khs-${identitas?.nim ?? aktif.nim ?? ''}-${aktif.tahun_id ?? ''}`} />
      </div>
      <div className="u-ak-cetak">
        <TabelNilaiCetak data={mk} />
      </div>
      {(legenda ?? s.length > 0) && <LegendaSkalaNilai skala={s} />}
      <KakiCetak />
    </section>
  );
}
