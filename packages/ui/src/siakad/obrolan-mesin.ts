import type { Siakad } from 'unipo-siakad-sdk';
import {
  buatCadangan,
  bukaCadangan,
  bungkusSusulan,
  dekripsiBerkas,
  dekripsiPesan,
  hapusKunci,
  kriptoDidukung,
  kunciSusulan,
  muatKunci,
  nomorKeamanan,
  publikRaw,
  simpanKunci,
  uuidAcak,
  type IsiPesan,
  type KunciPerangkat,
  type KunciPublikPerangkat,
  kunciPesanMentah,
} from './obrolan-kripto';
import { unggahKeBerkas, type InfoBerkas } from './berkas';
import { rapikanSegmen } from './manajer-berkas';
import { invalidateSiakad } from './provider';

/**
 * Mesin obrolan: satu per instans Siakad, dipakai bersama semua komponen obrolan di halaman (chat mengambang, kotak
 * obrolan penuh, daftar pengguna). Mengurus kunci perangkat, dekripsi, antrean kirim, dan umpan realtime long-poll.
 * Teks pesan hanya ada di memori tab ini.
 */

export interface OrangObrolan {
  id: string;
  nama: string;
  peran: string;
  jenis: 'pengguna' | 'pendaftar' | string;
  punya_kunci: boolean;
  daring: boolean;
  terakhir_aktif: string | null;
  peran_ruang?: 'admin' | 'anggota';
  dibaca_sampai?: number | null;
  diterima_sampai?: number;
}

/**
 * `menunggu`: pesan dikirim sebelum perangkat ini punya kunci; kuncinya menyusul otomatis saat perangkat pengirim
 * daring. `tak_terbaca`: pesan dikirim sebelum perangkat ini terdaftar padahal pemiliknya sudah punya perangkat lain
 * (perlu pulihkan cadangan kunci).
 */
export type StatusPesan = 'mengirim' | 'terkirim' | 'gagal' | 'dihapus' | 'tak_terbaca' | 'menunggu';

export interface PesanObrolan {
  /** ID server (0 selama masih dikirim). */
  id: number;
  uuid: string;
  pengirim: string;
  perangkat: string;
  dibuat_at: string;
  kedaluwarsa_at: string | null;
  status: StatusPesan;
  isi?: IsiPesan;
  /** Tanda tangan perangkat pengirim cocok. */
  terverifikasi?: boolean;
  galat?: string;
  diubah?: boolean;
  /** emoji → daftar pemilik */
  reaksi?: Record<string, string[]>;
}

export interface RuangObrolanData {
  id: string;
  jenis: 'langsung' | 'grup';
  judul: string | null;
  anggota: OrangObrolan[];
  pesan_terakhir: PesanObrolan | null;
  pesan_terakhir_at: string | null;
  belum_dibaca: number;
  dibaca_sampai: number;
  bisu: boolean;
  arsip: boolean;
  sematkan: boolean;
  peran_saya: 'admin' | 'anggota';
  kedaluwarsa_detik: number;
  dibuat_at: string;
}

export interface PerangkatObrolan {
  id: string;
  nama: string;
  sidik: string;
  dibuat_at: string;
  terakhir_aktif: string | null;
}

export type StatusMesin = 'mati' | 'memuat' | 'siap' | 'tidak_didukung' | 'galat';

export interface KeadaanObrolan {
  status: StatusMesin;
  galat: string | null;
  saya: { id: string; nama: string; peran: string; jenis: string } | null;
  perangkat: string | null;
  perangkatSaya: PerangkatObrolan[];
  cadanganAda: boolean;
  /** Perangkat ini baru dibuat padahal akun sudah punya cadangan: pesan lama hanya terbaca setelah dipulihkan. */
  sarankanPulihkan: boolean;
  /** simpan_kirim: salin otomatis berkas yang dikirim ke Berkas saya › Obrolan (bawaan aktif). */
  setelan: { tampil_daring: boolean; tanda_baca: boolean; simpan_kirim: boolean };
  ruang: Record<string, RuangObrolanData>;
  urutan: string[];
  pesan: Record<string, { daftar: PesanObrolan[]; lagi: boolean; dimuat: boolean; memuat: boolean }>;
  ketik: Record<string, Record<string, number>>;
  /** Kontak yang kunci perangkatnya berubah sejak terakhir dilihat. */
  kunciBerubah: Record<string, true>;
  terhubung: boolean;
  lampiranMb: number;
}

interface PesanServer {
  id: number;
  uuid: string;
  pengirim: string;
  perangkat: string;
  sandi: string | null;
  iv: string | null;
  efemeral: string | null;
  tanda: string | null;
  kunci: string | null;
  /** "server" = isi dibuka SIAKAD untuk anggota (field `isi`); "perangkat" = pesan end-to-end lama. */
  enkripsi?: 'server' | 'perangkat';
  isi?: IsiPesan | null;
  /** Kunci untuk perangkat ini akan disusulkan perangkat pengirim. */
  menunggu?: boolean;
  lampiran: string[];
  dihapus: boolean;
  kedaluwarsa_at: string | null;
  dibuat_at: string;
}

interface RuangServer extends Omit<RuangObrolanData, 'pesan_terakhir'> {
  pesan_terakhir: PesanServer | null;
}

const AWAL: KeadaanObrolan = {
  status: 'mati',
  galat: null,
  saya: null,
  perangkat: null,
  perangkatSaya: [],
  cadanganAda: false,
  sarankanPulihkan: false,
  setelan: { tampil_daring: true, tanda_baca: true, simpan_kirim: true },
  ruang: {},
  urutan: [],
  pesan: {},
  ketik: {},
  kunciBerubah: {},
  terhubung: false,
  lampiranMb: 25,
};

const P = '/v1/obrolan';

/** Nama panggilan: kata pertama setelah gelar (Dr., Prof., Ir., H., ...). */
export const namaDepan = (n: string) => n.split(/\s+/).find((k) => k && !k.endsWith('.') && !k.endsWith(',')) ?? n.split(/\s+/)[0] ?? n;

export function lawanDari(r: RuangObrolanData, saya: string): OrangObrolan | null {
  if (r.jenis !== 'langsung') return null;
  return r.anggota.find((a) => a.id !== saya) ?? r.anggota[0] ?? null;
}

/** Nama obrolan: nama lawan bicara (langsung), judul grup, atau nama depan anggota. */
export function judulRuang(r: RuangObrolanData, saya: string): string {
  if (r.jenis === 'langsung') return lawanDari(r, saya)?.nama ?? 'Obrolan';
  return (
    r.judul ||
    r.anggota
      .filter((a) => a.id !== saya)
      .map((a) => namaDepan(a.nama))
      .join(', ') ||
    'Grup'
  );
}

function galatTeks(e: unknown): string {
  const x = e as { status?: number; message?: string; details?: Record<string, unknown> } | null;
  if (!x) return 'Terjadi kesalahan.';
  if (x.status === 0) return 'Tidak tersambung ke server.';
  if (x.status === 403 && (x as { code?: string }).code === 'diblokir') return 'Pesan tidak bisa dikirim ke obrolan ini.';
  if (x.status === 429) return 'Terlalu banyak pesan dalam semenit. Tunggu sebentar lalu kirim ulang.';
  if (x.status === 413) return 'Lampiran terlalu besar.';
  if ((x.status ?? 0) >= 500) return 'Server sedang bermasalah. Coba kirim ulang sebentar lagi.';
  return x.message || 'Terjadi kesalahan.';
}

/** Pesan urut naik menurut id server; pesan yang masih dikirim (id 0) di akhir. */
function urutId(l: PesanObrolan[]): PesanObrolan[] {
  return [...l].sort((a, b) => (a.id || Number.MAX_SAFE_INTEGER) - (b.id || Number.MAX_SAFE_INTEGER));
}

/** Id pesan terbesar yang sudah tersimpan di server (untuk tanda dibaca dan memuat pesan baru). */
function idTerbesar(l: PesanObrolan[]): number {
  return l.reduce((m, p) => (p.id > m ? p.id : m), 0);
}

export class MesinObrolan {
  private s: KeadaanObrolan = AWAL;
  private pendengar = new Set<() => void>();
  private pemakai = 0;
  private kunci: KunciPerangkat | null = null;
  private kunciPublik = new Map<string, Promise<KunciPublikPerangkat[]>>();
  private loop: AbortController | null = null;
  private hentiTimer: ReturnType<typeof setTimeout> | null = null;
  private ketikTerakhir = new Map<string, number>();
  private bacaTimer = new Map<string, ReturnType<typeof setTimeout>>();
  private urlBerkas = new Map<string, Promise<string>>();
  private mulaiPromise: Promise<void> | null = null;
  private susulanJalan: Promise<void> | null = null;
  private susulanLagi = false;
  readonly ruangNama: string;

  constructor(private siakad: Siakad) {
    const opsi = (siakad as unknown as { options?: { baseUrl?: string } }).options;
    this.ruangNama = opsi?.baseUrl ?? (typeof location !== 'undefined' ? location.origin : 'siakad');
  }

  // ---------------------------------------------------------------- store

  get keadaan(): KeadaanObrolan {
    return this.s;
  }

  langgan = (fn: () => void): (() => void) => {
    this.pendengar.add(fn);
    return () => this.pendengar.delete(fn);
  };

  private set(ubah: Partial<KeadaanObrolan> | ((s: KeadaanObrolan) => Partial<KeadaanObrolan>)) {
    const u = typeof ubah === 'function' ? ubah(this.s) : ubah;
    this.s = { ...this.s, ...u };
    this.pendengar.forEach((f) => f());
  }

  /** Komponen yang memakai mesin memanggil ini saat terpasang; mesin berhenti 30 detik setelah pemakai terakhir lepas. */
  pakai(): () => void {
    this.pemakai++;
    if (this.hentiTimer) clearTimeout(this.hentiTimer);
    void this.mulai();
    return () => {
      this.pemakai--;
      if (this.pemakai <= 0) this.hentiTimer = setTimeout(() => this.berhenti(), 30_000);
    };
  }

  private req<T>(
    method: 'GET' | 'POST',
    path: string,
    opsi: { query?: Record<string, string | number | undefined>; body?: unknown; signal?: AbortSignal; multipart?: boolean; timeout?: number } = {},
  ) {
    return this.siakad
      .request<T>(
        { method, path: P + path, query: opsi.query as Record<string, string>, body: opsi.body, multipart: opsi.multipart },
        { signal: opsi.signal, timeout: opsi.timeout, maxRetries: method === 'GET' ? 2 : 0 },
      )
      .then((r) => r.data as T);
  }

  // ---------------------------------------------------------------- mulai

  mulai(): Promise<void> {
    if (this.s.status === 'siap' && this.loop) return Promise.resolve();
    return (this.mulaiPromise ??= this.mulaiSungguh().finally(() => (this.mulaiPromise = null)));
  }

  private async mulaiSungguh() {
    this.set({ status: 'memuat', galat: null });
    try {
      const saya = await this.req<{
        id: string;
        nama: string;
        peran: string;
        jenis: string;
        perangkat: Array<PerangkatObrolan & { kunci_tukar: string }>;
        setelan: KeadaanObrolan['setelan'];
        cadangan_ada: boolean;
        tunggu_maks: number;
        lampiran_mb: number;
      }>('GET', '/saya');
      // Obrolan dienkripsi di server: tidak ada kunci perangkat baru. Kunci perangkat lama (bila browser ini masih
      // menyimpannya) hanya dipakai untuk membuka pesan end-to-end lama lalu memindahkannya ke enkripsi server.
      let k = kriptoDidukung() ? await muatKunci(this.ruangNama, saya.id).catch(() => null) : null;
      if (k && !saya.perangkat.some((p) => p.id === k!.id)) k = null;
      this.kunci = k;
      this.set({
        saya: { id: saya.id, nama: saya.nama, peran: saya.peran, jenis: saya.jenis },
        perangkat: k?.id ?? null,
        perangkatSaya: saya.perangkat,
        cadanganAda: saya.cadangan_ada,
        sarankanPulihkan: false,
        setelan: { ...AWAL.setelan, ...saya.setelan },
        lampiranMb: saya.lampiran_mb,
      });
      await this.muatRuang();
      this.set({ status: 'siap' });
      this.jalankanUmpan(saya.tunggu_maks);
      this.pasangSegarFokus();
    } catch (e) {
      this.set({ status: 'galat', galat: galatTeks(e) });
    }
  }

  berhenti() {
    this.lepasFokus?.();
    this.loop?.abort();
    this.loop = null;
    this.set({ terhubung: false });
  }

  /** Mulai ulang (mis. setelah memulihkan cadangan). */
  async ulang() {
    this.berhenti();
    this.kunciPublik.clear();
    this.set({ ...AWAL });
    await this.mulai();
  }

  // ---------------------------------------------------------------- kunci publik

  private kunciDari(pemilik: string[]): Promise<Record<string, KunciPublikPerangkat[]>> {
    const perlu = pemilik.filter((p) => !this.kunciPublik.has(p));
    if (perlu.length) {
      const muat = this.req<Record<string, KunciPublikPerangkat[]>>('GET', '/kunci', { query: { pemilik: perlu.join(',') } });
      perlu.forEach((p) => {
        const x = muat.then((r) => r[p] ?? []);
        x.catch(() => this.kunciPublik.delete(p));
        this.kunciPublik.set(p, x);
      });
    }
    return Promise.all(pemilik.map(async (p) => [p, await this.kunciPublik.get(p)!] as const)).then((l) => Object.fromEntries(l));
  }

  private async kunciTanda(pemilik: string, perangkat: string): Promise<string | null> {
    if (this.kunci && pemilik === this.s.saya?.id && perangkat === this.kunci.id) return publikRaw(this.kunci.tanda.publicKey);
    const daftar = (await this.kunciDari([pemilik]))[pemilik] ?? [];
    return daftar.find((d) => d.id === perangkat)?.kunci_tanda ?? null;
  }

  // ---------------------------------------------------------------- dekripsi

  private async buka(ruang: string, p: PesanServer): Promise<PesanObrolan> {
    const dasar: PesanObrolan = {
      id: p.id,
      uuid: p.uuid,
      pengirim: p.pengirim,
      perangkat: p.perangkat,
      dibuat_at: p.dibuat_at,
      kedaluwarsa_at: p.kedaluwarsa_at,
      status: 'terkirim',
    };
    if (p.dihapus) return { ...dasar, status: 'dihapus' };
    if (p.enkripsi === 'server') return p.isi ? { ...dasar, isi: p.isi, terverifikasi: true } : { ...dasar, status: 'tak_terbaca' };
    // Pesan end-to-end lama: hanya bisa dibuka browser yang masih memegang kunci perangkat lamanya.
    if (!this.kunci || !p.kunci) return { ...dasar, status: 'tak_terbaca' };
    const kunciTukarPengirim = kunciSusulan(p.kunci) ? ((await this.kunciDari([p.pengirim]).catch(() => ({}) as Record<string, KunciPublikPerangkat[]>))[p.pengirim] ?? []).map((d) => d.kunci_tukar) : [];
    const h = await dekripsiPesan(p, { ruang, saya: this.kunci!, kunciTandaPengirim: await this.kunciTanda(p.pengirim, p.perangkat).catch(() => null), kunciTukarPengirim });
    if (!h.ok) return { ...dasar, status: h.alasan === 'dihapus' ? 'dihapus' : 'tak_terbaca' };
    this.pindahkanKeServer(ruang, p, kunciTukarPengirim);
    return { ...dasar, isi: h.isi, terverifikasi: h.terverifikasi };
  }

  private dipindah = new Set<string>();

  /** Sekali per pesan, diam-diam: kirim kunci pesan lama agar SIAKAD menyimpannya terenkripsi server. */
  private pindahkanKeServer(ruang: string, p: PesanServer, kunciTukarPengirim: string[]) {
    if (!this.kunci || !p.kunci || !p.efemeral || this.dipindah.has(p.uuid)) return;
    this.dipindah.add(p.uuid);
    const kunci = this.kunci;
    void (async () => {
      const mentah = await kunciPesanMentah({ uuid: p.uuid, efemeral: p.efemeral!, kunci: p.kunci! }, kunci, kunciTukarPengirim);
      const baru = await this.req<PesanServer>('POST', `/ruang/${ruang}/pesan/${p.uuid}/pindah-server`, { body: { kunci: mentah } });
      if (baru.isi) {
        // Lampiran lama kini terenkripsi server: pakai isi dari server (tanpa kunci browser).
        this.urlBerkas.forEach((_, id) => baru.isi?.berkas?.some((b) => b.id === id) && this.urlBerkas.delete(id));
        this.setPesan(ruang, (x) => ({ ...x, daftar: x.daftar.map((q) => (q.uuid === p.uuid ? { ...q, isi: q.diubah ? { ...baru.isi!, isi: q.isi?.isi } : baru.isi! } : q)) }));
      }
    })().catch(() => {});
  }

  /** Terapkan reaksi dan suntingan ke pesan sasaran; keduanya tidak tampil sebagai gelembung sendiri. */
  private rapikan(daftar: PesanObrolan[]): PesanObrolan[] {
    const peta = new Map(daftar.map((p) => [p.uuid, p]));
    const tampil: PesanObrolan[] = [];
    for (const p of daftar) {
      const t = p.isi?.t;
      if ((t === 'reaksi' || t === 'ubah') && p.isi?.ke) {
        const sasaran = peta.get(p.isi.ke);
        if (sasaran && t === 'reaksi') {
          const r = { ...(sasaran.reaksi ?? {}) };
          for (const k of Object.keys(r)) r[k] = r[k].filter((x) => x !== p.pengirim);
          if (p.isi.emoji) r[p.isi.emoji] = [...(r[p.isi.emoji] ?? []), p.pengirim];
          for (const k of Object.keys(r)) if (!r[k].length) delete r[k];
          peta.set(sasaran.uuid, { ...sasaran, reaksi: r });
        } else if (sasaran && t === 'ubah' && sasaran.pengirim === p.pengirim && sasaran.isi) {
          peta.set(sasaran.uuid, { ...sasaran, isi: { ...sasaran.isi, isi: p.isi.isi }, diubah: true });
        }
        continue;
      }
      tampil.push(p);
    }
    return tampil.map((p) => peta.get(p.uuid) ?? p);
  }

  // ---------------------------------------------------------------- ruang

  async muatRuang() {
    const daftar = await this.req<RuangServer[]>('GET', '/ruang', { query: { perangkat: this.kunci?.id } });
    const ruang: Record<string, RuangObrolanData> = {};
    await Promise.all(
      daftar.map(async (r) => {
        ruang[r.id] = { ...r, pesan_terakhir: r.pesan_terakhir ? await this.buka(r.id, r.pesan_terakhir) : null };
      }),
    );
    this.set({ ruang, urutan: daftar.map((r) => r.id) });
  }

  private async segarkanRuang(id: string) {
    try {
      const r = await this.req<RuangServer>('GET', `/ruang/${id}`, { query: { perangkat: this.kunci?.id } });
      const lama = this.s.ruang[id];
      const terakhir = r.pesan_terakhir ? (lama?.pesan_terakhir?.id === r.pesan_terakhir.id && lama.pesan_terakhir.status !== 'menunggu' ? lama.pesan_terakhir : await this.buka(id, r.pesan_terakhir)) : null;
      this.pasangRuang({ ...r, pesan_terakhir: terakhir });
    } catch (e) {
      if ((e as { status?: number }).status === 404) this.buangRuang(id);
    }
  }

  private pasangRuang(r: RuangObrolanData) {
    this.set((s) => {
      const ruang = { ...s.ruang, [r.id]: r };
      const urutan = Object.values(ruang)
        .filter((x) => !x.arsip)
        .sort((a, b) => Number(b.sematkan) - Number(a.sematkan) || (b.pesan_terakhir_at ?? b.dibuat_at).localeCompare(a.pesan_terakhir_at ?? a.dibuat_at))
        .map((x) => x.id);
      return { ruang, urutan };
    });
  }

  private buangRuang(id: string) {
    this.set((s) => {
      const ruang = { ...s.ruang };
      delete ruang[id];
      return { ruang, urutan: s.urutan.filter((x) => x !== id) };
    });
  }

  /** Muat pesan ruang (terbaru). */
  async bukaRuang(id: string) {
    if (this.s.pesan[id]?.dimuat || this.s.pesan[id]?.memuat) return;
    this.setPesan(id, (x) => ({ ...x, memuat: true }));
    try {
      const r = await this.req<{ pesan: PesanServer[]; lagi: boolean }>('GET', `/ruang/${id}/pesan`, { query: { perangkat: this.kunci?.id, limit: 50 } });
      // Urut naik menurut id (server bisa mengirim urutan mana pun).
      const daftar = urutId(await Promise.all(r.pesan.map((p) => this.buka(id, p))));
      this.setPesan(id, () => ({ daftar, lagi: r.lagi, dimuat: true, memuat: false }));
    } catch (e) {
      this.setPesan(id, (x) => ({ ...x, memuat: false }));
      throw e;
    }
  }

  async muatLebihLama(id: string) {
    const x = this.s.pesan[id];
    if (!x?.lagi || x.memuat) return;
    const tertua = x.daftar.find((p) => p.id > 0)?.id;
    this.setPesan(id, (y) => ({ ...y, memuat: true }));
    try {
      const r = await this.req<{ pesan: PesanServer[]; lagi: boolean }>('GET', `/ruang/${id}/pesan`, { query: { perangkat: this.kunci?.id, sebelum: tertua, limit: 50 } });
      const lama = await Promise.all(r.pesan.map((p) => this.buka(id, p)));
      this.setPesan(id, (y) => ({ ...y, daftar: urutId([...lama, ...y.daftar.filter((q) => !lama.some((l) => l.uuid === q.uuid))]), lagi: r.lagi, memuat: false }));
    } catch {
      this.setPesan(id, (y) => ({ ...y, memuat: false }));
    }
  }

  private async muatBaru(id: string) {
    const x = this.s.pesan[id];
    if (!x?.dimuat) return;
    const terbaru = idTerbesar(x.daftar);
    const r = await this.req<{ pesan: PesanServer[]; lagi: boolean }>('GET', `/ruang/${id}/pesan`, { query: { perangkat: this.kunci?.id, setelah: terbaru, limit: 200 } });
    if (!r.pesan.length) return;
    const baru = await Promise.all(r.pesan.map((p) => this.buka(id, p)));
    this.setPesan(id, (y) => {
      const ada = new Map(y.daftar.map((p) => [p.uuid, p]));
      for (const p of baru) ada.set(p.uuid, p);
      return { ...y, daftar: [...ada.values()].sort((a, b) => (a.id || Infinity) - (b.id || Infinity)) };
    });
  }

  /** Muat ulang pesan terbaru ruang (mis. setelah kunci susulan tiba) tanpa membuang pesan yang sedang dikirim. */
  /** Ringkasan sebelum "Bersihkan obrolan": pesan dan lampiran yang masih terlihat untuk akun ini. */
  infoBersihkan(ruangId: string) {
    return this.req<{ pesan: number; lampiran: number; sudah_disimpan: number; tidak_bisa_disimpan: number }>('GET', `/ruang/${ruangId}/bersihkan`);
  }

  /**
   * Bersihkan riwayat obrolan hanya untuk akun ini (anggota lain tetap melihatnya). `simpan` = salin lampiran ke Berkas
   * saya › Obrolan/<nama obrolan> lebih dulu (di server). Tidak ada yang dihapus permanen.
   */
  async bersihkan(ruangId: string, simpan: boolean) {
    const r = await this.req<{ disimpan: number; dilewati: number }>('POST', `/ruang/${ruangId}/bersihkan`, { body: { simpan }, timeout: 300_000 });
    this.kosongkanLokal(ruangId);
    if (r.disimpan) invalidateSiakad('berkas');
    return r;
  }

  private kosongkanLokal(ruangId: string) {
    this.setPesan(ruangId, () => ({ daftar: [], lagi: false, dimuat: true, memuat: false }));
    const r = this.s.ruang[ruangId];
    if (r) this.pasangRuang({ ...r, pesan_terakhir: null, belum_dibaca: 0 });
  }

  private async muatUlangPesan(id: string) {
    const x = this.s.pesan[id];
    if (!x?.dimuat) return;
    const r = await this.req<{ pesan: PesanServer[]; lagi: boolean }>('GET', `/ruang/${id}/pesan`, { query: { perangkat: this.kunci?.id, limit: 50 } });
    const baru = await Promise.all(r.pesan.map((p) => this.buka(id, p)));
    this.setPesan(id, (y) => {
      const ada = new Map(y.daftar.map((p) => [p.uuid, p]));
      for (const p of baru) ada.set(p.uuid, p);
      return { ...y, daftar: [...ada.values()].sort((a, b) => (a.id || Infinity) - (b.id || Infinity)) };
    });
  }

  // ---------------------------------------------------------------- kunci susulan

  /**
   * Bungkus ulang kunci pesan kiriman saya untuk anggota yang baru mengaktifkan obrolan (belum punya kunci saat pesan
   * dikirim). Dijalankan saat mesin mulai dan setiap kali kontak mendaftarkan perangkat. Server tidak pernah melihat
   * kunci pesan; ia hanya menyimpan hasil bungkusan untuk perangkat tujuan.
   */
  private susulkan() {
    if (this.susulanJalan) {
      this.susulanLagi = true;
      return;
    }
    this.susulanJalan = (async () => {
      for (let putaran = 0; putaran < 5 && this.kunci; putaran++) {
        this.susulanLagi = false;
        const daftar = await this.req<Array<{ uuid: string; efemeral: string; kunci: string; tujuan: Array<{ id: string; kunci_tukar: string }> }>>('GET', '/susulan', {
          query: { perangkat: this.kunci?.id },
        });
        if (!daftar.length) break;
        const kunci: Array<{ pesan: string; perangkat: string; kunci: string }> = [];
        for (const p of daftar) {
          const hasil = await bungkusSusulan(p, { saya: this.kunci, tujuan: p.tujuan }).catch(() => ({}) as Record<string, string>);
          for (const [perangkat, k] of Object.entries(hasil)) kunci.push({ pesan: p.uuid, perangkat, kunci: k });
        }
        if (!kunci.length) break;
        const r = await this.req<{ disimpan: number }>('POST', '/susulan', { body: { perangkat: this.kunci?.id, kunci } });
        if (!r.disimpan && !this.susulanLagi) break;
      }
    })()
      .catch(() => {})
      .finally(() => {
        this.susulanJalan = null;
        if (this.susulanLagi) {
          this.susulanLagi = false;
          this.susulkan();
        }
      });
  }

  private setPesan(id: string, fn: (x: KeadaanObrolan['pesan'][string]) => KeadaanObrolan['pesan'][string]) {
    this.set((s) => ({ pesan: { ...s.pesan, [id]: fn(s.pesan[id] ?? { daftar: [], lagi: false, dimuat: false, memuat: false }) } }));
  }

  /** Daftar pesan siap tampil (reaksi dan suntingan sudah diterapkan, pesan kedaluwarsa disembunyikan). */
  pesanTampil(id: string): PesanObrolan[] {
    const x = this.s.pesan[id];
    if (!x) return [];
    const kini = Date.now();
    return this.rapikan(x.daftar).filter((p) => !p.kedaluwarsa_at || Date.parse(p.kedaluwarsa_at.replace(' ', 'T')) > kini);
  }

  // ---------------------------------------------------------------- kirim

  private async kirimIsi(ruangId: string, isi: IsiPesan, lampiran: string[] = [], uuid = uuidAcak()): Promise<void> {
    const ruang = this.s.ruang[ruangId];
    const saya = this.s.saya;
    if (!ruang || !saya) throw new Error('Obrolan belum siap.');
    const tampil = isi.t !== 'reaksi' && isi.t !== 'ubah';
    const sementara: PesanObrolan = {
      id: 0,
      uuid,
      pengirim: saya.id,
      perangkat: '',
      dibuat_at: new Date().toISOString(),
      kedaluwarsa_at: null,
      status: 'mengirim',
      isi,
      terverifikasi: true,
    };
    this.setPesan(ruangId, (x) => ({ ...x, daftar: [...x.daftar.filter((p) => p.uuid !== uuid), sementara] }));
    try {
      // Isi dikirim lewat HTTPS dan dienkripsi SIAKAD dengan kunci ruang sebelum disimpan.
      const hasil = await this.req<PesanServer>('POST', `/ruang/${ruangId}/pesan`, { body: { uuid, isi, lampiran } });
      const jadi: PesanObrolan = { ...sementara, id: hasil.id, dibuat_at: hasil.dibuat_at, kedaluwarsa_at: hasil.kedaluwarsa_at, status: 'terkirim' };
      this.setPesan(ruangId, (x) => ({ ...x, daftar: x.daftar.map((p) => (p.uuid === uuid ? jadi : p)) }));
      if (tampil) {
        const r = this.s.ruang[ruangId];
        if (r) this.pasangRuang({ ...r, pesan_terakhir: jadi, pesan_terakhir_at: hasil.dibuat_at, dibaca_sampai: hasil.id, arsip: false });
      }
    } catch (e) {
      const galat = galatTeks(e);
      this.setPesan(ruangId, (x) => ({ ...x, daftar: x.daftar.map((p) => (p.uuid === uuid ? { ...p, status: 'gagal', galat } : p)) }));
      throw new Error(galat);
    }
  }

  kirimTeks(ruangId: string, teks: string, balas?: PesanObrolan): Promise<void> {
    const isi: IsiPesan = { v: 1, t: 'teks', isi: teks };
    if (balas?.isi) {
      isi.ke = balas.uuid;
      isi.kutip = { pengirim: balas.pengirim, isi: (balas.isi.isi ?? balas.isi.berkas?.map((b) => b.nama).join(', ') ?? '').slice(0, 160) };
    }
    return this.kirimIsi(ruangId, isi);
  }

  /** Kirim ulang pesan yang gagal dengan uuid yang sama (aman bila ternyata sudah sampai). */
  kirimUlang(ruangId: string, p: PesanObrolan): Promise<void> {
    if (!p.isi) return Promise.resolve();
    return this.kirimIsi(ruangId, p.isi, p.isi.berkas?.map((b) => b.id) ?? [], p.uuid);
  }

  buangGagal(ruangId: string, uuid: string) {
    this.setPesan(ruangId, (x) => ({ ...x, daftar: x.daftar.filter((p) => p.uuid !== uuid || p.status !== 'gagal') }));
  }

  async kirimBerkas(ruangId: string, files: File[], keterangan = '', balas?: PesanObrolan): Promise<void> {
    const maks = this.s.lampiranMb * 1048576;
    const besar = files.find((f) => f.size > maks);
    if (besar) throw new Error(`${besar.name} lebih dari ${this.s.lampiranMb} MB.`);
    const berkas: NonNullable<IsiPesan['berkas']> = [];
    for (const f of files.slice(0, 10)) {
      // Isi asli diunggah lewat HTTPS; SIAKAD mengenkripsinya dengan kunci ruang sebelum disimpan.
      const r = await this.req<{ id: string }>('POST', `/ruang/${ruangId}/lampiran`, {
        body: { berkas: { data: f, filename: 'lampiran.bin', contentType: 'application/octet-stream' }, enkripsi: 'server' },
        multipart: true,
        timeout: 300_000,
      });
      const ukur = f.type.startsWith('image/') ? await ukuranGambar(f) : null;
      berkas.push({ id: r.id, nama: f.name, mime: f.type || 'application/octet-stream', ukuran: f.size, ...(ukur ?? {}) });
    }
    const isi: IsiPesan = { v: 1, t: 'berkas', berkas, isi: keterangan || undefined };
    if (balas?.isi) {
      isi.ke = balas.uuid;
      isi.kutip = { pengirim: balas.pengirim, isi: (balas.isi.isi ?? '').slice(0, 160) };
    }
    return this.kirimIsi(
      ruangId,
      isi,
      berkas.map((b) => b.id),
    );
  }

  reaksi(ruangId: string, p: PesanObrolan, emoji: string): Promise<void> {
    const saya = this.s.saya?.id ?? '';
    const sudah = p.reaksi?.[emoji]?.includes(saya);
    return this.kirimIsi(ruangId, { v: 1, t: 'reaksi', ke: p.uuid, emoji: sudah ? '' : emoji });
  }

  ubahPesan(ruangId: string, p: PesanObrolan, teks: string): Promise<void> {
    return this.kirimIsi(ruangId, { v: 1, t: 'ubah', ke: p.uuid, isi: teks });
  }

  async hapusPesan(ruangId: string, p: PesanObrolan) {
    await this.req('POST', `/ruang/${ruangId}/pesan/${p.uuid}/hapus`);
    this.setPesan(ruangId, (x) => ({ ...x, daftar: x.daftar.map((q) => (q.uuid === p.uuid ? { ...q, status: 'dihapus', isi: undefined } : q)) }));
  }

  private infoBerkas: Promise<InfoBerkas> | null = null;

  /** Folder tujuan salinan lampiran di Berkas saya: "Obrolan/<nama obrolan atau orang>". */
  folderBerkas(ruangId: string): string {
    const r = this.s.ruang[ruangId];
    return `Obrolan/${rapikanSegmen(r ? judulRuang(r, this.s.saya?.id ?? '') : 'Obrolan')}`;
  }

  /**
   * Salin berkas ke Berkas saya › Obrolan/<nama obrolan>. Lampiran didekripsi di browser lalu diunggah biasa ke
   * /v1/berkas, jadi salinannya TIDAK lagi terenkripsi end-to-end (ikut aturan ruang pribadi manajer berkas).
   */
  async simpanKeBerkas(ruangId: string, berkas: Array<File | NonNullable<IsiPesan['berkas']>[number]>): Promise<{ folder: string; jumlah: number }> {
    const folder = this.folderBerkas(ruangId);
    if (!this.infoBerkas) {
      this.infoBerkas = this.siakad.request<InfoBerkas>({ method: 'GET', path: '/v1/berkas/info' }).then((x) => x.data);
      this.infoBerkas.catch(() => (this.infoBerkas = null));
    }
    const info = await this.infoBerkas;
    let jumlah = 0;
    try {
      for (const b of berkas) {
        const f = b instanceof File ? b : new File([await (await fetch(await this.unduhBerkas(b))).blob()], b.nama, { type: b.mime });
        if (f.size > info.maks_byte) throw new Error(`${f.name} lebih dari batas Berkas saya (${Math.floor(info.maks_byte / 1048576)} MB).`);
        await unggahKeBerkas(this.siakad, info, f, { folder });
        jumlah++;
      }
    } finally {
      if (jumlah) invalidateSiakad('berkas');
    }
    return { folder, jumlah };
  }

  /** URL objek (blob:) berkas lampiran yang sudah didekripsi. */
  unduhBerkas(b: NonNullable<IsiPesan['berkas']>[number]): Promise<string> {
    let u = this.urlBerkas.get(b.id);
    if (!u) {
      u = (async () => {
        const r = await this.siakad.request<{ bytes: Uint8Array<ArrayBuffer> } | ArrayBuffer>({ method: 'GET', path: `${P}/lampiran/${b.id}` }, { timeout: 300_000 });
        const d = r.data as unknown;
        const bytes = d instanceof ArrayBuffer ? new Uint8Array(d) : d instanceof Blob ? new Uint8Array(await d.arrayBuffer()) : (d as { bytes: Uint8Array }).bytes;
        // Lampiran lama (dienkripsi browser) masih perlu dibuka di sini; lampiran baru sudah dibuka SIAKAD.
        const buka = b.kunci && b.iv ? await dekripsiBerkas(new Uint8Array(bytes) as Uint8Array<ArrayBuffer>, b.kunci, b.iv) : bytes;
        return URL.createObjectURL(new Blob([buka as BlobPart], { type: b.mime }));
      })();
      u.catch(() => this.urlBerkas.delete(b.id));
      this.urlBerkas.set(b.id, u);
    }
    return u;
  }

  // ---------------------------------------------------------------- baca & ketik

  tandaiBaca(ruangId: string) {
    const r = this.s.ruang[ruangId];
    const x = this.s.pesan[ruangId];
    if (!r || !x) return;
    const terakhir = idTerbesar(x.daftar);
    if (terakhir <= r.dibaca_sampai && r.belum_dibaca === 0) return;
    this.pasangRuang({ ...r, dibaca_sampai: Math.max(terakhir, r.dibaca_sampai), belum_dibaca: 0 });
    clearTimeout(this.bacaTimer.get(ruangId));
    this.bacaTimer.set(
      ruangId,
      setTimeout(() => void this.req('POST', `/ruang/${ruangId}/tandai`, { body: { dibaca: terakhir } }).catch(() => {}), 400),
    );
  }

  ketik(ruangId: string) {
    const t = this.ketikTerakhir.get(ruangId) ?? 0;
    if (Date.now() - t < 3500) return;
    this.ketikTerakhir.set(ruangId, Date.now());
    void this.req('POST', `/ruang/${ruangId}/ketik`).catch(() => {});
  }

  // ---------------------------------------------------------------- kelola ruang

  async mulaiLangsung(pemilik: string): Promise<string> {
    await this.mulai();
    const r = await this.req<RuangServer>('POST', '/ruang', { body: { jenis: 'langsung', dengan: pemilik, perangkat: this.kunci?.id } });
    this.pasangRuang({ ...r, pesan_terakhir: r.pesan_terakhir ? await this.buka(r.id, r.pesan_terakhir) : null });
    return r.id;
  }

  async buatGrup(judul: string, anggota: string[]): Promise<string> {
    await this.mulai();
    const r = await this.req<RuangServer>('POST', '/ruang', { body: { jenis: 'grup', judul, anggota, perangkat: this.kunci?.id } });
    this.pasangRuang({ ...r, pesan_terakhir: null });
    return r.id;
  }

  async ubahRuang(id: string, ubah: Partial<Pick<RuangObrolanData, 'judul' | 'kedaluwarsa_detik' | 'bisu' | 'arsip' | 'sematkan'>>) {
    await this.req('POST', `/ruang/${id}/ubah`, { body: ubah });
    const r = this.s.ruang[id];
    if (r) {
      if (ubah.arsip) this.set((s) => ({ ruang: { ...s.ruang, [id]: { ...r, ...ubah } as RuangObrolanData }, urutan: s.urutan.filter((x) => x !== id) }));
      else this.pasangRuang({ ...r, ...ubah } as RuangObrolanData);
    }
  }

  async tambahAnggota(id: string, pemilik: string[]) {
    await this.req('POST', `/ruang/${id}/anggota`, { body: { tambah: pemilik } });
    await this.segarkanRuang(id);
  }

  async keluarkan(id: string, pemilik: string) {
    await this.req('POST', `/ruang/${id}/anggota/keluarkan`, { body: { pemilik } });
    await this.segarkanRuang(id);
  }

  async aturAdmin(id: string, pemilik: string, admin: boolean) {
    await this.req('POST', `/ruang/${id}/anggota/admin`, { body: { pemilik, admin } });
    await this.segarkanRuang(id);
  }

  async keluarGrup(id: string) {
    await this.req('POST', `/ruang/${id}/keluar`);
    this.buangRuang(id);
  }

  async muatArsip(): Promise<RuangObrolanData[]> {
    const d = await this.req<RuangServer[]>('GET', '/ruang', { query: { perangkat: this.kunci?.id, arsip: 1 } });
    const hasil = await Promise.all(d.map(async (r) => ({ ...r, pesan_terakhir: r.pesan_terakhir ? await this.buka(r.id, r.pesan_terakhir) : null })));
    // Disimpan di peta ruang (tanpa masuk urutan) agar ruang arsip bisa dibuka.
    this.set((s) => ({ ruang: { ...s.ruang, ...Object.fromEntries(hasil.map((r) => [r.id, r])) } }));
    return hasil;
  }

  cariPengguna(q: string, level?: string, signal?: AbortSignal): Promise<OrangObrolan[]> {
    return this.req<OrangObrolan[]>('GET', '/pengguna', { query: { q: q || undefined, level, limit: 30 }, signal });
  }

  // ---------------------------------------------------------------- keamanan & privasi

  async nomorKeamanan(pemilik: string): Promise<string[]> {
    const saya = this.s.saya!.id;
    this.kunciPublik.delete(pemilik);
    this.kunciPublik.delete(saya);
    const k = await this.kunciDari([saya, pemilik]);
    this.set((s) => {
      const kb = { ...s.kunciBerubah };
      delete kb[pemilik];
      return { kunciBerubah: kb };
    });
    return nomorKeamanan({ id: saya, sidik: k[saya].map((d) => d.sidik) }, { id: pemilik, sidik: k[pemilik].map((d) => d.sidik) });
  }

  async simpanSetelan(ubah: Partial<KeadaanObrolan['setelan']>) {
    const s = await this.req<KeadaanObrolan['setelan']>('POST', '/setelan', { body: ubah });
    this.set({ setelan: { ...AWAL.setelan, ...s } });
  }

  async muatPerangkat() {
    const d = await this.req<PerangkatObrolan[]>('GET', '/perangkat');
    this.set({ perangkatSaya: d });
  }

  async cabutPerangkat(id: string) {
    await this.req('POST', `/perangkat/${id}/cabut`);
    if (id === this.kunci?.id) {
      await hapusKunci(this.ruangNama, this.s.saya!.id);
      await this.ulang();
      return;
    }
    await this.muatPerangkat();
  }

  async simpanCadanganKunci(sandi: string) {
    if (!this.kunci) throw new Error('Obrolan belum siap.');
    await this.req('POST', '/cadangan', { body: await buatCadangan(this.kunci, sandi) });
    this.set({ cadanganAda: true, sarankanPulihkan: false });
  }

  async hapusCadanganKunci() {
    await this.req('POST', '/cadangan/hapus');
    this.set({ cadanganAda: false, sarankanPulihkan: false });
  }

  /**
   * Pulihkan kunci dari cadangan: perangkat ini memakai kunci perangkat lama, sehingga pesan lama terbaca. Perangkat
   * baru yang dibuat otomatis di browser ini dicabut.
   */
  async pulihkan(sandi: string) {
    const c = await this.req<{ data: string; salt: string; iterasi: number }>('GET', '/cadangan');
    const k = await bukaCadangan(c, sandi);
    const saya = this.s.saya!.id;
    if (k.pemilik !== saya) throw new Error('Cadangan ini milik akun lain.');
    const aktif = await this.req<PerangkatObrolan[]>('GET', '/perangkat');
    if (!aktif.some((p) => p.id === k.id)) throw new Error('Perangkat di cadangan ini sudah dicabut. Buat cadangan baru dari perangkat yang masih aktif.');
    const lama = this.kunci;
    await simpanKunci(this.ruangNama, k);
    if (lama && lama.id !== k.id) await this.req('POST', `/perangkat/${lama.id}/cabut`).catch(() => {});
    await this.ulang();
  }

  abaikanPulihkan() {
    this.set({ sarankanPulihkan: false });
  }

  async blokir(pemilik: string, blokir: boolean) {
    await this.req('POST', '/blokir', { body: { pemilik, blokir } });
  }

  daftarBlokir(): Promise<Array<{ id: string; nama: string; peran: string }>> {
    return this.req('GET', '/blokir');
  }

  // ---------------------------------------------------------------- umpan realtime

  private lepasFokus: (() => void) | null = null;
  private segarTerakhir = 0;

  /**
   * Status baca disimpan per akun di server. Aplikasi lain (akun sama) memberi tahu lewat peristiwa `baca`; bila
   * peristiwa terlewat (tab di latar, koneksi putus), jumlah belum dibaca disegarkan dari server saat tab dilihat lagi.
   */
  private pasangSegarFokus() {
    if (this.lepasFokus || typeof window === 'undefined') return;
    const segar = () => {
      if (document.visibilityState !== 'visible' || Date.now() - this.segarTerakhir < 3000) return;
      this.segarTerakhir = Date.now();
      void this.muatRuang().catch(() => {});
    };
    document.addEventListener('visibilitychange', segar);
    window.addEventListener('focus', segar);
    this.lepasFokus = () => {
      document.removeEventListener('visibilitychange', segar);
      window.removeEventListener('focus', segar);
      this.lepasFokus = null;
    };
  }

  private jalankanUmpan(tungguMaks: number) {
    this.loop?.abort();
    const ac = new AbortController();
    this.loop = ac;
    const tunggu = Math.min(25, tungguMaks);
    void (async () => {
      let sejak: number | null = null;
      let jeda = 1000;
      while (!ac.signal.aborted) {
        try {
          const r: { sejak: number; peristiwa: Array<{ id: number; jenis: string; data: Record<string, unknown> }> } = await this.req('GET', '/peristiwa', {
            query: sejak === null ? { perangkat: this.kunci?.id } : { sejak, tunggu, perangkat: this.kunci?.id },
            signal: ac.signal,
            timeout: (tunggu + 15) * 1000,
          });
          if (!this.s.terhubung) this.set({ terhubung: true });
          const awal = sejak === null;
          sejak = r.sejak;
          jeda = 1000;
          if (!awal && r.peristiwa.length) await this.olah(r.peristiwa);
          if (tunggu === 0 || awal) await tidur(tunggu === 0 ? 4000 : 50, ac.signal);
        } catch (e) {
          if (ac.signal.aborted) return;
          this.set({ terhubung: false });
          await tidur(jeda, ac.signal);
          jeda = Math.min(30_000, jeda * 2);
        }
      }
    })();
  }

  private async olah(daftar: Array<{ jenis: string; data: Record<string, unknown> }>) {
    const segarkan = new Set<string>();
    const muatBaru = new Set<string>();
    const muatUlang = new Set<string>();
    for (const e of daftar) {
      const ruang = e.data.ruang as string | undefined;
      switch (e.jenis) {
        case 'pesan': {
          if (!ruang) break;
          if (e.data.perangkat === this.kunci?.id) break;
          this.hapusKetik(ruang, e.data.pengirim as string);
          if (this.s.pesan[ruang]?.dimuat) muatBaru.add(ruang);
          segarkan.add(ruang);
          break;
        }
        case 'hapus':
          if (ruang) {
            this.setPesan(ruang, (x) => ({ ...x, daftar: x.daftar.map((p) => (p.id === e.data.id ? { ...p, status: 'dihapus', isi: undefined } : p)) }));
            segarkan.add(ruang);
          }
          break;
        case 'baca': {
          const r = ruang ? this.s.ruang[ruang] : undefined;
          if (!r) break;
          const pemilik = e.data.pemilik as string;
          if (pemilik === this.s.saya?.id) {
            if (typeof e.data.dibaca_sampai === 'number') this.pasangRuang({ ...r, dibaca_sampai: Math.max(r.dibaca_sampai, e.data.dibaca_sampai), belum_dibaca: 0 });
          } else {
            this.pasangRuang({
              ...r,
              anggota: r.anggota.map((a) =>
                a.id === pemilik
                  ? {
                      ...a,
                      dibaca_sampai: typeof e.data.dibaca_sampai === 'number' ? e.data.dibaca_sampai : a.dibaca_sampai,
                      diterima_sampai: typeof e.data.diterima_sampai === 'number' ? e.data.diterima_sampai : a.diterima_sampai,
                    }
                  : a,
              ),
            });
          }
          break;
        }
        case 'ketik':
          if (ruang) this.setKetik(ruang, e.data.pemilik as string);
          break;
        case 'ruang':
          if (ruang && e.data.bersih) this.kosongkanLokal(ruang);
          if (ruang) segarkan.add(ruang);
          else if (e.data.aksi === 'blokir') void this.muatRuang();
          break;
        case 'perangkat': {
          const p = e.data.pemilik as string;
          this.kunciPublik.delete(p);
          if (p === this.s.saya?.id) {
            void this.muatPerangkat().catch(() => {});
            break;
          }
          // Kontak yang baru pertama kali mengaktifkan obrolan bukan "kunci berubah": cukup perbarui status dan
          // susulkan kunci pesan yang sudah dikirim kepadanya.
          const ruangnya = Object.values(this.s.ruang).filter((r) => r.anggota.some((a) => a.id === p));
          const pertama = ruangnya.length > 0 && ruangnya.every((r) => r.anggota.some((a) => a.id === p && !a.punya_kunci));
          if (!pertama) this.set((s) => ({ kunciBerubah: { ...s.kunciBerubah, [p]: true } }));
          ruangnya.forEach((r) => segarkan.add(r.id));
          this.susulkan();
          break;
        }
        case 'kunci':
          if (ruang) {
            muatUlang.add(ruang);
            segarkan.add(ruang);
          }
          break;
      }
    }
    await Promise.all([...muatBaru].map((r) => this.muatBaru(r).catch(() => {})));
    await Promise.all([...muatUlang].map((r) => this.muatUlangPesan(r).catch(() => {})));
    await Promise.all([...segarkan].map((r) => this.segarkanRuang(r)));
  }

  private setKetik(ruang: string, pemilik: string) {
    this.set((s) => ({ ketik: { ...s.ketik, [ruang]: { ...(s.ketik[ruang] ?? {}), [pemilik]: Date.now() } } }));
    setTimeout(() => {
      const t = this.s.ketik[ruang]?.[pemilik];
      if (t && Date.now() - t >= 5000) this.hapusKetik(ruang, pemilik);
    }, 5200);
  }

  private hapusKetik(ruang: string, pemilik: string) {
    if (!this.s.ketik[ruang]?.[pemilik]) return;
    this.set((s) => {
      const k = { ...(s.ketik[ruang] ?? {}) };
      delete k[pemilik];
      return { ketik: { ...s.ketik, [ruang]: k } };
    });
  }
}

function tidur(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((ok) => {
    const t = setTimeout(ok, ms);
    signal.addEventListener('abort', () => (clearTimeout(t), ok()), { once: true });
  });
}

function ukuranGambar(f: File): Promise<{ lebar: number; tinggi: number } | null> {
  return new Promise((ok) => {
    const u = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => (ok({ lebar: img.naturalWidth, tinggi: img.naturalHeight }), URL.revokeObjectURL(u));
    img.onerror = () => (ok(null), URL.revokeObjectURL(u));
    img.src = u;
  });
}

const mesin = new WeakMap<Siakad, MesinObrolan>();
/** Mesin obrolan (percakapan, pesan, unggah lampiran, status baca) untuk satu klien SDK; satu instans per klien dipakai ulang oleh semua komponen obrolan. */
export function mesinObrolan(siakad: Siakad): MesinObrolan {
  let m = mesin.get(siakad);
  if (!m) {
    m = new MesinObrolan(siakad);
    mesin.set(siakad, m);
  }
  return m;
}
