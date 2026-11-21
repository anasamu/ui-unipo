'use client';
import * as React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  BookOpenCheck,
  CheckCircle2,
  CreditCard,
  Landmark,
  LockKeyhole,
  MonitorSmartphone,
  Plus,
  Printer,
  Receipt,
  ReceiptText,
  Search,
  ShoppingCart,
  Store,
  Trash2,
  Unlock,
  Wallet,
} from 'lucide-react';
import { Badge, Button, Spinner } from '../components/actions';
import { Alert, Empty } from '../components/display';
import { Checkbox, Field, Input, SegmentedControl, Textarea } from '../components/forms';
import { IsianTanggal } from '../components/formulir';
import { Dialog, useToast } from '../components/overlays';
import { Combobox, OptionContent, Select } from '../components/select';
import { StatCard, StatGrid } from '../components/charts';
import { PilihPeriode, rentangPreset, type RentangTanggal } from '../components/laporan';
import { KodeQr } from '../components/kode-qr';
import { ProgressBertumpuk, ProgressLangkah } from '../components/progres';
import { cn } from '../lib/cn';
import { formatDate, formatRupiah, terbilang } from '../lib/format';
import { usePlatform } from '../lib/platform';
import { useAkunSaya } from './akun';
import { GalatApi } from './galat';
import { PilihEntitas, type SumberEntitas } from './pilih';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import type { KeuanganMahasiswaData } from './profil-modul';
import { KwitansiResmi, type KwitansiResmiData } from './kwitansi';
import { buktiPeramban, namaPerambanBawaan, useDaftarPerambanKasir, usePerambanKasir, type SesiPerambanKasir } from './kasir-peramban';
import { IsianCari } from '../components/isian-cari';

// Kasir modern (keuangan, fakultas, PMB), riwayat pembayaran mahasiswa, buku kas unit, dan jurnal umum.
// Endpoint: /v1/keuangan (tagihan, transaksi, kasir, kwitansi), /v1/pmb/admin/tagihan, /v1/keu/kas, /v1/keu/jurnal.

// ================================================================ Tipe & hook
export interface KeuanganSaya {
  pengelola: boolean;
  admin: boolean;
  mahasiswa?: string | null;
  prodi: string[];
  tahun_aktif?: string | null;
  kasir_terbuka?: { id: number; loket?: string | null; dibuka_at: string; perangkat_id?: number | null } | null;
  /** Loket web: izin kasir.terima (unit penerbit) dan peramban wajib disetujui. */
  kasir?: { terima: boolean; peramban_wajib?: boolean };
}
export interface TransaksiKeuangan {
  id: number;
  nomor?: string;
  nim: string;
  tahun_id: string;
  kode_biaya: string | number;
  jenis_biaya?: string | null;
  jumlah: number;
  potongan?: number;
  tanggal: string;
  metode: string;
  status?: 'sah' | 'batal' | string;
  keterangan?: string | null;
  kode_verifikasi?: string | null;
  sudah_tercatat?: boolean;
}
export interface KwitansiKeuangan {
  nomor: string;
  tanggal: string;
  status: string;
  perguruan_tinggi?: { nama_pt?: string; singkatan?: string; alamat?: string } | null;
  mahasiswa?: { nim: string; nama: string; kode_prodi?: string; angkatan?: string } | null;
  prodi?: { nama_prodi?: string; kode_jenjang?: string } | null;
  tahun_id: string;
  kode_biaya: string | number;
  jenis_biaya?: string | null;
  jumlah: number;
  terbilang?: string;
  metode: string;
  keterangan?: string | null;
  petugas?: string | null;
  kode_verifikasi?: string | null;
  url_verifikasi?: string | null;
}
export interface SesiKasirTutup {
  id: number;
  loket?: string | null;
  saldo_awal: number;
  total_tunai?: number;
  setoran: number;
  selisih: number;
  per_metode?: Array<{ metode: string; transaksi: number; jumlah: number }>;
}
export interface TagihanPmbAdmin {
  id: number;
  nomor: string;
  jenis: string;
  keterangan?: string | null;
  nominal: number;
  potongan: number;
  total: number;
  status: string;
  no_pmb?: string | null;
  akun_nama?: string | null;
  nama?: string | null;
}
export interface BarisKas {
  arah: 'masuk' | 'keluar';
  sumber: string;
  id: number;
  tanggal: string;
  uraian: string;
  kategori?: string | null;
  nomor_bukti?: string | null;
  jumlah: number;
  unit_id?: number | null;
  unit?: string | null;
  saldo: number;
}
export interface BukuKasData {
  masuk: number;
  keluar: number;
  saldo: number;
  baris: BarisKas[];
}
export type StatusJurnal = 'draf' | 'diposting' | 'dibatalkan';
export interface JurnalRingkas {
  id: number;
  nomor: string;
  tanggal: string;
  jenis: string;
  sumber: string;
  uraian: string;
  nomor_bukti?: string | null;
  total: number;
  status: StatusJurnal;
  unit?: string | null;
  dibalik?: boolean;
}
export interface BarisJurnal {
  id?: number;
  akun_id: number | null;
  akun_kode?: string;
  akun_nama?: string;
  unit?: string | null;
  rekening?: string | null;
  debit: number;
  kredit: number;
  keterangan?: string | null;
}
export interface JurnalDetail extends JurnalRingkas {
  baris: BarisJurnal[];
  alasan_batal?: string | null;
  diposting_oleh?: string | null;
  diposting_pada?: string | null;
  pembalik?: { id: number; nomor: string; tanggal: string } | null;
  membalik?: { id: number; nomor: string; tanggal: string } | null;
}

export function useKeuanganSaya() {
  return useSiakadQuery<KeuanganSaya>(['keuangan', 'saya'], (s, signal) => s.request({ method: 'GET', path: '/v1/keuangan/saya' }, { signal }), { staleTime: 15_000 });
}
/** Baris hasil cari loket (GET /v1/keuangan/loket/mahasiswa). */
export interface MahasiswaLoket {
  nim: string;
  nama: string;
  kode_prodi: string;
  nama_prodi?: string | null;
  status_aktif?: string | null;
  status_label?: string | null;
  bisa_diproses?: boolean;
  alasan?: string | null;
  tunggakan?: number;
}
/** Tagihan untuk loket: boleh/alasan dari aturan kasir.terima + jadwal (loket) atau kosong (pengelola keuangan). */
export interface TagihanLoket {
  tahun_id: string;
  kode_biaya: string | number;
  jenis_biaya: string;
  tagihan: number;
  dibayar: number;
  potongan?: number;
  sisa: number;
  tunggakan?: boolean;
  boleh?: boolean;
  alasan?: string | null;
}
export interface DataLoketMahasiswa {
  mahasiswa: { nim: string; nama: string; kode_prodi: string; status_label?: string; bisa_diproses?: boolean };
  tahun_aktif: string;
  tagihan: TagihanLoket[];
  total: { tagihan: number; dibayar: number; sisa: number };
}
/** Tagihan mahasiswa untuk jenis biaya terbitan unit petugas kasir (izin kasir.terima, baca saja). */
export function useLoketMahasiswa(nim: string | null | undefined) {
  return useSiakadQuery<DataLoketMahasiswa>(
    ['keuangan', 'loket', nim],
    (s, signal) => s.request({ method: 'GET', path: `/v1/keuangan/loket/mahasiswa/${encodeURIComponent(nim ?? '')}` }, { signal }),
    { enabled: Boolean(nim), staleTime: 10_000 },
  );
}
export function useKeuanganMahasiswa(nim: string | null | undefined, tahunId?: string) {
  return useSiakadQuery<KeuanganMahasiswaData>(
    ['keuangan', 'mahasiswa', nim, tahunId],
    (s, signal) => s.request({ method: 'GET', path: `/v1/keuangan/mahasiswa/${encodeURIComponent(nim ?? '')}`, query: { tahun_id: tahunId } }, { signal }),
    { enabled: Boolean(nim), staleTime: 10_000 },
  );
}
export function useBukuKas(q: { dari?: string; sampai?: string; unit_id?: number | null; turunan?: boolean; periode_id?: number | null }) {
  const query = { dari: q.dari, sampai: q.sampai, unit_id: q.unit_id ?? undefined, turunan: q.turunan ? 1 : undefined, periode_id: q.periode_id ?? undefined };
  return useSiakadQuery<BukuKasData>(['keu', 'kas', query], (s, signal) => s.request({ method: 'GET', path: '/v1/keu/kas', query }, { signal }), { staleTime: 30_000 });
}
export function useDaftarJurnal(q: { status?: StatusJurnal; q?: string; dari?: string; sampai?: string; unit_id?: number | null; page?: number }) {
  const query = { ...q, unit_id: q.unit_id ?? undefined, q: q.q || undefined, per_page: 30 };
  return useSiakadQuery<JurnalRingkas[]>(['keu', 'jurnal', query], (s, signal) => s.request({ method: 'GET', path: '/v1/keu/jurnal', query }, { signal }), { staleTime: 15_000 });
}
export function useJurnal(id: number | null | undefined) {
  return useSiakadQuery<JurnalDetail>(['keu', 'jurnal', 'detail', id], (s, signal) => s.request({ method: 'GET', path: `/v1/keu/jurnal/${id}` }, { signal }), { enabled: Boolean(id) });
}

/** Sumber PilihEntitas untuk akun bagan akun keuangan (/v1/keu/akun). */
export const SUMBER_AKUN_KEU: SumberEntitas = {
  nama: 'akun',
  path: '/v1/keu/akun',
  kunci: 'id',
  judul: (r) => `${r.kode ?? ''} ${r.nama ?? ''}`.trim(),
  meta: (r) => [r.kelompok, r.induk === true || r.is_induk ? 'induk' : null].filter(Boolean).join(' · '),
  ikon: <BookOpenCheck />,
  placeholder: 'Cari kode atau nama akun',
};

const METODE: Array<{ value: string; label: string; icon: React.ReactNode }> = [
  { value: 'tunai', label: 'Tunai', icon: <Banknote /> },
  { value: 'transfer', label: 'Transfer', icon: <Landmark /> },
  { value: 'va', label: 'VA', icon: <CreditCard /> },
  { value: 'lainnya', label: 'Lainnya', icon: <Wallet /> },
];
const labelMetode = (m: string) => METODE.find((x) => x.value === m)?.label ?? m;
const angka = (s: string) => Number(String(s).replace(/[^\d]/g, '')) || 0;

// ================================================================ Sesi kasir
/** Pesan galat loket: pesan server yang sudah awam (izin, peramban, sesi, aturan penerimaan) ditampilkan apa adanya. */
export function pesanGalatLoket(e: unknown): string {
  const err = e as { status?: number; code?: string; message?: string; details?: Record<string, unknown> } | null;
  if (err?.status === 422 && err.code === 'validation_failed' && err.details) {
    const isi = Object.values(err.details).filter((v): v is string => typeof v === 'string');
    if (isi.length) return isi.map((v) => v.charAt(0).toUpperCase() + v.slice(1)).join('. ') + '.';
  }
  if (err && err.message && err.status && [403, 409, 422].includes(err.status)) return err.message;
  return pesanGalat(e);
}

/** Kirim permintaan loket bertanda peramban (bukti di query, lihat kasir-peramban.ts). */
async function kirimLoket<T>(siakad: ReturnType<typeof useSiakad>, path: string, body: Record<string, unknown>) {
  return siakad.request<T>({ method: 'POST', path, body, query: await buktiPeramban('POST', path, body) });
}

export interface KeadaanLoketKasir {
  /** Siap menerima pembayaran: izin, peramban disetujui, sesi terbuka di peramban ini. */
  siap: boolean;
  /** Alasan belum siap dalam bahasa awam. */
  alasan: string | null;
  memuat: boolean;
}

/** Keadaan loket web: izin kasir.terima, peramban disetujui, sesi kasir terbuka di peramban ini. */
export function useLoketKasir(): KeadaanLoketKasir {
  const saya = useKeuanganSaya();
  const terima = Boolean(saya.data?.kasir?.terima);
  const pr = usePerambanKasir(terima);
  if (saya.loading && !saya.data) return { siap: false, alasan: null, memuat: true };
  if (!terima) return { siap: false, alasan: 'Akun Anda belum punya izin menerima pembayaran (kasir.terima) untuk unit penerbit biaya.', memuat: false };
  if (pr.loading && !pr.data) return { siap: false, alasan: null, memuat: true };
  const d = pr.data;
  if (!d) return { siap: false, alasan: 'Status peramban loket belum dapat dimuat.', memuat: false };
  if (!d.didukung) return { siap: false, alasan: 'Peramban ini tidak mendukung tanda tangan loket. Pakai Chrome, Edge, Firefox, atau Safari terbaru lewat alamat https.', memuat: false };
  if (!d.terdaftar || !d.perangkat) return { siap: false, alasan: 'Peramban ini belum didaftarkan sebagai loket kasir.', memuat: false };
  if (d.perangkat.status !== 'disetujui' || !d.perangkat.aktif) return { siap: false, alasan: 'Peramban loket ini belum disetujui penyetuju perangkat kasir.', memuat: false };
  const sesi = saya.data?.kasir_terbuka;
  if (!sesi || sesi.perangkat_id !== d.perangkat.id) return { siap: false, alasan: 'Buka sesi kasir di peramban ini dulu.', memuat: false };
  return { siap: true, alasan: null, memuat: false };
}

/**
 * Bilah sesi kasir loket web: daftar peramban loket (persetujuan seperti komputer UNIPO Kasir), buka sesi (saldo awal), dan
 * tutup sesi (uang fisik, setoran, selisih, rekap per metode). Tampil untuk pemegang izin kasir.terima.
 */
export function SesiKasir({ className }: { className?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const saya = useKeuanganSaya();
  const terima = Boolean(saya.data?.kasir?.terima);
  const pr = usePerambanKasir(terima);
  const daftar = useDaftarPerambanKasir();
  const sesi = saya.data?.kasir_terbuka;
  const perangkat = pr.data?.perangkat ?? null;
  const [buka, setBuka] = React.useState(false);
  const [tutup, setTutup] = React.useState(false);
  const [form, setForm] = React.useState<null | 'daftar' | 'ulang'>(null);
  const [nama, setNama] = React.useState('');
  const [saldo, setSaldo] = React.useState('');
  const [fisik, setFisik] = React.useState('');
  const [setoran, setSetoran] = React.useState('');
  const [catatan, setCatatan] = React.useState('');
  const [hasil, setHasil] = React.useState<SesiPerambanKasir | null>(null);
  const [sibuk, setSibuk] = React.useState(false);
  const [galat, setGalat] = React.useState<unknown>(null);
  if (!saya.data?.pengelola && !terima) return null;
  const kirim = async (fn: () => Promise<void>) => {
    setSibuk(true);
    setGalat(null);
    try {
      await fn();
      invalidateSiakad('keuangan');
    } catch (e) {
      setGalat(e);
    } finally {
      setSibuk(false);
    }
  };
  const lama = Boolean(sesi && sesi.perangkat_id == null);
  const diSini = Boolean(sesi && perangkat && sesi.perangkat_id === perangkat.id);
  const kasLaci = pr.data?.sesi_saya && diSini ? pr.data.sesi_saya.kas_seharusnya ?? pr.data.sesi_saya.saldo_awal + pr.data.sesi_saya.total_tunai : null;

  let ikon: React.ReactNode = <LockKeyhole />;
  let judul: React.ReactNode = 'Sesi kasir belum dibuka';
  let ket: React.ReactNode = 'Buka sesi dengan saldo awal laci sebelum melayani.';
  let aksi: React.ReactNode = null;
  if (!terima) {
    judul = 'Loket hanya untuk petugas kasir';
    ket = 'Akun Anda belum punya izin menerima pembayaran (kasir.terima). Minta peran kasir untuk unit penerbit biaya ke Pustikom.';
  } else if (pr.loading && !pr.data) {
    ikon = <Spinner size="sm" />;
    judul = 'Menyiapkan loket…';
    ket = 'Memeriksa peramban ini.';
  } else if (pr.error) {
    judul = 'Status loket belum dapat dimuat';
    ket = pesanGalatLoket(pr.error);
    aksi = (
      <Button size="sm" variant="outline" onClick={() => pr.refetch()}>
        Coba lagi
      </Button>
    );
  } else if (pr.data && !pr.data.didukung) {
    ikon = <MonitorSmartphone />;
    judul = 'Peramban tidak didukung';
    ket = 'Loket web memerlukan peramban terbaru (Chrome, Edge, Firefox, Safari) lewat alamat https.';
  } else if (!perangkat) {
    ikon = <MonitorSmartphone />;
    judul = 'Peramban ini belum terdaftar sebagai loket';
    ket = 'Daftarkan sekali; penyetuju perangkat kasir (Kepala BAUK atau Pustikom) menyetujui sebelum loket bisa dipakai.';
    aksi = (
      <Button size="sm" onClick={() => (setNama(namaPerambanBawaan()), setCatatan(''), setForm('daftar'))}>
        <MonitorSmartphone /> Daftarkan peramban
      </Button>
    );
  } else if (perangkat.status === 'menunggu') {
    ikon = <MonitorSmartphone />;
    judul = (
      <>
        {perangkat.nama} <Badge variant="warning">Menunggu persetujuan</Badge>
      </>
    );
    ket = `Kode loket ${perangkat.kode}${perangkat.sidik_kunci ? ` · kode verifikasi ${perangkat.sidik_kunci}` : ''}. Sampaikan kode ini ke penyetuju perangkat kasir.`;
    aksi = (
      <Button size="sm" variant="outline" onClick={() => pr.refetch()}>
        Periksa lagi
      </Button>
    );
  } else if (perangkat.status !== 'disetujui' || !perangkat.aktif) {
    ikon = <MonitorSmartphone />;
    judul = (
      <>
        {perangkat.nama} <Badge variant="danger">{perangkat.status === 'disetujui' ? 'Diblokir' : perangkat.status_label}</Badge>
      </>
    );
    ket = perangkat.alasan ? `Alasan: ${perangkat.alasan}` : 'Peramban ini tidak bisa dipakai sebagai loket.';
    aksi =
      perangkat.status === 'ditolak' ? (
        <Button size="sm" variant="outline" onClick={() => (setNama(perangkat.nama), setCatatan(''), setForm('ulang'))}>
          Ajukan ulang
        </Button>
      ) : null;
  } else if (sesi && !diSini && !lama) {
    judul = 'Sesi Anda terbuka di loket lain';
    ket = `${sesi.loket ?? 'Loket lain'} sejak ${formatDate(sesi.dibuka_at, 'short')}. Tutup sesi itu di perangkatnya sebelum melayani di sini.`;
  } else if (sesi) {
    ikon = <Unlock />;
    judul = lama ? 'Sesi lama tanpa peramban masih terbuka' : `Sesi kasir terbuka · ${sesi.loket ?? perangkat.nama}`;
    ket = lama
      ? 'Tutup sesi ini dengan setoran, lalu buka sesi baru di peramban yang disetujui.'
      : `Sejak ${formatDate(sesi.dibuka_at, 'short')} ${new Date(sesi.dibuka_at.replace(' ', 'T')).toTimeString().slice(0, 5)}${kasLaci != null ? ` · kas laci seharusnya ${formatRupiah(kasLaci)}` : ''}`;
    aksi = (
      <Button size="sm" variant="outline" onClick={() => (setFisik(''), setSetoran(''), setCatatan(''), setHasil(null), setTutup(true))}>
        <LockKeyhole /> Tutup sesi
      </Button>
    );
  } else if (perangkat.sesi_aktif) {
    judul = 'Peramban ini sedang dipakai petugas lain';
    ket = `Sesi ${perangkat.sesi_aktif.kasir} masih terbuka di loket ini. Minta petugas itu menutup sesinya.`;
  } else {
    judul = `Sesi kasir belum dibuka · ${perangkat.nama}`;
    ket = `Loket ${perangkat.unit ? perangkat.unit.singkatan || perangkat.unit.nama : 'semua unit'}. Hitung uang di laci lalu buka sesi.`;
    aksi = (
      <Button size="sm" onClick={() => (setSaldo(''), setCatatan(''), setBuka(true))}>
        <Unlock /> Buka sesi
      </Button>
    );
  }

  const nilaiFisik = fisik ? angka(fisik) : 0;
  const setoranLebih = !lama && Boolean(setoran) && angka(setoran) > nilaiFisik;
  return (
    <div className={cn('u-kasir-sesi', className)} data-buka={diSini || lama ? '' : undefined}>
      <span className="u-kasir-sesi-ikon" aria-hidden>
        {ikon}
      </span>
      <span className="u-kasir-sesi-teks">
        <b>{judul}</b>
        <small>{ket}</small>
      </span>
      {aksi}
      <Dialog
        side="right"
        open={form !== null}
        onOpenChange={(o) => !o && setForm(null)}
        title={form === 'ulang' ? 'Ajukan ulang peramban loket' : 'Daftarkan peramban sebagai loket'}
        description="Peramban ini membuat kunci rahasia yang tidak bisa disalin ke komputer lain. Loket bisa dipakai setelah disetujui penyetuju perangkat kasir."
        footer={
          <Button
            loading={sibuk}
            onClick={() =>
              kirim(async () => {
                const r = await daftar({ nama, catatan, ajukanUlang: form === 'ulang' });
                setForm(null);
                toast.add({ title: 'Peramban didaftarkan', description: `Kode loket ${r.kode}. Menunggu persetujuan.` });
              })
            }
          >
            {form === 'ulang' ? 'Ajukan ulang' : 'Daftarkan'}
          </Button>
        }
      >
        <div className="u-kasir-form">
          <Field label="Nama loket" description="Mis. Loket 1 BAUK, lantai 1.">
            <Input value={nama} onChange={(e) => setNama(e.target.value)} maxLength={100} />
          </Field>
          <Field label="Catatan untuk penyetuju" optional>
            <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} maxLength={255} placeholder="Mis. komputer meja kasir BAUK" />
          </Field>
          {galat != null && <GalatApi error={galat} title="Peramban belum terdaftar" message={pesanGalatLoket(galat)} />}
        </div>
      </Dialog>
      <Dialog
        side="right"
        open={buka}
        onOpenChange={setBuka}
        title="Buka sesi kasir"
        description="Hitung uang di laci sebelum mulai melayani."
        footer={
          <Button
            loading={sibuk}
            onClick={() =>
              kirim(async () => {
                await kirimLoket(siakad, '/v1/keuangan/kasir/buka', { saldo_awal: angka(saldo), catatan: catatan || undefined });
                setBuka(false);
                toast.add({ title: 'Sesi kasir dibuka' });
              })
            }
          >
            Buka sesi
          </Button>
        }
      >
        <div className="u-kasir-form">
          <Field label="Saldo awal laci">
            <Input inputMode="numeric" value={saldo ? formatRupiah(angka(saldo)) : ''} onChange={(e) => setSaldo(e.target.value)} placeholder="Rp0" />
          </Field>
          <Field label="Catatan" optional>
            <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} maxLength={1000} />
          </Field>
          {galat != null && <GalatApi error={galat} title="Sesi belum dibuka" message={pesanGalatLoket(galat)} />}
        </div>
      </Dialog>
      <Dialog
        side="right"
        open={tutup}
        onOpenChange={(o) => {
          setTutup(o);
          if (!o) setHasil(null);
        }}
        title={hasil ? 'Sesi kasir ditutup' : 'Tutup sesi kasir'}
        description={hasil ? undefined : 'Hitung uang tunai di laci. Selisih = uang fisik − (saldo awal + penerimaan tunai).'}
        footer={
          hasil ? (
            <Button onClick={() => (setTutup(false), setHasil(null))}>Selesai</Button>
          ) : (
            <Button
              loading={sibuk}
              disabled={(!lama && !fisik) || setoranLebih}
              onClick={() =>
                kirim(async () => {
                  const body = lama
                    ? { setoran: angka(setoran || fisik), catatan: catatan || undefined }
                    : { uang_fisik: nilaiFisik, setoran: setoran ? angka(setoran) : nilaiFisik, catatan: catatan || undefined };
                  const r = await kirimLoket<SesiPerambanKasir>(siakad, `/v1/keuangan/kasir/${sesi!.id}/tutup`, body);
                  setHasil(r.data);
                })
              }
            >
              Tutup sesi
            </Button>
          )
        }
      >
        {hasil ? (
          <div className="u-kasir-form">
            <StatGrid min={140}>
              <StatCard label="Saldo awal" value={formatRupiah(hasil.saldo_awal)} />
              {hasil.uang_fisik != null && <StatCard label="Uang fisik" value={formatRupiah(hasil.uang_fisik)} />}
              <StatCard label="Setoran" value={formatRupiah(hasil.setoran ?? 0)} />
              <StatCard
                label="Selisih"
                value={formatRupiah(hasil.selisih ?? 0)}
                tone={!hasil.selisih ? 'success' : 'danger'}
                hint={!hasil.selisih ? 'Cocok' : (hasil.selisih ?? 0) > 0 ? 'Lebih' : 'Kurang'}
              />
            </StatGrid>
            {hasil.per_metode?.length ? (
              <ProgressBertumpuk
                label="Penerimaan per metode"
                bagian={hasil.per_metode.map((m) => ({ label: `${labelMetode(m.metode)} (${m.transaksi})`, nilai: Number(m.jumlah) }))}
                format={(n) => formatRupiah(n)}
              />
            ) : (
              <p className="u-kasir-catatan">Tidak ada pembayaran di sesi ini.</p>
            )}
          </div>
        ) : (
          <div className="u-kasir-form">
            {kasLaci != null && <Alert variant="info">Kas laci seharusnya {formatRupiah(kasLaci)} (saldo awal + penerimaan tunai).</Alert>}
            <Field label={lama ? 'Uang tunai disetor' : 'Uang fisik di laci'}>
              <Input inputMode="numeric" value={fisik ? formatRupiah(angka(fisik)) : ''} onChange={(e) => setFisik(e.target.value)} placeholder="Rp0" />
            </Field>
            {!lama && (
              <Field label="Disetor ke bendahara" optional description="Kosong = semua uang fisik disetor." error={setoranLebih ? 'Setoran tidak boleh melebihi uang fisik di laci.' : undefined}>
                <Input inputMode="numeric" value={setoran ? formatRupiah(angka(setoran)) : ''} onChange={(e) => setSetoran(e.target.value)} placeholder={formatRupiah(nilaiFisik)} />
              </Field>
            )}
            <Field label="Catatan" optional>
              <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} maxLength={1000} />
            </Field>
            {galat != null && <GalatApi error={galat} title="Sesi belum ditutup" message={pesanGalatLoket(galat)} />}
          </div>
        )}
      </Dialog>
    </div>
  );
}

// ================================================================ Kwitansi
/**
 * Kwitansi digital satu transaksi (GET /v1/keuangan/transaksi/{id}/kwitansi) dengan terbilang dan QR verifikasi. Bila API
 * mengirim data kwitansi resmi (penerbit, nomor bukti berawalan unit), tampil sebagai KwitansiResmi (Bukti Kas Masuk).
 */
export function KwitansiPembayaran({
  transaksiId,
  data,
  urlVerifikasi,
  className,
}: {
  transaksiId?: number | null;
  data?: KwitansiKeuangan;
  /** Alamat dasar verifikasi untuk QR, mis. https://siakad.unipo.ac.id. */ urlVerifikasi?: string;
  className?: string;
}) {
  const q = useSiakadQuery<KwitansiKeuangan>(['kwitansi-resmi', '/v1/keuangan/transaksi', transaksiId], (s, signal) => s.request({ method: 'GET', path: `/v1/keuangan/transaksi/${transaksiId}/kwitansi` }, { signal }), {
    enabled: !data && Boolean(transaksiId),
  });
  const k = data ?? q.data;
  const ref = React.useRef<HTMLDivElement>(null);
  // Kwitansi resmi (Bukti Kas Masuk, siakad/kwitansi.tsx) bila API sudah mengirim bagian penerbit.
  if (k && (k as unknown as KwitansiResmiData).penerbit && (k as unknown as KwitansiResmiData).nomor_bukti)
    return <KwitansiResmi data={k as unknown as KwitansiResmiData} urlVerifikasi={urlVerifikasi} className={className} />;
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  if (!k) return <Spinner />;
  const url = k.url_verifikasi ? `${urlVerifikasi ?? (typeof location !== 'undefined' ? location.origin : '')}${k.url_verifikasi}` : null;
  return (
    <div className={cn('u-kwitansi', className)} ref={ref} data-batal={k.status !== 'sah' || undefined}>
      <header className="u-kwitansi-kepala">
        <div>
          <b>{k.perguruan_tinggi?.nama_pt ?? 'Universitas'}</b>
          {k.perguruan_tinggi?.alamat && <small>{k.perguruan_tinggi.alamat}</small>}
        </div>
        <div className="u-kwitansi-nomor">
          <span>KWITANSI</span>
          <b>{k.nomor}</b>
        </div>
      </header>
      <dl className="u-kwitansi-isi">
        <dt>Telah terima dari</dt>
        <dd>
          {k.mahasiswa?.nama} <small>({k.mahasiswa?.nim})</small>
        </dd>
        <dt>Program studi</dt>
        <dd>{[k.prodi?.kode_jenjang, k.prodi?.nama_prodi].filter(Boolean).join(' ') || '–'}</dd>
        <dt>Untuk pembayaran</dt>
        <dd>
          {k.jenis_biaya ?? k.kode_biaya} · periode {k.tahun_id}
          {k.keterangan ? ` · ${k.keterangan}` : ''}
        </dd>
        <dt>Metode</dt>
        <dd>{labelMetode(k.metode)}</dd>
        <dt>Terbilang</dt>
        <dd className="u-kwitansi-terbilang">{k.terbilang ?? terbilang(k.jumlah)}</dd>
      </dl>
      <footer className="u-kwitansi-kaki">
        <div className="u-kwitansi-jumlah">{formatRupiah(k.jumlah)}</div>
        <div className="u-kwitansi-ttd">
          {url && <KodeQr nilai={url} ukuran={88} gaya="dokumen" label="QR verifikasi kwitansi" />}
          <span>
            {formatDate(k.tanggal, 'long')}
            <br />
            Petugas: {k.petugas ?? '–'}
          </span>
        </div>
      </footer>
      {k.status !== 'sah' && <span className="u-kwitansi-cap">DIBATALKAN</span>}
      <Button
        size="sm"
        variant="outline"
        className="u-kwitansi-cetak"
        onClick={() => {
          ref.current?.setAttribute('data-cetak', '');
          document.documentElement.setAttribute('data-u-cetak', '');
          const selesai = () => {
            ref.current?.removeAttribute('data-cetak');
            document.documentElement.removeAttribute('data-u-cetak');
            window.removeEventListener('afterprint', selesai);
          };
          window.addEventListener('afterprint', selesai);
          window.print();
        }}
      >
        <Printer /> Cetak
      </Button>
    </div>
  );
}

// ================================================================ Kasir
export type KonteksKasir = 'keuangan' | 'fakultas' | 'pmb';

interface ButirKeranjang {
  kunci: string;
  label: string;
  sub: string;
  jumlah: number;
  max: number;
  sumber: { jenis: 'mhs'; nim: string; tahun_id: string; kode_biaya: string | number } | { jenis: 'pmb'; id: number };
  /** ID transaksi loket (idempoten): tetap sama bila pembayaran butir ini dikirim ulang. */
  uuid?: string;
}

export interface KasirProps {
  /** `keuangan` BAUK (semua prodi), `fakultas` (dibatasi prodi fakultas), `pmb` (tagihan pendaftar PMB). */
  konteks?: KonteksKasir;
  /** Saringan prodi untuk pencarian mahasiswa (konteks fakultas). */
  kodeProdi?: string;
  kodeFakultas?: string;
  judul?: React.ReactNode;
  /** Alamat dasar untuk QR verifikasi kwitansi. */
  urlVerifikasi?: string;
  /** Dipanggil setelah pembayaran tercatat. */
  onSelesai?: (hasil: { transaksi: TransaksiKeuangan[]; pmb: TagihanPmbAdmin[] }) => void;
  className?: string;
}

/**
 * Kasir modern untuk loket keuangan, fakultas, dan PMB: cari pembayar (nama/NIM, atau nomor tagihan PMB), pilih tagihan
 * (boleh cicil sebagian), metode bayar, uang diterima + kembalian dengan tombol nominal cepat, lalu kwitansi digital ber-QR.
 * Di mobile ringkasan menjadi bilah bawah yang menempel dan pembayaran dibuka sebagai lembar bawah.
 */
export function Kasir({ konteks = 'keuangan', kodeProdi, kodeFakultas, judul, urlVerifikasi, onSelesai, className }: KasirProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const p = usePlatform();
  const pmb = konteks === 'pmb';
  const loket = useLoketKasir();
  const [nim, setNim] = React.useState<string | null>(null);
  const [namaPembayar, setNamaPembayar] = React.useState<string>('');
  const sayaKeu = useKeuanganSaya();
  // Petugas kasir (izin kasir.terima): data loket dari jalur Kasir (lingkup unit penerbit, tanda aturan kasir.terima).
  const modeLoket = !pmb && Boolean(sayaKeu.data?.kasir?.terima);
  const keu = useKeuanganMahasiswa(pmb || modeLoket || sayaKeu.loading ? null : nim);
  const loketMhs = useLoketMahasiswa(modeLoket ? nim : null);
  const [keranjang, setKeranjang] = React.useState<ButirKeranjang[]>([]);
  const [metode, setMetode] = React.useState('tunai');
  const [diterima, setDiterima] = React.useState('');
  const [catatan, setCatatan] = React.useState('');
  const [sibuk, setSibuk] = React.useState(false);
  const [galat, setGalat] = React.useState<unknown>(null);
  const [hasil, setHasil] = React.useState<{ transaksi: TransaksiKeuangan[]; pmb: TagihanPmbAdmin[]; diterima: number; total: number; peringatan: string[] } | null>(null);
  const [lembarBayar, setLembarBayar] = React.useState(false);

  const total = keranjang.reduce((a, b) => a + b.jumlah, 0);
  const uang = metode === 'tunai' ? angka(diterima) : total;
  const kembali = Math.max(0, uang - total);
  const kurang = metode === 'tunai' && uang < total;
  const cepat = React.useMemo(() => {
    const s = new Set<number>([total]);
    [10_000, 50_000, 100_000].forEach((b) => total && s.add(Math.ceil(total / b) * b));
    [50_000, 100_000, 500_000, 1_000_000].forEach((v) => v > total && s.add(v));
    return [...s]
      .filter((v) => v > 0)
      .sort((a, b) => a - b)
      .slice(0, 5);
  }, [total]);

  const tagihanMhs: Array<{ per: string; it: TagihanLoket }> = modeLoket
    ? (loketMhs.data?.tagihan ?? []).filter((t) => t.sisa > 0).map((t) => ({ per: t.tahun_id, it: t }))
    : (keu.data?.periode ?? []).flatMap((per) => per.item.filter((it) => it.sisa > 0).map((it) => ({ per: per.tahun_id, it: { ...it, tahun_id: per.tahun_id } })));
  const dataMhs = modeLoket ? loketMhs : keu;
  const ringkas = modeLoket
    ? loketMhs.data && { dibayar: loketMhs.data.total.dibayar, potongan: loketMhs.data.tagihan.reduce((a, t) => a + (t.potongan ?? 0), 0), sisa: loketMhs.data.total.sisa }
    : keu.data?.ringkasan;
  const ada = (k: string) => keranjang.some((b) => b.kunci === k);
  const alih = (b: ButirKeranjang) => setKeranjang((x) => (x.some((y) => y.kunci === b.kunci) ? x.filter((y) => y.kunci !== b.kunci) : [...x, b]));

  const bayar = async () => {
    setSibuk(true);
    setGalat(null);
    const tr: TransaksiKeuangan[] = [];
    const tp: TagihanPmbAdmin[] = [];
    const awal = Date.now().toString(36);
    const peringatan: string[] = [];
    try {
      for (const [i, b] of keranjang.entries()) {
        if (b.sumber.jenis === 'mhs') {
          // Loket web = jalur Kasir (peramban disetujui, sesi, aturan kasir.terima); uuid membuat kirim ulang tidak dobel.
          b.uuid ??= typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${awal}-${i}-${Math.random().toString(36).slice(2, 10)}`;
          const r = await kirimLoket<TransaksiKeuangan & { peringatan?: Array<{ pesan: string }> }>(siakad, '/v1/keuangan/transaksi', {
            uuid: b.uuid, nim: b.sumber.nim, tahun_id: b.sumber.tahun_id, kode_biaya: b.sumber.kode_biaya, jumlah: b.jumlah, metode, referensi: `kasir-${awal}-${i}`, keterangan: catatan || undefined,
          });
          r.data.peringatan?.forEach((x) => !peringatan.includes(x.pesan) && peringatan.push(x.pesan));
          tr.push(r.data);
        } else {
          const r = await siakad.request<TagihanPmbAdmin>({
            method: 'POST',
            path: `/v1/pmb/admin/tagihan/${b.sumber.id}/lunas`,
            body: { referensi: `kasir-${awal}-${i}`, catatan: [labelMetode(metode), catatan].filter(Boolean).join(' · ') },
          });
          tp.push(r.data);
        }
      }
      setHasil({ transaksi: tr, pmb: tp, diterima: uang, total, peringatan });
      setKeranjang([]);
      setDiterima('');
      setCatatan('');
      setLembarBayar(false);
      invalidateSiakad('keuangan');
      onSelesai?.({ transaksi: tr, pmb: tp });
    } catch (e) {
      setGalat(e);
      if (tr.length || tp.length) {
        toast.add({ title: `${tr.length + tp.length} dari ${keranjang.length} pembayaran sudah tercatat`, description: 'Sisanya belum; periksa lalu ulangi.' });
        setKeranjang((x) => x.slice(tr.length + tp.length));
        invalidateSiakad('keuangan');
      }
    } finally {
      setSibuk(false);
    }
  };

  const panelBayar = (
    <div className="u-kasir-bayar">
      <div className="u-kasir-total">
        <span>Total</span>
        <b>{formatRupiah(total)}</b>
      </div>
      <Field label="Metode bayar">
        <SegmentedControl
          fullWidth
          value={metode}
          onValueChange={setMetode}
          options={(pmb ? METODE.filter((m) => m.value !== 'va') : METODE).map((m) => ({ value: m.value, label: m.label, icon: m.icon }))}
        />
      </Field>
      {metode === 'tunai' && (
        <>
          <Field label="Uang diterima">
            <Input inputMode="numeric" value={diterima ? formatRupiah(angka(diterima)) : ''} onChange={(e) => setDiterima(e.target.value)} placeholder={formatRupiah(total)} className="u-kasir-uang" />
          </Field>
          <div className="u-kasir-cepat">
            {cepat.map((v) => (
              <button key={v} type="button" data-aktif={uang === v || undefined} onClick={() => setDiterima(String(v))}>
                {v === total ? 'Uang pas' : formatRupiah(v)}
              </button>
            ))}
          </div>
          <div className="u-kasir-kembali" data-kurang={kurang || undefined}>
            <span>{kurang ? 'Kurang' : 'Kembalian'}</span>
            <b>{formatRupiah(kurang ? total - uang : kembali)}</b>
          </div>
        </>
      )}
      <Field label="Catatan" optional>
        <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder={metode === 'transfer' ? 'No. referensi transfer' : 'Opsional'} />
      </Field>
      {galat != null && <GalatApi error={galat} title="Pembayaran gagal dicatat" message={pesanGalatLoket(galat)} />}
      <Button size="lg" fullWidth loading={sibuk} disabled={!keranjang.length || kurang || (!pmb && !loket.siap)} onClick={bayar}>
        <Receipt /> Bayar {keranjang.length ? formatRupiah(total) : ''}
      </Button>
      {!pmb && !loket.siap && !loket.memuat && loket.alasan && <small className="u-kasir-catatan">{loket.alasan}</small>}
    </div>
  );

  return (
    <div className={cn('u-kasir', className)} data-konteks={konteks}>
      <div className="u-kasir-atas">
        <span className="u-kasir-judul">
          <Store aria-hidden />
          <b>{judul ?? (pmb ? 'Kasir PMB' : konteks === 'fakultas' ? 'Kasir fakultas' : 'Kasir keuangan')}</b>
        </span>
        {!pmb && <SesiKasir />}
      </div>
      <div className="u-kasir-tubuh">
        <section className="u-kasir-kiri">
          <Field label={pmb ? 'Cari tagihan pendaftar' : 'Cari pembayar'}>
            {pmb ? (
              <Combobox<TagihanPmbAdmin>
                placeholder="Nomor tagihan, no. pendaftaran, atau nama"
                icon={<Search />}
                loadItems={async (q, signal) => {
                  const r = await siakad.request<TagihanPmbAdmin[]>({ method: 'GET', path: '/v1/pmb/admin/tagihan', query: { q: q || undefined, status: 'belum_bayar', per_page: 15 } }, { signal });
                  return Array.isArray(r.data) ? r.data : [];
                }}
                value={null}
                onValueChange={(t) => {
                  if (!t) return;
                  const k = `pmb-${t.id}`;
                  if (!ada(k))
                    alih({
                      kunci: k,
                      label: t.keterangan || `Biaya ${t.jenis.replace('_', ' ')}`,
                      sub: `${t.nomor} · ${t.akun_nama ?? t.nama ?? ''}${t.no_pmb ? ` · ${t.no_pmb}` : ''}`,
                      jumlah: t.total,
                      max: t.total,
                      sumber: { jenis: 'pmb', id: t.id },
                    });
                }}
                itemToString={(t) => t.nomor}
                itemKey={(t) => String(t.id)}
                emptyText="Tidak ada tagihan PMB yang belum dibayar."
                renderItem={(t) => (
                  <OptionContent title={`${t.akun_nama ?? t.nama ?? t.nomor} · ${formatRupiah(t.total)}`} meta={`${t.nomor}${t.no_pmb ? ` · ${t.no_pmb}` : ''} · ${t.jenis.replace('_', ' ')}`} />
                )}
              />
            ) : (
              modeLoket ? (
                <Combobox<MahasiswaLoket>
                  placeholder="NIM atau nama (min. 3 huruf)"
                  icon={<Search />}
                  loadItems={async (q, signal) => {
                    if (q.trim().length < 3) return [];
                    const r = await siakad.request<MahasiswaLoket[]>({ method: 'GET', path: '/v1/keuangan/loket/mahasiswa', query: { q: q.trim() } }, { signal });
                    return Array.isArray(r.data) ? r.data : [];
                  }}
                  value={null}
                  onValueChange={(m) => {
                    if (!m) return;
                    setNim(m.nim);
                    setNamaPembayar(m.nama);
                    setKeranjang((x) => x.filter((b) => b.sumber.jenis !== 'mhs' || b.sumber.nim === m.nim));
                  }}
                  itemToString={(m) => `${m.nama} (${m.nim})`}
                  itemKey={(m) => m.nim}
                  emptyText="Tidak ada mahasiswa dengan jenis biaya terbitan unit Anda."
                  renderItem={(m) => (
                    <OptionContent
                      title={`${m.nama} · ${m.nim}`}
                      meta={`${m.nama_prodi ?? m.kode_prodi} · ${m.status_label ?? m.status_aktif}${m.bisa_diproses ? '' : ` · ${m.alasan ?? 'tidak ada yang bisa diproses'}`}`}
                    />
                  )}
                />
              ) : (
                <PilihEntitas
                  jenis="mahasiswa"
                  value={nim}
                  query={{ prodi: kodeProdi, kode_fakultas: kodeFakultas }}
                  onValueChange={(v, r) => {
                    setNim(v);
                    setNamaPembayar(String(r?.nama ?? ''));
                    setKeranjang((x) => x.filter((b) => b.sumber.jenis !== 'mhs' || b.sumber.nim === v));
                  }}
                />
              )
            )}
          </Field>
          {!pmb && nim && dataMhs.error && <GalatApi error={dataMhs.error} onRetry={dataMhs.refetch} message={pesanGalatLoket(dataMhs.error)} />}
          {!pmb && nim && ringkas && (
            <div className="u-kasir-ringkas">
              <ProgressBertumpuk
                label={`${modeLoket ? 'Tagihan unit Anda' : 'Keuangan'} ${namaPembayar || nim}`}
                bagian={[
                  { label: 'Dibayar', nilai: ringkas.dibayar, tone: 'success' },
                  { label: 'Potongan', nilai: ringkas.potongan, tone: 'info' },
                  { label: 'Sisa', nilai: ringkas.sisa, tone: 'warning' },
                ]}
                format={(n) => formatRupiah(n)}
              />
            </div>
          )}
          {!pmb && nim && dataMhs.loading && !dataMhs.data && <Spinner />}
          {!pmb && nim && dataMhs.data && (
            <ul className="u-kasir-tagihan" aria-label="Tagihan belum lunas">
              {tagihanMhs.map(({ per, it }) => {
                const k = `${nim}-${per}-${it.kode_biaya}`;
                const dipilih = keranjang.find((b) => b.kunci === k);
                return (
                  <li key={k} data-pilih={dipilih ? '' : undefined} data-nonaktif={it.boleh === false || undefined}>
                    <label className="u-kasir-tagihan-baris">
                      <Checkbox
                        checked={Boolean(dipilih)}
                        disabled={it.boleh === false && !dipilih}
                        onCheckedChange={() =>
                          alih({ kunci: k, label: it.jenis_biaya, sub: `Periode ${per}`, jumlah: it.sisa, max: it.sisa, sumber: { jenis: 'mhs', nim, tahun_id: per, kode_biaya: it.kode_biaya } })
                        }
                      />
                      <span className="u-kasir-tagihan-teks">
                        <b>{it.jenis_biaya}</b>
                        <small>
                          Periode {per} · tagihan {formatRupiah(it.tagihan)}
                          {it.dibayar ? ` · dibayar ${formatRupiah(it.dibayar)}` : ''}
                          {it.tunggakan ? ' · tunggakan' : ''}
                        </small>
                        {it.boleh === false && it.alasan && <small className="u-kasir-tagihan-alasan">{it.alasan}</small>}
                      </span>
                      <b className="u-kasir-tagihan-sisa">{formatRupiah(it.sisa)}</b>
                    </label>
                    {dipilih && (
                      <label className="u-kasir-cicil">
                        <span>Bayar</span>
                        <Input
                          size="sm"
                          inputMode="numeric"
                          value={formatRupiah(dipilih.jumlah)}
                          onChange={(e) => {
                            const v = Math.min(dipilih.max, angka(e.target.value));
                            setKeranjang((x) => x.map((b) => (b.kunci === k ? { ...b, jumlah: v } : b)));
                          }}
                          aria-label={`Jumlah bayar ${it.jenis_biaya}`}
                        />
                        {dipilih.jumlah < dipilih.max && <Badge variant="warning">Cicil</Badge>}
                      </label>
                    )}
                  </li>
                );
              })}
              {!tagihanMhs.length && (
                <Empty
                  title="Tidak ada tagihan tersisa"
                  description={modeLoket ? 'Tidak ada tagihan jenis biaya terbitan unit Anda yang belum lunas.' : 'Semua tagihan mahasiswa ini sudah lunas.'}
                  icon={<CheckCircle2 />}
                />
              )}
            </ul>
          )}
          {!nim && !pmb && <Empty title="Pilih mahasiswa" description="Ketik NIM atau nama untuk melihat tagihan yang belum lunas." icon={<Search />} />}
          {pmb && !keranjang.length && <Empty title="Cari tagihan PMB" description="Pindai atau ketik nomor tagihan dari bukti pendaftaran." icon={<Search />} />}
        </section>
        <aside className="u-kasir-kanan">
          <div className="u-kasir-keranjang">
            <div className="u-kasir-keranjang-kepala">
              <ShoppingCart aria-hidden />
              <b>Rincian bayar</b>
              <Badge>{keranjang.length}</Badge>
            </div>
            {keranjang.length ? (
              <ul>
                {keranjang.map((b) => (
                  <li key={b.kunci}>
                    <span>
                      <b>{b.label}</b>
                      <small>{b.sub}</small>
                    </span>
                    <b>{formatRupiah(b.jumlah)}</b>
                    <button type="button" aria-label={`Hapus ${b.label}`} onClick={() => setKeranjang((x) => x.filter((y) => y.kunci !== b.kunci))}>
                      <Trash2 />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="u-kasir-kosong">Belum ada tagihan dipilih.</p>
            )}
          </div>
          {!p.mobile && panelBayar}
        </aside>
      </div>
      {p.mobile && (
        <>
          <div className="u-kasir-bilah-bawah">
            <span>
              <small>{keranjang.length} tagihan</small>
              <b>{formatRupiah(total)}</b>
            </span>
            <Button disabled={!keranjang.length} onClick={() => setLembarBayar(true)}>
              <Receipt /> Bayar
            </Button>
          </div>
          <Dialog open={lembarBayar} onOpenChange={setLembarBayar} title="Pembayaran">
            {panelBayar}
          </Dialog>
        </>
      )}
      <Dialog open={Boolean(hasil)} onOpenChange={(o) => !o && setHasil(null)} title="Pembayaran berhasil" size="lg">
        {hasil && (
          <div className="u-kasir-struk">
            <div className="u-kasir-struk-sukses">
              <CheckCircle2 aria-hidden />
              <b>{formatRupiah(hasil.total)}</b>
              {hasil.diterima > hasil.total && <span>Kembalian {formatRupiah(hasil.diterima - hasil.total)}</span>}
            </div>
            {hasil.peringatan.length > 0 && (
              <Alert variant="warning" title="Catatan aturan penerimaan">
                {hasil.peringatan.map((x) => (
                  <span key={x} style={{ display: 'block' }}>
                    {x}
                  </span>
                ))}
              </Alert>
            )}
            {hasil.transaksi.map((t) => (
              <KwitansiPembayaran key={t.id} transaksiId={t.id} urlVerifikasi={urlVerifikasi} />
            ))}
            {hasil.pmb.map((t) => (
              <div key={t.id} className="u-kasir-struk-pmb">
                <ReceiptText aria-hidden />
                <span>
                  <b>{t.nomor}</b>
                  <small>{t.keterangan ?? t.jenis} · lunas</small>
                </span>
                <b>{formatRupiah(t.total)}</b>
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
}

// ================================================================ Riwayat pembayaran mahasiswa
export interface RiwayatPembayaranMahasiswaProps {
  /** Bawaan NIM akun yang masuk (mahasiswa). */
  nim?: string;
  /** `linimasa` per tanggal · `tabel` · `kartu` per periode dengan progres lunas. */
  varian?: 'linimasa' | 'tabel' | 'kartu';
  className?: string;
}

/** Riwayat pembayaran mahasiswa dari GET /v1/keuangan/mahasiswa/{nim}: ringkasan lunas, lalu pembayaran per tanggal/periode. */
export function RiwayatPembayaranMahasiswa({ nim: nimProp, varian = 'linimasa', className }: RiwayatPembayaranMahasiswaProps) {
  const akun = useAkunSaya({ foto: false });
  const p = usePlatform();
  const nim = nimProp ?? akun.data?.akun.username;
  const q = useKeuanganMahasiswa(nim);
  const v = p.mobile && varian === 'tabel' ? 'linimasa' : varian;
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  if (!q.data) return <Spinner />;
  const d = q.data;
  const bayar = d.periode
    .flatMap((per) => per.item.flatMap((it) => it.pembayaran.map((b) => ({ ...b, tahun_id: per.tahun_id, jenis: it.jenis_biaya }))))
    .sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)));
  const persenLunas = d.ringkasan.tagihan ? Math.round(((d.ringkasan.dibayar + d.ringkasan.potongan) / d.ringkasan.tagihan) * 100) : 100;
  return (
    <div className={cn('u-riwayat-bayar', className)} data-varian={v}>
      <div className="u-riwayat-bayar-ringkas">
        <div>
          <small>Total dibayar</small>
          <b>{formatRupiah(d.ringkasan.dibayar)}</b>
        </div>
        <div>
          <small>Sisa tagihan</small>
          <b data-ada={d.ringkasan.sisa > 0 || undefined}>{formatRupiah(d.ringkasan.sisa)}</b>
        </div>
        <ProgressBertumpuk
          legenda={false}
          tinggi="sm"
          bagian={[
            { label: 'Dibayar', nilai: d.ringkasan.dibayar, tone: 'success' },
            { label: 'Potongan', nilai: d.ringkasan.potongan, tone: 'info' },
            { label: 'Sisa', nilai: d.ringkasan.sisa, tone: 'muted' },
          ]}
          label={`${persenLunas}% lunas`}
        />
      </div>
      {v === 'kartu' ? (
        <div className="u-riwayat-bayar-kartu">
          {d.periode.map((per) => {
            const r = per.ringkasan;
            return (
              <article key={per.tahun_id}>
                <header>
                  <b>Periode {per.tahun_id}</b>
                  <Badge variant={r.sisa > 0 ? 'warning' : 'success'}>{r.sisa > 0 ? `Sisa ${formatRupiah(r.sisa)}` : 'Lunas'}</Badge>
                </header>
                <ProgressLangkah varian="segmen" langkah={per.item.map((it) => ({ label: it.jenis_biaya, status: it.sisa <= 0 ? 'selesai' : it.dibayar > 0 ? 'aktif' : 'menunggu' }))} />
                <ul>
                  {per.item.map((it) => (
                    <li key={String(it.kode_biaya)}>
                      <span>{it.jenis_biaya}</span>
                      <b>{formatRupiah(it.dibayar)}</b>
                      <small>/ {formatRupiah(it.tagihan)}</small>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      ) : v === 'tabel' ? (
        <table className="u-table u-riwayat-bayar-tabel">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Periode</th>
              <th>Jenis biaya</th>
              <th>Keterangan</th>
              <th style={{ textAlign: 'right' }}>Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {bayar.map((b) => (
              <tr key={`${b.id}-${b.tahun_id}`}>
                <td>{formatDate(b.tanggal)}</td>
                <td>{b.tahun_id}</td>
                <td>{b.jenis}</td>
                <td>{b.keterangan ?? '–'}</td>
                <td style={{ textAlign: 'right' }}>{formatRupiah(b.jumlah)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ol className="u-riwayat-bayar-linimasa">
          {bayar.map((b) => (
            <li key={`${b.id}-${b.tahun_id}`}>
              <span className="u-riwayat-bayar-titik" aria-hidden>
                <Receipt />
              </span>
              <span className="u-riwayat-bayar-teks">
                <b>{b.jenis}</b>
                <small>
                  {formatDate(b.tanggal, 'long')} · periode {b.tahun_id}
                  {b.keterangan ? ` · ${b.keterangan}` : ''}
                </small>
              </span>
              <b className="u-riwayat-bayar-jumlah">{formatRupiah(b.jumlah)}</b>
            </li>
          ))}
        </ol>
      )}
      {!bayar.length && v !== 'kartu' && <Empty title="Belum ada pembayaran" description="Pembayaran yang tercatat akan muncul di sini." icon={<Receipt />} />}
    </div>
  );
}

// ================================================================ Buku kas
export interface BukuKasProps {
  unitId?: number | null;
  /** Ikut unit turunan (prodi di bawah fakultas). */
  turunan?: boolean;
  /** Rentang awal (bawaan bulan ini). */
  rentang?: RentangTanggal;
  judul?: React.ReactNode;
  className?: string;
}

/** Buku kas unit (GET /v1/keu/kas): kas masuk/keluar per tanggal dengan saldo berjalan. Di mobile tampil sebagai daftar. */
export function BukuKas({ unitId, turunan, rentang: awal, judul = 'Buku kas', className }: BukuKasProps) {
  const p = usePlatform();
  const [rentang, setRentang] = React.useState<RentangTanggal>(() => awal ?? rentangPreset('bulan_ini'));
  const [arah, setArah] = React.useState<'semua' | 'masuk' | 'keluar'>('semua');
  const q = useBukuKas({ dari: rentang.dari, sampai: rentang.sampai, unit_id: unitId, turunan });
  const baris = (q.data?.baris ?? []).filter((b) => arah === 'semua' || b.arah === arah);
  return (
    <section className={cn('u-buku-kas', className)}>
      <header className="u-buku-kas-kepala">
        <h3>{judul}</h3>
        <PilihPeriode value={rentang} onChange={setRentang} />
      </header>
      {q.error && <GalatApi error={q.error} onRetry={q.refetch} />}
      <StatGrid min={150}>
        <StatCard label="Kas masuk" value={formatRupiah(q.data?.masuk)} icon={<ArrowDownLeft />} tone="success" loading={q.loading && !q.data} />
        <StatCard label="Kas keluar" value={formatRupiah(q.data?.keluar)} icon={<ArrowUpRight />} tone="danger" loading={q.loading && !q.data} />
        <StatCard label="Saldo periode" value={formatRupiah(q.data?.saldo)} icon={<Wallet />} loading={q.loading && !q.data} />
      </StatGrid>
      <SegmentedControl
        value={arah}
        onValueChange={setArah}
        options={[
          { value: 'semua', label: 'Semua' },
          { value: 'masuk', label: 'Masuk' },
          { value: 'keluar', label: 'Keluar' },
        ]}
        aria-label="Saring arah kas"
      />
      {p.mobile ? (
        <ul className="u-buku-kas-daftar">
          {baris.map((b) => (
            <li key={`${b.sumber}-${b.id}`} data-arah={b.arah}>
              <span className="u-buku-kas-ikon" aria-hidden>
                {b.arah === 'masuk' ? <ArrowDownLeft /> : <ArrowUpRight />}
              </span>
              <span className="u-buku-kas-teks">
                <b>{b.uraian}</b>
                <small>
                  {formatDate(b.tanggal)} · {b.nomor_bukti ?? b.kategori ?? b.sumber}
                </small>
              </span>
              <span className="u-buku-kas-angka">
                <b>
                  {b.arah === 'masuk' ? '+' : '−'}
                  {formatRupiah(b.jumlah)}
                </b>
                <small>Saldo {formatRupiah(b.saldo)}</small>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="u-table-container">
          <table className="u-table u-buku-kas-tabel" data-density="compact">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Bukti</th>
                <th>Uraian</th>
                <th>Unit</th>
                <th style={{ textAlign: 'right' }}>Masuk</th>
                <th style={{ textAlign: 'right' }}>Keluar</th>
                <th style={{ textAlign: 'right' }}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => (
                <tr key={`${b.sumber}-${b.id}`} data-arah={b.arah}>
                  <td>{formatDate(b.tanggal)}</td>
                  <td>{b.nomor_bukti ?? '–'}</td>
                  <td>
                    {b.uraian}
                    {b.kategori && <small className="u-buku-kas-kat"> · {b.kategori}</small>}
                  </td>
                  <td>{b.unit ?? '–'}</td>
                  <td className="u-buku-kas-masuk">{b.arah === 'masuk' ? formatRupiah(b.jumlah) : ''}</td>
                  <td className="u-buku-kas-keluar">{b.arah === 'keluar' ? formatRupiah(b.jumlah) : ''}</td>
                  <td style={{ textAlign: 'right' }}>{formatRupiah(b.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {q.data && !baris.length && <Empty title="Tidak ada transaksi kas" description="Coba ubah periode atau saringan." icon={<Wallet />} />}
    </section>
  );
}

// ================================================================ Jurnal umum
const NADA_JURNAL: Record<StatusJurnal, 'neutral' | 'success' | 'danger'> = { draf: 'neutral', diposting: 'success', dibatalkan: 'danger' };

export interface FormJurnalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  unitId?: number | null;
  /** Ubah jurnal draf. */
  jurnal?: JurnalDetail | null;
  /** Tampilkan "Simpan & posting" (admin). */
  bolehPosting?: boolean;
  onTersimpan?: (j: JurnalDetail) => void;
}

/** Formulir jurnal umum: baris akun debit/kredit dengan indikator seimbang; simpan draf atau langsung posting. */
export function FormJurnal({ open, onOpenChange, unitId, jurnal, bolehPosting, onTersimpan }: FormJurnalProps) {
  const siakad = useSiakad();
  const kosong = (): BarisJurnal => ({ akun_id: null, debit: 0, kredit: 0 });
  const [tanggal, setTanggal] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [uraian, setUraian] = React.useState('');
  const [bukti, setBukti] = React.useState('');
  const [jenis, setJenis] = React.useState('umum');
  const [baris, setBaris] = React.useState<BarisJurnal[]>([kosong(), kosong()]);
  const [galat, setGalat] = React.useState<unknown>(null);
  const [sibuk, setSibuk] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    setGalat(null);
    setTanggal(jurnal?.tanggal ?? new Date().toISOString().slice(0, 10));
    setUraian(jurnal?.uraian ?? '');
    setBukti(jurnal?.nomor_bukti ?? '');
    setJenis(jurnal?.jenis ?? 'umum');
    setBaris(jurnal?.baris?.length ? jurnal.baris.map((b) => ({ ...b })) : [kosong(), kosong()]);
  }, [open, jurnal]);
  const d = baris.reduce((a, b) => a + (b.debit || 0), 0);
  const k = baris.reduce((a, b) => a + (b.kredit || 0), 0);
  const seimbang = d > 0 && Math.abs(d - k) < 0.005;
  const lengkap = uraian.trim() && baris.filter((b) => b.akun_id && (b.debit || b.kredit)).length >= 2;
  const ubahBaris = (i: number, x: Partial<BarisJurnal>) => setBaris((bs) => bs.map((b, j) => (j === i ? { ...b, ...x } : b)));
  const simpan = async (posting: boolean) => {
    setSibuk(true);
    setGalat(null);
    try {
      const body = {
        tanggal,
        uraian,
        nomor_bukti: bukti || undefined,
        jenis,
        unit_id: unitId ?? undefined,
        posting: posting || undefined,
        baris: baris.filter((b) => b.akun_id && (b.debit || b.kredit)).map((b) => ({ akun_id: b.akun_id, debit: b.debit || 0, kredit: b.kredit || 0, keterangan: b.keterangan || undefined })),
      };
      const r = await siakad.request<JurnalDetail>({ method: 'POST', path: jurnal ? `/v1/keu/jurnal/${jurnal.id}` : '/v1/keu/jurnal', body });
      invalidateSiakad('keu');
      onTersimpan?.(r.data);
      onOpenChange(false);
    } catch (e) {
      setGalat(e);
    } finally {
      setSibuk(false);
    }
  };
  return (
    <Dialog
      side="right"
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={jurnal ? `Ubah jurnal ${jurnal.nomor}` : 'Jurnal baru'}
      description="Debit harus sama dengan kredit, minimal dua baris, akun rincian (bukan induk)."
      footer={
        <>
          <Button variant="outline" loading={sibuk} disabled={!seimbang || !lengkap} onClick={() => simpan(false)}>
            Simpan draf
          </Button>
          {bolehPosting && (
            <Button loading={sibuk} disabled={!seimbang || !lengkap} onClick={() => simpan(true)}>
              Simpan & posting
            </Button>
          )}
        </>
      }
    >
      <div className="u-jurnal-form">
        <div className="u-jurnal-form-kepala">
          <Field label="Tanggal">
            <IsianTanggal value={tanggal} onValueChange={setTanggal} />
          </Field>
          <Field label="Jenis">
            <Select
              value={jenis}
              onValueChange={(v) => setJenis(v ?? 'umum')}
              options={['umum', 'kas_masuk', 'kas_keluar', 'transfer', 'penyesuaian'].map((x) => ({ value: x, label: x.replace('_', ' ') }))}
            />
          </Field>
          <Field label="No. bukti" optional>
            <Input value={bukti} onChange={(e) => setBukti(e.target.value)} />
          </Field>
          <Field label="Uraian" className="u-jurnal-form-uraian">
            <Input value={uraian} onChange={(e) => setUraian(e.target.value)} placeholder="mis. Pembelian ATK prodi" />
          </Field>
        </div>
        <div className="u-jurnal-baris">
          <div className="u-jurnal-baris-kepala" aria-hidden>
            <span>Akun</span>
            <span>Debit</span>
            <span>Kredit</span>
            <span />
          </div>
          {baris.map((b, i) => (
            <div key={i} className="u-jurnal-baris-item">
              <PilihEntitas jenis={SUMBER_AKUN_KEU} value={b.akun_id} onValueChange={(v) => ubahBaris(i, { akun_id: v ? Number(v) : null })} aria-label={`Akun baris ${i + 1}`} />
              <Input
                inputMode="numeric"
                value={b.debit ? formatRupiah(b.debit) : ''}
                placeholder="0"
                onChange={(e) => ubahBaris(i, { debit: angka(e.target.value), kredit: angka(e.target.value) ? 0 : b.kredit })}
                aria-label={`Debit baris ${i + 1}`}
              />
              <Input
                inputMode="numeric"
                value={b.kredit ? formatRupiah(b.kredit) : ''}
                placeholder="0"
                onChange={(e) => ubahBaris(i, { kredit: angka(e.target.value), debit: angka(e.target.value) ? 0 : b.debit })}
                aria-label={`Kredit baris ${i + 1}`}
              />
              <Button variant="ghost" size="sm" iconOnly aria-label={`Hapus baris ${i + 1}`} disabled={baris.length <= 2} onClick={() => setBaris((bs) => bs.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setBaris((bs) => [...bs, kosong()])}>
            <Plus /> Tambah baris
          </Button>
          <div className="u-jurnal-seimbang" data-seimbang={seimbang || undefined}>
            <span>Total</span>
            <b>{formatRupiah(d)}</b>
            <b>{formatRupiah(k)}</b>
            <span>{seimbang ? 'Seimbang' : d || k ? `Selisih ${formatRupiah(Math.abs(d - k))}` : ''}</span>
          </div>
        </div>
        {galat != null && <GalatApi error={galat} title="Jurnal belum tersimpan" />}
      </div>
    </Dialog>
  );
}

/** Detail jurnal: baris debit/kredit, jurnal pembalik, dan aksi posting/batalkan/hapus sesuai status. */
export function DetailJurnal({ id, bolehPosting, onUbah }: { id: number; bolehPosting?: boolean; onUbah?: (j: JurnalDetail) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useJurnal(id);
  const [alasan, setAlasan] = React.useState('');
  const [konfirmasi, setKonfirmasi] = React.useState<'batalkan' | 'hapus' | null>(null);
  const [sibuk, setSibuk] = React.useState(false);
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  if (!q.data) return <Spinner />;
  const j = q.data;
  const aksi = async (jalur: 'posting' | 'batalkan' | 'hapus') => {
    setSibuk(true);
    try {
      await siakad.request({ method: 'POST', path: `/v1/keu/jurnal/${j.id}/${jalur}`, body: jalur === 'batalkan' ? { alasan } : undefined });
      invalidateSiakad('keu');
      toast.add({ title: jalur === 'posting' ? 'Jurnal diposting' : jalur === 'batalkan' ? 'Jurnal dibatalkan' : 'Jurnal dihapus' });
      setKonfirmasi(null);
      q.refetch();
    } catch (e) {
      toast.add({ title: 'Gagal', description: pesanGalat(e), type: 'error' });
    } finally {
      setSibuk(false);
    }
  };
  const d = j.baris.reduce((a, b) => a + b.debit, 0);
  const k = j.baris.reduce((a, b) => a + b.kredit, 0);
  return (
    <div className="u-jurnal-detail">
      <div className="u-jurnal-detail-kepala">
        <Badge variant={NADA_JURNAL[j.status]}>{j.status}</Badge>
        <span>
          {formatDate(j.tanggal, 'long')} · {j.jenis.replace('_', ' ')} · sumber {j.sumber.replace(/_/g, ' ')}
          {j.nomor_bukti ? ` · bukti ${j.nomor_bukti}` : ''}
        </span>
      </div>
      <p className="u-jurnal-detail-uraian">{j.uraian}</p>
      <div className="u-table-container">
        <table className="u-table" data-density="compact">
          <thead>
            <tr>
              <th>Akun</th>
              <th>Unit / rekening</th>
              <th style={{ textAlign: 'right' }}>Debit</th>
              <th style={{ textAlign: 'right' }}>Kredit</th>
            </tr>
          </thead>
          <tbody>
            {j.baris.map((b, i) => (
              <tr key={b.id ?? i}>
                <td style={{ paddingLeft: b.kredit ? '1.75rem' : undefined }}>
                  <b>{b.akun_kode}</b> {b.akun_nama}
                  {b.keterangan && <small className="u-jurnal-ket"> · {b.keterangan}</small>}
                </td>
                <td>{[b.unit, b.rekening].filter(Boolean).join(' · ') || '–'}</td>
                <td style={{ textAlign: 'right' }}>{b.debit ? formatRupiah(b.debit) : ''}</td>
                <td style={{ textAlign: 'right' }}>{b.kredit ? formatRupiah(b.kredit) : ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={2}>Jumlah</th>
              <th style={{ textAlign: 'right' }}>{formatRupiah(d)}</th>
              <th style={{ textAlign: 'right' }}>{formatRupiah(k)}</th>
            </tr>
          </tfoot>
        </table>
      </div>
      {j.alasan_batal && (
        <Alert variant="danger" title="Alasan batal">
          {j.alasan_batal}
        </Alert>
      )}
      {(j.pembalik || j.membalik) && (
        <Alert variant="info" title="Jurnal pembalik">
          {j.pembalik ? `Dibalik oleh ${j.pembalik.nomor} (${formatDate(j.pembalik.tanggal)}).` : `Membalik ${j.membalik!.nomor} (${formatDate(j.membalik!.tanggal)}).`}
        </Alert>
      )}
      <div className="u-jurnal-detail-aksi">
        {j.status === 'draf' && onUbah && (
          <Button variant="outline" onClick={() => onUbah(j)}>
            Ubah
          </Button>
        )}
        {j.status === 'draf' && bolehPosting && (
          <Button loading={sibuk} onClick={() => aksi('posting')}>
            Posting
          </Button>
        )}
        {j.status !== 'dibatalkan' && bolehPosting && (
          <Button variant="destructive-soft" onClick={() => setKonfirmasi('batalkan')}>
            Batalkan
          </Button>
        )}
        {j.status !== 'diposting' && (
          <Button variant="ghost" onClick={() => setKonfirmasi('hapus')}>
            <Trash2 /> Hapus
          </Button>
        )}
      </div>
      <Dialog
        open={Boolean(konfirmasi)}
        onOpenChange={(o) => !o && setKonfirmasi(null)}
        size="sm"
        title={konfirmasi === 'batalkan' ? `Batalkan ${j.nomor}?` : `Hapus ${j.nomor}?`}
        description={
          konfirmasi === 'batalkan'
            ? j.status === 'diposting'
              ? 'Jurnal diposting dibalik dengan jurnal pembalik; jejak audit tetap utuh.'
              : 'Draf ditandai dibatalkan.'
            : 'Hanya draf/dibatalkan yang bisa dihapus.'
        }
        footer={
          <Button variant="destructive" loading={sibuk} disabled={konfirmasi === 'batalkan' && !alasan.trim()} onClick={() => aksi(konfirmasi!)}>
            {konfirmasi === 'batalkan' ? 'Batalkan jurnal' : 'Hapus jurnal'}
          </Button>
        }
      >
        {konfirmasi === 'batalkan' && (
          <Field label="Alasan">
            <Textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} rows={2} />
          </Field>
        )}
      </Dialog>
    </div>
  );
}

export interface JurnalUmumProps {
  unitId?: number | null;
  /** Admin keuangan: boleh posting/batalkan. Bawaan dari /v1/keuangan/saya (admin). */
  bolehPosting?: boolean;
  judul?: React.ReactNode;
  className?: string;
}

/** Jurnal umum (GET /v1/keu/jurnal): saring status, cari, rentang; buka detail, buat/ubah jurnal, posting dan batal. */
export function JurnalUmum({ unitId, bolehPosting: boleh, judul = 'Jurnal umum', className }: JurnalUmumProps) {
  const p = usePlatform();
  const saya = useKeuanganSaya();
  const bolehPosting = boleh ?? Boolean(saya.data?.admin);
  const [status, setStatus] = React.useState<'semua' | StatusJurnal>('semua');
  const [kata, setKata] = React.useState('');
  const [rentang, setRentang] = React.useState<RentangTanggal>(() => rentangPreset('bulan_ini'));
  const q = useDaftarJurnal({ status: status === 'semua' ? undefined : status, q: kata, dari: rentang.dari, sampai: rentang.sampai, unit_id: unitId });
  const [buka, setBuka] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<{ jurnal: JurnalDetail | null } | null>(null);
  return (
    <section className={cn('u-jurnal', className)}>
      <header className="u-jurnal-kepala">
        <h3>{judul}</h3>
        <Button onClick={() => setForm({ jurnal: null })}>
          <Plus /> Jurnal baru
        </Button>
      </header>
      <div className="u-jurnal-saring">
        <SegmentedControl
          value={status}
          onValueChange={setStatus}
          options={[
            { value: 'semua', label: 'Semua' },
            { value: 'draf', label: 'Draf' },
            { value: 'diposting', label: 'Diposting' },
            { value: 'dibatalkan', label: 'Batal' },
          ]}
          aria-label="Saring status jurnal"
        />
        <PilihPeriode value={rentang} onChange={setRentang} />
        <IsianCari className="u-jurnal-cari" value={kata} onValueChange={setKata} placeholder="Nomor, uraian, bukti" aria-label="Cari jurnal" />
      </div>
      {q.error && <GalatApi error={q.error} onRetry={q.refetch} />}
      <ul className="u-jurnal-daftar" data-mobile={p.mobile || undefined}>
        {(q.data ?? []).map((j) => (
          <li key={j.id}>
            <button type="button" onClick={() => setBuka(j.id)}>
              <span className="u-jurnal-nomor">
                <b>{j.nomor}</b>
                <small>{formatDate(j.tanggal)}</small>
              </span>
              <span className="u-jurnal-uraian">
                {j.uraian}
                <small>
                  {j.jenis.replace('_', ' ')} · {j.sumber.replace(/_/g, ' ')}
                  {j.unit ? ` · ${j.unit}` : ''}
                </small>
              </span>
              <b className="u-jurnal-total">{formatRupiah(j.total)}</b>
              <Badge variant={NADA_JURNAL[j.status]}>{j.status}</Badge>
            </button>
          </li>
        ))}
      </ul>
      {q.loading && !q.data && <Spinner />}
      {q.data && !q.data.length && <Empty title="Belum ada jurnal" description="Jurnal otomatis muncul setelah sinkron; jurnal manual dibuat dari tombol Jurnal baru." icon={<BookOpenCheck />} />}
      <Dialog open={buka != null} onOpenChange={(o) => !o && setBuka(null)} size="lg" title={(q.data ?? []).find((j) => j.id === buka)?.nomor ?? 'Jurnal'}>
        {buka != null && (
          <DetailJurnal
            id={buka}
            bolehPosting={bolehPosting}
            onUbah={(j) => {
              setBuka(null);
              setForm({ jurnal: j });
            }}
          />
        )}
      </Dialog>
      <FormJurnal open={Boolean(form)} onOpenChange={(o) => !o && setForm(null)} jurnal={form?.jurnal} unitId={unitId} bolehPosting={bolehPosting} />
    </section>
  );
}
