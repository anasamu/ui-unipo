'use client';
import * as React from 'react';
import { CheckCircle2, CircleAlert, Clock, Download, FileText, FileUp, Trash2, Upload } from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatBytes, formatDate } from '../../lib/format';
import { Badge, Button, type BadgeVariant } from '../../components/actions';
import { Alert, Empty, Progress } from '../../components/display';
import { Dropzone } from '../../components/calendar';
import { ProgressTakTentu } from '../../components/progres';
import { useKonfirmasi } from '../../components/aksi';
import { pesanGalat } from '../provider';
import { teksBatasUnggah, useInfoBerkas } from '../berkas';
import { KepalaAkademik, keadaanData, type KeadaanDataProps } from './bersama';

/** Status pemenuhan satu syarat berkas (mengikuti /v1/kelulusan/syarat-mahasiswa: diajukan, terpenuhi, ditolak). */
export type StatusSyaratBerkas = 'belum' | 'diajukan' | 'terpenuhi' | 'ditolak';

export interface LampiranBerkasAkademik {
  /** uuid lampiran/berkas dari server. */
  id: string;
  nama: string;
  ukuran?: number | null;
  /** Tautan unduh/pratinjau sementara (opsional). */
  url?: string | null;
  diunggah?: string | null;
}

/** Satu syarat dokumen akademik (syarat yudisium/wisuda, berkas cuti, berkas pindahan, …) dari server. */
export interface SyaratBerkasAkademik {
  /** Kunci unik (id syarat). */
  kunci: string;
  nama: string;
  keterangan?: string | null;
  wajib?: boolean;
  status?: StatusSyaratBerkas | null;
  /** Catatan pemeriksa (alasan ditolak, dsb.). */
  catatan?: string | null;
  lampiran?: LampiranBerkasAkademik[] | null;
  /** Ekstensi yang diterima untuk syarat ini (mis. ['pdf','jpg']); bawaan kebijakan berkas server. */
  ekstensi?: string[] | null;
  /** Batas ukuran per berkas (byte) untuk syarat ini; bawaan kebijakan berkas server. */
  maksByte?: number | null;
  /** Boleh lebih dari satu lampiran. */
  banyak?: boolean;
}

export interface UnggahBerkasAkademikProps extends KeadaanDataProps {
  syarat?: ReadonlyArray<SyaratBerkasAkademik> | null;
  /**
   * Unggah berkas untuk satu syarat ke endpoint modulnya (mis. POST /v1/kelulusan/syarat-mahasiswa/{id}/berkas), lalu
   * muat ulang `syarat`. Galat yang dilempar ditampilkan dengan pesan awam di baris itu.
   */
  onUnggah?: (syarat: SyaratBerkasAkademik, berkas: File[]) => Promise<unknown>;
  /** Hapus lampiran (hanya ditawarkan selama syarat belum terpenuhi). */
  onHapus?: (syarat: SyaratBerkasAkademik, lampiran: LampiranBerkasAkademik) => Promise<unknown>;
  /** Buka/unduh lampiran; bawaan membuka `url` bila ada. */
  onLihat?: (syarat: SyaratBerkasAkademik, lampiran: LampiranBerkasAkademik) => void;
  /** Hanya tampil (pemeriksa/admin melihat berkas mahasiswa). */
  hanyaBaca?: boolean;
  /** Unit untuk batas kebijakan berkas (GET /v1/berkas/info?unit=); kosong = kebijakan umum. */
  unit?: string;
  judul?: React.ReactNode | false;
  meta?: React.ReactNode;
  aksi?: React.ReactNode;
  className?: string;
}

const STATUS: Record<StatusSyaratBerkas, { label: string; variant: BadgeVariant; ikon: React.ReactNode }> = {
  belum: { label: 'Belum diunggah', variant: 'neutral', ikon: <FileUp /> },
  diajukan: { label: 'Menunggu pemeriksaan', variant: 'warning', ikon: <Clock /> },
  terpenuhi: { label: 'Diterima', variant: 'success', ikon: <CheckCircle2 /> },
  ditolak: { label: 'Perlu diperbaiki', variant: 'danger', ikon: <CircleAlert /> },
};

const statusDari = (s: SyaratBerkasAkademik): StatusSyaratBerkas => s.status ?? (s.lampiran?.length ? 'diajukan' : 'belum');
const terima = (ext?: string[] | null) => (ext?.length ? ext.map((e) => `.${e.replace(/^\./, '').toLowerCase()}`).join(',') : undefined);

/**
 * Daftar syarat berkas akademik dengan unggah per syarat: status (belum, menunggu, diterima, perlu diperbaiki),
 * catatan pemeriksa, lampiran (lihat/hapus), batas jenis dan ukuran dari kebijakan berkas server, dan kemajuan
 * syarat wajib. Berkas dikirim ke endpoint modul lewat `onUnggah`.
 */
export function UnggahBerkasAkademik({ syarat, onUnggah, onHapus, onLihat, hanyaBaca, unit, judul, meta, aksi, className, ...k }: UnggahBerkasAkademikProps) {
  const info = useInfoBerkas(unit);
  const { konfirmasi, elemen } = useKonfirmasi();
  const [proses, setProses] = React.useState<Record<string, 'unggah' | 'hapus' | undefined>>({});
  const [galat, setGalat] = React.useState<Record<string, string | undefined>>({});
  const [buka, setBuka] = React.useState<Record<string, boolean>>({});
  const keadaan = keadaanData(k, !!syarat, 260, className);
  if (keadaan) return keadaan;
  const daftar = syarat ?? [];
  if (!daftar.length) return <Empty icon={<FileText />} title="Tidak ada berkas yang perlu diunggah" className={className} />;
  const wajib = daftar.filter((s) => s.wajib !== false);
  const beres = wajib.filter((s) => statusDari(s) === 'terpenuhi').length;

  const jalankan = async (s: SyaratBerkasAkademik, jenis: 'unggah' | 'hapus', fn: () => Promise<unknown>) => {
    setProses((p) => ({ ...p, [s.kunci]: jenis }));
    setGalat((g) => ({ ...g, [s.kunci]: undefined }));
    try {
      await fn();
      if (jenis === 'unggah') setBuka((b) => ({ ...b, [s.kunci]: false }));
    } catch (e) {
      setGalat((g) => ({ ...g, [s.kunci]: pesanGalat(e) }));
    } finally {
      setProses((p) => ({ ...p, [s.kunci]: undefined }));
    }
  };

  return (
    <section className={cn('u-ak-blok u-ak-unggah', className)}>
      {judul !== false && (
        <KepalaAkademik judul={judul ?? 'Berkas akademik'} meta={meta ?? (wajib.length ? `${beres} dari ${wajib.length} berkas wajib diterima` : `${daftar.length} berkas`)} aksi={aksi} />
      )}
      {wajib.length > 0 && <Progress value={beres} max={wajib.length} size="sm" tone={beres === wajib.length ? 'success' : 'primary'} />}
      <ul className="u-ak-unggah-daftar">
        {daftar.map((s) => {
          const st = statusDari(s);
          const S = STATUS[st];
          const bolehUbah = !hanyaBaca && !!onUnggah && st !== 'terpenuhi';
          const lampiran = s.lampiran ?? [];
          const tampilZona = bolehUbah && (st === 'belum' || st === 'ditolak' || buka[s.kunci]);
          const sibuk = proses[s.kunci];
          const maks = s.maksByte ?? info.data?.batas_unggah?.maks_byte ?? info.data?.maks_byte ?? undefined;
          const ext = s.ekstensi ?? info.data?.ekstensi ?? null;
          const petunjuk = s.ekstensi || s.maksByte || !info.data ? [ext?.length ? ext.map((e) => e.toUpperCase()).join(', ') : '', maks ? `maks ${formatBytes(maks)}` : ''].filter(Boolean).join(' · ') : teksBatasUnggah(info.data);
          return (
            <li key={s.kunci} data-status={st}>
              <div className="u-ak-unggah-kepala">
                <span className="u-ak-unggah-ikon" aria-hidden>
                  {S.ikon}
                </span>
                <div className="u-ak-unggah-teks">
                  <b>
                    {s.nama}
                    {s.wajib === false && <small> (opsional)</small>}
                  </b>
                  {s.keterangan && <small>{s.keterangan}</small>}
                </div>
                <Badge variant={S.variant} className="u-ak-unggah-status">
                  {S.label}
                </Badge>
              </div>
              {s.catatan && (st === 'ditolak' || st === 'terpenuhi') && (
                <Alert variant={st === 'ditolak' ? 'danger' : 'success'} className="u-ak-unggah-catatan">
                  {s.catatan}
                </Alert>
              )}
              {lampiran.length > 0 && (
                <ul className="u-ak-unggah-lampiran">
                  {lampiran.map((l) => (
                    <li key={l.id}>
                      <FileText aria-hidden />
                      <span>
                        <b>{l.nama}</b>
                        <small>{[l.ukuran ? formatBytes(l.ukuran) : '', l.diunggah ? formatDate(l.diunggah, 'medium') : ''].filter(Boolean).join(' · ')}</small>
                      </span>
                      {(onLihat || l.url) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          iconOnly
                          aria-label={`Lihat ${l.nama}`}
                          onClick={() => (onLihat ? onLihat(s, l) : window.open(l.url!, '_blank', 'noopener'))}
                        >
                          <Download />
                        </Button>
                      )}
                      {bolehUbah && onHapus && (
                        <Button
                          size="sm"
                          variant="ghost"
                          iconOnly
                          aria-label={`Hapus ${l.nama}`}
                          disabled={!!sibuk}
                          onClick={async () => {
                            const ya = await konfirmasi({ judul: `Hapus ${l.nama}?`, keterangan: 'Berkas dihapus dari syarat ini. Anda bisa mengunggah berkas lain setelahnya.', label: 'Hapus berkas', nada: 'bahaya' });
                            if (ya) await jalankan(s, 'hapus', () => onHapus(s, l));
                          }}
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {sibuk && <ProgressTakTentu label={sibuk === 'unggah' ? 'Mengunggah…' : 'Menghapus…'} ukuran="sm" />}
              {galat[s.kunci] && (
                <Alert variant="danger" className="u-ak-unggah-catatan">
                  {galat[s.kunci]}
                </Alert>
              )}
              {tampilZona && !sibuk && (
                <Dropzone
                  className="u-ak-unggah-zona"
                  multiple={!!s.banyak}
                  accept={terima(ext)}
                  maxSize={maks}
                  title={st === 'ditolak' ? 'Unggah berkas perbaikan' : 'Tarik berkas ke sini atau pilih dari perangkat'}
                  hint={petunjuk || undefined}
                  onFiles={(f) => f.length && jalankan(s, 'unggah', () => onUnggah!(s, f))}
                  onReject={(m) => setGalat((g) => ({ ...g, [s.kunci]: m }))}
                />
              )}
              {bolehUbah && st === 'diajukan' && !buka[s.kunci] && !sibuk && (
                <div className="u-ak-unggah-aksi">
                  <Button size="sm" variant="outline" onClick={() => setBuka((b) => ({ ...b, [s.kunci]: true }))}>
                    <Upload /> {s.banyak ? 'Tambah berkas' : 'Ganti berkas'}
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {elemen}
    </section>
  );
}
