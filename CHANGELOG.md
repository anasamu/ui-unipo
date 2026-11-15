# Catatan perubahan

## 1.11.0 (2026-11-15)

- **Tata letak** (`unipo-ui`): `Container`, `Stack`, `Cluster`, `Grid`, `Split` (kolom utama + samping lekat), `PageHeader`, `Text`, `Heading`, `KontenHtml`, `teksPolos()`. Aplikasi tidak perlu Tailwind atau CSS tata letak sendiri.
- **Blok landing umum** (`unipo-ui`): `FactBoard`, `StatStrip`, `FeatureGrid`, `Gallery`, `Rating`, `Testimonial`/`TestimonialGrid`, `CtaBand`, `Timeline`, `SectionNav` + `useScrollSpy`, `SocialLinks`, `ChatWidget` + `cocokkanFaq()` (asisten FAQ tanpa server).
- **PMB publik** (`unipo-ui/siakad`, `/v1/pmb/info/*`): `PmbProvider` (kampus, rute, `renderLink`, URL kabar humas, URL berkas, render QR), `LandingPmbLengkap` (hero dengan gelombang otomatis, sekilas, jalur & jadwal, prodi, simulasi biaya, testimoni, pengumuman, kabar kampus, FAQ, kontak panitia, sidebar landing, asisten chat), `DetailGelombangPmb`, `DaftarPengumumanPmb`, `DetailPengumumanPmb`, plus hook data (`useGelombangPmb`, `useLandingPmb`, dll.) dan util (`keadaanGelombang`, `rentangPmb`, `sisaHari`).
- **Dasbor pendaftar PMB** (`unipo-ui/siakad`, `/v1/pmb/saya/*`): `PendaftaranAktifPmbProvider` + `PemilihPendaftaranPmb`, `DasborPendaftarPmb` (kartu tahap, tugas yang kurang, tagihan, jadwal tes), `PilihGelombangPendaftarPmb`, `FormulirPendaftarPmb`, `BerkasPendaftarPmb`, `PembayaranPendaftarPmb` (pilih metode, VA/QRIS/tautan bayar, unggah bukti transfer), `UjianPendaftarPmb` + `RuangUjianPmb` (token CBT), `KartuPesertaPmb` (siap cetak, QR), `HasilSeleksiPmb`, `NotifikasiPendaftarPmbDaftar` + `useJumlahNotifikasiPmb`, `AkunPendaftarPmbHalaman` (ubah data, ganti password dengan meter kekuatan), `BannerVerifikasiEmailPmb`.
- **Formulir PMB lebih lengkap**: `WizardPendaftaranPmb` kini memuat sumber informasi, kode referal, wali, langkah prestasi (`IsianPrestasiPmb`) dan nilai rapor (`IsianRaporPmb`) sesuai pengaturan gelombang, mode tinjau saat formulir terkunci, dan alur perbaikan dari panitia. Isian data diri, asal sekolah (NIS), dan orang tua (tanggal lahir, agama, HP, alamat) ditambah.
- **CBT**: `LembarUjian` punya `basePath` (dipakai PMB `/v1/pmb/saya/.../ujian`), antrean jawaban luring yang dikirim ulang saat online, log pengawasan (pindah tab, keluar layar penuh, salin-tempel, koneksi putus), dan ajakan layar penuh.

## 1.8.0 (2026-11-15)

- **Komponen AI** (`unipo-ui/siakad`) di atas `POST /v1/integrasi/ai/teks` SIAKAD. Kunci API penyedia tetap di server; browser hanya memakai token SIAKAD (scope `integrasi:ai`).
  - `useAi()`: kirim `prompt` atau `pesan`, `sistem`, `json`, `effort`, `maks_token`, `penyedia`; hasil `{ hasil, galat, dibatalkan }` tanpa melempar galat, bisa dihentikan. `galatMasukanAi()` memeriksa masukan dengan aturan yang sama dengan `AiService::masukan()`, `pesanGalatAi()` menerjemahkan `kuota_habis`, `penyedia_gagal`, scope belum ada, dan validasi. `ambilJsonAi()` membaca jawaban JSON.
  - `usePenyediaAi()` + `PilihPenyediaAi`: penyedia aktif dari `/v1/integrasi/ai/penyedia` (Claude, GPT/OpenAI-kompatibel, Gemini) dengan pilihan Otomatis = penyedia utama.
  - `ObrolanAi`: obrolan seperti ChatGPT/Claude/Gemini dengan saran pertanyaan, Markdown aman (`TeksAi`, tanpa innerHTML), salin, ulangi, hentikan, mulai baru, info model dan token. Riwayat dikirim ulang dan dipangkas agar muat 100 pesan / 400.000 karakter (`riwayatAi()`).
  - `AsistenDokumen` + `TombolAsistenDokumen`: buat draf (surat, SK, notulen, laporan, proposal, pengumuman, berita, skripsi, RPS), rapikan (EYD V, kalimat efektif, struktur, daftar/tabel), ringkas, dan terjemahkan. Hasil HTML disaring seperti `HtmlSanitizer` SIAKAD dan penanda `{{nama}}` diperiksa (`cekPenandaAi()`). Cocok untuk slot `aksi` EditorDokumen.
  - `BantuTulisAi` (perbaiki, formal, persingkat, kembangkan, judul, Inggris, dengan Urungkan) untuk isian teks biasa, dan `RingkasAi` untuk tiket, notulen, atau laporan.
  - `AnalisisAi`: analisis data keuangan, mahasiswa/EWS, akademik, PMB, SDM, EDOM, atau umum dari `data` atau `sumber` (GET endpoint SIAKAD). Hasilnya ringkasan, angka kunci, temuan bertingkat, rekomendasi berprioritas, keterbatasan, dan tanya lanjutan. Kolom pribadi (`KOLOM_SAMAR_AI`) disamarkan dan baris dibatasi sebelum dikirim (`siapkanDataAi()`).
  - `BuatSoalAi`: soal CBT/kuis LMS dari materi dan CPMK untuk enam jenis soal. Setiap soal diperiksa dengan aturan `PenilaianKuis::validasiSoal` (`validasiSoalAi()`), bisa dipilih, diubah, dibuang, lalu disimpan ke `/v1/cbt/soal` atau `/v1/lms/bank-soal`. `PratinjauSoalAi` menampilkan kunci dan pembahasan.
  - `KoreksiEsaiAi`: saran skor (dibatasi 0..poin maksimum), komentar, kekuatan, dan kekurangan jawaban esai; keputusan tetap di pengajar.
  - `PemakaianAi`: rekap permintaan dan token per hari, aplikasi, dan model dari `/v1/integrasi/ai/pemakaian`.
- Halaman docs **Komponen AI** (kategori baru AI) dengan data contoh untuk semua komponen.
- **Menu dan kartu akun** (`unipo-ui`), isi yang sama dengan menu akun di sso.unipo.ac.id dan terhubung ke profile.unipo.ac.id:
  - `MenuAkun`: kepala berisi foto, nama, dan "username · peran"; item Profil saya, Ubah profil, Ganti foto, Ganti password (aplikasi Profil), Keamanan akun (SSO), item tambahan, lalu Keluar dari semua aplikasi. Lima bentuk pemicu: `pil` (seperti SSO), `nama`, `avatar`, `ikon`, `sidebar` (menu terbuka ke atas). Opsional: bilah **Lengkapi profil** dari persen kelengkapan, pilihan peran, dan pilihan tema.
  - `KartuAkun`: varian `baris`, `kartu`, `sampul`, dan `tengah`, dengan kelengkapan profil, statistik kecil, dan tombol Ubah profil + Keamanan akun.
  - `tautanAkun()` / `TautanAkun`: jalur bawaan aplikasi Profil dan SSO yang bisa diganti per aplikasi.
  - `unipo-ui/siakad`: `useAkunSaya()`, `MenuAkunSiakad`, `KartuAkunSiakad` mengisi nama, NIM/NIDN, peran, prodi, pas foto (`/v1/profil/saya/foto`), dan kelengkapan dari `GET /v1/profil/saya`.

## 1.7.0 (2026-11-15)

- **Logo unggahan ikut varian logo**: `AppLogo` dengan `src` kini memotong gambar mengikuti `shape` (square, circle, shield, plain) dan `tone` (mono jadi abu-abu, inverse memakai pelat putih). `color` menjadi warna pelat di belakang logo PNG transparan, dan `fit` mengatur gambar memenuhi bentuk (cover) atau utuh (contain). Tata letak baru `layout="full"` menampilkan gambar logo utuh (mis. logo dengan tulisan) tanpa teks tambahan. Komponen tanda gambarnya juga tersedia sendiri: `LogoGambar`.
- **`LogoAplikasi`**: logo aplikasi yang terdaftar di Pustikom dari `kode`. Urutannya: `src` (mis. `aplikasi.logo` dari `useAplikasiTerpadu()`), logo unggahan klien SSO (`sso.unipo.ac.id/logos/<client_id>.png`), glyph bawaan aplikasi UNIPO, lalu inisial nama dengan warna tetap per kode. Semua tata letak, bentuk, dan nada AppLogo berlaku. Pendukungnya: `useLogoTersedia`, `urlLogoSso`, `glyphInisial`, `warnaAplikasi`.
- Nama logo yang terlalu panjang kini dipotong dengan elipsis.
- **Aplikasi publik/privat dan unduhan mobile** (Pustikom, `unipo-ui/siakad`):
  - `WizardAplikasi` dan `FormAplikasi` punya pilihan **Tampil di dasbor SSO** (publik/privat) dan, untuk aplikasi mobile, tautan unduh Android dan iOS. Nilainya disimpan ke katalog SIAKAD (`visibilitas`, `url_android`, `url_ios`) dan klien SSO (`visibility`, `android_url`, `ios_url`) sekaligus. Aturannya sama dengan server: aplikasi mobile publik wajib punya salah satu tautan (`galatUnduhan()`).
  - `KartuAplikasi` dan ringkasan detail menampilkan lencana Publik/Privat, tombol **Buka** untuk aplikasi web, dan tombol **Android**/**iOS** sesuai platform yang didukung (`TautanAplikasi`, `IkonAndroid`, `IkonApple`).
  - `DaftarAplikasiPublik` + `useAplikasiPublik()`: aplikasi publik dari `GET /v1/rbac/aplikasi-publik` (tanpa token) dengan logo terdaftar dan tombol buka/unduh, untuk portal atau dasbor.
  - `IkonAplikasi` kini memakai `LogoAplikasi`, jadi aplikasi bawaan UNIPO tampil dengan glyph-nya bila belum ada logo unggahan.

## 1.6.0 (2026-11-15)

- **Alur akademik terhubung API** (`unipo-ui/siakad`): widget alur bisnis dengan aturan yang sama dengan halaman web SIAKAD. Pemeriksaan tetap diulang di server; tampilan memberi tahu lebih awal.
  - `AmbilKrs`: penawaran dari `/v1/mahasiswa/{nim}/krs/penawaran` (status, masa KRS, pembayaran, prasyarat, batas SKS dari IPS), pilih mata kuliah dan kelas per semester, bilah SKS terhadap batas, peringatan jadwal bentrok, lalu `POST /v1/mahasiswa/{nim}/krs`. Hasil server (tersimpan, sudah ada, kelas penuh, bentrok, melebihi batas) ditampilkan apa adanya. Fungsi `bentrokKrs()` ikut diekspor.
  - `PersetujuanKrs`: antrian dosen PA dan prodi (menunggu, belum isi, disetujui) dengan cari, halaman, dan setujui banyak sekaligus. Lembar detail berisi KRS dan jadwal, batas SKS, riwayat IPS, hapus mata kuliah yang belum bernilai, setujui atau batalkan, dan pesan konsultasi (`/v1/akademik/krs/persetujuan`).
  - `DaftarKelasNilai` + `InputNilaiKelas`: kelas yang diampu dengan jumlah peserta bernilai, lalu lembar nilai dengan komposisi Harian/Tugas/UTS/UAS (total maksimal 100), kolom Harian dan Tugas yang bisa ditambah, perkiraan nilai akhir dan huruf dari skala prodi (`perkiraanNilai()`), distribusi, dan umumkan nilai. Hanya sel yang berubah yang dikirim; di luar batas tanggal input tabel hanya bisa dibaca.
  - `IsiEdom`: daftar mata kuliah dengan kemajuan, kuesioner per dosen (semua pertanyaan wajib, saran opsional), lalu lanjut otomatis ke mata kuliah berikutnya (`/v1/edom/isi`).
  - `PendaftaranWisuda`: syarat (tugas akhir, SKS, status aktif, nilai D/E, syarat tambahan prodi), periode yang dibuka, kelengkapan toga, topi, kalung, undangan, foto, dan map ijazah, lalu `POST /v1/kelulusan/wisuda/daftar`. Pendaftaran yang sudah diterima terkunci.
- Halaman docs **Alur akademik** dengan data contoh untuk kelima alur.

## 1.5.0 (2026-11-15)

- **Editor dokumen** (`unipo-ui/editor`): kanvas blok yang sama dengan editor berita, tetapi di atas kertas A4/F4/Letter dengan huruf dokumen (Times 12 pt, bisa diganti lewat `--u-dok-font`). Kertas selalu terang walau aplikasi memakai mode gelap.
  - `EditorDokumen`: isi dari HTML server (diurai ke blok) atau blok; `onChange` memberi HTML yang sudah disaring seperti `HtmlSanitizer` SIAKAD. Ada panel penanda `{{nama}}` yang disisipkan di posisi kursor, slot `kop`/`kaki` tetap di kertas, pratinjau, cetak, dan `tipe` untuk membatasi blok (bawaan `TIPE_DOKUMEN`, tanpa video, peta, dan tombol).
  - `EditorTemplatSurat`: nama (wajib, maksimal 150), perihal bawaan (maksimal 255), isi, keterangan, dan aktif, dengan aturan yang sama dengan `/v1/arsip/template`. Pratinjau mengisi penanda dengan data uji, dan penanda yang masih kosong ditandai kuning. Untuk dikirim ke API: `bodyTemplatSurat()` dan `validasiTemplatSurat()`.
  - `LembarSurat`: lembar surat dinas siap cetak berisi kop, nomor, sifat, lampiran, perihal, tempat dan tanggal, tujuan, isi, tanda tangan (dengan tautan cek keaslian), dan tembusan. Bungkus dengan `.u-cetak-saja` agar `window.print()` hanya mencetak lembarnya.
  - `isiTemplat`, `penandaDi`, `penandaIsian`, `tanggalSurat`, `PENANDA_BAWAAN`: port `SuratService::isiTemplat`. Penanda bawaan: unit, unit_singkatan, tanggal ("15 November 2026"), perihal, dan lampiran. Nilai di-escape dan penanda yang tidak dikenal dibiarkan.
  - `saringHtml`: cermin `HtmlSanitizer` di browser (allowlist tag, kelas hanya `ub-*`, tanpa style, h1 menjadi h2, iframe hanya YouTube, Vimeo, dan Google Maps).
  - `htmlKeBlok` kini mengenali semua keluaran `blokKeHtml`, termasuk kolom, tabel, galeri, sorotan, tombol, berkas, akordion, spasi, perataan, dan ukuran gambar. HTML dari server bisa disunting lagi tanpa kehilangan tata letak; bolak-balik blok → HTML → blok hasilnya stabil.
- **Surat arsip terhubung API** (`unipo-ui/siakad`):
  - `BuatSuratDariTemplat` adalah wizard konsep surat keluar dengan urutan: unit (`/v1/arsip/unit?saya=1`), templat, data surat dan isian penanda, tujuan dan tembusan (unit, dosen, mahasiswa, pengguna, atau pihak luar, dipilih lewat pencarian), sunting isi di kertas, tinjau lembar surat, lalu `POST /v1/arsip/surat-keluar` dengan `template_id`, `data_templat`, dan `isi`.
  - `KelolaTemplatSurat` menampilkan daftar dan pencarian templat, membuat, menyunting (pilih unit pemilik dan jenis naskah), dan menghapus dengan konfirmasi. Hanya unit tempat pengguna menjadi admin, sekretaris, atau arsiparis yang bisa dipilih.
  - `useUnitArsipSaya`, `useTemplatSurat`, `DaftarTujuan`, dan `SUMBER_UNIT_ARSIP` (untuk `PilihEntitas`).
- **Penyusunan skripsi** (`EditorSkripsi`):
  - Kerangka bab dengan target kata dan bilah kemajuan; bawaannya lima bab lewat `naskahKosong()` / `kerangkaSkripsi()`.
  - Halaman judul, abstrak, dan kata kunci; kanvas tiap bab di atas kertas dengan urung/ulang.
  - Daftar pustaka APA edisi 7. `sitasi()` menyisipkan sitasi biasa atau naratif di posisi kursor, dan `entriApa()` menyusun entri daftar pustaka. Pustaka yang belum dikutip ditandai.
  - Catatan bimbingan per bagian: pembimbing menambah catatan, mahasiswa menandai sudah diperbaiki.
  - Pratinjau naskah utuh siap cetak (setiap bab di halaman baru).
  - Komponennya dikendalikan, karena SIAKAD belum punya API untuk menyimpan naskah.
- `EditorBlok` punya prop `tipe` untuk membatasi blok yang bisa disisipkan. Hook `useSisipDiKaret` menyisipkan teks di posisi kursor terakhir, walau fokus sempat pindah ke tempat lain. 

## 1.4.0 (2026-11-15)

- **Entri baru `unipo-ui/editor`: editor berita gaya Gutenberg.** Format blok sama persis dengan `Blok.php` di SIAKAD (`{id, tipe, data, anak?}`, 17 tipe), jadi isi dikirim apa adanya ke `/v1/humas` dan `/v1/portal`.
  - `EditorBerita`: judul dan ringkasan di atas kanvas, panel samping (tab Dokumen: isian sendiri, daftar isi, cek terbit; tab Blok: pengaturan blok terpilih), urung/ulang, hitung kata dan waktu baca, pratinjau hasil akhir, dialog "Siap terbit?". `tinggi` untuk mode tinggi tetap di dalam dasbor.
  - `EditorBlok` (kanvas saja) + `useRiwayatBlok`: ketik langsung, `/` untuk memilih blok, pintasan Markdown (`##`, `-`, `1.`, `>`, `---`), seret untuk memindah, bilah format (tebal, miring, tautan, sorot, kode), Enter memecah dan Backspace menggabung blok, Ctrl+Z / Ctrl+Shift+Z.
  - Penyisip dengan pencarian dan tab Pola (`pola` dari `/v1/humas/pola`). Media lewat `pilihMedia` sendiri (pustaka media humas) atau dialog bawaan dengan `unggah` (mis. `unggahKeBerkas` ke `/v1/berkas`).
  - **Lampirkan berkas yang sudah ada di sistem**: pemilih media bawaan kini punya tab Pustaka (cari + pilih, banyak sekaligus untuk galeri, klik dua kali untuk langsung memakai) di samping Unggah dan Alamat. Sumbernya lewat prop `sumberMedia`; `useMediaPortal(situs)` di `unipo-ui/siakad` menyediakan `sumber` dan `unggah` dari pustaka media portal (`/v1/portal/kelola/media`, URL permanen, `id` tersimpan sebagai `media_id` blok seperti di Blok.php).
  - Logika sama dengan backend: `blokKeHtml` adalah port `Blok::render` (HTML dan penyaringan tag/URL sama), `validasiBlok` memakai aturan dan pesan API (maksimal 600 blok, 2 MB, tipe dikenal, kolom tidak bersarang), `TampilBlok` untuk menampilkan isi di portal. Gaya isi `ub-*` kini mengikuti token tema dan mode gelap.
- **`PilihBerkas`** (`unipo-ui/siakad`): isian satu berkas untuk formulir yang terhubung ke `/v1/berkas`. Bisa seret/unggah (bertahap otomatis untuk file besar, progres, bisa dibatalkan) atau pilih dari "Berkas saya" dengan pencarian. Nilainya `berkas_id`.
- **Katalog memakai berkas terpusat**: katalog dibuat ulang dari OpenAPI terbaru. Formulir endpoint yang menerima `berkas_id` (arsip, SPMI, SDM, LPPM, LMS, portal, tracer, pengajuan akademik, admisi, dll.) kini menampilkan `PilihBerkas` (wajib pada endpoint unggah) menggantikan isian UUID manual, file mentah, base64, dan nama file. Tab Lampiran mengunggah lewat `/v1/berkas` lalu mengirim `berkas_id` bila endpoint mendukungnya.
- **Warna ilustrasi dari CSS**: semua warna `Ilustrasi` dan `IkonKotak` adalah variabel CSS (`--u-ilus-utama`, `--u-ilus-aksen-1..4`, `--u-ilus-baju`, `--u-ilus-celana`, `--u-ilus-kulit`, `--u-ilus-rambut`, `--u-ilus-sepatu`, `--u-ilus-pita`, `--u-ilus-pipi`, `--u-ilus-ikon`, `--u-ilus-lantai`, `--u-ilus-bayang`) dan nada fitur bisa diganti per nama (`--u-nada-biru`, …). Contoh agar semua ikut warna merek: `:root { --u-ilus-utama: var(--u-primary); }`.

## 1.3.0 (2026-11-15)

- **Entri baru `unipo-ui/katalog`**: komponen untuk setiap fitur API SIAKAD, dibuat dari OpenAPI (40 modul dalam 9 grup: Sistem & Akses, Referensi, Akademik, Kemahasiswaan, Alumni, Kelembagaan, Layanan, Sarana, Humas; 703 sumber data, 2.779 operasi). Data tiap modul dimuat saat dibutuhkan.
  - `KelolaSumber` (alias `Fitur`): tabel + saringan dari parameter API + tambah/ubah/hapus + detail + lampiran + sumber anak, cukup dengan path, mis. `<KelolaSumber sumber="/v1/kemahasiswaan/beasiswa" />`.
  - `HalamanModul`, `DaftarModul`, `PencarianFitur`, `TabelSumber`, `FormulirSumber`, `DetailSumber`, `TombolAksi`, `AlurStatus`, `LampiranSumber`, `FormOperasi`.
  - `FormulirSkema` + `useFormulirSkema`, `WizardSumber` (langkah otomatis dari skema), `IsianSkema`.
  - Logika sama dengan backend: validasi mengikuti `PusatData\Aturan` dengan pesan galat yang sama, galat 422 dipasang ke isian, ubah hanya mengirim kolom yang berubah, aksi alur kerja hanya muncul bila status mengizinkan ("Status harus A, menjadi B"), dan scope token menyembunyikan menu/tombol (`KatalogProvider scopes`).
  - Katalog bisa dibuat ulang dari openapi.json terbaru: `npm run katalog -w unipo-ui -- openapi.json`.
- **Entri baru `unipo-ui/ikon`**: semua ikon lucide + 23 ikon khas kampus (KTM, ijazah, KHS, KRS, SKS, toga, skripsi, UKT, beasiswa, yudisium, presensi, PDDikti, dll.), `IkonKotak` bergaya clay, dan `Ilustrasi` vektor untuk tiap grup, modul, dan keadaan (kosong, cari, galat, pemeliharaan, terkunci, sukses, selamat datang).
- **Animasi**: `Animasi` (14 jenis, dipilih sesuai fitur lewat `animasiFitur()`), `Bertahap`, `AngkaBerjalan`, `CentangSukses`, `TitikMengetik`. Otomatis mati saat "kurangi gerakan".
- **Target platform**: `setelPlatform({ platform: 'web' | 'desktop' | 'mobile', os: 'ios' | 'android' })`, `usePlatform()`, `PlatformProvider`. Dialog jadi lembar bawah di mobile, target sentuh 44/48 px, gaya iOS/Android, bilah judul yang bisa diseret di desktop. Komponen baru `NavigasiBawah`, `BilahAplikasi`, `TombolMelayang`. CLI: `npx unipo-ui init --platform mobile --os ios` dan `npx unipo-ui platform <target>`.
- **Mode pemeliharaan**: `ModePemeliharaan`, `BannerPemeliharaan`, dan di `unipo-ui/siakad`: `GerbangPemeliharaan`, `usePemeliharaan`, `fetchPemeliharaan` (respons 503 dari API ditangkap otomatis, Retry-After jadi hitung mundur).
- **Modal**: `KonfirmasiKetik` (ketik kata kunci untuk aksi permanen) dan `DialogWizard`.

## 1.2.0 (2026-11-15)

- **UnggahBerkas** (`unipo-ui/siakad`): kotak unggah yang terhubung ke berkas terpusat SIAKAD (`/v1/berkas`). Progres per berkas, bisa dibatalkan, dan file besar otomatis diunggah bertahap per potongan (cocok untuk hosting dengan batas unggah kecil). Berkas tersimpan di penyimpanan aktif (S3/R2/MinIO/Google Drive atau disk server); `onSelesai(berkas)` memberi `berkas.id` untuk dipakai sebagai `berkas_id` di endpoint modul.
- Hook `useUnggahBerkas()`, `useInfoBerkas()`, `useUrlBerkas()` (tautan unduh sementara untuk `<img>`/`<a>`/pratinjau PDF), dan fungsi `unggahKeBerkas()`.

## 1.1.0 (2026-11-15)

- **PilihEntitas** (`unipo-ui/siakad`): isian cari-dan-pilih pengganti input ID/NIM/NIDN/NIK/username manual. Nilainya kunci (string), label nilai awal dimuat sendiri. Jenis bawaan: mahasiswa, dosen, pegawai, pengguna, orang, nik, ormawa, mata-kuliah, prodi, fakultas, unit, jabatan; tabel lain lewat sumber sendiri (`{ path, kunci, satu, judul, meta }`). `jenisEntitasDariKolom()` menebak jenis dari nama kolom dan keterangan skema untuk formulir otomatis.
- **Kode laporan galat**: `GalatApi` (kotak galat dengan pesan, kode laporan yang bisa disalin, dan tombol coba lagi), `KodeLaporan`, dan `requestIdDari()`. Semua kotak galat widget kini menampilkan request_id; `pesanGalat()` menyertakannya untuk galat server (matikan dengan `{ kode: false }`).
- **Sidebar**: mode ciut kini hanya ikon (label tidak lagi terpotong jadi "B.", lencana jadi titik). Sub-menu bersifat accordion: membuka satu menutup yang lain (`accordion={false}` untuk perilaku lama).
- **Sheet**: lebar mengikuti `size` (sm 24rem, md 36rem bawaan, lg 44rem, xl 56rem, full). Sebelumnya semua ukuran 26rem.

## 1.0.2 (2026-11-15)

- Alert: ikon sejajar baris judul dan jarak atas sama dengan jarak bawah, juga saat alert ditaruh di dalam artikel/markdown yang memberi margin pada `<p>` (mis. kelas prose). Judul, deskripsi, dan isi deskripsi kebal terhadap margin dan tinggi baris dari CSS halaman.
- Perlindungan yang sama untuk teks di Empty, StatusBanner, dan pembuka Wizard.

## 1.0.1 (2026-11-15)

Rilis pertama di npm.

- Paket `unipo-ui` (komponen React + CSS kelas `u-*`) dan `unipo-ui-tokens` (token CSS/SCSS/LESS/Tailwind/Kotlin/Android).
- CLI `npx unipo-ui init | add | list | tema`; `tema --dari "<tautan tema.css>"` menulis tema dari pembuat tema api.unipo.ac.id/docs/tema.
- Entri `unipo-ui/tema`: `buatTema()` membuat CSS tema lengkap (warna merek dan mode gelap, status, netral, latar, sudut, huruf, ukuran teks, bayangan, gerak); `paramTema()`/`opsiDariParam()` untuk tautan.
- Entri `unipo-ui/siakad`: komponen yang terhubung ke `unipo-siakad-sdk`.
