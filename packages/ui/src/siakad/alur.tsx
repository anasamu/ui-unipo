'use client';
import * as React from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, GraduationCap, Megaphone, MessageSquare, Plus, Save, Search, Send, Trash2, XCircle } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Empty, Progress, Tabs } from '../components/display';
import { Checkbox, Field, Input, Textarea } from '../components/forms';
import { ConfirmDialog, Sheet } from '../components/overlays';
import { Select } from '../components/select';
import { labelTahunAkademik } from './akademik';
import { GalatApi } from './galat';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

const HARI: Record<string, string> = { '1': 'Senin', '2': 'Selasa', '3': 'Rabu', '4': 'Kamis', '5': 'Jumat', '6': 'Sabtu', '7': 'Minggu' };
const hari = (h?: string | number | null) => (h === null || h === undefined || h === '' ? '' : (HARI[String(h)] ?? String(h)));

// ================================================================ Ambil KRS (mahasiswa)

/** Satu kelas yang ditawarkan (GET /v1/mahasiswa/{nim}/krs/penawaran). */
export interface KelasPenawaran {
  idj: number;
  nama?: string;
  keterangan?: string;
  terpilih?: boolean;
  penuh?: boolean;
  kelas?: string;
  hari?: string;
  jamke?: number;
  ruang?: string;
  nidn?: string;
  kapasitas?: number;
}
export interface MkPenawaran {
  id: number;
  kode_mk: string;
  nama_mk: string;
  semester: number;
  sks: number;
  dosen?: string;
  sudah_diambil: boolean;
  bisa_dipilih: boolean;
  keterangan?: string;
  nilai_sebelumnya?: string;
  pilih_kelas: boolean;
  kelas: KelasPenawaran[];
}
export interface PenawaranKrs {
  nim: string;
  tahun_id: string;
  boleh_ambil: boolean;
  alasan?: string | null;
  mode?: string;
  batas_sks: number;
  ips_sebelumnya?: number | null;
  sks_terambil: number;
  mata_kuliah: MkPenawaran[];
  pesan?: string[];
}
type BarisKrs = { kode_mk?: string; nama_mk?: string; kelas?: string; [k: string]: unknown };
export interface HasilAmbilKrs {
  nim: string;
  tahun_id: string;
  batas_sks: number;
  melebihi_batas_sks: boolean;
  tersimpan: BarisKrs[];
  sudah_ada: BarisKrs[];
  kelas_belum_terpilih_atau_penuh: BarisKrs[];
  bentrok: BarisKrs[];
  sks_terambil: number;
  pesan: string[];
}

/** Pilihan KRS: id MK → idj kelas (null = belum pilih kelas). */
type Pilihan = Record<number, number | null>;

/** Jadwal bentrok di antara pilihan (hari + jam ke sama). Server tetap memeriksa ulang. */
export function bentrokKrs(mk: MkPenawaran[], pilih: Pilihan): Array<[MkPenawaran, MkPenawaran]> {
  const slot = new Map<string, MkPenawaran>();
  const out: Array<[MkPenawaran, MkPenawaran]> = [];
  for (const m of mk) {
    if (!(m.id in pilih)) continue;
    const k = m.kelas.find((x) => x.idj === pilih[m.id]) ?? (m.kelas.length === 1 ? m.kelas[0] : undefined);
    if (!k?.hari || !k.jamke) continue;
    const kunci = `${k.hari}-${k.jamke}`;
    const lain = slot.get(kunci);
    if (lain) out.push([lain, m]);
    else slot.set(kunci, m);
  }
  return out;
}

export interface AmbilKrsProps {
  nim: string;
  /** Setelah KRS tersimpan. */
  onTersimpan?: (h: HasilAmbilKrs) => void;
  className?: string;
}

/**
 * Formulir Ambil KRS mahasiswa: penawaran dari /krs/penawaran (pemeriksaan sama dengan halaman web: status, masa KRS,
 * pembayaran, batas SKS, prasyarat), pilih mata kuliah dan kelas, hitung SKS terhadap batas, peringatan jadwal
 * bentrok, lalu POST /v1/mahasiswa/{nim}/krs. Hasil server (tersimpan, penuh, bentrok) ditampilkan apa adanya.
 */
export function AmbilKrs({ nim, onTersimpan, className }: AmbilKrsProps) {
  const siakad = useSiakad();
  const q = useSiakadQuery<PenawaranKrs>(
    ['krs/penawaran', nim],
    (s, signal) => s.request<PenawaranKrs>({ method: 'GET', path: `/v1/mahasiswa/${encodeURIComponent(nim)}/krs/penawaran` }, { signal }),
    { staleTime: 0 },
  );
  const [pilih, setPilih] = React.useState<Pilihan>({});
  const [cari, setCari] = React.useState('');
  const [sibuk, setSibuk] = React.useState(false);
  const [hasil, setHasil] = React.useState<HasilAmbilKrs | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);

  const p = q.data;
  const mk = p?.mata_kuliah ?? [];
  const sksBaru = mk.filter((m) => m.id in pilih).reduce((s, m) => s + m.sks, 0);
  const total = (p?.sks_terambil ?? 0) + sksBaru;
  const lebih = p ? total > p.batas_sks : false;
  const belumKelas = mk.filter((m) => m.id in pilih && m.pilih_kelas && !pilih[m.id]);
  const bentrok = bentrokKrs(mk, pilih);
  const perSemester = React.useMemo(() => {
    const g = new Map<number, MkPenawaran[]>();
    mk.filter((m) => !cari || `${m.kode_mk} ${m.nama_mk}`.toLowerCase().includes(cari.toLowerCase())).forEach((m) => g.set(m.semester, [...(g.get(m.semester) ?? []), m]));
    return [...g.entries()].sort((a, b) => a[0] - b[0]);
  }, [mk, cari]);

  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  if (!p) return <Skeleton className={className} height={320} />;

  const simpan = async () => {
    setSibuk(true);
    setGalat(null);
    try {
      const r = await siakad.request<HasilAmbilKrs>({
        method: 'POST',
        path: `/v1/mahasiswa/${encodeURIComponent(nim)}/krs`,
        body: { mata_kuliah: Object.entries(pilih).map(([id, idj]) => (idj ? { id: Number(id), idj } : { id: Number(id) })) },
      });
      setHasil(r.data);
      setPilih({});
      invalidateSiakad('krs');
      q.refetch();
      onTersimpan?.(r.data);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div className={cn('u-alur', className)}>
      <div className="u-alur-kepala">
        <div>
          <p className="u-alur-judul">KRS {labelTahunAkademik(p.tahun_id)}</p>
          <p className="u-alur-meta">
            {p.ips_sebelumnya !== null && p.ips_sebelumnya !== undefined ? `IPS sebelumnya ${p.ips_sebelumnya.toFixed(2)} · ` : ''}batas {p.batas_sks} SKS
          </p>
        </div>
        <div className="u-alur-sks" data-lebih={lebih || undefined}>
          <span>
            <strong>{total}</strong> / {p.batas_sks} SKS
          </span>
          <Progress value={Math.min(total, p.batas_sks)} max={p.batas_sks} size="sm" tone={lebih ? 'danger' : total === p.batas_sks ? 'success' : undefined} />
        </div>
      </div>

      {!p.boleh_ambil && (
        <Alert variant="warning" title="KRS belum bisa diambil" icon={<AlertTriangle />}>
          {p.alasan || 'Periksa status, masa KRS, dan administrasi Anda.'}
          {p.pesan?.length ? (
            <ul className="u-alur-pesan">
              {p.pesan.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          ) : null}
        </Alert>
      )}
      {p.boleh_ambil && p.pesan?.length ? <Alert variant="info">{p.pesan.join(' ')}</Alert> : null}

      {hasil && <HasilKrs h={hasil} />}

      <div className="u-alur-cari">
        <Search aria-hidden />
        <input type="search" value={cari} placeholder="Cari kode atau nama mata kuliah" aria-label="Cari mata kuliah" onChange={(e) => setCari(e.target.value)} />
      </div>

      {perSemester.map(([sem, daftar]) => (
        <section key={sem} className="u-alur-grup">
          <h3 className="u-alur-grup-judul">Semester {sem}</h3>
          <ul className="u-alur-mk">
            {daftar.map((m) => {
              const dipilih = m.id in pilih;
              const nonaktif = !p.boleh_ambil || m.sudah_diambil || !m.bisa_dipilih;
              return (
                <li key={m.id} data-dipilih={dipilih || m.sudah_diambil || undefined} data-nonaktif={nonaktif || undefined}>
                  <label className="u-alur-mk-isi">
                    <Checkbox
                      checked={dipilih || m.sudah_diambil}
                      disabled={nonaktif}
                      onCheckedChange={(c) =>
                        setPilih((x) => {
                          const y = { ...x };
                          if (c) y[m.id] = m.kelas.find((k) => k.terpilih)?.idj ?? (m.kelas.length === 1 && !m.kelas[0].penuh ? m.kelas[0].idj : null);
                          else delete y[m.id];
                          return y;
                        })
                      }
                      aria-label={`Ambil ${m.nama_mk}`}
                    />
                    <span className="u-alur-mk-nama">
                      <strong>{m.nama_mk}</strong>
                      <span className="u-alur-meta">
                        {m.kode_mk} · {m.sks} SKS{m.dosen ? ` · ${m.dosen}` : ''}
                        {m.nilai_sebelumnya ? ` · nilai sebelumnya ${m.nilai_sebelumnya}` : ''}
                      </span>
                      {m.keterangan && !m.sudah_diambil && <span className="u-alur-ket">{m.keterangan}</span>}
                    </span>
                    {m.sudah_diambil && <Badge variant="success">Sudah diambil</Badge>}
                  </label>
                  {dipilih && m.pilih_kelas && (
                    <Select<number | null>
                      aria-label={`Kelas ${m.nama_mk}`}
                      className="u-alur-mk-kelas"
                      value={pilih[m.id] ?? null}
                      onValueChange={(v) => setPilih((x) => ({ ...x, [m.id]: v }))}
                      placeholder="Pilih kelas"
                      options={m.kelas.map((k) => ({
                        value: k.idj as number | null,
                        label: `${k.nama || k.kelas || k.idj}${k.hari ? ` · ${hari(k.hari)} jam ke-${k.jamke}` : ''}${k.ruang ? ` · ${k.ruang}` : ''}${k.penuh ? ' (penuh)' : k.kapasitas ? ` · kapasitas ${k.kapasitas}` : ''}`,
                        disabled: k.penuh,
                      }))}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {!perSemester.length && <Empty title="Tidak ada mata kuliah yang cocok" description="Ubah kata pencarian." />}

      <div className="u-alur-kaki">
        <div className="u-alur-kaki-info">
          {lebih && <span className="u-alur-peringatan">Melebihi batas {p.batas_sks} SKS; server akan menolak kelebihannya.</span>}
          {belumKelas.length > 0 && <span className="u-alur-peringatan">Pilih kelas untuk {belumKelas.map((m) => m.nama_mk).join(', ')}.</span>}
          {bentrok.map(([a, b]) => (
            <span key={`${a.id}-${b.id}`} className="u-alur-peringatan">
              Jadwal {a.nama_mk} bentrok dengan {b.nama_mk}.
            </span>
          ))}
          {galat && (
            <span className="u-alur-galat" role="alert">
              {galat}
            </span>
          )}
        </div>
        <Button onClick={simpan} loading={sibuk} disabled={!p.boleh_ambil || !Object.keys(pilih).length || belumKelas.length > 0}>
          <Save />
          Simpan KRS ({Object.keys(pilih).length} MK, {sksBaru} SKS)
        </Button>
      </div>
    </div>
  );
}

function HasilKrs({ h }: { h: HasilAmbilKrs }) {
  const daftar = (x: BarisKrs[]) => x.map((r) => r.nama_mk || r.kode_mk).join(', ');
  return (
    <Alert variant={h.tersimpan.length ? 'success' : 'warning'} title={h.tersimpan.length ? `${h.tersimpan.length} mata kuliah tersimpan` : 'Tidak ada mata kuliah baru yang tersimpan'}>
      <ul className="u-alur-pesan">
        <li>
          Total sekarang {h.sks_terambil} SKS dari batas {h.batas_sks}.
        </li>
        {h.sudah_ada.length > 0 && <li>Sudah ada sebelumnya: {daftar(h.sudah_ada)}.</li>}
        {h.kelas_belum_terpilih_atau_penuh.length > 0 && <li>Kelas belum dipilih atau penuh: {daftar(h.kelas_belum_terpilih_atau_penuh)}.</li>}
        {h.bentrok.length > 0 && <li>Bentrok jadwal: {daftar(h.bentrok)}.</li>}
        {h.melebihi_batas_sks && <li>Sebagian ditolak karena melebihi batas SKS.</li>}
        {h.pesan.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </Alert>
  );
}

// ================================================================ Persetujuan KRS (dosen PA, prodi)

export interface AntrianKrs {
  nim: string;
  nama: string;
  kode_prodi: string;
  angkatan: string;
  kelas?: string;
  nidn_pa?: string;
  nama_pa?: string;
  mk: number;
  sks: number;
  mk_disetujui: number;
  status: 'belum' | 'menunggu' | 'disetujui';
}
export interface DetailKrsPa {
  mahasiswa: { nim: string; nama: string; kode_prodi: string; nama_prodi?: string; angkatan: string; kelas?: string; status_aktif?: string; nama_pa?: string; hp?: string; email?: string };
  tahun_id: string;
  status: 'belum' | 'menunggu' | 'disetujui';
  perlu_persetujuan_pa: boolean;
  batas_sks: number | null;
  sks: number;
  krs: Array<{
    id: number;
    kode_mk: string;
    nama_mk?: string;
    sks: number;
    semester: number;
    kelas?: string;
    disetujui: boolean;
    hari?: string;
    jamke?: number;
    mulai?: string | null;
    sampai?: string | null;
    ruang?: string;
    nama_dosen?: string;
    nilai?: string | null;
    bisa_dihapus: boolean;
  }>;
  riwayat_ips: Array<{ tahun_id: string; sks: number; ips: number | null }>;
  pesan: Array<{ id: number; pesan: string; oleh: string; waktu: string; dari_mahasiswa: boolean }>;
}

const STATUS_KRS = { menunggu: { label: 'Menunggu', v: 'warning' }, belum: { label: 'Belum isi', v: 'neutral' }, disetujui: { label: 'Disetujui', v: 'success' } } as const;

export interface PersetujuanKrsProps {
  prodi?: string;
  tahunId?: string;
  className?: string;
}

/**
 * Antrian persetujuan KRS untuk dosen PA (mahasiswa bimbingannya) dan prodi: ringkasan belum/menunggu/disetujui,
 * cari, setujui banyak sekaligus, dan lembar detail (KRS + jadwal, batas SKS, riwayat IPS, hapus mata kuliah yang belum
 * bernilai, pesan konsultasi). Lewat /v1/akademik/krs/persetujuan.
 */
export function PersetujuanKrs({ prodi, tahunId, className }: PersetujuanKrsProps) {
  const siakad = useSiakad();
  const [status, setStatus] = React.useState<'menunggu' | 'belum' | 'disetujui'>('menunggu');
  const [cari, setCari] = React.useState('');
  const [hal, setHal] = React.useState(1);
  const [tandai, setTandai] = React.useState<string[]>([]);
  const [buka, setBuka] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<{ v: 'success' | 'danger'; t: string } | null>(null);
  const q = useSiakadQuery<AntrianKrs[]>(['krs/persetujuan', prodi ?? '', tahunId ?? '', status, cari, hal], (s, signal) =>
    s.request<AntrianKrs[]>({ method: 'GET', path: '/v1/akademik/krs/persetujuan', query: { prodi, tahun_id: tahunId, status, q: cari || undefined, page: hal, per_page: 25 } }, { signal }),
  );
  const meta = q.meta as { ringkasan?: Record<string, number>; total_pages?: number; page?: number } | undefined;
  const r = meta?.ringkasan;
  const baris = q.data ?? [];

  const setujuiBanyak = async () => {
    try {
      const x = await siakad.request<{ disetujui: string[]; gagal: Array<{ nim: string; alasan: string }> }>({
        method: 'POST',
        path: '/v1/akademik/krs/persetujuan',
        body: { nim: tandai, tahun_id: tahunId },
      });
      setInfo(
        x.data.gagal.length
          ? { v: 'danger', t: `${x.data.disetujui.length} disetujui, ${x.data.gagal.length} gagal: ${x.data.gagal.map((g) => `${g.nim} (${g.alasan})`).join('; ')}` }
          : { v: 'success', t: `${x.data.disetujui.length} KRS disetujui.` },
      );
      setTandai([]);
      invalidateSiakad('krs');
    } catch (e) {
      setInfo({ v: 'danger', t: pesanGalat(e) });
    }
  };

  return (
    <div className={cn('u-alur', className)}>
      <Tabs<'menunggu' | 'belum' | 'disetujui'>
        value={status}
        onValueChange={(v) => {
          setStatus(v);
          setHal(1);
          setTandai([]);
        }}
        items={(['menunggu', 'belum', 'disetujui'] as const).map((s) => ({ value: s, label: STATUS_KRS[s].label, count: r?.[s] }))}
      />
      <div className="u-alur-alat">
        <div className="u-alur-cari">
          <Search aria-hidden />
          <input
            type="search"
            value={cari}
            placeholder="Cari NIM atau nama"
            aria-label="Cari mahasiswa"
            onChange={(e) => {
              setCari(e.target.value);
              setHal(1);
            }}
          />
        </div>
        {status === 'menunggu' && (
          <ConfirmDialog
            trigger={
              <Button disabled={!tandai.length}>
                <CheckCircle2 />
                Setujui {tandai.length || ''} KRS
              </Button>
            }
            tone="primary"
            title={`Setujui KRS ${tandai.length} mahasiswa?`}
            description="KRS yang disetujui muncul di kartu ujian dan presensi kelas."
            confirmLabel={`Setujui ${tandai.length} KRS`}
            onConfirm={setujuiBanyak}
          />
        )}
      </div>
      {info && <Alert variant={info.v}>{info.t}</Alert>}
      {q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : q.loading && !q.data ? (
        <Skeleton height={240} />
      ) : !baris.length ? (
        <Empty icon={<ClipboardCheck />} title={status === 'menunggu' ? 'Tidak ada KRS yang menunggu' : 'Tidak ada data'} description={cari ? 'Coba kata lain.' : undefined} />
      ) : (
        <div className="u-tabel-nilai-wrap">
          <table className="u-tabel-nilai u-alur-tabel">
            <thead>
              <tr>
                {status === 'menunggu' && (
                  <th>
                    <Checkbox aria-label="Pilih semua" checked={tandai.length === baris.length} onCheckedChange={(c) => setTandai(c ? baris.map((b) => b.nim) : [])} />
                  </th>
                )}
                <th>Mahasiswa</th>
                <th>Angkatan</th>
                <th data-angka>MK</th>
                <th data-angka>SKS</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => (
                <tr key={b.nim}>
                  {status === 'menunggu' && (
                    <td>
                      <Checkbox aria-label={`Pilih ${b.nama}`} checked={tandai.includes(b.nim)} onCheckedChange={(c) => setTandai((t) => (c ? [...t, b.nim] : t.filter((x) => x !== b.nim)))} />
                    </td>
                  )}
                  <td>
                    <button type="button" className="u-alur-tautan" onClick={() => setBuka(b.nim)}>
                      <strong>{b.nama}</strong>
                      <span className="u-alur-meta">{b.nim}</span>
                    </button>
                  </td>
                  <td>{b.angkatan}</td>
                  <td data-angka>
                    {b.mk_disetujui}/{b.mk}
                  </td>
                  <td data-angka>{b.sks}</td>
                  <td>
                    <Badge variant={STATUS_KRS[b.status].v} dot>
                      {STATUS_KRS[b.status].label}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(meta?.total_pages ?? 1) > 1 && (
        <div className="u-alur-halaman">
          <Button variant="outline" size="sm" disabled={hal <= 1} onClick={() => setHal((h) => h - 1)}>
            Sebelumnya
          </Button>
          <span>
            Halaman {hal} dari {meta?.total_pages}
          </span>
          <Button variant="outline" size="sm" disabled={hal >= (meta?.total_pages ?? 1)} onClick={() => setHal((h) => h + 1)}>
            Berikutnya
          </Button>
        </div>
      )}
      <Sheet open={Boolean(buka)} onOpenChange={(o) => !o && setBuka(null)} title="KRS mahasiswa" size="lg">
        {buka && <DetailKrsPaIsi nim={buka} tahunId={tahunId} />}
      </Sheet>
    </div>
  );
}

function DetailKrsPaIsi({ nim, tahunId }: { nim: string; tahunId?: string }) {
  const siakad = useSiakad();
  const q = useSiakadQuery<DetailKrsPa>(['krs/persetujuan/detail', nim, tahunId ?? ''], (s, signal) =>
    s.request<DetailKrsPa>({ method: 'GET', path: `/v1/akademik/krs/persetujuan/${encodeURIComponent(nim)}`, query: { tahun_id: tahunId } }, { signal }),
  );
  const [pesan, setPesan] = React.useState('');
  const [galat, setGalat] = React.useState<string | null>(null);
  const [sibuk, setSibuk] = React.useState<string | null>(null);
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  const d = q.data;
  if (!d) return <Skeleton height={300} />;

  const jalan = async (kunci: string, f: () => Promise<unknown>) => {
    setSibuk(kunci);
    setGalat(null);
    try {
      await f();
      q.refetch();
      invalidateSiakad('krs/persetujuan');
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSibuk(null);
    }
  };
  const lebih = d.batas_sks !== null && d.sks > d.batas_sks;

  return (
    <div className="u-alur u-alur-detail">
      <div className="u-alur-kepala">
        <div>
          <p className="u-alur-judul">{d.mahasiswa.nama}</p>
          <p className="u-alur-meta">
            {d.mahasiswa.nim} · {d.mahasiswa.nama_prodi ?? d.mahasiswa.kode_prodi} · angkatan {d.mahasiswa.angkatan}
          </p>
        </div>
        <Badge variant={STATUS_KRS[d.status].v} dot>
          {STATUS_KRS[d.status].label}
        </Badge>
      </div>
      <div className="u-alur-angka">
        <div>
          <span>SKS diambil</span>
          <strong data-lebih={lebih || undefined}>
            {d.sks}
            {d.batas_sks !== null ? ` / ${d.batas_sks}` : ''}
          </strong>
        </div>
        {d.riwayat_ips.map((r) => (
          <div key={r.tahun_id}>
            <span>IPS {labelTahunAkademik(r.tahun_id, true)}</span>
            <strong>{r.ips !== null ? r.ips.toFixed(2) : '–'}</strong>
          </div>
        ))}
      </div>
      {!d.perlu_persetujuan_pa && <Alert variant="info">Prodi ini tidak mewajibkan persetujuan PA pada periode {labelTahunAkademik(d.tahun_id)}.</Alert>}
      {galat && <Alert variant="danger">{galat}</Alert>}
      <ul className="u-alur-mk">
        {d.krs.map((k) => (
          <li key={k.id} data-dipilih={k.disetujui || undefined}>
            <div className="u-alur-mk-isi">
              <span className="u-alur-mk-nama">
                <strong>{k.nama_mk ?? k.kode_mk}</strong>
                <span className="u-alur-meta">
                  {k.kode_mk} · {k.sks} SKS · kelas {k.kelas ?? '–'}
                  {k.hari ? ` · ${hari(k.hari)} ${k.mulai ?? ''}${k.sampai ? `–${k.sampai}` : ''}` : ''}
                  {k.ruang ? ` · ${k.ruang}` : ''}
                </span>
              </span>
              {k.bisa_dihapus && d.status !== 'disetujui' && (
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="sm" iconOnly aria-label={`Hapus ${k.nama_mk ?? k.kode_mk}`}>
                      <Trash2 />
                    </Button>
                  }
                  title={`Hapus ${k.nama_mk ?? k.kode_mk} dari KRS?`}
                  description="Mahasiswa perlu mengambilnya lagi bila masih dibutuhkan."
                  confirmLabel="Hapus mata kuliah"
                  onConfirm={() => jalan(`hapus-${k.id}`, () => siakad.request({ method: 'POST', path: `/v1/akademik/krs/persetujuan/${encodeURIComponent(nim)}/hapus-mk`, body: { idkrs: k.id } }))}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="u-alur-kaki">
        <span />
        {d.status === 'disetujui' ? (
          <Button
            variant="outline"
            loading={sibuk === 'batal'}
            onClick={() => jalan('batal', () => siakad.request({ method: 'POST', path: `/v1/akademik/krs/persetujuan/${encodeURIComponent(nim)}`, body: { setuju: false, tahun_id: d.tahun_id } }))}
          >
            <XCircle />
            Batalkan persetujuan
          </Button>
        ) : (
          <Button
            loading={sibuk === 'setuju'}
            disabled={!d.krs.length}
            onClick={() => jalan('setuju', () => siakad.request({ method: 'POST', path: `/v1/akademik/krs/persetujuan/${encodeURIComponent(nim)}`, body: { setuju: true, tahun_id: d.tahun_id } }))}
          >
            <CheckCircle2 />
            Setujui KRS
          </Button>
        )}
      </div>
      <section className="u-alur-obrolan">
        <h3 className="u-alur-grup-judul">
          <MessageSquare aria-hidden /> Konsultasi KRS
        </h3>
        {d.pesan.length ? (
          <ul>
            {d.pesan.map((m) => (
              <li key={m.id} data-mahasiswa={m.dari_mahasiswa || undefined}>
                <p>{m.pesan}</p>
                <span className="u-alur-meta">
                  {m.dari_mahasiswa ? 'Mahasiswa' : m.oleh} · {m.waktu}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="u-alur-meta">Belum ada pesan.</p>
        )}
        <form
          className="u-alur-kirim"
          onSubmit={(e) => {
            e.preventDefault();
            if (!pesan.trim()) return;
            void jalan('pesan', async () => {
              await siakad.request({ method: 'POST', path: `/v1/akademik/krs/persetujuan/${encodeURIComponent(nim)}/pesan`, body: { pesan: pesan.trim(), tahun_id: d.tahun_id } });
              setPesan('');
            });
          }}
        >
          <Textarea aria-label="Pesan untuk mahasiswa" rows={2} maxLength={1000} value={pesan} placeholder="Tulis saran untuk mahasiswa" onChange={(e) => setPesan(e.target.value)} />
          <Button type="submit" size="sm" loading={sibuk === 'pesan'} disabled={!pesan.trim()}>
            <Send />
            Kirim
          </Button>
        </form>
      </section>
    </div>
  );
}

// ================================================================ Input nilai kelas (dosen pengampu)

type Jenis = 'Harian' | 'Tugas' | 'UTS' | 'UAS';
const JENIS: Jenis[] = ['Harian', 'Tugas', 'UTS', 'UAS'];

export interface PesertaNilai {
  idkrs: number;
  nim: string;
  nama: string;
  Harian: Array<number | null>;
  Tugas: Array<number | null>;
  UTS: number | null;
  UAS: number | null;
  nilai_angka: number | null;
  nilai_huruf: string | null;
  bobot: number | null;
  lulus: boolean;
}
export interface SkalaNilai {
  huruf: string;
  bobot: number;
  min: number;
  max: number;
  lulus: boolean;
}
export interface TabelNilaiKelas {
  kelas: { id: number; kode_prodi: string; nama_prodi?: string; tahun_id: string; semester: number; kelas: string; kode_mk: string; nama_mk?: string; sks: number; nidn?: string; nama_dosen?: string };
  persen_aktif: boolean;
  persen: Record<Jenis, number | null>;
  kolom: { Harian: number; Tugas: number };
  peserta: PesertaNilai[];
  input_dibuka: boolean;
  batas: { mulai: string; selesai: string } | null;
  distribusi: Record<string, number>;
  skala: SkalaNilai[];
}

const rata = (x: Array<number | null>) => {
  const a = x.filter((v): v is number => v !== null);
  return a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
};

/**
 * Perkiraan nilai akhir dari komponen: rata-rata Harian dan Tugas, ditambah UTS dan UAS, dikali persentasenya
 * (rumus HitungNilaiAngka tanpa komponen presensi). Nilai resmi tetap dihitung server saat disimpan.
 */
export function perkiraanNilai(p: Pick<PesertaNilai, Jenis>, persen: Record<Jenis, number | null>, skala: SkalaNilai[]): { angka: number | null; huruf: string | null } {
  const komp: Record<Jenis, number | null> = { Harian: rata(p.Harian), Tugas: rata(p.Tugas), UTS: p.UTS, UAS: p.UAS };
  if (JENIS.every((j) => komp[j] === null)) return { angka: null, huruf: null };
  const a = JENIS.reduce((s, j) => s + ((komp[j] ?? 0) * (persen[j] ?? 0)) / 100, 0);
  const n = Math.round(a * 100) / 100;
  const h = skala.find((x) => n >= x.min && n <= x.max) ?? null;
  return { angka: n, huruf: h?.huruf ?? null };
}

export interface InputNilaiKelasProps {
  /** ID jadwal (t_jadwal.idj) dari GET /v1/akademik/nilai/kelas. */
  idj: number;
  className?: string;
}

/**
 * Lembar input nilai satu kelas: persentase Harian/Tugas/UTS/UAS (total maksimal 100), nilai per komponen (kolom Harian
 * dan Tugas bisa ditambah), perkiraan nilai akhir dan huruf dari skala prodi, distribusi, dan pengumuman ke mahasiswa.
 * Hanya nilai yang berubah yang dikirim ke POST /v1/akademik/nilai/kelas/{idj}; di luar batas tanggal input, tabel
 * hanya bisa dibaca.
 */
export function InputNilaiKelas({ idj, className }: InputNilaiKelasProps) {
  const siakad = useSiakad();
  const q = useSiakadQuery<TabelNilaiKelas>(['nilai/kelas', idj], (s, signal) => s.request<TabelNilaiKelas>({ method: 'GET', path: `/v1/akademik/nilai/kelas/${idj}` }, { signal }), { staleTime: 0 });
  const [data, setData] = React.useState<TabelNilaiKelas | null>(null);
  const [ubah, setUbah] = React.useState<Record<string, number | null>>({});
  const [persen, setPersen] = React.useState<Record<Jenis, number | null> | null>(null);
  const [sibuk, setSibuk] = React.useState(false);
  const [info, setInfo] = React.useState<{ v: 'success' | 'danger'; t: string } | null>(null);

  React.useEffect(() => {
    if (q.data) {
      setData(q.data);
      setUbah({});
      setPersen(null);
    }
  }, [q.data]);

  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  if (!data) return <Skeleton className={className} height={360} />;

  const kunci = (idkrs: number, j: Jenis, ke: number) => `${idkrs}|${j}|${ke}`;
  const p = persen ?? data.persen;
  const totalPersen = JENIS.reduce((s, j) => s + (p[j] ?? 0), 0);
  const baca = !data.input_dibuka;
  const nilaiDi = (ps: PesertaNilai, j: Jenis, ke: number): number | null => {
    const k = kunci(ps.idkrs, j, ke);
    if (k in ubah) return ubah[k];
    return j === 'UTS' || j === 'UAS' ? ps[j] : (ps[j][ke - 1] ?? null);
  };
  const terapkan = (ps: PesertaNilai): PesertaNilai => ({
    ...ps,
    Harian: Array.from({ length: data.kolom.Harian }, (_, i) => nilaiDi(ps, 'Harian', i + 1)),
    Tugas: Array.from({ length: data.kolom.Tugas }, (_, i) => nilaiDi(ps, 'Tugas', i + 1)),
    UTS: nilaiDi(ps, 'UTS', 1),
    UAS: nilaiDi(ps, 'UAS', 1),
  });
  const salah = Object.entries(ubah).filter(([, v]) => v !== null && (Number.isNaN(v) || v < 0 || v > 100));
  const jumlahUbah = Object.keys(ubah).length + (persen ? 1 : 0);

  const simpan = async () => {
    setSibuk(true);
    setInfo(null);
    try {
      const nilai = Object.entries(ubah)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => {
          const [idkrs, jenis, ke] = k.split('|');
          return { idkrs: Number(idkrs), jenis, ke: Number(ke), nilai: v };
        });
      const r = await siakad.request<TabelNilaiKelas & { tersimpan: number; pesan: string[] }>({
        method: 'POST',
        path: `/v1/akademik/nilai/kelas/${idj}`,
        body: { ...(persen ? { persen } : {}), nilai },
      });
      setData(r.data);
      setUbah({});
      setPersen(null);
      setInfo({ v: 'success', t: `${r.data.tersimpan} nilai tersimpan; nilai akhir dihitung ulang.${r.data.pesan?.length ? ` ${r.data.pesan.join(' ')}` : ''}` });
      invalidateSiakad('nilai');
    } catch (e) {
      setInfo({ v: 'danger', t: pesanGalat(e) });
    } finally {
      setSibuk(false);
    }
  };

  const umumkan = async () => {
    try {
      await siakad.request({ method: 'POST', path: `/v1/akademik/nilai/kelas/${idj}/umumkan`, body: {} });
      setInfo({ v: 'success', t: 'Pengumuman nilai terkirim ke kotak masuk peserta yang nilainya sudah masuk.' });
    } catch (e) {
      setInfo({ v: 'danger', t: pesanGalat(e) });
    }
  };

  const sel = (ps: PesertaNilai, j: Jenis, ke: number) => {
    const v = nilaiDi(ps, j, ke);
    const k = kunci(ps.idkrs, j, ke);
    return (
      <td key={k} data-angka data-ubah={k in ubah || undefined}>
        <input
          className="u-alur-nilai"
          inputMode="decimal"
          aria-label={`${j}${j === 'Harian' || j === 'Tugas' ? ` ${ke}` : ''} ${ps.nama}`}
          value={v === null ? '' : String(v)}
          disabled={baca}
          aria-invalid={v !== null && (Number.isNaN(v) || v < 0 || v > 100) ? true : undefined}
          onChange={(e) => {
            const t = e.target.value.replace(',', '.').trim();
            setUbah((u) => ({ ...u, [k]: t === '' ? null : Number(t) }));
          }}
        />
      </td>
    );
  };

  const k = data.kelas;
  return (
    <div className={cn('u-alur', className)}>
      <div className="u-alur-kepala">
        <div>
          <p className="u-alur-judul">
            {k.nama_mk ?? k.kode_mk} · kelas {k.kelas}
          </p>
          <p className="u-alur-meta">
            {k.kode_mk} · {k.sks} SKS · {labelTahunAkademik(k.tahun_id)} · {data.peserta.length} peserta
          </p>
        </div>
        {baca ? <Badge variant="warning">Input ditutup</Badge> : <Badge variant="success">Input dibuka{data.batas ? ` s.d. ${data.batas.selesai}` : ''}</Badge>}
      </div>
      {baca && <Alert variant="warning">{data.batas ? `Input nilai dibuka ${data.batas.mulai} s.d. ${data.batas.selesai}.` : 'Batas tanggal input nilai belum ditentukan untuk kelas ini.'}</Alert>}

      {data.persen_aktif && (
        <fieldset className="u-alur-persen" disabled={baca}>
          <legend>Komposisi nilai (%)</legend>
          {JENIS.map((j) => (
            <Field key={j} label={j}>
              <Input
                inputMode="decimal"
                value={p[j] === null ? '' : String(p[j])}
                onChange={(e) => setPersen({ ...p, [j]: e.target.value === '' ? null : Number(e.target.value.replace(',', '.')) })}
              />
            </Field>
          ))}
          <p className="u-alur-persen-total" data-lebih={totalPersen > 100 || undefined}>
            Total {totalPersen}%{totalPersen > 100 ? ', lebih dari 100' : totalPersen < 100 ? `, kurang ${100 - totalPersen}` : ''}
          </p>
        </fieldset>
      )}

      {info && <Alert variant={info.v}>{info.t}</Alert>}

      <div className="u-tabel-nilai-wrap">
        <table className="u-tabel-nilai u-alur-tabel-nilai">
          <thead>
            <tr>
              <th>Mahasiswa</th>
              {Array.from({ length: data.kolom.Harian }, (_, i) => (
                <th key={`h${i}`} data-angka>
                  Harian {i + 1}
                </th>
              ))}
              {Array.from({ length: data.kolom.Tugas }, (_, i) => (
                <th key={`t${i}`} data-angka>
                  Tugas {i + 1}
                </th>
              ))}
              <th data-angka>UTS</th>
              <th data-angka>UAS</th>
              <th data-angka>Akhir</th>
              <th>Huruf</th>
            </tr>
          </thead>
          <tbody>
            {data.peserta.map((ps) => {
              const est = perkiraanNilai(terapkan(ps), p, data.skala);
              const berubah = Object.keys(ubah).some((x) => x.startsWith(`${ps.idkrs}|`)) || persen !== null;
              return (
                <tr key={ps.idkrs}>
                  <td>
                    <strong>{ps.nama}</strong>
                    <span className="u-alur-meta">{ps.nim}</span>
                  </td>
                  {Array.from({ length: data.kolom.Harian }, (_, i) => sel(ps, 'Harian', i + 1))}
                  {Array.from({ length: data.kolom.Tugas }, (_, i) => sel(ps, 'Tugas', i + 1))}
                  {sel(ps, 'UTS', 1)}
                  {sel(ps, 'UAS', 1)}
                  <td data-angka title={berubah ? 'Perkiraan; dihitung ulang server saat disimpan' : undefined} data-perkiraan={berubah || undefined}>
                    {berubah ? (est.angka ?? '–') : (ps.nilai_angka ?? '–')}
                  </td>
                  <td>{(berubah ? est.huruf : ps.nilai_huruf) ?? '–'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {Object.keys(data.distribusi).length > 0 && (
        <p className="u-alur-meta">
          Distribusi:{' '}
          {Object.entries(data.distribusi)
            .map(([h, n]) => `${h} ${n}`)
            .join(' · ')}
        </p>
      )}

      <div className="u-alur-kaki">
        <div className="u-alur-kaki-info">
          {!baca && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setData({ ...data, kolom: { ...data.kolom, Harian: data.kolom.Harian + 1 } })}>
                <Plus />
                Kolom Harian
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setData({ ...data, kolom: { ...data.kolom, Tugas: data.kolom.Tugas + 1 } })}>
                <Plus />
                Kolom Tugas
              </Button>
            </>
          )}
          {salah.length > 0 && <span className="u-alur-galat">{salah.length} nilai di luar 0–100.</span>}
        </div>
        <div className="u-alur-kaki-info">
          <ConfirmDialog
            trigger={
              <Button variant="outline" disabled={jumlahUbah > 0 || !data.peserta.some((x) => x.nilai_huruf)}>
                <Megaphone />
                Umumkan nilai
              </Button>
            }
            tone="primary"
            title="Umumkan nilai ke mahasiswa?"
            description="Notifikasi dikirim ke peserta yang nilainya sudah masuk. Nilai tidak berubah."
            confirmLabel="Kirim pengumuman"
            onConfirm={umumkan}
          />
          <Button onClick={simpan} loading={sibuk} disabled={baca || !jumlahUbah || salah.length > 0 || totalPersen > 100}>
            <Save />
            Simpan nilai{jumlahUbah ? ` (${Object.keys(ubah).length})` : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Kelas yang diampu untuk input nilai (GET /v1/akademik/nilai/kelas), dengan jumlah peserta yang sudah bernilai. */
export function DaftarKelasNilai({ tahunId, prodi, onPilih, className }: { tahunId?: string; prodi?: string; onPilih: (idj: number) => void; className?: string }) {
  type K = { id: number; kode_mk: string; nama_mk?: string; kelas: string; sks: number; semester: number; nama_dosen?: string; peserta: number; bernilai: number };
  const q = useSiakadQuery<{ tahun_id: string; data: K[] }>(['nilai/kelas', 'daftar', tahunId ?? '', prodi ?? ''], async (s, signal) => {
    const r = await s.request<{ tahun_id: string; data: K[] } | K[]>({ method: 'GET', path: '/v1/akademik/nilai/kelas', query: { tahun_id: tahunId, prodi } }, { signal });
    // Respons berupa objek {tahun_id, mode, data}; SDK bisa sudah membuka `data`.
    const d = r.data as { tahun_id: string; data: K[] } | K[];
    return { ...r, data: Array.isArray(d) ? { tahun_id: tahunId ?? '', data: d } : d };
  });
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  if (!q.data) return <Skeleton className={className} height={180} />;
  if (!q.data.data.length) return <Empty className={className} icon={<ClipboardCheck />} title="Tidak ada kelas yang Anda ampu" description={`Periode ${labelTahunAkademik(q.data.tahun_id)}`} />;
  return (
    <ul className={cn('u-alur-kelas', className)}>
      {q.data.data.map((k) => (
        <li key={k.id}>
          <button type="button" onClick={() => onPilih(k.id)}>
            <span className="u-alur-mk-nama">
              <strong>
                {k.nama_mk ?? k.kode_mk} · {k.kelas}
              </strong>
              <span className="u-alur-meta">
                {k.kode_mk} · {k.sks} SKS · semester {k.semester}
              </span>
            </span>
            <span className="u-alur-kelas-progres">
              <Progress value={k.bernilai} max={Math.max(1, k.peserta)} size="sm" tone={k.peserta && k.bernilai >= k.peserta ? 'success' : undefined} />
              <span className="u-alur-meta">
                {k.bernilai}/{k.peserta} bernilai
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ================================================================ EDOM (mahasiswa)

export interface EdomMk {
  idkrs: number;
  kode_mk: string;
  nama_mk?: string;
  kelas?: string;
  sks: number;
  dosen?: string | null;
  soal_terjawab: number;
  selesai: boolean;
}
export interface EdomSaya {
  tahun_id: string;
  jumlah_soal: number;
  jumlah_mk: number;
  mk_selesai: number;
  mata_kuliah: EdomMk[];
  pilihan_jawaban: string[];
}
export interface EdomForm {
  idkrs: number;
  kode_mk: string;
  nama_mk?: string;
  kelas?: string;
  dosen?: string | null;
  saran?: string | null;
  soal: Array<{ idk: number; pertanyaan: string; pilihan: Record<string, string | null>; jawab: string | null }>;
  pilihan_jawaban: string[];
}

/**
 * Pengisian EDOM (evaluasi dosen oleh mahasiswa): daftar mata kuliah KRS yang disetujui dengan kemajuan, lalu kuesioner
 * per mata kuliah (semua soal wajib, saran opsional) ke POST /v1/edom/isi/{idkrs}. Setelah tersimpan, langsung lanjut ke
 * mata kuliah berikutnya yang belum diisi.
 */
export function IsiEdom({ tahunId, className }: { tahunId?: string; className?: string }) {
  const q = useSiakadQuery<EdomSaya>(['edom/isi', tahunId ?? ''], (s, signal) => s.request<EdomSaya>({ method: 'GET', path: '/v1/edom/isi', query: { tahun_id: tahunId } }, { signal }), {
    staleTime: 0,
  });
  const [aktif, setAktif] = React.useState<number | null>(null);
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  const d = q.data;
  if (!d) return <Skeleton className={className} height={280} />;
  if (!d.jumlah_soal)
    return <Empty className={className} icon={<ClipboardCheck />} title="Kuesioner EDOM belum tersedia" description={`Belum ada soal untuk periode ${labelTahunAkademik(d.tahun_id)}.`} />;

  const berikut = (dari: number) => d.mata_kuliah.find((m) => !m.selesai && m.idkrs !== dari)?.idkrs ?? null;

  return (
    <div className={cn('u-alur', className)}>
      <div className="u-alur-kepala">
        <div>
          <p className="u-alur-judul">Evaluasi dosen {labelTahunAkademik(d.tahun_id)}</p>
          <p className="u-alur-meta">
            {d.mk_selesai} dari {d.jumlah_mk} mata kuliah selesai · {d.jumlah_soal} pertanyaan per mata kuliah
          </p>
        </div>
        <div className="u-alur-sks">
          <Progress value={d.mk_selesai} max={Math.max(1, d.jumlah_mk)} size="sm" tone={d.mk_selesai >= d.jumlah_mk ? 'success' : undefined} />
        </div>
      </div>
      {aktif ? (
        <FormEdom
          key={aktif}
          idkrs={aktif}
          kembali={() => setAktif(null)}
          selesai={() => {
            q.refetch();
            setAktif(berikut(aktif));
          }}
        />
      ) : (
        <ul className="u-alur-kelas">
          {d.mata_kuliah.map((m) => (
            <li key={m.idkrs}>
              <button type="button" onClick={() => setAktif(m.idkrs)}>
                <span className="u-alur-mk-nama">
                  <strong>{m.nama_mk ?? m.kode_mk}</strong>
                  <span className="u-alur-meta">
                    {m.dosen ?? 'Dosen belum ada di jadwal'} · kelas {m.kelas ?? '–'}
                  </span>
                </span>
                {m.selesai ? (
                  <Badge variant="success" dot>
                    Selesai
                  </Badge>
                ) : (
                  <Badge variant={m.soal_terjawab ? 'warning' : 'neutral'} dot>
                    {m.soal_terjawab ? `${m.soal_terjawab}/${d.jumlah_soal}` : 'Belum diisi'}
                  </Badge>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FormEdom({ idkrs, kembali, selesai }: { idkrs: number; kembali: () => void; selesai: () => void }) {
  const siakad = useSiakad();
  const q = useSiakadQuery<EdomForm>(['edom/isi', 'form', idkrs], (s, signal) => s.request<EdomForm>({ method: 'GET', path: `/v1/edom/isi/${idkrs}` }, { signal }), { staleTime: 0 });
  const [jawab, setJawab] = React.useState<Record<number, string>>({});
  const [saran, setSaran] = React.useState<string | null>(null);
  const [coba, setCoba] = React.useState(false);
  const [sibuk, setSibuk] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  const f = q.data;
  if (!f) return <Skeleton height={320} />;
  const nilai = (s: EdomForm['soal'][number]) => jawab[s.idk] ?? s.jawab ?? '';
  const kosong = f.soal.filter((s) => !nilai(s));

  return (
    <form
      className="u-alur-edom"
      onSubmit={async (e) => {
        e.preventDefault();
        setCoba(true);
        if (kosong.length) {
          document.getElementById(`edom-${kosong[0].idk}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
          return;
        }
        setSibuk(true);
        setGalat(null);
        try {
          await siakad.request({ method: 'POST', path: `/v1/edom/isi/${idkrs}`, body: { jawaban: Object.fromEntries(f.soal.map((s) => [String(s.idk), nilai(s)])), saran: saran ?? f.saran ?? '' } });
          selesai();
        } catch (er) {
          setGalat(pesanGalat(er));
        } finally {
          setSibuk(false);
        }
      }}
    >
      <div className="u-alur-kepala">
        <div>
          <p className="u-alur-judul">{f.nama_mk ?? f.kode_mk}</p>
          <p className="u-alur-meta">
            {f.dosen ?? 'Dosen belum ada di jadwal'} · kelas {f.kelas ?? '–'}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={kembali}>
          Kembali ke daftar
        </Button>
      </div>
      <ol className="u-alur-soal">
        {f.soal.map((s, i) => (
          <li key={s.idk} id={`edom-${s.idk}`} data-galat={(coba && !nilai(s)) || undefined}>
            <fieldset>
              <legend>
                {i + 1}. {s.pertanyaan}
              </legend>
              <div className="u-alur-pilihan" role="radiogroup">
                {f.pilihan_jawaban.map((h) => (
                  <label key={h} data-pilih={nilai(s) === h || undefined}>
                    <input type="radio" name={`edom-${s.idk}`} value={h} checked={nilai(s) === h} onChange={() => setJawab((j) => ({ ...j, [s.idk]: h }))} />
                    <span>{s.pilihan[h] || h}</span>
                  </label>
                ))}
              </div>
              {coba && !nilai(s) && <p className="u-alur-galat">Pilih salah satu jawaban.</p>}
            </fieldset>
          </li>
        ))}
      </ol>
      <Field label="Saran untuk dosen" optional>
        <Textarea rows={3} value={saran ?? f.saran ?? ''} onChange={(e) => setSaran(e.target.value)} />
      </Field>
      {galat && <Alert variant="danger">{galat}</Alert>}
      <div className="u-alur-kaki">
        <span className="u-alur-meta">
          {f.soal.length - kosong.length}/{f.soal.length} terjawab
        </span>
        <Button type="submit" loading={sibuk}>
          <Send />
          Kirim evaluasi
        </Button>
      </div>
    </form>
  );
}

// ================================================================ Pendaftaran wisuda (mahasiswa)

export interface SyaratItem {
  kode?: string;
  nama: string;
  terpenuhi: boolean;
  nilai?: unknown;
  wajib?: boolean;
}
export interface PeriodeWisuda {
  idw: number;
  kode_prodi: string;
  nama: string;
  tahun_id: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  tanggal_wisuda?: string | null;
}
export interface WisudaSaya {
  nim: string;
  tahun_id: string;
  boleh_daftar: boolean;
  syarat: SyaratItem[];
  syarat_tambahan: SyaratItem[];
  kurang: string[];
  pendaftaran: (Record<string, unknown> & { idw?: number | null; periode?: string | null; terima?: string | null; tanggal_wisuda?: string | null }) | null;
  periode_buka: PeriodeWisuda[];
  isian: string[];
}

const ISIAN_WISUDA: Array<{ k: string; label: string; ukuran?: string }> = [
  { k: 'toga', label: 'Toga', ukuran: 'ukuran_toga' },
  { k: 'topi', label: 'Topi', ukuran: 'ukuran_topi' },
  { k: 'kalung', label: 'Kalung' },
  { k: 'undangan', label: 'Undangan orang tua' },
  { k: 'foto', label: 'Foto wisuda' },
  { k: 'ijazah', label: 'Map ijazah' },
];

/**
 * Pendaftaran wisuda mahasiswa: daftar syarat (TA lulus, SKS, status aktif, nilai D/E, syarat tambahan prodi) dari
 * /v1/kelulusan/wisuda/saya, pilih periode yang dibuka, kelengkapan (toga + ukuran, topi + ukuran, kalung, undangan,
 * foto, ijazah), lalu POST /v1/kelulusan/wisuda/daftar. Pendaftaran yang sudah diterima terkunci.
 */
export function PendaftaranWisuda({ className, onTerdaftar }: { className?: string; onTerdaftar?: (p: Record<string, unknown>) => void }) {
  const siakad = useSiakad();
  const q = useSiakadQuery<WisudaSaya>(['kelulusan/wisuda/saya'], (s, signal) => s.request<WisudaSaya>({ method: 'GET', path: '/v1/kelulusan/wisuda/saya' }, { signal }), { staleTime: 0 });
  const [idw, setIdw] = React.useState<number | null>(null);
  const [isi, setIsi] = React.useState<Record<string, string> | null>(null);
  const [sibuk, setSibuk] = React.useState(false);
  const [info, setInfo] = React.useState<{ v: 'success' | 'danger'; t: string } | null>(null);
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  const d = q.data;
  if (!d) return <Skeleton className={className} height={320} />;

  const daf = d.pendaftaran;
  const diterima = daf?.terima === 'Y';
  const nilaiAwal = Object.fromEntries((d.isian.length ? d.isian : ISIAN_WISUDA.flatMap((x) => (x.ukuran ? [x.k, x.ukuran] : [x.k]))).map((k) => [k, String(daf?.[k] ?? '')]));
  const v = isi ?? nilaiAwal;
  const periode = idw ?? (daf?.idw ? Number(daf.idw) : (d.periode_buka[0]?.idw ?? null));
  const semua = [...d.syarat, ...d.syarat_tambahan];
  const ukuranKurang = ISIAN_WISUDA.filter((x) => x.ukuran && v[x.k] === '1' && !v[x.ukuran!]?.trim());

  return (
    <div className={cn('u-alur', className)}>
      <div className="u-alur-kepala">
        <div>
          <p className="u-alur-judul">Pendaftaran wisuda</p>
          <p className="u-alur-meta">{d.nim}</p>
        </div>
        {daf ? (
          <Badge variant={diterima ? 'success' : 'warning'} dot>
            {diterima ? 'Diterima' : 'Menunggu verifikasi'}
          </Badge>
        ) : (
          <Badge variant={d.boleh_daftar ? 'info' : 'neutral'}>{d.boleh_daftar ? 'Bisa mendaftar' : 'Syarat belum lengkap'}</Badge>
        )}
      </div>

      <section className="u-alur-grup">
        <h3 className="u-alur-grup-judul">
          <GraduationCap aria-hidden /> Syarat
        </h3>
        <ul className="u-alur-syarat">
          {semua.map((s) => (
            <li key={s.kode ?? s.nama} data-ok={s.terpenuhi || undefined}>
              {s.terpenuhi ? <CheckCircle2 aria-hidden /> : <XCircle aria-hidden />}
              <span>
                {s.nama}
                {s.wajib === false && <span className="u-alur-meta"> (tidak wajib)</span>}
              </span>
            </li>
          ))}
        </ul>
        {d.kurang.length > 0 && <Alert variant="warning">Belum terpenuhi: {d.kurang.join('; ')}.</Alert>}
      </section>

      {diterima ? (
        <Alert variant="success" title={`Terdaftar di ${daf?.periode ?? 'periode wisuda'}`}>
          {daf?.tanggal_wisuda ? `Wisuda ${daf.tanggal_wisuda}. ` : ''}Perubahan data lewat operator prodi.
        </Alert>
      ) : !d.periode_buka.length && !daf ? (
        <Empty icon={<GraduationCap />} title="Belum ada periode wisuda yang dibuka" description="Pendaftaran muncul di sini saat prodi membuka periode." />
      ) : (
        <form
          className="u-alur-grup"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!periode) return;
            setSibuk(true);
            setInfo(null);
            try {
              const r = await siakad.request<Record<string, unknown>>({ method: 'POST', path: '/v1/kelulusan/wisuda/daftar', body: { idw: periode, ...v } });
              setInfo({ v: 'success', t: daf ? 'Pendaftaran diperbarui.' : 'Pendaftaran wisuda terkirim. Tunggu verifikasi prodi.' });
              setIsi(null);
              q.refetch();
              onTerdaftar?.(r.data);
            } catch (er) {
              setInfo({ v: 'danger', t: pesanGalat(er) });
            } finally {
              setSibuk(false);
            }
          }}
        >
          <h3 className="u-alur-grup-judul">Periode dan kelengkapan</h3>
          <Field label="Periode wisuda" required>
            <Select<number | null>
              value={periode}
              onValueChange={setIdw}
              options={d.periode_buka.map((p) => ({
                value: p.idw as number | null,
                label: `${p.nama} · daftar ${p.tanggal_mulai} s.d. ${p.tanggal_selesai}${p.tanggal_wisuda ? ` · wisuda ${p.tanggal_wisuda}` : ''}`,
              }))}
            />
          </Field>
          <div className="u-alur-wisuda">
            {ISIAN_WISUDA.map((x) => (
              <div key={x.k} className="u-alur-wisuda-baris">
                <label className="u-alur-centang">
                  <Checkbox checked={v[x.k] === '1'} onCheckedChange={(c) => setIsi({ ...v, [x.k]: c ? '1' : '' })} />
                  {x.label}
                </label>
                {x.ukuran && v[x.k] === '1' && (
                  <Input
                    aria-label={`Ukuran ${x.label.toLowerCase()}`}
                    placeholder="Ukuran, mis. L"
                    maxLength={30}
                    value={v[x.ukuran] ?? ''}
                    onChange={(e) => setIsi({ ...v, [x.ukuran!]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
          {info && <Alert variant={info.v}>{info.t}</Alert>}
          <div className="u-alur-kaki">
            <span className="u-alur-meta">{ukuranKurang.length ? `Isi ukuran ${ukuranKurang.map((x) => x.label.toLowerCase()).join(' dan ')}.` : ''}</span>
            <Button type="submit" loading={sibuk} disabled={!d.boleh_daftar || !periode || ukuranKurang.length > 0}>
              <Send />
              {daf ? 'Perbarui pendaftaran' : 'Daftar wisuda'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
