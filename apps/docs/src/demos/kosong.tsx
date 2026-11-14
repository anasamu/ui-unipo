import { FileSearch, Inbox, Plus, SearchX } from 'lucide-react';
import { Button, Empty, Skeleton, Spinner } from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Empty, Skeleton & Spinner',
  category: 'Tampilan data',
  description: 'Keadaan kosong selalu memberi jalan keluar. Skeleton untuk muatan lebih dari satu detik, Spinner untuk aksi singkat di dalam tombol atau baris.',
  importLine: "import { Empty, Skeleton, Spinner } from 'unipo-ui';",
  demos: { Kosong: 'Belum ada data', Pencarian: 'Hasil saringan kosong', Kerangka: 'Skeleton', Putar: 'Spinner' },
};

export function Kosong() {
  return <Empty bordered icon={<Inbox />} title="Belum ada surat masuk" description="Surat yang dicatat bagian umum akan muncul di sini." actions={<Button size="sm"><Plus /> Catat surat masuk</Button>} />;
}

export function Pencarian() {
  return <Empty icon={<SearchX />} title="Tidak ada mahasiswa yang cocok" description="Coba kata kunci lain atau hapus saringan angkatan dan status." actions={<><Button variant="outline" size="sm">Hapus saringan</Button></>} />;
}

export function Kerangka() {
  return (
    <div className="demo-stack" style={{ maxWidth: 420 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="demo-row" style={{ gap: 12 }}>
          <Skeleton shape="circle" width={40} height={40} />
          <div style={{ flex: 1, display: 'grid', gap: 8 }}>
            <Skeleton shape="text" width="60%" />
            <Skeleton shape="text" width="35%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Putar() {
  return (
    <div className="demo-row" style={{ gap: 20, color: 'var(--u-primary)' }}>
      <Spinner size="sm" />
      <Spinner />
      <Spinner size="lg" />
      <span className="demo-row" style={{ gap: 8, color: 'var(--u-muted-foreground)', fontSize: 14 }}><Spinner size="sm" /> Memeriksa NIM…</span>
      <FileSearch style={{ display: 'none' }} />
    </div>
  );
}
