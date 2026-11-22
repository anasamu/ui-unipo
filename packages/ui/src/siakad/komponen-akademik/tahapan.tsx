'use client';
import * as React from 'react';
import { CalendarDays } from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';
import { Badge, type BadgeVariant } from '../../components/actions';
import { Empty } from '../../components/display';
import { JENIS_KEGIATAN, type KegiatanTerpadu } from '../kalender';
import { KepalaAkademik, keadaanData, type KeadaanDataProps } from './bersama';

/** Tahapan periode akademik: baris GET /v1/kalender/terpadu (sumber `tahun`/`kalender`) atau bentuk ringkas yang sama. */
export type TahapanKalender = Pick<KegiatanTerpadu, 'judul' | 'mulai' | 'selesai'> & Partial<Pick<KegiatanTerpadu, 'jenis' | 'warna' | 'keterangan' | 'id' | 'sumber'>>;

export type KeadaanTahapan = 'lalu' | 'berlangsung' | 'mendatang';

const HARI_MS = 86_400_000;
const tgl = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1).getTime();
};
const akhirInklusif = (t: TahapanKalender) => tgl(t.selesai || t.mulai) + HARI_MS;

/** Keadaan tahapan terhadap `kini` dan sisa/selisih hari dalam bahasa awam. */
export function keadaanTahapan(t: TahapanKalender, kini: Date = new Date()): { keadaan: KeadaanTahapan; teks: string } {
  const now = kini.getTime();
  const a = tgl(t.mulai);
  const b = akhirInklusif(t);
  if (now >= b) return { keadaan: 'lalu', teks: 'Selesai' };
  if (now >= a) {
    const sisa = Math.ceil((b - now) / HARI_MS);
    return { keadaan: 'berlangsung', teks: sisa <= 1 ? 'Hari terakhir' : `Sisa ${sisa} hari` };
  }
  const lagi = Math.ceil((a - now) / HARI_MS);
  return { keadaan: 'mendatang', teks: lagi <= 1 ? 'Mulai besok' : `Mulai ${lagi} hari lagi` };
}

const rentangTeks = (t: TahapanKalender) => {
  const a = formatDate(t.mulai, 'medium');
  return t.selesai && t.selesai.slice(0, 10) !== t.mulai.slice(0, 10) ? `${a} – ${formatDate(t.selesai, 'medium')}` : a;
};
const NADA: Record<KeadaanTahapan, BadgeVariant> = { lalu: 'neutral', berlangsung: 'success', mendatang: 'info' };

export interface TahapanAkademikProps extends KeadaanDataProps {
  /** Tahapan dari kalender server (KRS online, perkuliahan, UTS, UAS, input nilai, …). */
  tahapan?: ReadonlyArray<TahapanKalender> | null;
  kini?: Date;
  judul?: React.ReactNode | false;
  meta?: React.ReactNode;
  aksi?: React.ReactNode;
  /** Label jenis kegiatan tambahan (bawaan JENIS_KEGIATAN kalender terpadu). */
  labelJenis?: Record<string, string>;
  className?: string;
}

/**
 * Linimasa tahapan satu periode akademik: bilah posisi tiap tahapan di rentang periode, penanda hari ini, dan
 * keadaan (selesai / berlangsung, sisa n hari / mulai n hari lagi). Tanggal dari kalender akademik server.
 */
export function TahapanAkademik({ tahapan, kini, judul, meta, aksi, labelJenis, className, ...k }: TahapanAkademikProps) {
  const sekarang = kini ?? new Date();
  const urut = React.useMemo(() => [...(tahapan ?? [])].filter((t) => t.mulai).sort((a, b) => a.mulai.localeCompare(b.mulai)), [tahapan]);
  const keadaan = keadaanData(k, !!tahapan, 220, className);
  if (keadaan) return keadaan;
  if (!urut.length) return <Empty icon={<CalendarDays />} title="Tahapan belum diatur" description="Tanggal tahapan diisi BAAK di kalender akademik." className={className} />;
  const t0 = tgl(urut[0]!.mulai);
  const t1 = Math.max(...urut.map(akhirInklusif));
  const pos = (ms: number) => ((ms - t0) / (t1 - t0)) * 100;
  const posKini = pos(sekarang.getTime());
  const label = { ...JENIS_KEGIATAN, ...labelJenis };
  return (
    <section className={cn('u-ak-blok u-ak-tahapan', className)}>
      {judul !== false && <KepalaAkademik judul={judul ?? 'Tahapan akademik'} meta={meta ?? `${formatDate(new Date(t0), 'medium')} – ${formatDate(new Date(t1 - HARI_MS), 'medium')}`} aksi={aksi} />}
      <ol className="u-ak-tahapan-daftar">
        {urut.map((t, i) => {
          const s = keadaanTahapan(t, sekarang);
          const kiri = pos(tgl(t.mulai));
          const lebar = Math.max(1.5, pos(akhirInklusif(t)) - kiri);
          return (
            <li key={`${t.id ?? i}-${t.mulai}`} data-keadaan={s.keadaan}>
              <div className="u-ak-tahapan-teks">
                <b>{t.judul}</b>
                <small>
                  {rentangTeks(t)}
                  {t.jenis && label[t.jenis] ? ` · ${label[t.jenis]}` : ''}
                </small>
              </div>
              <div className="u-ak-tahapan-trek" aria-hidden>
                <span className="u-ak-tahapan-bilah" style={{ left: `${kiri}%`, width: `${Math.min(lebar, 100 - kiri)}%`, ...(t.warna ? { background: t.warna } : {}) }} />
                {posKini >= 0 && posKini <= 100 && <span className="u-ak-tahapan-kini" style={{ left: `${posKini}%` }} />}
              </div>
              <Badge variant={NADA[s.keadaan]} dot={s.keadaan === 'berlangsung'} className="u-ak-tahapan-status">
                {s.teks}
              </Badge>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Tahapan yang sedang berlangsung (atau berikutnya) untuk kartu portal: "KRS online · sisa 3 hari". */
export function tahapanSaatIni(tahapan: ReadonlyArray<TahapanKalender> | null | undefined, kini: Date = new Date()): (TahapanKalender & { status: ReturnType<typeof keadaanTahapan> }) | null {
  const urut = [...(tahapan ?? [])].filter((t) => t.mulai).sort((a, b) => a.mulai.localeCompare(b.mulai));
  const dengan = urut.map((t) => ({ ...t, status: keadaanTahapan(t, kini) }));
  return dengan.find((t) => t.status.keadaan === 'berlangsung') ?? dengan.find((t) => t.status.keadaan === 'mendatang') ?? null;
}
