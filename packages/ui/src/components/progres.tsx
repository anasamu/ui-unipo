'use client';
import * as React from 'react';
import { Check, CircleAlert, Pause, RotateCcw, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatBytes } from '../lib/format';
import { usePlatform } from '../lib/platform';
import type { Tone } from './display';

// Progres dalam banyak variasi. Semua mengikuti pengaturan perangkat (setelPlatform): di mobile tampilan
// otomatis lebih ringkas (langkah jadi "2 dari 5", gauge lebih kecil, label pindah ke bawah).

const batas = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
const persen = (nilai: number, max: number) => Math.round(batas(max ? nilai / max : 0) * 100);

/** Pilih nada dari rasio terhadap ambang: di bawah `waspada` aman, di atas `bahaya` merah. */
export function nadaAmbang(rasio: number, ambang: { waspada?: number; bahaya?: number } = {}, terbalik = false): Tone {
  const { waspada = 0.8, bahaya = 1 } = ambang;
  if (terbalik) return rasio >= bahaya ? 'success' : rasio >= waspada ? 'warning' : 'danger';
  return rasio >= bahaya ? 'danger' : rasio >= waspada ? 'warning' : 'success';
}

// ================================================================ Langkah
export type StatusLangkah = 'selesai' | 'aktif' | 'menunggu' | 'gagal' | 'dilewati';
export interface LangkahProgres {
  label: React.ReactNode;
  status?: StatusLangkah;
  keterangan?: React.ReactNode;
  /** Waktu langkah selesai/terjadi, mis. "12 Nov 10.21". */
  waktu?: React.ReactNode;
}
export interface ProgressLangkahProps {
  langkah: LangkahProgres[];
  /** Indeks langkah aktif (0-based). Dipakai bila `status` tiap langkah tidak diisi. */
  saatIni?: number;
  /**
   * `segmen` bilah terpotong per langkah · `titik` lingkaran bernomor dengan garis · `garis` label di bawah garis tipis ·
   * `vertikal` linimasa (cocok untuk lacak pengajuan) · `ringkas` "Langkah 2 dari 5" + bilah.
   */
  varian?: 'segmen' | 'titik' | 'garis' | 'vertikal' | 'ringkas';
  /** Klik langkah (mis. kembali ke langkah formulir sebelumnya). */
  onPilih?: (indeks: number) => void;
  className?: string;
}

function statusLangkah(l: LangkahProgres, i: number, saatIni?: number): StatusLangkah {
  if (l.status) return l.status;
  if (saatIni == null) return 'menunggu';
  return i < saatIni ? 'selesai' : i === saatIni ? 'aktif' : 'menunggu';
}

/** Progres bertahap: alur pengajuan, wizard formulir, tahapan PMB, status surat. */
export function ProgressLangkah({ langkah, saatIni, varian = 'titik', onPilih, className }: ProgressLangkahProps) {
  const p = usePlatform();
  const v = p.mobile && langkah.length > 3 && (varian === 'titik' || varian === 'garis') ? 'ringkas' : varian;
  const st = langkah.map((l, i) => statusLangkah(l, i, saatIni));
  const selesai = st.filter((s) => s === 'selesai' || s === 'dilewati').length;
  const aktif = Math.max(
    0,
    st.findIndex((s) => s === 'aktif' || s === 'gagal'),
  );
  if (v === 'ringkas') {
    const ke = st.includes('aktif') || st.includes('gagal') ? aktif : Math.min(selesai, langkah.length - 1);
    return (
      <div className={cn('u-pl-ringkas', className)} role="group" aria-label={`Langkah ${ke + 1} dari ${langkah.length}`}>
        <div className="u-pl-ringkas-kepala">
          <span>
            Langkah {ke + 1} dari {langkah.length}
          </span>
          <b>{langkah[ke]?.label}</b>
        </div>
        <div className="u-pl-segmen" aria-hidden>
          {st.map((s, i) => (
            <span key={i} data-status={s} />
          ))}
        </div>
        {langkah[ke]?.keterangan && <small className="u-pl-ket">{langkah[ke].keterangan}</small>}
      </div>
    );
  }
  if (v === 'segmen') {
    return (
      <div className={cn('u-pl-segmen-bungkus', className)}>
        <div className="u-pl-segmen" role="progressbar" aria-valuenow={selesai} aria-valuemax={langkah.length} aria-valuemin={0}>
          {st.map((s, i) => (
            <span key={i} data-status={s} title={typeof langkah[i].label === 'string' ? (langkah[i].label as string) : undefined} />
          ))}
        </div>
        <ol className="u-pl-segmen-label">
          {langkah.map((l, i) => (
            <li key={i} data-status={st[i]}>
              {l.label}
            </li>
          ))}
        </ol>
      </div>
    );
  }
  return (
    <ol className={cn('u-pl', className)} data-varian={v}>
      {langkah.map((l, i) => {
        const s = st[i];
        const isi = (
          <>
            <span className="u-pl-tanda" aria-hidden>
              {s === 'selesai' ? <Check /> : s === 'gagal' ? <X /> : v === 'garis' ? null : i + 1}
            </span>
            <span className="u-pl-teks">
              <span className="u-pl-label">{l.label}</span>
              {l.keterangan && <small className="u-pl-ket">{l.keterangan}</small>}
              {l.waktu && <time className="u-pl-waktu">{l.waktu}</time>}
            </span>
          </>
        );
        return (
          <li key={i} className="u-pl-item" data-status={s} aria-current={s === 'aktif' ? 'step' : undefined}>
            {onPilih ? (
              <button type="button" className="u-pl-tombol" onClick={() => onPilih(i)}>
                {isi}
              </button>
            ) : (
              isi
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ================================================================ Bertumpuk
export interface BagianProgres {
  label: React.ReactNode;
  nilai: number;
  tone?: Tone | 'info' | 'muted';
  /** Warna CSS bebas, mis. var(--u-chart-3). Mengalahkan `tone`. */
  warna?: string;
}
export interface ProgressBertumpukProps {
  bagian: BagianProgres[];
  /** Total (bawaan jumlah bagian). Sisa tampil abu-abu. */
  total?: number;
  label?: React.ReactNode;
  /** Format angka di legenda (bawaan angka + persen). */
  format?: (nilai: number, total: number) => React.ReactNode;
  legenda?: boolean;
  tinggi?: 'sm' | 'md' | 'lg';
  className?: string;
}
const WARNA_URUT = ['var(--u-chart-1)', 'var(--u-chart-2)', 'var(--u-chart-3)', 'var(--u-chart-4)', 'var(--u-chart-5)', 'var(--u-chart-6)'];
const warnaTone = (t?: BagianProgres['tone']) => (t === 'muted' ? 'var(--u-border-strong)' : t ? `var(--u-${t})` : undefined);

/** Satu bilah dengan beberapa bagian: tagihan lunas/cicil/belum, status KRS, sebaran nilai, komposisi anggaran. */
export function ProgressBertumpuk({ bagian, total, label, format, legenda = true, tinggi = 'md', className }: ProgressBertumpukProps) {
  const jumlah = bagian.reduce((a, b) => a + Math.max(0, b.nilai), 0);
  const t = Math.max(total ?? jumlah, jumlah) || 1;
  const fmt = format ?? ((n: number, tt: number) => `${n.toLocaleString('id-ID')} (${persen(n, tt)}%)`);
  return (
    <div className={cn('u-pb', className)}>
      {label && <div className="u-pb-label">{label}</div>}
      <div className="u-pb-trek" data-tinggi={tinggi} role="img" aria-label={bagian.map((b) => `${typeof b.label === 'string' ? b.label : ''} ${persen(b.nilai, t)}%`).join(', ')}>
        {bagian.map((b, i) => (b.nilai > 0 ? <span key={i} style={{ width: `${(b.nilai / t) * 100}%`, background: b.warna ?? warnaTone(b.tone) ?? WARNA_URUT[i % WARNA_URUT.length] }} /> : null))}
      </div>
      {legenda && (
        <ul className="u-pb-legenda">
          {bagian.map((b, i) => (
            <li key={i}>
              <i style={{ background: b.warna ?? warnaTone(b.tone) ?? WARNA_URUT[i % WARNA_URUT.length] }} aria-hidden />
              <span>{b.label}</span>
              <b>{fmt(b.nilai, t)}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ================================================================ Target
export interface ProgressTargetProps {
  nilai: number;
  target: number;
  /** Skala penuh bilah (bawaan max(target × 1,25, nilai)). */
  max?: number;
  label?: React.ReactNode;
  satuan?: string;
  format?: (n: number) => string;
  className?: string;
}
/** Capaian terhadap target dengan penanda garis: IKU, SKS lulus vs syarat, serapan vs rencana, penerimaan vs target. */
export function ProgressTarget({ nilai, target, max, label, satuan = '', format, className }: ProgressTargetProps) {
  const m = max ?? Math.max(target * 1.25, nilai) ?? 1;
  const f = format ?? ((n: number) => `${n.toLocaleString('id-ID')}${satuan ? ` ${satuan}` : ''}`);
  const capai = nilai >= target;
  return (
    <div className={cn('u-pt', className)} data-capai={capai || undefined}>
      <div className="u-pt-kepala">
        {label && <span className="u-pt-label">{label}</span>}
        <span className="u-pt-nilai">
          <b>{f(nilai)}</b> / {f(target)}
        </span>
      </div>
      <div className="u-pt-trek" role="progressbar" aria-valuenow={nilai} aria-valuemax={m} aria-valuemin={0}>
        <span className="u-pt-isi" style={{ width: `${batas(nilai / m) * 100}%` }} />
        <span className="u-pt-tanda" style={{ left: `${batas(target / m) * 100}%` }} title={`Target ${f(target)}`} />
      </div>
      <small className="u-pt-ket">{capai ? `Target tercapai (${Math.round(target ? (nilai / target) * 100 : 100)}%)` : `Kurang ${f(target - nilai)} lagi`}</small>
    </div>
  );
}

// ================================================================ Gauge
export interface ProgressGaugeProps {
  nilai: number;
  max?: number;
  min?: number;
  label?: React.ReactNode;
  /** Teks di tengah (bawaan persen). */
  teks?: React.ReactNode;
  /** Ambang rasio untuk nada otomatis. `terbalik` = makin tinggi makin baik. */
  ambang?: { waspada?: number; bahaya?: number };
  terbalik?: boolean;
  tone?: Tone;
  ukuran?: number;
  className?: string;
}
/**
 * Ukuran huruf angka di rongga gauge sebagai pecahan lebar gauge. Teks dicoba dari 0,2 lalu dikecilkan sampai lebarnya
 * muat di tali busur setinggi teks itu (rongga makin sempit ke atas), minimum 0,1. Teks non-string memakai 0,16.
 */
function ukuranTeksGauge(teks: React.ReactNode, tebalRasio: number): number {
  if (typeof teks !== 'string' && typeof teks !== 'number') return 0.16;
  const s = String(teks);
  // Perkiraan lebar karakter huruf tebal (angka tabular ≈ 0,6 em, spasi/koma/titik lebih sempit).
  const em = [...s].reduce((a, c) => a + (/[\s.,:]/.test(c) ? 0.3 : /[%MWmw]/.test(c) ? 0.85 : 0.6), 0);
  const ri = 0.5 - tebalRasio; // jari-jari dalam (pecahan lebar)
  for (let f = 0.2; f > 0.1; f -= 0.005) {
    const h = f * 1.05; // tinggi teks di atas garis dasar
    if (h >= ri) continue;
    const tali = 2 * Math.sqrt(ri * ri - h * h) * 0.86;
    if (em * f <= tali) return f;
  }
  return 0.1;
}

/**
 * Setengah lingkaran: IPK, kepuasan EDOM, serapan anggaran, beban kerja dosen (SKS), kapasitas ruang. Angka utama selalu
 * berada di dalam rongga busur (ukurannya menyesuaikan panjang teks dan lebar gauge), `label` tampil kecil di bawah busur.
 * Lebar mengikuti `ukuran` tetapi menyusut bila wadahnya lebih sempit.
 */
export function ProgressGauge({ nilai, max = 100, min = 0, label, teks, ambang, terbalik = true, tone, ukuran, className }: ProgressGaugeProps) {
  const p = usePlatform();
  const u = ukuran ?? (p.mobile ? 140 : 180);
  const r = batas((nilai - min) / (max - min || 1));
  const nada = tone ?? nadaAmbang(r, ambang ?? (terbalik ? { waspada: 0.5, bahaya: 0.75 } : undefined), terbalik);
  const tebal = Math.max(8, u * 0.08);
  const jari = (u - tebal) / 2;
  const keliling = Math.PI * jari;
  const isi = teks ?? `${Math.round(r * 100)}%`;
  const fs = ukuranTeksGauge(isi, tebal / u);
  const sisi = `${((tebal * 1.5) / u) * 100}%`;
  return (
    <div className={cn('u-pg', className)} style={{ width: u }} role="meter" aria-valuenow={nilai} aria-valuemin={min} aria-valuemax={max} aria-label={typeof label === 'string' ? label : undefined}>
      <div className="u-pg-busur">
        <svg viewBox={`0 0 ${u} ${u / 2 + tebal / 2}`} aria-hidden>
          <path className="u-pg-trek" d={`M ${tebal / 2} ${u / 2} A ${jari} ${jari} 0 0 1 ${u - tebal / 2} ${u / 2}`} strokeWidth={tebal} fill="none" />
          <path
            className="u-pg-isi"
            data-tone={nada}
            d={`M ${tebal / 2} ${u / 2} A ${jari} ${jari} 0 0 1 ${u - tebal / 2} ${u / 2}`}
            strokeWidth={tebal}
            fill="none"
            strokeDasharray={keliling}
            strokeDashoffset={keliling * (1 - r)}
          />
        </svg>
        <div className="u-pg-teks" style={{ left: sisi, right: sisi }}>
          <b style={{ fontSize: `${fs * 100}cqi` }}>{isi}</b>
        </div>
      </div>
      {label && <small className="u-pg-label">{label}</small>}
    </div>
  );
}

// ================================================================ Unggah
export interface ProgressUnggahProps {
  nama: string;
  ukuran?: number;
  /** 0–100; null = menyiapkan. */
  persen: number | null;
  status?: 'mengunggah' | 'selesai' | 'gagal' | 'jeda';
  pesan?: React.ReactNode;
  onBatal?: () => void;
  onUlang?: () => void;
  className?: string;
}
/** Satu berkas yang sedang diunggah (bertahap/potongan): nama, ukuran terkirim, persen, batal/ulang. */
export function ProgressUnggah({ nama, ukuran, persen: pr, status = 'mengunggah', pesan, onBatal, onUlang, className }: ProgressUnggahProps) {
  const v = pr == null ? null : Math.max(0, Math.min(100, pr));
  return (
    <div className={cn('u-pu', className)} data-status={status}>
      <span className="u-pu-ikon" aria-hidden>
        {status === 'selesai' ? (
          <Check />
        ) : status === 'gagal' ? (
          <CircleAlert />
        ) : status === 'jeda' ? (
          <Pause />
        ) : (
          <span className="u-pu-ekst">{nama.split('.').pop()?.slice(0, 4).toUpperCase()}</span>
        )}
      </span>
      <div className="u-pu-isi">
        <div className="u-pu-baris">
          <span className="u-pu-nama" title={nama}>
            {nama}
          </span>
          <span className="u-pu-angka">{status === 'selesai' ? 'Selesai' : status === 'gagal' ? 'Gagal' : v == null ? 'Menyiapkan…' : `${v}%`}</span>
        </div>
        <div className="u-pu-trek" data-tak-tentu={v == null || undefined}>
          <span style={{ width: `${status === 'selesai' ? 100 : (v ?? 0)}%` }} />
        </div>
        <small className="u-pu-ket">{pesan ?? (ukuran ? `${formatBytes(((v ?? 0) / 100) * ukuran)} dari ${formatBytes(ukuran)}` : null)}</small>
      </div>
      {status === 'gagal' && onUlang ? (
        <button type="button" className="u-pu-aksi" onClick={onUlang} aria-label="Ulangi unggah">
          <RotateCcw />
        </button>
      ) : status !== 'selesai' && onBatal ? (
        <button type="button" className="u-pu-aksi" onClick={onBatal} aria-label="Batalkan unggah">
          <X />
        </button>
      ) : null}
    </div>
  );
}

// ================================================================ Tak tentu & bilah halaman
/** Bilah bergerak tanpa angka: sinkron PDDikti, generate tagihan, impor CSV yang lamanya tidak diketahui. */
export function ProgressTakTentu({ label, tone, ukuran = 'md', className }: { label?: React.ReactNode; tone?: Tone; ukuran?: 'sm' | 'md'; className?: string }) {
  return (
    <div className={cn('u-ptt', className)} role="progressbar" aria-busy="true" aria-label={typeof label === 'string' ? label : 'Memproses'}>
      {label && <span className="u-ptt-label">{label}</span>}
      <div className="u-ptt-trek" data-ukuran={ukuran}>
        <span data-tone={tone} />
      </div>
    </div>
  );
}

/** Bilah tipis di tepi atas layar saat halaman/data dimuat (mis. pindah rute). Di mobile menempel di bawah bilah aplikasi. */
export function ProgressHalaman({ aktif, className }: { aktif: boolean; className?: string }) {
  const [tampil, setTampil] = React.useState(aktif);
  React.useEffect(() => {
    if (aktif) return setTampil(true);
    const t = setTimeout(() => setTampil(false), 400);
    return () => clearTimeout(t);
  }, [aktif]);
  if (!tampil) return null;
  return <div className={cn('u-phal', className)} data-selesai={!aktif || undefined} role="progressbar" aria-busy={aktif} aria-label="Memuat halaman" />;
}

// ================================================================ Tenggat
export interface ProgressTenggatProps {
  mulai: string | Date;
  selesai: string | Date;
  /** Bawaan sekarang; diperbarui tiap menit. */
  sekarang?: string | Date;
  label?: React.ReactNode;
  /** Sisa waktu (rasio) yang dianggap mendesak. Bawaan 0,2. */
  mendesak?: number;
  className?: string;
}
const tgl = (d: string | Date) => (d instanceof Date ? d : new Date(d.length <= 10 ? `${d}T23:59:59` : d));
/** Teks sisa waktu ramah baca dari milidetik, mis. "4 hari lagi", "1 hari 3 jam lagi", "9 jam 35 menit lagi"; "berakhir" bila sudah lewat. */
export function sisaWaktu(ms: number): string {
  if (ms <= 0) return 'berakhir';
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 1440);
  const j = Math.floor((m % 1440) / 60);
  if (h >= 2) return `${h} hari lagi`;
  if (h === 1) return `1 hari ${j} jam lagi`;
  if (j >= 1) return `${j} jam ${m % 60} menit lagi`;
  return `${Math.max(1, m)} menit lagi`;
}
/** Waktu berjalan menuju batas: masa KRS, batas bayar UKT, tenggat tugas, batas aturan dinamis. */
export function ProgressTenggat({ mulai, selesai, sekarang, label, mendesak = 0.2, className }: ProgressTenggatProps) {
  const [kini, setKini] = React.useState(() => (sekarang ? tgl(sekarang) : new Date()));
  React.useEffect(() => {
    if (sekarang) return setKini(tgl(sekarang));
    const t = setInterval(() => setKini(new Date()), 60_000);
    return () => clearInterval(t);
  }, [sekarang]);
  const a = tgl(mulai).getTime();
  const b = tgl(selesai).getTime();
  const n = kini.getTime();
  const r = batas((n - a) / (b - a || 1));
  const keadaan = n < a ? 'belum' : n > b ? 'lewat' : 1 - r <= mendesak ? 'mendesak' : 'berjalan';
  const fmt = (d: number) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  return (
    <div className={cn('u-ptg', className)} data-keadaan={keadaan}>
      <div className="u-ptg-kepala">
        {label && <span className="u-ptg-label">{label}</span>}
        <b className="u-ptg-sisa">{keadaan === 'belum' ? `mulai ${sisaWaktu(a - n).replace(' lagi', '')} lagi` : keadaan === 'lewat' ? 'Sudah lewat' : sisaWaktu(b - n)}</b>
      </div>
      <div className="u-ptg-trek" role="progressbar" aria-valuenow={Math.round(r * 100)} aria-valuemax={100} aria-valuemin={0}>
        <span style={{ width: `${r * 100}%` }} />
        {keadaan === 'berjalan' || keadaan === 'mendesak' ? <i style={{ left: `${r * 100}%` }} aria-hidden /> : null}
      </div>
      <div className="u-ptg-kaki">
        <span>{fmt(a)}</span>
        <span>{fmt(b)}</span>
      </div>
    </div>
  );
}

// ================================================================ Kuota
export interface ProgressKuotaProps {
  terpakai: number;
  kapasitas: number;
  label?: React.ReactNode;
  satuan?: string;
  ambang?: { waspada?: number; bahaya?: number };
  /** Tampilan blok kecil (kursi kelas, kuota KKN) alih-alih bilah. Hanya bila kapasitas ≤ 60. */
  blok?: boolean;
  className?: string;
}
/** Pemakaian kapasitas: kursi kelas, kuota prodi PMB, penyimpanan berkas, SKS maksimal, plafon anggaran. */
export function ProgressKuota({ terpakai, kapasitas, label, satuan = '', ambang, blok, className }: ProgressKuotaProps) {
  const r = kapasitas ? terpakai / kapasitas : 0;
  const nada = nadaAmbang(r, ambang);
  const sisa = Math.max(0, kapasitas - terpakai);
  const pakaiBlok = blok && kapasitas <= 60;
  return (
    <div className={cn('u-pk', className)} data-tone={nada}>
      <div className="u-pk-kepala">
        {label && <span className="u-pk-label">{label}</span>}
        <span className="u-pk-nilai">
          <b>{terpakai.toLocaleString('id-ID')}</b>/{kapasitas.toLocaleString('id-ID')} {satuan}
        </span>
      </div>
      {pakaiBlok ? (
        <div className="u-pk-blok" role="img" aria-label={`${terpakai} dari ${kapasitas} terpakai`}>
          {Array.from({ length: kapasitas }, (_, i) => (
            <span key={i} data-isi={i < terpakai || undefined} />
          ))}
        </div>
      ) : (
        <div className="u-pk-trek" role="progressbar" aria-valuenow={terpakai} aria-valuemax={kapasitas} aria-valuemin={0}>
          <span style={{ width: `${batas(r) * 100}%` }} />
        </div>
      )}
      <small className="u-pk-ket">{r > 1 ? `Melebihi ${(terpakai - kapasitas).toLocaleString('id-ID')} ${satuan}` : `Sisa ${sisa.toLocaleString('id-ID')} ${satuan}`}</small>
    </div>
  );
}

// ================================================================ Cincin bertingkat
export interface CincinProgres {
  label: React.ReactNode;
  nilai: number;
  max?: number;
  tone?: Tone | 'info';
}
/** Beberapa cincin konsentris (gaya "activity ring"): hadir/tugas/kuis, SKS/IPK/presensi, P-E-P. */
export function ProgressCincinBanyak({ cincin, ukuran, tengah, className }: { cincin: CincinProgres[]; ukuran?: number; tengah?: React.ReactNode; className?: string }) {
  const p = usePlatform();
  const u = ukuran ?? (p.mobile ? 112 : 136);
  const tebal = Math.max(7, u / 12);
  return (
    <div className={cn('u-pcb', className)}>
      <div className="u-pcb-gambar" style={{ width: u, height: u }}>
        <svg width={u} height={u} aria-hidden>
          {cincin.map((c, i) => {
            const r = u / 2 - tebal / 2 - i * (tebal + 3);
            if (r <= tebal) return null;
            const k = 2 * Math.PI * r;
            const v = batas(c.nilai / (c.max ?? 100));
            const warna = c.tone ? `var(--u-${c.tone})` : WARNA_URUT[i % WARNA_URUT.length];
            return (
              <g key={i} transform={`rotate(-90 ${u / 2} ${u / 2})`}>
                <circle cx={u / 2} cy={u / 2} r={r} fill="none" stroke={warna} strokeOpacity={0.18} strokeWidth={tebal} />
                <circle className="u-pcb-isi" cx={u / 2} cy={u / 2} r={r} fill="none" stroke={warna} strokeWidth={tebal} strokeLinecap="round" strokeDasharray={k} strokeDashoffset={k * (1 - v)} />
              </g>
            );
          })}
        </svg>
        {tengah && <span className="u-pcb-tengah">{tengah}</span>}
      </div>
      <ul className="u-pcb-legenda">
        {cincin.map((c, i) => (
          <li key={i}>
            <i style={{ background: c.tone ? `var(--u-${c.tone})` : WARNA_URUT[i % WARNA_URUT.length] }} aria-hidden />
            <span>{c.label}</span>
            <b>{persen(c.nilai, c.max ?? 100)}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ================================================================ Daftar bilah
export interface BarisProgres {
  label: React.ReactNode;
  nilai: number;
  max?: number;
  keterangan?: React.ReactNode;
  tone?: Tone;
}
/** Daftar bilah berperingkat: kelengkapan per prodi, serapan per unit, presensi per mata kuliah. */
export function ProgressDaftar({
  items,
  urut,
  format,
  ambang,
  terbalik = true,
  className,
}: {
  items: BarisProgres[];
  /** Urutkan menurun menurut persen. */
  urut?: boolean;
  format?: (b: BarisProgres) => React.ReactNode;
  /** Beri nada otomatis menurut ambang (terbalik = makin tinggi makin baik). */
  ambang?: { waspada?: number; bahaya?: number };
  terbalik?: boolean;
  className?: string;
}) {
  const list = urut ? [...items].sort((a, b) => b.nilai / (b.max ?? 100) - a.nilai / (a.max ?? 100)) : items;
  return (
    <ul className={cn('u-pd-daftar', className)}>
      {list.map((b, i) => {
        const r = b.nilai / (b.max ?? 100);
        const nada = b.tone ?? (ambang ? nadaAmbang(r, ambang, terbalik) : undefined);
        return (
          <li key={i}>
            <div className="u-pd-daftar-kepala">
              <span>{b.label}</span>
              <b>{format ? format(b) : `${persen(b.nilai, b.max ?? 100)}%`}</b>
            </div>
            <div className="u-pd-daftar-trek">
              <span data-tone={nada} style={{ width: `${batas(r) * 100}%` }} />
            </div>
            {b.keterangan && <small>{b.keterangan}</small>}
          </li>
        );
      })}
    </ul>
  );
}

// ================================================================ Bilah tebal berlabel
/** Bilah tebal dengan angka di dalamnya; untuk kartu sorotan (mis. "UKT 75% lunas"). */
export function ProgressTebal({ value, max = 100, label, tone, gradien, className }: { value: number; max?: number; label?: React.ReactNode; tone?: Tone; gradien?: boolean; className?: string }) {
  const r = batas(value / max);
  const ref = React.useRef<HTMLDivElement>(null);
  // Label tidak boleh terpotong: di dalam isian bila muat, di kanan isian bila isian pendek, atau dua lapis (putih di atas
  // isian, gelap di atas trek) rata kiri bila tidak muat di keduanya.
  const [letak, setLetak] = React.useState<'dalam' | 'luar' | 'lapis'>('dalam');
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cek = () => {
      // Salinan terakhir selalu berlebar alami (salinan di dalam isian dilebarkan saat mode lapis).
      const semua = el.querySelectorAll<HTMLElement>('.u-ptb-teks');
      const t = semua[semua.length - 1];
      if (!t || !el.clientWidth) return;
      const lebarTeks = t.scrollWidth;
      const lebarIsi = Math.max(el.clientWidth * r, 44);
      setLetak(lebarTeks <= lebarIsi ? 'dalam' : el.clientWidth - el.clientWidth * r >= lebarTeks ? 'luar' : 'lapis');
    };
    cek();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(cek);
    ro.observe(el);
    return () => ro.disconnect();
  }, [r, label]);
  const isiTeks = label ?? `${Math.round(r * 100)}%`;
  return (
    <div ref={ref} className={cn('u-ptb', className)} data-letak={letak === 'dalam' ? undefined : letak} data-luar={letak === 'luar' || undefined} role="progressbar" aria-valuenow={value} aria-valuemax={max} aria-valuemin={0}>
      <span className="u-ptb-isi" data-tone={tone} data-gradien={gradien || undefined} style={{ width: `${r * 100}%` }}>
        {letak !== 'luar' && (
          <span className="u-ptb-teks" style={letak === 'lapis' && r > 0 ? { width: `${100 / r}%` } : undefined}>
            {isiTeks}
          </span>
        )}
      </span>
      {letak !== 'dalam' && (
        <span className="u-ptb-teks" aria-hidden={letak === 'lapis' || undefined}>
          {isiTeks}
        </span>
      )}
    </div>
  );
}
