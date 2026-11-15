import * as React from 'react';
import { Button, useToast } from 'unipo-ui';
import { AksiCepat, BerandaSaya, SapaanBeranda, TagihanSaya, invalidateSiakad } from 'unipo-ui/siakad';
import { CalendarCheck, FileText, MessageSquare } from 'lucide-react';
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
  },
  props: [
    ['BerandaSaya.onBukaProfil / onBukaKeuangan', '() => void', 'Navigasi ke halaman profil dan keuangan aplikasi Anda (mis. <ModulProfilSaya tab={[…]} />).'],
    ['BerandaSaya.aksiTambahan', 'AksiCepatItem[]', 'Petak aksi cepat milik aplikasi Anda, diletakkan di ujung deret.'],
    ['BerandaSaya.hrefPengumuman', 'string', 'Tautan "Semua" di panel pengumuman.'],
    ['AksiCepatItem.modal', '(trigger) => ReactNode', 'Petak membuka modal fitur, mis. (t) => <ModalAmbilKrs trigger={t} />.'],
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
      <SapaanBeranda nama="Nur" keterangan="Panitia PMB · Gelombang 1" ilustrasi="pendaftaran" />
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
