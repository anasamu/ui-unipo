# UNIPO UI

Sistem desain dan pustaka komponen untuk aplikasi Universitas Pohuwato (SIAKAD, PMB, LMS, portal fakultas, tracer study, humas, dan aplikasi yang memakai API SIAKAD).

> Dokumentasi lengkap dan screenshot komponen sedang disusun di PR ini. Jalankan `npm install && npm run dev` lalu buka http://localhost:5180.

| Paket | Isi |
|---|---|
| `packages/tokens` (`unipo-ui-tokens`) | Design token → CSS, SCSS, LESS, Tailwind, TypeScript/React Native, Kotlin Compose, XML Android |
| `packages/ui` (`unipo-ui`) | CSS kelas `u-*` + komponen React di atas [Base UI](https://base-ui.com) |
| `apps/docs` | Situs dokumentasi dan galeri komponen |

## Widget fitur (`unipo-ui/siakad`)

Widget kecil per fitur yang mengambil data sendiri lewat `unipo-siakad-sdk` (bungkus aplikasi dengan `SiakadProvider`). Tiap modul juga punya komponen dasbor yang menyusun widget-widgetnya.

| Modul | Contoh widget | Tangkapan layar |
|---|---|---|
| Akademik (BAAK) | `RingkasanAkademik`, `KrsPerSemester`, `StatusMahasiswa`, `DasborAkademik` | `docs/screenshots/dasbor--Akademik.png` |
| Keuangan, kepegawaian, SPMI, LPPM, arsip, humas, PMB, tracer | `PosisiAnggaran`, `JabatanAkademikDosen`, `SiklusPpepp`, `AntreanLppm`, `SuratPerBulan`, `AntreanReview`, `CorongPmb`, `StatusAlumni`, … | `docs/screenshots/dasbor--*.png` |
| Kurikulum OBE | `DaftarKurikulum`, `RingkasanKurikulum`, `ValidasiKurikulum`, `MatriksKurikulum`, `StrukturKurikulum`, `RpsMataKuliah`, `CapaianCplMahasiswa` | `docs/screenshots/kurikulum--*.png` |
| LMS | `RingkasanLms`, `DaftarKelasLms`, `KartuKelas`, `TugasMendatang`, `KuisTerbuka`, `AgendaLms`, `ProgresKelas` | `docs/screenshots/lms--*.png` |
| CBT | `DaftarUjianSaya`, `LembarUjian`, `SoalCbt`, `NavigasiSoal`, `TimerUjian`, `HasilUjian` | `docs/screenshots/cbt--*.png` |
