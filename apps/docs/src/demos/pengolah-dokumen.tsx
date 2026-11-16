import * as React from 'react';
import { Button, CodeBlock } from 'unipo-ui';
import { KopLembar, MARGIN_SIAP, PengolahDokumen, type KopSurat, type MarginKertas, type UkuranKertas } from 'unipo-ui/editor';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Pengolah dokumen',
  category: 'Editor',
  layout: 'full',
  order: 19,
  badge: 'baru',
  description:
    'Editor dokumen ala Word untuk surat dinas dan templat: pita menu (Beranda, Sisipkan, Tata letak, Tinjau, plus pita Tabel/Gambar saat dipilih), kertas A4/F4/Letter dengan margin dan batas halaman, kop tetap, chip penanda {{nama}} yang tidak bisa terpotong, tabel bergaris atau polos, gambar dan kode QR lewat unggah berkas, cari & ganti, zoom, dan cetak. Keluarannya HTML berkelas ub-* yang lolos saringan SIAKAD dan tampil sama di PDF.',
  importLine: "import { PengolahDokumen } from 'unipo-ui/editor';\nimport 'unipo-ui/css';",
  demos: {
    Surat: 'Surat dinas: kop, data surat sebelum isi, tanda tangan + QR verifikasi di kaki, panel data',
    Templat: 'Templat dengan penanda data (chip) dan HTML keluaran',
    Modern: 'Tampilan ringkas: bilah satu baris, panel navigasi judul, status simpan otomatis, mode fokus & layar penuh',
    Baca: 'Mode baca (tanpa pita)',
  },
  props: [
    ['nilaiAwal', 'string', 'HTML awal. Penanda {{nama}} berupa teks otomatis menjadi chip.'],
    ['onChange', '(html) => void', 'HTML siap kirim ke kolom isi (kelas ub-* saja, sudah disaring).'],
    ['penanda / penandaBawaan', 'PenandaTemplat[] / boolean', 'Daftar di Sisipkan › Penanda. Penanda bawaan arsip ikut kecuali penandaBawaan={false}.'],
    ['kertas / onKertasChange', "'a4' | 'f4' | 'letter'", 'Ukuran kertas (Tata letak › Kertas).'],
    ['margin / onMarginChange', 'MarginKertas (cm)', 'Bawaan naskah dinas: atas 2, kanan 2, bawah 2, kiri 3.'],
    ['kop / sebelumIsi / kaki', 'ReactNode', 'Bagian tetap di kertas: kop, data surat, tanda tangan + QR. Tidak ikut tersimpan.'],
    ['unggah', '(file) => Promise<{ url }>', 'Unggah gambar/QR, mis. ke /v1/berkas. Tanpa ini gambar hanya lewat tautan https.'],
    ['panel / panelJudul', 'ReactNode', 'Panel samping (isian data surat), bisa ditutup.'],
    ['judul / aksi / status', 'ReactNode', 'Bilah atas (judul, tombol simpan) dan teks status di bilah bawah.'],
    ['baca', 'boolean', 'Tanpa pita, tidak bisa disunting.'],
    ['tampilan', "'pita' | 'ringkas'", 'ringkas = bilah alat satu baris. Bawaan ringkas di perangkat mobile, pita di desktop.'],
    ['navigasi', 'boolean', 'Panel navigasi judul (Judul 1–3) di kiri; klik untuk melompat.'],
    ['simpan', "{ status: 'tersimpan' | 'menyimpan' | 'belum' | 'galat'; waktu? }", 'Penanda simpan otomatis di bilah atas dan bawah.'],
  ],
  notes: [
    'Pintasan: Ctrl+B/I/U, Ctrl+L/E/R/J (rata), Tab/Shift+Tab (inden), Ctrl+Enter (pemisah halaman), Ctrl+F (cari), Ctrl+Z/Y.',
    'Batas halaman di kertas adalah perkiraan dari tinggi isi; pemisah halaman (hr.ub-pindah-halaman) memaksa halaman baru di PDF dan cetak.',
    'Gaya ditulis sebagai kelas: ub-rata-*, ub-inden-*, ub-inden-awal, ub-baris-*, ub-uk-*, ub-huruf-*, ub-warna-*, ub-sorot-*, ub-tabel-garis/polos, ub-lebar-gambar-*, ub-gambar-*. Daftar lengkap di KELAS_PENGOLAH.',
    'QR verifikasi surat tidak perlu disisipkan: modul Dokumen menambahkannya di tanda tangan saat surat diterbitkan. Sisipkan › Kode QR untuk QR tambahan (mis. tautan formulir).',
  ],
};

const KOP: KopSurat = {
  instansi: 'Universitas Pohuwato',
  unit: 'Fakultas Ilmu Komputer',
  alamat: 'Jl. Trans Sulawesi No. 147, Marisa, Kabupaten Pohuwato, Gorontalo 96266',
  kontak: 'Telepon (0443) 210 123 · fikom@unipo.ac.id · fikom.unipo.ac.id',
};

const ISI = `<p class="ub-rata-penuh">Dalam rangka evaluasi pelaksanaan perkuliahan semester ganjil, bersama ini kami mengundang Bapak/Ibu untuk hadir pada:</p>
<table class="ub-tabel-polos"><tbody><tr><td><p>Hari, tanggal</p></td><td><p>: Senin, {{tanggal_rapat}}</p></td></tr><tr><td><p>Waktu</p></td><td><p>: 09.00 WITA s.d. selesai</p></td></tr><tr><td><p>Tempat</p></td><td><p>: Ruang Rapat {{unit}}</p></td></tr><tr><td><p>Acara</p></td><td><p>: <strong>Evaluasi perkuliahan dan persiapan UAS</strong></p></td></tr></tbody></table>
<p class="ub-rata-penuh ub-inden-awal">Mengingat pentingnya acara tersebut, kehadiran Bapak/Ibu sangat kami harapkan. Atas perhatian dan kerja samanya kami ucapkan terima kasih.</p>`;

const unggahContoh = async (f: File) => ({ url: URL.createObjectURL(f), nama: f.name });

function DataSurat() {
  return (
    <table className="ub-tabel-polos" style={{ width: '100%' }}>
      <tbody>
        <tr>
          <td style={{ width: '18%' }}>Nomor</td>
          <td>: 045/FIKOM/PP.00.01/XI/2026</td>
          <td style={{ textAlign: 'right' }}>16 November 2026</td>
        </tr>
        <tr>
          <td>Sifat</td>
          <td colSpan={2}>: Biasa</td>
        </tr>
        <tr>
          <td>Lampiran</td>
          <td colSpan={2}>: -</td>
        </tr>
        <tr>
          <td>Hal</td>
          <td colSpan={2}>
            : <b>Undangan rapat evaluasi perkuliahan</b>
          </td>
        </tr>
        <tr>
          <td colSpan={3} style={{ paddingTop: '0.75em' }}>
            Kepada Yth.
            <br />
            Seluruh Dosen Fakultas Ilmu Komputer
            <br />
            di tempat
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function Ttd() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: '45%', display: 'grid', gap: '0.25rem' }}>
        <span>Dekan,</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '2.4cm', color: '#5c6170', fontSize: '9pt', fontFamily: 'system-ui' }}>
          <span style={{ width: '2cm', height: '2cm', border: '1px dashed #9aa0ac', display: 'grid', placeItems: 'center' }}>QR</span>
          QR verifikasi dibuat saat terbit
        </div>
        <b style={{ textDecoration: 'underline' }}>Dr. Rahmawati Hasan, S.T., M.T.</b>
        <span>NIDN 0912078501</span>
      </div>
    </div>
  );
}

export function Surat() {
  const [kertas, setKertas] = React.useState<UkuranKertas>('a4');
  const [margin, setMargin] = React.useState<MarginKertas>(MARGIN_SIAP.dinas.margin);
  const [html, setHtml] = React.useState(ISI);
  return (
    <PengolahDokumen
      tinggi={820}
      nilaiAwal={ISI}
      onChange={setHtml}
      penanda={[{ nama: 'tanggal_rapat', label: 'Tanggal rapat' }]}
      kertas={kertas}
      onKertasChange={setKertas}
      margin={margin}
      onMarginChange={setMargin}
      kop={<KopLembar kop={KOP} />}
      sebelumIsi={<DataSurat />}
      kaki={<Ttd />}
      unggah={unggahContoh}
      qrBawaan="https://fikom.unipo.ac.id/rapat"
      judul="Undangan rapat evaluasi perkuliahan"
      aksi={
        <>
          <Button variant="outline" size="sm">
            Simpan konsep
          </Button>
          <Button size="sm">Ajukan</Button>
        </>
      }
      status={`Konsep · ${html.length.toLocaleString('id-ID')} karakter HTML`}
      panelJudul="Data surat"
      panel={
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.875rem' }}>
          <p style={{ margin: 0 }}>Isian data surat (jenis, klasifikasi, sifat, tujuan, penandatangan) diletakkan di panel ini oleh halaman aplikasi.</p>
        </div>
      }
    />
  );
}

export function Templat() {
  const [html, setHtml] = React.useState('');
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <PengolahDokumen
        tinggi={640}
        nilaiAwal="<p>Yang bertanda tangan di bawah ini menerangkan bahwa {{nama_mahasiswa}} (NIM {{nim}}) adalah mahasiswa aktif {{unit}}.</p>"
        onChange={setHtml}
        penanda={[
          { nama: 'nama_mahasiswa', label: 'Nama mahasiswa' },
          { nama: 'nim', label: 'NIM' },
        ]}
        kop={<KopLembar kop={KOP} />}
      />
      <CodeBlock language="html" code={html || '(ketik sesuatu)'} />
    </div>
  );
}

export function Modern() {
  const [status, setStatus] = React.useState<'tersimpan' | 'menyimpan' | 'belum'>('tersimpan');
  const [waktu, setWaktu] = React.useState<Date>(new Date());
  const t = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  return (
    <PengolahDokumen
      tampilan="ringkas"
      navigasi
      tinggi={640}
      judul="Pedoman akademik 2026"
      nilaiAwal={
        '<h1>Pedoman akademik</h1><p>Pedoman ini berlaku untuk seluruh program studi.</p><h2>Bab I Pendahuluan</h2><p>Latar belakang dan tujuan.</p><h2>Bab II Registrasi</h2><h3>Pengisian KRS</h3><p>KRS diisi setiap awal semester.</p><h3>Cuti akademik</h3><p>Cuti diajukan paling lambat dua minggu sebelum perkuliahan.</p><h2>Bab III Penilaian</h2><p>Nilai akhir terdiri atas tugas, UTS, dan UAS.</p>'
      }
      simpan={{ status, waktu }}
      onChange={() => {
        setStatus('belum');
        clearTimeout(t.current);
        t.current = setTimeout(() => {
          setStatus('menyimpan');
          setTimeout(() => (setStatus('tersimpan'), setWaktu(new Date())), 700);
        }, 900);
      }}
    />
  );
}

export function Baca() {
  return <PengolahDokumen baca tinggi={520} nilaiAwal={ISI} kop={<KopLembar kop={KOP} />} />;
}
