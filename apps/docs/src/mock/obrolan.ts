import { kriptoObrolan as K } from 'unipo-ui/siakad';
import { tambahRute } from './siakad';

/**
 * Server obrolan tiruan (/v1/obrolan) yang mengikuti aturan app/Modules/Obrolan: kunci harus dibungkus untuk tepat
 * semua perangkat aktif anggota (409 perangkat_berubah), penerima yang belum punya kunci tidak menghalangi (kuncinya
 * disusulkan lewat /susulan begitu ia membuka obrolan), blokir, pesan menghilang, long-poll peristiwa. Server tiruan ini juga tidak pernah melihat
 * teks: kontak tiruan (bot) memegang kunci perangkat sungguhan, membuka pesan Anda dengan kunci privatnya, lalu
 * membalas dengan pesan terenkripsi.
 */

interface Orang {
  id: string;
  nama: string;
  peran: string;
  level: string;
  daring: boolean;
  menit?: number;
  /** Belum pernah membuka obrolan: tidak punya perangkat. */
  tanpaKunci?: boolean;
}

const SAYA_ID = '2023010045';
const ORANG: Orang[] = [
  { id: SAYA_ID, nama: 'Nadia Putri Ramadhani', peran: 'Mahasiswa', level: 'MAHASISWA', daring: true },
  { id: '0912048801', nama: 'Dr. Hendra Wijaya, M.Kom.', peran: 'Dosen', level: 'DOSEN', daring: true },
  { id: '2023010012', nama: 'Rizky Pratama', peran: 'Mahasiswa', level: 'MAHASISWA', daring: true },
  { id: '2023010031', nama: 'Putri Amelia', peran: 'Mahasiswa', level: 'MAHASISWA', daring: false, menit: 12 },
  { id: 'baak.sari', nama: 'Sari Rahmawati', peran: 'BAAK', level: 'BAK', daring: false, menit: 25 },
  { id: 'keu.andi', nama: 'Andi Saputra', peran: 'Keuangan', level: 'KEUANGAN', daring: false, menit: 190 },
  { id: '0915067702', nama: 'Dr. Maya Kusuma, M.T.', peran: 'Dosen', level: 'DOSEN', daring: false, menit: 1500 },
  { id: '0920118303', nama: 'Bambang Sutrisno, S.E., M.M.', peran: 'Dosen', level: 'DOSEN', daring: true },
  { id: '2026020007', nama: 'Laila Hasanah', peran: 'Mahasiswa baru', level: 'MABA', daring: false, tanpaKunci: true },
  { id: '2022010088', nama: 'Fikri Ramadhan', peran: 'Mahasiswa', level: 'MAHASISWA', daring: false, menit: 300 },
  { id: 'panitia.dewi', nama: 'Dewi Lestari', peran: 'Panitia PMB', level: 'PANITIA', daring: true },
  { id: 'pustaka.yusuf', nama: 'Yusuf Hidayat', peran: 'Perpustakaan', level: 'PUSTAKA', daring: false, menit: 45 },
  { id: 'prodi.ti', nama: 'Admin Prodi Teknik Informatika', peran: 'Program studi', level: 'PROGDI', daring: true },
];
const orang = (id: string) => ORANG.find((o) => o.id === id);

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const sekarang = () => fmt(new Date());
const menitLalu = (m: number) => fmt(new Date(Date.now() - m * 60_000));
/** Kemarin pukul jj:mm */
const kemarin = (j: number, m: number) => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(j, m, 0, 0);
  return fmt(d);
};
const hariIni = (j: number, m: number) => {
  const d = new Date();
  d.setHours(j, m, 0, 0);
  return d.getTime() > Date.now() ? menitLalu(40) : fmt(d);
};

// ---------------------------------------------------------------- data

interface Dev extends K.KunciPublikPerangkat {
  nama: string;
  dibuat_at: string;
  terakhir_aktif: string | null;
  dicabut: boolean;
  /** Kunci privat (hanya untuk bot dan laptop tiruan). */
  priv?: K.KunciPerangkat;
}
interface Anggota {
  pemilik: string;
  peran: 'admin' | 'anggota';
  mulai: number;
  dibaca_sampai: number;
  diterima_sampai: number;
  bisu: boolean;
  arsip: boolean;
  sematkan: boolean;
}
interface Ruang {
  id: string;
  jenis: 'langsung' | 'grup';
  judul: string | null;
  kedaluwarsa_detik: number;
  dibuat_oleh: string;
  dibuat_at: string;
  pesan_terakhir_at: string | null;
  anggota: Anggota[];
}
interface Pesan {
  id: number;
  uuid: string;
  ruang: string;
  pengirim: string;
  perangkat: string;
  sandi: string | null;
  iv: string | null;
  efemeral: string | null;
  tanda: string | null;
  kunci: Record<string, string>;
  lampiran: string[];
  dihapus: boolean;
  kedaluwarsa_at: string | null;
  dibuat_at: string;
}

const DEV: Dev[] = [];
const RUANG: Ruang[] = [];
const PESAN: Pesan[] = [];
const LAMPIRAN = new Map<string, Uint8Array<ArrayBuffer>>();
const BLOKIR = new Set<string>();
let cadangan: { data: string; salt: string; iterasi: number } | null = null;
const setelan = { tampil_daring: true, tanda_baca: true };
let idPesan = 0;

const aktif = (pemilik: string) => DEV.filter((d) => d.pemilik === pemilik && !d.dicabut);
const publik = (d: Dev): K.KunciPublikPerangkat => ({ id: d.id, pemilik: d.pemilik, kunci_tukar: d.kunci_tukar, kunci_tanda: d.kunci_tanda, sidik: d.sidik, dibuat_at: d.dibuat_at });

async function buatDev(pemilik: string, nama: string, menit: number): Promise<Dev> {
  const priv = await K.buatKunciPerangkat(pemilik);
  priv.id = K.uuidAcak();
  const kunci_tukar = await K.publikRaw(priv.tukar.publicKey);
  const kunci_tanda = await K.publikRaw(priv.tanda.publicKey);
  const d: Dev = {
    id: priv.id,
    pemilik,
    nama,
    kunci_tukar,
    kunci_tanda,
    sidik: await K.sidikPerangkat(kunci_tukar, kunci_tanda),
    dibuat_at: menitLalu(menit + 60 * 24 * 30),
    terakhir_aktif: menitLalu(menit),
    dicabut: false,
    priv,
  };
  DEV.push(d);
  return d;
}

const siap = (async () => {
  if (!K.kriptoDidukung()) return;
  await buatDev(SAYA_ID, 'Chrome di Windows (laptop kampus)', 60 * 26);
  for (const o of ORANG.slice(1)) if (!o.tanpaKunci) await buatDev(o.id, o.peran === 'Dosen' ? 'Safari di iOS' : 'Chrome di Android', o.menit ?? 0);
})();

// ---------------------------------------------------------------- umpan realtime (hanya untuk pengguna demo)

const UMPAN: Array<{ id: number; jenis: string; data: Record<string, unknown>; waktu: string }> = [];
const penunggu = new Set<() => void>();
function umpan(penerima: string[], jenis: string, data: Record<string, unknown>) {
  if (!penerima.includes(SAYA_ID)) return;
  UMPAN.push({ id: UMPAN.length + 1, jenis, data, waktu: sekarang() });
  penunggu.forEach((f) => f());
}
const anggotaAktif = (r: Ruang) => r.anggota.map((a) => a.pemilik);

// ---------------------------------------------------------------- bentuk balasan

function bentukOrang(id: string) {
  const o = orang(id);
  const tampil = setelan.tampil_daring;
  return {
    id,
    nama: o?.nama ?? id,
    peran: o?.peran ?? '',
    jenis: id.startsWith('pmb:') ? 'pendaftar' : 'pengguna',
    punya_kunci: aktif(id).length > 0,
    daring: id === SAYA_ID ? true : tampil && Boolean(o?.daring),
    terakhir_aktif: id === SAYA_ID || !tampil ? null : o?.daring ? sekarang() : o?.menit != null ? menitLalu(o.menit) : null,
  };
}

const kedaluwarsa = (p: Pesan) => p.kedaluwarsa_at !== null && p.kedaluwarsa_at <= sekarang();

function bentukPesan(p: Pesan, dev: string) {
  return {
    id: p.id,
    uuid: p.uuid,
    pengirim: p.pengirim,
    perangkat: p.perangkat,
    sandi: p.sandi,
    iv: p.iv,
    efemeral: p.efemeral,
    tanda: p.tanda,
    kunci: p.dihapus ? null : (p.kunci[dev] ?? null),
    menunggu: !p.dihapus && !p.kunci[dev] && !Object.keys(p.kunci).some((d) => DEV.find((x) => x.id === d)?.pemilik === DEV.find((x) => x.id === dev)?.pemilik),
    lampiran: p.lampiran,
    dihapus: p.dihapus,
    kedaluwarsa_at: p.kedaluwarsa_at,
    dibuat_at: p.dibuat_at,
  };
}

function bentukRuang(r: Ruang, dev: string) {
  const a = r.anggota.find((x) => x.pemilik === SAYA_ID)!;
  const daftar = PESAN.filter((p) => p.ruang === r.id && p.id > a.mulai && !kedaluwarsa(p));
  const terakhir = daftar[daftar.length - 1];
  return {
    id: r.id,
    jenis: r.jenis,
    judul: r.judul,
    dibuat_oleh: r.dibuat_oleh,
    kedaluwarsa_detik: r.kedaluwarsa_detik,
    dibuat_at: r.dibuat_at,
    pesan_terakhir_at: r.pesan_terakhir_at,
    peran_saya: a.peran,
    dibaca_sampai: a.dibaca_sampai,
    bisu: a.bisu,
    arsip: a.arsip,
    sematkan: a.sematkan,
    belum_dibaca: daftar.filter((p) => p.id > a.dibaca_sampai && p.pengirim !== SAYA_ID && !p.dihapus).length,
    anggota: r.anggota.map((x) => ({
      ...bentukOrang(x.pemilik),
      peran_ruang: x.peran,
      dibaca_sampai: setelan.tanda_baca || r.jenis === 'grup' ? x.dibaca_sampai : null,
      diterima_sampai: x.diterima_sampai,
    })),
    pesan_terakhir: terakhir ? bentukPesan(terakhir, dev) : null,
  };
}

// ---------------------------------------------------------------- kirim (dipakai seed dan bot)

async function kirimSebagai(dev: Dev, r: Ruang, isi: K.IsiPesan, waktu = sekarang(), opsi: { kecuali?: string } = {}): Promise<Pesan> {
  const penerima = anggotaAktif(r)
    .flatMap(aktif)
    .filter((d) => d.id !== opsi.kecuali)
    .map(publik);
  const e = await K.enkripsiPesan(isi, { ruang: r.id, pengirim: dev.priv!, penerima });
  const p: Pesan = {
    id: ++idPesan,
    uuid: e.uuid,
    ruang: r.id,
    pengirim: dev.pemilik,
    perangkat: dev.id,
    sandi: e.sandi,
    iv: e.iv,
    efemeral: e.efemeral,
    tanda: e.tanda,
    kunci: e.kunci,
    lampiran: (isi.berkas ?? []).map((b) => b.id),
    dihapus: false,
    kedaluwarsa_at: r.kedaluwarsa_detik ? fmt(new Date(new Date(waktu.replace(' ', 'T')).getTime() + r.kedaluwarsa_detik * 1000)) : null,
    dibuat_at: waktu,
  };
  PESAN.push(p);
  if (isi.t !== 'reaksi' && isi.t !== 'ubah') r.pesan_terakhir_at = waktu;
  const ag = r.anggota.find((a) => a.pemilik === dev.pemilik);
  if (ag) ag.dibaca_sampai = ag.diterima_sampai = p.id;
  return p;
}

async function lampiranTiruan(data: Uint8Array<ArrayBuffer>, nama: string, mime: string, ukur?: { lebar: number; tinggi: number }) {
  const { sandi, kunci, iv } = await K.enkripsiBerkas(data.buffer);
  const id = K.uuidAcak();
  LAMPIRAN.set(id, sandi);
  return { id, nama, mime, ukuran: data.byteLength, kunci, iv, ...(ukur ?? {}) };
}

async function gambarJadwal(): Promise<Uint8Array<ArrayBuffer>> {
  const c = document.createElement('canvas');
  c.width = 720;
  c.height = 480;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 720, 480);
  grad.addColorStop(0, '#1d4ed8');
  grad.addColorStop(1, '#0f766e');
  g.fillStyle = grad;
  g.fillRect(0, 0, 720, 480);
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.font = '600 34px system-ui, sans-serif';
  g.fillText('Jadwal Konsultasi Dosen Wali', 40, 72);
  g.font = '24px system-ui, sans-serif';
  [
    ['Senin', '13.00 - 15.00', 'R. Dosen 2.04'],
    ['Rabu', '10.00 - 12.00', 'R. Dosen 2.04'],
    ['Kamis', '09.00 - 11.00', 'Daring (Meet)'],
  ].forEach(([h, j, t], i) => {
    const y = 150 + i * 92;
    g.fillStyle = 'rgba(255,255,255,.14)';
    g.fillRect(40, y - 44, 640, 72);
    g.fillStyle = '#fff';
    g.fillText(h, 64, y);
    g.fillText(j, 240, y);
    g.fillText(t, 450, y);
  });
  const blob = await new Promise<Blob>((ok) => c.toBlob((b) => ok(b!), 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

function pdfTiruan(): Uint8Array<ArrayBuffer> {
  const isi = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>>>endobj 4 0 obj<</Length 60>>stream\nBT /F1 20 Tf 60 760 Td (Panduan KRS Semester Genap 2026) Tj ET\nendstream endobj\ntrailer<</Root 1 0 R>>\n%%EOF`;
  const b = new TextEncoder().encode(isi + ' '.repeat(184_000));
  return new Uint8Array(b);
}

function ruangBaru(jenis: Ruang['jenis'], pemilik: Array<[string, Anggota['peran']]>, judul: string | null, dibuat: string, ubah: Partial<Ruang> = {}): Ruang {
  const r: Ruang = {
    id: K.uuidAcak(),
    jenis,
    judul,
    kedaluwarsa_detik: 0,
    dibuat_oleh: pemilik[0][0],
    dibuat_at: dibuat,
    pesan_terakhir_at: null,
    anggota: pemilik.map(([p, peran]) => ({ pemilik: p, peran, mulai: 0, dibaca_sampai: 0, diterima_sampai: 0, bisu: false, arsip: false, sematkan: false })),
    ...ubah,
  };
  RUANG.push(r);
  return r;
}

let diisi = false;
/** Riwayat contoh dibuat setelah browser ini mendaftarkan perangkat, agar pesannya terenkripsi untuk perangkat ini. */
async function isiAwal(browser: string) {
  if (diisi) return;
  diisi = true;
  const d = (id: string) => aktif(id).find((x) => x.priv)!;
  const laptop = d(SAYA_ID);
  const hendra = d('0912048801');
  const teks = (isi: string, ubah: Partial<K.IsiPesan> = {}): K.IsiPesan => ({ v: 1, t: 'teks', isi, ...ubah });

  // 1. Dosen wali
  const r1 = ruangBaru(
    'langsung',
    [
      [SAYA_ID, 'anggota'],
      ['0912048801', 'anggota'],
    ],
    null,
    kemarin(15, 0),
  );
  await kirimSebagai(hendra, r1, teks('Selamat sore Nadia, pengisian KRS semester genap sudah dibuka. Jangan lupa konsultasi sebelum tanggal 20 ya.'), kemarin(15, 10));
  const tanya = await kirimSebagai(laptop, r1, teks('Baik Pak, terima kasih. Saya berencana ambil 22 SKS, apakah boleh dengan IPS 3,41?'), kemarin(15, 22));
  const jawab = await kirimSebagai(
    hendra,
    r1,
    teks('Boleh, IPS di atas 3,00 bisa sampai 24 SKS. Pastikan Basis Data Lanjut tidak bentrok dengan Praktikum Jaringan.', {
      ke: tanya.uuid,
      kutip: { pengirim: SAYA_ID, isi: 'Baik Pak, terima kasih. Saya berencana ambil 22 SKS, apakah boleh dengan IPS 3,41?' },
    }),
    kemarin(15, 30),
  );
  await kirimSebagai(
    hendra,
    r1,
    { v: 1, t: 'berkas', isi: 'Ini panduannya, cek bagian prasyarat.', berkas: [await lampiranTiruan(pdfTiruan(), 'Panduan KRS Genap 2026.pdf', 'application/pdf')] },
    kemarin(15, 31),
  );
  await kirimSebagai(laptop, r1, { v: 1, t: 'reaksi', ke: jawab.uuid, emoji: '🙏' }, kemarin(15, 35));
  if (typeof document !== 'undefined')
    await kirimSebagai(
      hendra,
      r1,
      { v: 1, t: 'berkas', isi: 'Jadwal konsultasi minggu ini', berkas: [await lampiranTiruan(await gambarJadwal(), 'jadwal-konsultasi.png', 'image/png', { lebar: 720, tinggi: 480 })] },
      hariIni(8, 2),
    );
  const siapP = await kirimSebagai(laptop, r1, teks('Siap Pak, saya datang Rabu jam 10.'), hariIni(8, 5));
  await kirimSebagai(hendra, r1, { v: 1, t: 'reaksi', ke: siapP.uuid, emoji: '👍' }, hariIni(8, 6));
  r1.anggota.forEach((a) => (a.dibaca_sampai = a.diterima_sampai = idPesan));

  // 2. Grup kelas (disematkan)
  const r2 = ruangBaru(
    'grup',
    [
      ['0912048801', 'admin'],
      [SAYA_ID, 'anggota'],
      ['2023010012', 'anggota'],
      ['2023010031', 'anggota'],
    ],
    'Kelas Basis Data A',
    kemarin(9, 0),
  );
  r2.anggota.find((a) => a.pemilik === SAYA_ID)!.sematkan = true;
  const rizky = d('2023010012');
  const putri = d('2023010031');
  await kirimSebagai(hendra, r2, teks('Tugas 3 (normalisasi sampai BCNF) dikumpulkan Jumat pukul 23.59 lewat LMS.'), menitLalu(140));
  await kirimSebagai(rizky, r2, teks('Pak, boleh berkelompok maksimal 3 orang?'), menitLalu(132));
  await kirimSebagai(hendra, r2, teks('Boleh, cantumkan NIM semua anggota di halaman judul.'), menitLalu(128));
  await kirimSebagai(putri, r2, teks('Nadia, kita sekelompok yuk 😄'), menitLalu(61));
  const hapus = await kirimSebagai(putri, r2, teks('(pesan salah kirim)'), menitLalu(60));
  Object.assign(hapus, { dihapus: true, sandi: null, iv: null, efemeral: null, tanda: null, kunci: {} });
  r2.anggota.forEach((a) => (a.dibaca_sampai = a.diterima_sampai = idPesan));
  await kirimSebagai(rizky, r2, teks('Aku ikut juga ya, jadi bertiga.'), menitLalu(9));
  await kirimSebagai(rizky, r2, teks('Nanti malam kita bagi tugas di sini: ERD, normalisasi, laporan.'), menitLalu(8));

  // 3. BAAK: satu pesan lama dikirim sebelum browser ini terdaftar (tidak terbaca di sini).
  const sari = d('baak.sari');
  const r3 = ruangBaru(
    'langsung',
    [
      ['baak.sari', 'anggota'],
      [SAYA_ID, 'anggota'],
    ],
    null,
    kemarin(8, 0),
  );
  await kirimSebagai(sari, r3, teks('Pengajuan surat keterangan aktif kuliah sudah kami terima.'), kemarin(9, 0), { kecuali: browser });
  r3.anggota.forEach((a) => (a.dibaca_sampai = a.diterima_sampai = idPesan));
  await kirimSebagai(sari, r3, teks('Halo Nadia, surat keterangan aktif kuliah Anda sudah selesai dan ditandatangani elektronik.'), menitLalu(31));
  await kirimSebagai(sari, r3, teks('Silakan unduh di menu Layanan > Permohonan saya, atau ambil versi cetak di loket BAAK.'), menitLalu(30));

  // 4. Dosen pembimbing dengan pesan menghilang 24 jam
  const maya = d('0915067702');
  const r4 = ruangBaru(
    'langsung',
    [
      ['0915067702', 'anggota'],
      [SAYA_ID, 'anggota'],
    ],
    null,
    kemarin(10, 0),
    { kedaluwarsa_detik: 86400 },
  );
  await kirimSebagai(maya, r4, teks('Untuk revisi proposal, kirim draf ke saya sebelum Kamis. Nilai sementara jangan disebar dulu ya.'), menitLalu(200));
  r4.anggota.forEach((a) => (a.dibaca_sampai = a.diterima_sampai = idPesan));

  // 5. Keuangan (diarsipkan)
  const andi = d('keu.andi');
  const r5 = ruangBaru(
    'langsung',
    [
      ['keu.andi', 'anggota'],
      [SAYA_ID, 'anggota'],
    ],
    null,
    kemarin(7, 0),
  );
  r5.anggota.find((a) => a.pemilik === SAYA_ID)!.arsip = true;
  await kirimSebagai(andi, r5, teks('Pembayaran UKT semester genap Anda sudah terverifikasi. Terima kasih.'), kemarin(11, 15));
  r5.anggota.forEach((a) => (a.dibaca_sampai = a.diterima_sampai = idPesan));
}

// ---------------------------------------------------------------- bot

const tunda = (ms: number) => new Promise((r) => setTimeout(r, ms));

function balasan(o: Orang, isi: K.IsiPesan): string {
  const t = (isi.isi ?? '').toLowerCase();
  if (isi.t === 'berkas') return o.level === 'DOSEN' ? 'Berkasnya sudah saya terima dan bisa saya buka. Nanti saya beri catatan.' : 'Berkasnya sudah masuk, terima kasih!';
  if (/terima ?kasih|makasih|thanks/.test(t)) return 'Sama-sama 🙂';
  if (/krs|sks/.test(t)) return 'Untuk KRS, pastikan sudah konsultasi dan disetujui dosen wali sebelum batas waktu ya.';
  if (/ukt|bayar|tagihan/.test(t)) return 'Status pembayaran bisa dicek di menu Keuangan. Kalau ada selisih, kirim bukti transfernya ke sini.';
  if (/surat|legalisir|transkrip/.test(t)) return 'Baik, permohonannya akan kami proses maksimal 2 hari kerja.';
  if (/\?\s*$/.test(t)) return o.level === 'DOSEN' ? 'Pertanyaan bagus. Saya cek dulu, nanti saya kabari di sini.' : 'Hmm, aku cek dulu ya, nanti kukabari.';
  if (/halo|hai|pagi|siang|sore|malam|assalamualaikum/.test(t)) return o.level === 'MAHASISWA' ? 'Hai! Ada apa?' : 'Halo, ada yang bisa saya bantu?';
  if (o.level === 'DOSEN') return 'Baik, pesannya sudah saya terima.';
  if (o.level === 'MAHASISWA') return 'Oke siap!';
  return 'Baik, akan kami tindak lanjuti.';
}

async function botMenanggapi(r: Ruang, p: Pesan) {
  const bot = r.anggota.map((a) => orang(a.pemilik)).filter((o): o is Orang => Boolean(o && o.id !== SAYA_ID && !o.tanpaKunci && !BLOKIR.has(o.id)));
  if (!bot.length) return;
  await tunda(600);
  for (const b of bot) {
    const a = r.anggota.find((x) => x.pemilik === b.id)!;
    a.diterima_sampai = Math.max(a.diterima_sampai, p.id);
    umpan(anggotaAktif(r), 'baca', { ruang: r.id, pemilik: b.id, diterima_sampai: a.diterima_sampai });
  }
  const daring = bot.filter((b) => b.daring);
  if (!daring.length) return;
  await tunda(900);
  for (const b of daring) {
    const a = r.anggota.find((x) => x.pemilik === b.id)!;
    a.dibaca_sampai = Math.max(a.dibaca_sampai, p.id);
    umpan(anggotaAktif(r), 'baca', { ruang: r.id, pemilik: b.id, dibaca_sampai: a.dibaca_sampai, diterima_sampai: a.diterima_sampai });
  }
  const b = r.jenis === 'langsung' ? daring[0] : daring[Math.floor(Math.random() * daring.length)];
  const dev = aktif(b.id).find((x) => x.priv);
  if (!dev) return;
  // Bot membuka pesan dengan kunci privat perangkatnya sendiri, persis seperti aplikasi penerima.
  const pengirim = DEV.find((x) => x.id === p.perangkat);
  const h = await K.dekripsiPesan(
    { ...p, kunci: p.kunci[dev.id] ?? null },
    { ruang: r.id, saya: dev.priv!, kunciTandaPengirim: pengirim?.kunci_tanda ?? null, kunciTukarPengirim: pengirim ? [pengirim.kunci_tukar] : [] },
  );
  if (!h.ok || h.isi.t === 'reaksi' || h.isi.t === 'ubah') return;
  if (r.jenis === 'grup' && Math.random() < 0.3) return;
  await tunda(500);
  const jawab = balasan(b, h.isi);
  for (let i = 0; i < Math.min(3, Math.ceil(jawab.length / 40)); i++) {
    umpan(anggotaAktif(r), 'ketik', { ruang: r.id, pemilik: b.id });
    await tunda(1200);
  }
  if (!RUANG.includes(r) || BLOKIR.has(b.id)) return;
  const kutip = /\?\s*$/.test(h.isi.isi ?? '') ? { ke: p.uuid, kutip: { pengirim: p.pengirim, isi: (h.isi.isi ?? '').slice(0, 160) } } : {};
  const baru = await kirimSebagai(dev, r, { v: 1, t: 'teks', isi: jawab, ...kutip });
  umpan(anggotaAktif(r), 'pesan', { ruang: r.id, id: baru.id, uuid: baru.uuid, pengirim: b.id, perangkat: dev.id });
}

/**
 * Kontak tiruan yang belum pernah membuka obrolan "membukanya" beberapa detik setelah Anda mengirim pesan: perangkatnya
 * mendaftarkan kunci, aplikasi Anda menerima peristiwa `perangkat` lalu menyusulkan kunci pesan, dan ia membalas.
 */
const diaktifkan = new Set<string>();
function aktifkanNanti(id: string) {
  const o = orang(id);
  if (!o?.tanpaKunci || diaktifkan.has(id)) return;
  diaktifkan.add(id);
  setTimeout(async () => {
    await buatDev(id, 'Chrome di Android', 0);
    o.tanpaKunci = false;
    o.daring = true;
    umpan([SAYA_ID], 'perangkat', { pemilik: id });
  }, 6000);
}

function susulanTertunda(dev: Dev) {
  return PESAN.filter((p) => p.pengirim === SAYA_ID && !p.dihapus && p.kunci[dev.id])
    .map((p) => {
      const r = RUANG.find((x) => x.id === p.ruang);
      const pemilikKunci = new Set(Object.keys(p.kunci).map((d) => DEV.find((x) => x.id === d)?.pemilik));
      const tujuan = (r ? anggotaAktif(r) : [])
        .filter((a) => a !== SAYA_ID && !pemilikKunci.has(a) && !BLOKIR.has(a))
        .flatMap(aktif)
        .map((d) => ({ id: d.id, pemilik: d.pemilik, kunci_tukar: d.kunci_tukar }));
      return { uuid: p.uuid, ruang: p.ruang, perangkat: p.perangkat, efemeral: p.efemeral!, kunci: p.kunci[dev.id], tujuan };
    })
    .filter((x) => x.tujuan.length);
}

// ---------------------------------------------------------------- rute

const galat = (status: number, code: string, message: string, details?: unknown) => ({ __status: status, error: { code, message, details } });
async function body(init?: RequestInit): Promise<Record<string, unknown>> {
  if (!init?.body) return {};
  if (init.body instanceof FormData) return Object.fromEntries(init.body.entries());
  try {
    return JSON.parse(String(init.body));
  } catch {
    return {};
  }
}

function devSaya(id: unknown) {
  const d = DEV.find((x) => x.id === id && x.pemilik === SAYA_ID && !x.dicabut);
  if (d) d.terakhir_aktif = sekarang();
  return d;
}
function ruangSaya(id: string) {
  return RUANG.find((r) => r.id === id && r.anggota.some((a) => a.pemilik === SAYA_ID));
}
const kenalan = () => [...new Set(RUANG.flatMap((r) => (r.anggota.some((a) => a.pemilik === SAYA_ID) ? anggotaAktif(r) : [])))].filter((p) => p !== SAYA_ID);

tambahRute(/^\/v1\/obrolan\//, async (u, init) => {
  await siap;
  const m = (init?.method ?? 'GET').toUpperCase();
  const path = u.pathname.slice('/v1/obrolan'.length);
  const q = (k: string) => u.searchParams.get(k);
  const b = m === 'POST' ? await body(init) : {};
  const ok = { data: { ok: true } };
  let x: RegExpMatchArray | null;

  if (path === '/saya' && m === 'GET') {
    return {
      data: {
        id: SAYA_ID,
        nama: orang(SAYA_ID)!.nama,
        jenis: 'pengguna',
        peran: 'Mahasiswa',
        perangkat: aktif(SAYA_ID).map((d) => ({ ...publik(d), nama: d.nama, terakhir_aktif: d.terakhir_aktif })),
        setelan,
        cadangan_ada: cadangan !== null,
        tunggu_maks: 20,
        lampiran_mb: 25,
      },
    };
  }

  if (path === '/perangkat') {
    if (m === 'GET') return { data: aktif(SAYA_ID).map((d) => ({ id: d.id, nama: d.nama, sidik: d.sidik, dibuat_at: d.dibuat_at, terakhir_aktif: d.terakhir_aktif })) };
    if (aktif(SAYA_ID).length >= 8) return galat(422, 'validation_failed', 'Paling banyak 8 perangkat aktif. Cabut perangkat lama dulu.');
    const kt = String(b.kunci_tukar ?? '');
    const kd = String(b.kunci_tanda ?? '');
    const d: Dev = {
      id: K.uuidAcak(),
      pemilik: SAYA_ID,
      nama: String(b.nama ?? 'Browser').slice(0, 80),
      kunci_tukar: kt,
      kunci_tanda: kd,
      sidik: await K.sidikPerangkat(kt, kd),
      dibuat_at: sekarang(),
      terakhir_aktif: sekarang(),
      dicabut: false,
    };
    DEV.push(d);
    await isiAwal(d.id);
    umpan([...kenalan(), SAYA_ID], 'perangkat', { pemilik: SAYA_ID });
    return { __status: 201, data: { ...publik(d), nama: d.nama, terakhir_aktif: d.terakhir_aktif } };
  }
  if ((x = path.match(/^\/perangkat\/([\w-]+)\/cabut$/))) {
    const d = DEV.find((y) => y.id === x![1] && y.pemilik === SAYA_ID && !y.dicabut);
    if (!d) return galat(404, 'not_found', 'Perangkat tidak ditemukan.');
    d.dicabut = true;
    umpan([...kenalan(), SAYA_ID], 'perangkat', { pemilik: SAYA_ID });
    return ok;
  }
  if (path === '/kunci') {
    const out: Record<string, K.KunciPublikPerangkat[]> = {};
    for (const p of (q('pemilik') ?? '').split(',').filter(Boolean)) out[p] = aktif(p).map(publik);
    return { data: out };
  }
  if (path === '/pengguna') {
    const kata = (q('q') ?? '').trim().toLowerCase();
    const level = q('level');
    if (kata.length === 1) return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { q: 'minimal 2 huruf' });
    let daftar: Orang[];
    if (!kata && !level)
      daftar = kenalan()
        .map(orang)
        .filter((o): o is Orang => Boolean(o));
    else daftar = ORANG.filter((o) => o.id !== SAYA_ID && (!kata || o.nama.toLowerCase().includes(kata) || o.id.startsWith(kata)) && (!level || o.level === level));
    return { data: daftar.slice(0, Number(q('limit') ?? 30)).map((o) => bentukOrang(o.id)) };
  }

  if (path === '/ruang') {
    if (m === 'GET') {
      const dev = devSaya(q('perangkat'));
      if (!dev) return galat(404, 'not_found', 'Perangkat tidak terdaftar atau sudah dicabut.');
      const arsip = q('arsip') === '1';
      return {
        data: RUANG.filter((r) => {
          const a = r.anggota.find((y) => y.pemilik === SAYA_ID);
          return a && a.arsip === arsip;
        })
          .map((r) => bentukRuang(r, dev.id))
          .sort((a, c) => Number(c.sematkan) - Number(a.sematkan) || (c.pesan_terakhir_at ?? c.dibuat_at).localeCompare(a.pesan_terakhir_at ?? a.dibuat_at)),
      };
    }
    const dev = devSaya(b.perangkat);
    if (!dev) return galat(404, 'not_found', 'Perangkat tidak terdaftar atau sudah dicabut.');
    if (b.jenis === 'grup') {
      const anggota = [...new Set((b.anggota as string[]) ?? [])].filter((p) => p !== SAYA_ID);
      if (!String(b.judul ?? '').trim()) return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { judul: 'wajib' });
      if (anggota.some((p) => !orang(p))) return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { anggota: 'pengguna tidak ditemukan' });
      const r = ruangBaru('grup', [[SAYA_ID, 'admin'], ...anggota.map((p) => [p, 'anggota'] as [string, 'anggota'])], String(b.judul).trim().slice(0, 120), sekarang());
      umpan(anggotaAktif(r), 'ruang', { ruang: r.id, aksi: 'baru' });
      return { __status: 201, data: bentukRuang(r, dev.id) };
    }
    const dengan = String(b.dengan ?? '');
    if (!orang(dengan) || dengan === SAYA_ID) return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { dengan: 'pengguna tidak ditemukan' });
    const ada = RUANG.find((r) => r.jenis === 'langsung' && r.anggota.some((a) => a.pemilik === SAYA_ID) && r.anggota.some((a) => a.pemilik === dengan));
    const r =
      ada ??
      ruangBaru(
        'langsung',
        [
          [SAYA_ID, 'anggota'],
          [dengan, 'anggota'],
        ],
        null,
        sekarang(),
      );
    const a = r.anggota.find((y) => y.pemilik === SAYA_ID)!;
    a.arsip = false;
    return { __status: ada ? 200 : 201, data: bentukRuang(r, dev.id) };
  }

  if ((x = path.match(/^\/ruang\/([\w-]+)(\/.*)?$/))) {
    const r = ruangSaya(x[1]);
    if (!r) return galat(404, 'not_found', 'Obrolan tidak ditemukan.');
    const sub = x[2] ?? '';
    const saya = r.anggota.find((a) => a.pemilik === SAYA_ID)!;
    const admin = saya.peran === 'admin';

    if (sub === '' && m === 'GET') {
      const dev = devSaya(q('perangkat'));
      if (!dev) return galat(404, 'not_found', 'Perangkat tidak terdaftar atau sudah dicabut.');
      return { data: bentukRuang(r, dev.id) };
    }
    if (sub === '/ubah') {
      if ('judul' in b) {
        if (r.jenis !== 'grup' || !admin) return galat(403, 'forbidden', 'Hanya admin grup yang bisa mengubah nama grup.');
        r.judul = String(b.judul).trim().slice(0, 120) || r.judul;
      }
      if ('kedaluwarsa_detik' in b) {
        if (r.jenis === 'grup' && !admin) return galat(403, 'forbidden', 'Hanya admin grup yang bisa mengatur pesan menghilang.');
        r.kedaluwarsa_detik = Math.max(0, Math.min(7776000, Number(b.kedaluwarsa_detik) || 0));
      }
      for (const k of ['bisu', 'arsip', 'sematkan'] as const) if (k in b) saya[k] = Boolean(b[k]);
      umpan(anggotaAktif(r), 'ruang', { ruang: r.id, aksi: 'ubah' });
      return ok;
    }
    if (sub === '/anggota') {
      if (!admin) return galat(403, 'forbidden', 'Hanya admin grup yang bisa menambah anggota.');
      const baru = ((b.tambah as string[]) ?? []).filter((p) => orang(p) && !r.anggota.some((a) => a.pemilik === p));
      baru.forEach((p) => r.anggota.push({ pemilik: p, peran: 'anggota', mulai: idPesan, dibaca_sampai: idPesan, diterima_sampai: idPesan, bisu: false, arsip: false, sematkan: false }));
      umpan(anggotaAktif(r), 'ruang', { ruang: r.id, aksi: 'anggota', tambah: baru });
      return ok;
    }
    if (sub === '/anggota/keluarkan' || sub === '/keluar') {
      const p = sub === '/keluar' ? SAYA_ID : String(b.pemilik ?? '');
      if (p !== SAYA_ID && !admin) return galat(403, 'forbidden', 'Hanya admin grup yang bisa mengeluarkan anggota.');
      if (r.jenis !== 'grup') return galat(422, 'validation_failed', 'Obrolan langsung tidak punya anggota untuk dikeluarkan.');
      const sebelum = anggotaAktif(r);
      r.anggota = r.anggota.filter((a) => a.pemilik !== p);
      if (!r.anggota.some((a) => a.peran === 'admin') && r.anggota[0]) r.anggota[0].peran = 'admin';
      umpan(sebelum, 'ruang', { ruang: r.id, aksi: 'anggota', keluar: [p] });
      return ok;
    }
    if (sub === '/anggota/admin') {
      if (!admin) return galat(403, 'forbidden', 'Hanya admin grup yang bisa mengatur admin.');
      const a = r.anggota.find((y) => y.pemilik === b.pemilik);
      if (!a) return galat(404, 'not_found', 'Anggota tidak ditemukan.');
      a.peran = b.admin === false ? 'anggota' : 'admin';
      umpan(anggotaAktif(r), 'ruang', { ruang: r.id, aksi: 'ubah' });
      return ok;
    }
    if (sub === '/pesan' && m === 'GET') {
      const dev = devSaya(q('perangkat'));
      if (!dev) return galat(404, 'not_found', 'Perangkat tidak terdaftar atau sudah dicabut.');
      const sebelum = q('sebelum') ? Number(q('sebelum')) : null;
      const setelah = q('setelah') ? Number(q('setelah')) : null;
      const limit = Number(q('limit') ?? 50);
      let daftar = PESAN.filter((p) => p.ruang === r.id && p.id > saya.mulai && !kedaluwarsa(p) && (sebelum === null || p.id < sebelum) && (setelah === null || p.id > setelah));
      daftar = setelah !== null ? daftar : [...daftar].reverse();
      return { data: { pesan: daftar.slice(0, limit).map((p) => bentukPesan(p, dev.id)), lagi: daftar.length > limit } };
    }
    if (sub === '/pesan') {
      const dev = devSaya(b.perangkat);
      if (!dev) return galat(404, 'not_found', 'Perangkat tidak terdaftar atau sudah dicabut.');
      const lama = PESAN.find((p) => p.uuid === b.uuid);
      if (lama) return lama.ruang === r.id && lama.pengirim === SAYA_ID ? { __status: 201, data: bentukPesan(lama, dev.id) } : galat(409, 'conflict', 'UUID pesan sudah dipakai.');
      const lain = anggotaAktif(r).find((p) => p !== SAYA_ID);
      if (r.jenis === 'langsung' && lain && BLOKIR.has(lain)) return galat(403, 'diblokir', 'Pesan tidak bisa dikirim ke obrolan ini.');
      const kunci = (b.kunci ?? {}) as Record<string, string>;
      const harus = anggotaAktif(r)
        .flatMap(aktif)
        .map((d) => d.id);
      const kurang = harus.filter((h) => !(h in kunci));
      const lebih = Object.keys(kunci).filter((k) => !harus.includes(k));
      if (kurang.length || lebih.length) return galat(409, 'conflict', 'Daftar perangkat anggota berubah. Muat ulang kunci lalu kirim lagi.', { kode: 'perangkat_berubah', kurang, lebih });
      const tanpa = anggotaAktif(r).filter((p) => !aktif(p).length);
      tanpa.forEach(aktifkanNanti);
      const waktu = sekarang();
      const p: Pesan = {
        id: ++idPesan,
        uuid: String(b.uuid),
        ruang: r.id,
        pengirim: SAYA_ID,
        perangkat: dev.id,
        sandi: String(b.sandi),
        iv: String(b.iv),
        efemeral: String(b.efemeral),
        tanda: String(b.tanda),
        kunci,
        lampiran: (b.lampiran as string[]) ?? [],
        dihapus: false,
        kedaluwarsa_at: r.kedaluwarsa_detik ? fmt(new Date(Date.now() + r.kedaluwarsa_detik * 1000)) : null,
        dibuat_at: waktu,
      };
      PESAN.push(p);
      r.pesan_terakhir_at = waktu;
      saya.dibaca_sampai = saya.diterima_sampai = p.id;
      saya.arsip = false;
      umpan(anggotaAktif(r), 'pesan', { ruang: r.id, id: p.id, uuid: p.uuid, pengirim: SAYA_ID, perangkat: dev.id });
      void botMenanggapi(r, p);
      return { __status: 201, data: { ...bentukPesan(p, dev.id), menunggu_penerima: tanpa } };
    }
    if ((x = sub.match(/^\/pesan\/([\w-]+)\/hapus$/))) {
      const p = PESAN.find((y) => y.ruang === r.id && y.uuid === x![1]);
      if (!p) return galat(404, 'not_found', 'Pesan tidak ditemukan.');
      if (p.pengirim !== SAYA_ID && !(r.jenis === 'grup' && admin)) return galat(403, 'forbidden', 'Hanya pengirim atau admin grup yang bisa menghapus pesan ini.');
      Object.assign(p, { dihapus: true, sandi: null, iv: null, efemeral: null, tanda: null, kunci: {} });
      p.lampiran.forEach((l) => LAMPIRAN.delete(l));
      umpan(anggotaAktif(r), 'hapus', { ruang: r.id, id: p.id });
      return ok;
    }
    if (sub === '/tandai') {
      const ubah: Record<string, number> = {};
      if (typeof b.dibaca === 'number' && b.dibaca > saya.dibaca_sampai) ubah.dibaca_sampai = saya.dibaca_sampai = b.dibaca;
      if (typeof b.diterima === 'number' && b.diterima > saya.diterima_sampai) ubah.diterima_sampai = saya.diterima_sampai = b.diterima;
      if (Object.keys(ubah).length) umpan(anggotaAktif(r), 'baca', { ruang: r.id, pemilik: SAYA_ID, ...ubah });
      return ok;
    }
    if (sub === '/ketik') return ok;
    if (sub === '/lampiran') {
      const f = b.berkas as Blob | undefined;
      if (!(f instanceof Blob)) return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { berkas: 'wajib' });
      if (f.size > 25 * 1048576) return galat(413, 'payload_too_large', 'Lampiran lebih dari 25 MB.');
      const id = K.uuidAcak();
      LAMPIRAN.set(id, new Uint8Array(await f.arrayBuffer()));
      return { __status: 201, data: { id, ukuran: f.size } };
    }
  }

  if ((x = path.match(/^\/lampiran\/([\w-]+)$/))) {
    const d = LAMPIRAN.get(x[1]);
    return d ? { __mentah: d } : galat(404, 'not_found', 'Lampiran tidak ditemukan atau sudah dihapus.');
  }

  if (path === '/susulan') {
    const dev = devSaya(m === 'GET' ? q('perangkat') : b.perangkat);
    if (!dev) return galat(409, 'perangkat_tidak_aktif', 'Perangkat ini belum terdaftar atau sudah dicabut.');
    const tertunda = susulanTertunda(dev);
    if (m === 'GET') return { data: tertunda };
    let disimpan = 0;
    const tanggapi = new Set<Pesan>();
    for (const x of (b.kunci ?? []) as Array<{ pesan: string; perangkat: string; kunci: string }>) {
      const t = tertunda.find((y) => y.uuid === x.pesan)?.tujuan.find((y) => y.id === x.perangkat);
      const p = PESAN.find((y) => y.uuid === x.pesan);
      if (!t || !p) continue;
      p.kunci[x.perangkat] = `s1.${x.kunci}`;
      disimpan++;
      tanggapi.add(p);
    }
    // Tanggapi pesan terakhir saja, seperti orang yang baru membuka obrolan.
    const terakhir = [...tanggapi].pop();
    const r = terakhir && RUANG.find((x) => x.id === terakhir.ruang);
    if (terakhir && r) void botMenanggapi(r, terakhir);
    return { data: { disimpan } };
  }

  if (path === '/peristiwa') {
    devSaya(q('perangkat'));
    const sejak = q('sejak');
    if (sejak === null) return { data: { sejak: UMPAN.length, peristiwa: [], tunggu_maks: 20 } };
    const n = Number(sejak);
    const ambil = () => UMPAN.filter((e) => e.id > n);
    if (!ambil().length) {
      const tunggu = Math.min(20, Number(q('tunggu') ?? 0)) * 1000;
      await new Promise<void>((ok) => {
        const selesai = () => (clearTimeout(t), penunggu.delete(selesai), init?.signal?.removeEventListener('abort', selesai), ok());
        const t = setTimeout(selesai, tunggu);
        penunggu.add(selesai);
        init?.signal?.addEventListener('abort', selesai);
      });
    }
    const daftar = ambil();
    return { data: { sejak: daftar.length ? daftar[daftar.length - 1].id : n, peristiwa: daftar, tunggu_maks: 20 } };
  }

  if (path === '/cadangan') {
    if (m === 'GET') return cadangan ? { data: cadangan } : galat(404, 'not_found', 'Belum ada cadangan kunci.');
    cadangan = { data: String(b.data), salt: String(b.salt), iterasi: Number(b.iterasi) };
    return ok;
  }
  if (path === '/cadangan/hapus') {
    cadangan = null;
    return ok;
  }
  if (path === '/setelan') {
    if (m === 'POST') for (const k of ['tampil_daring', 'tanda_baca'] as const) if (k in b) setelan[k] = Boolean(b[k]);
    return { data: setelan };
  }
  if (path === '/blokir') {
    if (m === 'GET') return { data: [...BLOKIR].map((id) => ({ id, nama: orang(id)?.nama ?? id, peran: orang(id)?.peran ?? '' })) };
    const p = String(b.pemilik ?? '');
    if (!orang(p) || p === SAYA_ID) return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { pemilik: 'pengguna tidak ditemukan' });
    if (b.blokir === false) BLOKIR.delete(p);
    else BLOKIR.add(p);
    umpan([SAYA_ID], 'ruang', { aksi: 'blokir', pemilik: p, blokir: b.blokir !== false });
    return ok;
  }
  return galat(404, 'not_found', `Rute ${m} /v1/obrolan${path} tidak ada.`);
});
