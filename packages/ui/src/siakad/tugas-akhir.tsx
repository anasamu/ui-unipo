'use client';
import * as React from 'react';
import { AlurPemeriksa, type TahapPemeriksa } from './pemeriksa';
import {
  BookOpenCheck,
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock,
  Download,
  FileText,
  GraduationCap,
  History,
  Paperclip,
  Pencil,
  Plus,
  Send,
  Settings2,
  Trash2,
  TriangleAlert,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Card, DescriptionList, Empty, Progress, Tabs } from '../components/display';
import { Field, Input, SegmentedControl, Switch, Textarea } from '../components/forms';
import { Pilihan } from '../components/formulir';
import { ConfirmDialog, Dialog, Sheet, useToast } from '../components/overlays';
import { useUnggahBerkas } from './berkas';
import { GalatApi } from './galat';
import { PilihEntitas, type SumberEntitas } from './pilih';
import { PilihDosenBersyarat } from './aturan-fakultas';
import { invalidateSiakad, pesanGalat, useSaatInvalidasi, useSiakad, useSiakadQuery } from './provider';
import { LabelProdi, namaRapi } from './prodi';
import { IsianBerkas, TombolPilihBerkas } from '../components/pilih-berkas-lokal';
import { Tekan } from '../components/tekan';

/*
 * Tugas akhir/skripsi (/v1/ta) dan syarat kelulusan mahasiswa (/v1/kelulusan): mahasiswa mengajukan judul dengan
 * berkas pendukung (surat pengajuan judul, draf proposal, ...), dosen PA lalu prodi memvalidasi (setuju, revisi,
 * tolak), prodi menetapkan pembimbing, dan progres tugas akhir sampai wisuda bisa dipantau. Judul yang disetujui
 * ditulis SIAKAD ke data tugas akhir lama, jadi bimbingan, seminar, dan ujian tetap memakai data yang sama.
 */

// ================================================================ Tipe
export type StatusPengajuanTa = 'draf' | 'diajukan' | 'revisi' | 'ditolak' | 'disetujui' | 'dibatalkan';
export type TahapTa = 'pa' | 'prodi';
export interface DosenTa {
  nidn: string;
  nama: string;
}
export interface BerkasPengajuanTa {
  id: number;
  jenis: string;
  berkas_id: string;
  nama: string;
  ukuran: number;
  created_at?: string | null;
}
export interface ValidasiTa {
  urut: number;
  tahap: TahapTa;
  tahap_label: string;
  validator: string | null;
  validator_nama: string | null;
  status: 'menunggu' | 'setuju' | 'revisi' | 'tolak' | 'dilewati';
  catatan: string | null;
  diputus_oleh: string | null;
  diputus_at: string | null;
}
export interface BerkasWajibTa {
  kode: string;
  nama: string;
  wajib: boolean;
  keterangan?: string | null;
}
export interface PengaturanTa {
  kode_prodi: string | null;
  sumber: 'bawaan' | 'kampus' | 'prodi';
  alur: TahapTa[];
  berkas: BerkasWajibTa[];
  usulan_pembimbing: boolean;
  aktif: boolean;
  petunjuk: string | null;
  tahap_label?: Record<string, string>;
}
export interface PengajuanTa {
  id: number;
  uuid: string;
  nim: string;
  nama_mahasiswa: string | null;
  kode_prodi: string | null;
  nama_prodi: string | null;
  kode_fakultas: string | null;
  tahun_id: string | null;
  judul: string;
  judul_inggris: string | null;
  bidang: string | null;
  jenis_penelitian: string | null;
  status: StatusPengajuanTa;
  tahap: TahapTa | null;
  tahap_label: string | null;
  dosen_pa: DosenTa | null;
  usulan_pembimbing_1: DosenTa | null;
  usulan_pembimbing_2: DosenTa | null;
  pembimbing_1: DosenTa | null;
  pembimbing_2: DosenTa | null;
  catatan: string | null;
  tercatat_siakad: boolean;
  diajukan_at: string | null;
  diputus_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  jumlah_berkas: number;
  latar_belakang?: string | null;
  rumusan?: string | null;
  metode?: string | null;
  berkas?: BerkasPengajuanTa[];
  validasi?: ValidasiTa[];
  /** Alur pemeriksa (docs/PEMERIKSA.md SIAKAD): dosen PA (bila dipakai) lalu program studi, dengan nama petugas. */
  pemeriksa?: TahapPemeriksa[];
  riwayat?: Array<{ aksi: string; oleh: string | null; catatan: string | null; created_at: string | null }>;
  pengaturan?: PengaturanTa;
  hak?: { ubah: boolean; ajukan: boolean; batal: boolean; putuskan: boolean; kelola: boolean };
}
export type StatusLangkahTa = 'selesai' | 'berjalan' | 'menunggu' | 'perlu_tindakan' | 'ditolak' | 'belum';
export interface LangkahProgresTa {
  kode: string;
  judul: string;
  status: StatusLangkahTa;
  ket: string | null;
  tanggal: string | null;
}
export interface ProgresTa {
  nim: string;
  judul: string | null;
  pembimbing_1: string | null;
  pembimbing_2: string | null;
  persen: number;
  langkah: LangkahProgresTa[];
}
export interface TugasAkhirSaya {
  peran: 'mahasiswa' | 'dosen' | 'pengelola' | 'lain';
  nim?: string;
  pengaturan?: PengaturanTa;
  pengajuan?: PengajuanTa | null;
  riwayat?: PengajuanTa[];
  boleh_buat?: boolean;
  progres?: ProgresTa;
  prodi_kelola?: string[];
  menunggu_saya?: number;
}

// ================================================================ Utilitas
const P = '/v1/ta';
const enc = encodeURIComponent;

const STATUS_PENGAJUAN: Record<StatusPengajuanTa, { label: string; variant: 'neutral' | 'info' | 'warning' | 'danger' | 'success' }> = {
  draf: { label: 'Konsep', variant: 'neutral' },
  diajukan: { label: 'Menunggu validasi', variant: 'info' },
  revisi: { label: 'Perlu revisi', variant: 'warning' },
  ditolak: { label: 'Ditolak', variant: 'danger' },
  disetujui: { label: 'Disetujui', variant: 'success' },
  dibatalkan: { label: 'Dibatalkan', variant: 'neutral' },
};
const STATUS_VALIDASI: Record<ValidasiTa['status'], { label: string; variant: 'neutral' | 'info' | 'warning' | 'danger' | 'success' }> = {
  menunggu: { label: 'Menunggu', variant: 'info' },
  setuju: { label: 'Disetujui', variant: 'success' },
  revisi: { label: 'Minta revisi', variant: 'warning' },
  tolak: { label: 'Ditolak', variant: 'danger' },
  dilewati: { label: 'Dilewati', variant: 'neutral' },
};
const STATUS_LANGKAH: Record<StatusLangkahTa, { label: string; variant: 'neutral' | 'info' | 'warning' | 'danger' | 'success' }> = {
  selesai: { label: 'Selesai', variant: 'success' },
  berjalan: { label: 'Berjalan', variant: 'info' },
  menunggu: { label: 'Menunggu', variant: 'info' },
  perlu_tindakan: { label: 'Perlu tindakan', variant: 'warning' },
  ditolak: { label: 'Ditolak', variant: 'danger' },
  belum: { label: 'Belum', variant: 'neutral' },
};
const AKSI_RIWAYAT: Record<string, string> = {
  buat: 'Konsep dibuat',
  unggah_berkas: 'Berkas dilampirkan',
  hapus_berkas: 'Berkas dilepas',
  ajukan: 'Diajukan',
  ajukan_ulang: 'Perbaikan diajukan',
  batal: 'Dibatalkan',
  tercatat_siakad: 'Dicatat di SIAKAD',
};
const KEPUTUSAN_RIWAYAT: Record<string, string> = { setuju: 'Disetujui', revisi: 'Diminta revisi', tolak: 'Ditolak' };
function labelAksi(a: string): string {
  if (AKSI_RIWAYAT[a]) return AKSI_RIWAYAT[a];
  const [k, t] = a.split('_');
  return KEPUTUSAN_RIWAYAT[k ?? ''] ? `${KEPUTUSAN_RIWAYAT[k ?? '']} ${t === 'pa' ? 'dosen PA' : t === 'prodi' ? 'prodi' : ''}`.trim() : a;
}
export const JENIS_PENELITIAN_TA = ['Kuantitatif', 'Kualitatif', 'Campuran (mixed methods)', 'Research and Development (R&D)', 'Studi kasus', 'Eksperimen', 'Pengembangan sistem/perangkat lunak', 'Kajian pustaka'];

/** Sumber pilihan dosen pembimbing (GET /v1/ta/dosen): bisa dipakai mahasiswa yang tidak punya scope dosen:read. */
export const SUMBER_DOSEN_TA: SumberEntitas = {
  nama: 'dosen',
  path: `${P}/dosen`,
  kunci: 'nidn',
  saringKunci: 'nidn',
  judul: (r) => String(r.nama ?? r.nidn ?? ''),
  meta: (r) => [r.nidn && `NIDN ${String(r.nidn)}`, r.jabatan_akademik, namaRapi(r.nama_prodi as string | null)].filter(Boolean).join(' · '),
  avatar: true,
  placeholder: 'Cari NIDN atau nama dosen',
};

function tgl(v: string | null | undefined, jam = false): string {
  if (!v) return '–';
  const d = new Date(v.length <= 10 ? `${v}T00:00:00` : v.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', ...(jam ? { hour: '2-digit', minute: '2-digit' } : {}) });
}
function ukuran(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
function namaDosen(d: DosenTa | null | undefined): string {
  return d ? d.nama || d.nidn : '–';
}

/** Unduh lampiran modul lewat SDK (butuh token, jadi tidak bisa memakai tautan biasa). */
async function unduhLewatSdk(siakad: ReturnType<typeof useSiakad>, path: string, nama: string, buka = false) {
  const r = await siakad.request<unknown>({ method: 'GET', path, query: buka ? {} : { unduh: '1' } });
  const d = r.data as { blob?: () => Blob } | Blob | null;
  const blob = d instanceof Blob ? d : d && typeof d === 'object' && typeof d.blob === 'function' ? d.blob() : null;
  if (!blob) throw new Error('Berkas tidak dapat diunduh.');
  const url = URL.createObjectURL(blob);
  if (buka) {
    window.open(url, '_blank', 'noopener');
  } else {
    const el = document.createElement('a');
    el.href = url;
    el.download = nama;
    el.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ================================================================ Hook
/** Ringkasan tugas akhir pemilik token (GET /v1/ta/saya): pengajuan aktif, pengaturan prodi, progres; untuk dosen jumlah yang menunggu. */
export function useTugasAkhirSaya() {
  const q = useSiakadQuery<TugasAkhirSaya>(['ta', 'saya'], (s, signal) => s.request<TugasAkhirSaya>({ method: 'GET', path: `${P}/saya` }, { signal }), { staleTime: 10_000 });
  useSaatInvalidasi('ta', q.refetch);
  return q;
}

function useDetailPengajuan(id: number | string | null | undefined) {
  const q = useSiakadQuery<PengajuanTa>(['ta', 'pengajuan', id ?? ''], (s, signal) => s.request<PengajuanTa>({ method: 'GET', path: `${P}/pengajuan/${enc(String(id))}` }, { signal }), { enabled: id != null && id !== '', staleTime: 5_000 });
  useSaatInvalidasi('ta', q.refetch);
  return q;
}

// ================================================================ Progres
export interface ProgresTugasAkhirProps {
  /** Data progres; bila kosong dimuat dari GET /v1/ta/mahasiswa/{nim}/progres. */
  progres?: ProgresTa | null;
  nim?: string;
  /** Ringkas: hanya bilah kemajuan dan langkah aktif. */
  ringkas?: boolean;
  className?: string;
}
const IKON_LANGKAH: Record<StatusLangkahTa, React.ReactNode> = {
  selesai: <CircleCheck aria-hidden />,
  berjalan: <Clock aria-hidden />,
  menunggu: <Clock aria-hidden />,
  perlu_tindakan: <TriangleAlert aria-hidden />,
  ditolak: <CircleX aria-hidden />,
  belum: <CircleDashed aria-hidden />,
};

/** Progres tugas akhir dari pengajuan judul sampai wisuda (judul, pembimbing, bimbingan, seminar, ujian, yudisium, wisuda). */
export function ProgresTugasAkhir({ progres, nim, ringkas, className }: ProgresTugasAkhirProps) {
  const q = useSiakadQuery<ProgresTa>(['ta', 'progres', nim ?? ''], (s, signal) => s.request<ProgresTa>({ method: 'GET', path: `${P}/mahasiswa/${enc(nim ?? '')}/progres` }, { signal }), { enabled: !progres && Boolean(nim) });
  const p = progres ?? q.data;
  if (!p) {
    if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
    return <Skeleton style={{ height: ringkas ? 48 : 280 }} />;
  }
  const aktif = p.langkah.find((l) => l.status !== 'selesai');
  return (
    <div className={cn('u-ta-progres', className)} data-ringkas={ringkas ? '' : undefined}>
      <Progress value={p.persen} label={aktif ? `Sekarang: ${aktif.judul}` : 'Semua tahap selesai'} showValue tone={p.persen >= 100 ? 'success' : 'primary'} />
      {!ringkas && (
        <ol className="u-ta-langkah">
          {p.langkah.map((l) => (
            <li key={l.kode} data-status={l.status} aria-current={l === aktif ? 'step' : undefined}>
              <span className="u-ta-langkah-ikon">{IKON_LANGKAH[l.status]}</span>
              <div className="u-ta-langkah-isi">
                <div className="u-ta-langkah-kepala">
                  <strong>{l.judul}</strong>
                  <Badge variant={STATUS_LANGKAH[l.status].variant}>{STATUS_LANGKAH[l.status].label}</Badge>
                </div>
                {(l.ket || l.tanggal) && (
                  <p className="u-ta-langkah-ket">
                    {l.ket}
                    {l.ket && l.tanggal ? ' · ' : ''}
                    {l.tanggal ? tgl(l.tanggal) : ''}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ================================================================ Formulir judul
interface IsianJudul {
  judul: string;
  judul_inggris: string;
  bidang: string;
  jenis_penelitian: string;
  latar_belakang: string;
  rumusan: string;
  metode: string;
  usulan_pembimbing_1: string;
  usulan_pembimbing_2: string;
}
function isianDari(p?: PengajuanTa | null): IsianJudul {
  return {
    judul: p?.judul ?? '',
    judul_inggris: p?.judul_inggris ?? '',
    bidang: p?.bidang ?? '',
    jenis_penelitian: p?.jenis_penelitian ?? '',
    latar_belakang: p?.latar_belakang ?? '',
    rumusan: p?.rumusan ?? '',
    metode: p?.metode ?? '',
    usulan_pembimbing_1: p?.usulan_pembimbing_1?.nidn ?? '',
    usulan_pembimbing_2: p?.usulan_pembimbing_2?.nidn ?? '',
  };
}

function FormJudul({ awal, usulanPembimbing, onSelesai, onBatal }: { awal?: PengajuanTa | null; usulanPembimbing: boolean; onSelesai: (p: PengajuanTa) => void; onBatal?: () => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [v, setV] = React.useState<IsianJudul>(() => isianDari(awal));
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [kirim, setKirim] = React.useState(false);
  const set = <K extends keyof IsianJudul>(k: K, x: IsianJudul[K]) => {
    setV((o) => ({ ...o, [k]: x }));
    if (galat[k]) setGalat(({ [k]: _, ...g }) => g);
  };
  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (v.judul.trim().length < 10) {
      setGalat({ judul: 'Tulis judul lengkap, paling sedikit 10 karakter.' });
      return;
    }
    if (v.usulan_pembimbing_1 && v.usulan_pembimbing_1 === v.usulan_pembimbing_2) {
      setGalat({ usulan_pembimbing_2: 'Calon pembimbing 2 harus berbeda dari calon pembimbing 1.' });
      return;
    }
    setKirim(true);
    try {
      const body = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x.trim() === '' ? null : x.trim()]));
      const r = awal
        ? await siakad.request<PengajuanTa>({ method: 'POST', path: `${P}/pengajuan/${awal.id}`, body })
        : await siakad.request<PengajuanTa>({ method: 'POST', path: `${P}/pengajuan`, body });
      invalidateSiakad('ta');
      toast.add({ title: awal ? 'Perubahan disimpan' : 'Konsep pengajuan dibuat', description: awal ? undefined : 'Lampirkan berkas lalu ajukan untuk divalidasi.', type: 'success' });
      onSelesai(r.data);
    } catch (err) {
      const f = (err as { errors?: Record<string, string | string[]> }).errors;
      if (f) setGalat(Object.fromEntries(Object.entries(f).map(([k, x]) => [k, Array.isArray(x) ? x.join(' ') : String(x)])));
      toast.add({ title: 'Gagal menyimpan', description: pesanGalat(err), type: 'error' });
    } finally {
      setKirim(false);
    }
  };
  return (
    <form className="u-ta-form" onSubmit={simpan} noValidate>
      <Field label="Judul penelitian" required error={galat.judul} description="Tulis judul lengkap dalam bahasa Indonesia.">
        <Textarea rows={2} maxLength={500} value={v.judul} onChange={(e) => set('judul', e.target.value)} />
      </Field>
      <Field label="Judul dalam bahasa Inggris" optional error={galat.judul_inggris}>
        <Textarea rows={2} maxLength={500} value={v.judul_inggris} onChange={(e) => set('judul_inggris', e.target.value)} />
      </Field>
      <div className="u-ta-form-kisi">
        <Field label="Bidang kajian/peminatan" optional error={galat.bidang}>
          <Input maxLength={150} value={v.bidang} onChange={(e) => set('bidang', e.target.value)} />
        </Field>
        <Field label="Jenis penelitian" optional error={galat.jenis_penelitian}>
          <Pilihan
            tampilan="daftar"
            placeholder="Pilih jenis penelitian"
            options={[...new Set([...JENIS_PENELITIAN_TA, ...(v.jenis_penelitian ? [v.jenis_penelitian] : [])])].map((x) => ({ value: x, label: x }))}
            value={v.jenis_penelitian || null}
            onValueChange={(x) => set('jenis_penelitian', x ?? '')}
          />
        </Field>
      </div>
      <Field label="Latar belakang masalah" optional error={galat.latar_belakang} description="Ringkas, 1 sampai 3 paragraf.">
        <Textarea rows={5} value={v.latar_belakang} onChange={(e) => set('latar_belakang', e.target.value)} />
      </Field>
      <Field label="Rumusan masalah dan tujuan" optional error={galat.rumusan}>
        <Textarea rows={4} value={v.rumusan} onChange={(e) => set('rumusan', e.target.value)} />
      </Field>
      <Field label="Metode penelitian" optional error={galat.metode}>
        <Textarea rows={3} value={v.metode} onChange={(e) => set('metode', e.target.value)} />
      </Field>
      {usulanPembimbing && (
        <div className="u-ta-form-kisi">
          <Field label="Usulan pembimbing 1" optional error={galat.usulan_pembimbing_1} description="Prodi yang menetapkan pembimbing akhir.">
            <PilihEntitas jenis={SUMBER_DOSEN_TA} value={v.usulan_pembimbing_1 || null} onValueChange={(x) => set('usulan_pembimbing_1', x ?? '')} placeholder="Cari nama dosen" />
          </Field>
          <Field label="Usulan pembimbing 2" optional error={galat.usulan_pembimbing_2}>
            <PilihEntitas jenis={SUMBER_DOSEN_TA} value={v.usulan_pembimbing_2 || null} onValueChange={(x) => set('usulan_pembimbing_2', x ?? '')} placeholder="Cari nama dosen" />
          </Field>
        </div>
      )}
      <div className="u-ta-aksi">
        {onBatal && (
          <Button type="button" variant="ghost" onClick={onBatal}>
            Batal
          </Button>
        )}
        <Button type="submit" loading={kirim}>
          {awal ? 'Simpan perubahan' : 'Simpan konsep'}
        </Button>
      </div>
    </form>
  );
}

// ================================================================ Berkas
function BerkasPengajuan({ pengajuan, daftar, bolehUbah }: { pengajuan: PengajuanTa; daftar: BerkasWajibTa[]; bolehUbah: boolean }) {
  const siakad = useSiakad();
  const toast = useToast();
  const unggah = useUnggahBerkas({ kategori: 'dokumen', modul: 'ta', keterangan: `Pengajuan judul ${pengajuan.nim}` });
  const [proses, setProses] = React.useState<Record<string, number>>({});
  const berkas = pengajuan.berkas ?? [];
  const jenisLain = berkas.some((b) => !daftar.some((d) => d.kode === b.jenis));
  const baris = [...daftar, ...(bolehUbah || jenisLain ? [{ kode: 'lainnya', nama: 'Berkas pendukung lain', wajib: false, keterangan: 'Opsional, mis. surat rekomendasi atau izin penelitian.' }] : [])];

  const pilih = async (jenis: string, file: File | undefined) => {
    if (!file) return;
    setProses((o) => ({ ...o, [jenis]: 0 }));
    try {
      const b = await unggah(file, (x) => setProses((o) => ({ ...o, [jenis]: x })));
      await siakad.request({ method: 'POST', path: `${P}/pengajuan/${pengajuan.id}/berkas`, body: { berkas_id: b.id, jenis } });
      invalidateSiakad('ta');
      toast.add({ title: 'Berkas dilampirkan', description: file.name, type: 'success' });
    } catch (e) {
      toast.add({ title: 'Gagal mengunggah', description: pesanGalat(e), type: 'error' });
    } finally {
      setProses(({ [jenis]: _, ...o }) => o);
    }
  };
  const lepas = async (b: BerkasPengajuanTa) => {
    try {
      await siakad.request({ method: 'POST', path: `${P}/pengajuan/${pengajuan.id}/berkas/${b.id}/hapus` });
      invalidateSiakad('ta');
      toast.add({ title: 'Berkas dilepas', type: 'success' });
    } catch (e) {
      toast.add({ title: 'Gagal melepas berkas', description: pesanGalat(e), type: 'error' });
    }
  };
  const lihat = async (b: BerkasPengajuanTa, buka: boolean) => {
    try {
      await unduhLewatSdk(siakad, `${P}/pengajuan/${pengajuan.id}/berkas/${b.id}`, b.nama, buka);
    } catch (e) {
      toast.add({ title: 'Gagal membuka berkas', description: pesanGalat(e), type: 'error' });
    }
  };

  return (
    <ul className="u-ta-berkas">
      {baris.map((d) => {
        const ada = berkas.filter((b) => b.jenis === d.kode || (d.kode === 'lainnya' && !daftar.some((x) => x.kode === b.jenis)));
        const p = proses[d.kode];
        if (!bolehUbah && !ada.length) return null;
        return (
          <li key={d.kode} data-lengkap={ada.length ? '' : undefined}>
            <div className="u-ta-berkas-kepala">
              <span className="u-ta-berkas-ikon">{ada.length ? <CircleCheck aria-hidden /> : <Paperclip aria-hidden />}</span>
              <div className="u-ta-berkas-nama">
                <strong>
                  {d.nama}
                  {d.wajib && <span className="u-ta-wajib"> wajib</span>}
                </strong>
                {d.keterangan && <span>{d.keterangan}</span>}
              </div>
              {bolehUbah && (
                <TombolPilihBerkas className="u-ta-unggah" accept=".pdf,.doc,.docx,.odt,.jpg,.jpeg,.png" loading={p !== undefined} onFiles={(f) => void pilih(d.kode, f[0])}>
                  <Upload aria-hidden /> {p !== undefined ? `Mengunggah ${p}%` : ada.length ? 'Tambah' : 'Unggah'}
                </TombolPilihBerkas>
              )}
            </div>
            {ada.length > 0 && (
              <ul className="u-ta-berkas-file">
                {ada.map((b) => (
                  <li key={b.id}>
                    <FileText aria-hidden />
                    <Tekan className="u-ta-tautan" onClick={() => void lihat(b, true)}>
                      {b.nama}
                    </Tekan>
                    <span className="u-ta-redup">{ukuran(b.ukuran)}</span>
                    <Button variant="ghost" size="sm" iconOnly aria-label={`Unduh ${b.nama}`} onClick={() => void lihat(b, false)}>
                      <Download />
                    </Button>
                    {bolehUbah && (
                      <Button variant="ghost" size="sm" iconOnly aria-label={`Lepas ${b.nama}`} onClick={() => void lepas(b)}>
                        <Trash2 />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ================================================================ Validasi dan riwayat
function LangkahValidasi({ pengajuan }: { pengajuan: PengajuanTa }) {
  // Tampilan seragam alur pemeriksa bila API sudah mengirim `pemeriksa`; selain itu langkah ta_validasi apa adanya.
  if (pengajuan.pemeriksa?.length && pengajuan.status !== 'draf') return <AlurPemeriksa pemeriksa={pengajuan.pemeriksa} judul={null} />;
  const v = pengajuan.validasi ?? [];
  if (!v.length) return <p className="u-ta-redup">Langkah validasi dibuat saat pengajuan dikirim.</p>;
  return (
    <ol className="u-ta-validasi">
      {v.map((x) => (
        <li key={`${x.urut}-${x.tahap}`} data-status={x.status}>
          <div className="u-ta-langkah-kepala">
            <strong>
              {x.urut}. {x.tahap_label}
            </strong>
            <Badge variant={STATUS_VALIDASI[x.status].variant}>{STATUS_VALIDASI[x.status].label}</Badge>
          </div>
          <p className="u-ta-redup">
            {x.validator_nama || x.validator || (x.tahap === 'prodi' ? 'Kaprodi, sekprodi, atau operator prodi' : '–')}
            {x.diputus_at ? ` · ${tgl(x.diputus_at, true)}` : ''}
          </p>
          {x.catatan && <blockquote className="u-ta-catatan">{x.catatan}</blockquote>}
        </li>
      ))}
    </ol>
  );
}

function RiwayatPengajuan({ pengajuan }: { pengajuan: PengajuanTa }) {
  const r = pengajuan.riwayat ?? [];
  if (!r.length) return null;
  return (
    <details className="u-ta-riwayat">
      <summary>
        <History aria-hidden /> Riwayat ({r.length})
      </summary>
      <ul>
        {r.map((x, i) => (
          <li key={i}>
            <span className="u-ta-redup">{tgl(x.created_at, true)}</span> {labelAksi(x.aksi)}
            {x.oleh ? <span className="u-ta-redup"> oleh {x.oleh}</span> : null}
            {x.catatan ? <div className="u-ta-redup">{x.catatan}</div> : null}
          </li>
        ))}
      </ul>
    </details>
  );
}

function RingkasanPengajuan({ p }: { p: PengajuanTa }) {
  return (
    <DescriptionList
      items={[
        ...(p.judul_inggris ? [{ label: 'Judul (Inggris)', value: p.judul_inggris }] : []),
        { label: 'Bidang', value: p.bidang || '–' },
        { label: 'Jenis penelitian', value: p.jenis_penelitian || '–' },
        { label: 'Dosen PA', value: namaDosen(p.dosen_pa) },
        {
          label: p.pembimbing_1 ? 'Pembimbing' : 'Usulan pembimbing',
          value: p.pembimbing_1 ? [p.pembimbing_1, p.pembimbing_2].filter(Boolean).map((d) => namaDosen(d)).join(', ') : [p.usulan_pembimbing_1, p.usulan_pembimbing_2].filter(Boolean).map((d) => namaDosen(d)).join(', ') || '–',
        },
        { label: 'Diajukan', value: tgl(p.diajukan_at, true) },
      ]}
    />
  );
}

function IsiNaskah({ p }: { p: PengajuanTa }) {
  const bagian = [
    ['Latar belakang', p.latar_belakang],
    ['Rumusan masalah dan tujuan', p.rumusan],
    ['Metode', p.metode],
  ].filter(([, x]) => x);
  if (!bagian.length) return null;
  return (
    <div className="u-ta-naskah">
      {bagian.map(([j, x]) => (
        <section key={j}>
          <h4>{j}</h4>
          <p>{x}</p>
        </section>
      ))}
    </div>
  );
}

// ================================================================ Pengajuan judul mahasiswa
export interface PengajuanJudulSayaProps {
  className?: string;
  /** Sembunyikan kartu progres (bila sudah ditampilkan di tempat lain). */
  tanpaProgres?: boolean;
}

/**
 * Halaman mahasiswa: buat konsep judul, lampirkan berkas (surat pengajuan judul, draf proposal, ...), ajukan,
 * pantau validasi dosen PA dan prodi, perbaiki saat diminta revisi, dan lihat progres sampai wisuda.
 */
export function PengajuanJudulSaya({ className, tanpaProgres }: PengajuanJudulSayaProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useTugasAkhirSaya();
  const [mode, setMode] = React.useState<'lihat' | 'ubah' | 'baru'>('lihat');
  const [konfirmasi, setKonfirmasi] = React.useState<'ajukan' | 'batal' | null>(null);
  const [alasan, setAlasan] = React.useState('');
  const [kirim, setKirim] = React.useState(false);

  if (q.error && !q.data) return <GalatApi error={q.error} onRetry={q.refetch} />;
  const d = q.data;
  if (!d) return <Skeleton style={{ height: 320 }} />;
  if (d.peran !== 'mahasiswa') return <Empty icon={<GraduationCap />} title="Khusus mahasiswa" description="Pengajuan judul tugas akhir dibuat dari akun mahasiswa." bordered />;

  const atur = d.pengaturan!;
  const p = d.pengajuan ?? null;
  const ditutup = !atur.aktif;
  const berkasKurang = p ? atur.berkas.filter((b) => b.wajib && !(p.berkas ?? []).some((x) => x.jenis === b.kode)) : [];

  const aksi = async (jenis: 'ajukan' | 'batal') => {
    if (!p) return;
    setKirim(true);
    try {
      await siakad.request({ method: 'POST', path: `${P}/pengajuan/${p.id}/${jenis}`, body: jenis === 'batal' ? { alasan: alasan.trim() || null } : undefined });
      invalidateSiakad('ta');
      toast.add({ title: jenis === 'ajukan' ? 'Pengajuan dikirim' : 'Pengajuan dibatalkan', description: jenis === 'ajukan' ? 'Anda akan melihat hasil validasi di halaman ini.' : undefined, type: 'success' });
      setKonfirmasi(null);
      setAlasan('');
    } catch (e) {
      toast.add({ title: jenis === 'ajukan' ? 'Belum bisa diajukan' : 'Gagal membatalkan', description: pesanGalat(e), type: 'error' });
    } finally {
      setKirim(false);
    }
  };

  const formBaru = mode === 'baru' || (!p && !ditutup);
  return (
    <div className={cn('u-ta', className)}>
      {!tanpaProgres && d.progres && (
        <Card className="u-ta-kartu">
          <h3 className="u-ta-judul-kartu">Progres tugas akhir</h3>
          <ProgresTugasAkhir progres={d.progres} />
        </Card>
      )}

      {atur.petunjuk && (
        <Alert variant="info" title="Petunjuk prodi">
          <span style={{ whiteSpace: 'pre-line' }}>{atur.petunjuk}</span>
        </Alert>
      )}

      {ditutup && !p && <Alert variant="warning" title="Pengajuan judul online sedang ditutup" >Hubungi prodi untuk jadwal pengajuan judul berikutnya.</Alert>}

      {formBaru && (d.boleh_buat ?? true) && !ditutup ? (
        <Card className="u-ta-kartu">
          <h3 className="u-ta-judul-kartu">{p?.status === 'ditolak' ? 'Ajukan judul baru' : 'Ajukan judul penelitian'}</h3>
          <p className="u-ta-redup">Simpan konsep dulu, lalu lampirkan berkas yang diminta dan kirim untuk divalidasi{atur.alur.includes('pa') ? ' dosen PA dan prodi' : ' prodi'}.</p>
          <FormJudul usulanPembimbing={atur.usulan_pembimbing} onSelesai={() => setMode('lihat')} onBatal={p ? () => setMode('lihat') : undefined} />
        </Card>
      ) : null}

      {p && mode !== 'baru' && (
        <Card className="u-ta-kartu">
          <div className="u-ta-kepala">
            <div>
              <Badge variant={STATUS_PENGAJUAN[p.status].variant} dot>
                {STATUS_PENGAJUAN[p.status].label}
                {p.status === 'diajukan' && p.tahap_label ? `: ${p.tahap_label}` : ''}
              </Badge>
              <h3 className="u-ta-judul-pengajuan">{p.judul}</h3>
            </div>
            <div className="u-ta-aksi">
              {p.hak?.ubah && mode === 'lihat' && (
                <Button variant="outline" size="sm" onClick={() => setMode('ubah')}>
                  <Pencil /> Ubah
                </Button>
              )}
              {p.hak?.batal && (
                <Button variant="ghost" size="sm" onClick={() => setKonfirmasi('batal')}>
                  <X /> Batalkan
                </Button>
              )}
              {p.status === 'ditolak' && d.boleh_buat && !ditutup && (
                <Button size="sm" onClick={() => setMode('baru')}>
                  <Plus /> Ajukan judul baru
                </Button>
              )}
            </div>
          </div>

          {p.catatan && (p.status === 'revisi' || p.status === 'ditolak') && (
            <Alert variant={p.status === 'revisi' ? 'warning' : 'danger'} title={p.status === 'revisi' ? 'Diminta revisi' : 'Pengajuan ditolak'}>
              <span style={{ whiteSpace: 'pre-line' }}>{p.catatan}</span>
            </Alert>
          )}
          {p.status === 'disetujui' && (
            <Alert variant="success" title="Judul disetujui">
              Pembimbing: {[p.pembimbing_1, p.pembimbing_2].filter(Boolean).map((x) => namaDosen(x)).join(' dan ') || '–'}. {p.tercatat_siakad ? 'Judul sudah tercatat di SIAKAD; lanjutkan bimbingan dengan pembimbing Anda.' : ''}
            </Alert>
          )}

          {mode === 'ubah' ? (
            <FormJudul awal={p} usulanPembimbing={atur.usulan_pembimbing} onSelesai={() => setMode('lihat')} onBatal={() => setMode('lihat')} />
          ) : (
            <>
              <RingkasanPengajuan p={p} />
              <IsiNaskah p={p} />
            </>
          )}

          <section className="u-ta-bagian">
            <h4>Berkas pendukung</h4>
            <BerkasPengajuan pengajuan={p} daftar={p.pengaturan?.berkas ?? atur.berkas} bolehUbah={Boolean(p.hak?.ubah)} />
          </section>

          {p.hak?.ajukan && mode === 'lihat' && (
            <div className="u-ta-kirim">
              {berkasKurang.length > 0 ? (
                <p className="u-ta-redup">
                  <TriangleAlert aria-hidden /> Lengkapi dulu: {berkasKurang.map((b) => b.nama).join(', ')}.
                </p>
              ) : (
                <p className="u-ta-redup">Berkas wajib sudah lengkap. Periksa kembali sebelum mengirim.</p>
              )}
              <Button onClick={() => setKonfirmasi('ajukan')} disabled={berkasKurang.length > 0}>
                <Send /> {p.status === 'revisi' ? 'Kirim perbaikan' : 'Ajukan untuk divalidasi'}
              </Button>
            </div>
          )}

          <section className="u-ta-bagian">
            <h4>Validasi</h4>
            <LangkahValidasi pengajuan={p} />
          </section>
          <RiwayatPengajuan pengajuan={p} />
        </Card>
      )}

      {(d.riwayat ?? []).filter((x) => x.id !== p?.id).length > 0 && (
        <details className="u-ta-riwayat">
          <summary>
            <History aria-hidden /> Pengajuan sebelumnya
          </summary>
          <ul>
            {(d.riwayat ?? [])
              .filter((x) => x.id !== p?.id)
              .map((x) => (
                <li key={x.id}>
                  <Badge variant={STATUS_PENGAJUAN[x.status].variant}>{STATUS_PENGAJUAN[x.status].label}</Badge> {x.judul} <span className="u-ta-redup">{tgl(x.created_at)}</span>
                </li>
              ))}
          </ul>
        </details>
      )}

      <ConfirmDialog
        open={konfirmasi === 'ajukan'}
        onOpenChange={(o) => !o && setKonfirmasi(null)}
        title="Kirim pengajuan judul?"
        description={`Pengajuan akan divalidasi ${atur.alur.includes('pa') ? 'dosen PA lalu prodi' : 'prodi'}. Selama divalidasi, judul dan berkas tidak bisa diubah.`}
        confirmLabel="Kirim pengajuan"
        tone="primary"
        onConfirm={() => aksi('ajukan')}
      />
      <Dialog
        open={konfirmasi === 'batal'}
        onOpenChange={(o) => !o && setKonfirmasi(null)}
        title="Batalkan pengajuan judul?"
        description="Pengajuan yang dibatalkan tidak bisa dilanjutkan. Anda bisa membuat pengajuan baru."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setKonfirmasi(null)}>
              Kembali
            </Button>
            <Button variant="destructive" loading={kirim} onClick={() => void aksi('batal')}>
              Batalkan pengajuan
            </Button>
          </>
        }
      >
        <Field label="Alasan" optional>
          <Textarea rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} />
        </Field>
      </Dialog>
    </div>
  );
}

// ================================================================ Validasi dosen/prodi
type Keputusan = 'setuju' | 'revisi' | 'tolak';

function FormPutuskan({ p, onSelesai }: { p: PengajuanTa; onSelesai: () => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const val = p.validasi ?? [];
  const sekarang = val.find((x) => x.status === 'menunggu');
  const terakhir = sekarang != null && !val.some((x) => x.urut > sekarang.urut && x.status === 'menunggu');
  const [keputusan, setKeputusan] = React.useState<Keputusan>('setuju');
  const [catatan, setCatatan] = React.useState('');
  const [pb1, setPb1] = React.useState<string>(p.pembimbing_1?.nidn ?? p.usulan_pembimbing_1?.nidn ?? '');
  const [pb2, setPb2] = React.useState<string>(p.pembimbing_2?.nidn ?? p.usulan_pembimbing_2?.nidn ?? '');
  const [judul, setJudul] = React.useState(p.judul);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [kirim, setKirim] = React.useState(false);
  const tetapkan = keputusan === 'setuju' && terakhir;

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    const g: Record<string, string> = {};
    if (keputusan !== 'setuju' && catatan.trim().length < 5) g.catatan = 'Tulis catatan untuk mahasiswa: apa yang perlu diperbaiki atau alasan penolakan.';
    if (tetapkan && !pb1) g.pembimbing_1 = 'Tetapkan pembimbing 1.';
    if (tetapkan && pb1 && pb1 === pb2) g.pembimbing_2 = 'Pembimbing 2 harus berbeda.';
    if (tetapkan && judul.trim().length < 10) g.judul = 'Judul final terlalu pendek.';
    setGalat(g);
    if (Object.keys(g).length) return;
    setKirim(true);
    try {
      await siakad.request({
        method: 'POST',
        path: `${P}/pengajuan/${p.id}/putuskan`,
        body: { keputusan, catatan: catatan.trim() || null, ...(tetapkan ? { pembimbing_1: pb1, pembimbing_2: pb2 || null, judul: judul.trim() !== p.judul ? judul.trim() : null } : {}) },
      });
      invalidateSiakad('ta');
      toast.add({ title: keputusan === 'setuju' ? (tetapkan ? 'Judul disetujui dan pembimbing ditetapkan' : 'Disetujui, diteruskan ke langkah berikutnya') : keputusan === 'revisi' ? 'Revisi diminta' : 'Pengajuan ditolak', type: 'success' });
      onSelesai();
    } catch (err) {
      const f = (err as { errors?: Record<string, string | string[]> }).errors;
      if (f) setGalat(Object.fromEntries(Object.entries(f).map(([k, x]) => [k, Array.isArray(x) ? x.join(' ') : String(x)])));
      // 409 aturan_dilanggar: pembimbing belum memenuhi aturan (details.isian = pembimbing_1/pembimbing_2).
      const isian = (err as { details?: { isian?: string } }).details?.isian;
      if (isian) setGalat({ [isian]: pesanGalat(err) });
      toast.add({ title: 'Keputusan belum tersimpan', description: pesanGalat(err), type: 'error' });
    } finally {
      setKirim(false);
    }
  };

  return (
    <form className="u-ta-form u-ta-putuskan" onSubmit={simpan} noValidate>
      <h4>Keputusan {sekarang ? sekarang.tahap_label.toLowerCase() : ''}</h4>
      <SegmentedControl<Keputusan>
        fullWidth
        aria-label="Keputusan"
        value={keputusan}
        onValueChange={setKeputusan}
        options={[
          { value: 'setuju', label: 'Setujui', icon: <CircleCheck /> },
          { value: 'revisi', label: 'Minta revisi', icon: <Pencil /> },
          { value: 'tolak', label: 'Tolak', icon: <CircleX /> },
        ]}
      />
      {tetapkan && (
        <>
          <Field label="Judul final" required error={galat.judul} description="Ubah bila prodi menyempurnakan redaksi judul.">
            <Textarea rows={2} maxLength={500} value={judul} onChange={(e) => setJudul(e.target.value)} />
          </Field>
          <div className="u-ta-form-kisi">
            {/* Pemilih dosen bersyarat: aturan titik ta.pembimbing.tetapkan (universitas + fakultas mahasiswa). */}
            <Field label="Pembimbing 1" required error={galat.pembimbing_1}>
              <PilihDosenBersyarat titik="ta.pembimbing.tetapkan" nim={p.nim} peran="pembimbing_1" value={pb1 || null} onValueChange={(x) => setPb1(x ?? '')} placeholder="Cari nama dosen" aria-label="Pembimbing 1" />
            </Field>
            <Field label="Pembimbing 2" optional error={galat.pembimbing_2}>
              <PilihDosenBersyarat titik="ta.pembimbing.tetapkan" nim={p.nim} peran="pembimbing_2" value={pb2 || null} onValueChange={(x) => setPb2(x ?? '')} placeholder="Cari nama dosen" aria-label="Pembimbing 2" />
            </Field>
          </div>
        </>
      )}
      <Field label="Catatan untuk mahasiswa" required={keputusan !== 'setuju'} optional={keputusan === 'setuju'} error={galat.catatan}>
        <Textarea rows={4} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder={keputusan === 'revisi' ? 'Mis. persempit ruang lingkup, perjelas variabel penelitian.' : undefined} />
      </Field>
      <div className="u-ta-aksi">
        <Button type="submit" loading={kirim} variant={keputusan === 'tolak' ? 'destructive' : 'primary'}>
          {keputusan === 'setuju' ? (tetapkan ? 'Setujui dan tetapkan pembimbing' : 'Setujui dan teruskan') : keputusan === 'revisi' ? 'Kirim permintaan revisi' : 'Tolak pengajuan'}
        </Button>
      </div>
    </form>
  );
}

/** Detail satu pengajuan untuk dosen PA, pembimbing, atau pengelola prodi, beserta formulir keputusan bila berhak. */
export function DetailPengajuanJudul({ id, onSelesai }: { id: number | string; onSelesai?: () => void }) {
  const q = useDetailPengajuan(id);
  const p = q.data;
  if (q.error && !p) return <GalatApi error={q.error} onRetry={q.refetch} />;
  if (!p) return <Skeleton style={{ height: 360 }} />;
  return (
    <div className="u-ta u-ta-detail">
      <div>
        <Badge variant={STATUS_PENGAJUAN[p.status].variant} dot>
          {STATUS_PENGAJUAN[p.status].label}
          {p.status === 'diajukan' && p.tahap_label ? `: ${p.tahap_label}` : ''}
        </Badge>
        <h3 className="u-ta-judul-pengajuan">{p.judul}</h3>
        <p className="u-ta-redup">
          {p.nama_mahasiswa ?? p.nim} · {p.nim}
        </p>
        <LabelProdi kode={p.kode_prodi} nama={p.nama_prodi} />
      </div>
      <RingkasanPengajuan p={p} />
      <IsiNaskah p={p} />
      <section className="u-ta-bagian">
        <h4>Berkas pendukung</h4>
        {p.berkas?.length ? <BerkasPengajuan pengajuan={p} daftar={p.pengaturan?.berkas ?? []} bolehUbah={false} /> : <p className="u-ta-redup">Tidak ada berkas.</p>}
      </section>
      <section className="u-ta-bagian">
        <h4>Validasi</h4>
        <LangkahValidasi pengajuan={p} />
      </section>
      {p.hak?.putuskan && <FormPutuskan key={`${p.id}-${p.tahap}`} p={p} onSelesai={() => onSelesai?.()} />}
      <section className="u-ta-bagian">
        <h4>Progres tugas akhir</h4>
        <ProgresTugasAkhir nim={p.nim} />
      </section>
      <RiwayatPengajuan pengajuan={p} />
    </div>
  );
}

export type UntukValidasiTa = 'saya' | 'pa' | 'kelola';
export interface DaftarValidasiJudulProps {
  /** Tab awal. Bawaan "saya" (menunggu keputusan saya). */
  awal?: UntukValidasiTa;
  className?: string;
}

/** Halaman dosen/prodi: pengajuan judul yang menunggu keputusan, mahasiswa PA, dan semua pengajuan prodi yang dikelola. */
export function DaftarValidasiJudul({ awal = 'saya', className }: DaftarValidasiJudulProps) {
  const saya = useTugasAkhirSaya();
  const kelola = (saya.data?.prodi_kelola ?? []).length > 0;
  const [untuk, setUntuk] = React.useState<UntukValidasiTa>(awal);
  const [status, setStatus] = React.useState<string>(awal === 'saya' ? '' : 'diajukan');
  const [cari, setCari] = React.useState('');
  const [kata, setKata] = React.useState('');
  const [buka, setBuka] = React.useState<PengajuanTa | null>(null);
  React.useEffect(() => {
    const t = setTimeout(() => setKata(cari.trim()), 300);
    return () => clearTimeout(t);
  }, [cari]);
  const q = useSiakadQuery<PengajuanTa[]>(['ta', 'daftar', untuk, status, kata], (s, signal) =>
    s.request<PengajuanTa[]>({ method: 'GET', path: `${P}/pengajuan`, query: { untuk, status: untuk === 'saya' ? undefined : status || undefined, q: kata || undefined, per_page: 100 } }, { signal }),
  );
  useSaatInvalidasi('ta', q.refetch);

  const baris = q.data ?? [];
  // Isi tab dirender di dalam Tabs supaya sub tab tingkat kedua (≥3) otomatis vertikal (keputusan Anas 2026-11-22).
  const isi = (
    <>
      <div className="u-ta-saring">
        <Input placeholder="Cari judul, NIM, atau nama" aria-label="Cari pengajuan" value={cari} onChange={(e) => setCari(e.target.value)} />
        {untuk !== 'saya' && (
          <Pilihan
            tampilan="daftar"
            aria-label="Status"
            placeholder="Semua status"
            value={status || null}
            onValueChange={(x) => setStatus(x ?? '')}
            options={(Object.keys(STATUS_PENGAJUAN) as StatusPengajuanTa[]).map((k) => ({ value: k, label: STATUS_PENGAJUAN[k].label }))}
          />
        )}
      </div>
      {q.error && !q.data ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : !q.data ? (
        <Skeleton style={{ height: 240 }} />
      ) : !baris.length ? (
        <Empty
          icon={<BookOpenCheck />}
          title={untuk === 'saya' ? 'Tidak ada pengajuan yang menunggu Anda' : 'Belum ada pengajuan'}
          description={untuk === 'saya' ? 'Pengajuan judul mahasiswa PA Anda atau prodi yang Anda kelola akan muncul di sini.' : kata || status ? 'Coba ubah pencarian atau saringan status.' : undefined}
          bordered
        />
      ) : (
        <ul className="u-ta-daftar">
          {baris.map((r) => (
            <li key={r.id}>
              <Tekan onClick={() => setBuka(r)}>
                <div className="u-ta-daftar-utama">
                  <strong>{r.judul}</strong>
                  <span className="u-ta-redup">
                    {r.nama_mahasiswa ?? r.nim} · {r.nim} · {namaRapi(r.nama_prodi ?? r.kode_prodi)}
                  </span>
                </div>
                <div className="u-ta-daftar-meta">
                  <Badge variant={STATUS_PENGAJUAN[r.status].variant}>
                    {STATUS_PENGAJUAN[r.status].label}
                    {r.status === 'diajukan' && r.tahap ? ` · ${r.tahap === 'pa' ? 'PA' : 'Prodi'}` : ''}
                  </Badge>
                  <span className="u-ta-redup">{tgl(r.diajukan_at ?? r.created_at)}</span>
                </div>
              </Tekan>
            </li>
          ))}
        </ul>
      )}
    </>
  );
  const tab = [
    { value: 'saya' as const, label: 'Menunggu saya', count: saya.data?.menunggu_saya, content: isi },
    { value: 'pa' as const, label: 'Mahasiswa PA saya', content: isi },
    ...(kelola ? [{ value: 'kelola' as const, label: 'Semua di prodi', content: isi }] : []),
  ];
  return (
    <div className={cn('u-ta', className)}>
      <Tabs<UntukValidasiTa>
        items={tab}
        value={untuk}
        onValueChange={(v) => {
          setUntuk(v);
          setStatus(v === 'saya' ? '' : 'diajukan');
        }}
      />
      <Sheet open={buka != null} onOpenChange={(o) => !o && setBuka(null)} title="Pengajuan judul" description={buka ? `${buka.nama_mahasiswa ?? buka.nim} (${buka.nim})` : undefined} size="lg">
        {buka && <DetailPengajuanJudul id={buka.id} onSelesai={() => setBuka(null)} />}
      </Sheet>
    </div>
  );
}

// ================================================================ Pengaturan prodi
/** Pengelola prodi: buka/tutup pengajuan online, alur validasi, berkas yang diminta, usulan pembimbing, petunjuk. */
export function PengaturanPengajuanJudul({ prodi, className }: { prodi?: string | null; className?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useSiakadQuery<PengaturanTa>(['ta', 'pengaturan', prodi ?? ''], (s, signal) => s.request<PengaturanTa>({ method: 'GET', path: `${P}/pengaturan`, query: { prodi: prodi || undefined } }, { signal }));
  const [v, setV] = React.useState<PengaturanTa | null>(null);
  const [kirim, setKirim] = React.useState(false);
  React.useEffect(() => {
    if (q.data) setV(q.data);
  }, [q.data]);
  if (q.error && !q.data) return <GalatApi error={q.error} onRetry={q.refetch} />;
  if (!v) return <Skeleton style={{ height: 320 }} />;

  const ubahBerkas = (i: number, x: Partial<BerkasWajibTa>) => setV({ ...v, berkas: v.berkas.map((b, j) => (j === i ? { ...b, ...x } : b)) });
  const simpan = async () => {
    const berkas = v.berkas
      .map((b) => ({ ...b, nama: b.nama.trim(), kode: (b.kode || b.nama).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) }))
      .filter((b) => b.nama !== '');
    setKirim(true);
    try {
      const r = await siakad.request<PengaturanTa>({ method: 'POST', path: `${P}/pengaturan`, body: { prodi: prodi || null, alur: v.alur, berkas, usulan_pembimbing: v.usulan_pembimbing, aktif: v.aktif, petunjuk: v.petunjuk?.trim() || null } });
      setV(r.data);
      invalidateSiakad('ta');
      toast.add({ title: 'Pengaturan disimpan', type: 'success' });
    } catch (e) {
      toast.add({ title: 'Gagal menyimpan pengaturan', description: pesanGalat(e), type: 'error' });
    } finally {
      setKirim(false);
    }
  };

  return (
    <div className={cn('u-ta u-ta-pengaturan', className)}>
      {v.sumber !== 'prodi' && prodi && <Alert variant="info">Prodi ini masih memakai pengaturan {v.sumber === 'kampus' ? 'kampus' : 'bawaan'}. Simpan untuk membuat pengaturan khusus prodi.</Alert>}
      <Card className="u-ta-kartu">
        <h3 className="u-ta-judul-kartu">
          <Settings2 aria-hidden /> Aturan pengajuan
        </h3>
        <label className="u-ta-saklar">
          <Switch checked={v.aktif} onCheckedChange={(x) => setV({ ...v, aktif: x })} />
          <span>
            <strong>Pengajuan online dibuka</strong>
            <span className="u-ta-redup">Mahasiswa bisa membuat dan mengirim pengajuan judul.</span>
          </span>
        </label>
        <label className="u-ta-saklar">
          <Switch checked={v.usulan_pembimbing} onCheckedChange={(x) => setV({ ...v, usulan_pembimbing: x })} />
          <span>
            <strong>Mahasiswa boleh mengusulkan pembimbing</strong>
            <span className="u-ta-redup">Prodi tetap yang menetapkan pembimbing akhir.</span>
          </span>
        </label>
        <Field label="Alur validasi">
          <SegmentedControl<'pa,prodi' | 'prodi'>
            aria-label="Alur validasi"
            value={v.alur.join(',') === 'prodi' ? 'prodi' : 'pa,prodi'}
            onValueChange={(x) => setV({ ...v, alur: x === 'prodi' ? ['prodi'] : ['pa', 'prodi'] })}
            options={[
              { value: 'pa,prodi', label: 'Dosen PA lalu prodi', icon: <UserCheck /> },
              { value: 'prodi', label: 'Langsung prodi' },
            ]}
          />
        </Field>
        <Field label="Petunjuk untuk mahasiswa" optional>
          <Textarea rows={4} value={v.petunjuk ?? ''} onChange={(e) => setV({ ...v, petunjuk: e.target.value })} placeholder="Mis. unduh format surat pengajuan judul di laman prodi; judul paling banyak 20 kata." />
        </Field>
      </Card>
      <Card className="u-ta-kartu">
        <h3 className="u-ta-judul-kartu">
          <Paperclip aria-hidden /> Berkas yang diminta
        </h3>
        <ul className="u-ta-atur-berkas">
          {v.berkas.map((b, i) => (
            <li key={i}>
              <Input aria-label="Nama berkas" value={b.nama} placeholder="Nama berkas, mis. Surat pengajuan judul" onChange={(e) => ubahBerkas(i, { nama: e.target.value })} />
              <Input aria-label="Keterangan" value={b.keterangan ?? ''} placeholder="Keterangan (opsional)" onChange={(e) => ubahBerkas(i, { keterangan: e.target.value })} />
              <label className="u-ta-saklar u-ta-saklar-kecil">
                <Switch size="sm" checked={b.wajib} onCheckedChange={(x) => ubahBerkas(i, { wajib: x })} /> Wajib
              </label>
              <Button variant="ghost" size="sm" iconOnly aria-label={`Hapus ${b.nama || 'berkas'}`} onClick={() => setV({ ...v, berkas: v.berkas.filter((_, j) => j !== i) })}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
        <div>
          <Button variant="outline" size="sm" onClick={() => setV({ ...v, berkas: [...v.berkas, { kode: '', nama: '', wajib: false, keterangan: '' }] })}>
            <Plus /> Tambah berkas
          </Button>
        </div>
      </Card>
      <div className="u-ta-aksi">
        <Button loading={kirim} onClick={() => void simpan()}>
          Simpan pengaturan
        </Button>
      </div>
    </div>
  );
}

// ================================================================ Syarat yudisium dan wisuda
interface SyaratTambahan {
  id: number;
  kode: string;
  nama: string;
  untuk: 'yudisium' | 'wisuda' | 'keduanya';
  jenis: 'manual' | 'unggah' | 'poin_minimal' | 'bebas_tunggakan' | 'bebas_pustaka';
  wajib: boolean;
  terpenuhi: boolean;
  nilai?: unknown;
  minimal?: number;
  pengajuan?: { id: number; status: 'diajukan' | 'terpenuhi' | 'ditolak'; keterangan: string | null; catatan: string | null; diputus_at?: string | null } | null;
}
interface SyaratKelulusan {
  nim: string;
  nama: string;
  sks: number;
  ipk: number;
  akademik: { boleh: boolean; alasan: string | null };
  wisuda: { boleh_daftar: boolean; syarat: Array<{ kode: string; nama: string; terpenuhi: boolean; nilai?: unknown }>; status_pendaftaran: string };
  tambahan: SyaratTambahan[];
  boleh_yudisium: boolean;
  boleh_wisuda: boolean;
  kurang: { yudisium: string[]; wisuda: string[] };
}

function KirimBuktiSyarat({ nim, s, onTutup }: { nim: string; s: SyaratTambahan; onTutup: () => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [ket, setKet] = React.useState(s.pengajuan?.keterangan ?? '');
  const [file, setFile] = React.useState<File | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [kirim, setKirim] = React.useState(false);
  const simpan = async () => {
    if (s.jenis === 'unggah' && !file && !s.pengajuan) {
      setGalat('Lampirkan berkas bukti.');
      return;
    }
    if (s.jenis === 'manual' && !ket.trim() && !file) {
      setGalat('Tulis keterangan atau lampirkan bukti.');
      return;
    }
    setKirim(true);
    try {
      const body = { syarat_id: s.id, nim, keterangan: ket.trim() || null };
      const r = s.pengajuan
        ? await siakad.request<{ id: number }>({ method: 'PUT', path: `/v1/kelulusan/syarat-mahasiswa/${s.pengajuan.id}`, body })
        : await siakad.request<{ id: number }>({ method: 'POST', path: '/v1/kelulusan/syarat-mahasiswa', body });
      if (file) {
        await siakad.request({ method: 'POST', path: `/v1/kelulusan/syarat-mahasiswa/${r.data.id}/berkas`, body: { berkas: file, jenis: 'bukti' }, multipart: true }, { timeout: 300_000 });
      }
      invalidateSiakad('kelulusan');
      toast.add({ title: 'Bukti dikirim', description: 'Petugas akan memeriksa dan menandai syarat ini.', type: 'success' });
      onTutup();
    } catch (e) {
      toast.add({ title: 'Gagal mengirim bukti', description: pesanGalat(e), type: 'error' });
    } finally {
      setKirim(false);
    }
  };
  return (
    <Dialog
      side="right"
      open
      onOpenChange={(o) => !o && onTutup()}
      title={s.nama}
      description={s.jenis === 'unggah' ? 'Unggah berkas bukti pemenuhan syarat ini.' : 'Tulis keterangan pemenuhan syarat; lampirkan bukti bila ada.'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onTutup}>
            Batal
          </Button>
          <Button loading={kirim} onClick={() => void simpan()}>
            Kirim bukti
          </Button>
        </>
      }
    >
      <div className="u-ta-form">
        {s.pengajuan?.status === 'ditolak' && s.pengajuan.catatan && (
          <Alert variant="danger" title="Bukti sebelumnya ditolak">
            {s.pengajuan.catatan}
          </Alert>
        )}
        <Field label="Keterangan" optional={s.jenis === 'unggah'}>
          <Textarea rows={3} value={ket} onChange={(e) => setKet(e.target.value)} placeholder="Mis. nomor sertifikat, tanggal kegiatan" />
        </Field>
        <Field label="Berkas bukti" required={s.jenis === 'unggah' && !s.pengajuan} optional={s.jenis !== 'unggah'} error={galat ?? undefined} description="PDF atau gambar, paling besar sesuai batas server.">
          <IsianBerkas
            value={file}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            info={false}
            onValueChange={(f) => {
              setFile(f);
              setGalat(null);
            }}
          />
        </Field>
      </div>
    </Dialog>
  );
}

const UNTUK_SYARAT: Record<SyaratTambahan['untuk'], string> = { yudisium: 'Yudisium', wisuda: 'Wisuda', keduanya: 'Yudisium & wisuda' };

/**
 * Mahasiswa: syarat yudisium dan wisuda (dihitung otomatis dan tambahan prodi), dengan kiriman bukti untuk syarat
 * manual/unggah (POST /v1/kelulusan/syarat-mahasiswa + lampiran). Pendaftaran wisuda tetap lewat PendaftaranWisuda.
 */
export function SyaratKelulusanSaya({ nim, className }: { nim: string; className?: string }) {
  const q = useSiakadQuery<SyaratKelulusan>(['kelulusan', 'syarat', nim], (s, signal) => s.request<SyaratKelulusan>({ method: 'GET', path: `/v1/kelulusan/mahasiswa/${enc(nim)}/syarat` }, { signal }), { enabled: Boolean(nim) });
  useSaatInvalidasi('kelulusan', q.refetch);
  const [buka, setBuka] = React.useState<SyaratTambahan | null>(null);
  if (q.error && !q.data) return <GalatApi error={q.error} onRetry={q.refetch} />;
  const d = q.data;
  if (!d) return <Skeleton style={{ height: 280 }} />;
  const otomatis = d.wisuda.syarat;
  const tambahan = d.tambahan;
  const total = otomatis.length + tambahan.length;
  const ok = otomatis.filter((x) => x.terpenuhi).length + tambahan.filter((x) => x.terpenuhi).length;
  const nilaiTeks = (s: SyaratTambahan) =>
    s.jenis === 'poin_minimal' ? `Poin ${String(s.nilai ?? 0)} dari minimal ${s.minimal ?? 0}` : s.jenis === 'bebas_tunggakan' ? (s.terpenuhi ? 'Tidak ada tunggakan' : `Tunggakan Rp${Number(s.nilai ?? 0).toLocaleString('id-ID')}`) : s.jenis === 'bebas_pustaka' ? (s.terpenuhi ? 'Bebas pinjaman perpustakaan' : 'Masih ada pinjaman/denda perpustakaan') : null;

  return (
    <div className={cn('u-ta', className)}>
      <Card className="u-ta-kartu">
        <div className="u-ta-ringkas-syarat">
          <div>
            <span className="u-ta-redup">Yudisium</span>
            <Badge variant={d.boleh_yudisium ? 'success' : 'warning'} dot>
              {d.boleh_yudisium ? 'Memenuhi syarat' : 'Belum memenuhi'}
            </Badge>
          </div>
          <div>
            <span className="u-ta-redup">Wisuda</span>
            <Badge variant={d.boleh_wisuda ? 'success' : 'warning'} dot>
              {d.boleh_wisuda ? 'Memenuhi syarat' : 'Belum memenuhi'}
            </Badge>
          </div>
          <div>
            <span className="u-ta-redup">SKS / IPK</span>
            <strong>
              {d.sks} / {Number(d.ipk).toFixed(2)}
            </strong>
          </div>
        </div>
        <Progress value={total ? (ok / total) * 100 : 0} label={`${ok} dari ${total} syarat terpenuhi`} showValue tone={ok === total ? 'success' : 'primary'} />
        {!d.akademik.boleh && d.akademik.alasan && <p className="u-ta-redup">{d.akademik.alasan}</p>}
      </Card>

      <Card className="u-ta-kartu">
        <h3 className="u-ta-judul-kartu">Syarat dari data akademik</h3>
        <p className="u-ta-redup">Diperiksa otomatis oleh SIAKAD; tidak perlu mengunggah apa pun.</p>
        <ul className="u-ta-syarat">
          {otomatis.map((s) => (
            <li key={s.kode} data-ok={s.terpenuhi ? '' : undefined}>
              {s.terpenuhi ? <CircleCheck aria-hidden /> : <CircleX aria-hidden />}
              <span>{s.nama}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="u-ta-kartu">
        <h3 className="u-ta-judul-kartu">Syarat tambahan prodi dan kampus</h3>
        {!tambahan.length ? (
          <p className="u-ta-redup">Tidak ada syarat tambahan.</p>
        ) : (
          <ul className="u-ta-syarat">
            {tambahan.map((s) => {
              const bisaKirim = (s.jenis === 'manual' || s.jenis === 'unggah') && !s.terpenuhi && s.pengajuan?.status !== 'diajukan';
              const nt = nilaiTeks(s);
              return (
                <li key={s.id} data-ok={s.terpenuhi ? '' : undefined}>
                  {s.terpenuhi ? <CircleCheck aria-hidden /> : s.pengajuan?.status === 'diajukan' ? <Clock aria-hidden /> : <CircleX aria-hidden />}
                  <div className="u-ta-syarat-isi">
                    <span>
                      {s.nama}
                      {!s.wajib && <span className="u-ta-redup"> (opsional)</span>}
                    </span>
                    <span className="u-ta-redup">
                      {UNTUK_SYARAT[s.untuk]}
                      {nt ? ` · ${nt}` : ''}
                      {s.pengajuan?.status === 'diajukan' ? ' · Bukti sedang diperiksa' : ''}
                    </span>
                    {s.pengajuan?.status === 'ditolak' && s.pengajuan.catatan && <span className="u-ta-tolak">Ditolak: {s.pengajuan.catatan}</span>}
                  </div>
                  {bisaKirim && (
                    <Button size="sm" variant="outline" onClick={() => setBuka(s)}>
                      <Upload /> {s.pengajuan?.status === 'ditolak' ? 'Kirim ulang' : 'Kirim bukti'}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      {buka && <KirimBuktiSyarat nim={nim} s={buka} onTutup={() => setBuka(null)} />}
    </div>
  );
}
