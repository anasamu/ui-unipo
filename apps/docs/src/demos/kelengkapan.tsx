import { Mail } from 'lucide-react';
import { useState } from 'react';
import { Button } from 'unipo-ui';
import { KartuProfilKelengkapan, PengingatKelengkapan, WizardKelengkapan, type KelengkapanSaya } from 'unipo-ui/siakad';
import { resetKelengkapan } from '../mock/fitur';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Kelengkapan data',
  category: 'Profil',
  layout: 'wide',
  order: 4,
  description:
    'Wizard perbaikan data dari GET /v1/kelengkapan/saya untuk mahasiswa dan dosen. Kartu profil berfoto menampilkan persen isian wajib PDDikti yang sudah benar. Langkah dibentuk otomatis dari isian yang kurang (identitas, keluarga, alamat, kontak), dan semua isian dikirim sekaligus ke POST /v1/kelengkapan/saya. Isian yang hanya boleh diubah petugas (nama, tanggal lahir, jabatan) ditampilkan terpisah dengan arahan ke BAK/SDM.',
  importLine: "import { WizardKelengkapan, PengingatKelengkapan, KartuProfilKelengkapan, useKelengkapanSaya } from 'unipo-ui/siakad';",
  demos: {
    Wizard: 'WizardKelengkapan (sambutan → langkah → simpan)',
    Pengingat: 'PengingatKelengkapan untuk dasbor (tampil hanya bila perlu)',
    Lengkap: 'KartuProfilKelengkapan saat data sudah lengkap',
  },
  props: [
    ['pengguna.foto', 'string', 'URL foto profil, mis. `picture` dari userinfo SSO. Kosong = inisial berwarna.'],
    ['pengguna.keterangan', 'ReactNode', 'Baris kedua, mis. prodi dan angkatan.'],
    ['onSelesai', '(data) => void', 'Setelah POST berhasil; `data` = kelengkapan terbaru.'],
    ['onLewati', '() => void', 'Menampilkan tombol "Nanti saja".'],
    ['kontakPetugas', 'ReactNode', 'Kontak BAK/SDM untuk isian yang tidak bisa diubah sendiri.'],
  ],
  notes: [
    'Butuh token pengguna (MAHASISWA atau DOSEN) dengan scope kelengkapan:saya. Kecamatan dicari lewat /v1/kelengkapan/referensi/wilayah sehingga yang tersimpan kode wilayah PDDikti.',
    'Foto contoh di halaman ini berupa ilustrasi, bukan foto mahasiswa.',
  ],
};

// Ilustrasi abstrak sebagai pengganti foto (tidak memakai foto orang sungguhan).
const FOTO = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="#dbeafe"/><circle cx="48" cy="38" r="17" fill="#1e3a8a"/><path d="M14 96c4-20 18-30 34-30s30 10 34 30z" fill="#2563eb"/></svg>')}`;
const pengguna = { foto: FOTO, nama: 'Nurul Fadilah', keterangan: <span>S1 Informatika · Angkatan 2023</span> };

export function Wizard() {
  const [k, setK] = useState(0);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <WizardKelengkapan
        key={k}
        pengguna={pengguna}
        onLewati={() => undefined}
        kontakPetugas={
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <Mail size={14} /> baak@unipo.ac.id
          </span>
        }
      />
      <Button
        variant="link"
        size="sm"
        style={{ justifySelf: 'start' }}
        onClick={() => {
          resetKelengkapan();
          setK((x) => x + 1);
        }}
      >
        Ulangi contoh
      </Button>
    </div>
  );
}

export function Pengingat() {
  return <PengingatKelengkapan pengguna={pengguna} href="#kelengkapan" />;
}

const LENGKAP: KelengkapanSaya = {
  entitas: 'dosen',
  kunci: '0912058801',
  nama: 'Rahmat Hidayat, M.Kom',
  kode_prodi: '55201',
  lengkap: true,
  perlu_wizard: false,
  persen_wajib: 100,
  kurang: [],
  isian_sendiri: [],
};
export function Lengkap() {
  return <KartuProfilKelengkapan data={LENGKAP} pengguna={{ keterangan: 'Dosen tetap · Informatika' }} />;
}
