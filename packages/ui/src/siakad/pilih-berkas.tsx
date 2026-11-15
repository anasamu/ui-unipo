'use client';
import * as React from 'react';
import { Check, FileText, FolderOpen, ImageIcon, Search, Upload, X } from 'lucide-react';
import { Button } from '../components/actions';
import { Progress } from '../components/display';
import { Dialog } from '../components/overlays';
import { formatBytes } from '../lib/format';
import { cn } from '../lib/cn';
import { useInfoBerkas, useUnggahBerkas, type BerkasTerunggah, type OpsiUnggahBerkas } from './berkas';
import { pesanGalat, useSiakad, useSiakadQuery } from './provider';

const ikonBerkas = (mime?: string | null) => (mime?.startsWith('image/') ? <ImageIcon aria-hidden /> : <FileText aria-hidden />);

/** Daftar "Berkas saya" (GET /v1/berkas) dengan pencarian, untuk memilih berkas yang sudah diunggah. */
function DialogBerkasSaya({ open, tutup, pilih, kategori, accept }: { open: boolean; tutup: () => void; pilih: (b: BerkasTerunggah) => void; kategori?: string; accept?: string }) {
  const siakad = useSiakad();
  const [q, setQ] = React.useState('');
  const [kata, setKata] = React.useState('');
  const [halaman, setHalaman] = React.useState(1);
  const [isi, setIsi] = React.useState<BerkasTerunggah[]>([]);
  const [adaLagi, setAdaLagi] = React.useState(false);
  const [memuat, setMemuat] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [terpilih, setTerpilih] = React.useState<BerkasTerunggah | null>(null);
  const ekstensi = React.useMemo(
    () =>
      accept
        ? accept
            .split(',')
            .map((x) => x.trim().replace(/^\./, '').toLowerCase())
            .filter((x) => x && !x.includes('/'))
        : [],
    [accept],
  );

  React.useEffect(() => {
    const t = setTimeout(() => {
      setKata(q.trim());
      setHalaman(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  React.useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    setMemuat(true);
    setGalat(null);
    siakad
      .request<BerkasTerunggah[]>({ method: 'GET', path: '/v1/berkas', query: { q: kata || undefined, status: 'tersedia', kategori, page: halaman, per_page: 20 } }, { signal: ctrl.signal })
      .then((r) => {
        const data = (Array.isArray(r.data) ? r.data : []).filter((b) => !ekstensi.length || ekstensi.includes(String(b.ekstensi ?? '').toLowerCase()));
        setIsi((x) => (halaman === 1 ? data : [...x, ...data]));
        const meta = r.meta as { page?: number; total_pages?: number } | undefined;
        setAdaLagi(meta?.total_pages !== undefined ? (meta.page ?? halaman) < meta.total_pages : false);
      })
      .catch((e) => !ctrl.signal.aborted && setGalat(pesanGalat(e)))
      .finally(() => !ctrl.signal.aborted && setMemuat(false));
    return () => ctrl.abort();
  }, [open, siakad, kata, halaman, kategori, ekstensi]);

  React.useEffect(() => {
    if (open) {
      setQ('');
      setTerpilih(null);
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && tutup()}
      title="Pilih dari berkas saya"
      description="Berkas yang sudah pernah Anda unggah ke SIAKAD."
      footer={
        <>
          <Button variant="ghost" onClick={tutup}>
            Batal
          </Button>
          <Button disabled={!terpilih} onClick={() => terpilih && pilih(terpilih)}>
            <Check aria-hidden />
            Pakai berkas ini
          </Button>
        </>
      }
    >
      <div className="u-pilih-berkas-dialog">
        <div className="u-pilih-berkas-cari">
          <Search aria-hidden />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau keterangan berkas" aria-label="Cari berkas" autoFocus />
        </div>
        {galat ? (
          <p className="u-field-error">{galat}</p>
        ) : !memuat && !isi.length ? (
          <p className="u-pilih-berkas-kosong">{kata ? `Tidak ada berkas “${kata}”.` : 'Belum ada berkas. Unggah berkas baru dari formulir.'}</p>
        ) : (
          <div className="u-pilih-berkas-daftar" role="listbox" aria-label="Berkas saya">
            {isi.map((b) => (
              <button key={b.id} type="button" role="option" aria-selected={terpilih?.id === b.id} className="u-pilih-berkas-baris" onClick={() => setTerpilih(b)} onDoubleClick={() => pilih(b)}>
                <span className="u-pilih-berkas-ikon">{ikonBerkas(b.mime)}</span>
                <span className="u-pilih-berkas-teks">
                  <strong>{b.nama}</strong>
                  <small>{[formatBytes(b.ukuran), b.kategori].filter(Boolean).join(' · ')}</small>
                </span>
                {terpilih?.id === b.id && <Check aria-hidden className="u-pilih-berkas-centang" />}
              </button>
            ))}
            {memuat && Array.from({ length: isi.length ? 2 : 5 }, (_, i) => <span key={`m${i}`} className="u-pilih-berkas-baris u-skeleton" aria-hidden />)}
          </div>
        )}
        {adaLagi && !memuat && (
          <Button variant="ghost" size="sm" onClick={() => setHalaman((h) => h + 1)} style={{ justifySelf: 'center' }}>
            Muat lebih banyak
          </Button>
        )}
      </div>
    </Dialog>
  );
}

export interface PilihBerkasProps extends OpsiUnggahBerkas {
  /** UUID berkas dari /v1/berkas (nilai `berkas_id` di endpoint modul). */
  value: string | null | undefined;
  onValueChange: (id: string | null, berkas?: BerkasTerunggah) => void;
  /** Ekstensi yang diterima, mis. ".pdf,.jpg". Dipakai juga untuk menyaring "Berkas saya". */
  accept?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** Sembunyikan tombol "Pilih dari berkas saya" (hanya unggah). */
  tanpaBerkasSaya?: boolean;
  id?: string;
  className?: string;
}

/**
 * Isian satu berkas untuk formulir: unggah dari perangkat (bertahap otomatis untuk file besar, dengan progres) atau
 * pilih berkas yang sudah ada lewat pencarian "Berkas saya". Nilainya UUID `/v1/berkas`, siap dikirim sebagai
 * `berkas_id` ke endpoint modul (arsip, SPMI, SDM, LPPM, LMS, portal, tracer, pusat data).
 */
export function PilihBerkas({ value, onValueChange, accept, disabled, invalid, tanpaBerkasSaya, id, className, ...opsi }: PilihBerkasProps) {
  const unggah = useUnggahBerkas(opsi);
  const { data: info } = useInfoBerkas();
  const masuk = React.useRef<HTMLInputElement>(null);
  const [persen, setPersen] = React.useState<number | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [buka, setBuka] = React.useState(false);
  const [kini, setKini] = React.useState<BerkasTerunggah | null>(null);
  const [seret, setSeret] = React.useState(false);
  const batal = React.useRef<AbortController | null>(null);
  React.useEffect(() => () => batal.current?.abort(), []);

  const detail = useSiakadQuery<BerkasTerunggah>(
    ['berkas', value ?? ''],
    (s, signal) => s.request<BerkasTerunggah>({ method: 'GET', path: `/v1/berkas/${encodeURIComponent(value ?? '')}` }, { signal }),
    {
      enabled: Boolean(value) && kini?.id !== value,
      staleTime: 300_000,
    },
  );
  const berkas = value ? (kini?.id === value ? kini : detail.data) : null;

  const pakai = (b: BerkasTerunggah | null) => {
    setKini(b);
    onValueChange(b?.id ?? null, b ?? undefined);
  };
  const mulai = async (file: File | undefined) => {
    if (!file) return;
    const maks = info?.maks_byte;
    if (maks && file.size > maks) return setGalat(`Ukuran maksimal ${formatBytes(maks)}.`);
    batal.current?.abort();
    const ctrl = new AbortController();
    batal.current = ctrl;
    setGalat(null);
    setPersen(0);
    try {
      pakai(await unggah(file, setPersen, ctrl.signal));
    } catch (e) {
      if (!ctrl.signal.aborted) setGalat(pesanGalat(e));
    } finally {
      setPersen(null);
    }
  };

  return (
    <div
      className={cn('u-pilih-berkas', className)}
      data-invalid={invalid || undefined}
      data-seret={seret || undefined}
      onDragOver={(e) => {
        if (disabled || persen !== null) return;
        e.preventDefault();
        setSeret(true);
      }}
      onDragLeave={() => setSeret(false)}
      onDrop={(e) => {
        if (disabled || persen !== null) return;
        e.preventDefault();
        setSeret(false);
        void mulai(e.dataTransfer.files[0]);
      }}
    >
      <input
        ref={masuk}
        id={id}
        type="file"
        hidden
        accept={accept}
        onChange={(e) => {
          void mulai(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {persen !== null ? (
        <div className="u-pilih-berkas-isi">
          <span className="u-pilih-berkas-ikon">
            <Upload aria-hidden />
          </span>
          <div className="u-pilih-berkas-teks">
            <strong>Mengunggah… {persen}%</strong>
            <Progress value={persen} size="sm" />
          </div>
          <Button variant="ghost" size="sm" iconOnly aria-label="Batalkan unggahan" onClick={() => batal.current?.abort()}>
            <X />
          </Button>
        </div>
      ) : value ? (
        <div className="u-pilih-berkas-isi">
          <span className="u-pilih-berkas-ikon">{ikonBerkas(berkas?.mime)}</span>
          <div className="u-pilih-berkas-teks">
            <strong>{berkas?.nama ?? (detail.loading ? 'Memuat…' : 'Berkas terpilih')}</strong>
            <small>{berkas ? formatBytes(berkas.ukuran) : value}</small>
          </div>
          {!disabled && (
            <>
              <Button variant="ghost" size="sm" onClick={() => masuk.current?.click()}>
                Ganti
              </Button>
              <Button variant="ghost" size="sm" iconOnly aria-label="Buang berkas" onClick={() => pakai(null)}>
                <X />
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="u-pilih-berkas-kosong-isi">
          <span className="u-pilih-berkas-ikon">
            <Upload aria-hidden />
          </span>
          <div className="u-pilih-berkas-teks">
            <strong>Seret berkas ke sini</strong>
            <small>
              {[
                accept
                  ?.split(',')
                  .map((x) => x.trim().replace(/^\./, '').toUpperCase())
                  .join(', '),
                info ? `maks. ${formatBytes(info.maks_byte)}` : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'PDF, gambar, atau dokumen'}
            </small>
          </div>
          <div className="u-pilih-berkas-aksi">
            <Button variant="outline" size="sm" disabled={disabled} onClick={() => masuk.current?.click()}>
              <Upload aria-hidden />
              Unggah
            </Button>
            {!tanpaBerkasSaya && (
              <Button variant="ghost" size="sm" disabled={disabled} onClick={() => setBuka(true)}>
                <FolderOpen aria-hidden />
                Berkas saya
              </Button>
            )}
          </div>
        </div>
      )}
      {galat && <p className="u-field-error">{galat}</p>}
      {!tanpaBerkasSaya && (
        <DialogBerkasSaya
          open={buka}
          tutup={() => setBuka(false)}
          kategori={opsi.kategori}
          accept={accept}
          pilih={(b) => {
            setBuka(false);
            pakai(b);
          }}
        />
      )}
    </div>
  );
}
