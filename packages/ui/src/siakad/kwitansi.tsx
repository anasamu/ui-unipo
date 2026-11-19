'use client';
import * as React from 'react';
import { CircleCheck, Clock3, Printer, Receipt, Scissors, ShieldCheck } from 'lucide-react';
import { Badge, Button, Spinner } from '../components/actions';
import { Empty } from '../components/display';
import { Field, Switch } from '../components/forms';
import { KodeQr } from '../components/kode-qr';
import { Select } from '../components/select';
import { useToast } from '../components/overlays';
import { cn } from '../lib/cn';
import { formatDate, formatRupiah, terbilang } from '../lib/format';
import { GalatApi } from './galat';
import { invalidateSiakad, useOptionalSiakad, useSiakadQuery } from './provider';

// Kwitansi resmi UNIPO ("Bukti Kas Masuk") dengan banyak varian gaya, penanda unit penerbit, rincian pembayaran,
// QR verifikasi, cap status, dan tanda SALINAN. Isi wajib mengikuti kwitansi lama (keputusan Anas 2026-11-19).
// Data: GET /v1/kasir/transaksi/{id}/kwitansi, /v1/keuangan/transaksi/{id}/kwitansi, /v1/kwitansi/terbit/{id},
// /v1/pmb/admin/tagihan/{id}/kwitansi, /v1/pmb/saya/pendaftaran/{uuid}/tagihan/{id}/kwitansi.

// ================================================================ Tipe
export type VarianKwitansi = 'klasik' | 'modern' | 'minimal' | 'a5' | 'arsip' | 'thermal80' | 'thermal58';
export type JenisPenerbitKwitansi = 'keuangan' | 'baak' | 'pmb' | 'fakultas' | 'unit';
export type StatusBayarKwitansi = 'LUNAS' | 'BELUM' | 'BATAL';

/** Daftar varian dengan nama dan kegunaan, untuk pemilih varian. */
export const VARIAN_KWITANSI: ReadonlyArray<{ value: VarianKwitansi; label: string; keterangan: string; kertas: string }> = [
  { value: 'klasik', label: 'Klasik resmi', keterangan: 'Mirip Bukti Kas Masuk lama: kop, kotak isian, tanda tangan dan stempel.', kertas: 'A4 / kertas kontinu' },
  { value: 'modern', label: 'Modern kartu', keterangan: 'Pita warna penerbit, sorotan jumlah dibayar, rincian bertabel.', kertas: 'A4' },
  { value: 'minimal', label: 'Minimal', keterangan: 'Garis tipis, banyak ruang, hemat tinta.', kertas: 'A4' },
  { value: 'a5', label: 'Setengah A4 lanskap', keterangan: 'Dua kolom: isian di kiri, jumlah, status, QR, dan tanda tangan di kanan.', kertas: 'A5 lanskap' },
  { value: 'arsip', label: 'Dengan potongan arsip', keterangan: 'Bonggol arsip bergaris sobek di kiri untuk disimpan unit.', kertas: 'A5 lanskap' },
  { value: 'thermal80', label: 'Struk thermal 80 mm', keterangan: 'Printer struk 80 mm; semua isian tetap ada, tanda tangan diperkecil.', kertas: '80 mm' },
  { value: 'thermal58', label: 'Struk thermal 58 mm', keterangan: 'Printer struk 58 mm (ponsel/kasir kecil).', kertas: '58 mm' },
];

export const LABEL_PENERBIT_KWITANSI: Record<JenisPenerbitKwitansi, string> = {
  keuangan: 'Keuangan universitas',
  baak: 'BAAK',
  pmb: 'PMB',
  fakultas: 'Fakultas',
  unit: 'Unit lain',
};

export interface PenerbitKwitansi {
  jenis: JenisPenerbitKwitansi | string;
  /** Awalan nomor bukti, mis. KEU, BAAK, PMB, FAK05. */
  kode: string;
  /** Teks lencana penerbit, mis. "Keuangan Universitas", "Fakultas Teknik". */
  label: string;
  nama?: string | null;
  singkatan?: string | null;
  /** Warna aksen #RRGGBB. */
  warna?: string | null;
  varian?: VarianKwitansi | string | null;
  kota?: string | null;
  jabatan_penerima?: string | null;
  /** Data URI gambar tanda tangan. */
  ttd?: string | null;
  /** Data URI gambar stempel. */
  stempel?: string | null;
  kaki?: string | null;
  tampil_logo?: boolean;
  tampil_qr?: boolean;
  unit_id?: number | null;
}

export interface ButirRincianPembayaran {
  uraian: string;
  periode?: string | null;
  nominal: number;
  /** Potongan/beasiswa untuk butir ini. */
  potongan?: number | null;
  ket_potongan?: string | null;
  subtotal?: number | null;
  /** Dibayar untuk butir ini (bila berbeda dengan subtotal). */
  dibayar?: number | null;
}

export interface RiwayatBayarKwitansi {
  tanggal: string;
  nomor?: string | null;
  metode?: string | null;
  jumlah: number;
  potongan?: number | null;
  /** Tandai pembayaran pada kwitansi ini. */
  ini?: boolean;
}

export interface KwitansiResmiData {
  sumber?: 'keuangan' | 'pmb' | string;
  id_terbit?: number | null;
  /** Nomor bukti berawalan kode penerbit, mis. KEU-KW261119-00012. */
  nomor_bukti: string;
  nomor_asli?: string | null;
  /** Bawaan "BUKTI KAS MASUK". */
  judul?: string | null;
  tanggal: string;
  status?: 'sah' | 'batal' | string;
  status_bayar?: StatusBayarKwitansi | string | null;
  alasan_batal?: string | null;
  pt?: { nama: string; singkatan?: string | null; alamat?: string | null; telepon?: string | null; email?: string | null; website?: string | null; logo?: string | null } | null;
  penerbit: PenerbitKwitansi;
  pembayar: { nama?: string | null; nomor?: string | null; label_nomor?: string | null };
  program_studi?: { kode?: string | null; nama?: string | null; jenjang?: string | null; fakultas?: string | null } | null;
  kelas?: string | null;
  periode?: string | null;
  jenis_biaya?: string | null;
  keterangan?: string | null;
  keterangan_tambahan?: string | null;
  rincian?: ButirRincianPembayaran[];
  /** Biaya (tagihan sebelum potongan). */
  biaya?: number | null;
  potongan?: number | null;
  ket_potongan?: string | null;
  /** Jumlah dibayar pada kwitansi ini. */
  jumlah: number;
  sisa?: number | null;
  terbilang?: string | null;
  metode?: string | null;
  kanal?: string | null;
  jatuh_tempo?: string | null;
  riwayat?: RiwayatBayarKwitansi[];
  penerima?: string | null;
  /** Catatan pembayaran (dipotret saat terbit). */
  catatan?: string | null;
  dicetak?: number;
  url_verifikasi_resmi?: string | null;
  kode_verifikasi_resmi?: string | null;
  url_verifikasi?: string | null;
}

// ================================================================ Bantuan
const rp = (n: number | null | undefined) => (n == null ? '–' : formatRupiah(n));

function hurufAwalBesar(s: string): string {
  return s.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

/** "# Enam Ratus Ribu Rupiah #" */
export function teksTerbilangKwitansi(d: Pick<KwitansiResmiData, 'jumlah' | 'terbilang'>): string {
  return `# ${hurufAwalBesar(d.terbilang || terbilang(d.jumlah))} #`;
}

export function statusBayarKwitansi(d: Pick<KwitansiResmiData, 'status' | 'status_bayar' | 'sisa'>): StatusBayarKwitansi {
  if (d.status && d.status !== 'sah') return 'BATAL';
  const s = String(d.status_bayar ?? '').toUpperCase();
  if (s === 'BATAL') return 'BATAL';
  if (s === 'LUNAS') return 'LUNAS';
  if (s.startsWith('BELUM')) return 'BELUM';
  return (d.sisa ?? 0) > 0.001 ? 'BELUM' : 'LUNAS';
}

const LABEL_STATUS: Record<StatusBayarKwitansi, string> = { LUNAS: 'Lunas', BELUM: 'Belum', BATAL: 'Batal' };

function urlQr(d: KwitansiResmiData, dasar?: string): string | null {
  const u = d.url_verifikasi_resmi ?? d.url_verifikasi ?? null;
  if (!u) return null;
  if (/^https?:\/\//.test(u)) return u;
  return `${dasar ?? (typeof location !== 'undefined' ? location.origin : '')}${u}`;
}

function warnaAman(w: string | null | undefined): string {
  return w && /^#[0-9a-fA-F]{6}$/.test(w) ? w : '#0b6b3a';
}

function prodiTeks(d: KwitansiResmiData): string {
  const p = d.program_studi;
  if (!p?.nama) return p?.kode ?? '–';
  return `${p.nama}${p.jenjang ? ` (${p.jenjang})` : ''}`;
}

function tanggalPanjang(t: string | null | undefined): string {
  return t ? formatDate(t.slice(0, 10), 'long') : '–';
}

/** Data kwitansi rekaan (bukan data mahasiswa nyata) untuk katalog, pratinjau pengaturan, dan uji. */
export function contohKwitansi(penerbit?: Partial<PenerbitKwitansi>, ubah?: Partial<KwitansiResmiData>): KwitansiResmiData {
  const p: PenerbitKwitansi = { jenis: 'keuangan', kode: 'KEU', label: 'Keuangan Universitas', nama: 'Biro Administrasi Umum dan Keuangan', warna: '#0b6b3a', varian: 'klasik', kota: 'Marisa', jabatan_penerima: 'Kasir BAUK', tampil_logo: true, tampil_qr: true, ...penerbit };
  return {
    sumber: 'keuangan',
    nomor_bukti: `${p.kode}-KW261119-00012`,
    nomor_asli: 'KW261119-00012',
    judul: 'BUKTI KAS MASUK',
    tanggal: '2026-11-19 09:42:10',
    status: 'sah',
    status_bayar: 'BELUM',
    pt: { nama: 'Universitas Pohuwato', singkatan: 'UNIPO', alamat: 'Jalan Trans Sulawesi, Marisa, Pohuwato', telepon: '0853 0000 0000', website: 'www.unipo.ac.id' },
    penerbit: p,
    pembayar: { nama: 'Dewi Kartika Sari', nomor: '2501010099', label_nomor: 'NIM' },
    program_studi: { kode: '74201', nama: 'Ilmu Hukum', jenjang: 'S1', fakultas: 'Fakultas Hukum' },
    kelas: 'Reguler Sore',
    periode: 'Ganjil 2026/2027',
    jenis_biaya: 'Uang Kuliah Tunggal',
    keterangan: 'Pembayaran Uang Kuliah Tunggal Ganjil 2026/2027',
    rincian: [
      { uraian: 'Uang Kuliah Tunggal', periode: 'Ganjil 2026/2027', nominal: 2_500_000, potongan: 500_000, ket_potongan: 'Beasiswa prestasi', subtotal: 2_000_000, dibayar: 1_250_000 },
    ],
    biaya: 2_500_000,
    potongan: 500_000,
    ket_potongan: 'Beasiswa prestasi',
    jumlah: 1_250_000,
    sisa: 750_000,
    terbilang: 'satu juta dua ratus lima puluh ribu rupiah',
    metode: 'Tunai',
    jatuh_tempo: '2026-12-15',
    riwayat: [
      { tanggal: '2026-09-02 10:15:00', nomor: 'KW260902-00031', metode: 'Transfer bank', jumlah: 0, potongan: 500_000 },
      { tanggal: '2026-11-19 09:42:10', nomor: 'KW261119-00012', metode: 'Tunai', jumlah: 1_250_000, ini: true },
    ],
    penerima: 'Nur Aisyah',
    catatan: 'Pembayaran tidak dapat ditarik kembali.\nSisa pembayaran paling lambat 15 Desember 2026.',
    dicetak: 0,
    url_verifikasi_resmi: 'https://siakad.unipo.ac.id/api/v1/kwitansi/v/0123456789abcdef0123456789abcdef',
    kode_verifikasi_resmi: '0123456789abcdef0123456789abcdef',
    ...ubah,
  };
}

// ================================================================ Rincian pembayaran
export interface RingkasanRincianPembayaran {
  /** Total biaya sebelum potongan. */
  biaya: number;
  /** Total potongan/beasiswa ("Diberikan Potongan"). */
  potongan: number;
  /** Jumlah yang sudah/dibayar. */
  dibayar: number;
  /** Sisa pembayaran. */
  sisa: number;
}

export interface RincianPembayaranProps {
  /** Butir biaya (bisa banyak baris). */
  rincian: ButirRincianPembayaran[];
  /** Total; bawaan dihitung dari butir. */
  ringkasan?: Partial<RingkasanRincianPembayaran>;
  /** Riwayat cicilan/angsuran. */
  riwayat?: RiwayatBayarKwitansi[];
  metode?: string | null;
  kanal?: string | null;
  jatuhTempo?: string | null;
  /** Tampilkan terbilang jumlah dibayar. */
  terbilang?: boolean | string;
  /** `ringkas` (di kwitansi), `lengkap` (halaman tagihan/riwayat), `cetak` (hitam-putih untuk dicetak). */
  varian?: 'ringkas' | 'lengkap' | 'cetak';
  judul?: React.ReactNode;
  /** Warna aksen #RRGGBB (mis. warna penerbit). */
  aksen?: string | null;
  className?: string;
}

/** Hitung total rincian: biaya, potongan, dibayar, sisa. */
export function hitungRincianPembayaran(rincian: ButirRincianPembayaran[], riwayat?: RiwayatBayarKwitansi[]): RingkasanRincianPembayaran {
  const biaya = rincian.reduce((a, b) => a + (b.nominal || 0), 0);
  const potongan = rincian.reduce((a, b) => a + (b.potongan || 0), 0);
  const dariButir = rincian.some((b) => b.dibayar != null) ? rincian.reduce((a, b) => a + (b.dibayar || 0), 0) : null;
  const dibayar = dariButir ?? (riwayat ?? []).reduce((a, b) => a + (b.jumlah || 0), 0);
  return { biaya, potongan, dibayar, sisa: Math.max(0, biaya - potongan - dibayar) };
}

/**
 * Rincian pembayaran modern: tabel butir biaya (komponen, periode, nominal, potongan/beasiswa, subtotal), total biaya,
 * total potongan ("Diberikan Potongan"), jumlah dibayar, sisa pembayaran, bilah progres pelunasan, status Lunas/Belum,
 * riwayat cicilan/angsuran, metode & kanal bayar, jatuh tempo. Angka rata kanan; di ponsel tabel menjadi kartu.
 */
export function RincianPembayaran({ rincian, ringkasan, riwayat, metode, kanal, jatuhTempo, terbilang: tampilTerbilang, varian = 'lengkap', judul, aksen, className }: RincianPembayaranProps) {
  const hitung = hitungRincianPembayaran(rincian, riwayat);
  const r: RingkasanRincianPembayaran = { ...hitung, ...Object.fromEntries(Object.entries(ringkasan ?? {}).filter(([, v]) => v != null)) } as RingkasanRincianPembayaran;
  const neto = Math.max(0, r.biaya - r.potongan);
  const persen = neto > 0 ? Math.min(100, Math.round((r.dibayar / neto) * 100)) : 100;
  const lunas = r.sisa <= 0.001;
  const ringkas = varian === 'ringkas';
  const adaPotongan = rincian.some((b) => (b.potongan ?? 0) > 0);
  const teksTerbilang = typeof tampilTerbilang === 'string' ? tampilTerbilang : tampilTerbilang ? terbilang(r.dibayar) : null;
  return (
    <section
      className={cn('u-rincian-bayar', className)}
      data-varian={varian}
      data-lunas={lunas || undefined}
      style={aksen ? ({ '--rb-aksen': warnaAman(aksen) } as React.CSSProperties) : undefined}
      aria-label={typeof judul === 'string' ? judul : 'Rincian pembayaran'}
    >
      <header className="u-rincian-bayar-kepala">
        <h3>{judul ?? 'Rincian pembayaran'}</h3>
        <span className="u-rincian-bayar-status" data-status={lunas ? 'lunas' : 'belum'}>
          {lunas ? <CircleCheck aria-hidden /> : <Clock3 aria-hidden />}
          {lunas ? 'Lunas' : 'Belum lunas'}
        </span>
      </header>
      <div className="u-rincian-bayar-tabel" role="table" aria-label="Butir biaya">
        <div role="row" className="u-rincian-bayar-baris u-rincian-bayar-judul-kolom">
          <span role="columnheader">Komponen biaya</span>
          {!ringkas && <span role="columnheader">Periode</span>}
          <span role="columnheader" data-angka>
            Nominal
          </span>
          {(adaPotongan || !ringkas) && (
            <span role="columnheader" data-angka>
              Potongan
            </span>
          )}
          <span role="columnheader" data-angka>
            Subtotal
          </span>
        </div>
        {rincian.map((b, i) => {
          const sub = b.subtotal ?? b.nominal - (b.potongan ?? 0);
          return (
            <div role="row" key={i} className="u-rincian-bayar-baris">
              <span role="cell" data-label="Komponen">
                <b>{b.uraian}</b>
                {ringkas && b.periode && <small>{b.periode}</small>}
                {b.ket_potongan && (b.potongan ?? 0) > 0 && <small className="u-rincian-bayar-ket">{b.ket_potongan}</small>}
              </span>
              {!ringkas && (
                <span role="cell" data-label="Periode">
                  {b.periode ?? '–'}
                </span>
              )}
              <span role="cell" data-angka data-label="Nominal">
                {rp(b.nominal)}
              </span>
              {(adaPotongan || !ringkas) && (
                <span role="cell" data-angka data-label="Potongan" data-potongan={(b.potongan ?? 0) > 0 || undefined}>
                  {(b.potongan ?? 0) > 0 ? `− ${rp(b.potongan)}` : '–'}
                </span>
              )}
              <span role="cell" data-angka data-label="Subtotal">
                {rp(sub)}
              </span>
            </div>
          );
        })}
      </div>
      <dl className="u-rincian-bayar-total">
        <div>
          <dt>Total biaya</dt>
          <dd>{rp(r.biaya)}</dd>
        </div>
        <div data-potongan>
          <dt>Diberikan potongan</dt>
          <dd>{r.potongan > 0 ? `− ${rp(r.potongan)}` : rp(0)}</dd>
        </div>
        <div data-utama>
          <dt>Jumlah dibayar</dt>
          <dd>{rp(r.dibayar)}</dd>
        </div>
        <div data-sisa={r.sisa > 0 || undefined}>
          <dt>Sisa pembayaran</dt>
          <dd>{rp(r.sisa)}</dd>
        </div>
      </dl>
      {teksTerbilang && <p className="u-rincian-bayar-terbilang">Terbilang: {hurufAwalBesar(teksTerbilang)}</p>}
      <div className="u-rincian-bayar-progres" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={persen} aria-label="Pelunasan">
        <span style={{ width: `${persen}%` }} />
      </div>
      <p className="u-rincian-bayar-meta">
        <span>{persen}% terbayar</span>
        {metode && <span>Metode: {metode}</span>}
        {kanal && <span>Kanal: {kanal}</span>}
        {jatuhTempo && !lunas && <span data-tempo>Jatuh tempo: {tanggalPanjang(jatuhTempo)}</span>}
      </p>
      {!ringkas && riwayat && riwayat.length > 0 && (
        <div className="u-rincian-bayar-riwayat">
          <h4>Riwayat cicilan/angsuran</h4>
          <ol>
            {riwayat.map((b, i) => (
              <li key={i} data-ini={b.ini || undefined}>
                <span className="u-rincian-bayar-titik" aria-hidden />
                <span>
                  <b>{tanggalPanjang(b.tanggal)}</b>
                  <small>{[b.nomor, b.metode].filter(Boolean).join(' · ') || '–'}</small>
                </span>
                <b data-angka>
                  {rp(b.jumlah)}
                  {(b.potongan ?? 0) > 0 && <small>potongan {rp(b.potongan)}</small>}
                </b>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

// ================================================================ Kwitansi
export interface KwitansiProps {
  data: KwitansiResmiData;
  /** Bawaan: varian pilihan penerbit, lalu `klasik`. */
  varian?: VarianKwitansi;
  /** Tandai SALINAN (cetak ulang). */
  salinan?: boolean;
  /** Tampilkan bagian rincian pembayaran ringkas (bawaan ya). */
  rincian?: boolean;
  /** Alamat dasar untuk url_verifikasi relatif. */
  urlVerifikasi?: string;
  className?: string;
}

function Logo({ d }: { d: KwitansiResmiData }) {
  const logo = d.penerbit.tampil_logo !== false ? d.pt?.logo : null;
  if (logo) return <img className="u-kw-logo" src={logo} alt="" />;
  const singkat = (d.pt?.singkatan ?? d.pt?.nama ?? 'U').replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase();
  return (
    <span className="u-kw-logo u-kw-logo-teks" aria-hidden>
      {singkat}
    </span>
  );
}

function Isian({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('u-kw-baris', className)}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * Kwitansi resmi UNIPO (Bukti Kas Masuk) tanpa memuat data: kop universitas + lencana penerbit, nomor bukti berawalan
 * unit, tanggal bayar, program studi, kelas, terima dari + NIM, sebesar (terbilang), keterangan, biaya, jumlah
 * dibayar, sisa, status bayar dengan cap, catatan, diberikan potongan, diterima oleh (tanda tangan + stempel), rincian
 * pembayaran ringkas, dan QR verifikasi. Tujuh varian; semuanya memuat isian yang sama.
 */
export function Kwitansi({ data: d, varian: varianProp, salinan, rincian = true, urlVerifikasi, className }: KwitansiProps) {
  const varian = (varianProp ?? (VARIAN_KWITANSI.some((v) => v.value === d.penerbit.varian) ? d.penerbit.varian : 'klasik')) as VarianKwitansi;
  const thermal = varian.startsWith('thermal');
  const status = statusBayarKwitansi(d);
  const url = d.penerbit.tampil_qr !== false ? urlQr(d, urlVerifikasi) : null;
  const pt = d.pt?.nama ?? 'Universitas Pohuwato';
  const potongan = d.potongan ?? 0;
  const teksPotongan = potongan > 0 ? `${rp(potongan)}${d.ket_potongan ? ` (${d.ket_potongan})` : ''}` : '-';
  const judul = d.judul || 'BUKTI KAS MASUK';
  const butir = d.rincian?.length ? d.rincian : [{ uraian: d.jenis_biaya ?? d.keterangan ?? 'Pembayaran', periode: d.periode, nominal: d.biaya ?? d.jumlah + potongan, potongan, subtotal: (d.biaya ?? d.jumlah + potongan) - potongan, dibayar: d.jumlah }];
  const kontak = [d.pt?.alamat, d.pt?.telepon ? `Telp. ${d.pt.telepon}` : null, d.pt?.website].filter(Boolean).join(' · ');
  const tglBayar = tanggalPanjang(d.tanggal);
  const nomorQr = d.kode_verifikasi_resmi ? d.kode_verifikasi_resmi.slice(0, 8).toUpperCase() : null;

  const kop = (
    <header className="u-kw-kop">
      <Logo d={d} />
      <div className="u-kw-pt">
        <b>{pt}</b>
        {kontak && <small>{kontak}</small>}
      </div>
      <span className="u-kw-lencana" title={d.penerbit.nama ?? undefined}>
        <span className="u-kw-lencana-kode">{d.penerbit.kode}</span>
        {d.penerbit.label}
      </span>
    </header>
  );
  const kepala = (
    <div className="u-kw-kepala">
      <h2 className="u-kw-judul">{judul}</h2>
      <dl className="u-kw-nomor">
        <Isian label="No. Bukti">
          <span className="u-kw-mono">{d.nomor_bukti}</span>
        </Isian>
        <Isian label="Tgl. Bayar">{tglBayar}</Isian>
      </dl>
    </div>
  );
  const prodi = (
    <dl className="u-kw-prodi">
      <Isian label="Program Studi">{prodiTeks(d)}</Isian>
      <Isian label="Kelas">{d.kelas || '–'}</Isian>
    </dl>
  );
  const isian = (
    <dl className="u-kw-isian">
      <Isian label="Terima dari">
        <b>{d.pembayar.nama ?? '–'}</b> / {d.pembayar.label_nomor ?? 'NIM'}: <b className="u-kw-mono">{d.pembayar.nomor ?? '–'}</b>
      </Isian>
      <Isian label="Sebesar" className="u-kw-sebesar">
        <i>{teksTerbilangKwitansi(d)}</i>
      </Isian>
      <Isian label="Keterangan">
        {d.keterangan || d.jenis_biaya || '–'}
        {d.keterangan_tambahan && !thermal && <small className="u-kw-tambahan">{d.keterangan_tambahan}</small>}
      </Isian>
      <Isian label="Biaya" className="u-kw-uang">
        {rp(d.biaya ?? null)}
      </Isian>
      <Isian label="Jumlah Dibayar" className="u-kw-uang u-kw-dibayar">
        {rp(d.jumlah)}
      </Isian>
      <Isian label="Sisa Pembayaran" className="u-kw-uang">
        {rp(d.sisa ?? null)}
      </Isian>
      <Isian label="Metode">{[d.metode, d.kanal].filter(Boolean).join(' · ') || '–'}</Isian>
    </dl>
  );
  const sorotan = (
    <div className="u-kw-sorotan">
      <small>Jumlah dibayar</small>
      <b>{rp(d.jumlah)}</b>
    </div>
  );
  const statusEl = (
    <div className="u-kw-status" data-status={status}>
      <span>Status Bayar:</span>
      <b className="u-kw-cap">{LABEL_STATUS[status]}</b>
    </div>
  );
  const catatan = (
    <div className="u-kw-catatan">
      <p>
        <span>Catatan:</span> {d.catatan || 'Pembayaran tidak dapat ditarik kembali.'}
      </p>
      <p>
        <span>Diberikan Potongan:</span> {teksPotongan}
      </p>
    </div>
  );
  const ttd = (
    <div className="u-kw-ttd">
      <span>
        {d.penerbit.kota ? `${d.penerbit.kota}, ${tglBayar}` : null}
        {d.penerbit.kota ? <br /> : null}
        Diterima oleh,
      </span>
      <span className="u-kw-ttd-gambar">
        {d.penerbit.stempel && <img className="u-kw-stempel" src={d.penerbit.stempel} alt="Stempel" />}
        {d.penerbit.ttd && <img className="u-kw-ttd-img" src={d.penerbit.ttd} alt="Tanda tangan" />}
      </span>
      <b className="u-kw-penerima">{d.penerima || '..............................'}</b>
      {d.penerbit.jabatan_penerima && <small>{d.penerbit.jabatan_penerima}</small>}
    </div>
  );
  const qr = url ? (
    <div className="u-kw-qr">
      <KodeQr nilai={url} ukuran={thermal ? 112 : 84} gaya="dokumen" label="QR verifikasi keaslian kwitansi" />
      <small>
        <ShieldCheck aria-hidden /> Pindai untuk cek keaslian{nomorQr ? ` · ${nomorQr}` : ''}
      </small>
    </div>
  ) : null;
  const rinci =
    rincian && !thermal && varian !== 'a5' && varian !== 'arsip' ? (
      <RincianPembayaran varian="ringkas" judul="Rincian pembayaran" rincian={butir} ringkasan={{ biaya: d.biaya ?? undefined, potongan, dibayar: d.jumlah, sisa: d.sisa ?? undefined }} metode={d.metode} jatuhTempo={d.jatuh_tempo} aksen={d.penerbit.warna} />
    ) : rincian ? (
      <div className="u-kw-rincian-struk">
        <b>Rincian pembayaran</b>
        {butir.map((b, i) => (
          <React.Fragment key={i}>
            <span>{b.uraian}</span>
            <span data-angka>{rp(b.nominal)}</span>
            {(b.potongan ?? 0) > 0 && (
              <>
                <span>  Potongan</span>
                <span data-angka>− {rp(b.potongan)}</span>
              </>
            )}
          </React.Fragment>
        ))}
      </div>
    ) : null;
  const kaki = (
    <p className="u-kw-kaki-teks">
      {d.penerbit.kaki ?? `Kwitansi elektronik ${d.penerbit.label}, ${pt}.`}
      {d.alasan_batal ? ` Dibatalkan: ${d.alasan_batal}.` : ''}
    </p>
  );

  const arsip =
    varian === 'arsip' ? (
      <aside className="u-kw-arsip" aria-label="Bonggol arsip">
        <b className="u-kw-arsip-judul">ARSIP {d.penerbit.kode}</b>
        <dl>
          <Isian label="No. Bukti">
            <span className="u-kw-mono">{d.nomor_bukti}</span>
          </Isian>
          <Isian label="Tgl. Bayar">{tglBayar}</Isian>
          <Isian label="Terima dari">
            {d.pembayar.nama ?? '–'} / {d.pembayar.nomor ?? '–'}
          </Isian>
          <Isian label="Keterangan">{d.keterangan ?? '–'}</Isian>
          <Isian label="Jumlah">{rp(d.jumlah)}</Isian>
          <Isian label="Sisa">{rp(d.sisa ?? null)}</Isian>
          <Isian label="Status">{LABEL_STATUS[status]}</Isian>
          <Isian label="Penerima">{d.penerima ?? '–'}</Isian>
        </dl>
        <span className="u-kw-sobek" aria-hidden>
          <Scissors />
        </span>
      </aside>
    ) : null;

  return (
    <article
      className={cn('u-kw', className)}
      data-varian={varian}
      data-penerbit={d.penerbit.jenis}
      data-status={status}
      data-salinan={salinan || undefined}
      style={{ '--kw-aksen': warnaAman(d.penerbit.warna) } as React.CSSProperties}
      aria-label={`${judul} ${d.nomor_bukti}, ${d.penerbit.label}`}
    >
      {arsip}
      <div className="u-kw-badan">
        {kop}
        {kepala}
        {prodi}
        {varian === 'a5' || varian === 'arsip' ? (
          <div className="u-kw-dua">
            <div className="u-kw-kiri">
              {isian}
              {rinci}
              {catatan}
            </div>
            <div className="u-kw-kanan">
              {sorotan}
              {statusEl}
              {qr}
              {ttd}
            </div>
          </div>
        ) : (
          <>
            {varian === 'modern' ? (
              <div className="u-kw-sorot-baris">
                {isian}
                {sorotan}
              </div>
            ) : (
              isian
            )}
            {rinci}
            <div className="u-kw-bawah">
              {catatan}
              {statusEl}
              {qr}
              {ttd}
            </div>
          </>
        )}
        {kaki}
      </div>
      {salinan && (
        <span className="u-kw-salinan" aria-label="Salinan">
          SALINAN
        </span>
      )}
      {status === 'BATAL' && (
        <span className="u-kw-batal" aria-label="Dibatalkan">
          BATAL
        </span>
      )}
    </article>
  );
}

// ================================================================ Cetak
const KERTAS: Record<VarianKwitansi, { lebar: number; tinggi?: number; tepi: number; lanskap?: boolean }> = {
  klasik: { lebar: 210, tinggi: 297, tepi: 10 },
  modern: { lebar: 210, tinggi: 297, tepi: 10 },
  minimal: { lebar: 210, tinggi: 297, tepi: 12 },
  a5: { lebar: 210, tinggi: 148, tepi: 7, lanskap: true },
  arsip: { lebar: 210, tinggi: 148, tepi: 6, lanskap: true },
  thermal80: { lebar: 80, tepi: 3 },
  thermal58: { lebar: 58, tepi: 2 },
};

/** Ukuran kertas @page untuk varian (thermal: tinggi mengikuti isi). */
export function kertasKwitansi(varian: VarianKwitansi): { lebar: number; tinggi?: number; tepi: number } {
  return KERTAS[varian];
}

/**
 * Cetak satu elemen kwitansi lewat iframe tersembunyi dengan ukuran kertas sesuai varian (A4, A5 lanskap, struk
 * 80/58 mm), memakai stylesheet halaman yang sama. Mengembalikan Promise yang selesai setelah dialog cetak dibuka.
 */
export async function cetakKwitansi(el: HTMLElement, varian: VarianKwitansi, judul = 'Kwitansi'): Promise<void> {
  const k = KERTAS[varian] ?? KERTAS.klasik;
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.title = judul;
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: `${k.lebar}mm`, height: '10px', border: '0', opacity: '0', pointerEvents: 'none' });
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  const gaya = [...document.querySelectorAll('link[rel="stylesheet"], style')].map((n) => n.outerHTML).join('\n');
  doc.open();
  doc.write(
    `<!doctype html><html lang="id" data-theme="light"><head><meta charset="utf-8"><title>${judul.replace(/[<>&]/g, '')}</title><base href="${location.href}">${gaya}` +
      `<style>html,body{margin:0;padding:0;background:#fff}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head>` +
      `<body class="u-kw-halaman-cetak" data-varian="${varian}">${el.outerHTML}</body></html>`,
  );
  doc.close();
  await new Promise<void>((ok) => {
    const w = iframe.contentWindow!;
    if (doc.readyState === 'complete') ok();
    else w.addEventListener('load', () => ok(), { once: true });
    setTimeout(ok, 1500);
  });
  try {
    await (doc as Document & { fonts?: FontFaceSet }).fonts?.ready;
  } catch {
    /* abaikan */
  }
  const tinggi = k.tinggi ?? Math.ceil((doc.body.scrollHeight * 25.4) / 96 + k.tepi * 2 + 2);
  const st = doc.createElement('style');
  st.textContent = `@page{size:${k.lebar}mm ${tinggi}mm;margin:${k.tepi}mm}`;
  doc.head.appendChild(st);
  const w = iframe.contentWindow!;
  const buang = () => setTimeout(() => iframe.remove(), 500);
  w.addEventListener('afterprint', buang, { once: true });
  setTimeout(() => iframe.isConnected && iframe.remove(), 120_000);
  w.focus();
  w.print();
}

// ================================================================ Kwitansi terhubung API
export type SumberKwitansi =
  | { jenis: 'keuangan' | 'kasir' | 'terbit' | 'pmb-admin'; id: number }
  | { jenis: 'pmb-saya'; pendaftaran: string; id: number };

/** Path API data kwitansi untuk sumber itu. */
export function pathKwitansi(s: SumberKwitansi): string {
  switch (s.jenis) {
    case 'keuangan':
      return `/v1/keuangan/transaksi/${s.id}/kwitansi`;
    case 'kasir':
      return `/v1/kasir/transaksi/${s.id}/kwitansi`;
    case 'terbit':
      return `/v1/kwitansi/terbit/${s.id}`;
    case 'pmb-admin':
      return `/v1/pmb/admin/tagihan/${s.id}/kwitansi`;
    case 'pmb-saya':
      return `/v1/pmb/saya/pendaftaran/${encodeURIComponent(s.pendaftaran)}/tagihan/${s.id}/kwitansi`;
  }
}

export interface KwitansiResmiProps {
  /** Sumber data (dimuat lewat SDK). Abaikan bila `data` diberikan. */
  sumber?: SumberKwitansi;
  data?: KwitansiResmiData;
  /** Varian awal; bawaan pilihan penerbit. */
  varian?: VarianKwitansi;
  /** Tampilkan pemilih varian dan sakelar salinan (bawaan ya). */
  pilihVarian?: boolean;
  /** Alamat dasar untuk url_verifikasi relatif. */
  urlVerifikasi?: string;
  /** Aksi tambahan di bilah alat, mis. tombol terbitkan PDF. */
  aksi?: React.ReactNode;
  /** Catat cetak ke /v1/kwitansi/terbit/{id}/cetak (bawaan ya; cetak berikutnya bertanda SALINAN). */
  catatCetak?: boolean;
  onCetak?: (varian: VarianKwitansi) => void;
  className?: string;
}

/**
 * Kwitansi resmi lengkap dengan bilah alat: pemilih varian, tanda SALINAN (otomatis bila sudah pernah dicetak), dan
 * tombol Cetak (ukuran kertas sesuai varian). Data dimuat dari `sumber` atau diberikan lewat `data`.
 */
export function KwitansiResmi({ sumber, data, varian: varianAwal, pilihVarian = true, urlVerifikasi, aksi, catatCetak = true, onCetak, className }: KwitansiResmiProps) {
  const siakad = useOptionalSiakad();
  const toast = useToast();
  const path = sumber ? pathKwitansi(sumber) : null;
  const q = useSiakadQuery<KwitansiResmiData>(['kwitansi-resmi', path], (s, signal) => s.request<KwitansiResmiData>({ method: 'GET', path: path! }, { signal }), { enabled: !data && Boolean(path) });
  const d = data ?? q.data;
  const [varian, setVarian] = React.useState<VarianKwitansi | null>(varianAwal ?? null);
  const [salinan, setSalinan] = React.useState<boolean | null>(null);
  const [sibuk, setSibuk] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  if (!d) {
    if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
    if (!path && !data) return <Empty title="Kwitansi belum dipilih" icon={<Receipt />} />;
    return <Spinner />;
  }
  const v = (varian ?? (VARIAN_KWITANSI.some((x) => x.value === d.penerbit.varian) ? d.penerbit.varian : 'klasik')) as VarianKwitansi;
  const sal = salinan ?? (d.dicetak ?? 0) > 0;
  const cetak = async () => {
    const el = ref.current?.querySelector<HTMLElement>('.u-kw');
    if (!el) return;
    setSibuk(true);
    try {
      if (catatCetak && siakad && d.id_terbit) {
        try {
          const r = await siakad.request<{ dicetak: number; salinan: boolean }>({ method: 'POST', path: `/v1/kwitansi/terbit/${d.id_terbit}/cetak` });
          if (r.data?.salinan && !sal) {
            setSalinan(true);
            toast.add({ title: 'Kwitansi ini sudah pernah dicetak', description: 'Cetakan ini bertanda SALINAN.', type: 'info' });
            await new Promise((ok) => setTimeout(ok, 60));
          }
        } catch {
          /* Petugas tanpa izin kwitansi.lihat tetap boleh mencetak; hitungan cetak tidak dicatat. */
        }
      }
      await cetakKwitansi(ref.current!.querySelector<HTMLElement>('.u-kw')!, v, `Kwitansi ${d.nomor_bukti}`);
      onCetak?.(v);
      if (path) invalidateSiakad('kwitansi-resmi');
    } finally {
      setSibuk(false);
    }
  };
  return (
    <div className={cn('u-kw-pratinjau', className)} ref={ref}>
      <div className="u-kw-alat" role="toolbar" aria-label="Kwitansi">
        {pilihVarian && (
          <>
            <Field label="Varian" orientation="horizontal" className="u-kw-alat-varian">
              <Select<VarianKwitansi> aria-label="Varian kwitansi" value={v} onValueChange={(x) => x && setVarian(x)} options={VARIAN_KWITANSI.map((x) => ({ value: x.value, label: x.label, description: x.kertas }))} />
            </Field>
            <label className="u-kw-alat-salinan">
              <Switch checked={sal} onCheckedChange={(c: boolean) => setSalinan(c)} aria-label="Tandai salinan" />
              <span>Salinan</span>
            </label>
          </>
        )}
        <span className="u-kw-alat-isi">
          {(d.dicetak ?? 0) > 0 && <Badge variant="outline">Dicetak {d.dicetak}×</Badge>}
          {aksi}
          <Button onClick={() => void cetak()} loading={sibuk}>
            <Printer /> Cetak
          </Button>
        </span>
      </div>
      <div className="u-kw-kanvas" data-varian={v}>
        <Kwitansi data={d} varian={v} salinan={sal} urlVerifikasi={urlVerifikasi} />
      </div>
    </div>
  );
}

// ================================================================ Bantuan rincian dari data lain
/** Butir rincian dari data keuangan mahasiswa (GET /v1/keuangan/mahasiswa/{nim}). */
export function rincianDariKeuanganMahasiswa(d: {
  periode: Array<{ tahun_id: string; item: Array<{ jenis_biaya: string; tagihan: number; dibayar: number; potongan?: number; sisa: number; pembayaran?: Array<{ tanggal: string; jumlah: number; keterangan?: string | null; nomor?: string | null; metode?: string | null }> }> }>;
}): { rincian: ButirRincianPembayaran[]; riwayat: RiwayatBayarKwitansi[] } {
  const rincian: ButirRincianPembayaran[] = [];
  const riwayat: RiwayatBayarKwitansi[] = [];
  for (const p of d.periode) {
    for (const it of p.item) {
      const pot = it.potongan ?? 0;
      rincian.push({ uraian: it.jenis_biaya, periode: namaPeriode(p.tahun_id), nominal: it.tagihan + pot, potongan: pot, subtotal: it.tagihan, dibayar: it.dibayar });
      for (const b of it.pembayaran ?? []) riwayat.push({ tanggal: b.tanggal, nomor: b.nomor ?? null, metode: b.metode ?? b.keterangan ?? it.jenis_biaya, jumlah: b.jumlah });
    }
  }
  riwayat.sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)));
  return { rincian, riwayat };
}

/** "20261" -> "Ganjil 2026/2027" */
function namaPeriode(tahunId: string | null | undefined): string | null {
  if (!tahunId) return null;
  const m = /^(\d{4})([1-3])$/.exec(tahunId);
  if (!m) return tahunId;
  return `${{ '1': 'Ganjil', '2': 'Genap', '3': 'Pendek' }[m[2] as '1' | '2' | '3']} ${m[1]}/${Number(m[1]) + 1}`;
}
