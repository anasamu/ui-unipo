import * as React from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  Check,
  CloudOff,
  Expand,
  Focus,
  ListTree,
  LoaderCircle,
  Shrink,
  Braces,
  CalendarDays,
  ChevronDown,
  Columns3,
  Eraser,
  FileImage,
  Highlighter,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  PanelRight,
  Pilcrow,
  Printer,
  QrCode,
  Quote,
  Redo2,
  Replace,
  Rows3,
  Scissors,
  Search,
  SeparatorHorizontal,
  Strikethrough,
  Subscript as IkonSub,
  Superscript as IkonSup,
  Table as IkonTabel,
  TableCellsMerge,
  TableCellsSplit,
  Trash2,
  Underline,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { usePlatform } from '../../lib/platform';
import { Popover, Tooltip } from '../../components/overlays';
import { pngDariSvgQr, svgKodeQr } from '../../lib/qr';
import { PENANDA_BAWAAN, tanggalSurat, type PenandaTemplat } from '../dokumen/templat';
import type { UkuranKertas } from '../dokumen/LembarSurat';
import {
  BarisTabel,
  GambarDok,
  GayaTeks,
  HURUF,
  JenisHuruf,
  KepalaTabel,
  ParagrafDok,
  Penanda,
  PindahHalaman,
  SelTabel,
  Sorot,
  TabelDok,
  UKURAN_HURUF,
  UkuranHuruf,
  WARNA_SOROT,
  WARNA_TEKS,
  WarnaTeks,
  type Rata,
  type SpasiBaris,
} from './ekstensi';
import { CariDok } from './cari';
import { htmlPengolah, penandaKeChip } from './html';

/** Margin kertas dalam sentimeter. */
export interface MarginKertas {
  atas: number;
  kanan: number;
  bawah: number;
  kiri: number;
}

/** Ukuran kertas dalam milimeter. */
export const KERTAS: Record<UkuranKertas, { label: string; lebar: number; tinggi: number }> = {
  a4: { label: 'A4 (21 × 29,7 cm)', lebar: 210, tinggi: 297 },
  f4: { label: 'F4 / Folio (21,5 × 33 cm)', lebar: 215, tinggi: 330 },
  letter: { label: 'Letter (21,6 × 27,9 cm)', lebar: 216, tinggi: 279 },
};

/** Margin siap pakai. "Naskah dinas" mengikuti kebiasaan tata naskah dinas (kiri lebih lebar untuk jilid). */
export const MARGIN_SIAP: Record<string, { label: string; margin: MarginKertas }> = {
  dinas: { label: 'Naskah dinas (atas 2, kiri 3, kanan 2, bawah 2 cm)', margin: { atas: 2, kanan: 2, bawah: 2, kiri: 3 } },
  normal: { label: 'Normal (2,5 cm semua sisi)', margin: { atas: 2.5, kanan: 2.5, bawah: 2.5, kiri: 2.5 } },
  sempit: { label: 'Sempit (1,27 cm)', margin: { atas: 1.27, kanan: 1.27, bawah: 1.27, kiri: 1.27 } },
  lebar: { label: 'Lebar (atas/bawah 2,5, kiri/kanan 5 cm)', margin: { atas: 2.5, kanan: 5, bawah: 2.5, kiri: 5 } },
};

export interface GambarTerunggah {
  url: string;
  nama?: string;
}

export interface PengolahDokumenProps {
  /** Isi awal (HTML dari server). Penanda `{{nama}}` teks biasa otomatis menjadi chip. Ganti `key` untuk memuat ulang. */
  nilaiAwal?: string | null;
  /** Setiap perubahan: HTML siap kirim ke kolom `isi` (sudah disaring seperti server). */
  onChange?: (html: string) => void;
  /** Penanda data yang bisa disisipkan (menu Sisipkan › Penanda). */
  penanda?: PenandaTemplat[];
  /** Ikutkan penanda bawaan arsip (unit, tanggal, perihal, lampiran). Bawaan: true. */
  penandaBawaan?: boolean;
  /** Ukuran kertas (terkendali). */
  kertas?: UkuranKertas;
  onKertasChange?: (k: UkuranKertas) => void;
  /** Margin kertas dalam cm (terkendali). Bawaan naskah dinas. */
  margin?: MarginKertas;
  onMarginChange?: (m: MarginKertas) => void;
  /** Kop surat di halaman pertama (tidak bisa disunting di sini, mis. dari templat dokumen bagian). */
  kop?: React.ReactNode;
  /** Bagian tetap sebelum isi, mis. Nomor/Sifat/Lampiran/Hal dan tujuan surat. */
  sebelumIsi?: React.ReactNode;
  /** Bagian tetap setelah isi, mis. tanda tangan + QR verifikasi dan tembusan. */
  kaki?: React.ReactNode;
  /** Unggah gambar (mis. ke /v1/berkas) dan kembalikan URL-nya. Tanpa ini gambar hanya lewat tautan. */
  unggah?: (file: File) => Promise<GambarTerunggah>;
  /** Isi bawaan saat menyisipkan kode QR. */
  qrBawaan?: string;
  /** Judul dokumen di bilah atas. */
  judul?: React.ReactNode;
  /** Tombol di kanan bilah atas (simpan, ajukan, …). */
  aksi?: React.ReactNode;
  /** Teks status di bilah bawah, mis. "Tersimpan 10.21". */
  status?: React.ReactNode;
  /** Panel samping (mis. isian data surat). Bisa ditutup dari pita Tampilan. */
  panel?: React.ReactNode;
  panelJudul?: React.ReactNode;
  /** Teks saat dokumen kosong. */
  placeholder?: string;
  /** Hanya baca: pita disembunyikan. */
  baca?: boolean;
  /** Tinggi editor (bawaan: 100% induk, minimal 32rem). */
  tinggi?: number | string;
  /**
   * Tampilan bilah alat: `pita` (tab ala pengolah kata) atau `ringkas` (satu baris alat yang paling sering dipakai).
   * Bawaan: pita di desktop/web, ringkas di mobile (mengikuti setelPlatform).
   */
  tampilan?: 'pita' | 'ringkas';
  /** Status simpan otomatis di bilah bawah. */
  simpan?: { status: 'tersimpan' | 'menyimpan' | 'belum' | 'galat'; waktu?: string | Date | null };
  /** Panel navigasi (daftar judul) terbuka sejak awal. */
  navigasi?: boolean;
  /** Dapat objek editor (Tiptap) untuk perintah dari luar. */
  onSiap?: (editor: Editor) => void;
  className?: string;
}

type Tab = 'beranda' | 'sisipkan' | 'tata' | 'tinjau' | 'tabel' | 'gambar';

const CM_PX = 37.7953;

const GAYA_PARAGRAF = [
  { nilai: 'p', label: 'Normal' },
  { nilai: 'h2', label: 'Judul 1' },
  { nilai: 'h3', label: 'Judul 2' },
  { nilai: 'h4', label: 'Judul 3' },
  { nilai: 'kutipan', label: 'Kutipan' },
];

const LABEL_HURUF: Record<string, string> = { serif: 'Times New Roman', sans: 'Arial', mono: 'Courier New' };
const LABEL_SPASI: Record<SpasiBaris, string> = { '1': '1,0', '115': '1,15', '15': '1,5', '2': '2,0' };

function Tombol({
  ikon,
  label,
  aktif,
  nonaktif,
  onClick,
  besar,
  teks,
  pintasan,
}: {
  ikon: React.ReactNode;
  label: string;
  aktif?: boolean;
  nonaktif?: boolean;
  onClick?: () => void;
  besar?: boolean;
  teks?: boolean;
  pintasan?: string;
}) {
  return (
    <Tooltip content={label} shortcut={pintasan}>
      <button
        type="button"
        className={cn('u-pd-tb', besar && 'u-pd-tb-besar', aktif && 'is-aktif')}
        aria-label={label}
        aria-pressed={aktif === undefined ? undefined : aktif}
        disabled={nonaktif}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
      >
        {ikon}
        {(besar || teks) && <span>{label}</span>}
      </button>
    </Tooltip>
  );
}

function Grup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="u-pd-grup" role="group" aria-label={label}>
      <div className="u-pd-grup-isi">{children}</div>
      <div className="u-pd-grup-label">{label}</div>
    </div>
  );
}

function PilihKecil({ label, nilai, opsi, ganti, lebar }: { label: string; nilai: string; opsi: { nilai: string; label: string }[]; ganti: (v: string) => void; lebar?: number }) {
  return (
    <label className="u-pd-pilih" style={lebar ? { width: lebar } : undefined}>
      <span className="u-sr-only">{label}</span>
      <select value={nilai} onChange={(e) => ganti(e.target.value)} aria-label={label}>
        {opsi.map((o) => (
          <option key={o.nilai} value={o.nilai}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden />
    </label>
  );
}

function PilihWarna({
  label,
  ikon,
  warna,
  nilai,
  ganti,
  jenis,
}: {
  label: string;
  ikon: React.ReactNode;
  warna: readonly string[];
  nilai: string | null;
  ganti: (v: string | null) => void;
  jenis: 'warna' | 'sorot';
}) {
  const [buka, setBuka] = React.useState(false);
  return (
    <Popover
      open={buka}
      onOpenChange={setBuka}
      width={196}
      trigger={
        <button type="button" className="u-pd-tb u-pd-tb-warna" aria-label={label} onMouseDown={(e) => e.preventDefault()}>
          {ikon}
          <span className={cn('u-pd-garis-warna', nilai && `ub-${jenis}-${nilai}`)} data-jenis={jenis} />
        </button>
      }
    >
      <div className="u-pd-palet" role="listbox" aria-label={label}>
        {warna.map((w) => (
          <button
            key={w}
            type="button"
            role="option"
            aria-selected={nilai === w}
            className={cn('u-pd-palet-item', `u-pd-${jenis}-${w}`)}
            title={w}
            onClick={() => {
              ganti(w);
              setBuka(false);
            }}
          />
        ))}
      </div>
      <button
        type="button"
        className="u-pd-palet-hapus"
        onClick={() => {
          ganti(null);
          setBuka(false);
        }}
      >
        {jenis === 'warna' ? 'Warna otomatis' : 'Tanpa stabilo'}
      </button>
    </Popover>
  );
}

function PilihTabel({ sisip }: { sisip: (baris: number, kolom: number) => void }) {
  const [buka, setBuka] = React.useState(false);
  const [arah, setArah] = React.useState<[number, number]>([0, 0]);
  return (
    <Popover
      open={buka}
      onOpenChange={setBuka}
      width={232}
      trigger={
        <button type="button" className="u-pd-tb u-pd-tb-besar" aria-label="Tabel" onMouseDown={(e) => e.preventDefault()}>
          <IkonTabel />
          <span>Tabel</span>
        </button>
      }
    >
      <p className="u-pd-tabel-info">{arah[0] ? `${arah[1]} × ${arah[0]} tabel` : 'Pilih ukuran tabel'}</p>
      <div className="u-pd-tabel-kisi" onMouseLeave={() => setArah([0, 0])}>
        {Array.from({ length: 8 }, (_, b) =>
          Array.from({ length: 8 }, (_, k) => (
            <button
              key={`${b}-${k}`}
              type="button"
              aria-label={`${k + 1} kolom × ${b + 1} baris`}
              className={cn(b < arah[0] && k < arah[1] && 'is-aktif')}
              onMouseEnter={() => setArah([b + 1, k + 1])}
              onFocus={() => setArah([b + 1, k + 1])}
              onClick={() => {
                sisip(b + 1, k + 1);
                setBuka(false);
              }}
            />
          )),
        )}
      </div>
    </Popover>
  );
}

function SisipQr({ editor, unggah, bawaan }: { editor: Editor; unggah?: PengolahDokumenProps['unggah']; bawaan?: string }) {
  const [buka, setBuka] = React.useState(false);
  const [isi, setIsi] = React.useState(bawaan ?? '');
  const [proses, setProses] = React.useState(false);
  const [galat, setGalat] = React.useState('');
  const svg = React.useMemo(() => (isi.trim() ? svgKodeQr(isi.trim(), null, { ukuran: 160 }).svg : ''), [isi]);
  const sisip = async () => {
    if (!isi.trim()) return;
    setProses(true);
    setGalat('');
    try {
      const png = await pngDariSvgQr(svgKodeQr(isi.trim(), null, { ukuran: 512 }).svg, 512);
      if (!unggah) throw new Error('Unggah gambar belum tersedia di halaman ini.');
      const g = await unggah(new File([png], 'kode-qr.png', { type: 'image/png' }));
      editor
        .chain()
        .focus()
        .setImage({ src: g.url, alt: `Kode QR: ${isi.trim()}` })
        .aturGambar({ lebar: '25' })
        .run();
      setBuka(false);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Gagal membuat kode QR.');
    } finally {
      setProses(false);
    }
  };
  return (
    <Popover
      open={buka}
      onOpenChange={setBuka}
      width={260}
      title="Kode QR"
      description="QR verifikasi surat ditambahkan otomatis di tanda tangan saat surat diterbitkan. Gunakan ini untuk QR tambahan, mis. tautan formulir."
      trigger={
        <button type="button" className="u-pd-tb u-pd-tb-besar" aria-label="Kode QR" onMouseDown={(e) => e.preventDefault()}>
          <QrCode />
          <span>Kode QR</span>
        </button>
      }
    >
      <label className="u-pd-isian">
        <span>Isi atau tautan</span>
        <input value={isi} onChange={(e) => setIsi(e.target.value)} placeholder="https://…" />
      </label>
      {svg && <div className="u-pd-qr-pratinjau" dangerouslySetInnerHTML={{ __html: svg }} />}
      {galat && <p className="u-pd-galat">{galat}</p>}
      <button type="button" className="u-pd-utama" disabled={!isi.trim() || proses} onClick={sisip}>
        {proses ? 'Menyisipkan…' : 'Sisipkan kode QR'}
      </button>
    </Popover>
  );
}

function SisipGambar({ editor, unggah }: { editor: Editor; unggah?: PengolahDokumenProps['unggah'] }) {
  const [buka, setBuka] = React.useState(false);
  const [url, setUrl] = React.useState('');
  const [proses, setProses] = React.useState(false);
  const [galat, setGalat] = React.useState('');
  const berkas = React.useRef<HTMLInputElement>(null);
  const pakai = (src: string, alt = '') => {
    editor.chain().focus().setImage({ src, alt }).run();
    setBuka(false);
    setUrl('');
  };
  return (
    <Popover
      open={buka}
      onOpenChange={setBuka}
      width={260}
      title="Gambar"
      trigger={
        <button type="button" className="u-pd-tb u-pd-tb-besar" aria-label="Gambar" onMouseDown={(e) => e.preventDefault()}>
          <ImagePlus />
          <span>Gambar</span>
        </button>
      }
    >
      {unggah && (
        <>
          <input
            ref={berkas}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              setProses(true);
              setGalat('');
              try {
                const g = await unggah(f);
                pakai(g.url, g.nama ?? f.name);
              } catch (er) {
                setGalat(er instanceof Error ? er.message : 'Gagal mengunggah gambar.');
              } finally {
                setProses(false);
              }
            }}
          />
          <button type="button" className="u-pd-utama" disabled={proses} onClick={() => berkas.current?.click()}>
            {proses ? 'Mengunggah…' : 'Unggah dari perangkat'}
          </button>
          <div className="u-pd-atau">atau</div>
        </>
      )}
      <label className="u-pd-isian">
        <span>Tautan gambar (https)</span>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/logo.png" />
      </label>
      {galat && <p className="u-pd-galat">{galat}</p>}
      <button type="button" className="u-pd-sekunder" disabled={!/^https:\/\//.test(url.trim())} onClick={() => pakai(url.trim())}>
        Sisipkan dari tautan
      </button>
    </Popover>
  );
}

function SisipPenanda({ editor, daftar }: { editor: Editor; daftar: PenandaTemplat[] }) {
  const [buka, setBuka] = React.useState(false);
  const [baru, setBaru] = React.useState('');
  const nama = baru
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const sisip = (n: string) => {
    editor.chain().focus().sisipPenanda(n).run();
    setBuka(false);
    setBaru('');
  };
  return (
    <Popover
      open={buka}
      onOpenChange={setBuka}
      width={280}
      title="Penanda data"
      description="Penanda diisi otomatis saat surat dibuat dari templat."
      trigger={
        <button type="button" className="u-pd-tb u-pd-tb-besar" aria-label="Penanda data" onMouseDown={(e) => e.preventDefault()}>
          <Braces />
          <span>Penanda</span>
        </button>
      }
    >
      <div className="u-pd-daftar-penanda">
        {daftar.map((p) => (
          <button key={p.nama} type="button" onClick={() => sisip(p.nama)}>
            <span className="u-pd-chip">{p.label}</span>
            <small>{p.bawaan ? 'otomatis' : `{{${p.nama}}}`}</small>
          </button>
        ))}
      </div>
      <form
        className="u-pd-isian u-pd-isian-baris"
        onSubmit={(e) => {
          e.preventDefault();
          if (nama) sisip(nama);
        }}
      >
        <input value={baru} onChange={(e) => setBaru(e.target.value)} placeholder="Penanda baru, mis. nama mahasiswa" aria-label="Nama penanda baru" />
        <button type="submit" className="u-pd-sekunder" disabled={!nama}>
          Tambah
        </button>
      </form>
    </Popover>
  );
}

function SisipTautan({ editor }: { editor: Editor }) {
  const [buka, setBuka] = React.useState(false);
  const [url, setUrl] = React.useState('');
  return (
    <Popover
      open={buka}
      onOpenChange={(o) => {
        setBuka(o);
        if (o) setUrl(String(editor.getAttributes('link').href ?? ''));
      }}
      width={260}
      title="Tautan"
      trigger={
        <button type="button" className="u-pd-tb u-pd-tb-besar" aria-label="Tautan" onMouseDown={(e) => e.preventDefault()}>
          <Link2 />
          <span>Tautan</span>
        </button>
      }
    >
      <form
        className="u-pd-isian"
        onSubmit={(e) => {
          e.preventDefault();
          const u = url.trim();
          if (u) editor.chain().focus().extendMarkRange('link').setLink({ href: u }).run();
          else editor.chain().focus().unsetLink().run();
          setBuka(false);
        }}
      >
        <span>Alamat</span>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        <button type="submit" className="u-pd-utama">
          {url.trim() ? 'Pasang tautan' : 'Hapus tautan'}
        </button>
      </form>
    </Popover>
  );
}

function PanelCari({ editor, tutup }: { editor: Editor; tutup: () => void }) {
  const [kata, setKata] = React.useState('');
  const [ganti, setGanti] = React.useState('');
  const [besarKecil, setBesarKecil] = React.useState(false);
  const s = useEditorState({ editor, selector: ({ editor: e }) => ({ jumlah: e.storage.cariDok.hasil.length, aktif: e.storage.cariDok.aktif }) });
  React.useEffect(() => {
    editor.commands.aturCari(kata, besarKecil);
  }, [editor, kata, besarKecil]);
  React.useEffect(() => () => void editor.commands.aturCari(''), [editor]);
  return (
    <div className="u-pd-cari-panel" role="search">
      <Search aria-hidden />
      <input
        autoFocus
        value={kata}
        onChange={(e) => setKata(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') editor.commands.cariLangkah(e.shiftKey ? -1 : 1);
          if (e.key === 'Escape') tutup();
        }}
        placeholder="Cari di dokumen"
        aria-label="Cari"
      />
      <span className="u-pd-cari-jumlah">{kata ? (s.jumlah ? `${s.aktif + 1}/${s.jumlah}` : '0 hasil') : ''}</span>
      <button type="button" className="u-pd-tb" aria-label="Sebelumnya" onClick={() => editor.commands.cariLangkah(-1)}>
        ‹
      </button>
      <button type="button" className="u-pd-tb" aria-label="Berikutnya" onClick={() => editor.commands.cariLangkah(1)}>
        ›
      </button>
      <label className="u-pd-cek">
        <input type="checkbox" checked={besarKecil} onChange={(e) => setBesarKecil(e.target.checked)} /> Aa
      </label>
      <Replace aria-hidden />
      <input value={ganti} onChange={(e) => setGanti(e.target.value)} placeholder="Ganti dengan" aria-label="Ganti dengan" />
      <button type="button" className="u-pd-sekunder" disabled={!s.jumlah} onClick={() => editor.commands.gantiSatu(ganti)}>
        Ganti
      </button>
      <button type="button" className="u-pd-sekunder" disabled={!s.jumlah} onClick={() => editor.commands.gantiSemua(ganti)}>
        Ganti semua
      </button>
      <button type="button" className="u-pd-tb" aria-label="Tutup pencarian" onClick={tutup}>
        ✕
      </button>
    </div>
  );
}

/** Cetak hanya kertas: salin lembar + gaya halaman ke iframe tersembunyi. */
function cetakLembar(el: HTMLElement | null, kertas: UkuranKertas) {
  if (!el || typeof document === 'undefined') return;
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(frame);
  const d = frame.contentDocument;
  if (!d) return;
  const gaya = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((n) => n.outerHTML)
    .join('');
  const k = KERTAS[kertas];
  d.open();
  d.write(
    `<!doctype html><html><head><meta charset="utf-8">${gaya}<style>@page{size:${k.lebar}mm ${k.tinggi}mm;margin:0}body{margin:0;background:#fff}.u-pd-lembar{box-shadow:none!important;margin:0!important;zoom:1!important}.u-pd-batas{display:none!important}</style></head><body class="u-pd-cetak">${el.outerHTML}</body></html>`,
  );
  d.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  }, 300);
}

/**
 * Pengolah dokumen ala Word untuk surat dan templat: pita menu (Beranda, Sisipkan, Tata letak, Tinjau, dan pita
 * Tabel/Gambar saat dipilih), kertas A4/F4/Letter dengan margin dan batas halaman, kop tetap, chip penanda data,
 * tabel, gambar lewat berkas, kode QR, cari & ganti, zoom, dan cetak. HTML keluarannya memakai kelas `ub-*` saja
 * sehingga lolos saringan server dan tampil sama di PDF (modul Dokumen SIAKAD).
 */
export function PengolahDokumen({
  nilaiAwal,
  onChange,
  penanda = [],
  penandaBawaan = true,
  kertas = 'a4',
  onKertasChange,
  margin = MARGIN_SIAP.dinas.margin,
  onMarginChange,
  kop,
  sebelumIsi,
  kaki,
  unggah,
  qrBawaan,
  judul,
  aksi,
  status,
  panel,
  panelJudul = 'Data dokumen',
  placeholder = 'Mulai menulis isi dokumen…',
  baca,
  tinggi,
  onSiap,
  tampilan: tampilanProp,
  simpan,
  navigasi = false,
  className,
}: PengolahDokumenProps) {
  const plat = usePlatform();
  const tampilan = tampilanProp ?? (plat.mobile ? 'ringkas' : 'pita');
  const [tab, setTab] = React.useState<Tab>('beranda');
  const [navBuka, setNavBuka] = React.useState(navigasi);
  const [fokus, setFokus] = React.useState(false);
  const [penuh, setPenuh] = React.useState(false);
  const akar = React.useRef<HTMLDivElement>(null);
  const mejaRef = React.useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = React.useState(100);
  const [cari, setCari] = React.useState(false);
  const [panelBuka, setPanelBuka] = React.useState(true);
  const [tandaParagraf, setTandaParagraf] = React.useState(false);
  const [halaman, setHalaman] = React.useState(1);
  const lembar = React.useRef<HTMLDivElement>(null);
  const isiRef = React.useRef<HTMLDivElement>(null);
  const daftarPenanda = React.useMemo(() => {
    const semua = [...(penandaBawaan ? PENANDA_BAWAAN : []), ...penanda];
    return semua.filter((p, i) => semua.findIndex((q) => q.nama === p.nama) === i);
  }, [penanda, penandaBawaan]);
  const labelRef = React.useRef<Record<string, string>>({});
  labelRef.current = Object.fromEntries(daftarPenanda.map((p) => [p.nama, p.label]));
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    editable: !baca,
    content: penandaKeChip(nilaiAwal ?? ''),
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, code: false, codeBlock: false, link: { openOnClick: false, autolink: true, protocols: ['https', 'mailto'] } }),
      Subscript,
      Superscript,
      ParagrafDok,
      UkuranHuruf,
      JenisHuruf,
      WarnaTeks,
      Sorot,
      GayaTeks,
      PindahHalaman,
      Penanda.configure({ label: () => labelRef.current }),
      TabelDok,
      BarisTabel,
      KepalaTabel,
      SelTabel,
      GambarDok,
      CariDok,
      CharacterCount,
      Placeholder.configure({ placeholder }),
    ],
    editorProps: { attributes: { class: 'u-pd-isi ub-dokumen', spellcheck: 'true', lang: 'id' } },
    onUpdate: ({ editor: e }) => onChangeRef.current?.(htmlPengolah(e.getHTML())),
  });

  React.useEffect(() => {
    if (editor) onSiap?.(editor);
  }, [editor, onSiap]);
  React.useEffect(() => {
    editor?.setEditable(!baca);
  }, [editor, baca]);

  const st = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null;
      const p = e.getAttributes(e.isActive('heading') ? 'heading' : 'paragraph');
      const gaya = e.isActive('blockquote') ? 'kutipan' : e.isActive('heading', { level: 2 }) ? 'h2' : e.isActive('heading', { level: 3 }) ? 'h3' : e.isActive('heading', { level: 4 }) ? 'h4' : 'p';
      return {
        gaya,
        rata: (p.rata ?? 'kiri') as Rata,
        spasi: (p.spasi ?? '115') as SpasiBaris,
        indenAwal: Boolean(p.indenAwal),
        uk: (e.getAttributes('ukuranHuruf').nilai as string) ?? '12',
        huruf: (e.getAttributes('jenisHuruf').nilai as string) ?? 'serif',
        warna: (e.getAttributes('warnaTeks').nilai as string) ?? null,
        sorot: e.isActive('sorot') ? ((e.getAttributes('sorot').nilai as string) ?? 'kuning') : null,
        tebal: e.isActive('bold'),
        miring: e.isActive('italic'),
        garisBawah: e.isActive('underline'),
        coret: e.isActive('strike'),
        sub: e.isActive('subscript'),
        sup: e.isActive('superscript'),
        bullet: e.isActive('bulletList'),
        nomor: e.isActive('orderedList'),
        tabel: e.isActive('table'),
        tabelPolos: Boolean(e.getAttributes('table').polos),
        gambar: e.isActive('image'),
        gambarLebar: (e.getAttributes('image').lebar as string) ?? null,
        gambarRata: (e.getAttributes('image').rata as string) ?? null,
        bisaUndo: e.can().undo(),
        bisaRedo: e.can().redo(),
        kata: e.storage.characterCount.words() as number,
        judul: (() => {
          const out: Array<{ level: number; teks: string; pos: number }> = [];
          e.state.doc.descendants((node: { type: { name: string }; attrs: { level?: number }; textContent: string }, pos: number) => {
            if (node.type.name === 'heading') out.push({ level: node.attrs.level ?? 2, teks: node.textContent, pos });
            return node.type.name !== 'heading';
          });
          return out;
        })(),
        huruf_: e.storage.characterCount.characters() as number,
      };
    },
  });

  // Pita kontekstual Tabel/Gambar muncul saat kursor di tabel atau gambar dipilih.
  React.useEffect(() => {
    if (!st) return;
    if (st.gambar) setTab('gambar');
    else if (tab === 'gambar') setTab('beranda');
    if (!st.tabel && tab === 'tabel') setTab('beranda');
  }, [st?.gambar, st?.tabel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Perkiraan jumlah halaman dari tinggi isi (batas halaman digambar di kertas).
  const k = KERTAS[kertas];
  const tinggiHalaman = (k.tinggi / 10 - margin.atas - margin.bawah) * CM_PX;
  React.useEffect(() => {
    const el = isiRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setHalaman(Math.max(1, Math.ceil((el.scrollHeight - 1) / tinggiHalaman))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [tinggiHalaman]);

  // Mobile: kertas dipaskan ke lebar layar.
  React.useEffect(() => {
    if (!plat.mobile) return;
    const el = mejaRef.current;
    if (!el) return;
    const pas = () => setZoom(Math.max(40, Math.min(100, Math.floor(((el.clientWidth - 16) / ((k.lebar / 10) * CM_PX)) * 100))));
    pas();
    window.addEventListener('resize', pas);
    return () => window.removeEventListener('resize', pas);
  }, [plat.mobile, k.lebar]);
  React.useEffect(() => {
    const ubah = () => setPenuh(document.fullscreenElement === akar.current && Boolean(akar.current));
    document.addEventListener('fullscreenchange', ubah);
    return () => document.removeEventListener('fullscreenchange', ubah);
  }, []);
  const alihPenuh = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void akar.current?.requestFullscreen?.().catch(() => setPenuh((v) => !v));
  };

  React.useEffect(() => {
    const kunci = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'h') && lembar.current?.closest('.u-pd')?.contains(document.activeElement)) {
        e.preventDefault();
        setCari(true);
      }
    };
    window.addEventListener('keydown', kunci);
    return () => window.removeEventListener('keydown', kunci);
  }, []);

  if (!editor || !st) return <div className={cn('u-pd', className)} style={{ height: tinggi }} />;
  const c = () => editor.chain().focus();

  const pita: Record<Tab, React.ReactNode> = {
    beranda: (
      <>
        <Grup label="Urungkan">
          <Tombol ikon={<Undo2 />} label="Urungkan" pintasan="Ctrl+Z" nonaktif={!st.bisaUndo} onClick={() => c().undo().run()} />
          <Tombol ikon={<Redo2 />} label="Ulangi" pintasan="Ctrl+Y" nonaktif={!st.bisaRedo} onClick={() => c().redo().run()} />
        </Grup>
        <Grup label="Huruf">
          <div className="u-pd-baris">
            <PilihKecil
              label="Jenis huruf"
              lebar={138}
              nilai={st.huruf}
              opsi={HURUF.map((h) => ({ nilai: h, label: LABEL_HURUF[h] }))}
              ganti={(v) =>
                c()
                  .aturHuruf(v === 'serif' ? null : v)
                  .run()
              }
            />
            <PilihKecil
              label="Ukuran huruf"
              lebar={58}
              nilai={st.uk}
              opsi={UKURAN_HURUF.map((u) => ({ nilai: u, label: u }))}
              ganti={(v) =>
                c()
                  .aturUkuran(v === '12' ? null : v)
                  .run()
              }
            />
          </div>
          <div className="u-pd-baris">
            <Tombol ikon={<Bold />} label="Tebal" pintasan="Ctrl+B" aktif={st.tebal} onClick={() => c().toggleBold().run()} />
            <Tombol ikon={<Italic />} label="Miring" pintasan="Ctrl+I" aktif={st.miring} onClick={() => c().toggleItalic().run()} />
            <Tombol ikon={<Underline />} label="Garis bawah" pintasan="Ctrl+U" aktif={st.garisBawah} onClick={() => c().toggleUnderline().run()} />
            <Tombol ikon={<Strikethrough />} label="Coret" aktif={st.coret} onClick={() => c().toggleStrike().run()} />
            <Tombol ikon={<IkonSub />} label="Subskrip" aktif={st.sub} onClick={() => c().toggleSubscript().run()} />
            <Tombol ikon={<IkonSup />} label="Superskrip" aktif={st.sup} onClick={() => c().toggleSuperscript().run()} />
            <PilihWarna label="Warna huruf" ikon={<Baseline />} jenis="warna" warna={WARNA_TEKS} nilai={st.warna} ganti={(v) => c().aturWarna(v).run()} />
            <PilihWarna label="Stabilo" ikon={<Highlighter />} jenis="sorot" warna={WARNA_SOROT} nilai={st.sorot} ganti={(v) => c().aturSorot(v).run()} />
            <Tombol ikon={<Eraser />} label="Hapus format" onClick={() => c().unsetAllMarks().aturRata(null).aturSpasiBaris(null).run()} />
          </div>
        </Grup>
        <Grup label="Paragraf">
          <div className="u-pd-baris">
            <Tombol ikon={<List />} label="Butir" aktif={st.bullet} onClick={() => c().toggleBulletList().run()} />
            <Tombol ikon={<ListOrdered />} label="Penomoran" aktif={st.nomor} onClick={() => c().toggleOrderedList().run()} />
            <Tombol ikon={<IndentDecrease />} label="Kurangi inden" onClick={() => (st.bullet || st.nomor ? c().liftListItem('listItem').run() : c().ubahInden(-1).run())} />
            <Tombol ikon={<IndentIncrease />} label="Tambah inden" onClick={() => (st.bullet || st.nomor ? c().sinkListItem('listItem').run() : c().ubahInden(1).run())} />
            <Tombol ikon={<Pilcrow />} label="Tampilkan tanda paragraf" aktif={tandaParagraf} onClick={() => setTandaParagraf((v) => !v)} />
          </div>
          <div className="u-pd-baris">
            <Tombol ikon={<AlignLeft />} label="Rata kiri" pintasan="Ctrl+L" aktif={st.rata === 'kiri'} onClick={() => c().aturRata('kiri').run()} />
            <Tombol ikon={<AlignCenter />} label="Rata tengah" pintasan="Ctrl+E" aktif={st.rata === 'tengah'} onClick={() => c().aturRata('tengah').run()} />
            <Tombol ikon={<AlignRight />} label="Rata kanan" pintasan="Ctrl+R" aktif={st.rata === 'kanan'} onClick={() => c().aturRata('kanan').run()} />
            <Tombol ikon={<AlignJustify />} label="Rata kiri-kanan" pintasan="Ctrl+J" aktif={st.rata === 'penuh'} onClick={() => c().aturRata('penuh').run()} />
            <PilihKecil
              label="Spasi baris"
              lebar={66}
              nilai={st.spasi}
              opsi={(Object.keys(LABEL_SPASI) as SpasiBaris[]).map((s) => ({ nilai: s, label: LABEL_SPASI[s] }))}
              ganti={(v) =>
                c()
                  .aturSpasiBaris(v as SpasiBaris)
                  .run()
              }
            />
            <Tombol ikon={<span className="u-pd-ikon-teks">⇥</span>} label="Inden baris pertama" aktif={st.indenAwal} onClick={() => c().alihIndenAwal().run()} />
          </div>
        </Grup>
        <Grup label="Gaya">
          <div className="u-pd-gaya">
            {GAYA_PARAGRAF.map((g) => (
              <button
                key={g.nilai}
                type="button"
                className={cn('u-pd-gaya-item', `u-pd-gaya-${g.nilai}`, st.gaya === g.nilai && 'is-aktif')}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (g.nilai === 'p') c().setParagraph().run();
                  else if (g.nilai === 'kutipan') c().toggleBlockquote().run();
                  else
                    c()
                      .setHeading({ level: Number(g.nilai.slice(1)) as 2 | 3 | 4 })
                      .run();
                }}
              >
                <span>AaBb</span>
                <small>{g.label}</small>
              </button>
            ))}
          </div>
        </Grup>
        <Grup label="Sunting">
          <Tombol ikon={<Search />} label="Cari & ganti" pintasan="Ctrl+F" besar onClick={() => setCari(true)} />
        </Grup>
      </>
    ),
    sisipkan: (
      <>
        <Grup label="Halaman">
          <Tombol ikon={<SeparatorHorizontal />} label="Pemisah halaman" pintasan="Ctrl+Enter" besar onClick={() => c().sisipPindahHalaman().run()} />
          <Tombol ikon={<Minus />} label="Garis" besar onClick={() => c().setHorizontalRule().run()} />
        </Grup>
        <Grup label="Tabel">
          <PilihTabel sisip={(b, k2) => c().insertTable({ rows: b, cols: k2, withHeaderRow: false }).run()} />
        </Grup>
        <Grup label="Ilustrasi">
          <SisipGambar editor={editor} unggah={unggah} />
          <SisipQr editor={editor} unggah={unggah} bawaan={qrBawaan} />
        </Grup>
        <Grup label="Data">
          <SisipPenanda editor={editor} daftar={daftarPenanda} />
          <Tombol ikon={<CalendarDays />} label="Tanggal hari ini" besar onClick={() => c().insertContent(tanggalSurat()).run()} />
          <SisipTautan editor={editor} />
        </Grup>
        <Grup label="Teks">
          <Tombol ikon={<Quote />} label="Kutipan" besar aktif={st.gaya === 'kutipan'} onClick={() => c().toggleBlockquote().run()} />
        </Grup>
      </>
    ),
    tata: (
      <>
        <Grup label="Kertas">
          <PilihKecil
            label="Ukuran kertas"
            lebar={200}
            nilai={kertas}
            opsi={(Object.keys(KERTAS) as UkuranKertas[]).map((x) => ({ nilai: x, label: KERTAS[x].label }))}
            ganti={(v) => onKertasChange?.(v as UkuranKertas)}
          />
        </Grup>
        <Grup label="Margin">
          <PilihKecil
            label="Margin siap pakai"
            lebar={280}
            nilai={Object.entries(MARGIN_SIAP).find(([, m]) => JSON.stringify(m.margin) === JSON.stringify(margin))?.[0] ?? 'khusus'}
            opsi={[...Object.entries(MARGIN_SIAP).map(([kk, m]) => ({ nilai: kk, label: m.label })), { nilai: 'khusus', label: 'Khusus' }]}
            ganti={(v) => MARGIN_SIAP[v] && onMarginChange?.(MARGIN_SIAP[v].margin)}
          />
          <div className="u-pd-margin">
            {(['atas', 'kanan', 'bawah', 'kiri'] as const).map((s) => (
              <label key={s}>
                <span>{s}</span>
                <input
                  type="number"
                  min={0}
                  max={6}
                  step={0.25}
                  value={margin[s]}
                  disabled={!onMarginChange}
                  onChange={(e) => onMarginChange?.({ ...margin, [s]: Math.max(0, Math.min(6, Number(e.target.value) || 0)) })}
                />
              </label>
            ))}
          </div>
        </Grup>
        <Grup label="Halaman">
          <Tombol ikon={<SeparatorHorizontal />} label="Pemisah halaman" besar onClick={() => c().sisipPindahHalaman().run()} />
        </Grup>
      </>
    ),
    tinjau: (
      <>
        <Grup label="Pencarian">
          <Tombol ikon={<Search />} label="Cari & ganti" besar onClick={() => setCari(true)} />
        </Grup>
        <Grup label="Statistik">
          <div className="u-pd-statistik">
            <span>
              <b>{st.kata.toLocaleString('id-ID')}</b> kata
            </span>
            <span>
              <b>{st.huruf_.toLocaleString('id-ID')}</b> karakter
            </span>
            <span>
              <b>{halaman}</b> halaman (perkiraan)
            </span>
          </div>
        </Grup>
        <Grup label="Tampilan">
          <Tombol ikon={<ZoomOut />} label="Perkecil" onClick={() => setZoom((z) => Math.max(50, z - 10))} />
          <span className="u-pd-zoom-nilai">{zoom}%</span>
          <Tombol ikon={<ZoomIn />} label="Perbesar" onClick={() => setZoom((z) => Math.min(200, z + 10))} />
          {panel && <Tombol ikon={<PanelRight />} label="Panel data" aktif={panelBuka} onClick={() => setPanelBuka((v) => !v)} />}
          <Tombol ikon={<Pilcrow />} label="Tanda paragraf" aktif={tandaParagraf} onClick={() => setTandaParagraf((v) => !v)} />
          <Tombol ikon={<ListTree />} label="Panel navigasi" aktif={navBuka} onClick={() => setNavBuka((v) => !v)} />
          <Tombol ikon={<Focus />} label="Mode fokus" aktif={fokus} onClick={() => setFokus((v) => !v)} />
          <Tombol ikon={penuh ? <Shrink /> : <Expand />} label={penuh ? 'Keluar layar penuh' : 'Layar penuh'} aktif={penuh} onClick={alihPenuh} />
        </Grup>
        <Grup label="Cetak">
          <Tombol ikon={<Printer />} label="Cetak" besar onClick={() => cetakLembar(lembar.current, kertas)} />
        </Grup>
      </>
    ),
    tabel: (
      <>
        <Grup label="Baris & kolom">
          <Tombol ikon={<Rows3 />} label="Baris di atas" teks onClick={() => c().addRowBefore().run()} />
          <Tombol ikon={<Rows3 />} label="Baris di bawah" teks onClick={() => c().addRowAfter().run()} />
          <Tombol ikon={<Columns3 />} label="Kolom di kiri" teks onClick={() => c().addColumnBefore().run()} />
          <Tombol ikon={<Columns3 />} label="Kolom di kanan" teks onClick={() => c().addColumnAfter().run()} />
        </Grup>
        <Grup label="Hapus">
          <Tombol ikon={<Scissors />} label="Hapus baris" teks onClick={() => c().deleteRow().run()} />
          <Tombol ikon={<Scissors />} label="Hapus kolom" teks onClick={() => c().deleteColumn().run()} />
          <Tombol ikon={<Trash2 />} label="Hapus tabel" teks onClick={() => c().deleteTable().run()} />
        </Grup>
        <Grup label="Sel">
          <Tombol ikon={<TableCellsMerge />} label="Gabung sel" teks onClick={() => c().mergeCells().run()} />
          <Tombol ikon={<TableCellsSplit />} label="Pisah sel" teks onClick={() => c().splitCell().run()} />
          <Tombol ikon={<IkonTabel />} label="Baris judul" teks onClick={() => c().toggleHeaderRow().run()} />
        </Grup>
        <Grup label="Garis">
          <Tombol ikon={<IkonTabel />} label={st.tabelPolos ? 'Tampilkan garis' : 'Tanpa garis'} teks aktif={st.tabelPolos} onClick={() => c().alihGarisTabel().run()} />
        </Grup>
      </>
    ),
    gambar: (
      <>
        <Grup label="Ukuran">
          {(['25', '50', '75', '100'] as const).map((l) => (
            <Tombol
              key={l}
              ikon={<FileImage />}
              label={`${l}%`}
              teks
              aktif={(st.gambarLebar ?? '100') === l}
              onClick={() =>
                c()
                  .aturGambar({ lebar: l === '100' ? null : l })
                  .run()
              }
            />
          ))}
        </Grup>
        <Grup label="Posisi">
          <Tombol ikon={<AlignLeft />} label="Kiri" aktif={!st.gambarRata || st.gambarRata === 'kiri'} onClick={() => c().aturGambar({ rata: null }).run()} />
          <Tombol ikon={<AlignCenter />} label="Tengah" aktif={st.gambarRata === 'tengah'} onClick={() => c().aturGambar({ rata: 'tengah' }).run()} />
          <Tombol ikon={<AlignRight />} label="Kanan" aktif={st.gambarRata === 'kanan'} onClick={() => c().aturGambar({ rata: 'kanan' }).run()} />
        </Grup>
        <Grup label="Hapus">
          <Tombol ikon={<Trash2 />} label="Hapus gambar" teks onClick={() => c().deleteSelection().run()} />
        </Grup>
      </>
    ),
  };

  const tabs: { id: Tab; label: string; konteks?: boolean }[] = [
    { id: 'beranda', label: 'Beranda' },
    { id: 'sisipkan', label: 'Sisipkan' },
    { id: 'tata', label: 'Tata letak' },
    { id: 'tinjau', label: 'Tinjau' },
    ...(st.tabel ? [{ id: 'tabel' as Tab, label: 'Tabel', konteks: true }] : []),
    ...(st.gambar ? [{ id: 'gambar' as Tab, label: 'Gambar', konteks: true }] : []),
  ];

  const gayaLembar = {
    '--u-pd-lebar': `${k.lebar}mm`,
    '--u-pd-tinggi': `${k.tinggi}mm`,
    '--u-pd-m-atas': `${margin.atas}cm`,
    '--u-pd-m-kanan': `${margin.kanan}cm`,
    '--u-pd-m-bawah': `${margin.bawah}cm`,
    '--u-pd-m-kiri': `${margin.kiri}cm`,
    zoom: zoom / 100,
  } as React.CSSProperties;

  const ringkas = (
    <div className="u-pd-ringkas" role="toolbar" aria-label="Alat dokumen">
      <Tombol ikon={<Undo2 />} label="Urungkan" pintasan="Ctrl+Z" nonaktif={!st.bisaUndo} onClick={() => c().undo().run()} />
      <Tombol ikon={<Redo2 />} label="Ulangi" pintasan="Ctrl+Y" nonaktif={!st.bisaRedo} onClick={() => c().redo().run()} />
      <span className="u-pd-ringkas-sekat" />
      <PilihKecil
        label="Gaya paragraf"
        lebar={104}
        nilai={st.gaya}
        opsi={GAYA_PARAGRAF.map((g) => ({ nilai: g.nilai, label: g.label }))}
        ganti={(v) => {
          if (v === 'p') c().setParagraph().run();
          else if (v === 'kutipan') c().toggleBlockquote().run();
          else
            c()
              .setHeading({ level: Number(v.slice(1)) as 2 | 3 | 4 })
              .run();
        }}
      />
      <Tombol ikon={<Bold />} label="Tebal" pintasan="Ctrl+B" aktif={st.tebal} onClick={() => c().toggleBold().run()} />
      <Tombol ikon={<Italic />} label="Miring" pintasan="Ctrl+I" aktif={st.miring} onClick={() => c().toggleItalic().run()} />
      <Tombol ikon={<Underline />} label="Garis bawah" pintasan="Ctrl+U" aktif={st.garisBawah} onClick={() => c().toggleUnderline().run()} />
      <PilihWarna label="Stabilo" ikon={<Highlighter />} jenis="sorot" warna={WARNA_SOROT} nilai={st.sorot} ganti={(v) => c().aturSorot(v).run()} />
      <span className="u-pd-ringkas-sekat" />
      <Tombol ikon={<List />} label="Butir" aktif={st.bullet} onClick={() => c().toggleBulletList().run()} />
      <Tombol ikon={<ListOrdered />} label="Penomoran" aktif={st.nomor} onClick={() => c().toggleOrderedList().run()} />
      <Tombol ikon={<AlignLeft />} label="Rata kiri" aktif={st.rata === 'kiri'} onClick={() => c().aturRata('kiri').run()} />
      <Tombol ikon={<AlignCenter />} label="Rata tengah" aktif={st.rata === 'tengah'} onClick={() => c().aturRata('tengah').run()} />
      <Tombol ikon={<AlignJustify />} label="Rata kiri-kanan" aktif={st.rata === 'penuh'} onClick={() => c().aturRata('penuh').run()} />
      <span className="u-pd-ringkas-sekat" />
      <PilihTabel sisip={(b, k2) => c().insertTable({ rows: b, cols: k2, withHeaderRow: false }).run()} />
      <SisipGambar editor={editor} unggah={unggah} />
      {daftarPenanda.length > 0 && <SisipPenanda editor={editor} daftar={daftarPenanda} />}
      <Tombol ikon={<Search />} label="Cari & ganti" onClick={() => setCari(true)} />
      <Tombol ikon={<ListTree />} label="Panel navigasi" aktif={navBuka} onClick={() => setNavBuka((v) => !v)} />
      {!plat.mobile && <Tombol ikon={<Focus />} label="Mode fokus" aktif={fokus} onClick={() => setFokus((v) => !v)} />}
    </div>
  );

  const lompat = (pos: number) => {
    editor
      .chain()
      .focus()
      .setTextSelection(pos + 1)
      .run();
    const dom = editor.view.nodeDOM(pos) as HTMLElement | null;
    dom?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    if (plat.mobile) setNavBuka(false);
  };
  const menit = Math.max(1, Math.round(st.kata / 200));
  const ikonSimpan = simpan ? (
    simpan.status === 'menyimpan' ? (
      <LoaderCircle className="u-pd-putar" />
    ) : simpan.status === 'galat' ? (
      <CloudOff />
    ) : simpan.status === 'tersimpan' ? (
      <Check />
    ) : null
  ) : null;
  const teksSimpan = simpan
    ? simpan.status === 'menyimpan'
      ? 'Menyimpan…'
      : simpan.status === 'galat'
        ? 'Gagal menyimpan'
        : simpan.status === 'belum'
          ? 'Belum disimpan'
          : `Tersimpan${simpan.waktu ? ` ${new Date(simpan.waktu).toTimeString().slice(0, 5)}` : ''}`
    : null;

  return (
    <div ref={akar} className={cn('u-pd', baca && 'is-baca', fokus && 'is-fokus', penuh && 'is-penuh', className)} data-tampilan={tampilan} style={{ height: tinggi }}>
      {(judul || aksi) && (
        <div className="u-pd-atas">
          <div className="u-pd-judul">{judul}</div>
          <div className="u-pd-aksi">{aksi}</div>
        </div>
      )}
      {!baca && tampilan === 'ringkas' && (
        <div className="u-pd-pita u-pd-pita-ringkas">
          {ringkas}
          {cari && <PanelCari editor={editor} tutup={() => setCari(false)} />}
        </div>
      )}
      {!baca && tampilan === 'pita' && (
        <div className="u-pd-pita">
          <div className="u-pd-tab" role="tablist" aria-label="Pita menu">
            {tabs.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={cn(t.konteks && 'is-konteks')} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="u-pd-pita-isi" role="tabpanel">
            {pita[tab]}
          </div>
          {cari && <PanelCari editor={editor} tutup={() => setCari(false)} />}
        </div>
      )}
      <div className="u-pd-tubuh">
        {navBuka && (
          <nav className="u-pd-navigasi" aria-label="Navigasi dokumen">
            <div className="u-pd-panel-kepala">
              <b>Navigasi</b>
              <button type="button" className="u-pd-tb" aria-label="Tutup navigasi" onClick={() => setNavBuka(false)}>
                ✕
              </button>
            </div>
            {st.judul.length ? (
              <ol>
                {st.judul.map((j, i) => (
                  <li key={i} data-level={j.level}>
                    <button type="button" onClick={() => lompat(j.pos)}>
                      {j.teks || <i>(judul kosong)</i>}
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="u-pd-navigasi-kosong">Pakai gaya Judul 1–3 agar bagian dokumen muncul di sini.</p>
            )}
          </nav>
        )}
        <div className="u-pd-meja" ref={mejaRef}>
          <div ref={lembar} className={cn('u-pd-lembar', tandaParagraf && 'is-tanda')} data-kertas={kertas} style={gayaLembar}>
            {kop && (
              <div className="u-pd-kop" title="Kop diatur di templat dokumen">
                {kop}
              </div>
            )}
            {sebelumIsi && <div className="u-pd-tetap">{sebelumIsi}</div>}
            <div className="u-pd-isi-bungkus" ref={isiRef}>
              <EditorContent editor={editor} />
              {Array.from({ length: halaman - 1 }, (_, i) => (
                <div key={i} className="u-pd-batas" style={{ top: (i + 1) * tinggiHalaman }} aria-hidden>
                  <span>Halaman {i + 2}</span>
                </div>
              ))}
            </div>
            {kaki && <div className="u-pd-tetap u-pd-kaki">{kaki}</div>}
          </div>
        </div>
        {panel && panelBuka && (
          <aside className="u-pd-panel" aria-label={typeof panelJudul === 'string' ? panelJudul : 'Panel'}>
            <div className="u-pd-panel-kepala">
              <b>{panelJudul}</b>
              <button type="button" className="u-pd-tb" aria-label="Tutup panel" onClick={() => setPanelBuka(false)}>
                ✕
              </button>
            </div>
            <div className="u-pd-panel-isi">{panel}</div>
          </aside>
        )}
      </div>
      <div className="u-pd-status">
        <span>
          Halaman {halaman} · {st.kata.toLocaleString('id-ID')} kata
        </span>
        {!plat.mobile && <span className="u-pd-status-baca">± {menit} menit baca</span>}
        {teksSimpan && (
          <span className="u-pd-status-simpan" data-status={simpan!.status}>
            {ikonSimpan}
            {teksSimpan}
          </span>
        )}
        <span className="u-pd-status-teks">{status}</span>
        <span className="u-pd-zoom">
          {panel && !panelBuka && (
            <button type="button" className="u-pd-tb" aria-label="Buka panel data" onClick={() => setPanelBuka(true)}>
              <PanelRight />
            </button>
          )}
          <button type="button" className="u-pd-tb" aria-label="Perkecil" onClick={() => setZoom((z) => Math.max(50, z - 10))}>
            <ZoomOut />
          </button>
          <input type="range" min={50} max={200} step={10} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" />
          <button type="button" className="u-pd-tb" aria-label="Perbesar" onClick={() => setZoom((z) => Math.min(200, z + 10))}>
            <ZoomIn />
          </button>
          <span>{zoom}%</span>
        </span>
      </div>
    </div>
  );
}
