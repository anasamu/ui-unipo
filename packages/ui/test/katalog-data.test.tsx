import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { pindaiTeks, statusPemakaian } from '../cli/periksa-katalog.mjs';
import { INDEKS_KATALOG, KatalogProvider, modulUntukSumber, muatModulKatalog } from '../src/katalog/katalog';
import { KelolaSumber } from '../src/katalog/kelola';
import { MUAT_MODUL } from '../src/katalog/data/muat';
import { Toaster } from '../src/components/overlays';

const AKAR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(AKAR, 'src', 'katalog', 'data');

/**
 * OpenAPI pembanding: KATALOG_OPENAPI, atau openapi.json unipo-sdk yang ada di samping repo ui-unipo
 * (~/unipo_build/lokal/repo/unipo-sdk atau wt/<folder>/unipo-sdk). Tanpa berkas itu uji kemutakhiran dilewati;
 * CI dan bangun_lokal menjalankan `npm run katalog -w unipo-ui -- --periksa <openapi.json>` sendiri.
 */
const OPENAPI = [process.env.KATALOG_OPENAPI, join(AKAR, '..', '..', '..', 'unipo-sdk', 'openapi.json')].find((p) => p && existsSync(p));

describe('data katalog konsisten', () => {
  it('setiap sumber di peta menunjuk modul yang ada, dengan pemuat dan berkas modulnya', () => {
    const kunci = new Set(INDEKS_KATALOG.modul.map((m) => m.key));
    expect(new Set(Object.keys(MUAT_MODUL))).toEqual(kunci);
    for (const [id, modul] of Object.entries(INDEKS_KATALOG.peta)) {
      expect(kunci.has(modul), `${id} -> ${modul}`).toBe(true);
    }
    for (const k of kunci) expect(existsSync(join(DATA, 'modul', `${k}.json`)), k).toBe(true);
  });

  it('id.ts memuat semua sumber di peta (pelengkapan otomatis IdSumber)', () => {
    const id = readFileSync(join(DATA, 'id.ts'), 'utf8');
    for (const s of Object.keys(INDEKS_KATALOG.peta)) expect(id.includes(`'${s}'`), s).toBe(true);
  });

  it('setiap sumber di peta ada di berkas modulnya', async () => {
    for (const m of INDEKS_KATALOG.modul) {
      const modul = await muatModulKatalog(m.key);
      const ada = new Set(modul.resources.map((r) => r.id));
      for (const [id, k] of Object.entries(INDEKS_KATALOG.peta)) if (k === m.key) expect(ada.has(id), `${id} di ${k}.json`).toBe(true);
    }
  }, 60_000);
});

describe('sumber yang dipakai aplikasi ada di katalog', () => {
  // SPMI » Penetapan » tab Alur pengesahan: <KelolaSumber sumber="/v1/spmi/alur"> (spmi_unipo src/halaman/Penetapan.tsx).
  it('/v1/spmi/alur: modul spmi, daftar + tambah + ubah + riwayat', async () => {
    expect(modulUntukSumber(INDEKS_KATALOG, '/v1/spmi/alur')).toBe('spmi');
    const spmi = await muatModulKatalog('spmi');
    const alur = spmi.resources.find((r) => r.id === '/v1/spmi/alur');
    expect(alur?.list && spmi.ops[alur.list]?.path).toBe('/v1/spmi/alur');
    expect(alur?.create).toBeTruthy();
    expect(alur?.update).toBeTruthy();
    expect(INDEKS_KATALOG.peta['/v1/spmi/alur/{id}/riwayat']).toBe('spmi');
  });

  it('sumber SPMI lain yang dulu hilang ikut ada', () => {
    for (const s of ['/v1/spmi/kebijakan-auditor', '/v1/spmi/akreditasi-lembaga', '/v1/spmi/akreditasi-dokumen', '/v1/spmi/akreditasi-peringkat']) {
      expect(modulUntukSumber(INDEKS_KATALOG, s), s).toBe('spmi');
    }
  });

  it('KelolaSumber /v1/spmi/alur tidak lagi menampilkan "Katalog tidak dapat dimuat" (SSR: tahap memuat modul)', () => {
    const h = renderToStaticMarkup(
      <Toaster>
        <KatalogProvider>
          <KelolaSumber sumber="/v1/spmi/alur" judul={false} />
        </KatalogProvider>
      </Toaster>,
    );
    expect(h).not.toContain('Katalog tidak dapat dimuat');
    expect(h).not.toContain('tidak ada di katalog');
    // Pembanding: sumber yang memang tidak ada tetap memberi galat yang jelas.
    const salah = renderToStaticMarkup(
      <Toaster>
        <KelolaSumber sumber="/v1/spmi/tidak-ada" judul={false} />
      </Toaster>,
    );
    expect(salah).toContain('Katalog tidak dapat dimuat');
  });
});

describe('periksa-katalog (CLI aplikasi)', () => {
  const indeks = { ...INDEKS_KATALOG, peta: { '/v1/spmi/alur': 'spmi', '/v1/lppm/periode': 'lppm', '/v1/lppm/kkn/periode/{id}/peserta': 'lppm' } };
  it('menemukan sumber=, sumber:, useSumber, HalamanModul; komentar diabaikan', () => {
    const p = pindaiTeks(`
      // <KelolaSumber sumber="/v1/komentar" />
      /** <HalamanModul modul="…" /> */
      <KelolaSumber sumber="/v1/spmi/alur" judul={false} />
      <TabelSumber sumber={'/v1/lppm/periode'} />
      const t = { value: 'x', sumber: '/v1/spmi/tidak-ada' };
      useSumber(\`/v1/lppm/\${x}\`);
      <HalamanModul modul="spmi" />`);
    expect(p.map((x) => x.nilai)).toEqual(['/v1/spmi/alur', '/v1/lppm/periode', '/v1/spmi/tidak-ada', '/v1/lppm/${x}', 'spmi']);
    expect(p[0]!.baris).toBe(4);
  });
  it('status: ada, hilang, dinamis', () => {
    const st = (nilai: string, jenis = 'sumber') => statusPemakaian({ jenis, nilai }, indeks);
    expect(st('/v1/spmi/alur')).toBe('ada');
    expect(st('/v1/lppm/kkn/periode/12/peserta')).toBe('ada');
    expect(st('/v1/lppm/kkn/periode/${id}/peserta')).toBe('ada');
    expect(st('/v1/spmi/tidak-ada')).toBe('hilang');
    expect(st('/v1/lppm/${s.value}')).toBe('dinamis');
    expect(st('/v1/tidak-ada/${x}')).toBe('hilang');
    expect(st('spmi', 'modul')).toBe('ada');
    expect(st('bukan-modul', 'modul')).toBe('hilang');
  });
});

describe('katalog mutakhir terhadap OpenAPI unipo-sdk', () => {
  it.skipIf(!OPENAPI)(`scripts/katalog/buat.mjs --periksa ${OPENAPI ?? '(openapi.json unipo-sdk tidak ditemukan)'}`, () => {
    let keluaran = '';
    let kode = 0;
    try {
      keluaran = execFileSync(process.execPath, [join(AKAR, 'scripts', 'katalog', 'buat.mjs'), '--periksa', OPENAPI!], { encoding: 'utf8', stdio: 'pipe' });
    } catch (e) {
      const g = e as { status: number; stdout: string; stderr: string };
      kode = g.status;
      keluaran = g.stdout + g.stderr;
    }
    expect(kode, keluaran).toBe(0);
  }, 120_000);
});
