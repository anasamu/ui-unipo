import * as React from 'react';
import { Button, DashboardGrid, Panel } from 'unipo-ui';
import {
  DaftarNotifikasiLms,
  GabungKelasKodeLms,
  HalamanKelasLms,
  KalenderLms,
  HalamanKuisLms,
  HalamanMateriLms,
  HalamanTugasLms,
  HasilKuisLms,
  JadwalHariIniLms,
  KatalogKelasTerbuka,
  KelasDaringMendatang,
  LmsRuteProvider,
  RuangKuisLms,
  TenggatLms,
  DiskusiLms,
  type RuteLms,
  type TabKelasLms,
} from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'LMS mahasiswa',
  category: 'LMS',
  layout: 'full',
  order: 8,
  description:
    'Halaman belajar lengkap dari /v1/lms untuk aplikasi e-learning: kelas dengan tab (materi, tugas, kuis, forum, presensi, nilai, peserta, info), materi PDF/video/kelas daring, pengumpulan tugas dengan unggah berkas dan rubrik, ruang kuis dengan simpan otomatis dan peta soal, hasil dengan pembahasan, forum bertingkat, presensi kode, buku nilai, notifikasi, dan katalog kelas terbuka untuk landing page.',
  importLine: "import { HalamanKelasLms, HalamanMateriLms, HalamanTugasLms, HalamanKuisLms, RuangKuisLms, HasilKuisLms, DiskusiLms, LmsRuteProvider } from 'unipo-ui/siakad';",
  demos: {
    Kelas: 'HalamanKelasLms: kepala kelas + tab',
    Beranda: 'Widget beranda: kelas daring, tenggat, jadwal hari ini, notifikasi',
    Materi: 'HalamanMateriLms: kelas daring (Zoom/Meet) dan berkas',
    Tugas: 'HalamanTugasLms: instruksi, rubrik, kumpulkan',
    Kuis: 'HalamanKuisLms dan HasilKuisLms',
    Ruang: 'RuangKuisLms: mengerjakan kuis',
    Forum: 'DiskusiLms: utas bertingkat',
    Terbuka: 'KatalogKelasTerbuka dan GabungKelasKodeLms',
    Kalender: 'KalenderLms: agenda LMS + kalender akademik',
  },
  props: [
    [
      'LmsRuteProvider.rute',
      'Partial<RuteLms>',
      'Alamat halaman yang dipakai tautan di semua komponen. Bawaan: /kelas/:id, /materi/:id, /tugas/:id, /kuis/:id, /kuis/:id/kerjakan, /kuis/percobaan/:id, /forum/:id, /utas/:id.',
    ],
    ['HalamanKelasLms.tab', 'TabKelasLms', "Tab aktif: 'materi' | 'tugas' | 'kuis' | 'forum' | 'presensi' | 'nilai' | 'peserta' | 'info'."],
    ['HalamanKelasLms.onTabChange', '(tab) => void', 'Sinkronkan tab dengan router aplikasi.'],
    ['HalamanKuisLms.onMulai', '(kataSandi?) => void', 'Bawaan: simpan kata sandi lalu pindah ke rute.kerjakanKuis.'],
    ['RuangKuisLms.onSelesai', '(percobaan) => void', 'Bawaan: pindah ke halaman hasil.'],
    ['PresensiKelasLms.minimal', 'number', 'Batas minimal kehadiran (%) untuk ikut UAS. Bawaan 75.'],
    ['KatalogKelasTerbuka.onGabung', '(kelas) => void', 'Tanpa ini tombol Ikuti tidak tampil (mis. untuk pengunjung yang belum masuk).'],
  ],
  notes: [
    'Semua komponen memakai SDK dari <UnipoProvider>. Butuh token pengguna dengan scope lms:read dan lms:write. KatalogKelasTerbuka memanggil /v1/lms/terbuka yang publik, jadi bisa dipakai di landing page dengan klien SDK tanpa token.',
    'Tautan antarhalaman memakai <a href>. Di aplikasi SPA, cegat klik tautan internal dan teruskan ke router, atau atur alamatnya lewat LmsRuteProvider.',
    'Ruang kuis menyimpan jawaban otomatis 0,8 detik setelah berubah dan mencoba ulang tiap 5 detik bila gagal. Kuis dikirim otomatis saat waktu habis.',
    'Contoh: kode kelas BD2025, kode presensi K7Q2.',
  ],
};

// Docs memakai hash router: semua tautan contoh tetap di halaman ini.
const SINI = () => '#/lms-belajar';
const HASH: Partial<RuteLms> = { kelas: SINI, materi: SINI, tugas: SINI, kuis: SINI, kerjakanKuis: SINI, hasilKuis: SINI, forum: SINI, utas: SINI };
const Rute = ({ children }: { children: React.ReactNode }) => <LmsRuteProvider rute={HASH}>{children}</LmsRuteProvider>;

export function Kelas() {
  const [tab, setTab] = React.useState<TabKelasLms>('materi');
  return (
    <Rute>
      <HalamanKelasLms kelasId={41} tab={tab} onTabChange={setTab} />
    </Rute>
  );
}
export function Beranda() {
  return (
    <Rute>
      <div style={{ display: 'grid', gap: 16 }}>
        <KelasDaringMendatang />
        <DashboardGrid>
          <Panel title="Tenggat terdekat">
            <TenggatLms />
          </Panel>
          <Panel title="Jadwal hari ini">
            <JadwalHariIniLms nim="2355201010" />
          </Panel>
          <Panel title="Notifikasi">
            <DaftarNotifikasiLms batas={4} onPilih={() => undefined} />
          </Panel>
        </DashboardGrid>
      </div>
    </Rute>
  );
}
export function Materi() {
  return (
    <Rute>
      <div style={{ display: 'grid', gap: 32 }}>
        <HalamanMateriLms materiId={503} />
        <HalamanMateriLms materiId={501} />
      </div>
    </Rute>
  );
}
export function Tugas() {
  return (
    <Rute>
      <HalamanTugasLms tugasId={301} />
    </Rute>
  );
}
export function Kuis() {
  return (
    <Rute>
      <div style={{ display: 'grid', gap: 32 }}>
        <HalamanKuisLms kuisId={71} onMulai={() => undefined} />
        <HasilKuisLms percobaanId={801} kuisId={71} />
      </div>
    </Rute>
  );
}
export function Ruang() {
  const [kunci, setKunci] = React.useState(0);
  return (
    <Rute>
      <div style={{ border: '1px solid var(--u-border)', borderRadius: 12, overflow: 'hidden', maxHeight: 720, overflowY: 'auto' }}>
        <RuangKuisLms key={kunci} kuisId={71} onSelesai={() => setKunci((k) => k + 1)} onKeluar={() => undefined} />
      </div>
    </Rute>
  );
}
export function Forum() {
  return (
    <Rute>
      <DiskusiLms postId={901} />
    </Rute>
  );
}
export function Terbuka() {
  const [buka, setBuka] = React.useState(false);
  return (
    <Rute>
      <div style={{ display: 'grid', gap: 16 }}>
        <KatalogKelasTerbuka onGabung={() => undefined} />
        <div>
          <Button variant="outline" onClick={() => setBuka(true)}>
            Gabung dengan kode kelas
          </Button>
        </div>
        <GabungKelasKodeLms open={buka} onOpenChange={setBuka} />
      </div>
    </Rute>
  );
}
export function Kalender() {
  return (
    <Rute>
      <KalenderLms onBuka={() => undefined} />
    </Rute>
  );
}
