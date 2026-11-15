import type { Blok } from '../tipe';

/** Operasi kanvas untuk blok teks (Enter, Backspace, panah, ubah tipe). */
export interface OpsBlok {
  /** Pecah blok teks: isi sekarang jadi `sebelum`, paragraf baru berisi `sesudah` di bawahnya. */
  pecah: (sebelum: string, sesudah: string) => void;
  /** Backspace di awal: gabung ke blok teks di atasnya (atau hapus bila kosong). */
  gabungAtas: (html: string) => void;
  panah: (arah: -1 | 1) => void;
  /** Ganti blok ini dengan blok lain (ubah tipe, menu garis miring); `fokusKe` = indeks blok baru yang difokus. */
  ubahJadi: (b: Blok[], fokusKe?: number) => void;
  sisipSesudah: (b: Blok) => void;
  hapus: () => void;
}

export interface PropsBlok {
  b: Blok;
  /** Gabungkan perubahan ke data blok. */
  ubah: (d: Record<string, unknown>) => void;
  /** Ganti seluruh blok (mis. anak kolom). */
  ganti: (b: Blok) => void;
  ops: OpsBlok;
  terpilih: boolean;
}
