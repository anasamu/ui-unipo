import * as React from 'react';
import { Field, Textarea } from 'unipo-ui';
import { EditorDokumen } from 'unipo-ui/editor';
import { AnalisisAi, BantuTulisAi, BuatSoalAi, KoreksiEsaiAi, ObrolanAi, PemakaianAi, RingkasAi, TombolAsistenDokumen, AsistenDokumen } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Komponen AI',
  category: 'AI',
  layout: 'wide',
  order: 1,
  badge: 'baru',
  description:
    'Komponen AI di atas POST /v1/integrasi/ai/teks SIAKAD: obrolan seperti ChatGPT, Claude, atau Gemini (penyedia dipilih dari yang diaktifkan Pustikom), asisten dokumen, bantu tulis, ringkasan, analisis data keuangan/mahasiswa/akademik, pembuat soal CBT/LMS, saran nilai esai, dan rekap pemakaian. Kunci API penyedia tetap di server; browser hanya memakai token SIAKAD.',
  importLine: "import { ObrolanAi, AsistenDokumen, TombolAsistenDokumen, BantuTulisAi, RingkasAi, AnalisisAi, BuatSoalAi, KoreksiEsaiAi, PemakaianAi, useAi } from 'unipo-ui/siakad';",
  demos: {
    Obrolan: 'ObrolanAi: percakapan dengan pilihan penyedia, salin, ulangi, hentikan',
    Dokumen: 'TombolAsistenDokumen di slot aksi EditorDokumen: buat draf, rapikan, ringkas, terjemahkan',
    Asisten: 'AsistenDokumen langsung (tanpa panel)',
    BantuTulis: 'BantuTulisAi di samping isian teks + RingkasAi',
    Analisis: 'AnalisisAi konteks keuangan dengan data tagihan per prodi',
    AnalisisMahasiswa: 'AnalisisAi konteks mahasiswa (EWS)',
    Soal: 'BuatSoalAi: materi → soal tervalidasi → POST /v1/cbt/soal',
    Koreksi: 'KoreksiEsaiAi: saran skor dan umpan balik esai',
    Pemakaian: 'PemakaianAi: rekap token per hari, aplikasi, dan model',
  },
  props: [
    [
      'useAi(bawaan)',
      '{ minta, batal, reset, sibuk, galat, hasil }',
      '`minta({ prompt | pesan, sistem, json, effort, maks_token, penyedia })` tidak melempar galat; hasil `{ hasil, galat, dibatalkan }`.',
    ],
    ['ObrolanAi.sistem / konteks', 'string', 'Instruksi tambahan dan data halaman yang boleh dipakai asisten.'],
    ['ObrolanAi.penyedia / pilihPenyedia', 'string | null / boolean', 'Kode penyedia awal (null = utama) dan tampil tidaknya pilihan penyedia.'],
    ['AsistenDokumen.html / onTerapkan', 'string / (html) => void', 'Isi dokumen saat ini; hasil sudah disaring seperti HtmlSanitizer SIAKAD.'],
    ['AsistenDokumen.jenis', 'JenisDokumenAi', 'surat, sk, notulen, laporan, proposal, pengumuman, berita, skripsi, rps, bebas.'],
    ['BantuTulisAi.nilai / onGanti', 'string / (teks) => void', 'Perbaiki, formal, persingkat, kembangkan, judul, Inggris; ada Urungkan.'],
    ['AnalisisAi.data | sumber', 'unknown | { path, query }', 'Data langsung atau GET endpoint SIAKAD. Kolom pribadi (KOLOM_SAMAR_AI) disamarkan, baris dibatasi `maksBaris`.'],
    ['AnalisisAi.konteks', 'KonteksAnalisisAi', 'keuangan, mahasiswa, akademik, pmb, sdm, edom, umum (arahan dan contoh pertanyaan).'],
    ['BuatSoalAi.tujuan', "'cbt' | 'lms' | 'bebas'", 'Simpan ke /v1/cbt/soal (ujianId), /v1/lms/bank-soal (kodeMk), atau hanya onSimpan.'],
    ['validasiSoalAi(soal, poin)', '{ soal, galat }', 'Aturan sama dengan PenilaianKuis::validasiSoal di SIAKAD.'],
    ['KoreksiEsaiAi.onPakai', '(saran) => void', 'Skor dibatasi 0..poinMaks; keputusan tetap di pengajar.'],
    ['galatMasukanAi / pesanGalatAi', 'string | null / string', 'Pemeriksaan masukan sama dengan server dan pesan galat (kuota_habis, penyedia_gagal, scope).'],
  ],
  notes: [
    'Scope token: integrasi:ai. Simpan soal butuh scope CBT/LMS seperti biasa. Kuota token harian per aplikasi diatur di penyedia (Pustikom); bila habis server menjawab 429 kuota_habis.',
    'Server tidak menyimpan isi percakapan. ObrolanAi mengirim ulang riwayat setiap giliran dan memangkasnya agar muat 100 pesan / 400.000 karakter.',
    'Jawaban ditolak pengaman model tampil sebagai peringatan, bukan galat. Coba di demo dengan menulis kata "senjata"; tulis "kuota" untuk melihat galat kuota habis.',
    'Penanda {{nama}} di dokumen diperiksa sebelum dan sesudah AI; yang hilang atau tidak dikenal diberi peringatan.',
  ],
};

export function Obrolan() {
  return <ObrolanAi judul="Asisten akademik" sistem="Pengguna adalah mahasiswa UNIPO." />;
}

const SURAT_AWAL =
  '<p>dengan hormat, sehubungan dgn berakhirnya masa pengisian krs semester ganjil 2026/2027 kami mengundang bapak/ibu utk menghadiri rapat evaluasi pada senin 20 november 2026 jam 09.00 wita di ruang senat. kehadiran bapak ibu {{nama_penerima}} sangat di harapkan. terimakasih</p>';

export function Dokumen() {
  const [versi, setVersi] = React.useState({ n: 0, html: SURAT_AWAL });
  const [html, setHtml] = React.useState(SURAT_AWAL);
  return (
    <EditorDokumen
      key={versi.n}
      nilaiAwal={versi.html}
      onChange={(h) => setHtml(h)}
      penanda={[{ nama: 'nama_penerima', label: 'Nama penerima' }]}
      tinggi={560}
      panelAwal={false}
      aksi={() => <TombolAsistenDokumen html={html} jenis="surat" penanda={['nama_penerima']} onTerapkan={(h) => setVersi((v) => ({ n: v.n + 1, html: h }))} />}
    />
  );
}

export function Asisten() {
  return <AsistenDokumen jenis="notulen" onTerapkan={() => undefined} />;
}

export function BantuTulis() {
  const [isi, setIsi] = React.useState('batas pengisian krs diperpanjang sampai jumat. mahasiswa yg belum isi segera isi dan minta persetujuan dosen pa');
  const TIKET =
    'Mahasiswa: Selamat siang, nilai UTS Basis Data saya belum muncul di KHS padahal teman sekelas sudah. Kelas TI-3A.\nPetugas: Sudah kami cek, nilai dari dosen sudah diunggah tetapi status kelas masih draf.\nMahasiswa: Jadi kapan bisa muncul? Saya perlu untuk syarat beasiswa minggu depan.\nPetugas: Kami teruskan ke operator prodi untuk dikunci.';
  return (
    <div style={{ display: 'grid', gap: '1.25rem', maxWidth: 640 }}>
      <Field
        label="Isi pengumuman"
        description={<BantuTulisAi nilai={isi} onGanti={setIsi} konteks="pengumuman akademik untuk mahasiswa" aksi={['perbaiki', 'formal', 'singkat', 'kembangkan', 'judul', 'inggris']} />}
      >
        <Textarea rows={4} value={isi} onChange={(e) => setIsi(e.target.value)} />
      </Field>
      <RingkasAi judul="Ringkasan tiket helpdesk" teks={TIKET} />
    </div>
  );
}

const TAGIHAN = [
  { prodi: 'Teknik Informatika', mahasiswa: 412, tagihan: 618_000_000, terbayar: 406_000_000, cicilan: 63, nik: '7504011203040001' },
  { prodi: 'Manajemen', mahasiswa: 388, tagihan: 543_000_000, terbayar: 401_000_000, cicilan: 41 },
  { prodi: 'Hukum', mahasiswa: 301, tagihan: 421_000_000, terbayar: 352_000_000, cicilan: 22 },
  { prodi: 'Keperawatan', mahasiswa: 276, tagihan: 470_000_000, terbayar: 438_000_000, cicilan: 9 },
  { prodi: 'Kebidanan', mahasiswa: 238, tagihan: 405_000_000, terbayar: 377_000_000, cicilan: 7 },
];

export function Analisis() {
  return <AnalisisAi konteks="keuangan" data={TAGIHAN} keteranganData="Tagihan UKT semester ganjil 2026/2027 per prodi dalam rupiah; cicilan = jumlah mahasiswa skema cicilan." />;
}

export function AnalisisMahasiswa() {
  const data = Array.from({ length: 60 }, (_, i) => ({
    nim: `23041100${String(i + 1).padStart(2, '0')}`,
    angkatan: 2023 + (i % 3),
    ipk: Math.round((1.6 + ((i * 37) % 24) / 10) * 100) / 100,
    kehadiran: 45 + ((i * 13) % 55),
    email: `mhs${i}@unipo.ac.id`,
  }));
  return <AnalisisAi konteks="mahasiswa" data={data} maksBaris={40} />;
}

export function Soal() {
  return (
    <BuatSoalAi
      tujuan="cbt"
      materiAwal="Normalisasi basis data: 1NF (atribut atomik), 2NF (tanpa dependensi parsial), 3NF (tanpa dependensi transitif), BCNF, serta anomali sisip, ubah, dan hapus."
      jenisAwal={['pilihan_ganda', 'benar_salah', 'isian_singkat']}
    />
  );
}

export function Koreksi() {
  return (
    <KoreksiEsaiAi
      pertanyaan="Jelaskan langkah menormalisasi tabel KRS(nim, nama_mhs, kode_mk, nama_mk, sks, nilai) hingga 3NF."
      jawaban="Kunci tabel adalah gabungan nim dan kode_mk. nama_mhs hanya bergantung pada nim dan nama_mk serta sks hanya bergantung pada kode_mk, jadi ada dependensi parsial. Tabel dipecah menjadi Mahasiswa(nim, nama_mhs), MataKuliah(kode_mk, nama_mk, sks), dan KRS(nim, kode_mk, nilai)."
      rubrik="Identifikasi kunci (20), dependensi parsial (30), dekomposisi benar (40), penjelasan 3NF (10)."
      poinMaks={100}
      onPakai={() => undefined}
    />
  );
}

export function Pemakaian() {
  return <PemakaianAi />;
}
