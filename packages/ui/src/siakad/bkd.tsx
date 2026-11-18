'use client';
import * as React from 'react';
import { BookOpen, Briefcase, CircleCheck, CircleX, FileText, FlaskConical, Handshake, Link2, Paperclip, ShieldCheck, TriangleAlert } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, type BadgeVariant } from '../components/actions';

/*
 * Beban Kerja Dosen (SIAKAD /v1/sdm/bkd, docs/BKD.md). Bentuk data mengikuti respons API sehingga SDM dan portal
 * Fakultas menampilkan BKD dengan cara yang sama:
 *
 *   RingkasanBebanBkd   total SKS terhadap batas minimal/maksimal + beban per bidang (pendidikan, penelitian, ...)
 *   SyaratBkd           daftar syarat aturan BKD (terpenuhi / tidak / peringatan) beserta sumber aturannya
 *   KesimpulanBkd       lencana memenuhi / tidak memenuhi / dibebaskan / belum dinilai
 *   DaftarKegiatanBkd   kegiatan dikelompokkan per bidang: sumber data, SKS, bukti, penilaian asesor (M/TM), aksi
 *   TahapBkd            lini tahap laporan: rencana -> pelaksanaan -> penilaian -> mengetahui -> ditetapkan
 *
 * Angka minimal/maksimal, bidang, dan kategori selalu datang dari versi aturan BKD laporan (bukan konstanta di UI).
 */

export interface BidangBkd {
  kode: string;
  nama: string;
  nilai: number;
  rencana?: number;
  realisasi?: number;
  diakui?: number;
  min?: number | null;
  maks?: number | null;
  jumlah?: number;
  ditolak?: number;
}

export interface SyaratBkdItem {
  kode: string;
  judul: string;
  nilai: number;
  batas: number;
  terpenuhi: boolean;
  mode: 'wajib' | 'peringatan';
  sumber?: string | null;
  keterangan?: string | null;
  satuan?: string;
}

export type KesimpulanBkdNilai = 'belum' | 'memenuhi' | 'tidak_memenuhi' | 'dibebaskan';

const angka = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(Number(n)) ? '-' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(Number(n));
export const sksBkd = (n: number | null | undefined) => `${angka(n)} SKS`;

const IKON_BIDANG: Record<string, React.ReactNode> = {
  pendidikan: <BookOpen aria-hidden />,
  penelitian: <FlaskConical aria-hidden />,
  pengabdian: <Handshake aria-hidden />,
  penunjang: <ShieldCheck aria-hidden />,
  tugas_tambahan: <Briefcase aria-hidden />,
};
export function IkonBidangBkd({ kode }: { kode: string }) {
  return <>{IKON_BIDANG[kode] ?? <BookOpen aria-hidden />}</>;
}

const KESIMPULAN: Record<KesimpulanBkdNilai, [string, BadgeVariant]> = {
  belum: ['Belum dinilai', 'neutral'],
  memenuhi: ['Memenuhi', 'success'],
  tidak_memenuhi: ['Tidak memenuhi', 'danger'],
  dibebaskan: ['Dibebaskan', 'info'],
};

/** Lencana kesimpulan BKD. `perkiraan` = belum dinilai asesor, hasil hitung sementara. */
export function KesimpulanBkd({ nilai, perkiraan, className }: { nilai: KesimpulanBkdNilai | string | null | undefined; perkiraan?: boolean; className?: string }) {
  const [label, varian] = KESIMPULAN[(nilai ?? 'belum') as KesimpulanBkdNilai] ?? KESIMPULAN.belum;
  return (
    <Badge variant={perkiraan && nilai !== 'belum' ? 'outline' : varian} dot className={cn('u-bkd-kesimpulan', className)} data-nilai={nilai ?? 'belum'}>
      {perkiraan && nilai !== 'belum' ? `Perkiraan: ${label.toLowerCase()}` : label}
    </Badge>
  );
}

const DASAR: Record<string, string> = { rencana: 'SKS rencana', realisasi: 'SKS realisasi', diakui: 'SKS diakui asesor' };

/**
 * Ringkasan beban BKD: total terhadap batas minimal dan maksimal (penanda di batang), lalu beban per bidang dengan porsi
 * dan target minimal bidang bila diatur. `dasar` menjelaskan angka yang dipakai (rencana, realisasi, diakui).
 */
export function RingkasanBebanBkd({
  bidang,
  total,
  minimal,
  maksimal,
  dasar = 'rencana',
  kesimpulan,
  perkiraan,
  judul = 'Beban kerja semester ini',
  aksi,
  className,
}: {
  bidang: BidangBkd[];
  total: number;
  minimal?: number | null;
  maksimal?: number | null;
  dasar?: 'rencana' | 'realisasi' | 'diakui' | string;
  kesimpulan?: KesimpulanBkdNilai | string | null;
  /** Kesimpulan masih perkiraan (belum dinilai). */
  perkiraan?: boolean;
  judul?: React.ReactNode;
  aksi?: React.ReactNode;
  className?: string;
}) {
  const skala = Math.max(total, maksimal ?? 0, minimal ?? 0, 1) * 1.15;
  const pos = (n: number) => `${Math.min(100, (n / skala) * 100)}%`;
  const nada = minimal != null && total < minimal ? 'kurang' : maksimal != null && total > maksimal ? 'lebih' : 'cukup';
  const kurang = minimal != null ? Math.max(0, minimal - total) : 0;
  return (
    <section className={cn('u-bkd-ringkasan', className)} aria-label={typeof judul === 'string' ? judul : 'Ringkasan BKD'}>
      <header className="u-bkd-ringkasan-kepala">
        <div>
          <p className="u-bkd-label">{judul}</p>
          <p className="u-bkd-total">
            <strong>{angka(total)}</strong> <span>SKS</span>
          </p>
          <p className="u-bkd-keterangan">
            {DASAR[dasar] ?? dasar}
            {minimal != null ? ` · minimal ${angka(minimal)}` : ''}
            {maksimal != null ? ` · maksimal ${angka(maksimal)}` : ''}
          </p>
        </div>
        <div className="u-bkd-ringkasan-aksi">
          {kesimpulan !== undefined && <KesimpulanBkd nilai={kesimpulan} perkiraan={perkiraan} />}
          {aksi}
        </div>
      </header>
      <div className="u-bkd-batang" data-nada={nada} role="meter" aria-valuemin={0} aria-valuemax={skala} aria-valuenow={total} aria-label="Total SKS">
        <span className="u-bkd-batang-isi" style={{ width: pos(total) }} />
        {minimal != null && (
          <span className="u-bkd-penanda" style={{ left: pos(minimal) }} data-jenis="min">
            <span>min {angka(minimal)}</span>
          </span>
        )}
        {maksimal != null && (
          <span className="u-bkd-penanda" style={{ left: pos(maksimal) }} data-jenis="maks">
            <span>maks {angka(maksimal)}</span>
          </span>
        )}
      </div>
      <p className="u-bkd-status" data-nada={nada}>
        {nada === 'kurang' ? `Kurang ${sksBkd(kurang)} dari batas minimal.` : nada === 'lebih' ? `Melebihi batas maksimal ${sksBkd(maksimal)}.` : 'Dalam rentang beban yang dipersyaratkan.'}
      </p>
      <ul className="u-bkd-bidang">
        {bidang.map((b, i) => {
          const porsi = total > 0 ? (b.nilai / total) * 100 : 0;
          const kurangBidang = b.min != null && b.nilai < b.min;
          return (
            <li key={b.kode} style={{ ['--c' as string]: `var(--u-chart-${(i % 7) + 1})` }} data-kurang={kurangBidang ? '' : undefined}>
              <span className="u-bkd-bidang-ikon">
                <IkonBidangBkd kode={b.kode} />
              </span>
              <span className="u-bkd-bidang-nama">
                {b.nama}
                {b.jumlah !== undefined && <small>{b.jumlah} kegiatan</small>}
              </span>
              <span className="u-bkd-bidang-batang" aria-hidden>
                <span style={{ width: `${Math.min(100, porsi)}%` }} />
              </span>
              <span className="u-bkd-bidang-nilai">
                {sksBkd(b.nilai)}
                {(b.min != null || b.maks != null) && (
                  <small>
                    {b.min != null ? `min ${angka(b.min)}` : ''}
                    {b.min != null && b.maks != null ? ' · ' : ''}
                    {b.maks != null ? `maks ${angka(b.maks)}` : ''}
                  </small>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Syarat aturan BKD dan pemenuhannya (dari `hasil.syarat`). */
export function SyaratBkd({ syarat, judul = 'Syarat aturan BKD', kosong = 'Aturan BKD periode ini tidak memuat syarat tambahan.', className }: { syarat: SyaratBkdItem[]; judul?: React.ReactNode; kosong?: React.ReactNode; className?: string }) {
  return (
    <section className={cn('u-bkd-syarat', className)} aria-label={typeof judul === 'string' ? judul : 'Syarat BKD'}>
      {judul !== null && <p className="u-bkd-label">{judul}</p>}
      {syarat.length === 0 ? (
        <p className="u-bkd-keterangan">{kosong}</p>
      ) : (
        <ul>
          {syarat.map((s) => {
            const status = s.terpenuhi ? 'ok' : s.mode === 'wajib' ? 'gagal' : 'peringatan';
            return (
              <li key={s.kode} data-status={status}>
                <span className="u-bkd-syarat-ikon">{status === 'ok' ? <CircleCheck aria-hidden /> : status === 'gagal' ? <CircleX aria-hidden /> : <TriangleAlert aria-hidden />}</span>
                <span className="u-bkd-syarat-isi">
                  <span>{s.judul}</span>
                  <small>
                    Sekarang {s.satuan ? `${angka(s.nilai)} ${s.satuan}` : sksBkd(s.nilai)}
                    {s.mode === 'peringatan' ? ' · peringatan, tidak menentukan kesimpulan' : ''}
                    {s.keterangan ? ` · ${s.keterangan}` : ''}
                  </small>
                  {s.sumber ? <small className="u-bkd-sumber">Sumber: {s.sumber}</small> : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export interface NilaiAsesorBkd {
  asesor_ke: number;
  hasil: 'M' | 'TM';
  sks_diakui?: number | null;
  catatan?: string | null;
}

export interface KegiatanBkd {
  id: number;
  unsur: string;
  kategori?: string | null;
  kegiatan: string;
  uraian?: string | null;
  sumber?: string | null;
  sks_rencana?: number | null;
  sks_realisasi?: number | null;
  sks_klaim?: number | null;
  volume?: number | null;
  rumus?: string | null;
  bukti?: string | null;
  sister_url?: string | null;
  file?: { uuid: string; nama: string }[];
  penilaian?: string | null;
  catatan_penilai?: string | null;
  nilai_asesor?: NilaiAsesorBkd[];
}

const SUMBER: Record<string, string> = { siakad_jadwal: 'Jadwal SIAKAD', siakad_ta: 'Tugas akhir SIAKAD', lppm: 'LPPM', jabatan: 'Riwayat jabatan', organisasi: 'Organisasi', manual: 'Diisi dosen' };

/**
 * Kegiatan BKD dikelompokkan per bidang. Setiap baris: kegiatan, kategori, sumber data, SKS (rencana/realisasi), bukti,
 * dan penilaian asesor. `aksi(item)` mengisi tombol di kanan baris; `bukti(item)` boleh mengganti ringkasan bukti.
 */
export function DaftarKegiatanBkd({
  bidang,
  kegiatan,
  kategori,
  dasar = 'rencana',
  aksi,
  sisipan,
  kosong,
  className,
}: {
  bidang: { kode: string; nama: string }[];
  kegiatan: KegiatanBkd[];
  /** kode kategori -> nama (dari aturan BKD). */
  kategori?: Record<string, string>;
  dasar?: 'rencana' | 'realisasi' | 'diakui' | string;
  aksi?: (k: KegiatanBkd) => React.ReactNode;
  /** Isi tambahan di bawah baris (mis. kontrol penilaian asesor). */
  sisipan?: (k: KegiatanBkd) => React.ReactNode;
  kosong?: (b: { kode: string; nama: string }) => React.ReactNode;
  className?: string;
}) {
  const kelompok = bidang.map((b) => ({ ...b, isi: kegiatan.filter((k) => k.unsur === b.kode) }));
  const lain = kegiatan.filter((k) => !bidang.some((b) => b.kode === k.unsur));
  if (lain.length) kelompok.push({ kode: '_lain', nama: 'Lainnya', isi: lain });
  return (
    <div className={cn('u-bkd-kegiatan', className)}>
      {kelompok.map((b, i) => {
        const jumlah = b.isi.reduce((s, k) => s + Number((dasar === 'rencana' ? k.sks_rencana : k.sks_realisasi ?? k.sks_rencana) ?? 0), 0);
        return (
          <section key={b.kode} className="u-bkd-kelompok" style={{ ['--c' as string]: `var(--u-chart-${(i % 7) + 1})` }} aria-label={b.nama}>
            <header>
              <span className="u-bkd-bidang-ikon">
                <IkonBidangBkd kode={b.kode} />
              </span>
              <h4>{b.nama}</h4>
              <span className="u-bkd-kelompok-jumlah">
                {b.isi.length} kegiatan · {sksBkd(jumlah)}
              </span>
            </header>
            {b.isi.length === 0 ? (
              <div className="u-bkd-kelompok-kosong">{kosong ? kosong(b) : 'Belum ada kegiatan.'}</div>
            ) : (
              <ul>
                {b.isi.map((k) => {
                  const berkas = k.file?.length ?? 0;
                  const ditolak = k.penilaian === 'ditolak';
                  return (
                    <li key={k.id} data-penilaian={k.penilaian ?? 'belum'}>
                      <div className="u-bkd-baris">
                        <div className="u-bkd-baris-utama">
                          <p className="u-bkd-baris-judul">{k.kegiatan}</p>
                          <p className="u-bkd-baris-meta">
                            {k.kategori && kategori?.[k.kategori] ? <span>{kategori[k.kategori]}</span> : null}
                            {k.sumber && k.sumber !== 'manual' ? <Badge variant="outline">{SUMBER[k.sumber] ?? k.sumber}</Badge> : null}
                            {k.uraian ? <span className="u-bkd-uraian">{k.uraian}</span> : null}
                          </p>
                          {k.rumus ? <p className="u-bkd-rumus">{k.rumus}</p> : null}
                          <p className="u-bkd-bukti">
                            {berkas > 0 ? (
                              <span>
                                <Paperclip aria-hidden /> {berkas} berkas
                              </span>
                            ) : null}
                            {k.bukti ? (
                              <span>
                                <FileText aria-hidden /> {k.bukti}
                              </span>
                            ) : null}
                            {k.sister_url ? (
                              <a href={k.sister_url} target="_blank" rel="noreferrer">
                                <Link2 aria-hidden /> SISTER
                              </a>
                            ) : null}
                          </p>
                          {k.nilai_asesor?.length ? (
                            <p className="u-bkd-asesor">
                              {k.nilai_asesor.map((n) => (
                                <span key={n.asesor_ke} data-hasil={n.hasil} title={n.catatan ?? undefined}>
                                  A{n.asesor_ke}: {n.hasil}
                                  {n.sks_diakui != null ? ` (${angka(n.sks_diakui)})` : ''}
                                  {n.catatan ? ` · ${n.catatan}` : ''}
                                </span>
                              ))}
                            </p>
                          ) : null}
                        </div>
                        <div className="u-bkd-baris-sks">
                          <strong className={ditolak ? 'u-bkd-coret' : undefined}>{sksBkd(dasar === 'rencana' ? k.sks_rencana : k.sks_realisasi ?? k.sks_rencana)}</strong>
                          {dasar !== 'rencana' && k.sks_rencana != null && Number(k.sks_rencana) !== Number(k.sks_realisasi ?? k.sks_rencana) ? <small>rencana {angka(k.sks_rencana)}</small> : null}
                          {k.penilaian === 'diterima' ? <Badge variant="success">M</Badge> : ditolak ? <Badge variant="danger">TM</Badge> : null}
                        </div>
                        {aksi ? <div className="u-bkd-baris-aksi">{aksi(k)}</div> : null}
                      </div>
                      {sisipan ? sisipan(k) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

export interface TahapBkdItem {
  kode: string;
  judul: string;
  tenggat?: string | null;
}

const TAHAP_BAWAAN: TahapBkdItem[] = [
  { kode: 'rencana', judul: 'Rencana' },
  { kode: 'pelaksanaan', judul: 'Kinerja & bukti' },
  { kode: 'penilaian', judul: 'Asesor' },
  { kode: 'mengetahui', judul: 'Kaprodi/Dekan' },
  { kode: 'ditetapkan', judul: 'Ditetapkan' },
];

/**
 * Lini tahap laporan BKD (kode tahap dari API: rencana, pelaksanaan, perbaikan, penilaian, mengetahui, ditetapkan).
 * `tenggat` per kode tahap ditampilkan di bawah judul.
 */
export function TahapBkd({ aktif, tenggat, className }: { aktif: string; tenggat?: Partial<Record<string, string | null>>; className?: string }) {
  const kode = aktif === 'perbaikan' ? 'pelaksanaan' : aktif;
  const idx = TAHAP_BAWAAN.findIndex((t) => t.kode === kode);
  const tgl = (s?: string | null) => (s ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(`${s}T00:00:00`)) : null);
  return (
    <ol className={cn('u-bkd-tahap', className)} aria-label="Tahap BKD">
      {TAHAP_BAWAAN.map((t, i) => {
        const status = idx < 0 ? 'menunggu' : i < idx || kode === 'ditetapkan' ? 'selesai' : i === idx ? (aktif === 'perbaikan' ? 'perbaikan' : 'aktif') : 'menunggu';
        return (
          <li key={t.kode} data-status={status} aria-current={i === idx ? 'step' : undefined}>
            <span className="u-bkd-tahap-titik">{status === 'selesai' ? <CircleCheck aria-hidden /> : i + 1}</span>
            <span className="u-bkd-tahap-judul">
              {aktif === 'perbaikan' && i === idx ? 'Perbaikan' : t.judul}
              {tenggat?.[t.kode] ? <small>s.d. {tgl(tenggat[t.kode])}</small> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
