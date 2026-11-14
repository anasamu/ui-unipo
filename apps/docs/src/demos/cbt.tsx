import { useState } from 'react';
import { Button } from 'unipo-ui';
import { DaftarUjianSaya, HasilUjian, LembarUjian, NavigasiSoal, SoalCbt, TimerUjian, type JawabanCbt, type LembarUjianData, type SoalCbtData } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'CBT ujian',
  category: 'CBT',
  layout: 'full',
  order: 8,
  description:
    'Widget ujian berbasis komputer dari /v1/cbt untuk peserta: daftar ujian dengan masuk token, lembar ujian (satu soal per layar, navigasi nomor, ragu-ragu, simpan otomatis, hitung mundur, kumpulkan otomatis saat waktu habis), enam jenis soal, dan layar hasil.',
  importLine: "import { DaftarUjianSaya, LembarUjian, SoalCbt, NavigasiSoal, TimerUjian, HasilUjian } from 'unipo-ui/siakad';",
  demos: {
    Ujian: 'DaftarUjianSaya → LembarUjian (token contoh: UNIPO7)',
    Lembar: 'LembarUjian',
    Soal: 'SoalCbt untuk tiap jenis soal',
    Navigasi: 'NavigasiSoal dan TimerUjian',
    Hasil: 'HasilUjian',
  },
  props: [
    ['DaftarUjianSaya.onMulai', '(pesertaId, lembar) => void', 'Dipanggil setelah token diterima atau ujian dilanjutkan. Tampilkan LembarUjian dengan `awal={lembar}`.'],
    ['LembarUjian.pesertaId', 'number', 'ID peserta (bukan ID ujian).'],
    ['LembarUjian.onSelesai', '(lembar) => void', 'Dipanggil setelah jawaban dikumpulkan, termasuk saat waktu habis.'],
    ['SoalCbt.onJawab', '(jawaban) => void', 'Bentuk jawaban: "a" · ["a","c"] · true · "teks" · {"k1":"r2"}. null berarti dikosongkan.'],
    ['TimerUjian.sisaDetik', 'number', 'Dari server; komponen menyinkronkan ulang setiap kali nilainya berubah.'],
  ],
  notes: [
    'Butuh token pengguna dengan scope cbt:read dan cbt:write. Semua panggilan /kerjakan mengirim header X-Perangkat (ID acak yang disimpan di peramban) karena ujian bisa dikunci ke satu perangkat.',
    'Pertanyaan dan opsi adalah HTML yang sudah disaring server SIAKAD. Jangan isi SoalCbt dengan HTML dari sumber lain tanpa disaring.',
  ],
};

export function Ujian() {
  const [aktif, setAktif] = useState<{ id: number; lembar: LembarUjianData } | null>(null);
  if (aktif)
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <Button variant="ghost" size="sm" onClick={() => setAktif(null)}>
            ← Kembali ke daftar
          </Button>
        </div>
        <LembarUjian pesertaId={aktif.id} awal={aktif.lembar} />
      </div>
    );
  return <DaftarUjianSaya onMulai={(id, lembar) => setAktif({ id, lembar })} />;
}
export function Lembar() {
  return <LembarUjian pesertaId={9001} />;
}

const CONTOH: SoalCbtData[] = [
  {
    nomor: 1,
    soal_id: 101,
    jenis: 'pilihan_ganda',
    pertanyaan: '<p>Ibu kota provinsi Gorontalo adalah…</p>',
    opsi: [
      { id: 'a', teks: 'Kota Gorontalo' },
      { id: 'b', teks: 'Limboto' },
      { id: 'c', teks: 'Marisa' },
      { id: 'd', teks: 'Kwandang' },
    ],
    poin: 1,
    jawaban: 'a',
    ragu: false,
  },
  { nomor: 2, soal_id: 102, jenis: 'benar_salah', pertanyaan: '<p>2<sup>10</sup> sama dengan 1024.</p>', opsi: null, poin: 1, jawaban: true, ragu: false },
  {
    nomor: 3,
    soal_id: 103,
    jenis: 'menjodohkan',
    pertanyaan: '<p>Pasangkan satuan dengan besarannya.</p>',
    opsi: {
      kiri: [
        { id: 'k1', teks: 'Newton' },
        { id: 'k2', teks: 'Joule' },
      ],
      kanan: [
        { id: 'r1', teks: 'Energi' },
        { id: 'r2', teks: 'Gaya' },
      ],
    },
    poin: 2,
    jawaban: { k1: 'r2' },
    ragu: false,
  },
];
export function Soal() {
  const [soal, setSoal] = useState(CONTOH);
  const jawab = (id: number, j: JawabanCbt) => setSoal((s) => s.map((x) => (x.soal_id === id ? { ...x, jawaban: j } : x)));
  return (
    <div style={{ display: 'grid', gap: 32, maxWidth: 720 }}>
      {soal.map((s) => (
        <SoalCbt key={s.soal_id} soal={s} onJawab={(j) => jawab(s.soal_id, j)} />
      ))}
    </div>
  );
}
export function Navigasi() {
  const [aktif, setAktif] = useState(4);
  const soal = Array.from({ length: 30 }, (_, i) => ({ nomor: i + 1, jawaban: i % 4 === 3 || i > 21 ? null : 'a', ragu: i === 6 || i === 15 }));
  return (
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ width: 260 }}>
        <NavigasiSoal soal={soal} aktif={aktif} onPilih={setAktif} />
      </div>
      <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
        <TimerUjian sisaDetik={45 * 60} />
        <TimerUjian sisaDetik={8 * 60 + 12} />
        <TimerUjian sisaDetik={2 * 60 + 40} />
      </div>
    </div>
  );
}
export function Hasil() {
  return (
    <HasilUjian
      lembar={{
        peserta_id: 1,
        ujian: { id: 1, nama: 'UTS Basis Data', jenis: 'uts', durasi_menit: 90 },
        status: 'selesai',
        sisa_detik: 0,
        hasil: { skor: 31.5, skor_maks: 39, nilai: 80.8, lulus: true, perlu_koreksi: true },
      }}
    />
  );
}
