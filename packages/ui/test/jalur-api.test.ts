import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { cocokPola, isiBerkasIzin, jalurAplikasi, petaSdk, polaDariPath } from '../cli/jalur-api.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'jalur-api-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

function aplikasi(nama: string, isi: string): string {
  const src = join(tmp, nama, 'src');
  mkdirSync(src, { recursive: true });
  writeFileSync(join(src, 'App.tsx'), isi);
  return src;
}

describe('polaDariPath', () => {
  it.each([
    ['/v1/kemahasiswaan/struktur', '/v1/kemahasiswaan/struktur'],
    ['/v1/mahasiswa/{id}', '/v1/mahasiswa/*'],
    ['/v1/pedoman/versi/${versiId}/pdf', '/v1/pedoman/versi/*/pdf'],
    ['/v1/kemahasiswaan/mahasiswa/${encodeURIComponent(String(nim))}/organisasi', '/v1/kemahasiswaan/mahasiswa/*/organisasi'],
    ['/v1/lppm/kegiatan/${id}/${path}', '/v1/lppm/kegiatan/*/**'],
    ['/v1/keu${path}', '/v1/keu/**'],
    ['/v1/x/', '/v1/x/**'],
    ['/bff/api/v1/notif/ringkas?x=1', '/v1/notif/ringkas'],
  ])('%s -> %s', (masuk, keluar) => expect(polaDariPath(masuk)).toBe(keluar));

  it('menolak awalan yang modulnya dinamis', () => {
    expect(polaDariPath('/v1/${modul}/daftar')).toBeNull();
    expect(polaDariPath('/v1/')).toBeNull();
  });
});

describe('cocokPola', () => {
  const pola = ['/v1/kemahasiswaan/struktur', '/v1/mahasiswa/*', '/v1/lppm/kegiatan/*/**', '/v1/keu/**'];
  it.each([
    ['/v1/kemahasiswaan/struktur', true],
    ['/v1/kemahasiswaan/struktur/', true],
    ['/v1/kemahasiswaan/ormawa', false],
    ['/v1/kemahasiswaan/struktur-lain', false],
    ['/v1/mahasiswa/H7424004', true],
    ['/v1/mahasiswa/H7424004/khs', false],
    ['/v1/lppm/kegiatan/5', true],
    ['/v1/lppm/kegiatan/5/anggota/2', true],
    ['/v1/keu', true],
    ['/v1/keuangan', false],
  ])('%s -> %s', (path, hasil) => expect(cocokPola(pola, path)).toBe(hasil));
});

describe('jalurAplikasi', () => {
  it('menelusuri komponen yang diimpor beserta deklarasi yang dirujuknya', () => {
    const src = aplikasi(
      'contoh',
      "import { StrukturUnit, KelolaPengumuman } from 'unipo-ui/siakad';\nimport { Button } from 'unipo-ui';\nexport const A = () => null;\n",
    );
    const r = jalurAplikasi(src, { sdkDts: null });
    expect(r.komponen).toEqual(expect.arrayContaining(['StrukturUnit', 'KelolaPengumuman', 'Button']));
    expect(r.pola).toContain('/v1/kemahasiswaan/struktur');
    expect(r.pola).toContain('/v1/rbac/peran');
    expect(r.rinci['/v1/kemahasiswaan/struktur'].join()).toContain('ormawa.tsx');
    // komponen yang tidak diimpor tidak ikut
    expect(r.pola.some((p: string) => p.startsWith('/v1/panitia'))).toBe(false);
  });

  it('aplikasi tanpa komponen terhubung tidak butuh jalur', () => {
    const src = aplikasi('kosong', "import { Button } from 'unipo-ui';\n");
    expect(jalurAplikasi(src, { sdkDts: null }).pola).toEqual([]);
    expect(JSON.parse(isiBerkasIzin(src, { sdkDts: null })).pola).toEqual([]);
  });

  it('memetakan panggilan metode SDK lewat JSDoc deklarasi tipe', () => {
    const dts = join(tmp, 'sdk.d.ts');
    writeFileSync(
      dts,
      [
        'declare class LmsResource {',
        '    private readonly client;',
        '    /**',
        '     * Ringkasan',
        '     *',
        '     * `GET /v1/lms/saya`',
        '     */',
        '    getSaya(query?: Query): Promise<ApiResult<X>>;',
        '    /**',
        '     * `POST /v1/lms/kelas/{id}/gabung`',
        '     */',
        '    postKelasGabung(id: string): Promise<ApiResult<X>>;',
        '    /**',
        '     * `GET /v1/lms/kelas/{id}`',
        '     */',
        '    getKelasById(id: string): Promise<ApiResult<X>>;',
        '}',
        'declare class Siakad extends SiakadCore {',
        '    get lms(): LmsResource;',
        '}',
        '',
      ].join('\n'),
    );
    const peta = petaSdk(dts);
    expect(peta.get('lms').get('getSaya')).toEqual(['/v1/lms/saya']);
    expect(polaDariPath(peta.get('lms').get('postKelasGabung')[0])).toBe('/v1/lms/kelas/*/gabung');
    // parameter SDK selalu satu segmen (bukan sisa path)
    expect(polaDariPath(peta.get('lms').get('getKelasById')[0])).toBe('/v1/lms/kelas/*');
  });
});
