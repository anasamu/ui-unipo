'use client';
import * as React from 'react';
import { Button } from '../components/actions';
import { Alert } from '../components/display';
import { SambutanPimpinan, type PimpinanSambutan, type SambutanPimpinanProps } from '../components/sambutan';
import { StrukturOrganisasi, type NodeStruktur, type StrukturOrganisasiProps } from '../components/struktur-organisasi';
import { Testimoni, type ItemTestimoni, type TestimoniProps } from '../components/testimoni';
import { pesanGalat, useSiakadQuery } from './provider';

// ================================================================ Data portal

/** Baris `portal_struktur` dari `GET /v1/portal/struktur` (foto_media_id disertai objek media `foto`). */
export interface BarisStrukturPortal {
  id: number;
  jabatan: string;
  jabatan_en?: string | null;
  grup?: string | null;
  nidn?: string | null;
  nama?: string | null;
  foto?: { url?: string | null; alt?: string | null } | string | null;
  sambutan?: string | null;
  periode_mulai?: string | null;
  periode_selesai?: string | null;
  urutan?: number | null;
  aktif?: boolean | number | null;
}

/** Profil situs dari `GET /v1/portal/situs/{kode}`: pengaturan publik + data resmi SIAKAD. */
interface SitusPortal {
  nama?: string | null;
  pengaturan?: { sambutan?: string | null } & Record<string, unknown>;
  siakad?: {
    pimpinan?: Array<{ jabatan: string; nidn?: string; nama: string }>;
    perguruan_tinggi?: { nama_pt?: string | null } | null;
    fakultas?: { nama_fakultas?: string | null } | unknown[];
  } | null;
}

const urlFoto = (f: BarisStrukturPortal['foto']) => (typeof f === 'string' ? f : (f?.url ?? null));
const tahun = (t?: string | null) => (t ? t.slice(0, 4) : '');
/** Teks periode jabatan struktur organisasi, mis. "2022–2026" atau "2024–sekarang"; null bila tidak ada tanggal. */
export function periodeStruktur(b: Pick<BarisStrukturPortal, 'periode_mulai' | 'periode_selesai'>): string | null {
  const a = tahun(b.periode_mulai);
  const z = tahun(b.periode_selesai);
  return a || z ? `${a || '…'}–${z || 'sekarang'}` : null;
}

function useStrukturPortal(situs: string, grup?: string, turunan?: boolean) {
  const q = { situs, grup, turunan: turunan ? '1' : undefined, per_page: 100 };
  return useSiakadQuery<BarisStrukturPortal[]>(['portal-struktur', q], (s, signal) => s.portal.getStruktur(q, { signal }) as never, { staleTime: 300_000 });
}

/**
 * Ubah baris `portal_struktur` (tanpa kolom induk) menjadi pohon: baris pertama (urutan terkecil) menjadi akar, baris
 * lain di grup yang sama menjadi bawahannya, dan setiap grup lain menjadi cabang di bawah akar dengan baris pertama grup
 * itu sebagai kepala cabang. Untuk susunan lain, kirim fungsi `susun` sendiri ke StrukturPortal.
 */
export function strukturDariPortal(baris: BarisStrukturPortal[]): NodeStruktur[] {
  const urut = baris.toSorted((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0) || a.id - b.id);
  const keNode = (b: BarisStrukturPortal): NodeStruktur => ({
    id: String(b.id),
    jabatan: b.jabatan,
    nama: b.nama,
    foto: urlFoto(b.foto),
    grup: b.grup,
    periode: periodeStruktur(b),
    anak: [],
  });
  if (!urut.length) return [];
  const grupAkar = urut[0].grup ?? '';
  const akar = keNode(urut[0]);
  const perGrup = new Map<string, BarisStrukturPortal[]>();
  urut.slice(1).forEach((b) => {
    const g = b.grup ?? '';
    perGrup.set(g, [...(perGrup.get(g) ?? []), b]);
  });
  (perGrup.get(grupAkar) ?? []).forEach((b) => akar.anak!.push(keNode(b)));
  perGrup.forEach((isi, g) => {
    if (g === grupAkar) return;
    const [kepala, ...lain] = isi;
    const k = keNode(kepala);
    k.anak = lain.map(keNode);
    akar.anak!.push(k);
  });
  return [akar];
}

function Galat({ error, refetch }: { error: Error; refetch: () => void }) {
  return (
    <Alert
      variant="danger"
      title="Gagal memuat"
      actions={
        <Button size="sm" variant="outline" onClick={refetch}>
          Coba lagi
        </Button>
      }
    >
      {pesanGalat(error)}
    </Alert>
  );
}

// ================================================================ SambutanPortal

export interface SambutanPortalProps extends Omit<SambutanPimpinanProps, 'pimpinan' | 'isi'> {
  /** Kode situs portal, mis. 'univ', 'fik'. */
  situs: string;
  /** Pilih baris struktur berdasarkan jabatan (mis. "Rektor", "Dekan"). Bawaan: baris pertama yang punya sambutan. */
  jabatan?: string;
  /** Ganti data yang dimuat (mis. untuk menambah tanda tangan atau video). */
  ubah?: (p: PimpinanSambutan) => PimpinanSambutan;
}

/**
 * Sambutan pimpinan dari portal SIAKAD: baris `portal_struktur` yang punya sambutan (nama, foto, masa jabatan), atau
 * bila belum ada, pengaturan situs `sambutan` dengan pimpinan resmi SIAKAD (`m_pimpinan` / `m_fakultas`).
 */
export function SambutanPortal({ situs, jabatan, ubah, ...rest }: SambutanPortalProps) {
  const st = useStrukturPortal(situs);
  const si = useSiakadQuery<SitusPortal>(['portal-situs', situs], (s, signal) => s.portal.getSitusByKode(situs, undefined, { signal }) as never, { staleTime: 300_000 });
  const data = React.useMemo(() => {
    const cocokJabatan = (j: string) => !jabatan || j.toLowerCase() === jabatan.toLowerCase();
    const baris = (st.data ?? []).filter((b) => b.sambutan && cocokJabatan(b.jabatan)).sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0))[0];
    const unit = si.data?.nama ?? null;
    if (baris) {
      return {
        pimpinan: { nama: baris.nama ?? '', jabatan: baris.jabatan, foto: urlFoto(baris.foto), unit, periode: periodeStruktur(baris) },
        isi: baris.sambutan!,
      };
    }
    const teks = si.data?.pengaturan?.sambutan;
    const p = si.data?.siakad?.pimpinan?.find((x) => cocokJabatan(x.jabatan)) ?? si.data?.siakad?.pimpinan?.[0];
    if (!teks || !p) return null;
    // foto dari baris struktur dengan NIDN sama, bila ada
    const foto = (st.data ?? []).find((b) => b.nidn && b.nidn === p.nidn);
    return { pimpinan: { nama: p.nama, jabatan: p.jabatan, unit, foto: foto ? urlFoto(foto.foto) : null }, isi: teks };
  }, [st.data, si.data, jabatan]);

  if (st.loading || si.loading) return <div className="u-sambutan u-skeleton" style={{ minHeight: '18rem', borderRadius: 'var(--u-radius-xl)' }} aria-busy="true" />;
  if (si.error && st.error) return <Galat error={si.error} refetch={si.refetch} />;
  if (!data) return null;
  return <SambutanPimpinan pimpinan={ubah ? ubah(data.pimpinan) : data.pimpinan} isi={data.isi} {...rest} />;
}

// ================================================================ StrukturPortal

export interface StrukturPortalProps extends Omit<StrukturOrganisasiProps, 'data'> {
  situs: string;
  /** Hanya satu grup, mis. "Pimpinan". */
  grup?: string;
  /** Sertakan situs turunan (fakultas dan prodi di bawah universitas). */
  turunan?: boolean;
  /** Susunan pohon sendiri dari baris portal; bawaan strukturDariPortal. */
  susun?: (baris: BarisStrukturPortal[]) => NodeStruktur[];
}

/** Struktur organisasi dari `GET /v1/portal/struktur` (dikelola di Humas/Pustikom). */
export function StrukturPortal({ situs, grup, turunan, susun = strukturDariPortal, varian = 'grup', ...rest }: StrukturPortalProps) {
  const q = useStrukturPortal(situs, grup, turunan);
  const data = React.useMemo(() => susun(q.data ?? []), [q.data, susun]);
  if (q.loading) return <div className="u-skeleton" style={{ minHeight: '16rem', borderRadius: 'var(--u-radius-xl)' }} aria-busy="true" />;
  if (q.error) return <Galat error={q.error} refetch={q.refetch} />;
  if (!data.length) return <p className="u-org-kosong">Struktur organisasi belum diisi.</p>;
  return <StrukturOrganisasi data={data} varian={varian} {...rest} />;
}

// ================================================================ TestimoniLandingPmb

/** Baris `pmb_testimoni` dari `GET /v1/pmb/info/landing`. */
export interface BarisTestimoniPmb {
  id: number;
  nama: string;
  peran?: string | null;
  kode_prodi?: string | null;
  nama_prodi?: string | null;
  foto?: string | null;
  isi: string;
  rating?: number | string | null;
  video_url?: string | null;
}

/** Tebak kategori dari teks peran ("Alumni 2021" → alumni, "Mahasiswa ..." → mahasiswa). */
export function kategoriPeran(peran?: string | null): string | null {
  const p = (peran ?? '').toLowerCase();
  if (!p) return null;
  if (p.includes('alumni') || p.includes('lulusan')) return 'alumni';
  if (p.includes('mahasiswa') || p.includes('maba')) return 'mahasiswa';
  if (p.includes('orang tua') || p.includes('wali')) return 'orang_tua';
  if (p.includes('dosen')) return 'dosen';
  if (p.includes('mitra') || p.includes('perusahaan') || p.includes('industri')) return 'mitra';
  return 'lainnya';
}

/** Ubah baris testimoni PMB dari API menjadi `ItemTestimoni` untuk komponen Testimoni. */
export function keTestimoni(b: BarisTestimoniPmb): ItemTestimoni {
  const r = b.rating == null || b.rating === '' ? null : Number(b.rating);
  return {
    id: b.id,
    nama: b.nama,
    peran: b.peran,
    unit: b.nama_prodi ?? null,
    foto: b.foto,
    isi: b.isi,
    rating: r && r >= 1 ? r : null,
    kategori: kategoriPeran(b.peran),
    video_url: b.video_url,
  };
}

export interface TestimoniLandingPmbProps extends Omit<TestimoniProps, 'items' | 'loading'> {
  /** Hanya testimoni prodi tertentu. */
  kodeProdi?: string;
}

/** Testimoni dari landing PMB (`GET /v1/pmb/info/landing`, publik), lengkap dengan rating dan video. */
export function TestimoniLandingPmb({ kodeProdi, filter = true, ...rest }: TestimoniLandingPmbProps) {
  const q = useSiakadQuery<{ testimoni?: BarisTestimoniPmb[] }>(['pmb-landing'], (s, signal) => s.pmb.getInfoLanding(undefined, { signal }) as never, { staleTime: 300_000 });
  const items = React.useMemo(() => (q.data?.testimoni ?? []).filter((t) => !kodeProdi || t.kode_prodi === kodeProdi).map(keTestimoni), [q.data, kodeProdi]);
  if (q.error) return <Galat error={q.error} refetch={q.refetch} />;
  return <Testimoni items={items} loading={q.loading} filter={filter} {...rest} />;
}
