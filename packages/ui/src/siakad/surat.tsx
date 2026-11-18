'use client';
import * as React from 'react';
import { ArrowLeft, BookCopy, FilePlus2, FileText, Network, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Empty } from '../components/display';
import { Checkbox, Field, Input, RadioGroup } from '../components/forms';
import { ConfirmDialog } from '../components/overlays';
import { Select } from '../components/select';
import { DatePicker } from '../components/calendar';
import { Wizard, WizardReview, FormGrid } from '../components/wizard';
import { EditorDokumen } from '../editor/dokumen/EditorDokumen';
import { EditorTemplatSurat, bodyTemplatSurat, type NilaiTemplatSurat } from '../editor/dokumen/EditorTemplatSurat';
import { LembarSurat, type KopSurat, type PenandatanganSurat, type TujuanSurat } from '../editor/dokumen/LembarSurat';
import { isiTemplat, penandaIsian } from '../editor/dokumen/templat';
import type { MediaEditor, OpsiPilihMedia } from '../editor/konteks';
import { KEAMANAN_SURAT, SIFAT_SURAT } from './filter-presets';
import { GalatApi } from './galat';
import { PilihEntitas, type SumberEntitas } from './pilih';
import { PilihUnit, type PilihUnitTunggalProps, type UnitOrganisasi } from './pilih-unit';
import { PilihTemplatSurat, jenisDariKode } from './surat-galeri';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

// ---------------------------------------------------------------- tipe data arsip

/** Unit pemilik arsip (GET /v1/arsip/unit). */
export interface UnitArsip {
  id: number;
  induk_id?: number | null;
  kode: string;
  jenis: string;
  nama: string;
  singkatan?: string | null;
  aktif?: number;
  /** Peran pemilik token di unit ini: admin, pimpinan, sekretaris, arsiparis, staf, pengawas, atau null. */
  peran_saya?: string | null;
}

/** Baris /v1/arsip/template. */
export interface TemplatSurat {
  id: number;
  unit_id?: number | null;
  jenis_id?: number | null;
  nama: string;
  perihal?: string | null;
  isi: string;
  keterangan?: string | null;
  aktif?: number | boolean;
}

/** Jenis naskah (GET /v1/arsip/jenis?kelompok=naskah). */
export interface JenisNaskah {
  id: number;
  kode: string;
  nama: string;
}

/** Peran yang boleh mengelola templat unit (sama dengan server: admin/sekretaris/arsiparis). */
export const PERAN_KELOLA_TEMPLAT = ['admin', 'sekretaris', 'arsiparis'];

const JENIS_TUJUAN = [
  { value: 'unit', label: 'Unit' },
  { value: 'dosen', label: 'Dosen' },
  { value: 'mahasiswa', label: 'Mahasiswa' },
  { value: 'pengguna', label: 'Pengguna lain' },
  { value: 'eksternal', label: 'Pihak luar' },
] as const;

/** Sumber PilihEntitas untuk unit arsip (cari datar). Tujuan surat jenis unit kini memakai PilihUnit `sumber="arsip"`. */
export const SUMBER_UNIT_ARSIP: SumberEntitas = {
  nama: 'unit arsip',
  path: '/v1/arsip/unit',
  kunci: 'id',
  satu: '/v1/arsip/unit/{id}',
  judul: (r) => String(r.nama ?? ''),
  meta: (r) => [r.singkatan || r.kode, r.jenis].filter(Boolean).join(' · '),
  ikon: <Network />,
  placeholder: 'Cari nama atau kode unit',
};

/**
 * Pemilih unit arsip berpohon (arsip_unit, `/v1/arsip/unit`) yang hanya menawarkan unit di `unit`, mis. unit tempat
 * pengguna bertugas dari `useUnitArsipSaya()`. Induknya tampil sebagai jalur. Bila pohon gagal dimuat, daftar `unit` saja.
 */
export function PilihUnitArsipSaya({
  unit,
  alasan = 'Anda tidak bertugas di unit ini.',
  ...props
}: { unit: readonly UnitArsip[] } & Omit<PilihUnitTunggalProps, 'data' | 'sumber' | 'dataCadangan' | 'boleh' | 'sembunyikanTerlarang' | 'multiple'>) {
  const kunci = unit.map((u) => u.id).join(',');
  const boleh = React.useMemo(() => {
    const ids = new Set(kunci.split(','));
    return (u: UnitOrganisasi) => ids.has(String(u.id));
  }, [kunci]);
  return <PilihUnit sumber="arsip" dataCadangan={unit} boleh={boleh} sembunyikanTerlarang alasan={alasan} {...props} />;
}

// ---------------------------------------------------------------- hook data

/** Unit tempat saya berperan (GET /v1/arsip/unit?saya=1). */
export function useUnitArsipSaya() {
  return useSiakadQuery<UnitArsip[]>(['arsip/unit', 'saya'], (s, signal) => s.request<UnitArsip[]>({ method: 'GET', path: '/v1/arsip/unit', query: { saya: 1, aktif: 1, per_page: 100 } }, { signal }), { staleTime: 120_000 });
}

/** Templat surat unit (dan templat bersama). `aktif` bawaan semua. */
export function useTemplatSurat(opsi: { unit_id?: number | null; aktif?: boolean; q?: string } = {}) {
  return useSiakadQuery<TemplatSurat[]>(['arsip/template', opsi.unit_id ?? null, opsi.aktif ?? null, opsi.q ?? ''], (s, signal) =>
    s.request<TemplatSurat[]>(
      { method: 'GET', path: '/v1/arsip/template', query: { unit_id: opsi.unit_id ?? undefined, aktif: opsi.aktif === undefined ? undefined : opsi.aktif ? 1 : 0, q: opsi.q || undefined, per_page: 100 } },
      { signal },
    ),
  );
}

function useJenisNaskah() {
  return useSiakadQuery<JenisNaskah[]>(['arsip/jenis', 'naskah'], (s, signal) => s.request<JenisNaskah[]>({ method: 'GET', path: '/v1/arsip/jenis', query: { kelompok: 'naskah', aktif: 1, per_page: 200 } }, { signal }), { staleTime: 300_000 });
}

const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const keTanggal = (s: string) => (s ? new Date(`${s}T00:00:00`) : null);
const dariTanggal = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '');

// ---------------------------------------------------------------- kelola templat

export interface KelolaTemplatSuratProps {
  /** Kop untuk pratinjau templat. */
  kop?: KopSurat | React.ReactNode;
  penandatangan?: PenandatanganSurat;
  unggah?: (file: File, opsi: OpsiPilihMedia) => Promise<MediaEditor>;
  tinggi?: number | string;
  className?: string;
}

/**
 * Daftar dan penyunting templat surat arsip (/v1/arsip/template). Hanya unit tempat pengguna menjadi admin,
 * sekretaris, atau arsiparis yang bisa dipilih sebagai pemilik; templat bersama (tanpa unit) hanya untuk admin arsip.
 */
export function KelolaTemplatSurat({ kop, penandatangan, unggah, tinggi = 'calc(100dvh - 8rem)', className }: KelolaTemplatSuratProps) {
  const siakad = useSiakad();
  const unit = useUnitArsipSaya();
  const jenis = useJenisNaskah();
  const [q, setQ] = React.useState('');
  const [unitFilter, setUnitFilter] = React.useState<number | null>(null);
  const daftar = useTemplatSurat({ unit_id: unitFilter, q });
  const [sunting, setSunting] = React.useState<TemplatSurat | 'baru' | null>(null);
  const [galeri, setGaleri] = React.useState(false);
  const [hapus, setHapus] = React.useState<TemplatSurat | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);

  const unitKelola = (unit.data ?? []).filter((u) => PERAN_KELOLA_TEMPLAT.includes(u.peran_saya ?? ''));
  const namaUnit = (id?: number | null) => (id ? ((unit.data ?? []).find((u) => u.id === id)?.nama ?? `Unit #${id}`) : 'Bersama (semua unit)');

  if (sunting) {
    return (
      <PenyuntingTemplat
        key={sunting === 'baru' ? 'baru' : sunting.id || `salin:${sunting.nama}`}
        awal={sunting === 'baru' ? null : sunting}
        unitKelola={unitKelola}
        jenis={jenis.data ?? []}
        kop={kop}
        penandatangan={penandatangan}
        unggah={unggah}
        tinggi={tinggi}
        kembali={() => setSunting(null)}
        simpan={async (body, id) => {
          const r = await siakad.request<TemplatSurat>({ method: id ? 'PUT' : 'POST', path: id ? `/v1/arsip/template/${id}` : '/v1/arsip/template', body });
          invalidateSiakad('arsip/template');
          return r.data;
        }}
      />
    );
  }

  return (
    <div className={['u-surat-kelola', className].filter(Boolean).join(' ')}>
      <div className="u-surat-alat">
        <div className="u-surat-cari">
          <Search aria-hidden />
          <input type="search" value={q} placeholder="Cari nama templat" aria-label="Cari templat" onChange={(e) => setQ(e.target.value)} />
        </div>
        <PilihUnitArsipSaya aria-label="Saring unit" unit={unit.data ?? []} memuat={unit.loading} value={unitFilter} onValueChange={(v) => setUnitFilter(v)} placeholder="Semua unit" />
        <Button variant="outline" onClick={() => setGaleri(true)} disabled={!unitKelola.length && !unit.loading}>
          <BookCopy />
          Salin dari galeri
        </Button>
        <Button onClick={() => setSunting('baru')} disabled={!unitKelola.length && !unit.loading}>
          <Plus />
          Buat templat
        </Button>
      </div>
      <PilihTemplatSurat
        open={galeri}
        onOpenChange={setGaleri}
        tanpaKosong
        judul="Salin templat dari galeri"
        onPilih={(t) => {
          setGaleri(false);
          if (!t) return;
          // id 0 = templat baru (POST) berisi salinan; disimpan sebagai milik unit pertama yang bisa dikelola.
          setSunting({ id: 0, unit_id: unitKelola[0]?.id ?? null, jenis_id: t.jenis_id ?? jenisDariKode(jenis.data, t.jenis_kode), nama: t.nama, perihal: t.perihal ?? null, isi: t.isi, keterangan: null, aktif: 1 });
        }}
      />
      {galat && (
        <Alert variant="danger" title="Templat tidak dapat dihapus">
          {galat}
        </Alert>
      )}
      {daftar.error ? (
        <GalatApi error={daftar.error} onRetry={daftar.refetch} />
      ) : daftar.loading && !daftar.data ? (
        <div className="u-surat-kisi">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={132} />
          ))}
        </div>
      ) : !daftar.data?.length ? (
        <Empty
          bordered
          icon={<FileText />}
          title={q ? 'Tidak ada templat yang cocok' : 'Belum ada templat surat'}
          description={q ? 'Coba kata lain atau hapus saringan unit.' : 'Templat mempercepat pembuatan surat yang sering dipakai, mis. undangan rapat atau surat tugas.'}
          actions={
            !q && unitKelola.length ? (
              <Button onClick={() => setSunting('baru')}>
                <Plus />
                Buat templat
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="u-surat-kisi">
          {daftar.data.map((t) => {
            const bisa = !t.unit_id || unitKelola.some((u) => u.id === t.unit_id);
            const isian = penandaIsian(t.isi);
            return (
              <li key={t.id} className="u-surat-kartu">
                <div className="u-surat-kartu-kepala">
                  <FileText aria-hidden />
                  <div>
                    <p className="u-surat-kartu-judul">{t.nama}</p>
                    <p className="u-surat-kartu-meta">{namaUnit(t.unit_id)}</p>
                  </div>
                  {(t.aktif === 0 || t.aktif === false) && <Badge>Nonaktif</Badge>}
                </div>
                {t.perihal && <p className="u-surat-kartu-perihal">{t.perihal}</p>}
                <p className="u-surat-kartu-meta">{isian.length ? `${isian.length} isian: ${isian.map((p) => p.label.toLowerCase()).join(', ')}` : 'Tanpa isian tambahan'}</p>
                {bisa && (
                  <div className="u-surat-kartu-aksi">
                    <Button size="sm" variant="outline" onClick={() => setSunting(t)}>
                      <Pencil />
                      Sunting
                    </Button>
                    <Button size="sm" variant="ghost" iconOnly aria-label={`Hapus templat ${t.nama}`} onClick={() => setHapus(t)}>
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        open={Boolean(hapus)}
        onOpenChange={(o) => !o && setHapus(null)}
        title={`Hapus templat "${hapus?.nama ?? ''}"?`}
        description="Surat yang sudah dibuat dari templat ini tidak berubah. Kalau templat masih mungkin dipakai, nonaktifkan saja."
        confirmLabel="Hapus templat"
        onConfirm={async () => {
          if (!hapus) return;
          try {
            await siakad.request({ method: 'DELETE', path: `/v1/arsip/template/${hapus.id}` });
            setGalat(null);
            invalidateSiakad('arsip/template');
          } catch (e) {
            setGalat(pesanGalat(e));
          }
          setHapus(null);
        }}
      />
    </div>
  );
}

function PenyuntingTemplat({
  awal,
  unitKelola,
  jenis,
  kop,
  penandatangan,
  unggah,
  tinggi,
  kembali,
  simpan,
}: {
  awal: TemplatSurat | null;
  unitKelola: UnitArsip[];
  jenis: JenisNaskah[];
  kop?: KopSurat | React.ReactNode;
  penandatangan?: PenandatanganSurat;
  unggah?: (file: File, opsi: OpsiPilihMedia) => Promise<MediaEditor>;
  tinggi?: number | string;
  kembali: () => void;
  simpan: (body: ReturnType<typeof bodyTemplatSurat>, id?: number) => Promise<TemplatSurat>;
}) {
  const [id, setId] = React.useState(awal?.id);
  const [unitId, setUnitId] = React.useState<number | null>(awal ? (awal.unit_id ?? null) : (unitKelola[0]?.id ?? null));
  const [jenisId, setJenisId] = React.useState<number | null>(awal?.jenis_id ?? null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [sibuk, setSibuk] = React.useState(false);
  const unit = unitKelola.find((u) => u.id === unitId);
  const kopUnit = kop ?? (unit ? { instansi: 'Universitas Pohuwato', unit: unit.nama } : undefined);

  const nilaiAwal: Partial<NilaiTemplatSurat> | null = awal
    ? { nama: awal.nama, perihal: awal.perihal ?? '', isi: awal.isi, keterangan: awal.keterangan ?? '', aktif: awal.aktif === undefined ? true : Boolean(Number(awal.aktif)) }
    : null;

  return (
    <div className="u-surat-sunting">
      <div className="u-surat-sunting-kepala">
        <Button variant="ghost" size="sm" onClick={kembali}>
          <ArrowLeft />
          Daftar templat
        </Button>
        {galat && (
          <Alert variant="danger" title="Templat belum tersimpan">
            {galat}
          </Alert>
        )}
      </div>
      <EditorTemplatSurat
        nilaiAwal={nilaiAwal}
        kop={kopUnit}
        unit={unit ? { nama: unit.nama, singkatan: unit.singkatan } : null}
        penandatangan={penandatangan}
        unggah={unggah}
        tinggi={tinggi}
        status={status}
        onChange={() => setStatus('Belum disimpan')}
        panelTambahan={
          <>
            <Field
              label="Unit pemilik"
              description={unitId ? 'Kosongkan (×) untuk templat bersama semua unit (khusus admin arsip).' : 'Templat bersama dipakai semua unit (khusus admin arsip).'}
            >
              <PilihUnitArsipSaya unit={unitKelola} value={unitId} onValueChange={(v) => setUnitId(v)} placeholder="Bersama (semua unit)" />
            </Field>
            <Field label="Jenis naskah" optional description="Jenis surat yang dibuat dari templat ini, dipakai di nomor surat.">
              <Select<number | null> value={jenisId} onValueChange={setJenisId} placeholder="Pilih jenis" options={[{ value: null, label: 'Tanpa jenis' }, ...jenis.map((j) => ({ value: j.id as number | null, label: `${j.nama} (${j.kode})` }))]} />
            </Field>
          </>
        }
        aksi={(n, g) => (
          <Button
            size="sm"
            loading={sibuk}
            disabled={Object.keys(g).length > 0}
            onClick={async () => {
              setSibuk(true);
              setGalat(null);
              try {
                const r = await simpan(bodyTemplatSurat(n, { unit_id: unitId, jenis_id: jenisId }), id);
                if (r?.id) setId(r.id);
                const t = new Date();
                setStatus(`Tersimpan ${String(t.getHours()).padStart(2, '0')}.${String(t.getMinutes()).padStart(2, '0')}`);
              } catch (e) {
                setGalat(pesanGalat(e));
              } finally {
                setSibuk(false);
              }
            }}
          >
            {id ? 'Simpan' : 'Simpan templat'}
          </Button>
        )}
      />
    </div>
  );
}

// ---------------------------------------------------------------- buat surat dari templat

type JenisTujuan = (typeof JENIS_TUJUAN)[number]['value'];

/** Satu tujuan surat, sama dengan item `tujuan[]` di POST /v1/arsip/surat-keluar. */
export interface TujuanSuratInput {
  jenis: JenisTujuan;
  unit_id?: number;
  username?: string;
  nidn?: string;
  nim?: string;
  nama?: string;
  jabatan?: string;
  instansi?: string;
  alamat?: string;
  tembusan?: boolean;
}

/** Hasil POST /v1/arsip/surat-keluar (kolom yang dipakai). */
export interface SuratKeluar {
  id: number;
  uuid: string;
  status: string;
  perihal: string;
  nomor_surat?: string | null;
  [k: string]: unknown;
}

export interface BuatSuratDariTemplatProps {
  /** Dipanggil setelah konsep surat tersimpan. */
  onSelesai?: (surat: SuratKeluar) => void;
  /** Unit awal (bila halaman sudah tahu unitnya). */
  unitId?: number;
  kop?: (unit: UnitArsip) => KopSurat | React.ReactNode;
  penandatangan?: PenandatanganSurat;
  unggah?: (file: File, opsi: OpsiPilihMedia) => Promise<MediaEditor>;
  className?: string;
}

interface Draf {
  unitId: number | null;
  templatId: number | 'kosong' | null;
  perihal: string;
  tanggal: string;
  sifat: string;
  keamanan: string;
  lampiran: string;
  data: Record<string, string>;
  tujuan: TujuanSuratInput[];
  isi: string | null;
  isiKunci: string;
}

/**
 * Wizard konsep surat keluar: pilih unit dan templat → isi data surat dan penanda → tujuan dan tembusan → sunting isi
 * di atas kertas → tinjau lembar surat → POST /v1/arsip/surat-keluar (status draf). Penanda diisi di browser persis
 * seperti `SuratService::isiTemplat`; isi yang sudah disunting ikut dikirim sebagai `isi`.
 */
export function BuatSuratDariTemplat({ onSelesai, unitId, kop, penandatangan, unggah, className }: BuatSuratDariTemplatProps) {
  const siakad = useSiakad();
  const unit = useUnitArsipSaya();
  const [langkah, setLangkah] = React.useState(0);
  const [d, setD] = React.useState<Draf>({
    unitId: unitId ?? null,
    templatId: null,
    perihal: '',
    tanggal: hariIni(),
    sifat: 'biasa',
    keamanan: 'biasa',
    lampiran: '',
    data: {},
    tujuan: [],
    isi: null,
    isiKunci: '',
  });
  const set = (x: Partial<Draf>) => setD((p) => ({ ...p, ...x }));

  const unitPetugas = (unit.data ?? []).filter((u) => u.peran_saya && u.peran_saya !== 'pengawas');
  React.useEffect(() => {
    if (d.unitId === null && unitPetugas.length === 1) set({ unitId: unitPetugas[0].id });
  }, [unitPetugas.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const u = unitPetugas.find((x) => x.id === d.unitId) ?? null;
  const templat = useTemplatSurat({ unit_id: d.unitId, aktif: true });
  const tpl = typeof d.templatId === 'number' ? (templat.data ?? []).find((t) => t.id === d.templatId) : null;
  const isian = React.useMemo(() => (tpl ? penandaIsian(tpl.isi) : []), [tpl]);

  // Isi hasil templat. Disusun ulang bila data berubah, kecuali pengguna sudah menyunting isinya sendiri.
  const konteks = { unit: u ? { nama: u.nama, singkatan: u.singkatan } : null, surat: { tanggal_surat: d.tanggal, perihal: d.perihal, lampiran: d.lampiran } };
  const isiTpl = tpl ? isiTemplat(tpl.isi, d.data, konteks) : '';
  const kunciTpl = JSON.stringify([d.templatId, d.data, d.tanggal, d.perihal, d.lampiran, d.unitId]);
  const isiAkhir = d.isi ?? isiTpl;
  const kosong = isian.filter((p) => !d.data[p.nama]?.trim());

  const tujuanLembar: TujuanSurat[] = d.tujuan.map((t) => ({ nama: t.nama || t.nim || t.nidn || t.username || (t.unit_id ? `Unit #${t.unit_id}` : '…'), jabatan: t.jabatan, instansi: t.instansi, alamat: t.alamat, tembusan: t.tembusan }));
  const kopUnit = u ? (kop?.(u) ?? { instansi: 'Universitas Pohuwato', unit: u.nama }) : undefined;

  const steps = [
    {
      id: 'templat',
      title: 'Unit dan templat',
      description: 'Surat dibuat atas nama unit tempat Anda bertugas.',
      onNext: () => (!d.unitId ? 'Pilih unit pengirim dulu.' : d.templatId === null ? 'Pilih templat, atau mulai dari kertas kosong.' : null),
      content: (
        <div className="u-surat-langkah">
          {unit.error ? (
            <GalatApi error={unit.error} onRetry={unit.refetch} />
          ) : (
            <Field label="Unit pengirim" required>
              <PilihUnitArsipSaya
                unit={unitPetugas}
                memuat={unit.loading}
                kosongkan={false}
                value={d.unitId}
                onValueChange={(v) => set({ unitId: v, templatId: null, isi: null })}
                placeholder="Pilih unit"
              />
            </Field>
          )}
          {!unit.loading && !unitPetugas.length && <Alert variant="warning" title="Anda belum terdaftar sebagai petugas unit mana pun">Minta admin unit menambahkan Anda sebagai petugas arsip agar bisa membuat surat.</Alert>}
          {d.unitId && (
            <Field label="Templat">
              {templat.loading && !templat.data ? (
                <Skeleton height={120} />
              ) : (
                <RadioGroup<string>
                  variant="card"
                  columns={2}
                  value={d.templatId === null ? null : String(d.templatId)}
                  onValueChange={(v) => {
                    const t = (templat.data ?? []).find((x) => String(x.id) === v);
                    set({ templatId: v === 'kosong' ? 'kosong' : Number(v), perihal: t?.perihal ?? d.perihal, data: {}, isi: null });
                  }}
                  options={[
                    ...(templat.data ?? []).map((t) => ({
                      value: String(t.id),
                      label: t.nama,
                      description: t.perihal || (t.unit_id ? undefined : 'Templat bersama'),
                      icon: <FileText />,
                    })),
                    { value: 'kosong', label: 'Kertas kosong', description: 'Tulis isi surat sendiri tanpa templat.', icon: <FilePlus2 /> },
                  ]}
                />
              )}
            </Field>
          )}
        </div>
      ),
    },
    {
      id: 'data',
      title: 'Data surat',
      description: isian.length ? 'Isian ini mengganti penanda di templat.' : 'Perihal, tanggal, dan sifat surat.',
      onNext: () => (!d.perihal.trim() ? 'Perihal wajib diisi.' : d.perihal.length > 255 ? 'Perihal paling banyak 255 karakter.' : null),
      content: (
        <div className="u-surat-langkah">
          <Field label="Perihal" required>
            <Input value={d.perihal} maxLength={255} onChange={(e) => set({ perihal: e.target.value })} />
          </Field>
          <FormGrid>
            <Field label="Tanggal surat">
              <DatePicker value={keTanggal(d.tanggal)} onValueChange={(x) => set({ tanggal: dariTanggal(x) || hariIni() })} />
            </Field>
            <Field label="Lampiran" optional>
              <Input value={d.lampiran} maxLength={100} placeholder="1 (satu) berkas" onChange={(e) => set({ lampiran: e.target.value })} />
            </Field>
            <Field label="Sifat">
              <Select value={d.sifat} onValueChange={(v) => set({ sifat: v ?? 'biasa' })} options={SIFAT_SURAT} />
            </Field>
            <Field label="Keamanan" description="Rahasia hanya dapat dibuka pimpinan dan penerima.">
              <Select value={d.keamanan} onValueChange={(v) => set({ keamanan: v ?? 'biasa' })} options={KEAMANAN_SURAT} />
            </Field>
          </FormGrid>
          {isian.length > 0 && (
            <fieldset className="u-surat-isian">
              <legend>Isian templat</legend>
              <FormGrid>
                {isian.map((p) => (
                  <Field key={p.nama} label={p.label} optional>
                    <Input value={d.data[p.nama] ?? ''} onChange={(e) => set({ data: { ...d.data, [p.nama]: e.target.value }, isi: null })} />
                  </Field>
                ))}
              </FormGrid>
            </fieldset>
          )}
        </div>
      ),
    },
    {
      id: 'tujuan',
      title: 'Tujuan',
      description: 'Penerima surat dan tembusan. Boleh dikosongkan dulu dan dilengkapi sebelum dikirim.',
      optional: true,
      onNext: () => {
        const salah = d.tujuan.findIndex((t) => !tujuanLengkap(t));
        return salah >= 0 ? `Tujuan ke-${salah + 1} belum lengkap.` : null;
      },
      content: <DaftarTujuan nilai={d.tujuan} ganti={(tujuan) => set({ tujuan })} />,
    },
    {
      id: 'isi',
      title: 'Isi surat',
      description: d.isi !== null ? 'Isi sudah Anda sunting; perubahan data tidak lagi mengubah isi.' : 'Isi disusun dari templat. Sunting bila perlu.',
      content: (
        <div className="u-surat-langkah">
          {kosong.length > 0 && d.isi === null && (
            <Alert variant="warning" title={`${kosong.length} isian templat masih kosong`}>
              Penanda {kosong.map((p) => `{{${p.nama}}}`).join(', ')} akan tetap tertulis apa adanya.
            </Alert>
          )}
          {d.isi !== null && tpl && (
            <Button variant="outline" size="sm" onClick={() => set({ isi: null })}>
              Susun ulang dari templat
            </Button>
          )}
          <EditorDokumen
            key={d.isi === null ? kunciTpl : d.isiKunci}
            nilaiAwal={isiAkhir}
            onChange={(h) => setD((p) => ({ ...p, isi: h, isiKunci: p.isi === null ? kunciTpl : p.isiKunci }))}
            penanda={tpl ? isian : []}
            penandaBebas={false}
            panelAwal={false}
            kop={kopUnit ? <LembarKop kop={kopUnit} /> : undefined}
            unggah={unggah}
            tinggi="min(48rem, 80dvh)"
          />
        </div>
      ),
    },
    {
      id: 'tinjau',
      title: 'Tinjau',
      description: 'Surat disimpan sebagai konsep. Nomor diberikan setelah disetujui.',
      content: (
        <div className="u-surat-langkah">
          <WizardReview
            sections={[
              {
                title: 'Surat',
                onEdit: () => setLangkah(1),
                items: [
                  { label: 'Unit', value: u?.nama },
                  { label: 'Templat', value: tpl?.nama ?? 'Tanpa templat' },
                  { label: 'Perihal', value: d.perihal },
                  { label: 'Sifat / keamanan', value: `${SIFAT_SURAT.find((x) => x.value === d.sifat)?.text} / ${KEAMANAN_SURAT.find((x) => x.value === d.keamanan)?.text}` },
                ],
              },
              {
                title: 'Tujuan',
                onEdit: () => setLangkah(2),
                missing: d.tujuan.length ? undefined : 'Belum ada tujuan',
                items: d.tujuan.map((t, i) => ({ label: t.tembusan ? 'Tembusan' : `Tujuan ${i + 1}`, value: tujuanLembar[i].nama })),
              },
            ]}
          />
          <div className="u-surat-pratinjau">
            <LembarSurat kop={kopUnit} nomor="" lampiran={d.lampiran || null} perihal={d.perihal} sifat={d.sifat !== 'biasa' ? SIFAT_SURAT.find((x) => x.value === d.sifat)?.text : null} tanggal={d.tanggal} tujuan={tujuanLembar.length ? tujuanLembar : undefined} isi={isiAkhir} penandatangan={penandatangan} />
          </div>
        </div>
      ),
    },
  ];

  return (
    <Wizard
      className={className}
      title="Buat surat keluar"
      steps={steps}
      step={langkah}
      onStepChange={setLangkah}
      nextLabel="Lanjut"
      finishLabel="Simpan konsep"
      onFinish={async () => {
        if (!d.unitId) return 'Pilih unit pengirim dulu.';
        try {
          const r = await siakad.request<SuratKeluar>({
            method: 'POST',
            path: '/v1/arsip/surat-keluar',
            body: {
              unit_id: d.unitId,
              perihal: d.perihal.trim(),
              tanggal_surat: d.tanggal,
              sifat: d.sifat,
              keamanan: d.keamanan,
              lampiran: d.lampiran.trim() || undefined,
              template_id: typeof d.templatId === 'number' ? d.templatId : undefined,
              data_templat: typeof d.templatId === 'number' ? d.data : undefined,
              isi: isiAkhir || undefined,
              tujuan: d.tujuan.length ? d.tujuan.map(bersihTujuan) : undefined,
            },
          });
          invalidateSiakad('arsip/surat');
          onSelesai?.(r.data);
          return null;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

function LembarKop({ kop }: { kop: KopSurat | React.ReactNode }) {
  if (kop && typeof kop === 'object' && 'instansi' in (kop as object)) {
    const k = kop as KopSurat;
    return (
      <div className="u-lembar-kop">
        {k.logo && <img src={k.logo} alt="" className="u-lembar-logo" />}
        <div>
          <p className="u-lembar-instansi">{k.instansi}</p>
          {k.unit && <p className="u-lembar-unit">{k.unit}</p>}
          {k.alamat && <p className="u-lembar-alamat">{k.alamat}</p>}
        </div>
      </div>
    );
  }
  return <>{kop}</>;
}

export function tujuanLengkap(t: TujuanSuratInput): boolean {
  switch (t.jenis) {
    case 'unit':
      return Boolean(t.unit_id);
    case 'dosen':
      return Boolean(t.nidn);
    case 'mahasiswa':
      return Boolean(t.nim);
    case 'pengguna':
      return Boolean(t.username);
    default:
      return Boolean(t.nama?.trim() || t.instansi?.trim());
  }
}

/** Buang kolom yang bukan milik jenisnya (server menolak campuran). */
export function bersihTujuan(t: TujuanSuratInput): TujuanSuratInput {
  const umum = { jenis: t.jenis, jabatan: t.jabatan?.trim() || undefined, tembusan: t.tembusan || undefined };
  switch (t.jenis) {
    case 'unit':
      return { ...umum, unit_id: t.unit_id };
    case 'dosen':
      return { ...umum, nidn: t.nidn };
    case 'mahasiswa':
      return { ...umum, nim: t.nim };
    case 'pengguna':
      return { ...umum, username: t.username };
    default:
      return { ...umum, nama: t.nama?.trim() || undefined, instansi: t.instansi?.trim() || undefined, alamat: t.alamat?.trim() || undefined };
  }
}

/** Daftar tujuan surat: jenis (unit, dosen, mahasiswa, pengguna, pihak luar) + pencarian, dan tanda tembusan. */
export function DaftarTujuan({ nilai, ganti }: { nilai: TujuanSuratInput[]; ganti: (t: TujuanSuratInput[]) => void }) {
  const ubah = (i: number, x: Partial<TujuanSuratInput>) => ganti(nilai.map((t, j) => (j === i ? { ...t, ...x } : t)));
  return (
    <div className="u-surat-tujuan">
      {nilai.length === 0 && <p className="u-eb-redup">Belum ada tujuan.</p>}
      {nilai.map((t, i) => (
        <div key={i} className="u-surat-tujuan-baris">
          <div className="u-surat-tujuan-kepala">
            <Select<JenisTujuan> aria-label={`Jenis tujuan ${i + 1}`} value={t.jenis} onValueChange={(v) => ubah(i, { jenis: v ?? 'unit', unit_id: undefined, nidn: undefined, nim: undefined, username: undefined, nama: undefined })} options={[...JENIS_TUJUAN]} />
            <label className="u-surat-tembusan">
              <Checkbox checked={Boolean(t.tembusan)} onCheckedChange={(c) => ubah(i, { tembusan: Boolean(c) })} />
              Tembusan
            </label>
            <Button variant="ghost" size="sm" iconOnly aria-label={`Hapus tujuan ${i + 1}`} onClick={() => ganti(nilai.filter((_, j) => j !== i))}>
              <X />
            </Button>
          </div>
          {t.jenis === 'eksternal' ? (
            <FormGrid>
              <Field label="Nama">
                <Input value={t.nama ?? ''} onChange={(e) => ubah(i, { nama: e.target.value })} />
              </Field>
              <Field label="Instansi">
                <Input value={t.instansi ?? ''} onChange={(e) => ubah(i, { instansi: e.target.value })} />
              </Field>
              <Field label="Jabatan" optional>
                <Input value={t.jabatan ?? ''} onChange={(e) => ubah(i, { jabatan: e.target.value })} />
              </Field>
              <Field label="Alamat" optional>
                <Input value={t.alamat ?? ''} onChange={(e) => ubah(i, { alamat: e.target.value })} />
              </Field>
            </FormGrid>
          ) : t.jenis === 'unit' ? (
            <PilihUnit
              sumber="arsip"
              aria-label={`Penerima ${i + 1}`}
              value={t.unit_id ?? null}
              onValueChange={(v, u) => ubah(i, { unit_id: v ?? undefined, nama: u ? u.nama : undefined })}
              placeholder="Pilih unit"
            />
          ) : (
            <PilihEntitas
              aria-label={`Penerima ${i + 1}`}
              jenis={t.jenis}
              value={t.jenis === 'dosen' ? (t.nidn ?? null) : t.jenis === 'mahasiswa' ? (t.nim ?? null) : (t.username ?? null)}
              onValueChange={(v, baris) => {
                const nama = baris ? String(baris.nama ?? baris.nama_lengkap ?? '') : undefined;
                if (t.jenis === 'dosen') ubah(i, { nidn: v ?? undefined, nama });
                else if (t.jenis === 'mahasiswa') ubah(i, { nim: v ?? undefined, nama });
                else ubah(i, { username: v ?? undefined, nama });
              }}
            />
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => ganti([...nilai, { jenis: 'unit' }])}>
        <Plus />
        Tambah tujuan
      </Button>
    </div>
  );
}
