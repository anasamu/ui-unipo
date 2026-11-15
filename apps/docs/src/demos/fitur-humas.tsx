import { Ilustrasi } from 'unipo-ui';
import { FiturGrup } from '../fitur/FiturGrup';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Humas',
  category: 'Referensi API',
  layout: 'full',
  order: 18,
  badge: 'baru',
  description:
    '3 modul (Ruang Redaksi, Portal & Berita, CRM Calon Mahasiswa) dengan 51 sumber data dan 226 operasi API SIAKAD. Tiap modul siap pakai: daftar dengan saringan dari parameter API, tambah/ubah dengan aturan validasi backend, detail dengan alur status, aksi yang hanya muncul bila status mengizinkan, lampiran, dan operasi laporan/sinkronisasi. Data di halaman ini dari server tiruan yang menjalankan aturan yang sama.',
  importLine: "import { HalamanModul, KelolaSumber } from 'unipo-ui/katalog';",
  demos: { Ilus: 'Ilustrasi grup', Modul: 'Semua modul Humas' },
  notes: [
    'Satu modul: <HalamanModul modul="humas" />. Satu sumber data saja: <KelolaSumber sumber="/v1/humas/agenda/{id}/peserta" />.',
  ],
};

export function Ilus() {
  return <Ilustrasi nama="humas" lebar={220} />;
}

export function Modul() {
  return <FiturGrup grup="humas" />;
}
