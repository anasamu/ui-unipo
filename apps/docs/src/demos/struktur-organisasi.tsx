import { StrukturOrganisasi, type NodeStruktur } from 'unipo-ui';
import { StrukturPortal } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Struktur organisasi',
  category: 'Portal & landing',
  layout: 'full',
  order: 7,
  badge: 'baru',
  description:
    'Struktur organisasi universitas, fakultas, atau unit dalam empat varian: bagan berjenjang dengan garis (lipat cabang, perbesar/perkecil, berganti ke pohon di layar sempit), pohon bertingkat, kartu per grup, dan tabel jabatan. Pencarian menyorot jabatan atau nama yang cocok dan membuka cabangnya; klik node membuka detail.',
  importLine: "import { StrukturOrganisasi, strukturDariDaftar } from 'unipo-ui';\nimport { StrukturPortal } from 'unipo-ui/siakad';",
  demos: {
    Bagan: 'varian="bagan": garis komando, garis putus-putus untuk koordinasi (Senat, SPI), jabatan lowong',
    Ringkas: 'varian="bagan" kartu="ringkas", semua cabang terbuka (buka={0})',
    Pohon: 'varian="pohon": daftar bertingkat untuk sidebar atau ponsel',
    Grup: 'varian="grup": kartu foto per grup (Pimpinan, Fakultas, Lembaga)',
    Daftar: 'varian="daftar": tabel jabatan, nama, dan atasan',
    DariPortal: 'StrukturPortal: dari GET /v1/portal/struktur',
  },
  props: [
    ['data', 'NodeStruktur | NodeStruktur[]', '{ id, jabatan, nama?, foto?, unit?, grup?, periode?, email?, keterangan?, koordinasi?, anak? }. Nama kosong = lowong.'],
    ['varian', "'bagan' | 'pohon' | 'grup' | 'daftar'", 'Bawaan bagan.'],
    ['buka', 'number', 'Kedalaman yang terbuka di awal. 0 = semua. Bawaan 2.'],
    ['kartu', "'foto' | 'ringkas'", 'Bentuk node pada bagan.'],
    ['cari', 'boolean', 'Kotak cari jabatan/nama. Bawaan true.'],
    ['pohonDiBawah', 'number (px)', 'Bagan berganti menjadi pohon bila wadah lebih sempit dari ini. 0 = tidak. Bawaan 560.'],
    ['onPilih', '(node) => void', 'Ganti dialog detail bawaan.'],
    ['strukturDariDaftar(daftar)', '{ id, induk_id }[] → NodeStruktur[]', 'Ubah daftar datar (mis. dari tabel jabatan) menjadi pohon.'],
    ['StrukturPortal: situs, grup, turunan, susun', 'string, string, boolean, fn', 'Bawaan varian grup. susun mengganti cara baris portal disusun menjadi pohon.'],
  ],
  notes: [
    'Tabel portal_struktur tidak punya kolom atasan, jadi StrukturPortal menyusun pohon dari urutan dan grup: baris pertama menjadi akar, baris lain di grup yang sama menjadi bawahannya, dan setiap grup lain menjadi cabang. Varian grup paling cocok untuk data ini; kirim susun sendiri bila butuh bagan yang lebih rinci.',
    'Keyboard: Tab ke setiap node, Enter membuka detail; tombol lipat di bawah node menampilkan jumlah bawahan. Kanvas bagan bisa digeser dengan panah setelah difokus.',
    'Foto contoh di halaman ini berupa ilustrasi, bukan foto orang sungguhan.',
  ],
};

const f = (n: number) => `contoh/potret-${n}.svg`;
const STRUKTUR: NodeStruktur = {
  id: 'rektor',
  jabatan: 'Rektor',
  nama: 'Dr. Rahmat Hidayat, M.Pd.',
  foto: f(1),
  unit: 'Universitas Pohuwato',
  periode: '2024–2028',
  email: 'rektor@unipo.ac.id',
  anak: [
    { id: 'senat', jabatan: 'Ketua Senat', nama: 'Prof. Dr. Hamid Pakaya, M.Si.', koordinasi: true, grup: 'Senat' },
    {
      id: 'wr1',
      jabatan: 'Wakil Rektor I',
      nama: 'Dr. Nurhayati Lamato, M.Si.',
      foto: f(2),
      unit: 'Bidang Akademik',
      anak: [
        {
          id: 'fikom',
          jabatan: 'Dekan',
          nama: 'Dr. Sri Wahyuni Pakaya, M.T.',
          foto: f(5),
          unit: 'Fakultas Ilmu Komputer',
          grup: 'Fakultas',
          anak: [
            { id: 'kp-if', jabatan: 'Ketua Prodi', nama: 'Fajar Nugraha, M.Kom.', unit: 'S1 Informatika', grup: 'Program studi' },
            { id: 'kp-si', jabatan: 'Ketua Prodi', nama: 'Rina Lasena, M.Kom.', unit: 'S1 Sistem Informasi', grup: 'Program studi' },
          ],
        },
        { id: 'fe', jabatan: 'Dekan', nama: 'Dr. Yusuf Abdullah, M.Ak.', unit: 'Fakultas Ekonomi', grup: 'Fakultas' },
        { id: 'fh', jabatan: 'Dekan', nama: 'Hasanuddin Ali, S.H., M.H.', foto: f(6), unit: 'Fakultas Hukum', grup: 'Fakultas' },
        { id: 'fp', jabatan: 'Dekan', nama: null, unit: 'Fakultas Pertanian', grup: 'Fakultas', keterangan: 'Sedang dalam proses pemilihan.' },
        { id: 'baak', jabatan: 'Kepala Biro Akademik', nama: 'Siti Aisyah Monoarfa, S.Kom.', grup: 'Biro' },
      ],
    },
    {
      id: 'wr2',
      jabatan: 'Wakil Rektor II',
      nama: 'Irwan Mokodompit, S.E., M.M.',
      foto: f(3),
      unit: 'Bidang Keuangan dan Umum',
      anak: [
        { id: 'bauk', jabatan: 'Kepala Biro Keuangan', nama: 'Rudi Hartono Kadir, S.E.', grup: 'Biro' },
        { id: 'pustikom', jabatan: 'Kepala Pustikom', nama: 'Anwar Djafar, M.Kom.', grup: 'Lembaga' },
      ],
    },
    {
      id: 'wr3',
      jabatan: 'Wakil Rektor III',
      nama: 'Dr. Fadli Hasan, M.Kom.',
      foto: f(4),
      unit: 'Bidang Kemahasiswaan',
      anak: [
        { id: 'lppm', jabatan: 'Kepala LPPM', nama: 'Dr. Ratna Dewi Usman, M.P.', grup: 'Lembaga' },
        { id: 'karier', jabatan: 'Kepala Pusat Karier', nama: 'Moh. Arif Rahman, M.Pd.', grup: 'Lembaga' },
      ],
    },
    { id: 'spi', jabatan: 'Kepala SPI', nama: 'Nurdin Mohamad, S.E., Ak.', koordinasi: true, grup: 'Satuan pengawas' },
  ],
};

export function Bagan() {
  return <StrukturOrganisasi data={STRUKTUR} judul="Struktur organisasi Universitas Pohuwato" />;
}

export function Ringkas() {
  return <StrukturOrganisasi data={STRUKTUR} kartu="ringkas" buka={0} cari={false} />;
}

export function Pohon() {
  return (
    <div style={{ maxWidth: '30rem' }}>
      <StrukturOrganisasi data={STRUKTUR} varian="pohon" />
    </div>
  );
}

export function Grup() {
  return <StrukturOrganisasi data={STRUKTUR} varian="grup" />;
}

export function Daftar() {
  return <StrukturOrganisasi data={STRUKTUR} varian="daftar" />;
}

export function DariPortal() {
  return <StrukturPortal situs="univ" judul="Pimpinan dan pejabat" />;
}
