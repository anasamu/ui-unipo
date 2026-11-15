import * as React from 'react';

export interface MintaFokus {
  id: string;
  /** 'awal', 'akhir', atau posisi karakter di teks polos. */
  di: 'awal' | 'akhir' | number;
}

/** Berkas media yang dipilih untuk blok gambar, galeri, atau berkas. */
export interface MediaEditor {
  url: string;
  id?: number | string;
  alt?: string;
  judul?: string;
  nama?: string;
  /** Ukuran dalam byte (blok berkas). */
  ukuran?: number | null;
}

export interface OpsiPilihMedia {
  jenis?: 'gambar' | 'dokumen';
  banyak?: boolean;
}

/** Pola: susunan blok siap pakai (mis. "Berita kegiatan", "Pengumuman beasiswa"). */
export interface PolaBlok {
  id: string | number;
  nama: string;
  kategori: string;
  deskripsi?: string;
  blok: unknown;
}

export interface KonteksEditor {
  pilih: string | null;
  setPilih: (id: string | null) => void;
  fokus: MintaFokus | null;
  setFokus: (f: MintaFokus | null) => void;
  /** Buka pemilih media; hasil null bila dibatalkan. */
  pilihMedia: (opsi?: OpsiPilihMedia) => Promise<MediaEditor[] | null>;
  pola: PolaBlok[] | undefined;
  baca: boolean;
}

export const EditorCtx = React.createContext<KonteksEditor>({
  pilih: null,
  setPilih: () => undefined,
  fokus: null,
  setFokus: () => undefined,
  pilihMedia: async () => null,
  pola: undefined,
  baca: false,
});

export const useEditor = () => React.useContext(EditorCtx);
