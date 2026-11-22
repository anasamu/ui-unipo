# Panduan agen untuk ui-unipo

Berkas ini dibaca agen pemrograman (Claude Code, Codex, Cursor, dan sejenisnya) sebelum mengubah repo ini. `AGENTS.md` menunjuk ke sini.

## Skill wajib (keputusan Anas, 22 Nov 2026)

Setiap pengembangan komponen unipo-ui memakai dua skill berikut. `.claude/settings.json` sudah mendaftarkan keduanya sehingga Claude Code menawarkannya otomatis saat repo dibuka.

1. **modern-web-guidance** (Google Chrome, `googlechrome/modern-web-guidance`)
   - Jalankan sebelum menulis atau mengubah komponen, CSS, tata letak, form, tabel, tab, dialog/panel samping, pilihan, peringatan, aksesibilitas, atau logika tanggal/zona waktu di sisi klien.
   - Cari dengan 2 sampai 5 kata berbahasa Inggris untuk satu kemampuan, lalu ambil panduannya:
     ```sh
     npx -y modern-web-guidance@latest search "responsive data table"
     npx -y modern-web-guidance@latest retrieve "responsive-table,accessibility"
     ```
   - Fitur yang belum Baseline Widely available wajib memakai cadangan (fallback) sesuai panduan.
   - Deskripsi PR mencantumkan bagian **Modern Web Guidance**: id panduan yang dipakai dan keputusan yang diambil karenanya.
2. **unslop** (`heydamir/unslop`)
   - Dipakai saat membuat atau merapikan tampilan, supaya antarmuka tidak terlihat buatan AI: tanpa gradien ungu, cahaya, teks bergradien, emoji di label, lencana "Baru", label huruf kapital berjarak, atau jarak yang tidak seragam.
   - Ikuti urutan lapisan unslop: jarak, warna, ikon, teks, tipografi, tata letak, detail, visual, gerak. Bingkai tetap tenang dengan token warna unipo-ui; satu elemen menonjol per layar.

Pasang di Claude Code lokal bila belum ada:
```sh
claude plugin marketplace add googlechrome/modern-web-guidance
claude plugin install modern-web-guidance@googlechrome
claude plugin marketplace add heydamir/unslop
claude plugin install unslop@heydamir
```
Di lingkungan tanpa plugin, cukup jalankan perintah `npx` di atas dan baca `SKILL.md` dari kedua repo tersebut.

## Aturan kerja yang sudah berlaku

- Komponen dipakai lintas aplikasi dan lintas kampus: tanpa istilah teknis di layar, bahasa Indonesia awam, presisi dan responsif (1440, 1024, 390).
- Form dibuka di panel samping; isian banyak memakai wizard bertahap.
- Tab: 3 sub tab atau lebih vertikal, 2 horizontal; di panel samping horizontal dan menjadi pilihan tarik-turun bila tidak muat. Isi tab berada di dalam komponen Tabs.
- Tabel memakai DataTable tanpa bingkai ganda; bilah alat (saringan, tampilan baris, Kolom, ekspor) satu baris.
- Judul dan keterangan halaman hanya sekali di kepala halaman.
- Pilihan yang datanya kosong menampilkan tombol buat bagi yang berhak dan unit pengelola bagi yang tidak.
- Elemen klik memakai `Tekan`; tombol bawaan dicegah oleh `periksa-elemen`.
- Versi `packages/ui` dan `packages/tokens` selalu sama (`npm run versi`).
- Uji sebelum PR: `tsc`, `vitest`, `npm run periksa:elemen`.
