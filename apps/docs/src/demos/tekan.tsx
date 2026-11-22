import * as React from 'react';
import { BookOpen, CalendarDays, ChevronRight, FileText, Users } from 'lucide-react';
import { Avatar, Badge, Tekan } from 'unipo-ui';
import type { DemoMeta } from '../registry';
import { jsxProps } from '../Playground';

export const meta: DemoMeta = {
  title: 'Tekan',
  category: 'Aksi',
  description:
    'Permukaan yang bisa diklik: kartu, baris daftar, dan chip. Selalu <button> atau <a href>, bisa ditekan dengan Enter/Space, cincin fokus dari token, dan status nonaktif/terpilih/kini terbaca pembaca layar. Pakai ini, bukan <div onClick>.',
  importLine: "import { Tekan } from 'unipo-ui';",
  demos: { Kartu: 'Kartu', Baris: 'Baris daftar (navigasi)', Chip: 'Chip pilihan', Tautan: 'Sebagai tautan', Polos: 'Polos dengan kelas sendiri' },
  props: [
    ['bentuk', "'polos' | 'kartu' | 'baris' | 'chip'", 'Gaya bawaan. polos = hanya reset + fokus (bawa className sendiri).'],
    ['href', 'string', 'Render sebagai <a href>; Enter mengikuti tautan, Space juga mengaktifkan.'],
    ['terpilih', 'boolean', 'Status pilihan/toggle: aria-pressed (tombol), aria-checked (role checkbox/radio), aria-selected (role option/treeitem/row/tab).'],
    ['kini', "boolean | 'page' | 'step' | 'location' | 'date'", 'Butir yang sedang dibuka di navigasi (aria-current).'],
    ['disabled', 'boolean', 'Nonaktif: disabled untuk <button>, aria-disabled + keluar dari urutan Tab untuk elemen lain.'],
    ['elemen', "'button' | 'a' | 'div' | 'span' | 'li'", 'Bawaan button (a bila href). div/span/li hanya untuk kartu berisi tombol lain atau widget komposit dengan role.'],
    ['role', 'AriaRole', 'Peran untuk widget komposit (option, treeitem, checkbox, row).'],
    ['type', "'button' | 'submit' | 'reset'", 'Bawaan button (tidak mengirim form).'],
  ],
  notes: [
    'Kapan memakai Button: aksi berlabel kata kerja (Simpan, Ajukan). Kapan memakai Tekan: seluruh kartu/baris/chip menjadi sasaran klik.',
    'Kartu yang berisi tombol lain (mis. menu ⋯) tidak boleh berupa <button> utuh: pakai elemen="div" (role button, Enter/Space hanya saat kartu itu sendiri yang difokus) atau letakkan Tekan sebagai judul kartu.',
  ],
  playground: {
    controls: [
      { name: 'children', label: 'Label', type: 'text', default: 'Semester 3' },
      { name: 'bentuk', type: 'select', options: ['chip', 'kartu', 'baris', 'polos'], default: 'chip' },
      { name: 'terpilih', type: 'boolean', default: false },
      { name: 'disabled', type: 'boolean', default: false },
    ],
    render: ({ children, ...p }) => <Tekan {...p}>{children}</Tekan>,
    code: ({ children, ...p }) => `<Tekan${jsxProps(p, { bentuk: 'polos', terpilih: false, disabled: false })} onClick={…}>\n  ${children}\n</Tekan>`,
  },
};

const KELAS = [
  { id: 'a', judul: 'Algoritma dan Pemrograman', meta: 'TI-3A · 3 SKS', ikon: BookOpen, status: 'Berjalan' },
  { id: 'b', judul: 'Basis Data', meta: 'TI-3B · 3 SKS', ikon: FileText, status: 'Berjalan' },
  { id: 'c', judul: 'Etika Profesi', meta: 'TI-3A · 2 SKS', ikon: Users, status: 'Selesai' },
];

export function Kartu() {
  const [pilih, setPilih] = React.useState('a');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(14rem, 1fr))', gap: 'var(--u-space-3)', width: '100%' }}>
      {KELAS.map((k) => (
        <Tekan key={k.id} bentuk="kartu" terpilih={pilih === k.id} onClick={() => setPilih(k.id)}>
          <k.ikon aria-hidden style={{ width: '1.25rem', height: '1.25rem' }} />
          <strong>{k.judul}</strong>
          <span style={{ color: 'var(--u-muted-foreground)', fontSize: 'var(--u-text-sm)' }}>{k.meta}</span>
          <Badge variant={k.status === 'Selesai' ? 'neutral' : 'success'}>{k.status}</Badge>
        </Tekan>
      ))}
      <Tekan bentuk="kartu" disabled>
        <CalendarDays aria-hidden style={{ width: '1.25rem', height: '1.25rem' }} />
        <strong>Kelas semester depan</strong>
        <span style={{ color: 'var(--u-muted-foreground)', fontSize: 'var(--u-text-sm)' }}>Dibuka setelah KRS disetujui</span>
      </Tekan>
    </div>
  );
}

const ORANG = ['Siti Aminah', 'Rahmat Hidayat', 'Nur Fadilah'];

export function Baris() {
  const [kini, setKini] = React.useState(ORANG[0]);
  return (
    <nav aria-label="Daftar mahasiswa bimbingan" style={{ display: 'grid', gap: 'var(--u-space-1)', width: '100%', maxWidth: '24rem' }}>
      {ORANG.map((n) => (
        <Tekan key={n} bentuk="baris" kini={kini === n ? 'page' : undefined} onClick={() => setKini(n)}>
          <Avatar name={n} size="sm" />
          <span style={{ flex: 1, minWidth: 0 }}>{n}</span>
          <ChevronRight aria-hidden style={{ width: '1rem', height: '1rem', color: 'var(--u-muted-foreground)' }} />
        </Tekan>
      ))}
    </nav>
  );
}

const SEMESTER = ['Semua', 'Semester 1', 'Semester 3', 'Semester 5', 'Semester 7'];

export function Chip() {
  const [aktif, setAktif] = React.useState<string[]>(['Semua']);
  const ubah = (s: string) => setAktif((a) => (s === 'Semua' ? ['Semua'] : a.includes(s) ? a.filter((x) => x !== s) : [...a.filter((x) => x !== 'Semua'), s]));
  return (
    <div role="group" aria-label="Saring semester" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--u-space-2)' }}>
      {SEMESTER.map((s) => (
        <Tekan key={s} bentuk="chip" terpilih={aktif.includes(s)} onClick={() => ubah(s)}>
          {s}
        </Tekan>
      ))}
      <Tekan bentuk="chip" disabled>
        Semester 9
      </Tekan>
    </div>
  );
}

export function Tautan() {
  return (
    <div style={{ display: 'grid', gap: 'var(--u-space-2)', width: '100%', maxWidth: '24rem' }}>
      <Tekan bentuk="kartu" href="#kalender-akademik">
        <strong>Kalender akademik</strong>
        <span style={{ color: 'var(--u-muted-foreground)', fontSize: 'var(--u-text-sm)' }}>Tautan biasa: buka di tab baru dengan Ctrl/⌘ + klik</span>
      </Tekan>
      <Tekan bentuk="baris" href="#krs" kini="page">
        <FileText aria-hidden style={{ width: '1rem', height: '1rem' }} />
        KRS (halaman ini)
      </Tekan>
    </div>
  );
}

export function Polos() {
  return (
    <Tekan
      onClick={() => {}}
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--u-space-2)', padding: 'var(--u-space-2) var(--u-space-3)', borderRadius: 'var(--u-radius)', background: 'var(--u-muted)' }}
    >
      <Users aria-hidden style={{ width: '1rem', height: '1rem' }} />
      Bentuk polos memakai gaya widget sendiri, fokus dan papan ketik tetap standar
    </Tekan>
  );
}
