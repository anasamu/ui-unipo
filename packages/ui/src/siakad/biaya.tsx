'use client';
import * as React from 'react';
import {
  ArrowDownToLine,
  Banknote,
  CircleAlert,
  CircleCheck,
  Coins,
  Download,
  FileBadge,
  FileText,
  GitBranch,
  HandCoins,
  History,
  Landmark,
  ListChecks,
  MoreHorizontal,
  Pencil,
  PieChart,
  Plus,
  PowerOff,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { formatDate, formatRupiah, formatRupiahRingkas } from '../lib/format';
import { Badge, Button, Skeleton } from '../components/actions';
import { BarList, DashboardGrid, DonutChart, Panel } from '../components/charts';
import { DataTable, type DataColumn } from '../components/data-table';
import { Alert, Card, CardContent, CardHeader, DescriptionList, Empty, Tabs } from '../components/display';
import { Field, Input, InputGroup, Textarea } from '../components/forms';
import { BagianForm, IsianTanggal, PanelForm, Pilihan } from '../components/formulir';
import { KerangkaLaporan, PilihPeriode as PilihPeriodeLaporan, StatistikRingkas, TabelRekap, type ItemStatistik } from '../components/laporan';
import { ConfirmDialog, Dialog, Menu, useToast, type MenuEntry } from '../components/overlays';
import type { SelectOption } from '../components/select';
import { PilihTahunAkademik } from './cari';
import { GalatApi } from './galat';
import { PilihNomorSK } from './isian-sk';
import { PilihBerkas } from './pilih-berkas';
import { PilihUnit } from './pilih-unit';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { CariPegawai, type PegawaiOption } from './cari';

/*
 * Aturan biaya dan pembagiannya (/v1/biaya): biaya yang ditagih ke mahasiswa/PMB (UKT, uang gedung, biaya ujian,
 * formulir) beserta komponen pembagiannya (yayasan, rektorat, fakultas, prodi, unit lain, pejabat, pegawai) dalam
 * persen, nominal, atau sisa. Aturan disusun unit (biaya.susun), wajib ber-SK dari storage, ditetapkan WR bidang
 * keuangan (biaya.setujui), lalu tiap pembayaran yang diterima langsung dibagi dan dijurnal ke unit penerima.
 * Pencairan kas ke unit/yayasan dicatat terpisah (biaya.cairkan). Validasi klop di peramban meniru
 * AturanBiaya::periksa/bagi di backend; backend tetap pemutus akhir.
 */

// ================================================================ Tipe
export type StatusAturanBiaya = 'draf' | 'diajukan' | 'berlaku' | 'ditolak' | 'nonaktif' | 'diganti';
export type SumberBiaya = 'mahasiswa' | 'pmb';
export type PenerimaBiaya = 'unit' | 'prodi_mahasiswa' | 'fakultas_mahasiswa' | 'yayasan' | 'jabatan' | 'pegawai';
export type CaraBiaya = 'persen' | 'nominal' | 'sisa';

export interface KomponenBiaya {
  id?: number;
  urut?: number;
  nama: string;
  penerima: PenerimaBiaya;
  cara: CaraBiaya;
  nilai: number;
  unit_id?: number | null;
  unit?: string | null;
  jabatan_id?: number | null;
  jabatan?: string | null;
  pegawai_id?: number | null;
  pegawai?: string | null;
  akun_id?: number | null;
  akun?: string | null;
  keterangan?: string | null;
  label_penerima?: string;
}

export interface BarisBagi {
  nama: string;
  penerima: PenerimaBiaya;
  cara: CaraBiaya;
  nilai: number;
  jumlah: number;
  penerima_nama?: string;
  unit_id?: number | null;
}
export interface HasilBagi {
  baris: BarisBagi[];
  total: number;
  kurang: number;
}
export interface PeriksaBiaya {
  klop: boolean;
  pesan: string[];
  total_persen: number;
  total_nominal: number;
  contoh: HasilBagi | null;
}

export interface LampiranBiaya {
  id: string;
  jenis: 'sk' | 'lampiran';
  nomor: string | null;
  tanggal: string | null;
  perihal: string | null;
  berkas_id: string;
  nama_file: string | null;
  mime: string | null;
  ukuran: number | null;
  oleh: string | null;
  waktu: string | null;
}

export interface AturanBiaya {
  id: string;
  nomor: number;
  kode: string | null;
  nama: string;
  keterangan: string | null;
  sumber: SumberBiaya;
  kode_biaya: string;
  nama_biaya: string | null;
  cakupan_unit_id: number | null;
  cakupan: string | null;
  cakupan_jenis: string | null;
  penyelenggara_unit_id: number | null;
  penyelenggara: string | null;
  angkatan: string | null;
  tahun_id: string | null;
  tarif: number | null;
  berlaku_mulai: string;
  berlaku_selesai: string | null;
  status: StatusAturanBiaya;
  versi: number;
  revisi_dari: string | null;
  diajukan_oleh: string | null;
  diajukan_at: string | null;
  disetujui_oleh: string | null;
  disetujui_at: string | null;
  catatan_keputusan: string | null;
  dibuat_oleh: string | null;
  diubah_at: string | null;
  komponen: KomponenBiaya[];
  periksa?: PeriksaBiaya;
  jumlah_sk?: number;
}
export interface DetailAturanBiaya extends AturanBiaya {
  periksa: PeriksaBiaya;
  jumlah_sk: number;
  lampiran: LampiranBiaya[];
  dibagi?: { transaksi: number; jumlah: number };
  boleh: { ubah: boolean; ajukan: boolean; setujui: boolean; nonaktifkan: boolean; revisi: boolean; lampiran: boolean };
}

export interface RiwayatAturanBiayaItem {
  aturan_id: number;
  versi: number;
  aksi: string;
  catatan: string | null;
  oleh: string | null;
  waktu: string;
}

export interface HakBiaya {
  izin: Record<string, 'semua' | number[] | null>;
  unit: Array<{ id: number; nama: string; jenis?: string }>;
  boleh: { lihat: boolean; susun: boolean; setujui: boolean; cairkan: boolean; semua_unit: boolean };
  pengguna?: { username: string; nama: string; level: string };
}

export interface ReferensiBiaya {
  jenis_biaya: Array<{ sumber: SumberBiaya; kode: string; nama: string }>;
  unit: Array<{ id: number; kode: string; jenis: string; nama: string; singkatan: string | null; induk_id: number | null; kode_prodi: string | null; kode_fakultas: string | null }>;
  jabatan: Array<{ id: number; kode: string; nama: string; kelompok: string | null }>;
  akun: Array<{ id: number; kode: string; nama: string; jenis: string }>;
  penerima: Array<{ kode: PenerimaBiaya; nama: string }>;
  cara: Array<{ kode: CaraBiaya; nama: string }>;
}

export interface PenerimaRekap {
  jenis: 'unit' | 'yayasan' | 'pegawai';
  unit_id: number | null;
  unit_jenis: string | null;
  pegawai_id: number | null;
  nama: string;
  jumlah: number;
  baris: number;
  dicairkan: number;
  sisa: number;
}
export interface RekapPembagian {
  total: { transaksi: number; jumlah: number };
  per_penerima: PenerimaRekap[];
  per_jenis_penerima: Array<{ penerima: PenerimaBiaya; jumlah: number }>;
  per_biaya: Array<{ sumber: SumberBiaya; kode_biaya: string; nama: string; transaksi: number; jumlah: number }>;
  per_komponen: Array<{ aturan_id: string; aturan: string; komponen: string; cara: CaraBiaya; nilai: number; jumlah: number }>;
  per_bulan: Array<{ bulan: string; jumlah: number }>;
  per_prodi: Array<{ kode_prodi: string; prodi: string; jumlah: number }>;
}
export interface RincianPembagian {
  id: number;
  tanggal: string;
  sumber: SumberBiaya;
  sumber_ref: string;
  nim: string | null;
  kode_prodi: string | null;
  tahun_id: string | null;
  kode_biaya: string;
  dasar: number;
  tagihan: number;
  aturan_id: string;
  aturan: string;
  komponen: string;
  cara: CaraBiaya;
  nilai: number;
  penerima: PenerimaBiaya;
  nama_penerima: string | null;
  unit_id: number | null;
  unit: string | null;
  pemilik_unit: string | null;
  pegawai_id: number | null;
  jumlah: number;
  honor_id: number | null;
  catatan: string | null;
}
export interface RingkasanBiaya {
  tahun: number;
  aturan: { berlaku: number; menunggu_persetujuan: number; draf: number };
  dibagi_tahun_ini: { transaksi: number; jumlah: number };
  dibagi_bulan_ini: { transaksi: number; jumlah: number };
  belum_dicairkan: number;
  per_jenis_penerima: RekapPembagian['per_jenis_penerima'];
  penerima_teratas: PenerimaRekap[];
  per_bulan: RekapPembagian['per_bulan'];
  jenis_biaya_tanpa_aturan: Array<{ sumber?: SumberBiaya; kode_biaya: string; nama: string }>;
}
export interface PencairanBiaya {
  id: string;
  nomor: string;
  penerima: 'unit' | 'yayasan';
  unit_id: number | null;
  unit: string;
  tanggal: string;
  dari: string | null;
  sampai: string | null;
  jumlah: number;
  rekening_asal: string | null;
  rekening_tujuan: string | null;
  jurnal: string | null;
  berkas_id: string | null;
  uraian: string | null;
  status: 'dicatat' | 'dibatalkan';
  oleh: string | null;
  waktu: string | null;
}
export interface SimulasiBiaya {
  aturan: { id: string; nama: string; cakupan_unit_id: number | null; tarif: number | null } | null;
  jumlah?: number;
  tagihan?: number;
  baris: BarisBagi[];
  total: number;
  kurang?: number;
  pesan?: string;
}

export interface FilterAturanBiaya {
  status?: StatusAturanBiaya;
  sumber?: SumberBiaya;
  kode_biaya?: string;
  unit_id?: number;
  berlaku_pada?: string;
  q?: string;
  page?: number;
  per_page?: number;
}
export interface FilterPembagian {
  dari?: string;
  sampai?: string;
  unit_id?: number;
  /** terima = bagian yang diterima unit; asal = bagian dari pembayar unit (prodi/fakultas mahasiswa). */
  arah?: 'terima' | 'asal';
  sumber?: SumberBiaya;
  kode_biaya?: string;
  penerima?: PenerimaBiaya;
  aturan_id?: string;
  kode_prodi?: string;
  tahun_id?: string;
  pegawai_id?: number;
  page?: number;
  per_page?: number;
}

// ================================================================ Label
export const LABEL_STATUS_ATURAN_BIAYA: Record<StatusAturanBiaya, { label: string; variant: 'neutral' | 'info' | 'success' | 'danger' | 'warning' }> = {
  draf: { label: 'Draf', variant: 'neutral' },
  diajukan: { label: 'Menunggu persetujuan', variant: 'warning' },
  berlaku: { label: 'Berlaku', variant: 'success' },
  ditolak: { label: 'Ditolak', variant: 'danger' },
  nonaktif: { label: 'Nonaktif', variant: 'neutral' },
  diganti: { label: 'Diganti revisi', variant: 'info' },
};
export const LABEL_PENERIMA_BIAYA: Record<PenerimaBiaya, string> = {
  unit: 'Unit tertentu',
  prodi_mahasiswa: 'Prodi mahasiswa',
  fakultas_mahasiswa: 'Fakultas mahasiswa',
  yayasan: 'Yayasan',
  jabatan: 'Pejabat',
  pegawai: 'Pegawai',
};
export const LABEL_CARA_BIAYA: Record<CaraBiaya, string> = { persen: 'Persen', nominal: 'Nominal', sisa: 'Sisa' };
export const LABEL_SUMBER_BIAYA: Record<SumberBiaya, string> = { mahasiswa: 'Pembayaran mahasiswa', pmb: 'Pembayaran PMB' };
const LABEL_AKSI_RIWAYAT: Record<string, string> = {
  dibuat: 'Disusun',
  diubah: 'Diubah',
  diajukan: 'Diajukan',
  disetujui: 'Disetujui dan berlaku',
  ditolak: 'Ditolak',
  dikembalikan: 'Dikembalikan',
  dinonaktifkan: 'Dinonaktifkan',
  diganti: 'Diganti revisi',
  revisi: 'Revisi dibuat',
  lampiran: 'SK/lampiran ditambah',
  lampiran_dilepas: 'Lampiran dilepas',
  dihapus: 'Dihapus',
};

/** Teks nilai komponen: "20%", "Rp15.000", atau "Sisa". */
export function nilaiKomponenBiaya(k: Pick<KomponenBiaya, 'cara' | 'nilai'>): string {
  if (k.cara === 'persen') return `${Number(k.nilai).toLocaleString('id-ID', { maximumFractionDigits: 4 })}%`;
  if (k.cara === 'nominal') return formatRupiah(k.nilai);
  return 'Sisa';
}

/** Teks penerima komponen untuk tampilan, mis. "Rektorat", "Prodi mahasiswa", "Dekan". */
export function labelPenerimaBiaya(k: KomponenBiaya, ref?: ReferensiBiaya): string {
  if (k.label_penerima) return k.label_penerima;
  if (k.penerima === 'unit') return k.unit ?? ref?.unit.find((u) => u.id === k.unit_id)?.nama ?? 'Unit';
  if (k.penerima === 'jabatan') return k.jabatan ?? ref?.jabatan.find((j) => j.id === k.jabatan_id)?.nama ?? 'Pejabat';
  if (k.penerima === 'pegawai') return k.pegawai ?? 'Pegawai';
  return LABEL_PENERIMA_BIAYA[k.penerima];
}

const EPS = 0.005;
const angka = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 2 });

/** Sama dengan AturanBiaya::bagi: nominal sebanding bayar/dasar, persen dari bayar, sisa menerima sisanya. */
export function bagiBiaya(komponen: Array<Pick<KomponenBiaya, 'nama' | 'penerima' | 'cara' | 'nilai'>>, bayar: number, dasar: number | null): HasilBagi {
  const faktor = dasar && dasar > 0 ? Math.min(1, bayar / dasar) : 1;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  let baris: BarisBagi[] = komponen.map((k) => ({
    nama: k.nama,
    penerima: k.penerima,
    cara: k.cara,
    nilai: Number(k.nilai) || 0,
    jumlah: k.cara === 'persen' ? r2((bayar * (Number(k.nilai) || 0)) / 100) : k.cara === 'nominal' ? r2((Number(k.nilai) || 0) * faktor) : 0,
  }));
  let total = baris.reduce((s, b) => s + b.jumlah, 0);
  let sisa = r2(bayar - total);
  let kurang = 0;
  if (sisa < -EPS) {
    const skala = total > 0 ? bayar / total : 0;
    baris = baris.map((b) => ({ ...b, jumlah: r2(b.jumlah * skala) }));
    total = baris.reduce((s, b) => s + b.jumlah, 0);
    kurang = r2(-sisa);
    sisa = r2(bayar - total);
  }
  const iSisa = baris.findIndex((b) => b.cara === 'sisa');
  if (iSisa >= 0) baris[iSisa] = { ...baris[iSisa]!, jumlah: r2(baris[iSisa]!.jumlah + sisa) };
  else if (baris.length && Math.abs(sisa) > 0 && Math.abs(sisa) < 1) baris[baris.length - 1] = { ...baris[baris.length - 1]!, jumlah: r2(baris[baris.length - 1]!.jumlah + sisa) };
  return { baris, total: r2(baris.reduce((s, b) => s + b.jumlah, 0)), kurang };
}

/** Sama dengan AturanBiaya::periksa: paling banyak satu "sisa", tanpa sisa total harus tepat tarif (atau 100%). */
export function periksaKomponenBiaya(komponen: Array<Pick<KomponenBiaya, 'nama' | 'penerima' | 'cara' | 'nilai'>>, tarif: number | null): PeriksaBiaya {
  const pesan: string[] = [];
  let persen = 0;
  let nominal = 0;
  let sisa = 0;
  for (const k of komponen) {
    if (k.cara === 'persen') persen += Number(k.nilai) || 0;
    else if (k.cara === 'nominal') nominal += Number(k.nilai) || 0;
    else sisa++;
  }
  if (!komponen.length) pesan.push('Belum ada komponen pembagian.');
  if (sisa > 1) pesan.push('Komponen "sisa" paling banyak satu.');
  if (persen > 100 + EPS) pesan.push(`Jumlah persen melebihi 100% (${angka(persen)}%).`);
  if (tarif != null && tarif > 0) {
    const terpakai = (persen / 100) * tarif + nominal;
    if (terpakai > tarif + EPS) pesan.push(`Persen + nominal (Rp${angka(terpakai)}) melebihi tarif (Rp${angka(tarif)}).`);
    else if (sisa === 0 && Math.abs(terpakai - tarif) > EPS) pesan.push(`Pembagian belum klop: Rp${angka(terpakai)} dari tarif Rp${angka(tarif)}. Tambahkan komponen "sisa" atau sesuaikan nilainya.`);
  } else if (sisa === 0) {
    if (nominal > 0) pesan.push('Komponen nominal tanpa komponen "sisa" butuh tarif standar agar bisa dipastikan klop.');
    else if (Math.abs(persen - 100) > EPS) pesan.push(`Jumlah persen harus 100% (sekarang ${angka(persen)}%), atau tambahkan komponen "sisa".`);
  }
  return { klop: !pesan.length, pesan, total_persen: persen, total_nominal: nominal, contoh: tarif && tarif > 0 && !pesan.length ? bagiBiaya(komponen, tarif, tarif) : null };
}

// ================================================================ Hook data
const bersih = (o: object) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '')) as Record<string, string | number>;

/** Izin pengguna untuk aturan biaya (lihat/susun/setujui/cairkan) beserta unitnya. */
export function useHakBiaya() {
  return useSiakadQuery<HakBiaya>(['biaya', 'saya'], (s, signal) => s.request<HakBiaya>({ method: 'GET', path: '/v1/biaya/saya' }, { signal }), { staleTime: 5 * 60_000 });
}
/** Pilihan form: jenis biaya, unit, jabatan, akun, jenis penerima, cara hitung. */
export function useReferensiBiaya() {
  return useSiakadQuery<ReferensiBiaya>(['biaya', 'referensi'], (s, signal) => s.request<ReferensiBiaya>({ method: 'GET', path: '/v1/biaya/referensi' }, { signal }), { staleTime: 10 * 60_000 });
}
export function useDaftarAturanBiaya(filter: FilterAturanBiaya = {}, opsi: { enabled?: boolean } = {}) {
  return useSiakadQuery<AturanBiaya[]>(['biaya', 'aturan', filter], (s, signal) => s.request<AturanBiaya[]>({ method: 'GET', path: '/v1/biaya/aturan', query: bersih(filter) }, { signal }), opsi);
}
export function useAturanBiaya(id: string | null | undefined) {
  return useSiakadQuery<DetailAturanBiaya>(['biaya', 'aturan', 'detail', id ?? ''], (s, signal) => s.request<DetailAturanBiaya>({ method: 'GET', path: `/v1/biaya/aturan/${id}` }, { signal }), {
    enabled: Boolean(id),
  });
}
export function useRiwayatAturanBiaya(id: string | null | undefined) {
  return useSiakadQuery<RiwayatAturanBiayaItem[]>(
    ['biaya', 'aturan', 'riwayat', id ?? ''],
    (s, signal) => s.request<RiwayatAturanBiayaItem[]>({ method: 'GET', path: `/v1/biaya/aturan/${id}/riwayat` }, { signal }),
    { enabled: Boolean(id) },
  );
}
export function useRekapPembagianBiaya(filter: FilterPembagian = {}) {
  return useSiakadQuery<RekapPembagian>(['biaya', 'pembagian', filter], (s, signal) => s.request<RekapPembagian>({ method: 'GET', path: '/v1/biaya/pembagian', query: bersih(filter) }, { signal }));
}
export function useRincianPembagianBiaya(filter: FilterPembagian = {}) {
  return useSiakadQuery<RincianPembagian[]>(['biaya', 'rincian', filter], (s, signal) =>
    s.request<RincianPembagian[]>({ method: 'GET', path: '/v1/biaya/pembagian/rincian', query: bersih(filter) }, { signal }),
  );
}
export function useRingkasanBiaya(tahun?: number) {
  return useSiakadQuery<RingkasanBiaya>(['biaya', 'ringkasan', tahun ?? ''], (s, signal) =>
    s.request<RingkasanBiaya>({ method: 'GET', path: '/v1/biaya/ringkasan', query: bersih({ tahun }) }, { signal }),
  );
}
export function useDaftarPencairanBiaya(filter: { unit_id?: number; penerima?: 'unit' | 'yayasan'; dari?: string; sampai?: string; page?: number; per_page?: number } = {}) {
  return useSiakadQuery<PencairanBiaya[]>(['biaya', 'pencairan', filter], (s, signal) =>
    s.request<PencairanBiaya[]>({ method: 'GET', path: '/v1/biaya/pencairan', query: bersih(filter) }, { signal }),
  );
}

// ================================================================ Bagian kecil
export function StatusAturanBiayaBadge({ status }: { status: StatusAturanBiaya }) {
  const s = LABEL_STATUS_ATURAN_BIAYA[status] ?? { label: status, variant: 'neutral' as const };
  return (
    <Badge variant={s.variant} dot>
      {s.label}
    </Badge>
  );
}

/** Batang proporsi komponen pada tarif (atau contoh pembagian), dengan legenda. */
export function BatangKomponenBiaya({ hasil, className }: { hasil: HasilBagi | null | undefined; className?: string }) {
  if (!hasil || !hasil.baris.length || hasil.total <= 0) return null;
  return (
    <div className={cn('u-biaya-batang', className)}>
      <div className="u-biaya-batang-isi" role="img" aria-label={hasil.baris.map((b) => `${b.nama} ${formatRupiah(b.jumlah)}`).join(', ')}>
        {hasil.baris.map((b, i) => (
          <span key={i} style={{ flexGrow: Math.max(b.jumlah, 0), background: `var(--u-chart-${(i % 8) + 1})` }} title={`${b.nama}: ${formatRupiah(b.jumlah)}`} />
        ))}
      </div>
      <ul className="u-biaya-legenda">
        {hasil.baris.map((b, i) => (
          <li key={i}>
            <i style={{ background: `var(--u-chart-${(i % 8) + 1})` }} aria-hidden />
            <span>{b.penerima_nama ?? b.nama}</span>
            <strong>{formatRupiah(b.jumlah)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ================================================================ Formulir aturan
type IsiKomponen = {
  nama: string;
  penerima: PenerimaBiaya;
  cara: CaraBiaya;
  nilai: string;
  unit_id: string;
  jabatan_id: string;
  pegawai_id: string;
  pegawai: string;
  akun_id: string;
  keterangan: string;
};
const komponenKosong = (penerima: PenerimaBiaya = 'yayasan', cara: CaraBiaya = 'persen'): IsiKomponen => ({
  nama: '',
  penerima,
  cara,
  nilai: '',
  unit_id: '',
  jabatan_id: '',
  pegawai_id: '',
  pegawai: '',
  akun_id: '',
  keterangan: '',
});
type IsiAturan = {
  nama: string;
  kode: string;
  keterangan: string;
  sumber: SumberBiaya;
  kode_biaya: string;
  cakupan_unit_id: string;
  penyelenggara_unit_id: string;
  angkatan: string;
  tahun_id: string;
  tarif: string;
  berlaku_mulai: string;
  berlaku_selesai: string;
  komponen: IsiKomponen[];
};
const hariIni = () => new Date().toISOString().slice(0, 10);
function dariAturan(a?: AturanBiaya | null): IsiAturan {
  if (!a)
    return {
      nama: '',
      kode: '',
      keterangan: '',
      sumber: 'mahasiswa',
      kode_biaya: '',
      cakupan_unit_id: '',
      penyelenggara_unit_id: '',
      angkatan: '',
      tahun_id: '',
      tarif: '',
      berlaku_mulai: hariIni(),
      berlaku_selesai: '',
      komponen: [komponenKosong('yayasan', 'persen'), komponenKosong('prodi_mahasiswa', 'sisa')],
    };
  const s = (v: unknown) => (v == null ? '' : String(v));
  return {
    nama: a.nama,
    kode: s(a.kode),
    keterangan: s(a.keterangan),
    sumber: a.sumber,
    kode_biaya: a.kode_biaya,
    cakupan_unit_id: s(a.cakupan_unit_id),
    penyelenggara_unit_id: s(a.penyelenggara_unit_id),
    angkatan: s(a.angkatan),
    tahun_id: s(a.tahun_id),
    tarif: s(a.tarif),
    berlaku_mulai: a.berlaku_mulai,
    berlaku_selesai: s(a.berlaku_selesai),
    komponen: a.komponen.map((k) => ({
      nama: k.nama,
      penerima: k.penerima,
      cara: k.cara,
      nilai: k.cara === 'sisa' ? '' : s(k.nilai),
      unit_id: s(k.unit_id),
      jabatan_id: s(k.jabatan_id),
      pegawai_id: s(k.pegawai_id),
      pegawai: s(k.pegawai),
      akun_id: s(k.akun_id),
      keterangan: s(k.keterangan),
    })),
  };
}
const keKomponen = (k: IsiKomponen) => ({ nama: k.nama, penerima: k.penerima, cara: k.cara, nilai: k.cara === 'sisa' ? 0 : Number(k.nilai) || 0 });

/** Isian satu komponen pembagian (nilai sebagai teks) untuk {@link IsianKomponenBiaya}. */
export type IsiKomponenBiaya = IsiKomponen;
/** Komponen awal aturan baru: yayasan (persen) dan sisanya ke prodi mahasiswa. */
export const komponenBiayaAwal = (): IsiKomponenBiaya[] => [komponenKosong('yayasan', 'persen'), komponenKosong('prodi_mahasiswa', 'sisa')];

/** Periksa isian komponen; kunci galat `komponen.{i}.{isian}` sesuai prop `galat` IsianKomponenBiaya. */
export function galatKomponenBiaya(komponen: IsiKomponenBiaya[]): Record<string, string> {
  const g: Record<string, string> = {};
  komponen.forEach((k, i) => {
    if (!k.nama.trim()) g[`komponen.${i}.nama`] = 'Nama wajib.';
    if (k.cara !== 'sisa' && !(Number(k.nilai) > 0)) g[`komponen.${i}.nilai`] = 'Isi nilai lebih dari 0.';
    if (k.penerima === 'unit' && !k.unit_id) g[`komponen.${i}.unit_id`] = 'Pilih unit.';
    if (k.penerima === 'jabatan' && !k.jabatan_id) g[`komponen.${i}.jabatan_id`] = 'Pilih jabatan.';
    if (k.penerima === 'pegawai' && !k.pegawai_id) g[`komponen.${i}.pegawai_id`] = 'Pilih pegawai.';
  });
  return g;
}

/** Bentuk kiriman komponen untuk POST /v1/biaya/aturan. */
export function kirimanKomponenBiaya(komponen: IsiKomponenBiaya[]) {
  const n = (v: string) => (v === '' ? null : Number(v));
  return komponen.map((k) => ({
    nama: k.nama.trim(),
    penerima: k.penerima,
    cara: k.cara,
    nilai: k.cara === 'sisa' ? 0 : Number(k.nilai),
    unit_id: k.penerima === 'unit' ? n(k.unit_id) : null,
    jabatan_id: k.penerima === 'jabatan' ? n(k.jabatan_id) : null,
    pegawai_id: k.penerima === 'pegawai' ? n(k.pegawai_id) : null,
    akun_id: n(k.akun_id),
    keterangan: k.keterangan.trim() || null,
  }));
}

/** Cari pegawai untuk komponen honor pegawai tertentu (GET /v1/biaya/pegawai, lingkup hak biaya). */
function PilihPegawaiBiaya({ value, nama, onValueChange }: { value: string; nama: string; onValueChange: (id: string, nama: string) => void }) {
  const siakad = useSiakad();
  const muat = React.useCallback(
    async (q: string, signal: AbortSignal) =>
      (await siakad.request<Array<{ id: number; nama: string; nip: string | null; nidn: string | null; jenis: string | null }>>({ method: 'GET', path: '/v1/biaya/pegawai', query: { q } }, { signal })).data.map(
        (p): PegawaiOption => ({ id: p.id, nama: p.nama, nip: p.nip, nidn: p.nidn, jenis: p.jenis === 'dosen' || p.jenis === 'tendik' ? p.jenis : undefined }),
      ),
    [siakad],
  );
  return (
    <CariPegawai
      load={muat}
      minQueryLength={2}
      hintText="Ketik minimal 2 huruf nama, NIP, atau NIDN."
      value={value ? { id: Number(value), nama: nama || 'Pegawai terpilih' } : null}
      onValueChange={(p) => onValueChange(p ? String(p.id) : '', p ? p.nama_lengkap || p.nama : '')}
      aria-label="Pegawai penerima"
    />
  );
}

/** Daftar komponen pembagian yang bisa ditambah/diubah/diurutkan, dengan pratinjau klop pada tarif. */
export function IsianKomponenBiaya({
  value,
  onValueChange,
  tarif,
  referensi,
  galat,
}: {
  value: IsiKomponen[];
  onValueChange: (v: IsiKomponen[]) => void;
  tarif: number | null;
  referensi: ReferensiBiaya | undefined;
  galat?: Record<string, string>;
}) {
  const ubah = (i: number, p: Partial<IsiKomponen>) => onValueChange(value.map((k, j) => (j === i ? { ...k, ...p } : k)));
  const geser = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const v = [...value];
    [v[i], v[j]] = [v[j]!, v[i]!];
    onValueChange(v);
  };
  const cek = periksaKomponenBiaya(value.map(keKomponen), tarif);
  const opsiPenerima: SelectOption<string>[] = (referensi?.penerima ?? (Object.keys(LABEL_PENERIMA_BIAYA) as PenerimaBiaya[]).map((k) => ({ kode: k, nama: LABEL_PENERIMA_BIAYA[k] }))).map((p) => ({
    value: p.kode,
    label: LABEL_PENERIMA_BIAYA[p.kode] ?? p.nama,
    description: p.nama,
  }));
  const opsiJabatan: SelectOption<string>[] = (referensi?.jabatan ?? []).map((j) => ({ value: String(j.id), label: j.nama, group: j.kelompok?.replace(/_/g, ' ') ?? undefined }));
  const opsiAkun: SelectOption<string>[] = (referensi?.akun ?? []).map((a) => ({ value: String(a.id), label: `${a.kode} ${a.nama}`, group: a.jenis }));
  const sisaAda = value.filter((k) => k.cara === 'sisa').length;
  return (
    <div className="u-biaya-komponen">
      <ol className="u-biaya-komponen-daftar">
        {value.map((k, i) => (
          <li key={i} className="u-biaya-komponen-butir">
            <div className="u-biaya-komponen-kepala">
              <span className="u-biaya-komponen-no" style={{ background: `var(--u-chart-${(i % 8) + 1})` }}>
                {i + 1}
              </span>
              <Input
                value={k.nama}
                maxLength={150}
                placeholder="Nama komponen, mis. Bagian yayasan"
                aria-label={`Nama komponen ${i + 1}`}
                aria-invalid={Boolean(galat?.[`komponen.${i}.nama`]) || undefined}
                onChange={(e) => ubah(i, { nama: e.target.value })}
              />
              <Menu
                trigger={
                  <Button variant="ghost" size="sm" iconOnly aria-label={`Aksi komponen ${i + 1}`}>
                    <MoreHorizontal />
                  </Button>
                }
                items={[
                  { label: 'Naikkan', onSelect: () => geser(i, -1), disabled: i === 0 },
                  { label: 'Turunkan', onSelect: () => geser(i, 1), disabled: i === value.length - 1 },
                  { type: 'separator' },
                  { label: 'Hapus komponen', icon: <Trash2 />, destructive: true, onSelect: () => onValueChange(value.filter((_, j) => j !== i)) },
                ]}
              />
            </div>
            <div className="u-biaya-komponen-isian">
              <Field label="Penerima" required>
                <Pilihan
                  options={opsiPenerima}
                  value={k.penerima}
                  required
                  tampilan="daftar"
                  onValueChange={(v) => v && ubah(i, { penerima: v as PenerimaBiaya, unit_id: '', jabatan_id: '', pegawai_id: '', pegawai: '' })}
                />
              </Field>
              {k.penerima === 'unit' && (
                <Field label="Unit" required error={galat?.[`komponen.${i}.unit_id`]}>
                  <PilihUnit data={referensi?.unit} memuat={!referensi} value={k.unit_id || null} placeholder="Pilih unit" onValueChange={(v) => ubah(i, { unit_id: v == null ? '' : String(v) })} />
                </Field>
              )}
              {k.penerima === 'jabatan' && (
                <Field
                  label="Jabatan"
                  required
                  error={galat?.[`komponen.${i}.jabatan_id`]}
                  description="Pejabat ditentukan saat pembayaran: dekan/kaprodi mengikuti fakultas/prodi mahasiswa pembayar."
                >
                  <Pilihan options={opsiJabatan} value={k.jabatan_id || null} tampilan="cari" placeholder="Pilih jabatan" onValueChange={(v) => ubah(i, { jabatan_id: v ?? '' })} />
                </Field>
              )}
              {k.penerima === 'pegawai' && (
                <Field label="Pegawai" required error={galat?.[`komponen.${i}.pegawai_id`]}>
                  <PilihPegawaiBiaya value={k.pegawai_id} nama={k.pegawai} onValueChange={(id, nama) => ubah(i, { pegawai_id: id, pegawai: nama })} />
                </Field>
              )}
              <Field label="Cara hitung" required>
                <Pilihan
                  tampilan="tombol"
                  required
                  options={(['persen', 'nominal', 'sisa'] as CaraBiaya[]).map((c) => ({ value: c, label: LABEL_CARA_BIAYA[c], disabled: c === 'sisa' && sisaAda > 0 && k.cara !== 'sisa' }))}
                  value={k.cara}
                  onValueChange={(v) => v && ubah(i, { cara: v as CaraBiaya, nilai: v === 'sisa' ? '' : k.nilai })}
                />
              </Field>
              {k.cara !== 'sisa' ? (
                <Field label={k.cara === 'persen' ? 'Persen dari pembayaran' : 'Nominal per tarif penuh'} required error={galat?.[`komponen.${i}.nilai`]}>
                  <Input
                    inputMode="decimal"
                    value={k.nilai}
                    placeholder={k.cara === 'persen' ? 'mis. 20' : 'mis. 15000'}
                    onChange={(e) => ubah(i, { nilai: e.target.value.replace(/[^\d.,]/g, '').replace(',', '.') })}
                  />
                </Field>
              ) : (
                <Field label="Nilai" description="Menerima sisa setelah komponen lain, termasuk selisih pembulatan.">
                  <Input value="Sisa pembayaran" disabled />
                </Field>
              )}
              {['prodi_mahasiswa', 'fakultas_mahasiswa', 'unit'].includes(k.penerima) && opsiAkun.length > 0 && (
                <Field label="Akun pendapatan unit" optional description="Kosongkan untuk memakai akun jenis biaya.">
                  <Pilihan
                    options={opsiAkun.filter((o) => o.group === 'pendapatan')}
                    value={k.akun_id || null}
                    tampilan="cari"
                    placeholder="Bawaan"
                    onValueChange={(v) => ubah(i, { akun_id: v ?? '' })}
                  />
                </Field>
              )}
            </div>
            {cek.contoh && <p className="u-biaya-komponen-contoh">Dari tarif penuh: {formatRupiah(cek.contoh.baris[i]?.jumlah ?? 0)}</p>}
          </li>
        ))}
      </ol>
      <Button type="button" variant="outline" size="sm" onClick={() => onValueChange([...value, komponenKosong('unit', sisaAda ? 'persen' : 'sisa')])}>
        <Plus /> Tambah komponen
      </Button>
      <div className="u-biaya-klop" data-klop={cek.klop || undefined} aria-live="polite">
        {cek.klop ? <CircleCheck aria-hidden /> : <CircleAlert aria-hidden />}
        <div>
          <strong>{cek.klop ? 'Pembagian klop' : 'Pembagian belum klop'}</strong>
          <span>
            {cek.klop ? `Total ${angka(cek.total_persen)}% + ${formatRupiah(cek.total_nominal)}${sisaAda ? ' + sisa' : ''}${tarif ? ` = ${formatRupiah(tarif)}` : ''}.` : cek.pesan.join(' ')}
          </span>
        </div>
      </div>
      {cek.contoh && <BatangKomponenBiaya hasil={cek.contoh} />}
    </div>
  );
}

export interface FormAturanBiayaProps {
  /** Aturan yang diubah (draf/ditolak); kosong untuk menyusun baru. */
  aturan?: AturanBiaya | null;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  onTersimpan?: (a: DetailAturanBiaya) => void;
  /** Unit cakupan bawaan saat menyusun baru (mis. fakultas pemakai aplikasi). */
  unitBawaan?: number | null;
  /** Isian awal saat menyusun baru, mis. dari daftar jenis biaya kasir unit. */
  bawaan?: { kode_biaya?: string; nama?: string; tarif?: number | null };
}

/** Susun/ubah aturan biaya (POST /v1/biaya/aturan, /v1/biaya/aturan/{id}) dengan komponen dan pratinjau klop. */
export function FormAturanBiaya({ aturan, trigger, open, onOpenChange, onTersimpan, unitBawaan, bawaan }: FormAturanBiayaProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const ref = useReferensiBiaya();
  const { kode_biaya: kodeBawaan, nama: namaBawaan, tarif: tarifBawaan } = bawaan ?? {};
  const awal = React.useMemo(() => {
    const a = dariAturan(aturan);
    if (!aturan && unitBawaan) a.cakupan_unit_id = a.penyelenggara_unit_id = String(unitBawaan);
    if (!aturan && kodeBawaan) a.kode_biaya = kodeBawaan;
    if (!aturan && namaBawaan) a.nama = namaBawaan;
    if (!aturan && tarifBawaan) a.tarif = String(Math.round(tarifBawaan));
    return a;
  }, [aturan, unitBawaan, kodeBawaan, namaBawaan, tarifBawaan]);
  const [isi, setIsi] = React.useState<IsiAturan>(awal);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [inner, setInner] = React.useState(false);
  const isOpen = open ?? inner;
  React.useEffect(() => {
    if (isOpen) {
      setIsi(awal);
      setGalat({});
    }
  }, [isOpen, awal]);
  const set = <K extends keyof IsiAturan>(k: K, v: IsiAturan[K]) => {
    setIsi((x) => ({ ...x, [k]: v }));
    setGalat((g) => ({ ...g, [k]: '' }));
  };
  const jenisBiaya = (ref.data?.jenis_biaya ?? []).filter((j) => j.sumber === isi.sumber).map((j) => ({ value: j.kode, label: j.nama, description: j.kode }));
  const tarif = isi.tarif ? Number(isi.tarif) : null;
  return (
    <PanelForm
      open={isOpen}
      onOpenChange={(o) => {
        setInner(o);
        onOpenChange?.(o);
      }}
      trigger={trigger}
      size="xl"
      title={aturan ? `Ubah ${aturan.nama}` : 'Susun aturan biaya'}
      description="Aturan disimpan sebagai draf. Lampirkan SK, lalu ajukan ke WR bidang keuangan untuk ditetapkan."
      berubah={JSON.stringify(isi) !== JSON.stringify(awal)}
      labelSimpan={aturan ? 'Simpan perubahan' : 'Simpan draf'}
      onSimpan={async () => {
        const g: Record<string, string> = {};
        if (!isi.nama.trim()) g.nama = 'Nama aturan wajib diisi.';
        if (!isi.kode_biaya) g.kode_biaya = 'Pilih jenis biaya.';
        if (!isi.berlaku_mulai) g.berlaku_mulai = 'Tanggal mulai berlaku wajib diisi.';
        Object.assign(g, galatKomponenBiaya(isi.komponen));
        setGalat(g);
        if (Object.keys(g).length) return 'Periksa isian yang ditandai.';
        const n = (v: string) => (v === '' ? null : Number(v));
        const body = {
          nama: isi.nama.trim(),
          kode: isi.kode.trim() || null,
          keterangan: isi.keterangan.trim() || null,
          sumber: isi.sumber,
          kode_biaya: isi.kode_biaya,
          cakupan_unit_id: n(isi.cakupan_unit_id),
          penyelenggara_unit_id: n(isi.penyelenggara_unit_id),
          angkatan: isi.angkatan.trim() || null,
          tahun_id: isi.tahun_id.trim() || null,
          tarif: tarif,
          berlaku_mulai: isi.berlaku_mulai,
          berlaku_selesai: isi.berlaku_selesai || null,
          komponen: kirimanKomponenBiaya(isi.komponen),
        };
        let r;
        try {
          r = await siakad.request<DetailAturanBiaya>({ method: 'POST', path: aturan ? `/v1/biaya/aturan/${aturan.id}` : '/v1/biaya/aturan', body });
        } catch (e) {
          const f = (e as { fields?: Record<string, unknown> }).fields;
          if (f && Object.keys(f).length) {
            setGalat(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, String(v)])));
            return Object.values(f).map(String).join(' ') || 'Periksa isian yang ditandai.';
          }
          throw e;
        }
        invalidateSiakad('biaya');
        toast.add({ title: aturan ? 'Aturan diperbarui' : 'Draf aturan disimpan', description: 'Lampirkan SK lalu ajukan untuk ditetapkan.', type: 'success' });
        if (r.data) onTersimpan?.(r.data);
      }}
    >
      {ref.error && <GalatApi error={ref.error} onRetry={ref.refetch} />}
      <BagianForm judul="Aturan" kolom={2}>
        <Field label="Nama aturan" required className="u-form-lebar" error={galat.nama || undefined}>
          <Input value={isi.nama} maxLength={200} placeholder="mis. Biaya ujian akhir semester FIK 2026" onChange={(e) => set('nama', e.target.value)} />
        </Field>
        <Field label="Sumber tagihan" required>
          <Pilihan
            tampilan="tombol"
            required
            options={[
              { value: 'mahasiswa', label: 'Mahasiswa' },
              { value: 'pmb', label: 'PMB' },
            ]}
            value={isi.sumber}
            onValueChange={(v) => v && setIsi((x) => ({ ...x, sumber: v as SumberBiaya, kode_biaya: '' }))}
          />
        </Field>
        <Field label="Jenis biaya" required error={galat.kode_biaya || undefined}>
          <Pilihan options={jenisBiaya} value={isi.kode_biaya || null} tampilan="cari" placeholder="Pilih jenis biaya" onValueChange={(v) => set('kode_biaya', v ?? '')} />
        </Field>
        <Field label="Berlaku untuk" optional description="Kosong = seluruh universitas. Aturan unit yang lebih khusus didahulukan.">
          <PilihUnit
            data={ref.data?.unit}
            memuat={ref.loading}
            jenis={['universitas', 'fakultas', 'prodi']}
            value={isi.cakupan_unit_id || null}
            placeholder="Seluruh universitas"
            onValueChange={(v) => set('cakupan_unit_id', v == null ? '' : String(v))}
          />
        </Field>
        <Field label="Unit penyelenggara" optional description="Unit yang mengadakan kegiatan, mis. fakultas untuk ujian.">
          <PilihUnit
            data={ref.data?.unit}
            memuat={ref.loading}
            value={isi.penyelenggara_unit_id || null}
            placeholder="Sama dengan cakupan"
            onValueChange={(v) => set('penyelenggara_unit_id', v == null ? '' : String(v))}
          />
        </Field>
        <Field label="Tarif standar" optional description="Dasar komponen nominal. Kosongkan bila tarif berbeda per mahasiswa (mis. UKT per golongan) dan pakai persen.">
          <Input inputMode="numeric" value={isi.tarif} placeholder="mis. 300000" onChange={(e) => set('tarif', e.target.value.replace(/[^\d]/g, ''))} />
        </Field>
        <Field label="Angkatan" optional description="Periode mahasiswa masuk. Kosong = semua angkatan.">
          <PilihTahunAkademik value={isi.angkatan || null} placeholder="Semua angkatan" aria-label="Angkatan" onValueChange={(v) => set('angkatan', v ?? '')} />
        </Field>
        <Field label="Berlaku mulai" required error={galat.berlaku_mulai || undefined}>
          <IsianTanggal value={isi.berlaku_mulai || null} onValueChange={(v) => set('berlaku_mulai', v ?? '')} />
        </Field>
        <Field label="Berlaku sampai" optional>
          <IsianTanggal value={isi.berlaku_selesai || null} min={isi.berlaku_mulai || undefined} onValueChange={(v) => set('berlaku_selesai', v ?? '')} />
        </Field>
        <Field label="Kode" optional>
          <Input value={isi.kode} maxLength={50} placeholder="mis. UAS-FIK-2026" onChange={(e) => set('kode', e.target.value)} />
        </Field>
        <Field label="Keterangan" optional className="u-form-lebar">
          <Textarea value={isi.keterangan} rows={2} maxLength={2000} onChange={(e) => set('keterangan', e.target.value)} />
        </Field>
      </BagianForm>
      <BagianForm
        judul="Komponen pembagian"
        kolom={1}
        keterangan="Bagian tiap penerima dari setiap pembayaran. Dicatat ke buku besar unit penerima saat pembayaran diterima; honor pejabat/pegawai masuk ke honor SDM."
      >
        <IsianKomponenBiaya value={isi.komponen} onValueChange={(v) => set('komponen', v)} tarif={tarif} referensi={ref.data} galat={galat} />
      </BagianForm>
    </PanelForm>
  );
}

// ================================================================ Lampiran SK
/** SK dan lampiran aturan biaya: daftar, unduh, lampirkan dari storage, lepas. SK wajib sebelum diajukan. */
export function LampiranAturanBiaya({ aturan: a }: { aturan: DetailAturanBiaya }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [unduh, setUnduh] = React.useState<string | null>(null);
  const sk = a.lampiran.filter((l) => l.jenis === 'sk');
  const ambil = async (l: LampiranBiaya) => {
    setUnduh(l.id);
    try {
      const r = await siakad.request<unknown>({ method: 'GET', path: `/v1/biaya/aturan/${a.id}/lampiran/${l.id}`, query: { unduh: '1' } });
      const d = r.data as { blob?: () => Blob } | Blob | null;
      const blob = d instanceof Blob ? d : d && typeof d === 'object' && typeof d.blob === 'function' ? d.blob() : null;
      if (!blob) throw new Error('Berkas tidak dapat diunduh.');
      const url = URL.createObjectURL(blob);
      const el = document.createElement('a');
      el.href = url;
      el.download = l.nama_file ?? `SK-${l.nomor ?? l.id}.pdf`;
      el.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      toast.add({ title: 'Gagal mengunduh', description: pesanGalat(e), type: 'error' });
    } finally {
      setUnduh(null);
    }
  };
  return (
    <div className="u-aturan-lampiran">
      {!sk.length && (
        <Alert variant="warning" title="Belum ada SK">
          Lampirkan SK penetapan biaya dari storage. Aturan tanpa SK tidak bisa diajukan maupun ditetapkan.
        </Alert>
      )}
      {a.lampiran.length > 0 && (
        <ul className="u-aturan-berkas">
          {a.lampiran.map((l) => (
            <li key={l.id}>
              <span className="u-aturan-berkas-ikon" data-jenis={l.jenis} aria-hidden>
                {l.jenis === 'sk' ? <FileBadge /> : <FileText />}
              </span>
              <div className="u-aturan-berkas-isi">
                <strong>{l.jenis === 'sk' ? `SK ${l.nomor ?? ''}`.trim() : (l.perihal ?? 'Lampiran')}</strong>
                <span>{[l.tanggal && formatDate(l.tanggal), l.jenis === 'sk' ? l.perihal : null, l.nama_file].filter(Boolean).join(' · ')}</span>
              </div>
              <Button variant="ghost" size="sm" iconOnly aria-label={`Unduh ${l.nama_file ?? 'berkas'}`} loading={unduh === l.id} onClick={() => ambil(l)}>
                <Download />
              </Button>
              {a.boleh.lampiran && (
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="sm" iconOnly aria-label="Lepas lampiran">
                      <Trash2 />
                    </Button>
                  }
                  title="Lepas lampiran?"
                  description="Berkas tetap ada di storage dan riwayat, tetapi tidak lagi menjadi dasar aturan."
                  confirmLabel="Lepas lampiran"
                  onConfirm={async () => {
                    await siakad.request({ method: 'POST', path: `/v1/biaya/aturan/${a.id}/lampiran/${l.id}/hapus`, body: {} });
                    invalidateSiakad('biaya');
                    toast.add({ title: 'Lampiran dilepas', type: 'success' });
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {a.boleh.lampiran && (
        <FormLampiranBiaya
          aturanId={a.id}
          trigger={
            <Button variant={sk.length ? 'outline' : 'primary'} size="sm">
              <Plus /> {sk.length ? 'Tambah lampiran' : 'Lampirkan SK'}
            </Button>
          }
        />
      )}
    </div>
  );
}

/** Lampirkan SK/dokumen (POST /v1/biaya/aturan/{id}/lampiran): unggah ke storage atau pilih dari berkas saya. */
export function FormLampiranBiaya({ aturanId, trigger, open, onOpenChange }: { aturanId: string; trigger?: React.ReactElement; open?: boolean; onOpenChange?: (o: boolean) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const kosong = { berkas_id: '', jenis: 'sk', nomor: '', tanggal: '', perihal: '', sk_id: '' };
  const [isi, setIsi] = React.useState(kosong);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [inner, setInner] = React.useState(false);
  const isOpen = open ?? inner;
  React.useEffect(() => {
    if (isOpen) {
      setIsi(kosong);
      setGalat({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  const set = (k: keyof typeof kosong, v: string) => {
    setIsi((x) => ({ ...x, [k]: v }));
    setGalat((g) => ({ ...g, [k]: '' }));
  };
  return (
    <PanelForm
      open={isOpen}
      onOpenChange={(o) => {
        setInner(o);
        onOpenChange?.(o);
      }}
      trigger={trigger}
      title="Lampirkan dokumen"
      description="Berkas disimpan di storage kampus. SK menjadi dasar aturan dan bisa dibuka semua unit terkait setelah aturan berlaku."
      berubah={JSON.stringify(isi) !== JSON.stringify(kosong)}
      labelSimpan="Lampirkan"
      onSimpan={async () => {
        const g: Record<string, string> = {};
        // SK dari registri sudah berberkas di sana (tidak diunggah ulang).
        if (!isi.berkas_id && !isi.sk_id) g.berkas_id = 'Unggah atau pilih berkas.';
        if (isi.jenis === 'sk' && !isi.nomor.trim()) g.nomor = 'Nomor SK wajib diisi.';
        setGalat(g);
        if (Object.keys(g).length) return 'Periksa isian yang ditandai.';
        try {
          await siakad.request({
            method: 'POST',
            path: `/v1/biaya/aturan/${aturanId}/lampiran`,
            body: isi.jenis === 'sk' && isi.sk_id ? { sk_id: isi.sk_id, jenis: 'sk', berkas_id: isi.berkas_id || undefined } : { berkas_id: isi.berkas_id, jenis: isi.jenis, nomor: isi.nomor.trim() || null, tanggal: isi.tanggal || null, perihal: isi.perihal.trim() || null },
          });
        } catch (e) {
          const f = (e as { fields?: Record<string, unknown> }).fields;
          if (f && Object.keys(f).length) {
            setGalat(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, String(v)])));
            return 'Periksa isian yang ditandai.';
          }
          throw e;
        }
        invalidateSiakad('biaya');
        toast.add({ title: isi.jenis === 'sk' ? 'SK dilampirkan' : 'Lampiran ditambahkan', type: 'success' });
      }}
    >
      <BagianForm kolom={2}>
        <Field label="Jenis" required className="u-form-lebar">
          <Pilihan
            tampilan="tombol"
            required
            options={[
              { value: 'sk', label: 'Surat keputusan' },
              { value: 'lampiran', label: 'Lampiran lain' },
            ]}
            value={isi.jenis}
            onValueChange={(v) => v && set('jenis', v)}
          />
        </Field>
        <Field label="Berkas" required className="u-form-lebar" error={galat.berkas_id || undefined}>
          <PilihBerkas
            value={isi.berkas_id || null}
            onValueChange={(v) => set('berkas_id', v ?? '')}
            accept=".pdf,.jpg,.jpeg,.png"
            kategori="dokumen"
            modul="biaya"
            invalid={Boolean(galat.berkas_id)}
          />
        </Field>
        <Field label="Nomor" required={isi.jenis === 'sk'} optional={isi.jenis !== 'sk'} error={galat.nomor || undefined}>
          {isi.jenis === 'sk' ? (
            <PilihNomorSK
              value={isi.nomor || null}
              onValueChange={(nomor, sk) => {
                set('nomor', nomor ?? '');
                set('sk_id', sk?.id ?? '');
                if (sk?.tanggal && !isi.tanggal) set('tanggal', sk.tanggal);
                if (sk?.perihal && !isi.perihal) set('perihal', sk.perihal);
              }}
            />
          ) : (
            <Input value={isi.nomor} maxLength={100} onChange={(e) => set('nomor', e.target.value)} />
          )}
        </Field>
        <Field label="Tanggal" optional>
          <IsianTanggal value={isi.tanggal || null} onValueChange={(v) => set('tanggal', v ?? '')} />
        </Field>
        <Field label="Perihal" optional className="u-form-lebar">
          <Input value={isi.perihal} maxLength={255} placeholder="mis. Penetapan biaya ujian akhir semester" onChange={(e) => set('perihal', e.target.value)} />
        </Field>
      </BagianForm>
    </PanelForm>
  );
}

// ================================================================ Riwayat
/** Linimasa aturan: disusun, diubah, diajukan, keputusan, lampiran, termasuk versi yang direvisinya. */
export function RiwayatAturanBiaya({ id }: { id: string }) {
  const q = useRiwayatAturanBiaya(id);
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  if (q.loading && !q.data) return <Skeleton style={{ height: 120 }} />;
  if (!q.data?.length) return <Empty title="Belum ada riwayat" />;
  return (
    <ol className="u-biaya-riwayat">
      {q.data.map((r, i) => (
        <li key={i}>
          <span className="u-biaya-riwayat-titik" data-aksi={r.aksi} aria-hidden />
          <div>
            <strong>
              {LABEL_AKSI_RIWAYAT[r.aksi] ?? r.aksi} <small>versi {r.versi}</small>
            </strong>
            <span>{[r.oleh, r.waktu && formatDate(r.waktu.replace(' ', 'T'), 'long')].filter(Boolean).join(' · ')}</span>
            {r.catatan && <p>{r.catatan}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ================================================================ Detail + alur
type AksiAlur = 'ajukan' | 'setujui' | 'tolak' | 'kembalikan' | 'nonaktifkan' | 'revisi';
const TEKS_ALUR: Record<AksiAlur, { judul: string; tombol: string; catatan: 'wajib' | 'opsional'; desk: string; tanggal?: string }> = {
  ajukan: { judul: 'Ajukan untuk ditetapkan', tombol: 'Ajukan', catatan: 'opsional', desk: 'Aturan dikirim ke WR bidang keuangan. Selama diajukan, aturan tidak bisa diubah.' },
  setujui: { judul: 'Tetapkan aturan', tombol: 'Tetapkan', catatan: 'opsional', desk: 'Aturan langsung berlaku. Pembayaran sejak tanggal mulai berlaku dibagi dan dijurnal ke unit penerima.' },
  tolak: { judul: 'Tolak aturan', tombol: 'Tolak', catatan: 'wajib', desk: 'Penyusun melihat alasan penolakan dan bisa memperbaiki lalu mengajukan lagi.' },
  kembalikan: { judul: 'Kembalikan untuk diperbaiki', tombol: 'Kembalikan', catatan: 'wajib', desk: 'Aturan kembali menjadi draf.' },
  nonaktifkan: {
    judul: 'Nonaktifkan aturan',
    tombol: 'Nonaktifkan',
    catatan: 'wajib',
    desk: 'Pembayaran sesudah tanggal berakhir tidak dibagi lagi. Pembagian yang sudah tercatat tetap.',
    tanggal: 'Berakhir pada',
  },
  revisi: {
    judul: 'Buat revisi',
    tombol: 'Buat revisi',
    catatan: 'opsional',
    desk: 'Salinan draf dibuat. Saat revisi ditetapkan, aturan ini berakhir sehari sebelum revisi berlaku.',
    tanggal: 'Revisi berlaku mulai',
  },
};

function DialogAlurBiaya({
  aturan,
  aksi,
  onOpenChange,
  onSelesai,
}: {
  aturan: DetailAturanBiaya;
  aksi: AksiAlur | null;
  onOpenChange: (o: boolean) => void;
  onSelesai?: (a: DetailAturanBiaya, aksi: AksiAlur) => void;
}) {
  const siakad = useSiakad();
  const toast = useToast();
  const [catatan, setCatatan] = React.useState('');
  const [tanggal, setTanggal] = React.useState('');
  const [sibuk, setSibuk] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  React.useEffect(() => {
    setCatatan('');
    setTanggal('');
    setGalat(null);
  }, [aksi]);
  if (!aksi) return null;
  const t = TEKS_ALUR[aksi];
  const kirim = async () => {
    if (t.catatan === 'wajib' && !catatan.trim()) return setGalat('Catatan wajib diisi.');
    setSibuk(true);
    setGalat(null);
    try {
      const body: Record<string, unknown> = { catatan: catatan.trim() || null };
      if (aksi === 'nonaktifkan' && tanggal) body.berlaku_selesai = tanggal;
      if (aksi === 'revisi' && tanggal) body.berlaku_mulai = tanggal;
      const r = await siakad.request<DetailAturanBiaya & { pembagian?: { dibagi?: number; jumlah?: number } }>({ method: 'POST', path: `/v1/biaya/aturan/${aturan.id}/${aksi}`, body });
      invalidateSiakad('biaya');
      toast.add({
        title: {
          ajukan: 'Aturan diajukan',
          setujui: 'Aturan ditetapkan',
          tolak: 'Aturan ditolak',
          kembalikan: 'Aturan dikembalikan',
          nonaktifkan: 'Aturan dinonaktifkan',
          revisi: 'Draf revisi dibuat',
        }[aksi],
        type: 'success',
      });
      onOpenChange(false);
      if (r.data) onSelesai?.(r.data, aksi);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSibuk(false);
    }
  };
  return (
    <Dialog
      side="right"
      open
      onOpenChange={onOpenChange}
      title={t.judul}
      description={t.desk}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sibuk}>
            Batal
          </Button>
          <Button variant={aksi === 'tolak' || aksi === 'nonaktifkan' ? 'destructive' : 'primary'} loading={sibuk} onClick={kirim}>
            {t.tombol}
          </Button>
        </>
      }
    >
      <div className="u-biaya-alur">
        {(aksi === 'ajukan' || aksi === 'setujui') && !aturan.periksa.klop && (
          <Alert variant="danger" title="Pembagian belum klop">
            {aturan.periksa.pesan.join(' ')}
          </Alert>
        )}
        {(aksi === 'ajukan' || aksi === 'setujui') && !aturan.jumlah_sk && (
          <Alert variant="danger" title="SK belum dilampirkan">
            Lampirkan SK dari storage terlebih dahulu.
          </Alert>
        )}
        {t.tanggal && (
          <Field label={t.tanggal} optional description={aksi === 'nonaktifkan' ? 'Bawaan hari ini.' : 'Bawaan hari ini.'}>
            <IsianTanggal value={tanggal || null} onValueChange={(v) => setTanggal(v ?? '')} />
          </Field>
        )}
        <Field label="Catatan" required={t.catatan === 'wajib'} optional={t.catatan !== 'wajib'}>
          <Textarea value={catatan} rows={3} maxLength={1000} onChange={(e) => setCatatan(e.target.value)} />
        </Field>
        {galat && <Alert variant="danger">{galat}</Alert>}
      </div>
    </Dialog>
  );
}

/** Isi detail aturan: ringkasan, komponen dengan contoh pembagian, SK, riwayat, dan tombol alur sesuai hak. */
export function DetailAturanBiayaIsi({ id, onPilih, onTertutup }: { id: string; onPilih?: (id: string) => void; onTertutup?: () => void }) {
  const q = useAturanBiaya(id);
  const siakad = useSiakad();
  const toast = useToast();
  const [aksi, setAksi] = React.useState<AksiAlur | null>(null);
  const [ubah, setUbah] = React.useState(false);
  const [hapus, setHapus] = React.useState(false);
  const [tab, setTab] = React.useState<'komponen' | 'sk' | 'riwayat'>('komponen');
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  const a = q.data;
  if (!a) return <Skeleton style={{ height: 320 }} />;
  // Tanpa tarif standar (mis. UKT per golongan) contoh dihitung per Rp1.000.000 agar proporsinya tetap terlihat.
  const perJuta = !a.periksa.contoh && a.periksa.klop && a.komponen.every((k) => k.cara !== 'nominal');
  const contoh = a.periksa.contoh ?? (perJuta ? bagiBiaya(a.komponen, 1_000_000, null) : null);
  const menu: MenuEntry[] = [
    ...(a.boleh.revisi ? [{ label: 'Buat revisi', icon: <GitBranch />, onSelect: () => setAksi('revisi') } as MenuEntry] : []),
    ...(a.boleh.nonaktifkan ? [{ label: 'Nonaktifkan', icon: <PowerOff />, destructive: true, onSelect: () => setAksi('nonaktifkan') } as MenuEntry] : []),
    ...(a.boleh.ubah ? [{ label: 'Hapus draf', icon: <Trash2 />, destructive: true, onSelect: () => setHapus(true) } as MenuEntry] : []),
  ];
  return (
    <div className="u-biaya-detail">
      <div className="u-biaya-detail-kepala">
        <div>
          <StatusAturanBiayaBadge status={a.status} />
          <h2>{a.nama}</h2>
          <p>{[a.nama_biaya ?? a.kode_biaya, a.cakupan ?? 'Seluruh universitas', a.tarif ? formatRupiah(a.tarif) : 'Tanpa tarif standar', `versi ${a.versi}`].join(' · ')}</p>
        </div>
        <div className="u-biaya-detail-aksi">
          {a.boleh.ubah && (
            <Button variant="outline" size="sm" onClick={() => setUbah(true)}>
              <Pencil /> Ubah
            </Button>
          )}
          {a.boleh.ajukan && (
            <Button size="sm" onClick={() => setAksi('ajukan')}>
              <Send /> Ajukan
            </Button>
          )}
          {a.boleh.setujui && (
            <>
              <Button variant="outline" size="sm" onClick={() => setAksi('kembalikan')}>
                <Undo2 /> Kembalikan
              </Button>
              <Button variant="destructive-soft" size="sm" onClick={() => setAksi('tolak')}>
                <X /> Tolak
              </Button>
              <Button size="sm" onClick={() => setAksi('setujui')}>
                <CircleCheck /> Tetapkan
              </Button>
            </>
          )}
          {menu.length > 0 && (
            <Menu
              trigger={
                <Button variant="ghost" size="sm" iconOnly aria-label="Aksi lain">
                  <MoreHorizontal />
                </Button>
              }
              items={menu}
              align="end"
            />
          )}
        </div>
      </div>
      {a.status === 'ditolak' && a.catatan_keputusan && (
        <Alert variant="danger" title="Alasan penolakan">
          {a.catatan_keputusan}
        </Alert>
      )}
      {a.status === 'draf' && a.catatan_keputusan && (
        <Alert variant="warning" title="Catatan pimpinan">
          {a.catatan_keputusan}
        </Alert>
      )}
      {a.revisi_dari && (
        <Alert variant="info" title="Revisi">
          Aturan ini merevisi versi sebelumnya.{' '}
          {onPilih && (
            <Button variant="link" size="sm" onClick={() => onPilih(a.revisi_dari!)}>
              Buka versi sebelumnya
            </Button>
          )}
        </Alert>
      )}
      <DescriptionList
        items={[
          { label: 'Sumber', value: LABEL_SUMBER_BIAYA[a.sumber] },
          { label: 'Penyelenggara', value: a.penyelenggara ?? '—' },
          { label: 'Angkatan', value: a.angkatan ?? 'Semua' },
          { label: 'Berlaku', value: `${formatDate(a.berlaku_mulai, 'long')}${a.berlaku_selesai ? ` s.d. ${formatDate(a.berlaku_selesai, 'long')}` : ''}` },
          { label: 'SK', value: a.jumlah_sk ? `${a.jumlah_sk} dokumen` : 'Belum ada' },
          { label: 'Sudah dibagi', value: a.dibagi ? `${a.dibagi.transaksi} pembayaran · ${formatRupiah(a.dibagi.jumlah)}` : '—' },
        ]}
      />
      {a.keterangan && <p className="u-biaya-keterangan">{a.keterangan}</p>}
      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'komponen', label: 'Komponen', count: a.komponen.length },
          { value: 'sk', label: 'SK dan lampiran', count: a.lampiran.length },
          { value: 'riwayat', label: 'Riwayat' },
        ]}
      />
      {tab === 'komponen' && (
        <div className="u-biaya-detail-komponen">
          {!a.periksa.klop && (
            <Alert variant="warning" title="Pembagian belum klop">
              {a.periksa.pesan.join(' ')}
            </Alert>
          )}
          <DataTable<KomponenBiaya & { __i: number }>
            className="u-biaya-tabel"
            columns={[
              {
                key: 'nama',
                header: 'Komponen',
                mobile: 'title',
                cell: (k) => (
                  <>
                    <i className="u-biaya-warna" style={{ background: `var(--u-chart-${(k.__i % 8) + 1})` }} aria-hidden /> {k.nama}
                  </>
                ),
              },
              { key: 'penerima', header: 'Penerima', value: (k) => labelPenerimaBiaya(k), cell: (k) => labelPenerimaBiaya(k) },
              { key: 'nilai', header: 'Nilai', align: 'end', value: (k) => k.nilai, cell: (k) => nilaiKomponenBiaya(k) },
              ...(contoh
                ? [
                    {
                      key: 'jumlah',
                      header: perJuta ? 'Per Rp1 juta' : 'Dari tarif',
                      align: 'end' as const,
                      value: (k: KomponenBiaya & { __i: number }) => contoh.baris[k.__i]?.jumlah ?? 0,
                      cell: (k: KomponenBiaya & { __i: number }) => formatRupiah(contoh.baris[k.__i]?.jumlah ?? 0),
                    },
                  ]
                : []),
            ]}
            rows={a.komponen.map((k, i) => ({ ...k, __i: i }))}
            rowKey={(k) => String(k.id ?? `i${k.__i}`)}
            pagination={false}
            columnToggle={false}
            densityToggle={false}
            defaultDensity="compact"
            exportCsv={`pembagian-biaya-${a.id}`}
            ringkasan={contoh ? { jumlah: formatRupiah(contoh.total) } : undefined}
            empty={{ title: 'Belum ada komponen pembagian' }}
          />
          <BatangKomponenBiaya hasil={contoh} />
        </div>
      )}
      {tab === 'sk' && <LampiranAturanBiaya aturan={a} />}
      {tab === 'riwayat' && <RiwayatAturanBiaya id={a.id} />}
      <DialogAlurBiaya
        aturan={a}
        aksi={aksi}
        onOpenChange={(o) => !o && setAksi(null)}
        onSelesai={(baru, x) => {
          if (x === 'revisi' && baru.id !== a.id) onPilih?.(baru.id);
        }}
      />
      <FormAturanBiaya aturan={a} open={ubah} onOpenChange={setUbah} />
      <ConfirmDialog
        open={hapus}
        onOpenChange={setHapus}
        title="Hapus draf aturan?"
        description="Draf dan komponennya dihapus. Riwayat tetap tersimpan."
        confirmLabel="Hapus draf"
        onConfirm={async () => {
          await siakad.request({ method: 'POST', path: `/v1/biaya/aturan/${a.id}/hapus`, body: {} });
          invalidateSiakad('biaya');
          toast.add({ title: 'Draf dihapus', type: 'success' });
          onTertutup?.();
        }}
      />
    </div>
  );
}

/** Panel samping detail aturan biaya. */
export function PanelAturanBiaya({ id, onOpenChange, onPilih }: { id: string | null; onOpenChange: (o: boolean) => void; onPilih?: (id: string) => void }) {
  return (
    <Dialog open={Boolean(id)} onOpenChange={onOpenChange} side="right" size="lg" title="Aturan biaya">
      {id && <DetailAturanBiayaIsi id={id} onPilih={onPilih} onTertutup={() => onOpenChange(false)} />}
    </Dialog>
  );
}

// ================================================================ Kelola aturan
export interface KelolaAturanBiayaProps {
  /** Batasi ke aturan yang menyangkut unit ini (cakupan, induk/turunan, atau penerima bagian). */
  unitId?: number | null;
  /** Judul halaman. */
  /** Judul bagian. `null` = tidak dirender (kepala halaman/tab aplikasi sudah memuatnya); tombol aksi tetap tampil. */
  judul?: React.ReactNode;
  /** Keterangan bagian. `null` = tidak dirender. */
  deskripsi?: React.ReactNode;
  /** Batasi ke sumber tagihan, mis. "pmb" untuk aplikasi PMB. */
  sumber?: SumberBiaya;
  /** Tab awal, mis. "diajukan" untuk layar persetujuan WR bidang keuangan. */
  tabAwal?: 'berlaku' | 'diajukan' | 'draf' | 'semua';
  /** Batasi ke satu jenis biaya (halaman Komponen biaya). */
  kodeBiaya?: string;
  className?: string;
}

/**
 * Daftar aturan biaya dengan tab status, cari, susun baru (biaya.susun), dan panel detail untuk lampiran SK, ajukan,
 * serta tetapkan/tolak (biaya.setujui). Dipakai BAUK, fakultas, LP2M, dan dasbor pimpinan; isi mengikuti izin RBAC.
 */
export function KelolaAturanBiaya({ unitId, sumber, judul = 'Aturan biaya', deskripsi, tabAwal = 'berlaku', kodeBiaya, className }: KelolaAturanBiayaProps) {
  const hak = useHakBiaya();
  const [tab, setTab] = React.useState(tabAwal);
  React.useEffect(() => setTab(tabAwal), [tabAwal]);
  const [q, setQ] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pilih, setPilih] = React.useState<string | null>(null);
  const filter: FilterAturanBiaya = { status: tab === 'semua' ? undefined : tab, q: q.trim() || undefined, unit_id: unitId ?? undefined, sumber, kode_biaya: kodeBiaya, page, per_page: 25 };
  const daftar = useDaftarAturanBiaya(filter);
  const menunggu = useDaftarAturanBiaya({ status: 'diajukan', unit_id: unitId ?? undefined, sumber, kode_biaya: kodeBiaya, per_page: 1 });
  const b = hak.data?.boleh;
  const kolom: DataColumn<AturanBiaya>[] = [
    {
      key: 'nama',
      header: 'Aturan',
      cell: (a) => (
        <div className="u-biaya-sel-nama">
          <strong>{a.nama}</strong>
          <span>{[a.kode, a.nama_biaya ?? a.kode_biaya].filter(Boolean).join(' · ')}</span>
        </div>
      ),
      value: (a) => a.nama,
      mobile: 'title',
    },
    { key: 'cakupan', header: 'Berlaku untuk', cell: (a) => a.cakupan ?? 'Seluruh universitas', value: (a) => a.cakupan ?? '' },
    { key: 'tarif', header: 'Tarif', align: 'end', cell: (a) => (a.tarif ? formatRupiah(a.tarif) : '—'), value: (a) => a.tarif ?? 0 },
    { key: 'komponen', header: 'Komponen', cell: (a) => a.komponen.map((k) => `${labelPenerimaBiaya(k)} ${nilaiKomponenBiaya(k)}`).join(', '), value: (a) => a.komponen.length, defaultHidden: false },
    { key: 'berlaku', header: 'Berlaku', cell: (a) => `${formatDate(a.berlaku_mulai)}${a.berlaku_selesai ? ` – ${formatDate(a.berlaku_selesai)}` : ''}`, value: (a) => a.berlaku_mulai },
    { key: 'status', header: 'Status', shrink: true, cell: (a) => <StatusAturanBiayaBadge status={a.status} />, value: (a) => a.status, mobile: 'badge' },
  ];
  return (
    <div className={cn('u-biaya-kelola', className)}>
      {/* judul={null}: kepala halaman/tab aplikasi sudah memuat judul & keterangan; hanya tombol yang tampil (rata kanan). */}
      {(judul !== null || b?.susun) && <div className="u-biaya-kelola-kepala" data-tanpa-judul={judul === null ? '' : undefined}>
        {judul !== null && (
          <div>
            <h2>{judul}</h2>
            {deskripsi !== null && <p>{deskripsi ?? 'Aturan biaya yang ditagih ke mahasiswa dan pendaftar, beserta pembagiannya ke yayasan, rektorat, fakultas, prodi, dan unit lain. Setiap aturan berdasar SK.'}</p>}
          </div>
        )}
        {b?.susun && (
          <FormAturanBiaya
            unitBawaan={unitId}
            onTersimpan={(a) => setPilih(a.id)}
            trigger={
              <Button>
                <Plus /> Susun aturan
              </Button>
            }
          />
        )}
      </div>}
      {b?.setujui && (menunggu.meta?.total ?? 0) > 0 && tab !== 'diajukan' && (
        <Alert
          variant="warning"
          title={`${menunggu.meta?.total} aturan menunggu persetujuan`}
          actions={
            <Button size="sm" variant="outline" onClick={() => setTab('diajukan')}>
              Tinjau
            </Button>
          }
        >
          Aturan yang ditetapkan langsung dipakai membagi pembayaran sejak tanggal mulai berlakunya.
        </Alert>
      )}
      <DataTable
        columns={kolom}
        rows={daftar.data}
        rowKey={(a) => a.id}
        loading={daftar.loading}
        error={daftar.error}
        onRetry={daftar.refetch}
        page={page}
        perPage={25}
        total={daftar.meta?.total ?? undefined}
        onPageChange={setPage}
        onRowClick={(a) => setPilih(a.id)}
        exportCsv="aturan-biaya"
        toolbar={
          <div className="u-biaya-toolbar">
            <Tabs
              variant="pill"
              value={tab}
              onValueChange={(v) => {
                setTab(v);
                setPage(1);
              }}
              items={[
                { value: 'berlaku', label: 'Berlaku' },
                { value: 'diajukan', label: 'Menunggu', count: menunggu.meta?.total || undefined },
                ...(b?.susun || b?.setujui ? [{ value: 'draf' as const, label: 'Draf' }] : []),
                { value: 'semua', label: 'Semua' },
              ]}
            />
            <InputGroup start={<Search />} size="sm" className="u-biaya-cari">
              <Input
                size="sm"
                value={q}
                placeholder="Cari nama atau kode"
                aria-label="Cari aturan"
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </InputGroup>
          </div>
        }
        empty={{
          icon: <ListChecks />,
          title: tab === 'diajukan' ? 'Tidak ada aturan yang menunggu' : 'Belum ada aturan biaya',
          description: b?.susun ? 'Susun aturan, lampirkan SK, lalu ajukan ke WR bidang keuangan.' : 'Aturan yang menyangkut unit Anda tampil di sini setelah ditetapkan.',
        }}
      />
      <PanelAturanBiaya id={pilih} onOpenChange={(o) => !o && setPilih(null)} onPilih={setPilih} />
    </div>
  );
}

// ================================================================ Pembagian per unit
export interface PembagianBiayaUnitProps {
  /** Unit yang ditampilkan; kosong = semua yang boleh dilihat pengguna (global untuk BAUK/pimpinan). */
  unitId?: number | null;
  /** terima (bawaan) = bagian yang diterima unit; asal = bagian dari pembayaran mahasiswa unit. */
  arah?: 'terima' | 'asal';
  /** Batasi ke satu jenis penerima, mis. "jabatan"/"pegawai" untuk honor di aplikasi SDM. */
  penerima?: PenerimaBiaya;
  /** Batasi ke sumber tagihan, mis. "pmb" untuk aplikasi PMB. */
  sumber?: SumberBiaya;
  judul?: React.ReactNode;
  /** Nama unit untuk kepala cetak. */
  namaUnit?: React.ReactNode;
  /** Tampilkan tab rincian per pembayaran (bawaan true). */
  rincian?: boolean;
  className?: string;
}

/**
 * Laporan transparan bagian biaya: total diterima, sudah dicairkan, sisa, per penerima, per jenis biaya, per komponen,
 * per bulan, per prodi, dan rincian per pembayaran. Untuk aplikasi unit (fakultas, prodi, LP2M, rektorat) dan BAUK.
 */
export function PembagianBiayaUnit({ unitId, arah: arahAwal = 'terima', penerima, sumber, judul = 'Pembagian biaya', namaUnit, rincian = true, className }: PembagianBiayaUnitProps) {
  const [periode, setPeriode] = React.useState(() => ({ dari: `${new Date().getFullYear()}-01-01`, sampai: hariIni() }));
  const [arah, setArah] = React.useState(arahAwal);
  const [tab, setTab] = React.useState<'ringkas' | 'rincian'>('ringkas');
  const filter: FilterPembagian = { ...periode, unit_id: unitId ?? undefined, arah: unitId ? arah : undefined, penerima, sumber };
  const q = useRekapPembagianBiaya(filter);
  const r = q.data;
  const d = r?.per_penerima ?? [];
  const totalCair = d.reduce((s, p) => s + p.dicairkan, 0);
  const totalSisa = d.reduce((s, p) => s + p.sisa, 0);
  const items: ItemStatistik[] = r
    ? [
        { label: 'Pembayaran dibagi', nilai: r.total.transaksi, format: 'angka', ikon: <Coins /> },
        { label: unitId && arah === 'terima' ? 'Bagian diterima' : 'Total dibagi', nilai: r.total.jumlah, format: 'rupiah-ringkas', ikon: <PieChart />, tren: r.per_bulan.map((b) => b.jumlah) },
        { label: 'Sudah dicairkan', nilai: totalCair, format: 'rupiah-ringkas', ikon: <Banknote />, progres: r.total.jumlah > 0 ? (totalCair / Math.max(1, totalCair + totalSisa)) * 100 : null },
        { label: 'Belum dicairkan', nilai: totalSisa, format: 'rupiah-ringkas', ikon: <Landmark />, nada: totalSisa > 0 ? 'warning' : 'success' },
      ]
    : [];
  const PeriodeEl = PilihPeriodeBiaya;
  return (
    <KerangkaLaporan
      className={cn('u-biaya-pembagian', className)}
      judul={judul}
      deskripsi="Setiap pembayaran mahasiswa dan pendaftar dibagi otomatis menurut aturan biaya ber-SK yang berlaku, lalu dicatat ke buku besar unit penerima."
      unit={namaUnit}
      periode={`${formatDate(periode.dari, 'long')} – ${formatDate(periode.sampai, 'long')}`}
      loading={q.loading && !r}
      filter={
        <div className="u-biaya-toolbar">
          <PeriodeEl value={periode} onChange={setPeriode} />
          {unitId ? (
            <Pilihan
              tampilan="tombol"
              required
              size="sm"
              aria-label="Arah"
              options={[
                { value: 'terima', label: 'Diterima unit' },
                { value: 'asal', label: 'Dari pembayar unit' },
              ]}
              value={arah}
              onValueChange={(v) => v && setArah(v as 'terima' | 'asal')}
            />
          ) : null}
        </div>
      }
      csv={
        r
          ? {
              namaFile: `pembagian-biaya-${periode.dari}-${periode.sampai}`,
              data: () => ({ kolom: ['Penerima', 'Jenis', 'Pembayaran', 'Jumlah', 'Dicairkan', 'Sisa'], baris: r.per_penerima.map((p) => [p.nama, p.jenis, p.baris, p.jumlah, p.dicairkan, p.sisa]) }),
            }
          : undefined
      }
    >
      {q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : r ? (
        <div className="u-biaya-isi">
          <StatistikRingkas items={items} min={180} />
          {rincian && (
            <Tabs
              value={tab}
              onValueChange={setTab}
              items={[
                { value: 'ringkas', label: 'Ringkasan' },
                { value: 'rincian', label: 'Rincian per pembayaran' },
              ]}
            />
          )}
          {tab === 'ringkas' ? (
            <>
              <h3 className="u-biaya-subjudul">Per penerima</h3>
              <TabelRekap
                kolom={[
                  { key: 'nama', label: 'Penerima', nilai: (p: PenerimaRekap) => p.nama, format: 'teks' },
                  { key: 'baris', label: 'Pembayaran', nilai: (p) => p.baris, format: 'angka' },
                  { key: 'jumlah', label: 'Bagian', nilai: (p) => p.jumlah, format: 'akuntansi', total: true, batang: true },
                  { key: 'dicairkan', label: 'Dicairkan', nilai: (p) => p.dicairkan, format: 'akuntansi', total: true },
                  { key: 'sisa', label: 'Sisa', nilai: (p) => p.sisa, format: 'akuntansi', total: true },
                ]}
                baris={r.per_penerima}
                kunci={(p) => `${p.jenis}-${p.unit_id ?? ''}-${p.pegawai_id ?? ''}`}
                kosong="Belum ada pembayaran yang dibagi pada periode ini."
              />
              <DashboardGrid>
                <Panel title="Per jenis biaya">
                  {r.per_biaya.length ? (
                    <DonutChart data={r.per_biaya.map((x) => ({ label: x.nama, value: x.jumlah }))} format={formatRupiahRingkas} centerLabel="Dibagi" />
                  ) : (
                    <Empty title="Belum ada data" />
                  )}
                </Panel>
                <Panel title="Per komponen" span={2}>
                  <BarList items={r.per_komponen.map((k) => ({ label: `${k.komponen} · ${k.aturan}`, value: k.jumlah, secondary: nilaiKomponenBiaya(k) }))} format={formatRupiahRingkas} limit={10} />
                </Panel>
                <Panel title="Per jenis penerima">
                  <BarList items={r.per_jenis_penerima.map((k) => ({ label: LABEL_PENERIMA_BIAYA[k.penerima] ?? k.penerima, value: k.jumlah }))} format={formatRupiahRingkas} />
                </Panel>
                <Panel title="Per prodi pembayar" span={2}>
                  <BarList items={r.per_prodi.map((k) => ({ label: k.prodi, value: k.jumlah, secondary: k.kode_prodi }))} format={formatRupiahRingkas} limit={10} />
                </Panel>
              </DashboardGrid>
            </>
          ) : (
            <RincianPembagianBiaya filter={filter} />
          )}
        </div>
      ) : null}
    </KerangkaLaporan>
  );
}

/** Pilih rentang tanggal (bulan ini, tahun ini, dst.) untuk laporan pembagian. */
function PilihPeriodeBiaya({ value, onChange }: { value: { dari: string; sampai: string }; onChange: (v: { dari: string; sampai: string }) => void }) {
  return <PilihPeriodeLaporan value={value} onChange={onChange} preset={['bulan_ini', 'bulan_lalu', 'triwulan_ini', 'tahun_ini', 'tahun_lalu']} />;
}

/** Rincian tiap baris pembagian: tanggal, pembayar, aturan, komponen, penerima, jumlah. */
export function RincianPembagianBiaya({ filter }: { filter: FilterPembagian }) {
  const [page, setPage] = React.useState(1);
  const q = useRincianPembagianBiaya({ ...filter, page, per_page: 50 });
  const kolom: DataColumn<RincianPembagian>[] = [
    { key: 'tanggal', header: 'Tanggal', cell: (b) => formatDate(b.tanggal), value: (b) => b.tanggal, shrink: true },
    { key: 'nim', header: 'Pembayar', cell: (b) => <span className="u-biaya-mono">{b.nim ?? '—'}</span>, value: (b) => b.nim ?? '', mobile: 'subtitle' },
    { key: 'aturan', header: 'Aturan', cell: (b) => b.aturan, value: (b) => b.aturan, mobile: 'title' },
    { key: 'komponen', header: 'Komponen', cell: (b) => `${b.komponen} (${nilaiKomponenBiaya(b)})`, value: (b) => b.komponen },
    { key: 'penerima', header: 'Penerima', cell: (b) => b.nama_penerima ?? b.unit ?? LABEL_PENERIMA_BIAYA[b.penerima], value: (b) => b.nama_penerima ?? '' },
    { key: 'dasar', header: 'Dibayar', align: 'end', cell: (b) => formatRupiah(b.dasar), value: (b) => b.dasar, defaultHidden: true },
    { key: 'jumlah', header: 'Bagian', align: 'end', cell: (b) => formatRupiah(b.jumlah), value: (b) => b.jumlah, mobile: 'badge' },
  ];
  return (
    <DataTable
      columns={kolom}
      rows={q.data}
      rowKey={(b) => String(b.id)}
      loading={q.loading}
      error={q.error}
      onRetry={q.refetch}
      page={page}
      perPage={50}
      total={q.meta?.total ?? undefined}
      onPageChange={setPage}
      exportCsv="rincian-pembagian-biaya"
      empty={{ icon: <PieChart />, title: 'Belum ada pembagian', description: 'Pembayaran yang diterima pada periode ini akan tampil di sini.' }}
    />
  );
}

// ================================================================ Ringkasan (dasbor pimpinan)
/** Kartu dasbor WR bidang keuangan: aturan berlaku/menunggu, dibagi tahun/bulan ini, belum dicairkan, penerima teratas. */
export function RingkasanPembagianBiaya({ tahun, hrefKelola, className }: { tahun?: number; /** Tautan ke halaman kelola aturan. */ hrefKelola?: string; className?: string }) {
  const q = useRingkasanBiaya(tahun);
  const r = q.data;
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  return (
    <div className={cn('u-biaya-ringkasan', className)}>
      <StatistikRingkas
        loading={q.loading && !r}
        min={170}
        items={
          r
            ? [
                { label: 'Aturan berlaku', nilai: r.aturan.berlaku, format: 'angka', ikon: <ListChecks />, href: hrefKelola },
                { label: 'Menunggu persetujuan', nilai: r.aturan.menunggu_persetujuan, format: 'angka', ikon: <Send />, nada: r.aturan.menunggu_persetujuan ? 'warning' : 'neutral', href: hrefKelola },
                {
                  label: `Dibagi ${r.tahun}`,
                  nilai: r.dibagi_tahun_ini.jumlah,
                  format: 'rupiah-ringkas',
                  ikon: <PieChart />,
                  keterangan: `${r.dibagi_tahun_ini.transaksi} pembayaran`,
                  tren: r.per_bulan.map((b) => b.jumlah),
                },
                { label: 'Belum dicairkan', nilai: r.belum_dicairkan, format: 'rupiah-ringkas', ikon: <HandCoins />, nada: r.belum_dicairkan > 0 ? 'warning' : 'success' },
              ]
            : []
        }
      />
      {r && (
        <DashboardGrid>
          <Panel title="Penerima teratas" span={2}>
            <BarList
              items={r.penerima_teratas.map((p) => ({ label: p.nama, value: p.jumlah, secondary: p.sisa > 0 ? `sisa ${formatRupiahRingkas(p.sisa)}` : 'lunas' }))}
              format={formatRupiahRingkas}
              limit={8}
              empty="Belum ada pembayaran yang dibagi."
            />
          </Panel>
          <Panel title="Per jenis penerima">
            {r.per_jenis_penerima.length ? (
              <DonutChart data={r.per_jenis_penerima.map((x) => ({ label: LABEL_PENERIMA_BIAYA[x.penerima] ?? x.penerima, value: x.jumlah }))} format={formatRupiahRingkas} centerLabel="Dibagi" />
            ) : (
              <Empty title="Belum ada data" />
            )}
          </Panel>
          {r.jenis_biaya_tanpa_aturan.length > 0 && (
            <Panel title="Jenis biaya tanpa aturan" description="Pembayaran jenis ini belum dibagi ke unit mana pun." span={3}>
              <ul className="u-biaya-tanpa-aturan">
                {r.jenis_biaya_tanpa_aturan.map((j) => (
                  <li key={j.kode_biaya}>
                    <Badge variant="warning">{j.kode_biaya}</Badge> {j.nama}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </DashboardGrid>
      )}
    </div>
  );
}

// ================================================================ Pencairan
/** Catat pencairan bagian ke unit (transfer kas antar-rekening) atau ke yayasan; tidak boleh melebihi sisa. */
export function FormPencairanBiaya({
  penerima: awal,
  trigger,
  open,
  onOpenChange,
}: {
  penerima?: PenerimaRekap | null;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const siakad = useSiakad();
  const toast = useToast();
  const ref = useReferensiBiaya();
  const rekap = useRekapPembagianBiaya({});
  const kosong = {
    penerima: awal?.jenis === 'yayasan' ? 'yayasan' : 'unit',
    unit_id: awal?.unit_id ? String(awal.unit_id) : '',
    jumlah: awal?.sisa ? String(Math.round(awal.sisa)) : '',
    tanggal: hariIni(),
    uraian: '',
    berkas_id: '',
  };
  const [isi, setIsi] = React.useState(kosong);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [inner, setInner] = React.useState(false);
  const isOpen = open ?? inner;
  React.useEffect(() => {
    if (isOpen) {
      setIsi(kosong);
      setGalat({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, awal]);
  const set = (k: keyof typeof kosong, v: string) => {
    setIsi((x) => ({ ...x, [k]: v }));
    setGalat((g) => ({ ...g, [k]: '' }));
  };
  const sisa = rekap.data?.per_penerima.find((p) => (isi.penerima === 'yayasan' ? p.jenis === 'yayasan' : p.jenis === 'unit' && String(p.unit_id) === isi.unit_id))?.sisa ?? 0;
  const unitPunyaBagian = (rekap.data?.per_penerima ?? []).filter((p) => p.jenis === 'unit');
  const sisaUnit = new Map(unitPunyaBagian.map((p) => [String(p.unit_id), p.sisa]));
  return (
    <PanelForm
      open={isOpen}
      onOpenChange={(o) => {
        setInner(o);
        onOpenChange?.(o);
      }}
      trigger={trigger}
      title="Catat pencairan"
      description="Unit: transfer dari rekening universitas ke rekening unit. Yayasan: setoran bagian yayasan. Jurnal dibuat otomatis."
      berubah={JSON.stringify(isi) !== JSON.stringify(kosong)}
      labelSimpan="Catat pencairan"
      onSimpan={async () => {
        const g: Record<string, string> = {};
        const n = Number(isi.jumlah);
        if (isi.penerima === 'unit' && !isi.unit_id) g.unit_id = 'Pilih unit.';
        if (!(n > 0)) g.jumlah = 'Isi jumlah lebih dari 0.';
        else if (n > sisa + 0.5) g.jumlah = `Melebihi sisa bagian (${formatRupiah(sisa)}).`;
        setGalat(g);
        if (Object.keys(g).length) return 'Periksa isian yang ditandai.';
        const r = await siakad.request<PencairanBiaya>({
          method: 'POST',
          path: '/v1/biaya/pencairan',
          body: {
            penerima: isi.penerima,
            unit_id: isi.penerima === 'unit' ? Number(isi.unit_id) : null,
            jumlah: n,
            tanggal: isi.tanggal || null,
            uraian: isi.uraian.trim() || null,
            berkas_id: isi.berkas_id || null,
          },
        });
        invalidateSiakad('biaya');
        toast.add({
          title: 'Pencairan dicatat',
          description: r.data ? `${r.data.nomor} · ${formatRupiah(r.data.jumlah)}${r.data.rekening_tujuan ? ` ke ${r.data.rekening_tujuan}` : ''}` : undefined,
          type: 'success',
        });
      }}
    >
      {ref.error && <GalatApi error={ref.error} onRetry={ref.refetch} />}
      <BagianForm kolom={2}>
        <Field label="Penerima" required className="u-form-lebar">
          <Pilihan
            tampilan="tombol"
            required
            options={[
              { value: 'unit', label: 'Unit' },
              { value: 'yayasan', label: 'Yayasan' },
            ]}
            value={isi.penerima}
            onValueChange={(v) => v && set('penerima', v)}
          />
        </Field>
        {isi.penerima === 'unit' && (
          <Field label="Unit" required className="u-form-lebar" error={galat.unit_id || undefined}>
            <PilihUnit
              dataCadangan={unitPunyaBagian.map((p) => ({ id: Number(p.unit_id), nama: p.nama }))}
              boleh={(u) => sisaUnit.has(String(u.id))}
              alasan="Unit ini tidak punya bagian di pembayaran ini."
              sembunyikanTerlarang
              keterangan={(u) => (sisaUnit.has(String(u.id)) ? `Sisa ${formatRupiah(sisaUnit.get(String(u.id)) ?? 0)}` : null)}
              value={isi.unit_id || null}
              placeholder="Pilih unit penerima"
              invalid={Boolean(galat.unit_id)}
              onValueChange={(v) => set('unit_id', v == null ? '' : String(v))}
            />
          </Field>
        )}
        <Field label="Jumlah" required error={galat.jumlah || undefined} description={`Sisa bagian: ${formatRupiah(sisa)}`}>
          <Input inputMode="numeric" value={isi.jumlah} onChange={(e) => set('jumlah', e.target.value.replace(/[^\d]/g, ''))} />
        </Field>
        <Field label="Tanggal" required>
          <IsianTanggal value={isi.tanggal || null} onValueChange={(v) => set('tanggal', v ?? '')} />
        </Field>
        <Field label="Uraian" optional className="u-form-lebar">
          <Input value={isi.uraian} maxLength={255} placeholder="mis. Pencairan bagian biaya ujian semester ganjil" onChange={(e) => set('uraian', e.target.value)} />
        </Field>
        <Field label="Bukti transfer" optional className="u-form-lebar">
          <PilihBerkas value={isi.berkas_id || null} onValueChange={(v) => set('berkas_id', v ?? '')} accept=".pdf,.jpg,.jpeg,.png" kategori="dokumen" modul="biaya" />
        </Field>
      </BagianForm>
    </PanelForm>
  );
}

/** Daftar pencairan bagian biaya (nomor, penerima, rekening, jurnal) dengan catat dan batalkan (biaya.cairkan). */
export function DaftarPencairanBiaya({ unitId, className }: { unitId?: number | null; className?: string }) {
  const hak = useHakBiaya();
  const siakad = useSiakad();
  const toast = useToast();
  const [page, setPage] = React.useState(1);
  const [batal, setBatal] = React.useState<PencairanBiaya | null>(null);
  const [alasan, setAlasan] = React.useState('');
  const q = useDaftarPencairanBiaya({ unit_id: unitId ?? undefined, page, per_page: 25 });
  const boleh = hak.data?.boleh.cairkan;
  const kolom: DataColumn<PencairanBiaya>[] = [
    { key: 'nomor', header: 'Nomor', cell: (p) => <span className="u-biaya-mono">{p.nomor}</span>, value: (p) => p.nomor, mobile: 'subtitle' },
    { key: 'tanggal', header: 'Tanggal', cell: (p) => formatDate(p.tanggal), value: (p) => p.tanggal },
    { key: 'unit', header: 'Penerima', cell: (p) => p.unit, value: (p) => p.unit, mobile: 'title' },
    { key: 'rekening', header: 'Rekening', cell: (p) => [p.rekening_asal, p.rekening_tujuan].filter(Boolean).join(' → ') || '—', value: (p) => p.rekening_tujuan ?? '' },
    { key: 'jurnal', header: 'Jurnal', cell: (p) => p.jurnal ?? '—', value: (p) => p.jurnal ?? '', defaultHidden: true },
    { key: 'jumlah', header: 'Jumlah', align: 'end', cell: (p) => formatRupiah(p.jumlah), value: (p) => p.jumlah },
    {
      key: 'status',
      header: 'Status',
      shrink: true,
      cell: (p) => <Badge variant={p.status === 'dicatat' ? 'success' : 'neutral'}>{p.status === 'dicatat' ? 'Dicatat' : 'Dibatalkan'}</Badge>,
      value: (p) => p.status,
      mobile: 'badge',
    },
  ];
  return (
    <div className={cn('u-biaya-pencairan', className)}>
      <DataTable
        columns={kolom}
        rows={q.data}
        rowKey={(p) => p.id}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
        page={page}
        perPage={25}
        total={q.meta?.total ?? undefined}
        onPageChange={setPage}
        exportCsv="pencairan-biaya"
        rowActions={boleh ? (p) => (p.status === 'dicatat' ? [{ label: 'Batalkan pencairan', icon: <Undo2 />, destructive: true, onSelect: () => setBatal(p) }] : []) : undefined}
        actions={
          boleh ? (
            <FormPencairanBiaya
              trigger={
                <Button size="sm">
                  <ArrowDownToLine /> Catat pencairan
                </Button>
              }
            />
          ) : undefined
        }
        empty={{ icon: <Banknote />, title: 'Belum ada pencairan', description: 'Bagian unit dan yayasan yang sudah ditransfer tercatat di sini beserta jurnalnya.' }}
      />
      <Dialog
        open={Boolean(batal)}
        onOpenChange={(o) => !o && setBatal(null)}
        title="Batalkan pencairan?"
        description={batal ? `${batal.nomor} · ${batal.unit} · ${formatRupiah(batal.jumlah)}. Jurnalnya dibalik dan sisa bagian bertambah lagi.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setBatal(null)}>
              Kembali
            </Button>
            <Button
              variant="destructive"
              disabled={!alasan.trim()}
              onClick={async () => {
                try {
                  await siakad.request({ method: 'POST', path: `/v1/biaya/pencairan/${batal!.id}/batal`, body: { alasan: alasan.trim() } });
                  invalidateSiakad('biaya');
                  toast.add({ title: 'Pencairan dibatalkan', type: 'success' });
                  setBatal(null);
                  setAlasan('');
                } catch (e) {
                  toast.add({ title: 'Gagal membatalkan', description: pesanGalat(e), type: 'error' });
                }
              }}
            >
              Batalkan pencairan
            </Button>
          </>
        }
      >
        <Field label="Alasan" required>
          <Textarea value={alasan} rows={2} onChange={(e) => setAlasan(e.target.value)} />
        </Field>
      </Dialog>
    </div>
  );
}

// ================================================================ Sinkron + simulasi
/** Tombol bagi ulang pembayaran (POST /v1/biaya/pembagian/sinkron); biasanya berjalan otomatis lewat cron. */
export function TombolSinkronBiaya({ dari, sampai }: { dari?: string; sampai?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [sibuk, setSibuk] = React.useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      loading={sibuk}
      onClick={async () => {
        setSibuk(true);
        try {
          const r = await siakad.request<{ baru?: number; ubah?: number; batal?: number; tetap?: number }>({ method: 'POST', path: '/v1/biaya/pembagian/sinkron', body: bersih({ dari, sampai }) });
          invalidateSiakad('biaya');
          const d = r.data ?? {};
          toast.add({ title: 'Pembagian diperbarui', description: `${d.baru ?? 0} baru, ${d.ubah ?? 0} berubah, ${d.batal ?? 0} dibatalkan`, type: 'success' });
        } catch (e) {
          toast.add({ title: 'Gagal memperbarui', description: pesanGalat(e), type: 'error' });
        } finally {
          setSibuk(false);
        }
      }}
    >
      <RefreshCw /> Bagi ulang
    </Button>
  );
}

/** Coba hitung: aturan mana yang berlaku untuk jenis biaya + prodi + tanggal, dan berapa bagian tiap penerima. */
export function SimulasiPembagianBiaya({ className }: { className?: string }) {
  const ref = useReferensiBiaya();
  const [isi, setIsi] = React.useState({ kode_biaya: '', kode_prodi: '', jumlah: '', tanggal: hariIni() });
  const siap = Boolean(isi.kode_biaya);
  const q = useSiakadQuery<SimulasiBiaya>(['biaya', 'simulasi', isi], (s, signal) => s.request<SimulasiBiaya>({ method: 'GET', path: '/v1/biaya/simulasi', query: bersih(isi) }, { signal }), {
    enabled: siap,
  });
  const prodi = (ref.data?.unit ?? []).filter((u) => u.jenis === 'prodi' && u.kode_prodi).map((u) => ({ value: u.kode_prodi!, label: u.nama }));
  return (
    <Card className={cn('u-biaya-simulasi', className)}>
      <CardHeader title="Simulasi pembagian" description="Pilih jenis biaya dan prodi pembayar untuk melihat aturan yang berlaku dan bagian tiap penerima." />
      <CardContent>
        <div className="u-biaya-simulasi-isian">
          <Field label="Jenis biaya">
            <Pilihan
              options={(ref.data?.jenis_biaya ?? []).map((j) => ({ value: j.kode, label: j.nama }))}
              value={isi.kode_biaya || null}
              tampilan="cari"
              placeholder="Pilih"
              onValueChange={(v) => setIsi((x) => ({ ...x, kode_biaya: v ?? '' }))}
            />
          </Field>
          <Field label="Prodi pembayar">
            <Pilihan options={prodi} value={isi.kode_prodi || null} tampilan="cari" placeholder="Pilih" onValueChange={(v) => setIsi((x) => ({ ...x, kode_prodi: v ?? '' }))} />
          </Field>
          <Field label="Jumlah dibayar" description="Kosong = tarif penuh.">
            <Input inputMode="numeric" value={isi.jumlah} onChange={(e) => setIsi((x) => ({ ...x, jumlah: e.target.value.replace(/[^\d]/g, '') }))} />
          </Field>
          <Field label="Tanggal bayar">
            <IsianTanggal value={isi.tanggal} onValueChange={(v) => setIsi((x) => ({ ...x, tanggal: v ?? hariIni() }))} />
          </Field>
        </div>
        {!siap ? null : q.error ? (
          <GalatApi error={q.error} onRetry={q.refetch} />
        ) : q.loading && !q.data ? (
          <Skeleton style={{ height: 120 }} />
        ) : q.data && !q.data.aturan ? (
          <Alert variant="warning" title="Belum ada aturan">
            {q.data.pesan ?? 'Belum ada aturan berlaku untuk pilihan ini; pembayaran tidak dibagi.'}
          </Alert>
        ) : q.data ? (
          <div className="u-biaya-simulasi-hasil">
            <p>
              Aturan: <strong>{q.data.aturan!.nama}</strong>
              {q.data.jumlah != null && <> · dibayar {formatRupiah(q.data.jumlah)}</>}
            </p>
            <BatangKomponenBiaya hasil={{ baris: q.data.baris, total: q.data.total, kurang: q.data.kurang ?? 0 }} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ================================================================ Halaman lengkap BAUK
/**
 * Halaman lengkap aturan biaya untuk BAUK dan WR bidang keuangan: ringkasan, aturan, pembagian per penerima,
 * pencairan, dan simulasi. Tab yang tampil mengikuti izin (biaya.lihat/susun/setujui/cairkan).
 */
export function HalamanAturanBiaya({ className }: { className?: string }) {
  const hak = useHakBiaya();
  const [tab, setTab] = React.useState<'ringkasan' | 'aturan' | 'pembagian' | 'pencairan' | 'simulasi'>('ringkasan');
  if (hak.error) return <GalatApi error={hak.error} onRetry={hak.refetch} />;
  const b = hak.data?.boleh;
  if (hak.data && !b?.lihat && !b?.susun && !b?.setujui)
    return <Empty icon={<ListChecks />} title="Belum ada akses" description="Minta peran keuangan atau penetap biaya kepada admin Pustikom (izin biaya.lihat)." bordered />;
  return (
    <div className={cn('u-biaya-halaman', className)}>
      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'ringkasan', label: 'Ringkasan', icon: <PieChart /> },
          { value: 'aturan', label: 'Aturan', icon: <ListChecks /> },
          { value: 'pembagian', label: 'Pembagian', icon: <Coins /> },
          ...(b?.cairkan ? [{ value: 'pencairan' as const, label: 'Pencairan', icon: <Banknote /> }] : []),
          { value: 'simulasi', label: 'Simulasi', icon: <History /> },
        ]}
      />
      {tab === 'ringkasan' && <RingkasanPembagianBiaya />}
      {tab === 'aturan' && <KelolaAturanBiaya tabAwal={b?.setujui ? 'diajukan' : 'berlaku'} />}
      {tab === 'pembagian' && <PembagianBiayaUnit namaUnit="Universitas Pohuwato" />}
      {tab === 'pencairan' && <DaftarPencairanBiaya />}
      {tab === 'simulasi' && <SimulasiPembagianBiaya />}
    </div>
  );
}
