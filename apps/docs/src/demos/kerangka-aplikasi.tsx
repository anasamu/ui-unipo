import * as React from 'react';
import { BarChart3, BookOpen, ClipboardList, FileBarChart, FolderOpen, House, Mail, MessagesSquare, Package, Palette, Receipt, Settings, Store, Users, Wallet } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, PencarianFitur, PintasanFitur, SearchTrigger, StatCard, fiturDariMenu, labelPintasanCari, type ItemFitur, type NavGroup, type TemaAkun } from 'unipo-ui';
import { KerangkaAplikasi, PintasanBeranda, TombolBerkas, TombolNotifikasi, TombolPesan } from 'unipo-ui/siakad';
import { buatTema, PILIHAN_ELEVASI, type Elevasi } from 'unipo-ui/tema';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Kerangka aplikasi',
  category: 'Mulai',
  layout: 'full',
  order: 3,
  badge: 'baru',
  description:
    'Kerangka bawaan semua aplikasi dasbor UNIPO dalam satu komponen: sidebar dengan logo yang menuju beranda, judul halaman, pencarian fitur (Ctrl/⌘K), notifikasi masuk, pesan masuk, kelola berkas, tombol tema, menu akun SIAKAD, navigasi bawah di ponsel, dan obrolan mengambang. Pakai ini agar header dan sidebar sama di Pustikom, PMB, LMS, BAAK, BAUK, SDM, dan aplikasi lain.',
  importLine: "import { KerangkaAplikasi, TombolNotifikasi, TombolPesan, useNotifikasi } from 'unipo-ui/siakad';\nimport { PencarianFitur, PintasanFitur, fiturDariMenu } from 'unipo-ui';",
  demos: {
    Lengkap: 'KerangkaAplikasi: klik logo, coba Ctrl/⌘K atau "/", buka lonceng dan ikon pesan. Arahkan kursor ke menu lalu klik bintang untuk menyematkan; tombol bintang di bilah atas membuka Pintasan. Di bawah 1024 px sidebar pindah ke laci.',
    Notifikasi: 'TombolNotifikasi: lencana belum dibaca, klik = tandai dibaca lalu buka tautan',
    Pesan: 'TombolPesan: obrolan terbaru dengan cuplikan yang didekripsi di browser',
    Berkas: 'TombolBerkas: unggah cepat (tombol atau tarik-lepas), berkas terbaru dengan tombol unduh, dan Kelola berkas',
    Pencarian: 'PencarianFitur: palet pencarian menu + fitur tambahan',
    Pintasan: 'PintasanFitur: grid pintasan untuk beranda dari menu yang sama',
    EfekBayangan: 'Efek bayangan tema (elevasi): datar, normal, terangkat, melayang',
  },
  props: [
    ['kode / nama / tagline', 'string', 'Kode aplikasi terdaftar di Pustikom/SSO (logo diambil dari sana), nama dan tagline di sidebar.'],
    ['beranda', 'string', 'Tujuan klik logo dan nama aplikasi. Bawaan "/".'],
    ['groups / activeKey / renderLink', 'NavGroup[] / string / (item, props) => ReactElement', 'Menu sidebar yang sudah disaring izinnya, sama dengan Sidebar.'],
    ['onNavigasi', '(href) => void', 'Navigasi dari pencarian dan notifikasi, mis. useNavigate() React Router.'],
    ['judul / subjudul', 'ReactNode', 'Judul bilah atas. Bawaan label menu aktif.'],
    ['cari', 'boolean | { placeholder?, tambahan?: ItemFitur[], onBuka? }', 'Pencarian fitur. tambahan = fitur yang tidak ada di sidebar; onBuka = palet milik aplikasi (mis. Pustikom).'],
    ['notifikasi', 'boolean | { interval?, semuaHref?, username? }', 'Ikon notifikasi dari /v1/notif (scope notif:read, notif:write). Tersembunyi bila token tidak punya akses.'],
    ['pesan', 'boolean | { onBuka?, mengambang?, judul? }', 'Ikon pesan masuk dari /v1/obrolan dan ChatMengambang. onBuka bila aplikasi punya halaman obrolan.'],
    ['berkas', 'boolean | { modul?, unit?, kategori?, onKelola?, unitTampil? }', 'Ikon kelola berkas dari /v1/berkas (scope berkas:read, berkas:write). onKelola = halaman berkas aplikasi; bawaan membuka DriveBerkas dalam dialog.'],
    ['tema / onTema', "'terang' | 'gelap' | 'sistem'", 'Tombol tema di bilah atas (di ponsel pindah ke menu akun).'],
    ['akun', 'false | ReactNode | props MenuAkunSiakad', 'Menu akun. Objek = props MenuAkunSiakad (cadangan, menu); ReactNode = menu sendiri.'],
    ['onKeluar', '() => void', 'Aksi keluar di menu akun.'],
    ['topbarKiri / aksi', 'ReactNode', 'Pemilih prodi/periode di kiri, tombol tambahan sebelum notifikasi.'],
    ['sidebarHeader / sidebarFooter', 'ReactNode', 'Isi tambahan sidebar.'],
    ['versi', 'string', 'Versi aplikasi di kaki sidebar, mis. dari package.json lewat define Vite (__VERSI__).'],
    ['statusApi', 'boolean', 'Status layanan API di kaki sidebar (GET /v1/health tiap 60 detik saat tab terlihat). Bawaan true.'],
    ['pintasan', 'boolean', 'Pintasan menu pengguna (localStorage per aplikasi + pengguna, maks. 8 disematkan): bintang sematkan saat kursor di item sidebar (item TIDAK dipindah, yang disematkan hanya diberi bintang; klik kanan/tekan lama = menu konteks), tombol bintang "Pintasan" di bilah atas (Disematkan dengan urut seret/panah + Sering dibuka dengan sematkan/sembunyikan + "Sematkan halaman ini"), bagian awal Ctrl/⌘K, navigasi bawah ponsel (Beranda + sematan), dan PintasanBeranda / deret di SapaanBeranda. Bawaan true; false mematikan semuanya.'],
    ['temaAplikasi / temaLingkup', 'string', 'Kode aplikasi dan lingkup tema (/v1/tema) bila berbeda dari kode, untuk membaca variasi Sidebar dan Header.'],
    ['navBawah / navBawahAktif', 'ItemNavigasiBawah[] / string', 'Navigasi bawah di layar < 768 px. Bawaan Beranda + menu yang disematkan; tanpa sematan: Beranda + menu teratas sidebar.'],
    ['tataMuat / muat', "TataMuatHalaman | (activeKey) => TataMuatHalaman / false | { awal?, pindah? }", 'Efek memuat halaman pertama dan pindah menu (lihat Efek memuat halaman). Bawaan dari tema: bilah progres + kerangka isi, lalu bilah progres + pudar.'],
  ],
  notes: [
    'Notifikasi: GET /v1/notif/ringkas tiap 60 detik selama tab terlihat (berhenti saat tab disembunyikan), GET /v1/notif/kotak saat panel dibuka, POST /v1/notif/kotak/{id}/baca saat diklik, POST /v1/notif/kotak/baca-semua untuk "Tandai semua dibaca". Galat 401/403/404 menyembunyikan ikon tanpa pesan galat.',
    'Pesan: memakai mesin obrolan yang sama dengan ChatMengambang (satu koneksi long-poll per halaman). Lencana = jumlah pesan belum dibaca di obrolan yang tidak dibisukan. Ikon tidak tampil bila token tidak punya scope obrolan.',
    'BFF aplikasi harus meneruskan /v1/notif dan /v1/obrolan ke SIAKAD, dan klien API aplikasi butuh scope notif:read, notif:write, obrolan:read, obrolan:write (daftar wajib di siakad app/Modules/Rbac/Data/scope_aplikasi.php).',
    'Tampilan sidebar dan header (gaya, mode bawaan penuh/mini/otomatis, kepadatan, gaya menu aktif, lebar; gaya header, tombol Pintasan (`sidebar_pintasan`), tinggi, posisi cari, lengket, judul/jejak) diatur di PengaturanTema bagian Sidebar dan header, disimpan di tata (`sidebar_*`, `header_*`). Lapis kampus menjadi bawaan semua aplikasi.',
    'Pintasan di beranda: `<PintasanBeranda />` (petak berikon + bintang, ajakan saat kosong) dari unipo-ui/siakad, atau otomatis sebagai deret chip di bawah SapaanBeranda (`pintasan={false}` untuk mematikan). Keduanya hanya tampil di dalam KerangkaAplikasi.',
    'Efek bayangan diatur di Pengaturan tema (PengaturanTema → Efek bayangan) dan disimpan sebagai tema.elevasi lewat /v1/tema. Kekuatan bayangan tetap diatur pilihan Bayangan.',
  ],
};

const MENU: NavGroup[] = [
  { items: [{ key: 'beranda', label: 'Beranda', icon: <House />, href: '#beranda' }] },
  {
    label: 'Mahasiswa',
    items: [
      { key: 'kasir', label: 'Kasir & pembayaran', icon: <Store />, href: '#kasir' },
      { key: 'tagihan', label: 'Tagihan', icon: <Receipt />, href: '#tagihan', badge: 12 },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      {
        key: 'akuntansi',
        label: 'Akuntansi',
        icon: <BookOpen />,
        children: [
          { key: 'laporan', label: 'Laporan keuangan', href: '#laporan' },
          { key: 'jurnal', label: 'Jurnal umum', href: '#jurnal' },
          { key: 'kas', label: 'Kas per unit', href: '#kas' },
        ],
      },
      { key: 'anggaran', label: 'Anggaran & realisasi', icon: <ClipboardList />, href: '#anggaran' },
    ],
  },
  {
    label: 'Payroll',
    items: [
      { key: 'gaji', label: 'Periode payroll', icon: <Wallet />, href: '#gaji' },
      { key: 'gaji/pegawai', label: 'Pegawai payroll', icon: <Users />, href: '#gaji/pegawai' },
    ],
  },
  {
    label: 'Ruang kerja',
    items: [
      { key: 'surat', label: 'Surat masuk & keluar', icon: <Mail />, href: '#surat' },
      { key: 'berkas', label: 'Berkas', icon: <FolderOpen />, href: '#berkas' },
      { key: 'obrolan', label: 'Obrolan', icon: <MessagesSquare />, href: '#obrolan' },
      { key: 'tema', label: 'Tema tampilan', icon: <Palette />, href: '#tema' },
      { key: 'pengaturan', label: 'Pengaturan keuangan', icon: <Settings />, href: '#pengaturan' },
    ],
  },
];

const TAMBAHAN: ItemFitur[] = [
  { key: 'x-va', label: 'Buat virtual account', kelompok: 'Aksi', keterangan: 'Kasir & pembayaran', icon: <Receipt />, kataKunci: ['bayar', 'bsi'], href: '#kasir' },
  { key: 'x-aset', label: 'Tambah aset', kelompok: 'Aksi', keterangan: 'Sarana prasarana', icon: <Package />, href: '#aset' },
  { key: 'x-rekap', label: 'Unduh rekap UKT per prodi', kelompok: 'Aksi', keterangan: 'Laporan keuangan', icon: <BarChart3 />, kataKunci: ['spp', 'excel'], href: '#laporan' },
];

function Bingkai({ children, tinggi = 640 }: { children: React.ReactNode; tinggi?: number }) {
  return (
    <div className="demo-kerangka" style={{ height: tinggi }}>
      {children}
    </div>
  );
}

export function Lengkap() {
  const [aktif, setAktif] = React.useState('beranda');
  const [tema, setTema] = React.useState<TemaAkun>('terang');
  const keKunci = (href: string) => setAktif(href.replace(/^#/, '') || 'beranda');
  return (
    <Bingkai>
      <KerangkaAplikasi
        kode="bauk"
        nama="BAUK UNIPO"
        tagline="Keuangan, payroll, dan sarpras"
        beranda="#beranda"
        groups={MENU}
        activeKey={aktif}
        renderLink={(item, props) => (
          <a
            {...props}
            onClick={(e) => {
              e.preventDefault();
              keKunci(item.href ?? '');
            }}
          />
        )}
        onNavigasi={keKunci}
        cari={{ tambahan: TAMBAHAN }}
        notifikasi={{ interval: 0 }}
        tema={tema}
        onTema={setTema}
        onKeluar={() => alert('Keluar dari semua aplikasi')}
        versi="1.46.0"
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <StatCard label="Penerimaan November" value="Rp1,84 M" delta={6.2} deltaLabel="dari Oktober" />
            <StatCard label="Tagihan belum lunas" value="412" delta={-3.1} deltaLabel="dari Oktober" inverse />
            <StatCard label="Payroll diproses" value="187 pegawai" />
          </div>
          <PintasanBeranda />
          <Card>
            <CardHeader title="Pintasan" description="Dari menu yang sama dengan sidebar" />
            <CardContent>
              <PintasanFitur items={fiturDariMenu(MENU).slice(1, 7)} renderLink={(it, p) => <a {...p} onClick={(e) => (e.preventDefault(), keKunci(it.href ?? ''))} />} />
            </CardContent>
          </Card>
        </div>
      </KerangkaAplikasi>
    </Bingkai>
  );
}

export function Notifikasi() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
      <TombolNotifikasi interval={0} semuaHref="#notifikasi" onNavigasi={(href) => alert(`Buka ${href}`)} />
    </div>
  );
}

export function Pesan() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
      <TombolPesan onBuka={(ruang) => alert(ruang ? `Buka ruang ${ruang}` : 'Buka semua obrolan')} />
    </div>
  );
}

export function Berkas() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
      <TombolBerkas />
    </div>
  );
}

export function Pencarian() {
  const [buka, setBuka] = React.useState(false);
  const [dipilih, setDipilih] = React.useState<string>('');
  return (
    <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
      <SearchTrigger placeholder="Cari fitur" shortcut={labelPintasanCari()} onClick={() => setBuka(true)} />
      {dipilih && <p className="u-field-description">Dipilih: {dipilih}</p>}
      <PencarianFitur open={buka} onOpenChange={setBuka} items={[...fiturDariMenu(MENU), ...TAMBAHAN]} onPilih={(it) => setDipilih(`${it.label} (${it.href})`)} />
    </div>
  );
}

export function Pintasan() {
  return <PintasanFitur items={fiturDariMenu(MENU).filter((x) => x.key !== 'beranda')} renderLink={(_it, p) => <a {...p} onClick={(e) => e.preventDefault()} />} />;
}

export function EfekBayangan() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
      {PILIHAN_ELEVASI.map((p) => (
        <ContohElevasi key={p.value} elevasi={p.value} label={p.label} keterangan={p.keterangan} />
      ))}
    </div>
  );
}

function ContohElevasi({ elevasi, label, keterangan }: { elevasi: Elevasi; label: string; keterangan: string }) {
  const id = `demo-elevasi-${elevasi}`;
  const css = React.useMemo(() => buatTema({ elevasi }).replace(':root,\n.u-theme {', `#${id} {`).replace(".dark,\n[data-theme='dark'] {", `.dark #${id} {`), [elevasi, id]);
  return (
    <div id={id} style={{ display: 'grid', gap: 12, padding: 16, borderRadius: 16, background: 'var(--u-surface)' }}>
      <style>{css}</style>
      <div>
        <b>{label}</b>
        <p className="u-field-description" style={{ margin: 0 }}>
          {keterangan}
        </p>
      </div>
      <Card interactive>
        <CardHeader title="Kartu" description="Arahkan kursor untuk hover" />
      </Card>
      <div style={{ height: 40, borderRadius: 10, background: 'var(--u-background)', border: '1px solid var(--u-border)', boxShadow: 'var(--u-elevation-bar)', display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 13, color: 'var(--u-muted-foreground)' }}>
        Bilah atas
      </div>
      <Button variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(`elevasi: '${elevasi}'`)}>
        Salin opsi
      </Button>
    </div>
  );
}
