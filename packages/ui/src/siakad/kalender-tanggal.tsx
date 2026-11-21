'use client';
import * as React from 'react';
import type { Siakad } from 'unipo-siakad-sdk';
import {
  cocokTahapan,
  KonteksKalenderTanggal,
  toISODate,
  type AgendaKalender,
  type DataBulanKalender,
  type PresetRentang,
  type SumberKalenderTanggal,
  type TahapanKalender,
} from '../components/calendar';
import { EVENT_COLORS } from '../components/schedule';
import { JENIS_KEGIATAN, type KegiatanTerpadu } from './kalender';
import { bukaKembaliCocok, type StatusPeriode } from './kunci-periode';
import { useOptionalSiakad, useSiakadQuery } from './provider';

/**
 * Integrasi komponen tanggal dengan kalender akademik SIAKAD (hanya endpoint baca yang sudah ada):
 * - `GET /v1/kalender/terpadu` per bulan tampil: libur (SDM/kalender), kegiatan, tahapan periode (KRS, kuliah, UTS, UAS, nilai, wisuda).
 * - `GET /v1/kalender/tahun`: periode akademik terbaru beserta seluruh tahapannya (preset & `batasTahapan`).
 * - `GET /v1/kalender/kunci`: status kunci periode (peringatan tanggal di periode yang sudah ditutup).
 * Semua dimuat malas (baru saat kalender pertama kali tampil), di-cache per instans SDK, dan diam saat galat.
 */

/** Sumber terpadu yang dipakai komponen tanggal (batas per prodi, portal, PMB tidak ikut). */
export const SUMBER_KALENDER_TANGGAL = ['kalender', 'libur', 'tahun'];
const UMUR_CACHE = 10 * 60_000;
const KOSONG: DataBulanKalender = { libur: {}, agenda: {}, tahapan: [] };

type Isi = { at: number; data: Promise<DataBulanKalender> };
const cacheBulan = new WeakMap<object, Map<string, Isi>>();
const cacheUntuk = (s: object) => {
  let m = cacheBulan.get(s);
  if (!m) cacheBulan.set(s, (m = new Map()));
  return m;
};

const tgl = (s: string) => s.slice(0, 10);
const tambahHari = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  return toISODate(new Date(y!, m! - 1, d! + n));
};

/** Satu baris terpadu → tahapan (beberapa hari) bila bukan libur. */
function keTahapan(k: KegiatanTerpadu & { tahap?: string | null }): TahapanKalender {
  return {
    judul: k.judul,
    jenis: k.jenis,
    tahap: k.tahap ?? null,
    mulai: tgl(k.mulai),
    selesai: k.selesai ? tgl(k.selesai) : null,
    warna: k.warna ?? null,
    tahunId: k.tahun_id ?? null,
    latar: k.jenis !== 'perkuliahan',
  };
}

/** Olah baris `kalender/terpadu` menjadi libur per tanggal, agenda satu hari, dan tahapan beberapa hari. */
export function olahKalenderBulan(baris: KegiatanTerpadu[], sumber: string[] = SUMBER_KALENDER_TANGGAL): DataBulanKalender {
  const out: DataBulanKalender = { libur: {}, agenda: {}, tahapan: [] };
  for (const k of baris) {
    if (!sumber.includes(k.sumber) || !k.mulai) continue;
    const mulai = tgl(k.mulai);
    const selesai = k.selesai ? tgl(k.selesai) : null;
    if (k.libur || k.jenis === 'libur' || k.jenis === 'cuti_bersama') {
      for (let d = mulai, i = 0; d <= (selesai ?? mulai) && i < 400; d = tambahHari(d, 1), i++) out.libur[d] = out.libur[d] ? `${out.libur[d]}; ${k.judul}` : k.judul;
    } else if (selesai && selesai > mulai) {
      out.tahapan.push(keTahapan(k));
    } else {
      const a: AgendaKalender = { judul: k.judul, jenis: k.jenis, warna: k.warna ?? null };
      (out.agenda[mulai] ??= []).push(a);
    }
  }
  return out;
}

interface PeriodeKalender {
  tahun_id: string;
  nama: string | null;
  aktif: boolean;
  tahap: Array<KegiatanTerpadu & { tahap?: string | null }>;
}

/** Rentang (awal–akhir) tiap periode dari tahapannya. */
function rentangPeriode(p: PeriodeKalender): [string, string] | null {
  const t = p.tahap.filter((x) => x.mulai);
  if (!t.length) return null;
  return [t.map((x) => tgl(x.mulai)).sort()[0]!, t.map((x) => tgl(x.selesai ?? x.mulai)).sort().at(-1)!];
}
const keTanggal = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
};

/** Preset Semester ini / Periode KRS / Masa UTS / Masa UAS dari periode yang memuat hari ini (atau periode aktif). */
export function presetDariPeriode(periode: PeriodeKalender[], kini: Date = new Date()): PresetRentang[] {
  const hari = toISODate(kini);
  const p =
    periode.find((x) => {
      const r = rentangPeriode(x);
      return r && r[0] <= hari && r[1] >= hari && x.aktif;
    }) ??
    periode.find((x) => {
      const r = rentangPeriode(x);
      return r && r[0] <= hari && r[1] >= hari;
    }) ??
    periode.find((x) => x.aktif);
  if (!p) return [];
  const r = rentangPeriode(p);
  const nama = p.nama ?? p.tahun_id;
  const out: PresetRentang[] = [];
  if (r) out.push({ label: 'Semester ini', dari: keTanggal(r[0]), sampai: keTanggal(r[1]), keterangan: `Periode ${nama}` });
  const tahap = p.tahap.map(keTahapan);
  for (const [kunci, label] of [
    ['krs', 'Periode KRS'],
    ['uts', 'Masa UTS'],
    ['uas', 'Masa UAS'],
  ] as const) {
    const t = tahap.filter((x) => cocokTahapan(x, kunci) && !/perubahan|cetak/.test(x.tahap ?? '')).sort((a, b) => a.mulai.localeCompare(b.mulai))[0];
    if (t) out.push({ label, dari: keTanggal(t.mulai), sampai: keTanggal(t.selesai ?? t.mulai), keterangan: t.judul });
  }
  return out;
}

export interface KalenderAkademikProviderProps {
  children: React.ReactNode;
  /** false = komponen tanggal di dalamnya tanpa data kalender akademik. */
  aktif?: boolean;
  /** Batasi tahapan/kegiatan ke satu prodi (bawaan: sesuai token, mis. prodi pengguna). */
  kodeProdi?: string;
  /** Sumber terpadu (bawaan kalender, libur, tahun). */
  sumber?: string[];
  /** Fitur untuk pengecualian "buka kembali" saat menilai periode ditutup (bawaan 'lain'). */
  fitur?: string;
}

/**
 * Penyedia data kalender akademik untuk `Calendar`, `DatePicker`, `DateRangePicker`: libur merah + tooltip,
 * titik agenda per jenis, latar tahapan (KRS, UTS, …), legenda, preset rentang, `batasTahapan`, dan peringatan
 * periode ditutup. Sudah dipasang otomatis oleh `UnipoProvider` bila ada SDK (matikan dengan `kalenderAkademik={false}`).
 * Tanpa SDK atau saat API gagal: tanpa penanda, tanpa galat.
 */
export function KalenderAkademikProvider({ children, aktif = true, kodeProdi, sumber = SUMBER_KALENDER_TANGGAL, fitur = 'lain' }: KalenderAkademikProviderProps) {
  const siakad = useOptionalSiakad();
  const nyala = aktif && !!siakad;
  const [bulan, setBulan] = React.useState<Record<string, DataBulanKalender>>({});
  // Data periode & kunci baru dimuat setelah ada kalender yang tampil.
  const [dipakai, setDipakai] = React.useState(false);
  const kunciSumber = sumber.join(',');

  const muatBulan = React.useCallback(
    (tahun: number, b: number) => {
      if (!nyala || !siakad) return;
      setDipakai(true);
      const k = `${tahun}-${b}|${kodeProdi ?? ''}|${kunciSumber}`;
      const cache = cacheUntuk(siakad);
      let isi = cache.get(k);
      if (!isi || Date.now() - isi.at > UMUR_CACHE) {
        const awal = new Date(tahun, b, 1);
        const off = (awal.getDay() + 6) % 7;
        const dari = toISODate(new Date(tahun, b, 1 - off));
        const sampai = toISODate(new Date(tahun, b, 42 - off));
        isi = {
          at: Date.now(),
          data: (siakad as Siakad).kalender
            .getTerpadu({ dari, sampai, kode_prodi: kodeProdi, sumber: kunciSumber })
            .then((r) => olahKalenderBulan((r.data ?? []) as unknown as KegiatanTerpadu[], sumber))
            .catch(() => {
              cache.delete(k);
              return KOSONG;
            }),
        };
        cache.set(k, isi);
      }
      const kunciState = `${tahun}-${b}`;
      isi.data.then((d) => setBulan((m) => (m[kunciState] === d ? m : { ...m, [kunciState]: d })));
    },
    [nyala, siakad, kodeProdi, kunciSumber],
  );

  const qTahun = useSiakadQuery<PeriodeKalender[]>(
    ['kalender-tanggal', 'tahun'],
    (s, signal) => s.kalender.getTahun({ batas: 6 }, { signal }) as never,
    { enabled: nyala && dipakai, staleTime: UMUR_CACHE },
  );
  const qKunci = useSiakadQuery<StatusPeriode[]>(
    ['kalender', 'kunci'],
    (s, signal) => s.request<StatusPeriode[]>({ method: 'GET', path: '/v1/kalender/kunci', query: { batas: 60 } }, { signal }) as never,
    { enabled: nyala && dipakai, staleTime: 60_000 },
  );
  const periode = React.useMemo(() => (Array.isArray(qTahun.data) ? qTahun.data : []), [qTahun.data]);
  const kunci = React.useMemo(() => new Map((Array.isArray(qKunci.data) ? qKunci.data : []).map((p) => [p.tahun_id, p])), [qKunci.data]);

  const nilai = React.useMemo<SumberKalenderTanggal | null>(() => {
    if (!nyala) return null;
    const rentang = periode.map((p) => ({ p, r: rentangPeriode(p) })).filter((x): x is { p: PeriodeKalender; r: [string, string] } => !!x.r);
    return {
      muatBulan,
      dataBulan: (t, b) => bulan[`${t}-${b}`] ?? null,
      tahapan: periode.flatMap((p) => p.tahap.filter((x) => x.mulai).map(keTahapan)),
      periodeDitutup: (iso) => {
        const memuat = rentang.filter((x) => x.r[0] <= iso && x.r[1] >= iso);
        if (!memuat.length) return null;
        const tutup = memuat.map((x) => kunci.get(x.p.tahun_id)).filter((s): s is StatusPeriode => !!s && s.ditutup && !bukaKembaliCocok(s, fitur));
        // Hanya bila semua periode yang memuat tanggal ini ditutup (tahapan antarperiode bisa bertumpuk).
        if (tutup.length < memuat.length) return null;
        return `Tanggal ini masuk periode ${tutup.map((s) => s.nama).join(', ')} yang sudah ditutup.`;
      },
      preset: presetDariPeriode(periode),
      warna: (j) => EVENT_COLORS[j] ?? 'var(--u-primary)',
      label: (j) => (j === 'libur' ? 'Libur' : (JENIS_KEGIATAN[j] ?? j)),
    };
  }, [nyala, muatBulan, bulan, periode, kunci, fitur]);

  return <KonteksKalenderTanggal.Provider value={nilai}>{children}</KonteksKalenderTanggal.Provider>;
}

/** Data kalender akademik dari penyedia terdekat (untuk komponen buatan sendiri). */
export { useSumberKalenderTanggal as useKalenderAkademik } from '../components/calendar';
