import { Ilustrasi } from 'unipo-ui';
import { FiturGrup } from '../fitur/FiturGrup';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Sistem & Akses',
  category: 'Fitur API',
  layout: 'full',
  order: 10,
  badge: 'baru',
  description:
    '7 modul (Aplikasi & Hak Akses, Portal Pengembang API, Profil Pengguna, Notifikasi, Integrasi Pihak Ketiga, PDDikti, Dasbor & Peringatan Dini) dengan 55 sumber data dan 296 operasi API SIAKAD. Tiap modul siap pakai: daftar dengan saringan dari parameter API, tambah/ubah dengan aturan validasi backend, detail dengan alur status, aksi yang hanya muncul bila status mengizinkan, lampiran, dan operasi laporan/sinkronisasi. Data di halaman ini dari server tiruan yang menjalankan aturan yang sama.',
  importLine: "import { HalamanModul, KelolaSumber } from 'unipo-ui/katalog';",
  demos: { Ilus: 'Ilustrasi grup', Modul: 'Semua modul Sistem & Akses' },
  notes: [
    'Satu modul: <HalamanModul modul="akses" />. Satu sumber data saja: <KelolaSumber sumber="/v1/rbac/akses-live" />.',
  ],
};

export function Ilus() {
  return <Ilustrasi nama="sistem" lebar={220} />;
}

export function Modul() {
  return <FiturGrup grup="sistem" />;
}
