'use client';
import * as React from 'react';
import { FileSearch, FileText, ImageIcon, Upload } from 'lucide-react';
import { Combobox, OptionContent } from '../components/select';
import { ProgressUnggah } from '../components/progres';
import type { ControlSize } from '../components/forms';
import { cn } from '../lib/cn';
import { formatBytes, formatDate } from '../lib/format';
import { usePlatform } from '../lib/platform';
import { useUnggahBerkas, type BerkasTerunggah, type OpsiUnggahBerkas } from './berkas';
import { pesanGalat, useOptionalSiakad } from './provider';

/** Satu dokumen hasil pencarian (berkas, dokumen arsip, atau sumber sendiri). */
export interface DokumenDitemukan {
  id: string;
  nama: string;
  ekstensi?: string | null;
  mime?: string | null;
  ukuran?: number | null;
  kategori?: string | null;
  tanggal?: string | null;
  /** Baris asli dari API. */
  asli?: unknown;
}

export interface SumberDokumen {
  /** Endpoint daftar dengan pencarian `q`, mis. /v1/berkas atau /v1/arsip/dokumen. */
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  /** Ubah satu baris API menjadi DokumenDitemukan. */
  ubah?: (baris: Record<string, unknown>) => DokumenDitemukan;
}

const SUMBER_BERKAS: SumberDokumen = {
  path: '/v1/berkas',
  query: { status: 'tersedia' },
  ubah: (b) => ({
    id: String(b.id),
    nama: String(b.nama ?? b.id),
    ekstensi: b.ekstensi as string,
    mime: b.mime as string,
    ukuran: Number(b.ukuran ?? 0),
    kategori: b.kategori as string,
    tanggal: (b.dibuat_at ?? b.dibuat_pada ?? b.created_at) as string,
    asli: b,
  }),
};

const dariBerkas = (b: BerkasTerunggah): DokumenDitemukan => ({ id: b.id, nama: b.nama, ekstensi: b.ekstensi, mime: b.mime, ukuran: b.ukuran, kategori: b.kategori, asli: b });

export interface CariAtauUnggahDokumenProps extends OpsiUnggahBerkas {
  /** ID dokumen terpilih (UUID /v1/berkas bila sumber bawaan). */
  value?: string | null;
  onValueChange?: (id: string | null, dokumen: DokumenDitemukan | null) => void;
  /** Bawaan "Berkas saya" (/v1/berkas). Isi sumber lain, mis. dokumen arsip unit. */
  sumber?: SumberDokumen;
  /**
   * Setelah unggah ke /v1/berkas, daftarkan ke sumber (mis. POST /v1/arsip/dokumen dengan berkas_id) dan kembalikan
   * dokumen hasilnya. Tanpa ini, berkas hasil unggah langsung dipilih.
   */
  setelahUnggah?: (berkas: BerkasTerunggah, kata: string) => Promise<DokumenDitemukan>;
  /** Ekstensi yang diterima saat unggah, mis. ".pdf,.docx". */
  accept?: string;
  placeholder?: string;
  disabled?: boolean;
  size?: ControlSize;
  /** Ganti pemuat (data contoh/uji). */
  load?: (q: string, signal: AbortSignal) => Promise<DokumenDitemukan[]>;
  id?: string;
  className?: string;
}

const ikon = (d: Pick<DokumenDitemukan, 'mime' | 'ekstensi'>) => (d.mime?.startsWith('image/') || /^(png|jpe?g|webp|gif)$/i.test(d.ekstensi ?? '') ? <ImageIcon size={16} /> : <FileText size={16} />);

/**
 * Isian cari dokumen yang terhubung dengan unggah: ketik nama dokumen, pilih dari hasil; bila tidak ditemukan, tombol
 * "Unggah …" (atau seret berkas ke isian) mengunggah ke /v1/berkas dengan progres, lalu dokumen baru langsung terpilih.
 * Di mobile tombol unggah membuka kamera/galeri/berkas perangkat.
 */
export function CariAtauUnggahDokumen({
  value,
  onValueChange,
  sumber = SUMBER_BERKAS,
  setelahUnggah,
  accept,
  placeholder = 'Cari dokumen…',
  disabled,
  size,
  load,
  id,
  className,
  ...opsi
}: CariAtauUnggahDokumenProps) {
  const siakad = useOptionalSiakad();
  const p = usePlatform();
  const unggah = useUnggahBerkas(opsi);
  const inputBerkas = React.useRef<HTMLInputElement>(null);
  const kataRef = React.useRef('');
  const tunggu = React.useRef<((d: DokumenDitemukan | null) => void) | null>(null);
  const [terpilih, setTerpilih] = React.useState<DokumenDitemukan | null>(null);
  const [proses, setProses] = React.useState<{ nama: string; ukuran: number; persen: number | null; status: 'mengunggah' | 'gagal' | 'selesai'; pesan?: string; file: File } | null>(null);
  const [seret, setSeret] = React.useState(false);
  const batal = React.useRef<AbortController | null>(null);
  const ubah = sumber.ubah ?? SUMBER_BERKAS.ubah!;
  const q = JSON.stringify(sumber.query ?? {});

  const muat = React.useCallback(
    async (kata: string, signal: AbortSignal) => {
      kataRef.current = kata;
      if (load) return load(kata, signal);
      if (!siakad) throw new Error('SDK belum dipasang di <UnipoProvider>.');
      const r = await siakad.request<Record<string, unknown>[]>({ method: 'GET', path: sumber.path, query: { ...JSON.parse(q), q: kata || undefined, per_page: 15 } }, { signal });
      return (Array.isArray(r.data) ? r.data : []).map(ubah);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [siakad, load, sumber.path, q],
  );

  // Nilai awal dari luar → tampilkan nama.
  React.useEffect(() => {
    if (!value) return setTerpilih(null);
    if (terpilih?.id === value) return;
    setTerpilih({ id: value, nama: value });
    if (!siakad || load) return;
    const ctrl = new AbortController();
    siakad
      .request<Record<string, unknown>>({ method: 'GET', path: `${sumber.path}/${encodeURIComponent(value)}` }, { signal: ctrl.signal })
      .then((r) => !ctrl.signal.aborted && setTerpilih(ubah(r.data)))
      .catch(() => undefined);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const pilih = (d: DokumenDitemukan | null) => {
    setTerpilih(d);
    onValueChange?.(d?.id ?? null, d);
  };

  const jalankanUnggah = async (file: File) => {
    const ctrl = new AbortController();
    batal.current = ctrl;
    setProses({ nama: file.name, ukuran: file.size, persen: null, status: 'mengunggah', file });
    try {
      const b = await unggah(file, (persen) => setProses((x) => (x ? { ...x, persen } : x)), ctrl.signal);
      const d = setelahUnggah ? await setelahUnggah(b, kataRef.current) : dariBerkas(b);
      setProses((x) => (x ? { ...x, persen: 100, status: 'selesai' } : x));
      setTimeout(() => setProses(null), 1500);
      return d;
    } catch (e) {
      if (ctrl.signal.aborted) {
        setProses(null);
        return null;
      }
      setProses((x) => (x ? { ...x, status: 'gagal', pesan: pesanGalat(e) } : x));
      return null;
    }
  };

  const mintaBerkas = () =>
    new Promise<DokumenDitemukan | null>((resolve) => {
      tunggu.current = resolve;
      inputBerkas.current?.click();
    });

  return (
    <div
      className={cn('u-cud', className)}
      data-seret={seret || undefined}
      onDragOver={(e) => {
        if (disabled || !e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setSeret(true);
      }}
      onDragLeave={() => setSeret(false)}
      onDrop={async (e) => {
        if (disabled || !e.dataTransfer.files.length) return;
        e.preventDefault();
        setSeret(false);
        const d = await jalankanUnggah(e.dataTransfer.files[0]);
        if (d) pilih(d);
      }}
    >
      <Combobox<DokumenDitemukan>
        id={id}
        size={size}
        disabled={disabled || proses?.status === 'mengunggah'}
        placeholder={placeholder}
        icon={<FileSearch />}
        loadItems={muat}
        value={terpilih}
        onValueChange={pilih}
        itemToString={(d) => d.nama}
        itemKey={(d) => d.id}
        emptyText="Dokumen tidak ditemukan."
        renderItem={(d) => (
          <>
            <span className="u-option-media" data-shape="square">
              {ikon(d)}
            </span>
            <OptionContent title={d.nama} meta={[d.ukuran ? formatBytes(d.ukuran) : null, d.kategori, d.tanggal ? formatDate(d.tanggal) : null].filter(Boolean).join(' · ')} />
          </>
        )}
        tambah={{
          label: (k) => (
            <>
              <Upload size={14} aria-hidden /> {k ? <>Tidak ada? Unggah dokumen “{k}”</> : p.mobile ? 'Unggah dari perangkat / kamera' : 'Unggah dokumen baru'}
            </>
          ),
          onTambah: () => mintaBerkas(),
        }}
      />
      <input
        ref={inputBerkas}
        type="file"
        hidden
        accept={accept}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          const resolve = tunggu.current;
          tunggu.current = null;
          if (!f) return resolve?.(null);
          const d = await jalankanUnggah(f);
          resolve?.(d);
          if (d && !resolve) pilih(d);
        }}
      />
      {seret && <div className="u-cud-seret">Lepaskan untuk mengunggah</div>}
      {proses && (
        <ProgressUnggah
          nama={proses.nama}
          ukuran={proses.ukuran}
          persen={proses.persen}
          status={proses.status}
          pesan={proses.pesan}
          onBatal={() => batal.current?.abort()}
          onUlang={async () => {
            const d = await jalankanUnggah(proses.file);
            if (d) pilih(d);
          }}
        />
      )}
      {!proses && !terpilih && !disabled && <small className="u-cud-ket">Cari dari dokumen yang sudah ada, atau seret berkas ke sini untuk mengunggah.</small>}
    </div>
  );
}
