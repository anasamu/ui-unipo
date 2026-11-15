import { Ilustrasi } from 'unipo-ui';
import { FiturGrup } from '../fitur/FiturGrup';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Layanan',
  category: 'Referensi API',
  layout: 'full',
  order: 16,
  badge: 'baru',
  description:
    '3 modul (Layanan Administrasi, Arsip & Persuratan, Helpdesk) dengan 31 sumber data dan 178 operasi API SIAKAD. Tiap modul siap pakai: daftar dengan saringan dari parameter API, tambah/ubah dengan aturan validasi backend, detail dengan alur status, aksi yang hanya muncul bila status mengizinkan, lampiran, dan operasi laporan/sinkronisasi. Data di halaman ini dari server tiruan yang menjalankan aturan yang sama.',
  importLine: "import { HalamanModul, KelolaSumber } from 'unipo-ui/katalog';",
  demos: { Ilus: 'Ilustrasi grup', Modul: 'Semua modul Layanan' },
  notes: [
    'Satu modul: <HalamanModul modul="layanan" />. Satu sumber data saja: <KelolaSumber sumber="/v1/layanan/dokumen" />.',
  ],
};

export function Ilus() {
  return <Ilustrasi nama="layanan" lebar={220} />;
}

export function Modul() {
  return <FiturGrup grup="layanan" />;
}
