import * as React from 'react';
import { Peta, PilihLokasiPeta, type TitikPeta } from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Peta',
  category: 'Tampilan data',
  layout: 'wide',
  badge: 'baru',
  description:
    'Peta interaktif Leaflet + OpenStreetMap, tanpa kunci API berbayar. Area berbentuk radius atau poligon, penanda dengan tooltip/popup, posisi pengguna dengan lingkaran akurasi, dan isian lokasi berbasis peta. Leaflet dimuat dinamis di browser (aman untuk SSR); warna mengikuti token tema, ubin digelapkan di mode gelap.',
  importLine: "import { Peta, PilihLokasiPeta, usePosisi, ambilPosisi, jarakPeta } from 'unipo-ui';",
  demos: {
    Area: 'Peta: area radius dan poligon, penanda, posisi pengguna',
    Pilih: 'PilihLokasiPeta: klik/geser titik, radius, gambar poligon, pakai lokasi saya, tempel koordinat',
  },
  props: [
    ['area', 'AreaPeta[]', '`{ id, lat, lng, radius_m?, poligon?, warna?, label? }`; poligon `[[lat, lng], ...]` menggantikan radius.'],
    ['penanda', 'PenandaPeta[]', '`{ id, lat, lng, warna?, label?, keterangan? }`; klik memanggil `onPilihPenanda(id)`.'],
    ['posisi', '{ lat, lng, akurasi? } | null', 'Titik biru berdenyut + lingkaran akurasi (meter).'],
    ['geser / onGeser', 'TitikPeta', 'Penanda yang bisa digeser.'],
    ['onKlik', '(t) => void', 'Klik peta.'],
    ['ubin', '{ url, atribusi, maxZoom? }', 'Ganti server ubin (bawaan tile.openstreetmap.org). Untuk lalu lintas besar pakai server ubin sendiri.'],
    ['zoomGulir', 'boolean', 'Zoom dengan roda tetikus (bawaan mati agar halaman tetap bisa digulir).'],
    ['usePosisi(aktif)', '{ posisi, galat, muat, ulang }', 'Pantau posisi perangkat (watchPosition, akurasi tinggi).'],
  ],
  notes: [
    'CSS Leaflet sudah termasuk di unipo-ui/style.css; tidak perlu impor terpisah.',
    'Kebijakan pemakaian ubin OpenStreetMap meminta atribusi (sudah tampil) dan melarang beban berat. Aplikasi mobile dengan banyak pengguna sebaiknya memakai penyedia ubin atau server ubin sendiri lewat prop `ubin`.',
  ],
};

export function Area() {
  return (
    <Peta
      tinggi={360}
      area={[
        { id: 'k1', lat: 0.4743, lng: 121.9378, radius_m: 150, label: 'Kampus 1 (radius 150 m)' },
        { id: 'k2', lat: 0.48015, lng: 121.94525, poligon: [[0.4808, 121.9445], [0.4809, 121.946], [0.4795, 121.9461], [0.4794, 121.9446]], warna: 'success', label: 'Kampus 2 (poligon)' },
      ]}
      penanda={[
        { id: 'a', lat: 0.4745, lng: 121.938, warna: 'success', label: 'Masuk 07:21', keterangan: 'Dosen A\nMasuk 07:21 · di Kampus 1' },
        { id: 'b', lat: 0.4772, lng: 121.9405, warna: 'warning', label: 'Ditinjau', keterangan: 'Tendik B\n310 m dari Kampus 1' },
      ]}
      posisi={{ lat: 0.4749, lng: 121.9369, akurasi: 25 }}
    />
  );
}

export function Pilih() {
  const [titik, setTitik] = React.useState<TitikPeta | null>({ lat: 0.4743, lng: 121.9378 });
  const [radius, setRadius] = React.useState(150);
  const [poligon, setPoligon] = React.useState<Array<[number, number]> | null>(null);
  return <PilihLokasiPeta value={titik} onChange={setTitik} radius={radius} onRadiusChange={setRadius} poligon={poligon} onPoligonChange={setPoligon} />;
}
