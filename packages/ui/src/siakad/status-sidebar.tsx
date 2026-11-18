'use client';
import * as React from 'react';
import { Database, TriangleAlert, Zap, ZapOff } from 'lucide-react';
import { Tooltip } from '../components/overlays';
import { cn } from '../lib/cn';
import { useOptionalSiakad } from './provider';
import { useStatusRealtime, type StatusRealtime } from './realtime';

// ================================================================ Kaki sidebar: status API, lingkungan & database, versi
//
// Satu kaki sidebar untuk semua aplikasi (dipasang otomatis oleh KerangkaAplikasi). Data dari SIAKAD
// GET /v1/health/lingkungan (token apa pun, lewat BFF karena awalan /v1/health selalu diteruskan); SIAKAD lama tanpa
// endpoint itu jatuh ke GET /v1/health (status saja, tanpa lencana database).

/** Jenis server/aplikasi. */
export type LingkunganServer = 'produksi' | 'uji' | 'pengembangan' | 'lokal';
export type StatusApi = 'memeriksa' | 'normal' | 'lambat' | 'gangguan';

/** Isi `data` GET /v1/health/lingkungan. */
export interface InfoLingkungan {
  status: 'ok' | 'gangguan';
  server: { lingkungan: LingkunganServer; label: string };
  database: {
    lingkungan: 'live' | 'development';
    /** Label siap tampil, mis. "Live (produksi)", "Development (salinan 12 Nov)", "Lokal". */
    label: string;
    data_asli: boolean;
    disamarkan: boolean;
    salinan_at: string | null;
    /** Mengapa development: aplikasi belum disetujui live, sesi masuk sebagai pengguna, atau dipilih. */
    alasan: 'aplikasi' | 'menyamar' | 'dipilih' | null;
    tersambung: boolean;
  };
  api: { versi: string; commit: string | null };
  waktu_server: string;
}

export interface KeadaanStatusSidebar {
  status: StatusApi;
  /** Latensi permintaan terakhir (ms), null saat memeriksa atau gangguan. */
  ms: number | null;
  /** Waktu cek terakhir. */
  dicek: Date | null;
  /** Lingkungan dari SIAKAD; null bila belum ada atau SIAKAD belum punya /v1/health/lingkungan. */
  info: InfoLingkungan | null;
}

/** Latensi di atas ini dianggap lambat (titik kuning). */
export const BATAS_LAMBAT_MS = 1500;

const sesuaikanLatensi = (ms: number): StatusApi => (ms > BATAS_LAMBAT_MS ? 'lambat' : 'normal');

/**
 * Status API + lingkungan untuk kaki sidebar: GET /v1/health/lingkungan tiap `interval` ms selama tab terlihat (dan saat
 * tab kembali terlihat). Bila endpoint itu tidak ada/tidak diteruskan (SIAKAD atau BFF lama, sesi tanpa token),
 * memakai GET /v1/health. Jawaban 4xx tetap berarti server hidup.
 */
export function useStatusSidebar(aktif = true, interval = 60_000): KeadaanStatusSidebar {
  const siakad = useOptionalSiakad();
  const [st, setSt] = React.useState<KeadaanStatusSidebar>({ status: 'memeriksa', ms: null, dicek: null, info: null });
  React.useEffect(() => {
    if (!aktif || !siakad) return;
    let batal = false;
    let lengkap = true; // false setelah /v1/health/lingkungan ditolak 4xx: pakai /v1/health saja
    let berjalan = false;
    const cek = async () => {
      if (berjalan || (typeof document !== 'undefined' && document.visibilityState !== 'visible')) return;
      berjalan = true;
      const t0 = performance.now();
      const selesai = (s: Omit<KeadaanStatusSidebar, 'dicek'>) => !batal && setSt({ ...s, dicek: new Date() });
      try {
        if (lengkap) {
          try {
            const r = await siakad.request<InfoLingkungan>({ method: 'GET', path: '/v1/health/lingkungan' }, { maxRetries: 0, timeout: 15_000 });
            const ms = Math.round(performance.now() - t0);
            const info = r.data && typeof r.data === 'object' && 'database' in r.data ? r.data : null;
            selesai({ status: info?.status === 'gangguan' ? 'gangguan' : sesuaikanLatensi(ms), ms, info });
            return;
          } catch (e) {
            const kode = Number((e as { status?: number })?.status);
            if (!(kode >= 400 && kode < 500)) throw e;
            lengkap = false;
          }
        }
        const t1 = performance.now();
        try {
          await siakad.request({ method: 'GET', path: '/v1/health', public: true }, { maxRetries: 0, timeout: 15_000 });
          const ms = Math.round(performance.now() - t1);
          selesai({ status: sesuaikanLatensi(ms), ms, info: null });
        } catch (e) {
          const ms = Math.round(performance.now() - t1);
          const kode = Number((e as { status?: number })?.status);
          if (kode && kode < 500) selesai({ status: sesuaikanLatensi(ms), ms, info: null });
          else throw e;
        }
      } catch {
        selesai({ status: 'gangguan', ms: null, info: null });
      } finally {
        berjalan = false;
      }
    };
    void cek();
    const t = setInterval(() => void cek(), interval);
    const lihat = () => document.visibilityState === 'visible' && void cek();
    document.addEventListener('visibilitychange', lihat);
    return () => {
      batal = true;
      clearInterval(t);
      document.removeEventListener('visibilitychange', lihat);
    };
  }, [aktif, siakad, interval]);
  return st;
}

/** Kesehatan API SIAKAD (kompatibel): status dan latensi saja. */
export function useStatusApi(aktif = true, interval = 60_000): { status: StatusApi; ms: number | null } {
  const { status, ms } = useStatusSidebar(aktif, interval);
  return { status, ms };
}

/**
 * Tebak jenis server dari nama host (sama dengan aturan SIAKAD): localhost, IP privat, *.test, *.localhost, *.local,
 * *.unipo.dev = lokal; label staging/uji/test/qa/sandbox/preview = uji; dev/development = pengembangan; selain itu produksi.
 */
export function tebakLingkungan(host: string): LingkunganServer {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (!h || h === 'localhost' || h === '::1' || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return 'lokal';
  if (['.localhost', '.test', '.local', '.unipo.dev'].some((a) => h.endsWith(a))) return 'lokal';
  const label = h.split('.').slice(0, -1).flatMap((l) => l.split(/[-_]/));
  if (label.some((k) => ['staging', 'stage', 'uji', 'test', 'qa', 'sandbox', 'preview'].includes(k))) return 'uji';
  if (label.some((k) => k === 'dev' || k === 'development')) return 'pengembangan';
  return 'produksi';
}

/** Nada lencana: produksi (hijau tenang), development (oranye), lokal (abu-biru), uji (ungu). */
export type NadaLingkungan = 'produksi' | 'development' | 'lokal' | 'uji';

const LABEL_SERVER: Record<LingkunganServer, string> = { produksi: 'Produksi', uji: 'Uji', pengembangan: 'Pengembangan', lokal: 'Lokal' };
const LABEL_STATUS: Record<StatusApi, string> = { memeriksa: 'Memeriksa API', normal: 'API normal', lambat: 'API lambat', gangguan: 'API gangguan' };
const ALASAN_DEV: Record<NonNullable<InfoLingkungan['database']['alasan']>, string> = {
  aplikasi: 'aplikasi ini belum disetujui memakai database live',
  menyamar: 'sesi "masuk sebagai pengguna" dibuka dengan database development',
  dipilih: 'token diminta untuk database development',
};

/** Ringkasan lencana dan peringatan dari info SIAKAD dan jenis aplikasi. */
export function ringkasLingkungan(info: InfoLingkungan | null, aplikasi: LingkunganServer) {
  if (!info) return null;
  const dev = info.database.lingkungan === 'development';
  const server = info.server.lingkungan;
  const nada: NadaLingkungan = dev || server === 'pengembangan' ? 'development' : server === 'produksi' ? 'produksi' : server === 'uji' ? 'uji' : 'lokal';
  const tanggal = /\(salinan ([^)]+)\)/.exec(info.database.label)?.[1];
  const pendek = dev ? (tanggal ? `Dev · ${tanggal}` : 'Development') : server === 'produksi' ? 'Live' : LABEL_SERVER[server];
  let peringatan: string | null = null;
  if (dev && aplikasi === 'produksi') peringatan = 'Aplikasi produksi memakai database development. Data di sini salinan, bukan data asli.';
  else if (info.database.data_asli && aplikasi !== 'produksi')
    peringatan = `Aplikasi ${LABEL_SERVER[aplikasi].toLowerCase()} terhubung ke database live produksi. Perubahan mengenai data asli.`;
  const rinci = [
    `Server SIAKAD: ${info.server.label}`,
    `Database: ${info.database.label}`,
    dev ? 'Data pribadi disamarkan' : info.database.data_asli ? 'Data asli' : null,
    dev && info.database.alasan ? `Karena ${ALASAN_DEV[info.database.alasan]}` : null,
    !info.database.tersambung ? 'Database tidak tersambung' : null,
  ].filter(Boolean) as string[];
  return { nada, pendek, peringatan, rinci };
}

/** Teks status realtime (WebSocket); null = integrasi tidak aktif/tidak dipakai (indikator disembunyikan). */
const TEKS_REALTIME: Record<StatusRealtime, string | null> = {
  mati: null,
  menyambung: 'Realtime: menyambung ke WebSocket…',
  tersambung: 'Realtime: tersambung (WebSocket)',
  cadangan: 'Realtime: WebSocket terputus, memakai long-poll sambil menyambung ulang',
};

const jam = (d: Date | null) => (d ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null);

export interface StatusSidebarProps {
  /** Versi aplikasi (package.json), mis. `__VERSI__`. */
  versi?: string;
  /** Commit pendek build aplikasi, mis. `__COMMIT__`. */
  commit?: string;
  /** Mode sidebar diciutkan: ikon saja + tooltip. */
  collapsed?: boolean;
  /** Periksa API (bawaan true). false = tanpa titik status dan tanpa lencana database. */
  statusApi?: boolean;
  /** Jenis aplikasi ini untuk peringatan salah database. Bawaan ditebak dari `location.hostname`. */
  lingkunganAplikasi?: LingkunganServer;
  /** Selang cek (ms), bawaan 60 detik. */
  interval?: number;
  /** Teks hak cipta di kaki. Bawaan "© <tahun> UNIPO" (tooltip: "© <tahun> Universitas Pohuwato"). */
  hakCipta?: React.ReactNode;
  /** Pakai data ini, tanpa memanggil API (pratinjau/dokumentasi). */
  keadaan?: KeadaanStatusSidebar;
  className?: string;
}

/**
 * Kaki sidebar bawaan semua aplikasi UNIPO: titik status API (hijau/kuning/merah, tooltip latensi dan jam cek), lencana
 * lingkungan + database (Live/Development/Lokal/Uji), versi + commit, hak cipta; peringatan bila aplikasi produksi
 * memakai database development atau aplikasi lokal/uji memakai database live produksi. Diciutkan: satu ikon + tooltip.
 */
export function StatusSidebar({ versi, commit, collapsed, statusApi = true, lingkunganAplikasi, interval, hakCipta, keadaan, className }: StatusSidebarProps) {
  const dariApi = useStatusSidebar(statusApi && !keadaan, interval);
  const st = keadaan ?? dariApi;
  const aplikasi = lingkunganAplikasi ?? (typeof window !== 'undefined' ? tebakLingkungan(window.location.hostname) : 'produksi');
  const ling = statusApi ? ringkasLingkungan(st.info, aplikasi) : null;
  const tahun = new Date().getFullYear();
  // Bawaan ringkas "© 2026 UNIPO" di kaki; nama lengkap di tooltip/title.
  const hak = hakCipta ?? `© ${tahun} UNIPO`;
  const hakTeks = typeof hakCipta === 'string' ? hakCipta : `© ${tahun} Universitas Pohuwato`;
  const v = versi ? `v${versi.replace(/^v/, '')}` : null;
  const c = commit && commit.trim() ? commit.trim().slice(0, 8) : null;
  const versiTeks = [v, c].filter(Boolean).join(' · ');
  const teksApi = st.status === 'gangguan' ? 'API gangguan' : st.ms != null ? `API ${st.ms} ms` : 'API …';
  const tipStatus = [st.ms != null && st.status !== 'gangguan' ? `${LABEL_STATUS[st.status]} · ${st.ms} ms` : LABEL_STATUS[st.status], st.dicek ? `dicek ${jam(st.dicek)}` : null]
    .filter(Boolean)
    .join(' · ');
  const tipVersiApi = st.info ? `SIAKAD API ${st.info.api.versi}${st.info.api.commit ? ` · ${st.info.api.commit}` : ''}` : null;
  const tipApi = [tipStatus, tipVersiApi].filter(Boolean).join(' · ');
  const statusTampil = statusApi ? st.status : 'normal';
  const rt = useStatusRealtime();
  const rtTeks = keadaan ? null : TEKS_REALTIME[rt];

  if (collapsed) {
    // Peringatan paling atas, lalu status API, lingkungan, versi.
    const baris = [ling?.peringatan ?? null, statusApi ? tipStatus : null, rtTeks, ...(ling?.rinci ?? []), statusApi ? tipVersiApi : null, versiTeks ? `Versi aplikasi ${versiTeks}` : null, hakTeks].filter(
      Boolean,
    ) as string[];
    return (
      <Tooltip
        side="right"
        content={
          <span className="u-ssb-tip">
            {baris.map((b, i) => (
              <span key={i} data-peringatan={b === ling?.peringatan ? '' : undefined}>
                {b}
              </span>
            ))}
          </span>
        }
      >
        <span className={cn('u-ssb', className)} data-ringkas="" data-nada={ling?.nada} data-peringatan={ling?.peringatan ? '' : undefined} tabIndex={0} aria-label={baris.join('. ')}>
          {ling?.peringatan ? <TriangleAlert className="u-ssb-ikon" aria-hidden /> : <Database className="u-ssb-ikon" aria-hidden />}
          <span className="u-ssb-titik" data-status={statusTampil} />
        </span>
      </Tooltip>
    );
  }

  return (
    <div className={cn('u-ssb', className)} data-nada={ling?.nada}>
      {ling?.peringatan && (
        <div className="u-ssb-peringatan" role="status">
          <TriangleAlert aria-hidden />
          <span>{ling.peringatan}</span>
        </div>
      )}
      <div className="u-ssb-baris">
        {statusApi ? (
          <Tooltip content={<span className="u-ssb-tip"><span>{tipStatus}</span>{tipVersiApi && <span>{tipVersiApi}</span>}</span>}>
            <span className="u-ssb-api" tabIndex={0} aria-label={tipApi}>
              <span className="u-ssb-titik" data-status={st.status} />
              {teksApi}
            </span>
          </Tooltip>
        ) : (
          <span />
        )}
        {rtTeks && (
          <Tooltip content={rtTeks}>
            <span className="u-ssb-rt" data-status={rt} tabIndex={0} aria-label={rtTeks}>
              {rt === 'cadangan' ? <ZapOff aria-hidden /> : <Zap aria-hidden />}
            </span>
          </Tooltip>
        )}
        {ling && (
          <Tooltip content={<span className="u-ssb-tip">{ling.rinci.map((b, i) => <span key={i}>{b}</span>)}</span>}>
            <span className="u-ssb-lencana" data-nada={ling.nada} tabIndex={0} aria-label={ling.rinci.join('. ')}>
              <Database aria-hidden />
              {ling.pendek}
            </span>
          </Tooltip>
        )}
      </div>
      <div className="u-ssb-kaki">
        {versiTeks && (
          <span className="u-ssb-versi" title={c ? `Versi aplikasi ${v ?? ''}, commit ${c}` : undefined}>
            {versiTeks}
          </span>
        )}
        <span className="u-ssb-hak" title={hakTeks}>
          {hak}
        </span>
      </div>
    </div>
  );
}
