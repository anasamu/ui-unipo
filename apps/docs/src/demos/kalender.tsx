import { AgendaList, EventCalendar, EventLegend, EVENT_COLORS, type CalendarEvent } from 'unipo-ui';
import { JENIS_KEGIATAN, KalenderAkademik, KalenderSidebar } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Kalender akademik',
  category: 'Kalender akademik',
  layout: 'full',
  order: 1,
  description:
    'Kalender akademik dari GET /v1/kalender/terpadu: gabungan kegiatan kalender, tahapan tahun akademik, batas KRS/nilai per prodi, hari libur, agenda portal, dan jadwal PMB. Klik tanggal untuk melihat agendanya, klik legenda untuk menyaring jenis kegiatan. Di ponsel, chip kegiatan berubah jadi titik warna.',
  importLine: "import { KalenderAkademik, KalenderSidebar } from 'unipo-ui/siakad';\nimport { EventCalendar, AgendaList, EventLegend } from 'unipo-ui';",
  demos: {
    Penuh: 'KalenderAkademik (kalender.getTerpadu)',
    Sidebar: 'KalenderSidebar untuk portal dan dasbor',
    TanpaSdk: 'EventCalendar + AgendaList dengan data sendiri',
  },
  props: [
    ['kodeProdi', 'string', 'Batasi ke satu prodi (batas KRS/nilai prodi ikut tampil).'],
    ['tahunId', 'string', 'Tahun akademik 5 digit, mis. 20261.'],
    ['sumber', "('kalender' | 'libur' | 'tahun' | 'batas' | 'portal' | 'pmb')[]", 'Sumber yang diambil. Bawaan semua.'],
    ['icsUrl', 'string', 'Tampilkan tombol "Langganan .ics" (GET /v1/kalender/ics, tanpa token).'],
    ['onKegiatanClick', '(event) => void', 'Buka detail kegiatan sendiri, mis. di Sheet.'],
    ['KalenderSidebar.href', 'string', 'Tautan "Lihat semua" ke halaman kalender penuh.'],
  ],
};

export function Penuh() {
  return <KalenderAkademik icsUrl="https://api.unipo.ac.id/v1/kalender/ics" />;
}

export function Sidebar() {
  return (
    <div style={{ maxWidth: 320 }}>
      <KalenderSidebar href="/kalender" />
    </div>
  );
}

const hari = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const ACARA: CalendarEvent[] = [
  {
    id: 1,
    title: 'Bimbingan skripsi',
    start: hari(1),
    kind: 'akademik',
    time: '09.00–11.00',
    location: 'Ruang dosen 2.04',
  },
  { id: 2, title: 'Rapat prodi', start: hari(1), kind: 'rapat', time: '13.00' },
  {
    id: 3,
    title: 'Ujian proposal',
    start: hari(4),
    end: hari(5),
    kind: 'ujian',
    location: 'Lab Informatika',
  },
  {
    id: 4,
    title: 'Libur nasional',
    start: hari(8),
    kind: 'libur',
    holiday: true,
  },
];

export function TanpaSdk() {
  return (
    <div
      style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
        alignItems: 'start',
      }}
    >
      <EventCalendar events={ACARA} maxPerDay={2} />
      <div style={{ display: 'grid', gap: 12 }}>
        <EventLegend kinds={['akademik', 'rapat', 'ujian', 'libur']} labels={JENIS_KEGIATAN} colors={EVENT_COLORS} />
        <AgendaList events={ACARA} kindLabels={JENIS_KEGIATAN} />
      </div>
    </div>
  );
}
