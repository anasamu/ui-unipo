// Peta "ekspor unipo-ui → endpoint SIAKAD yang dipanggil lewat SDK UNIPO", dibaca dari kode sumber packages/ui/src.
// Dipakai galeri untuk tab "sdk.ts" di "Lihat kode": setiap contoh menampilkan panggilan SDK yang dipakai komponennya.
// Termasuk panggilan tidak langsung (komponen → hook → siakad.request), dihitung per berkas lalu lintas berkas.
import ts from 'typescript';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

/** Nama modul SDK (siakad.<modul>) dari paket unipo-siakad-sdk yang terpasang. */
function modulSdk() {
  try {
    const req = createRequire(import.meta.url);
    const js = readFileSync(req.resolve('unipo-siakad-sdk'), 'utf8');
    return new Set([...js.matchAll(/get (\w+)\(\)\{return this\.resource\(/g)].map((m) => m[1]));
  } catch {
    return new Set();
  }
}
const MODUL_SDK = modulSdk();

const LIT = '(?:`((?:[^`\\\\]|\\\\.)*)`|\'(/v1[^\']*)\'|"(/v1[^"]*)")';
const RE_PATH = new RegExp(`\\bpath:\\s*${LIT}`, 'g');
const RE_METODE = /\bmethod:\s*['"](GET|POST|PUT|PATCH|DELETE)['"]/g;
// Sumber dinamis (mis. SUMBER_ENTITAS untuk PilihEntitas) memuat banyak endpoint yang dipakai sesuai prop; tidak dirunut.
const LEWATI = new Set(['SUMBER_ENTITAS']);

/** `${A}/x/${encodeURIComponent(id)}` → /v1/…/x/{id}. Variabel konstanta berkas sudah diganti nilainya. */
function rapikan(p, konst) {
  let s = p.replace(/\$\{(\w+)\}/g, (m, n) => konst[n] ?? m);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '$' && s[i + 1] === '{') {
      let d = 0;
      let j = i + 1;
      for (; j < s.length; j++) {
        if (s[j] === '{') d++;
        else if (s[j] === '}' && --d === 0) break;
      }
      const isi = s.slice(i + 2, j);
      const nama = (isi.match(/([A-Za-z_]\w*)\s*(?:\?\?[^)]*)?\)?\s*$/)?.[1] ?? 'id').replace(/^encodeURIComponent$/, 'id');
      out += `{${nama}}`;
      i = j;
    } else out += s[i];
  }
  out = out.split('?')[0].replace(/\/+$/, '');
  return out.startsWith('/v1') ? out : null;
}

function endpointLangsung(teks, konst) {
  const hasil = new Set();
  const metode = [...teks.matchAll(RE_METODE)].map((m) => ({ i: m.index, m: m[1] }));
  for (const m of teks.matchAll(RE_PATH)) {
    const p = rapikan(m[1] ?? m[2] ?? m[3], konst);
    if (!p) continue;
    // Metode terdekat dalam objek yang sama (±200 karakter); bawaan GET.
    let terbaik = null;
    for (const x of metode) {
      const jarak = Math.abs(x.i - m.index);
      if (jarak < 200 && (!terbaik || jarak < terbaik.j)) terbaik = { j: jarak, m: x.m };
    }
    hasil.add(`${terbaik?.m ?? 'GET'} ${p}`);
  }
  // Metode SDK bertipe: s.dasbor.getRingkas(…), siakad.keuangan.saya(…).
  for (const m of teks.matchAll(/\b(?:s|siakad|sdk|klien)\.([a-z]\w*)\.([a-z]\w*)\(/g)) {
    if (MODUL_SDK.has(m[1])) hasil.add(`SDK ${m[1]}.${m[2]}`);
  }
  return hasil;
}

function berkasTs(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      if (f !== 'data') out.push(...berkasTs(p));
    } else if (/\.tsx?$/.test(f) && !f.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

/** @returns {Record<string, string[]>} nama ekspor → ["GET /v1/…", "SDK dasbor.getRingkas", …] */
export function buatPetaSdk(srcDir) {
  const decl = []; // { nama[], teks, file, ekspor }
  const lokal = new Map(); // file → Map(nama → decl)
  const global = new Map(); // nama ekspor → decl
  for (const file of berkasTs(srcDir)) {
    const teks = readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, teks, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const konst = {};
    const peta = new Map();
    for (const st of sf.statements) {
      let nama = [];
      if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name) nama = [st.name.text];
      else if (ts.isVariableStatement(st)) {
        nama = st.declarationList.declarations.filter((d) => ts.isIdentifier(d.name)).map((d) => d.name.text);
        for (const d of st.declarationList.declarations) {
          const v = d.initializer;
          if (ts.isIdentifier(d.name) && v && (ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v)) && v.text.startsWith('/v1')) konst[d.name.text] = v.text;
        }
      }
      if (!nama.length) continue;
      const ekspor = !!st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      const d = { nama, teks: st.getText(sf), file, ekspor, konst };
      decl.push(d);
      for (const n of nama) {
        peta.set(n, d);
        if (ekspor && !global.has(n)) global.set(n, d);
      }
    }
    lokal.set(file, peta);
  }
  const memo = new Map();
  const runut = (d, jejak) => {
    if (memo.has(d)) return memo.get(d);
    if (jejak.has(d)) return new Set();
    jejak.add(d);
    const ep = endpointLangsung(d.teks, d.konst);
    const peta = lokal.get(d.file);
    for (const [, n] of d.teks.matchAll(/\b([A-Za-z_]\w*)\b/g)) {
      if (d.nama.includes(n) || LEWATI.has(n)) continue;
      const lain = peta.get(n) ?? global.get(n);
      if (lain && lain !== d) for (const e of runut(lain, jejak)) ep.add(e);
    }
    jejak.delete(d);
    memo.set(d, ep);
    return ep;
  };
  const hasil = {};
  for (const [n, d] of global) {
    const ep = runut(d, new Set());
    if (ep.size) hasil[n] = [...ep].sort((a, b) => a.slice(a.indexOf(' ')).localeCompare(b.slice(b.indexOf(' '))) || a.localeCompare(b)).slice(0, 24);
  }
  return hasil;
}
