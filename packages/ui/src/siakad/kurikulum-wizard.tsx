'use client';
import * as React from 'react';
import { BookMarked, RotateCcw } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from '../components/actions';
import { Alert } from '../components/display';
import { Field, Input, SegmentedControl, Textarea } from '../components/forms';
import { Select } from '../components/select';
import { useSiakad, useSiakadQuery } from './provider';
import type { AturanKurikulumRow, DefinisiKerangka, IsiAturanKurikulum, IsianKerangka } from './kurikulum-aturan';

/*
 * Bahan bersama wizard kurikulum (identitas kurikulum, mata kuliah, peninjauan). Langkah dan isian wajib dibaca dari
 * ATURAN KURIKULUM BERVERSI yang berlaku untuk prodi (GET /v1/kurikulum-aturan?prodi= lalu /{id}): kerangka (bagian
 * profil lulusan, CPL, bahan kajian, CPMK, bagian dinamis), struktur SKS, isian MK wajib, dan perangkat. Tidak ada daftar
 * langkah tetap per kerangka di kode: kerangka baru (data) otomatis membentuk langkah wizard.
 *
 *   useAturanKurikulumBerlaku   versi aturan + definisi kerangka yang berlaku untuk satu kurikulum/prodi/angkatan
 *   RujukanAturan               kotak "Mengikuti aturan …" di langkah pertama wizard
 *   IsianKerangkaDinamis        isian bagian kerangka non-primitif (teks, angka, pilihan, ya/tidak, daftar)
 *   bacaDraf/tulisDraf/hapusDraf  draf isian wizard di localStorage (tidak hilang bila panel tertutup)
 */

const BASIS = '/v1/kurikulum-aturan';

type DetailAturan = AturanKurikulumRow & {
  isi?: Partial<IsiAturanKurikulum>;
  kerangka_definisi?: { id: number; nama: string; versi: number; isi: DefinisiKerangka } | null;
};

export interface BagianKerangka {
  kode: string;
  nama: string;
  urutan: number;
  primitif: boolean;
  isian: IsianKerangka[];
}

export interface AturanKurikulumBerlaku {
  /** Masih memuat daftar/detail aturan. */
  memuat: boolean;
  galat: Error | null;
  /** Versi aturan yang dipakai; null = belum ada aturan berversi (ketentuan jenjang). */
  versi: AturanKurikulumRow | null;
  isi: Partial<IsiAturanKurikulum> | null;
  definisi: DefinisiKerangka | null;
  /** Nama kerangka, mis. "Outcome-Based Education (OBE)". */
  kerangka: string | null;
  obe: boolean;
  /** Bagian kerangka yang aktif, berurutan. */
  bagian: BagianKerangka[];
  /** Bagian kerangka berkode `kode` bila aktif. Tanpa aturan: null. */
  punya: (kode: string) => BagianKerangka | null;
  /** Kode isian MK yang diwajibkan aturan (mata_kuliah.isian_wajib). */
  isianMkWajib: string[];
  /** Teks rujukan singkat: "Aturan Kurikulum 2025 v2 · kerangka OBE · SK 112/…". */
  rujukan: string | null;
  /** Rujukan pasal dari isi.rujukan berkode `kode` (mis. struktur, obe). */
  pasal: (kode: string) => string | null;
  /** Batas SKS semester `s` menurut aturan; null = aturan tidak mengatur. */
  maksSksSemester: (s: number) => number | null;
}

const q =
  <T,>(path: string, query?: Record<string, string | number | undefined | null>) =>
  (s: ReturnType<typeof useSiakad>, signal: AbortSignal) =>
    s.request<T>({ method: 'GET', path, query: query ? Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])) : undefined }, { signal });

const cocokAngkatan = (r: Pick<AturanKurikulumRow, 'angkatan_mulai' | 'angkatan_selesai'>, a: number | undefined) =>
  a == null || ((r.angkatan_mulai == null || r.angkatan_mulai <= a) && (r.angkatan_selesai == null || a <= r.angkatan_selesai));

/**
 * Pilih versi aturan untuk satu kurikulum: (1) versi prodi yang terkait kurikulum ini (terbit, lalu draf), (2) versi
 * terbit prodi/fakultas/universitas yang rentang angkatannya mencakup `angkatan` (lingkup tersempit, angkatan mulai
 * terbaru), (3) versi yang berlaku sekarang. Tanpa versi = null (ketentuan jenjang).
 */
export function pilihVersiAturan(rows: AturanKurikulumRow[], kurikulumId?: number | null, angkatan?: number): AturanKurikulumRow | null {
  const milik = rows.filter((r) => kurikulumId != null && r.kurikulum_id === kurikulumId && r.status !== 'arsip');
  const terbitDulu = (a: AturanKurikulumRow, b: AturanKurikulumRow) => (a.status === b.status ? b.versi - a.versi : a.status === 'terbit' ? -1 : 1);
  if (milik.length) return [...milik].sort(terbitDulu)[0]!;
  const sempit: Record<string, number> = { prodi: 0, fakultas: 1, universitas: 2 };
  const terbit = rows
    .filter((r) => r.status === 'terbit' && cocokAngkatan(r, angkatan))
    .sort((a, b) => (sempit[a.lingkup] ?? 3) - (sempit[b.lingkup] ?? 3) || (b.angkatan_mulai ?? 0) - (a.angkatan_mulai ?? 0) || b.id - a.id);
  if (terbit.length) return terbit[0]!;
  return rows.find((r) => r.berlaku_sekarang) ?? null;
}

/** Aturan kurikulum berversi yang berlaku untuk kurikulum/prodi/angkatan ini, siap dipakai wizard. */
export function useAturanKurikulumBerlaku({ prodi, kurikulumId, angkatan, aktif = true }: { prodi?: string | null; kurikulumId?: number | null; angkatan?: number; aktif?: boolean }): AturanKurikulumBerlaku {
  const daftar = useSiakadQuery<AturanKurikulumRow[]>(['kurikulum-aturan', 'daftar', 'prodi', prodi], q(BASIS, { prodi }), { enabled: aktif && !!prodi, staleTime: 60_000 });
  const rows = Array.isArray(daftar.data) ? daftar.data : [];
  const versi = React.useMemo(() => pilihVersiAturan(rows, kurikulumId, angkatan), [rows, kurikulumId, angkatan]);
  const detail = useSiakadQuery<DetailAturan>(['kurikulum-aturan', 'detail', versi?.id], q(`${BASIS}/${versi?.id}`), { enabled: aktif && !!versi, staleTime: 60_000 });
  const d = versi && detail.data?.id === versi.id ? detail.data : null;
  return React.useMemo(() => {
    const isi = d?.isi ?? null;
    const definisi = d?.kerangka_definisi?.isi ?? null;
    const bagian: BagianKerangka[] = (definisi?.bagian ?? [])
      .filter((b) => b.aktif !== false)
      .map((b) => ({ kode: b.kode, nama: b.nama, urutan: b.urutan ?? 0, primitif: !!b.primitif, isian: b.isian ?? [] }))
      .sort((a, b) => a.urutan - b.urutan);
    const kerangka = versi?.kerangka_nama ?? d?.kerangka_definisi?.nama ?? null;
    const sk = versi?.sk?.nomor ? `SK ${versi.sk.nomor}` : versi?.dasar_hukum || null;
    const rujukan = versi ? [`${versi.nama} v${versi.versi}`, kerangka ? `kerangka ${kerangka}` : null, sk].filter(Boolean).join(' · ') : null;
    const semester = isi?.struktur?.sks_semester ?? [];
    return {
      memuat: (!!prodi && aktif && daftar.loading && !daftar.data) || (!!versi && aktif && !d && !detail.error),
      galat: daftar.error ?? detail.error ?? null,
      versi,
      isi,
      definisi,
      kerangka,
      obe: !!isi?.obe?.aktif,
      bagian,
      punya: (kode: string) => bagian.find((b) => b.kode === kode) ?? null,
      isianMkWajib: isi?.mata_kuliah?.isian_wajib ?? [],
      rujukan,
      pasal: (kode: string) => {
        const r = (isi?.rujukan ?? []).find((x) => x.kode === kode);
        return r ? [r.pedoman, r.pasal].filter(Boolean).join(' ') : null;
      },
      maksSksSemester: (s: number) => semester.find((x) => x.dari <= s && (x.sampai == null || s <= x.sampai))?.maks ?? null,
    };
  }, [d, versi, prodi, aktif, daftar.loading, daftar.data, daftar.error, detail.error]);
}

/** Kalimat bantuan "Wajib menurut …" untuk isian/langkah yang diwajibkan aturan. */
export const wajibMenurut = (a: Pick<AturanKurikulumBerlaku, 'rujukan'>, tambahan?: string | null) =>
  a.rujukan ? `Wajib menurut ${a.rujukan}${tambahan ? ` (${tambahan})` : ''}.` : 'Wajib.';

/** Kotak di langkah pertama: aturan yang diikuti wizard ini dan dampaknya. */
export function RujukanAturan({ aturan: a, prodiDipilih = true, className }: { aturan: AturanKurikulumBerlaku; prodiDipilih?: boolean; className?: string }) {
  if (!prodiDipilih) return null;
  if (a.memuat) return <p className={cn('u-kw-rujukan', className)} data-memuat="">Memuat aturan kurikulum yang berlaku…</p>;
  if (a.galat) return <Alert variant="warning" title="Aturan kurikulum tidak bisa dimuat" className={className}>Isian mengikuti ketentuan jenjang. {a.galat.message}</Alert>;
  if (!a.versi)
    return (
      <Alert variant="warning" title="Belum ada aturan kurikulum berversi" className={className}>
        Belum ada versi aturan yang berlaku untuk prodi dan tahun ini. Isian mengikuti ketentuan jenjang; bagian kurikulum ditampilkan tanpa kewajiban.
      </Alert>
    );
  const bagian = a.bagian.filter((b) => ['profil_lulusan', 'cpl', 'bahan_kajian', 'cpmk'].includes(b.kode) || !b.primitif);
  return (
    <div className={cn('u-kw-rujukan', className)}>
      <BookMarked aria-hidden />
      <div>
        <strong>Mengikuti {a.versi.nama} v{a.versi.versi}</strong>
        <span>
          {a.kerangka ? `Kerangka ${a.kerangka}` : 'Tanpa kerangka'}
          {a.versi.sk?.nomor ? ` · SK ${a.versi.sk.nomor}` : a.versi.dasar_hukum ? ` · ${a.versi.dasar_hukum}` : ''}
          {a.versi.status === 'draf' ? ' · masih draf' : ''}
        </span>
        {bagian.length ? <span>Bagian yang dituntut: {bagian.map((b) => b.nama).join(', ')}.</span> : <span>Kerangka ini tidak menuntut profil lulusan, CPL, atau bahan kajian.</span>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ isian dinamis kerangka
/** Jenis isian yang bisa diisi langsung di wizard; berkas/tabel/relasi tetap di ruang kerja kurikulum. */
const JENIS_LANGSUNG = ['teks', 'teks_panjang', 'angka', 'pilihan', 'ya_tidak', 'daftar'];
const kosong = (v: unknown) => v == null || v === '' || (Array.isArray(v) && v.length === 0);

/** Periksa nilai isian kerangka; kembalikan pesan pertama yang gagal. */
export function periksaIsianKerangka(isian: IsianKerangka[], nilai: Record<string, unknown>): string | null {
  for (const i of isian) {
    if (!JENIS_LANGSUNG.includes(i.jenis)) continue;
    const v = nilai[i.kode];
    if (kosong(v)) {
      if (i.wajib) return `Isi "${i.nama}".`;
      continue;
    }
    if (i.jenis === 'angka') {
      const x = Number(v);
      if (!Number.isFinite(x)) return `"${i.nama}" harus angka.`;
      if (i.min != null && x < i.min) return `"${i.nama}" paling kecil ${i.min}.`;
      if (i.maks != null && x > i.maks) return `"${i.nama}" paling besar ${i.maks}.`;
    }
  }
  return null;
}

/** Isian satu bagian kerangka dari skema data (teks, teks panjang, angka, pilihan, ya/tidak, daftar). */
export function IsianKerangkaDinamis({ isian, nilai, onChange, rujukan, galat = {}, disabled }: { isian: IsianKerangka[]; nilai: Record<string, unknown>; onChange: (kode: string, v: unknown) => void; rujukan?: string | null; galat?: Record<string, string>; disabled?: boolean }) {
  return (
    <>
      {isian.map((i) => {
        const v = nilai[i.kode];
        const bantuan = [i.keterangan, i.wajib && rujukan ? `Wajib menurut ${rujukan}.` : null].filter(Boolean).join(' ');
        const umum = { key: i.kode, label: i.nama, required: i.wajib, optional: !i.wajib, error: galat[i.kode], description: bantuan || undefined };
        if (!JENIS_LANGSUNG.includes(i.jenis))
          return (
            <Field {...umum} required={false} optional={false} description={`${bantuan ? `${bantuan} ` : ''}Isian jenis ${i.jenis} dilengkapi di ruang kerja kurikulum.`}>
              <Input value={Array.isArray(v) ? `${v.length} baris` : v ? String(v) : ''} disabled placeholder="Diisi di ruang kerja" />
            </Field>
          );
        if (i.jenis === 'teks_panjang')
          return (
            <Field {...umum}>
              <Textarea rows={3} disabled={disabled} value={(v as string) ?? ''} onChange={(e) => onChange(i.kode, e.target.value)} />
            </Field>
          );
        if (i.jenis === 'angka')
          return (
            <Field {...umum}>
              <Input type="number" inputMode="decimal" min={i.min ?? undefined} max={i.maks ?? undefined} disabled={disabled} value={v == null ? '' : String(v)} onChange={(e) => onChange(i.kode, e.target.value === '' ? null : Number(e.target.value))} />
            </Field>
          );
        if (i.jenis === 'pilihan')
          return (
            <Field {...umum}>
              <Select options={i.pilihan.map((p) => ({ value: p, label: p }))} value={(v as string) || null} onValueChange={(x) => onChange(i.kode, x ? String(x) : null)} placeholder="Pilih…" disabled={disabled} />
            </Field>
          );
        if (i.jenis === 'ya_tidak')
          return (
            <Field {...umum}>
              <SegmentedControl<string>
                options={[
                  { value: 'ya', label: 'Ya' },
                  { value: 'tidak', label: 'Tidak' },
                ]}
                value={v === true ? 'ya' : v === false ? 'tidak' : ''}
                onValueChange={(x) => onChange(i.kode, x === 'ya')}
                aria-label={i.nama}
              />
            </Field>
          );
        if (i.jenis === 'daftar')
          return (
            <Field {...umum} description={[bantuan, 'Satu butir per baris.'].filter(Boolean).join(' ')}>
              <Textarea rows={3} disabled={disabled} value={Array.isArray(v) ? (v as unknown[]).map(String).join('\n') : ''} onChange={(e) => onChange(i.kode, e.target.value.split('\n').map((s) => s.trimEnd()).filter((s, k, all) => s !== '' || k < all.length - 1))} />
            </Field>
          );
        return (
          <Field {...umum}>
            <Input disabled={disabled} value={(v as string) ?? ''} onChange={(e) => onChange(i.kode, e.target.value)} />
          </Field>
        );
      })}
    </>
  );
}

/** Ringkas nilai isian kerangka untuk WizardReview. */
export function ringkasNilaiIsian(i: IsianKerangka, v: unknown): string {
  if (kosong(v)) return '';
  if (i.jenis === 'ya_tidak') return v ? 'Ya' : 'Tidak';
  if (Array.isArray(v)) return v.filter((x) => x !== '').map(String).join('; ');
  const s = String(v);
  return s.length > 160 ? `${s.slice(0, 157)}…` : s;
}

/** Bersihkan nilai daftar (baris kosong) sebelum dikirim. */
export const nilaiKirim = (v: unknown) => (Array.isArray(v) ? v.filter((x) => x !== '') : v);

// ------------------------------------------------------------------ draf wizard (localStorage)
const AWALAN = 'unipo:draf-wizard:';
export function bacaDraf<T>(kunci: string): { nilai: T; waktu: number } | null {
  try {
    const s = globalThis.localStorage?.getItem(AWALAN + kunci);
    return s ? (JSON.parse(s) as { nilai: T; waktu: number }) : null;
  } catch {
    return null;
  }
}
export function tulisDraf<T>(kunci: string, nilai: T) {
  try {
    globalThis.localStorage?.setItem(AWALAN + kunci, JSON.stringify({ nilai, waktu: Date.now() }));
  } catch {
    /* penyimpanan penuh/diblokir: abaikan */
  }
}
export function hapusDraf(kunci: string) {
  try {
    globalThis.localStorage?.removeItem(AWALAN + kunci);
  } catch {
    /* abaikan */
  }
}

/**
 * Draf isian wizard: saat panel dibuka, isian terakhir yang belum disimpan dipulihkan (`pulihkan`), lalu setiap perubahan
 * ditulis ulang (jeda 400 ms). Panggil `selesai()` setelah tersimpan agar draf dibuang.
 */
export function useDrafWizard<T>(kunci: string | null, open: boolean, nilai: T, pulihkan: (v: T) => void, sama: (v: T) => boolean) {
  const [dipulihkan, setDipulihkan] = React.useState<number | null>(null);
  const siap = React.useRef(false);
  const pulihRef = React.useRef(pulihkan);
  pulihRef.current = pulihkan;
  React.useEffect(() => {
    siap.current = false;
    setDipulihkan(null);
    if (!open || !kunci) return;
    const d = bacaDraf<T>(kunci);
    if (d) {
      pulihRef.current(d.nilai);
      setDipulihkan(d.waktu);
    }
    const t = setTimeout(() => (siap.current = true), 0);
    return () => clearTimeout(t);
  }, [open, kunci]);
  React.useEffect(() => {
    if (!open || !kunci || !siap.current) return;
    const t = setTimeout(() => (sama(nilai) ? hapusDraf(kunci) : tulisDraf(kunci, nilai)), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nilai, open, kunci]);
  return {
    dipulihkan,
    selesai: () => {
      if (kunci) hapusDraf(kunci);
      setDipulihkan(null);
    },
    buang: () => {
      if (kunci) hapusDraf(kunci);
      setDipulihkan(null);
    },
  };
}

/** Pemberitahuan draf dipulihkan + tombol mulai ulang. */
export function DrafDipulihkan({ waktu, onBuang }: { waktu: number | null; onBuang: () => void }) {
  if (!waktu) return null;
  const jam = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(waktu));
  return (
    <div className="u-kw-draf" role="status">
      <span>Isian yang belum disimpan ({jam}) dipulihkan.</span>
      <Button size="sm" variant="ghost" onClick={onBuang}>
        <RotateCcw /> Mulai ulang
      </Button>
    </div>
  );
}
