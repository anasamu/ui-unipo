import { DashboardGrid, Panel } from 'unipo-ui';
import { AgendaLms, DaftarKelasLms, KuisTerbuka, ProgresKelas, RingkasanLms, TugasMendatang } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'LMS e-learning',
  category: 'LMS',
  layout: 'full',
  order: 7,
  description:
    'Widget e-learning langsung dari /v1/lms: ringkasan beranda, kartu kelas dengan sampul abstrak dan progres penyelesaian, tugas mendatang dengan hitung mundur tenggat, kuis yang sedang dibuka, agenda (tenggat, kuis, kelas daring, presensi), dan progres per mahasiswa untuk pengajar.',
  importLine: "import { RingkasanLms, DaftarKelasLms, TugasMendatang, KuisTerbuka, AgendaLms, ProgresKelas } from 'unipo-ui/siakad';",
  demos: {
    Beranda: 'Komposisi beranda mahasiswa',
    Kelas: 'DaftarKelasLms dengan progres',
    Tugas: 'TugasMendatang dan KuisTerbuka',
    Agenda: 'AgendaLms 14 hari ke depan',
    Progres: 'ProgresKelas: tampilan mahasiswa dan pengajar',
  },
  props: [
    ['DaftarKelasLms.status', "'aktif' | 'selesai' | 'draf' | 'arsip'", 'Bawaan aktif.'],
    ['DaftarKelasLms.tampilProgres', 'boolean', 'Ambil progres tiap kelas (hanya kelas berperan mahasiswa). Bawaan true.'],
    ['KartuKelas.progres', 'number | null', 'Pakai KartuKelas langsung bila data kelas sudah ada di tangan.'],
    ['TugasMendatang.batas', 'number', 'Jumlah tugas yang ditampilkan. Bawaan 6.'],
    ['AgendaLms.hari', 'number', 'Rentang hari ke depan (maks. 120). Bawaan 14.'],
    ['ProgresKelas.ambang', 'number', 'Batas persen yang dianggap tertinggal. Bawaan 50.'],
  ],
  notes: [
    'Butuh token pengguna dengan scope lms:read. Sampul kelas tanpa foto dibuat dari ID kelas sehingga tiap kelas punya pola tetap.',
    'Endpoint progres hanya memuat NIM; ProgresKelas mengambil nama dari daftar peserta kelas untuk tampilan pengajar.',
  ],
};

export function Beranda() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <RingkasanLms />
      <DashboardGrid>
        <Panel title="Tugas mendatang">
          <TugasMendatang batas={4} href={(t) => `#tugas-${t.id}`} />
        </Panel>
        <Panel title="Kuis dibuka">
          <KuisTerbuka href={(k) => `#kuis-${k.id}`} />
        </Panel>
      </DashboardGrid>
    </div>
  );
}
export function Kelas() {
  return <DaftarKelasLms href={(k) => `#kelas-${k.id}`} />;
}
export function Tugas() {
  return (
    <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
      <TugasMendatang />
      <KuisTerbuka href={(k) => `#kuis-${k.id}`} />
    </div>
  );
}
export function Agenda() {
  return <AgendaLms onPilih={() => undefined} />;
}
export function Progres() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Panel title="Progres saya" description="Basis Data · tampilan mahasiswa">
        <ProgresKelas kelasId={41} />
      </Panel>
      <Panel title="Progres peserta" description="Tampilan pengajar, diurutkan dari yang paling tertinggal">
        <ProgresKelas kelasId={900} />
      </Panel>
    </div>
  );
}
