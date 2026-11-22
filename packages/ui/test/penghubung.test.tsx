// @vitest-environment happy-dom
import * as React from 'react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { UnipoProvider, buatSiakadPenghubung, useSiakadQuery } from '../src/siakad/provider';
import { buatFetcherTiruan } from '../src/siakad/tiruan';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
vi.setConfig({ testTimeout: 30_000 });

let root: Root | null = null;
afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = '';
});

const PRODI = [{ kode_prodi: '55201', nama_prodi: 'Informatika' }];

function DaftarNama() {
  const q = useSiakadQuery<typeof PRODI>(['uji-prodi'], (s, signal) => s.request({ method: 'GET', path: '/v1/referensi/prodi' }, { signal }));
  if (q.loading) return <p>memuat</p>;
  if (q.error) return <p>galat: {q.error.message}</p>;
  return <p>{q.data?.map((p) => p.nama_prodi).join(',')}</p>;
}

async function pasang(el: React.ReactElement) {
  const w = document.createElement('div');
  document.body.appendChild(w);
  root = createRoot(w);
  await act(async () => root!.render(el));
  await act(async () => void (await new Promise((r) => setTimeout(r, 30))));
  return w;
}

describe('penghubung data UnipoProvider', () => {
  it('baseUrl ke proxy: tanpa header Authorization dari browser, tanpa galat "Belum ada token"', async () => {
    const panggil: { url: string; auth: string | null }[] = [];
    const fetcher = async (url: string, init?: RequestInit) => {
      panggil.push({ url, auth: new Headers(init?.headers).get('authorization') });
      return Response.json({ data: PRODI });
    };
    const s = buatSiakadPenghubung({ baseUrl: '/api/siakad', fetcher });
    const r = await s.request<typeof PRODI>({ method: 'GET', path: '/v1/referensi/prodi' });
    expect(r.data).toEqual(PRODI);
    expect(panggil[0]).toEqual({ url: '/api/siakad/v1/referensi/prodi', auth: null });
  });

  it('getToken: token pengguna dipasang per permintaan', async () => {
    let token: string | null = 'tok-1';
    const auth: (string | null)[] = [];
    const s = buatSiakadPenghubung({
      baseUrl: 'https://api.contoh.test',
      fetcher: async (_u, init) => (auth.push(new Headers(init?.headers).get('authorization')), Response.json({ data: [] })),
      getToken: () => token,
    });
    await s.request({ method: 'GET', path: '/v1/referensi/prodi' });
    token = null;
    await s.request({ method: 'GET', path: '/v1/referensi/prodi' });
    expect(auth).toEqual(['Bearer tok-1', null]);
  });

  it('fetcher tiruan: komponen menampilkan data tanpa server', async () => {
    const w = await pasang(
      <UnipoProvider fetcher={buatFetcherTiruan({ 'GET /v1/referensi/prodi': PRODI }, { jeda: 0 })} withProviders={false} laporGalat={false} kalenderAkademik={false}>
        <DaftarNama />
      </UnipoProvider>,
    );
    expect(w.textContent).toBe('Informatika');
  });

  it('rute tiruan yang belum ada: pesan jelas, bukan galat token', async () => {
    const w = await pasang(
      <UnipoProvider fetcher={buatFetcherTiruan({}, { jeda: 0 })} withProviders={false} laporGalat={false} kalenderAkademik={false}>
        <DaftarNama />
      </UnipoProvider>,
    );
    expect(w.textContent).toContain('Belum ada data tiruan untuk GET /v1/referensi/prodi');
  });

  it('tanpa sumber data: pesan menyebut baseUrl/fetcher', async () => {
    const w = await pasang(
      <UnipoProvider withProviders={false}>
        <DaftarNama />
      </UnipoProvider>,
    );
    expect(w.textContent).toContain('baseUrl');
  });

  it('prop siakad lama tetap dipakai apa adanya', async () => {
    const s = buatSiakadPenghubung({ fetcher: buatFetcherTiruan({ 'GET /v1/referensi/prodi': [{ nama_prodi: 'Hukum' }] }, { jeda: 0 }) });
    const w = await pasang(
      <UnipoProvider siakad={s} baseUrl="/abaikan" withProviders={false} laporGalat={false} kalenderAkademik={false}>
        <DaftarNama />
      </UnipoProvider>,
    );
    expect(w.textContent).toBe('Hukum');
  });

  it('tiruan: fungsi per rute menerima query, awalan sebelum /v1 dibuang', async () => {
    const f = buatFetcherTiruan({ 'GET /v1/referensi/prodi': (q: URLSearchParams) => ({ data: [], meta: { fakultas: q.get('fakultas') } }) }, { jeda: 0 });
    const r = await f('/api/siakad/v1/referensi/prodi?fakultas=FIK');
    expect(await r.json()).toEqual({ data: [], meta: { fakultas: 'FIK' } });
    expect(r.headers.get('x-siakad-lingkungan')).toBe('tiruan');
  });
});
