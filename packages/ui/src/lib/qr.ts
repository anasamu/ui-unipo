// Kode QR di browser dengan objek gaya yang sama dengan /v1/qr SIAKAD (Gaya.php, Tata.php, RenderSvg.php):
// gambar yang dibuat di sini dan di server tampak sama, hanya pengkodenya berbeda (keduanya QR standar).
import qrcode from 'qrcode-generator';

export type KoreksiQr = 'L' | 'M' | 'Q' | 'H';
export type BentukModulQr = 'kotak' | 'bulat' | 'titik' | 'rounded' | 'menyatu' | 'berlian' | 'garis_v' | 'garis_h';
export type BentukMataLuarQr = 'kotak' | 'rounded' | 'bulat' | 'daun';
export type BentukMataDalamQr = BentukMataLuarQr | 'berlian';

export interface GradasiQr {
  jenis: 'linear' | 'radial';
  /** Derajat, 0 = kiri ke kanan, 90 = atas ke bawah. */
  sudut: number;
  /** 2-5 warna hex. */
  warna: string[];
}

export interface LogoQr {
  /** kampus = logo perguruan tinggi, berkas = berkas_id di /v1/berkas, data = data URI. */
  sumber: 'kampus' | 'berkas' | 'data';
  berkas_id?: string | null;
  data?: string | null;
  /** Lebar logo dibanding lebar QR, 0.08-0.30. */
  ukuran: number;
  /** Kosongkan modul di bawah logo. */
  kosongkan: boolean;
  /** Ruang kosong di sekitar logo (modul). */
  margin: number;
  /** Warna latar di bawah logo; null = ikut latar QR. */
  latar: string | null;
  bulat: boolean;
}

export interface BingkaiQr {
  teks: string;
  posisi: 'bawah' | 'atas';
  warna: string;
  warna_teks: string;
  bentuk: 'kotak' | 'pil';
}

/** Objek gaya QR, sama dengan skema QrGaya di API. */
export interface GayaQr {
  warna: string;
  /** Warna hex atau 'transparan'. */
  latar: string;
  gradasi: GradasiQr | null;
  modul: BentukModulQr;
  mata_luar: BentukMataLuarQr;
  mata_dalam: BentukMataDalamQr;
  warna_mata_luar: string | null;
  warna_mata_dalam: string | null;
  logo: LogoQr | null;
  bingkai: BingkaiQr | null;
  koreksi: KoreksiQr;
  /** Zona tenang (modul), 0-10. */
  margin: number;
  /** Sudut latar, 0-50 (persen setengah sisi). */
  radius_latar: number;
}

/** Gaya parsial: kunci yang tidak diisi memakai bawaan; logo/gradasi/bingkai boleh parsial juga. */
export type GayaQrMasukan = Partial<Omit<GayaQr, 'logo' | 'bingkai' | 'gradasi'>> & {
  logo?: Partial<LogoQr> | null;
  bingkai?: Partial<BingkaiQr> | null;
  gradasi?: Partial<GradasiQr> | null;
};

export const PILIHAN_QR = {
  modul: ['kotak', 'bulat', 'titik', 'rounded', 'menyatu', 'berlian', 'garis_v', 'garis_h'] as BentukModulQr[],
  mata_luar: ['kotak', 'rounded', 'bulat', 'daun'] as BentukMataLuarQr[],
  mata_dalam: ['kotak', 'rounded', 'bulat', 'daun', 'berlian'] as BentukMataDalamQr[],
  koreksi: ['L', 'M', 'Q', 'H'] as KoreksiQr[],
};

export const GAYA_QR_BAWAAN: GayaQr = {
  warna: '#0f172a', latar: '#ffffff', gradasi: null,
  modul: 'kotak', mata_luar: 'kotak', mata_dalam: 'kotak',
  warna_mata_luar: null, warna_mata_dalam: null,
  logo: null, bingkai: null,
  koreksi: 'M', margin: 4, radius_latar: 0,
};

/** Preset yang sama dengan server (GayaRepo::PRESET). */
export const PRESET_GAYA_QR: Record<'bawaan' | 'presensi' | 'dokumen' | 'kartu', GayaQrMasukan> = {
  bawaan: {},
  presensi: { modul: 'menyatu', mata_luar: 'rounded', mata_dalam: 'rounded', warna: '#0f3d5e', koreksi: 'M', margin: 3 },
  dokumen: { modul: 'kotak', mata_luar: 'kotak', mata_dalam: 'kotak', warna: '#000000', koreksi: 'Q', margin: 2 },
  kartu: { modul: 'rounded', mata_luar: 'rounded', mata_dalam: 'bulat', warna: '#0f172a', margin: 2 },
};

/** Normalkan warna hex (#abc → #aabbcc); null bila bukan hex. */
export function hexQr(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  const m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(s);
  if (m) return `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}`;
  return /^#[0-9a-f]{6}$/.test(s) ? s : null;
}

const pilih = <T extends string>(v: unknown, daftar: readonly T[], cadangan: T): T => (daftar.includes(v as T) ? (v as T) : cadangan);
const batas = (v: unknown, min: number, maks: number, cadangan: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(maks, Math.max(min, v)) : cadangan);

/**
 * Lengkapi gaya parsial dengan bawaan (atau `dasar`). Nilai yang salah diabaikan (tidak melempar galat seperti API),
 * dan koreksi dinaikkan otomatis bila ada logo, sama dengan server.
 */
export function normalGayaQr(masukan: GayaQrMasukan | null | undefined, dasar: GayaQr = GAYA_QR_BAWAAN): GayaQr {
  const i = masukan ?? {};
  const g: GayaQr = { ...dasar };
  if ('warna' in i) g.warna = hexQr(i.warna) ?? g.warna;
  if ('latar' in i) g.latar = i.latar === 'transparan' || i.latar === null ? 'transparan' : hexQr(i.latar) ?? g.latar;
  if ('warna_mata_luar' in i) g.warna_mata_luar = i.warna_mata_luar ? hexQr(i.warna_mata_luar) : null;
  if ('warna_mata_dalam' in i) g.warna_mata_dalam = i.warna_mata_dalam ? hexQr(i.warna_mata_dalam) : null;
  if ('modul' in i) g.modul = pilih(i.modul, PILIHAN_QR.modul, g.modul);
  if ('mata_luar' in i) g.mata_luar = pilih(i.mata_luar, PILIHAN_QR.mata_luar, g.mata_luar);
  if ('mata_dalam' in i) g.mata_dalam = pilih(i.mata_dalam, PILIHAN_QR.mata_dalam, g.mata_dalam);
  if ('koreksi' in i) g.koreksi = pilih(i.koreksi, PILIHAN_QR.koreksi, g.koreksi);
  if ('margin' in i) g.margin = Math.round(batas(i.margin, 0, 10, g.margin));
  if ('radius_latar' in i) g.radius_latar = batas(i.radius_latar, 0, 50, g.radius_latar);
  if ('gradasi' in i) {
    const w = (i.gradasi?.warna ?? []).map(hexQr).filter((x): x is string => x !== null).slice(0, 5);
    g.gradasi = i.gradasi && w.length >= 2
      ? { jenis: i.gradasi.jenis === 'radial' ? 'radial' : 'linear', sudut: Math.round(batas(i.gradasi.sudut, -360, 360, 45)) % 360, warna: w }
      : null;
  }
  if ('logo' in i) {
    const l = i.logo;
    g.logo = l
      ? {
          sumber: pilih(l.sumber, ['kampus', 'berkas', 'data'] as const, l.berkas_id ? 'berkas' : l.data ? 'data' : 'kampus'),
          berkas_id: l.berkas_id ?? null,
          data: l.data ?? null,
          ukuran: batas(l.ukuran, 0.08, 0.3, 0.2),
          kosongkan: l.kosongkan ?? true,
          margin: batas(l.margin, 0, 4, 1),
          latar: l.latar ? hexQr(l.latar) : null,
          bulat: l.bulat ?? false,
        }
      : null;
  }
  if ('bingkai' in i) {
    const b = i.bingkai;
    g.bingkai = b
      ? {
          teks: String(b.teks ?? '').slice(0, 40),
          posisi: b.posisi === 'atas' ? 'atas' : 'bawah',
          warna: hexQr(b.warna) ?? '#0f172a',
          warna_teks: hexQr(b.warna_teks) ?? '#ffffff',
          bentuk: b.bentuk === 'pil' ? 'pil' : 'kotak',
        }
      : null;
  }
  if (g.logo && g.logo.kosongkan && (g.koreksi === 'L' || g.koreksi === 'M')) g.koreksi = 'Q';
  if (g.logo && g.logo.ukuran > 0.22) g.koreksi = 'H';
  return g;
}

/** Gabung beberapa lapis gaya (mis. preset → gaya bagian → tambahan halaman). */
export function gabungGayaQr(...lapis: Array<GayaQrMasukan | null | undefined>): GayaQr {
  return lapis.reduce<GayaQr>((g, l) => normalGayaQr(l, g), GAYA_QR_BAWAAN);
}

// ---------------------------------------------------------------- matriks

export interface MatriksQr {
  n: number;
  gelap(x: number, y: number): boolean;
}

/** Ubah teks menjadi QR (byte mode, UTF-8). Melempar galat bila terlalu panjang untuk tingkat koreksi. */
export function matriksQr(isi: string, koreksi: KoreksiQr = 'M'): MatriksQr {
  const bytes = new TextEncoder().encode(isi);
  let biner = '';
  for (const b of bytes) biner += String.fromCharCode(b);
  const q = qrcode(0, koreksi);
  q.addData(biner, 'Byte');
  q.make();
  const n = q.getModuleCount();
  return { n, gelap: (x, y) => x >= 0 && y >= 0 && x < n && y < n && q.isDark(y, x) };
}

// ---------------------------------------------------------------- tata letak (port Tata.php)

type Bentuk = ['rr', number, number, number, number, [number, number, number, number]] | ['c', number, number, number] | ['p', number[]];

interface TataQr {
  lebar: number;
  tinggi: number;
  ox: number;
  oy: number;
  tebal: number;
  pita: number;
  kotakLatar: [number, number, number, number];
  kotakLogo: [number, number, number] | null;
  data: Bentuk[];
  mata: Array<{ luar: Bentuk; lubang: Bentuk; dalam: Bentuk }>;
  n: number;
}

function tata(m: MatriksQr, g: GayaQr): TataQr {
  const n = m.n;
  const mg = g.margin;
  const q = n + 2 * mg;
  const b = g.bingkai;
  const tebal = b ? Math.max(1, q * 0.035) : 0;
  const pita = b && b.teks !== '' ? Math.max(4, q * 0.15) : 0;
  const atas = b && b.posisi === 'atas' ? pita : 0;
  const ox = tebal + mg;
  const oy = tebal + atas + mg;
  const t: TataQr = {
    lebar: q + 2 * tebal, tinggi: q + 2 * tebal + pita, ox, oy, tebal, pita, n,
    kotakLatar: [tebal, tebal + atas, q, q], kotakLogo: null, data: [], mata: [],
  };
  const l = g.logo;
  if (l) {
    const sisi = n * l.ukuran;
    t.kotakLogo = [ox + (n - sisi) / 2, oy + (n - sisi) / 2, sisi];
  }
  const mataPos: Array<[number, number]> = [[0, 0], [n - 7, 0], [0, n - 7]];
  const dalamMata = (x: number, y: number) => mataPos.some(([mx, my]) => x >= mx && x < mx + 7 && y >= my && y < my + 7);
  const c = n / 2;
  const tertutup = (x: number, y: number) => {
    if (!l || !l.kosongkan) return false;
    const jari = (n * l.ukuran) / 2 + l.margin;
    if (l.bulat) return Math.hypot(x + 0.5 - c, y + 0.5 - c) < jari + 0.5;
    return x + 1 > c - jari && x < c + jari && y + 1 > c - jari && y < c + jari;
  };
  const aktif = (x: number, y: number) => m.gelap(x, y) && !dalamMata(x, y) && !tertutup(x, y);
  const r4 = (r: number): [number, number, number, number] => [r, r, r, r];

  if (g.modul === 'kotak' || g.modul === 'garis_h') {
    for (let y = 0; y < n; y++) {
      let x = 0;
      while (x < n) {
        if (!aktif(x, y)) { x++; continue; }
        const awal = x;
        while (x < n && aktif(x, y)) x++;
        const pjg = x - awal;
        t.data.push(g.modul === 'kotak' ? ['rr', ox + awal, oy + y, pjg, 1, r4(0)] : ['rr', ox + awal + 0.06, oy + y + 0.1, pjg - 0.12, 0.8, r4(0.4)]);
      }
    }
  } else if (g.modul === 'garis_v') {
    for (let x = 0; x < n; x++) {
      let y = 0;
      while (y < n) {
        if (!aktif(x, y)) { y++; continue; }
        const awal = y;
        while (y < n && aktif(x, y)) y++;
        t.data.push(['rr', ox + x + 0.1, oy + awal + 0.06, 0.8, y - awal - 0.12, r4(0.4)]);
      }
    }
  } else {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (!aktif(x, y)) continue;
        const px = ox + x;
        const py = oy + y;
        switch (g.modul) {
          case 'bulat': t.data.push(['c', px + 0.5, py + 0.5, 0.5]); break;
          case 'titik': t.data.push(['c', px + 0.5, py + 0.5, 0.36]); break;
          case 'rounded': t.data.push(['rr', px + 0.06, py + 0.06, 0.88, 0.88, r4(0.28)]); break;
          case 'berlian': t.data.push(['p', [px + 0.5, py, px + 1, py + 0.5, px + 0.5, py + 1, px, py + 0.5]]); break;
          default: {
            const a = aktif(x, y - 1), bw = aktif(x, y + 1), ki = aktif(x - 1, y), ka = aktif(x + 1, y);
            const s = 0.02;
            t.data.push(['rr', px - (ki ? s : 0), py - (a ? s : 0), 1 + (ki ? s : 0) + (ka ? s : 0), 1 + (a ? s : 0) + (bw ? s : 0), [
              !a && !ki ? 0.5 : 0, !a && !ka ? 0.5 : 0, !bw && !ka ? 0.5 : 0, !bw && !ki ? 0.5 : 0,
            ]]);
          }
        }
      }
    }
  }

  const tajam = [2, 3, 1];
  mataPos.forEach(([mx, my], i) => {
    const x = ox + mx;
    const y = oy + my;
    const daun = (r: number): [number, number, number, number] => {
      const rr = r4(r);
      rr[tajam[i]!] = 0;
      return rr;
    };
    let luar: Bentuk, lubang: Bentuk, dalam: Bentuk;
    switch (g.mata_luar) {
      case 'bulat': luar = ['c', x + 3.5, y + 3.5, 3.5]; lubang = ['c', x + 3.5, y + 3.5, 2.5]; break;
      case 'rounded': luar = ['rr', x, y, 7, 7, r4(2)]; lubang = ['rr', x + 1, y + 1, 5, 5, r4(1.25)]; break;
      case 'daun': luar = ['rr', x, y, 7, 7, daun(3)]; lubang = ['rr', x + 1, y + 1, 5, 5, daun(2)]; break;
      default: luar = ['rr', x, y, 7, 7, r4(0)]; lubang = ['rr', x + 1, y + 1, 5, 5, r4(0)];
    }
    switch (g.mata_dalam) {
      case 'bulat': dalam = ['c', x + 3.5, y + 3.5, 1.5]; break;
      case 'rounded': dalam = ['rr', x + 2, y + 2, 3, 3, r4(0.9)]; break;
      case 'daun': dalam = ['rr', x + 2, y + 2, 3, 3, daun(1.4)]; break;
      case 'berlian': dalam = ['p', [x + 3.5, y + 1.8, x + 5.2, y + 3.5, x + 3.5, y + 5.2, x + 1.8, y + 3.5]]; break;
      default: dalam = ['rr', x + 2, y + 2, 3, 3, r4(0)];
    }
    t.mata.push({ luar, lubang, dalam });
  });
  return t;
}

// ---------------------------------------------------------------- SVG (port RenderSvg.php)

const f = (v: number) => {
  const s = v.toFixed(3).replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s;
};

function jalur(b: Bentuk): string {
  if (b[0] === 'c') {
    const [, cx, cy, r] = b;
    return `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
  }
  if (b[0] === 'p') {
    const p = b[1];
    let s = `M${f(p[0]!)} ${f(p[1]!)}`;
    for (let i = 2; i < p.length; i += 2) s += `L${f(p[i]!)} ${f(p[i + 1]!)}`;
    return s + 'Z';
  }
  const [, x, y, w, h, r] = b;
  const m = Math.min(w, h) / 2;
  const [a, bb, c, d] = r.map((v) => Math.min(v, m)) as [number, number, number, number];
  if (!a && !bb && !c && !d) return `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;
  let s = `M${f(x + a)} ${f(y)}H${f(x + w - bb)}`;
  if (bb > 0) s += `A${f(bb)} ${f(bb)} 0 0 1 ${f(x + w)} ${f(y + bb)}`;
  s += `V${f(y + h - c)}`;
  if (c > 0) s += `A${f(c)} ${f(c)} 0 0 1 ${f(x + w - c)} ${f(y + h)}`;
  s += `H${f(x + d)}`;
  if (d > 0) s += `A${f(d)} ${f(d)} 0 0 1 ${f(x)} ${f(y + h - d)}`;
  s += `V${f(y + a)}`;
  if (a > 0) s += `A${f(a)} ${f(a)} 0 0 1 ${f(x + a)} ${f(y)}`;
  return s + 'Z';
}

const escXml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);

let urutQr = 0;

export interface OpsiSvgQr {
  /** Lebar piksel atribut width (bawaan 256). Tinggi mengikuti bingkai. */
  ukuran?: number;
  /**
   * URL atau data URI gambar logo. Wajib untuk logo sumber 'kampus'/'berkas' (browser tidak tahu file-nya);
   * logo sumber 'data' memakai `gaya.logo.data` bila ini kosong.
   */
  logo?: string | null;
  /** Label aksesibilitas (bawaan "Kode QR"). */
  label?: string;
}

export interface HasilSvgQr {
  svg: string;
  /** Rasio tinggi/lebar (lebih dari 1 bila ada pita teks bingkai). */
  rasio: number;
  versi: number;
  koreksi: KoreksiQr;
}

/** Gambar QR sebagai teks SVG, dengan gaya yang sama persis seperti POST /v1/qr keluaran svg. */
export function svgKodeQr(isi: string, gaya?: GayaQrMasukan | GayaQr | null, opsi: OpsiSvgQr = {}): HasilSvgQr {
  const g = normalGayaQr(gaya as GayaQrMasukan);
  const m = matriksQr(isi, g.koreksi);
  const t = tata(m, g);
  const ukuran = Math.max(16, Math.round(opsi.ukuran ?? 256));
  const id = `uq${(++urutQr).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const defs: string[] = [];
  const isiSvg: string[] = [];
  const b = g.bingkai;
  if (b) {
    const r = b.bentuk === 'pil' ? t.tebal * 4 : t.tebal * 0.8;
    isiSvg.push(`<rect width="${f(t.lebar)}" height="${f(t.tinggi)}" rx="${f(r)}" fill="${b.warna}"/>`);
  }
  const [lx, ly, lw, lh] = t.kotakLatar;
  if (g.latar !== 'transparan') {
    const rl = b ? (b.bentuk === 'pil' ? t.tebal * 3 : t.tebal * 0.4) : ((lw / 2) * g.radius_latar) / 100;
    isiSvg.push(`<rect x="${f(lx)}" y="${f(ly)}" width="${f(lw)}" height="${f(lh)}"${rl > 0 ? ` rx="${f(rl)}"` : ''} fill="${g.latar}"/>`);
  }
  let warna = g.warna;
  if (g.gradasi) {
    const gr = g.gradasi;
    const jml = gr.warna.length - 1;
    const stop = gr.warna.map((w, i) => `<stop offset="${f(i / jml)}" stop-color="${w}"/>`).join('');
    const cx = t.ox + t.n / 2;
    const cy = t.oy + t.n / 2;
    if (gr.jenis === 'radial') {
      defs.push(`<radialGradient id="${id}g" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy)}" r="${f(t.n * 0.71)}">${stop}</radialGradient>`);
    } else {
      const a = (gr.sudut * Math.PI) / 180;
      const h = (t.n / 2) * (Math.abs(Math.cos(a)) + Math.abs(Math.sin(a)));
      defs.push(`<linearGradient id="${id}g" gradientUnits="userSpaceOnUse" x1="${f(cx - Math.cos(a) * h)}" y1="${f(cy - Math.sin(a) * h)}" x2="${f(cx + Math.cos(a) * h)}" y2="${f(cy + Math.sin(a) * h)}">${stop}</linearGradient>`);
    }
    warna = `url(#${id}g)`;
  }
  const l = g.logo;
  if (l && l.latar) {
    const jari = (t.n * l.ukuran) / 2 + l.margin * 0.6;
    const cx = t.ox + t.n / 2;
    const cy = t.oy + t.n / 2;
    const area: Bentuk = l.bulat ? ['c', cx, cy, jari] : ['rr', cx - jari, cy - jari, 2 * jari, 2 * jari, [jari * 0.18, jari * 0.18, jari * 0.18, jari * 0.18]];
    isiSvg.push(`<path d="${jalur(area)}" fill="${l.latar}"/>`);
  }
  const d = t.data.map(jalur).join('');
  if (d) isiSvg.push(`<path d="${d}" fill="${warna}"${g.modul === 'kotak' ? ' shape-rendering="crispEdges"' : ''}/>`);
  isiSvg.push(`<path fill-rule="evenodd" d="${t.mata.map((x) => jalur(x.luar) + jalur(x.lubang)).join('')}" fill="${g.warna_mata_luar ?? warna}"/>`);
  isiSvg.push(`<path d="${t.mata.map((x) => jalur(x.dalam)).join('')}" fill="${g.warna_mata_dalam ?? warna}"/>`);
  const src = opsi.logo ?? (l?.sumber === 'data' ? l.data : null);
  if (l && src && t.kotakLogo) {
    const [x, y, s] = t.kotakLogo;
    let clip = '';
    if (l.bulat) {
      defs.push(`<clipPath id="${id}c"><circle cx="${f(x + s / 2)}" cy="${f(y + s / 2)}" r="${f(s / 2)}"/></clipPath>`);
      clip = ` clip-path="url(#${id}c)"`;
    }
    isiSvg.push(`<image x="${f(x)}" y="${f(y)}" width="${f(s)}" height="${f(s)}" preserveAspectRatio="xMidYMid ${l.bulat ? 'slice' : 'meet'}"${clip} href="${escXml(src)}"/>`);
  }
  if (b && b.teks !== '') {
    const ty = b.posisi === 'atas' ? t.pita / 2 + t.tebal * 0.5 : t.tinggi - t.pita / 2 - t.tebal * 0.5;
    const fs = Math.min(t.pita * 0.5, (t.lebar * 1.55) / Math.max(8, [...b.teks].length));
    isiSvg.push(`<text x="${f(t.lebar / 2)}" y="${f(ty)}" fill="${b.warna_teks}" font-family="'Plus Jakarta Sans', Inter, 'DejaVu Sans', Arial, sans-serif" font-weight="700" font-size="${f(fs)}" text-anchor="middle" dominant-baseline="central">${escXml(b.teks)}</text>`);
  }
  const rasio = t.tinggi / t.lebar;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ukuran}" height="${Math.round(ukuran * rasio)}" viewBox="0 0 ${f(t.lebar)} ${f(t.tinggi)}" role="img" aria-label="${escXml(opsi.label ?? 'Kode QR')}">`
    + (defs.length ? `<defs>${defs.join('')}</defs>` : '') + isiSvg.join('') + '</svg>';
  return { svg, rasio, versi: (m.n - 17) / 4, koreksi: g.koreksi };
}

/**
 * Ubah SVG QR menjadi PNG (Blob) di browser, mis. untuk tombol unduh. Logo harus data URI atau URL se-origin/CORS
 * agar kanvas tidak "tercemar".
 */
export async function pngDariSvgQr(svg: string, lebar = 1024): Promise<Blob> {
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    await new Promise<void>((ok, gagal) => {
      img.onload = () => ok();
      img.onerror = () => gagal(new Error('SVG QR tidak bisa dimuat'));
      img.src = url;
    });
    const rasio = img.naturalHeight && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
    const kanvas = document.createElement('canvas');
    kanvas.width = lebar;
    kanvas.height = Math.round(lebar * rasio);
    kanvas.getContext('2d')!.drawImage(img, 0, 0, kanvas.width, kanvas.height);
    return await new Promise<Blob>((ok, gagal) => kanvas.toBlob((b) => (b ? ok(b) : gagal(new Error('Gagal membuat PNG'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Kontras dua warna hex (1-21). Di bawah ±3 QR sulit dipindai. */
export function kontrasQr(a: string, b: string): number {
  const lum = (h: string) => {
    const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((s) => (s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
  };
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
