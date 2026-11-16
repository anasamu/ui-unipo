import * as React from 'react';
import { Card, CardContent, Field } from 'unipo-ui';
import { DaftarProdi, LabelProdi, LencanaAkreditasi, LogoFakultas, PilihEntitas, akreditasiProdi, judulProdi, type ProdiReferensi } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';
import { FAKULTAS, PRODI } from '../mock/siakad';

export const meta: DemoMeta = {
  title: 'Program studi (logo fakultas & akreditasi)',
  category: 'Terhubung SDK',
  layout: 'wide',
  order: 4,
  badge: 'baru',
  description:
    'Semua tampilan program studi memakai format yang sama: logo fakultas, jenjang (S1, D3) di depan nama, dan lencana akreditasi dengan masa berlakunya. Masa berlaku yang habis atau tinggal kurang dari 6 bulan diberi tanda. Datanya dari /v1/referensi/prodi dan /v1/referensi/fakultas lewat SDK, di-cache bersama, jadi cukup isi kode prodi.',
  importLine: "import { DaftarProdi, LabelProdi, LencanaAkreditasi, LogoFakultas } from 'unipo-ui/siakad';",
  demos: {
    Daftar: 'Daftar per fakultas dengan pencarian',
    Kartu: 'Kisi kartu',
    Pilih: 'Pilihan prodi di formulir (PilihEntitas)',
    Label: 'Label prodi di tabel, kartu, dan profil',
    Lencana: 'Lencana akreditasi dan logo fakultas',
  },
  props: [
    ['DaftarProdi varian', "'daftar' | 'kartu' | 'ringkas'", 'Daftar dikelompokkan per fakultas, kisi kartu, atau baris rapat.'],
    ['DaftarProdi kodeFakultas', 'string', 'Hanya prodi satu fakultas (dasbor fakultas).'],
    ['DaftarProdi onPilih / href / aktif', 'fungsi / string', 'Baris jadi tombol atau tautan; `aktif` menandai prodi terpilih.'],
    ['LabelProdi kode', 'string', 'Kode prodi; jenjang, fakultas, logo, dan akreditasi dilengkapi otomatis (gagal = tetap tampil nama).'],
    ['LabelProdi sub', "'fakultas' | 'kode' | ReactNode | false", 'Baris kedua di bawah nama.'],
    ['LencanaAkreditasi prodi', '{ kode_akreditasi, tgl_akhir_sk_ban, no_sk_ban }', 'A/B/C atau Unggul/Baik Sekali/Baik; tooltip berisi masa berlaku dan nomor SK.'],
    ['LogoFakultas kode / logo', 'string', 'Logo dari images/fakultas/ SIAKAD; bila kosong atau gagal dimuat tampil monogram berwarna (FT, FIK).'],
  ],
  notes: [
    'Logo fakultas diunggah lewat menu Master Fakultas di SIAKAD (folder images/fakultas/). Alamat SIAKAD bawaan https://siakad.unipo.ac.id; ubah sekali dengan aturAsalBerkasSiakad(url) bila berbeda.',
    'Helper tanpa tampilan: jenjangProdi("C") → "S1", judulProdi(p) → "S1 Teknik Sipil", akreditasiProdi(p) → { peringkat, label, tone, keadaan, sisaHari }, statusProdi(kode) untuk prodi nonaktif/pembinaan.',
    'Komponen lain sudah memakainya: PilihEntitas jenis prodi/fakultas, PilihProdi, saringan prodi, TabelMahasiswa, TabelDosen, TabelMataKuliah, profil mahasiswa/dosen, dasbor per prodi, transparansi biaya, PMB, tugas akhir.',
  ],
};

export function Daftar() {
  const [aktif, setAktif] = React.useState<string | null>('22201');
  return <DaftarProdi aktif={aktif} onPilih={(p) => setAktif(p.kode_prodi)} semuaStatus />;
}

export function Kartu() {
  return <DaftarProdi varian="kartu" cari={false} href={(p) => `#prodi-${p.kode_prodi}`} />;
}

export function Pilih() {
  const [kode, setKode] = React.useState<string | null>('22201');
  const [fak, setFak] = React.useState<string | null>(null);
  return (
    <div style={{ display: 'grid', gap: '1rem', maxWidth: '32rem' }}>
      <Field label="Program studi" description={kode ? `Nilai terkirim: ${kode}` : undefined}>
        <PilihEntitas jenis="prodi" value={kode} onValueChange={(k) => setKode(k as string | null)} />
      </Field>
      <Field label="Fakultas">
        <PilihEntitas jenis="fakultas" value={fak} onValueChange={(k) => setFak(k as string | null)} />
      </Field>
    </div>
  );
}

export function Label() {
  return (
    <Card>
      <CardContent style={{ display: 'grid', gap: '0.875rem' }}>
        <LabelProdi kode="22201" />
        <LabelProdi kode="55201" sub="kode" />
        <LabelProdi kode="61401" ukuran="md" />
        <LabelProdi kode="86206" sub={false} />
        <LabelProdi nama="Prodi di luar referensi" sub={false} />
      </CardContent>
    </Card>
  );
}

export function Lencana() {
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        {FAKULTAS.map((f) => (
          <LogoFakultas key={f.kode_fakultas} kode={f.kode_fakultas} nama={f.nama_fakultas} logo={f.logo} ukuran="lg" />
        ))}
      </div>
      <div className="u-table-wrap">
        <table className="u-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Prodi</th>
              <th>Lencana</th>
              <th>Keadaan</th>
            </tr>
          </thead>
          <tbody>
            {(PRODI as unknown as ProdiReferensi[]).map((p) => (
              <tr key={p.kode_prodi}>
                <td>{judulProdi(p)}</td>
                <td>
                  <LencanaAkreditasi prodi={p} />
                </td>
                <td>{akreditasiProdi(p).keadaan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
