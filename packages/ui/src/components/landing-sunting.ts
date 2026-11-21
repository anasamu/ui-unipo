import { salinBlok, type BlokLanding, type DokumenLanding, type GayaBlok, type IsiBlok } from './landing-skema';

/**
 * Logika murni penyunting halaman landing (tanpa React): ubah dokumen dan riwayat urungkan/ulangi. Dipisah agar
 * mudah diuji dan dipakai ulang oleh penyunting lain.
 */

export type AksiDokumen =
  | { t: 'ganti'; dokumen: DokumenLanding }
  | { t: 'tambah'; blok: BlokLanding; setelah?: string | null }
  | { t: 'hapus'; id: string }
  | { t: 'duplikat'; id: string }
  | { t: 'pindah'; id: string; ke: number }
  | { t: 'geser'; id: string; arah: -1 | 1 }
  | { t: 'isi'; id: string; isi: IsiBlok }
  | { t: 'gaya'; id: string; gaya: GayaBlok }
  | { t: 'halaman'; halaman: NonNullable<DokumenLanding['halaman']> };

/** Terapkan satu perubahan; mengembalikan dokumen baru (yang lama tidak diubah). */
export function ubahDokumen(d: DokumenLanding, a: AksiDokumen): DokumenLanding {
  const blok = d.blok;
  const i = 'id' in a ? blok.findIndex((b) => b.id === a.id) : -1;
  switch (a.t) {
    case 'ganti':
      return a.dokumen;
    case 'tambah': {
      if (blok.length >= 40) return d;
      const pos = a.setelah ? blok.findIndex((b) => b.id === a.setelah) + 1 || blok.length : blok.length;
      return { ...d, blok: [...blok.slice(0, pos), a.blok, ...blok.slice(pos)] };
    }
    case 'hapus':
      return i < 0 ? d : { ...d, blok: blok.filter((b) => b.id !== a.id) };
    case 'duplikat':
      return i < 0 || blok.length >= 40 ? d : { ...d, blok: [...blok.slice(0, i + 1), salinBlok(blok[i]!), ...blok.slice(i + 1)] };
    case 'pindah':
    case 'geser': {
      if (i < 0) return d;
      const ke = Math.max(0, Math.min(blok.length - 1, a.t === 'pindah' ? a.ke : i + a.arah));
      if (ke === i) return d;
      const baru = blok.slice();
      const [x] = baru.splice(i, 1);
      baru.splice(ke, 0, x!);
      return { ...d, blok: baru };
    }
    case 'isi':
      return i < 0 ? d : { ...d, blok: blok.map((b) => (b.id === a.id ? { ...b, isi: a.isi } : b)) };
    case 'gaya':
      return i < 0 ? d : { ...d, blok: blok.map((b) => (b.id === a.id ? { ...b, gaya: a.gaya } : b)) };
    case 'halaman':
      return { ...d, halaman: a.halaman };
  }
}

export interface RiwayatSunting {
  lalu: DokumenLanding[];
  kini: DokumenLanding;
  nanti: DokumenLanding[];
  /** Kunci dan waktu perubahan terakhir, untuk menggabung ketikan beruntun menjadi satu langkah urungkan. */
  kunci?: string;
  pada?: number;
}

export const BATAS_URUNGKAN = 80;
const JEDA_GABUNG = 700;

export function mulaiRiwayat(d: DokumenLanding): RiwayatSunting {
  return { lalu: [], kini: d, nanti: [] };
}

/**
 * Catat perubahan ke riwayat. Perubahan isi/gaya pada blok yang sama dalam 700 ms digabung (satu urungkan per
 * ketikan, bukan per huruf). `ganti` (templat, pulihkan) selalu langkah sendiri.
 */
export function terapkan(r: RiwayatSunting, a: AksiDokumen, sekarang = Date.now()): RiwayatSunting {
  const baru = ubahDokumen(r.kini, a);
  if (baru === r.kini) return r;
  const kunci = a.t === 'isi' || a.t === 'gaya' ? `${a.t}:${a.id}` : a.t === 'halaman' ? 'halaman' : undefined;
  const gabung = kunci && r.kunci === kunci && r.pada !== undefined && sekarang - r.pada < JEDA_GABUNG;
  return {
    lalu: gabung ? r.lalu : [...r.lalu, r.kini].slice(-BATAS_URUNGKAN),
    kini: baru,
    nanti: [],
    kunci,
    pada: sekarang,
  };
}

export function urungkan(r: RiwayatSunting): RiwayatSunting {
  if (!r.lalu.length) return r;
  return { lalu: r.lalu.slice(0, -1), kini: r.lalu[r.lalu.length - 1]!, nanti: [r.kini, ...r.nanti] };
}

export function ulangi(r: RiwayatSunting): RiwayatSunting {
  if (!r.nanti.length) return r;
  return { lalu: [...r.lalu, r.kini], kini: r.nanti[0]!, nanti: r.nanti.slice(1) };
}

/** Sama isi (untuk tanda "belum disimpan"). */
export const samaDokumen = (a: DokumenLanding | null | undefined, b: DokumenLanding | null | undefined) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Ubah satu kolom isi; nilai kosong ('' / undefined / []) menghapus kolom. */
export function setelKolom(isi: IsiBlok, k: string, v: unknown): IsiBlok {
  const baru = { ...isi };
  if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) delete baru[k];
  else baru[k] = v;
  return baru;
}
