import { Ilustrasi } from 'unipo-ui';
import { FiturGrup } from '../fitur/FiturGrup';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Referensi',
  category: 'Referensi API',
  layout: 'full',
  order: 11,
  badge: 'baru',
  description:
    '3 modul (Referensi Akademik, Data Master, Organisasi & Pejabat) dengan 29 sumber data dan 84 operasi API SIAKAD. Tiap modul siap pakai: daftar dengan saringan dari parameter API, tambah/ubah dengan aturan validasi backend, detail dengan alur status, aksi yang hanya muncul bila status mengizinkan, lampiran, dan operasi laporan/sinkronisasi. Data di halaman ini dari server tiruan yang menjalankan aturan yang sama.',
  importLine: "import { HalamanModul, KelolaSumber } from 'unipo-ui/katalog';",
  demos: { Ilus: 'Ilustrasi grup', Modul: 'Semua modul Referensi' },
  notes: [
    'Satu modul: <HalamanModul modul="referensi" />. Satu sumber data saja: <KelolaSumber sumber="/v1/kelengkapan" />.',
  ],
};

export function Ilus() {
  return <Ilustrasi nama="referensi" lebar={220} />;
}

export function Modul() {
  return <FiturGrup grup="referensi" />;
}
