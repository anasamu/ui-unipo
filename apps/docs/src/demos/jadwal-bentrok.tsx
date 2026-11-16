import * as React from 'react';
import { Button, Card, CardContent, Field, Input, Select } from 'unipo-ui';
import { HasilCekJadwal, PanelBentrokJadwal, PenyusunJadwalOtomatis, useCekJadwal, type DrafJadwal } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Cek bentrok & jadwal otomatis',
  category: 'Per kegunaan',
  layout: 'wide',
  order: 5,
  badge: 'baru',
  description:
    'Untuk halaman atur jadwal kuliah (dasbor fakultas, BAAK). Jadwal prodi diperiksa terhadap jadwal semua prodi: ruang, dosen (termasuk tim), rombongan kelas, dan mahasiswa yang KRS-nya memuat dua jadwal beririsan. Kampus 1 dan 2 ikut diperhitungkan: dosen atau rombongan yang pindah kampus tanpa jeda cukup, dan kelas yang memakai ruang di kampus lain, diberi peringatan. Penyusun otomatis membuat pratinjau hari, jam, dan ruang tanpa bentrok; data baru tersimpan setelah pengguna menekan Simpan.',
  importLine: "import { PanelBentrokJadwal, PenyusunJadwalOtomatis, HasilCekJadwal, useCekJadwal } from 'unipo-ui/siakad';",
  demos: {
    Bentrok: 'PanelBentrokJadwal: bentrok + peringatan kampus, per hari',
    Otomatis: 'PenyusunJadwalOtomatis: atur, pratinjau, simpan',
    Cek: 'useCekJadwal + HasilCekJadwal: cek langsung di formulir (coba Senin + ruang 053)',
  },
  props: [
    ['sumber', '{ fakultas?, prodi?, tahunId? }', 'fakultas diisi = /v1/fakultas/{kode}/jadwal/...; kosong = /v1/akademik/jadwal/...'],
    ['jedaKampus', 'number', 'Menit minimal pindah kampus 1 dan 2. Bawaan 30, 0 = tidak diperiksa.'],
    ['onPilihJadwal', '(sesi) => void', 'PanelBentrokJadwal: klik jadwal milik prodi, mis. buka formulir ubah.'],
    ['onPerbaiki', '() => void', 'PanelBentrokJadwal: tombol "Perbaiki otomatis".'],
    ['periode / kelas', 'Array<{ value, label }>', 'PenyusunJadwalOtomatis: periode sumber dan kelas prodi (dari jadwal/referensi).'],
    ['awal', 'Partial<OpsiJadwalOtomatis>', 'PenyusunJadwalOtomatis: mis. { sumber: "bentrok" }.'],
  ],
  notes: [
    'Scope akademik:read untuk cek dan pratinjau, akademik:write untuk simpan (atau fakultas:read/write dengan izin fakultas.jadwal.kelola).',
    'Jam dihitung dari jam mulai-selesai m_jam tiap prodi, jadi bentrok antarprodi terbaca walau nomor jamnya berbeda.',
    'Simpan memeriksa ulang usulan terhadap jadwal terbaru lalu menyimpan lewat validasi jadwal SIAKAD yang sama dengan halaman web.',
  ],
};

const SUMBER = { prodi: '55201', tahunId: '20261' };

export function Bentrok() {
  const [buka, setBuka] = React.useState(false);
  return (
    <Card>
      <CardContent>
        {buka ? (
          <PenyusunJadwalOtomatis sumber={SUMBER} awal={{ sumber: 'bentrok' }} onBatal={() => setBuka(false)} />
        ) : (
          <PanelBentrokJadwal sumber={SUMBER} onPerbaiki={() => setBuka(true)} />
        )}
      </CardContent>
    </Card>
  );
}

export function Otomatis() {
  return (
    <Card>
      <CardContent>
        <PenyusunJadwalOtomatis
          sumber={SUMBER}
          periode={[
            { value: '20251', label: '2025/2026 Ganjil' },
            { value: '20252', label: '2025/2026 Genap' },
          ]}
          kelas={[
            { value: '01', label: '01 Reguler pagi', description: 'Kampus 1' },
            { value: '02', label: '02 Reguler sore', description: 'Kampus 1' },
            { value: '06', label: '06 Pagi/sore', description: 'Kampus 2' },
          ]}
        />
      </CardContent>
    </Card>
  );
}

export function Cek() {
  const [d, setD] = React.useState<DrafJadwal>({ kode_mk: '3PNT125', kelas: '06', hari: '1', jamke: '20', ruang: '053', nidn: '0902' });
  const cek = useCekJadwal(SUMBER, d);
  return (
    <Card>
      <CardContent style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))' }}>
          <Field label="Hari">
            <Select value={d.hari} onValueChange={(v) => setD({ ...d, hari: String(v) })} options={[{ value: '1', label: 'Senin' }, { value: '2', label: 'Selasa' }]} />
          </Field>
          <Field label="Ruang">
            <Input value={d.ruang} onChange={(e) => setD({ ...d, ruang: e.target.value })} />
          </Field>
        </div>
        <HasilCekJadwal {...cek} />
        <div>
          <Button variant="outline" size="sm" onClick={() => setD({ ...d, ruang: '052' })}>
            Pakai ruang 052
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
