'use client';
import * as React from 'react';
import type * as LeafletNs from 'leaflet';
import { Crosshair, LocateFixed, Minus, Plus } from 'lucide-react';
import { cn } from '../lib/cn';

/*
 * Peta (Leaflet + OpenStreetMap, tanpa kunci API). Leaflet dimuat saat komponen pertama kali tampil (import dinamis),
 * jadi halaman tanpa peta tidak ikut memuatnya dan aman untuk SSR. Penanda digambar sebagai lingkaran vektor
 * (tanpa gambar ikon), warnanya mengikuti token tema (--u-primary, --u-success, --u-warning, --u-danger).
 *
 * Ubin peta bawaan: tile.openstreetmap.org (wajib menampilkan atribusi; untuk lalu lintas besar pakai server ubin
 * sendiri lewat prop `ubin` atau <PetaProvider ubin={...}>).
 */

export type NadaPeta = 'utama' | 'sukses' | 'peringatan' | 'bahaya' | 'info' | 'netral';

export interface TitikPeta {
  id: string;
  lat: number;
  lng: number;
  /** Teks tooltip. */
  label?: string;
  /** Baris tambahan di popup. */
  keterangan?: string;
  nada?: NadaPeta;
}

export interface AreaPeta {
  id: string;
  lat: number;
  lng: number;
  radius_m: number;
  label?: string;
  keterangan?: string;
  nada?: NadaPeta;
  /** Garis putus-putus (mis. area nonaktif). */
  putus?: boolean;
}

export interface PosisiPeta {
  lat: number;
  lng: number;
  /** Akurasi (meter): digambar sebagai lingkaran samar. */
  akurasi_m?: number | null;
}

export interface UbinPeta {
  url: string;
  atribusi: string;
  maksZoom?: number;
}

export const UBIN_OSM: UbinPeta = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  atribusi: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
  maksZoom: 19,
};

const UbinContext = React.createContext<UbinPeta>(UBIN_OSM);

/** Ganti server ubin untuk semua peta di dalamnya. */
export function PetaProvider({ ubin, children }: { ubin: UbinPeta; children: React.ReactNode }) {
  return <UbinContext.Provider value={ubin}>{children}</UbinContext.Provider>;
}

export interface PetaProps {
  /** Pusat awal bila tidak ada yang bisa dicakup. Bawaan: Pohuwato, Gorontalo. */
  pusat?: [number, number];
  zoom?: number;
  titik?: TitikPeta[];
  area?: AreaPeta[];
  posisi?: PosisiPeta | null;
  /** Geser/zoom otomatis supaya semua area, titik, dan posisi terlihat (bawaan true; dilakukan saat isinya berubah). */
  pasCakupan?: boolean;
  /** Klik peta (mis. memilih titik). */
  onKlik?: (lat: number, lng: number) => void;
  onPilihTitik?: (t: TitikPeta) => void;
  onPilihArea?: (a: AreaPeta) => void;
  /** Tampilkan tombol "posisi saya"; dipanggil saat ditekan. */
  onPosisiSaya?: () => void;
  /** Pilih titik dengan menyeret penanda tengah (tampil crosshair). */
  kursorPilih?: boolean;
  tinggi?: number | string;
  ubin?: UbinPeta;
  /** Nama peta untuk pembaca layar. */
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

const NADA_VAR: Record<NadaPeta, string> = {
  utama: '--u-primary',
  sukses: '--u-success',
  peringatan: '--u-warning',
  bahaya: '--u-danger',
  info: '--u-info',
  netral: '--u-muted-foreground',
};
const NADA_CADANGAN: Record<NadaPeta, string> = { utama: '#1d4ed8', sukses: '#16a34a', peringatan: '#d97706', bahaya: '#dc2626', info: '#0284c7', netral: '#64748b' };

function warna(el: HTMLElement | null, nada: NadaPeta = 'utama'): string {
  if (!el || typeof getComputedStyle === 'undefined') return NADA_CADANGAN[nada];
  const v = getComputedStyle(el).getPropertyValue(NADA_VAR[nada]).trim();
  return v || NADA_CADANGAN[nada];
}

let muatLeaflet: Promise<typeof LeafletNs> | null = null;
function leaflet(): Promise<typeof LeafletNs> {
  muatLeaflet ??= import('leaflet').then((m) => ((m as unknown as { default?: typeof LeafletNs }).default ?? m) as typeof LeafletNs);
  return muatLeaflet;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/**
 * Peta dasar: area (lingkaran radius), titik, dan posisi pengguna dengan lingkaran akurasi.
 * Dipakai presensi (area kampus + posisi), pemantauan sebaran presensi, dan pemilih lokasi.
 */
export function Peta({
  pusat = [0.4895, 121.9406],
  zoom = 15,
  titik,
  area,
  posisi,
  pasCakupan = true,
  onKlik,
  onPilihTitik,
  onPilihArea,
  onPosisiSaya,
  kursorPilih,
  tinggi = 320,
  ubin,
  label = 'Peta',
  className,
  children,
}: PetaProps) {
  const ubinBawaan = React.useContext(UbinContext);
  const pakaiUbin = ubin ?? ubinBawaan;
  const wadah = React.useRef<HTMLDivElement>(null);
  const kanvas = React.useRef<HTMLDivElement>(null);
  const peta = React.useRef<LeafletNs.Map | null>(null);
  const lapisan = React.useRef<LeafletNs.LayerGroup | null>(null);
  const L = React.useRef<typeof LeafletNs | null>(null);
  const [siap, setSiap] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const handler = React.useRef({ onKlik, onPilihTitik, onPilihArea });
  handler.current = { onKlik, onPilihTitik, onPilihArea };

  // Buat peta sekali.
  React.useEffect(() => {
    let batal = false;
    leaflet()
      .then((Lf) => {
        if (batal || !kanvas.current) return;
        L.current = Lf;
        const m = Lf.map(kanvas.current, { zoomControl: false, attributionControl: true }).setView(pusat, zoom);
        Lf.tileLayer(pakaiUbin.url, { attribution: pakaiUbin.atribusi, maxZoom: pakaiUbin.maksZoom ?? 19 }).addTo(m);
        m.attributionControl.setPrefix(false);
        lapisan.current = Lf.layerGroup().addTo(m);
        m.on('click', (e: LeafletNs.LeafletMouseEvent) => handler.current.onKlik?.(e.latlng.lat, e.latlng.lng));
        peta.current = m;
        setSiap(true);
      })
      .catch(() => setGalat('Peta tidak bisa dimuat.'));
    return () => {
      batal = true;
      peta.current?.remove();
      peta.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pakaiUbin.url]);

  // Ukuran wadah berubah (tab, panel) → hitung ulang.
  React.useEffect(() => {
    if (!siap || !wadah.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => peta.current?.invalidateSize());
    ro.observe(wadah.current);
    return () => ro.disconnect();
  }, [siap]);

  const kunciIsi = JSON.stringify([area?.map((a) => [a.id, a.lat, a.lng, a.radius_m, a.nada, a.putus, a.label]), titik?.map((t) => [t.id, t.lat, t.lng, t.nada, t.label]), posisi ? [posisi.lat, posisi.lng, posisi.akurasi_m] : null]);
  const kunciCakupan = JSON.stringify([area?.map((a) => a.id), titik?.length, !!posisi]);
  const sudahPas = React.useRef<string>('');

  React.useEffect(() => {
    const Lf = L.current;
    const m = peta.current;
    const g = lapisan.current;
    if (!siap || !Lf || !m || !g) return;
    g.clearLayers();
    const el = wadah.current;
    const batas: LeafletNs.LatLngExpression[] = [];
    for (const a of area ?? []) {
      const c = warna(el, a.nada ?? 'utama');
      const lingkaran = Lf.circle([a.lat, a.lng], { radius: a.radius_m, color: c, weight: 2, fillColor: c, fillOpacity: 0.12, dashArray: a.putus ? '6 6' : undefined });
      Lf.circleMarker([a.lat, a.lng], { radius: 4, color: c, weight: 2, fillColor: c, fillOpacity: 1 }).addTo(g);
      if (a.label) lingkaran.bindTooltip(esc(a.label), { direction: 'top' });
      if (a.keterangan || a.label) lingkaran.bindPopup(`<strong>${esc(a.label ?? '')}</strong>${a.keterangan ? `<br>${esc(a.keterangan)}` : ''}<br><span class="u-peta-kecil">Radius ${a.radius_m} m</span>`);
      lingkaran.on('click', () => handler.current.onPilihArea?.(a));
      lingkaran.addTo(g);
      const b = lingkaran.getBounds();
      batas.push(b.getNorthWest(), b.getSouthEast());
    }
    for (const t of titik ?? []) {
      const c = warna(el, t.nada ?? 'utama');
      const mk = Lf.circleMarker([t.lat, t.lng], { radius: 7, color: '#fff', weight: 2, fillColor: c, fillOpacity: 1 });
      if (t.label) mk.bindTooltip(esc(t.label), { direction: 'top' });
      if (t.keterangan) mk.bindPopup(`<strong>${esc(t.label ?? '')}</strong><br>${esc(t.keterangan)}`);
      mk.on('click', () => handler.current.onPilihTitik?.(t));
      mk.addTo(g);
      batas.push([t.lat, t.lng]);
    }
    if (posisi) {
      const c = warna(el, 'info');
      if (posisi.akurasi_m) Lf.circle([posisi.lat, posisi.lng], { radius: posisi.akurasi_m, color: c, weight: 1, fillColor: c, fillOpacity: 0.15, interactive: false }).addTo(g);
      Lf.circleMarker([posisi.lat, posisi.lng], { radius: 8, color: '#fff', weight: 3, fillColor: c, fillOpacity: 1, className: 'u-peta-posisi' })
        .bindTooltip(posisi.akurasi_m ? `Posisi Anda (±${Math.round(posisi.akurasi_m)} m)` : 'Posisi Anda', { direction: 'top' })
        .addTo(g);
      batas.push([posisi.lat, posisi.lng]);
    }
    if (pasCakupan && batas.length && sudahPas.current !== kunciCakupan) {
      sudahPas.current = kunciCakupan;
      if (batas.length === 1) m.setView(batas[0] as LeafletNs.LatLngExpression, Math.max(m.getZoom(), 16));
      else m.fitBounds(Lf.latLngBounds(batas as LeafletNs.LatLngTuple[]), { padding: [24, 24], maxZoom: 18 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siap, kunciIsi, pasCakupan]);

  return (
    <div ref={wadah} className={cn('u-peta', kursorPilih && 'u-peta--pilih', className)} style={{ height: tinggi }}>
      <div ref={kanvas} className="u-peta-kanvas" role="region" aria-label={label} />
      {!siap && !galat && <div className="u-peta-muat" aria-hidden>Memuat peta…</div>}
      {galat && <div className="u-peta-muat">{galat}</div>}
      {kursorPilih && siap && (
        <span className="u-peta-silang" aria-hidden>
          <Crosshair />
        </span>
      )}
      <div className="u-peta-kontrol">
        <button type="button" className="u-peta-tombol" aria-label="Perbesar" onClick={() => peta.current?.zoomIn()}>
          <Plus aria-hidden />
        </button>
        <button type="button" className="u-peta-tombol" aria-label="Perkecil" onClick={() => peta.current?.zoomOut()}>
          <Minus aria-hidden />
        </button>
        {onPosisiSaya && (
          <button type="button" className="u-peta-tombol" aria-label="Ke posisi saya" title="Ke posisi saya" onClick={onPosisiSaya}>
            <LocateFixed aria-hidden />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ================================================================ Lokasi perangkat

export interface HasilLokasi extends PosisiPeta {
  akurasi_m: number;
  /** Waktu fix (ms). */
  waktu: number;
}

export interface UseLokasiOpsi {
  /** Pantau terus (watchPosition). Bawaan false: sekali ambil. */
  pantau?: boolean;
  aktif?: boolean;
  batasMs?: number;
}

/** Posisi perangkat dengan akurasi tinggi; `muatUlang()` untuk mengambil lagi. */
export function useLokasiPerangkat({ pantau = false, aktif = true, batasMs = 15000 }: UseLokasiOpsi = {}) {
  const [posisi, setPosisi] = React.useState<HasilLokasi | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [memuat, setMemuat] = React.useState(false);
  const [putaran, setPutaran] = React.useState(0);
  React.useEffect(() => {
    if (!aktif) return;
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGalat('Perangkat ini tidak mendukung lokasi.');
      return;
    }
    setMemuat(true);
    setGalat(null);
    const ok = (p: GeolocationPosition) => {
      setPosisi({ lat: p.coords.latitude, lng: p.coords.longitude, akurasi_m: p.coords.accuracy, waktu: p.timestamp });
      setMemuat(false);
    };
    const gagal = (e: GeolocationPositionError) => {
      setGalat(e.code === e.PERMISSION_DENIED ? 'Izin lokasi ditolak. Izinkan akses lokasi di pengaturan browser/perangkat.' : e.code === e.TIMEOUT ? 'Lokasi belum didapat. Pastikan GPS aktif lalu coba lagi.' : 'Lokasi tidak tersedia.');
      setMemuat(false);
    };
    const opsi: PositionOptions = { enableHighAccuracy: true, timeout: batasMs, maximumAge: 0 };
    if (pantau) {
      const id = navigator.geolocation.watchPosition(ok, gagal, opsi);
      return () => navigator.geolocation.clearWatch(id);
    }
    navigator.geolocation.getCurrentPosition(ok, gagal, opsi);
    return undefined;
  }, [aktif, pantau, batasMs, putaran]);
  return { posisi, galat, memuat, muatUlang: () => setPutaran((x) => x + 1) };
}

/** Jarak dua titik (meter, haversine; sama dengan server). */
export function jarakMeterPeta(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lng2 - lng1) * r) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ================================================================ Pemilih lokasi

export interface NilaiTitikArea {
  lat: number | null;
  lng: number | null;
  radius_m: number;
}

export interface PilihTitikPetaProps {
  value: NilaiTitikArea;
  onChange: (v: NilaiTitikArea) => void;
  /** Area lain sebagai rujukan (abu-abu). */
  areaLain?: AreaPeta[];
  /** Tampilkan isian radius (geser). */
  denganRadius?: boolean;
  radiusMin?: number;
  radiusMaks?: number;
  tinggi?: number | string;
  className?: string;
}

/**
 * Isian lokasi untuk formulir: klik peta untuk memindahkan titik, geser radius, "pakai lokasi saya", atau ketik koordinat
 * (bisa ditempel dari Google Maps "lat, lng").
 */
export function PilihTitikPeta({ value, onChange, areaLain, denganRadius = true, radiusMin = 10, radiusMaks = 1000, tinggi = 300, className }: PilihTitikPetaProps) {
  const [teks, setTeks] = React.useState(value.lat != null && value.lng != null ? `${value.lat}, ${value.lng}` : '');
  const [cari, setCari] = React.useState(false);
  const lokasi = useLokasiPerangkat({ aktif: cari });
  React.useEffect(() => {
    setTeks(value.lat != null && value.lng != null ? `${value.lat}, ${value.lng}` : '');
  }, [value.lat, value.lng]);
  React.useEffect(() => {
    if (cari && lokasi.posisi) {
      onChange({ ...value, lat: +lokasi.posisi.lat.toFixed(7), lng: +lokasi.posisi.lng.toFixed(7) });
      setCari(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cari, lokasi.posisi]);
  const ada = value.lat != null && value.lng != null;
  const set = (lat: number, lng: number) => onChange({ ...value, lat: +lat.toFixed(7), lng: +lng.toFixed(7) });
  return (
    <div className={cn('u-peta-pilih', className)}>
      <Peta
        tinggi={tinggi}
        kursorPilih={!ada}
        label="Pilih lokasi di peta"
        area={[...(areaLain ?? []).map((a) => ({ ...a, nada: 'netral' as const, putus: true })), ...(ada ? [{ id: '__pilih', lat: value.lat as number, lng: value.lng as number, radius_m: value.radius_m, label: 'Lokasi dipilih', nada: 'utama' as const }] : [])]}
        onKlik={set}
        onPosisiSaya={() => {
          setCari(true);
          lokasi.muatUlang();
        }}
      />
      <div className="u-peta-pilih-isian">
        <label className="u-peta-pilih-koordinat">
          <span>Koordinat</span>
          <input
            className="u-input"
            value={teks}
            inputMode="decimal"
            placeholder="0.4895, 121.9406"
            onChange={(e) => setTeks(e.target.value)}
            onBlur={() => {
              const m = teks.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,; ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
              if (m && Math.abs(+m[1]) <= 90 && Math.abs(+m[2]) <= 180) set(+m[1], +m[2]);
              else if (!teks.trim()) onChange({ ...value, lat: null, lng: null });
            }}
          />
        </label>
        {denganRadius && (
          <label className="u-peta-pilih-radius">
            <span>
              Radius <strong>{value.radius_m} m</strong>
            </span>
            <input type="range" min={radiusMin} max={radiusMaks} step={5} value={value.radius_m} onChange={(e) => onChange({ ...value, radius_m: +e.target.value })} aria-label="Radius (meter)" />
          </label>
        )}
      </div>
      <p className="u-peta-pilih-bantuan">
        {lokasi.galat && cari ? lokasi.galat : ada ? 'Klik peta untuk memindahkan titik. Tombol lokasi memakai posisi perangkat Anda.' : 'Klik peta di titik pusat area, atau tekan tombol lokasi bila Anda sedang berada di sana.'}
      </p>
    </div>
  );
}
