# Catatan perubahan

## 1.22.1 (2026-11-15)

- **Obrolan:** layar Grup baru dan Obrolan baru di `ChatMengambang`/`KotakObrolan` tidak lagi menggencet kolom cari, saringan peran, dan tombol "Buat grup" saat daftar pengguna panjang. Sekarang hanya daftar pengguna yang bergulir.

## 1.22.0 (2026-11-15)

- **Presensi QR** (`unipo-ui/siakad`, API SIAKAD `/v1/presensi`): presensi kuliah mahasiswa, dosen mengajar, kerja dosen/tendik lewat titik kiosk, dan kegiatan (rapat, seminar, upacara, ormawa).
  - `KelolaSesiPresensi`: daftar sesi (saring status, satu kelas lewat `idj` atau `lmsKelasId`), buat sesi, dan `DetailSesiPresensi` (buka, tutup, sahkan/gabung, batal, ganti kode; tab layar QR, daftar hadir, pindai kartu, izin, jejak pindaian).
  - `LayarQrPresensi`: QR berganti untuk proyektor (layar penuh), bilah waktu, kode cadangan, hitungan hadir, pemindai terbaru. `useQrBerganti` mengambil QR baru tepat saat berganti.
  - `PindaiPresensi`: kamera (BarcodeDetector, atau jsQR di Safari iOS) atau kode 6 huruf, dengan lokasi dan ID perangkat; menerima token dari tautan `?t=`. Juga untuk QR titik kerja (masuk/pulang). `KameraPindaiQr` bisa dipakai terpisah.
  - `KartuQrSaya` + `PindaiKartuPresensi` (petugas meja registrasi), `DaftarHadirSesi` (koreksi status, isi yang belum, tanda curiga), `PresensiSaya`, `ModulPresensiSaya`.
  - `PengajuanIzinPresensi` (surat lewat `PilihBerkas`), `DaftarIzinPresensi` (saya/penyetuju, setujui/tolak).
  - `LayarKioskPresensi` (token aplikasi `presensi:kiosk`), `KelolaTitikPresensi` + `FormTitikPresensi`.
  - `FormSesiPresensi`: kuliah (kelas dari `SUMBER_KELAS_KULIAH`) atau kegiatan (undangan dipilih dari data, petugas, unit), lokasi + radius, terlambat, kode cadangan, perangkat ganda.
  - Gambar QR: `KodeQrSiakad` dengan gaya `presensi` per bagian (dari 1.21.0), digambar di browser tanpa panggilan server tiap pergantian; `renderQr` untuk menggambar sendiri.
  - Bantuan: `pesanGalatPresensi`, `idPerangkatPresensi`, `ambilLokasiPresensi`, `tokenPresensiDariUrl`.
- Ketergantungan baru `jsqr` (dimuat hanya bila peramban tidak punya BarcodeDetector).
- Halaman docs **Presensi QR** (Per kegunaan) dengan server tiruan; entri Presensi di Peta kegunaan.

## 1.21.0 (2026-11-15)

- 

## 1.20.0 (2026-11-15)

- **Tema dinamis untuk semua aplikasi** (`unipo-ui/siakad`, API SIAKAD `/v1/tema`):
  - `TemaAplikasi`: pasang tema aplikasi dari SIAKAD (lapis kampus → aplikasi → lingkup, mis. fakultas 05) ke halaman tanpa deploy ulang: CSS tema, huruf Google Fonts, meta theme-color, mode terang/gelap bawaan. `cadangan` untuk aplikasi yang belum punya tema tersimpan.
  - `PengaturanTema`: halaman pengaturan untuk pemegang izin `<aplikasi>.tema`: preset, warna utama/aksen (pilihan + bebas + hex), nuansa abu-abu, huruf isi/judul, ukuran teks, sudut, bayangan, gerak, mode bawaan, kolom tata letak khusus aplikasi (`tataTambahan`), pratinjau langsung (kartu atau seluruh halaman), simpan dengan catatan, riwayat versi + pulihkan. Pengguna tanpa izin hanya melihat.
  - `useTemaAplikasi`, `useAksesTema`.
- **Pemasang tema** (`unipo-ui/tema`): `cssTemaAplikasi` (selektor dipertegas agar menang atas CSS unipo-ui), `pasangTemaAplikasi` (dengan cache localStorage), `skripAwalTema` (skrip index.html agar tidak berkedip), `terapkanModeTampilan`, `pasangModeBawaan`, tipe `DataTemaAplikasi` dan `ModeTampilan`.
- Halaman docs **Pengaturan tema aplikasi** (Fondasi).

## 1.19.0 (2026-11-15)

- **Aturan akademik dinamis** (`unipo-ui/siakad`, endpoint `/v1/aturan`): antarmuka untuk syarat, batas waktu, dan batas nilai yang ditegakkan SIAKAD di setiap langkah (KRS, input nilai, ujian, tugas akhir, KKN, cuti, yudisium, wisuda).
  - `KelolaAturan`: modul lengkap dengan ringkasan (aktif, draf belum ber-SK, nonaktif, mode blokir), daftar dengan saringan, tambah/ubah, panel detail, sampah (admin), dan pengatur. Bisa dibatasi ke satu `kategori` atau `titik`.
  - `PenyusunKondisi`: penyusun kondisi visual. Kelompok "semua"/"salah satu" bersarang sampai 3 tingkat, indikator sesuai titik dari katalog, operator sesuai tipe indikator, nilai dipilih dari data (status mahasiswa, angkatan, hari, mata kuliah lewat `PilihEntitas`), pesan khusus per kondisi, dan ringkasan dalam kalimat.
  - `FormAturan`: titik penerapan, kategori sesuai wewenang (`GET /v1/aturan/saya`), jenis, ketentuan (kondisi, rentang tanggal+jam, atau batas bertingkat), cakupan (prodi, fakultas, jenjang, angkatan, kelas), periode dan masa berlaku, mode blokir/peringatan, pesan, catatan perubahan. Validasi sama dengan backend; galat 422 dipetakan ke isian.
  - `PanelDetailAturan`: aktifkan (SK wajib), nonaktifkan, hapus, pulihkan, dengan hasil tulis-tembus ke menu batas waktu lama; tab ketentuan, SK, dispensasi, uji, dan riwayat.
  - `LampiranSkAturan` + `FormLampiranAturan` (unggah atau pilih dari berkas terpusat), `PengecualianAturanPanel` + `FormPengecualianAturan` (dispensasi mahasiswa/dosen/prodi dipilih dari data), `RiwayatAturan` (linimasa versi), `UjiAturan` (uji ke mahasiswa contoh, konteks, dan waktu tertentu).
  - `SyaratSaya`: daftar periksa mahasiswa untuk satu titik dengan status terpenuhi/belum/peringatan/dispensasi dan jendela waktu. `HasilPeriksaAturanPanel` + `hasilDariGalatAturan` menampilkan hasil `/periksa`, `/uji`, atau galat 409 `aturan_dilanggar` dari endpoint mana pun.
  - `PengaturAturan`: peran/izin yang berhak mengatur per kategori dan titik; admin bisa mengubah atau mengembalikan ke izin bawaan.
  - Hook: `useKatalogAturan`, `useAturanSaya`, `useDaftarAturan`, `useAturan`, `useRiwayatAturan`, `usePeriksaAturan`. Fungsi: `ringkasKondisi`, `kalimatKondisi`, `ringkasKetentuan`, `ringkasCakupan`, `periksaKondisi`, `periksaIsianAturan`, `posisiBatasWaktu`.
- `PilihanBanyak` (`unipo-ui`): pilih beberapa nilai sebagai tag, dengan daftar atau isian cari untuk menambah.
- Halaman docs **Aturan akademik dinamis** di menu Per kegunaan, dan entri baru di Peta kegunaan.

## 1.18.0 (2026-11-15)

- **Bahan formulir tambah/ubah** (`unipo-ui`):
  - `Pilihan`: satu pilihan dari daftar yang memilih bentuknya sendiri: tombol untuk 2–4 opsi pendek, daftar tarik-turun untuk 5–8, isian cari untuk lebih dari 8 (`tampilan` untuk memaksa). `opsiDariPeta` mengubah peta `{kode: label}` dari API menjadi opsi.
  - `IsianTanggal`: pemilih tanggal yang menerima dan mengembalikan `YYYY-MM-DD` seperti body API.
  - `BagianForm` dan `GridForm`: bagian berjudul + ikon, grid 1–3 kolom yang mengikuti lebar panel (bukan layar), isian selebar bagian lewat `className="u-form-lebar"`.
  - `PanelForm`: cangkang tambah/ubah (panel samping atau dialog; lembar bawah 94% layar di ponsel) dengan penanda "Perubahan belum disimpan", konfirmasi sebelum perubahan dibuang, Enter dan Ctrl/⌘+Enter untuk simpan, serta kotak galat + kode laporan.
  - `IsianDaftar` (tag, kini juga di `unipo-ui`) dan `HitungKarakter`.
- **Formulir dari skema** (`unipo-ui/katalog`):
  - Enum memakai `Pilihan`; labelnya diambil dari keterangan backend bila ditulis "A wajib, B pilihan, …". Isian daftar yang keterangannya berisi kode menjadi tag pilihan ganda.
  - `FormulirSkema` mendapat `bagian`, `lebar`, `opsi`, `label`, `keterangan`, `setelah`, dan grid yang benar-benar dua kolom di panel lebar (sebelumnya kueri kontainer tidak pernah aktif).
  - `FormulirSumber` memakai `PanelForm` dan meneruskan tata letak (`bagian`, `render`, `opsi`, …) serta `judul`, `deskripsi`, `labelSimpan`, `olahBody`, `size`.
  - Formulir per fitur: `FormKurikulum` (identitas, masa berlaku, beban studi dengan ringkasan SKS, rumusan, integrasi PDDikti) dan `FormMataKuliahKurikulum` (jenis, bobot SKS dengan tombol +/− dan total otomatis, bentuk pembelajaran, koordinator dari daftar dosen). Aturan wajib dan validasinya tetap dari skema backend.
- **Profil dan layanan** (`unipo-ui/siakad`):
  - `FormProfilSaya` (`POST /v1/profil/saya`): nama panggilan, judul, bio dengan hitungan karakter, keahlian, tautan akademik (LinkedIn, ORCID, Scholar, SINTA, Scopus, Garuda, ResearchGate, GitHub, situs), email alternatif; validasi sama dengan backend.
  - `DataPribadiSaya`: ubah data memakai `PanelForm` dengan kontrol sesuai jenis (kecamatan dicari, jenis tinggal dipilih, NIK/RT/RW/kode pos hanya angka); pengajuan tanggal lahir dan jenis kelamin memakai pemilih.
  - `RiwayatProfilSaya`: tanggal memakai pemilih, pilihan memakai `Pilihan`, "masih bekerja/aktif/studi" berupa saklar yang mematikan tanggal selesai.
  - `PilihKecamatan` dan `PETUNJUK_ISIAN` diekspor dari kelengkapan data. `PilihProdi` dan `PilihTahunAkademik` menjadi isian cari bila opsinya banyak.
  - Biodata PMB, `ModalAjukanLayanan`, dan pilihan prodi pendaftaran memakai `Pilihan` dan `IsianTanggal`.
- Halaman docs **Formulir tambah/ubah per fitur** di menu Per kegunaan.

## 1.17.0 (2026-11-15)

- **Beranda per peran** (`unipo-ui/siakad`): `BerandaSaya` menyusun beranda dari peran akun yang masuk. Mahasiswa mendapat profil akademik, KRS semester ini, tagihan, serta aksi cepat yang membuka modal fitur (ambil KRS, cek kesiapan lulus, daftar wisuda, ajukan layanan). Dosen mendapat profil, jadwal mengajar, dan mahasiswa PA. Tendik mendapat data kepegawaian. Semua peran mendapat pengingat kelengkapan data, pengumuman untuk akun, dan kalender akademik. Bagian-bagiannya juga diekspor: `SapaanBeranda`, `AksiCepat` (petak yang bisa membuka modal, tautan, atau fungsi), dan `TagihanSaya`.
- **Docs disusun per kegunaan**: menu baru **Per kegunaan** di urutan kedua berisi **Peta kegunaan** (cari "saya ingin…" → komponen, impor, endpoint, scope, halaman contoh) dan **Beranda per peran**. Kategori modul fitur (Profil, Portal & landing, Akademik, PMB, LMS, …) kini tampil sebelum komponen dasar. Menu "Fitur API" (CRUD generik dari katalog) dipindah ke paling bawah dengan nama **Referensi API**.

## 1.16.0 (2026-11-15)

- **Kerangka situs** (`unipo-ui`):
  - `Footer`: identitas + kontak (alamat dengan tautan peta, telepon, WhatsApp, email, jam layanan) + media sosial, kolom tautan, pita ajakan, baris hak cipta + tautan kecil + tombol kembali ke atas. Varian `gelap` (tetap gelap di kedua mode), `terang`, `ringkas`.
  - `PitaPengumuman`: pita di atas navbar, warna dan ikon sesuai prioritas (darurat, penting, biasa), berganti otomatis (berhenti saat disorot dan bila pengguna memilih gerak minimal), bisa ditutup dan diingat sampai isinya berubah.
  - `TopbarKontak`: isi prop `topbar` Navbar (telepon, email, jam layanan, tautan cepat, slot bahasa).
  - `AnnouncementList` kini punya `variant`: `daftar` (bawaan), `kartu`, `ringkas`, `sorotan`, `linimasa`; item bisa membawa cuplikan, kategori, lampiran, dan penerbit; masa berlaku tampil sebagai sisa hari ("Berakhir 3 hari lagi").
  - `SocialLinks` mengenal LinkedIn, Threads, dan saluran WhatsApp.
- **Kerangka portal dari `/v1/portal`** (`unipo-ui/siakad`):
  - `KerangkaPortal`: pita pengumuman + `NavbarPortal` (menu utama dan mega menu) dengan pita kontak + isi + kaki halaman + popup dalam satu komponen.
  - `FooterPortal`: kontak dan media sosial dari profil situs, kolom dari menu lokasi `footer`, kolom tautan cepat per grup (`/v1/portal/tautan`).
  - `TopbarPortal` (menu lokasi `atas` + kontak), `PitaPengumumanPortal` (pengumuman darurat/penting yang masih berlaku + banner posisi `pita`), `PopupPengumumanPortal` (banner posisi `popup`, sekali per pengunjung).
  - `PengumumanPortal` mendapat `variant` dan `kategori`; `PengumumanSaya` (`/v1/portal/pengumuman/saya`, sesuai kelompok, prodi, angkatan akun); `DetailPengumumanPortal` (isi HTML disaring, nomor, masa berlaku, penerbit, lampiran); pembantu `kePengumuman`, `kontakSitus`, `sosialSitus`.
- Halaman docs **Kerangka portal: menu, footer, pengumuman** dengan data tiruan.

## 1.15.0 (2026-11-15)

- **Modul profil per peran** (`unipo-ui/siakad`), semua lewat SDK dan akun yang masuk (tanpa ketik NIM/NIDN):
  - `ModulProfilSaya`: kepala profil + tab yang disusun dari peran akun (`GET /v1/profil/saya`). Mahasiswa: data pribadi, orang tua & wali, akademik + riwayat studi, keuangan/UKT, riwayat. Dosen: kepegawaian, mahasiswa PA, jadwal mengajar, penelitian & PkM, riwayat. Tendik: kepegawaian, riwayat. Prop `tab` membatasi atau mengurutkan tab.
  - `KepalaProfilSaya`: foto, nama, NIM/NIDN/NIP, prodi atau unit, kelengkapan profil, ringkasan per peran.
  - `DataPribadiSaya`: data per kelompok dari `data_pribadi[]`; kolom yang `bisa_diubah` disimpan langsung (`POST /v1/profil/saya/data-pribadi`), kolom yang `bisa_diajukan` lewat permohonan perubahan dengan alasan (`POST /v1/profil/permohonan`). Galat per field dari server tampil di field-nya.
  - `OrangTuaWali`: ayah, ibu, wali (`GET /v1/profil/saya/keluarga`, endpoint baru di SIAKAD).
  - `RiwayatProfilSaya` (`jenis`: pendidikan, pekerjaan, prestasi, organisasi): linimasa + tambah/ubah/hapus lewat `/v1/profil/{jenis}`.
  - `KeuanganMahasiswa`: ringkasan tagihan/dibayar/sisa, invoice aktif, rincian per semester dan riwayat pembayaran (`GET /v1/keuangan/mahasiswa/{nim}`).
  - `KepegawaianSaya`: data pegawai, jabatan fungsional, pangkat/golongan, pendidikan, sertifikasi (`GET /v1/sdm/saya` + `/v1/sdm/pegawai/{id}/{jenis}`).
  - `PenelitianDosen`: rekap per tahun, kegiatan penelitian/PkM, luaran (`GET /v1/lppm/peneliti/{nidn}`).
- Halaman docs **Modul profil** (kategori Profil) dengan pengalih peran mahasiswa/dosen/tendik dan data tiruan.

## 1.14.0 (2026-11-15)

- **Ilustrasi per fitur dengan tokoh** (`unipo-ui`): `Ilustrasi` kini punya tokoh yang bisa diatur: gaya rambut/penutup kepala (`gaya`: cepol, pendek, hijab, peci), ekspresi (`ekspresi`: datar, senang, sedih, kaget, bingung), aksesori (`aksesori`: toga, jubah wisuda + selempang, jas, ransel, kacamata, headset, dan satu barang di tangan: laptop, kaca pembesar, dokumen, ijazah, ponsel, buku, kunci, piala, kartu), serta tokoh kedua (`teman`) untuk adegan berdua. Warna baru lewat variabel CSS (`--u-ilus-jubah`, `-emas`, `-hijab`, `-peci`, `-ransel`, `-benda`, `-kulit-sawo`, `-baju-kedua`).
  - 26 adegan fitur (`ILUSTRASI_FITUR`): kelulusan-saya, wisuda, yudisium, e-learning, keamanan, salah-password, ganti-password, verifikasi, pendaftaran, maba, pencarian-mahasiswa, mahasiswa, dosen, tendik, wali-mahasiswa, bimbingan, krs, jadwal, presensi, nilai, skripsi, pembayaran, surat-layanan, cuti-akademik, pengumuman, obrolan.
  - Keadaan baru (`ILUSTRASI_KEADAAN`): sesi-habis, tidak-ditemukan, akses-ditolak, offline. Keadaan lama mendapat ekspresi dan barang yang cocok (galat sedih, cari dengan kaca pembesar, terkunci dengan kunci).
  - Ilustrasi kepala halaman modul katalog tetap tanpa tokoh (`tokoh={false}`).
- **Modal per fitur** (`unipo-ui`): `ModalFitur` (ilustrasi di atas judul, aksi async, kotak galat dengan kode laporan/request_id, `wajib` untuk modal yang tidak bisa ditutup) dan preset `ModalSesiHabis`, `ModalSalahPassword` (sisa percobaan, akun terkunci sampai jam tertentu, lupa password), `ModalAksesDitolak` (scope yang dibutuhkan), `ModalBerhasil`, serta `RincianModal`.
- **Modal terhubung SDK** (`unipo-ui/siakad`):
  - `ModalAjukanLayanan`: katalog `GET /v1/layanan/jenis` (syarat, biaya, lama proses), isian tambahan sesuai jenis (teks, panjang, angka, tanggal, pilihan), `POST /v1/layanan/permohonan` dengan pemohon dari akun yang masuk; galat per field dari server tampil di field-nya; layar nomor permohonan + perkiraan selesai.
  - `ModalCekKelulusan`: `GET /v1/kelulusan/mahasiswa/{nim}/syarat` (IPK, predikat, SKS terhadap batas prodi, syarat wisuda, syarat tambahan prodi, status akhir bila sudah lulus) dengan ilustrasi yang berganti sesuai hasil.
  - `ModalDaftarWisuda` dan `ModalAmbilKrs` membungkus `PendaftaranWisuda` dan `AmbilKrs`; NIM diambil dari akun yang masuk.
  - `PenjagaSesiSiakad` + `laporSesiHabis()`/`pulihkanSesi()`/`useSesiHabis()`: balasan 401 dari `useSiakadQuery` memunculkan `ModalSesiHabis` di seluruh aplikasi.
- Halaman docs **Modal per fitur** dan halaman **Ilustrasi** (adegan fitur, atur tokoh sendiri) dengan data tiruan.

## 1.13.3 (2026-11-15)

- Lencana menu `Sidebar` yang diisi `<Badge>` tidak lagi dibungkus pil kedua (tampil terpotong); di mode rail tetap jadi titik.
- Pilihan prodi PMB: kode jenjang SIAKAD jadi label (`C` -> `S1`), nama prodi huruf judul, nama fakultas tampil bila API mengirim `nama_fakultas` (kode fakultas mentah tidak ditampilkan lagi), kartu dalam satu baris sama tinggi.
- `labelJenjang` mengikuti kode jenjang SIAKAD/PDDikti (`D` = D4, `I` = Sp-2, `J` = Profesi); `hurufJudul` membiarkan kata sambung kecil ("Ilmu Sosial dan Ilmu Politik").
- Formulir PMB: judul daftar langkah jadi "Langkah pengisian" (tidak mengulang judul halaman) dan keterangan langkah prodi tidak lagi mengulang nama gelombang.

## 1.13.2 (2026-11-15)

- Logo aplikasi dengan `tone="inverse"` (pelat putih untuk latar gelap/berwarna) kini menampilkan glyph-nya dengan warna aplikasi. Sebelumnya glyph bawaan (`UnipoAppLogo`, `LogoAplikasi`) dan inisial nama tetap putih sehingga logo tampak sebagai kotak putih kosong.

## 1.13.1 (2026-11-15)

- `Split` bersarang tidak lagi tertukar: aturan `side="start"` dan `sticky` kini hanya berlaku untuk anak langsung. Sebelumnya bagian FAQ landing PMB (Split di dalam Split dengan sidebar kiri) menaruh kartu kontak di kolom lebar dan FAQ di kolom sempit.

## 1.13.0 (2026-11-15)

- **Obrolan terenkripsi end-to-end** (`unipo-ui/siakad`) di atas `/v1/obrolan` SIAKAD, untuk semua peran: mahasiswa, dosen, tendik, maba, panitia, dan pendaftar PMB (lewat aplikasi PMB). Pengganti chat lama yang menyimpan teks polos.
  - Enkripsi di browser (WebCrypto): kunci perangkat ECDH + ECDSA P-256 di IndexedDB, kunci AES-256-GCM per pesan yang dibungkus (ECDH efemeral + HKDF-SHA256 + AES-KW) untuk setiap perangkat aktif anggota, tanda tangan perangkat pengirim, lampiran dienkripsi sebelum diunggah. Server hanya menyimpan ciphertext dan menolak pesan yang tidak dibungkus untuk tepat semua perangkat aktif.
  - `ChatMengambang`: tombol di pojok dengan lencana belum dibaca, panel daftar + ruang (layar penuh di ponsel). `KotakObrolan`: halaman obrolan dua kolom yang menjadi satu kolom di layar sempit.
  - `DaftarPengguna`: cari pengguna (nama, NIM/NIDN) dengan saringan peran dan status daring, kontak terakhir, pilih banyak untuk grup. `DaftarObrolan`: cuplikan pesan terakhir yang didekripsi di browser, belum dibaca, sedang mengetik, sematan, bisu, arsip.
  - `RuangObrolan`: gelembung berkelompok dengan pemisah tanggal, balas dengan kutipan, ubah (panah atas), hapus untuk semua, reaksi emoji, tanda terkirim/diterima/dibaca, sedang mengetik, lampiran gambar dan berkas (seret, tempel, atau pilih), pesan menghilang, kirim ulang pesan gagal, peringatan kunci kontak berubah, draf per ruang.
  - Info ruang: nomor keamanan 60 angka (`NomorKeamanan`), pesan menghilang, bisu, sematkan, anggota grup (tambah, keluarkan, admin), blokir, keluar grup. `PengaturanObrolan`: perangkat tertaut (cabut), cadangan kunci dengan sandi (PBKDF2 600.000 iterasi) dan pulihkan di browser baru, privasi (status daring, tanda dibaca), daftar blokir.
  - Realtime long-poll `GET /v1/obrolan/peristiwa` yang dipakai bersama semua komponen di halaman (`useObrolan()`), menyambung ulang otomatis.
  - `TombolObrolan` dan `bukaObrolan(pemilik)` untuk membuka obrolan dari kartu profil atau daftar dosen wali. `kriptoObrolan` untuk aplikasi atau bot lain yang memakai protokol yang sama.
- Halaman docs **Obrolan terenkripsi** dengan server tiruan; kontak tiruannya memegang kunci perangkat sungguhan, membuka pesan Anda, lalu membalas dengan pesan terenkripsi.

## 1.12.0 (2026-11-15)

- **Sambutan pimpinan** (`unipo-ui`): `SambutanPimpinan` untuk rektor, dekan, kaprodi, atau kepala unit dengan tujuh varian: klasik (foto + tanda tangan), terpisah (foto setengah panel), sorot (panel gelap, kutipan besar), kutipan, kartu (sidebar), minimal (artikel), dan video (YouTube, Vimeo, atau mp4 di dialog). Ringkas paragraf dengan "Baca selengkapnya" atau `tautan`; HTML dari server dibaca sebagai teks (`htmlKeParagraf`, tanpa innerHTML).
- **Testimoni & rating** (`unipo-ui`): `Testimoni` dengan tujuh varian (kisi, masonry, carousel, sorotan, kutipan bergantian, marquee, daftar), tab filter per kelompok (alumni, mahasiswa, orang tua, mitra), ringkasan rating, lencana terverifikasi, dan video. `NilaiBintang` (tampilan pecahan atau isian keyboard), `RingkasanRating` (rata-rata + sebaran bintang), `KartuTestimoni`, `hitungRating`. Nama sengaja berbeda dari `Testimonial`/`Rating` blok landing PMB.
- **Struktur organisasi** (`unipo-ui`): `StrukturOrganisasi` dengan empat varian: bagan berjenjang (garis komando dan garis koordinasi putus-putus, lipat cabang dengan jumlah bawahan, perbesar/perkecil, otomatis menjadi pohon di layar sempit), pohon, kartu per grup, dan tabel jabatan. Cari jabatan/nama menyorot hasil dan membuka cabangnya, jabatan lowong ditandai, klik node membuka detail. `strukturDariDaftar()` mengubah daftar `{ id, induk_id }` menjadi pohon.
- Versi terhubung SIAKAD (`unipo-ui/siakad`): `SambutanPortal` (baris `portal_struktur` yang punya sambutan, atau pengaturan situs `sambutan` + pimpinan resmi `m_pimpinan`/`m_fakultas`), `StrukturPortal` (`GET /v1/portal/struktur`, dengan `strukturDariPortal()` atau `susun` sendiri), dan `TestimoniLandingPmb` (`GET /v1/pmb/info/landing`, kategori ditebak dari peran lewat `kategoriPeran()`).
- `Avatar`: foto yang tidak persegi (mis. potret 4:5) kini tetap terpotong bulat sesuai ukuran avatar.

## 1.11.0 (2026-11-15)

- **Tata letak** (`unipo-ui`): `Container`, `Stack`, `Cluster`, `Grid`, `Split` (kolom utama + samping lekat), `PageHeader`, `Text`, `Heading`, `KontenHtml`, `teksPolos()`. Aplikasi tidak perlu Tailwind atau CSS tata letak sendiri.
- **Blok landing umum** (`unipo-ui`): `FactBoard`, `StatStrip`, `FeatureGrid`, `Gallery`, `Rating`, `Testimonial`/`TestimonialGrid`, `CtaBand`, `Timeline`, `SectionNav` + `useScrollSpy`, `SocialLinks`, `ChatWidget` + `cocokkanFaq()` (asisten FAQ tanpa server).
- **PMB publik** (`unipo-ui/siakad`, `/v1/pmb/info/*`): `PmbProvider` (kampus, rute, `renderLink`, URL kabar humas, URL berkas, render QR), `LandingPmbLengkap` (hero dengan gelombang otomatis, sekilas, jalur & jadwal, prodi, simulasi biaya, testimoni, pengumuman, kabar kampus, FAQ, kontak panitia, sidebar landing, asisten chat), `DetailGelombangPmb`, `DaftarPengumumanPmb`, `DetailPengumumanPmb`, plus hook data (`useGelombangPmb`, `useLandingPmb`, dll.) dan util (`keadaanGelombang`, `rentangPmb`, `sisaHari`).
- **Dasbor pendaftar PMB** (`unipo-ui/siakad`, `/v1/pmb/saya/*`): `PendaftaranAktifPmbProvider` + `PemilihPendaftaranPmb`, `DasborPendaftarPmb` (kartu tahap, tugas yang kurang, tagihan, jadwal tes), `PilihGelombangPendaftarPmb`, `FormulirPendaftarPmb`, `BerkasPendaftarPmb`, `PembayaranPendaftarPmb` (pilih metode, VA/QRIS/tautan bayar, unggah bukti transfer), `UjianPendaftarPmb` + `RuangUjianPmb` (token CBT), `KartuPesertaPmb` (siap cetak, QR), `HasilSeleksiPmb`, `NotifikasiPendaftarPmbDaftar` + `useJumlahNotifikasiPmb`, `AkunPendaftarPmbHalaman` (ubah data, ganti password dengan meter kekuatan), `BannerVerifikasiEmailPmb`.
- **Formulir PMB lebih lengkap**: `WizardPendaftaranPmb` kini memuat sumber informasi, kode referal, wali, langkah prestasi (`IsianPrestasiPmb`) dan nilai rapor (`IsianRaporPmb`) sesuai pengaturan gelombang, mode tinjau saat formulir terkunci, dan alur perbaikan dari panitia. Isian data diri, asal sekolah (NIS), dan orang tua (tanggal lahir, agama, HP, alamat) ditambah.
- **CBT**: `LembarUjian` punya `basePath` (dipakai PMB `/v1/pmb/saya/.../ujian`), antrean jawaban luring yang dikirim ulang saat online, log pengawasan (pindah tab, keluar layar penuh, salin-tempel, koneksi putus), dan ajakan layar penuh.

## 1.10.0 (2026-11-15)

- **Manajer berkas** (`unipo-ui/siakad`): `ManajerBerkas`, pengelola dokumen seperti Google Drive di atas `/v1/berkas` dan `/v1/berkas/folder` (butuh SIAKAD dengan tabel `berkas_folder`).
  - Pohon folder dan subfolder (keyboard: panah, Enter), breadcrumb, tampilan kisi (gambar mini untuk foto) atau daftar, ringkasan ruang penyimpanan.
  - Seret file atau seluruh folder dari komputer untuk mengunggah (subfolder ikut dibuat), dengan antrean unggah: progres per file, batal, ulangi, unggah bertahap otomatis untuk file besar, dan pemeriksaan jenis/ukuran sebelum dikirim.
  - Seret berkas atau folder ke folder lain, ke pohon, atau ke breadcrumb untuk memindah. Pilih banyak (Ctrl/Cmd+klik, Shift+klik, Ctrl+A), menu klik kanan, F2 ganti nama, Delete hapus.
  - Cari di folder ini beserta subfoldernya, filter jenis (gambar, PDF, dokumen, spreadsheet, presentasi, arsip, video, audio), urutkan (terbaru, nama, ukuran).
  - Folder baru dengan warna, ganti nama, pindah, hapus (berkas di dalamnya ke sampah). Hapus berkas selalu soft delete; berkas yang masih dipakai data modul ditolak dengan pesan server.
  - Pratinjau gambar, PDF, video, dan audio beserta detail berkas; unduh lewat tautan sementara.
  - Mode pemilih (`pilih`, `onPilih`) untuk lampiran formulir, mode baca saja, dan ruang folder per `modul` (mis. arsip).
  - Pendukung: `useFolderBerkas()`, `useAksiBerkas()`, `validasiNamaFolder()` (aturan sama dengan server), `jenisBerkas()`, `JENIS_BERKAS`, `WARNA_FOLDER`.
- `useSaatInvalidasi(prefix, fn)`: jalankan fungsi setiap `invalidateSiakad(prefix)` dipanggil, untuk data yang dimuat sendiri.

## 1.9.0 (2026-11-15)

- **LMS mahasiswa** (`unipo-ui/siakad`, berkas `lms-belajar`): semua halaman belajar e-learning di atas `/v1/lms`, sehingga aplikasi LMS cukup menyusun komponen.
  - Kelas: `HalamanKelasLms` (kepala kelas + tab Materi, Tugas, Kuis, Forum, Presensi, Nilai, Peserta, Info), `KepalaKelasLms` dengan progres, `KontenKelasLms`/`DaftarTopikLms` per pertemuan dengan status selesai, `InfoKelasLms`, `PesertaKelasLms`.
  - Materi: `HalamanMateriLms` (teks, PDF, video YouTube/Vimeo, tautan, navigasi sebelum/berikutnya, tandai selesai) dan `KartuKelasDaring` untuk Zoom/Google Meet (aktif 15 menit sebelum mulai, salin ID dan kata sandi).
  - Tugas: `HalamanTugasLms`, `KumpulkanTugasLms` (teks, unggah berkas ke `/v1/lms/file`, simpan draf, kumpulkan dengan konfirmasi), rubrik, nilai, umpan balik.
  - Kuis: `HalamanKuisLms` (ketentuan, percobaan, kata sandi), `RuangKuisLms` (layar penuh, simpan otomatis dengan coba ulang, ragu-ragu, peta soal, timer, kirim otomatis saat waktu habis; memakai `SoalCbt`), `HasilKuisLms` + `PembahasanSoalLms`.
  - Forum bertingkat: `DaftarForumKelasLms`, `UtasForumLms`, `UtasBaruLms`, `DiskusiLms`, `KirimanForumLms`.
  - `PresensiKelasLms` (isi kode presensi, rekap H/I/S/A), `NilaiKelasSayaLms` (buku nilai + perkiraan nilai akhir), `RekapNilaiKelasLms`.
  - Beranda: `KelasDaringMendatang`, `TenggatLms`, `JadwalHariIniLms`, `TugasKuisSayaLms` (lintas kelas), `DaftarNotifikasiLms` (tandai dibaca).
  - Publik: `KatalogKelasTerbuka`/`KartuKelasTerbuka` dari `/v1/lms/terbuka` (tanpa token, untuk landing page) dan `GabungKelasKodeLms`.
  - `KalenderLms`: tenggat tugas, kuis, pertemuan, dan kelas daring digabung dengan kalender akademik SIAKAD.
  - `LmsRuteProvider`/`RUTE_LMS` mengatur alamat halaman yang dipakai tautan, dan `rute.pindah` meneruskan perpindahan halaman (mulai kuis, selesai kuis, buka utas) ke router SPA; `GalatLms` menampilkan galat dengan kode laporan. Hook data `useKontenKelas`, `useTugasLms`, `useKuisLms`, `useSemuaKelasLms`, dan lainnya ikut diekspor.
- `KalenderAkademik` menerima kegiatan dari luar (`tambahan`, `labelJenis`, `warnaJenis`, `onRentangChange`). Klik kegiatan tetap memilih tanggalnya walau `onKegiatanClick` diisi.
- `Stepper align="center"`: penanda dan teks langkah di tengah, garis penghubung antarpenanda (simetris untuk landing).
- `Ilustrasi tokoh`: tampilkan tokoh orang (`jalan`, `tunjuk`, `duduk`) pada adegan apa pun, atau `false` untuk menyembunyikannya.
- `Hero`: media berupa `Ilustrasi` tampil tanpa kotak abu-abu, menyatu dengan latar halaman (terang dan gelap).
- Sampul kelas (`SampulKelas`) hanya memakai warna `--u-chart-1` sampai `--u-chart-6`, jadi tidak lagi hitam.
- Halaman docs **LMS mahasiswa** dengan data contoh.

## 1.8.1 (2026-11-15)

- `MenuAkun`/`KartuAkun`: jalur mengikuti rute profile.unipo.ac.id. Ubah profil dan Ganti foto ke `/profil`, Ganti password ke `/akun` (sebelumnya `/keamanan`, yang tidak ada), item baru **Data pribadi** (`/data-pribadi`), dan bilah kelengkapan menuju Data pribadi.

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
  - `MenuAkun`: kepala berisi foto, nama, dan "username · peran"; item Profil saya (`/`), Ubah profil (`/profil`), Data pribadi (`/data-pribadi`), Ganti foto, Ganti password (`/akun`) di aplikasi Profil, Keamanan akun (SSO), item tambahan, lalu Keluar dari semua aplikasi. Lima bentuk pemicu: `pil` (seperti SSO), `nama`, `avatar`, `ikon`, `sidebar` (menu terbuka ke atas). Opsional: bilah **Lengkapi profil** dari persen kelengkapan, pilihan peran, dan pilihan tema.
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
