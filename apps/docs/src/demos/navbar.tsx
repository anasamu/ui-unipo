import { BookOpen, Building2, CalendarDays, FileText, GraduationCap, Library, LogOut, Microscope, Monitor, Settings, User, Users } from 'lucide-react';
import { AppLogo, Button, Navbar, SearchTrigger, UnipoAppLogo, type NavbarMenu } from 'unipo-ui';
import { LogoSitus, NavbarPortal } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';
import { jsxProps } from '../Playground';

export const meta: DemoMeta = {
  title: 'Navbar & mega menu',
  category: 'Navigasi & alur',
  layout: 'full',
  order: 2,
  description:
    'Navbar responsif untuk aplikasi dan portal: tautan, dropdown dengan ikon dan keterangan, mega menu beberapa kolom dengan kartu sorotan, slot pencarian, tombol aksi, dan menu pengguna. Di layar sempit berubah menjadi tombol menu yang membuka panel samping berisi akordeon. NavbarPortal mengambil menu dari pengaturan situs portal, LogoSitus mengambil logo situs dan jatuh ke logo aplikasi UNIPO bila belum ada.',
  importLine: "import { Navbar } from 'unipo-ui';\nimport { NavbarPortal, LogoSitus } from 'unipo-ui/siakad';",
  demos: {
    Portal: 'Portal kampus dengan pita atas',
    MegaMenu: 'Mega menu: kolom, ikon, kartu sorotan',
    Transparan: 'Tembus pandang di atas hero',
    Aplikasi: 'Aplikasi: pencarian dan menu pengguna',
    Ringkas: "variant='ringkas'",
    Ponsel: 'Tampilan ponsel (panel samping)',
    DariPortal: 'NavbarPortal: menu dari /v1/portal/situs/{kode}/menu',
    Logo: 'LogoSitus dengan cadangan logo aplikasi',
  },
  props: [
    ['menus', 'NavbarMenu[]', 'Tiap menu: href (tautan), items (dropdown), atau columns + featured + footer (mega menu).'],
    ['NavbarLink', '{ label, href, icon, description, badge, external }', 'Isi dropdown dan kolom mega menu.'],
    ['variant', "'app' | 'portal' | 'ringkas'", 'Tinggi dan gaya. Portal menandai menu aktif dengan garis bawah.'],
    ['transparent', 'boolean', 'Tembus pandang dengan teks putih sampai halaman digulir.'],
    ['sticky', 'boolean', 'Menempel di atas dengan latar buram saat digulir. Bawaan true.'],
    ['topbar / search / actions / user', 'ReactNode / SidebarUser', 'Pita atas, slot pencarian, tombol kanan, menu pengguna.'],
    ['mobileBreakpoint', 'number', 'Lebar (px) saat beralih ke tombol menu. Bawaan 960.'],
    ['renderLink', '(link, props) => ReactElement', 'Pakai <Link> Next.js atau React Router.'],
    ['NavbarPortal.situs / lokasi / href / ekstra', '…', 'Kode situs, lokasi menu, pemetaan URL, dan tambahan ikon/kartu sorotan per menu.'],
    ['LogoSitus.situs / app', 'string / UnipoApp', 'Logo unggahan situs; bila kosong pakai logo aplikasi (pmb, tracer, lms, …).'],
  ],
  notes: [
    'Menu portal tiga tingkat (menu → judul kolom → tautan) otomatis menjadi mega menu; dua tingkat menjadi dropdown. Tipe halaman, kategori, dan modul diubah ke URL lewat hrefMenuPortal, yang bisa diganti dengan prop href.',
    'Mega menu dibangun di atas NavigationMenu Base UI: bisa dipakai dengan papan ketik (Tab, panah, Esc) dan panel bergeser halus saat pindah menu.',
  ],
  playground: {
    controls: [
      { name: 'variant', type: 'select', options: ['app', 'portal', 'ringkas'], default: 'portal' },
      { name: 'align', type: 'select', options: ['start', 'center'], default: 'start' },
      { name: 'cari', label: 'Tombol cari', type: 'boolean', default: true },
      { name: 'aksi', label: 'Tombol masuk', type: 'boolean', default: true },
    ],
    render: ({ variant, align, cari, aksi }) => (
      <div style={{ width: '100%', border: '1px solid var(--u-border)', borderRadius: 'var(--u-radius)', overflow: 'hidden' }}>
        <Navbar
          variant={variant}
          align={align}
          brand={<UnipoAppLogo app="siakad" />}
          menus={[
            { key: 'beranda', label: 'Beranda', href: '#' },
            {
              key: 'akademik',
              label: 'Akademik',
              items: [
                { key: 'krs', label: 'KRS', href: '#' },
                { key: 'khs', label: 'KHS', href: '#' },
              ],
            },
            { key: 'layanan', label: 'Layanan', href: '#' },
          ]}
          activeKey="beranda"
          search={cari ? <SearchTrigger placeholder="Cari…" /> : undefined}
          actions={aksi ? <Button size="sm">Masuk</Button> : undefined}
        />
      </div>
    ),
    code: ({ variant, align, cari, aksi }) =>
      `<Navbar${jsxProps({ variant, align }, { variant: 'app', align: 'start' })}\n  brand={<UnipoAppLogo app="siakad" />}\n  menus={menus}\n  activeKey="beranda"${cari ? '\n  search={<SearchTrigger placeholder="Cari…" />}' : ''}${aksi ? '\n  actions={<Button size="sm">Masuk</Button>}' : ''}\n/>`,
  },
};

const MENU: NavbarMenu[] = [
  { key: 'beranda', label: 'Beranda', href: '#' },
  {
    key: 'profil',
    label: 'Profil',
    items: [
      { label: 'Sejarah', href: '#', description: 'Perjalanan UNIPO sejak 2005' },
      { label: 'Visi dan misi', href: '#', description: 'Arah pengembangan 2025–2045' },
      { label: 'Pimpinan', href: '#', description: 'Rektorat, dekanat, dan biro' },
      { label: 'Akreditasi', href: '#', description: 'Status akreditasi institusi dan prodi', badge: 'Baik Sekali' },
    ],
  },
  {
    key: 'akademik',
    label: 'Akademik',
    columns: [
      {
        title: 'Fakultas',
        items: [
          { label: 'Ilmu Komputer', href: '#', icon: <Monitor />, description: 'Informatika, Sistem Informasi' },
          { label: 'Ekonomi', href: '#', icon: <Building2 />, description: 'Manajemen, Akuntansi' },
          { label: 'Hukum', href: '#', icon: <BookOpen />, description: 'Ilmu Hukum' },
          { label: 'Pertanian', href: '#', icon: <Microscope />, description: 'Agroteknologi, Peternakan' },
        ],
      },
      {
        title: 'Layanan',
        items: [
          { label: 'Kalender akademik', href: '#', icon: <CalendarDays />, description: 'Jadwal KRS, ujian, dan wisuda' },
          { label: 'SIAKAD', href: '#', icon: <GraduationCap />, description: 'KRS, KHS, dan transkrip' },
          { label: 'E-learning', href: '#', icon: <Users />, description: 'Kelas daring dan tugas' },
          { label: 'Perpustakaan', href: '#', icon: <Library />, description: 'Katalog dan repositori' },
        ],
      },
    ],
    featured: {
      eyebrow: 'Pendaftaran',
      title: 'PMB 2026/2027 gelombang 2 dibuka',
      description: 'Daftar sampai 31 Juli. Tersedia beasiswa KIP Kuliah dan prestasi.',
      href: '#',
      cta: 'Daftar sekarang',
    },
    footer: (
      <>
        <span>12 program studi terakreditasi</span>
        <a href="#">Lihat semua program studi</a>
      </>
    ),
  },
  { key: 'berita', label: 'Berita', href: '#' },
  { key: 'kontak', label: 'Kontak', href: '#' },
];

const Bingkai = ({ children, tinggi = 380 }: { children: React.ReactNode; tinggi?: number }) => (
  <div style={{ minHeight: tinggi, border: '1px solid var(--u-border)', borderRadius: 14, background: 'var(--u-background)' }}>{children}</div>
);

const AKSI = (
  <>
    <Button variant="ghost" size="sm">
      Masuk
    </Button>
    <Button size="sm">Daftar</Button>
  </>
);

export function Portal() {
  return (
    <Bingkai>
      <Navbar
        variant="portal"
        sticky={false}
        mobileBreakpoint={720}
        brand={<AppLogo name="UNIPO" tagline="Universitas Pohuwato" />}
        menus={MENU}
        activeKey="beranda"
        actions={AKSI}
        topbar={
          <>
            <span>(0443) 210 123 · humas@unipo.ac.id</span>
            <span style={{ display: 'flex', gap: 16 }}>
              <a href="#">Alumni</a>
              <a href="#">E-learning</a>
              <a href="#">English</a>
            </span>
          </>
        }
      />
    </Bingkai>
  );
}

export function MegaMenu() {
  return (
    <Bingkai tinggi={560}>
      <Navbar
        variant="portal"
        sticky={false}
        mobileBreakpoint={720}
        defaultOpen="akademik"
        brand={<AppLogo name="UNIPO" tagline="Universitas Pohuwato" />}
        menus={MENU}
        activeKey="beranda"
        actions={AKSI}
      />
    </Bingkai>
  );
}

export function Transparan() {
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', minHeight: 360, background: 'radial-gradient(90% 80% at 80% 10%, #2a5bd7 0%, transparent 60%), linear-gradient(160deg, #0b1f4d, #071230)' }}>
      <Navbar
        variant="portal"
        transparent
        mobileBreakpoint={720}
        sticky={false}
        brand={<UnipoAppLogo app="pmb" tagline="Universitas Pohuwato" />}
        menus={MENU.slice(0, 5)}
        actions={<Button size="sm">Daftar sekarang</Button>}
      />
      <div style={{ padding: '72px 32px', color: '#fff', maxWidth: 560 }}>
        <p style={{ margin: 0, opacity: 0.75, fontSize: 13 }}>Penerimaan mahasiswa baru 2026</p>
        <h2 style={{ margin: '8px 0 0', fontSize: 34, lineHeight: 1.15, letterSpacing: '-0.02em' }}>Kuliah dekat rumah, standar nasional.</h2>
      </div>
    </div>
  );
}

export function Aplikasi() {
  return (
    <Bingkai tinggi={320}>
      <Navbar
        sticky={false}
        mobileBreakpoint={720}
        brand={<UnipoAppLogo app="siakad" />}
        menus={[
          { key: 'beranda', label: 'Beranda', href: '#' },
          {
            key: 'akademik',
            label: 'Akademik',
            items: [
              { key: 'krs', label: 'Isi KRS', href: '#', icon: <FileText />, description: 'Periode Ganjil 2025/2026 dibuka', badge: 'Dibuka' },
              { key: 'khs', label: 'KHS', href: '#', icon: <BookOpen />, description: 'Nilai per semester' },
              { key: 'transkrip', label: 'Transkrip', href: '#', icon: <GraduationCap />, description: 'Nilai seluruh semester' },
            ],
          },
        ]}
        activeKey="krs"
        search={<SearchTrigger placeholder="Cari…" shortcut="/" />}
        user={{
          name: 'Nur Aisyah Hasan',
          subtitle: '23552010101',
          menu: [{ label: 'Profil', icon: <User /> }, { label: 'Pengaturan', icon: <Settings /> }, { type: 'separator' }, { label: 'Keluar', icon: <LogOut /> }],
        }}
      />
    </Bingkai>
  );
}

export function Ringkas() {
  return (
    <Bingkai tinggi={240}>
      <Navbar
        variant="ringkas"
        mobileBreakpoint={600}
        sticky={false}
        brand={<UnipoAppLogo app="lms" size="sm" tagline={undefined} />}
        menus={MENU.slice(0, 4)}
        actions={
          <Button size="sm" variant="outline">
            Masuk
          </Button>
        }
      />
    </Bingkai>
  );
}

export function Ponsel() {
  return (
    <div style={{ maxWidth: 390 }}>
      <Bingkai tinggi={200}>
        <Navbar sticky={false} mobileBreakpoint={100000} brand={<UnipoAppLogo app="tracer" />} menus={MENU} activeKey="beranda" actions={AKSI} />
      </Bingkai>
    </div>
  );
}

export function DariPortal() {
  return (
    <Bingkai tinggi={500}>
      <NavbarPortal
        situs="univ"
        brand={<LogoSitus situs="univ" tagline="" />}
        sticky={false}
        mobileBreakpoint={720}
        defaultOpen="123"
        app="siakad"
        actions={<Button size="sm">Daftar</Button>}
        activeKey="101"
      />
    </Bingkai>
  );
}

export function Logo() {
  return (
    <div className="demo-row" style={{ gap: 32 }}>
      <LogoSitus situs="tracer" app="tracer" />
      <LogoSitus situs="univ" />
      <LogoSitus situs="fikom" app="fakultas" />
      <LogoSitus situs="tidak-ada" app="pmb" />
    </div>
  );
}
