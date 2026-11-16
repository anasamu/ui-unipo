import * as React from 'react';
import { Button, CodeBlock, UnipoMark } from 'unipo-ui';
import { EditorDokumen, EditorTemplatSurat, LembarSurat, isiTemplat, type KopSurat, type PenandatanganSurat } from 'unipo-ui/editor';
import { BuatSuratDariTemplat, EditorSuratKeluar, KelolaTemplatSurat, TEMPLAT_SURAT_BAWAAN, type SuratKeluar } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Editor surat & templat',
  category: 'Editor',
  layout: 'full',
  order: 20,
  badge: 'baru',
  description:
    'Editor dokumen di atas kertas A4/F4 untuk surat dinas dan templat surat arsip. Penanda {{nama}} disisipkan di posisi kursor dan diisi persis seperti SuratService::isiTemplat di SIAKAD; isi disaring seperti HtmlSanitizer server, jadi bisa langsung dikirim ke kolom isi di /v1/arsip/template dan /v1/arsip/surat-keluar.',
  importLine:
    "import { EditorDokumen, EditorTemplatSurat, LembarSurat, isiTemplat } from 'unipo-ui/editor';\nimport { KelolaTemplatSurat, BuatSuratDariTemplat } from 'unipo-ui/siakad';\nimport 'unipo-ui/css';",
  demos: {
    DariTemplat: 'EditorSuratKeluar: galeri templat (bawaan UNIPO, unit, bersama) → isian bertipe + ambil dari data mahasiswa/dosen → Bangkitkan surat',
    Wizard: 'BuatSuratDariTemplat: unit → templat → data → tujuan → isi → tinjau → POST /v1/arsip/surat-keluar',
    Kelola: 'KelolaTemplatSurat: daftar, cari, buat, sunting, hapus templat (/v1/arsip/template)',
    Templat: 'EditorTemplatSurat tanpa SDK: nama, perihal, isi, penanda, data uji, pratinjau',
    Lembar: 'LembarSurat: satu lembar surat siap cetak',
    Dokumen: 'EditorDokumen: kertas dengan kop dan kaki tetap',
  },
  props: [
    ['EditorSuratKeluar.galeriAwal', 'boolean', 'Surat baru membuka galeri templat lebih dulu (bawaan true).'],
    ['EditorSuratKeluar.templatAwal', 'TemplatTerpilih', 'Muat templat langsung, mis. templatTerpilih(TEMPLAT_SURAT_BAWAAN[0]).'],
    ['PilihTemplatSurat', 'open, onOpenChange, unitId, onPilih', 'Galeri templat mandiri: cari, kategori, pratinjau dengan contoh data.'],
    ['TEMPLAT_SURAT_BAWAAN', 'TemplatSuratBawaan[]', `${TEMPLAT_SURAT_BAWAAN.length} templat siap pakai: undangan, pemberitahuan, permohonan, pengantar, berita acara, keterangan aktif kuliah, rekomendasi, izin penelitian, surat tugas, keterangan pegawai, SK, edaran.`],
    ['EditorDokumen.nilaiAwal', 'string | Blok[]', 'HTML dari server (diurai ke blok) atau blok. Ganti `key` untuk memuat dokumen lain.'],
    ['EditorDokumen.onChange', '(html, blok) => void', 'HTML sudah disaring seperti server.'],
    ['EditorDokumen.penanda', 'PenandaTemplat[]', 'Penanda yang disarankan. Penanda di isi dan penanda bawaan ikut tampil.'],
    ['EditorDokumen.kop / kaki', 'ReactNode', 'Bagian tetap di kertas (kop, tanda tangan) yang tidak ikut tersimpan.'],
    ['EditorDokumen.tipe', 'TipeBlok[]', 'Blok yang boleh disisipkan. Bawaan TIPE_DOKUMEN (tanpa video, peta, tombol).'],
    ['EditorTemplatSurat.aksi', '(nilai, galat) => ReactNode', 'Tombol simpan. Kirim `bodyTemplatSurat(nilai, { unit_id, jenis_id })`.'],
    ['LembarSurat.kertas', "'a4' | 'f4' | 'letter'", 'Ukuran kertas. Margin surat dinas 2 cm, kiri 3 cm saat dicetak.'],
    ['BuatSuratDariTemplat.onSelesai', '(surat) => void', 'Setelah konsep tersimpan (status draf).'],
    ['isiTemplat(html, data, konteks)', 'string', 'Isi penanda di browser, sama dengan server. `tandaiKosong` menandai penanda yang belum diisi.'],
  ],
  notes: [
    'Penanda bawaan diisi server: {{unit}}, {{unit_singkatan}}, {{tanggal}} (15 November 2026), {{perihal}}, {{lampiran}}. Penanda lain diisi dari data_templat; nilainya di-escape dan penanda yang tidak punya nilai dibiarkan apa adanya.',
    'Bila isi surat disunting di langkah Isi, wizard mengirim isi itu bersama template_id dan data_templat. Server memakai isi yang dikirim dan hanya mengisi dari templat bila isi kosong.',
    'Kertas selalu terang (seperti hasil cetak) walau aplikasi memakai mode gelap. Bungkus bagian yang mau dicetak dengan .u-cetak-saja agar window.print() mencetak lembarnya saja.',
    'Token butuh scope arsip:read dan arsip:write. Mengelola templat hanya untuk admin, sekretaris, atau arsiparis unit; templat bersama (tanpa unit) hanya admin arsip.',
  ],
};

const KOP: KopSurat = {
  instansi: 'Universitas Pohuwato',
  unit: 'Fakultas Teknik',
  alamat: 'Jl. Trans Sulawesi No. 147, Marisa, Kabupaten Pohuwato, Gorontalo 96266',
  kontak: 'Telepon (0443) 210 123 · ft@unipo.ac.id · ft.unipo.ac.id',
};
const TTD: PenandatanganSurat = { jabatan: 'Dekan', nama: 'Dr. Rahmawati Hasan, S.T., M.T.', nomorInduk: 'NIDN 0912078501', verifikasi: 'https://siakad.unipo.ac.id/v1/arsip/verifikasi/K7Q2-M9XA' };

export function DariTemplat() {
  const [kunci, setKunci] = React.useState(0);
  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <Button variant="outline" onClick={() => setKunci((k) => k + 1)} style={{ justifySelf: 'start' }}>
        Buat surat keluar
      </Button>
      <EditorSuratKeluar key={kunci} unitId={2} tinggi={820} />
    </div>
  );
}

export function Wizard() {
  const [hasil, setHasil] = React.useState<SuratKeluar | null>(null);
  return hasil ? (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <p>
        Konsep surat <strong>{hasil.perihal}</strong> tersimpan dengan status <strong>{hasil.status}</strong>.
      </p>
      <CodeBlock language="json" code={JSON.stringify(hasil, null, 2)} />
      <Button variant="outline" onClick={() => setHasil(null)} style={{ justifySelf: 'start' }}>
        Buat surat lain
      </Button>
    </div>
  ) : (
    <BuatSuratDariTemplat onSelesai={setHasil} kop={(u) => ({ ...KOP, unit: u.nama })} penandatangan={TTD} />
  );
}

export function Kelola() {
  return <KelolaTemplatSurat kop={KOP} penandatangan={TTD} tinggi={720} />;
}

export function Templat() {
  const [body, setBody] = React.useState<string>('');
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <EditorTemplatSurat
        tinggi={720}
        kop={KOP}
        unit={{ nama: 'Fakultas Teknik', singkatan: 'FT' }}
        penandatangan={TTD}
        penanda={[
          { nama: 'nama_mahasiswa', label: 'Nama mahasiswa' },
          { nama: 'nim', label: 'NIM' },
        ]}
        nilaiAwal={{
          nama: 'Undangan seminar proposal',
          perihal: 'Undangan seminar proposal',
          isi: '<p>Dengan hormat,</p><p>Kami mengundang Bapak/Ibu sebagai penguji seminar proposal mahasiswa {{nama_mahasiswa}} (NIM {{nim}}) yang akan dilaksanakan pada {{hari_tanggal}} di {{tempat}}.</p><p>Atas kesediaan Bapak/Ibu kami ucapkan terima kasih.</p>',
          aktif: true,
        }}
        aksi={(n, g) => (
          <Button size="sm" disabled={Object.keys(g).length > 0} onClick={() => setBody(JSON.stringify({ unit_id: 2, ...n }, null, 2))}>
            Simpan
          </Button>
        )}
      />
      {body && <CodeBlock language="json" code={`POST /v1/arsip/template\n${body}`} />}
    </div>
  );
}

export function Lembar() {
  const isi = isiTemplat(
    '<p>Dengan hormat,</p><p>Bersama ini kami mengundang Bapak/Ibu untuk menghadiri rapat {{agenda}} yang akan dilaksanakan pada:</p><figure class="ub-tabel"><table><tr><td>Hari/tanggal</td><td>{{hari_tanggal}}</td></tr><tr><td>Waktu</td><td>{{waktu}}</td></tr><tr><td>Tempat</td><td>Ruang Rapat {{unit_singkatan}}</td></tr></table></figure><p>Mengingat pentingnya acara tersebut, kami mohon kehadiran Bapak/Ibu tepat waktu. Atas perhatian dan kehadirannya, kami ucapkan terima kasih.</p>',
    { agenda: 'evaluasi pembelajaran semester ganjil', hari_tanggal: 'Kamis, 19 November 2026', waktu: '09.00 WITA s.d. selesai' },
    { unit: { nama: 'Fakultas Teknik', singkatan: 'FT' }, surat: { tanggal_surat: '2026-11-15' } },
  );
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Button variant="outline" size="sm" style={{ justifySelf: 'start' }} onClick={() => window.print()}>
        Cetak lembar
      </Button>
      <div className="u-cetak-saja" style={{ overflowX: 'auto' }}>
        <LembarSurat
          kop={
            <>
              <UnipoMark size={76} shape="circle" color="#0b4f9c" accent="#e8b10c" className="u-lembar-logo" />
              <div>
                <p className="u-lembar-instansi">{KOP.instansi}</p>
                <p className="u-lembar-unit">{KOP.unit}</p>
                <p className="u-lembar-alamat">{KOP.alamat}</p>
                <p className="u-lembar-alamat">{KOP.kontak}</p>
              </div>
            </>
          }
          nomor="047/UNIPO.FT/UND/XI/2026"
          sifat="Penting"
          lampiran="1 (satu) berkas"
          perihal="Undangan rapat evaluasi"
          tempat="Marisa"
          tanggal="2026-11-15"
          tujuan={[
            { nama: 'Ketua Program Studi', instansi: 'di lingkungan Fakultas Teknik' },
            { jabatan: 'Rektor', nama: 'Universitas Pohuwato', tembusan: true },
            { nama: 'Arsip', tembusan: true },
          ]}
          isi={isi}
          penandatangan={TTD}
        />
      </div>
    </div>
  );
}

export function Dokumen() {
  const [html, setHtml] = React.useState('');
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <EditorDokumen
        tinggi={640}
        nilaiAwal="<h2>Notulen Rapat Pimpinan</h2><p>Rapat dibuka pukul 09.00 WITA oleh Dekan. Hadir 12 dari 14 undangan.</p><ol><li>Evaluasi pembelajaran semester ganjil</li><li>Persiapan akreditasi prodi</li></ol>"
        onChange={(h) => setHtml(h)}
        kop={<p style={{ textAlign: 'center', margin: 0 }}>FAKULTAS TEKNIK UNIVERSITAS POHUWATO</p>}
        kaki={<p style={{ textAlign: 'right', margin: 0 }}>Notulis, ttd.</p>}
        bisaCetak
      />
      {html && <CodeBlock language="html" code={html} />}
    </div>
  );
}
