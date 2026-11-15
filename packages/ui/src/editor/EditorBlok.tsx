import * as React from 'react';
import { ImagePlus, Link2, Upload } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from '../components/actions';
import { Field, Input } from '../components/forms';
import { Dialog } from '../components/overlays';
import { EditorCtx, type MediaEditor, type MintaFokus, type OpsiPilihMedia, type PolaBlok } from './konteks';
import { Kanvas } from './Kanvas';
import type { Blok } from './tipe';

const MAKS_RIWAYAT = 100;

/** Isi blok dengan riwayat urung/ulang. Ketikan beruntun (< 1 detik) digabung jadi satu langkah. */
export function useRiwayatBlok(awal: Blok[]) {
  const [s, setS] = React.useState<{ kini: Blok[]; lalu: Blok[][]; nanti: Blok[][] }>({ kini: awal, lalu: [], nanti: [] });
  const terakhir = React.useRef(0);

  const set = React.useCallback((kini: Blok[]) => {
    const t = Date.now();
    const gabung = t - terakhir.current < 1000;
    terakhir.current = t;
    setS((x) => ({ kini, lalu: gabung && x.lalu.length ? x.lalu : [...x.lalu, x.kini].slice(-MAKS_RIWAYAT), nanti: [] }));
  }, []);
  const urung = React.useCallback(() => setS((x) => (x.lalu.length ? { kini: x.lalu[x.lalu.length - 1], lalu: x.lalu.slice(0, -1), nanti: [x.kini, ...x.nanti] } : x)), []);
  const ulang = React.useCallback(() => setS((x) => (x.nanti.length ? { kini: x.nanti[0], lalu: [...x.lalu, x.kini], nanti: x.nanti.slice(1) } : x)), []);
  const reset = React.useCallback((b: Blok[]) => {
    terakhir.current = 0;
    setS({ kini: b, lalu: [], nanti: [] });
  }, []);

  return { blok: s.kini, set, urung, ulang, reset, bisaUrung: s.lalu.length > 0, bisaUlang: s.nanti.length > 0 };
}

export type PilihMedia = (opsi?: OpsiPilihMedia) => Promise<MediaEditor[] | null>;

/**
 * Pemilih media bawaan: tempel URL, atau unggah berkas bila `unggah` diberikan (mis. ke /v1/berkas atau pustaka
 * media humas). Kembalikan `{ pilihMedia, dialog }`; taruh `dialog` di dalam pohon React.
 */
export function usePemilihMediaBawaan(unggah?: (file: File, opsi: OpsiPilihMedia) => Promise<MediaEditor>) {
  const [minta, setMinta] = React.useState<{ opsi: OpsiPilihMedia; selesai: (m: MediaEditor[] | null) => void } | null>(null);
  const [url, setUrl] = React.useState('');
  const [alt, setAlt] = React.useState('');
  const [sibuk, setSibuk] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const masuk = React.useRef<HTMLInputElement>(null);

  const pilihMedia = React.useCallback<PilihMedia>(
    (opsi = {}) =>
      new Promise((selesai) => {
        setUrl('');
        setAlt('');
        setGalat(null);
        setMinta({ opsi, selesai });
      }),
    [],
  );
  const tutup = (m: MediaEditor[] | null) => {
    minta?.selesai(m);
    setMinta(null);
  };
  const gambar = minta?.opsi.jenis !== 'dokumen';

  const dialog = (
    <Dialog
      open={Boolean(minta)}
      onOpenChange={(o) => !o && tutup(null)}
      title={gambar ? 'Pilih gambar' : 'Pilih berkas'}
      description={unggah ? 'Unggah dari perangkat atau tempel alamat yang sudah ada.' : 'Tempel alamat gambar atau berkas.'}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => tutup(null)}>
            Batal
          </Button>
          <Button
            disabled={!/^(https?:\/\/|\/)/.test(url.trim())}
            onClick={() => tutup([{ url: url.trim(), alt, nama: decodeURIComponent(url.split('?')[0].split('/').pop() ?? '') }])}
          >
            <Link2 aria-hidden />
            Pakai alamat ini
          </Button>
        </>
      }
    >
      <div className="u-eb-media">
        {unggah && (
          <>
            <input
              ref={masuk}
              type="file"
              hidden
              multiple={minta?.opsi.banyak}
              accept={gambar ? 'image/*' : undefined}
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = '';
                if (!files.length || !minta) return;
                setSibuk(true);
                setGalat(null);
                try {
                  const hasil = [];
                  for (const f of files) hasil.push(await unggah(f, minta.opsi));
                  tutup(hasil);
                } catch (x) {
                  setGalat(x instanceof Error ? x.message : 'Unggah gagal. Coba lagi.');
                } finally {
                  setSibuk(false);
                }
              }}
            />
            <button type="button" className="u-eb-media-unggah" onClick={() => masuk.current?.click()} disabled={sibuk}>
              {gambar ? <ImagePlus aria-hidden /> : <Upload aria-hidden />}
              <strong>{sibuk ? 'Mengunggah…' : gambar ? 'Unggah foto' : 'Unggah berkas'}</strong>
              <small>{gambar ? 'JPG, PNG, atau WebP; lebar ideal 1600 px.' : 'PDF atau dokumen lain.'}</small>
            </button>
            {galat && <p className="u-field-error">{galat}</p>}
          </>
        )}
        <Field label="Alamat (URL)">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </Field>
        {gambar && (
          <Field label="Teks alternatif" description="Gambarkan isi foto untuk pembaca layar.">
            <Input value={alt} onChange={(e) => setAlt(e.target.value)} />
          </Field>
        )}
      </div>
    </Dialog>
  );
  return { pilihMedia, dialog };
}

export interface EditorBlokProps {
  blok: Blok[];
  set: (b: Blok[]) => void;
  urung?: () => void;
  ulang?: () => void;
  /** Blok terpilih (dikendalikan, agar panel samping bisa memakai yang sama). */
  pilih?: string | null;
  setPilih?: (id: string | null) => void;
  /** Pemilih media sendiri (pustaka media). Tanpa ini dipakai dialog URL/unggah bawaan. */
  pilihMedia?: PilihMedia;
  /** Unggah berkas untuk pemilih bawaan. */
  unggah?: (file: File, opsi: OpsiPilihMedia) => Promise<MediaEditor>;
  /** Pola blok siap pakai di penyisip (tab Pola). */
  pola?: PolaBlok[];
  /** Isi di atas kanvas, mis. isian judul. */
  kepala?: React.ReactNode;
  /** Mode baca: tanpa bilah, tidak bisa diketik. */
  baca?: boolean;
  className?: string;
}

/**
 * Kanvas editor blok gaya Gutenberg: ketik langsung, `/` untuk memilih blok, pintasan Markdown (##, -, 1., >, ---),
 * seret untuk memindah, bilah format (tebal, miring, tautan, sorot, kode), dan Ctrl+Z / Ctrl+Shift+Z.
 * Format blok sama dengan Blok.php di SIAKAD.
 */
export function EditorBlok({ blok, set, urung, ulang, pilih: pilihProp, setPilih: setPilihProp, pilihMedia: pilihMediaProp, unggah, pola, kepala, baca, className }: EditorBlokProps) {
  const [fokus, setFokus] = React.useState<MintaFokus | null>(null);
  const [pilihSendiri, setPilihSendiri] = React.useState<string | null>(null);
  const pilih = pilihProp !== undefined ? pilihProp : pilihSendiri;
  const setPilih = setPilihProp ?? setPilihSendiri;
  const bawaan = usePemilihMediaBawaan(unggah);
  const pilihMedia = pilihMediaProp ?? bawaan.pilihMedia;
  const akar = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const tombol = (e: KeyboardEvent) => {
      if (!akar.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) ulang?.();
        else urung?.();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        ulang?.();
      } else if (e.key === 'Escape' && pilih) {
        setPilih(null);
      }
    };
    document.addEventListener('keydown', tombol);
    return () => document.removeEventListener('keydown', tombol);
  }, [urung, ulang, pilih, setPilih]);

  const ctx = React.useMemo(() => ({ pilih, setPilih, fokus, setFokus, pilihMedia, pola, baca: Boolean(baca) }), [pilih, setPilih, fokus, pilihMedia, pola, baca]);

  return (
    <EditorCtx.Provider value={ctx}>
      <div
        ref={akar}
        className={cn('ub-konten ub-editor u-eb', className)}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) setPilih(null);
        }}
      >
        {kepala}
        <Kanvas daftar={blok.length ? blok : []} ganti={set} />
      </div>
      {!pilihMediaProp && bawaan.dialog}
    </EditorCtx.Provider>
  );
}
