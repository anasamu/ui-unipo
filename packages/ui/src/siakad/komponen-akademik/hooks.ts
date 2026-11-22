import { useSiakadQuery } from '../provider';
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
