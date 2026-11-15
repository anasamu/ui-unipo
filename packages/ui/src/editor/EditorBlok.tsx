import * as React from 'react';
import { Check, FileText, ImagePlus, Link2, Search, Upload } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from '../components/actions';
import { Field, Input, SegmentedControl } from '../components/forms';
import { formatBytes } from '../lib/format';
import { Dialog } from '../components/overlays';
import { EditorCtx, type MediaEditor, type MintaFokus, type OpsiPilihMedia, type PolaBlok } from './konteks';
import { Kanvas } from './Kanvas';
import type { Blok, TipeBlok } from './tipe';

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
 * Sumber "pilih dari sistem" untuk pemilih bawaan: berkas yang sudah ada di server, dicari dengan kata kunci.
 * Contoh siap pakai: `useMediaPortal(situs)` di `unipo-ui/siakad` (pustaka media /v1/portal/kelola/media).
 */
export interface SumberMedia {
  /** Label tab, bawaan "Pustaka". */
  nama?: string;
  cari: (q: string, opsi: OpsiPilihMedia & { halaman: number }, signal: AbortSignal) => Promise<{ data: MediaEditor[]; adaLagi?: boolean }>;
}

type TabMedia = 'pustaka' | 'unggah' | 'tautan';

const gambarKah = (m: MediaEditor) => (m.mime ? m.mime.startsWith('image/') : /\.(jpe?g|png|gif|webp|avif|svg)(\?|$)/i.test(m.url));

function Pustaka({
  sumber,
  opsi,
  terpilih,
  ganti,
  pakai,
}: {
  sumber: SumberMedia;
  opsi: OpsiPilihMedia;
  terpilih: MediaEditor[];
  ganti: (m: MediaEditor[]) => void;
  pakai: (m: MediaEditor[]) => void;
}) {
  const [q, setQ] = React.useState('');
  const [kata, setKata] = React.useState('');
  const [halaman, setHalaman] = React.useState(1);
  const [isi, setIsi] = React.useState<MediaEditor[]>([]);
  const [adaLagi, setAdaLagi] = React.useState(false);
  const [memuat, setMemuat] = React.useState(true);
  const [galat, setGalat] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setKata(q.trim());
      setHalaman(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  React.useEffect(() => {
    const ctrl = new AbortController();
    setMemuat(true);
    setGalat(null);
    sumber
      .cari(kata, { ...opsi, halaman }, ctrl.signal)
      .then((r) => {
        setIsi((x) => (halaman === 1 ? r.data : [...x, ...r.data]));
        setAdaLagi(Boolean(r.adaLagi));
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setGalat(e instanceof Error ? e.message : 'Daftar berkas tidak bisa dimuat.');
      })
      .finally(() => !ctrl.signal.aborted && setMemuat(false));
    return () => ctrl.abort();
  }, [sumber, kata, halaman, opsi]);

  const kunci = (m: MediaEditor) => String(m.id ?? m.url);
  const dipilih = new Set(terpilih.map(kunci));
  const klik = (m: MediaEditor) => {
    if (!opsi.banyak) return ganti(dipilih.has(kunci(m)) ? [] : [m]);
    ganti(dipilih.has(kunci(m)) ? terpilih.filter((x) => kunci(x) !== kunci(m)) : [...terpilih, m]);
  };

  return (
    <div className="u-eb-pustaka">
      <div className="u-eb-pustaka-cari">
        <Search aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={opsi.jenis === 'dokumen' ? 'Cari nama berkas' : 'Cari nama atau keterangan foto'}
          aria-label="Cari berkas"
          autoFocus
        />
      </div>
      {galat ? (
        <p className="u-field-error">{galat}</p>
      ) : !memuat && isi.length === 0 ? (
        <p className="u-eb-kosong">{kata ? `Tidak ada berkas “${kata}”.` : 'Belum ada berkas di sistem. Unggah dari tab Unggah.'}</p>
      ) : (
        <div className="u-eb-pustaka-kisi" role="listbox" aria-multiselectable={opsi.banyak || undefined} aria-label="Berkas di sistem" data-dokumen={opsi.jenis === 'dokumen' || undefined}>
          {isi.map((m) => {
            const on = dipilih.has(kunci(m));
            const g = gambarKah(m);
            return (
              <button
                key={kunci(m)}
                type="button"
                role="option"
                aria-selected={on}
                className="u-eb-pustaka-item"
                title={m.judul || m.nama || m.url}
                onClick={() => klik(m)}
                onDoubleClick={() => pakai(opsi.banyak ? (on ? terpilih : [...terpilih, m]) : [m])}
              >
                {g ? (
                  <img src={m.pratinjau ?? m.url} alt={m.alt ?? ''} loading="lazy" />
                ) : (
                  <span className="u-eb-pustaka-berkas">
                    <FileText aria-hidden />
                    <span>{m.judul || m.nama || m.url.split('/').pop()}</span>
                    {m.ukuran ? <small>{formatBytes(m.ukuran)}</small> : null}
                  </span>
                )}
                {on && (
                  <span className="u-eb-pustaka-centang" aria-hidden>
                    <Check />
                  </span>
                )}
              </button>
            );
          })}
          {memuat && Array.from({ length: isi.length ? 3 : 8 }, (_, i) => <span key={`m${i}`} className="u-eb-pustaka-item u-skeleton" aria-hidden />)}
        </div>
      )}
      {adaLagi && !memuat && (
        <Button variant="ghost" size="sm" onClick={() => setHalaman((h) => h + 1)}>
          Muat lebih banyak
        </Button>
      )}
    </div>
  );
}

/**
 * Pemilih media bawaan dengan tiga cara: pilih dari sistem (`sumber`, dengan pencarian), unggah dari perangkat
 * (`unggah`, mis. ke pustaka media portal), dan tempel alamat. Kembalikan `{ pilihMedia, dialog }`; taruh `dialog`
 * di dalam pohon React.
 */
export function usePemilihMediaBawaan(unggah?: (file: File, opsi: OpsiPilihMedia) => Promise<MediaEditor>, sumber?: SumberMedia) {
  const [minta, setMinta] = React.useState<{ opsi: OpsiPilihMedia; selesai: (m: MediaEditor[] | null) => void } | null>(null);
  const [tab, setTab] = React.useState<TabMedia>('tautan');
  const [terpilih, setTerpilih] = React.useState<MediaEditor[]>([]);
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
        setTerpilih([]);
        setTab(sumber ? 'pustaka' : unggah ? 'unggah' : 'tautan');
        setMinta({ opsi, selesai });
      }),
    [sumber, unggah],
  );
  const tutup = (m: MediaEditor[] | null) => {
    minta?.selesai(m);
    setMinta(null);
  };
  const gambar = minta?.opsi.jenis !== 'dokumen';
  const opsiTetap = React.useMemo(() => minta?.opsi ?? {}, [minta]);
  const tabs: Array<{ value: TabMedia; label: string }> = [
    ...(sumber ? [{ value: 'pustaka' as const, label: sumber.nama ?? 'Pustaka' }] : []),
    ...(unggah ? [{ value: 'unggah' as const, label: 'Unggah' }] : []),
    { value: 'tautan', label: 'Alamat' },
  ];

  const pakaiAlamat = () => tutup([{ url: url.trim(), alt, nama: decodeURIComponent(url.split('?')[0].split('/').pop() ?? '') }]);

  const dialog = (
    <Dialog
      open={Boolean(minta)}
      onOpenChange={(o) => !o && tutup(null)}
      title={gambar ? (minta?.opsi.banyak ? 'Pilih foto' : 'Pilih gambar') : 'Pilih berkas'}
      description={
        sumber
          ? 'Pilih berkas yang sudah ada di sistem, unggah yang baru, atau tempel alamatnya.'
          : unggah
            ? 'Unggah dari perangkat atau tempel alamat yang sudah ada.'
            : 'Tempel alamat gambar atau berkas.'
      }
      size={tab === 'pustaka' ? 'lg' : 'sm'}
      footer={
        <>
          <Button variant="ghost" onClick={() => tutup(null)}>
            Batal
          </Button>
          {tab === 'pustaka' && (
            <Button disabled={!terpilih.length} onClick={() => tutup(terpilih)}>
              <Check aria-hidden />
              {terpilih.length > 1 ? `Pakai ${terpilih.length} berkas` : 'Pakai berkas ini'}
            </Button>
          )}
          {tab === 'tautan' && (
            <Button disabled={!/^(https?:\/\/|\/)/.test(url.trim())} onClick={pakaiAlamat}>
              <Link2 aria-hidden />
              Pakai alamat ini
            </Button>
          )}
        </>
      }
    >
      <div className="u-eb-media">
        {tabs.length > 1 && <SegmentedControl<TabMedia> aria-label="Sumber berkas" fullWidth value={tab} onValueChange={setTab} options={tabs} />}
        {tab === 'pustaka' && sumber && minta && <Pustaka sumber={sumber} opsi={opsiTetap} terpilih={terpilih} ganti={setTerpilih} pakai={tutup} />}
        {tab === 'unggah' && unggah && (
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
              <small>{gambar ? 'JPG, PNG, atau WebP; lebar ideal 1600 px.' : 'PDF atau dokumen Office.'}</small>
            </button>
            {galat && <p className="u-field-error">{galat}</p>}
          </>
        )}
        {tab === 'tautan' && (
          <>
            <Field label="Alamat (URL)">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            </Field>
            {gambar && (
              <Field label="Teks alternatif" description="Gambarkan isi foto untuk pembaca layar.">
                <Input value={alt} onChange={(e) => setAlt(e.target.value)} />
              </Field>
            )}
          </>
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
  /** Berkas yang sudah ada di sistem untuk tab Pustaka di pemilih bawaan (cari + pilih). */
  sumberMedia?: SumberMedia;
  /** Pola blok siap pakai di penyisip (tab Pola). */
  pola?: PolaBlok[];
  /** Isi di atas kanvas, mis. isian judul. */
  kepala?: React.ReactNode;
  /** Mode baca: tanpa bilah, tidak bisa diketik. */
  baca?: boolean;
  /** Batasi tipe blok yang bisa disisipkan, mis. untuk surat. */
  tipe?: TipeBlok[];
  className?: string;
}

/**
 * Kanvas editor blok gaya Gutenberg: ketik langsung, `/` untuk memilih blok, pintasan Markdown (##, -, 1., >, ---),
 * seret untuk memindah, bilah format (tebal, miring, tautan, sorot, kode), dan Ctrl+Z / Ctrl+Shift+Z.
 * Format blok sama dengan Blok.php di SIAKAD.
 */
export function EditorBlok({ blok, set, urung, ulang, pilih: pilihProp, setPilih: setPilihProp, pilihMedia: pilihMediaProp, unggah, sumberMedia, pola, kepala, baca, tipe, className }: EditorBlokProps) {
  const [fokus, setFokus] = React.useState<MintaFokus | null>(null);
  const [pilihSendiri, setPilihSendiri] = React.useState<string | null>(null);
  const pilih = pilihProp !== undefined ? pilihProp : pilihSendiri;
  const setPilih = setPilihProp ?? setPilihSendiri;
  const bawaan = usePemilihMediaBawaan(unggah, sumberMedia);
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

  const ctx = React.useMemo(() => ({ pilih, setPilih, fokus, setFokus, pilihMedia, pola, baca: Boolean(baca), tipe }), [pilih, setPilih, fokus, pilihMedia, pola, baca, tipe]);

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
