import * as React from 'react';
import { Bell, BookOpen, Home, Plus, User } from 'lucide-react';
import { BilahAplikasi, Button, Card, CardContent, NavigasiBawah, TombolMelayang, setelPlatform, usePlatform, type Platform, type SistemOperasi } from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Target platform',
  category: 'Mulai',
  layout: 'wide',
  order: 15,
  badge: 'baru',
  description:
    'Pilih target saat pemasangan: web, desktop (Electron/Tauri), atau mobile dengan gaya iOS atau Android. Semua komponen menyesuaikan: dialog jadi lembar bawah di mobile, target sentuh 44 px (iOS) atau 48 px (Android), tombol pil dan efek riak di Android, saklar hijau dan latar buram di iOS, bilah judul yang bisa diseret di desktop.',
  importLine: "import { setelPlatform, usePlatform, PlatformProvider, NavigasiBawah, BilahAplikasi, TombolMelayang } from 'unipo-ui';",
  demos: { Pilih: 'Ganti platform (berlaku di seluruh halaman dokumentasi)', Aplikasi: 'Bilah aplikasi, navigasi bawah, tombol melayang', Cli: 'Pemasangan lewat CLI' },
  props: [
    ['setelPlatform({ platform, os })', "platform: 'web' | 'desktop' | 'mobile' | 'auto'; os: 'ios' | 'android' | 'auto'", 'Panggil sekali di berkas awal. "auto" mendeteksi Capacitor/Cordova, Electron/Tauri, atau peramban.'],
    ['usePlatform()', 'InfoPlatform', '{ platform, os, sentuh, mobile, desktop, ios, android } untuk logika khusus di komponen sendiri.'],
    ['<PlatformProvider>', 'platform, os', 'Versi komponen dari setelPlatform().'],
  ],
  notes: ['Penyesuaian memakai atribut data-u-platform dan data-u-os di <html>, jadi berkas CSS saja juga bisa dipakai di Laravel/Blade: tulis <html data-u-platform="mobile" data-u-os="ios">.'],
};

const PILIHAN: Array<{ label: string; platform: Platform; os: SistemOperasi | 'auto' }> = [
  { label: 'Web', platform: 'web', os: 'auto' },
  { label: 'Desktop', platform: 'desktop', os: 'auto' },
  { label: 'Mobile iOS', platform: 'mobile', os: 'ios' },
  { label: 'Mobile Android', platform: 'mobile', os: 'android' },
];

export function Pilih() {
  const p = usePlatform();
  return (
    <div style={{ display: 'grid', gap: '.75rem' }}>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        {PILIHAN.map((x) => {
          const aktif = p.platform === x.platform && (x.os === 'auto' || p.os === x.os);
          return (
            <Button key={x.label} variant={aktif ? 'primary' : 'outline'} onClick={() => setelPlatform({ platform: x.platform, os: x.os })}>
              {x.label}
            </Button>
          );
        })}
      </div>
      <p style={{ margin: 0, color: 'var(--u-muted-foreground)' }}>
        Sekarang: <code>{p.platform}</code> / <code>{p.os}</code>
        {p.sentuh ? ' (layar sentuh)' : ''}. Buka halaman Overlay untuk melihat dialog berubah jadi lembar bawah.
      </p>
    </div>
  );
}

export function Aplikasi() {
  const [tab, setTab] = React.useState('beranda');
  return (
    <Card style={{ maxWidth: 390, margin: '0 auto', overflow: 'hidden' }}>
      <div style={{ position: 'relative', height: 520, transform: 'translateZ(0)', overflow: 'auto' }}>
        <BilahAplikasi title="KRS Semester Ganjil" onBack={() => {}} actions={<Button size="sm" variant="ghost" aria-label="Notifikasi"><Bell /></Button>} />
        <CardContent style={{ display: 'grid', gap: '.75rem', paddingBottom: '6rem' }}>
          {['Algoritma dan Pemrograman', 'Basis Data', 'Statistika Dasar', 'Jaringan Komputer'].map((mk, i) => (
            <Card key={mk}>
              <CardContent style={{ padding: '.75rem 1rem' }}>
                <strong>{mk}</strong>
                <div style={{ color: 'var(--u-muted-foreground)', fontSize: '.875rem' }}>{i + 2} SKS · Kelas A</div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
        <NavigasiBawah
          activeKey={tab}
          items={[
            { key: 'beranda', label: 'Beranda', icon: <Home />, onClick: () => setTab('beranda') },
            { key: 'kuliah', label: 'Kuliah', icon: <BookOpen />, onClick: () => setTab('kuliah') },
            { key: 'notif', label: 'Notifikasi', icon: <Bell />, badge: 3, onClick: () => setTab('notif') },
            { key: 'profil', label: 'Profil', icon: <User />, onClick: () => setTab('profil') },
          ]}
        />
        <TombolMelayang icon={<Plus />} label="Tambah mata kuliah" />
      </div>
    </Card>
  );
}

export function Cli() {
  return (
    <pre className="u-code" style={{ margin: 0 }}>{`# saat pemasangan, CLI menanyakan target
npx unipo-ui init
#  Target aplikasi? web / desktop / mobile
#  Sistem operasi mobile? ios / android / auto

# atau langsung
npx unipo-ui init --platform mobile --os ios

# ganti target nanti
npx unipo-ui platform desktop

# hasil di berkas awal aplikasi
import { setelPlatform } from 'unipo-ui';
setelPlatform({ platform: 'mobile', os: 'ios' });`}</pre>
  );
}
