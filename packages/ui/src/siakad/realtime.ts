'use client';
import * as React from 'react';
import type { Siakad } from 'unipo-siakad-sdk';
import { useOptionalSiakad } from './provider';

// ================================================================ Realtime (WebSocket) bersama obrolan dan notifikasi
//
// Satu koneksi WebSocket per klien SDK (per tab), dipakai bersama panel obrolan dan lonceng notifikasi. Server WebSocket
// berprotokol Pusher (Soketi, Laravel Reverb, Pusher Channels) diatur di Pustikom » Integrasi » Realtime; konfigurasi
// publiknya diambil dari SIAKAD lewat BFF aplikasi (GET /v1/notif/realtime), bukan dari build.
//
// Isi sinyal hanya jenisnya ("obrolan" atau "notif"): pendengar mengambil datanya sendiri lewat API biasa. Bila
// integrasi tidak aktif, server WebSocket tidak terjangkau, atau langganan ditolak, status = 'mati'/'cadangan' dan
// pemakai tetap memakai long-poll/polling seperti sebelumnya. Sambung ulang otomatis dengan jeda bertambah (1 dtk s.d.
// 60 dtk + acak). docs/REALTIME.md di repo siakad_unipo.

/** mati = integrasi tidak aktif (long-poll); menyambung; tersambung = WebSocket siap; cadangan = terputus, long-poll sambil menyambung ulang. */
export type StatusRealtime = 'mati' | 'menyambung' | 'tersambung' | 'cadangan';
export type JenisSinyal = 'obrolan' | 'notif';

export interface KonfigurasiRealtime {
  aktif: boolean;
  driver?: string;
  key?: string;
  host?: string;
  port?: number;
  tls?: boolean;
  cluster?: string;
  kanal?: string;
  event?: string;
  cadangan_detik?: number;
}

const JENIS: JenisSinyal[] = ['obrolan', 'notif'];
const JEDA_MAKS = 60_000;
/** Konfigurasi ditanyakan ulang sesekali saat integrasi tidak aktif (admin bisa mengaktifkannya kapan saja). */
const CEK_ULANG_MATI = 5 * 60_000;

const tidur = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((ok) => {
    const t = setTimeout(ok, ms);
    signal?.addEventListener('abort', () => (clearTimeout(t), ok()), { once: true });
  });

export class KlienRealtime {
  private _status: StatusRealtime = 'mati';
  private pendengarStatus = new Set<() => void>();
  private pendengarSinyal = new Map<JenisSinyal, Set<() => void>>();
  private hitung: Record<JenisSinyal, number> = { obrolan: 0, notif: 0 };
  private pemakai = 0;
  private hentiTimer: ReturnType<typeof setTimeout> | null = null;
  private jalan: AbortController | null = null;
  private ws: WebSocket | null = null;
  private percobaan = 0;
  private detakTimer: ReturnType<typeof setInterval> | null = null;
  private terakhirTerima = 0;
  private pingDikirim = 0;
  /** Jeda polling cadangan (ms) saat tersambung: penjaga bila ada sinyal yang terlewat. */
  cadanganMs = 60_000;

  constructor(private siakad: Siakad) {}

  get status(): StatusRealtime {
    return this._status;
  }
  /** WebSocket tersambung dan kanal pengguna sudah dilanggani. */
  get siap(): boolean {
    return this._status === 'tersambung';
  }

  private setStatus(s: StatusRealtime) {
    if (s === this._status) return;
    this._status = s;
    this.pendengarStatus.forEach((f) => f());
  }

  /** Dengarkan perubahan status. */
  langgan = (fn: () => void): (() => void) => {
    this.pendengarStatus.add(fn);
    return () => this.pendengarStatus.delete(fn);
  };

  /** Dengarkan sinyal satu jenis (juga dipanggil sekali setiap kali tersambung, untuk menyusul yang terlewat). */
  dengar(jenis: JenisSinyal, fn: () => void): () => void {
    let s = this.pendengarSinyal.get(jenis);
    if (!s) this.pendengarSinyal.set(jenis, (s = new Set()));
    s.add(fn);
    return () => s!.delete(fn);
  }

  /** Penghitung sinyal per jenis (untuk `tunggu` tanpa kehilangan sinyal yang datang di antara dua panggilan). */
  hitungan(jenis: JenisSinyal): number {
    return this.hitung[jenis];
  }

  /**
   * Tunggu sinyal `jenis` sesudah penghitung `sejak`, perubahan status, atau `ms` habis (mana yang lebih dulu).
   * Langsung selesai bila sudah ada sinyal baru sejak `sejak`.
   */
  tunggu(jenis: JenisSinyal, sejak: number, ms: number, signal?: AbortSignal): Promise<'sinyal' | 'status' | 'waktu'> {
    if (this.hitung[jenis] !== sejak) return Promise.resolve('sinyal');
    return new Promise((ok) => {
      const selesai = (h: 'sinyal' | 'status' | 'waktu') => {
        clearTimeout(t);
        lepasS();
        lepasT();
        signal?.removeEventListener('abort', batal);
        ok(h);
      };
      const batal = () => selesai('waktu');
      const t = setTimeout(() => selesai('waktu'), ms);
      const lepasS = this.dengar(jenis, () => selesai('sinyal'));
      const lepasT = this.langgan(() => selesai('status'));
      signal?.addEventListener('abort', batal, { once: true });
    });
  }

  /** Komponen pemakai memanggil ini saat terpasang; koneksi ditutup 30 detik setelah pemakai terakhir lepas. */
  pakai(): () => void {
    this.pemakai++;
    if (this.hentiTimer) {
      clearTimeout(this.hentiTimer);
      this.hentiTimer = null;
    }
    if (!this.jalan) this.mulai();
    let lepas = false;
    return () => {
      if (lepas) return;
      lepas = true;
      this.pemakai--;
      if (this.pemakai <= 0) this.hentiTimer = setTimeout(() => this.berhenti(), 30_000);
    };
  }

  private mulai() {
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return;
    const ac = new AbortController();
    this.jalan = ac;
    void this.putaran(ac.signal);
  }

  berhenti() {
    this.jalan?.abort();
    this.jalan = null;
    this.tutup();
    this.setStatus('mati');
  }

  private tutup() {
    if (this.detakTimer) clearInterval(this.detakTimer);
    this.detakTimer = null;
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
      try {
        ws.close();
      } catch {
        /* abaikan */
      }
    }
  }

  /** Jeda sambung ulang: 1, 2, 4, ... detik sampai 60 detik, ditambah acak agar banyak tab tidak menyerbu bersamaan. */
  private jeda(): number {
    const dasar = Math.min(JEDA_MAKS, 1000 * 2 ** Math.min(this.percobaan, 6));
    this.percobaan++;
    return dasar / 2 + Math.random() * (dasar / 2);
  }

  private async putaran(signal: AbortSignal) {
    while (!signal.aborted) {
      let k: KonfigurasiRealtime;
      try {
        const r = await this.siakad.request<KonfigurasiRealtime>({ method: 'GET', path: '/v1/notif/realtime' }, { signal, maxRetries: 0, timeout: 15_000 });
        k = r.data ?? { aktif: false };
      } catch (e) {
        if (signal.aborted) return;
        const kode = Number((e as { status?: number })?.status);
        // SIAKAD/BFF lama tanpa endpoint ini, atau token tanpa izin notifikasi: tetap long-poll.
        if ([401, 403, 404].includes(kode)) {
          this.setStatus('mati');
          await tidur(CEK_ULANG_MATI, signal);
        } else {
          this.setStatus(this._status === 'mati' ? 'mati' : 'cadangan');
          await tidur(this.jeda(), signal);
        }
        continue;
      }
      if (!k.aktif || !k.key || !k.host || !k.kanal) {
        this.setStatus('mati');
        await tidur(CEK_ULANG_MATI, signal);
        continue;
      }
      if (k.cadangan_detik) this.cadanganMs = Math.max(15, k.cadangan_detik) * 1000;
      if (this._status !== 'cadangan') this.setStatus('menyambung');
      const alasan = await this.sambung(k, signal);
      if (signal.aborted) return;
      this.setStatus('cadangan');
      // Kunci aplikasi salah / aplikasi dimatikan di server (kode 4000-4099): jangan menyerbu, tanya konfigurasi lagi nanti.
      await tidur(alasan === 'tolak' ? CEK_ULANG_MATI : this.jeda(), signal);
    }
  }

  /** Satu sesi koneksi; selesai saat koneksi putus. */
  private sambung(k: KonfigurasiRealtime, signal: AbortSignal): Promise<'putus' | 'tolak'> {
    return new Promise((selesai) => {
      const port = k.port ?? (k.tls === false ? 80 : 443);
      const url = `${k.tls === false ? 'ws' : 'wss'}://${k.host}:${port}/app/${encodeURIComponent(k.key!)}?protocol=7&client=unipo-ui&version=1.0&flash=false`;
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        selesai('putus');
        return;
      }
      this.ws = ws;
      let hasil: 'putus' | 'tolak' = 'putus';
      // Selama tersambung, konfigurasi diperiksa ulang tiap 5 menit: penyedia dinonaktifkan/diganti di Pustikom =
      // koneksi ditutup lalu putaran membaca konfigurasi baru (mis. kembali ke long-poll).
      const periksa = setInterval(() => {
        void this.siakad
          .request<KonfigurasiRealtime>({ method: 'GET', path: '/v1/notif/realtime' }, { signal, maxRetries: 0, timeout: 15_000 })
          .then((r) => {
            const b = r.data;
            if (!b?.aktif || b.kanal !== k.kanal || b.key !== k.key || b.host !== k.host || b.port !== k.port) ws.close();
          })
          .catch(() => {});
      }, CEK_ULANG_MATI);
      const akhiri = () => {
        clearInterval(periksa);
        signal.removeEventListener('abort', akhiri);
        if (this.ws === ws) this.tutup();
        selesai(hasil);
      };
      signal.addEventListener('abort', akhiri, { once: true });
      const kirim = (event: string, data: unknown) => {
        try {
          ws.send(JSON.stringify({ event, data }));
        } catch {
          /* koneksi sudah tutup */
        }
      };
      ws.onclose = (e) => {
        if (e.code >= 4000 && e.code < 4100) hasil = 'tolak';
        akhiri();
      };
      ws.onerror = () => {
        /* onclose menyusul */
      };
      ws.onmessage = (m) => {
        this.terakhirTerima = Date.now();
        let pesan: { event?: string; channel?: string; data?: unknown };
        try {
          pesan = JSON.parse(String(m.data));
        } catch {
          return;
        }
        const data = typeof pesan.data === 'string' ? (() => { try { return JSON.parse(pesan.data as string); } catch { return pesan.data; } })() : pesan.data;
        switch (pesan.event) {
          case 'pusher:connection_established': {
            const d = data as { socket_id?: string; activity_timeout?: number };
            this.pasangDetak(ws, Math.min(120, Math.max(20, Number(d.activity_timeout) || 120)) * 1000, kirim);
            void this.siakad
              .request<{ auth: string }>({ method: 'POST', path: '/v1/notif/realtime/auth', body: { socket_id: d.socket_id, channel_name: k.kanal } }, { signal, maxRetries: 0, timeout: 15_000 })
              .then((r) => kirim('pusher:subscribe', { channel: k.kanal, auth: r.data.auth }))
              .catch(() => {
                // Auth ditolak/gagal: putus, lalu coba lagi dengan jeda (status cadangan = long-poll).
                try {
                  ws.close();
                } catch {
                  /* abaikan */
                }
              });
            break;
          }
          case 'pusher_internal:subscription_succeeded':
            if (pesan.channel === k.kanal) {
              this.percobaan = 0;
              this.setStatus('tersambung');
              // Susul yang mungkin terlewat selama terputus.
              JENIS.forEach((j) => this.picu(j));
            }
            break;
          case 'pusher:subscription_error':
            try {
              ws.close();
            } catch {
              /* abaikan */
            }
            break;
          case 'pusher:error': {
            const kode = Number((data as { code?: number })?.code);
            if (kode >= 4000 && kode < 4100) {
              hasil = 'tolak';
              try {
                ws.close();
              } catch {
                /* abaikan */
              }
            }
            break;
          }
          case 'pusher:ping':
            kirim('pusher:pong', {});
            break;
          case 'pusher:pong':
            this.pingDikirim = 0;
            break;
          default:
            if (pesan.channel === k.kanal && pesan.event === (k.event ?? 'sinyal')) {
              const t = (data as { t?: string })?.t;
              if (t === 'obrolan' || t === 'notif') this.picu(t);
            }
        }
      };
    });
  }

  /** Ping bila sepi selama batas aktivitas; tanpa pong dalam 30 detik = koneksi dianggap putus. */
  private pasangDetak(ws: WebSocket, aktivitasMs: number, kirim: (e: string, d: unknown) => void) {
    if (this.detakTimer) clearInterval(this.detakTimer);
    this.terakhirTerima = Date.now();
    this.pingDikirim = 0;
    this.detakTimer = setInterval(() => {
      const kini = Date.now();
      if (this.pingDikirim && kini - this.pingDikirim > 30_000) {
        try {
          ws.close();
        } catch {
          /* abaikan */
        }
        return;
      }
      if (!this.pingDikirim && kini - this.terakhirTerima > aktivitasMs) {
        this.pingDikirim = kini;
        kirim('pusher:ping', {});
      }
    }, 5_000);
  }

  private picu(jenis: JenisSinyal) {
    this.hitung[jenis]++;
    this.pendengarSinyal.get(jenis)?.forEach((f) => f());
  }
}

const klien = new WeakMap<Siakad, KlienRealtime>();
/** Klien realtime untuk satu klien SDK; satu instans per klien dipakai bersama obrolan dan notifikasi. */
export function realtimeUntuk(siakad: Siakad): KlienRealtime {
  let k = klien.get(siakad);
  if (!k) {
    k = new KlienRealtime(siakad);
    klien.set(siakad, k);
  }
  return k;
}

/** Status realtime tab ini (untuk indikator). Tidak membuka koneksi sendiri; 'mati' bila tidak ada pemakai. */
export function useStatusRealtime(): StatusRealtime {
  const siakad = useOptionalSiakad();
  const k = siakad ? realtimeUntuk(siakad) : null;
  return React.useSyncExternalStore(
    React.useCallback((f: () => void) => (k ? k.langgan(f) : () => {}), [k]),
    () => k?.status ?? 'mati',
    () => 'mati',
  );
}

/**
 * Panggil `fn` setiap ada sinyal `jenis` (dan sekali setiap kali tersambung). Selama komponen terpasang, koneksi
 * realtime dibuka bila integrasinya aktif. Tanpa integrasi aktif tidak ada yang terjadi.
 */
export function useSinyalRealtime(jenis: JenisSinyal, fn: () => void, aktif = true) {
  const siakad = useOptionalSiakad();
  const ref = React.useRef(fn);
  ref.current = fn;
  React.useEffect(() => {
    if (!siakad || !aktif) return;
    const k = realtimeUntuk(siakad);
    const lepasPakai = k.pakai();
    const lepasDengar = k.dengar(jenis, () => ref.current());
    return () => {
      lepasDengar();
      lepasPakai();
    };
  }, [siakad, jenis, aktif]);
}
