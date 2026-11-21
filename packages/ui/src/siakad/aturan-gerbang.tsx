'use client';
import * as React from 'react';
import { Ban, CircleCheck, ExternalLink, FileBadge, Inbox, ShieldCheck, TriangleAlert, Undo2, UserX } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, DescriptionList } from '../components/display';
import { DataTable } from '../components/data-table';
import { Field, SegmentedControl, Textarea } from '../components/forms';
import { Dialog, useToast } from '../components/overlays';
import { labelKategoriAturan } from './aturan';
import { type PenyetujuKategoriAturan } from './aturan-keputusan';
import { PanelLampirSkDasar, PemilihSkDasar, type UnitRingkas } from './aturan-sk';
import { GalatApi } from './galat';
import { AlurPemeriksa, type TahapPemeriksa } from './pemeriksa';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

/*
 * Gerbang SK + validator untuk kebijakan di luar modul Aturan (SIAKAD /v1/aturan/kebijakan/*, docs/ATURAN-SK.md
 * "Gerbang kebijakan"): AturanVersi SDM & kurikulum, kunci fitur, penyimpanan berkas, kwitansi, syarat keuangan, biaya
 * PMB per gelombang, kuesioner tracer, kalender, aturan biaya.
 *
 *   PeringatanPenyetujuAturan   peringatan bila pejabat penyetuju kategori unit ini belum ada (LT-01), tautan ke
 *                               Pustikom » Organisasi & pejabat. Tidak mengisi data pejabat apa pun.
 *   DaftarKerjaPerluSk          daftar kerja "Perlu SK": aturan aktif tanpa SK dasar + kebijakan berlaku tanpa SK,
 *                               jumlah per unit (Pustikom: semua unit; layar unit: `unit`), aksi lampirkan SK.
 *   AntreanValidasiKebijakan    kebijakan yang menunggu validasi saya: setujui, kembalikan, tolak (panel samping).
 *
 * Keputusan pemilik 2026-11-21: aturan/kebijakan tanpa SK tetap berlaku dengan peringatan, tidak memblokir.
 */

// ================================================================ Tipe

export type StatusSkKebijakan = 'berlaku' | 'diubah' | 'tidak_berlaku' | 'belum';
export type StatusValidasiKebijakan = 'berjalan' | 'disetujui' | 'dikembalikan' | 'ditolak' | 'validator_kosong' | 'belum';

export interface KebijakanGerbang {
  /** UUID gerbang; null bila kebijakan lama belum pernah lewat gerbang. */
  id: string | null;
  jenis: string;
  jenis_judul: string;
  baris: string;
  nama: string;
  kategori: string;
  unit: UnitRingkas | null;
  status_sk: StatusSkKebijakan;
  label_sk: string;
  sk: { id: string; nomor: string; tanggal?: string | null; perihal?: string | null; status: string; penerbit?: { nama: string } | null } | null;
  validasi: StatusValidasiKebijakan;
  label_validasi: string;
  validasi_rinci?: { tahap_ke: number; jumlah_tahap: number; berikutnya: Array<{ nama: string; sebagai: string }> } | null;
  perlu_sk: boolean;
  peringatan: Array<{ kode: string; pesan: string }>;
  aktif: boolean;
  diubah_oleh?: string | null;
  diubah_at?: string | null;
  kelola: { aplikasi: string | null; path: string | null; menu: string | null; url: string | null };
  boleh_putus?: boolean;
}

export interface AturanPerluSk {
  id: string;
  nama: string;
  kategori: string;
  titik_judul: string;
  bawaan: boolean;
  mode: string;
  status_sk: 'belum' | 'tidak_berlaku';
  unit: UnitRingkas | null;
  tautan: string | null;
}

export interface PerluSkRingkas {
  per_unit: Array<{ unit: UnitRingkas | null; aturan: number; kebijakan: number; jumlah: number }>;
  aturan: AturanPerluSk[];
  kebijakan: KebijakanGerbang[];
  jumlah: { aturan: number; kebijakan: number; total: number };
}

export interface TautanGerbang {
  jenis: Array<{ kode: string; judul: string; kategori: string; unit: string; menu: string | null; aplikasi: string | null; path: string | null }>;
  tautan: Record<'pejabat' | 'validator' | 'perlu_sk', { menu: string; url: string | null }>;
}

// ================================================================ Hook

export function useJenisKebijakan() {
  return useSiakadQuery<TautanGerbang>(['aturan', 'kebijakan', 'jenis'], (s, signal) => s.request<TautanGerbang>({ method: 'GET', path: '/v1/aturan/kebijakan/jenis' }, { signal }), { staleTime: 300_000 });
}
export function usePerluSk(unit?: string | null) {
  return useSiakadQuery<PerluSkRingkas>(['aturan', 'kebijakan', 'perlu-sk', unit ?? ''], (s, signal) =>
    s.request<PerluSkRingkas>({ method: 'GET', path: '/v1/aturan/kebijakan/perlu-sk', query: unit ? { unit } : {} }, { signal }),
  );
}
export function useAntreanKebijakan() {
  return useSiakadQuery<KebijakanGerbang[]>(['aturan', 'kebijakan', 'antrean'], (s, signal) => s.request<KebijakanGerbang[]>({ method: 'GET', path: '/v1/aturan/kebijakan/antrean' }, { signal }));
}

const namaUnit = (u: UnitRingkas | null | undefined) => (u ? u.singkatan || u.nama : 'Tanpa unit');
const belumAda = (e: unknown) => /404|route_not_found|belum_dipasang|503/.test(String((e as { status?: number; code?: string })?.status ?? '') + String((e as { code?: string })?.code ?? '') + pesanGalat(e));

/** Lencana status SK dasar kebijakan. */
export function LencanaSkKebijakan({ status, label }: { status: StatusSkKebijakan; label?: string }) {
  const v = status === 'berlaku' ? 'success' : status === 'diubah' ? 'info' : 'warning';
  return (
    <Badge variant={v} dot>
      {label ?? (status === 'belum' ? 'Perlu SK' : status === 'tidak_berlaku' ? 'SK tidak berlaku' : status === 'diubah' ? 'SK diubah' : 'Ber-SK')}
    </Badge>
  );
}

/** Lencana status validasi kebijakan. */
export function LencanaValidasiKebijakan({ status, label }: { status: StatusValidasiKebijakan; label?: string }) {
  const v = status === 'disetujui' ? 'success' : status === 'berjalan' ? 'info' : status === 'belum' ? 'neutral' : status === 'validator_kosong' ? 'warning' : 'danger';
  return (
    <Badge variant={v} dot>
      {label ?? status}
    </Badge>
  );
}

// ================================================================ Peringatan penyetuju

/**
 * Peringatan di layar aturan unit bila pejabat penyetuju kategori unit ini belum ada (GET /v1/aturan/penyetuju
 * `siap: false`): aturan & kebijakan baru belum bisa disetujui/divalidasi sampai pejabatnya dicatat. Tautan ke
 * Pustikom » Organisasi & pejabat. Diam bila semua kategori siap atau server belum mendukung.
 */
export function PeringatanPenyetujuAturan({ kategori, className }: { kategori: string[]; className?: string }) {
  const q = useSiakadQuery<PenyetujuKategoriAturan[]>(['aturan', 'penyetuju'], (s, signal) => s.request<PenyetujuKategoriAturan[]>({ method: 'GET', path: '/v1/aturan/penyetuju' }, { signal }));
  const t = useJenisKebijakan();
  if (!q.data) return null;
  const kosong = q.data.filter((r) => kategori.includes(r.kategori) && r.penyetuju?.siap === false);
  if (!kosong.length) return null;
  const pejabat = t.data?.tautan.pejabat;
  return (
    <Alert
      variant="warning"
      icon={<UserX />}
      className={cn('u-agb-peringatan', className)}
      title={`Pejabat penyetuju belum ada untuk aturan ${kosong.map((r) => labelKategoriAturan(r.kategori).toLowerCase()).join(' dan ')}`}
    >
      <p className="u-agb-teks">
        Aturan dan kebijakan baru dari unit ini belum bisa disetujui atau divalidasi sampai pejabatnya dicatat. Aturan yang sudah berlaku tetap berjalan.{' '}
        {(kosong[0]?.penyetuju as { pesan?: string | null } | undefined)?.pesan ?? `Catat pejabatnya di ${pejabat?.menu ?? 'Pustikom » Organisasi & pejabat'}.`}
      </p>
      {pejabat?.url && (
        <Button size="sm" variant="outline" className="u-agb-tombol" render={<a href={pejabat.url} target="_blank" rel="noreferrer" />}>
          Buka {pejabat.menu} <ExternalLink />
        </Button>
      )}
    </Alert>
  );
}

// ================================================================ Lampirkan SK kebijakan

/** Panel samping: pilih SK dari Registri SK untuk satu kebijakan (POST /v1/aturan/kebijakan/sk). */
export function PanelLampirSkKebijakan({ kebijakan, open, onOpenChange }: { kebijakan: KebijakanGerbang | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [sk, setSk] = React.useState<string | null>(null);
  const [kirim, setKirim] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (open) {
      setSk(null);
      setGalat(null);
    }
  }, [open, kebijakan?.baris]);
  if (!kebijakan) return null;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      size="md"
      title="Lampirkan SK dasar"
      description={`${kebijakan.nama} · ${kebijakan.jenis_judul}. Isi kebijakan tidak berubah; SK diperiksa kewenangannya.`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            loading={kirim}
            disabled={!sk}
            onClick={async () => {
              setKirim(true);
              setGalat(null);
              try {
                await siakad.request({ method: 'POST', path: '/v1/aturan/kebijakan/sk', body: { jenis: kebijakan.jenis, baris: kebijakan.baris, sk_id: sk } });
                invalidateSiakad('aturan');
                toast.add({ title: 'SK dasar dilampirkan', description: kebijakan.nama, type: 'success' });
                onOpenChange(false);
              } catch (e) {
                setGalat(pesanGalat(e));
              } finally {
                setKirim(false);
              }
            }}
          >
            <FileBadge /> Lampirkan
          </Button>
        </>
      }
    >
      <div className="u-agb-panel">
        <PemilihSkDasar
          value={sk}
          onValueChange={(id) => setSk(id)}
          rencana={kebijakan.unit ? { unit: kebijakan.unit.kode } : null}
          description={`SK pimpinan yang menjadi dasar kebijakan ini, dari Registri SK. Harus sudah terbit dan diterbitkan pimpinan ${namaUnit(kebijakan.unit)} atau di atasnya.`}
        />
        {galat && <Alert variant="danger">{galat}</Alert>}
      </div>
    </Dialog>
  );
}

// ================================================================ Daftar kerja "Perlu SK"

/**
 * Daftar kerja "Perlu SK" (GET /v1/aturan/kebijakan/perlu-sk): aturan aktif tanpa SK dasar dan kebijakan unit yang
 * berlaku tanpa SK. Tanpa `unit` = semua unit dengan jumlah per unit (Pustikom); dengan `unit` (kode induk_unit, mis.
 * BAUK) = layar aturan unit pemilik.
 */
export function DaftarKerjaPerluSk({ unit, className }: { unit?: string; className?: string }) {
  const [pilihUnit, setPilihUnit] = React.useState<string | null>(null);
  const kode = unit ?? pilihUnit ?? undefined;
  const q = usePerluSk(kode);
  const [pilihTab, setTab] = React.useState<'kebijakan' | 'aturan' | null>(null);
  const [lampir, setLampir] = React.useState<KebijakanGerbang | null>(null);
  const [lampirAturan, setLampirAturan] = React.useState<AturanPerluSk | null>(null);
  const semua = usePerluSk(undefined);
  if (q.error && belumAda(q.error)) return <Alert className={className}>Server SIAKAD ini belum mendukung daftar kerja SK kebijakan.</Alert>;
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  const d = q.data;
  const perUnit = !unit ? semua.data?.per_unit : undefined;
  // Tab awal: yang berisi (kebijakan unit dulu bila ada).
  const tab = pilihTab ?? (d && !d.jumlah.kebijakan && d.jumlah.aturan ? 'aturan' : 'kebijakan');
  return (
    <div className={cn('u-agb', className)}>
      <Alert variant="info" icon={<FileBadge />} title="Aturan dan kebijakan tanpa SK tetap berlaku">
        Sesuai keputusan pimpinan, aturan atau kebijakan yang belum punya SK dasar tidak diblokir, hanya diberi peringatan. Lampirkan SK dari Registri SK agar dasar hukumnya tercatat dan
        bisa ditelusuri.
      </Alert>
      {perUnit && (
        <section className="u-agb-bagian" aria-label="Jumlah per unit">
          <h3>Per unit pemilik</h3>
          <DataTable
            rows={perUnit}
            rowKey={(r) => r.unit?.kode ?? '-'}
            columnToggle={false}
            densityToggle={false}
            pagination={false}
            onRowClick={(r) => setPilihUnit(r.unit?.kode === pilihUnit ? null : (r.unit?.kode ?? null))}
            empty={{ icon: <CircleCheck />, title: 'Semua unit sudah melampirkan SK', description: 'Tidak ada aturan atau kebijakan berlaku yang belum ber-SK.' }}
            columns={[
              {
                key: 'unit',
                header: 'Unit',
                mobile: 'title',
                value: (r) => namaUnit(r.unit),
                cell: (r) => (
                  <span className="u-agb-unit" data-pilih={r.unit?.kode === pilihUnit || undefined}>
                    <strong>{namaUnit(r.unit)}</strong>
                    {r.unit?.singkatan && r.unit.nama !== r.unit.singkatan && <span>{r.unit.nama}</span>}
                  </span>
                ),
              },
              { key: 'aturan', header: 'Aturan', align: 'end', mobile: 'meta', value: (r) => r.aturan },
              { key: 'kebijakan', header: 'Kebijakan unit', align: 'end', mobile: 'meta', value: (r) => r.kebijakan },
              { key: 'jumlah', header: 'Perlu SK', align: 'end', mobile: 'badge', value: (r) => r.jumlah, cell: (r) => <Badge variant="warning">{r.jumlah}</Badge> },
            ]}
          />
          {pilihUnit && (
            <p className="u-agb-saring">
              Menampilkan unit {namaUnit(perUnit.find((u) => u.unit?.kode === pilihUnit)?.unit)}.{' '}
              <Button size="sm" variant="ghost" onClick={() => setPilihUnit(null)}>
                Tampilkan semua unit
              </Button>
            </p>
          )}
        </section>
      )}
      <SegmentedControl
        value={tab}
        onValueChange={(v) => setTab(v as 'kebijakan' | 'aturan')}
        options={[
          { value: 'kebijakan', label: `Kebijakan unit${d ? ` (${d.jumlah.kebijakan})` : ''}` },
          { value: 'aturan', label: `Aturan${d ? ` (${d.jumlah.aturan})` : ''}` },
        ]}
      />
      {tab === 'kebijakan' ? (
        <DataTable
          rows={d?.kebijakan}
          loading={q.loading}
          rowKey={(r) => `${r.jenis}#${r.baris}`}
          exportCsv={`perlu-sk-kebijakan${kode ? `-${kode.toLowerCase()}` : ''}`}
          empty={{ icon: <CircleCheck />, title: 'Semua kebijakan unit sudah ber-SK', description: 'Kunci fitur, kwitansi, syarat keuangan, biaya PMB, kuesioner, dan aturan berversi lainnya sudah punya SK dasar.' }}
          rowActions={(r) => [
            { label: 'Lampirkan SK', icon: <FileBadge />, onSelect: () => setLampir(r) },
            ...(r.kelola.url ? [{ label: `Buka ${r.kelola.menu ?? 'tempat kelola'}`, icon: <ExternalLink />, href: r.kelola.url }] : []),
          ]}
          columns={[
            { key: 'nama', header: 'Kebijakan', mobile: 'title', value: (r) => r.nama, cell: (r) => <span className="u-agb-nama"><strong>{r.nama}</strong><span>{r.jenis_judul}</span></span> },
            { key: 'unit', header: 'Unit', mobile: 'subtitle', value: (r) => namaUnit(r.unit) },
            { key: 'status_sk', header: 'SK dasar', shrink: true, mobile: 'badge', value: (r) => r.label_sk, cell: (r) => <LencanaSkKebijakan status={r.status_sk} label={r.label_sk} /> },
            { key: 'validasi', header: 'Validasi', shrink: true, mobile: 'meta', value: (r) => r.label_validasi, cell: (r) => <LencanaValidasiKebijakan status={r.validasi} label={r.label_validasi} /> },
          ]}
        />
      ) : (
        <DataTable
          rows={d?.aturan}
          loading={q.loading}
          rowKey={(r) => r.id}
          exportCsv={`perlu-sk-aturan${kode ? `-${kode.toLowerCase()}` : ''}`}
          empty={{ icon: <CircleCheck />, title: 'Semua aturan aktif sudah berdasar SK' }}
          rowActions={(r) => [
            { label: 'Lampirkan SK dasar', icon: <FileBadge />, onSelect: () => setLampirAturan(r) },
            ...(r.tautan ? [{ label: 'Buka di layar aturan unit', icon: <ExternalLink />, href: r.tautan }] : []),
          ]}
          columns={[
            { key: 'nama', header: 'Aturan', mobile: 'title', value: (r) => r.nama, cell: (r) => <span className="u-agb-nama"><strong>{r.nama}</strong><span>{r.titik_judul}</span></span> },
            { key: 'kategori', header: 'Kategori', mobile: 'meta', value: (r) => labelKategoriAturan(r.kategori) },
            { key: 'unit', header: 'Unit', mobile: 'subtitle', value: (r) => namaUnit(r.unit) },
            {
              key: 'status_sk',
              header: 'SK dasar',
              shrink: true,
              mobile: 'badge',
              value: (r) => (r.status_sk === 'belum' ? 'Belum ada SK' : 'SK tidak berlaku'),
              cell: (r) => <LencanaSkKebijakan status={r.status_sk} label={r.status_sk === 'belum' ? 'Belum ada SK' : 'SK tidak berlaku'} />,
            },
          ]}
        />
      )}
      <PanelLampirSkKebijakan kebijakan={lampir} open={lampir !== null} onOpenChange={(o) => !o && setLampir(null)} />
      {lampirAturan && <PanelLampirSkDasar aturan={[lampirAturan.id]} judul={lampirAturan.nama} open onOpenChange={(o) => !o && (setLampirAturan(null), invalidateSiakad('aturan'))} />}
    </div>
  );
}

/** Ringkas "Perlu SK" untuk beranda/kepala layar unit: jumlah dan tombol ke daftar kerja. Diam bila nol. */
export function PengingatPerluSk({ unit, onBuka, href, className }: { unit?: string; onBuka?: () => void; href?: string; className?: string }) {
  const q = usePerluSk(unit);
  const n = q.data?.jumlah.total ?? 0;
  if (!n) return null;
  return (
    <Alert
      variant="warning"
      icon={<TriangleAlert />}
      className={className}
      title={`${n} aturan dan kebijakan belum punya SK dasar`}
      actions={
        href ? (
          <Button size="sm" render={<a href={href} />}>
            Lihat daftar
          </Button>
        ) : onBuka ? (
          <Button size="sm" onClick={onBuka}>
            Lihat daftar
          </Button>
        ) : undefined
      }
    >
      {q.data!.jumlah.aturan} aturan dan {q.data!.jumlah.kebijakan} kebijakan unit tetap berlaku dengan peringatan sampai SK-nya dilampirkan.
    </Alert>
  );
}

// ================================================================ Antrean validator

/** Kebijakan yang menunggu validasi saya (GET /v1/aturan/kebijakan/antrean) dan panel keputusannya. */
export function AntreanValidasiKebijakan({ className }: { className?: string }) {
  const q = useAntreanKebijakan();
  const [buka, setBuka] = React.useState<KebijakanGerbang | null>(null);
  if (q.error && belumAda(q.error)) return <Alert className={className}>Server SIAKAD ini belum mendukung validasi kebijakan unit.</Alert>;
  return (
    <div className={cn('u-agb', className)}>
      <DataTable
        rows={q.data}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
        rowKey={(r) => r.id ?? `${r.jenis}#${r.baris}`}
        onRowClick={setBuka}
        columnToggle={false}
        empty={{ icon: <Inbox />, title: 'Tidak ada kebijakan yang menunggu validasi Anda', description: 'Kebijakan unit yang diterbitkan atau diubah akan muncul di sini bila Anda validator tahapnya.' }}
        rowActions={(r) => [{ label: 'Periksa dan putuskan', icon: <ShieldCheck />, onSelect: () => setBuka(r) }]}
        columns={[
          { key: 'nama', header: 'Kebijakan', mobile: 'title', value: (r) => r.nama, cell: (r) => <span className="u-agb-nama"><strong>{r.nama}</strong><span>{r.jenis_judul}</span></span> },
          { key: 'unit', header: 'Unit pengaju', mobile: 'subtitle', value: (r) => namaUnit(r.unit) },
          { key: 'status_sk', header: 'SK dasar', shrink: true, mobile: 'badge', value: (r) => r.label_sk, cell: (r) => <LencanaSkKebijakan status={r.status_sk} label={r.label_sk} /> },
          { key: 'diubah_at', header: 'Diajukan', shrink: true, mobile: 'meta', value: (r) => r.diubah_at ?? '' },
        ]}
      />
      <PanelPutusKebijakan kebijakan={buka} onOpenChange={(o) => !o && setBuka(null)} />
    </div>
  );
}

function PanelPutusKebijakan({ kebijakan, onOpenChange }: { kebijakan: KebijakanGerbang | null; onOpenChange: (o: boolean) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [catatan, setCatatan] = React.useState('');
  const [kirim, setKirim] = React.useState<null | 'setujui' | 'kembalikan' | 'tolak'>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const id = kebijakan?.id ?? null;
  const tahap = useSiakadQuery<TahapPemeriksa[]>(['aturan', 'kebijakan', 'tahap', id ?? ''], (s, signal) => s.request<TahapPemeriksa[]>({ method: 'GET', path: `/v1/aturan/kebijakan/${id}/tahap` }, { signal }), {
    enabled: Boolean(id),
  });
  React.useEffect(() => {
    setCatatan('');
    setGalat(null);
  }, [id]);
  const putus = async (keputusan: 'setujui' | 'kembalikan' | 'tolak') => {
    if (!id) return;
    if (keputusan !== 'setujui' && catatan.trim().length < 5) {
      setGalat('Tulis alasan (minimal 5 karakter) sebelum mengembalikan atau menolak.');
      return;
    }
    setKirim(keputusan);
    setGalat(null);
    try {
      await siakad.request({ method: 'POST', path: `/v1/aturan/kebijakan/${id}/putus`, body: { keputusan, catatan: catatan.trim() || null } });
      invalidateSiakad('aturan');
      toast.add({ title: keputusan === 'setujui' ? 'Kebijakan divalidasi' : keputusan === 'kembalikan' ? 'Kebijakan dikembalikan ke pemilik' : 'Kebijakan ditolak', type: 'success' });
      onOpenChange(false);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setKirim(null);
    }
  };
  return (
    <Dialog
      open={kebijakan !== null}
      onOpenChange={onOpenChange}
      side="right"
      size="lg"
      title={kebijakan?.nama ?? 'Validasi kebijakan'}
      description={kebijakan ? `${kebijakan.jenis_judul} · ${namaUnit(kebijakan.unit)}` : undefined}
      footer={
        kebijakan ? (
          <>
            <Button variant="destructive-soft" loading={kirim === 'tolak'} disabled={kirim !== null} onClick={() => void putus('tolak')}>
              <Ban /> Tolak
            </Button>
            <Button variant="outline" loading={kirim === 'kembalikan'} disabled={kirim !== null} onClick={() => void putus('kembalikan')}>
              <Undo2 /> Kembalikan
            </Button>
            <Button loading={kirim === 'setujui'} disabled={kirim !== null} onClick={() => void putus('setujui')}>
              <CircleCheck /> Setujui
            </Button>
          </>
        ) : undefined
      }
    >
      {kebijakan && (
        <div className="u-agb-panel">
          <DescriptionList
            items={[
              { label: 'Jenis kebijakan', value: kebijakan.jenis_judul },
              { label: 'Unit pengaju', value: kebijakan.unit?.nama ?? '–' },
              { label: 'SK dasar', value: kebijakan.sk ? `${kebijakan.sk.nomor}${kebijakan.sk.perihal ? ` · ${kebijakan.sk.perihal}` : ''}` : <LencanaSkKebijakan status={kebijakan.status_sk} /> },
              { label: 'Diterbitkan/diubah oleh', value: `${kebijakan.diubah_oleh ?? '–'}${kebijakan.diubah_at ? ` · ${kebijakan.diubah_at}` : ''}` },
              ...(kebijakan.kelola.url
                ? [
                    {
                      label: 'Isi kebijakan',
                      value: (
                        <a href={kebijakan.kelola.url} target="_blank" rel="noreferrer">
                          {kebijakan.kelola.menu} <ExternalLink aria-hidden className="u-agb-ikon-kecil" />
                        </a>
                      ),
                    },
                  ]
                : []),
            ]}
          />
          {kebijakan.peringatan.map((p) => (
            <Alert key={p.kode} variant="warning">
              {p.pesan}
            </Alert>
          ))}
          <p className="u-agb-sub">Kebijakan ini sudah berlaku. Mengembalikan atau menolak tidak mencabutnya; pemilik dikabari untuk mengubah atau mencabutnya.</p>
          {tahap.data ? <AlurPemeriksa pemeriksa={tahap.data} judul="Tahap validasi" /> : tahap.loading ? <Skeleton height={96} /> : null}
          <Field label="Catatan" description="Wajib bila mengembalikan atau menolak; dikirim ke pemilik kebijakan.">
            <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={3} maxLength={2000} />
          </Field>
          {galat && <Alert variant="danger">{galat}</Alert>}
        </div>
      )}
    </Dialog>
  );
}
