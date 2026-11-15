import * as React from 'react';
import { Bell } from 'lucide-react';
import { ANIMASI_FITUR, AngkaBerjalan, Animasi, Bertahap, Button, Card, CardContent, CentangSukses, IkonKotak, TitikMengetik, type JenisAnimasi } from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Animasi',
  category: 'Fondasi',
  layout: 'wide',
  order: 40,
  badge: 'baru',
  description:
    '14 jenis animasi untuk widget dan komponen, dipilih sesuai fitur: lonceng untuk notifikasi, balik halaman untuk kalender/berita, naik untuk unggah/pembayaran, putar untuk sinkronisasi, pantul untuk prestasi/kelulusan, goyang untuk galat. Hanya transform/opacity (ringan) dan otomatis mati bila pengguna memilih "kurangi gerakan".',
  importLine: "import { Animasi, Bertahap, AngkaBerjalan, CentangSukses, TitikMengetik, animasiFitur } from 'unipo-ui';",
  demos: { Jenis: 'Semua jenis (klik untuk mengulang)', Fitur: 'Animasi per fitur', Kartu: 'Kartu bertahap + angka berjalan', Sukses: 'Centang sukses dan mengetik' },
  props: [
    ['jenis', 'JenisAnimasi', 'masuk, muncul, geser, pantul, sukses, goyang, denyut, mengambang, lonceng, naik, balik, putar, kedip, ketik.'],
    ['pemicu', "'muat' | 'terlihat' | 'hover' | 'selalu'", 'Kapan berjalan. "terlihat" menunggu elemen masuk layar.'],
    ['tunda', 'number', 'Urutan (×60 ms) atau milidetik bila > 20.'],
    ['ulang', 'Key', 'Ganti nilainya untuk menjalankan ulang.'],
  ],
};

const SEMUA: JenisAnimasi[] = ['masuk', 'muncul', 'geser', 'pantul', 'sukses', 'goyang', 'denyut', 'mengambang', 'lonceng', 'naik', 'balik', 'putar', 'kedip', 'ketik'];

export function Jenis() {
  const [n, setN] = React.useState(0);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(9rem, 1fr))', gap: '.75rem' }} onClick={() => setN((x) => x + 1)}>
      {SEMUA.map((j) => (
        <Card key={j}>
          <CardContent style={{ display: 'grid', justifyItems: 'center', gap: '.5rem', padding: '1rem' }}>
            <Animasi jenis={j} ulang={`${j}${n}`}>
              <IkonKotak nada="indigo" gerak="tidak">
                <Bell />
              </IkonKotak>
            </Animasi>
            <code>{j}</code>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function Fitur() {
  return (
    <div className="u-table-wrap">
    <table className="u-table" style={{ width: '100%' }}>
      <thead>
        <tr>
          <th>Fitur</th>
          <th>Animasi</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(ANIMASI_FITUR).map(([f, j]) => (
          <tr key={f}>
            <td>{f}</td>
            <td>
              <code>{j}</code>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

export function Kartu() {
  const [n, setN] = React.useState(1240);
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(11rem, 1fr))', gap: '.75rem' }}>
        <Bertahap jenis="pantul">
          {['Mahasiswa aktif', 'Pendaftar PMB', 'Tagihan lunas', 'Tiket terbuka'].map((t, i) => (
            <Card key={t}>
              <CardContent style={{ padding: '1rem' }}>
                <small style={{ color: 'var(--u-muted-foreground)' }}>{t}</small>
                <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                  <AngkaBerjalan nilai={Math.round(n / (i + 1))} />
                </div>
              </CardContent>
            </Card>
          ))}
        </Bertahap>
      </div>
      <Button variant="outline" onClick={() => setN((x) => x + 317)} style={{ justifySelf: 'start' }}>
        Tambah data
      </Button>
    </div>
  );
}

export function Sukses() {
  const [k, setK] = React.useState(0);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
      <CentangSukses key={`a${k}`} />
      <CentangSukses key={`b${k}`} nada="danger" label="Gagal" />
      <TitikMengetik />
      <Button variant="ghost" onClick={() => setK((x) => x + 1)}>
        Ulangi
      </Button>
    </div>
  );
}
