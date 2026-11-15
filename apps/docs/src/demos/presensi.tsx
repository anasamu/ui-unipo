import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from 'unipo-ui';
import {
  DaftarHadirSesi,
  DaftarIzinPresensi,
  FormSesiPresensi,
  KartuQrSaya,
  KelolaSesiPresensi,
  KelolaTitikPresensi,
  LayarKioskPresensi,
  LayarQrPresensi,
  ModulPresensiSaya,
  PengajuanIzinPresensi,
  PindaiPresensi,
  PresensiSaya,
  useDaftarSesiPresensi,
} from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Presensi QR',
  category: 'Per kegunaan',
  layout: 'wide',
  order: 4,
  badge: 'baru',
  description:
    'Antarmuka untuk /v1/presensi: presensi kuliah mahasiswa, dosen mengajar, kerja dosen/tendik lewat titik kiosk, dan kegiatan (rapat, seminar, upacara, ormawa). QR berganti tiap 20 detik dan ditandatangani server, jadi foto QR yang disebar cepat kedaluwarsa. Lokasi dan ID perangkat ikut dikirim untuk menandai titip absen. Sesi kuliah yang ditutup langsung disahkan ke presensi SIAKAD dan disalin ke kelas LMS; titik kerja menulis ke presensi SDM.',
  importLine:
    "import { KelolaSesiPresensi, LayarQrPresensi, PindaiPresensi, KartuQrSaya, DaftarHadirSesi, PresensiSaya, ModulPresensiSaya, PengajuanIzinPresensi, DaftarIzinPresensi, LayarKioskPresensi, KelolaTitikPresensi } from 'unipo-ui/siakad';",
  demos: {
    Kelola: 'KelolaSesiPresensi: daftar sesi, buat sesi, detail (layar QR, daftar hadir, pindai kartu, izin, jejak)',
    Layar: 'LayarQrPresensi: layar dosen/panitia untuk proyektor, dengan layar penuh',
    Peserta: 'ModulPresensiSaya: halaman presensi mahasiswa, dosen, atau tendik',
    Pindai: 'PindaiPresensi: kamera atau kode 6 huruf (coba kode dari layar QR)',
    Kartu: 'KartuQrSaya: kartu QR pribadi untuk meja registrasi',
    Hadir: 'DaftarHadirSesi: status per peserta, koreksi, tanda curiga',
    Formulir: 'FormSesiPresensi: sesi kuliah atau kegiatan',
    Izin: 'PengajuanIzinPresensi + DaftarIzinPresensi (penyetuju)',
    Kiosk: 'LayarKioskPresensi: tablet di gerbang/kantor (token presensi:kiosk)',
    Titik: 'KelolaTitikPresensi: titik presensi kerja',
  },
  props: [
    ['KelolaSesiPresensi.idj', 'number', 'Satu kelas SIAKAD, mis. halaman kelas dosen.'],
    ['KelolaSesiPresensi.lmsKelasId', 'number', 'Satu kelas LMS (dasbor LMS/fakultas); sesi memakai jadwal SIAKAD kelas itu dan disalin ke presensi LMS saat disahkan.'],
    ['renderQr', '(isi, { ukuran, gaya }) => ReactNode', 'Gambar QR dari aplikasi (mis. generator QR bergaya). Bawaan: SVG dari server (`?svg=1`, gaya "presensi" per bagian).'],
    ['PindaiPresensi.token', 'string | null', 'Token dari tautan `?t=` (kamera ponsel biasa). Bawaan dibaca dari URL halaman.'],
    ['PindaiPresensi.kirimLokasi', 'boolean', 'Kirim lokasi perangkat (bawaan true). Sesi yang mewajibkan lokasi menolak pindaian tanpa lokasi.'],
    ['LayarKioskPresensi.titik', 'string', 'Kode, UUID, atau ID titik. Perangkat kiosk memakai token aplikasi berscope presensi:kiosk.'],
    ['DaftarIzinPresensi.sebagai', "'saya' | 'penyetuju'", 'Izin saya, atau yang menunggu persetujuan saya.'],
    ['pesanGalatPresensi(e)', '(galat) => string', 'Pesan untuk qr_kedaluwarsa, di_luar_lokasi, lokasi_wajib, perangkat_ganda, sesi_tidak_dibuka.'],
  ],
  notes: [
    'Scope token: presensi:read dan presensi:write untuk semua pengguna, presensi:admin untuk admin presensi (semua sesi dan titik), presensi:kiosk untuk perangkat kiosk.',
    'Kamera memakai BarcodeDetector bila peramban mendukung, selain itu jsQR (Safari iOS). ID perangkat acak disimpan di localStorage.',
    'Kuliah: dosen yang membuka sesi tercatat hadir mengajar. Menutup sesi kuliah mengesahkan presensi semua peserta KRS ke SIAKAD (rekap, honor, syarat ujian membaca dari sana).',
    'Data dan gambar QR di halaman ini rekaan; QR tiruan tidak bisa dipindai. Pindai dengan kode cadangan yang tampil di layar QR.',
  ],
};

export function Kelola() {
  return <KelolaSesiPresensi />;
}

function useSesiBuka() {
  const q = useDaftarSesiPresensi({ status: 'buka' });
  return q.data?.[0]?.id ?? null;
}

export function Layar() {
  const id = useSesiBuka();
  return id ? <LayarQrPresensi sesiId={id} /> : null;
}

export function Peserta() {
  return <ModulPresensiSaya />;
}

export function Pindai() {
  return <PindaiPresensi token={null} />;
}

export function Kartu() {
  return <KartuQrSaya />;
}

export function Hadir() {
  const id = useSesiBuka();
  return id ? <DaftarHadirSesi sesiId={id} /> : null;
}

export function Formulir() {
  const [buka, setBuka] = React.useState(false);
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <FormSesiPresensi
        open={buka}
        onOpenChange={setBuka}
        jenis="kegiatan"
        trigger={
          <Button>
            <Plus aria-hidden /> Kegiatan baru
          </Button>
        }
        onSimpan={() => setBuka(false)}
      />
      <FormSesiPresensi
        trigger={
          <Button variant="outline">
            <Plus aria-hidden /> Pertemuan kuliah
          </Button>
        }
      />
    </div>
  );
}

export function Izin() {
  const [buka, setBuka] = React.useState(false);
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <PengajuanIzinPresensi open={buka} onOpenChange={setBuka} onSimpan={() => setBuka(false)} trigger={<Button variant="outline">Ajukan izin kuliah</Button>} />
      <DaftarIzinPresensi sebagai="penyetuju" />
      <PresensiSaya />
    </div>
  );
}

export function Kiosk() {
  return <LayarKioskPresensi titik="gerbang-utama" />;
}

export function Titik() {
  return <KelolaTitikPresensi alamatKiosk={(kode) => `#/kiosk/${kode}`} />;
}
