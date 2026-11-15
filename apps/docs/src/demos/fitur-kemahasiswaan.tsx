import { Ilustrasi } from 'unipo-ui';
import { FiturGrup } from '../fitur/FiturGrup';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Kemahasiswaan',
  category: 'Referensi API',
  layout: 'full',
  order: 13,
  badge: 'baru',
  description:
    '1 modul (Kemahasiswaan) dengan 9 sumber data dan 92 operasi API SIAKAD. Tiap modul siap pakai: daftar dengan saringan dari parameter API, tambah/ubah dengan aturan validasi backend, detail dengan alur status, aksi yang hanya muncul bila status mengizinkan, lampiran, dan operasi laporan/sinkronisasi. Data di halaman ini dari server tiruan yang menjalankan aturan yang sama.',
  importLine: "import { HalamanModul, KelolaSumber } from 'unipo-ui/katalog';",
  demos: { Ilus: 'Ilustrasi grup', Modul: 'Semua modul Kemahasiswaan' },
  notes: [
    'Satu modul: <HalamanModul modul="kemahasiswaan" />. Satu sumber data saja: <KelolaSumber sumber="/v1/kemahasiswaan/beasiswa" />.',
  ],
};

export function Ilus() {
  return <Ilustrasi nama="kemahasiswaan" lebar={220} />;
}

export function Modul() {
  return <FiturGrup grup="kemahasiswaan" />;
}
