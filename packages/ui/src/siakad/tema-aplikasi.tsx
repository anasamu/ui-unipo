'use client';
import * as React from 'react';
import { Check, History, Monitor, Moon, Palette, RotateCcw, Save, Sun } from 'lucide-react';
import { Badge, Button, Spinner } from '../components/actions';
import { Alert, Card, Empty, Tabs } from '../components/display';
import { Field, Input, SegmentedControl, Switch, Textarea } from '../components/forms';
import { Select } from '../components/select';
import { ConfirmDialog, useToast } from '../components/overlays';
import { GalatApi } from './galat';
import { invalidateSiakad, useOptionalSiakad, useSiakad, useSiakadQuery } from './provider';
import { KUNCI_TATA_KERANGKA, tataKerangka, type TataKerangka } from './kerangka-aplikasi';
import {
  FONT,
  NETRAL,
  PILIHAN_ELEVASI,
  PRESET_TEMA,
  TEMA_BAWAAN,
  buatTema,
  hexValid,
  pasangModeBawaan,
  pasangTemaAplikasi,
  type DataTemaAplikasi,
  type ModeTampilan,
  type OpsiTema,
} from '../tema';

type Tata = Record<string, unknown> & { mode?: ModeTampilan };

const pathTema = (aplikasi: string, sub = '') => `/v1/tema/${encodeURIComponent(aplikasi)}${sub}`;
const queryLingkup = (lingkup?: string) => (lingkup ? { lingkup } : undefined);

/** Tema berlaku satu aplikasi dari GET /v1/tema/{aplikasi} (publik, tanpa login). */
export function useTemaAplikasi<T extends Record<string, unknown> = Record<string, unknown>>(aplikasi: string, lingkup?: string, opts: { enabled?: boolean } = {}) {
  return useSiakadQuery<DataTemaAplikasi<T>>(
    ['tema', aplikasi, lingkup ?? ''],
    (s, signal) => s.request<DataTemaAplikasi<T>>({ method: 'GET', path: pathTema(aplikasi), query: queryLingkup(lingkup), public: true }, { signal }),
    { staleTime: 60_000, enabled: opts.enabled ?? true },
  );
}

/** Bolehkah pengguna yang masuk mengubah tema aplikasi ini (GET /v1/tema/{aplikasi}/akses). */
export function useAksesTema(aplikasi: string, lingkup?: string, opts: { enabled?: boolean } = {}) {
  return useSiakadQuery<{ boleh: boolean; admin: boolean; tersedia: boolean }>(
    ['tema', aplikasi, lingkup ?? '', 'akses'],
    (s, signal) => s.request({ method: 'GET', path: pathTema(aplikasi, '/akses'), query: queryLingkup(lingkup) }, { signal }),
    { staleTime: 60_000, enabled: opts.enabled ?? true },
  );
}

export interface TemaAplikasiProps {
  /** Kode aplikasi di katalog RBAC (pmb, lms, tracer, humas, fakultas, ...). */
  aplikasi: string;
  /** Pemasangan aplikasi, mis. kode fakultas untuk aplikasi fakultas. */
  lingkup?: string;
  /** Kunci localStorage untuk CSS tema (dipakai skripAwalTema agar tidak berkedip). Bawaan `<aplikasi>.tema.css`. */
  kunciCache?: string;
  /** Kunci localStorage pilihan terang/gelap pengunjung; mode bawaan tema hanya berlaku bila kunci ini kosong. */
  kunciMode?: string;
  /** Tema cadangan bila belum ada tema tersimpan sama sekali (mis. warna situs lama). */
  cadangan?: Partial<OpsiTema>;
  /** Dipanggil setiap data tema berubah (mis. untuk membaca `tata` aplikasi). */
  onData?: (data: DataTemaAplikasi) => void;
}

/**
 * Pasang tema aplikasi dari SIAKAD ke halaman: CSS buatTema setelah CSS unipo-ui, huruf Google Fonts, meta
 * theme-color, dan mode terang/gelap bawaan. Taruh sekali di dalam <UnipoProvider>. Tidak merender apa pun.
 *
 *   <TemaAplikasi aplikasi="fakultas" lingkup="05" />
 */
export function TemaAplikasi({ aplikasi, lingkup, kunciCache, kunciMode, cadangan, onData }: TemaAplikasiProps) {
  const siakad = useOptionalSiakad();
  const q = useTemaAplikasi(aplikasi, lingkup, { enabled: !!siakad });
  const onDataRef = React.useRef(onData);
  onDataRef.current = onData;
  const kunci = kunciCache ?? `${aplikasi}.tema.css`;
  const cad = JSON.stringify(cadangan ?? {});
  React.useEffect(() => {
    if (!q.data) return;
    const tema = q.data.sumber.length ? q.data.tema : (JSON.parse(cad) as Partial<OpsiTema>);
    pasangTemaAplikasi(tema, { kunciCache: kunci });
    pasangModeBawaan(q.data.tata.mode, kunciMode);
    onDataRef.current?.(q.data as DataTemaAplikasi);
  }, [q.data, kunci, kunciMode, cad]);
  return null;
}

// ---------------------------------------------------------------- Pengaturan tema

const PRIMER = ['#244ce6', '#0f766e', '#9f1d35', '#15803d', '#6d28d9', '#334155', '#0369a1', '#b45309'];
const SEKUNDER = ['#f2b42a', '#f59e0b', '#f97316', '#14b8a6', '#38bdf8', '#ec4899', '#a3e635'];

export interface PengaturanTemaProps<T extends Tata = Tata> {
  aplikasi: string;
  lingkup?: string;
  /** Nama yang ditampilkan, mis. "Fakultas Teknik". Bawaan kode aplikasi. */
  nama?: React.ReactNode;
  /** Kolom tata letak khusus aplikasi (mis. gaya hero, urutan bagian landing). */
  tataTambahan?: (tata: Partial<T>, ubah: (perubahan: Partial<T>) => void) => React.ReactNode;
  /** Ganti isi kartu pratinjau. Bawaan: contoh tombol, kartu, lencana, dan tabel. */
  pratinjau?: React.ReactNode;
  /** Kunci cache yang sama dengan <TemaAplikasi>; tema langsung dipasang ulang setelah disimpan. */
  kunciCache?: string;
  /** Tampilkan pilihan mode terang/gelap bawaan (bawaan true). */
  denganMode?: boolean;
  /** Bagian pengaturan Sidebar dan Header KerangkaAplikasi (disimpan di `tata`). Bawaan true. */
  denganKerangka?: boolean;
  onTersimpan?: (data: DataTemaAplikasi<T>) => void;
  className?: string;
}

interface Draf<T extends Tata> {
  tema: Partial<OpsiTema>;
  tata: Partial<T>;
  catatan: string;
}

/**
 * Halaman pengaturan tema aplikasi untuk pengguna yang berhak (izin RBAC `<aplikasi>.tema`): preset, warna, netral,
 * huruf, sudut, ukuran teks, bayangan, gerak, mode bawaan, tata letak khusus aplikasi, pratinjau langsung, simpan ke
 * SIAKAD (berlaku tanpa deploy), dan riwayat versi yang bisa dipulihkan. Pengguna tanpa hak hanya melihat.
 *
 *   <PengaturanTema aplikasi="pmb" />
 */
export function PengaturanTema<T extends Tata = Tata>({ aplikasi, lingkup, nama, tataTambahan, pratinjau, kunciCache, denganMode = true, denganKerangka = true, onTersimpan, className }: PengaturanTemaProps<T>) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useTemaAplikasi<T>(aplikasi, lingkup);
  const akses = useAksesTema(aplikasi, lingkup);
  const boleh = !!akses.data?.boleh;
  const [draf, setDraf] = React.useState<Draf<T> | null>(null);
  const [tab, setTab] = React.useState<'atur' | 'riwayat'>('atur');
  const [seluruh, setSeluruh] = React.useState(false);
  const [menyimpan, setMenyimpan] = React.useState(false);
  const idPratinjau = React.useId().replace(/[^a-zA-Z0-9_-]/g, '');

  const versi = q.data?.versi;
  React.useEffect(() => {
    if (!q.data) return;
    setDraf({ tema: { ...q.data.sendiri.tema }, tata: { ...(q.data.sendiri.tata as Partial<T>) }, catatan: '' });
    // Muat ulang draf hanya saat versi tersimpan berubah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versi, q.data === undefined]);

  const warisan = q.data?.warisan;
  const berlaku: Partial<OpsiTema> = React.useMemo(() => ({ ...(warisan?.tema ?? {}), ...(draf?.tema ?? {}) }), [warisan, draf?.tema]);
  const lengkap: OpsiTema = { ...TEMA_BAWAAN, ...berlaku } as OpsiTema;
  const tataBerlaku = { ...(warisan?.tata ?? {}), ...(draf?.tata ?? {}) } as Partial<T>;

  // Pratinjau di seluruh halaman: pasang sementara, kembalikan tema tersimpan saat dimatikan/keluar.
  React.useEffect(() => {
    if (!seluruh || !q.data) return;
    pasangTemaAplikasi(berlaku, { id: 'unipo-tema-pratinjau' });
    return () => pasangTemaAplikasi({}, { id: 'unipo-tema-pratinjau' });
  }, [seluruh, berlaku, q.data]);

  const cssPratinjau = React.useMemo(() => {
    const css = buatTema({ ...berlaku, muatFont: false });
    return css.replace(':root,\n.u-theme {', `#${idPratinjau} {`).replace(".dark,\n[data-theme='dark'] {", `.dark #${idPratinjau},\n[data-theme='dark'] #${idPratinjau} {`);
  }, [berlaku, idPratinjau]);

  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} title="Tema tidak dapat dimuat" />;
  if (!q.data || !draf) return <div className="u-tema-muat"><Spinner aria-label="Memuat tema" /></div>;
  if (!q.data.tersedia) return <Alert variant="warning" title="Pengaturan tema belum aktif">Tabel tema belum dibuat di server SIAKAD. Minta admin menjalankan <code>php artisan migrate</code>.</Alert>;

  const ubahTema = <K extends keyof OpsiTema>(k: K, v: OpsiTema[K] | undefined) =>
    setDraf((d) => {
      if (!d) return d;
      const tema = { ...d.tema };
      if (v === undefined || v === '') delete tema[k];
      else tema[k] = v;
      return { ...d, tema };
    });
  const ubahTata = (p: Partial<T>) => setDraf((d) => (d ? { ...d, tata: { ...d.tata, ...p } } : d));
  const asli = JSON.stringify({ t: q.data.sendiri.tema, x: q.data.sendiri.tata });
  const berubah = JSON.stringify({ t: draf.tema, x: draf.tata }) !== asli;
  const dariWarisan = (k: keyof OpsiTema) => !(k in draf.tema) && warisan?.tema && k in warisan.tema;

  const simpan = async () => {
    setMenyimpan(true);
    try {
      const r = await siakad.request<DataTemaAplikasi<T>>({ method: 'POST', path: pathTema(aplikasi), query: queryLingkup(lingkup), body: { tema: draf.tema, tata: draf.tata, catatan: draf.catatan || undefined } });
      pasangTemaAplikasi(r.data.tema, { kunciCache: kunciCache ?? `${aplikasi}.tema.css` });
      invalidateSiakad('tema');
      setSeluruh(false);
      toast.add({ title: 'Tema disimpan', description: `Versi ${r.data.versi} langsung berlaku untuk semua pengunjung.`, type: 'success' });
      onTersimpan?.(r.data);
    } catch (e) {
      toast.add({ title: 'Tema belum tersimpan', description: e instanceof Error ? e.message : 'Coba lagi beberapa saat.', type: 'error' });
    } finally {
      setMenyimpan(false);
    }
  };

  const presetAktif = PRESET_TEMA.find((p) => JSON.stringify({ ...TEMA_BAWAAN, ...p.opsi }) === JSON.stringify(lengkap))?.nama;

  return (
    <div className={['u-tema-atur', className].filter(Boolean).join(' ')}>
      <div className="u-tema-kepala">
        <div>
          <h2 className="u-tema-judul"><Palette aria-hidden /> Tema {nama ?? aplikasi}</h2>
          <p className="u-tema-sub">
            {q.data.versi ? <>Versi {q.data.versi}{q.data.diubah_oleh ? ` oleh ${q.data.diubah_oleh}` : ''}{q.data.diubah_pada ? `, ${q.data.diubah_pada}` : ''}.</> : 'Belum diatur; memakai tema bawaan.'}{' '}
            Perubahan berlaku untuk semua pengunjung tanpa deploy ulang.
          </p>
        </div>
        {!akses.loading && !boleh && <Badge variant="neutral">Hanya lihat</Badge>}
      </div>

      <Tabs<'atur' | 'riwayat'>
        variant="pill"
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'atur', label: 'Atur tema', icon: <Palette /> },
          ...(boleh ? [{ value: 'riwayat' as const, label: 'Riwayat', icon: <History /> }] : []),
        ]}
      />

      {tab === 'riwayat' ? (
        <RiwayatTema aplikasi={aplikasi} lingkup={lingkup} kunciCache={kunciCache} />
      ) : (
        <div className="u-tema-grid">
          <fieldset className="u-tema-form" disabled={!boleh || menyimpan}>
            <Card className="u-tema-kartu">
              <span className="u-label">Preset</span>
              <div className="u-tema-preset">
                {PRESET_TEMA.map((p) => (
                  <button key={p.nama} type="button" aria-pressed={presetAktif === p.nama} onClick={() => setDraf((d) => (d ? { ...d, tema: { ...p.opsi } } : d))}>
                    <span style={{ background: p.opsi.primary ?? TEMA_BAWAAN.primary }} />
                    <span style={{ background: p.opsi.secondary ?? TEMA_BAWAAN.secondary }} />
                    {p.nama}
                    {presetAktif === p.nama && <Check aria-hidden />}
                  </button>
                ))}
              </div>
              <PilihWarna label="Warna utama" nilai={lengkap.primary} daftar={PRIMER} warisan={dariWarisan('primary')} onChange={(v) => ubahTema('primary', v)} />
              <PilihWarna label="Warna aksen" nilai={lengkap.secondary} daftar={SEKUNDER} warisan={dariWarisan('secondary')} onChange={(v) => ubahTema('secondary', v)} />
              <details className="u-tema-lanjut">
                <summary>Aturan warna lanjutan</summary>
                <p className="u-field-description">Warna status, latar halaman, warna utama mode gelap, dan warna bayangan. Pilih Otomatis untuk memakai warna turunan bawaan.</p>
                <div className="u-tema-dua">
                  <PilihWarna label="Sukses" nilai={lengkap.success} daftar={['#15803d', '#16a34a', '#0f766e', '#059669']} warisan={dariWarisan('success')} onChange={(v) => ubahTema('success', v)} />
                  <PilihWarna label="Peringatan" nilai={lengkap.warning} daftar={['#d97706', '#ca8a04', '#ea580c', '#b45309']} warisan={dariWarisan('warning')} onChange={(v) => ubahTema('warning', v)} />
                  <PilihWarna label="Bahaya" nilai={lengkap.danger} daftar={['#dc2626', '#b91c1c', '#e11d48', '#be123c']} warisan={dariWarisan('danger')} onChange={(v) => ubahTema('danger', v)} />
                  <PilihWarna label="Informasi" nilai={lengkap.info} daftar={['#0284c7', '#2563eb', '#0891b2', '#4f46e5']} warisan={dariWarisan('info')} onChange={(v) => ubahTema('info', v)} />
                  <PilihWarna label="Latar halaman terang" nilai={lengkap.latar} daftar={['#ffffff', '#fbfbf9', '#f8fafc', '#fdfcf8']} warisan={dariWarisan('latar')} otomatis onChange={(v) => ubahTema('latar', v)} />
                  <PilihWarna label="Latar halaman gelap" nilai={lengkap.latarGelap} daftar={['#0d0f14', '#0f172a', '#111111', '#14161c']} warisan={dariWarisan('latarGelap')} otomatis onChange={(v) => ubahTema('latarGelap', v)} />
                  <PilihWarna label="Warna utama mode gelap" nilai={lengkap.primaryGelap} daftar={[]} warisan={dariWarisan('primaryGelap')} otomatis onChange={(v) => ubahTema('primaryGelap', v)} />
                  <PilihWarna label="Warna bayangan" nilai={lengkap.warnaBayangan} daftar={['#101828', '#0f172a', '#1c1917']} warisan={dariWarisan('warnaBayangan')} otomatis onChange={(v) => ubahTema('warnaBayangan', v)} />
                </div>
              </details>
              <div className="u-tema-dua">
                <Field label="Nuansa abu-abu">
                  <Select size="sm" value={lengkap.netral} onValueChange={(v) => v && ubahTema('netral', v)} options={Object.entries(NETRAL).map(([value, n]) => ({ value: value as OpsiTema['netral'], label: n.label }))} aria-label="Nuansa abu-abu" />
                </Field>
                <Field label="Huruf isi">
                  <Select size="sm" value={lengkap.font} onValueChange={(v) => v && ubahTema('font', v)} options={Object.entries(FONT).map(([value, f]) => ({ value: value as OpsiTema['font'], label: f.label }))} aria-label="Huruf isi" />
                </Field>
                <Field label="Huruf judul">
                  <Select
                    size="sm"
                    value={lengkap.fontJudul}
                    onValueChange={(v) => v && ubahTema('fontJudul', v)}
                    options={[{ value: 'sama' as OpsiTema['fontJudul'], label: 'Sama dengan isi' }, ...Object.entries(FONT).map(([value, f]) => ({ value: value as OpsiTema['fontJudul'], label: f.label }))]}
                    aria-label="Huruf judul"
                  />
                </Field>
                <Field label="Ukuran teks isi">
                  <SegmentedControl fullWidth value={String(lengkap.teks)} onValueChange={(v) => ubahTema('teks', Number(v))} options={[13, 14, 15, 16].map((n) => ({ value: String(n), label: `${n}` }))} aria-label="Ukuran teks isi (px)" />
                </Field>
              </div>
              <Field label="Sudut">
                <SegmentedControl
                  fullWidth
                  value={String(lengkap.radius)}
                  onValueChange={(v) => ubahTema('radius', Number(v))}
                  options={[{ value: '0', label: 'Siku' }, { value: '5', label: 'Tegas' }, { value: '10', label: 'Bawaan' }, { value: '16', label: 'Bulat' }, { value: '24', label: 'Lembut' }]}
                  aria-label="Sudut"
                />
              </Field>
              <div className="u-tema-dua">
                <Field label="Bayangan">
                  <SegmentedControl fullWidth value={lengkap.bayangan} onValueChange={(v) => ubahTema('bayangan', v as OpsiTema['bayangan'])} options={[{ value: 'tanpa', label: 'Tanpa' }, { value: 'halus', label: 'Halus' }, { value: 'normal', label: 'Normal' }, { value: 'tegas', label: 'Tegas' }]} aria-label="Bayangan" />
                </Field>
              </div>
              <Field label="Efek bayangan" description={PILIHAN_ELEVASI.find((x) => x.value === lengkap.elevasi)?.keterangan}>
                <SegmentedControl fullWidth value={lengkap.elevasi} onValueChange={(v) => ubahTema('elevasi', v as OpsiTema['elevasi'])} options={PILIHAN_ELEVASI.map(({ value, label }) => ({ value, label }))} aria-label="Efek bayangan" />
              </Field>
              <div className="u-tema-dua">
                <Field label="Gerak animasi">
                  <SegmentedControl fullWidth value={lengkap.gerak} onValueChange={(v) => ubahTema('gerak', v as OpsiTema['gerak'])} options={[{ value: 'cepat', label: 'Cepat' }, { value: 'normal', label: 'Normal' }, { value: 'lambat', label: 'Lambat' }, { value: 'tanpa', label: 'Tanpa' }]} aria-label="Gerak animasi" />
                </Field>
              </div>
              {denganMode && (
                <Field label="Mode tampilan bawaan" description="Berlaku bila pengunjung belum memilih terang/gelap sendiri.">
                  <SegmentedControl<ModeTampilan>
                    fullWidth
                    value={(tataBerlaku.mode as ModeTampilan | undefined) ?? 'pengguna'}
                    onValueChange={(v) => ubahTata({ mode: v } as Partial<T>)}
                    options={[{ value: 'pengguna', label: 'Ikuti perangkat', icon: <Monitor /> }, { value: 'terang', label: 'Terang', icon: <Sun /> }, { value: 'gelap', label: 'Gelap', icon: <Moon /> }]}
                    aria-label="Mode tampilan bawaan"
                  />
                </Field>
              )}
            </Card>
            {denganKerangka && <PengaturanKerangka tata={tataBerlaku as Record<string, unknown>} ubah={(k, v) => ubahTata({ [k]: v } as Partial<T>)} />}
            {tataTambahan && <Card className="u-tema-kartu">{tataTambahan(tataBerlaku, ubahTata)}</Card>}
          </fieldset>

          <div className="u-tema-samping">
            <Card className="u-tema-kartu">
              <div className="u-tema-baris">
                <span className="u-label">Pratinjau</span>
                <label className="u-tema-seluruh">
                  <Switch size="sm" checked={seluruh} onCheckedChange={setSeluruh} /> Coba di seluruh halaman
                </label>
              </div>
              <style>{cssPratinjau}</style>
              <div id={idPratinjau} className="u-tema-pratinjau">
                {pratinjau ?? <PratinjauBawaan />}
              </div>
            </Card>
            {boleh && (
              <Card className="u-tema-kartu">
                <Field label="Catatan perubahan" optional>
                  <Textarea rows={2} maxLength={255} value={draf.catatan} onChange={(e) => setDraf({ ...draf, catatan: e.target.value })} placeholder="mis. warna baru sesuai identitas fakultas" />
                </Field>
                <div className="u-tema-aksi">
                  <Button variant="ghost" size="sm" disabled={menyimpan || (!Object.keys(draf.tema).length && !Object.keys(draf.tata).length)} onClick={() => setDraf({ ...draf, tema: {}, tata: {} })}>
                    <RotateCcw /> {q.data.sumber.length > 1 || (q.data.sumber.length === 1 && !q.data.versi) ? 'Ikuti tema induk' : 'Kembali ke bawaan'}
                  </Button>
                  <Button variant="outline" size="sm" disabled={!berubah || menyimpan} onClick={() => setDraf({ tema: { ...q.data!.sendiri.tema }, tata: { ...(q.data!.sendiri.tata as Partial<T>) }, catatan: '' })}>
                    Batalkan
                  </Button>
                  <Button size="sm" loading={menyimpan} disabled={!berubah} onClick={() => void simpan()}>
                    <Save /> Simpan tema
                  </Button>
                </div>
                {q.data.sumber.some((s) => s.aplikasi !== aplikasi || s.lingkup !== (lingkup ?? '')) && (
                  <p className="u-tema-catatan">Kolom yang tidak diubah mengikuti tema {q.data.sumber.filter((s) => s.aplikasi !== aplikasi || s.lingkup !== (lingkup ?? '')).map((s) => (s.lingkup ? `${s.aplikasi} ${s.lingkup}` : s.aplikasi)).join(' dan ')}.</p>
                )}
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PilihWarna({ label, nilai, daftar, warisan, otomatis, onChange }: { label: string; nilai: string; daftar: string[]; warisan?: boolean | undefined; otomatis?: boolean; onChange: (v: string) => void }) {
  const [teks, setTeks] = React.useState(nilai);
  React.useEffect(() => setTeks(nilai), [nilai]);
  return (
    <Field label={<>{label}{warisan && <Badge variant="neutral" className="u-tema-warisan">diwarisi</Badge>}</>}>
      <div className="u-tema-warna">
        {otomatis && (
          <button type="button" className="u-tema-warna-otomatis" aria-pressed={!nilai} onClick={() => onChange('')}>
            Otomatis
          </button>
        )}
        {daftar.map((c) => (
          <button key={c} type="button" title={c} aria-label={`${label} ${c}`} aria-pressed={nilai === c} style={{ background: c }} onClick={() => onChange(c)} />
        ))}
        <label className="u-tema-warna-bebas" title="Pilih warna bebas">
          <input type="color" value={nilai || '#808080'} onChange={(e) => onChange(e.target.value)} aria-label={`${label} bebas`} />
        </label>
        <Input
          size="sm"
          className="u-tema-hex"
          value={teks}
          aria-label={`${label} (hex)`}
          onChange={(e) => setTeks(e.target.value)}
          onBlur={() => {
            const h = hexValid(teks);
            if (h) onChange(h);
            else if (otomatis && !teks.trim()) onChange('');
            else setTeks(nilai);
          }}
        />
      </div>
    </Field>
  );
}

function PratinjauBawaan() {
  return (
    <div className="u-tema-contoh">
      <div className="u-tema-contoh-kepala">
        <strong>Judul halaman</strong>
        <Badge variant="primary">Aktif</Badge>
        <Badge variant="secondary">Baru</Badge>
      </div>
      <p>Teks isi memakai huruf dan ukuran yang dipilih. <a href="#pratinjau" onClick={(e) => e.preventDefault()}>Contoh tautan</a>.</p>
      <div className="u-tema-contoh-tombol">
        <Button size="sm">Simpan</Button>
        <Button size="sm" variant="outline">Batal</Button>
        <Button size="sm" variant="soft">Lainnya</Button>
      </div>
      <Input size="sm" placeholder="Kolom isian" aria-label="Contoh kolom isian" />
      <Alert variant="success" title="Berhasil">Contoh pesan sukses.</Alert>
    </div>
  );
}

function RiwayatTema({ aplikasi, lingkup, kunciCache }: { aplikasi: string; lingkup?: string; kunciCache?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useSiakadQuery<{ riwayat: Array<{ id: number; versi: number; aksi: string; tema: Partial<OpsiTema>; catatan: string | null; oleh: string | null; pada: string | null }> }>(
    ['tema', aplikasi, lingkup ?? '', 'riwayat'],
    (s, signal) => s.request({ method: 'GET', path: pathTema(aplikasi, '/riwayat'), query: queryLingkup(lingkup) }, { signal }),
  );
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  if (!q.data) return <div className="u-tema-muat"><Spinner aria-label="Memuat riwayat" /></div>;
  if (!q.data.riwayat.length) return <Empty title="Belum ada riwayat" description="Setiap kali tema disimpan, versinya dicatat di sini dan bisa dipulihkan." />;
  const terbaru = q.data.riwayat[0]?.versi;
  return (
    <ol className="u-tema-riwayat">
      {q.data.riwayat.map((r) => (
        <li key={r.id}>
          <span className="u-tema-riwayat-warna" aria-hidden>
            <span style={{ background: r.tema.primary ?? TEMA_BAWAAN.primary }} />
            <span style={{ background: r.tema.secondary ?? TEMA_BAWAAN.secondary }} />
          </span>
          <div className="u-tema-riwayat-isi">
            <div className="u-tema-riwayat-judul">
              <strong>Versi {r.versi}</strong>
              {r.aksi === 'dipulihkan' && <Badge variant="info">dipulihkan</Badge>}
              {r.versi === terbaru && <Badge variant="success">berlaku</Badge>}
            </div>
            <span>{[r.oleh, r.pada].filter(Boolean).join(' · ')}</span>
            {r.catatan && <span className="u-tema-riwayat-catatan">{r.catatan}</span>}
          </div>
          {r.versi !== terbaru && (
            <ConfirmDialog
              trigger={<Button size="sm" variant="outline"><RotateCcw /> Pulihkan</Button>}
              title={`Pulihkan tema versi ${r.versi}?`}
              description="Tema versi ini menjadi tema berlaku (dicatat sebagai versi baru). Tema sekarang tetap ada di riwayat."
              confirmLabel="Pulihkan versi ini"
              tone="primary"
              onConfirm={async () => {
                try {
                  const h = await siakad.request<DataTemaAplikasi>({ method: 'POST', path: pathTema(aplikasi, `/riwayat/${r.id}/pulihkan`), query: queryLingkup(lingkup) });
                  pasangTemaAplikasi(h.data.tema, { kunciCache: kunciCache ?? `${aplikasi}.tema.css` });
                  invalidateSiakad('tema');
                  toast.add({ title: `Versi ${r.versi} dipulihkan`, type: 'success' });
                } catch (e) {
                  toast.add({ title: 'Gagal memulihkan', description: e instanceof Error ? e.message : undefined, type: 'error' });
                }
              }}
            />
          )}
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------- Sidebar & Header (KerangkaAplikasi)

type OpsiPilihan<V extends string> = Array<{ value: V; label: string }>;

function PratinjauKerangka({ t }: { t: TataKerangka }) {
  return (
    <div className="u-tema-kerangka-pratinjau" data-sb={t.sidebarGaya} data-hd={t.headerGaya} data-aktif={t.sidebarAktif} data-mini={t.sidebarMode === 'mini' ? '' : undefined} data-ringkas={t.headerTinggi === 'ringkas' ? '' : undefined} aria-hidden>
      <span className="u-tkp-sb">
        <i className="u-tkp-logo" />
        {t.sidebarPintasan && <i className="u-tkp-pin" />}
        <i data-aktif="" />
        <i />
        <i />
        <i />
        <span className="u-tkp-kaki" />
      </span>
      <span className="u-tkp-utama">
        <span className="u-tkp-hd">
          {t.headerJudul !== 'tanpa' && <i className="u-tkp-judul" />}
          {t.headerCari !== 'ikon' && <i className="u-tkp-cari" data-tengah={t.headerCari === 'tengah' ? '' : undefined} />}
          <i className="u-tkp-ikon" />
          <i className="u-tkp-ikon" />
        </span>
        <span className="u-tkp-isi">
          <i />
          <i />
        </span>
      </span>
    </div>
  );
}

function PengaturanKerangka({ tata, ubah }: { tata: Record<string, unknown>; ubah: (kunci: string, nilai: unknown) => void }) {
  const t = tataKerangka(tata);
  const set = <K extends keyof TataKerangka>(k: K, v: TataKerangka[K]) => ubah(KUNCI_TATA_KERANGKA[k], typeof v === 'boolean' ? (v ? 'ya' : 'tidak') : v);
  const seg = <K extends keyof TataKerangka>(k: K, label: string, opsi: OpsiPilihan<string>, keterangan?: string) => (
    <Field label={label} description={keterangan}>
      <SegmentedControl fullWidth value={String(typeof t[k] === 'boolean' ? (t[k] ? 'ya' : 'tidak') : t[k])} onValueChange={(v) => set(k, (v === 'ya' ? true : v === 'tidak' ? false : v) as TataKerangka[K])} options={opsi} aria-label={label} />
    </Field>
  );
  return (
    <Card className="u-tema-kartu">
      <div className="u-tema-baris">
        <span className="u-label">Sidebar dan header</span>
      </div>
      <PratinjauKerangka t={t} />
      <div className="u-tema-kelompok">Sidebar</div>
      {seg('sidebarGaya', 'Gaya', [{ value: 'terang', label: 'Latar halus' }, { value: 'gelap', label: 'Gelap' }, { value: 'utama', label: 'Warna utama' }, { value: 'menyatu', label: 'Menyatu' }])}
      <div className="u-tema-dua">
        {seg('sidebarMode', 'Mode bawaan', [{ value: 'penuh', label: 'Penuh' }, { value: 'mini', label: 'Mini' }, { value: 'otomatis', label: 'Otomatis' }], 'Otomatis = mini di layar < 1280 px')}
        {seg('sidebarPadat', 'Kepadatan', [{ value: 'rapat', label: 'Rapat' }, { value: 'normal', label: 'Normal' }, { value: 'lega', label: 'Lega' }])}
      </div>
      <div className="u-tema-dua">
        {seg('sidebarAktif', 'Menu aktif', [{ value: 'lembut', label: 'Latar lembut' }, { value: 'garis', label: 'Garis' }, { value: 'pil', label: 'Pil' }])}
        {seg('sidebarLebar', 'Lebar', [{ value: 'sempit', label: 'Sempit' }, { value: 'normal', label: 'Normal' }, { value: 'lebar', label: 'Lebar' }])}
      </div>
      {seg('sidebarPintasan', 'Pintasan menu sering dibuka', [{ value: 'ya', label: 'Tampilkan' }, { value: 'tidak', label: 'Sembunyikan' }])}
      <div className="u-tema-kelompok">Header</div>
      {seg('headerGaya', 'Gaya', [{ value: 'polos', label: 'Polos' }, { value: 'garis', label: 'Garis' }, { value: 'bayang', label: 'Berbayang' }, { value: 'blur', label: 'Blur' }, { value: 'utama', label: 'Warna utama' }])}
      <div className="u-tema-dua">
        {seg('headerTinggi', 'Tinggi', [{ value: 'ringkas', label: 'Ringkas' }, { value: 'normal', label: 'Normal' }])}
        {seg('headerLengket', 'Saat digulir', [{ value: 'ya', label: 'Tetap di atas' }, { value: 'tidak', label: 'Ikut tergulir' }])}
      </div>
      <div className="u-tema-dua">
        {seg('headerCari', 'Kotak cari', [{ value: 'tengah', label: 'Tengah' }, { value: 'kanan', label: 'Kanan' }, { value: 'ikon', label: 'Ikon' }])}
        {seg('headerJudul', 'Judul halaman', [{ value: 'judul', label: 'Judul' }, { value: 'breadcrumb', label: 'Jejak' }, { value: 'tanpa', label: 'Tanpa' }])}
      </div>
    </Card>
  );
}
