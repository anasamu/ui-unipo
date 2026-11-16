'use client';
import * as React from 'react';
import {
  CircleCheck,
  CircleDot,
  CircleX,
  Download,
  FileText,
  FilePlus2,
  History,
  MapPin,
  Paperclip,
  Pencil,
  RotateCcw,
  Send,
  ShieldCheck,
  Tent,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Card, DescriptionList, Empty, Stepper } from '../components/display';
import { Field, Input, SegmentedControl, Textarea } from '../components/forms';
import { ConfirmDialog, Dialog, useToast } from '../components/overlays';
import { Select } from '../components/select';
import { DataTable, type DataColumn } from '../components/data-table';
import { useUnggahBerkas } from './berkas';
import { GalatApi } from './galat';
import { invalidateSiakad, pesanGalat, useSaatInvalidasi, useSiakad, useSiakadQuery } from './provider';

/*
 * Pengajuan ke LP2M (API SIAKAD /v1/lppm) yang sama di semua aplikasi:
 *
 *   - BerkasLppm      : proposal dan dokumen pendukung per jenis untuk entitas LPPM (usulan, kkn_proposal, laporan, ...)
 *   - RiwayatLppm     : linimasa proses (diajukan, catatan fakultas/LP2M, keputusan) dari lppm_log
 *   - ProposalKknSaya : mahasiswa peserta KKN membuat, melampirkan, mengajukan, dan memantau proposal penelitian KKN
 *   - VerifikasiProposalKkn : tim LP2M memeriksa dan memutuskan proposal KKN (diterima, revisi, ditolak)
 *
 * Semua berkas diunggah ke /v1/berkas dulu (bertahap untuk file besar), lalu ditautkan ke entitas dengan berkas_id.
 */

const P = '/v1/lppm';
type Nada = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'primary';

// ================================================================ Tipe
export interface FileLppm {
  id: string;
  entitas: string;
  entitas_id: number;
  peran: string;
  nama: string;
  mime: string;
  ukuran: number;
  keterangan?: string | null;
  diunggah_oleh?: string | null;
  diunggah_pada?: string | null;
  created_at?: string | null;
}

/** Jenis berkas yang diminta untuk satu pengajuan; `kode` dikirim sebagai `peran` file LPPM. */
export interface JenisBerkasLppm {
  kode: string;
  nama: string;
  wajib?: boolean;
  keterangan?: string;
}

export interface RiwayatLppmItem {
  id: number;
  aksi: string;
  oleh?: string | null;
  nama_oleh?: string | null;
  detail?: Record<string, unknown> | null;
  created_at: string;
}

export type StatusProposalKkn = 'draf' | 'diajukan' | 'revisi' | 'diterima' | 'ditolak' | 'dibatalkan';

export interface ProposalKkn {
  id: number;
  uuid: string;
  nomor: string | null;
  periode_id: number;
  periode_nama?: string | null;
  periode_status?: string | null;
  peserta_id: number;
  kelompok_id: number | null;
  kelompok_nama?: string | null;
  kelompok_kode?: string | null;
  nim: string;
  nama?: string | null;
  kode_prodi?: string | null;
  nama_prodi?: string | null;
  nama_dpl?: string | null;
  jenis: 'penelitian' | 'pengabdian' | 'program_kerja';
  judul: string;
  ringkasan: string | null;
  lokasi: string | null;
  mitra: string | null;
  status: StatusProposalKkn;
  diajukan_pada: string | null;
  diverifikasi_oleh?: string | null;
  diverifikasi_pada: string | null;
  catatan_verifikasi: string | null;
  jumlah_berkas?: number;
  file?: FileLppm[];
  riwayat?: RiwayatLppmItem[];
  hak?: { ubah: boolean; unggah: boolean; ajukan: boolean; batal: boolean; verifikasi: boolean };
  updated_at?: string;
}

interface PeriodeKkn {
  id: number;
  kode: string;
  nama: string;
  jenis: string;
  status: string;
  daftar_mulai: string | null;
  daftar_selesai: string | null;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
}

interface PesertaKkn {
  id: number;
  periode_id: number;
  kelompok_id: number | null;
  status: string;
  jabatan?: string | null;
  kelompok?: { id: number; kode: string; nama: string; desa?: string | null; nama_dpl?: string | null } | null;
}

// ================================================================ Konstanta
/** Berkas usulan penelitian/PkM dosen. Proposal wajib bila substansi tidak diisi di aplikasi LP2M. */
export const BERKAS_USULAN_LPPM: JenisBerkasLppm[] = [
  { kode: 'proposal', nama: 'Proposal', wajib: true, keterangan: 'Naskah proposal sesuai panduan skema (PDF/DOCX).' },
  { kode: 'pengesahan', nama: 'Lembar pengesahan', keterangan: 'Ditandatangani ketua, kaprodi/dekan.' },
  { kode: 'surat_mitra', nama: 'Surat kesediaan mitra', keterangan: 'Bila skema mewajibkan mitra.' },
  { kode: 'lampiran', nama: 'Dokumen pendukung lain', keterangan: 'CV tim, instrumen, izin, data awal, dan sebagainya.' },
];

/** Berkas proposal penelitian KKN mahasiswa. */
export const BERKAS_PROPOSAL_KKN: JenisBerkasLppm[] = [
  { kode: 'proposal', nama: 'Proposal penelitian KKN', wajib: true, keterangan: 'Latar belakang, tujuan, metode, jadwal, dan rencana luaran (PDF/DOCX).' },
  { kode: 'surat_mitra', nama: 'Surat kesediaan desa/mitra', keterangan: 'Bila sudah ada.' },
  { kode: 'lampiran', nama: 'Dokumen pendukung lain', keterangan: 'Instrumen, peta lokasi, foto survei awal, dan sebagainya.' },
];

export const LABEL_STATUS_PROPOSAL_KKN: Record<StatusProposalKkn, string> = {
  draf: 'Draf',
  diajukan: 'Menunggu verifikasi LP2M',
  revisi: 'Perlu diperbaiki',
  diterima: 'Diterima',
  ditolak: 'Ditolak',
  dibatalkan: 'Dibatalkan',
};
const NADA_PROPOSAL: Record<StatusProposalKkn, Nada> = { draf: 'neutral', diajukan: 'info', revisi: 'warning', diterima: 'success', ditolak: 'danger', dibatalkan: 'neutral' };
const JENIS_PROPOSAL = [
  { value: 'penelitian', label: 'Penelitian' },
  { value: 'pengabdian', label: 'Pengabdian' },
  { value: 'program_kerja', label: 'Program kerja' },
] as const;

/** Label aksi lppm_log yang dibaca pengusul. */
export const LABEL_AKSI_LPPM: Record<string, string> = {
  buat: 'Draf dibuat',
  ubah: 'Isian diperbarui',
  unggah_file: 'Berkas dilampirkan',
  hapus_file: 'Berkas dihapus',
  ajukan: 'Diajukan',
  ajukan_ulang: 'Diajukan ulang setelah perbaikan',
  anggota_tambah: 'Anggota ditambahkan',
  anggota_hapus: 'Anggota dihapus',
  anggota_setuju: 'Anggota menyetujui keikutsertaan',
  anggota_menolak: 'Anggota menolak keikutsertaan',
  kolaborator_setuju: 'Kolaborator menyetujui',
  kolaborator_menolak: 'Kolaborator menolak',
  undang_kolaborator: 'Kolaborator diundang',
  rab: 'RAB diperbarui',
  rab_realisasi: 'Realisasi RAB diperbarui',
  fakultas_disetujui: 'Disetujui fakultas',
  fakultas_ditolak: 'Ditolak fakultas',
  fakultas_revisi: 'Fakultas meminta perbaikan',
  tugaskan_reviewer: 'Masuk tahap review LP2M',
  tetapkan_diterima: 'Ditetapkan diterima LP2M',
  tetapkan_ditolak: 'Ditetapkan tidak didanai',
  tetapkan_revisi: 'LP2M meminta perbaikan',
  kontrak: 'Kontrak ditandatangani, pelaksanaan dimulai',
  selesai: 'Kegiatan selesai',
  batal: 'Dibatalkan',
  hapus: 'Dihapus',
  verifikasi_diterima: 'Diterima LP2M',
  verifikasi_revisi: 'LP2M meminta perbaikan',
  verifikasi_ditolak: 'Ditolak LP2M',
};

function nadaAksi(aksi: string): 'selesai' | 'perlu' | 'ditolak' | 'biasa' {
  if (/(_diterima|_disetujui|^kontrak$|^selesai$|_setuju$)/.test(aksi)) return 'selesai';
  if (/(_revisi$)/.test(aksi)) return 'perlu';
  if (/(_ditolak$|^batal$|_menolak$|^hapus$)/.test(aksi)) return 'ditolak';
  return 'biasa';
}

const tgl = (s: string | null | undefined, jam = false) => {
  if (!s) return '–';
  const d = new Date(s.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('id-ID', jam ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'long', year: 'numeric' });
};
const ukuran = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

async function unduhFileLppm(siakad: ReturnType<typeof useSiakad>, f: FileLppm, buka: boolean) {
  const r = await siakad.request<unknown>({ method: 'GET', path: `${P}/file/${encodeURIComponent(f.id)}/unduh`, query: buka ? { inline: '1' } : {} });
  const d = r.data as { blob?: () => Blob } | Blob | null;
  const blob = d instanceof Blob ? d : d && typeof d === 'object' && typeof d.blob === 'function' ? d.blob() : null;
  if (!blob) throw new Error('Berkas tidak dapat diunduh.');
  const url = URL.createObjectURL(blob);
  if (buka) window.open(url, '_blank', 'noopener');
  else {
    const a = document.createElement('a');
    a.href = url;
    a.download = f.nama;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ================================================================ Berkas
export interface BerkasLppmProps {
  /** Entitas pemilik: usulan, kkn_proposal, laporan, luaran, ... */
  entitas: string;
  entitasId: number | string;
  /** Jenis berkas yang diminta (bawaan: berkas usulan). Berkas dengan peran lain tampil di "Dokumen pendukung lain". */
  jenis?: JenisBerkasLppm[];
  /** Boleh unggah dan hapus (ambil dari `hak` detail). */
  bolehUbah?: boolean;
  /** Daftar file dari detail (bila sudah ada); tanpa ini dimuat dari GET /v1/lppm/file/{entitas}/{id}. */
  file?: FileLppm[];
  className?: string;
}

/**
 * Proposal dan dokumen pendukung untuk satu pengajuan LPPM, dikelompokkan per jenis: tanda lengkap, unggah per jenis
 * (ke /v1/berkas lalu ditautkan), lihat/unduh, dan hapus selama pengajuan masih bisa diubah.
 *
 *   <BerkasLppm entitas="usulan" entitasId={k.id} bolehUbah={k.hak?.ubah} />
 */
export function BerkasLppm({ entitas, entitasId, jenis = BERKAS_USULAN_LPPM, bolehUbah = false, file, className }: BerkasLppmProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useSiakadQuery<FileLppm[]>(['lppm', 'file', entitas, entitasId], (s, signal) => s.request<FileLppm[]>({ method: 'GET', path: `${P}/file/${entitas}/${entitasId}` }, { signal }), {
    enabled: !file,
    staleTime: 5_000,
  });
  useSaatInvalidasi('lppm', () => {
    if (!file) q.refetch();
  });
  const unggah = useUnggahBerkas({ kategori: 'dokumen', modul: 'lppm', keterangan: `LPPM ${entitas} ${entitasId}` });
  const [proses, setProses] = React.useState<Record<string, number>>({});
  const [hapus, setHapus] = React.useState<FileLppm | null>(null);
  const daftar = file ?? q.data ?? [];
  const kodeDikenal = new Set(jenis.map((j) => j.kode));
  const baris = jenis.some((j) => j.kode === 'lampiran') ? jenis : [...jenis, { kode: 'lampiran', nama: 'Dokumen pendukung lain' }];

  const pilih = async (peran: string, files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    for (const f of list) {
      setProses((o) => ({ ...o, [peran]: 0 }));
      try {
        const b = await unggah(f, (x) => setProses((o) => ({ ...o, [peran]: x })));
        await siakad.request({ method: 'POST', path: `${P}/file/${entitas}/${entitasId}`, body: { berkas_id: b.id, peran } });
        toast.add({ title: 'Berkas dilampirkan', description: f.name, type: 'success' });
      } catch (e) {
        toast.add({ title: `Gagal mengunggah ${f.name}`, description: pesanGalat(e), type: 'error' });
      } finally {
        setProses(({ [peran]: _, ...o }) => o);
      }
    }
    invalidateSiakad('lppm');
  };
  const lihat = async (f: FileLppm, buka: boolean) => {
    try {
      await unduhFileLppm(siakad, f, buka);
    } catch (e) {
      toast.add({ title: 'Gagal membuka berkas', description: pesanGalat(e), type: 'error' });
    }
  };

  if (!file && q.error && !q.data) return <GalatApi error={q.error} onRetry={q.refetch} />;
  if (!file && !q.data) return <Skeleton style={{ height: 160 }} />;

  return (
    <>
      <ul className={cn('u-lppm-berkas', className)}>
        {baris.map((j) => {
          const ada = daftar.filter((f) => f.peran === j.kode || (j.kode === 'lampiran' && !kodeDikenal.has(f.peran)));
          const p = proses[j.kode];
          if (!bolehUbah && !ada.length && !j.wajib) return null;
          return (
            <li key={j.kode} data-lengkap={ada.length ? '' : undefined} data-kurang={j.wajib && !ada.length ? '' : undefined}>
              <div className="u-lppm-berkas-kepala">
                <span className="u-lppm-berkas-ikon">{ada.length ? <CircleCheck aria-hidden /> : <Paperclip aria-hidden />}</span>
                <div className="u-lppm-berkas-nama">
                  <strong>
                    {j.nama}
                    {j.wajib && <span className="u-lppm-wajib">wajib</span>}
                  </strong>
                  {j.keterangan && <span>{j.keterangan}</span>}
                </div>
                {bolehUbah && (
                  <label className="u-lppm-unggah">
                    <input
                      type="file"
                      multiple={j.kode === 'lampiran'}
                      accept=".pdf,.doc,.docx,.odt,.xls,.xlsx,.pptx,.jpg,.jpeg,.png,.zip"
                      disabled={p !== undefined}
                      onChange={(e) => {
                        void pilih(j.kode, e.target.files);
                        e.target.value = '';
                      }}
                    />
                    <span className="u-button" data-variant="outline" data-size="sm">
                      <Upload aria-hidden /> {p !== undefined ? `Mengunggah ${p}%` : ada.length ? 'Tambah' : 'Unggah'}
                    </span>
                  </label>
                )}
              </div>
              {ada.length > 0 && (
                <ul className="u-lppm-berkas-file">
                  {ada.map((f) => (
                    <li key={f.id}>
                      <FileText aria-hidden />
                      <button type="button" className="u-lppm-tautan" onClick={() => void lihat(f, true)}>
                        {f.nama}
                      </button>
                      <span className="u-lppm-redup">
                        {ukuran(f.ukuran)}
                        {f.diunggah_pada || f.created_at ? ` · ${tgl(f.diunggah_pada ?? f.created_at, true)}` : ''}
                      </span>
                      <Button variant="ghost" size="sm" iconOnly aria-label={`Unduh ${f.nama}`} onClick={() => void lihat(f, false)}>
                        <Download />
                      </Button>
                      {bolehUbah && (
                        <Button variant="ghost" size="sm" iconOnly aria-label={`Hapus ${f.nama}`} onClick={() => setHapus(f)}>
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
      <ConfirmDialog
        open={hapus !== null}
        onOpenChange={(o) => !o && setHapus(null)}
        title="Hapus berkas?"
        description={hapus ? `${hapus.nama} dilepas dari pengajuan ini.` : undefined}
        confirmLabel="Hapus berkas"
        onConfirm={async () => {
          if (!hapus) return;
          try {
            await siakad.request({ method: 'DELETE', path: `${P}/file/${encodeURIComponent(hapus.id)}` });
            invalidateSiakad('lppm');
            toast.add({ title: 'Berkas dihapus', type: 'success' });
          } catch (e) {
            toast.add({ title: 'Gagal menghapus berkas', description: pesanGalat(e), type: 'error' });
          }
          setHapus(null);
        }}
      />
    </>
  );
}

// ================================================================ Riwayat
/** Catatan yang perlu dibaca pengusul dari detail log (catatan fakultas/LP2M, alasan batal, nomor). */
function isiRiwayat(r: RiwayatLppmItem): string | null {
  const d = r.detail ?? {};
  const teks = (k: string) => (typeof d[k] === 'string' && (d[k] as string).trim() !== '' ? (d[k] as string) : null);
  if (r.aksi === 'unggah_file' || r.aksi === 'hapus_file') return teks('nama');
  return teks('catatan') ?? teks('catatan_keputusan') ?? teks('alasan') ?? (teks('nomor') ? `Nomor registrasi ${teks('nomor')}` : null) ?? (teks('nomor_sk') ? `SK ${teks('nomor_sk')}` : null);
}

export interface RiwayatLppmProps {
  riwayat: RiwayatLppmItem[] | undefined;
  loading?: boolean;
  /** Sembunyikan aksi teknis (ubah isian, berkas) agar linimasa fokus pada proses. Bawaan false. */
  ringkas?: boolean;
  className?: string;
}

/**
 * Linimasa proses pengajuan LPPM, terbaru di atas: siapa, kapan, dan catatan dari fakultas/LP2M. Keputusan diberi
 * warna (diterima, perlu perbaikan, ditolak) supaya pengusul langsung tahu apa yang harus dilakukan.
 */
export function RiwayatLppm({ riwayat, loading, ringkas, className }: RiwayatLppmProps) {
  if (loading && !riwayat) return <Skeleton style={{ height: 120 }} />;
  const r = [...(riwayat ?? [])].filter((x) => !ringkas || !['ubah', 'unggah_file', 'hapus_file', 'rab', 'rab_realisasi'].includes(x.aksi)).reverse();
  if (!r.length) return <p className="u-lppm-redup">Belum ada riwayat.</p>;
  return (
    <ol className={cn('u-lppm-riwayat', className)}>
      {r.map((x) => {
        const isi = isiRiwayat(x);
        const nada = nadaAksi(x.aksi);
        return (
          <li key={x.id} data-nada={nada}>
            <span className="u-lppm-riwayat-ikon" aria-hidden>
              {nada === 'selesai' ? <CircleCheck /> : nada === 'perlu' ? <RotateCcw /> : nada === 'ditolak' ? <CircleX /> : <CircleDot />}
            </span>
            <div>
              <strong>{LABEL_AKSI_LPPM[x.aksi] ?? x.aksi.replace(/_/g, ' ')}</strong>
              <span className="u-lppm-redup">
                {tgl(x.created_at, true)}
                {x.nama_oleh || x.oleh ? ` · ${x.nama_oleh ?? x.oleh}` : ''}
              </span>
              {isi && <blockquote className="u-lppm-catatan">{isi}</blockquote>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Riwayat kegiatan/usulan LPPM (GET /v1/lppm/kegiatan/{id}/riwayat). */
export function useRiwayatKegiatanLppm(id: number | string | null | undefined) {
  const q = useSiakadQuery<RiwayatLppmItem[]>(['lppm', 'riwayat', id ?? ''], (s, signal) => s.request<RiwayatLppmItem[]>({ method: 'GET', path: `${P}/kegiatan/${id}/riwayat` }, { signal }), {
    enabled: id != null && id !== '',
    staleTime: 5_000,
  });
  useSaatInvalidasi('lppm', q.refetch);
  return q;
}

// ================================================================ Proposal KKN: bersama
/** Lencana status proposal KKN. */
export function StatusProposalKknBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant={NADA_PROPOSAL[status as StatusProposalKkn] ?? 'neutral'} dot className={className}>
      {LABEL_STATUS_PROPOSAL_KKN[status as StatusProposalKkn] ?? status}
    </Badge>
  );
}

/** Alur proposal KKN: draf → diajukan → verifikasi LP2M → diterima. Revisi kembali ke langkah draf. */
export function AlurProposalKkn({ status, className }: { status: string; className?: string }) {
  if (status === 'ditolak' || status === 'dibatalkan') return null;
  const idx = status === 'diterima' ? 4 : status === 'diajukan' ? 2 : 0;
  return (
    <Stepper
      className={className}
      current={idx}
      steps={[
        { title: status === 'revisi' ? 'Perbaiki' : 'Susun', description: 'Isian + berkas proposal' },
        { title: 'Ajukan', description: 'Nomor KKN terbit' },
        { title: 'Verifikasi LP2M', description: 'Diperiksa tim LP2M' },
        { title: 'Diterima', description: 'Siap dilaksanakan' },
      ]}
    />
  );
}

function useDetailProposalKkn(id: number | null) {
  const q = useSiakadQuery<ProposalKkn>(['lppm', 'kkn-proposal', id ?? ''], (s, signal) => s.request<ProposalKkn>({ method: 'GET', path: `${P}/kkn/proposal/${id}` }, { signal }), {
    enabled: id != null,
    staleTime: 3_000,
  });
  useSaatInvalidasi('lppm', q.refetch);
  return q;
}

interface IsianProposal {
  jenis: string;
  judul: string;
  ringkasan: string;
  lokasi: string;
  mitra: string;
}

function FormProposalKkn({ awal, periodeId, onSelesai, onBatal }: { awal?: ProposalKkn | null; periodeId: number; onSelesai: (p: ProposalKkn) => void; onBatal?: () => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [v, setV] = React.useState<IsianProposal>({
    jenis: awal?.jenis ?? 'penelitian',
    judul: awal?.judul ?? '',
    ringkasan: awal?.ringkasan ?? '',
    lokasi: awal?.lokasi ?? '',
    mitra: awal?.mitra ?? '',
  });
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [kirim, setKirim] = React.useState(false);
  const set = (k: keyof IsianProposal, x: string) => {
    setV((o) => ({ ...o, [k]: x }));
    if (galat[k]) setGalat(({ [k]: _, ...g }) => g);
  };
  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (v.judul.trim().length < 10) return setGalat({ judul: 'Tulis judul lengkap, paling sedikit 10 karakter.' });
    setKirim(true);
    try {
      const body = { ...Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x.trim() === '' ? null : x.trim()])), ...(awal ? {} : { periode_id: periodeId }) };
      const r = await siakad.request<ProposalKkn>({ method: 'POST', path: awal ? `${P}/kkn/proposal/${awal.id}` : `${P}/kkn/proposal`, body });
      invalidateSiakad('lppm');
      toast.add({ title: awal ? 'Perubahan disimpan' : 'Draf proposal dibuat', description: awal ? undefined : 'Lampirkan berkas proposal lalu ajukan ke LP2M.', type: 'success' });
      onSelesai(r.data);
    } catch (err) {
      const f = (err as { errors?: Record<string, string | string[]>; details?: Record<string, string> }).errors ?? (err as { details?: Record<string, string> }).details;
      if (f) setGalat(Object.fromEntries(Object.entries(f).map(([k, x]) => [k, Array.isArray(x) ? x.join(' ') : String(x)])));
      toast.add({ title: 'Gagal menyimpan', description: pesanGalat(err), type: 'error' });
    } finally {
      setKirim(false);
    }
  };
  return (
    <form className="u-lppm-form" onSubmit={simpan} noValidate>
      <Field label="Jenis proposal" required>
        <SegmentedControl options={JENIS_PROPOSAL.map((j) => ({ value: j.value, label: j.label }))} value={v.jenis} onValueChange={(x) => set('jenis', String(x))} />
      </Field>
      <Field label="Judul" required error={galat.judul}>
        <Textarea rows={2} maxLength={500} value={v.judul} onChange={(e) => set('judul', e.target.value)} />
      </Field>
      <Field label="Ringkasan" required error={galat.ringkasan} description="Latar belakang, tujuan, metode, dan hasil yang diharapkan. Minimal 50 karakter sebelum diajukan.">
        <Textarea rows={5} value={v.ringkasan} onChange={(e) => set('ringkasan', e.target.value)} />
      </Field>
      <div className="u-lppm-form-kisi">
        <Field label="Lokasi" optional error={galat.lokasi}>
          <Input maxLength={255} value={v.lokasi} onChange={(e) => set('lokasi', e.target.value)} placeholder="Desa, kecamatan" />
        </Field>
        <Field label="Mitra/sasaran" optional error={galat.mitra}>
          <Input maxLength={150} value={v.mitra} onChange={(e) => set('mitra', e.target.value)} placeholder="Pemerintah desa, kelompok tani, UMKM, ..." />
        </Field>
      </div>
      <div className="u-lppm-aksi">
        {onBatal && (
          <Button type="button" variant="ghost" onClick={onBatal}>
            Batal
          </Button>
        )}
        <Button type="submit" loading={kirim}>
          {awal ? 'Simpan perubahan' : 'Simpan draf'}
        </Button>
      </div>
    </form>
  );
}

function KartuProposal({ id, periodeId }: { id: number; periodeId: number }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useDetailProposalKkn(id);
  const [ubah, setUbah] = React.useState(false);
  const [konfirmasi, setKonfirmasi] = React.useState<'ajukan' | 'batal' | null>(null);
  const cek = useSiakadQuery<{ siap: boolean; masalah: string[] }>(['lppm', 'kkn-proposal-cek', id, q.data?.updated_at ?? '', q.data?.file?.length ?? 0], (s, signal) => s.request({ method: 'GET', path: `${P}/kkn/proposal/${id}/cek` }, { signal }), {
    enabled: Boolean(q.data?.hak?.ajukan),
    staleTime: 2_000,
  });
  if (q.error && !q.data) return <GalatApi error={q.error} onRetry={q.refetch} />;
  const p = q.data;
  if (!p) return <Skeleton style={{ height: 280 }} />;
  const hak = p.hak ?? { ubah: false, unggah: false, ajukan: false, batal: false, verifikasi: false };
  const aksi = async (jenis: 'ajukan' | 'batal') => {
    try {
      await siakad.request({ method: 'POST', path: `${P}/kkn/proposal/${p.id}/${jenis}`, body: {} });
      invalidateSiakad('lppm');
      toast.add({ title: jenis === 'ajukan' ? 'Proposal diajukan ke LP2M' : 'Proposal dibatalkan', type: 'success' });
    } catch (e) {
      toast.add({ title: jenis === 'ajukan' ? 'Belum bisa diajukan' : 'Gagal membatalkan', description: pesanGalat(e), type: 'error' });
    }
    setKonfirmasi(null);
  };

  return (
    <Card className="u-lppm-kartu">
      <div className="u-lppm-kepala">
        <div>
          <div className="u-lppm-baris-lencana">
            <StatusProposalKknBadge status={p.status} />
            {p.nomor && <Badge variant="outline">{p.nomor}</Badge>}
            <Badge variant="outline">{JENIS_PROPOSAL.find((j) => j.value === p.jenis)?.label ?? p.jenis}</Badge>
          </div>
          <h3 className="u-lppm-judul">{p.judul}</h3>
          <p className="u-lppm-redup">
            {[p.periode_nama, p.kelompok_nama && `Kelompok ${p.kelompok_nama}`, p.nama_dpl && `DPL ${p.nama_dpl}`].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="u-lppm-aksi">
          {hak.ubah && !ubah && (
            <Button variant="outline" size="sm" onClick={() => setUbah(true)}>
              <Pencil /> Ubah isian
            </Button>
          )}
          {hak.batal && (
            <Button variant="ghost" size="sm" onClick={() => setKonfirmasi('batal')}>
              Batalkan
            </Button>
          )}
          {hak.ajukan && (
            <Button size="sm" disabled={!cek.data?.siap} onClick={() => setKonfirmasi('ajukan')}>
              <Send /> {p.status === 'revisi' ? 'Ajukan ulang' : 'Ajukan ke LP2M'}
            </Button>
          )}
        </div>
      </div>

      <AlurProposalKkn status={p.status} />

      {p.status === 'revisi' && p.catatan_verifikasi && (
        <Alert variant="warning" title="LP2M meminta perbaikan">
          <span className="u-lppm-pre">{p.catatan_verifikasi}</span>
        </Alert>
      )}
      {p.status === 'ditolak' && (
        <Alert variant="danger" title="Proposal ditolak LP2M">
          <span className="u-lppm-pre">{p.catatan_verifikasi ?? 'Tanpa catatan.'}</span>
        </Alert>
      )}
      {p.status === 'diterima' && (
        <Alert variant="success" title="Proposal diterima LP2M">
          <span className="u-lppm-pre">{p.catatan_verifikasi ?? `Diverifikasi ${tgl(p.diverifikasi_pada)}.`}</span>
        </Alert>
      )}
      {p.status === 'diajukan' && <Alert variant="info" title="Menunggu verifikasi LP2M">Diajukan {tgl(p.diajukan_pada, true)}. Anda akan mendapat notifikasi saat LP2M memutuskan.</Alert>}

      {ubah ? (
        <FormProposalKkn awal={p} periodeId={periodeId} onSelesai={() => setUbah(false)} onBatal={() => setUbah(false)} />
      ) : (
        <DescriptionList
          items={[
            { label: 'Ringkasan', value: <span className="u-lppm-pre">{p.ringkasan || '–'}</span> },
            { label: 'Lokasi', value: p.lokasi || '–' },
            { label: 'Mitra/sasaran', value: p.mitra || '–' },
          ]}
        />
      )}

      <section className="u-lppm-bagian">
        <h4>Berkas proposal</h4>
        <BerkasLppm entitas="kkn_proposal" entitasId={p.id} jenis={BERKAS_PROPOSAL_KKN} file={p.file} bolehUbah={hak.unggah} />
      </section>

      {hak.ajukan && cek.data && !cek.data.siap && (
        <Alert variant="warning" title="Lengkapi sebelum diajukan">
          <ul className="u-lppm-daftar">
            {cek.data.masalah.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </Alert>
      )}

      <section className="u-lppm-bagian">
        <h4>
          <History aria-hidden /> Riwayat proses
        </h4>
        <RiwayatLppm riwayat={p.riwayat} ringkas />
      </section>

      <ConfirmDialog
        open={konfirmasi !== null}
        onOpenChange={(o) => !o && setKonfirmasi(null)}
        tone={konfirmasi === 'batal' ? 'danger' : 'primary'}
        title={konfirmasi === 'batal' ? 'Batalkan proposal?' : 'Ajukan proposal ke LP2M?'}
        description={konfirmasi === 'batal' ? 'Proposal tidak bisa diajukan lagi. Anda bisa membuat proposal baru.' : 'Isian dan berkas dikunci selama diperiksa LP2M.'}
        confirmLabel={konfirmasi === 'batal' ? 'Batalkan proposal' : 'Ajukan sekarang'}
        onConfirm={() => aksi(konfirmasi!)}
      />
    </Card>
  );
}

// ================================================================ Proposal KKN: mahasiswa
export interface ProposalKknSayaProps {
  className?: string;
}

/**
 * Halaman mahasiswa: status KKN per periode, daftar KKN saat pendaftaran dibuka, lalu susun proposal penelitian KKN,
 * lampirkan berkas, ajukan ke LP2M, dan pantau verifikasinya (catatan perbaikan, keputusan, riwayat).
 */
export function ProposalKknSaya({ className }: ProposalKknSayaProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const saya = useSiakadQuery<PesertaKkn[]>(['lppm', 'kkn-saya'], (s, signal) => s.request<PesertaKkn[]>({ method: 'GET', path: `${P}/kkn/saya` }, { signal }), { staleTime: 10_000 });
  const periode = useSiakadQuery<PeriodeKkn[]>(['lppm', 'kkn-periode'], (s, signal) => s.request<PeriodeKkn[]>({ method: 'GET', path: `${P}/kkn/periode` }, { signal }), { staleTime: 60_000 });
  const proposal = useSiakadQuery<ProposalKkn[]>(['lppm', 'kkn-proposal-saya'], (s, signal) => s.request<ProposalKkn[]>({ method: 'GET', path: `${P}/kkn/proposal`, query: { saya: 1, per_page: 50 } }, { signal }), { staleTime: 5_000 });
  useSaatInvalidasi('lppm', () => {
    saya.refetch();
    proposal.refetch();
  });
  const [buat, setBuat] = React.useState<number | null>(null);
  const [daftar, setDaftar] = React.useState<PeriodeKkn | null>(null);

  const galat = saya.error ?? proposal.error;
  if (galat && !saya.data) return <GalatApi error={galat} onRetry={() => { saya.refetch(); proposal.refetch(); }} />;
  if (!saya.data || !proposal.data) return <Skeleton style={{ height: 320 }} />;
  const namaPeriode = new Map((periode.data ?? []).map((p) => [p.id, p]));
  const sudah = new Set(saya.data.map((s) => s.periode_id));
  const terbuka = (periode.data ?? []).filter((p) => p.status === 'pendaftaran' && !sudah.has(p.id));

  return (
    <div className={cn('u-lppm', className)}>
      {terbuka.map((p) => (
        <Alert
          key={p.id}
          variant="info"
          icon={<Tent />}
          title={`Pendaftaran ${p.nama} dibuka`}
          actions={
            <Button size="sm" onClick={() => setDaftar(p)}>
              <UserPlus /> Daftar KKN
            </Button>
          }
        >
          {p.daftar_selesai ? `Sampai ${tgl(p.daftar_selesai)}. ` : ''}Setelah terdaftar, susun dan ajukan proposal penelitian KKN di halaman ini.
        </Alert>
      ))}

      {!saya.data.length && !terbuka.length && (
        <Empty bordered icon={<Tent />} title="Anda belum terdaftar KKN" description="Saat LP2M membuka pendaftaran KKN, tombol daftar muncul di sini. Proposal penelitian KKN diajukan setelah terdaftar." />
      )}

      {saya.data.map((s) => {
        const per = namaPeriode.get(s.periode_id);
        const milik = proposal.data!.filter((x) => x.peserta_id === s.id);
        const aktif = milik.filter((x) => !['ditolak', 'dibatalkan'].includes(x.status));
        const lain = proposal.data!.filter((x) => x.periode_id === s.periode_id && x.peserta_id !== s.id);
        const bisaBuat = !aktif.length && ['mendaftar', 'diterima', 'ditempatkan', 'aktif'].includes(s.status) && ['pendaftaran', 'penempatan', 'berjalan'].includes(per?.status ?? '');
        return (
          <section key={s.id} className="u-lppm-periode">
            <div className="u-lppm-kepala">
              <div>
                <h3 className="u-lppm-judul-periode">{per?.nama ?? `Periode #${s.periode_id}`}</h3>
                <p className="u-lppm-redup">
                  Status peserta: <strong>{s.status.replace(/_/g, ' ')}</strong>
                  {s.kelompok ? (
                    <>
                      {' '}
                      · <MapPin aria-hidden /> {s.kelompok.nama}
                      {s.kelompok.nama_dpl ? ` · DPL ${s.kelompok.nama_dpl}` : ''}
                    </>
                  ) : (
                    ' · belum ditempatkan'
                  )}
                </p>
              </div>
              {bisaBuat && buat !== s.periode_id && (
                <Button onClick={() => setBuat(s.periode_id)}>
                  <FilePlus2 /> Buat proposal
                </Button>
              )}
            </div>
            {buat === s.periode_id && (
              <Card className="u-lppm-kartu">
                <h3 className="u-lppm-judul-kartu">Proposal penelitian KKN baru</h3>
                <FormProposalKkn periodeId={s.periode_id} onSelesai={() => setBuat(null)} onBatal={() => setBuat(null)} />
              </Card>
            )}
            {milik.map((x) => (
              <KartuProposal key={x.id} id={x.id} periodeId={s.periode_id} />
            ))}
            {!milik.length && buat !== s.periode_id && (
              <Empty
                bordered
                icon={<FileText />}
                title="Belum ada proposal"
                description={bisaBuat ? 'Susun proposal penelitian KKN, lampirkan berkasnya, lalu ajukan untuk diverifikasi LP2M.' : 'Periode ini tidak sedang menerima proposal.'}
              />
            )}
            {lain.length > 0 && (
              <div className="u-lppm-bagian">
                <h4>
                  <Users aria-hidden /> Proposal anggota kelompok
                </h4>
                <ul className="u-lppm-daftar-ringkas">
                  {lain.map((x) => (
                    <li key={x.id}>
                      <span>
                        <strong>{x.judul}</strong>
                        <span className="u-lppm-redup">{x.nama ?? x.nim}</span>
                      </span>
                      <StatusProposalKknBadge status={x.status} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        );
      })}

      <ConfirmDialog
        open={daftar !== null}
        onOpenChange={(o) => !o && setDaftar(null)}
        tone="primary"
        title={`Daftar ${daftar?.nama ?? 'KKN'}?`}
        description="Syarat KKN (SKS, IPK, pembayaran) diperiksa SIAKAD saat mendaftar."
        confirmLabel="Daftar sekarang"
        onConfirm={async () => {
          if (!daftar) return;
          try {
            await siakad.request({ method: 'POST', path: `${P}/kkn/periode/${daftar.id}/daftar`, body: {} });
            invalidateSiakad('lppm');
            toast.add({ title: 'Pendaftaran KKN terkirim', description: 'Sekarang Anda bisa menyusun proposal penelitian KKN.', type: 'success' });
          } catch (e) {
            toast.add({ title: 'Belum bisa mendaftar', description: pesanGalat(e), type: 'error' });
          }
          setDaftar(null);
        }}
      />
    </div>
  );
}

// ================================================================ Proposal KKN: verifikasi LP2M
export interface VerifikasiProposalKknProps {
  /** Status awal filter (bawaan: diajukan). */
  status?: string;
  className?: string;
}

/**
 * Halaman tim LP2M: daftar proposal KKN (menunggu verifikasi lebih dulu), filter periode/status, buka detail untuk
 * membaca isian dan berkas, lalu putuskan: terima, minta perbaikan, atau tolak (catatan wajib, terlihat mahasiswa).
 */
export function VerifikasiProposalKkn({ status: statusAwal = 'diajukan', className }: VerifikasiProposalKknProps) {
  const [periodeId, setPeriodeId] = React.useState<number | null>(null);
  const [status, setStatus] = React.useState<string>(statusAwal);
  const [kata, setKata] = React.useState('');
  const [buka, setBuka] = React.useState<number | null>(null);
  const periode = useSiakadQuery<PeriodeKkn[]>(['lppm', 'kkn-periode'], (s, signal) => s.request<PeriodeKkn[]>({ method: 'GET', path: `${P}/kkn/periode` }, { signal }), { staleTime: 60_000 });
  const rekap = useSiakadQuery<Record<StatusProposalKkn, number>>(['lppm', 'kkn-proposal-rekap', periodeId ?? ''], (s, signal) => s.request({ method: 'GET', path: `${P}/kkn/proposal/rekap`, query: { periode_id: periodeId ?? undefined } }, { signal }), { staleTime: 5_000 });
  const q = useSiakadQuery<ProposalKkn[]>(['lppm', 'kkn-proposal', periodeId ?? '', status, kata], (s, signal) =>
    s.request<ProposalKkn[]>({ method: 'GET', path: `${P}/kkn/proposal`, query: { periode_id: periodeId ?? undefined, status: status === 'semua' ? undefined : status, q: kata || undefined, per_page: 100 } }, { signal }),
  );
  useSaatInvalidasi('lppm', () => {
    q.refetch();
    rekap.refetch();
  });
  const kolom: DataColumn<ProposalKkn>[] = [
    {
      key: 'judul',
      header: 'Proposal',
      mobile: 'title',
      cell: (p) => (
        <span className="u-lppm-sel">
          <strong>{p.judul}</strong>
          <span>{[p.nomor, p.nama ?? p.nim, p.kelompok_nama].filter(Boolean).join(' · ')}</span>
        </span>
      ),
    },
    { key: 'periode', header: 'Periode', cell: (p) => p.periode_nama ?? '–' },
    { key: 'berkas', header: 'Berkas', shrink: true, cell: (p) => String(p.jumlah_berkas ?? 0) },
    { key: 'diajukan', header: 'Diajukan', shrink: true, cell: (p) => tgl(p.diajukan_pada) },
    { key: 'status', header: 'Status', shrink: true, mobile: 'badge', cell: (p) => <StatusProposalKknBadge status={p.status} /> },
  ];
  const r = rekap.data;
  return (
    <div className={cn('u-lppm', className)}>
      <div className="u-lppm-rekap">
        {(['diajukan', 'revisi', 'diterima', 'ditolak'] as StatusProposalKkn[]).map((s) => (
          <button key={s} type="button" className="u-lppm-rekap-kotak" data-aktif={status === s || undefined} data-nada={NADA_PROPOSAL[s]} onClick={() => setStatus(s)}>
            <span>{LABEL_STATUS_PROPOSAL_KKN[s]}</span>
            <strong>{r ? r[s] : '–'}</strong>
          </button>
        ))}
      </div>
      <DataTable<ProposalKkn>
        columns={kolom}
        rows={q.data}
        rowKey={(p) => String(p.id)}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
        onRowClick={(p) => setBuka(p.id)}
        toolbar={
          <div className="u-lppm-saring">
            <Input value={kata} onChange={(e) => setKata(e.target.value)} placeholder="Cari judul, nomor, NIM, nama" aria-label="Cari proposal" />
            <Select<number> value={periodeId ?? 0} onValueChange={(v) => setPeriodeId(v ? v : null)} aria-label="Periode KKN" options={[{ value: 0, label: 'Semua periode' }, ...(periode.data ?? []).map((p) => ({ value: p.id, label: p.nama }))]} />
            <Select<string>
              value={status}
              onValueChange={(v) => setStatus(v ?? 'semua')}
              aria-label="Status"
              options={[{ value: 'semua', label: 'Semua status' }, ...Object.entries(LABEL_STATUS_PROPOSAL_KKN).map(([value, label]) => ({ value, label }))]}
            />
          </div>
        }
        empty={{ icon: <ShieldCheck />, title: status === 'diajukan' ? 'Tidak ada proposal yang menunggu verifikasi' : 'Tidak ada proposal', description: 'Proposal penelitian KKN yang diajukan mahasiswa tampil di sini.' }}
      />
      {buka !== null && <DetailVerifikasi id={buka} tutup={() => setBuka(null)} />}
    </div>
  );
}

function DetailVerifikasi({ id, tutup }: { id: number; tutup: () => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useDetailProposalKkn(id);
  const [keputusan, setKeputusan] = React.useState<'diterima' | 'revisi' | 'ditolak'>('diterima');
  const [catatan, setCatatan] = React.useState('');
  const [galat, setGalat] = React.useState<string | null>(null);
  const [kirim, setKirim] = React.useState(false);
  const p = q.data;
  const putuskan = async () => {
    if (keputusan !== 'diterima' && catatan.trim() === '') return setGalat('Tuliskan alasan atau bagian yang perlu diperbaiki.');
    setKirim(true);
    try {
      await siakad.request({ method: 'POST', path: `${P}/kkn/proposal/${id}/verifikasi`, body: { keputusan, catatan: catatan.trim() || null } });
      invalidateSiakad('lppm');
      toast.add({ title: keputusan === 'diterima' ? 'Proposal diterima' : keputusan === 'revisi' ? 'Perbaikan diminta' : 'Proposal ditolak', description: 'Mahasiswa mendapat notifikasi.', type: 'success' });
      tutup();
    } catch (e) {
      toast.add({ title: 'Gagal menyimpan keputusan', description: pesanGalat(e), type: 'error' });
    } finally {
      setKirim(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && tutup()}
      size="lg"
      title={p?.judul ?? 'Proposal KKN'}
      description={p ? [p.nomor, p.nama ?? p.nim, p.nama_prodi, p.periode_nama].filter(Boolean).join(' · ') : undefined}
      footer={
        p?.hak?.verifikasi ? (
          <Button loading={kirim} variant={keputusan === 'ditolak' ? 'destructive' : 'primary'} onClick={() => void putuskan()}>
            {keputusan === 'diterima' ? 'Terima proposal' : keputusan === 'revisi' ? 'Kirim permintaan perbaikan' : 'Tolak proposal'}
          </Button>
        ) : undefined
      }
    >
      {q.error && !p ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : !p ? (
        <Skeleton style={{ height: 300 }} />
      ) : (
        <div className="u-lppm">
          <div className="u-lppm-baris-lencana">
            <StatusProposalKknBadge status={p.status} />
            <Badge variant="outline">{JENIS_PROPOSAL.find((j) => j.value === p.jenis)?.label ?? p.jenis}</Badge>
          </div>
          <DescriptionList
            items={[
              { label: 'Ringkasan', value: <span className="u-lppm-pre">{p.ringkasan || '–'}</span> },
              { label: 'Lokasi', value: p.lokasi || '–' },
              { label: 'Mitra/sasaran', value: p.mitra || '–' },
              { label: 'Kelompok', value: p.kelompok_nama ? `${p.kelompok_nama}${p.nama_dpl ? ` · DPL ${p.nama_dpl}` : ''}` : 'Belum ditempatkan' },
              { label: 'Diajukan', value: tgl(p.diajukan_pada, true) },
              ...(p.catatan_verifikasi ? [{ label: 'Catatan terakhir', value: <span className="u-lppm-pre">{p.catatan_verifikasi}</span> }] : []),
            ]}
          />
          <section className="u-lppm-bagian">
            <h4>Berkas</h4>
            <BerkasLppm entitas="kkn_proposal" entitasId={p.id} jenis={BERKAS_PROPOSAL_KKN} file={p.file} />
          </section>
          {p.hak?.verifikasi && (
            <section className="u-lppm-putuskan">
              <h4>Keputusan LP2M</h4>
              <SegmentedControl
                fullWidth
                options={[
                  { value: 'diterima', label: 'Terima' },
                  { value: 'revisi', label: 'Minta perbaikan' },
                  { value: 'ditolak', label: 'Tolak' },
                ]}
                value={keputusan}
                onValueChange={(v) => {
                  setKeputusan(v as typeof keputusan);
                  setGalat(null);
                }}
              />
              <Field label="Catatan untuk mahasiswa" required={keputusan !== 'diterima'} optional={keputusan === 'diterima'} error={galat ?? undefined}>
                <Textarea rows={3} value={catatan} onChange={(e) => { setCatatan(e.target.value); setGalat(null); }} placeholder={keputusan === 'revisi' ? 'Bagian yang perlu diperbaiki' : keputusan === 'ditolak' ? 'Alasan penolakan' : 'Opsional'} />
              </Field>
            </section>
          )}
          <section className="u-lppm-bagian">
            <h4>
              <History aria-hidden /> Riwayat proses
            </h4>
            <RiwayatLppm riwayat={p.riwayat} />
          </section>
        </div>
      )}
    </Dialog>
  );
}
