'use client';
/**
 * Persuratan lengkap di atas modul arsip SIAKAD: format penomoran surat, surat keluar yang ditulis langsung di
 * PengolahDokumen (kop dan margin dari templat dokumen bagian, QR verifikasi di tanda tangan saat terbit), dan
 * pencatatan arsip surat lama (unggah file + nomor dan metadata). Semua lewat /v1/arsip dan /v1/dokumen.
 */
import * as React from 'react';
import { Archive, FileUp, Hash, LayoutTemplate, Pencil, Plus, Save, Trash2, Upload, WandSparkles, X } from 'lucide-react';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Empty } from '../components/display';
import { Field, Input, RadioGroup, Switch, Textarea } from '../components/forms';
import { ConfirmDialog, Dialog } from '../components/overlays';
import { Combobox, Select } from '../components/select';
import { FormGrid } from '../components/wizard';
import { PENANDA_BAWAAN, isiTemplat, tanggalSurat } from '../editor/dokumen/templat';
import { MARGIN_SIAP, PengolahDokumen, type MarginKertas } from '../editor/pengolah/PengolahDokumen';
import { penandaKeChip, teksPolos } from '../editor/pengolah/html';
import type { UkuranKertas } from '../editor/dokumen/LembarSurat';
import { KEAMANAN_SURAT, SIFAT_SURAT } from './filter-presets';
import { GalatApi } from './galat';
import { useTemplatDokumen, type PengaturanDokumen, type TemplatEfektif } from './dokumen-terbit';
import { useUnggahBerkas } from './berkas';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { DaftarTujuan, PilihUnitArsipSaya, bersihTujuan, tujuanLengkap, useUnitArsipSaya, type SuratKeluar, type TujuanSuratInput, type UnitArsip } from './surat';
import { PilihEntitas } from './pilih';
import {
  ISIAN_DARI_DATA,
  PilihTemplatSurat,
  isianTemplat,
  jenisDariKode,
  nilaiIsianSurat,
  sumberIsianDari,
  terapkanIsian,
  type IsianSurat,
  type TemplatTerpilih,
} from './surat-galeri';
import { IsianTanggal } from '../components/formulir';
import { usePilihBerkas } from '../components/pilih-berkas-lokal';

// ---------------------------------------------------------------- data master arsip

export interface KlasifikasiArsip {
  id: number;
  induk_id?: number | null;
  kode: string;
  nama: string;
}

export interface JenisNaskahArsip {
  id: number;
  kode: string;
  nama: string;
}

export interface LokasiArsip {
  id: number;
  unit_id?: number | null;
  kode: string;
  nama: string;
  jenis?: string;
}

export interface PenomoranArsip {
  id: number;
  untuk: 'surat_keluar' | 'agenda_masuk' | 'agenda_keluar';
  unit_id?: number | null;
  jenis_id?: number | null;
  format: string;
  reset: 'tahunan' | 'bulanan' | 'tidak';
  keterangan?: string | null;
  aktif?: number | boolean;
}

export interface PratinjauNomor {
  format: string;
  berikutnya: string;
  reset?: string;
  periode?: string;
  terakhir?: number;
  penomoran_id?: number | null;
  contoh?: boolean;
}

/** Penanda format nomor, sama dengan Ref::TOKEN_NOMOR di server (ditampilkan bila /referensi belum termuat). */
export const TOKEN_NOMOR: Record<string, string> = {
  '{nomor:3}': 'Nomor urut 3 digit (001)',
  '{nomor}': 'Nomor urut tanpa nol',
  '{kode_unit}': 'Kode surat unit',
  '{kode_unit_induk}': 'Kode surat unit induk',
  '{kode_jenis}': 'Kode jenis naskah',
  '{klasifikasi}': 'Kode klasifikasi',
  '{bulan}': 'Bulan 01–12',
  '{bulan_romawi}': 'Bulan I–XII',
  '{tahun}': 'Tahun 4 digit',
  '{tahun2}': 'Tahun 2 digit',
};

const UNTUK_NOMOR: Record<PenomoranArsip['untuk'], string> = {
  surat_keluar: 'Nomor surat keluar',
  agenda_masuk: 'Nomor agenda surat masuk',
  agenda_keluar: 'Nomor agenda surat keluar',
};
const RESET_NOMOR: Record<PenomoranArsip['reset'], string> = { tahunan: 'Mulai dari 1 tiap tahun', bulanan: 'Mulai dari 1 tiap bulan', tidak: 'Tidak pernah diulang' };

const GET = <T,>(path: string, query?: Record<string, unknown>) => (s: ReturnType<typeof useSiakad>, signal: AbortSignal) => s.request<T>({ method: 'GET', path, query: query as never }, { signal });

/** Daftar klasifikasi arsip (kode klasifikasi surat) dari `/v1/arsip`, untuk pilihan di formulir surat. */
export function useKlasifikasiArsip() {
  return useSiakadQuery<KlasifikasiArsip[]>(['arsip/klasifikasi'], GET('/v1/arsip/klasifikasi', { aktif: 1, per_page: 500 }), { staleTime: 600_000 });
}
/** Daftar jenis naskah dinas (surat keputusan, edaran, undangan, …) dari `/v1/arsip`. */
export function useJenisNaskahArsip() {
  return useSiakadQuery<JenisNaskahArsip[]>(['arsip/jenis', 'naskah'], GET('/v1/arsip/jenis', { kelompok: 'naskah', aktif: 1, per_page: 200 }), { staleTime: 600_000 });
}
/** Daftar lokasi simpan arsip fisik (gedung, lemari, rak) milik unit. */
export function useLokasiArsip(unitId?: number | null) {
  return useSiakadQuery<LokasiArsip[]>(['arsip/lokasi', unitId ?? null], GET('/v1/arsip/lokasi', { unit_id: unitId ?? undefined, aktif: 1, per_page: 300 }), { enabled: Boolean(unitId), staleTime: 300_000 });
}

/** Pratinjau nomor berikutnya (tanpa memakai nomor), atau contoh dari `format` yang sedang disunting. */
export function usePratinjauNomor(q: { unit_id?: number | null; untuk?: PenomoranArsip['untuk']; jenis_id?: number | null; klasifikasi_id?: number | null; tanggal?: string | null; format?: string }) {
  const [tunda, setTunda] = React.useState(q.format ?? '');
  React.useEffect(() => {
    const t = setTimeout(() => setTunda(q.format ?? ''), 350);
    return () => clearTimeout(t);
  }, [q.format]);
  return useSiakadQuery<PratinjauNomor>(
    ['arsip/penomoran/pratinjau', q.unit_id ?? null, q.untuk ?? 'surat_keluar', q.jenis_id ?? null, q.klasifikasi_id ?? null, q.tanggal ?? null, tunda],
    GET('/v1/arsip/penomoran/pratinjau', {
      unit_id: q.unit_id,
      untuk: q.untuk ?? 'surat_keluar',
      jenis_id: q.jenis_id ?? undefined,
      klasifikasi_id: q.klasifikasi_id ?? undefined,
      tanggal: q.tanggal ?? undefined,
      format: tunda || undefined,
    }),
    { enabled: Boolean(q.unit_id), staleTime: 10_000 },
  );
}

const kodeKlasifikasi = (k: KlasifikasiArsip) => `${k.kode} · ${k.nama}`;

function PilihKlasifikasi({ nilai, ganti, id }: { nilai: number | null; ganti: (v: number | null) => void; id?: string }) {
  const q = useKlasifikasiArsip();
  const items = q.data ?? [];
  return (
    <Combobox<KlasifikasiArsip>
      id={id}
      aria-label="Klasifikasi arsip"
      items={items}
      value={items.find((k) => k.id === nilai) ?? null}
      onValueChange={(k) => ganti(k?.id ?? null)}
      itemToString={kodeKlasifikasi}
      itemKey={(k) => String(k.id)}
      placeholder={q.loading ? 'Memuat…' : 'Bawaan jenis naskah'}
      emptyText="Klasifikasi tidak ditemukan"
    />
  );
}

// ---------------------------------------------------------------- kop dari templat dokumen

const isiToken = (t: string | undefined, data: Record<string, string>) => (t ?? '').replace(/\{([a-z_]+)\}/g, (_m, k: string) => data[k] ?? '').replace(/\s*·\s*(·\s*)+/g, ' · ').replace(/^\s*·\s*|\s*·\s*$/g, '').trim();

/** Kop surat dari templat dokumen yang berlaku (GET /v1/dokumen/templat/efektif), sama dengan kop di PDF. */
export function KopTemplatDokumen({ efektif, logo }: { efektif: TemplatEfektif | undefined; logo?: string }) {
  const kop = efektif?.pengaturan.kop;
  if (!efektif || !kop || kop.tampil === false) return null;
  const data = efektif.data ?? {};
  const garis = kop.garis ?? 'tebal_tipis';
  const baris = (kop.baris ?? []).map((b) => ({ ...b, teks: isiToken(b.teks, data) })).filter((b) => b.teks);
  return (
    <header className="u-lembar-kop u-kop-templat" data-garis={garis} data-rata={kop.perataan ?? 'tengah'} style={{ borderBottomColor: kop.warna_garis ?? '#000' }}>
      {logo && kop.logo !== 'tanpa' && <img src={logo} alt="" className="u-lembar-logo" style={{ height: `${kop.tinggi_logo ?? 22}mm`, width: 'auto' }} />}
      <div>
        {baris.length ? (
          baris.map((b, i) => (
            <p key={i} style={{ fontSize: `${b.ukuran}pt`, fontWeight: b.tebal ? 700 : 400, color: b.warna, textTransform: 'uppercase', margin: 0 }}>
              {b.teks}
            </p>
          ))
        ) : (
          <p className="u-lembar-instansi">Kop belum diatur</p>
        )}
        {isiToken(kop.alamat, data) && <p className="u-lembar-alamat">{isiToken(kop.alamat, data)}</p>}
        {isiToken(kop.kontak, data) && <p className="u-lembar-alamat">{isiToken(kop.kontak, data)}</p>}
      </div>
    </header>
  );
}

const KERTAS_DOK: Record<string, UkuranKertas> = { A4: 'a4', F4: 'f4', Letter: 'letter' };
/** Kertas dan margin (mm → cm) dari pengaturan templat dokumen. */
export function tataLetakDariTemplat(p?: PengaturanDokumen): { kertas: UkuranKertas; margin: MarginKertas } {
  const m = p?.margin;
  return {
    kertas: KERTAS_DOK[p?.kertas ?? 'A4'] ?? 'a4',
    margin: m ? { atas: (m.atas ?? 20) / 10, kanan: (m.kanan ?? 20) / 10, bawah: (m.bawah ?? 20) / 10, kiri: (m.kiri ?? 30) / 10 } : MARGIN_SIAP.dinas.margin,
  };
}

// ---------------------------------------------------------------- pengaturan penomoran

export interface PengaturanPenomoranProps {
  /** Unit yang diatur. Tanpa ini memakai unit pertama tempat pengguna berperan admin/sekretaris/arsiparis. */
  unitId?: number;
  className?: string;
}

const PERAN_ATUR = ['admin', 'sekretaris', 'arsiparis'];

/**
 * Atur format nomor surat keluar dan nomor agenda per unit (dan per jenis naskah bila perlu): penanda bisa diklik,
 * contoh nomor tampil langsung dari server, dan nomor berikutnya yang akan dipakai.
 */
export function PengaturanPenomoran({ unitId, className }: PengaturanPenomoranProps) {
  const siakad = useSiakad();
  const unit = useUnitArsipSaya();
  const bolehAtur = (unit.data ?? []).filter((u) => PERAN_ATUR.includes(u.peran_saya ?? ''));
  const [pilih, setPilih] = React.useState<number | null>(unitId ?? null);
  const uid = unitId ?? pilih ?? bolehAtur[0]?.id ?? null;
  const daftar = useSiakadQuery<PenomoranArsip[]>(['arsip/penomoran', uid], GET('/v1/arsip/penomoran', { unit_id: uid ?? undefined, per_page: 100 }), { enabled: Boolean(uid) });
  const jenis = useJenisNaskahArsip();
  const [sunting, setSunting] = React.useState<PenomoranArsip | 'baru' | null>(null);
  const [hapus, setHapus] = React.useState<PenomoranArsip | null>(null);
  const milikUnit = (daftar.data ?? []).filter((p) => p.unit_id === uid || p.unit_id == null);
  const namaJenis = (id?: number | null) => (id ? (jenis.data?.find((j) => j.id === id)?.nama ?? `Jenis #${id}`) : 'Semua jenis');

  if (!unit.loading && !bolehAtur.length && !unitId) {
    return <Empty bordered icon={<Hash />} title="Tidak ada unit yang bisa diatur" description="Format nomor diatur oleh admin, sekretaris, atau arsiparis unit." />;
  }

  return (
    <div className={['u-psr', className].filter(Boolean).join(' ')}>
      <div className="u-psr-alat">
        {!unitId && bolehAtur.length > 1 && (
          <PilihUnitArsipSaya aria-label="Unit" unit={bolehAtur} kosongkan={false} value={uid} onValueChange={(v) => setPilih(v)} />
        )}
        <Button onClick={() => setSunting('baru')} disabled={!uid}>
          <Plus />
          Tambah format
        </Button>
      </div>

      <div className="u-psr-kisi">
        {(Object.keys(UNTUK_NOMOR) as PenomoranArsip['untuk'][]).map((u) => (
          <KartuNomorBerlaku key={u} unitId={uid} untuk={u} />
        ))}
      </div>

      {daftar.error ? (
        <GalatApi error={daftar.error} onRetry={daftar.refetch} />
      ) : daftar.loading && !daftar.data ? (
        <Skeleton height={120} />
      ) : !milikUnit.length ? (
        <Empty bordered icon={<Hash />} title="Masih memakai format bawaan" description="Tambah format bila unit memakai pola nomor sendiri, mis. 001/UN47.FIKOM/PP.00.01/XI/2026." />
      ) : (
        <ul className="u-psr-daftar">
          {milikUnit.map((p) => (
            <li key={p.id}>
              <div>
                <p className="u-psr-format">{p.format}</p>
                <p className="u-psr-meta">
                  {UNTUK_NOMOR[p.untuk]} · {namaJenis(p.jenis_id)} · {RESET_NOMOR[p.reset]}
                  {p.unit_id == null && ' · berlaku semua unit'}
                </p>
              </div>
              {!p.aktif && <Badge variant="neutral">Nonaktif</Badge>}
              {p.unit_id != null && (
                <span className="u-psr-aksi">
                  <Button variant="ghost" size="sm" iconOnly aria-label="Ubah format" onClick={() => setSunting(p)}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="sm" iconOnly aria-label="Hapus format" onClick={() => setHapus(p)}>
                    <Trash2 />
                  </Button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {sunting && uid && (
        <FormPenomoran
          key={sunting === 'baru' ? 'baru' : sunting.id}
          unitId={uid}
          awal={sunting === 'baru' ? null : sunting}
          jenis={jenis.data ?? []}
          tutup={() => setSunting(null)}
          simpan={async (body, id) => {
            await siakad.request({ method: id ? 'PUT' : 'POST', path: id ? `/v1/arsip/penomoran/${id}` : '/v1/arsip/penomoran', body });
            invalidateSiakad('arsip/penomoran');
            setSunting(null);
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(hapus)}
        onOpenChange={(o) => !o && setHapus(null)}
        title="Hapus format nomor?"
        description={hapus ? `${hapus.format}. Surat berikutnya memakai format yang lebih umum atau bawaan.` : undefined}
        confirmLabel="Hapus format"
        onConfirm={async () => {
          if (!hapus) return;
          await siakad.request({ method: 'DELETE', path: `/v1/arsip/penomoran/${hapus.id}` });
          invalidateSiakad('arsip/penomoran');
          setHapus(null);
        }}
      />
    </div>
  );
}

function KartuNomorBerlaku({ unitId, untuk }: { unitId: number | null; untuk: PenomoranArsip['untuk'] }) {
  const p = usePratinjauNomor({ unit_id: unitId, untuk });
  return (
    <div className="u-psr-kartu">
      <p className="u-psr-kartu-label">{UNTUK_NOMOR[untuk]}</p>
      {p.loading && !p.data ? <Skeleton height={22} /> : <p className="u-psr-kartu-nomor">{p.data?.berikutnya ?? '-'}</p>}
      <p className="u-psr-kartu-meta">{p.data ? `${p.data.penomoran_id ? 'Format unit' : 'Format bawaan'} · ${p.data.terakhir ?? 0} terpakai periode ${p.data.periode ?? ''}` : ' '}</p>
    </div>
  );
}

function FormPenomoran({ unitId, awal, jenis, tutup, simpan }: { unitId: number; awal: PenomoranArsip | null; jenis: JenisNaskahArsip[]; tutup: () => void; simpan: (body: Record<string, unknown>, id?: number) => Promise<void> }) {
  const [untuk, setUntuk] = React.useState<PenomoranArsip['untuk']>(awal?.untuk ?? 'surat_keluar');
  const [jenisId, setJenisId] = React.useState<number | null>(awal?.jenis_id ?? null);
  const [format, setFormat] = React.useState(awal?.format ?? '{nomor:3}/{kode_unit}/{klasifikasi}/{bulan_romawi}/{tahun}');
  const [reset, setReset] = React.useState<PenomoranArsip['reset']>(awal?.reset ?? 'tahunan');
  const [keterangan, setKeterangan] = React.useState(awal?.keterangan ?? '');
  const [aktif, setAktif] = React.useState(awal ? Boolean(awal.aktif) : true);
  const [proses, setProses] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const masukan = React.useRef<HTMLInputElement>(null);
  const contoh = usePratinjauNomor({ unit_id: unitId, untuk, jenis_id: jenisId, format });
  const galatFormat = !/\{nomor(:[1-6])?\}/.test(format) ? 'Format harus memuat {nomor} atau {nomor:3}.' : contoh.error ? pesanGalat(contoh.error) : null;
  const sisip = (t: string) => {
    const el = masukan.current;
    const a = el?.selectionStart ?? format.length;
    const b = el?.selectionEnd ?? format.length;
    const baru = format.slice(0, a) + t + format.slice(b);
    setFormat(baru);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(a + t.length, a + t.length);
    });
  };
  return (
    <Dialog
      side="right"
      open
      onOpenChange={(o) => !o && tutup()}
      size="lg"
      title={awal ? 'Ubah format nomor' : 'Tambah format nomor'}
      description="Format paling spesifik yang dipakai: unit + jenis naskah, lalu unit, lalu umum, lalu bawaan."
      footer={
        <>
          <Button variant="outline" onClick={tutup}>
            Batal
          </Button>
          <Button
            loading={proses}
            disabled={Boolean(galatFormat)}
            onClick={async () => {
              setProses(true);
              setGalat(null);
              try {
                await simpan({ untuk, unit_id: unitId, jenis_id: jenisId, format: format.trim(), reset, keterangan: keterangan.trim() || null, aktif }, awal?.id);
              } catch (e) {
                setGalat(pesanGalat(e));
              } finally {
                setProses(false);
              }
            }}
          >
            <Save />
            Simpan format
          </Button>
        </>
      }
    >
      <div className="u-psr-form">
        <FormGrid>
          <Field label="Dipakai untuk">
            <Select<PenomoranArsip['untuk']> value={untuk} onValueChange={(v) => v && setUntuk(v)} options={(Object.keys(UNTUK_NOMOR) as PenomoranArsip['untuk'][]).map((u) => ({ value: u, label: UNTUK_NOMOR[u] }))} />
          </Field>
          <Field label="Jenis naskah" optional description="Kosong = semua jenis.">
            <Select<number | null> value={jenisId} onValueChange={setJenisId} placeholder="Semua jenis" options={[{ value: null, label: 'Semua jenis' }, ...jenis.map((j) => ({ value: j.id as number | null, label: `${j.nama} (${j.kode})` }))]} />
          </Field>
        </FormGrid>
        <Field label="Format" error={galatFormat ?? undefined} description="Klik penanda untuk menyisipkan di posisi kursor.">
          <Input ref={masukan} value={format} onChange={(e) => setFormat(e.target.value)} maxLength={150} className="u-psr-input-format" />
        </Field>
        <div className="u-psr-token">
          {Object.entries(TOKEN_NOMOR).map(([t, l]) => (
            <button key={t} type="button" title={l} onClick={() => sisip(t)}>
              <code>{t}</code>
              <span>{l}</span>
            </button>
          ))}
        </div>
        <div className="u-psr-contoh" aria-live="polite">
          <span>Contoh</span>
          <b>{galatFormat ? '-' : (contoh.data?.berikutnya ?? '…')}</b>
        </div>
        <FormGrid>
          <Field label="Nomor urut">
            <Select<PenomoranArsip['reset']> value={reset} onValueChange={(v) => v && setReset(v)} options={(Object.keys(RESET_NOMOR) as PenomoranArsip['reset'][]).map((r) => ({ value: r, label: RESET_NOMOR[r] }))} />
          </Field>
          <Field label="Aktif" orientation="horizontal">
            <Switch checked={aktif} onCheckedChange={setAktif} />
          </Field>
        </FormGrid>
        <Field label="Keterangan" optional>
          <Input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} />
        </Field>
        {galat && <Alert variant="danger">{galat}</Alert>}
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------- surat keluar di pengolah dokumen

export interface SuratArsip extends SuratKeluar {
  arah?: 'masuk' | 'keluar';
  unit_id?: number;
  unit?: { id: number; nama: string; kode?: string } | null;
  jenis_id?: number | null;
  klasifikasi_id?: number | null;
  template_id?: number | null;
  tanggal_surat?: string | null;
  sifat?: string;
  keamanan?: string;
  lampiran?: string | null;
  ringkasan?: string | null;
  isi?: string | null;
  tujuan?: Array<TujuanSuratInput & { unit_nama?: string | null }>;
  hak?: Record<string, boolean>;
}

export interface EditorSuratKeluarProps {
  /** Unit pengirim untuk surat baru. Tanpa ini memakai unit pertama tempat pengguna menjadi petugas. */
  unitId?: number;
  /** Sunting konsep yang sudah ada (uuid/id). */
  surat?: string | number | null;
  /** Logo di kop (mis. logo kampus dari situs). */
  logo?: string;
  /** Setelah konsep tersimpan. */
  onSelesai?: (surat: SuratArsip) => void;
  /** Tombol kembali/tutup di bilah atas. */
  onTutup?: () => void;
  /**
   * Untuk surat baru: buka galeri templat lebih dulu (bawaan true). Pengguna memilih templat (bawaan UNIPO, unit, atau
   * bersama) lalu surat dibangkitkan dari isian, atau memilih kertas kosong.
   */
  galeriAwal?: boolean;
  /** Templat yang langsung dimuat untuk surat baru (melewati galeri). */
  templatAwal?: TemplatTerpilih | null;
  tinggi?: number | string;
  className?: string;
}

interface DrafSurat {
  unitId: number | null;
  templatId: number | null;
  jenisId: number | null;
  klasifikasiId: number | null;
  perihal: string;
  tanggal: string;
  sifat: string;
  keamanan: string;
  lampiran: string;
  tujuan: TujuanSuratInput[];
  data: Record<string, string>;
}

const hariIniIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function namaTujuan(t: TujuanSuratInput & { unit_nama?: string | null }) {
  return [t.jabatan, t.nama ?? t.unit_nama, t.instansi].filter(Boolean).join(' ') || '…';
}

/**
 * Tulis surat keluar langsung di pengolah dokumen: kop dan margin mengikuti templat dokumen unit, kepala surat
 * (nomor, sifat, lampiran, hal, tujuan) dan tanda tangan + QR verifikasi tampil persis seperti PDF yang akan terbit.
 * Panel samping berisi data surat, templat, dan isian penanda. Simpan sebagai konsep (POST/PUT /v1/arsip/surat-keluar);
 * nomor diberikan otomatis menurut format penomoran saat surat disetujui.
 */
export function EditorSuratKeluar({ unitId, surat, logo, onSelesai, onTutup, galeriAwal = true, templatAwal, tinggi = 'calc(100dvh - 6rem)', className }: EditorSuratKeluarProps) {
  const siakad = useSiakad();
  const unit = useUnitArsipSaya();
  const jenis = useJenisNaskahArsip();
  const ada = useSiakadQuery<SuratArsip>(['arsip/surat', surat ?? ''], GET(`/v1/arsip/surat/${encodeURIComponent(String(surat ?? ''))}`), { enabled: Boolean(surat), staleTime: 0 });
  const unitSaya = (unit.data ?? []).filter((u) => u.peran_saya);
  const [d, setD] = React.useState<DrafSurat>({
    unitId: unitId ?? null,
    templatId: null,
    jenisId: null,
    klasifikasiId: null,
    perihal: '',
    tanggal: hariIniIso(),
    sifat: 'biasa',
    keamanan: 'biasa',
    lampiran: '',
    tujuan: [],
    data: {},
  });
  const [isi, setIsi] = React.useState('');
  const [kunci, setKunci] = React.useState(0);
  const [awalIsi, setAwalIsi] = React.useState('');
  const [simpan, setSimpan] = React.useState<'idle' | 'proses' | 'ok'>('idle');
  const [galat, setGalat] = React.useState<string | null>(null);
  const [gantiTemplat, setGantiTemplat] = React.useState<TemplatTerpilih | null>(null);
  const [templat, setTemplat] = React.useState<TemplatTerpilih | null>(null);
  const [galeri, setGaleri] = React.useState(() => !surat && !templatAwal && galeriAwal);
  const [dibangkitkan, setDibangkitkan] = React.useState(false);
  const ubah = (x: Partial<DrafSurat>) => setD((v) => ({ ...v, ...x }));

  // Muat konsep yang ada.
  React.useEffect(() => {
    const s = ada.data;
    if (!s) return;
    setD({
      unitId: s.unit_id ?? s.unit?.id ?? null,
      templatId: s.template_id ?? null,
      jenisId: s.jenis_id ?? null,
      klasifikasiId: s.klasifikasi_id ?? null,
      perihal: s.perihal ?? '',
      tanggal: s.tanggal_surat ?? hariIniIso(),
      sifat: s.sifat ?? 'biasa',
      keamanan: s.keamanan ?? 'biasa',
      lampiran: s.lampiran ?? '',
      tujuan: (s.tujuan ?? []).map((t) => ({ ...t, nama: t.nama ?? t.unit_nama ?? undefined })),
      data: {},
    });
    setAwalIsi(s.isi ?? '');
    setIsi(s.isi ?? '');
    setKunci((k) => k + 1);
  }, [ada.data]);

  const uid = d.unitId ?? unitSaya[0]?.id ?? null;
  const unitAktif = (unit.data ?? []).find((u) => u.id === uid) as UnitArsip | undefined;
  const efektif = useTemplatDokumen('surat_keluar', unitAktif?.kode ?? null);
  const tata = React.useMemo(() => tataLetakDariTemplat(efektif.data?.pengaturan), [efektif.data]);
  const [kertas, setKertas] = React.useState<UkuranKertas>('a4');
  const [margin, setMargin] = React.useState<MarginKertas>(MARGIN_SIAP.dinas.margin);
  React.useEffect(() => {
    setKertas(tata.kertas);
    setMargin(tata.margin);
  }, [tata]);
  const nomor = usePratinjauNomor({ unit_id: uid, untuk: 'surat_keluar', jenis_id: d.jenisId, klasifikasi_id: d.klasifikasiId, tanggal: d.tanggal });
  const isian = React.useMemo<IsianSurat[]>(() => isianTemplat(isi, templat?.isian), [isi, templat]);
  const nilaiTampil = React.useMemo(() => nilaiIsianSurat(d.data, isian), [d.data, isian]);
  const terisi = isian.filter((p2) => nilaiTampil[p2.nama]).length;
  const sumberData = React.useMemo(() => sumberIsianDari(isian.map((p2) => p2.nama)), [isian]);
  const bawaanDipakai = React.useMemo(() => PENANDA_BAWAAN.filter((p) => isi.includes(`{{${p.nama}}}`)), [isi]);

  const pakaiTemplat = (t: TemplatTerpilih | null) => {
    setTemplat(t);
    setDibangkitkan(false);
    if (!t) {
      ubah({ templatId: null });
      return;
    }
    const jenisId = t.jenis_id ?? jenisDariKode(jenis.data, t.jenis_kode);
    ubah({ templatId: t.sumber === 'bawaan' ? null : (t.id ?? null), ...(t.perihal && !d.perihal ? { perihal: t.perihal } : {}), ...(jenisId && !d.jenisId ? { jenisId } : {}) });
    setAwalIsi(penandaKeChip(t.isi));
    setKunci((k) => k + 1);
  };
  const pilihDariGaleri = (t: TemplatTerpilih | null) => {
    setGaleri(false);
    if (t && teksPolos(isi)) setGantiTemplat(t);
    else pakaiTemplat(t);
  };
  // Templat yang diberikan lewat props untuk surat baru.
  const awalDipakai = React.useRef(false);
  React.useEffect(() => {
    if (surat || !templatAwal || awalDipakai.current || (templatAwal.jenis_kode && jenis.loading)) return;
    awalDipakai.current = true;
    pakaiTemplat(templatAwal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templatAwal, surat, jenis.loading]);

  /** Bangkitkan surat: penanda yang sudah diisi ditulis sebagai teks biasa di kertas (masih bisa disunting). */
  const bangkitkan = () => {
    const html = terapkanIsian(isi, { ...(unitAktif ? { unit: unitAktif.nama, unit_singkatan: unitAktif.singkatan ?? '' } : {}), ...nilaiTampil });
    setAwalIsi(html);
    setIsi(html);
    setKunci((k) => k + 1);
    setDibangkitkan(true);
  };

  const unggahBerkas = useUnggahBerkas({ visibilitas: 'publik', modul: 'arsip', kategori: 'gambar' });
  const unggah = React.useCallback(
    async (f: File) => {
      const b = await unggahBerkas(f);
      const url = b.url ?? (await siakad.request<{ url: string }>({ method: 'GET', path: `/v1/berkas/${encodeURIComponent(b.id)}/url`, query: { ttl: 31_536_000 } })).data.url;
      return { url, nama: b.nama };
    },
    [unggahBerkas, siakad],
  );

  const kosong = !teksPolos(isi) && !/<(img|table)\b/i.test(isi);
  const galatIsian = !uid ? 'Pilih unit pengirim.' : !d.perihal.trim() ? 'Perihal wajib diisi.' : d.tujuan.some((t) => !tujuanLengkap(t)) ? 'Lengkapi atau hapus tujuan yang masih kosong.' : null;

  const kirim = async () => {
    if (galatIsian || !uid) {
      setGalat(galatIsian);
      return;
    }
    setSimpan('proses');
    setGalat(null);
    try {
      // Penanda diisi di browser persis seperti server; penanda tanpa nilai tetap {{nama}}.
      const isiJadi = isiTemplat(isi, nilaiTampil, { unit: unitAktif ? { nama: unitAktif.nama, singkatan: unitAktif.singkatan } : null, surat: { tanggal_surat: d.tanggal, perihal: d.perihal, lampiran: d.lampiran } });
      const body = {
        jenis_id: d.jenisId,
        klasifikasi_id: d.klasifikasiId,
        tanggal_surat: d.tanggal || null,
        perihal: d.perihal.trim(),
        lampiran: d.lampiran.trim() || null,
        sifat: d.sifat,
        keamanan: d.keamanan,
        isi: isiJadi,
        tujuan: d.tujuan.map(bersihTujuan),
      };
      const id = ada.data?.uuid ?? surat;
      const r = id
        ? await siakad.request<SuratArsip>({ method: 'PUT', path: `/v1/arsip/surat/${encodeURIComponent(String(id))}`, body })
        : await siakad.request<SuratArsip>({ method: 'POST', path: '/v1/arsip/surat-keluar', body: { ...body, unit_id: uid, template_id: d.templatId } });
      invalidateSiakad('arsip/surat');
      setSimpan('ok');
      onSelesai?.(r.data);
    } catch (e) {
      setGalat(pesanGalat(e));
      setSimpan('idle');
    }
  };

  if (surat && ada.loading && !ada.data) return <Skeleton height={480} />;
  if (surat && ada.error) return <GalatApi error={ada.error} onRetry={ada.refetch} />;

  const utama = d.tujuan.filter((t) => !t.tembusan);
  const tembusan = d.tujuan.filter((t) => t.tembusan);
  const p = efektif.data?.pengaturan;
  const kota = isiToken(p?.ttd?.kota, efektif.data?.data ?? {});
  const rataTtd = p?.ttd?.posisi ?? 'kanan';

  const sebelumIsi = (
    <div className="u-psr-kepala">
      {/* unipo-ui-izinkan tabel-bawaan: kepala surat resmi (tata letak naskah dinas) */}
      <table className="ub-tabel-polos">
        <tbody>
          <tr>
            <td style={{ width: '15%' }}>Nomor</td>
            <td>: {ada.data?.nomor_surat ?? <span className="u-psr-nomor-nanti" title="Nomor diberikan saat surat disetujui">{nomor.data?.berikutnya ?? '…'}</span>}</td>
            <td className="ub-rata-kanan" style={{ width: '32%' }}>
              {tanggalSurat(d.tanggal)}
            </td>
          </tr>
          <tr>
            <td>Sifat</td>
            <td colSpan={2}>: {SIFAT_SURAT.find((s) => s.value === d.sifat)?.label ?? d.sifat}</td>
          </tr>
          <tr>
            <td>Lampiran</td>
            <td colSpan={2}>: {d.lampiran || '-'}</td>
          </tr>
          <tr>
            <td>Hal</td>
            <td colSpan={2}>
              : <b>{d.perihal || '…'}</b>
            </td>
          </tr>
        </tbody>
      </table>
      {utama.length > 0 && (
        <p className="u-psr-kepada">
          Kepada Yth.
          {utama.map((t, i) => (
            <React.Fragment key={i}>
              <br />
              {namaTujuan(t)}
            </React.Fragment>
          ))}
          <br />
          di tempat
        </p>
      )}
    </div>
  );

  const kaki = (
    <div className="u-psr-kaki">
      <div className="u-psr-ttd" data-posisi={rataTtd}>
        <p>{[kota, tanggalSurat(d.tanggal)].filter(Boolean).join(', ')}</p>
        <p>{p?.ttd?.jabatan || 'Penandatangan'},</p>
        <div className="u-psr-ttd-ruang">
          {p?.qr?.posisi === 'ttd' || !p ? (
            <span className="u-psr-qr" title={p?.qr?.teks ?? 'QR verifikasi'}>
              QR
            </span>
          ) : null}
          <small>{p?.qr?.posisi === 'ttd' || !p ? 'QR verifikasi dibuat saat surat diterbitkan' : 'Tanda tangan'}</small>
        </div>
        <p className="u-psr-ttd-nama">{p?.ttd?.nama || 'Nama penandatangan (dari persetujuan)'}</p>
      </div>
      {tembusan.length > 0 && (
        <div className="u-psr-tembusan">
          Tembusan:
          <ol>
            {tembusan.map((t, i) => (
              <li key={i}>{namaTujuan(t)}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );

  const panel = (
    <div className="u-psr-panel">
      {!unitId && !surat && unitSaya.length > 1 && (
        <Field label="Unit pengirim">
          <PilihUnitArsipSaya unit={unitSaya} kosongkan={false} value={uid} onValueChange={(v) => ubah({ unitId: v, templatId: null })} />
        </Field>
      )}
      <section className="u-psr-templat">
        <h3 className="u-psr-sub">Templat</h3>
        <div className="u-psr-templat-kartu">
          <LayoutTemplate aria-hidden />
          <div>
            <p>{templat?.nama ?? (d.templatId ? 'Templat unit' : 'Tanpa templat')}</p>
            <p className="u-psr-redup">{templat ? (templat.sumber === 'bawaan' ? 'Galeri UNIPO' : templat.sumber === 'unit' ? 'Templat unit' : 'Templat bersama') : 'Surat ditulis bebas di kertas'}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setGaleri(true)}>
            {templat ? 'Ganti' : 'Pilih templat'}
          </Button>
        </div>
      </section>
      {(isian.length > 0 || bawaanDipakai.length > 0) && (
        <section className="u-psr-isian">
          <h3 className="u-psr-sub">
            Isian surat
            {isian.length > 0 && (
              <Badge variant={terisi === isian.length ? 'success' : 'neutral'}>
                {terisi}/{isian.length} terisi
              </Badge>
            )}
          </h3>
          {bawaanDipakai.length > 0 && <p className="u-psr-redup">Diisi otomatis: {bawaanDipakai.map((p2) => p2.label.toLowerCase()).join(', ')}.</p>}
          {sumberData.map((sb) => (
            <Field key={sb} label={ISIAN_DARI_DATA[sb].label} description="Mengisi beberapa isian sekaligus dari data SIAKAD.">
              <PilihEntitas
                jenis={sb}
                value={null}
                onValueChange={(_v, baris) => {
                  if (!baris) return;
                  const isi2: Record<string, string> = {};
                  for (const [nama, f] of Object.entries(ISIAN_DARI_DATA[sb].penanda)) if (isian.some((p2) => p2.nama === nama)) isi2[nama] = f(baris);
                  ubah({ data: { ...d.data, ...isi2 } });
                }}
              />
            </Field>
          ))}
          {isian.map((p2) => (
            <Field key={p2.nama} label={p2.label} description={p2.petunjuk}>
              {p2.tipe === 'paragraf' ? (
                <Textarea rows={3} value={d.data[p2.nama] ?? ''} placeholder={p2.contoh ?? `{{${p2.nama}}}`} onChange={(e) => ubah({ data: { ...d.data, [p2.nama]: e.target.value } })} />
              ) : p2.tipe === 'tanggal' || p2.tipe === 'hari_tanggal' ? (
                <IsianTanggal value={/^\d{4}-\d{2}-\d{2}$/.test(d.data[p2.nama] ?? '') ? d.data[p2.nama] : ''} onValueChange={(v) => ubah({ data: { ...d.data, [p2.nama]: v } })} />
              ) : (
                <Input inputMode={p2.tipe === 'angka' ? 'numeric' : undefined} value={d.data[p2.nama] ?? ''} placeholder={p2.contoh ?? `{{${p2.nama}}}`} onChange={(e) => ubah({ data: { ...d.data, [p2.nama]: e.target.value } })} />
              )}
            </Field>
          ))}
          {isian.length > 0 && (
            <>
              <Button variant={terisi === isian.length ? 'primary' : 'outline'} disabled={!terisi} onClick={bangkitkan}>
                <WandSparkles />
                Bangkitkan surat
              </Button>
              <p className="u-psr-redup">
                {terisi < isian.length
                  ? 'Isian yang masih kosong tetap menjadi penanda kuning di kertas dan bisa diisi nanti.'
                  : 'Semua isian ditulis ke kertas. Setelah itu isi surat masih bisa disunting bebas.'}
              </p>
            </>
          )}
          {dibangkitkan && isian.length === 0 && <Alert variant="success">Surat sudah dibangkitkan. Periksa kertas, lalu simpan konsep.</Alert>}
        </section>
      )}
      <Field label="Perihal" required>
        <Input value={d.perihal} maxLength={255} onChange={(e) => ubah({ perihal: e.target.value })} placeholder="Undangan rapat evaluasi perkuliahan" />
      </Field>
      <FormGrid>
        <Field label="Tanggal surat">
          <IsianTanggal value={d.tanggal} onValueChange={(v) => ubah({ tanggal: v })} />
        </Field>
        <Field label="Lampiran" optional>
          <Input value={d.lampiran} onChange={(e) => ubah({ lampiran: e.target.value })} placeholder="1 (satu) berkas" />
        </Field>
        <Field label="Sifat">
          <Select<string> value={d.sifat} onValueChange={(v) => v && ubah({ sifat: v })} options={SIFAT_SURAT.map((s) => ({ value: s.value, label: s.label }))} />
        </Field>
        <Field label="Keamanan">
          <Select<string> value={d.keamanan} onValueChange={(v) => v && ubah({ keamanan: v })} options={KEAMANAN_SURAT.map((s) => ({ value: s.value, label: s.label }))} />
        </Field>
      </FormGrid>
      <Field label="Jenis naskah" optional description="Menentukan kode jenis di nomor dan klasifikasi bawaan.">
        <Select<number | null> value={d.jenisId} placeholder="Pilih jenis" onValueChange={(v) => ubah({ jenisId: v })} options={[{ value: null, label: 'Tanpa jenis' }, ...(jenis.data ?? []).map((j) => ({ value: j.id as number | null, label: `${j.nama} (${j.kode})` }))]} />
      </Field>
      <Field label="Klasifikasi arsip" optional>
        <PilihKlasifikasi nilai={d.klasifikasiId} ganti={(v) => ubah({ klasifikasiId: v })} />
      </Field>
      <div className="u-psr-nomor-info">
        <Hash aria-hidden />
        <span>
          Nomor surat diberikan otomatis saat disetujui. Perkiraan: <b>{nomor.data?.berikutnya ?? '…'}</b>
        </span>
      </div>
      <section>
        <h3 className="u-psr-sub">Tujuan dan tembusan</h3>
        <DaftarTujuan nilai={d.tujuan} ganti={(t) => ubah({ tujuan: t })} />
      </section>
      {galat && <Alert variant="danger">{galat}</Alert>}
    </div>
  );

  return (
    <>
      <PengolahDokumen
        key={kunci}
        className={className}
        tinggi={tinggi}
        nilaiAwal={awalIsi}
        onChange={setIsi}
        kertas={kertas}
        onKertasChange={setKertas}
        margin={margin}
        onMarginChange={setMargin}
        kop={<KopTemplatDokumen efektif={efektif.data} logo={logo} />}
        sebelumIsi={sebelumIsi}
        kaki={kaki}
        unggah={unggah}
        judul={
          <span className="u-psr-judul">
            {onTutup && (
              <Button variant="ghost" size="sm" iconOnly aria-label="Tutup" onClick={onTutup}>
                <X />
              </Button>
            )}
            {d.perihal || (surat ? 'Konsep surat' : 'Surat keluar baru')}
            <Badge variant="neutral">{ada.data?.status ?? 'konsep'}</Badge>
          </span>
        }
        aksi={
          <Button size="sm" loading={simpan === 'proses'} disabled={kosong} onClick={kirim}>
            <Save />
            Simpan konsep
          </Button>
        }
        status={simpan === 'ok' ? 'Konsep tersimpan' : galatIsian ?? (kosong ? 'Tulis isi surat di kertas' : 'Belum disimpan')}
        panel={panel}
        panelJudul="Data surat"
        placeholder="Tulis isi surat di sini, atau pilih templat di panel kanan…"
      />
      <PilihTemplatSurat open={galeri} onOpenChange={setGaleri} unitId={uid} onPilih={pilihDariGaleri} />
      <ConfirmDialog
        open={gantiTemplat !== null}
        onOpenChange={(o) => !o && setGantiTemplat(null)}
        title={`Ganti isi dengan templat "${gantiTemplat?.nama ?? ''}"?`}
        description="Isi yang sudah ditulis di kertas akan diganti isi templat."
        confirmLabel="Ganti isi"
        tone="primary"
        onConfirm={() => {
          pakaiTemplat(gantiTemplat);
          setGantiTemplat(null);
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------- catat arsip surat lama

export interface CatatArsipSuratProps {
  /** Unit pemilik arsip. Tanpa ini memakai unit pertama tempat pengguna admin/pimpinan/sekretaris/arsiparis. */
  unitId?: number;
  arahAwal?: 'masuk' | 'keluar';
  onSelesai?: (surat: SuratArsip) => void;
  onBatal?: () => void;
  className?: string;
}

const PERAN_CATAT = ['admin', 'pimpinan', 'sekretaris', 'arsiparis'];

/**
 * Catat surat dari sistem lama atau arsip kertas: unggah pindaian/PDF lalu isi nomor surat, tanggal, perihal,
 * pengirim atau tujuan, jenis, klasifikasi, sifat, keamanan, lampiran, dan lokasi simpan fisik. Surat masuk dapat
 * nomor agenda otomatis; surat keluar dicatat langsung dengan nomor aslinya (catat_langsung). File diunggah ke
 * /v1/arsip/surat/{uuid}/file (file pertama = utama, sisanya lampiran).
 */
export function CatatArsipSurat({ unitId, arahAwal = 'masuk', onSelesai, onBatal, className }: CatatArsipSuratProps) {
  const siakad = useSiakad();
  const unit = useUnitArsipSaya();
  const jenis = useJenisNaskahArsip();
  const unitBoleh = (unit.data ?? []).filter((u) => PERAN_CATAT.includes(u.peran_saya ?? ''));
  const [arah, setArah] = React.useState<'masuk' | 'keluar'>(arahAwal);
  const [uidPilih, setUid] = React.useState<number | null>(unitId ?? null);
  const uid = unitId ?? uidPilih ?? unitBoleh[0]?.id ?? null;
  const lokasi = useLokasiArsip(uid);
  const [f, setF] = React.useState({
    nomor: '',
    tanggalSurat: '',
    tanggalDiterima: hariIniIso(),
    perihal: '',
    ringkasan: '',
    pengirimNama: '',
    pengirimInstansi: '',
    tujuan: '',
    jenisId: null as number | null,
    klasifikasiId: null as number | null,
    sifat: 'biasa',
    keamanan: 'biasa',
    lampiran: '',
    lokasiId: null as number | null,
    media: 'kertas',
  });
  const [file, setFile] = React.useState<File[]>([]);
  const [proses, setProses] = React.useState<string | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [sentuh, setSentuh] = React.useState(false);
  const input = usePilihBerkas({ accept: '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx', multiple: true, onFiles: (files) => setFile((x) => [...x, ...files]) });
  const ubah = (x: Partial<typeof f>) => setF((v) => ({ ...v, ...x }));

  const wajib: Record<string, string | null> = {
    nomor: !f.nomor.trim() ? 'Nomor surat wajib diisi.' : null,
    tanggalSurat: !f.tanggalSurat ? 'Tanggal surat wajib diisi.' : null,
    perihal: !f.perihal.trim() ? 'Perihal wajib diisi.' : null,
    pengirim: arah === 'masuk' && !f.pengirimNama.trim() && !f.pengirimInstansi.trim() ? 'Isi nama atau instansi pengirim.' : null,
    tujuan: arah === 'keluar' && !f.tujuan.trim() ? 'Isi tujuan surat.' : null,
    file: !file.length ? 'Unggah minimal satu file surat.' : null,
  };
  const ada = Object.values(wajib).some(Boolean);
  const g = (k: string) => (sentuh ? (wajib[k] ?? undefined) : undefined);

  if (!unit.loading && !unitBoleh.length && !unitId) {
    return <Empty bordered icon={<Archive />} title="Tidak bisa mencatat arsip surat" description="Pencatatan surat hanya untuk admin, pimpinan, sekretaris, atau arsiparis unit arsip." />;
  }

  const simpan = async () => {
    setSentuh(true);
    if (ada || !uid) return;
    setGalat(null);
    try {
      setProses('Mencatat surat…');
      const umum = {
        unit_id: uid,
        nomor_surat: f.nomor.trim(),
        tanggal_surat: f.tanggalSurat,
        perihal: f.perihal.trim(),
        ringkasan: f.ringkasan.trim() || null,
        jenis_id: f.jenisId,
        klasifikasi_id: f.klasifikasiId,
        sifat: f.sifat,
        keamanan: f.keamanan,
        lampiran: f.lampiran.trim() || null,
        lokasi_id: f.lokasiId,
        media: f.media,
      };
      const r =
        arah === 'masuk'
          ? await siakad.request<SuratArsip>({
              method: 'POST',
              path: '/v1/arsip/surat-masuk',
              body: { ...umum, tanggal_diterima: f.tanggalDiterima || f.tanggalSurat, pengirim_nama: f.pengirimNama.trim() || null, pengirim_instansi: f.pengirimInstansi.trim() || null },
            })
          : await siakad.request<SuratArsip>({
              method: 'POST',
              path: '/v1/arsip/surat-keluar',
              body: {
                ...umum,
                catat_langsung: true,
                tujuan: f.tujuan
                  .split('\n')
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((nama) => ({ jenis: 'eksternal', nama })),
              },
            });
      for (const [i, berkas] of file.entries()) {
        setProses(`Mengunggah file ${i + 1} dari ${file.length}…`);
        await siakad.request({ method: 'POST', path: `/v1/arsip/surat/${encodeURIComponent(r.data.uuid)}/file`, body: { berkas, peran: i === 0 ? 'utama' : 'lampiran' }, multipart: true }, { timeout: 300_000 });
      }
      invalidateSiakad('arsip/surat');
      onSelesai?.(r.data);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setProses(null);
    }
  };

  return (
    <div className={['u-psr-catat', className].filter(Boolean).join(' ')}>
      <RadioGroup<'masuk' | 'keluar'>
        variant="card"
        columns={2}
        value={arah}
        onValueChange={(v) => setArah(v)}
        options={[
          { value: 'masuk', label: 'Surat masuk', description: 'Diterima unit; nomor agenda dibuat otomatis.' },
          { value: 'keluar', label: 'Surat keluar', description: 'Sudah ditandatangani di sistem lama; dicatat dengan nomornya.' },
        ]}
      />
      {!unitId && unitBoleh.length > 1 && (
        <Field label="Unit arsip">
          <PilihUnitArsipSaya unit={unitBoleh} kosongkan={false} value={uid} onValueChange={(v) => setUid(v)} />
        </Field>
      )}

      <section
        className="u-psr-unggah"
        data-galat={g('file') ? '' : undefined}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          setFile((x) => [...x, ...Array.from(e.dataTransfer.files)]);
        }}
      >
        {input.elemen}
        <FileUp aria-hidden />
        <div>
          <b>Unggah file surat</b>
          <p>PDF atau hasil pindai. File pertama menjadi file utama, sisanya lampiran.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => input.buka()}>
          <Upload />
          Pilih file
        </Button>
        {file.length > 0 && (
          <ul>
            {file.map((x, i) => (
              <li key={`${x.name}-${i}`}>
                <span>{i === 0 ? 'Utama' : 'Lampiran'}</span>
                {x.name}
                <small>{(x.size / 1024 / 1024).toFixed(2)} MB</small>
                <Button variant="ghost" size="sm" iconOnly aria-label={`Hapus ${x.name}`} onClick={() => setFile((y) => y.filter((_, j) => j !== i))}>
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {g('file') && <p className="u-field-error">{g('file')}</p>}
      </section>

      <FormGrid>
        <Field label="Nomor surat" required error={g('nomor')}>
          <Input value={f.nomor} onChange={(e) => ubah({ nomor: e.target.value })} placeholder="012/FIKOM/PP.00.01/III/2024" maxLength={100} />
        </Field>
        <Field label="Tanggal surat" required error={g('tanggalSurat')}>
          <IsianTanggal value={f.tanggalSurat} onValueChange={(v) => ubah({ tanggalSurat: v })} />
        </Field>
      </FormGrid>
      <Field label="Perihal" required error={g('perihal')}>
        <Input value={f.perihal} onChange={(e) => ubah({ perihal: e.target.value })} maxLength={255} />
      </Field>
      {arah === 'masuk' ? (
        <FormGrid>
          <Field label="Nama pengirim" error={g('pengirim')}>
            <Input value={f.pengirimNama} onChange={(e) => ubah({ pengirimNama: e.target.value })} />
          </Field>
          <Field label="Instansi pengirim">
            <Input value={f.pengirimInstansi} onChange={(e) => ubah({ pengirimInstansi: e.target.value })} />
          </Field>
          <Field label="Tanggal diterima">
            <IsianTanggal value={f.tanggalDiterima} onValueChange={(v) => ubah({ tanggalDiterima: v })} />
          </Field>
        </FormGrid>
      ) : (
        <Field label="Tujuan" required error={g('tujuan')} description="Satu tujuan per baris, mis. Rektor Universitas Pohuwato.">
          <Textarea rows={3} value={f.tujuan} onChange={(e) => ubah({ tujuan: e.target.value })} />
        </Field>
      )}
      <Field label="Ringkasan isi" optional>
        <Textarea rows={2} value={f.ringkasan} onChange={(e) => ubah({ ringkasan: e.target.value })} />
      </Field>
      <FormGrid>
        <Field label="Jenis naskah" optional>
          <Select<number | null> value={f.jenisId} placeholder="Pilih jenis" onValueChange={(v) => ubah({ jenisId: v })} options={[{ value: null, label: 'Tanpa jenis' }, ...(jenis.data ?? []).map((j) => ({ value: j.id as number | null, label: `${j.nama} (${j.kode})` }))]} />
        </Field>
        <Field label="Klasifikasi arsip" optional>
          <PilihKlasifikasi nilai={f.klasifikasiId} ganti={(v) => ubah({ klasifikasiId: v })} />
        </Field>
        <Field label="Sifat">
          <Select<string> value={f.sifat} onValueChange={(v) => v && ubah({ sifat: v })} options={SIFAT_SURAT.map((s) => ({ value: s.value, label: s.label }))} />
        </Field>
        <Field label="Keamanan">
          <Select<string> value={f.keamanan} onValueChange={(v) => v && ubah({ keamanan: v })} options={KEAMANAN_SURAT.map((s) => ({ value: s.value, label: s.label }))} />
        </Field>
        <Field label="Lampiran" optional>
          <Input value={f.lampiran} onChange={(e) => ubah({ lampiran: e.target.value })} placeholder="1 (satu) berkas" />
        </Field>
        <Field label="Media asli">
          <Select<string>
            value={f.media}
            onValueChange={(v) => v && ubah({ media: v })}
            options={[
              { value: 'kertas', label: 'Kertas' },
              { value: 'elektronik', label: 'Elektronik' },
              { value: 'email', label: 'Surel' },
              { value: 'pos', label: 'Pos' },
              { value: 'kurir', label: 'Kurir' },
              { value: 'langsung', label: 'Diantar langsung' },
            ]}
          />
        </Field>
      </FormGrid>
      <Field label="Lokasi simpan fisik" optional description={lokasi.data?.length ? undefined : 'Belum ada lokasi; tambahkan di pengaturan arsip unit.'}>
        <Select<number | null> value={f.lokasiId} placeholder="Tidak disimpan fisik" onValueChange={(v) => ubah({ lokasiId: v })} options={[{ value: null, label: 'Tidak disimpan fisik' }, ...(lokasi.data ?? []).map((l) => ({ value: l.id as number | null, label: `${l.kode} · ${l.nama}` }))]} />
      </Field>
      {galat && <Alert variant="danger">{galat}</Alert>}
      <div className="u-psr-catat-aksi">
        {onBatal && (
          <Button variant="outline" onClick={onBatal} disabled={Boolean(proses)}>
            Batal
          </Button>
        )}
        <Button onClick={simpan} loading={Boolean(proses)}>
          <Archive />
          {proses ?? 'Simpan ke arsip'}
        </Button>
      </div>
    </div>
  );
}
