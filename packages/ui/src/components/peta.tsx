'use client';
import * as React from 'react';
import { Crosshair, LocateFixed, Minus, Plus, Undo2, X } from 'lucide-react';
import type * as LeafletNS from 'leaflet';
import { cn } from '../lib/cn';
import { Button } from './actions';
import { Field, Input, SegmentedControl } from './forms';

/*
 * Peta interaktif berbasis Leaflet + OpenStreetMap (tanpa kunci API). Leaflet dimuat dinamis di browser, jadi aman
 * untuk SSR (Next.js). Warna area/penanda mengikuti token tema (CSS), termasuk mode gelap.
 *
 *   <Peta area={[{ id: 'k1', lat, lng, radius_m: 150, label: 'Kampus 1' }]} posisi={{ lat, lng, akurasi: 12 }} />
 *   <PilihLokasiPeta value={titik} onChange={setTitik} radius={150} onRadiusChange={setRadius} />
 */

export type WarnaPeta = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

export interface TitikPeta {
  lat: number;
  lng: number;
}

export interface PenandaPeta extends TitikPeta {
  id: string;
  warna?: WarnaPeta;
  /** Teks singkat saat disorot (tooltip). */
  label?: string;
  /** Isi popup saat diklik (teks biasa; baris baru dipertahankan). */
  keterangan?: string;
}

export interface AreaPeta extends TitikPeta {
  id: string;
  /** Radius lingkaran (meter). Diabaikan bila `poligon` diisi. */
  radius_m?: number;
  /** [[lat, lng], ...] minimal 3 titik. */
  poligon?: Array<[number, number]> | null;
  warna?: WarnaPeta;
  label?: string;
}

export interface PosisiPeta extends TitikPeta {
  /** Akurasi GPS (meter), digambar sebagai lingkaran samar. */
  akurasi?: number | null;
}

export interface UbinPeta {
  url: string;
  atribusi: string;
  maxZoom?: number;
}

/** Ubin bawaan OpenStreetMap. Untuk lalu lintas besar, pakai server ubin sendiri/penyedia lain lewat prop `ubin`. */
export const UBIN_OSM: UbinPeta = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  atribusi: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
  maxZoom: 19,
};

export interface PetaProps {
  /** Pusat awal bila tidak ada isi yang bisa dijadikan batas tampilan. */
  pusat?: TitikPeta;
  zoom?: number;
  /** Tinggi peta (px atau nilai CSS). Bawaan 320. */
  tinggi?: number | string;
  area?: AreaPeta[];
  penanda?: PenandaPeta[];
  /** Posisi pengguna (titik biru + lingkaran akurasi). */
  posisi?: PosisiPeta | null;
  /** Garis/poligon sementara (mis. saat menggambar). */
  draf?: Array<[number, number]> | null;
  /** Penanda yang bisa digeser (mis. memilih titik). */
  geser?: TitikPeta | null;
  onGeser?: (t: TitikPeta) => void;
  onKlik?: (t: TitikPeta) => void;
  onPilihPenanda?: (id: string) => void;
  /** Sesuaikan tampilan ke semua isi saat isi berubah (bawaan true). */
  sesuaikan?: boolean;
  /** Kunci yang bila berubah memaksa penyesuaian ulang tampilan. */
  kunciTampilan?: string | number;
  ubin?: UbinPeta;
  /** Gulir roda tetikus untuk zoom (bawaan false agar halaman tetap bisa digulir). */
  zoomGulir?: boolean;
  /** Kontrol tambahan di pojok kanan atas peta. */
  kontrol?: React.ReactNode;
  className?: string;
  'aria-label'?: string;
}

type L = typeof LeafletNS;

const PUSAT_BAWAAN: TitikPeta = { lat: -0.789, lng: 113.921 }; // Indonesia

function ikonPin(L: L, warna: WarnaPeta, kelas = 'u-peta-pin'): LeafletNS.DivIcon {
  return L.divIcon({ className: 'u-peta-ikon', html: `<span class="${kelas}" data-warna="${warna}"></span>`, iconSize: [22, 22], iconAnchor: [11, 11], tooltipAnchor: [12, 0], popupAnchor: [0, -10] });
}

/** Peta Leaflet + OpenStreetMap dengan area (radius/poligon), penanda, dan posisi pengguna. */
export function Peta({
  pusat,
  zoom = 16,
  tinggi = 320,
  area,
  penanda,
  posisi,
  draf,
  geser,
  onGeser,
  onKlik,
  onPilihPenanda,
  sesuaikan = true,
  kunciTampilan,
  ubin = UBIN_OSM,
  zoomGulir = false,
  kontrol,
  className,
  'aria-label': ariaLabel = 'Peta',
}: PetaProps) {
  const elRef = React.useRef<HTMLDivElement>(null);
  const [siap, setSiap] = React.useState<{ L: L; map: LeafletNS.Map } | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const lapisRef = React.useRef<LeafletNS.LayerGroup | null>(null);
  const geserRef = React.useRef<LeafletNS.Marker | null>(null);
  const cb = React.useRef({ onKlik, onGeser, onPilihPenanda });
  cb.current = { onKlik, onGeser, onPilihPenanda };

  // Buat peta sekali.
  React.useEffect(() => {
    let batal = false;
    let map: LeafletNS.Map | null = null;
    import('leaflet')
      .then((mod) => {
        const L = ((mod as unknown as { default?: L }).default ?? mod) as L;
        if (batal || !elRef.current) return;
        map = L.map(elRef.current, { zoomControl: false, scrollWheelZoom: zoomGulir, attributionControl: true }).setView([pusat?.lat ?? PUSAT_BAWAAN.lat, pusat?.lng ?? PUSAT_BAWAAN.lng], pusat ? zoom : 5);
        L.tileLayer(ubin.url, { attribution: ubin.atribusi, maxZoom: ubin.maxZoom ?? 19 }).addTo(map);
        L.control.zoom({ position: 'bottomright', zoomInTitle: 'Perbesar', zoomOutTitle: 'Perkecil' }).addTo(map);
        map.attributionControl.setPrefix(false);
        map.on('click', (e: LeafletNS.LeafletMouseEvent) => cb.current.onKlik?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
        lapisRef.current = L.layerGroup().addTo(map);
        setSiap({ L, map });
      })
      .catch(() => setGalat('Peta tidak bisa dimuat.'));
    return () => {
      batal = true;
      map?.remove();
      lapisRef.current = null;
      geserRef.current = null;
      setSiap(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ubin.url]);

  // Ukuran wadah berubah (tab, panel) → minta Leaflet menghitung ulang.
  React.useEffect(() => {
    if (!siap || !elRef.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => siap.map.invalidateSize());
    ro.observe(elRef.current);
    return () => ro.disconnect();
  }, [siap]);

  // Gambar ulang isi.
  const sidikIsi = JSON.stringify([area, penanda, posisi, draf]);
  React.useEffect(() => {
    if (!siap || !lapisRef.current) return;
    const { L } = siap;
    const g = lapisRef.current;
    g.clearLayers();
    for (const a of area ?? []) {
      const kelas = `u-peta-area u-peta-area--${a.warna ?? 'primary'}`;
      const bentuk = a.poligon && a.poligon.length >= 3 ? L.polygon(a.poligon, { className: kelas, weight: 2 }) : L.circle([a.lat, a.lng], { radius: a.radius_m ?? 50, className: kelas, weight: 2 });
      if (a.label) bentuk.bindTooltip(a.label, { sticky: true, className: 'u-peta-tooltip' });
      bentuk.addTo(g);
      L.marker([a.lat, a.lng], { icon: ikonPin(L, a.warna ?? 'primary', 'u-peta-pusat'), interactive: false, keyboard: false }).addTo(g);
    }
    for (const p of penanda ?? []) {
      const m = L.marker([p.lat, p.lng], { icon: ikonPin(L, p.warna ?? 'primary'), title: p.label, alt: p.label, keyboard: true });
      if (p.label) m.bindTooltip(p.label, { direction: 'right', className: 'u-peta-tooltip' });
      if (p.keterangan) {
        const isi = document.createElement('div');
        isi.className = 'u-peta-popup';
        isi.textContent = p.keterangan;
        m.bindPopup(isi);
      }
      m.on('click', () => cb.current.onPilihPenanda?.(p.id));
      m.addTo(g);
    }
    if (draf && draf.length > 0) {
      L.polyline(draf.length >= 3 ? [...draf, draf[0]!] : draf, { className: 'u-peta-draf', weight: 2, dashArray: '6 6' }).addTo(g);
      draf.forEach((t) => L.marker(t, { icon: ikonPin(L, 'warning', 'u-peta-simpul'), interactive: false }).addTo(g));
    }
    if (posisi) {
      if (posisi.akurasi) L.circle([posisi.lat, posisi.lng], { radius: posisi.akurasi, className: 'u-peta-akurasi', weight: 1, interactive: false }).addTo(g);
      L.marker([posisi.lat, posisi.lng], { icon: ikonPin(L, 'info', 'u-peta-saya'), title: 'Posisi Anda', zIndexOffset: 1000 }).bindTooltip('Posisi Anda', { className: 'u-peta-tooltip' }).addTo(g);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siap, sidikIsi]);

  // Penanda yang bisa digeser.
  React.useEffect(() => {
    if (!siap) return;
    const { L, map } = siap;
    if (!geser) {
      geserRef.current?.remove();
      geserRef.current = null;
      return;
    }
    if (!geserRef.current) {
      geserRef.current = L.marker([geser.lat, geser.lng], { draggable: true, icon: ikonPin(L, 'danger', 'u-peta-pin u-peta-pin--besar'), title: 'Geser untuk memindah titik', zIndexOffset: 900 }).addTo(map);
      geserRef.current.on('dragend', () => {
        const t = geserRef.current!.getLatLng();
        cb.current.onGeser?.({ lat: t.lat, lng: t.lng });
      });
    } else {
      geserRef.current.setLatLng([geser.lat, geser.lng]);
    }
  }, [siap, geser?.lat, geser?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sesuaikan tampilan ke isi.
  const sidikBatas = JSON.stringify([(area ?? []).map((a) => [a.lat, a.lng, a.radius_m, a.poligon?.length]), (penanda ?? []).length, !!posisi, kunciTampilan]);
  React.useEffect(() => {
    if (!siap || !sesuaikan) return;
    const { L, map } = siap;
    const titik: Array<[number, number]> = [];
    let batas: LeafletNS.LatLngBounds | null = null;
    const tambah = (b: LeafletNS.LatLngBounds) => (batas = batas ? batas.extend(b) : b);
    for (const a of area ?? []) {
      if (a.poligon && a.poligon.length >= 3) tambah(L.latLngBounds(a.poligon));
      else tambah(L.latLng(a.lat, a.lng).toBounds((a.radius_m ?? 50) * 2.2));
    }
    for (const p of penanda ?? []) titik.push([p.lat, p.lng]);
    if (posisi) titik.push([posisi.lat, posisi.lng]);
    if (geser) titik.push([geser.lat, geser.lng]);
    if (titik.length) tambah(L.latLngBounds(titik).pad(0.1));
    const b = batas as LeafletNS.LatLngBounds | null;
    if (b && b.isValid()) {
      const ne = b.getNorthEast();
      const sw = b.getSouthWest();
      if (ne.equals(sw)) map.setView(ne, zoom);
      else map.fitBounds(b, { padding: [24, 24], maxZoom: 18 });
    } else if (pusat) {
      map.setView([pusat.lat, pusat.lng], zoom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siap, sidikBatas]);

  return (
    <div className={cn('u-peta', className)} style={{ height: typeof tinggi === 'number' ? `${tinggi}px` : tinggi }}>
      <div ref={elRef} className="u-peta-kanvas" role="region" aria-label={ariaLabel} />
      {!siap && !galat && <div className="u-peta-muat" aria-hidden />}
      {galat && <div className="u-peta-galat">{galat}</div>}
      {kontrol && <div className="u-peta-kontrol">{kontrol}</div>}
    </div>
  );
}

/** Lokasi sekarang dari browser/perangkat dengan akurasi. Menolak dengan pesan berbahasa Indonesia. */
export function ambilPosisi(opsi: { batasMs?: number; akurasiTinggi?: boolean } = {}): Promise<PosisiPeta & { waktu: number }> {
  return new Promise((ok, gagal) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return gagal(new Error('Perangkat ini tidak mendukung lokasi.'));
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude, akurasi: Math.round(p.coords.accuracy), waktu: p.timestamp }),
      (e) => gagal(new Error(e.code === e.PERMISSION_DENIED ? 'Izin lokasi ditolak. Izinkan lokasi untuk situs ini di pengaturan browser.' : e.code === e.TIMEOUT ? 'Lokasi belum didapat. Coba lagi di tempat terbuka.' : 'Lokasi tidak tersedia. Nyalakan GPS lalu coba lagi.')),
      { enableHighAccuracy: opsi.akurasiTinggi ?? true, timeout: opsi.batasMs ?? 15_000, maximumAge: 0 },
    );
  });
}

/**
 * Pantau posisi terus-menerus (watchPosition) selama `aktif`. Mengembalikan posisi terbaru dan galatnya.
 */
export function usePosisi(aktif = true): { posisi: (PosisiPeta & { waktu: number }) | null; galat: string | null; muat: boolean; ulang: () => void } {
  const [posisi, setPosisi] = React.useState<(PosisiPeta & { waktu: number }) | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    if (!aktif) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGalat('Perangkat ini tidak mendukung lokasi.');
      return;
    }
    setGalat(null);
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setPosisi({ lat: p.coords.latitude, lng: p.coords.longitude, akurasi: Math.round(p.coords.accuracy), waktu: p.timestamp });
        setGalat(null);
      },
      (e) => setGalat(e.code === e.PERMISSION_DENIED ? 'Izin lokasi ditolak. Izinkan lokasi untuk situs ini di pengaturan browser.' : 'Lokasi belum didapat. Nyalakan GPS lalu coba lagi.'),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 5_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [aktif, n]);
  return { posisi, galat, muat: aktif && !posisi && !galat, ulang: () => setN((x) => x + 1) };
}

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Jarak dua titik (meter). */
export function jarakPeta(a: TitikPeta, b: TitikPeta): number {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Teks "lat, lng" → titik (null bila tidak sah). */
export function titikDariTeks(s: string): TitikPeta | null {
  const m = s.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

export interface PilihLokasiPetaProps {
  value: TitikPeta | null;
  onChange: (t: TitikPeta | null) => void;
  /** Bila diisi, peta menampilkan lingkaran dan isian radius. */
  radius?: number;
  onRadiusChange?: (m: number) => void;
  /** Mode gambar poligon (opsional): bila `onPoligonChange` diisi, muncul pilihan Radius / Poligon. */
  poligon?: Array<[number, number]> | null;
  onPoligonChange?: (p: Array<[number, number]> | null) => void;
  /** Area lain untuk acuan (abu-abu). */
  areaLain?: AreaPeta[];
  tinggi?: number;
  radiusMin?: number;
  radiusMaks?: number;
  className?: string;
}

/**
 * Isian lokasi berbasis peta: klik/geser penanda, pakai lokasi saya, tempel koordinat, atur radius, atau gambar poligon.
 */
export function PilihLokasiPeta({ value, onChange, radius, onRadiusChange, poligon, onPoligonChange, areaLain, tinggi = 340, radiusMin = 10, radiusMaks = 5000, className }: PilihLokasiPetaProps) {
  const [mode, setMode] = React.useState<'radius' | 'poligon'>(poligon && poligon.length >= 3 ? 'poligon' : 'radius');
  const [teks, setTeks] = React.useState(value ? `${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}` : '');
  const [cariLokasi, setCariLokasi] = React.useState<{ muat: boolean; galat: string | null; akurasi: number | null }>({ muat: false, galat: null, akurasi: null });
  React.useEffect(() => {
    if (value) setTeks(`${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}`);
  }, [value?.lat, value?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const pakaiPoligon = mode === 'poligon' && !!onPoligonChange;
  const klik = (t: TitikPeta) => {
    if (pakaiPoligon) {
      const baru: Array<[number, number]> = [...(poligon ?? []), [Number(t.lat.toFixed(7)), Number(t.lng.toFixed(7))]];
      onPoligonChange!(baru);
      if (baru.length >= 3) onChange(pusatPoligon(baru));
    } else {
      onChange({ lat: Number(t.lat.toFixed(7)), lng: Number(t.lng.toFixed(7)) });
    }
  };
  const lokasiSaya = async () => {
    setCariLokasi({ muat: true, galat: null, akurasi: null });
    try {
      const p = await ambilPosisi();
      onChange({ lat: Number(p.lat.toFixed(7)), lng: Number(p.lng.toFixed(7)) });
      setCariLokasi({ muat: false, galat: null, akurasi: p.akurasi ?? null });
    } catch (e) {
      setCariLokasi({ muat: false, galat: (e as Error).message, akurasi: null });
    }
  };
  const area: AreaPeta[] = [
    ...(areaLain ?? []).map((a) => ({ ...a, warna: 'muted' as const })),
    ...(value && !pakaiPoligon && radius !== undefined ? [{ id: '__pilih', lat: value.lat, lng: value.lng, radius_m: radius, warna: 'primary' as const }] : []),
    ...(pakaiPoligon && poligon && poligon.length >= 3 && value ? [{ id: '__poligon', lat: value.lat, lng: value.lng, poligon, warna: 'primary' as const }] : []),
  ];

  return (
    <div className={cn('u-peta-pilih', className)}>
      <div className="u-peta-pilih-alat">
        {onPoligonChange && (
          <SegmentedControl
            aria-label="Bentuk area"
            value={mode}
            onValueChange={(v) => {
              setMode(v);
              if (v === 'radius') onPoligonChange(null);
            }}
            options={[
              { value: 'radius', label: 'Radius' },
              { value: 'poligon', label: 'Poligon' },
            ]}
          />
        )}
        <Button size="sm" variant="outline" loading={cariLokasi.muat} onClick={lokasiSaya}>
          <LocateFixed aria-hidden /> Pakai lokasi saya
        </Button>
        {pakaiPoligon && (
          <>
            <Button size="sm" variant="ghost" disabled={!poligon?.length} onClick={() => onPoligonChange!((poligon ?? []).slice(0, -1))}>
              <Undo2 aria-hidden /> Batalkan titik
            </Button>
            <Button size="sm" variant="ghost" disabled={!poligon?.length} onClick={() => onPoligonChange!(null)}>
              <X aria-hidden /> Kosongkan
            </Button>
          </>
        )}
      </div>
      <p className="u-peta-pilih-petunjuk">
        <Crosshair aria-hidden />
        {pakaiPoligon
          ? `Klik peta untuk menambah sudut area (${poligon?.length ?? 0} titik, minimal 3).`
          : 'Klik peta atau geser penanda merah ke titik pusat area.'}
        {cariLokasi.akurasi ? ` Akurasi lokasi Anda sekitar ${cariLokasi.akurasi} m.` : ''}
      </p>
      {cariLokasi.galat && <p className="u-peta-pilih-galat">{cariLokasi.galat}</p>}
      <Peta
        tinggi={tinggi}
        area={area}
        draf={pakaiPoligon && poligon && poligon.length < 3 ? poligon : null}
        geser={!pakaiPoligon ? value : null}
        onGeser={(t) => onChange({ lat: Number(t.lat.toFixed(7)), lng: Number(t.lng.toFixed(7)) })}
        onKlik={klik}
        pusat={value ?? undefined}
        kunciTampilan={`${value ? 1 : 0}-${mode}`}
        aria-label="Peta untuk memilih lokasi"
      />
      <div className="u-peta-pilih-isian">
        <Field label="Koordinat (lat, lng)" description="Bisa ditempel dari Google Maps atau OpenStreetMap.">
          <Input
            value={teks}
            inputMode="decimal"
            placeholder="0.4743, 121.9378"
            onChange={(e) => setTeks(e.target.value)}
            onBlur={() => {
              const t = titikDariTeks(teks);
              if (t) onChange(t);
              else if (!teks.trim()) onChange(null);
              else if (value) setTeks(`${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}`);
            }}
          />
        </Field>
        {radius !== undefined && onRadiusChange && !pakaiPoligon && (
          <Field label="Radius (meter)">
            <div className="u-peta-radius">
              <Button size="sm" variant="outline" iconOnly aria-label="Kurangi radius" onClick={() => onRadiusChange(Math.max(radiusMin, radius - 10))}>
                <Minus aria-hidden />
              </Button>
              <Input type="number" min={radiusMin} max={radiusMaks} value={String(radius)} onChange={(e) => onRadiusChange(Math.min(radiusMaks, Math.max(0, Number(e.target.value) || 0)))} />
              <Button size="sm" variant="outline" iconOnly aria-label="Tambah radius" onClick={() => onRadiusChange(Math.min(radiusMaks, radius + 10))}>
                <Plus aria-hidden />
              </Button>
            </div>
          </Field>
        )}
      </div>
    </div>
  );
}

/** Titik tengah poligon (rata-rata sudut; cukup untuk area kecil). */
export function pusatPoligon(p: Array<[number, number]>): TitikPeta {
  const n = p.length || 1;
  return { lat: Number((p.reduce((s, t) => s + t[0], 0) / n).toFixed(7)), lng: Number((p.reduce((s, t) => s + t[1], 0) / n).toFixed(7)) };
}
