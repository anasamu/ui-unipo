import * as React from 'react';
import { SegmentedControl } from 'unipo-ui';
import { ILUSTRASI_PENGUMUMAN, PILIHAN_MODE, PILIHAN_NADA, PILIHAN_VISUAL, PratinjauPengumuman, type ModePengumuman, type NadaPengumuman, type PengumumanTayang, type VisualPengumuman } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Pengumuman lintas aplikasi',
  category: 'Terhubung SDK',
  layout: 'wide',
  order: 6,
  badge: 'baru',
  description:
    'Unit membuat pengumuman singkat yang tampil di semua aplikasi sasaran: aplikasi dasbor (otomatis lewat KerangkaAplikasi), portal publik (KerangkaPortal), dan SIAKAD lama. Cara tampil dipilih per pengumuman: pita di atas, banner di atas isi, popup, toast dari kanan, atau bilah bawah ponsel. Sasaran: aplikasi, unit (beserta turunannya), dan peran (termasuk jenis akun mahasiswa, dosen, tendik, alumni, pendaftar PMB), plus saklar publik tanpa login; dengan jadwal tayang dan tutup per akun. Tautan Selengkapnya dipilih dari berita, pengumuman, atau agenda portal yang terbit.',
  importLine: "import { KelolaPengumuman, PanelPengumuman, FormPengumuman, PengumumanTampil, usePengumumanTayang } from 'unipo-ui/siakad';",
  demos: {
    Mode: 'Pratinjau setiap cara tampil, nada, dan visual (ikon, ilustrasi, gambar, tanpa)',
  },
  props: [
    ['KelolaPengumuman aplikasi', 'string', 'Halaman kelola: ringkasan yang sedang tayang, tab status (aktif, terjadwal, draf, berakhir, arsip) dengan pencarian dan saring cara tampil, daftar rata kiri dengan aksi ubah, pratinjau, duplikat, arsipkan/pulihkan, hapus. Sasaran aplikasi bawaan = aplikasi ini.'],
    ['PanelPengumuman open / onOpenChange / awal / salin / aplikasiBawaan / onSelesai', 'boolean / fungsi / PengumumanKelola / boolean / string[] / fungsi', 'Buat/ubah/duplikat di panel samping (layar penuh di ponsel): bagian Isi, Tampilan, Sasaran, Jadwal, pratinjau menempel, kaki Batal/Simpan draf/Terbitkan, konfirmasi bila belum disimpan.'],
    ['FormPengumuman awal / salin / aplikasiBawaan / onSelesai / onBatal', 'PengumumanKelola / boolean / string[] / fungsi / fungsi', 'Isian yang sama untuk halaman sendiri (tanpa panel).'],
    ['PengumumanTampil aplikasi / situs / bagian', "string / string / ('atas' | 'isi' | 'lapis')[]", 'Tampilkan pengumuman sesuai mode. Sudah dipasang KerangkaAplikasi (prop pengumuman) dan KerangkaPortal.'],
    ['KerangkaAplikasi pengumuman', 'boolean | { aplikasi }', 'Bawaan true dengan kode aplikasi = kode.'],
  ],
  notes: [
    'API: GET /v1/notif/pita?aplikasi=<kode>[&situs=<kode>] untuk yang tayang, POST /v1/notif/pita/{id}/tutup, dan /v1/notif/pita/kelola untuk pengelola (izin pengumuman:kelola).',
    'Peran khusus jenis akun: akun:mahasiswa, akun:dosen, akun:tendik, akun:alumni, akun:pendaftar (grup "Jenis akun" di pemilih peran). Rekaman lama dengan jenis pengguna tetap berlaku.',
    'Pengelola unit hanya bisa menyasar unitnya dan unit di bawahnya, dan hanya memilih konten portal situs unitnya atau universitas sebagai tautan (URL bebas hanya untuk tingkat universitas). Pengumuman publik dari unit hanya tampil di situs portal unit itu; pengumuman publik universitas hanya dari Humas atau admin.',
    'Visual per pengumuman (opsi.visual): ikon dalam lingkaran (IKON_PENGUMUMAN, warna ikut nada), ilustrasi bawaan (ILUSTRASI_PENGUMUMAN), gambar (banner dan popup), atau tanpa. Popup rata tengah: visual di atas, judul, keterangan, tombol di tengah (mengisi lebar di ponsel). Toast memakai ikon/ilustrasi kecil; pita dan bilah bawah ikon kecil.',
    'Popup tampil satu per satu menurut prioritas, sekali per akun atau setiap membuka aplikasi. Toast bisa hilang sendiri. Semua menghormati prefers-reduced-motion.',
  ],
};

export function Mode() {
  const [mode, setMode] = React.useState<ModePengumuman>('pita');
  const [nada, setNada] = React.useState<NadaPengumuman>('pemeliharaan');
  const [visual, setVisual] = React.useState<VisualPengumuman>('ikon');
  const [ilustrasi, setIlustrasi] = React.useState('pemeliharaan');
  const p: PengumumanTayang = {
    id: 'demo',
    judul: 'Pemeliharaan server SIAKAD Sabtu malam',
    isi: 'SIAKAD dan aplikasi terkait tidak bisa diakses pukul 22.00–02.00 WITA.',
    tautan: '#',
    teks_tautan: 'Selengkapnya',
    nada,
    mode,
    dapat_ditutup: true,
    gambar: visual === 'gambar' ? './contoh/kampus.jpg' : null,
    opsi: { visual, ilustrasi },
  };
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 720 }}>
      <SegmentedControl value={mode} onValueChange={(v) => setMode(v as ModePengumuman)} options={PILIHAN_MODE.map(({ value, label }) => ({ value, label }))} aria-label="Cara tampil" />
      <SegmentedControl value={nada} onValueChange={(v) => setNada(v as NadaPengumuman)} options={PILIHAN_NADA} aria-label="Nada" />
      <SegmentedControl value={visual} onValueChange={(v) => setVisual(v as VisualPengumuman)} options={PILIHAN_VISUAL.map(({ value, label }) => ({ value, label }))} aria-label="Visual" />
      {visual === 'ilustrasi' && <SegmentedControl value={ilustrasi} onValueChange={setIlustrasi} options={ILUSTRASI_PENGUMUMAN} aria-label="Ilustrasi" />}
      <PratinjauPengumuman p={p} />
    </div>
  );
}
