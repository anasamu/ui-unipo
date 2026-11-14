import { Button, Faq } from 'unipo-ui';
import { FaqPortal } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';
import { jsxProps } from '../Playground';

export const meta: DemoMeta = {
  title: 'FAQ',
  category: 'Tampilan data',
  layout: 'wide',
  description:
    'Tanya jawab dengan pencarian, pil kategori bernomor, akordeon, dan kotak kontak. FaqPortal mengambil isi dari /v1/portal/faq sehingga dikelola dari Humas atau Pustikom tanpa ubah kode.',
  importLine: "import { Faq } from 'unipo-ui';\nimport { FaqPortal } from 'unipo-ui/siakad';",
  demos: {
    Halaman: "FaqPortal layout='split' untuk halaman FAQ",
    Bagian: 'FaqPortal satu kategori di landing page',
    Statis: 'Faq dengan data sendiri',
  },
  props: [
    ['items', 'FaqItem[]', '{ id, question, answer, category }. Jawaban teks mempertahankan baris baru.'],
    ['layout', "'stack' | 'split'", 'Split: judul, cari, dan kategori di kiri (menempel), pertanyaan di kanan.'],
    ['variant', "'line' | 'card'", 'Garis pemisah atau kartu per pertanyaan.'],
    ['searchable / categories', 'boolean', 'Bawaan otomatis: cari bila lebih dari 5 pertanyaan, kategori bila lebih dari satu.'],
    ['contact', '{ title, description, action }', 'Kotak "Masih ada pertanyaan?" di bawah daftar.'],
    ['FaqPortal.situs / kategori / turunan / bahasa', '…', 'Saring per situs atau kategori, sertakan situs turunan, pakai kolom _en.'],
  ],
  playground: {
    controls: [
      { name: 'layout', type: 'select', options: ['stack', 'split'], default: 'stack' },
      { name: 'variant', type: 'select', options: ['line', 'card'], default: 'line' },
      { name: 'title', label: 'Judul', type: 'text', default: 'Pertanyaan umum' },
    ],
    render: (p) => (
      <div style={{ width: '100%' }}>
        <FaqPortal situs="univ" jumlah={6} {...p} />
      </div>
    ),
    code: (p) => `<FaqPortal situs="univ" jumlah={6}${jsxProps(p, { layout: 'stack', variant: 'line' })} />`,
  },
};

export function Halaman() {
  return (
    <FaqPortal
      situs="univ"
      layout="split"
      title="Pertanyaan yang sering diajukan"
      description="Jawaban singkat seputar pendaftaran, perkuliahan, keuangan, dan akun kampus."
      openFirst
      contact={{ description: 'Tim layanan menjawab pada hari kerja, 08.00–16.00 WITA.', action: <Button variant="outline">Hubungi kami</Button> }}
    />
  );
}

export function Bagian() {
  return (
    <div style={{ maxWidth: 720 }}>
      <FaqPortal situs="univ" kategori="1" title="Seputar pendaftaran" variant="card" />
    </div>
  );
}

export function Statis() {
  return (
    <div style={{ maxWidth: 720 }}>
      <Faq
        items={[
          { id: 1, question: 'Kapan nilai semester dirilis?', answer: 'Paling lambat dua minggu setelah ujian akhir semester. Notifikasi dikirim ke email kampus.' },
          { id: 2, question: 'Bagaimana jika nilai tidak muncul?', answer: 'Pastikan kuesioner evaluasi dosen sudah diisi. Bila masih kosong, hubungi BAAK lewat menu Layanan.' },
          { id: 3, question: 'Bisakah memperbaiki nilai?', answer: 'Bisa lewat semester pendek atau mengulang di semester reguler. Nilai terbaik yang dipakai di transkrip.' },
        ]}
      />
    </div>
  );
}
