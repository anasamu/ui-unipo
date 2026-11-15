import * as React from 'react';
import { ADEGAN, Button, Field, ILUSTRASI_FITUR, ILUSTRASI_KEADAAN, Ilustrasi, Select, type AksesoriTokoh, type EkspresiTokoh, type GayaTokoh, type PoseTokoh } from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Ilustrasi',
  category: 'Fondasi',
  layout: 'wide',
  order: 42,
  badge: 'baru',
  description:
    'Ilustrasi vektor bergaya 3D lembut (clay) untuk setiap grup, modul, fitur, dan keadaan: kotak ikon timbul sesuai fitur, bentuk geometris melayang, dan tokoh yang gaya rambut (cepol, pendek, hijab, peci), ekspresi (senang, sedih, kaget, bingung), dan aksesorinya (toga, jubah wisuda, jas, ransel, laptop, kaca pembesar, ponsel, ijazah, kunci, piala, kartu) mengikuti fitur: wisuda, yudisium, e-learning, keamanan, salah password, pendaftaran, maba, pencarian mahasiswa, bimbingan, dan lainnya. Semua warnanya variabel CSS (lihat tabel), jadi ikut tema dan mode gelap, bergerak pelan (mati bila pengguna memilih kurangi gerakan), dan tajam di ukuran apa pun karena SVG.',
  importLine: "import { Ilustrasi } from 'unipo-ui';",
  demos: {
    Fitur: 'Ilustrasi per fitur (dengan tokoh)',
    Karakter: 'Atur tokoh sendiri',
    Keadaan: 'Keadaan (kosong, galat, sesi habis, …)',
    Tema: 'Warna diatur dari CSS tema',
    Modul: 'Semua grup dan modul',
  },
  props: [
    ['nama', 'string', 'Kunci modul katalog (akademik, keu, sarpras, …), grup, atau keadaan.'],
    ['lebar', 'number | string', 'Lebar; tinggi ikut rasio 4:3.'],
    ['nada / ikon', '', 'Ganti warna atau ikon utama.'],
    ['bergerak', 'boolean', 'Bentuk melayang dan tokoh bergerak pelan (bawaan true).'],
    ['tokoh', "'jalan' | 'tunjuk' | 'duduk' | false", 'Pose tokoh utama; false menyembunyikan tokoh.'],
    ['gaya', "'cepol' | 'pendek' | 'hijab' | 'peci'", 'Gaya rambut atau penutup kepala tokoh utama.'],
    ['ekspresi', "'datar' | 'senang' | 'sedih' | 'kaget' | 'bingung'", 'Ekspresi wajah.'],
    ['aksesori', 'AksesoriTokoh[]', 'toga, kacamata, headset, jubah, jas, ransel, dan satu barang di tangan: laptop, kaca, dokumen, ijazah, ponsel, buku, kunci, piala, kartu.'],
    ['teman', 'SpekTokoh | false', 'Tokoh kedua di kanan (mis. dosen dan mahasiswa bimbingan, dua wisudawan).'],
    ['ILUSTRASI_FITUR / ILUSTRASI_KEADAAN', 'string[]', 'Daftar kunci adegan fitur dan keadaan.'],
    [
      '--u-ilus-jubah, -emas, -hijab, -peci, -ransel, -benda, -kulit-sawo, -baju-kedua',
      'CSS',
      'Warna jubah/topi wisuda, emas (rumbai, kunci, piala), hijab, peci, ransel, barang, kulit kedua, baju tokoh kedua.',
    ],
    ['--u-ilus-utama', 'CSS', 'Warna kotak dan latar. Bawaan: warna fitur (--u-nada). Pasang var(--u-primary) agar semua ilustrasi dan IkonKotak ikut warna merek.'],
    ['--u-ilus-aksen-1 … 4', 'CSS', 'Bentuk melayang. Bawaan: --u-chart-3, --u-chart-4, --u-chart-5, --u-secondary.'],
    ['--u-ilus-baju, -celana, -kulit, -rambut, -sepatu, -pita, -pipi', 'CSS', 'Warna tokoh. Baju bawaan --u-primary.'],
    ['--u-ilus-ikon, -lantai, -bayang', 'CSS', 'Garis ikon (putih), bayangan lantai, bayangan kotak.'],
    ['--u-nada-biru, --u-nada-hijau, …', 'CSS', 'Ganti warna tiap nada fitur tanpa menyentuh yang lain.'],
  ],
  notes: [
    'Semua warna ilustrasi adalah variabel CSS tanpa nilai tetap di komponen, jadi bisa dipasang di :root, di berkas tema, atau di pembungkus mana pun. Contoh: :root { --u-ilus-utama: var(--u-primary); --u-ilus-baju: var(--u-secondary); }',
  ],
};

const GAYA: Array<[string, React.CSSProperties]> = [
  ['Bawaan (warna fitur)', {}],
  ['Ikut warna merek', { ['--u-ilus-utama' as string]: 'var(--u-primary)' }],
  [
    'Tema hijau',
    {
      ['--u-ilus-utama' as string]: '#16a36a',
      ['--u-ilus-baju' as string]: '#0f766e',
      ['--u-ilus-aksen-1' as string]: '#facc15',
      ['--u-ilus-aksen-2' as string]: '#86efac',
      ['--u-ilus-pita' as string]: '#f97316',
    },
  ],
  [
    'Monokrom',
    {
      ['--u-ilus-utama' as string]: '#475569',
      ['--u-ilus-baju' as string]: '#334155',
      ['--u-ilus-aksen-1' as string]: '#94a3b8',
      ['--u-ilus-aksen-2' as string]: '#cbd5e1',
      ['--u-ilus-aksen-3' as string]: '#64748b',
      ['--u-ilus-aksen-4' as string]: '#94a3b8',
      ['--u-ilus-pita' as string]: '#94a3b8',
      ['--u-ilus-pipi' as string]: '#cbd5e1',
    },
  ],
];

export function Tema() {
  const [i, setI] = React.useState(1);
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        {GAYA.map(([l], k) => (
          <Button key={l} size="sm" variant={k === i ? 'primary' : 'outline'} onClick={() => setI(k)}>
            {l}
          </Button>
        ))}
      </div>
      <div style={{ ...GAYA[i][1], display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(12rem, 1fr))', gap: '1rem' }}>
        {['kosong', 'akademik', 'sukses'].map((n) => (
          <Ilustrasi key={n} nama={n} lebar="100%" />
        ))}
      </div>
    </div>
  );
}

const KEADAAN: string[] = [...ILUSTRASI_KEADAAN];
const FITUR: string[] = [...ILUSTRASI_FITUR];

function Kisi({ nama }: { nama: string[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(12rem, 1fr))', gap: '1rem' }}>
      {nama.map((n) => (
        <figure
          key={n}
          style={{ margin: 0, display: 'grid', justifyItems: 'center', gap: '.25rem', padding: '.75rem', border: '1px solid var(--u-border)', borderRadius: 'calc(var(--u-radius) + 4px)' }}
        >
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

export function Fitur() {
  return <Kisi nama={FITUR} />;
}

const BARANG: Array<AksesoriTokoh | ''> = ['', 'laptop', 'kaca', 'dokumen', 'ijazah', 'ponsel', 'buku', 'kunci', 'piala', 'kartu'];
const PAKAIAN: AksesoriTokoh[] = ['toga', 'jubah', 'jas', 'ransel', 'kacamata', 'headset'];

export function Karakter() {
  const [pose, setPose] = React.useState<PoseTokoh>('tunjuk');
  const [gaya, setGaya] = React.useState<GayaTokoh>('hijab');
  const [ekspresi, setEkspresi] = React.useState<EkspresiTokoh>('senang');
  const [barang, setBarang] = React.useState<AksesoriTokoh | ''>('laptop');
  const [pakai, setPakai] = React.useState<AksesoriTokoh[]>(['ransel']);
  const aksesori = [...pakai, ...(barang ? [barang] : [])];
  const opsi = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x || '(tanpa)' }));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))', gap: '1.25rem', alignItems: 'center' }}>
      <Ilustrasi nama="mahasiswa" tokoh={pose} gaya={gaya} ekspresi={ekspresi} aksesori={aksesori} lebar="100%" />
      <div style={{ display: 'grid', gap: '.75rem' }}>
        <Field label="Pose">
          <Select value={pose} onValueChange={(v) => setPose(v as PoseTokoh)} options={opsi(['jalan', 'tunjuk', 'duduk'])} />
        </Field>
        <Field label="Gaya">
          <Select value={gaya} onValueChange={(v) => setGaya(v as GayaTokoh)} options={opsi(['cepol', 'pendek', 'hijab', 'peci'])} />
        </Field>
        <Field label="Ekspresi">
          <Select value={ekspresi} onValueChange={(v) => setEkspresi(v as EkspresiTokoh)} options={opsi(['datar', 'senang', 'sedih', 'kaget', 'bingung'])} />
        </Field>
        <Field label="Barang di tangan">
          <Select value={barang} onValueChange={(v) => setBarang(v as AksesoriTokoh | '')} options={opsi(BARANG)} />
        </Field>
        <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
          {PAKAIAN.map((p) => (
            <Button key={p} size="sm" variant={pakai.includes(p) ? 'primary' : 'outline'} onClick={() => setPakai((x) => (x.includes(p) ? x.filter((y) => y !== p) : [...x, p]))}>
              {p}
            </Button>
          ))}
        </div>
        <code
          style={{ fontSize: '.8rem', whiteSpace: 'pre-wrap' }}
        >{`<Ilustrasi nama="mahasiswa" tokoh="${pose}" gaya="${gaya}" ekspresi="${ekspresi}" aksesori={${JSON.stringify(aksesori)}} />`}</code>
      </div>
    </div>
  );
}

export function Modul() {
  return <Kisi nama={Object.keys(ADEGAN).filter((k) => !KEADAAN.includes(k) && !FITUR.includes(k))} />;
}
