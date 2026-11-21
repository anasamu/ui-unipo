'use client';
import * as React from 'react';
import { BadgeCheck, Ban, CalendarClock, CircleCheck, CircleX, ClipboardCheck, Eye, FileText, Hourglass, Plus, Settings2, ShieldCheck, Trash2, Undo2, Wallet } from 'lucide-react';
import { Badge, Button } from '../components/actions';
import { Alert, Card, DescriptionList, Empty, Tabs } from '../components/display';
import { DataTable } from '../components/data-table';
import { FilterBar, type FilterValues } from '../components/filter';
import { Field, Input, RadioGroup, Switch, Textarea } from '../components/forms';
import { Select } from '../components/select';
import { ConfirmDialog, Sheet, useToast } from '../components/overlays';
import { PanelLangkah } from '../components/panel-langkah';
import { WizardReview } from '../components/wizard';
import { StatCard, StatGrid } from '../components/charts';
import { formatDate, formatRupiah } from '../lib/format';
import { useUnggahBerkas } from './berkas';
import { useProdiOptions, useTahunOptions } from './filter-presets';
import { AlurPemeriksa, LabelPemeriksa, PratinjauPemeriksa, type TahapPemeriksa } from './pemeriksa';
import { invalidateSiakad, pesanGalat, useSaatInvalidasi, useSiakad, useSiakadQuery } from './provider';
import { IsianTanggal } from '../components/formulir';

/*
 * Validasi syarat keuangan (SIAKAD /v1/syarat-keuangan, docs/VALIDASI_SYARAT_KEUANGAN.md di siakad_unipo).
 *
 * Unit pemilik biaya (BAUK, BAAK, PMB, fakultas) memvalidasi manual syarat keuangan mahasiswa yang belum terpenuhi
 * (bayar di luar sistem, transfer belum tercatat; bukti wajib), memberi dispensasi sampai tanggal tertentu, atau
 * mencabutnya. Server hanya menampilkan dan mengizinkan biaya milik unit pengguna (izin keuangan.syarat.*).
 * Semua formulir di panel samping; validasi/dispensasi memakai PanelLangkah.
 */

// ---------------------------------------------------------------- tipe
export interface ButirSyaratKeuangan {
  kode_biaya: string;
  nama: string;
  tahun_id: string | null;
  tagihan: number | null;
  bayar: number | null;
  sisa: number | null;
  persen: number;
  minimal: number;
  terpenuhi: boolean;
  unit_id: number | null;
  unit: string;
  unit_kode: string;
}
export interface PenandaValidasiSyarat {
  syarat: string;
  judul: string;
  jenis: 'validasi' | 'dispensasi';
  label: string;
  berlaku_sampai: string | null;
  unit?: string[];
  oleh?: string | null;
  oleh_nama?: string | null;
  waktu?: string | null;
}
export interface AntreanSyaratKeuangan {
  kunci: string;
  subjek_jenis: 'mahasiswa' | 'pendaftar';
  subjek: string;
  nim: string;
  nama: string;
  kode_prodi: string;
  nama_prodi: string;
  angkatan: string;
  tahun_id: string | null;
  syarat: string;
  syarat_judul: string;
  butir: ButirSyaratKeuangan[];
  sisa: number;
  unit: string[];
  status: 'belum' | 'sebagian' | 'diusulkan' | 'divalidasi' | 'dispensasi';
  status_label: string;
  penanda: PenandaValidasiSyarat | null;
  usulan: number;
  boleh: { validasi: boolean };
}
export interface ValidasiSyaratKeuanganRow {
  id: string;
  subjek_jenis: 'mahasiswa' | 'pendaftar';
  subjek: string;
  nama: string | null;
  tahun_id: string | null;
  syarat: string;
  syarat_judul: string;
  kode_biaya: string | null;
  nama_biaya: string | null;
  unit: string;
  jenis: 'validasi' | 'dispensasi';
  jenis_label: string;
  status: 'diusulkan' | 'aktif' | 'ditolak' | 'dicabut' | 'dibatalkan' | 'kedaluwarsa';
  status_label: string;
  berlaku_sampai: string | null;
  janji_bayar: Array<{ tanggal: string; jumlah: number }> | null;
  alasan: string;
  bukti_berkas?: string | null;
  bukti_keterangan: string | null;
  jumlah: number | null;
  diusulkan_oleh: string | null;
  diusulkan_nama: string | null;
  diusulkan_at: string | null;
  diputus_nama: string | null;
  diputus_at: string | null;
  catatan_putus: string | null;
  dicabut_oleh: string | null;
  dicabut_at: string | null;
  alasan_cabut: string | null;
  pemeriksa: TahapPemeriksa[];
  pemeriksa_label: string | null;
  boleh?: { setujui: boolean; cabut: boolean; batal: boolean };
  log?: Array<{ aksi: string; oleh: string; catatan: string | null; waktu: string }>;
}
interface KatalogSyaratKeuangan {
  syarat: Array<{ kode: string; judul: string; subjek: 'mahasiswa' | 'pendaftar'; keterangan: string | null; unit_tetap: string | null }>;
  fitur: Array<{ titik: string; judul: string; syarat: string[] }>;
  tahun_aktif: string;
  hak: { izin: Record<string, unknown>; unit: Array<{ id: number; kode: string; nama: string }>; boleh: { lihat: boolean; validasi: boolean; setujui: boolean; semua_unit: boolean } };
  pengaturan: PengaturanSyaratKeuangan[];
  ujian_wajib_bayar: boolean;
}
interface PengaturanSyaratKeuangan {
  unit_id: number | null;
  unit: string;
  unit_kode: string;
  wajib_persetujuan: boolean;
  wajib_bukti: boolean;
  maks_hari_dispensasi: number | null;
  diubah_oleh: string | null;
  updated_at: string | null;
  boleh_ubah: boolean;
}
interface SyaratSubjek {
  syarat: string;
  judul: string;
  keterangan: string | null;
  terpenuhi_sistem: boolean | null;
  terpenuhi: boolean;
  penanda: PenandaValidasiSyarat | null;
  butir: ButirSyaratKeuangan[];
  butir_kurang: number;
  boleh_validasi?: boolean;
  fitur?: string[];
  pemeriksa?: string[];
}
interface RincianSubjek {
  subjek_jenis: 'mahasiswa' | 'pendaftar';
  subjek: string;
  identitas: { nim: string; nama: string; kode_prodi: string; nama_prodi: string; angkatan: string; status_aktif: string };
  tahun_id: string;
  syarat: SyaratSubjek[];
  tagihan: { periode: Array<{ tahun_id: string; tagihan: number; bayar: number; sisa: number }>; tunggakan: number } | null;
  riwayat: ValidasiSyaratKeuanganRow[];
}

const STATUS_VARIAN: Record<string, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  belum: 'danger',
  sebagian: 'warning',
  diusulkan: 'warning',
  divalidasi: 'success',
  dispensasi: 'info',
  aktif: 'success',
  ditolak: 'danger',
  dicabut: 'neutral',
  dibatalkan: 'neutral',
  kedaluwarsa: 'neutral',
};

const rp = (n: number | null | undefined) => (n == null ? '-' : formatRupiah(n));
const tgl = (t: string | null | undefined) => (t ? formatDate(t, 'medium') : '-');
const hariIni = () => new Date().toISOString().slice(0, 10);

function useKatalogSyarat() {
  return useSiakadQuery<KatalogSyaratKeuangan>(['syarat-keuangan', 'katalog'], (s, signal) => s.request<KatalogSyaratKeuangan>({ method: 'GET', path: '/v1/syarat-keuangan/katalog' }, { signal }), {
    staleTime: 60_000,
  });
}

// ---------------------------------------------------------------- halaman unit
export interface ValidasiSyaratKeuanganProps {
  /** Nama unit untuk teks (mis. "BAUK", "BAAK", "PMB", "Fakultas"). Data tetap dibatasi izin unit di server. */
  namaUnit?: string;
  /** Saringan fitur awal (titik aturan, mis. "ujian.uas"). */
  fiturAwal?: string;
  /** Kode syarat yang ditampilkan di saringan (mis. hanya syarat pendaftar untuk PMB). Kosong = semua. */
  syarat?: string[];
}

/**
 * Halaman "Validasi syarat" aplikasi unit: antrean mahasiswa yang syarat keuangannya belum terpenuhi untuk biaya milik
 * unit (saring periode, fitur/syarat, prodi, angkatan, status), rincian mahasiswa di panel samping, validasi/dispensasi
 * per mahasiswa atau massal (PanelLangkah), menunggu persetujuan, riwayat, dan pengaturan alur unit.
 */
export function ValidasiSyaratKeuangan({ namaUnit = 'unit Anda', fiturAwal, syarat }: ValidasiSyaratKeuanganProps) {
  const k = useKatalogSyarat();
  const [tab, setTab] = React.useState<'antrean' | 'persetujuan' | 'riwayat' | 'pengaturan'>('antrean');
  const usulan = useSiakadQuery<ValidasiSyaratKeuanganRow[]>(
    ['syarat-keuangan', 'daftar', 'diusulkan'],
    (s, signal) => s.request<ValidasiSyaratKeuanganRow[]>({ method: 'GET', path: '/v1/syarat-keuangan', query: { status: 'diusulkan', per_page: 200 } }, { signal }),
    { enabled: Boolean(k.data?.hak.boleh.setujui) },
  );
  useSaatInvalidasi('syarat-keuangan', usulan.refetch);
  const status = (k.error as { status?: number } | null)?.status;
  if (status === 403 || (k.data && !k.data.hak.boleh.lihat))
    return (
      <Alert variant="warning" title="Akun Anda belum ditugaskan memeriksa syarat keuangan">
        Validasi syarat untuk biaya milik {namaUnit} butuh izin <code>keuangan.syarat.lihat</code> / <code>keuangan.syarat.validasi</code> berlingkup unit itu (mis. peran Bendahara penerimaan unit,
        Kepala unit, atau Staf BAUK). Minta Pustikom memberi peran di unit Anda.
      </Alert>
    );
  if (k.error) return <Alert variant="danger" title="Katalog syarat keuangan belum bisa dimuat">{pesanGalat(k.error)}</Alert>;
  const hak = k.data?.hak;
  const jumlahUsulan = (usulan.data ?? []).filter((r) => r.boleh?.setujui).length;
  return (
    <div className="u-syk">
      {hak && hak.unit.length > 0 && !hak.boleh.semua_unit ? (
        <p className="u-syk-redup">
          Biaya milik: {hak.unit.map((u) => u.nama).join(', ')}
        </p>
      ) : null}
      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'antrean', label: 'Antrean syarat', icon: <ClipboardCheck /> },
          ...(hak?.boleh.setujui ? [{ value: 'persetujuan' as const, label: 'Menunggu persetujuan', icon: <Hourglass />, count: jumlahUsulan }] : []),
          { value: 'riwayat', label: 'Riwayat', icon: <FileText /> },
          ...(hak?.boleh.setujui ? [{ value: 'pengaturan' as const, label: 'Alur unit', icon: <Settings2 /> }] : []),
        ]}
      />
      <div className="u-syk-isi">
        {tab === 'antrean' && k.data ? <AntreanSyarat katalog={k.data} fiturAwal={fiturAwal} hanyaSyarat={syarat} /> : null}
        {tab === 'persetujuan' ? <DaftarValidasi status="diusulkan" kosong="Tidak ada usulan yang menunggu persetujuan Anda." /> : null}
        {tab === 'riwayat' ? <DaftarValidasi status="semua" kosong="Belum ada validasi atau dispensasi." /> : null}
        {tab === 'pengaturan' && k.data ? <PengaturanAlur pengaturan={k.data.pengaturan} /> : null}
      </div>
    </div>
  );
}

function AntreanSyarat({ katalog, fiturAwal, hanyaSyarat }: { katalog: KatalogSyaratKeuangan; fiturAwal?: string; hanyaSyarat?: string[] }) {
  const tahunOpsi = useTahunOptions();
  const prodiOpsi = useProdiOptions();
  const syaratOpsi = katalog.syarat.filter((s) => !hanyaSyarat?.length || hanyaSyarat.includes(s.kode));
  const [f, setF] = React.useState<FilterValues>({ tahun_id: katalog.tahun_aktif, status: 'belum', fitur: fiturAwal });
  const [pilih, setPilih] = React.useState<string[]>([]);
  const [rinci, setRinci] = React.useState<AntreanSyaratKeuangan | null>(null);
  const [form, setForm] = React.useState<{ baris: AntreanSyaratKeuangan[]; jenis: 'validasi' | 'dispensasi' } | null>(null);
  const syaratQ = (f.syarat as string | undefined) || (f.fitur ? undefined : syaratOpsi.map((s) => s.kode).join(','));
  const q = useSiakadQuery<AntreanSyaratKeuangan[]>(['syarat-keuangan', 'antrean', f, syaratQ ?? ''], (s, signal) =>
    s.request<AntreanSyaratKeuangan[]>(
      {
        method: 'GET',
        path: '/v1/syarat-keuangan/antrean',
        query: {
          tahun_id: (f.tahun_id as string) || undefined,
          syarat: syaratQ,
          fitur: (f.fitur as string) || undefined,
          prodi: Array.isArray(f.prodi) && f.prodi.length ? (f.prodi as string[]).join(',') : undefined,
          angkatan: (f.angkatan as string) || undefined,
          status: (f.status as string) || 'semua',
          q: (f.q as string) || undefined,
          per_page: 1000,
        },
      },
      { signal },
    ),
  );
  useSaatInvalidasi('syarat-keuangan', q.refetch);
  const baris = q.data ?? [];
  const meta = q.meta as unknown as { total_sisa?: number; total?: number } | undefined;
  const terpilih = baris.filter((b) => pilih.includes(b.kunci));
  const tahun = (f.tahun_id as string) || katalog.tahun_aktif;
  const ringkas = React.useMemo(() => {
    const n = (st: string) => baris.filter((b) => b.status === st).length;
    return { belum: n('belum') + n('sebagian'), usul: n('diusulkan'), valid: n('divalidasi'), disp: n('dispensasi') };
  }, [baris]);

  return (
    <div className="u-syk-antrean">
      {!katalog.ujian_wajib_bayar && (f.fitur as string | undefined)?.startsWith('ujian') ? (
        <Alert variant="info" title="Periode berjalan tidak mewajibkan bayar untuk cetak kartu ujian">
          Pengaturan periode (cetak kartu ujian wajib bayar) sedang tidak aktif, jadi syarat bayar ujian dianggap terpenuhi oleh sistem.
        </Alert>
      ) : null}
      <StatGrid min={170}>
        <StatCard label="Belum terpenuhi" value={ringkas.belum} icon={<CircleX />} tone="danger" loading={q.loading} />
        <StatCard label="Menunggu persetujuan" value={ringkas.usul} icon={<Hourglass />} tone="warning" loading={q.loading} />
        <StatCard label="Divalidasi manual" value={ringkas.valid} icon={<BadgeCheck />} tone="success" loading={q.loading} />
        <StatCard label="Dispensasi" value={ringkas.disp} icon={<CalendarClock />} tone="info" loading={q.loading} hint={meta?.total_sisa ? `Sisa tagihan ${rp(meta.total_sisa)}` : undefined} />
      </StatGrid>
      <DataTable
        rows={baris}
        rowKey={(b) => b.kunci}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
        selectable
        selected={pilih}
        onSelectedChange={setPilih}
        exportCsv={`syarat-keuangan-${tahun}`}
        defaultDensity="compact"
        onRowClick={setRinci}
        filtered={Boolean(f.q || f.prodi || f.angkatan || f.syarat || f.fitur)}
        emptyFiltered={{ onReset: () => setF({ tahun_id: katalog.tahun_aktif, status: 'belum' }) }}
        empty={{ icon: <CircleCheck />, title: 'Tidak ada syarat yang perlu ditangani', description: 'Semua mahasiswa sudah memenuhi syarat keuangan untuk biaya milik unit Anda pada saringan ini.' }}
        toolbar={
          <FilterBar
            value={f}
            onValueChange={(v) => {
              setF(v);
              setPilih([]);
            }}
            resultCount={meta?.total ?? baris.length}
            resultLabel="syarat"
            search={{ placeholder: 'Cari NIM atau nama' }}
            fields={[
              { key: 'tahun_id', label: 'Periode', type: 'select', options: tahunOpsi },
              { key: 'fitur', label: 'Fitur', type: 'select', options: katalog.fitur.map((x) => ({ value: x.titik, label: x.judul })) },
              { key: 'syarat', label: 'Syarat', type: 'select', options: syaratOpsi.map((s) => ({ value: s.kode, label: s.judul })) },
              { key: 'prodi', label: 'Prodi', type: 'multi', options: prodiOpsi, searchable: true },
              { key: 'angkatan', label: 'Angkatan', type: 'select', options: Array.from({ length: 8 }, (_, i) => String(new Date().getFullYear() - i)).map((y) => ({ value: y, label: y })) },
              {
                key: 'status',
                label: 'Status',
                type: 'select',
                options: [
                  { value: 'belum', label: 'Belum terpenuhi' },
                  { value: 'sebagian', label: 'Sebagian divalidasi' },
                  { value: 'diusulkan', label: 'Menunggu persetujuan' },
                  { value: 'divalidasi', label: 'Divalidasi manual' },
                  { value: 'dispensasi', label: 'Dispensasi' },
                  { value: 'semua', label: 'Semua' },
                ],
              },
            ]}
          />
        }
        bulkActions={(keys, clear) => {
          const rows = baris.filter((b) => keys.includes(b.kunci) && b.boleh.validasi);
          return (
            <>
              <Button size="sm" disabled={!rows.length} onClick={() => setForm({ baris: rows, jenis: 'validasi' })}>
                <BadgeCheck /> Validasi ({rows.length})
              </Button>
              <Button size="sm" variant="outline" disabled={!rows.length} onClick={() => setForm({ baris: rows, jenis: 'dispensasi' })}>
                <CalendarClock /> Dispensasi ({rows.length})
              </Button>
              <Button size="sm" variant="ghost" onClick={clear}>
                Batal pilih
              </Button>
            </>
          );
        }}
        rowActions={(b) => [
          { label: 'Lihat rincian', icon: <Eye />, onSelect: () => setRinci(b) },
          { label: 'Validasi manual', icon: <BadgeCheck />, disabled: !b.boleh.validasi || b.status === 'divalidasi', onSelect: () => setForm({ baris: [b], jenis: 'validasi' }) },
          { label: 'Beri dispensasi', icon: <CalendarClock />, disabled: !b.boleh.validasi || b.status === 'dispensasi', onSelect: () => setForm({ baris: [b], jenis: 'dispensasi' }) },
        ]}
        columns={[
          {
            key: 'nama',
            header: 'Mahasiswa',
            value: (b) => `${b.nim} ${b.nama}`,
            mobile: 'title',
            cell: (b) => (
              <span className="u-syk-mhs">
                <strong>{b.nama}</strong>
                <span className="u-syk-redup">
                  {b.nim}
                  {b.nama_prodi ? ` · ${b.nama_prodi}` : ''}
                  {b.angkatan ? ` · ${b.angkatan.slice(0, 4)}` : ''}
                </span>
              </span>
            ),
          },
          { key: 'syarat', header: 'Syarat', value: (b) => b.syarat_judul, cell: (b) => b.syarat_judul },
          {
            key: 'butir',
            header: 'Biaya belum memenuhi',
            value: (b) => b.butir.map((x) => `${x.nama} (${x.unit_kode})`).join('; '),
            cell: (b) =>
              b.butir.length ? (
                <ul className="u-syk-butir">
                  {b.butir.map((x) => (
                    <li key={`${x.kode_biaya}-${x.tahun_id}`}>
                      {x.nama}
                      {x.tahun_id && x.tahun_id !== tahun ? ` ${x.tahun_id}` : ''} <span className="u-syk-redup">{x.persen}%/{x.minimal}% · {x.unit_kode}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="u-syk-redup">Sudah lunas</span>
              ),
          },
          { key: 'sisa', header: 'Sisa', align: 'end', value: (b) => b.sisa, cell: (b) => rp(b.sisa) },
          {
            key: 'status',
            header: 'Status',
            shrink: true,
            mobile: 'badge',
            value: (b) => b.penanda?.label ?? b.status_label,
            cell: (b) => (
              <span className="u-syk-status">
                <Badge variant={STATUS_VARIAN[b.status]}>{b.status_label}</Badge>
                {b.penanda ? <small>{b.penanda.label}</small> : null}
              </span>
            ),
          },
        ]}
      />
      {terpilih.length > 0 && terpilih.some((b) => !b.boleh.validasi) ? (
        <p className="u-syk-redup">Sebagian baris terpilih bukan biaya milik unit Anda dan tidak ikut divalidasi.</p>
      ) : null}
      <Sheet open={rinci != null} onOpenChange={(o) => !o && setRinci(null)} title={rinci ? `${rinci.nama} (${rinci.nim})` : 'Rincian'} description="Syarat keuangan, tagihan, dan riwayat validasi" size="lg">
        {rinci ? (
          <RincianSyaratKeuangan
            jenis={rinci.subjek_jenis}
            subjek={rinci.subjek}
            tahunId={rinci.tahun_id ?? tahun}
            onAksi={(syaratKode, jenis, butir) => {
              const s = katalog.syarat.find((x) => x.kode === syaratKode);
              setForm({ baris: [{ ...rinci, syarat: syaratKode, syarat_judul: s?.judul ?? syaratKode, butir, sisa: butir.reduce((n, b) => n + (b.sisa ?? 0), 0) }], jenis });
            }}
          />
        ) : null}
      </Sheet>
      {form ? (
        <PanelValidasiSyarat
          baris={form.baris}
          jenisAwal={form.jenis}
          pengaturan={katalog.pengaturan}
          onTutup={() => setForm(null)}
          onSelesai={() => {
            setPilih([]);
            invalidateSiakad('syarat-keuangan');
          }}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- rincian mahasiswa
export interface RincianSyaratKeuanganProps {
  jenis: 'mahasiswa' | 'pendaftar';
  subjek: string;
  tahunId?: string | null;
  /** Tombol aksi per syarat (validasi/dispensasi); kosong = hanya baca. */
  onAksi?: (syarat: string, jenis: 'validasi' | 'dispensasi', butirKurang: ButirSyaratKeuangan[]) => void;
}

/** Rincian syarat keuangan satu mahasiswa: status per syarat, butir biaya, tagihan per periode, riwayat validasi. */
export function RincianSyaratKeuangan({ jenis, subjek, tahunId, onAksi }: RincianSyaratKeuanganProps) {
  const q = useSiakadQuery<RincianSubjek>(['syarat-keuangan', 'rincian', jenis, subjek, tahunId ?? ''], (s, signal) =>
    s.request<RincianSubjek>({ method: 'GET', path: `/v1/syarat-keuangan/subjek/${jenis}/${encodeURIComponent(subjek)}`, query: { tahun_id: tahunId ?? undefined } }, { signal }),
  );
  useSaatInvalidasi('syarat-keuangan', q.refetch);
  if (q.error) return <Alert variant="danger">{pesanGalat(q.error)}</Alert>;
  const d = q.data;
  if (!d) return <p className="u-syk-redup">Memuat…</p>;
  return (
    <div className="u-syk-rinci">
      <DescriptionList
        items={[
          { label: jenis === 'mahasiswa' ? 'NIM' : 'No. pendaftar', value: d.identitas.nim },
          ...(d.identitas.nama_prodi ? [{ label: 'Program studi', value: d.identitas.nama_prodi }] : []),
          ...(d.identitas.angkatan ? [{ label: 'Angkatan', value: d.identitas.angkatan }] : []),
          { label: 'Periode', value: d.tahun_id },
          ...(d.tagihan ? [{ label: 'Tunggakan semua periode', value: rp(d.tagihan.tunggakan) }] : []),
        ]}
      />
      <h4 className="u-syk-sub">Syarat keuangan</h4>
      <KartuSyarat syarat={d.syarat} onAksi={onAksi} />
      {d.tagihan && d.tagihan.periode.length ? (
        <>
          <h4 className="u-syk-sub">Tagihan per periode</h4>
          <table className="u-syk-tabel">
            <thead>
              <tr>
                <th>Periode</th>
                <th>Tagihan</th>
                <th>Dibayar</th>
                <th>Sisa</th>
              </tr>
            </thead>
            <tbody>
              {d.tagihan.periode.map((p) => (
                <tr key={p.tahun_id}>
                  <td>{p.tahun_id}</td>
                  <td>{rp(p.tagihan)}</td>
                  <td>{rp(p.bayar)}</td>
                  <td data-kurang={p.sisa > 0 ? '' : undefined}>{rp(p.sisa)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
      <h4 className="u-syk-sub">Riwayat validasi</h4>
      {d.riwayat.length ? (
        <ul className="u-syk-riwayat">
          {d.riwayat.map((r) => (
            <li key={r.id}>
              <KartuValidasi r={r} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="u-syk-redup">Belum ada validasi atau dispensasi.</p>
      )}
    </div>
  );
}

function KartuSyarat({ syarat, onAksi, saya }: { syarat: SyaratSubjek[]; onAksi?: (syarat: string, jenis: 'validasi' | 'dispensasi', butirKurang: ButirSyaratKeuangan[]) => void; saya?: boolean }) {
  return (
    <ul className="u-syk-syarat">
      {syarat.map((s) => {
        const kurang = s.butir.filter((b) => !b.terpenuhi);
        return (
          <li key={s.syarat} data-terpenuhi={s.terpenuhi ? '' : undefined}>
            <div className="u-syk-syarat-kepala">
              {s.terpenuhi ? <CircleCheck /> : <CircleX />}
              <strong>{s.judul}</strong>
              <Badge variant={s.penanda ? (s.penanda.jenis === 'dispensasi' ? 'info' : 'success') : s.terpenuhi ? 'success' : s.terpenuhi_sistem === null ? 'neutral' : 'danger'}>
                {s.penanda ? (s.penanda.jenis === 'dispensasi' ? 'Dispensasi' : 'Divalidasi manual') : s.terpenuhi ? 'Terpenuhi' : s.terpenuhi_sistem === null ? 'Tidak tercatat' : 'Belum terpenuhi'}
              </Badge>
            </div>
            {s.penanda ? <p className="u-syk-penanda">{s.penanda.label}</p> : null}
            {saya && s.fitur?.length ? <p className="u-syk-redup">Dipakai untuk: {s.fitur.join(', ')}</p> : null}
            {kurang.length ? (
              <ul className="u-syk-butir">
                {kurang.map((b) => (
                  <li key={`${b.kode_biaya}-${b.tahun_id}`}>
                    {b.nama}
                    {b.tahun_id ? ` (${b.tahun_id})` : ''}: dibayar {b.persen}% dari minimal {b.minimal}%{b.sisa ? `, sisa ${rp(b.sisa)}` : ''} <span className="u-syk-redup">· diperiksa {b.unit}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {saya && !s.terpenuhi && s.pemeriksa?.length ? <p className="u-syk-redup">Hubungi {s.pemeriksa.join(' / ')} bila sudah membayar di luar sistem atau perlu dispensasi.</p> : null}
            {onAksi && s.boleh_validasi && !s.terpenuhi ? (
              <div className="u-syk-aksi">
                <Button size="xs" onClick={() => onAksi(s.syarat, 'validasi', kurang)}>
                  <BadgeCheck /> Validasi manual
                </Button>
                <Button size="xs" variant="outline" onClick={() => onAksi(s.syarat, 'dispensasi', kurang)}>
                  <CalendarClock /> Dispensasi
                </Button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function KartuValidasi({ r, saya }: { r: ValidasiSyaratKeuanganRow; saya?: boolean }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [alasan, setAlasan] = React.useState('');
  const [catatan, setCatatan] = React.useState('');
  const aksi = async (path: string, body: Record<string, unknown>, judul: string) => {
    try {
      await siakad.request({ method: 'POST', path: `/v1/syarat-keuangan/${r.id}/${path}`, body });
      toast.add({ title: judul, type: 'success' });
      invalidateSiakad('syarat-keuangan');
    } catch (e) {
      toast.add({ title: 'Belum berhasil', description: pesanGalat(e), type: 'error' });
      throw e;
    }
  };
  return (
    <Card className="u-syk-kartu">
      <div className="u-syk-kartu-kepala">
        <strong>
          {r.jenis_label}: {r.syarat_judul}
          {r.nama_biaya ? ` · ${r.nama_biaya}` : ''}
        </strong>
        <Badge variant={STATUS_VARIAN[r.status] ?? 'neutral'}>{r.status_label}</Badge>
      </div>
      <DescriptionList
        items={[
          ...(!saya && r.nama ? [{ label: 'Mahasiswa', value: `${r.nama} (${r.subjek})` }] : []),
          { label: 'Unit pemilik biaya', value: r.unit },
          ...(r.tahun_id ? [{ label: 'Periode', value: r.tahun_id }] : []),
          ...(r.berlaku_sampai ? [{ label: 'Berlaku sampai', value: tgl(r.berlaku_sampai) }] : []),
          ...(r.janji_bayar?.length ? [{ label: 'Janji bayar', value: r.janji_bayar.map((j) => `${tgl(j.tanggal)}: ${rp(j.jumlah)}`).join('; ') }] : []),
          ...(saya ? [] : [{ label: 'Alasan', value: r.alasan }]),
          ...(!saya && (r.bukti_keterangan || r.bukti_berkas)
            ? [
                {
                  label: 'Bukti',
                  value: (
                    <span>
                      {r.bukti_keterangan ?? ''}
                      {r.bukti_berkas ? (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() =>
                            void siakad
                              .request<{ url?: string }>({ method: 'GET', path: `/v1/berkas/${r.bukti_berkas}/url` })
                              .then((x) => x.data.url && window.open(x.data.url, '_blank', 'noopener'))
                              .catch((e) => toast.add({ title: 'Berkas belum bisa dibuka', description: pesanGalat(e), type: 'error' }))
                          }
                        >
                          <FileText /> Lihat berkas
                        </Button>
                      ) : null}
                    </span>
                  ),
                },
              ]
            : []),
          ...(r.jumlah != null && !saya ? [{ label: 'Nominal dibayar', value: rp(r.jumlah) }] : []),
          ...(r.status === 'dicabut' ? [{ label: 'Dicabut', value: `${tgl(r.dicabut_at)}${r.alasan_cabut ? `: ${r.alasan_cabut}` : ''}` }] : []),
          ...(r.catatan_putus ? [{ label: 'Catatan pemeriksa', value: r.catatan_putus }] : []),
        ]}
      />
      <AlurPemeriksa pemeriksa={r.pemeriksa} ringkas />
      {!saya && r.boleh ? (
        <div className="u-syk-aksi">
          {r.boleh.setujui ? (
            <>
              <ConfirmDialog
                trigger={
                  <Button size="xs">
                    <ShieldCheck /> Setujui
                  </Button>
                }
                title="Setujui usulan"
                tone="primary"
                description={<Textarea rows={2} placeholder="Catatan (opsional)" value={catatan} onChange={(e) => setCatatan(e.target.value)} />}
                confirmLabel="Setujui"
                onConfirm={() => aksi('putuskan', { keputusan: 'setujui', catatan: catatan || undefined }, 'Usulan disetujui')}
              />
              <ConfirmDialog
                trigger={
                  <Button size="xs" variant="outline">
                    <Ban /> Tolak
                  </Button>
                }
                title="Tolak usulan"
                description={<Textarea rows={3} placeholder="Alasan penolakan (wajib)" value={catatan} onChange={(e) => setCatatan(e.target.value)} />}
                confirmLabel="Tolak"
                onConfirm={() => aksi('putuskan', { keputusan: 'tolak', catatan }, 'Usulan ditolak')}
              />
            </>
          ) : null}
          {r.boleh.cabut ? (
            <ConfirmDialog
              trigger={
                <Button size="xs" variant="outline">
                  <Undo2 /> Cabut
                </Button>
              }
              title={`Cabut ${r.jenis_label.toLowerCase()}`}
              description={
                <>
                  <p>Syarat akan kembali dinilai dari pembayaran yang tercatat. Mahasiswa diberi notifikasi.</p>
                  <Textarea rows={3} placeholder="Alasan pencabutan (wajib)" value={alasan} onChange={(e) => setAlasan(e.target.value)} />
                </>
              }
              confirmLabel="Cabut"
              onConfirm={() => aksi('cabut', { alasan }, 'Validasi dicabut')}
            />
          ) : null}
          {r.boleh.batal ? (
            <ConfirmDialog
              trigger={
                <Button size="xs" variant="ghost">
                  <Trash2 /> Batalkan usulan
                </Button>
              }
              title="Batalkan usulan"
              description="Usulan ditarik sebelum diputus."
              confirmLabel="Batalkan"
              onConfirm={() => aksi('cabut', { alasan: 'Ditarik pengusul' }, 'Usulan dibatalkan')}
            />
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------- formulir validasi / dispensasi
export interface PanelValidasiSyaratProps {
  /** Baris antrean sasaran (satu = per mahasiswa, banyak = massal untuk syarat yang sama per baris). */
  baris: AntreanSyaratKeuangan[];
  jenisAwal?: 'validasi' | 'dispensasi';
  pengaturan?: PengaturanSyaratKeuangan[];
  onTutup: () => void;
  onSelesai?: () => void;
}

/**
 * Validasi manual / dispensasi di panel samping bertahap: Jenis & sasaran → Bukti & alasan (validasi) atau Masa &
 * janji bayar (dispensasi) → Tinjau (dengan pratinjau alur pemeriksa). Massal: satu permintaan per mahasiswa.
 */
export function PanelValidasiSyarat({ baris, jenisAwal = 'validasi', pengaturan, onTutup, onSelesai }: PanelValidasiSyaratProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const unggah = useUnggahBerkas({ kategori: 'dokumen', modul: 'syarat_keuangan', keterangan: 'Bukti validasi syarat keuangan' });
  const [jenis, setJenis] = React.useState<'validasi' | 'dispensasi'>(jenisAwal);
  const satu = baris.length === 1 ? baris[0] : null;
  const [kodeBiaya, setKodeBiaya] = React.useState<string | null>(null);
  const [alasan, setAlasan] = React.useState('');
  const [buktiKet, setBuktiKet] = React.useState('');
  const [berkas, setBerkas] = React.useState<File | null>(null);
  const [jumlah, setJumlah] = React.useState('');
  const [sampai, setSampai] = React.useState('');
  const [janji, setJanji] = React.useState<Array<{ tanggal: string; jumlah: string }>>([]);
  const wajibBukti = (pengaturan ?? []).some((p) => p.wajib_bukti) || !pengaturan?.length;
  const persetujuan = (pengaturan ?? []).filter((p) => p.wajib_persetujuan && !p.boleh_ubah);
  const syaratJudul = [...new Set(baris.map((b) => b.syarat_judul))].join(', ');
  const butirPilihan = satu?.butir ?? [];

  return (
    <PanelLangkah
      open
      onOpenChange={(o) => !o && onTutup()}
      title={jenis === 'validasi' ? 'Validasi manual syarat' : 'Dispensasi syarat'}
      description={satu ? `${satu.nama} (${satu.nim}) · ${satu.syarat_judul}${satu.tahun_id ? ` · ${satu.tahun_id}` : ''}` : `${baris.length} mahasiswa · ${syaratJudul}`}
      finishLabel={baris.length > 1 ? `Simpan untuk ${baris.length} mahasiswa` : jenis === 'validasi' ? 'Simpan validasi' : 'Simpan dispensasi'}
      footerNote="Kolom bertanda * wajib"
      steps={[
        {
          id: 'jenis',
          title: 'Jenis & sasaran',
          description: 'Validasi manual bila sudah dibayar di luar sistem; dispensasi bila diberi penangguhan sampai tanggal tertentu.',
          content: (
            <div className="u-syk-form">
              <RadioGroup
                variant="card"
                columns={2}
                value={jenis}
                onValueChange={(v) => setJenis(v)}
                options={[
                  { value: 'validasi', label: 'Validasi manual', description: 'Bayar di luar sistem / transfer belum tercatat. Bukti wajib.', icon: <BadgeCheck /> },
                  { value: 'dispensasi', label: 'Dispensasi', description: 'Penangguhan sampai tanggal tertentu, opsional dengan janji bayar.', icon: <CalendarClock /> },
                ]}
              />
              {satu && butirPilihan.length > 1 ? (
                <Field label="Jenis biaya" description="Kosongkan untuk semua biaya milik unit Anda yang belum memenuhi syarat ini.">
                  <Select
                    value={kodeBiaya}
                    onValueChange={setKodeBiaya}
                    placeholder="Pilih…"
                    options={butirPilihan.map((b) => ({ value: b.kode_biaya, label: `${b.nama}${b.tahun_id ? ` ${b.tahun_id}` : ''} · ${b.unit_kode} · sisa ${rp(b.sisa)}` }))}
                  />
                </Field>
              ) : null}
              {!satu ? (
                <ul className="u-syk-sasaran">
                  {baris.slice(0, 50).map((b) => (
                    <li key={b.kunci}>
                      <strong>{b.nama}</strong> <span className="u-syk-redup">{b.nim} · {b.syarat_judul} · sisa {rp(b.sisa)}</span>
                    </li>
                  ))}
                  {baris.length > 50 ? <li className="u-syk-redup">… dan {baris.length - 50} lainnya</li> : null}
                </ul>
              ) : null}
            </div>
          ),
        },
        jenis === 'validasi'
          ? {
              id: 'bukti',
              title: 'Bukti & alasan',
              description: 'Bukti pembayaran di luar sistem (bukti transfer, kwitansi) dan dasar validasi.',
              validate: () => {
                if (alasan.trim().length < 5) return 'Isi alasan validasi (minimal 5 huruf).';
                if (wajibBukti && !berkas && !buktiKet.trim()) return 'Unggah berkas bukti atau isi keterangan bukti (no. referensi transfer, tanggal bayar).';
                if (jumlah && !(Number(jumlah) >= 0)) return 'Nominal harus angka.';
                return null;
              },
              content: (
                <div className="u-syk-form">
                  <Field label="Alasan" required>
                    <Textarea rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Mis. transfer BNI 18-11 sudah masuk rekening, belum tercatat di sistem" />
                  </Field>
                  <Field label="Berkas bukti" description="PDF/JPG/PNG, disimpan privat di berkas SIAKAD." optional={!wajibBukti}>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setBerkas(e.target.files?.[0] ?? null)} aria-label="Berkas bukti" />
                  </Field>
                  <Field label="Keterangan bukti" description="No. referensi transfer, bank, tanggal bayar." optional>
                    <Input value={buktiKet} onChange={(e) => setBuktiKet(e.target.value)} placeholder="Mis. Ref BNI 20261118-0042" />
                  </Field>
                  <Field label="Nominal dibayar di luar sistem" optional>
                    <Input inputMode="numeric" value={jumlah} onChange={(e) => setJumlah(e.target.value.replace(/[^\d]/g, ''))} placeholder="Mis. 3500000" />
                  </Field>
                </div>
              ),
            }
          : {
              id: 'masa',
              title: 'Masa & janji bayar',
              description: 'Sesudah tanggal akhir, syarat kembali dinilai dari pembayaran.',
              validate: () => {
                if (!sampai || sampai < hariIni()) return 'Isi tanggal akhir dispensasi (paling cepat hari ini).';
                if (alasan.trim().length < 5) return 'Isi alasan dispensasi (minimal 5 huruf).';
                if (janji.some((j) => !j.tanggal || !(Number(j.jumlah) > 0))) return 'Lengkapi tanggal dan jumlah setiap janji bayar, atau hapus barisnya.';
                return null;
              },
              content: (
                <div className="u-syk-form">
                  <Field label="Berlaku sampai" required>
                    <IsianTanggal value={sampai} min={hariIni()} onValueChange={(v) => setSampai(v)} />
                  </Field>
                  <Field label="Alasan" required>
                    <Textarea rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Mis. menunggu pencairan beasiswa daerah" />
                  </Field>
                  <Field label="Janji bayar / cicilan" description="Opsional. Tanggal dan nominal yang dijanjikan mahasiswa." optional>
                    <div className="u-syk-janji">
                      {janji.map((j, i) => (
                        <div key={i} className="u-syk-janji-baris">
                          <IsianTanggal value={j.tanggal} aria-label="Tanggal janji" onValueChange={(v) => setJanji((x) => x.map((y, k) => (k === i ? { ...y, tanggal: v } : y)))} />
                          <Input inputMode="numeric" value={j.jumlah} placeholder="Jumlah" onChange={(e) => setJanji((x) => x.map((y, k) => (k === i ? { ...y, jumlah: e.target.value.replace(/[^\d]/g, '') } : y)))} aria-label="Jumlah janji" />
                          <Button size="xs" variant="ghost" onClick={() => setJanji((x) => x.filter((_, k) => k !== i))} aria-label="Hapus janji">
                            <Trash2 />
                          </Button>
                        </div>
                      ))}
                      <Button size="xs" variant="outline" disabled={janji.length >= 12} onClick={() => setJanji((x) => [...x, { tanggal: '', jumlah: '' }])}>
                        <Plus /> Tambah janji bayar
                      </Button>
                    </div>
                  </Field>
                  <Field label="Keterangan bukti" description="Mis. nomor surat permohonan dispensasi." optional>
                    <Input value={buktiKet} onChange={(e) => setBuktiKet(e.target.value)} />
                  </Field>
                </div>
              ),
            },
        {
          id: 'tinjau',
          title: 'Tinjau',
          content: (
            <div className="u-syk-form">
              <WizardReview
                sections={[
                  {
                    title: jenis === 'validasi' ? 'Validasi manual' : 'Dispensasi',
                    items: [
                      { label: 'Sasaran', value: satu ? `${satu.nama} (${satu.nim})` : `${baris.length} mahasiswa` },
                      { label: 'Syarat', value: syaratJudul },
                      { label: 'Jenis biaya', value: kodeBiaya ? (butirPilihan.find((b) => b.kode_biaya === kodeBiaya)?.nama ?? kodeBiaya) : 'Semua biaya milik unit Anda yang belum memenuhi' },
                      ...(jenis === 'dispensasi' ? [{ label: 'Berlaku sampai', value: tgl(sampai) }] : []),
                      ...(janji.length ? [{ label: 'Janji bayar', value: janji.map((j) => `${tgl(j.tanggal)}: ${rp(Number(j.jumlah))}`).join('; ') }] : []),
                      { label: 'Alasan', value: alasan },
                      ...(berkas ? [{ label: 'Berkas bukti', value: berkas.name }] : []),
                      ...(buktiKet ? [{ label: 'Keterangan bukti', value: buktiKet }] : []),
                      ...(jumlah ? [{ label: 'Nominal', value: rp(Number(jumlah)) }] : []),
                    ],
                  },
                ]}
              />
              {persetujuan.length ? (
                <Alert variant="info" title="Butuh persetujuan">
                  {persetujuan.map((p) => p.unit).join(', ')} mewajibkan persetujuan pimpinan unit; tindakan ini menjadi usulan sampai disetujui.
                </Alert>
              ) : null}
              <PratinjauPemeriksa jenis="keuangan.syarat" />
            </div>
          ),
        },
      ]}
      onFinish={async () => {
        try {
          const bukti_berkas = berkas ? (await unggah(berkas)).id : undefined;
          const body = {
            syarat: baris[0]!.syarat,
            subjek_jenis: baris[0]!.subjek_jenis,
            tahun_id: baris[0]!.tahun_id ?? undefined,
            jenis,
            alasan,
            kode_biaya: kodeBiaya ?? undefined,
            bukti_berkas,
            bukti_keterangan: buktiKet || undefined,
            jumlah: jumlah ? Number(jumlah) : undefined,
            berlaku_sampai: jenis === 'dispensasi' ? sampai : undefined,
            janji_bayar: jenis === 'dispensasi' && janji.length ? janji.map((j) => ({ tanggal: j.tanggal, jumlah: Number(j.jumlah) })) : undefined,
          };
          // Massal: kelompokkan per syarat (antrean bisa memuat beberapa syarat).
          const perSyarat = new Map<string, AntreanSyaratKeuangan[]>();
          for (const b of baris) perSyarat.set(b.syarat, [...(perSyarat.get(b.syarat) ?? []), b]);
          let berhasil = 0;
          const gagal: string[] = [];
          for (const [syarat, daftar] of perSyarat) {
            if (daftar.length === 1) {
              try {
                const r = await siakad.request<ValidasiSyaratKeuanganRow[]>({ method: 'POST', path: '/v1/syarat-keuangan', body: { ...body, syarat, subjek: daftar[0]!.subjek } });
                berhasil += r.data.length ? 1 : 0;
              } catch (e) {
                gagal.push(`${daftar[0]!.nim}: ${pesanGalat(e)}`);
              }
            } else {
              const r = await siakad.request<{ berhasil: number; gagal: Array<{ subjek: string; pesan: string }> }>({
                method: 'POST',
                path: '/v1/syarat-keuangan/massal',
                body: { ...body, syarat, subjek: daftar.map((d) => d.subjek) },
              });
              berhasil += daftar.length - r.data.gagal.length;
              gagal.push(...r.data.gagal.map((g) => `${g.subjek}: ${g.pesan}`));
            }
          }
          onSelesai?.();
          if (berhasil) toast.add({ title: jenis === 'validasi' ? `Validasi tersimpan (${berhasil})` : `Dispensasi tersimpan (${berhasil})`, type: 'success' });
          if (gagal.length) return `${gagal.length} gagal. ${gagal.slice(0, 2).join('; ')}${gagal.length > 2 ? '; …' : ''}`;
          return null;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

// ---------------------------------------------------------------- daftar rekaman & pengaturan
function DaftarValidasi({ status, kosong }: { status: string; kosong: string }) {
  const [f, setF] = React.useState<FilterValues>({ status: status === 'semua' ? undefined : status });
  const [rinci, setRinci] = React.useState<ValidasiSyaratKeuanganRow | null>(null);
  const q = useSiakadQuery<ValidasiSyaratKeuanganRow[]>(['syarat-keuangan', 'daftar', status, f], (s, signal) =>
    s.request<ValidasiSyaratKeuanganRow[]>(
      { method: 'GET', path: '/v1/syarat-keuangan', query: { status: (f.status as string) || 'semua', jenis: (f.jenis as string) || undefined, q: (f.q as string) || undefined, per_page: 500 } },
      { signal },
    ),
  );
  useSaatInvalidasi('syarat-keuangan', q.refetch);
  return (
    <>
      <DataTable
        rows={q.data}
        rowKey={(r) => r.id}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
        onRowClick={setRinci}
        defaultDensity="compact"
        exportCsv={`validasi-syarat-${status}`}
        empty={{ icon: <Wallet />, title: kosong }}
        toolbar={
          status === 'semua' ? (
            <FilterBar
              value={f}
              onValueChange={setF}
              search={{ placeholder: 'Cari NIM atau nama' }}
              fields={[
                {
                  key: 'status',
                  label: 'Status',
                  type: 'select',
                  options: [
                    { value: 'aktif', label: 'Berlaku' },
                    { value: 'diusulkan', label: 'Menunggu persetujuan' },
                    { value: 'ditolak', label: 'Ditolak' },
                    { value: 'dicabut', label: 'Dicabut' },
                    { value: 'dibatalkan', label: 'Dibatalkan' },
                  ],
                },
                { key: 'jenis', label: 'Jenis', type: 'select', options: [{ value: 'validasi', label: 'Validasi manual' }, { value: 'dispensasi', label: 'Dispensasi' }] },
              ]}
            />
          ) : undefined
        }
        columns={[
          { key: 'nama', header: 'Mahasiswa', value: (r) => `${r.subjek} ${r.nama ?? ''}`, cell: (r) => <span className="u-syk-mhs"><strong>{r.nama ?? r.subjek}</strong><span className="u-syk-redup">{r.subjek}{r.tahun_id ? ` · ${r.tahun_id}` : ''}</span></span> },
          { key: 'syarat', header: 'Syarat', value: (r) => `${r.syarat_judul}${r.nama_biaya ? ` · ${r.nama_biaya}` : ''}`, cell: (r) => `${r.syarat_judul}${r.nama_biaya ? ` · ${r.nama_biaya}` : ''}` },
          { key: 'jenis', header: 'Jenis', value: (r) => r.jenis_label, cell: (r) => `${r.jenis_label}${r.berlaku_sampai ? ` s.d. ${tgl(r.berlaku_sampai)}` : ''}` },
          { key: 'unit', header: 'Unit', value: (r) => r.unit },
          { key: 'oleh', header: 'Oleh', value: (r) => r.diusulkan_nama ?? r.diusulkan_oleh ?? '', cell: (r) => <span className="u-syk-mhs"><span>{r.diusulkan_nama ?? r.diusulkan_oleh}</span><span className="u-syk-redup">{tgl(r.diusulkan_at)}</span></span> },
          { key: 'status', header: 'Status', shrink: true, value: (r) => r.status_label, cell: (r) => <span className="u-syk-status"><Badge variant={STATUS_VARIAN[r.status] ?? 'neutral'}>{r.status_label}</Badge><LabelPemeriksa pemeriksa={r.pemeriksa} /></span> },
        ]}
      />
      <Sheet open={rinci != null} onOpenChange={(o) => !o && setRinci(null)} title="Rincian validasi syarat" size="md">
        {rinci ? <RincianValidasi id={rinci.id} /> : null}
      </Sheet>
    </>
  );
}

function RincianValidasi({ id }: { id: string }) {
  const q = useSiakadQuery<ValidasiSyaratKeuanganRow>(['syarat-keuangan', 'satu', id], (s, signal) => s.request<ValidasiSyaratKeuanganRow>({ method: 'GET', path: `/v1/syarat-keuangan/${id}` }, { signal }));
  useSaatInvalidasi('syarat-keuangan', q.refetch);
  if (q.error) return <Alert variant="danger">{pesanGalat(q.error)}</Alert>;
  if (!q.data) return <p className="u-syk-redup">Memuat…</p>;
  const r = q.data;
  return (
    <div className="u-syk-rinci">
      <KartuValidasi r={r} />
      <h4 className="u-syk-sub">Alur pemeriksa</h4>
      <AlurPemeriksa pemeriksa={r.pemeriksa} />
      {r.log?.length ? (
        <>
          <h4 className="u-syk-sub">Log</h4>
          <ul className="u-syk-log">
            {r.log.map((l, i) => (
              <li key={i}>
                <strong>{l.aksi}</strong> · {l.oleh} · {tgl(l.waktu)}
                {l.catatan ? <span className="u-syk-redup"> · {l.catatan}</span> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function PengaturanAlur({ pengaturan }: { pengaturan: PengaturanSyaratKeuangan[] }) {
  const [ubah, setUbah] = React.useState<PengaturanSyaratKeuangan | null>(null);
  if (!pengaturan.length) return <Empty icon={<Settings2 />} title="Belum ada unit yang bisa diatur" />;
  return (
    <div className="u-syk-pengaturan">
      {pengaturan.map((p) => (
        <Card key={p.unit_kode} className="u-syk-kartu">
          <div className="u-syk-kartu-kepala">
            <strong>{p.unit}</strong>
            {p.boleh_ubah ? (
              <Button size="xs" variant="outline" onClick={() => setUbah(p)}>
                <Settings2 /> Ubah
              </Button>
            ) : null}
          </div>
          <DescriptionList
            items={[
              { label: 'Persetujuan pimpinan', value: p.wajib_persetujuan ? 'Wajib (operator mengusulkan, kepala unit menyetujui)' : 'Tidak (petugas menetapkan langsung)' },
              { label: 'Bukti validasi manual', value: p.wajib_bukti ? 'Wajib' : 'Opsional' },
              { label: 'Batas dispensasi', value: p.maks_hari_dispensasi ? `${p.maks_hari_dispensasi} hari` : 'Tidak dibatasi' },
              ...(p.diubah_oleh ? [{ label: 'Diubah', value: `${p.diubah_oleh} · ${tgl(p.updated_at)}` }] : []),
            ]}
          />
        </Card>
      ))}
      {ubah ? <PanelPengaturanAlur p={ubah} onTutup={() => setUbah(null)} /> : null}
    </div>
  );
}

function PanelPengaturanAlur({ p, onTutup }: { p: PengaturanSyaratKeuangan; onTutup: () => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [setuju, setSetuju] = React.useState(p.wajib_persetujuan);
  const [bukti, setBukti] = React.useState(p.wajib_bukti);
  const [maks, setMaks] = React.useState(p.maks_hari_dispensasi ? String(p.maks_hari_dispensasi) : '');
  const [simpan, setSimpan] = React.useState(false);
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onTutup()}
      title={`Alur validasi syarat ${p.unit}`}
      description="Berlaku untuk validasi dan dispensasi biaya milik unit ini."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onTutup}>
            Batal
          </Button>
          <Button
            loading={simpan}
            onClick={async () => {
              setSimpan(true);
              try {
                await siakad.request({ method: 'PUT', path: '/v1/syarat-keuangan/pengaturan', body: { unit_id: p.unit_id, wajib_persetujuan: setuju, wajib_bukti: bukti, maks_hari_dispensasi: maks ? Number(maks) : null } });
                toast.add({ title: 'Pengaturan alur tersimpan', type: 'success' });
                invalidateSiakad('syarat-keuangan');
                onTutup();
              } catch (e) {
                toast.add({ title: 'Belum tersimpan', description: pesanGalat(e), type: 'error' });
              } finally {
                setSimpan(false);
              }
            }}
          >
            Simpan
          </Button>
        </>
      }
    >
      <div className="u-syk-form">
        <Field label="Wajib persetujuan pimpinan unit" description="Bila aktif, validasi/dispensasi dari operator menjadi usulan sampai disetujui pemegang izin keuangan.syarat.setujui.">
          <Switch checked={setuju} onCheckedChange={setSetuju} />
        </Field>
        <Field label="Wajib bukti untuk validasi manual" description="Berkas bukti atau keterangan bukti (no. referensi transfer).">
          <Switch checked={bukti} onCheckedChange={setBukti} />
        </Field>
        <Field label="Batas lama dispensasi (hari)" optional description="Kosongkan bila tidak dibatasi.">
          <Input inputMode="numeric" value={maks} onChange={(e) => setMaks(e.target.value.replace(/[^\d]/g, ''))} placeholder="Mis. 30" />
        </Field>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- mahasiswa (Profil)
/** Status syarat keuangan mahasiswa yang masuk: terpenuhi, divalidasi manual, dispensasi s.d., dan siapa pemeriksanya. */
export function SyaratKeuanganSaya({ tahunId }: { tahunId?: string }) {
  const q = useSiakadQuery<RincianSubjek>(['syarat-keuangan', 'saya', tahunId ?? ''], (s, signal) =>
    s.request<RincianSubjek>({ method: 'GET', path: '/v1/syarat-keuangan/saya', query: { tahun_id: tahunId } }, { signal }),
  );
  if ((q.error as { status?: number } | null)?.status === 403) return <Alert variant="info">Syarat keuangan hanya untuk akun mahasiswa.</Alert>;
  if (q.error) return <Alert variant="danger" title="Syarat keuangan belum bisa dimuat">{pesanGalat(q.error)}</Alert>;
  const d = q.data;
  if (!d) return <p className="u-syk-redup">Memuat…</p>;
  const belum = d.syarat.filter((s) => !s.terpenuhi).length;
  return (
    <div className="u-syk">
      <StatGrid min={170}>
        <StatCard label="Periode" value={d.tahun_id} icon={<CalendarClock />} />
        <StatCard label="Syarat belum terpenuhi" value={belum} icon={belum ? <CircleX /> : <CircleCheck />} tone={belum ? 'danger' : 'success'} />
        <StatCard label="Tunggakan" value={rp(d.tagihan?.tunggakan ?? 0)} icon={<Wallet />} tone={(d.tagihan?.tunggakan ?? 0) > 0 ? 'warning' : 'success'} />
      </StatGrid>
      <KartuSyarat syarat={d.syarat} saya />
      {d.riwayat.length ? (
        <>
          <h4 className="u-syk-sub">Validasi & dispensasi</h4>
          <ul className="u-syk-riwayat">
            {d.riwayat.map((r) => (
              <li key={r.id}>
                <KartuValidasi r={r} saya />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
