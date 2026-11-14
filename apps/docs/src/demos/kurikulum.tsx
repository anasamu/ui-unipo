import { useState } from 'react';
import { Panel, Tabs } from 'unipo-ui';
import {
  CapaianCplKurikulum,
  CapaianCplMahasiswa,
  CpmkMataKuliah,
  DaftarCpl,
  DaftarKurikulum,
  DaftarProfilLulusan,
  EkuivalensiKurikulum,
  MatriksKurikulum,
  PeninjauanKurikulum,
  RingkasanKurikulum,
  RpsMataKuliah,
  StatusMigrasiKurikulum,
  StrukturKurikulum,
  TabelStrukturKurikulum,
  ValidasiKurikulum,
  type NamaMatriks,
} from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Kurikulum OBE',
  category: 'Akademik',
  layout: 'full',
  order: 6,
  description:
    'Widget kurikulum OBE sesuai Permendiktisaintek 39/2025, langsung dari /v1/kurikulum-obe: daftar kurikulum, ringkasan dan alur status (draf → diajukan → disahkan → berlaku), validasi SN Dikti, profil lulusan, CPL per ranah, matriks pemetaan yang bisa diklik, struktur MK per semester dengan batas SKS, CPMK dan sub-CPMK, RPS, capaian CPL prodi dan per mahasiswa, migrasi dari kurikulum lama, ekuivalensi MK, dan catatan peninjauan.',
  importLine: "import { DaftarKurikulum, RingkasanKurikulum, ValidasiKurikulum, MatriksKurikulum, StrukturKurikulum, RpsMataKuliah, CapaianCplMahasiswa } from 'unipo-ui/siakad';",
  demos: {
    Daftar: 'DaftarKurikulum',
    Ringkasan: 'RingkasanKurikulum dengan tombol alur status',
    Validasi: 'ValidasiKurikulum',
    Capaian: 'DaftarProfilLulusan dan DaftarCpl',
    Matriks: 'MatriksKurikulum (klik sel untuk memetakan)',
    Struktur: 'StrukturKurikulum per semester',
    StrukturTabel: 'TabelStrukturKurikulum: detail MK dibuka di baris',
    StrukturPopup: 'TabelStrukturKurikulum: detail MK di panel samping',
    Cpmk: 'CpmkMataKuliah',
    Rps: 'RpsMataKuliah',
    CapaianProdi: 'CapaianCplKurikulum per angkatan',
    CapaianMahasiswa: 'CapaianCplMahasiswa',
    Migrasi: 'StatusMigrasiKurikulum',
    Ekuivalensi: 'EkuivalensiKurikulum dan PeninjauanKurikulum',
  },
  props: [
    ['kurikulumId', 'number', 'ID kurikulum OBE. Semua widget satu kurikulum berbagi data yang sama (satu panggilan per endpoint).'],
    ['MatriksKurikulum.jenis', "'profil-cpl' | 'cpl-bk' | 'cpl-mk' | 'bk-mk'", 'Matriks yang ditampilkan. Bawaan cpl-mk.'],
    ['MatriksKurikulum.editable', 'boolean', 'Klik sel menyimpan langsung lewat PUT /matriks/{nama}. Butuh scope kurikulum:write dan kurikulum berstatus draf/diajukan.'],
    ['RingkasanKurikulum.bolehUbahStatus', 'boolean', 'Tampilkan tombol transisi status dari `transisi_status` API.'],
    ['TabelStrukturKurikulum.detail', "'baris' | 'popup' | 'keduanya'", 'Cara membuka detail MK (CPMK, sub-CPMK, CPL, prasyarat). Bawaan baris.'],
    ['TabelStrukturKurikulum.semesterTerbuka', 'number[]', 'Semester yang terbuka di awal; sisanya terlipat. Bawaan semua terbuka.'],
    ['StrukturKurikulum.onPilihMk', '(mk) => void', 'Klik kartu MK, mis. membuka CpmkMataKuliah di Sheet.'],
    ['CapaianCplKurikulum.angkatan', 'number', 'Tahun masuk. Bawaan semua angkatan pengguna kurikulum.'],
    ['CapaianCplMahasiswa.nim', 'string', 'Untuk profil mahasiswa, dosen PA, atau lampiran SKPI.'],
  ],
  notes: [
    'Butuh scope kurikulum:read; pengubahan (status, matriks) butuh kurikulum:write. Prodi hanya melihat kurikulumnya sendiri.',
    'Batas SKS per semester mengikuti Pasal 17–18 (20 SKS untuk semester 1–2, 24 sesudahnya). Kolom semester yang melebihi batas ditandai merah.',
  ],
};

export function Daftar() {
  return <DaftarKurikulum href={(k) => `#kurikulum-${k.id}`} />;
}
export function Ringkasan() {
  return <RingkasanKurikulum kurikulumId={12} bolehUbahStatus />;
}
export function Validasi() {
  return <ValidasiKurikulum kurikulumId={12} />;
}
export function Capaian() {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <DaftarProfilLulusan kurikulumId={12} />
      <DaftarCpl kurikulumId={12} />
    </div>
  );
}
export function Matriks() {
  const [jenis, setJenis] = useState<NamaMatriks>('cpl-mk');
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Tabs
        variant="pill"
        value={jenis}
        onValueChange={setJenis}
        items={[
          { value: 'cpl-mk', label: 'CPL × MK' },
          { value: 'profil-cpl', label: 'Profil × CPL' },
          { value: 'cpl-bk', label: 'CPL × bahan kajian' },
          { value: 'bk-mk', label: 'Bahan kajian × MK' },
        ]}
      />
      <MatriksKurikulum kurikulumId={12} jenis={jenis} editable />
    </div>
  );
}
export function Struktur() {
  return <StrukturKurikulum kurikulumId={12} onPilihMk={() => undefined} />;
}
export function StrukturTabel() {
  return <TabelStrukturKurikulum kurikulumId={12} semesterTerbuka={[2, 3]} mkTerbuka={[1013]} />;
}
export function StrukturPopup() {
  return <TabelStrukturKurikulum kurikulumId={12} detail="keduanya" semesterTerbuka={[4]} />;
}
export function Cpmk() {
  return <CpmkMataKuliah mkId={1013} />;
}
export function Rps() {
  return <RpsMataKuliah rpsId={501} />;
}
export function CapaianProdi() {
  return (
    <Panel title="Capaian CPL angkatan 2022" description="Rata-rata skor dan persen mahasiswa yang mencapai target">
      <CapaianCplKurikulum kurikulumId={12} angkatan={2022} />
    </Panel>
  );
}
export function CapaianMahasiswa() {
  return <CapaianCplMahasiswa nim="2023550101" />;
}
export function Migrasi() {
  return <StatusMigrasiKurikulum />;
}
export function Ekuivalensi() {
  return (
    <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
      <EkuivalensiKurikulum kurikulumId={12} />
      <Panel title="Peninjauan kurikulum">
        <PeninjauanKurikulum kurikulumId={12} />
      </Panel>
    </div>
  );
}
