import { Ilustrasi } from 'unipo-ui';
import { FiturGrup } from '../fitur/FiturGrup';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Akademik',
  category: 'Referensi API',
  layout: 'full',
  order: 12,
  badge: 'baru',
  description:
    '11 modul (Perkuliahan, Kurikulum OBE, Kalender Akademik, Admisi, PMB, LMS, Ujian CBT, EDOM, MBKM, RPL, Kelulusan & Wisuda) dengan 129 sumber data dan 727 operasi API SIAKAD. Tiap modul siap pakai: daftar dengan saringan dari parameter API, tambah/ubah dengan aturan validasi backend, detail dengan alur status, aksi yang hanya muncul bila status mengizinkan, lampiran, dan operasi laporan/sinkronisasi. Data di halaman ini dari server tiruan yang menjalankan aturan yang sama.',
  importLine: "import { HalamanModul, KelolaSumber } from 'unipo-ui/katalog';",
  demos: { Ilus: 'Ilustrasi grup', Modul: 'Semua modul Akademik' },
  notes: [
    'Satu modul: <HalamanModul modul="akademik" />. Satu sumber data saja: <KelolaSumber sumber="/v1/akademik/batas/{jenis}" />.',
  ],
};

export function Ilus() {
  return <Ilustrasi nama="akademik" lebar={220} />;
}

export function Modul() {
  return <FiturGrup grup="akademik" />;
}
