import * as React from 'react';
import { Field, Input, KodeQr, PembuatGayaQr, svgKodeQr, type GayaQr } from 'unipo-ui';
import { KelolaGayaQr, KodeQrSiakad, useGayaQr } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Kode QR',
  category: 'Per kegunaan',
  layout: 'wide',
  order: 4,
  badge: 'baru',
  description:
    'Kode QR modern dengan objek gaya yang sama di SIAKAD (/v1/qr), SDK, dan komponen ini: warna polos atau gradasi, 8 bentuk modul, bentuk dan warna mata, logo kampus/unit, bingkai dengan teks. KodeQr menggambar SVG langsung di browser, jadi QR presensi yang berganti tiap beberapa detik tidak membebani server. Gaya resmi per bagian (fakultas, prodi, biro) diwariskan dari unit induk dan dibaca dengan KodeQrSiakad/useGayaQr.',
  importLine: "import { KodeQr, PembuatGayaQr, svgKodeQr } from 'unipo-ui';\nimport { KodeQrSiakad, useGayaQr, KelolaGayaQr } from 'unipo-ui/siakad';",
  demos: {
    Galeri: 'KodeQr: preset dan gaya bebas',
    Presensi: 'KodeQrSiakad: QR presensi berganti tiap 5 detik dengan gaya bagian',
    Pembuat: 'PembuatGayaQr: penyusun gaya visual dengan pratinjau dan unduh PNG',
    Kelola: 'KelolaGayaQr: gaya tersimpan per bagian (POST /v1/qr/gaya)',
    Svg: 'svgKodeQr: teks SVG untuk cetak atau kanvas',
  },
  props: [
    ['KodeQr.nilai', 'string', 'Isi QR (URL atau teks, ±2000 byte).'],
    ['KodeQr.gaya', "GayaQr | 'bawaan' | 'presensi' | 'dokumen' | 'kartu'", 'Objek gaya (boleh sebagian) atau nama preset.'],
    ['KodeQr.ukuran', 'number', 'Lebar piksel, bawaan 200.'],
    ['KodeQr.logo', 'string', 'URL/data URI logo untuk logo sumber kampus/berkas.'],
    ['KodeQr.unduh', 'boolean | string', 'Tampilkan tombol unduh PNG (nama file opsional).'],
    ['KodeQrSiakad.kodeGaya', 'string', 'presensi, dokumen, kartu, atau kode buatan bagian.'],
    ['KodeQrSiakad.bagian', 'string', 'Kode unit; gaya dicari di unit ini lalu induknya sampai kampus.'],
    ['KodeQrSiakad.gayaTambahan', 'GayaQr (sebagian)', 'Timpa sebagian gaya di halaman ini, mis. teks bingkai.'],
  ],
  notes: [
    'Gaya efektif dibaca dari GET /v1/qr/gaya/efektif (publik, cocok untuk layar kiosk presensi); logo dikirim sebagai data URI.',
    'Butuh PNG yang tersimpan di storage (mis. untuk kartu cetak)? Panggil POST /v1/qr dengan simpan: true lewat SDK (qrPng / siakad.qr.create).',
    'Logo menaikkan tingkat koreksi otomatis (Q, atau H bila logo di atas 22%) agar QR tetap terbaca; PembuatGayaQr memperingatkan kontras warna yang terlalu rendah.',
  ],
};

const URL_CONTOH = 'https://siakad.unipo.ac.id/api/v1/dokumen/v/K7QM2XPA9RTD';

export function Galeri() {
  const contoh: Array<[string, Parameters<typeof KodeQr>[0]['gaya']]> = [
    ['bawaan', 'bawaan'],
    ['presensi', 'presensi'],
    ['dokumen', 'dokumen'],
    ['kartu', 'kartu'],
    ['gradasi radial + titik', { modul: 'titik', mata_luar: 'daun', mata_dalam: 'daun', gradasi: { jenis: 'radial', warna: ['#7c3aed', '#db2777', '#f59e0b'] } }],
    ['berlian + bingkai pil', { modul: 'berlian', mata_luar: 'bulat', mata_dalam: 'berlian', warna_mata_dalam: '#b91c1c', bingkai: { teks: 'SCAN SAYA', bentuk: 'pil', warna: '#065f46' } }],
    ['garis tegak + gradasi', { modul: 'garis_v', gradasi: { jenis: 'linear', sudut: 90, warna: ['#0f3d5e', '#0e7490'] } }],
    ['transparan', { modul: 'menyatu', latar: 'transparan', warna: '#1d4ed8', mata_luar: 'rounded' }],
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1.25rem' }}>
      {contoh.map(([judul, g]) => (
        <figure key={judul} style={{ margin: 0, display: 'grid', justifyItems: 'center', gap: '.5rem' }}>
          <KodeQr nilai={URL_CONTOH} gaya={g} ukuran={140} />
          <figcaption style={{ fontSize: 13, color: 'var(--u-muted-foreground)', textAlign: 'center' }}>{judul}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export function Presensi() {
  const [t, setT] = React.useState(() => Math.floor(Date.now() / 5000));
  React.useEffect(() => {
    const i = setInterval(() => setT(Math.floor(Date.now() / 5000)), 1000);
    return () => clearInterval(i);
  }, []);
  const nilai = `https://siakad.unipo.ac.id/presensi/sesi/1842?t=${t}`;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start' }}>
      <figure style={{ margin: 0, display: 'grid', gap: '.5rem', justifyItems: 'center' }}>
        <KodeQrSiakad nilai={nilai} kodeGaya="presensi" ukuran={220} />
        <figcaption style={{ fontSize: 13 }}>Gaya presensi kampus</figcaption>
      </figure>
      <figure style={{ margin: 0, display: 'grid', gap: '.5rem', justifyItems: 'center' }}>
        <KodeQrSiakad nilai={nilai} kodeGaya="presensi" bagian="55201" ukuran={220} gayaTambahan={{ bingkai: { teks: 'PEMROGRAMAN WEB · A', warna: '#7c2d12', bentuk: 'pil' } }} />
        <figcaption style={{ fontSize: 13 }}>Prodi Informatika (mewarisi gaya Fakultas Teknik)</figcaption>
      </figure>
    </div>
  );
}

export function Pembuat() {
  const efektif = useGayaQr('presensi');
  const [gaya, setGaya] = React.useState<GayaQr | null>(null);
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <PembuatGayaQr value={gaya ?? efektif.data?.gaya ?? null} onValueChange={setGaya} logo={efektif.data?.gaya.logo?.data ?? null} contoh={URL_CONTOH} />
      <details>
        <summary style={{ cursor: 'pointer', fontSize: 14 }}>Objek gaya (untuk POST /v1/qr/gaya atau prop gaya)</summary>
        <pre style={{ fontSize: 12, overflow: 'auto' }}>{JSON.stringify(gaya, (k, v) => (k === 'data' && typeof v === 'string' ? v.slice(0, 40) + '…' : v), 2)}</pre>
      </details>
    </div>
  );
}

export function Kelola() {
  return <KelolaGayaQr contoh={URL_CONTOH} />;
}

export function Svg() {
  const [isi, setIsi] = React.useState('https://unipo.ac.id');
  const { svg, versi, koreksi } = svgKodeQr(isi || ' ', { modul: 'rounded', mata_luar: 'rounded' }, { ukuran: 160 });
  return (
    <div style={{ display: 'grid', gap: '.75rem', maxWidth: 520 }}>
      <Field label="Isi">
        <Input value={isi} onChange={(e) => setIsi(e.target.value)} />
      </Field>
      <span dangerouslySetInnerHTML={{ __html: svg }} />
      <small>Versi {versi}, koreksi {koreksi}, {svg.length.toLocaleString('id-ID')} karakter SVG.</small>
    </div>
  );
}
