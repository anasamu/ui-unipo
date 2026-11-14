import { BookOpen, Hash, Tag as TagIcon } from 'lucide-react';
import * as React from 'react';
import { Badge, Kbd, Tag } from '@unipo/ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Badge, Tag & Kbd',
  category: 'Aksi',
  description: 'Badge untuk status (Aktif, Cuti, Lulus), Tag untuk kategori/kata kunci yang bisa diklik atau dihapus, Kbd untuk pintasan papan ketik.',
  importLine: "import { Badge, Tag, Kbd } from '@unipo/ui';",
  demos: { Status: 'Badge status', Bentuk: 'Bentuk dan ukuran', Kategori: 'Tag kategori', Hapus: 'Tag yang bisa dihapus', Pintasan: 'Kbd' },
};

export function Status() {
  return (
    <>
      <Badge variant="success" dot>Aktif</Badge>
      <Badge variant="warning" dot>Cuti</Badge>
      <Badge variant="danger" dot>Drop out</Badge>
      <Badge variant="info" dot>Lulus</Badge>
      <Badge variant="primary">Semester 5</Badge>
      <Badge variant="secondary">Beasiswa KIP</Badge>
      <Badge>Non-aktif</Badge>
      <Badge variant="outline">Draf</Badge>
      <Badge variant="solid">Baru</Badge>
    </>
  );
}

export function Bentuk() {
  return (
    <>
      <Badge variant="primary" shape="square">S1</Badge>
      <Badge variant="primary" size="lg">IPK 3,82</Badge>
      <Badge variant="success" size="lg" dot>Terverifikasi</Badge>
    </>
  );
}

export function Kategori() {
  return (
    <>
      <Tag active icon={<Hash />}>Semua</Tag>
      <Tag render={<a href="#/lencana" />} icon={<BookOpen />}>Akademik</Tag>
      <Tag render={<a href="#/lencana" />}>Kemahasiswaan</Tag>
      <Tag render={<a href="#/lencana" />}>Penelitian</Tag>
      <Tag size="sm" icon={<TagIcon />}>beasiswa</Tag>
    </>
  );
}

export function Hapus() {
  const [tags, setTags] = React.useState(['Teknik Informatika', 'Angkatan 2024', 'Status: Aktif']);
  return (
    <>
      {tags.map((t) => (
        <Tag key={t} onRemove={() => setTags(tags.filter((x) => x !== t))}>{t}</Tag>
      ))}
      {!tags.length && <span className="u-field-description">Semua saringan dihapus.</span>}
    </>
  );
}

export function Pintasan() {
  return (
    <span className="demo-row">
      Cari cepat <Kbd>⌘</Kbd><Kbd>K</Kbd> · Simpan <Kbd>Ctrl</Kbd><Kbd>S</Kbd> · Tutup <Kbd>Esc</Kbd>
    </span>
  );
}
