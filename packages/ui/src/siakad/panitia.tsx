'use client';
import * as React from 'react';
import {
  AppWindow,
  CalendarRange,
  CircleCheck,
  Copy,
  Download,
  FileBadge,
  Hourglass,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { formatDate, formatTime } from '../lib/format';
import { Badge, Button, Skeleton } from '../components/actions';
import { DataTable, type DataColumn } from '../components/data-table';
import { Alert, Card, CardContent, DescriptionList, Empty, Tabs } from '../components/display';
import { Checkbox, Field, Input, InputGroup, Textarea } from '../components/forms';
import { BagianForm, IsianTanggal, PanelForm, Pilihan } from '../components/formulir';
import { StatistikRingkas, type ItemStatistik } from '../components/laporan';
import { ConfirmDialog, Dialog, Menu, useToast, type MenuEntry } from '../components/overlays';
import type { SelectOption } from '../components/select';
import { PilihTahunAkademik } from './cari';
import { GalatApi } from './galat';
import { PilihSK, type SKRegistri } from './isian-sk';
import { PilihEntitas, type SumberEntitas } from './pilih';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

/*
 * Kepanitiaan ber-SK (/v1/panitia, docs/PANITIA.md di SIAKAD). Unit (universitas, fakultas, prodi, biro, lembaga)
 * membentuk panitia berdasarkan SK dengan masa berlaku, mengisi anggota dan jabatannya, lalu mengajukan hak akses yang
 * melekat pada jabatan itu ke Pustikom. Peran aktif setelah Pustikom menyetujui dan berakhir bersama SK. Jenis panitia,
 * jabatan, dan peran tiap jabatan diatur Pustikom. Tombol yang tampil mengikuti `boleh.*` dari API.
 */

// ================================================================ Tipe
export type StatusPanitia = 'draf' | 'aktif' | 'selesai' | 'dibubarkan';
export type StatusAksesPanitia = 'diajukan' | 'disetujui' | 'ditolak' | 'dicabut' | 'berakhir';

export interface AplikasiPanitia {
  kode: string;
  nama: string;
  url: string | null;
}
export interface PeranPanitia {
  id: number;
  kode: string;
  nama: string;
  lingkup: 'global' | 'unit';
  jenis_unit?: string | null;
  keterangan?: string | null;
  aplikasi?: AplikasiPanitia[];
}
export interface JabatanPanitia {
  id: number;
  kode: string;
  nama: string;
  wajib: boolean;
  maks: number | null;
  urut: number;
  peran: PeranPanitia[];
  aplikasi: AplikasiPanitia[];
}
export interface JenisPanitia {
  id: number;
  uuid?: string;
  kode: string;
  nama: string;
  keterangan: string | null;
  jenis_unit: string[];
  wajib_sk: boolean;
  masa_maks_hari: number | null;
  aktif: boolean;
  sistem: boolean;
  urut: number;
  jumlah_panitia: number;
  jabatan: JabatanPanitia[];
}
export interface UnitPanitia {
  id: number;
  kode?: string;
  jenis: string;
  nama: string;
  singkatan: string | null;
  induk_id?: number | null;
}
export interface AksesPanitia {
  id: string;
  status: StatusAksesPanitia;
  catatan: string | null;
  peran: Partial<PeranPanitia> & { id: number };
  aplikasi: AplikasiPanitia[];
  unit_id: number | null;
  diajukan_at: string | null;
  diputuskan_oleh: string | null;
  diputuskan_at: string | null;
}
export interface AnggotaPanitia {
  id: string;
  username: string;
  nama: string;
  level: string | null;
  akun_aktif: boolean;
  jabatan: { id: number; kode: string; nama: string } | null;
  uraian: string | null;
  akses: AksesPanitia[];
}
export interface Panitia {
  id: string;
  nama: string;
  status: StatusPanitia;
  tahun_id: string | null;
  jenis: { id: number; kode: string; nama: string; wajib_sk?: boolean; masa_maks_hari?: number | null };
  unit: { id: number; nama: string; jenis: string; singkatan: string | null };
  nomor_sk: string | null;
  tanggal_sk: string | null;
  penetap_sk: string | null;
  ada_sk: boolean;
  /** SK di registri SK tunggal yang dirujuk panitia ini (docs/SK.md). */
  sk_registri?: SKRegistri | null;
  mulai: string;
  selesai: string;
  sisa_hari: number;
  jumlah_anggota: number;
  akses_menunggu: number;
  akses_disetujui: number;
  akses_ditolak: number;
  diajukan_oleh: string | null;
  diajukan_at: string | null;
  dibuat_oleh: string | null;
  created_at: string | null;
}
export interface DetailPanitia extends Panitia {
  keterangan: string | null;
  sk: { berkas_id: string; nama_file: string | null; mime: string | null; ukuran: number | null } | null;
  jabatan: JabatanPanitia[];
  anggota: AnggotaPanitia[];
  masalah: string[];
  boleh: { ubah: boolean; ubah_masa: boolean; anggota: boolean; ajukan: boolean; bubarkan: boolean; hapus: boolean; salin: boolean; putuskan: boolean };
}
export interface HakPanitia {
  izin: Record<string, 'semua' | number[]>;
  boleh: { lihat: boolean; kelola: boolean; setujui: boolean; atur: boolean; semua_unit: boolean };
  unit_kelola: UnitPanitia[];
  pengguna: { username: string | null; nama: string | null; level: string | null };
  keanggotaan: KeanggotaanPanitia[];
}
export interface KeanggotaanPanitia {
  panitia: { id: string; nama: string; status: StatusPanitia; jenis: string; jenis_kode: string; unit: string; nomor_sk: string | null; mulai: string; selesai: string; sisa_hari: number };
  jabatan: string;
  uraian: string | null;
  akses: AksesPanitia[];
}
export interface ReferensiPanitia {
  jenis: JenisPanitia[];
  unit_kelola: UnitPanitia[];
  status: Array<{ kode: StatusPanitia; nama: string }>;
}
export interface AntreanAksesPanitia extends AksesPanitia {
  anggota: { id: string; username: string; nama: string; level: string | null; jabatan: string; uraian: string | null };
  panitia: {
    id: string;
    nama: string;
    jenis: string;
    unit: string;
    status: StatusPanitia;
    nomor_sk: string | null;
    tanggal_sk: string | null;
    penetap_sk: string | null;
    ada_sk: boolean;
    mulai: string;
    selesai: string;
  };
}
export interface RingkasanAksesPanitia {
  menunggu: number;
  panitia_menunggu: number;
  aktif: number;
  akses_aktif: number;
  berakhir_7_hari: number;
}
export interface RiwayatPanitia {
  aksi: string;
  catatan: string | null;
  oleh: string | null;
  created_at: string | null;
}
export interface FilterPanitia {
  status?: StatusPanitia;
  jenis?: string;
  unit_id?: number;
  tahun_id?: string;
  menunggu?: boolean;
  q?: string;
  page?: number;
  per_page?: number;
}

const bersih = (o: object) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false).map(([k, v]) => [k, v === true ? '1' : v]));

// ================================================================ Data
export function useHakPanitia() {
  return useSiakadQuery<HakPanitia>(['panitia', 'saya'], (s, signal) => s.request<HakPanitia>({ method: 'GET', path: '/v1/panitia/saya' }, { signal }), { staleTime: 60_000 });
}
export function useReferensiPanitia(jenisUnit?: string) {
  return useSiakadQuery<ReferensiPanitia>(['panitia', 'referensi', jenisUnit ?? ''], (s, signal) => s.request<ReferensiPanitia>({ method: 'GET', path: '/v1/panitia/referensi', query: bersih({ jenis_unit: jenisUnit }) }, { signal }), {
    staleTime: 5 * 60_000,
  });
}
export function useDaftarPanitia(filter: FilterPanitia, opsi?: { enabled?: boolean }) {
  return useSiakadQuery<Panitia[]>(['panitia', 'daftar', filter], (s, signal) => s.request<Panitia[]>({ method: 'GET', path: '/v1/panitia', query: bersih(filter) }, { signal }), opsi);
}
export function usePanitia(id: string | null | undefined) {
  return useSiakadQuery<DetailPanitia>(['panitia', 'detail', id ?? ''], (s, signal) => s.request<DetailPanitia>({ method: 'GET', path: `/v1/panitia/${id}` }, { signal }), { enabled: Boolean(id) });
}
export function useRiwayatPanitia(id: string) {
  return useSiakadQuery<RiwayatPanitia[]>(['panitia', 'riwayat', id], (s, signal) => s.request<RiwayatPanitia[]>({ method: 'GET', path: `/v1/panitia/${id}/riwayat` }, { signal }));
}
export function useAntreanAksesPanitia(filter: { status?: StatusAksesPanitia | 'semua'; panitia_id?: string; unit_id?: number; q?: string; page?: number; per_page?: number }) {
  return useSiakadQuery<AntreanAksesPanitia[]>(['panitia', 'akses', filter], (s, signal) => s.request<AntreanAksesPanitia[]>({ method: 'GET', path: '/v1/panitia/akses', query: bersih(filter) }, { signal }));
}
export function useRingkasanAksesPanitia(opsi?: { enabled?: boolean }) {
  return useSiakadQuery<RingkasanAksesPanitia>(['panitia', 'akses', 'ringkasan'], (s, signal) => s.request<RingkasanAksesPanitia>({ method: 'GET', path: '/v1/panitia/akses/ringkasan' }, { signal }), opsi);
}
export function useJenisPanitia(semua = false) {
  return useSiakadQuery<JenisPanitia[]>(['panitia', 'jenis', semua], (s, signal) => s.request<JenisPanitia[]>({ method: 'GET', path: '/v1/panitia/jenis', query: bersih({ semua }) }, { signal }));
}
export function usePeranPilihanPanitia(opsi?: { enabled?: boolean }) {
  return useSiakadQuery<PeranPanitia[]>(['panitia', 'jenis', 'peran'], (s, signal) => s.request<PeranPanitia[]>({ method: 'GET', path: '/v1/panitia/jenis/peran' }, { signal }), { staleTime: 5 * 60_000, ...opsi });
}

/** Sumber {@link PilihEntitas} untuk anggota panitia: akun SIAKAD aktif lewat /v1/panitia/pengguna. */
export const SUMBER_ANGGOTA_PANITIA: SumberEntitas = {
  nama: 'akun',
  path: '/v1/panitia/pengguna',
  kunci: 'username',
  saringKunci: 'q',
  judul: (r) => String(r.nama ?? r.username ?? ''),
  meta: (r) => [r.username, LABEL_LEVEL[String(r.level)] ?? r.level].filter(Boolean).join(' · '),
  avatar: true,
  placeholder: 'Cari nama atau username dosen/tendik',
};

const LABEL_LEVEL: Record<string, string> = {
  ADMIN: 'Admin',
  DOSEN: 'Dosen',
  OPERATOR: 'Operator',
  PROGDI: 'Admin prodi',
  BAK: 'BAAK',
  KEUANGAN: 'Keuangan',
  DIREKTUR: 'Pimpinan',
  WD1: 'Wakil dekan',
  PUSTAKA: 'Pustakawan',
  PANITIA: 'Panitia PMB',
  MAHASISWA: 'Mahasiswa',
};

// ================================================================ Lencana
export const LABEL_STATUS_PANITIA: Record<StatusPanitia, string> = { draf: 'Draf', aktif: 'Aktif', selesai: 'Selesai', dibubarkan: 'Dibubarkan' };
const VARIAN_STATUS_PANITIA: Record<StatusPanitia, 'neutral' | 'success' | 'info' | 'danger'> = { draf: 'neutral', aktif: 'success', selesai: 'info', dibubarkan: 'danger' };
export const LABEL_STATUS_AKSES_PANITIA: Record<StatusAksesPanitia, string> = {
  diajukan: 'Menunggu Pustikom',
  disetujui: 'Aktif',
  ditolak: 'Ditolak',
  dicabut: 'Dicabut',
  berakhir: 'Berakhir',
};
const VARIAN_STATUS_AKSES: Record<StatusAksesPanitia, 'warning' | 'success' | 'danger' | 'neutral' | 'info'> = {
  diajukan: 'warning',
  disetujui: 'success',
  ditolak: 'danger',
  dicabut: 'neutral',
  berakhir: 'info',
};

export function StatusPanitiaBadge({ status }: { status: StatusPanitia }) {
  return (
    <Badge variant={VARIAN_STATUS_PANITIA[status]} dot>
      {LABEL_STATUS_PANITIA[status]}
    </Badge>
  );
}
export function StatusAksesPanitiaBadge({ status }: { status: StatusAksesPanitia }) {
  return (
    <Badge variant={VARIAN_STATUS_AKSES[status]} dot>
      {LABEL_STATUS_AKSES_PANITIA[status]}
    </Badge>
  );
}

/** Deret aplikasi yang dibuka sebuah peran/jabatan. */
export function DeretAplikasiPanitia({ aplikasi, kosong = 'Tanpa aplikasi tambahan' }: { aplikasi: AplikasiPanitia[]; kosong?: React.ReactNode }) {
  if (!aplikasi.length) return <span className="u-panitia-redup">{kosong}</span>;
  return (
    <span className="u-panitia-aplikasi">
      {aplikasi.map((a) => (
        <span key={a.kode} className="u-panitia-chip" title={a.url ?? undefined}>
          <AppWindow aria-hidden /> {a.nama}
        </span>
      ))}
    </span>
  );
}

function masaPanitia(p: { mulai: string; selesai: string }) {
  return `${formatDate(p.mulai)} – ${formatDate(p.selesai)}`;
}
function sisaTeks(p: Panitia | KeanggotaanPanitia['panitia']) {
  if (p.status !== 'aktif') return null;
  if (p.sisa_hari < 0) return 'Masa SK lewat';
  if (p.sisa_hari === 0) return 'Berakhir hari ini';
  return `${p.sisa_hari} hari lagi`;
}

async function unduhSkPanitia(siakad: ReturnType<typeof useSiakad>, p: { id: string; nomor_sk: string | null }, nama?: string | null) {
  const r = await siakad.request<unknown>({ method: 'GET', path: `/v1/panitia/${p.id}/sk`, query: { unduh: '1' } });
  const d = r.data as { blob?: () => Blob } | Blob | null;
  const blob = d instanceof Blob ? d : d && typeof d === 'object' && typeof d.blob === 'function' ? d.blob() : null;
  if (!blob) throw new Error('Berkas SK tidak dapat diunduh.');
  const url = URL.createObjectURL(blob);
  const el = document.createElement('a');
  el.href = url;
  el.download = nama ?? `SK-${(p.nomor_sk ?? p.id).replace(/[^\w.-]+/g, '-')}.pdf`;
  el.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function galatIsian(e: unknown, setGalat: (g: Record<string, string>) => void): string {
  const f = (e as { fields?: Record<string, unknown> }).fields;
  if (f && Object.keys(f).length) {
    setGalat(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, String(v)])));
    return Object.values(f).map(String).join(' ') || 'Periksa isian yang ditandai.';
  }
  throw e;
}

// ================================================================ Form panitia
interface IsiPanitia {
  jenis_id: string;
  unit_id: string;
  nama: string;
  tahun_id: string;
  mulai: string;
  selesai: string;
  penetap_sk: string;
  keterangan: string;
}

export interface FormPanitiaProps {
  /** Panitia yang diubah; kosong = bentuk baru. */
  panitia?: DetailPanitia;
  /** Unit pembentuk tetap (mis. fakultas aplikasi ini); kosong = pilih dari unit yang boleh dikelola. */
  unitId?: number | null;
  /** Hanya jenis panitia untuk jenis unit ini, mis. "fakultas". */
  jenisUnit?: string;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  onTersimpan?: (p: DetailPanitia) => void;
}

/** Bentuk/ubah panitia (POST /v1/panitia, /v1/panitia/{id}) dengan pratinjau jabatan, peran, dan aplikasinya. */
export function FormPanitia({ panitia, unitId, jenisUnit, trigger, open, onOpenChange, onTersimpan }: FormPanitiaProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const ref = useReferensiPanitia(jenisUnit);
  const awal = React.useMemo<IsiPanitia>(
    () => ({
      jenis_id: panitia ? String(panitia.jenis.id) : '',
      unit_id: panitia ? String(panitia.unit.id) : unitId ? String(unitId) : '',
      nama: panitia?.nama ?? '',
      tahun_id: panitia?.tahun_id ?? '',
      mulai: panitia?.mulai ?? '',
      selesai: panitia?.selesai ?? '',
      penetap_sk: panitia?.penetap_sk ?? '',
      keterangan: panitia?.keterangan ?? '',
    }),
    [panitia, unitId],
  );
  const [isi, setIsi] = React.useState(awal);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [inner, setInner] = React.useState(false);
  const isOpen = open ?? inner;
  React.useEffect(() => {
    if (isOpen) {
      setIsi(awal);
      setGalat({});
    }
  }, [isOpen, awal]);
  const set = <K extends keyof IsiPanitia>(k: K, v: IsiPanitia[K]) => {
    setIsi((x) => ({ ...x, [k]: v }));
    setGalat((g) => ({ ...g, [k]: '' }));
  };
  const draf = !panitia || panitia.status === 'draf';
  const units = ref.data?.unit_kelola ?? [];
  const unitTerpilih = units.find((u) => String(u.id) === isi.unit_id);
  const jenisUnitAktif = unitTerpilih?.jenis ?? panitia?.unit.jenis ?? jenisUnit;
  const jenisOpsi: SelectOption<string>[] = (ref.data?.jenis ?? [])
    .filter((j) => !jenisUnitAktif || !j.jenis_unit.length || j.jenis_unit.includes(jenisUnitAktif))
    .map((j) => ({ value: String(j.id), label: j.nama, description: j.keterangan ?? undefined }));
  const jenis = ref.data?.jenis.find((j) => String(j.id) === isi.jenis_id);
  return (
    <PanelForm
      open={isOpen}
      onOpenChange={(o) => {
        setInner(o);
        onOpenChange?.(o);
      }}
      trigger={trigger}
      size="lg"
      title={panitia ? 'Ubah panitia' : 'Bentuk panitia'}
      description={
        draf
          ? 'Isi dasar SK dan masa berlakunya. Anggota dan berkas SK dilengkapi di panel detail sebelum hak aksesnya diajukan ke Pustikom.'
          : 'Panitia sudah diajukan: SK dan masa berlaku terkunci. Untuk SK perubahan atau perpanjangan, gunakan Salin panitia.'
      }
      berubah={JSON.stringify(isi) !== JSON.stringify(awal)}
      labelSimpan={panitia ? 'Simpan' : 'Buat draf'}
      onSimpan={async () => {
        const g: Record<string, string> = {};
        if (draf && !isi.jenis_id) g.jenis_id = 'Pilih jenis panitia.';
        if (draf && !isi.unit_id) g.unit_id = 'Pilih unit pembentuk.';
        if (!isi.nama.trim()) g.nama = 'Nama panitia wajib diisi.';
        if (draf && !isi.mulai) g.mulai = 'Tanggal mulai berlaku SK.';
        if (draf && !isi.selesai) g.selesai = 'Tanggal berakhir SK.';
        if (draf && isi.mulai && isi.selesai && isi.selesai < isi.mulai) g.selesai = 'Tidak boleh sebelum tanggal mulai.';
        setGalat(g);
        if (Object.keys(g).length) return 'Periksa isian yang ditandai.';
        const body = draf
          ? { jenis_id: Number(isi.jenis_id), unit_id: Number(isi.unit_id), nama: isi.nama.trim(), tahun_id: isi.tahun_id || null, mulai: isi.mulai, selesai: isi.selesai, penetap_sk: isi.penetap_sk.trim() || null, keterangan: isi.keterangan.trim() || null }
          : { nama: isi.nama.trim(), keterangan: isi.keterangan.trim() || null };
        let r;
        try {
          r = await siakad.request<DetailPanitia>({ method: 'POST', path: panitia ? `/v1/panitia/${panitia.id}` : '/v1/panitia', body });
        } catch (e) {
          return galatIsian(e, setGalat);
        }
        invalidateSiakad('panitia');
        toast.add({ title: panitia ? 'Panitia diperbarui' : 'Draf panitia dibuat', description: panitia ? undefined : 'Lampirkan SK dan isi anggota, lalu ajukan hak aksesnya.', type: 'success' });
        if (r.data) onTersimpan?.(r.data);
      }}
    >
      {ref.error && <GalatApi error={ref.error} onRetry={ref.refetch} />}
      <BagianForm judul="Panitia" kolom={2}>
        {!unitId && (
          <Field label="Unit pembentuk" required error={galat.unit_id || undefined} description="Unit yang menerbitkan SK. Peran berlingkup unit berlaku di unit ini.">
            <Pilihan
              options={units.map((u) => ({ value: String(u.id), label: u.nama, description: u.jenis }))}
              value={isi.unit_id || null}
              tampilan="cari"
              disabled={!draf}
              placeholder="Pilih unit"
              onValueChange={(v) => setIsi((x) => ({ ...x, unit_id: v ?? '', jenis_id: '' }))}
            />
          </Field>
        )}
        <Field label="Jenis panitia" required error={galat.jenis_id || undefined} className={unitId ? 'u-form-lebar' : undefined}>
          <Pilihan options={jenisOpsi} value={isi.jenis_id || null} tampilan="daftar" disabled={!draf} placeholder="mis. Panitia UTS" onValueChange={(v) => set('jenis_id', v ?? '')} />
        </Field>
        <Field label="Nama panitia" required className="u-form-lebar" error={galat.nama || undefined}>
          <Input value={isi.nama} maxLength={200} placeholder={jenis ? `mis. ${jenis.nama.replace(/\s*\(.*\)$/, '')} 2026` : 'mis. Panitia Wisuda 2026'} onChange={(e) => set('nama', e.target.value)} />
        </Field>
        <Field label="Berlaku mulai" required error={galat.mulai || undefined}>
          <IsianTanggal value={isi.mulai || null} disabled={!draf} onValueChange={(v) => set('mulai', v ?? '')} />
        </Field>
        <Field label="Berlaku sampai" required error={galat.selesai || undefined} description={jenis?.masa_maks_hari ? `Paling lama ${jenis.masa_maks_hari} hari.` : 'Hak akses panitia ikut berakhir pada tanggal ini.'}>
          <IsianTanggal value={isi.selesai || null} disabled={!draf} min={isi.mulai || undefined} onValueChange={(v) => set('selesai', v ?? '')} />
        </Field>
        <Field label="Penetap SK" optional description="Pejabat yang menandatangani, mis. Rektor atau Dekan FIK.">
          <Input value={isi.penetap_sk} maxLength={150} disabled={!draf} onChange={(e) => set('penetap_sk', e.target.value)} />
        </Field>
        <Field label="Tahun akademik" optional description="Isi untuk panitia per semester, mis. UTS/UAS." error={galat.tahun_id || undefined}>
          <PilihTahunAkademik value={isi.tahun_id || null} disabled={!draf} placeholder="Tidak terikat semester" onValueChange={(v) => set('tahun_id', v ?? '')} />
        </Field>
        <Field label="Keterangan" optional className="u-form-lebar">
          <Textarea value={isi.keterangan} rows={2} maxLength={5000} onChange={(e) => set('keterangan', e.target.value)} />
        </Field>
      </BagianForm>
      {jenis && (
        <BagianForm judul="Jabatan dan hak akses" kolom={1} keterangan="Peran yang diajukan ke Pustikom untuk pemegang tiap jabatan. Diatur Pustikom di Kepanitiaan » Jenis panitia.">
          <TabelJabatanPanitia jabatan={jenis.jabatan} />
        </BagianForm>
      )}
    </PanelForm>
  );
}

/** Tabel jabatan → peran → aplikasi (pratinjau hak akses sebuah jenis panitia). */
export function TabelJabatanPanitia({ jabatan, jumlah }: { jabatan: JabatanPanitia[]; jumlah?: Record<number, number> }) {
  return (
    <table className="u-panitia-tabel">
      <thead>
        <tr>
          <th>Jabatan</th>
          <th>Peran yang diajukan</th>
          <th>Aplikasi</th>
        </tr>
      </thead>
      <tbody>
        {jabatan.map((j) => (
          <tr key={j.id}>
            <td>
              <strong>{j.nama}</strong>
              <span className="u-panitia-redup">
                {[j.wajib && 'wajib', j.maks != null && `maks. ${j.maks}`, jumlah && `${jumlah[j.id] ?? 0} orang`].filter(Boolean).join(' · ')}
              </span>
            </td>
            <td>
              {j.peran.length ? (
                <span className="u-panitia-peran">
                  {j.peran.map((p) => (
                    <span key={p.id} className="u-panitia-chip" data-nada="peran" title={p.lingkup === 'unit' ? 'Berlaku di unit panitia' : 'Berlaku di semua unit'}>
                      <KeyRound aria-hidden /> {p.nama}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="u-panitia-redup">Tanpa hak akses tambahan</span>
              )}
            </td>
            <td>
              <DeretAplikasiPanitia aplikasi={j.aplikasi} kosong="—" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ================================================================ SK
/**
 * SK panitia (POST /v1/panitia/{id}/sk): dipilih dari registri SK tunggal (sk_id). Nomor, tanggal, penetap, dan berkas
 * diambil dari registri; tidak diunggah ulang. SK yang belum tercatat diajukan pencatatannya ke unit penerbit.
 */
export function FormSkPanitia({ panitia, trigger, open, onOpenChange }: { panitia: DetailPanitia; trigger?: React.ReactElement; open?: boolean; onOpenChange?: (o: boolean) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const awal = panitia.sk_registri?.id ?? null;
  const [skId, setSkId] = React.useState<string | null>(awal);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [inner, setInner] = React.useState(false);
  const isOpen = open ?? inner;
  React.useEffect(() => {
    if (isOpen) {
      setSkId(awal);
      setGalat({});
    }
  }, [isOpen, awal]);
  return (
    <PanelForm
      open={isOpen}
      onOpenChange={(o) => {
        setInner(o);
        onOpenChange?.(o);
      }}
      trigger={trigger}
      tampilan="dialog"
      title="SK panitia"
      description="Pilih SK pembentukan panitia dari registri SK. Pustikom membuka berkasnya dari registri saat memeriksa pengajuan hak akses."
      berubah={skId !== awal}
      labelSimpan="Simpan SK"
      onSimpan={async () => {
        if (!skId) {
          setGalat({ sk_id: 'Pilih SK dari registri, atau ajukan pencatatannya bila belum ada.' });
          return 'Pilih SK panitia.';
        }
        try {
          await siakad.request({ method: 'POST', path: `/v1/panitia/${panitia.id}/sk`, body: { sk_id: skId } });
        } catch (e) {
          return galatIsian(e, setGalat);
        }
        invalidateSiakad('panitia');
        toast.add({ title: 'SK dilampirkan', type: 'success' });
      }}
    >
      <PilihSK value={skId} sk={panitia.sk_registri ?? null} onValueChange={(id) => setSkId(id)} jenis="panitia" penerbitUnitId={panitia.unit?.id ?? null} perihal={`Pembentukan ${panitia.nama}`} label="SK panitia" required catatSekarang={{ label: 'Catat SK panitia sekarang', isian: { jenis: 'panitia', penerbitUnitId: panitia.unit?.id ?? null, perihal: `Pembentukan ${panitia.nama}` } }} error={galat.sk_id || galat.nomor_sk || galat.berkas_id || undefined} />
    </PanelForm>
  );
}

// ================================================================ Anggota
interface BarisAnggota {
  kunci: number;
  username: string | null;
  jabatan_id: string;
  uraian: string;
}

/** Tambah anggota (POST /v1/panitia/{id}/anggota): cari akun, pilih jabatan, rincian tugas. */
export function FormAnggotaPanitia({ panitia, trigger, open, onOpenChange }: { panitia: DetailPanitia; trigger?: React.ReactElement; open?: boolean; onOpenChange?: (o: boolean) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const kunci = React.useRef(1);
  const baru = (): BarisAnggota => ({ kunci: kunci.current++, username: null, jabatan_id: String(panitia.jabatan[panitia.jabatan.length - 1]?.id ?? ''), uraian: '' });
  const [baris, setBaris] = React.useState<BarisAnggota[]>(() => [baru()]);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [inner, setInner] = React.useState(false);
  const isOpen = open ?? inner;
  React.useEffect(() => {
    if (isOpen) {
      setBaris([baru()]);
      setGalat({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  const ubah = (k: number, patch: Partial<BarisAnggota>) => setBaris((b) => b.map((x) => (x.kunci === k ? { ...x, ...patch } : x)));
  const jabatanOpsi = panitia.jabatan.map((j) => ({ value: String(j.id), label: j.nama, description: j.peran.length ? j.peran.map((p) => p.nama).join(', ') : 'Tanpa hak akses tambahan' }));
  return (
    <PanelForm
      open={isOpen}
      onOpenChange={(o) => {
        setInner(o);
        onOpenChange?.(o);
      }}
      trigger={trigger}
      size="lg"
      title="Tambah anggota"
      description={
        panitia.status === 'aktif'
          ? 'Panitia sudah aktif: hak akses anggota baru langsung diajukan ke Pustikom.'
          : 'Hak akses diajukan ke Pustikom saat panitia diajukan.'
      }
      berubah={baris.some((b) => b.username)}
      labelSimpan="Tambahkan"
      onSimpan={async () => {
        const isi = baris.filter((b) => b.username);
        if (!isi.length) return 'Pilih minimal satu akun.';
        try {
          await siakad.request({ method: 'POST', path: `/v1/panitia/${panitia.id}/anggota`, body: { anggota: isi.map((b) => ({ username: b.username, jabatan_id: Number(b.jabatan_id), uraian: b.uraian.trim() || null })) } });
        } catch (e) {
          return galatIsian(e, setGalat);
        }
        invalidateSiakad('panitia');
        toast.add({ title: `${isi.length} anggota ditambahkan`, description: panitia.status === 'aktif' ? 'Hak aksesnya menunggu persetujuan Pustikom.' : undefined, type: 'success' });
      }}
    >
      <div className="u-panitia-isian-anggota">
        {baris.map((b, i) => (
          <div key={b.kunci} className="u-panitia-baris-anggota">
            <Field label={i === 0 ? 'Akun' : undefined} error={galat[`anggota.${i}.username`] || undefined} aria-label="Akun">
              <PilihEntitas jenis={SUMBER_ANGGOTA_PANITIA} value={b.username} onValueChange={(v) => ubah(b.kunci, { username: v })} />
            </Field>
            <Field label={i === 0 ? 'Jabatan' : undefined} error={galat[`anggota.${i}.jabatan_id`] || undefined}>
              <Pilihan options={jabatanOpsi} value={b.jabatan_id || null} tampilan="daftar" required aria-label="Jabatan" onValueChange={(v) => ubah(b.kunci, { jabatan_id: v ?? '' })} />
            </Field>
            <Field label={i === 0 ? 'Rincian tugas' : undefined} optional={i === 0}>
              <Input value={b.uraian} maxLength={150} placeholder="mis. Koordinator CBT" aria-label="Rincian tugas" onChange={(e) => ubah(b.kunci, { uraian: e.target.value })} />
            </Field>
            <Button variant="ghost" size="sm" iconOnly aria-label="Hapus baris" disabled={baris.length === 1} onClick={() => setBaris((x) => x.filter((y) => y.kunci !== b.kunci))}>
              <X />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setBaris((x) => [...x, baru()])}>
          <Plus /> Baris anggota
        </Button>
      </div>
    </PanelForm>
  );
}

// ================================================================ Detail
type AksiPanitia = 'ajukan' | 'ajukan-ulang' | 'bubarkan' | 'hapus' | 'salin';

/** Isi detail panitia: SK, masa, anggota beserta status hak aksesnya, pratinjau jabatan, riwayat, dan tombol alur. */
export function DetailPanitiaIsi({ id, onPilih, onTertutup }: { id: string; onPilih?: (id: string) => void; onTertutup?: () => void }) {
  const q = usePanitia(id);
  const siakad = useSiakad();
  const toast = useToast();
  const [tab, setTab] = React.useState<'anggota' | 'hak' | 'riwayat'>('anggota');
  const [ubah, setUbah] = React.useState(false);
  const [skForm, setSkForm] = React.useState(false);
  const [tambah, setTambah] = React.useState(false);
  const [aksi, setAksi] = React.useState<AksiPanitia | null>(null);
  const [keluar, setKeluar] = React.useState<AnggotaPanitia | null>(null);
  const [putus, setPutus] = React.useState<{ keputusan: 'setujui' | 'tolak'; akses: AksesPanitia[] } | null>(null);
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  const p = q.data;
  if (!p) return <Skeleton style={{ height: 360 }} />;
  const b = p.boleh;
  const menunggu = p.anggota.flatMap((a) => a.akses.filter((x) => x.status === 'diajukan'));
  const adaDitolak = p.anggota.some((a) => a.akses.some((x) => x.status === 'ditolak' || x.status === 'dicabut'));
  const jumlahJabatan: Record<number, number> = {};
  p.anggota.forEach((a) => a.jabatan && (jumlahJabatan[a.jabatan.id] = (jumlahJabatan[a.jabatan.id] ?? 0) + 1));
  const menu: MenuEntry[] = [
    ...(b.salin ? [{ label: 'Salin (SK baru/perpanjangan)', icon: <Copy />, onSelect: () => setAksi('salin') } as MenuEntry] : []),
    ...(b.ubah && p.status === 'aktif' && adaDitolak ? [{ label: 'Ajukan ulang akses ditolak', icon: <RotateCcw />, onSelect: () => setAksi('ajukan-ulang') } as MenuEntry] : []),
    ...(b.bubarkan ? [{ label: 'Bubarkan panitia', icon: <X />, destructive: true, onSelect: () => setAksi('bubarkan') } as MenuEntry] : []),
    ...(b.hapus ? [{ label: 'Hapus draf', icon: <Trash2 />, destructive: true, onSelect: () => setAksi('hapus') } as MenuEntry] : []),
  ];
  const kolom: DataColumn<AnggotaPanitia>[] = [
    {
      key: 'nama',
      header: 'Anggota',
      cell: (a) => (
        <div className="u-panitia-sel-nama">
          <strong>{a.nama}</strong>
          <span>{[a.username, a.level && (LABEL_LEVEL[a.level] ?? a.level), !a.akun_aktif && 'akun nonaktif'].filter(Boolean).join(' · ')}</span>
        </div>
      ),
      value: (a) => a.nama,
      mobile: 'title',
    },
    {
      key: 'jabatan',
      header: 'Jabatan',
      cell: (a) => (
        <div className="u-panitia-sel-nama">
          <strong>{a.jabatan?.nama ?? '—'}</strong>
          {a.uraian && <span>{a.uraian}</span>}
        </div>
      ),
      value: (a) => a.jabatan?.nama ?? '',
    },
    {
      key: 'akses',
      header: 'Hak akses',
      cell: (a) =>
        a.akses.length ? (
          <ul className="u-panitia-akses-daftar">
            {a.akses.map((x) => (
              <li key={x.id}>
                <span className="u-panitia-akses-peran">
                  <KeyRound aria-hidden /> {x.peran.nama ?? x.peran.kode}
                </span>
                <StatusAksesPanitiaBadge status={x.status} />
                {x.catatan && x.status !== 'disetujui' && <span className="u-panitia-redup">{x.catatan}</span>}
                {b.putuskan && x.status === 'diajukan' && (
                  <span className="u-panitia-akses-tombol">
                    <Button size="sm" variant="ghost" onClick={() => setPutus({ keputusan: 'tolak', akses: [x] })}>
                      Tolak
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPutus({ keputusan: 'setujui', akses: [x] })}>
                      Setujui
                    </Button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <span className="u-panitia-redup">{p.jabatan.find((j) => j.id === a.jabatan?.id)?.peran.length ? (p.status === 'draf' ? 'Diajukan saat panitia diajukan' : '—') : 'Tanpa hak akses tambahan'}</span>
        ),
      value: (a) => a.akses.map((x) => `${x.peran.kode}:${x.status}`).join(', '),
    },
    {
      key: 'aplikasi',
      header: 'Aplikasi',
      cell: (a) => {
        const apps = new Map<string, AplikasiPanitia>();
        (a.akses.length ? a.akses.filter((x) => x.status === 'disetujui' || x.status === 'diajukan').flatMap((x) => x.aplikasi) : (p.jabatan.find((j) => j.id === a.jabatan?.id)?.aplikasi ?? [])).forEach((x) => apps.set(x.kode, x));
        return <DeretAplikasiPanitia aplikasi={[...apps.values()]} kosong="—" />;
      },
      value: (a) => a.akses.flatMap((x) => x.aplikasi.map((y) => y.nama)).join(', '),
      defaultHidden: false,
    },
  ];
  return (
    <div className="u-panitia-detail">
      <div className="u-panitia-kepala">
        <div>
          <div className="u-panitia-lencana">
            <StatusPanitiaBadge status={p.status} />
            {sisaTeks(p) && (
              <Badge variant={p.sisa_hari <= 7 ? 'warning' : 'neutral'}>
                <Hourglass aria-hidden /> {sisaTeks(p)}
              </Badge>
            )}
          </div>
          <h2>{p.nama}</h2>
          <p>{[p.jenis.nama, p.unit.nama, p.tahun_id && `TA ${p.tahun_id}`].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="u-panitia-aksi">
          {b.ubah && (
            <Button variant="outline" size="sm" onClick={() => setUbah(true)}>
              <Pencil /> Ubah
            </Button>
          )}
          {b.anggota && (
            <Button variant="outline" size="sm" onClick={() => setTambah(true)}>
              <UserPlus /> Anggota
            </Button>
          )}
          {b.ajukan && (
            <Button size="sm" disabled={p.masalah.length > 0} onClick={() => setAksi('ajukan')}>
              <Send /> Ajukan ke Pustikom
            </Button>
          )}
          {b.putuskan && menunggu.length > 0 && (
            <Button size="sm" onClick={() => setPutus({ keputusan: 'setujui', akses: menunggu })}>
              <CircleCheck /> Setujui semua ({menunggu.length})
            </Button>
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
      {p.status === 'draf' && p.masalah.length > 0 && (
        <Alert variant="warning" title="Lengkapi sebelum diajukan">
          <ul className="u-panitia-masalah">
            {p.masalah.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </Alert>
      )}
      {p.status === 'draf' && p.masalah.length === 0 && (
        <Alert variant="info" title="Siap diajukan">
          Setelah diajukan, peran tiap anggota menunggu persetujuan Pustikom. SK dan masa berlaku terkunci.
        </Alert>
      )}
      {p.status === 'aktif' && p.akses_menunggu > 0 && !b.putuskan && (
        <Alert variant="info" title={`${p.akses_menunggu} hak akses menunggu persetujuan Pustikom`}>
          Anggota tetap bisa bekerja dengan akses yang sudah ada. Aplikasi panitia terbuka setelah disetujui.
        </Alert>
      )}
      <DescriptionList
        items={[
          {
            label: 'SK',
            value: p.nomor_sk ? (
              <span className="u-panitia-sk">
                <span>
                  {p.nomor_sk}
                  {p.tanggal_sk && ` · ${formatDate(p.tanggal_sk, 'long')}`}
                  {p.penetap_sk && ` · ${p.penetap_sk}`}
                </span>
                {p.sk && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => unduhSkPanitia(siakad, p, p.sk?.nama_file).catch((e) => toast.add({ title: 'Gagal mengunduh SK', description: pesanGalat(e), type: 'error' }))}
                  >
                    <Download /> {p.sk.nama_file ?? 'Unduh'}
                  </Button>
                )}
              </span>
            ) : (
              'Belum dilampirkan'
            ),
          },
          { label: 'Berlaku', value: `${formatDate(p.mulai, 'long')} s.d. ${formatDate(p.selesai, 'long')}` },
          { label: 'Anggota', value: `${p.jumlah_anggota} orang` },
          {
            label: 'Hak akses',
            value: p.status === 'draf' ? 'Belum diajukan' : [`${p.akses_disetujui} aktif`, p.akses_menunggu && `${p.akses_menunggu} menunggu`, p.akses_ditolak && `${p.akses_ditolak} ditolak`].filter(Boolean).join(' · '),
          },
          ...(p.diajukan_at ? [{ label: 'Diajukan', value: `${formatDate(p.diajukan_at, 'long')} oleh ${p.diajukan_oleh ?? '—'}` }] : []),
        ]}
      />
      {b.ubah_masa && (
        <div className="u-panitia-aksi">
          <Button variant={p.sk ? 'outline' : 'primary'} size="sm" onClick={() => setSkForm(true)}>
            <FileBadge /> {p.sk ? 'Ganti SK' : 'Lampirkan SK'}
          </Button>
        </div>
      )}
      {p.keterangan && <p className="u-panitia-keterangan">{p.keterangan}</p>}
      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'anggota', label: 'Anggota', count: p.anggota.length },
          { value: 'hak', label: 'Jabatan & hak akses' },
          { value: 'riwayat', label: 'Riwayat' },
        ]}
      />
      {tab === 'anggota' && (
        <DataTable
          columns={kolom}
          rows={p.anggota}
          rowKey={(a) => a.id}
          columnToggle={false}
          densityToggle={false}
          rowActions={b.anggota ? (a) => [{ label: 'Keluarkan dari panitia', icon: <UserMinus />, destructive: true, onSelect: () => setKeluar(a) }] : undefined}
          empty={{ icon: <Users />, title: 'Belum ada anggota', description: b.anggota ? 'Tambahkan ketua, sekretaris, dan anggota sesuai SK.' : undefined, action: b.anggota ? <Button size="sm" onClick={() => setTambah(true)}><UserPlus /> Tambah anggota</Button> : undefined }}
        />
      )}
      {tab === 'hak' && (
        <div className="u-panitia-hak">
          <p className="u-panitia-keterangan">
            Peran berlingkup unit berlaku di {p.unit.nama} dan turunannya. Semua peran berakhir pada {formatDate(p.selesai, 'long')} bersama SK.
          </p>
          <TabelJabatanPanitia jabatan={p.jabatan} jumlah={jumlahJabatan} />
        </div>
      )}
      {tab === 'riwayat' && <RiwayatPanitiaDaftar id={p.id} />}

      <FormPanitia panitia={p} open={ubah} onOpenChange={setUbah} />
      <FormSkPanitia panitia={p} open={skForm} onOpenChange={setSkForm} />
      <FormAnggotaPanitia panitia={p} open={tambah} onOpenChange={setTambah} />
      <DialogAksiPanitia panitia={p} aksi={aksi} onOpenChange={(o) => !o && setAksi(null)} onPilih={onPilih} onTertutup={onTertutup} />
      <DialogKeputusanAkses data={putus} onOpenChange={(o) => !o && setPutus(null)} />
      <ConfirmDialog
        open={Boolean(keluar)}
        onOpenChange={(o) => !o && setKeluar(null)}
        title={`Keluarkan ${keluar?.nama ?? ''}?`}
        description={keluar?.akses.some((x) => x.status === 'disetujui' || x.status === 'diajukan') ? 'Hak akses panitianya langsung dicabut hari ini.' : 'Anggota dihapus dari panitia.'}
        confirmLabel="Keluarkan"
        tone="danger"
        onConfirm={async () => {
          if (!keluar) return;
          await siakad.request({ method: 'POST', path: `/v1/panitia/${p.id}/anggota/${keluar.id}/hapus`, body: {} });
          invalidateSiakad('panitia');
          toast.add({ title: 'Anggota dikeluarkan', type: 'success' });
        }}
      />
    </div>
  );
}

function RiwayatPanitiaDaftar({ id }: { id: string }) {
  const q = useRiwayatPanitia(id);
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  if (!q.data) return <Skeleton style={{ height: 160 }} />;
  if (!q.data.length) return <Empty title="Belum ada riwayat" />;
  return (
    <ol className="u-panitia-riwayat">
      {q.data.map((r, i) => (
        <li key={i}>
          <span className="u-panitia-riwayat-aksi" data-aksi={r.aksi}>
            {r.aksi}
          </span>
          <div>
            <p>{r.catatan ?? '—'}</p>
            <span className="u-panitia-redup">
              {r.oleh ?? 'sistem'} · {r.created_at ? `${formatDate(r.created_at)} ${formatTime(r.created_at)}` : ''}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Dialog alur: ajukan, ajukan ulang, bubarkan, hapus draf, salin. */
function DialogAksiPanitia({ panitia: p, aksi, onOpenChange, onPilih, onTertutup }: { panitia: DetailPanitia; aksi: AksiPanitia | null; onOpenChange: (o: boolean) => void; onPilih?: (id: string) => void; onTertutup?: () => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [catatan, setCatatan] = React.useState('');
  const [selesai, setSelesai] = React.useState('');
  const [nama, setNama] = React.useState('');
  const [proses, setProses] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (aksi) {
      setCatatan('');
      setSelesai('');
      setNama(aksi === 'salin' ? p.nama : '');
      setGalat(null);
    }
  }, [aksi, p.nama]);
  const judul: Record<AksiPanitia, string> = {
    ajukan: 'Ajukan hak akses ke Pustikom',
    'ajukan-ulang': 'Ajukan ulang hak akses',
    bubarkan: 'Bubarkan panitia',
    hapus: 'Hapus draf panitia',
    salin: 'Salin panitia',
  };
  const jumlahAkses = p.anggota.reduce((n, a) => n + (p.jabatan.find((j) => j.id === a.jabatan?.id)?.peran.length ?? 0), 0);
  const jalankan = async () => {
    if (!aksi) return;
    if (aksi === 'bubarkan' && !catatan.trim()) return setGalat('Tulis alasan pembubaran.');
    if (aksi === 'salin' && !selesai) return setGalat('Isi tanggal berakhir SK baru.');
    setProses(true);
    setGalat(null);
    try {
      if (aksi === 'hapus') {
        await siakad.request({ method: 'POST', path: `/v1/panitia/${p.id}/hapus`, body: {} });
        invalidateSiakad('panitia');
        toast.add({ title: 'Draf dihapus', type: 'success' });
        onOpenChange(false);
        onTertutup?.();
        return;
      }
      const body = aksi === 'salin' ? { selesai, nama: nama.trim() || undefined } : { catatan: catatan.trim() || undefined };
      const r = await siakad.request<DetailPanitia & { akses_diajukan?: number }>({ method: 'POST', path: `/v1/panitia/${p.id}/${aksi}`, body });
      invalidateSiakad('panitia');
      const n = r.data?.akses_diajukan;
      toast.add({
        title: aksi === 'salin' ? 'Draf baru dibuat' : aksi === 'bubarkan' ? 'Panitia dibubarkan' : 'Diajukan ke Pustikom',
        description: aksi === 'salin' ? 'Lampirkan SK baru lalu ajukan.' : n != null ? (n > 0 ? `${n} hak akses menunggu persetujuan.` : 'Panitia aktif tanpa hak akses tambahan.') : undefined,
        type: 'success',
      });
      onOpenChange(false);
      if (aksi === 'salin' && r.data?.id) onPilih?.(r.data.id);
    } catch (e) {
      const f = (e as { fields?: Record<string, unknown>; details?: { masalah?: string[] } }).fields;
      setGalat(f ? Object.values(f).map(String).join(' ') : pesanGalat(e));
    } finally {
      setProses(false);
    }
  };
  return (
    <Dialog
      open={Boolean(aksi)}
      onOpenChange={onOpenChange}
      title={aksi ? judul[aksi] : ''}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button variant={aksi === 'bubarkan' || aksi === 'hapus' ? 'destructive' : 'primary'} loading={proses} onClick={jalankan}>
            {aksi === 'ajukan' ? 'Ajukan' : aksi === 'ajukan-ulang' ? 'Ajukan ulang' : aksi === 'bubarkan' ? 'Bubarkan' : aksi === 'hapus' ? 'Hapus' : 'Buat draf'}
          </Button>
        </>
      }
    >
      <div className="u-panitia-dialog">
        {aksi === 'ajukan' && (
          <p>
            {jumlahAkses > 0
              ? `${jumlahAkses} peran untuk ${p.anggota.length} anggota akan diajukan ke Pustikom. Peran aktif setelah disetujui dan berakhir ${formatDate(p.selesai, 'long')}.`
              : 'Jabatan panitia ini tidak membawa hak akses tambahan; panitia langsung aktif.'}{' '}
            SK dan masa berlaku terkunci setelah diajukan.
          </p>
        )}
        {aksi === 'ajukan-ulang' && <p>Peran yang ditolak atau dicabut untuk anggota yang masih tercatat diajukan lagi ke Pustikom.</p>}
        {aksi === 'bubarkan' && <p>Panitia berakhir hari ini dan semua hak akses anggotanya dicabut. Tindakan ini tidak bisa dibatalkan.</p>}
        {aksi === 'hapus' && <p>Draf dan daftar anggotanya dihapus. Riwayat tetap tersimpan.</p>}
        {aksi === 'salin' && (
          <>
            <p>Draf baru dengan jenis, unit, dan anggota yang sama. Lampirkan SK baru lalu ajukan; panitia lama tetap seperti sekarang.</p>
            <Field label="Nama panitia">
              <Input value={nama} maxLength={200} onChange={(e) => setNama(e.target.value)} />
            </Field>
            <Field label="Berlaku sampai" required>
              <IsianTanggal value={selesai || null} onValueChange={(v) => setSelesai(v ?? '')} />
            </Field>
          </>
        )}
        {(aksi === 'ajukan' || aksi === 'ajukan-ulang' || aksi === 'bubarkan') && (
          <Field label={aksi === 'bubarkan' ? 'Alasan' : 'Catatan untuk Pustikom'} required={aksi === 'bubarkan'} optional={aksi !== 'bubarkan'}>
            <Textarea value={catatan} rows={3} maxLength={255} onChange={(e) => setCatatan(e.target.value)} />
          </Field>
        )}
        {galat && <Alert variant="danger">{galat}</Alert>}
      </div>
    </Dialog>
  );
}

/** Dialog keputusan Pustikom (setujui/tolak satu atau banyak akses). */
function DialogKeputusanAkses({ data, onOpenChange }: { data: { keputusan: 'setujui' | 'tolak'; akses: Array<Pick<AksesPanitia, 'id'>> } | null; onOpenChange: (o: boolean) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [catatan, setCatatan] = React.useState('');
  const [proses, setProses] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (data) {
      setCatatan('');
      setGalat(null);
    }
  }, [data]);
  const tolak = data?.keputusan === 'tolak';
  return (
    <Dialog
      open={Boolean(data)}
      onOpenChange={onOpenChange}
      size="sm"
      title={tolak ? `Tolak ${data?.akses.length ?? 0} hak akses` : `Setujui ${data?.akses.length ?? 0} hak akses`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            variant={tolak ? 'destructive' : 'primary'}
            loading={proses}
            onClick={async () => {
              if (!data) return;
              if (tolak && !catatan.trim()) return setGalat('Tulis alasan penolakan untuk pembentuk panitia.');
              setProses(true);
              try {
                const r = await siakad.request<{ disetujui: number; ditolak: number; dilewati: Array<{ id: string; alasan: string }> }>({
                  method: 'POST',
                  path: '/v1/panitia/akses/putuskan',
                  body: { keputusan: data.keputusan, akses_id: data.akses.map((a) => a.id), catatan: catatan.trim() || undefined },
                });
                invalidateSiakad('panitia');
                const h = r.data;
                toast.add({
                  title: tolak ? `${h?.ditolak ?? 0} ditolak` : `${h?.disetujui ?? 0} hak akses aktif`,
                  description: h?.dilewati.length ? `${h.dilewati.length} dilewati: ${h.dilewati[0].alasan}` : tolak ? undefined : 'Anggota diberi notifikasi; aplikasinya tampil di portal SSO.',
                  type: 'success',
                });
                onOpenChange(false);
              } catch (e) {
                setGalat(pesanGalat(e));
              } finally {
                setProses(false);
              }
            }}
          >
            {tolak ? 'Tolak' : 'Setujui'}
          </Button>
        </>
      }
    >
      <div className="u-panitia-dialog">
        <p>
          {tolak
            ? 'Pembentuk panitia dan anggotanya menerima alasan ini dan bisa mengajukan ulang setelah diperbaiki.'
            : 'Peran aktif mulai tanggal berlaku SK dan berakhir otomatis bersama masa SK. Anda bisa mencabutnya kapan saja.'}
        </p>
        <Field label={tolak ? 'Alasan penolakan' : 'Catatan'} required={tolak} optional={!tolak}>
          <Textarea value={catatan} rows={3} maxLength={255} onChange={(e) => setCatatan(e.target.value)} />
        </Field>
        {galat && <Alert variant="danger">{galat}</Alert>}
      </div>
    </Dialog>
  );
}

/** Panel samping detail panitia. */
export function PanelPanitia({ id, onOpenChange, onPilih }: { id: string | null; onOpenChange: (o: boolean) => void; onPilih?: (id: string) => void }) {
  return (
    <Dialog open={Boolean(id)} onOpenChange={onOpenChange} side="right" size="xl" title="Panitia">
      {id && <DetailPanitiaIsi id={id} onPilih={onPilih} onTertutup={() => onOpenChange(false)} />}
    </Dialog>
  );
}

// ================================================================ Halaman unit
export interface KepanitiaanUnitProps {
  /** Unit pembentuk tetap (mis. fakultas aplikasi ini). Kosong = semua unit yang boleh dilihat. */
  unitId?: number | null;
  /** Hanya jenis panitia untuk jenis unit ini, mis. "fakultas". */
  jenisUnit?: string;
  judul?: React.ReactNode;
  deskripsi?: React.ReactNode;
  tabAwal?: StatusPanitia | 'semua';
  className?: string;
}

/**
 * Daftar panitia unit dengan tab status, cari, bentuk baru (panitia.kelola), dan panel detail untuk SK, anggota,
 * pengajuan hak akses ke Pustikom, pembubaran, dan salin. Dipakai dasbor fakultas, dasbor pimpinan, BAAK, dan unit lain.
 */
export function KepanitiaanUnit({ unitId, jenisUnit, judul = 'Kepanitiaan', deskripsi, tabAwal = 'aktif', className }: KepanitiaanUnitProps) {
  const hak = useHakPanitia();
  const [tab, setTab] = React.useState<StatusPanitia | 'semua'>(tabAwal);
  const [q, setQ] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pilih, setPilih] = React.useState<string | null>(null);
  const boleh = hak.data?.boleh;
  const filter: FilterPanitia = { status: tab === 'semua' ? undefined : tab, unit_id: unitId ?? undefined, q: q.trim() || undefined, page, per_page: 25 };
  const daftar = useDaftarPanitia(filter, { enabled: Boolean(boleh?.lihat) });
  const draf = useDaftarPanitia({ status: 'draf', unit_id: unitId ?? undefined, per_page: 1 }, { enabled: Boolean(boleh?.lihat) });
  const kolom: DataColumn<Panitia>[] = [
    {
      key: 'nama',
      header: 'Panitia',
      cell: (p) => (
        <div className="u-panitia-sel-nama">
          <strong>{p.nama}</strong>
          <span>{[p.jenis.nama, !unitId && (p.unit.singkatan ?? p.unit.nama)].filter(Boolean).join(' · ')}</span>
        </div>
      ),
      value: (p) => p.nama,
      mobile: 'title',
    },
    { key: 'sk', header: 'SK', cell: (p) => p.nomor_sk ?? <span className="u-panitia-redup">Belum ada</span>, value: (p) => p.nomor_sk ?? '' },
    {
      key: 'masa',
      header: 'Berlaku',
      cell: (p) => (
        <div className="u-panitia-sel-nama">
          <span className="u-panitia-masa">{masaPanitia(p)}</span>
          {sisaTeks(p) && <span>{sisaTeks(p)}</span>}
        </div>
      ),
      value: (p) => p.mulai,
    },
    { key: 'anggota', header: 'Anggota', align: 'end', cell: (p) => p.jumlah_anggota, value: (p) => p.jumlah_anggota },
    {
      key: 'akses',
      header: 'Hak akses',
      cell: (p) =>
        p.status === 'draf' ? (
          <span className="u-panitia-redup">Belum diajukan</span>
        ) : (
          <span className="u-panitia-akses-ringkas">
            {p.akses_disetujui > 0 && <Badge variant="success">{p.akses_disetujui} aktif</Badge>}
            {p.akses_menunggu > 0 && <Badge variant="warning">{p.akses_menunggu} menunggu</Badge>}
            {p.akses_ditolak > 0 && <Badge variant="danger">{p.akses_ditolak} ditolak</Badge>}
            {!p.akses_disetujui && !p.akses_menunggu && !p.akses_ditolak && <span className="u-panitia-redup">—</span>}
          </span>
        ),
      value: (p) => p.akses_disetujui,
    },
    { key: 'status', header: 'Status', shrink: true, cell: (p) => <StatusPanitiaBadge status={p.status} />, value: (p) => p.status, mobile: 'badge' },
  ];
  if (hak.error) return <GalatApi error={hak.error} onRetry={hak.refetch} />;
  if (hak.data && !boleh?.lihat)
    return <Empty icon={<UsersRound />} title="Belum punya akses kepanitiaan" description="Kepanitiaan unit dikelola pimpinan unit atau pengelola panitia yang ditunjuk Pustikom." />;
  return (
    <div className={cn('u-panitia-kelola', className)}>
      <div className="u-panitia-kepala">
        <div>
          <h2>{judul}</h2>
          <p>{deskripsi ?? 'Panitia yang dibentuk berdasarkan SK beserta anggotanya. Hak akses tiap jabatan diajukan ke Pustikom dan berakhir bersama SK.'}</p>
        </div>
        {boleh?.kelola && (
          <FormPanitia
            unitId={unitId}
            jenisUnit={jenisUnit}
            onTersimpan={(p) => setPilih(p.id)}
            trigger={
              <Button>
                <Plus /> Bentuk panitia
              </Button>
            }
          />
        )}
      </div>
      <DataTable
        columns={kolom}
        rows={daftar.data}
        rowKey={(p) => p.id}
        loading={daftar.loading || hak.loading}
        error={daftar.error}
        onRetry={daftar.refetch}
        page={page}
        perPage={25}
        total={daftar.meta?.total ?? undefined}
        onPageChange={setPage}
        onRowClick={(p) => setPilih(p.id)}
        exportCsv="kepanitiaan"
        toolbar={
          <div className="u-panitia-toolbar">
            <Tabs
              variant="pill"
              value={tab}
              onValueChange={(v) => {
                setTab(v);
                setPage(1);
              }}
              items={[
                { value: 'aktif', label: 'Aktif' },
                { value: 'draf', label: 'Draf', count: draf.meta?.total || undefined },
                { value: 'selesai', label: 'Selesai' },
                { value: 'dibubarkan', label: 'Dibubarkan' },
                { value: 'semua', label: 'Semua' },
              ]}
            />
            <InputGroup start={<Search />} size="sm" className="u-panitia-cari">
              <Input
                size="sm"
                value={q}
                placeholder="Cari nama atau nomor SK"
                aria-label="Cari panitia"
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </InputGroup>
          </div>
        }
        empty={{
          icon: <UsersRound />,
          title: tab === 'draf' ? 'Tidak ada draf' : 'Belum ada panitia',
          description: boleh?.kelola ? 'Bentuk panitia, lampirkan SK, isi anggota, lalu ajukan hak aksesnya ke Pustikom.' : undefined,
        }}
      />
      <PanelPanitia id={pilih} onOpenChange={(o) => !o && setPilih(null)} onPilih={setPilih} />
    </div>
  );
}

// ================================================================ Keanggotaan saya
/** Panitia tempat pengguna menjadi anggota, jabatannya, dan aplikasi yang terbuka (untuk beranda/profil). */
export function KepanitiaanSaya({ judul = 'Kepanitiaan saya', className }: { judul?: React.ReactNode; className?: string }) {
  const hak = useHakPanitia();
  if (hak.error) return <GalatApi error={hak.error} onRetry={hak.refetch} />;
  if (!hak.data) return <Skeleton style={{ height: 160 }} />;
  const list = hak.data.keanggotaan;
  return (
    <section className={cn('u-panitia-saya', className)}>
      <h3>{judul}</h3>
      {!list.length ? (
        <Empty icon={<UsersRound />} title="Belum tercatat di panitia" description="Panitia ber-SK yang menunjuk Anda tampil di sini beserta hak aksesnya." />
      ) : (
        <ul className="u-panitia-saya-daftar">
          {list.map((k) => (
            <li key={`${k.panitia.id}-${k.jabatan}`}>
              <Card>
                <CardContent>
                  <div className="u-panitia-saya-kepala">
                    <div>
                      <strong>{k.panitia.nama}</strong>
                      <span className="u-panitia-redup">
                        {k.jabatan}
                        {k.uraian && ` · ${k.uraian}`} · {k.panitia.unit}
                      </span>
                    </div>
                    <StatusPanitiaBadge status={k.panitia.status} />
                  </div>
                  <p className="u-panitia-redup u-panitia-masa-saya">
                    <CalendarRange aria-hidden /> {masaPanitia(k.panitia)}
                    {k.panitia.nomor_sk && ` · SK ${k.panitia.nomor_sk}`}
                  </p>
                  {k.akses.length > 0 && (
                    <ul className="u-panitia-akses-daftar">
                      {k.akses.map((x) => (
                        <li key={x.id}>
                          <span className="u-panitia-akses-peran">
                            <KeyRound aria-hidden /> {x.peran.nama}
                          </span>
                          <StatusAksesPanitiaBadge status={x.status} />
                          {x.status === 'disetujui' && <DeretAplikasiPanitia aplikasi={x.aplikasi} kosong={null} />}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ================================================================ Persetujuan Pustikom
export interface PersetujuanAksesPanitiaProps {
  judul?: React.ReactNode;
  deskripsi?: React.ReactNode;
  className?: string;
}

/**
 * Layar Pustikom untuk hak akses panitia: ringkasan, pengajuan menunggu dikelompokkan per panitia (lihat SK, setujui
 * semua, setujui/tolak per baris, pilih banyak), dan riwayat keputusan dengan cabut akses. Izin panitia.setujui.
 */
export function PersetujuanAksesPanitia({ judul = 'Hak akses panitia', deskripsi, className }: PersetujuanAksesPanitiaProps) {
  const hak = useHakPanitia();
  const siakad = useSiakad();
  const toast = useToast();
  const boleh = Boolean(hak.data?.boleh.setujui);
  const ring = useRingkasanAksesPanitia({ enabled: boleh });
  const [tab, setTab] = React.useState<StatusAksesPanitia | 'semua'>('diajukan');
  const [q, setQ] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pilihan, setPilihan] = React.useState<string[]>([]);
  const [putus, setPutus] = React.useState<{ keputusan: 'setujui' | 'tolak'; akses: Array<{ id: string }> } | null>(null);
  const [cabut, setCabut] = React.useState<AntreanAksesPanitia | null>(null);
  const [panel, setPanel] = React.useState<string | null>(null);
  const daftar = useAntreanAksesPanitia({ status: tab, q: q.trim() || undefined, page, per_page: 50 });
  const r = ring.data;
  const items: ItemStatistik[] = [
    { label: 'Menunggu persetujuan', nilai: r?.menunggu, format: 'angka', ikon: <Hourglass />, nada: r?.menunggu ? 'warning' : undefined, keterangan: r ? `${r.panitia_menunggu} panitia` : undefined },
    { label: 'Panitia aktif', nilai: r?.aktif, format: 'angka', ikon: <UsersRound /> },
    { label: 'Hak akses aktif', nilai: r?.akses_aktif, format: 'angka', ikon: <ShieldCheck /> },
    { label: 'Berakhir 7 hari lagi', nilai: r?.berakhir_7_hari, format: 'angka', ikon: <CalendarRange /> },
  ];
  const kolom: DataColumn<AntreanAksesPanitia>[] = [
    {
      key: 'anggota',
      header: 'Anggota',
      cell: (x) => (
        <div className="u-panitia-sel-nama">
          <strong>{x.anggota.nama}</strong>
          <span>{[x.anggota.username, x.anggota.jabatan, x.anggota.uraian].filter(Boolean).join(' · ')}</span>
        </div>
      ),
      value: (x) => x.anggota.nama,
      mobile: 'title',
    },
    {
      key: 'peran',
      header: 'Peran diajukan',
      cell: (x) => (
        <div className="u-panitia-sel-nama">
          <span className="u-panitia-akses-peran">
            <KeyRound aria-hidden /> {x.peran.nama}
          </span>
          <span>{x.peran.lingkup === 'unit' ? `Hanya di ${x.panitia.unit}` : 'Semua unit'}</span>
        </div>
      ),
      value: (x) => x.peran.nama ?? '',
    },
    { key: 'aplikasi', header: 'Aplikasi', cell: (x) => <DeretAplikasiPanitia aplikasi={x.aplikasi} kosong="—" />, value: (x) => x.aplikasi.map((a) => a.nama).join(', ') },
    {
      key: 'panitia',
      header: 'Panitia dan SK',
      cell: (x) => (
        <div className="u-panitia-sel-nama">
          <button type="button" className="u-panitia-tautan" onClick={(e) => (e.stopPropagation(), setPanel(x.panitia.id))}>
            {x.panitia.nama}
          </button>
          <span>{[x.panitia.nomor_sk ? `SK ${x.panitia.nomor_sk}` : 'Tanpa SK', x.panitia.unit].join(' · ')}</span>
        </div>
      ),
      value: (x) => x.panitia.nama,
    },
    { key: 'masa', header: 'Berlaku', cell: (x) => <span className="u-panitia-masa">{masaPanitia(x.panitia)}</span>, value: (x) => x.panitia.mulai },
    {
      key: 'status',
      header: 'Status',
      shrink: true,
      cell: (x) => (
        <div className="u-panitia-sel-nama">
          <StatusAksesPanitiaBadge status={x.status} />
          {x.diputuskan_oleh && <span>{x.diputuskan_oleh}</span>}
        </div>
      ),
      value: (x) => x.status,
      mobile: 'badge',
    },
  ];
  if (hak.error) return <GalatApi error={hak.error} onRetry={hak.refetch} />;
  if (hak.data && !boleh) return <Empty icon={<ShieldCheck />} title="Khusus Pustikom" description="Persetujuan hak akses panitia memerlukan izin panitia.setujui." />;
  return (
    <div className={cn('u-panitia-kelola', className)}>
      <div className="u-panitia-kepala">
        <div>
          <h2>{judul}</h2>
          <p>{deskripsi ?? 'Peran yang diajukan unit untuk anggota panitia ber-SK. Setujui setelah memeriksa SK dan anggotanya; peran berakhir otomatis bersama masa SK.'}</p>
        </div>
      </div>
      <StatistikRingkas items={items} loading={ring.loading} />
      <DataTable
        columns={kolom}
        rows={daftar.data}
        rowKey={(x) => x.id}
        loading={daftar.loading}
        error={daftar.error}
        onRetry={daftar.refetch}
        page={page}
        perPage={50}
        total={daftar.meta?.total ?? undefined}
        onPageChange={setPage}
        selectable={tab === 'diajukan'}
        selected={pilihan}
        onSelectedChange={setPilihan}
        bulkActions={(keys, clear) => (
          <>
            <Button size="sm" variant="outline" onClick={() => (setPutus({ keputusan: 'tolak', akses: keys.map((id) => ({ id })) }), clear())}>
              <X /> Tolak
            </Button>
            <Button size="sm" onClick={() => (setPutus({ keputusan: 'setujui', akses: keys.map((id) => ({ id })) }), clear())}>
              <CircleCheck /> Setujui {keys.length}
            </Button>
          </>
        )}
        rowActions={(x) => [
          ...(x.status === 'diajukan'
            ? [
                { label: 'Setujui', icon: <CircleCheck />, onSelect: () => setPutus({ keputusan: 'setujui', akses: [x] }) } as MenuEntry,
                { label: 'Tolak', icon: <X />, onSelect: () => setPutus({ keputusan: 'tolak', akses: [x] }) } as MenuEntry,
              ]
            : []),
          ...(x.status === 'disetujui' ? [{ label: 'Cabut hak akses', icon: <UserMinus />, destructive: true, onSelect: () => setCabut(x) } as MenuEntry] : []),
          ...(x.panitia.ada_sk
            ? [
                {
                  label: 'Unduh SK',
                  icon: <Download />,
                  onSelect: () => unduhSkPanitia(siakad, x.panitia).catch((e) => toast.add({ title: 'Gagal mengunduh SK', description: pesanGalat(e), type: 'error' })),
                } as MenuEntry,
              ]
            : []),
          { label: 'Buka panitia', icon: <UsersRound />, onSelect: () => setPanel(x.panitia.id) },
        ]}
        onRowClick={(x) => setPanel(x.panitia.id)}
        exportCsv="hak-akses-panitia"
        toolbar={
          <div className="u-panitia-toolbar">
            <Tabs
              variant="pill"
              value={tab}
              onValueChange={(v) => {
                setTab(v);
                setPage(1);
                setPilihan([]);
              }}
              items={[
                { value: 'diajukan', label: 'Menunggu', count: r?.menunggu || undefined },
                { value: 'disetujui', label: 'Aktif' },
                { value: 'ditolak', label: 'Ditolak' },
                { value: 'dicabut', label: 'Dicabut' },
                { value: 'berakhir', label: 'Berakhir' },
                { value: 'semua', label: 'Semua' },
              ]}
            />
            <InputGroup start={<Search />} size="sm" className="u-panitia-cari">
              <Input
                size="sm"
                value={q}
                placeholder="Cari panitia, anggota, nomor SK"
                aria-label="Cari"
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </InputGroup>
          </div>
        }
        empty={{ icon: <ShieldCheck />, title: tab === 'diajukan' ? 'Tidak ada pengajuan yang menunggu' : 'Belum ada data' }}
      />
      <DialogKeputusanAkses data={putus} onOpenChange={(o) => !o && setPutus(null)} />
      <ConfirmDialog
        open={Boolean(cabut)}
        onOpenChange={(o) => !o && setCabut(null)}
        title={`Cabut ${cabut?.peran.nama ?? ''} dari ${cabut?.anggota.nama ?? ''}?`}
        description="Penugasan perannya berakhir hari ini. Panitia dan anggotanya tetap tercatat."
        confirmLabel="Cabut hak akses"
        tone="danger"
        onConfirm={async () => {
          if (!cabut) return;
          await siakad.request({ method: 'POST', path: `/v1/panitia/akses/${cabut.id}/cabut`, body: {} });
          invalidateSiakad('panitia');
          toast.add({ title: 'Hak akses dicabut', type: 'success' });
        }}
      />
      <PanelPanitia id={panel} onOpenChange={(o) => !o && setPanel(null)} onPilih={setPanel} />
    </div>
  );
}

// ================================================================ Jenis panitia (Pustikom)
const JENIS_UNIT_OPSI = [
  { value: 'universitas', label: 'Universitas' },
  { value: 'fakultas', label: 'Fakultas' },
  { value: 'prodi', label: 'Prodi' },
  { value: 'biro', label: 'Biro' },
  { value: 'lembaga', label: 'Lembaga' },
  { value: 'upt', label: 'UPT' },
  { value: 'bagian', label: 'Bagian' },
];

interface IsiJabatan {
  kunci: number;
  id?: number;
  kode: string;
  nama: string;
  wajib: boolean;
  maks: string;
  peran: string[];
}

/** Tambah/ubah jenis panitia (POST /v1/panitia/jenis): jenis unit, SK, batas masa, jabatan dan perannya. */
export function FormJenisPanitia({ jenis, trigger, open, onOpenChange }: { jenis?: JenisPanitia; trigger?: React.ReactElement; open?: boolean; onOpenChange?: (o: boolean) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [inner, setInner] = React.useState(false);
  const isOpen = open ?? inner;
  const peran = usePeranPilihanPanitia({ enabled: isOpen });
  const kunci = React.useRef(1);
  const awal = React.useMemo(
    () => ({
      kode: jenis?.kode ?? '',
      nama: jenis?.nama ?? '',
      keterangan: jenis?.keterangan ?? '',
      jenis_unit: jenis?.jenis_unit ?? [],
      wajib_sk: jenis?.wajib_sk ?? true,
      masa_maks_hari: jenis?.masa_maks_hari != null ? String(jenis.masa_maks_hari) : '',
      aktif: jenis?.aktif ?? true,
      jabatan: (jenis?.jabatan ?? [
        { id: 0, kode: 'ketua', nama: 'Ketua', wajib: true, maks: 1, peran: [] as PeranPanitia[] },
        { id: 0, kode: 'anggota', nama: 'Anggota', wajib: false, maks: null, peran: [] as PeranPanitia[] },
      ]).map((j) => ({ kunci: 0, id: j.id || undefined, kode: j.kode, nama: j.nama, wajib: j.wajib, maks: j.maks != null ? String(j.maks) : '', peran: j.peran.map((p) => p.kode) })),
    }),
    [jenis],
  );
  const [isi, setIsi] = React.useState(awal);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (isOpen) {
      setIsi({ ...awal, jabatan: awal.jabatan.map((j) => ({ ...j, kunci: kunci.current++ })) });
      setGalat({});
    }
  }, [isOpen, awal]);
  const ubahJabatan = (k: number, patch: Partial<IsiJabatan>) => setIsi((x) => ({ ...x, jabatan: x.jabatan.map((j) => (j.kunci === k ? { ...j, ...patch } : j)) }));
  const peranOpsi = (peran.data ?? []).map((p) => ({ value: p.kode, label: p.nama, description: [p.lingkup === 'unit' ? `unit ${p.jenis_unit ?? ''}`.trim() : 'global', (p.aplikasi ?? []).map((a) => a.nama).join(', ')].filter(Boolean).join(' · ') }));
  const namaPeran = (k: string) => peran.data?.find((p) => p.kode === k)?.nama ?? k;
  return (
    <PanelForm
      open={isOpen}
      onOpenChange={(o) => {
        setInner(o);
        onOpenChange?.(o);
      }}
      trigger={trigger}
      size="lg"
      title={jenis ? `Ubah ${jenis.nama}` : 'Jenis panitia baru'}
      description="Perubahan peran berlaku untuk pengajuan berikutnya. Akses yang sudah disetujui tidak berubah."
      berubah={JSON.stringify({ ...isi, jabatan: isi.jabatan.map(({ kunci: _k, ...j }) => j) }) !== JSON.stringify({ ...awal, jabatan: awal.jabatan.map(({ kunci: _k, ...j }) => j) })}
      onSimpan={async () => {
        const body = {
          kode: isi.kode.trim(),
          nama: isi.nama.trim(),
          keterangan: isi.keterangan.trim() || null,
          jenis_unit: isi.jenis_unit,
          wajib_sk: isi.wajib_sk,
          masa_maks_hari: isi.masa_maks_hari ? Number(isi.masa_maks_hari) : null,
          aktif: isi.aktif,
          jabatan: isi.jabatan.map((j) => ({ id: j.id, kode: j.kode.trim(), nama: j.nama.trim(), wajib: j.wajib, maks: j.maks ? Number(j.maks) : null, peran: j.peran })),
        };
        try {
          await siakad.request({ method: 'POST', path: jenis ? `/v1/panitia/jenis/${jenis.id}` : '/v1/panitia/jenis', body });
        } catch (e) {
          return galatIsian(e, setGalat);
        }
        invalidateSiakad('panitia');
        toast.add({ title: jenis ? 'Jenis panitia diperbarui' : 'Jenis panitia ditambahkan', type: 'success' });
      }}
    >
      <BagianForm judul="Jenis" kolom={2}>
        <Field label="Nama" required error={galat.nama || undefined} className="u-form-lebar">
          <Input value={isi.nama} maxLength={150} placeholder="mis. Panitia dies natalis" onChange={(e) => setIsi((x) => ({ ...x, nama: e.target.value }))} />
        </Field>
        <Field label="Kode" required error={galat.kode || undefined} description="Huruf kecil, mis. dies-natalis.">
          <Input value={isi.kode} maxLength={40} disabled={Boolean(jenis?.sistem)} onChange={(e) => setIsi((x) => ({ ...x, kode: e.target.value.toLowerCase().replace(/[^a-z0-9\-_]/g, '') }))} />
        </Field>
        <Field label="Batas masa (hari)" optional error={galat.masa_maks_hari || undefined}>
          <Input value={isi.masa_maks_hari} inputMode="numeric" maxLength={4} onChange={(e) => setIsi((x) => ({ ...x, masa_maks_hari: e.target.value.replace(/[^\d]/g, '') }))} />
        </Field>
        <Field label="Dibentuk oleh unit" className="u-form-lebar" description="Kosong = semua jenis unit.">
          <div className="u-panitia-pilih-unit">
            {JENIS_UNIT_OPSI.map((o) => (
              <label key={o.value}>
                <Checkbox
                  checked={isi.jenis_unit.includes(o.value)}
                  onCheckedChange={(c) => setIsi((x) => ({ ...x, jenis_unit: c ? [...x.jenis_unit, o.value] : x.jenis_unit.filter((v) => v !== o.value) }))}
                />
                {o.label}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Keterangan" optional className="u-form-lebar">
          <Textarea value={isi.keterangan} rows={2} maxLength={255} onChange={(e) => setIsi((x) => ({ ...x, keterangan: e.target.value }))} />
        </Field>
        <div className="u-panitia-pilih-unit u-form-lebar">
          <label>
            <Checkbox checked={isi.wajib_sk} onCheckedChange={(c) => setIsi((x) => ({ ...x, wajib_sk: Boolean(c) }))} /> SK wajib dilampirkan sebelum diajukan
          </label>
          <label>
            <Checkbox checked={isi.aktif} onCheckedChange={(c) => setIsi((x) => ({ ...x, aktif: Boolean(c) }))} /> Aktif (bisa dipilih unit)
          </label>
        </div>
      </BagianForm>
      <BagianForm judul="Jabatan dan peran" kolom={1} keterangan="Peran admin (hak akses, masuk sebagai, persetujuan panitia) tidak bisa diberikan lewat panitia." aksi={
        <Button variant="outline" size="sm" onClick={() => setIsi((x) => ({ ...x, jabatan: [...x.jabatan, { kunci: kunci.current++, id: undefined, kode: '', nama: '', wajib: false, maks: '', peran: [] }] }))}>
          <Plus /> Jabatan
        </Button>
      }>
        {galat.jabatan && <Alert variant="danger">{galat.jabatan}</Alert>}
        {peran.error && <GalatApi error={peran.error} onRetry={peran.refetch} />}
        {isi.jabatan.map((j, i) => (
          <div key={j.kunci} className="u-panitia-jabatan-baris">
            <div className="u-panitia-jabatan-isian">
              <Field label="Jabatan" error={galat[`jabatan.${i}.nama`] || undefined}>
                <Input value={j.nama} maxLength={100} placeholder="mis. Ketua" onChange={(e) => ubahJabatan(j.kunci, { nama: e.target.value, kode: j.id ? j.kode : e.target.value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-_]/g, '') })} />
              </Field>
              <Field label="Kode" error={galat[`jabatan.${i}.kode`] || undefined}>
                <Input value={j.kode} maxLength={40} onChange={(e) => ubahJabatan(j.kunci, { kode: e.target.value.toLowerCase().replace(/[^a-z0-9\-_]/g, '') })} />
              </Field>
              <Field label="Maks." optional>
                <Input value={j.maks} inputMode="numeric" maxLength={3} onChange={(e) => ubahJabatan(j.kunci, { maks: e.target.value.replace(/[^\d]/g, '') })} />
              </Field>
              <label className="u-panitia-wajib">
                <Checkbox checked={j.wajib} onCheckedChange={(c) => ubahJabatan(j.kunci, { wajib: Boolean(c) })} /> Wajib
              </label>
              <Button variant="ghost" size="sm" iconOnly aria-label="Hapus jabatan" disabled={isi.jabatan.length === 1} onClick={() => setIsi((x) => ({ ...x, jabatan: x.jabatan.filter((y) => y.kunci !== j.kunci) }))}>
                <Trash2 />
              </Button>
            </div>
            <Field label="Peran yang diajukan" error={galat[`jabatan.${i}.peran`] || undefined}>
              <div className="u-panitia-peran-isian">
                {j.peran.map((k) => (
                  <span key={k} className="u-panitia-chip" data-nada="peran">
                    <KeyRound aria-hidden /> {namaPeran(k)}
                    <button type="button" aria-label={`Lepas ${namaPeran(k)}`} onClick={() => ubahJabatan(j.kunci, { peran: j.peran.filter((x) => x !== k) })}>
                      <X />
                    </button>
                  </span>
                ))}
                <Pilihan
                  options={peranOpsi.filter((o) => !j.peran.includes(o.value))}
                  value={null}
                  tampilan="cari"
                  size="sm"
                  placeholder={j.peran.length ? 'Tambah peran' : 'Pilih peran (kosong = tanpa hak akses)'}
                  onValueChange={(v) => v && ubahJabatan(j.kunci, { peran: [...j.peran, v] })}
                />
              </div>
            </Field>
          </div>
        ))}
      </BagianForm>
    </PanelForm>
  );
}

/** Daftar jenis panitia dengan jabatan, peran, dan aplikasinya; tambah/ubah/nonaktifkan (izin panitia.atur). */
export function PengaturanJenisPanitia({ judul = 'Jenis panitia', className }: { judul?: React.ReactNode; className?: string }) {
  const hak = useHakPanitia();
  const boleh = Boolean(hak.data?.boleh.atur);
  const q = useJenisPanitia(boleh);
  const siakad = useSiakad();
  const toast = useToast();
  const [ubah, setUbah] = React.useState<JenisPanitia | null>(null);
  const [hapus, setHapus] = React.useState<JenisPanitia | null>(null);
  if (hak.error) return <GalatApi error={hak.error} onRetry={hak.refetch} />;
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  return (
    <div className={cn('u-panitia-kelola', className)}>
      <div className="u-panitia-kepala">
        <div>
          <h2>{judul}</h2>
          <p>Jenis panitia yang bisa dibentuk unit, jabatan di dalamnya, dan peran yang diajukan untuk tiap jabatan. Aplikasi dihitung dari izin akses peran.</p>
        </div>
        {boleh && (
          <FormJenisPanitia
            trigger={
              <Button>
                <Plus /> Jenis panitia
              </Button>
            }
          />
        )}
      </div>
      {!q.data ? (
        <Skeleton style={{ height: 240 }} />
      ) : (
        <div className="u-panitia-jenis-grid">
          {q.data.map((j) => (
            <Card key={j.id} className="u-panitia-jenis" data-aktif={j.aktif}>
              <CardContent>
                <div className="u-panitia-saya-kepala">
                  <div>
                    <strong>{j.nama}</strong>
                    <span className="u-panitia-redup">
                      {[j.jenis_unit.length ? j.jenis_unit.join(', ') : 'semua unit', j.wajib_sk ? 'wajib SK' : 'tanpa SK', j.masa_maks_hari && `maks. ${j.masa_maks_hari} hari`, `${j.jumlah_panitia} panitia`]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                  {boleh && (
                    <Menu
                      trigger={
                        <Button variant="ghost" size="sm" iconOnly aria-label="Aksi">
                          <MoreHorizontal />
                        </Button>
                      }
                      align="end"
                      items={[
                        { label: 'Ubah', icon: <Pencil />, onSelect: () => setUbah(j) },
                        { label: j.jumlah_panitia ? 'Nonaktifkan' : 'Hapus', icon: <Trash2 />, destructive: true, onSelect: () => setHapus(j) },
                      ]}
                    />
                  )}
                </div>
                {!j.aktif && <Badge variant="neutral">Nonaktif</Badge>}
                {j.keterangan && <p className="u-panitia-redup">{j.keterangan}</p>}
                <TabelJabatanPanitia jabatan={j.jabatan} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {ubah && <FormJenisPanitia jenis={ubah} open onOpenChange={(o) => !o && setUbah(null)} />}
      <ConfirmDialog
        open={Boolean(hapus)}
        onOpenChange={(o) => !o && setHapus(null)}
        title={hapus?.jumlah_panitia ? `Nonaktifkan ${hapus?.nama}?` : `Hapus ${hapus?.nama}?`}
        description={hapus?.jumlah_panitia ? 'Sudah dipakai panitia; jenis ini disembunyikan dari pilihan unit tanpa mengubah panitia yang ada.' : 'Jenis dan jabatannya dihapus.'}
        confirmLabel={hapus?.jumlah_panitia ? 'Nonaktifkan' : 'Hapus'}
        tone="danger"
        onConfirm={async () => {
          if (!hapus) return;
          await siakad.request({ method: 'POST', path: `/v1/panitia/jenis/${hapus.id}/hapus`, body: {} });
          invalidateSiakad('panitia');
          toast.add({ title: hapus.jumlah_panitia ? 'Jenis dinonaktifkan' : 'Jenis dihapus', type: 'success' });
        }}
      />
    </div>
  );
}
