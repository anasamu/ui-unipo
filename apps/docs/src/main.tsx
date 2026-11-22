import { createRoot } from 'react-dom/client';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/jetbrains-mono';
import 'unipo-ui/scss';
import './docs.scss';
import * as React from 'react';
import { SsoAdminProvider, UnipoProvider, buatSiakadPenghubung, configureFlags } from 'unipo-ui/siakad';
import { siakadDemo } from './mock/siakad';
import './mock/fitur';
import './mock/dasbor';
import './mock/kurikulum';
import './mock/lms';
import './mock/lms-belajar';
import './mock/akademik';
import './mock/pilih';
import './mock/katalog';
import './mock/berkas';
import './mock/tema';
import './mock/landing';
import './mock/profil-kampus';
import './mock/surat';
import './mock/alur';
import './mock/ai';
import './mock/obrolan';
import './mock/notif';
import './mock/modal-fitur';
import './mock/profil';
import './mock/kerangka-portal';
import './mock/formulir';
import './mock/aturan';
import './mock/qr-dokumen';
import './mock/presensi';
import './mock/presensi-kerja';
import './mock/jadwal-bentrok';
import './mock/keuangan';
import './mock/kasir';
import './mock/sk';
// Terakhir: rute tulis wizard kurikulum mendahului rute tulis umum (formulir/katalog).
import './mock/kurikulum-aturan';
import { ssoDemo } from './mock/aplikasi';
import { App } from './App';

// Bendera dari paket country-flag-icons (tanpa CDN), dibundel Vite.
const flags = import.meta.glob<string>('../../../node_modules/country-flag-icons/3x2/*.svg', { eager: true, query: '?url', import: 'default' });
const byCode = Object.fromEntries(Object.entries(flags).map(([p, url]) => [p.slice(-6, -4), url]));
configureFlags((kode) => byCode[kode] ?? '');

/**
 * Sumber data pratinjau. Bawaan data tiruan. Playground di api.unipo.ac.id (halaman induk, origin sama) boleh
 * mengganti ke API sungguhan dengan kunci API uji milik pengunjung: `{ type: 'unipo-ui:sumber', mode: 'api', token }`.
 * Kunci hanya disimpan di memori halaman ini (induk menyimpannya di sessionStorage) dan hanya permintaan baca (GET)
 * yang dikirim; permintaan tulis dijawab 403 tanpa menghubungi server.
 */
function hanyaBaca(input: string, init?: RequestInit): Promise<Response> {
  const metode = (new Headers(init?.headers).get('x-http-method-override') ?? init?.method ?? 'GET').toUpperCase();
  if (metode !== 'GET') {
    return Promise.resolve(Response.json({ error: { code: 'playground_baca_saja', message: 'Playground hanya membaca data. Simpan/ubah dicoba di aplikasi Anda sendiri.' } }, { status: 403 }));
  }
  return fetch(input, init);
}

function Akar() {
  const [token, setToken] = React.useState<string | null>(null);
  const tokenRef = React.useRef(token);
  tokenRef.current = token;
  React.useEffect(() => {
    if (window.parent === window) return;
    const on = (e: MessageEvent) => {
      // Hanya dari halaman induk yang sama asalnya (bukan "null"/iframe lain).
      if (e.source !== window.parent || e.origin === 'null' || e.origin !== location.origin) return;
      if (e.data?.type !== 'unipo-ui:sumber') return;
      setToken(e.data.mode === 'api' && typeof e.data.token === 'string' && e.data.token.trim() ? e.data.token.trim() : null);
    };
    window.addEventListener('message', on);
    window.parent.postMessage({ type: 'unipo-ui:siap' }, location.origin);
    return () => window.removeEventListener('message', on);
  }, []);
  const api = React.useMemo(
    () => (token ? buatSiakadPenghubung({ baseUrl: location.origin, fetcher: hanyaBaca, getToken: () => tokenRef.current }) : null),
    [token],
  );
  React.useEffect(() => {
    if (window.parent !== window) window.parent.postMessage({ type: 'unipo-ui:sumber-aktif', mode: api ? 'api' : 'tiruan' }, location.origin);
  }, [api]);
  return (
    <UnipoProvider key={api ? 'api' : 'tiruan'} siakad={api ?? siakadDemo} withProviders={false}>
      <SsoAdminProvider client={ssoDemo}>
        <App />
      </SsoAdminProvider>
    </UnipoProvider>
  );
}

createRoot(document.getElementById('root')!).render(<Akar />);
