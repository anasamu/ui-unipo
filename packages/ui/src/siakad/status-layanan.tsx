'use client';
import * as React from 'react';
import { Cloud, CreditCard, Database, Globe, HardDrive, KeyRound, Mail, MessageCircle, ShieldCheck, Video } from 'lucide-react';
import { ServiceList, ServiceStatusPanel, type ServiceCheck, type ServiceInfo } from '../components/status';
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
