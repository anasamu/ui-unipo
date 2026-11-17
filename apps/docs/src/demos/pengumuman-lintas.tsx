import * as React from 'react';
import { SegmentedControl } from 'unipo-ui';
import { PILIHAN_MODE, PILIHAN_NADA, PratinjauPengumuman, type ModePengumuman, type NadaPengumuman, type PengumumanTayang } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Pengumuman lintas aplikasi',
  category: 'Terhubung SDK',
  layout: 'wide',
  order: 6,
  badge: 'baru',
  description:
    'Unit membuat pengumuman singkat yang tampil di semua aplikasi sasaran: aplikasi dasbor (otomatis lewat KerangkaAplikasi), portal publik (KerangkaPortal), dan SIAKAD lama. Cara tampil dipilih per pengumuman: pita di atas, banner di atas isi, popup, toast dari kanan, atau bilah bawah ponsel. Sasaran: aplikasi, unit (beserta turunannya), peran RBAC, dan jenis pengguna; dengan jadwal tayang dan tutup per akun.',
  importLine: "import { KelolaPengumuman, FormPengumuman, PengumumanTampil, usePengumumanTayang } from 'unipo-ui/siakad';",
  demos: {
    Mode: 'Pratinjau setiap cara tampil dan nada',
  },
  props: [
    ['KelolaPengumuman aplikasi', 'string', 'Halaman kelola: daftar dengan status tayang, buat/ubah dengan pratinjau, arsipkan, hapus. Sasaran aplikasi bawaan = aplikasi ini.'],
    ['FormPengumuman awal / aplikasiBawaan / onSelesai', 'PengumumanKelola / string[] / fungsi', 'Formulir dengan pratinjau langsung, pemilih unit (PilihEntitas), peran, jenis pengguna, jadwal, dan perkiraan penerima.'],
    ['PengumumanTampil aplikasi / situs / bagian', "string / string / ('atas' | 'isi' | 'lapis')[]", 'Tampilkan pengumuman sesuai mode. Sudah dipasang KerangkaAplikasi (prop pengumuman) dan KerangkaPortal.'],
    ['KerangkaAplikasi pengumuman', 'boolean | { aplikasi }', 'Bawaan true dengan kode aplikasi = kode.'],
  ],
  notes: [
    'API: GET /v1/notif/pita?aplikasi=<kode>[&situs=<kode>] untuk yang tayang, POST /v1/notif/pita/{id}/tutup, dan /v1/notif/pita/kelola untuk pengelola (izin pengumuman:kelola).',
    'Pengelola unit hanya bisa menyasar unitnya dan unit di bawahnya. Pengumuman publik dari unit hanya tampil di situs portal unit itu; pengumuman publik universitas hanya dari Humas atau admin.',
    'Popup tampil satu per satu menurut prioritas, sekali per akun atau setiap membuka aplikasi. Toast bisa hilang sendiri. Semua menghormati prefers-reduced-motion.',
  ],
};

export function Mode() {
  const [mode, setMode] = React.useState<ModePengumuman>('pita');
  const [nada, setNada] = React.useState<NadaPengumuman>('pemeliharaan');
  const p: PengumumanTayang = {
    id: 'demo',
    judul: 'Pemeliharaan server SIAKAD Sabtu malam',
    isi: 'SIAKAD dan aplikasi terkait tidak bisa diakses pukul 22.00–02.00 WITA.',
    tautan: '#',
    teks_tautan: 'Selengkapnya',
    nada,
    mode,
    dapat_ditutup: true,
  };
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 720 }}>
      <SegmentedControl value={mode} onValueChange={(v) => setMode(v as ModePengumuman)} options={PILIHAN_MODE.map(({ value, label }) => ({ value, label }))} aria-label="Cara tampil" />
      <SegmentedControl value={nada} onValueChange={(v) => setNada(v as NadaPengumuman)} options={PILIHAN_NADA} aria-label="Nada" />
      <PratinjauPengumuman p={p} />
    </div>
  );
}
