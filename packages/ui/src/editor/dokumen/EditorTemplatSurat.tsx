import * as React from 'react';
import { FlaskConical } from 'lucide-react';
import { Field, Input, Switch, Textarea } from '../../components/forms';
import type { PilihMedia, SumberMedia } from '../EditorBlok';
import type { MediaEditor, OpsiPilihMedia, PolaBlok } from '../konteks';
import type { Blok } from '../tipe';
import { EditorDokumen } from './EditorDokumen';
import { LembarSurat, type KopSurat, type PenandatanganSurat, type UkuranKertas } from './LembarSurat';
import { isiTemplat, penandaIsian, type PenandaTemplat } from './templat';

/** Kolom templat surat di /v1/arsip/template. */
export interface NilaiTemplatSurat {
  nama: string;
  perihal: string;
  /** HTML isi (sudah disaring seperti server). */
  isi: string;
  keterangan: string;
  aktif: boolean;
}

export type GalatTemplatSurat = Partial<Record<'nama' | 'perihal' | 'isi', string>>;

const teksPolos = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

/** Aturan sama dengan server: nama wajib (≤150), isi wajib, perihal ≤255. */
export function validasiTemplatSurat(n: Pick<NilaiTemplatSurat, 'nama' | 'perihal' | 'isi'>): GalatTemplatSurat {
  const g: GalatTemplatSurat = {};
  if (!n.nama.trim()) g.nama = 'Nama templat wajib diisi.';
  else if (n.nama.length > 150) g.nama = 'Nama templat paling banyak 150 karakter.';
  if (n.perihal.length > 255) g.perihal = 'Perihal paling banyak 255 karakter.';
  if (!teksPolos(n.isi) && !/<(img|table|hr)\b/i.test(n.isi)) g.isi = 'Isi templat masih kosong.';
  return g;
}

/** Body siap kirim ke POST/PUT /v1/arsip/template (perihal/keterangan kosong jadi null). */
export function bodyTemplatSurat(n: NilaiTemplatSurat, tambahan?: { unit_id?: number | null; jenis_id?: number | null }) {
  return {
    ...tambahan,
    nama: n.nama.trim(),
    perihal: n.perihal.trim() || null,
    isi: n.isi,
    keterangan: n.keterangan.trim() || null,
    aktif: n.aktif,
  };
}

export interface EditorTemplatSuratProps {
  /** Nilai awal, mis. baris dari GET /v1/arsip/template/{id}. Untuk memuat ulang, ganti `key`. */
  nilaiAwal?: Partial<NilaiTemplatSurat> | null;
  onChange?: (n: NilaiTemplatSurat) => void;
  /** Tombol simpan. Terima nilai terkini dan galat validasi (kosong = siap simpan). */
  aksi?: (n: NilaiTemplatSurat, galat: GalatTemplatSurat) => React.ReactNode;
  /** Penanda isian yang disarankan (selain penanda bawaan dan yang sudah ada di isi). */
  penanda?: PenandaTemplat[];
  /** Kop untuk pratinjau, mis. dari unit pemilik templat. */
  kop?: KopSurat | React.ReactNode;
  /** Unit untuk mengisi {{unit}} dan {{unit_singkatan}} di pratinjau. */
  unit?: { nama?: string | null; singkatan?: string | null } | null;
  /** Penandatangan contoh di pratinjau. */
  penandatangan?: PenandatanganSurat;
  /** Isian tambahan di panel, mis. pilihan unit dan jenis surat. */
  panelTambahan?: React.ReactNode;
  kertas?: UkuranKertas;
  status?: React.ReactNode;
  tinggi?: number | string;
  pilihMedia?: PilihMedia;
  unggah?: (file: File, opsi: OpsiPilihMedia) => Promise<MediaEditor>;
  sumberMedia?: SumberMedia;
  pola?: PolaBlok[];
  className?: string;
}

/**
 * Editor templat surat arsip: nama, perihal bawaan, isi di atas kertas dengan penanda `{{nama}}`, keterangan, dan
 * status aktif. Pratinjau mengisi penanda dengan data uji persis seperti `SuratService::isiTemplat` di server;
 * penanda yang belum diisi ditandai kuning. Kirim hasilnya dengan `bodyTemplatSurat` ke /v1/arsip/template.
 */
export function EditorTemplatSurat({
  nilaiAwal,
  onChange,
  aksi,
  penanda,
  kop,
  unit,
  penandatangan,
  panelTambahan,
  kertas = 'a4',
  status,
  tinggi,
  pilihMedia,
  unggah,
  sumberMedia,
  pola,
  className,
}: EditorTemplatSuratProps) {
  const [nama, setNama] = React.useState(nilaiAwal?.nama ?? '');
  const [perihal, setPerihal] = React.useState(nilaiAwal?.perihal ?? '');
  const [isi, setIsi] = React.useState(nilaiAwal?.isi ?? '');
  const [keterangan, setKeterangan] = React.useState(nilaiAwal?.keterangan ?? '');
  const [aktif, setAktif] = React.useState(nilaiAwal?.aktif ?? true);
  const [sentuh, setSentuh] = React.useState<Record<string, boolean>>({});
  const [uji, setUji] = React.useState<Record<string, string>>({});

  const nilai = React.useMemo<NilaiTemplatSurat>(() => ({ nama, perihal, isi, keterangan, aktif }), [nama, perihal, isi, keterangan, aktif]);
  const galat = React.useMemo(() => validasiTemplatSurat(nilai), [nilai]);
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const pertama = React.useRef(true);
  React.useEffect(() => {
    if (pertama.current) {
      pertama.current = false;
      return;
    }
    onChangeRef.current?.(nilai);
  }, [nilai]);

  const isian = React.useMemo(() => penandaIsian(isi).map((p) => penanda?.find((x) => x.nama === p.nama) ?? p), [isi, penanda]);
  const tampilGalat = (k: keyof GalatTemplatSurat) => (sentuh[k] ? galat[k] : undefined);

  const panel = (
    <>
      <section className="u-dok-isian">
        <Field label="Nama templat" required error={tampilGalat('nama')}>
          <Input value={nama} maxLength={150} placeholder="Undangan rapat pimpinan" onChange={(e) => setNama(e.target.value)} onBlur={() => setSentuh((s) => ({ ...s, nama: true }))} />
        </Field>
        <Field label="Perihal bawaan" optional description="Mengisi {{perihal}} bila surat tidak menulis perihal sendiri." error={tampilGalat('perihal')}>
          <Input value={perihal} maxLength={255} onChange={(e) => setPerihal(e.target.value)} onBlur={() => setSentuh((s) => ({ ...s, perihal: true }))} />
        </Field>
        {panelTambahan}
        <Field label="Keterangan" optional>
          <Textarea rows={2} value={keterangan} onChange={(e) => setKeterangan(e.target.value)} />
        </Field>
        <Field label="Aktif" description="Templat nonaktif tidak muncul saat membuat surat." orientation="horizontal">
          <Switch checked={aktif} onCheckedChange={setAktif} />
        </Field>
        {sentuh.isi && galat.isi && (
          <p className="u-field-error" role="alert">
            {galat.isi}
          </p>
        )}
      </section>
      {isian.length > 0 && (
        <section>
          <h3 className="u-eb-panel-judul">
            <FlaskConical aria-hidden />
            Data uji pratinjau
          </h3>
          <div className="u-dok-isian">
            {isian.map((p) => (
              <Field key={p.nama} label={p.label}>
                <Input value={uji[p.nama] ?? ''} placeholder={`{{${p.nama}}}`} onChange={(e) => setUji((u) => ({ ...u, [p.nama]: e.target.value }))} />
              </Field>
            ))}
          </div>
        </section>
      )}
    </>
  );

  const hariIni = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <EditorDokumen
      className={className}
      nilaiAwal={nilaiAwal?.isi ?? ''}
      onChange={(h: string, _b: Blok[]) => {
        setIsi(h);
        setSentuh((s) => (s.isi ? s : { ...s, isi: true }));
      }}
      penanda={penanda}
      penandaBawaan
      kertas={kertas}
      status={status}
      tinggi={tinggi}
      pilihMedia={pilihMedia}
      unggah={unggah}
      sumberMedia={sumberMedia}
      pola={pola}
      panelDokumen={panel}
      aksi={aksi ? () => aksi(nilai, galat) : undefined}
      pratinjau={(h) => (
        <LembarSurat
          kertas={kertas}
          kop={kop}
          nomor=""
          perihal={perihal || null}
          tanggal={hariIni}
          isi={isiTemplat(h, uji, { unit, surat: { perihal, tanggal_surat: hariIni }, tandaiKosong: true })}
          penandatangan={penandatangan}
        />
      )}
    />
  );
}
