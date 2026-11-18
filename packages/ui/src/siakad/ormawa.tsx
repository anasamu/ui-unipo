'use client';
import * as React from 'react';
import { ArrowRightLeft, CalendarRange, History, Network, Pencil, Plus, ScrollText, ShieldCheck, Trash2, UserMinus, UserPlus, UsersRound } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatDate } from '../lib/format';
import { Badge, Button, Skeleton, type BadgeVariant } from '../components/actions';
import { BaganOrganisasi, type GayaJenisBagan, type LapisanBagan, type UnitBagan } from '../components/bagan-organisasi';
import { DataTable, type DataColumn } from '../components/data-table';
import { Alert, Empty, Tabs } from '../components/display';
import { FilterBar, type FilterValues } from '../components/filter';
import { Checkbox, Field, Input, Textarea } from '../components/forms';
import { BagianForm, IsianTanggal, PanelForm, Pilihan } from '../components/formulir';
import { StatistikRingkas } from '../components/laporan';
import { ConfirmDialog, Dialog, useToast, type MenuEntry } from '../components/overlays';
import type { SelectOption } from '../components/select';
import { GalatApi } from './galat';
import { KartuSK, PilihSK, type SKRegistri } from './isian-sk';
import { PilihEntitas } from './pilih';
import { PilihUnit } from './pilih-unit';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

/*
 * Organisasi mahasiswa (/v1/kemahasiswaan, docs/KEMAHASISWAAN.md di SIAKAD): ormawa tingkat universitas (BEM, DPM, UKM)
 * dan fakultas/prodi (BEM fakultas, HIMA), periode kepengurusan ber-SK dari registri SK tunggal, jabatan pengurus
 * terstruktur, serah terima, bagan pengurus per ormawa, bagan struktur kemahasiswaan, lapisan "organisasi mahasiswa"
 * untuk bagan organisasi kampus, dan riwayat organisasi mahasiswa (profil). Syarat pengurus/pembina diperiksa aturan
 * dinamis di SIAKAD; form menampilkan hasil pemeriksaannya sebelum menyimpan.
 */

// ================================================================ Tipe
export type JenisOrmawa = 'bem' | 'dpm' | 'hima' | 'ukm' | 'komunitas' | 'lainnya';
export type TingkatOrmawa = 'universitas' | 'fakultas' | 'prodi';
export type KodeJabatanOrmawa = 'ketua' | 'wakil_ketua' | 'sekretaris' | 'wakil_sekretaris' | 'bendahara' | 'wakil_bendahara' | 'koordinator' | 'anggota' | 'lainnya';

interface Orang {
  nim: string;
  nama: string | null;
}
export interface PeriodeOrmawa {
  id: number;
  ormawa_id: number;
  nama: string;
  mulai: string;
  selesai: string | null;
  status: 'rencana' | 'aktif' | 'selesai';
  status_label: string;
  masa_hari: number | null;
  lebih_setahun: boolean;
  nomor_sk: string | null;
  tanggal_sk: string | null;
  sk: SKRegistri | null;
  catatan: string | null;
  serah_terima: { tanggal: string; dari_periode_id: number | null; catatan: string | null; oleh: string | null } | null;
  jumlah_pengurus: number | null;
  ketua: Orang | null;
}
export interface PengurusOrmawa {
  id: number;
  nim: string;
  nama: string | null;
  prodi: string | null;
  jabatan: string;
  jabatan_kode: KodeJabatanOrmawa;
  jabatan_label: string;
  divisi: string | null;
  inti: boolean;
  urut: number;
  mulai: string;
  selesai: string | null;
  aktif: boolean;
}
export interface RingkasOrmawa {
  id: number;
  kode: string;
  nama: string;
  jenis: JenisOrmawa;
  jenis_label: string;
  bidang: string | null;
  unit_id: number | null;
  kode_prodi: string | null;
  pembina_nidn: string | null;
  aktif: boolean;
}
export interface SusunanOrmawa {
  ormawa: RingkasOrmawa & { tingkat: TingkatOrmawa; penerbit_unit_id: number | null };
  periode: PeriodeOrmawa | null;
  semua_periode: PeriodeOrmawa[];
  pengurus: PengurusOrmawa[];
  pengurus_tanpa_periode: number;
  jabatan: Array<{ kode: KodeJabatanOrmawa; label: string; inti: boolean; urut: number }>;
  boleh: { kelola: boolean };
}
export interface OrmawaStruktur extends RingkasOrmawa {
  tingkat: TingkatOrmawa;
  fakultas_unit_id: number | null;
  prodi_unit_id: number | null;
  unit_induk_id: number | null;
  ketua: Orang | null;
  wakil_ketua: Orang | null;
  pembina: { nidn: string; nama: string | null } | null;
  periode: { id: number; nama: string; mulai: string; selesai: string | null } | null;
  jumlah_pengurus: number;
  sk: SKRegistri | null;
}
interface PejabatStruktur {
  unit_id: number;
  nama: string;
  pejabat: { nama: string; jabatan: string; plt: boolean } | null;
}
export interface StrukturKemahasiswaanData {
  wr3: PejabatStruktur | null;
  kemahasiswaan: PejabatStruktur | null;
  universitas_unit_id: number | null;
  fakultas: Array<{ unit_id: number; kode: string; nama: string; singkatan: string | null; pejabat?: PejabatStruktur['pejabat'] }>;
  ormawa: OrmawaStruktur[];
  ringkas: { jumlah: number; tanpa_periode: number; tanpa_ketua: number; tanpa_pembina: number; tanpa_sk: number };
}
export interface RiwayatOrganisasi {
  id: number;
  ormawa: { id: number; kode: string; nama: string; jenis: JenisOrmawa; jenis_label: string; tingkat: TingkatOrmawa };
  jabatan: string;
  jabatan_kode: KodeJabatanOrmawa;
  divisi: string | null;
  periode: { id: number; nama: string; mulai: string; selesai: string | null; status: string } | null;
  mulai: string;
  selesai: string | null;
  berjalan: boolean;
  sk: { id: string | null; nomor: string | null; tanggal: string | null; perihal: string | null; penerbit?: { nama: string } | null; ada_berkas?: boolean } | null;
}
interface HasilPeriksa {
  titik: string;
  boleh: boolean;
  terpasang?: boolean;
  pelanggaran?: Array<{ id: string; nama: string; pesan: string; boleh_pengecualian?: boolean }>;
  peringatan?: Array<{ id: string; nama: string; pesan: string }>;
  indikator?: Record<string, unknown>;
}

// ================================================================ Label dan warna
export const LABEL_JENIS_ORMAWA: Record<JenisOrmawa, string> = { bem: 'BEM', dpm: 'DPM', hima: 'HIMA', ukm: 'UKM', komunitas: 'Komunitas', lainnya: 'Organisasi lain' };
export const LABEL_TINGKAT_ORMAWA: Record<TingkatOrmawa, string> = { universitas: 'Universitas', fakultas: 'Fakultas', prodi: 'Program studi' };
export const LABEL_JABATAN_ORMAWA: Record<KodeJabatanOrmawa, string> = {
  ketua: 'Ketua',
  wakil_ketua: 'Wakil Ketua',
  sekretaris: 'Sekretaris',
  wakil_sekretaris: 'Wakil Sekretaris',
  bendahara: 'Bendahara',
  wakil_bendahara: 'Wakil Bendahara',
  koordinator: 'Koordinator bidang/divisi',
  anggota: 'Anggota',
  lainnya: 'Pengurus lain',
};
const URUT_JABATAN: KodeJabatanOrmawa[] = ['ketua', 'wakil_ketua', 'sekretaris', 'wakil_sekretaris', 'bendahara', 'wakil_bendahara', 'koordinator', 'anggota', 'lainnya'];

/** Warna jenis ormawa untuk BaganOrganisasi (digabung ke GAYA_JENIS_BAGAN). */
export const GAYA_JENIS_ORMAWA: Record<string, GayaJenisBagan> = {
  bem: { label: 'BEM', warna: '#c2410c' },
  dpm: { label: 'DPM', warna: '#9333ea' },
  ukm: { label: 'UKM', warna: '#0891b2' },
  hima: { label: 'HIMA', warna: '#16a34a' },
  komunitas: { label: 'Komunitas', warna: '#ca8a04' },
  lainnya: { label: 'Organisasi', warna: '#64748b' },
};
const GAYA_STRUKTUR: Record<string, GayaJenisBagan> = {
  rektorat: { label: 'Wakil Rektor', warna: '#4f46e5' },
  bagian: { label: 'Bagian', warna: '#64748b' },
  fakultas: { label: 'Fakultas', warna: '#0284c7' },
  ...GAYA_JENIS_ORMAWA,
};
const URUT_ORMAWA = ['bem', 'dpm', 'ukm', 'hima', 'komunitas', 'lainnya'];
const GAYA_PENGURUS: Record<string, GayaJenisBagan> = {
  pimpinan: { label: 'Pimpinan', warna: '#c2410c' },
  pembina: { label: 'Pembina', warna: '#4f46e5' },
  sekretariat: { label: 'Sekretariat', warna: '#0891b2' },
  keuangan: { label: 'Keuangan', warna: '#16a34a' },
  divisi: { label: 'Bidang/divisi', warna: '#7c3aed' },
};

const VARIAN_PERIODE: Record<PeriodeOrmawa['status'], BadgeVariant> = { rencana: 'neutral', aktif: 'success', selesai: 'info' };
const tgl = (v: string | null | undefined) => (v ? formatDate(v, 'medium') : '—');
const masa = (p: { mulai: string; selesai: string | null }) => `${tgl(p.mulai)} – ${p.selesai ? tgl(p.selesai) : 'sekarang'}`;

// ================================================================ Data
export function useStrukturKemahasiswaan(opsi?: { semua?: boolean; enabled?: boolean }) {
  return useSiakadQuery<StrukturKemahasiswaanData>(
    ['kemahasiswaan', 'struktur', Boolean(opsi?.semua)],
    (s, signal) => s.request<StrukturKemahasiswaanData>({ method: 'GET', path: '/v1/kemahasiswaan/struktur', query: opsi?.semua ? { semua: '1' } : undefined }, { signal }),
    { enabled: opsi?.enabled },
  );
}
export function useSusunanOrmawa(id: number | null | undefined, periodeId?: number | null) {
  return useSiakadQuery<SusunanOrmawa>(
    ['kemahasiswaan', 'susunan', id ?? 0, periodeId ?? 0],
    (s, signal) => s.request<SusunanOrmawa>({ method: 'GET', path: `/v1/kemahasiswaan/ormawa/${id}/susunan`, query: periodeId ? { periode_id: String(periodeId) } : undefined }, { signal }),
    { enabled: Boolean(id) },
  );
}
/**
 * Riwayat organisasi seorang mahasiswa (pengelola) atau milik pengguna sendiri (`saya`, untuk aplikasi profil).
 * `saya` untuk pengguna yang bukan mahasiswa/alumni: data null.
 */
export function useRiwayatOrganisasi(nim: string | 'saya' | null | undefined) {
  return useSiakadQuery<RiwayatOrganisasi[] | null>(
    ['kemahasiswaan', 'riwayat', nim ?? ''],
    async (s, signal) => {
      if (nim === 'saya') {
        const r = await s.request<{ berlaku: boolean; riwayat: RiwayatOrganisasi[] }>({ method: 'GET', path: '/v1/profil/saya/organisasi-mahasiswa' }, { signal });
        return { ...r, data: r.data?.berlaku ? r.data.riwayat : null } as unknown as typeof r & { data: RiwayatOrganisasi[] | null };
      }
      return s.request<RiwayatOrganisasi[]>({ method: 'GET', path: `/v1/kemahasiswaan/mahasiswa/${encodeURIComponent(String(nim))}/organisasi` }, { signal });
    },
    { enabled: Boolean(nim) },
  );
}

function segarkan() {
  invalidateSiakad('kemahasiswaan');
  invalidateSiakad('katalog:');
}

function galatIsian(e: unknown, setGalat: (g: Record<string, string>) => void): string {
  const f = (e as { fields?: Record<string, unknown>; details?: Record<string, unknown> }).fields;
  if (f && Object.keys(f).length) {
    setGalat(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, String(v)])));
    return Object.values(f).map(String).join(' ') || 'Periksa isian yang ditandai.';
  }
  return pesanGalat(e);
}

// ================================================================ Bagan
function teksOrang(o: Orang | null | undefined) {
  return o ? o.nama ?? o.nim : null;
}

/** Simpul BaganOrganisasi satu ormawa: kartu berisi ketua dan pembina, lencana periode. */
function simpulOrmawa(o: OrmawaStruktur, induk: string | null): UnitBagan {
  return {
    id: `ormawa-${o.id}`,
    induk_id: induk,
    nama: o.nama,
    singkatan: o.kode,
    jenis: o.jenis,
    lencana: o.periode ? o.periode.nama : 'Tanpa periode',
    aktif: o.aktif,
    jabatan: [
      { jabatan: 'Ketua', nama: teksOrang(o.ketua), ref: { ormawa_id: o.id } },
      { jabatan: 'Pembina', nama: o.pembina ? o.pembina.nama ?? o.pembina.nidn : null, ref: { ormawa_id: o.id } },
    ],
  };
}

/**
 * Data bagan "Struktur organisasi kemahasiswaan": WR III -> Bagian Kemahasiswaan (pembina) -> ormawa tingkat
 * universitas (BEM, DPM, UKM) dan fakultas -> BEM fakultas, HIMA.
 */
export function baganKemahasiswaan(d: StrukturKemahasiswaanData): UnitBagan[] {
  const out: UnitBagan[] = [];
  const akar = d.wr3 ? 'wr3' : d.kemahasiswaan ? 'kmhs' : null;
  if (d.wr3) out.push({ id: 'wr3', nama: d.wr3.nama, jenis: 'rektorat', jabatan: [{ jabatan: d.wr3.pejabat?.jabatan ?? 'Wakil Rektor III', nama: d.wr3.pejabat?.nama ?? null, status: d.wr3.pejabat?.plt ? 'plt' : null }] });
  if (d.kemahasiswaan)
    out.push({
      id: 'kmhs',
      induk_id: d.wr3 ? 'wr3' : null,
      nama: d.kemahasiswaan.nama,
      jenis: 'bagian',
      lencana: 'Pembina',
      jabatan: [{ jabatan: d.kemahasiswaan.pejabat?.jabatan ?? 'Kepala Bagian', nama: d.kemahasiswaan.pejabat?.nama ?? null, status: d.kemahasiswaan.pejabat?.plt ? 'plt' : null }],
    });
  const induk = d.kemahasiswaan ? 'kmhs' : akar;
  for (const f of d.fakultas) out.push({ id: `fak-${f.unit_id}`, induk_id: induk, nama: f.nama, singkatan: f.singkatan, jenis: 'fakultas', jabatan: [{ jabatan: f.pejabat?.jabatan ?? 'Dekan', nama: f.pejabat?.nama ?? null, status: f.pejabat?.plt ? 'plt' : null }] });
  for (const o of d.ormawa) out.push(simpulOrmawa(o, o.tingkat === 'universitas' || !o.fakultas_unit_id ? induk : `fak-${o.fakultas_unit_id}`));
  return out;
}

/**
 * Lapisan "Organisasi mahasiswa" untuk bagan organisasi kampus (BaganOrganisasi `lapisan`): BEM/DPM/UKM menempel ke
 * unit universitas, BEM fakultas ke fakultasnya, HIMA ke prodinya (id unit = induk_unit.id sebagai string).
 */
export function lapisanOrmawa(d: StrukturKemahasiswaanData, label = 'Organisasi mahasiswa'): LapisanBagan {
  return {
    kunci: 'ormawa',
    label,
    // Garis pembinaan (pembina ormawa: bagian kemahasiswaan/fakultas/prodi), di samping garis utama unit.
    data: d.ormawa.filter((o) => o.unit_induk_id).map((o) => ({ ...simpulOrmawa(o, String(o.unit_induk_id)), koordinasi: true, garis: 'pembinaan' as const, labelGaris: 'pembinaan' })),
    gayaJenis: GAYA_JENIS_ORMAWA,
    urutJenis: URUT_ORMAWA,
  };
}

/** Lapisan ormawa siap pakai untuk <BaganOrganisasi lapisan={...} /> bagan kampus; null selama dimuat/gagal/tanpa hak. */
export function useLapisanOrmawa(opsi?: { enabled?: boolean; label?: string }): LapisanBagan | null {
  const q = useStrukturKemahasiswaan({ enabled: opsi?.enabled });
  return React.useMemo(() => (q.data ? lapisanOrmawa(q.data, opsi?.label) : null), [q.data, opsi?.label]);
}

export interface StrukturKemahasiswaanProps {
  judul?: React.ReactNode;
  tinggi?: number | string;
  /** Klik kartu ormawa (mis. buka detail). */
  onPilihOrmawa?: (id: number) => void;
  className?: string;
}

/** Bagan struktur organisasi kemahasiswaan, bisa diunduh PNG/PDF dan dicetak. */
export function StrukturKemahasiswaan({ judul = 'Struktur organisasi kemahasiswaan', tinggi = 620, onPilihOrmawa, className }: StrukturKemahasiswaanProps) {
  const q = useStrukturKemahasiswaan();
  const data = React.useMemo(() => (q.data ? baganKemahasiswaan(q.data) : []), [q.data]);
  if (q.loading && !q.data) return <Skeleton height={420} />;
  if (q.error || !q.data) return <GalatApi error={q.error ?? new Error('Struktur belum bisa dimuat.')} onRetry={q.refetch} />;
  const r = q.data.ringkas;
  return (
    <div className={cn('u-ormawa', className)}>
      <StatistikRingkas
        min={160}
        items={[
          { label: 'Ormawa aktif', nilai: r.jumlah, ikon: <UsersRound /> },
          { label: 'Tanpa periode berjalan', nilai: r.tanpa_periode, terbalik: true, ikon: <CalendarRange /> },
          { label: 'Tanpa ketua', nilai: r.tanpa_ketua, terbalik: true, ikon: <UserPlus /> },
          { label: 'Tanpa pembina', nilai: r.tanpa_pembina, terbalik: true, ikon: <ShieldCheck /> },
          { label: 'Tanpa SK kepengurusan', nilai: r.tanpa_sk, terbalik: true, ikon: <ScrollText /> },
        ]}
      />
      <BaganOrganisasi
        data={data}
        judul={typeof judul === 'string' ? undefined : judul}
        judulBerkas={typeof judul === 'string' ? judul : 'Struktur organisasi kemahasiswaan'}
        subjudul={`${r.jumlah} organisasi mahasiswa · ketua dan pembina periode berjalan`}
        rinci
        gantiRinci={false}
        buka={4}
        tinggi={tinggi}
        gayaJenis={GAYA_STRUKTUR}
        urutJenis={['rektorat', 'bagian', ...URUT_ORMAWA, 'fakultas']}
        namaBerkas="struktur-organisasi-kemahasiswaan"
        onPilihUnit={onPilihOrmawa ? (u) => u.id.startsWith('ormawa-') && onPilihOrmawa(Number(u.id.slice(7))) : undefined}
      />
    </div>
  );
}

/** Data bagan pengurus satu periode: pimpinan (ketua, wakil) -> sekretariat, keuangan, bidang/divisi; pembina koordinasi. */
export function baganPengurus(s: SusunanOrmawa, pembina?: string | null): UnitBagan[] {
  const p = s.pengurus.filter((x) => x.aktif || s.periode?.status === 'selesai');
  const jab = (kode: KodeJabatanOrmawa[]) =>
    p.filter((x) => kode.includes(x.jabatan_kode)).sort((a, b) => URUT_JABATAN.indexOf(a.jabatan_kode) - URUT_JABATAN.indexOf(b.jabatan_kode) || a.urut - b.urut);
  const isi = (xs: PengurusOrmawa[], label?: (x: PengurusOrmawa) => string) => xs.map((x) => ({ jabatan: label ? label(x) : x.jabatan, nama: x.nama ?? x.nim, ref: x }));
  const pimpinan = jab(['ketua', 'wakil_ketua']);
  const out: UnitBagan[] = [
    { id: 'pimpinan', nama: s.ormawa.nama, singkatan: s.ormawa.kode, jenis: 'pimpinan', lencana: s.periode ? s.periode.nama : null,
      jabatan: pimpinan.length ? isi(pimpinan) : [{ jabatan: 'Ketua', nama: null }] },
  ];
  if (pembina) out.push({ id: 'pembina', induk_id: 'pimpinan', koordinasi: true, nama: 'Pembina', jenis: 'pembina', jabatan: [{ jabatan: 'Dosen pembina', nama: pembina }] });
  const sek = jab(['sekretaris', 'wakil_sekretaris']);
  if (sek.length) out.push({ id: 'sekretariat', induk_id: 'pimpinan', nama: 'Sekretariat', jenis: 'sekretariat', jabatan: isi(sek) });
  const keu = jab(['bendahara', 'wakil_bendahara']);
  if (keu.length) out.push({ id: 'keuangan', induk_id: 'pimpinan', nama: 'Keuangan', jenis: 'keuangan', jabatan: isi(keu) });
  const divisi = new Map<string, PengurusOrmawa[]>();
  for (const x of jab(['koordinator', 'anggota', 'lainnya'])) {
    const k = x.divisi?.trim() || (x.jabatan_kode === 'anggota' ? 'Anggota' : 'Pengurus lain');
    divisi.set(k, [...(divisi.get(k) ?? []), x]);
  }
  for (const [nama, xs] of divisi) {
    out.push({
      id: `divisi-${nama}`,
      induk_id: 'pimpinan',
      nama: /^(divisi|bidang|departemen|seksi|biro|komisi)\b/i.test(nama) || ['Anggota', 'Pengurus lain'].includes(nama) ? nama : `Divisi ${nama}`,
      jenis: 'divisi',
      jabatan: isi(xs, (x) => (x.jabatan_kode === 'koordinator' ? 'Koordinator' : x.jabatan_kode === 'anggota' ? 'Anggota' : x.jabatan)),
    });
  }
  return out;
}

// ================================================================ Pemeriksaan aturan
function HasilAturan({ hasil, memuat, galat }: { hasil: HasilPeriksa | null; memuat?: boolean; galat?: string | null }) {
  if (memuat) return <p className="u-ormawa-redup">Memeriksa syarat...</p>;
  if (galat) return <Alert variant="danger">{galat}</Alert>;
  if (!hasil) return null;
  const langgar = hasil.pelanggaran ?? [];
  const ingat = hasil.peringatan ?? [];
  if (!langgar.length && !ingat.length) return <Alert variant="success" title="Memenuhi syarat">Semua aturan yang berlaku terpenuhi.</Alert>;
  return (
    <>
      {langgar.length > 0 && (
        <Alert variant="danger" title="Belum memenuhi syarat">
          <ul className="u-ormawa-daftar-pesan">
            {langgar.map((p) => (
              <li key={p.id}>
                {p.pesan}
                {p.boleh_pengecualian && <span className="u-ormawa-redup"> Bisa dikecualikan lewat pengecualian aturan.</span>}
              </li>
            ))}
          </ul>
        </Alert>
      )}
      {ingat.length > 0 && (
        <Alert variant="warning" title="Peringatan">
          <ul className="u-ormawa-daftar-pesan">{ingat.map((p) => <li key={p.id}>{p.pesan}</li>)}</ul>
        </Alert>
      )}
    </>
  );
}

function usePeriksa<B extends object>(path: string, body: B | null) {
  const siakad = useSiakad();
  const [st, setSt] = React.useState<{ hasil: HasilPeriksa | null; memuat: boolean; galat: string | null }>({ hasil: null, memuat: false, galat: null });
  const kunci = body ? JSON.stringify(body) : '';
  React.useEffect(() => {
    if (!kunci) {
      setSt({ hasil: null, memuat: false, galat: null });
      return;
    }
    const ac = new AbortController();
    setSt((x) => ({ ...x, memuat: true, galat: null }));
    const t = setTimeout(() => {
      siakad
        .request<HasilPeriksa>({ method: 'POST', path, body: JSON.parse(kunci) }, { signal: ac.signal })
        .then((r) => setSt({ hasil: r.data ?? null, memuat: false, galat: null }))
        .catch((e) => !ac.signal.aborted && setSt({ hasil: null, memuat: false, galat: pesanGalat(e) }));
    }, 250);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [kunci, path, siakad]);
  return st;
}

// ================================================================ Form ormawa
export interface IsiOrmawa {
  id?: number;
  kode: string;
  nama: string;
  jenis: JenisOrmawa | '';
  bidang: string;
  unit_id: number | null;
  kode_prodi: string | null;
  pembina_nidn: string | null;
  deskripsi: string;
  email: string;
  instagram: string;
  aktif: boolean;
}

const KOSONG: IsiOrmawa = { kode: '', nama: '', jenis: '', bidang: '', unit_id: null, kode_prodi: null, pembina_nidn: null, deskripsi: '', email: '', instagram: '', aktif: true };

/** Tambah/ubah ormawa (/v1/kemahasiswaan/ormawa). Pembina diperiksa aturan titik kemahasiswaan.pembina.tetapkan. */
export function FormOrmawa({ ormawa, open, onOpenChange, onTersimpan }: { ormawa?: Partial<IsiOrmawa> & { id?: number }; open: boolean; onOpenChange: (o: boolean) => void; onTersimpan?: (id: number) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const awal = React.useMemo<IsiOrmawa>(() => ({ ...KOSONG, ...(ormawa ?? {}), bidang: ormawa?.bidang ?? '', deskripsi: ormawa?.deskripsi ?? '', email: ormawa?.email ?? '', instagram: ormawa?.instagram ?? '' }), [ormawa]);
  const [isi, setIsi] = React.useState(awal);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (open) {
      setIsi(awal);
      setGalat({});
    }
  }, [open, awal]);
  const set = <K extends keyof IsiOrmawa>(k: K, v: IsiOrmawa[K]) => {
    setIsi((x) => ({ ...x, [k]: v }));
    setGalat((g) => ({ ...g, [k]: '' }));
  };
  const pembinaBerubah = isi.pembina_nidn && isi.pembina_nidn !== (ormawa?.pembina_nidn ?? null);
  const cek = usePeriksa('/v1/kemahasiswaan/pembina/periksa', pembinaBerubah ? { pembina_nidn: isi.pembina_nidn, jenis: isi.jenis || 'lainnya', unit_id: isi.unit_id, kode_prodi: isi.kode_prodi } : null);
  const butuhUnit = isi.jenis === 'hima';
  return (
    <PanelForm
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={isi.id ? `Ubah ${awal.nama}` : 'Tambah organisasi mahasiswa'}
      description="Tingkat ormawa mengikuti unit: kosong/universitas untuk BEM, DPM, UKM universitas; fakultas untuk BEM fakultas; program studi untuk HIMA. SK kepengurusan diatur per periode."
      berubah={JSON.stringify(isi) !== JSON.stringify(awal)}
      labelSimpan={isi.id ? 'Simpan' : 'Tambah'}
      onSimpan={async () => {
        const g: Record<string, string> = {};
        if (!isi.kode.trim()) g.kode = 'Kode wajib diisi.';
        if (!isi.nama.trim()) g.nama = 'Nama wajib diisi.';
        if (!isi.jenis) g.jenis = 'Pilih jenis organisasi.';
        if (butuhUnit && !isi.unit_id) g.unit_id = 'HIMA berada di bawah program studi.';
        setGalat(g);
        if (Object.keys(g).length) return 'Periksa isian yang ditandai.';
        if (cek.hasil && !cek.hasil.boleh) return 'Pembina belum memenuhi syarat.';
        const body = {
          kode: isi.kode.trim(), nama: isi.nama.trim(), jenis: isi.jenis, bidang: isi.bidang.trim() || null, unit_id: isi.unit_id, kode_prodi: isi.kode_prodi,
          pembina_nidn: isi.pembina_nidn, deskripsi: isi.deskripsi.trim() || null, email: isi.email.trim() || null, instagram: isi.instagram.trim() || null, aktif: isi.aktif,
        };
        try {
          const r = await siakad.request<{ id: number }>({ method: isi.id ? 'PUT' : 'POST', path: isi.id ? `/v1/kemahasiswaan/ormawa/${isi.id}` : '/v1/kemahasiswaan/ormawa', body });
          segarkan();
          toast.add({ title: isi.id ? 'Organisasi diperbarui' : 'Organisasi ditambahkan', description: isi.id ? undefined : 'Lanjutkan dengan membuat periode kepengurusan dan SK-nya.', type: 'success' });
          if (r.data?.id) onTersimpan?.(r.data.id);
        } catch (e) {
          return galatIsian(e, setGalat);
        }
      }}
    >
      <BagianForm judul="Organisasi" kolom={2}>
        <Field label="Jenis" required error={galat.jenis || undefined} className="u-form-lebar">
          <Pilihan
            tampilan="tombol"
            required
            options={(Object.keys(LABEL_JENIS_ORMAWA) as JenisOrmawa[]).map((j) => ({ value: j, label: LABEL_JENIS_ORMAWA[j] }))}
            value={isi.jenis || null}
            onValueChange={(v) => set('jenis', (v ?? '') as JenisOrmawa)}
          />
        </Field>
        <Field label="Kode" required error={galat.kode || undefined} description="Singkat dan unik, mis. BEM-U, HIMA-TI.">
          <Input value={isi.kode} maxLength={30} onChange={(e) => set('kode', e.target.value.toUpperCase())} />
        </Field>
        <Field label="Nama" required error={galat.nama || undefined}>
          <Input value={isi.nama} maxLength={150} placeholder="mis. Himpunan Mahasiswa Informatika" onChange={(e) => set('nama', e.target.value)} />
        </Field>
        <Field
          label="Unit"
          optional={!butuhUnit}
          required={butuhUnit}
          error={galat.unit_id || undefined}
          className="u-form-lebar"
          description={isi.jenis === 'bem' ? 'Kosongkan untuk BEM universitas; pilih fakultas untuk BEM fakultas.' : isi.jenis === 'hima' ? 'Program studi himpunan.' : 'Kosongkan untuk tingkat universitas.'}
        >
          <PilihUnit
            jenis={['universitas', 'fakultas', 'prodi']}
            value={isi.unit_id}
            placeholder="Tingkat universitas"
            invalid={Boolean(galat.unit_id)}
            onValueChange={(id, u) => {
              setIsi((x) => ({ ...x, unit_id: id, kode_prodi: u?.jenis === 'prodi' ? u.kode_prodi ?? null : null }));
              setGalat((g) => ({ ...g, unit_id: '' }));
            }}
          />
        </Field>
        <Field label="Bidang" optional description="mis. olahraga, seni, keagamaan, penalaran.">
          <Input value={isi.bidang} maxLength={100} onChange={(e) => set('bidang', e.target.value)} />
        </Field>
        <Field label="Status" optional>
          <label className="u-ormawa-centang">
            <Checkbox checked={isi.aktif} onCheckedChange={(c) => set('aktif', Boolean(c))} /> Organisasi aktif
          </label>
        </Field>
      </BagianForm>
      <BagianForm judul="Pembina" kolom={1} keterangan="Dosen pembina diperiksa aturan Kemahasiswaan (bawaan: dosen berstatus aktif).">
        <Field label="Dosen pembina" optional error={galat.pembina_nidn || undefined}>
          <PilihEntitas jenis="dosen" value={isi.pembina_nidn} onValueChange={(v) => set('pembina_nidn', v)} />
        </Field>
        {pembinaBerubah && <HasilAturan hasil={cek.hasil} memuat={cek.memuat} galat={cek.galat} />}
      </BagianForm>
      <BagianForm judul="Profil" kolom={2}>
        <Field label="Email" optional>
          <Input type="email" value={isi.email} maxLength={150} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Instagram" optional>
          <Input value={isi.instagram} maxLength={100} placeholder="@akun" onChange={(e) => set('instagram', e.target.value)} />
        </Field>
        <Field label="Deskripsi" optional className="u-form-lebar">
          <Textarea value={isi.deskripsi} rows={3} onChange={(e) => set('deskripsi', e.target.value)} />
        </Field>
      </BagianForm>
    </PanelForm>
  );
}

// ================================================================ Form periode
function FormPeriode({ susunan, periode, open, onOpenChange }: { susunan: SusunanOrmawa; periode?: PeriodeOrmawa | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const o = susunan.ormawa;
  const awal = React.useMemo(
    () => ({ nama: periode?.nama ?? '', mulai: periode?.mulai ?? '', selesai: periode?.selesai ?? '', status: periode?.status ?? (susunan.periode?.status === 'aktif' ? 'rencana' : 'aktif'), sk_id: periode?.sk?.id ?? null, catatan: periode?.catatan ?? '' }),
    [periode, susunan.periode],
  );
  const [isi, setIsi] = React.useState(awal);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (open) {
      setIsi(awal);
      setGalat({});
    }
  }, [open, awal]);
  const set = (k: keyof typeof isi, v: string | null) => {
    setIsi((x) => ({ ...x, [k]: v }));
    setGalat((g) => ({ ...g, [k]: '' }));
  };
  const hari = isi.mulai && isi.selesai ? Math.round((Date.parse(isi.selesai) - Date.parse(isi.mulai)) / 86_400_000) : null;
  const penerbit = o.tingkat === 'universitas' ? 'SK Rektor (ditandatangani Wakil Rektor III)' : 'SK Dekan';
  return (
    <PanelForm
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={periode ? `Ubah periode ${periode.nama}` : 'Periode kepengurusan baru'}
      description={`${o.nama}. Masa kepengurusan biasanya 1 tahun. SK kepengurusan: ${penerbit}, dipilih dari registri SK.`}
      berubah={JSON.stringify(isi) !== JSON.stringify(awal)}
      onSimpan={async () => {
        const g: Record<string, string> = {};
        if (!isi.mulai) g.mulai = 'Tanggal mulai wajib diisi.';
        if (isi.mulai && isi.selesai && isi.selesai < isi.mulai) g.selesai = 'Tidak boleh sebelum tanggal mulai.';
        setGalat(g);
        if (Object.keys(g).length) return 'Periksa isian yang ditandai.';
        try {
          await siakad.request({
            method: 'POST',
            path: periode ? `/v1/kemahasiswaan/ormawa/${o.id}/periode/${periode.id}` : `/v1/kemahasiswaan/ormawa/${o.id}/periode`,
            body: { nama: isi.nama.trim() || null, mulai: isi.mulai, selesai: isi.selesai || null, status: isi.status, sk_id: isi.sk_id, catatan: isi.catatan.trim() || null },
          });
          segarkan();
          toast.add({ title: periode ? 'Periode diperbarui' : 'Periode dibuat', type: 'success' });
        } catch (e) {
          return galatIsian(e, setGalat);
        }
      }}
    >
      <BagianForm judul="Masa kepengurusan" kolom={2}>
        <Field label="Nama periode" optional description="Kosong = dari tahun, mis. 2026/2027.">
          <Input value={isi.nama} maxLength={30} placeholder="2026/2027" onChange={(e) => set('nama', e.target.value)} />
        </Field>
        <Field label="Status" required>
          <Pilihan
            tampilan="tombol"
            required
            options={[{ value: 'rencana', label: 'Rencana' }, { value: 'aktif', label: 'Aktif' }, { value: 'selesai', label: 'Selesai' }]}
            value={isi.status}
            onValueChange={(v) => set('status', v ?? 'aktif')}
          />
        </Field>
        <Field label="Mulai" required error={galat.mulai || undefined}>
          <IsianTanggal value={isi.mulai || null} onValueChange={(v) => set('mulai', v ?? '')} />
        </Field>
        <Field label="Selesai" optional error={galat.selesai || undefined} description={hari !== null && hari > 366 ? 'Lebih dari 1 tahun: aturan masa jabatan memberi peringatan.' : undefined}>
          <IsianTanggal value={isi.selesai || null} min={isi.mulai || undefined} onValueChange={(v) => set('selesai', v ?? '')} />
        </Field>
      </BagianForm>
      <BagianForm judul="SK kepengurusan" kolom={1} keterangan={`${penerbit}. Pilih dari registri SK; bila belum tercatat, ajukan pencatatan dari isian ini.`}>
        <PilihSK
          label="SK kepengurusan"
          value={isi.sk_id}
          sk={periode?.sk ?? null}
          jenis="ormawa"
          penerbitUnitId={o.penerbit_unit_id}
          perihal={`Kepengurusan ${o.nama} periode ${isi.nama || (isi.mulai ? isi.mulai.slice(0, 4) : '')}`.trim()}
          tampilPemakaian={periode ? { kecuali: { tabel: 'kmhs_ormawa_periode', baris: periode.id } } : true}
          onValueChange={(id) => set('sk_id', id)}
        />
      </BagianForm>
      <BagianForm judul="Catatan" kolom={1}>
        <Field label="Catatan" optional>
          <Textarea value={isi.catatan} rows={2} onChange={(e) => set('catatan', e.target.value)} />
        </Field>
      </BagianForm>
    </PanelForm>
  );
}

// ================================================================ Form pengurus
function FormPengurus({ susunan, pengurus, open, onOpenChange }: { susunan: SusunanOrmawa; pengurus?: PengurusOrmawa | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const p = susunan.periode;
  const awal = React.useMemo(
    () => ({ nim: pengurus?.nim ?? '', jabatan_kode: (pengurus?.jabatan_kode ?? 'anggota') as KodeJabatanOrmawa, divisi: pengurus?.divisi ?? '', jabatan: pengurus && pengurus.jabatan_kode === 'lainnya' ? pengurus.jabatan : '',
      mulai: pengurus?.mulai ?? '', selesai: pengurus?.selesai ?? '' }),
    [pengurus],
  );
  const [isi, setIsi] = React.useState(awal);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (open) {
      setIsi(awal);
      setGalat({});
    }
  }, [open, awal]);
  const set = (k: keyof typeof isi, v: string) => {
    setIsi((x) => ({ ...x, [k]: v }));
    setGalat((g) => ({ ...g, [k]: '' }));
  };
  const ketuaAda = susunan.pengurus.find((x) => x.aktif && x.jabatan_kode === 'ketua' && x.id !== pengurus?.id);
  const cek = usePeriksa(
    '/v1/kemahasiswaan/pengurus/periksa',
    open && isi.nim && p
      ? { ormawa_id: susunan.ormawa.id, periode_id: p.id, nim: isi.nim, jabatan_kode: isi.jabatan_kode, mulai: isi.mulai || p.mulai, selesai: isi.selesai || p.selesai, pengurus_id: pengurus?.id }
      : null,
  );
  const divisiAda = Array.from(new Set(susunan.pengurus.map((x) => x.divisi).filter(Boolean) as string[]));
  const opsiJabatan: SelectOption<string>[] = susunan.jabatan.map((j) => ({
    value: j.kode,
    label: LABEL_JABATAN_ORMAWA[j.kode] ?? j.label,
    description: j.kode === 'ketua' && ketuaAda ? `Sudah diisi ${ketuaAda.nama ?? ketuaAda.nim}` : j.inti ? 'Pengurus inti (boleh mengajukan kegiatan)' : undefined,
  }));
  return (
    <PanelForm
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={pengurus ? `Ubah ${pengurus.nama ?? pengurus.nim}` : 'Tambah pengurus'}
      description={p ? `${susunan.ormawa.nama}, periode ${p.nama} (${masa(p)}).` : undefined}
      berubah={JSON.stringify(isi) !== JSON.stringify(awal)}
      labelSimpan={pengurus ? 'Simpan' : 'Tetapkan'}
      onSimpan={async () => {
        const g: Record<string, string> = {};
        if (!isi.nim) g.nim = 'Pilih mahasiswa.';
        if (isi.jabatan_kode === 'koordinator' && !isi.divisi.trim()) g.divisi = 'Isi nama bidang/divisi.';
        if (isi.jabatan_kode === 'lainnya' && !isi.jabatan.trim()) g.jabatan = 'Tulis nama jabatannya.';
        setGalat(g);
        if (Object.keys(g).length) return 'Periksa isian yang ditandai.';
        if (cek.hasil && !cek.hasil.boleh) return 'Mahasiswa ini belum memenuhi syarat pengurus (lihat pemeriksaan aturan).';
        const body: Record<string, unknown> = {
          ormawa_id: susunan.ormawa.id, periode_id: p?.id, nim: isi.nim, jabatan_kode: isi.jabatan_kode, divisi: isi.divisi.trim() || null,
          ...(isi.jabatan_kode === 'lainnya' ? { jabatan: isi.jabatan.trim() } : {}),
          ...(isi.mulai ? { mulai: isi.mulai } : {}),
          ...(isi.selesai ? { selesai: isi.selesai } : {}),
        };
        try {
          await siakad.request({ method: pengurus ? 'PUT' : 'POST', path: pengurus ? `/v1/kemahasiswaan/pengurus/${pengurus.id}` : '/v1/kemahasiswaan/pengurus', body });
          segarkan();
          toast.add({ title: pengurus ? 'Pengurus diperbarui' : 'Pengurus ditetapkan', type: 'success' });
        } catch (e) {
          return galatIsian(e, setGalat);
        }
      }}
    >
      <BagianForm judul="Pengurus" kolom={1}>
        <Field label="Mahasiswa" required error={galat.nim || undefined}>
          <PilihEntitas jenis="mahasiswa" value={isi.nim || null} disabled={Boolean(pengurus)} onValueChange={(v) => set('nim', v ?? '')} />
        </Field>
        <Field label="Jabatan" required>
          <Pilihan tampilan="daftar" required options={opsiJabatan} value={isi.jabatan_kode} onValueChange={(v) => set('jabatan_kode', v ?? 'anggota')} />
        </Field>
        {['koordinator', 'anggota', 'lainnya'].includes(isi.jabatan_kode) && (
          <Field label="Bidang/divisi" required={isi.jabatan_kode === 'koordinator'} optional={isi.jabatan_kode !== 'koordinator'} error={galat.divisi || undefined}
            description={divisiAda.length ? `Divisi yang sudah ada: ${divisiAda.join(', ')}.` : 'mis. Humas, Pendidikan, Minat dan Bakat.'}>
            <Input value={isi.divisi} maxLength={100} list="u-ormawa-divisi" onChange={(e) => set('divisi', e.target.value)} />
            <datalist id="u-ormawa-divisi">{divisiAda.map((d) => <option key={d} value={d} />)}</datalist>
          </Field>
        )}
        {isi.jabatan_kode === 'lainnya' && (
          <Field label="Nama jabatan" required error={galat.jabatan || undefined}>
            <Input value={isi.jabatan} maxLength={100} placeholder="mis. Ketua Komisi I" onChange={(e) => set('jabatan', e.target.value)} />
          </Field>
        )}
      </BagianForm>
      <BagianForm judul="Masa jabatan" kolom={2} keterangan="Kosong = mengikuti masa periode.">
        <Field label="Mulai" optional>
          <IsianTanggal value={isi.mulai || null} min={p?.mulai} max={p?.selesai ?? undefined} onValueChange={(v) => set('mulai', v ?? '')} />
        </Field>
        <Field label="Selesai" optional>
          <IsianTanggal value={isi.selesai || null} min={isi.mulai || p?.mulai} onValueChange={(v) => set('selesai', v ?? '')} />
        </Field>
      </BagianForm>
      {isi.nim && (
        <BagianForm judul="Pemeriksaan aturan" kolom={1} keterangan="Aturan Kemahasiswaan untuk penetapan pengurus: status aktif, IPK, sanksi, rangkap ketua, masa jabatan.">
          <HasilAturan hasil={cek.hasil} memuat={cek.memuat} galat={cek.galat} />
        </BagianForm>
      )}
    </PanelForm>
  );
}

// ================================================================ Serah terima
interface BarisBaru {
  kunci: number;
  nim: string | null;
  jabatan_kode: KodeJabatanOrmawa;
  divisi: string;
}

function DialogSerahTerima({ susunan, open, onOpenChange }: { susunan: SusunanOrmawa; open: boolean; onOpenChange: (o: boolean) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const lama = susunan.periode!;
  const o = susunan.ormawa;
  const besok = React.useMemo(() => {
    const d = lama.selesai ? new Date(Date.parse(lama.selesai) + 86_400_000) : new Date();
    return d.toISOString().slice(0, 10);
  }, [lama.selesai]);
  const setahun = (m: string) => {
    const d = new Date(m);
    d.setFullYear(d.getFullYear() + 1);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  };
  const [isi, setIsi] = React.useState({ nama: '', mulai: besok, selesai: setahun(besok), sk_id: null as string | null, catatan: '' });
  const [baris, setBaris] = React.useState<BarisBaru[]>([{ kunci: 1, nim: null, jabatan_kode: 'ketua', divisi: '' }]);
  const [lanjut, setLanjut] = React.useState<number[]>([]);
  React.useEffect(() => {
    if (open) {
      setIsi({ nama: '', mulai: besok, selesai: setahun(besok), sk_id: null, catatan: '' });
      setBaris([{ kunci: 1, nim: null, jabatan_kode: 'ketua', divisi: '' }]);
      setLanjut([]);
    }
  }, [open, besok]);
  const ubahBaris = (k: number, x: Partial<BarisBaru>) => setBaris((b) => b.map((r) => (r.kunci === k ? { ...r, ...x } : r)));
  const opsi = susunan.jabatan.map((j) => ({ value: j.kode, label: LABEL_JABATAN_ORMAWA[j.kode] ?? j.label }));
  const ketua = baris.filter((b) => b.jabatan_kode === 'ketua').length;
  return (
    <PanelForm
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={`Serah terima kepengurusan ${o.nama}`}
      description={`Periode ${lama.nama} ditutup sehari sebelum periode baru; pengurusnya tetap tersimpan sebagai riwayat. Setiap pengurus baru diperiksa aturan; satu saja ditolak, serah terima dibatalkan seluruhnya.`}
      labelSimpan="Lakukan serah terima"
      berubah
      onSimpan={async () => {
        if (!isi.mulai) return 'Isi tanggal mulai periode baru.';
        if (ketua !== 1) return 'Periode baru harus punya tepat satu ketua.';
        if (baris.some((b) => !b.nim)) return 'Lengkapi mahasiswa di setiap baris pengurus (atau hapus barisnya).';
        if (baris.some((b) => b.jabatan_kode === 'koordinator' && !b.divisi.trim())) return 'Koordinator wajib punya bidang/divisi.';
        try {
          await siakad.request({
            method: 'POST',
            path: `/v1/kemahasiswaan/ormawa/${o.id}/periode/${lama.id}/serah-terima`,
            body: {
              nama: isi.nama.trim() || null, mulai: isi.mulai, selesai: isi.selesai || null, tanggal: isi.mulai, sk_id: isi.sk_id, catatan_serah_terima: isi.catatan.trim() || null,
              pengurus: baris.map((b) => ({ nim: b.nim, jabatan_kode: b.jabatan_kode, divisi: b.divisi.trim() || null })), lanjutkan: lanjut,
            },
          });
          segarkan();
          toast.add({ title: 'Serah terima tercatat', description: `Periode ${lama.nama} selesai; periode baru aktif.`, type: 'success' });
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    >
      <BagianForm judul="Periode baru" kolom={2}>
        <Field label="Nama periode" optional>
          <Input value={isi.nama} maxLength={30} placeholder={`mis. ${isi.mulai.slice(0, 4)}/${Number(isi.mulai.slice(0, 4)) + 1}`} onChange={(e) => setIsi((x) => ({ ...x, nama: e.target.value }))} />
        </Field>
        <span />
        <Field label="Mulai (tanggal serah terima)" required>
          <IsianTanggal value={isi.mulai} min={lama.mulai} onValueChange={(v) => setIsi((x) => ({ ...x, mulai: v ?? '', selesai: v ? setahun(v) : x.selesai }))} />
        </Field>
        <Field label="Selesai" optional>
          <IsianTanggal value={isi.selesai || null} min={isi.mulai} onValueChange={(v) => setIsi((x) => ({ ...x, selesai: v ?? '' }))} />
        </Field>
        <div className="u-form-lebar">
          <PilihSK label="SK kepengurusan baru" value={isi.sk_id} jenis="ormawa" penerbitUnitId={o.penerbit_unit_id} perihal={`Kepengurusan ${o.nama} periode ${isi.nama || isi.mulai.slice(0, 4)}`} onValueChange={(id) => setIsi((x) => ({ ...x, sk_id: id }))} />
        </div>
      </BagianForm>
      <BagianForm judul="Pengurus baru" kolom={1} keterangan="Tepat satu ketua. Pengurus lain bisa ditambah sekarang atau sesudahnya." aksi={
        <Button size="sm" variant="outline" onClick={() => setBaris((b) => [...b, { kunci: Date.now(), nim: null, jabatan_kode: 'anggota', divisi: '' }])}><Plus /> Baris</Button>
      }>
        <div className="u-ormawa-baris-baru">
          {baris.map((b) => (
            <div key={b.kunci} className="u-ormawa-baris">
              <PilihEntitas jenis="mahasiswa" value={b.nim} aria-label="Mahasiswa" onValueChange={(v) => ubahBaris(b.kunci, { nim: v })} />
              <Pilihan tampilan="daftar" required options={opsi} value={b.jabatan_kode} aria-label="Jabatan" onValueChange={(v) => ubahBaris(b.kunci, { jabatan_kode: (v ?? 'anggota') as KodeJabatanOrmawa })} />
              <Input value={b.divisi} placeholder="Divisi (opsional)" aria-label="Divisi" onChange={(e) => ubahBaris(b.kunci, { divisi: e.target.value })} />
              <Button size="sm" variant="ghost" iconOnly aria-label="Hapus baris" disabled={baris.length === 1} onClick={() => setBaris((x) => x.filter((r) => r.kunci !== b.kunci))}><Trash2 /></Button>
            </div>
          ))}
        </div>
      </BagianForm>
      {susunan.pengurus.some((p) => p.aktif) && (
        <BagianForm judul="Pengurus lama yang lanjut" kolom={1} keterangan="Dicentang = disalin ke periode baru dengan jabatan yang sama (diperiksa aturan lagi).">
          <div className="u-ormawa-lanjut">
            {susunan.pengurus.filter((p) => p.aktif && p.jabatan_kode !== 'ketua').map((p) => (
              <label key={p.id} className="u-ormawa-centang">
                <Checkbox checked={lanjut.includes(p.id)} onCheckedChange={(c) => setLanjut((l) => (c ? [...l, p.id] : l.filter((x) => x !== p.id)))} />
                {p.nama ?? p.nim} <span className="u-ormawa-redup">{p.jabatan}</span>
              </label>
            ))}
          </div>
        </BagianForm>
      )}
      <BagianForm judul="Berita serah terima" kolom={1}>
        <Field label="Catatan" optional description="mis. forum musyawarah besar, tempat, saksi.">
          <Textarea value={isi.catatan} rows={2} onChange={(e) => setIsi((x) => ({ ...x, catatan: e.target.value }))} />
        </Field>
      </BagianForm>
    </PanelForm>
  );
}

// ================================================================ Detail ormawa
export interface DetailOrmawaProps {
  id: number;
  /** Data struktur (ketua/pembina/SK) bila sudah ada, untuk kepala detail. */
  ringkas?: OrmawaStruktur;
  className?: string;
}

/** Detail satu ormawa: susunan dan bagan pengurus per periode, periode & SK, riwayat kepengurusan, serah terima. */
export function DetailOrmawa({ id, ringkas, className }: DetailOrmawaProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const [periodeId, setPeriodeId] = React.useState<number | null>(null);
  const q = useSusunanOrmawa(id, periodeId);
  const [form, setForm] = React.useState<null | { jenis: 'pengurus'; data?: PengurusOrmawa } | { jenis: 'periode'; data?: PeriodeOrmawa | null } | { jenis: 'serah' } | { jenis: 'ormawa' }>(null);
  const [lepas, setLepas] = React.useState<PengurusOrmawa | null>(null);
  const [hapusP, setHapusP] = React.useState<PeriodeOrmawa | null>(null);
  if (q.loading && !q.data) return <Skeleton height={360} />;
  if (q.error || !q.data) return <GalatApi error={q.error ?? new Error('Organisasi tidak ditemukan.')} onRetry={q.refetch} />;
  const s = q.data;
  const p = s.periode;
  const kelola = s.boleh.kelola;
  const riwayat = p && p.status === 'selesai';
  const pembina = ringkas?.pembina ? ringkas.pembina.nama ?? ringkas.pembina.nidn : s.ormawa.pembina_nidn;
  const kolom: DataColumn<PengurusOrmawa>[] = [
    { key: 'nama', header: 'Nama', cell: (r) => (<div className="u-ormawa-sel-nama"><strong>{r.nama ?? r.nim}</strong><span>{[r.nim, r.prodi].filter(Boolean).join(' · ')}</span></div>), value: (r) => r.nama ?? r.nim, mobile: 'title' },
    { key: 'jabatan', header: 'Jabatan', cell: (r) => (<span>{r.jabatan}{r.inti && <Badge variant="primary" className="u-ormawa-lencana">inti</Badge>}</span>), value: (r) => URUT_JABATAN.indexOf(r.jabatan_kode) },
    { key: 'divisi', header: 'Bidang/divisi', cell: (r) => r.divisi ?? '—' },
    { key: 'masa', header: 'Masa jabatan', cell: (r) => masa(r), mobile: 'meta' },
    { key: 'aktif', header: 'Status', shrink: true, cell: (r) => <Badge variant={r.aktif ? 'success' : 'neutral'}>{r.aktif ? 'Aktif' : 'Selesai'}</Badge>, mobile: 'badge' },
  ];
  const aksiPengurus = (r: PengurusOrmawa): MenuEntry[] =>
    !kelola || riwayat ? [] : [
      { label: 'Ubah', icon: <Pencil />, onSelect: () => setForm({ jenis: 'pengurus', data: r }) },
      ...(r.aktif ? [{ type: 'separator' as const }, { label: 'Akhiri jabatan', icon: <UserMinus />, destructive: true, onSelect: () => setLepas(r) }] : []),
    ];
  const opsiPeriode = s.semua_periode.map((x) => ({ value: String(x.id), label: `${x.nama} · ${x.status_label}`, description: masa(x) }));
  return (
    <div className={cn('u-ormawa u-ormawa-detail', className)}>
      <div className="u-ormawa-kepala">
        <div>
          <div className="u-ormawa-lencana-baris">
            <Badge variant="primary">{LABEL_JENIS_ORMAWA[s.ormawa.jenis] ?? s.ormawa.jenis}</Badge>
            <Badge variant="neutral">Tingkat {LABEL_TINGKAT_ORMAWA[s.ormawa.tingkat].toLowerCase()}</Badge>
            {!s.ormawa.aktif && <Badge variant="warning">Nonaktif</Badge>}
          </div>
          <h2>{s.ormawa.nama}</h2>
          <p>{[s.ormawa.kode, s.ormawa.bidang, pembina && `Pembina ${pembina}`].filter(Boolean).join(' · ')}</p>
        </div>
        {kelola && (
          <div className="u-ormawa-aksi">
            <Button size="sm" variant="outline" onClick={() => setForm({ jenis: 'periode', data: null })}><CalendarRange /> Periode baru</Button>
            {p?.status === 'aktif' && <Button size="sm" variant="outline" onClick={() => setForm({ jenis: 'serah' })}><ArrowRightLeft /> Serah terima</Button>}
            {p && !riwayat && <Button size="sm" onClick={() => setForm({ jenis: 'pengurus' })}><UserPlus /> Tambah pengurus</Button>}
          </div>
        )}
      </div>
      {s.semua_periode.length === 0 ? (
        <Empty
          icon={<CalendarRange />}
          title="Belum ada periode kepengurusan"
          description="Buat periode (masa jabatan dan SK kepengurusan) sebelum mengisi pengurus."
          actions={kelola ? <Button size="sm" onClick={() => setForm({ jenis: 'periode', data: null })}><Plus /> Buat periode</Button> : undefined}
        />
      ) : (
        <>
          <div className="u-ormawa-periode">
            <Field label="Periode" className="u-ormawa-pilih-periode">
              <Pilihan tampilan="daftar" required options={opsiPeriode} value={p ? String(p.id) : null} onValueChange={(v) => setPeriodeId(v ? Number(v) : null)} />
            </Field>
            {p && (
              <div className="u-ormawa-periode-isi">
                <Badge variant={VARIAN_PERIODE[p.status]}>{p.status_label}</Badge>
                <span>{masa(p)}</span>
                {p.lebih_setahun && <Badge variant="warning">Lebih dari 1 tahun</Badge>}
                {p.serah_terima && <span className="u-ormawa-redup">Serah terima {tgl(p.serah_terima.tanggal)}</span>}
                {kelola && <Button size="sm" variant="ghost" onClick={() => setForm({ jenis: 'periode', data: p })}><Pencil /> Ubah periode</Button>}
              </div>
            )}
          </div>
          {p && (p.sk ? <KartuSK sk={p.sk} /> : <Alert variant="warning" title="Periode ini belum ber-SK kepengurusan" actions={kelola ? <Button size="sm" variant="outline" onClick={() => setForm({ jenis: 'periode', data: p })}><ScrollText /> Pilih SK</Button> : undefined}>
            {s.ormawa.tingkat === 'universitas' ? 'SK Rektor ditandatangani Wakil Rektor III.' : 'SK Dekan fakultas.'} Pilih dari registri SK atau ajukan pencatatannya.
          </Alert>)}
          {riwayat && <Alert variant="info">Periode ini sudah selesai dan tersimpan sebagai riwayat; pengurusnya tidak bisa diubah.</Alert>}
          <Tabs
            variant="pill"
            items={[
              {
                value: 'bagan',
                label: 'Bagan pengurus',
                content: s.pengurus.length ? (
                  <BaganOrganisasi
                    data={baganPengurus(s, pembina)}
                    judulBerkas={`Struktur pengurus ${s.ormawa.nama}${p ? ` periode ${p.nama}` : ''}`}
                    subjudul={p ? `${masa(p)}${p.sk ? ` · SK ${p.sk.nomor}` : ''}` : undefined}
                    rinci
                    gantiRinci={false}
                    tinggi={520}
                    gayaJenis={GAYA_PENGURUS}
                    urutJenis={['pembina', 'sekretariat', 'keuangan', 'divisi']}
                    namaBerkas={`pengurus-${s.ormawa.kode.toLowerCase()}${p ? `-${p.nama.replace(/\W+/g, '-')}` : ''}`}
                  />
                ) : (
                  <Empty icon={<UsersRound />} title="Belum ada pengurus" description="Tambahkan ketua, wakil, sekretaris, bendahara, koordinator bidang, dan anggota." />
                ),
              },
              {
                value: 'daftar',
                label: `Daftar pengurus (${s.pengurus.length})`,
                content: <DataTable columns={kolom} rows={s.pengurus} rowKey={(r) => String(r.id)} pagination={false} rowActions={kelola && !riwayat ? aksiPengurus : undefined} exportCsv={`pengurus-${s.ormawa.kode.toLowerCase()}`} />,
              },
              {
                value: 'riwayat',
                label: 'Riwayat periode',
                content: <RiwayatPeriode periode={s.semua_periode} kelola={kelola} onPilih={setPeriodeId} onUbah={(x) => setForm({ jenis: 'periode', data: x })} onHapus={setHapusP} />,
              },
            ]}
          />
        </>
      )}
      {s.pengurus_tanpa_periode > 0 && <Alert variant="warning">{s.pengurus_tanpa_periode} pengurus lama belum masuk periode mana pun.</Alert>}
      {form?.jenis === 'pengurus' && <FormPengurus susunan={s} pengurus={form.data} open onOpenChange={(o) => !o && setForm(null)} />}
      {form?.jenis === 'periode' && <FormPeriode susunan={s} periode={form.data} open onOpenChange={(o) => !o && setForm(null)} />}
      {form?.jenis === 'serah' && p && <DialogSerahTerima susunan={s} open onOpenChange={(o) => !o && setForm(null)} />}
      {lepas && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setLepas(null)}
          title={`Akhiri jabatan ${lepas.nama ?? lepas.nim}?`}
          description={`${lepas.jabatan} berakhir hari ini dan tetap tersimpan di riwayat periode ${p?.nama ?? ''}.`}
          confirmLabel="Akhiri jabatan"
          tone="warning"
          onConfirm={async () => {
            try {
              await siakad.request({ method: 'PUT', path: `/v1/kemahasiswaan/pengurus/${lepas.id}`, body: { aktif: false, selesai: new Date().toISOString().slice(0, 10) } });
              segarkan();
              toast.add({ title: 'Jabatan diakhiri', type: 'success' });
            } catch (e) {
              toast.add({ title: 'Gagal', description: pesanGalat(e), type: 'error' });
            }
          }}
        />
      )}
      {hapusP && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setHapusP(null)}
          title={`Hapus periode ${hapusP.nama}?`}
          description="Hanya periode tanpa pengurus yang bisa dihapus."
          confirmLabel="Hapus periode"
          tone="danger"
          onConfirm={async () => {
            try {
              await siakad.request({ method: 'POST', path: `/v1/kemahasiswaan/ormawa/${s.ormawa.id}/periode/${hapusP.id}/hapus` });
              segarkan();
              setPeriodeId(null);
            } catch (e) {
              toast.add({ title: 'Tidak bisa dihapus', description: pesanGalat(e), type: 'error' });
            }
          }}
        />
      )}
    </div>
  );
}

function RiwayatPeriode({ periode, kelola, onPilih, onUbah, onHapus }: { periode: PeriodeOrmawa[]; kelola: boolean; onPilih: (id: number) => void; onUbah: (p: PeriodeOrmawa) => void; onHapus: (p: PeriodeOrmawa) => void }) {
  const kolom: DataColumn<PeriodeOrmawa>[] = [
    { key: 'nama', header: 'Periode', cell: (r) => <strong>{r.nama}</strong>, mobile: 'title' },
    { key: 'masa', header: 'Masa', cell: (r) => masa(r) },
    { key: 'ketua', header: 'Ketua', cell: (r) => teksOrang(r.ketua) ?? <span className="u-ormawa-redup">Belum ada</span> },
    { key: 'jumlah_pengurus', header: 'Pengurus', align: 'end', cell: (r) => r.jumlah_pengurus ?? 0 },
    { key: 'sk', header: 'SK kepengurusan', cell: (r) => r.sk?.nomor ?? r.nomor_sk ?? <span className="u-ormawa-redup">Belum ada SK</span> },
    { key: 'serah', header: 'Serah terima', cell: (r) => (r.serah_terima ? tgl(r.serah_terima.tanggal) : '—'), defaultHidden: true },
    { key: 'status', header: 'Status', shrink: true, cell: (r) => <Badge variant={VARIAN_PERIODE[r.status]}>{r.status_label}</Badge>, mobile: 'badge' },
  ];
  return (
    <DataTable
      columns={kolom}
      rows={periode}
      rowKey={(r) => String(r.id)}
      pagination={false}
      onRowClick={(r) => onPilih(r.id)}
      rowActions={(r) => [
        { label: 'Lihat susunan', icon: <History />, onSelect: () => onPilih(r.id) },
        ...(kelola ? [{ label: 'Ubah periode dan SK', icon: <Pencil />, onSelect: () => onUbah(r) }] : []),
        ...(kelola && !r.jumlah_pengurus ? [{ type: 'separator' as const }, { label: 'Hapus', icon: <Trash2 />, destructive: true, onSelect: () => onHapus(r) }] : []),
      ]}
    />
  );
}

// ================================================================ Kelola
export interface KelolaOrmawaProps {
  className?: string;
}

/**
 * Daftar ormawa (tingkat, ketua dan pembina periode berjalan, SK) dengan saringan, tambah/ubah ormawa, dan panel detail
 * (susunan, bagan pengurus, periode & SK, serah terima).
 */
export function KelolaOrmawa({ className }: KelolaOrmawaProps) {
  const q = useStrukturKemahasiswaan({ semua: true });
  const [saring, setSaring] = React.useState<FilterValues>({});
  const [pilih, setPilih] = React.useState<OrmawaStruktur | null>(null);
  const [form, setForm] = React.useState<{ ormawa?: Partial<IsiOrmawa> & { id?: number } } | null>(null);
  const siakad = useSiakad();
  const bukaUbah = async (o: OrmawaStruktur) => {
    const r = await siakad.request<IsiOrmawa & { id: number }>({ method: 'GET', path: `/v1/kemahasiswaan/ormawa/${o.id}` });
    if (r.data) setForm({ ormawa: r.data });
  };
  const rows = React.useMemo(() => {
    const kata = String(saring.q ?? '').toLowerCase().trim();
    return (q.data?.ormawa ?? []).filter((o) =>
      (!saring.jenis || o.jenis === saring.jenis) && (!saring.tingkat || o.tingkat === saring.tingkat) && (!saring.perhatian || o.periode === null || o.ketua === null || o.pembina === null || o.sk === null)
      && (!kata || [o.nama, o.kode, o.bidang, teksOrang(o.ketua), o.pembina?.nama].some((x) => x && x.toLowerCase().includes(kata))));
  }, [q.data, saring]);
  const kolom: DataColumn<OrmawaStruktur>[] = [
    { key: 'nama', header: 'Organisasi', cell: (r) => (<div className="u-ormawa-sel-nama"><strong>{r.nama}</strong><span>{[r.kode, r.bidang].filter(Boolean).join(' · ')}</span></div>), value: (r) => r.nama, sortable: true, mobile: 'title' },
    { key: 'jenis', header: 'Jenis', cell: (r) => <Badge variant="neutral">{r.jenis_label}</Badge>, value: (r) => r.jenis, sortable: true, mobile: 'badge' },
    { key: 'tingkat', header: 'Tingkat', cell: (r) => LABEL_TINGKAT_ORMAWA[r.tingkat], value: (r) => r.tingkat, sortable: true },
    { key: 'ketua', header: 'Ketua', cell: (r) => teksOrang(r.ketua) ?? <span className="u-ormawa-redup">{r.periode ? 'Belum ada' : '—'}</span>, value: (r) => teksOrang(r.ketua) ?? '' },
    { key: 'pembina', header: 'Pembina', cell: (r) => r.pembina?.nama ?? r.pembina?.nidn ?? <span className="u-ormawa-redup">Belum ada</span>, value: (r) => r.pembina?.nama ?? '' },
    { key: 'periode', header: 'Periode', cell: (r) => (r.periode ? r.periode.nama : <Badge variant="warning">Belum ada</Badge>), value: (r) => r.periode?.nama ?? '' },
    { key: 'sk', header: 'SK kepengurusan', cell: (r) => r.sk?.nomor ?? <span className="u-ormawa-redup">Belum ada</span>, value: (r) => r.sk?.nomor ?? '', defaultHidden: false },
    { key: 'jumlah_pengurus', header: 'Pengurus', align: 'end', cell: (r) => r.jumlah_pengurus, value: (r) => r.jumlah_pengurus, sortable: true },
  ];
  return (
    <div className={cn('u-ormawa', className)}>
      <DataTable
        columns={kolom}
        rows={rows}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
        rowKey={(r) => String(r.id)}
        onRowClick={setPilih}
        exportCsv="organisasi-mahasiswa"
        rowActions={(r) => [
          { label: 'Susunan & periode', icon: <Network />, onSelect: () => setPilih(r) },
          { label: 'Ubah organisasi', icon: <Pencil />, onSelect: () => void bukaUbah(r) },
        ]}
        toolbar={
          <FilterBar
            value={saring}
            onValueChange={setSaring}
            resultCount={rows.length}
            resultLabel="organisasi"
            search={{ placeholder: 'Cari nama, kode, ketua, pembina' }}
            fields={[
              { key: 'jenis', label: 'Jenis', type: 'select', options: (Object.keys(LABEL_JENIS_ORMAWA) as JenisOrmawa[]).map((j) => ({ value: j, label: LABEL_JENIS_ORMAWA[j] })) },
              { key: 'tingkat', label: 'Tingkat', type: 'select', options: (Object.keys(LABEL_TINGKAT_ORMAWA) as TingkatOrmawa[]).map((j) => ({ value: j, label: LABEL_TINGKAT_ORMAWA[j] })) },
              { key: 'perhatian', label: 'Perlu dilengkapi', type: 'boolean' },
            ]}
          />
        }
        actions={<Button size="sm" onClick={() => setForm({})}><Plus /> Tambah organisasi</Button>}
      />
      {pilih && (
        <Dialog open onOpenChange={(o) => !o && setPilih(null)} title={pilih.nama} description="Susunan pengurus, bagan, periode kepengurusan, dan SK" size="full" side="right">
          <DetailOrmawa id={pilih.id} ringkas={pilih} />
        </Dialog>
      )}
      {form && <FormOrmawa ormawa={form.ormawa} open onOpenChange={(o) => !o && setForm(null)} />}
    </div>
  );
}

// ================================================================ Riwayat mahasiswa
export interface RiwayatOrganisasiMahasiswaProps {
  /** NIM (pengelola) atau "saya" (aplikasi profil, /v1/profil/saya/organisasi-mahasiswa). */
  nim: string | 'saya';
  judul?: React.ReactNode;
  /** Sembunyikan seluruh komponen bila tidak ada riwayat. Untuk `saya`, pengguna bukan mahasiswa/alumni selalu disembunyikan. */
  sembunyiBilaKosong?: boolean;
  className?: string;
}

/** Riwayat organisasi mahasiswa: ormawa, jabatan, periode, dan SK kepengurusan (tercatat Kemahasiswaan). */
export function RiwayatOrganisasiMahasiswa({ nim, judul = 'Organisasi kemahasiswaan', sembunyiBilaKosong, className }: RiwayatOrganisasiMahasiswaProps) {
  const q = useRiwayatOrganisasi(nim);
  if (q.loading && !q.data) return <Skeleton height={120} />;
  if (q.error) return sembunyiBilaKosong ? null : <GalatApi error={q.error} onRetry={q.refetch} />;
  if (q.data === null) return null;
  const rows = q.data ?? [];
  if (!rows.length && sembunyiBilaKosong) return null;
  return (
    <section className={cn('u-ormawa u-ormawa-riwayat', className)}>
      {judul && (
        <header className="u-ormawa-riwayat-kepala">
          <h3>{judul}</h3>
          <p>Kepengurusan organisasi mahasiswa yang ditetapkan Kemahasiswaan, beserta SK kepengurusannya.</p>
        </header>
      )}
      {!rows.length ? (
        <Empty icon={<UsersRound />} title="Belum ada riwayat organisasi" description="Jabatan di BEM, DPM, HIMA, atau UKM yang ditetapkan Kemahasiswaan akan tampil di sini." />
      ) : (
        <ol className="u-ormawa-linimasa">
          {rows.map((r) => (
            <li key={r.id} data-berjalan={r.berjalan || undefined}>
              <div className="u-ormawa-linimasa-titik" aria-hidden />
              <div className="u-ormawa-linimasa-isi">
                <div className="u-ormawa-lencana-baris">
                  <Badge variant="neutral">{r.ormawa.jenis_label}</Badge>
                  {r.berjalan ? <Badge variant="success">Sedang menjabat</Badge> : r.mulai > new Date().toISOString().slice(0, 10) ? <Badge variant="warning">Belum mulai</Badge> : <Badge variant="info">Selesai</Badge>}
                </div>
                <strong>{r.jabatan}</strong>
                <span>{r.ormawa.nama}</span>
                <span className="u-ormawa-redup">
                  {[r.periode ? `Periode ${r.periode.nama}` : null, masa(r)].filter(Boolean).join(' · ')}
                </span>
                <span className="u-ormawa-sk">
                  <ScrollText aria-hidden />
                  {r.sk?.nomor ? `SK ${r.sk.nomor}${r.sk.tanggal ? `, ${tgl(r.sk.tanggal)}` : ''}${r.sk.penerbit?.nama ? ` (${r.sk.penerbit.nama})` : ''}` : 'SK kepengurusan belum tercatat'}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
