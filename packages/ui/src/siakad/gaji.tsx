'use client';
import * as React from 'react';
import { AlertTriangle, BadgeCheck, CalendarClock, ChevronLeft, FileText, Landmark, Receipt, ShieldCheck, Users, Wallet } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatDate, formatRupiah, formatRupiahRingkas, terbilang } from '../lib/format';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Empty } from '../components/display';
import { Select } from '../components/select';
import { BarChart, BarList, DashboardGrid, DonutChart, Panel } from '../components/charts';
import { KepalaCetak, KerangkaLaporan, StatistikRingkas, TabelLaporan, TabelRekap, TandaTanganLaporan, TombolCetak, rekapKeCsv, tabelLaporanKeCsv, type BarisLaporan, type ItemStatistik, type KolomRekap, type Penandatangan } from '../components/laporan';
import { GalatApi } from './galat';
import { KodeQrSiakad } from './qr';
import { useSiakadQuery } from './provider';
import { SegmentedControl } from '../components/forms';
import { Tekan } from '../components/tekan';

/*
 * Payroll gaji dosen dan tendik (/v1/gaji). Hak (gaji pokok, tunjangan, honor) ditetapkan SDM berdasarkan SK;
 * BAUK menghitung, menyetujui, dan membayar. Komponen di sini dipakai aplikasi BAUK (pengelola), aplikasi SDM
 * (admin SDM membaca laporan), dan portal pegawai (slip milik sendiri).
 */

const P = '/v1/gaji';

// ================================================================ Tipe
export type JenisPegawaiGaji = 'dosen' | 'tendik';
export type JenisPeriodeGaji = 'reguler' | 'thr' | 'gaji13' | 'susulan';
export type StatusPeriodeGaji = 'draf' | 'dihitung' | 'diajukan' | 'disetujui' | 'dibayar' | 'ditutup' | 'batal';

export interface PeriodeGajiRingkas {
  id: number;
  kode: string;
  judul: string;
  jenis: JenisPeriodeGaji;
  tahun: number;
  bulan: number;
  status: StatusPeriodeGaji;
  tanggal_bayar: string | null;
  hari_kerja: number | null;
  disetujui_oleh: string | null;
  disetujui_at: string | null;
  dibayar_at: string | null;
  jurnal_beban_id: number | null;
  jurnal_bayar_id: number | null;
}

export interface JumlahGaji {
  pegawai: number;
  pendapatan: number;
  potongan: number;
  pph21: number;
  bpjs_pegawai: number;
  bpjs_perusahaan: number;
  netto: number;
  beban: number;
}

export interface SlipGajiRingkas {
  slip_id: number;
  nomor: string;
  pegawai_id: number;
  nama: string;
  nip: string | null;
  nidn: string | null;
  jenis: JenisPegawaiGaji;
  kategori: string | null;
  unit_id: number | null;
  unit: string | null;
  golongan: string | null;
  jabatan: string | null;
  status_ptkp: string | null;
  pendapatan: number;
  potongan: number;
  pph21: number;
  bpjs_pegawai: number;
  bpjs_perusahaan: number;
  netto: number;
  beban: number;
  status: 'normal' | 'ditahan';
  dibayar: boolean;
  dibayar_at: string | null;
  bank: string | null;
  no_rekening: string | null;
  peringatan: string[];
}

export interface RekapGajiData {
  periode: PeriodeGajiRingkas;
  ringkas: JumlahGaji;
  per_unit: Array<JumlahGaji & { unit_id: number | null; unit: string }>;
  per_jenis: Array<JumlahGaji & { jenis: JenisPegawaiGaji }>;
  per_komponen: Array<{ kode: string; nama: string; jenis: 'pendapatan' | 'potongan' | 'pajak' | 'perusahaan'; kelompok: string | null; nominal: number; pegawai: number; urutan: number }>;
  pegawai: SlipGajiRingkas[];
}

export interface StatistikGajiData {
  tahun: number;
  ringkas: Omit<JumlahGaji, 'pegawai'> & { pegawai: number; beban_tahun_lalu: number; pegawai_berprofil: number; tanpa_rekening: number; tanpa_profil: number };
  bulanan: Array<JumlahGaji & { bulan: number }>;
  per_unit: Array<{ unit_id: number | null; unit: string; pegawai: number; pendapatan: number; netto: number; beban: number }>;
  per_jenis: Array<{ jenis: JenisPegawaiGaji; pegawai: number; pendapatan: number; netto: number; beban: number }>;
  komposisi: Array<{ jenis: string; kelompok: string | null; nominal: number }>;
  rata_per_golongan: Array<{ jenis: JenisPegawaiGaji; golongan: string; slip: number; netto: number; pendapatan: number }>;
  periode: Array<{ id: number; kode: string; judul: string; jenis: JenisPeriodeGaji; status: StatusPeriodeGaji; jumlah_pegawai: number; pendapatan: number; pph21: number; netto: number; beban: number }>;
}

export interface RinciSlipGaji {
  id: number;
  komponen_id: number | null;
  kode: string;
  nama: string;
  jenis: 'pendapatan' | 'potongan' | 'pajak' | 'perusahaan';
  kelompok: string | null;
  volume: number | null;
  tarif: number | null;
  dasar: number | null;
  nominal: number;
  kena_pajak: boolean;
  sumber: string | null;
  keterangan: string | null;
}

export interface SlipGajiLengkap {
  id: number;
  nomor: string;
  periode_id: number;
  pegawai_id: number;
  nama: string;
  nip: string | null;
  nidn: string | null;
  jenis: JenisPegawaiGaji;
  kategori: string | null;
  status_kepegawaian: string | null;
  unit: string | null;
  golongan: string | null;
  jabatan: string | null;
  status_ptkp: string | null;
  kategori_ter: string | null;
  jenis_pajak: string | null;
  metode_pajak: string | null;
  npwp: string | null;
  bank: string | null;
  no_rekening: string | null;
  atas_nama: string | null;
  hari_kerja: number;
  hari_hadir: number;
  hari_tidak_hadir: number;
  menit_terlambat: number;
  pendapatan: number;
  potongan: number;
  bruto_pajak: number;
  tarif_pajak: number;
  pph21: number;
  bpjs_pegawai: number;
  bpjs_perusahaan: number;
  netto: number;
  beban: number;
  status: 'normal' | 'ditahan';
  dibayar_at: string | null;
  kode_verifikasi: string;
  peringatan?: string[];
  catatan?: string | null;
  periode: PeriodeGajiRingkas | null;
  rinci: RinciSlipGaji[];
  url_verifikasi: string;
}

export interface SlipSayaRingkas {
  id: number;
  nomor: string;
  kode: string;
  judul: string;
  jenis_periode: JenisPeriodeGaji;
  tahun: number;
  bulan: number;
  status_periode: StatusPeriodeGaji;
  tanggal_bayar: string | null;
  pendapatan: number;
  potongan: number;
  pph21: number;
  netto: number;
  status: 'normal' | 'ditahan';
  dibayar_at: string | null;
}

export interface GajiSayaData {
  pegawai: { id: number; nama: string; nip: string | null; jenis: JenisPegawaiGaji };
  profil: { bank: string | null; no_rekening: string | null; atas_nama: string | null; status_ptkp: string | null; jenis_pajak: string | null; aktif: number } | null;
  slip: SlipSayaRingkas[];
}

export interface PajakSetahunData {
  tahun: number;
  status_ptkp: string;
  perhitungan: { bruto: number; biaya_jabatan: number; iuran: number; neto: number; ptkp: number; pkp: number; pph: number };
  pph_dipotong: number;
  sebelum_payroll: { jumlah_bulan: number; bruto: number; iuran: number; pph: number } | null;
  masa: Array<{ bulan: number; kode: string; bruto: number; iuran: number; pph21: number }>;
}

export interface VerifikasiSlipData {
  sah: boolean;
  nomor: string;
  nama: string;
  nip: string | null;
  jenis: JenisPegawaiGaji;
  periode: string;
  status: string;
  penerbit: string;
}

export interface FilterGaji {
  /** ID atau kode periode (mis. "2026-11"). Kosong: periode reguler terakhir pada tahun/bulan. */
  periode?: string | number | null;
  tahun?: number;
  bulan?: number;
  unit_id?: number | null;
  jenis?: JenisPegawaiGaji | null;
}

// ================================================================ Label
export const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const LABEL_STATUS_PERIODE_GAJI: Record<StatusPeriodeGaji, string> = {
  draf: 'Draf',
  dihitung: 'Dihitung',
  diajukan: 'Diajukan',
  disetujui: 'Disetujui',
  dibayar: 'Dibayar',
  ditutup: 'Ditutup',
  batal: 'Batal',
};
const NADA_STATUS: Record<StatusPeriodeGaji, 'neutral' | 'info' | 'warning' | 'primary' | 'success' | 'danger'> = {
  draf: 'neutral',
  dihitung: 'info',
  diajukan: 'warning',
  disetujui: 'primary',
  dibayar: 'success',
  ditutup: 'neutral',
  batal: 'danger',
};
export const LABEL_JENIS_PERIODE_GAJI: Record<JenisPeriodeGaji, string> = { reguler: 'Gaji bulanan', thr: 'THR', gaji13: 'Gaji ke-13', susulan: 'Susulan' };
const LABEL_KELOMPOK: Record<string, string> = {
  gaji_pokok: 'Gaji pokok',
  tunjangan_tetap: 'Tunjangan tetap',
  tunjangan_tidak_tetap: 'Tunjangan tidak tetap',
  honor: 'Honor',
  lembur: 'Lembur',
  thr_bonus: 'THR dan bonus',
  bpjs: 'BPJS',
  iuran: 'Iuran',
  pinjaman: 'Pinjaman',
  potongan_lain: 'Potongan lain',
  lainnya: 'Lainnya',
};
const LABEL_JENIS_PAJAK: Record<string, string> = { pegawai_tetap: 'Pegawai tetap', pegawai_tidak_tetap: 'Pegawai tidak tetap', bukan_pegawai: 'Bukan pegawai' };

/** Lencana status periode payroll. */
export function StatusPeriodeGajiBadge({ status }: { status: StatusPeriodeGaji }) {
  return (
    <Badge variant={NADA_STATUS[status]} dot>
      {LABEL_STATUS_PERIODE_GAJI[status]}
    </Badge>
  );
}

const jenisPegawai = (j: string) => (j === 'dosen' ? 'Dosen' : j === 'tendik' ? 'Tendik' : j);
const kueri = (f: FilterGaji) => {
  const q: Record<string, string | number> = {};
  if (f.periode != null && f.periode !== '') q.periode_id = f.periode;
  if (f.tahun) q.tahun = f.tahun;
  if (f.bulan) q.bulan = f.bulan;
  if (f.unit_id) q.unit_id = f.unit_id;
  if (f.jenis) q.jenis = f.jenis;
  return q;
};

// ================================================================ Hooks
export function useRekapGaji(f: FilterGaji, opts: { enabled?: boolean } = {}) {
  const q = kueri(f);
  return useSiakadQuery<RekapGajiData>(['gaji', 'rekap', q], (s, signal) => s.request({ method: 'GET', path: `${P}/laporan/rekap`, query: q }, { signal }), opts);
}
export function useStatistikGaji(tahun: number, f: Pick<FilterGaji, 'unit_id' | 'jenis'> = {}) {
  const q = kueri({ ...f, tahun });
  return useSiakadQuery<StatistikGajiData>(['gaji', 'statistik', q], (s, signal) => s.request({ method: 'GET', path: `${P}/statistik`, query: q }, { signal }));
}
/** Slip lengkap. `saya` = slip milik pegawai yang login (/saya/{id}); selain itu untuk pengelola (/slip/{id}/lengkap). */
export function useSlipGaji(id: number | string | null | undefined, saya = false) {
  return useSiakadQuery<SlipGajiLengkap>(['gaji', 'slip', saya, id], (s, signal) => s.request({ method: 'GET', path: saya ? `${P}/saya/${id}` : `${P}/slip/${id}/lengkap` }, { signal }), { enabled: id != null && id !== '' });
}
export function useGajiSaya(tahun?: number | null) {
  const q = tahun ? { tahun } : {};
  return useSiakadQuery<GajiSayaData>(['gaji', 'saya', q], (s, signal) => s.request({ method: 'GET', path: `${P}/saya`, query: q }, { signal }));
}
export function usePajakGajiSaya(tahun: number) {
  return useSiakadQuery<PajakSetahunData>(['gaji', 'saya-pajak', tahun], (s, signal) => s.request({ method: 'GET', path: `${P}/saya/pajak`, query: { tahun } }, { signal }));
}
export function useVerifikasiSlipGaji(kode: string | null | undefined) {
  return useSiakadQuery<VerifikasiSlipData>(['gaji', 'verifikasi', kode], (s, signal) => s.request({ method: 'GET', path: `${P}/verifikasi/${kode}` }, { signal }), { enabled: !!kode });
}

// ================================================================ Pemilih
/** Pilihan tahun (tahun ini mundur `jumlah` tahun). */
function opsiTahun(jumlah = 6) {
  const y = new Date().getFullYear();
  return Array.from({ length: jumlah }, (_, i) => ({ value: y - i, label: String(y - i) }));
}

export interface PilihPeriodeGajiProps {
  tahun: number;
  onTahun: (t: number) => void;
  /** Kode periode terpilih (null = reguler terakhir). */
  periode: string | null;
  onPeriode: (kode: string | null) => void;
  jenis?: JenisPegawaiGaji | null;
  onJenis?: (j: JenisPegawaiGaji | null) => void;
  /** Hanya periode terbit (disetujui, dibayar, ditutup). Bawaan true untuk pembaca laporan. */
  hanyaTerbit?: boolean;
  className?: string;
}

/** Pemilih tahun, periode payroll (dari statistik tahun itu), dan jenis pegawai. */
export function PilihPeriodeGaji({ tahun, onTahun, periode, onPeriode, jenis, onJenis, hanyaTerbit = false, className }: PilihPeriodeGajiProps) {
  const st = useStatistikGaji(tahun);
  const daftar = (st.data?.periode ?? []).filter((p) => p.status !== 'batal' && (!hanyaTerbit || ['disetujui', 'dibayar', 'ditutup'].includes(p.status)));
  return (
    <div className={cn('u-gaji-pilih', className)}>
      <Select<number> size="sm" aria-label="Tahun" value={tahun} options={opsiTahun()} onValueChange={(t) => t && onTahun(t)} />
      <Select<string>
        size="sm"
        aria-label="Periode payroll"
        placeholder={st.loading ? 'Memuat periode…' : 'Gaji bulanan terakhir'}
        value={periode}
        options={daftar.map((p) => ({ value: p.kode, label: `${p.judul}${p.status !== 'ditutup' && p.status !== 'dibayar' ? ` (${LABEL_STATUS_PERIODE_GAJI[p.status].toLowerCase()})` : ''}` }))}
        onValueChange={(k) => onPeriode(k)}
      />
      {onJenis && (
        <Select<string>
          size="sm"
          aria-label="Jenis pegawai"
          value={jenis ?? 'semua'}
          options={[
            { value: 'semua', label: 'Dosen dan tendik' },
            { value: 'dosen', label: 'Dosen' },
            { value: 'tendik', label: 'Tendik' },
          ]}
          onValueChange={(j) => onJenis((j && j !== 'semua' ? j : null) as JenisPegawaiGaji | null)}
        />
      )}
    </div>
  );
}

// ================================================================ Rekap periode
export interface RekapGajiProps {
  /** Filter awal. */
  filter?: FilterGaji;
  /** Klik baris pegawai (mis. buka SlipGaji). */
  onPilihSlip?: (slipId: number) => void;
  /** Tampilkan kolom rekening dan status bayar (pengelola BAUK). Admin SDM cukup tanpa rekening. */
  denganRekening?: boolean;
  penandatangan?: Penandatangan[];
  unit?: React.ReactNode;
  logo?: React.ReactNode;
  className?: string;
}

/**
 * Rekap payroll satu periode: ringkasan, per jenis pegawai, per unit, per komponen, dan daftar pegawai.
 * Dipakai BAUK dan aplikasi SDM (admin SDM membaca). Cetak/PDF dan CSV bawaan.
 */
export function RekapGaji({ filter, onPilihSlip, denganRekening, penandatangan, unit = 'Biro Administrasi Umum dan Keuangan', logo, className }: RekapGajiProps) {
  const [tahun, setTahun] = React.useState(filter?.tahun ?? new Date().getFullYear());
  const [periode, setPeriode] = React.useState<string | null>(filter?.periode != null ? String(filter.periode) : null);
  const [jenis, setJenis] = React.useState<JenisPegawaiGaji | null>(filter?.jenis ?? null);
  const [tab, setTab] = React.useState<'pegawai' | 'unit' | 'komponen'>('pegawai');
  const q = useRekapGaji({ periode, tahun: periode ? undefined : tahun, bulan: periode ? undefined : filter?.bulan, unit_id: filter?.unit_id, jenis });
  const d = q.data;

  const kolomPegawai: KolomRekap<SlipGajiRingkas>[] = [
    { key: 'nama', label: 'Pegawai', nilai: (b) => b.nama, format: 'teks' },
    { key: 'nip', label: 'NIP', nilai: (b) => b.nip ?? '', format: 'teks' },
    { key: 'jenis', label: 'Jenis', nilai: (b) => jenisPegawai(b.jenis), format: 'teks' },
    { key: 'unit', label: 'Unit', nilai: (b) => b.unit ?? '', format: 'teks' },
    { key: 'pendapatan', label: 'Pendapatan', nilai: (b) => b.pendapatan, format: 'akuntansi', total: true },
    { key: 'potongan', label: 'Potongan', nilai: (b) => b.potongan, format: 'akuntansi', total: true },
    { key: 'pph21', label: 'PPh 21', nilai: (b) => b.pph21, format: 'akuntansi', total: true },
    { key: 'netto', label: 'Diterima', nilai: (b) => b.netto, format: 'akuntansi', total: true },
    ...(denganRekening
      ? ([
          { key: 'rek', label: 'Rekening', nilai: (b) => (b.no_rekening ? `${b.bank ?? ''} ${b.no_rekening}`.trim() : 'Belum ada'), format: 'teks' },
          { key: 'st', label: 'Status', nilai: (b) => (b.status === 'ditahan' ? 'Ditahan' : b.dibayar ? 'Dibayar' : 'Belum dibayar'), format: 'teks' },
        ] as KolomRekap<SlipGajiRingkas>[])
      : []),
  ];
  const kolomUnit: KolomRekap<RekapGajiData['per_unit'][number]>[] = [
    { key: 'unit', label: 'Unit', nilai: (b) => b.unit, format: 'teks' },
    { key: 'pegawai', label: 'Pegawai', nilai: (b) => b.pegawai, total: true },
    { key: 'pendapatan', label: 'Pendapatan', nilai: (b) => b.pendapatan, format: 'akuntansi', total: true },
    { key: 'pph21', label: 'PPh 21', nilai: (b) => b.pph21, format: 'akuntansi', total: true },
    { key: 'netto', label: 'Diterima', nilai: (b) => b.netto, format: 'akuntansi', total: true },
    { key: 'beban', label: 'Beban universitas', nilai: (b) => b.beban, format: 'akuntansi', batang: true, total: true },
  ];
  const barisKomponen = React.useMemo<BarisLaporan[]>(() => {
    if (!d) return [];
    const grup: Array<[string, string]> = [
      ['pendapatan', 'Pendapatan'],
      ['potongan', 'Potongan'],
      ['pajak', 'Pajak'],
      ['perusahaan', 'Iuran ditanggung universitas'],
    ];
    const out: BarisLaporan[] = [];
    for (const [j, label] of grup) {
      const rows = d.per_komponen.filter((k) => k.jenis === j);
      if (!rows.length) continue;
      out.push({ jenis: 'grup', label });
      rows.forEach((k) => out.push({ label: k.nama, kode: k.kode, nilai: [k.pegawai, k.nominal], tingkat: 1 }));
      out.push({ jenis: 'subtotal', label: `Jumlah ${label.toLowerCase()}`, nilai: [null, rows.reduce((s, k) => s + k.nominal, 0)], tingkat: 1 });
    }
    out.push({ jenis: 'total', label: 'Diterima pegawai (netto)', nilai: [d.ringkas.pegawai, d.ringkas.netto] });
    return out;
  }, [d]);
  const kolomKomponen = [
    { label: 'Pegawai', format: 'angka' as const, lebar: 90 },
    { label: 'Jumlah', format: 'akuntansi' as const, lebar: 160 },
  ];

  const ringkas: ItemStatistik[] = d
    ? [
        { label: 'Pegawai', nilai: d.ringkas.pegawai, ikon: <Users />, keterangan: d.per_jenis.map((j) => `${jenisPegawai(j.jenis)} ${j.pegawai}`).join(' · ') },
        { label: 'Total pendapatan', nilai: d.ringkas.pendapatan, format: 'rupiah-ringkas', ikon: <Wallet /> },
        { label: 'PPh 21 dipotong', nilai: d.ringkas.pph21, format: 'rupiah-ringkas', ikon: <Landmark /> },
        { label: 'Diterima pegawai', nilai: d.ringkas.netto, format: 'rupiah-ringkas', ikon: <Receipt />, nada: 'success' },
        { label: 'Beban universitas', nilai: d.ringkas.beban, format: 'rupiah-ringkas', keterangan: `termasuk iuran BPJS ${formatRupiahRingkas(d.ringkas.bpjs_perusahaan)}` },
      ]
    : [];
  const peringatan = d ? d.pegawai.filter((p) => p.peringatan.length) : [];

  const csv = () => {
    if (!d) return { kolom: [], baris: [] };
    if (tab === 'unit') return rekapKeCsv(kolomUnit, d.per_unit);
    if (tab === 'komponen') return tabelLaporanKeCsv(kolomKomponen, barisKomponen, { denganKode: true, labelKolom: 'Komponen' });
    return rekapKeCsv(kolomPegawai, d.pegawai);
  };

  return (
    <KerangkaLaporan
      className={cn('u-gaji-rekap', className)}
      judul={d ? `Rekap ${d.periode.judul}` : 'Rekap payroll'}
      unit={unit}
      logo={logo}
      periode={d ? `${LABEL_JENIS_PERIODE_GAJI[d.periode.jenis]} · ${d.periode.kode}${jenis ? ` · ${jenisPegawai(jenis)}` : ''}` : undefined}
      deskripsi="Gaji pokok dan tunjangan mengikuti SK di SDM; BAUK menghitung potongan, pajak, dan pembayaran."
      lencana={d ? <StatusPeriodeGajiBadge status={d.periode.status} /> : undefined}
      filter={<PilihPeriodeGaji tahun={tahun} onTahun={(t) => (setTahun(t), setPeriode(null))} periode={periode} onPeriode={setPeriode} jenis={jenis} onJenis={setJenis} />}
      csv={{ namaFile: `rekap-gaji-${d?.periode.kode ?? tahun}-${tab}`, data: csv }}
      loading={q.loading && !d}
      penandatangan={penandatangan}
      catatan={d ? <p>Beban universitas = pendapatan pegawai + iuran BPJS yang ditanggung universitas. Diterima = pendapatan − potongan − PPh 21.</p> : undefined}
    >
      {q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} variant={(q.error as { status?: number }).status === 404 ? 'warning' : 'danger'} title={(q.error as { status?: number }).status === 404 ? 'Belum ada payroll' : undefined} />
      ) : d ? (
        <div className="u-gaji-isi">
          <StatistikRingkas items={ringkas} min={170} />
          {peringatan.length > 0 && (
            <Alert variant="warning" title={`${peringatan.length} pegawai perlu diperiksa`} className="u-cetak-sembunyi">
              <ul className="u-gaji-peringatan">
                {peringatan.slice(0, 5).map((p) => (
                  <li key={p.slip_id}>
                    <strong>{p.nama}</strong>: {p.peringatan.join('; ')}
                  </li>
                ))}
                {peringatan.length > 5 && <li>dan {peringatan.length - 5} pegawai lain (lihat kolom peringatan di slip).</li>}
              </ul>
            </Alert>
          )}
          <SegmentedControl<typeof tab>
            className="u-gaji-tab u-cetak-sembunyi"
            aria-label="Tampilan rekap"
            value={tab}
            onValueChange={setTab}
            options={[
              { value: 'pegawai', label: `Per pegawai (${d.pegawai.length})` },
              { value: 'unit', label: `Per unit (${d.per_unit.length})` },
              { value: 'komponen', label: 'Per komponen' },
            ]}
          />
          {tab === 'pegawai' && <TabelRekap kolom={kolomPegawai} baris={d.pegawai} kunci={(b) => String(b.slip_id)} onPilih={onPilihSlip ? (b) => onPilihSlip(b.slip_id) : undefined} kosong="Belum ada slip pada periode ini." />}
          {tab === 'unit' && <TabelRekap kolom={kolomUnit} baris={d.per_unit} kunci={(b) => String(b.unit_id ?? 0)} />}
          {tab === 'komponen' && <TabelLaporan kolom={kolomKomponen} baris={barisKomponen} denganKode labelKolom="Komponen" />}
        </div>
      ) : null}
    </KerangkaLaporan>
  );
}

// ================================================================ Slip
export interface SlipGajiProps {
  /** ID slip; atau berikan `data` langsung. */
  id?: number | string | null;
  data?: SlipGajiLengkap;
  /** Slip milik pegawai yang login. */
  saya?: boolean;
  /**
   * Alamat halaman verifikasi publik untuk QR. Bawaan: `{origin}/verifikasi/slip/{kode}` pada aplikasi yang menampilkan;
   * halaman itu cukup memasang <VerifikasiSlipGaji kode=… />.
   */
  tautanVerifikasi?: (kode: string) => string;
  /** Tampilkan iuran yang ditanggung universitas (bawaan tampil). */
  denganIuranUniversitas?: boolean;
  penandatangan?: Penandatangan[];
  logo?: React.ReactNode;
  onKembali?: () => void;
  className?: string;
}

const tautanBawaan = (kode: string) => (typeof window === 'undefined' ? `/verifikasi/slip/${kode}` : `${window.location.origin}/verifikasi/slip/${kode}`);

function rincianDasar(r: RinciSlipGaji): string | null {
  if (r.volume != null && r.tarif != null && r.volume > 0) return `${r.volume} × ${formatRupiah(r.tarif)}`;
  if (r.dasar != null && r.tarif != null && r.dasar > 0) return `${r.tarif}% × ${formatRupiah(r.dasar)}`;
  return r.keterangan;
}

/** Slip gaji siap cetak: identitas, kehadiran, pendapatan, potongan, PPh 21, iuran universitas, terbilang, QR verifikasi. */
export function SlipGaji({ id, data, saya, tautanVerifikasi = tautanBawaan, denganIuranUniversitas = true, penandatangan, logo, onKembali, className }: SlipGajiProps) {
  const q = useSlipGaji(data ? null : id, saya);
  const s = data ?? q.data;
  if (!s) {
    if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
    return <Skeleton style={{ height: 520, width: '100%' }} />;
  }
  const pendapatan = s.rinci.filter((r) => r.jenis === 'pendapatan');
  const potongan = s.rinci.filter((r) => r.jenis === 'potongan' || r.jenis === 'pajak');
  const perusahaan = s.rinci.filter((r) => r.jenis === 'perusahaan');
  const totalPotongan = s.potongan + s.pph21;
  const per = s.periode;
  const terbit = per ? ['disetujui', 'dibayar', 'ditutup'].includes(per.status) : false;
  const tautan = tautanVerifikasi(s.kode_verifikasi);
  const baris = (r: RinciSlipGaji) => {
    const dasar = rincianDasar(r);
    return (
      <li key={r.id}>
        <span>
          {r.nama}
          {dasar && <small>{dasar}</small>}
        </span>
        <span className="u-gaji-slip-angka">{formatRupiah(r.nominal)}</span>
      </li>
    );
  };

  return (
    <section className={cn('u-laporan u-gaji-slip', className)} data-terbit={terbit ? '' : undefined}>
      <header className="u-laporan-kepala u-cetak-sembunyi">
        <div className="u-laporan-judul">
          <h2>
            {onKembali && (
              <Button variant="ghost" size="sm" iconOnly aria-label="Kembali" onClick={onKembali}>
                <ChevronLeft />
              </Button>
            )}
            Slip gaji {per?.judul ?? ''} {per && <StatusPeriodeGajiBadge status={per.status} />}
          </h2>
          <p>
            {s.nomor}
            {s.status === 'ditahan' && ' · pembayaran ditahan'}
            {s.dibayar_at && ` · dibayar ${formatDate(s.dibayar_at, 'long')}`}
          </p>
        </div>
        <div className="u-laporan-aksi">
          <TombolCetak size="sm" />
        </div>
      </header>
      <KepalaCetak tampil unit="Biro Administrasi Umum dan Keuangan" judul={`SLIP ${(per ? LABEL_JENIS_PERIODE_GAJI[per.jenis] : 'GAJI').toUpperCase()} ${per ? `${NAMA_BULAN[per.bulan - 1]?.toUpperCase()} ${per.tahun}` : ''}`} sub={`Nomor ${s.nomor}`} logo={logo} tanpaWaktu />
      {!terbit && <Alert variant="info" title="Belum terbit" className="u-cetak-sembunyi">Slip ini masih dalam proses dan dapat berubah sampai payroll disetujui.</Alert>}
      {s.peringatan && s.peringatan.length > 0 && (
        <Alert variant="warning" title="Perlu diperiksa" icon={<AlertTriangle />} className="u-cetak-sembunyi">
          <ul className="u-gaji-peringatan">
            {s.peringatan.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </Alert>
      )}

      <dl className="u-gaji-slip-identitas">
        <div>
          <dt>Nama</dt>
          <dd>{s.nama}</dd>
        </div>
        <div>
          <dt>{s.jenis === 'dosen' && s.nidn ? 'NIP / NIDN' : 'NIP'}</dt>
          <dd>{[s.nip, s.jenis === 'dosen' ? s.nidn : null].filter(Boolean).join(' / ') || '–'}</dd>
        </div>
        <div>
          <dt>Jabatan</dt>
          <dd>{s.jabatan || jenisPegawai(s.jenis)}</dd>
        </div>
        <div>
          <dt>Golongan</dt>
          <dd>{s.golongan || '–'}</dd>
        </div>
        <div>
          <dt>Unit</dt>
          <dd>{s.unit || '–'}</dd>
        </div>
        <div>
          <dt>Status pajak</dt>
          <dd>
            {s.status_ptkp ?? '–'}
            {s.jenis_pajak ? ` · ${LABEL_JENIS_PAJAK[s.jenis_pajak] ?? s.jenis_pajak}` : ''}
            {s.npwp ? '' : ' · tanpa NPWP'}
          </dd>
        </div>
        {s.hari_kerja > 0 && (
          <div>
            <dt>Kehadiran</dt>
            <dd>
              {s.hari_hadir}/{s.hari_kerja} hari{s.hari_tidak_hadir ? `, ${s.hari_tidak_hadir} alpa` : ''}
              {s.menit_terlambat ? `, terlambat ${s.menit_terlambat} menit` : ''}
            </dd>
          </div>
        )}
        <div>
          <dt>Dibayar ke</dt>
          <dd>{s.no_rekening ? `${s.bank ?? ''} ${s.no_rekening}${s.atas_nama && s.atas_nama !== s.nama ? ` a.n. ${s.atas_nama}` : ''}` : 'Rekening belum diisi'}</dd>
        </div>
      </dl>

      <div className="u-gaji-slip-kolom">
        <div className="u-gaji-slip-bagian">
          <h3>Pendapatan</h3>
          <ul>{pendapatan.map(baris)}</ul>
          <p className="u-gaji-slip-jumlah">
            <span>Jumlah pendapatan</span>
            <span className="u-gaji-slip-angka">{formatRupiah(s.pendapatan)}</span>
          </p>
        </div>
        <div className="u-gaji-slip-bagian">
          <h3>Potongan</h3>
          {potongan.length ? <ul>{potongan.map(baris)}</ul> : <p className="u-gaji-slip-kosong">Tidak ada potongan.</p>}
          <p className="u-gaji-slip-jumlah">
            <span>Jumlah potongan</span>
            <span className="u-gaji-slip-angka">{formatRupiah(totalPotongan)}</span>
          </p>
        </div>
      </div>

      <div className="u-gaji-slip-netto">
        <div>
          <span>Diterima</span>
          <strong>{formatRupiah(s.netto)}</strong>
          <em>{terbilang(s.netto)}</em>
        </div>
      </div>

      {denganIuranUniversitas && perusahaan.length > 0 && (
        <div className="u-gaji-slip-bagian" data-info="">
          <h3>Ditanggung universitas (tidak dipotong dari gaji)</h3>
          <ul>{perusahaan.map(baris)}</ul>
        </div>
      )}

      <footer className="u-gaji-slip-kaki">
        <div className="u-gaji-slip-qr">
          {terbit ? <KodeQrSiakad nilai={tautan} ukuran={88} label={`Verifikasi slip ${s.nomor}`} /> : <div className="u-gaji-slip-qr-kosong">QR terbit setelah disetujui</div>}
          <small>
            Periksa keaslian: pindai QR atau buka {tautan.replace(/^https?:\/\//, '')}
            <br />
            Kode {s.kode_verifikasi}
          </small>
        </div>
        <p className="u-gaji-slip-pajak">
          Bruto PPh 21 {formatRupiah(s.bruto_pajak)}
          {s.tarif_pajak > 0 ? ` · tarif ${s.tarif_pajak}%` : ''}
          {s.kategori_ter ? ` · TER ${s.kategori_ter}` : ''}
          {s.metode_pajak === 'gross_up' ? ' · ditanggung universitas (gross-up)' : ''}
        </p>
      </footer>
      {penandatangan && <TandaTanganLaporan penandatangan={penandatangan} />}
    </section>
  );
}

// ================================================================ Slip saya
export interface DaftarSlipSayaProps {
  tautanVerifikasi?: (kode: string) => string;
  /** Buka slip lewat rute aplikasi (mis. navigate(`/gaji/${id}`)). Tanpa ini, slip tampil di tempat dengan tombol kembali. */
  onPilih?: (id: number) => void;
  logo?: React.ReactNode;
  className?: string;
}

/**
 * Halaman "Gaji saya" untuk pegawai: daftar slip per tahun, rincian slip (cetak), dan ringkasan PPh 21 setahun
 * (dasar bukti potong 1721-A1). Hanya periode yang sudah disetujui.
 */
export function DaftarSlipSaya({ tautanVerifikasi, onPilih, logo, className }: DaftarSlipSayaProps) {
  const [tahun, setTahun] = React.useState(new Date().getFullYear());
  const [pilihSendiri, setPilihSendiri] = React.useState<number | null>(null);
  const pilih = onPilih ? null : pilihSendiri;
  const setPilih = (id: number | null) => (onPilih && id != null ? onPilih(id) : setPilihSendiri(id));
  const [lihat, setLihat] = React.useState<'slip' | 'pajak'>('slip');
  const q = useGajiSaya(tahun);
  if (pilih != null) return <SlipGaji id={pilih} saya tautanVerifikasi={tautanVerifikasi} logo={logo} onKembali={() => setPilih(null)} className={className} />;
  const d = q.data;
  const terakhir = d?.slip[0];
  return (
    <section className={cn('u-gaji-saya', className)}>
      <header className="u-laporan-kepala">
        <div className="u-laporan-judul">
          <h2>Gaji saya</h2>
          <p>Slip terbit setelah payroll disetujui Kepala BAUK. Gaji pokok dan tunjangan mengikuti SK di SDM.</p>
        </div>
        <div className="u-laporan-aksi">
          <Select<number> size="sm" aria-label="Tahun" value={tahun} options={opsiTahun()} onValueChange={(t) => t && setTahun(t)} />
          <SegmentedControl<typeof lihat>
            className="u-gaji-tab"
            aria-label="Tampilan"
            value={lihat}
            onValueChange={setLihat}
            options={[
              { value: 'slip', label: 'Slip' },
              { value: 'pajak', label: 'PPh 21 setahun' },
            ]}
          />
        </div>
      </header>
      {lihat === 'pajak' ? (
        <PajakGajiSaya tahun={tahun} logo={logo} />
      ) : q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : !d ? (
        <Skeleton style={{ height: 240, width: '100%' }} />
      ) : (
        <>
          {d.profil && !d.profil.no_rekening && (
            <Alert variant="warning" title="Rekening belum terdaftar">
              Hubungi BAUK untuk mendaftarkan rekening gaji agar pembayaran tidak tertahan.
            </Alert>
          )}
          {terakhir && (
            <div className="u-gaji-saya-sorot">
              <div>
                <span>{terakhir.judul}</span>
                <strong>{formatRupiah(terakhir.netto)}</strong>
                <small>{terakhir.dibayar_at ? `Dibayar ${formatDate(terakhir.dibayar_at, 'long')}` : terakhir.status === 'ditahan' ? 'Pembayaran ditahan, hubungi BAUK' : terakhir.tanggal_bayar ? `Dijadwalkan ${formatDate(terakhir.tanggal_bayar, 'long')}` : 'Menunggu pembayaran'}</small>
              </div>
              <Button size="sm" onClick={() => setPilih(terakhir.id)}>
                <FileText /> Lihat slip
              </Button>
            </div>
          )}
          {d.slip.length === 0 ? (
            <Empty icon={<Receipt />} title={`Belum ada slip pada ${tahun}`} description="Slip muncul di sini setelah payroll bulan itu disetujui." />
          ) : (
            <ul className="u-gaji-saya-daftar">
              {d.slip.map((s) => (
                <li key={s.id}>
                  <Tekan onClick={() => setPilih(s.id)}>
                    <span className="u-gaji-saya-bulan">
                      <CalendarClock />
                      <span>
                        <strong>{s.judul}</strong>
                        <small>
                          {s.nomor} · {s.dibayar_at ? 'dibayar' : s.status === 'ditahan' ? 'ditahan' : LABEL_STATUS_PERIODE_GAJI[s.status_periode].toLowerCase()}
                        </small>
                      </span>
                    </span>
                    <span className="u-gaji-saya-nilai">
                      <strong>{formatRupiah(s.netto)}</strong>
                      <small>PPh 21 {formatRupiah(s.pph21)}</small>
                    </span>
                  </Tekan>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

/** Ringkasan PPh 21 setahun pegawai yang login (bruto, biaya jabatan, iuran, PTKP, PKP, PPh terutang vs dipotong). */
export function PajakGajiSaya({ tahun, logo, className }: { tahun: number; logo?: React.ReactNode; className?: string }) {
  const q = usePajakGajiSaya(tahun);
  const d = q.data;
  const baris: BarisLaporan[] = d
    ? [
        ...(d.sebelum_payroll ? [{ jenis: 'catatan' as const, label: `Termasuk ${d.sebelum_payroll.jumlah_bulan} bulan sebelum payroll ini dipakai: bruto ${formatRupiah(d.sebelum_payroll.bruto)}, PPh ${formatRupiah(d.sebelum_payroll.pph)}` }] : []),
        { label: 'Penghasilan bruto setahun', nilai: [d.perhitungan.bruto] },
        { label: 'Biaya jabatan (5%, maks Rp6 juta)', nilai: [-d.perhitungan.biaya_jabatan], tingkat: 1 },
        { label: 'Iuran JHT/JP dan zakat', nilai: [-d.perhitungan.iuran], tingkat: 1 },
        { jenis: 'subtotal', label: 'Penghasilan neto', nilai: [d.perhitungan.neto] },
        { label: `PTKP (${d.status_ptkp})`, nilai: [-d.perhitungan.ptkp], tingkat: 1 },
        { jenis: 'subtotal', label: 'Penghasilan kena pajak', nilai: [d.perhitungan.pkp] },
        { label: 'PPh 21 terutang setahun (Pasal 17)', nilai: [d.perhitungan.pph] },
        { label: 'PPh 21 sudah dipotong', nilai: [d.pph_dipotong] },
        { jenis: 'total', label: d.pph_dipotong - d.perhitungan.pph >= 0 ? 'Lebih dipotong' : 'Kurang dipotong', nilai: [Math.abs(d.pph_dipotong - d.perhitungan.pph)] },
      ]
    : [];
  const masa: BarisLaporan[] = d ? d.masa.map((m) => ({ label: `${NAMA_BULAN[m.bulan - 1]} (${m.kode})`, nilai: [m.bruto, m.iuran, m.pph21] })) : [];
  return (
    <KerangkaLaporan
      className={className}
      judul={`PPh 21 tahun ${tahun}`}
      unit="Biro Administrasi Umum dan Keuangan"
      logo={logo}
      deskripsi="Hitungan setahun sebagai pembanding bukti potong 1721-A1. Bukti potong resmi diterbitkan BAUK."
      loading={q.loading && !d}
    >
      {q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : d && d.masa.length === 0 && !d.sebelum_payroll ? (
        <Empty icon={<Landmark />} title={`Belum ada potongan PPh 21 pada ${tahun}`} />
      ) : (
        <div className="u-gaji-isi">
          <TabelLaporan kolom={[{ label: 'Rupiah', format: 'akuntansi', lebar: 160 }]} baris={baris} labelKolom="Perhitungan setahun" />
          <TabelLaporan
            kolom={[
              { label: 'Bruto', lebar: 140 },
              { label: 'Iuran', lebar: 120 },
              { label: 'PPh 21', lebar: 120 },
            ]}
            baris={masa}
            labelKolom="Masa pajak"
            rapat
          />
        </div>
      )}
    </KerangkaLaporan>
  );
}

// ================================================================ Statistik
export interface StatistikGajiProps {
  tahun?: number;
  unit_id?: number | null;
  /** Klik periode di daftar (mis. buka rekap). */
  onPilihPeriode?: (kode: string) => void;
  className?: string;
}

/** Dasbor statistik payroll setahun: beban vs tahun lalu, tren bulanan, per unit, per jenis, komposisi, rata-rata per golongan, kelengkapan data. */
export function StatistikGaji({ tahun: tahunAwal, unit_id, onPilihPeriode, className }: StatistikGajiProps) {
  const [tahun, setTahun] = React.useState(tahunAwal ?? new Date().getFullYear());
  const [jenis, setJenis] = React.useState<JenisPegawaiGaji | null>(null);
  const q = useStatistikGaji(tahun, { unit_id, jenis });
  const d = q.data;
  const r = d?.ringkas;
  const perubahan = r && r.beban_tahun_lalu > 0 ? ((r.beban - r.beban_tahun_lalu) / r.beban_tahun_lalu) * 100 : null;
  const bulanan = React.useMemo(() => {
    const m = new Map((d?.bulanan ?? []).map((b) => [b.bulan, b]));
    const sampai = tahun === new Date().getFullYear() ? new Date().getMonth() + 1 : 12;
    return Array.from({ length: sampai }, (_, i) => ({ label: BULAN_PENDEK[i]!, title: NAMA_BULAN[i], value: m.get(i + 1)?.beban ?? 0 }));
  }, [d, tahun]);
  const komposisi = (d?.komposisi ?? []).filter((k) => k.jenis === 'pendapatan').map((k) => ({ label: LABEL_KELOMPOK[k.kelompok ?? 'lainnya'] ?? k.kelompok ?? 'Lainnya', value: k.nominal }));
  const kolomGol: KolomRekap<StatistikGajiData['rata_per_golongan'][number]>[] = [
    { key: 'jenis', label: 'Jenis', nilai: (b) => jenisPegawai(b.jenis), format: 'teks' },
    { key: 'golongan', label: 'Golongan', nilai: (b) => b.golongan, format: 'teks' },
    { key: 'slip', label: 'Slip', nilai: (b) => b.slip },
    { key: 'pendapatan', label: 'Rata-rata pendapatan', nilai: (b) => b.pendapatan, format: 'akuntansi' },
    { key: 'netto', label: 'Rata-rata diterima', nilai: (b) => b.netto, format: 'akuntansi', batang: true },
  ];
  const kolomPeriode: KolomRekap<StatistikGajiData['periode'][number]>[] = [
    { key: 'judul', label: 'Periode', nilai: (b) => b.judul, format: 'teks' },
    { key: 'status', label: 'Status', nilai: (b) => LABEL_STATUS_PERIODE_GAJI[b.status], format: 'teks' },
    { key: 'pegawai', label: 'Pegawai', nilai: (b) => b.jumlah_pegawai },
    { key: 'pph21', label: 'PPh 21', nilai: (b) => b.pph21, format: 'akuntansi', total: true },
    { key: 'netto', label: 'Diterima', nilai: (b) => b.netto, format: 'akuntansi', total: true },
    { key: 'beban', label: 'Beban', nilai: (b) => b.beban, format: 'akuntansi', total: true },
  ];
  const items: ItemStatistik[] = r
    ? [
        { label: `Beban gaji ${tahun}`, nilai: r.beban, format: 'rupiah-ringkas', perubahan, terbalik: true, ikon: <Wallet />, tren: bulanan.map((b) => b.value) },
        { label: 'Diterima pegawai', nilai: r.netto, format: 'rupiah-ringkas', ikon: <Receipt /> },
        { label: 'PPh 21 dipotong', nilai: r.pph21, format: 'rupiah-ringkas', ikon: <Landmark /> },
        { label: 'Iuran BPJS', nilai: r.bpjs_pegawai + r.bpjs_perusahaan, format: 'rupiah-ringkas', keterangan: `universitas ${formatRupiahRingkas(r.bpjs_perusahaan)} · pegawai ${formatRupiahRingkas(r.bpjs_pegawai)}`, ikon: <ShieldCheck /> },
        {
          label: 'Kelengkapan data gaji',
          nilai: r.pegawai_berprofil,
          keterangan: `${r.tanpa_profil} pegawai aktif tanpa profil · ${r.tanpa_rekening} tanpa rekening`,
          progres: r.pegawai_berprofil + r.tanpa_profil > 0 ? ((r.pegawai_berprofil - Math.min(r.tanpa_rekening, r.pegawai_berprofil)) / (r.pegawai_berprofil + r.tanpa_profil)) * 100 : null,
          nada: r.tanpa_profil + r.tanpa_rekening > 0 ? 'warning' : 'success',
          ikon: <BadgeCheck />,
        },
      ]
    : [];
  return (
    <KerangkaLaporan
      className={cn('u-gaji-statistik', className)}
      judul={`Statistik payroll ${tahun}`}
      unit="Biro Administrasi Umum dan Keuangan"
      deskripsi="Hanya periode yang sudah disetujui. Beban = pendapatan pegawai + iuran yang ditanggung universitas."
      filter={
        <div className="u-gaji-pilih">
          <Select<number> size="sm" aria-label="Tahun" value={tahun} options={opsiTahun()} onValueChange={(t) => t && setTahun(t)} />
          <Select<string>
            size="sm"
            aria-label="Jenis pegawai"
            value={jenis ?? 'semua'}
            options={[
              { value: 'semua', label: 'Dosen dan tendik' },
              { value: 'dosen', label: 'Dosen' },
              { value: 'tendik', label: 'Tendik' },
            ]}
            onValueChange={(j) => setJenis((j && j !== 'semua' ? j : null) as JenisPegawaiGaji | null)}
          />
        </div>
      }
      csv={d ? { namaFile: `statistik-gaji-${tahun}`, data: () => rekapKeCsv(kolomPeriode, d.periode) } : undefined}
      loading={q.loading && !d}
    >
      {q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : d ? (
        <div className="u-gaji-isi">
          <StatistikRingkas items={items} min={190} />
          <DashboardGrid>
            <Panel title="Beban gaji per bulan" span={2}>
              <BarChart data={bulanan} format={formatRupiahRingkas} highlightLast={tahun === new Date().getFullYear()} />
            </Panel>
            <Panel title="Komposisi pendapatan">
              {komposisi.length ? <DonutChart data={komposisi} format={formatRupiahRingkas} centerLabel="Pendapatan" /> : <Empty title="Belum ada data" />}
            </Panel>
            <Panel title="Beban per unit" span={2}>
              <BarList items={d.per_unit.map((u) => ({ label: u.unit, value: u.beban, secondary: `${u.pegawai} pegawai` }))} format={formatRupiahRingkas} limit={10} />
            </Panel>
            <Panel title="Dosen dan tendik">
              <BarList items={d.per_jenis.map((j) => ({ label: jenisPegawai(j.jenis), value: j.beban, secondary: `${j.pegawai} pegawai` }))} format={formatRupiahRingkas} />
            </Panel>
          </DashboardGrid>
          <h3 className="u-gaji-subjudul">Rata-rata gaji bulanan per golongan</h3>
          <TabelRekap kolom={kolomGol} baris={d.rata_per_golongan} kunci={(b) => `${b.jenis}-${b.golongan}`} total={false} />
          <h3 className="u-gaji-subjudul">Periode payroll {tahun}</h3>
          <TabelRekap kolom={kolomPeriode} baris={d.periode} kunci={(b) => b.kode} onPilih={onPilihPeriode ? (b) => onPilihPeriode(b.kode) : undefined} kosong="Belum ada periode payroll." />
        </div>
      ) : null}
    </KerangkaLaporan>
  );
}

// ================================================================ Verifikasi publik
/** Halaman publik verifikasi keaslian slip dari QR (tanpa nominal). */
export function VerifikasiSlipGaji({ kode, className }: { kode: string; className?: string }) {
  const q = useVerifikasiSlipGaji(kode);
  if (q.loading) return <Skeleton style={{ height: 200, width: '100%' }} className={className} />;
  if (q.error || !q.data)
    return (
      <Alert variant="danger" title="Slip tidak dapat diverifikasi" className={className}>
        Kode {kode} tidak ditemukan atau slip belum terbit. Pastikan QR dipindai dari slip asli.
      </Alert>
    );
  const d = q.data;
  return (
    <div className={cn('u-gaji-verifikasi', className)}>
      <BadgeCheck className="u-gaji-verifikasi-ikon" aria-hidden />
      <h2>Slip gaji sah</h2>
      <p>Diterbitkan oleh {d.penerbit}, Universitas Pohuwato.</p>
      <dl>
        <div>
          <dt>Nomor</dt>
          <dd>{d.nomor}</dd>
        </div>
        <div>
          <dt>Nama</dt>
          <dd>{d.nama}</dd>
        </div>
        {d.nip && (
          <div>
            <dt>NIP</dt>
            <dd>{d.nip}</dd>
          </div>
        )}
        <div>
          <dt>Periode</dt>
          <dd>{d.periode}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{d.status === 'dibayar' ? 'Sudah dibayar' : LABEL_STATUS_PERIODE_GAJI[d.status as StatusPeriodeGaji] ?? d.status}</dd>
        </div>
      </dl>
      <small>Nominal tidak ditampilkan untuk menjaga kerahasiaan pegawai.</small>
    </div>
  );
}
