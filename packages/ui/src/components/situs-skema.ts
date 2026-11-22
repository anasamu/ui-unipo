import { Megaphone, Menu as MenuIcon, PanelBottom, PanelRight, PanelTop, Rows3, type LucideIcon } from 'lucide-react';
import type { KolomBlok, TombolLanding } from './landing-skema';
import { idBlok, urlAman } from './landing-skema';

/**
 * Skema kerangka situs publik aplikasi: pita pengumuman, bilah atas, kepala situs (navbar), menu utama bertingkat
 * (dropdown dan mega menu), kaki situs, dan sidebar halaman dalam. Satu sumber untuk renderer (KerangkaSitus),
 * penyunting (PenyuntingSitus di Pengaturan tema), dan preset. Cermin pembersih server SIAKAD
 * (app/Modules/Tema/Services/SkemaSitus.php): kolom baru harus ditambahkan di kedua tempat. Data di
 * GET /v1/tema/{aplikasi}/situs (berversi: draf, terbit, riwayat).
 */

export type JenisSosial = 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'x' | 'linkedin' | 'threads' | 'whatsapp' | 'email' | 'website';

export interface TautanSitus {
  label?: string;
  /** /alamat, #bagian, https://, mailto:, tel:, aksi:<kunci>, atau berkas:<uuid> (unduhan berkas publik). */
  url?: string;
  baru?: boolean;
}

export interface SosialSitus {
  jenis?: JenisSosial;
  url?: string;
}

export interface ButirMenu {
  id: string;
  label?: string;
  url?: string;
  keterangan?: string;
  ikon?: string;
  /** Label kecil di samping menu, mis. "Dibuka". */
  lencana?: string;
  baru?: boolean;
  anak?: ButirMenu[];
  /** Kartu sorotan di kanan mega menu (hanya menu tingkat 1). */
  sorot?: { label?: string; judul?: string; teks?: string; url?: string; gambar?: string; tombol?: string };
}

export type JenisWidget = 'kabar' | 'tautan' | 'teks' | 'kontak' | 'ajakan' | 'cari';

export interface WidgetSidebar {
  id: string;
  jenis?: JenisWidget;
  judul?: string;
  sumber?: 'berita' | 'pengumuman' | 'agenda';
  situs?: string;
  jumlah?: number;
  teks?: string;
  tautan?: TautanSitus[];
  tombol?: TombolLanding[];
}

export interface DokumenSitus {
  versi: 1;
  pita: { aktif?: boolean; nada?: 'utama' | 'aksen' | 'lembut' | 'gelap'; tutup?: boolean; butir?: Array<{ teks?: string; url?: string; label?: string }> };
  atas: { aktif?: boolean; telepon?: string; surel?: string; whatsapp?: string; jam?: string; tautan?: TautanSitus[]; sosial?: SosialSitus[] };
  kepala: {
    tampilan?: 'aplikasi' | 'portal' | 'ringkas';
    lengket?: boolean;
    transparan?: boolean;
    rata?: 'kiri' | 'tengah';
    cari?: boolean;
    cari_url?: string;
    cari_contoh?: string;
    /** Tambahkan bagian halaman landing yang bertanda menu (gaya.menu) ke menu utama. */
    menu_bagian?: boolean;
    tombol?: TombolLanding[];
  };
  menu: ButirMenu[];
  kaki: {
    aktif?: boolean;
    tampilan?: 'gelap' | 'terang' | 'ringkas';
    teks?: string;
    alamat?: string;
    telepon?: string;
    surel?: string;
    whatsapp?: string;
    jam?: string;
    peta_url?: string;
    kolom?: Array<{ judul?: string; tautan?: TautanSitus[] }>;
    sosial?: SosialSitus[];
    tautan_bawah?: TautanSitus[];
    hak_cipta?: string;
    ke_atas?: boolean;
    ajakan_judul?: string;
    ajakan_teks?: string;
    ajakan_tombol?: TombolLanding[];
  };
  sidebar: { aktif?: boolean; posisi?: 'kiri' | 'kanan'; lengket?: boolean; widget?: WidgetSidebar[] };
}

export const BATAS_MENU = { 1: 10, 2: 16, 3: 12 } as const;

// ---------------------------------------------------------------- aturan pembersih (cermin SkemaSitus.php)

/**
 * Aturan kolom bergaya server: t:N teks, p:N paragraf, u tautan, ub tautan atau berkas:<uuid>, g gambar, c:a|b
 * pilihan, i:min:max angka, b ya/tidak, k kunci, tombol:N. Objek bertingkat = { o: {...} }, daftar = { n, f }.
 */
type Aturan = string | { o: Record<string, Aturan> } | { n: number; f: Record<string, Aturan> };

const SOSIAL_C = 'c:instagram|facebook|youtube|tiktok|x|linkedin|threads|whatsapp|email|website';
const tautanA = (n: number): Aturan => ({ n, f: { label: 't:40', url: 'ub', baru: 'b' } });
const sosialA: Aturan = { n: 8, f: { jenis: SOSIAL_C, url: 'u' } };
const butirMenuA: Record<string, Aturan> = { id: 'k', label: 't:40', url: 'ub', keterangan: 't:120', ikon: 'k', baru: 'b', lencana: 't:20' };
const TOMBOL_A: Record<string, Aturan> = { label: 't:40', url: 'u', gaya: 'c:utama|garis|teks|aksen', baru: 'b' };

export const ATURAN_SITUS: Record<string, Aturan> = {
  pita: { o: { aktif: 'b', nada: 'c:utama|aksen|lembut|gelap', tutup: 'b', butir: { n: 5, f: { teks: 't:200', url: 'ub', label: 't:30' } } } },
  atas: { o: { aktif: 'b', telepon: 't:40', surel: 't:120', whatsapp: 't:40', jam: 't:120', tautan: tautanA(6), sosial: sosialA } },
  kepala: { o: { tampilan: 'c:aplikasi|portal|ringkas', lengket: 'b', transparan: 'b', rata: 'c:kiri|tengah', cari: 'b', cari_url: 'u', cari_contoh: 't:60', menu_bagian: 'b', tombol: 'tombol:2' } },
  menu: {
    n: BATAS_MENU[1],
    f: {
      ...butirMenuA,
      anak: { n: BATAS_MENU[2], f: { ...butirMenuA, anak: { n: BATAS_MENU[3], f: butirMenuA } } },
      sorot: { o: { label: 't:40', judul: 't:80', teks: 'p:200', url: 'ub', gambar: 'g', tombol: 't:30' } },
    },
  },
  kaki: {
    o: {
      aktif: 'b',
      tampilan: 'c:gelap|terang|ringkas',
      teks: 'p:300',
      alamat: 'p:300',
      telepon: 't:40',
      surel: 't:120',
      whatsapp: 't:40',
      jam: 't:120',
      peta_url: 'u',
      kolom: { n: 4, f: { judul: 't:60', tautan: tautanA(10) } },
      sosial: sosialA,
      tautan_bawah: tautanA(6),
      hak_cipta: 't:160',
      ke_atas: 'b',
      ajakan_judul: 't:140',
      ajakan_teks: 't:200',
      ajakan_tombol: 'tombol:2',
    },
  },
  sidebar: {
    o: {
      aktif: 'b',
      posisi: 'c:kiri|kanan',
      lengket: 'b',
      widget: {
        n: 8,
        f: {
          id: 'k',
          jenis: 'c:kabar|tautan|teks|kontak|ajakan|cari',
          judul: 't:80',
          sumber: 'c:berita|pengumuman|agenda',
          situs: 'k',
          jumlah: 'i:2:8',
          teks: 'p:600',
          tautan: tautanA(10),
          tombol: 'tombol:2',
        },
      },
    },
  },
};

const isObjek = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const RE_BERKAS = /^berkas:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** `berkas:<uuid>` (huruf kecil) atau undefined. */
export function berkasRujukan(v: unknown): string | undefined {
  const m = typeof v === 'string' ? RE_BERKAS.exec(v.trim()) : null;
  return m ? `berkas:${m[1]!.toLowerCase()}` : undefined;
}

/** Tautan menu/kaki: tautan aman (urlAman) atau rujukan berkas publik. */
export const tautanSitusAman = (v: unknown): string | undefined => berkasRujukan(v) ?? urlAman(v);

function nilai(v: unknown, a: string): unknown {
  const [jenis, arg = ''] = a.split(/:(.*)/s);
  switch (jenis) {
    case 't':
    case 'p': {
      if (typeof v !== 'string' && typeof v !== 'number') return undefined;
      let s = String(v).replace(/\r\n?/g, '\n');
      s = jenis === 't' ? s.replace(/\s+/g, ' ') : s.replace(/\n{3,}/g, '\n\n');
      return s.trim().slice(0, Number(arg) || 1);
    }
    case 'u':
      return urlAman(v);
    case 'ub':
      return tautanSitusAman(v);
    case 'g': {
      const b = berkasRujukan(v);
      if (b) return b;
      const u = urlAman(v);
      return u && (u.startsWith('https://') || (u.startsWith('/') && !u.startsWith('//'))) ? u : undefined;
    }
    case 'k':
      return typeof v === 'string' && /^[a-z0-9][a-z0-9_-]{0,39}$/.test(v) ? v : undefined;
    case 'c':
      return typeof v === 'string' && arg.split('|').includes(v) ? v : undefined;
    case 'b':
      return typeof v === 'boolean' ? v : v === 1 || v === '1' ? true : v === 0 || v === '0' ? false : undefined;
    case 'i': {
      const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
      if (!Number.isFinite(n)) return undefined;
      const [min, max] = arg.split(':').map(Number);
      return Math.round(Math.max(min!, Math.min(max!, n)));
    }
    case 'tombol':
      return daftarBersih(v, Number(arg), TOMBOL_A);
    default:
      return undefined;
  }
}

function daftarBersih(v: unknown, n: number, f: Record<string, Aturan>): Record<string, unknown>[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: Record<string, unknown>[] = [];
  for (const x of v.slice(0, n)) {
    if (!isObjek(x)) continue;
    const b = objekBersih(x, f);
    if (Object.keys(b).length) out.push(b);
  }
  return out.length ? out : undefined;
}

/** Bersihkan objek menurut aturan; kunci tak dikenal dan nilai kosong dibuang. */
export function objekBersih(o: Record<string, unknown>, aturan: Record<string, Aturan>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, a] of Object.entries(aturan)) {
    if (!(k in o)) continue;
    const v = typeof a === 'string' ? nilai(o[k], a) : 'o' in a ? (isObjek(o[k]) ? objekBersih(o[k] as Record<string, unknown>, a.o) : undefined) : daftarBersih(o[k], a.n, a.f);
    if (v === undefined || v === '' || (Array.isArray(v) && !v.length) || (isObjek(v) && !Object.keys(v).length)) continue;
    out[k] = v;
  }
  return out;
}

/** Id unik untuk butir menu/widget yang belum punya id (agar penyunting dan React stabil). */
function beriId<T extends { id?: string; anak?: T[] }>(daftar: T[] | undefined, ada: Set<string>): T[] {
  return (daftar ?? []).map((b) => {
    let id = b.id && !ada.has(b.id) ? b.id : idBlok();
    while (ada.has(id)) id = idBlok();
    ada.add(id);
    return { ...b, id, ...(b.anak ? { anak: beriId(b.anak, ada) } : {}) };
  });
}

/** Rapikan dokumen situs dari API/preset: kolom dan batas sama dengan server, id menu/widget unik. */
export function normalisasiSitus(d: unknown): DokumenSitus {
  const o = objekBersih(isObjek(d) ? d : {}, ATURAN_SITUS) as Partial<DokumenSitus>;
  const ada = new Set<string>();
  const sidebar = { ...(o.sidebar ?? {}) };
  if (sidebar.widget) sidebar.widget = beriId(sidebar.widget as Array<WidgetSidebar & { anak?: never }>, ada);
  return {
    versi: 1,
    pita: o.pita ?? {},
    atas: o.atas ?? {},
    kepala: o.kepala ?? {},
    menu: beriId(o.menu as ButirMenu[] | undefined, ada),
    kaki: o.kaki ?? {},
    sidebar,
  };
}

// ---------------------------------------------------------------- operasi pohon menu (penyunting)

export type JalurMenu = number[];

/** Butir pada jalur [i, j, k]. */
export function butirDi(menu: ButirMenu[], jalur: JalurMenu): ButirMenu | undefined {
  let daftar: ButirMenu[] | undefined = menu;
  let b: ButirMenu | undefined;
  for (const i of jalur) {
    b = daftar?.[i];
    daftar = b?.anak;
  }
  return b;
}

/** Jalur butir berdasarkan id. */
export function jalurMenu(menu: ButirMenu[], id: string, awal: JalurMenu = []): JalurMenu | null {
  for (let i = 0; i < menu.length; i++) {
    const b = menu[i]!;
    if (b.id === id) return [...awal, i];
    const j = b.anak ? jalurMenu(b.anak, id, [...awal, i]) : null;
    if (j) return j;
  }
  return null;
}

/** Kedalaman subpohon (butir tanpa anak = 1). */
export function kedalaman(b: ButirMenu): number {
  return 1 + Math.max(0, ...(b.anak ?? []).map(kedalaman));
}

function ubahDaftar(menu: ButirMenu[], induk: JalurMenu, f: (d: ButirMenu[]) => ButirMenu[]): ButirMenu[] {
  if (!induk.length) return f(menu);
  const [i, ...sisa] = induk;
  return menu.map((b, j) => (j === i ? { ...b, anak: ubahDaftar(b.anak ?? [], sisa, f) } : b));
}

const rapikanAnak = (b: ButirMenu): ButirMenu => (b.anak && !b.anak.length ? (({ anak: _a, ...r }) => r)(b) : b);

/** Ubah satu butir (mis. label/url) lewat jalur. */
export function setelButir(menu: ButirMenu[], jalur: JalurMenu, f: (b: ButirMenu) => ButirMenu): ButirMenu[] {
  const induk = jalur.slice(0, -1);
  const i = jalur[jalur.length - 1]!;
  return ubahDaftar(menu, induk, (d) => d.map((b, j) => (j === i ? f(b) : b)));
}

export function hapusButir(menu: ButirMenu[], jalur: JalurMenu): ButirMenu[] {
  const induk = jalur.slice(0, -1);
  const i = jalur[jalur.length - 1]!;
  const hasil = ubahDaftar(menu, induk, (d) => d.filter((_, j) => j !== i));
  return induk.length ? setelButir(hasil, induk, rapikanAnak) : hasil;
}

/** Tambah butir sebagai anak `induk` (atau di tingkat 1), bila batas dan kedalaman mengizinkan. */
export function tambahButir(menu: ButirMenu[], induk: JalurMenu | null, butir: ButirMenu): ButirMenu[] {
  const tingkat = (induk?.length ?? 0) + 1;
  if (tingkat > 3) return menu;
  const daftar = induk ? (butirDi(menu, induk)?.anak ?? []) : menu;
  if (daftar.length >= BATAS_MENU[tingkat as 1 | 2 | 3]) return menu;
  return ubahDaftar(menu, induk ?? [], (d) => [...d, butir]);
}

/**
 * Pindahkan butir ke posisi baru (tujuan = jalur induk + indeks sisip, dihitung pada pohon SEBELUM butir diangkat).
 * Ditolak bila tujuan berada di dalam butir itu sendiri, melebihi tiga tingkat, atau melebihi batas jumlah.
 */
export function pindahButir(menu: ButirMenu[], dari: JalurMenu, induk: JalurMenu, ke: number): ButirMenu[] {
  const b = butirDi(menu, dari);
  if (!b) return menu;
  if (induk.length >= dari.length && dari.every((x, i) => induk[i] === x)) return menu;
  if (induk.length + kedalaman(b) > 3) return menu;
  const indukSama = induk.length === dari.length - 1 && induk.every((x, i) => dari[i] === x);
  const tujuan = induk.length ? (butirDi(menu, induk)?.anak ?? []) : menu;
  if (!indukSama && tujuan.length >= BATAS_MENU[(induk.length + 1) as 1 | 2 | 3]) return menu;
  // Sesuaikan jalur induk & indeks bila butir yang diangkat berada sebelum tujuan pada daftar yang sama tingkatnya.
  const indukBaru = induk.slice();
  const lv = dari.length - 1;
  if (indukBaru.length > lv && dari.slice(0, lv).every((x, i) => indukBaru[i] === x) && dari[lv]! < indukBaru[lv]!) indukBaru[lv]! -= 1;
  let kePos = ke;
  if (indukSama && dari[lv]! < ke) kePos -= 1;
  if (indukSama && dari[lv] === kePos) return menu;
  const tanpa = hapusButir(menu, dari);
  return ubahDaftar(tanpa, indukBaru, (d) => {
    const x = d.slice();
    x.splice(Math.max(0, Math.min(x.length, kePos)), 0, b);
    return x;
  });
}

/** Naik/turun di antara saudara. */
export function geserButir(menu: ButirMenu[], jalur: JalurMenu, arah: -1 | 1): ButirMenu[] {
  const i = jalur[jalur.length - 1]!;
  const induk = jalur.slice(0, -1);
  const saudara = induk.length ? (butirDi(menu, induk)?.anak ?? []) : menu;
  const ke = i + arah;
  if (ke < 0 || ke >= saudara.length) return menu;
  return pindahButir(menu, jalur, induk, arah === 1 ? ke + 1 : ke);
}

/** Jadikan anak dari saudara di atasnya (menjorok). */
export function menjorokButir(menu: ButirMenu[], jalur: JalurMenu): ButirMenu[] {
  const i = jalur[jalur.length - 1]!;
  if (i === 0) return menu;
  const indukBaru = [...jalur.slice(0, -1), i - 1];
  const kakak = butirDi(menu, indukBaru);
  return pindahButir(menu, jalur, indukBaru, kakak?.anak?.length ?? 0);
}

/** Keluarkan ke tingkat di atasnya, tepat setelah induknya. */
export function keluarkanButir(menu: ButirMenu[], jalur: JalurMenu): ButirMenu[] {
  if (jalur.length < 2) return menu;
  const induk = jalur.slice(0, -1);
  return pindahButir(menu, jalur, induk.slice(0, -1), induk[induk.length - 1]! + 1);
}

export const butirMenuBaru = (label = 'Menu baru', url = ''): ButirMenu => ({ id: idBlok(), label, ...(url ? { url } : {}) });

/** Bentuk menu di navbar: tautan, dropdown satu kolom, atau mega menu (ada cucu). */
export function bentukMenu(b: ButirMenu): 'tautan' | 'dropdown' | 'mega' {
  if (!b.anak?.length) return 'tautan';
  return b.anak.some((a) => a.anak?.length) ? 'mega' : 'dropdown';
}

// ---------------------------------------------------------------- bawaan dan preset

/**
 * Kerangka bawaan bila aplikasi belum pernah menerbitkan pengaturan situs: setara tampilan sekarang (navbar portal
 * lengket, menu dari bagian halaman, tombol Masuk; kaki dari blok kaki halaman landing, jadi kaki situs mati).
 */
export function situsBawaan(): DokumenSitus {
  return normalisasiSitus({
    kepala: { tampilan: 'portal', lengket: true, menu_bagian: true, tombol: [{ label: 'Masuk', url: 'aksi:masuk', gaya: 'utama' }] },
    kaki: { aktif: false },
  });
}

export interface PresetSitus {
  nama: string;
  keterangan: string;
  buat: () => DokumenSitus;
}

const SOSIAL_UNIPO = [
  { jenis: 'instagram', url: 'https://instagram.com/unipo.official' },
  { jenis: 'youtube', url: 'https://youtube.com/@unipo' },
  { jenis: 'facebook', url: 'https://facebook.com/unipo.official' },
];
const KONTAK_UNIPO = { telepon: '0443-210-123', surel: 'info@unipo.ac.id', jam: 'Senin-Jumat, 08.00-16.00 WITA' };

/** Preset siap pakai di penyunting (contoh isi; ubah sesuai unit). */
export const PRESET_SITUS: Record<string, PresetSitus> = {
  portal: {
    nama: 'Portal kampus',
    keterangan: 'Pita pengumuman, bilah kontak, mega menu Akademik, kotak cari, kaki gelap berkolom, sidebar berita.',
    buat: () =>
      normalisasiSitus({
        pita: { aktif: true, nada: 'utama', tutup: true, butir: [{ teks: 'Pendaftaran mahasiswa baru gelombang 2 dibuka sampai 30 Juni', url: '/pmb', label: 'Daftar' }] },
        atas: {
          aktif: true,
          ...KONTAK_UNIPO,
          tautan: [
            { label: 'SIAKAD', url: 'https://siakad.unipo.ac.id' },
            { label: 'E-learning', url: 'https://lms.unipo.ac.id' },
            { label: 'PPID', url: '/ppid' },
          ],
          sosial: SOSIAL_UNIPO,
        },
        kepala: {
          tampilan: 'portal',
          lengket: true,
          rata: 'kiri',
          cari: true,
          cari_url: '/cari',
          cari_contoh: 'Cari berita, prodi, layanan',
          tombol: [{ label: 'Daftar', url: '/pmb', gaya: 'utama' }],
        },
        menu: [
          { label: 'Beranda', url: '/' },
          {
            label: 'Profil',
            anak: [
              { label: 'Sejarah', url: '/profil/sejarah' },
              { label: 'Visi dan misi', url: '/profil/visi-misi' },
              { label: 'Struktur organisasi', url: '/profil/struktur' },
              { label: 'Akreditasi', url: '/profil/akreditasi' },
            ],
          },
          {
            label: 'Akademik',
            anak: [
              {
                label: 'Fakultas',
                anak: [
                  { label: 'Fakultas Teknik', url: '/fakultas/ft', keterangan: 'Informatika, Sipil, Industri' },
                  { label: 'Fakultas Ekonomi', url: '/fakultas/fe', keterangan: 'Manajemen, Akuntansi' },
                  { label: 'Fakultas Hukum', url: '/fakultas/fh' },
                ],
              },
              {
                label: 'Layanan',
                anak: [
                  { label: 'Kalender akademik', url: '/akademik/kalender' },
                  { label: 'Panduan akademik', url: '/akademik/panduan' },
                  { label: 'Beasiswa', url: '/beasiswa' },
                ],
              },
            ],
            sorot: { label: 'Penerimaan', judul: 'Pendaftaran mahasiswa baru', teks: 'Pilih program studi dan daftar dari ponsel.', url: '/pmb', tombol: 'Lihat jalur' },
          },
          { label: 'Berita', url: '/berita' },
          { label: 'Kontak', url: '/kontak' },
        ],
        kaki: {
          aktif: true,
          tampilan: 'gelap',
          teks: 'Kampus yang dekat dengan masyarakat Pohuwato.',
          alamat: 'Jl. Trans Sulawesi, Marisa, Kabupaten Pohuwato, Gorontalo',
          ...KONTAK_UNIPO,
          kolom: [
            {
              judul: 'Tautan cepat',
              tautan: [
                { label: 'Pendaftaran', url: '/pmb' },
                { label: 'Berita', url: '/berita' },
                { label: 'Agenda', url: '/agenda' },
              ],
            },
            {
              judul: 'Layanan',
              tautan: [
                { label: 'SIAKAD', url: 'https://siakad.unipo.ac.id' },
                { label: 'E-learning', url: 'https://lms.unipo.ac.id' },
                { label: 'Tracer study', url: 'https://tracer.unipo.ac.id' },
              ],
            },
          ],
          sosial: SOSIAL_UNIPO,
          tautan_bawah: [{ label: 'Kebijakan privasi', url: '/privasi' }],
          ke_atas: true,
        },
        sidebar: {
          aktif: true,
          posisi: 'kanan',
          lengket: true,
          widget: [
            { jenis: 'cari', judul: 'Cari' },
            { jenis: 'kabar', judul: 'Berita terbaru', sumber: 'berita', jumlah: 4 },
            {
              jenis: 'tautan',
              judul: 'Layanan',
              tautan: [
                { label: 'SIAKAD', url: 'https://siakad.unipo.ac.id' },
                { label: 'Pendaftaran', url: '/pmb' },
              ],
            },
          ],
        },
      }),
  },
  aplikasi: {
    nama: 'Aplikasi layanan',
    keterangan: 'Navbar ringan tanpa bilah atas, menu dari bagian halaman, tombol Masuk, kaki ringkas.',
    buat: () =>
      normalisasiSitus({
        kepala: { tampilan: 'aplikasi', lengket: true, menu_bagian: true, tombol: [{ label: 'Masuk', url: 'aksi:masuk', gaya: 'utama' }] },
        kaki: {
          aktif: true,
          tampilan: 'ringkas',
          tautan_bawah: [
            { label: 'Bantuan', url: '/bantuan' },
            { label: 'Kebijakan privasi', url: '/privasi' },
          ],
          sosial: SOSIAL_UNIPO,
        },
      }),
  },
  unit: {
    nama: 'Fakultas atau unit',
    keterangan: 'Bilah kontak, menu Profil dan Layanan bertingkat, kaki terang dengan alamat, sidebar pengumuman.',
    buat: () =>
      normalisasiSitus({
        atas: { aktif: true, telepon: KONTAK_UNIPO.telepon, surel: KONTAK_UNIPO.surel, tautan: [{ label: 'Universitas', url: 'https://unipo.ac.id' }] },
        kepala: { tampilan: 'portal', lengket: true, cari: false, tombol: [{ label: 'Masuk', url: 'aksi:masuk', gaya: 'garis' }] },
        menu: [
          { label: 'Beranda', url: '/' },
          {
            label: 'Profil',
            anak: [
              { label: 'Sambutan pimpinan', url: '/profil/sambutan' },
              { label: 'Visi dan misi', url: '/profil/visi-misi' },
              { label: 'Dosen dan staf', url: '/profil/dosen' },
            ],
          },
          {
            label: 'Layanan',
            anak: [
              { label: 'Surat keterangan', url: '/layanan/surat' },
              { label: 'Unduhan formulir', url: '/unduhan' },
            ],
          },
          { label: 'Pengumuman', url: '/pengumuman' },
        ],
        kaki: { aktif: true, tampilan: 'terang', alamat: 'Gedung Rektorat Lt. 2, Universitas Pohuwato', telepon: KONTAK_UNIPO.telepon, surel: KONTAK_UNIPO.surel, ke_atas: true },
        sidebar: {
          aktif: true,
          posisi: 'kanan',
          widget: [
            { jenis: 'kabar', judul: 'Pengumuman', sumber: 'pengumuman', jumlah: 5 },
            { jenis: 'kontak', judul: 'Hubungi kami' },
          ],
        },
      }),
  },
  pendaftaran: {
    nama: 'Pendaftaran (PMB)',
    keterangan: 'Pita jadwal gelombang, navbar tembus di atas hero, tombol Daftar, kaki gelap dengan pita ajakan.',
    buat: () =>
      normalisasiSitus({
        pita: { aktif: true, nada: 'aksen', tutup: true, butir: [{ teks: 'Gelombang 2: 1 Mei sampai 30 Juni', url: '#jadwal', label: 'Lihat jadwal' }] },
        kepala: {
          tampilan: 'portal',
          lengket: true,
          transparan: true,
          menu_bagian: true,
          tombol: [
            { label: 'Masuk', url: 'aksi:masuk', gaya: 'garis' },
            { label: 'Daftar sekarang', url: 'aksi:daftar', gaya: 'utama' },
          ],
        },
        menu: [
          { label: 'Program studi', url: '#prodi' },
          { label: 'Biaya', url: '#biaya' },
          { label: 'Jadwal', url: '#jadwal' },
          { label: 'Tanya jawab', url: '#faq' },
        ],
        kaki: {
          aktif: true,
          tampilan: 'gelap',
          teks: 'Panitia Penerimaan Mahasiswa Baru Universitas Pohuwato.',
          telepon: KONTAK_UNIPO.telepon,
          whatsapp: '081234567890',
          surel: 'pmb@unipo.ac.id',
          ajakan_judul: 'Siap kuliah di UNIPO?',
          ajakan_teks: 'Pendaftaran online, tanpa datang ke kampus.',
          ajakan_tombol: [{ label: 'Daftar sekarang', url: 'aksi:daftar', gaya: 'utama' }],
          sosial: SOSIAL_UNIPO,
          ke_atas: true,
        },
      }),
  },
};

// ---------------------------------------------------------------- bagian penyunting (panel Isi)

export type KunciBagianSitus = 'pita' | 'atas' | 'kepala' | 'menu' | 'kaki' | 'sidebar';

export interface BagianSitus {
  label: string;
  keterangan: string;
  ikon: LucideIcon;
  /** Kolom panel properti (bagian menu memakai penyunting pohon sendiri). */
  kolom: KolomBlok[];
}

const SOSIAL_OPSI = [
  { v: 'instagram', label: 'Instagram' },
  { v: 'facebook', label: 'Facebook' },
  { v: 'youtube', label: 'YouTube' },
  { v: 'tiktok', label: 'TikTok' },
  { v: 'x', label: 'X' },
  { v: 'linkedin', label: 'LinkedIn' },
  { v: 'threads', label: 'Threads' },
  { v: 'whatsapp', label: 'WhatsApp' },
  { v: 'email', label: 'Surel' },
  { v: 'website', label: 'Situs web' },
];
const s = (v: unknown) => (typeof v === 'string' ? v : '');
const kolomSosial: KolomBlok = {
  k: 'sosial',
  jenis: 'daftar',
  label: 'Media sosial',
  maks: 8,
  butir: 'akun',
  judulButir: (b) => SOSIAL_OPSI.find((x) => x.v === b.jenis)?.label ?? 'Akun',
  baru: () => ({ jenis: 'instagram', url: '' }),
  kolom: [
    { k: 'jenis', jenis: 'pilihan', label: 'Jenis', opsi: SOSIAL_OPSI, tampil: 'daftar' },
    { k: 'url', jenis: 'url', label: 'Alamat', contoh: 'https://instagram.com/unipo' },
  ],
};
const kolomTautan = (k: string, label: string, maks: number): KolomBlok => ({
  k,
  jenis: 'daftar',
  label,
  maks,
  butir: 'tautan',
  judulButir: (b, i) => s(b.label) || `Tautan ${i + 1}`,
  baru: () => ({ label: '', url: '' }),
  kolom: [
    { k: 'label', jenis: 'teks', label: 'Label', maks: 40 },
    { k: 'url', jenis: 'url', label: 'Tujuan', berkas: true },
    { k: 'baru', jenis: 'saklar', label: 'Buka di tab baru' },
  ],
});
const aktif = (label: string): KolomBlok => ({ k: 'aktif', jenis: 'saklar', label });
const nyala = (i: Record<string, unknown>) => i.aktif === true;

export const JENIS_WIDGET: Array<{ v: JenisWidget; label: string }> = [
  { v: 'kabar', label: 'Berita, pengumuman, atau agenda' },
  { v: 'tautan', label: 'Daftar tautan' },
  { v: 'teks', label: 'Teks' },
  { v: 'kontak', label: 'Kontak (dari kaki situs)' },
  { v: 'ajakan', label: 'Ajakan dengan tombol' },
  { v: 'cari', label: 'Kotak cari' },
];
export const BAGIAN_SITUS: Record<KunciBagianSitus, BagianSitus> = {
  pita: {
    label: 'Pita pengumuman',
    keterangan: 'Baris pengumuman singkat di paling atas, bisa berganti otomatis.',
    ikon: Megaphone,
    kolom: [
      aktif('Tampilkan pita pengumuman'),
      {
        k: 'nada',
        jenis: 'pilihan',
        label: 'Warna',
        opsi: [
          { v: 'utama', label: 'Utama' },
          { v: 'aksen', label: 'Aksen' },
          { v: 'lembut', label: 'Lembut' },
          { v: 'gelap', label: 'Gelap' },
        ],
        bila: nyala,
      },
      { k: 'tutup', jenis: 'saklar', label: 'Pengunjung boleh menutup', bila: nyala },
      {
        k: 'butir',
        jenis: 'daftar',
        label: 'Pengumuman',
        maks: 5,
        butir: 'pengumuman',
        judulButir: (b, i) => s(b.teks) || `Pengumuman ${i + 1}`,
        baru: () => ({ teks: '' }),
        bila: nyala,
        kolom: [
          { k: 'teks', jenis: 'teks', label: 'Teks', maks: 200 },
          { k: 'url', jenis: 'url', label: 'Tujuan', berkas: true },
          { k: 'label', jenis: 'teks', label: 'Label tautan', maks: 30, contoh: 'Selengkapnya' },
        ],
      },
    ],
  },
  atas: {
    label: 'Bilah atas',
    keterangan: 'Kontak, jam layanan, tautan cepat, dan media sosial di atas navbar. Tidak tampil di ponsel.',
    ikon: Rows3,
    kolom: [
      aktif('Tampilkan bilah atas'),
      { k: 'telepon', jenis: 'teks', label: 'Telepon', maks: 40, bila: nyala },
      { k: 'whatsapp', jenis: 'teks', label: 'WhatsApp', maks: 40, contoh: '0812…', bila: nyala },
      { k: 'surel', jenis: 'teks', label: 'Surel', maks: 120, bila: nyala },
      { k: 'jam', jenis: 'teks', label: 'Jam layanan', maks: 120, contoh: 'Senin-Jumat, 08.00-16.00 WITA', bila: nyala },
      { ...kolomTautan('tautan', 'Tautan cepat', 6), bila: nyala },
      { ...kolomSosial, bila: nyala },
    ],
  },
  kepala: {
    label: 'Kepala situs',
    keterangan: 'Navbar: gaya, lengket saat digulir, tembus di atas hero, kotak cari, dan tombol ajakan.',
    ikon: PanelTop,
    kolom: [
      {
        k: 'tampilan',
        jenis: 'pilihan',
        label: 'Gaya navbar',
        opsi: [
          { v: 'portal', label: 'Portal' },
          { v: 'aplikasi', label: 'Aplikasi' },
          { v: 'ringkas', label: 'Ringkas' },
        ],
      },
      {
        k: 'rata',
        jenis: 'pilihan',
        label: 'Letak menu',
        opsi: [
          { v: 'kiri', label: 'Setelah logo' },
          { v: 'tengah', label: 'Tengah' },
        ],
      },
      { k: 'lengket', jenis: 'saklar', label: 'Tetap di atas saat digulir' },
      { k: 'transparan', jenis: 'saklar', label: 'Tembus pandang di atas hero bergambar', bantuan: 'Navbar menjadi solid setelah halaman digulir.' },
      { k: 'menu_bagian', jenis: 'saklar', label: 'Tambahkan bagian halaman bertanda menu', bantuan: 'Bagian halaman depan yang diberi label menu ikut tampil setelah menu utama.' },
      { k: 'cari', jenis: 'saklar', label: 'Kotak cari' },
      { k: 'cari_url', jenis: 'url', label: 'Halaman hasil cari', contoh: '/cari', bantuan: 'Kata kunci dikirim sebagai ?q=…', bila: (i) => i.cari === true },
      { k: 'cari_contoh', jenis: 'teks', label: 'Teks contoh di kotak cari', maks: 60, bila: (i) => i.cari === true },
      { k: 'tombol', jenis: 'tombol', label: 'Tombol ajakan', maks: 2 },
    ],
  },
  menu: {
    label: 'Menu utama',
    keterangan: 'Susun menu sampai tiga tingkat. Menu yang punya cucu tampil sebagai mega menu berkolom.',
    ikon: MenuIcon,
    kolom: [],
  },
  kaki: {
    label: 'Kaki situs',
    keterangan: 'Kolom tautan, kontak, peta, media sosial, hak cipta, dan pita ajakan.',
    ikon: PanelBottom,
    kolom: [
      aktif('Tampilkan kaki situs'),
      {
        k: 'tampilan',
        jenis: 'pilihan',
        label: 'Gaya',
        opsi: [
          { v: 'gelap', label: 'Gelap' },
          { v: 'terang', label: 'Terang' },
          { v: 'ringkas', label: 'Ringkas' },
        ],
        bila: nyala,
      },
      { k: 'teks', jenis: 'paragraf', label: 'Tentang situs', maks: 300, baris: 2, bila: nyala },
      {
        k: 'kolom',
        jenis: 'daftar',
        label: 'Kolom tautan',
        maks: 4,
        butir: 'kolom',
        judulButir: (b, i) => s(b.judul) || `Kolom ${i + 1}`,
        baru: () => ({ judul: 'Tautan', tautan: [] }),
        bila: (i) => nyala(i) && i.tampilan !== 'ringkas',
        kolom: [{ k: 'judul', jenis: 'teks', label: 'Judul kolom', maks: 60 }, kolomTautan('tautan', 'Tautan', 10)],
      },
      { k: 'alamat', jenis: 'paragraf', label: 'Alamat', maks: 300, baris: 2, bila: (i) => nyala(i) && i.tampilan !== 'ringkas' },
      { k: 'peta_url', jenis: 'url', label: 'Tautan peta', contoh: 'https://maps.google.com/…', bila: (i) => nyala(i) && i.tampilan !== 'ringkas' },
      { k: 'telepon', jenis: 'teks', label: 'Telepon', maks: 40, bila: (i) => nyala(i) && i.tampilan !== 'ringkas' },
      { k: 'whatsapp', jenis: 'teks', label: 'WhatsApp', maks: 40, bila: (i) => nyala(i) && i.tampilan !== 'ringkas' },
      { k: 'surel', jenis: 'teks', label: 'Surel', maks: 120, bila: (i) => nyala(i) && i.tampilan !== 'ringkas' },
      { k: 'jam', jenis: 'teks', label: 'Jam layanan', maks: 120, bila: (i) => nyala(i) && i.tampilan !== 'ringkas' },
      { ...kolomSosial, bila: nyala },
      { ...kolomTautan('tautan_bawah', 'Tautan baris bawah', 6), bila: nyala },
      { k: 'hak_cipta', jenis: 'teks', label: 'Teks hak cipta', maks: 160, contoh: '© 2027 Universitas Pohuwato', bila: nyala },
      { k: 'ke_atas', jenis: 'saklar', label: 'Tombol kembali ke atas', bila: nyala },
      { k: 'ajakan_judul', jenis: 'teks', label: 'Pita ajakan: judul', maks: 140, bila: (i) => nyala(i) && i.tampilan !== 'ringkas' },
      { k: 'ajakan_teks', jenis: 'teks', label: 'Pita ajakan: keterangan', maks: 200, bila: (i) => nyala(i) && i.tampilan !== 'ringkas' && !!s(i.ajakan_judul) },
      { k: 'ajakan_tombol', jenis: 'tombol', label: 'Pita ajakan: tombol', maks: 2, bila: (i) => nyala(i) && i.tampilan !== 'ringkas' && !!s(i.ajakan_judul) },
    ],
  },
  sidebar: {
    label: 'Sidebar',
    keterangan: 'Kolom samping di halaman dalam (berita, profil, layanan): berita, tautan, kontak, ajakan.',
    ikon: PanelRight,
    kolom: [
      aktif('Tampilkan sidebar di halaman dalam'),
      {
        k: 'posisi',
        jenis: 'pilihan',
        label: 'Letak',
        opsi: [
          { v: 'kanan', label: 'Kanan' },
          { v: 'kiri', label: 'Kiri' },
        ],
        bila: nyala,
      },
      { k: 'lengket', jenis: 'saklar', label: 'Ikut menempel saat digulir', bila: nyala },
      {
        k: 'widget',
        jenis: 'daftar',
        label: 'Widget',
        maks: 8,
        butir: 'widget',
        judulButir: (b, i) => s(b.judul) || JENIS_WIDGET.find((j) => j.v === b.jenis)?.label || `Widget ${i + 1}`,
        baru: () => ({ id: idBlok(), jenis: 'tautan', judul: '' }),
        bila: nyala,
        kolom: [
          { k: 'jenis', jenis: 'pilihan', label: 'Jenis', opsi: JENIS_WIDGET, tampil: 'daftar' },
          { k: 'judul', jenis: 'teks', label: 'Judul', maks: 80 },
          {
            k: 'sumber',
            jenis: 'pilihan',
            label: 'Isi',
            opsi: [
              { v: 'berita', label: 'Berita' },
              { v: 'pengumuman', label: 'Pengumuman' },
              { v: 'agenda', label: 'Agenda' },
            ],
            bila: (i) => i.jenis === 'kabar',
          },
          { k: 'jumlah', jenis: 'angka', label: 'Jumlah', min: 2, max: 8, bila: (i) => i.jenis === 'kabar' },
          { k: 'teks', jenis: 'paragraf', label: 'Teks', maks: 600, baris: 4, ringan: true, bila: (i) => i.jenis === 'teks' || i.jenis === 'ajakan' },
          { ...kolomTautan('tautan', 'Tautan', 10), bila: (i) => i.jenis === 'tautan' },
          { k: 'tombol', jenis: 'tombol', label: 'Tombol', maks: 2, bila: (i) => i.jenis === 'ajakan' },
        ],
      },
    ],
  },
};

export const URUT_BAGIAN_SITUS: KunciBagianSitus[] = ['pita', 'atas', 'kepala', 'menu', 'kaki', 'sidebar'];

/** Kolom isian satu butir menu (penyunting pohon). */
export const KOLOM_BUTIR_MENU: KolomBlok[] = [
  { k: 'label', jenis: 'teks', label: 'Label', maks: 40 },
  {
    k: 'url',
    jenis: 'url',
    label: 'Tujuan',
    berkas: true,
    bantuan: 'Halaman (/alamat), bagian (#bagian), alamat luar (https://), atau berkas unduhan. Kosongkan untuk menu yang hanya membuka sub menu.',
  },
  { k: 'keterangan', jenis: 'teks', label: 'Keterangan di bawah label', maks: 120, bantuan: 'Tampil di dropdown dan mega menu.' },
  { k: 'ikon', jenis: 'ikon', label: 'Ikon' },
  { k: 'lencana', jenis: 'teks', label: 'Lencana kecil', maks: 20, contoh: 'Dibuka' },
  { k: 'baru', jenis: 'saklar', label: 'Buka di tab baru', bila: (i) => /^https?:|^berkas:/.test(String(i.url ?? '')) },
];

/** Kolom kartu sorotan mega menu (menu tingkat 1). */
export const KOLOM_SOROT: KolomBlok[] = [
  { k: 'label', jenis: 'teks', label: 'Label kecil', maks: 40 },
  { k: 'judul', jenis: 'teks', label: 'Judul', maks: 80 },
  { k: 'teks', jenis: 'paragraf', label: 'Keterangan', maks: 200, baris: 2 },
  { k: 'url', jenis: 'url', label: 'Tujuan', berkas: true },
  { k: 'tombol', jenis: 'teks', label: 'Teks ajakan', maks: 30, contoh: 'Selengkapnya' },
  { k: 'gambar', jenis: 'gambar', label: 'Gambar sampul' },
];
