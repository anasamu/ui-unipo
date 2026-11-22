import type { PengambilSiakad } from './provider';

/** Jawaban tiruan satu rute: data saja, `{ data, meta }`, atau fungsi yang menerima query dan body. */
export type JawabanTiruanUi = unknown | ((query: URLSearchParams, body: unknown) => unknown | Promise<unknown>);

export interface OpsiFetcherTiruan {
  /** Jeda tiap jawaban (ms) agar keadaan memuat terlihat. Bawaan 250. */
  jeda?: number;
  /** Dipanggil untuk rute yang tidak ada di daftar (bawaan: jawaban 404 berisi pesan). */
  lainnya?: PengambilSiakad;
}

/**
 * `fetch` tiruan untuk `<UnipoProvider fetcher={...}>`: komponen siakad bisa dicoba tanpa server dan tanpa kunci API.
 * Kunci rute sama dengan opsi `tiruan` di `proxySiakad` SDK, jadi data contoh bisa dipakai di kedua tempat.
 *
 *   <UnipoProvider fetcher={buatFetcherTiruan({ 'GET /v1/referensi/prodi': [{ kode_prodi: '55201', nama_prodi: 'Informatika' }] })}>
 */
export function buatFetcherTiruan(rute: Record<string, JawabanTiruanUi>, opsi: OpsiFetcherTiruan = {}): PengambilSiakad {
  const { jeda = 250, lainnya } = opsi;
  return async (input, init = {}) => {
    const url = new URL(input, 'http://tiruan.invalid');
    const metode = (new Headers(init.headers).get('x-http-method-override') ?? init.method ?? 'GET').toUpperCase();
    // Buang awalan apa pun sebelum /v1 (mis. /api/siakad/v1/...).
    const i = url.pathname.indexOf('/v1/');
    const path = i >= 0 ? url.pathname.slice(i) : url.pathname;
    if (init.signal?.aborted) throw init.signal.reason ?? new DOMException('Dibatalkan', 'AbortError');
    if (jeda > 0) await new Promise((r) => setTimeout(r, jeda));
    const isi = rute[`${metode} ${path}`];
    if (isi === undefined) {
      if (lainnya) return lainnya(input, init);
      return Response.json({ error: { code: 'not_found', message: `Belum ada data tiruan untuk ${metode} ${path}.` } }, { status: 404 });
    }
    let body: unknown = undefined;
    if (typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    } else if (init.body !== undefined && init.body !== null) body = init.body;
    const hasil = typeof isi === 'function' ? await (isi as (q: URLSearchParams, b: unknown) => unknown)(url.searchParams, body) : isi;
    const amplop = hasil !== null && typeof hasil === 'object' && !Array.isArray(hasil) && 'data' in hasil ? hasil : { data: hasil };
    return Response.json(amplop, { headers: { 'x-siakad-lingkungan': 'tiruan' } });
  };
}
