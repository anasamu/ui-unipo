import * as React from 'react';
import { Download, Pencil, Send, Trash2, Eye, Copy } from 'lucide-react';
import { BilahAksi, Button, DataTable, MenuAksiBaris, useKonfirmasi, useToast } from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Tombol aksi standar & konfirmasi',
  category: 'Aksi',
  description:
    'BilahAksi menyeragamkan tombol di kepala halaman, kaki form, dan panel detail: ikon + label, satu aksi utama paling kanan, aksi bahaya berkonfirmasi, alasan nonaktif, dan menu ⋯ di ponsel. MenuAksiBaris untuk ujung baris tabel. useKonfirmasi menggantikan window.confirm/prompt.',
  importLine: "import { BilahAksi, MenuAksiBaris, KonfirmasiAksi, useKonfirmasi } from 'unipo-ui';",
  demos: { Bilah: 'Bilah aksi kepala halaman', Baris: 'Menu aksi baris tabel', Konfirmasi: 'Pengganti confirm & prompt' },
  props: [
    ['aksi', 'Aksi[]', '{ kunci, label, ikon, nada: utama|sekunder|bahaya|senyap, onClick (async → memuat), href, nonaktif, alasan, konfirmasi, sembunyi, pintasan }'],
    ['tampilPonsel', 'number', 'Tombol yang tetap tampil di layar ≤ 640px (bawaan 1 = aksi utama); sisanya masuk ⋯.'],
    ['penuhPonsel', 'boolean', 'Tombol selebar layar di ponsel (kaki panel samping).'],
    ['MenuAksiBaris nama', 'string', 'Label aksesibel "Aksi untuk Siti Aminah".'],
  ],
  notes: [
    'Aksi tanpa hak sebaiknya `sembunyi`, bukan tampil lalu gagal. Aksi yang belum bisa dijalankan (mis. menunggu verifikasi) tampil `nonaktif` dengan `alasan`.',
    'Konfirmasi menulis akibat dalam bahasa awam dan tombolnya memakai kata kerja + objek ("Hapus kegiatan"), bukan "OK".',
  ],
};

const tunggu = (ms = 700) => new Promise((r) => setTimeout(r, ms));

export function Bilah() {
  const toast = useToast();
  return (
    <BilahAksi
      aksi={[
        { kunci: 'unduh', label: 'Unduh PDF', ikon: <Download />, onClick: () => tunggu() },
        { kunci: 'ubah', label: 'Ubah', ikon: <Pencil />, nonaktif: true, alasan: 'Sudah diajukan; menunggu review' },
        { kunci: 'hapus', label: 'Hapus', ikon: <Trash2 />, nada: 'bahaya', konfirmasi: { judul: 'Hapus proposal “Pengabdian Desa Marisa”?', keterangan: 'Anggota tim tidak bisa lagi membuka proposal ini.', label: 'Hapus proposal' }, onClick: () => tunggu() },
        { kunci: 'ajukan', label: 'Ajukan proposal', ikon: <Send />, nada: 'utama', onClick: async () => (await tunggu(), toast.add({ title: 'Proposal diajukan', type: 'success' })) },
      ]}
    />
  );
}

const BARIS = [
  { id: 1, nama: 'Siti Aminah', nim: '2201010001', status: 'Aktif' },
  { id: 2, nama: 'Budi Santoso', nim: '2201010002', status: 'Cuti' },
];

export function Baris() {
  return (
    <DataTable
      rows={BARIS}
      rowKey={(r) => String(r.id)}
      columns={[
        { key: 'nama', header: 'Nama', cell: (r) => r.nama },
        { key: 'nim', header: 'NIM', cell: (r) => r.nim },
        { key: 'status', header: 'Status', cell: (r) => r.status },
        {
          key: 'aksi',
          header: '',
          align: 'end',
          cell: (r) => (
            <MenuAksiBaris
              nama={r.nama}
              utama={{ kunci: 'buka', label: 'Buka', ikon: <Eye /> }}
              aksi={[
                { kunci: 'salin', label: 'Salin NIM', ikon: <Copy />, onClick: () => navigator.clipboard?.writeText(r.nim) },
                { kunci: 'ubah', label: 'Ubah data', ikon: <Pencil />, nonaktif: r.status === 'Cuti', alasan: 'Sedang cuti' },
                { kunci: 'hapus', label: 'Hapus', ikon: <Trash2 />, nada: 'bahaya', konfirmasi: { judul: `Hapus ${r.nama}?`, keterangan: 'Riwayat KRS tetap tersimpan.', label: 'Hapus mahasiswa' }, onClick: () => tunggu() },
              ]}
            />
          ),
        },
      ]}
    />
  );
}

export function Konfirmasi() {
  const { konfirmasi, tanya, elemen } = useKonfirmasi();
  const [hasil, setHasil] = React.useState('—');
  return (
    <div className="demo-row">
      <Button variant="outline" onClick={async () => setHasil(String(await konfirmasi({ judul: 'Kirim ulang tagihan ke 120 mahasiswa?', keterangan: 'Email dan notifikasi aplikasi akan dikirim sekarang.', label: 'Kirim ulang', nada: 'utama' })))}>
        konfirmasi()
      </Button>
      <Button variant="destructive-soft" onClick={async () => setHasil(JSON.stringify(await tanya({ judul: 'Tolak pengajuan cuti?', keterangan: 'Mahasiswa melihat alasan ini.', label: 'Tolak pengajuan', labelIsian: 'Alasan penolakan', panjang: true, min: 10, maks: 255 })))}>
        tanya()
      </Button>
      <span style={{ fontSize: 13 }}>
        Hasil: <code>{hasil}</code>
      </span>
      {elemen}
    </div>
  );
}
