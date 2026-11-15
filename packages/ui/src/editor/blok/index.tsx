import * as React from 'react';
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react';
import { Button } from '../../components/actions';
import { Field, Input, SegmentedControl, Switch } from '../../components/forms';
import { useEditor } from '../konteks';
import { DEF, type Blok, type TipeBlok } from '../tipe';
import { Berkas, Galeri, Gambar, Peta, urlPeta, Video } from './Media';
import { Akordion, Daftar, Judul, Kode, Kutipan, Paragraf, Sorotan } from './Teks';
import { aturRasio, Kolom, Pemisah, Spasi, Tabel, TombolBlok } from './Tata';
import type { PropsBlok } from './props';

export type { OpsBlok, PropsBlok } from './props';
export { urlPeta } from './Media';

/** Komponen sunting di kanvas untuk tiap tipe blok. */
export const RENDER: Record<TipeBlok, React.ComponentType<PropsBlok>> = {
  paragraf: Paragraf,
  judul: Judul,
  daftar: Daftar,
  kutipan: Kutipan,
  kode: Kode,
  sorotan: Sorotan,
  akordion: Akordion,
  gambar: Gambar,
  galeri: Galeri,
  video: Video,
  berkas: Berkas,
  peta: Peta,
  tombol: TombolBlok,
  pemisah: Pemisah,
  spasi: Spasi,
  kolom: Kolom,
  tabel: Tabel,
};

/** Tipe yang boleh diubah satu sama lain lewat tombol tipe di bilah blok (teks utama dipertahankan). */
export const BISA_UBAH: TipeBlok[] = ['paragraf', 'judul', 'kutipan', 'daftar', 'sorotan'];

const teksUtama = (b: Blok): string => (Array.isArray(b.data.item) ? (b.data.item as unknown[]).filter((x) => typeof x === 'string').join('<br>') : String(b.data.teks ?? ''));

export function ubahTipe(b: Blok, ke: TipeBlok): Blok {
  const teks = teksUtama(b);
  const data = ke === 'daftar' ? { ...DEF.daftar.data(), item: teks.split(/<br\s*\/?>/i) } : { ...DEF[ke].data(), teks };
  return { id: b.id, tipe: ke, data };
}

function Pilihan<T extends string>({ label, nilai, ganti, item }: { label: string; nilai: T; ganti: (v: T) => void; item: Array<{ v: T; label: React.ReactNode; aria?: string }> }) {
  return (
    <Field label={label}>
      <SegmentedControl<T> aria-label={label} fullWidth value={nilai} onValueChange={ganti} options={item.map((x) => ({ value: x.v, label: x.label, 'aria-label': x.aria }))} />
    </Field>
  );
}

function Rata({ nilai, ganti }: { nilai?: string; ganti: (v: string) => void }) {
  return (
    <Pilihan
      label="Perataan"
      nilai={nilai === 'tengah' || nilai === 'kanan' ? nilai : 'kiri'}
      ganti={ganti}
      item={[
        { v: 'kiri', label: <AlignLeft aria-hidden />, aria: 'Kiri' },
        { v: 'tengah', label: <AlignCenter aria-hidden />, aria: 'Tengah' },
        { v: 'kanan', label: <AlignRight aria-hidden />, aria: 'Kanan' },
      ]}
    />
  );
}

function Saklar({ nilai, ganti, label, sub }: { nilai: boolean; ganti: (v: boolean) => void; label: string; sub?: string }) {
  const id = React.useId();
  return (
    <div className="u-eb-saklar">
      <span>
        <label htmlFor={id}>{label}</label>
        {sub && <small>{sub}</small>}
      </span>
      <Switch id={id} checked={nilai} onCheckedChange={(v) => ganti(Boolean(v))} />
    </div>
  );
}

/** Pengaturan blok terpilih di panel samping (tab Blok). */
export function PengaturanBlok({ b, ganti }: { b: Blok; ganti: (b: Blok) => void }) {
  const { pilihMedia } = useEditor();
  const d = b.data;
  const ubah = (x: Record<string, unknown>) => ganti({ ...b, data: { ...d, ...x } });
  const isi: React.ReactNode[] = [];

  switch (b.tipe) {
    case 'paragraf':
      isi.push(
        <Rata key="r" nilai={d.rata} ganti={(v) => ubah({ rata: v })} />,
        <Saklar key="b" nilai={!!d.besar} ganti={(v) => ubah({ besar: v })} label="Paragraf pembuka" sub="Huruf lebih besar untuk alinea pertama berita." />,
      );
      break;
    case 'judul':
      isi.push(
        <Pilihan key="t" label="Tingkat" nilai={String(d.tingkat ?? 2)} ganti={(v) => ubah({ tingkat: Number(v) })} item={[{ v: '2', label: 'H2' }, { v: '3', label: 'H3' }, { v: '4', label: 'H4' }]} />,
        <Rata key="r" nilai={d.rata} ganti={(v) => ubah({ rata: v })} />,
      );
      break;
    case 'daftar':
      isi.push(<Pilihan key="g" label="Gaya" nilai={d.gaya === 'ol' ? 'ol' : 'ul'} ganti={(v) => ubah({ gaya: v })} item={[{ v: 'ul', label: 'Poin' }, { v: 'ol', label: 'Nomor' }]} />);
      break;
    case 'kutipan':
      isi.push(<Pilihan key="g" label="Gaya" nilai={d.gaya === 'sorot' ? 'sorot' : 'biasa'} ganti={(v) => ubah({ gaya: v })} item={[{ v: 'biasa', label: 'Biasa' }, { v: 'sorot', label: 'Sorot besar' }]} />);
      break;
    case 'sorotan':
      isi.push(
        <Pilihan key="g" label="Warna" nilai={['sukses', 'peringatan', 'bahaya'].includes(d.gaya) ? d.gaya : 'info'} ganti={(v) => ubah({ gaya: v })} item={[{ v: 'info', label: 'Info' }, { v: 'sukses', label: 'Hijau' }, { v: 'peringatan', label: 'Kuning' }, { v: 'bahaya', label: 'Merah' }]} />,
      );
      break;
    case 'gambar':
      isi.push(
        <Field key="a" label="Teks alternatif" description="Gambarkan isi foto untuk pembaca layar dan mesin pencari.">
          <Input value={d.alt ?? ''} onChange={(e) => ubah({ alt: e.target.value })} />
        </Field>,
        <Pilihan key="l" label="Lebar" nilai={['lebar', 'penuh'].includes(d.lebar) ? d.lebar : 'normal'} ganti={(v) => ubah({ lebar: v })} item={[{ v: 'normal', label: 'Normal' }, { v: 'lebar', label: 'Lebar' }, { v: 'penuh', label: 'Penuh' }]} />,
        <Field key="t" label="Tautan saat diklik">
          <Input value={d.tautan ?? ''} onChange={(e) => ubah({ tautan: e.target.value })} placeholder="https://…" />
        </Field>,
        <Button
          key="g"
          variant="outline"
          size="sm"
          onClick={async () => {
            const m = (await pilihMedia({ jenis: 'gambar' }))?.[0];
            if (m) ubah({ url: m.url, media_id: m.id });
          }}
        >
          Ganti gambar
        </Button>,
      );
      break;
    case 'galeri':
      isi.push(<Pilihan key="k" label="Kolom" nilai={String(d.kolom ?? 3)} ganti={(v) => ubah({ kolom: Number(v) })} item={[{ v: '2', label: '2' }, { v: '3', label: '3' }, { v: '4', label: '4' }]} />);
      break;
    case 'video':
      isi.push(
        <Field key="u" label="Alamat video">
          <Input value={d.url ?? ''} onChange={(e) => ubah({ url: e.target.value })} placeholder="https://youtu.be/…" />
        </Field>,
      );
      break;
    case 'peta':
      isi.push(
        <Field key="u" label="URL sematan Google Maps">
          <Input value={d.url ?? ''} onChange={(e) => ubah({ url: urlPeta(e.target.value) ?? e.target.value })} />
        </Field>,
      );
      break;
    case 'berkas':
      isi.push(
        <Field key="n" label="Nama berkas">
          <Input value={d.nama ?? ''} onChange={(e) => ubah({ nama: e.target.value })} />
        </Field>,
        <Field key="u" label="URL">
          <Input value={d.url ?? ''} onChange={(e) => ubah({ url: e.target.value })} />
        </Field>,
      );
      break;
    case 'tombol':
      isi.push(<Rata key="r" nilai={d.rata} ganti={(v) => ubah({ rata: v })} />);
      break;
    case 'pemisah':
      isi.push(<Pilihan key="g" label="Gaya" nilai={d.gaya === 'titik' ? 'titik' : 'garis'} ganti={(v) => ubah({ gaya: v })} item={[{ v: 'garis', label: 'Garis' }, { v: 'titik', label: 'Titik' }]} />);
      break;
    case 'spasi':
      isi.push(<Pilihan key="u" label="Tinggi" nilai={['kecil', 'besar'].includes(d.ukuran) ? d.ukuran : 'sedang'} ganti={(v) => ubah({ ukuran: v })} item={[{ v: 'kecil', label: 'Kecil' }, { v: 'sedang', label: 'Sedang' }, { v: 'besar', label: 'Besar' }]} />);
      break;
    case 'kolom':
      isi.push(
        <Pilihan
          key="r"
          label="Susunan"
          nilai={d.rasio ?? '50-50'}
          ganti={(v) => ganti(aturRasio(b, v))}
          item={[
            { v: '50-50', label: '½ ½' },
            { v: '33-67', label: '⅓ ⅔' },
            { v: '67-33', label: '⅔ ⅓' },
            { v: '33-33-33', label: '3' },
            { v: '25-25-25-25', label: '4' },
          ]}
        />,
      );
      break;
    case 'tabel':
      isi.push(<Saklar key="k" nilai={!!d.kepala} ganti={(v) => ubah({ kepala: v })} label="Baris pertama sebagai judul kolom" />);
      break;
    default:
      break;
  }

  const D = DEF[b.tipe];
  const I = D.ikon;
  return (
    <div className="u-eb-atur">
      <div className="u-eb-atur-kepala">
        <span className="u-eb-atur-ikon">
          <I aria-hidden />
        </span>
        <div>
          <strong>{D.label}</strong>
          <small>{D.deskripsi}</small>
        </div>
      </div>
      {isi.length ? isi : <p className="u-eb-redup">Blok ini tidak punya pengaturan tambahan.</p>}
    </div>
  );
}
