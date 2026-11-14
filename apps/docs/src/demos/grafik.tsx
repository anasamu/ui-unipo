import { BookOpenCheck, GraduationCap, TriangleAlert, Users } from 'lucide-react';
import {
  ActionList,
  ActivityFeed,
  BarChart,
  BarList,
  BudgetMeter,
  CycleSteps,
  DashboardGrid,
  DonutChart,
  Funnel,
  GroupedBarChart,
  LineChart,
  Panel,
  SegmentBar,
  StatCard,
  StatGrid,
  formatRupiahRingkas,
} from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Grafik & kartu angka',
  category: 'Statistik',
  layout: 'wide',
  order: 2,
  description:
    'Bahan dasbor tanpa pustaka grafik luar: kartu angka dengan perubahan dan sparkline, batang, batang berkelompok, garis harian, daftar batang, donat, komposisi, corong, meter anggaran, siklus PPEPP, antrean tindakan, dan linimasa. Warna kategori memakai --u-chart-1 sampai --u-chart-8 dengan urutan tetap yang sudah diuji aman untuk buta warna di mode terang dan gelap.',
  importLine: "import { StatCard, StatGrid, BarChart, LineChart, DonutChart, Funnel, Panel, DashboardGrid } from 'unipo-ui';",
  demos: {
    Kartu: 'StatCard dan StatGrid',
    Batang: 'BarChart dan GroupedBarChart',
    Garis: 'LineChart (garis bantu silang + tooltip)',
    Komposisi: 'DonutChart, SegmentBar, BarList',
    Alur: 'Funnel, BudgetMeter, CycleSteps',
    Tindakan: 'ActionList dan ActivityFeed',
  },
  props: [
    ['StatCard.delta', 'number', 'Perubahan dalam persen. Naik hijau, turun merah; `inverse` membalik (mis. jumlah DO).'],
    ['StatCard.trend', 'number[]', 'Deret kecil untuk sparkline.'],
    ['Panel.span', "1 | 2 | 3 | 'full'", 'Lebar kolom di DashboardGrid (3 kolom, turun ke 2 dan 1 sesuai lebar wadah).'],
    ['format', '(n) => string', 'Format nilai di sumbu, tooltip, dan legenda, mis. formatRupiahRingkas.'],
    ['DonutChart.maxSegments', 'number', 'Irisan di atas batas digabung jadi "Lainnya". Bawaan 6.'],
  ],
  notes: [
    'Satu grafik satu sumbu. Dua besaran berbeda skala dibuat dua grafik. Grafik satu seri memakai warna utama; legenda selalu memuat nilai sehingga warna bukan satu-satunya penanda.',
    'Warna kategori bisa diganti lewat token --u-chart-1 … --u-chart-8 (lihat halaman Tema). Jalankan pemeriksa palet sebelum mengganti agar tetap terbaca bagi buta warna.',
  ],
};

export function Kartu() {
  return (
    <StatGrid>
      <StatCard label="Mahasiswa aktif" icon={<Users />} value="3.436" delta={4.2} trend={[3120, 3180, 3210, 3290, 3330, 3436]} />
      <StatCard label="Mengisi KRS" icon={<BookOpenCheck />} value="3.104" delta={-1.8} deltaLabel="dari 2025/2026 Ganjil" trend={[3180, 3150, 3200, 3120, 3160, 3104]} />
      <StatCard label="Lulusan" icon={<GraduationCap />} value="486" delta={6.1} tone="success" />
      <StatCard label="Risiko tinggi (EWS)" icon={<TriangleAlert />} value="37" delta={12} inverse tone="danger" hint="perlu pendampingan" />
    </StatGrid>
  );
}

const SEM = ['22/23 Gn', '23/24 Gj', '23/24 Gn', '24/25 Gj', '24/25 Gn', '25/26 Gj', '25/26 Gn', '26/27 Gj'];
export function Batang() {
  return (
    <DashboardGrid>
      <Panel title="Pengisi KRS" span={2}>
        <BarChart highlightLast data={SEM.map((l, i) => ({ label: l, value: 2600 + i * 90 - (i % 2 ? 0 : 130) }))} />
      </Panel>
      <Panel title="Surat masuk vs keluar">
        <GroupedBarChart
          labels={['Jul', 'Agu', 'Sep', 'Okt', 'Nov']}
          series={[
            { label: 'Masuk', values: [62, 71, 88, 79, 54] },
            { label: 'Keluar', values: [41, 48, 66, 52, 38] },
          ]}
        />
      </Panel>
    </DashboardGrid>
  );
}

export function Garis() {
  const hari = Array.from({ length: 30 }, (_, i) => i + 1);
  return (
    <LineChart
      labels={hari.map((d) => `${d} Okt`)}
      series={[
        { label: 'Akun baru', values: hari.map((d) => Math.round(20 + d * 0.9 + Math.sin(d) * 6)) },
        { label: 'Formulir diajukan', values: hari.map((d) => Math.round(10 + d * 0.6 + Math.cos(d) * 4)) },
      ]}
    />
  );
}

export function Komposisi() {
  return (
    <DashboardGrid>
      <Panel title="Status kepegawaian">
        <DonutChart
          centerLabel="pegawai"
          data={[
            { label: 'Tetap yayasan', value: 286 },
            { label: 'Kontrak', value: 73 },
            { label: 'Honorer', value: 31 },
            { label: 'DPK', value: 22 },
          ]}
        />
      </Panel>
      <Panel title="Pendidikan tertinggi">
        <SegmentBar
          data={[
            { label: 'S3', value: 41 },
            { label: 'S2', value: 236 },
            { label: 'S1', value: 92 },
            { label: 'D3', value: 18 },
            { label: 'SMA', value: 25 },
          ]}
        />
      </Panel>
      <Panel title="Peminat per prodi">
        <BarList
          items={[
            { label: 'Informatika', value: 486, secondary: '301 pilihan 1' },
            { label: 'Manajemen', value: 402, secondary: '248 pilihan 1' },
            { label: 'PGSD', value: 359, secondary: '224 pilihan 1' },
            { label: 'Sistem Informasi', value: 312, secondary: '176 pilihan 1' },
          ]}
        />
      </Panel>
    </DashboardGrid>
  );
}

export function Alur() {
  return (
    <DashboardGrid>
      <Panel title="Corong PMB">
        <Funnel
          stages={[
            { label: 'Akun dibuat', value: 1846 },
            { label: 'Formulir diajukan', value: 1198 },
            { label: 'Lulus seleksi', value: 968 },
            { label: 'Daftar ulang', value: 812 },
          ]}
        />
      </Panel>
      <Panel title="Anggaran">
        <BudgetMeter target={11.1e9} used={6.4e9} pending={0.42e9} format={formatRupiahRingkas} label="Pagu 2026" />
      </Panel>
      <Panel title="Siklus PPEPP">
        <CycleSteps
          steps={[
            { label: 'Penetapan', done: true, detail: '32 standar berlaku' },
            { label: 'Pelaksanaan', done: true, detail: '85% capaian terisi' },
            { label: 'Evaluasi', done: true, detail: '14 auditee selesai' },
            { label: 'Pengendalian', done: false, detail: '23 temuan terbuka' },
            { label: 'Peningkatan', done: false },
          ]}
        />
      </Panel>
    </DashboardGrid>
  );
}

export function Tindakan() {
  return (
    <DashboardGrid>
      <Panel title="Perlu tindakan">
        <ActionList
          items={[
            { label: 'Usulan menunggu review', count: 9, href: '#' },
            { label: 'Disposisi lewat batas', count: 7, tone: 'danger', href: '#' },
            { label: 'Pencairan diajukan', count: 0 },
          ]}
        />
      </Panel>
      <Panel title="Aktivitas terbaru" span={2}>
        <ActivityFeed
          items={[
            { id: 1, title: 'Tim robotik UNIPO juara 2 KRI regional', meta: 'nurhayati mengajukan review', time: '2 jam lalu' },
            { id: 2, title: 'Seminar nasional ketahanan pangan', meta: 'humas.fp mengubah', time: '3 jam lalu' },
            { id: 3, title: 'Penandatanganan MoU dengan Pemprov', meta: 'admin.humas menerbitkan', time: 'kemarin' },
          ]}
        />
      </Panel>
    </DashboardGrid>
  );
}
