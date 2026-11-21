/**
 * Logika sidebar drive Kelola berkas tanpa React (supaya bisa diuji): susunan pohon unit, nama unit yang dirapikan,
 * pencarian unit, keadaan lipat, unit tersemat, dan unit yang terakhir dibuka (diingat di peramban).
 */

/** Bentuk minimal drive yang dipakai logika pohon (sama dengan DriveBerkasData). */
export interface SimpulDrive {
  id: string;
  jenis: 'pribadi' | 'unit' | 'arsip';
  unit_jenis?: string | null;
  induk: string | null;
  nama: string;
  singkatan?: string | null;
  hak: string | null;
}

/** Bila jumlah drive unit yang bisa dibuka melebihi ini: kotak cari, Terakhir dibuka, pohon terlipat bawaan. */
export const AMBANG_BANYAK_UNIT = 8;

const KATA_SAMBUNG = new Set(['dan', 'atau', 'di', 'ke', 'dari', 'untuk', 'kepada', 'pada', 'serta', 'yang', 'dengan']);

function kapital(kata: string) {
  // "AGROTEKNOLOGI/AGROEKOTEKNOLOGI" dan "SUMBER-DAYA": tiap potongan diberi huruf besar di depan.
  return kata.toLowerCase().replace(/(^|[/\-(])(\p{L})/gu, (_, a: string, h: string) => a + h.toUpperCase());
}

/**
 * Nama unit untuk dibaca: "Program Studi INFORMATIKA" → "Informatika" (prodi; prefiks "Program Studi" tetap ada di
 * tooltip; `pendek: false` mempertahankannya, mis. untuk judul), "FAKULTAS ILMU SOSIAL DAN ILMU POLITIK" → "Fakultas Ilmu Sosial dan Ilmu Politik". Nama yang tidak
 * berhuruf besar semua (mis. "UPT Pusat Teknologi Informasi") dibiarkan supaya singkatan resmi tetap utuh.
 */
export function rapikanNamaUnit(nama: string, _unitJenis?: string | null, opsi: { pendek?: boolean } = {}): string {
  let n = nama.trim().replace(/\s+/g, ' ');
  // Prefiks "Program Studi" (huruf campur) dipisah dulu supaya "Program Studi INFORMATIKA" tetap dikenali berhuruf besar.
  const awalan = /^program studi\s+/i.exec(n)?.[0] ?? '';
  if (awalan && n.length > awalan.length) n = n.slice(awalan.length);
  const sisa = rapikanBagian(n);
  return awalan && opsi.pendek === false ? `Program Studi ${sisa}` : sisa;
}


function rapikanBagian(n: string): string {
  const kata = n.split(' ');
  const huruf = (k: string) => /\p{L}/u.test(k);
  const kapitalSemua = (k: string) => huruf(k) && k === k.toUpperCase() && k !== k.toLowerCase();
  // "Berteriak" = semua kata ber-huruf ditulis kapital, atau setidaknya dua kata panjang kapital.
  const berteriak = kata.filter(huruf).every(kapitalSemua) || kata.filter((k) => kapitalSemua(k) && k.length > 3).length >= 2;
  if (!berteriak) return n;
  return kata
    .map((k, i) => {
      if (!kapitalSemua(k)) return k;
      const kecil = k.toLowerCase();
      if (i > 0 && KATA_SAMBUNG.has(kecil)) return kecil;
      return kapital(k);
    })
    .join(' ');
}

/** Peta induk → anak. Drive yang induknya tidak ada di daftar menjadi akar. */
export function anakDrive<T extends SimpulDrive>(drive: T[]): Map<string | null, T[]> {
  const m = new Map<string | null, T[]>();
  const ada = new Set(drive.map((d) => d.id));
  for (const d of drive) {
    const i = d.induk && ada.has(d.induk) ? d.induk : null;
    const l = m.get(i);
    if (l) l.push(d);
    else m.set(i, [d]);
  }
  return m;
}

/** id leluhur sebuah drive, dari induk terdekat ke akar. */
export function leluhurDrive(peta: Map<string, SimpulDrive>, id: string | null): string[] {
  const out: string[] = [];
  let x = id ? peta.get(id)?.induk : null;
  let jaga = 0;
  while (x && jaga++ < 30) {
    out.push(x);
    x = peta.get(x)?.induk ?? null;
  }
  return out;
}

function normal(s: string) {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

/** Cocok pencarian: nama asli, nama rapi, atau singkatan (tanpa membedakan huruf besar dan aksen). */
export function cocokUnit(d: SimpulDrive, q: string): boolean {
  const k = normal(q.trim());
  if (!k) return true;
  return [d.nama, rapikanNamaUnit(d.nama, d.unit_jenis), d.singkatan ?? ''].some((x) => normal(x).includes(k));
}

/**
 * Drive unit yang tampil saat mencari: yang cocok beserta leluhurnya (supaya letaknya di pohon terbaca).
 * `null` = tidak sedang mencari.
 */
export function saringDrive(drive: SimpulDrive[], q: string): Set<string> | null {
  if (!q.trim()) return null;
  const peta = new Map(drive.map((d) => [d.id, d]));
  const tampil = new Set<string>();
  for (const d of drive) {
    if (d.jenis === 'pribadi' || !cocokUnit(d, q)) continue;
    tampil.add(d.id);
    for (const a of leluhurDrive(peta, d.id)) tampil.add(a);
  }
  return tampil;
}

/** Jumlah drive unit/arsip yang bisa dibuka (penanda jalur tidak dihitung). */
export function jumlahBisaDibuka(drive: SimpulDrive[]): number {
  return drive.filter((d) => d.jenis !== 'pribadi' && d.hak !== null).length;
}

/**
 * Apakah simpul terbuka: pilihan pengguna yang diingat menang; selain itu akar terbuka, dan bila unit sedikit semua
 * terbuka (bila banyak, tingkat kedua ke bawah terlipat). Leluhur drive aktif selalu terbuka.
 */
export function simpulTerbuka(id: string, opsi: { ingat: Record<string, boolean>; akar: boolean; banyak: boolean; leluhurAktif: Set<string> }): boolean {
  if (opsi.leluhurAktif.has(id)) return true;
  if (id in opsi.ingat) return opsi.ingat[id];
  return opsi.akar || !opsi.banyak;
}

/**
 * Hak yang dimiliki sebagian besar (>= 60%) drive unit yang bisa dibuka, mis. admin: hampir semua "kelola". Hak ini
 * cukup disebut sekali di judul bagian; lencana hanya dipasang pada unit yang haknya berbeda. null = tidak ada mayoritas
 * (atau unit terlalu sedikit), lencana dipasang pada setiap unit.
 */
export function hakUmum(drive: SimpulDrive[]): string | null {
  const hak = drive.filter((d) => d.jenis !== 'pribadi' && d.hak !== null).map((d) => d.hak as string);
  if (hak.length < 2) return null;
  const n = new Map<string, number>();
  for (const h of hak) n.set(h, (n.get(h) ?? 0) + 1);
  const [teratas, jml] = [...n.entries()].sort((a, b) => b[1] - a[1])[0];
  return jml / hak.length >= 0.6 ? teratas : null;
}

// ---------------------------------------------------------------- diingat di peramban

export const KUNCI_DRIVE = {
  lipat: 'unipo-ui:drive-lipat',
  sematan: 'unipo-ui:drive-sematan',
  terakhir: 'unipo-ui:drive-terakhir',
} as const;

export function bacaIngat<T>(kunci: string, bawaan: T, sah: (v: unknown) => v is T): T {
  try {
    if (typeof localStorage === 'undefined') return bawaan;
    const v: unknown = JSON.parse(localStorage.getItem(kunci) ?? 'null');
    return sah(v) ? v : bawaan;
  } catch {
    return bawaan;
  }
}

export function simpanIngat(kunci: string, nilai: unknown) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(kunci, JSON.stringify(nilai));
  } catch {
    // mode privat / penyimpanan penuh: abaikan
  }
}

export const daftarId = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
export const petaLipat = (v: unknown): v is Record<string, boolean> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.values(v).every((x) => typeof x === 'boolean');

/** Catat drive yang baru dibuka di depan daftar "Terakhir dibuka" (tanpa duplikat, paling banyak `maks`). */
export function catatTerakhir(daftar: string[], id: string, maks = 5): string[] {
  return [id, ...daftar.filter((x) => x !== id)].slice(0, maks);
}

/** Sematkan atau lepas sematan sebuah drive. */
export function alihSematan(daftar: string[], id: string): string[] {
  return daftar.includes(id) ? daftar.filter((x) => x !== id) : [...daftar, id];
}

// ---------------------------------------------------------------- kuota

/** Teks kaki kuota yang tidak perlu dipotong: baris utama "424,1 KB dipakai" dan keterangan "dari 5 GB"/"kuota belum diatur". */
export function teksKuotaKaki(pakai: string, batas: string | null, mengikuti?: string | null): { utama: string; ket: string } {
  if (!batas) return { utama: `${pakai} dipakai`, ket: 'Kuota belum diatur' };
  return { utama: `${pakai} dari ${batas}`, ket: mengikuti ? `Mengikuti ${mengikuti}` : '' };
}
