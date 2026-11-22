'use client';
import * as React from 'react';
import { AlertTriangle, ArrowRight, CalendarCheck2, CalendarClock, CheckCircle2, DoorOpen, MapPin, RefreshCw, Shuffle, Sparkles, UserRound, Users, Wand2 } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton, type BadgeVariant } from '../components/actions';
import { Alert, Empty, Tabs } from '../components/display';
import { Checkbox, CheckboxGroup, Field, SegmentedControl } from '../components/forms';
import { Select } from '../components/select';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { IsianAngka, IsianJam } from '../components/isian-angka';
import { keAngka } from '../lib/angka';
import { Tekan } from '../components/tekan';

/*
 * Cek bentrok dan jadwal otomatis (API SIAKAD /v1/akademik/jadwal/... atau /v1/fakultas/{kode}/jadwal/...).
 *
 * - PanelBentrokJadwal: daftar bentrok (ruang, dosen, rombongan kelas, mahasiswa KRS) lintas prodi dan peringatan
 *   kampus 1/2 (pindah kampus terlalu mepet, ruang di kampus lain), dikelompokkan per hari.
 * - HasilCekJadwal + useCekJadwal: cek langsung saat mengisi formulir tambah/ubah jadwal.
 * - PenyusunJadwalOtomatis: atur -> pratinjau (pilih usulan) -> simpan. Server tidak menyimpan apa pun sebelum
 *   pengguna menekan "Simpan".
 *
 * `sumber.fakultas` diisi = lewat API dasbor fakultas (izin fakultas.jadwal.kelola); kosong = API akademik.
 */

// ================================================================ Tipe

export interface SumberJadwal {
  /** Kode fakultas: pakai /v1/fakultas/{kode}/jadwal/...; kosong = /v1/akademik/jadwal/... */
  fakultas?: string;
  prodi?: string;
  /** Periode, mis. "20261". Kosong = tahun aktif. */
  tahunId?: string;
}

export interface SesiJadwalRingkas {
  id: number | null;
  prodi: string;
  nama_prodi: string;
  kode_mk: string;
  nama_mk: string;
  semester: string;
  kelas: string;
  hari: string;
  jamke: number | null;
  mulai: string | null;
  sampai: string | null;
  ruang: string;
  /** idkp: "01" = kampus 1, "02" = kampus 2. */
  kampus: string;
  dosen: string[];
}

export type JenisTemuanJadwal = 'ruang' | 'dosen' | 'kelas' | 'mahasiswa' | 'pindah_kampus' | 'kampus_ruang' | 'waktu';

export interface TemuanJadwal {
  jenis: JenisTemuanJadwal;
  tingkat: 'bentrok' | 'peringatan';
  hari: string;
  nama_hari: string;
  pesan: string;
  a: SesiJadwalRingkas;
  b: SesiJadwalRingkas | null;
  detail: { nidn?: string; dosen?: string; jumlah_mahasiswa?: number; jeda_menit?: number } | null;
}

export interface LaporanBentrokJadwal {
  prodi: string;
  tahun_id: string;
  jeda_kampus: number;
  ringkasan: { jadwal: number; jadwal_bentrok: number; bentrok: number; peringatan: number; per_jenis: Partial<Record<JenisTemuanJadwal, number>> };
  id_bentrok: number[];
  data: TemuanJadwal[];
}

export interface HasilCekJadwalData {
  aman: boolean;
  jadwal: SesiJadwalRingkas;
  data: TemuanJadwal[];
}

/** Isian formulir jadwal yang dicek (sama dengan body tambah/ubah jadwal). */
export interface DrafJadwal {
  id?: number | null;
  kode_mk: string;
  kelas: string;
  ruang?: string;
  hari: string;
  jamke: string | number;
  nidn?: string;
  tim?: string[];
}

export interface UsulanJadwal {
  kunci: string;
  id: number | null;
  asal_id: number | null;
  kode_mk: string;
  nama_mk: string;
  sks: number;
  semester: string;
  kelas: string;
  nama_kelas: string;
  nidn: string;
  dosen: string;
  tim: Array<{ nidn: string; nama: string }>;
  kapasitas: number;
  hari: string;
  nama_hari: string;
  jamke: number;
  mulai: string;
  sampai: string;
  ruang: string;
  nama_ruang: string;
  kampus: string;
  asal: { hari: string; nama_hari: string; jamke: number | null; mulai: string | null; sampai: string | null; ruang: string };
  catatan: string[];
}

export interface OpsiJadwalOtomatis {
  sumber: 'periode' | 'bentrok';
  dari_tahun_id?: string;
  hari?: string[];
  kelas?: string[];
  jeda_kampus?: number;
  menit_per_sks?: number;
  batas_sore?: string;
}

export interface HasilJadwalOtomatis {
  prodi: string;
  tahun_id: string;
  opsi: OpsiJadwalOtomatis;
  ringkasan: { diminta: number; terjadwal: number; tidak_terjadwal: number };
  usulan: UsulanJadwal[];
  tidak_terjadwal: Array<{ asal_id: number | null; kode_mk: string; nama_mk: string; sks: number; semester: string; kelas: string; nidn: string; dosen: string; alasan: string }>;
}

export interface HasilSimpanJadwalOtomatis {
  tersimpan: Array<{ urut: number; kunci: string | null; id: number }>;
  gagal: Array<{ urut: number; kunci: string | null; pesan: string }>;
}

// ================================================================ Label

export const HARI_KULIAH: Array<{ value: string; label: string }> = [
  { value: '1', label: 'Senin' },
  { value: '2', label: 'Selasa' },
  { value: '3', label: 'Rabu' },
  { value: '4', label: 'Kamis' },
  { value: '5', label: 'Jumat' },
  { value: '6', label: 'Sabtu' },
  { value: '7', label: 'Minggu' },
];

/** "01" -> "Kampus 1", "02" -> "Kampus 2". */
export function labelKampus(kampus?: string | null): string {
  if (!kampus) return '';
  const n = Number(kampus);
  return Number.isFinite(n) && n > 0 ? `Kampus ${n}` : `Kampus ${kampus}`;
}

const JENIS: Record<JenisTemuanJadwal, { label: string; ikon: React.ReactNode }> = {
  ruang: { label: 'Ruang', ikon: <DoorOpen /> },
  dosen: { label: 'Dosen', ikon: <UserRound /> },
  kelas: { label: 'Rombongan kelas', ikon: <Users /> },
  mahasiswa: { label: 'Mahasiswa (KRS)', ikon: <Users /> },
  pindah_kampus: { label: 'Pindah kampus', ikon: <MapPin /> },
  kampus_ruang: { label: 'Ruang kampus lain', ikon: <MapPin /> },
  waktu: { label: 'Jam tidak dikenal', ikon: <CalendarClock /> },
};
export const labelJenisTemuanJadwal = (j: JenisTemuanJadwal) => JENIS[j]?.label ?? j;

// ================================================================ Akses API

function jalur(s: SumberJadwal, akhir: string): string {
  return s.fakultas ? `/v1/fakultas/${encodeURIComponent(s.fakultas)}/jadwal/${akhir}` : `/v1/akademik/jadwal/${akhir}`;
}
function kueri(s: SumberJadwal): Record<string, string> {
  const q: Record<string, string> = {};
  if (s.prodi) q.prodi = s.prodi;
  if (s.tahunId) q.tahun_id = s.tahunId;
  return q;
}

/** GET .../jadwal/bentrok. Disegarkan otomatis setelah jadwal berubah (invalidateSiakad('jadwal')). */
export function useBentrokJadwal(sumber: SumberJadwal, opsi: { jedaKampus?: number; enabled?: boolean } = {}) {
  const { jedaKampus, enabled = true } = opsi;
  return useSiakadQuery<LaporanBentrokJadwal>(
    ['jadwal', 'bentrok', sumber.fakultas ?? '', sumber.prodi ?? '', sumber.tahunId ?? '', jedaKampus ?? ''],
    (s, signal) =>
      s.request({ method: 'GET', path: jalur(sumber, 'bentrok'), query: { ...kueri(sumber), ...(jedaKampus !== undefined ? { jeda_kampus: jedaKampus } : {}) } }, { signal }) as never,
    { staleTime: 15_000, enabled },
  );
}

/**
 * Cek satu jadwal sebelum disimpan (POST .../jadwal/cek), ditunda sampai isian berhenti berubah. `draf` null atau
 * belum lengkap (mata kuliah, kelas, hari, jam) = tidak dicek.
 */
export function useCekJadwal(sumber: SumberJadwal, draf: DrafJadwal | null, opsi: { tunda?: number; jedaKampus?: number } = {}) {
  const siakad = useSiakad();
  const { tunda = 400, jedaKampus } = opsi;
  const lengkap = !!draf && !!draf.kode_mk && !!draf.kelas && !!draf.hari && draf.jamke !== '' && draf.jamke !== undefined;
  const kunci = lengkap ? JSON.stringify([sumber, draf, jedaKampus]) : '';
  const [state, setState] = React.useState<{ hasil: HasilCekJadwalData | null; memuat: boolean; galat: string | null }>({ hasil: null, memuat: false, galat: null });
  React.useEffect(() => {
    if (!kunci || !draf) {
      setState({ hasil: null, memuat: false, galat: null });
      return;
    }
    const ac = new AbortController();
    setState((x) => ({ ...x, memuat: true, galat: null }));
    const t = setTimeout(() => {
      siakad
        .request({ method: 'POST', path: jalur(sumber, 'cek'), query: kueri(sumber), body: { ...draf, ...kueri(sumber), ...(jedaKampus !== undefined ? { jeda_kampus: jedaKampus } : {}) } }, { signal: ac.signal })
        .then((r) => setState({ hasil: (r as { data: HasilCekJadwalData }).data, memuat: false, galat: null }))
        .catch((e) => {
          if (!ac.signal.aborted) setState({ hasil: null, memuat: false, galat: pesanGalat(e) });
        });
    }, tunda);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunci, siakad, tunda]);
  return state;
}

// ================================================================ Tampilan temuan

function waktu(s: SesiJadwalRingkas | null | undefined) {
  if (!s) return '';
  return s.mulai ? `${s.mulai}${s.sampai ? `–${s.sampai}` : ''}` : s.jamke !== null ? `jam ${s.jamke}` : '';
}

function SesiTemuan({ s, prodi, sorot }: { s: SesiJadwalRingkas; prodi?: string; sorot?: boolean }) {
  const prodiLain = !!prodi && s.prodi !== prodi;
  return (
    <div className="u-jb-sesi" data-sorot={sorot || undefined}>
      <p className="u-jb-sesi-mk">
        <strong>{s.nama_mk || s.kode_mk}</strong>
        <span>
          {s.kode_mk} · Smt {s.semester || '–'} · Kelas {s.kelas}
        </span>
      </p>
      <p className="u-jb-sesi-meta">
        <span>{waktu(s)}</span>
        {s.ruang && <span>Ruang {s.ruang}</span>}
        {s.kampus && <span>{labelKampus(s.kampus)}</span>}
        {s.dosen.length > 0 && <span className="u-jb-sesi-dosen">{s.dosen.join(', ')}</span>}
      </p>
      {prodiLain && (
        <Badge variant="info">
          {s.nama_prodi || s.prodi}
        </Badge>
      )}
    </div>
  );
}

/** Satu temuan: jenis, pesan, dan dua jadwal yang bertabrakan berdampingan. */
export function KartuTemuanJadwal({ temuan: t, prodi, onPilih, className }: { temuan: TemuanJadwal; prodi?: string; onPilih?: (s: SesiJadwalRingkas) => void; className?: string }) {
  const j = JENIS[t.jenis];
  const pilih = (s: SesiJadwalRingkas) => (onPilih && s.id !== null && (!prodi || s.prodi === prodi) ? () => onPilih(s) : undefined);
  const Bagian = ({ s }: { s: SesiJadwalRingkas }) => {
    const klik = pilih(s);
    return klik ? (
      <Tekan className="u-jb-sesi-tombol" onClick={klik} title="Buka jadwal ini">
        <SesiTemuan s={s} prodi={prodi} />
      </Tekan>
    ) : (
      <SesiTemuan s={s} prodi={prodi} />
    );
  };
  return (
    <li className={cn('u-jb-temuan', className)} data-tingkat={t.tingkat}>
      <div className="u-jb-temuan-kepala">
        <Badge variant={t.tingkat === "bentrok" ? "danger" : "warning"}>
          {j?.ikon}
          {j?.label ?? t.jenis}
        </Badge>
        <span className="u-jb-temuan-pesan">{t.pesan}</span>
      </div>
      <div className="u-jb-temuan-isi" data-dua={t.b ? '' : undefined}>
        <Bagian s={t.a} />
        {t.b && (
          <>
            <span className="u-jb-temuan-vs" aria-hidden>
              {t.jenis === 'pindah_kampus' ? <ArrowRight /> : <Shuffle />}
            </span>
            <Bagian s={t.b} />
          </>
        )}
      </div>
    </li>
  );
}

/** Daftar temuan dikelompokkan per hari. */
export function DaftarTemuanJadwal({ data, prodi, onPilih, kosong, className }: { data: TemuanJadwal[]; prodi?: string; onPilih?: (s: SesiJadwalRingkas) => void; kosong?: React.ReactNode; className?: string }) {
  const kelompok = React.useMemo(() => {
    const m = new Map<string, { nama: string; isi: TemuanJadwal[] }>();
    for (const t of data) {
      const k = t.hari || '-';
      if (!m.has(k)) m.set(k, { nama: t.nama_hari || 'Tanpa hari', isi: [] });
      m.get(k)!.isi.push(t);
    }
    return [...m.entries()].sort(([a], [b]) => Number(a) - Number(b));
  }, [data]);
  if (!data.length) return <>{kosong ?? null}</>;
  return (
    <div className={cn('u-jb-daftar', className)}>
      {kelompok.map(([k, g]) => (
        <section key={k} className="u-jb-hari">
          <h4>
            {g.nama} <span>{g.isi.length}</span>
          </h4>
          <ul>
            {g.isi.map((t, i) => (
              <KartuTemuanJadwal key={`${t.jenis}-${t.a.id ?? 'd'}-${t.b?.id ?? ''}-${i}`} temuan={t} prodi={prodi} onPilih={onPilih} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ================================================================ Panel bentrok

export interface PanelBentrokJadwalProps {
  sumber: SumberJadwal;
  /** Menit minimal dosen/rombongan pindah kampus 1 <-> 2. Bawaan 30. */
  jedaKampus?: number;
  onJedaKampusChange?: (menit: number) => void;
  /** Klik jadwal milik prodi ini (mis. buka formulir ubah). */
  onPilihJadwal?: (s: SesiJadwalRingkas) => void;
  /** Tombol "Perbaiki otomatis" (mis. buka PenyusunJadwalOtomatis sumber bentrok). */
  onPerbaiki?: () => void;
  className?: string;
}

/** Cek bentrok jadwal prodi terhadap semua prodi + peringatan kampus 1/2. */
export function PanelBentrokJadwal({ sumber, jedaKampus: jedaProp, onJedaKampusChange, onPilihJadwal, onPerbaiki, className }: PanelBentrokJadwalProps) {
  const [jedaDalam, setJedaDalam] = React.useState(jedaProp ?? 30);
  const jeda = jedaProp ?? jedaDalam;
  const q = useBentrokJadwal(sumber, { jedaKampus: jeda, enabled: !!sumber.prodi || !sumber.fakultas });
  const [tab, setTab] = React.useState<'semua' | 'bentrok' | 'peringatan'>('semua');
  const d = q.data;
  const data = (d?.data ?? []).filter((t) => tab === 'semua' || t.tingkat === tab);
  const gantiJeda = (v: string) => {
    const n = Number(v);
    setJedaDalam(n);
    onJedaKampusChange?.(n);
  };

  return (
    <div className={cn('u-jb', className)}>
      <div className="u-jb-ringkas">
        {q.loading && !d ? (
          <Skeleton height={64} />
        ) : d ? (
          <>
            <div className="u-jb-status" data-aman={d.ringkasan.bentrok === 0 || undefined}>
              {d.ringkasan.bentrok === 0 ? <CheckCircle2 /> : <AlertTriangle />}
              <div>
                <strong>{d.ringkasan.bentrok === 0 ? 'Tidak ada jadwal yang bentrok' : `${d.ringkasan.bentrok} bentrok di ${d.ringkasan.jadwal_bentrok} dari ${d.ringkasan.jadwal} jadwal`}</strong>
                <span>
                  Diperiksa terhadap jadwal semua prodi di kampus 1 dan 2
                  {d.ringkasan.peringatan > 0 ? ` · ${d.ringkasan.peringatan} peringatan` : ''}
                </span>
              </div>
            </div>
            <div className="u-jb-alat">
              <Field label="Jeda pindah kampus" className="u-jb-jeda">
                <Select
                  value={String(jeda)}
                  onValueChange={(v) => gantiJeda(String(v))}
                  options={[0, 15, 30, 45, 60, 90].map((m) => ({ value: String(m), label: m === 0 ? 'Tidak diperiksa' : `${m} menit` }))}
                  size="sm"
                />
              </Field>
              <Button variant="outline" size="sm" onClick={() => q.refetch()} loading={q.loading} aria-label="Periksa ulang">
                <RefreshCw />
                Periksa ulang
              </Button>
              {onPerbaiki && d.ringkasan.bentrok > 0 && (
                <Button size="sm" onClick={onPerbaiki}>
                  <Wand2 />
                  Perbaiki otomatis
                </Button>
              )}
            </div>
          </>
        ) : null}
      </div>
      {q.error && <Alert variant="danger">{pesanGalat(q.error)}</Alert>}
      {d && d.data.length > 0 && (
        <Tabs
          variant="pill"
          value={tab}
          onValueChange={setTab}
          items={[
            { value: 'semua', label: 'Semua', count: d.data.length },
            { value: 'bentrok', label: 'Bentrok', count: d.ringkasan.bentrok },
            { value: 'peringatan', label: 'Peringatan', count: d.ringkasan.peringatan },
          ]}
        />
      )}
      {d && (
        <DaftarTemuanJadwal
          data={data}
          prodi={d.prodi}
          onPilih={onPilihJadwal}
          kosong={<Empty icon={<CalendarCheck2 />} title={tab === 'peringatan' ? 'Tidak ada peringatan' : 'Jadwal aman'} description="Tidak ada ruang, dosen, rombongan kelas, atau mahasiswa yang terjadwal dua kali pada jam yang sama." bordered />}
        />
      )}
    </div>
  );
}

/** Hasil cek satu jadwal di formulir (pakai bersama useCekJadwal). */
export function HasilCekJadwal({ hasil, memuat, galat, className }: { hasil: HasilCekJadwalData | null; memuat?: boolean; galat?: string | null; className?: string }) {
  if (galat) return <Alert variant="danger" className={className}>{galat}</Alert>;
  if (!hasil) return memuat ? <p className={cn('u-jb-cek-memuat', className)}>Memeriksa bentrok…</p> : null;
  const bentrok = hasil.data.filter((t) => t.tingkat === 'bentrok');
  const peringatan = hasil.data.filter((t) => t.tingkat === 'peringatan');
  return (
    <div className={cn('u-jb-cek', className)} data-memuat={memuat || undefined}>
      {hasil.aman ? (
        <Alert variant={peringatan.length ? 'warning' : 'success'} title={peringatan.length ? 'Tidak bentrok, ada peringatan' : 'Tidak bentrok'}>
          {peringatan.length ? null : `${hasil.jadwal.mulai ?? ''}${hasil.jadwal.sampai ? `–${hasil.jadwal.sampai}` : ''} bebas untuk ruang, dosen, dan rombongan kelas ini di semua prodi.`}
        </Alert>
      ) : (
        <Alert variant="danger" title={`${bentrok.length} bentrok`}>
          Pilih hari, jam, ruang, atau dosen lain.
        </Alert>
      )}
      {hasil.data.length > 0 && (
        <ul className="u-jb-cek-daftar">
          {hasil.data.map((t, i) => (
            <KartuTemuanJadwal key={i} temuan={t} prodi={hasil.jadwal.prodi} />
          ))}
        </ul>
      )}
    </div>
  );
}

// ================================================================ Penyusun otomatis

export interface PenyusunJadwalOtomatisProps {
  sumber: SumberJadwal;
  /** Periode sumber untuk "dari periode lain" (value = tahun_id). */
  periode?: Array<{ value: string; label: string }>;
  /** Kelas/rombongan prodi (value = kode kelas, description mis. "Kampus 2"). */
  kelas?: Array<{ value: string; label: string; description?: string }>;
  /** Isian awal, mis. { sumber: 'bentrok' } dari tombol "Perbaiki otomatis". */
  awal?: Partial<OpsiJadwalOtomatis>;
  /** Setelah tersimpan (mis. tutup panel dan segarkan tabel). */
  onSelesai?: (hasil: HasilSimpanJadwalOtomatis) => void;
  onBatal?: () => void;
  className?: string;
}

/**
 * Susun jadwal otomatis tanpa bentrok: atur sumber dan batasan, lihat pratinjau (centang usulan yang disetujui),
 * lalu simpan. Pratinjau tidak mengubah data apa pun.
 */
export function PenyusunJadwalOtomatis({ sumber, periode = [], kelas = [], awal, onSelesai, onBatal, className }: PenyusunJadwalOtomatisProps) {
  const siakad = useSiakad();
  const [opsi, setOpsi] = React.useState<OpsiJadwalOtomatis>(() => ({
    sumber: awal?.sumber ?? 'periode',
    dari_tahun_id: awal?.dari_tahun_id ?? periode.find((p) => sumber.tahunId && p.value.slice(4) === sumber.tahunId.slice(4))?.value ?? periode[0]?.value ?? '',
    hari: awal?.hari ?? ['1', '2', '3', '4', '5', '6'],
    kelas: awal?.kelas ?? [],
    jeda_kampus: awal?.jeda_kampus ?? 30,
    menit_per_sks: awal?.menit_per_sks ?? 50,
    batas_sore: awal?.batas_sore ?? '15:00',
  }));
  const [hasil, setHasil] = React.useState<HasilJadwalOtomatis | null>(null);
  const [pilih, setPilih] = React.useState<Set<string>>(new Set());
  const [simpan, setSimpan] = React.useState<HasilSimpanJadwalOtomatis | null>(null);
  const [sibuk, setSibuk] = React.useState<'susun' | 'simpan' | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const set = <K extends keyof OpsiJadwalOtomatis>(k: K, v: OpsiJadwalOtomatis[K]) => setOpsi((o) => ({ ...o, [k]: v }));

  const susun = async () => {
    setSibuk('susun');
    setGalat(null);
    setSimpan(null);
    try {
      const body = { ...opsi, ...kueri(sumber), dari_tahun_id: opsi.sumber === 'periode' ? opsi.dari_tahun_id : undefined };
      const r = (await siakad.request({ method: 'POST', path: jalur(sumber, 'otomatis'), query: kueri(sumber), body })) as { data: HasilJadwalOtomatis };
      setHasil(r.data);
      setPilih(new Set(r.data.usulan.map((u) => u.kunci)));
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSibuk(null);
    }
  };
  const simpanUsulan = async () => {
    if (!hasil) return;
    setSibuk('simpan');
    setGalat(null);
    try {
      const usulan = hasil.usulan.filter((u) => pilih.has(u.kunci));
      const r = (await siakad.request({ method: 'POST', path: jalur(sumber, 'otomatis/simpan'), query: kueri(sumber), body: { ...kueri(sumber), jeda_kampus: opsi.jeda_kampus, usulan } })) as { data: HasilSimpanJadwalOtomatis };
      setSimpan(r.data);
      invalidateSiakad('jadwal');
      onSelesai?.(r.data);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSibuk(null);
    }
  };

  // ---- langkah 3: hasil simpan
  if (simpan && hasil) {
    const gagal = new Map(simpan.gagal.map((g) => [g.kunci, g.pesan]));
    return (
      <div className={cn('u-jb u-jb-penyusun', className)}>
        <Alert variant={simpan.gagal.length ? 'warning' : 'success'} title={`${simpan.tersimpan.length} jadwal tersimpan${simpan.gagal.length ? `, ${simpan.gagal.length} dilewati` : ''}`}>
          {simpan.gagal.length ? 'Jadwal yang dilewati tidak diubah; alasannya di bawah.' : 'Semua usulan yang dipilih sudah masuk SIAKAD tanpa bentrok.'}
        </Alert>
        {simpan.gagal.length > 0 && (
          <ul className="u-jb-gagal">
            {hasil.usulan
              .filter((u) => gagal.has(u.kunci))
              .map((u) => (
                <li key={u.kunci}>
                  <strong>{u.nama_mk}</strong> · Kelas {u.kelas}
                  <span>{gagal.get(u.kunci)}</span>
                </li>
              ))}
          </ul>
        )}
        <div className="u-jb-kaki">
          <Button
            variant="outline"
            onClick={() => {
              setSimpan(null);
              setHasil(null);
            }}
          >
            Susun lagi
          </Button>
          {onBatal && <Button onClick={onBatal}>Selesai</Button>}
        </div>
      </div>
    );
  }

  // ---- langkah 2: pratinjau
  if (hasil) {
    const semua = hasil.usulan.length > 0 && pilih.size === hasil.usulan.length;
    const perHari = HARI_KULIAH.map((h) => ({ ...h, isi: hasil.usulan.filter((u) => u.hari === h.value) })).filter((h) => h.isi.length);
    return (
      <div className={cn('u-jb u-jb-penyusun', className)}>
        <div className="u-jb-status" data-aman={hasil.ringkasan.tidak_terjadwal === 0 || undefined}>
          <Sparkles />
          <div>
            <strong>
              {hasil.ringkasan.terjadwal} dari {hasil.ringkasan.diminta} jadwal mendapat tempat tanpa bentrok
            </strong>
            <span>Pratinjau, belum disimpan. Hapus centang usulan yang tidak ingin dipakai.</span>
          </div>
        </div>
        {galat && <Alert variant="danger">{galat}</Alert>}
        {hasil.usulan.length === 0 ? (
          <Empty icon={<CalendarCheck2 />} title={hasil.opsi.sumber === 'bentrok' ? 'Tidak ada jadwal yang perlu dipindah' : 'Semua jadwal periode sumber sudah ada'} bordered />
        ) : (
          <>
            <label className="u-jb-pilih-semua">
              <Checkbox checked={semua} indeterminate={pilih.size > 0 && !semua} onCheckedChange={(c) => setPilih(c ? new Set(hasil.usulan.map((u) => u.kunci)) : new Set())} />
              Pilih semua ({pilih.size}/{hasil.usulan.length})
            </label>
            <div className="u-jb-daftar">
              {perHari.map((h) => (
                <section key={h.value} className="u-jb-hari">
                  <h4>
                    {h.label} <span>{h.isi.length}</span>
                  </h4>
                  <ul>
                    {h.isi.map((u) => {
                      const pindah = hasil.opsi.sumber === 'bentrok';
                      return (
                        <li key={u.kunci} className="u-jb-usulan" data-dipilih={pilih.has(u.kunci) || undefined}>
                          <Checkbox
                            checked={pilih.has(u.kunci)}
                            onCheckedChange={(c) =>
                              setPilih((p) => {
                                const n = new Set(p);
                                if (c) n.add(u.kunci);
                                else n.delete(u.kunci);
                                return n;
                              })
                            }
                            aria-label={`Pakai usulan ${u.nama_mk} kelas ${u.kelas}`}
                          />
                          <div className="u-jb-usulan-isi">
                            <p className="u-jb-sesi-mk">
                              <strong>{u.nama_mk}</strong>
                              <span>
                                {u.kode_mk} · {u.sks} SKS · Smt {u.semester} · Kelas {u.kelas}
                                {u.nama_kelas && u.nama_kelas !== u.kelas ? ` (${u.nama_kelas})` : ''}
                              </span>
                            </p>
                            <p className="u-jb-sesi-meta">
                              <span className="u-jb-waktu-baru">
                                {u.mulai}–{u.sampai}
                              </span>
                              <span>
                                Ruang {u.ruang}
                                {u.nama_ruang ? ` (${u.nama_ruang})` : ''}
                              </span>
                              <Badge variant={u.kampus === '02' ? 'secondary' : 'neutral'}>
                                {labelKampus(u.kampus)}
                              </Badge>
                              <span className="u-jb-sesi-dosen">{u.dosen}{u.tim.length ? ` + ${u.tim.length} tim` : ''}</span>
                            </p>
                            {pindah && (u.asal.hari !== u.hari || u.asal.mulai !== u.mulai || u.asal.ruang !== u.ruang) && (
                              <p className="u-jb-asal">
                                Semula {u.asal.nama_hari} {u.asal.mulai ?? `jam ${u.asal.jamke ?? '?'}`} · Ruang {u.asal.ruang || '–'}
                              </p>
                            )}
                            {u.catatan.filter((c) => !c.startsWith('Dipindah') && !c.startsWith('Ruang')).map((c) => (
                              <p key={c} className="u-jb-catatan">
                                {c}
                              </p>
                            ))}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
        {hasil.tidak_terjadwal.length > 0 && (
          <div className="u-jb-tidak">
            <h4>Belum mendapat tempat ({hasil.tidak_terjadwal.length})</h4>
            <ul className="u-jb-gagal">
              {hasil.tidak_terjadwal.map((t, i) => (
                <li key={`${t.kode_mk}-${t.kelas}-${i}`}>
                  <strong>{t.nama_mk || t.kode_mk}</strong> · Kelas {t.kelas}
                  {t.dosen ? ` · ${t.dosen}` : ''}
                  <span>{t.alasan}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="u-jb-kaki">
          <Button variant="outline" onClick={() => setHasil(null)} disabled={sibuk === 'simpan'}>
            Ubah pengaturan
          </Button>
          <Button onClick={simpanUsulan} loading={sibuk === 'simpan'} disabled={pilih.size === 0}>
            <CalendarCheck2 />
            Simpan {pilih.size} jadwal
          </Button>
        </div>
      </div>
    );
  }

  // ---- langkah 1: atur
  return (
    <div className={cn('u-jb u-jb-penyusun', className)}>
      <Field label="Yang disusun">
        <SegmentedControl
          fullWidth
          value={opsi.sumber}
          onValueChange={(v) => set('sumber', v)}
          options={[
            { value: 'periode', label: 'Dari periode lain' },
            { value: 'bentrok', label: 'Pindahkan yang bentrok' },
          ]}
        />
      </Field>
      <p className="u-jb-bantuan">
        {opsi.sumber === 'periode'
          ? 'Mata kuliah, kelas, dosen, dan kapasitas diambil dari periode sumber yang belum ada di periode ini, lalu dicarikan hari, jam, dan ruang yang kosong.'
          : 'Jadwal prodi ini yang bentrok (atau dosennya tidak sempat pindah kampus) dipindah ke hari, jam, atau ruang yang kosong. Mahasiswa yang sudah KRS ikut dijaga agar tidak bentrok.'}
      </p>
      {opsi.sumber === 'periode' && (
        <Field label="Periode sumber" required>
          <Select value={opsi.dari_tahun_id ?? ''} onValueChange={(v) => set('dari_tahun_id', String(v))} options={periode} placeholder="Pilih periode" />
        </Field>
      )}
      <Field label="Hari kuliah">
        <CheckboxGroup orientation="horizontal" value={opsi.hari} onValueChange={(v) => set('hari', v)} options={HARI_KULIAH} />
      </Field>
      {kelas.length > 0 && (
        <Field label="Kelas" optional description="Kosongkan untuk semua kelas.">
          <CheckboxGroup orientation="horizontal" value={opsi.kelas} onValueChange={(v) => set('kelas', v)} options={kelas} />
        </Field>
      )}
      <div className="u-jb-grid">
        <Field label="Jeda pindah kampus" description="Menit minimal dosen berpindah kampus 1 dan 2.">
          <IsianAngka value={keAngka(opsi.jeda_kampus ?? 30)} min={0} max={240} onValueChange={(n) => set('jeda_kampus', n ?? 0)} />
        </Field>
        <Field label="Menit per SKS" description="Untuk memilih slot jam yang sesuai.">
          <IsianAngka value={keAngka(opsi.menit_per_sks ?? 50)} min={30} max={60} onValueChange={(n) => set('menit_per_sks', n ?? 0)} />
        </Field>
        <Field label="Kelas sore mulai" description="Kelas PAGI sebelum jam ini, SORE/MALAM sesudahnya.">
          <IsianJam value={opsi.batas_sore ?? '15:00'} onValueChange={(v) => set('batas_sore', v ?? '')} />
        </Field>
      </div>
      <Alert variant="info" icon={<MapPin />}>
        Ruang selalu dipilih di kampus kelasnya (kampus 1 atau 2), ruang lab hanya untuk mata kuliah yang sebelumnya di lab, dan tidak ada ruang, dosen, atau
        rombongan kelas yang bentrok dengan prodi mana pun.
      </Alert>
      {galat && <Alert variant="danger">{galat}</Alert>}
      <div className="u-jb-kaki">
        {onBatal && (
          <Button variant="outline" onClick={onBatal}>
            Batal
          </Button>
        )}
        <Button onClick={susun} loading={sibuk === 'susun'} disabled={(opsi.sumber === 'periode' && !opsi.dari_tahun_id) || !opsi.hari?.length}>
          <Wand2 />
          Buat pratinjau
        </Button>
      </div>
    </div>
  );
}

/** Varian badge untuk jumlah bentrok (mis. di judul tab). */
export const nadaBentrok = (n: number): BadgeVariant => (n > 0 ? 'danger' : 'success');
