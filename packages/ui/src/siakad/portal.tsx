"use client";
import {
  AnnouncementList,
  EventCard,
  NewsGrid,
  RankedList,
  type AnnouncementItem,
  type EventCardItem,
  type NewsGridProps,
  type NewsItem,
} from "../components/content";
import { Alert } from "../components/display";
import { pesanGalat, useSiakadQuery } from "./provider";

/** Bentuk ringkas berita/pengumuman/agenda dari `/v1/portal/*` (kolom yang dipakai widget). */
export interface KontenPortal {
  id: number;
  slug?: string | null;
  judul: string;
  ringkasan?: string | null;
  jenis?: string | null;
  kategori?: { slug: string; nama: string; warna?: string | null } | null;
  gambar?: { url: string; alt?: string | null } | null;
  sampul?: { url: string } | null;
  penulis_tampil?: string | null;
  dilihat?: number | null;
  terbit_pada?: string | null;
  // pengumuman
  nomor?: string | null;
  prioritas?: string | null;
  berlaku_sampai?: string | null;
  sematkan?: boolean | null;
  // agenda
  mulai?: string;
  selesai?: string | null;
  sepanjang_hari?: boolean | null;
  mode?: string | null;
  lokasi?: string | null;
  penyelenggara?: string | null;
  pendaftaran?: boolean | null;
}

const JENIS_BERITA: Record<string, string> = {
  prestasi: "Prestasi",
  opini: "Opini",
  liputan: "Liputan",
  siaran_pers: "Siaran pers",
  artikel: "Artikel",
};

/** Pembentuk URL detail. Bawaan: `/berita/{slug}`, `/pengumuman/{slug}`, `/agenda/{slug}`. */
export type HrefKonten = (
  jenis: "berita" | "pengumuman" | "agenda",
  k: KontenPortal,
) => string | undefined;
const hrefBawaan: HrefKonten = (jenis, k) => `/${jenis}/${k.slug ?? k.id}`;

export function keBerita(
  k: KontenPortal,
  href: HrefKonten = hrefBawaan,
): NewsItem {
  return {
    id: k.id,
    title: k.judul,
    href: href("berita", k),
    excerpt: k.ringkasan ?? undefined,
    image: k.gambar?.url ?? null,
    imageAlt: k.gambar?.alt ?? "",
    category: k.kategori
      ? { name: k.kategori.nama, color: k.kategori.warna }
      : null,
    author: k.penulis_tampil ?? undefined,
    date: k.terbit_pada ?? null,
    views: k.dilihat ?? null,
    badge:
      k.jenis && JENIS_BERITA[k.jenis] !== k.kategori?.nama
        ? JENIS_BERITA[k.jenis]
        : undefined,
  };
}

interface Umum {
  /** Kode situs portal, mis. 'univ' atau kode fakultas. Kosong = semua situs. */
  situs?: string;
  /** Ikutkan situs turunan (fakultas/prodi di bawahnya). */
  turunan?: boolean;
  /** Jumlah item. */
  jumlah?: number;
  href?: HrefKonten;
  className?: string;
}

function Galat({ error, refetch }: { error: Error; refetch: () => void }) {
  return (
    <Alert
      variant="danger"
      title="Konten gagal dimuat"
      actions={
        <button type="button" className="u-section-link" onClick={refetch}>
          Coba lagi
        </button>
      }
    >
      {pesanGalat(error)}
    </Alert>
  );
}

// ================================================================ Berita
export interface BeritaPortalProps extends Umum {
  /** grid / featured (sorotan) / list. */
  layout?: NewsGridProps["layout"];
  kategori?: string;
  /** berita | artikel | opini | prestasi | liputan | siaran_pers */
  jenis?: string;
  unggulan?: boolean;
  urut?: "terbaru" | "populer";
  /** Berita yang menyebut mahasiswa/dosen ini (untuk profil). */
  nim?: string;
  nidn?: string;
  minColumn?: number;
}

/** Berita dari `portal.getBerita` dalam tata letak grid, sorotan, atau daftar. */
export function BeritaPortal({
  situs,
  turunan,
  jumlah = 6,
  href,
  className,
  layout = "grid",
  kategori,
  jenis,
  unggulan,
  urut,
  nim,
  nidn,
  minColumn,
}: BeritaPortalProps) {
  const q = {
    situs,
    turunan: turunan ? "1" : undefined,
    per_page: jumlah,
    kategori,
    jenis,
    unggulan: unggulan ? "1" : undefined,
    urut,
    nim,
    nidn,
  };
  const { data, loading, error, refetch } = useSiakadQuery<KontenPortal[]>(
    ["portal-berita", q],
    (s, signal) => s.portal.getBerita(q, { signal }) as never,
    { staleTime: 120_000 },
  );
  if (error) return <Galat error={error} refetch={refetch} />;
  return (
    <NewsGrid
      className={className}
      layout={layout}
      minColumn={minColumn}
      loading={loading && !data}
      skeletonCount={jumlah}
      items={(data ?? []).map((k) => keBerita(k, href))}
    />
  );
}

/** Daftar bernomor berita terpopuler (urut=populer). */
export function BeritaTerpopuler({
  situs,
  turunan,
  jumlah = 5,
  href,
  className,
}: Umum) {
  const q = {
    situs,
    turunan: turunan ? "1" : undefined,
    per_page: jumlah,
    urut: "populer",
  };
  const { data, loading } = useSiakadQuery<KontenPortal[]>(
    ["portal-berita", q],
    (s, signal) => s.portal.getBerita(q, { signal }) as never,
    { staleTime: 300_000 },
  );
  return (
    <RankedList
      className={className}
      loading={loading && !data}
      items={(data ?? []).map((k) => keBerita(k, href))}
    />
  );
}

// ================================================================ Pengumuman
export interface PengumumanPortalProps extends Umum {
  /** biasa | penting | darurat */
  prioritas?: string;
  /** Sertakan yang sudah lewat masa berlaku. */
  kedaluwarsa?: boolean;
}

/** Pengumuman dari `portal.getPengumuman`: tersemat di atas, prioritas berwarna, masa berlaku. */
export function PengumumanPortal({
  situs,
  turunan,
  jumlah = 5,
  href = hrefBawaan,
  className,
  prioritas,
  kedaluwarsa,
}: PengumumanPortalProps) {
  const q = {
    situs,
    turunan: turunan ? "1" : undefined,
    per_page: jumlah,
    prioritas,
    kedaluwarsa: kedaluwarsa ? "1" : undefined,
  };
  const { data, loading, error, refetch } = useSiakadQuery<KontenPortal[]>(
    ["portal-pengumuman", q],
    (s, signal) => s.portal.getPengumuman(q, { signal }) as never,
    { staleTime: 120_000 },
  );
  if (error) return <Galat error={error} refetch={refetch} />;
  const items: AnnouncementItem[] = (data ?? [])
    .map((k) => ({
      id: k.id,
      title: k.judul,
      href: href("pengumuman", k),
      number: k.nomor,
      priority: k.prioritas ?? undefined,
      date: k.terbit_pada,
      until: k.berlaku_sampai,
      pinned: !!k.sematkan,
    }))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  return (
    <AnnouncementList
      className={className}
      loading={loading && !data}
      items={items}
    />
  );
}

// ================================================================ Agenda
export interface AgendaPortalProps extends Umum {
  waktu?: "mendatang" | "lalu" | "semua";
  /** luring | daring | hibrida */
  mode?: string;
  /** row = baris berbingkai; card = kartu dengan gambar. */
  variant?: "row" | "card";
}

/** Agenda dari `portal.getAgenda` (bawaan: mendatang) dengan tile tanggal, jam WITA, mode, dan lokasi. */
export function AgendaPortal({
  situs,
  turunan,
  jumlah = 4,
  href = hrefBawaan,
  className,
  waktu = "mendatang",
  mode,
  variant = "row",
}: AgendaPortalProps) {
  const q = {
    situs,
    turunan: turunan ? "1" : undefined,
    per_page: jumlah,
    waktu,
    mode,
  };
  const { data, loading, error, refetch } = useSiakadQuery<KontenPortal[]>(
    ["portal-agenda", q],
    (s, signal) => s.portal.getAgenda(q, { signal }) as never,
    { staleTime: 120_000 },
  );
  if (error) return <Galat error={error} refetch={refetch} />;
  if (loading && !data) return <AnnouncementList loading items={[]} />;
  const items: EventCardItem[] = (data ?? []).map((k) => ({
    id: k.id,
    title: k.judul,
    href: href("agenda", k),
    start: k.mulai ?? "",
    end: k.selesai,
    allDay: !!k.sepanjang_hari,
    mode: k.mode,
    location: k.lokasi ?? undefined,
    organizer: k.penyelenggara ?? undefined,
    image: k.gambar?.url ?? null,
    registration: !!k.pendaftaran,
  }));
  if (!items.length)
    return (
      <div className="u-agenda-empty">
        Belum ada agenda {waktu === "lalu" ? "yang lalu" : "mendatang"}.
      </div>
    );
  return (
    <div
      className={className}
      style={{
        display: "grid",
        gap: "0.75rem",
        gridTemplateColumns:
          variant === "card"
            ? "repeat(auto-fill, minmax(min(100%, 260px), 1fr))"
            : undefined,
      }}
    >
      {items.map((it) => (
        <EventCard key={it.id} item={it} variant={variant} />
      ))}
    </div>
  );
}
