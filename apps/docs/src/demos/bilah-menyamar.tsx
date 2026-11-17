import * as React from 'react';
import { Button } from 'unipo-ui';
import { BilahMenyamar, type InfoMenyamar } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Bilah masuk sebagai',
  category: 'Mulai',
  order: 4,
  badge: 'baru',
  description:
    'Penanda selama admin "masuk sebagai pengguna" dari Pustikom: bilah tipis satu baris di tepi atas yang menjadi bagian tata letak (isi, sidebar, bilah atas, panel samping, dan dialog bergeser ke bawah lewat --u-offset-atas), sehingga tidak menutupi konten. Mode penuh + database live merah gelap; development dan hanya lihat lebih lembut. Di layar sempit teks diringkas dan tombol kembali menjadi ikon.',
  importLine: "import { BilahMenyamar, type InfoMenyamar } from 'unipo-ui/siakad';",
  demos: {
    Nada: 'Tiga nada: mode penuh + database live, mode penuh + development, hanya lihat (tetap={false} untuk pratinjau di tempat)',
    Menempel: 'Bilah menempel di tepi atas halaman; perhatikan isi dan header docs ikut turun',
  },
  props: [
    ['akun', 'string', 'Username akun yang sedang dibuka.'],
    ['nama', 'string', 'Nama tampilan akun (opsional).'],
    ['menyamar', 'InfoMenyamar { oleh, mode, lingkungan?, berakhir, kembali }', 'Dari /bff/sesi. "Dibuka oleh" tampil sebagai tooltip.'],
    ['tetap', 'boolean', 'Bawaan true: menempel di atas dan mengisi --u-offset-atas. false = tampil di tempat.'],
  ],
};

const jam = Math.floor(Date.now() / 1000) + 3600;
const contoh = (x: Partial<InfoMenyamar>): InfoMenyamar => ({ oleh: '990101', mode: 'penuh', lingkungan: 'live', berakhir: jam, kembali: '#', ...x });

export function Nada() {
  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <BilahMenyamar tetap={false} akun="7700019391" menyamar={contoh({})} />
      <BilahMenyamar tetap={false} akun="7700019391" menyamar={contoh({ lingkungan: 'development' })} />
      <BilahMenyamar tetap={false} akun="7700019391" nama="Siti Rahma" menyamar={contoh({ mode: 'lihat', lingkungan: undefined })} />
    </div>
  );
}

export function Menempel() {
  const [tampil, setTampil] = React.useState(false);
  return (
    <div>
      <Button onClick={() => setTampil((x) => !x)}>{tampil ? 'Sembunyikan bilah' : 'Tampilkan bilah di atas halaman'}</Button>
      {tampil && <BilahMenyamar akun="7700019391" menyamar={contoh({})} />}
    </div>
  );
}
