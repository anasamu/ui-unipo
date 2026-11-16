import * as React from 'react';
import { Button } from 'unipo-ui';
import {
  ProgressBertumpuk,
  ProgressCincinBanyak,
  ProgressDaftar,
  ProgressGauge,
  ProgressHalaman,
  ProgressKuota,
  ProgressLangkah,
  ProgressTakTentu,
  ProgressTarget,
  ProgressTebal,
  ProgressTenggat,
  ProgressUnggah,
} from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Progress bar',
  category: 'Tampilan data',
  layout: 'wide',
  badge: 'baru',
  description:
    'Variasi progress untuk kebutuhan kampus: tahap pengajuan, komposisi pembayaran, target vs capaian, gauge serapan anggaran, unggah berkas, tenggat jadwal (KRS, pengisian EDOM), kuota kelas/ruang, cincin capaian ganda, dan peringkat per prodi. Semuanya ikut pengaturan perangkat: di mobile langkah panjang otomatis diringkas dan label menyesuaikan lebar layar.',
  importLine:
    "import { ProgressLangkah, ProgressBertumpuk, ProgressTarget, ProgressGauge, ProgressUnggah, ProgressTenggat, ProgressKuota, ProgressCincinBanyak, ProgressDaftar, ProgressTebal, ProgressTakTentu, ProgressHalaman } from 'unipo-ui';",
  demos: {
    Langkah: 'ProgressLangkah: segmen, titik, garis, vertikal, ringkas',
    Komposisi: 'ProgressBertumpuk: lunas, potongan, sisa tagihan',
    Target: 'ProgressTarget dan ProgressTebal: capaian terhadap target',
    Gauge: 'ProgressGauge dengan ambang waspada/bahaya',
    Unggah: 'ProgressUnggah: mengunggah, selesai, gagal + ulangi',
    Tenggat: 'ProgressTenggat: sisa waktu jadwal',
    Kuota: 'ProgressKuota: kursi kelas, kapasitas ruang',
    Cincin: 'ProgressCincinBanyak: beberapa capaian dalam satu lingkaran',
    Daftar: 'ProgressDaftar: peringkat per prodi',
    TakTentu: 'ProgressTakTentu dan ProgressHalaman untuk proses tanpa persen',
  },
  props: [
    ['ProgressLangkah.varian', "'segmen' | 'titik' | 'garis' | 'vertikal' | 'ringkas'", 'Di mobile, lebih dari 3 langkah otomatis memakai ringkas (kecuali vertikal).'],
    ['ProgressLangkah.langkah', 'LangkahProgres[]', '{ label, status?, keterangan?, waktu? }; status bawaan dihitung dari saatIni.'],
    ['ProgressBertumpuk.bagian', 'BagianProgres[]', '{ label, nilai, tone?, warna? }; sisa terhadap total tampil abu-abu.'],
    ['ProgressGauge.ambang', '{ waspada?, bahaya? }', 'Rasio 0–1. terbalik=false bila nilai tinggi justru buruk (mis. tunggakan).'],
    ['ProgressUnggah.persen', 'number | null', 'null = belum diketahui (bilah berjalan).'],
    ['ProgressTenggat', '{ mulai, selesai, sekarang?, mendesak? }', 'Nada berubah menjadi peringatan saat sisa ≤ mendesak (rasio).'],
    ['ProgressKuota.blok', 'boolean', 'Tampilkan kursi sebagai kotak-kotak (≤ 60 kapasitas).'],
  ],
  notes: [
    'Sudah terpasang di komponen lain: SyaratSaya dan KetentuanAturan (tenggat), PilihBerkas dan CariAtauUnggahDokumen (unggah), KeuanganMahasiswa (komposisi bayar), Kasir dan WidgetPengajuan (langkah), KartuWidget varian cincin (gauge).',
    'Warna mengikuti token tema (tone success/warning/danger/info), jadi ikut mode gelap dan tema aplikasi.',
  ],
};

const TAHAP = ['Diajukan', 'Verifikasi prodi', 'Persetujuan dekan', 'Tanda tangan', 'Selesai'];

export function Langkah() {
  const [i, setI] = React.useState(2);
  const langkah = TAHAP.map((label, k) => ({ label, waktu: k < i ? `1${k} Nov 09.${k}5` : undefined }));
  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {(['segmen', 'titik', 'garis', 'ringkas'] as const).map((v) => (
        <div key={v}>
          <small style={{ color: 'var(--u-text-muted)' }}>varian="{v}"</small>
          <ProgressLangkah varian={v} langkah={langkah} saatIni={i} onPilih={setI} />
        </div>
      ))}
      <div style={{ display: 'flex', gap: '.5rem' }}>
        <Button size="sm" variant="secondary" disabled={i === 0} onClick={() => setI(i - 1)}>
          Mundur
        </Button>
        <Button size="sm" disabled={i >= TAHAP.length} onClick={() => setI(i + 1)}>
          Lanjut
        </Button>
      </div>
      <ProgressLangkah
        varian="vertikal"
        langkah={[
          { label: 'Diajukan', status: 'selesai', waktu: '12 Nov 08.10', keterangan: 'Surat keterangan aktif kuliah' },
          { label: 'Verifikasi prodi', status: 'selesai', waktu: '12 Nov 10.21' },
          { label: 'Persetujuan dekan', status: 'gagal', keterangan: 'Perlu lampiran KTM terbaru' },
          { label: 'Tanda tangan elektronik', status: 'menunggu' },
        ]}
      />
    </div>
  );
}

export function Komposisi() {
  return (
    <div style={{ display: 'grid', gap: '1.5rem', maxWidth: 640 }}>
      <ProgressBertumpuk
        label="Tagihan semester 20251"
        total={7_500_000}
        format={(n) => `Rp${n.toLocaleString('id-ID')}`}
        bagian={[
          { label: 'Dibayar', nilai: 4_000_000, tone: 'success' },
          { label: 'Potongan', nilai: 1_000_000, tone: 'info' },
        ]}
      />
      <ProgressBertumpuk
        label="Status KRS mahasiswa aktif"
        tinggi="lg"
        bagian={[
          { label: 'Disetujui', nilai: 1840 },
          { label: 'Menunggu PA', nilai: 320 },
          { label: 'Ditolak', nilai: 42 },
          { label: 'Belum isi', nilai: 210, tone: 'muted' },
        ]}
      />
    </div>
  );
}

export function Target() {
  return (
    <div style={{ display: 'grid', gap: '1.5rem', maxWidth: 640 }}>
      <ProgressTarget label="Pendaftar PMB" nilai={1240} target={1500} max={1800} satuan=" orang" />
      <ProgressTarget label="Publikasi dosen" nilai={58} target={50} max={70} satuan=" artikel" />
      <ProgressTebal label="Serapan anggaran" value={68} />
      <ProgressTebal label="Kelengkapan borang akreditasi" value={91} gradien />
    </div>
  );
}

export function Gauge() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
      <ProgressGauge label="Serapan anggaran" nilai={72} ambang={{ waspada: 0.5, bahaya: 0.3 }} />
      <ProgressGauge label="Kehadiran dosen" nilai={93} ambang={{ waspada: 0.85, bahaya: 0.75 }} />
      <ProgressGauge label="Tunggakan" nilai={38} terbalik={false} ambang={{ waspada: 0.25, bahaya: 0.5 }} teks="38%" />
    </div>
  );
}

export function Unggah() {
  const [p, setP] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setP((x) => (x >= 100 ? 0 : x + 7)), 400);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: 'grid', gap: '.75rem', maxWidth: 520 }}>
      <ProgressUnggah nama="skripsi-bab-1.pdf" ukuran={2_480_000} persen={Math.min(p, 100)} onBatal={() => setP(0)} />
      <ProgressUnggah nama="ktm.jpg" ukuran={340_000} persen={null} />
      <ProgressUnggah nama="sk-rektor.pdf" ukuran={820_000} persen={100} status="selesai" />
      <ProgressUnggah nama="ijazah.pdf" ukuran={5_100_000} persen={44} status="gagal" pesan="Koneksi terputus." onUlang={() => setP(0)} />
    </div>
  );
}

const hari = 86_400_000;
export function Tenggat() {
  const now = Date.now();
  return (
    <div style={{ display: 'grid', gap: '1.25rem', maxWidth: 560 }}>
      <ProgressTenggat label="Pengisian KRS" mulai={new Date(now - 10 * hari)} selesai={new Date(now + 4 * hari)} />
      <ProgressTenggat label="Pengisian EDOM" mulai={new Date(now - 13 * hari)} selesai={new Date(now + 0.4 * hari)} />
      <ProgressTenggat label="Pendaftaran wisuda" mulai={new Date(now + 3 * hari)} selesai={new Date(now + 20 * hari)} />
    </div>
  );
}

export function Kuota() {
  return (
    <div style={{ display: 'grid', gap: '1.25rem', maxWidth: 560 }}>
      <ProgressKuota label="Kelas Basis Data A" terpakai={38} kapasitas={40} satuan=" kursi" blok />
      <ProgressKuota label="Ruang ujian R.201" terpakai={22} kapasitas={45} satuan=" kursi" />
      <ProgressKuota label="Kuota beasiswa KIP" terpakai={120} kapasitas={100} />
    </div>
  );
}

export function Cincin() {
  return (
    <ProgressCincinBanyak
      tengah={<strong>IKU</strong>}
      cincin={[
        { label: 'Lulusan bekerja', nilai: 78 },
        { label: 'Dosen berkegiatan luar', nilai: 54 },
        { label: 'Kelas kolaboratif', nilai: 31 },
      ]}
    />
  );
}

export function Daftar() {
  return (
    <div style={{ maxWidth: 560 }}>
      <ProgressDaftar
        urut
        ambang={{ waspada: 0.6, bahaya: 0.4 }}
        items={[
          { label: 'Teknik Informatika', nilai: 92, keterangan: '412 mhs' },
          { label: 'Sistem Informasi', nilai: 81, keterangan: '233 mhs' },
          { label: 'Manajemen', nilai: 66, keterangan: '380 mhs' },
          { label: 'Akuntansi', nilai: 47, keterangan: '190 mhs' },
          { label: 'Hukum', nilai: 35, keterangan: '128 mhs' },
        ]}
      />
    </div>
  );
}

export function TakTentu() {
  const [aktif, setAktif] = React.useState(false);
  return (
    <div style={{ display: 'grid', gap: '1rem', maxWidth: 520 }}>
      <ProgressTakTentu label="Menyinkronkan data ke PDDikti…" />
      <ProgressTakTentu ukuran="sm" tone="success" />
      <div style={{ position: 'relative', border: '1px solid var(--u-border)', borderRadius: 8, padding: '1rem' }}>
        <ProgressHalaman aktif={aktif} />
        <Button size="sm" onClick={() => (setAktif(true), setTimeout(() => setAktif(false), 2000))}>
          Muat ulang halaman
        </Button>
      </div>
    </div>
  );
}
