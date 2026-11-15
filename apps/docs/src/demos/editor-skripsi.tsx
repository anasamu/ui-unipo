import * as React from 'react';
import { Button } from 'unipo-ui';
import { EditorSkripsi, baru, entriApa, naskahKosong, sitasi, type CatatanBimbingan, type NaskahSkripsi, type PustakaSkripsi } from 'unipo-ui/editor';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Penyusunan skripsi',
  category: 'Editor',
  layout: 'full',
  order: 30,
  badge: 'baru',
  description:
    'Ruang menulis skripsi mahasiswa: kerangka bab dengan target kata, halaman judul, abstrak, kanvas bab di atas kertas, daftar pustaka APA 7 dengan sisip sitasi di posisi kursor, catatan bimbingan per bagian, dan pratinjau naskah utuh siap cetak.',
  importLine: "import { EditorSkripsi, naskahKosong, sitasi, entriApa } from 'unipo-ui/editor';",
  demos: {
    Mahasiswa: 'Mahasiswa menyusun naskah; pembimbing sudah memberi catatan',
    Pembimbing: 'Mode pembimbing: naskah terkunci, tambah catatan per bab',
    Pustaka: 'Format sitasi dan daftar pustaka APA 7',
  },
  props: [
    ['nilai / onChange', 'NaskahSkripsi', 'Dikendalikan. Mulai dari naskahKosong() (kerangka lima bab).'],
    ['catatan', 'CatatanBimbingan[]', 'Catatan pembimbing; jumlah yang belum selesai tampil di kerangka.'],
    ['onCatatan', '(bagian, teks) => void', 'Diisi untuk pembimbing: muncul isian catatan pada bagian yang dibuka.'],
    ['onCatatanSelesai', '(catatan) => void', 'Mahasiswa menandai catatan sudah diperbaiki.'],
    ['baca', 'boolean', 'Kunci naskah (mis. sudah disetujui atau dibuka pembimbing).'],
    ['aksi', '(naskah) => ReactNode', 'Tombol simpan di bilah atas.'],
    ['instansi', 'string', 'Nama perguruan tinggi di halaman judul. Bawaan Universitas Pohuwato.'],
  ],
  notes: [
    'SIAKAD belum punya API untuk menyimpan naskah skripsi (yang ada baru data tugas akhir dan impor ke repositori). Komponen ini dikendalikan, jadi naskah bisa disimpan ke API mana pun begitu endpointnya tersedia; bentuk datanya (bab berisi blok, pustaka, catatan) siap dijadikan tabel.',
    'Penulis pustaka ditulis "Nama belakang, Inisial." dipisah titik koma. Sitasi: satu penulis (Santoso, 2020), dua penulis (Santoso & Wijaya, 2020), tiga atau lebih (Santoso et al., 2020).',
    'Pustaka yang belum dikutip di naskah ditandai di panel dan di halaman daftar pustaka (tanda tidak ikut tercetak).',
  ],
};

const PUSTAKA: PustakaSkripsi[] = [
  { id: 'p1', jenis: 'jurnal', penulis: 'Santoso, B.; Wijaya, A. R.', tahun: '2022', judul: 'Sistem informasi akademik berbasis layanan mikro di perguruan tinggi swasta', sumber: 'Jurnal Teknologi Informasi Indonesia', volume: '8', nomor: '2', halaman: '115–128', doi: '10.1234/jtii.v8i2.512' },
  { id: 'p2', jenis: 'buku', penulis: 'Sommerville, I.', tahun: '2016', judul: 'Software engineering (10th ed.)', sumber: 'Pearson' },
  { id: 'p3', jenis: 'jurnal', penulis: 'Rahman, F.; Lestari, D.; Gobel, S.', tahun: '2024', judul: 'Evaluasi kegunaan portal mahasiswa dengan System Usability Scale', sumber: 'Jurnal Sistem Informasi', volume: '12', nomor: '1', halaman: '40–52' },
  { id: 'p4', jenis: 'web', penulis: 'Kementerian Pendidikan Tinggi, Sains, dan Teknologi', tahun: '2025', judul: 'Pedoman pangkalan data pendidikan tinggi', sumber: 'pddikti.kemdiktisaintek.go.id', url: 'https://pddikti.kemdiktisaintek.go.id' },
];

function naskahContoh(): NaskahSkripsi {
  const n = naskahKosong({
    judul: 'Rancang Bangun Sistem Informasi Bimbingan Skripsi Berbasis Web di Universitas Pohuwato',
    penulis: 'Nur Aisyah Pakaya',
    nim: '2201010023',
    prodi: 'Teknik Informatika',
    fakultas: 'Teknik',
    tahun: '2026',
    pembimbing: ['Dr. Rahmawati Hasan, S.T., M.T.', 'Moh. Rizal Ishak, S.Kom., M.Kom.'],
    abstrak:
      'Proses bimbingan skripsi di Universitas Pohuwato masih dilakukan melalui pertemuan tatap muka dan pesan singkat, sehingga riwayat revisi sulit ditelusuri. Penelitian ini bertujuan merancang sistem informasi bimbingan skripsi berbasis web yang terintegrasi dengan SIAKAD.\n\nMetode pengembangan yang digunakan adalah prototipe dengan pengujian kegunaan memakai System Usability Scale. Hasil pengujian menunjukkan skor 78,5 yang termasuk kategori baik.',
    kataKunci: 'bimbingan skripsi; sistem informasi; SIAKAD; prototipe',
    pustaka: PUSTAKA,
  });
  n.bab[0].blok = [
    baru('judul', { teks: 'Latar Belakang', tingkat: 3 }),
    baru('paragraf', {
      teks: 'Perguruan tinggi dituntut menyelenggarakan layanan akademik yang cepat dan terdokumentasi. Sistem informasi akademik yang terintegrasi terbukti mempercepat layanan dan mengurangi pekerjaan ganda (Santoso &amp; Wijaya, 2022). Namun, layanan bimbingan skripsi di banyak kampus belum tercakup dalam sistem tersebut.',
    }),
    baru('paragraf', {
      teks: 'Menurut Sommerville (2016), kebutuhan pengguna yang berubah selama pengembangan dapat ditangani dengan pendekatan prototipe. Pendekatan ini dipilih karena dosen pembimbing dan mahasiswa dapat langsung mencoba rancangan sebelum sistem dibangun penuh.',
    }),
    baru('judul', { teks: 'Rumusan Masalah', tingkat: 3 }),
    baru('paragraf', { teks: 'Bagaimana merancang sistem informasi bimbingan skripsi berbasis web yang terintegrasi dengan SIAKAD Universitas Pohuwato?' }),
  ];
  return n;
}

const CATATAN = (n: NaskahSkripsi): CatatanBimbingan[] => [
  { id: 1, bagian: n.bab[0].id, oleh: 'Dr. Rahmawati Hasan', waktu: '2026-11-12T09:30:00', teks: 'Latar belakang perlu data jumlah mahasiswa bimbingan per dosen di prodi agar masalahnya terukur.' },
  { id: 2, bagian: 'abstrak', oleh: 'Moh. Rizal Ishak', waktu: '2026-11-13T14:10:00', teks: 'Sebutkan jumlah responden pengujian SUS di abstrak.' },
  { id: 3, bagian: n.bab[0].id, oleh: 'Dr. Rahmawati Hasan', waktu: '2026-11-05T10:00:00', teks: 'Rumusan masalah cukup satu, sudah baik.', selesai: true },
];

export function Mahasiswa() {
  const [n, setN] = React.useState(naskahContoh);
  const [catatan, setCatatan] = React.useState(() => CATATAN(n));
  const [simpan, setSimpan] = React.useState<string | null>(null);
  return (
    <EditorSkripsi
      nilai={n}
      onChange={(x) => {
        setN(x);
        setSimpan('Belum disimpan');
      }}
      catatan={catatan}
      onCatatanSelesai={(c) => setCatatan((d) => d.map((x) => (x.id === c.id ? { ...x, selesai: true } : x)))}
      status={simpan}
      tinggi={760}
      aksi={() => (
        <Button size="sm" onClick={() => setSimpan(`Tersimpan ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`)}>
          Simpan
        </Button>
      )}
    />
  );
}

export function Pembimbing() {
  const [n, setN] = React.useState(naskahContoh);
  const [catatan, setCatatan] = React.useState(() => CATATAN(n));
  return (
    <EditorSkripsi
      nilai={n}
      onChange={setN}
      baca
      catatan={catatan}
      tinggi={720}
      onCatatan={(bagian, teks) => setCatatan((d) => [...d, { id: Date.now(), bagian, oleh: 'Dr. Rahmawati Hasan', waktu: new Date().toISOString(), teks }])}
    />
  );
}

export function Pustaka() {
  return (
    <div className="u-dok-kertas" style={{ aspectRatio: 'auto' }}>
      <div className="ub-konten u-skripsi-pustaka-lembar">
        <p>
          <strong>Sitasi:</strong> {PUSTAKA.map((p) => sitasi(p)).join(' · ')}
        </p>
        <p>
          <strong>Naratif:</strong> {PUSTAKA.map((p) => sitasi(p, { naratif: true })).join(' · ')}
        </p>
        <h2 className="u-skripsi-kepala-bab">DAFTAR PUSTAKA</h2>
        {PUSTAKA.map((p) => (
          <p key={p.id} className="ub-pustaka" dangerouslySetInnerHTML={{ __html: entriApa(p) }} />
        ))}
      </div>
    </div>
  );
}
