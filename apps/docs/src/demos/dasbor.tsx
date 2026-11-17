import {
  CorongPmb,
  KrsPerSemester,
  PosisiAnggaran,
  RingkasanPmb,
  SiklusPpepp,
  StatusAlumni,
  TindakanArsip,
  AntreanLppm,
  DasborAkademik,
  DasborArsip,
  DasborHumas,
  DasborKepegawaian,
  DasborKeuangan,
  DasborLppm,
  DasborPmb,
  DasborSpmi,
  DasborTracer,
  RingkasanSpmi,
} from 'unipo-ui/siakad';
import { DashboardGrid, Select } from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Dasbor unit kerja',
  category: 'Statistik',
  layout: 'full',
  order: 5,
  description:
    'Dasbor siap pakai untuk BAAK, keuangan, kepegawaian, SPMI, LPPM, arsip, humas, PMB, dan tracer study. Tiap dasbor memanggil endpoint ringkasan modulnya lewat SDK, lalu menyusun kartu angka, grafik, dan antrean tindakan. Data di halaman ini adalah contoh.',
  importLine:
    "import { CorongPmb, KrsPerSemester, PosisiAnggaran, RingkasanPmb, SiklusPpepp, StatusAlumni, TindakanArsip, AntreanLppm, DasborAkademik, DasborKeuangan, DasborKepegawaian, DasborSpmi, DasborLppm, DasborArsip, DasborHumas, DasborPmb, DasborTracer } from 'unipo-ui/siakad';",
  demos: {
    Widget: 'Widget kecil per fitur, disusun bebas (dasbor pimpinan)',
    Akademik: 'BAAK: DasborAkademik (dasbor.getRingkas + getTren)',
    Keuangan: 'DasborKeuangan (keu.getSerapan)',
    Kepegawaian: 'DasborKepegawaian (sdm.getLaporanRingkasan)',
    Spmi: 'DasborSpmi (spmi.getDasbor)',
    SpmiKosong: 'RingkasanSpmi saat belum ada periode SPMI (API 404): keadaan kosong, bukan galat',
    Lppm: 'DasborLppm (lppm.getRekapDasbor)',
    Arsip: 'DasborArsip (arsip.getLaporanRingkasan)',
    Humas: 'DasborHumas (humas.getRingkasan)',
    Pmb: 'DasborPmb (pmb.getAdminStatistik)',
    Tracer: 'DasborTracer (tracer.getStatistik)',
  },
  props: [
    [
      'Widget per modul',
      '',
      'BAAK: RingkasanAkademik, KrsPerSemester, MabaLulusanPerSemester, IpsPerSemester, StatusMahasiswa, MahasiswaPerProdi, RasioDosenPerProdi. Keuangan: RingkasanKeuangan, PosisiAnggaran, SerapanPerUnit, RealisasiPerAkun. Kepegawaian: RingkasanKepegawaian, JabatanAkademikDosen, StatusKepegawaian, PendidikanPegawai, UsiaPegawai, TendikPerJenis, GolonganPegawai. SPMI: RingkasanSpmi, SiklusPpepp, CapaianPerBidang, PemenuhanIndikator, TemuanAmi, TindakanSpmi, PelaporanPddikti. LPPM: RingkasanLppm, AntreanLppm, KegiatanLppmPerStatus, DanaLppmPerSumber, SkemaHibah, LuaranLppm. Arsip: RingkasanArsip, SuratPerBulan, TindakanArsip, KlasifikasiSurat, StatusSurat. Humas: RingkasanHumas, TayanganHarian, KontenTerpopuler, AntreanReview, JadwalTerbit, AktivitasRedaksi. PMB: RingkasanPmb, CorongPmb, PendaftarHarianPmb, PeminatPerProdi, SumberInformasiPmb, ReferalPmb. Tracer: RingkasanTracer, StatusAlumni, AlumniPerTahunLulus, KeterlacakanPerProdi, InstansiAlumni.',
    ],
    [
      'Hook data',
      '',
      'useRingkasAkademik, useTrenAkademik, useSerapanAnggaran, useRingkasanSdm, useDasborSpmi, useRekapLppm, useLaporanArsip, useRingkasanHumas, useStatistikPmb, useStatistikTracer: untuk menyusun tampilan sendiri dari data yang sama.',
    ],
    ['title, description, span', '', 'Semua widget panel menerima judul pengganti dan lebar kolom di DashboardGrid.'],
    ['title / description', 'ReactNode', 'Kepala dasbor. `title={null}` menyembunyikan kepala bila halaman sudah punya judul.'],
    ['actions', 'ReactNode', 'Kontrol di kanan kepala, mis. Select periode, unit, atau gelombang.'],
    ['tahunId, kodeProdi', 'string', 'DasborAkademik: semester (mis. "20261") dan satu prodi. Bawaan semester aktif dan semua prodi.'],
    ['periodeId, unitId', 'number', 'DasborKeuangan, DasborSpmi, DasborKepegawaian, DasborArsip.'],
    ['hrefTugas', 'Record<string, string>', 'DasborLppm: tautan tiap antrean pengelola.'],
    ['hrefKonten', '({jenis, id}) => string', 'DasborHumas: tautan ke editor konten.'],
  ],
  notes: [
    'Widget dengan kueri yang sama berbagi satu panggilan API, jadi memasang CorongPmb dan PeminatPerProdi di satu halaman tetap satu permintaan ke /v1/pmb/admin/statistik.',
    'Tiap dasbor butuh token dengan scope modulnya (mis. dasbor:read, keu:read, sdm:read). Data dibatasi cakupan pemilik token di sisi API, jadi pimpinan fakultas hanya melihat unitnya.',
    'Semua grafik dari halaman Grafik & kartu angka bisa dipakai sendiri untuk menyusun dasbor lain.',
  ],
};

export function Widget() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <RingkasanPmb />
      <DashboardGrid>
        <CorongPmb />
        <KrsPerSemester span={2} description="Dari BAAK" />
        <PosisiAnggaran />
        <SiklusPpepp span={2} />
        <StatusAlumni />
        <AntreanLppm />
        <TindakanArsip title="Tindakan arsip" />
      </DashboardGrid>
    </div>
  );
}

export function Akademik() {
  return (
    <DasborAkademik
      hrefEws="#ews"
      actions={
        <Select
          aria-label="Prodi"
          defaultValue="semua"
          options={[
            { value: 'semua', label: 'Semua prodi' },
            { value: '55201', label: 'Informatika' },
            { value: '61201', label: 'Manajemen' },
          ]}
        />
      }
    />
  );
}
export function Keuangan() {
  return <DasborKeuangan />;
}
export function Kepegawaian() {
  return <DasborKepegawaian />;
}
export function Spmi() {
  return <DasborSpmi />;
}
export function SpmiKosong() {
  return <RingkasanSpmi periodeId={999} />;
}
export function Lppm() {
  return <DasborLppm tahun={2026} hrefTugas={{ usulan_menunggu_review: '#review' }} />;
}
export function Arsip() {
  return <DasborArsip />;
}
export function Humas() {
  return <DasborHumas hrefKonten={(k) => `#${k.jenis}-${k.id}`} />;
}
export function Pmb() {
  return (
    <DasborPmb
      actions={
        <Select
          aria-label="Gelombang"
          defaultValue="2"
          options={[
            { value: '1', label: 'Gelombang 1' },
            { value: '2', label: 'Gelombang 2' },
          ]}
        />
      }
    />
  );
}
export function Tracer() {
  return <DasborTracer />;
}
