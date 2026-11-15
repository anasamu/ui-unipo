/** Cari & ganti untuk PengolahDokumen: hasil disorot dengan dekorasi (tidak mengubah dokumen sampai diganti). */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';

export interface HasilCari {
  from: number;
  to: number;
}

export interface PenyimpananCari {
  kata: string;
  besarKecil: boolean;
  hasil: HasilCari[];
  aktif: number;
}

export const kunciCari = new PluginKey<DecorationSet>('cariDok');

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cariDok: {
      aturCari: (kata: string, besarKecil?: boolean) => ReturnType;
      cariLangkah: (arah: 1 | -1) => ReturnType;
      gantiSatu: (ganti: string) => ReturnType;
      gantiSemua: (ganti: string) => ReturnType;
    };
  }
  interface Storage {
    cariDok: PenyimpananCari;
  }
}

function temukan(doc: PMNode, kata: string, besarKecil: boolean): HasilCari[] {
  if (!kata) return [];
  const hasil: HasilCari[] = [];
  const cari = besarKecil ? kata : kata.toLowerCase();
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const teks = besarKecil ? node.text : node.text.toLowerCase();
    let i = teks.indexOf(cari);
    while (i >= 0) {
      hasil.push({ from: pos + i, to: pos + i + kata.length });
      i = teks.indexOf(cari, i + kata.length);
    }
  });
  return hasil;
}

export const CariDok = Extension.create<Record<string, never>, PenyimpananCari>({
  name: 'cariDok',
  addStorage() {
    return { kata: '', besarKecil: false, hasil: [], aktif: 0 };
  },
  addCommands() {
    const segarkan = (editor: any, s: PenyimpananCari) => {
      s.hasil = temukan(editor.state.doc, s.kata, s.besarKecil);
      if (s.aktif >= s.hasil.length) s.aktif = 0;
    };
    return {
      aturCari:
        (kata, besarKecil = false) =>
        ({ editor, tr, dispatch }) => {
          const s = editor.storage.cariDok;
          s.kata = kata;
          s.besarKecil = besarKecil;
          s.aktif = 0;
          segarkan(editor, s);
          if (dispatch) dispatch(tr.setMeta(kunciCari, true));
          return true;
        },
      cariLangkah:
        (arah) =>
        ({ editor, tr, dispatch }) => {
          const s = editor.storage.cariDok;
          if (!s.hasil.length) return false;
          s.aktif = (s.aktif + arah + s.hasil.length) % s.hasil.length;
          const h = s.hasil[s.aktif];
          if (dispatch) {
            dispatch(tr.setMeta(kunciCari, true));
            requestAnimationFrame(() => {
              const el = editor.view.domAtPos(h.from).node as HTMLElement;
              (el.nodeType === 3 ? el.parentElement : el)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            });
          }
          return true;
        },
      gantiSatu:
        (ganti) =>
        ({ editor, tr, dispatch }) => {
          const s = editor.storage.cariDok;
          const h = s.hasil[s.aktif];
          if (!h) return false;
          if (dispatch) {
            tr.insertText(ganti, h.from, h.to);
            dispatch(tr.setMeta(kunciCari, true));
          }
          return true;
        },
      gantiSemua:
        (ganti) =>
        ({ editor, tr, dispatch }) => {
          const s = editor.storage.cariDok;
          if (!s.hasil.length) return false;
          if (dispatch) {
            for (const h of [...s.hasil].reverse()) tr.insertText(ganti, h.from, h.to);
            dispatch(tr.setMeta(kunciCari, true));
          }
          return true;
        },
    };
  },
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: kunciCari,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, lama) {
            if (!tr.docChanged && !tr.getMeta(kunciCari)) return lama.map(tr.mapping, tr.doc);
            const s = editor.storage.cariDok;
            s.hasil = temukan(tr.doc, s.kata, s.besarKecil);
            if (s.aktif >= s.hasil.length) s.aktif = 0;
            return DecorationSet.create(
              tr.doc,
              s.hasil.map((h, i) => Decoration.inline(h.from, h.to, { class: i === s.aktif ? 'u-pd-cari u-pd-cari-aktif' : 'u-pd-cari' })),
            );
          },
        },
        props: {
          decorations(state) {
            return kunciCari.getState(state);
          },
        },
      }),
    ];
  },
});
