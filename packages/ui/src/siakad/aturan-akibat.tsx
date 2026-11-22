'use client';
import * as React from 'react';
import { Calculator, CircleCheck, Download, FileBadge, HandCoins, History, ListChecks, Receipt, RotateCcw, Users } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Card, Empty } from '../components/display';
import { Field, SegmentedControl, Switch, Textarea } from '../components/forms';
import { Dialog, useToast } from '../components/overlays';
import { PilihTahunAkademik } from './cari';
import { GalatApi } from './galat';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

/*
 * Kebijakan berakibat (SIAKAD docs/ATURAN-AKIBAT.md, tahap 2b). Aturan berjenis "akibat" tidak menolak langkah: isinya
 * dibaca modul (tarif saat tagihan diterbitkan, konversi huruf, bobot nilai, predikat lulus) atau dijalankan sebagai
 * penyesuaian tagihan berjejak yang bisa dibatalkan (keringanan & pemutihan).
 *
 *   kalimatAkibat            kalimat awam isi kebijakan (dipakai juga oleh KetentuanAturan/kartu aturan)
 *   KetentuanAkibat          kalimat + tabel isi kebijakan (skala huruf, predikat, tarif, bobot, keringanan)
 *   SimulasiAkibat           dampak sebelum disahkan / sebelum penerapan massal: jumlah orang, total sebelum/sesudah,
 *                            daftar beserta alasan per orang, ekspor CSV
 *   PanelAkibatAturan        tab "Simulasi & penerapan" di detail aturan: simulasi (versi berlaku / versi diajukan),
 *                            terapkan massal dengan konfirmasi (BAUK), daftar penerapan + batalkan
 *   RiwayatPenyesuaianTagihan riwayat penyesuaian tagihan seorang mahasiswa (Keuangan, Profil)
 *
 * Bahasa layar awam; kode titik/indikator hanya di detail teknis.
 */

// ================================================================ Tipe

export type BentukAkibat = 'tarif' | 'keringanan' | 'konversi_huruf' | 'bobot_nilai' | 'predikat_lulus' | 'bobot_skripsi';

export interface ParameterAkibat {
  akibat?: string;
  bentuk: BentukAkibat;
  mulai_periode?: string;
  skala?: Array<{ huruf: string; min: number; bobot: number; lulus?: boolean }>;
  komponen?: Record<string, number>;
  wajib?: boolean;
  tingkat?: Array<{ predikat: string; ipk_min: number; maks_semester: number | null }>;
  tarif?: Array<{ kode_biaya: string; rupiah: number }>;
  pemicu?: 'manual' | 'aktif_kembali';
  kode_biaya?: string[];
  putihkan?: boolean;
  bayar_semester?: number;
  tarif_periode_baru?: boolean;
  potongan_persen?: number;
  potongan_nominal?: number;
  /** bobot_skripsi: persen nilai pembimbing dan penguji sidang (jumlah 100). */
  bimbingan?: number;
  sidang?: number;
}

export interface UbahTagihanAkibat {
  idmb?: number;
  tahun_id: string;
  kode_biaya: string;
  /** Nama awam jenis biaya, mis. "BPP (001)". */
  nama_biaya?: string;
  jenis: string;
  sebelum: number | null;
  sesudah: number;
  dibayar: number;
  keterangan: string | null;
  dibalik_at?: string | null;
}

export interface BarisSimulasiAkibat {
  nim: string;
  nama: string | null;
  kode_prodi?: string | null;
  memenuhi?: boolean;
  alasan: string[] | string;
  total_sebelum?: number;
  total_sesudah?: number;
  ubah?: UbahTagihanAkibat[];
  sudah_diterapkan?: string;
  // konversi/predikat/tarif
  kode_mk?: string;
  kode_biaya?: string;
  kelas?: string;
  mahasiswa?: number;
  nilai_angka?: number;
  ipk?: number;
  sebelum?: string | number | null;
  sesudah?: string | number | null;
}

export interface SimulasiAkibatHasil {
  bentuk: BentukAkibat;
  tahun_id: string;
  kalimat: string;
  sumber: 'aturan' | 'usulan';
  aturan: { id: string; nama: string; status: string; versi: number };
  jumlah_diperiksa: number;
  jumlah_memenuhi?: number;
  jumlah_berubah: number;
  mahasiswa_terdampak?: number;
  total_sebelum?: number;
  total_sesudah?: number;
  selisih?: number;
  ringkasan?: Array<{ perubahan: string; jumlah: number }>;
  catatan?: string;
  data: BarisSimulasiAkibat[];
  tidak_memenuhi?: BarisSimulasiAkibat[];
  terpotong?: boolean;
}

export interface PenerapanAkibat {
  id: string;
  aturan: { id: string | null; nama: string | null; versi: number };
  sk: { id: number | null; nomor: string } | null;
  bentuk: BentukAkibat;
  cara: 'otomatis' | 'massal' | 'satu';
  pemicu: string | null;
  nim: string;
  nama: string | null;
  kode_prodi: string | null;
  tahun_id: string | null;
  status: 'diterapkan' | 'dibatalkan';
  alasan: string[];
  kalimat: string | null;
  total_sebelum: number;
  total_sesudah: number;
  oleh: string;
  waktu: string;
  dibatalkan_oleh: string | null;
  dibatalkan_at: string | null;
  alasan_batal: string | null;
  ubah?: UbahTagihanAkibat[];
}

// ================================================================ Kalimat awam

const rupiah = (n: number | null | undefined) => (n === null || n === undefined ? '–' : `Rp${Math.round(n).toLocaleString('id-ID')}`);
const angkaId = (n: number, digit = 2) => n.toLocaleString('id-ID', { maximumFractionDigits: digit });
const KOMPONEN: Record<string, string> = { Tugas: 'tugas', Harian: 'nilai harian', HDR: 'kehadiran', UTS: 'UTS', UAS: 'UAS' };

/** "2026-11-21 20:57:36" → "21 Nov 2026 pukul 20.57". */
export function waktuAwam(w?: string | null): string {
  if (!w) return '–';
  const d = new Date(w.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return w;
  return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} pukul ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
}

/** Nama periode awam: 20261 → 2026/2027 Ganjil. */
export function namaPeriodeAkibat(t?: string | null): string {
  if (!t || !/^\d{5}$/.test(t)) return t ?? '';
  const th = Number(t.slice(0, 4));
  return `${th}/${th + 1} ${({ '1': 'Ganjil', '2': 'Genap', '3': 'Pendek' } as Record<string, string>)[t.slice(4)] ?? ''}`.trim();
}

/** Parameter dari detail aturan atau usulan (usulan menyimpan parameter sebagai teks JSON). */
export function parameterAkibat(p: unknown): ParameterAkibat | null {
  if (typeof p === 'string') {
    try {
      return JSON.parse(p) as ParameterAkibat;
    } catch {
      return null;
    }
  }
  return p && typeof p === 'object' && 'bentuk' in p ? (p as ParameterAkibat) : null;
}

/** Kalimat isi kebijakan berakibat dalam bahasa awam. */
export function kalimatAkibat(p0: unknown): string {
  const p = parameterAkibat(p0);
  if (!p) return '';
  const mulai = p.mulai_periode ? `Mulai ${namaPeriodeAkibat(p.mulai_periode)}, ` : '';
  switch (p.bentuk) {
    case 'konversi_huruf':
      return `${mulai}nilai angka dikonversi: ${(p.skala ?? []).map((s) => `${s.huruf} bila ≥ ${angkaId(s.min)}`).join(', ')}.`;
    case 'bobot_nilai':
      return `${mulai}nilai akhir = ${Object.entries(p.komponen ?? {})
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${angkaId(v)}% ${KOMPONEN[k] ?? k}`)
        .join(' + ')}${p.wajib ? ', wajib untuk semua kelas.' : ', untuk kelas yang dosennya belum mengatur bobot.'}`;
    case 'predikat_lulus':
      return `${mulai}predikat lulusan: ${(p.tingkat ?? []).map((t) => `${t.predikat} (IPK ≥ ${angkaId(t.ipk_min)}${t.maks_semester ? `, lulus paling lama ${t.maks_semester} semester` : ''})`).join('; ')}.`;
    case 'bobot_skripsi':
      return `${mulai}nilai skripsi = ${angkaId(p.bimbingan ?? 0)}% nilai pembimbing + ${angkaId(p.sidang ?? 100)}% nilai penguji sidang (bila nilai pembimbing belum ada, 100% nilai sidang). Nilai yang sudah ada di KHS tidak diubah otomatis.`;
    case 'tarif':
      return `${mulai}tarif per semester: ${(p.tarif ?? []).map((t) => `biaya ${t.kode_biaya} ${rupiah(t.rupiah)}`).join(', ')}. Dipakai saat tagihan diterbitkan.`;
    case 'keringanan': {
      const biaya = p.kode_biaya?.length ? `jenis biaya ${p.kode_biaya.join(', ')}` : 'semua jenis biaya';
      const bagian = [
        p.putihkan ? `tunggakan ${biaya} diputihkan${p.bayar_semester ? `, kecuali ${p.bayar_semester} semester terakhir yang tetap dibayar` : ''}` : '',
        p.tarif_periode_baru ? 'semester yang tetap dibayar memakai tarif periode baru' : '',
        p.potongan_persen ? `potongan ${angkaId(p.potongan_persen)}%` : '',
        p.potongan_nominal ? `potongan ${rupiah(p.potongan_nominal)}` : '',
      ].filter(Boolean);
      const kapan = p.pemicu === 'aktif_kembali' ? 'Diterapkan otomatis saat mahasiswa aktif kembali setelah cuti.' : 'Diterapkan oleh BAUK setelah simulasi diperiksa.';
      const kal = bagian.join('; ');
      return `${kal.charAt(0).toUpperCase()}${kal.slice(1)}. ${kapan}`;
    }
    default:
      return '';
  }
}

const JUDUL_BENTUK: Record<BentukAkibat, string> = {
  tarif: 'Tarif biaya',
  keringanan: 'Keringanan & pemutihan',
  konversi_huruf: 'Konversi nilai huruf',
  bobot_nilai: 'Bobot nilai akhir',
  predikat_lulus: 'Predikat kelulusan',
  bobot_skripsi: 'Bobot nilai skripsi',
};

/** Isi kebijakan berakibat: kalimat + tabel isinya. */
export function KetentuanAkibat({ parameter, className }: { parameter: unknown; className?: string }) {
  const p = parameterAkibat(parameter);
  if (!p) return null;
  return (
    <div className={cn('u-akb-ketentuan', className)}>
      <p className="u-akb-kalimat">{kalimatAkibat(p)}</p>
      {p.bentuk === 'konversi_huruf' && (
        <table className="u-akb-tabel">
          <thead>
            <tr>
              <th>Huruf</th>
              <th>Nilai paling sedikit</th>
              <th>Bobot</th>
              <th>Lulus</th>
            </tr>
          </thead>
          <tbody>
            {(p.skala ?? []).map((s) => (
              <tr key={s.huruf}>
                <td>
                  <strong>{s.huruf}</strong>
                </td>
                <td>{angkaId(s.min)}</td>
                <td>{angkaId(s.bobot)}</td>
                <td>{s.lulus === false ? 'Tidak' : 'Ya'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {p.bentuk === 'predikat_lulus' && (
        <table className="u-akb-tabel">
          <thead>
            <tr>
              <th>Predikat</th>
              <th>IPK paling sedikit</th>
              <th>Masa studi paling lama</th>
            </tr>
          </thead>
          <tbody>
            {(p.tingkat ?? []).map((t) => (
              <tr key={t.predikat}>
                <td>
                  <strong>{t.predikat}</strong>
                </td>
                <td>{angkaId(t.ipk_min)}</td>
                <td>{t.maks_semester ? `${t.maks_semester} semester` : 'Tidak dibatasi'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {p.bentuk === 'tarif' && (
        <table className="u-akb-tabel">
          <thead>
            <tr>
              <th>Jenis biaya</th>
              <th>Tarif per semester</th>
            </tr>
          </thead>
          <tbody>
            {(p.tarif ?? []).map((t) => (
              <tr key={t.kode_biaya}>
                <td>{t.kode_biaya}</td>
                <td>{rupiah(t.rupiah)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ================================================================ Data

export function useSimulasiAkibat(id: string | null | undefined, f: { tahunId?: string; usulan?: boolean; semua?: boolean; nim?: string } = {}, opsi: { enabled?: boolean } = {}) {
  return useSiakadQuery<SimulasiAkibatHasil>(
    ['aturan', 'akibat', 'simulasi', id ?? '', f],
    (s, signal) =>
      s.request<SimulasiAkibatHasil>(
        { method: 'GET', path: `/v1/aturan/${id}/akibat/simulasi`, query: { tahun_id: f.tahunId || undefined, usulan: f.usulan ? 1 : undefined, semua: f.semua ? 1 : undefined, nim: f.nim || undefined } },
        { signal },
      ),
    { enabled: Boolean(id) && opsi.enabled !== false, staleTime: 5_000 },
  );
}

export function usePenerapanAkibat(id: string | null | undefined, opsi: { enabled?: boolean } = {}) {
  return useSiakadQuery<{ data: PenerapanAkibat[]; ringkasan: { jumlah: number; diterapkan: number; total_sebelum: number; total_sesudah: number }; boleh_terapkan: boolean }>(
    ['aturan', 'akibat', 'penerapan', id ?? ''],
    async (s, signal) => {
      const r = await s.request<unknown>({ method: 'GET', path: `/v1/aturan/${id}/akibat/penerapan` }, { signal });
      // Bentuk {data, ringkasan, boleh_terapkan} dibungkus amplop {data}; dukung keduanya.
      const d = r.data as { data?: PenerapanAkibat[]; ringkasan?: never; boleh_terapkan?: boolean } | PenerapanAkibat[];
      return { ...r, data: Array.isArray(d) ? { data: d, ringkasan: { jumlah: d.length, diterapkan: 0, total_sebelum: 0, total_sesudah: 0 }, boleh_terapkan: false } : (d as never) };
    },
    { enabled: Boolean(id) && opsi.enabled !== false, staleTime: 5_000 },
  );
}

/** Riwayat penyesuaian tagihan: `nim` (BAUK/BAAK) atau tanpa nim = milik mahasiswa yang masuk. */
export function useRiwayatPenyesuaian(nim?: string | null, opsi: { enabled?: boolean } = {}) {
  return useSiakadQuery<PenerapanAkibat[]>(
    ['aturan', 'akibat', 'mahasiswa', nim ?? 'saya'],
    (s, signal) => s.request<PenerapanAkibat[]>({ method: 'GET', path: nim ? `/v1/aturan/akibat/mahasiswa/${encodeURIComponent(nim)}` : '/v1/aturan/akibat/saya' }, { signal }),
    { enabled: opsi.enabled !== false },
  );
}

// ================================================================ Simulasi

function Ringkas({ label, nilai, ikon, nada }: { label: string; nilai: React.ReactNode; ikon: React.ReactNode; nada?: 'baik' | 'netral' }) {
  return (
    <div className="u-akb-angka" data-nada={nada}>
      <span className="u-akb-angka-ikon" aria-hidden>
        {ikon}
      </span>
      <span className="u-akb-angka-label">{label}</span>
      <strong>{nilai}</strong>
    </div>
  );
}

const teksAlasan = (a: string[] | string) => (Array.isArray(a) ? a.join(' ') : a);

/** Rincian perubahan tagihan per periode (sebelum → sesudah). */
export function RincianUbahTagihan({ ubah }: { ubah: UbahTagihanAkibat[] }) {
  if (!ubah.length) return null;
  return (
    <table className="u-akb-tabel u-akb-tabel-rinci">
      <thead>
        <tr>
          <th>Periode</th>
          <th>Jenis biaya</th>
          <th>Tagihan sebelum</th>
          <th>Tagihan sesudah</th>
          <th>Sudah dibayar</th>
          <th>Keterangan</th>
        </tr>
      </thead>
      <tbody>
        {ubah.map((u, i) => (
          <tr key={i} data-dibalik={u.dibalik_at ? '' : undefined}>
            <td>{namaPeriodeAkibat(u.tahun_id)}</td>
            <td>{u.nama_biaya ?? u.kode_biaya}</td>
            <td>{rupiah(u.sebelum)}</td>
            <td>
              <strong>{rupiah(u.sesudah)}</strong>
            </td>
            <td>{rupiah(u.dibayar)}</td>
            <td>{u.keterangan}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

async function unduhCsv(s: ReturnType<typeof useSiakad>, id: string, query: Record<string, string | number | undefined>, nama: string) {
  const r = await s.request<unknown>({ method: 'GET', path: `/v1/aturan/${id}/akibat/simulasi`, query: { ...query, format: 'csv' } });
  const x = r.data as { blob?: () => Blob } | Blob | string | null;
  const blob = x instanceof Blob ? x : x && typeof x === 'object' && typeof x.blob === 'function' ? x.blob() : new Blob([typeof x === 'string' ? x : JSON.stringify(x)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const el = document.createElement('a');
  el.href = url;
  el.download = nama;
  el.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export interface SimulasiAkibatProps {
  aturanId: string;
  /** Simulasikan isi versi yang sedang diajukan (bukan versi yang berlaku). */
  usulan?: boolean;
  tahunId?: string;
  className?: string;
}

/** Dampak kebijakan: jumlah orang, total sebelum/sesudah, daftar beserta alasan per orang, ekspor CSV. */
export function SimulasiAkibat({ aturanId, usulan, tahunId: tahunAwal, className }: SimulasiAkibatProps) {
  const s = useSiakad();
  const toast = useToast();
  const [tahun, setTahun] = React.useState(tahunAwal ?? '');
  const [tahunDipakai, setTahunDipakai] = React.useState(tahunAwal ?? '');
  const [semua, setSemua] = React.useState(false);
  const [buka, setBuka] = React.useState<string | null>(null);
  const q = useSimulasiAkibat(aturanId, { tahunId: tahunDipakai, usulan, semua });
  const d = q.data;
  const uang = d?.bentuk === 'keringanan' || d?.bentuk === 'tarif';
  const baris = d ? [...d.data, ...(semua ? (d.tidak_memenuhi ?? []) : [])] : [];
  return (
    <div className={cn('u-akb-simulasi', className)}>
      <div className="u-akb-bilah">
        <Field label="Periode simulasi" description="Kosongkan untuk memakai periode mulai berlaku atau periode berjalan.">
          <div className="u-akb-bilah-isi">
            <PilihTahunAkademik value={tahun || null} onValueChange={(v) => setTahun(v ?? '')} placeholder="Periode mulai berlaku" aria-label="Periode simulasi" />
            <Button variant="outline" onClick={() => setTahunDipakai(tahun)} disabled={tahun === tahunDipakai}>
              Hitung ulang
            </Button>
          </div>
        </Field>
        {d?.bentuk === 'keringanan' && (
          <label className="u-akb-saklar">
            <Switch checked={semua} onCheckedChange={setSemua} size="sm" /> Tampilkan juga mahasiswa yang tidak memenuhi syarat
          </label>
        )}
        <Button
          variant="ghost"
          onClick={() =>
            unduhCsv(s, aturanId, { tahun_id: tahunDipakai || undefined, usulan: usulan ? 1 : undefined, semua: semua ? 1 : undefined }, `simulasi-${d?.aturan.nama ?? aturanId}-${d?.tahun_id ?? ''}.csv`).catch((e) =>
              toast.add({ title: 'Ekspor gagal', description: pesanGalat(e), type: 'error' }),
            )
          }
          disabled={!d}
        >
          <Download /> Unduh daftar (CSV)
        </Button>
      </div>
      {q.loading && !d ? (
        <Skeleton height={160} />
      ) : q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : d ? (
        <>
          <p className="u-akb-sub">
            {d.sumber === 'usulan' ? 'Versi yang diajukan' : 'Versi yang berlaku'} · periode {namaPeriodeAkibat(d.tahun_id)}
          </p>
          <div className="u-akb-angka-baris">
            <Ringkas label={d.bentuk === 'bobot_nilai' ? 'Kelas terdampak' : d.bentuk === 'konversi_huruf' ? 'Nilai berubah huruf' : 'Orang memenuhi'} nilai={(d.jumlah_memenuhi ?? d.jumlah_berubah).toLocaleString('id-ID')} ikon={<Users />} />
            <Ringkas label={d.bentuk === 'bobot_nilai' ? 'Kelas diperiksa' : d.bentuk === 'konversi_huruf' ? 'Nilai diperiksa' : 'Mahasiswa diperiksa'} nilai={d.jumlah_diperiksa.toLocaleString('id-ID')} ikon={<ListChecks />} nada="netral" />
            {uang && <Ringkas label={d.bentuk === 'tarif' ? 'Tagihan sekarang' : 'Sisa tagihan sebelum'} nilai={rupiah(d.total_sebelum)} ikon={<Receipt />} nada="netral" />}
            {uang && <Ringkas label={d.bentuk === 'tarif' ? 'Menurut tarif baru' : 'Sisa tagihan sesudah'} nilai={rupiah(d.total_sesudah)} ikon={<HandCoins />} nada="baik" />}
            {d.mahasiswa_terdampak !== undefined && <Ringkas label="Mahasiswa di kelas itu" nilai={d.mahasiswa_terdampak.toLocaleString('id-ID')} ikon={<Users />} nada="netral" />}
          </div>
          {d.ringkasan && d.ringkasan.length > 0 && (
            <p className="u-akb-sub">
              Perubahan huruf: {d.ringkasan.map((r) => `${r.perubahan.replace('→', ' → ')} (${r.jumlah})`).join(', ')}
            </p>
          )}
          {d.catatan && <p className="u-akb-sub">{d.catatan}</p>}
          {baris.length === 0 ? (
            <Empty title="Tidak ada yang terdampak" description="Belum ada orang/nilai yang memenuhi kebijakan ini pada periode simulasi." />
          ) : (
            <ul className="u-akb-daftar" aria-label="Hasil simulasi per orang">
              {baris.slice(0, 300).map((r, i) => {
                const kunci = `${r.nim}-${r.kode_mk ?? r.kode_biaya ?? r.kelas ?? i}`;
                const ubah = r.ubah ?? [];
                return (
                  <li key={kunci} data-memenuhi={r.memenuhi === false ? 'tidak' : 'ya'}>
                    <div className="u-akb-daftar-kepala">
                      <div>
                        <strong>{r.nama ?? r.kode_mk ?? r.kelas}</strong>
                        <span className="u-akb-sub">
                          {[r.nim, r.kode_mk, r.kelas ? `kelas ${r.kelas}` : null, r.kode_prodi].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                      {r.total_sebelum !== undefined ? (
                        <span className="u-akb-sebelum-sesudah">
                          <s>{rupiah(r.total_sebelum)}</s> → <strong>{rupiah(r.total_sesudah)}</strong>
                        </span>
                      ) : r.sebelum !== undefined ? (
                        <span className="u-akb-sebelum-sesudah">
                          <s>{typeof r.sebelum === 'number' ? rupiah(r.sebelum) : (r.sebelum ?? '–')}</s> → <strong>{typeof r.sesudah === 'number' ? rupiah(r.sesudah) : r.sesudah}</strong>
                        </span>
                      ) : null}
                    </div>
                    <p className="u-akb-alasan">{teksAlasan(r.alasan)}</p>
                    {ubah.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => setBuka(buka === kunci ? null : kunci)} aria-expanded={buka === kunci}>
                        {buka === kunci ? 'Sembunyikan rincian' : `Lihat rincian tagihan (${ubah.length})`}
                      </Button>
                    )}
                    {buka === kunci && <RincianUbahTagihan ubah={ubah} />}
                  </li>
                );
              })}
            </ul>
          )}
          {(d.terpotong || baris.length > 300) && <p className="u-akb-sub">Daftar dipotong; unduh CSV untuk daftar lengkap.</p>}
        </>
      ) : null}
    </div>
  );
}

// ================================================================ Panel di detail aturan

export interface AturanAkibatRingkas {
  id: string;
  nama: string;
  status: string;
  jenis: string;
  parameter: unknown;
  usulan?: { jenis?: string; status?: string; data?: { parameter?: unknown } | null } | null;
}

const LABEL_CARA: Record<PenerapanAkibat['cara'], string> = { otomatis: 'Otomatis', massal: 'Massal oleh BAUK', satu: 'Per mahasiswa' };

/** Tab "Simulasi & penerapan" di detail aturan berjenis akibat. */
export function PanelAkibatAturan({ aturan: a }: { aturan: AturanAkibatRingkas }) {
  const p = parameterAkibat(a.parameter);
  const adaUsulan = a.usulan?.jenis === 'ubah' && (a.usulan.status === 'diajukan' || a.usulan.status === 'draf');
  const [versi, setVersi] = React.useState<'berlaku' | 'usulan'>(adaUsulan ? 'usulan' : 'berlaku');
  const keringanan = p?.bentuk === 'keringanan';
  const pen = usePenerapanAkibat(a.id, { enabled: keringanan });
  const [terapkan, setTerapkan] = React.useState(false);
  const [batal, setBatal] = React.useState<PenerapanAkibat | null>(null);
  if (!p) return <Alert variant="warning">Isi kebijakan belum lengkap.</Alert>;
  return (
    <div className="u-akb">
      <KetentuanAkibat parameter={a.parameter} />
      <Card className="u-akb-kartu">
        <div className="u-akb-kartu-kepala">
          <h4 className="u-akb-judul">
            <Calculator aria-hidden /> Simulasi dampak
          </h4>
          {adaUsulan && (
            <SegmentedControl
              options={[
                { value: 'usulan', label: 'Versi diajukan' },
                { value: 'berlaku', label: 'Versi berlaku' },
              ]}
              value={versi}
              onValueChange={setVersi}
              aria-label="Versi yang disimulasikan"
            />
          )}
        </div>
        <p className="u-akb-sub">
          {a.status === 'aktif'
            ? 'Lihat siapa yang terkena dan berapa nilainya sebelum menyetujui versi baru atau menerapkannya.'
            : 'Simulasi wajib dilihat sebelum diajukan: validator akan melihat hasil yang sama.'}
        </p>
        <SimulasiAkibat key={versi} aturanId={a.id} usulan={versi === 'usulan'} />
      </Card>
      {keringanan && (
        <Card className="u-akb-kartu">
          <div className="u-akb-kartu-kepala">
            <h4 className="u-akb-judul">
              <History aria-hidden /> Penerapan
            </h4>
            {pen.data?.boleh_terapkan && a.status === 'aktif' && (
              <Button onClick={() => setTerapkan(true)}>
                <HandCoins /> Terapkan massal…
              </Button>
            )}
          </div>
          {a.status !== 'aktif' && <p className="u-akb-sub">Penerapan terbuka setelah kebijakan disahkan.</p>}
          {pen.data && (
            <p className="u-akb-sub">
              {pen.data.ringkasan.diterapkan} mahasiswa sudah mendapat kebijakan ini · sisa tagihan {rupiah(pen.data.ringkasan.total_sebelum)} → {rupiah(pen.data.ringkasan.total_sesudah)}
            </p>
          )}
          {pen.loading && !pen.data ? (
            <Skeleton height={80} />
          ) : pen.error ? (
            <GalatApi error={pen.error} onRetry={pen.refetch} />
          ) : (
            <DaftarPenerapan data={pen.data?.data ?? []} bolehBatal={Boolean(pen.data?.boleh_terapkan)} onBatal={setBatal} />
          )}
        </Card>
      )}
      {terapkan && <PanelTerapkanAkibat aturan={a} open onOpenChange={setTerapkan} />}
      {batal && <PanelBatalPenerapan penerapan={batal} open onOpenChange={(o) => !o && setBatal(null)} />}
    </div>
  );
}

function DaftarPenerapan({ data, bolehBatal, onBatal, tampilAturan }: { data: PenerapanAkibat[]; bolehBatal?: boolean; onBatal?: (p: PenerapanAkibat) => void; tampilAturan?: boolean }) {
  const [buka, setBuka] = React.useState<string | null>(null);
  if (!data.length) return <Empty title="Belum ada penerapan" description="Penerapan otomatis dan massal akan tercatat di sini beserta nilai sebelum/sesudah." />;
  return (
    <ul className="u-akb-daftar" aria-label="Daftar penerapan">
      {data.map((x) => (
        <li key={x.id} data-status={x.status}>
          <div className="u-akb-daftar-kepala">
            <div>
              <strong>{tampilAturan ? (x.aturan.nama ?? 'Kebijakan') : (x.nama ?? x.nim)}</strong>
              <span className="u-akb-sub">
                {[tampilAturan ? null : x.nim, LABEL_CARA[x.cara], x.tahun_id ? namaPeriodeAkibat(x.tahun_id) : null, x.sk ? `SK ${x.sk.nomor}` : null].filter(Boolean).join(' · ')}
              </span>
            </div>
            <span className="u-akb-sebelum-sesudah">
              <s>{rupiah(x.total_sebelum)}</s> → <strong>{rupiah(x.total_sesudah)}</strong>
            </span>
          </div>
          <div className="u-akb-lencana">
            {x.status === 'diterapkan' ? (
              <Badge variant="success">
                <CircleCheck aria-hidden /> Diterapkan
              </Badge>
            ) : (
              <Badge variant="secondary">
                <RotateCcw aria-hidden /> Dibatalkan
              </Badge>
            )}
            <span className="u-akb-sub">
              {x.status === 'diterapkan'
                ? `${x.cara === 'otomatis' ? 'otomatis saat aktif kembali' : `oleh ${x.oleh}`}, ${waktuAwam(x.waktu)}`
                : `dibatalkan oleh ${x.dibatalkan_oleh ?? '–'}, ${waktuAwam(x.dibatalkan_at)}${x.alasan_batal ? `: ${x.alasan_batal}` : ''}`}
            </span>
          </div>
          <p className="u-akb-alasan">{teksAlasan(x.alasan)}</p>
          <div className="u-akb-aksi">
            {(x.ubah?.length ?? 0) > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setBuka(buka === x.id ? null : x.id)} aria-expanded={buka === x.id}>
                {buka === x.id ? 'Sembunyikan rincian' : 'Lihat rincian tagihan'}
              </Button>
            )}
            {bolehBatal && x.status === 'diterapkan' && onBatal && (
              <Button variant="outline" size="sm" onClick={() => onBatal(x)}>
                <RotateCcw /> Batalkan penerapan…
              </Button>
            )}
          </div>
          {buka === x.id && x.ubah && <RincianUbahTagihan ubah={x.ubah} />}
        </li>
      ))}
    </ul>
  );
}

/** Panel samping penerapan massal: simulasi terbaru lalu konfirmasi jumlah & nominal. */
function PanelTerapkanAkibat({ aturan: a, open, onOpenChange }: { aturan: AturanAkibatRingkas; open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useSiakad();
  const toast = useToast();
  const sim = useSimulasiAkibat(a.id, {});
  const [setuju, setSetuju] = React.useState(false);
  const [kirim, setKirim] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const d = sim.data;
  const jalan = async () => {
    if (!d) return;
    setKirim(true);
    setGalat(null);
    try {
      const r = await s.request<{ diterapkan: unknown[]; gagal: Array<{ nim: string; alasan: string }> }>({ method: 'POST', path: `/v1/aturan/${a.id}/akibat/terapkan`, body: { tahun_id: d.tahun_id, konfirmasi: d.jumlah_memenuhi ?? 0 } });
      invalidateSiakad('aturan');
      toast.add({
        title: r.data.gagal.length ? `Diterapkan ke ${r.data.diterapkan.length} mahasiswa, ${r.data.gagal.length} belum berhasil` : `Diterapkan ke ${r.data.diterapkan.length} mahasiswa`,
        description: r.data.gagal.length ? `${r.data.gagal.map((g) => `${g.nim}: ${g.alasan}`).join(' ')} Buka simulasi lagi lalu terapkan ulang untuk mereka.` : 'Setiap perubahan tagihan tercatat dan bisa dibatalkan.',
        type: r.data.gagal.length ? 'warning' : 'success',
      });
      onOpenChange(false);
    } catch (e) {
      setGalat(pesanGalat(e));
      sim.refetch();
    } finally {
      setKirim(false);
    }
  };
  const jumlah = d?.jumlah_memenuhi ?? 0;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      size="lg"
      title={`Terapkan “${a.nama}”`}
      description="Tagihan mahasiswa yang memenuhi disesuaikan. Setiap perubahan dicatat sebelum/sesudah dan bisa dibatalkan per mahasiswa."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <Button onClick={jalan} loading={kirim} disabled={!d || jumlah === 0 || !setuju}>
            <HandCoins /> Terapkan ke {jumlah} mahasiswa
          </Button>
        </>
      }
    >
      <div className="u-akb-panel">
        {sim.loading && !d ? <Skeleton height={120} /> : sim.error ? <GalatApi error={sim.error} onRetry={sim.refetch} /> : null}
        {d && (
          <>
            <p className="u-akb-kalimat">{d.kalimat}</p>
            <div className="u-akb-angka-baris">
              <Ringkas label="Mahasiswa memenuhi" nilai={jumlah.toLocaleString('id-ID')} ikon={<Users />} />
              <Ringkas label="Sisa tagihan sebelum" nilai={rupiah(d.total_sebelum)} ikon={<Receipt />} nada="netral" />
              <Ringkas label="Sisa tagihan sesudah" nilai={rupiah(d.total_sesudah)} ikon={<HandCoins />} nada="baik" />
            </div>
            <ul className="u-akb-daftar u-akb-daftar-ringkas">
              {d.data.slice(0, 50).map((r) => (
                <li key={r.nim}>
                  <div className="u-akb-daftar-kepala">
                    <div>
                      <strong>{r.nama}</strong>
                      <span className="u-akb-sub">{r.nim}</span>
                    </div>
                    <span className="u-akb-sebelum-sesudah">
                      <s>{rupiah(r.total_sebelum)}</s> → <strong>{rupiah(r.total_sesudah)}</strong>
                    </span>
                  </div>
                  <p className="u-akb-alasan">{teksAlasan(r.alasan)}</p>
                </li>
              ))}
            </ul>
            {jumlah > 50 && <p className="u-akb-sub">dan {jumlah - 50} mahasiswa lainnya (unduh CSV dari tab simulasi).</p>}
            <label className="u-akb-saklar">
              <Switch checked={setuju} onCheckedChange={setSetuju} size="sm" /> Saya sudah memeriksa daftar ini dan menerapkannya sesuai SK
            </label>
          </>
        )}
        {galat && <Alert variant="danger">{galat}</Alert>}
      </div>
    </Dialog>
  );
}

/** Panel samping pembatalan satu penerapan (alasan wajib). */
function PanelBatalPenerapan({ penerapan: x, open, onOpenChange }: { penerapan: PenerapanAkibat; open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useSiakad();
  const toast = useToast();
  const [alasan, setAlasan] = React.useState('');
  const [kirim, setKirim] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const jalan = async () => {
    setKirim(true);
    setGalat(null);
    try {
      await s.request({ method: 'POST', path: `/v1/aturan/akibat/penerapan/${x.id}/batalkan`, body: { alasan } });
      invalidateSiakad('aturan');
      toast.add({ title: 'Penerapan dibatalkan', description: `Tagihan ${x.nama ?? x.nim} kembali seperti sebelum kebijakan diterapkan.`, type: 'success' });
      onOpenChange(false);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setKirim(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      size="md"
      title={`Batalkan penerapan untuk ${x.nama ?? x.nim}`}
      description="Semua tagihan yang diubah penerapan ini kembali ke nilai sebelumnya."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <Button variant="destructive" onClick={jalan} loading={kirim} disabled={alasan.trim().length < 5}>
            <RotateCcw /> Batalkan penerapan
          </Button>
        </>
      }
    >
      <div className="u-akb-panel">
        {x.ubah && <RincianUbahTagihan ubah={x.ubah} />}
        <Field label="Alasan pembatalan" required description="Tercatat di riwayat penyesuaian mahasiswa.">
          <Textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} maxLength={500} placeholder="mis. SK pemutihan direvisi; diterapkan ulang setelah SK baru" />
        </Field>
        {galat && <Alert variant="danger">{galat}</Alert>}
      </div>
    </Dialog>
  );
}

// ================================================================ Riwayat penyesuaian mahasiswa

/** Riwayat penyesuaian tagihan oleh kebijakan berdasar SK (Keuangan: `nim`; Profil mahasiswa: tanpa nim). */
export function RiwayatPenyesuaianTagihan({ nim, data, className }: { nim?: string; data?: PenerapanAkibat[]; className?: string }) {
  const q = useRiwayatPenyesuaian(nim, { enabled: !data });
  const isi = data ?? q.data;
  if (!data && q.loading && !q.data) return <Skeleton height={80} />;
  if (!data && q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  return (
    <div className={cn('u-akb', className)}>
      <p className="u-akb-sub">
        <FileBadge aria-hidden /> Penyesuaian tagihan karena kebijakan kampus berdasar SK (pemutihan, tarif periode baru, potongan). Nilai sebelum dan sesudah tercatat.
      </p>
      <DaftarPenerapan data={isi ?? []} tampilAturan />
    </div>
  );
}

export { JUDUL_BENTUK as JUDUL_BENTUK_AKIBAT };
