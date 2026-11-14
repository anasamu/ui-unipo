import { ArrowRight, GraduationCap } from 'lucide-react';
import { Button, Hero, Section } from 'unipo-ui';
import { AgendaPortal, BeritaPortal, BeritaTerpopuler, KalenderSidebar, PengumumanPortal } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Portal & landing page',
  category: 'Widget fitur',
  layout: 'full',
  order: 2,
  description:
    'Widget portal kampus dari /v1/portal: berita (grid, sorotan, daftar), terpopuler, pengumuman dengan prioritas dan masa berlaku, serta agenda dengan jam WITA dan mode luring/daring. Ditambah Hero dan Section untuk menyusun landing page. Semua tata letak menyesuaikan lebar wadah, jadi bisa dipakai di kolom utama maupun sidebar.',
  importLine:
    "import { BeritaPortal, BeritaTerpopuler, PengumumanPortal, AgendaPortal } from 'unipo-ui/siakad';\nimport { Hero, Section, NewsGrid, NewsCard, AnnouncementList, EventCard } from 'unipo-ui';",
  demos: {
    Landing: 'Landing page: Hero + Section + widget',
    Sorotan: 'BeritaPortal layout="featured"',
    Grid: 'BeritaPortal layout="grid"',
    Beranda: 'Kolom utama + sidebar (pengumuman, terpopuler, kalender)',
    Agenda: 'AgendaPortal variant="card"',
  },
  props: [
    ['situs', 'string', "Kode situs portal ('univ', kode fakultas). Kosong = semua situs."],
    ['turunan', 'boolean', 'Ikutkan konten situs turunan (fakultas/prodi).'],
    ['jumlah', 'number', 'Banyak item (per_page).'],
    ['layout', "'grid' | 'featured' | 'list'", 'Tata letak BeritaPortal.'],
    ['urut', "'terbaru' | 'populer'", 'Urutan berita.'],
    ['href', '(jenis, konten) => string', 'Pembentuk tautan detail. Bawaan /berita/{slug}.'],
  ],
  notes: ['Gambar contoh di halaman ini berupa pola warna, bukan foto. Di produksi, gambar diambil dari media portal (kolom gambar.url).'],
};

export function Landing() {
  return (
    <div style={{ display: 'grid', gap: 48 }}>
      <Hero
        variant="image"
        announcement={
          <>
            <span
              style={{
                background: 'var(--u-primary)',
                color: '#fff',
                borderRadius: 999,
                padding: '2px 8px',
                fontSize: 11,
              }}
            >
              Baru
            </span>
            Pendaftaran gelombang I dibuka
          </>
        }
        eyebrow="Universitas Pohuwato"
        title="Kampus yang tumbuh bersama daerah"
        description="Dua belas program studi dengan perkuliahan yang dekat dengan pertanian, pesisir, dan pemerintahan desa di Pohuwato."
        actions={
          <>
            <Button size="lg">
              <GraduationCap /> Daftar sekarang
            </Button>
            <Button
              size="lg"
              variant="outline"
              style={{
                background: 'transparent',
                color: '#fff',
                borderColor: 'rgb(255 255 255 / .4)',
              }}
            >
              Lihat program studi
            </Button>
          </>
        }
        stats={[
          { value: '12', label: 'Program studi' },
          { value: '3.400+', label: 'Mahasiswa aktif' },
          { value: 'Baik Sekali', label: 'Akreditasi institusi' },
        ]}
      />
      <Section eyebrow="Kabar kampus" title="Berita terbaru" href="/berita">
        <BeritaPortal jumlah={3} />
      </Section>
    </div>
  );
}

export function Sorotan() {
  return <BeritaPortal layout="featured" jumlah={5} />;
}

export function Grid() {
  return <BeritaPortal layout="grid" jumlah={6} minColumn={240} />;
}

export function Beranda() {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 32,
        alignItems: 'flex-start',
      }}
    >
      <div style={{ flex: '999 1 420px', minWidth: 0, display: 'grid', gap: 40 }}>
        <Section title="Berita" href="/berita">
          <BeritaPortal layout="list" jumlah={4} />
        </Section>
        <Section title="Agenda mendatang" href="/agenda">
          <AgendaPortal jumlah={3} />
        </Section>
      </div>
      <aside style={{ flex: '1 1 260px', display: 'grid', gap: 32, minWidth: 0 }}>
        <Section title="Pengumuman" href="/pengumuman" style={{ gap: 12 }}>
          <PengumumanPortal jumlah={4} />
        </Section>
        <Section title="Terpopuler" style={{ gap: 4 }}>
          <BeritaTerpopuler />
        </Section>
        <KalenderSidebar href="/kalender" limit={3} />
      </aside>
    </div>
  );
}

export function Agenda() {
  return (
    <Section
      eyebrow="Agenda"
      title="Kegiatan kampus bulan ini"
      actions={
        <Button variant="outline" size="sm">
          Semua agenda <ArrowRight />
        </Button>
      }
    >
      <AgendaPortal variant="card" jumlah={3} />
    </Section>
  );
}
