'use client';
import * as React from 'react';
import { BadgeCheck, CircleAlert, CircleCheck, CircleX, FileBadge, FlaskConical, GitBranch, ListChecks, Pencil, Plus, PowerOff, RotateCcw, Scale, Users } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton, Tag } from '../components/actions';
import { Alert, DescriptionList, Empty, Stepper, Tabs } from '../components/display';
import { DataTable } from '../components/data-table';
import { Field, Textarea } from '../components/forms';
import { Pilihan } from '../components/formulir';
import { Dialog, useToast } from '../components/overlays';
import type { SelectOption } from '../components/select';
import { rapikanNamaUnit } from './aturan-kelompok';
import { GalatApi } from './galat';
import { PilihEntitas } from './pilih';
import { invalidateSiakad, useSiakad, useSiakadQuery } from './provider';
import {
  FormAturan,
  HasilPeriksaAturanPanel,
  PanelDetailAturan,
  StatusAturanBadge,
  kalimatSyarat,
  statusTampil,
  useAturan,
  useKatalogAturan,
  type Aturan,
  type HasilPeriksaAturan,
} from './aturan';

/*
 * Aturan fakultas (SIAKAD docs/ATURAN-FAKULTAS.md): syarat dosen PA, pembimbing, dan penguji yang ditetapkan fakultas
 * dengan SK Dekan dan hanya berlaku untuk mahasiswa/prodi fakultas itu. Subjek aturan = dosen yang ditetapkan.
 *
 *   <KelolaAturanFakultas kodeFakultas="01" />                         halaman Aturan fakultas
 *   <PilihDosenBersyarat titik="ta.pembimbing.tetapkan" nim={nim} peran="pembimbing_1" value={nidn} onValueChange={setNidn} />
 *   const calon = useCalonDosen({ titik: 'akademik.pa.tetapkan', prodi: '55201' });
 */

// ================================================================ Tipe

/** Titik penetapan dosen (subjek dosen). */
export const TITIK_DOSEN_ATURAN = ['akademik.pa.tetapkan', 'ta.pembimbing.tetapkan', 'ta.penguji.proposal.tetapkan', 'ta.penguji.skripsi.tetapkan'] as const;
export type TitikDosenAturan = (typeof TITIK_DOSEN_ATURAN)[number];
export type PeranPenetapanDosen = 'pa' | 'pembimbing_1' | 'pembimbing_2' | 'penguji_1' | 'penguji_2' | 'penguji_3' | 'penguji_4';

/** Butir aturan dengan kolom aturan fakultas (SIAKAD terbaru). */
export type AturanBerlingkup = Aturan & {
  tingkat?: 'universitas' | 'fakultas' | 'prodi';
  lingkup_fakultas?: string | null;
  /** Kunci aturan bawaan fakultas (PA, PEMBIMBING, PENGUJI-PROPOSAL, PENGUJI-SKRIPSI). */
  bawaan_fakultas?: string | null;
  /** Aturan aktif tanpa SK (lencana "Belum ada SK"). */
  perlu_lampir_sk?: boolean;
};

export interface CalonDosenAturan {
  nidn: string;
  nama: string;
  prodi: string;
  nama_prodi: string | null;
  memenuhi: boolean;
  /** Alasan singkat, mis. "Belum Lektor", "Sudah membimbing 10 mahasiswa (maks. 10)". */
  alasan: string[];
  pesan: string[];
  peringatan: string[];
  /** Indikator yang datanya belum ada (syarat dilewati dengan peringatan). */
  data_kurang: string[];
  indikator?: Record<string, unknown>;
  sumber_data?: Record<string, string>;
}

export interface CalonDosenInput {
  titik: string;
  nim?: string | null;
  prodi?: string | null;
  peran?: PeranPenetapanDosen | null;
  q?: string;
  nidn?: string[];
  hanyaMemenuhi?: boolean;
  rinci?: boolean;
  perHalaman?: number;
}

export interface RingkasanAturanFakultas {
  fakultas: { kode: string; nama: string; unit_id: number | null };
  prodi: Array<{ kode: string; nama: string }>;
  boleh_atur: boolean;
  titik: Array<{ kode: string; judul: string; belum_ada_fitur: boolean; penerapan: string[] }>;
  aturan_fakultas: AturanBerlingkup[];
  aturan_universitas: AturanBerlingkup[];
  bawaan: Array<{ kunci: string; kode: string; nama: string; titik: string; keterangan: string }>;
  bawaan_dibuat: string[];
  penyetuju: { orang: Array<{ username: string; nama: string | null; sebagai: string }>; pesan: string | null; fakultas?: string };
  penelaah_gpm: string[];
  alur: Array<{ langkah: string; oleh: string; ket: string }>;
  dampak?: Array<{ titik: string; judul: string; dosen: number; memenuhi: number; tidak_memenuhi: number; data_kurang: number; aturan_aktif: number }>;
  dosen_data_kurang?: Array<{ nidn: string; nama: string; prodi: string; nama_prodi: string; kurang: string[] }>;
}

interface HasilPeriksaDosen extends HasilPeriksaAturan {
  dosen?: { nidn: string; nama: string };
  sumber_data?: Record<string, string>;
  data_kosong?: Array<{ indikator: string; judul: string; pesan: string; perilaku: string; aturan: string }>;
}

const LABEL_PERAN: Record<PeranPenetapanDosen, string> = {
  pa: 'Dosen PA',
  pembimbing_1: 'Pembimbing I',
  pembimbing_2: 'Pembimbing II',
  penguji_1: 'Penguji I / ketua',
  penguji_2: 'Penguji II',
  penguji_3: 'Penguji III',
  penguji_4: 'Penguji IV',
};
const PERAN_TITIK: Record<string, PeranPenetapanDosen[]> = {
  'akademik.pa.tetapkan': ['pa'],
  'ta.pembimbing.tetapkan': ['pembimbing_1', 'pembimbing_2'],
  'ta.penguji.proposal.tetapkan': ['penguji_1', 'penguji_2', 'penguji_3'],
  'ta.penguji.skripsi.tetapkan': ['penguji_1', 'penguji_2', 'penguji_3', 'penguji_4'],
};

const qsCalon = (i: CalonDosenInput) => ({
  titik: i.titik,
  nim: i.nim || undefined,
  prodi: i.prodi || undefined,
  peran: i.peran || undefined,
  q: i.q || undefined,
  nidn: i.nidn?.length ? i.nidn.join(',') : undefined,
  hanya_memenuhi: i.hanyaMemenuhi ? '1' : undefined,
  rinci: i.rinci ? '1' : undefined,
  per_page: String(i.perHalaman ?? 100),
});

// ================================================================ Data

/** Dosen aktif + hasil aturan titik penetapan dosen (GET /v1/aturan/calon-dosen). */
export function useCalonDosen(input: CalonDosenInput | null) {
  return useSiakadQuery<CalonDosenAturan[]>(
    ['aturan', 'calon-dosen', input],
    (s, signal) => s.request<CalonDosenAturan[]>({ method: 'GET', path: '/v1/aturan/calon-dosen', query: qsCalon(input!) }, { signal }),
    { enabled: Boolean(input?.titik) },
  );
}

/** Ringkasan halaman Aturan fakultas (GET /v1/aturan/fakultas/{kode}). */
export function useAturanFakultas(kodeFakultas: string | null | undefined, opsi: { dampak?: boolean } = {}) {
  const dampak = opsi.dampak ?? true;
  return useSiakadQuery<RingkasanAturanFakultas>(
    ['aturan', 'fakultas', kodeFakultas, dampak],
    (s, signal) => s.request<RingkasanAturanFakultas>({ method: 'GET', path: `/v1/aturan/fakultas/${encodeURIComponent(kodeFakultas!)}`, query: dampak ? {} : { dampak: '0' } }, { signal }),
    { enabled: Boolean(kodeFakultas) },
  );
}

// ================================================================ Pemilih dosen bersyarat

export interface PilihDosenBersyaratProps {
  /** Titik penetapan, mis. ta.pembimbing.tetapkan. */
  titik: TitikDosenAturan | string;
  /** Mahasiswa yang dibimbing/diuji (menentukan aturan fakultas yang berlaku). */
  nim?: string | null;
  /** Prodi bila tanpa mahasiswa tertentu (mis. penetapan PA massal). */
  prodi?: string | null;
  peran?: PeranPenetapanDosen | null;
  value?: string | null;
  onValueChange?: (nidn: string | null, dosen: CalonDosenAturan | null) => void;
  /** Dosen yang tidak memenuhi: tandai (tampil dengan alasan, bisa dipilih tetapi ditolak saat disimpan; bawaan), nonaktif (tidak bisa dipilih; pemilih cari menyembunyikannya), sembunyikan. */
  tidakMemenuhi?: 'nonaktif' | 'tandai' | 'sembunyikan';
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * Pemilih dosen yang menandai dosen yang belum memenuhi aturan titik (universitas + fakultas mahasiswa) beserta
 * alasannya ("Belum Lektor", "Sudah membimbing 10 mahasiswa"). Penegakan tetap di endpoint penetapan; komponen ini
 * mencegah salah pilih. Dosen prodi mahasiswa tampil lebih dulu.
 */
export function PilihDosenBersyarat({
  titik,
  nim,
  prodi,
  peran,
  value,
  onValueChange,
  tidakMemenuhi = 'tandai',
  placeholder,
  id,
  disabled,
  className,
  'aria-label': ariaLabel,
}: PilihDosenBersyaratProps) {
  const calon = useCalonDosen({ titik, nim, prodi, peran, perHalaman: 100 });
  const daftar = calon.data ?? [];
  const terpilih = daftar.find((d) => d.nidn === value) ?? null;
  const opsi: SelectOption<string>[] = React.useMemo(() => {
    const urut = [...daftar].sort((a, b) => Number(b.memenuhi) - Number(a.memenuhi));
    const o: SelectOption<string>[] = urut
      .filter((d) => d.memenuhi || tidakMemenuhi !== 'sembunyikan')
      .map((d) => ({
        value: d.nidn,
        label: d.nama,
        icon: d.memenuhi ? <CircleCheck aria-hidden className="u-dosen-syarat-ikon" data-nada="ok" /> : <CircleX aria-hidden className="u-dosen-syarat-ikon" data-nada="tolak" />,
        description: d.memenuhi
          ? [d.nama_prodi, d.data_kurang.length ? `data belum lengkap: ${d.data_kurang.join(', ').toLowerCase()}` : 'memenuhi syarat'].filter(Boolean).join(' · ')
          : d.alasan.join(' · '),
        disabled: !d.memenuhi && tidakMemenuhi === 'nonaktif',
        group: d.memenuhi ? 'Memenuhi syarat' : 'Belum memenuhi syarat',
      }));
    if (value && !o.some((x) => x.value === value)) o.unshift({ value, label: value, description: 'Dosen saat ini', group: 'Terpilih' });
    return o;
  }, [daftar, tidakMemenuhi, value]);
  const ringkas = calon.meta as { ringkasan?: { memenuhi: number; tidak_memenuhi: number }; aturan_aktif?: unknown[] } | undefined;
  return (
    <div className={cn('u-dosen-syarat', className)}>
      <Pilihan
        id={id}
        tampilan="cari"
        options={opsi}
        value={value ?? null}
        disabled={disabled || calon.loading}
        placeholder={calon.loading ? 'Memeriksa syarat dosen…' : (placeholder ?? 'Cari dosen')}
        aria-label={ariaLabel ?? 'Dosen'}
        onValueChange={(v) => onValueChange?.(v, daftar.find((d) => d.nidn === v) ?? null)}
      />
      {ringkas?.ringkasan && (
        <p className="u-dosen-syarat-ringkas">
          {ringkas.ringkasan.memenuhi} dosen memenuhi syarat, {ringkas.ringkasan.tidak_memenuhi} belum
          {ringkas.aturan_aktif && !ringkas.aturan_aktif.length ? ' (belum ada aturan aktif di langkah ini)' : ''}.
        </p>
      )}
      {terpilih && !terpilih.memenuhi && (
        <Alert variant="danger" title="Dosen ini belum memenuhi syarat">
          {terpilih.pesan.join(' ')}
        </Alert>
      )}
      {terpilih && terpilih.memenuhi && terpilih.peringatan.length > 0 && (
        <Alert variant="warning" title="Memenuhi, dengan catatan">
          {terpilih.peringatan.join(' ')}
        </Alert>
      )}
      {calon.error && <GalatApi error={calon.error} title="Syarat dosen tidak bisa diperiksa" />}
    </div>
  );
}

// ================================================================ Coba

/** "Coba: apakah dosen X memenuhi syarat pembimbing untuk mahasiswa Y?" (POST /v1/aturan/periksa). */
export function CobaSyaratDosen({ titik: titikAwal, className }: { titik?: string; className?: string }) {
  const siakad = useSiakad();
  const katalog = useKatalogAturan();
  const [titik, setTitik] = React.useState<string>(titikAwal ?? 'ta.pembimbing.tetapkan');
  const [peran, setPeran] = React.useState<PeranPenetapanDosen | ''>(PERAN_TITIK[titikAwal ?? 'ta.pembimbing.tetapkan']?.[0] ?? '');
  const [nim, setNim] = React.useState('');
  const [dosen, setDosen] = React.useState('');
  const [hasil, setHasil] = React.useState<HasilPeriksaDosen | null>(null);
  const [galat, setGalat] = React.useState<unknown>(null);
  const [jalan, setJalan] = React.useState(false);
  const judulTitik = (k: string) => katalog.data?.titik.find((t) => t.kode === k)?.judul ?? k;
  const periksa = async () => {
    setJalan(true);
    setGalat(null);
    setHasil(null);
    try {
      const body: Record<string, unknown> = { titik, dosen, nim: nim || undefined, konteks: peran ? { peran_penetapan: peran } : undefined };
      setHasil((await siakad.request<HasilPeriksaDosen>({ method: 'POST', path: '/v1/aturan/periksa', body })).data);
    } catch (e) {
      setGalat(e);
    } finally {
      setJalan(false);
    }
  };
  const judul = katalog.data?.indikator ? new Map(katalog.data.indikator.map((i) => [i.kode, i.judul])) : new Map<string, string>();
  return (
    <section className={cn('u-aturan-coba', className)} aria-label="Coba aturan ke dosen">
      <p className="u-aturan-sub">Periksa satu dosen untuk satu mahasiswa memakai semua aturan aktif (universitas dan fakultas). Tidak mengubah data apa pun.</p>
      <div className="u-form-kisi" data-kolom="2">
        <Field label="Langkah">
          <Pilihan
            tampilan="daftar"
            options={TITIK_DOSEN_ATURAN.map((k) => ({ value: k, label: judulTitik(k) }))}
            value={titik}
            onValueChange={(v) => {
              const t = v ?? 'ta.pembimbing.tetapkan';
              setTitik(t);
              setPeran(PERAN_TITIK[t]?.[0] ?? '');
              setHasil(null);
            }}
          />
        </Field>
        <Field label="Sebagai">
          <Pilihan
            tampilan="daftar"
            options={(PERAN_TITIK[titik] ?? []).map((p) => ({ value: p, label: LABEL_PERAN[p] }))}
            value={peran || null}
            onValueChange={(v) => setPeran((v ?? '') as PeranPenetapanDosen | '')}
          />
        </Field>
        <Field label="Mahasiswa" description="Prodi/fakultas mahasiswa menentukan aturan fakultas yang berlaku.">
          <PilihEntitas jenis="mahasiswa" value={nim || null} onValueChange={(v) => setNim(v ?? '')} placeholder="Cari NIM atau nama mahasiswa" />
        </Field>
        <Field label="Dosen">
          <PilihEntitas jenis="dosen" value={dosen || null} onValueChange={(v) => setDosen(v ?? '')} placeholder="Cari NIDN atau nama dosen" />
        </Field>
      </div>
      <div>
        <Button onClick={() => void periksa()} loading={jalan} disabled={!dosen}>
          <FlaskConical /> Periksa
        </Button>
      </div>
      {Boolean(galat) && <GalatApi error={galat} title="Pemeriksaan gagal" />}
      {hasil && (
        <div className="u-aturan-coba-hasil">
          <Alert variant={hasil.boleh ? (hasil.peringatan.length ? 'warning' : 'success') : 'danger'} title={hasil.boleh ? 'Memenuhi syarat' : 'Belum memenuhi syarat'}>
            {hasil.dosen?.nama ?? dosen} {hasil.boleh ? 'boleh' : 'belum boleh'} ditetapkan sebagai {peran ? LABEL_PERAN[peran] : "dosen"} ({judulTitik(titik).toLowerCase()})
            {nim ? ` untuk mahasiswa ${nim}` : ''}. {hasil.diterapkan.length} aturan aktif diperiksa.
          </Alert>
          <HasilPeriksaAturanPanel hasil={hasil} />
          {hasil.sumber_data && Object.keys(hasil.sumber_data).length > 0 && (
            <div className="u-aturan-coba-sumber">
              <p className="u-aturan-di-titik-label">Sumber data dosen</p>
              <DescriptionList
                items={Object.entries(hasil.sumber_data).map(([k, v]) => ({
                  label: judul.get(k) ?? k,
                  value: v,
                }))}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ================================================================ Halaman Aturan fakultas

const tanpaSk = (a: AturanBerlingkup) => a.perlu_lampir_sk ?? (a.status === 'aktif' && !a.sk?.nomor && !a.jumlah_sk);

function LencanaSk({ a, onLampirkan }: { a: AturanBerlingkup; onLampirkan?: () => void }) {
  if (a.sk?.nomor) return <Tag size="sm" icon={<FileBadge />}>SK {a.sk.nomor}</Tag>;
  if (!tanpaSk(a)) return null;
  return (
    <button type="button" className="u-lencana-sk" data-nada="warning" onClick={onLampirkan} title="Lampirkan SK Dekan dari registri SK">
      <CircleAlert aria-hidden /> Belum ada SK, lampirkan (SK Dekan)
    </button>
  );
}

function KartuAturanFakultas({
  a,
  bolehAtur,
  onBuka,
  onUbah,
  onNonaktif,
  onKembalikan,
}: {
  a: AturanBerlingkup;
  bolehAtur: boolean;
  onBuka: () => void;
  onUbah: () => void;
  onNonaktif: () => void;
  onKembalikan: () => void;
}) {
  const katalog = useKatalogAturan();
  const universitas = (a.tingkat ?? 'universitas') === 'universitas';
  const bawaan = Boolean(a.bawaan_fakultas);
  const berubah = bawaan && (a.status !== 'aktif' || a.versi > 1 || Boolean(a.usulan));
  return (
    <li className="u-aturan-fak-kartu" data-status={a.status} data-universitas={universitas || undefined}>
      <button type="button" className="u-aturan-fak-isi" onClick={onBuka}>
        <strong>{a.nama}</strong>
        <span>{kalimatSyarat(a.kondisi, katalog.data, 'Dosen boleh ditetapkan jika')}</span>
      </button>
      <div className="u-aturan-fak-lencana">
        <StatusAturanBadge status={statusTampil(a)} />
        {a.usulan?.status === 'diajukan' && (
          <Badge variant="info" dot>
            Versi baru menunggu Dekan
          </Badge>
        )}
        {universitas ? (
          <Tag size="sm">Universitas</Tag>
        ) : bawaan ? (
          <Tag size="sm" icon={<BadgeCheck />}>
            Bawaan fakultas
          </Tag>
        ) : (
          <Tag size="sm">{a.tingkat === 'prodi' ? 'Prodi' : 'Fakultas'}</Tag>
        )}
        {!universitas && <LencanaSk a={a} onLampirkan={onBuka} />}
      </div>
      {bolehAtur && !universitas && (
        <div className="u-aturan-fak-aksi">
          <Button size="sm" variant="outline" onClick={onUbah}>
            <Pencil /> {a.status === 'aktif' ? 'Ubah nilai' : 'Ubah'}
          </Button>
          {bawaan && a.status === 'aktif' && (
            <Button size="sm" variant="ghost" onClick={onNonaktif}>
              <PowerOff /> Nonaktifkan sementara
            </Button>
          )}
          {berubah && (
            <Button size="sm" variant="ghost" onClick={onKembalikan}>
              <RotateCcw /> Kembalikan ke bawaan
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

/** Peringatan bila aturan fakultas lebih longgar/sama dengan aturan universitas (detail aturan, `lingkup.peringatan`). */
function PeringatanLingkup({ id }: { id: string }) {
  const d = useAturan(id);
  const l = (d.data as unknown as { lingkup?: { tingkat: string; fakultas?: { nama: string | null } | null; sk_penerbit?: string; peringatan: Array<{ jenis: string; pesan: string }> } } | undefined)?.lingkup;
  if (!l || l.tingkat === 'universitas') return null;
  return (
    <div className="u-aturan-fak-lingkup">
      <p className="u-aturan-sub">
        Aturan {l.tingkat === 'prodi' ? 'prodi' : 'fakultas'} {l.fakultas?.nama ? `(${l.fakultas.nama.toLowerCase()})` : ''}: berlaku hanya untuk mahasiswa fakultas ini. Dasar hukum: {l.sk_penerbit}. Disahkan
        Dekan setelah ditelaah GPM/SPMI.
      </p>
      {l.peringatan.map((p, i) => (
        <Alert key={i} variant="warning" title={p.jenis === 'lebih_longgar' ? 'Lebih longgar dari aturan universitas' : 'Tumpang tindih dengan aturan universitas'}>
          {p.pesan}
        </Alert>
      ))}
    </div>
  );
}

function DialogAlasan({
  open,
  onOpenChange,
  judul,
  keterangan,
  label,
  onKirim,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  judul: string;
  keterangan: string;
  label: string;
  onKirim: (alasan: string) => Promise<void>;
}) {
  const [alasan, setAlasan] = React.useState('');
  const [sibuk, setSibuk] = React.useState(false);
  const [galat, setGalat] = React.useState<unknown>(null);
  React.useEffect(() => {
    if (open) {
      setAlasan('');
      setGalat(null);
    }
  }, [open]);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={judul}
      description={keterangan}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            loading={sibuk}
            disabled={alasan.trim().length < 10}
            onClick={async () => {
              setSibuk(true);
              setGalat(null);
              try {
                await onKirim(alasan.trim());
                onOpenChange(false);
              } catch (e) {
                setGalat(e);
              } finally {
                setSibuk(false);
              }
            }}
          >
            {label}
          </Button>
        </>
      }
    >
      <Field label="Alasan" required description="Minimal 10 karakter. Tercatat di riwayat aturan.">
        <Textarea rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} />
      </Field>
      {Boolean(galat) && <GalatApi error={galat} title="Gagal" />}
    </Dialog>
  );
}

export interface KelolaAturanFakultasProps {
  /** Kode fakultas (m_fakultas), kode unit (FAK-01), atau kode prodi. */
  kodeFakultas: string;
  judul?: React.ReactNode;
  /** Buka detail aturan ini saat halaman dimuat (tautan notifikasi ?aturan=). */
  aturanAwal?: string | null;
  className?: string;
}

/**
 * Halaman "Aturan fakultas": aturan fakultas per titik penetapan dosen (PA, pembimbing, penguji proposal, penguji
 * skripsi) dengan lencana SK Dekan, aturan universitas yang juga berlaku (lihat saja), panduan mengikuti aturan bawaan,
 * wizard dengan cakupan terkunci ke fakultas, Coba, alur persetujuan, dampak, dan dosen dengan data belum lengkap.
 */
export function KelolaAturanFakultas({ kodeFakultas, judul = 'Aturan fakultas', aturanAwal, className }: KelolaAturanFakultasProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const r = useAturanFakultas(kodeFakultas);
  const [tab, setTab] = React.useState<'aturan' | 'coba' | 'dampak' | 'alur'>('aturan');
  const [buka, setBuka] = React.useState<string | null>(aturanAwal ?? null);
  const [form, setForm] = React.useState<{ aturan: AturanBerlingkup | null; titik?: string } | null>(null);
  const [nonaktif, setNonaktif] = React.useState<AturanBerlingkup | null>(null);
  const [kembali, setKembali] = React.useState<AturanBerlingkup | null>(null);
  React.useEffect(() => {
    if (aturanAwal) setBuka(aturanAwal);
  }, [aturanAwal]);
  const d = r.data;
  if (r.loading && !d) return <Skeleton style={{ height: '24rem' }} />;
  if (r.error || !d) return <GalatApi error={r.error} title="Aturan fakultas tidak bisa dimuat" />;
  const segarkan = () => {
    invalidateSiakad('aturan');
    r.refetch();
  };
  const aksi = async (path: string, body: Record<string, unknown>, pesan: string) => {
    await siakad.request({ method: 'POST', path, body });
    toast.add({ title: pesan, type: 'success' });
    segarkan();
  };
  const perTitik = (kode: string) => d.aturan_fakultas.filter((a) => a.titik === kode && !a.dihapus_at);
  const univTitik = (kode: string) => d.aturan_universitas.filter((a) => a.titik === kode);
  const tanpaSkJumlah = d.aturan_fakultas.filter((a) => a.status === 'aktif' && tanpaSk(a)).length;
  const dekan = d.penyetuju.orang.filter((o) => o.sebagai.includes('Dekan'));
  return (
    <div className={cn('u-aturan-modul u-aturan-fak', className)}>
      <div className="u-aturan-modul-kepala">
        <div>
          <h2>{judul}</h2>
          <p>
            Syarat dosen PA, pembimbing, dan penguji di {rapikanNamaUnit(d.fakultas.nama)}. Aturan ini hanya berlaku untuk mahasiswa dan prodi fakultas ini,
            diperiksa bersama aturan universitas: semua harus terpenuhi.
          </p>
        </div>
        {d.boleh_atur && (
          <Button onClick={() => setForm({ aturan: null })}>
            <Plus /> Tambah aturan
          </Button>
        )}
      </div>

      <section className="u-aturan-fak-panduan" aria-label="Cara mengikuti aturan bawaan fakultas">
        <p className="u-aturan-di-titik-label">
          <ListChecks aria-hidden /> Cara mengikuti aturan bawaan fakultas
        </p>
        <ol>
          <li>
            <strong>Periksa aturan bawaan.</strong> Empat aturan bawaan sudah aktif dengan nilai yang lazim; data dosen yang belum lengkap hanya memberi peringatan, tidak memblokir.
          </li>
          <li>
            <strong>Lampirkan SK Dekan.</strong> Klik lencana "Belum ada SK" lalu pilih SK Dekan dari registri SK{tanpaSkJumlah ? ` (${tanpaSkJumlah} aturan belum ber-SK)` : ''}.
          </li>
          <li>
            <strong>Sesuaikan nilai bila perlu.</strong> "Ubah nilai" membuat versi baru dengan SK Dekan; setelah ditelaah GPM/SPMI dan disahkan Dekan, versi baru berlaku. Selama proses, versi lama tetap
            berlaku.
          </li>
          <li>
            <strong>Uji dengan Coba.</strong> Pilih mahasiswa dan dosen untuk melihat apakah dosen memenuhi syarat beserta alasannya.
          </li>
          <li>
            <strong>Lengkapi data dosen di SDM.</strong> Jabatan fungsional, pendidikan, dan TMT dosen yang kosong ada di tab Dampak.
          </li>
        </ol>
      </section>

      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          {
            value: 'aturan',
            label: 'Aturan',
            icon: <Scale />,
            content: (
              <div className="u-aturan-fak-titik-daftar">
                {d.titik.map((t) => {
                  const milik = perTitik(t.kode);
                  const univ = univTitik(t.kode);
                  return (
                    <section key={t.kode} className="u-aturan-fak-titik">
                      <header>
                        <h3>{t.judul}</h3>
                        {t.belum_ada_fitur && (
                          <Badge variant="neutral" title="Penetapan penguji belum ada di aplikasi baru; aturan sudah bisa disusun, diuji, dan dipakai pemilih dosen.">
                            Penetapan belum ada di aplikasi baru
                          </Badge>
                        )}
                        {d.boleh_atur && (
                          <Button size="sm" variant="ghost" onClick={() => setForm({ aturan: null, titik: t.kode })}>
                            <Plus /> Aturan
                          </Button>
                        )}
                      </header>
                      {milik.length ? (
                        <ul className="u-aturan-fak-daftar">
                          {milik.map((a) => (
                            <KartuAturanFakultas
                              key={a.id}
                              a={a}
                              bolehAtur={d.boleh_atur}
                              onBuka={() => setBuka(a.id)}
                              onUbah={() => setForm({ aturan: a })}
                              onNonaktif={() => setNonaktif(a)}
                              onKembalikan={() => setKembali(a)}
                            />
                          ))}
                        </ul>
                      ) : (
                        <p className="u-aturan-sub">Belum ada aturan fakultas di langkah ini.</p>
                      )}
                      {univ.length > 0 && (
                        <>
                          <p className="u-aturan-fak-univ-label">Aturan universitas yang juga berlaku (lihat saja)</p>
                          <ul className="u-aturan-fak-daftar">
                            {univ.map((a) => (
                              <KartuAturanFakultas key={a.id} a={a} bolehAtur={false} onBuka={() => setBuka(a.id)} onUbah={() => undefined} onNonaktif={() => undefined} onKembalikan={() => undefined} />
                            ))}
                          </ul>
                        </>
                      )}
                    </section>
                  );
                })}
              </div>
            ),
          },
          { value: 'coba', label: 'Coba', icon: <FlaskConical />, content: <CobaSyaratDosen /> },
          {
            value: 'dampak',
            label: 'Dampak & data dosen',
            icon: <Users />,
            count: d.dosen_data_kurang?.length || undefined,
            content: d.dampak ? (
              <div className="u-aturan-fak-dampak">
                <p className="u-aturan-sub">Menurut data sekarang, untuk dosen homebase fakultas ini (prodi homebase dosen sebagai contoh mahasiswa).</p>
                <DataTable
                  className="u-aturan-fak-tabel"
                  columns={[
                    { key: 'judul', header: 'Langkah', mobile: 'title' },
                    { key: 'aturan_aktif', header: 'Aturan aktif', format: 'angka' },
                    { key: 'dosen', header: 'Dosen', format: 'angka' },
                    { key: 'memenuhi', header: 'Memenuhi', format: 'angka' },
                    { key: 'tidak_memenuhi', header: 'Belum memenuhi', align: 'end', value: (x) => x.tidak_memenuhi, cell: (x) => (x.tidak_memenuhi ? <Badge variant="danger">{x.tidak_memenuhi}</Badge> : 0) },
                    { key: 'data_kurang', header: 'Data belum lengkap', align: 'end', value: (x) => x.data_kurang, cell: (x) => (x.data_kurang ? <Badge variant="warning">{x.data_kurang}</Badge> : 0) },
                  ]}
                  rows={d.dampak}
                  rowKey={(x) => String(x.titik)}
                  pagination={false} columnToggle={false} densityToggle={false} defaultDensity="compact"
                />
                <p className="u-aturan-di-titik-label">Dosen dengan data belum lengkap ({d.dosen_data_kurang?.length ?? 0})</p>
                <p className="u-aturan-sub">Syarat yang datanya kosong dilewati dengan peringatan. Lengkapi di aplikasi SDM: riwayat jabatan fungsional, pendidikan, dan TMT pengangkatan.</p>
                {d.dosen_data_kurang?.length ? (
                  <ul className="u-aturan-fak-kurang">
                    {d.dosen_data_kurang.map((x) => (
                      <li key={x.nidn}>
                        <span>
                          <strong>{x.nama}</strong> <em>{x.nidn}</em> · {x.nama_prodi}
                        </span>
                        <span>
                          {x.kurang.map((k) => (
                            <Tag key={k} size="sm">
                              {k}
                            </Tag>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty icon={<CircleCheck />} title="Data dosen lengkap" description="Semua indikator aturan aktif punya data." />
                )}
              </div>
            ) : (
              <p className="u-aturan-sub">Dampak hanya untuk pengatur aturan fakultas, Dekan, dan GPM.</p>
            ),
          },
          {
            value: 'alur',
            label: 'Alur persetujuan',
            icon: <GitBranch />,
            content: (
              <div className="u-aturan-fak-alur">
                <Stepper orientation="vertical" current={d.alur.length} steps={d.alur.map((x) => ({ title: `${x.langkah} · ${x.oleh}`, description: x.ket }))} />
                <DescriptionList
                  items={[
                    { label: 'Penyetuju', value: dekan.length ? dekan.map((o) => `${o.nama ?? o.username} (${o.sebagai})`).join(', ') : (d.penyetuju.pesan ?? '–') },
                    { label: 'Telaah mutu', value: d.penelaah_gpm.length ? `GPM fakultas: ${d.penelaah_gpm.join(', ')}` : 'SPMI universitas (belum ada GPM fakultas ber-akun)' },
                    { label: 'Hubungan dengan aturan universitas', value: 'Semua aturan diperiksa bersama. Aturan fakultas hanya bisa memperketat; yang lebih longgar diberi peringatan.' },
                  ]}
                />
              </div>
            ),
          },
        ]}
      />

      <Dialog open={buka !== null} onOpenChange={(o) => !o && setBuka(null)} side="right" size="lg" title="Detail aturan">
        {buka && (
          <>
            <PeringatanLingkup id={buka} />
            <PanelDetailAturan id={buka} onUbah={(a) => setForm({ aturan: a })} onDihapus={() => setBuka(null)} />
          </>
        )}
      </Dialog>
      <FormAturan
        open={form !== null}
        onOpenChange={(o) => !o && setForm(null)}
        aturan={form?.aturan ?? null}
        titik={form?.titik}
        kategori="akademik"
        lingkupFakultas={d.fakultas.kode}
        pilihanTitik={[...TITIK_DOSEN_ATURAN]}
        onTersimpan={(a) => {
          setForm(null);
          segarkan();
          setBuka(a.id);
        }}
      />
      <DialogAlasan
        open={nonaktif !== null}
        onOpenChange={(o) => !o && setNonaktif(null)}
        judul="Nonaktifkan sementara"
        keterangan={`"${nonaktif?.nama ?? ''}" berhenti diperiksa sampai dikembalikan ke bawaan atau diajukan ulang dengan SK Dekan.`}
        label="Nonaktifkan"
        onKirim={(alasan) => aksi(`/v1/aturan/${nonaktif!.id}/nonaktifkan`, { catatan: alasan }, 'Aturan dinonaktifkan sementara.')}
      />
      <DialogAlasan
        open={kembali !== null}
        onOpenChange={(o) => !o && setKembali(null)}
        judul="Kembalikan ke bawaan"
        keterangan={`Isi "${kembali?.nama ?? ''}" diganti nilai bawaan fakultas dan aktif lagi. Usulan perubahan yang sedang berjalan dibatalkan.`}
        label="Kembalikan"
        onKirim={(alasan) => aksi(`/v1/aturan/${kembali!.id}/kembalikan-bawaan`, { alasan }, 'Aturan dikembalikan ke bawaan fakultas.')}
      />
    </div>
  );
}
