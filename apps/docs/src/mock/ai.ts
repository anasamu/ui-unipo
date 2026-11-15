// Data contoh layanan AI (/v1/integrasi/ai): penyedia, jawaban teks/JSON per modul, pemakaian, simpan soal. Isi rekaan.
import { tambahRute } from './siakad';

const badan = (init?: RequestInit) => (init?.body ? JSON.parse(String(init.body)) : {}) as Record<string, any>;
const tunggu = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PENYEDIA = [
  { kode: 'claude', driver: 'anthropic', nama: 'Claude', utama: true, model: 'claude-opus-5-5' },
  { kode: 'gpt', driver: 'openai_kompatibel', nama: 'GPT', utama: false, model: 'gpt-5' },
  { kode: 'gemini', driver: 'gemini', nama: 'Gemini', utama: false, model: 'gemini-2.5-pro' },
];

tambahRute(/\/v1\/integrasi\/ai\/penyedia$/, () => ({ data: PENYEDIA }));

// ---------------------------------------------------------------- Jawaban per modul
function jawabObrolan(tanya: string): string {
  const t = tanya.toLowerCase();
  if (t.includes('rencana belajar')) {
    return [
      '## Rencana belajar 4 minggu: Basis Data',
      '',
      'Targetnya: paham pemodelan data, SQL dasar sampai lanjut, dan normalisasi.',
      '',
      '| Minggu | Fokus | Latihan |',
      '|---|---|---|',
      '| 1 | ERD dan pemodelan konseptual | Buat ERD sistem perpustakaan |',
      '| 2 | SQL dasar: SELECT, JOIN, GROUP BY | 20 soal kueri di basis data contoh |',
      '| 3 | Normalisasi 1NF–3NF | Normalisasi tabel KRS |',
      '| 4 | Indeks, transaksi, review | Kerjakan soal UTS tahun lalu |',
      '',
      '**Tips:** sisihkan 45 menit setiap hari dan catat kueri yang salah beserta penyebabnya.',
    ].join('\n');
  }
  if (t.includes('sks')) {
    return [
      'Satu **SKS** setara 170 menit kegiatan belajar per minggu per semester. Pembagiannya berbeda menurut bentuk pembelajaran:',
      '',
      '- **Teori (kuliah):** 50 menit tatap muka, 60 menit penugasan terstruktur, 60 menit belajar mandiri.',
      '- **Praktikum/praktik:** 170 menit kegiatan di laboratorium atau lapangan.',
      '',
      'Jadi mata kuliah 3 SKS teori berarti 150 menit tatap muka per minggu. Aturan rinci tiap prodi bisa dilihat di buku pedoman akademik.',
    ].join('\n');
  }
  if (t.includes('email') || t.includes('izin')) {
    return [
      'Berikut drafnya:',
      '',
      '> **Perihal:** Izin tidak mengikuti perkuliahan',
      '',
      'Yth. Bapak/Ibu Dosen Pengampu,',
      '',
      'Dengan hormat, saya **[Nama]**, NIM **[NIM]**, mahasiswa kelas **[Kelas]**, memohon izin tidak mengikuti perkuliahan pada **[hari, tanggal]** karena **[alasan]**. Saya akan mempelajari materi yang tertinggal dan mengumpulkan tugas sesuai tenggat.',
      '',
      'Atas perhatian Bapak/Ibu, saya ucapkan terima kasih.',
      '',
      'Hormat saya,  ',
      '[Nama]',
    ].join('\n');
  }
  return `Baik. Untuk pertanyaan "${tanya.slice(0, 80)}", berikut jawaban singkatnya:\n\n1. Pastikan data yang Anda pakai berasal dari SIAKAD terbaru.\n2. Bila menyangkut aturan akademik, cek pedoman akademik prodi.\n3. Tanyakan ke bagian akademik bila masih ragu.\n\nIni jawaban contoh di halaman dokumentasi; di aplikasi sungguhan jawabannya datang dari penyedia AI yang dipilih.`;
}

function jawabDokumen(prompt: string): string {
  if (prompt.startsWith('Rapikan')) {
    return '<h2>Undangan Rapat Evaluasi KRS</h2><p>Dengan hormat,</p><p>Sehubungan dengan berakhirnya masa pengisian KRS Semester Ganjil 2026/2027, kami mengundang Bapak/Ibu untuk menghadiri rapat evaluasi yang akan dilaksanakan pada:</p><table><tbody><tr><td>Hari, tanggal</td><td>Senin, 20 November 2026</td></tr><tr><td>Waktu</td><td>09.00 WITA s.d. selesai</td></tr><tr><td>Tempat</td><td>Ruang Senat</td></tr></tbody></table><p>Mengingat pentingnya acara tersebut, kehadiran Bapak/Ibu {{nama_penerima}} sangat kami harapkan.</p><p>Atas perhatian dan kehadirannya, kami ucapkan terima kasih.</p>';
  }
  if (prompt.startsWith('Ringkas')) {
    return '<ul><li>Rapat evaluasi KRS Semester Ganjil 2026/2027.</li><li>Senin, 20 November 2026, pukul 09.00 WITA, di Ruang Senat.</li><li>Seluruh kaprodi diharapkan hadir.</li></ul>';
  }
  if (prompt.startsWith('Terjemahkan')) {
    return '<h2>Invitation: KRS Evaluation Meeting</h2><p>Dear Sir/Madam,</p><p>Following the close of course registration (KRS) for the Odd Semester 2026/2027, we invite you to attend an evaluation meeting on Monday, 20 November 2026 at 09.00 WITA in the Senate Room.</p><p>Your attendance, {{nama_penerima}}, is highly expected.</p><p>Thank you for your attention.</p>';
  }
  return '<p>Dengan hormat,</p><p>Sehubungan dengan berakhirnya masa pengisian Kartu Rencana Studi (KRS) Semester Ganjil Tahun Akademik 2026/2027, kami mengundang Bapak/Ibu Ketua Program Studi untuk menghadiri rapat evaluasi KRS yang akan dilaksanakan pada:</p><table><tbody><tr><td>Hari, tanggal</td><td>Senin, 20 November 2026</td></tr><tr><td>Waktu</td><td>09.00 WITA s.d. selesai</td></tr><tr><td>Tempat</td><td>Ruang Senat Universitas Pohuwato</td></tr><tr><td>Acara</td><td>Evaluasi pengisian KRS dan persetujuan dosen PA</td></tr></tbody></table><p>Mohon membawa rekap KRS program studi masing-masing. Mengingat pentingnya acara ini, kehadiran Bapak/Ibu sangat kami harapkan.</p><p>Atas perhatian dan kehadirannya, kami ucapkan terima kasih.</p>';
}

function jawabTulis(prompt: string): string {
  const teks = prompt.split('\n\nTeks:\n')[1] ?? '';
  const kalimat = teks.trim().replace(/\s+/g, ' ');
  if (prompt.startsWith('Perbaiki'))
    return (
      kalimat.charAt(0).toUpperCase() +
      kalimat
        .slice(1)
        .replace(/\bkrs\b/gi, 'KRS')
        .replace(/\s*$/, '')
        .replace(/[.!]?$/, '.')
    );
  if (prompt.startsWith('Tulis ulang'))
    return `Dengan hormat, kami sampaikan bahwa ${kalimat.charAt(0).toLowerCase()}${kalimat.slice(1).replace(/[.!]?$/, '.')} Atas perhatiannya, kami ucapkan terima kasih.`;
  if (prompt.startsWith('Persingkat')) return (kalimat.split(/(?<=[.!?])\s/)[0] ?? kalimat).replace(/[.!]?$/, '.');
  if (prompt.startsWith('Kembangkan')) return `${kalimat.replace(/[.!]?$/, '.')} Informasi lebih lanjut dapat ditanyakan ke bagian akademik fakultas pada jam kerja.`;
  if (prompt.startsWith('Buat satu judul')) return 'Batas Pengisian KRS Diperpanjang hingga Jumat';
  return 'The course registration (KRS) deadline has been extended until Friday. Please complete your registration and ask your academic advisor for approval.';
}

const ANALISIS: Record<string, unknown> = {
  keuangan: {
    ringkasan:
      'Tingkat kolektibilitas semester ini 78%. Tunggakan terkonsentrasi di Teknik Informatika dan Manajemen, terutama angkatan 2023 yang memilih cicilan tetapi berhenti setelah angsuran kedua.',
    angka_kunci: [
      { label: 'Total tagihan', nilai: 'Rp2,46 M' },
      { label: 'Terbayar', nilai: 'Rp1,92 M', keterangan: '78% dari tagihan' },
      { label: 'Tunggakan', nilai: 'Rp540 jt', keterangan: '186 mahasiswa' },
      { label: 'Prodi tertinggi', nilai: 'Teknik Informatika', keterangan: 'Rp212 jt' },
    ],
    temuan: [
      { judul: 'Cicilan macet setelah angsuran kedua', detail: '41 dari 63 mahasiswa skema cicilan angkatan 2023 belum membayar angsuran ketiga yang jatuh tempo 15 Oktober.', tingkat: 'kritis' },
      { judul: 'Pembayaran menumpuk di minggu terakhir', detail: '52% pembayaran masuk pada 7 hari sebelum batas KRS, sehingga rekonsiliasi VA tertunda.', tingkat: 'perhatian' },
      { judul: 'Prodi kesehatan hampir lunas', detail: 'Keperawatan dan Kebidanan mencapai kolektibilitas di atas 92%.', tingkat: 'info' },
    ],
    rekomendasi: [
      { tindakan: 'Hubungi 41 mahasiswa cicilan macet sebelum UAS', alasan: 'Mereka berisiko tidak bisa mencetak kartu ujian.', prioritas: 'tinggi' },
      { tindakan: 'Kirim pengingat otomatis H-14 dan H-7 sebelum jatuh tempo', alasan: 'Mengurangi penumpukan pembayaran di minggu terakhir.', prioritas: 'sedang' },
      { tindakan: 'Tinjau syarat skema cicilan untuk angkatan baru', prioritas: 'rendah' },
    ],
    keterbatasan: 'Data hanya mencakup tagihan UKT; denda dan biaya wisuda tidak termasuk.',
  },
  mahasiswa: {
    ringkasan: '37 mahasiswa masuk kategori risiko tinggi putus studi. Pola terkuatnya adalah IPS di bawah 2,0 dua semester berturut-turut disertai kehadiran di bawah 60%.',
    angka_kunci: [
      { label: 'Risiko tinggi', nilai: '37', keterangan: '2,4% mahasiswa aktif' },
      { label: 'Risiko sedang', nilai: '112' },
      { label: 'Rata-rata IPK', nilai: '3,12' },
      { label: 'Kehadiran < 60%', nilai: '58 mahasiswa' },
    ],
    temuan: [
      { judul: 'Angkatan 2024 paling rentan', detail: '21 dari 37 mahasiswa berisiko tinggi berasal dari angkatan 2024, mayoritas di Teknik Informatika.', tingkat: 'kritis' },
      { judul: 'Kehadiran memprediksi IPS', detail: 'Mahasiswa dengan kehadiran di bawah 60% punya IPS rata-rata 1,8 dibanding 3,2 untuk yang di atas 80%.', tingkat: 'perhatian' },
    ],
    rekomendasi: [
      { tindakan: 'Jadwalkan konseling dosen PA untuk 37 mahasiswa risiko tinggi', alasan: 'Intervensi sebelum UAS paling efektif.', prioritas: 'tinggi' },
      { tindakan: 'Aktifkan notifikasi kehadiran ke dosen PA', alasan: 'Ketidakhadiran adalah tanda awal paling jelas.', prioritas: 'sedang' },
    ],
    keterbatasan: 'Data keuangan dan kondisi pribadi mahasiswa tidak disertakan.',
  },
};

function jawabSoal(prompt: string): string {
  const jumlah = Number(/Buat (\d+) soal/.exec(prompt)?.[1] ?? 5);
  const jenis = (/bagi rata\): ([^\n]+)/.exec(prompt)?.[1] ?? 'pilihan_ganda').split(',').map((x) => x.trim());
  const contoh: Record<string, any[]> = {
    pilihan_ganda: [
      {
        jenis: 'pilihan_ganda',
        pertanyaan: 'Sebuah tabel memiliki atribut bernilai ganda (multivalued). Bentuk normal apa yang dilanggar?',
        opsi: [
          { id: 'a', teks: '1NF' },
          { id: 'b', teks: '2NF' },
          { id: 'c', teks: '3NF' },
          { id: 'd', teks: 'BCNF' },
        ],
        kunci: 'a',
        pembahasan: '1NF mensyaratkan setiap atribut bernilai atomik.',
        tingkat: 'mudah',
      },
      {
        jenis: 'pilihan_ganda',
        pertanyaan: 'Anomali yang terjadi saat data dosen hilang ketika mata kuliah terakhirnya dihapus disebut …',
        opsi: [
          { id: 'a', teks: 'Anomali sisip' },
          { id: 'b', teks: 'Anomali ubah' },
          { id: 'c', teks: 'Anomali hapus' },
          { id: 'd', teks: 'Anomali baca' },
        ],
        kunci: 'e',
        pembahasan: 'Contoh soal dengan kunci salah agar terlihat pemeriksaan.',
        tingkat: 'sedang',
      },
      {
        jenis: 'pilihan_ganda',
        pertanyaan: 'Dependensi parsial terhadap kunci gabungan dihilangkan pada tahap normalisasi …',
        opsi: [
          { id: 'a', teks: '1NF' },
          { id: 'b', teks: '2NF' },
          { id: 'c', teks: '3NF' },
          { id: 'd', teks: '4NF' },
        ],
        kunci: 'b',
        pembahasan: '2NF menghapus dependensi parsial.',
        tingkat: 'sedang',
      },
    ],
    pilihan_ganda_banyak: [
      {
        jenis: 'pilihan_ganda_banyak',
        pertanyaan: 'Manakah yang termasuk syarat 3NF? (pilih semua yang benar)',
        opsi: [
          { id: 'a', teks: 'Sudah memenuhi 2NF' },
          { id: 'b', teks: 'Tidak ada dependensi transitif' },
          { id: 'c', teks: 'Semua atribut adalah kunci' },
          { id: 'd', teks: 'Tidak ada atribut bernilai ganda' },
        ],
        kunci: ['a', 'b', 'd'],
        pembahasan: '3NF = 2NF + tanpa dependensi transitif; 2NF sudah mencakup 1NF.',
        tingkat: 'sulit',
      },
    ],
    benar_salah: [{ jenis: 'benar_salah', pertanyaan: 'Setiap relasi yang memenuhi BCNF pasti memenuhi 3NF.', opsi: null, kunci: true, pembahasan: 'BCNF lebih ketat dari 3NF.', tingkat: 'sedang' }],
    isian_singkat: [
      {
        jenis: 'isian_singkat',
        pertanyaan: 'Hubungan A → B dan B → C sehingga A → C disebut dependensi …',
        opsi: null,
        kunci: ['transitif', 'dependensi transitif'],
        pembahasan: '',
        tingkat: 'mudah',
      },
    ],
    esai: [
      {
        jenis: 'esai',
        pertanyaan: 'Jelaskan langkah menormalisasi tabel KRS(nim, nama_mhs, kode_mk, nama_mk, sks, nilai) hingga 3NF dan tunjukkan tabel hasilnya.',
        opsi: null,
        kunci: null,
        pembahasan: 'Rubrik: identifikasi kunci (20), dependensi parsial (30), dekomposisi benar (40), penjelasan (10).',
        tingkat: 'sulit',
      },
    ],
    menjodohkan: [
      {
        jenis: 'menjodohkan',
        pertanyaan: 'Jodohkan bentuk normal dengan syaratnya.',
        opsi: {
          kiri: [
            { id: '1', teks: '1NF' },
            { id: '2', teks: '2NF' },
            { id: '3', teks: '3NF' },
          ],
          kanan: [
            { id: 'x', teks: 'Tanpa dependensi transitif' },
            { id: 'y', teks: 'Atribut atomik' },
            { id: 'z', teks: 'Tanpa dependensi parsial' },
          ],
        },
        kunci: { '1': 'y', '2': 'z', '3': 'x' },
        pembahasan: '',
        tingkat: 'sedang',
      },
    ],
  };
  const soal: any[] = [];
  const ke: Record<string, number> = {};
  for (let i = 0; soal.length < jumlah && i < 40; i++) {
    const j = jenis[i % jenis.length];
    const daftar = contoh[j] ?? contoh.pilihan_ganda;
    ke[j] = (ke[j] ?? -1) + 1;
    soal.push(daftar[ke[j] % daftar.length]);
  }
  return JSON.stringify({ soal });
}

tambahRute(/\/v1\/integrasi\/ai\/teks$/, async (_u, init) => {
  const b = badan(init);
  const pesan: Array<{ role: string; content: string }> = b.pesan ?? [{ role: 'user', content: b.prompt ?? '' }];
  const terakhir = pesan[pesan.length - 1]?.content ?? '';
  const p = PENYEDIA.find((x) => x.kode === b.penyedia) ?? PENYEDIA[0];
  if (/kuota/i.test(terakhir)) return { __status: 429, error: { code: 'kuota_habis', message: 'Kuota token AI harian aplikasi ini sudah habis (200.000 token). Coba lagi besok.' } };
  const modul: string = b.modul ?? '';
  let teks = '';
  let ditolak = false;
  if (/senjata|bahan peledak/i.test(terakhir)) ditolak = true;
  else if (modul === 'obrolan') teks = jawabObrolan(terakhir);
  else if (modul === 'dokumen') teks = jawabDokumen(terakhir);
  else if (modul === 'bantu_tulis') teks = jawabTulis(terakhir);
  else if (modul === 'ringkas')
    teks =
      '- Mahasiswa melaporkan nilai UTS Basis Data belum muncul di KHS.\n- Dosen sudah mengunggah nilai, tetapi status kelas masih **draf**.\n- Operator prodi belum mengunci nilai.\n\nTindak lanjut: minta operator prodi Teknik Informatika mengunci nilai kelas TI-3A.';
  else if (modul.startsWith('analisis_')) {
    teks = b.json
      ? JSON.stringify(ANALISIS[modul.slice(9)] ?? ANALISIS.keuangan)
      : '### Rincian\n\nUntuk **Teknik Informatika**, tunggakan Rp212 jt berasal dari 64 mahasiswa:\n\n| Angkatan | Mahasiswa | Tunggakan |\n|---|---|---|\n| 2023 | 29 | Rp104 jt |\n| 2024 | 22 | Rp71 jt |\n| 2022 | 13 | Rp37 jt |\n\nAngkatan 2023 menyumbang hampir separuh, sebagian besar dari skema cicilan.';
  } else if (modul === 'cbt_soal') teks = jawabSoal(terakhir);
  else if (modul === 'koreksi_esai')
    teks = JSON.stringify({
      skor: 72,
      komentar: 'Langkah normalisasi sudah runtut sampai 2NF, tetapi dependensi transitif ke 3NF belum dijelaskan dan tabel hasil akhirnya belum lengkap.',
      kekuatan: ['Kunci gabungan (nim, kode_mk) teridentifikasi dengan benar', 'Dependensi parsial nama_mhs dan nama_mk dijelaskan'],
      kekurangan: ['Tabel hasil 3NF tidak ditunjukkan', 'Tidak menyebut anomali yang dihindari'],
      keyakinan: 'sedang',
    });
  else teks = jawabObrolan(terakhir);
  const lama = modul === 'cbt_soal' ? 1600 : modul.startsWith('analisis_') && b.json ? 1300 : 700;
  await tunggu(lama);
  const masuk = Math.round((JSON.stringify(pesan).length + (b.sistem?.length ?? 0)) / 4);
  return {
    data: {
      teks: ditolak ? '' : teks,
      ditolak,
      keterangan: ditolak ? 'Permintaan ditolak pengaman model. Ubah permintaan atau coba penyedia lain.' : null,
      alasan_berhenti: ditolak ? 'refusal' : 'end_turn',
      model: p.model,
      penyedia: p.kode,
      driver: p.driver,
      token: { masuk, keluar: Math.round(teks.length / 4) },
      ms: lama + 420,
    },
  };
});

tambahRute(/\/v1\/integrasi\/ai\/pemakaian$/, (u) => {
  const rincian = [] as any[];
  const klien = ['pustikom', 'lms', 'arsip', 'cbt'];
  for (let d = 0; d < 8; d++) {
    const tgl = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
    klien.forEach((k, i) => {
      const n = 4 + ((d * 7 + i * 13) % 37);
      const p = PENYEDIA[(d + i) % 3];
      rincian.push({
        tanggal: tgl,
        klien_id: k,
        driver: p.driver,
        model: p.model,
        permintaan: n,
        token_masuk: n * 2100,
        token_keluar: n * 640,
        ditolak: (d + i) % 9 === 0 ? 1 : 0,
        gagal: (d + i) % 11 === 0 ? 1 : 0,
        rata_ms: 2400 + i * 900,
      });
    });
  }
  const ringkas = { permintaan: 0, token_masuk: 0, token_keluar: 0, ditolak: 0, gagal: 0 };
  rincian.forEach((r) => (Object.keys(ringkas) as Array<keyof typeof ringkas>).forEach((k) => (ringkas[k] += r[k])));
  return { data: { dari: u.searchParams.get('dari'), sampai: u.searchParams.get('sampai'), klien_id: null, ringkas, rincian } };
});

// ---------------------------------------------------------------- Tujuan simpan soal
const UJIAN = [
  { id: 31, kode: 'UTS-BD-2026', nama: 'UTS Basis Data 2026/2027 Ganjil', status: 'draf' },
  { id: 32, kode: 'UAS-ALG-2026', nama: 'UAS Algoritma dan Pemrograman', status: 'draf' },
];
tambahRute(/\/v1\/cbt\/ujian$/, (u) => {
  const q = (u.searchParams.get('q') ?? '').toLowerCase();
  return { data: UJIAN.filter((x) => !q || x.nama.toLowerCase().includes(q)), meta: { total: UJIAN.length } };
});
tambahRute(/\/v1\/cbt\/ujian\/\d+$/, (u) => ({ data: UJIAN.find((x) => String(x.id) === u.pathname.split('/').pop()) ?? UJIAN[0] }));
let idSoal = 900;
const simpanSoal = (_u: URL, init?: RequestInit) => {
  return { __status: 201, data: { id: ++idSoal, ...badan(init) } };
};
tambahRute(/\/v1\/cbt\/soal$/, simpanSoal);
tambahRute(/\/v1\/lms\/bank-soal$/, simpanSoal);
