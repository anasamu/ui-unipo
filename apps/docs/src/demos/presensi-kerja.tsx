import {
  AntreanTinjauPresensi,
  DaftarPerangkatPresensi,
  KelolaAreaPresensi,
  KelolaJadwalKerja,
  KelolaPenugasanPresensi,
  KoreksiPresensiKerja,
  ModulPresensiKerjaSaya,
  PetaKehadiran,
  RiwayatPresensiKerja,
} from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Presensi kerja (lokasi)',
  category: 'Per kegunaan',
  layout: 'wide',
  order: 5,
  badge: 'baru',
  description:
    'Antarmuka untuk /v1/sdm/presensi: presensi masuk/pulang dosen dan tendik dengan bukti lokasi (area radius/poligon per kampus/unit), jam server, swafoto bila jadwal mewajibkan, kunci idempoten, tinjauan atasan untuk presensi di luar area atau berisiko, koreksi, perangkat, jadwal/shift, dan penugasan. Kontrak yang sama dipakai aplikasi mobile (lihat docs/PRESENSI_KERJA.md di SIAKAD dan `catatPresensiKerja` di SDK).',
  importLine:
    "import { ModulPresensiKerjaSaya, PresensiKerjaSaya, AntreanTinjauPresensi, PetaKehadiran, KelolaAreaPresensi, KelolaJadwalKerja, KelolaPenugasanPresensi, KoreksiPresensiKerja, DaftarPerangkatPresensi } from 'unipo-ui/siakad';",
  demos: {
    Pegawai: 'ModulPresensiKerjaSaya: hari ini (peta + tombol), riwayat, koreksi, perangkat',
    Tinjauan: 'AntreanTinjauPresensi: atasan langsung / petugas SDM menerima atau menolak',
    PetaHadir: 'PetaKehadiran: titik presensi satu tanggal di atas area',
    Area: 'KelolaAreaPresensi: Kampus 1, Kampus 2 (poligon), gedung unit',
    Jadwal: 'KelolaJadwalKerja: jam tetap, shift lintas hari, fleksibel',
    Penugasan: 'KelolaPenugasanPresensi: siapa memakai jadwal dan area mana',
    Koreksi: 'KoreksiPresensiKerja sebagai penyetuju',
    Perangkat: 'DaftarPerangkatPresensi sebagai petugas SDM',
    Riwayat: 'RiwayatPresensiKerja sebagai petugas SDM (semua status)',
  },
  props: [
    ['PresensiKerjaSaya.perangkat', '{ id, nama?, platform?, versi_app? }', 'Identitas perangkat. Bawaan: ID acak peramban ini (localStorage), platform web.'],
    ['RiwayatPresensiKerja.sebagai', "'saya' | 'penyetuju' | 'semua'", 'Percobaan sendiri, bawahan/unit yang bisa ditinjau, atau semua (petugas SDM).'],
    ['KoreksiPresensiKerja.sebagai', "'saya' | 'penyetuju'", 'Ajukan/batalkan, atau setujui/tolak.'],
    ['DaftarPerangkatPresensi.sebagai', "'saya' | 'kelola'", 'Lepas perangkat sendiri, atau setujui/blokir (petugas SDM).'],
    ['pesanGalatPresensiKerja(e)', '(galat) => string', 'Pesan untuk kode tetap: lokasi_wajib, akurasi_rendah, di_luar_area, alasan_wajib, lokasi_palsu, perangkat_menunggu, di_luar_jendela, sedang_cuti, foto_wajib, sudah_masuk, ...'],
    ['cocokkanAreaPresensi(area, posisi)', '{ diArea, area, jarakM }', 'Pratinjau di klien; keputusan tetap di server.'],
  ],
  notes: [
    'Waktu presensi selalu jam server. Layar menampilkan jam server berjalan dan memberi tahu bila jam perangkat selisih lebih dari 5 menit.',
    'Bila di luar area dan kebijakan "tinjau", layar meminta alasan lalu presensi menunggu atasan. Bila kebijakan "tolak", presensi ditolak dengan jarak ke area terdekat.',
    'Scope token: sdm:read dan sdm:write. Data di halaman ini rekaan; peta memakai ubin OpenStreetMap. Izinkan lokasi di peramban untuk melihat posisi Anda.',
  ],
};

export function Pegawai() {
  return <ModulPresensiKerjaSaya perangkat={{ id: 'demo-perangkat', nama: 'Peramban demo', platform: 'web' }} />;
}
export function Tinjauan() {
  return <AntreanTinjauPresensi />;
}
export function PetaHadir() {
  return <PetaKehadiran />;
}
export function Area() {
  return <KelolaAreaPresensi />;
}
export function Jadwal() {
  return <KelolaJadwalKerja />;
}
export function Penugasan() {
  return <KelolaPenugasanPresensi />;
}
export function Koreksi() {
  return <KoreksiPresensiKerja sebagai="penyetuju" />;
}
export function Perangkat() {
  return <DaftarPerangkatPresensi sebagai="kelola" />;
}
export function Riwayat() {
  return <RiwayatPresensiKerja sebagai="semua" />;
}
