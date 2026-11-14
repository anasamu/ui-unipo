// Data contoh aplikasi integrasi (katalog RBAC, klien SSO, klien API), log API, dan log aktivitas SSO. Isi rekaan.
import { createSsoAdmin } from 'unipo-ui/siakad';
import { mockFetch, tambahRute } from './siakad';

// Angka acak tetap per kunci.
function acak(kunci: string) {
  let h = 2166136261;
  for (const c of kunci) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const pilih = <T>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)]!;
const body = (init?: RequestInit) => (init?.body ? JSON.parse(String(init.body)) : {}) as Record<string, any>;
const metode = (init?: RequestInit) => ((init?.headers as Record<string, string> | undefined)?.['X-HTTP-Method-Override'] ?? init?.method ?? 'GET').toUpperCase();
const secret = (n = 40) => Array.from({ length: n }, (_, i) => 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[(i * 7 + Date.now()) % 57]).join('');
const iso = (msLalu: number) => new Date(Date.now() - msLalu).toISOString();

const RBAC = [
  {
    id: 1,
    kode: 'siakad',
    nama: 'SIAKAD',
    keterangan: 'Sistem informasi akademik',
    jenis: 'web',
    url: 'https://siakad.unipo.ac.id',
    client_id_sso: 'siakad',
    client_id_api: null,
    sistem: true,
    aktif: true,
    created_at: '2026-11-12',
  },
  {
    id: 2,
    kode: 'pustikom',
    nama: 'Pustikom',
    keterangan: 'Admin pusat aplikasi dan data',
    jenis: 'web',
    url: 'https://pustikom.unipo.ac.id',
    client_id_sso: 'pustikom',
    client_id_api: 'pustikom-bff',
    sistem: true,
    aktif: true,
    created_at: '2026-11-13',
  },
  {
    id: 3,
    kode: 'pmb',
    nama: 'PMB Online',
    keterangan: 'Pendaftaran mahasiswa baru, CBT, dan dasbor panitia',
    jenis: 'web',
    url: 'https://pmb.unipo.ac.id',
    client_id_sso: 'pmb',
    client_id_api: 'pmb-bff',
    sistem: false,
    aktif: true,
    created_at: '2026-11-13',
  },
  {
    id: 4,
    kode: 'elearning',
    nama: 'E-Learning',
    keterangan: 'Kelas daring, tugas, kuis, dan presensi',
    jenis: 'web',
    url: 'https://e-learning.unipo.ac.id',
    client_id_sso: 'elearning',
    client_id_api: 'lms-bff',
    sistem: false,
    aktif: true,
    created_at: '2026-11-13',
  },
  {
    id: 5,
    kode: 'alumni',
    nama: 'Tracer Study',
    keterangan: 'Survei lulusan dan pengguna lulusan',
    jenis: 'web',
    url: 'https://alumni.unipo.ac.id',
    client_id_sso: 'alumni',
    client_id_api: 'tracer-bff',
    sistem: false,
    aktif: true,
    created_at: '2026-11-13',
  },
  {
    id: 6,
    kode: 'humas',
    nama: 'Humas',
    keterangan: 'Ruang redaksi berita dan agenda',
    jenis: 'web',
    url: 'https://humas.unipo.ac.id',
    client_id_sso: 'humas',
    client_id_api: null,
    sistem: false,
    aktif: true,
    created_at: '2026-11-13',
  },
  {
    id: 7,
    kode: 'perpus-mobile',
    nama: 'Perpustakaan Mobile',
    keterangan: 'Aplikasi Android katalog dan peminjaman buku',
    jenis: 'mobile',
    url: null,
    client_id_sso: null,
    client_id_api: 'perpus-mobile',
    sistem: false,
    aktif: true,
    created_at: '2026-11-14',
  },
  {
    id: 8,
    kode: 'sinta-sync',
    nama: 'Sinkron SINTA',
    keterangan: 'Layanan server penarik publikasi dosen',
    jenis: 'layanan',
    url: null,
    client_id_sso: null,
    client_id_api: 'sinta-sync',
    sistem: false,
    aktif: false,
    created_at: '2026-11-10',
  },
];

const SSO = [
  {
    id: 'siakad',
    name: 'SIAKAD',
    redirect_uris: ['https://siakad.unipo.ac.id/sso_login.php'],
    post_logout_redirect_uris: ['https://siakad.unipo.ac.id/index.php'],
    frontchannel_logout_uri: 'https://siakad.unipo.ac.id/sso_login.php?aksi=keluar',
    permission: '',
    portal_url: 'https://siakad.unipo.ac.id',
    active: true,
    logo_url: null as string | null,
    admin: false,
  },
  {
    id: 'pustikom',
    name: 'Pustikom',
    redirect_uris: ['https://pustikom.unipo.ac.id/bff/callback'],
    post_logout_redirect_uris: ['https://pustikom.unipo.ac.id/masuk?keluar=1'],
    frontchannel_logout_uri: '',
    permission: 'pustikom.akses',
    portal_url: 'https://pustikom.unipo.ac.id',
    active: true,
    logo_url: null,
    admin: true,
  },
  {
    id: 'pmb',
    name: 'PMB Online',
    redirect_uris: ['https://pmb.unipo.ac.id/sso/callback'],
    post_logout_redirect_uris: ['https://pmb.unipo.ac.id/'],
    frontchannel_logout_uri: 'https://pmb.unipo.ac.id/sso/logout',
    permission: 'pmb.akses',
    portal_url: 'https://pmb.unipo.ac.id',
    active: true,
    logo_url: null as string | null,
    admin: false,
  },
  {
    id: 'elearning',
    name: 'E-Learning',
    redirect_uris: ['https://e-learning.unipo.ac.id/sso/callback'],
    post_logout_redirect_uris: ['https://e-learning.unipo.ac.id/'],
    frontchannel_logout_uri: 'https://e-learning.unipo.ac.id/sso/logout',
    permission: '',
    portal_url: 'https://e-learning.unipo.ac.id',
    active: true,
    logo_url: null as string | null,
    admin: false,
  },
  {
    id: 'alumni',
    name: 'Tracer Study',
    redirect_uris: ['https://alumni.unipo.ac.id/sso/callback'],
    post_logout_redirect_uris: ['https://alumni.unipo.ac.id/'],
    frontchannel_logout_uri: '',
    permission: '',
    portal_url: 'https://alumni.unipo.ac.id',
    active: true,
    logo_url: null as string | null,
    admin: false,
  },
  {
    id: 'humas',
    name: 'Humas',
    redirect_uris: ['https://humas.unipo.ac.id/sso/callback'],
    post_logout_redirect_uris: ['https://humas.unipo.ac.id/'],
    frontchannel_logout_uri: '',
    permission: 'humas.akses',
    portal_url: 'https://humas.unipo.ac.id',
    active: true,
    logo_url: null as string | null,
    admin: false,
  },
].map((s) => ({ description: '', levels: [] as string[], created_at: '2026-11-13T09:00:00+08:00', updated_at: '2026-11-14T08:12:00+08:00', ...s }));

const KLIEN = [
  {
    id: 'pustikom-bff',
    name: 'Pustikom',
    scopes: ['rbac:admin', 'referensi:read', 'mahasiswa:read', 'dosen:read'],
    allow_user_login: false,
    sso_audience: 'pustikom',
    allowed_ips: ['103.150.12.4'],
    allowed_origins: [],
    rate_limit: null,
    active: true,
    lingkungan: 'live',
  },
  {
    id: 'pmb-bff',
    name: 'PMB Online',
    scopes: ['pmb:read', 'pmb:write', 'referensi:read'],
    allow_user_login: false,
    sso_audience: 'pmb',
    allowed_ips: ['103.150.12.4'],
    allowed_origins: [],
    rate_limit: 600,
    active: true,
    lingkungan: 'live',
  },
  {
    id: 'lms-bff',
    name: 'E-Learning',
    scopes: ['lms:read', 'lms:write', 'krs:read', 'jadwal:read', 'mahasiswa:read', 'nilai:write'],
    allow_user_login: false,
    sso_audience: 'elearning',
    allowed_ips: [],
    allowed_origins: ['https://e-learning.unipo.ac.id'],
    rate_limit: 1200,
    active: true,
    lingkungan: 'live',
  },
  {
    id: 'tracer-bff',
    name: 'Tracer Study',
    scopes: ['tracer:read', 'tracer:write', 'mahasiswa:read'],
    allow_user_login: false,
    sso_audience: 'alumni',
    allowed_ips: [],
    allowed_origins: [],
    rate_limit: null,
    active: true,
    lingkungan: 'development',
  },
  {
    id: 'perpus-mobile',
    name: 'Perpustakaan Mobile',
    scopes: ['mahasiswa:read', 'referensi:read'],
    allow_user_login: true,
    sso_audience: null,
    allowed_ips: [],
    allowed_origins: [],
    rate_limit: 300,
    active: true,
    lingkungan: 'development',
  },
  {
    id: 'sinta-sync',
    name: 'Sinkron SINTA',
    scopes: ['dosen:read', 'lppm:write'],
    allow_user_login: false,
    sso_audience: null,
    allowed_ips: ['10.10.1.20'],
    allowed_origins: [],
    rate_limit: 60,
    active: false,
    lingkungan: 'live',
  },
].map((k) => ({ trust_user_ip: false, prodi: [] as string[], created_at: '2026-11-13T10:00:00+08:00', logo_uri: null, ...k }));

const SCOPE: Record<string, string> = {
  'referensi:read': 'Baca data referensi (prodi, tahun akademik, wilayah)',
  'mahasiswa:read': 'Baca data mahasiswa',
  'mahasiswa:write': 'Ubah data mahasiswa',
  'dosen:read': 'Baca data dosen',
  'krs:read': 'Baca KRS',
  'krs:write': 'Ubah KRS',
  'nilai:read': 'Baca nilai dan KHS',
  'nilai:write': 'Impor nilai',
  'jadwal:read': 'Baca jadwal kuliah',
  'keuangan:read': 'Baca tagihan dan pembayaran',
  'lms:read': 'Baca kelas LMS',
  'lms:write': 'Kelola kelas LMS',
  'pmb:read': 'Baca pendaftar PMB',
  'pmb:write': 'Kelola pendaftaran PMB',
  'tracer:read': 'Baca tracer study',
  'tracer:write': 'Kelola tracer study',
  'lppm:write': 'Kelola penelitian dan pengabdian',
  'rbac:admin': 'Kelola role dan hak akses',
};

const PERAN = [
  ['admin-sistem', 'Administrator sistem', 'ADMIN'],
  ['baak', 'Staf BAAK', 'BAAK'],
  ['keuangan', 'Staf keuangan', 'KEUANGAN'],
  ['dekan', 'Dekan', null],
  ['kaprodi', 'Ketua program studi', 'PRODI'],
  ['dosen', 'Dosen', 'DOSEN'],
  ['mahasiswa', 'Mahasiswa', 'MAHASISWA'],
  ['panitia-pmb', 'Panitia PMB', null],
  ['humas', 'Staf humas', null],
].map(([kode, nama, level], i) => ({ id: i + 1, kode, nama, level_siakad: level, aktif: true }));

// ---------------------------------------------------------------- Log API
const ENDPOINT = [
  ['GET', '/v1/mahasiswa/{nim}', 0.22],
  ['GET', '/v1/krs', 0.14],
  ['GET', '/v1/jadwal', 0.12],
  ['GET', '/v1/referensi/prodi', 0.1],
  ['GET', '/v1/lms/saya', 0.1],
  ['POST', '/v1/lms/kelas/{id}/tugas', 0.05],
  ['GET', '/v1/pmb/pendaftar', 0.07],
  ['PATCH', '/v1/pmb/pendaftar/{id}', 0.04],
  ['GET', '/v1/tracer/responden', 0.05],
  ['POST', '/v1/auth/token', 0.08],
  ['DELETE', '/v1/lms/kelas/{id}/materi/{id}', 0.01],
  ['PUT', '/v1/nilai/impor', 0.02],
] as Array<readonly [string, string, number]>;
const PENGGUNA = ['2355201010', '2355201022', '0912047801', 'baak01', 'panitia02', '2255202007', null, null];

function logPerJam(hari: string, jam: number, client: string | null) {
  const r = acak(`${hari}-${jam}-${client ?? ''}`);
  const sibuk = jam >= 7 && jam <= 21 ? (jam >= 9 && jam <= 15 ? 1 : 0.55) : 0.08;
  const n = Math.round((client ? 14 : 60) * sibuk * (0.6 + r()));
  const out: any[] = [];
  for (let i = 0; i < n; i++) {
    let x = r();
    let ep = ENDPOINT[0]!;
    for (const e of ENDPOINT) {
      if ((x -= e[2]) <= 0) {
        ep = e;
        break;
      }
    }
    const st = r() < 0.035 ? pilih(r, [401, 403, 404, 422, 429]) : r() < 0.006 ? 500 : ep[0] === 'POST' ? 201 : 200;
    const ms = Math.round(40 + r() * 180 + (r() < 0.05 ? r() * 2400 : 0));
    const menit = Math.floor((i / n) * 60);
    out.push({
      waktu: `${hari}T${String(jam).padStart(2, '0')}:${String(menit).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')}+08:00`,
      request_id: `req_${Math.floor(r() * 1e12).toString(36)}`,
      method: ep[0],
      path: ep[1].replace('{nim}', String(2355201000 + Math.floor(r() * 90))).replace(/\{id\}/g, () => String(10 + Math.floor(r() * 400))),
      query: ep[0] === 'GET' && r() < 0.4 ? `page=${1 + Math.floor(r() * 3)}&per_page=20` : null,
      status: st,
      ms,
      client_id: client ?? pilih(r, ['lms-bff', 'lms-bff', 'pmb-bff', 'pustikom-bff', 'tracer-bff', 'perpus-mobile']),
      username: pilih(r, PENGGUNA),
      level: null,
      lingkungan: 'live',
      ip: `103.150.${12 + Math.floor(r() * 4)}.${Math.floor(r() * 250)}`,
    });
  }
  return out;
}
const tglList = (dari: string, sampai: string) => {
  const out: string[] = [];
  for (let t = new Date(`${dari}T00:00:00`); t <= new Date(`${sampai}T00:00:00`) && out.length < 31; t.setDate(t.getDate() + 1)) out.push(t.toLocaleDateString('sv-SE'));
  return out;
};
const sekarang = () => new Date();
function logRentang(u: URL) {
  const sampai = u.searchParams.get('sampai') ?? sekarang().toLocaleDateString('sv-SE');
  const dari = u.searchParams.get('dari') ?? sampai;
  const client = u.searchParams.get('client_id');
  const jamKini = sekarang().getHours();
  const hariKini = sekarang().toLocaleDateString('sv-SE');
  const rows: any[] = [];
  for (const h of tglList(dari, sampai)) for (let j = 0; j < 24 && (h < hariKini || j <= jamKini); j++) rows.push(...logPerJam(h, j, client));
  const st = u.searchParams.get('status');
  const m = u.searchParams.get('method');
  const p = u.searchParams.get('path');
  const user = u.searchParams.get('username');
  return {
    dari,
    sampai,
    rows: rows.filter(
      (r) =>
        (!m || r.method === m) &&
        (!p || r.path.includes(p)) &&
        (!user || r.username === user) &&
        (!st || (st === 'sukses' ? r.status < 400 : st === 'galat' ? r.status >= 400 : /^\dxx$/.test(st) ? Math.floor(r.status / 100) === Number(st[0]) : r.status === Number(st))),
    ),
  };
}
const polaPath = (p: string) => p.replace(/\/\d{2,}(?=\/|$)/g, '/{id}');

tambahRute(/\/v1\/rbac\/log-api\/ringkasan$/, (u) => {
  const { dari, sampai, rows } = logRentang(u);
  const perJam = dari === sampai;
  const seri = new Map<string, { waktu: string; jumlah: number; galat: number }>();
  for (const h of tglList(dari, sampai)) {
    if (perJam) for (let j = 0; j < 24; j++) seri.set(`${h} ${String(j).padStart(2, '0')}:00`, { waktu: `${h} ${String(j).padStart(2, '0')}:00`, jumlah: 0, galat: 0 });
    else seri.set(h, { waktu: h, jumlah: 0, galat: 0 });
  }
  const ep = new Map<string, { endpoint: string; jumlah: number; galat: number; ms: number }>();
  const kl = new Map<string, { client_id: string; jumlah: number; galat: number }>();
  const status = new Map<number, number>();
  const ms: number[] = [];
  const users = new Set<string>();
  for (const r of rows) {
    const k = perJam ? `${r.waktu.slice(0, 10)} ${r.waktu.slice(11, 13)}:00` : r.waktu.slice(0, 10);
    const s = seri.get(k);
    const g = r.status >= 400 ? 1 : 0;
    if (s) (s.jumlah++, (s.galat += g));
    const e = `${r.method} ${polaPath(r.path)}`;
    const x = ep.get(e) ?? { endpoint: e, jumlah: 0, galat: 0, ms: 0 };
    x.jumlah++;
    x.galat += g;
    x.ms += r.ms;
    ep.set(e, x);
    const c = kl.get(r.client_id) ?? { client_id: r.client_id, jumlah: 0, galat: 0 };
    c.jumlah++;
    c.galat += g;
    kl.set(r.client_id, c);
    status.set(r.status, (status.get(r.status) ?? 0) + 1);
    ms.push(r.ms);
    if (r.username) users.add(r.username);
  }
  ms.sort((a, b) => a - b);
  const p = (q: number) => (ms.length ? ms[Math.min(ms.length - 1, Math.ceil(q * ms.length) - 1)]! : 0);
  const g4 = rows.filter((r) => r.status >= 400 && r.status < 500).length;
  const g5 = rows.filter((r) => r.status >= 500).length;
  return {
    data: {
      dari,
      sampai,
      per: perJam ? 'jam' : 'hari',
      jumlah: rows.length,
      galat_4xx: g4,
      galat_5xx: g5,
      tingkat_galat: rows.length ? (g4 + g5) / rows.length : 0,
      ms_rata: ms.length ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length) : 0,
      ms_p50: p(0.5),
      ms_p95: p(0.95),
      pengguna_unik: users.size,
      seri: [...seri.values()],
      status: [...status.entries()].sort((a, b) => a[0] - b[0]).map(([s, j]) => ({ status: s, jumlah: j })),
      endpoint_teratas: [...ep.values()]
        .sort((a, b) => b.jumlah - a.jumlah)
        .slice(0, 8)
        .map(({ ms: t, ...x }) => ({ ...x, ms_rata: Math.round(t / x.jumlah) })),
      klien_teratas: [...kl.values()].sort((a, b) => b.jumlah - a.jumlah).slice(0, 8),
      terpotong: false,
    },
  };
});
tambahRute(/\/v1\/rbac\/log-api$/, (u) => {
  const rows = logRentang(u).rows.sort((a, b) => (a.waktu < b.waktu ? 1 : -1));
  const per = Number(u.searchParams.get('per_page') ?? 50);
  const page = Number(u.searchParams.get('page') ?? 1);
  return { data: rows.slice((page - 1) * per, page * per), meta: { page, per_page: per, total: rows.length, total_pages: Math.max(1, Math.ceil(rows.length / per)) } };
});

// ---------------------------------------------------------------- Katalog, klien API, peran
tambahRute(/\/v1\/rbac\/aplikasi(\/\d+)?$/, (u, init) => {
  const m = metode(init);
  const id = Number(u.pathname.split('/').pop());
  if (m === 'POST') {
    const a = { id: RBAC.length + 1, sistem: false, client_id_sso: null, client_id_api: null, created_at: new Date().toISOString(), ...body(init) };
    RBAC.push(a as never);
    return { __status: 201, data: a };
  }
  if (m === 'PUT' || m === 'PATCH') {
    const a = RBAC.find((x) => x.id === id);
    if (a) Object.assign(a, body(init));
    return { data: a };
  }
  return { data: RBAC, meta: { page: 1, per_page: 100, total: RBAC.length, total_pages: 1 } };
});
tambahRute(/\/v1\/rbac\/klien-api\/[^/]+\/secret$/, () => ({ data: { client_secret: secret() } }));
tambahRute(/\/v1\/rbac\/klien-api(\/[^/]+)?$/, (u, init) => {
  const m = metode(init);
  const id = decodeURIComponent(u.pathname.split('/').pop()!);
  if (m === 'POST') {
    const b = body(init);
    const k = {
      id: String(b.name ?? 'klien')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-'),
      trust_user_ip: false,
      prodi: [],
      rate_limit: null,
      active: true,
      lingkungan: 'development',
      created_at: new Date().toISOString(),
      logo_uri: null,
      ...b,
    };
    KLIEN.push(k as never);
    return { __status: 201, data: { ...k, client_id: k.id, client_secret: secret() } };
  }
  if (m === 'PATCH') {
    const k = KLIEN.find((x) => x.id === id);
    if (k) Object.assign(k, body(init));
    return { data: k };
  }
  return { data: KLIEN };
});
// Didaftarkan setelah rute umum klien-api agar menang (rute terakhir dicek lebih dulu).
tambahRute(/\/v1\/rbac\/klien-api\/scope$/, () => ({ data: SCOPE }));
tambahRute(/\/v1\/rbac\/peran$/, () => ({ data: PERAN, meta: { page: 1, per_page: 100, total: PERAN.length, total_pages: 1 } }));
tambahRute(/\/v1\/rbac\/izin$/, (_u, init) => (metode(init) === 'POST' ? { __status: 201, data: body(init) } : { data: [], meta: { total: 0 } }));
tambahRute(/\/v1\/rbac\/peran-izin$/, (_u, init) => ({ __status: 201, data: body(init) }));

// ---------------------------------------------------------------- SSO admin (lewat BFF)
const EVENT = [
  'login',
  'login',
  'login',
  'authorize',
  'authorize',
  'authorize',
  'logout',
  'logout',
  'login_failed',
  'login_failed',
  'token_authorization_code',
  'token_refresh_token',
  'password_reset_requested',
  'login_suspicious',
  'session_revoked',
  'device_trusted',
];
const NAMA = ['2355201010', '2355201022', '0912047801', 'baak01', 'panitia02', '2255202007', 'admin', 'kaprodi.ti'];
const AUDIT = (() => {
  const r = acak('audit');
  const out: any[] = [];
  let t = 2 * 60_000;
  for (let i = 0; i < 180; i++) {
    const ev = i % 41 === 7 ? pilih(r, ['admin_client_update', 'admin_client_secret', 'admin_session_revoke', 'admin_client_create']) : pilih(r, EVENT);
    const client =
      ev.startsWith('admin') || ev.startsWith('login') || ev === 'logout' || ev.startsWith('password')
        ? r() < 0.6
          ? pilih(r, ['siakad', 'elearning', 'pmb', 'alumni', 'pustikom'])
          : ''
        : pilih(r, ['siakad', 'elearning', 'pmb', 'alumni', 'humas']);
    const detail =
      ev === 'login_failed'
        ? pilih(r, ['password salah', 'password salah (3x)', 'akun tidak dikenal'])
        : ev === 'login_suspicious'
          ? 'perangkat baru, jaringan baru'
          : ev === 'admin_client_update'
            ? 'redirect_uris, permission'
            : ev === 'admin_session_revoke'
              ? '2355201022: 2'
              : ev === 'session_revoked'
                ? 'dari halaman keamanan akun'
                : '';
    out.push({
      id: 5000 - i,
      time: iso(t),
      event: ev,
      username: ev.startsWith('token') ? '' : ev.startsWith('admin') ? 'admin' : pilih(r, NAMA),
      client_id: client,
      ip: `103.150.${12 + Math.floor(r() * 4)}.${Math.floor(r() * 250)}`,
      detail,
    });
    t += Math.floor(r() * 9 * 60_000) + 20_000;
  }
  return out;
})();
const GRUP_LIKE = (e: string, g: string) => e === g || e.startsWith(`${g}_`);

tambahRute(/\/bff\/sso\/audit$/, (u) => {
  const s = u.searchParams;
  let rows = AUDIT.filter(
    (r) =>
      (!s.get('username') || r.username === s.get('username')) &&
      (!s.get('client_id') || r.client_id === s.get('client_id')) &&
      (!s.get('grup') || GRUP_LIKE(r.event, s.get('grup')!)) &&
      (!s.get('q') || [r.username, r.client_id, r.ip, r.detail].some((x) => x.includes(s.get('q')!))) &&
      (!s.get('dari') || r.time.slice(0, 10) >= s.get('dari')!) &&
      (!s.get('sampai') || r.time.slice(0, 10) <= s.get('sampai')!),
  );
  const perEvent = new Map<string, number>();
  for (const r of rows) perEvent.set(r.event, (perEvent.get(r.event) ?? 0) + 1);
  if (s.get('event')) rows = rows.filter((r) => s.get('event')!.split(',').includes(r.event));
  const per = Number(s.get('per_page') ?? 50);
  const page = Number(s.get('page') ?? 1);
  return {
    data: rows.slice((page - 1) * per, page * per),
    meta: {
      page,
      per_page: per,
      total: rows.length,
      last_page: Math.max(1, Math.ceil(rows.length / per)),
      per_event: [...perEvent.entries()].sort((a, b) => b[1] - a[1]).map(([event, jumlah]) => ({ event, jumlah })),
    },
  };
});
tambahRute(/\/bff\/sso\/users\/[^/]+\/security$/, (u) => {
  const nama = decodeURIComponent(u.pathname.split('/')[4]!);
  const r = acak(`sec-${nama}`);
  return {
    data: {
      username: nama,
      sessions: [
        {
          id: 's1',
          device: 'Chrome di Windows',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/131',
          ip: '103.150.12.40',
          last_ip: '103.150.12.40',
          auth_time: iso(3 * 3600_000),
          last_seen: iso(4 * 60_000),
          expires_at: iso(-5 * 3600_000),
        },
        {
          id: 's2',
          device: 'Safari di iPhone',
          user_agent: 'Mozilla/5.0 (iPhone) Safari/604',
          ip: '114.79.4.12',
          last_ip: '114.79.6.88',
          auth_time: iso(26 * 3600_000),
          last_seen: iso(2 * 3600_000),
          expires_at: iso(-30 * 24 * 3600_000),
        },
      ],
      history: Array.from({ length: 12 }, (_, i) => {
        const gagal = i === 3 || i === 4 || (i === 9 && r() < 0.9);
        const curiga = i === 5;
        return {
          time: iso((i * 7 + 1) * 3600_000 + Math.floor(r() * 3600_000)),
          status: i === 4 ? 'diblokir' : gagal ? 'gagal' : i === 7 ? 'diakhiri' : 'ok',
          device: pilih(r, ['Chrome di Windows', 'Safari di iPhone', 'Firefox di Ubuntu']),
          ip: `${pilih(r, ['103.150.12', '114.79.4', '36.85.110'])}.${Math.floor(r() * 250)}`,
          flags: curiga ? ['perangkat_baru', 'jaringan_baru', 'setelah_gagal'] : i === 0 ? ['dipercaya'] : [],
          suspicious: curiga,
        };
      }),
    },
  };
});
tambahRute(/\/bff\/sso\/users\/[^/]+\/revoke$/, () => ({ data: { revoked: 2 } }));
tambahRute(/\/bff\/sso\/clients\/[a-z0-9_]+\/secret$/, () => ({ data: { client_secret: secret(48) } }));
tambahRute(/\/bff\/sso\/clients\/[a-z0-9_]+\/logo$/, (u, init) => {
  const id = u.pathname.split('/')[4];
  const s = SSO.find((x) => x.id === id);
  if (s) s.logo_url = metode(init) === 'DELETE' ? null : (body(init).data as string);
  return { data: s };
});
tambahRute(/\/bff\/sso\/clients(\/[a-z0-9_]+)?$/, (u, init) => {
  const m = metode(init);
  const id = u.pathname.split('/')[4];
  if (m === 'POST') {
    const b = body(init);
    const s = {
      description: '',
      levels: [],
      frontchannel_logout_uri: '',
      permission: '',
      portal_url: '',
      active: true,
      logo_url: null,
      admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      redirect_uris: [],
      post_logout_redirect_uris: [],
      ...b,
    };
    SSO.push(s as never);
    return { __status: 201, data: { ...s, client_secret: secret(48) } };
  }
  if (m === 'PATCH') {
    const s = SSO.find((x) => x.id === id);
    if (s) Object.assign(s, body(init), { updated_at: new Date().toISOString() });
    return { data: s };
  }
  if (id) return { data: SSO.find((x) => x.id === id) };
  return { data: SSO };
});

/** Klien admin SSO untuk situs dokumentasi (BFF tiruan). */
export const ssoDemo = createSsoAdmin({ baseUrl: 'https://pustikom.unipo.ac.id/bff/sso', fetch: mockFetch });
