import * as React from 'react';
import { Alert, Button, CodeBlock, Field, Select, Textarea } from 'unipo-ui';
import { blokKeHtml, EditorBerita, EditorBlok, GalatBlok, TampilBlok, useRiwayatBlok, validasiBlok, type Blok, type MediaEditor, type OpsiPilihMedia, type PolaBlok } from 'unipo-ui/editor';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Editor berita (gaya Gutenberg)',
  category: 'Editor',
  layout: 'full',
  order: 10,
  badge: 'baru',
  description:
    'Editor blok untuk berita, pengumuman, dan halaman portal. Ketik langsung, tekan / untuk memilih blok, pakai pintasan Markdown (##, -, 1., >, ---), seret blok untuk memindah, dan atur blok terpilih di panel samping. Format blok sama persis dengan Blok.php di SIAKAD, jadi isi bisa dikirim apa adanya ke /v1/humas dan /v1/portal.',
  importLine: "import { EditorBerita, EditorBlok, TampilBlok, blokKeHtml, validasiBlok } from 'unipo-ui/editor';\nimport 'unipo-ui/css';",
  demos: {
    Berita: 'Editor berita lengkap: judul, ringkasan, panel Dokumen/Blok, cek terbit, pratinjau',
    Kanvas: 'Kanvas blok saja (untuk halaman portal, deskripsi prodi, pengumuman)',
    Tampil: 'Tampilkan isi blok: HTML sama dengan render server',
    Validasi: 'Validasi sebelum kirim: aturan sama dengan API',
  },
  props: [
    ['EditorBerita.nilaiAwal', '{ judul, ringkasan?, blok }', 'Isi awal. Untuk memuat ulang tulisan lain, ganti `key`.'],
    ['EditorBerita.onChange', '(n: NilaiBerita) => void', 'Dipanggil tiap perubahan; simpan otomatis di sini.'],
    ['EditorBerita.aksi', '(n, cek) => ReactNode', 'Tombol simpan/terbit di bilah atas. `cek` berisi hasil cek terbit.'],
    ['EditorBerita.panelDokumen', 'ReactNode', 'Isian tambahan di tab Dokumen: kategori, topik, gambar unggulan, jadwal.'],
    ['EditorBerita.tinggi', 'number | string', 'Tinggi tetap; isi dan panel bergulir sendiri. Tanpa ini editor memanjang dan bilah atas menempel.'],
    ['EditorBerita.cekTambahan', '(n) => CekTerbit[]', 'Cek terbit sendiri. `wajib: true` menahan tombol Terbitkan.'],
    ['pilihMedia', '(opsi) => Promise<MediaEditor[] | null>', 'Pemilih media sendiri, mis. pustaka media humas. Tanpa ini dipakai dialog URL/unggah bawaan.'],
    ['unggah', '(file, opsi) => Promise<MediaEditor>', 'Unggah untuk dialog bawaan, mis. ke /v1/berkas lewat unggahKeBerkas.'],
    ['pola', 'PolaBlok[]', 'Pola siap pakai di tab Pola penyisip (dari /v1/humas/pola).'],
    ['EditorBlok', 'blok, set, urung, ulang, baca', 'Kanvas saja. Pasangkan dengan useRiwayatBlok untuk urung/ulang.'],
    ['blokKeHtml(blok)', 'string', 'Port dari Blok::render. Hasilnya sama dengan HTML yang disimpan server.'],
    ['validasiBlok(blok)', 'Blok[] | throw GalatBlok', 'Maksimal 600 blok, 2 MB, tipe dikenal, kolom tidak bersarang. Pesan sama dengan API.'],
  ],
  notes: [
    '17 tipe blok: paragraf, judul, daftar, kutipan, sorotan, kode, gambar, galeri, video, berkas, peta, tombol, pemisah, spasi, kolom, tabel, akordion.',
    'Pintasan: Ctrl+B/I/K di teks terpilih, Ctrl+Z dan Ctrl+Shift+Z untuk urung/ulang, Enter memecah paragraf, Backspace di awal blok menggabungkan dengan blok sebelumnya, Esc melepas pilihan.',
    'Tampilan isi memakai kelas ub-* yang mengikuti token tema, jadi pratinjau di editor, halaman portal, dan mode gelap tampil sama.',
  ],
};

/**
 * Unggah tiruan. Di aplikasi, kirim berkas ke server (unggahKeBerkas untuk /v1/berkas, atau API media humas) lalu
 * kembalikan URL-nya. Server menolak data URL dan URL lebih dari 2000 karakter, jadi jangan simpan gambar sebagai base64.
 */
const CONTOH = ['contoh/kampus.jpg', 'contoh/wisuda.jpg', 'contoh/lab.jpg'];
let urutan = 0;
const unggahTiruan = async (file: File, _opsi: OpsiPilihMedia): Promise<MediaEditor> => {
  await new Promise((r) => setTimeout(r, 600));
  return { url: CONTOH[urutan++ % CONTOH.length], nama: file.name, ukuran: file.size, alt: '' };
};

const POLA: PolaBlok[] = [
  {
    id: 'p1',
    nama: 'Siaran pers kegiatan',
    kategori: 'Berita',
    deskripsi: 'Paragraf pembuka, kutipan narasumber, dan kontak humas.',
    blok: [
      { id: 'a', tipe: 'paragraf', data: { teks: '<strong>Gorontalo</strong>, (tanggal). Tulis inti kegiatan di sini: siapa, apa, kapan, di mana.', besar: true } },
      { id: 'b', tipe: 'kutipan', data: { teks: 'Kutipan narasumber.', sumber: 'Nama, jabatan', gaya: 'biasa' } },
      { id: 'c', tipe: 'sorotan', data: { gaya: 'info', judul: 'Kontak media', teks: 'Humas UNIPO, humas@unipo.ac.id' } },
    ],
  },
  {
    id: 'p2',
    nama: 'Pengumuman dengan tenggat',
    kategori: 'Pengumuman',
    deskripsi: 'Sorotan tenggat, daftar syarat, dan tombol daftar.',
    blok: [
      { id: 'a', tipe: 'sorotan', data: { gaya: 'peringatan', judul: 'Batas waktu', teks: 'Pendaftaran ditutup (tanggal) pukul 23.59 WITA.' } },
      { id: 'b', tipe: 'judul', data: { teks: 'Syarat', tingkat: 2 } },
      { id: 'c', tipe: 'daftar', data: { gaya: 'ol', item: ['Mahasiswa aktif', 'IPK minimal 3,00', 'Mengunggah KHS terakhir'] } },
      { id: 'd', tipe: 'tombol', data: { tombol: [{ label: 'Daftar sekarang', url: '#', gaya: 'utama' }], rata: 'kiri' } },
    ],
  },
];

function isiContoh(): Blok[] {
  return [
    {
      id: 'b1',
      tipe: 'paragraf',
      data: {
        teks: '<strong>Gorontalo</strong>, 14 November 2026. Universitas Pohuwato menerima 1.240 mahasiswa baru tahun akademik 2026/2027. Pengenalan kampus berlangsung tiga hari di aula utama dan diikuti seluruh program studi.',
        besar: true,
      },
    },
    { id: 'b2', tipe: 'gambar', data: { url: 'contoh/kampus.jpg', alt: 'Mahasiswa baru berbaris di halaman kampus', keterangan: 'Mahasiswa baru mengikuti apel pembukaan.', lebar: 'lebar' } },
    { id: 'b3', tipe: 'judul', data: { teks: 'Rangkaian kegiatan', tingkat: 2 } },
    {
      id: 'b4',
      tipe: 'daftar',
      data: { gaya: 'ul', item: ['Hari 1: apel pembukaan dan pengenalan pimpinan', 'Hari 2: kunjungan fakultas dan laboratorium', 'Hari 3: <em>expo</em> UKM dan malam keakraban'] },
    },
    { id: 'b5', tipe: 'kutipan', data: { teks: 'Kami ingin mahasiswa baru merasa di rumah sejak hari pertama.', sumber: 'Rektor Universitas Pohuwato', gaya: 'sorot' } },
    {
      id: 'b6',
      tipe: 'kolom',
      data: { rasio: '50-50' },
      anak: [
        [{ id: 'k1', tipe: 'paragraf', data: { teks: 'Mahasiswa yang belum mengambil jas almamater bisa datang ke <a href="#">bagian kemahasiswaan</a>.' } }],
        [{ id: 'k2', tipe: 'sorotan', data: { gaya: 'sukses', judul: 'Sudah dibuka', teks: 'Pengisian KRS semester ganjil mulai 18 November.' } }],
      ],
    },
    {
      id: 'b7',
      tipe: 'tabel',
      data: {
        kepala: true,
        baris: [
          ['Fakultas', 'Mahasiswa baru'],
          ['Teknik', '412'],
          ['Ekonomi', '368'],
          ['Pertanian', '460'],
        ],
        keterangan: 'Sumber: PMB UNIPO, data per 13 November 2026.',
      },
    },
    { id: 'b9', tipe: 'galeri', data: { kolom: 3, gambar: CONTOH.map((url, i) => ({ url, alt: `Dokumentasi kegiatan ${i + 1}` })) } },
    { id: 'b8', tipe: 'akordion', data: { item: [{ judul: 'Kapan kuliah perdana dimulai?', isi: 'Senin, 25 November 2026, sesuai jadwal di SIAKAD.' }] } },
  ];
}

export function Berita() {
  const [awal] = React.useState(() => ({ judul: 'Seribu lebih mahasiswa baru ikuti pengenalan kampus', ringkasan: '', blok: isiContoh() }));
  const [kategori, setKategori] = React.useState<string | null>('kampus');
  const [tersimpan, setTersimpan] = React.useState<string>('Belum disimpan');
  return (
    <EditorBerita
      tinggi={760}
      nilaiAwal={awal}
      onChange={() => setTersimpan('Ada perubahan')}
      status={tersimpan}
      unggah={unggahTiruan}
      pola={POLA}
      cekTambahan={() => [{ ok: Boolean(kategori), teks: 'Kategori dipilih', wajib: true }]}
      panelDokumen={
        <Field label="Kategori">
          <Select
            value={kategori}
            onValueChange={(v) => setKategori(v as string | null)}
            options={[
              { value: 'kampus', label: 'Kabar kampus' },
              { value: 'prestasi', label: 'Prestasi' },
              { value: 'pengumuman', label: 'Pengumuman' },
            ]}
          />
        </Field>
      }
      aksi={(_n, cek) => (
        <>
          <Button variant="ghost" size="sm" onClick={() => setTersimpan(`Tersimpan ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`)}>
            Simpan draf
          </Button>
          <Button size="sm" disabled={cek.some((c) => c.wajib && !c.ok)}>
            Terbitkan
          </Button>
        </>
      )}
    />
  );
}

export function Kanvas() {
  const r = useRiwayatBlok([
    { id: 'x1', tipe: 'judul', data: { teks: 'Visi program studi', tingkat: 2 } },
    { id: 'x2', tipe: 'paragraf', data: { teks: 'Ketik di sini. Tekan <code>/</code> di baris kosong untuk memilih blok.' } },
  ]);
  return (
    <div style={{ display: 'grid', gap: '.75rem' }}>
      <div style={{ display: 'flex', gap: '.5rem' }}>
        <Button variant="outline" size="sm" disabled={!r.bisaUrung} onClick={r.urung}>
          Urungkan
        </Button>
        <Button variant="outline" size="sm" disabled={!r.bisaUlang} onClick={r.ulang}>
          Ulangi
        </Button>
      </div>
      <EditorBlok blok={r.blok} set={r.set} urung={r.urung} ulang={r.ulang} unggah={unggahTiruan} />
    </div>
  );
}

export function Tampil() {
  const [blok] = React.useState(isiContoh);
  const html = React.useMemo(() => blokKeHtml(blok), [blok]);
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <TampilBlok blok={blok} />
      <CodeBlock language="html" filename="blokKeHtml(blok)" code={html.replace(/></g, '>\n<').slice(0, 1800) + '\n…'} maxHeight={260} />
    </div>
  );
}

export function Validasi() {
  const [teks, setTeks] = React.useState(JSON.stringify([{ id: 'a', tipe: 'kolom', data: { rasio: '50-50' }, anak: [[{ id: 'b', tipe: 'kolom', data: {}, anak: [[], []] }], []] }], null, 2));
  const hasil = React.useMemo(() => {
    try {
      const b = validasiBlok(JSON.parse(teks));
      return { ok: true, pesan: `${b.length} blok valid dan siap dikirim.` };
    } catch (e) {
      return { ok: false, pesan: e instanceof GalatBlok ? e.message : 'JSON tidak valid.' };
    }
  }, [teks]);
  return (
    <div style={{ display: 'grid', gap: '.75rem', maxWidth: 560 }}>
      <Field label="Isi blok (JSON)" description="Ubah isinya: hapus kolom di dalam kolom, atau ganti tipe jadi yang tidak dikenal.">
        <Textarea rows={8} value={teks} onChange={(e) => setTeks(e.target.value)} style={{ fontFamily: 'var(--u-font-mono)', fontSize: '.8125rem' }} />
      </Field>
      <Alert variant={hasil.ok ? 'success' : 'danger'} title={hasil.ok ? 'Valid' : 'Ditolak, sama seperti API'}>
        {hasil.pesan}
      </Alert>
    </div>
  );
}
