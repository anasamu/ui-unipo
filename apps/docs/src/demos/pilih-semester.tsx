import * as React from 'react';
import { Card, CardContent, Field } from 'unipo-ui';
import { PilihSemester } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Pilih semester sesuai periode',
  category: 'Terhubung SDK',
  layout: 'narrow',
  order: 6,
  badge: 'baru',
  description:
    'Pemilih semester sasaran (mis. tahapan Kalender & periode) yang mengikuti periode: ganjil hanya semester 1, 3, 5, …, genap 2, 4, 6, …, pendek/khusus semua. Angka kecil di tiap pilihan = angkatan mahasiswa yang berada di semester itu pada periode tersebut. Nilai lama yang tidak cocok tetap tampil berperingatan.',
  importLine: "import { PilihSemester, jenisPeriodeDari, semesterUntukPeriode, angkatanSemester } from 'unipo-ui/siakad';",
  demos: { Ganjil: 'Periode 20261 (ganjil) dengan Maba', Genap: 'Periode 20262 (genap), jenjang S2', TidakCocok: 'Nilai lama tidak cocok periode' },
  props: [
    ['periode', 'string (tahun_id)', 'Menentukan jenis periode dan label angkatan, mis. "20261".'],
    ['jenisPeriode', "'ganjil' | 'genap' | 'pendek' | 'khusus'", 'Bila tahun_id tidak tersedia.'],
    ['jenjang / maks', 'string / number', 'Batas semester: D3 10, S1 14, S2 8, …; maks menimpa.'],
    ['mode', "'banyak' | 'tunggal'", 'Bawaan banyak.'],
    ['value / onValueChange', 'number[]', 'Semester terpilih.'],
    ['maba / onMabaChange', 'boolean', 'Pilihan "Maba (semester 1)" terpisah di periode ganjil.'],
  ],
  notes: ['SIAKAD menolak sasaran semester yang tidak cocok dengan jenis periode (422) pada tahapan Kalender & periode.'],
};

export function Ganjil() {
  const [v, setV] = React.useState<number[]>([3, 5, 7]);
  const [maba, setMaba] = React.useState(false);
  return (
    <Card>
      <CardContent>
        <Field label="Sasaran mahasiswa">
          <PilihSemester periode="20261" value={v} onValueChange={setV} maba={maba} onMabaChange={setMaba} />
        </Field>
      </CardContent>
    </Card>
  );
}

export function Genap() {
  const [v, setV] = React.useState<number[]>([2]);
  return (
    <Card>
      <CardContent>
        <Field label="Sasaran mahasiswa (S2)">
          <PilihSemester periode="20262" jenjang="S2" value={v} onValueChange={setV} />
        </Field>
      </CardContent>
    </Card>
  );
}

export function TidakCocok() {
  const [v, setV] = React.useState<number[]>([3, 4]);
  return (
    <Card>
      <CardContent>
        <Field label="Sasaran mahasiswa (data lama)">
          <PilihSemester periode="20262" value={v} onValueChange={setV} />
        </Field>
      </CardContent>
    </Card>
  );
}
