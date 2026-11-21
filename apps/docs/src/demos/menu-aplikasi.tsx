import * as React from 'react';
import { AppWindow, BadgeCheck, CalendarClock, Code2, House, KeyRound, LifeBuoy, Network, Palette, Plug, ScrollText, ShieldCheck, UserCog, Users, UsersRound, Workflow } from 'lucide-react';
import { Alert, Badge, Sidebar, Switch, UnipoAppLogo, definisiMenu, periksaMenu, susunMenu, type KonteksMenu, type NavItem } from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Menu aplikasi (definisi data)',
  category: 'Navigasi & alur',
  layout: 'full',
  badge: 'baru',
  description:
    'Satu definisi menu per aplikasi sebagai data: kategori standar, izin per item, keterangan dan kata kunci untuk tooltip dan Cari fitur. useMenuAplikasi menyaring izin, membuang induk/kategori kosong, meratakan induk beranak satu, lalu menghitung menu aktif, judul, dan data Cari fitur. periksaMenu menolak menu ganda.',
  importLine: "import { definisiMenu, useMenuAplikasi, periksaMenu, susunMenu, type KonteksMenu } from 'unipo-ui';\nimport { KerangkaAplikasi } from 'unipo-ui/siakad';",
  demos: {
    Definisi: 'Satu definisi, dua peran: saring izin, kategori bisa dilipat, lencana induk, tautan keluar, lencana Baru',
    Periksa: 'periksaMenu: rute/label/kunci ganda, salinan bilah atas & menu akun, kategori penuh, induk beranak satu',
  },
  props: [
    ['definisiMenu(kategori[], opsi?)', '{ kategori, judul?, kunci?, izin?, terlipat?, item: ItemMenuDef[] }[]', "Kategori standar: 'beranda' · 'saya' · 'tugas' (Tugas & persetujuan) · 'bidang' · 'laporan' (Laporan & statistik) · 'administrasi' · 'pengaturan'. Diurutkan otomatis; saat pengembangan masalah ditulis console.warn('[menu] …'). opsi: nama, menuAkun, bilahAtas, periksa."],
    ['ItemMenuDef', '{ label, ke?, ikon?, ket?, kata?, izin?, anak?, ruteTurunan?, luar?, baru?, bolehGanda?, kunci? }', 'kunci bawaan = ke (pintasan lama tetap). izin: kode, larik (salah satu cukup), atau (konteks) => boolean. ruteTurunan: "/kelas/:id", "/m/*". bolehGanda: alasan pengecualian periksaMenu.'],
    ['useMenuAplikasi(MENU, { konteks, path, lencana })', 'HasilMenu', '{ groups, activeKey, judul, kelompok, fitur }. konteks: { punya?(kode), izin?[], superadmin? }; lencana: { [kunci]: angka }.'],
    ['KerangkaAplikasi menu={hasil} lipatKategori', "HasilMenu / boolean | 'terlipat'", 'Mengisi groups, activeKey, judul, dan Cari fitur sekaligus. groups lama tetap didukung.'],
    ['ItemMenuDef bawah / pendek', 'boolean | number / string', 'Navigasi bawah ponsel: maks. 4 item ber-bawah (angka = urutan) + tombol Menu otomatis; pendek = label singkat ≤ 12 huruf.'],
    ['periksaMenu(MENU, { menuAkun?, bilahAtas?, maksItem?, konteks? })', 'MasalahMenu[]', 'Untuk uji aplikasi: expect(periksaMenu(MENU)).toEqual([]). Dengan konteks: menu yang terlihat untuk satu peran.'],
    ['ItemMenuDef tab', '{ kunci?, label, ke, izin?, ket?, kata?, ruteTurunan? }[]', 'Halaman berkaitan digabung jadi satu menu bertab. Tiap tab punya rute sendiri (sub-rute atau ?tab=) sehingga tautan lama, bookmark, dan Cari fitur tetap jalan; tab disaring izin, item tanpa tab terlihat disembunyikan. KerangkaAplikasi memasang deret tab (TabMenuHalaman, tautan router) otomatis di atas isi halaman; rute lama tetap. Alamat dasar/tab terlarang dialihkan ke tab pertama.'],
    ['periksaMenu label-panjang / maksLabel', 'number (bawaan MAKS_LABEL = 22)', 'Label sidebar, submenu, dan judul kategori lebih dari 22 huruf terpotong di lebar sidebar standar: persingkat (penjelasan ke ket) atau isi pendek (tampil di sidebar; label penuh jadi tooltip, judul halaman, dan teks Cari fitur). Judul bilah atas di ponsel memakai pendek.'],
    ['Sidebar lipatKategori / ingatKategori', "boolean | 'terlipat' / string", 'Judul kategori bisa dilipat dan diingat (localStorage); kategori yang memuat halaman aktif selalu dibuka.'],
    ['NavItem keterangan / kataKunci / luar / baru', 'string / string[] / boolean / boolean', 'Tooltip + Cari fitur, penanda tautan keluar (tab baru), lencana Baru.'],
  ],
  notes: [
    'Aturan menu (rencana/menu-sidebar.md): Beranda selalu pertama tanpa judul; Pengaturan selalu terakhir dengan Tema tampilan sebagai item terakhir; maksimal 6 item tingkat atas per kategori (MAKS_ITEM; halaman berkaitan dijadikan tab); submenu satu tingkat, minimal 2 anak; induk tidak berlabel sama dengan kategorinya; satu fungsi = satu tempat menu.',
    'Notifikasi, Berkas, Obrolan, dan Pintasan sudah ada di bilah atas (BILAH_ATAS_BAWAAN) sehingga ditolak bila diulang di sidebar. Isi menu akun dicantumkan di opsi menuAkun.',
    'Izin di menu hanya menyembunyikan menu yang pasti ditolak; server tetap pemeriksa akhir.',
  ],
};

const MENU = definisiMenu(
  [
    { kategori: 'beranda', item: [{ label: 'Beranda', ke: '/', ikon: House, ket: 'Ringkasan layanan' }] },
    {
      kategori: 'tugas',
      item: [
        { label: 'Hak akses panitia', ke: '/panitia', ikon: UsersRound, ket: 'Persetujuan hak akses panitia ber-SK' },
        { label: 'Pengajuan akses API', ke: '/api', ikon: KeyRound, ket: 'Pengajuan dari portal pengembang', izin: 'api.setujui' },
      ],
    },
    {
      kategori: 'bidang',
      judul: 'Akun & akses',
      item: [
        { label: 'Akun pengguna', ke: '/akun', ikon: Users, ket: 'Buat dan reset akun', kata: 'user sandi' },
        {
          label: 'Peran & hak akses',
          ikon: ShieldCheck,
          anak: [
            { label: 'Peran & izin', ke: '/peran', izin: 'rbac:read' },
            { label: 'Penugasan peran', ke: '/penugasan', izin: 'rbac:admin' },
            { label: 'Sinkron peran dari SDM', ke: '/sinkron', ikon: Workflow, izin: 'rbac:admin', baru: true },
          ],
        },
        { label: 'Organisasi & pejabat', ke: '/organisasi', ikon: Network },
      ],
    },
    {
      kategori: 'bidang',
      judul: 'Aplikasi & integrasi',
      item: [
        { label: 'Aplikasi & klien SSO', ke: '/aplikasi', ikon: AppWindow },
        { label: 'Integrasi pihak ketiga', ke: '/integrasi', ikon: Plug },
        { label: 'Pelaporan PDDikti', ke: 'https://baak.unipo.ac.id/pddikti', ikon: BadgeCheck, luar: true, ket: 'Dikelola BAAK' },
      ],
    },
    { kategori: 'bidang', judul: 'Sistem', item: [{ label: 'Tugas terjadwal', ke: '/cron', ikon: CalendarClock }, { label: 'Portal pengembang', ke: '/dev', ikon: Code2 }] },
    { kategori: 'bidang', judul: 'Layanan', item: [{ label: 'Layanan bantuan', ke: '/bantuan', ikon: LifeBuoy }] },
    { kategori: 'laporan', judul: 'Log & audit', item: [{ label: 'Log proses', ke: '/log', ikon: ScrollText }] },
    { kategori: 'administrasi', item: [{ label: 'Registri SK', ke: '/sk', ikon: UserCog }] },
    { kategori: 'pengaturan', item: [{ label: 'Tema tampilan', ke: '/tema', ikon: Palette }] },
  ],
  { nama: 'Contoh', menuAkun: ['Profil & akses saya'] },
);

function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ height: 620, border: '1px solid var(--u-border)', borderRadius: 14, overflow: 'hidden', background: 'var(--u-background)', display: 'flex' }}>{children}</div>;
}

export function Definisi() {
  const [admin, setAdmin] = React.useState(true);
  const [path, setPath] = React.useState('/peran');
  const konteks = React.useMemo<KonteksMenu>(() => (admin ? { superadmin: true } : { izin: ['rbac:read'] }), [admin]);
  const hasil = React.useMemo(() => susunMenu(MENU, konteks, { path, lencana: { '/panitia': 3, '/penugasan': 2 } }), [konteks, path]);
  const klik = (it: NavItem): NavItem => ({ ...it, onClick: it.luar ? undefined : () => it.href && setPath(it.href), href: it.luar ? it.href : undefined, children: it.children?.map(klik) });
  return (
    <Frame>
      <Sidebar brand={<UnipoAppLogo app="siakad" />} groups={hasil.groups.map((g) => ({ ...g, items: g.items.map(klik) }))} activeKey={hasil.activeKey} lipatKategori />
      <div style={{ flex: 1, padding: 24, display: 'grid', alignContent: 'start', gap: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <Switch checked={admin} onCheckedChange={setAdmin} /> Superadmin (matikan: hanya izin rbac:read)
        </label>
        <div>
          <small className="u-field-description">{hasil.kelompok ?? '—'}</small>
          <h3 style={{ margin: 0 }}>{hasil.judul ?? 'Tidak ada menu aktif'}</h3>
        </div>
        <p className="u-field-description">
          Peran terbatas: induk "Peran & hak akses" diratakan menjadi "Peran & izin" (satu anak terlihat) dan kategori Tugas & persetujuan hanya berisi item yang boleh. Cari fitur ({hasil.fitur.length} item) memakai
          keterangan dan kata kunci yang sama.
        </p>
      </div>
    </Frame>
  );
}

export function Periksa() {
  const buruk = definisiMenu(
    [
      { kategori: 'beranda', item: [{ label: 'Beranda', ke: '/' }] },
      {
        kategori: 'bidang',
        judul: 'Sistem',
        item: [
          { label: 'Penyimpanan & kuota', ke: '/penyimpanan' },
          { label: 'Penyimpanan berkas', ke: '/penyimpanan?tab=penyedia' },
          { label: 'Notifikasi', ke: '/notifikasi' },
          { label: 'Sistem', anak: [{ label: 'Tugas terjadwal', ke: '/cron' }] },
        ],
      },
      { kategori: 'pengaturan', item: [{ label: 'Profil & akses saya', ke: '/profil' }] },
    ],
    { periksa: false, menuAkun: ['Profil & akses saya'] },
  );
  const masalah = periksaMenu(buruk);
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {masalah.map((m, i) => (
        <Alert key={i} variant="warning" icon={false}>
          <Badge variant="warning">{m.jenis}</Badge> {m.pesan}
        </Alert>
      ))}
    </div>
  );
}
