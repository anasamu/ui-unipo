'use client';
import * as React from 'react';
import { ContextMenu as BaseContextMenu } from '@base-ui/react/context-menu';
import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronUp,
  Clock,
  Columns3,
  Filter,
  GalleryHorizontal,
  Group,
  Info,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardPaste,
  Copy,
  CopyPlus,
  CircleCheck,
  CloudUpload,
  Download,
  Ellipsis,
  Eye,
  File as IkonFile,
  FileArchive,
  FileAudio,
  FileImage,
  FilePlus,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder as IkonFolder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  FolderUp,
  HardDrive,
  LayoutGrid,
  List,
  Lock,
  Users,
  LockOpen,
  Pencil,
  Plus,
  Presentation,
  RotateCw,
  Scissors,
  Search,
  Share2,
  ShieldCheck,
  CalendarRange,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '../components/actions';
import { Input } from '../components/forms';
import { ConfirmDialog, Dialog, Menu, Tooltip, type MenuEntry } from '../components/overlays';
import { cn } from '../lib/cn';
import { formatBytes, formatDate } from '../lib/format';
import { periksaUnggahan, teksBatasUnggah, unggahKeBerkas, useInfoBerkas, useUrlBerkas, type BerkasTerunggah, type InfoBerkas } from './berkas';
import { KuotaBerkas } from './penyimpanan';
import { useAkunSaya } from './akun';
import {
  BERKAS_BARU,
  DialogBagikanBerkas,
  DialogBerkasBaru,
  DialogPeriodeBerkas,
  KebijakanEnkripsiBerkas,
  paramRuang,
  setelPapanBerkas,
  useKebijakanBerkas,
  usePapanBerkas,
  usePeriodeBerkas,
  useUnitBerkas,
  type JenisBerkasBaru,
  type RuangBerkasOpsi,
  type SasaranBagi,
} from './berkas-ruang';
import { invalidateSiakad, pesanGalat, useSaatInvalidasi, useSiakad, useSiakadQuery } from './provider';
import {
  JENIS_BERKAS,
  KUNCI_PREF_BERKAS,
  LABEL_KELOMPOK,
  LABEL_TAMPILAN,
  LABEL_URUT,
  PREF_BERKAS_BAWAAN,
  arahAwal,
  bacaPrefBerkas,
  jenisAwam,
  jenisBerkas,
  kelompokkanBerkas,
  klikKolom,
  simpanPrefBerkas,
  urutKeServer,
  urutkanBerkas,
  urutkanFolder,
  type JenisBerkas,
  type KelompokBerkas,
  type KunciUrut,
  type PrefBerkas,
  type TampilanBerkas,
  type UrutKolom,
  type UrutServer,
} from './berkas-finder';

// ================================================================ Tipe dan aturan (sama dengan /v1/berkas)

export type WarnaFolder = 'abu' | 'merah' | 'oranye' | 'kuning' | 'hijau' | 'teal' | 'biru' | 'ungu' | 'merah_muda';
export const WARNA_FOLDER: Record<WarnaFolder, string> = {
  abu: 'Abu',
  merah: 'Merah',
  oranye: 'Oranye',
  kuning: 'Kuning',
  hijau: 'Hijau',
  teal: 'Teal',
  biru: 'Biru',
  ungu: 'Ungu',
  merah_muda: 'Merah muda',
};

/** Satu folder dari GET /v1/berkas/folder. */
export interface FolderBerkas {
  path: string;
  nama: string;
  induk: string | null;
  jumlah_berkas: number;
  ukuran: number;
  total_berkas: number;
  total_ukuran: number;
  jumlah_subfolder: number;
  warna?: WarnaFolder | null;
  /** Ruang unit: siapa yang bisa melihat (pengelola, staf, semua, mahasiswa,dosen,tendik); null = ikut folder induk. */
  lihat?: string | null;
  dibuat_at?: string | null;
  terakhir_isi_at?: string | null;
}

export interface DaftarFolderBerkas {
  akar: { jumlah_berkas: number; ukuran: number; total_berkas: number; total_ukuran: number; jumlah_subfolder: number };
  folder: FolderBerkas[];
  /** Ruang yang dibuka (SIAKAD 2026-11+): `batas` = akar folder yang dibagikan, `akses` = pemilik/anggota/kelola/bagi. */
  ruang?: { kode: string; unit: string | null; akses: string | null; batas: string | null; periode: string | null };
}

/** Berkas di manajer (GET /v1/berkas). */
export interface BerkasManajer extends BerkasTerunggah {
  folder?: string | null;
  keterangan?: string | null;
  modul?: string | null;
  dibuat_at?: string | null;
  jumlah_unduh?: number;
  pemilik?: string | null;
  /** Kode unit bila berkas ada di ruang bersama unit. */
  unit?: string | null;
  /** Periode akademik (m_tahun, mis. 20251). */
  periode?: string | null;
  /** Isi disimpan terenkripsi AES-256-GCM di penyimpanan. */
  terenkripsi?: boolean;
  /** Ruang unit: siapa yang bisa melihat; null = ikut folder induk. */
  lihat?: string | null;
  diubah_at?: string | null;
}

const IKON_JENIS: Record<JenisBerkas | 'lain', React.ComponentType<{ 'aria-hidden'?: boolean }>> = {
  gambar: FileImage,
  pdf: FileText,
  dokumen: FileText,
  spreadsheet: FileSpreadsheet,
  presentasi: Presentation,
  arsip: FileArchive,
  video: FileVideo,
  audio: FileAudio,
  lain: IkonFile,
};

/** Nilai `urut` GET /v1/berkas (tetap diekspor untuk pemakai lama). */
export type UrutBerkas = UrutServer;

export const MAKS_NAMA_FOLDER = 60;
export const MAKS_PATH_FOLDER = 150;
const POLA_SEGMEN = /^[\p{L}\p{N}][\p{L}\p{N} ._()&,+-]*$/u;

/** Pesan galat nama folder, atau null bila sah (aturan sama dengan Folder::segmenSah di SIAKAD). */
export function validasiNamaFolder(nama: string, induk?: string | null): string | null {
  const n = nama.replace(/\s+/g, ' ').trim();
  if (!n) return 'Nama folder wajib diisi.';
  if (n.includes('/')) return 'Nama folder tidak boleh berisi garis miring (/).';
  if (n.length > MAKS_NAMA_FOLDER) return `Nama folder maksimal ${MAKS_NAMA_FOLDER} karakter.`;
  if (n.startsWith('.') || !POLA_SEGMEN.test(n)) return 'Pakai huruf, angka, spasi, atau . _ - ( ) & , + dan awali dengan huruf atau angka.';
  if ((induk ? induk.length + 1 : 0) + n.length > MAKS_PATH_FOLDER) return `Path folder (termasuk induknya) maksimal ${MAKS_PATH_FOLDER} karakter.`;
  return null;
}

/** Nama segmen folder dari nama bebas (folder komputer, nama obrolan): karakter yang ditolak server diganti "-". */
export function rapikanSegmen(s: string): string {
  const r = s
    .replace(/[^\p{L}\p{N} ._()&,+-]+/gu, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .trim()
    .slice(0, MAKS_NAMA_FOLDER)
    .trim();
  return r || 'Folder';
}

/** Nama periode dari kode m_tahun, mis. 20251 → "2025/2026 Ganjil". */
export function namaPeriode(kode: string): string {
  if (kode === 'tanpa') return 'Tanpa periode';
  const th = Number(kode.slice(0, 4));
  const sem = ({ '1': 'Ganjil', '2': 'Genap', '3': 'Pendek' } as Record<string, string>)[kode.slice(4, 5)] ?? '';
  return Number.isFinite(th) ? `${th}/${th + 1} ${sem}`.trim() : kode;
}

const gabung = (induk: string | null | undefined, nama: string) => (induk ? `${induk}/${nama}` : nama);
const indukDari = (path: string) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : null);
const namaDari = (path: string) => path.slice(path.lastIndexOf('/') + 1);

// ================================================================ Hook data

/** Pohon folder (GET /v1/berkas/folder) di ruang pribadi per modul, ruang unit (`unit`), atau folder yang dibagikan (`bagi`). */
export function useFolderBerkas(modul?: string, ruang: { unit?: string; bagi?: string; periode?: string | null } = {}) {
  const r: RuangBerkasOpsi = { modul, unit: ruang.unit, bagi: ruang.bagi };
  return useSiakadQuery<DaftarFolderBerkas>(
    ['berkas-folder', modul ?? '', ruang.unit ?? '', ruang.bagi ?? '', ruang.periode ?? ''],
    (s, signal) => s.request<DaftarFolderBerkas>({ method: 'GET', path: '/v1/berkas/folder', query: { ...paramRuang(r), periode: ruang.periode || undefined } }, { signal }),
    { staleTime: 30_000 },
  );
}

/** Ruang tujuan salin/pindah antar ruang: `unit` null = ruang pribadi (per `modul`). */
export interface TujuanRuangBerkas {
  unit: string | null;
  modul?: string;
}
const bodyTujuan = (t?: TujuanRuangBerkas) => (t ? { tujuan_unit: t.unit ?? '', tujuan_modul: t.modul || undefined } : {});

type HasilBanyak = { gagal: Array<{ id: string; pesan: string }> };

/** Aksi folder dan berkas untuk manajer berkas. Setiap aksi menyegarkan pohon folder dan daftar berkas. `unit` = ruang unit. */
export function useAksiBerkas(modul?: string, unit?: string) {
  const siakad = useSiakad();
  return React.useMemo(() => {
    const segarkan = () => {
      invalidateSiakad('berkas-folder');
      invalidateSiakad('berkas-isi');
      invalidateSiakad('berkas-periode');
      invalidateSiakad('berkas-sampah');
    };
    const m = modul || undefined;
    const ruang = unit ? { unit } : { modul: m };
    const jalan = async <T,>(fn: () => Promise<{ data: T }>) => {
      const r = await fn();
      segarkan();
      return r.data;
    };
    return {
      segarkan,
      buatFolder: (nama: string, induk: string | null, warna?: WarnaFolder | null) =>
        jalan(() => siakad.request<FolderBerkas>({ method: 'POST', path: '/v1/berkas/folder', body: { nama, induk, warna: warna ?? undefined, ...ruang } })),
      ubahFolder: (path: string, ubah: { nama?: string; induk_baru?: string | null; warna?: WarnaFolder | null }) =>
        jalan(() => siakad.request<FolderBerkas & { berkas_dipindah: number }>({ method: 'POST', path: '/v1/berkas/folder/ubah', body: { path, ...ubah, ...ruang } })),
      hapusFolder: (path: string, isi = false) =>
        jalan(() => siakad.request<{ path: string; berkas_dihapus: number }>({ method: 'POST', path: '/v1/berkas/folder/hapus', body: { path, isi, ...ruang } })),
      ubahBerkas: (id: string, ubah: { nama?: string; folder?: string | null; keterangan?: string; periode?: string }) =>
        jalan(() => siakad.request<BerkasManajer>({ method: 'POST', path: `/v1/berkas/${encodeURIComponent(id)}/ubah`, body: ubah })),
      /** Pindah berkas ke folder; `tujuan` = pindah ke ruang lain (unit lain atau ruang pribadi). */
      pindahBerkas: (id: string[], folder: string | null, tujuan?: TujuanRuangBerkas) =>
        jalan(() => siakad.request<{ dipindah: string[] } & HasilBanyak>({ method: 'POST', path: '/v1/berkas/pindah', body: { id, folder, ...bodyTujuan(tujuan) } })),
      /** Salin berkas (nama bentrok diberi akhiran "(salinan)"); `tujuan` = salin ke ruang lain. */
      salinBerkas: (id: string[], folder: string | null, tujuan?: TujuanRuangBerkas) =>
        jalan(() => siakad.request<{ disalin: BerkasManajer[] } & HasilBanyak>({ method: 'POST', path: '/v1/berkas/salin', body: { id, folder, ...bodyTujuan(tujuan) } })),
      /** Salin folder beserta isinya; `asal` = ruang folder itu (bawaan ruang hook ini). */
      salinFolder: (path: string, induk: string | null, tujuan?: TujuanRuangBerkas, asal?: { unit?: string; modul?: string }) =>
        jalan(() =>
          siakad.request<{ path: string; berkas_disalin: number; folder_disalin: number }>({
            method: 'POST',
            path: '/v1/berkas/folder/salin',
            body: { path, induk_baru: induk, ...(asal ? (asal.unit ? { unit: asal.unit } : { modul: asal.modul || undefined }) : ruang), ...bodyTujuan(tujuan) },
          }),
        ),
      /** Hapus folder di ruang lain (mis. setelah potong-tempel antar ruang). */
      hapusFolderDi: (path: string, asal: { unit?: string; modul?: string }) =>
        jalan(() => siakad.request({ method: 'POST', path: '/v1/berkas/folder/hapus', body: { path, isi: true, ...(asal.unit ? { unit: asal.unit } : { modul: asal.modul || undefined }) } })),
      /** Ganti periode akademik beberapa berkas ("tanpa" = tanpa periode). */
      ubahPeriode: async (id: string[], periode: string) => {
        const gagal: Array<{ id: string; pesan: string }> = [];
        for (const x of id) {
          try {
            await siakad.request({ method: 'POST', path: `/v1/berkas/${encodeURIComponent(x)}/ubah`, body: { periode } });
          } catch (e) {
            gagal.push({ id: x, pesan: pesanGalat(e) });
          }
        }
        segarkan();
        return { gagal };
      },
      /** Enkripsi (`aktif` true) atau buka enkripsi isi berkas yang sudah ada. */
      enkripsi: (id: string, aktif: boolean) => jalan(() => siakad.request<BerkasManajer>({ method: 'POST', path: `/v1/berkas/${encodeURIComponent(id)}/enkripsi`, body: { aktif } })),
      hapusBerkas: (id: string[]) => jalan(() => siakad.request<{ dihapus: string[]; gagal: Array<{ id: string; pesan: string }> }>({ method: 'POST', path: '/v1/berkas/hapus-banyak', body: { id } })),
      /** Kembalikan berkas dari Sampah (juga untuk "Urungkan" setelah menghapus). */
      pulihkanBerkas: (id: string[]) => jalan(() => siakad.request<{ dipulihkan: string[] } & HasilBanyak>({ method: 'POST', path: '/v1/berkas/sampah/pulihkan', body: { id } })),
      unduh: async (b: BerkasManajer) => {
        const r = await siakad.request<{ url: string }>({ method: 'GET', path: `/v1/berkas/${encodeURIComponent(b.id)}/url`, query: { unduh: 1, ttl: 300 } });
        const a = document.createElement('a');
        a.href = r.data.url;
        a.download = b.nama;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
      },
    };
  }, [siakad, modul, unit]);
}

// ================================================================ Antrean unggah

interface ItemUnggah {
  kunci: string;
  file: File;
  folder: string | null;
  persen: number;
  status: 'antre' | 'unggah' | 'selesai' | 'gagal' | 'batal';
  galat?: string;
  ctrl?: AbortController;
}

let nomorUnggah = 0;

/** File (dan isi folder yang diseret dari komputer) dari peristiwa drop, beserta subfolder relatifnya. */
async function fileDariDrop(dt: DataTransfer): Promise<Array<{ file: File; sub: string | null }>> {
  const items = Array.from(dt.items ?? []);
  const entri = items.map((i) => (i.kind === 'file' && 'webkitGetAsEntry' in i ? i.webkitGetAsEntry() : null));
  if (!entri.some((e) => e?.isDirectory)) return Array.from(dt.files).map((file) => ({ file, sub: null }));
  const hasil: Array<{ file: File; sub: string | null }> = [];
  const jelajah = async (e: FileSystemEntry, sub: string | null): Promise<void> => {
    if (e.isFile) {
      const file = await new Promise<File>((ok, gagal) => (e as FileSystemFileEntry).file(ok, gagal));
      hasil.push({ file, sub });
      return;
    }
    const dir = e as FileSystemDirectoryEntry;
    const anak = gabung(sub, rapikanSegmen(dir.name));
    const r = dir.createReader();
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((ok, gagal) => r.readEntries(ok, gagal));
      if (!batch.length) break;
      for (const x of batch) await jelajah(x, anak);
    }
  };
  for (const e of entri) if (e) await jelajah(e, null);
  return hasil;
}

// ================================================================ Komponen kecil

function IkonBerkas({ b, besar }: { b: BerkasManajer; besar?: boolean }) {
  const j = jenisBerkas(b);
  const Ikon = IKON_JENIS[j];
  return (
    <span className="u-mb-ikon" data-jenis={j} data-besar={besar ? '' : undefined}>
      <Ikon aria-hidden />
      {besar && <small>{String(b.ekstensi ?? '').toUpperCase()}</small>}
    </span>
  );
}

/** Ikon jenis berkas Kelola berkas (dipakai juga di Sampah). */
export const IkonBerkasManajer = IkonBerkas;

/** Gambar mini: tautan sementara diminta hanya saat kartu terlihat. */
function GambarMini({ b }: { b: BerkasManajer }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [tampak, setTampak] = React.useState(false);
  const [rusak, setRusak] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return void setTampak(true);
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && (setTampak(true), io.disconnect()), { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const { data } = useUrlBerkas(tampak && !rusak ? b.id : null);
  return (
    <span ref={ref} className="u-mb-mini">
      {data?.url && !rusak ? <img src={data.url} alt="" loading="lazy" onError={() => setRusak(true)} /> : <IkonBerkas b={b} besar />}
    </span>
  );
}

function IkonFolderWarna({ warna, buka }: { warna?: WarnaFolder | null; buka?: boolean }) {
  const I = buka ? FolderOpen : IkonFolder;
  return (
    <span className="u-mb-folder-ikon" data-warna={warna ?? undefined}>
      <I aria-hidden />
    </span>
  );
}

interface SimpulPohon {
  f: FolderBerkas;
  anak: SimpulPohon[];
}

function bangunPohon(folder: FolderBerkas[]): SimpulPohon[] {
  const peta = new Map<string, SimpulPohon>();
  folder.forEach((f) => peta.set(f.path, { f, anak: [] }));
  const akar: SimpulPohon[] = [];
  peta.forEach((s) => {
    const p = s.f.induk ? peta.get(s.f.induk) : undefined;
    (p ? p.anak : akar).push(s);
  });
  const urut = (a: SimpulPohon[]) => {
    a.sort((x, y) => x.f.nama.localeCompare(y.f.nama, 'id', { numeric: true, sensitivity: 'base' }));
    a.forEach((x) => urut(x.anak));
  };
  urut(akar);
  return akar;
}

interface PohonProps {
  pohon: SimpulPohon[];
  aktif: string | null;
  onPilih: (path: string | null) => void;
  akarLabel: string;
  akarInfo?: string;
  /** Path yang tidak boleh dipilih (mis. folder yang sedang dipindah beserta isinya). */
  nonaktif?: (path: string) => boolean;
  onLepas?: (tujuan: string | null, e: React.DragEvent) => void;
  bisaLepas?: (e: React.DragEvent) => boolean;
}

/** Pohon folder dengan role="tree": panah kanan/kiri membuka/menutup, atas/bawah berpindah, Enter memilih. */
function PohonFolder({ pohon, aktif, onPilih, akarLabel, akarInfo, nonaktif, onLepas, bisaLepas }: PohonProps) {
  const [terbuka, setTerbuka] = React.useState<Set<string>>(() => new Set());
  const [sasaran, setSasaran] = React.useState<string | null | undefined>(undefined);
  const ref = React.useRef<HTMLUListElement>(null);

  // Induk folder aktif selalu terbuka.
  React.useEffect(() => {
    if (!aktif) return;
    setTerbuka((t) => {
      const n = new Set(t);
      for (let x = indukDari(aktif); x; x = indukDari(x)) n.add(x);
      return n.size === t.size ? t : n;
    });
  }, [aktif]);

  const alih = (p: string) =>
    setTerbuka((t) => {
      const n = new Set(t);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });

  const tombolKe = (arah: 1 | -1, dari: HTMLElement) => {
    const semua = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="treeitem"] > .u-mb-pohon-baris') ?? []);
    const i = semua.indexOf(dari);
    semua[i + arah]?.focus();
  };

  const drag = (tujuan: string | null) =>
    onLepas
      ? {
          onDragOver: (e: React.DragEvent) => {
            if (bisaLepas && !bisaLepas(e)) return;
            if (tujuan && nonaktif?.(tujuan)) return;
            e.preventDefault();
            e.stopPropagation();
            setSasaran(tujuan);
          },
          onDragLeave: () => setSasaran(undefined),
          onDrop: (e: React.DragEvent) => {
            if (tujuan && nonaktif?.(tujuan)) return;
            e.preventDefault();
            e.stopPropagation();
            setSasaran(undefined);
            onLepas(tujuan, e);
          },
        }
      : {};

  const baris = (path: string | null, label: string, info: string | undefined, punyaAnak: boolean, buka: boolean, level: number, warna?: WarnaFolder | null) => {
    const mati = path !== null && nonaktif?.(path);
    return (
      <div
        className="u-mb-pohon-baris"
        data-aktif={aktif === path ? '' : undefined}
        data-sasaran={sasaran === path ? '' : undefined}
        aria-disabled={mati || undefined}
        tabIndex={aktif === path ? 0 : -1}
        style={{ paddingInlineStart: `${0.375 + level * 0.875}rem` }}
        onClick={() => !mati && onPilih(path)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            tombolKe(e.key === 'ArrowDown' ? 1 : -1, e.currentTarget);
          } else if (e.key === 'ArrowRight' && path && punyaAnak && !buka) alih(path);
          else if (e.key === 'ArrowLeft' && path && buka) alih(path);
          else if ((e.key === 'Enter' || e.key === ' ') && !mati) {
            e.preventDefault();
            onPilih(path);
          }
        }}
        {...drag(path)}
      >
        {path !== null ? (
          <button
            type="button"
            className="u-mb-pohon-panah"
            tabIndex={-1}
            aria-hidden={!punyaAnak}
            data-kosong={punyaAnak ? undefined : ''}
            onClick={(e) => {
              e.stopPropagation();
              alih(path);
            }}
          >
            <ChevronRight aria-hidden data-buka={buka ? '' : undefined} />
          </button>
        ) : (
          <HardDrive aria-hidden className="u-mb-pohon-akar" />
        )}
        {path !== null && <IkonFolderWarna warna={warna} buka={aktif === path} />}
        <span className="u-mb-pohon-label">{label}</span>
        {info && <small>{info}</small>}
      </div>
    );
  };

  const render = (n: SimpulPohon[], level: number): React.ReactNode =>
    n.map((s) => {
      const buka = terbuka.has(s.f.path);
      return (
        <li key={s.f.path} role="treeitem" aria-expanded={s.anak.length ? buka : undefined} aria-selected={aktif === s.f.path}>
          {baris(s.f.path, s.f.nama, s.f.total_berkas ? String(s.f.total_berkas) : undefined, s.anak.length > 0, buka, level, s.f.warna)}
          {buka && s.anak.length > 0 && <ul role="group">{render(s.anak, level + 1)}</ul>}
        </li>
      );
    });

  // Fokus awal ke baris aktif bila tidak ada yang aktif (akar selalu bisa difokus).
  return (
    <ul className="u-mb-pohon" role="tree" aria-label="Folder" ref={ref}>
      <li role="treeitem" aria-selected={aktif === null} aria-expanded>
        {baris(null, akarLabel, akarInfo, false, true, 0)}
        {pohon.length > 0 && <ul role="group">{render(pohon, 1)}</ul>}
      </li>
    </ul>
  );
}

// ================================================================ Dialog

function DialogNamaFolder({
  open,
  tutup,
  judul,
  awal,
  warnaAwal,
  induk,
  label,
  simpan,
}: {
  open: boolean;
  tutup: () => void;
  judul: string;
  awal?: string;
  warnaAwal?: WarnaFolder | null;
  induk: string | null;
  label: string;
  simpan: (nama: string, warna: WarnaFolder | null) => Promise<void>;
}) {
  const [nama, setNama] = React.useState(awal ?? '');
  const [warna, setWarna] = React.useState<WarnaFolder | null>(warnaAwal ?? null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [sibuk, setSibuk] = React.useState(false);
  const [disentuh, setDisentuh] = React.useState(false);
  React.useEffect(() => {
    if (open) {
      setNama(awal ?? '');
      setWarna(warnaAwal ?? null);
      setGalat(null);
      setDisentuh(false);
    }
  }, [open, awal, warnaAwal]);
  const salah = validasiNamaFolder(nama, induk);
  const kirim = async () => {
    setDisentuh(true);
    if (salah) return;
    setSibuk(true);
    setGalat(null);
    try {
      await simpan(nama.replace(/\s+/g, ' ').trim(), warna);
      tutup();
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSibuk(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && tutup()}
      title={judul}
      description={induk ? `Di dalam ${induk}` : 'Di folder utama'}
      side="right"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={tutup}>
            Batal
          </Button>
          <Button onClick={kirim} loading={sibuk}>
            {label}
          </Button>
        </>
      }
    >
      <form
        className="u-mb-form"
        onSubmit={(e) => {
          e.preventDefault();
          void kirim();
        }}
      >
        <label className="u-label" htmlFor="u-mb-nama-folder">
          Nama folder
        </label>
        <Input
          id="u-mb-nama-folder"
          value={nama}
          onChange={(e) => {
            setNama(e.target.value);
            setGalat(null);
          }}
          onBlur={() => setDisentuh(true)}
          aria-invalid={disentuh && Boolean(salah)}
          autoFocus
          maxLength={MAKS_NAMA_FOLDER}
          placeholder="mis. Surat Masuk 2026"
        />
        {disentuh && salah && <p className="u-field-error">{salah}</p>}
        <span className="u-label">Warna</span>
        <div className="u-mb-warna" role="radiogroup" aria-label="Warna folder">
          {([null, ...Object.keys(WARNA_FOLDER)] as Array<WarnaFolder | null>).map((w) => (
            <Tooltip key={w ?? 'bawaan'} content={w ? WARNA_FOLDER[w] : 'Bawaan'}>
              <button type="button" role="radio" aria-checked={warna === w} aria-label={w ? WARNA_FOLDER[w] : 'Bawaan'} data-warna={w ?? undefined} onClick={() => setWarna(w)}>
                {warna === w && <Check aria-hidden />}
              </button>
            </Tooltip>
          ))}
        </div>
        {galat && <p className="u-field-error">{galat}</p>}
      </form>
    </Dialog>
  );
}

function DialogGantiNamaBerkas({ b, tutup, simpan }: { b: BerkasManajer | null; tutup: () => void; simpan: (nama: string) => Promise<void> }) {
  const ext = b ? String(b.ekstensi ?? b.nama.split('.').pop() ?? '') : '';
  const dasar = b ? b.nama.replace(new RegExp(`\\.${ext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), '') : '';
  const [nama, setNama] = React.useState(dasar);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [sibuk, setSibuk] = React.useState(false);
  React.useEffect(() => {
    setNama(dasar);
    setGalat(null);
  }, [dasar]);
  const bersih = nama.replace(/[/\\\r\n]/g, '').trim();
  const salah = !bersih ? 'Nama berkas wajib diisi.' : bersih.length + ext.length + 1 > 255 ? 'Nama berkas maksimal 255 karakter.' : null;
  const kirim = async () => {
    if (salah) return setGalat(salah);
    setSibuk(true);
    try {
      await simpan(`${bersih}.${ext}`);
      tutup();
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSibuk(false);
    }
  };
  return (
    <Dialog
      open={Boolean(b)}
      onOpenChange={(o) => !o && tutup()}
      title="Ganti nama berkas"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={tutup}>
            Batal
          </Button>
          <Button onClick={kirim} loading={sibuk}>
            Simpan nama
          </Button>
        </>
      }
    >
      <form
        className="u-mb-form"
        onSubmit={(e) => {
          e.preventDefault();
          void kirim();
        }}
      >
        <label className="u-label" htmlFor="u-mb-nama-berkas">
          Nama berkas
        </label>
        <div className="u-mb-nama-ext">
          <Input id="u-mb-nama-berkas" value={nama} onChange={(e) => (setNama(e.target.value), setGalat(null))} autoFocus aria-invalid={Boolean(galat)} />
          <span>.{ext}</span>
        </div>
        <p className="u-field-description">Ekstensi tidak bisa diganti. Untuk mengganti isi, unggah berkas baru.</p>
        {galat && <p className="u-field-error">{galat}</p>}
      </form>
    </Dialog>
  );
}

function DialogPindah({
  open,
  tutup,
  judul,
  pohon,
  akarLabel,
  dari,
  terlarang,
  pindah,
  salin,
}: {
  open: boolean;
  tutup: () => void;
  judul: string;
  pohon: SimpulPohon[];
  akarLabel: string;
  dari: string | null;
  terlarang?: string | null;
  pindah: (tujuan: string | null) => Promise<void>;
  /** Mode salin: tombol "Salin ke sini" dan folder asal boleh dipilih. */
  salin?: boolean;
}) {
  const [tujuan, setTujuan] = React.useState<string | null>(dari);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [sibuk, setSibuk] = React.useState(false);
  React.useEffect(() => {
    if (open) {
      setTujuan(dari);
      setGalat(null);
    }
  }, [open, dari]);
  const kirim = async () => {
    setSibuk(true);
    setGalat(null);
    try {
      await pindah(tujuan);
      tutup();
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSibuk(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && tutup()}
      title={judul}
      description={`Tujuan: ${tujuan ?? akarLabel}`}
      side="right"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={tutup}>
            Batal
          </Button>
          <Button onClick={kirim} loading={sibuk} disabled={!salin && tujuan === dari}>
            {salin ? <Copy aria-hidden /> : <FolderInput aria-hidden />}
            {salin ? 'Salin ke sini' : 'Pindahkan ke sini'}
          </Button>
        </>
      }
    >
      <div className="u-mb-pindah">
        <PohonFolder pohon={pohon} aktif={tujuan} onPilih={setTujuan} akarLabel={akarLabel} nonaktif={terlarang ? (p) => p === terlarang || p.startsWith(`${terlarang}/`) : undefined} />
      </div>
      {galat && <p className="u-field-error">{galat}</p>}
    </Dialog>
  );
}

function Pratinjau({ b, tutup, unduh, onAksi }: { b: BerkasManajer | null; tutup: () => void; unduh: (b: BerkasManajer) => void; onAksi?: React.ReactNode }) {
  const { data, loading, error } = useUrlBerkas(b?.id ?? null);
  const j = b ? jenisBerkas(b) : 'lain';
  const url = data?.url;
  return (
    <Dialog
      open={Boolean(b)}
      onOpenChange={(o) => !o && tutup()}
      title={b?.nama ?? ''}
      description={b ? [formatBytes(b.ukuran), jenisAwam(b), b.folder ?? undefined].filter(Boolean).join(' · ') : undefined}
      size="xl"
      footer={
        <>
          {onAksi}
          <Button variant="outline" onClick={() => b && unduh(b)}>
            <Download aria-hidden />
            Unduh
          </Button>
        </>
      }
    >
      {b && (
        <div className="u-mb-pratinjau">
          <div className="u-mb-pratinjau-isi" data-jenis={j}>
            {loading && !url ? (
              <span className="u-skeleton u-mb-pratinjau-muat" aria-label="Memuat pratinjau" />
            ) : error ? (
              <p className="u-field-error">{pesanGalat(error)}</p>
            ) : url && j === 'gambar' ? (
              <img src={url} alt={b.nama} />
            ) : url && j === 'pdf' ? (
              <iframe src={url} title={b.nama} />
            ) : url && j === 'video' ? (
              <video src={url} controls />
            ) : url && j === 'audio' ? (
              <audio src={url} controls />
            ) : (
              <div className="u-mb-pratinjau-kosong">
                <IkonBerkas b={b} besar />
                <p>Pratinjau tidak tersedia untuk jenis berkas ini. Unduh untuk membukanya.</p>
              </div>
            )}
          </div>
          <dl className="u-mb-detail">
            <div>
              <dt>Ukuran</dt>
              <dd>{formatBytes(b.ukuran)}</dd>
            </div>
            <div>
              <dt>Folder</dt>
              <dd>{b.folder || 'Folder utama'}</dd>
            </div>
            {b.dibuat_at && (
              <div>
                <dt>Diunggah</dt>
                <dd>{formatDate(b.dibuat_at, 'long')}</dd>
              </div>
            )}
            {b.periode && (
              <div>
                <dt>Periode</dt>
                <dd>{namaPeriode(b.periode)}</dd>
              </div>
            )}
            {b.terenkripsi !== undefined && (
              <div>
                <dt>Penyimpanan</dt>
                <dd>{b.terenkripsi ? 'Terenkripsi AES-256-GCM' : 'Tidak dienkripsi'}</dd>
              </div>
            )}
            {b.kategori && (
              <div>
                <dt>Kategori</dt>
                <dd>{b.kategori}</dd>
              </div>
            )}
            {typeof b.jumlah_unduh === 'number' && (
              <div>
                <dt>Diunduh</dt>
                <dd>{b.jumlah_unduh}×</dd>
              </div>
            )}
            {b.keterangan && (
              <div>
                <dt>Keterangan</dt>
                <dd>{b.keterangan}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </Dialog>
  );
}

/** Pratinjau besar (galeri): gambar asli bila jenisnya gambar, selain itu ikon jenis besar. */
function GambarBesar({ b, onBuka }: { b: BerkasManajer; onBuka?: () => void }) {
  const gambar = jenisBerkas(b) === 'gambar';
  const { data, loading } = useUrlBerkas(gambar ? b.id : null);
  return (
    <div className="u-mb-besar" data-jenis={jenisBerkas(b)} onDoubleClick={onBuka}>
      {gambar && data?.url ? <img src={data.url} alt={b.nama} /> : gambar && loading ? <span className="u-skeleton u-mb-besar-muat" aria-label="Memuat pratinjau" /> : <IkonBerkas b={b} besar />}
    </div>
  );
}

/** Panel info ala Finder (kanan, atau kolom pratinjau di tampilan Kolom). */
function PanelInfoBerkas({
  b,
  judul,
  jumlah = 1,
  buka,
  unduh,
  bagikan,
}: {
  b: BerkasManajer;
  judul: string;
  jumlah?: number;
  buka: () => void;
  unduh: () => void;
  bagikan?: () => void;
}) {
  return (
    <div className="u-mb-info-isi">
      <GambarBesar b={b} onBuka={buka} />
      <b className="u-mb-info-nama">{b.nama}</b>
      <small className="u-mb-info-sub">
        {jenisAwam(b)} · {formatBytes(b.ukuran)}
        {jumlah > 1 ? ` · ${jumlah} dipilih` : ''}
      </small>
      <div className="u-mb-info-aksi">
        <Button variant="outline" size="sm" onClick={buka}>
          <Eye aria-hidden />
          Buka
        </Button>
        <Button variant="ghost" size="sm" iconOnly aria-label="Unduh" onClick={unduh}>
          <Download aria-hidden />
        </Button>
        {bagikan && (
          <Button variant="ghost" size="sm" iconOnly aria-label="Bagikan" onClick={bagikan}>
            <Share2 aria-hidden />
          </Button>
        )}
      </div>
      <dl className="u-mb-detail">
        <div>
          <dt>Jenis</dt>
          <dd>{jenisAwam(b)}</dd>
        </div>
        <div>
          <dt>Lokasi</dt>
          <dd>{b.folder ? `${judul} › ${b.folder.split('/').join(' › ')}` : judul}</dd>
        </div>
        {b.dibuat_at && (
          <div>
            <dt>Diunggah</dt>
            <dd>{formatDate(b.dibuat_at, 'long')}</dd>
          </div>
        )}
        {b.diubah_at && b.diubah_at !== b.dibuat_at && (
          <div>
            <dt>Diubah</dt>
            <dd>{formatDate(b.diubah_at, 'long')}</dd>
          </div>
        )}
        {b.pemilik && (
          <div>
            <dt>Pemilik</dt>
            <dd>{b.pemilik}</dd>
          </div>
        )}
        {b.periode && (
          <div>
            <dt>Periode</dt>
            <dd>{namaPeriode(b.periode)}</dd>
          </div>
        )}
        {b.terenkripsi !== undefined && (
          <div>
            <dt>Keamanan</dt>
            <dd>{b.terenkripsi ? 'Terenkripsi' : 'Tidak dienkripsi'}</dd>
          </div>
        )}
        {b.lihat && (
          <div>
            <dt>Bisa dilihat</dt>
            <dd>{labelLihatBerkas(b.lihat)}</dd>
          </div>
        )}
        {typeof b.jumlah_unduh === 'number' && (
          <div>
            <dt>Diunduh</dt>
            <dd>{b.jumlah_unduh}×</dd>
          </div>
        )}
        {b.keterangan && (
          <div>
            <dt>Keterangan</dt>
            <dd>{b.keterangan}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

// ================================================================ ManajerBerkas

type Sasaran = { jenis: 'folder'; f: FolderBerkas } | { jenis: 'berkas'; b: BerkasManajer } | { jenis: 'kosong' };
type DialogManajer =
  | null
  | { jenis: 'folder-baru' }
  | { jenis: 'folder-nama'; f: FolderBerkas }
  | { jenis: 'pindah'; berkas: BerkasManajer[]; f?: FolderBerkas; salin?: boolean }
  | { jenis: 'hapus'; berkas: BerkasManajer[]; f?: FolderBerkas }
  | { jenis: 'bagikan'; sasaran: SasaranBagi }
  | { jenis: 'baru'; tipe: JenisBerkasBaru }
  | { jenis: 'periode'; berkas: BerkasManajer[] }
  | { jenis: 'lihat'; b?: BerkasManajer; f?: FolderBerkas }
  | { jenis: 'kebijakan' };
const TIPE_SERET = 'application/x-unipo-berkas';
/** Peristiwa React dari portal (menu, dialog) ikut naik ke induk; abaikan yang bukan dari elemen ini. */
const dariSini = (e: React.SyntheticEvent) => e.currentTarget.contains(e.target as Node);

/** Diberikan ManajerBerkas ke `samping` (mis. DaftarDrive di DriveBerkas). */
export interface OpsiSampingBerkas {
  /** Sidebar dalam mode ikon saja. */
  ringkas: boolean;
  /** Pintasan "Terbaru" ruang aktif. */
  terbaru: { aktif: boolean; onPilih: () => void };
  /** Lepas berkas/folder yang diseret ke ruang lain (drive): disalin ke akar ruang itu. */
  lepasKeRuang: (tujuan: TujuanRuangBerkas & { label: string }, e: React.DragEvent) => void;
  /** Apakah seretan ini bisa dilepas ke ruang lain. */
  bisaLepas: (e: React.DragEvent) => boolean;
}

export interface ManajerBerkasProps {
  /** Ruang folder per aplikasi/modul (mis. "arsip"); kosong = umum. Berkas baru juga diberi modul ini. */
  modul?: string;
  /**
   * Ruang bersama unit (mis. "baak", "bauk", "sdm", "lpm", "pmb", "lppm", "humas", kode fakultas/prodi): semua anggota
   * unit melihat isinya. Hak tulis dan kelola mengikuti izin unit pemanggil (GET /v1/berkas/unit).
   */
  unit?: string;
  /** UUID folder yang dibagikan ke saya (dari GET /v1/berkas/dibagikan): hanya lihat, unduh, dan salin ke ruang sendiri. */
  bagi?: string;
  /** Tampilkan pilihan periode akademik untuk mengelompokkan berkas (bawaan true). */
  periode?: boolean;
  /** Periode yang dipilih pertama kali: kode m_tahun (mis. "20251"), "tanpa", atau null = semua periode. */
  periodeAwal?: string | null;
  /** Bagikan berkas dan folder ke orang, unit, atau tautan publik (bawaan true). */
  bolehBagikan?: boolean;
  /** Kategori berkas yang diunggah (bawaan "dokumen"). */
  kategori?: string;
  /** Folder yang dibuka pertama kali (null = folder utama). */
  folderAwal?: string | null;
  /** Folder terkendali; pasangkan dengan onFolderChange, mis. untuk menyimpan folder di URL. */
  folder?: string | null;
  onFolderChange?: (folder: string | null) => void;
  /** Tampilan awal bila pengguna belum pernah memilih: ikon (= 'grid'), daftar, kolom, atau galeri. Pilihan pengguna diingat. */
  tampilanAwal?: 'grid' | TampilanBerkas;
  /** Kunci localStorage preferensi tampilan/urut/kelompok/sidebar. `false` = tidak diingat. Bawaan sama untuk semua Kelola berkas. */
  kunciPreferensi?: string | false;
  /** Ekstensi yang diterima saat unggah, mis. ".pdf,.docx". Dicek juga oleh server. */
  accept?: string;
  bolehUnggah?: boolean;
  bolehHapus?: boolean;
  /** Buat, ganti nama, pindah folder dan berkas. */
  bolehKelola?: boolean;
  /** Mode pemilih: tampilkan tombol "Pakai" untuk berkas terpilih. */
  pilih?: 'satu' | 'banyak';
  onPilih?: (berkas: BerkasManajer[]) => void;
  labelPilih?: string;
  /** Ganti pratinjau bawaan saat berkas dibuka. */
  onBuka?: (berkas: BerkasManajer) => void;
  /** Nama folder utama di pohon dan breadcrumb. */
  judul?: string;
  /** Tinggi komponen (bawaan 36rem). */
  tinggi?: number | string;
  /**
   * Isi panel samping pengganti pohon folder, mis. daftar drive di DriveBerkas. Menerima pohon folder ruang aktif
   * untuk ditaruh di bawah drive terpilih, dan `opsi` (mode ringkas, pintasan Terbaru, lepas seretan ke drive lain).
   * Di layar sempit tampil di laci "Drive & folder".
   */
  samping?: (folder: React.ReactNode, opsi: OpsiSampingBerkas) => React.ReactNode;
  className?: string;
}

/**
 * Manajer berkas modern di atas /v1/berkas: pohon folder dan subfolder, tampilan kisi/daftar, seret file atau folder dari
 * komputer untuk mengunggah (bertahap otomatis untuk file besar), seret berkas ke folder untuk memindah, cari, filter
 * jenis, urutkan, pilih banyak, ganti nama, pindah, pratinjau, unduh, dan hapus (ke sampah; hapus permanen hanya admin).
 */
export function ManajerBerkas({
  modul,
  unit,
  bagi,
  periode: tampilPeriode = true,
  periodeAwal = null,
  bolehBagikan: bolehBagikanProp = true,
  kategori = 'dokumen',
  folderAwal = null,
  folder: folderProp,
  onFolderChange,
  tampilanAwal = 'grid',
  kunciPreferensi = KUNCI_PREF_BERKAS,
  accept,
  bolehUnggah: bolehUnggahProp = true,
  bolehHapus: bolehHapusProp = true,
  bolehKelola: bolehKelolaProp = true,
  pilih,
  onPilih,
  labelPilih,
  onBuka,
  judul: judulProp,
  tinggi = '36rem',
  samping,
  className,
}: ManajerBerkasProps) {
  const siakad = useSiakad();
  const aksi = useAksiBerkas(modul, unit);
  const { data: info } = useInfoBerkas(bagi ? undefined : unit);
  const ruangOpsi: RuangBerkasOpsi = React.useMemo(() => ({ modul, unit, bagi }), [modul, unit, bagi]);
  const [periode, setPeriode] = React.useState<string | null>(periodeAwal);
  const pohonQ = useFolderBerkas(modul, { unit, bagi, periode });
  const periodeQ = usePeriodeBerkas(ruangOpsi, tampilPeriode);
  const kebijakanQ = useKebijakanBerkas(unit, !bagi);
  const unitQ = useUnitBerkas(false);
  const unitIni = unit ? unitQ.data?.unit.find((u) => u.kode === unit) : undefined;
  const judul = judulProp ?? (unit ? (unitIni ? `Berkas ${unitIni.singkatan || unitIni.nama}` : `Berkas ${unit.toUpperCase()}`) : bagi ? 'Dibagikan ke saya' : 'Berkas saya');
  const akses = pohonQ.data?.ruang?.akses ?? (bagi ? 'bagi' : unit ? (unitIni?.akses ?? 'anggota') : 'pemilik');
  // Folder bersama hanya bisa dilihat, diunduh, dan disalin; anggota unit tidak bisa menghapus folder unit.
  // Pembaca unit (mahasiswa/dosen/tendik yang terdaftar di unit) hanya bisa melihat dan mengunduh.
  const pembaca = akses === 'pembaca';
  const bolehUnggah = bolehUnggahProp && !bagi && !pembaca;
  const bolehKelola = bolehKelolaProp && !bagi && !pembaca;
  const bolehHapus = bolehHapusProp && !bagi && !pembaca;
  const bolehKelolaRuang = bolehKelola && akses !== 'anggota';
  // Hapus per berkas: pengelola ruang/pemilik ruang pribadi semua berkas; anggota unit hanya yang ia unggah. Berkas arsip
  // institusi (SK, sertifikat) tidak punya pemilik, jadi pengunggahnya tidak bisa menghapus (server juga menolak).
  const saya = useAkunSaya({ foto: false }).data?.akun?.username ?? null;
  const bisaHapus = (b: BerkasManajer) => bolehHapus && (akses === 'pemilik' || akses === 'kelola' || (akses === 'anggota' && !!saya && b.pemilik === saya));
  const bolehDihapus = (daftar: BerkasManajer[]) => daftar.filter(bisaHapus);
  const masaSampah = info?.batas_unggah?.sampah_hari ?? null;
  const teksMasaSampah = masaSampah ? ` selama ${masaSampah} hari` : '';
  const bolehBagikan = bolehBagikanProp && !bagi && !pembaca;
  // Atur siapa yang bisa melihat: pengelola unit (semua pilihan) dan staf unit (pengelola/staf saja).
  const bolehAturLihat = Boolean(unit) && !bagi && (akses === 'kelola' || akses === 'anggota');
  const enkripsiEfektif = kebijakanQ.data?.efektif ?? null;
  const [enkripsiUnggah, setEnkripsiUnggah] = React.useState(false);
  const papan = usePapanBerkas();
  const akarBagi = bagi ? (pohonQ.data?.ruang?.batas ?? null) : null;
  const [folderDalam, setFolderDalam] = React.useState<string | null>(folderAwal);
  const folderPilih = folderProp !== undefined ? folderProp : folderDalam;
  const folder = folderPilih ?? akarBagi;
  // Pintasan "Terbaru": semua berkas ruang ini tanpa memandang folder, terbaru dulu.
  const [terbaru, setTerbaru] = React.useState(false);
  // Riwayat navigasi ‹ › ala Finder.
  type Lokasi = { folder: string | null; terbaru: boolean };
  const [riwayat, setRiwayat] = React.useState<{ daftar: Lokasi[]; i: number }>(() => ({ daftar: [{ folder: folderPilih ?? null, terbaru: false }], i: 0 }));
  const terapkanLokasi = React.useCallback(
    (l: Lokasi) => {
      setTerbaru(l.terbaru);
      setFolderDalam(l.folder);
      onFolderChange?.(l.folder);
    },
    [onFolderChange],
  );
  const pergi = React.useCallback(
    (l: Lokasi) => {
      terapkanLokasi(l);
      setRiwayat((r) => {
        const kini = r.daftar[r.i];
        if (kini && kini.folder === l.folder && kini.terbaru === l.terbaru) return r;
        return { daftar: [...r.daftar.slice(0, r.i + 1), l].slice(-50), i: Math.min(r.i + 1, 49) };
      });
    },
    [terapkanLokasi],
  );
  const buka = React.useCallback((f: string | null) => pergi({ folder: f, terbaru: false }), [pergi]);
  const bisaMundur = riwayat.i > 0;
  const bisaMaju = riwayat.i < riwayat.daftar.length - 1;
  const langkah = (d: -1 | 1) => {
    const i = riwayat.i + d;
    const l = riwayat.daftar[i];
    if (!l) return;
    setRiwayat((r) => ({ ...r, i }));
    terapkanLokasi(l);
  };

  // Preferensi tampilan (diingat per pengguna di peramban).
  const prefAwal = React.useMemo<Partial<PrefBerkas>>(() => (kunciPreferensi ? bacaPrefBerkas(kunciPreferensi) : {}), [kunciPreferensi]);
  const [tampilan, setTampilan] = React.useState<TampilanBerkas>(() => prefAwal.tampilan ?? (tampilanAwal === 'grid' ? 'ikon' : tampilanAwal));
  const [urut, setUrut] = React.useState<UrutKolom>(() => prefAwal.urut ?? PREF_BERKAS_BAWAAN.urut);
  const [kelompok, setKelompok] = React.useState<KelompokBerkas>(() => prefAwal.kelompok ?? PREF_BERKAS_BAWAAN.kelompok);
  const [modeSamping, setModeSamping] = React.useState<PrefBerkas['samping']>(() => prefAwal.samping ?? PREF_BERKAS_BAWAAN.samping);
  const [lebarSamping, setLebarSamping] = React.useState(() => prefAwal.lebar ?? PREF_BERKAS_BAWAAN.lebar);
  const [panelInfo, setPanelInfo] = React.useState(() => prefAwal.info ?? PREF_BERKAS_BAWAAN.info);
  React.useEffect(() => {
    if (kunciPreferensi) simpanPrefBerkas({ tampilan, urut, kelompok, samping: modeSamping, lebar: lebarSamping, info: panelInfo }, kunciPreferensi);
  }, [kunciPreferensi, tampilan, urut, kelompok, modeSamping, lebarSamping, panelInfo]);
  const urutServer: UrutServer = terbaru ? 'baru' : urutKeServer(urut);
  // Lebar komponen (bukan layar): di bawah 640px sidebar menjadi laci.
  const refAkar = React.useRef<HTMLDivElement>(null);
  const refKolom = React.useRef<HTMLDivElement>(null);
  const [sempit, setSempit] = React.useState(false);
  React.useEffect(() => {
    const el = refAkar.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setSempit((e?.contentRect.width ?? 1000) < 640));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  React.useEffect(() => {
    const el = refKolom.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [folder, tampilan]);
  const [q, setQ] = React.useState('');
  const [kata, setKata] = React.useState('');
  const [jenis, setJenis] = React.useState<JenisBerkas | 'semua'>('semua');
  const [halaman, setHalaman] = React.useState(1);
  const [isi, setIsi] = React.useState<BerkasManajer[]>([]);
  const [total, setTotal] = React.useState(0);
  const [adaLagi, setAdaLagi] = React.useState(false);
  const [memuat, setMemuat] = React.useState(true);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [nonce, setNonce] = React.useState(0);
  const [terpilih, setTerpilih] = React.useState<Set<string>>(() => new Set());
  const jangkar = React.useRef<string | null>(null);
  const [antrean, setAntrean] = React.useState<ItemUnggah[]>([]);
  const [antreanTutup, setAntreanTutup] = React.useState(false);
  const [seretLuar, setSeretLuar] = React.useState(false);
  const [sasaranLepas, setSasaranLepas] = React.useState<string | null>(null);
  const [panelPohon, setPanelPohon] = React.useState(false);
  const [dialog, setDialog] = React.useState<DialogManajer>(null);
  const [gantiNama, setGantiNama] = React.useState<BerkasManajer | null>(null);
  const [pratinjau, setPratinjau] = React.useState<BerkasManajer | null>(null);
  const [pesan, setPesan] = React.useState<{ nada: 'sukses' | 'galat'; teks: string; aksi?: { label: string; jalan: () => void } } | null>(null);
  const sasaranMenu = React.useRef<Sasaran>({ jenis: 'kosong' });
  const [menuSasaran, setMenuSasaran] = React.useState<Sasaran>({ jenis: 'kosong' });
  const inputFile = React.useRef<HTMLInputElement>(null);
  const inputFolder = React.useRef<HTMLInputElement>(null);
  const hitungSeret = React.useRef(0);

  const daftarFolder = pohonQ.data?.folder ?? [];
  const pohon = React.useMemo(() => bangunPohon(daftarFolder), [daftarFolder]);
  const petaFolder = React.useMemo(() => new Map(daftarFolder.map((f) => [f.path, f])), [daftarFolder]);
  const folderIni = folder ? petaFolder.get(folder) : undefined;
  const mencari = kata !== '';

  // Folder yang ditampilkan: anak langsung, atau saat mencari, semua subfolder yang namanya cocok.
  const subfolder = React.useMemo(() => {
    const k = kata.toLowerCase();
    if (terbaru || jenis !== 'semua') return [];
    const r = daftarFolder.filter((f) => (mencari ? (!folder || f.path.startsWith(`${folder}/`)) && f.nama.toLowerCase().includes(k) : f.induk === folder));
    return urutkanFolder(r, urut);
  }, [daftarFolder, folder, kata, mencari, urut, jenis, terbaru]);

  React.useEffect(() => {
    const t = setTimeout(() => setKata(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  React.useEffect(() => {
    setHalaman(1);
    setTerpilih(new Set());
  }, [folder, kata, jenis, urutServer, modul, unit, bagi, periode, terbaru]);

  // Daftar berkas di folder ini (atau hasil pencarian di folder ini beserta subfoldernya).
  React.useEffect(() => {
    const ctrl = new AbortController();
    setMemuat(true);
    setGalat(null);
    if (bagi && !folder) {
      // Akar folder bersama belum diketahui (pohon masih dimuat).
      if (pohonQ.error) {
        setGalat(pesanGalat(pohonQ.error));
        setMemuat(false);
      }
      return () => ctrl.abort();
    }
    const query: Record<string, string | number | undefined> = {
      ...paramRuang(ruangOpsi),
      periode: periode || undefined,
      q: kata || undefined,
      jenis: jenis === 'semua' ? undefined : jenis,
      urut: urutServer,
      page: halaman,
      per_page: 60,
    };
    if (terbaru) query.dalam = akarBagi ?? undefined;
    else if (mencari) query.dalam = folder ?? undefined;
    else query.folder = folder ?? '/';
    siakad
      .request<BerkasManajer[]>({ method: 'GET', path: '/v1/berkas', query }, { signal: ctrl.signal })
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : [];
        setIsi((x) => (halaman === 1 ? data : [...x, ...data.filter((d) => !x.some((y) => y.id === d.id))]));
        const meta = r.meta as { page?: number; total?: number; total_pages?: number } | undefined;
        setTotal(meta?.total ?? data.length);
        setAdaLagi(meta?.total_pages !== undefined ? (meta.page ?? halaman) < meta.total_pages : false);
      })
      .catch((e) => !ctrl.signal.aborted && setGalat(pesanGalat(e)))
      .finally(() => !ctrl.signal.aborted && setMemuat(false));
    return () => ctrl.abort();
  }, [siakad, folder, kata, mencari, jenis, urutServer, halaman, ruangOpsi, periode, nonce, bagi, pohonQ.error, terbaru, akarBagi]);

  // Segarkan saat aksi lain memanggil invalidateSiakad('berkas-isi').
  useSaatInvalidasi('berkas-isi', () => {
    setHalaman(1);
    setNonce((n) => n + 1);
  });

  React.useEffect(() => {
    if (!pesan) return;
    const t = setTimeout(() => setPesan(null), pesan.aksi ? 8000 : 5000);
    return () => clearTimeout(t);
  }, [pesan]);

  // ---------------------------------------------------------------- unggah
  const berjalan = React.useRef(0);
  const antreanRef = React.useRef(antrean);
  antreanRef.current = antrean;
  const ubahItem = (kunci: string, ubah: Partial<ItemUnggah>) => setAntrean((a) => a.map((x) => (x.kunci === kunci ? { ...x, ...ubah } : x)));

  const pompa = React.useCallback(
    (infoServer: InfoBerkas) => {
      while (berjalan.current < 2) {
        const berikut = antreanRef.current.find((x) => x.status === 'antre');
        if (!berikut) break;
        berjalan.current++;
        const ctrl = new AbortController();
        antreanRef.current = antreanRef.current.map((x) => (x.kunci === berikut.kunci ? { ...x, status: 'unggah', ctrl } : x));
        ubahItem(berikut.kunci, { status: 'unggah', ctrl });
        unggahKeBerkas(
          siakad,
          infoServer,
          berikut.file,
          { kategori, modul, unit, periode: periode ?? undefined, enkripsi: enkripsiEfektif === 'opsional' ? enkripsiUnggah : undefined, folder: berikut.folder ?? undefined },
          (persen) => ubahItem(berikut.kunci, { persen }),
          ctrl.signal,
        )
          .then(() => {
            ubahItem(berikut.kunci, { status: 'selesai', persen: 100 });
            aksi.segarkan();
            invalidateSiakad('berkas-info'); // perbarui bar kuota
          })
          .catch((e) => ubahItem(berikut.kunci, ctrl.signal.aborted ? { status: 'batal' } : { status: 'gagal', galat: pesanGalat(e) }))
          .finally(() => {
            berjalan.current--;
            setTimeout(() => pompa(infoServer), 0);
          });
      }
    },
    [siakad, kategori, modul, unit, periode, enkripsiEfektif, enkripsiUnggah, aksi],
  );

  const ekstensiBoleh = React.useMemo(() => {
    const dari = accept
      ? accept
          .split(',')
          .map((x) => x.trim().replace(/^\./, '').toLowerCase())
          .filter((x) => x && !x.includes('/'))
      : [];
    return dari.length ? dari : (info?.ekstensi ?? []);
  }, [accept, info]);

  const tambahUnggah = React.useCallback(
    async (file: Array<{ file: File; sub: string | null }>, tujuan: string | null) => {
      if (!bolehUnggah || !file.length) return;
      const infoServer = info ?? (await siakad.request<InfoBerkas>({ method: 'GET', path: '/v1/berkas/info', query: unit ? { unit } : undefined })).data;
      // Kuota: jumlahkan dengan antrean yang belum selesai supaya satu kali seret banyak file tidak melewati sisa kuota.
      let antreanByte = antreanRef.current.filter((x) => x.status === 'antre' || x.status === 'unggah').reduce((a, x) => a + x.file.size, 0);
      const baru: ItemUnggah[] = file.map(({ file: f, sub }) => {
        const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
        const path = sub ? gabung(tujuan, sub) : tujuan;
        const kuota = periksaUnggahan({ ...infoServer, ekstensi: [] }, f, antreanByte);
        const salah =
          ekstensiBoleh.length && !ekstensiBoleh.includes(ext)
            ? `Jenis .${ext} tidak diizinkan.`
            : f.size > infoServer.maks_byte
              ? `Melebihi batas ${formatBytes(infoServer.maks_byte)}.`
              : kuota
                ? kuota
                : path && path.length > MAKS_PATH_FOLDER
                  ? 'Path folder terlalu panjang.'
                  : null;
        if (!salah) antreanByte += f.size;
        return { kunci: `u${++nomorUnggah}`, file: f, folder: path, persen: 0, status: salah ? 'gagal' : 'antre', galat: salah ?? undefined };
      });
      antreanRef.current = [...antreanRef.current, ...baru];
      setAntrean(antreanRef.current);
      setAntreanTutup(false);
      pompa(infoServer);
    },
    [bolehUnggah, info, siakad, ekstensiBoleh, pompa],
  );

  const ulangi = (it: ItemUnggah) => {
    if (!info) return;
    antreanRef.current = antreanRef.current.map((x) => (x.kunci === it.kunci ? { ...x, status: 'antre', persen: 0, galat: undefined } : x));
    setAntrean(antreanRef.current);
    pompa(info);
  };

  // ---------------------------------------------------------------- pilihan
  // Urutan tampil: urut di peramban (jenis tidak didukung server) lalu kelompok; pilihan Shift mengikuti urutan ini.
  const kelompokEfektif: KelompokBerkas = terbaru && kelompok === 'tidak' ? 'tanggal' : kelompok;
  const isiUrut = React.useMemo(() => urutkanBerkas(isi, urut), [isi, urut]);
  const kelompokIsi = React.useMemo(() => kelompokkanBerkas(isiUrut, kelompokEfektif), [isiUrut, kelompokEfektif]);
  const isiTampil = React.useMemo(() => kelompokIsi.flatMap((k) => k.isi), [kelompokIsi]);
  const semuaId = isiTampil.map((b) => b.id);
  const berkasTerpilih = isi.filter((b) => terpilih.has(b.id));
  const klikBerkas = (b: BerkasManajer, e: React.MouseEvent | React.KeyboardEvent) => {
    setTerpilih((t) => {
      if (e.shiftKey && jangkar.current && pilih !== 'satu') {
        const a = semuaId.indexOf(jangkar.current);
        const z = semuaId.indexOf(b.id);
        const n = new Set(t);
        semuaId.slice(Math.min(a, z), Math.max(a, z) + 1).forEach((id) => n.add(id));
        return n;
      }
      if ((e.ctrlKey || e.metaKey) && pilih !== 'satu') {
        const n = new Set(t);
        if (n.has(b.id)) n.delete(b.id);
        else n.add(b.id);
        jangkar.current = b.id;
        return n;
      }
      jangkar.current = b.id;
      return new Set([b.id]);
    });
  };
  const centang = (b: BerkasManajer) =>
    setTerpilih((t) => {
      const n = pilih === 'satu' ? new Set<string>() : new Set(t);
      if (t.has(b.id)) n.delete(b.id);
      else n.add(b.id);
      jangkar.current = b.id;
      return n;
    });

  const bukaBerkas = (b: BerkasManajer) => {
    if (pilih && onPilih && pilih === 'satu') return onPilih([b]);
    if (onBuka) return onBuka(b);
    setPratinjau(b);
  };

  const unduh = (b: BerkasManajer) => aksi.unduh(b).catch((e) => setPesan({ nada: 'galat', teks: pesanGalat(e) }));

  // ---------------------------------------------------------------- papan klip (salin, potong, tempel)
  const asalIni = { unit, modul, label: judul };
  const samaRuang = (a: { unit?: string; modul?: string }) => (a.unit ?? '') === (unit ?? '') && (unit ? true : (a.modul ?? '') === (modul ?? ''));
  const tujuanIni = { unit: unit ?? null, modul };
  const keKlip = (mode: 'salin' | 'potong', item: { berkas?: BerkasManajer[]; f?: FolderBerkas }) => {
    if (mode === 'potong' && !bolehKelola) return;
    setelPapanBerkas({ mode, berkas: item.berkas ?? [], folder: item.f ?? null, asal: asalIni });
    const n = item.f ? `folder ${item.f.nama}` : item.berkas && item.berkas.length > 1 ? `${item.berkas.length} berkas` : (item.berkas?.[0]?.nama ?? '');
    setPesan({ nada: 'sukses', teks: `${mode === 'salin' ? 'Disalin' : 'Dipotong'}: ${n}. Buka folder tujuan lalu pilih Tempel (Ctrl+V).` });
  };
  const bisaTempel = Boolean(papan) && bolehUnggah;
  const tempel = async (tujuan: string | null) => {
    const p = papan;
    if (!p || !bolehUnggah) return;
    const sama = samaRuang(p.asal);
    const ke = sama ? undefined : tujuanIni;
    const label = tujuan ? namaDari(tujuan) : judul;
    try {
      if (p.folder) {
        const f = p.folder;
        if (sama && (tujuan === f.path || (tujuan && tujuan.startsWith(`${f.path}/`)))) throw new Error('Folder tidak bisa ditempel ke dalam dirinya sendiri.');
        if (sama && p.mode === 'potong') {
          if (indukDari(f.path) !== tujuan) await aksi.ubahFolder(f.path, { induk_baru: tujuan });
        } else {
          const r = await aksi.salinFolder(f.path, tujuan, ke, { unit: p.asal.unit, modul: p.asal.modul });
          if (p.mode === 'potong') await aksi.hapusFolderDi(f.path, { unit: p.asal.unit, modul: p.asal.modul });
          void r;
        }
        setPesan({ nada: 'sukses', teks: `Folder ${f.nama} ${p.mode === 'potong' ? 'dipindah' : 'disalin'} ke ${label}.` });
      } else if (p.berkas.length) {
        const id = p.berkas.map((b) => b.id);
        const r = p.mode === 'potong' ? await aksi.pindahBerkas(id, tujuan, ke) : await aksi.salinBerkas(id, tujuan, ke);
        const ok = 'dipindah' in r ? r.dipindah.length : r.disalin.length;
        setPesan(
          r.gagal.length
            ? { nada: 'galat', teks: `${ok} berkas berhasil, ${r.gagal.length} gagal: ${r.gagal[0].pesan}` }
            : { nada: 'sukses', teks: `${ok} berkas ${p.mode === 'potong' ? 'dipindah' : 'disalin'} ke ${label}.` },
        );
      }
      if (p.mode === 'potong') setelPapanBerkas(null);
      if (!sama) invalidateSiakad('berkas-isi');
    } catch (e) {
      setPesan({ nada: 'galat', teks: pesanGalat(e) });
    }
  };
  const duplikat = async (berkas: BerkasManajer[]) => {
    try {
      const r = await aksi.salinBerkas(
        berkas.map((b) => b.id),
        folder,
      );
      setPesan(r.gagal.length ? { nada: 'galat', teks: `${r.gagal.length} berkas gagal disalin: ${r.gagal[0].pesan}` } : { nada: 'sukses', teks: `${r.disalin.length} salinan dibuat.` });
    } catch (e) {
      setPesan({ nada: 'galat', teks: pesanGalat(e) });
    }
  };
  const ubahEnkripsi = async (b: BerkasManajer, aktif: boolean) => {
    try {
      await aksi.enkripsi(b.id, aktif);
      setPesan({ nada: 'sukses', teks: aktif ? `${b.nama} sekarang disimpan terenkripsi.` : `Enkripsi ${b.nama} dibuka.` });
    } catch (e) {
      setPesan({ nada: 'galat', teks: pesanGalat(e) });
    }
  };
  const buatBerkas = async (file: File) => {
    const infoServer = info ?? (await siakad.request<InfoBerkas>({ method: 'GET', path: '/v1/berkas/info' })).data;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (ekstensiBoleh.length && !ekstensiBoleh.includes(ext)) throw new Error(`Jenis .${ext} tidak diizinkan di penyimpanan ini.`);
    await unggahKeBerkas(siakad, infoServer, file, {
      kategori,
      modul,
      unit,
      periode: periode ?? undefined,
      enkripsi: enkripsiEfektif === 'opsional' ? enkripsiUnggah : undefined,
      folder: folder ?? undefined,
    });
    aksi.segarkan();
    setPesan({ nada: 'sukses', teks: `${file.name} dibuat.` });
  };
  const opsiBaru = (Object.keys(BERKAS_BARU) as JenisBerkasBaru[]).filter((k) => !ekstensiBoleh.length || ekstensiBoleh.includes(k));

  // ---------------------------------------------------------------- seret
  const seretDalam = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes(TIPE_SERET);
  const seretFile = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes('Files');

  const mulaiSeret = (e: React.DragEvent, item: { berkas?: BerkasManajer; f?: FolderBerkas }) => {
    if (!bolehKelola) return e.preventDefault();
    let id: string[] = [];
    if (item.berkas) {
      id = terpilih.has(item.berkas.id) ? [...terpilih] : [item.berkas.id];
      if (!terpilih.has(item.berkas.id)) setTerpilih(new Set([item.berkas.id]));
    }
    e.dataTransfer.setData(TIPE_SERET, JSON.stringify({ id, folder: item.f?.path ?? null, asal: { unit: unit ?? null, modul: modul ?? null } }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const lepasKe = async (tujuan: string | null, e: React.DragEvent) => {
    setSasaranLepas(null);
    setSeretLuar(false);
    hitungSeret.current = 0;
    if (seretDalam(e)) {
      try {
        const d = JSON.parse(e.dataTransfer.getData(TIPE_SERET) || '{}') as { id?: string[]; folder?: string | null };
        if (d.folder) {
          if (d.folder === tujuan || indukDari(d.folder) === tujuan || (tujuan && tujuan.startsWith(`${d.folder}/`))) return;
          await aksi.ubahFolder(d.folder, { induk_baru: tujuan });
          setPesan({ nada: 'sukses', teks: `Folder ${namaDari(d.folder)} dipindah ke ${tujuan ?? judul}.` });
        } else if (d.id?.length) {
          const r = await aksi.pindahBerkas(d.id, tujuan);
          setTerpilih(new Set());
          setPesan(
            r.gagal.length
              ? { nada: 'galat', teks: `${r.dipindah.length} berkas dipindah, ${r.gagal.length} gagal: ${r.gagal[0].pesan}` }
              : { nada: 'sukses', teks: `${r.dipindah.length} berkas dipindah ke ${tujuan ?? judul}.` },
          );
        }
      } catch (err) {
        setPesan({ nada: 'galat', teks: pesanGalat(err) });
      }
      return;
    }
    if (seretFile(e) && bolehUnggah) void tambahUnggah(await fileDariDrop(e.dataTransfer), tujuan);
  };

  /** Seret ke drive lain di sidebar = salin ke akar ruang itu (seperti Finder menyalin antar disk). */
  const lepasKeRuang = async (t: TujuanRuangBerkas & { label: string }, e: React.DragEvent) => {
    setSasaranLepas(null);
    if (!seretDalam(e)) return;
    try {
      const d = JSON.parse(e.dataTransfer.getData(TIPE_SERET) || '{}') as { id?: string[]; folder?: string | null };
      if ((t.unit ?? null) === (unit ?? null) && (unit || (t.modul ?? '') === (modul ?? ''))) return;
      const ke: TujuanRuangBerkas = { unit: t.unit, modul: t.modul };
      if (d.folder) {
        const r = await aksi.salinFolder(d.folder, null, ke);
        setPesan({ nada: 'sukses', teks: `Folder ${namaDari(d.folder)} disalin (${r.berkas_disalin} berkas) ke ${t.label}.` });
      } else if (d.id?.length) {
        const r = await aksi.salinBerkas(d.id, null, ke);
        setPesan(
          r.gagal.length
            ? { nada: 'galat', teks: `${r.disalin.length} berkas disalin, ${r.gagal.length} gagal: ${r.gagal[0].pesan}` }
            : { nada: 'sukses', teks: `${r.disalin.length} berkas disalin ke ${t.label}.` },
        );
      }
      invalidateSiakad('berkas-info');
    } catch (err) {
      setPesan({ nada: 'galat', teks: pesanGalat(err) });
    }
  };

  const propsLepasFolder = (f: FolderBerkas) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!(seretDalam(e) && bolehKelola) && !(seretFile(e) && bolehUnggah)) return;
      e.preventDefault();
      e.stopPropagation();
      setSasaranLepas(f.path);
    },
    onDragLeave: () => setSasaranLepas((s) => (s === f.path ? null : s)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      void lepasKe(f.path, e);
    },
  });

  // ---------------------------------------------------------------- menu konteks
  const entriMenu = (s: Sasaran): MenuEntry[] => {
    const sep = { type: 'separator' } as MenuEntry;
    if (s.jenis === 'folder') {
      const f = s.f;
      return [
        { label: 'Buka', icon: <FolderOpen aria-hidden />, onSelect: () => buka(f.path) },
        ...(bolehBagikan && bolehKelolaRuang
          ? ([{ label: 'Bagikan atau buat tautan…', icon: <Share2 aria-hidden />, onSelect: () => setDialog({ jenis: 'bagikan', sasaran: { jenis: 'folder', path: f.path, nama: f.nama, ruang: ruangOpsi } }) }] as MenuEntry[])
          : []),
        sep,
        { label: 'Salin', icon: <Copy aria-hidden />, shortcut: 'Ctrl+C', onSelect: () => keKlip('salin', { f }) },
        ...(bolehKelola ? ([{ label: 'Potong', icon: <Scissors aria-hidden />, shortcut: 'Ctrl+X', onSelect: () => keKlip('potong', { f }) }] as MenuEntry[]) : []),
        ...(bisaTempel ? ([{ label: 'Tempel ke folder ini', icon: <ClipboardPaste aria-hidden />, onSelect: () => void tempel(f.path) }] as MenuEntry[]) : []),
        ...(bolehKelola
          ? ([
              sep,
              { label: 'Ganti nama atau warna', icon: <Pencil aria-hidden />, shortcut: 'F2', onSelect: () => setDialog({ jenis: 'folder-nama', f }) },
              ...(bolehAturLihat && bolehKelolaRuang ? [{ label: 'Siapa yang bisa melihat…', icon: <Eye aria-hidden />, onSelect: () => setDialog({ jenis: 'lihat', f }) }] : []),
              { label: 'Pindahkan…', icon: <FolderInput aria-hidden />, onSelect: () => setDialog({ jenis: 'pindah', berkas: [], f }) },
              { label: 'Salin ke…', icon: <CopyPlus aria-hidden />, onSelect: () => setDialog({ jenis: 'pindah', berkas: [], f, salin: true }) },
            ] as MenuEntry[])
          : []),
        ...(bolehHapus && bolehKelolaRuang
          ? ([sep, { label: 'Hapus folder', icon: <Trash2 aria-hidden />, shortcut: 'Del', destructive: true, onSelect: () => setDialog({ jenis: 'hapus', berkas: [], f }) }] as MenuEntry[])
          : []),
      ];
    }
    if (s.jenis === 'berkas') {
      const b = s.b;
      const banyak = terpilih.has(b.id) && terpilih.size > 1 ? berkasTerpilih : [b];
      const satu = banyak.length === 1;
      return [
        ...(satu
          ? ([
              { label: pilih === 'satu' ? labelPilih || 'Pakai berkas ini' : 'Buka', icon: <Eye aria-hidden />, shortcut: 'Enter', onSelect: () => bukaBerkas(b) },
              ...(pilih === 'satu' ? [] : [{ label: 'Lihat cepat', icon: <Eye aria-hidden />, shortcut: 'Spasi', onSelect: () => setPratinjau(b) }]),
              { label: 'Lihat info', icon: <Info aria-hidden />, onSelect: () => (setTerpilih(new Set([b.id])), setPanelInfo(true)) },
              { label: 'Unduh', icon: <Download aria-hidden />, onSelect: () => void unduh(b) },
              ...(bolehBagikan ? [{ label: 'Bagikan atau buat tautan…', icon: <Share2 aria-hidden />, onSelect: () => setDialog({ jenis: 'bagikan', sasaran: { jenis: 'berkas', b } }) }] : []),
              ...(bolehAturLihat ? [{ label: 'Siapa yang bisa melihat…', icon: <Users aria-hidden />, onSelect: () => setDialog({ jenis: 'lihat', b }) }] : []),
            ] as MenuEntry[])
          : [{ type: 'label', label: `${banyak.length} berkas dipilih` } as MenuEntry]),
        sep,
        { label: 'Salin', icon: <Copy aria-hidden />, shortcut: 'Ctrl+C', onSelect: () => keKlip('salin', { berkas: banyak }) },
        ...(bolehKelola
          ? ([
              { label: 'Potong', icon: <Scissors aria-hidden />, shortcut: 'Ctrl+X', onSelect: () => keKlip('potong', { berkas: banyak }) },
              { label: satu ? 'Buat salinan' : `Buat ${banyak.length} salinan`, icon: <CopyPlus aria-hidden />, onSelect: () => void duplikat(banyak) },
              sep,
              ...(satu ? [{ label: 'Ganti nama', icon: <Pencil aria-hidden />, shortcut: 'F2', onSelect: () => setGantiNama(b) }] : []),
              { label: 'Pindahkan…', icon: <FolderInput aria-hidden />, onSelect: () => setDialog({ jenis: 'pindah', berkas: banyak }) },
              { label: 'Salin ke…', icon: <CopyPlus aria-hidden />, onSelect: () => setDialog({ jenis: 'pindah', berkas: banyak, salin: true }) },
              ...(tampilPeriode ? [{ label: 'Periode akademik…', icon: <CalendarRange aria-hidden />, onSelect: () => setDialog({ jenis: 'periode', berkas: banyak }) }] : []),
              ...(satu && enkripsiEfektif && (b.terenkripsi ? enkripsiEfektif !== 'wajib' : enkripsiEfektif !== 'mati')
                ? [
                    {
                      label: b.terenkripsi ? 'Buka enkripsi' : 'Enkripsi isi berkas',
                      icon: b.terenkripsi ? <LockOpen aria-hidden /> : <Lock aria-hidden />,
                      onSelect: () => void ubahEnkripsi(b, !b.terenkripsi),
                    },
                  ]
                : []),
            ] as MenuEntry[])
          : []),
        ...(bolehDihapus(banyak).length
          ? ([
              sep,
              {
                label: bolehDihapus(banyak).length > 1 ? `Pindahkan ${bolehDihapus(banyak).length} berkas ke Sampah` : 'Pindahkan ke Sampah',
                icon: <Trash2 aria-hidden />,
                shortcut: 'Del',
                destructive: true,
                onSelect: () => setDialog({ jenis: 'hapus', berkas: bolehDihapus(banyak) }),
              },
            ] as MenuEntry[])
          : []),
      ];
    }
    return [
      ...(bisaTempel ? ([{ label: `Tempel ${papan?.folder ? `folder ${papan.folder.nama}` : `${papan?.berkas.length} berkas`}`, icon: <ClipboardPaste aria-hidden />, shortcut: 'Ctrl+V', onSelect: () => void tempel(folder) }, sep] as MenuEntry[]) : []),
      ...entriBaru,
      ...(bolehUnggah ? ([{ label: 'Unggah folder', icon: <FolderUp aria-hidden />, onSelect: () => inputFolder.current?.click() }] as MenuEntry[]) : []),
      sep,
      ...(!bagi ? ([{ label: 'Keamanan berkas…', icon: <ShieldCheck aria-hidden />, onSelect: () => setDialog({ jenis: 'kebijakan' }) }] as MenuEntry[]) : []),
      { label: 'Segarkan', icon: <RotateCw aria-hidden />, onSelect: () => aksi.segarkan() },
    ];
  };

  /** Isi menu "Baru": folder, dokumen teks/catatan/CSV, dan unggah. */
  const entriBaru: MenuEntry[] = [
    ...(bolehKelola ? ([{ label: 'Folder baru', icon: <FolderPlus aria-hidden />, onSelect: () => setDialog({ jenis: 'folder-baru' }) }] as MenuEntry[]) : []),
    ...(bolehUnggah ? opsiBaru.map((t) => ({ label: BERKAS_BARU[t].label, icon: <FilePlus aria-hidden />, onSelect: () => setDialog({ jenis: 'baru', tipe: t }) })) : []),
    ...(bolehUnggah ? ([{ label: 'Unggah berkas', icon: <Upload aria-hidden />, onSelect: () => inputFile.current?.click() }] as MenuEntry[]) : []),
  ];

  const setelSasaran = (s: Sasaran) => (e: React.MouseEvent) => {
    void e;
    sasaranMenu.current = s;
  };

  // ---------------------------------------------------------------- keyboard di area isi
  const tombolIsi = (e: React.KeyboardEvent) => {
    const el = e.target as HTMLElement;
    if (el.closest('input, textarea, [role="menu"]')) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (mod && k === 'a' && pilih !== 'satu') {
      e.preventDefault();
      setTerpilih(new Set(semuaId));
    } else if (mod && (k === 'c' || k === 'x') && terpilih.size && el.closest('[data-folder]') === null) {
      e.preventDefault();
      keKlip(k === 'c' ? 'salin' : 'potong', { berkas: berkasTerpilih });
    } else if (mod && k === 'v' && bisaTempel) {
      e.preventDefault();
      void tempel(folder);
    } else if (e.key === 'Escape' && terpilih.size) {
      setTerpilih(new Set());
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && terpilih.size && bolehDihapus(berkasTerpilih).length) {
      e.preventDefault();
      setDialog({ jenis: 'hapus', berkas: bolehDihapus(berkasTerpilih) });
    } else if (e.key === 'F2' && terpilih.size === 1 && bolehKelola) {
      e.preventDefault();
      setGantiNama(berkasTerpilih[0] ?? null);
    } else if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key) && el.dataset.mbItem !== undefined) {
      // Navigasi menurut letak di layar: berlaku untuk ikon (kisi berkelompok), daftar, kolom, dan strip galeri.
      const wadah = el.closest('[data-mb-navigasi]') ?? e.currentTarget;
      const semua = Array.from(wadah.querySelectorAll<HTMLElement>('[data-mb-item]')).filter((x) => x.offsetParent !== null);
      const a = el.getBoundingClientRect();
      const ax = a.left + a.width / 2;
      const ay = a.top + a.height / 2;
      let ke: HTMLElement | undefined;
      let skor = Infinity;
      for (const x of semua) {
        if (x === el) continue;
        const r = x.getBoundingClientRect();
        const dx = r.left + r.width / 2 - ax;
        const dy = r.top + r.height / 2 - ay;
        const ok = e.key === 'ArrowRight' ? dx > 4 && Math.abs(dy) < a.height / 2 : e.key === 'ArrowLeft' ? dx < -4 && Math.abs(dy) < a.height / 2 : e.key === 'ArrowDown' ? dy > 4 : dy < -4;
        if (!ok) continue;
        const n = e.key === 'ArrowRight' || e.key === 'ArrowLeft' ? Math.abs(dx) : Math.abs(dy) * 1000 + Math.abs(dx);
        if (n < skor) {
          skor = n;
          ke = x;
        }
      }
      if (ke) {
        e.preventDefault();
        ke.focus();
        ke.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        const id = ke.dataset.id;
        if (id && !mod) {
          if (e.shiftKey && pilih !== 'satu' && jangkar.current) {
            const i = semuaId.indexOf(jangkar.current);
            const j = semuaId.indexOf(id);
            if (i >= 0 && j >= 0) setTerpilih(new Set(semuaId.slice(Math.min(i, j), Math.max(i, j) + 1)));
          } else {
            jangkar.current = id;
            setTerpilih(new Set([id]));
          }
        }
      }
    }
  };

  // ---------------------------------------------------------------- tampilan item
  /** ikon = kisi ala Finder, daftar = baris berkolom, kolom = Miller columns, strip = film strip galeri. */
  type Gaya = 'ikon' | 'daftar' | 'kolom' | 'strip';
  const adaPemilik = Boolean(unit) && isi.some((b) => b.pemilik);
  const tglFolder = (f: FolderBerkas) => f.terakhir_isi_at ?? f.dibuat_at ?? null;

  const kartuFolder = (f: FolderBerkas, gaya: Gaya, aktifKolom?: boolean) => {
    const isiLabel = [f.jumlah_subfolder ? `${f.jumlah_subfolder} folder` : null, `${f.total_berkas} berkas`].filter(Boolean).join(' · ');
    const umum = {
      'data-mb-item': '',
      tabIndex: 0,
      draggable: bolehKelola,
      title: f.nama,
      'data-aktif': aktifKolom ? '' : undefined,
      'data-sasaran': sasaranLepas === f.path ? '' : undefined,
      'data-potong': papan?.mode === 'potong' && papan.folder?.path === f.path && samaRuang(papan.asal) ? '' : undefined,
      onDragStart: (e: React.DragEvent) => mulaiSeret(e, { f }),
      onClick: (e: React.MouseEvent) => {
        if (dariSini(e) && !(e.target as HTMLElement).closest('.u-mb-aksi')) buka(f.path);
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (!dariSini(e) || e.target !== e.currentTarget) return;
        if (e.key === 'Enter') buka(f.path);
        if (e.key === 'F2' && bolehKelola) setDialog({ jenis: 'folder-nama', f });
        if (e.key === 'Delete' && bolehHapus && bolehKelolaRuang) setDialog({ jenis: 'hapus', berkas: [], f });
        if ((e.ctrlKey || e.metaKey) && ['c', 'x'].includes(e.key.toLowerCase())) {
          e.preventDefault();
          e.stopPropagation();
          keKlip(e.key.toLowerCase() === 'c' ? 'salin' : 'potong', { f });
        }
      },
      onContextMenu: (e: React.MouseEvent) => dariSini(e) && setelSasaran({ jenis: 'folder', f })(e),
      ...propsLepasFolder(f),
    };
    const tombolAksi = (
      <Menu
        trigger={
          <button type="button" className="u-mb-aksi" aria-label={`Aksi folder ${f.nama}`} onClick={(e) => e.stopPropagation()}>
            <Ellipsis aria-hidden />
          </button>
        }
        items={entriMenu({ jenis: 'folder', f })}
      />
    );
    if (gaya === 'daftar')
      return (
        <div key={`f:${f.path}`} role="row" className="u-mb-baris" data-folder="" aria-label={`Folder ${f.nama}`} {...umum}>
          <span role="gridcell" className="u-mb-baris-cek" />
          <span role="gridcell" className="u-mb-baris-nama">
            <IkonFolderWarna warna={f.warna} />
            <span>
              <b>
                {f.nama}
                {unit && <LencanaLihat lihat={f.lihat} />}
              </b>
              {mencari && f.induk && <small>{f.induk}</small>}
            </span>
          </span>
          <span role="gridcell" className="u-mb-baris-tgl">
            {tglFolder(f) ? formatDate(tglFolder(f)!, 'short') : '—'}
          </span>
          <span role="gridcell" className="u-mb-baris-ukuran">
            {f.total_berkas ? formatBytes(f.total_ukuran) : '—'}
          </span>
          <span role="gridcell" className="u-mb-baris-info">
            Folder · {isiLabel}
          </span>
          {adaPemilik && (
            <span role="gridcell" className="u-mb-baris-pemilik">
              —
            </span>
          )}
          <span role="gridcell">{tombolAksi}</span>
        </div>
      );
    if (gaya === 'kolom')
      return (
        <div key={`f:${f.path}`} role="option" aria-selected={Boolean(aktifKolom)} className="u-mb-kol-baris" data-folder="" {...umum}>
          <IkonFolderWarna warna={f.warna} buka={aktifKolom} />
          <span className="u-mb-kol-nama">{f.nama}</span>
          {f.total_berkas > 0 && <small>{f.total_berkas}</small>}
          <ChevronRight aria-hidden className="u-mb-kol-panah" />
        </div>
      );
    if (gaya === 'strip')
      return (
        <div key={`f:${f.path}`} role="gridcell" className="u-mb-strip-item" data-folder="" aria-label={`Folder ${f.nama}`} {...umum}>
          <span className="u-mb-strip-gambar">
            <IkonFolderWarna warna={f.warna} />
          </span>
        </div>
      );
    return (
      <div key={`f:${f.path}`} role="gridcell" className="u-mb-kartu" data-folder="" aria-label={`Folder ${f.nama}, ${isiLabel}`} {...umum}>
        <span className="u-mb-kartu-gambar">
          <IkonFolderWarna warna={f.warna} />
        </span>
        <span className="u-mb-kartu-teks">
          <b>
            {f.nama}
            {unit && <LencanaLihat lihat={f.lihat} />}
          </b>
          <small>{mencari && f.induk ? f.induk : isiLabel}</small>
        </span>
        {tombolAksi}
      </div>
    );
  };

  const kartuBerkas = (b: BerkasManajer, gaya: Gaya) => {
    const dipilih = terpilih.has(b.id);
    const umum = {
      'data-mb-item': '',
      'data-id': b.id,
      tabIndex: 0,
      draggable: bolehKelola,
      title: b.nama,
      'aria-selected': dipilih,
      'data-potong': papan?.mode === 'potong' && papan.berkas.some((x) => x.id === b.id) ? '' : undefined,
      onDragStart: (e: React.DragEvent) => mulaiSeret(e, { berkas: b }),
      onClick: (e: React.MouseEvent) => {
        if (!dariSini(e) || (e.target as HTMLElement).closest('.u-mb-aksi, .u-mb-cek')) return;
        klikBerkas(b, e);
      },
      onDoubleClick: (e: React.MouseEvent) => dariSini(e) && bukaBerkas(b),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (!dariSini(e) || e.target !== e.currentTarget) return;
        if (e.key === 'Enter') bukaBerkas(b);
        if (e.key === ' ') {
          // Spasi = lihat cepat (Quick Look); Ctrl/Cmd+Spasi = centang untuk pilih banyak.
          e.preventDefault();
          if (e.ctrlKey || e.metaKey) centang(b);
          else setPratinjau(b);
        }
      },
      onContextMenu: (e: React.MouseEvent) => {
        if (!dariSini(e)) return;
        if (!terpilih.has(b.id)) setTerpilih(new Set([b.id]));
        setelSasaran({ jenis: 'berkas', b })(e);
      },
    };
    const cek = (
      <span
        className="u-mb-cek"
        role="checkbox"
        aria-checked={dipilih}
        aria-label={`Pilih ${b.nama}`}
        onClick={(e) => {
          e.stopPropagation();
          centang(b);
        }}
      >
        {dipilih && <Check aria-hidden />}
      </span>
    );
    const tombolAksi = (
      <Menu
        trigger={
          <button type="button" className="u-mb-aksi" aria-label={`Aksi berkas ${b.nama}`} onClick={(e) => e.stopPropagation()}>
            <Ellipsis aria-hidden />
          </button>
        }
        items={entriMenu({ jenis: 'berkas', b })}
      />
    );
    const status = b.status !== 'tersedia' ? <small className="u-mb-status">Belum selesai diunggah</small> : null;
    const gembok = b.terenkripsi ? (
      <span className="u-mb-gembok" title="Disimpan terenkripsi" aria-label="terenkripsi">
        <Lock aria-hidden />
      </span>
    ) : null;
    const gambar = jenisBerkas(b) === 'gambar';
    if (gaya === 'daftar')
      return (
        <div key={b.id} role="row" className="u-mb-baris" aria-label={b.nama} {...umum}>
          <span role="gridcell" className="u-mb-baris-cek">
            {cek}
          </span>
          <span role="gridcell" className="u-mb-baris-nama">
            <IkonBerkas b={b} />
            <span>
              <b>
                {b.nama}
                {gembok}
                {unit && <LencanaLihat lihat={b.lihat} />}
              </b>
              {mencari || terbaru ? <small>{b.folder || judul}</small> : status}
            </span>
          </span>
          <span role="gridcell" className="u-mb-baris-tgl">
            {b.diubah_at || b.dibuat_at ? formatDate((b.diubah_at || b.dibuat_at)!, 'short') : '—'}
          </span>
          <span role="gridcell" className="u-mb-baris-ukuran">
            {formatBytes(b.ukuran)}
          </span>
          <span role="gridcell" className="u-mb-baris-info">
            {jenisAwam(b)}
          </span>
          {adaPemilik && (
            <span role="gridcell" className="u-mb-baris-pemilik">
              {b.pemilik || '—'}
            </span>
          )}
          <span role="gridcell">{tombolAksi}</span>
        </div>
      );
    if (gaya === 'kolom')
      return (
        <div key={b.id} role="option" className="u-mb-kol-baris" {...umum}>
          <IkonBerkas b={b} />
          <span className="u-mb-kol-nama">{b.nama}</span>
          {gembok}
        </div>
      );
    if (gaya === 'strip')
      return (
        <div key={b.id} role="gridcell" className="u-mb-strip-item" aria-label={b.nama} {...umum}>
          <span className="u-mb-strip-gambar">{gambar ? <GambarMini b={b} /> : <IkonBerkas b={b} />}</span>
        </div>
      );
    return (
      <div key={b.id} role="gridcell" className="u-mb-kartu" data-berkas="" aria-label={b.nama} {...umum}>
        <span className="u-mb-kartu-gambar">
          {gambar ? <GambarMini b={b} /> : <IkonBerkas b={b} besar />}
          {gembok}
        </span>
        <span className="u-mb-kartu-teks">
          <b>
            {b.nama}
            {unit && <LencanaLihat lihat={b.lihat} />}
          </b>
          <small>{mencari || terbaru ? b.folder || judul : formatBytes(b.ukuran)}</small>
          {status}
        </span>
        {cek}
        {tombolAksi}
      </div>
    );
  };

  // ---------------------------------------------------------------- render
  const jejak = folder ? folder.split('/').map((s, i, a) => ({ label: s, path: a.slice(0, i + 1).join('/') })).filter((j) => !akarBagi || j.path.length > akarBagi.length) : [];
  const diAkar = folder === akarBagi && !terbaru;
  const daftarPeriode = periodeQ.data?.periode ?? [];
  const opsiPeriode = [
    { value: 'semua', label: 'Semua periode' },
    ...daftarPeriode.filter((x) => x.periode !== 'tanpa').map((x) => ({ value: x.periode, label: `${x.nama}${x.aktif ? ' · aktif' : ''}` })),
    ...(periode && periode !== 'tanpa' && !daftarPeriode.some((x) => x.periode === periode) ? [{ value: periode, label: namaPeriode(periode) }] : []),
    { value: 'tanpa', label: 'Tanpa periode' },
  ];
  const ringkas = pohonQ.data?.akar;
  const selesai = antrean.filter((x) => x.status === 'selesai').length;
  const aktifUnggah = antrean.filter((x) => x.status === 'antre' || x.status === 'unggah').length;
  const kosong = !memuat && !galat && !isi.length && !subfolder.length;
  const tujuanUnggah = folderIni?.nama ?? (folder ? namaDari(folder) : judul);
  const ikonSaja = modeSamping === 'ikon' && !sempit;
  const fokus = berkasTerpilih[berkasTerpilih.length - 1] ?? null;
  const bisaLepasRuang = (e: React.DragEvent) => seretDalam(e);

  const pohonEl = (
    <PohonFolder
      pohon={pohon}
      aktif={terbaru ? '\u0000' : folder}
      onPilih={(p) => {
        buka(p);
        setPanelPohon(false);
      }}
      akarLabel="Semua berkas"
      akarInfo={ringkas ? String(ringkas.total_berkas) : undefined}
      onLepas={(t, e) => void lepasKe(t, e)}
      bisaLepas={(e) => (seretDalam(e) && bolehKelola) || (seretFile(e) && bolehUnggah)}
    />
  );

  const pohonMuat = (
    <div className="u-mb-pohon-muat" role="status" aria-label="Memuat folder">
      {[0.7, 0.55, 0.8, 0.5, 0.65].map((w, i) => (
        <span key={i}>
          <i className="u-skeleton" />
          <i className="u-skeleton" style={{ width: `${w * 100}%` }} />
        </span>
      ))}
    </div>
  );

  const jalankanHapus = async () => {
    if (dialog?.jenis !== 'hapus') return;
    try {
      if (dialog.f) {
        const r = await aksi.hapusFolder(dialog.f.path, dialog.f.total_berkas > 0);
        if (folder && (folder === dialog.f.path || folder.startsWith(`${dialog.f.path}/`))) buka(dialog.f.induk);
        setPesan({ nada: 'sukses', teks: `Folder ${dialog.f.nama} dihapus${r.berkas_dihapus ? ` beserta ${r.berkas_dihapus} berkas (ke sampah)` : ''}.` });
      } else {
        const r = await aksi.hapusBerkas(dialog.berkas.map((b) => b.id));
        setTerpilih(new Set());
        const urungkan = r.dihapus.length
          ? {
              label: 'Urungkan',
              jalan: () => {
                setPesan(null);
                aksi
                  .pulihkanBerkas(r.dihapus)
                  .then((h) => setPesan({ nada: h.gagal.length ? 'galat' : 'sukses', teks: h.gagal.length ? h.gagal[0].pesan : `${h.dipulihkan.length === 1 ? 'Berkas' : `${h.dipulihkan.length} berkas`} dikembalikan.` }))
                  .catch((e) => setPesan({ nada: 'galat', teks: pesanGalat(e) }));
              },
            }
          : undefined;
        const nama = r.dihapus.length === 1 ? (dialog.berkas.find((b) => b.id === r.dihapus[0])?.nama ?? 'Berkas') : `${r.dihapus.length} berkas`;
        setPesan(
          r.gagal.length
            ? { nada: 'galat', teks: `${r.dihapus.length} berkas dipindahkan ke Sampah, ${r.gagal.length} gagal: ${r.gagal[0].pesan}`, aksi: urungkan }
            : { nada: 'sukses', teks: `${nama} dipindahkan ke Sampah.`, aksi: urungkan },
        );
      }
    } catch (e) {
      setPesan({ nada: 'galat', teks: pesanGalat(e) });
    }
  };

  const opsiSamping: OpsiSampingBerkas = {
    ringkas: ikonSaja,
    terbaru: { aktif: terbaru, onPilih: () => (pergi({ folder: akarBagi, terbaru: true }), setPanelPohon(false)) },
    lepasKeRuang: (t, e) => void lepasKeRuang(t, e),
    bisaLepas: bisaLepasRuang,
  };
  const isiPohon = pohonQ.loading && !pohonQ.data ? pohonMuat : pohonEl;
  const isiSamping = (laci: boolean) =>
    samping ? (
      samping(isiPohon, laci ? { ...opsiSamping, ringkas: false } : opsiSamping)
    ) : (
      <>
        <div className="u-mb-bagian">
          <h4 className="u-mb-bagian-judul">Pintasan</h4>
          <button type="button" className="u-mb-pintas" aria-current={terbaru ? 'page' : undefined} title="Terbaru" onClick={opsiSamping.terbaru.onPilih}>
            <Clock aria-hidden />
            <span>Terbaru</span>
          </button>
        </div>
        <div className="u-mb-bagian">
          <h4 className="u-mb-bagian-judul">{judul}</h4>
          {isiPohon}
        </div>
      </>
    );

  // Kolom (Miller): folder leluhur sampai folder aktif; kolom terakhir berisi subfolder dan berkas.
  const jalurKolom: Array<string | null> = terbaru || mencari ? [] : [akarBagi, ...jejak.map((j) => j.path)];
  const ringkasKaki = memuat && !isi.length ? 'Memuat…' : `${subfolder.length ? `${subfolder.length} folder · ` : ''}${total} berkas${folderIni ? ` · ${formatBytes(folderIni.ukuran)}` : ringkas && !folder && !terbaru ? ` · ${formatBytes(ringkas.ukuran)}` : ''}`;
  const judulKelompok = (label: string, n: number) => (
    <h3 className="u-mb-judul-bagian">
      {label} <small>{n}</small>
    </h3>
  );
  const kepalaKolom = (k: KunciUrut, label: string, cls?: string) => (
    <span role="columnheader" className={cls} aria-sort={urut.kunci === k ? (urut.arah === 'naik' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="u-mb-kolom-urut" data-aktif={urut.kunci === k ? '' : undefined} onClick={() => setUrut((u) => klikKolom(u, k))}>
        {label}
        {urut.kunci === k ? urut.arah === 'naik' ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden /> : null}
      </button>
    </span>
  );
  const centangSemua =
    pilih !== 'satu' && isi.length > 0 ? (
      <span
        className="u-mb-cek"
        role="checkbox"
        tabIndex={0}
        aria-checked={terpilih.size === isi.length ? true : terpilih.size ? 'mixed' : false}
        aria-label="Pilih semua berkas"
        onClick={() => setTerpilih(terpilih.size === isi.length ? new Set() : new Set(semuaId))}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), setTerpilih(terpilih.size === isi.length ? new Set() : new Set(semuaId)))}
      >
        {terpilih.size === isi.length ? <Check aria-hidden /> : terpilih.size ? <span className="u-mb-cek-sebagian" /> : null}
      </span>
    ) : null;
  const muatLagi = adaLagi && !memuat && (
    <Button variant="ghost" size="sm" className="u-mb-lagi" onClick={() => setHalaman((h) => h + 1)}>
      Muat lebih banyak ({isi.length} dari {total})
      <ChevronDown aria-hidden />
    </Button>
  );

  const viewIkon = (
    <div data-mb-navigasi="">
      {kelompokEfektif === 'tidak' ? (
        <div className="u-mb-kisi" role="grid" aria-label="Folder dan berkas" aria-multiselectable={pilih !== 'satu'}>
          <div role="row" className="u-mb-kisi-baris">
            {subfolder.map((f) => kartuFolder(f, 'ikon'))}
            {isiTampil.map((b) => kartuBerkas(b, 'ikon'))}
            {memuat && Array.from({ length: isi.length ? 4 : 10 }, (_, i) => <KartuMuat key={`m${i}`} />)}
          </div>
        </div>
      ) : (
        <>
          {subfolder.length > 0 && (
            <section>
              {judulKelompok('Folder', subfolder.length)}
              <div className="u-mb-kisi" role="grid" aria-label="Folder">
                <div role="row" className="u-mb-kisi-baris">
                  {subfolder.map((f) => kartuFolder(f, 'ikon'))}
                </div>
              </div>
            </section>
          )}
          {kelompokIsi.map((k) => (
            <section key={k.kunci}>
              {judulKelompok(k.label, k.isi.length)}
              <div className="u-mb-kisi" role="grid" aria-label={k.label} aria-multiselectable={pilih !== 'satu'}>
                <div role="row" className="u-mb-kisi-baris">
                  {k.isi.map((b) => kartuBerkas(b, 'ikon'))}
                </div>
              </div>
            </section>
          ))}
          {memuat && (
            <div className="u-mb-kisi">
              <div className="u-mb-kisi-baris">{Array.from({ length: isi.length ? 4 : 10 }, (_, i) => <KartuMuat key={`m${i}`} />)}</div>
            </div>
          )}
        </>
      )}
      {muatLagi}
    </div>
  );

  const viewDaftar = (
    <div className="u-mb-tabel" role="grid" aria-label="Folder dan berkas" aria-multiselectable={pilih !== 'satu'} data-mb-navigasi="" data-pemilik={adaPemilik ? '' : undefined}>
      <div role="row" className="u-mb-baris u-mb-baris-kepala">
        <span role="columnheader" className="u-mb-baris-cek">
          {centangSemua}
        </span>
        {kepalaKolom('nama', 'Nama')}
        {kepalaKolom('tanggal', 'Tanggal diubah', 'u-mb-baris-tgl')}
        {kepalaKolom('ukuran', 'Ukuran', 'u-mb-baris-ukuran')}
        {kepalaKolom('jenis', 'Jenis', 'u-mb-baris-info')}
        {adaPemilik && (
          <span role="columnheader" className="u-mb-baris-pemilik">
            Pemilik
          </span>
        )}
        <span role="columnheader">
          <span className="u-sr-only">Aksi</span>
        </span>
      </div>
      {kelompokEfektif !== 'tidak' && subfolder.length > 0 && (
        <div role="row" className="u-mb-baris-grup">
          <span role="gridcell">
            Folder <small>{subfolder.length}</small>
          </span>
        </div>
      )}
      {subfolder.map((f) => kartuFolder(f, 'daftar'))}
      {kelompokIsi.map((k) => (
        <React.Fragment key={k.kunci}>
          {k.label && (
            <div role="row" className="u-mb-baris-grup">
              <span role="gridcell">
                {k.label} <small>{k.isi.length}</small>
              </span>
            </div>
          )}
          {k.isi.map((b) => kartuBerkas(b, 'daftar'))}
        </React.Fragment>
      ))}
      {memuat && Array.from({ length: isi.length ? 2 : 6 }, (_, i) => <BarisMuat key={`m${i}`} />)}
      {muatLagi}
    </div>
  );

  const viewKolom = (
    <div className="u-mb-kolom" ref={refKolom} data-mb-navigasi="">
      {jalurKolom.slice(0, -1).map((p, i) => {
        const anak = urutkanFolder(
          daftarFolder.filter((f) => f.induk === p),
          { kunci: 'nama', arah: 'naik' },
        );
        const berikut = jalurKolom[i + 1];
        return (
          <div key={p ?? '/'} className="u-mb-kolom-satu" role="listbox" aria-label={p ? namaDari(p) : judul}>
            {anak.map((f) => kartuFolder(f, 'kolom', f.path === berikut))}
          </div>
        );
      })}
      <div className="u-mb-kolom-satu" role="listbox" aria-label={terbaru ? 'Terbaru' : folder ? namaDari(folder) : judul} aria-multiselectable={pilih !== 'satu'}>
        {subfolder.map((f) => kartuFolder(f, 'kolom'))}
        {isiTampil.map((b) => kartuBerkas(b, 'kolom'))}
        {memuat && Array.from({ length: 4 }, (_, i) => <span key={i} className="u-skeleton u-mb-kol-muat" />)}
        {muatLagi}
      </div>
      {fokus && terpilih.size === 1 && !panelInfo && (
        <div className="u-mb-kolom-satu u-mb-kolom-pratinjau">
          <PanelInfoBerkas b={fokus} judul={judul} buka={() => bukaBerkas(fokus)} unduh={() => void unduh(fokus)} />
        </div>
      )}
    </div>
  );

  const fokusGaleri = fokus ?? isiTampil[0] ?? null;
  const viewGaleri = (
    <div className="u-mb-galeri">
      <div className="u-mb-galeri-utama">
        {fokusGaleri ? (
          <>
            <GambarBesar b={fokusGaleri} onBuka={() => bukaBerkas(fokusGaleri)} />
            <div className="u-mb-galeri-ket">
              <span>
                <b title={fokusGaleri.nama}>{fokusGaleri.nama}</b>
                <small>{[jenisAwam(fokusGaleri), formatBytes(fokusGaleri.ukuran), fokusGaleri.dibuat_at ? formatDate(fokusGaleri.dibuat_at, 'short') : null].filter(Boolean).join(' · ')}</small>
              </span>
              <Button variant="outline" size="sm" onClick={() => bukaBerkas(fokusGaleri)}>
                <Eye aria-hidden />
                Buka
              </Button>
              <Button variant="ghost" size="sm" iconOnly aria-label="Unduh" onClick={() => void unduh(fokusGaleri)}>
                <Download aria-hidden />
              </Button>
            </div>
          </>
        ) : (
          <p className="u-mb-galeri-kosong">{memuat ? 'Memuat…' : 'Pilih folder di bawah untuk melihat berkasnya.'}</p>
        )}
      </div>
      <div className="u-mb-galeri-strip" role="grid" aria-label="Folder dan berkas" data-mb-navigasi="">
        <div role="row" className="u-mb-galeri-baris">
          {subfolder.map((f) => kartuFolder(f, 'strip'))}
          {isiTampil.map((b) => kartuBerkas(b, 'strip'))}
          {adaLagi && !memuat && (
            <button type="button" className="u-mb-strip-lagi" onClick={() => setHalaman((h) => h + 1)}>
              +{total - isi.length}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const tombolTampilan: Array<{ v: TampilanBerkas; ikon: React.ReactNode }> = [
    { v: 'ikon', ikon: <LayoutGrid aria-hidden /> },
    { v: 'daftar', ikon: <List aria-hidden /> },
    { v: 'kolom', ikon: <Columns3 aria-hidden /> },
    { v: 'galeri', ikon: <GalleryHorizontal aria-hidden /> },
  ];
  const cekMenu = (aktif: boolean) => (aktif ? <Check aria-hidden /> : <span className="u-mb-ruang-ikon" />);
  const jumlahSaring = (jenis !== 'semua' ? 1 : 0) + (periode ? 1 : 0);
  const entriLain: MenuEntry[] = [
    ...entriBaru,
    ...(bolehUnggah ? ([{ label: 'Unggah folder', icon: <FolderUp aria-hidden />, onSelect: () => inputFolder.current?.click() }] as MenuEntry[]) : []),
    ...(entriBaru.length || bolehUnggah ? ([{ type: 'separator' }] as MenuEntry[]) : []),
    ...(!bagi ? ([{ label: enkripsiEfektif === 'wajib' ? 'Keamanan berkas (terenkripsi)…' : 'Keamanan berkas…', icon: <ShieldCheck aria-hidden />, onSelect: () => setDialog({ jenis: 'kebijakan' }) }] as MenuEntry[]) : []),
    { label: panelInfo ? 'Sembunyikan panel info' : 'Tampilkan panel info', icon: <Info aria-hidden />, shortcut: '⌘I', onSelect: () => setPanelInfo((x) => !x) },
    { type: 'separator' },
    { type: 'label', label: 'Sidebar' },
    { label: 'Lengkap', icon: cekMenu(modeSamping === 'penuh'), onSelect: () => setModeSamping('penuh') },
    { label: 'Ikon saja', icon: cekMenu(modeSamping === 'ikon'), onSelect: () => setModeSamping('ikon') },
    { label: 'Sembunyikan', icon: cekMenu(modeSamping === 'tutup'), onSelect: () => setModeSamping('tutup') },
    { type: 'separator' },
    { label: 'Segarkan', icon: <RotateCw aria-hidden />, onSelect: () => aksi.segarkan() },
  ];
  const mulaiGeser = (e: React.PointerEvent) => {
    e.preventDefault();
    const x0 = e.clientX;
    const w0 = lebarSamping;
    const gerak = (ev: PointerEvent) => setLebarSamping(Math.max(180, Math.min(420, w0 + ev.clientX - x0)));
    const lepas = () => {
      window.removeEventListener('pointermove', gerak);
      window.removeEventListener('pointerup', lepas);
    };
    window.addEventListener('pointermove', gerak);
    window.addEventListener('pointerup', lepas);
  };

  return (
    <div
      ref={refAkar}
      className={cn('u-mb', className)}
      style={{ height: tinggi, ['--u-mb-lebar' as string]: `${lebarSamping}px` }}
      data-samping={modeSamping}
      data-info={panelInfo ? '' : undefined}
      data-seret={seretLuar ? '' : undefined}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i' && !(e.target as HTMLElement).closest('input, textarea')) {
          e.preventDefault();
          setPanelInfo((x) => !x);
        }
      }}
      onDragEnter={(e) => {
        if (!seretFile(e) || !bolehUnggah) return;
        hitungSeret.current++;
        setSeretLuar(true);
      }}
      onDragLeave={(e) => {
        if (!seretFile(e)) return;
        hitungSeret.current = Math.max(0, hitungSeret.current - 1);
        if (!hitungSeret.current) setSeretLuar(false);
      }}
    >
      <aside className="u-mb-samping" aria-label={samping ? 'Drive dan folder' : 'Folder'} data-mode={ikonSaja ? 'ikon' : 'penuh'}>
        <div className="u-mb-samping-isi">{isiSamping(false)}</div>
        <div className="u-mb-samping-kaki">
          {!ikonSaja &&
            (info?.kuota && !bagi ? (
              <KuotaBerkas kuota={info.kuota} unit={unit} ringkas />
            ) : (
              ringkas && (
                <span className="u-mb-penyimpanan" title={info?.penyimpanan?.nama ?? undefined}>
                  <HardDrive aria-hidden />
                  <small>
                    {formatBytes(ringkas.total_ukuran)} · {ringkas.total_berkas} berkas
                  </small>
                </span>
              )
            ))}
          <Tooltip content={ikonSaja ? 'Lebarkan sidebar' : 'Ringkas sidebar jadi ikon'} side="right">
            <Button variant="ghost" size="sm" iconOnly aria-label={ikonSaja ? 'Lebarkan sidebar' : 'Ringkas sidebar jadi ikon'} onClick={() => setModeSamping(ikonSaja ? 'penuh' : 'ikon')}>
              {ikonSaja ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}
            </Button>
          </Tooltip>
        </div>
        {!ikonSaja && (
          <div
            className="u-mb-geser"
            role="separator"
            aria-orientation="vertical"
            aria-label="Ubah lebar sidebar"
            aria-valuemin={180}
            aria-valuemax={420}
            aria-valuenow={lebarSamping}
            tabIndex={0}
            onPointerDown={mulaiGeser}
            onDoubleClick={() => setLebarSamping(PREF_BERKAS_BAWAAN.lebar)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                setLebarSamping((w) => Math.max(180, Math.min(420, w + (e.key === 'ArrowLeft' ? -16 : 16))));
              }
            }}
          />
        )}
      </aside>

      <section className="u-mb-utama" aria-label={terbaru ? 'Terbaru' : (folder ?? judul)}>
        <div className="u-mb-alat">
          <div className="u-mb-jejak">
            <Tooltip content={sempit ? (samping ? 'Drive dan folder' : 'Folder') : modeSamping === 'tutup' ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label={sempit ? (samping ? 'Drive dan folder' : 'Folder') : modeSamping === 'tutup' ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
                aria-pressed={sempit ? undefined : modeSamping !== 'tutup'}
                onClick={() => (sempit ? setPanelPohon(true) : setModeSamping((m) => (m === 'tutup' ? 'penuh' : 'tutup')))}
              >
                <PanelLeft aria-hidden />
              </Button>
            </Tooltip>
            <span className="u-mb-riwayat">
              <Tooltip content="Kembali">
                <Button variant="ghost" size="sm" iconOnly aria-label="Kembali" disabled={!bisaMundur} onClick={() => langkah(-1)}>
                  <ChevronLeft aria-hidden />
                </Button>
              </Tooltip>
              <Tooltip content="Maju">
                <Button variant="ghost" size="sm" iconOnly aria-label="Maju" disabled={!bisaMaju} onClick={() => langkah(1)}>
                  <ChevronRight aria-hidden />
                </Button>
              </Tooltip>
            </span>
            <nav aria-label="Lokasi folder">
              <ol>
                <li>
                  <button
                    type="button"
                    aria-current={diAkar ? 'page' : undefined}
                    data-sasaran={sasaranLepas === '' ? '' : undefined}
                    onClick={() => buka(akarBagi)}
                    onDragOver={(e) => {
                      if (seretDalam(e) && bolehKelola && !diAkar) {
                        e.preventDefault();
                        setSasaranLepas('');
                      }
                    }}
                    onDragLeave={() => setSasaranLepas(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void lepasKe(akarBagi, e);
                    }}
                  >
                    {judul}
                  </button>
                </li>
                {terbaru ? (
                  <li>
                    <ChevronRight aria-hidden />
                    <button type="button" aria-current="page">
                      Terbaru
                    </button>
                  </li>
                ) : (
                  jejak.map((j, i) => (
                    <li key={j.path}>
                      <ChevronRight aria-hidden />
                      <button
                        type="button"
                        aria-current={i === jejak.length - 1 ? 'page' : undefined}
                        data-sasaran={sasaranLepas === j.path ? '' : undefined}
                        onClick={() => buka(j.path)}
                        onDragOver={(e) => {
                          if (seretDalam(e) && bolehKelola && i < jejak.length - 1) {
                            e.preventDefault();
                            setSasaranLepas(j.path);
                          }
                        }}
                        onDragLeave={() => setSasaranLepas(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void lepasKe(j.path, e);
                        }}
                      >
                        {j.label}
                      </button>
                    </li>
                  ))
                )}
              </ol>
            </nav>
            <span className="u-mb-spasi" />
            {bisaTempel && papan && (
              <span className="u-mb-papan">
                <Tooltip content={`Tempel ${papan.folder ? `folder ${papan.folder.nama}` : `${papan.berkas.length} berkas`} dari ${papan.asal.label}`} shortcut="Ctrl+V">
                  <Button variant="outline" size="sm" aria-label="Tempel" onClick={() => void tempel(folder)}>
                    <ClipboardPaste aria-hidden />
                    <span className="u-mb-sembunyi-kecil">Tempel{papan.folder ? '' : ` ${papan.berkas.length}`}</span>
                  </Button>
                </Tooltip>
                <Tooltip content="Kosongkan papan klip">
                  <Button variant="ghost" size="sm" iconOnly aria-label="Kosongkan papan klip" onClick={() => setelPapanBerkas(null)}>
                    <X aria-hidden />
                  </Button>
                </Tooltip>
              </span>
            )}
            {enkripsiEfektif === 'wajib' && (
              <Tooltip content="Semua berkas baru di ruang ini disimpan terenkripsi">
                <span className="u-mb-enkripsi" data-aktif="" aria-label="Terenkripsi">
                  <Lock aria-hidden />
                  <span className="u-mb-sembunyi-sedang">Terenkripsi</span>
                </span>
              </Tooltip>
            )}
            {enkripsiEfektif === 'opsional' && bolehUnggah && (
              <Tooltip content={enkripsiUnggah ? 'Berkas yang diunggah akan dienkripsi' : 'Enkripsi berkas yang diunggah'}>
                <button
                  type="button"
                  className="u-mb-enkripsi"
                  aria-pressed={enkripsiUnggah}
                  data-aktif={enkripsiUnggah ? '' : undefined}
                  aria-label="Enkripsi berkas yang diunggah"
                  onClick={() => setEnkripsiUnggah((x) => !x)}
                >
                  {enkripsiUnggah ? <Lock aria-hidden /> : <LockOpen aria-hidden />}
                  <span className="u-mb-sembunyi-sedang">{enkripsiUnggah ? 'Enkripsi aktif' : 'Enkripsi'}</span>
                </button>
              </Tooltip>
            )}
            {entriBaru.length > 0 && (
              <Menu
                trigger={
                  <Button variant="outline" size="sm" className="u-mb-tombol-baru" aria-label="Buat baru">
                    <Plus aria-hidden />
                    <span className="u-mb-sembunyi-sedang">Baru</span>
                  </Button>
                }
                items={[...entriBaru, ...(bolehUnggah ? ([{ label: 'Unggah folder', icon: <FolderUp aria-hidden />, onSelect: () => inputFolder.current?.click() }] as MenuEntry[]) : [])]}
              />
            )}
            {bolehUnggah && (
              <Button size="sm" aria-label="Unggah berkas" onClick={() => inputFile.current?.click()}>
                <Upload aria-hidden />
                <span className="u-mb-sembunyi-kecil">Unggah</span>
              </Button>
            )}
            <Menu
              trigger={
                <Button variant="ghost" size="sm" iconOnly aria-label="Lainnya">
                  <Ellipsis aria-hidden />
                </Button>
              }
              items={entriLain}
            />
          </div>
          <div className="u-mb-kontrol">
            <div className="u-mb-tampilan" role="radiogroup" aria-label="Tampilan">
              {tombolTampilan.map((t) => (
                <Tooltip key={t.v} content={`Tampilan ${LABEL_TAMPILAN[t.v].toLowerCase()}`}>
                  <button type="button" role="radio" aria-checked={tampilan === t.v} aria-label={`Tampilan ${LABEL_TAMPILAN[t.v].toLowerCase()}`} onClick={() => setTampilan(t.v)}>
                    {t.ikon}
                  </button>
                </Tooltip>
              ))}
            </div>
            <Menu
              align="start"
              trigger={
                <Button variant="ghost" size="sm" className="u-mb-pemicu" data-aktif={kelompok !== 'tidak' ? '' : undefined} aria-label={`Kelompokkan menurut: ${LABEL_KELOMPOK[kelompok]}`}>
                  <Group aria-hidden />
                  <span className="u-mb-sembunyi-sedang">{kelompok === 'tidak' ? 'Kelompok' : LABEL_KELOMPOK[kelompok]}</span>
                  <ChevronDown aria-hidden className="u-mb-pemicu-panah" />
                </Button>
              }
              items={[
                { type: 'label', label: 'Kelompokkan menurut' },
                ...(Object.keys(LABEL_KELOMPOK) as KelompokBerkas[])
                  .filter((k) => k !== 'pemilik' || adaPemilik || kelompok === 'pemilik')
                  .map((k) => ({ label: LABEL_KELOMPOK[k], icon: cekMenu(kelompok === k), onSelect: () => setKelompok(k) })),
              ]}
            />
            <Menu
              align="start"
              trigger={
                <Button variant="ghost" size="sm" className="u-mb-pemicu" aria-label={`Urutkan menurut: ${LABEL_URUT[urut.kunci]}, ${urut.arah === 'naik' ? 'naik' : 'turun'}`}>
                  {urut.arah === 'naik' ? <ArrowUpDown aria-hidden /> : <ArrowDownWideNarrow aria-hidden />}
                  <span className="u-mb-sembunyi-sedang">{LABEL_URUT[urut.kunci]}</span>
                  <ChevronDown aria-hidden className="u-mb-pemicu-panah" />
                </Button>
              }
              items={[
                { type: 'label', label: 'Urutkan menurut' },
                ...(Object.keys(LABEL_URUT) as KunciUrut[]).map((k) => ({
                  label: LABEL_URUT[k],
                  icon: cekMenu(urut.kunci === k),
                  onSelect: () => setUrut((u) => (u.kunci === k ? u : { kunci: k, arah: arahAwal(k) })),
                })),
                { type: 'separator' },
                {
                  label: urut.kunci === 'tanggal' ? 'Terlama dulu' : urut.kunci === 'ukuran' ? 'Terkecil dulu' : 'A ke Z',
                  icon: cekMenu(urut.arah === 'naik'),
                  onSelect: () => setUrut((u) => ({ ...u, arah: 'naik' })),
                },
                {
                  label: urut.kunci === 'tanggal' ? 'Terbaru dulu' : urut.kunci === 'ukuran' ? 'Terbesar dulu' : 'Z ke A',
                  icon: cekMenu(urut.arah === 'turun'),
                  onSelect: () => setUrut((u) => ({ ...u, arah: 'turun' })),
                },
              ]}
            />
            <Menu
              align="start"
              trigger={
                <Button variant="ghost" size="sm" className="u-mb-pemicu" data-aktif={jumlahSaring ? '' : undefined} aria-label={`Saring${jumlahSaring ? ` (${jumlahSaring} aktif)` : ''}`}>
                  <Filter aria-hidden />
                  <span className="u-mb-sembunyi-sedang">Saring</span>
                  {jumlahSaring > 0 && <span className="u-mb-lencana">{jumlahSaring}</span>}
                </Button>
              }
              items={[
                { type: 'label', label: 'Jenis berkas' },
                { label: 'Semua jenis', icon: cekMenu(jenis === 'semua'), onSelect: () => setJenis('semua') },
                ...(Object.entries(JENIS_BERKAS) as Array<[JenisBerkas, { label: string }]>).map(([k, v]) => ({ label: v.label, icon: cekMenu(jenis === k), onSelect: () => setJenis(k) })),
                ...(tampilPeriode && opsiPeriode.length > 2
                  ? ([
                      { type: 'separator' },
                      { type: 'label', label: 'Periode akademik' },
                      ...opsiPeriode.map((o) => ({ label: o.label, icon: cekMenu((periode ?? 'semua') === o.value), onSelect: () => setPeriode(o.value === 'semua' ? null : o.value) })),
                    ] as MenuEntry[])
                  : []),
              ]}
            />
            {jenis !== 'semua' && (
              <span className="u-mb-chip">
                {JENIS_BERKAS[jenis].label}
                <button type="button" aria-label={`Hapus saringan ${JENIS_BERKAS[jenis].label}`} onClick={() => setJenis('semua')}>
                  <X aria-hidden />
                </button>
              </span>
            )}
            {periode && (
              <span className="u-mb-chip">
                {periode === 'tanpa' ? 'Tanpa periode' : namaPeriode(periode)}
                <button type="button" aria-label="Hapus saringan periode" onClick={() => setPeriode(null)}>
                  <X aria-hidden />
                </button>
              </span>
            )}
            <span className="u-mb-spasi" />
            <div className="u-mb-cari">
              <Search aria-hidden />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={terbaru ? 'Cari di semua berkas' : folder ? `Cari di ${namaDari(folder)}` : 'Cari berkas dan folder'}
                aria-label="Cari berkas dan folder"
              />
              {q && (
                <button type="button" aria-label="Hapus pencarian" onClick={() => setQ('')}>
                  <X aria-hidden />
                </button>
              )}
            </div>
            <Tooltip content={panelInfo ? 'Sembunyikan info' : 'Tampilkan info'} shortcut="⌘I">
              <Button variant="ghost" size="sm" iconOnly className="u-mb-tombol-info" aria-label="Panel info" aria-pressed={panelInfo} data-aktif={panelInfo ? '' : undefined} onClick={() => setPanelInfo((x) => !x)}>
                <Info aria-hidden />
              </Button>
            </Tooltip>
            <input
              ref={inputFile}
              type="file"
              multiple={pilih !== 'satu'}
              accept={accept ?? (info?.ekstensi.length ? info.ekstensi.map((x) => `.${x}`).join(',') : undefined)}
              hidden
              onChange={(e) => {
                void tambahUnggah(
                  Array.from(e.target.files ?? []).map((file) => ({ file, sub: null })),
                  folder,
                );
                e.target.value = '';
              }}
            />
            <input
              ref={inputFolder}
              type="file"
              multiple
              hidden
              {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
              onChange={(e) => {
                void tambahUnggah(
                  Array.from(e.target.files ?? []).map((file) => {
                    const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? '';
                    const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
                    return { file, sub: dir ? dir.split('/').map(rapikanSegmen).join('/') : null };
                  }),
                  folder,
                );
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {terpilih.size > 0 && (
          <div className="u-mb-pilihan" role="toolbar" aria-label="Aksi berkas terpilih">
            <b>{terpilih.size} dipilih</b>
            {terpilih.size === 1 && (
              <Button variant="ghost" size="sm" onClick={() => berkasTerpilih[0] && void unduh(berkasTerpilih[0])}>
                <Download aria-hidden />
                Unduh
              </Button>
            )}
            {terpilih.size === 1 && bolehBagikan && berkasTerpilih[0] && (
              <Button variant="ghost" size="sm" onClick={() => setDialog({ jenis: 'bagikan', sasaran: { jenis: 'berkas', b: berkasTerpilih[0] } })}>
                <Share2 aria-hidden />
                Bagikan
              </Button>
            )}
            <Tooltip content="Salin" shortcut="Ctrl+C">
              <Button variant="ghost" size="sm" iconOnly aria-label="Salin" onClick={() => keKlip('salin', { berkas: berkasTerpilih })}>
                <Copy aria-hidden />
              </Button>
            </Tooltip>
            {bolehKelola && (
              <Tooltip content="Potong" shortcut="Ctrl+X">
                <Button variant="ghost" size="sm" iconOnly aria-label="Potong" onClick={() => keKlip('potong', { berkas: berkasTerpilih })}>
                  <Scissors aria-hidden />
                </Button>
              </Tooltip>
            )}
            {bolehKelola && (
              <Button variant="ghost" size="sm" onClick={() => setDialog({ jenis: 'pindah', berkas: berkasTerpilih })}>
                <FolderInput aria-hidden />
                Pindahkan
              </Button>
            )}
            {bolehKelola && tampilPeriode && (
              <Tooltip content="Periode akademik">
                <Button variant="ghost" size="sm" iconOnly aria-label="Periode akademik" onClick={() => setDialog({ jenis: 'periode', berkas: berkasTerpilih })}>
                  <CalendarRange aria-hidden />
                </Button>
              </Tooltip>
            )}
            {bolehDihapus(berkasTerpilih).length > 0 && (
              <Button variant="ghost" size="sm" className="u-mb-bahaya" title="Pindahkan ke Sampah (Del)" onClick={() => setDialog({ jenis: 'hapus', berkas: bolehDihapus(berkasTerpilih) })}>
                <Trash2 aria-hidden />
                Hapus
              </Button>
            )}
            <span className="u-mb-spasi" />
            {pilih && onPilih && (
              <Button size="sm" onClick={() => onPilih(berkasTerpilih)}>
                <Check aria-hidden />
                {labelPilih ?? (terpilih.size > 1 ? `Pakai ${terpilih.size} berkas` : 'Pakai berkas ini')}
              </Button>
            )}
            <Tooltip content="Batal pilih" shortcut="Esc">
              <Button variant="ghost" size="sm" iconOnly aria-label="Batal pilih" onClick={() => setTerpilih(new Set())}>
                <X aria-hidden />
              </Button>
            </Tooltip>
          </div>
        )}

        <div className="u-mb-badan">
          <BaseContextMenu.Root
            onOpenChange={(o) => {
              if (o) setMenuSasaran(sasaranMenu.current);
              else sasaranMenu.current = { jenis: 'kosong' };
            }}
          >
            <BaseContextMenu.Trigger
              className="u-mb-isi"
              data-tampilan={tampilan}
              onKeyDown={(e: React.KeyboardEvent) => dariSini(e) && tombolIsi(e)}
              onDragOver={(e: React.DragEvent) => {
                if ((seretFile(e) && bolehUnggah) || (seretDalam(e) && bolehKelola)) e.preventDefault();
              }}
              onDrop={(e: React.DragEvent) => {
                e.preventDefault();
                void lepasKe(folder, e);
              }}
              onClick={(e: React.MouseEvent) => {
                if (!dariSini(e)) return;
                const t = e.target as HTMLElement;
                if (!t.closest('[data-mb-item], button, input, [role="checkbox"], [role="columnheader"]')) setTerpilih(new Set());
              }}
            >
              {mencari && (
                <p className="u-mb-hasil" aria-live="polite">
                  {memuat ? 'Mencari…' : `${subfolder.length ? `${subfolder.length} folder, ` : ''}${total} berkas cocok dengan “${kata}”${terbaru ? '' : folder ? ` di ${namaDari(folder)}` : ''}.`}
                </p>
              )}
              {galat ? (
                <div className="u-mb-kosong" role="alert">
                  <CircleAlert aria-hidden />
                  <b>Berkas tidak bisa dimuat</b>
                  <p>{galat}</p>
                  <Button variant="outline" size="sm" onClick={() => setNonce((n) => n + 1)}>
                    <RotateCw aria-hidden />
                    Coba lagi
                  </Button>
                </div>
              ) : kosong && tampilan !== 'kolom' ? (
                <div className="u-mb-kosong">
                  {mencari || jenis !== 'semua' ? <Search aria-hidden /> : <CloudUpload aria-hidden />}
                  <b>{mencari ? `Tidak ada yang cocok dengan “${kata}”` : jenis !== 'semua' ? `Tidak ada ${JENIS_BERKAS[jenis].label.toLowerCase()} di sini` : terbaru ? 'Belum ada berkas' : 'Folder ini masih kosong'}</b>
                  <p>
                    {mencari || jenis !== 'semua'
                      ? 'Coba kata lain atau ubah saringan jenis.'
                      : bolehUnggah
                        ? 'Seret file atau folder dari komputer ke sini, atau pilih file untuk diunggah.'
                        : 'Belum ada berkas.'}
                  </p>
                  {mencari || jenis !== 'semua' ? (
                    <Button variant="outline" size="sm" onClick={() => (setQ(''), setJenis('semua'))}>
                      Hapus pencarian dan saringan
                    </Button>
                  ) : (
                    bolehUnggah && (
                      <Button size="sm" onClick={() => inputFile.current?.click()}>
                        <Upload aria-hidden />
                        Pilih file
                      </Button>
                    )
                  )}
                </div>
              ) : tampilan === 'daftar' ? (
                viewDaftar
              ) : tampilan === 'kolom' ? (
                viewKolom
              ) : tampilan === 'galeri' ? (
                viewGaleri
              ) : (
                viewIkon
              )}
            </BaseContextMenu.Trigger>
            <BaseContextMenu.Portal>
              <BaseContextMenu.Positioner className="u-popup-positioner">
                <BaseContextMenu.Popup className="u-menu">
                  {entriMenu(menuSasaran).map((it, i) =>
                    it.type === 'separator' ? (
                      <BaseContextMenu.Separator key={i} className="u-menu-separator" />
                    ) : it.type === 'label' ? (
                      <div key={i} className="u-menu-label">
                        {it.label}
                      </div>
                    ) : (
                      <BaseContextMenu.Item key={i} className="u-menu-item" onClick={it.onSelect} disabled={it.disabled} data-variant={it.destructive ? 'destructive' : undefined}>
                        {it.icon}
                        <span>{it.label}</span>
                        {it.shortcut && <span className="u-menu-shortcut">{it.shortcut}</span>}
                      </BaseContextMenu.Item>
                    ),
                  )}
                </BaseContextMenu.Popup>
              </BaseContextMenu.Positioner>
            </BaseContextMenu.Portal>
          </BaseContextMenu.Root>

          {panelInfo && (
            <aside className="u-mb-info" aria-label="Info">
              {fokus ? (
                <PanelInfoBerkas
                  b={fokus}
                  judul={judul}
                  jumlah={terpilih.size}
                  buka={() => bukaBerkas(fokus)}
                  unduh={() => void unduh(fokus)}
                  bagikan={bolehBagikan ? () => setDialog({ jenis: 'bagikan', sasaran: { jenis: 'berkas', b: fokus } }) : undefined}
                />
              ) : (
                <div className="u-mb-info-folder">
                  <span className="u-mb-info-gambar">{terbaru ? <Clock aria-hidden /> : <IkonFolderWarna warna={folderIni?.warna} />}</span>
                  <b>{terbaru ? 'Terbaru' : (folderIni?.nama ?? judul)}</b>
                  <small>{terbaru ? 'Berkas yang terakhir diunggah atau diubah' : 'Folder'}</small>
                  <dl className="u-mb-detail">
                    <div>
                      <dt>Isi</dt>
                      <dd>{ringkasKaki}</dd>
                    </div>
                    {folderIni && (
                      <div>
                        <dt>Termasuk subfolder</dt>
                        <dd>
                          {folderIni.total_berkas} berkas · {formatBytes(folderIni.total_ukuran)}
                        </dd>
                      </div>
                    )}
                    {!folder && ringkas && !terbaru && (
                      <div>
                        <dt>Semua berkas</dt>
                        <dd>
                          {ringkas.total_berkas} berkas · {formatBytes(ringkas.total_ukuran)}
                        </dd>
                      </div>
                    )}
                    {info?.penyimpanan?.nama && (
                      <div>
                        <dt>Disimpan di</dt>
                        <dd>{info.penyimpanan.nama}</dd>
                      </div>
                    )}
                  </dl>
                  <p className="u-mb-info-saran">Pilih berkas untuk melihat rinciannya.</p>
                </div>
              )}
            </aside>
          )}
        </div>

        <div className="u-mb-kaki">
          <span aria-live="polite">
            {terpilih.size > 0 && !memuat ? `${terpilih.size} dari ${total} dipilih · ` : ''}
            {ringkasKaki}
          </span>
          {bolehUnggah && info && <span className="u-mb-sembunyi-kecil" title={info.batas_unggah?.maks_sumber ? `Batas dari ${info.batas_unggah.maks_sumber.label}` : undefined}>{teksBatasUnggah(info)}</span>}
        </div>

        {seretLuar && (
          <div className="u-mb-lepas" aria-hidden>
            <CloudUpload />
            <b>Lepas untuk mengunggah ke {sasaranLepas ? namaDari(sasaranLepas) : tujuanUnggah}</b>
            <small>File dan folder dari komputer · {info ? teksBatasUnggah(info) : '…'}</small>
          </div>
        )}

        {pesan && (
          <div className="u-mb-pesan" data-nada={pesan.nada} role={pesan.nada === 'galat' ? 'alert' : 'status'}>
            {pesan.nada === 'galat' ? <CircleAlert aria-hidden /> : <CircleCheck aria-hidden />}
            <span>{pesan.teks}</span>
            {pesan.aksi && (
              <button type="button" className="u-mb-pesan-aksi" onClick={pesan.aksi.jalan}>
                {pesan.aksi.label}
              </button>
            )}
            <button type="button" aria-label="Tutup pesan" onClick={() => setPesan(null)}>
              <X aria-hidden />
            </button>
          </div>
        )}

        {antrean.length > 0 && (
          <div className="u-mb-antrean" data-tutup={antreanTutup ? '' : undefined} aria-label="Unggahan">
            <div className="u-mb-antrean-kepala">
              <b>{aktifUnggah ? `Mengunggah ${aktifUnggah} berkas` : `${selesai} dari ${antrean.length} berkas terunggah`}</b>
              <button type="button" aria-label={antreanTutup ? 'Tampilkan unggahan' : 'Ciutkan unggahan'} aria-expanded={!antreanTutup} onClick={() => setAntreanTutup((t) => !t)}>
                <ChevronDown aria-hidden />
              </button>
              {!aktifUnggah && (
                <button type="button" aria-label="Tutup daftar unggahan" onClick={() => setAntrean([])}>
                  <X aria-hidden />
                </button>
              )}
            </div>
            {!antreanTutup && (
              <ul>
                {antrean.map((it) => (
                  <li key={it.kunci} data-status={it.status}>
                    <IkonBerkas b={{ id: it.kunci, nama: it.file.name, ukuran: it.file.size, status: 'tersedia', mime: it.file.type }} />
                    <span className="u-mb-antrean-teks">
                      <b title={it.file.name}>{it.file.name}</b>
                      <small>
                        {it.status === 'gagal'
                          ? it.galat
                          : it.status === 'batal'
                            ? 'Dibatalkan'
                            : it.status === 'selesai'
                              ? `${formatBytes(it.file.size)} · ${it.folder ?? judul}`
                              : it.status === 'antre'
                                ? 'Menunggu…'
                                : `${it.persen}% dari ${formatBytes(it.file.size)}`}
                      </small>
                      {it.status === 'unggah' && (
                        <span className="u-mb-bilah" role="progressbar" aria-valuenow={it.persen} aria-valuemin={0} aria-valuemax={100} aria-label={`Unggah ${it.file.name}`}>
                          <span style={{ width: `${it.persen}%` }} />
                        </span>
                      )}
                    </span>
                    {it.status === 'selesai' ? (
                      <CircleCheck aria-label="Selesai" className="u-mb-antrean-ok" />
                    ) : it.status === 'gagal' || it.status === 'batal' ? (
                      it.status === 'batal' || !it.galat?.startsWith('Jenis') ? (
                        <Tooltip content="Ulangi">
                          <button type="button" aria-label={`Ulangi ${it.file.name}`} onClick={() => ulangi(it)}>
                            <RotateCw aria-hidden />
                          </button>
                        </Tooltip>
                      ) : (
                        <CircleAlert aria-label="Gagal" className="u-mb-antrean-gagal" />
                      )
                    ) : (
                      <Tooltip content="Batalkan">
                        <button
                          type="button"
                          aria-label={`Batalkan ${it.file.name}`}
                          onClick={() => {
                            if (it.ctrl) it.ctrl.abort();
                            else {
                              antreanRef.current = antreanRef.current.map((x) => (x.kunci === it.kunci ? { ...x, status: 'batal' } : x));
                              setAntrean(antreanRef.current);
                            }
                          }}
                        >
                          <X aria-hidden />
                        </button>
                      </Tooltip>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <Dialog open={panelPohon} onOpenChange={setPanelPohon} title={samping ? 'Drive & folder' : 'Folder'} side="left" size="sm">
        <div className="u-mb-pohon-panel">{isiSamping(true)}</div>
      </Dialog>

      <DialogNamaFolder
        open={dialog?.jenis === 'folder-baru'}
        tutup={() => setDialog(null)}
        judul="Folder baru"
        label="Buat folder"
        induk={folder}
        simpan={async (nama, warna) => {
          await aksi.buatFolder(nama, folder, warna);
          setPesan({ nada: 'sukses', teks: `Folder ${nama} dibuat.` });
        }}
      />
      <DialogNamaFolder
        open={dialog?.jenis === 'folder-nama'}
        tutup={() => setDialog(null)}
        judul="Ganti nama folder"
        label="Simpan"
        induk={dialog?.jenis === 'folder-nama' ? dialog.f.induk : null}
        awal={dialog?.jenis === 'folder-nama' ? dialog.f.nama : ''}
        warnaAwal={dialog?.jenis === 'folder-nama' ? dialog.f.warna : null}
        simpan={async (nama, warna) => {
          if (dialog?.jenis !== 'folder-nama') return;
          const f = dialog.f;
          const r = await aksi.ubahFolder(f.path, { nama, warna });
          if (folder && (folder === f.path || folder.startsWith(`${f.path}/`))) buka(r.path + folder.slice(f.path.length));
        }}
      />
      <DialogPindah
        open={dialog?.jenis === 'pindah'}
        tutup={() => setDialog(null)}
        judul={
          dialog?.jenis === 'pindah'
            ? `${dialog.salin ? 'Salin' : 'Pindahkan'} ${dialog.f ? `folder ${dialog.f.nama}` : dialog.berkas.length === 1 ? dialog.berkas[0].nama : `${dialog.berkas.length} berkas`}`
            : ''
        }
        salin={dialog?.jenis === 'pindah' && dialog.salin}
        pohon={pohon}
        akarLabel={judul}
        dari={dialog?.jenis === 'pindah' ? (dialog.f ? dialog.f.induk : folder) : null}
        terlarang={dialog?.jenis === 'pindah' ? dialog.f?.path : null}
        pindah={async (tujuan) => {
          if (dialog?.jenis !== 'pindah') return;
          if (dialog.salin) {
            if (dialog.f) {
              const r = await aksi.salinFolder(dialog.f.path, tujuan);
              setPesan({ nada: 'sukses', teks: `Folder ${dialog.f.nama} disalin (${r.berkas_disalin} berkas) ke ${tujuan ?? judul}.` });
            } else {
              const r = await aksi.salinBerkas(
                dialog.berkas.map((b) => b.id),
                tujuan,
              );
              setPesan(
                r.gagal.length
                  ? { nada: 'galat', teks: `${r.gagal.length} berkas gagal disalin: ${r.gagal[0].pesan}` }
                  : { nada: 'sukses', teks: `${r.disalin.length} berkas disalin ke ${tujuan ?? judul}.` },
              );
            }
            return;
          }
          if (dialog.f) {
            const r = await aksi.ubahFolder(dialog.f.path, { induk_baru: tujuan });
            setPesan({ nada: 'sukses', teks: `Folder ${dialog.f.nama} dipindah ke ${tujuan ?? judul}.` });
            if (folder && (folder === dialog.f.path || folder.startsWith(`${dialog.f.path}/`))) buka(r.path + folder.slice(dialog.f.path.length));
          } else {
            const r = await aksi.pindahBerkas(
              dialog.berkas.map((b) => b.id),
              tujuan,
            );
            setTerpilih(new Set());
            setPesan(
              r.gagal.length
                ? { nada: 'galat', teks: `${r.gagal.length} berkas gagal dipindah: ${r.gagal[0].pesan}` }
                : { nada: 'sukses', teks: `${r.dipindah.length} berkas dipindah ke ${tujuan ?? judul}.` },
            );
          }
        }}
      />
      <ConfirmDialog
        open={dialog?.jenis === 'hapus'}
        onOpenChange={(o) => !o && setDialog(null)}
        title={
          dialog?.jenis === 'hapus' ? (dialog.f ? `Hapus folder ${dialog.f.nama}?` : dialog.berkas.length === 1 ? `Pindahkan ${dialog.berkas[0].nama} ke Sampah?` : `Pindahkan ${dialog.berkas.length} berkas ke Sampah?`) : ''
        }
        description={
          dialog?.jenis === 'hapus'
            ? dialog.f
              ? dialog.f.total_berkas
                ? `${dialog.f.total_berkas} berkas di dalamnya (termasuk subfolder) ikut pindah ke Sampah${teksMasaSampah}. Pulihkan dari Sampah bila perlu.`
                : 'Folder ini kosong.'
              : `Anda masih bisa memulihkannya dari Sampah${teksMasaSampah}. Berkas yang masih dipakai data lain tidak bisa dihapus.`
            : undefined
        }
        tone={dialog?.jenis === 'hapus' && !dialog.f ? 'primary' : 'danger'}
        icon={dialog?.jenis === 'hapus' && !dialog.f ? <Trash2 /> : undefined}
        confirmLabel={dialog?.jenis === 'hapus' ? (dialog.f ? 'Hapus folder' : 'Pindahkan ke Sampah') : 'Hapus'}
        onConfirm={jalankanHapus}
      />
      <DialogGantiNamaBerkas
        b={gantiNama}
        tutup={() => setGantiNama(null)}
        simpan={async (nama) => {
          if (!gantiNama) return;
          await aksi.ubahBerkas(gantiNama.id, { nama });
        }}
      />
      <DialogBagikanBerkas sasaran={dialog?.jenis === 'bagikan' ? dialog.sasaran : null} tutup={() => setDialog(null)} />
      {dialog?.jenis === 'lihat' && unit && (
        <DialogLihat
          unit={unit}
          b={dialog.b}
          f={dialog.f}
          pengelola={akses === 'kelola'}
          tutup={() => setDialog(null)}
          selesai={(teks) => {
            setDialog(null);
            aksi.segarkan();
            setPesan({ nada: 'sukses', teks });
          }}
        />
      )}
      <DialogBerkasBaru jenis={dialog?.jenis === 'baru' ? dialog.tipe : null} tutup={() => setDialog(null)} buat={buatBerkas} />
      <DialogPeriodeBerkas
        berkas={dialog?.jenis === 'periode' ? dialog.berkas : null}
        pilihan={daftarPeriode}
        tutup={() => setDialog(null)}
        simpan={async (kode) => {
          if (dialog?.jenis !== 'periode') return;
          const r = await aksi.ubahPeriode(
            dialog.berkas.map((b) => b.id),
            kode,
          );
          setTerpilih(new Set());
          if (r.gagal.length) throw new Error(`${r.gagal.length} berkas gagal diubah: ${r.gagal[0].pesan}`);
          setPesan({ nada: 'sukses', teks: `Periode ${dialog.berkas.length} berkas diubah ke ${namaPeriode(kode)}.` });
        }}
      />
      <Dialog
        open={dialog?.jenis === 'kebijakan'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Keamanan berkas"
        description={unit ? `Enkripsi isi berkas di ruang ${judul}.` : 'Enkripsi isi berkas pribadi Anda.'}
      >
        {dialog?.jenis === 'kebijakan' && <KebijakanEnkripsiBerkas unit={unit} />}
      </Dialog>
      <Pratinjau
        b={pratinjau}
        tutup={() => setPratinjau(null)}
        unduh={(b) => void unduh(b)}
        onAksi={
          pratinjau && pilih && onPilih ? (
            <Button onClick={() => (onPilih([pratinjau]), setPratinjau(null))}>
              <Check aria-hidden />
              {labelPilih ?? 'Pakai berkas ini'}
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}

// ================================================================ Siapa yang bisa melihat (ruang unit)

const LABEL_LIHAT: Record<string, string> = { pengelola: 'Pengelola', staf: 'Staf unit', semua: 'Semua anggota', mahasiswa: 'Mahasiswa', dosen: 'Dosen', tendik: 'Tendik' };

/** Teks pendek pengaturan `lihat`, mis. "Mahasiswa, Dosen". */
export function labelLihatBerkas(lihat?: string | null): string | null {
  if (!lihat) return null;
  return lihat
    .split(',')
    .map((x) => LABEL_LIHAT[x] ?? x)
    .join(', ');
}

/** Lencana kecil siapa yang bisa melihat berkas/folder unit; tidak tampil bila mengikuti folder induk. */
export function LencanaLihat({ lihat }: { lihat?: string | null }) {
  const label = labelLihatBerkas(lihat);
  if (!label) return null;
  return (
    <span className="u-mb-lihat" data-lihat={lihat ?? undefined} title={`Bisa dilihat: ${label}`}>
      {lihat === 'pengelola' ? <Lock aria-hidden /> : <Users aria-hidden />}
      {label}
    </span>
  );
}

function DialogLihat({ unit, b, f, pengelola, tutup, selesai }: { unit: string; b?: BerkasManajer; f?: FolderBerkas; pengelola: boolean; tutup: () => void; selesai: (teks: string) => void }) {
  const siakad = useSiakad();
  const awal = (b?.lihat ?? f?.lihat ?? '') as string;
  const [mode, setMode] = React.useState<'ikut' | 'pengelola' | 'staf' | 'pilih'>(!awal ? 'ikut' : awal === 'pengelola' || awal === 'staf' ? awal : 'pilih');
  const [peran, setPeran] = React.useState<string[]>(awal && !['pengelola', 'staf'].includes(awal) ? awal.split(',') : ['semua']);
  const [simpan, setSimpan] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const nama = b?.nama ?? f?.nama ?? '';
  const nilai = mode === 'ikut' ? '' : mode === 'pilih' ? (peran.includes('semua') ? 'semua' : peran.join(',')) : mode;
  const kirim = async () => {
    if (mode === 'pilih' && !peran.length) return setGalat('Pilih minimal satu kelompok.');
    setSimpan(true);
    setGalat(null);
    try {
      if (b) await siakad.request({ method: 'POST', path: `/v1/berkas/${encodeURIComponent(b.id)}/ubah`, body: { lihat: nilai } });
      else if (f) await siakad.request({ method: 'POST', path: '/v1/berkas/folder/ubah', body: { unit, path: f.path, lihat: nilai } });
      selesai(`Pengaturan akses ${nama} disimpan.`);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSimpan(false);
    }
  };
  const ubahPeran = (k: string, aktif: boolean) =>
    setPeran((p) => (k === 'semua' ? (aktif ? ['semua'] : []) : [...p.filter((x) => x !== 'semua' && x !== k), ...(aktif ? [k] : [])]));
  const opsi: Array<{ v: typeof mode; label: string; ket: string; kunci?: boolean }> = [
    { v: 'ikut', label: f ? 'Ikuti folder induk' : 'Ikuti folder', ket: 'Sama dengan pengaturan folder tempatnya (akar ruang: staf unit).' },
    { v: 'pengelola', label: 'Pengelola unit saja', ket: 'Hanya pengelola unit dan pengunggahnya.' },
    { v: 'staf', label: 'Staf unit', ket: 'Staf unit yang punya akses berkas; mahasiswa, dosen, dan tendik lain tidak melihat.' },
    { v: 'pilih', label: 'Anggota unit tertentu', ket: 'Buka untuk semua anggota atau peran tertentu yang terdaftar di unit (prodi/fakultas).', kunci: !pengelola },
  ];
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && tutup()}
      size="sm"
      title="Siapa yang bisa melihat"
      description={nama}
      footer={
        <>
          <Button variant="outline" onClick={tutup}>
            Batal
          </Button>
          <Button onClick={() => void kirim()} loading={simpan}>
            Simpan
          </Button>
        </>
      }
    >
      <div className="u-mb-lihat-opsi" role="radiogroup" aria-label="Siapa yang bisa melihat">
        {opsi.map((o) => (
          <label key={o.v} data-kunci={o.kunci ? '' : undefined}>
            <input type="radio" name="lihat" checked={mode === o.v} disabled={o.kunci} onChange={() => setMode(o.v)} />
            <span>
              <b>{o.label}</b>
              <small>{o.kunci ? 'Hanya pengelola unit yang bisa membuka berkas untuk mahasiswa, dosen, atau tendik.' : o.ket}</small>
            </span>
          </label>
        ))}
        {mode === 'pilih' && (
          <div className="u-mb-lihat-peran">
            {(['semua', 'mahasiswa', 'dosen', 'tendik'] as const).map((k) => (
              <label key={k}>
                <input type="checkbox" checked={peran.includes(k)} onChange={(e) => ubahPeran(k, e.target.checked)} />
                {LABEL_LIHAT[k]}
              </label>
            ))}
          </div>
        )}
        <p className="u-field-description">Pengelola unit selalu melihat semuanya. Berkas yang dibagikan langsung ke seseorang tetap terbuka untuknya.</p>
        {galat && <p className="u-field-error">{galat}</p>}
      </div>
    </Dialog>
  );
}

/** Kerangka kartu berkas saat memuat: gambar mini + dua baris teks, ukuran sama dengan kartu asli. */
function KartuMuat() {
  return (
    <span className="u-mb-kartu u-mb-muat" data-berkas="" aria-hidden>
      <i className="u-skeleton u-mb-muat-mini" />
      <i className="u-skeleton u-mb-muat-teks" />
      <i className="u-skeleton u-mb-muat-teks" data-pendek="" />
    </span>
  );
}

/** Kerangka baris berkas (tampilan daftar) saat memuat. */
function BarisMuat() {
  return (
    <span className="u-mb-baris u-mb-muat" aria-hidden>
      <i className="u-skeleton u-mb-muat-ikon" />
      <i className="u-skeleton u-mb-muat-teks" />
      <i className="u-skeleton u-mb-muat-teks" data-pendek="" />
    </span>
  );
}
