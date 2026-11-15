'use client';
import * as React from 'react';
import type { MediaEditor, OpsiPilihMedia } from '../editor/konteks';
import type { SumberMedia } from '../editor/EditorBlok';
import { useSiakad } from './provider';

/** Baris pustaka media portal (GET /v1/portal/kelola/media), kolom yang dipakai editor. */
export interface MediaPortal {
  id: number;
  jenis?: string | null;
  url?: string | null;
  url_eksternal?: string | null;
  nama_asli?: string | null;
  mime?: string | null;
  ukuran?: number | null;
  alt?: string | null;
  judul?: string | null;
}

/** Ubah baris pustaka media portal jadi media editor (`id` dipakai sebagai `media_id` blok, sama dengan Blok.php). */
export const mediaPortalKeEditor = (m: MediaPortal): MediaEditor => ({
  url: m.url ?? m.url_eksternal ?? '',
  id: m.id,
  alt: m.alt ?? '',
  judul: m.judul ?? undefined,
  nama: m.nama_asli ?? m.judul ?? undefined,
  ukuran: m.ukuran ?? null,
  mime: m.mime ?? null,
});

/**
 * Pustaka media situs portal untuk editor: `sumber` (tab Pustaka, cari + pilih berkas yang sudah ada di sistem) dan
 * `unggah` (berkas baru masuk ke pustaka yang sama). Butuh scope `portal:write`. URL media portal permanen, jadi aman
 * disimpan di isi berita.
 *
 * ```tsx
 * const media = useMediaPortal('univ');
 * <EditorBerita sumberMedia={media.sumber} unggah={media.unggah} />
 * ```
 */
export function useMediaPortal(situs: string, opsi: { perHalaman?: number } = {}) {
  const siakad = useSiakad();
  const per = opsi.perHalaman ?? 24;
  const sumber = React.useMemo<SumberMedia>(
    () => ({
      nama: 'Pustaka media',
      cari: async (q, o, signal) => {
        const r = await siakad.request<MediaPortal[]>(
          { method: 'GET', path: '/v1/portal/kelola/media', query: { situs, jenis: o.jenis, q: q || undefined, page: o.halaman, per_page: per } },
          { signal },
        );
        const data = (Array.isArray(r.data) ? r.data : []).map(mediaPortalKeEditor).filter((m) => m.url);
        const meta = r.meta as { page?: number; total_pages?: number } | undefined;
        return { data, adaLagi: meta?.total_pages !== undefined ? (meta.page ?? o.halaman) < meta.total_pages : data.length >= per };
      },
    }),
    [siakad, situs, per],
  );
  const unggah = React.useCallback(
    async (file: File, _o: OpsiPilihMedia): Promise<MediaEditor> => {
      const r = await siakad.request<MediaPortal>({ method: 'POST', path: '/v1/portal/kelola/media', body: { situs, berkas: file }, multipart: true }, { timeout: 300_000 });
      return mediaPortalKeEditor(r.data);
    },
    [siakad, situs],
  );
  return { sumber, unggah };
}
