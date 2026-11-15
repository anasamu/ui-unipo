import * as React from 'react';
import { Bell, LifeBuoy } from 'lucide-react';
import { KartuAkun, MenuAkun, type AkunPengguna, type TemaAkun } from 'unipo-ui';
import { KartuAkunSiakad, MenuAkunSiakad } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Menu & kartu akun',
  category: 'Profil',
  layout: 'wide',
  order: 1,
  badge: 'baru',
  description:
    'Menu akun yang sama di semua aplikasi UNIPO (seperti di sso.unipo.ac.id): foto, nama, username · peran, tautan ke profile.unipo.ac.id untuk melihat dan mengubah profil, keamanan akun di SSO, lalu keluar dari semua aplikasi. Tersedia lima bentuk pemicu dan empat bentuk kartu, serta versi yang mengisi dirinya dari GET /v1/profil/saya.',
  importLine: "import { MenuAkun, KartuAkun, tautanAkun } from 'unipo-ui';\nimport { MenuAkunSiakad, KartuAkunSiakad, useAkunSaya } from 'unipo-ui/siakad';",
  demos: {
    Pemicu: 'MenuAkun: varian pil (seperti SSO), nama, avatar, ikon, dan sidebar',
    Lengkap: 'Kelengkapan profil, semua item, pilihan peran, tema, dan item tambahan',
    Siakad: 'MenuAkunSiakad + KartuAkunSiakad: data dari /v1/profil/saya (nama, NIM, prodi, foto, kelengkapan)',
    Kartu: 'KartuAkun: baris, kartu, sampul, tengah',
    Bilah: 'Di bilah atas aplikasi',
  },
  props: [
    ['pengguna', 'AkunPengguna', '{ nama, username, level, peran, unit, email, foto, status }. Baris kedua: "username · peran".'],
    ['varian', "'pil' | 'nama' | 'avatar' | 'ikon' | 'sidebar'", 'Bentuk pemicu MenuAkun. Sidebar membuka menu ke atas.'],
    ['item', "Array<'profil' | 'ubah' | 'data' | 'foto' | 'password' | 'keamanan'>", 'Item bawaan. Bawaan: profil, ubah, keamanan.'],
    ['profilUrl / ssoUrl', 'string', 'Bawaan https://profile.unipo.ac.id dan https://sso.unipo.ac.id.'],
    ['tautan', 'Partial<TautanAkun>', 'Ganti jalur: profil, ubahProfil, dataPribadi, foto, password, keamanan, keluar.'],
    ['kelengkapan', 'number', 'Persen data wajib. Di bawah 100 tampil bilah "Lengkapi profil" yang menuju /data-pribadi.'],
    ['peranLain / onGantiPeran', 'Array<{ kode, label, aktif }>', 'Untuk akun dengan beberapa peran.'],
    ['tema / onTema', "'terang' | 'gelap' | 'sistem'", 'Pilihan tema di dalam menu.'],
    ['menu', 'MenuEntry[]', 'Item tambahan sebelum tombol keluar.'],
    ['onKeluar', '() => void', 'Bawaan menuju SSO /logout (keluar dari semua aplikasi). Isi bila aplikasi perlu menghapus sesinya dulu.'],
    ['KartuAkun.varian', "'baris' | 'kartu' | 'sampul' | 'tengah'", 'Kartu tanpa menu untuk laci ponsel, dasbor, atau halaman profil.'],
    ['KartuAkun.statistik / aksi', 'Array<{label, nilai}> / ReactNode | null', 'Angka kecil dan tombol (bawaan Ubah profil + Keamanan akun).'],
  ],
  notes: [
    'MenuAkunSiakad dan KartuAkunSiakad butuh scope profil:read. Pas foto diambil dari /v1/profil/saya/foto dengan token lalu ditampilkan sebagai object URL. Selama memuat atau bila scope belum ada, isi `cadangan` dari sesi SSO.',
    'Jalur bawaan sesuai rute profile.unipo.ac.id: / (profil saya), /profil (ubah profil, bio, pas foto), /data-pribadi (data pribadi), /akun (akun dan ganti password). Keamanan akun (sesi dan perangkat) ada di SSO /akun. Ganti lewat `tautan` atau `tautanAkun()` bila perlu.',
  ],
};

const FOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="#7c3aed"/><circle cx="48" cy="38" r="17" fill="#ede9fe"/><path d="M16 96c4-20 18-30 32-30s28 10 32 30z" fill="#ede9fe"/></svg>',
  );
const ADMIN: AkunPengguna = { nama: 'ADMIN UNIPO', username: '990101', level: 'ADMIN' };
const DOSEN: AkunPengguna = { nama: 'Dr. Rahmawati Hasan, S.T., M.T.', username: '0912078501', peran: 'Dosen', unit: 'S1 Teknik Informatika', status: 'online' };

export function Pemicu() {
  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <MenuAkun pengguna={ADMIN} varian="pil" />
        <MenuAkun pengguna={DOSEN} varian="nama" />
        <MenuAkun pengguna={DOSEN} varian="avatar" />
        <MenuAkun pengguna={ADMIN} varian="ikon" />
      </div>
      <div style={{ width: 260, padding: '0.5rem', border: '1px solid var(--u-border)', borderRadius: 'var(--u-radius-lg)', background: 'var(--u-card)' }}>
        <MenuAkun pengguna={DOSEN} varian="sidebar" />
      </div>
    </div>
  );
}

export function Lengkap() {
  const [tema, setTema] = React.useState<TemaAkun>('sistem');
  const [peran, setPeran] = React.useState('dosen');
  return (
    <MenuAkun
      pengguna={DOSEN}
      varian="pil"
      item={['profil', 'ubah', 'data', 'foto', 'password', 'keamanan']}
      kelengkapan={64}
      peranLain={[
        { kode: 'dosen', label: 'Dosen', aktif: peran === 'dosen' },
        { kode: 'kaprodi', label: 'Ketua Program Studi', aktif: peran === 'kaprodi' },
      ]}
      onGantiPeran={setPeran}
      tema={tema}
      onTema={setTema}
      menu={[
        { label: 'Notifikasi', icon: <Bell />, href: '#notifikasi' },
        { label: 'Bantuan', icon: <LifeBuoy />, href: 'https://helpdesk.unipo.ac.id' },
      ]}
      align="start"
    />
  );
}

export function Siakad() {
  return (
    <div style={{ display: 'grid', gap: '1.25rem', maxWidth: 420 }}>
      <div style={{ justifySelf: 'start' }}>
        <MenuAkunSiakad varian="pil" align="start" cadangan={{ nama: 'Memuat…' }} />
      </div>
      <KartuAkunSiakad varian="kartu" />
    </div>
  );
}

export function Kartu() {
  const MHS: AkunPengguna = { nama: 'Nurul Aini Hasan', username: '2304110001', peran: 'Mahasiswa', unit: 'S1 Teknik Informatika', email: 'nurul.aini@mhs.unipo.ac.id', foto: FOTO };
  return (
    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', alignItems: 'start' }}>
      <div style={{ display: 'grid', gap: '1rem' }}>
        <KartuAkun pengguna={MHS} varian="baris" kelengkapan={72} />
        <KartuAkun
          pengguna={DOSEN}
          varian="kartu"
          kelengkapan={100}
          statistik={[
            { label: 'Kelas', nilai: 6 },
            { label: 'Bimbingan', nilai: 24 },
          ]}
        />
      </div>
      <KartuAkun
        pengguna={MHS}
        varian="sampul"
        kelengkapan={72}
        statistik={[
          { label: 'IPK', nilai: '3,61' },
          { label: 'SKS', nilai: 98 },
          { label: 'Semester', nilai: 5 },
        ]}
      />
      <KartuAkun pengguna={ADMIN} varian="tengah" onKeluar={() => undefined} />
    </div>
  );
}

export function Bilah() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '0.625rem 1rem',
        border: '1px solid var(--u-border)',
        borderRadius: 'var(--u-radius-lg)',
        background: 'var(--u-card)',
      }}
    >
      <strong>SSO UNIPO</strong>
      <MenuAkun pengguna={ADMIN} />
    </div>
  );
}
