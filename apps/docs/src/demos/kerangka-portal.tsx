import * as React from 'react';
import { ArrowRight, GraduationCap } from 'lucide-react';
import { Button, CtaBand, Footer, PitaPengumuman, Section, UnipoAppLogo, type AnnouncementVariant } from 'unipo-ui';
import { DetailPengumumanPortal, FooterPortal, KerangkaPortal, PengumumanPortal, PengumumanSaya, PitaPengumumanPortal, PopupPengumumanPortal } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Kerangka portal: menu, footer, pengumuman',
  category: 'Portal & landing',
  layout: 'full',
  order: 1,
  badge: 'baru',
  description:
    'Bagian tetap setiap situs portal dan landing page, semuanya dari pengaturan situs di /v1/portal. KerangkaPortal menyusun pita pengumuman, navbar dengan menu utama + mega menu dan pita kontak, kaki halaman, dan popup banner dalam satu komponen. Tiap bagian juga bisa dipakai sendiri. Pengumuman punya lima varian tampilan (daftar, kartu, ringkas, sorotan, linimasa), versi untuk akun yang masuk (sesuai prodi dan angkatan), dan halaman detail dengan lampiran.',
  importLine:
    "import { KerangkaPortal, FooterPortal, TopbarPortal, PitaPengumumanPortal, PopupPengumumanPortal, PengumumanPortal, PengumumanSaya, DetailPengumumanPortal } from 'unipo-ui/siakad';\nimport { Footer, PitaPengumuman, TopbarKontak, AnnouncementList } from 'unipo-ui';",
  demos: {
    Kerangka: 'KerangkaPortal: pita + navbar (menu utama, mega menu, pita kontak) + isi + footer',
    Footer: 'FooterPortal: tiga varian dari profil situs, menu footer, dan tautan cepat',
    Pita: 'PitaPengumumanPortal dan PitaPengumuman: darurat, penting, biasa',
    Pengumuman: 'PengumumanPortal variant: daftar, kartu, ringkas, sorotan, linimasa',
    Saya: 'PengumumanSaya: pengumuman sesuai akun yang masuk, untuk dasbor',
    Detail: 'DetailPengumumanPortal: isi, nomor, masa berlaku, lampiran',
    Popup: 'PopupPengumumanPortal: banner posisi popup, sekali per pengunjung',
    Manual: 'Footer dan PitaPengumuman tanpa API (data sendiri)',
  },
  props: [
    [
      'KerangkaPortal',
      '{ situs, app?, pita?, popup?, topbar?, navbar?, footer?, href?, bahasa? }',
      'navbar dan footer diteruskan ke NavbarPortal dan FooterPortal (actions, search, transparent, variant, ajakan, …).',
    ],
    ['FooterPortal.grupTautan', "Array<'layanan' | 'terkait' | 'mitra'>", "Grup /v1/portal/tautan yang jadi kolom. Bawaan ['layanan']."],
    ['Footer.variant', "'gelap' | 'terang' | 'ringkas'", 'gelap tetap gelap di kedua mode; ringkas untuk aplikasi yang sudah masuk.'],
    ['PitaPengumumanPortal.prioritas', "Array<'darurat' | 'penting' | 'biasa'>", 'Pengumuman yang naik ke pita, ditambah banner posisi pita.'],
    ['PengumumanPortal.variant', "'daftar' | 'kartu' | 'ringkas' | 'sorotan' | 'linimasa'", 'Sama dengan AnnouncementList.variant.'],
    ['PengumumanSaya', '{ jumlah?, variant?, href? }', '/v1/portal/pengumuman/saya: sasaran kelompok, prodi, dan angkatan dicocokkan server.'],
    ['DetailPengumumanPortal', '{ id, situs?, onKembali?, bahasa? }', 'id berupa angka atau slug (slug butuh situs). Isi HTML disaring dulu.'],
  ],
  notes: [
    'Scope token: portal:read. PengumumanSaya butuh token pengguna (bukan client credentials).',
    'Isi menu (lokasi utama, atas, footer), kontak, media sosial, tautan cepat, dan banner diatur admin situs di Humas/Pustikom; aplikasi tidak perlu diubah saat isinya berganti.',
    'Pita dan popup yang ditutup diingat di browser pengunjung (localStorage) dan muncul lagi bila isinya berganti.',
  ],
};

export function Kerangka() {
  return (
    <div style={{ border: '1px solid var(--u-border)', borderRadius: 12, overflow: 'hidden' }}>
      <KerangkaPortal
        situs="univ"
        app="humas"
        popup={false}
        pita={{ ingat: false }}
        navbar={{
          sticky: false,
          mobileBreakpoint: 760,
          actions: (
            <Button size="sm">
              <GraduationCap /> Daftar
            </Button>
          ),
        }}
        footer={{
          ajakan: (
            <CtaBand
              title="Pendaftaran gelombang 1 dibuka"
              description="Potongan biaya pendaftaran 50% sampai 31 Januari."
              actions={
                <Button>
                  Daftar sekarang <ArrowRight />
                </Button>
              }
            />
          ),
        }}
      >
        <div style={{ padding: '2.5rem 1.25rem', maxWidth: '80rem', margin: '0 auto', display: 'grid', gap: '2.5rem' }}>
          <Section
            eyebrow="Isi halaman"
            title="Kampus yang tumbuh bersama daerah"
            description="Pita, navbar, dan kaki halaman di atas dan di bawah diambil dari pengaturan situs. Isi halaman Anda di sini."
          />
          <Section title="Pengumuman" href="/pengumuman">
            <PengumumanPortal situs="univ" jumlah={3} variant="kartu" />
          </Section>
        </div>
      </KerangkaPortal>
    </div>
  );
}

export function Footer_() {
  const [v, setV] = React.useState<'gelap' | 'terang' | 'ringkas'>('gelap');
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }} role="group" aria-label="Varian">
        {(['gelap', 'terang', 'ringkas'] as const).map((x) => (
          <Button key={x} size="sm" variant={v === x ? 'primary' : 'outline'} onClick={() => setV(x)}>
            {x}
          </Button>
        ))}
      </div>
      <div style={{ border: '1px solid var(--u-border)', borderRadius: 12, overflow: 'hidden' }}>
        <FooterPortal situs="univ" app="humas" variant={v} grupTautan={['layanan', 'terkait']} />
      </div>
    </div>
  );
}
export { Footer_ as Footer };

export function Pita() {
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ border: '1px solid var(--u-border)', borderRadius: 12, overflow: 'hidden' }}>
        <PitaPengumumanPortal situs="univ" ingat={false} />
      </div>
      {(['darurat', 'penting', 'biasa'] as const).map((p) => (
        <div key={p} style={{ border: '1px solid var(--u-border)', borderRadius: 12, overflow: 'hidden' }}>
          <PitaPengumuman
            items={[
              {
                id: p,
                priority: p,
                title:
                  p === 'darurat'
                    ? 'SIAKAD tidak dapat diakses Sabtu 22.00–04.00 WITA'
                    : p === 'penting'
                      ? 'Batas pembayaran UKT diperpanjang sampai 30 November'
                      : 'Wisuda periode II digelar 12 Desember',
                href: '#',
              },
            ]}
          />
        </div>
      ))}
    </div>
  );
}

const VARIAN: AnnouncementVariant[] = ['daftar', 'kartu', 'ringkas', 'sorotan', 'linimasa'];
export function Pengumuman() {
  const [v, setV] = React.useState<AnnouncementVariant>('kartu');
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }} role="group" aria-label="Varian">
        {VARIAN.map((x) => (
          <Button key={x} size="sm" variant={v === x ? 'primary' : 'outline'} onClick={() => setV(x)}>
            {x}
          </Button>
        ))}
      </div>
      <PengumumanPortal situs="univ" turunan jumlah={v === 'kartu' ? 6 : 8} variant={v} />
    </div>
  );
}

export function Saya() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))', gap: '1.5rem' }}>
      <Section title="Pengumuman untuk Anda" description="Ringkas, untuk kolom samping dasbor">
        <PengumumanSaya />
      </Section>
      <Section title="Pengumuman untuk Anda" description="Sorotan, untuk beranda aplikasi">
        <PengumumanSaya variant="sorotan" jumlah={4} />
      </Section>
    </div>
  );
}

export function Detail() {
  const [id, setId] = React.useState<number | null>(2);
  return id ? (
    <DetailPengumumanPortal id={id} onKembali={() => setId(null)} />
  ) : (
    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
      {[1, 2, 3, 5].map((n) => (
        <Button key={n} variant="outline" size="sm" onClick={() => setId(n)}>
          Buka pengumuman #{n}
        </Button>
      ))}
    </div>
  );
}

export function Popup() {
  const [n, setN] = React.useState(0);
  return (
    <div>
      <Button variant="outline" onClick={() => setN((x) => x + 1)}>
        Tampilkan popup banner
      </Button>
      {n > 0 && <PopupPengumumanPortal key={n} situs="univ" ingat={false} tunda={0} />}
    </div>
  );
}

export function Manual() {
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ border: '1px solid var(--u-border)', borderRadius: 12, overflow: 'hidden' }}>
        <PitaPengumuman
          items={[
            { id: 1, title: 'Pendaftaran PMB gelombang 1 dibuka', href: '#', cta: 'Daftar', priority: 'biasa' },
            { id: 2, title: 'Ujian CBT gelombang 1 dimulai 5 Februari', href: '#', priority: 'penting' },
          ]}
        />
      </div>
      <div style={{ border: '1px solid var(--u-border)', borderRadius: 12, overflow: 'hidden' }}>
        <Footer
          variant="terang"
          brand={<UnipoAppLogo app="pmb" />}
          description="Portal resmi Penerimaan Mahasiswa Baru Universitas Pohuwato."
          kontak={{ whatsapp: '0812 4400 2026', email: 'pmb@unipo.ac.id', jam: 'Senin–Sabtu, 08.00–20.00 WITA' }}
          sosial={[
            { jenis: 'instagram', url: 'https://instagram.com/pmb.unipo' },
            { jenis: 'tiktok', url: 'https://tiktok.com/@pmb.unipo' },
          ]}
          columns={[
            {
              title: 'Pendaftar',
              items: [
                { label: 'Buat akun', href: '/daftar' },
                { label: 'Masuk', href: '/masuk' },
                { label: 'Jalur dan biaya', href: '/jalur' },
              ],
            },
            {
              title: 'Informasi',
              items: [
                { label: 'Pengumuman', href: '/pengumuman' },
                { label: 'Tanya jawab', href: '/faq' },
                { label: 'Situs UNIPO', href: 'https://unipo.ac.id', external: true },
              ],
            },
          ]}
          tautanBawah={[{ label: 'Kebijakan privasi', href: '/privasi' }]}
          namaHakCipta="Panitia PMB Universitas Pohuwato"
        />
      </div>
    </div>
  );
}
