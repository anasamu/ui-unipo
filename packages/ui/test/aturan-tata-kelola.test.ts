import { describe, expect, it } from 'vitest';
import { KATEGORI_UNIT_ATURAN, LABEL_KATEGORI_ATURAN } from '../src/siakad/aturan';

describe('tata kelola aturan: aplikasi unit melihat kategori miliknya saja', () => {
  it('tiap unit aplikasi memetakan ke kategori aturan yang dikenal', () => {
    for (const [unit, kat] of Object.entries(KATEGORI_UNIT_ATURAN)) {
      expect(kat?.length, unit).toBeGreaterThan(0);
      for (const k of kat ?? []) expect(LABEL_KATEGORI_ATURAN[k], `${unit}:${k}`).toBeTruthy();
    }
  });

  it('BAAK memegang akademik, kelulusan, kemahasiswaan; SDM hanya kepegawaian', () => {
    expect(KATEGORI_UNIT_ATURAN.baak).toEqual(['akademik', 'kelulusan', 'kemahasiswaan']);
    expect(KATEGORI_UNIT_ATURAN.sdm).toEqual(['kepegawaian']);
    expect(KATEGORI_UNIT_ATURAN.pmb).toBeUndefined();
  });
});
