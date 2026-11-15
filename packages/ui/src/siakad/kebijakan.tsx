'use client';
import * as React from 'react';
import { BookOpen, ExternalLink, FileText, Search } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatDate } from '../lib/format';
import { Badge, Skeleton } from '../components/actions';
import { Empty } from '../components/display';
import { Input } from '../components/forms';
import { Select } from '../components/select';
import { GalatApi } from './galat';
import { useSiakadQuery } from './provider';

/*
 * SOP, kebijakan, pedoman, dan SK yang sudah disahkan dan dipublikasikan lewat SPMI (/v1/spmi/publik/dokumen).
 * Setiap aplikasi bagian (BAUK, BAAK, SDM, fakultas) memasang ini agar aturan dan biaya yang berlaku transparan.
 * Dokumen dikelola di SPMI; komponen ini hanya membaca.
 */

export interface DokumenKebijakan {
  id: number;
  jenis: string;
  tahap: string | null;
  nomor: string | null;
  judul: string;
  versi: string | null;
  ringkasan: string | null;
  tanggal_penetapan: string | null;
  berlaku_mulai: string | null;
  tautan: string | null;
  unit: string | null;
  unit_id: number | null;
  kode_unit: string | null;
  jenis_unit: string | null;
  ditetapkan_oleh: string | null;
  nomor_penetapan: string | null;
  tinjau_berikutnya: string | null;
}

export const LABEL_JENIS_DOKUMEN: Record<string, string> = {
  kebijakan: 'Kebijakan',
  manual: 'Manual',
  standar: 'Standar',
  formulir: 'Formulir',
  pedoman: 'Pedoman',
  sop: 'SOP',
  instruksi_kerja: 'Instruksi kerja',
  renstra: 'Renstra',
  renop: 'Renop',
  sk: 'Surat keputusan',
  laporan: 'Laporan',
  lainnya: 'Lainnya',
};

/** Dokumen publik SPMI; `unit` = kode atau id unit SPMI, `turunan` ikut unit di bawahnya. */
export function useDokumenKebijakan(q: { unit?: string | number | null; turunan?: boolean; jenis?: string | null; q?: string | null } = {}) {
  const query: Record<string, string | number> = {};
  if (q.unit != null && q.unit !== '') query.unit = q.unit;
  if (q.turunan) query.turunan = 1;
  if (q.jenis) query.jenis = q.jenis;
  if (q.q) query.q = q.q;
  return useSiakadQuery<DokumenKebijakan[]>(['spmi', 'publik-dokumen', query], (s, signal) => s.request({ method: 'GET', path: '/v1/spmi/publik/dokumen', query }, { signal }), { staleTime: 300_000 });
}

export interface KebijakanUnitProps {
  /** Kode atau id unit SPMI (mis. "bauk"). Kosong = semua unit. */
  unit?: string | number | null;
  /** Ikut unit di bawahnya (fakultas ikut prodi). Bawaan true. */
  turunan?: boolean;
  /** Batasi jenis, mis. ['sop', 'kebijakan']. */
  jenis?: string[];
  judul?: React.ReactNode;
  deskripsi?: React.ReactNode;
  /** Tautan dokumen yang tidak punya `tautan` (mis. halaman detail di aplikasi). */
  tautanDokumen?: (d: DokumenKebijakan) => string | null;
  className?: string;
}

/** Daftar SOP/kebijakan/SK unit yang berlaku, dengan pencarian dan saring jenis. */
export function KebijakanUnit({ unit, turunan = true, jenis, judul = 'SOP dan kebijakan', deskripsi = 'Aturan yang berlaku dan sudah disahkan. Dokumen dikelola lewat SPMI.', tautanDokumen, className }: KebijakanUnitProps) {
  const [cari, setCari] = React.useState('');
  const [tunda, setTunda] = React.useState('');
  const [pilih, setPilih] = React.useState<string>('');
  React.useEffect(() => {
    const t = setTimeout(() => setTunda(cari.trim()), 300);
    return () => clearTimeout(t);
  }, [cari]);
  const q = useDokumenKebijakan({ unit, turunan, q: tunda.length >= 2 ? tunda : null });
  const semua = (q.data ?? []).filter((d) => !jenis || jenis.includes(d.jenis));
  const adaJenis = [...new Set(semua.map((d) => d.jenis))];
  const daftar = pilih ? semua.filter((d) => d.jenis === pilih) : semua;
  return (
    <section className={cn('u-kebijakan', className)}>
      <header className="u-laporan-kepala">
        <div className="u-laporan-judul">
          <h2>{judul}</h2>
          {deskripsi && <p>{deskripsi}</p>}
        </div>
      </header>
      <div className="u-laporan-filter">
        <Input size="sm" type="search" aria-label="Cari dokumen" placeholder="Cari judul atau nomor" value={cari} onChange={(e) => setCari(e.target.value)} className="u-kebijakan-cari" />
        {adaJenis.length > 1 && (
          <Select<string>
            size="sm"
            aria-label="Jenis dokumen"
            value={pilih || 'semua'}
            options={[{ value: 'semua', label: 'Semua jenis' }, ...adaJenis.map((j) => ({ value: j, label: LABEL_JENIS_DOKUMEN[j] ?? j }))]}
            onValueChange={(v) => setPilih(v && v !== 'semua' ? v : '')}
          />
        )}
      </div>
      {q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : q.loading && !q.data ? (
        <Skeleton style={{ height: 180, width: '100%' }} />
      ) : daftar.length === 0 ? (
        <Empty icon={tunda ? <Search /> : <BookOpen />} title={tunda ? `Tidak ada dokumen untuk "${tunda}"` : 'Belum ada dokumen yang dipublikasikan'} description={tunda ? 'Coba kata lain atau hapus saringan jenis.' : 'Dokumen tampil di sini setelah disahkan dan ditandai publik di SPMI.'} />
      ) : (
        <ul className="u-kebijakan-daftar">
          {daftar.map((d) => {
            const href = d.tautan || tautanDokumen?.(d) || null;
            const isi = (
              <>
                <FileText className="u-kebijakan-ikon" aria-hidden />
                <span className="u-kebijakan-teks">
                  <strong>{d.judul}</strong>
                  <small>
                    {[d.nomor, d.versi ? `versi ${d.versi}` : null, d.unit, d.berlaku_mulai ? `berlaku ${formatDate(d.berlaku_mulai, 'long')}` : d.tanggal_penetapan ? `ditetapkan ${formatDate(d.tanggal_penetapan, 'long')}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </small>
                  {d.ringkasan && <span className="u-kebijakan-ringkas">{d.ringkasan}</span>}
                </span>
                <Badge variant="outline">{LABEL_JENIS_DOKUMEN[d.jenis] ?? d.jenis}</Badge>
                {href && <ExternalLink className="u-kebijakan-buka" aria-hidden />}
              </>
            );
            return (
              <li key={d.id}>
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer">
                    {isi}
                  </a>
                ) : (
                  <div>{isi}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
