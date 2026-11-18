import type * as React from 'react';
import { StatusSidebar, type InfoLingkungan, type KeadaanStatusSidebar, type LingkunganServer } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Status sidebar',
  category: 'Mulai',
  order: 5,
  badge: 'baru',
  description:
    'Kaki sidebar bawaan semua aplikasi (dipasang otomatis oleh KerangkaAplikasi): titik status API hijau/kuning/merah dengan latensi dan jam cek di tooltip, lencana lingkungan + database (Live hijau tenang, Development oranye, Lokal abu-biru, Uji ungu), versi + commit, dan hak cipta. Data dari GET /v1/health/lingkungan SIAKAD. Peringatan tampil bila aplikasi produksi memakai database development, atau aplikasi lokal/uji memakai database live produksi. Sidebar diciutkan: satu ikon + tooltip.',
  importLine: "import { StatusSidebar } from 'unipo-ui/siakad';",
  demos: {
    Lingkungan: 'Produksi (live), development (salinan), lokal, uji; contoh data tetap lewat prop keadaan',
    Peringatan: 'Aplikasi produksi memakai database development, dan aplikasi lokal memakai database live produksi',
    Diciutkan: 'Ikon saja; arahkan kursor untuk rincian',
  },
  props: [
    ['versi', 'string', 'Versi aplikasi (package.json, `__VERSI__`). Dari KerangkaAplikasi `versi`.'],
    ['commit', 'string', 'Commit pendek build (`__COMMIT__`). Dari KerangkaAplikasi `commit`.'],
    ['collapsed', 'boolean', 'Sidebar diciutkan: ikon database + titik status, rincian di tooltip.'],
    ['statusApi', 'boolean', 'Bawaan true. false = tanpa titik status dan lencana.'],
    ['lingkunganAplikasi', "'produksi' | 'uji' | 'pengembangan' | 'lokal'", 'Jenis aplikasi ini untuk peringatan. Bawaan ditebak dari location.hostname.'],
    ['interval', 'number', 'Selang cek dalam ms (bawaan 60000).'],
    ['hakCipta', 'ReactNode', 'Bawaan "© <tahun> UNIPO".'],
    ['keadaan', 'KeadaanStatusSidebar', 'Data tetap tanpa memanggil API (pratinjau).'],
  ],
};

const info = (server: LingkunganServer, dev: boolean): InfoLingkungan => ({
  status: 'ok',
  server: { lingkungan: server, label: { produksi: 'Produksi', uji: 'Uji', pengembangan: 'Pengembangan', lokal: 'Lokal' }[server] },
  database: {
    lingkungan: dev ? 'development' : 'live',
    label: dev ? 'Development (salinan 12 Nov)' : server === 'produksi' ? 'Live (produksi)' : server === 'lokal' ? 'Lokal' : 'Live (server uji)',
    data_asli: !dev && server === 'produksi',
    disamarkan: dev,
    salinan_at: dev ? '2026-11-12T08:15:00+08:00' : null,
    alasan: dev ? 'aplikasi' : null,
    tersambung: true,
  },
  api: { versi: '1.0.0', commit: 'bcf8aa53' },
  waktu_server: new Date().toISOString(),
});
const keadaan = (server: LingkunganServer, dev = false, ms = 42): KeadaanStatusSidebar => ({
  status: ms > 1500 ? 'lambat' : 'normal',
  ms,
  dicek: new Date(),
  info: info(server, dev),
});

const kotak: React.CSSProperties = { width: 248, padding: '0.625rem 0.875rem 0.75rem', border: '1px solid var(--u-border)', borderRadius: 12, background: 'var(--u-surface, var(--u-background))' };

export function Lingkungan() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
      <div style={kotak}><StatusSidebar versi="1.0.0" commit="3f9c2a1" lingkunganAplikasi="produksi" keadaan={keadaan('produksi')} /></div>
      <div style={kotak}><StatusSidebar versi="1.0.0" commit="3f9c2a1" lingkunganAplikasi="uji" keadaan={keadaan('uji', true, 380)} /></div>
      <div style={kotak}><StatusSidebar versi="1.0.0" commit="lokal" lingkunganAplikasi="lokal" keadaan={keadaan('lokal', false, 18)} /></div>
      <div style={kotak}><StatusSidebar versi="1.0.0" commit="3f9c2a1" lingkunganAplikasi="uji" keadaan={keadaan('uji', false, 2100)} /></div>
      <div style={kotak}><StatusSidebar versi="1.0.0" commit="3f9c2a1" keadaan={{ status: 'gangguan', ms: null, dicek: new Date(), info: null }} /></div>
    </div>
  );
}

export function Peringatan() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
      <div style={kotak}><StatusSidebar versi="1.0.0" commit="3f9c2a1" lingkunganAplikasi="produksi" keadaan={keadaan('produksi', true, 120)} /></div>
      <div style={kotak}><StatusSidebar versi="1.0.0" commit="lokal" lingkunganAplikasi="lokal" keadaan={keadaan('produksi', false, 640)} /></div>
    </div>
  );
}

export function Diciutkan() {
  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      {[keadaan('produksi'), keadaan('produksi', true), keadaan('lokal'), keadaan('uji')].map((k, i) => (
        <div key={i} style={{ ...kotak, width: 'auto', padding: '0.5rem' }}>
          <StatusSidebar collapsed versi="1.0.0" commit="3f9c2a1" lingkunganAplikasi={i === 1 ? 'produksi' : (k.info?.server.lingkungan ?? 'produksi')} keadaan={k} />
        </div>
      ))}
    </div>
  );
}
