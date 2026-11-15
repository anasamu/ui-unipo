import { SambutanPimpinan, type PimpinanSambutan } from 'unipo-ui';
import { SambutanPortal } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Sambutan pimpinan',
  category: 'Portal & landing',
  layout: 'full',
  order: 5,
  badge: 'baru',
  description:
    'Sambutan rektor, dekan, ketua prodi, atau kepala unit untuk portal dan landing page, dalam tujuh varian: klasik, terpisah, sorot, kutipan, kartu, minimal, dan video. Teks panjang bisa diringkas dengan "Baca selengkapnya", dan SambutanPortal mengambil data langsung dari portal SIAKAD.',
  importLine: "import { SambutanPimpinan } from 'unipo-ui';\nimport { SambutanPortal } from 'unipo-ui/siakad';",
  demos: {
    Klasik: 'varian="klasik": foto, teks bertanda tangan, ringkas 2 paragraf',
    Terpisah: 'varian="terpisah": foto penuh setengah panel, foto di kanan, dengan kutipan',
    Sorot: 'varian="sorot": panel gelap dengan kutipan besar, teks lengkap di dialog',
    Kutipan: 'varian="kutipan": kutipan di tengah',
    Video: 'varian="video": sampul video dan kutipan',
    KartuMinimal: 'varian="kartu" untuk sidebar, varian="minimal" untuk halaman artikel',
    DariPortal: 'SambutanPortal: dari /v1/portal/struktur (baris yang punya sambutan) dan /v1/portal/situs/{kode}',
  },
  props: [
    ['pimpinan', '{ nama, jabatan, foto?, unit?, periode?, tandaTangan? }', 'Data pimpinan. Tanpa foto, inisial nama yang tampil.'],
    ['isi', 'string | ReactNode', 'Paragraf dipisah baris kosong, atau HTML dari server (dibaca sebagai teks, tanpa innerHTML).'],
    ['varian', "'klasik' | 'terpisah' | 'sorot' | 'kutipan' | 'kartu' | 'minimal' | 'video'", 'Bawaan klasik.'],
    ['label / judul', 'ReactNode', 'Bawaan "Sambutan" dan "Sambutan {jabatan}".'],
    ['kutipan', 'string', 'Kalimat yang ditonjolkan. Bawaan kalimat pertama isi.'],
    ['ringkas', 'number', 'Paragraf yang tampil sebelum "Baca selengkapnya". 0 = semua. Bawaan 3.'],
    ['tautan', '{ href, label? }', 'Arahkan "Baca selengkapnya" ke halaman sambutan, bukan memperluas di tempat.'],
    ['videoUrl / sampulVideo', 'string', 'YouTube, Vimeo, atau berkas https .mp4/.webm (varian video).'],
    ['posisiFoto', "'kiri' | 'kanan'", 'Posisi foto pada klasik dan terpisah.'],
    ['SambutanPortal: situs, jabatan, ubah', 'string, string, (p) => p', 'Kode situs, pilih jabatan tertentu, dan ubah data (mis. tambah tanda tangan).'],
  ],
  notes: [
    'SambutanPortal memakai baris portal_struktur yang kolom sambutan-nya terisi (nama, foto, masa jabatan). Bila belum ada, dipakai pengaturan situs "sambutan" dengan pimpinan resmi dari m_pimpinan (universitas) atau m_fakultas (fakultas).',
    'Di layar sempit, varian klasik, terpisah, dan video bertumpuk otomatis (container query), jadi aman dipakai di kolom sempit.',
    'Foto contoh di halaman ini berupa ilustrasi, bukan foto orang sungguhan.',
  ],
};

const REKTOR: PimpinanSambutan = { nama: 'Dr. Rahmat Hidayat, M.Pd.', jabatan: 'Rektor', unit: 'Universitas Pohuwato', periode: '2024–2028', foto: 'contoh/potret-1.svg' };
const DEKAN: PimpinanSambutan = { nama: 'Dr. Sri Wahyuni Pakaya, M.T.', jabatan: 'Dekan', unit: 'Fakultas Ilmu Komputer', periode: '2025–2029', foto: 'contoh/potret-5.svg' };
const ISI = `Selamat datang di Universitas Pohuwato. Kami hadir untuk membuka akses pendidikan tinggi yang bermutu bagi generasi muda di kawasan Teluk Tomini dan sekitarnya.

Kurikulum kami disusun bersama mitra industri dan pemerintah daerah, dengan pembelajaran berbasis proyek, magang, dan kegiatan Merdeka Belajar yang memberi pengalaman nyata bagi mahasiswa.

Layanan akademik sudah sepenuhnya daring melalui SIAKAD, e-learning, dan layanan mandiri, sehingga mahasiswa dapat fokus belajar dan berkarya.

Kepada calon mahasiswa, kami mengundang Anda bergabung dan tumbuh bersama. Kepada alumni dan mitra, terima kasih atas dukungan yang terus menguatkan langkah kami.`;

export function Klasik() {
  return <SambutanPimpinan pimpinan={REKTOR} isi={ISI} ringkas={2} />;
}

export function Terpisah() {
  return (
    <SambutanPimpinan
      varian="terpisah"
      posisiFoto="kanan"
      pimpinan={DEKAN}
      isi={ISI}
      ringkas={2}
      label="Dari meja dekan"
      kutipan="Kami ingin setiap lulusan pulang ke daerahnya membawa solusi digital."
    />
  );
}

export function Sorot() {
  return <SambutanPimpinan varian="sorot" pimpinan={REKTOR} isi={ISI} />;
}

export function Kutipan() {
  return <SambutanPimpinan varian="kutipan" pimpinan={DEKAN} isi={ISI} kutipan="Pendidikan tinggi harus dekat dengan kebutuhan masyarakat: itulah alasan kampus ini berdiri." />;
}

export function Video() {
  return (
    <SambutanPimpinan
      varian="video"
      pimpinan={REKTOR}
      isi={ISI}
      label="Video sambutan"
      videoUrl="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
      sampulVideo="contoh/kampus.jpg"
    />
  );
}

export function KartuMinimal() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 18rem), 1fr))', gap: '2rem', alignItems: 'start' }}>
      <div style={{ maxWidth: '22rem' }}>
        <SambutanPimpinan varian="kartu" pimpinan={DEKAN} isi={ISI} label="Sambutan dekan" />
      </div>
      <SambutanPimpinan varian="minimal" pimpinan={REKTOR} isi={ISI} ringkas={1} tautan={{ href: '#sambutan', label: 'Baca di halaman sambutan' }} />
    </div>
  );
}

export function DariPortal() {
  return <SambutanPortal situs="univ" varian="klasik" ringkas={2} />;
}
