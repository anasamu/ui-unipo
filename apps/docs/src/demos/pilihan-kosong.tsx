import * as React from 'react';
import { Layers } from 'lucide-react';
import { Button, Cluster, Combobox, Field, InfoPilihanKosong, Input, Pilihan, Select, Stack, SwitchBaris, type BuatPilihan, type SelectOption } from 'unipo-ui';
import { PilihEntitas, type SumberEntitas } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Pilihan kosong: buat dari pemilih',
  category: 'Formulir',
  layout: 'wide',
  badge: 'baru',
  description:
    'Pemilih yang datanya belum ada tidak membuat pengguna buntu. Bagi yang berhak, tombol buat ada di dalam daftar (di akhir daftar, menonjol saat kosong) dan di kotak info, membuka panel samping, lalu data baru langsung terpilih dan fokus kembali ke pemilih. Yang tidak berhak tidak melihat tombol, hanya keterangan siapa yang mengelola data itu. Satu prop `buat` yang sama untuk Select, Combobox, Pilihan, PilihEntitas, PilihPeriodeAkademik, dan PilihTahunAkademik.',
  importLine: "import { InfoPilihanKosong, Select, type BuatPilihan } from 'unipo-ui';",
  demos: {
    Siklus: 'Siklus mutu: Select + InfoPilihanKosong sebaris (ubah hak untuk melihat dua keadaan)',
    Kategori: 'Kategori: Combobox bercari, nama awal dari kata yang dicari',
    Jenis: 'Jenis: Pilihan berbentuk tombol dengan tombol tambah',
    Skema: 'Skema hibah: PilihEntitas dengan panel samping',
    TidakBerhak: 'Tidak berhak: teks unit pengelola, tanpa tombol',
  },
  props: [
    ['buat.label', "ReactNode | (kata) => ReactNode", 'Teks tombol: kata kerja + nama data, mis. "Mulai siklus baru".'],
    ['buat.boleh', 'boolean', 'Hak membuat (dari server/RBAC). false = tanpa tombol, tampil pengelola.'],
    ['buat.pengelola', 'ReactNode', 'Unit pengelola untuk yang tidak berhak: "Data ini dikelola LPM."'],
    ['buat.nama', 'string', 'Nama data, huruf kecil: "siklus mutu" → "Belum ada siklus mutu."'],
    ['buat.panel', '({ kata, selesai }) => ReactNode', 'Formulir di panel samping. selesai(baru) memilih data baru; selesai(null) batal.'],
    ['buat.onBuat', '(kata) => T | Promise<T>', 'Tanpa panel: simpan langsung dari kata yang diketik.'],
    ['buat.segarkan', '() => unknown', 'Perbarui daftar setelah tersimpan (invalidate query).'],
    ['buat.hanyaKosong', 'boolean', 'Tombol di daftar hanya saat hasil kosong.'],
    ['buat.judul / keterangan / ukuranPanel', '', 'Kepala dan lebar panel samping.'],
    ['Select.memuat / galat', 'boolean / ReactNode', 'Memuat dan galat bukan keadaan kosong.'],
    ['InfoPilihanKosong', '{ buat, kosong, memuat, galat, letak, fokusKe, onDibuat, children }', 'Kotak info kosong. letak="samping" setinggi isian, sebaris dengan pemilih.'],
  ],
  notes: [
    'Untuk Select/Pilihan, selesai() menerima opsi { value, label } supaya data baru langsung tampil walau daftar dari server belum dimuat ulang; atau nilainya saja.',
    'Prop lama `tambah` di Combobox dan PilihEntitas tetap berfungsi (diubah ke `buat`); formulir `tambah.form` kini terbuka di panel samping.',
    'Data di halaman ini rekaan.',
  ],
};

type Opsi = SelectOption<string>;

/** Formulir pembuatan sederhana di panel samping: satu nama + Simpan/Batal. */
function FormNama({ label, awal = '', onSimpan, onBatal }: { label: string; awal?: string; onSimpan: (nama: string) => void; onBatal: () => void }) {
  const [nama, setNama] = React.useState(awal);
  const [sibuk, setSibuk] = React.useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!nama.trim()) return;
        setSibuk(true);
        await new Promise((r) => setTimeout(r, 400));
        onSimpan(nama.trim());
      }}
    >
      <Stack gap={4}>
        <Field label={label} required>
          <Input value={nama} onChange={(e) => setNama(e.target.value)} autoFocus />
        </Field>
        <Cluster justify="end">
          <Button variant="outline" onClick={onBatal}>
            Batal
          </Button>
          <Button type="submit" loading={sibuk} disabled={!nama.trim()}>
            Simpan
          </Button>
        </Cluster>
      </Stack>
    </form>
  );
}

let urut = 100;
const idBaru = () => String(++urut);

export function Siklus() {
  const [boleh, setBoleh] = React.useState(true);
  const [opsi, setOpsi] = React.useState<Opsi[]>([]);
  const [id, setId] = React.useState<string | null>(null);
  const buat: BuatPilihan<Opsi | string> = {
    label: 'Mulai siklus baru',
    nama: 'siklus mutu',
    boleh,
    pengelola: 'LPM',
    keterangan: 'Satu siklus PPEPP per tahun. Unit kerja mulai mengisi setelah siklus dibuat.',
    // Di aplikasi: simpan ke API, lalu selesai(baru); `segarkan` meng-invalidate query daftar siklus.
    panel: ({ selesai }) => (
      <FormNama
        label="Nama siklus"
        awal={`Siklus ${new Date().getFullYear()}`}
        onBatal={() => selesai(null)}
        onSimpan={(nama) => {
          const baru = { value: idBaru(), label: nama };
          setOpsi((d) => [...d, baru]);
          selesai(baru);
        }}
      />
    ),
  };
  return (
    <Stack gap={4} style={{ maxWidth: 760 }}>
      <SwitchBaris label="Pengguna berhak membuat siklus (admin LPM)" checked={boleh} onCheckedChange={setBoleh} />
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 'var(--u-space-3)' }}>
        <Field label="Siklus SPMI" style={{ flex: '0 1 16rem', minWidth: 0 }}>
          <Select id="demo-siklus" aria-label="Siklus SPMI" options={opsi} value={id} onValueChange={setId} buat={buat} />
        </Field>
        <InfoPilihanKosong buat={buat} kosong={!opsi.length} letak="samping" fokusKe="demo-siklus" onDibuat={(o) => setId(typeof o === 'string' ? o : o.value)} />
      </div>
      <Cluster>
        <Button variant="ghost" size="sm" onClick={() => (setOpsi([]), setId(null))}>
          Kosongkan contoh
        </Button>
      </Cluster>
    </Stack>
  );
}

type Kategori = { id: string; nama: string };
export function Kategori() {
  const [daftar, setDaftar] = React.useState<Kategori[]>([
    { id: '1', nama: 'Surat keputusan' },
    { id: '2', nama: 'Surat edaran' },
  ]);
  const [v, setV] = React.useState<Kategori | null>(null);
  return (
    <Field label="Kategori arsip" description="Ketik kategori yang belum ada, mis. “Nota dinas”." style={{ maxWidth: 420 }}>
      <Combobox<Kategori>
        aria-label="Kategori arsip"
        items={daftar}
        value={v}
        onValueChange={setV}
        itemKey={(k) => k.id}
        itemToString={(k) => k.nama}
        placeholder="Cari kategori"
        buat={{
          boleh: true,
          nama: 'kategori',
          label: (k) => (k ? `Tambah kategori “${k}”` : 'Tambah kategori'),
          panel: ({ kata, selesai }) => (
            <FormNama
              label="Nama kategori"
              awal={kata}
              onBatal={() => selesai(null)}
              onSimpan={(nama) => {
                const baru = { id: idBaru(), nama };
                setDaftar((d) => [...d, baru]);
                selesai(baru);
              }}
            />
          ),
        }}
      />
    </Field>
  );
}

export function Jenis() {
  const [opsi, setOpsi] = React.useState<Opsi[]>([
    { value: 'internal', label: 'Internal' },
    { value: 'mandiri', label: 'Mandiri' },
  ]);
  const [v, setV] = React.useState<string | null>('internal');
  return (
    <Field label="Jenis pendanaan">
      <Pilihan
        aria-label="Jenis pendanaan"
        options={opsi}
        value={v}
        onValueChange={setV}
        buat={{
          boleh: true,
          label: 'Tambah jenis',
          nama: 'jenis pendanaan',
          panel: ({ selesai }) => (
            <FormNama
              label="Nama jenis"
              onBatal={() => selesai(null)}
              onSimpan={(nama) => {
                const baru = { value: idBaru(), label: nama };
                setOpsi((o) => [...o, baru]);
                selesai(baru);
              }}
            />
          ),
        }}
      />
    </Field>
  );
}

const SKEMA = [
  { id: 1, nama: 'Penelitian Dosen Pemula', jenis: 'Penelitian' },
  { id: 2, nama: 'PkM Desa Binaan', jenis: 'Pengabdian' },
];
const SUMBER_SKEMA: SumberEntitas = { nama: 'skema hibah', path: '/v1/lppm/skema', kunci: 'id', judul: (r) => String(r.nama), meta: (r) => String(r.jenis), ikon: <Layers /> };

export function Skema() {
  const data = React.useRef([...SKEMA]);
  const [v, setV] = React.useState<string | null>(null);
  return (
    <Field label="Skema hibah" style={{ maxWidth: 420 }}>
      <PilihEntitas
        jenis={SUMBER_SKEMA}
        value={v}
        onValueChange={setV}
        load={async (q) => data.current.filter((s) => s.nama.toLowerCase().includes(q.toLowerCase()))}
        buat={{
          boleh: true,
          pengelola: 'LP2M',
          judul: 'Skema hibah baru',
          panel: ({ kata, selesai }) => (
            <FormNama
              label="Nama skema"
              awal={kata}
              onBatal={() => selesai(null)}
              onSimpan={(nama) => {
                const baru = { id: data.current.length + 1, nama, jenis: 'Penelitian' };
                data.current.push(baru);
                selesai(baru);
              }}
            />
          ),
        }}
      />
    </Field>
  );
}

export function TidakBerhak() {
  const buat: BuatPilihan<Opsi | string> = { boleh: false, nama: 'periode anggaran', pengelola: 'Bagian Keuangan' };
  return (
    <Stack gap={3} style={{ maxWidth: 560 }}>
      <Field label="Periode anggaran">
        <Select aria-label="Periode anggaran" options={[]} value={null} buat={buat} />
      </Field>
      <InfoPilihanKosong buat={buat} />
    </Stack>
  );
}
