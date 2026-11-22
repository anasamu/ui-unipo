import { useOptionalSiakad, useSiakadQuery } from '../provider';
import type { KegiatanTerpadu } from '../kalender';
import type { SesiKuliah } from './tipe';

/** Jadwal kuliah mahasiswa (GET /v1/mahasiswa/{nim}/jadwal); `data.jadwal` langsung untuk JadwalMingguan. */
export function useJadwalMahasiswa(nim: string | null | undefined, tahunId?: string | null) {
  return useSiakadQuery<{ nim?: string; tahun_id?: string | null; jadwal: SesiKuliah[] }>(
    ['mhs', nim ?? '', 'jadwal', tahunId ?? ''],
    (s, signal) => s.request({ method: 'GET', path: `/v1/mahasiswa/${encodeURIComponent(nim ?? '')}/jadwal`, query: tahunId ? { tahun_id: tahunId } : undefined }, { signal }),
    { staleTime: 60_000, enabled: !!nim },
  );
}

/**
 * Tahapan periode akademik (KRS online, perkuliahan, ujian, input nilai, …) dari kalender terpadu: sumber `tahun`
 * (m_tahun) dan `batas` (batas waktu per prodi). Untuk TahapanAkademik dan kartu portal.
 */
export function useTahapanPeriode(opsi: { tahunId?: string | null; kodeProdi?: string | null; dari?: string; sampai?: string; sumber?: string[]; enabled?: boolean } = {}) {
  const sumber = (opsi.sumber ?? ['tahun', 'batas']).join(',');
  return useSiakadQuery<KegiatanTerpadu[]>(
    ['kalender-terpadu', 'tahapan', opsi.tahunId ?? '', opsi.kodeProdi ?? '', opsi.dari ?? '', opsi.sampai ?? '', sumber],
    (s, signal) =>
      s.request<KegiatanTerpadu[]>(
        {
          method: 'GET',
          path: '/v1/kalender/terpadu',
          query: { sumber, ...(opsi.tahunId ? { tahun_id: opsi.tahunId } : {}), ...(opsi.kodeProdi ? { kode_prodi: opsi.kodeProdi } : {}), ...(opsi.dari ? { dari: opsi.dari } : {}), ...(opsi.sampai ? { sampai: opsi.sampai } : {}) },
        },
        { signal },
      ),
    { staleTime: 5 * 60_000, enabled: opsi.enabled !== false },
  );
}

/** Menit tatap muka per SKS bila aturan kurikulum belum mengaturnya (sama dengan bawaan server). */
export const MENIT_PER_SKS_BAWAAN = 50;

/** GET /v1/referensi/beban-sks: menit tatap muka per SKS dari aturan kurikulum berversi ber-SK. */
export interface BebanSks {
  menit_per_sks: number;
  /** `aturan_kurikulum` bila diatur versi aturan yang berlaku, `bawaan` bila belum. */
  sumber?: 'aturan_kurikulum' | 'bawaan' | string;
  bawaan?: number;
  kode_prodi?: string | null;
  tahun_id?: string | null;
  versi?: { id: number; nama: string; versi?: number; lingkup?: string; berlaku_mulai?: string | null } | null;
}

/** Menit per SKS dari respons beban SKS; bawaan 50 bila belum dimuat/tidak valid. */
export function menitPerSksDari(beban: Pick<BebanSks, 'menit_per_sks'> | null | undefined): number {
  const n = Number(beban?.menit_per_sks);
  return Number.isFinite(n) && n > 0 ? n : MENIT_PER_SKS_BAWAAN;
}

/**
 * Beban tatap muka per SKS yang berlaku untuk prodi dan periode (aturan kurikulum ber-SK; bawaan 50 menit). Tanpa
 * `prodi`, token mahasiswa memakai prodinya sendiri. Tidak memanggil API bila tidak ada SDK (mis. galeri tanpa
 * penyedia): `menitPerSks` tetap 50.
 */
export function useBebanSks(opsi: { prodi?: string | null; tahunId?: string | null; enabled?: boolean } = {}) {
  const siakad = useOptionalSiakad();
  const q = useSiakadQuery<BebanSks>(
    ['referensi', 'beban-sks', opsi.prodi ?? '', opsi.tahunId ?? ''],
    (s, signal) =>
      s.request<BebanSks>({ method: 'GET', path: '/v1/referensi/beban-sks', query: { ...(opsi.prodi ? { prodi: opsi.prodi } : {}), ...(opsi.tahunId ? { tahun_id: opsi.tahunId } : {}) } }, { signal }),
    { staleTime: 10 * 60_000, enabled: !!siakad && opsi.enabled !== false },
  );
  return { ...q, menitPerSks: menitPerSksDari(q.data) };
}
