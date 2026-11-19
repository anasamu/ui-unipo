'use client';
import * as React from 'react';
import { BadgeCheck, CircleAlert, Download, Eye, FileCheck2, FileSearch, FileText, Printer, RotateCcw, Save, ShieldX, Upload, XCircle } from 'lucide-react';
import { Badge, Button, Spinner } from '../components/actions';
import { Alert, Card, DescriptionList, Empty, Tabs } from '../components/display';
import { Field, Input, NumberField, SegmentedControl, Switch, Textarea } from '../components/forms';
import { Select } from '../components/select';
import { ConfirmDialog, Dialog, useToast } from '../components/overlays';
import { GalatApi } from './galat';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

// ---------------------------------------------------------------- tipe

export type JenisDokumen =
  | 'umum' | 'surat_keluar' | 'surat_keterangan' | 'sk' | 'krs' | 'khs' | 'transkrip' | 'kwitansi'
  | 'sertifikat' | 'berita_acara' | 'laporan' | 'undangan' | 'kartu';

export interface DokumenTerbit {
  id: string;
  kode_verifikasi: string;
  url_verifikasi: string;
  jenis: JenisDokumen;
  jenis_nama?: string;
  judul: string;
  nomor?: string | null;
  bagian?: string | null;
  bagian_nama?: string | null;
  pemilik?: string | null;
  pemilik_nama?: string | null;
  ringkasan?: Record<string, unknown>;
  sha256: string;
  ukuran: number;
  halaman: number;
  berkas_id?: string | null;
  status: 'sah' | 'diganti' | 'dibatalkan';
  alasan_batal?: string | null;
  dibatalkan_at?: string | null;
  kedaluwarsa_at?: string | null;
  diterbitkan_at: string;
  pdf_base64?: string;
}

export interface VerifikasiDokumenData {
  sah: boolean;
  status: string;
  pesan: string;
  kode: string;
  jenis?: string;
  jenis_nama?: string;
  judul?: string;
  nomor?: string | null;
  penerbit?: string | null;
  pemilik?: string | null;
  pemilik_id?: string | null;
  ringkasan?: Record<string, unknown>;
  diterbitkan_at?: string | null;
  kedaluwarsa_at?: string | null;
  dibatalkan_at?: string | null;
  sha256?: string;
  halaman?: number;
}

export interface HasilCocokPdf {
  cocok: boolean;
  sha256: string;
  pesan: string;
  dokumen: VerifikasiDokumenData | null;
}

const HURUF_KODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Kode verifikasi dari isi QR (URL .../dokumen/v/{kode}, ?kode=, atau kode saja). */
export function kodeDokumenDariQr(teks: string): string | null {
  let calon = teks.trim();
  try {
    const u = new URL(calon);
    calon = u.searchParams.get('kode') ?? u.pathname.split('/').filter(Boolean).pop() ?? '';
  } catch {
    // bukan URL
  }
  const k = decodeURIComponent(calon).replace(/[\s-]/g, '').toUpperCase();
  return k.length === 12 && [...k].every((c) => HURUF_KODE.includes(c)) ? k : null;
}

/** Format kode verifikasi untuk dibaca manusia: `k7qm2xpa9rtd` → `K7QM-2XPA-9RTD`. */
export const formatKodeDokumen = (k: string) => (k.replace(/[\s-]/g, '').toUpperCase().match(/.{1,4}/g) ?? []).join('-');

const tanggal = (s?: string | null) => (s ? new Date(s.replace(' ', 'T')).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '–');

// ---------------------------------------------------------------- verifikasi

/** Status dokumen dari kode verifikasi (GET /v1/dokumen/verifikasi/{kode}, publik). */
export function useVerifikasiDokumen(kode: string | null | undefined) {
  const k = kode ? kode.replace(/[\s-]/g, '').toUpperCase() : '';
  return useSiakadQuery<VerifikasiDokumenData>(
    ['dokumen', 'verifikasi', k],
    (s, signal) => s.request<VerifikasiDokumenData>({ method: 'GET', path: `/v1/dokumen/verifikasi/${encodeURIComponent(k)}`, public: true }, { signal }),
    { enabled: k.length === 12, staleTime: 60_000 },
  );
}

function KartuStatus({ d, judul }: { d: VerifikasiDokumenData; judul?: string }) {
  const nada = d.sah ? 'sah' : d.status === 'dibatalkan' ? 'salah' : 'peringatan';
  const Ikon = d.sah ? BadgeCheck : d.status === 'dibatalkan' ? ShieldX : CircleAlert;
  const baris = [
    { label: 'Jenis', value: d.jenis_nama ?? d.jenis },
    { label: 'Judul', value: d.judul },
    { label: 'Nomor', value: d.nomor },
    { label: 'Penerbit', value: d.penerbit },
    { label: 'Atas nama', value: d.pemilik ? `${d.pemilik}${d.pemilik_id ? ` (${d.pemilik_id})` : ''}` : null },
    { label: 'Diterbitkan', value: tanggal(d.diterbitkan_at) },
    ...(d.kedaluwarsa_at ? [{ label: 'Berlaku sampai', value: tanggal(d.kedaluwarsa_at) }] : []),
    ...(d.dibatalkan_at ? [{ label: 'Dibatalkan', value: tanggal(d.dibatalkan_at) }] : []),
    ...Object.entries(d.ringkasan ?? {}).map(([k, v]) => ({ label: k, value: typeof v === 'object' ? JSON.stringify(v) : String(v) })),
  ].filter((b) => b.value !== null && b.value !== undefined && b.value !== '');
  return (
    <div className="u-verif-kartu" data-nada={nada}>
      <div className="u-verif-kepala">
        <span className="u-verif-ikon" aria-hidden><Ikon /></span>
        <div>
          <strong>{judul ?? (d.sah ? 'Dokumen asli' : d.status === 'dibatalkan' ? 'Dokumen dibatalkan' : 'Perlu perhatian')}</strong>
          <p>{d.pesan}</p>
        </div>
      </div>
      <DescriptionList items={baris} />
      <p className="u-verif-kecil">
        Kode <b>{formatKodeDokumen(d.kode)}</b>{d.halaman ? ` · ${d.halaman} halaman` : ''}
        {d.sha256 && <><br />SHA-256: <code>{d.sha256}</code></>}
      </p>
    </div>
  );
}

export interface VerifikasiDokumenProps {
  /** Kode awal (mis. dari URL halaman). */
  kode?: string;
  /** Sembunyikan tab unggah PDF. */
  tanpaUnggah?: boolean;
  className?: string;
}

/**
 * Pemeriksa keaslian dokumen SIAKAD untuk publik: ketik/tempel kode atau URL dari QR, atau unggah file PDF untuk
 * dicocokkan sidik SHA-256-nya (mendeteksi PDF yang diubah walau QR-nya asli). Tanpa login.
 */
export function VerifikasiDokumen({ kode: kodeAwal, tanpaUnggah, className }: VerifikasiDokumenProps) {
  const siakad = useSiakad();
  const [mode, setMode] = React.useState<'kode' | 'pdf'>('kode');
  const [teks, setTeks] = React.useState(kodeAwal ?? '');
  const [kode, setKode] = React.useState<string | null>(kodeAwal ? kodeDokumenDariQr(kodeAwal) : null);
  const [galatKode, setGalatKode] = React.useState<string | null>(null);
  const q = useVerifikasiDokumen(kode);
  const [cocok, setCocok] = React.useState<HasilCocokPdf | null>(null);
  const [proses, setProses] = React.useState(false);
  const [galatPdf, setGalatPdf] = React.useState<string | null>(null);

  const periksa = (e?: React.FormEvent) => {
    e?.preventDefault();
    const k = kodeDokumenDariQr(teks);
    setGalatKode(k ? null : 'Kode terdiri dari 12 huruf/angka, mis. K7QM-2XPA-9RTD, atau tempel URL dari QR.');
    setKode(k);
  };
  const unggah = async (file: File) => {
    setProses(true);
    setGalatPdf(null);
    setCocok(null);
    try {
      const r = await siakad.request<HasilCocokPdf>({ method: 'POST', path: '/v1/dokumen/verifikasi', body: { berkas: file, ...(kode ? { kode } : {}) }, multipart: true, public: true });
      setCocok(r.data);
    } catch (e) {
      setGalatPdf(pesanGalat(e));
    } finally {
      setProses(false);
    }
  };

  return (
    <Card className={['u-verif', className].filter(Boolean).join(' ')}>
      {!tanpaUnggah && (
        <Tabs
          items={[{ value: 'kode', label: 'Kode atau QR' }, { value: 'pdf', label: 'Cocokkan file PDF' }]}
          value={mode}
          onValueChange={(v) => setMode(v)}
        />
      )}
      {mode === 'kode' ? (
        <form className="u-verif-form" onSubmit={periksa}>
          <Field label="Kode verifikasi" description="Tertulis di bawah QR dokumen. URL hasil pindai QR juga boleh ditempel." error={galatKode}>
            <Input value={teks} onChange={(e) => setTeks(e.target.value)} placeholder="K7QM-2XPA-9RTD" autoComplete="off" spellCheck={false} />
          </Field>
          <Button type="submit"><FileSearch /> Periksa dokumen</Button>
        </form>
      ) : (
        <div className="u-verif-form">
          <Field label="File PDF yang Anda terima" description="File tidak disimpan; hanya sidik SHA-256 yang dibandingkan dengan catatan terbit.">
            <label className="u-verif-unggah">
              <Upload aria-hidden />
              <span>{proses ? 'Memeriksa…' : 'Pilih atau seret file PDF (maks. 20 MB)'}</span>
              <input type="file" accept="application/pdf" disabled={proses} onChange={(e) => { const f = e.target.files?.[0]; if (f) void unggah(f); e.target.value = ''; }} />
            </label>
          </Field>
        </div>
      )}

      {mode === 'kode' && q.loading && <Spinner />}
      {mode === 'kode' && q.error && (
        (q.error as { status?: number }).status === 404
          ? <div className="u-verif-kartu" data-nada="salah"><div className="u-verif-kepala"><span className="u-verif-ikon" aria-hidden><XCircle /></span><div><strong>Dokumen tidak dikenal</strong><p>Kode {kode ? formatKodeDokumen(kode) : ''} tidak tercatat. Dokumen ini bukan terbitan resmi, atau kodenya salah ketik.</p></div></div></div>
          : <GalatApi error={q.error} onRetry={q.refetch} />
      )}
      {mode === 'kode' && q.data && <KartuStatus d={q.data} />}

      {mode === 'pdf' && galatPdf && <Alert variant="danger" title="Gagal memeriksa">{galatPdf}</Alert>}
      {mode === 'pdf' && cocok && (
        cocok.dokumen
          ? <KartuStatus d={{ ...cocok.dokumen, sah: cocok.cocok && cocok.dokumen.sah, pesan: cocok.pesan }} judul={cocok.cocok ? (cocok.dokumen.sah ? 'File asli dan sah' : 'File asli, tetapi status berubah') : 'Isi file berbeda'} />
          : <div className="u-verif-kartu" data-nada="salah"><div className="u-verif-kepala"><span className="u-verif-ikon" aria-hidden><XCircle /></span><div><strong>File tidak dikenal</strong><p>{cocok.pesan}</p></div></div></div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- terbitkan

const PATH_SUMBER: Partial<Record<JenisDokumen, string>> = { krs: 'krs', khs: 'khs', transkrip: 'transkrip', kwitansi: 'kwitansi', surat_keluar: 'surat-keluar' };

export interface TerbitkanDokumenProps {
  /** krs, khs, transkrip, kwitansi, surat_keluar; jenis lain lewat `buat`. */
  jenis: JenisDokumen;
  /** Body untuk endpoint sumber: {nim, tahun_id} / {transaksi_id} / {surat} atau body POST /v1/dokumen/buat. */
  data: Record<string, unknown>;
  /** Kode unit penerbit (opsional). */
  bagian?: string;
  label?: React.ReactNode;
  /** Tampilkan tombol pratinjau (PDF bertanda air, tidak disimpan). */
  pratinjau?: boolean;
  onTerbit?: (d: DokumenTerbit) => void;
  variant?: 'primary' | 'outline' | 'soft';
  size?: 'sm' | 'md';
}

async function bukaPdf(blob: Blob, nama: string, unduh: boolean) {
  const url = URL.createObjectURL(blob);
  if (unduh) {
    const a = document.createElement('a');
    a.href = url;
    a.download = nama;
    a.click();
  } else {
    window.open(url, '_blank', 'noopener');
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function blobDari(data: unknown): Blob {
  const f = data as { blob?: () => Blob; bytes?: Uint8Array; contentType?: string };
  if (typeof f.blob === 'function') return f.blob();
  return new Blob([f.bytes as BlobPart], { type: f.contentType ?? 'application/pdf' });
}

/**
 * Tombol terbitkan dokumen resmi (KRS, KHS, transkrip, kwitansi, surat keluar, atau dokumen bebas) mengikuti templat
 * bagian: PDF disimpan di berkas terpusat, diberi kode dan QR verifikasi, lalu bisa diunduh.
 */
export function TerbitkanDokumen({ jenis, data, bagian, label, pratinjau = true, onTerbit, variant = 'primary', size = 'md' }: TerbitkanDokumenProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const [sibuk, setSibuk] = React.useState<'terbit' | 'pratinjau' | null>(null);
  const [hasil, setHasil] = React.useState<DokumenTerbit | null>(null);
  const path = `/v1/dokumen/${PATH_SUMBER[jenis] ?? 'buat'}`;
  const body = { ...(PATH_SUMBER[jenis] ? {} : { jenis }), ...data, ...(bagian ? { bagian } : {}) };

  const terbit = async () => {
    setSibuk('terbit');
    try {
      const r = await siakad.request<DokumenTerbit>({ method: 'POST', path, body: { ...body, keluaran: 'json' } });
      setHasil(r.data);
      invalidateSiakad('dokumen');
      onTerbit?.(r.data);
    } catch (e) {
      toast.add({ title: 'Dokumen gagal diterbitkan', description: pesanGalat(e), type: 'error' });
    } finally {
      setSibuk(null);
    }
  };
  const lihat = async () => {
    setSibuk('pratinjau');
    try {
      const r = await siakad.request<unknown>({ method: 'POST', path, body: { ...body, keluaran: 'pdf', pratinjau: true } });
      await bukaPdf(blobDari(r.data), `pratinjau-${jenis}.pdf`, false);
    } catch (e) {
      toast.add({ title: 'Pratinjau gagal', description: pesanGalat(e), type: 'error' });
    } finally {
      setSibuk(null);
    }
  };
  const unduh = async (d: DokumenTerbit) => {
    try {
      const r = await siakad.request<unknown>({ method: 'GET', path: `/v1/dokumen/terbit/${d.id}/unduh`, query: { unduh: 1 } });
      await bukaPdf(blobDari(r.data), `${d.jenis}-${d.kode_verifikasi}.pdf`, true);
    } catch (e) {
      toast.add({ title: 'Gagal mengunduh', description: pesanGalat(e), type: 'error' });
    }
  };

  return (
    <>
      <span className="u-terbit-aksi">
        <Button variant={variant} size={size} onClick={terbit} disabled={sibuk !== null}>
          {sibuk === 'terbit' ? <Spinner /> : <Printer />} {label ?? 'Terbitkan PDF'}
        </Button>
        {pratinjau && (
          <Button variant="ghost" size={size} onClick={lihat} disabled={sibuk !== null}>
            {sibuk === 'pratinjau' ? <Spinner /> : <Eye />} Pratinjau
          </Button>
        )}
      </span>
      <Dialog
        open={hasil !== null}
        onOpenChange={(o) => !o && setHasil(null)}
        title="Dokumen diterbitkan"
        description="PDF tersimpan di arsip dan dapat diperiksa keasliannya lewat QR atau kode di bawah."
        footer={hasil && <Button onClick={() => unduh(hasil)}><Download /> Unduh PDF</Button>}
      >
        {hasil && (
          <DescriptionList
            items={[
              { label: 'Dokumen', value: `${hasil.jenis_nama ?? hasil.jenis}: ${hasil.judul}` },
              { label: 'Nomor', value: hasil.nomor },
              { label: 'Kode verifikasi', value: <b>{formatKodeDokumen(hasil.kode_verifikasi)}</b> },
              { label: 'Halaman verifikasi', value: <a href={hasil.url_verifikasi} target="_blank" rel="noreferrer">{hasil.url_verifikasi}</a> },
              { label: 'Penerbit', value: hasil.bagian_nama },
              { label: 'Ukuran', value: `${hasil.halaman} halaman · ${Math.ceil(hasil.ukuran / 1024)} KB` },
            ]}
          />
        )}
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------- arsip terbit

export interface DaftarDokumenTerbitProps {
  jenis?: JenisDokumen;
  /** Kode unit: petugas unit melihat semua dokumen unitnya. */
  bagian?: string;
  /** NIM/NIP pemilik. */
  pemilik?: string;
  /** Tampilkan tombol batalkan (dokumen:admin atau pimpinan/admin unit penerbit). */
  bolehBatal?: boolean;
  className?: string;
}

const NADA_STATUS = { sah: 'success', diganti: 'warning', dibatalkan: 'danger' } as const;

/** Arsip dokumen terbit (GET /v1/dokumen/terbit) dengan unduh, salin kode verifikasi, dan pembatalan beralasan. */
export function DaftarDokumenTerbit({ jenis, bagian, pemilik, bolehBatal, className }: DaftarDokumenTerbitProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const [cari, setCari] = React.useState('');
  const [alasan, setAlasan] = React.useState('');
  const query = { ...(jenis ? { jenis } : {}), ...(bagian ? { bagian } : {}), ...(pemilik ? { pemilik } : {}), ...(cari ? { q: cari } : {}), per_page: 50 };
  const q = useSiakadQuery<DokumenTerbit[]>(['dokumen', 'terbit', query], (s, signal) => s.request<DokumenTerbit[]>({ method: 'GET', path: '/v1/dokumen/terbit', query }, { signal }));
  const unduh = async (d: DokumenTerbit) => {
    try {
      const r = await siakad.request<unknown>({ method: 'GET', path: `/v1/dokumen/terbit/${d.id}/unduh` });
      await bukaPdf(blobDari(r.data), `${d.jenis}-${d.kode_verifikasi}.pdf`, false);
    } catch (e) {
      toast.add({ title: 'Gagal membuka PDF', description: pesanGalat(e), type: 'error' });
    }
  };
  return (
    <div className={['u-terbit-daftar', className].filter(Boolean).join(' ')}>
      <Input type="search" value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari judul, nomor, nama, atau kode…" aria-label="Cari dokumen" />
      {q.loading && <Spinner />}
      {q.error && <GalatApi error={q.error} onRetry={q.refetch} />}
      {!q.loading && !q.error && (q.data ?? []).length === 0 && <Empty icon={<FileText />} title="Belum ada dokumen terbit" />}
      <ul>
        {(q.data ?? []).map((d) => (
          <li key={d.id} data-status={d.status}>
            <FileCheck2 aria-hidden />
            <div>
              <strong>{d.judul}</strong>
              <small>
                {d.jenis_nama ?? d.jenis}{d.nomor ? ` · ${d.nomor}` : ''}{d.pemilik_nama ? ` · ${d.pemilik_nama}` : ''} · {tanggal(d.diterbitkan_at)}
              </small>
              <small>Kode <code>{formatKodeDokumen(d.kode_verifikasi)}</code>{d.alasan_batal ? ` · dibatalkan: ${d.alasan_batal}` : ''}</small>
            </div>
            <Badge variant={NADA_STATUS[d.status]}>{d.status}</Badge>
            <Button size="sm" variant="ghost" onClick={() => unduh(d)} aria-label={`Buka PDF ${d.judul}`}><Download /></Button>
            {bolehBatal && d.status === 'sah' && (
              <ConfirmDialog
                trigger={<Button size="sm" variant="ghost" aria-label={`Batalkan ${d.judul}`}><RotateCcw /></Button>}
                title={`Batalkan “${d.judul}”?`}
                description="Halaman verifikasi akan menyatakan dokumen ini dibatalkan beserta alasannya. Tindakan ini tidak bisa diurungkan."
                confirmLabel="Batalkan dokumen"
                onConfirm={async () => {
                  if (alasan.trim().length < 5) {
                    toast.add({ title: 'Isi alasan pembatalan', type: 'error' });
                    throw new Error('alasan');
                  }
                  try {
                    await siakad.request({ method: 'POST', path: `/v1/dokumen/terbit/${d.id}/batal`, body: { alasan } });
                    setAlasan('');
                    invalidateSiakad('dokumen');
                    toast.add({ title: 'Dokumen dibatalkan', type: 'success' });
                  } catch (e) {
                    toast.add({ title: 'Gagal membatalkan', description: pesanGalat(e), type: 'error' });
                  }
                }}
              >
                <Field label="Alasan" required>
                  <Textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Mis. salah input nilai, diganti versi baru" />
                </Field>
              </ConfirmDialog>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- templat

export interface PengaturanDokumen {
  kertas?: 'A4' | 'F4' | 'Letter' | 'Legal' | 'A5';
  orientasi?: 'potret' | 'lanskap';
  margin?: { atas?: number; kanan?: number; bawah?: number; kiri?: number };
  font?: string;
  ukuran_font?: number;
  warna_utama?: string;
  kop?: {
    tampil?: boolean; perataan?: 'tengah' | 'kiri'; logo?: 'kampus' | 'fakultas' | 'berkas' | 'tanpa';
    logo_berkas_id?: string | null; logo_kanan_berkas_id?: string | null; gambar_berkas_id?: string | null;
    baris?: Array<{ teks: string; ukuran: number; tebal?: boolean; warna?: string }>;
    alamat?: string; kontak?: string; garis?: 'tanpa' | 'tunggal' | 'ganda' | 'tebal_tipis'; warna_garis?: string; tinggi_logo?: number; semua_halaman?: boolean;
  };
  judul?: { ukuran?: number; huruf_besar?: boolean; garis_bawah?: boolean };
  ttd?: { tampil?: boolean; posisi?: 'kanan' | 'kiri' | 'tengah'; kota?: string; jabatan?: string | null; nama?: string | null; nip?: string | null; label_nip?: string; gambar_berkas_id?: string | null; stempel_berkas_id?: string | null };
  kaki?: { teks?: string; nomor_halaman?: boolean; waktu_cetak?: boolean };
  qr?: { posisi?: 'ttd' | 'kanan_bawah' | 'kiri_bawah' | 'kanan_atas' | 'tanpa'; ukuran?: number; gaya?: string; teks?: string };
  tanda_air?: { teks?: string | null; opasitas?: number };
  bagian_penerbit?: string | null;
}

export interface TemplatDokumen {
  id: string;
  nama: string;
  keterangan?: string | null;
  jenis: JenisDokumen | null;
  bagian: string | null;
  bagian_nama: string;
  pengaturan: PengaturanDokumen;
  aktif: boolean;
}

export interface TemplatEfektif {
  jenis: JenisDokumen;
  bagian: string | null;
  pengaturan: Required<PengaturanDokumen>;
  lapis: Array<Record<string, unknown>>;
  data: Record<string, string>;
}

/** Aturan dokumen yang berlaku untuk jenis + bagian (GET /v1/dokumen/templat/efektif). */
export function useTemplatDokumen(jenis: JenisDokumen, bagian?: string | null) {
  return useSiakadQuery<TemplatEfektif>(['dokumen', 'templat', 'efektif', jenis, bagian ?? ''], (s, signal) =>
    s.request<TemplatEfektif>({ method: 'GET', path: '/v1/dokumen/templat/efektif', query: { jenis, ...(bagian ? { bagian } : {}) } }, { signal }),
  );
}

const JENIS_LABEL: Record<JenisDokumen, string> = {
  umum: 'Semua jenis', surat_keluar: 'Surat keluar', surat_keterangan: 'Surat keterangan', sk: 'Surat keputusan', krs: 'KRS', khs: 'KHS', transkrip: 'Transkrip',
  kwitansi: 'Kwitansi', sertifikat: 'Sertifikat', berita_acara: 'Berita acara', laporan: 'Laporan', undangan: 'Undangan', kartu: 'Kartu',
};

/** Gabung objek aturan (objek digabung, daftar diganti utuh), sama dengan server. */
function gabung<T extends Record<string, unknown>>(a: T, b: Record<string, unknown>): T {
  const o: Record<string, unknown> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    o[k] = v && typeof v === 'object' && !Array.isArray(v) && o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]) ? gabung(o[k] as Record<string, unknown>, v as Record<string, unknown>) : v;
  }
  return o as T;
}

export interface EditorTemplatDokumenProps {
  /** Kode unit; kosong = templat tingkat kampus (dokumen:admin). */
  bagian?: string;
  /** Jenis awal; "umum" = berlaku untuk semua jenis bagian ini. */
  jenis?: JenisDokumen;
  className?: string;
}

/**
 * Editor templat dokumen per bagian: kertas, margin, huruf, kop surat, tanda tangan, kaki, QR, tanda air, dengan
 * pratinjau PDF langsung dari server (aturan warisan unit induk ikut tampil). Simpan ke POST /v1/dokumen/templat.
 */
export function EditorTemplatDokumen({ bagian, jenis: jenisAwal = 'umum', className }: EditorTemplatDokumenProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const [jenis, setJenis] = React.useState<JenisDokumen>(jenisAwal);
  const jenisPratinjau: JenisDokumen = jenis === 'umum' ? 'surat_keterangan' : jenis;
  const efektif = useTemplatDokumen(jenisPratinjau, bagian);
  const daftar = useSiakadQuery<{ templat: TemplatDokumen[] }>(['dokumen', 'templat', 'daftar', bagian ?? ''], (s, signal) =>
    s.request({ method: 'GET', path: '/v1/dokumen/templat', query: bagian ? { bagian } : {} }, { signal }),
  );
  const milik = (daftar.data?.templat ?? []).find((t) => (t.bagian ?? '') === (bagian ?? '') && (t.jenis ?? 'umum') === jenis) ?? null;
  const [ubahan, setUbahan] = React.useState<PengaturanDokumen>({});
  React.useEffect(() => setUbahan(milik?.pengaturan ?? {}), [milik?.id, jenis]);
  const atur = React.useMemo(() => gabung((efektif.data?.pengaturan ?? {}) as Record<string, unknown>, ubahan as Record<string, unknown>) as PengaturanDokumen, [efektif.data, ubahan]);
  const set = (sebagian: PengaturanDokumen) => setUbahan((u) => gabung(u as Record<string, unknown>, sebagian as Record<string, unknown>));

  const [pdf, setPdf] = React.useState<string | null>(null);
  const [muatPdf, setMuatPdf] = React.useState(false);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [simpan, setSimpan] = React.useState(false);
  const kunci = JSON.stringify(ubahan);
  React.useEffect(() => {
    let batal = false;
    const t = setTimeout(async () => {
      setMuatPdf(true);
      try {
        const r = await siakad.request<unknown>({ method: 'POST', path: '/v1/dokumen/templat/pratinjau', body: { jenis: jenisPratinjau, ...(bagian ? { bagian } : {}), pengaturan: ubahan } });
        if (batal) return;
        const url = URL.createObjectURL(blobDari(r.data));
        setPdf((lama) => {
          if (lama) URL.revokeObjectURL(lama);
          return url;
        });
        setGalat({});
      } catch (e) {
        if (!batal) setGalat(((e as { details?: Record<string, string> }).details) ?? { umum: pesanGalat(e) });
      } finally {
        if (!batal) setMuatPdf(false);
      }
    }, 600);
    return () => {
      batal = true;
      clearTimeout(t);
    };
  }, [kunci, jenisPratinjau, bagian]);

  const kirim = async () => {
    setSimpan(true);
    try {
      const nama = milik?.nama ?? `Templat ${JENIS_LABEL[jenis].toLowerCase()}${bagian ? ` ${bagian}` : ' kampus'}`;
      if (milik) await siakad.request({ method: 'POST', path: `/v1/dokumen/templat/${milik.id}`, body: { pengaturan: ubahan } });
      else await siakad.request({ method: 'POST', path: '/v1/dokumen/templat', body: { nama, ...(bagian ? { bagian } : {}), ...(jenis !== 'umum' ? { jenis } : {}), pengaturan: ubahan } });
      invalidateSiakad('dokumen');
      toast.add({ title: 'Templat disimpan', description: 'Dokumen berikutnya memakai aturan ini.', type: 'success' });
    } catch (e) {
      setGalat(((e as { details?: Record<string, string> }).details) ?? {});
      toast.add({ title: 'Gagal menyimpan templat', description: pesanGalat(e), type: 'error' });
    } finally {
      setSimpan(false);
    }
  };

  const k = atur.kop ?? {};
  const g = (kunci: string) => galat[`pengaturan.${kunci}`];
  const angka = (v: number | null | undefined, cadangan: number) => (typeof v === 'number' && Number.isFinite(v) ? v : cadangan);

  return (
    <div className={['u-templat-wadah', className].filter(Boolean).join(' ')}>
    <div className="u-templat">
      <div className="u-templat-isian">
        <Field label="Berlaku untuk">
          <Select<JenisDokumen> options={(Object.keys(JENIS_LABEL) as JenisDokumen[]).map((j) => ({ value: j, label: JENIS_LABEL[j] }))} value={jenis} onValueChange={(v) => v && setJenis(v)} />
        </Field>
        <p className="u-templat-catatan">
          {milik ? <>Mengubah <b>{milik.nama}</b>.</> : <>Belum ada templat {JENIS_LABEL[jenis].toLowerCase()} untuk {bagian ?? 'kampus'}; yang tampil adalah aturan warisan.</>} Isian yang tidak diubah tetap mengikuti unit induk.
        </p>

        <fieldset className="u-qr-kelompok">
          <legend>Kertas dan huruf</legend>
          <div className="u-qr-dua">
            <Field label="Ukuran kertas" error={g('kertas')}>
              <Select options={['A4', 'F4', 'Letter', 'Legal', 'A5'].map((x) => ({ value: x, label: x }))} value={atur.kertas ?? 'A4'} onValueChange={(v) => v && set({ kertas: v as PengaturanDokumen['kertas'] })} />
            </Field>
            <Field label="Orientasi">
              <SegmentedControl options={[{ value: 'potret', label: 'Potret' }, { value: 'lanskap', label: 'Lanskap' }]} value={atur.orientasi ?? 'potret'} onValueChange={(v) => set({ orientasi: v })} />
            </Field>
            <Field label="Huruf">
              <Select options={['helvetica', 'times', 'dejavusans', 'dejavuserif', 'courier'].map((x) => ({ value: x, label: x }))} value={atur.font ?? 'helvetica'} onValueChange={(v) => v && set({ font: v })} />
            </Field>
            <Field label="Ukuran huruf (pt)" error={g('ukuran_font')}>
              <NumberField min={8} max={14} step={0.5} value={angka(atur.ukuran_font, 10.5)} onValueChange={(v) => v !== null && set({ ukuran_font: v })} />
            </Field>
          </div>
          <div className="u-templat-margin">
            {(['atas', 'kanan', 'bawah', 'kiri'] as const).map((s) => (
              <Field key={s} label={`Margin ${s} (mm)`} error={g(`margin.${s}`)}>
                <NumberField min={5} max={60} value={angka(atur.margin?.[s], 20)} onValueChange={(v) => v !== null && set({ margin: { [s]: v } })} />
              </Field>
            ))}
          </div>
          <Field label="Warna utama" description="Kepala tabel dan aksen." error={g('warna_utama')}>
            <Input type="color" value={atur.warna_utama ?? '#0f3d5e'} onChange={(e) => set({ warna_utama: e.target.value })} />
          </Field>
        </fieldset>

        <fieldset className="u-qr-kelompok">
          <legend>Kop surat</legend>
          <label className="u-qr-sakelar"><Switch checked={k.tampil ?? true} onCheckedChange={(c) => set({ kop: { tampil: c } })} /> Tampilkan kop</label>
          {(k.tampil ?? true) && (
            <>
              <p className="u-templat-catatan">Penanda yang bisa dipakai: {'{nama_pt} {singkatan_pt} {nama_unit} {nama_induk} {alamat_unit} {telepon_unit} {email_unit} {website_pt} {kota}'}</p>
              {(k.baris ?? []).map((b, i) => (
                <div key={i} className="u-templat-baris-kop">
                  <Field label={`Baris ${i + 1}`}>
                    <Input value={b.teks} onChange={(e) => { const baris = [...(k.baris ?? [])]; baris[i] = { ...b, teks: e.target.value }; set({ kop: { baris } }); }} />
                  </Field>
                  <Field label="pt">
                    <NumberField min={7} max={24} value={b.ukuran} onValueChange={(v) => { if (v === null) return; const baris = [...(k.baris ?? [])]; baris[i] = { ...b, ukuran: v }; set({ kop: { baris } }); }} />
                  </Field>
                  <Button variant="ghost" size="sm" aria-label={`Hapus baris ${i + 1}`} onClick={() => set({ kop: { baris: (k.baris ?? []).filter((_, j) => j !== i) } })}><XCircle /></Button>
                </div>
              ))}
              {(k.baris ?? []).length < 5 && <Button size="sm" variant="ghost" onClick={() => set({ kop: { baris: [...(k.baris ?? []), { teks: '', ukuran: 11, tebal: true }] } })}>Tambah baris kop</Button>}
              <Field label="Alamat"><Input value={k.alamat ?? ''} onChange={(e) => set({ kop: { alamat: e.target.value } })} /></Field>
              <Field label="Kontak"><Input value={k.kontak ?? ''} onChange={(e) => set({ kop: { kontak: e.target.value } })} /></Field>
              <div className="u-qr-dua">
                <Field label="Logo">
                  <Select options={[{ value: 'kampus', label: 'Logo kampus' }, { value: 'fakultas', label: 'Logo fakultas penerbit' }, { value: 'berkas', label: 'Berkas' }, { value: 'tanpa', label: 'Tanpa logo' }]} value={k.logo ?? 'kampus'} onValueChange={(v) => v && set({ kop: { logo: v as 'kampus' } })} />
                </Field>
                <Field label="Garis bawah kop">
                  <Select options={[{ value: 'tebal_tipis', label: 'Tebal-tipis' }, { value: 'ganda', label: 'Ganda' }, { value: 'tunggal', label: 'Tunggal' }, { value: 'tanpa', label: 'Tanpa' }]} value={k.garis ?? 'tebal_tipis'} onValueChange={(v) => v && set({ kop: { garis: v as 'tunggal' } })} />
                </Field>
              </div>
              {k.logo === 'berkas' && (
                <Field label="ID berkas logo" description="Gambar PNG/JPG di /v1/berkas milik Anda atau publik." error={g('kop.logo_berkas_id')}>
                  <Input value={k.logo_berkas_id ?? ''} onChange={(e) => set({ kop: { logo_berkas_id: e.target.value.trim() || null } })} />
                </Field>
              )}
              <Field label="ID berkas kop gambar (opsional)" description="Satu gambar kop utuh selebar halaman; menggantikan logo dan teks." error={g('kop.gambar_berkas_id')}>
                <Input value={k.gambar_berkas_id ?? ''} onChange={(e) => set({ kop: { gambar_berkas_id: e.target.value.trim() || null } })} />
              </Field>
            </>
          )}
        </fieldset>

        <fieldset className="u-qr-kelompok">
          <legend>Tanda tangan</legend>
          <div className="u-qr-dua">
            <Field label="Jabatan" error={g('ttd.jabatan')}><Input value={atur.ttd?.jabatan ?? ''} onChange={(e) => set({ ttd: { jabatan: e.target.value || null } })} placeholder="Dekan" /></Field>
            <Field label="Nama" error={g('ttd.nama')}><Input value={atur.ttd?.nama ?? ''} onChange={(e) => set({ ttd: { nama: e.target.value || null } })} /></Field>
            <Field label="NIP/NIDN"><Input value={atur.ttd?.nip ?? ''} onChange={(e) => set({ ttd: { nip: e.target.value || null } })} /></Field>
            <Field label="Kota"><Input value={atur.ttd?.kota ?? ''} onChange={(e) => set({ ttd: { kota: e.target.value } })} placeholder="{kota}" /></Field>
          </div>
          <Field label="Posisi">
            <SegmentedControl options={[{ value: 'kanan', label: 'Kanan' }, { value: 'tengah', label: 'Tengah' }, { value: 'kiri', label: 'Kiri' }]} value={atur.ttd?.posisi ?? 'kanan'} onValueChange={(v) => set({ ttd: { posisi: v } })} />
          </Field>
          <div className="u-qr-dua">
            <Field label="ID berkas gambar tanda tangan" error={g('ttd.gambar_berkas_id')}><Input value={atur.ttd?.gambar_berkas_id ?? ''} onChange={(e) => set({ ttd: { gambar_berkas_id: e.target.value.trim() || null } })} /></Field>
            <Field label="ID berkas stempel" error={g('ttd.stempel_berkas_id')}><Input value={atur.ttd?.stempel_berkas_id ?? ''} onChange={(e) => set({ ttd: { stempel_berkas_id: e.target.value.trim() || null } })} /></Field>
          </div>
        </fieldset>

        <fieldset className="u-qr-kelompok">
          <legend>QR verifikasi, kaki, tanda air</legend>
          <div className="u-qr-dua">
            <Field label="Letak QR">
              <Select options={[{ value: 'ttd', label: 'Di samping tanda tangan' }, { value: 'kanan_bawah', label: 'Kaki kanan tiap halaman' }, { value: 'kiri_bawah', label: 'Kaki kiri tiap halaman' }, { value: 'kanan_atas', label: 'Kanan atas' }, { value: 'tanpa', label: 'Tanpa QR' }]} value={atur.qr?.posisi ?? 'ttd'} onValueChange={(v) => v && set({ qr: { posisi: v as 'ttd' } })} />
            </Field>
            <Field label="Ukuran QR (mm)"><NumberField min={14} max={40} value={angka(atur.qr?.ukuran, 24)} onValueChange={(v) => v !== null && set({ qr: { ukuran: v } })} /></Field>
            <Field label="Gaya QR" description="Kode gaya di Kelola gaya QR."><Input value={atur.qr?.gaya ?? 'dokumen'} onChange={(e) => set({ qr: { gaya: e.target.value } })} /></Field>
            <Field label="Teks di bawah QR"><Input value={atur.qr?.teks ?? ''} onChange={(e) => set({ qr: { teks: e.target.value } })} /></Field>
          </div>
          <Field label="Teks kaki halaman"><Input value={atur.kaki?.teks ?? ''} onChange={(e) => set({ kaki: { teks: e.target.value } })} /></Field>
          <div className="u-qr-baris">
            <label className="u-qr-sakelar"><Switch checked={atur.kaki?.nomor_halaman ?? true} onCheckedChange={(c) => set({ kaki: { nomor_halaman: c } })} /> Nomor halaman</label>
            <label className="u-qr-sakelar"><Switch checked={atur.kaki?.waktu_cetak ?? true} onCheckedChange={(c) => set({ kaki: { waktu_cetak: c } })} /> Waktu cetak</label>
          </div>
          <Field label="Tanda air" description="Kosongkan bila tidak perlu, mis. SALINAN atau RAHASIA."><Input value={atur.tanda_air?.teks ?? ''} onChange={(e) => set({ tanda_air: { teks: e.target.value || null } })} /></Field>
          {jenis === 'umum' || !bagian ? (
            <Field label="Bagian penerbit bawaan" description="Kode unit yang menerbitkan jenis ini bila tidak disebut, mis. keuangan untuk kwitansi.">
              <Input value={atur.bagian_penerbit ?? ''} onChange={(e) => set({ bagian_penerbit: e.target.value.trim() || null })} />
            </Field>
          ) : null}
        </fieldset>

        {galat['umum'] && <Alert variant="danger">{galat['umum']}</Alert>}
        <div className="u-qr-baris u-qr-aksi">
          <Button onClick={kirim} disabled={simpan}>{simpan ? <Spinner /> : <Save />} Simpan templat</Button>
          <Button variant="ghost" onClick={() => setUbahan(milik?.pengaturan ?? {})}>Kembalikan</Button>
        </div>
      </div>
      <div className="u-templat-pratinjau">
        <div className="u-templat-pratinjau-kepala">
          <strong>Pratinjau {JENIS_LABEL[jenisPratinjau].toLowerCase()}</strong>
          {muatPdf && <Spinner />}
        </div>
        {efektif.error ? <GalatApi error={efektif.error} onRetry={efektif.refetch} /> : pdf ? <iframe title="Pratinjau PDF templat" src={pdf} /> : <Empty icon={<FileText />} title="Menyiapkan pratinjau…" />}
      </div>
    </div>
    </div>
  );
}
