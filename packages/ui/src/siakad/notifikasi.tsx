'use client';
import * as React from 'react';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import { Button, Skeleton } from '../components/actions';
import { Empty } from '../components/display';
import { Popover } from '../components/overlays';
import { cn } from '../lib/cn';
import { useOptionalSiakad } from './provider';

/**
 * Notifikasi terpusat SIAKAD (`/v1/notif`, docs/NOTIFIKASI.md di siakad_unipo): jumlah belum dibaca, kotak masuk,
 * tandai dibaca. Butuh scope `notif:read` (baca) dan `notif:write` (tandai dibaca) di token aplikasi.
 */

/** Satu baris `notif_kotak`. */
export interface Notifikasi {
  id: number;
  username: string;
  modul: string | null;
  judul: string;
  isi: string | null;
  tautan: string | null;
  entitas?: string | null;
  entitas_id?: number | null;
  dibaca_pada: string | null;
  created_at: string;
}

export interface OpsiNotifikasi {
  /** Jeda pembaruan jumlah belum dibaca (ms). Bawaan 60 detik; berhenti saat tab tersembunyi. 0 = tanpa polling. */
  interval?: number;
  /** Username pemilik kotak (untuk pengelola yang bisa melihat semua kotak). Bawaan diambil dari /v1/notif/ringkas. */
  username?: string;
  /** Jumlah notifikasi yang dimuat saat panel dibuka. Bawaan 8. */
  jumlah?: number;
  enabled?: boolean;
}

export interface KeadaanNotifikasi {
  /** false bila akun/token tidak punya akses notifikasi (401/403/404): sembunyikan ikonnya. */
  tersedia: boolean;
  belum: number;
  daftar: Notifikasi[] | null;
  memuat: boolean;
  /** Muat ulang jumlah belum dibaca dan (bila sudah pernah dimuat) daftar. */
  segarkan: () => void;
  /** Muat daftar notifikasi terbaru. */
  muatDaftar: () => Promise<void>;
  baca: (n: Notifikasi) => Promise<void>;
  bacaSemua: () => Promise<void>;
}

const P = '/v1/notif';
const diam = (e: unknown) => [401, 403, 404].includes(Number((e as { status?: number })?.status));

/**
 * Keadaan notifikasi untuk komponen kustom. Gagal karena izin (401/403/404) tidak dilaporkan sebagai galat:
 * `tersedia` menjadi false dan polling berhenti.
 */
export function useNotifikasi({ interval = 60_000, username, jumlah = 8, enabled = true }: OpsiNotifikasi = {}): KeadaanNotifikasi {
  const siakad = useOptionalSiakad();
  const [tersedia, setTersedia] = React.useState(true);
  const [belum, setBelum] = React.useState(0);
  const [daftar, setDaftar] = React.useState<Notifikasi[] | null>(null);
  const [memuat, setMemuat] = React.useState(false);
  const aktif = enabled && Boolean(siakad) && tersedia;

  const ringkas = React.useCallback(async () => {
    if (!siakad) return;
    try {
      const r = await siakad.request<{ belum_dibaca: number }>({ method: 'GET', path: `${P}/ringkas` }, { maxRetries: 0 });
      setBelum(Number(r.data?.belum_dibaca ?? 0));
    } catch (e) {
      if (diam(e)) setTersedia(false);
    }
  }, [siakad]);

  const muatDaftar = React.useCallback(async () => {
    if (!siakad) return;
    setMemuat(true);
    try {
      const query: Record<string, string> = { per_page: String(jumlah) };
      if (username) query.username = username;
      const r = await siakad.request<Notifikasi[]>({ method: 'GET', path: `${P}/kotak`, query });
      setDaftar(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      if (diam(e)) setTersedia(false);
      setDaftar((d) => d ?? []);
    } finally {
      setMemuat(false);
    }
  }, [siakad, jumlah, username]);

  React.useEffect(() => {
    if (!aktif) return;
    void ringkas();
    if (!interval) return;
    const t = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') void ringkas();
    }, interval);
    const lihat = () => document.visibilityState === 'visible' && void ringkas();
    document.addEventListener('visibilitychange', lihat);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', lihat);
    };
  }, [aktif, interval, ringkas]);

  const baca = React.useCallback(
    async (n: Notifikasi) => {
      if (!siakad || n.dibaca_pada) return;
      const kini = new Date().toISOString();
      setDaftar((d) => d?.map((x) => (x.id === n.id ? { ...x, dibaca_pada: kini } : x)) ?? d);
      setBelum((b) => Math.max(0, b - 1));
      try {
        await siakad.request({ method: 'POST', path: `${P}/kotak/${n.id}/baca`, body: {} });
      } catch {
        void ringkas();
      }
    },
    [siakad, ringkas],
  );

  const bacaSemua = React.useCallback(async () => {
    if (!siakad) return;
    const kini = new Date().toISOString();
    setDaftar((d) => d?.map((x) => ({ ...x, dibaca_pada: x.dibaca_pada ?? kini })) ?? d);
    setBelum(0);
    try {
      await siakad.request({ method: 'POST', path: `${P}/kotak/baca-semua`, body: {} });
    } catch {
      void ringkas();
    }
  }, [siakad, ringkas]);

  const segarkan = React.useCallback(() => {
    void ringkas();
    if (daftar) void muatDaftar();
  }, [ringkas, muatDaftar, daftar]);

  return { tersedia: tersedia && Boolean(siakad) && enabled, belum, daftar, memuat, segarkan, muatDaftar, baca, bacaSemua };
}

/** "baru saja", "5 menit lalu", "3 jam lalu", "kemarin", lalu tanggal. */
export function waktuRelatif(s: string, kini = Date.now()): string {
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T'));
  const detik = Math.round((kini - d.getTime()) / 1000);
  if (!Number.isFinite(detik)) return '';
  if (detik < 60) return 'baru saja';
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`;
  if (detik < 86_400) return `${Math.floor(detik / 3600)} jam lalu`;
  if (detik < 172_800) return 'kemarin';
  if (detik < 7 * 86_400) return `${Math.floor(detik / 86_400)} hari lalu`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: d.getFullYear() === new Date(kini).getFullYear() ? undefined : 'numeric' });
}

/** Buka tautan notifikasi: jalur internal lewat `navigasi`, alamat luar di tab yang sama. */
export function bukaTautan(tautan: string, navigasi?: (href: string) => void) {
  if (typeof window === 'undefined') return;
  if (tautan.startsWith('/') && !tautan.startsWith('//')) {
    if (navigasi) navigasi(tautan);
    else window.location.assign(tautan);
    return;
  }
  try {
    const u = new URL(tautan, window.location.href);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
    if (u.origin === window.location.origin && navigasi) navigasi(u.pathname + u.search + u.hash);
    else window.location.assign(u.href);
  } catch {
    /* tautan tidak valid: abaikan */
  }
}

export interface TombolNotifikasiProps extends OpsiNotifikasi {
  /**
   * Jumlah belum dibaca dari sumber notifikasi milik aplikasi (mis. notifikasi LMS atau LPPM). Bila diisi, ikon
   * yang sama tampil dengan lencana ini dan langsung membuka `semuaHref` (tanpa membaca /v1/notif).
   */
  belumLuar?: number;
  /** Navigasi jalur internal (mis. `useNavigate()` React Router). Bawaan `location.assign`. */
  onNavigasi?: (href: string) => void;
  /** Halaman semua notifikasi di aplikasi ini (tombol "Lihat semua"). */
  semuaHref?: string;
  className?: string;
}

/**
 * Ikon lonceng di bilah atas: lencana jumlah belum dibaca (GET /v1/notif/ringkas, diperbarui tiap menit selama tab
 * terlihat) dan panel kotak masuk. Klik notifikasi = tandai dibaca lalu buka tautannya. Tidak tampil bila akun atau
 * token tidak punya akses notifikasi.
 */
export function TombolNotifikasi({ onNavigasi, semuaHref, belumLuar, className, ...opsi }: TombolNotifikasiProps) {
  const luar = belumLuar !== undefined;
  const n = useNotifikasi({ ...opsi, enabled: !luar && opsi.enabled !== false });
  const [buka, setBuka] = React.useState(false);
  if (luar)
    return (
      <Button variant="ghost" size="sm" iconOnly className={cn('u-kabar-tombol', className)} aria-label={belumLuar ? `Notifikasi, ${belumLuar} belum dibaca` : 'Notifikasi'} onClick={() => semuaHref && bukaTautan(semuaHref, onNavigasi)}>
        <Bell />
        {belumLuar > 0 && <span className="u-kabar-lencana">{belumLuar > 99 ? '99+' : belumLuar}</span>}
      </Button>
    );
  if (!n.tersedia) return null;
  const ubahBuka = (o: boolean) => {
    setBuka(o);
    if (o) void n.muatDaftar();
  };
  const pilih = (x: Notifikasi) => {
    void n.baca(x);
    setBuka(false);
    if (x.tautan) bukaTautan(x.tautan, onNavigasi);
  };
  const ada = n.daftar ?? [];
  return (
    <Popover
      open={buka}
      onOpenChange={ubahBuka}
      align="end"
      width={360}
      className={cn('u-kabar-panel', className)}
      trigger={
        <Button variant="ghost" size="sm" iconOnly className="u-kabar-tombol" aria-label={n.belum ? `Notifikasi, ${n.belum} belum dibaca` : 'Notifikasi'}>
          <Bell />
          {n.belum > 0 && <span className="u-kabar-lencana">{n.belum > 99 ? '99+' : n.belum}</span>}
        </Button>
      }
    >
      <div className="u-kabar-kepala">
        <span className="u-kabar-judul">Notifikasi</span>
        {n.belum > 0 && (
          <Button variant="ghost" size="xs" onClick={() => void n.bacaSemua()}>
            <CheckCheck /> Tandai semua dibaca
          </Button>
        )}
      </div>
      {n.daftar === null || (n.memuat && !ada.length) ? (
        <div className="u-kabar-daftar" aria-busy>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={44} />
          ))}
        </div>
      ) : ada.length ? (
        <div className="u-kabar-daftar" role="list">
          {ada.map((x) => (
            <button key={x.id} type="button" role="listitem" className="u-kabar-item" data-belum={x.dibaca_pada ? undefined : ''} onClick={() => pilih(x)}>
              <span className="u-kabar-titik" aria-hidden />
              <span className="u-kabar-item-teks">
                <span className="u-kabar-item-atas">
                  <b>{x.judul}</b>
                  <time dateTime={x.created_at}>{waktuRelatif(x.created_at)}</time>
                </span>
                {x.isi && <span className="u-kabar-item-isi">{x.isi}</span>}
                {x.modul && <span className="u-kabar-item-modul">{x.modul}</span>}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <Empty icon={<BellOff />} title="Tidak ada notifikasi" description="Pemberitahuan dari semua aplikasi UNIPO tampil di sini." />
      )}
      {semuaHref && (
        <div className="u-kabar-kaki">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setBuka(false);
              bukaTautan(semuaHref, onNavigasi);
            }}
          >
            Lihat semua
          </Button>
        </div>
      )}
    </Popover>
  );
}
