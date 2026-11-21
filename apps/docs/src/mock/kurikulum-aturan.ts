// Data contoh aturan kurikulum berversi (/v1/kurikulum-aturan) untuk wizard kurikulum, mata kuliah, dan peninjauan.
// Dua versi rekaan: OBE 2025 (kerangka OBE: profil lulusan, CPL, bahan kajian, CPMK, bagian dinamis) dan KBK 2016
// (kerangka lama tanpa bahan kajian/CPMK). Demo bisa berpindah versi lewat setelModeAturan. Penulisan dicatat di
// globalThis.__kirimKurikulum agar uji bisa memeriksa payload.
import { LEWATI, PRODI, tambahRute } from './siakad';

export type ModeAturan = 'obe' | 'kbk' | 'tanpa';
let mode: ModeAturan = 'obe';
export const setelModeAturan = (m: ModeAturan) => {
  mode = m;
  globalThis.dispatchEvent?.(new Event('mode-aturan'));
};
export const modeAturan = () => mode;

type Kirim = { method: string; path: string; body: unknown };
const log = ((globalThis as { __kirimKurikulum?: Kirim[] }).__kirimKurikulum ??= []);
const badan = (init?: RequestInit) => {
  try {
    return JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
  } catch {
    return {};
  }
};
const tulis = (u: URL, init?: RequestInit) => {
  const b = badan(init);
  log.push({ method: init?.method ?? 'GET', path: u.pathname.replace(/^.*\/v1\//, '/v1/'), body: b });
  return b;
};
const baca = (init?: RequestInit) => !init?.method || init.method === 'GET';

const i = (kode: string, nama: string, jenis = 'teks_panjang', wajib = true, lain: Record<string, unknown> = {}) => ({ kode, nama, jenis, wajib, keterangan: '', pilihan: [], min: null, maks: null, relasi: null, ...lain });
const b = (kode: string, nama: string, urutan: number, primitif = true, isian: unknown[] = []) => ({ kode, nama, aktif: true, urutan, keterangan: '', primitif, isian });
const perangkat = (kode: string, nama: string, wajib_untuk: string[]) => ({ kode, nama, wajib_untuk, format: ['pdf'], verifikator: 'kaprodi', pddikti: null, sumber: 'unggah' });

const VERSI = {
  obe: {
    id: 501,
    nama: 'Aturan Kurikulum UNIPO 2025',
    versi: 2,
    status: 'terbit',
    induk_id: 500,
    kerangka: 'obe',
    kerangka_nama: 'Outcome-Based Education (OBE)',
    lingkup: 'universitas',
    kode_fakultas: null,
    kode_prodi: null,
    induk_universitas_id: null,
    angkatan_mulai: 2025,
    angkatan_selesai: null,
    berlaku_mulai: '20251',
    berlaku_selesai: null,
    kurikulum_id: null,
    sumber: 'baru',
    unit: 'BAAK',
    jumlah_mahasiswa: 812,
    berlaku_sekarang: true,
    dasar_hukum: 'Permendiktisaintek 39/2025',
    catatan_perubahan: null,
    diterbitkan_at: '2025-07-14 09:00:00',
    sk: { id: 'sk-112', nomor: '112/UNIPO/SK/VII/2025', tanggal: '2025-07-14', perihal: 'Aturan kurikulum OBE' },
  },
  kbk: {
    id: 401,
    nama: 'Aturan Kurikulum UNIPO 2016',
    versi: 1,
    status: 'terbit',
    induk_id: null,
    kerangka: 'kbk',
    kerangka_nama: 'Kurikulum Berbasis Kompetensi (KBK)',
    lingkup: 'universitas',
    kode_fakultas: null,
    kode_prodi: null,
    induk_universitas_id: null,
    angkatan_mulai: null,
    angkatan_selesai: null,
    berlaku_mulai: '20161',
    berlaku_selesai: null,
    kurikulum_id: null,
    sumber: 'impor_lama',
    unit: 'BAAK',
    jumlah_mahasiswa: 214,
    berlaku_sekarang: true,
    dasar_hukum: 'Kepmendiknas 232/U/2000',
    catatan_perubahan: null,
    diterbitkan_at: '2016-08-01 09:00:00',
    sk: { id: 'sk-045', nomor: '045/UNIPO/SK/VIII/2016', tanggal: '2016-08-01', perihal: 'Kurikulum berbasis kompetensi' },
  },
};

const ISI_UMUM = {
  penilaian: { skala: [], komponen: [], catatan: '' },
  turunan: { boleh: [] },
};
const DETAIL = {
  obe: {
    ...VERSI.obe,
    isi: {
      ...ISI_UMUM,
      struktur: {
        sks_lulus: 144,
        distribusi: { wajib_universitas: 14, wajib_fakultas: 6, wajib_prodi: 100, pilihan: 24, mbkm: 20 },
        sks_semester: [
          { kode: 'awal', dari: 1, sampai: 2, maks: 20 },
          { kode: 'lanjut', dari: 3, sampai: null, maks: 24 },
        ],
        sks_antara_maks: 9,
        masa_studi: { normal: 8, maks: 14 },
      },
      mbkm: { aktif: true, sks_luar_prodi_maks: 40, semester_luar_prodi_maks: 2, semester_mulai: 5, bentuk: [], konversi: '' },
      kelulusan: { sks_min: 144, ipk_min: 2, nilai_d_maks: 10, nilai_e_boleh: false, mk_wajib: [], ta_wajib: true, skpi_wajib: true, syarat_lain: [] },
      obe: { aktif: true, ambang_cpl: 70, ambang_persen_mahasiswa: 70, sumber_nilai: 'komponen', metode_asesmen: [], rubrik: [] },
      mata_kuliah: {
        perangkat: [perangkat('rps', 'RPS', ['teori', 'praktikum', 'lapangan']), perangkat('bahan_ajar', 'Bahan ajar', ['teori', 'praktikum']), perangkat('modul_praktikum', 'Modul praktikum', ['praktikum']), perangkat('rubrik', 'Rubrik penilaian', ['teori', 'praktikum', 'lapangan', 'ta'])],
        pertemuan_min: 14,
        metode: [],
        kategori: [],
        isian_wajib: ['nidn', 'metode', 'cpmk'],
      },
      rujukan: [{ kode: 'struktur', pedoman: 'Permendiktisaintek 39/2025', pasal: 'Pasal 17–18' }],
    },
    kerangka_definisi: {
      id: 31,
      nama: 'Outcome-Based Education (OBE)',
      versi: 1,
      isi: {
        kode: 'obe',
        keterangan: 'Permendiktisaintek 39/2025 (SN-Dikti): CPL, CPMK, sub-CPMK, asesmen dan ketercapaian.',
        bagian: [
          b('profil_lulusan', 'Profil lulusan', 10),
          b('analisis_kebutuhan', 'Analisis kebutuhan', 15, false, [
            i('hasil_tracer', 'Ringkasan tracer study dan survei pengguna'),
            i('metode_analisis', 'Metode analisis', 'pilihan', false, { pilihan: ['SWOT', 'Benchmarking prodi sejenis', 'Survei pengguna lulusan'] }),
          ]),
          b('cpl', 'CPL (sikap, pengetahuan, keterampilan umum/khusus)', 20),
          b('bahan_kajian', 'Bahan kajian', 30),
          b('mk', 'Pembentukan MK & besaran SKS', 40),
          b('struktur', 'Peta kurikulum per semester', 50),
          b('cpmk', 'CPMK & sub-CPMK', 60),
          b('rps', 'RPS', 70),
        ],
        isian_mk: [i('rumpun_keilmuan', 'Rumpun keilmuan', 'pilihan', false, { pilihan: ['Ilmu komputer', 'Rekayasa perangkat lunak', 'Sistem informasi', 'Umum'] })],
        perangkat: [],
        taksonomi: [],
        rps: { bagian: [], kolom_pertemuan: [], pertemuan_min: 14, menit_per_sks: 50, validasi: [] },
        aturan_bawaan: {},
      },
    },
  },
  kbk: {
    ...VERSI.kbk,
    isi: {
      ...ISI_UMUM,
      struktur: { sks_lulus: 144, distribusi: { wajib_universitas: null, wajib_fakultas: null, wajib_prodi: null, pilihan: null, mbkm: null }, sks_semester: [{ kode: 'semua', dari: 1, sampai: null, maks: 24 }], sks_antara_maks: null, masa_studi: { normal: 8, maks: 14 } },
      mbkm: { aktif: false, sks_luar_prodi_maks: null, semester_luar_prodi_maks: null, semester_mulai: null, bentuk: [], konversi: '' },
      kelulusan: { sks_min: 144, ipk_min: 2, nilai_d_maks: null, nilai_e_boleh: false, mk_wajib: [], ta_wajib: true, skpi_wajib: false, syarat_lain: [] },
      obe: { aktif: false, ambang_cpl: null, ambang_persen_mahasiswa: null, sumber_nilai: 'mk', metode_asesmen: [], rubrik: [] },
      mata_kuliah: { perangkat: [perangkat('silabus', 'Silabus', []), perangkat('sap', 'SAP', ['teori', 'praktikum'])], pertemuan_min: 16, metode: [], kategori: [], isian_wajib: ['nidn'] },
      rujukan: [{ kode: 'struktur', pedoman: 'Kepmendiknas 232/U/2000', pasal: 'Pasal 5' }],
    },
    kerangka_definisi: {
      id: 21,
      nama: 'Kurikulum Berbasis Kompetensi (KBK)',
      versi: 1,
      isi: {
        kode: 'kbk',
        keterangan: 'Kepmendiknas 232/U/2000 dan 045/U/2002: kompetensi utama, pendukung, lainnya.',
        bagian: [b('profil_lulusan', 'Profil lulusan', 10), b('cpl', 'Capaian pembelajaran (CP)', 20), b('mk', 'Mata kuliah & SKS', 30), b('struktur', 'Struktur per semester', 40), b('rps', 'RPS/SAP', 50)],
        isian_mk: [],
        perangkat: [],
        taksonomi: [],
        rps: { bagian: [], kolom_pertemuan: [], pertemuan_min: 16, menit_per_sks: 50, validasi: [] },
        aturan_bawaan: {},
      },
    },
  },
};

const isianNilai: Record<string, Record<string, Record<string, unknown>>> = {
  'kurikulum:12': { analisis_kebutuhan: { hasil_tracer: 'Masa tunggu kerja rata-rata 4 bulan; pengguna meminta penguatan keamanan siber dan komunikasi.' } },
};

tambahRute(/\/v1\/kurikulum-aturan$/, (_u, init) => (baca(init) ? { data: mode === 'tanpa' ? [] : [VERSI[mode]] } : LEWATI));
tambahRute(/\/v1\/kurikulum-aturan\/\d+$/, (u, init) => {
  if (!baca(init)) return LEWATI;
  const id = Number(u.pathname.split('/').pop());
  const d = Object.values(DETAIL).find((x) => x.id === id);
  return d ? { data: d } : LEWATI;
});
tambahRute(/\/v1\/kurikulum-aturan\/referensi$/, () => ({
  data: { prodi: PRODI.map((p) => ({ kode_prodi: p.kode_prodi, nama: p.nama_prodi, kode_fakultas: p.kode_fakultas, sks_lulus: 144 })) },
}));
tambahRute(/\/v1\/kurikulum-aturan\/isian$/, (u, init) => {
  const entitas = u.searchParams.get('entitas');
  if (!baca(init)) {
    const x = tulis(u, init) as { entitas: string; kunci: string; bagian: string; nilai: Record<string, unknown> };
    const k = `${x.entitas}:${x.kunci}`;
    isianNilai[k] = { ...(isianNilai[k] ?? {}), [x.bagian]: x.nilai };
    return { data: { nilai: isianNilai[k] } };
  }
  const kunci = `${entitas}:${u.searchParams.get('kunci')}`;
  const def = mode === 'tanpa' ? null : DETAIL[mode].kerangka_definisi.isi;
  const skema = !def
    ? []
    : entitas === 'mk'
      ? def.isian_mk.length
        ? [{ kode: '', nama: 'Isian mata kuliah', isian: def.isian_mk }]
        : []
      : def.bagian.filter((x) => !x.primitif && x.isian.length).map((x) => ({ kode: x.kode, nama: x.nama, isian: x.isian }));
  return { data: { prodi: '55201', skema, kerangka: def ? { id: DETAIL[mode as 'obe'].kerangka_definisi.id, kode: def.kode } : null, nilai: isianNilai[kunci] ?? {} } };
});

// ------------------------------------------------------------------ evaluasi kurikulum (untuk wizard peninjauan)
const JENIS_EVALUASI = [
  { kode: 'evaluasi_cpl', nama: 'Evaluasi CPL tahunan', tingkat: 'prodi', siklus: 'tahunan', siklus_tahun: 1, ppepp: 'evaluasi', masukan: ['cpl', 'edom', 'tracer'], instrumen: [i('analisis', 'Analisis ketercapaian CPL'), i('cpl_kritis', 'CPL di bawah ambang dan MK penyebab'), i('tindak_lanjut', 'Tindak lanjut (pengendalian)')], tahap: [{ kode: 'susun', judul: 'Penyusunan evaluasi', aksi: 'isi', peran: [] }, { kode: 'periksa', judul: 'Pemeriksaan UPM/LPM', aksi: 'periksa', peran: [] }, { kode: 'sahkan', judul: 'Pengesahan Dekan', aksi: 'sahkan', peran: [] }], hasil_versi: false },
  { kode: 'peninjauan', nama: 'Peninjauan kurikulum berkala', tingkat: 'prodi', siklus: 'n_tahun', siklus_tahun: 4, ppepp: 'peningkatan', masukan: ['cpl', 'tracer', 'survei_pengguna'], instrumen: [i('temuan', 'Temuan peninjauan (pemangku kepentingan, keilmuan, regulasi)'), i('rekomendasi', 'Rekomendasi perubahan kurikulum'), i('perubahan_aturan', 'Perubahan aturan yang diusulkan', 'teks_panjang', false)], tahap: [{ kode: 'susun', judul: 'Penyusunan peninjauan', aksi: 'isi', peran: [] }, { kode: 'periksa', judul: 'Pemeriksaan UPM/LPM', aksi: 'periksa', peran: [] }, { kode: 'sahkan', judul: 'Pengesahan Dekan', aksi: 'sahkan', peran: [] }], hasil_versi: true },
];
const EVALUASI = [
  { id: 61, jenis: 'evaluasi_cpl', nama_jenis: 'Evaluasi CPL tahunan', ppepp: 'evaluasi', kode_mk: null, periode: '2025', status: 'disahkan', tahap_ke: 3, tahap_sekarang: null, jumlah_tahap: 3, versi_baru_id: null, updated_at: '2026-02-10 10:00:00' },
  { id: 62, jenis: 'peninjauan', nama_jenis: 'Peninjauan kurikulum berkala', ppepp: 'peningkatan', kode_mk: null, periode: '2026', status: 'proses', tahap_ke: 1, tahap_sekarang: { judul: 'Pemeriksaan UPM/LPM', aksi: 'periksa', peran: [] }, jumlah_tahap: 3, versi_baru_id: null, updated_at: '2026-10-30 10:00:00' },
];
const ISIAN_EVALUASI: Record<number, Record<string, string>> = {
  61: { analisis: 'CPL5 dan CPL8 di bawah ambang 70% pada angkatan 2022.', cpl_kritis: 'CPL8 (keamanan informasi): MK IF503 dan IF402.', tindak_lanjut: 'Tambah praktikum keamanan; tinjau bobot asesmen IF503.' },
  62: { temuan: 'Mitra industri meminta penguatan komputasi awan dan etika data.', rekomendasi: 'Jadikan Komputasi Awan MK wajib peminatan; tambahkan CPMK etika data di IF306.' },
};
tambahRute(/\/v1\/kurikulum-aturan\/evaluasi\/definisi$/, () => ({ data: { aturan: mode === 'tanpa' ? null : { nama: VERSI[mode].nama, versi: VERSI[mode].versi }, jenis: JENIS_EVALUASI, sumber: { cpl: 'Ketercapaian CPL', edom: 'EDOM', tracer: 'Tracer study', survei_pengguna: 'Survei pengguna' } } }));
tambahRute(/\/v1\/kurikulum-aturan\/evaluasi$/, (_u, init) => (baca(init) ? { data: EVALUASI } : LEWATI));
tambahRute(/\/v1\/kurikulum-aturan\/evaluasi\/\d+$/, (u) => {
  const id = Number(u.pathname.split('/').pop());
  const e = EVALUASI.find((x) => x.id === id);
  return e ? { data: { ...e, definisi: JENIS_EVALUASI.find((j) => j.kode === e.jenis), isian: ISIAN_EVALUASI[id] ?? {}, masukan: {}, alur: [], boleh: false } } : LEWATI;
});

// ------------------------------------------------------------------ penulisan kurikulum OBE (wizard)
const K = '/v1/kurikulum-obe';
let urut = 9000;
tambahRute(new RegExp(`${K}/kurikulum$`), (u, init) => {
  if (baca(init)) return LEWATI;
  const x = tulis(u, init);
  return { __status: 201, data: { id: 77, status: 'draf', versi: 1, nama_prodi: PRODI.find((p) => p.kode_prodi === x.kode_prodi)?.nama_prodi, ...x } };
});
tambahRute(new RegExp(`${K}/kurikulum/\\d+$`), (u, init) => {
  if (baca(init)) return LEWATI;
  const x = tulis(u, init);
  return { data: { id: Number(u.pathname.split('/').pop()), status: 'draf', ...x } };
});
tambahRute(new RegExp(`${K}/kurikulum/\\d+/(cpl|profil-lulusan|bahan-kajian|mk|peninjauan)(/\\d+)?$`), (u, init) => {
  if (baca(init)) return LEWATI;
  const x = tulis(u, init);
  return { __status: init?.method === 'POST' ? 201 : 200, data: { id: ++urut, ...x } };
});
tambahRute(new RegExp(`${K}/mk/\\d+(/prasyarat)?$`), (u, init) => {
  if (baca(init)) return LEWATI;
  const x = tulis(u, init);
  return { data: { id: Number(u.pathname.split('/')[u.pathname.endsWith('prasyarat') ? u.pathname.split('/').length - 2 : u.pathname.split('/').length - 1]), ...x } };
});
tambahRute(new RegExp(`${K}/kurikulum/\\d+/matriks/[a-z-]+$`), (u, init) => {
  if (!baca(init)) tulis(u, init);
  return LEWATI;
});
