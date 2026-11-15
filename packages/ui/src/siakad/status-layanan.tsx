'use client';
import * as React from 'react';
import { Cloud, CreditCard, Database, Globe, HardDrive, KeyRound, Mail, MessageCircle, ShieldCheck, Video } from 'lucide-react';
import { ServiceList, ServiceStatusPanel, StatusBanner, type ServiceCheck, type ServiceInfo, type ServiceState } from '../components/status';
import { useOptionalSiakad, useSiakadQuery } from './provider';

export interface StatusLayananProps {
  /** Alamat API yang ditampilkan di baris Gerbang API, mis. "https://api.unipo.ac.id/v1". */
  apiLabel?: string;
  /**
   * Layanan tambahan yang diperiksa lewat fetch (mis. SSO). Alamat harus mengizinkan CORS dari aplikasi Anda,
   * atau arahkan ke BFF sendiri (mis. /bff/status).
   */
  extra?: Array<{ key: string; name: string; url: string; description?: string; icon?: React.ReactNode }>;
  /** Sertakan baris SSO (sso.unipo.ac.id) lewat URL ini. Bawaan tidak ada. */
  ssoUrl?: string;
  intervalMs?: number;
  title?: React.ReactNode;
  className?: string;
}

/**
 * Status layanan UNIPO siap pakai: Gerbang API dan database SIAKAD dari `system.health()` (GET /v1/health, publik),
 * plus layanan lain yang Anda daftarkan (SSO, BFF). Diperiksa ulang tiap menit dan lewat tombol Periksa ulang.
 */
export function StatusLayananUnipo({ apiLabel = 'https://api.unipo.ac.id/v1', extra = [], ssoUrl, intervalMs = 60_000, title, className }: StatusLayananProps) {
  const siakad = useOptionalSiakad();
  // Satu panggilan health dipakai dua baris (gerbang + database).
  const health = React.useRef<Promise<Record<string, unknown>> | null>(null);
  const getHealth = (signal: AbortSignal) => {
    if (!health.current) {
      if (!siakad) return Promise.reject(new Error('SDK belum dipasang'));
      health.current = siakad.system.health({}, { signal }).then((r) => r.data as Record<string, unknown>);
      health.current.finally(() => setTimeout(() => (health.current = null), 1000)).catch(() => undefined);
    }
    return health.current;
  };
  const fetchCheck = (url: string) => async (signal: AbortSignal) => {
    const r = await fetch(url, { signal, cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!r.ok) throw Object.assign(new Error(String(r.status)), { status: r.status });
  };
  const checks: ServiceCheck[] = [
    { key: 'api', name: 'Gerbang API', description: apiLabel, icon: <Globe />, check: async (signal) => void (await getHealth(signal)) },
    {
      key: 'db',
      name: 'Database SIAKAD',
      icon: <Database />,
      check: async (signal) => {
        const h = await getHealth(signal);
        return h.database === 'ok' ? { description: 'Terhubung' } : { status: 'down', detail: String(h.database ?? 'gagal') };
      },
    },
    ...(ssoUrl ? [{ key: 'sso', name: 'Login SSO', description: ssoUrl.replace(/\/\.well-known.*$/, ''), icon: <KeyRound />, check: fetchCheck(ssoUrl) }] : []),
    ...extra.map((e) => ({ key: e.key, name: e.name, description: e.description ?? e.url, icon: e.icon ?? <Cloud />, check: fetchCheck(e.url) })),
  ];
  return <ServiceStatusPanel checks={checks} intervalMs={intervalMs} title={title} className={className} />;
}

// ================================================================ Integrasi aktif
const INTEGRASI: Record<string, { nama: string; icon: React.ReactNode }> = {
  captcha: { nama: 'Captcha', icon: <ShieldCheck /> },
  pembayaran: { nama: 'Payment gateway', icon: <CreditCard /> },
  penyimpanan: { nama: 'Penyimpanan berkas', icon: <HardDrive /> },
  cache: { nama: 'Cache & antrean', icon: <Database /> },
  email: { nama: 'Email', icon: <Mail /> },
  whatsapp: { nama: 'WhatsApp', icon: <MessageCircle /> },
  rapat: { nama: 'Rapat daring', icon: <Video /> },
};

/** Daftar integrasi pihak ketiga yang aktif (GET /v1/integrasi/status, publik): captcha, pembayaran, email, dll. */
export function IntegrasiAktif({ className }: { className?: string }) {
  const { data, loading } = useSiakadQuery(['integrasi', 'status'], (s, signal) => s.integrasi.getStatus({}, { signal }), { staleTime: 60_000 });
  const d = (data ?? {}) as Record<string, { penyedia?: string; driver?: string; mode?: string } | null>;
  const keys = Object.keys(INTEGRASI).filter((k) => loading || k in d);
  const services: ServiceInfo[] = keys.map((k) => {
    const v = d[k];
    return {
      key: k,
      name: INTEGRASI[k].nama,
      icon: INTEGRASI[k].icon,
      status: loading ? 'checking' : v ? 'ok' : 'off',
      statusLabel: loading ? undefined : v ? 'Aktif' : 'Nonaktif',
      description: loading ? 'Memuat…' : v ? [v.penyedia ?? v.driver, v.mode === 'sandbox' ? 'mode uji' : null].filter(Boolean).join(' · ') : 'Belum diatur di Pustikom',
    };
  });
  return <ServiceList className={className} services={services} />;
}

// ================================================================ Registri layanan kampus (Pustikom » Infrastruktur)
/** Satu baris GET /v1/infra/status. */
export interface StatusLayananKampusItem {
  kode: string;
  nama: string;
  jenis: string;
  status: 'sehat' | 'terganggu' | 'mati' | 'tidak_diketahui';
  latensi_ms: number | null;
  diperiksa_at: string | null;
  berubah_at: string | null;
  uptime_24j: number | null;
}
export interface StatusLayananKampusData {
  status: 'normal' | 'sebagian_terganggu' | 'gangguan' | 'tidak_diketahui';
  layanan: StatusLayananKampusItem[];
  diperbarui_at: string;
}

const STATUS_KAMPUS: Record<StatusLayananKampusItem['status'], ServiceState> = { sehat: 'ok', terganggu: 'degraded', mati: 'down', tidak_diketahui: 'checking' };
const UMUM_KAMPUS: Record<StatusLayananKampusData['status'], ServiceState> = { normal: 'ok', sebagian_terganggu: 'degraded', gangguan: 'down', tidak_diketahui: 'checking' };

export interface StatusLayananKampusProps {
  /** Hanya tampilkan layanan dengan kode ini (mis. ['siakad', 'sso', 'lms']). Bawaan semua. */
  kode?: string[];
  /** Sembunyikan spanduk ringkasan di atas daftar. */
  tanpaSpanduk?: boolean;
  /** Hanya spanduk (cocok untuk banner gangguan di atas aplikasi); tidak tampil apa pun saat normal. */
  hanyaGangguan?: boolean;
  /** Tautan per layanan, mis. ke halaman status lengkap. */
  href?: (kode: string) => string | undefined;
  className?: string;
}

/**
 * Status semua aplikasi dan layanan kampus dari registri Pustikom (GET /v1/infra/status, publik, health check tiap
 * beberapa menit oleh cron SIAKAD): spanduk ringkasan + daftar layanan dengan latensi dan uptime 24 jam.
 * Dengan `hanyaGangguan`, hanya spanduk yang muncul saat ada layanan terganggu atau mati.
 */
export function StatusLayananKampus({ kode, tanpaSpanduk, hanyaGangguan, href, className }: StatusLayananKampusProps) {
  const { data, loading, error } = useSiakadQuery<StatusLayananKampusData>(
    ['infra', 'status'],
    (s, signal) => s.request<StatusLayananKampusData>({ method: 'GET', path: '/v1/infra/status', public: true }, { signal }),
    { staleTime: 60_000 },
  );
  const layanan = (data?.layanan ?? []).filter((l) => !kode || kode.includes(l.kode));
  const buruk = layanan.filter((l) => l.status === 'mati' || l.status === 'terganggu');
  const umum: ServiceState = kode ? (layanan.some((l) => l.status === 'mati') ? 'down' : buruk.length ? 'degraded' : layanan.length ? 'ok' : 'checking') : UMUM_KAMPUS[data?.status ?? 'tidak_diketahui'];
  const waktu = data?.diperbarui_at ? new Date(data.diperbarui_at) : null;
  const catatan = buruk.length ? buruk.map((l) => `${l.nama} ${l.status === 'mati' ? 'tidak tersedia' : 'melambat'}`).join(' · ') : undefined;

  if (hanyaGangguan) {
    if (loading || error || !buruk.length) return null;
    return <StatusBanner className={className} status={umum} note={catatan} checkedAt={waktu} />;
  }
  if (error) return <StatusBanner className={className} status="off" title="Status layanan tidak bisa dimuat" note={error instanceof Error ? error.message : undefined} />;
  const services: ServiceInfo[] = loading
    ? [{ key: 'memuat', name: 'Memuat status…', status: 'checking' }]
    : layanan.map((l) => ({
        key: l.kode,
        name: l.nama,
        icon: <Globe />,
        status: STATUS_KAMPUS[l.status],
        latency: l.latensi_ms,
        description: [l.uptime_24j !== null ? `Uptime 24 jam ${l.uptime_24j}%` : null, l.berubah_at ? `status sejak ${new Date(l.berubah_at.replace(' ', 'T')).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}` : null].filter(Boolean).join(' · ') || undefined,
        href: href?.(l.kode),
      }));
  return (
    <div className={className} style={{ display: 'grid', gap: 12 }}>
      {!tanpaSpanduk && !loading && <StatusBanner status={umum} note={catatan} checkedAt={waktu} />}
      <ServiceList services={services} />
    </div>
  );
}
