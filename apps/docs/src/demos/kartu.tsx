import { BadgeCheck, FileText, MoreHorizontal, Users } from 'lucide-react';
import { Alert, Avatar, AvatarGroup, Badge, Button, Card, CardContent, CardFooter, CardHeader, DescriptionList } from 'unipo-ui';
import type { DemoMeta } from '../registry';
import { jsxProps } from '../Playground';

export const meta: DemoMeta = {
  title: 'Card, Alert & Avatar',
  category: 'Tampilan data',
  layout: 'wide',
  description: 'Wadah dasar untuk menyusun widget. Avatar memakai foto profil; bila foto gagal dimuat, inisial dengan warna stabil per nama ditampilkan.',
  importLine: "import { Card, CardHeader, CardContent, CardFooter, Alert, Avatar, AvatarGroup, DescriptionList } from 'unipo-ui';",
  demos: { Kartu: 'Card', Peringatan: 'Alert', Foto: 'Avatar', Grup: 'AvatarGroup' },
  playground: {
    title: 'Playground Alert',
    controls: [
      { name: 'variant', type: 'select', options: ['neutral', 'primary', 'info', 'success', 'warning', 'danger'], default: 'warning' },
      { name: 'title', label: 'Judul', type: 'text', default: 'KRS belum disetujui' },
      { name: 'isi', label: 'Isi', type: 'text', default: 'Dosen PA belum memeriksa KRS Anda. Batas persetujuan 20 Agustus.' },
      { name: 'aksi', label: 'Tombol aksi', type: 'boolean', default: true },
    ],
    render: ({ isi, aksi, ...p }) => (
      <Alert
        {...p}
        actions={
          aksi ? (
            <Button size="sm" variant="outline">
              Hubungi dosen PA
            </Button>
          ) : undefined
        }
        style={{ width: '100%', maxWidth: 560 }}
      >
        {isi}
      </Alert>
    ),
    code: ({ isi, aksi, ...p }) => `<Alert${jsxProps(p, { variant: 'neutral' })}${aksi ? '\n  actions={<Button size="sm" variant="outline">Hubungi dosen PA</Button>}' : ''}>\n  ${isi}\n</Alert>`,
  },
};

export function Kartu() {
  return (
    <div className="demo-grid" style={{ ['--min' as string]: '18rem' }}>
      <Card>
        <CardHeader
          title="Kelas TIF202 · Basis Data"
          description="Senin, 08.00–10.30 · Lab 201"
          action={
            <Button variant="ghost" size="xs" iconOnly aria-label="Aksi">
              <MoreHorizontal />
            </Button>
          }
        />
        <CardContent>
          <DescriptionList
            items={[
              { label: 'Dosen', value: 'Dr. Rahmat Hidayat, M.Kom.' },
              { label: 'Peserta', value: '38 / 40' },
              { label: 'Pertemuan', value: '9 dari 16' },
            ]}
          />
        </CardContent>
        <CardFooter>
          <AvatarGroup
            size="xs"
            people={[{ name: 'Siti Nurhaliza' }, { name: 'Ahmad Fauzi' }, { name: 'Rina Kartika' }, { name: 'Dewi Lestari' }, { name: 'Budi Santoso' }, { name: 'Yusuf Habibie' }]}
          />
          <Button variant="soft" size="sm" style={{ marginInlineStart: 'auto' }}>
            Buka kelas
          </Button>
        </CardFooter>
      </Card>
      <Card variant="muted">
        <CardHeader
          title="Berkas pendaftaran"
          description="3 dari 4 berkas diverifikasi"
          action={
            <Badge variant="warning" dot>
              Kurang 1
            </Badge>
          }
        />
        <CardContent>
          <div className="demo-stack" style={{ gap: 8 }}>
            {['Ijazah / SKL', 'Kartu Keluarga', 'Pas foto'].map((b) => (
              <div key={b} className="demo-row" style={{ justifyContent: 'space-between', fontSize: 14 }}>
                <span className="demo-row" style={{ gap: 8 }}>
                  <FileText size={16} /> {b}
                </span>
                <BadgeCheck size={16} color="var(--u-success)" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card variant="elevated" interactive tabIndex={0}>
        <CardContent>
          <div className="demo-row" style={{ gap: 12 }}>
            <span className="u-choice-card-icon">
              <Users size={18} />
            </span>
            <div>
              <div style={{ fontSize: 13, color: 'var(--u-muted-foreground)' }}>Mahasiswa aktif</div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>4.218</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function Peringatan() {
  return (
    <div className="demo-stack">
      <Alert variant="info" title="Pengisian KRS dibuka 18–29 Agustus">
        Konsultasikan rencana studi dengan dosen PA sebelum mengirim.
      </Alert>
      <Alert variant="success" title="Pembayaran diterima">
        UKT semester ganjil Rp 3.250.000 sudah tercatat.
      </Alert>
      <Alert
        variant="warning"
        title="Berkas KK belum diunggah"
        actions={
          <Button size="sm" variant="outline">
            Unggah
          </Button>
        }
      >
        Pendaftaran tidak bisa diverifikasi sebelum semua berkas lengkap.
      </Alert>
      <Alert variant="danger" title="Sinkronisasi PDDikti gagal">
        Server Neo Feeder tidak merespons. Data akan dicoba kirim ulang otomatis.
      </Alert>
    </div>
  );
}

export function Foto() {
  return (
    <div className="demo-row" style={{ gap: 16 }}>
      <Avatar name="Siti Nurhaliza" size="2xl" />
      <Avatar name="Dr. Rahmat Hidayat, M.Kom." size="xl" status="online" />
      <Avatar name="Ahmad Fauzi" size="lg" badge={<BadgeCheck />} />
      <Avatar name="Rina Kartika" />
      <Avatar name="Budi Santoso" size="sm" shape="square" />
      <Avatar name="Foto rusak" src="https://contoh.invalid/foto.jpg" size="sm" />
    </div>
  );
}

export function Grup() {
  return (
    <AvatarGroup max={5} size="md" people={['Siti Nurhaliza', 'Ahmad Fauzi', 'Rina Kartika', 'Dewi Lestari', 'Budi Santoso', 'Yusuf Habibie', 'Nur Aini', 'Fadli Rahman'].map((name) => ({ name }))} />
  );
}
