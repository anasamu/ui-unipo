'use client';
import * as React from 'react';
import {
  Award,
  Banknote,
  CalendarClock,
  CheckCheck,
  CircleAlert,
  ClipboardCheck,
  Download,
  ExternalLink,
  FilePlus2,
  FileText,
  HandCoins,
  History,
  ListChecks,
  Megaphone,
  Pencil,
  Plus,
  Send,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Trophy,
  Users,
  Wand2,
  X,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton, type BadgeVariant } from '../components/actions';
import { Alert, Card, CardContent, CardHeader, DescriptionList, Empty, Tabs } from '../components/display';
import { StatCard, StatGrid } from '../components/charts';
import { DataTable, type DataColumn } from '../components/data-table';
import { Checkbox, Field, Input, Switch, Textarea } from '../components/forms';
import { Select, type SelectOption } from '../components/select';
import { ConfirmDialog, Sheet, useToast } from '../components/overlays';
import { IsianTanggal } from '../components/formulir';
import { DaftarSyarat, type ButirSyarat } from '../components/linimasa';
import { FormGrid, WizardReview } from '../components/wizard';
import { PanelLangkah } from '../components/panel-langkah';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { PilihProdi, PilihTahunAkademik } from './cari';
import { PilihBerkas } from './pilih-berkas';
import { AlurPemeriksa, LabelPemeriksa, type TahapPemeriksa } from './pemeriksa';

/*
 * Beasiswa (SIAKAD /v1/beasiswa, docs/KEMAHASISWAAN.md "Beasiswa"). Keputusan Anas 2026-11-19: beasiswa dikelola BAAK,
 * pengumuman umum lewat Humas, pencairan lewat Keuangan, dan Pustikom mengambil alih bila operator beasiswa BAAK belum ada.
 *
 *   KelolaBeasiswa        BAAK » Kemahasiswaan » Beasiswa dan Pustikom » Layanan » Beasiswa (halaman yang sama; spanduk
 *                         dan hak dari /v1/beasiswa/peran: baak, admin, ambil_alih, baca)
 *   BeasiswaSaya          Profil UNIPO » Beasiswa: program terbuka + syarat terpenuhi/belum, wizard pendaftaran, status
 *   KartuBeasiswaSaya     kartu ringkas di beranda Profil
 *   PublikasiBeasiswa     Humas » Beasiswa: sunting draf pengumuman program/penerima lalu terbitkan
 *   DaftarBeasiswaPublik  halaman publik daftar beasiswa (newsroom Humas)
 *   PencairanBeasiswa     BAUK » Keringanan & beasiswa » Pencairan beasiswa: potongan UKT dan pencairan tunai + bukti
 *
 * Semua formulir di panel samping; formulir program dan pendaftaran memakai wizard (PanelLangkah).
 */

const BASIS = '/v1/beasiswa';

// ================================================================ tipe
export interface IndikatorBeasiswa {
  kode: string;
  judul: string;
  tipe: 'angka' | 'rupiah' | 'pilihan';
  keterangan: string;
  operator: string[];
  opsi: { nilai: string; label: string }[] | null;
  isian: boolean;
}
export interface PeranBeasiswa {
  /** unit = operator berlingkup fakultas/prodi (penugasan peran operator-beasiswa di unit itu). */
  mode: 'baak' | 'admin' | 'ambil_alih' | 'baca' | 'aplikasi' | 'unit' | 'tidak';
  /** Program, seleksi, penetapan, evaluasi (operator tingkat universitas / Pustikom ambil alih). */
  boleh_kelola: boolean;
  /** Verifikasi/rekomendasi pendaftar (operator universitas atau unit untuk prodinya). */
  boleh_pendaftar: boolean;
  /** Prodi lingkup operator unit; null = semua prodi. */
  prodi: string[] | null;
  unit: string;
  diambil_alih: boolean;
  operator_ada: boolean;
  operator: { username: string; nama: string }[];
  pesan: string | null;
  indikator: IndikatorBeasiswa[];
  kriteria: { kode: string; judul: string }[];
}
export interface SyaratBeasiswa {
  indikator: string;
  op: string;
  nilai: number | string[];
  label?: string;
}
export interface BerkasBeasiswa {
  kode: string;
  nama: string;
  wajib: boolean;
  keterangan?: string;
}
export interface IsianBeasiswa {
  kode: string;
  label: string;
  tipe: 'teks' | 'panjang' | 'angka' | 'pilihan';
  wajib: boolean;
  opsi: string[];
}
export interface ProgramBeasiswa {
  id: number;
  kode: string;
  nama: string;
  jenis: string;
  penyelenggara: string | null;
  tahun_id: string;
  tahun_nama: string | null;
  kode_prodi: string | null;
  nominal: number | null;
  periode_pencairan: string;
  kuota: number | null;
  daftar_mulai: string | null;
  daftar_selesai: string | null;
  status: 'draf' | 'buka' | 'seleksi' | 'berjalan' | 'selesai';
  keterangan: string | null;
  sumber_dana: 'internal' | 'pemerintah' | 'swasta';
  bentuk: 'potongan_ukt' | 'tunai';
  kuota_prodi: { kode_prodi: string; kuota: number }[];
  pengumuman_tanggal: string | null;
  syarat: SyaratBeasiswa[];
  berkas: BerkasBeasiswa[];
  isian: IsianBeasiswa[];
  bobot: Record<string, number>;
  wawancara: boolean;
  tahap_fakultas: boolean;
  buka_at: string | null;
  tutup_at: string | null;
  evaluasi: { ipk_minimal: number | null; tindakan: 'peringatan' | 'cabut'; wajib_aktif: boolean };
  nomor_sk: string | null;
  tanggal_sk: string | null;
  skema_potongan_id: number | null;
  dibuka: boolean;
  rekap?: Record<string, number>;
  prodi_sasaran?: { kode_prodi: string; nama: string }[] | null;
  publikasi?: { id: number; jenis: string; judul: string; status: string; konten_id: number | null; diterbitkan_oleh: string | null; diterbitkan_at: string | null }[];
  riwayat?: RiwayatBeasiswa[];
}
export interface RiwayatBeasiswa {
  id: number;
  aksi: string;
  ringkasan: string | null;
  unit: string;
  diambil_alih: boolean;
  pelaku: string | null;
  nim?: string | null;
  created_at: string;
}
export interface PendaftarBeasiswa {
  id: number;
  nim: string;
  nama: string | null;
  kode_prodi: string;
  prodi: string;
  ipk: number | null;
  semester: number | null;
  penghasilan_ortu: number | null;
  alasan: string | null;
  skor: number | null;
  skor_rincian: Record<string, { nilai: number; bobot: number }> | null;
  peringkat: number | null;
  status: 'diajukan' | 'diverifikasi' | 'diterima' | 'ditolak' | 'dicabut';
  catatan: string | null;
  memenuhi: boolean | null;
  hasil_syarat: (ButirSyarat & { kode: string })[] | null;
  isian: Record<string, string>;
  berkas: { kode: string; nama: string; wajib: boolean; uuid: string | null; nama_berkas: string | null; status: string; catatan: string | null }[];
  berkas_lengkap: boolean;
  wawancara: { jadwal: string | null; tempat: string | null; nilai: number | null; catatan: string | null };
  verifikasi_oleh: string | null;
  verifikasi_at: string | null;
  nomor_penerima: string | null;
  rekomendasi: { hasil: 'direkomendasikan' | 'tidak_direkomendasikan'; catatan: string | null; oleh: string | null; waktu: string | null } | null;
  created_at: string;
  pemeriksa: TahapPemeriksa[];
}

// ================================================================ bantu
const q = <T,>(path: string) => (s: ReturnType<typeof useSiakad>, signal: AbortSignal) => s.request<T>({ method: 'GET', path }, { signal });
const tgl = (s?: string | null) => (s ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s.length <= 10 ? `${s}T00:00:00` : s.replace(' ', 'T'))) : '-');
const tglJam = (s?: string | null) => (s ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(s.replace(' ', 'T'))) : '-');
const rp = (n?: number | null) => (n == null ? '-' : `Rp${Number(n).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`);
const angka = (n?: number | null, d = 2) => (n == null ? '-' : Number(n).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }));
const kosongKeNull = (s: string) => (s.trim() === '' ? null : Number(s.replace(/\./g, '').replace(',', '.')));

export const JENIS_BEASISWA: SelectOption<string>[] = [
  { value: 'kip_kuliah', label: 'KIP Kuliah' },
  { value: 'prestasi', label: 'Prestasi' },
  { value: 'ekonomi', label: 'Bantuan ekonomi' },
  { value: 'yayasan', label: 'Yayasan' },
  { value: 'pemerintah_daerah', label: 'Pemerintah daerah' },
  { value: 'swasta', label: 'Swasta/mitra' },
  { value: 'lainnya', label: 'Lainnya' },
];
const SUMBER_DANA: SelectOption<string>[] = [
  { value: 'internal', label: 'Internal universitas', description: 'Dana universitas/yayasan' },
  { value: 'pemerintah', label: 'Pemerintah', description: 'Mis. KIP Kuliah, pemda' },
  { value: 'swasta', label: 'Swasta/mitra', description: 'Perusahaan, lembaga, alumni' },
];
const BENTUK: SelectOption<string>[] = [
  { value: 'potongan_ukt', label: 'Potongan UKT', description: 'Memotong tagihan UKT penerima (BAUK)' },
  { value: 'tunai', label: 'Bantuan tunai', description: 'Dicairkan BAUK ke rekening/tunai dengan bukti' },
];
const PERIODE_CAIR: SelectOption<string>[] = [
  { value: 'sekali', label: 'Sekali' },
  { value: 'semester', label: 'Per semester' },
  { value: 'bulanan', label: 'Per bulan' },
  { value: 'tahunan', label: 'Per tahun' },
];
const OP_LABEL: Record<string, string> = { '>=': 'minimal (≥)', '>': 'lebih dari (>)', '<=': 'paling banyak (≤)', '<': 'kurang dari (<)', '=': 'sama dengan (=)', dalam: 'salah satu dari', bukan_dalam: 'bukan' };
const STATUS_PROGRAM: Record<string, [string, BadgeVariant]> = {
  draf: ['Draf', 'neutral'],
  buka: ['Pendaftaran dibuka', 'success'],
  seleksi: ['Seleksi', 'warning'],
  berjalan: ['Berjalan', 'primary'],
  selesai: ['Selesai', 'neutral'],
};
const STATUS_PENDAFTAR: Record<string, [string, BadgeVariant]> = {
  diajukan: ['Menunggu verifikasi', 'warning'],
  diverifikasi: ['Berkas terverifikasi', 'info'],
  diterima: ['Penerima', 'success'],
  ditolak: ['Tidak diterima', 'danger'],
  dicabut: ['Dicabut', 'danger'],
};
const UNIT_LABEL: Record<string, string> = { BAAK: 'BAAK', PUSTIKOM: 'Pustikom', HUMAS: 'Humas', BAUK: 'BAUK', MAHASISWA: 'Mahasiswa', ADMIN: 'Administrator', SISTEM: 'Sistem' };

export function LencanaStatusProgram({ status }: { status: string }) {
  const [l, v] = STATUS_PROGRAM[status] ?? [status, 'neutral'];
  return <Badge variant={v}>{l}</Badge>;
}
export function LencanaStatusPendaftar({ status }: { status: string }) {
  const [l, v] = STATUS_PENDAFTAR[status] ?? [status, 'neutral'];
  return <Badge variant={v}>{l}</Badge>;
}

function useAksiBeasiswa() {
  const s = useSiakad();
  const toast = useToast();
  return React.useCallback(
    async <T,>(path: string, body?: unknown, sukses?: string): Promise<T> => {
      try {
        const r = await s.request<T>({ method: 'POST', path, body: body ?? {} });
        if (sukses) toast.add({ title: sukses, type: 'success' });
        invalidateSiakad('beasiswa');
        return r.data;
      } catch (e) {
        toast.add({ title: 'Belum berhasil', description: galat(e), type: 'error' });
        throw e;
      }
    },
    [s, toast],
  );
}

/** Pesan galat API apa adanya untuk 403/409/422 (alasan bisnis), selebihnya pesanGalat. */
function galat(e: unknown): string {
  const err = e as { status?: number; code?: string; message?: string; details?: Record<string, unknown> } | null;
  if (err && (err.status === 403 || err.status === 409 || err.status === 423 || err.code === 'di_luar_jadwal') && err.message) return err.message;
  if (err?.status === 422 && err.details) {
    const d = Object.values(err.details).filter((v) => typeof v === 'string');
    if (d.length) return d.join('; ');
  }
  return pesanGalat(e);
}

async function unduhBerkas(s: ReturnType<typeof useSiakad>, path: string, nama: string, buka = true) {
  const r = await s.request<unknown>({ method: 'GET', path });
  const d = r.data as { blob?: () => Blob } | Blob | null;
  const blob = d instanceof Blob ? d : d && typeof (d as { blob?: () => Blob }).blob === 'function' ? (d as { blob: () => Blob }).blob() : null;
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  if (buka) {
    window.open(url, '_blank', 'noopener');
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = nama;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ================================================================ peran & spanduk
export function usePeranBeasiswa() {
  return useSiakadQuery<PeranBeasiswa>(['beasiswa', 'peran'], q(`${BASIS}/peran`), { staleTime: 60_000 });
}

/** Spanduk siapa yang mengelola: Pustikom mengambil alih (operator BAAK belum ada) atau hanya baca. */
export function SpandukPeranBeasiswa({ peran, className }: { peran: PeranBeasiswa | undefined; className?: string }) {
  if (!peran) return null;
  if (peran.mode === 'ambil_alih') {
    return (
      <Alert variant="warning" icon={<ShieldAlert />} title="Operator BAAK belum ada — Pustikom mengambil alih" className={className}>
        Belum ada pengguna aktif dengan izin operator beasiswa BAAK (beasiswa.kelola). Pustikom mengelola beasiswa sementara dengan halaman yang sama;
        setiap aksi tercatat sebagai &ldquo;diambil alih Pustikom&rdquo;. Tetapkan operator di Pustikom » Penugasan peran (peran Operator beasiswa di unit universitas, atau Staf kemahasiswaan) agar BAAK kembali mengelola.
      </Alert>
    );
  }
  if (peran.mode === 'baca') {
    return (
      <Alert variant="info" title={peran.operator_ada ? 'Dikelola operator BAAK — Anda hanya dapat melihat' : 'Hanya lihat'} className={className}>
        {peran.pesan}
        {peran.operator_ada && peran.operator.length ? ` Operator: ${peran.operator.map((o) => o.nama).join(', ')}.` : ''}
      </Alert>
    );
  }
  if (peran.mode === 'unit') {
    return (
      <Alert variant="info" title="Operator beasiswa fakultas/prodi" className={className}>
        {peran.pesan}
      </Alert>
    );
  }
  if (peran.mode === 'tidak') {
    return (
      <Alert variant="danger" title="Tidak ada akses" className={className}>
        {peran.pesan}
      </Alert>
    );
  }
  return null;
}

// ================================================================ halaman kelola (BAAK & Pustikom)
type TabKelola = 'program' | 'pendaftar' | 'evaluasi' | 'laporan';

/** Halaman kelola beasiswa BAAK dan Pustikom (ambil alih): program, pendaftar & seleksi, evaluasi, laporan. */
export function KelolaBeasiswa({ className }: { className?: string }) {
  const peran = usePeranBeasiswa();
  const [tab, setTab] = React.useState<TabKelola>('program');
  const [program, setProgram] = React.useState<number | null>(null);
  if (peran.loading && !peran.data) return <Skeleton style={{ height: 420 }} />;
  if (peran.error) return <Alert variant="danger" title="Beasiswa belum bisa dimuat">{galat(peran.error)}</Alert>;
  const p = peran.data!;
  const lihatPendaftar = (id: number) => {
    setProgram(id);
    setTab('pendaftar');
  };
  return (
    <div className={cn('u-bsw', className)}>
      <SpandukPeranBeasiswa peran={p} />
      {p.mode !== 'tidak' && (
        <Tabs<TabKelola>
          value={tab}
          onValueChange={setTab}
          items={[
            { value: 'program', label: 'Program', icon: <HandCoins />, content: <TabProgram peran={p} onPendaftar={lihatPendaftar} /> },
            { value: 'pendaftar', label: 'Pendaftar & seleksi', icon: <Users />, content: <TabPendaftar peran={p} program={program} onProgram={setProgram} /> },
            ...(p.mode === 'unit' ? [] : [{ value: 'evaluasi' as const, label: 'Evaluasi penerima', icon: <ClipboardCheck />, content: <TabEvaluasi peran={p} program={program} onProgram={setProgram} /> }]),
            { value: 'laporan', label: p.mode === 'unit' ? 'Laporan penerima' : 'Laporan', icon: <FileText />, content: <TabLaporan /> },
          ]}
        />
      )}
    </div>
  );
}

function useDaftarProgram(status?: string) {
  return useSiakadQuery<ProgramBeasiswa[]>(['beasiswa', 'program', status ?? ''], q(`${BASIS}/program${status ? `?status=${status}` : ''}`));
}

function TabProgram({ peran, onPendaftar }: { peran: PeranBeasiswa; onPendaftar: (id: number) => void }) {
  const [status, setStatus] = React.useState<string>('');
  const daftar = useDaftarProgram(status || undefined);
  const [detail, setDetail] = React.useState<number | null>(null);
  const [baru, setBaru] = React.useState(false);
  const kolom: DataColumn<ProgramBeasiswa>[] = [
    {
      key: 'nama',
      header: 'Program',
      cell: (r) => (
        <span className="u-bsw-sel">
          <strong>{r.nama}</strong>
          <small>
            {r.kode} · {JENIS_BEASISWA.find((j) => j.value === r.jenis)?.label ?? r.jenis}
            {r.penyelenggara ? ` · ${r.penyelenggara}` : ''}
          </small>
        </span>
      ),
      value: (r) => r.nama,
      sortable: true,
    },
    { key: 'tahun_id', header: 'Periode', cell: (r) => r.tahun_nama ?? r.tahun_id, value: (r) => r.tahun_id, sortable: true },
    {
      key: 'bentuk',
      header: 'Bantuan',
      cell: (r) => (
        <span className="u-bsw-sel">
          <span>{r.bentuk === 'potongan_ukt' ? 'Potongan UKT' : 'Tunai'} {rp(r.nominal)}</span>
          <small>{SUMBER_DANA.find((x) => x.value === r.sumber_dana)?.label}</small>
        </span>
      ),
      value: (r) => r.nominal ?? 0,
    },
    { key: 'kuota', header: 'Kuota', align: 'end', cell: (r) => (r.kuota == null ? '-' : r.kuota), value: (r) => r.kuota ?? 0 },
    { key: 'jadwal', header: 'Pendaftaran', cell: (r) => `${tgl(r.daftar_mulai)} – ${tgl(r.daftar_selesai)}`, value: (r) => r.daftar_mulai ?? '' },
    {
      key: 'rekap',
      header: 'Pendaftar',
      align: 'end',
      cell: (r) => (
        <span className="u-bsw-sel" style={{ textAlign: 'end' }}>
          <strong>{r.rekap?.total ?? 0}</strong>
          <small>{r.rekap?.diterima ?? 0} penerima</small>
        </span>
      ),
      value: (r) => r.rekap?.total ?? 0,
    },
    { key: 'status', header: 'Status', shrink: true, cell: (r) => <LencanaStatusProgram status={r.status} />, value: (r) => r.status },
  ];
  return (
    <>
      <DataTable
        columns={kolom}
        rows={daftar.data}
        rowKey={(r) => String(r.id)}
        loading={daftar.loading}
        error={daftar.error}
        onRetry={daftar.refetch}
        onRowClick={(r) => setDetail(r.id)}
        storageKey="beasiswa.program"
        toolbar={
          <Select
            aria-label="Saring status"
            value={status}
            onValueChange={(v) => setStatus(v ?? '')}
            options={[{ value: '', label: 'Semua status' }, ...Object.entries(STATUS_PROGRAM).map(([value, [label]]) => ({ value, label }))]}
          />
        }
        actions={
          peran.boleh_kelola ? (
            <Button onClick={() => setBaru(true)}>
              <Plus /> Program baru
            </Button>
          ) : undefined
        }
        empty={{ icon: <HandCoins />, title: 'Belum ada program beasiswa', description: peran.boleh_kelola ? 'Buat program, atur syarat dan formulirnya, lalu buka pendaftaran.' : 'Program dibuat oleh operator beasiswa BAAK.' }}
        rowActions={(r) => [{ label: 'Lihat pendaftar', icon: <Users />, onSelect: () => onPendaftar(r.id) }]}
      />
      {baru && <PanelProgramBeasiswa peran={peran} onOpenChange={(o) => !o && setBaru(false)} onSelesai={(id) => setDetail(id)} />}
      {detail !== null && <DetailProgramBeasiswa id={detail} peran={peran} onClose={() => setDetail(null)} onPendaftar={onPendaftar} />}
    </>
  );
}

// ---------------------------------------------------------------- wizard program
interface DraftSyarat {
  indikator: string | null;
  op: string;
  nilai: string;
  pilihan: string[];
}
interface DraftProgram {
  kode: string;
  nama: string;
  jenis: string | null;
  penyelenggara: string;
  sumber_dana: string;
  tahun_id: string | null;
  keterangan: string;
  bentuk: string;
  nominal: string;
  periode_pencairan: string;
  kuota: string;
  kuota_prodi: { kode_prodi: string | null; kuota: string }[];
  daftar_mulai: string;
  daftar_selesai: string;
  pengumuman_tanggal: string;
  syarat: DraftSyarat[];
  berkas: { kode?: string; nama: string; wajib: boolean; keterangan: string }[];
  isian: { kode?: string; label: string; tipe: string; wajib: boolean; opsi: string }[];
  bobot: Record<string, string>;
  wawancara: boolean;
  tahap_fakultas: boolean;
  jam_buka: string;
  jam_tutup: string;
  ipk_evaluasi: string;
  tindakan: string;
  wajib_aktif: boolean;
}

const t = (v: number | null | undefined) => (v == null ? '' : String(v));

function draftDari(p: ProgramBeasiswa | null): DraftProgram {
  if (!p) {
    return {
      kode: '', nama: '', jenis: null, penyelenggara: '', sumber_dana: 'internal', tahun_id: null, keterangan: '',
      bentuk: 'potongan_ukt', nominal: '', periode_pencairan: 'semester', kuota: '', kuota_prodi: [],
      daftar_mulai: '', daftar_selesai: '', pengumuman_tanggal: '', syarat: [],
      berkas: [{ nama: 'Transkrip nilai', wajib: true, keterangan: '' }], isian: [],
      bobot: { ipk: '70', berkas: '30' }, wawancara: false, tahap_fakultas: false, jam_buka: '08:00', jam_tutup: '23:59', ipk_evaluasi: '', tindakan: 'peringatan', wajib_aktif: true,
    };
  }
  return {
    kode: p.kode, nama: p.nama, jenis: p.jenis, penyelenggara: p.penyelenggara ?? '', sumber_dana: p.sumber_dana, tahun_id: p.tahun_id, keterangan: p.keterangan ?? '',
    bentuk: p.bentuk, nominal: t(p.nominal), periode_pencairan: p.periode_pencairan, kuota: t(p.kuota),
    kuota_prodi: p.kuota_prodi.map((k) => ({ kode_prodi: k.kode_prodi, kuota: String(k.kuota) })),
    daftar_mulai: p.daftar_mulai ?? '', daftar_selesai: p.daftar_selesai ?? '', pengumuman_tanggal: p.pengumuman_tanggal ?? '',
    syarat: p.syarat.map((s) => ({ indikator: s.indikator, op: s.op, nilai: Array.isArray(s.nilai) ? '' : String(s.nilai), pilihan: Array.isArray(s.nilai) ? s.nilai.map(String) : [] })),
    berkas: p.berkas.map((b) => ({ kode: b.kode, nama: b.nama, wajib: b.wajib, keterangan: b.keterangan ?? '' })),
    isian: p.isian.map((i) => ({ kode: i.kode, label: i.label, tipe: i.tipe, wajib: i.wajib, opsi: i.opsi.join(', ') })),
    bobot: Object.fromEntries(Object.entries(p.bobot).map(([k, v]) => [k, String(v)])),
    wawancara: p.wawancara, tahap_fakultas: p.tahap_fakultas, jam_buka: p.buka_at?.slice(11, 16) ?? '00:00', jam_tutup: p.tutup_at?.slice(11, 16) ?? '23:59', ipk_evaluasi: t(p.evaluasi.ipk_minimal), tindakan: p.evaluasi.tindakan, wajib_aktif: p.evaluasi.wajib_aktif,
  };
}

function bodyDari(d: DraftProgram) {
  return {
    kode: d.kode.trim().toUpperCase(), nama: d.nama.trim(), jenis: d.jenis, penyelenggara: d.penyelenggara.trim() || null, sumber_dana: d.sumber_dana, tahun_id: d.tahun_id,
    keterangan: d.keterangan.trim() || null, bentuk: d.bentuk, nominal: kosongKeNull(d.nominal), periode_pencairan: d.periode_pencairan, kuota: kosongKeNull(d.kuota),
    kuota_prodi: d.kuota_prodi.filter((k) => k.kode_prodi).map((k) => ({ kode_prodi: k.kode_prodi, kuota: Number(k.kuota || 0) })),
    daftar_mulai: d.daftar_mulai || null, daftar_selesai: d.daftar_selesai || null, pengumuman_tanggal: d.pengumuman_tanggal || null,
    buka_at: d.daftar_mulai ? `${d.daftar_mulai} ${d.jam_buka || '00:00'}:00` : null, tutup_at: d.daftar_selesai ? `${d.daftar_selesai} ${d.jam_tutup || '23:59'}:59` : null,
    syarat: d.syarat.filter((s) => s.indikator).map((s) => ({ indikator: s.indikator, op: s.op, nilai: s.op === 'dalam' || s.op === 'bukan_dalam' ? s.pilihan : Number(s.nilai.replace(/\./g, '').replace(',', '.')) })),
    berkas: d.berkas.filter((b) => b.nama.trim()).map((b) => ({ kode: b.kode, nama: b.nama.trim(), wajib: b.wajib, keterangan: b.keterangan.trim() })),
    isian: d.isian.filter((i) => i.label.trim()).map((i) => ({ kode: i.kode, label: i.label.trim(), tipe: i.tipe, wajib: i.wajib, opsi: i.opsi.split(',').map((o) => o.trim()).filter(Boolean) })),
    bobot: Object.fromEntries(Object.entries(d.bobot).filter(([, v]) => v !== '' && Number(v) > 0).map(([k, v]) => [k, Number(v)])),
    wawancara: d.wawancara,
    tahap_fakultas: d.tahap_fakultas,
    evaluasi: { ipk_minimal: kosongKeNull(d.ipk_evaluasi), tindakan: d.tindakan, wajib_aktif: d.wajib_aktif },
  };
}

const SYARAT_CEPAT: { label: string; s: DraftSyarat }[] = [
  { label: 'IPK minimal', s: { indikator: 'ipk', op: '>=', nilai: '3', pilihan: [] } },
  { label: 'Semester minimal', s: { indikator: 'semester_ke', op: '>=', nilai: '3', pilihan: [] } },
  { label: 'Status aktif', s: { indikator: 'status_aktif', op: 'dalam', nilai: '', pilihan: ['A'] } },
  { label: 'Tanpa tunggakan', s: { indikator: 'tunggakan', op: '<=', nilai: '0', pilihan: [] } },
  { label: 'Penghasilan orang tua maksimal', s: { indikator: 'penghasilan_ortu', op: '<=', nilai: '4000000', pilihan: [] } },
  { label: 'Tidak menerima beasiswa lain', s: { indikator: 'beasiswa_diterima_aktif', op: '<=', nilai: '0', pilihan: [] } },
];

function labelSyaratDraft(s: DraftSyarat, ind: IndikatorBeasiswa[]): string {
  const d = ind.find((i) => i.kode === s.indikator);
  if (!d) return 'Syarat belum lengkap';
  if (d.tipe === 'pilihan') return `${d.judul} ${s.op === 'dalam' ? '' : 'bukan '}${s.pilihan.map((v) => d.opsi?.find((o) => o.nilai === v)?.label ?? v).join('/')}`;
  if (s.indikator === 'tunggakan' && s.op === '<=' && Number(s.nilai) === 0) return 'Tanpa tunggakan biaya kuliah';
  if (s.indikator === 'beasiswa_diterima_aktif' && s.op === '<=' && Number(s.nilai) === 0) return 'Tidak sedang menerima beasiswa lain';
  const n = d.tipe === 'rupiah' ? rp(Number(s.nilai || 0)) : s.nilai;
  return `${d.judul} ${(OP_LABEL[s.op] ?? s.op).replace(/ \(.*\)$/, '')} ${n}`;
}

/** Wizard program beasiswa di panel samping: identitas, bantuan & kuota, jadwal, syarat dinamis, formulir, seleksi, ringkasan. */
export function PanelProgramBeasiswa({ peran, program, onOpenChange, onSelesai }: { peran: PeranBeasiswa; program?: ProgramBeasiswa | null; onOpenChange: (open: boolean) => void; onSelesai?: (id: number) => void }) {
  const ubah = !!program;
  const [d, setD] = React.useState<DraftProgram>(() => draftDari(program ?? null));
  const [step, setStep] = React.useState(0);
  const aksi = useAksiBeasiswa();
  const set = <K extends keyof DraftProgram>(k: K, v: DraftProgram[K]) => setD((x) => ({ ...x, [k]: v }));
  const terkunci = ubah && program && !['draf', 'buka'].includes(program.status);
  const ind = peran.indikator;
  const opsiIndikator: SelectOption<string>[] = ind.map((i) => ({ value: i.kode, label: i.judul, description: i.keterangan }));
  const totalBobot = Object.values(d.bobot).reduce((a, v) => a + (Number(v) || 0), 0);
  const body = bodyDari(d);
  const steps = [
    {
      id: 'identitas',
      title: 'Identitas',
      description: 'Nama program, jenis, sumber dana, dan periode akademik.',
      validate: () => (!d.kode.trim() || !d.nama.trim() ? 'Isi kode dan nama program.' : !d.jenis ? 'Pilih jenis beasiswa.' : !d.tahun_id ? 'Pilih periode akademik.' : null),
      content: (
        <div className="u-bsw-form">
          <FormGrid>
            <Field label="Kode program" required description="Huruf besar/angka, mis. KIPK-2026">
              <Input value={d.kode} onChange={(e) => set('kode', e.target.value.toUpperCase())} disabled={!!terkunci} />
            </Field>
            <Field label="Jenis" required>
              <Select options={JENIS_BEASISWA} value={d.jenis} onValueChange={(v) => set('jenis', v)} disabled={!!terkunci} />
            </Field>
          </FormGrid>
          <Field label="Nama program" required>
            <Input value={d.nama} onChange={(e) => set('nama', e.target.value)} disabled={!!terkunci} />
          </Field>
          <FormGrid>
            <Field label="Sumber dana" required>
              <Select options={SUMBER_DANA} value={d.sumber_dana} onValueChange={(v) => set('sumber_dana', v ?? 'internal')} disabled={!!terkunci} />
            </Field>
            <Field label="Penyelenggara/pemberi" optional description="Mis. Kemdiktisaintek, Pemda, nama perusahaan">
              <Input value={d.penyelenggara} onChange={(e) => set('penyelenggara', e.target.value)} disabled={!!terkunci} />
            </Field>
          </FormGrid>
          <Field label="Periode akademik" required>
            <PilihTahunAkademik value={d.tahun_id} onValueChange={(v) => set('tahun_id', v)} disabled={!!terkunci} />
          </Field>
          <Field label="Keterangan untuk mahasiswa" optional description="Tampil di pengumuman dan halaman pendaftaran.">
            <Textarea rows={3} value={d.keterangan} onChange={(e) => set('keterangan', e.target.value)} disabled={!!terkunci} />
          </Field>
        </div>
      ),
    },
    {
      id: 'bantuan',
      title: 'Bantuan & kuota',
      description: 'Bentuk bantuan, nominal, dan kuota total atau per prodi. Mengisi kuota per prodi juga membatasi prodi sasaran.',
      validate: () => {
        if (d.bentuk === 'potongan_ukt' && !(Number(d.nominal) > 0)) return 'Isi nominal potongan UKT.';
        const kp = d.kuota_prodi.filter((k) => k.kode_prodi);
        if (d.kuota && kp.length && kp.reduce((a, k) => a + Number(k.kuota || 0), 0) > Number(d.kuota)) return 'Jumlah kuota per prodi melebihi kuota total.';
        if (d.kuota_prodi.some((k) => !k.kode_prodi)) return 'Pilih prodi pada setiap baris kuota, atau hapus barisnya.';
        return null;
      },
      content: (
        <div className="u-bsw-form">
          <Field label="Bentuk bantuan" required>
            <Select options={BENTUK} value={d.bentuk} onValueChange={(v) => set('bentuk', v ?? 'tunai')} disabled={!!terkunci} />
          </Field>
          <FormGrid>
            <Field label={d.bentuk === 'potongan_ukt' ? 'Potongan per periode (Rp)' : 'Nominal per pencairan (Rp)'} required={d.bentuk === 'potongan_ukt'}>
              <Input inputMode="numeric" value={d.nominal} onChange={(e) => set('nominal', e.target.value.replace(/[^\d]/g, ''))} disabled={!!terkunci} />
            </Field>
            <Field label="Periode pencairan">
              <Select options={PERIODE_CAIR} value={d.periode_pencairan} onValueChange={(v) => set('periode_pencairan', v ?? 'semester')} disabled={!!terkunci} />
            </Field>
          </FormGrid>
          <Field label="Kuota total penerima" optional description="Kosong = tanpa batas.">
            <Input inputMode="numeric" value={d.kuota} onChange={(e) => set('kuota', e.target.value.replace(/[^\d]/g, ''))} disabled={!!terkunci} />
          </Field>
          <div className="u-bsw-baris-judul">
            <span>Kuota per program studi</span>
            {!terkunci && (
              <Button variant="ghost" size="sm" onClick={() => set('kuota_prodi', [...d.kuota_prodi, { kode_prodi: null, kuota: '1' }])}>
                <Plus /> Tambah prodi
              </Button>
            )}
          </div>
          {d.kuota_prodi.length === 0 ? (
            <p className="u-bsw-ket">Tidak dibatasi per prodi: semua prodi boleh mendaftar.</p>
          ) : (
            d.kuota_prodi.map((k, i) => (
              <div key={i} className="u-bsw-baris">
                <PilihProdi aria-label="Program studi" placeholder="Pilih…" value={k.kode_prodi} onValueChange={(v) => set('kuota_prodi', d.kuota_prodi.map((x, j) => (j === i ? { ...x, kode_prodi: v } : x)))} disabled={!!terkunci} />
                <Input aria-label="Kuota prodi" inputMode="numeric" value={k.kuota} onChange={(e) => set('kuota_prodi', d.kuota_prodi.map((x, j) => (j === i ? { ...x, kuota: e.target.value.replace(/[^\d]/g, '') } : x)))} disabled={!!terkunci} />
                {!terkunci && (
                  <Button variant="ghost" size="sm" aria-label="Hapus baris" onClick={() => set('kuota_prodi', d.kuota_prodi.filter((_, j) => j !== i))}>
                    <X />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      ),
    },
    {
      id: 'jadwal',
      title: 'Jadwal',
      description: 'Masa pendaftaran dan tanggal pengumuman penerima.',
      validate: () => (!d.daftar_mulai || !d.daftar_selesai ? 'Isi tanggal mulai dan selesai pendaftaran.' : d.daftar_selesai < d.daftar_mulai ? 'Tanggal selesai sebelum tanggal mulai.' : d.pengumuman_tanggal && d.pengumuman_tanggal < d.daftar_selesai ? 'Pengumuman tidak boleh sebelum pendaftaran ditutup.' : null),
      content: (
        <div className="u-bsw-form">
          <FormGrid>
            <Field label="Pendaftaran dibuka" required>
              <IsianTanggal value={d.daftar_mulai} onValueChange={(v) => set('daftar_mulai', v)} disabled={!!terkunci} />
            </Field>
            <Field label="Jam buka">
              <Input type="time" value={d.jam_buka} onChange={(e) => set('jam_buka', e.target.value)} disabled={!!terkunci} />
            </Field>
            <Field label="Pendaftaran ditutup" required>
              <IsianTanggal value={d.daftar_selesai} min={d.daftar_mulai || undefined} onValueChange={(v) => set('daftar_selesai', v)} disabled={!!terkunci} />
            </Field>
            <Field label="Jam tutup">
              <Input type="time" value={d.jam_tutup} onChange={(e) => set('jam_tutup', e.target.value)} disabled={!!terkunci} />
            </Field>
          </FormGrid>
          <p className="u-bsw-ket">Di luar jam buka–tutup, pendaftaran ditolak sistem. Mahasiswa melihat hitung mundur &ldquo;Dibuka dalam …/Ditutup dalam …&rdquo;.</p>
          <Field label="Pengumuman penerima" optional>
            <IsianTanggal value={d.pengumuman_tanggal} min={d.daftar_selesai || undefined} onValueChange={(v) => set('pengumuman_tanggal', v)} />
          </Field>
        </div>
      ),
    },
    {
      id: 'syarat',
      title: 'Syarat',
      description: 'Aturan dinamis yang dicek otomatis dari data SIAKAD (IPK, semester, status, tunggakan) atau isian pendaftar (penghasilan orang tua).',
      validate: () => {
        for (const s of d.syarat) {
          if (!s.indikator) return 'Pilih indikator di setiap baris syarat.';
          const di = ind.find((i) => i.kode === s.indikator);
          if (di?.tipe === 'pilihan' ? !s.pilihan.length : s.nilai.trim() === '' || Number.isNaN(Number(s.nilai.replace(',', '.')))) return `Isi nilai syarat ${di?.judul ?? ''}.`;
        }
        return null;
      },
      content: (
        <div className="u-bsw-form">
          {!terkunci && (
            <div className="u-bsw-cepat" aria-label="Tambah syarat cepat">
              {SYARAT_CEPAT.filter((c) => !d.syarat.some((s) => s.indikator === c.s.indikator)).map((c) => (
                <Button key={c.label} variant="outline" size="sm" onClick={() => set('syarat', [...d.syarat, { ...c.s }])}>
                  <Plus /> {c.label}
                </Button>
              ))}
            </div>
          )}
          {d.syarat.length === 0 && <p className="u-bsw-ket">Belum ada syarat. Status mahasiswa aktif tetap diperiksa (prasyarat bawaan) beserta aturan umum titik beasiswa.daftar.</p>}
          {d.syarat.map((s, i) => {
            const di = ind.find((x) => x.kode === s.indikator);
            const ganti = (x: Partial<DraftSyarat>) => set('syarat', d.syarat.map((y, j) => (j === i ? { ...y, ...x } : y)));
            return (
              <Card key={i} variant="muted" className="u-bsw-syarat">
                <CardContent>
                  <div className="u-bsw-baris u-bsw-baris-3">
                    <Select aria-label="Indikator" options={opsiIndikator} value={s.indikator} onValueChange={(v) => ganti({ indikator: v, op: ind.find((x) => x.kode === v)?.operator[0] ?? '>=', nilai: '', pilihan: [] })} disabled={!!terkunci} />
                    <Select aria-label="Operator" options={(di?.operator ?? ['>=']).map((o) => ({ value: o, label: OP_LABEL[o] ?? o }))} value={s.op} onValueChange={(v) => ganti({ op: v ?? '>=' })} disabled={!!terkunci} />
                    {di?.tipe === 'pilihan' ? (
                      <div className="u-bsw-cek">
                        {(di.opsi ?? []).map((o) => (
                          <label key={o.nilai}>
                            <Checkbox checked={s.pilihan.includes(o.nilai)} onCheckedChange={(c) => ganti({ pilihan: c ? [...s.pilihan, o.nilai] : s.pilihan.filter((v) => v !== o.nilai) })} disabled={!!terkunci} /> {o.label}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <Input aria-label="Nilai" inputMode="decimal" placeholder={di?.tipe === 'rupiah' ? 'Rupiah' : 'Nilai'} value={s.nilai} onChange={(e) => ganti({ nilai: e.target.value })} disabled={!!terkunci} />
                    )}
                    {!terkunci && (
                      <Button variant="ghost" size="sm" aria-label="Hapus syarat" onClick={() => set('syarat', d.syarat.filter((_, j) => j !== i))}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                  <p className="u-bsw-ket">{labelSyaratDraft(s, ind)}{di?.isian ? ' · diisi pendaftar, dibuktikan dengan berkas' : ' · dicek dari data SIAKAD'}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ),
    },
    {
      id: 'formulir',
      title: 'Formulir',
      description: 'Berkas yang diunggah dan isian tambahan saat mendaftar.',
      validate: () => (d.isian.some((i) => i.tipe === 'pilihan' && i.opsi.split(',').filter((o) => o.trim()).length < 2) ? 'Isian pilihan butuh minimal dua opsi (pisahkan dengan koma).' : null),
      content: (
        <div className="u-bsw-form">
          <div className="u-bsw-baris-judul">
            <span>Berkas</span>
            {!terkunci && (
              <Button variant="ghost" size="sm" onClick={() => set('berkas', [...d.berkas, { nama: '', wajib: true, keterangan: '' }])}>
                <Plus /> Tambah berkas
              </Button>
            )}
          </div>
          {d.berkas.map((b, i) => (
            <div key={i} className="u-bsw-baris u-bsw-baris-berkas">
              <Input aria-label="Nama berkas" placeholder="Mis. Surat keterangan tidak mampu" value={b.nama} onChange={(e) => set('berkas', d.berkas.map((x, j) => (j === i ? { ...x, nama: e.target.value } : x)))} disabled={!!terkunci} />
              <label className="u-bsw-cek-satu">
                <Checkbox checked={b.wajib} onCheckedChange={(c) => set('berkas', d.berkas.map((x, j) => (j === i ? { ...x, wajib: !!c } : x)))} disabled={!!terkunci} /> Wajib
              </label>
              {!terkunci && (
                <Button variant="ghost" size="sm" aria-label="Hapus berkas" onClick={() => set('berkas', d.berkas.filter((_, j) => j !== i))}>
                  <X />
                </Button>
              )}
            </div>
          ))}
          <div className="u-bsw-baris-judul">
            <span>Isian tambahan</span>
            {!terkunci && (
              <Button variant="ghost" size="sm" onClick={() => set('isian', [...d.isian, { label: '', tipe: 'teks', wajib: false, opsi: '' }])}>
                <Plus /> Tambah isian
              </Button>
            )}
          </div>
          {d.isian.length === 0 && <p className="u-bsw-ket">IPK, semester, dan prodi diambil otomatis dari SIAKAD; tidak perlu ditanyakan.</p>}
          {d.isian.map((f, i) => {
            const ganti = (x: Partial<DraftProgram['isian'][number]>) => set('isian', d.isian.map((y, j) => (j === i ? { ...y, ...x } : y)));
            return (
              <Card key={i} variant="muted">
                <CardContent>
                  <div className="u-bsw-baris u-bsw-baris-berkas">
                    <Input aria-label="Label isian" placeholder="Pertanyaan/isian" value={f.label} onChange={(e) => ganti({ label: e.target.value })} disabled={!!terkunci} />
                    <Select aria-label="Tipe isian" options={[{ value: 'teks', label: 'Teks singkat' }, { value: 'panjang', label: 'Teks panjang' }, { value: 'angka', label: 'Angka' }, { value: 'pilihan', label: 'Pilihan' }]} value={f.tipe} onValueChange={(v) => ganti({ tipe: v ?? 'teks' })} disabled={!!terkunci} />
                    <label className="u-bsw-cek-satu">
                      <Checkbox checked={f.wajib} onCheckedChange={(c) => ganti({ wajib: !!c })} disabled={!!terkunci} /> Wajib
                    </label>
                    {!terkunci && (
                      <Button variant="ghost" size="sm" aria-label="Hapus isian" onClick={() => set('isian', d.isian.filter((_, j) => j !== i))}>
                        <X />
                      </Button>
                    )}
                  </div>
                  {f.tipe === 'pilihan' && <Input aria-label="Opsi" placeholder="Opsi dipisah koma" value={f.opsi} onChange={(e) => ganti({ opsi: e.target.value })} disabled={!!terkunci} />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ),
    },
    {
      id: 'seleksi',
      title: 'Seleksi & evaluasi',
      description: 'Bobot skor peringkat, wawancara, dan evaluasi lanjutan per semester.',
      validate: () => (totalBobot <= 0 ? 'Isi minimal satu bobot skor.' : null),
      content: (
        <div className="u-bsw-form">
          <p className="u-bsw-label">Bobot skor (total {totalBobot}; dinormalkan otomatis)</p>
          {peran.kriteria.map((k) => (
            <div key={k.kode} className="u-bsw-baris u-bsw-baris-bobot">
              <span>{k.judul}</span>
              <Input aria-label={`Bobot ${k.judul}`} inputMode="numeric" value={d.bobot[k.kode] ?? ''} onChange={(e) => set('bobot', { ...d.bobot, [k.kode]: e.target.value.replace(/[^\d]/g, '') })} disabled={!!terkunci} />
            </div>
          ))}
          <label className="u-bsw-saklar">
            <Switch checked={d.wawancara} onCheckedChange={(c) => set('wawancara', !!c)} disabled={!!terkunci} /> Seleksi memakai wawancara (nilai 0–100 masuk skor)
          </label>
          <label className="u-bsw-saklar">
            <Switch checked={d.tahap_fakultas} onCheckedChange={(c) => set('tahap_fakultas', !!c)} disabled={!!terkunci} /> Tahap rekomendasi fakultas/prodi sebelum verifikasi BAAK (operator beasiswa unit)
          </label>
          <Card variant="muted">
            <CardHeader title="Evaluasi lanjutan per semester" description="Penerima dievaluasi tiap periode; peringatan kedua berarti dicabut." />
            <CardContent>
              <FormGrid>
                <Field label="IPK minimal bertahan" optional>
                  <Input inputMode="decimal" value={d.ipk_evaluasi} onChange={(e) => set('ipk_evaluasi', e.target.value)} />
                </Field>
                <Field label="Bila tidak memenuhi">
                  <Select options={[{ value: 'peringatan', label: 'Peringatan dulu' }, { value: 'cabut', label: 'Langsung dicabut' }]} value={d.tindakan} onValueChange={(v) => set('tindakan', v ?? 'peringatan')} />
                </Field>
              </FormGrid>
              <label className="u-bsw-saklar">
                <Switch checked={d.wajib_aktif} onCheckedChange={(c) => set('wajib_aktif', !!c)} /> Penerima wajib berstatus aktif
              </label>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      id: 'ringkasan',
      title: 'Ringkasan',
      description: 'Periksa sebelum menyimpan. Program baru tersimpan sebagai draf.',
      content: (
        <WizardReview
          sections={[
            { title: 'Identitas', onEdit: () => setStep(0), items: [{ label: 'Program', value: `${d.nama} (${d.kode})` }, { label: 'Jenis', value: JENIS_BEASISWA.find((j) => j.value === d.jenis)?.label }, { label: 'Sumber dana', value: SUMBER_DANA.find((s) => s.value === d.sumber_dana)?.label }, { label: 'Periode', value: d.tahun_id }] },
            { title: 'Bantuan & kuota', onEdit: () => setStep(1), items: [{ label: 'Bentuk', value: `${BENTUK.find((b) => b.value === d.bentuk)?.label} ${rp(kosongKeNull(d.nominal))}` }, { label: 'Kuota', value: d.kuota || 'Tanpa batas' }, { label: 'Per prodi', value: body.kuota_prodi.length ? `${body.kuota_prodi.length} prodi` : 'Semua prodi' }] },
            { title: 'Jadwal', onEdit: () => setStep(2), items: [{ label: 'Pendaftaran', value: `${tgl(d.daftar_mulai)} ${d.jam_buka} – ${tgl(d.daftar_selesai)} ${d.jam_tutup}` }, { label: 'Pengumuman', value: tgl(d.pengumuman_tanggal) }] },
            { title: 'Syarat', onEdit: () => setStep(3), items: d.syarat.length ? d.syarat.map((s, i) => ({ label: `${i + 1}`, value: labelSyaratDraft(s, ind) })) : [{ label: 'Syarat', value: 'Hanya status aktif (bawaan)' }] },
            { title: 'Formulir', onEdit: () => setStep(4), items: [{ label: 'Berkas', value: body.berkas.map((b) => `${b.nama}${b.wajib ? '' : ' (opsional)'}`).join(', ') || '-' }, { label: 'Isian', value: body.isian.map((i) => i.label).join(', ') || '-' }] },
            { title: 'Seleksi', onEdit: () => setStep(5), items: [{ label: 'Bobot', value: Object.entries(body.bobot).map(([k, v]) => `${peran.kriteria.find((x) => x.kode === k)?.judul.split(' (')[0] ?? k} ${v}`).join(', ') }, { label: 'Wawancara', value: d.wawancara ? 'Ya' : 'Tidak' }, { label: 'Rekomendasi fakultas', value: d.tahap_fakultas ? 'Ya, sebelum verifikasi BAAK' : 'Tidak' }, { label: 'Evaluasi', value: d.ipk_evaluasi ? `IPK ≥ ${d.ipk_evaluasi}, ${d.tindakan === 'cabut' ? 'langsung cabut' : 'peringatan dulu'}` : 'Tanpa batas IPK' }] },
          ]}
        />
      ),
    },
  ];
  return (
    <PanelLangkah
      open
      onOpenChange={onOpenChange}
      title={ubah ? `Ubah ${program!.nama}` : 'Program beasiswa baru'}
      description={terkunci ? 'Seleksi sudah dimulai: hanya jadwal pengumuman dan evaluasi yang bisa diubah.' : 'Syarat dicek otomatis dari data SIAKAD saat mahasiswa membuka Profil » Beasiswa.'}
      mode={ubah ? 'ubah' : 'buat'}
      size="xl"
      step={step}
      onStepChange={setStep}
      finishLabel={ubah ? 'Simpan perubahan' : 'Simpan draf'}
      steps={steps}
      onFinish={async () => {
        try {
          const r = ubah
            ? await aksi<ProgramBeasiswa>(`${BASIS}/program/${program!.id}`, terkunci ? { pengumuman_tanggal: body.pengumuman_tanggal, evaluasi: body.evaluasi } : body, 'Program disimpan.')
            : await aksi<ProgramBeasiswa>(`${BASIS}/program`, body, 'Program dibuat sebagai draf.');
          onSelesai?.(r.id);
          return null;
        } catch (e) {
          return galat(e);
        }
      }}
    />
  );
}

// ---------------------------------------------------------------- rincian program
function DetailProgramBeasiswa({ id, peran, onClose, onPendaftar }: { id: number; peran: PeranBeasiswa; onClose: () => void; onPendaftar: (id: number) => void }) {
  const d = useSiakadQuery<ProgramBeasiswa>(['beasiswa', 'detail', id], q(`${BASIS}/program/${id}`));
  const aksi = useAksiBeasiswa();
  const [ubah, setUbah] = React.useState(false);
  const [konfirmasi, setKonfirmasi] = React.useState<null | 'buka' | 'seleksi' | 'selesai' | 'draf' | 'hapus'>(null);
  const p = d.data;
  const boleh = peran.boleh_kelola;
  const status = (aksiStatus: string, pesan: string) => aksi(`${BASIS}/program/${id}/status`, { aksi: aksiStatus }, pesan);
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={p?.nama ?? 'Program beasiswa'} description={p ? `${p.kode} · ${p.tahun_nama ?? p.tahun_id}` : undefined} size="xl">
      {!p ? (
        d.error ? <Alert variant="danger">{galat(d.error)}</Alert> : <Skeleton style={{ height: 320 }} />
      ) : (
        <div className="u-bsw-form">
          <div className="u-bsw-kepala">
            <LencanaStatusProgram status={p.status} />
            {p.dibuka && <Badge variant="success">Sedang menerima pendaftar</Badge>}
            {p.nomor_sk && <Badge variant="outline">SK {p.nomor_sk}</Badge>}
          </div>
          {boleh && (
            <div className="u-bsw-aksi">
              <Button variant="outline" onClick={() => setUbah(true)}>
                <Pencil /> Ubah
              </Button>
              {p.status === 'draf' && (
                <Button onClick={() => setKonfirmasi('buka')}>
                  <Megaphone /> Buka pendaftaran
                </Button>
              )}
              {p.status === 'buka' && (
                <Button onClick={() => setKonfirmasi('seleksi')}>
                  <ListChecks /> Tutup & mulai seleksi
                </Button>
              )}
              {p.status === 'berjalan' && (
                <Button variant="outline" onClick={() => setKonfirmasi('selesai')}>
                  <CheckCheck /> Selesaikan program
                </Button>
              )}
              {p.status === 'buka' && !(p.rekap?.total ?? 0) && (
                <Button variant="ghost" onClick={() => setKonfirmasi('draf')}>
                  Kembalikan ke draf
                </Button>
              )}
              {p.status === 'draf' && (
                <Button variant="ghost" onClick={() => setKonfirmasi('hapus')}>
                  <Trash2 /> Hapus
                </Button>
              )}
            </div>
          )}
          <Button variant="outline" onClick={() => onPendaftar(p.id)} style={{ justifySelf: 'start' }}>
            <Users /> Pendaftar ({p.rekap?.total ?? 0}) · penerima {p.rekap?.diterima ?? 0}
          </Button>
          <DescriptionList
            items={[
              { label: 'Jenis', value: JENIS_BEASISWA.find((j) => j.value === p.jenis)?.label ?? p.jenis },
              { label: 'Sumber dana', value: `${SUMBER_DANA.find((s) => s.value === p.sumber_dana)?.label}${p.penyelenggara ? ` · ${p.penyelenggara}` : ''}` },
              { label: 'Bantuan', value: `${p.bentuk === 'potongan_ukt' ? 'Potongan UKT' : 'Tunai'} ${rp(p.nominal)} ${String(PERIODE_CAIR.find((x) => x.value === p.periode_pencairan)?.label ?? '').toLowerCase()}` },
              { label: 'Kuota', value: p.kuota == null ? 'Tanpa batas' : `${p.kuota} penerima` },
              { label: 'Prodi sasaran', value: p.prodi_sasaran ? p.prodi_sasaran.map((x) => `${x.nama}${p.kuota_prodi.find((k) => k.kode_prodi === x.kode_prodi) ? ` (${p.kuota_prodi.find((k) => k.kode_prodi === x.kode_prodi)!.kuota})` : ''}`).join(', ') : 'Semua prodi' },
              { label: 'Pendaftaran', value: `${tglJam(p.buka_at)} – ${tglJam(p.tutup_at)}` },
              { label: 'Alur seleksi', value: `${p.tahap_fakultas ? 'Rekomendasi fakultas/prodi → ' : ''}Verifikasi BAAK → ${p.wawancara ? 'Wawancara → ' : ''}Penetapan → Pencairan` },
              { label: 'Pengumuman', value: tgl(p.pengumuman_tanggal) },
              { label: 'Penetapan', value: p.nomor_sk ? `SK ${p.nomor_sk}, ${tgl(p.tanggal_sk)}` : 'Belum' },
            ]}
          />
          <Card variant="muted">
            <CardHeader title="Syarat" description="Dicek otomatis; mahasiswa melihat syarat yang belum terpenuhi sebelum mendaftar." />
            <CardContent>
              <ul className="u-bsw-list">
                {p.syarat.length ? p.syarat.map((s, i) => <li key={i}>{s.label}</li>) : <li>Status mahasiswa aktif (bawaan)</li>}
                {p.berkas.map((b) => (
                  <li key={b.kode}>
                    Berkas: {b.nama}
                    {b.wajib ? '' : ' (opsional)'}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          {p.publikasi && p.publikasi.length > 0 && (
            <Card variant="muted">
              <CardHeader title="Pengumuman Humas" description="Draf dibuat otomatis; Humas menyunting lalu menerbitkan." />
              <CardContent>
                <ul className="u-bsw-list">
                  {p.publikasi.map((u) => (
                    <li key={u.id}>
                      {u.jenis === 'pembukaan' ? 'Pembukaan' : 'Penerima'}: {u.judul} — {u.status === 'terbit' ? <Badge variant="success">Terbit {tgl(u.diterbitkan_at)}</Badge> : <Badge variant="warning">Menunggu Humas</Badge>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          <RiwayatAksi rows={p.riwayat ?? []} />
        </div>
      )}
      {ubah && p && <PanelProgramBeasiswa peran={peran} program={p} onOpenChange={(o) => !o && setUbah(false)} />}
      {p && konfirmasi && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setKonfirmasi(null)}
          title={{ buka: 'Buka pendaftaran?', seleksi: 'Tutup pendaftaran dan mulai seleksi?', selesai: 'Selesaikan program?', draf: 'Kembalikan ke draf?', hapus: 'Hapus program?' }[konfirmasi]}
          description={
            {
              buka: 'Mahasiswa yang memenuhi syarat bisa mendaftar dari Profil UNIPO. Draf pengumuman dikirim ke Humas untuk disunting dan diterbitkan.',
              seleksi: 'Pendaftaran ditutup. Syarat semua pendaftar dicek ulang dan skor peringkat dihitung otomatis.',
              selesai: 'Program ditandai selesai. Data penerima, evaluasi, dan pencairan tetap tersimpan.',
              draf: 'Program kembali ke draf dan tidak tampil untuk mahasiswa.',
              hapus: 'Program draf ini dihapus.',
            }[konfirmasi]
          }
          confirmLabel={{ buka: 'Buka pendaftaran', seleksi: 'Mulai seleksi', selesai: 'Selesaikan', draf: 'Kembalikan ke draf', hapus: 'Hapus program' }[konfirmasi]}
          tone={konfirmasi === 'hapus' ? 'danger' : 'primary'}
          onConfirm={async () => {
            if (konfirmasi === 'hapus') {
              await aksi(`${BASIS}/program/${id}/hapus`, {}, 'Program dihapus.');
              onClose();
              return;
            }
            await status(konfirmasi, { buka: 'Pendaftaran dibuka.', seleksi: 'Seleksi dimulai.', selesai: 'Program selesai.', draf: 'Program kembali ke draf.' }[konfirmasi]);
          }}
        />
      )}
    </Sheet>
  );
}

function RiwayatAksi({ rows }: { rows: RiwayatBeasiswa[] }) {
  if (!rows.length) return null;
  return (
    <Card variant="muted">
      <CardHeader title="Riwayat aksi" description="Pelaku dan unit setiap langkah." />
      <CardContent>
        <ol className="u-bsw-riwayat">
          {rows.map((r) => (
            <li key={r.id}>
              <History aria-hidden />
              <span>
                <strong>{r.ringkasan ?? r.aksi}</strong>
                <small>
                  {tglJam(r.created_at)} · {r.pelaku ?? '-'} · {UNIT_LABEL[r.unit] ?? r.unit}
                  {r.diambil_alih ? ' · diambil alih Pustikom' : ''}
                </small>
              </span>
              {r.diambil_alih && <Badge variant="warning">Pustikom</Badge>}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------- pendaftar & seleksi
function PilihProgram({ value, onValueChange, status, label = 'Program' }: { value: number | null; onValueChange: (id: number | null) => void; status?: string[]; label?: string }) {
  const daftar = useDaftarProgram();
  const rows = (daftar.data ?? []).filter((p) => !status || status.includes(p.status));
  React.useEffect(() => {
    if (value === null && rows.length) onValueChange(rows[0].id);
  }, [value, rows.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Select aria-label={label} placeholder="Pilih…" value={value === null ? null : String(value)} onValueChange={(v) => onValueChange(v ? Number(v) : null)} options={rows.map((p) => ({ value: String(p.id), label: p.nama, description: `${p.kode} · ${STATUS_PROGRAM[p.status]?.[0] ?? p.status}` }))} />;
}

function TabPendaftar({ peran, program, onProgram }: { peran: PeranBeasiswa; program: number | null; onProgram: (id: number | null) => void }) {
  return (
    <div className="u-bsw-form">
      <div className="u-bsw-pilih">
        <PilihProgram value={program} onValueChange={onProgram} status={['buka', 'seleksi', 'berjalan', 'selesai']} />
      </div>
      {program === null ? <Empty bordered icon={<Users />} title="Pilih program" description="Program yang sudah dibuka pendaftarannya tampil di sini." /> : <DaftarPendaftar key={program} id={program} peran={peran} />}
    </div>
  );
}

function DaftarPendaftar({ id, peran }: { id: number; peran: PeranBeasiswa }) {
  const prog = useSiakadQuery<ProgramBeasiswa>(['beasiswa', 'detail', id], q(`${BASIS}/program/${id}`));
  const rows = useSiakadQuery<PendaftarBeasiswa[]>(['beasiswa', 'pendaftar', id], q(`${BASIS}/program/${id}/pendaftar`));
  const aksi = useAksiBeasiswa();
  const toast = useToast();
  const [pilih, setPilih] = React.useState<number | null>(null);
  const [cek, setCek] = React.useState(false);
  const [tolakSemua, setTolakSemua] = React.useState(false);
  const [tetapkan, setTetapkan] = React.useState(false);
  const p = prog.data;
  const boleh = peran.boleh_kelola;
  const kolom: DataColumn<PendaftarBeasiswa>[] = [
    { key: 'peringkat', header: '#', shrink: true, align: 'end', cell: (r) => r.peringkat ?? '-', value: (r) => r.peringkat ?? 9999, sortable: true },
    {
      key: 'nama',
      header: 'Mahasiswa',
      cell: (r) => (
        <span className="u-bsw-sel">
          <strong>{r.nama ?? r.nim}</strong>
          <small>
            {r.nim} · {r.prodi}
          </small>
        </span>
      ),
      value: (r) => r.nama ?? r.nim,
      sortable: true,
    },
    { key: 'ipk', header: 'IPK', align: 'end', cell: (r) => angka(r.ipk), value: (r) => r.ipk ?? 0, sortable: true },
    { key: 'semester', header: 'Smt', align: 'end', cell: (r) => r.semester ?? '-', value: (r) => r.semester ?? 0 },
    { key: 'skor', header: 'Skor', align: 'end', cell: (r) => <strong>{angka(r.skor)}</strong>, value: (r) => r.skor ?? 0, sortable: true },
    { key: 'syarat', header: 'Syarat', cell: (r) => (r.memenuhi === null ? <Badge variant="neutral">Belum dicek</Badge> : r.memenuhi ? <Badge variant="success">Memenuhi</Badge> : <Badge variant="danger">Tidak memenuhi</Badge>), value: (r) => (r.memenuhi ? 1 : 0) },
    {
      key: 'berkas',
      header: 'Berkas',
      cell: (r) => {
        const w = r.berkas.filter((b) => b.wajib);
        const sah = w.filter((b) => b.status === 'sah').length;
        return <Badge variant={sah === w.length ? 'success' : r.berkas.some((b) => b.status === 'tidak_sah') ? 'danger' : 'neutral'}>{`${sah}/${w.length} sah`}</Badge>;
      },
    },
    ...(p?.tahap_fakultas
      ? [{ key: 'rekomendasi', header: 'Rekomendasi fakultas', cell: (r: PendaftarBeasiswa) => (r.rekomendasi ? <Badge variant={r.rekomendasi.hasil === 'direkomendasikan' ? 'success' : 'danger'}>{r.rekomendasi.hasil === 'direkomendasikan' ? 'Direkomendasikan' : 'Tidak direkomendasikan'}</Badge> : <Badge variant="neutral">Belum</Badge>) }]
      : []),
    ...(p?.wawancara ? [{ key: 'wawancara', header: 'Wawancara', align: 'end' as const, cell: (r: PendaftarBeasiswa) => (r.wawancara.nilai != null ? angka(r.wawancara.nilai, 0) : r.wawancara.jadwal ? tglJam(r.wawancara.jadwal) : '-') }] : []),
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (
        <span className="u-bsw-sel">
          <LencanaStatusPendaftar status={r.status} />
          {r.nomor_penerima ? <small>{r.nomor_penerima}</small> : <LabelPemeriksa pemeriksa={r.pemeriksa} />}
        </span>
      ),
      value: (r) => r.status,
    },
  ];
  const lolos = (rows.data ?? []).filter((r) => r.status === 'diverifikasi');
  return (
    <>
      {p && (
        <StatGrid min={160}>
          <StatCard label="Pendaftar" value={p.rekap?.total ?? 0} icon={<Users />} />
          <StatCard label="Menunggu verifikasi" value={p.rekap?.diajukan ?? 0} icon={<FileText />} />
          <StatCard label="Terverifikasi" value={p.rekap?.diverifikasi ?? 0} icon={<ClipboardCheck />} />
          <StatCard label="Penerima" value={`${p.rekap?.diterima ?? 0}${p.kuota ? ` / ${p.kuota}` : ''}`} icon={<Trophy />} />
        </StatGrid>
      )}
      <DataTable
        columns={kolom}
        rows={rows.data}
        rowKey={(r) => String(r.id)}
        loading={rows.loading}
        error={rows.error}
        onRetry={rows.refetch}
        onRowClick={(r) => setPilih(r.id)}
        exportCsv={p ? `pendaftar-${p.kode}` : true}
        storageKey="beasiswa.pendaftar"
        actions={
          boleh && p && ['buka', 'seleksi'].includes(p.status) ? (
            <>
              <Button variant="outline" onClick={() => setCek(true)}>
                <Wand2 /> Cek syarat & hitung skor
              </Button>
              {p.status === 'seleksi' && (
                <Button onClick={() => setTetapkan(true)} disabled={!lolos.length}>
                  <Award /> Tetapkan penerima
                </Button>
              )}
            </>
          ) : undefined
        }
        empty={{ icon: <Users />, title: 'Belum ada pendaftar', description: p?.status === 'buka' ? 'Mahasiswa mendaftar dari Profil UNIPO » Beasiswa.' : undefined }}
      />
      {cek && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setCek(false)}
          title="Cek syarat otomatis dan hitung skor?"
          description="Syarat setiap pendaftar dicek ulang dari data SIAKAD terbaru, lalu skor berbobot dan peringkat dihitung."
          confirmLabel="Jalankan"
          onConfirm={async () => {
            const r = await aksi<{ diperiksa: number; memenuhi: number; tidak_memenuhi: number; ditolak: number }>(`${BASIS}/program/${id}/seleksi-otomatis`, { tolak_tidak_memenuhi: tolakSemua });
            toast.add({ title: 'Seleksi otomatis selesai', description: `${r.diperiksa} diperiksa: ${r.memenuhi} memenuhi, ${r.tidak_memenuhi} tidak memenuhi${r.ditolak ? `, ${r.ditolak} ditolak` : ''}.`, type: 'success' });
          }}
        >
          <label className="u-bsw-cek-satu">
            <Checkbox checked={tolakSemua} onCheckedChange={(c) => setTolakSemua(!!c)} /> Tolak otomatis pendaftar yang tidak memenuhi syarat (mahasiswa menerima alasan)
          </label>
        </ConfirmDialog>
      )}
      {pilih !== null && p && <PanelPendaftar program={p} pendaftar={(rows.data ?? []).find((r) => r.id === pilih)!} peran={peran} onClose={() => setPilih(null)} />}
      {tetapkan && p && <PanelTetapkan program={p} pendaftar={rows.data ?? []} onClose={() => setTetapkan(false)} />}
    </>
  );
}

function PanelPendaftar({ program, pendaftar: r, peran, onClose }: { program: ProgramBeasiswa; pendaftar: PendaftarBeasiswa; peran: PeranBeasiswa; onClose: () => void }) {
  const s = useSiakad();
  const aksi = useAksiBeasiswa();
  const toast = useToast();
  const boleh = peran.boleh_pendaftar && ['diajukan', 'diverifikasi'].includes(r?.status ?? '');
  const bolehBaak = peran.boleh_kelola && boleh;
  const unit = peran.mode === 'unit';
  const [rek, setRek] = React.useState<{ catatan: string; buka: null | 'direkomendasikan' | 'tidak_direkomendasikan' }>({ catatan: '', buka: null });
  const [berkas, setBerkas] = React.useState<Record<string, { status: string; catatan: string }>>(() => Object.fromEntries((r?.berkas ?? []).map((b) => [b.kode, { status: b.status === 'belum' ? 'menunggu' : b.status, catatan: b.catatan ?? '' }])));
  const [catatan, setCatatan] = React.useState('');
  const [w, setW] = React.useState({ jadwal: r?.wawancara.jadwal?.slice(0, 16).replace(' ', 'T') ?? '', tempat: r?.wawancara.tempat ?? '', nilai: r?.wawancara.nilai == null ? '' : String(r.wawancara.nilai), catatan: r?.wawancara.catatan ?? '' });
  const [tolak, setTolak] = React.useState(false);
  const [alasan, setAlasan] = React.useState('');
  if (!r) return null;
  const kirimVerifikasi = (hasil: 'lengkap' | 'kurang') =>
    aksi(`${BASIS}/pendaftar/${r.id}/verifikasi`, { berkas: Object.fromEntries(Object.entries(berkas).map(([k, v]) => [k, { status: v.status, catatan: v.catatan }])), hasil, catatan }, hasil === 'lengkap' ? 'Berkas dinyatakan lengkap.' : 'Mahasiswa diminta melengkapi berkas.').then(onClose, () => undefined);
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={r.nama ?? r.nim} description={`${r.nim} · ${r.prodi} · ${program.nama}`} size="lg">
      <div className="u-bsw-form">
        <div className="u-bsw-kepala">
          <LencanaStatusPendaftar status={r.status} />
          {r.peringkat && <Badge variant="outline">Peringkat {r.peringkat}</Badge>}
          {r.skor != null && <Badge variant="primary">Skor {angka(r.skor)}</Badge>}
          {r.nomor_penerima && <Badge variant="success">{r.nomor_penerima}</Badge>}
        </div>
        {r.catatan && <Alert variant={r.status === 'ditolak' || r.status === 'dicabut' ? 'danger' : 'neutral'}>{r.catatan}</Alert>}
        <AlurPemeriksa pemeriksa={r.pemeriksa} />
        <DescriptionList
          items={[
            { label: 'IPK / semester', value: `${angka(r.ipk)} / ${r.semester ?? '-'}` },
            ...(r.penghasilan_ortu != null ? [{ label: 'Penghasilan orang tua', value: rp(r.penghasilan_ortu) }] : []),
            ...program.isian.map((f) => ({ label: f.label, value: r.isian[f.kode] ?? '-' })),
            ...(r.alasan ? [{ label: 'Alasan mendaftar', value: r.alasan }] : []),
            { label: 'Mendaftar', value: tglJam(r.created_at) },
            ...(r.skor_rincian ? [{ label: 'Rincian skor', value: Object.entries(r.skor_rincian).map(([k, v]) => `${peran.kriteria.find((x) => x.kode === k)?.judul.split(' (')[0] ?? k} ${angka(v.nilai, 0)} × ${v.bobot}`).join('; ') }] : []),
          ]}
        />
        {r.hasil_syarat && (
          <Card variant="muted">
            <CardHeader title="Cek syarat otomatis" />
            <CardContent>
              <DaftarSyarat items={r.hasil_syarat} />
            </CardContent>
          </Card>
        )}
        {program.tahap_fakultas && (
          <Card variant="muted">
            <CardHeader title="Rekomendasi fakultas/prodi" description="Tahap sebelum verifikasi BAAK. Diisi operator beasiswa unit fakultas/prodi mahasiswa." />
            <CardContent>
              {r.rekomendasi ? (
                <Alert variant={r.rekomendasi.hasil === 'direkomendasikan' ? 'success' : 'danger'} title={r.rekomendasi.hasil === 'direkomendasikan' ? 'Direkomendasikan' : 'Tidak direkomendasikan'}>
                  {r.rekomendasi.catatan ? `${r.rekomendasi.catatan} · ` : ''}
                  {r.rekomendasi.oleh}, {tglJam(r.rekomendasi.waktu)}
                </Alert>
              ) : (
                <p className="u-bsw-ket">Belum ada rekomendasi.</p>
              )}
              {boleh && r.status === 'diajukan' && (
                <>
                  <Field label="Catatan rekomendasi" optional description="Wajib bila tidak direkomendasikan; dikirim ke mahasiswa.">
                    <Textarea rows={2} value={rek.catatan} onChange={(e) => setRek({ ...rek, catatan: e.target.value })} />
                  </Field>
                  <div className="u-bsw-aksi">
                    <Button onClick={() => void aksi(`${BASIS}/pendaftar/${r.id}/rekomendasi`, { hasil: 'direkomendasikan', catatan: rek.catatan, berkas: Object.fromEntries(Object.entries(berkas).map(([k, v]) => [k, v])) }, 'Pendaftar direkomendasikan.').then(onClose, () => undefined)}>
                      <ThumbsUp /> Rekomendasikan
                    </Button>
                    <Button variant="outline" onClick={() => void aksi(`${BASIS}/pendaftar/${r.id}/rekomendasi`, { hasil: 'tidak_direkomendasikan', catatan: rek.catatan }, 'Tidak direkomendasikan.').then(onClose, () => undefined)} disabled={!rek.catatan.trim()}>
                      <ThumbsDown /> Tidak direkomendasikan
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
        <Card variant="muted">
          <CardHeader title="Verifikasi berkas" description={r.verifikasi_oleh ? `Terakhir oleh ${r.verifikasi_oleh}, ${tglJam(r.verifikasi_at)}` : 'Tandai setiap berkas sah atau tidak sah.'} />
          <CardContent>
            <div className="u-bsw-berkas">
              {r.berkas.map((b) => (
                <div key={b.kode} className="u-bsw-berkas-baris">
                  <span className="u-bsw-sel">
                    <strong>
                      {b.nama}
                      {b.wajib ? '' : ' (opsional)'}
                    </strong>
                    <small>{b.nama_berkas ?? 'Belum diunggah'}</small>
                  </span>
                  {b.uuid && (
                    <Button variant="ghost" size="sm" onClick={() => unduhBerkas(s, `${BASIS}/pendaftar/${r.id}/berkas/${b.uuid}`, b.nama_berkas ?? b.nama).catch((e) => toast.add({ title: 'Berkas belum bisa dibuka', description: galat(e), type: 'error' }))}>
                      <ExternalLink /> Lihat
                    </Button>
                  )}
                  {boleh && b.uuid ? (
                    <Select
                      aria-label={`Status ${b.nama}`}
                      value={berkas[b.kode]?.status ?? 'menunggu'}
                      onValueChange={(v) => setBerkas({ ...berkas, [b.kode]: { ...(berkas[b.kode] ?? { catatan: '' }), status: v ?? 'menunggu' } })}
                      options={[{ value: 'menunggu', label: 'Belum diperiksa' }, { value: 'sah', label: 'Sah' }, { value: 'tidak_sah', label: 'Tidak sah' }]}
                    />
                  ) : (
                    <Badge variant={b.status === 'sah' ? 'success' : b.status === 'tidak_sah' ? 'danger' : 'neutral'}>{{ sah: 'Sah', tidak_sah: 'Tidak sah', menunggu: 'Belum diperiksa', belum: 'Belum diunggah' }[b.status] ?? b.status}</Badge>
                  )}
                  {boleh && berkas[b.kode]?.status === 'tidak_sah' && <Input aria-label={`Catatan ${b.nama}`} placeholder="Alasan tidak sah" value={berkas[b.kode].catatan} onChange={(e) => setBerkas({ ...berkas, [b.kode]: { ...berkas[b.kode], catatan: e.target.value } })} />}
                </div>
              ))}
            </div>
            {boleh && (
              <>
                <Field label="Catatan untuk mahasiswa" optional>
                  <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
                </Field>
                <div className="u-bsw-aksi">
                  {!unit && (
                    <Button onClick={() => kirimVerifikasi('lengkap')} disabled={r.berkas.some((b) => b.wajib && berkas[b.kode]?.status !== 'sah') || (program.tahap_fakultas && r.rekomendasi?.hasil !== 'direkomendasikan')}>
                      <CheckCheck /> Berkas lengkap
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => kirimVerifikasi('kurang')}>
                    <FilePlus2 /> Minta lengkapi
                  </Button>
                </div>
                {!unit && program.tahap_fakultas && r.rekomendasi?.hasil !== 'direkomendasikan' && <p className="u-bsw-ket">Menunggu rekomendasi operator beasiswa fakultas/prodi sebelum berkas dinyatakan lengkap.</p>}
              </>
            )}
          </CardContent>
        </Card>
        {program.wawancara && (
          <Card variant="muted">
            <CardHeader title="Wawancara" description="Jadwal dikirim ke mahasiswa lewat Kabar; nilai 0–100 masuk skor." />
            <CardContent>
              <FormGrid>
                <Field label="Jadwal">
                  <Input type="datetime-local" value={w.jadwal} onChange={(e) => setW({ ...w, jadwal: e.target.value })} disabled={!boleh} />
                </Field>
                <Field label="Tempat/tautan">
                  <Input value={w.tempat} onChange={(e) => setW({ ...w, tempat: e.target.value })} disabled={!boleh} />
                </Field>
                <Field label="Nilai (0–100)">
                  <Input inputMode="decimal" value={w.nilai} onChange={(e) => setW({ ...w, nilai: e.target.value })} disabled={!boleh} />
                </Field>
                <Field label="Catatan" optional>
                  <Input value={w.catatan} onChange={(e) => setW({ ...w, catatan: e.target.value })} disabled={!boleh} />
                </Field>
              </FormGrid>
              {boleh && (
                <Button variant="outline" onClick={() => void aksi(`${BASIS}/pendaftar/${r.id}/wawancara`, { jadwal: w.jadwal ? w.jadwal.replace('T', ' ') : null, tempat: w.tempat, nilai: w.nilai === '' ? null : Number(w.nilai.replace(',', '.')), catatan: w.catatan }, 'Wawancara disimpan.').catch(() => undefined)}>
                  <CalendarClock /> Simpan wawancara
                </Button>
              )}
            </CardContent>
          </Card>
        )}
        {bolehBaak && (
          <Button variant="ghost" onClick={() => setTolak(true)} style={{ justifySelf: 'start' }}>
            <X /> Tolak pendaftar
          </Button>
        )}
      </div>
      {tolak && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setTolak(false)}
          title="Tolak pendaftar ini?"
          description="Mahasiswa menerima Kabar beserta alasannya."
          confirmLabel="Tolak"
          tone="danger"
          onConfirm={async () => {
            if (!alasan.trim()) throw new Error('Isi alasan penolakan.');
            await aksi(`${BASIS}/pendaftar/${r.id}/tolak`, { alasan }, 'Pendaftar ditolak.');
            onClose();
          }}
        >
          <Field label="Alasan" required>
            <Textarea rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} />
          </Field>
        </ConfirmDialog>
      )}
    </Sheet>
  );
}

function PanelTetapkan({ program: p, pendaftar, onClose }: { program: ProgramBeasiswa; pendaftar: PendaftarBeasiswa[]; onClose: () => void }) {
  const aksi = useAksiBeasiswa();
  const kandidat = pendaftar.filter((r) => r.status === 'diverifikasi').sort((a, b) => (a.peringkat ?? 9999) - (b.peringkat ?? 9999));
  const sudah = pendaftar.filter((r) => r.status === 'diterima');
  const kuotaProdi = Object.fromEntries(p.kuota_prodi.map((k) => [k.kode_prodi, k.kuota]));
  const awal = React.useMemo(() => {
    const out: number[] = [];
    const per: Record<string, number> = {};
    sudah.forEach((r) => (per[r.kode_prodi] = (per[r.kode_prodi] ?? 0) + 1));
    for (const r of kandidat) {
      if (p.kuota != null && sudah.length + out.length >= p.kuota) break;
      if (p.kuota_prodi.length && (per[r.kode_prodi] ?? 0) >= (kuotaProdi[r.kode_prodi] ?? 0)) continue;
      out.push(r.id);
      per[r.kode_prodi] = (per[r.kode_prodi] ?? 0) + 1;
    }
    return out;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [pilih, setPilih] = React.useState<number[]>(awal);
  const [sk, setSk] = React.useState({ nomor: '', tanggal: new Date().toISOString().slice(0, 10) });
  const [tolakLain, setTolakLain] = React.useState(true);
  const [galatTeks, setGalatTeks] = React.useState<string | null>(null);
  const [kirim, setKirim] = React.useState(false);
  const total = sudah.length + pilih.length;
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title="Tetapkan penerima"
      description={`${p.nama}: pendaftar terverifikasi diurutkan menurut skor. Kuota ${p.kuota ?? 'tanpa batas'}${p.kuota_prodi.length ? ', dibatasi per prodi' : ''}.`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            disabled={kirim || !pilih.length}
            onClick={async () => {
              if (!sk.nomor.trim() || !sk.tanggal) return setGalatTeks('Isi nomor dan tanggal SK penetapan.');
              setKirim(true);
              try {
                await aksi(`${BASIS}/program/${p.id}/tetapkan`, { nomor_sk: sk.nomor, tanggal_sk: sk.tanggal, pendaftar_id: pilih, tolak_lainnya: tolakLain }, `${pilih.length} penerima ditetapkan.`);
                onClose();
              } catch (e) {
                setGalatTeks(galat(e));
              } finally {
                setKirim(false);
              }
            }}
          >
            <Award /> Tetapkan {pilih.length} penerima
          </Button>
        </>
      }
    >
      <div className="u-bsw-form">
        {galatTeks && (
          <Alert variant="danger" icon={<CircleAlert />}>
            {galatTeks}
          </Alert>
        )}
        <FormGrid>
          <Field label="Nomor SK penetapan" required>
            <Input value={sk.nomor} onChange={(e) => setSk({ ...sk, nomor: e.target.value })} placeholder="Mis. 123/UNIPO/SK/XI/2026" />
          </Field>
          <Field label="Tanggal SK" required>
            <IsianTanggal value={sk.tanggal} onValueChange={(v) => setSk({ ...sk, tanggal: v })} />
          </Field>
        </FormGrid>
        <Alert variant={p.kuota != null && total > p.kuota ? 'danger' : 'info'}>
          Dipilih {pilih.length}
          {sudah.length ? ` + ${sudah.length} penerima sebelumnya` : ''} dari kuota {p.kuota ?? 'tanpa batas'}. Pilihan awal mengikuti peringkat skor dan kuota per prodi.
        </Alert>
        {kandidat.length === 0 ? (
          <Empty bordered title="Belum ada pendaftar terverifikasi" description="Verifikasi berkas pendaftar dulu." />
        ) : (
          <ul className="u-bsw-pilihan">
            {kandidat.map((r) => (
              <li key={r.id}>
                <label>
                  <Checkbox checked={pilih.includes(r.id)} onCheckedChange={(c) => setPilih(c ? [...pilih, r.id] : pilih.filter((x) => x !== r.id))} />
                  <span className="u-bsw-sel">
                    <strong>
                      {r.peringkat ? `${r.peringkat}. ` : ''}
                      {r.nama ?? r.nim}
                    </strong>
                    <small>
                      {r.nim} · {r.prodi} · IPK {angka(r.ipk)}
                    </small>
                  </span>
                  <Badge variant="primary">Skor {angka(r.skor)}</Badge>
                </label>
              </li>
            ))}
          </ul>
        )}
        <label className="u-bsw-cek-satu">
          <Checkbox checked={tolakLain} onCheckedChange={(c) => setTolakLain(!!c)} /> Pendaftar lain yang belum terpilih dinyatakan tidak diterima (kuota terbatas)
        </label>
        <p className="u-bsw-ket">
          Penerima mendapat Kabar dan nomor penerima. Draf pengumuman penerima (tanpa NIM/IPK) dikirim ke Humas.{' '}
          {p.bentuk === 'potongan_ukt' ? 'Potongan UKT langsung dipasang sebagai potongan tagihan (skema keringanan BAUK).' : 'BAUK menyiapkan pencairan tunai.'}
        </p>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- evaluasi
interface HasilEvaluasi {
  pratinjau: boolean;
  tahun_id: string;
  ringkas: Record<string, number>;
  hasil: { pendaftar_id: number; nim: string; nama: string | null; ipk: number | null; status_aktif: string; tunggakan: number | null; hasil: string; alasan: string; sudah: string | null }[];
}
const HASIL_EVAL: Record<string, [string, BadgeVariant]> = { lanjut: ['Lanjut', 'success'], peringatan: ['Peringatan', 'warning'], cabut: ['Dicabut', 'danger'] };

function TabEvaluasi({ peran, program, onProgram }: { peran: PeranBeasiswa; program: number | null; onProgram: (id: number | null) => void }) {
  const [tahun, setTahun] = React.useState<string | null>(null);
  const [hasil, setHasil] = React.useState<HasilEvaluasi | null>(null);
  const [simpan, setSimpan] = React.useState(false);
  const s = useSiakad();
  const aksi = useAksiBeasiswa();
  const toast = useToast();
  const riwayat = useSiakadQuery<{ id: number; tahun_id: string; nim: string; nama: string | null; ipk: number | null; hasil: string; catatan: string | null }[]>(['beasiswa', 'evaluasi', program ?? 0], q(`${BASIS}/program/${program ?? 0}/evaluasi`), { enabled: program !== null });
  const pratinjau = async () => {
    if (!program || !tahun) return;
    try {
      const r = await s.request<HasilEvaluasi>({ method: 'POST', path: `${BASIS}/program/${program}/evaluasi`, body: { tahun_id: tahun, pratinjau: true } });
      setHasil(r.data);
    } catch (e) {
      toast.add({ title: 'Belum berhasil', description: galat(e), type: 'error' });
    }
  };
  return (
    <div className="u-bsw-form">
      <div className="u-bsw-pilih u-bsw-pilih-2">
        <PilihProgram value={program} onValueChange={(v) => { onProgram(v); setHasil(null); }} status={['berjalan', 'selesai']} />
        <PilihTahunAkademik aria-label="Periode evaluasi" value={tahun} onValueChange={(v) => { setTahun(v); setHasil(null); }} />
        <Button variant="outline" onClick={pratinjau} disabled={!program || !tahun}>
          <ClipboardCheck /> Pratinjau evaluasi
        </Button>
      </div>
      <p className="u-bsw-ket">IPK di bawah batas program atau status bukan aktif = peringatan (atau langsung dicabut, sesuai program). Peringatan kedua = dicabut; potongan/keringanan turunannya ikut dicabut.</p>
      {hasil && (
        <>
          <StatGrid min={160}>
            <StatCard label="Lanjut" value={hasil.ringkas.lanjut ?? 0} />
            <StatCard label="Peringatan" value={hasil.ringkas.peringatan ?? 0} />
            <StatCard label="Dicabut" value={hasil.ringkas.cabut ?? 0} />
          </StatGrid>
          <DataTable
            columns={[
              { key: 'nama', header: 'Penerima', cell: (r) => <span className="u-bsw-sel"><strong>{r.nama ?? r.nim}</strong><small>{r.nim}</small></span> },
              { key: 'ipk', header: 'IPK', align: 'end', cell: (r) => angka(r.ipk) },
              { key: 'status_aktif', header: 'Status', cell: (r) => r.status_aktif },
              { key: 'hasil', header: 'Hasil', cell: (r) => <Badge variant={HASIL_EVAL[r.hasil]?.[1] ?? 'neutral'}>{HASIL_EVAL[r.hasil]?.[0] ?? r.hasil}</Badge> },
              { key: 'alasan', header: 'Keterangan', cell: (r) => r.alasan },
            ]}
            rows={hasil.hasil}
            rowKey={(r) => String(r.pendaftar_id)}
            pagination={false}
            actions={
              peran.boleh_kelola && hasil.pratinjau && hasil.hasil.length ? (
                <Button onClick={() => setSimpan(true)}>
                  <CheckCheck /> Simpan evaluasi
                </Button>
              ) : undefined
            }
            empty={{ title: 'Belum ada penerima' }}
          />
        </>
      )}
      {program !== null && (riwayat.data?.length ?? 0) > 0 && (
        <Card variant="muted">
          <CardHeader title="Riwayat evaluasi" />
          <CardContent>
            <DataTable
              columns={[
                { key: 'tahun_id', header: 'Periode' },
                { key: 'nama', header: 'Penerima', cell: (r) => r.nama ?? r.nim },
                { key: 'ipk', header: 'IPK', align: 'end', cell: (r) => angka(r.ipk) },
                { key: 'hasil', header: 'Hasil', cell: (r) => <Badge variant={HASIL_EVAL[r.hasil]?.[1] ?? 'neutral'}>{HASIL_EVAL[r.hasil]?.[0] ?? r.hasil}</Badge> },
                { key: 'catatan', header: 'Keterangan' },
              ]}
              rows={riwayat.data}
              rowKey={(r) => String(r.id)}
              pagination={false}
            />
          </CardContent>
        </Card>
      )}
      {simpan && hasil && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setSimpan(false)}
          title={`Simpan evaluasi ${hasil.tahun_id}?`}
          description={`${hasil.ringkas.peringatan ?? 0} peringatan dan ${hasil.ringkas.cabut ?? 0} pencabutan dikirim ke mahasiswa lewat Kabar.`}
          confirmLabel="Simpan evaluasi"
          tone={(hasil.ringkas.cabut ?? 0) > 0 ? 'danger' : 'primary'}
          onConfirm={async () => {
            const r = await aksi<HasilEvaluasi>(`${BASIS}/program/${program}/evaluasi`, { tahun_id: hasil.tahun_id, pratinjau: false }, 'Evaluasi disimpan.');
            setHasil(r);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- laporan
interface LaporanBeasiswa {
  tahun_id: string | null;
  lingkup_prodi: string[] | null;
  penerima: { program: string; kode: string; nim: string; nama: string | null; kode_prodi: string; status: string; nomor_penerima: string | null }[];
  total: { program: number; pendaftar: number; diterima: number; dicabut: number; dicairkan: number };
  penerima_per_sumber_dana: Record<string, number>;
  program: (ProgramBeasiswa & { dicairkan: { total: number; jumlah: number } })[];
}

function TabLaporan() {
  const [tahun, setTahun] = React.useState<string | null>(null);
  const s = useSiakad();
  const toast = useToast();
  const d = useSiakadQuery<LaporanBeasiswa>(['beasiswa', 'laporan', tahun ?? ''], q(`${BASIS}/laporan${tahun ? `?tahun_id=${tahun}` : ''}`));
  const l = d.data;
  return (
    <div className="u-bsw-form">
      <div className="u-bsw-pilih u-bsw-pilih-2">
        <PilihTahunAkademik aria-label="Periode" placeholder="Semua periode" value={tahun} onValueChange={setTahun} />
        <Button
          variant="outline"
          onClick={() => unduhBerkas(s, `${BASIS}/laporan/ekspor${tahun ? `?tahun_id=${tahun}` : ''}`, `beasiswa-${tahun ?? 'semua'}.csv`, false).catch((e) => toast.add({ title: 'Ekspor gagal', description: galat(e), type: 'error' }))}
        >
          <Download /> Ekspor CSV pendaftar & penerima
        </Button>
      </div>
      {l && (
        <StatGrid min={170}>
          <StatCard label="Program" value={l.total.program} icon={<HandCoins />} />
          <StatCard label="Pendaftar" value={l.total.pendaftar} icon={<Users />} />
          <StatCard label="Penerima" value={l.total.diterima} icon={<Trophy />} hint={`Internal ${l.penerima_per_sumber_dana.internal ?? 0} · Pemerintah ${l.penerima_per_sumber_dana.pemerintah ?? 0} · Swasta ${l.penerima_per_sumber_dana.swasta ?? 0}`} />
          <StatCard label="Dicabut" value={l.total.dicabut} icon={<ShieldAlert />} />
          <StatCard label="Dicairkan (tunai)" value={rp(l.total.dicairkan)} icon={<Banknote />} />
        </StatGrid>
      )}
      <DataTable
        columns={[
          { key: 'nama', header: 'Program', cell: (r) => <span className="u-bsw-sel"><strong>{r.nama}</strong><small>{r.kode}</small></span>, value: (r) => r.nama },
          { key: 'sumber_dana', header: 'Sumber dana', cell: (r) => SUMBER_DANA.find((x) => x.value === r.sumber_dana)?.label, value: (r) => r.sumber_dana },
          { key: 'bentuk', header: 'Bentuk', cell: (r) => (r.bentuk === 'potongan_ukt' ? 'Potongan UKT' : 'Tunai'), value: (r) => r.bentuk },
          { key: 'kuota', header: 'Kuota', align: 'end', value: (r) => r.kuota ?? '' },
          { key: 'pendaftar', header: 'Pendaftar', align: 'end', value: (r) => r.rekap?.total ?? 0, cell: (r) => r.rekap?.total ?? 0 },
          { key: 'diterima', header: 'Penerima', align: 'end', value: (r) => r.rekap?.diterima ?? 0, cell: (r) => r.rekap?.diterima ?? 0 },
          { key: 'dicabut', header: 'Dicabut', align: 'end', value: (r) => r.rekap?.dicabut ?? 0, cell: (r) => r.rekap?.dicabut ?? 0 },
          { key: 'dicairkan', header: 'Dicairkan', align: 'end', value: (r) => r.dicairkan.total, cell: (r) => rp(r.dicairkan.total) },
          { key: 'status', header: 'Status', cell: (r) => <LencanaStatusProgram status={r.status} />, value: (r) => r.status },
        ]}
        rows={l?.program}
        rowKey={(r) => String(r.id)}
        loading={d.loading}
        error={d.error}
        exportCsv={`ringkasan-beasiswa-${tahun ?? 'semua'}`}
        empty={{ icon: <FileText />, title: 'Belum ada data' }}
      />
      {l?.lingkup_prodi && (
        <Card variant="muted">
          <CardHeader title="Penerima di unit Anda" description="Penerima dan yang dicabut dari prodi dalam lingkup penugasan Anda." />
          <CardContent>
            <DataTable
              columns={[
                { key: 'nama', header: 'Penerima', cell: (r) => <span className="u-bsw-sel"><strong>{r.nama ?? r.nim}</strong><small>{r.nim} · {r.kode_prodi}</small></span>, value: (r) => r.nama ?? r.nim },
                { key: 'program', header: 'Program', value: (r) => r.program },
                { key: 'nomor_penerima', header: 'Nomor penerima', value: (r) => r.nomor_penerima ?? '' },
                { key: 'status', header: 'Status', cell: (r) => <LencanaStatusPendaftar status={r.status} />, value: (r) => r.status },
              ]}
              rows={l.penerima}
              rowKey={(r) => `${r.kode}-${r.nim}`}
              exportCsv={`penerima-beasiswa-unit-${tahun ?? 'semua'}`}
              empty={{ title: 'Belum ada penerima dari unit Anda' }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ================================================================ mahasiswa (Profil)
const keDate = (s: string) => new Date(s.replace(' ', 'T'));
function sisaWaktu(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(m / 1440);
  const j = Math.floor((m % 1440) / 60);
  const mn = m % 60;
  return h > 0 ? `${h} hari ${j} jam` : j > 0 ? `${j} jam ${mn} menit` : `${mn} menit`;
}

/** Hitung mundur jadwal pendaftaran: "Dibuka dalam …" / "Ditutup dalam …" / "Sudah ditutup" (jam server sebagai patokan). */
export function HitungMundurBeasiswa({ buka, tutup, sekarang }: { buka: string | null; tutup: string | null; sekarang?: string }) {
  const selisih = React.useMemo(() => (sekarang ? keDate(sekarang).getTime() - Date.now() : 0), [sekarang]);
  const [kini, setKini] = React.useState(() => Date.now() + selisih);
  React.useEffect(() => {
    const t = setInterval(() => setKini(Date.now() + selisih), 30_000);
    return () => clearInterval(t);
  }, [selisih]);
  const b = buka ? keDate(buka).getTime() : null;
  const tp = tutup ? keDate(tutup).getTime() : null;
  if (b !== null && kini < b) return <Badge variant="info"><CalendarClock /> Dibuka dalam {sisaWaktu(b - kini)} · {tglJam(buka)}</Badge>;
  if (tp !== null && kini <= tp) return <Badge variant={tp - kini < 86_400_000 ? 'warning' : 'success'}><CalendarClock /> Ditutup dalam {sisaWaktu(tp - kini)} · {tglJam(tutup)}</Badge>;
  if (tp !== null) return <Badge variant="neutral">Sudah ditutup {tglJam(tutup)}</Badge>;
  return null;
}

interface ProgramTerbuka {
  id: number;
  kode: string;
  nama: string;
  jenis: string;
  penyelenggara: string | null;
  keterangan: string | null;
  tahun_nama: string | null;
  sumber_dana: string;
  bentuk: string;
  nominal: number | null;
  periode_pencairan: string;
  kuota: number | null;
  daftar_mulai: string | null;
  daftar_selesai: string | null;
  pengumuman_tanggal: string | null;
  wawancara: boolean;
  prodi: string[] | null;
  syarat: string[];
  berkas: BerkasBeasiswa[];
  isian: IsianBeasiswa[];
  minta_penghasilan: boolean;
  tahap_fakultas: boolean;
  buka_at: string | null;
  tutup_at: string | null;
  sekarang: string;
  dibuka: boolean;
  syarat_saya: (ButirSyarat & { kode: string })[];
  memenuhi: boolean;
  kurang: string[];
  sudah_daftar: boolean;
  pendaftar_id: number | null;
}
interface PendaftaranSaya {
  id: number;
  beasiswa_id: number;
  program: { kode: string; nama: string; status: string; bentuk: string; nominal: number | null; pengumuman_tanggal: string | null };
  status: PendaftarBeasiswa['status'];
  catatan: string | null;
  created_at: string;
  ipk: number | null;
  isian: Record<string, string>;
  berkas: { kode: string; nama: string; wajib: boolean; nama_berkas: string | null; status: string; catatan: string | null }[];
  boleh_lengkapi: boolean;
  tutup_at: string | null;
  wawancara: { jadwal: string; tempat: string | null } | null;
  nomor_penerima: string | null;
  sk: { nomor: string | null; tanggal: string | null } | null;
  pemeriksa: TahapPemeriksa[];
  evaluasi: { tahun_id: string; ipk: number | null; hasil: string; catatan: string | null }[];
  pencairan: { id: number; tahun_id: string; tanggal: string | null; nominal: number; cara: string; status: string; keterangan: string | null }[];
}
interface BeasiswaSayaData {
  berlaku: boolean;
  program: ProgramTerbuka[];
  pendaftaran: PendaftaranSaya[];
}

export function useBeasiswaSaya() {
  return useSiakadQuery<BeasiswaSayaData>(['beasiswa', 'saya'], q('/v1/profil/saya/beasiswa'));
}

/** Kartu ringkas di beranda Profil: jumlah program terbuka yang syaratnya terpenuhi dan status pendaftaran terakhir. */
export function KartuBeasiswaSaya({ href = '/beasiswa', className }: { href?: string; className?: string }) {
  const d = useBeasiswaSaya();
  if (!d.data?.berlaku) return null;
  const memenuhi = d.data.program.filter((p) => p.memenuhi && !p.sudah_daftar).length;
  const terakhir = d.data.pendaftaran[0];
  return (
    <Card className={cn('u-bsw-kartu', className)} interactive render={<a href={href} />}>
      <CardHeader title="Beasiswa" description={`${d.data.program.length} program dibuka · ${memenuhi} sesuai syarat Anda`} action={<HandCoins aria-hidden />} />
      <CardContent>
        {terakhir ? (
          <span className="u-bsw-sel">
            <strong>{terakhir.program.nama}</strong>
            <span>
              <LencanaStatusPendaftar status={terakhir.status} />
            </span>
          </span>
        ) : (
          <p className="u-bsw-ket">{memenuhi ? 'Ada beasiswa yang bisa Anda daftar.' : 'Lihat program beasiswa dan syaratnya.'}</p>
        )}
      </CardContent>
    </Card>
  );
}

/** Halaman Beasiswa di Profil: program terbuka dengan syarat terpenuhi/belum, wizard daftar, status pendaftaran. */
export function BeasiswaSaya({ className }: { className?: string }) {
  const d = useBeasiswaSaya();
  const [daftar, setDaftar] = React.useState<ProgramTerbuka | null>(null);
  const [lengkapi, setLengkapi] = React.useState<PendaftaranSaya | null>(null);
  if (d.loading && !d.data) return <Skeleton style={{ height: 360 }} />;
  if (d.error) return <Alert variant="danger" title="Beasiswa belum bisa dimuat">{galat(d.error)}</Alert>;
  const data = d.data!;
  if (!data.berlaku) return <Empty bordered icon={<HandCoins />} title="Beasiswa untuk mahasiswa" description="Halaman ini menampilkan program beasiswa dan pendaftaran untuk akun mahasiswa." />;
  return (
    <div className={cn('u-bsw u-bsw-saya', className)}>
      {data.pendaftaran.length > 0 && (
        <section className="u-bsw-form">
          <h2 className="u-bsw-h">Pendaftaran saya</h2>
          {data.pendaftaran.map((r) => (
            <Card key={r.id}>
              <CardHeader title={r.program.nama} description={`Didaftarkan ${tgl(r.created_at)} · ${r.program.bentuk === 'potongan_ukt' ? 'Potongan UKT' : 'Bantuan tunai'} ${rp(r.program.nominal)}`} action={<LencanaStatusPendaftar status={r.status} />} />
              <CardContent>
                <div className="u-bsw-form">
                  {r.status === 'diterima' && (
                    <Alert variant="success" icon={<Trophy />} title="Selamat, Anda penerima beasiswa">
                      Nomor penerima {r.nomor_penerima ?? '-'}
                      {r.sk?.nomor ? `, SK ${r.sk.nomor} tanggal ${tgl(r.sk.tanggal)}` : ''}.
                    </Alert>
                  )}
                  {r.catatan && r.status !== 'diterima' && <Alert variant={r.status === 'ditolak' || r.status === 'dicabut' ? 'danger' : 'warning'}>{r.catatan}</Alert>}
                  <AlurPemeriksa pemeriksa={[{ tahap: 'diajukan', urut: 0, judul: `Diajukan ${tglJam(r.created_at)}`, unit: 'Mahasiswa', peran: null, status: 'selesai' }, ...r.pemeriksa]} judul="Tahapan dan pemeriksa" />
                  {r.wawancara && (
                    <Alert variant="info" icon={<CalendarClock />} title="Jadwal wawancara">
                      {tglJam(r.wawancara.jadwal)}
                      {r.wawancara.tempat ? ` · ${r.wawancara.tempat}` : ''}
                    </Alert>
                  )}
                  <ul className="u-bsw-list">
                    {r.berkas.map((b) => (
                      <li key={b.kode}>
                        {b.nama}: <Badge variant={b.status === 'sah' ? 'success' : b.status === 'tidak_sah' ? 'danger' : 'neutral'}>{{ sah: 'Sah', tidak_sah: 'Perlu diganti', menunggu: 'Menunggu diperiksa', belum: 'Belum diunggah' }[b.status] ?? b.status}</Badge>
                        {b.catatan ? ` ${b.catatan}` : ''}
                      </li>
                    ))}
                  </ul>
                  {r.boleh_lengkapi && (
                    <Button variant="outline" onClick={() => setLengkapi(r)} style={{ justifySelf: 'start' }}>
                      <FilePlus2 /> {r.berkas.some((b) => b.status === 'tidak_sah') ? 'Perbaiki berkas' : 'Ganti/lengkapi berkas'}
                    </Button>
                  )}
                  {r.boleh_lengkapi && r.tutup_at && <p className="u-bsw-ket">Berkas bisa diperbaiki sampai {tglJam(r.tutup_at)} (atau selama diminta petugas).</p>}
                  {r.evaluasi.length > 0 && (
                    <DescriptionList items={r.evaluasi.map((e) => ({ label: `Evaluasi ${e.tahun_id}`, value: <span><Badge variant={HASIL_EVAL[e.hasil]?.[1] ?? 'neutral'}>{HASIL_EVAL[e.hasil]?.[0] ?? e.hasil}</Badge> {e.catatan}</span> }))} />
                  )}
                  {r.pencairan.length > 0 && (
                    <DescriptionList items={r.pencairan.map((c) => ({ label: `Pencairan ${c.tahun_id}`, value: `${rp(c.nominal)} · ${c.status === 'dicairkan' ? `dicairkan ${tgl(c.tanggal)}` : c.status === 'gagal' ? 'gagal' : 'dijadwalkan'}` }))} />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
      <section className="u-bsw-form">
        <h2 className="u-bsw-h">Program yang sedang dibuka</h2>
        {data.program.length === 0 ? (
          <Empty bordered icon={<HandCoins />} title="Belum ada pendaftaran beasiswa yang dibuka" description="Program baru diumumkan di Kabar dan newsroom Humas." />
        ) : (
          <div className="u-bsw-grid">
            {data.program.map((p) => (
              <Card key={p.id} className="u-bsw-program" data-memenuhi={p.memenuhi ? '' : undefined}>
                <CardHeader
                  title={p.nama}
                  description={`${p.penyelenggara ?? 'UNIPO'} · ${p.bentuk === 'potongan_ukt' ? 'Potongan UKT' : 'Bantuan tunai'} ${rp(p.nominal)}`}
                  action={p.sudah_daftar ? <Badge variant="info">Sudah mendaftar</Badge> : p.memenuhi ? <Badge variant="success">Anda memenuhi syarat</Badge> : <Badge variant="danger">Belum memenuhi</Badge>}
                />
                <CardContent>
                  <div className="u-bsw-form">
                    <HitungMundurBeasiswa buka={p.buka_at} tutup={p.tutup_at} sekarang={p.sekarang} />
                    <p className="u-bsw-ket">
                      Pendaftaran {tglJam(p.buka_at)} – {tglJam(p.tutup_at)}
                      {p.kuota ? ` · kuota ${p.kuota}` : ''}
                      {p.pengumuman_tanggal ? ` · diumumkan ${tgl(p.pengumuman_tanggal)}` : ''}
                    </p>
                    <p className="u-bsw-ket">Alur: diajukan → {p.tahap_fakultas ? 'rekomendasi fakultas/prodi → ' : ''}verifikasi BAAK → {p.wawancara ? 'wawancara → ' : ''}penetapan → pencairan BAUK.</p>
                    {p.keterangan && <p>{p.keterangan}</p>}
                    <DaftarSyarat items={p.syarat_saya} />
                    {!p.memenuhi && !p.sudah_daftar && <Alert variant="warning">Belum terpenuhi: {p.kurang.join('; ')}.</Alert>}
                    {!p.sudah_daftar && (
                      <Button onClick={() => setDaftar(p)} disabled={!p.memenuhi || !p.dibuka} style={{ justifySelf: 'start' }}>
                        <Send /> {p.dibuka ? 'Ajukan' : 'Belum dibuka'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
      {daftar && <PanelDaftarBeasiswa program={daftar} onOpenChange={(o) => !o && setDaftar(null)} />}
      {lengkapi && <PanelLengkapiBerkas pendaftaran={lengkapi} onClose={() => setLengkapi(null)} />}
    </div>
  );
}

/** Wizard pendaftaran beasiswa mahasiswa: syarat, isian, berkas, ringkasan. */
export function PanelDaftarBeasiswa({ program: p, onOpenChange }: { program: ProgramTerbuka; onOpenChange: (open: boolean) => void }) {
  const s = useSiakad();
  const toast = useToast();
  const [step, setStep] = React.useState(0);
  const [isian, setIsian] = React.useState<Record<string, string>>({});
  const [berkas, setBerkas] = React.useState<Record<string, string | null>>({});
  const [namaBerkas, setNamaBerkas] = React.useState<Record<string, string>>({});
  const [penghasilan, setPenghasilan] = React.useState('');
  const [alasan, setAlasan] = React.useState('');
  const [setuju, setSetuju] = React.useState(false);
  return (
    <PanelLangkah
      open
      onOpenChange={onOpenChange}
      title={`Daftar ${p.nama}`}
      description="Syarat dari data SIAKAD sudah dicek. Lengkapi isian dan unggah berkas."
      size="lg"
      step={step}
      onStepChange={setStep}
      finishLabel="Kirim pendaftaran"
      steps={[
        {
          id: 'syarat',
          title: 'Syarat',
          description: 'Hasil cek otomatis dari data Anda di SIAKAD.',
          validate: () => (p.memenuhi ? null : 'Syarat belum terpenuhi.'),
          content: (
            <div className="u-bsw-form">
              <DaftarSyarat items={p.syarat_saya} />
              <p className="u-bsw-ket">Tanda tanya = diperiksa petugas dari berkas atau isian Anda.</p>
            </div>
          ),
        },
        {
          id: 'isian',
          title: 'Isian',
          description: 'Data tambahan yang diminta program.',
          validate: () => {
            for (const f of p.isian) if (f.wajib && !(isian[f.kode] ?? '').trim()) return `Isi ${f.label}.`;
            if (p.minta_penghasilan && penghasilan.trim() === '') return 'Isi penghasilan orang tua per bulan.';
            return null;
          },
          content: (
            <div className="u-bsw-form">
              {p.minta_penghasilan && (
                <Field label="Penghasilan orang tua per bulan (Rp)" required description="Dibuktikan dengan berkas, mis. slip gaji atau surat keterangan penghasilan.">
                  <Input inputMode="numeric" value={penghasilan} onChange={(e) => setPenghasilan(e.target.value.replace(/[^\d]/g, ''))} />
                </Field>
              )}
              {p.isian.map((f) => (
                <Field key={f.kode} label={f.label} required={f.wajib} optional={!f.wajib}>
                  {f.tipe === 'panjang' ? (
                    <Textarea rows={4} value={isian[f.kode] ?? ''} onChange={(e) => setIsian({ ...isian, [f.kode]: e.target.value })} />
                  ) : f.tipe === 'pilihan' ? (
                    <Select options={f.opsi.map((o) => ({ value: o, label: o }))} value={isian[f.kode] ?? null} onValueChange={(v) => setIsian({ ...isian, [f.kode]: v ?? '' })} />
                  ) : (
                    <Input inputMode={f.tipe === 'angka' ? 'decimal' : undefined} value={isian[f.kode] ?? ''} onChange={(e) => setIsian({ ...isian, [f.kode]: e.target.value })} />
                  )}
                </Field>
              ))}
              <Field label="Alasan mendaftar" optional>
                <Textarea rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} />
              </Field>
            </div>
          ),
        },
        {
          id: 'berkas',
          title: 'Berkas',
          description: 'PDF atau gambar. Petugas BAAK memeriksa keabsahannya.',
          validate: () => {
            for (const b of p.berkas) if (b.wajib && !berkas[b.kode]) return `Unggah ${b.nama}.`;
            return null;
          },
          content: (
            <div className="u-bsw-form">
              {p.berkas.length === 0 && <p className="u-bsw-ket">Program ini tidak meminta berkas.</p>}
              {p.berkas.map((b) => (
                <Field key={b.kode} label={b.nama} required={b.wajib} optional={!b.wajib} description={b.keterangan || undefined}>
                  <PilihBerkas
                    value={berkas[b.kode] ?? null}
                    onValueChange={(id, f) => {
                      setBerkas({ ...berkas, [b.kode]: id });
                      if (f?.nama) setNamaBerkas({ ...namaBerkas, [b.kode]: f.nama });
                    }}
                    accept=".pdf,.jpg,.jpeg,.png"
                    modul="kemahasiswaan"
                    kategori="beasiswa"
                  />
                </Field>
              ))}
            </div>
          ),
        },
        {
          id: 'ringkasan',
          title: 'Ringkasan',
          description: 'Periksa lalu kirim. Setelah dikirim, status bisa dipantau di halaman ini.',
          validate: () => (setuju ? null : 'Centang pernyataan kebenaran data.'),
          content: (
            <div className="u-bsw-form">
              <WizardReview
                sections={[
                  { title: 'Program', items: [{ label: 'Beasiswa', value: p.nama }, { label: 'Bantuan', value: `${p.bentuk === 'potongan_ukt' ? 'Potongan UKT' : 'Tunai'} ${rp(p.nominal)}` }] },
                  { title: 'Isian', onEdit: () => setStep(1), items: [...(p.minta_penghasilan ? [{ label: 'Penghasilan orang tua', value: rp(Number(penghasilan || 0)) }] : []), ...p.isian.map((f) => ({ label: f.label, value: isian[f.kode] || '-' })), { label: 'Alasan', value: alasan || '-' }] },
                  { title: 'Berkas', onEdit: () => setStep(2), items: p.berkas.map((b) => ({ label: b.nama, value: berkas[b.kode] ? (namaBerkas[b.kode] ?? 'Terunggah') : 'Tidak diunggah' })) },
                ]}
              />
              <label className="u-bsw-cek-satu">
                <Checkbox checked={setuju} onCheckedChange={(c) => setSetuju(!!c)} /> Saya menyatakan data dan berkas yang saya kirim benar.
              </label>
            </div>
          ),
        },
      ]}
      onFinish={async () => {
        try {
          await s.request({ method: 'POST', path: `/v1/profil/saya/beasiswa/${p.id}/daftar`, body: { isian, berkas: Object.fromEntries(Object.entries(berkas).filter(([, v]) => v)), penghasilan_ortu: penghasilan === '' ? null : Number(penghasilan), alasan } });
          toast.add({ title: 'Pendaftaran terkirim', description: 'Menunggu verifikasi berkas oleh BAAK.', type: 'success' });
          invalidateSiakad('beasiswa');
          return null;
        } catch (e) {
          return galat(e);
        }
      }}
    />
  );
}

function PanelLengkapiBerkas({ pendaftaran: r, onClose }: { pendaftaran: PendaftaranSaya; onClose: () => void }) {
  const s = useSiakad();
  const toast = useToast();
  const perlu = r.berkas.some((b) => b.status === 'tidak_sah' || b.status === 'belum') ? r.berkas.filter((b) => b.status === 'tidak_sah' || b.status === 'belum') : r.berkas;
  const [berkas, setBerkas] = React.useState<Record<string, string | null>>({});
  const [kirim, setKirim] = React.useState(false);
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title="Lengkapi berkas"
      description={r.program.nama}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            disabled={kirim || !Object.values(berkas).some(Boolean)}
            onClick={async () => {
              setKirim(true);
              try {
                await s.request({ method: 'POST', path: `/v1/profil/saya/beasiswa/pendaftaran/${r.id}/berkas`, body: { berkas: Object.fromEntries(Object.entries(berkas).filter(([, v]) => v)) } });
                toast.add({ title: 'Berkas terkirim', type: 'success' });
                invalidateSiakad('beasiswa');
                onClose();
              } catch (e) {
                toast.add({ title: 'Belum berhasil', description: galat(e), type: 'error' });
              } finally {
                setKirim(false);
              }
            }}
          >
            <Send /> Kirim berkas
          </Button>
        </>
      }
    >
      <div className="u-bsw-form">
        {perlu.map((b) => (
          <Field key={b.kode} label={b.nama} description={b.catatan ?? undefined} required={b.wajib}>
            <PilihBerkas value={berkas[b.kode] ?? null} onValueChange={(id) => setBerkas({ ...berkas, [b.kode]: id })} accept=".pdf,.jpg,.jpeg,.png" modul="kemahasiswaan" kategori="beasiswa" />
          </Field>
        ))}
      </div>
    </Sheet>
  );
}

// ================================================================ Humas
interface PublikasiRow {
  id: number;
  beasiswa_id: number;
  jenis: 'pembukaan' | 'penerima';
  judul: string;
  isi: string | null;
  status: 'draf' | 'terbit';
  konten_id: number | null;
  diterbitkan_oleh: string | null;
  diterbitkan_at: string | null;
  updated_at: string;
  program_nama: string;
  program_kode: string;
  program_status: string;
}

/** Humas » Beasiswa: draf pengumuman pembukaan program dan penerima, disunting lalu diterbitkan ke portal (topik beasiswa). */
export function PublikasiBeasiswa({ tautanPengumuman = (id: number) => `/pengumuman/${id}`, className }: { tautanPengumuman?: (kontenId: number) => string; className?: string }) {
  const d = useSiakadQuery<PublikasiRow[]>(['beasiswa', 'publikasi'], q('/v1/humas/beasiswa/publikasi'));
  const [pilih, setPilih] = React.useState<PublikasiRow | null>(null);
  return (
    <div className={cn('u-bsw', className)}>
      <Alert variant="info" icon={<Megaphone />}>
        Draf dibuat otomatis saat BAAK membuka program dan menetapkan penerima. Pengumuman penerima hanya memuat nama dan prodi (tanpa NIM, IPK, atau penghasilan). Sunting seperlunya, lalu terbitkan.
      </Alert>
      <DataTable
        columns={[
          { key: 'judul', header: 'Pengumuman', cell: (r) => <span className="u-bsw-sel"><strong>{r.judul}</strong><small>{r.program_nama} · {r.program_kode}</small></span>, value: (r) => r.judul },
          { key: 'jenis', header: 'Jenis', cell: (r) => <Badge variant={r.jenis === 'pembukaan' ? 'info' : 'primary'}>{r.jenis === 'pembukaan' ? 'Pembukaan program' : 'Penerima'}</Badge>, value: (r) => r.jenis },
          { key: 'status', header: 'Status', cell: (r) => (r.status === 'terbit' ? <Badge variant="success">Terbit {tgl(r.diterbitkan_at)}</Badge> : <Badge variant="warning">Draf</Badge>), value: (r) => r.status },
          { key: 'updated_at', header: 'Diperbarui', cell: (r) => tglJam(r.updated_at), value: (r) => r.updated_at },
        ]}
        rows={d.data}
        rowKey={(r) => String(r.id)}
        loading={d.loading}
        error={d.error}
        onRetry={d.refetch}
        onRowClick={setPilih}
        empty={{ icon: <Megaphone />, title: 'Belum ada pengumuman beasiswa', description: 'Draf muncul saat BAAK membuka pendaftaran program.' }}
      />
      {pilih && <PanelPublikasi row={pilih} tautan={tautanPengumuman} onClose={() => setPilih(null)} />}
    </div>
  );
}

function PanelPublikasi({ row, tautan, onClose }: { row: PublikasiRow; tautan: (id: number) => string; onClose: () => void }) {
  const aksi = useAksiBeasiswa();
  const [judul, setJudul] = React.useState(row.judul);
  const [isi, setIsi] = React.useState(row.isi ?? '');
  const [terbit, setTerbit] = React.useState(false);
  const draf = row.status === 'draf';
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={draf ? 'Sunting pengumuman beasiswa' : 'Pengumuman beasiswa'}
      description={`${row.program_nama} · ${row.jenis === 'pembukaan' ? 'pembukaan program' : 'penerima'}`}
      size="lg"
      footer={
        draf ? (
          <>
            <Button variant="ghost" onClick={() => void aksi(`/v1/humas/beasiswa/publikasi/${row.id}`, { judul, isi }, 'Draf disimpan.').catch(() => undefined)}>
              Simpan draf
            </Button>
            <Button onClick={() => setTerbit(true)}>
              <Megaphone /> Terbitkan
            </Button>
          </>
        ) : row.konten_id ? (
          <Button render={<a href={tautan(row.konten_id)} target="_blank" rel="noreferrer" />} variant="outline">
            <ExternalLink /> Lihat di portal
          </Button>
        ) : undefined
      }
    >
      <div className="u-bsw-form">
        <Field label="Judul" required>
          <Input value={judul} onChange={(e) => setJudul(e.target.value)} disabled={!draf} />
        </Field>
        <Field label="Isi" required description="Baris diawali '- ' menjadi daftar; baris '1. ' menjadi daftar bernomor.">
          <Textarea rows={18} value={isi} onChange={(e) => setIsi(e.target.value)} disabled={!draf} />
        </Field>
        {!draf && <Alert variant="success">Sudah terbit {tglJam(row.diterbitkan_at)} oleh {row.diterbitkan_oleh}. Perubahan berikutnya lewat menu Pengumuman.</Alert>}
      </div>
      {terbit && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setTerbit(false)}
          title="Terbitkan pengumuman?"
          description="Tayang sebagai pengumuman universitas bertopik Beasiswa (newsroom, PMB, SIAKAD mahasiswa). BAAK mendapat Kabar."
          confirmLabel="Terbitkan"
          onConfirm={async () => {
            await aksi(`/v1/humas/beasiswa/publikasi/${row.id}`, { judul, isi });
            await aksi(`/v1/humas/beasiswa/publikasi/${row.id}/terbit`, {}, 'Pengumuman terbit.');
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}

interface ProgramPublik extends Omit<ProgramTerbuka, 'syarat_saya' | 'memenuhi' | 'kurang' | 'sudah_daftar' | 'pendaftar_id' | 'isian'> {
  status: string;
  dibuka: boolean;
  pengumuman: { jenis: string; judul: string; konten_id: number; slug: string | null; diterbitkan_at: string }[];
}

/** Halaman publik daftar beasiswa (newsroom Humas, token aplikasi): program dibuka dan pengumuman terbit, tanpa data pendaftar. */
export function DaftarBeasiswaPublik({ urlDaftar = 'https://profile.unipo.ac.id/beasiswa', tautanPengumuman = (k: string | number) => `/pengumuman/${k}`, className }: { urlDaftar?: string; tautanPengumuman?: (slugAtauId: string | number) => string; className?: string }) {
  const d = useSiakadQuery<{ program: ProgramPublik[] }>(['beasiswa', 'publik'], q('/v1/humas/beasiswa'));
  if (d.loading && !d.data) return <Skeleton style={{ height: 320 }} />;
  if (d.error) return <Alert variant="danger">{galat(d.error)}</Alert>;
  const rows = d.data?.program ?? [];
  if (!rows.length) return <Empty bordered icon={<HandCoins />} title="Belum ada beasiswa yang dibuka" description="Pantau halaman ini dan pengumuman universitas." />;
  return (
    <div className={cn('u-bsw-grid', className)}>
      {rows.map((p) => (
        <Card key={p.id} className="u-bsw-program">
          <CardHeader title={p.nama} description={`${p.penyelenggara ?? 'UNIPO'} · ${SUMBER_DANA.find((x) => x.value === p.sumber_dana)?.label ?? ''}`} action={p.dibuka ? <Badge variant="success">Pendaftaran dibuka</Badge> : <LencanaStatusProgram status={p.status} />} />
          <CardContent>
            <div className="u-bsw-form">
              {p.keterangan && <p>{p.keterangan}</p>}
              <DescriptionList
                items={[
                  { label: 'Bantuan', value: `${p.bentuk === 'potongan_ukt' ? 'Potongan UKT' : 'Bantuan tunai'} ${rp(p.nominal)}` },
                  { label: 'Kuota', value: p.kuota ? `${p.kuota} penerima` : 'Tidak dibatasi' },
                  { label: 'Pendaftaran', value: `${tgl(p.daftar_mulai)} – ${tgl(p.daftar_selesai)}` },
                  ...(p.pengumuman_tanggal ? [{ label: 'Pengumuman', value: tgl(p.pengumuman_tanggal) }] : []),
                  ...(p.prodi ? [{ label: 'Untuk prodi', value: p.prodi.join(', ') }] : []),
                ]}
              />
              {(p.syarat.length > 0 || p.berkas.length > 0) && (
                <ul className="u-bsw-list">
                  {p.syarat.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                  {p.berkas.map((b) => (
                    <li key={b.kode}>
                      Berkas: {b.nama}
                      {b.wajib ? '' : ' (bila ada)'}
                    </li>
                  ))}
                </ul>
              )}
              <div className="u-bsw-aksi">
                {p.dibuka && (
                  <Button render={<a href={urlDaftar} />}>
                    <Send /> Daftar lewat Profil UNIPO
                  </Button>
                )}
                {p.pengumuman.map((u) => (
                  <Button key={u.konten_id} variant="outline" render={<a href={tautanPengumuman(u.slug ?? u.konten_id)} />}>
                    <Megaphone /> {u.jenis === 'penerima' ? 'Pengumuman penerima' : 'Pengumuman'}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ================================================================ Keuangan (BAUK)
interface PencairanData {
  tahun_id: string;
  tahun_nama: string;
  ringkas: { penerima: number; potongan_terpasang: number; tunai_rencana: number; tunai_dicairkan: number; nominal_dicairkan: number };
  program: {
    id: number;
    kode: string;
    nama: string;
    status: string;
    bentuk: 'potongan_ukt' | 'tunai';
    sumber_dana: string;
    nominal: number | null;
    periode_pencairan: string;
    nomor_sk: string | null;
    skema_potongan_id: number | null;
    penerima: {
      pendaftar_id: number;
      nim: string;
      nama: string | null;
      kode_prodi: string;
      nomor_penerima: string | null;
      potongan?: { pengajuan_id: number; nomor: string; status: string; diterapkan: boolean; nominal: number } | null;
      pencairan?: { id: number; tanggal: string | null; nominal: number; cara: string; status: string; keterangan: string | null; bukti: number } | null;
    }[];
  }[];
}

/** BAUK » Pencairan beasiswa: penerima potongan UKT (pengajuan & terapan tagihan) dan pencairan tunai dengan bukti. */
export function PencairanBeasiswa({ className }: { className?: string }) {
  const [tahun, setTahun] = React.useState<string | null>(null);
  const d = useSiakadQuery<PencairanData>(['beasiswa', 'pencairan', tahun ?? ''], q(`/v1/keuangan/beasiswa/pencairan${tahun ? `?tahun_id=${tahun}` : ''}`));
  const aksi = useAksiBeasiswa();
  const [cair, setCair] = React.useState<{ program: PencairanData['program'][number]; baris: PencairanData['program'][number]['penerima'][number] } | null>(null);
  const data = d.data;
  return (
    <div className={cn('u-bsw', className)}>
      <div className="u-bsw-pilih">
        <PilihTahunAkademik aria-label="Periode" placeholder={data ? `Periode aktif (${data.tahun_nama})` : 'Pilih…'} value={tahun} onValueChange={setTahun} />
      </div>
      {d.error && <Alert variant="danger">{galat(d.error)}</Alert>}
      {data && (
        <StatGrid min={170}>
          <StatCard label="Penerima" value={data.ringkas.penerima} icon={<Users />} />
          <StatCard label="Potongan UKT terpasang" value={data.ringkas.potongan_terpasang} icon={<HandCoins />} />
          <StatCard label="Tunai belum cair" value={data.ringkas.tunai_rencana} icon={<CalendarClock />} />
          <StatCard label="Tunai dicairkan" value={rp(data.ringkas.nominal_dicairkan)} hint={`${data.ringkas.tunai_dicairkan} penerima`} icon={<Banknote />} />
        </StatGrid>
      )}
      {data && data.program.length === 0 && <Empty bordered icon={<HandCoins />} title="Belum ada penerima beasiswa" description="Penerima muncul setelah BAAK menetapkan penerima program." />}
      {data?.program.map((p) => (
        <Card key={p.id}>
          <CardHeader
            title={p.nama}
            description={`${p.kode} · ${p.bentuk === 'potongan_ukt' ? 'Potongan UKT' : 'Tunai'} ${rp(p.nominal)}${p.nomor_sk ? ` · SK ${p.nomor_sk}` : ''}`}
            action={
              p.bentuk === 'potongan_ukt' ? (
                <Button variant="outline" size="sm" onClick={() => void aksi(`/v1/keuangan/beasiswa/program/${p.id}/potongan`, {}, 'Potongan UKT dipasang/diterapkan ulang.').catch(() => undefined)}>
                  <Wand2 /> Pasang & terapkan potongan
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => void aksi(`/v1/keuangan/beasiswa/program/${p.id}/pencairan`, { tahun_id: tahun ?? data.tahun_id }, 'Daftar pencairan dibuat.').catch(() => undefined)}>
                  <Plus /> Buat daftar pencairan {data.tahun_nama}
                </Button>
              )
            }
          />
          <CardContent>
            <DataTable
              columns={[
                { key: 'nama', header: 'Penerima', cell: (r) => <span className="u-bsw-sel"><strong>{r.nama ?? r.nim}</strong><small>{r.nim} · {r.nomor_penerima ?? '-'}</small></span>, value: (r) => r.nama ?? r.nim },
                ...(p.bentuk === 'potongan_ukt'
                  ? [
                      {
                        key: 'potongan',
                        header: 'Potongan UKT',
                        cell: (r: PencairanData['program'][number]['penerima'][number]) =>
                          !r.potongan ? <Badge variant="neutral">Belum dipasang</Badge> : r.potongan.diterapkan ? <Badge variant="success">Terpotong {rp(r.potongan.nominal)}</Badge> : <Badge variant="warning">{r.potongan.status === 'disetujui' ? 'Disetujui, menunggu tagihan' : r.potongan.status}</Badge>,
                      },
                      { key: 'nomor', header: 'No. pengajuan', cell: (r: PencairanData['program'][number]['penerima'][number]) => r.potongan?.nomor ?? '-' },
                    ]
                  : [
                      {
                        key: 'pencairan',
                        header: 'Pencairan',
                        cell: (r: PencairanData['program'][number]['penerima'][number]) =>
                          !r.pencairan ? <Badge variant="neutral">Belum dibuat</Badge> : <Badge variant={r.pencairan.status === 'dicairkan' ? 'success' : r.pencairan.status === 'gagal' ? 'danger' : 'warning'}>{r.pencairan.status === 'dicairkan' ? `Dicairkan ${tgl(r.pencairan.tanggal)}` : r.pencairan.status === 'gagal' ? 'Gagal' : 'Rencana'}</Badge>,
                      },
                      { key: 'nominal', header: 'Nominal', align: 'end' as const, cell: (r: PencairanData['program'][number]['penerima'][number]) => rp(r.pencairan?.nominal ?? p.nominal) },
                      { key: 'bukti', header: 'Bukti', align: 'end' as const, cell: (r: PencairanData['program'][number]['penerima'][number]) => r.pencairan?.bukti ?? 0 },
                    ]),
              ]}
              rows={p.penerima}
              rowKey={(r) => String(r.pendaftar_id)}
              pagination={false}
              exportCsv={`pencairan-${p.kode}-${data.tahun_id}`}
              rowActions={p.bentuk === 'tunai' ? (r) => (r.pencairan ? [{ label: 'Catat pencairan', icon: <Banknote />, onSelect: () => setCair({ program: p, baris: r }) }] : []) : undefined}
              onRowClick={p.bentuk === 'tunai' ? (r) => r.pencairan && setCair({ program: p, baris: r }) : undefined}
            />
          </CardContent>
        </Card>
      ))}
      {cair && <PanelCair data={cair} onClose={() => setCair(null)} />}
    </div>
  );
}

function PanelCair({ data, onClose }: { data: { program: PencairanData['program'][number]; baris: PencairanData['program'][number]['penerima'][number] }; onClose: () => void }) {
  const aksi = useAksiBeasiswa();
  const c = data.baris.pencairan!;
  const [f, setF] = React.useState({ status: c.status === 'rencana' ? 'dicairkan' : c.status, tanggal: c.tanggal ?? new Date().toISOString().slice(0, 10), cara: c.cara === 'potong_ukt' ? 'transfer' : c.cara, berkas_id: null as string | null, keterangan: c.keterangan ?? '' });
  const [galatTeks, setGalatTeks] = React.useState<string | null>(null);
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title="Catat pencairan"
      description={`${data.baris.nama ?? data.baris.nim} · ${data.program.nama} · ${rp(c.nominal)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            onClick={async () => {
              if (f.status === 'dicairkan' && !f.berkas_id && !c.bukti) return setGalatTeks('Unggah bukti pencairan.');
              try {
                await aksi(`/v1/keuangan/beasiswa/pencairan/${c.id}`, f, 'Pencairan dicatat.');
                onClose();
              } catch (e) {
                setGalatTeks(galat(e));
              }
            }}
          >
            <CheckCheck /> Simpan
          </Button>
        </>
      }
    >
      <div className="u-bsw-form">
        {galatTeks && <Alert variant="danger">{galatTeks}</Alert>}
        <Field label="Status" required>
          <Select options={[{ value: 'dicairkan', label: 'Dicairkan' }, { value: 'gagal', label: 'Gagal' }, { value: 'rencana', label: 'Rencana' }]} value={f.status} onValueChange={(v) => setF({ ...f, status: v ?? 'dicairkan' })} />
        </Field>
        <FormGrid>
          <Field label="Tanggal">
            <IsianTanggal value={f.tanggal} onValueChange={(v) => setF({ ...f, tanggal: v })} />
          </Field>
          <Field label="Cara">
            <Select options={[{ value: 'transfer', label: 'Transfer bank' }, { value: 'tunai', label: 'Tunai' }, { value: 'lainnya', label: 'Lainnya' }]} value={f.cara} onValueChange={(v) => setF({ ...f, cara: v ?? 'transfer' })} />
          </Field>
        </FormGrid>
        <Field label="Bukti pencairan" required={f.status === 'dicairkan' && !c.bukti} description={c.bukti ? `${c.bukti} bukti sudah terlampir.` : 'Bukti transfer atau tanda terima.'}>
          <PilihBerkas value={f.berkas_id} onValueChange={(id) => setF({ ...f, berkas_id: id })} accept=".pdf,.jpg,.jpeg,.png" modul="kemahasiswaan" kategori="beasiswa" />
        </Field>
        <Field label="Keterangan" optional>
          <Input value={f.keterangan} onChange={(e) => setF({ ...f, keterangan: e.target.value })} />
        </Field>
      </div>
    </Sheet>
  );
}
