import type { BadgeVariant } from '../../components/actions';
import { useSiakadQuery } from '../provider';
import type { SkalaNilai } from '../alur';

/*
 * Skala nilai dan predikat kelulusan selalu dari server (m_nilai lewat GET /v1/referensi/skala-nilai, m_predikat lewat
 * GET /v1/kelulusan/predikat). Komponen akademik tidak menyimpan daftar huruf, bobot, atau rentang IPK sendiri: tanpa
 * skala, lencana nilai tampil netral dan predikat tidak ditebak.
 */

/** Satu baris GET /v1/referensi/skala-nilai (tabel m_nilai). */
export interface BarisSkalaNilai {
  idn?: number | null;
  kode_prodi?: string | null;
  kode_jenjang?: string | null;
  tahun_id?: string | null;
  nilai: string;
  bobot: number | string | null;
  lulus?: boolean | number | string | null;
  nilai_min?: number | string | null;
  nilai_max?: number | string | null;
}

/** Satu baris GET /v1/kelulusan/predikat (tabel m_predikat). */
export interface PredikatKelulusan {
  predikat: string;
  bobot_min: number | string;
  bobot_max: number | string;
  kode_jenjang?: string | null;
  [kolom: string]: unknown;
}

/** Skala dari server dalam bentuk apa pun yang sudah dipakai unipo-ui (m_nilai, SkalaNilai alur, SkalaNilaiKurikulum). */
export type SumberSkala = ReadonlyArray<BarisSkalaNilai | SkalaNilai | { huruf: string; bobot: number; min: number; maks: number; lulus: boolean }>;

const angka = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const benar = (v: unknown) => v === true || v === 1 || v === '1' || v === 'Y' || v === 'y' || v === 'true';

/**
 * Pilih skala yang berlaku untuk satu prodi dan periode dari baris m_nilai: baris prodi itu (atau baris umum tanpa
 * prodi bila prodi tidak punya skala sendiri), versi `tahun_id` terbaru yang tidak melewati `tahunId`.
 */
export function skalaBerlaku(baris: ReadonlyArray<BarisSkalaNilai>, opsi: { prodi?: string | null; tahunId?: string | null } = {}): SkalaNilai[] {
  const prodi = opsi.prodi ?? null;
  const milikProdi = prodi ? baris.filter((b) => (b.kode_prodi ?? '') === prodi) : [];
  const calon = milikProdi.length ? milikProdi : prodi ? baris.filter((b) => !b.kode_prodi) : baris;
  const sumber = calon.length ? calon : baris;
  const versi = [...new Set(sumber.map((b) => b.tahun_id ?? ''))].sort();
  const batas = opsi.tahunId ?? null;
  const dipakai = batas ? (versi.findLast((v) => !v || v <= batas) ?? versi[0]) : versi[versi.length - 1];
  const hasil = new Map<string, SkalaNilai>();
  for (const b of sumber) {
    if ((b.tahun_id ?? '') !== (dipakai ?? '')) continue;
    const huruf = String(b.nilai ?? '').trim();
    if (!huruf || hasil.has(huruf.toUpperCase())) continue;
    hasil.set(huruf.toUpperCase(), { huruf, bobot: angka(b.bobot), min: angka(b.nilai_min), max: angka(b.nilai_max), lulus: b.lulus == null ? angka(b.bobot) > 0 : benar(b.lulus) });
  }
  return urutkanSkala([...hasil.values()]);
}

/** Samakan bentuk skala (m_nilai, SkalaNilai, SkalaNilaiKurikulum) lalu urutkan dari bobot tertinggi. */
export function normalSkala(skala: SumberSkala | null | undefined): SkalaNilai[] {
  if (!skala?.length) return [];
  const pertama = skala[0] as Record<string, unknown>;
  if ('nilai' in pertama && !('huruf' in pertama)) return skalaBerlaku(skala as BarisSkalaNilai[]);
  return urutkanSkala(
    (skala as unknown as ReadonlyArray<Record<string, unknown>>).map((s) => ({
      huruf: String(s.huruf ?? ''),
      bobot: angka(s.bobot),
      min: angka(s.min),
      max: angka(s.max ?? s.maks),
      lulus: s.lulus == null ? angka(s.bobot) > 0 : benar(s.lulus),
    })),
  );
}

const urutkanSkala = (s: SkalaNilai[]) => s.filter((x) => x.huruf).sort((a, b) => b.bobot - a.bobot || b.min - a.min);

/** Cari baris skala untuk huruf nilai (tanpa beda besar-kecil huruf). */
export function cariSkala(huruf: string | null | undefined, skala: ReadonlyArray<SkalaNilai>): SkalaNilai | null {
  const h = (huruf ?? '').trim().toUpperCase();
  if (!h) return null;
  return skala.find((s) => s.huruf.toUpperCase() === h) ?? null;
}

export type NadaNilai = 'success' | 'primary' | 'warning' | 'danger' | 'neutral';

/**
 * Nada warna untuk huruf nilai menurut posisinya di skala server: tidak lulus → merah; sisanya dibagi menurut bobot
 * relatif terhadap bobot lulus terendah dan tertinggi (atas hijau, tengah biru, bawah kuning). Tanpa skala → netral.
 */
export function nadaNilai(huruf: string | null | undefined, skala: ReadonlyArray<SkalaNilai>): NadaNilai {
  const s = cariSkala(huruf, skala);
  if (!s) return 'neutral';
  if (!s.lulus) return 'danger';
  const lulus = skala.filter((x) => x.lulus).map((x) => x.bobot);
  const lo = Math.min(...lulus);
  const hi = Math.max(...lulus);
  const r = hi > lo ? (s.bobot - lo) / (hi - lo) : 1;
  return r >= 0.75 ? 'success' : r >= 0.35 ? 'primary' : 'warning';
}

export const varianNada = (n: NadaNilai): BadgeVariant => n;

/**
 * Predikat kelulusan untuk IPK dari daftar m_predikat (rentang bobot_min–bobot_max). `jenjang` menyaring baris per
 * jenjang bila server mengirim kode_jenjang. Kembali null bila daftar kosong atau IPK di luar semua rentang.
 */
export function predikatDariIpk(ipk: number | string | null | undefined, daftar: ReadonlyArray<PredikatKelulusan> | null | undefined, jenjang?: string | null): string | null {
  if (ipk == null || ipk === '' || !daftar?.length) return null;
  const n = Math.round(angka(ipk) * 100) / 100;
  const perJenjang = jenjang ? daftar.filter((p) => !p.kode_jenjang || p.kode_jenjang === jenjang) : daftar;
  const cocok = perJenjang.toSorted((a, b) => angka(b.bobot_min) - angka(a.bobot_min)).find((p) => n >= angka(p.bobot_min) && n <= angka(p.bobot_max));
  return cocok?.predikat ?? null;
}

/** Skala nilai yang berlaku untuk prodi (dan periode) dari GET /v1/referensi/skala-nilai. Scope referensi:read. */
export function useSkalaNilai(opsi: { prodi?: string | null; tahunId?: string | null; enabled?: boolean } = {}) {
  const q = useSiakadQuery<BarisSkalaNilai[]>(
    ['referensi', 'skala-nilai', opsi.prodi ?? ''],
    (s, signal) => s.request<BarisSkalaNilai[]>({ method: 'GET', path: '/v1/referensi/skala-nilai', query: opsi.prodi ? { prodi: opsi.prodi } : undefined }, { signal }),
    { staleTime: 10 * 60_000, enabled: opsi.enabled !== false },
  );
  const skala = q.data ? skalaBerlaku(q.data, { prodi: opsi.prodi, tahunId: opsi.tahunId }) : undefined;
  return { ...q, skala };
}

/** Daftar predikat kelulusan (m_predikat) dari GET /v1/kelulusan/predikat. Scope kelulusan:read. */
export function usePredikatKelulusan(opsi: { enabled?: boolean } = {}) {
  return useSiakadQuery<PredikatKelulusan[]>(
    ['kelulusan', 'predikat'],
    (s, signal) => s.request<PredikatKelulusan[]>({ method: 'GET', path: '/v1/kelulusan/predikat' }, { signal }),
    { staleTime: 10 * 60_000, enabled: opsi.enabled !== false },
  );
}
