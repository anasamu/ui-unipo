# UNIPO UI

[![npm unipo-ui](https://img.shields.io/npm/v/unipo-ui?label=unipo-ui&logo=npm&color=cb3837)](https://www.npmjs.com/package/unipo-ui)
[![npm unipo-ui-tokens](https://img.shields.io/npm/v/unipo-ui-tokens?label=unipo-ui-tokens&logo=npm&color=cb3837)](https://www.npmjs.com/package/unipo-ui-tokens)
[![npm unipo-siakad-sdk](https://img.shields.io/npm/v/unipo-siakad-sdk?label=unipo-siakad-sdk&logo=npm&color=cb3837)](https://www.npmjs.com/package/unipo-siakad-sdk)
[![unduhan per bulan](https://img.shields.io/npm/dm/unipo-ui?label=unduhan%2Fbulan&logo=npm)](https://www.npmjs.com/package/unipo-ui)
[![lisensi](https://img.shields.io/npm/l/unipo-ui?label=lisensi)](https://www.npmjs.com/package/unipo-ui)

Sistem desain dan pustaka komponen untuk aplikasi Universitas Pohuwato (SIAKAD, PMB, LMS, portal fakultas, tracer study, humas, dan aplikasi yang memakai API SIAKAD).

> Dokumentasi lengkap dan screenshot komponen sedang disusun di PR ini. Jalankan `npm install && npm run dev` lalu buka http://localhost:5180.

| Paket | Isi |
|---|---|
| `packages/tokens` (`unipo-ui-tokens`) | Design token → CSS, SCSS, LESS, Tailwind, TypeScript/React Native, Kotlin Compose, XML Android |
| `packages/ui` (`unipo-ui`) | CSS kelas `u-*` + komponen React di atas [Base UI](https://base-ui.com) |
| `apps/docs` | Situs dokumentasi dan galeri komponen |

## Kerangka aplikasi (`unipo-ui/siakad`)

Semua aplikasi dasbor UNIPO memakai satu kerangka yang sama: `KerangkaAplikasi`. Isinya sidebar dengan logo + nama
aplikasi yang menuju beranda, judul halaman, pencarian fitur (Ctrl/⌘K atau "/"), ikon notifikasi (`/v1/notif`), ikon
pesan masuk (obrolan `/v1/obrolan`), kelola berkas (`/v1/berkas`: unggah, unduh, DriveBerkas), tombol tema, menu akun SIAKAD, navigasi bawah di ponsel, dan obrolan mengambang.

```tsx
import { KerangkaAplikasi } from 'unipo-ui/siakad';

<KerangkaAplikasi
  kode="bauk" nama="BAUK UNIPO" tagline="Keuangan, payroll, dan sarpras"
  groups={menuSesuaiIzin} activeKey={aktif}
  renderLink={(item, props) => <Link to={item.href!} {...props} />} onNavigasi={navigate}
  cari={{ tambahan: [{ key: 'va', label: 'Buat virtual account', href: '/kasir', kataKunci: ['bayar'] }] }}
  notifikasi={{ semuaHref: '/notifikasi' }}
  tema={tema} onTema={setTema} onKeluar={keluar}
  navBawah={[{ key: 'beranda', label: 'Beranda', icon: <House />, href: '/' }]}
>
  <Routes>…</Routes>
</KerangkaAplikasi>
```

Klien API aplikasi butuh scope `notif:read`, `notif:write`, `obrolan:read`, `obrolan:write`, `berkas:read`,
`berkas:write`, dan BFF-nya harus meneruskan `/v1/notif`, `/v1/obrolan`, dan `/v1/berkas`. Bagian yang bisa dipakai terpisah: `PencarianFitur` + `fiturDariMenu`,
`PintasanFitur` (unipo-ui), `TombolNotifikasi`/`useNotifikasi`, `TombolPesan` (unipo-ui/siakad). Efek bayangan
(`elevasi`: datar, normal, terangkat, melayang) diatur di `PengaturanTema`.

## Widget fitur (`unipo-ui/siakad`)

Widget kecil per fitur yang mengambil data sendiri lewat `unipo-siakad-sdk` (bungkus aplikasi dengan `SiakadProvider`). Tiap modul juga punya komponen dasbor yang menyusun widget-widgetnya.

| Modul | Contoh widget | Tangkapan layar |
|---|---|---|
| Akademik (BAAK) | `RingkasanAkademik`, `KrsPerSemester`, `StatusMahasiswa`, `DasborAkademik` | `docs/screenshots/dasbor--Akademik.png` |
| Keuangan, kepegawaian, SPMI, LPPM, arsip, humas, PMB, tracer | `PosisiAnggaran`, `JabatanAkademikDosen`, `SiklusPpepp`, `AntreanLppm`, `SuratPerBulan`, `AntreanReview`, `CorongPmb`, `StatusAlumni`, … | `docs/screenshots/dasbor--*.png` |
| Kurikulum OBE | `DaftarKurikulum`, `RingkasanKurikulum`, `ValidasiKurikulum`, `MatriksKurikulum`, `StrukturKurikulum`, `RpsMataKuliah`, `CapaianCplMahasiswa` | `docs/screenshots/kurikulum--*.png` |
| Detail mahasiswa, dosen, MK | `DetailMahasiswa`, `SheetDetailMahasiswa`, `KhsMahasiswa`, `TranskripMahasiswa`, `KrsMahasiswa`, `RiwayatStudi`, `DetailDosen`, `JadwalMengajar`, `MahasiswaBimbingan`, `DetailMataKuliah` | `docs/screenshots/akademik--*.png` |
| Tabel SIAKAD | `TabelMahasiswa`, `TabelDosen`, `TabelMataKuliah`, … dengan `detail` (panel samping), `tampilan="kartu"`, `varian="ringkas"` | `docs/screenshots/tabel-siakad--*.png` |
| Struktur kurikulum | `TabelStrukturKurikulum` (dikelompokkan per semester, detail MK di baris atau popup), `DetailMkKurikulum`, `SheetMkKurikulum` | `docs/screenshots/kurikulum--Struktur*.png` |
| Navigasi portal | `Navbar` (aplikasi, portal, ringkas, mega menu, panel ponsel), `NavbarPortal`, `LogoSitus`, `Faq`, `FaqPortal` | `docs/screenshots/navbar--*.png`, `faq--*.png` |
| Pustikom & SSO | `DaftarAplikasi`, `KartuAplikasi`, `DetailAplikasi`, `FormAplikasi`, `WizardAplikasi`, `SecretSekali`, `PilihScope`, `LogApi`, `RingkasanLogApi`, `LogAktivitas`, `KeamananPengguna` (`SsoAdminProvider` + `createSsoAdmin` untuk API admin SSO lewat BFF) | `docs/screenshots/aplikasi--*.png`, `log--*.png` |
| LMS | `RingkasanLms`, `DaftarKelasLms`, `KartuKelas`, `TugasMendatang`, `KuisTerbuka`, `AgendaLms`, `ProgresKelas` | `docs/screenshots/lms--*.png` |
| CBT | `DaftarUjianSaya`, `LembarUjian`, `SoalCbt`, `NavigasiSoal`, `TimerUjian`, `HasilUjian` | `docs/screenshots/cbt--*.png` |

## Fitur API (`unipo-ui/katalog`)

Komponen untuk setiap fitur API SIAKAD (40 modul, 703 sumber data), dibuat dari OpenAPI dengan aturan validasi, alur status, dan scope yang sama dengan backend.

```tsx
import { KelolaSumber, HalamanModul, WizardSumber, KatalogProvider } from 'unipo-ui/katalog';

<KatalogProvider scopes={token.scope.split(' ')}>
  <KelolaSumber sumber="/v1/kemahasiswaan/beasiswa" />
</KatalogProvider>
```

Ikon kampus, `IkonKotak`, dan `Ilustrasi` per modul ada di `unipo-ui/ikon`; animasi per fitur (`Animasi`, `animasiFitur()`) dan target platform (`setelPlatform({ platform: 'mobile', os: 'ios' })`) di `unipo-ui`.

## Editor berita (`unipo-ui/editor`)

Editor blok gaya Gutenberg dengan format blok yang sama dengan `Blok.php` di SIAKAD.

```tsx
import { EditorBerita, TampilBlok, validasiBlok } from 'unipo-ui/editor';

<EditorBerita
  nilaiAwal={{ judul: '', blok: [] }}
  unggah={async (file) => ({ url: await unggahFotoBerita(file) })} // atau pilihMedia={…} untuk pustaka media humas
  aksi={(n, cek) => <Button disabled={cek.some((c) => c.wajib && !c.ok)} onClick={() => simpan({ ...n, blok: validasiBlok(n.blok) })}>Terbitkan</Button>}
/>
```

Editor dokumen untuk surat, templat surat, dan skripsi ada di entri yang sama:

```tsx
import { EditorTemplatSurat, LembarSurat, EditorSkripsi, naskahKosong } from 'unipo-ui/editor';
import { BuatSuratDariTemplat, KelolaTemplatSurat } from 'unipo-ui/siakad'; // terhubung /v1/arsip

<BuatSuratDariTemplat onSelesai={(surat) => buka(surat.uuid)} />
```

## Alur akademik (`unipo-ui/siakad`)

Widget alur bisnis yang langsung memanggil API SIAKAD: ambil KRS, persetujuan KRS dosen PA, input nilai, EDOM, dan pendaftaran wisuda.

```tsx
import { AmbilKrs, PersetujuanKrs, DaftarKelasNilai, InputNilaiKelas, IsiEdom, PendaftaranWisuda } from 'unipo-ui/siakad';

<AmbilKrs nim={nim} onTersimpan={(h) => toast(`${h.tersimpan.length} MK tersimpan`)} />
```

## Rilis

Rilis ke npm berjalan otomatis lewat GitHub Actions (`.github/workflows/rilis.yml`):

1. `npm run versi -- patch` (atau `minor`, `major`, `X.Y.Z`). Perintah ini menaikkan versi `unipo-ui` dan `unipo-ui-tokens` bersamaan, memperbarui lockfile, dan menambah judul versi di `CHANGELOG.md`.
2. Isi catatan perubahan, commit, buka PR, lalu merge ke `main`.
3. Workflow **Rilis** menerbitkan kedua paket ke npm, membuat tag `vX.Y.Z`, dan GitHub Release dengan catatan dari CHANGELOG. Versi yang sudah terbit dilewati. Versi prarilis (`1.1.0-beta.1`) terbit dengan dist-tag `next`.

Butuh secret `NPM_TOKEN` di Settings → Secrets and variables → Actions.
