# ui-unipo: cara kerja agen

Pustaka komponen UNIPO (`unipo-ui`, `unipo-ui-tokens`) yang dipakai semua aplikasi web dan desktop UNIPO.

## Skill wajib (keputusan Anas 2026-11-22)
- **modern-web-guidance** (terpasang di `.claude/skills/modern-web-guidance`): sebelum menulis atau mengubah HTML/CSS/JS klien, jalankan
  `npx -y modern-web-guidance@latest search "<2–5 kata, mis. light dismiss dialog>"` lalu `retrieve "<id>"`, dan ikuti panduannya
  (elemen/API platform modern: `<dialog>`/popover, container query, `:has()`, view transitions, aksesibilitas, CWV). Untuk audit pola lama:
  `npx -y modern-web-guidance@latest legacy-scan packages/ui/src`.
- **Skill desain** bila tersedia di sesi: ui-ux-pro-max, design-system, ui-styling, design, frontend-design.

## Aturan komponen
- Semua komponen memakai token `unipo-ui-tokens` (warna, jarak, radius); tanpa nilai mentah, terang/gelap dari token.
- Aksesibilitas: elemen semantik, fokus papan ketik standar (`<Tekan>` untuk kartu/baris/chip yang bisa diklik), label & ARIA benar.
- Tabel: `DataTable` (+ `useSiakadTable`/FilterBar); bilah alat (saringan, kerapatan, Kolom, ekspor) satu baris, berjarak dari tepi bingkai; tanpa bingkai ganda.
- Tab: sub tab tingkat kedua ≥3 vertikal (isi lewat `content`/children, bukan dirender di luar Tabs); 2 tab horizontal; di panel samping horizontal dan menjadi pilihan bila tidak muat.
- Form di panel samping (Sheet) atau wizard; pemilih bercari, bukan ketik ID/kode; pilihan kosong memakai pola `buat` (tombol buat bagi yang berhak, unit pengelola bagi yang tidak).
- Judul/keterangan halaman hanya sekali; komponen isi tab menerima `judul={null}`.
- Bahasa antarmuka: Indonesia awam, tanpa istilah teknis.

## Alur kerja
- Uji: `npm run typecheck -w unipo-ui`, `npm test -w unipo-ui`, sass (`scss/index.scss`), `npx unipo-ui periksa-elemen`; contoh baru di galeri `apps/docs`.
- Catat perubahan di `CHANGELOG.md` (bagian versi yang belum dirilis). Versi naik bersama lewat `npm run versi`.
- Commit atas nama Anas Amu tanpa atribusi; PR draf; merge hanya oleh Anas; jangan push ke `main`.
