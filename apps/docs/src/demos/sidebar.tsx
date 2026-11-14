import * as React from 'react';
import { BarChart3, BookOpen, CalendarDays, ClipboardList, FileText, GraduationCap, LayoutDashboard, LogOut, Mail, Settings, User, Users, Wallet } from 'lucide-react';
import { Alert, AppShell, Badge, Breadcrumb, DocsSidebar, PortalSidebar, SearchTrigger, Sidebar, SidebarWidget, Tag, TableOfContents, UnipoAppLogo, type NavGroup } from '@unipo/ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Sidebar',
  category: 'Navigasi & alur',
  layout: 'full',
  badge: 'baru',
  description: 'Tiga jenis sidebar: dasbor aplikasi (menu bergrup, sub-menu, lencana, profil, mode rail, laci di ponsel), dokumentasi (seksi + saringan + daftar isi), dan kolom samping portal media.',
  importLine: "import { Sidebar, AppShell, DocsSidebar, TableOfContents, PortalSidebar, SidebarWidget } from '@unipo/ui';",
  demos: { Dasbor: 'Sidebar dasbor', Rail: 'Mode rail (diciutkan)', Dokumentasi: 'Sidebar dokumentasi', Portal: 'Kolom samping portal' },
  props: [
    ['groups', 'Array<{ label?, items: NavItem[] }>', 'NavItem: key, label, icon, href/onClick, badge, children.'],
    ['activeKey', 'string', 'Kunci menu aktif; induk sub-menu terbuka otomatis.'],
    ['collapsed / onCollapsedChange', 'boolean', 'Mode rail ikon saja dengan tooltip.'],
    ['renderLink', '(item, props) => ReactElement', 'Pakai <Link> Next.js/React Router.'],
    ['user', '{ name, subtitle, avatar, menu }', 'Profil di kaki sidebar.'],
  ],
};

const GROUPS: NavGroup[] = [
  {
    items: [
      { key: 'beranda', label: 'Beranda', icon: <LayoutDashboard />, href: '#' },
      { key: 'jadwal', label: 'Jadwal kuliah', icon: <CalendarDays />, href: '#' },
    ],
  },
  {
    label: 'Akademik',
    items: [
      { key: 'krs', label: 'KRS', icon: <ClipboardList />, badge: 3, href: '#' },
      {
        key: 'nilai',
        label: 'Nilai & transkrip',
        icon: <BookOpen />,
        children: [
          { key: 'khs', label: 'KHS per semester', href: '#' },
          { key: 'transkrip', label: 'Transkrip', href: '#' },
          { key: 'ipk', label: 'Grafik IPK', href: '#' },
        ],
      },
      { key: 'mahasiswa', label: 'Mahasiswa bimbingan', icon: <Users />, href: '#' },
      { key: 'skripsi', label: 'Tugas akhir', icon: <GraduationCap />, href: '#' },
    ],
  },
  {
    label: 'Administrasi',
    items: [
      { key: 'keuangan', label: 'Keuangan', icon: <Wallet />, href: '#' },
      { key: 'surat', label: 'Surat', icon: <Mail />, href: '#' },
      { key: 'laporan', label: 'Laporan', icon: <BarChart3 />, href: '#' },
    ],
  },
];
const USER = { name: 'Dr. Rahmat Hidayat, M.Kom.', subtitle: 'Dosen · NIDN 0912048801', menu: [{ label: 'Profil', icon: <User /> }, { label: 'Pengaturan', icon: <Settings /> }, { type: 'separator' as const }, { label: 'Keluar', icon: <LogOut /> }] };

function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ height: 600, border: '1px solid var(--u-border)', borderRadius: 14, overflow: 'hidden', background: 'var(--u-background)' }}>{children}</div>;
}

export function Dasbor() {
  const [active, setActive] = React.useState('transkrip');
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.map((i) => ({ ...i, onClick: () => setActive(i.key), children: i.children?.map((c) => ({ ...c, onClick: () => setActive(c.key) })) })) }));
  return (
    <Frame>
      <div style={{ display: 'flex', height: '100%' }}>
        <Sidebar
          brand={<UnipoAppLogo app="siakad" />}
          groups={groups}
          activeKey={active}
          user={USER}
          footer={
            <Alert variant="primary" icon={false} title="KRS dibuka">
              Sampai 29 Agustus · <a href="#" style={{ color: 'inherit', fontWeight: 600 }}>Isi sekarang</a>
            </Alert>
          }
        />
        <div style={{ flex: 1, padding: 24, display: 'grid', alignContent: 'start', gap: 16 }}>
          <Breadcrumb items={[{ label: 'Akademik', href: '#' }, { label: 'Nilai & transkrip', href: '#' }, { label: 'Transkrip' }]} />
          <SearchTrigger />
        </div>
      </div>
    </Frame>
  );
}

export function Rail() {
  const [collapsed, setCollapsed] = React.useState(true);
  return (
    <Frame>
      <AppShell
        sidebar={<Sidebar brand={<UnipoAppLogo app="siakad" />} groups={GROUPS} activeKey="krs" user={USER} collapsed={collapsed} onCollapsedChange={setCollapsed} />}
        topbar={<SearchTrigger />}
      >
        <p className="u-field-description">Klik tombol di samping logo untuk melebarkan. Di layar &lt; 1024 px sidebar pindah ke laci (tombol menu di bilah atas).</p>
      </AppShell>
    </Frame>
  );
}

export function Dokumentasi() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '15rem 1fr 12rem', gap: 32, alignItems: 'start' }}>
      <DocsSidebar
        activeKey="token"
        sections={[
          { title: 'Mulai', items: [{ key: 'pengantar', label: 'Pengantar', href: '#' }, { key: 'token', label: 'Mendapatkan token', href: '#' }, { key: 'sdk', label: 'SDK', href: '#', badge: 'baru' }] },
          { title: 'Akademik', items: [{ key: 'mhs', label: 'Mahasiswa', href: '#' }, { key: 'dosen', label: 'Dosen', href: '#' }, { key: 'krs', label: 'KRS', href: '#' }, { key: 'nilai', label: 'Nilai', href: '#' }] },
          { title: 'Referensi', items: [{ key: 'prodi', label: 'Program studi', href: '#' }, { key: 'galat', label: 'Kode galat', href: '#' }] },
        ]}
      />
      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 24, letterSpacing: '-0.02em' }}>Mendapatkan token</h3>
        <p className="u-field-description" style={{ fontSize: 15 }}>Semua permintaan memakai token Bearer dari endpoint <code className="u-inline-code">/v1/auth/token</code>.</p>
        <h4 id="demo-toc-1" style={{ marginTop: 24 }}>Client credentials</h4>
        <p className="u-field-description">Untuk aplikasi server ke server.</p>
        <h4 id="demo-toc-2">Token pengguna</h4>
        <p className="u-field-description">Untuk aplikasi tempat mahasiswa/dosen login.</p>
      </div>
      <TableOfContents items={[{ id: 'demo-toc-1', label: 'Client credentials' }, { id: 'demo-toc-2', label: 'Token pengguna' }, { id: 'demo-toc-3', label: 'Masa berlaku', level: 3 }]} />
    </div>
  );
}

export function Portal() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 20rem', gap: 32 }}>
      <div className="u-card" style={{ minHeight: 480, display: 'grid', placeItems: 'center', color: 'var(--u-muted-foreground)' }}>Isi artikel</div>
      <PortalSidebar sticky={false}>
        <SidebarWidget title="Terpopuler" action={<a href="#">Lihat semua</a>}>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 14 }}>
            {['UNIPO raih akreditasi Baik Sekali untuk prodi Teknik Informatika', 'Jadwal wisuda periode II tahun 2026', '120 mahasiswa terima beasiswa KIP Kuliah'].map((t, i) => (
              <li key={i} style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: 'var(--u-border-strong)', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                <a href="#" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600, fontSize: 14, lineHeight: 1.4 }}>{t}</a>
              </li>
            ))}
          </ol>
        </SidebarWidget>
        <SidebarWidget title="Kategori">
          <div className="demo-row" style={{ gap: 6 }}>
            {['Akademik', 'Penelitian', 'Kemahasiswaan', 'Kerja sama', 'Prestasi'].map((t) => <Tag key={t} size="sm" render={<a href="#" />}>{t}</Tag>)}
          </div>
        </SidebarWidget>
        <SidebarWidget title="Pengumuman" variant="card">
          <div style={{ display: 'grid', gap: 10, fontSize: 14 }}>
            <a href="#" style={{ color: 'inherit', fontWeight: 600, textDecoration: 'none' }}>Perpanjangan batas pembayaran UKT</a>
            <span className="u-field-description"><Badge variant="danger" size="md">Penting</Badge> · 12 Nov 2026</span>
          </div>
        </SidebarWidget>
        <FileText style={{ display: 'none' }} />
      </PortalSidebar>
    </div>
  );
}
