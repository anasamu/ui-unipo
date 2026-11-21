import * as React from 'react';
import type { NavGroup, NavItem } from './layout';
import type { ItemNavigasiBawah } from './platform';
import { fiturDariMenu, type ItemFitur } from './pencarian-fitur';

// Diganti bundler saat build (Vite/webpack/Next); tidak memerlukan @types/node.
declare const process: { env: { NODE_ENV?: string } };

// ================================================================ Menu aplikasi sebagai data
//
// Satu definisi menu per aplikasi (semua peran sekaligus). `susunMenu`/`useMenuAplikasi` menyaring izin, membuang induk
// dan kategori kosong, meratakan induk beranak satu, mengurutkan kategori standar, lalu menghitung menu aktif, judul
// halaman, dan data Cari fitur. `periksaMenu` menolak duplikat (rute, label, kunci, salinan bilah atas/menu akun) dan
// pelanggaran aturan menu (kategori > 6 item, induk beranak satu, induk berlabel sama dengan kategorinya, label sidebar
// lebih dari 22 huruf).
//
// Halaman bertab: item boleh berisi `tab` (halaman berkaitan yang digabung menjadi satu menu). Tiap tab punya rute
// sendiri (sub-rute atau `?tab=`) sehingga tautan lama, bookmark, dan Cari fitur tetap jalan; tab disaring izin seperti
// menu, dan item tanpa tab terlihat ikut disembunyikan. Halaman memakai `TabMenuHalaman` untuk menggambar deret tabnya.

/** Kategori standar UNIPO, urutannya tetap (rencana/menu-sidebar.md §2). */
export type KategoriStandar = 'beranda' | 'saya' | 'tugas' | 'bidang' | 'laporan' | 'administrasi' | 'pengaturan';

/** Urutan kategori standar: Beranda → … saya → Tugas & persetujuan → bidang → Laporan → Administrasi → Pengaturan. */
export const URUTAN_KATEGORI: readonly KategoriStandar[] = ['beranda', 'saya', 'tugas', 'bidang', 'laporan', 'administrasi', 'pengaturan'];

/** Judul bawaan kategori standar (kategori `saya` dan `bidang` wajib diberi `judul`; `beranda` tanpa judul). */
export const JUDUL_KATEGORI: Readonly<Record<KategoriStandar, string | undefined>> = {
  beranda: undefined,
  saya: undefined,
  tugas: 'Tugas & persetujuan',
  bidang: undefined,
  laporan: 'Laporan & statistik',
  administrasi: 'Administrasi',
  pengaturan: 'Pengaturan',
};

/** Fitur yang sudah ada di bilah atas KerangkaAplikasi; tidak boleh diulang di sidebar (label atau rute). */
export const BILAH_ATAS_BAWAAN: readonly string[] = ['Notifikasi', 'Berkas', 'Obrolan', 'Pesan', 'Pesan masuk', 'Pintasan', '/notifikasi', '/berkas', '/obrolan', '/pesan'];

/** Konteks pengguna untuk menyaring menu. */
export interface KonteksMenu {
  /** Pemeriksa izin milik aplikasi (scope API, izin RBAC, peran). Bila diisi, `izin` di bawah diabaikan. */
  punya?: (kode: string) => boolean;
  /** Daftar izin/scope pengguna; mendukung pola `x.*`, `*:admin`, `*`. */
  izin?: readonly string[];
  /** Pemegang superadmin melihat semua menu. */
  superadmin?: boolean;
  /** Data lain untuk izin berbentuk fungsi (peran, unit, bendera fitur). */
  [lain: string]: unknown;
}

/** Izin item: satu kode, salah satu dari beberapa kode, atau fungsi bebas. Kosong = semua pengguna. */
export type IzinMenu = string | readonly string[] | ((k: KonteksMenu) => boolean);

export interface ItemMenuDef {
  /** Kunci unik (pintasan, menu aktif). Bawaan = `ke`; induk tanpa `ke` bawaan `induk:<label>`. */
  kunci?: string;
  /** Label kapitalisasi kalimat, unik dalam satu aplikasi. */
  label: string;
  /** Rute (atau URL penuh untuk `luar`). Kosong untuk induk submenu. */
  ke?: string;
  /** Ikon: elemen (`<Users />`) atau komponen (`Users`). */
  ikon?: React.ReactNode | React.ComponentType;
  /** Keterangan satu baris: tooltip sidebar dan baris kecil di Cari fitur. */
  ket?: string;
  /** Sinonim untuk Cari fitur (larik, atau teks dipisah spasi). */
  kata?: string | readonly string[];
  /** Izin melihat item (salah satu cukup). Server tetap pemeriksa akhir. */
  izin?: IzinMenu;
  /** Submenu satu tingkat. Induk tanpa anak terlihat dibuang; induk beranak satu diratakan. */
  anak?: readonly ItemMenuDef[];
  /** Alamat lain yang mengaktifkan item ini, mis. `/kelas/:id` atau `/m/*`. */
  ruteTurunan?: readonly string[];
  /** Tautan ke aplikasi lain: dibuka di tab baru dengan penanda tautan keluar. */
  luar?: boolean;
  /** Lencana "Baru". */
  baru?: boolean;
  /**
   * Tampil di navigasi bawah ponsel. `true` = urutan definisi; angka = urutan (kecil dulu). Maks. 4 item (tombol
   * "Menu" ditambahkan otomatis oleh KerangkaAplikasi).
   */
  bawah?: boolean | number;
  /**
   * Label singkat (≤ 12 huruf) untuk navigasi bawah dan judul bilah atas di ponsel. Bila `label` lebih dari 22 huruf,
   * sidebar juga menampilkan `pendek` (label penuh tetap jadi tooltip, judul halaman, dan teks Cari fitur).
   */
  pendek?: string;
  /**
   * Halaman berkaitan yang digabung menjadi tab di satu halaman (bukan item sidebar terpisah). Item tampil bila ada tab
   * yang terlihat; `ke` item = alamat halaman (tab pertama, atau alamat dasar yang dialihkan ke tab pertama).
   */
  tab?: readonly TabMenuDef[];
  /** Pengecualian `periksaMenu` yang disengaja, berisi alasannya (mis. peran yang tidak pernah bertemu). */
  bolehGanda?: string;
  nonaktif?: boolean;
}

/** Satu tab halaman bertab (lihat `ItemMenuDef.tab`). */
export interface TabMenuDef {
  /** Kunci unik tab (bawaan = `ke`); dipakai `TabMenuHalaman` untuk memilih isi. */
  kunci?: string;
  /** Label tab (kapitalisasi kalimat), unik dalam satu halaman. */
  label: string;
  /** Rute tab: sub-rute (`/akun/riwayat`) atau rute dasar + `?tab=` (`/akun?tab=riwayat`). Wajib. */
  ke: string;
  /** Keterangan untuk Cari fitur. */
  ket?: string;
  /** Sinonim untuk Cari fitur. */
  kata?: string | readonly string[];
  /** Izin melihat tab (salah satu cukup); sama dengan izin API yang dipakai tab itu. */
  izin?: IzinMenu;
  /** Alamat lain yang mengaktifkan tab ini, mis. `/akun/riwayat/:id`. */
  ruteTurunan?: readonly string[];
  /** Lencana angka (mis. jumlah menunggu) diisi lewat `lencana` susunMenu dengan kunci tab. */
}

export interface KategoriMenuDef {
  kategori: KategoriStandar;
  /** Judul kategori. Bawaan dari `JUDUL_KATEGORI`; wajib untuk `saya` dan `bidang`. */
  judul?: string;
  /** Kunci untuk mengingat lipatan. Bawaan = judul (atau jenis kategori). */
  kunci?: string;
  izin?: IzinMenu;
  item: readonly ItemMenuDef[];
  /** Kategori ini terlipat saat pertama dibuka (bila sidebar memakai `lipatKategori`). */
  terlipat?: boolean;
}

export interface OpsiDefinisiMenu {
  /** Nama aplikasi untuk pesan peringatan. */
  nama?: string;
  /** Label/rute yang ada di menu akun (avatar), mis. ['Profil & akses saya']. */
  menuAkun?: readonly string[];
  /** Label/rute tambahan di bilah atas (selain `BILAH_ATAS_BAWAAN`). */
  bilahAtas?: readonly string[];
  /** Jalankan `periksaMenu` + console.warn saat dibuat. Bawaan: hanya saat pengembangan. */
  periksa?: boolean;
}

export interface DefinisiMenu {
  readonly kategori: readonly KategoriMenuDef[];
  readonly opsi: OpsiDefinisiMenu;
}

export type JenisMasalahMenu =
  | 'rute-ganda'
  | 'label-ganda'
  | 'kunci-ganda'
  | 'bilah-atas'
  | 'menu-akun'
  | 'kategori-penuh'
  | 'induk-satu-anak'
  | 'induk-sama-kategori'
  | 'kategori-ganda'
  | 'tanpa-judul'
  | 'bawah'
  | 'label-panjang'
  | 'tab';

export interface MasalahMenu {
  jenis: JenisMasalahMenu;
  pesan: string;
  /** Kunci item yang terlibat. */
  kunci: string[];
}

export interface OpsiPeriksaMenu {
  menuAkun?: readonly string[];
  bilahAtas?: readonly string[];
  /** Maksimal item tingkat atas per kategori. Bawaan `MAKS_ITEM` (6; keputusan Anas 2026-11-22). */
  maksItem?: number;
  /**
   * Maksimal huruf label sidebar (item, submenu, judul kategori) sebelum terpotong di lebar sidebar standar. Bawaan
   * `MAKS_LABEL` (22). Label lebih panjang wajib dipersingkat atau diberi `pendek` (yang lalu tampil di sidebar).
   */
  maksLabel?: number;
  /** Periksa menu yang terlihat untuk satu peran (setelah saring izin dan perataan), bukan definisi lengkap. */
  konteks?: KonteksMenu;
}

/** Hasil susunan menu untuk satu pengguna dan alamat. */
export interface HasilMenu {
  groups: NavGroup[];
  activeKey?: string;
  /** Label menu aktif (judul bilah atas). */
  judul?: string;
  /** "Kategori › Induk" menu aktif. */
  kelompok?: string;
  /** Data Cari fitur (Ctrl/⌘K) lengkap dengan keterangan dan kata kunci. */
  fitur: ItemFitur[];
  /** Navigasi bawah ponsel dari item ber-`bawah` yang terlihat (maks. 4, label singkat). Kosong = pakai bawaan kerangka. */
  navBawah: ItemNavigasiBawah[];
  /** Label singkat menu aktif (`pendek`) untuk judul bilah atas di ponsel. */
  judulPendek?: string;
  /** Tab halaman aktif bila menu aktif berupa halaman bertab (dipakai `TabMenuHalaman`). */
  tab?: TabHalamanAktif;
}

/** Tab terlihat milik halaman bertab yang sedang dibuka. */
export interface TabHalamanAktif {
  /** Kunci item menu pemilik tab. */
  induk: string;
  /** Label item menu (judul halaman). */
  judul: string;
  items: { key: string; label: string; href: string; badge?: React.ReactNode; keterangan?: string }[];
  /** Kunci tab aktif; kosong bila alamat sekarang adalah alamat dasar yang bukan tab. */
  aktif?: string;
  /** Alamat sekarang adalah tab yang tidak boleh dilihat pengguna ini (`TabMenuHalaman` mengalihkan ke tab pertama). */
  terlarang?: boolean;
}

export interface OpsiSusunMenu {
  /** Alamat sekarang (mis. `useLocation().pathname`, boleh ditambah `search` untuk tab ber-`?tab=`). */
  path?: string;
  /** Lencana per kunci item, mis. `{ '/akses/kepanitiaan': 3 }`. */
  lencana?: Readonly<Record<string, React.ReactNode>>;
}

// ---------------------------------------------------------------- pembantu

/** Apakah izin/scope pengguna `pola` mencakup kode `kode` (pola `x.*`, `*:admin`, `*`). */
export function cocokIzin(pola: string, kode: string): boolean {
  if (pola === kode || pola === '*') return true;
  if (!pola.includes('*')) return false;
  const re = new RegExp('^' + pola.split('*').map((s) => s.replace(/[.:+?^${}()|[\]\\/-]/g, '\\$&')).join('.*') + '$');
  return re.test(kode);
}

function bolehIzin(izin: IzinMenu | undefined, k: KonteksMenu): boolean {
  if (izin === undefined) return true;
  if (typeof izin === 'function') return izin(k);
  const daftar = typeof izin === 'string' ? [izin] : izin;
  if (!daftar.length) return true;
  if (k.superadmin) return true;
  if (k.punya) return daftar.some((x) => k.punya!(x));
  const milik = k.izin ?? [];
  return daftar.some((x) => milik.some((p) => cocokIzin(p, x)));
}

/** Rute tanpa query/hash dan tanpa garis miring akhir, huruf kecil. */
export function normalRute(ke: string): string {
  let r = ke.split('#')[0]!.split('?')[0]!.trim().toLowerCase();
  if (r.length > 1 && r.endsWith('/')) r = r.replace(/\/+$/, '');
  return r || '/';
}
const normalLabel = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

const kunciItem = (it: ItemMenuDef): string => it.kunci ?? it.ke ?? `induk:${it.label}`;
const judulKategori = (k: KategoriMenuDef): string | undefined => k.judul ?? JUDUL_KATEGORI[k.kategori];
const kunciKategori = (k: KategoriMenuDef): string => k.kunci ?? judulKategori(k) ?? k.kategori;

function ikonNode(ikon: ItemMenuDef['ikon']): React.ReactNode {
  if (ikon == null || React.isValidElement(ikon)) return ikon as React.ReactNode;
  if (typeof ikon === 'function' || (typeof ikon === 'object' && '$$typeof' in (ikon as object))) return React.createElement(ikon as React.ComponentType);
  return ikon as React.ReactNode;
}
const kataDaftar = (kata: ItemMenuDef['kata']): string[] | undefined =>
  kata === undefined ? undefined : typeof kata === 'string' ? kata.split(/\s+/).filter(Boolean) : [...kata];

function modeDev(): boolean {
  try {
    // Diganti bundler (Vite/webpack/Next) saat build; ReferenceError di lingkungan tanpa `process` = bukan dev.
    return process.env.NODE_ENV !== 'production';
  } catch {
    return false;
  }
}

/** Urutkan kategori menurut `URUTAN_KATEGORI` (stabil untuk kategori sejenis, mis. beberapa kategori bidang). */
function urutkan(kategori: readonly KategoriMenuDef[]): KategoriMenuDef[] {
  return kategori
    .map((k, i) => ({ k, i }))
    .sort((a, b) => URUTAN_KATEGORI.indexOf(a.k.kategori) - URUTAN_KATEGORI.indexOf(b.k.kategori) || a.i - b.i)
    .map((x) => x.k);
}

/** Maksimal item navigasi bawah dari definisi menu (ditambah tombol "Menu" oleh kerangka = 5). */
export const MAKS_BAWAH = 4;

/** Panjang label sidebar yang masih muat di lebar sidebar standar tanpa terpotong (diukur di Chrome 1440 px). */
export const MAKS_LABEL = 22;

/** Maksimal item tingkat atas per kategori sidebar (keputusan Anas 2026-11-22: sidebar ringkas, wajib di semua aplikasi). */
export const MAKS_ITEM = 6;

/** Label yang tampil di sidebar: `pendek` bila label terlalu panjang dan `pendek` diisi. */
export function labelSidebar(it: Pick<ItemMenuDef, 'label' | 'pendek'>): string {
  return it.label.length > MAKS_LABEL && it.pendek ? it.pendek : it.label;
}

const kunciTab = (t: TabMenuDef): string => t.kunci ?? t.ke;
/**
 * Alamat tautan item: untuk halaman bertab, `ke` bila itu tab yang terlihat (atau bukan tab), selain itu tab pertama yang
 * terlihat, sehingga sidebar, Cari fitur, dan navigasi bawah tidak membuka tab terlarang. Kunci item tetap dari `ke`.
 */
function hrefItem(it: ItemMenuDef): string | undefined {
  if (!it.tab?.length || !it.ke) return it.ke;
  const r = normalRute(it.ke);
  const q = queryTab(it.ke);
  const sendiri = it.tab.some((t) => normalRute(t.ke) === r && queryTab(t.ke) === q);
  const tersembunyi = ((it as ItemMenuDef & { [TERSEMBUNYI]?: TabMenuDef[] })[TERSEMBUNYI] ?? []).some((t) => normalRute(t.ke) === r && queryTab(t.ke) === q);
  return sendiri || !tersembunyi ? it.ke : it.tab[0]!.ke;
}
/** Tab yang disaring izin (disimpan di item hasil saring untuk mengenali alamat tab terlarang). */
const TERSEMBUNYI = Symbol('tabTersembunyi');

// ---------------------------------------------------------------- definisi

/**
 * Buat definisi menu aplikasi. Kategori diurutkan menurut kategori standar. Saat pengembangan, `periksaMenu` dijalankan
 * dan setiap masalah ditulis dengan `console.warn('[menu] …')`.
 *
 * ```ts
 * export const MENU = definisiMenu([
 *   { kategori: 'beranda', item: [{ label: 'Beranda', ke: '/', ikon: House }] },
 *   { kategori: 'tugas', item: [{ label: 'Persetujuan cuti', ke: '/cuti', ikon: Inbox, izin: 'sdm.cuti.setujui' }] },
 *   { kategori: 'bidang', judul: 'Kepegawaian', item: [ … ] },
 *   { kategori: 'pengaturan', item: [{ label: 'Tema tampilan', ke: '/tema', ikon: Palette }] },
 * ], { nama: 'SDM', menuAkun: ['Profil saya'] });
 * ```
 */
export function definisiMenu(kategori: readonly KategoriMenuDef[], opsi: OpsiDefinisiMenu = {}): DefinisiMenu {
  const def: DefinisiMenu = { kategori: urutkan(kategori), opsi };
  if (opsi.periksa ?? modeDev()) {
    for (const m of periksaMenu(def)) console.warn(`[menu${opsi.nama ? ` ${opsi.nama}` : ''}] ${m.pesan}`);
  }
  return def;
}

// ---------------------------------------------------------------- susun untuk satu pengguna

interface Daun {
  item: ItemMenuDef;
  induk?: ItemMenuDef;
  kategori: KategoriMenuDef;
}

/** Saring izin, buang induk/kategori kosong, ratakan induk beranak satu. Hasil tetap berupa definisi. */
function saring(def: DefinisiMenu, k: KonteksMenu): KategoriMenuDef[] {
  const out: KategoriMenuDef[] = [];
  for (const kat of def.kategori) {
    if (!bolehIzin(kat.izin, k)) continue;
    const item: ItemMenuDef[] = [];
    for (const it of kat.item) {
      if (!bolehIzin(it.izin, k)) continue;
      if (it.tab?.length) {
        const tab = it.tab.filter((t) => bolehIzin(t.izin, k));
        if (!tab.length || !it.ke) continue;
        item.push({ ...it, tab, [TERSEMBUNYI]: it.tab.filter((t) => !tab.includes(t)) } as ItemMenuDef);
        continue;
      }
      if (it.anak?.length) {
        const anak = it.anak
          .filter((c) => bolehIzin(c.izin, k) && (c.ke || c.anak?.length))
          .map((c) => {
            if (!c.tab?.length) return c;
            const tab = c.tab.filter((t) => bolehIzin(t.izin, k));
            return { ...c, tab, [TERSEMBUNYI]: c.tab.filter((t) => !tab.includes(t)) } as ItemMenuDef;
          })
          .filter((c) => !c.tab || c.tab.length);
        if (!anak.length) continue;
        // Induk beranak satu diratakan: anaknya naik menggantikan induk (ikon induk dipakai bila anak tanpa ikon).
        if (anak.length === 1) item.push({ ...anak[0]!, ikon: anak[0]!.ikon ?? it.ikon });
        else item.push({ ...it, anak });
      } else if (it.ke) item.push(it);
    }
    if (item.length) out.push({ ...kat, item });
  }
  return out;
}

function polaCocok(pola: string, path: string): number {
  const p = normalRute(pola);
  const x = normalRute(path);
  if (p === '/') return x === '/' ? 1 : -1;
  if (p.endsWith('/*')) {
    const dasar = p.slice(0, -2);
    return x === dasar || x.startsWith(`${dasar}/`) ? dasar.length : -1;
  }
  if (p.includes(':')) {
    const re = new RegExp('^' + p.split('/').map((s) => (s.startsWith(':') ? '[^/]+' : s.replace(/[.+?^${}()|[\]\\-]/g, '\\$&'))).join('/') + '(/.*)?$');
    return re.test(x) ? p.replace(/:[^/]+/g, '').length : -1;
  }
  return x === p || x.startsWith(`${p}/`) ? p.length : -1;
}

function cariAktif(daun: Daun[], path?: string): Daun | undefined {
  if (!path) return undefined;
  let hasil: { d: Daun; n: number } | undefined;
  for (const d of daun) {
    if (d.item.luar || !d.item.ke) continue;
    // Tab tersembunyi ikut dicocokkan agar alamat tab terlarang tetap mengaktifkan halamannya (lalu dialihkan).
    const semuaTab = [...(d.item.tab ?? []), ...((d.item as ItemMenuDef & { [TERSEMBUNYI]?: TabMenuDef[] })[TERSEMBUNYI] ?? [])];
    const ruteTab = semuaTab.flatMap((t) => [t.ke, ...(t.ruteTurunan ?? [])]);
    for (const pola of [d.item.ke, ...(d.item.ruteTurunan ?? []), ...ruteTab]) {
      const n = polaCocok(pola, path);
      if (n >= 0 && (!hasil || n > hasil.n)) hasil = { d, n };
    }
  }
  return hasil?.d;
}

function keNav(it: ItemMenuDef, lencana: OpsiSusunMenu['lencana']): NavItem {
  const key = kunciItem(it);
  // Lencana halaman bertab = jumlah lencana angka tabnya bila item sendiri tanpa lencana.
  const lencanaTab = it.tab?.reduce<number>((n, t) => n + (typeof lencana?.[kunciTab(t)] === 'number' ? (lencana[kunciTab(t)] as number) : 0), 0);
  return {
    key,
    label: labelSidebar(it),
    labelTeks: it.label,
    icon: ikonNode(it.ikon),
    href: hrefItem(it),
    badge: lencana?.[key] ?? (lencanaTab || undefined),
    keterangan: it.ket,
    kataKunci: kataDaftar(it.kata),
    luar: it.luar || undefined,
    baru: it.baru || undefined,
    disabled: it.nonaktif || undefined,
    children: it.anak?.map((c) => keNav(c, lencana)),
  };
}

/** Query `tab=` dari rute (atau null). */
function queryTab(ke: string): string | null {
  const q = ke.split('#')[0]!.split('?')[1];
  return q ? new URLSearchParams(q).get('tab') : null;
}

/** Tab aktif: rute tab yang cocok paling panjang; untuk tab ber-`?tab=` nilai query juga harus sama. */
function tabAktif(tab: readonly TabMenuDef[], path?: string): string | undefined {
  return cocokTab(tab, path)?.k;
}
function cocokTab(tab: readonly TabMenuDef[], path?: string): { k: string; n: number } | undefined {
  if (!path) return undefined;
  const qPath = queryTab(path);
  let hasil: { k: string; n: number } | undefined;
  for (const t of tab) {
    const qt = queryTab(t.ke);
    for (const pola of [t.ke, ...(t.ruteTurunan ?? [])]) {
      let n = polaCocok(pola, path);
      if (n < 0) continue;
      if (qt !== null) {
        if (qt !== qPath) continue;
        n += 1000; // ?tab= yang cocok lebih spesifik daripada rute dasar yang sama
      } else if (qPath !== null && normalRute(pola) === normalRute(path) && tab.some((x) => queryTab(x.ke) === qPath)) continue;
      if (!hasil || n > hasil.n) hasil = { k: kunciTab(t), n };
    }
  }
  return hasil;
}

/** Alamat cocok dengan tab tersembunyi secara lebih spesifik daripada tab yang terlihat. */
function tabTerlarang(item: ItemMenuDef, path?: string): boolean {
  const sembunyi = (item as ItemMenuDef & { [TERSEMBUNYI]?: TabMenuDef[] })[TERSEMBUNYI];
  if (!sembunyi?.length) return false;
  const s = cocokTab(sembunyi, path);
  if (!s) return false;
  const v = cocokTab(item.tab ?? [], path);
  return !v || s.n > v.n;
}

/** Susun menu untuk satu pengguna: grup Sidebar, menu aktif, judul, kelompok, dan data Cari fitur. */
export function susunMenu(def: DefinisiMenu, konteks: KonteksMenu = {}, opsi: OpsiSusunMenu = {}): HasilMenu {
  const terlihat = saring(def, konteks);
  const daun: Daun[] = terlihat.flatMap((kategori) =>
    kategori.item.flatMap((item) => (item.anak?.length ? item.anak.map((c) => ({ item: c, induk: item, kategori })) : [{ item, kategori }])),
  );
  const aktif = cariAktif(daun, opsi.path);
  const groups: NavGroup[] = terlihat.map((kat) => ({
    label: judulKategori(kat),
    kunci: kunciKategori(kat),
    terlipat: kat.terlipat || undefined,
    items: kat.item.map((it) => keNav(it, opsi.lencana)),
  }));
  const kelompok = aktif ? [judulKategori(aktif.kategori), aktif.induk?.label].filter(Boolean).join(' › ') || undefined : undefined;
  const navBawah: ItemNavigasiBawah[] = daun
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.item.bawah !== undefined && d.item.bawah !== false && d.item.ke && !d.item.luar && !d.item.nonaktif)
    .sort((a, b) => (typeof a.d.item.bawah === 'number' ? a.d.item.bawah : 1000 + a.i) - (typeof b.d.item.bawah === 'number' ? b.d.item.bawah : 1000 + b.i))
    .slice(0, MAKS_BAWAH)
    .map(({ d }) => {
      const key = kunciItem(d.item);
      return { key, label: d.item.pendek ?? d.item.label, icon: ikonNode(d.item.ikon ?? d.induk?.ikon), href: hrefItem(d.item), badge: opsi.lencana?.[key] ?? undefined };
    });
  // Cari fitur: tiap tab halaman bertab ikut dicari (selain tab yang alamatnya sama dengan item).
  const fitur = fiturDariMenu(groups);
  for (const d of daun) {
    if (!d.item.tab?.length || d.item.luar) continue;
    const kInduk = kunciItem(d.item);
    const pos = fitur.findIndex((f) => f.key === kInduk);
    const kelompokTab = [judulKategori(d.kategori), d.induk?.label, d.item.label].filter(Boolean).join(' › ');
    const hrefInduk = hrefItem(d.item)!;
    const extra = d.item.tab
      .filter((t) => normalRute(t.ke) !== normalRute(hrefInduk) || queryTab(t.ke) !== queryTab(hrefInduk))
      .map<ItemFitur>((t) => ({ key: `tab:${kunciTab(t)}`, label: t.label, href: t.ke, icon: ikonNode(d.item.ikon ?? d.induk?.ikon), kelompok: kelompokTab, keterangan: t.ket, kataKunci: kataDaftar(t.kata) }));
    fitur.splice(pos < 0 ? fitur.length : pos + 1, 0, ...extra);
  }
  const tab: TabHalamanAktif | undefined = aktif?.item.tab?.length
    ? {
        induk: kunciItem(aktif.item),
        judul: aktif.item.label,
        items: aktif.item.tab.map((t) => ({ key: kunciTab(t), label: t.label, href: t.ke, badge: opsi.lencana?.[kunciTab(t)] ?? undefined, keterangan: t.ket })),
        aktif: tabAktif(aktif.item.tab, opsi.path),
        terlarang: tabTerlarang(aktif.item, opsi.path) || undefined,
      }
    : undefined;
  return {
    groups,
    activeKey: aktif ? kunciItem(aktif.item) : undefined,
    judul: aktif?.item.label,
    judulPendek: aktif?.item.pendek,
    kelompok,
    fitur,
    navBawah,
    tab,
  };
}

/**
 * Hook menu aplikasi: `susunMenu` yang di-memo. `konteks` sebaiknya stabil (useMemo) agar tidak menyusun ulang tiap render.
 *
 * ```tsx
 * const menu = useMenuAplikasi(MENU, { konteks, path: useLocation().pathname, lencana });
 * <KerangkaAplikasi kode="sdm" menu={menu} … />
 * ```
 */
export function useMenuAplikasi(def: DefinisiMenu, opsi: OpsiSusunMenu & { konteks?: KonteksMenu } = {}): HasilMenu {
  const { konteks, path, lencana } = opsi;
  return React.useMemo(() => susunMenu(def, konteks, { path, lencana }), [def, konteks, path, lencana]);
}

// ---------------------------------------------------------------- pemeriksaan

/**
 * Periksa definisi menu: rute ganda (query diabaikan), label ganda (tanpa beda huruf, termasuk label induk), kunci
 * ganda, item yang sudah ada di bilah atas atau menu akun, kategori lebih dari `maksItem` item, induk beranak satu,
 * induk berlabel sama dengan kategorinya, dan judul kategori ganda. Item ber-`bolehGanda` dilewati untuk rute/label.
 * Dengan `konteks`, yang diperiksa adalah menu yang terlihat untuk peran itu.
 *
 * Pakai di uji aplikasi: `expect(periksaMenu(MENU)).toEqual([])`.
 */
export function periksaMenu(def: DefinisiMenu, opsi: OpsiPeriksaMenu = {}): MasalahMenu[] {
  const maks = opsi.maksItem ?? MAKS_ITEM;
  const maksLabel = opsi.maksLabel ?? MAKS_LABEL;
  const kategori = opsi.konteks ? saring(def, opsi.konteks) : def.kategori;
  const masalah: MasalahMenu[] = [];
  const tambah = (jenis: JenisMasalahMenu, pesan: string, kunci: string[]) => masalah.push({ jenis, pesan, kunci });

  const akun = [...(def.opsi.menuAkun ?? []), ...(opsi.menuAkun ?? [])];
  const atas = [...BILAH_ATAS_BAWAAN, ...(def.opsi.bilahAtas ?? []), ...(opsi.bilahAtas ?? [])];
  const pecah = (daftar: string[]) => ({
    rute: new Set(daftar.filter((x) => x.startsWith('/')).map(normalRute)),
    label: new Set(daftar.filter((x) => !x.startsWith('/')).map(normalLabel)),
  });
  const akunP = pecah(akun);
  const atasP = pecah(atas);

  const rute = new Map<string, ItemMenuDef[]>();
  const label = new Map<string, ItemMenuDef[]>();
  const kunci = new Map<string, ItemMenuDef[]>();
  const judul = new Map<string, number>();
  let jumlahBawah = 0;
  const catat = (m: Map<string, ItemMenuDef[]>, k: string, it: ItemMenuDef) => m.set(k, [...(m.get(k) ?? []), it]);

  for (const kat of kategori) {
    const j = judulKategori(kat);
    if (!j && kat.kategori !== 'beranda') tambah('tanpa-judul', `kategori ${kat.kategori} tanpa judul`, []);
    if (j) judul.set(normalLabel(j), (judul.get(normalLabel(j)) ?? 0) + 1);
    if (j && j.trim().length > maksLabel) tambah('label-panjang', `judul kategori "${j}" ${j.trim().length} huruf (maks. ${maksLabel}); persingkat`, []);
    if (kat.item.length > maks) tambah('kategori-penuh', `kategori "${j ?? kat.kategori}" berisi ${kat.item.length} item (maks. ${maks}); kelompokkan ke submenu`, kat.item.map(kunciItem));
    const periksaItem = (it: ItemMenuDef, induk?: ItemMenuDef) => {
      const k = kunciItem(it);
      catat(kunci, k, it);
      if (!it.bolehGanda) catat(label, normalLabel(it.label), it);
      if (it.ke && !it.bolehGanda) catat(rute, normalRute(it.ke), it);
      const tampil = labelSidebar(it).trim();
      if (tampil.length > maksLabel) tambah('label-panjang', `label sidebar "${it.label}" ${tampil.length} huruf (maks. ${maksLabel}); persingkat atau isi \`pendek\` (penjelasan ke \`ket\`)`, [k]);
      if (it.tab) {
        if (it.anak?.length) tambah('tab', `"${it.label}" tidak boleh punya \`tab\` dan \`anak\` sekaligus`, [k]);
        if (!it.ke) tambah('tab', `halaman bertab "${it.label}" tanpa \`ke\` (alamat halaman)`, [k]);
        if (!opsi.konteks && it.tab.length < 2) tambah('tab', `halaman bertab "${it.label}" hanya punya ${it.tab.length} tab; jadikan item biasa`, [k]);
        const labelTab = new Set<string>();
        const ruteSendiri = it.ke ? normalRute(it.ke) + (queryTab(it.ke) ? `?tab=${queryTab(it.ke)}` : '') : '';
        for (const t of it.tab) {
          const lt = normalLabel(t.label);
          if (labelTab.has(lt)) tambah('tab', `tab "${t.label}" ganda di halaman "${it.label}"`, [k]);
          labelTab.add(lt);
          if (!t.ke?.trim()) {
            tambah('tab', `tab "${t.label}" di "${it.label}" tanpa rute; isi \`ke\` agar bisa ditautkan dan dicari`, [k]);
            continue;
          }
          const rt = normalRute(t.ke) + (queryTab(t.ke) ? `?tab=${queryTab(t.ke)}` : '');
          // Tab yang alamatnya sama dengan alamat halaman tidak dihitung ganda; tab ber-`?tab=` di rute halaman juga bukan
          // rute ganda (dibedakan nilai query-nya).
          if (rt !== ruteSendiri && normalRute(t.ke) !== normalRute(it.ke ?? '') && !it.bolehGanda) catat(rute, rt, { ...t, label: `${it.label} › ${t.label}` });
        }
      }
      if (it.ke && atasP.rute.has(normalRute(it.ke))) tambah('bilah-atas', `"${it.label}" (${it.ke}) sudah ada di bilah atas`, [k]);
      else if (atasP.label.has(normalLabel(it.label))) tambah('bilah-atas', `"${it.label}" sudah ada di bilah atas`, [k]);
      if (it.ke && akunP.rute.has(normalRute(it.ke))) tambah('menu-akun', `"${it.label}" (${it.ke}) sudah ada di menu akun`, [k]);
      else if (akunP.label.has(normalLabel(it.label))) tambah('menu-akun', `"${it.label}" sudah ada di menu akun`, [k]);
      if (it.bawah !== undefined && it.bawah !== false) {
        jumlahBawah++;
        const lbl = (it.pendek ?? it.label).trim();
        if (!lbl) tambah('bawah', `item navigasi bawah ${k} tanpa label`, [k]);
        else if (lbl.startsWith('/')) tambah('bawah', `label navigasi bawah "${lbl}" berupa rute; isi label/pendek`, [k]);
        else if (lbl.length > 12) tambah('bawah', `label navigasi bawah "${lbl}" lebih dari 12 huruf; isi \`pendek\``, [k]);
        if (!it.ke || it.luar || it.anak?.length) tambah('bawah', `"${it.label}" tidak bisa di navigasi bawah (butuh rute aplikasi sendiri, bukan induk/tautan keluar)`, [k]);
        if (!it.ikon && !induk?.ikon) tambah('bawah', `item navigasi bawah "${it.label}" tanpa ikon`, [k]);
      }
      if (it.anak) {
        if (!induk && it.anak.length === 1) tambah('induk-satu-anak', `induk "${it.label}" hanya beranak satu; ratakan`, [k]);
        if (j && normalLabel(it.label) === normalLabel(j)) tambah('induk-sama-kategori', `induk "${it.label}" berlabel sama dengan kategorinya`, [k]);
        it.anak.forEach((c) => periksaItem(c, it));
      }
    };
    kat.item.forEach((it) => periksaItem(it));
  }
  for (const [r, its] of rute) if (its.length > 1) tambah('rute-ganda', `rute ganda: ${r} dipakai ${its.map((x) => `"${x.label}"`).join(' dan ')}`, its.map(kunciItem));
  for (const [, its] of label) if (its.length > 1) tambah('label-ganda', `label ganda: "${its[0]!.label}" dipakai ${its.length} kali (${its.map((x) => x.ke ?? 'induk').join(', ')})`, its.map(kunciItem));
  for (const [k, its] of kunci) if (its.length > 1) tambah('kunci-ganda', `kunci ganda: ${k} (${its.map((x) => `"${x.label}"`).join(', ')})`, [k]);
  // Jumlah dihitung per peran (dengan `konteks`): peran berbeda boleh punya item bawah berbeda.
  if (opsi.konteks && jumlahBawah > MAKS_BAWAH) tambah('bawah', `navigasi bawah berisi ${jumlahBawah} item (maks. ${MAKS_BAWAH} + Menu)`, []);
  for (const [j, n] of judul) if (n > 1) tambah('kategori-ganda', `judul kategori "${j}" dipakai ${n} kali`, []);
  return masalah;
}
