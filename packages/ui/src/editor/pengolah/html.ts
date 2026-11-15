/** Pertukaran HTML PengolahDokumen ⇄ server (kolom `isi` surat/templat). */
import { saringHtml } from '../dokumen/saring';

const POLA = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

/**
 * Ubah penanda `{{nama}}` yang masih berupa teks biasa (templat lama, hasil ketik) menjadi
 * `<span class="ub-penanda">{{nama}}</span>` agar tampil sebagai chip di editor.
 */
export function penandaKeChip(html: string): string {
  if (!html || !html.includes('{{')) return html;
  if (typeof DOMParser === 'undefined') {
    return html.replace(POLA, (_m, n: string) => `<span class="ub-penanda">{{${n}}}</span>`);
  }
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const jalan = doc.createTreeWalker(doc.body, 4);
  const teks: Text[] = [];
  for (let n = jalan.nextNode(); n; n = jalan.nextNode()) {
    const t = n as Text;
    if (POLA.test(t.data) && !t.parentElement?.classList.contains('ub-penanda')) teks.push(t);
    POLA.lastIndex = 0;
  }
  for (const t of teks) {
    const frag = doc.createDocumentFragment();
    let akhir = 0;
    for (const m of t.data.matchAll(POLA)) {
      const i = m.index ?? 0;
      if (i > akhir) frag.append(t.data.slice(akhir, i));
      const span = doc.createElement('span');
      span.className = 'ub-penanda';
      span.textContent = `{{${m[1]}}}`;
      frag.append(span);
      akhir = i + m[0].length;
    }
    if (akhir < t.data.length) frag.append(t.data.slice(akhir));
    t.replaceWith(frag);
  }
  return doc.body.innerHTML;
}

/**
 * HTML siap simpan dari editor: disaring seperti server, tabel tanpa colgroup, paragraf kosong di akhir dibuang.
 * Penanda tetap `{{nama}}` di dalam `span.ub-penanda`, jadi `isiTemplat` server mengisinya seperti biasa.
 */
export function htmlPengolah(html: string): string {
  const bersih = saringHtml(html.replace(/<colgroup>[\s\S]*?<\/colgroup>/g, ''));
  return bersih.replace(/(<p>(<br\s*\/?>)?<\/p>\s*)+$/g, '').trim();
}

/** Teks polos (untuk hitung kata dan ringkasan). */
export function teksPolos(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Kelas `ub-*` yang dihasilkan PengolahDokumen beserta artinya. Dipakai sisi server (PDF) dan dokumentasi agar
 * tampilan di editor sama dengan hasil cetak.
 */
export const KELAS_PENGOLAH: Record<string, string> = {
  'ub-rata-tengah / -kanan / -penuh': 'text-align',
  'ub-inden-1 … ub-inden-6': 'margin-left 1,27 cm per tingkat',
  'ub-inden-awal': 'text-indent 1,27 cm',
  'ub-baris-1 / -15 / -2': 'line-height 1 / 1,5 / 2 (bawaan 1,15)',
  'ub-uk-8 … ub-uk-28': 'font-size dalam pt',
  'ub-huruf-serif / -sans / -mono': 'font-family',
  'ub-warna-*': 'color (hitam, abu, merah, oranye, hijau, biru, ungu, utama)',
  'ub-sorot-*': 'background stabilo (kuning, hijau, biru, merah, abu)',
  'ub-tabel-garis / ub-tabel-polos': 'tabel bergaris / tanpa garis',
  'ub-lebar-gambar-25 … -100': 'lebar gambar dalam persen',
  'ub-gambar-kiri / -tengah / -kanan': 'posisi gambar',
  'ub-pindah-halaman': 'pemisah halaman (hr)',
  'ub-penanda': 'penanda {{nama}}',
};
