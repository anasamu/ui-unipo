import * as React from 'react';
import { Mail } from 'lucide-react';
import { Button, Panel } from 'unipo-ui';
import { DetailDosen, DetailMahasiswa, DetailMataKuliah, KhsMahasiswa, KrsMahasiswa, RiwayatStudi, SheetDetailMahasiswa, TranskripMahasiswa } from 'unipo-ui/siakad';
import { DOSEN, MAHASISWA, MATA_KULIAH } from '../mock/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Detail mahasiswa, dosen & MK',
  category: 'Widget fitur',
  layout: 'wide',
  order: 3,
  description:
    'Profil lengkap dari API SIAKAD: kepala profil dengan angka utama, biodata, riwayat studi (grafik IPS/IPK dan status tiap semester), KRS, KHS per periode, transkrip per semester dengan sebaran nilai, jadwal mengajar dan mahasiswa bimbingan dosen, serta kelas yang dibuka untuk satu mata kuliah. Tiap bagian bisa dipakai sendiri, digabung dalam tab, atau dibuka sebagai panel samping.',
  importLine: "import { DetailMahasiswa, SheetDetailMahasiswa, KhsMahasiswa, TranskripMahasiswa, KrsMahasiswa, RiwayatStudi, DetailDosen, DetailMataKuliah } from 'unipo-ui/siakad';",
  demos: {
    Mahasiswa: 'DetailMahasiswa (profil bertab)',
    PanelSamping: 'SheetDetailMahasiswa dari tombol',
    Riwayat: 'RiwayatStudi',
    Khs: 'KhsMahasiswa per periode',
    Transkrip: 'TranskripMahasiswa per semester',
    Krs: 'KrsMahasiswa periode aktif',
    Dosen: 'DetailDosen',
    MataKuliah: 'DetailMataKuliah',
  },
  props: [
    ['DetailMahasiswa.tabs', "('ringkasan' | 'krs' | 'khs' | 'transkrip')[]", 'Tab yang ditampilkan dan urutannya.'],
    ['DetailMahasiswa.aksi / SheetDetailMahasiswa.aksi', 'ReactNode', 'Tombol di kepala profil, mis. Kirim pesan atau Cetak KHS.'],
    ['TranskripMahasiswa.kelompok', "'semester' | 'tidak'", 'Kelompokkan per semester (bawaan) atau satu tabel dengan kolom periode.'],
    ['KrsMahasiswa.tahunId / KhsMahasiswa.tahunId', 'string', 'Periode, mis. 20251. Bawaan periode aktif (KRS) atau terbaru (KHS).'],
    ['DetailMataKuliah.mk', 'Row', 'Baris dari mataKuliah.list; kelas dibuka diambil dari jadwal.list.'],
  ],
  notes: [
    'Scope: mahasiswa:read, nilai:read (KHS/transkrip), krs:read, dosen:read, jadwal:read. Data pribadi (TTL, kontak, alamat) hanya tampil bila token juga punya mahasiswa:pii; tanpa itu bagian Pribadi diganti keterangan.',
    'Nilai semester berjalan yang belum dirilis tampil sebagai "Belum dirilis" sesuai respons API (nilai_ditampilkan: false).',
  ],
};

const NIM = MAHASISWA[1]!.nim;

export function Mahasiswa() {
  return (
    <DetailMahasiswa
      nim={NIM}
      aksi={
        <Button variant="outline" size="sm">
          <Mail /> Kirim pesan
        </Button>
      }
    />
  );
}
export function PanelSamping() {
  const [nim, setNim] = React.useState<string | null>(null);
  return (
    <div className="demo-row">
      {MAHASISWA.slice(0, 3).map((m) => (
        <Button key={m.nim} variant="outline" size="sm" onClick={() => setNim(m.nim)}>
          {m.nama}
        </Button>
      ))}
      <SheetDetailMahasiswa nim={nim} onOpenChange={(o) => !o && setNim(null)} />
    </div>
  );
}
export function Riwayat() {
  return (
    <Panel title="Riwayat studi">
      <RiwayatStudi nim={MAHASISWA[7]!.nim} />
    </Panel>
  );
}
export function Khs() {
  return <KhsMahasiswa nim={NIM} />;
}
export function Transkrip() {
  return <TranskripMahasiswa nim={MAHASISWA[2]!.nim} />;
}
export function Krs() {
  return <KrsMahasiswa nim={MAHASISWA[1]!.nim} />;
}
export function Dosen() {
  return <DetailDosen nidn={DOSEN[0]!.nidn} tab="jadwal" />;
}
export function MataKuliah() {
  return <DetailMataKuliah mk={MATA_KULIAH[1]!} />;
}
