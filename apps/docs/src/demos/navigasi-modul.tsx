import * as React from 'react';
import {
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  Landmark,
  Receipt,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { Button, MenuAtas, MenuUtama, SidebarModul, type ItemMenuUtama, type ModulNavigasi, type NavGroup, type VarianMenuAtas, type VarianMenuUtama, type VarianSidebarModul } from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Sidebar modul, menu utama & menu atas',
  category: 'Navigasi & alur',
  layout: 'wide',
  badge: 'baru',
  description:
    'Navigasi per modul aplikasi (SDM, BAAK, Keuangan, LP2M, SPMI, PMB, Fakultas): SidebarModul dengan 7 varian, MenuUtama (peluncur menu beranda) dengan 6 varian, dan MenuAtas (bilah menu atas) dengan 6 varian. Di perangkat mobile sidebar menjadi laci kiri atau bilah bawah, menu utama menyusut ke kisi 3 kolom, dan menu atas menjadi tab yang bisa digeser.',
  importLine: "import { SidebarModul, MenuUtama, MenuAtas, type NavGroup, type ModulNavigasi, type ItemMenuUtama } from 'unipo-ui';",
  demos: {
    Sidebar: 'SidebarModul: standar, ringkas, melayang, berkelompok, ganda, berwarna, garis',
    Utama: 'MenuUtama: grid, daftar, kartu, mega, dok, ubin',
    Atas: 'MenuAtas: tab, pil, garis, segmen, remah, bilah',
  },
  props: [
    ['SidebarModul.modul', 'ModulNavigasi', '{ key, nama, ikon, warna, keterangan } untuk judul sidebar.'],
    ['SidebarModul.grup', 'NavGroup[]', 'Sama dengan Sidebar biasa; item boleh punya children satu tingkat.'],
    ['SidebarModul.varian', "'standar' | 'ringkas' | 'melayang' | 'berkelompok' | 'ganda' | 'berwarna' | 'garis'", 'Gaya tampilan.'],
    ['SidebarModul.mobile', "'laci' | 'bawah'", 'Perilaku di mobile: laci kiri (bawaan) atau 5 menu pertama di bilah bawah.'],
    ['MenuUtama.varian', "'grid' | 'daftar' | 'kartu' | 'mega' | 'dok' | 'ubin'", 'mega mengelompokkan item per `grup`.'],
    ['MenuAtas.varian', "'tab' | 'pil' | 'garis' | 'segmen' | 'remah' | 'bilah'", 'Item dengan children membuka menu tarik-turun.'],
    ['MenuAtas.maks', 'number', 'Item berlebih dipindah ke menu "Lainnya".'],
    ['renderLink', '(props) => ReactNode', 'Pasang Link router (React Router/Next) agar navigasi tanpa muat ulang.'],
  ],
};

const MODUL: ModulNavigasi[] = [
  { key: 'sdm', nama: 'SDM', ikon: <Users />, warna: 'var(--u-chart-1)', keterangan: 'Kepegawaian' },
  { key: 'baak', nama: 'BAAK', ikon: <GraduationCap />, warna: 'var(--u-chart-2)', keterangan: 'Akademik' },
  { key: 'bauk', nama: 'Keuangan', ikon: <Wallet />, warna: 'var(--u-chart-3)', keterangan: 'BAUK' },
  { key: 'lp2m', nama: 'LP2M', ikon: <FlaskConical />, warna: 'var(--u-chart-4)', keterangan: 'Riset & PkM' },
  { key: 'spmi', nama: 'SPMI', ikon: <ShieldCheck />, warna: 'var(--u-chart-5)', keterangan: 'Mutu' },
];

const GRUP: NavGroup[] = [
  {
    items: [
      { key: 'beranda', label: 'Beranda', icon: <LayoutDashboard /> },
      { key: 'kasir', label: 'Kasir', icon: <Receipt />, badge: 3 },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      { key: 'kas', label: 'Buku kas', icon: <BookOpen /> },
      {
        key: 'jurnal',
        label: 'Jurnal',
        icon: <FileText />,
        children: [
          { key: 'jurnal-umum', label: 'Jurnal umum' },
          { key: 'jurnal-draf', label: 'Draf', badge: 2 },
        ],
      },
      { key: 'anggaran', label: 'Anggaran', icon: <Landmark /> },
    ],
  },
  { label: 'Sistem', items: [{ key: 'pengaturan', label: 'Pengaturan', icon: <Settings /> }] },
];

export function Sidebar() {
  const [aktif, setAktif] = React.useState('kas');
  const grup = GRUP.map((g) => ({ ...g, items: g.items.map((it) => ({ ...it, onClick: () => setAktif(it.key), children: it.children?.map((c) => ({ ...c, onClick: () => setAktif(c.key) })) })) }));
  const varian: VarianSidebarModul[] = ['standar', 'ringkas', 'melayang', 'berkelompok', 'ganda', 'berwarna', 'garis'];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
      {varian.map((v) => (
        <div key={v} style={{ height: 460, border: '1px solid var(--u-border)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <small style={{ padding: '.375rem .75rem', color: 'var(--u-text-muted)', borderBottom: '1px solid var(--u-border)' }}>varian="{v}"</small>
          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            <SidebarModul varian={v} modul={MODUL[2]!} modulLain={MODUL} grup={grup} activeKey={aktif} cari={v === 'standar'} user={{ name: 'Siti Rahma', subtitle: 'Kasir BAUK' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const ITEMS: ItemMenuUtama[] = [
  { key: 'krs', label: 'KRS', icon: <ClipboardCheck />, keterangan: 'Isi rencana studi', grup: 'Akademik', badge: 'Buka' },
  { key: 'jadwal', label: 'Jadwal', icon: <CalendarCheck />, keterangan: 'Kuliah & ujian', grup: 'Akademik' },
  { key: 'nilai', label: 'Nilai', icon: <GraduationCap />, keterangan: 'KHS & transkrip', grup: 'Akademik' },
  { key: 'bayar', label: 'Pembayaran', icon: <Wallet />, keterangan: 'Tagihan & riwayat', grup: 'Keuangan', badge: 1 },
  { key: 'kwitansi', label: 'Kwitansi', icon: <Receipt />, keterangan: 'Unduh bukti bayar', grup: 'Keuangan' },
  { key: 'surat', label: 'Surat', icon: <FileText />, keterangan: 'Ajukan surat', grup: 'Layanan', baru: true },
  { key: 'magang', label: 'Karier', icon: <Briefcase />, keterangan: 'Lowongan & magang', grup: 'Layanan' },
  { key: 'fakultas', label: 'Fakultas', icon: <Building2 />, keterangan: 'Info fakultas', grup: 'Layanan' },
  { key: 'notif', label: 'Notifikasi', icon: <Bell />, grup: 'Layanan', disabled: true },
];

export function Utama() {
  const varian: VarianMenuUtama[] = ['grid', 'daftar', 'kartu', 'mega', 'dok', 'ubin'];
  const [v, setV] = React.useState<VarianMenuUtama>('grid');
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.375rem' }}>
        {varian.map((x) => (
          <Button key={x} size="sm" variant={x === v ? 'primary' : 'secondary'} onClick={() => setV(x)}>
            {x}
          </Button>
        ))}
      </div>
      <MenuUtama
        varian={v}
        items={ITEMS.map((it, i) => ({ ...it, warna: `var(--u-chart-${(i % 6) + 1})`, onClick: () => undefined }))}
        activeKey="krs"
        cari={v === 'grid' || v === 'mega'}
        judul="Menu mahasiswa"
      />
    </div>
  );
}

export function Atas() {
  const [aktif, setAktif] = React.useState('ringkasan');
  const items = [
    { key: 'ringkasan', label: 'Ringkasan', icon: <LayoutDashboard size={16} /> },
    { key: 'pegawai', label: 'Pegawai', icon: <Users size={16} />, badge: 12 },
    { key: 'presensi', label: 'Presensi', icon: <CalendarCheck size={16} /> },
    {
      key: 'laporan',
      label: 'Laporan',
      icon: <FileText size={16} />,
      children: [
        { key: 'lap-bulanan', label: 'Bulanan' },
        { key: 'lap-tahunan', label: 'Tahunan' },
      ],
    },
    { key: 'gaji', label: 'Penggajian', icon: <Wallet size={16} /> },
    { key: 'pengaturan', label: 'Pengaturan', icon: <Settings size={16} /> },
  ];
  const varian: VarianMenuAtas[] = ['tab', 'pil', 'garis', 'segmen', 'remah', 'bilah'];
  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {varian.map((v) => (
        <div key={v}>
          <small style={{ color: 'var(--u-text-muted)' }}>varian="{v}"</small>
          <MenuAtas
            varian={v}
            items={v === 'remah' ? items.slice(0, 3) : items}
            activeKey={aktif}
            onPilih={setAktif}
            maks={v === 'segmen' ? 4 : undefined}
            brand={v === 'bilah' ? <strong>SDM</strong> : undefined}
            cari={v === 'bilah'}
            aksi={v === 'bilah' ? <Button size="sm">Tambah pegawai</Button> : undefined}
          />
        </div>
      ))}
    </div>
  );
}
