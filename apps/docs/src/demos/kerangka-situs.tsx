import * as React from 'react';
import { GraduationCap } from 'lucide-react';
import { KerangkaSitus, HalamanLanding, PRESET_SITUS, landingBawaan, menuLanding, type DokumenLanding } from 'unipo-ui';
import { HalamanDepanAplikasi, PenyuntingSitus, PENYEDIA_SIAKAD } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Kepala dan kaki situs',
  category: 'Fondasi',
  order: 5,
  layout: 'full',
  description:
    'Kerangka situs publik aplikasi bawaan yang diatur dari Pengaturan tema → Kepala & kaki situs: pita pengumuman, bilah atas (kontak, tautan cepat, media sosial), navbar (gaya, lengket, tembus di atas hero, kotak cari, tombol ajakan), menu utama sampai tiga tingkat dengan dropdown dan mega menu berkartu sorotan, sidebar halaman dalam, dan kaki situs berkolom. Data berversi di SIAKAD (/v1/tema/{aplikasi}/situs): draf, terbit, riwayat, pulihkan.',
  importLine: "import { KerangkaSitus, PRESET_SITUS } from 'unipo-ui';\nimport { HalamanDepanAplikasi, SitusAplikasi, PenyuntingSitus } from 'unipo-ui/siakad';",
  demos: {
    Penyunting: 'PenyuntingSitus: bagian, pohon menu seret-lepas, preset, pratinjau desktop/tablet/ponsel',
    PresetPortal: 'KerangkaSitus: preset Portal kampus (halaman dalam dengan sidebar)',
    PresetPmb: 'KerangkaSitus: preset Pendaftaran, navbar tembus di atas hero foto',
    DepanLms: 'HalamanDepanAplikasi: kerangka + halaman depan E-Learning dari SIAKAD',
  },
  props: [
    ['situs', 'DokumenSitus', 'Pengaturan dari GET /v1/tema/{aplikasi}/situs (terbit atau draf); null = hanya isi.'],
    ['merek', 'ReactNode', 'Logo + nama aplikasi untuk navbar dan kaki.'],
    ['aksi', 'Record<string, AksiLanding>', 'Tujuan tombol dan menu beralamat aksi:<kunci>, mis. aksi:masuk.'],
    ['menuBagian', '{ key, label, href }[]', 'Bagian halaman bertanda menu (menuLanding(dok)), ditambahkan bila kepala.menu_bagian.'],
    ['sidebar', 'boolean', 'Tampilkan sidebar (halaman dalam). Halaman depan tanpa sidebar.'],
    ['atasGelap', 'boolean', 'Bagian pertama berlatar foto/gelap: syarat navbar tembus pandang.'],
    ['penyedia', 'PenyediaLanding', 'Data dinamis; widget berita sidebar memakai Kabar dari portal Humas.'],
  ],
  notes: [
    'Menu tingkat 1 tampil di navbar. Menu yang punya sub menu menjadi dropdown; bila sub menunya punya tautan lagi (tingkat 3), menu itu menjadi mega menu berkolom dengan kartu sorotan opsional.',
    'Tujuan tautan boleh /alamat, #bagian, https://, mailto:, tel:, aksi:<kunci>, atau berkas publik dari Kelola berkas (diunduh). Tidak ada HTML atau CSS bebas: semua gaya dari token tema.',
    'Pohon menu bisa diatur dengan seret-lepas, tombol pindah, atau papan ketik: Alt+↑/↓ urutan, Alt+→ jadikan sub menu, Alt+← keluarkan.',
  ],
};

const Logo = () => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
    <GraduationCap aria-hidden style={{ color: 'var(--u-primary)' }} /> UNIPO
  </span>
);
const AKSI = { masuk: { label: 'Masuk SSO', href: '#masuk' }, daftar: { label: 'Daftar PMB', href: '#daftar' } };
const bingkai: React.CSSProperties = { border: '1px solid var(--u-border)', borderRadius: 12, overflow: 'hidden' };

export function Penyunting() {
  return (
    <div style={{ ...bingkai, height: 820, display: 'flex' }}>
      <PenyuntingSitus aplikasi="lms" nama="E-Learning UNIPO" merek={<Logo />} aksi={AKSI} />
    </div>
  );
}

const DALAM: DokumenLanding = {
  versi: 1,
  blok: [
    {
      id: 'dalam001',
      tipe: 'teks',
      isi: {
        eyebrow: 'Berita',
        judul: 'Wisuda periode II tahun 2027 digelar di Marisa',
        isi: 'Sebanyak 412 lulusan dari empat fakultas mengikuti wisuda periode II.\n\nUpacara dipimpin rektor dan disiarkan langsung melalui kanal resmi kampus.\n\n- Lulusan terbaik: Fakultas Teknik\n- Rata-rata masa studi: 4 tahun 2 bulan',
      },
      gaya: { jarak: 'rapat', lebar: 'penuh' },
    },
  ],
};

export function PresetPortal() {
  const situs = React.useMemo(() => PRESET_SITUS.portal!.buat(), []);
  return (
    <div style={bingkai}>
      <KerangkaSitus situs={situs} merek={<Logo />} aksi={AKSI} sidebar penyedia={PENYEDIA_SIAKAD} aktif="/berita">
        <HalamanLanding dokumen={DALAM} />
      </KerangkaSitus>
    </div>
  );
}

export function PresetPmb() {
  const situs = React.useMemo(() => PRESET_SITUS.pendaftaran!.buat(), []);
  const dok = React.useMemo<DokumenLanding>(() => {
    const d = landingBawaan('pmb');
    const [hero, ...sisa] = d.blok;
    return hero ? { ...d, blok: [{ ...hero, isi: { ...hero.isi, tata: 'layar' } }, ...sisa.slice(0, 2)] } : d;
  }, []);
  return (
    <div style={bingkai}>
      <KerangkaSitus situs={situs} merek={<Logo />} aksi={AKSI} menuBagian={menuLanding(dok)} atasGelap penyedia={PENYEDIA_SIAKAD}>
        <HalamanLanding dokumen={dok} aksi={AKSI} penyedia={PENYEDIA_SIAKAD} />
      </KerangkaSitus>
    </div>
  );
}

export function DepanLms() {
  return (
    <div style={bingkai}>
      <HalamanDepanAplikasi aplikasi="lms" merek={<Logo />} aksi={AKSI} aturJudul={false} />
    </div>
  );
}
