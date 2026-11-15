// Keuangan universitas (/v1/keu), payroll (/v1/gaji), dan dokumen publik SPMI: server tiruan untuk demo.
// Nama, angka, dan rekening rekaan.
import { PEGAWAI, PRODI, tambahRute } from './siakad';

type Baris = Record<string, any>;
const bulat = (n: number) => Math.round(n);
const acak = (() => {
  let h = 20261116;
  return () => ((h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0) % 10000) / 10000;
})();
const tahunIni = new Date().getFullYear();
const bulanIni = new Date().getMonth() + 1;
const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// ================================================================ Payroll
const UNIT = [
  { id: 3, nama: 'Prodi Informatika' },
  { id: 4, nama: 'Prodi Sistem Informasi' },
  { id: 6, nama: 'Prodi Manajemen' },
  { id: 7, nama: 'Prodi Akuntansi' },
  { id: 11, nama: 'Biro Administrasi Umum dan Keuangan' },
  { id: 12, nama: 'Biro Administrasi Akademik' },
  { id: 13, nama: 'Pustikom' },
];
const GOL = ['III/a', 'III/b', 'III/c', 'III/d', 'IV/a'];
function slipPegawai(p: Baris, i: number, bulan: number) {
  const dosen = p.jenis === 'dosen';
  const gapok = (dosen ? 3_400_000 : 2_600_000) + (i % 5) * 180_000;
  const tj = dosen ? 1_350_000 + (i % 3) * 400_000 : 650_000 + (i % 4) * 150_000;
  const honor = dosen ? (i % 3) * 750_000 : 0;
  const lembur = !dosen && i % 2 ? 300_000 : 0;
  const tetap = gapok + tj;
  const bpjsKesPk = Math.min(tetap, 12_000_000) * 0.04;
  const jkk = tetap * 0.0024;
  const jkm = tetap * 0.003;
  const pendapatan = gapok + tj + honor + lembur;
  const bruto = pendapatan + bpjsKesPk + jkk + jkm;
  const tarif = bruto > 7_800_000 ? 2 : bruto > 6_600_000 ? 1.25 : bruto > 5_650_000 ? 0.5 : 0.25;
  const pph = Math.floor((bruto * tarif) / 100);
  const bpjsKes = Math.min(tetap, 12_000_000) * 0.01;
  const jht = tetap * 0.02;
  const jp = Math.min(tetap, 10_547_400) * 0.01;
  const kop = i % 3 === 0 ? 150_000 : 0;
  const potongan = bpjsKes + jht + jp + kop;
  const unit = UNIT[i % UNIT.length]!;
  const rinci = [
    { id: 1, kode: 'GAPOK', nama: 'Gaji pokok', jenis: 'pendapatan', kelompok: 'gaji_pokok', volume: null, tarif: null, dasar: null, nominal: gapok, kena_pajak: true, sumber: 'sdm', keterangan: `SK ${GOL[i % 5]} TMT 1 Januari ${tahunIni - (i % 4)}` },
    { id: 2, kode: dosen ? 'TJ_FUNGSIONAL' : 'TJ_STRUKTURAL', nama: dosen ? 'Tunjangan fungsional' : 'Tunjangan jabatan struktural', jenis: 'pendapatan', kelompok: 'tunjangan_tetap', volume: null, tarif: null, dasar: null, nominal: tj, kena_pajak: true, sumber: 'sdm', keterangan: null },
    ...(honor ? [{ id: 3, kode: 'HONOR', nama: 'Honor mengajar, vakasi, dan remunerasi', jenis: 'pendapatan', kelompok: 'honor', volume: null, tarif: null, dasar: null, nominal: honor, kena_pajak: true, sumber: 'sdm', keterangan: 'Kelebihan SKS semester ganjil' }] : []),
    ...(lembur ? [{ id: 4, kode: 'LEMBUR', nama: 'Lembur', jenis: 'pendapatan', kelompok: 'lembur', volume: 6, tarif: 50_000, dasar: null, nominal: lembur, kena_pajak: true, sumber: 'manual', keterangan: null }] : []),
    { id: 10, kode: 'BPJS_KES', nama: 'BPJS Kesehatan (1%)', jenis: 'potongan', kelompok: 'bpjs', volume: null, tarif: 1, dasar: tetap, nominal: bulat(bpjsKes), kena_pajak: false, sumber: 'komponen', keterangan: null },
    { id: 11, kode: 'JHT', nama: 'BPJS Ketenagakerjaan JHT (2%)', jenis: 'potongan', kelompok: 'bpjs', volume: null, tarif: 2, dasar: tetap, nominal: bulat(jht), kena_pajak: false, sumber: 'komponen', keterangan: null },
    { id: 12, kode: 'JP', nama: 'BPJS Ketenagakerjaan JP (1%)', jenis: 'potongan', kelompok: 'bpjs', volume: null, tarif: 1, dasar: Math.min(tetap, 10_547_400), nominal: bulat(jp), kena_pajak: false, sumber: 'komponen', keterangan: null },
    ...(kop ? [{ id: 13, kode: 'KOPERASI', nama: 'Iuran/angsuran koperasi', jenis: 'potongan', kelompok: 'iuran', volume: null, tarif: null, dasar: null, nominal: kop, kena_pajak: false, sumber: 'tetapan', keterangan: 'Surat kuasa 012/KOP/2026' }] : []),
    { id: 20, kode: 'PPH21', nama: `PPh 21 (TER ${tarif}%)`, jenis: 'pajak', kelompok: null, volume: null, tarif, dasar: bruto, nominal: pph, kena_pajak: false, sumber: 'pajak', keterangan: null },
    { id: 30, kode: 'BPJS_KES_PK', nama: 'BPJS Kesehatan (pemberi kerja 4%)', jenis: 'perusahaan', kelompok: 'bpjs', volume: null, tarif: 4, dasar: tetap, nominal: bulat(bpjsKesPk), kena_pajak: true, sumber: 'komponen', keterangan: null },
    { id: 31, kode: 'JKK', nama: 'BPJS Ketenagakerjaan JKK (0,24%)', jenis: 'perusahaan', kelompok: 'bpjs', volume: null, tarif: 0.24, dasar: tetap, nominal: bulat(jkk), kena_pajak: true, sumber: 'komponen', keterangan: null },
    { id: 32, kode: 'JKM', nama: 'BPJS Ketenagakerjaan JKM (0,3%)', jenis: 'perusahaan', kelompok: 'bpjs', volume: null, tarif: 0.3, dasar: tetap, nominal: bulat(jkm), kena_pajak: true, sumber: 'komponen', keterangan: null },
  ];
  const peringatan = [...(i === 4 ? ['Tunjangan fungsional belum ber-SK di SDM, tidak dibayar'] : []), ...(i === 7 ? ['Rekening bank belum diisi di profil gaji'] : [])];
  return {
    id: bulan * 1000 + i + 1,
    slip_id: bulan * 1000 + i + 1,
    nomor: `SG${String(tahunIni).slice(2)}${String(bulan).padStart(2, '0')}-${String(i + 1).padStart(5, '0')}`,
    pegawai_id: p.id,
    nama: p.nama_lengkap ?? p.nama,
    nip: `19${80 + (i % 15)}0${(i % 9) + 1}12 20${10 + (i % 12)}0${(i % 2) + 1} 1 0${i % 9}${i % 7}`,
    nidn: p.nidn ?? null,
    jenis: p.jenis,
    kategori: 'tetap',
    status_kepegawaian: 'tetap_yayasan',
    unit_id: unit.id,
    unit: unit.nama,
    golongan: GOL[i % 5],
    jabatan: dosen ? ['Asisten Ahli', 'Lektor', 'Lektor Kepala'][i % 3] : ['Staf', 'Kepala Subbagian', 'Pranata Komputer'][i % 3],
    status_ptkp: ['K/1', 'TK/0', 'K/2', 'K/0', 'K/3'][i % 5],
    kategori_ter: ['B', 'A', 'B', 'A', 'C'][i % 5],
    jenis_pajak: 'pegawai_tetap',
    metode_pajak: 'gross',
    npwp: i % 6 === 5 ? null : `0${i}.${100 + i}.${200 + i}.${i}-822.000`,
    bank: i === 7 ? null : ['BSI', 'BRI', 'BNI', 'Bank SulutGo'][i % 4],
    kode_bank: null,
    no_rekening: i === 7 ? null : `71${String(1000000 + i * 7919).slice(0, 8)}`,
    atas_nama: p.nama,
    hari_kerja: 21,
    hari_hadir: 21 - (i % 3),
    hari_tidak_hadir: i % 7 === 6 ? 1 : 0,
    menit_terlambat: (i % 4) * 5,
    pendapatan,
    potongan: bulat(potongan),
    bruto_pajak: bulat(bruto),
    tarif_pajak: tarif,
    pph21: pph,
    bpjs_pegawai: bulat(bpjsKes + jht + jp),
    bpjs_perusahaan: bulat(bpjsKesPk + jkk + jkm + tetap * 0.037 + Math.min(tetap, 10_547_400) * 0.02),
    netto: bulat(pendapatan - potongan - pph),
    beban: bulat(pendapatan + bpjsKesPk + jkk + jkm + tetap * 0.037 + Math.min(tetap, 10_547_400) * 0.02),
    status: i === 7 ? 'ditahan' : 'normal',
    dibayar: bulan < bulanIni && i !== 7,
    dibayar_at: bulan < bulanIni && i !== 7 ? `${tahunIni}-${String(bulan).padStart(2, '0')}-27 10:00:00` : null,
    kode_verifikasi: `A1B2C3D4E5F6${String(i).padStart(4, '0')}`,
    peringatan,
    rinci,
  };
}
function periode(bulan: number, jenis = 'reguler') {
  const status = bulan < bulanIni - 1 ? 'ditutup' : bulan < bulanIni ? 'dibayar' : 'diajukan';
  return {
    id: bulan,
    kode: `${tahunIni}-${String(bulan).padStart(2, '0')}${jenis === 'thr' ? '-THR' : ''}`,
    judul: `${jenis === 'thr' ? 'THR' : 'Gaji'} ${NAMA_BULAN[bulan - 1]} ${tahunIni}`,
    jenis,
    tahun: tahunIni,
    bulan,
    status,
    tanggal_bayar: `${tahunIni}-${String(bulan).padStart(2, '0')}-27`,
    hari_kerja: 21,
    disetujui_oleh: status === 'diajukan' ? null : 'Kepala BAUK',
    disetujui_at: status === 'diajukan' ? null : `${tahunIni}-${String(bulan).padStart(2, '0')}-25 09:00:00`,
    dibayar_at: status === 'dibayar' || status === 'ditutup' ? `${tahunIni}-${String(bulan).padStart(2, '0')}-27 10:00:00` : null,
    jurnal_beban_id: null,
    jurnal_bayar_id: null,
  };
}
const slipBulan = (b: number) => PEGAWAI.map((p, i) => slipPegawai(p, i, b));
const jumlah = (rows: Baris[]) => ({
  pegawai: rows.length,
  ...Object.fromEntries(['pendapatan', 'potongan', 'pph21', 'bpjs_pegawai', 'bpjs_perusahaan', 'netto', 'beban'].map((k) => [k, rows.reduce((s, r) => s + r[k], 0)])),
});
const kelompok = (rows: Baris[], kunci: string) => {
  const m = new Map<string, Baris[]>();
  rows.forEach((r) => m.set(String(r[kunci]), [...(m.get(String(r[kunci])) ?? []), r]));
  return [...m.values()];
};
function rekap(bulan: number, jenis: string | null) {
  const rows = slipBulan(bulan).filter((s) => !jenis || s.jenis === jenis);
  const komp = new Map<string, Baris>();
  rows.forEach((s) => s.rinci.forEach((r: Baris, u: number) => {
    const k = komp.get(r.kode) ?? { kode: r.kode, nama: r.kode === 'PPH21' ? 'PPh 21' : r.nama, jenis: r.jenis, kelompok: r.kelompok, nominal: 0, pegawai: 0, urutan: r.id };
    k.nominal += r.nominal;
    k.pegawai += 1;
    komp.set(r.kode, k);
  }));
  return {
    periode: periode(bulan),
    ringkas: jumlah(rows),
    per_unit: kelompok(rows, 'unit_id').map((g) => ({ unit_id: g[0].unit_id, unit: g[0].unit, ...jumlah(g) })).sort((a: Baris, b: Baris) => b.beban - a.beban),
    per_jenis: kelompok(rows, 'jenis').map((g) => ({ jenis: g[0].jenis, ...jumlah(g) })),
    per_komponen: [...komp.values()].sort((a, b) => ['pendapatan', 'potongan', 'pajak', 'perusahaan'].indexOf(a.jenis) - ['pendapatan', 'potongan', 'pajak', 'perusahaan'].indexOf(b.jenis) || a.urutan - b.urutan),
    pegawai: rows.map(({ rinci, id, ...s }) => s),
  };
}

tambahRute(/^\/v1\/gaji\/.*$/, (u) => {
  const path = u.pathname.slice('/v1/gaji'.length);
  const jenis = u.searchParams.get('jenis');
  if (path === '/laporan/rekap') {
    const kode = u.searchParams.get('periode_id');
    const b = kode ? Number(kode.slice(5, 7)) : bulanIni;
    return { data: rekap(b, jenis) };
  }
  if (path === '/statistik') {
    const bulan = Array.from({ length: bulanIni - 1 }, (_, i) => i + 1);
    const per = bulan.map((b) => ({ bulan: b, ...jumlah(slipBulan(b).filter((s) => !jenis || s.jenis === jenis)) }));
    const semua = bulan.flatMap((b) => slipBulan(b)).filter((s) => !jenis || s.jenis === jenis);
    const tot = jumlah(semua) as Baris;
    return {
      data: {
        tahun: tahunIni,
        ringkas: { ...tot, pegawai: PEGAWAI.length, beban_tahun_lalu: tot.beban * 0.91, pegawai_berprofil: PEGAWAI.length, tanpa_rekening: 1, tanpa_profil: 2 },
        bulanan: per,
        per_unit: kelompok(semua, 'unit_id').map((g) => ({ unit_id: g[0].unit_id, unit: g[0].unit, pegawai: new Set(g.map((x) => x.pegawai_id)).size, pendapatan: g.reduce((s, x) => s + x.pendapatan, 0), netto: g.reduce((s, x) => s + x.netto, 0), beban: g.reduce((s, x) => s + x.beban, 0) })),
        per_jenis: kelompok(semua, 'jenis').map((g) => ({ jenis: g[0].jenis, pegawai: new Set(g.map((x) => x.pegawai_id)).size, pendapatan: g.reduce((s, x) => s + x.pendapatan, 0), netto: g.reduce((s, x) => s + x.netto, 0), beban: g.reduce((s, x) => s + x.beban, 0) })),
        komposisi: ['gaji_pokok', 'tunjangan_tetap', 'honor', 'lembur'].map((k) => ({ jenis: 'pendapatan', kelompok: k, nominal: semua.reduce((s, x) => s + x.rinci.filter((r: Baris) => r.kelompok === k && r.jenis === 'pendapatan').reduce((t: number, r: Baris) => t + r.nominal, 0), 0) })),
        rata_per_golongan: kelompok(semua, 'golongan').map((g) => ({ jenis: g[0].jenis, golongan: g[0].golongan, slip: g.length, netto: g.reduce((s, x) => s + x.netto, 0) / g.length, pendapatan: g.reduce((s, x) => s + x.pendapatan, 0) / g.length })),
        periode: [...bulan, bulanIni].map((b) => {
          const p = periode(b);
          const j = jumlah(slipBulan(b)) as Baris;
          return { id: p.id, kode: p.kode, judul: p.judul, jenis: p.jenis, status: p.status, jumlah_pegawai: j.pegawai, pendapatan: j.pendapatan, pph21: j.pph21, netto: j.netto, beban: j.beban };
        }),
      },
    };
  }
  let m: RegExpMatchArray | null;
  if ((m = path.match(/^\/(?:slip\/(\d+)\/lengkap|saya\/(\d+))$/))) {
    const id = Number(m[1] ?? m[2]);
    const b = Math.floor(id / 1000);
    const s = slipBulan(b).find((x) => x.id === id);
    return s ? { data: { ...s, periode_id: b, periode: periode(b), url_verifikasi: `/v1/gaji/verifikasi/${s.kode_verifikasi}` } } : { __status: 404, error: { code: 'not_found', message: 'Slip tidak ditemukan.' } };
  }
  if (path === '/saya') {
    const slip = Array.from({ length: bulanIni - 1 }, (_, i) => bulanIni - 1 - i).map((b) => {
      const s = slipPegawai(PEGAWAI[2]!, 2, b);
      const p = periode(b);
      return { id: s.id, nomor: s.nomor, kode: p.kode, judul: p.judul, jenis_periode: 'reguler', tahun: tahunIni, bulan: b, status_periode: p.status, tanggal_bayar: p.tanggal_bayar, pendapatan: s.pendapatan, potongan: s.potongan, pph21: s.pph21, netto: s.netto, status: s.status, dibayar_at: s.dibayar_at };
    });
    return { data: { pegawai: { id: PEGAWAI[2]!.id, nama: PEGAWAI[2]!.nama, nip: null, jenis: 'dosen' }, profil: { bank: 'BNI', no_rekening: '••••••4821', atas_nama: PEGAWAI[2]!.nama, status_ptkp: 'K/2', jenis_pajak: 'pegawai_tetap', aktif: 1 }, slip } };
  }
  if (path === '/saya/pajak') {
    const masa = Array.from({ length: bulanIni - 1 }, (_, i) => {
      const s = slipPegawai(PEGAWAI[2]!, 2, i + 1);
      return { bulan: i + 1, kode: periode(i + 1).kode, bruto: s.bruto_pajak, iuran: s.rinci.filter((r: Baris) => r.kode === 'JHT' || r.kode === 'JP').reduce((t: number, r: Baris) => t + r.nominal, 0), pph21: s.pph21 };
    });
    const bruto = masa.reduce((s, x) => s + x.bruto, 0);
    const iuran = masa.reduce((s, x) => s + x.iuran, 0);
    const bj = Math.min(bruto * 0.05, 6_000_000);
    const neto = bruto - bj - iuran;
    const pkp = Math.max(0, Math.floor((neto - 67_500_000) / 1000) * 1000);
    return { data: { tahun: tahunIni, status_ptkp: 'K/2', perhitungan: { bruto, biaya_jabatan: bj, iuran, neto, ptkp: 67_500_000, pkp, pph: Math.floor(pkp * 0.05) }, pph_dipotong: masa.reduce((s, x) => s + x.pph21, 0), sebelum_payroll: null, masa } };
  }
  if ((m = path.match(/^\/verifikasi\/(\w+)$/))) {
    return { data: { sah: true, nomor: `SG${String(tahunIni).slice(2)}10-00003`, nama: PEGAWAI[2]!.nama, nip: '1985••••••••••01', jenis: 'dosen', periode: `Gaji Oktober ${tahunIni}`, status: 'dibayar', penerbit: 'Biro Administrasi Umum dan Keuangan' } };
  }
  return { data: null };
});

// ================================================================ Keuangan universitas
const akun = (id: number, kode: string, nama: string) => ({ id, kode, nama });
const KAS = 1_820_000_000;
tambahRute(/^\/v1\/keu\/(laporan\/.*|kas-unit|statistik|transparansi)$/, (u) => {
  const path = u.pathname.slice('/v1/keu'.length);
  const dari = u.searchParams.get('dari') ?? `${tahunIni}-01-01`;
  const sampai = u.searchParams.get('sampai') ?? u.searchParams.get('tanggal') ?? `${tahunIni}-12-31`;
  if (path === '/laporan/posisi-keuangan') {
    const pos = (tgl: string, f: number) => {
      const lancar = [
        { pos: 'kas', label: 'Kas dan setara kas', akun: [{ ...akun(1, '1.1.01', 'Kas universitas'), saldo: KAS * f }, { ...akun(2, '1.1.02', 'Bank BSI giro operasional'), saldo: 2_450_000_000 * f }], jumlah: (KAS + 2_450_000_000) * f },
        { pos: 'piutang', label: 'Piutang', akun: [{ ...akun(3, '1.1.10', 'Piutang mahasiswa'), saldo: 1_280_000_000 * f }, { ...akun(4, '1.1.12', 'Piutang pegawai'), saldo: 64_000_000 * f }], jumlah: 1_344_000_000 * f },
      ];
      const tidak = [
        { pos: 'aset_tetap', label: 'Aset tetap', akun: [{ ...akun(5, '1.2.01', 'Tanah'), saldo: 6_500_000_000 }, { ...akun(6, '1.2.02', 'Gedung dan bangunan'), saldo: 12_400_000_000 }, { ...akun(7, '1.2.04', 'Peralatan laboratorium'), saldo: 1_850_000_000 }], jumlah: 20_750_000_000 },
        { pos: 'akumulasi_penyusutan', label: 'Akumulasi penyusutan', akun: [{ ...akun(8, '1.2.90', 'Akumulasi penyusutan'), saldo: -3_420_000_000 * f }], jumlah: -3_420_000_000 * f },
      ];
      const kew = [{ pos: 'kewajiban_pendek', label: 'Liabilitas jangka pendek', akun: [{ ...akun(9, '2.1.04', 'Utang PPh 21'), saldo: 38_500_000 * f }, { ...akun(10, '2.1.07', 'Utang iuran BPJS'), saldo: 52_300_000 * f }, { ...akun(11, '2.1.20', 'Pendapatan diterima di muka'), saldo: 940_000_000 * f }], jumlah: 1_030_800_000 * f }];
      const tl = lancar.reduce((s, k) => s + k.jumlah, 0);
      const ttl = tidak.reduce((s, k) => s + k.jumlah, 0);
      const total = tl + ttl;
      const netoTanpa = total - kew[0]!.jumlah - 1_250_000_000;
      return {
        tanggal: tgl,
        aset: { lancar, tidak_lancar: tidak, total_lancar: tl, total_tidak_lancar: ttl, total },
        liabilitas: { kelompok: kew, total: kew[0]!.jumlah },
        aset_neto: {
          kelompok: [
            { pos: 'aset_neto_tanpa_pembatasan', label: 'Tanpa pembatasan', akun: [{ id: null, kode: '', nama: 'Surplus (defisit) akumulasian', saldo: netoTanpa }], jumlah: netoTanpa },
            { pos: 'aset_neto_dengan_pembatasan', label: 'Dengan pembatasan', akun: [{ ...akun(12, '3.2.01', 'Dana hibah penelitian'), saldo: 1_250_000_000 }], jumlah: 1_250_000_000 },
          ],
          total: netoTanpa + 1_250_000_000,
        },
        total_liabilitas_aset_neto: total,
        seimbang: true,
      };
    };
    const banding = u.searchParams.get('pembanding');
    return { data: { ...pos(sampai, 1), ...(banding ? { pembanding: pos(banding, 0.86) } : {}) } };
  }
  if (path === '/laporan/aktivitas') {
    const akt = (f: number) => {
      const pend = [{ ...akun(20, '4.1.01', 'Pendapatan UKT/SPP'), jumlah: 9_850_000_000 * f }, { ...akun(21, '4.1.02', 'Uang gedung'), jumlah: 1_240_000_000 * f }, { ...akun(22, '4.1.04', 'Biaya ujian dan wisuda'), jumlah: 420_000_000 * f }];
      const beb = [{ ...akun(30, '5.1.01', 'Beban gaji dosen'), jumlah: 4_620_000_000 * f }, { ...akun(31, '5.1.02', 'Beban gaji tendik'), jumlah: 2_180_000_000 * f }, { ...akun(32, '5.1.04', 'Iuran BPJS'), jumlah: 498_000_000 * f }, { ...akun(33, '5.2.01', 'Beban operasional akademik'), jumlah: 1_360_000_000 * f }, { ...akun(34, '5.3.01', 'Beban penyusutan'), jumlah: 740_000_000 * f }];
      const t = (a: Baris[]) => a.reduce((s, x) => s + x.jumlah, 0);
      const lain = [{ ...akun(40, '4.9.01', 'Jasa giro'), jumlah: 38_000_000 * f }];
      const surplus = t(pend) + t(lain) - t(beb);
      return { dari, sampai, pendapatan_tanpa_pembatasan: { akun: pend, total: t(pend) }, beban: { akun: beb, total: t(beb) }, penghasilan_lain: { akun: lain, total: t(lain) }, beban_lain: { akun: [], total: 0 }, surplus_tanpa_pembatasan: surplus, pendapatan_dengan_pembatasan: { akun: [{ ...akun(23, '4.2.01', 'Hibah penelitian Kemdiktisaintek'), jumlah: 480_000_000 * f }], total: 480_000_000 * f }, total_pendapatan: t(pend) + t(lain) + 480_000_000 * f, total_beban: t(beb), perubahan_aset_neto: surplus + 480_000_000 * f };
    };
    return { data: { ...akt(1), ...(u.searchParams.get('pembanding') === '1' ? { pembanding: { ...akt(0.9), dari: `${tahunIni - 1}-01-01`, sampai: `${tahunIni - 1}-12-31` } } : {}) } };
  }
  if (path === '/laporan/arus-kas') {
    const g = (a: Baris[]) => ({ akun: a.map((x) => ({ ...x, neto: x.masuk - x.keluar })), masuk: a.reduce((s, x) => s + x.masuk, 0), keluar: a.reduce((s, x) => s + x.keluar, 0), neto: a.reduce((s, x) => s + x.masuk - x.keluar, 0) });
    const operasi = g([{ ...akun(20, '4.1.01', 'Pendapatan UKT/SPP'), masuk: 9_120_000_000, keluar: 0 }, { ...akun(30, '5.1.01', 'Beban gaji dosen'), masuk: 0, keluar: 4_210_000_000 }, { ...akun(31, '5.1.02', 'Beban gaji tendik'), masuk: 0, keluar: 1_960_000_000 }, { ...akun(33, '5.2.01', 'Beban operasional akademik'), masuk: 0, keluar: 1_290_000_000 }]);
    const investasi = g([{ ...akun(7, '1.2.04', 'Peralatan laboratorium'), masuk: 0, keluar: 640_000_000 }]);
    const pendanaan = g([{ ...akun(23, '4.2.01', 'Hibah penelitian'), masuk: 480_000_000, keluar: 0 }]);
    const transfer = g([]);
    const naik = operasi.neto + investasi.neto + pendanaan.neto;
    return { data: { dari, sampai, saldo_awal: 2_770_000_000, operasi, investasi, pendanaan, transfer, kenaikan_bersih: naik, saldo_akhir: 2_770_000_000 + naik } };
  }
  if (path === '/laporan/neraca-saldo') {
    const baris = [akun(1, '1.1.01', 'Kas universitas'), akun(3, '1.1.10', 'Piutang mahasiswa'), akun(9, '2.1.04', 'Utang PPh 21'), akun(20, '4.1.01', 'Pendapatan UKT/SPP'), akun(30, '5.1.01', 'Beban gaji dosen'), akun(31, '5.1.02', 'Beban gaji tendik')].map((a, i) => {
      const d = [KAS, 1_280_000_000, 0, 0, 4_620_000_000, 2_180_000_000][i]!;
      const k = [0, 0, 38_500_000, 9_850_000_000, 0, 0][i]!;
      return { ...a, saldo_awal: 0, debit: d, kredit: k, saldo_debit: d, saldo_kredit: k };
    });
    const sel = 9_850_000_000 + 38_500_000 - KAS - 1_280_000_000 - 4_620_000_000 - 2_180_000_000;
    baris.push({ ...akun(13, '3.1.01', 'Aset neto tanpa pembatasan'), saldo_awal: 0, debit: sel, kredit: 0, saldo_debit: sel, saldo_kredit: 0 });
    const td = baris.reduce((s, b) => s + b.saldo_debit, 0);
    const tk = baris.reduce((s, b) => s + b.saldo_kredit, 0);
    return { data: { dari, sampai, baris, total_debit: td, total_kredit: tk, seimbang: Math.abs(td - tk) < 1 } };
  }
  if (path === '/kas-unit') {
    const unit = [
      { id: 1, induk_id: null, kode: 'UNIPO', nama: 'Universitas Pohuwato', jenis: 'universitas' },
      { id: 2, induk_id: 1, kode: 'FIK', nama: 'Fakultas Ilmu Komputer', jenis: 'fakultas' },
      { id: 3, induk_id: 2, kode: '55201', nama: 'Prodi Informatika', jenis: 'prodi' },
      { id: 4, induk_id: 2, kode: '57201', nama: 'Prodi Sistem Informasi', jenis: 'prodi' },
      { id: 5, induk_id: 1, kode: 'FE', nama: 'Fakultas Ekonomi', jenis: 'fakultas' },
      { id: 6, induk_id: 5, kode: '61201', nama: 'Prodi Manajemen', jenis: 'prodi' },
      { id: 11, induk_id: 1, kode: 'BAUK', nama: 'Biro Administrasi Umum dan Keuangan', jenis: 'biro' },
    ];
    const sendiri: Record<number, number> = { 1: 2_450_000_000, 2: 48_000_000, 3: 12_500_000, 4: 9_800_000, 5: 36_000_000, 6: 15_200_000, 11: 22_000_000 };
    const turunan = (id: number): number[] => [id, ...unit.filter((x) => x.induk_id === id).flatMap((x) => turunan(x.id))];
    const out = unit.map((x) => {
      const saldo = turunan(x.id).reduce((s, t) => s + (sendiri[t] ?? 0), 0);
      return { ...x, kode_prodi: x.jenis === 'prodi' ? x.kode : null, kode_fakultas: null, saldo_sendiri: sendiri[x.id] ?? 0, saldo, masuk: saldo * 0.18, keluar: saldo * 0.12, jumlah_rekening: turunan(x.id).length };
    });
    const rekening = unit.map((x, i) => ({ id: i + 1, kode: `KAS-${x.kode}`, nama: x.jenis === 'universitas' ? 'Giro operasional' : `Kas ${x.nama}`, jenis: x.jenis === 'universitas' ? 'bank' : 'kas_kecil', bank: x.jenis === 'universitas' ? 'BSI' : null, nomor_rekening: x.jenis === 'universitas' ? '7155012345' : null, unit_id: x.jenis === 'universitas' ? null : x.id, unit: x.jenis === 'universitas' ? null : x.nama, utama: x.jenis === 'universitas', aktif: true, saldo: sendiri[x.id] ?? 0, masuk: (sendiri[x.id] ?? 0) * 0.18, keluar: (sendiri[x.id] ?? 0) * 0.12 }));
    const total = rekening.reduce((s, r) => s + r.saldo, 0);
    return { data: { tanggal: sampai, dari, total, masuk: total * 0.18, keluar: total * 0.12, universitas: { saldo: sendiri[1], masuk: sendiri[1]! * 0.18, keluar: sendiri[1]! * 0.12, jumlah_rekening: 1 }, rekening, unit: out } };
  }
  if (path === '/transparansi') {
    const biaya = [
      ['UKT', 'UKT/SPP semester', 3_500_000, 4_250_000],
      ['GDG', 'Uang gedung', 2_500_000, 2_500_000],
      ['UJN', 'Biaya ujian akhir', 250_000, 250_000],
      ['KNV', 'Konversi nilai', 150_000, 150_000],
      ['SP', 'Semester pendek per SKS', 125_000, 125_000],
    ] as const;
    const baris = PRODI.flatMap((p, i) =>
      biaya.map(([kode, nama, mn, mx], j) => {
        const mhs = 40 + ((i * 17 + j * 5) % 60);
        const tagihan = j === 4 ? mhs * 0.2 * 3 * mn : mhs * (mn + mx) * 0.5 * (j === 1 ? 0.3 : 1);
        const dibayar = tagihan * (0.72 + acak() * 0.26);
        const diskon = j === 0 ? tagihan * 0.04 : 0;
        return { kode_prodi: p.kode_prodi, kode_biaya: kode, nama_biaya: nama, nama_prodi: p.nama_prodi, kode_jenjang: p.kode_jenjang, kode_fakultas: p.kode_fakultas, nama_fakultas: p.nama_fakultas, tagihan, mahasiswa_ditagih: mhs, dibayar, diskon, mahasiswa_membayar: Math.round(mhs * 0.85), tarif_min: mn, tarif_max: mx, tunggakan: tagihan - dibayar, persen_terbayar: (dibayar / tagihan) * 100 };
      }),
    );
    const rekap = (k: string, label: string[]) =>
      kelompok(baris, k).map((g) => {
        const t = { tagihan: g.reduce((s, x) => s + x.tagihan, 0), dibayar: g.reduce((s, x) => s + x.dibayar, 0), diskon: g.reduce((s, x) => s + x.diskon, 0), tunggakan: g.reduce((s, x) => s + x.tunggakan, 0) };
        return { [k]: g[0][k], ...Object.fromEntries(label.map((l) => [l, g[0][l]])), ...t, persen_terbayar: (t.dibayar / t.tagihan) * 100 };
      });
    const tot = rekap('kode_jenjang', [])[0]!;
    return { data: { tahun_id: `${tahunIni}1`, baris, per_jenis_biaya: rekap('kode_biaya', ['nama_biaya']), per_fakultas: rekap('kode_fakultas', ['nama_fakultas']), per_prodi: rekap('kode_prodi', ['nama_prodi', 'kode_fakultas', 'nama_fakultas']), total: { tagihan: tot.tagihan, dibayar: tot.dibayar, diskon: tot.diskon, tunggakan: tot.tunggakan } } };
  }
  if (path === '/statistik') {
    const bulanan = Array.from({ length: 12 }, (_, i) => {
      const musim = [1, 2, 7, 8].includes(i + 1) ? 2.6 : 0.6;
      return { bulan: i + 1, jumlah: i + 1 <= bulanIni ? 420_000_000 * musim * (0.85 + acak() * 0.3) : 0, tahun_lalu: 400_000_000 * musim * (0.85 + acak() * 0.3), transaksi: Math.round(300 * musim) };
    });
    const buku = bulanan.map((b) => ({ bulan: b.bulan, pendapatan: b.jumlah * 1.05, beban: b.jumlah ? 690_000_000 + acak() * 80_000_000 : 0, kas_masuk: b.jumlah, kas_keluar: b.jumlah ? 640_000_000 : 0, saldo_kas: 0, surplus: 0 }));
    const total = bulanan.reduce((s, b) => s + b.jumlah, 0);
    const lalu = bulanan.slice(0, bulanIni).reduce((s, b) => s + b.tahun_lalu, 0);
    return {
      data: {
        tahun: tahunIni,
        tahun_id: `${tahunIni}1`,
        ringkas: { penerimaan_mahasiswa: total, penerimaan_mahasiswa_tahun_lalu: lalu, pertumbuhan_persen: ((total - lalu) / lalu) * 100, penerimaan_lain: 312_000_000, belanja: 1_840_000_000, saldo_kas: 2_593_500_000, tagihan_semester: 5_620_000_000, dibayar_semester: 4_510_000_000, piutang_semester: 1_110_000_000, persen_tertagih: 80.25, pendapatan_buku: total * 1.05, beban_buku: buku.reduce((s, b) => s + b.beban, 0) },
        penerimaan_bulanan: bulanan,
        per_jenis_biaya: [
          { kode_biaya: 'UKT', nama: 'UKT/SPP', jumlah: total * 0.78, transaksi: 2400, mahasiswa: 1650 },
          { kode_biaya: 'GDG', nama: 'Uang gedung', jumlah: total * 0.12, transaksi: 380, mahasiswa: 380 },
          { kode_biaya: 'UJN', nama: 'Ujian', jumlah: total * 0.05, transaksi: 1500, mahasiswa: 1500 },
          { kode_biaya: 'WSD', nama: 'Wisuda', jumlah: total * 0.05, transaksi: 210, mahasiswa: 210 },
        ],
        per_fakultas: [
          { kode_fakultas: 'FIK', nama_fakultas: 'Fakultas Ilmu Komputer', jumlah: total * 0.46, mahasiswa: 760 },
          { kode_fakultas: 'FE', nama_fakultas: 'Fakultas Ekonomi', jumlah: total * 0.38, mahasiswa: 640 },
          { kode_fakultas: 'FP', nama_fakultas: 'Fakultas Pertanian', jumlah: total * 0.16, mahasiswa: 250 },
        ],
        per_prodi: [],
        metode_pembayaran: [
          { metode: 'Virtual account', jumlah: total * 0.71, transaksi: 2100 },
          { metode: 'Transfer', jumlah: total * 0.21, transaksi: 640 },
          { metode: 'Tunai di kasir', jumlah: total * 0.08, transaksi: 330 },
        ],
        piutang_per_prodi: PRODI.map((p, i) => {
          const tagihan = 1_400_000_000 - i * 180_000_000;
          const dibayar = tagihan * (0.7 + i * 0.05);
          return { kode_prodi: p.kode_prodi, nama_prodi: p.nama_prodi, nama_fakultas: p.nama_fakultas, tagihan, dibayar, piutang: tagihan - dibayar, persen_terbayar: (dibayar / tagihan) * 100 };
        }),
        belanja_per_unit: [
          { unit_id: 2, unit: 'Fakultas Ilmu Komputer', jumlah: 640_000_000, pengajuan: 38 },
          { unit_id: 5, unit: 'Fakultas Ekonomi', jumlah: 410_000_000, pengajuan: 26 },
          { unit_id: 13, unit: 'Pustikom', jumlah: 380_000_000, pengajuan: 14 },
          { unit_id: 11, unit: 'BAUK', jumlah: 220_000_000, pengajuan: 19 },
          { unit_id: 12, unit: 'BAAK', jumlah: 190_000_000, pengajuan: 12 },
        ],
        penerimaan_lain_per_sumber: [{ sumber: 'hibah', jumlah: 240_000_000, transaksi: 2 }, { sumber: 'sewa', jumlah: 72_000_000, transaksi: 9 }],
        status_pengajuan_dana: [],
        buku_besar_bulanan: buku,
        kas_per_unit: [],
      },
    };
  }
  return { data: null };
});

// ================================================================ Dokumen publik SPMI (SOP dan kebijakan)
const DOKUMEN = [
  { jenis: 'kebijakan', judul: 'Kebijakan biaya pendidikan dan keringanan UKT', nomor: '012/YYS-UNIPO/SK/VI/2026', ringkasan: 'Besaran UKT per kelompok, uang gedung, biaya ujian, konversi, semester pendek, dan syarat keringanan atau cicilan.', unit: 'Universitas' },
  { jenis: 'sop', judul: 'SOP pembayaran UKT melalui virtual account', nomor: 'SOP-BAUK-01', ringkasan: 'Langkah pembayaran, batas waktu, dan konfirmasi otomatis ke KRS.', unit: 'Biro Administrasi Umum dan Keuangan' },
  { jenis: 'sop', judul: 'SOP pengajuan keringanan dan cicilan biaya kuliah', nomor: 'SOP-BAUK-02', ringkasan: 'Syarat berkas, verifikasi, persetujuan Kepala BAUK, dan penerbitan SK potongan.', unit: 'Biro Administrasi Umum dan Keuangan' },
  { jenis: 'sop', judul: 'SOP penggajian dosen dan tendik', nomor: 'SOP-BAUK-07', ringkasan: 'Penetapan hak oleh SDM berdasarkan SK, perhitungan dan persetujuan payroll, pembayaran, dan slip.', unit: 'Biro Administrasi Umum dan Keuangan' },
  { jenis: 'pedoman', judul: 'Pedoman pengelolaan kas unit dan pertanggungjawaban (SPJ)', nomor: 'PDM-BAUK-03', ringkasan: null, unit: 'Biro Administrasi Umum dan Keuangan' },
  { jenis: 'sk', judul: 'SK Rektor tentang tarif biaya ujian ulang dan konversi', nomor: '045/UNIPO/SK/VII/2026', ringkasan: null, unit: 'Universitas' },
].map((d, i) => ({ id: i + 1, tahap: 'pelaksanaan', versi: '1.0', tanggal_penetapan: `${tahunIni}-0${(i % 6) + 1}-15`, berlaku_mulai: `${tahunIni}-0${(i % 6) + 2}-01`, tautan: null, unit_id: i < 1 ? 1 : 11, kode_unit: i < 1 ? 'univ' : 'bauk', jenis_unit: i < 1 ? 'universitas' : 'unit', ditetapkan_oleh: 'Rektor', nomor_penetapan: null, tinjau_berikutnya: null, ...d }));
tambahRute(/^\/v1\/spmi\/publik\/dokumen$/, (u) => {
  const q = (u.searchParams.get('q') ?? '').toLowerCase();
  const jenis = u.searchParams.get('jenis');
  return { data: DOKUMEN.filter((d) => (!q || `${d.judul} ${d.nomor}`.toLowerCase().includes(q)) && (!jenis || d.jenis === jenis)) };
});
