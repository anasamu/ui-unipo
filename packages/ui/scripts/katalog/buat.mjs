#!/usr/bin/env node
/**
 * Membuat katalog fitur unipo-ui/katalog dari dokumen OpenAPI API SIAKAD (sumber yang sama dengan unipo-siakad-sdk).
 *
 *   npm run katalog -w unipo-ui -- ../unipo-sdk/openapi.json
 *   npm run katalog -w unipo-ui -- https://siakad.unipo.ac.id/api/v1/openapi.json
 *   npm run katalog -w unipo-ui -- --periksa ../unipo-sdk/openapi.json   (tidak menulis; kode 1 bila katalog basi
 *     atau ada tag OpenAPI yang belum dipetakan ke modul di scripts/katalog/modul.mjs)
 *
 * Hasil (di-commit, ikut terbit di paket):
 *   src/katalog/data/indeks.json        grup, modul, dan sumber data (kecil)
 *   src/katalog/data/modul/<key>.json   operasi + skema per modul (dimuat saat modul dibuka)
 *   src/katalog/data/muat.ts            peta impor dinamis per modul
 *   src/katalog/data/id.ts              tipe IdModul dan IdSumber (pelengkapan otomatis di editor)
 *
 * Aturan formulir (wajib, panjang, pola, enum, rentang, format) dan alur status aksi
 * ("Status harus draf, menjadi buka") diambil dari dokumen OpenAPI yang dibuat dari aturan backend
 * (PusatData\\Aturan dan PusatData\\Aksi), jadi frontend dan backend memakai aturan yang sama.
 */
import { readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GRUP, MODUL, TAG_DISEMBUNYIKAN } from './modul.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argumen = process.argv.slice(2);
// --periksa: bandingkan hasil dengan data yang sudah di-commit tanpa menulis apa pun (untuk CI/bangun_lokal).
const PERIKSA = argumen.includes('--periksa');
const sumber = argumen.find((a) => !a.startsWith('--')) || process.env.OPENAPI_URL;
if (!sumber) {
  console.error('Pemakaian: npm run katalog -w unipo-ui -- [--periksa] <url atau path openapi.json>');
  process.exit(1);
}

const spec = /^https?:\/\//.test(sumber)
  ? await (await fetch(sumber)).json()
  : JSON.parse(await readFile(sumber, 'utf8'));

const SKEMA = spec.components?.schemas ?? {};
const METODE = ['get', 'post', 'put', 'patch', 'delete'];

// ---------------------------------------------------------------- pemetaan tag -> modul
function modulUntukTag(tag) {
  for (const m of MODUL) if (m.tags.includes(tag)) return m.key;
  for (const m of MODUL) for (const t of m.tags) if (t.endsWith(':') && tag.startsWith(t)) return m.key;
  return null;
}

// ---------------------------------------------------------------- skema ringkas
function deref(s) {
  let n = 0;
  while (s && s.$ref && n++ < 10) s = SKEMA[s.$ref.split('/').pop()];
  return s ?? {};
}
function namaRef(s) {
  return s && s.$ref ? s.$ref.split('/').pop() : null;
}

/** Skema ringkas untuk formulir: hanya yang dipakai UI. */
function ringkas(s, depth = 0) {
  s = deref(s);
  const out = {};
  let type = s.type;
  let nullable = false;
  if (Array.isArray(type)) {
    nullable = type.includes('null');
    type = type.find((t) => t !== 'null') ?? 'string';
  }
  if (!type && s.properties) type = 'object';
  if (!type && s.oneOf) type = 'string';
  if (type) out.t = type;
  if (nullable) out.n = 1;
  for (const [k, a] of [['format', 'f'], ['enum', 'e'], ['maxLength', 'max'], ['minimum', 'min'], ['maximum', 'mx'], ['pattern', 'p']]) {
    if (s[k] !== undefined) out[a] = s[k];
  }
  if (s.default !== undefined) out.d = s.default;
  if (s.description) out.ds = String(s.description).slice(0, 300);
  if (s.readOnly) out.ro = 1;
  if (s.example !== undefined && typeof s.example !== 'object') out.ex = s.example;
  if (type === 'array' && s.items) out.i = depth < 3 ? ringkas(s.items, depth + 1) : { t: 'object' };
  if (type === 'object' && s.properties && depth < 3) {
    out.pr = {};
    for (const [k, v] of Object.entries(s.properties)) out.pr[k] = ringkas(v, depth + 1);
    if (Array.isArray(s.required) && s.required.length) out.rq = s.required;
  }
  return out;
}

// ---------------------------------------------------------------- operasi
const OLEH = { 'Pengelola modul': 'pengelola', 'Pemilik data': 'pemilik', 'Admin modul': 'admin', 'Pemilik data atau pengelola': 'pemilik_atau_pengelola' };
const ops = [];
const tagTakDikenal = new Set();
for (const [path, item] of Object.entries(spec.paths ?? {})) {
  for (const m of METODE) {
    const o = item[m];
    if (!o) continue;
    const tag = (o.tags ?? ['Lainnya'])[0];
    if (TAG_DISEMBUNYIKAN.includes(tag)) continue;
    const modul = modulUntukTag(tag);
    if (!modul) {
      tagTakDikenal.add(tag);
      continue;
    }
    const params = (o.parameters ?? []).map((p) => {
      const q = { nm: p.name, in: p.in, s: ringkas(p.schema ?? {}) };
      if (p.required) q.rq = 1;
      if (p.description) q.ds = String(p.description).slice(0, 200);
      return q;
    });
    let body = null;
    const konten = o.requestBody?.content ?? {};
    const jenisBody = Object.keys(konten)[0];
    if (jenisBody) {
      const sk = konten[jenisBody].schema ?? {};
      body = { ct: jenisBody, ref: namaRef(sk), s: ringkas(sk) };
      if (o.requestBody.required) body.rq = 1;
    }
    let respon = 'none';
    let itemSkema = null;
    for (const code of ['200', '201']) {
      const sk = o.responses?.[code]?.content?.['application/json']?.schema;
      if (!sk) continue;
      const data = sk.properties?.data;
      if (data?.type === 'array') {
        respon = 'list';
        itemSkema = namaRef(data.items) ?? null;
      } else if (data) {
        respon = 'object';
        itemSkema = namaRef(data) ?? null;
      } else {
        respon = 'raw';
      }
      break;
    }
    const scope = Array.isArray(o['x-scopes']) && o['x-scopes'].length ? o['x-scopes'] : (/\*\*Scope:\*\*\s*`([^`]+)`/.exec(o.description ?? '')?.[1]?.split(/\s*,\s*/) ?? null);
    const publik = Array.isArray(o.security) && o.security.length === 0;
    const deskripsi = (o.description ?? '').replace(/\*\*Scope:\*\*.*$/s, '').trim();
    // Alur status aksi dari PusatData\Rute: "<Siapa>. Status harus a/b, menjadi c."
    const st = /Status harus ([^,.]+?)(?:, menjadi ([^.\s]+))?\./.exec(deskripsi);
    const siapa = /(Pemilik data atau pengelola|Pengelola modul|Pemilik data|Admin modul)\./.exec(deskripsi)?.[1];
    const tr = st ? { dari: st[1].split('/').map((x) => x.trim()), ...(st[2] ? { ke: st[2] } : {}) } : null;
    ops.push({
      id: o.operationId || `${m}${path}`,
      m: m.toUpperCase(),
      path,
      tag,
      modul,
      sum: o.summary ?? '',
      ...(deskripsi ? { ds: deskripsi.slice(0, 600) } : {}),
      ...(scope ? { sc: scope } : {}),
      ...(publik ? { pub: 1 } : {}),
      ...(tr ? { tr } : {}),
      ...(siapa ? { oleh: OLEH[siapa] } : {}),
      ...(params.length ? { pa: params } : {}),
      ...(body ? { b: body } : {}),
      r: respon,
      ...(itemSkema ? { it: itemSkema } : {}),
    });
  }
}

// ---------------------------------------------------------------- sumber data (resource)
const segs = (p) => p.split('/').filter(Boolean);
const isParam = (s) => /^\{.+\}$/.test(s);
const byPath = new Map();
for (const o of ops) {
  if (!byPath.has(o.path)) byPath.set(o.path, []);
  byPath.get(o.path).push(o);
}

/** Path koleksi: punya GET daftar, atau punya path item {x} di bawahnya. */
const koleksi = new Set();
for (const o of ops) {
  const s = segs(o.path);
  if (o.m === 'GET' && o.r === 'list') koleksi.add(o.path);
  if (s.length > 2 && isParam(s.at(-1))) {
    const base = '/' + s.slice(0, -1).join('/');
    if (byPath.has(base) || ops.some((x) => x.path.startsWith(base + '/{'))) koleksi.add(base);
  }
}

function judulDari(teks) {
  return teks
    .replace(/^(Daftar|Cari|Lihat|Semua)\s+/i, '')
    .replace(/\s*:\s*(daftar|cari|semua).*$/i, '')
    .replace(/\s*\(.*\)$/, '')
    .trim();
}
function kapital(t) {
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}
function humanize(seg) {
  const t = seg.replace(/[-_]/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const resources = new Map();
for (const base of [...koleksi].sort()) {
  const di = byPath.get(base) ?? [];
  const list = di.find((o) => o.m === 'GET' && o.r === 'list');
  const create = di.find((o) => o.m === 'POST');
  // path item: base/{x}
  const itemPath = [...byPath.keys()].find((p) => {
    const s = segs(p);
    return p.startsWith(base + '/') && s.length === segs(base).length + 1 && isParam(s.at(-1));
  });
  const di2 = itemPath ? byPath.get(itemPath) : [];
  const get = di2.find((o) => o.m === 'GET');
  const update = di2.find((o) => o.m === 'PUT') ?? di2.find((o) => o.m === 'PATCH');
  const del = di2.find((o) => o.m === 'DELETE');
  const contoh = list ?? create ?? get ?? update ?? del ?? di[0] ?? di2[0];
  if (!contoh) continue;
  const judul =
    (list && judulDari(list.sum)) ||
    (contoh.tag.includes(':') ? contoh.tag.split(':').slice(1).join(':').trim() : '') ||
    humanize(segs(base).at(-1));
  resources.set(base, {
    id: base,
    modul: contoh.modul,
    tag: contoh.tag,
    title: kapital(judul),
    base,
    ...(itemPath ? { item: itemPath, key: segs(itemPath).at(-1).slice(1, -1) } : {}),
    ...(list ? { list: list.id } : {}),
    ...(create ? { create: create.id } : {}),
    ...(get ? { get: get.id } : {}),
    ...(update ? { update: update.id } : {}),
    ...(del ? { del: del.id } : {}),
    actions: [],
    children: [],
  });
}

/** Path dengan nama parameter diseragamkan, supaya /a/{id} dan /a/{kode}/b dianggap satu induk. */
const norm = (p) => p.replace(/\{[^}]+\}/g, '{}');

/** Sumber induk terpanjang yang path item-nya menjadi awalan path ini. */
function indukDari(path) {
  let best = null;
  const np = norm(path);
  for (const r of resources.values()) {
    if (!r.item || r.id === path) continue;
    if (np.startsWith(norm(r.item) + '/') && (!best || r.item.length > best.item.length)) best = r;
  }
  return best;
}

const dipakai = new Set();
for (const r of resources.values()) {
  for (const k of ['list', 'create', 'get', 'update', 'del']) if (r[k]) dipakai.add(r[k]);
  const induk = indukDari(r.base);
  if (induk && induk.modul === r.modul) {
    r.parent = induk.id;
    induk.children.push(r.id);
  }
  // PATCH tambahan di path item (mis. PUT + PATCH) jadi aksi
}

// operasi lain: aksi item (base/{x}/kata) atau operasi mandiri
const mandiri = [];
for (const o of ops) {
  if (dipakai.has(o.id)) continue;
  const s = segs(o.path);
  const induk = indukDari(o.path);
  if (induk && induk.modul === o.modul && segs(o.path).length === segs(induk.item).length + 1 && !isParam(s.at(-1))) {
    induk.actions.push(o.id);
    continue;
  }
  const r = resources.get(o.path);
  if (r && r.modul === o.modul) {
    r.extra = [...(r.extra ?? []), o.id];
    continue;
  }
  const ri = [...resources.values()].find((x) => x.item === o.path);
  if (ri && ri.modul === o.modul) {
    ri.actions.push(o.id);
    continue;
  }
  mandiri.push(o.id);
}

// ---------------------------------------------------------------- isian referensi
/*
 * Isian yang berisi kunci data lain (NIM, NIDN, username, kode prodi, "ID di kmhs_ormawa", ormawa_id, ...) diberi
 * `rf` supaya formulir menampilkan pilih-dengan-cari, bukan kotak ketik ID manual:
 *   rf = { l: path daftar, k: kolom nilai, d?: path detail (label nilai lama), q?: 0 bila daftar tanpa pencarian server }
 *   l = 'pengguna' berarti akun SIAKAD (dicari lewat RBAC).
 */
const ACUAN_TETAP = {
  mahasiswa: { l: '/v1/mahasiswa', k: 'nim', d: '/v1/mahasiswa/{nim}' },
  dosen: { l: '/v1/dosen', k: 'nidn', d: '/v1/dosen/{nidn}' },
  pengguna: { l: 'pengguna', k: 'username' },
  prodi: { l: '/v1/referensi/prodi', k: 'kode_prodi', q: 0 },
  fakultas: { l: '/v1/master/fakultas', k: 'kode_fakultas', q: 0 },
  tahun: { l: '/v1/referensi/tahun-akademik', k: 'tahun_id', q: 0 },
  pegawai: { l: '/v1/sdm/pegawai', k: 'id', d: '/v1/sdm/pegawai/{id}' },
  karyawan: { l: '/v1/sdm/pegawai', k: 'nik_karyawan' },
};
// Awalan tabel -> segmen path modul API.
const AWALAN_TABEL = {
  kmhs: 'kemahasiswaan', sarpras: 'sarpras', lppm: 'lppm', induk: 'induk', sdm: 'sdm', rbac: 'rbac', keu: 'keu', crm: 'crm', iku: 'iku',
  tracer: 'tracer', karier: 'karier', rpl: 'rpl', mbkm: 'mbkm', cbt: 'cbt', kerjasama: 'kerjasama', arsip: 'arsip', helpdesk: 'helpdesk',
  kls: 'kelulusan', pmb: 'admisi', portal: 'portal', spmi: 'spmi', lms: 'lms', kalender: 'kalender', layanan: 'layanan', repo: 'repositori',
  perpus: 'perpustakaan', edom: 'edom', integrasi: 'integrasi', notif: 'notifikasi', kurikulum: 'kurikulum-obe', sister: 'sdm',
};
const daftarSumber = [...resources.values()].filter((r) => r.list && r.item && !segs(r.base).some(isParam));
const varian = (t) => {
  const a = t.replace(/_/g, '-');
  return new Set([a, a.replace(/^ref-/, ''), a.replace(/^ref-/, 'referensi/'), a + 's']);
};

/** Cari sumber daftar untuk kata benda (mis. "ormawa", "jenis_luaran") di modul (segmen path) tertentu. */
function sumberUntuk(benda, segmenModul, pathOp) {
  const v = varian(benda);
  const cocok = daftarSumber.filter((r) => {
    const s = segs(r.base);
    return v.has(s.at(-1)) || v.has(s.slice(-2).join('/'));
  });
  if (!cocok.length) return null;
  const nilai = (r) => {
    const s = segs(r.base);
    let n = 0;
    if (segmenModul && s[1] === segmenModul) n += 10;
    if (pathOp && segs(pathOp)[1] === s[1]) n += 5;
    n -= s.length; // yang lebih dangkal lebih umum
    return n;
  };
  cocok.sort((a, b) => nilai(b) - nilai(a));
  const r = cocok[0];
  // Tanpa nama tabel, sumber harus dari modul yang sama: topik_id di LMS bukan topik Humas.
  if (segmenModul && segs(r.base)[1] !== segmenModul) return null;
  return { l: r.base, k: 'id', d: r.item.replace(/\{[^}]+\}$/, '{id}') };
}

function acuanUntuk(nama, s, pathOp) {
  if (!s || (s.t && !['string', 'integer'].includes(s.t)) || s.e) return null;
  if (/^\/v1\/(auth|oauth)/.test(pathOp)) return null;
  const ds = s.ds ?? '';
  const n = nama.toLowerCase();
  if (/m_mahasiswa\.nim/i.test(ds) || n === 'nim' || n.endsWith('_nim')) return ACUAN_TETAP.mahasiswa;
  if (/m_dosen\.nidn/i.test(ds) || n === 'nidn' || n.endsWith('_nidn')) return ACUAN_TETAP.dosen;
  if (/user\.username|username siakad/i.test(ds) || n === 'username' || n.endsWith('_username')) return ACUAN_TETAP.pengguna;
  if (/m_program_studi\.kode_prodi/i.test(ds) || n === 'kode_prodi') return ACUAN_TETAP.prodi;
  if (/m_fakultas\.kode_fakultas/i.test(ds) || n === 'kode_fakultas') return ACUAN_TETAP.fakultas;
  if (/m_tahun\.tahun_id/i.test(ds) || n === 'tahun_id') return ACUAN_TETAP.tahun;
  if (/m_karyawan\.nik/i.test(ds) || n === 'nik_karyawan') return ACUAN_TETAP.karyawan;
  if (n === 'pegawai_id' || n === 'sdm_pegawai_id') return ACUAN_TETAP.pegawai;
  if (n === 'prodi' && (!s.t || s.t === 'string')) return ACUAN_TETAP.prodi;
  // "ID di kmhs_ormawa", "ID arsip_unit", "ID lppm_periode", "ID portal_media situs yang sama"
  const t = /\bID (?:di )?([a-z]+)_([a-z_]+)\b/.exec(ds);
  if (t) return sumberUntuk(t[2], AWALAN_TABEL[t[1]] ?? null, pathOp);
  // ormawa_id, mitra_id, induk_id (induk = sumber yang sama)
  const m = /^(?:id_)?([a-z_]+?)_id$/.exec(n);
  if (m && !['client', 'entitas', 'sumber', 'balasan_untuk', 'responden', 'pmb_pendaftaran', 'gambar_media', 'logo_media'].includes(m[1])) {
    if (m[1] === 'induk') {
      const base = segs(pathOp).some(isParam) ? pathOp.replace(/\/\{[^}]+\}.*$/, '') : pathOp;
      const r = daftarSumber.find((x) => x.base === base);
      return r ? { l: r.base, k: 'id', d: r.item.replace(/\{[^}]+\}$/, '{id}') } : null;
    }
    // kerjasama_dokumen_id, sdm_pegawai_id: awalan tabel menunjuk modulnya.
    const [awal, ...sisa] = m[1].split('_');
    if (sisa.length && AWALAN_TABEL[awal]) return sumberUntuk(sisa.join('_'), AWALAN_TABEL[awal], pathOp);
    return sumberUntuk(m[1], segs(pathOp)[1], pathOp);
  }
  return null;
}

let jumlahAcuan = 0;
const tanpaAcuan = new Map();
for (const o of ops) {
  const pr = o.b?.s?.pr;
  if (pr) {
    for (const [k, v] of Object.entries(pr)) {
      if (v.ro) continue;
      const rf = acuanUntuk(k, v, o.path);
      if (rf) {
        v.rf = rf;
        jumlahAcuan++;
      } else if (/(^|_)(id|nim|nidn|username)$/.test(k) && k !== 'id') tanpaAcuan.set(`${k} (${v.ds ?? ''})`, o.path);
    }
  }
  for (const p of o.pa ?? []) {
    if (p.in === 'path') {
      // /v1/x/{id}/aksi: pilih baris dari daftar /v1/x (operasi mandiri yang dijalankan manual dari Pustikom).
      const i = o.path.indexOf(`/{${p.nm}}`);
      const base = i > 0 ? o.path.slice(0, i) : null;
      const r = base && !segs(base).some(isParam) ? daftarSumber.find((x) => x.base === base) : null;
      const rf = r ? { l: r.base, k: p.nm, d: `${r.base}/{${p.nm}}` } : acuanUntuk(p.nm, p.s, o.path);
      if (rf) {
        p.s.rf = rf;
        jumlahAcuan++;
      }
      continue;
    }
    if (p.in !== 'query') continue;
    const rf = acuanUntuk(p.nm, { ...p.s, ds: p.ds ?? p.s.ds }, o.path);
    if (rf) {
      p.s.rf = rf;
      jumlahAcuan++;
    }
  }
}

// ---------------------------------------------------------------- tulis
const outDir = join(root, 'src', 'katalog', 'data');
/** Isi berkas hasil (path relatif terhadap outDir -> teks); ditulis atau dibandingkan di akhir. */
const berkas = new Map();

const opById = new Map(ops.map((o) => [o.id, o]));
const indeks = { versi: spec.info?.version ?? '', grup: GRUP, modul: [] };
let total = 0;
for (const m of MODUL) {
  const res = [...resources.values()].filter((r) => r.modul === m.key);
  const opsModul = ops.filter((o) => o.modul === m.key);
  if (!opsModul.length) continue;
  total += opsModul.length;
  const pakaiSkema = new Set();
  for (const o of opsModul) {
    if (o.it) pakaiSkema.add(o.it);
  }
  const skema = {};
  for (const n of pakaiSkema) if (SKEMA[n]) skema[n] = ringkas(SKEMA[n]);
  const ops2 = {};
  for (const o of opsModul) {
    const { modul, ...rest } = o;
    ops2[o.id] = rest;
  }
  const opMandiri = mandiri.filter((id) => opById.get(id).modul === m.key);
  berkas.set(
    `modul/${m.key}.json`,
    JSON.stringify({ key: m.key, resources: res.map(({ modul, ...r }) => r), ops: ops2, mandiri: opMandiri, skema }),
  );
  indeks.modul.push({
    key: m.key,
    group: m.group,
    title: m.title,
    icon: m.icon,
    desc: m.desc,
    jumlahOperasi: opsModul.length,
    // Scope API yang dibutuhkan, supaya menu bisa disembunyikan dari pengguna yang tidak memilikinya.
    scope: [...new Set(opsModul.flatMap((o) => o.sc ?? []))],
    sumber: res
      .filter((r) => !r.parent)
      .map((r) => ({ id: r.id, title: r.title, tag: r.tag, sc: opById.get(r.list ?? r.get ?? r.create)?.sc })),
    operasi: opMandiri.map((id) => ({ id, title: opById.get(id).sum, tag: opById.get(id).tag, m: opById.get(id).m, sc: opById.get(id).sc })),
  });
}
// Peta path sumber -> modul, supaya <Fitur sumber="/v1/..."> tahu modul mana yang dimuat.
indeks.peta = Object.fromEntries([...resources.values()].filter((r) => indeks.modul.some((m) => m.key === r.modul)).map((r) => [r.id, r.modul]));
berkas.set('indeks.json', JSON.stringify(indeks));

// Impor dinamis per modul: bundler memecah tiap modul jadi berkas sendiri, dimuat saat modul dibuka.
const kunciModul = indeks.modul.map((m) => m.key);
berkas.set(
  'muat.ts',
  `// Dibuat oleh scripts/katalog/buat.mjs. Jangan diubah manual.\nimport type { ModulKatalog } from '../tipe';\n\nconst j = (m: { default?: unknown }) => (m.default ?? m) as ModulKatalog;\n\nexport const MUAT_MODUL: Record<string, () => Promise<ModulKatalog>> = {\n${kunciModul
    .map((k) => `  '${k}': () => import('./modul/${k}.json').then(j),`)
    .join('\n')}\n};\n`,
);
const idSumber = [...resources.values()].filter((r) => kunciModul.includes(r.modul)).map((r) => r.id).sort();
berkas.set(
  'id.ts',
  `// Dibuat oleh scripts/katalog/buat.mjs. Jangan diubah manual.\n/** Kunci modul fitur. */\nexport type IdModul =\n${kunciModul.map((k) => `  | '${k}'`).join('\n')};\n\n/** Path sumber data (koleksi) di API SIAKAD, mis. '/v1/kemahasiswaan/beasiswa'. */\nexport type IdSumber =\n${idSumber.map((k) => `  | '${k}'`).join('\n')};\n`,
);

if (PERIKSA) {
  // Bandingkan dengan data di repo. Basi = sumber/operasi baru di API yang belum ada di katalog (mis. <KelolaSumber
  // sumber="/v1/spmi/alur"> menampilkan "Sumber ... tidak ada di katalog").
  const bacaLama = async (f) => readFile(join(outDir, f), 'utf8').catch(() => null);
  const lamaModul = (await readdir(join(outDir, 'modul')).catch(() => [])).map((f) => `modul/${f}`);
  const beda = [];
  for (const [f, isi] of berkas) if ((await bacaLama(f)) !== isi) beda.push(f);
  for (const f of lamaModul) if (!berkas.has(f)) beda.push(`${f} (tidak dibuat lagi)`);
  // Tag tanpa modul tidak masuk katalog sama sekali (sumbernya "tidak ada di katalog"), jadi ikut dianggap basi.
  if (tagTakDikenal.size) {
    console.error(`Tag OpenAPI belum dipetakan ke modul katalog (tambahkan di scripts/katalog/modul.mjs): ${[...tagTakDikenal].join(', ')}.`);
    if (!beda.length) process.exit(1);
  }
  if (!beda.length) {
    console.log(`Katalog mutakhir terhadap ${sumber}: ${indeks.modul.length} modul, ${resources.size} sumber data, ${total} operasi.`);
    process.exit(0);
  }
  let petaLama = {};
  try {
    petaLama = JSON.parse((await bacaLama('indeks.json')) ?? '{}').peta ?? {};
  } catch {}
  const baru = Object.keys(indeks.peta).filter((k) => !(k in petaLama));
  const hilang = Object.keys(petaLama).filter((k) => !(k in indeks.peta));
  console.error(`Katalog BASI terhadap ${sumber}: ${beda.length} berkas berbeda (${beda.slice(0, 8).join(', ')}${beda.length > 8 ? ', ...' : ''}).`);
  console.error(`Sumber data baru di API belum ada di katalog: ${baru.length}${baru.length ? ' (' + baru.slice(0, 15).join(', ') + (baru.length > 15 ? ', ...' : '') + ')' : ''}.`);
  if (hilang.length) console.error(`Sumber data di katalog yang sudah tidak ada di API: ${hilang.length} (${hilang.slice(0, 15).join(', ')}).`);
  console.error('Perbarui: npm run katalog -w unipo-ui -- <openapi.json> lalu commit packages/ui/src/katalog/data.');
  process.exit(1);
}
await rm(join(outDir, 'modul'), { recursive: true, force: true });
await mkdir(join(outDir, 'modul'), { recursive: true });
for (const [f, isi] of berkas) await writeFile(join(outDir, f), isi);

console.log(`Katalog dibuat: ${indeks.modul.length} modul, ${resources.size} sumber data, ${mandiri.length} operasi mandiri, ${total} operasi.`);
if (tagTakDikenal.size) {
  console.warn('Tag belum dipetakan ke modul (tambahkan di scripts/katalog/modul.mjs):', [...tagTakDikenal].join(', '));
}
console.log(`Isian referensi (pilih-cari): ${jumlahAcuan}.`);
if (tanpaAcuan.size) console.warn('Isian kunci tanpa sumber daftar:', [...tanpaAcuan.keys()].join('; '));
