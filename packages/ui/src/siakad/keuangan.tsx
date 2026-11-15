'use client';
import * as React from 'react';
import { Banknote, Building2, GraduationCap, Landmark, PiggyBank, Scale, TrendingUp, Wallet } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatRupiah, formatRupiahRingkas } from '../lib/format';
import { Badge } from '../components/actions';
import { Empty } from '../components/display';
import { Select } from '../components/select';
import { BarList, DashboardGrid, DonutChart, GroupedBarChart, Panel } from '../components/charts';
import {
  KerangkaLaporan,
  PilihPeriode,
  StatistikRingkas,
  TabelLaporan,
  TabelRekap,
  labelPeriode,
  rekapKeCsv,
  rentangPreset,
  tabelLaporanKeCsv,
  type BarisLaporan,
  type ItemStatistik,
  type KolomLaporan,
  type KolomRekap,
  type Penandatangan,
  type RentangTanggal,
} from '../components/laporan';
import { GalatApi } from './galat';
import { useSiakadQuery } from './provider';

/*
 * Keuangan universitas (/v1/keu): laporan keuangan entitas nirlaba (ISAK 35) dari buku besar keu_jurnal, saldo kas per
 * unit (fakultas ikut menjumlah prodi), transparansi biaya mahasiswa per semester, dan statistik keuangan.
 * Pengelola berlingkup unit otomatis hanya melihat unitnya (dibatasi server).
 */

const P = '/v1/keu';
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// ================================================================ Tipe
export interface AkunRingkas {
  id: number | null;
  kode: string;
  nama: string;
  pos?: string | null;
}
type KelompokPos = { pos: string; label: string; akun: Array<AkunRingkas & { saldo: number }>; jumlah: number };

export interface PosisiKeuanganData {
  tanggal: string;
  aset: { lancar: KelompokPos[]; tidak_lancar: KelompokPos[]; total_lancar: number; total_tidak_lancar: number; total: number };
  liabilitas: { kelompok: KelompokPos[]; total: number };
  aset_neto: { kelompok: KelompokPos[]; total: number };
  total_liabilitas_aset_neto: number;
  seimbang: boolean;
  pembanding?: Omit<PosisiKeuanganData, 'pembanding'>;
}
type GrupAkun = { akun: Array<AkunRingkas & { jumlah: number }>; total: number };
export interface AktivitasData {
  dari: string;
  sampai: string;
  pendapatan_tanpa_pembatasan: GrupAkun;
  beban: GrupAkun;
  penghasilan_lain: GrupAkun;
  beban_lain: GrupAkun;
  surplus_tanpa_pembatasan: number;
  pendapatan_dengan_pembatasan: GrupAkun;
  total_pendapatan: number;
  total_beban: number;
  perubahan_aset_neto: number;
  pembanding?: Omit<AktivitasData, 'pembanding'>;
}
type GrupArus = { akun: Array<AkunRingkas & { masuk: number; keluar: number; neto: number }>; masuk: number; keluar: number; neto: number };
export interface ArusKasData {
  dari: string;
  sampai: string;
  saldo_awal: number;
  operasi: GrupArus;
  investasi: GrupArus;
  pendanaan: GrupArus;
  transfer: GrupArus;
  kenaikan_bersih: number;
  saldo_akhir: number;
}
export interface NeracaSaldoData {
  dari: string | null;
  sampai: string;
  baris: Array<AkunRingkas & { saldo_awal: number; debit: number; kredit: number; saldo_debit: number; saldo_kredit: number }>;
  total_debit: number;
  total_kredit: number;
  seimbang: boolean;
}
export interface KasUnitData {
  tanggal: string;
  dari: string;
  total: number;
  masuk: number;
  keluar: number;
  universitas: { saldo: number; masuk: number; keluar: number; jumlah_rekening: number };
  rekening: Array<{ id: number; kode: string; nama: string; jenis: string; bank: string | null; nomor_rekening: string | null; unit_id: number | null; unit: string | null; utama: boolean; aktif: boolean; saldo: number; masuk: number; keluar: number }>;
  unit: Array<{ id: number; induk_id: number | null; kode: string; nama: string; jenis: string; kode_prodi: string | null; kode_fakultas: string | null; saldo_sendiri: number; saldo: number; masuk: number; keluar: number; jumlah_rekening: number }>;
}
export interface BarisTransparansi {
  kode_prodi: string;
  kode_biaya: string;
  nama_biaya: string;
  nama_prodi: string;
  kode_jenjang: string | null;
  kode_fakultas: string | null;
  nama_fakultas: string | null;
  tagihan: number;
  mahasiswa_ditagih: number;
  dibayar: number;
  diskon: number;
  mahasiswa_membayar: number;
  tarif_min: number | null;
  tarif_max: number | null;
  tunggakan: number;
  persen_terbayar: number | null;
}
type RekapTransparansi = { tagihan: number; dibayar: number; diskon: number; tunggakan: number; persen_terbayar: number | null };
export interface TransparansiData {
  tahun_id: string;
  baris: BarisTransparansi[];
  per_jenis_biaya: Array<RekapTransparansi & { kode_biaya: string; nama_biaya: string }>;
  per_fakultas: Array<RekapTransparansi & { kode_fakultas: string | null; nama_fakultas: string | null }>;
  per_prodi: Array<RekapTransparansi & { kode_prodi: string; nama_prodi: string; kode_fakultas: string | null; nama_fakultas: string | null }>;
  total: { tagihan: number; dibayar: number; diskon: number; tunggakan: number };
}
export interface StatistikKeuanganData {
  tahun: number;
  tahun_id: string;
  ringkas: {
    penerimaan_mahasiswa: number;
    penerimaan_mahasiswa_tahun_lalu: number;
    pertumbuhan_persen: number | null;
    penerimaan_lain: number;
    belanja: number;
    saldo_kas: number;
    tagihan_semester: number;
    dibayar_semester: number;
    piutang_semester: number;
    persen_tertagih: number | null;
    pendapatan_buku: number;
    beban_buku: number;
  };
  penerimaan_bulanan: Array<{ bulan: number; jumlah: number; tahun_lalu: number; transaksi: number }>;
  per_jenis_biaya: Array<{ kode_biaya: string; nama: string; jumlah: number; transaksi: number; mahasiswa: number }>;
  per_fakultas: Array<{ kode_fakultas: string | null; nama_fakultas: string; jumlah: number; mahasiswa: number }>;
  per_prodi: Array<{ kode_prodi: string; nama_prodi: string | null; kode_fakultas: string | null; nama_fakultas: string | null; jumlah: number; mahasiswa: number }>;
  metode_pembayaran: Array<{ metode: string; jumlah: number; transaksi: number }>;
  piutang_per_prodi: Array<{ kode_prodi: string; nama_prodi: string; nama_fakultas: string | null; tagihan: number; dibayar: number; piutang?: number; persen_terbayar?: number | null }>;
  belanja_per_unit: Array<{ unit_id: number | null; unit: string; jumlah: number; pengajuan: number }>;
  penerimaan_lain_per_sumber: Array<{ sumber: string; jumlah: number; transaksi: number }>;
  status_pengajuan_dana: Array<{ status: string; jumlah: number; pengajuan: number }>;
  buku_besar_bulanan: Array<{ bulan: number; pendapatan: number; beban: number; kas_masuk: number; kas_keluar: number; saldo_kas: number; surplus: number }>;
  kas_per_unit: KasUnitData['unit'];
}

// ================================================================ Hooks
type Q = Record<string, string | number | undefined | null>;
const bersih = (q: Q) => Object.fromEntries(Object.entries(q).filter(([, v]) => v != null && v !== '')) as Record<string, string | number>;
function useKeu<T>(path: string, q: Q, enabled = true) {
  const query = bersih(q);
  return useSiakadQuery<T>(['keu', path, query], (s, signal) => s.request({ method: 'GET', path: `${P}${path}`, query }, { signal }), { enabled });
}
export const usePosisiKeuangan = (q: { tanggal: string; pembanding?: string | null; unit_id?: number | null }) => useKeu<PosisiKeuanganData>('/laporan/posisi-keuangan', q);
export const useAktivitasKeuangan = (q: { dari: string; sampai: string; pembanding?: 0 | 1; unit_id?: number | null }) => useKeu<AktivitasData>('/laporan/aktivitas', q);
export const useArusKas = (q: { dari: string; sampai: string; unit_id?: number | null }) => useKeu<ArusKasData>('/laporan/arus-kas', q);
export const useNeracaSaldo = (q: { dari?: string | null; sampai: string; unit_id?: number | null }) => useKeu<NeracaSaldoData>('/laporan/neraca-saldo', q);
export const useKasUnit = (q: { tanggal?: string; dari?: string; unit_id?: number | null } = {}) => useKeu<KasUnitData>('/kas-unit', q);
export const useTransparansiBiaya = (q: { tahun_id?: string | null; kode_fakultas?: string | null; kode_prodi?: string | null } = {}) => useKeu<TransparansiData>('/transparansi', q);
export const useStatistikKeuangan = (q: { tahun: number; tahun_id?: string | null; unit_id?: number | null }) => useKeu<StatistikKeuanganData>('/statistik', q);

// ================================================================ Laporan keuangan
export type JenisLaporanKeuangan = 'posisi' | 'aktivitas' | 'arus-kas' | 'neraca-saldo';
const JUDUL_LAPORAN: Record<JenisLaporanKeuangan, string> = {
  posisi: 'Laporan posisi keuangan',
  aktivitas: 'Laporan aktivitas',
  'arus-kas': 'Laporan arus kas',
  'neraca-saldo': 'Neraca saldo',
};
const DESKRIPSI_LAPORAN: Record<JenisLaporanKeuangan, string> = {
  posisi: 'Apa yang dimiliki universitas (aset), kewajibannya, dan aset neto pada satu tanggal.',
  aktivitas: 'Pendapatan dan beban selama periode; surplus berarti pendapatan melebihi beban.',
  'arus-kas': 'Uang masuk dan keluar dari rekening universitas, dikelompokkan operasi, investasi, dan pendanaan.',
  'neraca-saldo': 'Saldo setiap akun buku besar; jumlah debit harus sama dengan kredit.',
};

export interface LaporanKeuanganProps {
  jenis?: JenisLaporanKeuangan;
  /** Tampilkan pemilih jenis laporan. Bawaan true. */
  pilihJenis?: boolean;
  unit_id?: number | null;
  /** Nama unit untuk kepala cetak bila laporan dibatasi unit. */
  namaUnit?: React.ReactNode;
  penandatangan?: Penandatangan[];
  logo?: React.ReactNode;
  /** Klik baris akun (mis. buka buku besar akun). */
  onPilihAkun?: (akunId: number) => void;
  className?: string;
}

/** Empat laporan keuangan dari buku besar dengan periode, pembanding, cetak/PDF, dan CSV. */
export function LaporanKeuangan({ jenis: jenisAwal = 'posisi', pilihJenis = true, unit_id, namaUnit, penandatangan, logo, onPilihAkun, className }: LaporanKeuanganProps) {
  const [jenis, setJenis] = React.useState<JenisLaporanKeuangan>(jenisAwal);
  const [r, setR] = React.useState<RentangTanggal>(() => rentangPreset('tahun_ini'));
  const [banding, setBanding] = React.useState(true);
  const satu = jenis === 'posisi';
  const lalu = React.useMemo(() => {
    const d = new Date(`${r.sampai}T00:00:00`);
    return `${d.getFullYear() - 1}-12-31`;
  }, [r.sampai]);
  const posisi = usePosisiKeuangan({ tanggal: r.sampai, pembanding: banding ? lalu : null, unit_id });
  const akt = useAktivitasKeuangan({ dari: r.dari, sampai: r.sampai, pembanding: banding ? 1 : 0, unit_id });
  const arus = useArusKas({ dari: r.dari, sampai: r.sampai, unit_id });
  const ns = useNeracaSaldo({ dari: r.dari, sampai: r.sampai, unit_id });
  const q = { posisi, aktivitas: akt, 'arus-kas': arus, 'neraca-saldo': ns }[jenis];

  const klik = (id: number | null | undefined) => (onPilihAkun && id ? () => onPilihAkun(id) : undefined);
  const { kolom, baris, lencana } = React.useMemo((): { kolom: KolomLaporan[]; baris: BarisLaporan[]; lencana?: React.ReactNode } => {
    if (jenis === 'posisi' && posisi.data) {
      const d = posisi.data;
      const b = d.pembanding;
      const kol: KolomLaporan[] = [{ label: labelPeriode({ tanggal: d.tanggal }), csv: d.tanggal }, ...(b ? [{ label: labelPeriode({ tanggal: b.tanggal }), csv: b.tanggal }] : [])];
      const nilaiAkun = (kel: 'lancar' | 'tidak_lancar' | 'liabilitas' | 'neto', i: number, kode: string, saldo: number) => {
        if (!b) return [saldo];
        const kelB = kel === 'lancar' ? b.aset.lancar : kel === 'tidak_lancar' ? b.aset.tidak_lancar : kel === 'liabilitas' ? b.liabilitas.kelompok : b.aset_neto.kelompok;
        return [saldo, kelB[i]?.akun.find((a) => a.kode === kode)?.saldo ?? 0];
      };
      const sub = (kel: KelompokPos[], kelB: KelompokPos[] | undefined, nama: 'lancar' | 'tidak_lancar' | 'liabilitas' | 'neto', t: number): BarisLaporan[] =>
        kel.flatMap((k, i) => [
          { jenis: 'item' as const, label: k.label, tingkat: 1, nilai: [null] },
          ...k.akun.map((a) => ({ label: a.nama, kode: a.kode, tingkat: 2 + t, nilai: nilaiAkun(nama, i, a.kode, a.saldo), onClick: klik(a.id) })),
          { jenis: 'subtotal' as const, label: `Jumlah ${k.label.toLowerCase()}`, tingkat: 1, nilai: [k.jumlah, ...(kelB ? [kelB[i]?.jumlah ?? 0] : [])] },
        ]);
      const out: BarisLaporan[] = [
        { jenis: 'grup', label: 'ASET' },
        ...sub(d.aset.lancar, b?.aset.lancar, 'lancar', 0),
        ...sub(d.aset.tidak_lancar, b?.aset.tidak_lancar, 'tidak_lancar', 0),
        { jenis: 'total', label: 'JUMLAH ASET', nilai: [d.aset.total, ...(b ? [b.aset.total] : [])] },
        { jenis: 'grup', label: 'LIABILITAS' },
        ...sub(d.liabilitas.kelompok, b?.liabilitas.kelompok, 'liabilitas', 0),
        { jenis: 'subtotal', label: 'Jumlah liabilitas', nilai: [d.liabilitas.total, ...(b ? [b.liabilitas.total] : [])] },
        { jenis: 'grup', label: 'ASET NETO' },
        ...sub(d.aset_neto.kelompok, b?.aset_neto.kelompok, 'neto', 0),
        { jenis: 'subtotal', label: 'Jumlah aset neto', nilai: [d.aset_neto.total, ...(b ? [b.aset_neto.total] : [])] },
        { jenis: 'total', label: 'JUMLAH LIABILITAS DAN ASET NETO', nilai: [d.total_liabilitas_aset_neto, ...(b ? [b.total_liabilitas_aset_neto] : [])] },
      ];
      // Baris label kelompok tanpa angka tampil sebagai item kosong; ubah jadi grup bertingkat.
      return { kolom: kol, baris: out.map((x) => (x.jenis === 'item' && x.nilai?.[0] === null && !x.kode ? { ...x, jenis: 'grup' as const } : x)), lencana: <SeimbangBadge ok={d.seimbang} /> };
    }
    if (jenis === 'aktivitas' && akt.data) {
      const d = akt.data;
      const b = d.pembanding;
      const kol: KolomLaporan[] = [{ label: 'Periode ini', csv: `${d.dari} s.d. ${d.sampai}` }, ...(b ? [{ label: 'Periode lalu', csv: `${b.dari} s.d. ${b.sampai}` }] : [])];
      const grup = (judul: string, g: GrupAkun, gb: GrupAkun | undefined, total: string): BarisLaporan[] =>
        g.akun.length || gb?.akun.length
          ? [
              { jenis: 'grup', label: judul, tingkat: 1 },
              ...g.akun.map((a) => ({ label: a.nama, kode: a.kode, tingkat: 2, nilai: [a.jumlah, ...(gb ? [gb.akun.find((x) => x.kode === a.kode)?.jumlah ?? 0] : [])], onClick: klik(a.id) })),
              ...(gb ? gb.akun.filter((x) => !g.akun.some((a) => a.kode === x.kode)).map((a) => ({ label: a.nama, kode: a.kode, tingkat: 2, nilai: [0, a.jumlah], onClick: klik(a.id) })) : []),
              { jenis: 'subtotal', label: total, tingkat: 1, nilai: [g.total, ...(gb ? [gb.total] : [])] },
            ]
          : [];
      return {
        kolom: kol,
        baris: [
          { jenis: 'grup', label: 'TANPA PEMBATASAN DARI PEMBERI SUMBER DAYA' },
          ...grup('Pendapatan', d.pendapatan_tanpa_pembatasan, b?.pendapatan_tanpa_pembatasan, 'Jumlah pendapatan'),
          ...grup('Beban', d.beban, b?.beban, 'Jumlah beban'),
          ...grup('Penghasilan lain', d.penghasilan_lain, b?.penghasilan_lain, 'Jumlah penghasilan lain'),
          ...grup('Beban lain', d.beban_lain, b?.beban_lain, 'Jumlah beban lain'),
          { jenis: 'subtotal', label: 'Surplus (defisit)', nilai: [d.surplus_tanpa_pembatasan, ...(b ? [b.surplus_tanpa_pembatasan] : [])] },
          { jenis: 'grup', label: 'DENGAN PEMBATASAN DARI PEMBERI SUMBER DAYA' },
          ...grup('Pendapatan dengan pembatasan', d.pendapatan_dengan_pembatasan, b?.pendapatan_dengan_pembatasan, 'Jumlah'),
          { jenis: 'total', label: 'PERUBAHAN ASET NETO', nilai: [d.perubahan_aset_neto, ...(b ? [b.perubahan_aset_neto] : [])] },
        ],
      };
    }
    if (jenis === 'arus-kas' && arus.data) {
      const d = arus.data;
      const grup = (judul: string, g: GrupArus): BarisLaporan[] =>
        g.akun.length
          ? [
              { jenis: 'grup', label: judul },
              ...g.akun.map((a) => ({ label: a.nama, kode: a.kode, tingkat: 1, nilai: [a.masuk, a.keluar ? -a.keluar : 0, a.neto], onClick: klik(a.id) })),
              { jenis: 'subtotal', label: `Kas bersih ${judul.toLowerCase().replace('aktivitas ', 'dari aktivitas ')}`, nilai: [g.masuk, -g.keluar, g.neto] },
            ]
          : [];
      return {
        kolom: [{ label: 'Masuk' }, { label: 'Keluar' }, { label: 'Bersih' }],
        baris: [
          { label: 'Saldo kas awal', nilai: [null, null, d.saldo_awal] },
          ...grup('Aktivitas operasi', d.operasi),
          ...grup('Aktivitas investasi', d.investasi),
          ...grup('Aktivitas pendanaan', d.pendanaan),
          ...grup('Transfer antar rekening', d.transfer),
          { jenis: 'subtotal', label: 'Kenaikan (penurunan) kas bersih', nilai: [null, null, d.kenaikan_bersih] },
          { jenis: 'total', label: 'Saldo kas akhir', nilai: [null, null, d.saldo_akhir] },
        ],
      };
    }
    if (jenis === 'neraca-saldo' && ns.data) {
      const d = ns.data;
      return {
        kolom: [{ label: 'Saldo awal' }, { label: 'Debit' }, { label: 'Kredit' }, { label: 'Saldo debit' }, { label: 'Saldo kredit' }],
        baris: [...d.baris.map((a) => ({ label: a.nama, kode: a.kode, nilai: [a.saldo_awal, a.debit, a.kredit, a.saldo_debit, a.saldo_kredit], onClick: klik(a.id) })), { jenis: 'total', label: 'Jumlah', nilai: [null, null, null, d.total_debit, d.total_kredit] }],
        lencana: <SeimbangBadge ok={d.seimbang} />,
      };
    }
    return { kolom: [], baris: [] };
  }, [jenis, posisi.data, akt.data, arus.data, ns.data, onPilihAkun]);

  const periode = satu ? labelPeriode({ tanggal: r.sampai }) : labelPeriode(r);
  return (
    <KerangkaLaporan
      className={className}
      judul={JUDUL_LAPORAN[jenis]}
      deskripsi={DESKRIPSI_LAPORAN[jenis]}
      periode={periode}
      unit={namaUnit ?? 'Biro Administrasi Umum dan Keuangan'}
      logo={logo}
      lencana={lencana}
      loading={q.loading && !q.data}
      csv={{ namaFile: `${jenis}-${r.sampai}`, data: () => tabelLaporanKeCsv(kolom, baris, { denganKode: true }) }}
      penandatangan={penandatangan}
      filter={
        <>
          {pilihJenis && (
            <Select<JenisLaporanKeuangan>
              size="sm"
              aria-label="Jenis laporan"
              value={jenis}
              options={(Object.keys(JUDUL_LAPORAN) as JenisLaporanKeuangan[]).map((k) => ({ value: k, label: JUDUL_LAPORAN[k] }))}
              onValueChange={(v) => v && setJenis(v)}
            />
          )}
          <PilihPeriode value={r} onChange={setR} satuTanggal={satu} />
          {(jenis === 'posisi' || jenis === 'aktivitas') && (
            <label className="u-keu-banding">
              <input type="checkbox" checked={banding} onChange={(e) => setBanding(e.target.checked)} /> Pembanding
            </label>
          )}
        </>
      }
      catatan={<p>Disusun dari jurnal yang sudah diposting. Angka dalam kurung bernilai negatif.</p>}
    >
      {q.error ? <GalatApi error={q.error} onRetry={q.refetch} /> : <TabelLaporan kolom={kolom} baris={baris} denganKode rapat={jenis === 'neraca-saldo'} />}
    </KerangkaLaporan>
  );
}

function SeimbangBadge({ ok }: { ok: boolean }) {
  return (
    <Badge variant={ok ? 'success' : 'danger'} dot>
      {ok ? 'Seimbang' : 'Tidak seimbang'}
    </Badge>
  );
}

// ================================================================ Kas per unit
export interface KasUnitProps {
  unit_id?: number | null;
  /** Klik unit (mis. buka buku besar rekening unit). */
  onPilihUnit?: (unitId: number) => void;
  onPilihRekening?: (rekeningId: number) => void;
  className?: string;
}

/** Saldo kas per unit (fakultas menjumlah prodi dan unit di bawahnya) dan per rekening, dengan kas masuk/keluar periode. */
export function KasUnit({ unit_id, onPilihUnit, onPilihRekening, className }: KasUnitProps) {
  const [r, setR] = React.useState<RentangTanggal>(() => rentangPreset('bulan_ini'));
  const [lihat, setLihat] = React.useState<'unit' | 'rekening'>('unit');
  const q = useKasUnit({ tanggal: r.sampai, dari: r.dari, unit_id });
  const d = q.data;
  const unit = (d?.unit ?? []).filter((u) => u.jumlah_rekening > 0 || u.saldo !== 0);
  const kedalaman = React.useMemo(() => {
    const peta = new Map(unit.map((u) => [u.id, u]));
    const dalam = (u: (typeof unit)[number]): number => (u.induk_id && peta.has(u.induk_id) ? 1 + dalam(peta.get(u.induk_id)!) : 0);
    return new Map(unit.map((u) => [u.id, dalam(u)]));
  }, [unit]);
  const kolomUnit: KolomRekap<(typeof unit)[number]>[] = [
    { key: 'nama', label: 'Unit', nilai: (u) => `${'  '.repeat(kedalaman.get(u.id) ?? 0)}${u.nama}`, format: 'teks', csv: 'Unit' },
    { key: 'rek', label: 'Rekening', nilai: (u) => u.jumlah_rekening },
    { key: 'masuk', label: 'Masuk', nilai: (u) => u.masuk, format: 'akuntansi' },
    { key: 'keluar', label: 'Keluar', nilai: (u) => u.keluar, format: 'akuntansi' },
    { key: 'saldo', label: 'Saldo', nilai: (u) => u.saldo, format: 'akuntansi', batang: true },
  ];
  const kolomRek: KolomRekap<KasUnitData['rekening'][number]>[] = [
    { key: 'nama', label: 'Rekening', nilai: (x) => `${x.kode} · ${x.nama}${x.utama ? ' (utama)' : ''}`, format: 'teks' },
    { key: 'bank', label: 'Bank', nilai: (x) => (x.bank ? `${x.bank} ${x.nomor_rekening ?? ''}`.trim() : x.jenis), format: 'teks' },
    { key: 'unit', label: 'Unit', nilai: (x) => x.unit ?? 'Universitas', format: 'teks' },
    { key: 'masuk', label: 'Masuk', nilai: (x) => x.masuk, format: 'akuntansi', total: true },
    { key: 'keluar', label: 'Keluar', nilai: (x) => x.keluar, format: 'akuntansi', total: true },
    { key: 'saldo', label: 'Saldo', nilai: (x) => x.saldo, format: 'akuntansi', total: true },
  ];
  return (
    <KerangkaLaporan
      className={cn('u-keu-kas', className)}
      judul="Kas per unit"
      deskripsi="Saldo fakultas sudah termasuk prodi dan unit di bawahnya. Rekening tanpa unit dihitung milik universitas."
      periode={`Saldo ${labelPeriode({ tanggal: r.sampai })} · mutasi ${labelPeriode(r)}`}
      unit="Biro Administrasi Umum dan Keuangan"
      loading={q.loading && !d}
      csv={d ? { namaFile: `kas-${lihat}-${r.sampai}`, data: () => (lihat === 'unit' ? rekapKeCsv(kolomUnit, unit) : rekapKeCsv(kolomRek, d.rekening)) } : undefined}
      filter={
        <>
          <PilihPeriode value={r} onChange={setR} />
          <Select<'unit' | 'rekening'>
            size="sm"
            aria-label="Tampilan"
            value={lihat}
            options={[
              { value: 'unit', label: 'Per unit' },
              { value: 'rekening', label: 'Per rekening' },
            ]}
            onValueChange={(v) => v && setLihat(v)}
          />
        </>
      }
    >
      {q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : d ? (
        <div className="u-keu-isi">
          <StatistikRingkas
            min={180}
            items={[
              { label: 'Saldo kas', nilai: d.total, format: 'rupiah-ringkas', ikon: <Wallet /> },
              { label: 'Kas masuk', nilai: d.masuk, format: 'rupiah-ringkas', ikon: <TrendingUp />, nada: 'success' },
              { label: 'Kas keluar', nilai: d.keluar, format: 'rupiah-ringkas', ikon: <Banknote />, nada: 'warning' },
              { label: 'Rekening', nilai: d.rekening.length, keterangan: `${d.universitas.jumlah_rekening} rekening universitas` },
            ]}
          />
          {lihat === 'unit' ? (
            <TabelRekap kolom={kolomUnit} baris={unit} kunci={(u) => String(u.id)} total={false} onPilih={onPilihUnit ? (u) => onPilihUnit(u.id) : undefined} kosong="Belum ada rekening kas per unit." />
          ) : (
            <TabelRekap kolom={kolomRek} baris={d.rekening} kunci={(x) => String(x.id)} onPilih={onPilihRekening ? (x) => onPilihRekening(x.id) : undefined} />
          )}
        </div>
      ) : null}
    </KerangkaLaporan>
  );
}

// ================================================================ Transparansi biaya
export interface TransparansiBiayaProps {
  tahun_id?: string | null;
  /** Batasi ke satu fakultas (aplikasi fakultas). */
  kode_fakultas?: string | null;
  kode_prodi?: string | null;
  /** Pilihan semester (tahun_id => label). Bila kosong, pemilih semester tidak tampil. */
  semester?: Array<{ value: string; label: string }>;
  /** Tampilkan tunggakan dan persen terbayar (internal). Halaman publik cukup tarif. Bawaan true. */
  denganRealisasi?: boolean;
  className?: string;
}

/**
 * Transparansi biaya kuliah satu semester: tarif per prodi dan jenis biaya (UKT/SPP, gedung, ujian, konversi, semester
 * pendek, wisuda), jumlah ditagih, dibayar, potongan, tunggakan.
 */
export function TransparansiBiaya({ tahun_id, kode_fakultas, kode_prodi, semester, denganRealisasi = true, className }: TransparansiBiayaProps) {
  const [th, setTh] = React.useState<string | null>(tahun_id ?? semester?.[0]?.value ?? null);
  const [lihat, setLihat] = React.useState<'biaya' | 'prodi' | 'rinci'>('biaya');
  const q = useTransparansiBiaya({ tahun_id: th, kode_fakultas, kode_prodi });
  const d = q.data;
  const tarif = (b: { tarif_min: number | null; tarif_max: number | null }) => (b.tarif_min == null ? '–' : b.tarif_min === b.tarif_max ? formatRupiah(b.tarif_min) : `${formatRupiah(b.tarif_min)} – ${formatRupiah(b.tarif_max)}`);
  const real = <T extends RekapTransparansi>(): KolomRekap<T>[] =>
    denganRealisasi
      ? [
          { key: 'tagihan', label: 'Ditagihkan', nilai: (b) => b.tagihan, format: 'akuntansi', total: true },
          { key: 'diskon', label: 'Potongan', nilai: (b) => b.diskon, format: 'akuntansi', total: true },
          { key: 'dibayar', label: 'Dibayar', nilai: (b) => b.dibayar, format: 'akuntansi', total: true },
          { key: 'tunggakan', label: 'Tunggakan', nilai: (b) => b.tunggakan, format: 'akuntansi', total: true },
          { key: 'persen', label: 'Terbayar', nilai: (b) => b.persen_terbayar, format: 'persen', batang: true },
        ]
      : [];
  const kolomBiaya: KolomRekap<TransparansiData['per_jenis_biaya'][number]>[] = [{ key: 'nama', label: 'Jenis biaya', nilai: (b) => b.nama_biaya, format: 'teks' }, ...real()];
  const kolomProdi: KolomRekap<TransparansiData['per_prodi'][number]>[] = [
    { key: 'prodi', label: 'Program studi', nilai: (b) => b.nama_prodi, format: 'teks' },
    { key: 'fak', label: 'Fakultas', nilai: (b) => b.nama_fakultas ?? '', format: 'teks' },
    ...real(),
  ];
  const kolomRinci: KolomRekap<BarisTransparansi>[] = [
    { key: 'prodi', label: 'Program studi', nilai: (b) => `${b.kode_jenjang ? `${b.kode_jenjang} ` : ''}${b.nama_prodi}`, format: 'teks' },
    { key: 'biaya', label: 'Jenis biaya', nilai: (b) => b.nama_biaya, format: 'teks' },
    { key: 'tarif', label: 'Tarif', nilai: tarif, format: 'teks' },
    ...(denganRealisasi
      ? ([
          { key: 'mhs', label: 'Mahasiswa', nilai: (b) => b.mahasiswa_ditagih },
          { key: 'tagihan', label: 'Ditagihkan', nilai: (b) => b.tagihan, format: 'akuntansi', total: true },
          { key: 'dibayar', label: 'Dibayar', nilai: (b) => b.dibayar, format: 'akuntansi', total: true },
          { key: 'persen', label: 'Terbayar', nilai: (b) => b.persen_terbayar, format: 'persen', batang: true },
        ] as KolomRekap<BarisTransparansi>[])
      : []),
  ];
  const t = d?.total;
  return (
    <KerangkaLaporan
      className={cn('u-keu-transparansi', className)}
      judul="Transparansi biaya kuliah"
      deskripsi="Tarif setiap jenis biaya per program studi sesuai keputusan yayasan, dan realisasi pembayarannya pada semester ini."
      periode={d ? `Semester ${semester?.find((s) => s.value === d.tahun_id)?.label ?? d.tahun_id}` : undefined}
      unit="Biro Administrasi Umum dan Keuangan"
      loading={q.loading && !d}
      csv={d ? { namaFile: `transparansi-biaya-${d.tahun_id}-${lihat}`, data: () => (lihat === 'biaya' ? rekapKeCsv(kolomBiaya, d.per_jenis_biaya) : lihat === 'prodi' ? rekapKeCsv(kolomProdi, d.per_prodi) : rekapKeCsv(kolomRinci, d.baris)) } : undefined}
      filter={
        <>
          {semester && semester.length > 0 && <Select<string> size="sm" aria-label="Semester" value={th} options={semester} onValueChange={setTh} />}
          <Select<'biaya' | 'prodi' | 'rinci'>
            size="sm"
            aria-label="Tampilan"
            value={lihat}
            options={[
              { value: 'biaya', label: 'Per jenis biaya' },
              { value: 'prodi', label: 'Per program studi' },
              { value: 'rinci', label: 'Tarif per prodi dan biaya' },
            ]}
            onValueChange={(v) => v && setLihat(v)}
          />
        </>
      }
    >
      {q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : d && t ? (
        <div className="u-keu-isi">
          {denganRealisasi && (
            <StatistikRingkas
              min={180}
              items={[
                { label: 'Ditagihkan', nilai: t.tagihan, format: 'rupiah-ringkas', ikon: <GraduationCap /> },
                { label: 'Dibayar', nilai: t.dibayar, format: 'rupiah-ringkas', nada: 'success', progres: t.tagihan > 0 ? (t.dibayar / t.tagihan) * 100 : null },
                { label: 'Potongan dan beasiswa', nilai: t.diskon, format: 'rupiah-ringkas' },
                { label: 'Tunggakan', nilai: t.tunggakan, format: 'rupiah-ringkas', nada: t.tunggakan > 0 ? 'warning' : 'success' },
              ]}
            />
          )}
          {lihat === 'biaya' && <TabelRekap kolom={kolomBiaya} baris={d.per_jenis_biaya} kunci={(b) => b.kode_biaya} />}
          {lihat === 'prodi' && <TabelRekap kolom={kolomProdi} baris={d.per_prodi} kunci={(b) => b.kode_prodi} />}
          {lihat === 'rinci' && <TabelRekap kolom={kolomRinci} baris={d.baris} kunci={(b) => `${b.kode_prodi}-${b.kode_biaya}`} />}
        </div>
      ) : (
        <Empty title="Belum ada data biaya pada semester ini." />
      )}
    </KerangkaLaporan>
  );
}

// ================================================================ Statistik keuangan
export interface StatistikKeuanganProps {
  tahun?: number;
  unit_id?: number | null;
  className?: string;
}

/** Dasbor statistik keuangan setahun: penerimaan mahasiswa vs tahun lalu, piutang semester, belanja per unit, kas, pendapatan/beban buku besar. */
export function StatistikKeuangan({ tahun: awal, unit_id, className }: StatistikKeuanganProps) {
  const [tahun, setTahun] = React.useState(awal ?? new Date().getFullYear());
  const q = useStatistikKeuangan({ tahun, unit_id });
  const d = q.data;
  const r = d?.ringkas;
  const items: ItemStatistik[] = r
    ? [
        { label: `Penerimaan mahasiswa ${tahun}`, nilai: r.penerimaan_mahasiswa, format: 'rupiah-ringkas', perubahan: r.pertumbuhan_persen, ikon: <GraduationCap />, tren: d!.penerimaan_bulanan.map((b) => b.jumlah) },
        { label: 'Piutang semester berjalan', nilai: r.piutang_semester, format: 'rupiah-ringkas', terbalik: true, progres: r.persen_tertagih, keterangan: r.persen_tertagih != null ? `${r.persen_tertagih.toFixed(1)}% tagihan sudah dibayar` : undefined, ikon: <Scale /> },
        { label: 'Penerimaan lain', nilai: r.penerimaan_lain, format: 'rupiah-ringkas', ikon: <PiggyBank /> },
        { label: 'Belanja unit', nilai: r.belanja, format: 'rupiah-ringkas', ikon: <Building2 /> },
        { label: 'Saldo kas hari ini', nilai: r.saldo_kas, format: 'rupiah-ringkas', ikon: <Landmark /> },
        { label: 'Surplus buku besar', nilai: r.pendapatan_buku - r.beban_buku, format: 'rupiah-ringkas', nada: r.pendapatan_buku - r.beban_buku >= 0 ? 'success' : 'danger', keterangan: `pendapatan ${formatRupiahRingkas(r.pendapatan_buku)} · beban ${formatRupiahRingkas(r.beban_buku)}` },
      ]
    : [];
  const opsiTahun = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => ({ value: y, label: String(y) }));
  return (
    <KerangkaLaporan
      className={cn('u-keu-statistik', className)}
      judul={`Statistik keuangan ${tahun}`}
      deskripsi="Penerimaan dari pembayaran mahasiswa, piutang, belanja unit, dan kas. Angka pendapatan/beban dari jurnal yang sudah diposting."
      unit="Biro Administrasi Umum dan Keuangan"
      loading={q.loading && !d}
      filter={<Select<number> size="sm" aria-label="Tahun" value={tahun} options={opsiTahun} onValueChange={(t) => t && setTahun(t)} />}
      csv={d ? { namaFile: `statistik-keuangan-${tahun}`, data: () => ({ kolom: ['Bulan', 'Penerimaan mahasiswa', 'Tahun lalu', 'Pendapatan buku', 'Beban buku', 'Saldo kas'], baris: d.penerimaan_bulanan.map((b, i) => [BULAN_PANJANG[i], b.jumlah, b.tahun_lalu, d.buku_besar_bulanan[i]?.pendapatan ?? 0, d.buku_besar_bulanan[i]?.beban ?? 0, d.buku_besar_bulanan[i]?.saldo_kas ?? 0]) }) } : undefined}
    >
      {q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : d ? (
        <div className="u-keu-isi">
          <StatistikRingkas items={items} min={190} />
          <DashboardGrid>
            <Panel title="Penerimaan mahasiswa per bulan" description={`Dibanding ${tahun - 1}`} span={2}>
              <GroupedBarChart
                labels={BULAN}
                titles={BULAN_PANJANG}
                series={[
                  { label: String(tahun), values: d.penerimaan_bulanan.map((b) => b.jumlah) },
                  { label: String(tahun - 1), values: d.penerimaan_bulanan.map((b) => b.tahun_lalu), color: 'var(--u-neutral-300)' },
                ]}
                format={formatRupiahRingkas}
              />
            </Panel>
            <Panel title="Per jenis biaya">
              {d.per_jenis_biaya.length ? <DonutChart data={d.per_jenis_biaya.map((b) => ({ label: b.nama, value: b.jumlah }))} format={formatRupiahRingkas} centerLabel="Penerimaan" /> : <Empty title="Belum ada pembayaran" />}
            </Panel>
            <Panel title="Pendapatan dan beban (buku besar)" span={2}>
              <GroupedBarChart
                labels={BULAN}
                titles={BULAN_PANJANG}
                series={[
                  { label: 'Pendapatan', values: d.buku_besar_bulanan.map((b) => b.pendapatan), color: 'var(--u-success-500)' },
                  { label: 'Beban', values: d.buku_besar_bulanan.map((b) => b.beban), color: 'var(--u-danger-500)' },
                ]}
                format={formatRupiahRingkas}
              />
            </Panel>
            <Panel title="Penerimaan per fakultas">
              <BarList items={d.per_fakultas.map((f) => ({ label: f.nama_fakultas, value: f.jumlah, secondary: `${f.mahasiswa} mhs` }))} format={formatRupiahRingkas} />
            </Panel>
            <Panel title="Belanja per unit" span={2}>
              <BarList items={d.belanja_per_unit.map((u) => ({ label: u.unit, value: u.jumlah, secondary: `${u.pengajuan} pengajuan` }))} format={formatRupiahRingkas} limit={10} empty="Belum ada belanja yang dibayar." />
            </Panel>
            <Panel title="Metode pembayaran">
              <BarList items={d.metode_pembayaran.map((m) => ({ label: m.metode, value: m.jumlah, secondary: `${m.transaksi} trx` }))} format={formatRupiahRingkas} empty="Belum ada data metode." />
            </Panel>
          </DashboardGrid>
          <h3 className="u-keu-subjudul">Piutang semester {d.tahun_id} per program studi</h3>
          <TabelRekap
            kolom={[
              { key: 'prodi', label: 'Program studi', nilai: (b: StatistikKeuanganData['piutang_per_prodi'][number]) => b.nama_prodi, format: 'teks' },
              { key: 'tagihan', label: 'Tagihan', nilai: (b) => b.tagihan, format: 'akuntansi', total: true },
              { key: 'dibayar', label: 'Dibayar', nilai: (b) => b.dibayar, format: 'akuntansi', total: true },
              { key: 'piutang', label: 'Piutang', nilai: (b) => b.piutang ?? b.tagihan - b.dibayar, format: 'akuntansi', total: true },
              { key: 'persen', label: 'Terbayar', nilai: (b) => b.persen_terbayar ?? (b.tagihan > 0 ? (b.dibayar / b.tagihan) * 100 : null), format: 'persen', batang: true },
            ]}
            baris={d.piutang_per_prodi}
            kunci={(b) => b.kode_prodi}
          />
        </div>
      ) : null}
    </KerangkaLaporan>
  );
}
