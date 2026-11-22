/**
 * Benar bila tombol Enter sedang dipakai papan ketik bahasa (IME, mis. Jepang/Tionghoa/Korea) untuk mengonfirmasi
 * susunan huruf, sehingga Enter tidak boleh dianggap "kirim/tambah". `isComposing` adalah tanda bawaan; `keyCode` 229
 * menutup urutan kejadian Safari yang mereset `isComposing` sebelum keydown Enter (WebKit 165004).
 */
export function sedangMenyusunIme(e: { nativeEvent?: { isComposing?: boolean }; isComposing?: boolean; keyCode?: number }): boolean {
  return !!(e.nativeEvent?.isComposing ?? e.isComposing) || e.keyCode === 229;
}
