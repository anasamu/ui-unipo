import * as React from 'react';
import { Button, Combobox, Field, Input, OptionContent } from 'unipo-ui';
import { CariAtauUnggahDokumen, PilihEntitas, type DokumenDitemukan, type SumberEntitas } from 'unipo-ui/siakad';
import { Handshake } from 'lucide-react';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Cari atau unggah, pilih atau tambah',
  category: 'Formulir',
  layout: 'wide',
  badge: 'baru',
  description:
    'Isian yang tidak membuat pengguna buntu. CariAtauUnggahDokumen mencari dokumen yang sudah ada (berkas saya atau arsip unit); bila tidak ditemukan, tombol "Unggah dokumen …" atau seret berkas langsung mengunggah dengan progres dan memilih hasilnya. PilihEntitas dan Combobox kini punya opsi tambah: bila data yang dicari tidak ada, buka formulir singkat atau simpan langsung, lalu data baru langsung terpilih. Di mobile tombol unggah membuka kamera, galeri, atau berkas perangkat.',
  importLine: "import { CariAtauUnggahDokumen, PilihEntitas } from 'unipo-ui/siakad';\nimport { Combobox } from 'unipo-ui';",
  demos: {
    Dokumen: 'CariAtauUnggahDokumen: cari di /v1/berkas, unggah bila tidak ada',
    Entitas: 'PilihEntitas + tambah: formulir dialog untuk data baru',
    ComboboxTambah: 'Combobox + tambah: simpan langsung dari kata yang diketik',
  },
  props: [
    ['CariAtauUnggahDokumen.value', 'string | null', 'ID dokumen terpilih (UUID /v1/berkas pada sumber bawaan).'],
    ['CariAtauUnggahDokumen.sumber', '{ path, query?, ubah? }', 'Sumber lain, mis. /v1/arsip/dokumen; ubah memetakan baris API.'],
    ['CariAtauUnggahDokumen.setelahUnggah', '(berkas, kata) => Promise<DokumenDitemukan>', 'Daftarkan berkas hasil unggah ke sumber (mis. POST /v1/arsip/dokumen).'],
    ['CariAtauUnggahDokumen.accept', 'string', 'Ekstensi yang diterima, mis. ".pdf,.docx".'],
    ['PilihEntitas.tambah', '{ judul?, label?, hanyaKosong?, form?, onTambah? }', 'form({ kata, selesai }) membuka dialog; onTambah(kata) menyimpan langsung.'],
    ['Combobox.tambah', '{ onTambah(kata), label?, hanyaKosong? }', 'Kembalikan butir baru (atau Promise) agar langsung terpilih.'],
  ],
  notes: ['Unggah memakai useUnggahBerkas: otomatis unggah bertahap untuk berkas besar, bisa dibatalkan dan diulang.', 'Data di halaman ini rekaan.'],
};

export function Dokumen() {
  const [id, setId] = React.useState<string | null>(null);
  const [dok, setDok] = React.useState<DokumenDitemukan | null>(null);
  return (
    <div style={{ display: 'grid', gap: '1rem', maxWidth: 560 }}>
      <Field label="Lampiran SK" description={dok ? `berkas_id terkirim: ${id}` : 'Ketik nama dokumen, mis. "sk" atau "jadwal".'}>
        <CariAtauUnggahDokumen
          value={id}
          onValueChange={(v, d) => {
            setId(v);
            setDok(d);
          }}
          accept=".pdf,.docx,.jpg,.png"
          kategori="dokumen"
        />
      </Field>
    </div>
  );
}

const MITRA = [
  { id: 1, nama: 'PT Telkom Indonesia', jenis: 'BUMN', kota: 'Gorontalo' },
  { id: 2, nama: 'Bank SulutGo', jenis: 'Perbankan', kota: 'Manado' },
  { id: 3, nama: 'Pemkab Pohuwato', jenis: 'Pemerintah', kota: 'Marisa' },
];
const SUMBER_MITRA: SumberEntitas = { nama: 'mitra kerja sama', path: '/v1/kerjasama/mitra', kunci: 'id', judul: (r) => String(r.nama), meta: (r) => `${r.jenis} · ${r.kota}`, ikon: <Handshake /> };

export function Entitas() {
  const [mitra, setMitra] = React.useState<string | null>(null);
  return (
    <div style={{ maxWidth: 560 }}>
      <Field label="Mitra kerja sama" description={mitra ? `mitra_id: ${mitra}` : 'Cari mitra; bila belum ada, tambahkan.'}>
        <PilihEntitas
          jenis={SUMBER_MITRA}
          value={mitra}
          onValueChange={setMitra}
          load={async (q) => MITRA.filter((m) => m.nama.toLowerCase().includes(q.toLowerCase()))}
          tambah={{
            judul: 'Tambah mitra kerja sama',
            form: ({ kata, selesai }) => <FormMitra awal={kata} selesai={selesai} />,
          }}
        />
      </Field>
    </div>
  );
}

function FormMitra({ awal, selesai }: { awal: string; selesai: (r: Record<string, unknown> | null) => void }) {
  const [nama, setNama] = React.useState(awal);
  const [kota, setKota] = React.useState('');
  return (
    <form
      style={{ display: 'grid', gap: '1rem' }}
      onSubmit={(e) => {
        e.preventDefault();
        const baru = { id: MITRA.length + 1, nama, jenis: 'Swasta', kota: kota || '-' };
        MITRA.push(baru);
        selesai(baru);
      }}
    >
      <Field label="Nama mitra" required>
        <Input value={nama} onChange={(e) => setNama(e.target.value)} required />
      </Field>
      <Field label="Kota">
        <Input value={kota} onChange={(e) => setKota(e.target.value)} />
      </Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.5rem' }}>
        <Button type="button" variant="ghost" onClick={() => selesai(null)}>
          Batal
        </Button>
        <Button type="submit" disabled={!nama.trim()}>
          Simpan mitra
        </Button>
      </div>
    </form>
  );
}

export function ComboboxTambah() {
  const [tag, setTag] = React.useState<string[]>(['Akreditasi', 'Beasiswa', 'KKN', 'Wisuda']);
  const [nilai, setNilai] = React.useState<string | null>(null);
  return (
    <div style={{ maxWidth: 420 }}>
      <Field label="Kategori surat" description={nilai ? `Terpilih: ${nilai}` : 'Ketik kategori baru lalu pilih "Tambah".'}>
        <Combobox<string>
          items={tag}
          value={nilai}
          onValueChange={setNilai}
          itemToString={(x) => x}
          itemKey={(x) => x}
          renderItem={(x) => <OptionContent title={x} />}
          tambah={{
            hanyaKosong: true,
            label: (k) => `Tambah kategori “${k}”`,
            onTambah: (k) => {
              setTag((t) => [...t, k]);
              return k;
            },
          }}
        />
      </Field>
    </div>
  );
}
