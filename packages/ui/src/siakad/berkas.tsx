'use client';
import * as React from 'react';
import type { Siakad } from 'unipo-siakad-sdk';
import { Dropzone, FileList, type UploadedFile } from '../components/calendar';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

/** Data berkas dari /v1/berkas (subset yang dipakai komponen). */
export interface BerkasTerunggah {
  id: string;
  nama: string;
  ekstensi?: string | null;
  mime?: string | null;
  ukuran: number;
  status: 'mengunggah' | 'menunggu_unggah' | 'tersedia';
  kategori?: string | null;
  url?: string | null;
  sesi?: { ukuran_potongan: number; jumlah_potongan: number; diterima: number[] };
}

/** Batas dari GET /v1/berkas/info. */
export interface InfoBerkas {
  maks_byte: number;
  batas_sekali_unggah_byte: number;
  ukuran_potongan: number;
  ekstensi: string[];
  penyimpanan: { driver: string; kode: string; nama: string };
  /**
   * Kuota efektif pemanggil menurut aturan penyimpanan Pustikom (SIAKAD dengan /v1/penyimpanan): ruang pribadi atau
   * ruang bersama unit (`?unit=`). null/tidak ada = server belum memasang aturan penyimpanan.
   */
  kuota?: {
    ruang: 'pribadi' | 'unit';
    kuota_byte: number | null;
    terpakai_byte: number;
    jumlah_berkas: number;
    sisa_byte: number | null;
    sisa_kolam_byte: number | null;
    /** Ruang yang masih boleh dipakai (terkecil dari sisa kuota dan sisa kolam unit); null = tanpa batas. */
    boleh_unggah_byte: number | null;
    maks_jumlah: number | null;
    kolam: Array<{ kode: string; nama: string; kolam_byte: number }>;
    sumber?: { lingkup: string; kunci: string; label: string } | null;
    /** Batas yang mengikat untuk ditampilkan: kuota ruang atau kolam unit (termasuk kolam induk yang diwariskan); null = tanpa batas. */
    batas?: { byte: number; terpakai_byte: number; sisa_byte: number; persen: number; sumber: string; kode: string | null; label: string } | null;
  } | null;
  /**
   * Batas unggah efektif dan sumbernya (SIAKAD 2027-01+): tingkat pengguna × unit × aplikasi pemanggil, digabung paling
   * ketat. `teks` siap tampil, mis. "Maks 5 MB · PDF, JPG, PNG".
   */
  batas_unggah?: BatasUnggah | null;
}

/** Sumber sebuah nilai kebijakan penyimpanan (lingkup bawaan/unit/kelompok/peran/pengguna/aplikasi/konfigurasi). */
export interface SumberBatas {
  lingkup: string;
  kunci: string;
  label: string;
}

/** Batas unggah efektif (GET /v1/berkas/info → batas_unggah). */
export interface BatasUnggah {
  maks_byte: number | null;
  maks_sumber?: SumberBatas | null;
  /** Semua sumber ukuran yang berlaku (yang terkecil mengikat). */
  maks?: Array<{ byte: number; sumber: SumberBatas }>;
  izin?: Array<{ daftar: string[]; sumber: SumberBatas }>;
  izin_dibatasi?: boolean;
  larang?: string[];
  larang_aplikasi?: string[];
  aplikasi?: { klien: string; nama: string; diatur: boolean } | null;
  teks: string;
  /** Masa simpan sampah ruang ini (hari); null = tidak dikosongkan otomatis. */
  sampah_hari?: number | null;
}

/** Teks batas unggah untuk area unggah: "Maks 5 MB · PDF, JPG, PNG" (SIAKAD lama: "Maks 50 MB per berkas"). */
export function teksBatasUnggah(info: Pick<InfoBerkas, 'maks_byte' | 'batas_unggah'>): string {
  return info.batas_unggah?.teks ?? `Maks ${fmtByte(info.maks_byte)} per berkas`;
}

const jenisTeks = (l: string[]) => [...new Set(l.map((e) => (e === 'jpeg' ? 'jpg' : e)))].map((e) => e.toUpperCase()).join(', ');

/** Pesan awam yang menyebut sumber batasnya, sama dengan pesan server (Penjaga::pesanBatas). */
function pesanBatas(s: SumberBatas | null | undefined, izin: string[], maks: number | null, ext: string | null, ukuran: number | null): string {
  const ini = ukuran !== null ? ` (berkas ini ${fmtByte(ukuran)})` : ext !== null ? ` (berkas ini .${ext || 'tanpa ekstensi'})` : '';
  if (s?.lingkup === 'aplikasi') return `${s.label} hanya menerima ${izin.length ? jenisTeks(izin) : 'berkas'}${maks !== null ? ` hingga ${fmtByte(maks)}` : ''}${ini}.`;
  if (s?.lingkup === 'unit') return `Batas ${s.label.replace(/^Unit /, '')}: ${ukuran !== null ? `maks ${fmtByte(maks ?? 0)} per berkas` : `hanya menerima ${jenisTeks(izin)}`}${ini}.`;
  if (ukuran !== null) return `Ukuran ${fmtByte(ukuran)} melebihi batas ${fmtByte(maks ?? 0)} per berkas.`;
  return `Jenis .${ext || '(tanpa ekstensi)'} tidak diizinkan. Jenis yang boleh: ${jenisTeks(izin)}.`;
}

/**
 * Periksa file terhadap batas unggah sebelum dikirim (jenis, ukuran per berkas, sisa kuota). Server tetap memeriksa
 * ulang; ini supaya pengguna langsung tahu alasannya. `terpakaiAntrean` = ukuran file lain dalam antrean yang sama.
 */
export function periksaUnggahan(info: InfoBerkas, file: { name: string; size: number }, terpakaiAntrean = 0): string | null {
  const ext = file.name.includes('.') ? (file.name.split('.').pop() ?? '').toLowerCase() : '';
  const e = ext === 'jpeg' ? 'jpg' : ext;
  const b = info.batas_unggah;
  if (b?.larang?.includes(e)) return b.larang_aplikasi?.includes(e) ? `Aplikasi ${b.aplikasi?.nama ?? 'ini'} tidak menerima berkas .${ext}.` : `Jenis berkas .${ext} dilarang oleh aturan penyimpanan.`;
  if (b?.izin?.length) {
    // Sumber paling khusus (aplikasi, unit) disebut lebih dulu.
    for (const c of b.izin.toReversed()) if (!c.daftar.includes(e)) return pesanBatas(c.sumber, c.daftar, b.maks_byte, ext, null);
  } else if (info.ekstensi.length && !info.ekstensi.includes(e) && !(e === 'jpg' && info.ekstensi.includes('jpeg'))) return `Jenis .${ext || '(tanpa ekstensi)'} tidak diizinkan. Jenis yang boleh: ${info.ekstensi.join(', ')}.`;
  if (file.size > info.maks_byte) {
    const izinApp = b?.maks_sumber?.lingkup === 'aplikasi' ? (b.izin?.find((c) => c.sumber.lingkup === 'aplikasi')?.daftar ?? []) : [];
    return pesanBatas(b?.maks_sumber, izinApp, info.maks_byte, null, file.size);
  }
  const sisa = info.kuota?.boleh_unggah_byte;
  if (sisa !== null && sisa !== undefined && file.size + terpakaiAntrean > sisa) {
    const k = info.kuota!;
    return k.sisa_kolam_byte !== null && k.sisa_kolam_byte === sisa && k.kolam.length
      ? `Kuota penyimpanan unit ${k.kolam[k.kolam.length - 1]!.nama} tidak cukup (sisa ${fmtByte(sisa)}). Hubungi Pustikom atau hapus berkas yang tidak diperlukan.`
      : `Kuota penyimpanan tidak cukup (sisa ${fmtByte(sisa)}). Hapus berkas yang tidak diperlukan atau minta tambah kuota.`;
  }
  return null;
}

function fmtByte(n: number): string {
  if (n < 1024) return `${n} B`;
  const u = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toLocaleString('id-ID', { maximumFractionDigits: 1 })} ${u[i]}`;
}

export interface OpsiUnggahBerkas {
  kategori?: string;
  modul?: string;
  folder?: string;
  keterangan?: string;
  visibilitas?: 'privat' | 'publik';
  /** Ruang bersama unit (mis. "baak"); kosong = ruang pribadi. */
  unit?: string;
  /** Periode akademik (kode m_tahun, mis. "20251", atau "tanpa"); bawaan periode yang sedang dibuka. */
  periode?: string;
  /** Minta isi dienkripsi (berlaku bila kebijakan enkripsi "opsional"; "wajib" selalu dienkripsi). */
  enkripsi?: boolean;
  /** Potongan yang dikirim bersamaan pada unggah bertahap (bawaan 3). */
  paralel?: number;
}

const tunggu = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Unggah satu File ke /v1/berkas: sekali kirim bila muat dalam batas unggah server, selain itu bertahap per
 * potongan (paralel, diulang 3 kali bila gagal). Sama dengan `unggahBerkas()` di unipo-siakad-sdk 1.2+.
 */
export async function unggahKeBerkas(
  siakad: Siakad,
  info: InfoBerkas,
  file: File,
  opsi: OpsiUnggahBerkas = {},
  onProgress?: (persen: number) => void,
  signal?: AbortSignal,
): Promise<BerkasTerunggah> {
  const { paralel = 3, ...atribut } = opsi;
  const salah = periksaUnggahan(info, file);
  if (salah) throw new Error(salah);
  const attr = Object.fromEntries(
    Object.entries(atribut)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => [k, typeof v === 'boolean' ? (v ? '1' : '0') : v]),
  );
  if (file.size <= info.batas_sekali_unggah_byte) {
    onProgress?.(0);
    const r = await siakad.request<BerkasTerunggah>({ method: 'POST', path: '/v1/berkas', body: { berkas: file, ...attr }, multipart: true }, { signal, timeout: 300_000 });
    onProgress?.(100);
    return r.data;
  }
  const sesi = (await siakad.request<BerkasTerunggah>({ method: 'POST', path: '/v1/berkas/bertahap', body: { nama: file.name, ukuran: file.size, ...attr } }, { signal })).data;
  const { ukuran_potongan: ukuran, jumlah_potongan: jumlah } = sesi.sesi!;
  const antre = Array.from({ length: jumlah }, (_, i) => i);
  let terkirim = 0;
  const kirim = async (ke: number) => {
    const bagian = file.slice(ke * ukuran, Math.min(file.size, (ke + 1) * ukuran));
    for (let coba = 0; ; coba++) {
      try {
        await siakad.request({ method: 'POST', path: `/v1/berkas/${sesi.id}/potongan/${ke}`, body: { potongan: { data: bagian, filename: `${ke}.part` } }, multipart: true }, { signal, timeout: 300_000 });
        terkirim += bagian.size;
        onProgress?.(Math.min(99, Math.round((terkirim / file.size) * 100)));
        return;
      } catch (e) {
        if (coba >= 3 || signal?.aborted) throw e;
        await tunggu(500 * 2 ** coba);
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(paralel, jumlah)) }, async () => {
      for (let ke = antre.shift(); ke !== undefined; ke = antre.shift()) await kirim(ke);
    }),
  );
  const hasil = (await siakad.request<BerkasTerunggah>({ method: 'POST', path: `/v1/berkas/${sesi.id}/selesai` }, { signal, timeout: 300_000 })).data;
  onProgress?.(100);
  return hasil;
}

/**
 * Batas unggah server dan kebijakan penyimpanan efektif (GET /v1/berkas/info), di-cache 1 menit. `unit` = ruang
 * bersama unit (batas dan kuota unit itu); kosong = ruang pribadi.
 */
export function useInfoBerkas(unit?: string) {
  return useSiakadQuery<InfoBerkas>(['berkas-info', unit ?? ''], (s, signal) => s.request<InfoBerkas>({ method: 'GET', path: '/v1/berkas/info', query: unit ? { unit } : undefined }, { signal }), { staleTime: 60_000 });
}

/** Fungsi unggah siap pakai: `const unggah = useUnggahBerkas({ kategori: 'dokumen' }); const b = await unggah(file, setPersen);` */
export function useUnggahBerkas(opsi: OpsiUnggahBerkas = {}) {
  const siakad = useSiakad();
  const { data: info } = useInfoBerkas(opsi.unit);
  const ref = React.useRef(opsi);
  ref.current = opsi;
  return React.useCallback(
    async (file: File, onProgress?: (persen: number) => void, signal?: AbortSignal) => {
      const i = info ?? (await siakad.request<InfoBerkas>({ method: 'GET', path: '/v1/berkas/info', query: ref.current.unit ? { unit: ref.current.unit } : undefined })).data;
      const hasil = await unggahKeBerkas(siakad, i, file, ref.current, onProgress, signal);
      invalidateSiakad('berkas-info');
      return hasil;
    },
    [siakad, info],
  );
}

/** Tautan unduh sementara (tanpa token) untuk <img>, <a>, atau pratinjau PDF. */
export function useUrlBerkas(id: string | null | undefined, ttl = 900) {
  return useSiakadQuery<{ url: string }>(
    ['berkas-url', id ?? '', ttl],
    (s, signal) => s.request<{ url: string }>({ method: 'GET', path: `/v1/berkas/${encodeURIComponent(id ?? '')}/url`, query: { ttl } }, { signal }),
    { enabled: Boolean(id), staleTime: Math.max(30, ttl - 60) * 1000 },
  );
}

export interface UnggahBerkasProps extends OpsiUnggahBerkas {
  /** Dipanggil untuk setiap berkas yang selesai; `berkas.id` dipakai sebagai `berkas_id` di endpoint modul. */
  onSelesai?: (berkas: BerkasTerunggah) => void;
  onGalat?: (pesan: string, file: File) => void;
  /** Ekstensi yang diterima, mis. ".pdf,.jpg,.png". */
  accept?: string;
  multiple?: boolean;
  /** Batas ukuran (byte); bawaan dari server (BERKAS_MAKS_MB). */
  maxSize?: number;
  disabled?: boolean;
  title?: React.ReactNode;
  hint?: React.ReactNode;
  /** Sembunyikan daftar berkas setelah selesai (bawaan false). */
  sembunyikanSelesai?: boolean;
  className?: string;
}

/**
 * Kotak unggah yang terhubung ke /v1/berkas: progres per berkas, unggah bertahap otomatis untuk file besar
 * (hosting dengan upload_max_filesize kecil), dan berkas tersimpan di penyimpanan aktif (S3/R2/MinIO/Google Drive
 * atau disk server).
 */
export function UnggahBerkas({
  onSelesai,
  onGalat,
  accept,
  multiple,
  maxSize,
  disabled,
  title,
  hint,
  sembunyikanSelesai,
  className,
  ...opsi
}: UnggahBerkasProps) {
  const unggah = useUnggahBerkas(opsi);
  const { data: info } = useInfoBerkas(opsi.unit);
  const [daftar, setDaftar] = React.useState<UploadedFile[]>([]);
  const batal = React.useRef(new Map<string, AbortController>());
  React.useEffect(() => () => batal.current.forEach((c) => c.abort()), []);

  const ubah = (id: string, p: Partial<UploadedFile>) => setDaftar((d) => d.map((f) => (f.id === id ? { ...f, ...p } : f)));
  const mulai = (files: File[]) => {
    for (const file of files) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const ctl = new AbortController();
      batal.current.set(id, ctl);
      setDaftar((d) => [...(multiple ? d : d.filter((f) => f.progress != null)), { id, name: file.name, size: file.size, progress: 0 }]);
      unggah(file, (persen) => ubah(id, { progress: persen }), ctl.signal)
        .then((b) => {
          ubah(id, { progress: undefined, url: b.url ?? undefined });
          if (sembunyikanSelesai) setDaftar((d) => d.filter((f) => f.id !== id));
          onSelesai?.(b);
        })
        .catch((e) => {
          if (ctl.signal.aborted) return;
          const pesan = pesanGalat(e);
          ubah(id, { progress: undefined, error: pesan });
          onGalat?.(pesan, file);
        })
        .finally(() => batal.current.delete(id));
    }
  };

  return (
    <div className={className} style={{ display: 'grid', gap: 'var(--u-space-3, 12px)' }}>
      <Dropzone
        onFiles={mulai}
        accept={accept}
        multiple={multiple}
        maxSize={maxSize ?? info?.maks_byte}
        disabled={disabled}
        title={title}
        hint={hint ?? (info ? teksBatasUnggah(info) : undefined)}
        onReject={(m) => onGalat?.(m, new File([], ''))}
      />
      <FileList
        files={daftar}
        onRemove={(id) => {
          batal.current.get(id)?.abort();
          setDaftar((d) => d.filter((f) => f.id !== id));
        }}
      />
    </div>
  );
}
