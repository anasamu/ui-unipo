'use client';
import * as React from 'react';
import { Archive, BellRing, CalendarClock, CircleCheck, Eye, Info, LayoutPanelTop, Megaphone, MessageSquareText, PanelBottom, PanelTop, Pencil, Plus, Siren, SquareStack, Trash2, Wrench, X } from 'lucide-react';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Card, Empty } from '../components/display';
import { CheckboxGroup, Field, Input, SegmentedControl, Switch, Textarea } from '../components/forms';
import { PilihanBanyak } from '../components/formulir';
import { PitaPengumuman, type ItemPita } from '../components/kaki-situs';
import { ConfirmDialog, Dialog, Tooltip, useToast } from '../components/overlays';
import { Select } from '../components/select';
import { cn } from '../lib/cn';
import { GalatApi } from './galat';
import { PilihEntitas } from './pilih';
import { invalidateSiakad, pesanGalat, useOptionalSiakad, useSiakad, useSiakadQuery } from './provider';

// ================================================================ Pengumuman lintas aplikasi (/v1/notif/pita)
//
// Unit membuat pengumuman singkat dengan sasaran aplikasi, unit, peran, dan jenis pengguna. KerangkaAplikasi dan
// KerangkaPortal menampilkannya otomatis lewat <PengumumanTampil>, dengan cara tampil per pengumuman: pita, banner,
// popup, toast, atau bilah bawah (ponsel).

export type NadaPengumuman = 'info' | 'penting' | 'darurat' | 'pemeliharaan' | 'sukses';
export type ModePengumuman = 'pita' | 'banner' | 'popup' | 'toast' | 'bawah';
export type JenisSasaran = 'mahasiswa' | 'alumni' | 'dosen' | 'tendik' | 'pendaftar' | 'publik';

export interface PengumumanTayang {
  id: string;
  judul: string;
  isi?: string | null;
  tautan?: string | null;
  teks_tautan?: string | null;
  nada: NadaPengumuman;
  mode: ModePengumuman;
  gambar?: string | null;
  opsi?: { ulang?: 'sekali' | 'sesi'; hilang_detik?: number };
  prioritas?: number;
  dapat_ditutup: boolean;
  mulai?: string | null;
  selesai?: string | null;
}

export interface PengumumanKelola extends PengumumanTayang {
  status: 'draf' | 'terbit' | 'arsip';
  tayang: 'aktif' | 'terjadwal' | 'berakhir' | 'draf' | 'arsip';
  aplikasi: string[] | null;
  jenis: JenisSasaran[] | null;
  unit: string[] | null;
  peran: string[] | null;
  unit_pemilik?: string | null;
  dibuat_oleh?: string | null;
  dibuat_at?: string | null;
}

export const PILIHAN_NADA: Array<{ value: NadaPengumuman; label: string }> = [
  { value: 'info', label: 'Info' },
  { value: 'penting', label: 'Penting' },
  { value: 'darurat', label: 'Darurat' },
  { value: 'pemeliharaan', label: 'Pemeliharaan' },
  { value: 'sukses', label: 'Kabar baik' },
];

export const PILIHAN_MODE: Array<{ value: ModePengumuman; label: string; keterangan: string; ikon: React.ReactNode }> = [
  { value: 'pita', label: 'Pita', keterangan: 'Bilah tipis di atas semua halaman', ikon: <PanelTop /> },
  { value: 'banner', label: 'Banner', keterangan: 'Kartu di atas isi halaman, bisa bergambar', ikon: <LayoutPanelTop /> },
  { value: 'popup', label: 'Popup', keterangan: 'Jendela saat aplikasi dibuka', ikon: <SquareStack /> },
  { value: 'toast', label: 'Toast', keterangan: 'Kartu kecil dari kanan, bisa hilang sendiri', ikon: <MessageSquareText /> },
  { value: 'bawah', label: 'Bilah bawah', keterangan: 'Bilah di bawah layar ponsel', ikon: <PanelBottom /> },
];

/** Kode aplikasi sasaran (sama dengan `kode` KerangkaAplikasi; `siakad-lama` = SIAKAD lama, `publik` = portal publik). */
export const APLIKASI_PENGUMUMAN: Array<{ value: string; label: string }> = [
  { value: 'siakad-lama', label: 'SIAKAD (lama)' },
  { value: 'pustikom', label: 'Pustikom' },
  { value: 'baak', label: 'BAAK' },
  { value: 'bauk', label: 'BAUK (keuangan)' },
  { value: 'sdm', label: 'SDM' },
  { value: 'lms', label: 'E-learning' },
  { value: 'pmb', label: 'PMB' },
  { value: 'humas', label: 'Humas' },
  { value: 'fakultas', label: 'Fakultas' },
  { value: 'lp2m', label: 'LPPM' },
  { value: 'spmi', label: 'SPMI' },
  { value: 'tracer', label: 'Alumni (tracer)' },
  { value: 'dashboard', label: 'Dasbor pimpinan' },
  { value: 'profile', label: 'Profil' },
  { value: 'api', label: 'Portal API' },
  { value: 'publik', label: 'Portal publik (situs)' },
];

export const JENIS_SASARAN: Array<{ value: JenisSasaran; label: string }> = [
  { value: 'mahasiswa', label: 'Mahasiswa' },
  { value: 'dosen', label: 'Dosen' },
  { value: 'tendik', label: 'Tendik' },
  { value: 'alumni', label: 'Alumni' },
  { value: 'pendaftar', label: 'Pendaftar PMB' },
  { value: 'publik', label: 'Publik (tanpa login)' },
];

const IKON_NADA: Record<NadaPengumuman, React.ReactNode> = {
  info: <Info />,
  penting: <Megaphone />,
  darurat: <Siren />,
  pemeliharaan: <Wrench />,
  sukses: <CircleCheck />,
};

// ---------------------------------------------------------------- data tayang + tutup

const KUNCI_TUTUP = 'unipo.pengumuman.tutup';
const KUNCI_SESI = 'unipo.pengumuman.sesi';
const ditutup = new Set<string>();
const pendengarTutup = new Set<() => void>();
let dimuatLokal = false;

function muatLokal() {
  if (dimuatLokal || typeof window === 'undefined') return;
  dimuatLokal = true;
  try {
    for (const id of JSON.parse(localStorage.getItem(KUNCI_TUTUP) ?? '[]') as string[]) ditutup.add(id);
    for (const id of JSON.parse(sessionStorage.getItem(KUNCI_SESI) ?? '[]') as string[]) ditutup.add(`sesi:${id}`);
  } catch {
    /* penyimpanan diblokir */
  }
}

function simpanLokal(kunci: string, id: string, store: Storage | undefined) {
  try {
    if (!store) return;
    const l = new Set<string>(JSON.parse(store.getItem(kunci) ?? '[]') as string[]);
    l.add(id);
    store.setItem(kunci, JSON.stringify([...l].slice(-200)));
  } catch {
    /* abaikan */
  }
}

function useDitutup(): Set<string> {
  muatLokal();
  const [, setN] = React.useState(0);
  React.useEffect(() => {
    const f = () => setN((n) => n + 1);
    pendengarTutup.add(f);
    return () => void pendengarTutup.delete(f);
  }, []);
  return ditutup;
}

/**
 * Pengumuman yang sedang tayang untuk pemanggil di aplikasi `aplikasi` (GET /v1/notif/pita), disegarkan tiap 5 menit
 * selama tab terlihat. `tutup(item)` menyembunyikan di semua aplikasi (per akun di server; tanpa login di browser ini).
 */
export function usePengumumanTayang(aplikasi: string, enabled = true, situs?: string) {
  const siakad = useOptionalSiakad();
  const q = useSiakadQuery<PengumumanTayang[]>(['notif-pita', aplikasi, situs ?? ''], (s, signal) => s.request<PengumumanTayang[]>({ method: 'GET', path: '/v1/notif/pita', query: { aplikasi, situs } }, { signal, maxRetries: 0 }), {
    staleTime: 120_000,
    enabled: enabled && Boolean(siakad),
  });
  const tutupSet = useDitutup();
  React.useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => document.visibilityState === 'visible' && invalidateSiakad('notif-pita'), 300_000);
    return () => clearInterval(t);
  }, [enabled]);
  const items = (q.data ?? []).filter((x) => !tutupSet.has(x.id));
  const tutup = React.useCallback(
    (item: PengumumanTayang, cara: 'permanen' | 'sesi' = 'permanen') => {
      if (cara === 'sesi') {
        ditutup.add(`sesi:${item.id}`);
        simpanLokal(KUNCI_SESI, item.id, typeof sessionStorage !== 'undefined' ? sessionStorage : undefined);
      } else {
        ditutup.add(item.id);
        simpanLokal(KUNCI_TUTUP, item.id, typeof localStorage !== 'undefined' ? localStorage : undefined);
        void siakad?.request({ method: 'POST', path: `/v1/notif/pita/${item.id}/tutup`, body: {} }, { maxRetries: 0 }).catch(() => {});
      }
      pendengarTutup.forEach((f) => f());
    },
    [siakad],
  );
  return { items, semua: q.data ?? [], loading: q.loading, tutup, sudahDitutup: (id: string) => tutupSet.has(id) || tutupSet.has(`sesi:${id}`) };
}

// ---------------------------------------------------------------- tampilan per mode (juga dipakai pratinjau)

const nadaKePita = (n: NadaPengumuman): ItemPita['priority'] => (n === 'penting' ? 'penting' : n);

function Tautan({ p, className, children }: { p: PengumumanTayang; className?: string; children?: React.ReactNode }) {
  if (!p.tautan) return null;
  const luar = /^https?:/.test(p.tautan);
  return (
    <a className={className} href={p.tautan} target={luar ? '_blank' : undefined} rel={luar ? 'noreferrer' : undefined}>
      {children ?? p.teks_tautan ?? 'Selengkapnya'}
    </a>
  );
}

/** Kartu banner di atas isi halaman: ikon nada, judul, keterangan, tombol tautan, gambar opsional. */
export function BannerPengumuman({ p, onTutup, className }: { p: PengumumanTayang; onTutup?: () => void; className?: string }) {
  return (
    <div className={cn('u-pgm-banner', className)} data-nada={p.nada} role="region" aria-label="Pengumuman">
      <span className="u-pgm-ikon" aria-hidden>
        {IKON_NADA[p.nada]}
      </span>
      <div className="u-pgm-teks">
        <strong>{p.judul}</strong>
        {p.isi && <p>{p.isi}</p>}
        {p.tautan && <Tautan p={p} className="u-button u-pgm-cta" />}
      </div>
      {p.gambar && <img className="u-pgm-gambar" src={p.gambar} alt="" loading="lazy" />}
      {onTutup && p.dapat_ditutup && (
        <button type="button" className="u-pgm-tutup" aria-label="Tutup pengumuman" onClick={onTutup}>
          <X />
        </button>
      )}
    </div>
  );
}

/** Kartu toast (juga isi bilah bawah). */
export function ToastPengumuman({ p, onTutup, bawah, className }: { p: PengumumanTayang; onTutup?: () => void; bawah?: boolean; className?: string }) {
  return (
    <div className={cn(bawah ? 'u-pgm-bawah' : 'u-pgm-toast', className)} data-nada={p.nada} role="status">
      <span className="u-pgm-ikon" aria-hidden>
        {IKON_NADA[p.nada]}
      </span>
      <div className="u-pgm-teks">
        <strong>{p.judul}</strong>
        {p.isi && !bawah && <p>{p.isi}</p>}
        <Tautan p={p} className="u-pgm-tautan" />
      </div>
      {onTutup && (
        <button type="button" className="u-pgm-tutup" aria-label="Tutup pengumuman" onClick={onTutup}>
          <X />
        </button>
      )}
    </div>
  );
}

/** Isi popup (dipakai di dalam Dialog dan di pratinjau). */
export function IsiPopupPengumuman({ p }: { p: PengumumanTayang }) {
  return (
    <div className="u-pgm-popup" data-nada={p.nada}>
      {p.gambar ? (
        <img className="u-pgm-popup-gambar" src={p.gambar} alt="" />
      ) : (
        <span className="u-pgm-popup-ikon" aria-hidden>
          {IKON_NADA[p.nada]}
        </span>
      )}
      {p.isi && <p>{p.isi}</p>}
    </div>
  );
}

export interface PengumumanTampilProps {
  /** Kode aplikasi pemanggil (sama dengan `kode` KerangkaAplikasi; portal publik: `publik`). */
  aplikasi: string;
  /** Kode situs portal (untuk `publik`): pengumuman publik milik unit hanya tayang di situs unit itu. */
  situs?: string;
  /**
   * Bagian yang dirender: `atas` = pita (taruh di atas header), `isi` = banner (taruh di atas isi halaman),
   * `lapis` = popup, toast, dan bilah bawah (lapisan di atas halaman). Bawaan semua.
   */
  bagian?: Array<'atas' | 'isi' | 'lapis'>;
  className?: string;
}

/**
 * Tampilkan pengumuman lintas aplikasi sesuai mode masing-masing. KerangkaAplikasi memasangnya otomatis; pakai
 * langsung di tata letak sendiri (mis. halaman publik) bila perlu. Popup tampil satu per satu menurut prioritas.
 */
export function PengumumanTampil({ aplikasi, situs, bagian = ['atas', 'isi', 'lapis'], className }: PengumumanTampilProps) {
  const { items, tutup, sudahDitutup } = usePengumumanTayang(aplikasi, true, situs);
  const [sembunyi, setSembunyi] = React.useState<Set<string>>(new Set());
  const pita = items.filter((x) => x.mode === 'pita');
  const banner = items.filter((x) => x.mode === 'banner');
  const popup = items.find((x) => x.mode === 'popup' && !sudahDitutup(x.id));
  const toast = items.filter((x) => (x.mode === 'toast' || x.mode === 'bawah') && !sembunyi.has(x.id));
  const bawah = toast.filter((x) => x.mode === 'bawah');
  const kanan = toast.filter((x) => x.mode === 'toast');

  React.useEffect(() => {
    // Toast yang punya hilang_detik hilang sendiri (untuk sesi ini saja; muncul lagi saat aplikasi dibuka ulang).
    const t = kanan
      .filter((x) => (x.opsi?.hilang_detik ?? 0) > 0)
      .map((x) => setTimeout(() => setSembunyi((s) => new Set(s).add(x.id)), (x.opsi!.hilang_detik ?? 8) * 1000));
    return () => t.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kanan.map((x) => x.id).join(',')]);

  const tutupPopup = () => {
    if (!popup) return;
    tutup(popup, popup.opsi?.ulang === 'sesi' || !popup.dapat_ditutup ? 'sesi' : 'permanen');
  };

  return (
    <>
      {bagian.includes('atas') && pita.length > 0 && (
        <PitaPengumuman
          className={cn('u-pgm-pita', className)}
          interval={7000}
          items={pita.map((p) => ({ id: p.id, title: p.judul, detail: p.isi ?? undefined, href: p.tautan ?? undefined, cta: p.teks_tautan ?? undefined, external: /^https?:/.test(p.tautan ?? ''), priority: nadaKePita(p.nada), dapatDitutup: p.dapat_ditutup }))}
          onTutupItem={(it) => {
            const p = pita.find((x) => x.id === it.id);
            if (p) tutup(p);
          }}
        />
      )}
      {bagian.includes('isi') && banner.length > 0 && (
        <div className="u-pgm-banner-daftar">
          {banner.map((p) => (
            <BannerPengumuman key={p.id} p={p} onTutup={() => tutup(p)} />
          ))}
        </div>
      )}
      {bagian.includes('lapis') && (
        <>
          {popup && (
            <Dialog open onOpenChange={(o) => !o && tutupPopup()} title={popup.judul} size={popup.gambar ? 'md' : 'sm'} footer={
              <div className="u-pgm-popup-aksi">
                <Button variant="outline" onClick={tutupPopup}>
                  Tutup
                </Button>
                {popup.tautan && (
                  <Button render={<a href={popup.tautan} target={/^https?:/.test(popup.tautan) ? '_blank' : undefined} rel="noreferrer" />} onClick={tutupPopup}>
                    {popup.teks_tautan ?? 'Selengkapnya'}
                  </Button>
                )}
              </div>
            }>
              <IsiPopupPengumuman p={popup} />
            </Dialog>
          )}
          {kanan.length > 0 && (
            <div className="u-pgm-toast-daftar" aria-live="polite">
              {kanan.slice(0, 3).map((p) => (
                <ToastPengumuman key={p.id} p={p} onTutup={() => (p.dapat_ditutup ? tutup(p) : setSembunyi((s) => new Set(s).add(p.id)))} />
              ))}
            </div>
          )}
          {bawah.length > 0 && (
            <div className="u-pgm-bawah-wadah">
              <ToastPengumuman bawah p={bawah[0]!} onTutup={() => (bawah[0]!.dapat_ditutup ? tutup(bawah[0]!) : setSembunyi((s) => new Set(s).add(bawah[0]!.id)))} />
            </div>
          )}
        </>
      )}
    </>
  );
}

/** Pratinjau satu pengumuman dalam mode tertentu (untuk formulir). */
export function PratinjauPengumuman({ p }: { p: PengumumanTayang }) {
  return (
    <div className="u-pgm-pratinjau" data-mode={p.mode} aria-label={`Pratinjau ${p.mode}`}>
      <div className="u-pgm-pratinjau-layar">
        {p.mode === 'pita' && (
          <PitaPengumuman interval={0} items={[{ id: 'x', title: p.judul || 'Judul pengumuman', detail: p.isi ?? undefined, href: p.tautan || undefined, cta: p.teks_tautan ?? undefined, priority: nadaKePita(p.nada), dapatDitutup: p.dapat_ditutup }]} onTutupItem={() => {}} />
        )}
        <div className="u-pgm-pratinjau-kepala">
          <i />
          <i />
          <i />
        </div>
        <div className="u-pgm-pratinjau-isi">
          {p.mode === 'banner' && <BannerPengumuman p={{ ...p, judul: p.judul || 'Judul pengumuman' }} onTutup={() => {}} />}
          <i className="u-pgm-pratinjau-baris" />
          <i className="u-pgm-pratinjau-baris" />
          <i className="u-pgm-pratinjau-baris" data-pendek="" />
        </div>
        {p.mode === 'popup' && (
          <div className="u-pgm-pratinjau-lapis">
            <div className="u-pgm-pratinjau-dialog">
              <strong>{p.judul || 'Judul pengumuman'}</strong>
              <IsiPopupPengumuman p={p} />
              <div className="u-pgm-popup-aksi">
                <span className="u-pgm-pratinjau-tombol">Tutup</span>
                {p.tautan && <span className="u-pgm-pratinjau-tombol" data-utama="">{p.teks_tautan || 'Selengkapnya'}</span>}
              </div>
            </div>
          </div>
        )}
        {p.mode === 'toast' && (
          <div className="u-pgm-pratinjau-toast">
            <ToastPengumuman p={{ ...p, judul: p.judul || 'Judul pengumuman' }} onTutup={() => {}} />
          </div>
        )}
        {p.mode === 'bawah' && (
          <div className="u-pgm-pratinjau-bawah">
            <ToastPengumuman bawah p={{ ...p, judul: p.judul || 'Judul pengumuman' }} onTutup={() => {}} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- formulir

interface HakPengumuman {
  semua: boolean;
  publik: boolean;
  unit: Array<{ id: number; kode: string; nama: string }> | null;
}

type Draf = Omit<PengumumanKelola, 'id' | 'tayang' | 'dibuat_oleh' | 'dibuat_at' | 'unit_pemilik'> & { id?: string };

const DRAF_KOSONG: Draf = {
  judul: '',
  isi: '',
  tautan: '',
  teks_tautan: '',
  nada: 'info',
  mode: 'pita',
  gambar: '',
  opsi: {},
  prioritas: 0,
  dapat_ditutup: true,
  mulai: null,
  selesai: null,
  status: 'terbit',
  aplikasi: null,
  jenis: null,
  unit: null,
  peran: null,
};

const keInputWaktu = (v?: string | null) => (v ? v.replace(' ', 'T').slice(0, 16) : '');
const dariInputWaktu = (v: string) => (v ? `${v.replace('T', ' ')}:00` : null);

export interface FormPengumumanProps {
  /** Pengumuman yang diubah; kosong = buat baru. */
  awal?: PengumumanKelola | null;
  /** Sasaran aplikasi bawaan untuk pengumuman baru (mis. aplikasi tempat formulir dibuka). */
  aplikasiBawaan?: string[] | null;
  onSelesai?: (p: PengumumanKelola) => void;
  onBatal?: () => void;
}

/**
 * Formulir pengumuman dengan pratinjau langsung: isi, cara tampil (pita, banner, popup, toast, bilah bawah), nada,
 * jadwal, dan sasaran (aplikasi, jenis pengguna, unit, peran) beserta perkiraan jumlah penerima.
 */
export function FormPengumuman({ awal, aplikasiBawaan, onSelesai, onBatal }: FormPengumumanProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const hak = useSiakadQuery<HakPengumuman>(['notif-pita-hak'], (s, signal) => s.request<HakPengumuman>({ method: 'GET', path: '/v1/notif/pita/hak' }, { signal }));
  const peranQ = useSiakadQuery<Array<{ kode: string; nama: string; aktif?: boolean }>>(['rbac-peran-pilih'], (s, signal) => s.request({ method: 'GET', path: '/v1/rbac/peran' }, { signal, maxRetries: 0 }), { staleTime: 600_000 });
  const [d, setD] = React.useState<Draf>(() => (awal ? { ...awal, isi: awal.isi ?? '', tautan: awal.tautan ?? '', teks_tautan: awal.teks_tautan ?? '', gambar: awal.gambar ?? '' } : { ...DRAF_KOSONG, aplikasi: aplikasiBawaan ?? null }));
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [proses, setProses] = React.useState(false);
  const [unitBaru, setUnitBaru] = React.useState<string | number | null>(null);
  const [perkiraan, setPerkiraan] = React.useState<{ jumlah: number | null; keterangan: string } | null>(null);
  const ubah = <K extends keyof Draf>(k: K, v: Draf[K]) => setD((x) => ({ ...x, [k]: v }));

  const sasaranKunci = JSON.stringify([d.jenis, d.unit, d.peran]);
  React.useEffect(() => {
    const t = setTimeout(() => {
      siakad
        .request<{ jumlah: number | null; keterangan: string }>({ method: 'POST', path: '/v1/notif/pita/perkiraan', body: { jenis: d.jenis ?? [], unit: d.unit ?? [], peran: d.peran ?? [] } }, { maxRetries: 0 })
        .then((r) => setPerkiraan(r.data))
        .catch(() => setPerkiraan(null));
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sasaranKunci, siakad]);

  const simpan = async (status: Draf['status']) => {
    setProses(true);
    setGalat({});
    try {
      const body = { ...d, status, isi: d.isi || null, tautan: d.tautan || null, teks_tautan: d.teks_tautan || null, gambar: d.gambar || null };
      const r = await siakad.request<PengumumanKelola>({ method: 'POST', path: awal ? `/v1/notif/pita/kelola/${awal.id}` : '/v1/notif/pita/kelola', body });
      invalidateSiakad('notif-pita');
      invalidateSiakad('notif-pita-kelola');
      toast.add({ type: 'success', title: status === 'terbit' ? 'Pengumuman diterbitkan' : 'Draf disimpan' });
      onSelesai?.(r.data);
    } catch (e) {
      const det = (e as { details?: Record<string, string> }).details;
      if (det && typeof det === 'object') setGalat(det);
      toast.add({ type: 'error', title: 'Belum bisa disimpan', description: pesanGalat(e) });
    } finally {
      setProses(false);
    }
  };

  const unitTerbatas = hak.data && !hak.data.semua;
  const jenisOpsi = JENIS_SASARAN.filter((j) => j.value !== 'publik' || hak.data?.publik);
  const peranOpsi = (peranQ.data ?? []).filter((p) => p.aktif !== false).map((p) => ({ value: p.kode, label: p.nama }));
  const contoh: PengumumanTayang = { id: 'pratinjau', judul: d.judul, isi: d.isi, tautan: d.tautan, teks_tautan: d.teks_tautan, nada: d.nada, mode: d.mode, gambar: d.gambar, opsi: d.opsi, dapat_ditutup: d.dapat_ditutup };

  if (hak.error) return <GalatApi error={hak.error} onRetry={hak.refetch} />;

  return (
    <div className="u-pgm-form">
      <div className="u-pgm-form-kolom">
        <section className="u-pgm-bagian">
          <h4>Isi</h4>
          <Field label="Judul" error={galat.judul}>
            <Input value={d.judul} maxLength={200} onChange={(e) => ubah('judul', e.target.value)} placeholder="Mis. Pemeliharaan server SIAKAD Sabtu malam" />
          </Field>
          <Field label="Keterangan singkat" description="Opsional, maksimal 500 karakter." error={galat.isi}>
            <Textarea rows={2} maxLength={500} value={d.isi ?? ''} onChange={(e) => ubah('isi', e.target.value)} />
          </Field>
          <div className="u-pgm-dua">
            <Field label="Tautan Selengkapnya" error={galat.tautan}>
              <Input value={d.tautan ?? ''} onChange={(e) => ubah('tautan', e.target.value)} placeholder="https://… atau /halaman" />
            </Field>
            <Field label="Teks tautan">
              <Input value={d.teks_tautan ?? ''} maxLength={60} onChange={(e) => ubah('teks_tautan', e.target.value)} placeholder="Selengkapnya" />
            </Field>
          </div>
        </section>

        <section className="u-pgm-bagian">
          <h4>Tampilan</h4>
          <Field label="Cara tampil">
            <div className="u-pgm-mode" role="radiogroup" aria-label="Cara tampil">
              {PILIHAN_MODE.map((m) => (
                <button key={m.value} type="button" role="radio" aria-checked={d.mode === m.value} className="u-pgm-mode-pil" data-aktif={d.mode === m.value ? '' : undefined} onClick={() => ubah('mode', m.value)}>
                  {m.ikon}
                  <strong>{m.label}</strong>
                  <small>{m.keterangan}</small>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Nada">
            <SegmentedControl fullWidth value={d.nada} onValueChange={(v) => ubah('nada', v as NadaPengumuman)} options={PILIHAN_NADA} aria-label="Nada" />
          </Field>
          {(d.mode === 'banner' || d.mode === 'popup') && (
            <Field label="Gambar" description="URL gambar (opsional), mis. dari Kelola berkas atau media portal." error={galat.gambar}>
              <Input value={d.gambar ?? ''} onChange={(e) => ubah('gambar', e.target.value)} placeholder="https://…" />
            </Field>
          )}
          {d.mode === 'popup' && (
            <Field label="Tampilkan popup">
              <SegmentedControl
                fullWidth
                value={d.opsi?.ulang ?? 'sekali'}
                onValueChange={(v) => ubah('opsi', { ...d.opsi, ulang: v as 'sekali' | 'sesi' })}
                options={[
                  { value: 'sekali', label: 'Sekali per akun' },
                  { value: 'sesi', label: 'Setiap membuka aplikasi' },
                ]}
                aria-label="Ulang popup"
              />
            </Field>
          )}
          {d.mode === 'toast' && (
            <Field label="Hilang otomatis" description="Detik; 0 = tetap sampai ditutup.">
              <Input type="number" min={0} max={120} value={d.opsi?.hilang_detik ?? 0} onChange={(e) => ubah('opsi', { ...d.opsi, hilang_detik: Number(e.target.value) || undefined })} />
            </Field>
          )}
          <label className="u-pgm-saklar">
            <span>
              <strong>Bisa ditutup pengguna</strong>
              <small>Pengumuman yang ditutup tidak tampil lagi untuk akun itu di semua aplikasi.</small>
            </span>
            <Switch checked={d.dapat_ditutup} onCheckedChange={(v) => ubah('dapat_ditutup', v)} />
          </label>
        </section>

        <section className="u-pgm-bagian">
          <h4>Sasaran</h4>
          <Field label="Aplikasi" description="Kosong = semua aplikasi, termasuk SIAKAD lama.">
            <PilihanBanyak options={APLIKASI_PENGUMUMAN} value={d.aplikasi ?? []} onValueChange={(v) => ubah('aplikasi', v.length ? v : null)} placeholder="Semua aplikasi" aria-label="Aplikasi sasaran" />
          </Field>
          <Field
            label="Jenis pengguna"
            description={
              unitTerbatas
                ? 'Kosong = semua pengguna yang masuk di unit sasaran. Publik: hanya tampil di situs portal unit Anda (bukan portal universitas atau situs unit lain).'
                : 'Kosong = semua pengguna yang masuk. Publik: tampil di portal universitas dan semua situs.'
            }
            error={galat.jenis}
          >
            <CheckboxGroup orientation="horizontal" options={jenisOpsi} value={d.jenis ?? []} onValueChange={(v) => ubah('jenis', v.length ? (v as JenisSasaran[]) : null)} />
          </Field>
          <Field label="Unit" description={unitTerbatas ? `Anda hanya bisa menyasar unit Anda: ${(hak.data?.unit ?? []).map((u) => u.nama).join(', ')} (dan unit di bawahnya).` : 'Kosong = semua unit. Unit mencakup unit di bawahnya (fakultas → prodi).'} error={galat.unit}>
            <div className="u-pgm-unit">
              {(d.unit ?? []).map((u) => (
                <span key={u} className="u-pgm-chip">
                  {u}
                  <button type="button" aria-label={`Hapus ${u}`} onClick={() => ubah('unit', (d.unit ?? []).filter((x) => x !== u).length ? (d.unit ?? []).filter((x) => x !== u) : null)}>
                    <X />
                  </button>
                </span>
              ))}
              <PilihEntitas
                jenis="unit"
                value={unitBaru}
                onValueChange={(v) => {
                  setUnitBaru(null);
                  if (v == null) return;
                  const k = String(v);
                  ubah('unit', [...new Set([...(d.unit ?? []), k])]);
                }}
                placeholder="Tambah unit"
              />
            </div>
          </Field>
          {peranOpsi.length > 0 && (
            <Field label="Peran" description="Kosong = semua peran.">
              <PilihanBanyak options={peranOpsi} value={d.peran ?? []} onValueChange={(v) => ubah('peran', v.length ? v : null)} placeholder="Semua peran" aria-label="Peran sasaran" />
            </Field>
          )}
          {perkiraan && (
            <p className="u-pgm-perkiraan">
              <Eye aria-hidden /> {perkiraan.jumlah == null ? perkiraan.keterangan : `Sekitar ${perkiraan.jumlah.toLocaleString('id-ID')} akun cocok dengan sasaran ini.`}
            </p>
          )}
        </section>

        <section className="u-pgm-bagian">
          <h4>Jadwal</h4>
          <div className="u-pgm-dua">
            <Field label="Mulai tayang" description="Kosong = sekarang." error={galat.mulai}>
              <Input type="datetime-local" value={keInputWaktu(d.mulai)} onChange={(e) => ubah('mulai', dariInputWaktu(e.target.value))} />
            </Field>
            <Field label="Selesai" description="Kosong = sampai diarsipkan." error={galat.selesai}>
              <Input type="datetime-local" value={keInputWaktu(d.selesai)} onChange={(e) => ubah('selesai', dariInputWaktu(e.target.value))} />
            </Field>
          </div>
          <Field label="Prioritas" description="Lebih tinggi tampil lebih dulu (pita berganti, popup antre).">
            <Select value={String(d.prioritas ?? 0)} onValueChange={(v) => v != null && ubah('prioritas', Number(v))} options={[{ value: '0', label: 'Normal' }, { value: '10', label: 'Tinggi' }, { value: '50', label: 'Paling atas' }]} aria-label="Prioritas" />
          </Field>
        </section>
      </div>

      <aside className="u-pgm-form-pratinjau">
        <span className="u-label">Pratinjau</span>
        <PratinjauPengumuman p={contoh} />
        <div className="u-pgm-form-aksi">
          {onBatal && (
            <Button variant="ghost" onClick={onBatal} disabled={proses}>
              Batal
            </Button>
          )}
          <Button variant="outline" onClick={() => void simpan('draf')} loading={proses} disabled={!d.judul.trim()}>
            Simpan draf
          </Button>
          <Button onClick={() => void simpan('terbit')} loading={proses} disabled={!d.judul.trim()}>
            <BellRing /> Terbitkan
          </Button>
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- halaman kelola

const LABEL_TAYANG: Record<PengumumanKelola['tayang'], { label: string; variant: 'success' | 'info' | 'neutral' | 'warning' }> = {
  aktif: { label: 'Aktif', variant: 'success' },
  terjadwal: { label: 'Terjadwal', variant: 'info' },
  berakhir: { label: 'Berakhir', variant: 'neutral' },
  draf: { label: 'Draf', variant: 'warning' },
  arsip: { label: 'Arsip', variant: 'neutral' },
};

function ringkasSasaran(p: PengumumanKelola): string {
  const app = p.aplikasi ? p.aplikasi.map((a) => APLIKASI_PENGUMUMAN.find((x) => x.value === a)?.label ?? a).join(', ') : 'Semua aplikasi';
  const jenis = p.jenis ? p.jenis.map((j) => JENIS_SASARAN.find((x) => x.value === j)?.label ?? j).join(', ') : 'semua pengguna';
  return [app, jenis, p.unit ? `unit ${p.unit.join(', ')}` : null, p.peran ? `peran ${p.peran.join(', ')}` : null].filter(Boolean).join(' · ');
}

const waktuSingkat = (v?: string | null) => (v ? new Date(v.replace(' ', 'T')).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null);

export interface KelolaPengumumanProps {
  /** Aplikasi tempat halaman dibuka (sasaran bawaan pengumuman baru). Kosong = semua aplikasi. */
  aplikasi?: string;
  className?: string;
}

/**
 * Halaman kelola pengumuman lintas aplikasi: daftar dengan status tayang (aktif, terjadwal, berakhir, draf, arsip),
 * buat/ubah lewat FormPengumuman dengan pratinjau, arsipkan, dan hapus. Hak mengikuti /v1/notif/pita/hak.
 */
export function KelolaPengumuman({ aplikasi, className }: KelolaPengumumanProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useSiakadQuery<PengumumanKelola[]>(['notif-pita-kelola'], (s, signal) => s.request<PengumumanKelola[]>({ method: 'GET', path: '/v1/notif/pita/kelola' }, { signal }));
  const [saring, setSaring] = React.useState<'semua' | PengumumanKelola['tayang']>('semua');
  const [edit, setEdit] = React.useState<PengumumanKelola | 'baru' | null>(null);
  const [hapus, setHapus] = React.useState<PengumumanKelola | null>(null);
  const data = q.data ?? [];
  const tampil = saring === 'semua' ? data : data.filter((p) => p.tayang === saring);
  const hitung = (t: PengumumanKelola['tayang']) => data.filter((p) => p.tayang === t).length;

  const arsipkan = async (p: PengumumanKelola) => {
    try {
      await siakad.request({ method: 'POST', path: `/v1/notif/pita/kelola/${p.id}`, body: { status: p.status === 'arsip' ? 'terbit' : 'arsip' } });
      invalidateSiakad('notif-pita');
      invalidateSiakad('notif-pita-kelola');
    } catch (e) {
      toast.add({ type: 'error', title: 'Gagal', description: pesanGalat(e) });
    }
  };

  return (
    <div className={cn('u-pgm-kelola', className)}>
      <div className="u-pgm-kelola-alat">
        <SegmentedControl
          value={saring}
          onValueChange={(v) => setSaring(v as typeof saring)}
          options={[
            { value: 'semua', label: `Semua (${data.length})` },
            { value: 'aktif', label: `Aktif (${hitung('aktif')})` },
            { value: 'terjadwal', label: `Terjadwal (${hitung('terjadwal')})` },
            { value: 'draf', label: `Draf (${hitung('draf')})` },
            { value: 'berakhir', label: `Berakhir (${hitung('berakhir')})` },
          ]}
          aria-label="Saring status"
        />
        <Button onClick={() => setEdit('baru')}>
          <Plus /> Buat pengumuman
        </Button>
      </div>
      {q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : q.loading && !q.data ? (
        <div className="u-pgm-daftar">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={72} />
          ))}
        </div>
      ) : tampil.length === 0 ? (
        <Empty icon={<Megaphone />} title={data.length ? 'Tidak ada pengumuman di status ini' : 'Belum ada pengumuman'} description="Pengumuman tampil di aplikasi sasaran sebagai pita, banner, popup, toast, atau bilah bawah." actions={<Button onClick={() => setEdit("baru")}><Plus /> Buat pengumuman</Button>} />
      ) : (
        <div className="u-pgm-daftar">
          {tampil.map((p) => {
            const t = LABEL_TAYANG[p.tayang];
            const mode = PILIHAN_MODE.find((m) => m.value === p.mode);
            return (
              <Card key={p.id} className="u-pgm-baris" data-nada={p.nada}>
                <span className="u-pgm-ikon" aria-hidden>
                  {IKON_NADA[p.nada]}
                </span>
                <div className="u-pgm-baris-teks">
                  <strong>{p.judul}</strong>
                  <small>{ringkasSasaran(p)}</small>
                  <small className="u-pgm-baris-waktu">
                    <CalendarClock aria-hidden /> {waktuSingkat(p.mulai) ?? 'Sejak diterbitkan'} – {waktuSingkat(p.selesai) ?? 'tanpa batas'}
                  </small>
                </div>
                <div className="u-pgm-baris-lencana">
                  <Badge variant="neutral">
                    {mode?.ikon} {mode?.label}
                  </Badge>
                  <Badge variant={t.variant}>{t.label}</Badge>
                </div>
                <div className="u-pgm-baris-aksi">
                  <Tooltip content="Ubah">
                    <Button size="sm" variant="ghost" iconOnly aria-label={`Ubah ${p.judul}`} onClick={() => setEdit(p)}>
                      <Pencil />
                    </Button>
                  </Tooltip>
                  <Tooltip content={p.status === 'arsip' ? 'Terbitkan lagi' : 'Arsipkan'}>
                    <Button size="sm" variant="ghost" iconOnly aria-label={p.status === 'arsip' ? 'Terbitkan lagi' : 'Arsipkan'} onClick={() => void arsipkan(p)}>
                      <Archive />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Hapus">
                    <Button size="sm" variant="ghost" iconOnly aria-label={`Hapus ${p.judul}`} onClick={() => setHapus(p)}>
                      <Trash2 />
                    </Button>
                  </Tooltip>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <Dialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)} title={edit === 'baru' ? 'Buat pengumuman' : 'Ubah pengumuman'} size="xl" initialFocus={false}>
        {edit !== null && (
          <FormPengumuman
            key={edit === 'baru' ? 'baru' : edit.id}
            awal={edit === 'baru' ? null : edit}
            aplikasiBawaan={aplikasi ? [aplikasi] : null}
            onBatal={() => setEdit(null)}
            onSelesai={() => (setEdit(null), invalidateSiakad('notif-pita'), invalidateSiakad('notif-pita-kelola'))}
          />
        )}
      </Dialog>
      <ConfirmDialog
        open={Boolean(hapus)}
        onOpenChange={(o) => !o && setHapus(null)}
        title="Hapus pengumuman ini?"
        description="Pengumuman langsung hilang dari semua aplikasi. Untuk menyimpannya, arsipkan saja."
        confirmLabel="Hapus"
        tone="danger"
        onConfirm={async () => {
          if (!hapus) return;
          try {
            await siakad.request({ method: 'POST', path: `/v1/notif/pita/kelola/${hapus.id}/hapus`, body: {} });
            invalidateSiakad('notif-pita');
      invalidateSiakad('notif-pita-kelola');
          } catch (e) {
            toast.add({ type: 'error', title: 'Gagal menghapus', description: pesanGalat(e) });
          }
          setHapus(null);
        }}
      />
      {data.length > 0 && saring === 'semua' && hitung('aktif') === 0 && (
        <Alert variant="info">Tidak ada pengumuman yang sedang tayang.</Alert>
      )}
    </div>
  );
}
