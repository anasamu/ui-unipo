'use client';
import * as React from 'react';
import { BookOpen, CalendarDays, GraduationCap, Mail, MapPin, Phone, RefreshCw, Users } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatDate, formatNumber } from '../lib/format';
import { Badge, Button, Skeleton, type BadgeVariant } from '../components/actions';
import { Avatar, DescriptionList, Empty, Tabs } from '../components/display';
import { LineChart } from '../components/charts';
import { Sheet } from '../components/overlays';
import { DataTable } from '../components/data-table';
import { pesanGalat, useSiakadQuery, type QueryState } from './provider';
import { KodeLaporan } from '../components/galat';
import { LabelProdi } from './prodi';
import { LembarKhs } from './komponen-akademik/khs';
import { LembarTranskrip } from './komponen-akademik/transkrip';
import { useSkalaNilai } from './komponen-akademik/skala';
import type { DataTranskrip, IdentitasAkademik, PeriodeKhs } from './komponen-akademik/tipe';

/*
 * Detail data akademik dari API SIAKAD: profil mahasiswa (biodata, riwayat studi, KRS, KHS, transkrip),
 * profil dosen (jadwal mengajar, mahasiswa bimbingan), dan detail mata kuliah (kelas yang dibuka).
 * Setiap bagian bisa dipakai sendiri; Detail* menyusunnya dalam tab, SheetDetail* membukanya sebagai panel samping.
 */

type Row = Record<string, any>;
type Angka = number | string | null | undefined;
const n = (v: Angka) => (v == null || v === '' ? 0 : Number(v) || 0);
const ip = (v: Angka) => (v == null || v === '' ? '–' : Number(v).toFixed(2));

// ================================================================ Tipe ringkas
export interface MataKuliahNilai {
  kode_mk?: string | null;
  nama_mk?: string | null;
  tahun_id?: string | null;
  semester?: number | null;
  kelas?: string | null;
  sks?: number | null;
  nilai_huruf?: string | null;
  bobot?: number | null;
  mutu?: number | null;
  nilai_ditampilkan?: boolean;
}
export interface KhsPeriode {
  nim?: string;
  tahun_id?: string | null;
  mata_kuliah?: MataKuliahNilai[];
  jumlah_sks?: number | null;
  ips?: { sks?: number | null; nilai?: number | null } | null;
  ipk?: { sks?: number | null; nilai?: number | null } | null;
}
export interface StatusSemesterData {
  nim: string;
  status_semester: Array<{ tahun_id: string; kode_prodi?: string; status: string; total_sks?: Angka; total_ipk?: Angka; tanggal_her?: string | null }>;
  cuti?: Array<{ tahun_id: string; semester?: number; tanggal_mulai?: string; tanggal_akhir?: string; status_cuti?: string; keterangan?: string | null }>;
}

// ================================================================ Hook
const opt = { staleTime: 60_000 };
export function useMahasiswa(nim: string | undefined) {
  return useSiakadQuery<Row>(['mhs', nim], (s, signal) => s.mahasiswa.getByNim(nim!, {}, { signal }) as never, { ...opt, enabled: !!nim });
}
export function useStatusSemester(nim: string | undefined) {
  return useSiakadQuery<StatusSemesterData>(['mhs', nim, 'status'], (s, signal) => s.mahasiswa.getByNimStatusSemester(nim!, {}, { signal }) as never, { ...opt, enabled: !!nim });
}
/** Semua periode KHS (tanpa tahun_id) atau satu periode. */
export function useKhs(nim: string | undefined) {
  return useSiakadQuery<{ nim: string; periode: KhsPeriode[] }>(['mhs', nim, 'khs'], (s, signal) => s.mahasiswa.getByNimKhs(nim!, {}, { signal }) as never, { ...opt, enabled: !!nim });
}
export function useTranskrip(nim: string | undefined) {
  return useSiakadQuery<Row>(['mhs', nim, 'transkrip'], (s, signal) => s.mahasiswa.getByNimTranskrip(nim!, {}, { signal }) as never, { ...opt, enabled: !!nim });
}
export function useKrsMahasiswa(nim: string | undefined, tahunId?: string) {
  return useSiakadQuery<Row>(['mhs', nim, 'krs', tahunId ?? ''], (s, signal) => s.mahasiswa.getByNimKrs(nim!, tahunId ? { tahun_id: tahunId } : {}, { signal }) as never, { ...opt, enabled: !!nim });
}
export function useDosen(nidn: string | undefined) {
  return useSiakadQuery<Row>(['dosen', nidn], (s, signal) => s.dosen.getByNidn(nidn!, {}, { signal }) as never, { ...opt, enabled: !!nidn });
}
export function useJadwalDosen(nidn: string | undefined, tahunId?: string) {
  return useSiakadQuery<Row[]>(
    ['dosen', nidn, 'jadwal', tahunId ?? ''],
    (s, signal) => s.dosen.getByNidnJadwal(nidn!, { per_page: 100, ...(tahunId ? { tahun_id: tahunId } : {}) } as never, { signal }) as never,
    {
      ...opt,
      enabled: !!nidn,
    },
  );
}
export function useBimbinganDosen(nidn: string | undefined, status = 'A') {
  return useSiakadQuery<Row[]>(['dosen', nidn, 'bimbingan', status], (s, signal) => s.dosen.getByNidnMahasiswaBimbingan(nidn!, { status, per_page: 100 } as never, { signal }) as never, {
    ...opt,
    enabled: !!nidn,
  });
}
export function useKelasMataKuliah(kodeMk: string | undefined, q: { prodi?: string; tahun_id?: string } = {}) {
  return useSiakadQuery<Row[]>(['jadwal-mk', kodeMk, q], (s, signal) => s.jadwal.list({ kode_mk: kodeMk, per_page: 50, ...q } as never, { signal }) as never, { ...opt, enabled: !!kodeMk });
}

// ================================================================ Bantuan
function Galat({ q }: { q: QueryState<unknown> }) {
  return (
    <div className="u-widget-error" role="alert">
      <span>{pesanGalat(q.error, { kode: false })}<KodeLaporan error={q.error} /></span>
      <Button size="sm" variant="ghost" onClick={q.refetch}>
        <RefreshCw /> Muat ulang
      </Button>
    </div>
  );
}
const muatDari = (q: QueryState<unknown>) => q.loading && !q.data;
const Mono = ({ children }: { children: React.ReactNode }) => <span className="u-mono">{children}</span>;

export { labelTahunAkademik } from './label-tahun';
import { labelTahunAkademik } from './label-tahun';

const STATUS_MHS: Record<string, { label: string; variant: BadgeVariant }> = {
  A: { label: 'Aktif', variant: 'success' },
  C: { label: 'Cuti', variant: 'warning' },
  N: { label: 'Non-aktif', variant: 'neutral' },
  L: { label: 'Lulus', variant: 'info' },
  K: { label: 'Keluar', variant: 'danger' },
  D: { label: 'Drop out', variant: 'danger' },
  M: { label: 'Mutasi', variant: 'neutral' },
};
const KELAS: Record<string, string> = { R: 'Reguler', K: 'Karyawan', D: 'Daring' };
const HARI: Record<string, string> = { '1': 'Senin', '2': 'Selasa', '3': 'Rabu', '4': 'Kamis', '5': 'Jumat', '6': 'Sabtu', '7': 'Minggu' };
const jadwalKrs = (m: Row): string => (m.hari ? `${HARI[m.hari] ?? m.hari}${m.jam_mulai ? `, ${String(m.jam_mulai).slice(0, 5)}` : m.jam_ke ? `, jam ke-${m.jam_ke}` : ''}${m.ruang ? ` · ${m.ruang}` : ''}` : '');

/**
 * Lencana nilai huruf dengan warna tetap per huruf (A hijau → E merah).
 * @deprecated Pakai `LencanaNilai` dengan `skala` dari `useSkalaNilai` (warna mengikuti skala nilai kampus, bukan huruf tetap).
 */
export function NilaiHuruf({ nilai, className }: { nilai?: string | null; className?: string }) {
  if (!nilai)
    return (
      <span className={cn('u-nilai', className)} data-kosong>
        –
      </span>
    );
  const h = nilai.trim().toUpperCase()[0];
  return (
    <span className={cn('u-nilai', className)} data-huruf={h}>
      {nilai}
    </span>
  );
}

// ================================================================ Mahasiswa: kartu profil
/** Kepala profil mahasiswa: foto, nama, NIM, prodi, status, dan angka utama (IPK, SKS, semester). */
export function KartuProfilMahasiswa({ nim, aksi, className }: { nim: string; aksi?: React.ReactNode; className?: string }) {
  const q = useMahasiswa(nim);
  const t = useTranskrip(nim);
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 148 }} />;
  const m = q.data ?? {};
  const st = STATUS_MHS[m.status_aktif] ?? { label: m.status_aktif_label ?? m.status_aktif ?? '–', variant: 'neutral' as BadgeVariant };
  const ipk = t.data?.ipk?.nilai ?? m.ipk;
  const sks = t.data?.jumlah_sks ?? t.data?.ipk?.sks ?? m.sks_lulus;
  return (
    <section className={cn('u-profil', className)}>
      <div className="u-profil-head">
        <Avatar name={String(m.nama ?? nim)} src={m.foto} size="xl" />
        <div className="u-profil-id">
          <h3>{m.nama ?? nim}</h3>
          <p>
            <Mono>{m.nim ?? nim}</Mono>
            <LabelProdi kode={m.kode_prodi} nama={m.nama_prodi} prodi={{ kode_jenjang: m.kode_jenjang }} />
          </p>
          <div className="u-profil-tags">
            <Badge variant={st.variant} dot>
              {m.status_aktif_label ?? st.label}
            </Badge>
            {m.kelas && <Badge variant="outline">{KELAS[m.kelas] ?? m.kelas}</Badge>}
            {m.konsentrasi && <Badge variant="outline">{m.konsentrasi}</Badge>}
          </div>
        </div>
        {aksi && <div className="u-profil-aksi">{aksi}</div>}
      </div>
      <dl className="u-profil-angka">
        <div>
          <dt>IPK</dt>
          <dd>{ip(ipk)}</dd>
        </div>
        <div>
          <dt>SKS lulus</dt>
          <dd>{sks != null ? formatNumber(n(sks)) : '–'}</dd>
        </div>
        <div>
          <dt>Semester</dt>
          <dd>{m.semester ?? '–'}</dd>
        </div>
        <div>
          <dt>Angkatan</dt>
          <dd>{m.tahun_masuk ?? '–'}</dd>
        </div>
      </dl>
    </section>
  );
}

/** Biodata dan data akademik mahasiswa. Data pribadi hanya tampil bila token punya scope mahasiswa:pii. */
export function DataDiriMahasiswa({ nim, className }: { nim: string; className?: string }) {
  const q = useMahasiswa(nim);
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 220 }} />;
  const m = q.data ?? {};
  const p = m.pribadi;
  const a = p?.alamat;
  const alamat = a ? [a.jalan, a.rt && `RT ${a.rt}`, a.rw && `RW ${a.rw}`, a.desa, a.kecamatan].filter(Boolean).join(', ') : null;
  return (
    <div className={cn('u-biodata', className)}>
      <section>
        <h4>Akademik</h4>
        <DescriptionList
          items={[
            { label: 'Program studi', value: m.kode_prodi || m.nama_prodi ? <LabelProdi kode={m.kode_prodi} nama={m.nama_prodi} prodi={{ kode_jenjang: m.kode_jenjang }} /> : '–' },
            { label: 'Status masuk', value: m.status_masuk === 'P' ? 'Pindahan' : m.status_masuk === 'B' ? 'Baru' : (m.status_masuk ?? '–') },
            { label: 'Masuk', value: `${labelTahunAkademik(m.semester_masuk)}${m.tanggal_masuk ? ` · ${formatDate(m.tanggal_masuk, 'medium')}` : ''}` },
            { label: 'Batas studi', value: labelTahunAkademik(m.batas_studi) },
            { label: 'Dosen PA', value: m.nama_pa ?? m.nidn_pa ?? '–' },
            ...(m.tanggal_lulus ? [{ label: 'Lulus', value: `${formatDate(m.tanggal_lulus, 'medium')}${m.no_ijazah ? ` · Ijazah ${m.no_ijazah}` : ''}` }] : []),
          ]}
        />
      </section>
      <section>
        <h4>Pribadi</h4>
        {p ? (
          <DescriptionList
            items={[
              { label: 'Tempat, tgl lahir', value: [p.tempat_lahir, p.tanggal_lahir && formatDate(p.tanggal_lahir, 'long')].filter(Boolean).join(', ') || '–' },
              { label: 'Jenis kelamin', value: m.jenis_kelamin === 'L' ? 'Laki-laki' : m.jenis_kelamin === 'P' ? 'Perempuan' : '–' },
              { label: 'Agama', value: m.agama ?? '–' },
              {
                label: 'Kontak',
                value: (
                  <span className="u-biodata-kontak">
                    {p.email && (
                      <span>
                        <Mail aria-hidden /> {p.email}
                      </span>
                    )}
                    {p.hp && (
                      <span>
                        <Phone aria-hidden /> {p.hp}
                      </span>
                    )}
                    {!p.email && !p.hp && '–'}
                  </span>
                ),
              },
              {
                label: 'Alamat',
                value: alamat ? (
                  <span className="u-biodata-kontak">
                    <span>
                      <MapPin aria-hidden /> {alamat}
                    </span>
                  </span>
                ) : (
                  '–'
                ),
              },
            ]}
          />
        ) : (
          <p className="u-muted">Data pribadi butuh izin akses mahasiswa:pii.</p>
        )}
      </section>
      {m.asal && (m.asal.nama_sekolah || m.asal.nama_pt) && (
        <section>
          <h4>Asal</h4>
          <DescriptionList
            items={[
              ...(m.asal.nama_sekolah ? [{ label: 'Sekolah', value: `${m.asal.nama_sekolah}${m.asal.tahun_lulus_sekolah ? ` (${m.asal.tahun_lulus_sekolah})` : ''}` }] : []),
              ...(m.asal.nama_pt ? [{ label: 'PT asal', value: `${m.asal.nama_pt}${m.asal.sks_diakui ? ` · ${m.asal.sks_diakui} SKS diakui` : ''}` }] : []),
            ]}
          />
        </section>
      )}
    </div>
  );
}

// ================================================================ Riwayat studi
/** Grafik IPS dan IPK per semester ditambah status tiap semester (aktif, cuti, non-aktif). */
export function RiwayatStudi({ nim, className }: { nim: string; className?: string }) {
  const k = useKhs(nim);
  const s = useStatusSemester(nim);
  if (k.error) return <Galat q={k} />;
  if (muatDari(k) || muatDari(s)) return <Skeleton className={className} style={{ height: 320 }} />;
  const periode = (k.data?.periode ?? []).filter((p) => p.tahun_id).sort((a, b) => String(a.tahun_id).localeCompare(String(b.tahun_id)));
  const status = new Map((s.data?.status_semester ?? []).map((x) => [x.tahun_id, x]));
  const semua = [...new Set([...periode.map((p) => p.tahun_id!), ...status.keys()])].sort();
  if (!semua.length) return <Empty icon={<GraduationCap />} title="Belum ada riwayat studi" className={className} />;
  const perTahun = new Map(periode.map((p) => [p.tahun_id!, p]));
  return (
    <div className={cn('u-riwayat', className)}>
      {periode.length > 1 && (
        <LineChart
          labels={periode.map((p) => labelTahunAkademik(p.tahun_id, true))}
          titles={periode.map((p) => labelTahunAkademik(p.tahun_id))}
          series={[
            { label: 'IPS', values: periode.map((p) => (p.ips?.nilai == null ? null : n(p.ips.nilai))) },
            { label: 'IPK', values: periode.map((p) => (p.ipk?.nilai == null ? null : n(p.ipk.nilai))) },
          ]}
          format={(v) => v.toFixed(2)}
          area={false}
          height={170}
          max={4}
          legendValue="akhir"
        />
      )}
      <ol className="u-riwayat-list">
        {semua.map((t, i) => {
          const st = status.get(t);
          const p = perTahun.get(t);
          const kode = st?.status ?? (p ? 'A' : 'N');
          const s2 = STATUS_MHS[kode] ?? { label: kode, variant: 'neutral' as BadgeVariant };
          return (
            <li key={t} data-status={kode}>
              <span className="u-riwayat-smt">{i + 1}</span>
              <span className="u-riwayat-tahun">
                <b>{labelTahunAkademik(t)}</b>
                <small>{p ? `${n(p.jumlah_sks ?? p.ips?.sks)} SKS` : kode === 'C' ? 'Cuti akademik' : kode === 'A' && i === semua.length - 1 ? 'Semester berjalan' : 'Tanpa KRS'}</small>
              </span>
              <Badge variant={s2.variant}>{s2.label}</Badge>
              <span className="u-riwayat-ip">
                <span>
                  IPS <b>{ip(p?.ips?.nilai)}</b>
                </span>
                <span>
                  IPK <b>{ip(p?.ipk?.nilai ?? st?.total_ipk)}</b>
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ================================================================ KHS
/** Identitas cetak KHS/transkrip dari data mahasiswa (GET /v1/mahasiswa/{nim}). */
function identitasDari(m: Row | undefined, nim: string): IdentitasAkademik {
  return { nim, nama: m?.nama ?? null, prodi: m?.nama_prodi ?? m?.kode_prodi ?? null, jenjang: m?.kode_jenjang ?? null, angkatan: m?.tahun_masuk ?? null, dosenPa: m?.dosen_pa_nama ?? m?.nama_dosen_pa ?? null };
}

/**
 * KHS per periode untuk satu mahasiswa (terhubung SDK). Memakai `LembarKhs` komponen akademik: pemilih periode, IPS dan
 * IPK, tabel nilai berwarna menurut skala nilai server, legenda, dan versi cetak. Judul dari wadah (mis. tab Detail).
 */
export function KhsMahasiswa({ nim, tahunId, className }: { nim: string; tahunId?: string; className?: string }) {
  const q = useKhs(nim);
  const mhs = useMahasiswa(nim);
  const skala = useSkalaNilai({ prodi: mhs.data?.kode_prodi ?? null, enabled: !!mhs.data });
  const [pilih, setPilih] = React.useState<string | undefined>(tahunId);
  return (
    <LembarKhs
      periode={(q.data?.periode ?? null) as PeriodeKhs[] | null}
      tahunId={pilih}
      onTahunIdChange={setPilih}
      skala={skala.skala}
      identitas={identitasDari(mhs.data, nim)}
      judul={false}
      memuat={q.loading}
      galat={q.error}
      onUlang={q.refetch}
      className={className}
    />
  );
}

// ================================================================ Transkrip
/**
 * Transkrip satu mahasiswa (terhubung SDK) memakai `LembarTranskrip`: IPK, total SKS dan mutu, sebaran nilai menurut
 * skala server, daftar per semester atau satu tabel, dan versi cetak.
 */
export function TranskripMahasiswa({ nim, kelompok = 'semester', className }: { nim: string; kelompok?: 'semester' | 'tidak'; className?: string }) {
  const q = useTranskrip(nim);
  const mhs = useMahasiswa(nim);
  const skala = useSkalaNilai({ prodi: mhs.data?.kode_prodi ?? null, enabled: !!mhs.data });
  return (
    <LembarTranskrip
      data={(q.data ?? null) as DataTranskrip | null}
      skala={skala.skala}
      identitas={identitasDari(mhs.data, nim)}
      tampilan={kelompok === 'semester' ? 'semester' : 'tabel'}
      judul={false}
      memuat={q.loading}
      galat={q.error}
      onUlang={q.refetch}
      className={className}
    />
  );
}

// ================================================================ KRS
/** KRS satu periode (bawaan periode aktif) dengan jadwal, ruang, dan status persetujuan PA. */
export function KrsMahasiswa({ nim, tahunId, className }: { nim: string; tahunId?: string; className?: string }) {
  const q = useKrsMahasiswa(nim, tahunId);
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 260 }} />;
  const k = q.data ?? {};
  const mk: Row[] = k.mata_kuliah ?? [];
  const setuju = mk.filter((m) => m.disetujui).length;
  if (!mk.length) return <Empty icon={<CalendarDays />} title="Belum mengisi KRS" description={`Periode ${labelTahunAkademik(k.tahun_id)}`} className={className} />;
  return (
    <div className={cn('u-krs', className)}>
      <div className="u-krs-head">
        <span>
          <b>{labelTahunAkademik(k.tahun_id)}</b> · {n(k.jumlah_sks)} SKS · {mk.length} mata kuliah
        </span>
        <Badge variant={setuju === mk.length ? 'success' : 'warning'} dot>
          {setuju === mk.length ? 'Disetujui PA' : `${mk.length - setuju} menunggu persetujuan`}
        </Badge>
      </div>
      <DataTable<Row>
        className="u-tabel-nilai-dt"
        columns={[
          { key: 'kode_mk', header: 'Kode', cell: (m) => <Mono>{m.kode_mk}</Mono>, sortable: true, width: '6.5rem', mobile: 'subtitle' },
          { key: 'nama_mk', header: 'Mata kuliah', sortable: true, mobile: 'title' },
          { key: 'sks', header: 'SKS', align: 'end', sortable: true, width: '4rem', value: (m) => (m.sks != null ? Number(m.sks) : null) },
          { key: 'kelas', header: 'Kelas', cell: (m) => m.kelas ?? '–', width: '5rem' },
          {
            key: 'jadwal',
            header: 'Jadwal',
            value: (m) => jadwalKrs(m),
            cell: (m) => <span className="u-muted">{jadwalKrs(m) || '–'}</span>,
          },
          {
            key: 'disetujui',
            header: 'Status',
            mobile: 'badge',
            sortable: true,
            value: (m) => (m.disetujui ? 'Disetujui' : 'Menunggu'),
            cell: (m) => (m.disetujui ? <Badge variant="success">Disetujui</Badge> : <Badge variant="warning">Menunggu</Badge>),
          },
        ]}
        rows={mk}
        rowKey={(m) => String(m.idkrs ?? m.kode_mk)}
        pagination={false}
        columnToggle={false}
        densityToggle={false}
        defaultDensity="compact"
        exportCsv={`krs-${nim}-${k.tahun_id ?? ''}`}
      />
    </div>
  );
}

// ================================================================ Detail mahasiswa
export type TabMahasiswa = 'ringkasan' | 'krs' | 'khs' | 'transkrip';
/** Profil mahasiswa lengkap dalam tab: ringkasan (biodata + riwayat studi), KRS, KHS, transkrip. */
export function DetailMahasiswa({
  nim,
  tab,
  onTabChange,
  tabs = ['ringkasan', 'krs', 'khs', 'transkrip'],
  aksi,
  className,
}: {
  nim: string;
  tab?: TabMahasiswa;
  onTabChange?: (t: TabMahasiswa) => void;
  tabs?: TabMahasiswa[];
  aksi?: React.ReactNode;
  className?: string;
}) {
  const label: Record<TabMahasiswa, string> = { ringkasan: 'Ringkasan', krs: 'KRS', khs: 'KHS', transkrip: 'Transkrip' };
  const isi: Record<TabMahasiswa, React.ReactNode> = {
    ringkasan: (
      <div className="u-detail-stack">
        <RiwayatStudi nim={nim} />
        <DataDiriMahasiswa nim={nim} />
      </div>
    ),
    krs: <KrsMahasiswa nim={nim} />,
    khs: <KhsMahasiswa nim={nim} />,
    transkrip: <TranskripMahasiswa nim={nim} />,
  };
  return (
    <div className={cn('u-detail', className)}>
      <KartuProfilMahasiswa nim={nim} aksi={aksi} />
      <Tabs<TabMahasiswa> value={tab} onValueChange={onTabChange} items={tabs.map((t) => ({ value: t, label: label[t], content: isi[t] }))} />
    </div>
  );
}

/** DetailMahasiswa dalam panel samping. Isi `nim` dan buka; tutup mengosongkan pilihan. */
export function SheetDetailMahasiswa({ nim, open, onOpenChange, aksi }: { nim: string | null | undefined; open?: boolean; onOpenChange: (open: boolean) => void; aksi?: React.ReactNode }) {
  return (
    <Sheet open={open ?? !!nim} onOpenChange={onOpenChange} title="Detail mahasiswa" size="xl" className="u-sheet-detail">
      {nim && <DetailMahasiswa nim={nim} aksi={aksi} />}
    </Sheet>
  );
}

// ================================================================ Dosen
/** Kepala profil dosen: foto, nama bergelar, NIDN, prodi, jabatan akademik, status. */
export function KartuProfilDosen({ nidn, aksi, className }: { nidn: string; aksi?: React.ReactNode; className?: string }) {
  const q = useDosen(nidn);
  const j = useJadwalDosen(nidn);
  const b = useBimbinganDosen(nidn);
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 148 }} />;
  const d = q.data ?? {};
  const nama = d.nama_lengkap ?? [d.gelar_depan, d.nama, d.gelar_belakang].filter(Boolean).join(' ');
  const sks = (j.data ?? []).reduce((s, r) => s + n(r.sks), 0);
  return (
    <section className={cn('u-profil', className)}>
      <div className="u-profil-head">
        <Avatar name={String(d.nama ?? nidn)} src={d.foto} size="xl" />
        <div className="u-profil-id">
          <h3>{nama || nidn}</h3>
          <p>
            <Mono>NIDN {d.nidn ?? nidn}</Mono>
            {d.kode_prodi || d.nama_prodi ? <LabelProdi kode={d.kode_prodi} nama={d.nama_prodi} prodi={{ kode_jenjang: d.kode_jenjang }} /> : <span>–</span>}
          </p>
          <div className="u-profil-tags">
            <Badge variant={d.status_aktif === 'A' || d.status === 'A' ? 'success' : 'neutral'} dot>
              {d.status_aktif === 'A' || d.status === 'A' ? 'Aktif' : 'Tidak aktif'}
            </Badge>
            {d.jabatan_akademik && <Badge variant="outline">{d.jabatan_akademik}</Badge>}
            {d.ikatan_kerja && <Badge variant="outline">{d.ikatan_kerja}</Badge>}
          </div>
        </div>
        {aksi && <div className="u-profil-aksi">{aksi}</div>}
      </div>
      <dl className="u-profil-angka">
        <div>
          <dt>Kelas diampu</dt>
          <dd>{j.data ? j.data.length : '–'}</dd>
        </div>
        <div>
          <dt>SKS mengajar</dt>
          <dd>{j.data ? sks : '–'}</dd>
        </div>
        <div>
          <dt>Bimbingan aktif</dt>
          <dd>{b.data ? b.data.length : '–'}</dd>
        </div>
        <div>
          <dt>Pendidikan</dt>
          <dd>{d.pendidikan ?? '–'}</dd>
        </div>
      </dl>
    </section>
  );
}

/** Jadwal mengajar dosen dikelompokkan per hari. */
export function JadwalMengajar({ nidn, tahunId, className }: { nidn: string; tahunId?: string; className?: string }) {
  const q = useJadwalDosen(nidn, tahunId);
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 240 }} />;
  const data = q.data ?? [];
  if (!data.length) return <Empty icon={<CalendarDays />} title="Tidak ada jadwal mengajar" className={className} />;
  const grup = new Map<string, Row[]>();
  for (const r of [...data].sort((a, b) => String(a.hari).localeCompare(String(b.hari)) || String(a.jam_mulai ?? a.jam_ke).localeCompare(String(b.jam_mulai ?? b.jam_ke))))
    grup.set(String(r.hari ?? '-'), [...(grup.get(String(r.hari ?? '-')) ?? []), r]);
  return (
    <div className={cn('u-jadwal-hari', className)}>
      {[...grup].map(([h, rows]) => (
        <section key={h}>
          <h4>{HARI[h] ?? 'Tanpa hari'}</h4>
          <ul>
            {rows.map((r) => (
              <li key={r.idj}>
                <span className="u-jadwal-jam">
                  {r.jam_mulai ? String(r.jam_mulai).slice(0, 5) : `Jam ${r.jam_ke ?? '–'}`}
                  {r.jam_selesai && <small>{String(r.jam_selesai).slice(0, 5)}</small>}
                </span>
                <span className="u-jadwal-mk">
                  <b>{r.nama_mk}</b>
                  <small>
                    <Mono>{r.kode_mk}</Mono> · Kelas {r.kelas ?? '–'} · {r.sks} SKS
                  </small>
                </span>
                <span className="u-jadwal-ruang">{r.nama_ruang ?? r.ruang ?? '–'}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Mahasiswa bimbingan akademik (PA) seorang dosen. */
export function MahasiswaBimbingan({ nidn, onPilih, className }: { nidn: string; onPilih?: (m: Row) => void; className?: string }) {
  const q = useBimbinganDosen(nidn);
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 240 }} />;
  const data = q.data ?? [];
  if (!data.length) return <Empty icon={<Users />} title="Belum ada mahasiswa bimbingan" className={className} />;
  return (
    <ul className={cn('u-bimbingan', className)}>
      {data.map((m) => {
        const st = STATUS_MHS[m.status_aktif] ?? { label: m.status_aktif ?? '–', variant: 'neutral' as BadgeVariant };
        const Tag = onPilih ? 'button' : 'div';
        return (
          <li key={m.nim}>
            <Tag className="u-bimbingan-row" {...(onPilih ? { type: 'button' as const, onClick: () => onPilih(m) } : {})}>
              <Avatar name={String(m.nama ?? m.nim)} src={m.foto} size="sm" />
              <span className="u-bimbingan-nama">
                <b>{m.nama}</b>
                <small>
                  <Mono>{m.nim}</Mono> · angkatan {m.tahun_masuk ?? '–'}
                </small>
              </span>
              {m.ipk != null && <span className="u-bimbingan-ipk">IPK {ip(m.ipk)}</span>}
              <Badge variant={st.variant}>{m.status_aktif_label ?? st.label}</Badge>
            </Tag>
          </li>
        );
      })}
    </ul>
  );
}

/** Biodata dosen: kepegawaian dan kontak. */
export function DataDiriDosen({ nidn, className }: { nidn: string; className?: string }) {
  const q = useDosen(nidn);
  if (q.error) return <Galat q={q} />;
  if (muatDari(q)) return <Skeleton className={className} style={{ height: 200 }} />;
  const d = q.data ?? {};
  const p = d.pribadi;
  return (
    <div className={cn('u-biodata', className)}>
      <section>
        <h4>Kepegawaian</h4>
        <DescriptionList
          items={[
            { label: 'NIP', value: d.nip ?? '–' },
            { label: 'Status pegawai', value: d.status_pegawai ?? '–' },
            { label: 'Jabatan akademik', value: d.jabatan_akademik ?? d.jabatan_fungsional ?? '–' },
            { label: 'Pangkat/golongan', value: d.pangkat_golongan ?? '–' },
            { label: 'Jabatan struktural', value: d.jabatan_struktural ?? '–' },
            { label: 'Mulai masuk', value: d.mulai_masuk ? formatDate(d.mulai_masuk, 'medium') : '–' },
          ]}
        />
      </section>
      {p && (
        <section>
          <h4>Kontak</h4>
          <DescriptionList
            items={[
              { label: 'Email', value: p.email ?? '–' },
              { label: 'HP', value: p.hp ?? '–' },
            ]}
          />
        </section>
      )}
    </div>
  );
}

export type TabDosen = 'profil' | 'jadwal' | 'bimbingan';
/** Profil dosen dalam tab: biodata, jadwal mengajar, mahasiswa bimbingan. */
export function DetailDosen({
  nidn,
  tab,
  onTabChange,
  onPilihMahasiswa,
  aksi,
  className,
}: {
  nidn: string;
  tab?: TabDosen;
  onTabChange?: (t: TabDosen) => void;
  onPilihMahasiswa?: (m: Row) => void;
  aksi?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('u-detail', className)}>
      <KartuProfilDosen nidn={nidn} aksi={aksi} />
      <Tabs<TabDosen>
        value={tab}
        onValueChange={onTabChange}
        items={[
          { value: 'profil', label: 'Profil', content: <DataDiriDosen nidn={nidn} /> },
          { value: 'jadwal', label: 'Jadwal mengajar', content: <JadwalMengajar nidn={nidn} /> },
          { value: 'bimbingan', label: 'Bimbingan', content: <MahasiswaBimbingan nidn={nidn} onPilih={onPilihMahasiswa} /> },
        ]}
      />
    </div>
  );
}
export function SheetDetailDosen({ nidn, open, onOpenChange, aksi }: { nidn: string | null | undefined; open?: boolean; onOpenChange: (open: boolean) => void; aksi?: React.ReactNode }) {
  return (
    <Sheet open={open ?? !!nidn} onOpenChange={onOpenChange} title="Detail dosen" size="xl" className="u-sheet-detail">
      {nidn && <DetailDosen nidn={nidn} aksi={aksi} />}
    </Sheet>
  );
}

// ================================================================ Mata kuliah
/** Detail mata kuliah dari baris tabel (mataKuliah.list) plus kelas yang dibuka (jadwal.list). */
export function DetailMataKuliah({ mk, tahunId, className }: { mk: Row; tahunId?: string; className?: string }) {
  const q = useKelasMataKuliah(mk.kode_mk, { ...(mk.kode_prodi ? { prodi: mk.kode_prodi } : {}), ...(tahunId ? { tahun_id: tahunId } : {}) });
  const kelas = q.data ?? [];
  return (
    <div className={cn('u-detail', className)}>
      <section className="u-profil">
        <div className="u-profil-head">
          <span className="u-mk-ikon" aria-hidden>
            <BookOpen />
          </span>
          <div className="u-profil-id">
            <h3>{mk.nama_mk}</h3>
            <p>
              <Mono>{mk.kode_mk}</Mono>
              {mk.nama_mk_en && <span>{mk.nama_mk_en}</span>}
            </p>
            <div className="u-profil-tags">
              <Badge variant={mk.sifat === 'P' ? 'neutral' : 'primary'}>{mk.sifat === 'P' ? 'Pilihan' : 'Wajib'}</Badge>
              {mk.jenis_mk && <Badge variant="outline">{mk.jenis_mk}</Badge>}
            </div>
          </div>
        </div>
        <dl className="u-profil-angka">
          <div>
            <dt>SKS</dt>
            <dd>{mk.sks_mk ?? mk.sks ?? '–'}</dd>
          </div>
          <div>
            <dt>Semester</dt>
            <dd>{mk.semester ?? '–'}</dd>
          </div>
          <div>
            <dt>Kelas dibuka</dt>
            <dd>{q.data ? kelas.length : '–'}</dd>
          </div>
          <div>
            <dt>Peserta</dt>
            <dd>{q.data ? formatNumber(kelas.reduce((s, k) => s + n(k.jumlah_peserta), 0)) : '–'}</dd>
          </div>
        </dl>
      </section>
      {(mk.prasyarat || mk.deskripsi) && (
        <DescriptionList
          items={[
            ...(mk.deskripsi ? [{ label: 'Deskripsi', value: mk.deskripsi }] : []),
            ...(mk.prasyarat ? [{ label: 'Prasyarat', value: Array.isArray(mk.prasyarat) ? mk.prasyarat.join(', ') : String(mk.prasyarat) }] : []),
          ]}
        />
      )}
      <section>
        <h4 className="u-detail-h">Kelas {tahunId ? labelTahunAkademik(tahunId) : 'periode aktif'}</h4>
        {q.error ? (
          <Galat q={q} />
        ) : muatDari(q) ? (
          <Skeleton style={{ height: 120 }} />
        ) : kelas.length ? (
          <ul className="u-kelas-mk">
            {kelas.map((k) => (
              <li key={k.idj}>
                <span className="u-kelas-mk-kelas">{k.kelas ?? '–'}</span>
                <span className="u-jadwal-mk">
                  <b>{k.dosen?.nama ?? 'Dosen belum ditentukan'}</b>
                  <small>
                    {k.hari ? `${HARI[k.hari] ?? k.hari}, ${k.jam_mulai ? String(k.jam_mulai).slice(0, 5) : `jam ke-${k.jam_ke}`}` : 'Jadwal belum diatur'} · {k.nama_ruang ?? k.ruang ?? 'ruang –'}
                  </small>
                </span>
                {k.kapasitas != null && (
                  <span className="u-kelas-mk-isi">
                    {n(k.jumlah_peserta)}/{k.kapasitas}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon={<CalendarDays />} title="Belum ada kelas dibuka" />
        )}
      </section>
    </div>
  );
}
export function SheetDetailMataKuliah({ mk, open, onOpenChange }: { mk: Row | null | undefined; open?: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open ?? !!mk} onOpenChange={onOpenChange} title="Detail mata kuliah" size="lg" className="u-sheet-detail">
      {mk && <DetailMataKuliah mk={mk} />}
    </Sheet>
  );
}
