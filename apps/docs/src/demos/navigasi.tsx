import * as React from 'react';
import { BookOpen, ClipboardCheck, ClipboardList, GraduationCap, Wallet } from 'lucide-react';
import { Accordion, Badge, Breadcrumb, Button, PageHeader, Pagination, Progress, ProgressRing, Stepper, Tabs } from 'unipo-ui';
import type { DemoMeta } from '../registry';
import { jsxProps } from '../Playground';

export const meta: DemoMeta = {
  title: 'Tabs, Stepper & Pagination',
  category: 'Navigasi & alur',
  layout: 'wide',
  description: 'Komponen untuk berpindah antar bagian dan menunjukkan kemajuan: tab, langkah wizard, halaman, breadcrumb, akordeon, dan progres.',
  importLine: "import { Tabs, Stepper, Pagination, Breadcrumb, Accordion, Progress, ProgressRing } from 'unipo-ui';",
  demos: {
    TabGaris: 'Tabs garis bawah',
    TabPil: 'Tabs pil',
    Langkah: 'Stepper',
    LangkahVertikal: 'Stepper vertikal',
    Halaman: 'Pagination',
    Jejak: 'Breadcrumb',
    KepalaHalaman: 'PageHeader dengan ikon, lencana, dan breadcrumb',
    Faq: 'Accordion',
    Kemajuan: 'Progress',
  },
  playground: {
    title: 'Playground Tabs',
    controls: [
      { name: 'variant', type: 'select', options: ['underline', 'pill'], default: 'underline' },
      { name: 'ikon', label: 'Ikon', type: 'boolean', default: true },
      { name: 'count', label: 'Jumlah', type: 'boolean', default: true },
    ],
    render: ({ variant, ikon, count }) => (
      <div style={{ width: '100%', maxWidth: 560 }}>
        <Tabs
          variant={variant}
          items={[
            { value: 'krs', label: 'KRS', icon: ikon ? <ClipboardList /> : undefined, count: count ? 8 : undefined, content: <p>Daftar mata kuliah semester ini.</p> },
            { value: 'khs', label: 'KHS', icon: ikon ? <BookOpen /> : undefined, content: <p>Nilai semester lalu.</p> },
            { value: 'tagihan', label: 'Tagihan', icon: ikon ? <Wallet /> : undefined, count: count ? 1 : undefined, content: <p>Satu tagihan belum dibayar.</p> },
          ]}
        />
      </div>
    ),
    code: ({ variant, ikon, count }) =>
      `<Tabs${jsxProps({ variant }, { variant: 'underline' })}\n  items={[\n    { value: 'krs', label: 'KRS'${ikon ? ', icon: <ClipboardList />' : ''}${count ? ', count: 8' : ''}, content: <TabelKrs /> },\n    { value: 'khs', label: 'KHS'${ikon ? ', icon: <BookOpen />' : ''}, content: <TabelKhs /> },\n    { value: 'tagihan', label: 'Tagihan'${ikon ? ', icon: <Wallet />' : ''}${count ? ', count: 1' : ''}, content: <Tagihan /> },\n  ]}\n/>`,
  },
};

export function TabGaris() {
  return (
    <Tabs
      items={[
        { value: 'krs', label: 'KRS', icon: <ClipboardList />, count: 7, content: <p className="u-field-description">7 mata kuliah · 21 SKS</p> },
        { value: 'khs', label: 'KHS', icon: <BookOpen />, content: <p className="u-field-description">IPS semester lalu 3,64</p> },
        { value: 'transkrip', label: 'Transkrip', icon: <GraduationCap />, content: <p className="u-field-description">IPK 3,71 · 98 SKS</p> },
        { value: 'keuangan', label: 'Keuangan', icon: <Wallet />, content: <p className="u-field-description">Tidak ada tagihan.</p> },
      ]}
    />
  );
}

export function TabPil() {
  return (
    <Tabs
      variant="pill"
      items={[
        { value: 'semua', label: 'Semua' },
        { value: 'berita', label: 'Berita' },
        { value: 'agenda', label: 'Agenda' },
        { value: 'pengumuman', label: 'Pengumuman' },
      ]}
    />
  );
}

const STEPS = [
  { title: 'Data pribadi', description: 'NIK, TTL, alamat' },
  { title: 'Pendidikan', description: 'Sekolah asal' },
  { title: 'Pilihan prodi' },
  { title: 'Berkas', description: 'Ijazah, KK, foto' },
  { title: 'Pembayaran' },
];

export function Langkah() {
  const [cur, setCur] = React.useState(2);
  return (
    <div className="demo-stack">
      <Stepper steps={STEPS} current={cur} onStepClick={setCur} />
      <div className="demo-row">
        <Button variant="outline" size="sm" disabled={cur === 0} onClick={() => setCur(cur - 1)}>
          Kembali
        </Button>
        <Button size="sm" disabled={cur === STEPS.length - 1} onClick={() => setCur(cur + 1)}>
          Lanjut
        </Button>
      </div>
    </div>
  );
}

export function LangkahVertikal() {
  return (
    <Stepper
      orientation="vertical"
      current={2}
      steps={[
        { title: 'Pengajuan judul', description: 'Disetujui Kaprodi · 2 Sep 2026' },
        { title: 'Seminar proposal', description: 'Lulus dengan revisi · 14 Okt 2026' },
        { title: 'Bimbingan', description: '5 dari minimal 8 pertemuan' },
        { title: 'Ujian skripsi' },
        { title: 'Yudisium' },
      ]}
    />
  );
}

export function Halaman() {
  const [page, setPage] = React.useState(4);
  return <Pagination page={page} totalPages={25} total={245} perPage={10} onPageChange={setPage} />;
}

export function Jejak() {
  return <Breadcrumb items={[{ label: 'Beranda', href: '#' }, { label: 'Akademik', href: '#' }, { label: 'Mahasiswa', href: '#' }, { label: 'Siti Nurhaliza' }]} />;
}

export function Faq() {
  return (
    <Accordion
      variant="card"
      defaultValue={['1']}
      items={[
        { value: '1', title: 'Kapan pendaftaran gelombang 2 dibuka?', content: 'Gelombang 2 dibuka 1 Maret sampai 30 April 2027. Tes berbasis komputer dilaksanakan setiap Sabtu.' },
        { value: '2', title: 'Apakah bisa memilih dua program studi?', content: 'Bisa. Pilihan kedua dipertimbangkan bila kuota pilihan pertama penuh.' },
        { value: '3', title: 'Bagaimana cara membayar biaya pendaftaran?', content: 'Melalui virtual account bank mitra atau QRIS yang muncul di dasbor setelah formulir dikirim.' },
      ]}
    />
  );
}

export function Kemajuan() {
  return (
    <div className="demo-row" style={{ gap: 32, alignItems: 'center' }}>
      <div className="demo-stack" style={{ width: 320 }}>
        <Progress value={75} label="Kelengkapan profil" />
        <Progress value={18} max={24} label="SKS diambil" format={(v, m) => `${v}/${m} SKS`} tone="secondary" />
        <Progress value={92} label="Kehadiran" tone="success" />
        <Progress value={null} label="Mengimpor nilai…" />
      </div>
      <ProgressRing value={3.71} max={4} label="3,71" size={88} thickness={8} />
      <ProgressRing value={62} tone="warning" />
    </div>
  );
}

export function KepalaHalaman() {
  return (
    <PageHeader
      icon={<ClipboardCheck />}
      eyebrow="Penjaminan mutu"
      title="Audit mutu internal"
      badge={<Badge variant="info">Periode 2026</Badge>}
      description="Jadwal desk evaluation, visitasi, dan temuan per unit."
      breadcrumb={<Breadcrumb items={[{ label: 'Beranda', href: '#' }, { label: 'SPMI', href: '#' }, { label: 'AMI' }]} />}
      actions={<Button size="sm">Tambah audit</Button>}
    />
  );
}
