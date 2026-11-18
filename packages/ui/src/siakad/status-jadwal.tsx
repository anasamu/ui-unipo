'use client';
import { CalendarCheck2, CalendarClock, CalendarX2, CalendarRange } from 'lucide-react';
import { cn } from '../lib/cn';
import { useSiakadQuery } from './provider';

/** Satu baris dari `GET /v1/kalender/status`. */
export interface StatusLangkahKalender {
  titik: string;
  label: string;
  tahun_id: string;
  keadaan: 'buka' | 'akan' | 'tutup' | 'bebas';
  mulai: string | null;
  selesai: string | null;
  /** "Dibuka s.d. …", "Belum dibuka, mulai …", "Sudah ditutup …", "Tidak dibatasi jadwal". */
  pesan: string;
  catatan: string[];
  boleh: boolean;
  syarat_lain: string[];
  sumber: 'aturan' | 'lama' | 'kosong';
  jendela: { nama: string; sasaran: string | null; mulai: string | null; selesai: string | null; keadaan: string; pesan: string }[];
}

export interface StatusJadwalProps {
  /** Satu atau beberapa kode titik, mis. "krs.ambil" atau ["nilai.input.dosen", "nilai.input.prodi"]. */
  titik: string | string[];
  /** Prodi (pengelola). Mahasiswa otomatis memakai dirinya. */
  prodi?: string | null;
  /** NIM (pengelola melihat jadwal satu mahasiswa). */
  nim?: string | null;
  tahunId?: string | null;
  /** Sembunyikan langkah yang tidak dibatasi jadwal. Bawaan true. */
  sembunyikanBebas?: boolean;
  /** Tampilan ringkas satu baris. */
  ringkas?: boolean;
  className?: string;
}

export function useStatusKalender(titik: string | string[], q: { prodi?: string | null; nim?: string | null; tahunId?: string | null } = {}) {
  const daftar = (Array.isArray(titik) ? titik : [titik]).join(',');
  return useSiakadQuery<StatusLangkahKalender[]>(['kalender-status', daftar, q.prodi ?? '', q.nim ?? '', q.tahunId ?? ''], (s, signal) =>
    s.request<StatusLangkahKalender[]>({ method: 'GET', path: '/v1/kalender/status', query: { titik: daftar, prodi: q.prodi || undefined, nim: q.nim || undefined, tahun_id: q.tahunId || undefined } }, { signal }) as never,
  );
}

const IKON = { buka: CalendarCheck2, akan: CalendarClock, tutup: CalendarX2, bebas: CalendarRange };

/**
 * Status buka/tutup langkah dari Kalender & periode di halaman fitur (KRS, input nilai, EDOM, ujian, cuti, ...): pesan
 * seragam "Dibuka s.d. …", "Belum dibuka, mulai …", "Sudah ditutup …", catatan perpanjangan/penutupan per prodi, dan
 * rentang per sasaran (SMT 3, 5, 7 / Maba). Diam saat gagal dimuat supaya halaman fitur tetap jalan.
 */
export function StatusJadwal({ titik, prodi, nim, tahunId, sembunyikanBebas = true, ringkas, className }: StatusJadwalProps) {
  const q = useStatusKalender(titik, { prodi, nim, tahunId });
  const data = (q.data ?? []).filter((x) => !sembunyikanBebas || x.keadaan !== 'bebas');
  if (q.error || !data.length) return null;
  return (
    <div className={cn('u-status-jadwal', ringkas && 'u-status-jadwal-ringkas', className)} role="status">
      {data.map((x) => {
        const Ikon = IKON[x.keadaan] ?? CalendarRange;
        return (
          <div key={x.titik} className="u-status-jadwal-butir" data-keadaan={x.keadaan}>
            <Ikon aria-hidden className="u-status-jadwal-ikon" />
            <div className="u-status-jadwal-teks">
              <span>
                <strong>{x.label}</strong> <span className="u-status-jadwal-pesan">{x.pesan}</span>
              </span>
              {!ringkas && (x.catatan.length > 0 || x.jendela.length > 1) ? (
                <small>{[...x.jendela.length > 1 ? x.jendela.map((j) => j.pesan) : [], ...x.catatan].join(' · ')}</small>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
