import * as React from 'react';
import { Button, Field } from 'unipo-ui';
import { PilihBerkas, UnggahBerkas, type BerkasTerunggah } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Unggah & pilih berkas',
  category: 'Tanggal & berkas',
  layout: 'narrow',
  order: 60,
  badge: 'baru',
  description:
    'Komponen berkas yang sudah terhubung ke API berkas terpusat SIAKAD (/v1/berkas). File besar otomatis diunggah bertahap per potongan, jadi aman untuk hosting dengan batas unggah kecil. Nilainya berkas_id yang diterima endpoint arsip, SPMI, SDM, LPPM, LMS, portal, tracer, dan pusat data.',
  importLine: "import { PilihBerkas, UnggahBerkas } from 'unipo-ui/siakad';",
  demos: {
    Pilih: 'PilihBerkas: unggah atau pilih dari "Berkas saya" (cari)',
    Formulir: 'Di dalam formulir: kirim berkas_id ke endpoint modul',
    Banyak: 'UnggahBerkas: banyak berkas dengan progres',
  },
  props: [
    ['PilihBerkas.value', 'string | null', 'UUID berkas /v1/berkas (berkas_id).'],
    ['PilihBerkas.onValueChange', '(id, berkas?) => void', 'Dipanggil setelah unggah selesai, berkas dipilih, atau dibuang.'],
    ['PilihBerkas.accept', 'string', 'Mis. ".pdf,.jpg". Ikut menyaring daftar "Berkas saya".'],
    ['kategori, modul, folder, visibilitas', 'string', 'Atribut berkas saat diunggah (lihat POST /v1/berkas).'],
    ['tanpaBerkasSaya', 'boolean', 'Hanya unggah, tanpa memilih berkas lama.'],
  ],
  notes: [
    'Formulir otomatis di unipo-ui/katalog memakai PilihBerkas untuk setiap endpoint yang menerima berkas_id, dan tab Lampiran mengunggah lewat /v1/berkas lalu mengirim berkas_id. Isian file mentah, base64, dan nama file tidak ditampilkan lagi.',
    'Token butuh scope berkas:read dan berkas:write.',
  ],
};

export function Pilih() {
  const [id, setId] = React.useState<string | null>(null);
  return (
    <Field label="Dokumen pendukung" description={id ? `berkas_id: ${id}` : 'Seret berkas, unggah, atau cari di berkas yang sudah ada.'}>
      <PilihBerkas value={id} onValueChange={setId} kategori="dokumen" accept=".pdf,.docx,.jpg,.png" />
    </Field>
  );
}

export function Formulir() {
  const [id, setId] = React.useState<string | null>(null);
  const [kirim, setKirim] = React.useState<string | null>(null);
  return (
    <form
      style={{ display: 'grid', gap: '1rem' }}
      onSubmit={(e) => {
        e.preventDefault();
        // await siakad.request({ method: 'POST', path: `/v1/arsip/dokumen/${dokumenId}/berkas`, body: { berkas_id: id } });
        setKirim(JSON.stringify({ berkas_id: id }));
      }}
    >
      <Field label="Lampiran surat" required>
        <PilihBerkas value={id} onValueChange={setId} kategori="dokumen" modul="arsip" accept=".pdf" />
      </Field>
      <Button type="submit" disabled={!id} style={{ justifySelf: 'start' }}>
        Simpan lampiran
      </Button>
      {kirim && <code style={{ fontSize: '.8125rem' }}>{kirim}</code>}
    </form>
  );
}

export function Banyak() {
  const [hasil, setHasil] = React.useState<BerkasTerunggah[]>([]);
  return (
    <div style={{ display: 'grid', gap: '.75rem' }}>
      <UnggahBerkas multiple kategori="lampiran" onSelesai={(b) => setHasil((x) => [...x, b])} />
      {hasil.length > 0 && <small>{hasil.length} berkas tersimpan di /v1/berkas.</small>}
    </div>
  );
}
