'use client';
// Peramban loket web sebagai perangkat kasir (SIAKAD docs/KASIR.md "Loket web BAUK"; audit KU-02).
//
// Peramban membuat pasangan kunci ECDSA P-256 lewat WebCrypto yang TIDAK bisa diekspor dan menyimpannya di IndexedDB
// peramban itu. Kunci publiknya didaftarkan ke POST /v1/keuangan/kasir/peramban (status menunggu sampai disetujui
// penyetuju perangkat kasir, sama seperti komputer UNIPO Kasir). Setiap permintaan loket (buka/tutup sesi, catat
// pembayaran) ditandatangani: "<id>\n<waktu>\n<METODE>\n<path /v1/...>\n<sha256 hex badan JSON>", dikirim di query
// kasir_perangkat, kasir_waktu, kasir_tanda karena BFF aplikasi tidak meneruskan header khusus.
import type { ApiResult } from 'unipo-siakad-sdk';
import { useSiakad, useSiakadQuery, invalidateSiakad } from './provider';

export type StatusPerambanKasir = 'menunggu' | 'disetujui' | 'ditolak' | 'dicabut';

export interface PerambanKasir {
  id: number;
  perangkat_id: string;
  kode: string;
  nama: string;
  jenis?: 'aplikasi' | 'peramban';
  status: StatusPerambanKasir;
  status_label: string;
  aktif: boolean;
  sidik_kunci: string | null;
  unit_id: number | null;
  unit?: { id: number; kode?: string | null; nama: string; singkatan?: string | null } | null;
  alasan?: string | null;
  sesi_aktif?: { id: number; kasir: string; dibuka_at: string } | null;
}

export interface SesiPerambanKasir {
  id: number;
  kasir: string;
  loket: string | null;
  perangkat_id: number | null;
  status: 'buka' | 'tutup';
  dibuka_at: string;
  saldo_awal: number;
  total_tunai: number;
  total_nontunai: number;
  jumlah_transaksi: number;
  kas_seharusnya?: number;
  uang_fisik?: number | null;
  setoran: number | null;
  selisih: number | null;
  per_metode?: Array<{ metode: string; transaksi: number; jumlah: number }>;
  per_jenis?: Array<{ kode_biaya: string; nama?: string | null; transaksi: number; jumlah: number }>;
}

export interface KeadaanPerambanKasir {
  /** Peramban mendukung WebCrypto + IndexedDB (halaman HTTPS). */
  didukung: boolean;
  /** Sudah punya kunci & terdaftar di SIAKAD. */
  terdaftar: boolean;
  perangkat: PerambanKasir | null;
  sesi_saya: SesiPerambanKasir | null;
}

const DB = 'unipo-kasir-peramban';
const TOKO = 'kunci';
interface KunciTersimpan {
  id: string;
  pasangan: CryptoKeyPair;
  pem: string;
}

function didukung(): boolean {
  return typeof globalThis.crypto?.subtle !== 'undefined' && typeof globalThis.indexedDB !== 'undefined' && (typeof isSecureContext === 'undefined' || isSecureContext);
}

function bukaDb(): Promise<IDBDatabase> {
  return new Promise((ok, gagal) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(TOKO);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => gagal(r.error);
  });
}

async function baca(): Promise<KunciTersimpan | null> {
  const db = await bukaDb();
  return new Promise((ok, gagal) => {
    const r = db.transaction(TOKO, 'readonly').objectStore(TOKO).get('peramban');
    r.onsuccess = () => ok((r.result as KunciTersimpan | undefined) ?? null);
    r.onerror = () => gagal(r.error);
  });
}

async function simpan(k: KunciTersimpan): Promise<void> {
  const db = await bukaDb();
  return new Promise((ok, gagal) => {
    const t = db.transaction(TOKO, 'readwrite');
    t.objectStore(TOKO).put(k, 'peramban');
    t.oncomplete = () => ok();
    t.onerror = () => gagal(t.error);
  });
}

let kunciCache: Promise<KunciTersimpan | null> | null = null;
function kunci(): Promise<KunciTersimpan | null> {
  if (!didukung()) return Promise.resolve(null);
  kunciCache ??= baca().catch(() => null);
  return kunciCache;
}

async function buatKunci(): Promise<KunciTersimpan> {
  const pasangan = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
  const spki = new Uint8Array(await crypto.subtle.exportKey('spki', pasangan.publicKey));
  let b = '';
  spki.forEach((x) => (b += String.fromCharCode(x)));
  const b64 = btoa(b);
  const pem = `-----BEGIN PUBLIC KEY-----\n${(b64.match(/.{1,64}/g) ?? []).join('\n')}\n-----END PUBLIC KEY-----\n`;
  const id = `web-${crypto.randomUUID()}`;
  const k = { id, pasangan, pem };
  await simpan(k);
  kunciCache = Promise.resolve(k);
  return k;
}

async function hex(teks: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(teks)));
  return Array.from(h, (x) => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Query bukti peramban untuk satu permintaan. `body` harus objek yang SAMA dengan yang dikirim ke siakad.request (SDK
 * mengirim JSON.stringify(body)).
 */
export async function buktiPeramban(metode: string, path: string, body: unknown): Promise<Record<string, string>> {
  const k = await kunci();
  if (!k) return {};
  const waktu = String(Math.floor(Date.now() / 1000));
  const badan = body === undefined || body === null ? '' : JSON.stringify(body);
  const pesan = [k.id, waktu, metode.toUpperCase(), path.replace(/\?.*$/, '').replace(/\/+$/, ''), await hex(badan)].join('\n');
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, k.pasangan.privateKey, new TextEncoder().encode(pesan)));
  let b = '';
  sig.forEach((x) => (b += String.fromCharCode(x)));
  return { kasir_perangkat: k.id, kasir_waktu: waktu, kasir_tanda: btoa(b) };
}

function namaBawaan(): string {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const p = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Peramban';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return `Loket web ${p}${os ? ` · ${os}` : ''}`;
}

/** Keadaan peramban loket ini (didaftarkan, status persetujuan, sesi kasir Anda). Disegarkan oleh invalidateSiakad('keuangan'). */
export function usePerambanKasir(enabled = true) {
  const q = useSiakadQuery<KeadaanPerambanKasir>(
    ['keuangan', 'peramban-kasir'],
    async (s) => {
      const hasil = (data: KeadaanPerambanKasir) => ({ data }) as ApiResult<KeadaanPerambanKasir>;
      if (!didukung()) return hasil({ didukung: false, terdaftar: false, perangkat: null, sesi_saya: null });
      const k = await kunci();
      if (!k) return hasil({ didukung: true, terdaftar: false, perangkat: null, sesi_saya: null });
      const body = { perangkat_id: k.id, kunci_publik: k.pem };
      const path = '/v1/keuangan/kasir/peramban';
      const r = await s.request<{ perangkat: PerambanKasir; sesi_saya: SesiPerambanKasir | null }>({ method: 'POST', path, body, query: await buktiPeramban('POST', path, body) });
      return hasil({ didukung: true, terdaftar: true, perangkat: r.data.perangkat, sesi_saya: r.data.sesi_saya });
    },
    { enabled, staleTime: 20_000 },
  );
  return q;
}

/** Daftarkan peramban ini (kunci baru bila belum ada) atau ajukan ulang setelah ditolak. */
export function useDaftarPerambanKasir() {
  const siakad = useSiakad();
  return async (isi: { nama?: string; catatan?: string; ajukanUlang?: boolean }) => {
    const k = (await kunci()) ?? (await buatKunci());
    const body = { perangkat_id: k.id, kunci_publik: k.pem, nama: isi.nama?.trim() || namaBawaan(), catatan: isi.catatan?.trim() || undefined, ajukan_ulang: isi.ajukanUlang || undefined,
      sidik: { nama_komputer: namaBawaan(), versi: 'web' } };
    const path = '/v1/keuangan/kasir/peramban';
    const r = await siakad.request<{ perangkat: PerambanKasir }>({ method: 'POST', path, body, query: await buktiPeramban('POST', path, body) });
    invalidateSiakad('keuangan');
    return r.data.perangkat;
  };
}

export { namaBawaan as namaPerambanBawaan, didukung as perambanKasirDidukung };
