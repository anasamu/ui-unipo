'use client';
import * as React from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ImageIcon, LogIn, Monitor, Plus, RotateCcw, Save, Smartphone, Tablet, Trash2, Upload } from 'lucide-react';
import { Badge, Button } from '../components/actions';
import { Alert, Card, Stepper } from '../components/display';
import { Field, Input, SegmentedControl, Switch, Textarea } from '../components/forms';
import { Select } from '../components/select';
import { Sheet } from '../components/overlays';
import { WizardReview } from '../components/wizard';
import { Ilustrasi } from '../ikon/ilustrasi';
import { cn } from '../lib/cn';
import { useUnggahBerkas } from './berkas';
import {
  BAWAAN_MASUK,
  BAWAAN_MASUK_APLIKASI,
  HalamanMasuk,
  IKON_POIN_MASUK,
  ILUSTRASI_MASUK,
  PILIHAN_FOKUS_MASUK,
  PILIHAN_LAPISAN_MASUK,
  PILIHAN_LATAR_MASUK,
  PILIHAN_TATA_MASUK,
  PILIHAN_TRANSISI_MASUK,
  bacaTataMasuk,
  tulisTataMasuk,
  urlGambarTema,
  type IkonPoinMasuk,
  type LatarMasuk,
  type TataLetakMasuk,
  type TataMasuk,
} from './halaman-masuk';
import { TombolPilihBerkas } from '../components/pilih-berkas-lokal';

type TataTema = Record<string, unknown>;
type PerubahanTata = ReturnType<typeof tulisTataMasuk>;

/** "-" = sengaja dikosongkan (lihat tulisTataMasuk); di formulir tampil sebagai isian kosong. */
const untukForm = (t: TataMasuk): TataMasuk =>
  Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v === '-' ? '' : v])) as unknown as TataMasuk;

const WARNA = ['#244ce6', '#0f766e', '#9f1d35', '#15803d', '#6d28d9', '#334155', '#0369a1', '#b45309', '#0b0f19'];

// ---------------------------------------------------------------- Pratinjau berskala

const LAYAR = {
  desktop: { w: 1280, h: 800, label: 'Desktop', ikon: <Monitor /> },
  tablet: { w: 820, h: 1100, label: 'Tablet', ikon: <Tablet /> },
  ponsel: { w: 390, h: 800, label: 'Ponsel', ikon: <Smartphone /> },
} as const;
type Layar = keyof typeof LAYAR;

/** Halaman masuk berukuran layar sebenarnya yang diperkecil agar muat di wadahnya. */
export function PratinjauHalamanMasuk({ aplikasi, nama, tata, berkas, layar = 'desktop', tinggiMaks, className }: { aplikasi: string; nama?: string; tata: TataMasuk; berkas?: Record<string, string> | null; layar?: Layar; tinggiMaks?: number; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [lebar, setLebar] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLebar(el.clientWidth));
    ro.observe(el);
    setLebar(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const l = LAYAR[layar];
  let skala = lebar ? lebar / l.w : 0;
  if (tinggiMaks && skala * l.h > tinggiMaks) skala = tinggiMaks / l.h;
  return (
    <div ref={ref} className={cn('u-pratinjau-masuk', className)} data-layar={layar} style={{ height: skala ? l.h * skala : 200 }} aria-label={`Pratinjau halaman masuk (${l.label})`} role="img">
      {skala > 0 && (
        <div className="u-pratinjau-masuk-layar" style={{ width: l.w, height: l.h, transform: `scale(${skala})` }}>
          <HalamanMasuk aplikasi={aplikasi} nama={nama} tata={tata} berkas={berkas} pratinjau kunciMode="u-pratinjau" />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Isian gambar (URL atau unggah berkas publik)

function IsianGambar({
  label,
  description,
  value,
  onChange,
  peta,
  onUnggah,
  aplikasi,
  accept = 'image/png,image/jpeg,image/webp,image/svg+xml,image/avif',
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  peta: Record<string, string>;
  onUnggah: (uuid: string, urlLokal: string) => void;
  aplikasi: string;
  accept?: string;
}) {
  const unggah = useUnggahBerkas({ kategori: 'foto', modul: 'tema', visibilitas: 'publik', enkripsi: false, keterangan: `Gambar halaman masuk ${aplikasi}` });
  const [persen, setPersen] = React.useState<number | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const url = urlGambarTema(value, peta);
  const berkas = value.startsWith('berkas:');
  const pilihFile = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setGalat('Pilih berkas gambar (PNG, JPG, WEBP, SVG).');
      return;
    }
    setGalat(null);
    setPersen(0);
    try {
      const b = await unggah(f, setPersen);
      onUnggah(b.id.toLowerCase(), URL.createObjectURL(f));
      onChange(`berkas:${b.id.toLowerCase()}`);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Gambar belum terunggah. Coba lagi.');
    } finally {
      setPersen(null);
    }
  };
  return (
    <Field label={label} description={description} error={galat ?? undefined}>
      <div className="u-atur-masuk-gambar">
        <span className="u-atur-masuk-gambar-mini" aria-hidden>
          {url ? <img src={url} alt="" /> : <ImageIcon />}
        </span>
        {berkas ? (
          <span className="u-atur-masuk-gambar-berkas">
            <strong>Gambar unggahan</strong>
            <small>{url ? 'Berkas publik di SIAKAD' : 'Alamat tampil muncul setelah disimpan'}</small>
          </span>
        ) : (
          <Input size="sm" value={value} onChange={(e) => onChange(e.target.value.trim())} placeholder="https://… atau unggah" aria-label={typeof label === 'string' ? `${label}: alamat gambar` : 'Alamat gambar'} />
        )}
        <TombolPilihBerkas loading={persen !== null} accept={accept} onFiles={(f) => void pilihFile(f[0])}>
          <Upload /> {persen !== null ? `${Math.round(persen)}%` : berkas ? 'Ganti' : 'Unggah'}
        </TombolPilihBerkas>
        {value && (
          <Button size="sm" variant="ghost" iconOnly aria-label="Hapus gambar" onClick={() => onChange('')}>
            <Trash2 />
          </Button>
        )}
      </div>
    </Field>
  );
}

function PilihWarnaMasuk({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Warna latar" description="Otomatis = warna utama tema.">
      <div className="u-tema-warna">
        <button type="button" className="u-tema-warna-otomatis" aria-pressed={!value} onClick={() => onChange('')}>
          Otomatis
        </button>
        {WARNA.map((c) => (
          <button key={c} type="button" title={c} aria-label={`Warna ${c}`} aria-pressed={value === c} style={{ background: c }} onClick={() => onChange(c)} />
        ))}
        <label className="u-tema-warna-bebas" title="Pilih warna bebas">
          <input type="color" value={value || '#244ce6'} onChange={(e) => onChange(e.target.value)} aria-label="Warna bebas" />
        </label>
      </div>
    </Field>
  );
}

function SketsaTata({ tata }: { tata: TataLetakMasuk }) {
  return (
    <span className="u-atur-masuk-sketsa" data-tata={tata} aria-hidden>
      <i className="u-ams-visual" />
      <i className="u-ams-panel">
        <b />
        <b />
        <b />
      </i>
    </span>
  );
}

// ---------------------------------------------------------------- Kartu + Sheet bertahap

export interface PengaturanHalamanMasukProps {
  aplikasi: string;
  lingkup?: string;
  /** Nama aplikasi untuk `{nama}` dan logo pratinjau. */
  nama?: string;
  /** `tata` tema yang berlaku sekarang (draf, termasuk warisan). */
  tata: TataTema;
  /** Peta `berkas:<uuid>` → URL dari GET /v1/tema. */
  berkas?: Record<string, string> | null;
  /** Bawaan khusus aplikasi (sama dengan prop `bawaan` HalamanMasuk). */
  bawaan?: Partial<TataMasuk>;
  /** Boleh mengubah (izin `<aplikasi>.tema`). */
  boleh: boolean;
  /** Simpan perubahan (kunci undefined = hapus). Dipanggil dari langkah terakhir. */
  onSimpan: (perubahan: PerubahanTata) => Promise<void>;
  /** CSS tema draf untuk pratinjau, dengan selektor `.u-atur-masuk-tema`. */
  cssTema?: string;
  className?: string;
}

/**
 * Bagian "Halaman masuk" di pengaturan tema: pratinjau kecil dan tombol yang membuka panel samping bertahap
 * (Tata letak → Sisi visual → Teks → Tinjau) dengan pratinjau langsung desktop/tablet/ponsel. Disimpan di `tata`
 * tema aplikasi (`masuk`, `masuk_slide`, `masuk_poin`), berlaku tanpa deploy ulang.
 */
export function PengaturanHalamanMasuk({ aplikasi, nama, tata, berkas, bawaan, boleh, onSimpan, cssTema, className }: PengaturanHalamanMasukProps) {
  const berlaku = React.useMemo(() => bacaTataMasuk(tata, aplikasi, bawaan), [tata, aplikasi, bawaan]);
  const [buka, setBuka] = React.useState(false);
  const pilihanTata = PILIHAN_TATA_MASUK.find((x) => x.value === berlaku.tata);
  const pilihanLatar = PILIHAN_LATAR_MASUK.find((x) => x.value === berlaku.latar);
  const diatur = ['masuk', 'masuk_slide', 'masuk_poin'].some((k) => tata[k] !== undefined);
  return (
    <Card className={cn('u-tema-kartu u-atur-masuk-kartu', className)}>
      <div className="u-tema-baris">
        <span className="u-label">Halaman masuk</span>
        {diatur ? <Badge variant="primary">Diatur</Badge> : <Badge variant="neutral">Bawaan</Badge>}
      </div>
      {cssTema && <style>{cssTema}</style>}
      <div className="u-atur-masuk-tema">
        <PratinjauHalamanMasuk aplikasi={aplikasi} nama={nama} tata={berlaku} berkas={berkas} />
      </div>
      <p className="u-field-description">
        {pilihanTata?.label}, {pilihanLatar?.label.toLowerCase()}. Atur posisi panel, latar (ilustrasi, foto, slider, gradien bergerak), dan semua teks halaman masuk.
      </p>
      <div>
        <Button size="sm" variant="outline" onClick={() => setBuka(true)}>
          <LogIn /> {boleh ? 'Atur halaman masuk' : 'Lihat pengaturan halaman masuk'}
        </Button>
      </div>
      {buka && <SheetHalamanMasuk aplikasi={aplikasi} nama={nama} awal={berlaku} bawaan={bawaan} berkas={berkas ?? {}} boleh={boleh} cssTema={cssTema} onSimpan={onSimpan} tutup={() => setBuka(false)} />}
    </Card>
  );
}

const LANGKAH = [
  { title: 'Tata letak', description: 'Posisi panel masuk' },
  { title: 'Sisi visual', description: 'Ilustrasi, foto, slider, gradien' },
  { title: 'Teks', description: 'Judul, sambutan, catatan' },
  { title: 'Tinjau', description: 'Periksa lalu simpan' },
];

function SheetHalamanMasuk({
  aplikasi,
  nama,
  awal,
  bawaan,
  berkas,
  boleh,
  cssTema,
  onSimpan,
  tutup,
}: {
  aplikasi: string;
  nama?: string;
  awal: TataMasuk;
  bawaan?: Partial<TataMasuk>;
  berkas: Record<string, string>;
  boleh: boolean;
  cssTema?: string;
  onSimpan: (p: PerubahanTata) => Promise<void>;
  tutup: () => void;
}) {
  const dasar = React.useMemo(() => bacaTataMasuk(null, aplikasi, bawaan), [aplikasi, bawaan]);
  const [t, setT] = React.useState<TataMasuk>(() => untukForm(awal));
  const [langkah, setLangkah] = React.useState(0);
  const [layar, setLayar] = React.useState<Layar>('desktop');
  const [lokal, setLokal] = React.useState<Record<string, string>>({});
  const [menyimpan, setMenyimpan] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const peta = React.useMemo(() => ({ ...berkas, ...lokal }), [berkas, lokal]);
  const ubah = <K extends keyof TataMasuk>(k: K, v: TataMasuk[K]) => setT((x) => ({ ...x, [k]: v }));
  const catatUnggah = (uuid: string, url: string) => setLokal((l) => ({ ...l, [uuid]: url }));
  React.useEffect(() => () => Object.values(lokal).forEach((u) => URL.revokeObjectURL(u)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const akhir = langkah === LANGKAH.length - 1;

  const simpan = async () => {
    setMenyimpan(true);
    setGalat(null);
    try {
      await onSimpan(tulisTataMasuk(t, dasar));
      tutup();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Belum tersimpan. Coba lagi.');
    } finally {
      setMenyimpan(false);
    }
  };

  const isiLangkah = [
    // 1. Tata letak
    <div key="tata" className="u-atur-masuk-pilihan" role="radiogroup" aria-label="Tata letak">
      {PILIHAN_TATA_MASUK.map((p) => (
        <button key={p.value} type="button" role="radio" aria-checked={t.tata === p.value} className="u-atur-masuk-opsi" onClick={() => ubah('tata', p.value)}>
          <SketsaTata tata={p.value} />
          <strong>{p.label}</strong>
          <small>{p.keterangan}</small>
        </button>
      ))}
    </div>,
    // 2. Sisi visual
    <div key="latar" className="u-atur-masuk-isian">
      {t.tata === 'minimal' && <Alert variant="info">Tata Minimal tidak memakai sisi visual. Ilustrasi dan daftar fitur tampil kecil di dalam panel.</Alert>}
      <div className="u-atur-masuk-pilihan" data-kecil="" role="radiogroup" aria-label="Jenis latar">
        {PILIHAN_LATAR_MASUK.map((p) => (
          <button key={p.value} type="button" role="radio" aria-checked={t.latar === p.value} className="u-atur-masuk-opsi" onClick={() => ubah('latar', p.value as LatarMasuk)}>
            <span className="u-atur-masuk-latar" data-latar={p.value} aria-hidden />
            <strong>{p.label}</strong>
            <small>{p.keterangan}</small>
          </button>
        ))}
      </div>
      {t.latar === 'ilustrasi' && (
        <>
          <Field label="Ilustrasi">
            <div className="u-atur-masuk-ilustrasi" role="radiogroup" aria-label="Ilustrasi">
              {ILUSTRASI_MASUK.map((i) => (
                <button key={i.value} type="button" role="radio" aria-checked={t.ilustrasi === i.value && !t.ilustrasiGambar} title={i.label} onClick={() => setT((x) => ({ ...x, ilustrasi: i.value, ilustrasiGambar: '' }))}>
                  <Ilustrasi nama={i.value} lebar={84} bergerak={false} />
                  <small>{i.label}</small>
                </button>
              ))}
            </div>
          </Field>
          <IsianGambar label="Ilustrasi sendiri (opsional)" description="SVG atau PNG transparan. Bila diisi, menggantikan ilustrasi di atas." value={t.ilustrasiGambar} onChange={(v) => ubah('ilustrasiGambar', v)} peta={peta} onUnggah={catatUnggah} aplikasi={aplikasi} accept="image/svg+xml,image/png,image/webp" />
        </>
      )}
      {t.latar === 'gambar' && (
        <>
          <IsianGambar label="Foto" description="Foto kampus mendatar, minimal lebar 1600 px. Unggahan disimpan sebagai berkas publik." value={t.gambar} onChange={(v) => ubah('gambar', v)} peta={peta} onUnggah={catatUnggah} aplikasi={aplikasi} />
          <div className="u-tema-dua">
            <Field label="Titik fokus">
              <Select size="sm" value={t.fokus} onValueChange={(v) => v && ubah('fokus', v)} options={PILIHAN_FOKUS_MASUK} aria-label="Titik fokus" />
            </Field>
            <Field label="Lapisan">
              <Select size="sm" value={t.lapisan} onValueChange={(v) => v && ubah('lapisan', v)} options={PILIHAN_LAPISAN_MASUK} aria-label="Lapisan" />
            </Field>
          </div>
        </>
      )}
      {t.latar === 'slider' && (
        <>
          <div className="u-atur-masuk-daftar">
            {t.slide.map((s, i) => (
              <fieldset key={i} className="u-atur-masuk-butir">
                <legend>Slide {i + 1}</legend>
                <IsianGambar label="Gambar" value={s.gambar} onChange={(v) => ubah('slide', t.slide.map((x, j) => (j === i ? { ...x, gambar: v } : x)))} peta={peta} onUnggah={catatUnggah} aplikasi={aplikasi} />
                <Field label="Judul" optional>
                  <Input size="sm" maxLength={160} value={s.judul ?? ''} onChange={(e) => ubah('slide', t.slide.map((x, j) => (j === i ? { ...x, judul: e.target.value } : x)))} placeholder="mis. Wisuda angkatan 2026" />
                </Field>
                <Field label="Teks" optional>
                  <Textarea rows={2} maxLength={300} value={s.teks ?? ''} onChange={(e) => ubah('slide', t.slide.map((x, j) => (j === i ? { ...x, teks: e.target.value } : x)))} />
                </Field>
                <div className="u-atur-masuk-butir-aksi">
                  <Button size="sm" variant="ghost" iconOnly aria-label="Naikkan" disabled={i === 0} onClick={() => ubah('slide', pindah(t.slide, i, -1))}>
                    <ArrowUp />
                  </Button>
                  <Button size="sm" variant="ghost" iconOnly aria-label="Turunkan" disabled={i === t.slide.length - 1} onClick={() => ubah('slide', pindah(t.slide, i, 1))}>
                    <ArrowDown />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => ubah('slide', t.slide.filter((_, j) => j !== i))}>
                    <Trash2 /> Hapus slide
                  </Button>
                </div>
              </fieldset>
            ))}
            {t.slide.length < 8 && (
              <Button size="sm" variant="outline" onClick={() => ubah('slide', [...t.slide, { gambar: '' }])}>
                <Plus /> Tambah slide
              </Button>
            )}
          </div>
          <div className="u-tema-dua">
            <Field label="Ganti slide tiap">
              <Select size="sm" value={String(t.interval)} onValueChange={(v) => v && ubah('interval', Number(v))} options={[4, 6, 8, 10, 15].map((n) => ({ value: String(n), label: `${n} detik` }))} aria-label="Interval slide" />
            </Field>
            <Field label="Transisi">
              <Select size="sm" value={t.transisi} onValueChange={(v) => v && ubah('transisi', v)} options={PILIHAN_TRANSISI_MASUK} aria-label="Transisi" />
            </Field>
            <Field label="Titik fokus">
              <Select size="sm" value={t.fokus} onValueChange={(v) => v && ubah('fokus', v)} options={PILIHAN_FOKUS_MASUK} aria-label="Titik fokus" />
            </Field>
            <Field label="Lapisan">
              <Select size="sm" value={t.lapisan} onValueChange={(v) => v && ubah('lapisan', v)} options={PILIHAN_LAPISAN_MASUK} aria-label="Lapisan" />
            </Field>
          </div>
        </>
      )}
      {(t.latar === 'gradien' || t.latar === 'pola' || t.latar === 'polos' || t.latar === 'fitur') && <PilihWarnaMasuk value={t.warna} onChange={(v) => ubah('warna', v)} />}
      {t.latar === 'fitur' && (
        <div className="u-atur-masuk-daftar">
          {t.poin.map((p, i) => (
            <fieldset key={i} className="u-atur-masuk-butir">
              <legend>Fitur {i + 1}</legend>
              <div className="u-tema-dua">
                <Field label="Ikon">
                  <Select<IkonPoinMasuk> size="sm" value={p.ikon ?? null} onValueChange={(v) => ubah('poin', t.poin.map((x, j) => (j === i ? { ...x, ikon: v ?? undefined } : x)))} options={Object.entries(IKON_POIN_MASUK).map(([value, x]) => ({ value: value as IkonPoinMasuk, label: x.label }))} aria-label="Ikon" />
                </Field>
                <Field label="Judul">
                  <Input size="sm" maxLength={120} value={p.judul} onChange={(e) => ubah('poin', t.poin.map((x, j) => (j === i ? { ...x, judul: e.target.value } : x)))} />
                </Field>
              </div>
              <Field label="Keterangan" optional>
                <Textarea rows={2} maxLength={300} value={p.teks ?? ''} onChange={(e) => ubah('poin', t.poin.map((x, j) => (j === i ? { ...x, teks: e.target.value } : x)))} />
              </Field>
              <div className="u-atur-masuk-butir-aksi">
                <Button size="sm" variant="ghost" iconOnly aria-label="Naikkan" disabled={i === 0} onClick={() => ubah('poin', pindah(t.poin, i, -1))}>
                  <ArrowUp />
                </Button>
                <Button size="sm" variant="ghost" iconOnly aria-label="Turunkan" disabled={i === t.poin.length - 1} onClick={() => ubah('poin', pindah(t.poin, i, 1))}>
                  <ArrowDown />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => ubah('poin', t.poin.filter((_, j) => j !== i))}>
                  <Trash2 /> Hapus
                </Button>
              </div>
            </fieldset>
          ))}
          {t.poin.length < 8 && (
            <Button size="sm" variant="outline" onClick={() => ubah('poin', [...t.poin, { ikon: 'kilau', judul: '' }])}>
              <Plus /> Tambah fitur
            </Button>
          )}
        </div>
      )}
      <Field label="Animasi latar" description="Gradien dan pola bergerak pelan, ilustrasi melayang, slider berganti sendiri. Selalu mati bagi pengunjung yang memilih kurangi gerakan.">
        <label className="u-tema-seluruh">
          <Switch size="sm" checked={t.gerak} onCheckedChange={(v) => ubah('gerak', v)} /> {t.gerak ? 'Hidup' : 'Mati'}
        </label>
      </Field>
    </div>,
    // 3. Teks
    <div key="teks" className="u-atur-masuk-isian">
      <p className="u-field-description">Tulis {'{nama}'} untuk nama aplikasi. Kosongkan isian untuk menyembunyikannya.</p>
      <Field label="Judul panel">
        <Input size="sm" maxLength={160} value={t.judul} onChange={(e) => ubah('judul', e.target.value)} placeholder="Masuk" />
      </Field>
      <Field label="Keterangan">
        <Textarea rows={2} maxLength={500} value={t.keterangan} onChange={(e) => ubah('keterangan', e.target.value)} />
      </Field>
      <Field label="Judul sambutan" description="Tampil di sisi visual.">
        <Input size="sm" maxLength={200} value={t.slogan} onChange={(e) => ubah('slogan', e.target.value)} />
      </Field>
      <Field label="Teks sambutan">
        <Textarea rows={2} maxLength={500} value={t.sloganTeks} onChange={(e) => ubah('sloganTeks', e.target.value)} />
      </Field>
      <Field label="Catatan di bawah tombol" description="Tautan ditulis [teks](/alamat), mis. [halaman verifikasi](/verifikasi).">
        <Textarea rows={3} maxLength={500} value={t.catatan} onChange={(e) => ubah('catatan', e.target.value)} />
      </Field>
      <div className="u-tema-dua">
        <Field label="Tautan bantuan" optional>
          <Input size="sm" maxLength={80} value={t.bantuanLabel} onChange={(e) => ubah('bantuanLabel', e.target.value)} placeholder="mis. Panduan masuk" />
        </Field>
        <Field label="Alamat bantuan" optional>
          <Input size="sm" maxLength={500} value={t.bantuanUrl} onChange={(e) => ubah('bantuanUrl', e.target.value.trim())} placeholder="https://… atau /panduan" />
        </Field>
      </div>
      <Field label="Kontak di halaman pemeliharaan" description="Tampil bila aplikasi belum selesai diatur.">
        <Input size="sm" maxLength={300} value={t.kontak} onChange={(e) => ubah('kontak', e.target.value)} />
      </Field>
      <div className="u-tema-dua">
        <Field label="Pengumuman lintas aplikasi" description="Pengumuman publik dari Humas/Pustikom.">
          <label className="u-tema-seluruh">
            <Switch size="sm" checked={t.pengumuman} onCheckedChange={(v) => ubah('pengumuman', v)} /> {t.pengumuman ? 'Tampilkan' : 'Sembunyikan'}
          </label>
        </Field>
        <Field label="Tombol terang/gelap">
          <label className="u-tema-seluruh">
            <Switch size="sm" checked={t.pilihMode} onCheckedChange={(v) => ubah('pilihMode', v)} /> {t.pilihMode ? 'Tampilkan' : 'Sembunyikan'}
          </label>
        </Field>
      </div>
    </div>,
    // 4. Tinjau
    <div key="tinjau" className="u-atur-masuk-isian">
      <WizardReview
        sections={[
          {
            title: 'Tata letak',
            onEdit: () => setLangkah(0),
            items: [{ label: 'Panel', value: PILIHAN_TATA_MASUK.find((x) => x.value === t.tata)?.label }],
          },
          {
            title: 'Sisi visual',
            onEdit: () => setLangkah(1),
            missing: (t.latar === 'gambar' && !t.gambar) || (t.latar === 'slider' && !t.slide.some((s) => s.gambar)) ? 'Belum ada gambar; sementara memakai gradien.' : undefined,
            items: [
              { label: 'Jenis', value: PILIHAN_LATAR_MASUK.find((x) => x.value === t.latar)?.label },
              ...(t.latar === 'ilustrasi' ? [{ label: 'Ilustrasi', value: t.ilustrasiGambar ? 'Gambar sendiri' : ILUSTRASI_MASUK.find((x) => x.value === t.ilustrasi)?.label }] : []),
              ...(t.latar === 'slider' ? [{ label: 'Slide', value: `${t.slide.filter((s) => s.gambar).length} gambar, tiap ${t.interval} detik` }] : []),
              ...(t.latar === 'fitur' ? [{ label: 'Fitur', value: `${t.poin.filter((p) => p.judul).length} poin` }] : []),
              { label: 'Animasi', value: t.gerak ? 'Hidup' : 'Mati' },
            ],
          },
          {
            title: 'Teks',
            onEdit: () => setLangkah(2),
            items: [
              { label: 'Judul', value: t.judul || 'Masuk' },
              { label: 'Sambutan', value: t.slogan || '(tanpa)' },
              { label: 'Pengumuman', value: t.pengumuman ? 'Tampil' : 'Tidak' },
            ],
          },
        ]}
      />
      {boleh && (
        <div>
          <Button size="sm" variant="ghost" onClick={() => setT(untukForm(dasar))}>
            <RotateCcw /> Kembalikan semua ke bawaan
          </Button>
        </div>
      )}
      {galat && <Alert variant="danger" title="Belum tersimpan">{galat}</Alert>}
    </div>,
  ];

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && tutup()}
      title="Halaman masuk"
      description={boleh ? 'Perubahan berlaku untuk semua pengunjung setelah disimpan, tanpa deploy ulang.' : 'Anda hanya bisa melihat pengaturan ini.'}
      size="xl"
      className="u-atur-masuk-sheet"
      footer={
        <div className="u-atur-masuk-kaki">
          <Button variant="ghost" onClick={tutup}>
            {boleh ? 'Batal' : 'Tutup'}
          </Button>
          <span />
          {langkah > 0 && (
            <Button variant="outline" onClick={() => setLangkah(langkah - 1)} disabled={menyimpan}>
              <ArrowLeft /> Kembali
            </Button>
          )}
          {!akhir ? (
            <Button onClick={() => setLangkah(langkah + 1)}>
              Lanjut <ArrowRight />
            </Button>
          ) : boleh ? (
            <Button loading={menyimpan} onClick={() => void simpan()}>
              <Save /> Simpan halaman masuk
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="u-atur-masuk">
        <Stepper steps={LANGKAH} current={langkah} onStepClick={setLangkah} className="u-atur-masuk-langkah" />
        <div className="u-atur-masuk-grid">
          <fieldset className="u-atur-masuk-form" disabled={!boleh || menyimpan}>
            {isiLangkah[langkah]}
          </fieldset>
          <div className="u-atur-masuk-samping">
            <SegmentedControl<Layar>
              fullWidth
              value={layar}
              onValueChange={setLayar}
              options={(Object.keys(LAYAR) as Layar[]).map((k) => ({ value: k, label: LAYAR[k].label, icon: LAYAR[k].ikon }))}
              aria-label="Ukuran layar pratinjau"
            />
            {cssTema && <style>{cssTema}</style>}
            <div className="u-atur-masuk-tema">
              <PratinjauHalamanMasuk aplikasi={aplikasi} nama={nama} tata={t} berkas={peta} layar={layar} tinggiMaks={560} />
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function pindah<T>(d: T[], i: number, arah: -1 | 1): T[] {
  const j = i + arah;
  if (j < 0 || j >= d.length) return d;
  const b = [...d];
  [b[i], b[j]] = [b[j]!, b[i]!];
  return b;
}

/** Bawaan halaman masuk untuk satu aplikasi bawaan (untuk dokumentasi/alat). */
export function bawaanHalamanMasuk(aplikasi: string): TataMasuk {
  return { ...BAWAAN_MASUK, ...BAWAAN_MASUK_APLIKASI[aplikasi] };
}
