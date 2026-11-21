'use client';
import * as React from 'react';
import { BookOpenText, Check, CircleAlert, FileDown, Info, Scale, Search, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Empty } from '../components/display';
import { DataTable } from '../components/data-table';
import { Checkbox, Field, Input, Textarea } from '../components/forms';
import { Sheet, useToast } from '../components/overlays';
import { blokKeHtml } from '../editor/render';
import type { Blok } from '../editor/tipe';
import { invalidateSiakad, pesanGalat, useOptionalSiakad, useSiakad, useSiakadQuery } from './provider';

/*
 * Pedoman & peraturan universitas (SIAKAD /v1/pedoman, docs/PEDOMAN.md). Dua lapisan:
 *   PEDOMAN  dokumen dasar (bab/pasal/ayat berversi, ber-SK) yang memuat blok PARAMETER berkunci katalog;
 *   ATURAN   Mesin aturan, aturan berversi (BKD, karier), aturan fakultas: satu-satunya yang ditegakkan sistem.
 * Komponen di berkas ini dipakai semua aplikasi:
 *   DasarPedoman              "Dasar: Pedoman Akademik 2026 Pasal 12 ayat (3)" / "Berbeda dari pedoman" / "Belum diatur pedoman"
 *   UsulanPenerapanPedoman    kotak masuk unit pemilik aturan: banding nilai aturan vs pedoman, setujui/tolak
 *   BacaPedoman               halaman baca pedoman berlaku (cari isi pasal, daftar isi, PDF resmi)
 */

// ------------------------------------------------------------------ tipe

export type StatusVersiPedoman = 'draf' | 'ditinjau' | 'disetujui' | 'disahkan' | 'berlaku' | 'diganti' | 'dicabut';
export type LingkupPedoman = 'universitas' | 'fakultas' | 'prodi' | 'unit';
export type TipeParameterPedoman = 'angka' | 'rentang' | 'pilihan' | 'teks' | 'bool' | 'tabel';

export interface KolomTabelPedoman {
  kode: string;
  label: string;
  tipe?: 'angka' | 'teks';
}

export interface OpsiParameterPedoman {
  kolom?: KolomTabelPedoman[];
  pilihan?: Array<{ value: string; label: string }>;
  banyak?: boolean;
}

export interface KatalogPedoman {
  id: number;
  kunci: string;
  nama: string;
  keterangan: string | null;
  tipe: TipeParameterPedoman;
  satuan: string | null;
  opsi: OpsiParameterPedoman | null;
  kategori: string | null;
  unit_pemilik: string | null;
  target: { jenis: 'mesin_aturan' | 'aturan_versi'; kode?: string; aturan_jenis?: string; jalur: string; bentuk?: unknown; juga?: Record<string, unknown> } | null;
  lingkup: 'universitas' | 'fakultas';
  timpa: 'tidak' | 'lebih_besar' | 'lebih_kecil' | 'bebas';
  aktif: boolean;
  bawaan: boolean;
  terpetakan: boolean;
}

export interface TahapAlurPedoman {
  kode: string;
  judul: string;
  jenis: 'tinjau' | 'setujui' | 'sk';
  unit?: string | null;
  izin?: string;
}

export interface JenisPedoman {
  id: number;
  kode: string;
  nama: string;
  kelompok: string | null;
  keterangan: string | null;
  lingkup: LingkupPedoman[];
  unit_pemilik: string | null;
  unit_peninjau: string[];
  alur: Partial<Record<LingkupPedoman, TahapAlurPedoman[]>>;
  akses_baca: 'publik' | 'terbatas';
  ketegasan: 'ketat' | 'longgar';
  kategori_aturan: string[];
  aktif: boolean;
  bawaan: boolean;
  jumlah_dokumen?: number;
}

export interface DokumenPedomanRow {
  id: number;
  uuid: string;
  kode: string;
  judul: string;
  lingkup: LingkupPedoman;
  unit_id: number | null;
  unit_nama: string | null;
  unit_kode: string | null;
  jenis: { id: number; kode: string; nama: string; kelompok: string | null };
  akses_baca: 'publik' | 'terbatas' | null;
  versi_berlaku: { id: number; versi: number; berlaku_mulai: string | null; sk_nomor: string | null } | null;
  versi_terakhir: { id: number; versi: number; status: StatusVersiPedoman; diubah: string } | null;
  jumlah_versi: number;
}

export interface ButirPedoman {
  id: number;
  kunci: string;
  induk_id: number | null;
  tipe: 'bab' | 'bagian' | 'pasal' | 'ayat' | 'lampiran' | 'definisi';
  urut: number;
  judul: string | null;
  isi: Array<{ id: string; tipe: string; data: Record<string, unknown> }>;
  nomor: string | null;
  label: string;
  kedalaman: number;
  html?: string;
}

export interface ParameterPedoman {
  id: number;
  butir_id: number;
  pasal: string | null;
  kunci: string;
  nama: string;
  tipe: TipeParameterPedoman;
  satuan: string | null;
  opsi: OpsiParameterPedoman | null;
  nilai: unknown;
  teks: string;
  catatan: string | null;
  unit_pemilik: string | null;
  kategori: string | null;
  terpetakan: boolean;
  timpa: KatalogPedoman['timpa'] | null;
  terdaftar: boolean;
}

export interface TahapPemeriksaPedoman {
  tahap: string;
  urut: number;
  judul: string;
  unit: string | null;
  peran: string;
  status: 'menunggu' | 'sedang' | 'selesai' | 'ditolak' | 'dilewati';
  diproses_oleh: string | null;
  username: string | null;
  waktu: string | null;
  catatan: string | null;
  opsional: boolean;
  otomatis: boolean;
  keterangan: string | null;
}

export interface VersiPedoman {
  id: number;
  uuid: string;
  versi: number;
  judul: string;
  status: StatusVersiPedoman;
  pembukaan: string | null;
  catatan_perubahan: string | null;
  salin_dari_id: number | null;
  sk: { id: string; nomor: string | null; tanggal: string | null; penandatangan: string | null } | null;
  berlaku_mulai: string | null;
  berlaku_at: string | null;
  diubah: string;
  diubah_oleh?: string | null;
  kode_verifikasi: string | null;
  dokumen: Omit<DokumenPedomanRow, 'versi_berlaku' | 'versi_terakhir' | 'jumlah_versi'> & { ketegasan?: string; unit_pemilik?: string | null; unit_peninjau?: string[] };
  versi_lain: Array<{ id: number; versi: number; status: StatusVersiPedoman }>;
  butir: ButirPedoman[];
  parameter: ParameterPedoman[];
  komentar_terbuka: number;
  periksa?: Array<{ kunci: string; tingkat: 'galat' | 'info'; pesan: string; pasal: string | null }>;
  tahap?: Array<TahapAlurPedoman & { unit_id: number | null; unit_nama: string | null }>;
  pemeriksa?: TahapPemeriksaPedoman[];
  pemeriksa_label?: string | null;
  aksi?: string[];
}

export interface PenerapanPedoman {
  id: number;
  kunci: string;
  nama: string;
  tipe: TipeParameterPedoman | null;
  unit_pemilik: string | null;
  target_label: string | null;
  teks_aturan: string;
  teks_pedoman: string;
  status: 'menunggu' | 'diajukan' | 'diterapkan' | 'ditolak' | 'gagal' | 'usang';
  hasil: Record<string, unknown> | null;
  catatan: string | null;
  diputus_oleh: string | null;
  diputus_at: string | null;
  dasar: string;
  versi: number;
  versi_id: number;
  dokumen_id: number;
  sk_nomor: string | null;
  dibuat: string;
  boleh_putus: boolean;
}

export interface DasarPedomanHasil {
  status: 'sesuai' | 'menyimpang' | 'belum_diatur' | 'tanpa_pedoman' | 'tidak_ada';
  butir: Array<{
    kunci: string;
    nama: string;
    teks_aturan: string;
    teks_pedoman: string;
    sesuai: boolean;
    dasar: string;
    lingkup: string;
    deviasi: { id: number; jenis: 'menyimpang' | 'darurat'; tindak: 'sementara' | 'revisi' | null; sampai: string | null } | null;
  }>;
  penerapan_tertunda?: number;
  riwayat?: Array<{ kunci: string; label: string; waktu: string; aktif: boolean }>;
}

// ------------------------------------------------------------------ util

export const LABEL_STATUS_PEDOMAN: Record<StatusVersiPedoman, [string, React.ComponentProps<typeof Badge>['variant']]> = {
  draf: ['Draf', 'warning'],
  ditinjau: ['Ditinjau', 'info'],
  disetujui: ['Disetujui', 'primary'],
  disahkan: ['Disahkan', 'primary'],
  berlaku: ['Berlaku', 'success'],
  diganti: ['Diganti', 'neutral'],
  dicabut: ['Dicabut', 'danger'],
};

export const LABEL_LINGKUP_PEDOMAN: Record<LingkupPedoman, string> = { universitas: 'Universitas', fakultas: 'Fakultas', prodi: 'Program studi', unit: 'Unit' };

export function LencanaStatusPedoman({ status }: { status: StatusVersiPedoman }) {
  const [l, v] = LABEL_STATUS_PEDOMAN[status] ?? [status, 'neutral'];
  return (
    <Badge variant={v} dot>
      {l}
    </Badge>
  );
}

export function tanggalPedoman(t: string | null | undefined): string {
  if (!t) return '-';
  const d = new Date(t.length <= 10 ? t + 'T00:00:00' : t.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? t : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** GET pedoman (kunci cache diawali 'pedoman'). */
export function usePedoman<T>(kunci: ReadonlyArray<unknown>, path: string | null, query?: Record<string, unknown>) {
  return useSiakadQuery<T>(['pedoman', ...kunci, path, JSON.stringify(query ?? {})], (s, signal) => s.request<T>({ method: 'GET', path: path ?? '/v1/pedoman/saya', query: query as never }, { signal }), {
    enabled: path !== null,
  });
}

export interface HakPedoman {
  admin: boolean;
  susun: boolean;
  tinjau: boolean;
  setujui: boolean;
  telaah: boolean;
  darurat: boolean;
  unit: string[];
}

export function useHakPedoman() {
  return usePedoman<HakPedoman>(['saya'], '/v1/pedoman/saya');
}

/**
 * Pemanggil tulis: mengembalikan data atau melempar; galat ditampilkan sebagai toast bila `diam` tidak diisi.
 * Cache 'pedoman' dan 'aturan' disegarkan.
 */
export function useAksiPedoman() {
  const siakad = useSiakad();
  const toast = useToast();
  return React.useCallback(
    async <T = unknown,>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown, sukses?: string, diam = false): Promise<T> => {
      try {
        const r = await siakad.request<T>({ method, path, body: body as never });
        invalidateSiakad('pedoman');
        invalidateSiakad('aturan');
        if (sukses) toast.add({ title: sukses, type: 'success' });
        return r.data;
      } catch (e) {
        if (!diam) toast.add({ title: 'Belum berhasil', description: pesanGalat(e), type: 'error' });
        throw e;
      }
    },
    [siakad, toast],
  );
}

function blobDari(data: unknown): Blob {
  const f = data as { blob?: () => Blob; bytes?: Uint8Array; contentType?: string };
  if (typeof f.blob === 'function') return f.blob();
  return new Blob([f.bytes as BlobPart], { type: f.contentType ?? 'application/pdf' });
}

/** Tombol PDF resmi (berlaku: kode verifikasi + QR) atau pratinjau draf. */
export function TombolPdfPedoman({ versiId, publikKode, label = 'PDF resmi', size = 'sm', variant = 'outline' }: { versiId?: number; publikKode?: string; label?: string; size?: 'xs' | 'sm' | 'md'; variant?: 'outline' | 'secondary' | 'ghost' | 'primary' }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [sibuk, setSibuk] = React.useState(false);
  const buka = async () => {
    setSibuk(true);
    try {
      const path = publikKode ? `/v1/pedoman/publik/${encodeURIComponent(publikKode)}/pdf` : `/v1/pedoman/versi/${versiId}/pdf`;
      const r = await siakad.request<unknown>({ method: 'GET', path });
      const url = URL.createObjectURL(blobDari(r.data));
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      toast.add({ title: 'PDF belum bisa dibuat', description: pesanGalat(e), type: 'error' });
    } finally {
      setSibuk(false);
    }
  };
  return (
    <Button size={size} variant={variant} loading={sibuk} onClick={() => void buka()}>
      <FileDown /> {label}
    </Button>
  );
}

// ------------------------------------------------------------------ DasarPedoman

export interface DasarPedomanProps {
  /** mesin_aturan (uuid/kode aturan) atau aturan_versi (jenis: bkd, karier, ... atau id versi). */
  targetJenis: 'mesin_aturan' | 'aturan_versi';
  targetRef: string;
  /** Satu baris ringkas (untuk kartu/daftar). */
  ringkas?: boolean;
  className?: string;
}

/**
 * Dasar hukum sebuah aturan menurut pedoman yang berlaku: "Dasar: <pedoman> Pasal n ayat (m)", penanda
 * "Berbeda dari pedoman" (dengan nilai pasal vs aturan dan status deviasi), atau "Belum diatur pedoman".
 * Tidak tampil bila modul pedoman belum terpasang atau klien tidak punya scope pedoman:read.
 */
export function DasarPedoman({ targetJenis, targetRef, ringkas = false, className }: DasarPedomanProps) {
  const siakad = useOptionalSiakad();
  const q = useSiakadQuery<DasarPedomanHasil>(
    ['pedoman', 'dasar', targetJenis, targetRef],
    (s, signal) => s.request<DasarPedomanHasil>({ method: 'GET', path: '/v1/pedoman/dasar', query: { target_jenis: targetJenis, target_ref: targetRef } }, { signal }),
    { enabled: !!siakad && !!targetRef, staleTime: 60_000 },
  );
  if (!siakad || q.error || !q.data || q.data.status === 'tidak_ada' || q.data.status === 'tanpa_pedoman') return null;
  const d = q.data;
  const beda = d.butir.filter((b) => !b.sesuai);
  const dasar = Array.from(new Set(d.butir.filter((b) => b.sesuai).map((b) => b.dasar)));
  return (
    <div className={cn('u-pdm-dasar', ringkas && 'u-pdm-dasar-ringkas', className)} data-status={d.status}>
      {d.status === 'belum_diatur' ? (
        <span className="u-pdm-dasar-baris">
          <Badge variant="neutral" size="md">
            <Info /> Belum diatur pedoman
          </Badge>
          {!ringkas && <span className="u-pdm-redup">Berlaku atas dasar SK unit; masuk daftar usulan revisi pedoman SPMI.</span>}
        </span>
      ) : null}
      {dasar.length > 0 && (
        <span className="u-pdm-dasar-baris">
          <BookOpenText aria-hidden />
          <span>
            Dasar: <strong>{dasar.join('; ')}</strong>
          </span>
        </span>
      )}
      {beda.map((b) => (
        <span key={b.kunci} className="u-pdm-dasar-baris u-pdm-dasar-beda">
          <Badge variant={b.deviasi ? 'warning' : 'danger'} size="md">
            <CircleAlert /> Berbeda dari pedoman
          </Badge>
          <span>
            {b.dasar}: <strong>{b.teks_pedoman}</strong>, aturan: <strong>{b.teks_aturan}</strong>
            {b.deviasi ? (
              <span className="u-pdm-redup">
                {' '}
                · {b.deviasi.jenis === 'darurat' ? 'jalur darurat' : 'deviasi disetujui'}
                {b.deviasi.tindak === 'revisi' ? ', menunggu revisi pedoman' : b.deviasi.sampai ? `, sampai ${tanggalPedoman(b.deviasi.sampai)}` : ''}
              </span>
            ) : null}
          </span>
        </span>
      ))}
      {(d.penerapan_tertunda ?? 0) > 0 && !ringkas ? (
        <span className="u-pdm-dasar-baris">
          <Badge variant="info">Usulan penerapan pedoman menunggu</Badge>
        </span>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ UsulanPenerapanPedoman

const STATUS_PENERAPAN: Record<PenerapanPedoman['status'], [string, React.ComponentProps<typeof Badge>['variant']]> = {
  menunggu: ['Menunggu keputusan', 'warning'],
  diajukan: ['Menunggu persetujuan aturan', 'info'],
  diterapkan: ['Diterapkan', 'success'],
  ditolak: ['Ditolak', 'danger'],
  gagal: ['Gagal', 'danger'],
  usang: ['Usang', 'neutral'],
};

export interface UsulanPenerapanPedomanProps {
  /** Kode unit pemilik aturan (induk_unit), mis. ['SDM'] atau ['BAAK']. Kosong = semua (SPMI). */
  unit?: string[];
  judul?: React.ReactNode;
  deskripsi?: React.ReactNode;
  /** Tampilkan juga yang sudah diputus. */
  riwayat?: boolean;
  className?: string;
}

/**
 * Kotak masuk unit pemilik aturan: setiap parameter pedoman yang berlaku dan berbeda dari aturan unit menjadi usulan
 * berisi banding nilai. Setujui = versi aturan baru dibuat lewat mekanisme aturan itu (SK = SK pedoman); tolak = aturan
 * tetap, tercatat sebagai selisih yang ditindaklanjuti SPMI.
 */
export function UsulanPenerapanPedoman({ unit, judul = 'Usulan penerapan pedoman', deskripsi, riwayat = true, className }: UsulanPenerapanPedomanProps) {
  const [semua, setSemua] = React.useState(false);
  const q = usePedoman<PenerapanPedoman[]>(['penerapan', unit, semua], '/v1/pedoman/penerapan', { ...(unit?.length ? { unit: unit.join(',') } : {}), ...(semua ? { semua: 1 } : {}) });
  const [pilih, setPilih] = React.useState<number[]>([]);
  const [panel, setPanel] = React.useState<'setujui' | 'tolak' | null>(null);
  const rows = q.data ?? [];
  const bolehPilih = rows.filter((r) => r.boleh_putus && r.status === 'menunggu');
  const terpilih = rows.filter((r) => pilih.includes(r.id));
  return (
    <section className={cn('u-pdm-usulan', className)}>
      <header className="u-pdm-kepala-bagian">
        <div>
          <h3>{judul}</h3>
          <p className="u-pdm-redup">
            {deskripsi ?? 'Nilai di pedoman yang berlaku dibandingkan dengan aturan unit Anda. Tidak ada yang berubah otomatis: setujui untuk membuat versi aturan baru dengan dasar pasal pedoman, atau tolak dengan alasan.'}
          </p>
        </div>
        <div className="u-pdm-aksi">
          {riwayat && (
            <Button size="sm" variant="ghost" onClick={() => setSemua(!semua)}>
              {semua ? 'Hanya yang menunggu' : 'Tampilkan riwayat'}
            </Button>
          )}
          <Button size="sm" variant="outline" disabled={terpilih.length === 0} onClick={() => setPanel('tolak')}>
            <X /> Tolak
          </Button>
          <Button size="sm" disabled={terpilih.length === 0} onClick={() => setPanel('setujui')}>
            <Check /> Setujui {terpilih.length > 0 ? `(${terpilih.length})` : ''}
          </Button>
        </div>
      </header>
      {q.loading && !q.data ? (
        <Skeleton style={{ height: 120 }} />
      ) : q.error ? (
        <Alert variant="danger" title="Gagal memuat usulan">
          {pesanGalat(q.error)}
        </Alert>
      ) : rows.length === 0 ? (
        <Empty icon={<Scale />} title="Tidak ada usulan penerapan" description="Usulan muncul saat pedoman baru berlaku dan nilainya berbeda dari aturan unit ini." bordered />
      ) : (
        <ul className="u-pdm-daftar-usulan">
          {bolehPilih.length > 1 && (
            <li className="u-pdm-usulan-semua">
              <label className="u-pdm-centang">
                <Checkbox checked={bolehPilih.every((r) => pilih.includes(r.id))} onCheckedChange={(v) => setPilih(v === true ? bolehPilih.map((r) => r.id) : [])} /> Pilih semua yang menunggu
              </label>
            </li>
          )}
          {rows.map((r) => {
            const [l, v] = STATUS_PENERAPAN[r.status];
            return (
              <li key={r.id} className="u-pdm-usulan-item" data-pilih={pilih.includes(r.id) || undefined}>
                {r.boleh_putus && r.status === 'menunggu' ? (
                  <Checkbox aria-label={`Pilih ${r.nama}`} checked={pilih.includes(r.id)} onCheckedChange={(x) => setPilih(x === true ? [...pilih, r.id] : pilih.filter((i) => i !== r.id))} />
                ) : (
                  <span className="u-pdm-centang-kosong" />
                )}
                <div className="u-pdm-usulan-isi">
                  <div className="u-pdm-usulan-judul">
                    <strong>{r.nama}</strong> <Badge variant={v}>{l}</Badge> {r.unit_pemilik ? <Badge variant="outline">{r.unit_pemilik}</Badge> : null}
                  </div>
                  <div className="u-pdm-redup">
                    {r.target_label} · <code>{r.kunci}</code>
                  </div>
                  <div className="u-pdm-banding">
                    <div>
                      <span className="u-pdm-label">Aturan sekarang</span>
                      <span className="u-pdm-nilai-lama">{r.teks_aturan}</span>
                    </div>
                    <div>
                      <span className="u-pdm-label">Menurut pedoman</span>
                      <span className="u-pdm-nilai-baru">{r.teks_pedoman}</span>
                    </div>
                  </div>
                  <div className="u-pdm-redup">
                    <BookOpenText className="u-pdm-ikon-kecil" /> Dasar: {r.dasar} (versi {r.versi}
                    {r.sk_nomor ? `, SK ${r.sk_nomor}` : ''})
                  </div>
                  {r.catatan ? <div className="u-pdm-redup">Catatan: {r.catatan}</div> : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {panel && <PanelPutusPenerapan aksi={panel} usulan={terpilih} onOpenChange={(o) => !o && setPanel(null)} onSelesai={() => setPilih([])} />}
    </section>
  );
}

function PanelPutusPenerapan({ aksi, usulan, onOpenChange, onSelesai }: { aksi: 'setujui' | 'tolak'; usulan: PenerapanPedoman[]; onOpenChange: (o: boolean) => void; onSelesai: () => void }) {
  const kirim = useAksiPedoman();
  const [catatan, setCatatan] = React.useState('');
  const [sibuk, setSibuk] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const simpan = async () => {
    if (aksi === 'tolak' && catatan.trim().length < 10) {
      setGalat('Tulis alasan penolakan (minimal 10 karakter).');
      return;
    }
    setSibuk(true);
    try {
      await kirim('POST', `/v1/pedoman/penerapan/${aksi}`, { ids: usulan.map((u) => u.id), catatan: catatan.trim() || null }, aksi === 'setujui' ? 'Usulan diterapkan ke aturan' : 'Usulan ditolak');
      onSelesai();
      onOpenChange(false);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSibuk(false);
    }
  };
  return (
    <Sheet
      open
      onOpenChange={onOpenChange}
      size="md"
      title={aksi === 'setujui' ? 'Setujui penerapan pedoman' : 'Tolak penerapan pedoman'}
      description={
        aksi === 'setujui'
          ? 'Satu kali persetujuan: aturan berversi diterbitkan sebagai versi baru dan Mesin aturan langsung berlaku sebagai versi baru, keduanya dengan SK pedoman dan dasar pasalnya. Tidak ada tahap persetujuan pejabat kedua.'
          : 'Aturan tidak diubah. Selisih dengan pedoman tercatat dan muncul di dasbor kepatuhan SPMI untuk ditindaklanjuti.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button variant={aksi === 'tolak' ? 'destructive' : 'primary'} loading={sibuk} onClick={() => void simpan()}>
            {aksi === 'setujui' ? 'Setujui dan terapkan' : 'Tolak usulan'}
          </Button>
        </>
      }
    >
      <div className="u-pdm-form">
        <ul className="u-pdm-ringkas">
          {usulan.map((u) => (
            <li key={u.id}>
              <strong>{u.nama}</strong>
              <span className="u-pdm-redup">
                {u.teks_aturan} → <strong>{u.teks_pedoman}</strong>
              </span>
              <span className="u-pdm-redup">{u.target_label}</span>
            </li>
          ))}
        </ul>
        <Field label={aksi === 'tolak' ? 'Alasan penolakan' : 'Catatan'} required={aksi === 'tolak'} optional={aksi === 'setujui'}>
          <Textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder={aksi === 'tolak' ? 'Mengapa aturan unit tetap berbeda dari pedoman' : 'Mis. diterapkan mulai semester genap'} />
        </Field>
        {galat && (
          <Alert variant="danger" title="Belum berhasil">
            {galat}
          </Alert>
        )}
      </div>
    </Sheet>
  );
}

// ------------------------------------------------------------------ BacaPedoman

interface DaftarBaca {
  dokumen: Array<{ id: number; kode: string; judul: string; lingkup: LingkupPedoman; unit_nama: string | null; jenis: { kode: string; nama: string; kelompok: string | null }; versi_id: number; versi: number; sk_nomor: string | null; sk_tanggal: string | null; berlaku_mulai: string | null; akses: string }>;
  hasil: Array<{ dokumen: string; kode: string; versi_id: number; butir_id: number; kunci: string | null; label: string; judul: string | null; cuplikan: string }>;
}

export interface BacaPedomanProps {
  /** Tanpa login: hanya pedoman berakses publik (/v1/pedoman/publik). */
  publik?: boolean;
  /** Kode dokumen yang dibuka (dikendalikan, mis. dari alamat). */
  kode?: string | null;
  onKodeChange?: (kode: string | null) => void;
  className?: string;
}

/**
 * Halaman baca pedoman & peraturan yang berlaku: pencarian isi pasal, daftar per jenis (universitas + fakultas/prodi
 * pembaca), teks lengkap dengan daftar isi, parameter, SK, tanggal berlaku, dan PDF resmi.
 */
export function BacaPedoman({ publik = false, kode: kodeProp, onKodeChange, className }: BacaPedomanProps) {
  const [cari, setCari] = React.useState('');
  const [q, setQ] = React.useState('');
  const [kodeSendiri, setKodeSendiri] = React.useState<string | null>(null);
  const kode = kodeProp !== undefined ? kodeProp : kodeSendiri;
  const setKode = (k: string | null) => (onKodeChange ? onKodeChange(k) : setKodeSendiri(k));
  React.useEffect(() => {
    const t = setTimeout(() => setQ(cari.trim()), 300);
    return () => clearTimeout(t);
  }, [cari]);
  const basis = publik ? '/v1/pedoman/publik' : '/v1/pedoman/baca';
  const daftar = usePedoman<DaftarBaca>(['baca', publik], basis, q.length >= 3 ? { q } : {});
  const [sorot, setSorot] = React.useState<string | null>(null);
  const kelompok = React.useMemo(() => {
    const m = new Map<string, DaftarBaca['dokumen']>();
    for (const d of daftar.data?.dokumen ?? []) {
      const k = d.jenis.nama;
      m.set(k, [...(m.get(k) ?? []), d]);
    }
    return Array.from(m.entries());
  }, [daftar.data]);
  return (
    <div className={cn('u-pdm-baca', className)}>
      <aside className="u-pdm-baca-kiri">
        <Field label="Cari di pedoman">
          <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kata, mis. SKS, cuti, plagiasi…" />
        </Field>
        {daftar.loading && !daftar.data ? <Skeleton style={{ height: 160 }} /> : null}
        {q.length >= 3 && (daftar.data?.hasil.length ?? 0) > 0 && (
          <div className="u-pdm-hasil">
            <p className="u-pdm-label">
              <Search className="u-pdm-ikon-kecil" /> {daftar.data?.hasil.length} pasal memuat “{q}”
            </p>
            {daftar.data?.hasil.map((h) => (
              <button
                key={h.butir_id}
                type="button"
                className="u-pdm-hasil-item"
                onClick={() => {
                  setKode(h.kode);
                  setSorot(h.kunci);
                }}
              >
                <strong>
                  {h.dokumen} {h.label}
                </strong>
                <span>{h.cuplikan}</span>
              </button>
            ))}
          </div>
        )}
        {kelompok.length === 0 && !daftar.loading ? <Empty title="Belum ada pedoman berlaku" description={q ? 'Tidak ada yang cocok dengan pencarian.' : undefined} /> : null}
        {kelompok.map(([jenis, dok]) => (
          <div key={jenis} className="u-pdm-baca-kelompok">
            <p className="u-pdm-label">{jenis}</p>
            {dok.map((d) => (
              <button key={d.id} type="button" className="u-pdm-baca-dok" data-aktif={kode === d.kode || undefined} onClick={() => setKode(d.kode)}>
                <strong>{d.judul}</strong>
                <span>
                  {LABEL_LINGKUP_PEDOMAN[d.lingkup]}
                  {d.unit_nama ? ` · ${d.unit_nama}` : ''} · v{d.versi}
                  {d.sk_nomor ? ` · SK ${d.sk_nomor}` : ''}
                </span>
              </button>
            ))}
          </div>
        ))}
      </aside>
      <main className="u-pdm-baca-isi">{kode ? <TeksPedoman kode={kode} publik={publik} sorot={sorot} /> : <Empty icon={<BookOpenText />} title="Pilih pedoman" description="Pedoman dan peraturan yang berlaku menjadi dasar aturan di semua aplikasi." />}</main>
    </div>
  );
}

/** Teks lengkap satu pedoman berlaku (atau versi tertentu bagi penyusun/peninjau: kode = id versi). */
export function TeksPedoman({ kode, publik = false, sorot }: { kode: string; publik?: boolean; sorot?: string | null }) {
  const q = usePedoman<VersiPedoman>(['teks', publik, kode], publik ? `/v1/pedoman/publik/${encodeURIComponent(kode)}` : `/v1/pedoman/baca/${encodeURIComponent(kode)}`);
  React.useEffect(() => {
    if (!sorot || !q.data) return;
    document.getElementById(`pdm-${sorot}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [sorot, q.data]);
  if (q.loading && !q.data) return <Skeleton style={{ height: 320 }} />;
  if (q.error)
    return (
      <Alert variant="danger" title="Pedoman tidak dapat dibuka">
        {pesanGalat(q.error)}
      </Alert>
    );
  const v = q.data;
  if (!v) return null;
  return <NaskahPedoman versi={v} sorot={sorot} aksi={<TombolPdfPedoman versiId={publik ? undefined : v.id} publikKode={publik ? v.dokumen.kode : undefined} />} />;
}

/** Naskah terformat (bab, pasal, ayat, definisi, lampiran, parameter) dengan daftar isi. */
export function NaskahPedoman({ versi: v, sorot, aksi, pilih, onPilih, kepala = true }: { versi: VersiPedoman; sorot?: string | null; aksi?: React.ReactNode; pilih?: number | null; onPilih?: (id: number) => void; kepala?: boolean }) {
  const param = React.useMemo(() => {
    const m = new Map<number, ParameterPedoman[]>();
    for (const p of v.parameter) m.set(p.butir_id, [...(m.get(p.butir_id) ?? []), p]);
    return m;
  }, [v.parameter]);
  const daftarIsi = v.butir.filter((b) => b.tipe === 'bab' || b.tipe === 'lampiran' || (b.tipe === 'pasal' && b.kedalaman === 0));
  return (
    <article className="u-pdm-naskah">
      {kepala && (
      <header className="u-pdm-naskah-kepala">
        <div>
          <p className="u-pdm-label">
            {v.dokumen.jenis.nama} · {LABEL_LINGKUP_PEDOMAN[v.dokumen.lingkup]}
            {v.dokumen.unit_nama ? ` · ${v.dokumen.unit_nama}` : ''}
          </p>
          <h2>{v.judul}</h2>
          <p className="u-pdm-redup">
            Versi {v.versi} · <LencanaStatusPedoman status={v.status} />
            {v.sk ? ` · SK ${v.sk.nomor} (${tanggalPedoman(v.sk.tanggal)})` : ''}
            {v.berlaku_mulai ? ` · berlaku mulai ${tanggalPedoman(v.berlaku_mulai)}` : ''}
          </p>
        </div>
        {aksi}
      </header>
      )}
      {kepala && daftarIsi.length > 2 && (
        <nav className="u-pdm-daftar-isi" aria-label="Daftar isi">
          {daftarIsi.map((b) => (
            <a key={b.id} href={`#pdm-${b.kunci}`}>
              {b.nomor} {b.judul}
            </a>
          ))}
        </nav>
      )}
      {v.pembukaan ? <p className="u-pdm-pembukaan">{v.pembukaan}</p> : null}
      {v.butir.map((b) => (
        <div
          key={b.id}
          id={`pdm-${b.kunci}`}
          className={cn('u-pdm-butir', `u-pdm-${b.tipe}`)}
          data-sorot={sorot === b.kunci || pilih === b.id || undefined}
          onClick={onPilih ? () => onPilih(b.id) : undefined}
        >
          {b.tipe === 'bab' || b.tipe === 'bagian' || b.tipe === 'pasal' || b.tipe === 'lampiran' ? (
            <h3>
              <span>{b.nomor}</span>
              {b.judul ? <span>{b.judul}</span> : null}
            </h3>
          ) : null}
          <div className="u-pdm-butir-isi">
            {b.tipe === 'ayat' ? <span className="u-pdm-nomor">{b.nomor}</span> : null}
            {b.tipe === 'definisi' ? (
              <span className="u-pdm-nomor">
                {b.nomor} <strong>{b.judul}</strong> adalah
              </span>
            ) : null}
            <div className="ub-konten" dangerouslySetInnerHTML={{ __html: b.html ?? blokKeHtml(b.isi as unknown as Blok[]) }} />
          </div>
          {(param.get(b.id) ?? []).map((p) => (
            <BlokParameter key={p.id} p={p} />
          ))}
        </div>
      ))}
    </article>
  );
}

/** Blok parameter bertipe di dalam pasal (nilai yang dibaca sistem). */
export function BlokParameter({ p, aksi }: { p: ParameterPedoman; aksi?: React.ReactNode }) {
  const kolom = p.opsi?.kolom ?? [];
  return (
    <div className="u-pdm-param" data-terpetakan={p.terpetakan || undefined}>
      <div className="u-pdm-param-kepala">
        <span>
          <strong>{p.nama}</strong> <code>{p.kunci}</code>
        </span>
        <span className="u-pdm-aksi">
          {p.terpetakan ? <Badge variant="primary">Dibaca sistem{p.unit_pemilik ? ` · ${p.unit_pemilik}` : ''}</Badge> : <Badge variant="neutral">Informatif</Badge>}
          {aksi}
        </span>
      </div>
      {p.tipe === 'tabel' && Array.isArray(p.nilai) && kolom.length > 0 ? (
        <DataTable
          className="u-pdm-param-tabel"
          columns={kolom.map((k) => ({ key: k.kode, header: k.label, value: (r: Record<string, unknown>) => String(r[k.kode] ?? ''), cell: (r: Record<string, unknown>) => String(r[k.kode] ?? '') }))}
          rows={(p.nilai as Array<Record<string, unknown>>).map((r, i) => ({ ...r, __i: i }))}
          rowKey={(r) => String(r.__i)}
          pagination={false} columnToggle={false} densityToggle={false} defaultDensity="compact"
        />
      ) : (
        <div className="u-pdm-param-nilai">{p.teks}</div>
      )}
      {p.catatan ? <div className="u-pdm-redup">{p.catatan}</div> : null}
    </div>
  );
}
