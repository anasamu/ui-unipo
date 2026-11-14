import { Ilustrasi } from 'unipo-ui';
import { FiturGrup } from '../fitur/FiturGrup';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Alumni',
  category: 'Fitur API',
  layout: 'full',
  order: 14,
  badge: 'baru',
  description:
    '2 modul (Tracer Study, Pusat Karier) dengan 27 sumber data dan 169 operasi API SIAKAD. Tiap modul siap pakai: daftar dengan saringan dari parameter API, tambah/ubah dengan aturan validasi backend, detail dengan alur status, aksi yang hanya muncul bila status mengizinkan, lampiran, dan operasi laporan/sinkronisasi. Data di halaman ini dari server tiruan yang menjalankan aturan yang sama.',
  importLine: "import { HalamanModul, KelolaSumber } from 'unipo-ui/katalog';",
  demos: { Ilus: 'Ilustrasi grup', Modul: 'Semua modul Alumni' },
  notes: [
    'Satu modul: <HalamanModul modul="tracer" />. Satu sumber data saja: <KelolaSumber sumber="/v1/tracer/alumni" />.',
  ],
};

export function Ilus() {
  return <Ilustrasi nama="alumni" lebar={220} />;
}

export function Modul() {
  return <FiturGrup grup="alumni" />;
}
