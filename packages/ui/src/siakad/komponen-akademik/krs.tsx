'use client';
import * as React from 'react';
import { CalendarDays, CheckCircle2, Hourglass } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Badge, type BadgeVariant } from '../../components/actions';
import { Progress } from '../../components/display';
import { DataTable, type DataColumn } from '../../components/data-table';
import type { MenuEntry } from '../../components/overlays';
import { labelTahunAkademik } from '../akademik';
import { DeretAngka, KepalaAkademik, keadaanData, type KeadaanDataProps } from './bersama';
import { adaAngka, angka, jamPendek, krsDisetujui, namaHari, type BarisKrs, type DataKrs } from './tipe';

/** Ringkasan status persetujuan KRS dari baris-barisnya. */
export function statusKrs(mk: ReadonlyArray<BarisKrs>): { label: string; variant: BadgeVariant; setuju: number; total: number } {
  const total = mk.length;
  const setuju = mk.filter(krsDisetujui).length;
  if (!total) return { label: 'Belum mengisi', variant: 'neutral', setuju, total };
  if (setuju === total) return { label: 'Disetujui dosen PA', variant: 'success', setuju, total };
  if (setuju) return { label: `${setuju} dari ${total} disetujui`, variant: 'warning', setuju, total };
  return { label: 'Menunggu persetujuan dosen PA', variant: 'warning', setuju, total };
}

/** "Senin, 07.30–09.10 · Ruang A1" dari baris KRS/jadwal. */
export function teksWaktuKuliah(m: Pick<BarisKrs, 'hari' | 'jam_mulai' | 'jam_selesai' | 'jam_ke'>): string {
  const hari = namaHari(m.hari);
  const jam = m.jam_mulai ? `${jamPendek(m.jam_mulai)}${m.jam_selesai ? `–${jamPendek(m.jam_selesai)}` : ''}` : m.jam_ke ? `jam ke-${m.jam_ke}` : '';
  return [hari, jam].filter(Boolean).join(', ');
}

export interface RingkasanKrsProps extends KeadaanDataProps {
  krs?: DataKrs | null;
  /**
   * Batas SKS yang boleh diambil menurut server (`batas_sks` dari GET /v1/mahasiswa/{nim}/krs/penawaran, sudah
   * memperhitungkan aturan batas SKS ber-SK). Tanpa nilai ini bilah batas tidak ditampilkan.
   */
  batasSks?: number | null;
  /** IPS semester lalu (dari penawaran) sebagai keterangan dasar batas SKS. */
  ipsSebelumnya?: number | null;
  className?: string;
}

/** Angka utama KRS: SKS diambil (terhadap batas dari server), jumlah MK, status persetujuan PA. */
export function RingkasanKrs({ krs, batasSks, ipsSebelumnya, className, ...k }: RingkasanKrsProps) {
  const keadaan = keadaanData(k, !!krs, 120, className);
  if (keadaan) return keadaan;
  const mk = krs?.mata_kuliah ?? [];
  const sks = adaAngka(krs?.jumlah_sks) ? angka(krs?.jumlah_sks) : mk.reduce((a, m) => a + angka(m.sks), 0);
  const st = statusKrs(mk);
  const lewat = batasSks != null && sks > batasSks;
  return (
    <div className={cn('u-ak-krs-ringkas', className)}>
      <DeretAngka
        items={[
          { label: 'SKS diambil', nilai: batasSks != null ? `${sks} / ${batasSks}` : sks, nada: lewat ? 'danger' : undefined, keterangan: ipsSebelumnya != null ? `IPS lalu ${Number(ipsSebelumnya).toFixed(2)}` : undefined },
          { label: 'Mata kuliah', nilai: mk.length },
          { label: 'Disetujui', nilai: `${st.setuju} / ${st.total}`, nada: st.total && st.setuju === st.total ? 'success' : st.total ? 'warning' : undefined },
          {
            label: 'Status',
            nilai: (
              <Badge variant={st.variant} dot>
                {st.label}
              </Badge>
            ),
          },
        ]}
      />
      {batasSks != null && batasSks > 0 && <Progress value={Math.min(sks, batasSks)} max={batasSks} tone={lewat ? 'danger' : 'primary'} size="sm" label="Batas SKS" format={() => `${sks} dari ${batasSks} SKS`} />}
    </div>
  );
}

export interface TabelKrsProps extends KeadaanDataProps {
  /** Respons GET /v1/mahasiswa/{nim}/krs (atau objek dengan `mata_kuliah`). */
  krs?: DataKrs | null;
  /** Judul bagian; bawaan "KRS <periode>". false = tanpa kepala. */
  judul?: React.ReactNode | false;
  /** Aksi di kanan kepala (mis. tombol Ambil KRS, Cetak KRS resmi). */
  aksi?: React.ReactNode;
  /** Aksi per baris di menu ⋯ (mis. Batalkan mata kuliah selama KRS belum disetujui). */
  aksiBaris?: (m: BarisKrs) => MenuEntry[];
  onPilih?: (m: BarisKrs) => void;
  /** Sembunyikan kolom dosen (mis. tampilan untuk dosen PA). Kolom juga disembunyikan bila tidak ada baris bernama dosen. */
  tanpaDosen?: boolean;
  kosong?: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode };
  className?: string;
}

/** Tabel KRS satu periode: mata kuliah, SKS, kelas, jadwal & ruang, dosen, status persetujuan; kartu di ponsel. */
export function TabelKrs({ krs, judul, aksi, aksiBaris, onPilih, tanpaDosen, kosong, className, ...k }: TabelKrsProps) {
  const keadaan = keadaanData(k, !!krs, 260, className);
  if (keadaan) return keadaan;
  const mk = krs?.mata_kuliah ?? [];
  const sks = adaAngka(krs?.jumlah_sks) ? angka(krs?.jumlah_sks) : mk.reduce((a, m) => a + angka(m.sks), 0);
  const ruang = (m: BarisKrs) => m.nama_ruang || m.ruang || '';
  const kolom: DataColumn<BarisKrs>[] = [
    { key: 'nama_mk', header: 'Mata kuliah', sortable: true, mobile: 'title', cell: (m) => <span className="u-ak-mk">{m.nama_mk ?? '–'}</span> },
    { key: 'kode_mk', header: 'Kode', sortable: true, width: '7rem', mobile: 'subtitle', cell: (m) => <span className="u-mono">{m.kode_mk ?? '–'}</span> },
    { key: 'sks', header: 'SKS', align: 'end', sortable: true, width: '4.5rem', value: (m) => (adaAngka(m.sks) ? Number(m.sks) : null), cell: (m) => (adaAngka(m.sks) ? Number(m.sks) : '–') },
    { key: 'kelas', header: 'Kelas', width: '5.5rem', cell: (m) => m.kelas || '–' },
    {
      key: 'jadwal',
      header: 'Jadwal',
      width: '13rem',
      sortable: true,
      value: (m) => `${m.hari ?? '9'}${m.jam_mulai ?? ''}`,
      cell: (m) => {
        const w = teksWaktuKuliah(m);
        return w || ruang(m) ? (
          <span className="u-ak-jadwal-sel">
            {w && <span>{w}</span>}
            {ruang(m) && <small>{ruang(m)}</small>}
          </span>
        ) : (
          <span className="u-muted">Belum dijadwalkan</span>
        );
      },
    },
    ...(tanpaDosen || !mk.some((m) => m.nama_dosen) ? [] : [{ key: 'nama_dosen', header: 'Dosen', cell: (m: BarisKrs) => m.nama_dosen || <span className="u-muted">–</span> } satisfies DataColumn<BarisKrs>]),
    {
      key: 'status',
      header: 'Status',
      shrink: true,
      mobile: 'badge',
      sortable: true,
      value: (m) => (krsDisetujui(m) ? 'Disetujui' : 'Menunggu'),
      cell: (m) =>
        krsDisetujui(m) ? (
          <Badge variant="success">
            <CheckCircle2 /> Disetujui
          </Badge>
        ) : (
          <Badge variant="warning">
            <Hourglass /> Menunggu
          </Badge>
        ),
    },
  ];
  const st = statusKrs(mk);
  return (
    <section className={cn('u-ak-blok', className)}>
      {judul !== false && (
        <KepalaAkademik
          judul={judul ?? `KRS ${labelTahunAkademik(krs?.tahun_id)}`}
          meta={mk.length ? `${mk.length} mata kuliah · ${sks} SKS · ${st.label}` : undefined}
          aksi={aksi}
        />
      )}
      <DataTable
        className="u-ak-tabel"
        columns={kolom}
        rows={mk}
        rowKey={(m) => String(m.idkrs ?? `${m.kode_mk}-${m.kelas ?? ''}`)}
        pagination={false}
        columnToggle={false}
        densityToggle={false}
        defaultDensity="compact"
        exportCsv={mk.length ? `krs-${krs?.nim ?? ''}-${krs?.tahun_id ?? ''}` : false}
        rowActions={aksiBaris}
        onRowClick={onPilih}
        empty={{ icon: <CalendarDays />, title: kosong?.title ?? 'Belum mengisi KRS', description: kosong?.description ?? (krs?.tahun_id ? `Periode ${labelTahunAkademik(krs.tahun_id)}` : undefined), action: kosong?.action }}
      />
    </section>
  );
}
