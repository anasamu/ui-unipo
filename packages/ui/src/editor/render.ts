import { RASIO, type Blok, type TipeBlok } from './tipe';

/**
 * Render dan validasi blok di sisi klien, cermin dari app/Modules/Humas/Support/Blok.php di SIAKAD:
 * kelas `ub-*`, blok kosong dilewati, URL tidak aman dibuang, judul diberi id jangkar. Dipakai untuk pratinjau
 * dan untuk menolak isi yang pasti ditolak server sebelum dikirim. HTML yang disimpan tetap hasil render server.
 */

export const TIPE_BLOK: TipeBlok[] = ['paragraf', 'judul', 'daftar', 'kutipan', 'gambar', 'galeri', 'video', 'tombol', 'pemisah', 'spasi', 'kolom', 'tabel', 'kode', 'sorotan', 'berkas', 'akordion', 'peta'];
export const MAKS_BLOK = 600;
export const MAKS_JSON = 2_000_000;

// ------------------------------------------------------------------ validasi

/** Galat validasi blok dengan pesan sama dengan respons 422 server ({ blok: pesan }). */
export class GalatBlok extends Error {
  readonly field = 'blok';
}

/**
 * Validasi daftar blok seperti Blok::validasi(): harus daftar, tipe dikenal, maksimal 600 blok, kolom tidak boleh
 * di dalam kolom, ukuran JSON maksimal 2 MB. Melempar GalatBlok; mengembalikan daftar yang sama bila lolos.
 */
export function validasiBlok(blok: unknown): Blok[] {
  if (typeof blok === 'string') {
    if (blok.length > MAKS_JSON) throw new GalatBlok('isi terlalu besar');
    try {
      blok = JSON.parse(blok);
    } catch {
      throw new GalatBlok('harus berupa daftar blok');
    }
  }
  if (!Array.isArray(blok)) throw new GalatBlok('harus berupa daftar blok');
  let hitung = 0;
  const jalan = (daftar: unknown[], dalam: number) => {
    for (const b of daftar) {
      if (!b || typeof b !== 'object') continue;
      if (++hitung > MAKS_BLOK) throw new GalatBlok(`maksimal ${MAKS_BLOK} blok`);
      const tipe = String((b as Blok).tipe ?? '');
      if (!TIPE_BLOK.includes(tipe as TipeBlok)) throw new GalatBlok(`tipe blok tidak dikenal: ${tipe.slice(0, 30)}`);
      if (tipe === 'kolom') {
        if (dalam > 0) throw new GalatBlok('blok kolom tidak boleh di dalam kolom');
        ((b as Blok).anak ?? []).slice(0, 4).forEach((k) => Array.isArray(k) && jalan(k, dalam + 1));
      }
    }
  };
  jalan(blok, 0);
  if (JSON.stringify(blok).length > MAKS_JSON) throw new GalatBlok('isi terlalu besar');
  return blok as Blok[];
}

// ------------------------------------------------------------------ util

const e = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const polos = (h: string) => h.replace(/<[^>]*>/g, '');
const kosong = (h: string) => polos(h).replace(/&nbsp;/g, ' ').trim() === '';

const SEBARIS = new Set(['STRONG', 'EM', 'B', 'I', 'A', 'MARK', 'CODE', 'BR', 'SUB', 'SUP', 'U', 'S']);

/** Saring HTML sebaris: hanya format dasar dan tautan aman yang tersisa (penyaring server lebih ketat lagi). */
export function saringSebaris(html: string): string {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') return e(polos(html));
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const akar = doc.body.firstElementChild as Element;
  const jalan = (el: Element) => {
    Array.from(el.children).forEach((n) => {
      jalan(n);
      if (!SEBARIS.has(n.tagName)) {
        n.replaceWith(...Array.from(n.childNodes));
        return;
      }
      Array.from(n.attributes).forEach((a) => {
        if (n.tagName === 'A' && a.name === 'href' && urlAman(a.value)) return;
        n.removeAttribute(a.name);
      });
    });
  };
  jalan(akar);
  return akar.innerHTML;
}

/** Sama dengan HtmlSanitizer::urlAman: http(s), mailto, tel, jalur relatif, atau data:image untuk gambar. */
export function urlAman(url: string, gambar = false): boolean {
  const u = url.trim();
  if (!u || u.length > 2000) return false;
  if (/^(https?:)?\/\//i.test(u) || /^(mailto|tel):/i.test(u)) return true;
  if (gambar && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(u)) return true;
  return /^[/#?.]/.test(u) || !/^[a-z][a-z0-9+.-]*:/i.test(u);
}

/** Sama dengan Blok::embedVideo. */
export function embedVideo(url: string): string | null {
  const u = url.trim();
  const yt = u.match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = u.match(/^https?:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d{5,12})/);
  return vm ? `https://player.vimeo.com/video/${vm[1]}` : null;
}

/** Id jangkar judul, sama dengan Blok::jangkar (daftar isi otomatis). */
export function jangkar(html: string): string {
  const t = polos(html)
    .replace(/&nbsp;/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  return t.slice(0, 60).replace(/^-+|-+$/g, '') || 'bagian';
}

const ukuran = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const keterangan = (k: string) => (kosong(k) ? '' : `<figcaption>${saringSebaris(k)}</figcaption>`);

// ------------------------------------------------------------------ render

function satu(b: Blok): string {
  const d = (b.data ?? {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const t = (k: string) => String(d[k] ?? '');
  const rata = () => (d.rata === 'tengah' || d.rata === 'kanan' ? ` ub-rata-${d.rata}` : '');
  switch (b.tipe) {
    case 'paragraf':
      return kosong(t('teks')) ? '' : `<p class="ub-paragraf${d.besar ? ' ub-pembuka' : ''}${rata()}">${saringSebaris(t('teks'))}</p>`;
    case 'judul': {
      const n = Math.max(2, Math.min(4, Number(d.tingkat) || 2));
      return kosong(t('teks')) ? '' : `<h${n} id="${e(jangkar(t('teks')))}" class="ub-judul${rata()}">${saringSebaris(t('teks'))}</h${n}>`;
    }
    case 'daftar': {
      const tag = d.gaya === 'ol' ? 'ol' : 'ul';
      const li = (Array.isArray(d.item) ? d.item : []).filter((x: unknown) => typeof x === 'string' && !kosong(x)).map((x: string) => `<li>${saringSebaris(x)}</li>`).join('');
      return li ? `<${tag} class="ub-daftar">${li}</${tag}>` : '';
    }
    case 'kutipan': {
      if (kosong(t('teks'))) return '';
      const sumber = t('sumber') ? `<cite class="ub-kutipan-sumber">${e(polos(t('sumber')))}</cite>` : '';
      return `<blockquote class="ub-kutipan${d.gaya === 'sorot' ? ' ub-kutipan-sorot' : ''}"><p>${saringSebaris(t('teks'))}</p>${sumber}</blockquote>`;
    }
    case 'gambar': {
      if (!urlAman(t('url'), true)) return '';
      let img = `<img src="${e(t('url').trim())}" alt="${e(polos(t('alt')))}" loading="lazy">`;
      if (urlAman(t('tautan'))) img = `<a href="${e(t('tautan').trim())}">${img}</a>`;
      const lebar = d.lebar === 'lebar' || d.lebar === 'penuh' ? ` ub-lebar-${d.lebar}` : '';
      return `<figure class="ub-gambar${lebar}${rata()}">${img}${keterangan(t('keterangan'))}</figure>`;
    }
    case 'galeri': {
      const kolom = Math.max(2, Math.min(4, Number(d.kolom) || 3));
      const isi = (Array.isArray(d.gambar) ? d.gambar : [])
        .filter((g: any) => g && urlAman(String(g.url ?? ''), true)) // eslint-disable-line @typescript-eslint/no-explicit-any
        .map((g: any) => `<figure class="ub-galeri-item"><img src="${e(String(g.url).trim())}" alt="${e(polos(String(g.alt ?? '')))}" loading="lazy">${keterangan(String(g.keterangan ?? ''))}</figure>`) // eslint-disable-line @typescript-eslint/no-explicit-any
        .join('');
      return isi ? `<div class="ub-galeri ub-kolom-${kolom}">${isi}</div>` : '';
    }
    case 'video': {
      const src = embedVideo(t('url'));
      return src ? `<figure class="ub-video"><div class="ub-video-bingkai"><iframe src="${e(src)}" title="${e(polos(t('keterangan')) || 'Video')}" allowfullscreen loading="lazy"></iframe></div>${keterangan(t('keterangan'))}</figure>` : '';
    }
    case 'tombol': {
      const isi = (Array.isArray(d.tombol) ? d.tombol : [])
        .filter((x: any) => x && urlAman(String(x.url ?? '')) && polos(String(x.label ?? '')).trim()) // eslint-disable-line @typescript-eslint/no-explicit-any
        .map((x: any) => `<a class="ub-tombol ub-tombol-${x.gaya === 'garis' ? 'garis' : 'utama'}" href="${e(String(x.url).trim())}">${e(polos(String(x.label)).trim())}</a>`) // eslint-disable-line @typescript-eslint/no-explicit-any
        .join('');
      return isi ? `<div class="ub-tombol-grup${rata()}">${isi}</div>` : '';
    }
    case 'pemisah':
      return `<hr class="ub-pemisah${d.gaya === 'titik' ? ' ub-pemisah-titik' : ''}">`;
    case 'spasi':
      return `<div class="ub-spasi ub-spasi-${d.ukuran === 'kecil' || d.ukuran === 'besar' ? d.ukuran : 'sedang'}"></div>`;
    case 'kolom': {
      const rasio = d.rasio in RASIO ? d.rasio : '50-50';
      const isi = (b.anak ?? []).map((k) => `<div class="ub-kolom">${(k ?? []).map(satu).join('')}</div>`).join('');
      return `<div class="ub-kolom-grup ub-rasio-${rasio}">${isi}</div>`;
    }
    case 'tabel': {
      const baris: unknown[][] = (Array.isArray(d.baris) ? d.baris : []).filter(Array.isArray);
      if (!baris.length) return '';
      const kepala = Boolean(d.kepala);
      let h = '<figure class="ub-tabel"><table>';
      baris.forEach((r, i) => {
        const sel = kepala && i === 0 ? 'th' : 'td';
        const tr = r.map((c) => `<${sel}${sel === 'th' ? ' scope="col"' : ''}>${typeof c === 'string' ? saringSebaris(c) : ''}</${sel}>`).join('');
        h += kepala && i === 0 ? `<thead><tr>${tr}</tr></thead><tbody>` : `<tr>${tr}</tr>`;
      });
      return `${h}${kepala ? '</tbody>' : ''}</table>${keterangan(t('keterangan'))}</figure>`;
    }
    case 'kode':
      return t('teks') ? `<pre class="ub-kode"><code>${e(t('teks'))}</code></pre>` : '';
    case 'sorotan': {
      const gaya = ['sukses', 'peringatan', 'bahaya'].includes(d.gaya) ? d.gaya : 'info';
      const judul = t('judul') ? `<strong class="ub-sorotan-judul">${e(polos(t('judul')))}</strong>` : '';
      return `<div class="ub-sorotan ub-sorotan-${gaya}">${judul}<div class="ub-sorotan-isi">${saringSebaris(t('teks'))}</div></div>`;
    }
    case 'berkas': {
      if (!urlAman(t('url'))) return '';
      const nama = polos(t('nama')).trim() || decodeURIComponent(t('url').split('?')[0].split('/').pop() ?? 'berkas');
      const uk = Number(d.ukuran) > 0 ? `<small class="ub-berkas-ukuran">${ukuran(Number(d.ukuran))}</small>` : '';
      return `<div class="ub-berkas"><a href="${e(t('url').trim())}" target="_blank">${e(nama)}</a>${uk}</div>`;
    }
    case 'akordion': {
      const isi = (Array.isArray(d.item) ? d.item : [])
        .filter((x: any) => x && String(x.judul ?? '').trim()) // eslint-disable-line @typescript-eslint/no-explicit-any
        .map((x: any) => `<details class="ub-akordion-item"><summary>${e(polos(String(x.judul)))}</summary><div>${saringSebaris(String(x.isi ?? ''))}</div></details>`) // eslint-disable-line @typescript-eslint/no-explicit-any
        .join('');
      return isi ? `<div class="ub-akordion">${isi}</div>` : '';
    }
    case 'peta':
      return /^https:\/\/(www\.)?google\.com\/maps\/embed\?[^"'<>\s]+$/i.test(t('url'))
        ? `<figure class="ub-peta"><div class="ub-video-bingkai"><iframe src="${e(t('url'))}" title="Peta lokasi" loading="lazy"></iframe></div></figure>`
        : '';
  }
  return '';
}

/** HTML isi dari daftar blok (kelas ub-*), sama dengan Blok::html di server. */
export function blokKeHtml(blok: Blok[]): string {
  return blok.map(satu).join('');
}

/** Judul (H2-H4) untuk daftar isi: { id, teks, tingkat }. */
export function daftarIsiBlok(blok: Blok[]): Array<{ id: string; teks: string; tingkat: number }> {
  const out: Array<{ id: string; teks: string; tingkat: number }> = [];
  const jalan = (d: Blok[]) =>
    d.forEach((b) => {
      if (b.tipe === 'judul' && !kosong(String(b.data.teks ?? ''))) out.push({ id: jangkar(String(b.data.teks)), teks: polos(String(b.data.teks)), tingkat: Math.max(2, Math.min(4, Number(b.data.tingkat) || 2)) });
      b.anak?.forEach(jalan);
    });
  jalan(blok);
  return out;
}

/** Perkiraan menit baca (200 kata per menit, minimal 1). */
export function waktuBaca(jumlahKata: number): number {
  return Math.max(1, Math.round(jumlahKata / 200));
}
