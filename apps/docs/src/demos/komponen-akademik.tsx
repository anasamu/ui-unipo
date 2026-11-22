import * as React from 'react';
import { FileCheck2 } from 'lucide-react';
import { Button, Panel } from 'unipo-ui';
import {
  JadwalMingguan,
  KuliahHariIni,
  LegendaSkalaNilai,
  LembarKhs,
  LembarTranskrip,
  LencanaNilai,
  PortalAkademikMahasiswa,
  PortalMengajarDosen,
  RingkasanKrs,
  TabelKrs,
  TahapanAkademik,
  UnggahBerkasAkademik,
  useJadwalDosen,
  useJadwalMahasiswa,
  useKhs,
  useKrsMahasiswa,
  useMahasiswa,
  usePredikatKelulusan,
  useSiakadQuery,
  useSkalaNilai,
  useTahapanPeriode,
  useTranskrip,
  type SyaratBerkasAkademik,
} from 'unipo-ui/siakad';
import { NIM_AKADEMIK } from '../mock/komponen-akademik';
import { DOSEN } from '../mock/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Komponen akademik bersama',
  category: 'Akademik',
  layout: 'wide',
  order: 2,
  badge: 'Baru',
  description:
    'Satu set komponen untuk KRS, KHS, transkrip, jadwal mingguan, tahapan kalender akademik, kartu ringkas portal mahasiswa/dosen, dan unggah berkas akademik. Semua menerima respons API SIAKAD /v1 apa adanya lewat props, sehingga Fakultas, BAAK, Dashboard/portal, dan aplikasi lain memakai tampilan yang sama. Warna nilai, legenda, dan predikat mengikuti skala nilai (m_nilai) dan predikat kelulusan (m_predikat) dari server; KHS dan transkrip punya versi cetak A4.',
  importLine:
    "import { TabelKrs, RingkasanKrs, LembarKhs, LembarTranskrip, JadwalMingguan, KuliahHariIni, TahapanAkademik, PortalAkademikMahasiswa, PortalMengajarDosen, UnggahBerkasAkademik, useSkalaNilai, usePredikatKelulusan, useJadwalMahasiswa, useTahapanPeriode } from 'unipo-ui/siakad';",
  demos: {
    Krs: 'TabelKrs + RingkasanKrs (batas SKS dari penawaran)',
    Khs: 'LembarKhs (pemilih periode, cetak)',
    Transkrip: 'LembarTranskrip (predikat m_predikat, cetak)',
    Jadwal: 'JadwalMingguan mahasiswa',
    JadwalDosen: 'JadwalMingguan dosen + KuliahHariIni',
    Tahapan: 'TahapanAkademik dari kalender terpadu',
    PortalMahasiswa: 'PortalAkademikMahasiswa',
    PortalDosen: 'PortalMengajarDosen',
    Unggah: 'UnggahBerkasAkademik',
    Skala: 'LencanaNilai + LegendaSkalaNilai',
  },
  props: [
    ['TabelKrs.krs', 'DataKrs', 'Respons GET /v1/mahasiswa/{nim}/krs.'],
    ['RingkasanKrs.batasSks', 'number', 'batas_sks dari GET /v1/mahasiswa/{nim}/krs/penawaran (sudah memperhitungkan aturan batas SKS ber-SK).'],
    ['LembarKhs.periode', 'PeriodeKhs[]', '`periode` dari GET /v1/mahasiswa/{nim}/khs; pemilih periode muncul bila lebih dari satu.'],
    ['LembarTranskrip.data', 'DataTranskrip', 'GET /v1/mahasiswa/{nim}/transkrip atau transkrip-sementara (predikat_sementara dipakai bila ada).'],
    ['*.skala', 'BarisSkalaNilai[] | SkalaNilai[]', 'useSkalaNilai({ prodi, tahunId }).skala; tanpa skala lencana netral, tanpa warna tebakan.'],
    ['LembarTranskrip.predikat', 'PredikatKelulusan[]', 'usePredikatKelulusan().data (m_predikat per jenjang).'],
    ['LembarTranskrip.sksLulus', 'number', 'SKS minimal lulus dari aturan kurikulum prodi; tanpa nilai ini bilah kemajuan disembunyikan.'],
    ['JadwalMingguan.jadwal', 'SesiKuliah[]', 'jadwal dari /v1/mahasiswa/{nim}/jadwal, /v1/dosen/{nidn}/jadwal, atau /v1/jadwal.'],
    ['JadwalMingguan.tampilan', "'otomatis' | 'minggu' | 'daftar'", 'Otomatis: kisi mingguan, berubah jadi kartu per hari di wadah sempit (container query).'],
    ['TahapanAkademik.tahapan', 'KegiatanTerpadu[]', 'useTahapanPeriode({ tahunId, kodeProdi }).data (kalender terpadu sumber tahun & batas).'],
    ['UnggahBerkasAkademik.onUnggah', '(syarat, berkas) => Promise', 'Kirim ke endpoint modul (mis. POST /v1/kelulusan/syarat-mahasiswa/{id}/berkas); galat tampil di baris itu.'],
    ['*.memuat / galat / onUlang', 'boolean / unknown / () => void', 'Keadaan standar: kerangka, GalatApi dengan kode laporan dan tombol coba lagi.'],
  ],
  notes: [
    'Komponen ini tidak mengambil data sendiri (kecuali batas unggah dari /v1/berkas/info): aplikasi memakai hook SDK yang sudah ada (useKrsMahasiswa, useKhs, useTranskrip, useJadwalDosen, useJadwalMahasiswa, useTahapanPeriode) dan meneruskan hasilnya.',
    'Cetak: tombol Cetak hanya mencetak dokumen itu (kop, identitas, tabel hitam-putih, IPK/predikat, tanggal cetak). Salinan cetak bukan dokumen resmi; dokumen resmi ber-QR tetap lewat TerbitkanDokumen (/v1/dokumen/khs, /v1/dokumen/transkrip).',
    'Tabel memakai DataTable: urut per kolom, ekspor CSV, kartu di layar sempit. Nilai diurut menurut bobot skala, bukan abjad.',
  ],
};

const kop = (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <FileCheck2 />
    <div>
      <b>UNIVERSITAS POHUWATO</b>
      <div style={{ fontSize: '9pt' }}>Fakultas Ilmu Komputer · Program Studi Informatika</div>
    </div>
  </div>
);

function useIdentitas(nim: string) {
  const m = useMahasiswa(nim).data;
  return m ? { nama: m.nama, nim: m.nim, prodi: m.nama_prodi, jenjang: 'S1', angkatan: m.tahun_masuk, dosenPa: m.nama_pa } : { nim };
}

export function Krs() {
  const krs = useKrsMahasiswa(NIM_AKADEMIK);
  const penawaran = useSiakadQuery<{ batas_sks?: number; ips_sebelumnya?: number }>(['krs-penawaran', NIM_AKADEMIK], (s, signal) => s.request({ method: 'GET', path: `/v1/mahasiswa/${NIM_AKADEMIK}/krs/penawaran` }, { signal }));
  return (
    <div className="demo-stack">
      <RingkasanKrs krs={krs.data} memuat={krs.loading} galat={krs.error} onUlang={krs.refetch} batasSks={penawaran.data?.batas_sks} ipsSebelumnya={penawaran.data?.ips_sebelumnya} />
      <TabelKrs
        krs={krs.data}
        memuat={krs.loading}
        galat={krs.error}
        onUlang={krs.refetch}
        aksi={
          <Button size="sm" variant="outline">
            Ubah KRS
          </Button>
        }
        aksiBaris={(m) => (m.disetujui ? [] : [{ label: 'Batalkan mata kuliah', destructive: true, onSelect: () => undefined }])}
      />
    </div>
  );
}

export function Khs() {
  const khs = useKhs(NIM_AKADEMIK);
  const { skala } = useSkalaNilai({ prodi: '55201' });
  return <LembarKhs periode={khs.data?.periode} memuat={khs.loading} galat={khs.error} onUlang={khs.refetch} skala={skala} identitas={useIdentitas(NIM_AKADEMIK)} kop={kop} />;
}

export function Transkrip() {
  const t = useTranskrip(NIM_AKADEMIK);
  const { skala } = useSkalaNilai({ prodi: '55201' });
  const predikat = usePredikatKelulusan();
  return <LembarTranskrip data={t.data} memuat={t.loading} galat={t.error} onUlang={t.refetch} skala={skala} predikat={predikat.data} jenjang="C" sksLulus={144} identitas={useIdentitas(NIM_AKADEMIK)} kop={kop} />;
}

export function Jadwal() {
  const j = useJadwalMahasiswa(NIM_AKADEMIK);
  return <JadwalMingguan jadwal={j.data?.jadwal} memuat={j.loading} galat={j.error} onUlang={j.refetch} onPilih={() => undefined} />;
}

export function JadwalDosen() {
  const nidn = DOSEN[2]!.nidn;
  const j = useJadwalDosen(nidn);
  return (
    <div className="demo-stack">
      <JadwalMingguan jadwal={j.data} memuat={j.loading} galat={j.error} onUlang={j.refetch} tanpaDosen judul="Jadwal mengajar" />
      <Panel title="Mengajar hari ini">
        <KuliahHariIni jadwal={j.data} memuat={j.loading} galat={j.error} tanpaDosen />
      </Panel>
    </div>
  );
}

export function Tahapan() {
  const t = useTahapanPeriode({ tahunId: '20261', kodeProdi: '55201' });
  return <TahapanAkademik tahapan={t.data} memuat={t.loading} galat={t.error} onUlang={t.refetch} judul="Tahapan Ganjil 2026/2027" />;
}

export function PortalMahasiswa() {
  const tr = useTranskrip(NIM_AKADEMIK);
  const krs = useKrsMahasiswa(NIM_AKADEMIK);
  const j = useJadwalMahasiswa(NIM_AKADEMIK);
  const t = useTahapanPeriode({ tahunId: '20261' });
  const predikat = usePredikatKelulusan();
  return (
    <PortalAkademikMahasiswa
      transkrip={tr.data}
      krs={krs.data}
      jadwal={j.data?.jadwal}
      tahapan={t.data}
      predikat={predikat.data}
      jenjang="C"
      sksLulus={144}
      memuat={tr.loading || krs.loading || j.loading}
      tautan={{ ipk: '#transkrip', krs: '#krs', jadwal: '#jadwal' }}
    />
  );
}

export function PortalDosen() {
  const j = useJadwalDosen(DOSEN[2]!.nidn);
  const t = useTahapanPeriode({ tahunId: '20261' });
  return <PortalMengajarDosen jadwal={j.data} memuat={j.loading} jumlahBimbingan={18} krsMenunggu={4} tahapan={t.data} />;
}

const SYARAT_AWAL: SyaratBerkasAkademik[] = [
  { kunci: '1', nama: 'Sertifikat TOEFL/EPT', keterangan: 'Skor sesuai ketentuan prodi.', wajib: true, status: 'terpenuhi', catatan: 'Skor 487, memenuhi.', lampiran: [{ id: 'a1', nama: 'sertifikat-ept.pdf', ukuran: 284_000, diunggah: '2026-11-10' }] },
  { kunci: '2', nama: 'Bukti publikasi artikel tugas akhir', keterangan: 'Unggah LoA atau tautan artikel terbit.', wajib: true, status: 'ditolak', catatan: 'LoA belum bertanda tangan editor. Unggah ulang versi bertanda tangan.', lampiran: [{ id: 'a2', nama: 'loa.pdf', ukuran: 120_000, diunggah: '2026-11-12' }], ekstensi: ['pdf'] },
  { kunci: '3', nama: 'Surat bebas pustaka', wajib: true, status: 'diajukan', lampiran: [{ id: 'a3', nama: 'bebas-pustaka.jpg', ukuran: 640_000, diunggah: '2026-11-20' }] },
  { kunci: '4', nama: 'Pas foto wisuda', keterangan: 'Latar biru, 4×6, format JPG.', wajib: false, ekstensi: ['jpg', 'jpeg'], maksByte: 2 * 1024 * 1024 },
];

export function Unggah() {
  // Contoh galeri: state lokal meniru server (unggah → status "menunggu pemeriksaan").
  const [syarat, setSyarat] = React.useState(SYARAT_AWAL);
  return (
    <UnggahBerkasAkademik
      judul="Berkas syarat yudisium"
      syarat={syarat}
      onUnggah={async (s, f) => {
        await new Promise((r) => setTimeout(r, 700));
        setSyarat((d) => d.map((x) => (x.kunci === s.kunci ? { ...x, status: 'diajukan', catatan: null, lampiran: [...(s.banyak ? (x.lampiran ?? []) : []), ...f.map((b, i) => ({ id: `${Date.now()}-${i}`, nama: b.name, ukuran: b.size, diunggah: new Date().toISOString() }))] } : x)));
      }}
      onHapus={async (s, l) => setSyarat((d) => d.map((x) => (x.kunci === s.kunci ? { ...x, lampiran: (x.lampiran ?? []).filter((y) => y.id !== l.id), status: (x.lampiran?.length ?? 0) > 1 ? x.status : 'belum' } : x)))}
    />
  );
}

export function Skala() {
  const { skala } = useSkalaNilai({ prodi: '55201' });
  return (
    <div className="demo-stack">
      <div className="demo-row">
        {(skala ?? []).map((s) => (
          <LencanaNilai key={s.huruf} nilai={s.huruf} skala={skala} bobot />
        ))}
      </div>
      <LegendaSkalaNilai skala={skala} />
    </div>
  );
}
