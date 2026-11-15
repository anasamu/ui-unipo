import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button, Field, Pilihan } from 'unipo-ui';
import {
  DaftarAturan,
  FormAturan,
  HasilPeriksaAturanPanel,
  KelolaAturan,
  PanelDetailAturan,
  PenyusunKondisi,
  PengaturAturan,
  PilihEntitas,
  SyaratSaya,
  ringkasKondisi,
  useDaftarAturan,
  useKatalogAturan,
  usePeriksaAturan,
  type GrupKondisi,
} from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Aturan akademik dinamis',
  category: 'Per kegunaan',
  layout: 'wide',
  order: 3,
  badge: 'baru',
  description:
    'Antarmuka untuk /v1/aturan: syarat, batas waktu, dan batas nilai yang bisa ditambah, diubah, dan dihapus oleh bagian yang berwenang tanpa mengubah kode. Penyusun kondisi visual membaca indikator per titik penerapan dari katalog, operator mengikuti tipe indikator, dan nilai dipilih dari data (status, angkatan, mata kuliah). Aturan baru berstatus draf, wajib ber-SK sebelum aktif, bisa diuji ke mahasiswa contoh, diberi dispensasi, dan tercatat di riwayat. Mahasiswa melihat daftar syaratnya sendiri sebelum mencoba KRS, KKN, yudisium, atau wisuda.',
  importLine:
    "import { KelolaAturan, FormAturan, PenyusunKondisi, DaftarAturan, PanelDetailAturan, SyaratSaya, HasilPeriksaAturanPanel, PengaturAturan, hasilDariGalatAturan } from 'unipo-ui/siakad';",
  demos: {
    Modul: 'KelolaAturan: ringkasan, daftar, tambah/ubah, detail (SK, dispensasi, uji, riwayat), sampah, pengatur',
    Penyusun: 'PenyusunKondisi: kelompok “semua”/“salah satu” bersarang, indikator per titik, nilai sesuai tipe',
    Formulir: 'FormAturan: titik, jenis, ketentuan, cakupan, masa berlaku, mode',
    Detail: 'PanelDetailAturan: aktifkan dengan SK wajib, tulis-tembus ke menu batas waktu lama',
    Syarat: 'SyaratSaya: daftar periksa mahasiswa untuk satu titik (KRS, KKN, wisuda)',
    Periksa: 'usePeriksaAturan + HasilPeriksaAturanPanel: periksa mahasiswa mana pun (petugas)',
    Daftar: 'DaftarAturan untuk satu titik, mis. di halaman pengaturan KRS',
    Pengatur: 'PengaturAturan: peran/izin yang berhak mengatur per kategori dan titik',
  },
  props: [
    ['KelolaAturan.kategori', "'akademik' | 'kelulusan' | 'keuangan' | 'kemahasiswaan' | 'umum'", 'Batasi modul ke satu kategori, mis. halaman Biro Keuangan.'],
    ['KelolaAturan.titik', 'string', 'Batasi ke satu titik penerapan, mis. krs.ambil.'],
    ['FormAturan.aturan', 'Aturan | null', 'Kosong = tambah (draf). Isi = ubah; versi naik dan catatan masuk riwayat.'],
    ['PenyusunKondisi.titik', 'string', 'Menentukan indikator yang tersedia (GET /v1/aturan/katalog).'],
    ['PenyusunKondisi.opsional', 'boolean', 'Boleh kosong, untuk “berlaku bila” di batas waktu/nilai.'],
    ['SyaratSaya.titik', 'string', 'NIM diambil dari akun yang masuk; konteks (mis. sks_diambil) boleh dikirim.'],
    ['hasilDariGalatAturan(e)', '(galat) => HasilPeriksaAturan | null', 'Ubah galat 409 aturan_dilanggar dari endpoint mana pun menjadi hasil yang bisa ditampilkan.'],
  ],
  notes: [
    'Scope token: aturan:read untuk melihat dan memeriksa, aturan:write untuk pengatur, aturan:admin untuk sampah dan daftar pengatur.',
    'Siapa yang berhak mengatur dibaca dari GET /v1/aturan/saya; kategori dan prodi di luar wewenang dinonaktifkan di formulir.',
    'Aturan batas_waktu dengan periode dan cakupan prodi/fakultas ditulis-tembus ke menu batas waktu lama saat diaktifkan; hasilnya ditampilkan di panel detail dan riwayat.',
    'Galat 409 aturan_dilanggar dari KRS, kartu ujian, KKN, atau wisuda bisa langsung ditampilkan: <HasilPeriksaAturanPanel hasil={hasilDariGalatAturan(e)!} />.',
    'Data di halaman ini rekaan; mesin tiruan meniru cara backend menilai cakupan, kondisi, batas, dan dispensasi.',
  ],
};

export function Modul() {
  return <KelolaAturan />;
}

export function Penyusun() {
  const katalog = useKatalogAturan();
  const [titik, setTitik] = React.useState('kkn.daftar');
  const [k, setK] = React.useState<GrupKondisi | null>({
    semua: [
      { indikator: 'sks_lulus', op: '>=', nilai: 100 },
      {
        salah_satu: [
          { indikator: 'tunggakan', op: '<=', nilai: 0 },
          { indikator: 'dispensasi_keuangan', op: 'benar' },
        ],
      },
    ],
  });
  return (
    <div style={{ display: 'grid', gap: '1rem', maxWidth: 820 }}>
      <Field label="Titik penerapan">
        <Pilihan
          tampilan="cari"
          options={(katalog.data?.titik ?? []).map((t) => ({ value: t.kode, label: t.judul }))}
          value={titik}
          onValueChange={(v) => {
            setTitik(v ?? 'kkn.daftar');
            setK(null);
          }}
        />
      </Field>
      <PenyusunKondisi titik={titik} value={k} onValueChange={setK} />
      <details>
        <summary style={{ cursor: 'pointer', fontSize: 14 }}>JSON yang dikirim</summary>
        <pre style={{ fontSize: 12, overflow: 'auto' }}>{JSON.stringify({ kondisi: k }, null, 2)}</pre>
      </details>
    </div>
  );
}

export function Formulir() {
  const d = useDaftarAturan({ titik: 'krs.ambil' });
  const contoh = d.data?.find((a) => a.jenis === 'batas_nilai');
  return (
    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
      <FormAturan
        titik="krs.ambil"
        trigger={
          <Button>
            <Plus /> Tambah aturan KRS
          </Button>
        }
      />
      {contoh && <FormAturan aturan={contoh} trigger={<Button variant="outline">Ubah “{contoh.nama}”</Button>} />}
    </div>
  );
}

export function Detail() {
  const d = useDaftarAturan({ status: 'draf' });
  const id = d.data?.[0]?.id;
  return <div style={{ maxWidth: 720 }}>{id && <PanelDetailAturan id={id} />}</div>;
}

export function Syarat() {
  return (
    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
      <SyaratSaya titik="krs.ambil" konteks={{ sks_diambil: 22 }} judul="Syarat KRS semester ini" />
      <SyaratSaya titik="kkn.daftar" />
    </div>
  );
}

export function Periksa() {
  const katalog = useKatalogAturan();
  const [nim, setNim] = React.useState<string | null>(null);
  const [titik, setTitik] = React.useState('krs.ambil');
  const h = usePeriksaAturan(nim ? { titik, nim, konteks: { sks_diambil: 24, presensi_persen: 70 } } : null);
  return (
    <div style={{ display: 'grid', gap: '1rem', maxWidth: 720 }}>
      <div style={{ display: 'grid', gap: '.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <Field label="Mahasiswa">
          <PilihEntitas jenis="mahasiswa" value={nim} onValueChange={setNim} />
        </Field>
        <Field label="Titik">
          <Pilihan
            tampilan="cari"
            options={(katalog.data?.titik ?? []).filter((t) => t.subjek === 'mahasiswa').map((t) => ({ value: t.kode, label: t.judul }))}
            value={titik}
            onValueChange={(v) => setTitik(v ?? 'krs.ambil')}
          />
        </Field>
      </div>
      {h.data && <HasilPeriksaAturanPanel hasil={h.data} />}
    </div>
  );
}

export function Daftar() {
  const katalog = useKatalogAturan();
  const d = useDaftarAturan({ titik: 'krs.ambil', status: 'aktif' });
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <DaftarAturan filter={{ titik: 'krs.ambil' }} saring={false} />
      <p style={{ margin: 0, fontSize: 14, color: 'var(--u-muted-foreground)' }}>
        Ringkasan teks:{' '}
        {(d.data ?? [])
          .filter((a) => a.kondisi)
          .map((a) => `${a.nama}: ${ringkasKondisi(a.kondisi, katalog.data)}`)
          .join(' · ') || '–'}
      </p>
    </div>
  );
}

export function Pengatur() {
  return <PengaturAturan />;
}
