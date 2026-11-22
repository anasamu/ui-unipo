#!/usr/bin/env node
// CLI unipo-ui: pasang pustaka, atur tema, dan salin sumber komponen ke proyek.
//   npx unipo-ui init            pasang paket + berkas tema + impor CSS
//   npx unipo-ui add FilterBar   salin sumber komponen (beserta dependensinya) untuk diubah sendiri
//   npx unipo-ui list [kata]     daftar komponen
//   npx unipo-ui tema --primary "#0f766e"
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const pkg = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8'));
const cwd = process.cwd();

// ---------------------------------------------------------------- argumen
const argv = process.argv.slice(2);
const cmd = argv[0] && !argv[0].startsWith('-') ? argv[0] : 'help';
const flags = {};
const rest = [];
for (let i = cmd === 'help' ? 0 : 1; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=');
    if (v !== undefined) flags[k] = v;
    else if (argv[i + 1] && !argv[i + 1].startsWith('-')) flags[k] = argv[++i];
    else flags[k] = true;
  } else if (a === '-y') flags.yes = true;
  else rest.push(a);
}

const c = process.stdout.isTTY && !process.env.NO_COLOR ? { b: (s) => `\x1b[1m${s}\x1b[0m`, g: (s) => `\x1b[32m${s}\x1b[0m`, y: (s) => `\x1b[33m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m`, d: (s) => `\x1b[2m${s}\x1b[0m`, c: (s) => `\x1b[36m${s}\x1b[0m` } : Object.fromEntries(['b', 'g', 'y', 'r', 'd', 'c'].map((k) => [k, (s) => s]));
const ok = (s) => console.log(`${c.g('✔')} ${s}`);
const warn = (s) => console.log(`${c.y('!')} ${s}`);
const fail = (s) => {
  console.error(`${c.r('✖')} ${s}`);
  process.exit(1);
};

// ---------------------------------------------------------------- proyek
function readJson(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}
const project = readJson(join(cwd, 'package.json'));

// periksa-elemen: tolak elemen bawaan di halaman aplikasi (lihat cli/periksa-elemen.mjs).
if (cmd === 'periksa-elemen') {
  const kode = await (await import('./periksa-elemen.mjs')).utama({ cwd, flags, c, ok, warn });
  // Tunggu stdout tersalurkan (pipa bersifat asinkron) sebelum keluar, agar keluaran panjang/--json tidak terpotong.
  await new Promise((r) => process.stdout.write('', r));
  process.exit(kode);
}
// periksa-katalog: sumber <KelolaSumber>/<TabelSumber>/... aplikasi harus ada di katalog (lihat cli/periksa-katalog.mjs).
if (cmd === 'periksa-katalog') {
  const kode = await (await import('./periksa-katalog.mjs')).utama({ cwd, flags, rest, c, ok, warn });
  await new Promise((r) => process.stdout.write('', r));
  process.exit(kode);
}
const deps = { ...(project?.dependencies ?? {}), ...(project?.devDependencies ?? {}) };

function packageManager() {
  if (flags.pm) return flags.pm;
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(cwd, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(cwd, 'bun.lockb')) || existsSync(join(cwd, 'bun.lock'))) return 'bun';
  return 'npm';
}
function framework() {
  if (deps.next) return 'next';
  if (deps.nuxt) return 'nuxt';
  if (deps['react-native'] || deps.expo) return 'react-native';
  if (deps.vue) return 'vue';
  if (deps.react) return 'react';
  if (existsSync(join(cwd, 'artisan'))) return 'laravel';
  return 'html';
}
const FW_LABEL = { next: 'Next.js', nuxt: 'Nuxt', 'react-native': 'React Native', vue: 'Vue', react: 'React (Vite/CRA)', laravel: 'Laravel/Blade', html: 'HTML/PHP biasa' };

function install(list, dev = false) {
  const nameOf = (p) => (p.startsWith('@') ? '@' + p.slice(1).split('@')[0] : p.split('@')[0]);
  const todo = list.filter((p) => !deps[nameOf(p)]);
  if (!todo.length) return;
  const pm = packageManager();
  const verb = pm === 'npm' ? 'install' : 'add';
  const cmdline = `${pm} ${verb} ${dev ? (pm === 'npm' ? '--save-dev ' : '-D ') : ''}${todo.join(' ')}`;
  if (flags['no-install']) {
    warn(`Lewati pemasangan. Jalankan sendiri: ${c.c(cmdline)}`);
    return;
  }
  console.log(c.d(`$ ${cmdline}`));
  try {
    execSync(cmdline, { stdio: 'inherit', cwd });
  } catch {
    fail(`Gagal memasang paket. Jalankan sendiri: ${cmdline}`);
  }
}

async function ask(q, def) {
  if (flags.yes || !process.stdin.isTTY) return def;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const a = (await rl.question(`${c.b('?')} ${q} ${def ? c.d(`(${def}) `) : ''}`)).trim();
  rl.close();
  return a || def;
}
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

// ---------------------------------------------------------------- konfigurasi unipo.json
const CONFIG = join(cwd, 'unipo.json');
function config() {
  return readJson(CONFIG) ?? {};
}
function defaultDir(fw) {
  if (fw === 'next') return existsSync(join(cwd, 'src')) ? 'src/components/unipo' : 'components/unipo';
  return existsSync(join(cwd, 'src')) ? 'src/components/unipo' : 'components/unipo';
}
// Generator tema lengkap (dist/tema.js, sama dengan pembuat tema di api.unipo.ac.id/docs/tema).
const temaLib = await import('../dist/tema.js').catch(() => null);
/** Opsi tema dari flag CLI: --dari "<query atau URL tema.css>" lalu flag satuan (--netral, --font, --teks, ...). */
function opsiTemaDariFlag(dasar) {
  const opsi = { ...dasar };
  if (typeof flags.dari === 'string') Object.assign(opsi, Object.fromEntries(new URLSearchParams(flags.dari.replace(/^[^?]*\?/, '')).entries()));
  for (const k of ['primary', 'secondary', 'primaryGelap', 'success', 'warning', 'danger', 'info', 'netral', 'latar', 'latarGelap', 'radius', 'font', 'fontJudul', 'fontMono', 'teks', 'bayangan', 'gerak', 'muatFont']) {
    if (flags[k] !== undefined) opsi[k] = flags[k];
  }
  return opsi;
}
function themeCss(opsi) {
  if (temaLib) return temaLib.buatTema(opsi);
  const { primary, secondary, radius } = opsi;
  return `/* Tema UNIPO untuk proyek ini. */
:root {
  --u-primary: ${primary};
  --u-secondary: ${secondary};
  --u-radius: ${radius}px;
}
`;
}
function entryFile() {
  const cands = ['app/layout.tsx', 'src/app/layout.tsx', 'app/layout.jsx', 'src/app/layout.jsx', 'pages/_app.tsx', 'src/pages/_app.tsx', 'src/main.tsx', 'src/main.jsx', 'src/main.ts', 'src/main.js', 'app.vue', 'src/App.vue'];
  return cands.find((f) => existsSync(join(cwd, f)));
}

// ---------------------------------------------------------------- platform
const PLATFORM = ['web', 'desktop', 'mobile'];
const OS = ['ios', 'android', 'auto'];
/** Target platform: web (peramban), desktop (Electron/Tauri), mobile (Capacitor/WebView) dengan pilihan iOS/Android. */
async function tanyaPlatform(cfg) {
  const platform = String(flags.platform ?? (await ask('Target platform: web / desktop / mobile', cfg.platform ?? 'web'))).toLowerCase();
  if (!PLATFORM.includes(platform)) fail('Platform harus web, desktop, atau mobile.');
  let os = null;
  if (platform === 'mobile') {
    os = String(flags.os ?? (await ask('Sistem operasi mobile: ios / android / auto (deteksi saat berjalan)', cfg.os ?? 'auto'))).toLowerCase();
    if (!OS.includes(os)) fail('OS mobile harus ios, android, atau auto.');
  }
  return { platform, os };
}
function barisPlatform(platform, os) {
  if (!platform || platform === 'web') return '';
  return `import { setelPlatform } from 'unipo-ui';\nsetelPlatform({ platform: '${platform}'${os ? `, os: '${os}'` : ''} });\n`;
}
const PLATFORM_LABEL = { web: 'Web', desktop: 'Desktop (Electron/Tauri)', mobile: 'Mobile' };

// ---------------------------------------------------------------- perintah: platform
async function platformCmd() {
  const cfg = config();
  if (rest[0]) flags.platform = rest[0];
  const { platform, os } = await tanyaPlatform(cfg);
  const entry = entryFile();
  if (entry && !entry.endsWith('.vue') && !flags['no-edit']) {
    const p = join(cwd, entry);
    let src = readFileSync(p, 'utf8');
    src = src.replace(/import \{ setelPlatform \} from 'unipo-ui';\nsetelPlatform\([^)]*\);\n/, '');
    const baris = barisPlatform(platform, os);
    if (baris) {
      const i = src.indexOf("import 'unipo-ui/css';\n");
      src = i >= 0 ? src.slice(0, i) + "import 'unipo-ui/css';\n" + baris + src.slice(i + "import 'unipo-ui/css';\n".length) : baris + src;
    }
    writeFileSync(p, src);
    ok(`Platform di ${c.b(entry)} diatur ke ${PLATFORM_LABEL[platform]}${os ? ` (${os})` : ''}`);
  } else if (platform !== 'web') {
    warn(`Panggil sekali di awal aplikasi: ${c.c(barisPlatform(platform, os).split('\n')[1])}  atau tandai <html data-u-platform="${platform}"${os ? ` data-u-os="${os}"` : ''}>`);
  }
  if (existsSync(CONFIG)) writeFileSync(CONFIG, JSON.stringify({ ...cfg, platform, os }, null, 2) + '\n');
}

// ---------------------------------------------------------------- perintah: init
async function init() {
  if (!project) fail('package.json tidak ditemukan. Jalankan di folder akar proyek (atau `npm init -y` dulu).');
  const fw = framework();
  console.log(`\n${c.b('UNIPO UI')} ${c.d('v' + pkg.version)}  ·  proyek ${c.b(project.name ?? relative(process.env.HOME ?? '', cwd))}  ·  ${FW_LABEL[fw]}  ·  ${packageManager()}\n`);

  const cfg = config();
  const primary = flags.primary ?? (await ask('Warna primer', cfg.primary ?? '#244ce6'));
  const secondary = flags.secondary ?? (await ask('Warna sekunder', cfg.secondary ?? '#f2b42a'));
  const radius = Number(flags.radius ?? (await ask('Radius sudut (px)', String(cfg.radius ?? 10))));
  if (!HEX.test(primary) || !HEX.test(secondary)) fail('Warna harus berformat hex, mis. #244ce6.');
  const sdk = flags.sdk ?? (fw === 'react' || fw === 'next' ? (await ask('Pasang juga SDK SIAKAD (unipo-siakad-sdk)? y/n', 'y')).toLowerCase().startsWith('y') : false);
  const { platform, os } = await tanyaPlatform(cfg);

  if (fw === 'react-native') {
    install(['unipo-ui-tokens']);
    ok('Terpasang unipo-ui-tokens. Di React Native pakai token: import { colors } from "unipo-ui-tokens"; colors("light").primary');
    writeFileSync(CONFIG, JSON.stringify({ framework: fw, primary, secondary, radius, platform, os }, null, 2) + '\n');
    return;
  }

  const font = !flags['no-font'] && fw !== 'laravel' && fw !== 'html';
  install(['unipo-ui', ...(sdk ? ['unipo-siakad-sdk'] : []), ...(font ? ['@fontsource-variable/plus-jakarta-sans'] : [])]);

  const styleDir = fw === 'next' ? (existsSync(join(cwd, 'src/app')) ? 'src/app' : existsSync(join(cwd, 'app')) ? 'app' : 'styles') : existsSync(join(cwd, 'src')) ? 'src' : fw === 'laravel' ? 'resources/css' : '.';
  const themePath = join(styleDir, 'unipo-tema.css');
  mkdirSync(join(cwd, styleDir), { recursive: true });
  writeFileSync(join(cwd, themePath), themeCss({ primary, secondary, radius }));
  ok(`Tema ditulis ke ${c.b(themePath)}`);

  const entry = entryFile();
  const isReactish = fw === 'next' || fw === 'react' || fw === 'vue' || fw === 'nuxt';
  if (entry && isReactish && !flags['no-edit']) {
    const p = join(cwd, entry);
    let src = readFileSync(p, 'utf8');
    if (!src.includes('unipo-ui/css')) {
      const relTheme = './' + relative(dirname(p), join(cwd, themePath)).split('\\').join('/');
      const lines = entry.endsWith('.vue') ? null : `${font ? "import '@fontsource-variable/plus-jakarta-sans';\n" : ''}import 'unipo-ui/css';\nimport '${relTheme.startsWith('./..') ? relTheme.slice(2) : relTheme}';\n${barisPlatform(platform, os)}`;
      if (lines) {
        const m = src.match(/^(['"]use client['"];?\s*\n)/);
        src = m ? m[1] + lines + src.slice(m[1].length) : lines + src;
        writeFileSync(p, src);
        ok(`CSS diimpor di ${c.b(entry)}`);
      } else warn(`Tambahkan di ${entry} (blok <script>): import 'unipo-ui/css'; import '${relTheme}';`);
    }
  } else if (fw === 'laravel' || fw === 'html') {
    warn('Salin CSS jadi: node_modules/unipo-ui/dist/ui-unipo.min.css ke folder publik, lalu muat setelahnya unipo-tema.css.');
    if (platform !== 'web') warn(`Tandai platform di tag <html>: <html data-u-platform="${platform}"${os ? ` data-u-os="${os}"` : ''}>`);
  } else {
    warn(`Impor sekali di berkas awal aplikasi: import 'unipo-ui/css'; import './${themePath}';`);
  }

  if (sdk && (fw === 'next' || fw === 'react')) {
    const dir = join(cwd, defaultDir(fw), '..');
    const prov = join(dir, 'unipo-provider.tsx');
    if (!existsSync(prov)) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        prov,
        `'use client';
import { Siakad } from 'unipo-siakad-sdk';
import { UnipoProvider } from 'unipo-ui/siakad';
import { useMemo } from 'react';

/**
 * Bungkus aplikasi dengan komponen ini. Browser memanggil BFF/proksi milik aplikasi sendiri,
 * bukan API SIAKAD langsung: client_secret hanya disimpan di server.
 */
export function Providers({ children, accessToken }: { children: React.ReactNode; accessToken?: string }) {
  const siakad = useMemo(() => new Siakad({ baseUrl: '/bff/api', accessToken }), [accessToken]);
  return <UnipoProvider siakad={siakad}>{children}</UnipoProvider>;
}
`,
      );
      ok(`Provider SDK ditulis ke ${c.b(relative(cwd, prov))}`);
    }
  }

  writeFileSync(CONFIG, JSON.stringify({ $schema: 'https://api.unipo.ac.id/docs/panduan/ui', framework: fw, dir: cfg.dir ?? defaultDir(fw), theme: themePath, primary, secondary, radius, sdk, platform, os }, null, 2) + '\n');
  ok(`Konfigurasi disimpan di ${c.b('unipo.json')}`);
  console.log(`\nSelesai. Contoh pakai:\n  ${c.c("import { Button, FilterBar } from 'unipo-ui';")}${sdk ? `\n  ${c.c("import { CariMahasiswa } from 'unipo-ui/siakad';")}` : ''}\nDaftar komponen: ${c.c('npx unipo-ui list')}  ·  Salin sumber untuk diubah: ${c.c('npx unipo-ui add <Komponen>')}\n`);
}

// ---------------------------------------------------------------- registry
function registry() {
  const r = readJson(join(pkgRoot, 'dist/registry.json'));
  if (!r) fail('registry.json tidak ada di paket. Pasang ulang unipo-ui.');
  return r;
}
const GROUP = {
  'components/actions.tsx': 'Aksi',
  'components/forms.tsx': 'Formulir',
  'components/select.tsx': 'Pilihan',
  'components/overlays.tsx': 'Overlay',
  'components/display.tsx': 'Tampilan data',
  'components/calendar.tsx': 'Tanggal & berkas',
  'components/code.tsx': 'Blok kode',
  'components/layout.tsx': 'Tata letak',
  'components/identity.tsx': 'Identitas',
  'components/filter.tsx': 'Saringan',
  'lib/cn.ts': 'Utilitas',
  'lib/format.ts': 'Utilitas',
};
const groupOf = (file) => GROUP[file] ?? (file.startsWith('siakad/') ? 'Terhubung SDK (unipo-ui/siakad)' : file.startsWith('widgets/') ? 'Widget fitur' : 'Lainnya');

function list() {
  const r = registry();
  const q = (rest[0] ?? '').toLowerCase();
  const byGroup = {};
  for (const [file, info] of Object.entries(r.files)) {
    const comps = info.exports.filter((e) => /^[A-Z]/.test(e) && !/Props$|Option$|Value(s)?$|Field$|^[A-Z][A-Z_]+$/.test(e));
    const hooks = info.exports.filter((e) => /^use[A-Z]/.test(e));
    const all = [...comps, ...hooks].filter((e) => !q || e.toLowerCase().includes(q) || file.includes(q));
    if (!all.length) continue;
    (byGroup[groupOf(file)] ??= []).push([file, all]);
  }
  for (const [g, items] of Object.entries(byGroup)) {
    console.log(`\n${c.b(g)}`);
    for (const [file, all] of items) console.log(`  ${c.d(file.replace(/\.tsx?$/, '').padEnd(24))} ${all.join(', ')}`);
  }
  console.log(`\nImpor: ${c.c("import { Nama } from 'unipo-ui'")} · komponen SDK: ${c.c("from 'unipo-ui/siakad'")}\n`);
}

// ---------------------------------------------------------------- perintah: add
function add() {
  if (!rest.length) fail('Sebutkan komponen, mis. `npx unipo-ui add FilterBar CariMahasiswa`.');
  if (!project) fail('package.json tidak ditemukan. Jalankan di folder akar proyek.');
  const r = registry();
  const lower = Object.fromEntries(Object.keys(r.exports).map((k) => [k.toLowerCase(), k]));
  const want = new Set();
  for (const name of rest) {
    const exact = r.exports[name] ?? r.exports[lower[name.toLowerCase()]];
    const byFile = Object.keys(r.files).find((f) => f.replace(/\.tsx?$/, '') === name || f.replace(/\.tsx?$/, '').endsWith('/' + name));
    const file = exact ?? byFile;
    if (!file) fail(`Komponen "${name}" tidak dikenal. Lihat \`npx unipo-ui list ${name}\`.`);
    want.add(file);
  }
  // tutup dependensi lokal
  const queue = [...want];
  const all = new Set();
  while (queue.length) {
    const f = queue.shift();
    if (all.has(f)) continue;
    all.add(f);
    queue.push(...(r.files[f]?.local ?? []));
  }
  const dir = flags.dir ?? config().dir ?? defaultDir(framework());
  let copied = 0;
  for (const f of all) {
    const from = join(pkgRoot, 'src', f);
    const to = join(cwd, dir, f);
    const requested = want.has(f);
    if (existsSync(to) && !flags.overwrite) {
      console.log(`  ${c.d('lewati')} ${relative(cwd, to)} ${c.d('(sudah ada; --overwrite untuk menimpa)')}`);
      continue;
    }
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
    copied++;
    console.log(`  ${requested ? c.g('+') : c.d('+')} ${relative(cwd, to)}${requested ? '' : c.d('  (dependensi)')}`);
  }
  const npm = [...new Set([...all].flatMap((f) => r.files[f]?.npm ?? []))].filter((p) => p !== 'react' && p !== 'react-dom');
  const missing = npm.filter((p) => !deps[p]).map((p) => (r.versions[p] ? `${p}@${r.versions[p]}` : p));
  if (missing.length) install(missing);
  if (!deps['unipo-ui']) install(['unipo-ui']);
  ok(`${copied} berkas disalin ke ${c.b(dir)}. CSS tetap dari ${c.c("'unipo-ui/css'")}; impor komponen dari folder itu untuk mengubah markup atau perilakunya.`);
}

// ---------------------------------------------------------------- perintah: tema
async function tema() {
  const cfg = config();
  const primary = flags.primary ?? cfg.primary ?? '#244ce6';
  const secondary = flags.secondary ?? cfg.secondary ?? '#f2b42a';
  const radius = Number(flags.radius ?? cfg.radius ?? 10);
  if (!HEX.test(primary) || !HEX.test(secondary)) fail('Warna harus berformat hex, mis. --primary "#0f766e".');
  const out = flags.out ?? cfg.theme ?? 'unipo-tema.css';
  const opsi = opsiTemaDariFlag({ ...(cfg.tema ?? {}), primary, secondary, radius });
  if (flags.scss) {
    console.log(`@use 'unipo-ui/scss' with ($u-primary: ${primary}, $u-secondary: ${secondary}, $u-radius-base: ${radius});`);
    return;
  }
  if (flags.stdout) {
    process.stdout.write(themeCss(opsi));
    return;
  }
  mkdirSync(dirname(join(cwd, out)), { recursive: true });
  writeFileSync(join(cwd, out), themeCss(opsi));
  const tema = temaLib ? Object.fromEntries(new URLSearchParams(temaLib.paramTema(opsi)).entries()) : undefined;
  if (existsSync(CONFIG)) writeFileSync(CONFIG, JSON.stringify({ ...cfg, primary, secondary, radius, tema, theme: out }, null, 2) + '\n');
  ok(`Tema ditulis ke ${c.b(out)} (primer ${primary}, sekunder ${secondary}, radius ${radius}px)`);
}

// ---------------------------------------------------------------- jalur-bff
/**
 * Daftar jalur API yang dipanggil komponen unipo-ui yang diimpor aplikasi, untuk daftar izin BFF.
 *   npx unipo-ui jalur-bff                                   ringkasan
 *   npx unipo-ui jalur-bff --tulis bff/lib/izin-komponen.json   tulis berkas izin (dibaca BFF)
 *   npx unipo-ui jalur-bff --cek bff/lib/izin-komponen.json     gagal (kode 1) bila berkas basi
 *   --src src (folder sumber aplikasi)  --sdk <index.d.ts unipo-siakad-sdk>  --rinci (asal tiap pola)
 */
async function jalurBff() {
  const { jalurAplikasi, isiBerkasIzin, cariSdkDts } = await import('./jalur-api.mjs');
  const src = resolve(cwd, typeof flags.src === 'string' ? flags.src : 'src');
  if (!existsSync(src)) fail(`Folder sumber ${src} tidak ada (atur dengan --src).`);
  const sdkDts = typeof flags.sdk === 'string' ? resolve(cwd, flags.sdk) : cariSdkDts(cwd);
  if (!sdkDts) warn('unipo-siakad-sdk tidak ditemukan: panggilan metode SDK (siakad.modul.metode()) tidak ikut dipetakan.');
  const isi = isiBerkasIzin(src, { sdkDts });
  if (typeof flags.tulis === 'string') {
    const out = resolve(cwd, flags.tulis);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, isi);
    ok(`${JSON.parse(isi).pola.length} pola jalur ditulis ke ${c.b(relative(cwd, out))}`);
    return;
  }
  if (typeof flags.cek === 'string') {
    const out = resolve(cwd, flags.cek);
    const lama = existsSync(out) ? readFileSync(out, 'utf8') : '';
    if (lama !== isi) {
      const a = new Set(lama ? JSON.parse(lama).pola : []);
      const b = JSON.parse(isi).pola;
      const kurang = b.filter((p) => !a.has(p));
      const lebih = [...a].filter((p) => !b.includes(p));
      if (kurang.length) console.error(`Belum diizinkan BFF (${kurang.length}):\n  ${kurang.join('\n  ')}`);
      if (lebih.length) console.error(`Tidak dipakai lagi (${lebih.length}):\n  ${lebih.join('\n  ')}`);
      fail(`${relative(cwd, out)} basi. Perbarui: npx unipo-ui jalur-bff --tulis ${relative(cwd, out)}`);
    }
    ok(`${relative(cwd, out)} sesuai komponen yang dipakai.`);
    return;
  }
  const r = jalurAplikasi(src, { sdkDts });
  console.log(`${c.b(r.komponen.length)} komponen unipo-ui dipakai, ${c.b(r.pola.length)} pola jalur API:`);
  for (const p of r.pola) console.log(`  ${p}${flags.rinci ? c.d('  <- ' + r.rinci[p].join(', ')) : ''}`);
  if (r.tidakTerpetakan.length) warn(`Tidak bisa dipetakan (awalan dinamis):\n  ${r.tidakTerpetakan.join('\n  ')}`);
}

function help() {
  console.log(`
${c.b('unipo-ui')} ${c.d('v' + pkg.version)}  Komponen UI UNIPO

${c.b('Perintah')}
  init                 Pasang unipo-ui (+ SDK), buat berkas tema, impor CSS otomatis
                       --primary "#244ce6" --secondary "#f2b42a" --radius 10 --sdk -y
                       --platform web|desktop|mobile --os ios|android|auto
  platform [target]    Ganti target platform: web, desktop, mobile (--os ios|android|auto)
  add <Komponen...>    Salin sumber komponen dan dependensinya ke proyek (bisa diubah bebas)
                       --dir src/components/unipo --overwrite
  list [kata]          Daftar komponen per kelompok
  jalur-bff            Jalur API yang dipanggil komponen unipo-ui yang diimpor aplikasi (izin BFF)
  periksa-katalog      Sumber katalog yang dipasang aplikasi (KelolaSumber, TabelSumber, ...) ada di katalog
                       --tulis bff/lib/izin-komponen.json | --cek bff/lib/izin-komponen.json --src src --rinci
  tema                 Tulis ulang berkas tema   --primary --secondary --radius --netral --font --teks
                       --bayangan --gerak --dari "<tautan tema.css dari api.unipo.ac.id/docs/tema>" --out --stdout
  periksa-elemen       Tolak <input>/<select>/<table>/<button> polos & window.confirm di halaman (pages/, halaman/)
                       --semua --src <folder> --json --tulis-dasar <berkas> --dasar <berkas>

${c.b('Opsi umum')}
  --pm npm|pnpm|yarn|bun   paksa pengelola paket   --no-install   --no-edit   --no-font

${c.b('Contoh')}
  npx unipo-ui init -y --primary "#0f766e"
  npx unipo-ui init -y --platform mobile --os ios
  npx unipo-ui platform desktop
  npx unipo-ui add FilterBar CariMahasiswa
  npx unipo-ui list cari

Panduan: https://api.unipo.ac.id/docs/panduan/ui
`);
}

const run = { init, platform: platformCmd, add, list, tema, 'jalur-bff': jalurBff, theme: tema, help, '--help': help, '-h': help, '--version': () => console.log(pkg.version), '-v': () => console.log(pkg.version) }[cmd];
if (!run) fail(`Perintah "${cmd}" tidak dikenal. Lihat \`npx unipo-ui help\`.`);
await run();
