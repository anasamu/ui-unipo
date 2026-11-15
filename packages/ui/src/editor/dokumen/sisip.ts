import * as React from 'react';

/**
 * Sisipkan teks di posisi kursor terakhir di dalam `wadah` (contentEditable dari editor blok). Posisi kursor diingat,
 * jadi tetap bekerja walau fokus sempat pindah ke isian lain (mis. kotak cari pustaka). Mengembalikan false bila
 * belum pernah ada kursor di wadah, supaya pemanggil bisa memakai cara lain (mis. paragraf baru).
 */
export function useSisipDiKaret(wadah: React.RefObject<HTMLElement | null>) {
  const karet = React.useRef<Range | null>(null);
  React.useEffect(() => {
    const catat = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount && wadah.current?.contains(sel.anchorNode)) karet.current = sel.getRangeAt(0).cloneRange();
    };
    document.addEventListener('selectionchange', catat);
    return () => document.removeEventListener('selectionchange', catat);
  }, [wadah]);

  return React.useCallback(
    (teks: string): boolean => {
      const aktif = document.activeElement as HTMLElement | null;
      if (aktif && wadah.current?.contains(aktif) && aktif.isContentEditable) {
        document.execCommand('insertText', false, teks);
        return true;
      }
      const rg = karet.current;
      const awal = rg?.startContainer;
      const el = awal ? (awal.nodeType === 1 ? (awal as HTMLElement) : awal.parentElement) : null;
      const sunting = el?.closest<HTMLElement>('[contenteditable="true"]');
      if (rg && sunting && wadah.current?.contains(sunting)) {
        sunting.focus();
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(rg);
        document.execCommand('insertText', false, teks);
        return true;
      }
      return false;
    },
    [wadah],
  );
}
