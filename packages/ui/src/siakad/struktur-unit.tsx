'use client';
import * as React from 'react';
import { AlarmClock, Briefcase, Eye, FileText, Network, UserRoundCheck, UsersRound } from 'lucide-react';
import { Alert, Avatar, Tabs, Empty } from '../components/display';
import { Badge, Skeleton } from '../components/actions';
import { Select } from '../components/select';
import { DataTable, type DataColumn } from '../components/data-table';
import { BaganOrganisasi, type UnitBagan } from '../components/bagan-organisasi';
import { pesanGalat, useSiakadQuery } from './provider';
import { useLapisanOrmawa } from './ormawa';

// ================================================================ Struktur organisasi unit (lihat saja)

/**
 * Halaman "Struktur organisasi" LIHAT SAJA untuk aplikasi unit (BAAK, Keuangan/BAUK, LP2M, SPMI/LPM, Humas, PMB,
 * Tracer/Pusat Karier, Pustikom, Dashboard = seluruh universitas): bagan unit pemilik aplikasi dan sub-unitnya (pejabat +
 * tendik), daftar pejabat (jabatan, SK, masa, status), tendik per unit, dan struktur jabatan unit terpilih. Tanpa tombol
 * tambah/ubah/hapus: penetapan pejabat dilakukan Biro SDM (aplikasi SDM) dan Pustikom.
 *
 * Data: `GET /v1/induk/organisasi/unit-aplikasi/{aplikasi}` (izin masuk aplikasi itu; unit lain 403). BFF aplikasi perlu
 * meneruskan `/v1/induk/organisasi/unit-aplikasi`.
 *
 *   <StrukturUnit aplikasi="baak" />
 */

interface PejabatRingkas { id: number | null; nama: string; plt: boolean; plh: boolean; mulai?: string | null; selesai?: string | null; idkp?: string | null }

interface UnitData {
  id: number;
  induk_id: number | null;
  kode: string;
  jenis: string;
  nama: string;
  singkatan: string | null;
  aktif: boolean;
  koordinasi: boolean;
  hubungan?: 'lini' | 'staf' | 'koordinasi';
  nama_kampus?: string | null;
  kampus?: string[];
  jabatan: { jabatan_id: number | null; kode: string; jabatan: string; pejabat: PejabatRingkas | null }[];
  tendik?: { sumber: string; nama: string; nip: string | null; tugas: string | null; peran?: string[] }[];
}

interface PejabatData {
  id: number;
  unit_id: number;
  unit: string;
  jabatan: string;
  nama: string;
  nidn: string | null;
  nip: string | null;
  nomor_sk: string | null;
  tanggal_sk: string | null;
  mulai: string;
  selesai: string | null;
  plt: boolean;
  plh: boolean;
  status: 'aktif' | 'akan_datang' | 'berakhir' | 'nonaktif';
  sisa_hari: number | null;
  sk: { id: string; nomor: string; tanggal?: string | null } | null;
}

interface JabatanUnit { jabatan_id: number; kode: string; label: string; opsional: boolean; tersedia: boolean; pejabat: PejabatRingkas[] }

export interface StrukturUnitData {
  aplikasi: string;
  akar: { id: number; kode: string; nama: string; jenis: string; singkatan?: string | null };
  unit: UnitData[];
  pejabat: PejabatData[];
  fokus: { id: number; nama: string; jenis: string; jabatan: JabatanUnit[] };
  catatan: string;
}

export interface StrukturUnitProps {
  /** Kode aplikasi unit: baak, keuangan, lp2m, spmi, humas, pmb, tracer, pustikom, dashboard. */
  aplikasi: string;
  /** Judul bagan untuk unduhan (bawaan "Struktur <nama unit>"). */
  judul?: string;
  /** Tinggi area bagan. */
  tinggiBagan?: number | string;
}

type Tab = 'bagan' | 'pejabat' | 'tendik' | 'jabatan';

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const tgl = (v?: string | null) => {
  if (!v) return '–';
  const [y, m, d] = v.slice(0, 10).split('-').map(Number);
  return y && m && d ? `${d} ${BULAN[m - 1]} ${y}` : v;
};
const LABEL_STATUS: Record<PejabatData['status'], string> = { aktif: 'Aktif', akan_datang: 'Akan datang', berakhir: 'Berakhir', nonaktif: 'Nonaktif' };

export function StrukturUnit({ aplikasi, judul, tinggiBagan = 620 }: StrukturUnitProps) {
  const [tab, setTab] = React.useState<Tab>('bagan');
  const [unit, setUnit] = React.useState<number | null>(null);
  const q = useSiakadQuery<StrukturUnitData>(['organisasi', 'unit-aplikasi', aplikasi, unit], (s, signal) =>
    s.request<StrukturUnitData>({ method: 'GET', path: `/v1/induk/organisasi/unit-aplikasi/${aplikasi}`, query: unit ? { unit } : {} }, { signal }), { staleTime: 120_000 });
  const d = q.data;
  // Lapisan organisasi mahasiswa (bila pengguna berhak melihatnya): tombol "Tampilkan organisasi mahasiswa" di bagan.
  const ormawa = useLapisanOrmawa();

  const bagan = React.useMemo<UnitBagan[]>(() => (d?.unit ?? []).map((u) => ({
    id: String(u.id),
    induk_id: u.induk_id ? String(u.induk_id) : null,
    nama: u.nama,
    singkatan: u.singkatan,
    jenis: u.jenis,
    garis: u.hubungan ?? (u.koordinasi ? 'koordinasi' : 'lini'),
    aktif: u.aktif,
    bingkai: u.jenis === 'kampus' ? { label: `Kampus pengembangan · ${u.nama_kampus ?? u.nama}` } : null,
    jabatan: u.jabatan.map((j) => ({ jabatan: j.jabatan, nama: j.pejabat?.nama ?? null, status: j.pejabat?.plt ? 'plt' : j.pejabat?.plh ? 'plh' : null })),
    staf: (u.tendik ?? []).map((t) => ({ nama: t.nama, tugas: t.tugas })),
  })), [d]);

  if (q.loading && !d) return <Skeleton style={{ height: 480, borderRadius: 'var(--u-radius-xl)' }} />;
  if (q.error || !d) return <Alert variant="warning">{q.error ? pesanGalat(q.error) : 'Struktur organisasi belum bisa dimuat.'}</Alert>;

  const aktif = d.pejabat.filter((p) => p.status === 'aktif');
  const segera = aktif.filter((p) => p.sisa_hari !== null && p.sisa_hari <= 30);
  const kolom: DataColumn<PejabatData>[] = [
    {
      key: 'nama', header: 'Pejabat', mobile: 'title', sortable: true, value: (p) => p.nama,
      cell: (p) => (
        <span className="u-su-orang">
          <Avatar name={p.nama} size="sm" />
          <span><b>{p.plt ? 'Plt. ' : p.plh ? 'Plh. ' : ''}{p.nama}</b><small>{p.nip ? `NIP ${p.nip}` : p.nidn ? `NIDN ${p.nidn}` : ''}</small></span>
        </span>
      ),
    },
    { key: 'jabatan', header: 'Jabatan', sortable: true, value: (p) => p.jabatan, cell: (p) => <span className="u-su-dua"><b>{p.jabatan}</b><small>{p.unit}</small></span> },
    {
      key: 'sk', header: 'SK', value: (p) => p.sk?.nomor ?? p.nomor_sk ?? '',
      cell: (p) => (p.sk || p.nomor_sk ? <span className="u-su-dua"><span className="u-su-sk"><FileText aria-hidden />{p.sk?.nomor ?? p.nomor_sk}</span><small>{tgl(p.sk?.tanggal ?? p.tanggal_sk)}</small></span> : <Badge variant="warning">Belum ada SK</Badge>),
    },
    { key: 'masa', header: 'Masa jabatan', mobile: 'meta', sortable: true, value: (p) => p.mulai, cell: (p) => `${tgl(p.mulai)} – ${p.selesai ? tgl(p.selesai) : 'sekarang'}` },
    {
      key: 'status', header: 'Status', mobile: 'badge', value: (p) => p.status,
      cell: (p) => (p.status === 'aktif' && p.sisa_hari !== null && p.sisa_hari <= 30
        ? <Badge variant="warning"><AlarmClock />{p.sisa_hari} hari lagi</Badge>
        : <Badge variant={p.status === 'aktif' ? 'success' : p.status === 'akan_datang' ? 'info' : 'neutral'}>{LABEL_STATUS[p.status]}</Badge>),
    },
  ];
  const tendik = d.unit.filter((u) => u.tendik?.length);
  const opsiUnit = d.unit.map((u) => ({ value: String(u.id), label: u.nama, description: u.jenis }));

  return (
    <div className="u-su">
      <Alert variant="info" icon={<Eye />}>{d.catatan}</Alert>
      {segera.length > 0 && (
        <Alert variant="warning" icon={<AlarmClock />} title={`${segera.length} masa SK berakhir dalam 30 hari`}>
          {segera.map((p) => `${p.jabatan} ${p.unit} (${p.nama}, ${tgl(p.selesai)})`).join('; ')}.
        </Alert>
      )}
      <Tabs<Tab>
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'bagan', label: 'Bagan', icon: <Network /> },
          { value: 'pejabat', label: 'Pejabat', icon: <UserRoundCheck />, count: aktif.length },
          { value: 'tendik', label: 'Tendik & staf', icon: <UsersRound />, count: tendik.reduce((n, u) => n + (u.tendik?.length ?? 0), 0) },
          { value: 'jabatan', label: 'Struktur jabatan', icon: <Briefcase /> },
        ]}
      />
      {tab === 'bagan' && (
        <BaganOrganisasi data={bagan} lapisan={ormawa ? [ormawa] : undefined} akar={String(d.akar.id)} rinci buka={4} tinggi={tinggiBagan} judulBerkas={judul ?? `Struktur ${d.akar.nama}`} subjudul={`${bagan.length} unit`} namaBerkas={`struktur-${d.akar.kode.toLowerCase()}`} gantiRinci />
      )}
      {tab === 'pejabat' && (
        <DataTable<PejabatData> columns={kolom} rows={d.pejabat} rowKey={(p) => String(p.id)} defaultDensity="compact" defaultSort={{ key: 'jabatan', dir: 'asc' }} exportCsv={`pejabat-${d.akar.kode.toLowerCase()}`}
          empty={{ icon: <UserRoundCheck />, title: 'Belum ada pejabat tercatat', description: 'Pejabat ditetapkan Biro SDM (aplikasi SDM) dengan SK dari registri.' }} />
      )}
      {tab === 'tendik' && (!tendik.length ? (
        <Empty icon={<UsersRound />} title="Belum ada tendik tercatat" description="Data tendik dikelola di aplikasi SDM (unit kerja pegawai)." />
      ) : (
        <div className="u-su-grup">
          {tendik.map((u) => (
            <section key={u.id}>
              <h4>{u.nama}</h4>
              <ul>
                {(u.tendik ?? []).map((t, i) => (
                  <li key={i}><Avatar name={t.nama} size="sm" /><span><b>{t.nama}</b><small>{[t.tugas ?? 'Tenaga kependidikan', t.nip && `NIP ${t.nip}`].filter(Boolean).join(' · ')}</small></span></li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ))}
      {tab === 'jabatan' && (
        <div className="u-su">
          {opsiUnit.length > 1 && (
            <div style={{ maxWidth: '22rem' }}>
              <Select<string> aria-label="Unit" value={String(d.fokus.id)} onValueChange={(v) => setUnit(v ? Number(v) : null)} options={opsiUnit} />
            </div>
          )}
          <ul className="u-su-jabatan">
            {d.fokus.jabatan.filter((j) => j.tersedia || j.pejabat.length).map((j) => (
              <li key={j.jabatan_id}>
                <div><b>{j.label}</b>{j.opsional && <Badge variant="outline">Opsional</Badge>}</div>
                {j.pejabat.length ? j.pejabat.map((p, i) => (
                  <span key={i} className="u-su-orang"><Avatar name={p.nama} size="sm" /><span><b>{p.plt ? 'Plt. ' : p.plh ? 'Plh. ' : ''}{p.nama}</b><small>{tgl(p.mulai)} – {p.selesai ? tgl(p.selesai) : 'sekarang'}</small></span></span>
                )) : <em>Belum diisi</em>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
