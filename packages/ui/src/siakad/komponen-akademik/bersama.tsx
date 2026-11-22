'use client';
import * as React from 'react';
import { BookOpen } from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';
import { Skeleton } from '../../components/actions';
import { DataTable, type DataColumn } from '../../components/data-table';
import { ProgressBertumpuk } from '../../components/progres';
import { TombolCetak } from '../../components/laporan';
import { GalatApi } from '../galat';
import type { SkalaNilai } from '../alur';
import { cariSkala, nadaNilai, normalSkala, type NadaNilai, type PenentuSkala, type SumberSkala } from './skala';
import { adaAngka, duaDesimal, type BarisNilaiMk, type IdentitasAkademik } from './tipe';
import { labelTahunAkademik } from '../label-tahun';

// ================================================================ Keadaan memuat / galat / kosong
export interface KeadaanDataProps {
  /** Data sedang dimuat (tampil kerangka bila belum ada data). */
  memuat?: boolean;
  /** Galat dari API; tampil GalatApi dengan kode laporan. */
  galat?: unknown;
  onUlang?: () => void;
}

/** Kerangka/galat standar untuk semua komponen akademik. Kembali null bila data siap ditampilkan. */
export function keadaanData({ memuat, galat, onUlang }: KeadaanDataProps, adaData: boolean, tinggi = 240, className?: string): React.ReactElement | null {
  if (galat) return <GalatApi error={galat} onRetry={onUlang} className={className} />;
  if (memuat && !adaData) return <Skeleton className={cn('u-ak-kerangka', className)} style={{ height: tinggi }} />;
  return null;
}

// ================================================================ Kepala bagian
/** Kepala komponen: judul + keterangan di kiri, aksi di kanan (pola u-panel-head). */
export function KepalaAkademik({ judul, meta, aksi, className }: { judul?: React.ReactNode; meta?: React.ReactNode; aksi?: React.ReactNode; className?: string }) {
  if (!judul && !meta && !aksi) return null;
  return (
    <header className={cn('u-ak-kepala', className)}>
      <div className="u-ak-kepala-teks">
        {judul && <h3>{judul}</h3>}
        {meta && <p>{meta}</p>}
      </div>
      {aksi && <div className="u-ak-kepala-aksi u-cetak-sembunyi">{aksi}</div>}
    </header>
  );
}

// ================================================================ Angka ringkas
export interface AngkaRingkas {
  label: React.ReactNode;
  nilai: React.ReactNode;
  keterangan?: React.ReactNode;
  nada?: NadaNilai;
}
/** Deret angka utama (IPS, IPK, SKS, …): 4 kolom di desktop, 2 kolom di ponsel, tinggi sama. */
export function DeretAngka({ items, className }: { items: AngkaRingkas[]; className?: string }) {
  return (
    <dl className={cn('u-ak-angka', className)}>
      {items.map((a, i) => (
        <div key={i} data-nada={a.nada}>
          <dt>{a.label}</dt>
          <dd>{a.nilai}</dd>
          {a.keterangan && <small>{a.keterangan}</small>}
        </div>
      ))}
    </dl>
  );
}

// ================================================================ Lencana nilai
export interface LencanaNilaiProps {
  /** Huruf nilai dari SIAKAD (A, B+, …). */
  nilai?: string | null;
  /** Skala nilai dari server; menentukan warna (tidak lulus merah, sisanya menurut bobot). Tanpa skala: netral. */
  skala?: SumberSkala | null;
  /** Tampilkan bobot di samping huruf, mis. "B+ · 3,50". */
  bobot?: boolean;
  className?: string;
}
/** Lencana huruf nilai berwarna menurut skala nilai server (m_nilai), bukan daftar huruf tetap. */
export function LencanaNilai({ nilai, skala, bobot, className }: LencanaNilaiProps) {
  const s = React.useMemo(() => normalSkala(skala), [skala]);
  if (!nilai)
    return (
      <span className={cn('u-ak-nilai', className)} data-kosong="">
        –
      </span>
    );
  const baris = cariSkala(nilai, s);
  return (
    <span className={cn('u-ak-nilai', className)} data-nada={nadaNilai(nilai, s)} title={baris ? `${baris.huruf}: bobot ${baris.bobot.toFixed(2)}${baris.lulus ? '' : ', tidak lulus'}` : undefined}>
      {nilai}
      {bobot && baris && <small>{baris.bobot.toFixed(2)}</small>}
    </span>
  );
}

/** Legenda skala nilai yang berlaku: huruf, rentang angka, bobot, dan tanda tidak lulus. */
export function LegendaSkalaNilai({ skala, judul = 'Skala nilai', className }: { skala?: SumberSkala | null; judul?: React.ReactNode; className?: string }) {
  const s = React.useMemo(() => normalSkala(skala), [skala]);
  if (!s.length) return null;
  return (
    <figure className={cn('u-ak-legenda', className)}>
      {judul && <figcaption>{judul}</figcaption>}
      <ul>
        {s.map((x) => (
          <li key={x.huruf}>
            <LencanaNilai nilai={x.huruf} skala={s} />
            <span>
              {x.max > 0 ? `${fmtAngka(x.min)}–${fmtAngka(x.max)}` : ''}
              <b>{x.bobot.toFixed(2)}</b>
              {!x.lulus && <em>tidak lulus</em>}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
const fmtAngka = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ''));

/** Sebaran huruf nilai (berapa MK tiap huruf) diurut menurut skala server; huruf di luar skala dikumpulkan di akhir. */
export function SebaranNilaiSkala({
  data,
  skala,
  skalaUntuk,
  label = 'Sebaran nilai',
  className,
}: {
  data: ReadonlyArray<BarisNilaiMk>;
  skala?: SumberSkala | null;
  /** Skala per periode MK: warna tiap huruf mengikuti versi skala periode terbaru yang memakai huruf itu. */
  skalaUntuk?: PenentuSkala;
  label?: React.ReactNode;
  className?: string;
}) {
  const s = React.useMemo(() => normalSkala(skala), [skala]);
  const bagian = React.useMemo(() => {
    const hitung = new Map<string, number>();
    const periode = new Map<string, string>();
    for (const m of data) {
      if (m.nilai_ditampilkan === false) continue;
      const h = (m.nilai_huruf ?? '').trim().toUpperCase();
      if (!h) continue;
      hitung.set(h, (hitung.get(h) ?? 0) + 1);
      const t = m.tahun_id ?? '';
      if (!periode.has(h) || t > periode.get(h)!) periode.set(h, t);
    }
    const skalaHuruf = (h: string) => (skalaUntuk ? skalaUntuk(periode.get(h) || null) : s);
    const urut = s.map((x) => x.huruf.toUpperCase()).filter((h) => hitung.has(h));
    const lain = [...hitung.keys()].filter((h) => !urut.includes(h)).sort();
    return [...urut, ...lain].map((h) => {
      const sk = skalaHuruf(h);
      const nada = nadaNilai(h, sk);
      return { label: cariSkala(h, sk)?.huruf ?? h, nilai: hitung.get(h) ?? 0, tone: nada === 'neutral' ? ('muted' as const) : nada };
    });
  }, [data, s, skalaUntuk]);
  if (!bagian.length) return null;
  return <ProgressBertumpuk className={cn('u-ak-sebaran', className)} label={label} bagian={bagian} format={(n) => `${n} MK`} tinggi="sm" />;
}

// ================================================================ Tabel nilai
type BarisTabel = BarisNilaiMk & { __k: string };

export interface TabelNilaiMkProps {
  data: ReadonlyArray<BarisNilaiMk>;
  skala?: ReadonlyArray<SkalaNilai>;
  /** Skala per periode mata kuliah (penentuSkala): tiap baris memakai versi skala periode `tahun_id` barisnya. */
  skalaUntuk?: PenentuSkala;
  /** Tampilkan kolom periode (transkrip satu tabel). */
  periode?: boolean;
  /** Tampilkan kolom semester. */
  semester?: boolean;
  /** Nama berkas ekspor CSV; false = tanpa ekspor. */
  ekspor?: string | false;
  kosong?: React.ReactNode;
  className?: string;
}
/** Tabel nilai mata kuliah (DataTable: urut per kolom, ekspor CSV, kartu di ponsel). */
export function TabelNilaiMk({ data, skala = [], skalaUntuk, periode, semester, ekspor = false, kosong, className }: TabelNilaiMkProps) {
  const skalaBaris = (r: BarisNilaiMk) => (skalaUntuk ? skalaUntuk(r.tahun_id) : skala);
  const baris = React.useMemo<BarisTabel[]>(() => data.map((r, i) => ({ ...r, __k: `${r.kode_mk ?? ''}-${r.tahun_id ?? ''}-${i}` })), [data]);
  const kolom: DataColumn<BarisTabel>[] = [
    { key: 'nama_mk', header: 'Mata kuliah', sortable: true, mobile: 'title', cell: (r) => <span className="u-ak-mk">{r.nama_mk ?? '–'}</span> },
    { key: 'kode_mk', header: 'Kode', sortable: true, width: '7rem', mobile: 'subtitle', cell: (r) => <span className="u-mono">{r.kode_mk ?? '–'}</span> },
    ...(semester
      ? [{ key: 'semester', header: 'Smt', label: 'Semester', align: 'end', sortable: true, width: '4.5rem', value: (r: BarisTabel) => r.semester ?? null, cell: (r: BarisTabel) => r.semester ?? '–' } satisfies DataColumn<BarisTabel>]
      : []),
    ...(periode
      ? [{ key: 'tahun_id', header: 'Periode', sortable: true, width: '9rem', value: (r: BarisTabel) => r.tahun_id ?? '', cell: (r: BarisTabel) => <span className="u-muted">{labelTahunAkademik(r.tahun_id, true)}</span> } satisfies DataColumn<BarisTabel>]
      : []),
    { key: 'sks', header: 'SKS', align: 'end', sortable: true, width: '4.5rem', value: (r) => (adaAngka(r.sks) ? Number(r.sks) : null), cell: (r) => (adaAngka(r.sks) ? Number(r.sks) : '–') },
    {
      key: 'nilai_huruf',
      header: 'Nilai',
      align: 'center',
      sortable: true,
      width: '6.5rem',
      mobile: 'badge',
      // Urut menurut bobot skala, bukan abjad.
      value: (r) => (r.nilai_ditampilkan === false ? null : adaAngka(r.bobot) ? Number(r.bobot) : (cariSkala(r.nilai_huruf, skalaBaris(r))?.bobot ?? null)),
      cell: (r) => (r.nilai_ditampilkan === false ? <span className="u-muted">Belum dirilis</span> : <LencanaNilai nilai={r.nilai_huruf} skala={skalaBaris(r)} />),
    },
    { key: 'bobot', header: 'Bobot', align: 'end', sortable: true, width: '5.5rem', value: (r) => (adaAngka(r.bobot) ? Number(r.bobot) : null), cell: (r) => duaDesimal(r.bobot) },
    { key: 'mutu', header: 'Mutu', align: 'end', sortable: true, width: '5.5rem', value: (r) => (adaAngka(r.mutu) ? Number(r.mutu) : null), cell: (r) => duaDesimal(r.mutu) },
  ];
  return (
    <DataTable
      className={cn('u-ak-tabel', className)}
      columns={kolom}
      rows={baris}
      rowKey={(r) => r.__k}
      pagination={false}
      columnToggle={false}
      densityToggle={false}
      defaultDensity="compact"
      exportCsv={ekspor}
      empty={{ icon: <BookOpen />, title: kosong ?? 'Belum ada mata kuliah' }}
    />
  );
}

// ================================================================ Cetak
/** Kepala versi cetak: kop (bila ada), judul dokumen, identitas pemilik. Hanya tampil saat dicetak. */
export function KepalaCetak({ kop, judul, sub, identitas }: { kop?: React.ReactNode; judul: React.ReactNode; sub?: React.ReactNode; identitas?: IdentitasAkademik | null }) {
  const baris: Array<[string, React.ReactNode]> = identitas
    ? ([
        ['Nama', identitas.nama],
        ['NIM', identitas.nim],
        ['Program studi', [identitas.jenjang, identitas.prodi].filter(Boolean).join(' ')],
        ['Fakultas', identitas.fakultas],
        ['Angkatan', identitas.angkatan],
        ['Dosen PA', identitas.dosenPa],
      ].filter(([, v]) => v != null && v !== '') as Array<[string, React.ReactNode]>)
    : [];
  return (
    <div className="u-ak-cetak-kepala">
      {kop && <div className="u-ak-cetak-kop">{kop}</div>}
      <h2>{judul}</h2>
      {sub && <p className="u-ak-cetak-sub">{sub}</p>}
      {baris.length > 0 && (
        <dl className="u-ak-cetak-identitas">
          {baris.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** Tabel nilai untuk kertas (A4): hitam-putih, tanpa kartu ponsel, kepala berulang di tiap halaman. */
export function TabelNilaiCetak({ data, semester, periode }: { data: ReadonlyArray<BarisNilaiMk>; semester?: boolean; periode?: boolean }) {
  return (
    // unipo-ui-izinkan tabel-bawaan: tata letak cetak KHS/transkrip (layar memakai DataTable)
    <table className="u-ak-cetak-tabel">
      <thead>
        <tr>
          <th>No</th>
          <th>Kode</th>
          <th>Mata kuliah</th>
          {semester && <th>Smt</th>}
          {periode && <th>Periode</th>}
          <th>SKS</th>
          <th>Nilai</th>
          <th>Bobot</th>
          <th>Mutu</th>
        </tr>
      </thead>
      <tbody>
        {data.map((r, i) => (
          <tr key={`${r.kode_mk}-${r.tahun_id ?? ''}-${i}`}>
            <td>{i + 1}</td>
            <td>{r.kode_mk}</td>
            <td>{r.nama_mk}</td>
            {semester && <td>{r.semester ?? ''}</td>}
            {periode && <td>{labelTahunAkademik(r.tahun_id, true)}</td>}
            <td>{adaAngka(r.sks) ? Number(r.sks) : ''}</td>
            <td>{r.nilai_ditampilkan === false ? '' : (r.nilai_huruf ?? '')}</td>
            <td>{adaAngka(r.bobot) ? duaDesimal(r.bobot) : ''}</td>
            <td>{adaAngka(r.mutu) ? duaDesimal(r.mutu) : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Catatan kaki versi cetak: tanggal cetak dan penegasan bahwa dokumen resmi ber-QR diterbitkan lewat Dokumen terbit. */
export function KakiCetak({ catatan }: { catatan?: React.ReactNode }) {
  return (
    <p className="u-ak-cetak-kaki">
      {catatan ?? 'Salinan cetak dari sistem akademik, bukan dokumen resmi. Dokumen resmi ber-QR diterbitkan lewat menu Dokumen terbit.'} Dicetak{' '}
      {formatDate(new Date(), 'long')}.
    </p>
  );
}

/** Tombol cetak yang mencetak hanya `target` (komponen dokumen akademik), bukan seluruh halaman. */
export function TombolCetakAkademik({ target, label = 'Cetak' }: { target: React.RefObject<HTMLElement | null>; label?: React.ReactNode }) {
  return <TombolCetak target={target} label={label} size="sm" />;
}
