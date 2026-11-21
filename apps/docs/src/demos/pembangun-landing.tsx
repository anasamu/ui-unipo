import * as React from 'react';
import { BookOpen, Briefcase, Users } from 'lucide-react';
import { Badge, Button, Card, CardContent, HalamanLanding, URUT_BLOK, blokBaru, landingBawaan, menuLanding, type DokumenLanding, type SlotLanding } from 'unipo-ui';
import { LandingAplikasi, PengaturanTema, PenyuntingLanding, PENYEDIA_SIAKAD } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Pembangun halaman landing',
  category: 'Fondasi',
  order: 4,
  badge: 'baru',
  layout: 'full',
  description:
    'Landing page aplikasi bawaan disusun dari blok (hero, fitur, angka, langkah, berita, ajakan, FAQ, testimoni, logo, galeri, kontak, teks, gambar + teks, kaki, bagian data aplikasi) dan diatur dari Pengaturan tema → Halaman depan: tambah/hapus/urutkan blok, panel properti, pratinjau desktop/tablet/ponsel terang/gelap, draf, terbit, riwayat, dan templat. Data berversi di SIAKAD (/v1/tema/{aplikasi}/halaman/{halaman}).',
  importLine: "import { HalamanLanding, landingBawaan } from 'unipo-ui';\nimport { LandingAplikasi, PenyuntingLanding } from 'unipo-ui/siakad';",
  demos: {
    DiPengaturanTema: 'PengaturanTema: bagian Halaman depan (otomatis untuk aplikasi terdaftar, mis. lms)',
    Penyunting: 'PenyuntingLanding: penyunting visual (dibuka dari PengaturanTema → Halaman depan)',
    LandingLms: 'LandingAplikasi: landing E-Learning (isi terbit atau templat bawaan)',
    LandingAlumni: 'HalamanLanding: templat Alumni dengan bagian data aplikasi',
    SemuaBlok: 'Semua blok dengan isi bawaan',
  },
  props: [
    ['aplikasi', 'string', 'Kode aplikasi (lms, tracer, pmb, ...).'],
    ['bawaan', 'string', 'Templat bila halaman belum pernah diterbitkan: lms, tracer, pmb, unit, umum.'],
    ['slot', 'Record<string, SlotLanding>', 'Bagian data milik aplikasi, dipilih di blok "Bagian data aplikasi".'],
    ['aksi', 'Record<string, AksiLanding>', 'Tujuan tombol beralamat aksi:<kunci>, mis. aksi:masuk.'],
    ['merek', 'ReactNode', 'Logo untuk blok kaki halaman.'],
  ],
  notes: [
    'Isi disimpan sebagai data, bukan HTML: teks polos dengan pemformatan ringan (**tebal**, *miring*, [tautan](/alamat), daftar "- "), tautan dan gambar disaring di server dan di renderer, gaya hanya pilihan bertoken tema.',
    'Menyimpan draf tidak mengubah tampilan pengunjung. Terbitkan membuat versi baru di riwayat; pulihkan versi lama mengisi draf.',
  ],
};

const KELAS = ['Literasi Data untuk Semua Prodi', 'Bahasa Inggris Akademik', 'Kewirausahaan Digital'];
const SLOT_LMS: Record<string, SlotLanding> = {
  'kelas-terbuka': {
    label: 'Katalog kelas terbuka',
    keterangan: 'Kelas pengayaan dari dosen dan unit, dengan tombol Ikuti kelas.',
    render: (
      <div className="demo-landing-kelas">
        {KELAS.map((k, i) => (
          <Card key={k}>
            <CardContent>
              <Badge variant="primary">
                <BookOpen aria-hidden /> {8 + i * 4} pertemuan
              </Badge>
              <strong>{k}</strong>
              <Button size="sm" variant="outline">
                Ikuti kelas
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    ),
  },
};
const AKSI = { masuk: { label: 'Masuk SSO / buka beranda', href: '#masuk' } };

export function DiPengaturanTema() {
  return <PengaturanTema aplikasi="lms" nama="E-Learning UNIPO" kunciCache="docs.landing.tema.css" denganKerangka={false} denganMasuk={false} landing={{ slot: SLOT_LMS, aksi: AKSI }} />;
}

export function Penyunting() {
  return (
    <div style={{ height: 820, border: '1px solid var(--u-border)', borderRadius: 12, overflow: 'hidden', display: 'flex' }}>
      <PenyuntingLanding aplikasi="lms" nama="E-Learning UNIPO" slot={SLOT_LMS} aksi={AKSI} />
    </div>
  );
}

export function LandingLms() {
  return <LandingAplikasi aplikasi="lms" slot={SLOT_LMS} aksi={AKSI} aturJudul={false} />;
}

function Angka({ ikon, label, nilai }: { ikon: React.ReactNode; label: string; nilai: string }) {
  return (
    <div className="demo-landing-angka">
      {ikon}
      <span>{label}</span>
      <strong>{nilai}</strong>
    </div>
  );
}

const SLOT_ALUMNI: Record<string, SlotLanding> = {
  ringkasan: {
    label: 'Ringkasan data alumni',
    render: (
      <Card>
        <CardContent>
          <Angka ikon={<Users aria-hidden />} label="Lulusan tercatat" nilai="5.412" />
          <Angka ikon={<Briefcase aria-hidden />} label="Sudah terlacak" nilai="68%" />
        </CardContent>
      </Card>
    ),
  },
};

export function LandingAlumni() {
  const dok = React.useMemo(() => landingBawaan('tracer'), []);
  return (
    <>
      <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--u-muted-foreground)' }}>Menu atas dari blok: {menuLanding(dok).map((m) => m.label).join(' · ')}</p>
      <HalamanLanding dokumen={dok} slot={SLOT_ALUMNI} penyedia={PENYEDIA_SIAKAD} />
    </>
  );
}

const ISI_CONTOH: Partial<Record<(typeof URUT_BLOK)[number], Record<string, unknown>>> = {
  slot: { kunci: 'kelas-terbuka', eyebrow: 'Data aplikasi', judul: 'Kelas terbuka' },
  galeri: { butir: [{ gambar: '/contoh/kampus.jpg', keterangan: 'Gedung rektorat' }, { gambar: '/contoh/lab.jpg', keterangan: 'Laboratorium komputer' }, { gambar: '/contoh/wisuda.jpg', keterangan: 'Wisuda 2026' }] },
  logo: { butir: [1, 2, 3, 4, 5].map((i) => ({ gambar: `/contoh/potret-${i}.svg`, nama: `Mitra ${i}` })) },
  testimoni: { butir: [{ kutipan: 'Materi dan tugas tersusun rapi per pertemuan, jadi saya tidak tertinggal.', nama: 'Nur Aisyah', peran: 'Mahasiswa Manajemen', foto: '/contoh/potret-2.svg', bintang: 5 }, { kutipan: 'Kuis tetap tersimpan walau sinyal putus.', nama: 'Rahmat Hasan', peran: 'Mahasiswa Teknik Informatika', foto: '/contoh/potret-3.svg', bintang: 4 }] },
  media: { gambar: '/contoh/lab.jpg', alt: 'Laboratorium komputer', tombol: [{ label: 'Lihat fasilitas', url: '#', gaya: 'garis' }] },
  kabar: { semua_label: 'Semua berita', semua_url: '#berita' },
  kontak: { telepon: '(0443) 210 000', surel: 'info@unipo.ac.id', whatsapp: '081234567890', sosial: [{ jenis: 'instagram', url: 'https://instagram.com/unipo' }, { jenis: 'youtube', url: 'https://youtube.com/@unipo' }] },
};

export function SemuaBlok() {
  const dok = React.useMemo<DokumenLanding>(() => ({ versi: 1, blok: URUT_BLOK.map((t) => blokBaru(t, ISI_CONTOH[t])) }), []);
  return <HalamanLanding dokumen={dok} slot={SLOT_LMS} aksi={AKSI} penyedia={PENYEDIA_SIAKAD} />;
}
