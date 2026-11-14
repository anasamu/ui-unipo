import { createRoot } from 'react-dom/client';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/jetbrains-mono';
import 'unipo-ui/scss';
import './docs.scss';
import { UnipoProvider, configureFlags } from 'unipo-ui/siakad';
import { siakadDemo } from './mock/siakad';
import './mock/fitur';
import './mock/dasbor';
import './mock/kurikulum';
import './mock/lms';
import './mock/akademik';
import { App } from './App';

// Bendera dari paket country-flag-icons (tanpa CDN), dibundel Vite.
const flags = import.meta.glob<string>('../../../node_modules/country-flag-icons/3x2/*.svg', { eager: true, query: '?url', import: 'default' });
const byCode = Object.fromEntries(Object.entries(flags).map(([p, url]) => [p.slice(-6, -4), url]));
configureFlags((kode) => byCode[kode] ?? '');

createRoot(document.getElementById('root')!).render(
  <UnipoProvider siakad={siakadDemo} withProviders={false}>
    <App />
  </UnipoProvider>,
);
