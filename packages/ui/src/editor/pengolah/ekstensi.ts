/**
 * Ekstensi Tiptap untuk PengolahDokumen. Semua gaya ditulis sebagai kelas `ub-*` (bukan atribut style), karena
 * HtmlSanitizer SIAKAD dan `saringHtml` hanya mempertahankan kelas berawalan `ub-`. Modul Dokumen SIAKAD
 * menerjemahkan kelas yang sama ke gaya PDF, jadi tampilan di editor = hasil cetak.
 */
import { Extension, Mark, Node, mergeAttributes } from '@tiptap/core';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';

/** Ambil nilai dari kelas `awalan-nilai` pada elemen. */
function dariKelas(el: HTMLElement, awalan: string, boleh: readonly string[]): string | null {
  for (const k of Array.from(el.classList)) {
    if (k.startsWith(awalan)) {
      const v = k.slice(awalan.length);
      if (boleh.includes(v)) return v;
    }
  }
  return null;
}

export const RATA = ['kiri', 'tengah', 'kanan', 'penuh'] as const;
export type Rata = (typeof RATA)[number];
export const INDEN = ['1', '2', '3', '4', '5', '6'] as const;
/** Spasi baris: 1, 1,15, 1,5, 2. */
export const SPASI_BARIS = ['1', '115', '15', '2'] as const;
export const UKURAN_HURUF = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28'] as const;
export const HURUF = ['serif', 'sans', 'mono'] as const;
export const WARNA_TEKS = ['hitam', 'abu', 'merah', 'oranye', 'hijau', 'biru', 'ungu', 'utama'] as const;
export const WARNA_SOROT = ['kuning', 'hijau', 'biru', 'merah', 'abu'] as const;
export const LEBAR_GAMBAR = ['25', '50', '75', '100'] as const;

export type SpasiBaris = (typeof SPASI_BARIS)[number];

const atributKelas = (nama: string, awalan: string, boleh: readonly string[]) => ({
  [nama]: {
    default: null as string | null,
    parseHTML: (el: HTMLElement) => dariKelas(el, awalan, boleh),
    renderHTML: (a: Record<string, unknown>) => (a[nama] ? { class: `${awalan}${a[nama]}` } : {}),
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragrafDok: {
      aturRata: (rata: Rata | null) => ReturnType;
      ubahInden: (arah: 1 | -1) => ReturnType;
      aturSpasiBaris: (spasi: SpasiBaris | null) => ReturnType;
      alihIndenAwal: () => ReturnType;
    };
    gayaTeks: {
      aturUkuran: (uk: string | null) => ReturnType;
      aturHuruf: (h: string | null) => ReturnType;
      aturWarna: (w: string | null) => ReturnType;
      aturSorot: (w: string | null) => ReturnType;
    };
    pindahHalaman: { sisipPindahHalaman: () => ReturnType };
    penanda: { sisipPenanda: (nama: string) => ReturnType };
    tabelDok: { alihGarisTabel: () => ReturnType };
    gambarDok: { aturGambar: (a: { lebar?: string | null; rata?: string | null }) => ReturnType };
  }
}

const BLOK_TEKS = ['paragraph', 'heading'];

/** Rata, inden kiri, inden baris pertama, dan spasi baris untuk paragraf dan judul. */
export const ParagrafDok = Extension.create({
  name: 'paragrafDok',
  addGlobalAttributes() {
    return [
      {
        types: BLOK_TEKS,
        attributes: {
          ...atributKelas('rata', 'ub-rata-', RATA),
          ...atributKelas('inden', 'ub-inden-', INDEN),
          ...atributKelas('spasi', 'ub-baris-', SPASI_BARIS),
          indenAwal: {
            default: false,
            parseHTML: (el: HTMLElement) => el.classList.contains('ub-inden-awal'),
            renderHTML: (a: Record<string, unknown>) => (a.indenAwal ? { class: 'ub-inden-awal' } : {}),
          },
        },
      },
    ];
  },
  addCommands() {
    const ubahSemua = (fn: (attrs: Record<string, unknown>) => Record<string, unknown>) => () => ({ tr, state, dispatch }: any) => {
      const { from, to } = state.selection;
      let ubah = false;
      state.doc.nodesBetween(from, to, (node: any, pos: number) => {
        if (BLOK_TEKS.includes(node.type.name)) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...fn(node.attrs) });
          ubah = true;
        }
      });
      if (ubah && dispatch) dispatch(tr);
      return ubah;
    };
    return {
      aturRata: (rata) => ubahSemua(() => ({ rata: rata === 'kiri' ? null : rata }))(),
      ubahInden: (arah) =>
        ubahSemua((a) => {
          const n = Math.max(0, Math.min(6, Number(a.inden ?? 0) + arah));
          return { inden: n ? String(n) : null };
        })(),
      aturSpasiBaris: (spasi) => ubahSemua(() => ({ spasi: spasi === '115' ? null : spasi }))(),
      alihIndenAwal: () => ubahSemua((a) => ({ indenAwal: !a.indenAwal }))(),
    };
  },
  addKeyboardShortcuts() {
    return {
      'Mod-l': () => this.editor.commands.aturRata('kiri'),
      'Mod-e': () => this.editor.commands.aturRata('tengah'),
      'Mod-r': () => this.editor.commands.aturRata('kanan'),
      'Mod-j': () => this.editor.commands.aturRata('penuh'),
      Tab: () => (this.editor.isActive('listItem') || this.editor.isActive('tableCell') || this.editor.isActive('tableHeader') ? false : this.editor.commands.ubahInden(1)),
      'Shift-Tab': () => (this.editor.isActive('listItem') || this.editor.isActive('tableCell') || this.editor.isActive('tableHeader') ? false : this.editor.commands.ubahInden(-1)),
    };
  },
});

/** Satu tanda span berkelas untuk ukuran, huruf, dan warna teks. */
function markKelas(nama: string, awalan: string, boleh: readonly string[]) {
  return Mark.create({
    name: nama,
    priority: 900,
    addAttributes() {
      return { nilai: { default: null, parseHTML: (el: HTMLElement) => dariKelas(el, awalan, boleh), renderHTML: () => ({}) } };
    },
    parseHTML() {
      return [{ tag: 'span', getAttrs: (el) => (dariKelas(el as HTMLElement, awalan, boleh) ? {} : false), consuming: false }];
    },
    renderHTML({ mark, HTMLAttributes }) {
      return ['span', mergeAttributes(HTMLAttributes, { class: `${awalan}${mark.attrs.nilai}` }), 0];
    },
  });
}

export const UkuranHuruf = markKelas('ukuranHuruf', 'ub-uk-', UKURAN_HURUF);
export const JenisHuruf = markKelas('jenisHuruf', 'ub-huruf-', HURUF);
export const WarnaTeks = markKelas('warnaTeks', 'ub-warna-', WARNA_TEKS);

/** Stabilo memakai <mark class="ub-sorot-*">. */
export const Sorot = Mark.create({
  name: 'sorot',
  addAttributes() {
    return { nilai: { default: 'kuning', parseHTML: (el: HTMLElement) => dariKelas(el, 'ub-sorot-', WARNA_SOROT) ?? 'kuning', renderHTML: () => ({}) } };
  },
  parseHTML() {
    return [{ tag: 'mark', getAttrs: (el) => ((el as HTMLElement).classList.contains('ub-penanda') ? false : {}) }];
  },
  renderHTML({ mark, HTMLAttributes }) {
    return ['mark', mergeAttributes(HTMLAttributes, { class: `ub-sorot-${mark.attrs.nilai}` }), 0];
  },
});

export const GayaTeks = Extension.create({
  name: 'gayaTeks',
  addCommands() {
    const atur = (mark: string) => (v: string | null) => ({ chain }: any) =>
      v ? chain().setMark(mark, { nilai: v }).run() : chain().unsetMark(mark, { extendEmptyMarkRange: true }).run();
    return {
      aturUkuran: atur('ukuranHuruf'),
      aturHuruf: atur('jenisHuruf'),
      aturWarna: atur('warnaTeks'),
      aturSorot: atur('sorot'),
    };
  },
});

/** Pemisah halaman: <hr class="ub-pindah-halaman">. PDF memulai halaman baru di sini. */
export const PindahHalaman = Node.create({
  name: 'pindahHalaman',
  group: 'block',
  atom: true,
  selectable: true,
  priority: 1000,
  parseHTML() {
    return [{ tag: 'hr.ub-pindah-halaman' }];
  },
  renderHTML() {
    return ['hr', { class: 'ub-pindah-halaman' }];
  },
  addNodeView() {
    return () => {
      const dom = document.createElement('div');
      dom.className = 'u-pd-pindah';
      dom.contentEditable = 'false';
      dom.innerHTML = '<span>Pemisah halaman</span>';
      return { dom };
    };
  },
  addCommands() {
    return { sisipPindahHalaman: () => ({ commands }) => commands.insertContent([{ type: this.name }, { type: 'paragraph' }]) };
  },
  addKeyboardShortcuts() {
    return { 'Mod-Enter': () => this.editor.commands.sisipPindahHalaman() };
  },
});

export interface OpsiPenanda {
  /** Label penanda menurut nama, mis. { nama_mahasiswa: 'Nama mahasiswa' }. */
  label: () => Record<string, string>;
}

/**
 * Penanda data `{{nama}}` sebagai chip yang tidak bisa terpotong (ala Writing Labs). HTML-nya
 * `<span class="ub-penanda">{{nama}}</span>`, jadi server tetap mengisi `{{nama}}` seperti biasa.
 */
export const Penanda = Node.create<OpsiPenanda>({
  name: 'penanda',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addOptions() {
    return { label: () => ({}) };
  },
  addAttributes() {
    return {
      nama: {
        default: '',
        parseHTML: (el: HTMLElement) => (el.textContent ?? '').replace(/[{}\s]/g, ''),
        renderHTML: () => ({}),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span.ub-penanda' }, { tag: 'mark.ub-penanda' }];
  },
  renderHTML({ node }) {
    return ['span', { class: 'ub-penanda' }, `{{${node.attrs.nama}}}`];
  },
  renderText({ node }) {
    return `{{${node.attrs.nama}}}`;
  },
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span');
      dom.className = 'u-pd-chip';
      dom.contentEditable = 'false';
      const nama = String(node.attrs.nama);
      dom.textContent = this.options.label()[nama] ?? nama.replace(/_/g, ' ');
      dom.title = `{{${nama}}}`;
      dom.dataset.penanda = nama;
      return { dom };
    };
  },
  addCommands() {
    return {
      sisipPenanda:
        (nama) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { nama } }),
    };
  },
});

/** Tabel dengan garis (bawaan) atau tanpa garis (untuk tata letak, mis. data "Nama : ..."). */
export const TabelDok = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      polos: {
        default: false,
        parseHTML: (el: HTMLElement) => el.classList.contains('ub-tabel-polos'),
        renderHTML: (a: Record<string, unknown>) => ({ class: a.polos ? 'ub-tabel-polos' : 'ub-tabel-garis' }),
      },
    };
  },
  addCommands() {
    return {
      ...this.parent?.(),
      alihGarisTabel:
        () =>
        ({ editor, commands }: any) =>
          commands.updateAttributes('table', { polos: !editor.getAttributes('table').polos }),
    };
  },
}).configure({ resizable: false, HTMLAttributes: {} });

export { TableRow as BarisTabel, TableHeader as KepalaTabel, TableCell as SelTabel };

/** Gambar dengan lebar (persen kertas) dan rata lewat kelas. */
export const GambarDok = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...atributKelas('lebar', 'ub-lebar-gambar-', LEBAR_GAMBAR),
      ...atributKelas('rata', 'ub-gambar-', ['kiri', 'tengah', 'kanan']),
      width: { default: null },
      height: { default: null },
    };
  },
  addCommands() {
    return {
      ...this.parent?.(),
      aturGambar:
        (a: { lebar?: string | null; rata?: string | null }) =>
        ({ commands }: any) =>
          commands.updateAttributes('image', a),
    };
  },
}).configure({ inline: false, allowBase64: false });
