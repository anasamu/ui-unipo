import { createElement, useEffect, useLayoutEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '../lib/cn';
import { useEditor } from './konteks';

/** Rapikan HTML hasil contentEditable: <b>/<i> jadi <strong>/<em>, buang span/div sisa tempel. */
export function rapikanHtml(html: string): string {
  let h = html
    .replace(/<(\/?)b(\s[^>]*)?>/gi, '<$1strong>')
    .replace(/<(\/?)i(\s[^>]*)?>/gi, '<$1em>')
    .replace(/<\/?(span|font|div)[^>]*>/gi, '')
    .replace(/<br\s*\/?>$/i, '');
  if (/^(\s|&nbsp;|<br\s*\/?>)*$/i.test(h)) h = '';
  return h;
}

const panjangTeks = (el: Node) => (el.textContent ?? '').length;

/** Posisi karet (jumlah karakter teks polos sebelum karet) di dalam elemen. */
export function posisiKaret(el: HTMLElement): number | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) return null;
  const r = sel.getRangeAt(0).cloneRange();
  r.selectNodeContents(el);
  r.setEnd(sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset);
  return r.toString().length;
}

/** Taruh karet di posisi karakter tertentu. */
export function pasangKaret(el: HTMLElement, di: 'awal' | 'akhir' | number) {
  el.focus();
  const sel = window.getSelection();
  if (!sel) return;
  const r = document.createRange();
  if (di === 'awal' || di === 'akhir') {
    r.selectNodeContents(el);
    r.collapse(di === 'awal');
  } else {
    let sisa = di;
    const jalan = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n = jalan.nextNode();
    let pasang = false;
    while (n) {
      const p = (n.textContent ?? '').length;
      if (sisa <= p) {
        r.setStart(n, sisa);
        r.collapse(true);
        pasang = true;
        break;
      }
      sisa -= p;
      n = jalan.nextNode();
    }
    if (!pasang) {
      r.selectNodeContents(el);
      r.collapse(false);
    }
  }
  sel.removeAllRanges();
  sel.addRange(r);
}

export interface TeksSebarisProps {
  /** Id blok untuk permintaan fokus dari editor (mis. setelah Enter). */
  idFokus?: string;
  nilai: string;
  ganti: (html: string) => void;
  placeholder?: string;
  tag?: 'p' | 'h2' | 'h3' | 'h4' | 'div' | 'li' | 'span' | 'figcaption' | 'cite' | 'summary';
  className?: string;
  /** Tanpa format (hanya teks polos), mis. label tombol. */
  polos?: boolean;
  /** Enter tanpa Shift: pecah blok. Tanpa ini, Enter dilarang (satu baris) kecuali `banyakBaris`. */
  pecah?: (sebelum: string, sesudah: string) => void;
  banyakBaris?: boolean;
  /** Backspace di awal teks. */
  hapusAwal?: (html: string) => void;
  /** Panah atas di awal / bawah di akhir. */
  panah?: (arah: -1 | 1) => void;
  /** Tangani tombol lebih dulu (menu garis miring). Kembalikan true bila sudah ditangani. */
  kunci?: (e: KeyboardEvent<HTMLElement>) => boolean;
  fokusMasuk?: () => void;
  label?: string;
}

/** Teks sebaris yang bisa diketik langsung di kanvas (contentEditable). */
export function TeksSebaris({ idFokus, nilai, ganti, placeholder, tag = 'div', className, polos, pecah, banyakBaris, hapusAwal, panah, kunci, fokusMasuk, label }: TeksSebarisProps) {
  const ref = useRef<HTMLElement>(null);
  const { fokus, setFokus, baca } = useEditor();
  const terakhir = useRef(nilai);

  // Sinkron dari luar (undo, pola) hanya bila berbeda dari yang terakhir kita kirim, supaya karet tidak lompat.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (nilai !== terakhir.current || el.innerHTML === '' && nilai !== '') {
      if (polos) el.textContent = nilai;
      else el.innerHTML = nilai;
      terakhir.current = nilai;
    }
  }, [nilai, polos]);

  useEffect(() => {
    if (idFokus && fokus?.id === idFokus && ref.current) {
      pasangKaret(ref.current, fokus.di);
      setFokus(null);
    }
  }, [fokus, idFokus, setFokus]);

  const kirim = () => {
    const el = ref.current;
    if (!el) return;
    const h = polos ? (el.textContent ?? '') : rapikanHtml(el.innerHTML);
    terakhir.current = h;
    ganti(h);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    if (kunci?.(e)) return;
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      if (pecah) {
        e.preventDefault();
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const r = sel.getRangeAt(0);
        r.deleteContents();
        const ekor = document.createRange();
        ekor.setStart(r.startContainer, r.startOffset);
        ekor.setEnd(el, el.childNodes.length);
        const tmp = document.createElement('div');
        tmp.appendChild(ekor.extractContents());
        const sebelum = rapikanHtml(el.innerHTML);
        terakhir.current = sebelum;
        pecah(sebelum, rapikanHtml(tmp.innerHTML));
        return;
      }
      if (!banyakBaris) {
        e.preventDefault();
        return;
      }
    }
    if (e.key === 'Enter' && (e.shiftKey || banyakBaris) && !polos) {
      e.preventDefault();
      document.execCommand('insertLineBreak');
      kirim();
      return;
    }
    if (e.key === 'Backspace' && hapusAwal) {
      const sel = window.getSelection();
      if (sel?.isCollapsed && posisiKaret(el) === 0) {
        e.preventDefault();
        hapusAwal(polos ? (el.textContent ?? '') : rapikanHtml(el.innerHTML));
        return;
      }
    }
    if (panah && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      const p = posisiKaret(el);
      if (e.key === 'ArrowUp' && p === 0) {
        e.preventDefault();
        panah(-1);
      } else if (e.key === 'ArrowDown' && p === panjangTeks(el)) {
        e.preventDefault();
        panah(1);
      }
    }
  };

  return createElement(tag, {
    ref,
    role: 'textbox',
    'aria-label': label ?? placeholder,
    'aria-multiline': !!(pecah || banyakBaris),
    contentEditable: !baca,
    suppressContentEditableWarning: true,
    spellCheck: true,
    'data-placeholder': placeholder,
    className: cn('ub-sunting', className),
    onInput: kirim,
    onBlur: kirim,
    onFocus: fokusMasuk,
    onKeyDown,
    onPaste: (e: ClipboardEvent) => {
      // Tempel sebagai teks polos agar gaya dari Word/web tidak ikut.
      e.preventDefault();
      const t = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, t);
    },
  });
}
