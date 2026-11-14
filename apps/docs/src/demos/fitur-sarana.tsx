import { Ilustrasi } from 'unipo-ui';
import { FiturGrup } from '../fitur/FiturGrup';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Sarana',
  category: 'Fitur API',
  layout: 'full',
  order: 17,
  badge: 'baru',
  description:
    '3 modul (Sarana Prasarana, Perpustakaan, Repositori) dengan 24 sumber data dan 133 operasi API SIAKAD. Tiap modul siap pakai: daftar dengan saringan dari parameter API, tambah/ubah dengan aturan validasi backend, detail dengan alur status, aksi yang hanya muncul bila status mengizinkan, lampiran, dan operasi laporan/sinkronisasi. Data di halaman ini dari server tiruan yang menjalankan aturan yang sama.',
  importLine: "import { HalamanModul, KelolaSumber } from 'unipo-ui/katalog';",
  demos: { Ilus: 'Ilustrasi grup', Modul: 'Semua modul Sarana' },
  notes: [
    'Satu modul: <HalamanModul modul="sarpras" />. Satu sumber data saja: <KelolaSumber sumber="/v1/sarpras/aset" />.',
  ],
};

export function Ilus() {
  return <Ilustrasi nama="sarana" lebar={220} />;
}

export function Modul() {
  return <FiturGrup grup="sarana" />;
}
