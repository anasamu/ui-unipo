import { Ilustrasi } from 'unipo-ui';
import { FiturGrup } from '../fitur/FiturGrup';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Kelembagaan',
  category: 'Fitur API',
  layout: 'full',
  order: 15,
  badge: 'baru',
  description:
    '7 modul (Fakultas, Kepegawaian, Keuangan, LPPM, SPMI, IKU, Kerja Sama) dengan 163 sumber data dan 874 operasi API SIAKAD. Tiap modul siap pakai: daftar dengan saringan dari parameter API, tambah/ubah dengan aturan validasi backend, detail dengan alur status, aksi yang hanya muncul bila status mengizinkan, lampiran, dan operasi laporan/sinkronisasi. Data di halaman ini dari server tiruan yang menjalankan aturan yang sama.',
  importLine: "import { HalamanModul, KelolaSumber } from 'unipo-ui/katalog';",
  demos: { Ilus: 'Ilustrasi grup', Modul: 'Semua modul Kelembagaan' },
  notes: [
    'Satu modul: <HalamanModul modul="fakultas" />. Satu sumber data saja: <KelolaSumber sumber="/v1/fakultas" />.',
  ],
};

export function Ilus() {
  return <Ilustrasi nama="kelembagaan" lebar={220} />;
}

export function Modul() {
  return <FiturGrup grup="kelembagaan" />;
}
