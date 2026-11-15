import { ADEGAN, Ilustrasi } from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Ilustrasi',
  category: 'Fondasi',
  layout: 'wide',
  order: 42,
  badge: 'baru',
  description:
    'Ilustrasi vektor bergaya 3D lembut (clay) untuk setiap grup, modul, dan keadaan: kotak ikon timbul sesuai fitur, bentuk geometris melayang, dan tokoh untuk keadaan kosong, galat, pemeliharaan, sukses, terkunci, cari, dan selamat datang. Warna ikut tema dan mode gelap, bergerak pelan (mati bila pengguna memilih kurangi gerakan), dan tajam di ukuran apa pun karena SVG.',
  importLine: "import { Ilustrasi } from 'unipo-ui';",
  demos: { Keadaan: 'Keadaan (dengan tokoh)', Modul: 'Semua grup dan modul' },
  props: [
    ['nama', 'string', 'Kunci modul katalog (akademik, keu, sarpras, …), grup, atau keadaan.'],
    ['lebar', 'number | string', 'Lebar; tinggi ikut rasio 4:3.'],
    ['nada / ikon', '', 'Ganti warna atau ikon utama.'],
    ['bergerak', 'boolean', 'Bentuk melayang dan tokoh bergerak pelan (bawaan true).'],
  ],
};

const KEADAAN = ['kosong', 'cari', 'galat', 'pemeliharaan', 'terkunci', 'sukses', 'selamat-datang'];

function Kisi({ nama }: { nama: string[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(12rem, 1fr))', gap: '1rem' }}>
      {nama.map((n) => (
        <figure key={n} style={{ margin: 0, display: 'grid', justifyItems: 'center', gap: '.25rem', padding: '.75rem', border: '1px solid var(--u-border)', borderRadius: 'calc(var(--u-radius) + 4px)' }}>
          <Ilustrasi nama={n} lebar="100%" />
          <figcaption>
            <code>{n}</code>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export function Keadaan() {
  return <Kisi nama={KEADAAN} />;
}

export function Modul() {
  return <Kisi nama={Object.keys(ADEGAN).filter((k) => !KEADAAN.includes(k))} />;
}
