'use client';
import * as React from 'react';
import { GraduationCap } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Empty, Progress } from '../../components/display';
import { SegmentedControl } from '../../components/forms';
import { DeretAngka, KakiCetak, KepalaAkademik, KepalaCetak, LegendaSkalaNilai, SebaranNilaiSkala, TabelNilaiCetak, TabelNilaiMk, TombolCetakAkademik, keadaanData, type KeadaanDataProps } from './bersama';
import { normalSkala, predikatDariIpk, type PredikatKelulusan, type SumberSkala } from './skala';
import { adaAngka, angka, duaDesimal, type BarisNilaiMk, type DataTranskrip, type IdentitasAkademik } from './tipe';

export type TampilanTranskrip = 'semester' | 'tabel';

export interface LembarTranskripProps extends KeadaanDataProps {
  /** Respons GET /v1/mahasiswa/{nim}/transkrip (atau transkrip-sementara). */
  data?: DataTranskrip | null;
  /** Skala nilai server (useSkalaNilai) untuk warna, sebaran, dan legenda. */
  skala?: SumberSkala | null;
  /** Daftar predikat m_predikat (usePredikatKelulusan); predikat dihitung dari IPK. */
  predikat?: ReadonlyArray<PredikatKelulusan> | null;
  /** Kode jenjang untuk memilih baris predikat (bila m_predikat per jenjang). */
  jenjang?: string | null;
  /** SKS minimal lulus dari aturan kurikulum prodi (server). Tanpa nilai ini bilah kemajuan tidak tampil. */
  sksLulus?: number | null;
  identitas?: IdentitasAkademik | null;
  kop?: React.ReactNode;
  /** Tampilan awal: per semester (bawaan) atau satu tabel dengan kolom semester & periode. */
  tampilan?: TampilanTranskrip;
  judul?: React.ReactNode | false;
  aksi?: React.ReactNode;
  cetak?: boolean;
  className?: string;
}

/** IP satu kelompok MK dari bobot × SKS (hanya MK yang bernilai). */
export function hitungIp(mk: ReadonlyArray<BarisNilaiMk>): { sks: number; mutu: number; ip: number | null } {
  let sks = 0;
  let mutu = 0;
  for (const m of mk) {
    if (m.nilai_ditampilkan === false || !adaAngka(m.bobot)) continue;
    sks += angka(m.sks);
    mutu += adaAngka(m.mutu) ? angka(m.mutu) : angka(m.bobot) * angka(m.sks);
  }
  return { sks, mutu, ip: sks ? mutu / sks : null };
}

/**
 * Transkrip nilai: IPK, predikat (m_predikat), SKS terhadap SKS lulus prodi, total mutu, sebaran nilai menurut skala,
 * nilai per semester (dengan IP semester) atau satu tabel, dan versi cetak A4 berkop.
 */
export function LembarTranskrip({ data, skala, predikat, jenjang, sksLulus, identitas, kop, tampilan = 'semester', judul, aksi, cetak = true, className, ...k }: LembarTranskripProps) {
  const ref = React.useRef<HTMLElement>(null);
  const [mode, setMode] = React.useState<TampilanTranskrip>(tampilan);
  const s = React.useMemo(() => normalSkala(skala), [skala]);
  const mk = React.useMemo(() => data?.mata_kuliah ?? [], [data]);
  const grup = React.useMemo(() => {
    const m = new Map<number, BarisNilaiMk[]>();
    for (const r of mk) m.set(r.semester ?? 0, [...(m.get(r.semester ?? 0) ?? []), r]);
    return [...m].sort((a, b) => (a[0] || 99) - (b[0] || 99));
  }, [mk]);
  const keadaan = keadaanData(k, !!data, 360, className);
  if (keadaan) return keadaan;
  if (!mk.length) return <Empty icon={<GraduationCap />} title="Belum ada nilai" description="Transkrip terisi setelah nilai semester pertama dirilis." className={className} />;
  const ipk = adaAngka(data?.ipk?.nilai) ? Number(data!.ipk!.nilai) : hitungIp(mk).ip;
  const sks = adaAngka(data?.jumlah_sks) ? angka(data?.jumlah_sks) : adaAngka(data?.ipk?.sks) ? angka(data?.ipk?.sks) : mk.reduce((a, m) => a + angka(m.sks), 0);
  const mutu = adaAngka(data?.jumlah_mutu) ? angka(data?.jumlah_mutu) : hitungIp(mk).mutu;
  const pred = data?.predikat_sementara ?? predikatDariIpk(ipk, predikat, jenjang);
  return (
    <section ref={ref} className={cn('u-ak-blok u-ak-dok', className)}>
      <KepalaCetak kop={kop} judul="Transkrip Nilai" identitas={identitas} />
      {judul !== false && (
        <KepalaAkademik
          className="u-ak-layar"
          judul={judul ?? 'Transkrip nilai'}
          meta={`${mk.length} mata kuliah · nilai terbaik tiap mata kuliah`}
          aksi={
            <>
              <SegmentedControl<TampilanTranskrip>
                aria-label="Tampilan transkrip"
                value={mode}
                onValueChange={setMode}
                options={[
                  { value: 'semester', label: 'Per semester' },
                  { value: 'tabel', label: 'Satu tabel' },
                ]}
              />
              {aksi}
              {cetak && <TombolCetakAkademik target={ref} />}
            </>
          }
        />
      )}
      <DeretAngka
        items={[
          { label: 'IPK', nilai: duaDesimal(ipk), keterangan: pred ?? undefined },
          { label: 'SKS lulus', nilai: sksLulus ? `${sks} / ${sksLulus}` : sks, nada: sksLulus && sks >= sksLulus ? 'success' : undefined },
          { label: 'Total mutu', nilai: mutu ? mutu.toFixed(2) : '–' },
          { label: 'Mata kuliah', nilai: mk.length },
        ]}
      />
      {sksLulus ? <Progress className="u-ak-layar" value={Math.min(sks, sksLulus)} max={sksLulus} size="sm" tone={sks >= sksLulus ? 'success' : 'primary'} label="Menuju SKS lulus" format={() => `${sks} dari ${sksLulus} SKS`} /> : null}
      <SebaranNilaiSkala className="u-ak-layar" data={mk} skala={s} />
      <div className="u-ak-layar u-ak-transkrip-isi">
        {mode === 'tabel' ? (
          <TabelNilaiMk data={mk} skala={s} semester periode ekspor={`transkrip-${identitas?.nim ?? data?.nim ?? ''}`} />
        ) : (
          grup.map(([smt, rows]) => {
            const h = hitungIp(rows);
            return (
              <section key={smt} className="u-ak-smt">
                <KepalaAkademik judul={smt ? `Semester ${smt}` : 'Tanpa semester'} meta={`${rows.reduce((a, r) => a + angka(r.sks), 0)} SKS${h.ip != null ? ` · IP ${h.ip.toFixed(2)}` : ''}`} />
                <TabelNilaiMk data={rows} skala={s} />
              </section>
            );
          })
        )}
      </div>
      <div className="u-ak-cetak">
        <TabelNilaiCetak data={mk} semester />
        <dl className="u-ak-cetak-total">
          <div>
            <dt>Jumlah SKS</dt>
            <dd>{sks}</dd>
          </div>
          <div>
            <dt>Jumlah mutu</dt>
            <dd>{mutu ? mutu.toFixed(2) : '–'}</dd>
          </div>
          <div>
            <dt>IPK</dt>
            <dd>{duaDesimal(ipk)}</dd>
          </div>
          {pred && (
            <div>
              <dt>Predikat</dt>
              <dd>{pred}</dd>
            </div>
          )}
        </dl>
      </div>
      {s.length > 0 && <LegendaSkalaNilai skala={s} />}
      <KakiCetak />
    </section>
  );
}
