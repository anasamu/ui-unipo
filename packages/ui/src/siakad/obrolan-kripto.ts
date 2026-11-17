/**
 * Kriptografi obrolan end-to-end (WebCrypto, tanpa pustaka luar). Pasangan dengan app/Modules/Obrolan SIAKAD.
 *
 * - Perangkat: ECDH P-256 (tukar kunci) + ECDSA P-256 (tanda tangan). Kunci privat disimpan di IndexedDB browser ini
 *   dan tidak pernah dikirim ke server (kecuali di dalam cadangan yang dienkripsi sandi pengguna).
 * - Pesan: isi dienkripsi AES-256-GCM dengan kunci acak. Kunci itu dibungkus (AES-KW) untuk setiap perangkat penerima
 *   dengan kunci turunan HKDF-SHA256 dari ECDH(kunci efemeral pesan, kunci tukar perangkat). Pesan ditandatangani
 *   ECDSA oleh perangkat pengirim.
 * - Lampiran: dienkripsi AES-256-GCM dengan kunci tersendiri yang ikut di dalam isi pesan.
 */

const VERSI = 'unipo-obrolan-v1';
const enc = new TextEncoder();
const dec = new TextDecoder();

function subtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error('Browser ini tidak mendukung enkripsi (WebCrypto). Buka lewat HTTPS dengan browser terbaru.');
  return s;
}

/** Apakah browser bisa menjalankan obrolan terenkripsi. */
export function kriptoDidukung(): boolean {
  return typeof globalThis.crypto?.subtle?.generateKey === 'function';
}

// ---------------------------------------------------------------- base64

export function keB64(b: ArrayBuffer | Uint8Array): string {
  const u = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}

export function dariB64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const u = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

export function acak(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(new ArrayBuffer(n)));
}

export function uuidAcak(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = acak(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

async function sha256(data: Uint8Array<ArrayBuffer> | ArrayBuffer): Promise<Uint8Array> {
  return new Uint8Array(await subtle().digest('SHA-256', data));
}

// ---------------------------------------------------------------- kunci perangkat

export interface KunciPerangkat {
  /** UUID perangkat dari server (kosong sebelum didaftarkan). */
  id: string;
  pemilik: string;
  tukar: CryptoKeyPair;
  tanda: CryptoKeyPair;
  dibuat: number;
}

export interface KunciPublikPerangkat {
  id: string;
  pemilik: string;
  kunci_tukar: string;
  kunci_tanda: string;
  sidik: string;
  dibuat_at?: string;
}

const ECDH = { name: 'ECDH', namedCurve: 'P-256' } as const;
const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' } as const;

/** Buat kunci perangkat baru. Kunci bisa diekspor hanya untuk cadangan terenkripsi. */
export async function buatKunciPerangkat(pemilik: string): Promise<KunciPerangkat> {
  const [tukar, tanda] = await Promise.all([
    subtle().generateKey(ECDH, true, ['deriveBits']) as Promise<CryptoKeyPair>,
    subtle().generateKey(ECDSA, true, ['sign', 'verify']) as Promise<CryptoKeyPair>,
  ]);
  return { id: '', pemilik, tukar, tanda, dibuat: Date.now() };
}

export async function publikRaw(k: CryptoKey): Promise<string> {
  return keB64(await subtle().exportKey('raw', k));
}

/** Sidik perangkat = SHA-256(kunci_tukar raw || kunci_tanda raw), sama dengan kolom `sidik` di server. */
export async function sidikPerangkat(kunciTukar: string, kunciTanda: string): Promise<string> {
  const a = dariB64(kunciTukar);
  const b = dariB64(kunciTanda);
  const g = new Uint8Array(new ArrayBuffer(a.length + b.length));
  g.set(a);
  g.set(b, a.length);
  return [...(await sha256(g))].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const cacheImpor = new Map<string, Promise<CryptoKey>>();
function imporPublik(raw: string, alg: typeof ECDH | typeof ECDSA): Promise<CryptoKey> {
  const k = `${alg.name}:${raw}`;
  let p = cacheImpor.get(k);
  if (!p) {
    p = subtle().importKey('raw', dariB64(raw), alg, true, alg.name === 'ECDSA' ? ['verify'] : []);
    cacheImpor.set(k, p);
    if (cacheImpor.size > 500) cacheImpor.delete(cacheImpor.keys().next().value!);
  }
  return p;
}

async function kunciBungkus(rahasia: ArrayBuffer, uuidPesan: string, idPerangkat: string, jenis: 'kunci' | 'susulan' = 'kunci'): Promise<CryptoKey> {
  const hk = await subtle().importKey('raw', rahasia, 'HKDF', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: enc.encode(uuidPesan), info: enc.encode(`${VERSI}|${jenis}|${idPerangkat}`) }, hk, { name: 'AES-KW', length: 256 }, false, [
    'wrapKey',
    'unwrapKey',
  ]);
}

/** Awalan kunci susulan dari server: dibungkus dengan ECDH perangkat pengirim x perangkat ini (bukan kunci efemeral). */
const SUSULAN = 's1.';

// ---------------------------------------------------------------- pesan

/** Isi pesan sebelum dienkripsi. Server tidak pernah melihat bentuk ini. */
export interface IsiPesan {
  v: 1;
  /** teks, berkas, reaksi, ubah, sistem */
  t: 'teks' | 'berkas' | 'reaksi' | 'ubah' | 'sistem';
  isi?: string;
  /** UUID pesan yang dibalas (teks/berkas), direaksi (reaksi), atau diubah (ubah). */
  ke?: string;
  /** Cuplikan pesan yang dibalas, agar balasan tetap terbaca walau pesan aslinya belum dimuat. */
  kutip?: { pengirim: string; isi: string };
  /** `kunci`/`iv` hanya ada di lampiran lama yang dienkripsi browser; lampiran baru dienkripsi server. */
  berkas?: Array<{ id: string; nama: string; mime: string; ukuran: number; kunci?: string; iv?: string; lebar?: number; tinggi?: number }>;
  /** Emoji reaksi; kosong = hapus reaksi. */
  emoji?: string;
}

export interface PesanTerenkripsi {
  uuid: string;
  perangkat: string;
  sandi: string;
  iv: string;
  efemeral: string;
  tanda: string;
  kunci: Record<string, string>;
}

function dataTanda(ruang: string, uuid: string, perangkat: string, iv: string, efemeral: string, hashSandi: string): Uint8Array<ArrayBuffer> {
  return enc.encode(`${VERSI}|${ruang}|${uuid}|${perangkat}|${iv}|${efemeral}|${hashSandi}`);
}

function aad(ruang: string, uuid: string, perangkat: string): Uint8Array<ArrayBuffer> {
  return enc.encode(`${VERSI}|${ruang}|${uuid}|${perangkat}`);
}

/** Enkripsi pesan untuk semua perangkat penerima (termasuk perangkat lain milik pengirim). */
export async function enkripsiPesan(isi: IsiPesan, opsi: { ruang: string; pengirim: KunciPerangkat; penerima: KunciPublikPerangkat[]; uuid?: string }): Promise<PesanTerenkripsi> {
  const s = subtle();
  const uuid = opsi.uuid ?? uuidAcak();
  const dev = opsi.pengirim.id;
  const cek = await s.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const iv = acak(12);
  const sandi = new Uint8Array(await s.encrypt({ name: 'AES-GCM', iv, additionalData: aad(opsi.ruang, uuid, dev) }, cek, enc.encode(JSON.stringify(isi))));
  const eph = (await s.generateKey(ECDH, true, ['deriveBits'])) as CryptoKeyPair;
  const efemeral = await publikRaw(eph.publicKey);
  const kunci: Record<string, string> = {};
  await Promise.all(
    opsi.penerima.map(async (p) => {
      const rahasia = await s.deriveBits({ name: 'ECDH', public: await imporPublik(p.kunci_tukar, ECDH) }, eph.privateKey, 256);
      kunci[p.id] = keB64(await s.wrapKey('raw', cek, await kunciBungkus(rahasia, uuid, p.id), 'AES-KW'));
    }),
  );
  const ivB64 = keB64(iv);
  const sandiB64 = keB64(sandi);
  const hash = keB64(await sha256(sandi));
  const tanda = keB64(await s.sign({ name: 'ECDSA', hash: 'SHA-256' }, opsi.pengirim.tanda.privateKey, dataTanda(opsi.ruang, uuid, dev, ivB64, efemeral, hash)));
  return { uuid, perangkat: dev, sandi: sandiB64, iv: ivB64, efemeral, tanda, kunci };
}

/**
 * Bungkus ulang kunci pesan untuk perangkat anggota yang belum punya kunci saat pesan dikirim (kunci susulan).
 * Perangkat pengirim membuka kunci pesan miliknya, lalu membungkusnya dengan ECDH (kunci tukar perangkat ini x kunci
 * tukar perangkat tujuan). Hasil: {id_perangkat_tujuan: kunci AES-KW base64}. Butir yang gagal dilewati.
 */
export async function bungkusSusulan(
  p: { uuid: string; efemeral: string; kunci: string },
  opsi: { saya: KunciPerangkat; tujuan: Array<{ id: string; kunci_tukar: string }> },
): Promise<Record<string, string>> {
  const s = subtle();
  const rahasiaSaya = await s.deriveBits({ name: 'ECDH', public: await imporPublik(p.efemeral, ECDH) }, opsi.saya.tukar.privateKey, 256);
  const cek = await s.unwrapKey('raw', dariB64(p.kunci), await kunciBungkus(rahasiaSaya, p.uuid, opsi.saya.id), 'AES-KW', 'AES-GCM', true, ['decrypt']);
  const out: Record<string, string> = {};
  await Promise.all(
    opsi.tujuan.map(async (t) => {
      try {
        const rahasia = await s.deriveBits({ name: 'ECDH', public: await imporPublik(t.kunci_tukar, ECDH) }, opsi.saya.tukar.privateKey, 256);
        out[t.id] = keB64(await s.wrapKey('raw', cek, await kunciBungkus(rahasia, p.uuid, t.id, 'susulan'), 'AES-KW'));
      } catch {
        /* kunci publik tujuan tidak sah: lewati */
      }
    }),
  );
  return out;
}

async function bukaKunciPesan(
  p: { uuid: string; efemeral: string; kunci: string },
  saya: KunciPerangkat,
  kunciTukarPengirim: string[],
): Promise<CryptoKey> {
  const s = subtle();
  if (!p.kunci.startsWith(SUSULAN)) {
    const rahasia = await s.deriveBits({ name: 'ECDH', public: await imporPublik(p.efemeral, ECDH) }, saya.tukar.privateKey, 256);
    return s.unwrapKey('raw', dariB64(p.kunci), await kunciBungkus(rahasia, p.uuid, saya.id), 'AES-KW', 'AES-GCM', false, ['decrypt']);
  }
  // Kunci susulan bisa dibungkus perangkat mana pun milik pengirim: coba satu per satu (AES-KW menolak kunci yang salah).
  const bungkus = dariB64(p.kunci.slice(SUSULAN.length));
  for (const pub of kunciTukarPengirim) {
    try {
      const rahasia = await s.deriveBits({ name: 'ECDH', public: await imporPublik(pub, ECDH) }, saya.tukar.privateKey, 256);
      return await s.unwrapKey('raw', bungkus, await kunciBungkus(rahasia, p.uuid, saya.id, 'susulan'), 'AES-KW', 'AES-GCM', false, ['decrypt']);
    } catch {
      /* coba perangkat berikutnya */
    }
  }
  throw new Error('Kunci susulan tidak cocok dengan perangkat pengirim mana pun.');
}

/**
 * Kunci pesan (AES-256 mentah, base64) dari pesan end-to-end lama, untuk dipindahkan ke enkripsi server
 * (POST /v1/obrolan/ruang/{id}/pesan/{uuid}/pindah-server). Server membuka sandi aslinya sendiri dengan kunci ini.
 */
export async function kunciPesanMentah(p: { uuid: string; efemeral: string; kunci: string }, saya: KunciPerangkat, kunciTukarPengirim: string[] = []): Promise<string> {
  const s = subtle();
  let cek: CryptoKey;
  if (!p.kunci.startsWith(SUSULAN)) {
    const rahasia = await s.deriveBits({ name: 'ECDH', public: await imporPublik(p.efemeral, ECDH) }, saya.tukar.privateKey, 256);
    cek = await s.unwrapKey('raw', dariB64(p.kunci), await kunciBungkus(rahasia, p.uuid, saya.id), 'AES-KW', 'AES-GCM', true, ['decrypt']);
  } else {
    const bungkus = dariB64(p.kunci.slice(SUSULAN.length));
    let ketemu: CryptoKey | null = null;
    for (const pub of kunciTukarPengirim) {
      try {
        const rahasia = await s.deriveBits({ name: 'ECDH', public: await imporPublik(pub, ECDH) }, saya.tukar.privateKey, 256);
        ketemu = await s.unwrapKey('raw', bungkus, await kunciBungkus(rahasia, p.uuid, saya.id, 'susulan'), 'AES-KW', 'AES-GCM', true, ['decrypt']);
        break;
      } catch {
        /* coba perangkat berikutnya */
      }
    }
    if (!ketemu) throw new Error('Kunci pesan tidak cocok.');
    cek = ketemu;
  }
  return keB64(await s.exportKey('raw', cek));
}

/** Kunci pesan ini kunci susulan (perlu kunci tukar perangkat pengirim untuk membukanya). */
export function kunciSusulan(kunci: string | null | undefined): boolean {
  return Boolean(kunci?.startsWith(SUSULAN));
}

export type HasilDekripsi = { ok: true; isi: IsiPesan; terverifikasi: boolean } | { ok: false; alasan: 'tanpa_kunci' | 'rusak' | 'dihapus' };

/**
 * Buka pesan dengan kunci perangkat ini. `kunciTandaPengirim` = kunci_tanda perangkat pengirim (null bila perangkat
 * itu sudah dicabut, maka hasil tidak terverifikasi).
 */
export async function dekripsiPesan(
  p: { uuid: string; perangkat: string; sandi: string | null; iv: string | null; efemeral: string | null; tanda: string | null; kunci: string | null; dihapus?: boolean },
  opsi: { ruang: string; saya: KunciPerangkat; kunciTandaPengirim: string | null; kunciTukarPengirim?: string[] },
): Promise<HasilDekripsi> {
  if (p.dihapus || !p.sandi || !p.iv || !p.efemeral) return { ok: false, alasan: 'dihapus' };
  if (!p.kunci) return { ok: false, alasan: 'tanpa_kunci' };
  const s = subtle();
  try {
    const cek = await bukaKunciPesan({ uuid: p.uuid, efemeral: p.efemeral, kunci: p.kunci }, opsi.saya, opsi.kunciTukarPengirim ?? []);
    const sandi = dariB64(p.sandi);
    const teks = await s.decrypt({ name: 'AES-GCM', iv: dariB64(p.iv), additionalData: aad(opsi.ruang, p.uuid, p.perangkat) }, cek, sandi);
    let terverifikasi = false;
    if (opsi.kunciTandaPengirim && p.tanda) {
      const hash = keB64(await sha256(sandi));
      terverifikasi = await s.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        await imporPublik(opsi.kunciTandaPengirim, ECDSA),
        dariB64(p.tanda),
        dataTanda(opsi.ruang, p.uuid, p.perangkat, p.iv, p.efemeral, hash),
      );
    }
    const isi = JSON.parse(dec.decode(teks)) as IsiPesan;
    return { ok: true, isi, terverifikasi };
  } catch {
    return { ok: false, alasan: 'rusak' };
  }
}

// ---------------------------------------------------------------- lampiran

export async function enkripsiBerkas(data: ArrayBuffer): Promise<{ sandi: Uint8Array<ArrayBuffer>; kunci: string; iv: string }> {
  const s = subtle();
  const k = await s.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const iv = acak(12);
  const sandi = new Uint8Array(await s.encrypt({ name: 'AES-GCM', iv }, k, data));
  return { sandi, kunci: keB64(await s.exportKey('raw', k)), iv: keB64(iv) };
}

export async function dekripsiBerkas(sandi: Uint8Array<ArrayBuffer> | ArrayBuffer, kunci: string, iv: string): Promise<ArrayBuffer> {
  const s = subtle();
  const k = await s.importKey('raw', dariB64(kunci), 'AES-GCM', false, ['decrypt']);
  return s.decrypt({ name: 'AES-GCM', iv: dariB64(iv) }, k, sandi);
}

// ---------------------------------------------------------------- nomor keamanan

/**
 * Nomor keamanan dua orang: 60 angka (12 kelompok 5 angka), sama di kedua sisi. Dihitung dari sidik semua perangkat
 * aktif keduanya, jadi berubah bila salah satu menambah atau mencabut perangkat.
 */
export async function nomorKeamanan(a: { id: string; sidik: string[] }, b: { id: string; sidik: string[] }): Promise<string[]> {
  const bagian = [a, b].map((x) => `${x.id}:${[...x.sidik].sort().join(',')}`).sort();
  let h = enc.encode(`${VERSI}|nomor|${bagian.join('|')}`) as Uint8Array<ArrayBuffer>;
  // Diulang agar menebak pasangan kunci dengan nomor sama jauh lebih mahal.
  for (let i = 0; i < 1024; i++) h = new Uint8Array(await subtle().digest('SHA-512', h)) as Uint8Array<ArrayBuffer>;
  const out: string[] = [];
  for (let i = 0; i < 12; i++) {
    let n = 0n;
    for (let j = 0; j < 5; j++) n = (n << 8n) | BigInt(h[i * 5 + j]);
    out.push((n % 100000n).toString().padStart(5, '0'));
  }
  return out;
}

// ---------------------------------------------------------------- cadangan

const ITERASI = 600_000;

async function kunciSandi(sandi: string, salt: Uint8Array<ArrayBuffer>, iterasi: number): Promise<CryptoKey> {
  const dasar = await subtle().importKey('raw', enc.encode(sandi.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iterasi }, dasar, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** Enkripsi kunci perangkat dengan sandi cadangan (minimal 8 karakter). */
export async function buatCadangan(k: KunciPerangkat, sandi: string): Promise<{ data: string; salt: string; iterasi: number }> {
  if (sandi.length < 8) throw new Error('Sandi cadangan minimal 8 karakter.');
  const s = subtle();
  const isi = {
    v: 1,
    id: k.id,
    pemilik: k.pemilik,
    tukar: { priv: await s.exportKey('jwk', k.tukar.privateKey), pub: await s.exportKey('jwk', k.tukar.publicKey) },
    tanda: { priv: await s.exportKey('jwk', k.tanda.privateKey), pub: await s.exportKey('jwk', k.tanda.publicKey) },
  };
  const salt = acak(16);
  const iv = acak(12);
  const ct = new Uint8Array(await s.encrypt({ name: 'AES-GCM', iv }, await kunciSandi(sandi, salt, ITERASI), enc.encode(JSON.stringify(isi))));
  const g = new Uint8Array(12 + ct.length);
  g.set(iv);
  g.set(ct, 12);
  return { data: keB64(g), salt: keB64(salt), iterasi: ITERASI };
}

/** Buka cadangan. Melempar galat bila sandi salah. */
export async function bukaCadangan(c: { data: string; salt: string; iterasi: number }, sandi: string): Promise<KunciPerangkat> {
  const s = subtle();
  const g = dariB64(c.data);
  let teks: ArrayBuffer;
  try {
    teks = await s.decrypt({ name: 'AES-GCM', iv: g.slice(0, 12) }, await kunciSandi(sandi, dariB64(c.salt), c.iterasi), g.slice(12));
  } catch {
    throw new Error('Sandi cadangan salah.');
  }
  const isi = JSON.parse(dec.decode(teks));
  const [tp, tq, sp, sq] = await Promise.all([
    s.importKey('jwk', isi.tukar.priv, ECDH, true, ['deriveBits']),
    s.importKey('jwk', isi.tukar.pub, ECDH, true, []),
    s.importKey('jwk', isi.tanda.priv, ECDSA, true, ['sign']),
    s.importKey('jwk', isi.tanda.pub, ECDSA, true, ['verify']),
  ]);
  return { id: String(isi.id), pemilik: String(isi.pemilik), tukar: { privateKey: tp, publicKey: tq }, tanda: { privateKey: sp, publicKey: sq }, dibuat: Date.now() };
}

// ---------------------------------------------------------------- penyimpanan kunci (IndexedDB)

const DB = 'unipo-obrolan';
const STORE = 'kunci';
const memori = new Map<string, KunciPerangkat>();

function bukaDb(): Promise<IDBDatabase | null> {
  return new Promise((ok) => {
    try {
      if (typeof indexedDB === 'undefined') return ok(null);
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ok(null);
    } catch {
      ok(null);
    }
  });
}

/** Kunci perangkat tersimpan untuk pemilik di ruang nama tertentu (mis. alamat API). */
export async function muatKunci(ruangNama: string, pemilik: string): Promise<KunciPerangkat | null> {
  const k = `${ruangNama}|${pemilik}`;
  if (memori.has(k)) return memori.get(k)!;
  const db = await bukaDb();
  if (!db) return null;
  return new Promise((ok) => {
    try {
      const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(k);
      r.onsuccess = () => {
        const v = (r.result as KunciPerangkat | undefined) ?? null;
        if (v) memori.set(k, v);
        ok(v);
      };
      r.onerror = () => ok(null);
    } catch {
      ok(null);
    }
  });
}

export async function simpanKunci(ruangNama: string, kunci: KunciPerangkat): Promise<void> {
  const k = `${ruangNama}|${kunci.pemilik}`;
  memori.set(k, kunci);
  const db = await bukaDb();
  if (!db) return;
  await new Promise<void>((ok) => {
    try {
      const t = db.transaction(STORE, 'readwrite');
      t.objectStore(STORE).put(kunci, k);
      t.oncomplete = () => ok();
      t.onerror = () => ok();
    } catch {
      ok();
    }
  });
}

export async function hapusKunci(ruangNama: string, pemilik: string): Promise<void> {
  const k = `${ruangNama}|${pemilik}`;
  memori.delete(k);
  const db = await bukaDb();
  if (!db) return;
  await new Promise<void>((ok) => {
    try {
      const t = db.transaction(STORE, 'readwrite');
      t.objectStore(STORE).delete(k);
      t.oncomplete = () => ok();
      t.onerror = () => ok();
    } catch {
      ok();
    }
  });
}
