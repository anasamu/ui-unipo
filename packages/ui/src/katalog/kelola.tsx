'use client';
import * as React from 'react';
import { Download, FileText, Paperclip, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { Siakad } from 'unipo-siakad-sdk';
import { Badge, Button, Skeleton } from '../components/actions';
import { Dropzone } from '../components/calendar';
import { Empty, Tabs } from '../components/display';
import { DataTable, type DataColumn, type SortState } from '../components/data-table';
import { FilterBar, type FilterField } from '../components/filter';
import { ConfirmDialog, Dialog, DialogClose, Sheet, Tooltip, useToast, type MenuEntry } from '../components/overlays';
import { formatBytes, formatDate } from '../lib/format';
import { GalatApi } from '../siakad/galat';
import { PilihEntitas } from '../siakad/pilih';
import { invalidateSiakad, pesanGalat, useOptionalSiakad, useSiakad, useSiakadQuery } from '../siakad/provider';
import { useSiakadTable } from '../siakad/tabel';
import {
  isiPath,
  judulBaris,
  judulOperasi,
  keabsahanAksi,
  labelKolom,
  labelNilai,
  nilaiKunci,
  paramPath,
  pilihKolom,
  punyaScope,
} from './aturan';
import { FormulirSkema, sumberDariAcuan, useFormulirSkema } from './isian';
import { useKatalog, useSumber, type SumberState } from './katalog';
import { AlurStatus, DetailBaris, NilaiSel } from './tampil';
import type { Baris, Operasi, Skema } from './tipe';

const SISTEM = new Set(['page', 'per_page', 'q', 'urut', 'dari', 'sampai', 'limit', 'offset', 'sort']);

/** Field saringan dari parameter query endpoint daftar: enum → pilihan, boolean → saklar, kunci tabel → pilih-cari, dari/sampai → rentang tanggal. */
export function saringanDariOperasi(op: Operasi | undefined, sembunyi: string[] = []): FilterField[] {
  if (!op?.pa) return [];
  const out: FilterField[] = [];
  for (const p of op.pa) {
    if (p.in !== 'query' || SISTEM.has(p.nm) || sembunyi.includes(p.nm)) continue;
    const s = p.s;
    if (s.e?.length) out.push({ key: p.nm, label: labelKolom(p.nm), type: 'select', options: s.e.filter((x) => x !== null).map((x) => ({ value: String(x), label: labelNilai(x) })) });
    else if (s.t === 'boolean') out.push({ key: p.nm, label: labelKolom(p.nm), type: 'boolean' });
    else if (s.rf) {
      const src = sumberDariAcuan(s.rf, p.nm);
      out.push({
        key: p.nm,
        label: labelKolom(p.nm),
        type: 'custom',
        render: (v, set) => <PilihEntitas jenis={src} value={(v as string) ?? null} onValueChange={(x) => set(x ?? undefined)} size="sm" />,
      });
    }
  }
  if (op.pa.some((p) => p.nm === 'dari') && op.pa.some((p) => p.nm === 'sampai')) out.push({ key: 'rentang', label: 'Tanggal', type: 'date-range', params: ['dari', 'sampai'] });
  return out;
}

async function jalankan(siakad: Siakad, op: Operasi, nilaiPath: Record<string, unknown>, body?: unknown, query?: Record<string, unknown>) {
  const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
  return siakad.request({ method: op.m, path: op.path, query: { ...(query as object), ...nilaiPath } as never, body, multipart, public: Boolean(op.pub) });
}

/** Nilai path item untuk satu baris: kunci item + parameter induk yang sudah diketahui. */
function nilaiPathBaris(sumber: SumberState['sumber'], baris: Baris, induk?: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...induk };
  if (sumber?.key) out[sumber.key] = nilaiKunci(baris, sumber.key);
  return out;
}

// ================================================================ Tabel
export interface TabelSumberProps {
  /** Path sumber data, mis. '/v1/kemahasiswaan/beasiswa'. */
  sumber: string;
  /** Nilai parameter path induk untuk sumber anak, mis. { id: 12 } untuk /v1/x/{id}/anak. */
  induk?: Record<string, unknown>;
  /** Saringan tetap (tidak tampil di bilah saringan). */
  query?: Record<string, string | number | boolean | undefined>;
  /** Kolom yang ditampilkan (bawaan dipilih otomatis). */
  kolom?: string[];
  /** Ganti isi sel kolom tertentu. */
  sel?: Record<string, (b: Baris) => React.ReactNode>;
  onRowClick?: (b: Baris) => void;
  rowActions?: (b: Baris) => MenuEntry[];
  actions?: React.ReactNode;
  perPage?: number;
  /** Simpan saringan di URL. */
  syncUrl?: boolean;
  /** Muat ulang dari luar (naikkan angka). */
  muatUlang?: number;
  className?: string;
}

/** Tabel data dari endpoint daftar katalog: saringan dari parameter API, urut server, halaman, ekspor CSV. */
export function TabelSumber({ sumber: id, induk, query, kolom, sel, onRowClick, rowActions, actions, perPage = 20, syncUrl, className }: TabelSumberProps) {
  const st = useSumber(id);
  const list = st.op(st.sumber?.list);
  if (st.loading) return <Skeleton height={240} />;
  if (st.error) return <GalatApi error={st.error} title="Katalog tidak dapat dimuat" />;
  if (!list) return <Empty title="Sumber ini tidak punya daftar" description="Gunakan operasi detail atau aksi yang tersedia." bordered />;
  return <TabelSumberDalam st={st} list={list} induk={induk} query={query} kolom={kolom} sel={sel} onRowClick={onRowClick} rowActions={rowActions} actions={actions} perPage={perPage} syncUrl={syncUrl} className={className} />;
}

function TabelSumberDalam({ st, list, induk, query, kolom, sel, onRowClick, rowActions, actions, perPage, syncUrl, className }: Omit<TabelSumberProps, 'sumber'> & { st: SumberState; list: Operasi }) {
  const tetap = Object.keys(query ?? {});
  const fields = React.useMemo(() => saringanDariOperasi(list, [...tetap, ...paramPath(list.path)]), [list, tetap.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const bisaUrut = Boolean(list.pa?.some((p) => p.nm === 'urut'));
  const bisaCari = Boolean(list.pa?.some((p) => p.nm === 'q'));
  const [sort, setSort] = React.useState<SortState>(null);
  const path = isiPath(list.path, induk ?? {});
  const t = useSiakadTable<Baris>({
    key: `katalog:${path}:${JSON.stringify(query ?? {})}:${sort ? (sort.dir === 'desc' ? '-' : '') + sort.key : ''}`,
    fetch: (s, q, signal) => s.request<Baris[]>({ method: 'GET', path, query: { ...query, ...q, ...(sort ? { urut: (sort.dir === 'desc' ? '-' : '') + sort.key } : {}) } as never, public: Boolean(list.pub) }, { signal }),
    fields,
    perPage,
    syncUrl,
  });
  const rows = Array.isArray(t.data) ? t.data : undefined;
  const { semua, awal } = pilihKolom(st.skemaBaris, rows ?? [], 6);
  const tampil = kolom ?? awal;
  const columns: DataColumn<Baris>[] = semua
    .filter((k) => tampil.includes(k) || !kolom)
    .map((k) => ({
      key: k,
      header: labelKolom(k),
      label: labelKolom(k),
      sortable: bisaUrut,
      defaultHidden: !tampil.includes(k),
      cell: sel?.[k] ?? ((b: Baris) => <NilaiSel nama={k} value={b[k]} skema={st.skemaBaris?.pr?.[k]} />),
      value: (b: Baris) => (b[k] == null || typeof b[k] === 'object' ? '' : b[k]),
      mobile: k === tampil[0] ? 'title' : /status/.test(k) ? 'badge' : undefined,
    }));
  return (
    <DataTable<Baris>
      className={className}
      {...t.tableProps}
      rows={rows}
      columns={columns}
      rowKey={(b) => String(nilaiKunci(b, st.sumber?.key) ?? JSON.stringify(b))}
      onRowClick={onRowClick}
      rowActions={rowActions}
      sort={bisaUrut ? sort : undefined}
      onSortChange={bisaUrut ? setSort : undefined}
      exportCsv={st.sumber?.title}
      toolbar={fields.length || bisaCari ? <FilterBar fields={fields} {...t.filterProps} search={bisaCari ? { placeholder: `Cari ${st.sumber?.title.toLowerCase() ?? ''}` } : false} resultLabel={st.sumber?.title.toLowerCase()} /> : undefined}
      actions={actions}
      empty={{ icon: <FileText />, title: `Belum ada ${st.sumber?.title.toLowerCase() ?? 'data'}` }}
    />
  );
}

// ================================================================ Aksi baris
export interface TombolAksiProps {
  op: Operasi;
  /** Baris sasaran (aksi item) atau kosong (aksi koleksi). */
  baris?: Baris | null;
  /** Nilai parameter path, mis. { id: 12 }. */
  nilaiPath: Record<string, unknown>;
  skemaBaris?: Skema;
  onSelesai?: (hasil: unknown) => void;
  /** Tampilan tombol. */
  variant?: 'primary' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  size?: 'sm' | 'md';
  /** Tetap tampil (nonaktif dengan alasan) bila status tidak memenuhi. Bawaan disembunyikan. */
  tampilkanTakSah?: boolean;
}

const BAHAYA = /(hapus|tolak|batal|cabut|blokir|musnah|nonaktif|tutup|kembalikan|reset)/i;

/**
 * Satu aksi alur kerja (POST /{id}/aksi): disembunyikan bila status baris tidak sesuai aturan backend, membuka
 * formulir bila aksi punya isian (catatan, alasan, nilai), atau konfirmasi bila tidak.
 */
export function TombolAksi({ op, baris, nilaiPath, skemaBaris, onSelesai, variant, size = 'sm', tampilkanTakSah }: TombolAksiProps) {
  const siakad = useSiakad();
  const { scopes } = useKatalog();
  const toast = useToast();
  const [buka, setBuka] = React.useState(false);
  const sah = keabsahanAksi(op, baris, skemaBaris, scopes);
  const judul = judulOperasi(op);
  const punyaIsian = Boolean(op.b && Object.keys(op.b.s.pr ?? {}).length);
  const form = useFormulirSkema(op.b?.s);
  const [galat, setGalat] = React.useState<unknown>(null);
  const [sibuk, setSibuk] = React.useState(false);
  const v = variant ?? (BAHAYA.test(judul) ? 'outline' : 'primary');
  if (!sah.boleh && !tampilkanTakSah) return null;
  const selesai = (hasil: unknown) => {
    toast.add({ title: `${judul} berhasil`, description: op.tr?.ke ? `Status menjadi ${labelNilai(op.tr.ke)}.` : undefined, type: 'success' });
    invalidateSiakad('katalog:');
    onSelesai?.(hasil);
  };
  const tombol = (
    <Button variant={v} size={size} disabled={!sah.boleh}>
      {judul}
    </Button>
  );
  if (!sah.boleh) return <Tooltip content={sah.alasan}>{<span tabIndex={0}>{tombol}</span>}</Tooltip>;
  if (!punyaIsian) {
    return (
      <ConfirmDialog
        trigger={tombol}
        title={`${judul}?`}
        description={[baris ? judulBaris(baris) : null, op.tr?.ke ? `Status akan menjadi ${labelNilai(op.tr.ke)}.` : null, op.ds?.replace(/(Pengelola modul|Pemilik data( atau pengelola)?|Admin modul)\.\s*/, '').replace(/Status harus[^.]*\.\s*/, '')].filter(Boolean).join(' ') || undefined}
        confirmLabel={judul}
        tone={BAHAYA.test(judul) ? 'danger' : 'primary'}
        onConfirm={async () => {
          try {
            const r = await jalankan(siakad, op, nilaiPath, op.m === 'POST' ? {} : undefined);
            selesai(r.data);
          } catch (e) {
            toast.add({ title: `${judul} gagal`, description: pesanGalat(e), type: 'error' });
            throw e;
          }
        }}
      />
    );
  }
  return (
    <Dialog
      open={buka}
      onOpenChange={(o) => {
        setBuka(o);
        if (!o) {
          form.reset();
          setGalat(null);
        }
      }}
      trigger={tombol}
      title={judul}
      description={baris ? judulBaris(baris) : op.ds}
      size="md"
      footer={
        <>
          <DialogClose render={<Button variant="ghost" />}>Batal</DialogClose>
          <Button
            variant={BAHAYA.test(judul) ? 'destructive' : 'primary'}
            loading={sibuk}
            onClick={async () => {
              const body = form.kirim();
              if (!body) return;
              setSibuk(true);
              setGalat(null);
              try {
                const r = await jalankan(siakad, op, nilaiPath, body);
                setBuka(false);
                selesai(r.data);
              } catch (e) {
                if (!form.galatServer(e)) setGalat(e);
              } finally {
                setSibuk(false);
              }
            }}
          >
            {judul}
          </Button>
        </>
      }
    >
      {galat ? <GalatApi error={galat} title={`${judul} gagal`} /> : null}
      <FormulirSkema skema={op.b?.s} form={form} columns={1} />
    </Dialog>
  );
}

/** Semua aksi alur kerja yang sah untuk satu baris, berderet. */
export function AksiSumber({ sumber: id, baris, induk, onSelesai, tampilkanTakSah }: { sumber: string; baris: Baris; induk?: Record<string, unknown>; onSelesai?: (hasil: unknown) => void; tampilkanTakSah?: boolean }) {
  const st = useSumber(id);
  if (!st.sumber) return null;
  const ops = st.sumber.actions.map((a) => st.op(a)).filter((o): o is Operasi => Boolean(o) && o!.m !== 'GET');
  if (!ops.length) return null;
  return (
    <div className="u-aksi-sumber">
      {ops.map((o) => (
        <TombolAksi key={o.id} op={o} baris={baris} nilaiPath={nilaiPathBaris(st.sumber, baris, induk)} skemaBaris={st.skemaBaris} onSelesai={onSelesai} tampilkanTakSah={tampilkanTakSah} />
      ))}
    </div>
  );
}

// ================================================================ Formulir tambah/ubah
export interface FormulirSumberProps {
  sumber: string;
  /** Baris yang diubah; kosong = tambah. */
  baris?: Baris | null;
  induk?: Record<string, unknown>;
  /** Nilai awal tambahan untuk mode tambah. */
  nilai?: Record<string, unknown>;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  trigger?: React.ReactElement;
  onTersimpan?: (b: Baris) => void;
  /** Tampil sebagai panel samping (bawaan) atau dialog. */
  tampilan?: 'sheet' | 'dialog';
}

/** Panel tambah/ubah satu sumber data dengan validasi backend dan galat 422 per isian. */
export function FormulirSumber({ sumber: id, baris, induk, nilai, open, onOpenChange, trigger, onTersimpan, tampilan = 'sheet' }: FormulirSumberProps) {
  const st = useSumber(id);
  const siakad = useSiakad();
  const toast = useToast();
  const ubah = Boolean(baris);
  const op = st.op(ubah ? st.sumber?.update : st.sumber?.create);
  const skema = op?.b?.s;
  const form = useFormulirSkema(skema, { data: baris ?? undefined, nilai });
  const [galat, setGalat] = React.useState<unknown>(null);
  const [sibuk, setSibuk] = React.useState(false);
  const [inner, setInner] = React.useState(false);
  const isOpen = open ?? inner;
  const setOpen = (o: boolean) => {
    setInner(o);
    onOpenChange?.(o);
    if (!o) setGalat(null);
  };
  if (!op) return null;
  const nama = st.sumber?.title.toLowerCase() ?? 'data';
  const W = tampilan === 'sheet' ? Sheet : Dialog;
  return (
    <W
      open={isOpen}
      onOpenChange={setOpen}
      trigger={trigger}
      size="lg"
      title={ubah ? `Ubah ${nama}` : `Tambah ${nama}`}
      description={ubah ? judulBaris(baris, st.sumber?.key) : op.ds?.replace(/(Pengelola modul|Pemilik data( atau pengelola)?|Admin modul)\.\s*/, '') || undefined}
      footer={
        <>
          <DialogClose render={<Button variant="ghost" />}>Batal</DialogClose>
          <Button
            loading={sibuk}
            onClick={async () => {
              const body = form.kirim();
              if (!body) return;
              if (ubah && body && !(body instanceof FormData) && !Object.keys(body).length) {
                setOpen(false);
                return;
              }
              setSibuk(true);
              setGalat(null);
              try {
                const nilaiPath = ubah ? nilaiPathBaris(st.sumber, baris!, induk) : { ...induk };
                const r = await jalankan(siakad, op, nilaiPath, body);
                toast.add({ title: ubah ? 'Perubahan tersimpan' : `${st.sumber?.title} ditambahkan`, type: 'success' });
                invalidateSiakad('katalog:');
                setOpen(false);
                if (!ubah) form.reset();
                onTersimpan?.((r.data as Baris) ?? {});
              } catch (e) {
                if (!form.galatServer(e)) setGalat(e);
              } finally {
                setSibuk(false);
              }
            }}
          >
            {ubah ? 'Simpan perubahan' : `Tambah ${nama}`}
          </Button>
        </>
      }
    >
      {galat ? <GalatApi error={galat} title="Gagal menyimpan" /> : null}
      <FormulirSkema skema={skema} form={form} sembunyi={Object.keys(induk ?? {})} />
    </W>
  );
}

// ================================================================ Lampiran (sumber /berkas)
/** Lampiran baris (PusatData berkas): daftar, unggah (seret berkas), unduh, dan hapus. */
export function LampiranSumber({ path, bisaUbah = true }: { path: string; bisaUbah?: boolean }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useSiakadQuery<Baris[]>(['katalog:berkas', path], (s, signal) => s.request({ method: 'GET', path }, { signal }));
  const [sibuk, setSibuk] = React.useState(false);
  const unggah = async (files: File[]) => {
    setSibuk(true);
    try {
      for (const f of files) {
        const fd = new FormData();
        fd.append('berkas', f);
        await siakad.request({ method: 'POST', path, body: fd, multipart: true });
      }
      toast.add({ title: `${files.length} berkas diunggah`, type: 'success' });
      q.refetch();
    } catch (e) {
      toast.add({ title: 'Gagal mengunggah', description: pesanGalat(e), type: 'error' });
    } finally {
      setSibuk(false);
    }
  };
  const unduh = async (b: Baris) => {
    try {
      const r = await siakad.request<unknown>({ method: 'GET', path: `${path}/${b.uuid}` });
      const url = (r.data as Baris | undefined)?.url;
      if (typeof url === 'string') window.open(url, '_blank', 'noopener');
    } catch (e) {
      toast.add({ title: 'Gagal mengunduh', description: pesanGalat(e), type: 'error' });
    }
  };
  return (
    <div className="u-lampiran">
      {q.error ? <GalatApi error={q.error} onRetry={q.refetch} /> : null}
      {q.loading && !q.data ? <Skeleton height={64} /> : null}
      {Array.isArray(q.data) && q.data.length > 0 && (
        <ul className="u-lampiran-daftar">
          {q.data.map((b) => (
            <li key={String(b.uuid)}>
              <Paperclip aria-hidden />
              <span>
                <b>{String(b.nama ?? b.uuid)}</b>
                <small>{[b.jenis, typeof b.ukuran === 'number' ? formatBytes(b.ukuran) : null, b.created_at ? formatDate(String(b.created_at), 'medium') : null].filter(Boolean).join(' · ')}</small>
              </span>
              <Button variant="ghost" size="sm" iconOnly aria-label="Unduh" onClick={() => unduh(b)}>
                <Download />
              </Button>
              {bisaUbah && (
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="sm" iconOnly aria-label="Hapus lampiran">
                      <Trash2 />
                    </Button>
                  }
                  title="Hapus lampiran?"
                  description={String(b.nama ?? '')}
                  confirmLabel="Hapus lampiran"
                  onConfirm={async () => {
                    await siakad.request({ method: 'DELETE', path: `${path}/${b.uuid}` });
                    q.refetch();
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {Array.isArray(q.data) && q.data.length === 0 && !bisaUbah && <p className="u-field-description">Belum ada lampiran.</p>}
      {bisaUbah && <Dropzone onFiles={unggah} multiple disabled={sibuk} title={sibuk ? 'Mengunggah…' : 'Seret berkas ke sini atau pilih'} hint="PDF, gambar, dokumen Office/ODF, CSV, TXT, ZIP" maxSize={20 * 1024 * 1024} />}
    </div>
  );
}

// ================================================================ Detail baris
export interface DetailSumberProps {
  sumber: string;
  baris: Baris;
  induk?: Record<string, unknown>;
  onUbah?: () => void;
  onHapus?: () => void;
  onBerubah?: (b: Baris) => void;
}

/** Isi panel detail: alur status, aksi yang sah, data lengkap (dimuat ulang dari endpoint detail), lampiran, dan data anak. */
export function DetailSumber({ sumber: id, baris, induk, onBerubah }: DetailSumberProps) {
  const st = useSumber(id);
  const get = st.op(st.sumber?.get);
  const nilaiPath = nilaiPathBaris(st.sumber, baris, induk);
  const kunci = st.sumber?.key ? nilaiKunci(baris, st.sumber.key) : undefined;
  const q = useSiakadQuery<Baris>(['katalog:detail', get?.path, nilaiPath], (s, signal) => s.request({ method: 'GET', path: get!.path, query: nilaiPath as never, public: Boolean(get?.pub) }, { signal }), { enabled: Boolean(get && kunci) });
  const b = (q.data && typeof q.data === 'object' && !Array.isArray(q.data) ? q.data : null) ?? baris;
  const aksi = (st.sumber?.actions ?? []).map((a) => st.op(a)).filter((o): o is Operasi => Boolean(o));
  const kolomStatus = st.skemaBaris?.pr?.status?.e ? 'status' : undefined;
  const anak = (st.sumber?.children ?? []).filter((c) => !/\/berkas$/.test(c));
  const berkas = (st.sumber?.children ?? []).find((c) => /\/berkas$/.test(c));
  const tabs = [
    {
      value: 'data',
      label: 'Data',
      content: (
        <div className="u-detail-sumber">
          {kolomStatus && aksi.some((o) => o.tr) && <AlurStatus status={st.skemaBaris!.pr!.status.e!.map(String)} sekarang={b.status == null ? null : String(b.status)} aksi={aksi} baris={b} skemaBaris={st.skemaBaris} />}
          {q.error ? <GalatApi error={q.error} onRetry={q.refetch} variant="warning" title="Data terbaru tidak dapat dimuat" /> : null}
          <DetailBaris baris={b} skema={st.skemaBaris} />
        </div>
      ),
    },
    ...(berkas && st.sumber?.key
      ? [{ value: 'berkas', label: 'Lampiran', icon: <Paperclip />, content: <LampiranSumber path={isiPath(berkas, { ...induk, [paramPath(berkas)[0] ?? 'id']: kunci })} bisaUbah={Boolean(st.sumber.update)} /> }]
      : []),
    ...anak.map((c) => ({
      value: c,
      label: st.modul?.resources.find((r) => r.id === c)?.title ?? labelKolom(c.split('/').pop() ?? c),
      content: <KelolaSumber sumber={c} induk={{ ...induk, [paramPath(c).at(-1) ?? 'id']: kunci }} ringkas />,
    })),
  ];
  return (
    <div className="u-detail-sumber-wrap">
      {aksi.length > 0 && <AksiSumber sumber={id} baris={b} induk={induk} onSelesai={(h) => (q.refetch(), h && typeof h === 'object' && onBerubah?.(h as Baris))} />}
      {tabs.length > 1 ? <Tabs items={tabs} defaultValue="data" /> : tabs[0].content}
    </div>
  );
}

// ================================================================ Kelola: tabel + tambah + detail + ubah + hapus + aksi
export interface KelolaSumberProps extends Omit<TabelSumberProps, 'onRowClick' | 'rowActions' | 'actions'> {
  /** Judul di atas tabel (bawaan judul sumber). Isi false untuk tanpa judul. */
  judul?: React.ReactNode | false;
  deskripsi?: React.ReactNode;
  /** Sembunyikan tombol tambah/ubah/hapus (tampilan baca saja). */
  bacaSaja?: boolean;
  /** Tampilan ringkas untuk tab di dalam detail (tanpa judul). */
  ringkas?: boolean;
  /** Tombol tambahan di bilah alat. */
  actions?: React.ReactNode;
}

/**
 * Halaman kelola lengkap satu sumber data API SIAKAD: daftar dengan saringan, tambah, detail (alur status, aksi
 * yang sah menurut backend, lampiran, data anak), ubah, dan hapus. Tombol disembunyikan bila scope token kurang.
 *
 *   <KelolaSumber sumber="/v1/kemahasiswaan/beasiswa" />
 */
export function KelolaSumber({ sumber: id, judul, deskripsi, bacaSaja, ringkas, induk, actions, ...tabel }: KelolaSumberProps) {
  const st = useSumber(id);
  const { scopes } = useKatalog();
  const siakad = useOptionalSiakad();
  const toast = useToast();
  const [detail, setDetail] = React.useState<Baris | null>(null);
  const [ubah, setUbah] = React.useState<Baris | null>(null);
  const [tambah, setTambah] = React.useState(false);
  const [hapus, setHapus] = React.useState<Baris | null>(null);
  if (st.loading) return <Skeleton height={280} />;
  if (st.error || !st.sumber) return <GalatApi error={st.error ?? new Error('Sumber tidak ditemukan.')} title="Katalog tidak dapat dimuat" />;
  const s = st.sumber;
  const opCreate = st.op(s.create);
  const opUpdate = st.op(s.update);
  const opDel = st.op(s.del);
  const boleh = (o: Operasi | undefined) => Boolean(o) && !bacaSaja && punyaScope(o!, scopes);
  const nama = s.title.toLowerCase();
  const rowActions = (b: Baris): MenuEntry[] => [
    { label: 'Lihat detail', onSelect: () => setDetail(b) },
    ...(boleh(opUpdate) ? [{ label: 'Ubah', icon: <Pencil />, onSelect: () => setUbah(b) }] : []),
    ...(boleh(opDel) ? [{ type: 'separator' as const }, { label: 'Hapus', icon: <Trash2 />, destructive: true, onSelect: () => setHapus(b) }] : []),
  ];
  return (
    <section className="u-kelola-sumber" data-ringkas={ringkas || undefined}>
      {judul !== false && !ringkas && (
        <header className="u-kelola-head">
          <div>
            <h2>{judul ?? s.title}</h2>
            {deskripsi !== undefined ? deskripsi && <p>{deskripsi}</p> : <p className="u-mono">{s.base}</p>}
          </div>
          <div className="u-kelola-head-aksi">
            {(st.op(s.list)?.sc ?? []).map((sc) => (
              <Badge key={sc} variant="neutral">
                {sc}
              </Badge>
            ))}
          </div>
        </header>
      )}
      <TabelSumber
        {...tabel}
        sumber={id}
        induk={induk}
        onRowClick={st.sumber.get || st.sumber.item ? setDetail : undefined}
        rowActions={rowActions}
        actions={
          <>
            {actions}
            <Tooltip content="Muat ulang">
              <Button variant="ghost" size="sm" iconOnly aria-label="Muat ulang" onClick={() => invalidateSiakad('katalog:')}>
                <RefreshCw />
              </Button>
            </Tooltip>
            {boleh(opCreate) && (
              <Button size="sm" onClick={() => setTambah(true)}>
                <Plus /> Tambah {ringkas ? '' : nama}
              </Button>
            )}
          </>
        }
      />
      {boleh(opCreate) && <FormulirSumber sumber={id} induk={induk} open={tambah} onOpenChange={setTambah} onTersimpan={(b) => b && Object.keys(b).length && setDetail(b)} />}
      {ubah && <FormulirSumber sumber={id} induk={induk} baris={ubah} open onOpenChange={(o) => !o && setUbah(null)} onTersimpan={(b) => detail && setDetail({ ...detail, ...b })} />}
      <Sheet
        open={Boolean(detail)}
        onOpenChange={(o) => !o && setDetail(null)}
        size="lg"
        title={detail ? judulBaris(detail, s.key) || s.title : s.title}
        description={s.title}
        footer={
          detail && (boleh(opUpdate) || boleh(opDel)) ? (
            <>
              {boleh(opDel) && (
                <Button variant="ghost" onClick={() => setHapus(detail)}>
                  <Trash2 /> Hapus
                </Button>
              )}
              {boleh(opUpdate) && (
                <Button variant="outline" onClick={() => setUbah(detail)}>
                  <Pencil /> Ubah
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {detail && <DetailSumber sumber={id} baris={detail} induk={induk} onBerubah={(b) => setDetail({ ...detail, ...b })} />}
      </Sheet>
      <ConfirmDialog
        open={Boolean(hapus)}
        onOpenChange={(o) => !o && setHapus(null)}
        title={`Hapus ${nama}?`}
        description={hapus ? `${judulBaris(hapus, s.key)} akan dihapus. Data yang sudah dipakai di tempat lain bisa ditolak server.` : undefined}
        confirmLabel={`Hapus ${nama}`}
        onConfirm={async () => {
          if (!hapus || !siakad || !opDel) return;
          try {
            await jalankan(siakad, opDel, nilaiPathBaris(s, hapus, induk));
            toast.add({ title: `${s.title} dihapus`, type: 'success' });
            invalidateSiakad('katalog:');
            if (detail && nilaiKunci(detail, s.key) === nilaiKunci(hapus, s.key)) setDetail(null);
          } catch (e) {
            toast.add({ title: 'Gagal menghapus', description: pesanGalat(e), type: 'error' });
            throw e;
          }
        }}
      />
    </section>
  );
}

/** Alias pendek: `<Fitur sumber="/v1/sarpras/peminjaman" />`. */
export const Fitur = KelolaSumber;
