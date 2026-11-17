import * as React from 'react';
import { RotateCcw } from 'lucide-react';
import {
  BilahProgres,
  Button,
  KerangkaHalamanMuat,
  MuatHalaman,
  PILIHAN_MUAT_AWAL,
  SegmentedControl,
  Spinner,
  TransisiIsi,
  useMuatTertunda,
  type TataMuatHalaman,
} from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Efek memuat halaman',
  category: 'Mulai',
  order: 5,
  badge: 'baru',
  description:
    'Efek saat aplikasi pertama dibuka dan saat pindah menu. KerangkaAplikasi memasangnya otomatis di semua aplikasi dasbor: bilah progres tipis warna tema di tepi atas, kerangka isi (skeleton) yang meniru tata letak halaman pada pembukaan pertama, dan isi baru yang muncul halus saat pindah menu. Tidak tampil bila selesai di bawah ~150 ms dan menghormati prefers-reduced-motion. Gaya bisa dipilih di Pengaturan tema → Sidebar dan header → Efek memuat (tata.muat_awal, tata.muat_pindah).',
  importLine: "import { BilahProgres, MuatAplikasi, MuatHalaman, KerangkaHalamanMuat, MuatLogo, MuatTitik, MuatPutar, TransisiIsi, useMuatTertunda, usePantauMuat } from 'unipo-ui';",
  demos: {
    BilahProgresAtas: 'BilahProgres: maju pelan sampai ~90% lalu penuh dan memudar saat selesai',
    Kerangka: 'KerangkaHalamanMuat: dasbor, tabel, formulir, daftar, detail',
    GayaLain: 'MuatLogo, MuatTitik, MuatPutar',
    Transisi: 'TransisiIsi: isi baru muncul pudar atau dari kabur saat kunci berubah',
    TanpaKedip: 'useMuatTertunda: pemuatan < 150 ms tidak menampilkan apa pun',
  },
  props: [
    ['BilahProgres aktif / tunda / tebal / warna / posisi', "boolean / number / number / string / 'tetap' | 'wadah'", 'Bawaan tunda 150 ms, tebal 3 px, warna utama tema, menempel ke viewport.'],
    ['MuatHalaman gaya / tata / logo / label', "'kerangka' | 'logo' | 'putar' | 'titik' | 'tidak' / TataMuatHalaman", 'Satu pintu untuk efek halaman pertama.'],
    ['KerangkaHalamanMuat tata', "'dasbor' | 'tabel' | 'formulir' | 'daftar' | 'detail'", 'Skeleton yang meniru tata letak halaman.'],
    ['TransisiIsi kunci / efek', "unknown / 'pudar' | 'blur' | 'tidak'", 'Animasi masuk tanpa memasang ulang isi (Web Animations API).'],
    ['MuatAplikasi label / tata / tunda', 'string / TataMuatHalaman / number', 'Kerangka seluruh aplikasi (sidebar, bilah atas, isi) + bilah progres untuk saat sesi masih dicek sebelum KerangkaAplikasi tampil. Ukurannya sama dengan KerangkaAplikasi.'],
    ['useMuatTertunda(aktif, { tunda, minimal })', 'boolean', 'Status memuat tanpa kedip: tampil setelah tunda, bertahan minimal.'],
    ['usePantauMuat(ref, aktif)', 'boolean', 'true selama elemen berisi Spinner, Skeleton, atau aria-busy (dipakai KerangkaAplikasi).'],
    ['KerangkaAplikasi tataMuat / muat', "TataMuatHalaman | (activeKey) => TataMuatHalaman / false | { awal?, pindah? }", 'Bentuk skeleton per halaman (bawaan dasbor di beranda, tabel di lainnya) dan penimpa gaya dari tema.'],
  ],
  notes: [
    'Bawaan semua aplikasi: halaman pertama = bilah progres + kerangka isi; pindah menu = bilah progres + isi muncul pudar.',
    'KerangkaAplikasi tidak perlu tahu cara aplikasi memuat data: selama isi halaman berisi Spinner, Skeleton, atau elemen aria-busy="true", efek memuat berjalan (paling lama 10 detik). Pemuat di dalam dialog dan elemen ber-atribut data-muat-abaikan diabaikan.',
  ],
};

function useUlang(ms: number) {
  const [aktif, setAktif] = React.useState(false);
  React.useEffect(() => {
    if (!aktif) return;
    const t = setTimeout(() => setAktif(false), ms);
    return () => clearTimeout(t);
  }, [aktif, ms]);
  return [aktif, () => setAktif(true)] as const;
}

export function BilahProgresAtas() {
  const [aktif, mulai] = useUlang(2200);
  return (
    <div style={{ position: 'relative', border: '1px solid var(--u-border)', borderRadius: 12, padding: 24, overflow: 'hidden' }}>
      <BilahProgres aktif={aktif} posisi="wadah" />
      <Button size="sm" variant="outline" onClick={mulai} disabled={aktif}>
        <RotateCcw /> Muat 2 detik
      </Button>
    </div>
  );
}

export function Kerangka() {
  const [tata, setTata] = React.useState<TataMuatHalaman>('dasbor');
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <SegmentedControl
        value={tata}
        onValueChange={(v) => setTata(v as TataMuatHalaman)}
        options={(['dasbor', 'tabel', 'formulir', 'daftar', 'detail'] as const).map((v) => ({ value: v, label: v[0]!.toUpperCase() + v.slice(1) }))}
        aria-label="Tata letak"
      />
      <KerangkaHalamanMuat tata={tata} />
    </div>
  );
}

export function GayaLain() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))', gap: 16 }}>
      {PILIHAN_MUAT_AWAL.filter((o) => o.value !== 'kerangka' && o.value !== 'tidak').map((o) => (
        <div key={o.value} style={{ border: '1px solid var(--u-border)', borderRadius: 12, height: 200, display: 'grid' }}>
          <MuatHalaman gaya={o.value} label={o.label} />
        </div>
      ))}
    </div>
  );
}

export function Transisi() {
  const [n, setN] = React.useState(1);
  const [efek, setEfek] = React.useState<'pudar' | 'blur'>('pudar');
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <SegmentedControl value={efek} onValueChange={(v) => setEfek(v as 'pudar' | 'blur')} options={[{ value: 'pudar', label: 'Pudar' }, { value: 'blur', label: 'Kabur' }]} aria-label="Efek" />
        <Button size="sm" variant="outline" onClick={() => setN((x) => (x % 3) + 1)}>
          Pindah halaman
        </Button>
      </div>
      <TransisiIsi kunci={n} efek={efek}>
        <div style={{ border: '1px solid var(--u-border)', borderRadius: 12, padding: 24 }}>
          <strong>Halaman {n}</strong>
          <p style={{ margin: '8px 0 0', color: 'var(--u-muted-foreground)' }}>Isi halaman yang baru dibuka.</p>
        </div>
      </TransisiIsi>
    </div>
  );
}

export function TanpaKedip() {
  const [aktif, setAktif] = React.useState(false);
  const tampil = useMuatTertunda(aktif);
  const jalan = (ms: number) => {
    setAktif(true);
    setTimeout(() => setAktif(false), ms);
  };
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <Button size="sm" variant="outline" onClick={() => jalan(80)}>
        Muat 80 ms
      </Button>
      <Button size="sm" variant="outline" onClick={() => jalan(1200)}>
        Muat 1,2 detik
      </Button>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 24 }}>{tampil ? <Spinner size="sm" /> : 'Tidak ada pemuat'}</span>
    </div>
  );
}
