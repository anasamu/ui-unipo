/*
 * Komponen akademik bersama (KRS, KHS, transkrip, jadwal mingguan, tahapan kalender akademik, kartu portal, unggah
 * berkas akademik). Semua menerima data respons API SIAKAD /v1 apa adanya lewat props, sehingga Fakultas, BAAK,
 * Dashboard/portal, dan aplikasi lain menampilkan data akademik dengan satu tampilan yang sama. Skala nilai dan
 * predikat diambil dari server (useSkalaNilai, usePredikatKelulusan), bukan daftar tetap.
 */
export {
  skalaBerlaku,
  normalSkala,
  cariSkala,
  nadaNilai as nadaNilaiSkala,
  predikatDariIpk,
  useSkalaNilai,
  usePredikatKelulusan,
  type BarisSkalaNilai,
  type PredikatKelulusan,
  type SumberSkala,
  type NadaNilai,
} from './skala';
export {
  nomorHari,
  namaHari,
  type BarisKrs,
  type DataKrs,
  type BarisNilaiMk,
  type IndeksPrestasi,
  type PeriodeKhs,
  type DataTranskrip,
  type SesiKuliah,
  type IdentitasAkademik,
} from './tipe';
export {
  LencanaNilai,
  LegendaSkalaNilai,
  SebaranNilaiSkala,
  TabelNilaiMk,
  DeretAngka,
  KepalaAkademik,
  type LencanaNilaiProps,
  type TabelNilaiMkProps,
  type AngkaRingkas,
  type KeadaanDataProps,
} from './bersama';
export { RingkasanKrs, TabelKrs, statusKrs, teksWaktuKuliah, type RingkasanKrsProps, type TabelKrsProps } from './krs';
export { LembarKhs, type LembarKhsProps } from './khs';
export { LembarTranskrip, hitungIp, type LembarTranskripProps, type TampilanTranskrip } from './transkrip';
export { JadwalMingguan, KuliahHariIni, tataJadwal, warnaMk, type JadwalMingguanProps, type KuliahHariIniProps, type TataSesi } from './jadwal';
export { TahapanAkademik, keadaanTahapan, tahapanSaatIni, type TahapanAkademikProps, type TahapanKalender, type KeadaanTahapan } from './tahapan';
export { PortalAkademikMahasiswa, PortalMengajarDosen, type PortalAkademikMahasiswaProps, type PortalMengajarDosenProps, type TautanPortal } from './portal';
export {
  UnggahBerkasAkademik,
  type UnggahBerkasAkademikProps,
  type SyaratBerkasAkademik,
  type LampiranBerkasAkademik,
  type StatusSyaratBerkas,
} from './unggah';
export { useJadwalMahasiswa, useTahapanPeriode } from './hooks';
