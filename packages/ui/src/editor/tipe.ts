import {
  AlignLeft, Code2, Columns3, FileDown, Film, Heading2, Image, Images, Info, List, ListCollapse, MapPin, Minus, MousePointerClick,
  MoveVertical, Quote, Table, type LucideIcon,
} from 'lucide-react';

/**
 * Format blok sama dengan backend (app/Modules/Humas/Support/Blok.php di SIAKAD), jadi isi editor ini bisa
 * langsung dikirim ke /v1/humas/... sebagai `blok`:
 * {"id": "b1", "tipe": "paragraf", "data": {...}, "anak": [[...], [...]]}. `anak` hanya untuk blok kolom.
 */
export type TipeBlok =
  | 'paragraf' | 'judul' | 'daftar' | 'kutipan' | 'gambar' | 'galeri' | 'video' | 'tombol' | 'pemisah'
  | 'spasi' | 'kolom' | 'tabel' | 'kode' | 'sorotan' | 'berkas' | 'akordion' | 'peta';

export interface Blok {
  id: string;
  tipe: TipeBlok;
  data: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  anak?: Blok[][];
}

export type Grup = 'Teks' | 'Media' | 'Tata letak' | 'Sematan';

export interface DefBlok {
  label: string;
  ikon: LucideIcon;
  grup: Grup;
  deskripsi: string;
  /** Kata kunci pencarian di penyisip (selain label). */
  kunci?: string;
  data: () => Record<string, unknown>;
  anak?: () => Blok[][];
  /** Punya teks utama yang bisa diketik langsung (Enter memecah, Backspace menggabung). */
  teks?: boolean;
}

export const RASIO: Record<string, number> = { '50-50': 2, '33-67': 2, '67-33': 2, '33-33-33': 3, '25-25-25-25': 4 };

export const DEF: Record<TipeBlok, DefBlok> = {
  paragraf: { label: 'Paragraf', ikon: AlignLeft, grup: 'Teks', deskripsi: 'Teks biasa. Ketik / untuk memilih blok.', kunci: 'teks p', data: () => ({ teks: '' }), teks: true },
  judul: { label: 'Judul', ikon: Heading2, grup: 'Teks', deskripsi: 'Subjudul H2–H4 untuk membagi tulisan.', kunci: 'heading h2 h3 subjudul', data: () => ({ teks: '', tingkat: 2 }), teks: true },
  daftar: { label: 'Daftar', ikon: List, grup: 'Teks', deskripsi: 'Daftar berpoin atau bernomor.', kunci: 'list poin nomor ul ol', data: () => ({ gaya: 'ul', item: [''] }) },
  kutipan: { label: 'Kutipan', ikon: Quote, grup: 'Teks', deskripsi: 'Kutipan narasumber beserta namanya.', kunci: 'quote petik', data: () => ({ teks: '', sumber: '', gaya: 'biasa' }), teks: true },
  sorotan: { label: 'Sorotan', ikon: Info, grup: 'Teks', deskripsi: 'Kotak info, catatan, atau peringatan.', kunci: 'callout catatan info peringatan', data: () => ({ gaya: 'info', judul: '', teks: '' }) },
  kode: { label: 'Kode', ikon: Code2, grup: 'Teks', deskripsi: 'Teks monospace apa adanya.', kunci: 'code pre', data: () => ({ teks: '' }) },
  gambar: { label: 'Gambar', ikon: Image, grup: 'Media', deskripsi: 'Satu foto dengan keterangan.', kunci: 'foto image img', data: () => ({ url: '', alt: '', keterangan: '', lebar: 'normal' }) },
  galeri: { label: 'Galeri', ikon: Images, grup: 'Media', deskripsi: 'Beberapa foto dalam kisi.', kunci: 'foto album', data: () => ({ gambar: [], kolom: 3 }) },
  video: { label: 'Video', ikon: Film, grup: 'Sematan', deskripsi: 'YouTube atau Vimeo.', kunci: 'youtube vimeo', data: () => ({ url: '', keterangan: '' }) },
  berkas: { label: 'Berkas', ikon: FileDown, grup: 'Media', deskripsi: 'Tautan unduh PDF/dokumen.', kunci: 'file pdf unduh dokumen lampiran', data: () => ({ url: '', nama: '' }) },
  peta: { label: 'Peta', ikon: MapPin, grup: 'Sematan', deskripsi: 'Sematan Google Maps.', kunci: 'map lokasi google', data: () => ({ url: '' }) },
  tombol: { label: 'Tombol', ikon: MousePointerClick, grup: 'Tata letak', deskripsi: 'Ajakan bertindak, mis. "Daftar sekarang".', kunci: 'button cta', data: () => ({ tombol: [{ label: 'Selengkapnya', url: '', gaya: 'utama' }], rata: 'kiri' }) },
  kolom: { label: 'Kolom', ikon: Columns3, grup: 'Tata letak', deskripsi: 'Isi berdampingan 2–4 kolom.', kunci: 'columns grid', data: () => ({ rasio: '50-50' }), anak: () => [[baru('paragraf')], [baru('paragraf')]] },
  tabel: { label: 'Tabel', ikon: Table, grup: 'Tata letak', deskripsi: 'Jadwal, biaya, atau data berbaris.', kunci: 'table jadwal', data: () => ({ kepala: true, baris: [['Kolom 1', 'Kolom 2'], ['', '']], keterangan: '' }) },
  akordion: { label: 'Akordion', ikon: ListCollapse, grup: 'Tata letak', deskripsi: 'Tanya jawab yang bisa dibuka-tutup.', kunci: 'faq accordion tanya jawab', data: () => ({ item: [{ judul: '', isi: '' }] }) },
  pemisah: { label: 'Pemisah', ikon: Minus, grup: 'Tata letak', deskripsi: 'Garis pemisah antarbagian.', kunci: 'hr garis separator', data: () => ({ gaya: 'garis' }) },
  spasi: { label: 'Spasi', ikon: MoveVertical, grup: 'Tata letak', deskripsi: 'Ruang kosong vertikal.', kunci: 'spacer jarak', data: () => ({ ukuran: 'sedang' }) },
};

export const URUTAN_GRUP: Grup[] = ['Teks', 'Media', 'Tata letak', 'Sematan'];

let urut = 0;
export const idBaru = () => `b${Date.now().toString(36)}${(urut++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export function baru(tipe: TipeBlok, data?: Record<string, unknown>): Blok {
  const d = DEF[tipe];
  const b: Blok = { id: idBaru(), tipe, data: { ...d.data(), ...data } };
  if (d.anak) b.anak = d.anak();
  return b;
}

/** Salin blok dengan id baru (duplikat, sisip pola). */
export function salinBaru(b: Blok): Blok {
  return { ...b, id: idBaru(), data: structuredClone(b.data), anak: b.anak?.map((k) => k.map(salinBaru)) };
}

/** Pola dari server tidak menyimpan id; beri id dan lengkapi data bawaan. */
export function rapikan(daftar: unknown): Blok[] {
  if (!Array.isArray(daftar)) return [];
  return daftar
    .filter((b): b is Partial<Blok> => !!b && typeof b === 'object' && typeof (b as Blok).tipe === 'string' && (b as Blok).tipe in DEF)
    .map((b) => {
      const tipe = b.tipe as TipeBlok;
      const out: Blok = { id: typeof b.id === 'string' && b.id ? b.id : idBaru(), tipe, data: { ...DEF[tipe].data(), ...(b.data ?? {}) } };
      if (tipe === 'kolom') {
        const n = RASIO[out.data.rasio] ?? 2;
        const anak = Array.isArray(b.anak) ? b.anak.map((k) => rapikan(k)) : [];
        out.anak = Array.from({ length: n }, (_, i) => (anak[i]?.length ? anak[i] : [baru('paragraf')]));
      }
      return out;
    });
}

const teksPolos = (html: string) => {
  if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, ' ');
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent ?? '';
};

/** Teks polos semua blok (hitung kata, ringkasan otomatis). */
export function teksBlok(daftar: Blok[]): string {
  const bagian: string[] = [];
  for (const b of daftar) {
    const d = b.data;
    if (typeof d.teks === 'string') bagian.push(teksPolos(d.teks));
    if (typeof d.judul === 'string') bagian.push(d.judul);
    if (Array.isArray(d.item)) d.item.forEach((x: unknown) => bagian.push(typeof x === 'string' ? teksPolos(x) : `${(x as { judul?: string }).judul ?? ''} ${teksPolos((x as { isi?: string }).isi ?? '')}`));
    if (Array.isArray(d.baris)) d.baris.forEach((r: unknown) => Array.isArray(r) && bagian.push(r.join(' ')));
    if (typeof d.keterangan === 'string') bagian.push(d.keterangan);
    b.anak?.forEach((k) => bagian.push(teksBlok(k)));
  }
  return bagian.join(' ').replace(/\s+/g, ' ').trim();
}

export const hitungKata = (daftar: Blok[]) => {
  const t = teksBlok(daftar);
  return t ? t.split(' ').length : 0;
};

/** Cari blok di semua tingkat (termasuk anak kolom). */
export function cariBlok(daftar: Blok[], id: string): Blok | null {
  for (const b of daftar) {
    if (b.id === id) return b;
    for (const k of b.anak ?? []) {
      const x = cariBlok(k, id);
      if (x) return x;
    }
  }
  return null;
}

/** Ganti satu blok (di tingkat mana pun) lewat fungsi. */
export function ubahBlok(daftar: Blok[], id: string, f: (b: Blok) => Blok): Blok[] {
  return daftar.map((b) => (b.id === id ? f(b) : b.anak ? { ...b, anak: b.anak.map((k) => ubahBlok(k, id, f)) } : b));
}

// ------------------------------------------------------------------ HTML lama → blok

const INLINE = new Set(['STRONG', 'B', 'EM', 'I', 'A', 'MARK', 'CODE', 'SUB', 'SUP', 'BR', 'SPAN', 'U', 'S']);

function sebaris(el: Element): string {
  // Buang tag blok di dalam teks sebaris, sisakan format dasar; penyaring server merapikan sisanya.
  const salin = el.cloneNode(true) as Element;
  salin.querySelectorAll('*').forEach((n) => {
    if (!INLINE.has(n.tagName)) n.replaceWith(...Array.from(n.childNodes));
  });
  return salin.innerHTML.trim();
}

function videoDari(src: string): string | null {
  const yt = src.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/watch?v=${yt[1]}`;
  const vm = src.match(/player\.vimeo\.com\/video\/(\d+)/);
  return vm ? `https://vimeo.com/${vm[1]}` : null;
}

/** Ubah isi HTML konten lama (sebelum ada editor blok) menjadi blok supaya bisa disunting. */
export function htmlKeBlok(html?: string | null): Blok[] {
  if (!html || !html.trim()) return [];
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const akar = doc.body.firstElementChild as Element;
  const out: Blok[] = [];
  const paragrafLepas: string[] = [];
  const tutupLepas = () => {
    const t = paragrafLepas.join('').trim();
    if (t) out.push(baru('paragraf', { teks: t }));
    paragrafLepas.length = 0;
  };
  akar.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) {
      paragrafLepas.push((n.textContent ?? '').replace(/</g, '&lt;'));
      return;
    }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const el = n as Element;
    if (INLINE.has(el.tagName)) {
      paragrafLepas.push(el.outerHTML);
      return;
    }
    tutupLepas();
    const tag = el.tagName;
    const img = el.querySelector('img');
    const iframe = tag === 'IFRAME' ? el : el.querySelector('iframe');
    if (/^H[1-6]$/.test(tag)) out.push(baru('judul', { teks: sebaris(el), tingkat: Math.min(4, Math.max(2, Number(tag[1]))) }));
    else if (tag === 'UL' || tag === 'OL') out.push(baru('daftar', { gaya: tag === 'OL' ? 'ol' : 'ul', item: Array.from(el.children).map(sebaris) }));
    else if (tag === 'BLOCKQUOTE') {
      const cite = el.querySelector('cite');
      const sumber = cite?.textContent ?? '';
      cite?.remove();
      out.push(baru('kutipan', { teks: sebaris(el), sumber }));
    } else if (tag === 'PRE') out.push(baru('kode', { teks: el.textContent ?? '' }));
    else if (tag === 'HR') out.push(baru('pemisah'));
    else if (tag === 'TABLE') {
      const baris = Array.from(el.querySelectorAll('tr')).map((tr) => Array.from(tr.children).map((td) => td.textContent?.trim() ?? ''));
      out.push(baru('tabel', { baris, kepala: !!el.querySelector('th'), keterangan: el.querySelector('caption')?.textContent ?? '' }));
    } else if (iframe) {
      const src = iframe.getAttribute('src') ?? '';
      const v = videoDari(src);
      if (v) out.push(baru('video', { url: v }));
      else if (/google\.[a-z.]+\/maps/.test(src)) out.push(baru('peta', { url: src }));
    } else if (img && (tag === 'FIGURE' || tag === 'IMG' || (tag === 'P' && !el.textContent?.trim()))) {
      out.push(baru('gambar', { url: img.getAttribute('src') ?? '', alt: img.getAttribute('alt') ?? '', keterangan: el.querySelector('figcaption')?.textContent ?? '' }));
    } else if (tag === 'DETAILS') {
      const ringkas = el.querySelector('summary');
      const judul = ringkas?.textContent ?? '';
      ringkas?.remove();
      out.push(baru('akordion', { item: [{ judul, isi: sebaris(el) }] }));
    } else {
      const t = sebaris(el);
      if (t) out.push(baru('paragraf', { teks: t }));
    }
  });
  tutupLepas();
  return out;
}

/** Semua blok (termasuk anak kolom) yang memenuhi syarat. */
export function cariSemua(daftar: Blok[], syarat: (b: Blok) => boolean): Blok[] {
  const out: Blok[] = [];
  for (const b of daftar) {
    if (syarat(b)) out.push(b);
    b.anak?.forEach((k) => out.push(...cariSemua(k, syarat)));
  }
  return out;
}
