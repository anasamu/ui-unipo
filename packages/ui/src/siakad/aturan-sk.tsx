'use client';
import * as React from 'react';
import {
  ArrowDown,
  ArrowUp,
  Ban,
  CircleAlert,
  CircleCheck,
  Copy,
  FileBadge,
  GitBranch,
  GripVertical,
  History,
  Layers,
  Plus,
  RefreshCw,
  Route,
  Send,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Users,
  X,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Card, Empty, Tabs } from '../components/display';
import { Checkbox, Field, Input, SegmentedControl, Textarea } from '../components/forms';
import { Pilihan, PilihanBanyak } from '../components/formulir';
import { Dialog, useToast } from '../components/overlays';
import { PanelLangkah } from '../components/panel-langkah';
import { WizardReview } from '../components/wizard';
import { useAkunSaya } from './akun';
import { rapikanNamaUnit } from './aturan-kelompok';
import { GalatApi } from './galat';
import { PilihSK, type SKRegistri } from './isian-sk';
import { useFakultasReferensi, useProdiReferensi } from './prodi';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { IsianAngka } from '../components/isian-angka';
import { keAngka } from '../lib/angka';
import { Tekan } from '../components/tekan';

/*
 * Aturan berdasarkan SK dan rantai validator per unit (SIAKAD docs/ATURAN-SK.md). Keluarga komponen yang dipakai ulang
 * oleh Aturan (BAAK, Fakultas, SDM, LP2M, SPMI, Pustikom) dan kelak Kebijakan berakibat / titik berbasis rute:
 *
 *   LencanaDasarSk        status dasar SK aturan (Berdasar SK, Dasar SK tidak berlaku, Belum berdasar SK)
 *   PemilihSkDasar        PilihSK + pemeriksaan kewenangan (penerbit, hierarki unit, cakupan) secara langsung
 *   PratinjauRantai       urutan tahap validator dengan nama jabatan + orang saat ini (hasil simulasi)
 *   PanelAjukanAturan     panel samping ajukan: SK dasar, rantai yang akan memvalidasi, catatan
 *   EditorRantaiValidator tahap bisa ditambah/hapus/diseret (atau Naik/Turun dengan papan ketik), validator & opsi
 *   ValidatorAturan       halaman Pustikom: rantai per unit/jenis unit, templat rantai, simulasi, riwayat
 *   DasarSkAturanDaftar   aturan belum berdasar SK (berkelompok, lampirkan massal) dan antrean tinjau ulang
 *   KalimatTemplat        kalimat aturan dengan celah isian terisi
 *   WizardTemplatAturan   pejabat membuat aturan dari templat berisian: Jenis → Kasus → Isi → Berlaku untuk → Dasar SK → Tinjau
 *
 * Bahasa layar awam: kode titik/indikator/izin tidak ditampilkan; kode hanya di "detail teknis".
 */

// ================================================================ Tipe

export type StatusDasarSk = 'berlaku' | 'diubah' | 'tidak_berlaku' | 'belum';

export interface UnitRingkas {
  id: number;
  kode: string;
  nama: string;
  singkatan?: string | null;
  jenis: string;
}

export interface DasarSkAturan {
  status: StatusDasarSk;
  label: string;
  ditinjau?: boolean;
  sk: { id: string; nomor: string; tanggal?: string | null; perihal?: string | null; status?: string; penerbit?: string | null } | null;
  unit_pengaju?: UnitRingkas | null;
  ditandai_at?: string | null;
  ditinjau_oleh?: string | null;
  ditinjau_at?: string | null;
  catatan_tinjau?: string | null;
}

export interface MasalahSkDasar {
  kode: string;
  pesan: string;
}

export interface HasilPeriksaSkDasar {
  ok: boolean;
  sk: { id: string; nomor: string; perihal?: string | null; status?: string; penerbit?: UnitRingkas | null; penandatangan?: string | null } | null;
  unit_pengaju: UnitRingkas | null;
  penerbit: UnitRingkas | null;
  masalah: MasalahSkDasar[];
  peringatan: MasalahSkDasar[];
}

export type JenisValidator = 'jabatan' | 'kepala_unit' | 'peran' | 'izin' | 'pengguna' | 'penyetuju_kategori';

export interface ValidatorTahap {
  jenis: JenisValidator;
  kode?: string;
  unit?: string;
}

export interface TahapRantai {
  judul: string;
  /** Label validator ramah (dari server), mis. "Dekan — fakultas pengaju". */
  label?: string;
  validator: ValidatorTahap[];
  mode?: 'satu' | 'semua';
  batas_hari?: number | null;
  bila_kosong?: 'eskalasi' | 'lewati' | 'tahan';
}

export interface PengaturanValidator {
  id: string;
  nama: string;
  jenis_baris: 'aturan' | 'templat';
  unit: UnitRingkas | null;
  jenis_unit: string | null;
  kategori: string | null;
  warisi: boolean;
  templat: { id: string; nama: string } | null;
  langkah: TahapRantai[];
  opsi: { ulang_dari: 'awal' | 'tahap_pengembali' };
  prioritas: number;
  aktif: boolean;
  bawaan: boolean;
  keterangan: string | null;
  dipakai?: number | null;
  diubah_oleh?: string | null;
  updated_at?: string | null;
}

export interface KatalogValidator {
  jenis: Array<{ kode: JenisValidator; label: string; keterangan: string }>;
  unit_relatif: Array<{ kode: string; label: string }>;
  jabatan: Array<{ kode: string; nama: string }>;
  peran: Array<{ kode: string; nama: string }>;
  unit: Array<UnitRingkas & { induk_id: number | null }>;
  jenis_unit: Array<{ kode: string; label: string }>;
  kategori: Array<{ kode: string; label: string }>;
}

export interface OrangRantai {
  username: string;
  nama: string | null;
  sebagai: string;
}

export interface TahapSimulasi {
  urut: number;
  judul: string;
  mode: 'satu' | 'semua';
  batas_hari: number | null;
  bila_kosong: 'eskalasi' | 'lewati' | 'tahan';
  validator: Array<{ jenis: string; label: string; label_nyata?: string; jumlah: number }>;
  orang: OrangRantai[];
  pengaju_dikeluarkan: boolean;
  kosong: boolean;
  tindakan: 'validasi' | 'eskalasi' | 'lewati' | 'tahan';
  catatan?: string;
  eskalasi_ke?: string;
}

export interface SimulasiRantai {
  unit: UnitRingkas | null;
  kategori: string;
  pengaju: string | null;
  sumber: 'pengaturan' | 'bawaan_sistem';
  pengaturan: { id: string; nama: string; bawaan: boolean; templat: boolean } | null;
  alasan: string;
  opsi: { ulang_dari: 'awal' | 'tahap_pengembali' };
  tahap: TahapSimulasi[];
  siap: boolean;
  pesan: string | null;
}

export interface SlotTemplat {
  kode: string;
  label: string;
  tipe: 'angka' | 'uang' | 'tanggal' | 'periode' | 'teks' | 'pilihan' | 'ya_tidak' | 'tabel';
  satuan?: string;
  /** Pilihan untuk tipe `pilihan`. */
  opsi?: Array<{ nilai: string; label: string }>;
  /** Boleh dikosongkan (kolom tabel opsional, mis. masa studi). */
  opsional?: boolean;
  bawaan?: unknown;
  contoh?: string;
  petunjuk?: string;
  min?: number;
  maks?: number;
  kolom?: SlotTemplat[];
}

export interface TemplatKasus {
  kode: string;
  judul: string;
  kalimat: string;
  /** Penjelasan tambahan untuk pejabat (kapan dipakai, apa yang tidak berubah). */
  keterangan?: string | null;
  slot: SlotTemplat[];
  akibat: string;
  akibat_label: string;
  siap: boolean;
  kategori: string | null;
  titik_judul: string | null;
}

export interface JenisAturanKatalog {
  urut: number;
  kode: string;
  judul: string;
  ikon: string;
  keterangan: string;
  templat: TemplatKasus[];
  siap: boolean;
}

export interface KatalogTemplatAturan {
  jenis: JenisAturanKatalog[];
  akibat: Array<{ kode: string; label: string; keterangan: string; ikon: string; siap: boolean }>;
}

export interface BarisDasarSk {
  id: string;
  nama: string;
  kategori: string;
  titik_judul: string | null;
  status: string;
  bawaan: boolean;
  unit: UnitRingkas | null;
  dasar_sk: DasarSkAturan;
  kelompok_dasar: 'belum' | 'tinjau' | 'berlaku';
}

export interface DaftarDasarSk {
  data: BarisDasarSk[];
  kelompok: Array<{ nama: string; kategori: string; jumlah: number; aturan: string[]; unit: string[] }>;
  jumlah: { belum: number; tinjau: number; berlaku: number };
}

// ================================================================ Galat

/**
 * Galat endpoint aturan berbasis SK (/v1/aturan/validator, /dasar-sk, /templat) bila API SIAKAD di server belum memuat
 * endpoint itu: server lama mencocokkan /v1/aturan/validator ke /v1/aturan/{id} lalu menjawab 422 `details.id`
 * ("Data yang dikirim tidak valid."), server baru menjawab 404 `route_not_found`. Keduanya dijelaskan dengan bahasa awam.
 * Mengembalikan null bila galat bukan kasus itu (pakai pesan bawaan).
 */
export function pesanGalatAturanBaru(e: unknown): string | null {
  const err = e as { status?: number; code?: string; details?: Record<string, unknown> } | null;
  if (!err) return null;
  const lama = err.status === 422 && err.details?.id === 'uuid aturan';
  const belumAda = err.status === 404 && err.code === 'route_not_found';
  return lama || belumAda
    ? 'Fitur ini belum tersedia di server SIAKAD: API SIAKAD di server masih versi lama. Minta Pustikom menjalankan pembaruan SIAKAD (update dan migrasi), lalu muat ulang halaman.'
    : null;
}

/** GalatApi untuk halaman aturan berbasis SK (menjelaskan API SIAKAD yang belum diperbarui). */
function GalatAturan({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const lama = pesanGalatAturanBaru(error);
  return <GalatApi error={error} onRetry={onRetry} className={className} title={lama ? 'Fitur belum tersedia di server' : undefined} message={lama ?? undefined} variant={lama ? 'warning' : undefined} />;
}

// ================================================================ Hook

export function useDasarSkAturan(f: { status?: 'belum' | 'tinjau' | 'berlaku'; kategori?: string; q?: string } = {}) {
  return useSiakadQuery<DaftarDasarSk>(['aturan', 'dasar-sk', f], (s, signal) => s.request<DaftarDasarSk>({ method: 'GET', path: '/v1/aturan/dasar-sk', query: f }, { signal }));
}
export function useValidatorAturan() {
  return useSiakadQuery<{ data: PengaturanValidator[]; boleh_atur: boolean }>(['aturan', 'validator'], (s, signal) => s.request({ method: 'GET', path: '/v1/aturan/validator' }, { signal }));
}
export function useKatalogValidator() {
  return useSiakadQuery<KatalogValidator>(['aturan', 'validator', 'katalog'], (s, signal) => s.request({ method: 'GET', path: '/v1/aturan/validator/katalog' }, { signal }), { staleTime: 300_000 });
}
export function useSimulasiRantai(unit: string | null | undefined, kategori: string | null | undefined, pengaju?: string | null) {
  return useSiakadQuery<SimulasiRantai>(
    ['aturan', 'validator', 'simulasi', unit, kategori, pengaju],
    (s, signal) => s.request({ method: 'GET', path: '/v1/aturan/validator/simulasi', query: { unit: unit ?? '', kategori: kategori ?? '', pengaju: pengaju ?? '' } }, { signal }),
    { enabled: Boolean(unit && kategori), staleTime: 5_000 },
  );
}
export function useRiwayatValidator(aktif = true) {
  return useSiakadQuery<Array<{ aksi: string; oleh: string | null; waktu: string | null; nama: string | null }>>(
    ['aturan', 'validator', 'riwayat'],
    (s, signal) => s.request({ method: 'GET', path: '/v1/aturan/validator/riwayat' }, { signal }),
    { enabled: aktif },
  );
}
export function useTemplatAturan() {
  return useSiakadQuery<KatalogTemplatAturan>(['aturan', 'templat'], (s, signal) => s.request({ method: 'GET', path: '/v1/aturan/templat' }, { signal }), { staleTime: 300_000 });
}

// ================================================================ Lencana & kalimat

const NADA_DASAR: Record<StatusDasarSk, 'success' | 'warning' | 'danger' | 'neutral'> = { berlaku: 'success', diubah: 'warning', tidak_berlaku: 'danger', belum: 'neutral' };
const LABEL_DASAR: Record<StatusDasarSk, string> = { berlaku: 'SK dasar berlaku', diubah: 'SK dasar diubah SK lain', tidak_berlaku: 'SK dasar dicabut', belum: 'Belum ada SK dasar' };

/** Lencana status dasar SK aturan. `ringkas` = tanpa nomor SK. */
export function LencanaDasarSk({ dasar, ringkas, className }: { dasar?: DasarSkAturan | null; ringkas?: boolean; className?: string }) {
  if (!dasar) return null;
  const st = dasar.status;
  return (
    <Badge variant={NADA_DASAR[st] === 'neutral' ? 'outline' : NADA_DASAR[st]} className={cn('u-ask-lencana', className)} title={dasar.sk ? `SK ${dasar.sk.nomor}${dasar.sk.penerbit ? ` · ${dasar.sk.penerbit}` : ''}` : undefined}>
      {st === 'berlaku' ? <FileBadge aria-hidden /> : st === 'belum' ? <CircleAlert aria-hidden /> : <TriangleAlert aria-hidden />}
      {LABEL_DASAR[st]}
      {!ringkas && dasar.sk && st !== 'belum' ? ` · ${dasar.sk.nomor}` : ''}
      {dasar.ditinjau && st !== 'berlaku' ? ' (sudah ditinjau)' : ''}
    </Badge>
  );
}

const fmtAngka = (v0: unknown, s?: SlotTemplat) => {
  if (s?.tipe === 'ya_tidak') return v0 === true || v0 === 'ya' || v0 === '1' ? 'ya' : v0 === false || v0 === 'tidak' || v0 === '0' ? 'tidak' : null;
  if (v0 === null || v0 === undefined || v0 === '') return null;
  if (s?.tipe === 'pilihan') return s.opsi?.find((o) => o.nilai === v0)?.label ?? String(v0);
  if (s?.tipe === 'periode' && /^\d{5}$/.test(String(v0))) return `${String(v0).slice(0, 4)}/${Number(String(v0).slice(0, 4)) + 1} ${({ '1': 'Ganjil', '2': 'Genap', '3': 'Pendek' } as Record<string, string>)[String(v0).slice(4)] ?? ''}`.trim();
  // "2.5" / "2,5" diketik pengguna tampil sebagai angka berkoma (2,50).
  const v = typeof v0 === 'string' && (s?.tipe === 'angka' || s?.tipe === 'uang') && /^-?[\d.,]+$/.test(v0.trim()) ? Number(s?.tipe === 'uang' ? v0.replace(/[.,]/g, '') : v0.replace(',', '.')) : v0;
  if (s?.tipe === 'uang' && typeof v === 'number') return `Rp${v.toLocaleString('id-ID')}`;
  if (typeof v === 'number') return v.toLocaleString('id-ID', { maximumFractionDigits: 2, minimumFractionDigits: s?.kode?.includes('ips') || s?.kode?.includes('ipk') ? 2 : 0 });
  return String(v);
};

/** Kalimat aturan dari templat: {slot} diganti isian (tabel diringkas). Celah kosong tampil "…". */
export function KalimatTemplat({ templat, isian, className }: { templat: Pick<TemplatKasus, 'kalimat' | 'slot'>; isian: Record<string, unknown>; className?: string }) {
  const slotPeta = new Map<string, SlotTemplat>();
  for (const s of templat.slot) {
    slotPeta.set(s.kode, s);
    for (const k of s.kolom ?? []) slotPeta.set(k.kode, k);
  }
  const tabel = templat.slot.find((s) => s.tipe === 'tabel');
  const baris = tabel ? ((isian[tabel.kode] as Array<Record<string, unknown>> | undefined) ?? []) : [];
  const bagian = templat.kalimat.split(/(\{[a-z0-9_]+\})/);
  return (
    <div className={cn('u-ask-kalimat', className)}>
      <p>
        {bagian.map((b, i) => {
          const m = /^\{([a-z0-9_]+)\}$/.exec(b);
          if (!m) return <React.Fragment key={i}>{b}</React.Fragment>;
          const s = slotPeta.get(m[1]!);
          const dariTabel = tabel?.kolom?.some((k) => k.kode === m[1]);
          const v = dariTabel ? baris[0]?.[m[1]!] : isian[m[1]!];
          const t = fmtAngka(v, s);
          return (
            <mark key={i} className="u-ask-celah" data-kosong={t === null ? '' : undefined}>
              {t ?? '…'}
              {t !== null && s?.satuan && s.satuan !== '%' && !b.includes('SKS') ? '' : ''}
            </mark>
          );
        })}
      </p>
      {tabel && baris.length > 1 && (
        <ul className="u-ask-kalimat-tabel">
          {baris.map((r, i) => (
            <li key={i}>
              {tabel.kolom!.map((k) => `${k.label} ${fmtAngka(r[k.kode], k) ?? '…'}${k.satuan ? ` ${k.satuan}` : ''}`).join(' → ')}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ================================================================ SK dasar

/**
 * Pilih SK induk dari Registri SK dan periksa kewenangannya langsung untuk aturan ini (penerbit berwenang, unit pengaju
 * di bawah penerbit, cakupan tidak melebihi SK). `aturanId` kosong = hanya PilihSK (dicek saat diajukan).
 */
export function PemilihSkDasar({
  aturanId,
  value,
  onValueChange,
  onHasil,
  unitPengajuId,
  rencana,
  label = 'SK dasar (SK induk)',
  description = 'SK pimpinan yang menjadi dasar aturan ini, dari Registri SK. Harus sudah terbit dan diterbitkan pimpinan unit Anda atau di atasnya.',
  required = true,
  error,
}: {
  aturanId?: string | null;
  value: string | null;
  onValueChange: (id: string | null, sk: SKRegistri | null) => void;
  onHasil?: (h: HasilPeriksaSkDasar | null) => void;
  unitPengajuId?: number | string | null;
  /** Aturan yang belum dibuat (wizard): unit pengaju + cakupan, diperiksa lewat GET /v1/aturan/dasar-sk/periksa. */
  rencana?: { unit: string; prodi?: string[]; fakultas?: string[] } | null;
  label?: React.ReactNode;
  description?: React.ReactNode;
  required?: boolean;
  error?: string;
}) {
  const bisa = Boolean(value && (aturanId || rencana));
  const periksa = useSiakadQuery<HasilPeriksaSkDasar>(
    ['aturan', 'dasar-sk-periksa', aturanId, value, unitPengajuId, rencana],
    (s, signal) =>
      aturanId
        ? s.request({ method: 'GET', path: `/v1/aturan/${aturanId}/dasar-sk/periksa`, query: { sk_dasar_id: value ?? '', unit_pengaju_id: unitPengajuId ?? '' } }, { signal })
        : s.request({ method: 'GET', path: '/v1/aturan/dasar-sk/periksa', query: { sk_dasar_id: value ?? '', unit_pengaju: rencana?.unit ?? '', prodi: (rencana?.prodi ?? []).join(','), fakultas: (rencana?.fakultas ?? []).join(',') } }, { signal }),
    { enabled: bisa, staleTime: 2_000 },
  );
  const h = bisa ? (periksa.data ?? null) : null;
  React.useEffect(() => onHasil?.(h), [h]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="u-ask-pemilih">
      <PilihSK value={value} onValueChange={onValueChange} jenis="aturan" label={label} description={description} required={required} error={error} placeholder="Pilih…" tampilPemakaian />
      {bisa && periksa.loading && <Skeleton height={48} />}
      {h && (
        <div className="u-ask-periksa" data-ok={h.ok ? '' : undefined}>
          {h.ok ? (
            <Alert variant="success" icon={<CircleCheck />} title="SK ini bisa menjadi dasar aturan">
              Diterbitkan {h.penerbit?.nama ?? 'penerbit'}
              {h.unit_pengaju ? `; ${h.unit_pengaju.nama} berada di bawahnya.` : '.'}
            </Alert>
          ) : (
            <Alert variant="danger" title="SK ini belum bisa menjadi dasar aturan. Pilih SK lain.">
              {h.masalah[0]?.pesan}
              {h.masalah.length > 1 && (
                <details className="u-ask-rinci">
                  <summary>Alasan lain ({h.masalah.length - 1})</summary>
                  <ul className="u-ask-masalah">
                    {h.masalah.slice(1).map((m) => (
                      <li key={m.kode}>{m.pesan}</li>
                    ))}
                  </ul>
                </details>
              )}
            </Alert>
          )}
          {h.peringatan.map((p) => (
            <Alert key={p.kode} variant="warning">
              {p.pesan}
            </Alert>
          ))}
        </div>
      )}
    </div>
  );
}

// ================================================================ Rantai

const LABEL_TINDAKAN: Record<TahapSimulasi['tindakan'], string> = { validasi: '', eskalasi: 'Kosong, diteruskan', lewati: 'Kosong, dilewati', tahan: 'Belum ada validator' };

/** Urutan tahap validasi dengan nama jabatan dan orang saat ini. */
export function PratinjauRantai({ rantai, ringkas, className }: { rantai: SimulasiRantai; ringkas?: boolean; className?: string }) {
  return (
    <div className={cn('u-ask-rantai', className)}>
      {!ringkas && (
        <p className="u-ask-rantai-asal">
          <Route aria-hidden /> {rantai.tahap.map((t) => t.validator.map((v) => v.label_nyata ?? v.label).join('/')).join(' → ')} · {rantai.alasan}
          {rantai.opsi.ulang_dari === 'tahap_pengembali' ? ' · Bila dikembalikan, ajuan ulang mulai dari tahap yang mengembalikan' : ''}
        </p>
      )}
      <ol>
        {rantai.tahap.map((t) => (
          <li key={t.urut} data-tindakan={t.tindakan}>
            <span className="u-ask-rantai-no" aria-hidden>
              {t.urut}
            </span>
            <div>
              <strong>{t.validator.map((v) => v.label_nyata ?? v.label).join(' atau ')}</strong>
              <span className="u-ask-sub">
                {t.judul}
                {t.mode === 'semua' ? ' · semua harus setuju' : ''}
                {t.batas_hari ? ` · batas ${t.batas_hari} hari` : ''}
              </span>
              {t.orang.length > 0 ? (
                <span className="u-ask-orang">
                  <Users aria-hidden /> {t.orang.map((o) => o.nama ?? o.username).join(', ')}
                </span>
              ) : (
                <span className="u-ask-orang" data-kosong="">
                  <CircleAlert aria-hidden /> {LABEL_TINDAKAN[t.tindakan] || 'Belum ada orang'}
                </span>
              )}
              {t.catatan && <span className="u-ask-sub">{t.catatan}</span>}
              {t.pengaju_dikeluarkan && <span className="u-ask-sub">Pengaju tidak ikut memvalidasi pengajuannya sendiri.</span>}
            </div>
          </li>
        ))}
      </ol>
      {!rantai.siap && rantai.pesan && <Alert variant="warning">{rantai.pesan}</Alert>}
    </div>
  );
}

/** Unit pengaju (kode induk_unit) dari cakupan aturan: prodi tunggal → kode prodi; fakultas tunggal → FAK-xx. */
export function unitDariCakupan(c?: { prodi?: string[]; fakultas?: string[] } | null, cadangan = 'BAAK'): string {
  if (c?.prodi?.length === 1) return c.prodi[0]!;
  if (c?.fakultas?.length === 1) return `FAK-${c.fakultas[0]}`;
  return cadangan;
}

/** Panel samping ajukan aturan: SK dasar (diperiksa langsung), siapa yang akan memvalidasi, catatan. */
export function PanelAjukanAturan({
  aturan,
  open,
  onOpenChange,
  onSelesai,
}: {
  aturan: { id: string; nama: string; kategori: string; status: string; dasar_sk?: DasarSkAturan | null; unit_pengaju_bawaan?: UnitRingkas | null; cakupan?: { prodi?: string[]; fakultas?: string[] } | null };
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelesai?: () => void;
}) {
  const siakad = useSiakad();
  const toast = useToast();
  const [sk, setSk] = React.useState<string | null>(aturan.dasar_sk?.sk?.id ?? null);
  const [hasil, setHasil] = React.useState<HasilPeriksaSkDasar | null>(null);
  const [catatan, setCatatan] = React.useState('');
  const [kirim, setKirim] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const saya = useAkunSaya({ foto: false });
  const unit = aturan.unit_pengaju_bawaan?.kode ?? unitDariCakupan(aturan.cakupan);
  const sim = useSimulasiRantai(open ? unit : null, aturan.kategori, saya.data?.akun.username ?? null);
  React.useEffect(() => {
    if (open) {
      setSk(aturan.dasar_sk?.sk?.id ?? null);
      setGalat(null);
    }
  }, [open, aturan.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const ajukan = async () => {
    setKirim(true);
    setGalat(null);
    try {
      await siakad.request({ method: 'POST', path: `/v1/aturan/${aturan.id}/ajukan`, body: { sk_dasar_id: sk, catatan: catatan.trim() || null } });
      invalidateSiakad('aturan');
      toast.add({ title: 'Diajukan untuk divalidasi', description: sim.data?.tahap[0] ? `Menunggu ${sim.data.tahap[0].validator.map((v) => v.label_nyata ?? v.label).join(' atau ')}` : undefined, type: 'success' });
      onOpenChange(false);
      onSelesai?.();
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setKirim(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      size="lg"
      title={`Ajukan “${aturan.nama}”`}
      description="Aturan berlaku setelah semua tahap validasi menyetujui."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={ajukan} loading={kirim} disabled={!sk || (hasil !== null && !hasil.ok) || (sim.data ? !sim.data.siap : false)}>
            <Send /> Ajukan
          </Button>
        </>
      }
    >
      <div className="u-ask-panel">
        <PemilihSkDasar aturanId={aturan.id} value={sk} onValueChange={(id) => setSk(id)} onHasil={setHasil} />
        <section>
          <h4 className="u-ask-judul">
            <GitBranch aria-hidden /> Yang akan memvalidasi
          </h4>
          {sim.loading ? <Skeleton height={96} /> : sim.data ? <PratinjauRantai rantai={sim.data} /> : sim.error ? <GalatAturan error={sim.error} onRetry={sim.refetch} /> : null}
        </section>
        <Field label="Catatan untuk validator" optional>
          <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={1000} placeholder="mis. Menindaklanjuti SK Rektor tentang pedoman akademik pasal 12" />
        </Field>
        {galat && <Alert variant="danger">{galat}</Alert>}
      </div>
    </Dialog>
  );
}

// ================================================================ Editor rantai

const TAHAP_BARU = (): TahapRantai => ({ judul: '', validator: [{ jenis: 'jabatan', kode: '', unit: 'fakultas' }], mode: 'satu', batas_hari: null, bila_kosong: 'eskalasi' });

/**
 * Editor rantai tahap validasi: tambah/hapus/seret tahap (tombol Naik/Turun untuk papan ketik dan ponsel), pilih
 * validator (jabatan relatif atau tetap, kepala unit, peran, izin, pengguna, pejabat penyetuju), opsi per tahap.
 */
export function EditorRantaiValidator({ value, onChange, katalog, galat }: { value: TahapRantai[]; onChange: (v: TahapRantai[]) => void; katalog: KatalogValidator; galat?: string | null }) {
  const [seret, setSeret] = React.useState<number | null>(null);
  const [atas, setAtas] = React.useState<number | null>(null);
  const ubah = (i: number, t: Partial<TahapRantai>) => onChange(value.map((x, j) => (j === i ? { ...x, ...t } : x)));
  const pindah = (dari: number, ke: number) => {
    if (ke < 0 || ke >= value.length || dari === ke) return;
    const v = [...value];
    const [x] = v.splice(dari, 1);
    v.splice(ke, 0, x!);
    onChange(v);
  };
  const opsiUnit = [
    ...katalog.unit_relatif.map((u) => ({ value: u.kode, label: u.label })),
    ...katalog.unit.filter((u) => !['prodi', 'kampus'].includes(u.jenis)).map((u) => ({ value: u.kode, label: `Unit ${u.singkatan || rapikanNamaUnit(u.nama)}` })),
  ];
  const opsiKode = (j: JenisValidator) =>
    j === 'jabatan' ? katalog.jabatan.map((x) => ({ value: x.kode, label: x.nama })) : j === 'peran' ? katalog.peran.map((x) => ({ value: x.kode, label: x.nama })) : [];
  return (
    <div className="u-ask-editor">
      {value.map((t, i) => (
        <Card
          key={i}
          className="u-ask-tahap"
          data-seret={seret === i ? '' : undefined}
          data-atas={atas === i && seret !== i ? '' : undefined}
          draggable
          onDragStart={(e: React.DragEvent) => {
            setSeret(i);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragOver={(e: React.DragEvent) => {
            e.preventDefault();
            setAtas(i);
          }}
          onDrop={(e: React.DragEvent) => {
            e.preventDefault();
            if (seret !== null) pindah(seret, i);
            setSeret(null);
            setAtas(null);
          }}
          onDragEnd={() => {
            setSeret(null);
            setAtas(null);
          }}
        >
          <div className="u-ask-tahap-kepala">
            <span className="u-ask-pegangan" aria-hidden title="Seret untuk mengurutkan">
              <GripVertical />
            </span>
            <span className="u-ask-rantai-no">{i + 1}</span>
            <Input value={t.judul} onChange={(e) => ubah(i, { judul: e.target.value })} placeholder={`Tahap ${i + 1}, mis. Validasi Dekan`} aria-label={`Judul tahap ${i + 1}`} />
            <Button variant="ghost" iconOnly size="sm" aria-label={`Naikkan tahap ${i + 1}`} disabled={i === 0} onClick={() => pindah(i, i - 1)}>
              <ArrowUp />
            </Button>
            <Button variant="ghost" iconOnly size="sm" aria-label={`Turunkan tahap ${i + 1}`} disabled={i === value.length - 1} onClick={() => pindah(i, i + 1)}>
              <ArrowDown />
            </Button>
            <Button variant="ghost" iconOnly size="sm" aria-label={`Gandakan tahap ${i + 1}`} onClick={() => onChange([...value.slice(0, i + 1), structuredClone(t), ...value.slice(i + 1)])}>
              <Copy />
            </Button>
            <Button variant="ghost" iconOnly size="sm" aria-label={`Hapus tahap ${i + 1}`} disabled={value.length === 1} onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <Trash2 />
            </Button>
          </div>
          <div className="u-ask-validator">
            {t.validator.map((v, k) => {
              const setV = (p: Partial<ValidatorTahap>) => ubah(i, { validator: t.validator.map((x, m) => (m === k ? { ...x, ...p } : x)) });
              return (
                <div key={k} className="u-ask-validator-baris">
                  <Pilihan
                    tampilan="daftar"
                    aria-label="Jenis validator"
                    options={katalog.jenis.map((j) => ({ value: j.kode, label: j.label }))}
                    value={v.jenis}
                    required
                    onValueChange={(j) => setV({ jenis: (j ?? 'jabatan') as JenisValidator, kode: '', unit: j === 'kepala_unit' ? 'induk' : j === 'jabatan' ? 'fakultas' : undefined })}
                  />
                  {(v.jenis === 'jabatan' || v.jenis === 'peran') && (
                    <Pilihan tampilan="cari" aria-label={v.jenis === 'jabatan' ? 'Jabatan' : 'Peran'} options={opsiKode(v.jenis)} value={v.kode ?? null} placeholder="Pilih…" onValueChange={(x) => setV({ kode: x ?? '' })} />
                  )}
                  {(v.jenis === 'izin' || v.jenis === 'pengguna') && (
                    <Input value={v.kode ?? ''} onChange={(e) => setV({ kode: e.target.value })} placeholder={v.jenis === 'izin' ? 'mis. aturan.setujui' : 'Nama pengguna SIAKAD'} aria-label={v.jenis === 'izin' ? 'Izin' : 'Pengguna'} />
                  )}
                  {(v.jenis === 'jabatan' || v.jenis === 'kepala_unit' || v.jenis === 'peran') && (
                    <Pilihan
                      tampilan="cari"
                      aria-label="Unit"
                      options={v.jenis === 'kepala_unit' ? opsiUnit : [{ value: '', label: 'Di unit mana saja' }, ...opsiUnit]}
                      value={v.unit ?? ''}
                      placeholder="Pilih…"
                      onValueChange={(x) => setV({ unit: x || undefined })}
                    />
                  )}
                  {t.validator.length > 1 && (
                    <Button variant="ghost" iconOnly size="sm" aria-label="Hapus validator" onClick={() => ubah(i, { validator: t.validator.filter((_, m) => m !== k) })}>
                      <X />
                    </Button>
                  )}
                </div>
              );
            })}
            <Button variant="ghost" size="sm" onClick={() => ubah(i, { validator: [...t.validator, { jenis: 'jabatan', kode: '', unit: 'fakultas' }] })}>
              <Plus /> Validator lain di tahap ini
            </Button>
          </div>
          <div className="u-ask-tahap-opsi">
            <Field label="Bila ada beberapa validator">
              <SegmentedControl
                options={[
                  { value: 'satu', label: 'Cukup satu' },
                  { value: 'semua', label: 'Semua harus setuju' },
                ]}
                value={t.mode ?? 'satu'}
                onValueChange={(m) => ubah(i, { mode: m })}
              />
            </Field>
            <Field label="Bila jabatan kosong">
              <Pilihan
                tampilan="daftar"
                options={[
                  { value: 'eskalasi', label: 'Teruskan ke tahap berikutnya / atasan' },
                  { value: 'lewati', label: 'Lewati tahap ini' },
                  { value: 'tahan', label: 'Tahan, harus diisi dulu' },
                ]}
                value={t.bila_kosong ?? 'eskalasi'}
                required
                onValueChange={(x) => ubah(i, { bila_kosong: (x ?? 'eskalasi') as TahapRantai['bila_kosong'] })}
              />
            </Field>
            <Field label="Batas waktu (hari)" optional description="Lewat batas, validator dan pengaju diingatkan setiap hari.">
              <IsianAngka value={keAngka(t.batas_hari)} min={1} max={90} placeholder="mis. 3" onValueChange={(n) => ubah(i, { batas_hari: n })} />
            </Field>
          </div>
        </Card>
      ))}
      <Button variant="outline" onClick={() => onChange([...value, TAHAP_BARU()])}>
        <Plus /> Tambah tahap
      </Button>
      {galat && <Alert variant="danger">{galat}</Alert>}
    </div>
  );
}

const cekRantai = (v: TahapRantai[]): string | null => {
  for (const [i, t] of v.entries()) {
    for (const x of t.validator) {
      if ((x.jenis === 'jabatan' || x.jenis === 'peran' || x.jenis === 'izin' || x.jenis === 'pengguna') && !x.kode) return `Tahap ${i + 1}: pilih ${x.jenis === 'jabatan' ? 'jabatan' : x.jenis === 'peran' ? 'peran' : x.jenis}.`;
      if (x.jenis === 'kepala_unit' && !x.unit) return `Tahap ${i + 1}: pilih unit kepala.`;
    }
  }
  return v.length ? null : 'Tambahkan minimal satu tahap.';
};

// ================================================================ Halaman Pustikom: validator aturan

interface IsianValidator {
  id?: string;
  nama: string;
  jenis_baris: 'aturan' | 'templat';
  sasaran: 'unit' | 'jenis_unit';
  unit_id: string | null;
  jenis_unit: string | null;
  kategori: string | null;
  warisi: boolean;
  pakai_templat: string | null;
  langkah: TahapRantai[];
  ulang_dari: 'awal' | 'tahap_pengembali';
  aktif: boolean;
  keterangan: string;
}

const isianDari = (p?: PengaturanValidator | null, jenis: 'aturan' | 'templat' = 'aturan'): IsianValidator => ({
  id: p?.id,
  nama: p?.nama ?? '',
  jenis_baris: p?.jenis_baris ?? jenis,
  sasaran: p?.unit ? 'unit' : p?.jenis_unit ? 'jenis_unit' : 'unit',
  unit_id: p?.unit?.kode ?? null,
  jenis_unit: p?.jenis_unit ?? null,
  kategori: p?.kategori ?? null,
  warisi: p?.warisi ?? true,
  pakai_templat: p?.templat?.id ?? null,
  langkah: p?.langkah?.length ? p.langkah.map(({ label: _l, ...t }) => structuredClone(t)) : [TAHAP_BARU()],
  ulang_dari: p?.opsi?.ulang_dari ?? 'awal',
  aktif: p?.aktif ?? true,
  keterangan: p?.keterangan ?? '',
});

function FormValidator({ open, onOpenChange, awal, katalog, templat }: { open: boolean; onOpenChange: (o: boolean) => void; awal: IsianValidator; katalog: KatalogValidator; templat: PengaturanValidator[] }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [v, setV] = React.useState(awal);
  React.useEffect(() => setV(awal), [awal]);
  const set = (p: Partial<IsianValidator>) => setV((x) => ({ ...x, ...p }));
  const simUnit = v.sasaran === 'unit' ? v.unit_id : (katalog.unit.find((u) => u.jenis === v.jenis_unit)?.kode ?? null);
  const namaUnit = (k: string | null) => katalog.unit.find((u) => u.kode === k)?.nama ?? k ?? '–';
  const templ = v.jenis_baris === 'templat';
  const body = () => ({
    nama: v.nama,
    jenis_baris: v.jenis_baris,
    unit_id: !templ && v.sasaran === 'unit' ? v.unit_id : null,
    jenis_unit: !templ && v.sasaran === 'jenis_unit' ? v.jenis_unit : null,
    kategori: templ ? null : v.kategori,
    warisi: v.warisi,
    templat_id: !templ ? v.pakai_templat : null,
    langkah: v.pakai_templat && !templ ? undefined : v.langkah.map((t) => ({ ...t, judul: t.judul || undefined })),
    opsi: { ulang_dari: v.ulang_dari },
    aktif: v.aktif,
    keterangan: v.keterangan || null,
  });
  const dariTemplat = templat.find((t) => t.id === v.pakai_templat);
  return (
    <PanelLangkah
      open={open}
      onOpenChange={onOpenChange}
      mode={v.id ? 'ubah' : 'buat'}
      size="xl"
      title={v.id ? `Ubah ${templ ? 'templat rantai' : 'rantai validator'}` : templ ? 'Templat rantai baru' : 'Rantai validator baru'}
      description={templ ? 'Templat rantai dipakai ulang oleh banyak unit.' : 'Siapa yang memvalidasi pengajuan aturan dari unit ini, tahap demi tahap.'}
      finishLabel="Simpan"
      steps={[
        ...(templ
          ? []
          : [
              {
                id: 'sasaran',
                title: 'Pengaju',
                description: 'Pengajuan aturan dari unit mana yang diatur rantai ini.',
                validate: () => (v.sasaran === 'unit' ? (v.unit_id ? null : 'Pilih unit pengaju.') : v.jenis_unit ? null : 'Pilih jenis unit.'),
                content: (
                  <div className="u-ask-form">
                    <SegmentedControl
                      options={[
                        { value: 'unit', label: 'Unit tertentu' },
                        { value: 'jenis_unit', label: 'Semua unit sejenis' },
                      ]}
                      value={v.sasaran}
                      onValueChange={(s) => set({ sasaran: s })}
                    />
                    {v.sasaran === 'unit' ? (
                      <Field label="Unit pengaju" required description="mis. Program Studi Informatika, Fakultas Ilmu Komputer, BAAK">
                        <Pilihan
                          tampilan="cari"
                          options={katalog.unit.filter((u) => u.jenis !== 'kampus').map((u) => ({ value: u.kode, label: u.nama }))}
                          value={v.unit_id}
                          placeholder="Pilih…"
                          onValueChange={(x) => set({ unit_id: x, nama: v.nama || (x ? `Pengajuan dari ${namaUnit(x)}` : '') })}
                        />
                      </Field>
                    ) : (
                      <Field label="Jenis unit" required>
                        <Pilihan tampilan="daftar" options={katalog.jenis_unit.map((j) => ({ value: j.kode, label: j.label }))} value={v.jenis_unit} placeholder="Pilih…" onValueChange={(x) => set({ jenis_unit: x })} />
                      </Field>
                    )}
                    <Field label="Jenis aturan" optional description="Kosong = semua jenis aturan dari unit ini.">
                      <Pilihan tampilan="daftar" options={[{ value: '', label: 'Semua jenis aturan' }, ...katalog.kategori.map((k) => ({ value: k.kode, label: k.label }))]} value={v.kategori ?? ''} onValueChange={(x) => set({ kategori: x || null })} />
                    </Field>
                    <label className="u-ask-centang">
                      <Checkbox checked={v.warisi} onCheckedChange={(c) => set({ warisi: c })} /> Berlaku juga untuk sub-unit (mis. prodi di bawah fakultas). Sub-unit bisa diberi rantai sendiri untuk menimpa.
                    </label>
                  </div>
                ),
              },
            ]),
        {
          id: 'rantai',
          title: 'Tahap validasi',
          description: 'Tahap berikutnya terbuka setelah tahap sebelumnya menyetujui. Seret kartu atau pakai panah untuk mengurutkan.',
          validate: () => (v.pakai_templat && !templ ? null : cekRantai(v.langkah)),
          content: (
            <div className="u-ask-form">
              {!templ && templat.length > 0 && (
                <Field label="Mulai dari templat rantai" optional>
                  <Pilihan
                    tampilan="daftar"
                    options={[{ value: '', label: 'Tanpa templat (susun sendiri)' }, ...templat.map((t) => ({ value: t.id, label: `${t.nama} (${t.langkah.length} tahap)` }))]}
                    value={v.pakai_templat ?? ''}
                    onValueChange={(x) => set({ pakai_templat: x || null })}
                  />
                </Field>
              )}
              {dariTemplat && !templ ? (
                <Alert variant="info" title={`Memakai templat “${dariTemplat.nama}”`}>
                  {dariTemplat.langkah.map((l, i) => `${i + 1}. ${l.judul}`).join(' → ')}. Perubahan templat ikut berlaku untuk unit ini.
                </Alert>
              ) : (
                <EditorRantaiValidator value={v.langkah} onChange={(l) => set({ langkah: l })} katalog={katalog} />
              )}
              <Field label="Bila dikembalikan validator">
                <SegmentedControl
                  options={[
                    { value: 'awal', label: 'Ulang dari tahap 1' },
                    { value: 'tahap_pengembali', label: 'Ulang dari tahap yang mengembalikan' },
                  ]}
                  value={v.ulang_dari}
                  onValueChange={(x) => set({ ulang_dari: x })}
                />
              </Field>
            </div>
          ),
        },
        {
          id: 'tinjau',
          title: 'Tinjau & simulasi',
          validate: () => (v.nama.trim() ? null : 'Beri nama.'),
          content: (
            <div className="u-ask-form">
              <Field label="Nama" required>
                <Input value={v.nama} onChange={(e) => set({ nama: e.target.value })} placeholder="mis. Prodi Informatika: Dekan, LP2M, Rektor" />
              </Field>
              <Field label="Keterangan" optional>
                <Textarea value={v.keterangan} onChange={(e) => set({ keterangan: e.target.value })} maxLength={500} />
              </Field>
              {!templ && (
                <Alert variant="info" title="Simulasi">
                  Simulasi memakai rantai yang sudah tersimpan. Setelah menyimpan, buka tab Simulasi untuk melihat nama orang di tiap tahap.
                </Alert>
              )}
              <WizardReview
                sections={[
                  ...(templ ? [] : [{ title: 'Pengaju', items: [{ label: 'Dari', value: v.sasaran === 'unit' ? namaUnit(v.unit_id) : `Semua ${katalog.jenis_unit.find((j) => j.kode === v.jenis_unit)?.label ?? ''}` }, { label: 'Jenis aturan', value: katalog.kategori.find((k) => k.kode === v.kategori)?.label ?? 'Semua' }, { label: 'Sub-unit', value: v.warisi ? 'Ikut' : 'Tidak ikut' }] }]),
                  {
                    title: 'Tahap',
                    items: (dariTemplat && !templ ? dariTemplat.langkah : v.langkah).map((t, i) => ({ label: `Tahap ${i + 1}`, value: t.judul || '(tanpa judul)' })),
                  },
                ]}
              />
              {simUnit && v.id && <SimulasiValidator unitAwal={simUnit} kategoriAwal={v.kategori ?? 'akademik'} ringkas />}
            </div>
          ),
        },
      ]}
      onFinish={async () => {
        try {
          await siakad.request({ method: 'POST', path: v.id ? `/v1/aturan/validator/${v.id}` : '/v1/aturan/validator', body: body() });
          invalidateSiakad('aturan');
          toast.add({ title: 'Rantai validator tersimpan', type: 'success' });
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

/**
 * Penjelasan singkat beda Pengatur dan Validator aturan (dipasang di atas tab Pengatur dan halaman Validator aturan).
 * `tautan` = tautan ke halaman satunya (mis. <Link to="/aturan/validator">Validator aturan</Link>).
 */
export function PenjelasanPengaturValidator({ halaman, tautan, className }: { halaman: 'pengatur' | 'validator'; tautan?: React.ReactNode; className?: string }) {
  return (
    <Alert variant="info" icon={halaman === 'pengatur' ? <Users /> : <GitBranch />} title={halaman === 'pengatur' ? 'Pengatur: siapa yang boleh menyusun aturan' : 'Validator: siapa yang menyetujui pengajuan aturan'} className={cn('u-aturan-penjelasan-peran', className)}>
      <ul>
        <li>
          <strong>Pengatur</strong> = siapa yang boleh <em>menyusun dan mengubah</em> aturan untuk tiap kategori (dan langkah tertentu), mis. staf BAAK untuk aturan akademik.
        </li>
        <li>
          <strong>Validator</strong> = siapa yang <em>menyetujui</em> aturan yang diajukan sebuah unit, berurutan (mis. usulan prodi → Dekan → Wakil Rektor). Aturan baru berlaku setelah semua tahap menyetujui.
        </li>
        <li>
          Keduanya bisa orang yang berbeda. Bila sebuah unit belum punya rantai validator, aturan disetujui <em>pejabat penyetuju kategori</em> (Wakil Rektor bidangnya), bukan oleh pengatur.
        </li>
      </ul>
      {tautan && <p className="u-aturan-penjelasan-tautan">Lihat juga: {tautan}</p>}
    </Alert>
  );
}

/** Simulasi: pengajuan aturan dari unit X jenis Y akan divalidasi siapa. */
export function SimulasiValidator({ unitAwal, kategoriAwal = 'akademik', ringkas }: { unitAwal?: string | null; kategoriAwal?: string; ringkas?: boolean }) {
  const katalog = useKatalogValidator();
  const [unit, setUnit] = React.useState<string | null>(unitAwal ?? null);
  const [kategori, setKategori] = React.useState<string>(kategoriAwal);
  const [pengaju, setPengaju] = React.useState('');
  React.useEffect(() => setUnit(unitAwal ?? null), [unitAwal]);
  const sim = useSimulasiRantai(unit, kategori, pengaju.trim() || null);
  return (
    <div className="u-ask-simulasi">
      {!ringkas && (
        <div className="u-ask-simulasi-isian">
          <Field label="Pengajuan dari unit">
            <Pilihan tampilan="cari" options={(katalog.data?.unit ?? []).filter((u) => u.jenis !== 'kampus').map((u) => ({ value: u.kode, label: u.nama }))} value={unit} placeholder="Pilih…" onValueChange={setUnit} />
          </Field>
          <Field label="Jenis aturan">
            <Pilihan tampilan="daftar" options={(katalog.data?.kategori ?? []).map((k) => ({ value: k.kode, label: k.label }))} value={kategori} required onValueChange={(x) => setKategori(x ?? 'akademik')} />
          </Field>
          <Field label="Akun pengaju" optional description="Isi untuk melihat bahwa pengaju tidak memvalidasi usulannya sendiri.">
            <Input value={pengaju} onChange={(e) => setPengaju(e.target.value)} placeholder="mis. operator.fik" />
          </Field>
        </div>
      )}
      {!unit ? <Empty icon={<Route />} title="Pilih unit pengaju" description="Hasil simulasi menampilkan rantai lengkap dengan nama orang saat ini." /> : sim.loading ? <Skeleton height={120} /> : sim.error ? <GalatAturan error={sim.error} onRetry={sim.refetch} /> : sim.data ? <PratinjauRantai rantai={sim.data} /> : null}
    </div>
  );
}

const LABEL_JENIS_UNIT_BARIS = (p: PengaturanValidator, katalog?: KatalogValidator) =>
  p.unit ? p.unit.nama : `Semua ${katalog?.jenis_unit.find((j) => j.kode === p.jenis_unit)?.label.toLowerCase() ?? p.jenis_unit ?? ''}`;

/**
 * Pustikom » Aturan » Validator aturan: rantai validator per unit pengaju (dan per jenis aturan), templat rantai,
 * simulasi, riwayat. Tulis butuh izin aturan.validator.atur; lihat butuh aturan.validator.lihat.
 */
export function ValidatorAturan({ className, tautanPengatur }: { className?: string; /** Tautan ke tab Pengatur (Aturan & pengatur). */ tautanPengatur?: React.ReactNode }) {
  const q = useValidatorAturan();
  const katalog = useKatalogValidator();
  const riwayat = useRiwayatValidator();
  const siakad = useSiakad();
  const toast = useToast();
  const [form, setForm] = React.useState<IsianValidator | null>(null);
  if (q.error) return <GalatAturan error={q.error} onRetry={q.refetch} className={className} />;
  if (!q.data || !katalog.data) return <Skeleton height={240} className={className} />;
  const boleh = q.data.boleh_atur;
  const rantai = q.data.data.filter((p) => p.jenis_baris === 'aturan');
  const templat = q.data.data.filter((p) => p.jenis_baris === 'templat');
  const kartu = (p: PengaturanValidator) => (
    <Card key={p.id} className="u-ask-kartu" data-nonaktif={p.aktif ? undefined : ''}>
      <div className="u-ask-kartu-kepala">
        <div>
          <strong>{p.jenis_baris === 'templat' ? p.nama : rapikanNamaUnit(LABEL_JENIS_UNIT_BARIS(p, katalog.data))}</strong>
          <span className="u-ask-sub">
            {p.jenis_baris === 'templat' ? `Dipakai ${p.dipakai ?? 0} unit` : `${p.kategori ? (katalog.data!.kategori.find((k) => k.kode === p.kategori)?.label ?? p.kategori) : 'Semua jenis aturan'}${p.warisi ? ' · termasuk sub-unit' : ''}`}
            {p.templat ? ` · templat ${p.templat.nama}` : ''}
          </span>
        </div>
        <div className="u-ask-lencana-baris">
          {p.bawaan && <Badge variant="info">Bawaan</Badge>}
          {!p.aktif && <Badge variant="outline">Nonaktif</Badge>}
        </div>
      </div>
      <ol className="u-ask-urutan">
        {p.langkah.map((t, i) => (
          <li key={i}>
            <span className="u-ask-rantai-no">{i + 1}</span>
            <span>
              {t.label || t.judul}
              <span className="u-ask-sub">
                {t.label ? t.judul : ''}
                {t.mode === 'semua' ? ' · semua harus setuju' : ''}
                {t.batas_hari ? ` · batas ${t.batas_hari} hari` : ''}
              </span>
            </span>
          </li>
        ))}
      </ol>
      {boleh && (
        <div className="u-ask-kartu-aksi">
          <Button size="sm" variant="outline" onClick={() => setForm(isianDari(p))}>
            Ubah
          </Button>
          {!p.bawaan && (
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  await siakad.request({ method: 'POST', path: `/v1/aturan/validator/${p.id}/hapus` });
                  invalidateSiakad('aturan');
                  toast.add({ title: 'Dihapus', type: 'success' });
                } catch (e) {
                  toast.add({ title: 'Gagal menghapus', description: pesanGalat(e), type: 'error' });
                }
              }}
            >
              <Trash2 /> Hapus
            </Button>
          )}
        </div>
      )}
    </Card>
  );
  return (
    <div className={cn('u-ask', className)}>
      <PenjelasanPengaturValidator halaman="validator" tautan={tautanPengatur} />
      <Alert icon={<ShieldCheck />} title="Cara kerja rantai validator">
        Aturan yang diajukan sebuah unit diperiksa berurutan, mis. usulan prodi → Dekan → LP2M → Rektor. Unit yang punya rantai sendiri memakai rantainya; bila tidak, ikut rantai unit induk atau rantai untuk unit sejenis; bila tidak ada sama sekali, disetujui Wakil Rektor bidangnya. Pengaju tidak pernah memeriksa usulannya sendiri.
      </Alert>
      <Tabs
        items={[
          {
            value: 'rantai',
            label: 'Rantai per unit',
            icon: <GitBranch />,
            count: rantai.length,
            content: (
              <div className="u-ask-daftar">
                {boleh && (
                  <Button onClick={() => setForm(isianDari(null, 'aturan'))}>
                    <Plus /> Rantai validator baru
                  </Button>
                )}
                <div className="u-ask-grid">{rantai.map(kartu)}</div>
              </div>
            ),
          },
          {
            value: 'templat',
            label: 'Templat rantai',
            icon: <Layers />,
            count: templat.length,
            content: (
              <div className="u-ask-daftar">
                {boleh && (
                  <Button variant="outline" onClick={() => setForm(isianDari(null, 'templat'))}>
                    <Plus /> Templat rantai baru
                  </Button>
                )}
                {templat.length ? <div className="u-ask-grid">{templat.map(kartu)}</div> : <Empty icon={<Layers />} title="Belum ada templat rantai" description="Simpan rantai yang sering dipakai (mis. Dekan → LP2M → Rektor) agar bisa dipakai banyak unit." />}
              </div>
            ),
          },
          { value: 'simulasi', label: 'Simulasi', icon: <Route />, content: <SimulasiValidator /> },
          {
            value: 'riwayat',
            label: 'Riwayat',
            icon: <History />,
            content: (
              <ul className="u-ask-riwayat">
                {(riwayat.data ?? []).map((r, i) => (
                  <li key={i}>
                    <Badge variant="outline">{r.aksi === 'buat' ? 'Dibuat' : r.aksi === 'ubah' ? 'Diubah' : 'Dihapus'}</Badge> {r.nama ?? '–'} · {r.oleh ?? '–'} · {r.waktu ?? ''}
                  </li>
                ))}
              </ul>
            ),
          },
        ]}
      />
      {form && <FormValidator open onOpenChange={(o) => !o && setForm(null)} awal={form} katalog={katalog.data} templat={templat} />}
    </div>
  );
}

// ================================================================ Dasar SK: belum berdasar SK & tinjau ulang

export function PanelLampirSkDasar({ aturan, judul, open, onOpenChange }: { aturan: string[]; judul: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [sk, setSk] = React.useState<string | null>(null);
  const [hasil, setHasil] = React.useState<null | { berhasil: number; gagal: number; hasil: Array<{ id: string; nama: string; ok: boolean; pesan: string | null }> }>(null);
  const [kirim, setKirim] = React.useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setHasil(null);
        onOpenChange(o);
      }}
      side="right"
      size="md"
      title={`Lampirkan SK dasar: ${judul}`}
      description={`${aturan.length} aturan. Tiap aturan diperiksa kewenangannya sendiri; isi aturan tidak berubah.`}
      footer={
        <Button
          loading={kirim}
          disabled={!sk}
          onClick={async () => {
            setKirim(true);
            try {
              const r = await siakad.request<NonNullable<typeof hasil>>({ method: 'POST', path: '/v1/aturan/dasar-sk/massal', body: { aturan, sk_dasar_id: sk } });
              setHasil(r.data);
              invalidateSiakad('aturan');
              toast.add({ title: `${r.data.berhasil} aturan kini berdasar SK`, type: r.data.gagal ? 'warning' : 'success' });
            } catch (e) {
              toast.add({ title: 'Gagal', description: pesanGalat(e), type: 'error' });
            } finally {
              setKirim(false);
            }
          }}
        >
          <FileBadge /> Lampirkan
        </Button>
      }
    >
      <div className="u-ask-panel">
        <PemilihSkDasar aturanId={aturan.length === 1 ? aturan[0] : null} value={sk} onValueChange={(id) => setSk(id)} />
        {hasil && (
          <ul className="u-ask-hasil">
            {hasil.hasil.map((h) => (
              <li key={h.id} data-ok={h.ok ? '' : undefined}>
                {h.ok ? <CircleCheck aria-hidden /> : <Ban aria-hidden />} {h.nama}
                {h.pesan ? <span className="u-ask-sub"> {h.pesan}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}

function PanelTinjauDasar({ baris, open, onOpenChange }: { baris: BarisDasarSk; open: boolean; onOpenChange: (o: boolean) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [k, setK] = React.useState<'ganti' | 'tetap' | 'nonaktifkan'>('ganti');
  const [sk, setSk] = React.useState<string | null>(null);
  const [catatan, setCatatan] = React.useState('');
  const [galat, setGalat] = React.useState<string | null>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      size="md"
      title={`Tinjau ulang: ${baris.nama}`}
      description={`SK dasar ${baris.dasar_sk.sk?.nomor ?? ''} ${baris.dasar_sk.status === 'diubah' ? 'telah diubah SK lain' : 'tidak berlaku lagi'}. Aturan tetap berlaku sampai Anda memutuskan.`}
      footer={
        <Button
          variant={k === 'nonaktifkan' ? 'destructive' : 'primary'}
          onClick={async () => {
            setGalat(null);
            try {
              await siakad.request({ method: 'POST', path: `/v1/aturan/${baris.id}/dasar-sk/tinjau`, body: { keputusan: k, sk_dasar_id: sk, catatan } });
              invalidateSiakad('aturan');
              toast.add({ title: 'Tinjauan tersimpan', type: 'success' });
              onOpenChange(false);
            } catch (e) {
              setGalat(pesanGalat(e));
            }
          }}
        >
          Simpan keputusan
        </Button>
      }
    >
      <div className="u-ask-panel">
        <SegmentedControl
          fullWidth
          options={[
            { value: 'ganti', label: 'Ganti SK dasar' },
            { value: 'tetap', label: 'Tetap berlaku' },
            { value: 'nonaktifkan', label: 'Nonaktifkan' },
          ]}
          value={k}
          onValueChange={setK}
        />
        {k === 'ganti' ? (
          <PemilihSkDasar aturanId={baris.id} value={sk} onValueChange={(id) => setSk(id)} label="SK dasar pengganti" />
        ) : (
          <Field label="Alasan" required description="Minimal 10 karakter; tercatat di riwayat aturan.">
            <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder={k === 'tetap' ? 'mis. Menunggu SK pengganti dari Rektorat bulan depan' : 'mis. Ketentuan sudah tidak dipakai'} />
          </Field>
        )}
        {galat && <Alert variant="danger">{galat}</Alert>}
      </div>
    </Dialog>
  );
}

/** Aturan belum berdasar SK (berkelompok + lampirkan massal per kelompok) dan antrean tinjau ulang SK dicabut. */
export function DasarSkAturanDaftar({ kategori, awal = 'belum', className }: { kategori?: string; awal?: 'belum' | 'tinjau' | 'berlaku'; className?: string }) {
  const [status, setStatus] = React.useState<'belum' | 'tinjau' | 'berlaku'>(awal);
  const q = useDasarSkAturan({ status, kategori });
  const [lampir, setLampir] = React.useState<{ aturan: string[]; judul: string } | null>(null);
  const [tinjau, setTinjau] = React.useState<BarisDasarSk | null>(null);
  const j = q.data?.jumlah;
  return (
    <div className={cn('u-ask', className)}>
      <SegmentedControl
        options={[
          { value: 'belum', label: `Belum ada SK dasar${j ? ` (${j.belum})` : ''}` },
          { value: 'tinjau', label: `SK dasar dicabut/diubah${j ? ` (${j.tinjau})` : ''}` },
          { value: 'berlaku', label: `SK dasar berlaku${j ? ` (${j.berlaku})` : ''}` },
        ]}
        value={status}
        onValueChange={setStatus}
      />
      {q.error ? (
        <GalatAturan error={q.error} onRetry={q.refetch} />
      ) : !q.data ? (
        <Skeleton height={200} />
      ) : status === 'belum' ? (
        q.data.kelompok.length ? (
          <div className="u-ask-grid">
            {q.data.kelompok.map((k) => (
              <Card key={k.nama} className="u-ask-kartu">
                <div className="u-ask-kartu-kepala">
                  <div>
                    <strong>{k.nama}</strong>
                    <span className="u-ask-sub">{k.jumlah > 1 ? `${k.jumlah} aturan · ${k.unit.slice(0, 4).join(', ')}${k.unit.length > 4 ? ` +${k.unit.length - 4}` : ''}` : (k.unit[0] ?? '')}</span>
                  </div>
                </div>
                <div className="u-ask-kartu-aksi">
                  <Button size="sm" onClick={() => setLampir({ aturan: k.aturan, judul: k.jumlah > 1 ? `${k.nama} (${k.jumlah})` : k.nama })}>
                    <FileBadge /> Lampirkan SK dasar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty icon={<CircleCheck />} title="Semua aturan yang berlaku sudah punya SK dasar" />
        )
      ) : q.data.data.length ? (
        <ul className="u-ask-baris">
          {q.data.data.map((b) => (
            <li key={b.id}>
              <div>
                <strong>{b.nama}</strong>
                <span className="u-ask-sub">
                  {b.unit?.singkatan || b.unit?.nama} · {b.dasar_sk.sk ? `SK ${b.dasar_sk.sk.nomor}${b.dasar_sk.sk.penerbit ? ` (${b.dasar_sk.sk.penerbit})` : ''}` : ''}
                  {b.dasar_sk.ditandai_at ? ` · sejak ${b.dasar_sk.ditandai_at.slice(0, 10)}; aturan tetap berlaku sampai diputuskan` : ''}
                  {b.dasar_sk.catatan_tinjau ? ` · ${b.dasar_sk.catatan_tinjau}` : ''}
                </span>
              </div>
              <LencanaDasarSk dasar={b.dasar_sk} ringkas />
              {status === 'tinjau' && (
                <Button size="sm" variant="outline" onClick={() => setTinjau(b)}>
                  <RefreshCw /> Putuskan
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Empty icon={<CircleCheck />} title={status === 'tinjau' ? 'Tidak ada aturan yang perlu ditinjau' : 'Belum ada aturan berdasar SK'} />
      )}
      {lampir && <PanelLampirSkDasar open aturan={lampir.aturan} judul={lampir.judul} onOpenChange={(o) => !o && setLampir(null)} />}
      {tinjau && <PanelTinjauDasar open baris={tinjau} onOpenChange={(o) => !o && setTinjau(null)} />}
    </div>
  );
}

// ================================================================ Wizard templat berisian (pejabat)

const bawaanIsian = (t: TemplatKasus): Record<string, unknown> => Object.fromEntries(t.slot.map((s) => [s.kode, s.bawaan ?? (s.tipe === 'tabel' ? [] : '')]));

function IsianSlot({ s, value, onChange }: { s: SlotTemplat; value: unknown; onChange: (v: unknown) => void }) {
  if (s.tipe === 'tabel') {
    const rows = (value as Array<Record<string, unknown>>) ?? [];
    const setRow = (i: number, p: Record<string, unknown>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
    return (
      <Field label={s.label} description={s.petunjuk} required>
        <div className="u-ask-tabel" role="table" aria-label={s.label}>
          <div role="row" className="u-ask-tabel-kepala">
            {s.kolom!.map((k) => (
              <span key={k.kode} role="columnheader">
                {k.label}
              </span>
            ))}
            <span aria-hidden />
          </div>
          {rows.map((r, i) => (
            <div role="row" key={i}>
              {s.kolom!.map((k) => (
                <Input key={k.kode} inputMode={k.tipe === 'teks' ? 'text' : 'decimal'} value={String(r[k.kode] ?? '')} onChange={(e) => setRow(i, { [k.kode]: e.target.value })} placeholder={k.contoh ? `mis. ${k.contoh}` : k.opsional ? 'boleh kosong' : undefined} aria-label={`${k.label} baris ${i + 1}`} />
              ))}
              <Button variant="ghost" iconOnly size="sm" aria-label={`Hapus baris ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
                <X />
              </Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={() => onChange([...rows, {}])}>
            <Plus /> Tambah baris
          </Button>
        </div>
      </Field>
    );
  }
  if (s.tipe === 'pilihan') {
    return (
      <Field label={s.label} description={s.petunjuk} required>
        <SegmentedControl options={(s.opsi ?? []).map((o) => ({ value: o.nilai, label: o.label }))} value={String(value ?? '')} onValueChange={(v) => onChange(v)} aria-label={s.label} />
      </Field>
    );
  }
  if (s.tipe === 'ya_tidak') {
    const ya = value === true || value === 'ya' || value === '1';
    return (
      <Field label={s.label} description={s.petunjuk} required>
        <SegmentedControl options={[{ value: 'ya', label: 'Ya' }, { value: 'tidak', label: 'Tidak' }]} value={ya ? 'ya' : 'tidak'} onValueChange={(v) => onChange(v === 'ya')} aria-label={s.label} />
      </Field>
    );
  }
  if (s.tipe === 'periode') {
    return (
      <Field label={s.label} description={s.petunjuk ?? 'Tahun + 1 (ganjil) atau 2 (genap), mis. 20261 = 2026/2027 Ganjil.'} required>
        <Input inputMode="numeric" maxLength={5} value={String(value ?? '')} onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} placeholder={s.contoh ? `mis. ${s.contoh}` : undefined} />
      </Field>
    );
  }
  return (
    <Field label={s.label} description={s.petunjuk ?? (s.contoh ? `Contoh: ${s.contoh}${s.satuan ? ` ${s.satuan}` : ''}` : undefined)} required>
      <div className="u-ask-isian-satuan">
        <Input
          type={s.tipe === 'tanggal' ? 'date' : 'text'}
          inputMode={s.tipe === 'angka' || s.tipe === 'uang' ? 'decimal' : undefined}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={s.contoh ? `mis. ${s.contoh}` : undefined}
        />
        {s.satuan && <span>{s.satuan}</span>}
      </div>
    </Field>
  );
}

const angka = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v.replace(/\./g, '').replace(',', '.')) : NaN);
const cekSlot = (t: TemplatKasus, isian: Record<string, unknown>): string | null => {
  for (const s of t.slot) {
    const v = isian[s.kode];
    if (s.tipe === 'tabel') {
      const rows = (v as Array<Record<string, unknown>>) ?? [];
      if (!rows.length) return `${s.label}: isi minimal satu baris.`;
      for (const [i, r] of rows.entries())
        for (const k of s.kolom ?? []) {
          const x = r[k.kode];
          const kosong = x === '' || x === null || x === undefined;
          if (kosong && !k.opsional) return `${s.label} baris ${i + 1}: ${k.label} wajib diisi.`;
          if (!kosong && (k.tipe === 'angka' || k.tipe === 'uang') && Number.isNaN(angka(x))) return `${s.label} baris ${i + 1}: ${k.label} harus angka.`;
        }
      continue;
    }
    if (s.tipe === 'ya_tidak') continue;
    if (v === '' || v === null || v === undefined) return `${s.label} wajib diisi.`;
    if (s.tipe === 'periode' && !/^\d{5}$/.test(String(v))) return `${s.label} berupa 5 angka, mis. 20261.`;
    if ((s.tipe === 'angka' || s.tipe === 'uang') && Number.isNaN(angka(v))) return `${s.label} harus angka.`;
    const n = angka(v);
    if (s.tipe === 'angka' && ((s.min !== undefined && n < s.min) || (s.maks !== undefined && n > s.maks))) return `${s.label} harus antara ${s.min} dan ${s.maks}.`;
  }
  return null;
};

/**
 * Pejabat/unit membuat aturan dari templat berisian, tanpa menyusun logika: Jenis → Kasus → Isi kalimat → Berlaku
 * untuk → Dasar SK & validasi → Tinjau. Disimpan sebagai draf lalu langsung diajukan dengan SK dasar.
 */
export function WizardTemplatAturan({
  open,
  onOpenChange,
  fakultas,
  onTersimpan,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Kunci ke satu fakultas (portal Fakultas). */
  fakultas?: string | null;
  onTersimpan?: (id: string) => void;
}) {
  const kat = useTemplatAturan();
  const fak = useFakultasReferensi();
  const [langkah, setLangkah] = React.useState(0);
  const [jenis, setJenis] = React.useState<string | null>(null);
  const [kasus, setKasus] = React.useState<TemplatKasus | null>(null);
  const [isian, setIsian] = React.useState<Record<string, unknown>>({});
  const [fakPilih, setFakPilih] = React.useState<string[]>(fakultas ? [fakultas] : []);
  const [prodiPilih, setProdiPilih] = React.useState<string[]>([]);
  const prodi = useProdiReferensi(fakPilih.length === 1 ? fakPilih[0] : null);
  const [nama, setNama] = React.useState('');
  const [sk, setSk] = React.useState<string | null>(null);
  const [simpanSaja, setSimpanSaja] = React.useState(false);
  const [hasilSk, setHasilSk] = React.useState<HasilPeriksaSkDasar | null>(null);
  // Draf yang sudah dibuat (mis. ajuan pertama ditolak karena SK): ajuan ulang memakai draf ini, tidak membuat ganda.
  const [draf, setDraf] = React.useState<string | null>(null);
  const siakad = useSiakad();
  const toast = useToast();
  const sayaQ = useAkunSaya({ foto: false });
  const cakupan = prodiPilih.length ? { prodi: prodiPilih } : fakPilih.length ? { fakultas: fakPilih } : {};
  const sim = useSimulasiRantai(open && langkah >= 4 && kasus ? unitDariCakupan(cakupan) : null, kasus?.kategori ?? null, sayaQ.data?.akun.username ?? null);
  React.useEffect(() => {
    if (!open) {
      setLangkah(0);
      setJenis(null);
      setKasus(null);
      setIsian({});
      setSk(null);
      setNama('');
      setProdiPilih([]);
      setFakPilih(fakultas ? [fakultas] : []);
      setDraf(null);
      setHasilSk(null);
    }
  }, [open, fakultas]);
  const j = kat.data?.jenis.find((x) => x.kode === jenis);
  return (
    <PanelLangkah
      open={open}
      onOpenChange={onOpenChange}
      step={langkah}
      onStepChange={setLangkah}
      size="xl"
      title="Buat aturan dari contoh"
      description="Pilih kasus yang sesuai lalu isi angkanya. Logika aturan sudah disiapkan; Anda cukup mengisi kalimat."
      finishLabel={simpanSaja ? 'Simpan draf' : 'Simpan & ajukan'}
      steps={[
        {
          id: 'jenis',
          title: 'Jenis',
          description: 'Aturan tentang apa?',
          validate: () => (jenis ? null : 'Pilih jenis aturan.'),
          content: !kat.data ? (
            <Skeleton height={240} />
          ) : (
            <div className="u-ask-jenis" role="radiogroup" aria-label="Jenis aturan">
              {kat.data.jenis.map((x) => (
                <Tekan
                  key={x.kode}
                  role="radio"
                  terpilih={jenis === x.kode}
                  className="u-ask-jenis-kartu"
                  data-pilih={jenis === x.kode ? '' : undefined}
                  onClick={() => {
                    setJenis(x.kode);
                    setKasus(null);
                  }}
                >
                  <strong>{x.judul}</strong>
                  <span>{x.keterangan}</span>
                  {!x.siap && <Badge variant="outline">Segera tersedia</Badge>}
                </Tekan>
              ))}
            </div>
          ),
        },
        {
          id: 'kasus',
          title: 'Kasus',
          description: 'Pilih contoh yang paling mirip dengan kebutuhan Anda.',
          validate: () => (!kasus ? 'Pilih kasus.' : kasus.siap ? null : 'Kasus ini segera tersedia; pilih kasus lain.'),
          content: (
            <div className="u-ask-kasus" role="radiogroup" aria-label="Kasus">
              {(j?.templat ?? []).map((t) => (
                <Tekan
                  key={t.kode}
                  role="radio"
                  terpilih={kasus?.kode === t.kode}
                  className="u-ask-jenis-kartu"
                  data-pilih={kasus?.kode === t.kode ? '' : undefined}
                  disabled={!t.siap}
                  onClick={() => {
                    setKasus(t);
                    setIsian(bawaanIsian(t));
                    setNama(t.judul);
                  }}
                >
                  <strong>
                    {t.judul} {!t.siap && <Badge variant="outline">Segera tersedia</Badge>}
                  </strong>
                  <KalimatTemplat templat={t} isian={bawaanIsian(t)} />
                  <span className="u-ask-sub">
                    Bila tidak dipenuhi: {t.akibat_label.toLowerCase()}
                    {t.titik_judul ? ` · diperiksa saat ${t.titik_judul.charAt(0).toLowerCase()}${t.titik_judul.slice(1)}` : ''}
                  </span>
                </Tekan>
              ))}
            </div>
          ),
        },
        {
          id: 'isi',
          title: 'Isi',
          description: 'Isi celah pada kalimat. Kalimat di atas diperbarui langsung.',
          validate: () => (kasus ? cekSlot(kasus, isian) : 'Pilih kasus.'),
          content: kasus ? (
            <div className="u-ask-form">
              <KalimatTemplat templat={kasus} isian={isian} className="u-ask-kalimat-besar" />
              {kasus.keterangan && <p className="u-ask-sub">{kasus.keterangan}</p>}
              {kasus.slot.length === 0 && <p className="u-ask-sub">Kasus ini tidak perlu isian.</p>}
              {kasus.slot.map((s) => (
                <IsianSlot key={s.kode} s={s} value={isian[s.kode]} onChange={(v) => setIsian((x) => ({ ...x, [s.kode]: v }))} />
              ))}
            </div>
          ) : null,
        },
        {
          id: 'cakupan',
          title: 'Lingkup',
          description: 'Aturan hanya berlaku di unit Anda; batasi ke fakultas atau prodi tertentu.',
          validate: () => (nama.trim().length >= 3 ? null : 'Beri nama aturan.'),
          content: (
            <div className="u-ask-form">
              <Field label="Nama aturan" required>
                <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. Batas SKS menurut IPS FIK" />
              </Field>
              {fakultas ? (
                <Field label="Fakultas" description="Aturan dari portal fakultas hanya berlaku di fakultas ini.">
                  <p className="u-ask-tetap">{rapikanNamaUnit(fak.data?.find((x) => x.kode_fakultas === fakultas)?.nama_fakultas ?? fakultas)}</p>
                </Field>
              ) : (
                <Field label="Fakultas" optional description="Kosong = semua fakultas (hanya untuk pengatur universitas).">
                  <PilihanBanyak
                    options={(fak.data ?? []).map((f) => ({ value: f.kode_fakultas, label: rapikanNamaUnit(f.nama_fakultas) }))}
                    value={fakPilih}
                    placeholder="Pilih…"
                    onValueChange={(v: string[]) => {
                      setFakPilih(v);
                      setProdiPilih([]);
                    }}
                  />
                </Field>
              )}
              {fakPilih.length === 1 && (
                <Field label="Prodi" optional description="Kosong = semua prodi di fakultas itu.">
                  <PilihanBanyak options={(prodi.data ?? []).map((p) => ({ value: p.kode_prodi, label: rapikanNamaUnit(p.nama_prodi) }))} value={prodiPilih} placeholder="Pilih…" onValueChange={(v: string[]) => setProdiPilih(v)} />
                </Field>
              )}
            </div>
          ),
        },
        {
          id: 'sk',
          title: 'SK dasar',
          description: 'SK pimpinan yang menjadi dasar aturan ini dan siapa yang akan memvalidasinya.',
          validate: () => (simpanSaja ? null : !sk ? 'Pilih SK dasar, atau centang "Simpan sebagai draf dulu".' : hasilSk && !hasilSk.ok ? hasilSk.masalah[0]?.pesan ?? 'SK ini belum bisa menjadi dasar aturan.' : null),
          content: (
            <div className="u-ask-form">
              <PemilihSkDasar
                value={sk}
                onValueChange={(id) => setSk(id)}
                onHasil={setHasilSk}
                rencana={{ unit: unitDariCakupan(cakupan), prodi: prodiPilih, fakultas: prodiPilih.length ? [] : fakPilih }}
                required={!simpanSaja}
              />
              <label className="u-ask-centang">
                <Checkbox checked={simpanSaja} onCheckedChange={(c) => setSimpanSaja(c)} /> Simpan sebagai draf dulu (ajukan nanti)
              </label>
              <section>
                <h4 className="u-ask-judul">
                  <GitBranch aria-hidden /> Yang akan memvalidasi
                </h4>
                {sim.loading ? <Skeleton height={96} /> : sim.data ? <PratinjauRantai rantai={sim.data} /> : null}
              </section>
            </div>
          ),
        },
        {
          id: 'tinjau',
          title: 'Tinjau',
          content: kasus ? (
            <div className="u-ask-form">
              <KalimatTemplat templat={kasus} isian={isian} className="u-ask-kalimat-besar" />
              <WizardReview
                sections={[
                  { title: 'Aturan', items: [{ label: 'Nama', value: nama }, { label: 'Jenis', value: j?.judul }, { label: 'Kasus', value: kasus.judul }], onEdit: () => setLangkah(1) },
                  {
                    title: 'Berlaku untuk',
                    items: [{ label: 'Lingkup', value: prodiPilih.length ? prodiPilih.map((p) => prodi.data?.find((x) => x.kode_prodi === p)?.nama_prodi ?? p).join(', ') : fakPilih.length ? fakPilih.map((f) => fak.data?.find((x) => x.kode_fakultas === f)?.nama_fakultas ?? f).join(', ') : 'Semua' }],
                    onEdit: () => setLangkah(3),
                  },
                  { title: 'SK dasar', items: [{ label: 'SK', value: hasilSk?.sk ? `${hasilSk.sk.nomor}${hasilSk.sk.perihal ? ` · ${hasilSk.sk.perihal}` : ''}${hasilSk.penerbit ? ` (${hasilSk.penerbit.nama})` : ''}` : simpanSaja ? 'Dipilih nanti saat mengajukan' : '–' }], onEdit: () => setLangkah(4), missing: !sk && !simpanSaja ? 'Belum dipilih' : undefined },
                  {
                    title: 'Yang memvalidasi',
                    items: (sim.data?.tahap ?? []).map((t) => ({ label: `${t.urut}. ${t.validator.map((v) => v.label_nyata ?? v.label).join(' / ')}`, value: t.orang.map((o) => o.nama ?? o.username).join(', ') || 'Belum ada orang' })),
                  },
                ]}
              />
              <Alert variant="info">Setelah disimpan, coba aturan pada mahasiswa contoh di tab “Uji” sebelum validator memutus.</Alert>
            </div>
          ) : null,
        },
      ]}
      onFinish={async () => {
        if (!kasus) return 'Pilih kasus.';
        let id: string | null = draf;
        try {
          if (!id) {
            const r = await siakad.request<{ id: string }>({ method: 'POST', path: '/v1/aturan/dari-templat', body: { templat: kasus.kode, isian, cakupan, nama } });
            id = r.data.id;
            setDraf(id);
          }
          if (!simpanSaja) await siakad.request({ method: 'POST', path: `/v1/aturan/${id}/ajukan`, body: { sk_dasar_id: sk } });
          invalidateSiakad('aturan');
          toast.add({ title: simpanSaja ? 'Draf aturan tersimpan' : 'Aturan diajukan untuk divalidasi', type: 'success' });
          onTersimpan?.(id);
        } catch (e) {
          invalidateSiakad('aturan');
          return id ? `Draf tersimpan, tetapi belum bisa diajukan: ${pesanGalat(e)}` : pesanGalat(e);
        }
      }}
    />
  );
}
