import * as React from 'react';
import { NilaiBintang, RingkasanRating, Testimoni, type ItemTestimoni } from 'unipo-ui';
import { TestimoniLandingPmb } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';
import { TESTIMONI_PMB } from '../mock/profil-kampus';

export const meta: DemoMeta = {
  title: 'Testimoni & rating',
  category: 'Portal & landing',
  layout: 'full',
  order: 6,
  badge: 'baru',
  description:
    'Testimoni alumni, mahasiswa, orang tua, dan mitra dengan rating bintang, dalam tujuh varian: kisi, masonry, carousel, sorotan, kutipan bergantian, marquee berjalan, dan daftar. Ada tab filter per kelompok, ringkasan rating dengan sebaran bintang, video testimoni, dan isian bintang untuk formulir ulasan. TestimoniLandingPmb mengambil data dari landing PMB.',
  importLine: "import { Testimoni, KartuTestimoni, NilaiBintang, RingkasanRating } from 'unipo-ui';\nimport { TestimoniLandingPmb } from 'unipo-ui/siakad';",
  demos: {
    Kisi: 'varian="kisi" + filter kelompok + ringkasan rating',
    Carousel: 'varian="carousel": geser, tombol, titik halaman, putar otomatis 6 detik',
    Sorotan: 'varian="sorotan": satu testimoni besar + empat ringkas',
    Kutipan: 'varian="kutipan": kutipan besar bergantian, pilih lewat foto',
    Marquee: 'varian="marquee": dua baris berjalan, berhenti saat disorot',
    Masonry: 'varian="masonry" dan varian="daftar"',
    Rating: 'NilaiBintang (tampilan dan isian) dan RingkasanRating',
    DariPmb: 'TestimoniLandingPmb: dari GET /v1/pmb/info/landing',
  },
  props: [
    ['items', 'ItemTestimoni[]', '{ nama, isi, peran?, unit?, instansi?, foto?, rating?, kategori?, video_url?, terverifikasi? }'],
    ['varian', "'kisi' | 'masonry' | 'carousel' | 'sorotan' | 'kutipan' | 'marquee' | 'daftar'", 'Bawaan kisi.'],
    ['kolom', '2 | 3 | 4', 'Kolom kisi dan masonry; turun otomatis di layar sempit.'],
    ['filter', 'boolean | { nilai, label }[]', 'Tab per kategori. true = dari kategori yang ada di data.'],
    ['ringkasan', 'boolean', 'Rata-rata rating dan jumlah ulasan di atas.'],
    ['bintang', 'boolean', 'Tampilkan bintang di kartu. Bawaan true.'],
    ['otomatis', 'number (ms)', 'Ganti otomatis untuk carousel dan kutipan. Berhenti saat disorot atau difokus, dan mati bila pengguna memilih gerak dikurangi.'],
    ['potong', 'number', 'Batas karakter sebelum "Selengkapnya". 0 = tanpa batas.'],
    ['NilaiBintang', '{ nilai, maks?, ukuran?, angka?, onUbah? }', 'Pecahan didukung (4,5). Dengan onUbah menjadi isian: klik atau panah kiri/kanan.'],
    ['RingkasanRating', '{ items? | distribusi?, varian? }', "Rata-rata + sebaran bintang 5..1. varian 'ringkas' untuk satu baris."],
  ],
  notes: [
    'TestimoniLandingPmb memakai testimoni aktif dari landing PMB (pmb_testimoni, dikelola panitia PMB). Kategori ditebak dari kolom peran: alumni, mahasiswa, orang tua, dosen, atau mitra.',
    'Video (YouTube, Vimeo, atau berkas https .mp4) diputar di dialog. Untuk YouTube dipakai youtube-nocookie.com.',
    'Marquee berhenti saat disorot, saat ada fokus keyboard di dalamnya, atau lewat tombol jeda. Dengan prefers-reduced-motion, marquee berubah menjadi baris yang bisa digeser.',
    'Foto contoh di halaman ini berupa ilustrasi, bukan foto orang sungguhan.',
  ],
};

const KATEGORI: Record<number, string> = { 1: 'alumni', 2: 'mahasiswa', 3: 'alumni', 4: 'orang_tua', 5: 'mahasiswa', 6: 'alumni', 7: 'mitra', 8: 'mahasiswa' };
const DATA: ItemTestimoni[] = TESTIMONI_PMB.map((t) => ({
  id: t.id,
  nama: t.nama,
  peran: t.peran.split(' · ')[0],
  instansi: t.peran.split(' · ')[1] ?? null,
  unit: t.nama_prodi,
  foto: t.foto,
  isi: t.isi,
  rating: t.rating,
  video_url: t.video_url,
  kategori: KATEGORI[t.id],
  terverifikasi: KATEGORI[t.id] === 'alumni',
}));

export function Kisi() {
  return <Testimoni items={DATA.slice(0, 6)} filter ringkasan potong={140} />;
}

export function Carousel() {
  return <Testimoni items={DATA} varian="carousel" otomatis={6000} />;
}

export function Sorotan() {
  return <Testimoni items={DATA} varian="sorotan" />;
}

export function Kutipan() {
  return <Testimoni items={DATA.slice(0, 6)} varian="kutipan" otomatis={7000} />;
}

export function Marquee() {
  return <Testimoni items={DATA} varian="marquee" />;
}

export function Masonry() {
  return (
    <div style={{ display: 'grid', gap: '2.5rem' }}>
      <Testimoni items={DATA} varian="masonry" kolom={3} />
      <div style={{ maxWidth: '36rem' }}>
        <Testimoni items={DATA.slice(0, 3)} varian="daftar" />
      </div>
    </div>
  );
}

export function Rating() {
  const [nilai, setNilai] = React.useState(0);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 20rem), 1fr))', gap: '1.5rem', alignItems: 'start' }}>
      <RingkasanRating distribusi={{ 5: 214, 4: 88, 3: 21, 2: 6, 1: 3 }} judul="Kepuasan alumni" />
      <div style={{ display: 'grid', gap: '1rem' }}>
        <NilaiBintang nilai={4.5} angka />
        <NilaiBintang nilai={3.7} ukuran="lg" angka />
        <NilaiBintang nilai={2} ukuran="sm" />
        <RingkasanRating items={DATA} varian="ringkas" />
        <label style={{ display: 'grid', gap: '0.375rem', fontSize: 'var(--u-text-sm)', fontWeight: 500 }}>
          Beri penilaian layanan akademik
          <NilaiBintang nilai={nilai} onUbah={setNilai} ukuran="lg" angka label="Penilaian layanan akademik" />
        </label>
      </div>
    </div>
  );
}

export function DariPmb() {
  return <TestimoniLandingPmb varian="carousel" ringkasan />;
}
