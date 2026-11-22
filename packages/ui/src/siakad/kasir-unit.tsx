'use client';
import * as React from 'react';
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CalendarRange,
  Clock,
  Columns3,
  Eye,
  FileClock,
  FileText,
  Gavel,
  History,
  Layers,
  ListChecks,
  MonitorSmartphone,
  PenLine,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Search,
  ShieldAlert,
  Signature,
  Target,
  Trash2,
  UserSearch,
  Wallet,
} from 'lucide-react';
import { Badge, Button, Spinner, type BadgeVariant } from '../components/actions';
import { Alert, Card, Empty, Tabs } from '../components/display';
import { DataTable, type DataColumn } from '../components/data-table';
import { Checkbox, CheckboxGroup, Field, Input, RadioGroup, Switch, Textarea } from '../components/forms';
import { IsianTanggal } from '../components/formulir';
import { ConfirmDialog, Sheet, useToast } from '../components/overlays';
import { PanelLangkah } from '../components/panel-langkah';
import { Select, type SelectOption } from '../components/select';
import { WizardReview } from '../components/wizard';
import { cn } from '../lib/cn';
import { formatDate, formatNumber, formatRupiah } from '../lib/format';
import { PilihTahunAkademik } from './cari';
import { GalatApi } from './galat';
import { namaRapi } from './prodi';
import { PerangkatKasir } from './perangkat-kasir';
import { DaftarAturan, FormAturan as FormAturanUmum, type Aturan } from './aturan';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { IsianJam } from '../components/isian-angka';

// Pengaturan kasir per unit penerbit (SIAKAD /v1/kasir/kelola, docs/KASIR.md "Pengaturan di aplikasi unit"): jenis
// biaya, loket, aturan penerimaan per status akademik, jadwal aktif pembayaran, dan templat laporan kasir. Dipasang di
// aplikasi unit (BAUK/Keuangan, BAAK, PMB, Fakultas); aplikasi desktop Kasir hanya menerima pembayaran.

const API = '/v1/kasir/kelola';

// ================================================================ Tipe
export type KeputusanKasir = 'izinkan' | 'tunggakan_saja' | 'tolak';
export type SumberJadwalKasir = 'selalu' | 'kalender' | 'manual';
export type JenisTemplatKasir = 'harian' | 'rekap_periode' | 'per_jenis' | 'setoran' | 'periode_akademik' | 'tunggakan';

export interface UnitKasirKelola {
  id: number;
  kode: string;
  jenis: string;
  nama: string;
  singkatan?: string | null;
  induk_id?: number | null;
}

export interface KolomTemplatKasir {
  kunci: string;
  label: string;
  angka: boolean;
}

export interface IsiTemplatKasir {
  judul: string;
  subjudul: string;
  kop: boolean;
  kolom: string[];
  kelompok: string | null;
  subtotal: boolean;
  total: boolean;
  ringkas: boolean;
  catatan_kaki: string;
  penanda_tangan: Array<{ jabatan: string; nama: string; nip: string }>;
  kota: string;
  kertas: string;
  orientasi: 'potret' | 'lanskap';
}

export interface KasirKelolaSaya {
  /** Lintas unit (kasir.lintas_unit/superadmin): semua unit. */
  lintas: boolean;
  /** Boleh mengatur biaya universitas (BAUK). */
  universitas: boolean;
  bauk_id: number | null;
  unit: UnitKasirKelola[];
  /** Unit aplikasi pemanggil dari server (fakultas aplikasi Fakultas, header X-Unipo-Fakultas); null = tanpa batas. */
  unit_aplikasi?: number | null;
  status: Array<{ kode: string; label: string; jumlah: number }>;
  kategori: Record<string, string>;
  perlakuan: string[];
  keputusan: Record<KeputusanKasir, string>;
  sumber_jadwal: Record<SumberJadwalKasir, string>;
  tahapan: Array<{ kode: string; label: string }>;
  /** Titik aturan penerimaan (kasir.terima); aturan dikelola di modul Aturan. */
  aturan_titik?: string;
  templat: {
    jenis: Array<{ kode: JenisTemplatKasir; nama: string; sumber: string; bawaan: Partial<IsiTemplatKasir> }>;
    kolom: Record<string, KolomTemplatKasir[]>;
    kertas: string[];
  };
}

export interface JenisBiayaKasir {
  kode_biaya: string;
  nama: string;
  unit_id: number | null;
  unit: string | null;
  unit_kode?: string | null;
  perlakuan: string;
  kategori: string;
  nominal_bawaan: number | null;
  tagih_otomatis: boolean;
  batasi_prodi: boolean;
  potongan_kasir: boolean;
  /** Boleh dibayar di muka (deposit menunggu periode). */
  bayar_dimuka?: boolean;
  /** Paling cepat N hari sebelum jendela penerimaan dibuka; null = kapan saja sebelum dibuka. */
  dimuka_hari?: number | null;
  urutan: number;
  aktif: boolean;
  keterangan: string | null;
  diatur?: boolean;
}

export interface LoketKasir {
  id: number;
  kode: string;
  nama: string | null;
  unit_id: number | null;
  unit: string | null;
  pengguna: string | null;
  versi?: string | null;
  os?: string | null;
  jumlah_transaksi: number | null;
  terakhir_aktif_at: string | null;
  aktif: number | boolean;
}

interface BarisBerversi {
  id: number;
  kunci: string;
  versi: number;
  unit_id: number | null;
  unit: string | null;
  unit_singkatan?: string | null;
  aktif: number | boolean;
  dibuat_oleh?: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
  boleh_ubah?: boolean;
}

export interface AturanPenerimaanKasir extends BarisBerversi {
  kode_biaya: string | null;
  jenis_biaya?: string | null;
  kategori: string | null;
  status: string[];
  keputusan: KeputusanKasir;
  alasan: string | null;
  berlaku_mulai: string | null;
  berlaku_selesai: string | null;
  bawaan?: number | boolean;
  catatan: string | null;
}

export interface JadwalAktifKasir extends BarisBerversi {
  kode_biaya: string | null;
  jenis_biaya?: string | null;
  kategori: string | null;
  sumber: SumberJadwalKasir;
  tahapan: string | null;
  mulai: string | null;
  selesai: string | null;
  jam_mulai: string | null;
  jam_selesai: string | null;
  hari: string | null;
  catatan: string | null;
}

export interface TemplatLaporanKasir extends BarisBerversi {
  jenis: JenisTemplatKasir;
  nama: string;
  isi: IsiTemplatKasir;
}

export interface JendelaKasir {
  status: 'buka' | 'belum' | 'tutup' | 'di_luar_jam';
  buka: boolean;
  sumber: string;
  mulai: string | null;
  selesai: string | null;
  keterangan: string;
}

interface NilaiSimulasi {
  boleh: boolean;
  kode: string | null;
  alasan: string | null;
  keputusan: KeputusanKasir;
  jendela: JendelaKasir;
  /** Aturan peringatan / aturan tanpa SK dasar (belum menolak). */
  peringatan?: Array<{ aturan_id?: string | null; nama?: string | null; pesan: string; tanpa_sk?: boolean }>;
}

export interface SimulasiKasir {
  mahasiswa: { nim: string; nama: string; kode_prodi: string; status: string; status_label: string };
  tahun_aktif: string | null;
  tanggal: string;
  jenis: Array<{ kode_biaya: string; nama: string; unit: string | null; kategori: string; baru: NilaiSimulasi; tunggakan: NilaiSimulasi }>;
}

export interface PratinjauJadwalKasir {
  tahun_id: string | null;
  jenis: Array<{ kode_biaya: string; nama: string; unit: string | null; kategori: string; jendela: JendelaKasir }>;
}

// ================================================================ Label & pembantu
const PERLAKUAN: Record<string, { label: string; keterangan: string }> = {
  per_semester: { label: 'Per semester', keterangan: 'Ditagih setiap periode akademik.' },
  satu_kali: { label: 'Satu kali', keterangan: 'Sekali selama studi, mis. sumbangan gedung, wisuda.' },
  per_sks: { label: 'Per SKS', keterangan: 'Nominal dikali jumlah SKS yang diambil.' },
  per_mk: { label: 'Per mata kuliah', keterangan: 'Nominal per mata kuliah, mis. praktikum.' },
  sewaktu: { label: 'Sewaktu-waktu', keterangan: 'Layanan sesuai permintaan, mis. legalisir.' },
};
const NADA_KEPUTUSAN: Record<KeputusanKasir, BadgeVariant> = { izinkan: 'success', tunggakan_saja: 'warning', tolak: 'danger' };
const STATUS_JENDELA: Record<JendelaKasir['status'], { label: string; nada: BadgeVariant }> = {
  buka: { label: 'Dibuka', nada: 'success' },
  belum: { label: 'Belum dibuka', nada: 'info' },
  tutup: { label: 'Ditutup', nada: 'neutral' },
  di_luar_jam: { label: 'Di luar jam layanan', nada: 'warning' },
};
const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const UNIV = 'univ';
const KERTAS_MM: Record<string, [number, number]> = { A4: [210, 297], F4: [215, 330], Letter: [216, 279], A5: [148, 210] };

const benar = (v: unknown) => v === true || v === 1 || v === '1';
const tgl = (s: string | null | undefined) => (s ? formatDate(s.replace(' ', 'T'), 'medium') : '');
const jamPendek = (s: string | null | undefined) => (s ? s.slice(0, 5) : '');

function judulGalat(e: unknown): { status?: number; code?: string } {
  return (e as { status?: number; code?: string }) ?? {};
}

/** Nama unit pendek: singkatan bila ada, lalu nama rapi. */
function namaUnit(saya: KasirKelolaSaya, id: number | null | undefined, cadangan?: string | null): string {
  if (id == null || id === saya.bauk_id) return 'Universitas (BAUK)';
  const u = saya.unit.find((x) => x.id === id);
  if (u) return u.singkatan || namaRapi(u.nama);
  return namaRapi(cadangan) || `Unit ${id}`;
}

const kunciUnit = (id: number | null | undefined, saya: KasirKelolaSaya) => (id == null || id === saya.bauk_id ? UNIV : String(id));
const unitDariKunci = (k: string | null) => (!k || k === UNIV ? null : Number(k));

/** Pilihan unit yang boleh diatur pengguna (disaring `unitId` bila ada). */
function opsiUnit(saya: KasirKelolaSaya, unitId?: number): SelectOption<string>[] {
  const daftar = saya.unit.filter((u) => u.id !== saya.bauk_id && (unitId == null || u.id === unitId || u.induk_id === unitId));
  return [
    ...(saya.universitas && unitId == null ? [{ value: UNIV, label: 'Universitas (BAUK)', description: 'Berlaku untuk semua unit sebagai acuan' }] : []),
    ...daftar.map((u) => ({ value: String(u.id), label: u.singkatan ? `${u.singkatan} · ${namaRapi(u.nama)}` : namaRapi(u.nama), description: u.kode })),
  ];
}

function unitAwal(saya: KasirKelolaSaya, unitId?: number): string | null {
  if (unitId != null) return String(unitId);
  if (saya.universitas) return UNIV;
  const u = saya.unit.find((x) => x.id !== saya.bauk_id);
  return u ? String(u.id) : null;
}

/** Saring baris ke unit `unitId` (dan acuan universitas bila `denganUniv`). */
function dalamUnit<T extends { unit_id: number | null }>(rows: T[] | undefined, saya: KasirKelolaSaya, unitId: number | undefined, denganUniv: boolean): T[] | undefined {
  if (!rows || unitId == null) return rows;
  const anak = new Set([unitId, ...saya.unit.filter((u) => u.induk_id === unitId).map((u) => u.id)]);
  return rows.filter((r) => (r.unit_id == null || r.unit_id === saya.bauk_id ? denganUniv : anak.has(r.unit_id)));
}

function teksSasaran(saya: KasirKelolaSaya, r: { kode_biaya: string | null; jenis_biaya?: string | null; kategori: string | null }): string {
  if (r.kode_biaya) return `${r.jenis_biaya ?? r.kode_biaya} (${r.kode_biaya})`;
  if (r.kategori) return `Kategori ${saya.kategori[r.kategori] ?? r.kategori}`;
  return 'Semua jenis biaya';
}

function SasaranSel({ saya, r }: { saya: KasirKelolaSaya; r: { unit_id: number | null; unit: string | null; kode_biaya: string | null; jenis_biaya?: string | null; kategori: string | null } }) {
  return (
    <span className="u-ksu-sasaran">
      <b>{teksSasaran(saya, r)}</b>
      <small>{namaUnit(saya, r.unit_id, r.unit)}</small>
    </span>
  );
}

function LencanaAktif({ aktif, teksNonaktif = 'Nonaktif' }: { aktif: unknown; teksNonaktif?: string }) {
  return benar(aktif) ? <Badge variant="success">Aktif</Badge> : <Badge variant="outline">{teksNonaktif}</Badge>;
}

// ================================================================ Isian sasaran (aturan & jadwal)
type CakupanSasaran = 'semua' | 'jenis' | 'kategori';
interface IsianSasaran {
  unit: string | null;
  cakupan: CakupanSasaran;
  kode_biaya: string | null;
  kategori: string | null;
}

function validasiSasaran(v: IsianSasaran): string | null {
  if (!v.unit) return 'Pilih unit pemilik aturan.';
  if (v.cakupan === 'jenis' && !v.kode_biaya) return 'Pilih jenis biaya.';
  if (v.cakupan === 'kategori' && !v.kategori) return 'Pilih kategori jenis biaya.';
  return null;
}

function bodySasaran(v: IsianSasaran) {
  return { unit_id: unitDariKunci(v.unit), kode_biaya: v.cakupan === 'jenis' ? v.kode_biaya : null, kategori: v.cakupan === 'kategori' ? v.kategori : null };
}

function sasaranDari(saya: KasirKelolaSaya, r: { unit_id: number | null; kode_biaya: string | null; kategori: string | null }): IsianSasaran {
  return { unit: kunciUnit(r.unit_id, saya), cakupan: r.kode_biaya ? 'jenis' : r.kategori ? 'kategori' : 'semua', kode_biaya: r.kode_biaya, kategori: r.kategori };
}

function teksSasaranIsian(saya: KasirKelolaSaya, v: IsianSasaran, jenis: JenisBiayaKasir[]): string {
  if (v.cakupan === 'jenis') {
    const j = jenis.find((x) => x.kode_biaya === v.kode_biaya);
    return j ? `${j.nama} (${j.kode_biaya})` : (v.kode_biaya ?? '');
  }
  if (v.cakupan === 'kategori') return `Kategori ${saya.kategori[v.kategori ?? ''] ?? v.kategori ?? ''}`;
  return 'Semua jenis biaya';
}

function IsianSasaranForm({ saya, unitId, v, set, jenis, kunciTetap }: { saya: KasirKelolaSaya; unitId?: number; v: IsianSasaran; set: (x: Partial<IsianSasaran>) => void; jenis: JenisBiayaKasir[]; kunciTetap?: boolean }) {
  const opsiJenis: SelectOption<string>[] = jenis.map((j) => ({ value: j.kode_biaya, label: `${j.nama}`, description: `${j.kode_biaya}${j.aktif ? '' : ' · nonaktif'}`, group: namaUnit(saya, j.unit_id, j.unit) }));
  return (
    <div className="u-ksu-isian">
      <Field label="Unit pemilik" required description={kunciTetap ? 'Unit tidak bisa diganti saat mengubah; hapus lalu buat baru bila perlu.' : 'Aturan unit lebih diutamakan daripada aturan universitas.'}>
        <Select<string> value={v.unit} onValueChange={(x) => set({ unit: x })} options={opsiUnit(saya, unitId)} placeholder="Pilih…" disabled={kunciTetap} />
      </Field>
      <Field label="Berlaku untuk" required>
        <RadioGroup<CakupanSasaran>
          variant="card"
          columns={3}
          value={v.cakupan}
          onValueChange={(x) => set({ cakupan: x })}
          options={[
            { value: 'semua', label: 'Semua jenis biaya', description: 'Semua jenis biaya terbitan unit ini' },
            { value: 'jenis', label: 'Satu jenis biaya', description: 'Paling khusus, mis. praktikum' },
            { value: 'kategori', label: 'Satu kategori', description: 'Mis. biaya kuliah, alumni' },
          ]}
        />
      </Field>
      {v.cakupan === 'jenis' && (
        <Field label="Jenis biaya" required>
          <Select<string> value={v.kode_biaya} onValueChange={(x) => set({ kode_biaya: x })} options={opsiJenis} placeholder="Pilih…" />
        </Field>
      )}
      {v.cakupan === 'kategori' && (
        <Field label="Kategori" required description="Kategori diatur pada tab Jenis biaya.">
          <Select<string> value={v.kategori} onValueChange={(x) => set({ kategori: x })} options={Object.entries(saya.kategori).map(([k, l]) => ({ value: k, label: l }))} placeholder="Pilih…" />
        </Field>
      )}
    </div>
  );
}

// ================================================================ Riwayat versi
function RiwayatVersi({ jenis, kunci, judul, onOpenChange, ringkas }: { jenis: 'aturan' | 'jadwal' | 'templat'; kunci: string | null; judul: string; onOpenChange: (o: boolean) => void; ringkas: (r: Record<string, unknown>) => React.ReactNode }) {
  const q = useSiakadQuery<Array<Record<string, unknown>>>([`${API}/${jenis}/riwayat`, kunci], (s, signal) => s.request({ method: 'GET', path: `${API}/${jenis}/${kunci}/riwayat` }, { signal }), { enabled: Boolean(kunci) });
  return (
    <Sheet open={Boolean(kunci)} onOpenChange={onOpenChange} size="md" title={judul} description="Setiap simpan membuat versi baru; hanya versi terkini yang dipakai kasir.">
      {q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : !q.data ? (
        <Spinner />
      ) : (
        <ol className="u-ksu-riwayat">
          {q.data.map((r) => (
            <li key={String(r.id)} data-terkini={benar(r.terkini) || undefined}>
              <span className="u-ksu-riwayat-kepala">
                <Badge variant={benar(r.terkini) ? 'primary' : 'outline'}>Versi {String(r.versi)}</Badge>
                {benar(r.terkini) && !r.deleted_at && <Badge variant="success">Terkini</Badge>}
                {r.deleted_at ? <Badge variant="danger">Dihapus</Badge> : null}
                <small>
                  {formatDate(String(r.created_at ?? '').replace(' ', 'T'), 'medium')} · {String(r.dibuat_oleh ?? '–')}
                </small>
              </span>
              <div className="u-ksu-riwayat-isi">{ringkas(r)}</div>
            </li>
          ))}
        </ol>
      )}
    </Sheet>
  );
}

// ================================================================ Tab Jenis biaya
interface IsianJenis {
  baru: boolean;
  kode_biaya: string;
  nama: string;
  unit: string | null;
  kategori: string | null;
  perlakuan: string;
  nominal_bawaan: string;
  tagih_otomatis: boolean;
  batasi_prodi: boolean;
  potongan_kasir: boolean;
  bayar_dimuka: boolean;
  dimuka_hari: string;
  urutan: string;
  aktif: boolean;
  keterangan: string;
}

const angka = (s: string) => s.replace(/[^\d]/g, '');

function FormJenis({ awal, onOpenChange, saya, unitId, daftar }: { awal: IsianJenis | null; onOpenChange: (o: boolean) => void; saya: KasirKelolaSaya; unitId?: number; daftar: JenisBiayaKasir[] }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [v, setV] = React.useState<IsianJenis | null>(awal);
  React.useEffect(() => {
    if (awal) setV(awal);
  }, [awal]);
  if (!v) return null;
  const set = (x: Partial<IsianJenis>) => setV((o) => (o ? { ...o, ...x } : o));
  const ada = v.baru && daftar.some((j) => j.kode_biaya.toLowerCase() === v.kode_biaya.trim().toLowerCase());
  return (
    <PanelLangkah
      open={Boolean(awal)}
      onOpenChange={onOpenChange}
      mode={v.baru ? 'buat' : 'ubah'}
      title={v.baru ? 'Tambah jenis biaya' : `Ubah ${v.nama}`}
      description="Jenis biaya yang diterbitkan unit dan cara kasir menagihnya."
      footerNote="Perubahan berlaku untuk transaksi berikutnya di semua loket."
      steps={[
        {
          id: 'identitas',
          title: 'Identitas',
          icon: <Receipt />,
          validate: () => {
            if (!/^[A-Za-z0-9._-]{1,20}$/.test(v.kode_biaya.trim())) return 'Kode biaya wajib: huruf/angka, maks. 20 karakter.';
            if (ada) return `Kode ${v.kode_biaya} sudah dipakai. Ubah jenis biaya itu dari daftar.`;
            if (v.baru && !v.nama.trim()) return 'Nama jenis biaya wajib diisi.';
            return null;
          },
          content: (
            <div className="u-ksu-isian">
              <Field label="Kode biaya" required error={ada ? 'Kode sudah dipakai.' : null} description={v.baru ? 'Kode unik, mis. PRKFSP. Tidak bisa diganti setelah disimpan.' : 'Kode tidak bisa diganti.'}>
                <Input value={v.kode_biaya} maxLength={20} disabled={!v.baru} onChange={(e) => set({ kode_biaya: e.target.value.toUpperCase().replace(/[^A-Z0-9._-]/g, '') })} className="u-ksu-mono" />
              </Field>
              <Field label="Nama jenis biaya" required={v.baru} description={v.baru ? 'Maks. 40 karakter; tampil di kwitansi dan laporan.' : 'Nama diubah lewat Master Jenis Biaya (Keuangan).'}>
                <Input value={v.nama} maxLength={40} disabled={!v.baru} onChange={(e) => set({ nama: e.target.value })} />
              </Field>
              <Field label="Keterangan" optional>
                <Textarea rows={2} maxLength={1000} value={v.keterangan} onChange={(e) => set({ keterangan: e.target.value })} />
              </Field>
            </div>
          ),
        },
        {
          id: 'penerbit',
          title: 'Penerbit & kategori',
          icon: <Layers />,
          validate: () => (!v.unit ? 'Pilih unit penerbit.' : !v.kategori ? 'Pilih kategori.' : null),
          content: (
            <div className="u-ksu-isian">
              <Field label="Unit penerbit" required description="Hanya petugas kasir unit ini (dan unit induknya) yang melayani jenis biaya ini.">
                <Select<string> value={v.unit} onValueChange={(x) => set({ unit: x })} options={opsiUnit(saya, unitId)} placeholder="Pilih…" />
              </Field>
              <Field label="Kategori" required description="Dipakai aturan penerimaan, mis. mahasiswa lulus hanya boleh membayar kategori alumni.">
                <RadioGroup<string> variant="card" columns={2} value={v.kategori ?? undefined} onValueChange={(x) => set({ kategori: x })} options={Object.entries(saya.kategori).map(([k, l]) => ({ value: k, label: l }))} />
              </Field>
            </div>
          ),
        },
        {
          id: 'penagihan',
          title: 'Penagihan',
          icon: <Wallet />,
          validate: () => (v.urutan && !/^\d{1,4}$/.test(v.urutan) ? 'Urutan 0–9999.' : v.tagih_otomatis && !v.nominal_bawaan ? 'Tagih otomatis butuh nominal bawaan (atau tarif di Setup Biaya).' : null),
          content: (
            <div className="u-ksu-isian">
              <Field label="Perlakuan" required>
                <Select<string> value={v.perlakuan} onValueChange={(x) => x && set({ perlakuan: x })} options={saya.perlakuan.map((p) => ({ value: p, label: PERLAKUAN[p]?.label ?? p, description: PERLAKUAN[p]?.keterangan }))} placeholder="Pilih…" />
              </Field>
              <div className="u-ksu-dua">
                <Field label="Nominal bawaan" optional description="Rupiah; dipakai bila tarif belum diatur.">
                  <Input inputMode="numeric" value={v.nominal_bawaan ? formatNumber(Number(v.nominal_bawaan)) : ''} onChange={(e) => set({ nominal_bawaan: angka(e.target.value) })} placeholder="0" />
                </Field>
                <Field label="Urutan" description="Kecil = tampil lebih dulu di kasir.">
                  <Input inputMode="numeric" value={v.urutan} maxLength={4} onChange={(e) => set({ urutan: angka(e.target.value) })} />
                </Field>
              </div>
              <div className="u-ksu-sakelar-daftar">
                <Sakelar nilai={v.tagih_otomatis} ubah={(c) => set({ tagih_otomatis: c })} label="Tagih otomatis" ket="Bila tagihan belum ada, kasir membuat tagihan dari tarif saat menerima pembayaran." />
                <Sakelar nilai={v.batasi_prodi} ubah={(c) => set({ batasi_prodi: c })} label="Batasi prodi unit" ket="Hanya mahasiswa prodi di bawah unit penerbit yang bisa membayar." />
                <Sakelar nilai={v.potongan_kasir} ubah={(c) => set({ potongan_kasir: c })} label="Kasir boleh memberi potongan" ket="Potongan mengurangi nominal tagihan dan tercatat di kwitansi." />
                <Sakelar nilai={v.bayar_dimuka} ubah={(c) => set({ bayar_dimuka: c })} label="Boleh dibayar di muka" ket="Mahasiswa boleh membayar sebelum periode dibuka; uang disimpan sebagai deposit dan otomatis melunasi tagihan saat terbit. Tanpa saklar ini pembayaran di luar jadwal ditolak." />
                <Sakelar nilai={v.aktif} ubah={(c) => set({ aktif: c })} label="Aktif" ket="Jenis biaya nonaktif tidak tampil di kasir." />
              </div>
              {v.bayar_dimuka && (
                <Field label="Paling cepat (hari sebelum dibuka)" optional description="Kosong = kapan saja sebelum jendela penerimaan dibuka. Mis. 30 = mulai 30 hari sebelum masa pembayaran.">
                  <Input inputMode="numeric" value={v.dimuka_hari} maxLength={3} onChange={(e) => set({ dimuka_hari: angka(e.target.value) })} placeholder="Kapan saja" />
                </Field>
              )}
            </div>
          ),
        },
        {
          id: 'ringkasan',
          title: 'Ringkasan',
          icon: <Eye />,
          content: (
            <WizardReview
              sections={[
                { title: 'Identitas', items: [{ label: 'Kode', value: v.kode_biaya }, { label: 'Nama', value: v.nama }, { label: 'Keterangan', value: v.keterangan }] },
                { title: 'Penerbit & kategori', items: [{ label: 'Unit penerbit', value: v.unit ? namaUnit(saya, unitDariKunci(v.unit)) : null }, { label: 'Kategori', value: v.kategori ? saya.kategori[v.kategori] : null }] },
                {
                  title: 'Penagihan',
                  items: [
                    { label: 'Perlakuan', value: PERLAKUAN[v.perlakuan]?.label ?? v.perlakuan },
                    { label: 'Nominal bawaan', value: v.nominal_bawaan ? formatRupiah(Number(v.nominal_bawaan)) : 'Mengikuti tarif' },
                    { label: 'Tagih otomatis', value: v.tagih_otomatis ? 'Ya' : 'Tidak' },
                    { label: 'Batasi prodi', value: v.batasi_prodi ? 'Ya' : 'Tidak' },
                    { label: 'Potongan kasir', value: v.potongan_kasir ? 'Boleh' : 'Tidak' },
                    { label: 'Bayar di muka', value: v.bayar_dimuka ? (v.dimuka_hari ? `Boleh, paling cepat ${v.dimuka_hari} hari sebelum dibuka` : 'Boleh, kapan saja sebelum dibuka') : 'Tidak' },
                    { label: 'Status', value: v.aktif ? 'Aktif' : 'Nonaktif' },
                  ],
                },
              ]}
            />
          ),
        },
      ]}
      onFinish={async () => {
        try {
          await siakad.request({
            method: 'POST',
            path: `${API}/jenis`,
            body: {
              kode_biaya: v.kode_biaya.trim(),
              ...(v.baru ? { nama: v.nama.trim() } : {}),
              unit_id: unitDariKunci(v.unit),
              kategori: v.kategori,
              perlakuan: v.perlakuan,
              nominal_bawaan: v.nominal_bawaan ? Number(v.nominal_bawaan) : null,
              tagih_otomatis: v.tagih_otomatis,
              batasi_prodi: v.batasi_prodi,
              potongan_kasir: v.potongan_kasir,
              bayar_dimuka: v.bayar_dimuka,
              dimuka_hari: v.bayar_dimuka && v.dimuka_hari ? Number(v.dimuka_hari) : null,
              urutan: Number(v.urutan || 100),
              aktif: v.aktif,
              keterangan: v.keterangan,
            },
          });
          toast.add({ title: 'Jenis biaya disimpan', type: 'success' });
          invalidateSiakad(API);
          return null;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

function Sakelar({ nilai, ubah, label, ket }: { nilai: boolean; ubah: (c: boolean) => void; label: string; ket?: string }) {
  return (
    <label className="u-ksu-sakelar">
      <Switch checked={nilai} onCheckedChange={(c: boolean) => ubah(c)} />
      <span>
        <b>{label}</b>
        {ket ? <small>{ket}</small> : null}
      </span>
    </label>
  );
}

function TabJenis({ saya, unitId }: { saya: KasirKelolaSaya; unitId?: number }) {
  const q = useSiakadQuery<JenisBiayaKasir[]>([`${API}/jenis`], (s, signal) => s.request({ method: 'GET', path: `${API}/jenis` }, { signal }));
  const [form, setForm] = React.useState<IsianJenis | null>(null);
  const [cari, setCari] = React.useState('');
  const semua = dalamUnit(q.data, saya, unitId, false);
  const c = cari.trim().toLowerCase();
  const rows = c ? semua?.filter((j) => `${j.kode_biaya} ${j.nama} ${j.unit ?? ''}`.toLowerCase().includes(c)) : semua;
  const kolom: DataColumn<JenisBiayaKasir>[] = [
    { key: 'kode_biaya', header: 'Kode', value: (j) => j.kode_biaya, cell: (j) => <span className="u-ksu-mono">{j.kode_biaya}</span>, mobile: 'subtitle', shrink: true },
    { key: 'nama', header: 'Nama', value: (j) => j.nama, mobile: 'title' },
    { key: 'unit', header: 'Unit penerbit', value: (j) => namaUnit(saya, j.unit_id, j.unit) },
    { key: 'kategori', header: 'Kategori', value: (j) => (j.kategori ? (saya.kategori[j.kategori] ?? j.kategori) : ''), cell: (j) => (j.kategori ? saya.kategori[j.kategori] ?? j.kategori : <span className="u-ksu-redup">Belum diatur</span>) },
    { key: 'perlakuan', header: 'Perlakuan', value: (j) => PERLAKUAN[j.perlakuan]?.label ?? j.perlakuan },
    { key: 'tagih', header: 'Tagih otomatis', value: (j) => (j.tagih_otomatis ? 'Ya' : 'Tidak'), cell: (j) => (j.tagih_otomatis ? <Badge variant="info">Ya{j.nominal_bawaan ? ` · ${formatRupiah(j.nominal_bawaan)}` : ''}</Badge> : <span className="u-ksu-redup">Tidak</span>) },
    { key: 'aktif', header: 'Status', value: (j) => (j.aktif ? 'Aktif' : 'Nonaktif'), cell: (j) => <LencanaAktif aktif={j.aktif} />, mobile: 'badge', shrink: true },
  ];
  const ubah = (j: JenisBiayaKasir): IsianJenis => ({
    baru: false,
    kode_biaya: j.kode_biaya,
    nama: j.nama,
    unit: kunciUnit(j.unit_id, saya),
    kategori: j.kategori || null,
    perlakuan: j.perlakuan,
    nominal_bawaan: j.nominal_bawaan ? String(Math.round(j.nominal_bawaan)) : '',
    tagih_otomatis: j.tagih_otomatis,
    batasi_prodi: j.batasi_prodi,
    potongan_kasir: j.potongan_kasir,
    bayar_dimuka: !!j.bayar_dimuka,
    dimuka_hari: j.dimuka_hari ? String(j.dimuka_hari) : '',
    urutan: String(j.urutan),
    aktif: j.aktif,
    keterangan: j.keterangan ?? '',
  });
  return (
    <div className="u-ksu-tumpuk">
      <DataTable<JenisBiayaKasir>
        columns={kolom}
        rows={rows}
        rowKey={(j) => j.kode_biaya}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
        filtered={Boolean(c)}
        emptyFiltered={{ title: 'Tidak ditemukan', onReset: () => setCari('') }}
        toolbar={
          <span className="u-ksu-cari">
            <Search aria-hidden />
            <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kode atau nama" aria-label="Cari jenis biaya" />
          </span>
        }
        actions={
          <Button onClick={() => setForm({ baru: true, kode_biaya: '', nama: '', unit: unitAwal(saya, unitId), kategori: null, perlakuan: 'sewaktu', nominal_bawaan: '', tagih_otomatis: false, batasi_prodi: false, potongan_kasir: false, bayar_dimuka: false, dimuka_hari: '', urutan: '100', aktif: true, keterangan: '' })}>
            <Plus /> Tambah jenis biaya
          </Button>
        }
        onRowClick={(j) => setForm(ubah(j))}
        rowActions={(j) => [{ label: 'Ubah', icon: <Pencil />, onSelect: () => setForm(ubah(j)) }]}
        empty={{ title: 'Belum ada jenis biaya unit', description: 'Tambahkan jenis biaya yang diterima loket kasir unit Anda, mis. praktikum, legalisir, atau wisuda.', icon: <Receipt /> }}
        mobile="cards"
        exportCsv="jenis-biaya-kasir"
      />
      <FormJenis awal={form} onOpenChange={(o) => !o && setForm(null)} saya={saya} unitId={unitId} daftar={q.data ?? []} />
    </div>
  );
}

// ================================================================ Tab Perangkat & loket
// Loket = perangkat UNIPO Kasir yang disetujui (siakad/perangkat-kasir.tsx): status persetujuan, kode verifikasi,
// setujui/tolak/cabut (izin kasir.perangkat.setujui), ganti nama, riwayat.

// ================================================================ Tab Aturan penerimaan
function PanelSimulasi({ open, onOpenChange, saya }: { open: boolean; onOpenChange: (o: boolean) => void; saya: KasirKelolaSaya }) {
  const [nim, setNim] = React.useState('');
  const [tanggal, setTanggal] = React.useState<string | null>(null);
  const [kirim, setKirim] = React.useState<{ nim: string; tanggal: string | null } | null>(null);
  const query: Record<string, string> = kirim ? { nim: kirim.nim, ...(kirim.tanggal ? { tanggal: kirim.tanggal } : {}) } : {};
  const q = useSiakadQuery<SimulasiKasir>([`${API}/simulasi`, query], (s, signal) => s.request({ method: 'GET', path: `${API}/simulasi`, query }, { signal }), { enabled: Boolean(kirim), staleTime: 0 });
  const nimSalah = nim && !/^[A-Za-z0-9.-]{3,20}$/.test(nim.trim()) ? 'NIM 3–20 huruf/angka.' : null;
  const sel = (n: NilaiSimulasi) => (
    <span className="u-ksu-putusan">
      <Badge variant={n.boleh ? (n.peringatan?.length ? 'warning' : 'success') : 'danger'}>{n.boleh ? (n.peringatan?.length ? 'Boleh, ada catatan' : 'Boleh') : 'Ditolak'}</Badge>
      <small>{n.boleh ? n.jendela.keterangan : n.alasan}</small>
      {n.boleh && n.peringatan?.map((x) => <small key={x.pesan}>{x.pesan}</small>)}
    </span>
  );
  const m = q.data?.mahasiswa;
  return (
    <Sheet open={open} onOpenChange={onOpenChange} size="lg" title="Cek satu mahasiswa" description="Simulasi keputusan aturan penerimaan dan jadwal aktif untuk setiap jenis biaya unit Anda.">
      <div className="u-ksu-tumpuk">
        <form
          className="u-ksu-simulasi-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nim.trim() || nimSalah) return;
            setKirim({ nim: nim.trim(), tanggal });
          }}
        >
          <Field label="NIM" required error={nimSalah}>
            <Input value={nim} onChange={(e) => setNim(e.target.value.toUpperCase())} placeholder="Mis. S6519001" maxLength={20} autoFocus />
          </Field>
          <Field label="Tanggal" optional description="Kosong = hari ini.">
            <IsianTanggal value={tanggal} onValueChange={(x) => setTanggal(x || null)} placeholder="Pilih…" />
          </Field>
          <Button type="submit" disabled={!nim.trim() || Boolean(nimSalah)} loading={q.loading && Boolean(kirim)}>
            <UserSearch /> Cek
          </Button>
        </form>
        {!kirim ? (
          <Empty icon={<UserSearch />} title="Masukkan NIM" description="Hasilnya menunjukkan apakah kasir boleh menerima pembayaran baru dan pelunasan tunggakan untuk setiap jenis biaya." />
        ) : q.error ? (
          <GalatApi error={q.error} onRetry={q.refetch} title="Tidak dapat mengecek" />
        ) : !q.data || !m ? (
          <Spinner />
        ) : (
          <>
            <Card className="u-ksu-mhs">
              <span>
                <b>{m.nama}</b>
                <small>
                  {m.nim} · Prodi {m.kode_prodi}
                </small>
              </span>
              <span className="u-ksu-mhs-meta">
                <Badge variant={m.status === 'A' ? 'success' : 'warning'}>{m.status_label}</Badge>
                <small>
                  {tgl(q.data.tanggal)}
                  {q.data.tahun_aktif ? ` · periode ${q.data.tahun_aktif}` : ''}
                </small>
              </span>
            </Card>
            <DataTable<SimulasiKasir['jenis'][number]>
              columns={[
                { key: 'nama', header: 'Jenis biaya', value: (j) => j.nama, cell: (j) => (
                  <span className="u-ksu-sasaran">
                    <b>
                      {j.nama} <span className="u-ksu-mono">({j.kode_biaya})</span>
                    </b>
                    <small>{j.unit ? namaRapi(j.unit) : 'Universitas (BAUK)'}</small>
                  </span>
                ), mobile: 'title' },
                { key: 'keputusan', header: 'Aturan', value: (j) => saya.keputusan[j.baru.keputusan], cell: (j) => <Badge variant={NADA_KEPUTUSAN[j.baru.keputusan]}>{saya.keputusan[j.baru.keputusan]}</Badge> },
                { key: 'baru', header: 'Pembayaran baru', value: (j) => (j.baru.boleh ? 'Boleh' : 'Ditolak'), cell: (j) => sel(j.baru) },
                { key: 'tunggakan', header: 'Pelunasan tunggakan', value: (j) => (j.tunggakan.boleh ? 'Boleh' : 'Ditolak'), cell: (j) => sel(j.tunggakan) },
              ]}
              rows={q.data.jenis}
              rowKey={(j) => j.kode_biaya}
              pagination={false}
              columnToggle={false}
              densityToggle={false}
              empty={{ title: 'Tidak ada jenis biaya aktif di lingkup Anda', icon: <Receipt /> }}
              mobile="cards"
            />
            <p className="u-ksu-catatan">Pelunasan tunggakan (tagihan periode sebelum periode aktif yang masih bersisa) tidak terkena jadwal loket. Aturan yang belum punya SK dasar hanya memberi catatan.</p>
          </>
        )}
      </div>
    </Sheet>
  );
}

function TabAturan({ saya }: { saya: KasirKelolaSaya; unitId?: number }) {
  const [cek, setCek] = React.useState(false);
  const [form, setForm] = React.useState<{ aturan: Aturan | null } | null>(null);
  const titik = saya.aturan_titik ?? 'kasir.terima';
  return (
    <div className="u-ksu-tumpuk">
      <Alert variant="info" title="Aturan penerimaan kini aturan keuangan berdasar SK">
        Aturan siapa yang boleh membayar apa di loket (mis. mahasiswa lulus hanya pelunasan tunggakan) berlaku sama untuk aplikasi UNIPO Kasir dan loket web BAUK. Aturan
        dibuat dan diubah lewat alur aturan (usul, SK dasar, persetujuan). Aturan yang belum punya SK dasar hanya memberi peringatan kepada petugas, belum menolak pembayaran.
      </Alert>
      <div className="u-ksu-bilah">
        <Button onClick={() => setForm({ aturan: null })}>
          <Plus /> Tambah aturan
        </Button>
        <Button variant="outline" onClick={() => setCek(true)}>
          <UserSearch /> Cek satu mahasiswa
        </Button>
      </div>
      <DaftarAturan filter={{ titik }} saring={false} onBuka={(a) => setForm({ aturan: a })} />
      <FormAturanUmum aturan={form?.aturan ?? null} titik={titik} kategori="keuangan" open={form !== null} onOpenChange={(o) => !o && setForm(null)} onTersimpan={() => invalidateSiakad('aturan')} />
      <PanelSimulasi open={cek} onOpenChange={setCek} saya={saya} />
    </div>
  );
}

// ================================================================ Tab Jadwal aktif
interface IsianJadwal extends IsianSasaran {
  kunci?: string;
  sumber: SumberJadwalKasir;
  tahapan: string | null;
  mulai: string | null;
  selesai: string | null;
  jam_mulai: string;
  jam_selesai: string;
  hari: string[];
  aktif: boolean;
  catatan: string;
}

function teksHari(hari: string | null | string[]): string {
  const h = Array.isArray(hari) ? hari : (hari ?? '').split(',').filter(Boolean);
  if (!h.length || h.length === 7) return 'Setiap hari';
  const n = h.map(Number).sort();
  if (n.join(',') === '1,2,3,4,5') return 'Senin–Jumat';
  if (n.join(',') === '1,2,3,4,5,6') return 'Senin–Sabtu';
  return n.map((x) => HARI[x - 1]).join(', ');
}

function teksJam(a: string | null | undefined, b: string | null | undefined): string {
  if (!a && !b) return 'Sepanjang hari';
  return `${jamPendek(a) || '00:00'}–${jamPendek(b) || '23:59'}`;
}

function teksSumber(saya: KasirKelolaSaya, j: { sumber: SumberJadwalKasir; tahapan: string | null; mulai: string | null; selesai: string | null }): string {
  if (j.sumber === 'kalender') return `Kalender: ${saya.tahapan.find((t) => t.kode === j.tahapan)?.label ?? j.tahapan ?? '–'}`;
  if (j.sumber === 'manual') return `${tgl(j.mulai) || '…'} – ${tgl(j.selesai) || '…'}`;
  return saya.sumber_jadwal.selalu ?? 'Selalu dibuka';
}

function FormJadwal({ awal, onOpenChange, saya, unitId, jenis }: { awal: IsianJadwal | null; onOpenChange: (o: boolean) => void; saya: KasirKelolaSaya; unitId?: number; jenis: JenisBiayaKasir[] }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [v, setV] = React.useState<IsianJadwal | null>(awal);
  React.useEffect(() => {
    if (awal) setV(awal);
  }, [awal]);
  if (!v) return null;
  const set = (x: Partial<IsianJadwal>) => setV((o) => (o ? { ...o, ...x } : o));
  const jamSalah = (s: string) => (s && !/^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? 'Format JJ:MM, mis. 08:00.' : null);
  return (
    <PanelLangkah
      open={Boolean(awal)}
      onOpenChange={onOpenChange}
      mode={v.kunci ? 'ubah' : 'buat'}
      title={v.kunci ? 'Ubah jadwal aktif' : 'Tambah jadwal aktif'}
      description="Kapan kasir boleh menerima pembayaran baru untuk jenis biaya ini."
      footerNote="Pelunasan tunggakan selalu boleh dan tidak terkena jadwal."
      steps={[
        { id: 'sasaran', title: 'Sasaran', icon: <Target />, validate: () => validasiSasaran(v), content: <IsianSasaranForm saya={saya} unitId={unitId} v={v} set={set} jenis={jenis} kunciTetap={Boolean(v.kunci)} /> },
        {
          id: 'sumber',
          title: 'Sumber jadwal',
          icon: <CalendarClock />,
          validate: () => {
            if (v.sumber === 'kalender' && !v.tahapan) return 'Pilih tahapan kalender akademik.';
            if (v.sumber === 'manual') {
              if (!v.mulai || !v.selesai) return 'Isi tanggal mulai dan selesai.';
              if (v.selesai < v.mulai) return 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
            }
            return null;
          },
          content: (
            <div className="u-ksu-isian">
              <RadioGroup<SumberJadwalKasir>
                variant="card"
                columns={3}
                value={v.sumber}
                onValueChange={(x) => set({ sumber: x })}
                options={[
                  { value: 'selalu', label: saya.sumber_jadwal.selalu, description: 'Loket menerima kapan saja (tetap mengikuti jam layanan).' },
                  { value: 'kalender', label: saya.sumber_jadwal.kalender, description: 'Mengikuti tahapan di Kalender akademik periode tagihan.' },
                  { value: 'manual', label: saya.sumber_jadwal.manual, description: 'Tanggal mulai dan selesai yang Anda tentukan.' },
                ]}
              />
              {v.sumber === 'kalender' && (
                <>
                  <Field label="Tahapan kalender" required description="Cakupan prodi/fakultas tahapan dihormati.">
                    <Select<string> value={v.tahapan} onValueChange={(x) => set({ tahapan: x })} options={saya.tahapan.map((t) => ({ value: t.kode, label: t.label }))} placeholder="Pilih…" />
                  </Field>
                  <Alert variant="info">Perpanjangan atau buka kembali untuk prodi tertentu diatur di Kalender » Pengecualian waktu dan ikut memperpanjang jadwal ini.</Alert>
                </>
              )}
              {v.sumber === 'manual' && (
                <div className="u-ksu-dua">
                  <Field label="Mulai" required>
                    <IsianTanggal value={v.mulai} onValueChange={(x) => set({ mulai: x || null })} placeholder="Pilih…" />
                  </Field>
                  <Field label="Selesai" required description="Sampai pukul 23.59.">
                    <IsianTanggal value={v.selesai} onValueChange={(x) => set({ selesai: x || null })} min={v.mulai} placeholder="Pilih…" />
                  </Field>
                </div>
              )}
            </div>
          ),
        },
        {
          id: 'jam',
          title: 'Jam & hari layanan',
          icon: <Clock />,
          optional: true,
          validate: () => jamSalah(v.jam_mulai) ?? jamSalah(v.jam_selesai) ?? (v.jam_mulai && v.jam_selesai && v.jam_selesai <= v.jam_mulai ? 'Jam selesai harus setelah jam mulai.' : null),
          content: (
            <div className="u-ksu-isian">
              <div className="u-ksu-dua">
                <Field label="Jam mulai" optional error={jamSalah(v.jam_mulai)}>
                  <IsianJam value={v.jam_mulai || null} onValueChange={(v) => set({ jam_mulai: v ?? '' })} />
                </Field>
                <Field label="Jam selesai" optional error={jamSalah(v.jam_selesai)}>
                  <IsianJam value={v.jam_selesai || null} onValueChange={(v) => set({ jam_selesai: v ?? '' })} />
                </Field>
              </div>
              <Field label="Hari layanan" optional description="Kosong = setiap hari.">
                <CheckboxGroup<string> orientation="horizontal" value={v.hari} onValueChange={(x) => set({ hari: x })} options={HARI.map((h, i) => ({ value: String(i + 1), label: h }))} />
              </Field>
              <span className="u-ksu-baris-aksi">
                <Button size="sm" variant="ghost" onClick={() => set({ hari: ['1', '2', '3', '4', '5'] })}>
                  Senin–Jumat
                </Button>
                <Button size="sm" variant="ghost" onClick={() => set({ hari: [] })}>
                  Setiap hari
                </Button>
              </span>
              <Field label="Catatan" optional>
                <Textarea rows={2} maxLength={1000} value={v.catatan} onChange={(e) => set({ catatan: e.target.value })} />
              </Field>
              <Sakelar nilai={v.aktif} ubah={(c) => set({ aktif: c })} label="Aktif" ket="Jadwal nonaktif tidak dipakai; jenis biaya kembali selalu dibuka." />
            </div>
          ),
        },
        {
          id: 'ringkasan',
          title: 'Ringkasan',
          icon: <Eye />,
          content: (
            <WizardReview
              sections={[
                { title: 'Sasaran', items: [{ label: 'Unit', value: namaUnit(saya, unitDariKunci(v.unit)) }, { label: 'Berlaku untuk', value: teksSasaranIsian(saya, v, jenis) }] },
                { title: 'Sumber', items: [{ label: 'Sumber', value: saya.sumber_jadwal[v.sumber] }, { label: 'Rincian', value: teksSumber(saya, v) }] },
                { title: 'Layanan', items: [{ label: 'Jam', value: teksJam(v.jam_mulai, v.jam_selesai) }, { label: 'Hari', value: teksHari(v.hari) }, { label: 'Status', value: v.aktif ? 'Aktif' : 'Nonaktif' }] },
              ]}
            />
          ),
        },
      ]}
      onFinish={async () => {
        try {
          await siakad.request({
            method: 'POST',
            path: `${API}/jadwal`,
            body: {
              ...(v.kunci ? { kunci: v.kunci } : {}),
              ...bodySasaran(v),
              sumber: v.sumber,
              tahapan: v.sumber === 'kalender' ? v.tahapan : null,
              mulai: v.sumber === 'manual' ? v.mulai : null,
              selesai: v.sumber === 'manual' ? v.selesai : null,
              jam_mulai: v.jam_mulai || null,
              jam_selesai: v.jam_selesai || null,
              hari: v.hari.map(Number),
              aktif: v.aktif,
              catatan: v.catatan,
            },
          });
          toast.add({ title: 'Jadwal aktif disimpan', type: 'success' });
          invalidateSiakad(`${API}/jadwal`);
          invalidateSiakad(`${API}/jadwal/pratinjau`);
          return null;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

const keWaktu = (s: string) => new Date(s.replace(' ', 'T')).getTime();
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Garis waktu jendela pembayaran per jenis biaya (GET /kelola/jadwal/pratinjau). */
function GarisWaktuJadwal({ data }: { data: PratinjauJadwalKasir }) {
  const kini = Date.now();
  const titik = data.jenis.flatMap((j) => [j.jendela.mulai, j.jendela.selesai].filter((x): x is string => Boolean(x)).map(keWaktu));
  const hari = 86_400_000;
  let awal = Math.min(kini, ...titik) - 7 * hari;
  let akhir = Math.max(kini, ...titik) + 7 * hari;
  if (!titik.length) {
    awal = kini - 30 * hari;
    akhir = kini + 60 * hari;
  }
  const rentang = akhir - awal;
  const pos = (t: number) => `${(((t - awal) / rentang) * 100).toFixed(2)}%`;
  const bulan: Array<{ t: number; label: string }> = [];
  const d = new Date(awal);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + 1);
  const langkah = Math.max(1, Math.ceil(rentang / (30 * hari) / 8));
  while (d.getTime() < akhir) {
    bulan.push({ t: d.getTime(), label: `${BULAN[d.getMonth()]}${d.getMonth() === 0 || bulan.length === 0 ? ` ${d.getFullYear()}` : ''}` });
    d.setMonth(d.getMonth() + langkah);
  }
  return (
    <div className="u-ksu-garis">
      <div className="u-ksu-garis-legenda" aria-hidden>
        {(Object.keys(STATUS_JENDELA) as JendelaKasir['status'][]).map((k) => (
          <span key={k} data-status={k}>
            <i /> {STATUS_JENDELA[k].label}
          </span>
        ))}
      </div>
      <div className="u-ksu-garis-sumbu" aria-hidden>
        <span className="u-ksu-garis-label" />
        <span className="u-ksu-garis-trek">
          {bulan.map((b) => (
            <span key={b.t} className="u-ksu-garis-bulan" style={{ left: pos(b.t) }}>
              {b.label}
            </span>
          ))}
        </span>
      </div>
      <ul className="u-ksu-garis-daftar">
        {data.jenis.map((j) => {
          const w = j.jendela;
          const penuh = !w.mulai && !w.selesai && (w.status === 'buka' || w.status === 'di_luar_jam');
          const m = w.mulai ? keWaktu(w.mulai) : awal;
          const s = w.selesai ? keWaktu(w.selesai) : akhir;
          const st = STATUS_JENDELA[w.status] ?? STATUS_JENDELA.tutup;
          return (
            <li key={j.kode_biaya}>
              <span className="u-ksu-garis-label">
                <b>{j.nama}</b>
                <small>
                  <span className="u-ksu-mono">{j.kode_biaya}</span> · <Badge variant={st.nada}>{st.label}</Badge>
                </small>
              </span>
              <span className="u-ksu-garis-trek" role="img" aria-label={`${j.nama}: ${st.label}. ${w.keterangan}`}>
                {bulan.map((b) => (
                  <i key={b.t} className="u-ksu-garis-kisi" style={{ left: pos(b.t) }} />
                ))}
                {penuh || w.mulai || w.selesai ? (
                  <span className="u-ksu-garis-batang" data-status={w.status} style={{ left: pos(penuh ? awal : m), width: `calc(${pos(penuh ? akhir : s)} - ${pos(penuh ? awal : m)})` }} title={w.keterangan} />
                ) : null}
                <span className="u-ksu-garis-kini" style={{ left: pos(kini) }} />
                <small className="u-ksu-garis-ket">{w.keterangan}</small>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="u-ksu-catatan">
        <span className="u-ksu-garis-kini-tanda" aria-hidden /> Garis tegak = hari ini.
      </p>
    </div>
  );
}

function TabJadwal({ saya, unitId }: { saya: KasirKelolaSaya; unitId?: number }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useSiakadQuery<JadwalAktifKasir[]>([`${API}/jadwal`], (s, signal) => s.request({ method: 'GET', path: `${API}/jadwal` }, { signal }));
  const jenis = useSiakadQuery<JenisBiayaKasir[]>([`${API}/jenis`], (s, signal) => s.request({ method: 'GET', path: `${API}/jenis` }, { signal }));
  const [tahun, setTahun] = React.useState<string | null>(null);
  const qp = tahun ? { tahun_id: tahun } : {};
  const pr = useSiakadQuery<PratinjauJadwalKasir>([`${API}/jadwal/pratinjau`, qp], (s, signal) => s.request({ method: 'GET', path: `${API}/jadwal/pratinjau`, query: qp }, { signal }));
  const [form, setForm] = React.useState<IsianJadwal | null>(null);
  const [hapus, setHapus] = React.useState<JadwalAktifKasir | null>(null);
  const [riwayat, setRiwayat] = React.useState<JadwalAktifKasir | null>(null);
  const rows = dalamUnit(q.data, saya, unitId, true);
  const baru = (): IsianJadwal => ({ unit: unitAwal(saya, unitId), cakupan: 'jenis', kode_biaya: null, kategori: null, sumber: 'kalender', tahapan: null, mulai: null, selesai: null, jam_mulai: '', jam_selesai: '', hari: [], aktif: true, catatan: '' });
  const ubah = (r: JadwalAktifKasir): IsianJadwal => ({
    ...sasaranDari(saya, r),
    kunci: r.kunci,
    sumber: r.sumber,
    tahapan: r.tahapan,
    mulai: r.mulai ? r.mulai.slice(0, 10) : null,
    selesai: r.selesai ? r.selesai.slice(0, 10) : null,
    jam_mulai: jamPendek(r.jam_mulai),
    jam_selesai: jamPendek(r.jam_selesai),
    hari: (r.hari ?? '').split(',').filter(Boolean),
    aktif: benar(r.aktif),
    catatan: r.catatan ?? '',
  });
  const kolom: DataColumn<JadwalAktifKasir>[] = [
    { key: 'sasaran', header: 'Sasaran', value: (r) => teksSasaran(saya, r), cell: (r) => <SasaranSel saya={saya} r={r} />, mobile: 'title' },
    { key: 'sumber', header: 'Sumber', value: (r) => teksSumber(saya, r), cell: (r) => (
      <span className="u-ksu-sasaran">
        <b>{saya.sumber_jadwal[r.sumber] ?? r.sumber}</b>
        {r.sumber !== 'selalu' && <small>{teksSumber(saya, r)}</small>}
      </span>
    ) },
    { key: 'layanan', header: 'Jam & hari', value: (r) => `${teksJam(r.jam_mulai, r.jam_selesai)} ${teksHari(r.hari)}`, cell: (r) => (
      <span className="u-ksu-sasaran">
        <b>{teksJam(r.jam_mulai, r.jam_selesai)}</b>
        <small>{teksHari(r.hari)}</small>
      </span>
    ) },
    { key: 'aktif', header: 'Status', value: (r) => (benar(r.aktif) ? 'Aktif' : 'Nonaktif'), cell: (r) => (r.boleh_ubah ? <LencanaAktif aktif={r.aktif} /> : <Badge variant="outline">Acuan universitas</Badge>), mobile: 'badge', shrink: true },
  ];
  return (
    <div className="u-ksu-tumpuk">
      <Alert variant="info" title="Pelunasan tunggakan selalu boleh">
        Jadwal hanya membatasi pembayaran baru. Tunggakan periode sebelumnya tetap bisa dilunasi kapan saja. Pengecualian waktu per prodi (perpanjangan, buka kembali) mengikuti Kalender » Pengecualian waktu.
      </Alert>
      <Card className="u-ksu-kartu">
        <header className="u-ksu-kartu-kepala">
          <span>
            <h3>Garis waktu penerimaan</h3>
            <small>Keadaan jendela setiap jenis biaya aktif{pr.data?.tahun_id ? ` untuk periode ${pr.data.tahun_id}` : ''}.</small>
          </span>
          <PilihTahunAkademik value={tahun ?? pr.data?.tahun_id ?? null} onValueChange={(x) => setTahun(x)} placeholder="Periode aktif" size="sm" aria-label="Periode akademik" className="u-ksu-pilih-periode" />
        </header>
        {pr.error ? <GalatApi error={pr.error} onRetry={pr.refetch} /> : !pr.data ? <Spinner /> : pr.data.jenis.length ? <GarisWaktuJadwal data={pr.data} /> : <Empty icon={<CalendarRange />} title="Belum ada jenis biaya aktif" />}
      </Card>
      <DataTable<JadwalAktifKasir>
        columns={kolom}
        rows={rows}
        rowKey={(r) => r.kunci}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
        toolbar={<h3 className="u-ksu-judul-tabel">Jadwal</h3>}
        actions={
          <Button onClick={() => setForm(baru())} disabled={!saya.unit.length && !saya.universitas}>
            <Plus /> Tambah jadwal
          </Button>
        }
        onRowClick={(r) => (r.boleh_ubah ? setForm(ubah(r)) : setRiwayat(r))}
        rowActions={(r) => [
          { label: 'Riwayat versi', icon: <History />, onSelect: () => setRiwayat(r) },
          ...(r.boleh_ubah
            ? [
                { label: 'Ubah', icon: <Pencil />, onSelect: () => setForm(ubah(r)) },
                { label: 'Hapus', icon: <Trash2 />, destructive: true, onSelect: () => setHapus(r) },
              ]
            : []),
        ]}
        empty={{ title: 'Belum ada jadwal', description: 'Tanpa jadwal, semua jenis biaya dibuka setiap saat.', icon: <CalendarClock /> }}
        mobile="cards"
      />
      <FormJadwal awal={form} onOpenChange={(o) => !o && setForm(null)} saya={saya} unitId={unitId} jenis={dalamUnit(jenis.data, saya, unitId, false) ?? []} />
      <RiwayatVersi
        jenis="jadwal"
        kunci={riwayat?.kunci ?? null}
        judul="Riwayat jadwal aktif"
        onOpenChange={(o) => !o && setRiwayat(null)}
        ringkas={(r) => (
          <>
            {teksSumber(saya, r as unknown as JadwalAktifKasir)} · {teksJam(r.jam_mulai as string, r.jam_selesai as string)} · {teksHari((r.hari as string) ?? null)}
            {!benar(r.aktif) && <Badge variant="outline">Nonaktif</Badge>}
          </>
        )}
      />
      <ConfirmDialog
        open={Boolean(hapus)}
        onOpenChange={(o) => !o && setHapus(null)}
        title="Hapus jadwal aktif?"
        description={hapus ? `${teksSasaran(saya, hapus)}: ${teksSumber(saya, hapus)}. Setelah dihapus, jenis biaya mengikuti jadwal lain yang berlaku atau selalu dibuka.` : undefined}
        confirmLabel="Hapus jadwal"
        onConfirm={async () => {
          try {
            await siakad.request({ method: 'POST', path: `${API}/jadwal/${hapus!.kunci}/hapus` });
            toast.add({ title: 'Jadwal dihapus', type: 'success' });
            invalidateSiakad(`${API}/jadwal`);
            invalidateSiakad(`${API}/jadwal/pratinjau`);
          } catch (e) {
            toast.add({ title: 'Gagal menghapus', description: pesanGalat(e), type: 'error' });
          }
        }}
      />
    </div>
  );
}

// ================================================================ Templat laporan: pratinjau
const NAMA_CONTOH = ['Andi Saputra', 'Dewi Kartika Sari', 'Fadli Mohamad', 'Nurul Hidayah', 'Rahmat Pakaya', 'Siti Aisyah Ali', 'Yusuf Hasan', 'Mega Lestari'];
const PRODI_CONTOH = ['Ilmu Pemerintahan', 'Administrasi Publik', 'Ilmu Pemerintahan', 'Ilmu Komunikasi'];
const JENIS_CONTOH = ['Praktikum', 'Legalisir ijazah', 'Praktikum', 'Wisuda'];

function nilaiContoh(kunci: string, i: number): string | number {
  switch (kunci) {
    case 'tanggal':
      return `2026-11-${String(17 + Math.floor(i / 3)).padStart(2, '0')}`;
    case 'nim':
      return `S65${String(19001 + i * 37).padStart(6, '0')}`;
    case 'nama':
      return NAMA_CONTOH[i % NAMA_CONTOH.length]!;
    case 'kode_prodi':
      return ['65201', '63201', '65201', '70201'][i % 4]!;
    case 'prodi':
      return PRODI_CONTOH[i % PRODI_CONTOH.length]!;
    case 'tahun_id':
      return i % 3 === 2 ? '20252' : '20261';
    case 'kode_biaya':
      return ['PRK', 'LGS', 'PRK', 'WSD'][i % 4]!;
    case 'jenis_biaya':
      return JENIS_CONTOH[i % JENIS_CONTOH.length]!;
    case 'jumlah':
      return [150000, 50000, 150000, 750000, 150000, 50000][i % 6]!;
    case 'potongan':
      return i % 4 === 3 ? 25000 : 0;
    case 'keterangan':
      return i % 2 ? 'Lunas' : '';
    case 'petugas':
    case 'nama_petugas':
      return ['Rina (Loket 1)', 'Budi (Loket 2)'][i % 2]!;
    case 'metode':
      return ['Tunai', 'Transfer', 'QRIS'][i % 3]!;
    case 'transaksi':
      return 3 + i;
    case 'mahasiswa':
      return 40 + i * 7;
    case 'tagihan':
      return 6_000_000 + i * 750_000;
    case 'dibayar':
      return 4_500_000 + i * 500_000;
    case 'sisa':
      return 1_500_000 + i * 250_000;
    case 'persen':
      return 75 - i * 3;
    case 'angkatan':
      return 2022 + (i % 3);
    case 'kelas':
      return ['Reguler', 'Ekstensi'][i % 2]!;
    default:
      return '–';
  }
}

function tampilNilai(k: KolomTemplatKasir | undefined, v: string | number): string {
  if (!k) return String(v);
  if (k.kunci === 'persen') return `${v}%`;
  if (k.kunci === 'tanggal' && typeof v === 'string') return formatDate(v, 'short');
  if (k.angka && typeof v === 'number') return ['transaksi', 'mahasiswa'].includes(k.kunci) ? formatNumber(v) : formatRupiah(v);
  return String(v);
}

export interface PratinjauTemplatLaporanKasirProps {
  isi: IsiTemplatKasir;
  /** Kolom tersedia (saya.templat.kolom[sumber]). */
  kolom: KolomTemplatKasir[];
  /** Nama unit di kop. */
  unit?: string;
  /** Baris data; kosong = data rekaan. */
  baris?: Array<Record<string, string | number>>;
  /** Teks periode di bawah judul (bawaan contoh). */
  periode?: React.ReactNode;
  /** Nama instansi di kop (bawaan UNIVERSITAS POHUWATO). */
  instansi?: string;
  /** Alamat di kop. */
  alamat?: string;
  /** Logo (URL/data URI) di kop; bawaan huruf U. */
  logo?: string | null;
  /** Lembar mengalir (laporan sungguhan untuk dicetak): tanpa rasio kertas tetap dan tanpa perkecilan. */
  alir?: boolean;
  className?: string;
}

/** Pratinjau lembar laporan kasir menurut templat: kop, judul, tabel berkelompok + subtotal/total, catatan, penanda tangan. */
export function PratinjauTemplatLaporanKasir({ isi, kolom, unit, baris, periode, instansi, alamat, logo, alir, className }: PratinjauTemplatLaporanKasirProps) {
  // Lembar selebar kertas sungguhan (lanskap 46rem, potret 34rem), diperkecil agar muat di wadah sempit (ponsel).
  const wadah = React.useRef<HTMLDivElement>(null);
  const [skala, setSkala] = React.useState(1);
  React.useEffect(() => {
    const el = wadah.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ukur = () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const lebarKertas = (isi.orientasi === 'lanskap' ? 46 : 34) * rem;
      const cs = getComputedStyle(el);
      const ada = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      setSkala(Math.max(0.3, Math.min(1, ada / lebarKertas)));
    };
    ukur();
    const ro = new ResizeObserver(ukur);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isi.orientasi]);
  const peta = new Map(kolom.map((k) => [k.kunci, k]));
  const kol = isi.kolom.map((k) => peta.get(k)).filter((k): k is KolomTemplatKasir => Boolean(k));
  const data = baris ?? Array.from({ length: 7 }, (_, i) => Object.fromEntries(kolom.map((k) => [k.kunci, nilaiContoh(k.kunci, i)])));
  const kelompokKol = isi.kelompok ? peta.get(isi.kelompok) : undefined;
  const grup = new Map<string, typeof data>();
  for (const r of data) {
    const g = kelompokKol ? String(r[kelompokKol.kunci] ?? '') : '';
    grup.set(g, [...(grup.get(g) ?? []), r]);
  }
  const jumlah = (rs: typeof data, k: string) => rs.reduce((n, r) => n + (typeof r[k] === 'number' ? (r[k] as number) : 0), 0);
  const selJumlah = (rs: typeof data) =>
    kol.map((k, i) =>
      k.angka && k.kunci !== 'persen' ? (
        <td key={k.kunci} data-angka>
          {tampilNilai(k, jumlah(rs, k.kunci))}
        </td>
      ) : (
        <td key={k.kunci}>{i === 0 ? null : ''}</td>
      ),
    );
  const [lebar, tinggi] = KERTAS_MM[isi.kertas] ?? KERTAS_MM.A4!;
  const rasio = isi.orientasi === 'lanskap' ? `${tinggi} / ${lebar}` : `${lebar} / ${tinggi}`;
  let no = 0;
  return (
    <div className={cn('u-ksu-kertas-wadah', className)} ref={wadah}>
      <div className="u-ksu-kertas" style={(alir ? {} : { aspectRatio: rasio, zoom: skala }) as React.CSSProperties} data-orientasi={isi.orientasi} data-alir={alir ? '' : undefined}>
        {isi.kop && (
          <header className="u-ksu-kop">
            {logo ? (
              <img className="u-ksu-kop-logo" src={logo} alt="" aria-hidden />
            ) : (
              <span className="u-ksu-kop-logo" aria-hidden>
                U
              </span>
            )}
            <span>
              <b>{(instansi ?? 'Universitas Pohuwato').toUpperCase()}</b>
              <small>{unit ?? 'Unit penerbit'}</small>
              <small>{alamat ?? 'Jl. Trans Sulawesi, Marisa, Pohuwato, Gorontalo'}</small>
            </span>
          </header>
        )}
        <div className="u-ksu-kertas-judul">
          <b>{isi.judul || 'Laporan kasir'}</b>
          {isi.subjudul ? <small>{isi.subjudul}</small> : null}
          <small>{periode ?? 'Periode 17–19 November 2026'}</small>
        </div>
        {kol.length ? (
          <table className="u-ksu-kertas-tabel">
            <thead>
              <tr>
                <th>No</th>
                {kol.map((k) => (
                  <th key={k.kunci} data-angka={k.angka || undefined}>
                    {k.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...grup.entries()].map(([g, rs]) => (
                <React.Fragment key={g}>
                  {kelompokKol && !isi.ringkas && (
                    <tr className="u-ksu-kertas-grup">
                      <td colSpan={kol.length + 1}>
                        {kelompokKol.label}: {tampilNilai(kelompokKol, rs[0]?.[kelompokKol.kunci] ?? g)}
                      </td>
                    </tr>
                  )}
                  {!isi.ringkas &&
                    rs.map((r) => {
                      no += 1;
                      return (
                        <tr key={no}>
                          <td>{no}</td>
                          {kol.map((k) => (
                            <td key={k.kunci} data-angka={k.angka || undefined}>
                              {tampilNilai(k, r[k.kunci] ?? '')}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  {kelompokKol && (isi.subtotal || isi.ringkas) && (
                    <tr className="u-ksu-kertas-sub">
                      <td>{isi.ringkas ? (no += 1) : ''}</td>
                      {selJumlah(rs).map((c, i) => (i === 0 && !kol[0]?.angka ? <td key="lbl">{isi.ringkas ? tampilNilai(kelompokKol, rs[0]?.[kelompokKol.kunci] ?? g) : 'Subtotal'}</td> : c))}
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {isi.total && (
                <tr className="u-ksu-kertas-total">
                  <td />
                  {selJumlah(data).map((c, i) => (i === 0 && !kol[0]?.angka ? <td key="lbl">Total</td> : c))}
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <p className="u-ksu-redup">Belum ada kolom dipilih.</p>
        )}
        {isi.catatan_kaki ? <p className="u-ksu-kertas-catatan">{isi.catatan_kaki}</p> : null}
        {isi.penanda_tangan.length > 0 && (
          <div className="u-ksu-ttd" style={{ '--ksu-ttd': isi.penanda_tangan.length } as React.CSSProperties}>
            {isi.penanda_tangan.map((t, i) => (
              <div key={i}>
                <small>{i === isi.penanda_tangan.length - 1 ? `${isi.kota || 'Marisa'}, 19 November 2026` : ' '}</small>
                <small>{t.jabatan || 'Jabatan'}</small>
                <span className="u-ksu-ttd-ruang" />
                <b>{t.nama || '(..............................)'}</b>
                {t.nip ? <small>NIP. {t.nip}</small> : null}
              </div>
            ))}
          </div>
        )}
      </div>
      {!alir && (
        <small className="u-ksu-kertas-ket">
          {isi.kertas} {isi.orientasi}
          {baris ? '' : ' · data rekaan'}
        </small>
      )}
    </div>
  );
}

// ================================================================ Templat laporan: wizard
interface IsianTemplat {
  kunci?: string;
  unit: string | null;
  jenis: JenisTemplatKasir | null;
  nama: string;
  aktif: boolean;
  isi: IsiTemplatKasir;
}

function isiBawaan(saya: KasirKelolaSaya, jenis: JenisTemplatKasir): IsiTemplatKasir {
  const b = saya.templat.jenis.find((j) => j.kode === jenis)?.bawaan ?? {};
  return {
    judul: b.judul ?? '',
    subjudul: b.subjudul ?? '',
    kop: b.kop ?? true,
    kolom: b.kolom ?? [],
    kelompok: b.kelompok ?? null,
    subtotal: b.subtotal ?? true,
    total: b.total ?? true,
    ringkas: b.ringkas ?? false,
    catatan_kaki: b.catatan_kaki ?? '',
    penanda_tangan: (b.penanda_tangan ?? []).map((t) => ({ ...t })),
    kota: b.kota ?? '',
    kertas: b.kertas ?? 'A4',
    orientasi: b.orientasi === 'lanskap' ? 'lanskap' : 'potret',
  };
}

function FormTemplat({ awal, onOpenChange, saya, unitId }: { awal: IsianTemplat | null; onOpenChange: (o: boolean) => void; saya: KasirKelolaSaya; unitId?: number }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [v, setV] = React.useState<IsianTemplat | null>(awal);
  React.useEffect(() => {
    if (awal) setV(awal);
  }, [awal]);
  if (!v) return null;
  const set = (x: Partial<IsianTemplat>) => setV((o) => (o ? { ...o, ...x } : o));
  const setIsi = (x: Partial<IsiTemplatKasir>) => setV((o) => (o ? { ...o, isi: { ...o.isi, ...x } } : o));
  const katJenis = saya.templat.jenis.find((j) => j.kode === v.jenis);
  const tersedia = katJenis ? (saya.templat.kolom[katJenis.sumber] ?? []) : [];
  const peta = new Map(tersedia.map((k) => [k.kunci, k]));
  const dipilih = v.isi.kolom.filter((k) => peta.has(k));
  const lain = tersedia.filter((k) => !dipilih.includes(k.kunci));
  const geser = (i: number, d: -1 | 1) => {
    const a = [...dipilih];
    const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j]!, a[i]!];
    setIsi({ kolom: a });
  };
  const ttd = v.isi.penanda_tangan;
  const setTtd = (i: number, x: Partial<IsiTemplatKasir['penanda_tangan'][number]>) => setIsi({ penanda_tangan: ttd.map((t, j) => (j === i ? { ...t, ...x } : t)) });
  const namaUnitV = namaUnit(saya, unitDariKunci(v.unit));
  return (
    <PanelLangkah
      open={Boolean(awal)}
      onOpenChange={onOpenChange}
      mode={v.kunci ? 'ubah' : 'buat'}
      size="xl"
      title={v.kunci ? `Ubah templat ${v.nama}` : 'Tambah templat laporan'}
      description="Bentuk laporan cetak/ekspor di aplikasi Kasir untuk petugas unit ini."
      footerNote="Unit tanpa templat memakai templat universitas, lalu bawaan."
      finishLabel="Simpan templat"
      steps={[
        {
          id: 'jenis',
          title: 'Jenis laporan',
          icon: <FileText />,
          validate: () => (!v.unit ? 'Pilih unit.' : !v.jenis ? 'Pilih jenis laporan.' : !v.nama.trim() ? 'Nama templat wajib diisi.' : null),
          content: (
            <div className="u-ksu-isian">
              <Field label="Unit" required>
                <Select<string> value={v.unit} onValueChange={(x) => set({ unit: x })} options={opsiUnit(saya, unitId)} placeholder="Pilih…" disabled={Boolean(v.kunci)} />
              </Field>
              <Field label="Jenis laporan" required description={v.kunci ? 'Jenis laporan tidak bisa diganti.' : 'Memilih jenis mengisi kolom bawaan laporan itu.'}>
                <RadioGroup<JenisTemplatKasir>
                  variant="card"
                  columns={2}
                  value={v.jenis ?? undefined}
                  onValueChange={(x) => {
                    if (v.kunci) return;
                    const n = saya.templat.jenis.find((j) => j.kode === x);
                    setV((o) => (o ? { ...o, jenis: x, nama: !o.nama || saya.templat.jenis.some((j) => j.nama === o.nama) ? (n?.nama ?? o.nama) : o.nama, isi: isiBawaan(saya, x) } : o));
                  }}
                  options={saya.templat.jenis.map((j) => ({ value: j.kode, label: j.nama, description: `Data: ${j.sumber}`, disabled: Boolean(v.kunci) && j.kode !== v.jenis }))}
                />
              </Field>
              <Field label="Nama templat" required description="Nama di daftar templat, mis. Harian FISIP.">
                <Input value={v.nama} maxLength={150} onChange={(e) => set({ nama: e.target.value })} />
              </Field>
              <Sakelar nilai={v.aktif} ubah={(c) => set({ aktif: c })} label="Aktif" ket="Templat nonaktif tidak dipakai Kasir." />
            </div>
          ),
        },
        {
          id: 'kolom',
          title: 'Kolom & urutan',
          icon: <Columns3 />,
          validate: () => (dipilih.length ? null : 'Pilih minimal satu kolom.'),
          content: (
            <div className="u-ksu-isian">
              <p className="u-ksu-catatan">Centang kolom yang tampil, lalu atur urutannya dari kiri ke kanan.</p>
              <ol className="u-ksu-kolom">
                {dipilih.map((k, i) => (
                  <li key={k} data-pilih>
                    <label>
                      <Checkbox checked onCheckedChange={() => setIsi({ kolom: dipilih.filter((x) => x !== k), kelompok: v.isi.kelompok === k ? null : v.isi.kelompok })} />
                      <span>
                        {peta.get(k)?.label ?? k}
                        {peta.get(k)?.angka ? <small> · angka</small> : null}
                      </span>
                    </label>
                    <span className="u-ksu-kolom-aksi">
                      <Button size="sm" variant="ghost" iconOnly aria-label={`Naikkan ${peta.get(k)?.label ?? k}`} disabled={i === 0} onClick={() => geser(i, -1)}>
                        <ArrowUp />
                      </Button>
                      <Button size="sm" variant="ghost" iconOnly aria-label={`Turunkan ${peta.get(k)?.label ?? k}`} disabled={i === dipilih.length - 1} onClick={() => geser(i, 1)}>
                        <ArrowDown />
                      </Button>
                    </span>
                  </li>
                ))}
                {lain.map((k) => (
                  <li key={k.kunci}>
                    <label>
                      <Checkbox checked={false} onCheckedChange={() => setIsi({ kolom: [...dipilih, k.kunci] })} />
                      <span>
                        {k.label}
                        {k.angka ? <small> · angka</small> : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ol>
            </div>
          ),
        },
        {
          id: 'kelompok',
          title: 'Kelompok & subtotal',
          icon: <Layers />,
          content: (
            <div className="u-ksu-isian">
              <Field label="Kelompokkan menurut" optional description="Baris dikelompokkan dengan judul kelompok dan subtotal kolom angka.">
                <Select<string>
                  value={v.isi.kelompok ?? '__tanpa'}
                  onValueChange={(x) => setIsi({ kelompok: !x || x === '__tanpa' ? null : x, ...(!x || x === '__tanpa' ? { ringkas: false } : {}) })}
                  options={[{ value: '__tanpa', label: 'Tanpa pengelompokan' }, ...tersedia.filter((k) => !k.angka).map((k) => ({ value: k.kunci, label: k.label }))]}
                  placeholder="Pilih…"
                />
              </Field>
              <div className="u-ksu-sakelar-daftar">
                <Sakelar nilai={v.isi.subtotal && Boolean(v.isi.kelompok)} ubah={(c) => setIsi({ subtotal: c })} label="Subtotal per kelompok" ket={v.isi.kelompok ? undefined : 'Pilih pengelompokan dulu.'} />
                <Sakelar nilai={v.isi.ringkas} ubah={(c) => setIsi({ ringkas: c && Boolean(v.isi.kelompok) })} label="Ringkas (hanya baris per kelompok)" ket="Rincian per transaksi disembunyikan." />
                <Sakelar nilai={v.isi.total} ubah={(c) => setIsi({ total: c })} label="Baris total" />
              </div>
            </div>
          ),
        },
        {
          id: 'kop',
          title: 'Kop & judul',
          icon: <PenLine />,
          validate: () => (!v.isi.judul.trim() ? 'Judul laporan wajib diisi.' : null),
          content: (
            <div className="u-ksu-isian">
              <Sakelar nilai={v.isi.kop} ubah={(c) => setIsi({ kop: c })} label="Kop surat universitas" ket="Logo, nama universitas, unit, dan alamat di atas laporan." />
              <Field label="Judul" required>
                <Input value={v.isi.judul} maxLength={150} onChange={(e) => setIsi({ judul: e.target.value })} />
              </Field>
              <Field label="Subjudul" optional description="Mis. Loket FISIP. Periode laporan ditambahkan otomatis.">
                <Input value={v.isi.subjudul} maxLength={200} onChange={(e) => setIsi({ subjudul: e.target.value })} />
              </Field>
              <Field label="Catatan kaki" optional>
                <Textarea rows={2} maxLength={500} value={v.isi.catatan_kaki} onChange={(e) => setIsi({ catatan_kaki: e.target.value })} />
              </Field>
            </div>
          ),
        },
        {
          id: 'ttd',
          title: 'Penanda tangan',
          icon: <Signature />,
          optional: true,
          content: (
            <div className="u-ksu-isian">
              <Field label="Kota" optional description="Tampil di atas tanda tangan terakhir, mis. Marisa.">
                <Input value={v.isi.kota} maxLength={60} onChange={(e) => setIsi({ kota: e.target.value })} />
              </Field>
              {ttd.map((t, i) => (
                <fieldset key={i} className="u-ksu-ttd-isian">
                  <legend>
                    Penanda tangan {i + 1}
                    <Button size="sm" variant="ghost" onClick={() => setIsi({ penanda_tangan: ttd.filter((_, j) => j !== i) })}>
                      <Trash2 /> Hapus
                    </Button>
                  </legend>
                  <Field label="Jabatan">
                    <Input value={t.jabatan} maxLength={100} onChange={(e) => setTtd(i, { jabatan: e.target.value })} placeholder="Mis. Bendahara Penerimaan" />
                  </Field>
                  <div className="u-ksu-dua">
                    <Field label="Nama" optional>
                      <Input value={t.nama} maxLength={120} onChange={(e) => setTtd(i, { nama: e.target.value })} />
                    </Field>
                    <Field label="NIP/NIDN" optional>
                      <Input value={t.nip} maxLength={40} onChange={(e) => setTtd(i, { nip: e.target.value })} />
                    </Field>
                  </div>
                </fieldset>
              ))}
              {ttd.length < 4 ? (
                <Button variant="outline" onClick={() => setIsi({ penanda_tangan: [...ttd, { jabatan: '', nama: '', nip: '' }] })}>
                  <Plus /> Tambah penanda tangan
                </Button>
              ) : (
                <p className="u-ksu-catatan">Maksimal 4 penanda tangan.</p>
              )}
            </div>
          ),
        },
        {
          id: 'kertas',
          title: 'Kertas',
          icon: <Printer />,
          content: (
            <div className="u-ksu-isian">
              <Field label="Ukuran kertas">
                <RadioGroup<string> variant="card" columns={4} value={v.isi.kertas} onValueChange={(x) => setIsi({ kertas: x })} options={saya.templat.kertas.map((k) => ({ value: k, label: k, description: KERTAS_MM[k] ? `${KERTAS_MM[k]![0]}×${KERTAS_MM[k]![1]} mm` : undefined }))} />
              </Field>
              <Field label="Orientasi">
                <RadioGroup<'potret' | 'lanskap'>
                  variant="card"
                  columns={2}
                  value={v.isi.orientasi}
                  onValueChange={(x) => setIsi({ orientasi: x })}
                  options={[
                    { value: 'potret', label: 'Potret', description: 'Tegak; cocok untuk sedikit kolom.' },
                    { value: 'lanskap', label: 'Lanskap', description: 'Mendatar; cocok untuk banyak kolom.' },
                  ]}
                />
              </Field>
            </div>
          ),
        },
        {
          id: 'pratinjau',
          title: 'Pratinjau',
          icon: <Eye />,
          content: (
            <div className="u-ksu-isian">
              <PratinjauTemplatLaporanKasir isi={{ ...v.isi, kolom: dipilih }} kolom={tersedia} unit={namaUnitV} />
              <WizardReview
                sections={[
                  { title: 'Templat', items: [{ label: 'Unit', value: namaUnitV }, { label: 'Jenis', value: katJenis?.nama }, { label: 'Nama', value: v.nama }] },
                  {
                    title: 'Isi',
                    items: [
                      { label: 'Kolom', value: dipilih.map((k) => peta.get(k)?.label ?? k).join(', ') },
                      { label: 'Kelompok', value: v.isi.kelompok ? `${peta.get(v.isi.kelompok)?.label ?? v.isi.kelompok}${v.isi.ringkas ? ' (ringkas)' : ''}` : 'Tanpa' },
                      { label: 'Penanda tangan', value: ttd.length ? ttd.map((t) => t.jabatan || '–').join(', ') : 'Tanpa' },
                    ],
                  },
                ]}
              />
            </div>
          ),
        },
      ]}
      onFinish={async () => {
        try {
          await siakad.request({ method: 'POST', path: `${API}/templat`, body: { ...(v.kunci ? { kunci: v.kunci } : {}), unit_id: unitDariKunci(v.unit), jenis: v.jenis, nama: v.nama.trim(), aktif: v.aktif, isi: { ...v.isi, kolom: dipilih } } });
          toast.add({ title: 'Templat laporan disimpan', type: 'success' });
          invalidateSiakad(`${API}/templat`);
          return null;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

function TabTemplat({ saya, unitId }: { saya: KasirKelolaSaya; unitId?: number }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useSiakadQuery<TemplatLaporanKasir[]>([`${API}/templat`], (s, signal) => s.request({ method: 'GET', path: `${API}/templat` }, { signal }));
  const [form, setForm] = React.useState<IsianTemplat | null>(null);
  const [hapus, setHapus] = React.useState<TemplatLaporanKasir | null>(null);
  const [riwayat, setRiwayat] = React.useState<TemplatLaporanKasir | null>(null);
  const [lihat, setLihat] = React.useState<{ judul: string; isi: IsiTemplatKasir; sumber: string; unit: string } | null>(null);
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  if (!q.data) return <Spinner />;
  const rows = dalamUnit(q.data, saya, unitId, true) ?? [];
  const bisaBuat = saya.unit.length > 0 || saya.universitas;
  const baru = (jenis: JenisTemplatKasir, dasar?: TemplatLaporanKasir): IsianTemplat => ({
    unit: unitAwal(saya, unitId),
    jenis,
    nama: saya.templat.jenis.find((j) => j.kode === jenis)?.nama ?? '',
    aktif: true,
    isi: dasar ? { ...isiBawaan(saya, jenis), ...dasar.isi, penanda_tangan: dasar.isi.penanda_tangan.map((t) => ({ ...t })) } : isiBawaan(saya, jenis),
  });
  const ubah = (t: TemplatLaporanKasir): IsianTemplat => ({ kunci: t.kunci, unit: kunciUnit(t.unit_id, saya), jenis: t.jenis, nama: t.nama, aktif: benar(t.aktif), isi: { ...isiBawaan(saya, t.jenis), ...t.isi } });
  return (
    <div className="u-ksu-tumpuk">
      <Alert variant="info" title="Templat yang dipakai Kasir">
        Untuk setiap jenis laporan, Kasir memakai templat unit petugas, lalu templat universitas, lalu bawaan.
      </Alert>
      <div className="u-ksu-templat">
        {saya.templat.jenis.map((j) => {
          const daftar = rows.filter((t) => t.jenis === j.kode);
          const unitT = daftar.filter((t) => t.unit_id != null && t.unit_id !== saya.bauk_id);
          const univT = daftar.filter((t) => t.unit_id == null || t.unit_id === saya.bauk_id);
          const kol = saya.templat.kolom[j.sumber] ?? [];
          const dipakai = unitT.find((t) => benar(t.aktif)) ? 'unit' : univT.find((t) => benar(t.aktif)) ? 'universitas' : 'bawaan';
          return (
            <Card key={j.kode} className="u-ksu-templat-kartu">
              <header>
                <span>
                  <b>{j.nama}</b>
                  <small>Memakai templat {dipakai === 'unit' ? 'unit' : dipakai === 'universitas' ? 'universitas' : 'bawaan'}</small>
                </span>
                {bisaBuat && (
                  <Button size="sm" variant="outline" onClick={() => setForm(baru(j.kode, univT[0]))}>
                    <Plus /> Buat
                  </Button>
                )}
              </header>
              <ul>
                {[...unitT, ...univT].map((t) => (
                  <li key={t.kunci}>
                    <span className="u-ksu-sasaran">
                      <b>{t.nama}</b>
                      <small>
                        {namaUnit(saya, t.unit_id, t.unit)} · versi {t.versi} · {t.isi.kolom.length} kolom · {t.isi.kertas} {t.isi.orientasi}
                      </small>
                    </span>
                    <span className="u-ksu-lencana-daftar">
                      <Badge variant={t.boleh_ubah ? 'primary' : 'outline'}>{t.unit_id == null || t.unit_id === saya.bauk_id ? 'Universitas' : 'Unit'}</Badge>
                      {!benar(t.aktif) && <Badge variant="outline">Nonaktif</Badge>}
                    </span>
                    <span className="u-ksu-templat-aksi">
                      <Button size="sm" variant="ghost" iconOnly aria-label={`Pratinjau ${t.nama}`} onClick={() => setLihat({ judul: t.nama, isi: { ...isiBawaan(saya, t.jenis), ...t.isi }, sumber: j.sumber, unit: namaUnit(saya, t.unit_id, t.unit) })}>
                        <Eye />
                      </Button>
                      <Button size="sm" variant="ghost" iconOnly aria-label={`Riwayat ${t.nama}`} onClick={() => setRiwayat(t)}>
                        <History />
                      </Button>
                      {t.boleh_ubah && (
                        <>
                          <Button size="sm" variant="ghost" iconOnly aria-label={`Ubah ${t.nama}`} onClick={() => setForm(ubah(t))}>
                            <Pencil />
                          </Button>
                          <Button size="sm" variant="ghost" iconOnly aria-label={`Hapus ${t.nama}`} onClick={() => setHapus(t)}>
                            <Trash2 />
                          </Button>
                        </>
                      )}
                    </span>
                  </li>
                ))}
                {!daftar.length && (
                  <li className="u-ksu-templat-bawaan">
                    <span className="u-ksu-sasaran">
                      <b>Bawaan</b>
                      <small>
                        {(j.bawaan.kolom ?? []).length} kolom · {j.bawaan.kertas ?? 'A4'} {j.bawaan.orientasi ?? 'potret'}
                      </small>
                    </span>
                    <span className="u-ksu-templat-aksi">
                      <Button size="sm" variant="ghost" iconOnly aria-label={`Pratinjau bawaan ${j.nama}`} onClick={() => setLihat({ judul: `${j.nama} (bawaan)`, isi: isiBawaan(saya, j.kode), sumber: j.sumber, unit: unitId != null ? namaUnit(saya, unitId) : 'Unit penerbit' })}>
                        <Eye />
                      </Button>
                    </span>
                  </li>
                )}
              </ul>
              <small className="u-ksu-redup">{kol.length} kolom tersedia</small>
            </Card>
          );
        })}
      </div>
      <FormTemplat awal={form} onOpenChange={(o) => !o && setForm(null)} saya={saya} unitId={unitId} />
      <Sheet open={Boolean(lihat)} onOpenChange={(o) => !o && setLihat(null)} size="xl" title={`Pratinjau ${lihat?.judul ?? ''}`} description="Data rekaan untuk memeriksa susunan kolom, kop, dan penanda tangan.">
        {lihat && <PratinjauTemplatLaporanKasir isi={lihat.isi} kolom={saya.templat.kolom[lihat.sumber] ?? []} unit={lihat.unit} />}
      </Sheet>
      <RiwayatVersi
        jenis="templat"
        kunci={riwayat?.kunci ?? null}
        judul={`Riwayat templat ${riwayat?.nama ?? ''}`}
        onOpenChange={(o) => !o && setRiwayat(null)}
        ringkas={(r) => {
          let isi: Partial<IsiTemplatKasir> = {};
          try {
            isi = typeof r.isi === 'string' ? JSON.parse(r.isi) : ((r.isi as Partial<IsiTemplatKasir>) ?? {});
          } catch {
            isi = {};
          }
          return (
            <>
              <b>{String(r.nama ?? '')}</b> · {isi.judul ?? ''}
              <small>
                {(isi.kolom ?? []).length} kolom · {isi.kertas ?? 'A4'} {isi.orientasi ?? ''} · {(isi.penanda_tangan ?? []).length} penanda tangan
              </small>
            </>
          );
        }}
      />
      <ConfirmDialog
        open={Boolean(hapus)}
        onOpenChange={(o) => !o && setHapus(null)}
        title={`Hapus templat ${hapus?.nama ?? ''}?`}
        description="Kasir kembali memakai templat universitas atau bawaan untuk jenis laporan ini. Riwayat versi tetap tersimpan."
        confirmLabel="Hapus templat"
        onConfirm={async () => {
          try {
            await siakad.request({ method: 'POST', path: `${API}/templat/${hapus!.kunci}/hapus` });
            toast.add({ title: 'Templat dihapus', type: 'success' });
            invalidateSiakad(`${API}/templat`);
          } catch (e) {
            toast.add({ title: 'Gagal menghapus', description: pesanGalat(e), type: 'error' });
          }
        }}
      />
    </div>
  );
}

// ================================================================ Komponen utama
export type TabKasirUnit = 'jenis' | 'loket' | 'aturan' | 'jadwal' | 'templat';

export interface PengaturanKasirUnitProps {
  /** Saring tampilan ke satu unit (induk_unit.id), mis. aplikasi Fakultas untuk fakultasnya. Kosong = semua unit dalam lingkup. */
  unitId?: number;
  /**
   * Kunci ke satu unit berdasarkan kode struktur organisasi (induk_unit.kode), mis. "BAAK" atau "PMB": aplikasi unit
   * hanya menampilkan jenis biaya, loket, aturan, jadwal, dan templat unit itu (dan turunannya). Tanpa `unitId`/`unitKode`
   * server dapat mengunci lewat unit aplikasi (fakultas aplikasi Fakultas).
   */
  unitKode?: string;
  /** Judul di atas tab (opsional; halaman aplikasi biasanya sudah punya judul). */
  judul?: React.ReactNode;
  /** Tab awal. */
  tabAwal?: TabKasirUnit;
  className?: string;
}

/**
 * Pengaturan kasir unit: jenis biaya, perangkat & loket (persetujuan perangkat Kasir), aturan penerimaan per status akademik (dengan cek satu mahasiswa), jadwal
 * aktif pembayaran (garis waktu), dan templat laporan kasir. Semua formulir di panel samping bertahap. Izin
 * kasir.pengaturan berlingkup unit (SIAKAD /v1/kasir/kelola); scope token kasir:read / kasir:write.
 */
export function PengaturanKasirUnit({ unitId: unitIdProp, unitKode, judul, tabAwal, className }: PengaturanKasirUnitProps) {
  // ?tab=loket dari tautan notifikasi "Perangkat kasir menunggu persetujuan".
  const tabUrl = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('tab') as TabKasirUnit | null) : null;
  const tabMula: TabKasirUnit = tabAwal ?? (tabUrl && ['jenis', 'loket', 'aturan', 'jadwal', 'templat'].includes(tabUrl) ? tabUrl : 'jenis');
  const q = useSiakadQuery<KasirKelolaSaya>([`${API}/saya`], (s, signal) => s.request({ method: 'GET', path: `${API}/saya` }, { signal }), { staleTime: 5 * 60_000 });
  const kepala = judul ? <h2 className="u-ksu-judul">{judul}</h2> : null;
  if (q.error) {
    const g = judulGalat(q.error);
    if (g.status === 403)
      return (
        <div className={cn('u-ksu', className)}>
          {kepala}
          <Empty
            bordered
            icon={<ShieldAlert />}
            title={g.code === 'insufficient_scope' ? 'Aplikasi ini belum diberi akses kasir' : 'Belum punya izin pengaturan kasir unit'}
            description={
              g.code === 'insufficient_scope'
                ? 'Klien API aplikasi ini belum punya scope kasir:read dan kasir:write. Hubungi Pustikom.'
                : 'Minta admin memberi peran Bendahara penerimaan unit (izin kasir.pengaturan) untuk unit Anda di Pustikom » Hak akses.'
            }
          />
        </div>
      );
    return (
      <div className={cn('u-ksu', className)}>
        {kepala}
        <GalatApi error={q.error} onRetry={q.refetch} />
      </div>
    );
  }
  if (!q.data) return <Spinner />;
  const saya = q.data;
  const kode = unitKode?.trim().toUpperCase();
  const unitKodeId = kode ? saya.unit.find((u) => (u.kode ?? '').toUpperCase() === kode)?.id : undefined;
  const unitId = unitIdProp ?? unitKodeId ?? saya.unit_aplikasi ?? undefined;
  if (kode && unitIdProp == null && unitKodeId == null)
    return (
      <div className={cn('u-ksu', className)}>
        {kepala}
        <Empty
          bordered
          icon={<ShieldAlert />}
          title={`Unit ${kode} belum ada dalam lingkup kasir Anda`}
          description={`Pastikan unit berkode ${kode} ada di struktur organisasi Pustikom dan Anda punya peran Bendahara penerimaan untuk unit itu.`}
        />
      </div>
    );
  if (!saya.lintas && !saya.universitas && !saya.unit.length)
    return (
      <div className={cn('u-ksu', className)}>
        {kepala}
        <Empty bordered icon={<ShieldAlert />} title="Belum ada unit dalam lingkup Anda" description="Minta admin memberi peran Bendahara penerimaan unit untuk unit Anda." />
      </div>
    );
  const lingkup = [...(saya.universitas ? ['Universitas (BAUK)'] : []), ...saya.unit.filter((u) => u.id !== saya.bauk_id && (unitId == null || u.id === unitId || u.induk_id === unitId)).map((u) => u.singkatan || namaRapi(u.nama))];
  return (
    <div className={cn('u-ksu', className)}>
      {kepala}
      <p className="u-ksu-lingkup">
        <ListChecks aria-hidden />
        <span>Lingkup: {saya.lintas && unitId == null ? 'semua unit' : lingkup.slice(0, 6).join(' · ') + (lingkup.length > 6 ? ` · +${lingkup.length - 6} unit` : '')}</span>
      </p>
      <Tabs<TabKasirUnit>
        defaultValue={tabMula}
        items={[
          { value: 'jenis', label: 'Jenis biaya', icon: <Receipt />, content: <TabJenis saya={saya} unitId={unitId} /> },
          { value: 'loket', label: 'Perangkat & loket', icon: <MonitorSmartphone />, content: <PerangkatKasir unitId={unitId} /> },
          { value: 'aturan', label: 'Aturan penerimaan', icon: <Gavel />, content: <TabAturan saya={saya} unitId={unitId} /> },
          { value: 'jadwal', label: 'Jadwal aktif', icon: <CalendarClock />, content: <TabJadwal saya={saya} unitId={unitId} /> },
          { value: 'templat', label: 'Templat laporan', icon: <FileClock />, content: <TabTemplat saya={saya} unitId={unitId} /> },
        ]}
      />
    </div>
  );
}
