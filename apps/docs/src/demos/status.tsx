import { Activity, Database, Globe, KeyRound, RefreshCw } from 'lucide-react';
import { Button, LatencyIndicator, ServiceList, ServiceStatusBadge, ServiceStatusPanel, StatusBanner, type ServiceInfo } from 'unipo-ui';
import { IntegrasiAktif, StatusLayananKampus, StatusLayananUnipo } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Status layanan',
  category: 'Statistik',
  layout: 'normal',
  order: 1,
  description: 'Komponen halaman status: spanduk keseluruhan, daftar layanan dengan ikon, alamat, waktu tanggap, dan lencana, bilah ketersediaan harian, serta pemeriksa otomatis dengan tombol Periksa ulang. Versi SIAKAD memeriksa gerbang API dan database lewat GET /v1/health.',
  importLine: "import { ServiceStatusPanel, StatusBanner, ServiceList } from 'unipo-ui';\nimport { StatusLayananUnipo, StatusLayananKampus, IntegrasiAktif } from 'unipo-ui/siakad';",
  demos: {
    Siakad: 'StatusLayananUnipo (system.health)',
    Kampus: 'StatusLayananKampus (registri Pustikom, /v1/infra/status)',
    Gangguan: 'StatusLayananKampus hanyaGangguan: banner di atas aplikasi',
    Spanduk: 'StatusBanner untuk setiap keadaan',
    Riwayat: 'ServiceList dengan bilah ketersediaan 30 hari',
    Pemeriksa: 'ServiceStatusPanel dengan pemeriksa sendiri',
    Integrasi: 'IntegrasiAktif (integrasi.getStatus)',
    Kecil: 'Lencana dan latensi',
  },
  props: [
    ['ServiceInfo.status', "'ok' | 'degraded' | 'down' | 'maintenance' | 'off' | 'checking'", 'Menentukan warna dan teks lencana.'],
    ['ServiceInfo.latency', 'number', 'Milidetik; kuning bila lewat ambang lambat, merah bila 3×.'],
    ['ServiceInfo.history', '{ date, status, note }[]', 'Riwayat harian untuk UptimeBar.'],
    ['ServiceCheck.check', '(signal) => Promise', 'Lempar galat bila gagal; latensi diukur otomatis.'],
    ['intervalMs', 'number', 'Periksa ulang otomatis (bawaan 60 detik, 0 = mati).'],
    ['StatusLayananKampus.kode', 'string[]', 'Hanya layanan dengan kode ini; bawaan semua layanan di registri Pustikom.'],
    ['StatusLayananKampus.hanyaGangguan', 'boolean', 'Hanya spanduk, dan hanya saat ada layanan terganggu/mati.'],
  ],
};

export function Siakad() {
  return <StatusLayananUnipo extra={[{ key: 'sso', name: 'Login SSO & konsol', url: 'data:application/json,{}', description: 'https://sso.unipo.ac.id', icon: <KeyRound /> }]} />;
}

export function Kampus() {
  return <StatusLayananKampus />;
}

export function Gangguan() {
  return <StatusLayananKampus hanyaGangguan kode={['lms']} />;
}

export function Spanduk() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <StatusBanner status="ok" checkedAt={new Date(2026, 10, 14, 21, 2, 23)} note="diperbarui tiap menit" />
      <StatusBanner status="degraded" note="Waktu tanggap database di atas normal" action={<Button size="sm" variant="outline"><RefreshCw /> Periksa ulang</Button>} />
      <StatusBanner status="down" title="Login SSO sedang terganggu" note="Tim Pustikom sedang menangani · mulai 20.41" />
      <StatusBanner status="maintenance" note="Sabtu 22.00–23.00 WITA: pembaruan server SIAKAD" />
    </div>
  );
}

const hari = (n: number) => Array.from({ length: n }, (_, i) => {
  const d = new Date(2026, 10, 14 - (n - 1 - i));
  const date = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  return { date, status: (i === 9 ? 'down' : i === 21 || i === 22 ? 'degraded' : 'ok') as 'ok' | 'down' | 'degraded', note: i === 9 ? 'Gangguan 14 menit' : undefined };
});
const LAYANAN: ServiceInfo[] = [
  { key: 'api', name: 'Gerbang API', description: 'https://api.unipo.ac.id/v1', icon: <Globe />, status: 'ok', latency: 176, history: hari(30) },
  { key: 'db', name: 'Database SIAKAD', description: 'Terhubung', icon: <Database />, status: 'degraded', latency: 1240, history: hari(30).map((h, i) => (i > 26 ? { ...h, status: 'degraded' as const } : h)) },
  { key: 'feeder', name: 'Neo Feeder PDDikti', description: 'Sinkronisasi terakhir 20.30', icon: <Activity />, status: 'down', latency: 10000, detail: '503', history: hari(30).map((h, i) => (i === 29 ? { ...h, status: 'down' as const } : h)) },
];
export function Riwayat() {
  return <ServiceList services={LAYANAN} />;
}

export function Pemeriksa() {
  const tunggu = (ms: number, gagal = false) => (signal: AbortSignal) => new Promise<void>((ok, no) => { const t = setTimeout(() => (gagal ? no(Object.assign(new Error('Gagal'), { status: 502 })) : ok()), ms); signal.addEventListener('abort', () => clearTimeout(t)); });
  return (
    <ServiceStatusPanel
      intervalMs={30_000}
      checks={[
        { key: 'portal', name: 'Portal kampus', description: 'https://unipo.ac.id', icon: <Globe />, check: tunggu(120) },
        { key: 'lms', name: 'E-Learning', description: 'https://e-learning.unipo.ac.id', icon: <Globe />, check: tunggu(340) },
        { key: 'pmb', name: 'PMB', description: 'https://pmb.unipo.ac.id', icon: <Globe />, check: tunggu(260, true) },
      ]}
    />
  );
}

export function Integrasi() {
  return <IntegrasiAktif />;
}

export function Kecil() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      <ServiceStatusBadge status="ok" />
      <ServiceStatusBadge status="degraded" />
      <ServiceStatusBadge status="down">Gangguan (502)</ServiceStatusBadge>
      <ServiceStatusBadge status="maintenance" />
      <ServiceStatusBadge status="off" />
      <ServiceStatusBadge status="checking" />
      <LatencyIndicator ms={176} />
      <LatencyIndicator ms={940} />
      <LatencyIndicator ms={3200} />
    </div>
  );
}
