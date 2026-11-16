'use client';
import * as React from 'react';
import type { Siakad } from 'unipo-siakad-sdk';
import { Dropzone, FileList, type UploadedFile } from '../components/calendar';
import { pesanGalat, useSiakad, useSiakadQuery } from './provider';

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

/** Batas unggah server (GET /v1/berkas/info), di-cache 10 menit. */
export function useInfoBerkas() {
  return useSiakadQuery<InfoBerkas>(['berkas-info'], (s, signal) => s.request<InfoBerkas>({ method: 'GET', path: '/v1/berkas/info' }, { signal }), { staleTime: 600_000 });
}

/** Fungsi unggah siap pakai: `const unggah = useUnggahBerkas({ kategori: 'dokumen' }); const b = await unggah(file, setPersen);` */
export function useUnggahBerkas(opsi: OpsiUnggahBerkas = {}) {
  const siakad = useSiakad();
  const { data: info } = useInfoBerkas();
  const ref = React.useRef(opsi);
  ref.current = opsi;
  return React.useCallback(
    async (file: File, onProgress?: (persen: number) => void, signal?: AbortSignal) => {
      const i = info ?? (await siakad.request<InfoBerkas>({ method: 'GET', path: '/v1/berkas/info' })).data;
      return unggahKeBerkas(siakad, i, file, ref.current, onProgress, signal);
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
  const { data: info } = useInfoBerkas();
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
        hint={hint}
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
