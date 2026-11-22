// Logika isian angka, uang, dan jam (tanpa React) agar bisa diuji dan dipakai ulang.

/** Format angka gaya Indonesia: titik pemisah ribuan, koma desimal. `desimal` = jumlah angka di belakang koma (maksimum). */
export function formatRibuan(n: number | null | undefined, desimal = 0, ribuan = true): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: desimal, minimumFractionDigits: 0, useGrouping: ribuan }).format(n);
}

export type HasilUraiAngka = { ok: true; nilai: number | null } | { ok: false; pesan: string };

/**
 * Urai ketikan angka gaya Indonesia: "25.000.000", "25000000", "Rp 25.000", "1,5", "-3". Titik dianggap pemisah
 * ribuan, koma desimal. Ketikan kosong menghasilkan `nilai: null`.
 */
export function uraiAngka(teks: string, opsi: { desimal?: number; negatif?: boolean } = {}): HasilUraiAngka {
  const { desimal = 0, negatif = false } = opsi;
  const t = teks.replace(/rp\.?/i, '').replace(/\s+/g, '');
  if (!t) return { ok: true, nilai: null };
  if (!/^-?[\d.]*(,\d*)?$/.test(t)) return { ok: false, pesan: 'Isi dengan angka saja.' };
  const minus = t.startsWith('-');
  if (minus && !negatif) return { ok: false, pesan: 'Angka tidak boleh negatif.' };
  const [bulat = '', pecahan = ''] = t.replace('-', '').split(',');
  const digit = bulat.replace(/\./g, '');
  if (!digit && !pecahan) return { ok: true, nilai: null };
  if (pecahan && desimal === 0) return { ok: false, pesan: 'Isi tanpa angka di belakang koma.' };
  if (pecahan.length > desimal) return { ok: false, pesan: `Maksimal ${desimal} angka di belakang koma.` };
  const nilai = Number(`${minus ? '-' : ''}${digit || '0'}${pecahan ? `.${pecahan}` : ''}`);
  if (!Number.isFinite(nilai) || Math.abs(nilai) > Number.MAX_SAFE_INTEGER) return { ok: false, pesan: 'Angka terlalu besar.' };
  return { ok: true, nilai };
}

/**
 * Rapikan teks selagi diketik: tambahkan titik ribuan tanpa memindahkan kursor ke ujung. Mengembalikan teks baru dan
 * posisi kursor yang setara (dihitung dari jumlah digit di kiri kursor).
 */
export function rapikanKetikan(teks: string, kursor: number, opsi: { desimal?: number; negatif?: boolean; ribuan?: boolean } = {}): { teks: string; kursor: number } {
  const { desimal = 0, negatif = false, ribuan = true } = opsi;
  const minus = negatif && teks.trimStart().startsWith('-');
  const koma = desimal > 0 ? teks.indexOf(',') : -1;
  const kiri = koma >= 0 ? teks.slice(0, koma) : teks;
  const kanan = koma >= 0 ? teks.slice(koma + 1).replace(/\D/g, '').slice(0, desimal) : '';
  const digit = kiri.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  const bulat = ribuan ? digit.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : digit;
  const hasil = `${minus ? '-' : ''}${bulat}${koma >= 0 ? `,${kanan}` : ''}`;
  // Posisi kursor: hitung karakter bermakna (digit dan koma) di kiri kursor pada teks lama, lalu letakkan kursor
  // setelah jumlah yang sama di teks baru. Nol di depan yang dibuang ikut dikurangi.
  const bermakna = (c: string) => /[\d,]/.test(c);
  const nolBuang = kiri.replace(/\D/g, '').length - digit.length;
  let target = [...teks.slice(0, kursor)].filter(bermakna).length;
  target = Math.max(0, target - Math.min(nolBuang, target));
  let pos = minus ? 1 : 0;
  for (let n = 0; pos < hasil.length && n < target; pos++) if (bermakna(hasil[pos]!)) n++;
  return { teks: hasil, kursor: Math.min(pos, hasil.length) };
}

/** Periksa batas; kembalikan pesan awam atau null. `fmt` menulis angka di pesan (mis. formatRupiah). */
export function periksaBatasAngka(nilai: number | null, opsi: { min?: number; max?: number; wajib?: boolean; fmt?: (n: number) => string }): string | null {
  const fmt = opsi.fmt ?? ((n: number) => formatRibuan(n, 4));
  if (nilai === null) return opsi.wajib ? 'Wajib diisi.' : null;
  if (opsi.min !== undefined && nilai < opsi.min) return `Paling sedikit ${fmt(opsi.min)}.`;
  if (opsi.max !== undefined && nilai > opsi.max) return `Paling banyak ${fmt(opsi.max)}.`;
  return null;
}

// ---------------------------------------------------------------- jam & tanggal-waktu

/** Urai jam "8", "08.30", "0830", "8:5", "20:15" menjadi "HH:mm". null bila kosong; string galat bila tidak sah. */
export function uraiJam(teks: string): { ok: true; nilai: string | null } | { ok: false; pesan: string } {
  const t = teks.trim().replace(/\s+/g, '');
  if (!t) return { ok: true, nilai: null };
  let j: number;
  let m: number;
  const pola = /^(\d{1,2})(?:[:.](\d{1,2}))?$/.exec(t);
  if (pola) {
    j = Number(pola[1]);
    m = pola[2] === undefined ? 0 : Number(pola[2]);
  } else if (/^\d{3,4}$/.test(t)) {
    j = Number(t.slice(0, t.length - 2));
    m = Number(t.slice(-2));
  } else return { ok: false, pesan: 'Tulis jam seperti 08.30 atau 14:00.' };
  if (j > 23) return { ok: false, pesan: 'Jam harus 00 sampai 23.' };
  if (m > 59) return { ok: false, pesan: 'Menit harus 00 sampai 59.' };
  return { ok: true, nilai: `${String(j).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
}

/** Geser jam "HH:mm" sebanyak `menit` (boleh negatif), berputar dalam 24 jam. */
export function geserJam(jam: string | null, menit: number): string {
  const [j = 0, m = 0] = (jam ?? '00:00').split(':').map(Number);
  const total = (((j * 60 + m + menit) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Pisah nilai tanggal-waktu API ("2026-11-22T08:30", "2026-11-22 08:30:00", "2026-11-22T08:30:00+08:00") menjadi
 * bagian tanggal `YYYY-MM-DD` dan jam `HH:mm`. Zona waktu tidak dikonversi: jam dibaca apa adanya.
 */
export function pisahTanggalWaktu(nilai: string | null | undefined): { tanggal: string | null; jam: string | null } {
  if (!nilai) return { tanggal: null, jam: null };
  const m = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(nilai.trim());
  if (!m) return { tanggal: null, jam: null };
  return { tanggal: m[1]!, jam: m[2] ? `${m[2]}:${m[3]}` : null };
}

/** Gabung tanggal + jam menjadi nilai API. `format` 'lokal' = "YYYY-MM-DDTHH:mm" (sama dengan datetime-local), 'sql' = "YYYY-MM-DD HH:mm:00". */
export function gabungTanggalWaktu(tanggal: string | null, jam: string | null, format: 'lokal' | 'sql' = 'lokal'): string | null {
  if (!tanggal) return null;
  const j = jam ?? '00:00';
  return format === 'sql' ? `${tanggal} ${j}:00` : `${tanggal}T${j}`;
}

/**
 * Nilai formulir (teks dari API/state, angka, atau kosong) menjadi `number | null` untuk IsianAngka/IsianRupiah.
 * Teks kosong, null, dan teks bukan angka menjadi null.
 */
export function keAngka(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Kebalikan `keAngka` untuk state formulir berbentuk teks: null menjadi '' (seperti isian bawaan yang dikosongkan). */
export function teksAngka(n: number | null | undefined): string {
  return n === null || n === undefined ? '' : String(n);
}
