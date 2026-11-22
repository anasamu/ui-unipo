import { describe, expect, it } from 'vitest';
import { sedangMenyusunIme } from '../src/lib/ime';

describe('sedangMenyusunIme', () => {
  it('Enter biasa bukan susunan IME', () => {
    expect(sedangMenyusunIme({ nativeEvent: { isComposing: false }, keyCode: 13 })).toBe(false);
  });
  it('isComposing atau keyCode 229 (Safari) dianggap sedang menyusun', () => {
    expect(sedangMenyusunIme({ nativeEvent: { isComposing: true }, keyCode: 13 })).toBe(true);
    expect(sedangMenyusunIme({ nativeEvent: { isComposing: false }, keyCode: 229 })).toBe(true);
    expect(sedangMenyusunIme({ isComposing: true })).toBe(true);
  });
});
