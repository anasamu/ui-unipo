/**
 * Penyaring HTML, cermin `Portal\Services\HtmlSanitizer` di SIAKAD (dipakai untuk isi surat, templat, dan konten
 * portal). Allowlist tag dan atribut, kelas hanya `ub-*`, tanpa style/event handler, URL javascript:/data: dibuang,
 * iframe hanya YouTube/Vimeo/Google Maps, h1 menjadi h2. Hasilnya sama dengan yang disimpan server, jadi pratinjau
 * di peramban tidak menampilkan sesuatu yang nanti hilang.
 */
const TAG: Record<string, string[]> = {
  p: [], br: [], hr: [], strong: [], b: [], em: [], i: [], u: [], s: [], sub: [], sup: [], small: [], mark: [],
  blockquote: ['cite'], q: ['cite'], h2: ['id'], h3: ['id'], h4: ['id'], h5: ['id'], h6: ['id'],
  ul: [], ol: ['start', 'type'], li: [], dl: [], dt: [], dd: [],
  a: ['href', 'title', 'target', 'rel'], img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
  figure: [], figcaption: [], table: [], thead: [], tbody: [], tfoot: [], tr: [], th: ['colspan', 'rowspan', 'scope'], td: ['colspan', 'rowspan'], caption: [],
  pre: [], code: [], span: [], div: [], iframe: ['src', 'width', 'height', 'title', 'allowfullscreen', 'loading'], cite: [], details: [], summary: [],
};
const KELAS = /^ub-[a-z0-9-]{1,40}$/;
const BUANG = new Set(['script', 'style', 'noscript', 'template', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea', 'svg', 'math', 'link', 'meta', 'base', 'frame', 'frameset', 'applet', 'head', 'title']);
const IFRAME_HOST = /^https:\/\/(www\.)?(youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/|player\.vimeo\.com\/video\/|google\.com\/maps\/embed)/i;

/** Sama dengan HtmlSanitizer::urlAman. */
export function urlAmanServer(url: string, gambar = false): boolean {
  const u = url.replace(/[\x00-\x20]+/g, '').trim();
  if (!u) return false;
  if (/^(https?:)?\/\//i.test(u) || /^[/#?]/.test(u)) return true;
  if (!gambar && /^(mailto|tel):/i.test(u)) return true;
  return !/^[a-z][a-z0-9+.-]*:/i.test(u);
}

function saring(node: Element, doc: Document) {
  for (const anak of Array.from(node.childNodes)) {
    if (anak.nodeType === Node.COMMENT_NODE || anak.nodeType === Node.PROCESSING_INSTRUCTION_NODE || anak.nodeType === Node.CDATA_SECTION_NODE) {
      anak.remove();
      continue;
    }
    if (anak.nodeType !== Node.ELEMENT_NODE) continue;
    let el = anak as Element;
    let tag = el.tagName.toLowerCase();
    if (BUANG.has(tag)) {
      el.remove();
      continue;
    }
    if (tag === 'h1') {
      const h2 = doc.createElement('h2');
      for (const a of Array.from(el.attributes)) h2.setAttribute(a.name, a.value);
      while (el.firstChild) h2.appendChild(el.firstChild);
      el.replaceWith(h2);
      el = h2;
      tag = 'h2';
    }
    if (!TAG[tag]) {
      saring(el, doc);
      el.replaceWith(...Array.from(el.childNodes));
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      const nama = attr.name.toLowerCase();
      if (nama === 'class') {
        const kelas = [...new Set(attr.value.trim().split(/\s+/).filter((k) => KELAS.test(k)))];
        if (kelas.length) el.setAttribute('class', kelas.join(' '));
        else el.removeAttribute(attr.name);
        continue;
      }
      if (!TAG[tag].includes(nama)) {
        el.removeAttribute(attr.name);
        continue;
      }
      if ((nama === 'href' || nama === 'src' || nama === 'cite') && !urlAmanServer(attr.value, nama === 'src')) el.removeAttribute(attr.name);
    }
    if (tag === 'iframe' && !IFRAME_HOST.test(el.getAttribute('src') ?? '')) {
      el.remove();
      continue;
    }
    if (tag === 'a' && el.getAttribute('target')) {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
    if (tag === 'img' && !el.hasAttribute('src')) {
      el.remove();
      continue;
    }
    saring(el, doc);
  }
}

/** Saring HTML seperti server. Di luar peramban (SSR) mengembalikan string kosong. */
export function saringHtml(html?: string | null): string {
  if (!html || !html.trim() || typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(`<!DOCTYPE html><html><body><div id="__akar">${html.trim()}</div></body></html>`, 'text/html');
  const akar = doc.getElementById('__akar');
  if (!akar) return '';
  saring(akar, doc);
  return akar.innerHTML.trim();
}
