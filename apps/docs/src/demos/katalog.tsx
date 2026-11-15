import * as React from 'react';
import { Button } from 'unipo-ui';
import { DaftarModul, HalamanModul, PencarianFitur, INDEKS_KATALOG } from 'unipo-ui/katalog';
import type { DemoMeta } from '../registry';

const jumlahOp = INDEKS_KATALOG.modul.reduce((n, m) => n + m.jumlahOperasi, 0);

export const meta: DemoMeta = {
  title: 'Katalog fitur API',
  category: 'Fitur API',
  layout: 'full',
  order: 1,
  badge: 'baru',
  description: `unipo-ui/katalog dibuat dari dokumen OpenAPI API SIAKAD (sumber yang sama dengan unipo-siakad-sdk): ${INDEKS_KATALOG.grup.length} grup, ${INDEKS_KATALOG.modul.length} modul, ${Object.keys(INDEKS_KATALOG.peta).length} sumber data, ${jumlahOp} operasi. Komponennya memakai aturan yang sama dengan backend: kolom wajib, panjang maksimal, pola kode, pilihan enum, rentang angka, format tanggal/email/URL, kunci data lain sebagai pilih-cari, alur status aksi, dan scope token.`,
  importLine: "import { DaftarModul, HalamanModul, KelolaSumber, PencarianFitur, KatalogProvider } from 'unipo-ui/katalog';",
  demos: { Semua: 'Semua modul per grup (klik untuk membuka)', Cari: 'Cari fitur (palet perintah)' },
  props: [
    ['<KatalogProvider scopes>', 'string[]', 'Scope token pengguna. Menu, tombol tambah/ubah/hapus, dan aksi yang butuh scope lain disembunyikan, sama seperti backend menolak dengan 403.'],
    ['<HalamanModul modul>', 'IdModul', 'Satu modul lengkap: sumber data per tag, operasi laporan/sinkronisasi.'],
    ['<KelolaSumber sumber>', 'IdSumber', 'Satu sumber data: daftar, tambah, detail, ubah, hapus, aksi, lampiran, data anak. Alias <Fitur>.'],
    ['<TabelSumber> <FormulirSumber> <DetailSumber> <AksiSumber> <TombolAksi> <LampiranSumber>', '', 'Bagian-bagian KelolaSumber untuk disusun sendiri.'],
    ['<FormulirSkema> useFormulirSkema()', '', 'Formulir dari skema mana pun, dengan validasi backend dan galat 422 per isian.'],
    ['<WizardSumber sumber>', 'IdSumber', 'Formulir tambah bertahap: isian dibagi per langkah, divalidasi tiap langkah, ditinjau, lalu dikirim.'],
    ['useMenuKatalog()', '', 'Grup menu Sidebar dari katalog sesuai scope.'],
  ],
  notes: [
    'Katalog dibuat ulang dengan `npm run katalog -w unipo-ui -- <openapi.json>` setiap kali API bertambah; aplikasi juga bisa memberi katalog sendiri lewat <KatalogProvider indeks muat>.',
    'Validasi di peramban mencegah kiriman yang pasti ditolak. Server tetap memeriksa ulang (NIM harus ada, nilai unik, hak pengelola) dan galat 422 dari server tampil di isian yang sama.',
  ],
};

export function Semua() {
  const [modul, setModul] = React.useState<string | null>(null);
  if (modul) return <HalamanModul modul={modul} onKembali={() => setModul(null)} />;
  return <DaftarModul onPilih={(m) => setModul(m.key)} />;
}

export function Cari() {
  const [pilih, setPilih] = React.useState<{ modul: string; sumber?: string; operasi?: string } | null>(null);
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <PencarianFitur onPilih={setPilih} />
      {pilih && (
        <>
          <Button variant="ghost" size="sm" onClick={() => setPilih(null)} style={{ justifySelf: 'start' }}>
            Tutup
          </Button>
          <HalamanModul key={JSON.stringify(pilih)} modul={pilih.modul} sumber={pilih.sumber ?? (pilih.operasi ? `op:${pilih.operasi}` : undefined)} />
        </>
      )}
    </div>
  );
}
