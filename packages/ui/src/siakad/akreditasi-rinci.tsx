'use client';
import * as React from 'react';
import { AlertTriangle, Archive, Award, CalendarClock, ClipboardCheck, Database, Eye, FileImage, FileText, Inbox, Link2, Wrench } from 'lucide-react';
import { Alert, DescriptionList, Empty, Progress } from '../components/display';
import { Badge, Button } from '../components/actions';
import { useToast } from '../components/overlays';
import { Linimasa } from '../components/linimasa';
import { cn } from '../lib/cn';
import { formatBytes, formatDate, formatNumber } from '../lib/format';
import type { SKRegistri } from './isian-sk';
import { RincianSK } from './registri-sk';
import { pesanGalat, useSiakad } from './provider';

/*
 * Rincian akreditasi institusi/prodi (SIAKAD GET /v1/spmi/akreditasi/unit/{unit}, docs/AKREDITASI.md), dipakai SPMI »
 * Akreditasi (kelola) dan Fakultas » Akreditasi (baca):
 *   KartuAkreditasi        kepala ringkas (peringkat besar berwarna, lembaga, keadaan, sisa masa), tanda data impor
 *                          yang perlu dicek + aksi perbaiki, rincian, SK di Registri SK, sertifikat & SK di arsip
 *   GarisWaktuAkreditasi   riwayat akreditasi sebagai garis waktu
 *   IntegrasiAkreditasi    kelengkapan dokumen, usulan prodi yang menunggu, rencana reakreditasi & pengingat, lampiran data
 */

export type KeadaanRiwayatAkreditasi = 'berlaku' | 'segera_habis' | 'habis' | 'proses' | 'tidak_terakreditasi';

export interface AnomaliAkreditasi {
  kode: string;
  pesan: string;
  /** Isian wizard yang memperbaikinya (sk_id, berlaku_sampai, peringkat, ...). */
  isian: string | null;
  tingkat: 'galat' | 'peringatan' | 'info';
}

export interface BerkasAkreditasi {
  id: string;
  nama: string;
  mime: string | null;
  ukuran: number;
  keterangan: string | null;
  diunggah_oleh: string | null;
  diunggah_pada: string | null;
  arsip?: { ruang: string; nama: string; folder: string | null; berkas: string; path: string } | null;
}

export interface RiwayatAkreditasi {
  id: number;
  lingkup: 'prodi' | 'institusi';
  lembaga: string;
  lembaga_nama: string;
  lembaga_singkatan: string | null;
  peringkat: string | null;
  status: string;
  status_label: string;
  nomor_sk: string | null;
  tanggal_sk: string | null;
  berlaku_mulai: string | null;
  berlaku_sampai: string | null;
  sisa_hari: number | null;
  keadaan: KeadaanRiwayatAkreditasi;
  keadaan_label: string;
  target_reakreditasi: string | null;
  sumber: string;
  terkini: boolean;
  instrumen?: string | null;
  nilai?: string | null;
  catatan?: string | null;
  ditulis_siakad_pada?: string | null;
  diubah_oleh?: string | null;
  sk?: SKRegistri | null;
  sertifikat?: BerkasAkreditasi[];
  anomali?: AnomaliAkreditasi[];
}

export interface IntegrasiAkreditasiData {
  kode_prodi: string | null;
  kelengkapan: { persiapan_id: number; jenis: string; status: string; target_pengajuan: string | null; hitung: { jumlah: number; wajib: number; lengkap: number; menunggu_periksa: number; perbaikan: number; terlambat: number; persen: number } } | null;
  usulan: Array<{ id: number; lembaga: string; peringkat: string | null; nomor_sk: string | null; berlaku_sampai: string | null; diajukan_oleh: string | null; diajukan_at: string | null }>;
  lampiran: string | null;
}

const NADA: Record<KeadaanRiwayatAkreditasi, React.ComponentProps<typeof Badge>['variant']> = { berlaku: 'success', segera_habis: 'warning', habis: 'danger', proses: 'info', tidak_terakreditasi: 'danger' };
const tgl = (t?: string | null) => (t ? formatDate(t, 'medium') : '–');

/** Teks sisa masa berlaku: "4 tahun 2 bulan lagi" / "lewat 1 tahun 3 bulan". */
export function teksSisaMasa(hari: number | null | undefined): string | null {
  if (hari == null) return null;
  const n = Math.abs(hari);
  const th = Math.floor(n / 365);
  const bl = Math.floor((n % 365) / 30);
  const teks = th > 0 ? `${th} tahun${bl ? ` ${bl} bulan` : ''}` : bl > 0 ? `${bl} bulan` : `${n} hari`;
  return hari >= 0 ? `${teks} lagi` : `lewat ${teks}`;
}

/** Buka isi berkas dari endpoint API (blob) di tab baru. */
function useBuka() {
  const s = useSiakad();
  const toast = useToast();
  return async (path: string) => {
    try {
      const r = await s.request<unknown>({ method: 'GET', path });
      const v = r.data as { blob?: () => Blob } | Blob | null;
      const blob = v instanceof Blob ? v : v && typeof v === 'object' && typeof v.blob === 'function' ? v.blob() : null;
      if (!blob) throw new Error('Berkas tidak dapat dibuka.');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      toast.add({ title: 'Gagal membuka berkas', description: pesanGalat(e), type: 'error' });
    }
  };
}

/** Pratinjau kecil: gambar dimuat sebagai thumbnail, PDF/dokumen sebagai ikon jenis. */
function Pratinjau({ f, path }: { f: BerkasAkreditasi; path: string }) {
  const s = useSiakad();
  const [src, setSrc] = React.useState<string | null>(null);
  const gambar = (f.mime ?? '').startsWith('image/');
  React.useEffect(() => {
    if (!gambar) return;
    let url: string | null = null;
    let batal = false;
    s.request<unknown>({ method: 'GET', path })
      .then((r) => {
        const v = r.data as { blob?: () => Blob } | Blob | null;
        const b = v instanceof Blob ? v : v && typeof v === 'object' && typeof v.blob === 'function' ? v.blob() : null;
        if (b && !batal) setSrc((url = URL.createObjectURL(b)));
      })
      .catch(() => undefined);
    return () => {
      batal = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [gambar, path, s]);
  return (
    <span className="u-akr-thumb" data-jenis={gambar ? 'gambar' : (f.mime ?? '').includes('pdf') ? 'pdf' : 'dokumen'} aria-hidden>
      {src ? <img src={src} alt="" /> : gambar ? <FileImage /> : <FileText />}
      {!src && <small>{(f.nama.split('.').pop() ?? '').toUpperCase()}</small>}
    </span>
  );
}

export interface KartuAkreditasiProps {
  a: RiwayatAkreditasi;
  /** Tombol aksi di kepala kartu (Ubah, Perbarui dari SK baru, Hapus). */
  aksi?: React.ReactNode;
  /** Aksi cepat memperbaiki data (membuka wizard di langkah isian itu). Tanpa ini tanda data tetap tampil tanpa tombol. */
  onPerbaiki?: (isian: string | null) => void;
  /** Bagian unggah/kelola berkas tambahan dari aplikasi (mis. tombol Unggah sertifikat SPMI). */
  kelolaBerkas?: React.ReactNode;
  /** Path API isi berkas sertifikat (bawaan /v1/spmi/file/{id}/unduh?inline=1). */
  pathBerkas?: (f: BerkasAkreditasi) => string;
  className?: string;
}

/** Kartu satu akreditasi: kepala ringkas, tanda data impor, rincian, SK registri, sertifikat & SK di arsip institusi. */
export function KartuAkreditasi({ a, aksi, onPerbaiki, kelolaBerkas, pathBerkas = (f) => `/v1/spmi/file/${f.id}/unduh?inline=1`, className }: KartuAkreditasiProps) {
  const [skBuka, setSkBuka] = React.useState<string | null>(null);
  const buka = useBuka();
  const anomali = a.anomali ?? [];
  const perlu = anomali.filter((x) => x.tingkat !== 'info');
  const info = anomali.filter((x) => x.tingkat === 'info');
  const tidak = a.status === 'tidak_terakreditasi';
  const sisa = teksSisaMasa(a.sisa_hari);
  // Versi: urut terbaru dulu; berkas SK dari registri ikut tampil bila ada.
  const berkas = (a.sertifikat ?? []).toSorted((x, y) => String(y.diunggah_pada ?? '').localeCompare(String(x.diunggah_pada ?? '')));
  return (
    <article className={cn('u-akr', className)} data-terkini={a.terkini ? '' : undefined} data-keadaan={a.keadaan}>
      <header className="u-akr-kepala">
        <div className="u-akr-peringkat" data-keadaan={tidak ? 'tidak_terakreditasi' : a.keadaan} aria-label={`Peringkat ${a.peringkat ?? a.status_label}`}>
          <span>{a.peringkat ?? (tidak ? '–' : '?')}</span>
        </div>
        <div className="u-akr-judul">
          <p className="u-akr-lembaga">
            <Award aria-hidden /> {a.lembaga_singkatan ?? a.lembaga_nama}
            <small>{a.lembaga_singkatan ? a.lembaga_nama : null}</small>
          </p>
          <div className="u-akr-lencana">
            {a.terkini ? <Badge variant={NADA[a.keadaan] ?? 'neutral'}>{a.keadaan_label}</Badge> : <Badge variant="neutral">Riwayat</Badge>}
            <Badge variant="outline">{a.status_label}</Badge>
            {a.sumber === 'siakad' && <Badge variant="outline">Diimpor dari SIAKAD lama</Badge>}
          </div>
          {!tidak && (
            <p className="u-akr-masa">
              <CalendarClock aria-hidden /> {tgl(a.berlaku_mulai ?? a.tanggal_sk)} s.d. {tgl(a.berlaku_sampai)}
              {a.terkini && sisa ? <strong data-lewat={a.sisa_hari != null && a.sisa_hari < 0 ? '' : undefined}> · {sisa}</strong> : null}
            </p>
          )}
        </div>
        {aksi ? <div className="u-akr-aksi">{aksi}</div> : null}
      </header>

      {perlu.length > 0 && (
        <Alert variant="warning" title="Data impor perlu dicek" icon={<AlertTriangle />}>
          <ul className="u-akr-anomali">
            {perlu.map((x) => (
              <li key={x.kode}>
                <span>{x.pesan}</span>
                {onPerbaiki && (
                  <Button size="sm" variant="outline" onClick={() => onPerbaiki(x.isian)}>
                    <Wrench /> Perbaiki
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Alert>
      )}
      {info.length > 0 && (
        <ul className="u-akr-catatan">
          {info.map((x) => (
            <li key={x.kode}>{x.pesan}</li>
          ))}
        </ul>
      )}

      <DescriptionList
        className="u-akr-rinci"
        items={[
          { label: 'Lembaga', value: a.lembaga_nama },
          {
            label: 'SK akreditasi',
            value: a.sk ? (
              <span className="u-akr-sk">
                <span>
                  <strong>{a.sk.nomor}</strong>
                  {a.sk.tanggal ? ` · ${tgl(a.sk.tanggal)}` : ''}
                  {a.sk.penerbit?.nama ? ` · ${a.sk.penerbit.nama}` : ''}
                </span>
                <Button size="sm" variant="ghost" onClick={() => setSkBuka(a.sk!.id)}>
                  <Link2 /> Lihat di Registri SK
                </Button>
              </span>
            ) : a.nomor_sk ? (
              <span>
                {a.nomor_sk} <small className="u-akr-redup">(belum tertaut ke Registri SK)</small>
              </span>
            ) : (
              <span className="u-akr-redup">Belum diisi</span>
            ),
          },
          { label: 'Tanggal SK', value: tgl(a.sk?.tanggal ?? a.tanggal_sk) },
          ...(a.instrumen || a.nilai ? [{ label: 'Instrumen / nilai', value: [a.instrumen, a.nilai].filter(Boolean).join(' · ') }] : []),
          ...(a.terkini && a.target_reakreditasi ? [{ label: 'Target reakreditasi', value: tgl(a.target_reakreditasi) }] : []),
          ...(a.terkini
            ? [{ label: 'Data SIAKAD lama', value: a.ditulis_siakad_pada ? `Diselaraskan ${formatDate(a.ditulis_siakad_pada, 'medium')}` : a.sumber === 'siakad' ? 'Sumber data (diimpor dari SIAKAD lama)' : 'Belum diselaraskan' }]
            : []),
          ...(a.catatan ? [{ label: 'Catatan', value: a.catatan }] : []),
        ]}
      />

      <section className="u-akr-berkas" aria-label="Sertifikat dan SK">
        <div className="u-akr-berkas-kepala">
          <strong>Sertifikat dan SK</strong>
          {kelolaBerkas}
        </div>
        {a.sk?.berkas?.ada && (
          <div className="u-akr-berkas-baris">
            <Pratinjau f={{ id: a.sk.id, nama: a.sk.berkas.nama ?? 'SK.pdf', mime: a.sk.berkas.mime ?? null, ukuran: a.sk.berkas.ukuran ?? 0, keterangan: null, diunggah_oleh: null, diunggah_pada: null }} path={`/v1/sk/${a.sk.id}/berkas`} />
            <div>
              <span className="u-akr-berkas-nama">{a.sk.berkas.nama ?? 'Berkas SK'}</span>
              <small>
                SK di Registri SK{a.sk.berkas.ukuran ? ` · ${formatBytes(a.sk.berkas.ukuran)}` : ''}
                {a.sk.berkas.arsip ? (
                  <>
                    {' · '}
                    <Archive aria-hidden /> {a.sk.berkas.arsip.path}
                  </>
                ) : null}
              </small>
            </div>
            <Button size="sm" variant="ghost" iconOnly aria-label="Lihat berkas SK" onClick={() => void buka(`/v1/sk/${a.sk!.id}/berkas`)}>
              <Eye />
            </Button>
          </div>
        )}
        {berkas.map((f, i) => (
          <div key={f.id} className="u-akr-berkas-baris">
            <Pratinjau f={f} path={pathBerkas(f)} />
            <div>
              <span className="u-akr-berkas-nama">
                {f.arsip?.berkas ?? f.nama} {berkas.length > 1 && <Badge variant={i === 0 ? 'info' : 'neutral'}>{i === 0 ? 'Terbaru' : `Versi ${berkas.length - i}`}</Badge>}
              </span>
              <small>
                {[f.keterangan, formatBytes(f.ukuran), f.diunggah_oleh ? `diunggah ${f.diunggah_oleh}` : null, f.diunggah_pada ? formatDate(f.diunggah_pada, 'medium') : null].filter(Boolean).join(' · ')}
                {f.arsip ? (
                  <>
                    {' · '}
                    <Archive aria-hidden /> {f.arsip.path}
                  </>
                ) : null}
              </small>
            </div>
            <Button size="sm" variant="ghost" iconOnly aria-label={`Lihat ${f.nama}`} onClick={() => void buka(pathBerkas(f))}>
              <Eye />
            </Button>
          </div>
        ))}
        {!berkas.length && !a.sk?.berkas?.ada && (
          <Empty bordered title="Belum ada sertifikat" description="Sertifikat dan SK disimpan di Arsip universitas (Akreditasi / unit / tahun), bukan di Berkas pribadi pengunggah." />
        )}
      </section>
      {skBuka && <RincianSK id={skBuka} open onOpenChange={(o) => !o && setSkBuka(null)} onBuka={setSkBuka} />}
    </article>
  );
}

/** Riwayat akreditasi unit sebagai garis waktu (terbaru di atas). */
export function GarisWaktuAkreditasi({ riwayat, className }: { riwayat: RiwayatAkreditasi[]; className?: string }) {
  const urut = riwayat.toSorted((x, y) => String(y.berlaku_mulai ?? y.tanggal_sk ?? '').localeCompare(String(x.berlaku_mulai ?? x.tanggal_sk ?? '')));
  return (
    <Linimasa
      className={className}
      aria-label="Riwayat akreditasi"
      kosong={<p className="u-akr-redup">Belum ada riwayat.</p>}
      items={urut.map((r) => ({
        id: r.id,
        status: r.terkini ? 'aktif' : 'lalu',
        tanggal: `${tgl(r.berlaku_mulai ?? r.tanggal_sk)} – ${tgl(r.berlaku_sampai)}`,
        judul: `${r.lembaga_singkatan ?? r.lembaga_nama} · ${r.peringkat ?? r.status_label}`,
        keterangan: [r.sk?.nomor ?? r.nomor_sk ?? 'SK belum diisi', r.sumber === 'siakad' ? 'impor SIAKAD lama' : null].filter(Boolean).join(' · '),
        lencana: r.terkini ? <Badge variant={NADA[r.keadaan] ?? "neutral"}>{r.keadaan_label}</Badge> : undefined,
      }))}
    />
  );
}

export interface IntegrasiAkreditasiProps {
  integrasi: IntegrasiAkreditasiData | null | undefined;
  terkini: RiwayatAkreditasi | null | undefined;
  /** Tautan aplikasi: ruang kerja kelengkapan, usulan (id), lampiran data. Tanpa tautan, kartu tetap tampil sebagai ringkasan. */
  tautan?: { kelengkapan?: string; usulan?: (id: number) => string; lampiran?: string; persiapan?: string };
  className?: string;
}

/** Ringkasan fitur terkait akreditasi: kelengkapan dokumen, usulan prodi yang menunggu, rencana & pengingat, lampiran data. */
export function IntegrasiAkreditasi({ integrasi, terkini, tautan, className }: IntegrasiAkreditasiProps) {
  const k = integrasi?.kelengkapan;
  const usulan = integrasi?.usulan ?? [];
  const sisa = terkini?.sisa_hari;
  const Tautan = ({ href, children }: { href?: string; children: React.ReactNode }) =>
    href ? (
      <Button size="sm" variant="ghost" render={<a href={href} />}>
        {children}
      </Button>
    ) : null;
  return (
    <div className={cn('u-akr-integrasi', className)}>
      <div className="u-akr-int">
        <p className="u-akr-int-judul">
          <ClipboardCheck aria-hidden /> Kelengkapan dokumen
        </p>
        {k ? (
          <>
            <Progress value={k.hitung.persen} label={`${formatNumber(k.hitung.lengkap)} dari ${formatNumber(k.hitung.wajib)} dokumen wajib lengkap`} tone={k.hitung.persen >= 80 ? 'success' : k.hitung.persen >= 40 ? 'warning' : 'danger'} size="sm" />
            <small>
              {k.jenis === 'baru' ? 'Akreditasi baru' : 'Reakreditasi'} · {k.status.replace(/_/g, ' ')}
              {k.hitung.menunggu_periksa ? ` · ${k.hitung.menunggu_periksa} menunggu periksa` : ''}
              {k.hitung.terlambat ? ` · ${k.hitung.terlambat} terlambat` : ''}
            </small>
          </>
        ) : (
          <small>Belum ada ruang kerja persiapan. Mulai dari tab Kelengkapan.</small>
        )}
        <Tautan href={tautan?.kelengkapan}>Buka ruang kerja</Tautan>
      </div>
      <div className="u-akr-int">
        <p className="u-akr-int-judul">
          <Inbox aria-hidden /> Usulan dari prodi
        </p>
        {usulan.length ? (
          <ul className="u-akr-int-daftar">
            {usulan.map((u) => (
              <li key={u.id}>
                {tautan?.usulan ? <a href={tautan.usulan(u.id)}>Usulan #{u.id}</a> : <span>Usulan #{u.id}</span>} · {u.peringkat ?? '–'}
                {u.nomor_sk ? ` · SK ${u.nomor_sk}` : ''} <small>oleh {u.diajukan_oleh ?? '–'}, {tgl(u.diajukan_at)}</small>
              </li>
            ))}
          </ul>
        ) : (
          <small>Tidak ada usulan status yang menunggu validasi.</small>
        )}
      </div>
      <div className="u-akr-int">
        <p className="u-akr-int-judul">
          <CalendarClock aria-hidden /> Rencana & pengingat
        </p>
        {terkini ? (
          <small>
            {sisa == null ? 'Masa berlaku belum diisi.' : sisa >= 0 ? `Berakhir ${tgl(terkini.berlaku_sampai)} (${teksSisaMasa(sisa)}).` : `Masa berlaku berakhir ${tgl(terkini.berlaku_sampai)}, ${teksSisaMasa(sisa)}.`}{' '}
            {k?.target_pengajuan || terkini.target_reakreditasi ? `Target pengajuan ${tgl(k?.target_pengajuan ?? terkini.target_reakreditasi)}.` : 'Target reakreditasi belum ditetapkan.'} Pengingat otomatis 12, 6, dan 3 bulan sebelum berakhir.
          </small>
        ) : (
          <small>Belum ada akreditasi tercatat.</small>
        )}
        <Tautan href={tautan?.persiapan}>Persiapan & simulasi</Tautan>
      </div>
      {integrasi?.kode_prodi && (
        <div className="u-akr-int">
          <p className="u-akr-int-judul">
            <Database aria-hidden /> Data otomatis prodi
          </p>
          <small>Dosen, mahasiswa, lulusan, penelitian, kerja sama, tracer, dan tabel LKPS dihitung dari SIAKAD.</small>
          <Tautan href={tautan?.lampiran}>Lihat lampiran data</Tautan>
        </div>
      )}
    </div>
  );
}
