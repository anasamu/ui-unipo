import * as React from 'react';
import { BannerPemeliharaan, Button, ModePemeliharaan } from 'unipo-ui';
import { GerbangPemeliharaan } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Mode pemeliharaan',
  category: 'Tampilan data',
  layout: 'wide',
  order: 80,
  badge: 'baru',
  description:
    'Halaman dan banner pemeliharaan. API SIAKAD membalas 503 saat pemeliharaan; hook SDK menangkapnya otomatis, membaca Retry-After, lalu GerbangPemeliharaan menampilkan halaman dengan hitung mundur dan mencoba lagi sendiri saat waktunya lewat.',
  importLine: "import { ModePemeliharaan, BannerPemeliharaan } from 'unipo-ui';\nimport { GerbangPemeliharaan, fetchPemeliharaan, usePemeliharaan } from 'unipo-ui/siakad';",
  demos: { Halaman: 'Halaman pemeliharaan dengan hitung mundur', Banner: 'Banner jadwal pemeliharaan', Gerbang: 'Gerbang otomatis dari respons 503' },
  props: [
    ['until', 'Date | string', 'Perkiraan selesai; tampil sebagai hitung mundur.'],
    ['autoRetry', 'boolean', 'Panggil onRetry otomatis saat waktu habis (bawaan true).'],
    ['variant', "'page' | 'inline'", 'Satu layar penuh atau di dalam kartu.'],
    ['BannerPemeliharaan.showHoursBefore', 'number', 'Tampil sekian jam sebelum mulai (bawaan 48). Bisa ditutup; tersimpan per jadwal.'],
    ['GerbangPemeliharaan.active', 'boolean', 'Paksa aktif (mis. dari setelan). Tanpa ini, gerbang mengikuti respons 503 dari API.'],
  ],
};

export function Halaman() {
  const [until] = React.useState(() => new Date(Date.now() + 25 * 60_000));
  return <ModePemeliharaan variant="inline" until={until} onRetry={() => {}} />;
}

export function Banner() {
  const [start] = React.useState(() => new Date(Date.now() + 5 * 3600_000));
  const [end] = React.useState(() => new Date(Date.now() + 8 * 3600_000));
  return <BannerPemeliharaan start={start} end={end} dismissible={false} message="SIAKAD tidak bisa diakses selama pembaruan server. Simpan KRS Anda sebelum waktu mulai." />;
}

export function Gerbang() {
  const [aktif, setAktif] = React.useState(false);
  return (
    <div style={{ display: 'grid', gap: '.75rem' }}>
      <Button variant="outline" onClick={() => setAktif((x) => !x)} style={{ justifySelf: 'start' }}>
        {aktif ? 'Akhiri pemeliharaan' : 'Simulasikan 503 dari API'}
      </Button>
      <GerbangPemeliharaan active={aktif} variant="inline" onRetry={() => setAktif(false)}>
        <p style={{ margin: 0 }}>Isi aplikasi tampil normal di sini.</p>
      </GerbangPemeliharaan>
    </div>
  );
}
