import * as React from 'react';
import { Badge, Button, useToast } from 'unipo-ui';
import { AksiCepat, BerandaSaya, SapaanBeranda, TagihanSaya, invalidateSiakad } from 'unipo-ui/siakad';
import { CalendarCheck, ClipboardCheck, FileText, Megaphone, MessageSquare, Wallet } from 'lucide-react';
import { setPeranDemo, type PeranDemo } from '../mock/profil';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Beranda per peran',
  category: 'Per kegunaan',
  layout: 'wide',
  order: 1,
  badge: 'baru',
  description:
    'Halaman pertama aplikasi kampus dalam satu komponen. <BerandaSaya /> membaca peran dari akun yang masuk lalu menyusun isinya: mahasiswa mendapat KRS semester ini, tagihan, profil akademik, dan aksi cepat (ambil KRS, cek kesiapan lulus, daftar wisuda, ajukan layanan); dosen mendapat jadwal mengajar dan mahasiswa PA; tendik mendapat data kepegawaian. Semua peran mendapat pengingat kelengkapan data, pengumuman yang sasarannya cocok dengan akun, dan kalender akademik. Bagian-bagiannya juga diekspor untuk beranda buatan sendiri.',
  importLine: "import { BerandaSaya, SapaanBeranda, AksiCepat, TagihanSaya } from 'unipo-ui/siakad';",
  demos: {
    Beranda: 'BerandaSaya: ganti peran tiruan untuk melihat isinya berubah',
    Rakit: 'Rakit sendiri: SapaanBeranda + AksiCepat + TagihanSaya',
    AksiVarian: 'AksiCepat: kolom seimbang, warna, lencana, dan meta per petak',
  },
  props: [
    ['BerandaSaya.onBukaProfil / onBukaKeuangan', '() => void', 'Navigasi ke halaman profil dan keuangan aplikasi Anda (mis. <ModulProfilSaya tab={[…]} />).'],
    ['BerandaSaya.aksiTambahan', 'AksiCepatItem[]', 'Petak aksi cepat milik aplikasi Anda, diletakkan di ujung deret.'],
    ['BerandaSaya.hrefPengumuman', 'string', 'Tautan "Semua" di panel pengumuman.'],
    ['AksiCepatItem.modal', '(trigger) => ReactNode', 'Petak membuka modal fitur, mis. (t) => <ModalAmbilKrs trigger={t} />.'],
    ['AksiCepatItem.warna / badge / meta', "'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral', ReactNode, ReactNode", 'Warna petak ikon, lencana di pojok kanan (mis. jumlah antrean), dan baris kecil di bawah keterangan.'],
    ['AksiCepat.kolom / min', 'number, string', 'Kolom paling banyak (bawaan seimbang menurut jumlah item: 5 → 3+2, 7 → 4+3) dan lebar minimum petak (bawaan 13.5rem).'],
    ['AksiCepat.renderLink', '(props) => ReactNode', 'Tautan lewat router tanpa memuat ulang, mis. ({ href, ...p }) => <Link to={href} {...p} />. Bisa dipasang sekali lewat <PenyediaTautan>.'],
    ['SapaanBeranda.lencana / aksi', 'ReactNode', 'Lencana (peran, unit) terpisah dari tombol/kontrol. keterangan dirender di <div>, jadi boleh berisi blok.'],
  ],
  notes: [
    'Scope token: profil:read, kelengkapan:saya, mahasiswa:read, nilai:read, krs:read (+ krs:write untuk ambil KRS), keuangan:read, dosen:read, jadwal:read, sdm:read, layanan:read + layanan:write, kelulusan:read, portal:read, kalender:read.',
    'Widget yang tidak diizinkan token menampilkan kotak galat dengan kode laporan; widget lain tetap tampil.',
  ],
};

export function Beranda() {
  const [p, setP] = React.useState<PeranDemo>('mahasiswa');
  const toast = useToast();
  const ganti = (x: PeranDemo) => {
    setPeranDemo(x);
    setP(x);
    invalidateSiakad('');
  };
  React.useEffect(() => () => setPeranDemo('mahasiswa'), []);
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }} role="group" aria-label="Peran tiruan">
        {(['mahasiswa', 'dosen', 'tendik'] as PeranDemo[]).map((x) => (
          <Button key={x} size="sm" variant={p === x ? 'primary' : 'outline'} onClick={() => ganti(x)}>
            Masuk sebagai {x}
          </Button>
        ))}
      </div>
      <BerandaSaya
        key={p}
        onBukaProfil={() => void toast.add({ title: 'Buka halaman profil (contoh).' })}
        onBukaKeuangan={() => void toast.add({ title: 'Buka halaman keuangan (contoh).' })}
        hrefPengumuman="#/kerangka-portal"
      />
    </div>
  );
}

export function Rakit() {
  const toast = useToast();
  const info = (t: string) => () => void toast.add({ title: t });
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <SapaanBeranda
        nama="Nur"
        keterangan="Panitia PMB · Gelombang 1"
        ilustrasi="pendaftaran"
        lencana={
          <>
            <Badge variant="primary">Panitia</Badge>
            <Badge variant="info">Gelombang 1</Badge>
          </>
        }
        aksi={
          <Button size="sm" variant="outline" onClick={info('Buka profil.')}>
            Lihat profil
          </Button>
        }
      />
      <AksiCepat
        items={[
          { key: 'verif', label: 'Verifikasi berkas', description: '12 menunggu', icon: <FileText />, onClick: info('Buka verifikasi berkas.') },
          { key: 'jadwal', label: 'Jadwal CBT', description: 'Sesi berikutnya 09.00', icon: <CalendarCheck />, onClick: info('Buka jadwal CBT.') },
          { key: 'pesan', label: 'Pesan pendaftar', description: '3 belum dibalas', icon: <MessageSquare />, onClick: info('Buka obrolan.') },
        ]}
      />
      <div style={{ maxWidth: 360 }}>
        <TagihanSaya nim="2304110001" />
      </div>
    </div>
  );
}

export function AksiVarian() {
  const toast = useToast();
  const info = (t: string) => () => void toast.add({ title: t });
  return (
    <AksiCepat
      items={[
        { key: 'verif', label: 'Verifikasi berkas', description: 'Formulir diajukan', icon: <ClipboardCheck />, badge: 12, meta: '3 lewat 2 hari', warna: 'warning', onClick: info('Buka verifikasi.') },
        { key: 'bayar', label: 'Konfirmasi bayar', description: 'Bukti transfer', icon: <Wallet />, badge: 4, warna: 'success', onClick: info('Buka keuangan.') },
        { key: 'jadwal', label: 'Jadwal CBT', description: 'Sesi berikutnya 09.00', icon: <CalendarCheck />, warna: 'info', onClick: info('Buka jadwal.') },
        { key: 'pesan', label: 'Pesan pendaftar', description: 'Obrolan masuk', icon: <MessageSquare />, badge: 'Baru', warna: 'danger', onClick: info('Buka obrolan.') },
        { key: 'umum', label: 'Pengumuman', description: 'Kelulusan gelombang 1', icon: <Megaphone />, meta: 'Terbit Jumat', href: '#/beranda' },
      ]}
    />
  );
}
