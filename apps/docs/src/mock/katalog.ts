// Server tiruan dari katalog OpenAPI: setiap endpoint /v1 yang belum punya rute khusus dijawab dengan data contoh
// yang dibuat dari skemanya, dan menjalankan aturan yang sama dengan backend (validasi 422, alur status 409).
// Semua data fiktif dan hanya hidup di memori peramban.
import { INDEKS_KATALOG, judulOperasi, kolomStatus, muatModulKatalog, validasiBody, type ModulKatalog, type Operasi, type Skema } from 'unipo-ui/katalog';
import { setelCadangan } from './siakad';

const NAMA = ['Ahmad Lamato', 'Siti Rahmawati', 'Rizky Saputra', 'Nur Pakaya', 'Fadli Hasan', 'Dewi Gobel', 'Andi Usman', 'Putri Daud', 'Wulan Ismail', 'Yusuf Kadir', 'Indah Hulopi', 'Fajar Puluhulawa'];
const JUDUL = [
  'Program Beasiswa Prestasi 2026',
  'Peminjaman Aula Rektorat',
  'Seminar Nasional Teknologi Pertanian',
  'Pelatihan Penulisan Proposal Hibah',
  'Kunjungan Industri ke Gorontalo',
  'Audit Mutu Internal Semester Ganjil',
  'Pengabdian Desa Marisa',
  'Lomba Karya Tulis Ilmiah',
  'Rapat Koordinasi Akreditasi',
  'Bakti Sosial Ormawa',
  'Workshop Kurikulum OBE',
  'Pameran Karier Alumni',
];
const KOTA = ['Marisa', 'Gorontalo', 'Limboto', 'Tilamuta', 'Kwandang', 'Suwawa'];

function nilaiContoh(nama: string, s: Skema, i: number): unknown {
  if (s.e?.length) {
    const e = s.e.filter((x) => x !== null);
    return e[(i * 7 + nama.length) % e.length];
  }
  if (s.t === 'boolean') return i % 3 !== 1;
  if (s.t === 'integer') {
    if (/_id$/.test(nama)) return (i % 6) + 1;
    const min = s.min ?? 1;
    const max = Math.min(s.mx ?? 120, min + 200);
    return min + ((i * 13) % Math.max(1, max - min + 1));
  }
  if (s.t === 'number') return /nominal|biaya|tarif|anggaran|pagu|jumlah|harga|honor/.test(nama) ? (5 + ((i * 7) % 20)) * 250000 : Math.round((2.5 + ((i * 37) % 150) / 100) * 100) / 100;
  if (s.t === 'array') return s.i?.e ? s.i.e.slice(0, 2) : [];
  if (s.t === 'object') return {};
  if (s.f === 'date') return `2026-${String(1 + (i % 12)).padStart(2, '0')}-${String(3 + ((i * 5) % 25)).padStart(2, '0')}`;
  if (s.f === 'date-time') return `2026-${String(1 + (i % 12)).padStart(2, '0')}-${String(3 + ((i * 5) % 25)).padStart(2, '0')} ${String(8 + (i % 9)).padStart(2, '0')}:00:00`;
  if (s.f === 'email' || /email/.test(nama)) return `${NAMA[i % NAMA.length].split(' ')[0].toLowerCase()}${i}@unipo.ac.id`;
  if (s.f === 'uri' || /url/.test(nama)) return `https://unipo.ac.id/contoh/${i + 1}`;
  if (/m_mahasiswa\.NIM/.test(s.ds ?? '') || nama === 'nim') return `2155201${String(101 + i).padStart(4, '0')}`;
  if (/m_dosen\.NIDN/.test(s.ds ?? '') || nama === 'nidn') return `09${String(10 + (i % 20)).padStart(2, '0')}078301`;
  if (/kode_prodi/.test(nama)) return ['55201', '57201', '61201', '62201'][i % 4];
  if (/tahun_id/.test(nama)) return ['20251', '20242', '20241'][i % 3];
  if (/username/.test(nama)) return `2155201${String(101 + i).padStart(4, '0')}`;
  if (/^kode|_kode$/.test(nama) || s.p === '^[A-Za-z0-9._\\-/]+$') return `${nama.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`;
  if (/^(nama|nama_lengkap|penanggung|pemohon|pelapor|ketua|pembimbing|penulis)/.test(nama)) return NAMA[i % NAMA.length];
  if (/(judul|nama_kegiatan|perihal|subjek|title)/.test(nama)) return JUDUL[i % JUDUL.length];
  if (/(kota|lokasi|tempat|alamat)/.test(nama)) return KOTA[i % KOTA.length];
  if (/(telepon|hp|whatsapp)/.test(nama)) return `08524${String(100000 + i * 7919).slice(0, 6)}`;
  if (/(jam)/.test(nama)) return `${String(8 + (i % 8)).padStart(2, '0')}:00`;
  if (/(nomor|no_)/.test(nama)) return `${String(i + 1).padStart(3, '0')}/UNIPO/2026`;
  if (/(deskripsi|keterangan|catatan|uraian|syarat|isi)/.test(nama)) return 'Contoh keterangan untuk dokumentasi. Data ini fiktif.';
  return `${nama.replace(/_/g, ' ')} ${i + 1}`;
}

function barisContoh(skema: Skema | undefined, i: number): Record<string, unknown> {
  const out: Record<string, unknown> = { id: i + 1 };
  for (const [k, s] of Object.entries(skema?.pr ?? {})) {
    if (k === 'id') continue;
    if (/^(created_at|updated_at)$/.test(k)) out[k] = `2026-11-${String(1 + (i % 14)).padStart(2, '0')} 09:${String(i % 60).padStart(2, '0')}:00`;
    else if (k === 'uuid') out[k] = `0000000${i}-aaaa-4bbb-8ccc-${String(i).padStart(12, '0')}`;
    else out[k] = nilaiContoh(k, s, i);
  }
  return out;
}

const pola = (path: string) => new RegExp('^' + path.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\\{[^}]+\\\}|\{[^}]+\}/g, '([^/]+)') + '$');
const toko = new Map<string, Array<Record<string, unknown>>>();
const jsonBody = (init?: RequestInit): Record<string, unknown> => {
  if (!init?.body) return {};
  if (typeof init.body === 'string') {
    try {
      return JSON.parse(init.body);
    } catch {
      return {};
    }
  }
  if (init.body instanceof FormData) return Object.fromEntries([...init.body.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : { nama: v.name }]));
  return {};
};

async function kandidatModul(path: string): Promise<ModulKatalog[]> {
  const seg = path.split('/').slice(0, 3).join('/');
  const kunci = new Set<string>();
  for (const [id, m] of Object.entries(INDEKS_KATALOG.peta)) if (id === seg || id.startsWith(seg + '/')) kunci.add(m);
  return Promise.all([...kunci].map((k) => muatModulKatalog(k)));
}

function cariOp(mods: ModulKatalog[], metode: string, path: string): { op: Operasi; modul: ModulKatalog; nilai: string[] } | null {
  let best: { op: Operasi; modul: ModulKatalog; nilai: string[] } | null = null;
  for (const m of mods)
    for (const o of Object.values(m.ops)) {
      if (o.m !== metode) continue;
      const r = pola(o.path).exec(path);
      // Utamakan path literal (lebih sedikit parameter).
      if (r && (!best || (o.path.match(/\{/g)?.length ?? 0) < (best.op.path.match(/\{/g)?.length ?? 0))) best = { op: o, modul: m, nilai: r.slice(1) };
    }
  return best;
}

function rowsFor(base: string, skema: Skema | undefined) {
  let r = toko.get(base);
  if (!r) {
    r = Array.from({ length: 23 }, (_, i) => barisContoh(skema, i));
    toko.set(base, r);
  }
  return r;
}

setelCadangan(async (u, init) => {
  const metode = (init?.method ?? 'GET').toUpperCase();
  const mods = await kandidatModul(u.pathname);
  const hit = cariOp(mods, metode, u.pathname);
  if (!hit) return { __status: 404, error: { code: 'not_found', message: `Endpoint ${metode} ${u.pathname} tidak ada.` } };
  const { op, modul, nilai } = hit;
  const sumber = modul.resources.find((r) => r.list === op.id || r.create === op.id || r.get === op.id || r.update === op.id || r.del === op.id || r.actions.includes(op.id));
  const skemaBaris = (op.it && modul.skema[op.it]) || (sumber && modul.skema[modul.ops[sumber.list ?? sumber.get ?? '']?.it ?? '']);
  const base = sumber ? sumber.base.replace(/\{[^}]+\}/g, () => nilai.shift() ?? '') : u.pathname;
  const id = nilai.at(-1);
  // Lampiran
  if (/\/berkas(\/[^/]+)?$/.test(op.path)) {
    if (metode === 'GET' && op.r === 'list') return { data: [] };
    if (metode === 'POST') return { __status: 201, data: { uuid: crypto.randomUUID(), nama: 'berkas-contoh.pdf', ukuran: 182000, jenis: 'lampiran' } };
    return { data: null };
  }
  if (!sumber || op.id === undefined) {
    if (metode === 'GET') return op.r === 'list' ? { data: rowsFor(u.pathname, skemaBaris).slice(0, 10), meta: { total: 10 } } : { data: barisContoh(skemaBaris, 0) };
    if (op.b) {
      const v = validasiBody(op.b.s, jsonBody(init));
      if (Object.keys(v.galat).length) return { __status: 422, error: { code: 'validation_failed', message: 'Data yang dikirim tidak valid.', details: v.galat } };
    }
    return { data: { ok: true, pesan: `${judulOperasi(op)} dijalankan (contoh).` } };
  }
  const rows = rowsFor(base, skemaBaris);
  const kunci = sumber.key ?? 'id';
  const cari = (x: string | undefined) => rows.find((r) => String(r[kunci] ?? r.id) === x);
  if (op.id === sumber.list) {
    let hasil = rows;
    const q = u.searchParams.get('q')?.toLowerCase();
    if (q) hasil = hasil.filter((r) => Object.values(r).some((v) => typeof v === 'string' && v.toLowerCase().includes(q)));
    for (const p of op.pa ?? []) {
      const v = u.searchParams.get(p.nm);
      if (v && p.in === 'query' && !['q', 'page', 'per_page', 'urut', 'dari', 'sampai'].includes(p.nm)) hasil = hasil.filter((r) => v.split(',').includes(String(r[p.nm])));
    }
    const urut = u.searchParams.get('urut');
    if (urut) {
      const k = urut.replace(/^-/, '');
      const arah = urut.startsWith('-') ? -1 : 1;
      hasil = [...hasil].sort((a, b) => String(a[k] ?? '').localeCompare(String(b[k] ?? ''), 'id', { numeric: true }) * arah);
    }
    const per = Number(u.searchParams.get('per_page') ?? 20);
    const page = Number(u.searchParams.get('page') ?? 1);
    return { data: hasil.slice((page - 1) * per, page * per), meta: { page, per_page: per, total: hasil.length } };
  }
  if (op.id === sumber.get) return cari(id) ? { data: cari(id) } : { __status: 404, error: { message: 'Data tidak ditemukan.' } };
  if (op.id === sumber.create || op.id === sumber.update) {
    const ubah = op.id === sumber.update;
    const lama = ubah ? cari(id) : undefined;
    if (ubah && !lama) return { __status: 404, error: { message: 'Data tidak ditemukan.' } };
    const body = jsonBody(init);
    // Aturan backend: tambah = semua wajib; ubah = kolom yang dikirim saja, wajib tidak boleh dikosongkan.
    const v = validasiBody(op.b?.s, body, ubah ? { ubah: true, awal: Object.fromEntries(Object.keys(body).map((k) => [k, (lama ?? {})[k] ?? 'x'])) } : {});
    if (Object.keys(v.galat).length) return { __status: 422, error: { code: 'validation_failed', message: 'Data yang dikirim tidak valid.', details: v.galat } };
    if (ubah) {
      Object.assign(lama!, body, { updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ') });
      return { data: lama };
    }
    const status = skemaBaris?.pr?.status?.e?.[0];
    const baru = { ...barisContoh(skemaBaris, rows.length), ...body, id: Math.max(0, ...rows.map((r) => Number(r.id) || 0)) + 1, ...(status ? { status } : {}) };
    rows.unshift(baru);
    return { __status: 201, data: baru };
  }
  if (op.id === sumber.del) {
    const i = rows.findIndex((r) => String(r[kunci] ?? r.id) === id);
    if (i < 0) return { __status: 404, error: { message: 'Data tidak ditemukan.' } };
    rows.splice(i, 1);
    return { data: null };
  }
  // Aksi alur kerja.
  const b = cari(id);
  if (!b) return { __status: 404, error: { message: 'Data tidak ditemukan.' } };
  if (op.tr) {
    const k = kolomStatus(skemaBaris, op.tr, b);
    const kini = String(b[k] ?? '');
    if (!op.tr.dari.includes(kini)) return { __status: 409, error: { code: 'conflict', message: `${judulOperasi(op)} hanya bisa dilakukan bila status ${op.tr.dari.join('/')} (sekarang: ${kini || '-'}).` } };
    if (op.b) {
      const v = validasiBody(op.b.s, jsonBody(init));
      if (Object.keys(v.galat).length) return { __status: 422, error: { code: 'validation_failed', message: 'Data yang dikirim tidak valid.', details: v.galat } };
    }
    if (op.tr.ke) b[k] = op.tr.ke;
  }
  return { data: b };
});
