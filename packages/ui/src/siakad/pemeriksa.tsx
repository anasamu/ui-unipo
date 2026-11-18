'use client';
import * as React from 'react';
import { Ban, Building2, CircleCheck, CircleDashed, CircleX, GraduationCap, Hourglass, KeyRound, Landmark, ShieldCheck, SkipForward, UserCheck, UsersRound, Wallet } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Skeleton, type BadgeVariant } from '../components/actions';
import { useSiakadQuery } from './provider';

/*
 * Alur pemeriksa usulan/pengajuan (SIAKAD docs/PEMERIKSA.md). Setiap API usulan mengembalikan `pemeriksa`: daftar tahap
 * {tahap, unit, peran, status, diproses_oleh, waktu, catatan}. Komponen di sini menampilkannya seragam di semua aplikasi
 * supaya pengusul tahu siapa yang berhak memeriksa usulannya:
 *
 *   LabelPemeriksa      lencana ringkas di daftar: "Menunggu Biro SDM", "Ditolak BAAK", "Selesai diperiksa"
 *   AlurPemeriksa       alur lengkap di detail/panel: unit tiap tahap, status, nama petugas dan waktu bila sudah diproses
 *   PratinjauPemeriksa  di formulir sebelum kirim: "Usulan ini akan diperiksa oleh: 1. Biro SDM 2. Pustikom (hak akses)"
 */

export type StatusTahapPemeriksa = 'menunggu' | 'sedang' | 'selesai' | 'ditolak' | 'dilewati';

export interface TahapPemeriksa {
  tahap: string;
  urut: number;
  judul: string;
  unit: string;
  peran?: string | null;
  status: StatusTahapPemeriksa;
  diproses_oleh?: string | null;
  username?: string | null;
  waktu?: string | null;
  catatan?: string | null;
  opsional?: boolean;
  otomatis?: boolean;
  keterangan?: string | null;
  /** Usulan dibatalkan (pengusul) sebelum tahap ini diperiksa. */
  batal?: boolean;
}

/** Katalog satu jenis (GET /v1/pemeriksa/alur/{jenis}). */
export interface AlurPemeriksaJenis {
  jenis: string;
  judul: string;
  kelompok: string;
  aplikasi: string[];
  tahap: Omit<TahapPemeriksa, 'status' | 'diproses_oleh' | 'waktu' | 'catatan'>[];
}

const LABEL: Record<StatusTahapPemeriksa, [string, BadgeVariant]> = {
  menunggu: ['Belum giliran', 'neutral'],
  sedang: ['Sedang diperiksa', 'warning'],
  selesai: ['Selesai', 'success'],
  ditolak: ['Ditolak', 'danger'],
  dilewati: ['Dilewati', 'neutral'],
};

/** Ikon unit pemeriksa dari namanya (Biro SDM, Pustikom, BAAK, BAUK, dosen/atasan, pimpinan). */
export function IkonUnitPemeriksa({ unit, tahap }: { unit: string; tahap?: string }) {
  const u = unit.toLowerCase();
  if (tahap === 'hak_akses') return <KeyRound aria-hidden />;
  if (u.includes('sdm')) return <UsersRound aria-hidden />;
  if (u.includes('pustikom')) return <ShieldCheck aria-hidden />;
  if (u.includes('bauk') || u.includes('keuangan')) return <Wallet aria-hidden />;
  if (u.includes('baak') || u.includes('prodi') || u.includes('program studi')) return <GraduationCap aria-hidden />;
  if (u.includes('dosen') || u.includes('atasan') || u.includes('pembimbing') || u.includes('kaprodi') || u.includes('dekan')) return <UserCheck aria-hidden />;
  if (u.includes('rektor') || u.includes('lldikti')) return <Landmark aria-hidden />;
  return <Building2 aria-hidden />;
}

const waktu = (s: string | null | undefined) => {
  if (!s) return null;
  const d = new Date(s.length <= 10 ? `${s}T00:00:00` : s.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const namaUnit = (t: Pick<TahapPemeriksa, 'unit' | 'judul'>) => (t.unit && t.unit.trim() !== '' ? t.unit : t.judul);

/** Tahap yang sedang berjalan (giliran), atau null. */
export function tahapAktif(pemeriksa: TahapPemeriksa[] | null | undefined): TahapPemeriksa | null {
  return (pemeriksa ?? []).find((t) => t.status === 'sedang') ?? null;
}

/**
 * Ringkasan satu kalimat: "Menunggu Biro SDM", "Ditolak BAAK", "Selesai diperiksa", atau null bila belum ada tahap yang
 * berjalan (mis. draf atau dikembalikan ke pengusul).
 */
export function labelPemeriksa(pemeriksa: TahapPemeriksa[] | null | undefined): { teks: string; varian: BadgeVariant; status: StatusTahapPemeriksa } | null {
  const daftar = pemeriksa ?? [];
  const tolak = daftar.find((t) => t.status === 'ditolak');
  if (tolak) return { teks: `Ditolak ${namaUnit(tolak)}`, varian: 'danger', status: 'ditolak' };
  const aktif = tahapAktif(daftar);
  if (aktif) return { teks: `${aktif.tahap === 'hak_akses' ? 'Hak akses: menunggu' : 'Menunggu'} ${namaUnit(aktif)}`, varian: 'warning', status: 'sedang' };
  if (daftar.some((t) => t.batal)) return { teks: 'Dibatalkan', varian: 'neutral', status: 'dilewati' };
  if (daftar.length && daftar.every((t) => t.status === 'selesai' || t.status === 'dilewati')) {
    return daftar.some((t) => t.status === 'selesai') ? { teks: 'Selesai diperiksa', varian: 'success', status: 'selesai' } : { teks: 'Dibatalkan', varian: 'neutral', status: 'dilewati' };
  }
  return null;
}

/** Teks satu baris semua tahap untuk title/aria: "1. Biro SDM (selesai) · 2. Pustikom (sedang diperiksa)". */
export function teksAlurPemeriksa(pemeriksa: TahapPemeriksa[] | null | undefined): string {
  return (pemeriksa ?? []).map((t, i) => `${i + 1}. ${namaUnit(t)} (${LABEL[t.status]?.[0].toLowerCase() ?? t.status}${t.diproses_oleh ? `, ${t.diproses_oleh}` : ''})`).join(' · ');
}

/**
 * Pemeriksa yang sedang ditunggu dari banyak usulan, untuk kartu statistik: "Biro SDM" atau "Biro SDM, Pustikom".
 * Kosong bila tidak ada yang menunggu.
 */
export function unitMenunggu(daftar: { pemeriksa?: TahapPemeriksa[] | null }[] | null | undefined): string {
  const unit: string[] = [];
  for (const u of daftar ?? []) {
    const a = tahapAktif(u.pemeriksa);
    if (a && !unit.includes(namaUnit(a))) unit.push(namaUnit(a));
  }
  return unit.join(', ');
}

/** Lencana ringkas pemeriksa untuk baris daftar. `cadangan` tampil bila belum ada tahap berjalan (mis. status draf). */
export function LabelPemeriksa({ pemeriksa, cadangan, className }: { pemeriksa: TahapPemeriksa[] | null | undefined; cadangan?: React.ReactNode; className?: string }) {
  const l = labelPemeriksa(pemeriksa);
  if (!l) return <>{cadangan ?? null}</>;
  const aktif = l.status === 'sedang' ? tahapAktif(pemeriksa) : (pemeriksa ?? []).find((t) => t.status === 'ditolak');
  return (
    <Badge variant={l.varian} className={cn('u-label-pemeriksa', className)} title={teksAlurPemeriksa(pemeriksa)}>
      {aktif ? <IkonUnitPemeriksa unit={aktif.unit} tahap={aktif.tahap} /> : l.status === 'selesai' ? <CircleCheck aria-hidden /> : null}
      {l.teks}
    </Badge>
  );
}

function TitikTahap({ t }: { t: TahapPemeriksa }) {
  return (
    <span className="u-alur-pemeriksa-titik" aria-hidden>
      {t.status === 'selesai' ? <CircleCheck /> : t.status === 'ditolak' ? <CircleX /> : t.status === 'dilewati' ? (t.batal ? <Ban /> : <SkipForward />) : t.status === 'sedang' ? <Hourglass /> : <CircleDashed />}
    </span>
  );
}

/**
 * Alur pemeriksa lengkap satu usulan: tahap berurutan dengan unit pemeriksa, peran yang berhak, status, dan nama petugas
 * serta waktu bila sudah diproses. `ringkas` = satu baris berderet (untuk kartu/daftar lebar).
 */
export function AlurPemeriksa({
  pemeriksa,
  ringkas = false,
  judul = 'Alur pemeriksaan',
  className,
}: {
  pemeriksa: TahapPemeriksa[] | null | undefined;
  ringkas?: boolean;
  /** Judul di atas alur; null = tanpa judul. */
  judul?: React.ReactNode;
  className?: string;
}) {
  const daftar = pemeriksa ?? [];
  if (!daftar.length) return null;
  if (ringkas) {
    return (
      <ol className={cn('u-alur-pemeriksa-ringkas', className)} aria-label={typeof judul === 'string' ? judul : 'Alur pemeriksaan'}>
        {daftar.map((t) => (
          <li key={t.tahap} data-status={t.status} title={`${t.judul}${t.peran ? ` · ${t.peran}` : ''}${t.diproses_oleh ? ` · ${t.diproses_oleh}` : ''}`}>
            <TitikTahap t={t} />
            <span>{t.tahap === 'hak_akses' ? `Hak akses: ${namaUnit(t)}` : namaUnit(t)}</span>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <section className={cn('u-alur-pemeriksa', className)} aria-label={typeof judul === 'string' ? judul : 'Alur pemeriksaan'}>
      {judul !== null && <p className="u-alur-pemeriksa-kepala">{judul}</p>}
      <ol>
        {daftar.map((t, i) => {
          const [label, varian] = LABEL[t.status] ?? [t.status, 'neutral' as BadgeVariant];
          return (
            <li key={t.tahap} className="u-alur-pemeriksa-tahap" data-status={t.status}>
              <TitikTahap t={t} />
              <div className="u-alur-pemeriksa-isi">
                <p className="u-alur-pemeriksa-unit">
                  <span className="u-alur-pemeriksa-ikon"><IkonUnitPemeriksa unit={t.unit} tahap={t.tahap} /></span>
                  <strong>{i + 1}. {t.tahap === 'hak_akses' ? `Hak akses: ${namaUnit(t)}` : `Diperiksa: ${namaUnit(t)}`}</strong>
                  <Badge variant={varian}>{label}</Badge>
                  {t.otomatis && <Badge variant="outline">Bisa otomatis</Badge>}
                  {t.opsional && <Badge variant="outline">Bila ada</Badge>}
                </p>
                <p className="u-alur-pemeriksa-meta">
                  {t.judul}
                  {t.peran ? ` · ${t.peran}` : ''}
                </p>
                {(t.diproses_oleh || t.waktu) && (t.status === 'selesai' || t.status === 'ditolak' || t.status === 'dilewati') && (
                  <p className="u-alur-pemeriksa-petugas">
                    {t.status === 'ditolak' ? 'Ditolak oleh' : t.status === 'dilewati' ? 'Oleh' : 'Diproses oleh'} <b>{t.diproses_oleh ?? '-'}</b>
                    {t.waktu ? ` · ${waktu(t.waktu)}` : ''}
                  </p>
                )}
                {t.catatan && <p className="u-alur-pemeriksa-catatan">{t.catatan}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Katalog alur pemeriksa satu jenis (GET /v1/pemeriksa/alur/{jenis}). */
export function useAlurPemeriksa(jenis: string | null | undefined) {
  return useSiakadQuery<AlurPemeriksaJenis>(['pemeriksa-alur', jenis ?? ''], (s, signal) => s.request<AlurPemeriksaJenis>({ method: 'GET', path: `/v1/pemeriksa/alur/${encodeURIComponent(jenis ?? '')}` }, { signal }), {
    enabled: Boolean(jenis),
    staleTime: 3_600_000,
  });
}

/**
 * Pratinjau di formulir sebelum dikirim: "Usulan ini akan diperiksa oleh: 1. Biro SDM ... 2. Pustikom (hak akses)".
 * Pakai `jenis` (kunci katalog, mis. organisasi.pejabat) atau `tahap` yang sudah ada.
 */
export function PratinjauPemeriksa({
  jenis,
  tahap,
  judul = 'Usulan ini akan diperiksa oleh',
  className,
}: {
  jenis?: string;
  tahap?: AlurPemeriksaJenis['tahap'];
  judul?: React.ReactNode;
  className?: string;
}) {
  const q = useAlurPemeriksa(tahap ? null : jenis);
  const daftar = tahap ?? q.data?.tahap;
  if (!daftar) return q.loading ? <Skeleton className={className} style={{ height: 64 }} /> : null;
  if (!daftar.length) return null;
  return (
    <div className={cn('u-pratinjau-pemeriksa', className)} role="note">
      <p className="u-pratinjau-pemeriksa-judul">{judul}:</p>
      <ol>
        {daftar.map((t) => (
          <li key={t.tahap}>
            <span className="u-alur-pemeriksa-ikon"><IkonUnitPemeriksa unit={t.unit} tahap={t.tahap} /></span>
            <span>
              <span>
                <b>{t.tahap === 'hak_akses' ? `${namaUnit(t)} (hak akses)` : namaUnit(t)}</b>: {t.judul.charAt(0).toLowerCase() + t.judul.slice(1)}
                {t.opsional ? ' (bila ada)' : ''}
              </span>
              {t.keterangan ? <small>{t.keterangan}</small> : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
