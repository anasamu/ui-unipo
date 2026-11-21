'use client';
import * as React from 'react';
import { ArrowLeft, ArrowRight, CalendarClock, CircleCheck, Clock, CloudOff, Flag, KeyRound, LayoutGrid, Maximize, MonitorCheck, RefreshCw, Send, Timer } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatDate, formatNumber, formatTime } from '../lib/format';
import { Badge, Button, Skeleton, type BadgeVariant } from '../components/actions';
import { Alert, Empty, ProgressRing } from '../components/display';
import { Input, Textarea } from '../components/forms';
import { ConfirmDialog } from '../components/overlays';
import { invalidateSiakad, pesanGalat, useOptionalSiakad, useSiakadQuery, type QueryState } from './provider';

/*
 * Widget CBT (/v1/cbt) untuk peserta ujian: daftar ujian saya dengan masuk token, lembar ujian lengkap
 * (soal per jenis, navigasi nomor, ragu-ragu, hitung mundur, simpan otomatis), dan hasil.
 * Semua panggilan /kerjakan membawa header X-Perangkat (ID acak per peramban) karena ujian bisa dikunci ke satu perangkat.
 */

// ================================================================ Tipe
export type JenisSoalCbt = 'pilihan_ganda' | 'pilihan_ganda_banyak' | 'benar_salah' | 'isian_singkat' | 'esai' | 'menjodohkan';
export type StatusPesertaCbt = 'terdaftar' | 'mengerjakan' | 'selesai' | 'diskualifikasi' | 'tidak_hadir';
export interface UjianSaya {
  id: number;
  status: StatusPesertaCbt;
  nomor_peserta?: string | null;
  mulai_pada?: string | null;
  batas_waktu?: string | null;
  selesai_pada?: string | null;
  ujian_id: number;
  kode?: string | null;
  ujian: string;
  jenis: string;
  kode_mk?: string | null;
  durasi_menit: number;
  petunjuk?: string | null;
  ujian_status: 'siap' | 'selesai';
  sesi_id: number;
  sesi?: string | null;
  mulai: string;
  selesai: string;
  ruang_id?: string | null;
  sesi_status: 'terjadwal' | 'dibuka' | 'ditutup';
  sisa_detik?: number | null;
  bisa_mulai: boolean;
  /** Konteks ujian: kuliah (UTS/UAS), lms (kuis e-learning), pmb. */
  konteks?: 'kuliah' | 'lms' | 'pmb';
  /** false = sesi tanpa token pengawas (kuis e-learning): langsung mulai. Bawaan true. */
  perlu_token?: boolean;
}
export interface OpsiSoal {
  id: string;
  teks: string;
}
export type JawabanCbt = string | string[] | boolean | Record<string, string> | null;
export interface SoalCbtData {
  nomor: number;
  soal_id: number;
  jenis: JenisSoalCbt;
  /** HTML yang sudah disaring server. */
  pertanyaan: string;
  opsi: OpsiSoal[] | { kiri: OpsiSoal[]; kanan: OpsiSoal[] } | null;
  poin: number;
  jawaban: JawabanCbt;
  ragu: boolean;
}
export interface LembarUjianData {
  peserta_id: number;
  ujian: { id: number; kode?: string | null; nama: string; jenis: string; petunjuk?: string | null; durasi_menit: number; tampil_hasil?: number | boolean };
  status: StatusPesertaCbt;
  mulai_pada?: string | null;
  batas_waktu?: string | null;
  sisa_detik: number;
  soal?: SoalCbtData[];
  terjawab?: number;
  hasil?: { skor: number | null; skor_maks: number | null; nilai: number | null; lulus: boolean | null; perlu_koreksi: boolean };
}

// ================================================================ Perangkat & API
const KUNCI_PERANGKAT = 'unipo-cbt-perangkat';
let perangkatMemori: string | null = null;
/** ID perangkat acak yang disimpan di peramban. Server mencocokkannya (bersama User-Agent) bila ujian dikunci ke satu perangkat. */
export function idPerangkatCbt(): string {
  try {
    const ada = localStorage.getItem(KUNCI_PERANGKAT);
    if (ada) return ada;
  } catch {
    /* penyimpanan diblokir: pakai ID di memori */
  }
  perangkatMemori ??= typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  try {
    localStorage.setItem(KUNCI_PERANGKAT, perangkatMemori);
  } catch {
    /* abaikan */
  }
  return perangkatMemori;
}
const hdr = () => ({ headers: { 'X-Perangkat': idPerangkatCbt() } });
/**
 * Antrean jawaban yang belum terkirim disimpan di perangkat (localStorage per lembar), supaya muat ulang halaman,
 * peramban tertutup, atau baterai habis saat luring tidak menghilangkan jawaban (CBT-09). Dihapus setelah terkirim
 * atau ujian dikumpulkan; saat lembar dibuka lagi, antrean dipulihkan dan dikirim.
 */
const kunciAntre = (dasar: string) => `unipo-cbt-antre:${dasar}`;
function simpanAntreLokal(dasar: string, antre: Record<number, unknown>) {
  try {
    if (Object.keys(antre).length) localStorage.setItem(kunciAntre(dasar), JSON.stringify(antre));
    else localStorage.removeItem(kunciAntre(dasar));
  } catch {
    /* penyimpanan diblokir/penuh: antrean tetap di memori */
  }
}
function bacaAntreLokal(dasar: string): Record<number, { soal_id: number; jawaban: JawabanCbt; ragu: boolean }> {
  try {
    const v = JSON.parse(localStorage.getItem(kunciAntre(dasar)) ?? '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}
const C = '/v1/cbt';

export function useUjianSaya() {
  return useSiakadQuery<UjianSaya[]>(['cbt-saya'], (s, signal) => s.cbt.getSaya({}, { signal }) as never, { staleTime: 15_000 });
}
export function useLembarUjian(pesertaId: number | undefined, basePath?: string) {
  return useSiakadQuery<LembarUjianData>(['cbt-lembar', basePath ?? String(pesertaId)], (s, signal) => s.request({ method: 'GET', path: basePath ?? `${C}/kerjakan/${pesertaId}` }, { ...hdr(), signal }) as never, {
    enabled: pesertaId != null,
    staleTime: Infinity,
  });
}

// ================================================================ Bantuan
function Galat({ q }: { q: QueryState<unknown> }) {
  return (
    <div className="u-widget-error" role="alert">
      <span>{pesanGalat(q.error)}</span>
      <Button size="sm" variant="ghost" onClick={q.refetch}>
        <RefreshCw /> Muat ulang
      </Button>
    </div>
  );
}
const muatDari = (q: QueryState<unknown>) => q.loading && !q.data;
const JENIS_UJIAN: Record<string, string> = { uts: 'UTS', uas: 'UAS', kuis: 'Kuis', pmb: 'Tes PMB', komprehensif: 'Komprehensif', bahasa: 'Tes bahasa', sertifikasi: 'Sertifikasi', lainnya: 'Ujian' };
const STATUS_PESERTA: Record<StatusPesertaCbt, { label: string; variant: BadgeVariant }> = {
  terdaftar: { label: 'Terdaftar', variant: 'neutral' },
  mengerjakan: { label: 'Sedang dikerjakan', variant: 'warning' },
  selesai: { label: 'Selesai', variant: 'success' },
  diskualifikasi: { label: 'Didiskualifikasi', variant: 'danger' },
  tidak_hadir: { label: 'Tidak hadir', variant: 'neutral' },
};
const jamMenit = (d: number) => {
  const j = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);
  const s = d % 60;
  return `${j > 0 ? `${j}:` : ''}${String(m).padStart(j > 0 ? 2 : 1, '0')}:${String(s).padStart(2, '0')}`;
};
export function terjawab(j: JawabanCbt): boolean {
  if (j == null) return false;
  if (typeof j === 'string') return j.trim() !== '';
  if (Array.isArray(j)) return j.length > 0;
  if (typeof j === 'object') return Object.keys(j).length > 0;
  return true;
}

// ================================================================ Daftar ujian
/** Ujian tempat pengguna terdaftar. Tombol masuk aktif saat sesi dibuka; peserta memasukkan token dari pengawas. */
export function DaftarUjianSaya({ onMulai, className }: { onMulai: (pesertaId: number, lembar: LembarUjianData) => void; className?: string }) {
  const q = useUjianSaya();
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 240 }} />;
  const data = q.data ?? [];
  if (!data.length) return <Empty icon={<MonitorCheck />} title="Belum ada ujian" description="Ujian berbasis komputer yang Anda ikuti akan muncul di sini." bordered className={className} />;
  return (
    <div className={cn('u-cbt-ujian-grid', className)}>
      {data.map((u) => (
        <KartuUjian key={u.id} u={u} onMulai={onMulai} />
      ))}
    </div>
  );
}

function KartuUjian({ u, onMulai }: { u: UjianSaya; onMulai: (pesertaId: number, lembar: LembarUjianData) => void }) {
  const siakad = useOptionalSiakad();
  const [token, setToken] = React.useState('');
  const [sibuk, setSibuk] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const lanjut = u.status === 'mengerjakan';
  const tanpaToken = lanjut || u.perlu_token === false;
  const st = STATUS_PESERTA[u.status];
  const mulai = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siakad) return;
    setSibuk(true);
    setGalat(null);
    try {
      const r = await siakad.request<LembarUjianData>({ method: 'POST', path: `${C}/kerjakan/${u.id}/mulai`, body: tanpaToken ? {} : { token: token.trim().toUpperCase() } }, hdr());
      invalidateSiakad('cbt-saya');
      onMulai(u.id, r.data);
    } catch (err) {
      setGalat(pesanGalat(err));
    } finally {
      setSibuk(false);
    }
  };
  return (
    <article className="u-cbt-ujian" data-status={u.status}>
      <header>
        <span className="u-cbt-ujian-jenis">{JENIS_UJIAN[u.jenis] ?? u.jenis}</span>
        <Badge variant={st.variant} dot>
          {st.label}
        </Badge>
      </header>
      <h3>{u.ujian}</h3>
      <p className="u-cbt-ujian-sub">{[u.kode_mk, u.sesi, u.nomor_peserta && `No. ${u.nomor_peserta}`].filter(Boolean).join(' · ')}</p>
      <dl className="u-cbt-ujian-info">
        <div>
          <dt>
            <CalendarClock /> Jadwal
          </dt>
          <dd>
            {formatDate(u.mulai, 'medium')}, {formatTime(u.mulai)}–{formatTime(u.selesai)}
          </dd>
        </div>
        <div>
          <dt>
            <Timer /> Durasi
          </dt>
          <dd>{lanjut && u.sisa_detik != null ? `sisa ${jamMenit(u.sisa_detik)}` : `${u.durasi_menit} menit`}</dd>
        </div>
      </dl>
      {u.bisa_mulai ? (
        <form className="u-cbt-token" onSubmit={mulai}>
          {!tanpaToken && (
            <label className="u-cbt-token-input">
              <KeyRound aria-hidden />
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                placeholder="Token"
                aria-label="Token ujian dari pengawas"
                autoComplete="off"
                spellCheck={false}
                maxLength={12}
              />
            </label>
          )}
          <Button type="submit" loading={sibuk} disabled={!tanpaToken && token.trim().length < 4} fullWidth={tanpaToken}>
            {lanjut ? 'Lanjutkan ujian' : 'Mulai ujian'}
          </Button>
        </form>
      ) : (
        <p className="u-cbt-ujian-note">
          {u.status === 'selesai'
            ? `Dikumpulkan ${u.selesai_pada ? `${formatDate(u.selesai_pada, 'medium')} ${formatTime(u.selesai_pada)}` : ''}`
            : u.sesi_status === 'terjadwal'
              ? 'Tombol masuk aktif saat pengawas membuka sesi.'
              : u.sesi_status === 'ditutup'
                ? 'Sesi sudah ditutup.'
                : 'Tidak bisa dimulai.'}
        </p>
      )}
      {galat && <p className="u-cbt-galat">{galat}</p>}
    </article>
  );
}

// ================================================================ Timer
/** Hitung mundur ujian. Sinkron ulang setiap kali `sisaDetik` dari server berubah; berubah kuning < 10 menit, merah < 5 menit. */
export function TimerUjian({ sisaDetik, onHabis, className }: { sisaDetik: number; onHabis?: () => void; className?: string }) {
  const [akhir, setAkhir] = React.useState(() => Date.now() + sisaDetik * 1000);
  const [sisa, setSisa] = React.useState(sisaDetik);
  const habisRef = React.useRef(onHabis);
  habisRef.current = onHabis;
  React.useEffect(() => {
    setAkhir(Date.now() + sisaDetik * 1000);
    setSisa(sisaDetik);
  }, [sisaDetik]);
  React.useEffect(() => {
    let sudah = false;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((akhir - Date.now()) / 1000));
      setSisa(s);
      if (s === 0 && !sudah) {
        sudah = true;
        habisRef.current?.();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [akhir]);
  const nada = sisa <= 300 ? 'danger' : sisa <= 600 ? 'warning' : undefined;
  return (
    <div
      className={cn('u-cbt-timer', className)}
      data-tone={nada}
      role="timer"
      aria-live={sisa <= 300 && sisa % 60 === 0 ? 'assertive' : 'off'}
      aria-label={`Sisa waktu ${Math.ceil(sisa / 60)} menit`}
    >
      <Clock aria-hidden />
      <span>{jamMenit(sisa)}</span>
    </div>
  );
}

// ================================================================ Navigasi
/** Kisi nomor soal: terjawab, ragu-ragu, belum, dan soal aktif. */
export function NavigasiSoal({
  soal,
  aktif,
  onPilih,
  className,
}: {
  soal: Array<Pick<SoalCbtData, 'nomor' | 'jawaban' | 'ragu'>>;
  aktif: number;
  onPilih: (nomor: number) => void;
  className?: string;
}) {
  const sudah = soal.filter((s) => terjawab(s.jawaban)).length;
  const ragu = soal.filter((s) => s.ragu).length;
  return (
    <nav className={cn('u-cbt-nav', className)} aria-label="Nomor soal">
      <div className="u-cbt-nav-grid">
        {soal.map((s) => (
          <button
            key={s.nomor}
            type="button"
            onClick={() => onPilih(s.nomor)}
            data-state={s.ragu ? 'ragu' : terjawab(s.jawaban) ? 'terjawab' : 'kosong'}
            data-aktif={s.nomor === aktif || undefined}
            aria-current={s.nomor === aktif ? 'step' : undefined}
            aria-label={`Soal ${s.nomor}${s.ragu ? ', ragu-ragu' : terjawab(s.jawaban) ? ', terjawab' : ', belum dijawab'}`}
          >
            {s.nomor}
          </button>
        ))}
      </div>
      <ul className="u-cbt-nav-legend">
        <li data-state="terjawab">Terjawab {sudah}</li>
        <li data-state="ragu">Ragu-ragu {ragu}</li>
        <li data-state="kosong">Belum {soal.length - sudah}</li>
      </ul>
    </nav>
  );
}

// ================================================================ Soal
const HURUF = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** Satu soal sesuai jenisnya: pilihan ganda, pilihan ganda banyak, benar/salah, isian singkat, esai, atau menjodohkan. */
export function SoalCbt({ soal, onJawab, disabled, className }: { soal: SoalCbtData; onJawab: (jawaban: JawabanCbt) => void; disabled?: boolean; className?: string }) {
  const s = soal;
  const opsi = Array.isArray(s.opsi) ? s.opsi : [];
  const petunjuk: Record<JenisSoalCbt, string> = {
    pilihan_ganda: 'Pilih satu jawaban.',
    pilihan_ganda_banyak: 'Pilih semua jawaban yang benar.',
    benar_salah: 'Tentukan benar atau salah.',
    isian_singkat: 'Ketik jawaban singkat.',
    esai: 'Tulis jawaban Anda. Tersimpan otomatis.',
    menjodohkan: 'Pasangkan tiap pernyataan dengan jawaban yang sesuai.',
  };
  return (
    <section className={cn('u-cbt-soal', className)} aria-labelledby={`soal-${s.soal_id}`}>
      <header>
        <span id={`soal-${s.soal_id}`}>Soal {s.nomor}</span>
        <small>
          {petunjuk[s.jenis]} · {formatNumber(s.poin)} poin
        </small>
      </header>
      <div className="u-cbt-pertanyaan" dangerouslySetInnerHTML={{ __html: s.pertanyaan }} />
      {(s.jenis === 'pilihan_ganda' || s.jenis === 'pilihan_ganda_banyak') && (
        <div className="u-cbt-opsi" role={s.jenis === 'pilihan_ganda' ? 'radiogroup' : 'group'}>
          {opsi.map((o, i) => {
            const banyak = s.jenis === 'pilihan_ganda_banyak';
            const pilih = banyak ? (Array.isArray(s.jawaban) ? (s.jawaban as string[]) : []) : [];
            const aktif = banyak ? pilih.includes(o.id) : s.jawaban === o.id;
            return (
              <button
                key={o.id}
                type="button"
                role={banyak ? 'checkbox' : 'radio'}
                aria-checked={aktif}
                disabled={disabled}
                data-banyak={banyak || undefined}
                onClick={() => onJawab(banyak ? (aktif ? pilih.filter((x) => x !== o.id) : [...pilih, o.id]) : aktif ? null : o.id)}
              >
                <span className="u-cbt-huruf">{HURUF[i]}</span>
                <span dangerouslySetInnerHTML={{ __html: o.teks }} />
              </button>
            );
          })}
        </div>
      )}
      {s.jenis === 'benar_salah' && (
        <div className="u-cbt-opsi" data-dua role="radiogroup">
          {[
            [true, 'Benar'],
            [false, 'Salah'],
          ].map(([v, l]) => (
            <button key={String(v)} type="button" role="radio" aria-checked={s.jawaban === v} disabled={disabled} onClick={() => onJawab(s.jawaban === v ? null : (v as boolean))}>
              <span className="u-cbt-huruf">{v ? 'B' : 'S'}</span>
              <span>{l as string}</span>
            </button>
          ))}
        </div>
      )}
      {s.jenis === 'isian_singkat' && <IsianTeks key={s.soal_id} nilai={(s.jawaban as string) ?? ''} onJawab={onJawab} disabled={disabled} />}
      {s.jenis === 'esai' && <IsianTeks key={s.soal_id} nilai={(s.jawaban as string) ?? ''} onJawab={onJawab} disabled={disabled} panjang />}
      {s.jenis === 'menjodohkan' && s.opsi && !Array.isArray(s.opsi) && <Menjodohkan opsi={s.opsi} nilai={(s.jawaban as Record<string, string>) ?? {}} onJawab={onJawab} disabled={disabled} />}
    </section>
  );
}

function IsianTeks({ nilai, onJawab, disabled, panjang }: { nilai: string; onJawab: (j: JawabanCbt) => void; disabled?: boolean; panjang?: boolean }) {
  const [v, setV] = React.useState(nilai);
  const t = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const kirim = (x: string) => {
    clearTimeout(t.current);
    t.current = setTimeout(() => onJawab(x.trim() === '' ? null : x), 800);
  };
  React.useEffect(() => () => clearTimeout(t.current), []);
  const ubah = (x: string) => {
    setV(x);
    kirim(x);
  };
  return panjang ? (
    <div className="u-cbt-esai">
      <Textarea value={v} onChange={(e) => ubah(e.target.value)} rows={8} disabled={disabled} aria-label="Jawaban esai" />
      <small>{v.trim() ? v.trim().split(/\s+/).length : 0} kata</small>
    </div>
  ) : (
    <Input value={v} onChange={(e) => ubah(e.target.value)} disabled={disabled} maxLength={500} aria-label="Jawaban singkat" className="u-cbt-isian" />
  );
}

function Menjodohkan({ opsi, nilai, onJawab, disabled }: { opsi: { kiri: OpsiSoal[]; kanan: OpsiSoal[] }; nilai: Record<string, string>; onJawab: (j: JawabanCbt) => void; disabled?: boolean }) {
  return (
    <ol className="u-cbt-jodoh">
      {opsi.kiri.map((k) => (
        <li key={k.id}>
          <span dangerouslySetInnerHTML={{ __html: k.teks }} />
          <select
            value={nilai[k.id] ?? ''}
            disabled={disabled}
            aria-label={`Pasangan untuk ${k.teks.replace(/<[^>]+>/g, '')}`}
            onChange={(e) => {
              const baru = { ...nilai };
              if (e.target.value) baru[k.id] = e.target.value;
              else delete baru[k.id];
              onJawab(Object.keys(baru).length ? baru : null);
            }}
          >
            <option value="">Pilih pasangan…</option>
            {opsi.kanan.map((r) => (
              <option key={r.id} value={r.id}>
                {r.teks.replace(/<[^>]+>/g, '')}
              </option>
            ))}
          </select>
        </li>
      ))}
    </ol>
  );
}

// ================================================================ Lembar ujian
type StatusSimpan = 'tersimpan' | 'menyimpan' | 'gagal' | 'luring';
type AntreJawaban = Record<number, { soal_id: number; jawaban: JawabanCbt; ragu: boolean }>;

export interface LembarUjianProps {
  pesertaId: number;
  awal?: LembarUjianData;
  onSelesai?: (hasil: LembarUjianData) => void;
  /**
   * Alamat dasar lembar (tanpa /jawab, /log, /selesai). Bawaan `/v1/cbt/kerjakan/{pesertaId}`; PMB memakai
   * `/v1/pmb/saya/pendaftaran/{id}/ujian/{peserta}` yang bentuk datanya sama.
   */
  basePath?: string;
  /**
   * Pengawasan: catat pindah tab, keluar layar penuh, dan salin-tempel ke `{basePath}/log`, tolak menu klik kanan,
   * dan tampilkan ajakan layar penuh. Bawaan aktif.
   */
  pengawasan?: boolean;
  /** Teks kecil di bawah nama ujian (mis. nama peserta). */
  subjudul?: React.ReactNode;
  className?: string;
}

/**
 * Lembar ujian lengkap: kepala (nama ujian, jumlah terjawab, status simpan, hitung mundur), satu soal per layar,
 * ragu-ragu, navigasi nomor, dan kumpulkan. Jawaban masuk antrean dan dikirim otomatis (teks 0,8 detik setelah
 * berhenti mengetik); bila koneksi putus, antrean dikirim ulang tiap 8 detik dan saat tersambung lagi (sekaligus
 * lewat `jawaban_banyak`). Waktu habis = dikumpulkan otomatis.
 */
export function LembarUjian({ pesertaId, awal, onSelesai, basePath, pengawasan = true, subjudul, className }: LembarUjianProps) {
  const siakad = useOptionalSiakad();
  const dasar = basePath ?? `${C}/kerjakan/${pesertaId}`;
  const q = useLembarUjian(awal ? undefined : pesertaId, basePath);
  const [lembar, setLembar] = React.useState<LembarUjianData | undefined>(awal);
  const [nomor, setNomor] = React.useState(1);
  const [simpan, setSimpan] = React.useState<StatusSimpan>('tersimpan');
  const [galat, setGalat] = React.useState<string | null>(null);
  const [konfirmasi, setKonfirmasi] = React.useState(false);
  const [layarPenuh, setLayarPenuh] = React.useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);
  const antre = React.useRef<AntreJawaban>({});
  const tunda = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [jumlahAntre, setJumlahAntre] = React.useState(0);
  React.useEffect(() => {
    if (q.data && !lembar) setLembar(q.data);
  }, [q.data, lembar]);
  const mengerjakan = lembar?.status === 'mengerjakan';
  const dipulihkan = React.useRef(false);

  const muatUlang = React.useCallback(async () => {
    if (!siakad) return;
    try {
      const r = await siakad.request<LembarUjianData>({ method: 'GET', path: dasar }, hdr());
      setLembar(r.data);
    } catch (e) {
      setGalat(pesanGalat(e));
    }
  }, [siakad, dasar]);

  /** Kirim semua jawaban di antrean. */
  const sinkron = React.useCallback(async () => {
    const isi = Object.values(antre.current);
    if (!isi.length || !siakad) return;
    setSimpan('menyimpan');
    try {
      const r = await siakad.request<{ sisa_detik?: number }>({ method: 'POST', path: `${dasar}/jawab`, body: isi.length === 1 ? isi[0] : { jawaban_banyak: isi } }, hdr());
      isi.forEach((x) => {
        if (antre.current[x.soal_id] === x) delete antre.current[x.soal_id];
      });
      simpanAntreLokal(dasar, antre.current);
      setJumlahAntre(Object.keys(antre.current).length);
      setSimpan(Object.keys(antre.current).length ? 'menyimpan' : 'tersimpan');
      setGalat(null);
      const sisa = r.data?.sisa_detik;
      if (sisa != null) setLembar((l) => (l && Math.abs(l.sisa_detik - sisa) > 5 ? { ...l, sisa_detik: sisa } : l));
    } catch (e) {
      const st = (e as { status?: number }).status;
      if (st === 409) {
        void muatUlang();
        return;
      }
      if (!st || st >= 500) setSimpan('luring');
      else {
        setSimpan('gagal');
        setGalat(pesanGalat(e));
      }
    }
  }, [siakad, dasar, muatUlang]);

  const kirim = React.useCallback(
    (s: SoalCbtData, perubahan: Partial<Pick<SoalCbtData, 'jawaban' | 'ragu'>>) => {
      const baru = { ...s, ...perubahan };
      setLembar((l) => (l ? { ...l, soal: l.soal?.map((x) => (x.soal_id === s.soal_id ? baru : x)) } : l));
      antre.current = { ...antre.current, [s.soal_id]: { soal_id: s.soal_id, jawaban: baru.jawaban, ragu: baru.ragu } };
      simpanAntreLokal(dasar, antre.current);
      setJumlahAntre(Object.keys(antre.current).length);
      clearTimeout(tunda.current);
      const teks = s.jenis === 'esai' || s.jenis === 'isian_singkat';
      tunda.current = setTimeout(() => void sinkron(), 'jawaban' in perubahan && teks ? 800 : 50);
    },
    [sinkron, dasar],
  );

  // Jawaban yang tertinggal di perangkat (halaman dimuat ulang saat luring) ditampilkan lagi lalu dikirim.
  React.useEffect(() => {
    if (!mengerjakan || dipulihkan.current) return;
    dipulihkan.current = true;
    const lokal = bacaAntreLokal(dasar);
    const ids = Object.keys(lokal);
    if (!ids.length) return;
    antre.current = { ...lokal, ...antre.current };
    setJumlahAntre(Object.keys(antre.current).length);
    setLembar((l) => (l ? { ...l, soal: l.soal?.map((x) => (lokal[x.soal_id] ? { ...x, jawaban: lokal[x.soal_id]!.jawaban, ragu: lokal[x.soal_id]!.ragu } : x)) } : l));
    void sinkron();
  }, [mengerjakan, dasar, sinkron]);

  // Antrean dikirim ulang berkala dan saat koneksi kembali.
  React.useEffect(() => {
    if (!mengerjakan) return;
    const catat = (jenis: string, detail?: string) => void siakad?.request({ method: 'POST', path: `${dasar}/log`, body: { jenis, detail } }, hdr()).catch(() => undefined);
    const t = setInterval(() => void sinkron(), 8000);
    const online = () => {
      if (pengawasan) catat('koneksi_putus', 'tersambung kembali');
      void sinkron();
    };
    const offline = () => setSimpan('luring');
    const tinggal = (e: BeforeUnloadEvent) => {
      if (Object.keys(antre.current).length) e.preventDefault();
    };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    window.addEventListener('beforeunload', tinggal);
    return () => {
      clearInterval(t);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      window.removeEventListener('beforeunload', tinggal);
    };
  }, [mengerjakan, sinkron, siakad, dasar, pengawasan]);

  // Pengawasan: pindah tab, keluar layar penuh, salin-tempel, klik kanan.
  React.useEffect(() => {
    if (!mengerjakan || !pengawasan) return;
    const catat = (jenis: string, detail?: string) => void siakad?.request({ method: 'POST', path: `${dasar}/log`, body: { jenis, detail } }, hdr()).catch(() => undefined);
    const vis = () => document.visibilityState === 'hidden' && catat('pindah_tab');
    const fs = () => {
      const penuh = !!document.fullscreenElement;
      setLayarPenuh(penuh);
      if (!penuh) catat('keluar_layar', 'keluar dari layar penuh');
    };
    const salin = (e: ClipboardEvent) => {
      e.preventDefault();
      catat('salin_tempel', e.type);
    };
    const menu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('visibilitychange', vis);
    document.addEventListener('fullscreenchange', fs);
    document.addEventListener('copy', salin);
    document.addEventListener('paste', salin);
    document.addEventListener('contextmenu', menu);
    return () => {
      document.removeEventListener('visibilitychange', vis);
      document.removeEventListener('fullscreenchange', fs);
      document.removeEventListener('copy', salin);
      document.removeEventListener('paste', salin);
      document.removeEventListener('contextmenu', menu);
    };
  }, [mengerjakan, pengawasan, siakad, dasar]);

  const kumpulkan = React.useCallback(async () => {
    if (!siakad) return;
    try {
      await sinkron();
      const r = await siakad.request<LembarUjianData>({ method: 'POST', path: `${dasar}/selesai`, body: {} }, hdr());
      antre.current = {};
      simpanAntreLokal(dasar, {});
      setLembar(r.data);
      invalidateSiakad('cbt-saya');
      invalidateSiakad('pmb-ujian');
      if (typeof document !== 'undefined' && document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      onSelesai?.(r.data);
    } catch (e) {
      setGalat(pesanGalat(e));
    }
  }, [siakad, dasar, sinkron, onSelesai]);

  if (!lembar) {
    if (q.error) return <Galat q={q} />;
    return <Skeleton className={className} style={{ height: 420 }} />;
  }
  if (lembar.status === 'terdaftar') return <Empty title="Ujian belum dimulai" description="Kembali ke daftar ujian lalu masukkan token dari pengawas." />;
  if (lembar.status !== 'mengerjakan') return <HasilUjian lembar={lembar} className={className} />;
  const daftar = lembar.soal ?? [];
  const s = daftar.find((x) => x.nomor === nomor) ?? daftar[0];
  const sudah = daftar.filter((x) => terjawab(x.jawaban)).length;
  const ragu = daftar.filter((x) => x.ragu).length;
  if (!s) return <Empty title="Soal tidak tersedia" />;
  const bisaLayarPenuh = pengawasan && typeof document !== 'undefined' && document.fullscreenEnabled;

  return (
    <div className={cn('u-cbt-lembar', className)} data-pengawasan={pengawasan || undefined}>
      <header className="u-cbt-lembar-head">
        <div className="u-cbt-lembar-judul">
          <span className="u-cbt-ujian-jenis">{JENIS_UJIAN[lembar.ujian.jenis] ?? lembar.ujian.jenis}</span>
          <h2>{lembar.ujian.nama}</h2>
          {subjudul && <p className="u-cbt-lembar-sub">{subjudul}</p>}
        </div>
        <span className="u-cbt-simpan" data-status={simpan} aria-live="polite">
          {simpan === 'menyimpan' ? 'Menyimpan…' : simpan === 'gagal' ? 'Gagal menyimpan' : simpan === 'luring' ? `Luring, ${jumlahAntre} jawaban menunggu` : 'Tersimpan'}
        </span>
        <span className="u-cbt-hitung">
          <b>{sudah}</b>/{daftar.length} terjawab
        </span>
        <TimerUjian sisaDetik={lembar.sisa_detik} onHabis={kumpulkan} />
      </header>
      {bisaLayarPenuh && !layarPenuh && (
        <button type="button" className="u-cbt-layarpenuh" onClick={() => void document.documentElement.requestFullscreen?.().catch(() => undefined)}>
          <Maximize aria-hidden /> Kerjakan dalam layar penuh (disarankan)
        </button>
      )}
      {simpan === 'luring' && (
        <Alert variant="warning" icon={<CloudOff />} title="Koneksi terputus">
          Lanjutkan mengerjakan. Jawaban disimpan di perangkat ini (tetap ada walau halaman dimuat ulang) dan dikirim otomatis saat tersambung. Jangan menghapus data peramban sebelum tersambung lagi.
        </Alert>
      )}
      {galat && (
        <Alert variant="danger" title="Jawaban terakhir belum tersimpan">
          {galat} Periksa koneksi; jawaban dikirim lagi saat Anda memilih ulang.
        </Alert>
      )}
      <div className="u-cbt-lembar-body">
        <div className="u-cbt-lembar-main">
          <SoalCbt soal={s} onJawab={(j) => kirim(s, { jawaban: j })} />
          <footer className="u-cbt-lembar-foot">
            <Button variant="outline" onClick={() => setNomor(Math.max(1, s.nomor - 1))} disabled={s.nomor <= 1}>
              <ArrowLeft /> Sebelumnya
            </Button>
            <Button variant={s.ragu ? 'secondary' : 'ghost'} onClick={() => kirim(s, { ragu: !s.ragu })} aria-pressed={s.ragu} className="u-cbt-ragu">
              <Flag /> Ragu-ragu
            </Button>
            {s.nomor < daftar.length ? (
              <Button onClick={() => setNomor(s.nomor + 1)}>
                Berikutnya <ArrowRight />
              </Button>
            ) : (
              <Button onClick={() => setKonfirmasi(true)}>
                <Send /> Kumpulkan
              </Button>
            )}
          </footer>
        </div>
        <aside className="u-cbt-lembar-side">
          <h3>
            <LayoutGrid aria-hidden /> Nomor soal
          </h3>
          <NavigasiSoal soal={daftar} aktif={s.nomor} onPilih={setNomor} />
          <Button variant="outline" fullWidth onClick={() => setKonfirmasi(true)}>
            Kumpulkan jawaban
          </Button>
        </aside>
      </div>
      <ConfirmDialog
        open={konfirmasi}
        onOpenChange={setKonfirmasi}
        tone="primary"
        icon={<Send />}
        title="Kumpulkan jawaban sekarang?"
        description={
          sudah < daftar.length || ragu > 0
            ? `Masih ada ${daftar.length - sudah} soal belum dijawab${ragu ? ` dan ${ragu} ditandai ragu-ragu` : ''}. Setelah dikumpulkan, jawaban tidak bisa diubah.`
            : 'Semua soal sudah dijawab. Setelah dikumpulkan, jawaban tidak bisa diubah.'
        }
        confirmLabel="Kumpulkan jawaban"
        cancelLabel="Periksa lagi"
        onConfirm={kumpulkan}
      />
    </div>
  );
}

// ================================================================ Hasil
/** Layar setelah ujian dikumpulkan. Nilai hanya tampil bila pengelola mengizinkan (`tampil_hasil`). */
export function HasilUjian({ lembar, className }: { lembar: LembarUjianData; className?: string }) {
  const h = lembar.hasil;
  return (
    <div className={cn('u-cbt-hasil', className)}>
      {h && h.nilai != null ? (
        <ProgressRing value={h.nilai} size={120} thickness={9} tone={h.lulus === false ? 'warning' : 'success'} label={<b>{formatNumber(h.nilai, { maximumFractionDigits: 1 })}</b>} />
      ) : (
        <span className="u-cbt-hasil-ikon">
          <CircleCheck />
        </span>
      )}
      <h2>{lembar.status === 'diskualifikasi' ? 'Anda didiskualifikasi' : 'Jawaban sudah dikumpulkan'}</h2>
      <p>{lembar.ujian.nama}</p>
      {h ? (
        <dl>
          <div>
            <dt>Skor</dt>
            <dd>
              {formatNumber(h.skor ?? 0, { maximumFractionDigits: 1 })} / {formatNumber(h.skor_maks ?? 0)}
            </dd>
          </div>
          {h.lulus != null && (
            <div>
              <dt>Status</dt>
              <dd>
                <Badge variant={h.lulus ? 'success' : 'warning'} dot>
                  {h.lulus ? 'Lulus' : 'Belum lulus'}
                </Badge>
              </dd>
            </div>
          )}
        </dl>
      ) : (
        <small>Nilai diumumkan oleh pengelola ujian.</small>
      )}
      {h?.perlu_koreksi && <small>Sebagian soal esai masih dikoreksi; nilai bisa berubah.</small>}
    </div>
  );
}
