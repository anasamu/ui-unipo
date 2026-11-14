// Data contoh detail akademik (mahasiswa, dosen, jadwal) dan navigasi portal (situs, menu, FAQ). Isi rekaan.
import { DOSEN, MAHASISWA, MATA_KULIAH, tambahRute } from './siakad';

// Angka acak tetap per kunci, agar data sama di setiap muat ulang.
function acak(kunci: string) {
  let h = 2166136261;
  for (const c of kunci) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const HURUF: Array<[string, number]> = [
  ['A', 4],
  ['A-', 3.75],
  ['B+', 3.5],
  ['B', 3],
  ['B-', 2.75],
  ['C+', 2.5],
  ['C', 2],
  ['D', 1],
  ['E', 0],
];
const MK_SEMESTER: Array<Array<[string, string, number]>> = [
  [
    ['MKU101', 'Pendidikan Pancasila', 2],
    ['MKU102', 'Bahasa Indonesia', 2],
    ['INF101', 'Algoritma dan Pemrograman', 4],
    ['INF102', 'Matematika Diskret', 3],
    ['INF103', 'Pengantar Teknologi Informasi', 3],
    ['INF104', 'Logika Informatika', 3],
    ['MKU103', 'Bahasa Inggris I', 2],
  ],
  [
    ['MKU201', 'Pendidikan Kewarganegaraan', 2],
    ['INF201', 'Struktur Data', 4],
    ['INF202', 'Aljabar Linear', 3],
    ['INF203', 'Sistem Digital', 3],
    ['INF204', 'Basis Data', 4],
    ['INF205', 'Statistika', 3],
  ],
  [
    ['INF301', 'Pemrograman Berorientasi Objek', 4],
    ['INF302', 'Sistem Operasi', 3],
    ['INF303', 'Jaringan Komputer', 3],
    ['INF304', 'Interaksi Manusia dan Komputer', 3],
    ['INF305', 'Analisis dan Desain Algoritma', 3],
    ['MKU301', 'Kewirausahaan', 2],
  ],
  [
    ['INF401', 'Pemrograman Web', 4],
    ['INF402', 'Rekayasa Perangkat Lunak', 3],
    ['INF403', 'Kecerdasan Buatan', 3],
    ['INF404', 'Keamanan Informasi', 3],
    ['INF405', 'Grafika Komputer', 3],
    ['INF406', 'Metode Numerik', 3],
  ],
  [
    ['INF501', 'Pembelajaran Mesin', 3],
    ['INF502', 'Pemrograman Perangkat Bergerak', 4],
    ['INF503', 'Komputasi Awan', 3],
    ['INF504', 'Manajemen Proyek TI', 3],
    ['INF505', 'Data Mining', 3],
    ['MKU501', 'Metodologi Penelitian', 2],
  ],
  [
    ['INF601', 'Kerja Praktik', 3],
    ['INF602', 'Pengolahan Citra Digital', 3],
    ['INF603', 'Sistem Terdistribusi', 3],
    ['INF604', 'Etika Profesi', 2],
    ['INF605', 'Internet of Things', 3],
    ['MKU601', 'Kuliah Kerja Nyata', 4],
  ],
  [
    ['INF701', 'Seminar Proposal', 2],
    ['INF702', 'Visi Komputer', 3],
    ['INF703', 'Pemrosesan Bahasa Alami', 3],
  ],
  [['INF801', 'Skripsi', 6]],
];
const HARI_JAM = [
  ['1', '07:30', '10:00'],
  ['1', '10:15', '12:45'],
  ['2', '08:00', '10:30'],
  ['3', '13:00', '15:30'],
  ['4', '07:30', '09:10'],
  ['4', '10:00', '12:30'],
  ['5', '08:00', '10:30'],
];
const RUANG = ['R.201', 'R.202', 'Lab Komputer 1', 'Lab Komputer 2', 'R.305', 'Aula Mini'];
const TAHUN_AKTIF = 20251;

function periodeMahasiswa(m: (typeof MAHASISWA)[number]) {
  const th = Number(m.tahun_masuk);
  const out: string[] = [];
  for (let t = th; out.length < 14; t++) {
    for (const s of [1, 2]) {
      const id = `${t}${s}`;
      if (Number(id) > TAHUN_AKTIF) return out;
      out.push(id);
    }
  }
  return out;
}

function riwayat(nim: string) {
  const m = MAHASISWA.find((x) => x.nim === nim) ?? MAHASISWA[0]!;
  const r = acak(nim);
  const kuat = 0.25 + (m.ipk - 2.6) / 1.4; // mahasiswa ber-IPK tinggi cenderung dapat A
  const semua = periodeMahasiswa(m);
  const cutiIdx = m.status_aktif === 'C' ? semua.length - 1 : r() < 0.18 && semua.length > 4 ? 2 + Math.floor(r() * (semua.length - 3)) : -1;
  let kumSks = 0;
  let kumMutu = 0;
  let smt = 0;
  const periode: Array<Record<string, unknown>> = [];
  const status: Array<Record<string, unknown>> = [];
  semua.forEach((t, i) => {
    if (i === cutiIdx) {
      status.push({ tahun_id: t, status: 'C', total_sks: kumSks, total_ipk: kumSks ? +(kumMutu / kumSks).toFixed(2) : 0 });
      return;
    }
    if (t === String(TAHUN_AKTIF) && ['L', 'K', 'D'].includes(m.status_aktif)) return;
    const daftar = MK_SEMESTER[Math.min(smt, MK_SEMESTER.length - 1)]!;
    smt++;
    const aktif = t === String(TAHUN_AKTIF);
    const mk = daftar.map(([kode, nama, sks]) => {
      const x = Math.max(0, Math.min(HURUF.length - 1, Math.floor((1 - kuat) * 4 + r() * 4 - 0.5)));
      const [h, b] = HURUF[x]!;
      return aktif
        ? { kode_mk: kode, nama_mk: nama, sks, tahun_id: t, semester: smt, nilai_huruf: null, bobot: null, mutu: null, nilai_ditampilkan: false }
        : { kode_mk: kode, nama_mk: nama, sks, tahun_id: t, semester: smt, nilai_huruf: h, bobot: b, mutu: b * sks };
    });
    const sks = mk.reduce((a, x) => a + x.sks, 0);
    if (!aktif) {
      const mutu = mk.reduce((a, x) => a + (x.mutu ?? 0), 0);
      kumSks += sks;
      kumMutu += mutu;
      periode.push({ nim, tahun_id: t, mata_kuliah: mk, jumlah_sks: sks, ips: { sks, nilai: +(mutu / sks).toFixed(2) }, ipk: { sks: kumSks, nilai: +(kumMutu / kumSks).toFixed(2) } });
    } else periode.push({ nim, tahun_id: t, mata_kuliah: mk, jumlah_sks: sks, ips: null, ipk: { sks: kumSks, nilai: kumSks ? +(kumMutu / kumSks).toFixed(2) : null } });
    status.push({ tahun_id: t, status: 'A', total_sks: kumSks, total_ipk: kumSks ? +(kumMutu / kumSks).toFixed(2) : 0 });
  });
  return { m, periode, status, smt, kumSks, kumMutu, aktifMk: aktifMkDari(periode) };
}
function aktifMkDari(periode: Array<Record<string, unknown>>) {
  const p = periode.find((x) => x.tahun_id === String(TAHUN_AKTIF));
  return (p?.mata_kuliah as Array<Record<string, unknown>> | undefined) ?? [];
}

tambahRute(/\/v1\/mahasiswa\/[^/]+\/status-semester$/, (u) => {
  const nim = decodeURIComponent(u.pathname.split('/')[3]!);
  const h = riwayat(nim);
  return { data: { nim, status_semester: h.status, cuti: h.status.filter((s) => s.status === 'C').map((s) => ({ tahun_id: s.tahun_id, status_cuti: 'disetujui' })) } };
});
tambahRute(/\/v1\/mahasiswa\/[^/]+\/khs$/, (u) => {
  const nim = decodeURIComponent(u.pathname.split('/')[3]!);
  const h = riwayat(nim);
  return { data: { nim, periode: h.periode.filter((p) => p.ips) } };
});
tambahRute(/\/v1\/mahasiswa\/[^/]+\/transkrip$/, (u) => {
  const nim = decodeURIComponent(u.pathname.split('/')[3]!);
  const h = riwayat(nim);
  const mk = h.periode.filter((p) => p.ips).flatMap((p) => p.mata_kuliah as Array<Record<string, unknown>>);
  return { data: { nim, mata_kuliah: mk, jumlah_sks: h.kumSks, jumlah_mutu: h.kumMutu, ipk: { sks: h.kumSks, nilai: h.kumSks ? +(h.kumMutu / h.kumSks).toFixed(2) : null } } };
});
tambahRute(/\/v1\/mahasiswa\/[^/]+\/krs$/, (u) => {
  const nim = decodeURIComponent(u.pathname.split('/')[3]!);
  const h = riwayat(nim);
  const r = acak(nim + 'krs');
  const mk = h.aktifMk.map((x, i) => {
    const [hari, mulai, selesai] = HARI_JAM[(i + Math.floor(r() * 3)) % HARI_JAM.length]!;
    return {
      idkrs: i + 1,
      kode_mk: x.kode_mk,
      nama_mk: x.nama_mk,
      sks: x.sks,
      kelas: ['A', 'B'][i % 2],
      hari,
      jam_mulai: mulai,
      jam_selesai: selesai,
      ruang: RUANG[i % RUANG.length],
      disetujui: i < h.aktifMk.length - (nim.endsWith('3') ? 2 : 0),
    };
  });
  return { data: { nim, tahun_id: String(TAHUN_AKTIF), jumlah_sks: mk.reduce((a, x) => a + Number(x.sks), 0), mata_kuliah: mk } };
});
tambahRute(/\/v1\/mahasiswa\/[^/]+$/, (u) => {
  const nim = decodeURIComponent(u.pathname.split('/')[3]!);
  const h = riwayat(nim);
  const m = h.m;
  const r = acak(nim + 'bio');
  const pa = DOSEN.find((d) => d.kode_prodi === m.kode_prodi) ?? DOSEN[0]!;
  const lulus = m.status_aktif === 'L';
  return {
    data: {
      ...m,
      kode_jenjang: 'S1',
      semester: h.smt,
      status_masuk: r() < 0.1 ? 'P' : 'B',
      semester_masuk: `${m.tahun_masuk}1`,
      tanggal_masuk: `${m.tahun_masuk}-09-0${1 + Math.floor(r() * 8)}`,
      batas_studi: `${Number(m.tahun_masuk) + 7}2`,
      nidn_pa: pa.nidn,
      nama_pa: pa.nama_lengkap,
      jenis_kelamin: r() < 0.5 ? 'L' : 'P',
      agama: 'Islam',
      ...(lulus ? { tanggal_lulus: `${Number(m.tahun_masuk) + 4}-08-24`, no_ijazah: `${m.kode_prodi}${Number(m.tahun_masuk) + 4}${String(Math.floor(r() * 900) + 100)}` } : {}),
      pribadi: {
        tempat_lahir: ['Marisa', 'Gorontalo', 'Limboto', 'Paguat', 'Tilamuta'][Math.floor(r() * 5)],
        tanggal_lahir: `${Number(m.tahun_masuk) - 18}-0${1 + Math.floor(r() * 9)}-1${Math.floor(r() * 9)}`,
        email: `${m.nama.toLowerCase().split(' ')[0]}.${nim.slice(-4)}@mhs.unipo.ac.id`,
        hp: `0852${String(Math.floor(r() * 1e8)).padStart(8, '0')}`,
        alamat: { jalan: `Jl. Trans Sulawesi No. ${Math.floor(r() * 120) + 1}`, rt: '002', rw: '001', desa: 'Botubilotahu', kecamatan: 'Marisa' },
      },
      asal: { nama_sekolah: ['SMA Negeri 1 Marisa', 'SMK Negeri 1 Duhiadaa', 'MA Negeri Pohuwato', 'SMA Negeri 1 Paguat'][Math.floor(r() * 4)], tahun_lulus_sekolah: Number(m.tahun_masuk) },
    },
  };
});

// ---------------------------------------------------------------- Dosen
function jadwalDosen(nidn: string) {
  const r = acak(nidn + 'jadwal');
  const pilih = MK_SEMESTER.flat()
    .filter(() => r() < 0.14)
    .slice(0, 5);
  return pilih.map(([kode, nama, sks], i) => {
    const [hari, mulai, selesai] = HARI_JAM[(i * 2 + Math.floor(r() * 3)) % HARI_JAM.length]!;
    return {
      idj: Number(nidn.slice(-4)) * 10 + i,
      kode_mk: kode,
      nama_mk: nama,
      sks,
      kelas: ['A', 'B', 'C'][i % 3],
      hari,
      jam_mulai: mulai,
      jam_selesai: selesai,
      nama_ruang: RUANG[(i + 2) % RUANG.length],
      jumlah_peserta: 20 + Math.floor(r() * 18),
      kapasitas: 40,
    };
  });
}
tambahRute(/\/v1\/dosen\/[^/]+\/jadwal$/, (u) => ({ data: jadwalDosen(decodeURIComponent(u.pathname.split('/')[3]!)) }));
tambahRute(/\/v1\/dosen\/[^/]+\/mahasiswa-bimbingan$/, (u) => {
  const nidn = decodeURIComponent(u.pathname.split('/')[3]!);
  const d = DOSEN.find((x) => x.nidn === nidn) ?? DOSEN[0]!;
  return { data: MAHASISWA.filter((m) => m.kode_prodi === d.kode_prodi && m.status_aktif === 'A').slice(0, 7) };
});
tambahRute(/\/v1\/dosen\/[^/]+$/, (u) => {
  const nidn = decodeURIComponent(u.pathname.split('/')[3]!);
  const d = DOSEN.find((x) => x.nidn === nidn) ?? DOSEN[0]!;
  const r = acak(nidn);
  return {
    data: {
      ...d,
      kode_jenjang: 'S1',
      status_aktif: d.status === 'A' ? 'A' : 'T',
      ikatan_kerja: r() < 0.8 ? 'Dosen tetap' : 'Dosen tidak tetap',
      pendidikan: d.nama_lengkap.startsWith('Dr.') ? 'S3' : 'S2',
      nip: `19${80 + Math.floor(r() * 15)}0${1 + Math.floor(r() * 8)}1${Math.floor(r() * 9)}20${10 + Math.floor(r() * 12)}0${Math.floor(r() * 9)}1${Math.floor(r() * 9)}00${Math.floor(r() * 9)}`,
      status_pegawai: 'Pegawai tetap yayasan',
      pangkat_golongan: ['Penata Muda Tk. I (III/b)', 'Penata (III/c)', 'Penata Tk. I (III/d)', 'Pembina (IV/a)'][Math.floor(r() * 4)],
      jabatan_struktural: r() < 0.25 ? 'Ketua Program Studi' : null,
      mulai_masuk: `20${10 + Math.floor(r() * 12)}-0${1 + Math.floor(r() * 8)}-01`,
      pribadi: { email: `${d.nama.toLowerCase().split(' ')[0]}@unipo.ac.id`, hp: `0813${String(Math.floor(r() * 1e8)).padStart(8, '0')}` },
    },
  };
});

// ---------------------------------------------------------------- Jadwal per MK (kelas dibuka)
tambahRute(/\/v1\/jadwal$/, (u) => {
  const kode = u.searchParams.get('kode_mk') ?? '';
  const mk = MATA_KULIAH.find((m) => m.kode_mk === kode);
  const r = acak(kode);
  const jumlah = 1 + Math.floor(r() * 3);
  return {
    data: Array.from({ length: jumlah }, (_, i) => {
      const [hari, mulai] = HARI_JAM[(i * 3 + Math.floor(r() * 4)) % HARI_JAM.length]!;
      const d = DOSEN[(Math.floor(r() * DOSEN.length) + i) % DOSEN.length]!;
      return {
        idj: i + 1,
        kode_mk: kode,
        nama_mk: mk?.nama_mk,
        kelas: ['A', 'B', 'C'][i],
        hari,
        jam_mulai: mulai,
        nama_ruang: RUANG[(i + 1) % RUANG.length],
        dosen: { nidn: d.nidn, nama: d.nama_lengkap },
        jumlah_peserta: 18 + Math.floor(r() * 22),
        kapasitas: 40,
      };
    }),
  };
});

// ---------------------------------------------------------------- Portal: situs, menu, FAQ
const SITUS: Record<string, Record<string, unknown>> = {
  univ: { id: 1, kode: 'univ', jenis: 'universitas', nama: 'Universitas Pohuwato', singkatan: 'UNIPO', tagline: 'Unggul, Berkarakter, Berdaya Saing', domain: 'unipo.ac.id', logo: null },
  tracer: { id: 7, kode: 'tracer', jenis: 'unit', nama: 'Tracer Study', tagline: 'Universitas Pohuwato', domain: 'alumni.unipo.ac.id', logo: null },
  fikom: { id: 3, kode: 'fikom', jenis: 'fakultas', nama: 'Fakultas Ilmu Komputer', singkatan: 'FIKOM', tagline: 'Universitas Pohuwato', logo: null },
};
tambahRute(/\/v1\/portal\/situs\/[^/]+$/, (u) => {
  const k = decodeURIComponent(u.pathname.split('/')[4]!);
  return SITUS[k] ? { data: SITUS[k] } : { __status: 404, error: { code: 'tidak_ditemukan', message: 'Situs tidak ditemukan' } };
});

let id = 100;
const mn = (label: string, url?: string, anak: unknown[] = [], tipe = 'url') => ({ id: ++id, label, tipe, url: url ?? null, tab_baru: 0, anak });
const MENU_UTAMA = [
  mn('Beranda', '/'),
  mn('Profil', undefined, [mn('Sejarah', '/profil/sejarah'), mn('Visi dan misi', '/profil/visi-misi'), mn('Struktur organisasi', '/profil/struktur'), mn('Akreditasi', '/profil/akreditasi')]),
  mn('Akademik', undefined, [
    mn('Fakultas', undefined, [
      mn('Fakultas Ilmu Komputer', '/fakultas/fikom'),
      mn('Fakultas Ekonomi', '/fakultas/fe'),
      mn('Fakultas Hukum', '/fakultas/fh'),
      mn('Fakultas Pertanian', '/fakultas/faperta'),
    ]),
    mn('Program studi', undefined, [
      mn('Informatika', '/prodi/informatika'),
      mn('Sistem Informasi', '/prodi/si'),
      mn('Manajemen', '/prodi/manajemen'),
      mn('Akuntansi', '/prodi/akuntansi'),
      mn('Ilmu Hukum', '/prodi/hukum'),
    ]),
    mn('Layanan', undefined, [
      mn('Kalender akademik', '/kalender'),
      mn('SIAKAD', 'https://siakad.unipo.ac.id'),
      mn('E-learning', 'https://e-learning.unipo.ac.id'),
      mn('Perpustakaan', '/perpustakaan'),
    ]),
  ]),
  mn('Berita', 'berita', [], 'modul'),
  mn('Penelitian', '/penelitian'),
  mn('Kontak', '/kontak'),
];
tambahRute(/\/v1\/portal\/situs\/[^/]+\/menu$/, () => ({ data: { utama: MENU_UTAMA } }));

const KAT = { pmb: { id: 1, nama: 'Pendaftaran' }, akd: { id: 2, nama: 'Akademik' }, keu: { id: 3, nama: 'Keuangan' }, akun: { id: 4, nama: 'Akun dan SSO' } };
const FAQ = [
  [
    KAT.pmb,
    'Kapan pendaftaran mahasiswa baru dibuka?',
    'Pendaftaran dibuka dalam tiga gelombang: Februari sampai April, Mei sampai Juli, dan Agustus. Jadwal pasti setiap gelombang tampil di pmb.unipo.ac.id.',
  ],
  [
    KAT.pmb,
    'Berkas apa saja yang perlu disiapkan saat mendaftar?',
    'Pas foto berlatar merah, scan ijazah atau surat keterangan lulus, kartu keluarga, dan KTP. Semua berkas diunggah dalam bentuk PDF atau JPG paling besar 2 MB.',
  ],
  [KAT.pmb, 'Apakah ada jalur beasiswa?', 'Ada. Beasiswa KIP Kuliah, beasiswa prestasi akademik, dan beasiswa hafiz Al-Qur’an. Pilih jalur beasiswa saat mengisi formulir pendaftaran.'],
  [
    KAT.akd,
    'Bagaimana cara mengisi KRS?',
    'Masuk ke SIAKAD, buka menu KRS, pilih mata kuliah yang ditawarkan, lalu ajukan ke dosen pembimbing akademik.\nKRS baru berlaku setelah disetujui dosen PA.',
  ],
  [KAT.akd, 'Berapa batas maksimal SKS per semester?', 'Semester 1 dan 2 paling banyak 20 SKS. Mulai semester 3, batasnya mengikuti IPS semester sebelumnya: IPS di atas 3,00 boleh sampai 24 SKS.'],
  [
    KAT.akd,
    'Bagaimana mengajukan cuti akademik?',
    'Ajukan lewat menu Layanan Akademik di SIAKAD paling lambat dua minggu sebelum perkuliahan dimulai. Cuti paling lama dua semester selama masa studi.',
  ],
  [KAT.keu, 'Kapan batas pembayaran UKT?', 'Pembayaran UKT dibuka empat minggu sebelum semester dimulai dan ditutup pada minggu pertama perkuliahan.'],
  [KAT.keu, 'Apakah UKT bisa dicicil?', 'Bisa, maksimal tiga kali. Ajukan permohonan cicilan ke Biro Keuangan sebelum batas pembayaran.'],
  [KAT.akun, 'Saya lupa password SSO, bagaimana?', 'Buka sso.unipo.ac.id, pilih Lupa password, lalu masukkan email yang terdaftar. Tautan atur ulang berlaku 30 menit.'],
  [KAT.akun, 'Apakah satu akun bisa dipakai untuk semua aplikasi?', 'Ya. Akun SSO dipakai untuk SIAKAD, e-learning, tracer study, dan aplikasi kampus lainnya.'],
].map(([k, p, j], i) => ({ id: i + 1, kategori: k, pertanyaan: p, jawaban: j, urutan: i }));
tambahRute(/\/v1\/portal\/faq$/, (u) => {
  const kat = u.searchParams.get('kategori');
  const q = (u.searchParams.get('q') ?? '').toLowerCase();
  const data = FAQ.filter((f) => (!kat || String((f.kategori as { id: number }).id) === kat) && (!q || String(f.pertanyaan).toLowerCase().includes(q)));
  return { data, meta: { total: data.length, page: 1, per_page: 100 } };
});
