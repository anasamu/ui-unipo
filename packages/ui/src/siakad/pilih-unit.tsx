'use client';
import * as React from 'react';
import { Popover as BasePopover } from '@base-ui/react/popover';
import {
  AlertTriangle, Building, Building2, Check, ChevronRight, ChevronsDownUp, ChevronsUpDown, Flag, GraduationCap, Info, Landmark, Layers, RotateCw, School, Search, ServerCog,
  ShieldCheck, X,
} from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { Spinner } from '../components/actions';
import type { ControlSize } from '../components/forms';
import { GAYA_JENIS_BAGAN } from '../components/bagan-organisasi';
import { susunPohon, type NodePohon } from '../components/pohon';
import { useSiakadQuery } from './provider';
import { namaRapi } from './prodi';

// ================================================================ Pemilih unit organisasi (induk_unit) berbentuk pohon

/** ID unit (induk_unit.id). Angka dari API; string diterima untuk nilai dari formulir. */
export type IdUnit = number | string;

/** Satu unit organisasi (baris datar `{ id, induk_id }`, mis. dari `/v1/induk/unit-pohon` atau `/v1/sk/penerbit`). */
export interface UnitOrganisasi {
  id: IdUnit;
  induk_id?: IdUnit | null;
  kode?: string | null;
  /** universitas, rektorat, biro, fakultas, prodi, lembaga, upt, bagian, unit. */
  jenis?: string | null;
  nama: string;
  singkatan?: string | null;
  kode_fakultas?: string | null;
  kode_prodi?: string | null;
  /** Bawaan aktif bila tidak diisi. */
  aktif?: boolean | number | null;
  koordinasi?: boolean | number | null;
  /** Kampus tempat unit tersedia (m_kampus.idkp); kosong = semua kampus. */
  kampus?: string[] | null;
}

/** Ikon per jenis unit, sama dengan Pustikom » Organisasi & pejabat. */
export const IKON_JENIS_UNIT: Record<string, React.ReactNode> = {
  universitas: <Landmark />,
  rektorat: <Flag />,
  biro: <Building />,
  fakultas: <School />,
  prodi: <GraduationCap />,
  lembaga: <ShieldCheck />,
  upt: <ServerCog />,
  bagian: <Layers />,
  unit: <Building2 />,
};

const warnaJenis = (j?: string | null) => (GAYA_JENIS_BAGAN[j ?? ''] ?? GAYA_JENIS_BAGAN.unit).warna;

/** Label jenis unit, mis. "Program studi". */
export function labelJenisUnit(jenis?: string | null): string {
  const g = GAYA_JENIS_BAGAN[jenis ?? ''];
  if (g) return g.label;
  return jenis ? jenis.charAt(0).toUpperCase() + jenis.slice(1) : 'Unit';
}

/**
 * Nama unit yang enak dibaca: "FAKULTAS HUKUM" → "Fakultas Hukum", "Program Studi ILMU HUKUM" → "Program Studi Ilmu Hukum".
 * Singkatan pendek (WR I, LP2M, UPT) tidak diubah.
 */
export function namaUnitRapi(nama?: string | null): string {
  const t = (nama ?? '').trim();
  if (!t) return '';
  const kata = t.split(/\s+/);
  let i = kata.length;
  while (i > 0 && !/\p{Ll}/u.test(kata[i - 1])) i--;
  const ekor = kata.slice(i).join(' ');
  if (ekor.replace(/[^\p{L}]/gu, '').length < 6) return t;
  return [...kata.slice(0, i), namaRapi(ekor)].join(' ');
}

const aktifUnit = (u: UnitOrganisasi) => u.aktif === undefined || u.aktif === null || Boolean(Number(u.aktif));

/** Kotak ikon jenis unit berwarna (Universitas, Rektorat, Fakultas, Program studi, Biro, Lembaga, UPT, …). */
export function IkonJenisUnit({ jenis, size = 'md', className }: { jenis?: string | null; size?: 'sm' | 'md'; className?: string }) {
  return (
    <span className={cn('u-unit-ikon', className)} data-size={size} style={{ '--u-unit-warna': warnaJenis(jenis) } as React.CSSProperties} aria-hidden>
      {IKON_JENIS_UNIT[jenis ?? ''] ?? IKON_JENIS_UNIT.unit}
    </span>
  );
}

/** Lencana jenis unit berwarna, warnanya sama dengan bagan organisasi. */
export function LencanaJenisUnit({ jenis, className }: { jenis?: string | null; className?: string }) {
  return (
    <span className={cn('u-unit-lencana', className)} style={{ '--u-unit-warna': warnaJenis(jenis) } as React.CSSProperties}>
      {labelJenisUnit(jenis)}
    </span>
  );
}

// ---------------------------------------------------------------- data

type UnitPohonApi = UnitOrganisasi & { turunan?: UnitPohonApi[] };

function ratakan(rows: UnitPohonApi[], induk: IdUnit | null = null, out: UnitOrganisasi[] = []): UnitOrganisasi[] {
  for (const r of rows) {
    const { turunan, ...u } = r;
    out.push({ ...u, induk_id: u.induk_id ?? induk });
    if (Array.isArray(turunan) && turunan.length) ratakan(turunan, u.id, out);
  }
  return out;
}

/**
 * Semua unit organisasi (aktif dan nonaktif) dari `GET /v1/induk/unit-pohon` (scope `induk:read`), datar dan berurutan
 * seperti struktur. Satu permintaan ter-cache dibagi semua pemakai di halaman; muat ulang dengan `invalidateSiakad('induk')`.
 */
export function useUnitOrganisasi({ enabled = true }: { enabled?: boolean } = {}) {
  const q = useSiakadQuery<UnitPohonApi[]>(['induk/unit-pohon', 'semua'], (s, signal) => s.request<UnitPohonApi[]>({ method: 'GET', path: '/v1/induk/unit-pohon' }, { signal }), {
    staleTime: 5 * 60_000,
    enabled,
  });
  const data = React.useMemo(() => (Array.isArray(q.data) ? ratakan(q.data) : undefined), [q.data]);
  return { data, loading: q.loading, error: q.error, refetch: q.refetch };
}

/** Leluhur unit dari akar sampai induk langsung. */
export function leluhurUnit(id: IdUnit, data: readonly UnitOrganisasi[]): UnitOrganisasi[] {
  const peta = new Map(data.map((u) => [String(u.id), u]));
  const out: UnitOrganisasi[] = [];
  let x = peta.get(String(id));
  for (let n = 0; x && x.induk_id != null && n < 30; n++) {
    x = peta.get(String(x.induk_id));
    if (x) out.unshift(x);
  }
  return out;
}

const pendek = (u: UnitOrganisasi) => (u.singkatan && u.singkatan.length <= 16 ? u.singkatan : namaUnitRapi(u.nama));

/**
 * Jalur ringkas unit, mis. "Rektorat › WR I" untuk BAAK. Akar universitas dilewati; `maks` tingkat terakhir saja.
 */
export function jalurUnit(id: IdUnit, data: readonly UnitOrganisasi[], { maks = 3, pemisah = ' › ' }: { maks?: number; pemisah?: string } = {}): string {
  const l = leluhurUnit(id, data).filter((u, i) => !(i === 0 && u.jenis === 'universitas'));
  return l.slice(-maks).map(pendek).join(pemisah);
}

// ---------------------------------------------------------------- props

interface PilihUnitDasar {
  /** Sumber unit sendiri (mis. dari `/v1/sk/penerbit`). Tanpa ini dimuat dari `/v1/induk/unit-pohon` (ter-cache). */
  data?: readonly UnitOrganisasi[];
  /** Dipakai bila `/v1/induk/unit-pohon` gagal dimuat (mis. klien API tanpa scope `induk:read`), mis. daftar unit dari API modul. */
  dataCadangan?: readonly UnitOrganisasi[];
  /** Hanya jenis ini yang bisa dipilih, mis. `['fakultas', 'prodi']`. Induknya tetap tampil sebagai jalur (tidak bisa dipilih). */
  jenis?: readonly string[];
  /** Hanya unit ini (ID atau kode) dan turunannya, mis. satu fakultas. Bisa beberapa. */
  akar?: IdUnit | readonly IdUnit[] | null;
  /** Unit ini dan seluruh turunannya tidak bisa dipilih (mis. memilih induk unit yang sedang diubah). */
  kecuali?: IdUnit | null;
  /** false = unit tampil redup dan tidak bisa dipilih, dengan `alasan` sebagai keterangan. */
  boleh?: (u: UnitOrganisasi) => boolean;
  /** Alasan unit tidak boleh dipilih (teks atau per unit). Bawaan "Tidak bisa dipilih di formulir ini." */
  alasan?: string | ((u: UnitOrganisasi) => string);
  /** Unit yang tidak bisa dipilih: daftar ID, atau `{ [id]: alasan }`. */
  nonaktifkan?: readonly IdUnit[] | Readonly<Record<string, string>>;
  /** Sembunyikan unit yang tidak boleh dipilih (bawaan: tampil redup dengan alasan). Induk unit yang boleh tetap tampil. */
  sembunyikanTerlarang?: boolean;
  /** Keterangan kecil per unit (lencana), mis. `(u) => pencatat.has(u.id) ? 'Anda pencatat SK' : null`. */
  keterangan?: (u: UnitOrganisasi) => React.ReactNode;
  /** Hanya unit yang tersedia di kampus ini (m_kampus.idkp). */
  kampus?: string | null;
  /** Tawarkan juga unit nonaktif (mis. saringan daftar lama). Bawaan: hanya unit aktif; nilai lama nonaktif tetap tampil berperingatan. */
  semua?: boolean;
  /** Tingkat yang terbuka di awal (0 = hanya akar). Bawaan: sampai tingkat fakultas terlihat. */
  buka?: number;
  placeholder?: string;
  /** Placeholder kotak cari. */
  placeholderCari?: string;
  disabled?: boolean;
  /** Tombol kosongkan (×). Bawaan true. */
  kosongkan?: boolean;
  invalid?: boolean;
  required?: boolean;
  /** Nama isian tersembunyi untuk formulir HTML biasa (nilai = ID). */
  name?: string;
  id?: string;
  size?: ControlSize;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  /** Tampilkan status memuat (mis. `data` sendiri masih dimuat). */
  memuat?: boolean;
  /** Pesan bila tidak ada unit sama sekali. */
  teksKosong?: React.ReactNode;
}

export interface PilihUnitTunggalProps extends PilihUnitDasar {
  multiple?: false;
  value?: IdUnit | null;
  defaultValue?: IdUnit | null;
  /** ID (angka) dan baris unit; null saat dikosongkan. */
  onValueChange?: (id: number | null, unit: UnitOrganisasi | null) => void;
}

export interface PilihUnitBanyakProps extends PilihUnitDasar {
  multiple: true;
  value?: readonly IdUnit[] | null;
  defaultValue?: readonly IdUnit[] | null;
  onValueChange?: (id: number[], unit: UnitOrganisasi[]) => void;
  /** Batas jumlah unit. */
  maks?: number;
}

export type PilihUnitProps = PilihUnitTunggalProps | PilihUnitBanyakProps;

// ---------------------------------------------------------------- pohon

interface Butir {
  u: UnitOrganisasi;
  key: string;
  nama: string;
  /** Tidak bisa dipilih: jenis di luar `jenis` (jalur/induk saja). */
  konteks: boolean;
  /** Tidak boleh dipilih, dengan alasan. */
  alasan: string | null;
  nonaktif: boolean;
}

const teksCari = (b: Butir) => `${b.u.nama} ${b.nama} ${b.u.kode ?? ''} ${b.u.singkatan ?? ''} ${b.u.kode_prodi ?? ''} ${b.u.kode_fakultas ?? ''}`.toLowerCase();

function Sorot({ teks, kata }: { teks: string; kata: string }) {
  if (!kata) return <>{teks}</>;
  const i = teks.toLowerCase().indexOf(kata);
  if (i < 0) return <>{teks}</>;
  return (
    <>
      {teks.slice(0, i)}
      <mark>{teks.slice(i, i + kata.length)}</mark>
      {teks.slice(i + kata.length)}
    </>
  );
}

const idUnik = () => `u-pu-${Math.random().toString(36).slice(2, 9)}`;

/**
 * Pemilih unit organisasi berbentuk pohon, satu komponen untuk SEMUA isian unit (unit penerbit SK, unit pejabat, lingkup
 * peran, unit kerja, unit pengusul, …). Pohon bertingkat dengan garis penghubung, ikon dan lencana jenis berwarna (sama
 * dengan Pustikom » Organisasi & pejabat), kode/singkatan, lipat/buka (bawaan terbuka sampai tingkat fakultas), cari dengan
 * jalur induk ("Rektorat › WR I › BAAK"), papan ketik penuh (↑ ↓, Enter, ← → lipat/buka), tunggal atau banyak.
 *
 * Unit nonaktif tidak ditawarkan; nilai lama yang nonaktif tetap tampil dengan peringatan. Unit yang tidak boleh dipilih
 * tampil redup beserta alasannya (`boleh`, `nonaktifkan`, `kecuali`), tidak disembunyikan diam-diam.
 *
 * ```tsx
 * <PilihUnit value={unitId} onValueChange={(id) => setUnitId(id)} />
 * <PilihUnit jenis={['fakultas', 'prodi']} akar={fakultasId} value={unitId} onValueChange={setUnitId} />
 * <PilihUnit multiple value={ids} onValueChange={setIds} placeholder="Semua unit" />
 * <PilihUnit data={penerbit} boleh={(u) => bolehCatat(u.id)} alasan="Anda bukan pencatat SK unit ini" keterangan={(u) => bolehCatat(u.id) && 'Pencatat SK'} … />
 * ```
 */
export function PilihUnit(props: PilihUnitProps) {
  const {
    data: dataLuar, dataCadangan, jenis, akar, kecuali, boleh, alasan: alasanProp, nonaktifkan, sembunyikanTerlarang, keterangan, kampus, semua, buka, placeholder, placeholderCari,
    disabled, kosongkan = true, invalid, required, name, id, size, className, memuat, teksKosong,
  } = props;
  const banyak = props.multiple === true;
  const muat = useUnitOrganisasi({ enabled: !dataLuar });
  const cadangan = !dataLuar && !muat.data && muat.error && dataCadangan ? dataCadangan : undefined;
  const sumber = dataLuar ?? muat.data ?? cadangan;
  const loading = memuat || (!dataLuar && muat.loading && !muat.data);

  // ---- nilai
  const awal = (): string[] => {
    const v = props.value !== undefined ? props.value : props.defaultValue;
    if (v == null || v === '') return [];
    return Array.isArray(v) ? v.map(String) : [String(v)];
  };
  const [inner, setInner] = React.useState<string[]>(awal);
  const terkendali = props.value !== undefined;
  const nilaiLuar = props.value;
  const nilai = React.useMemo<string[]>(() => {
    if (!terkendali) return inner;
    if (nilaiLuar == null || nilaiLuar === '') return [];
    return Array.isArray(nilaiLuar) ? nilaiLuar.map(String) : [String(nilaiLuar)];
  }, [terkendali, nilaiLuar, inner]);
  const nilaiSet = React.useMemo(() => new Set(nilai), [nilai]);

  // ---- susun daftar yang ditawarkan
  const peta = React.useMemo(() => new Map((sumber ?? []).map((u) => [String(u.id), u])), [sumber]);
  const akarKey = React.useMemo(() => {
    if (akar == null || akar === '') return null;
    const daftar = (Array.isArray(akar) ? akar : [akar]) as IdUnit[];
    const s = new Set<string>();
    for (const a of daftar) {
      const k = String(a);
      if (peta.has(k)) s.add(k);
      else {
        const byKode = (sumber ?? []).find((u) => u.kode === k || (u.jenis === 'fakultas' && u.kode_fakultas === k) || (u.jenis === 'prodi' && u.kode_prodi === k));
        if (byKode) s.add(String(byKode.id));
      }
    }
    return s;
  }, [akar, peta, sumber]);
  const jenisKey = jenis ? jenis.join(',') : '';
  const nonaktifkanKey = JSON.stringify(nonaktifkan ?? null);

  const { nodes, butir } = React.useMemo(() => {
    const rows = sumber ?? [];
    const anak = new Map<string, UnitOrganisasi[]>();
    for (const u of rows) {
      const p = u.induk_id == null ? '' : String(u.induk_id);
      anak.set(p, [...(anak.get(p) ?? []), u]);
    }
    const turunanDari = (k: string, out = new Set<string>()) => {
      for (const c of anak.get(k) ?? []) {
        const ck = String(c.id);
        if (!out.has(ck)) {
          out.add(ck);
          turunanDari(ck, out);
        }
      }
      return out;
    };
    // Unit dasar: aktif (atau `semua`), tersedia di kampus, dengan seluruh induknya juga tampil.
    const tampilSendiri = (u: UnitOrganisasi) => (semua || aktifUnit(u)) && (!kampus || !u.kampus?.length || u.kampus.includes(kampus));
    const tampil = new Set<string>();
    for (const u of rows) {
      let ok = true;
      for (let x: UnitOrganisasi | undefined = u, n = 0; x && n < 30; x = x.induk_id == null ? undefined : peta.get(String(x.induk_id)), n++) {
        if (!tampilSendiri(x)) {
          ok = false;
          break;
        }
      }
      if (ok) tampil.add(String(u.id));
    }
    // Nilai lama (mis. unit yang kini nonaktif) tetap tampil bersama jalurnya.
    for (const k of nilaiSet) {
      for (let x = peta.get(k), n = 0; x && n < 30; x = x.induk_id == null ? undefined : peta.get(String(x.induk_id)), n++) tampil.add(String(x.id));
    }
    // Batas akar.
    let dalamAkar: Set<string> | null = null;
    if (akarKey) {
      dalamAkar = new Set<string>();
      for (const a of akarKey) {
        dalamAkar.add(a);
        turunanDari(a, dalamAkar);
      }
    }
    const larangKecuali = kecuali != null && kecuali !== '' ? turunanDari(String(kecuali), new Set([String(kecuali)])) : null;
    const jenisSet = jenis?.length ? new Set(jenis) : null;
    const nonaktifkanPeta: Record<string, string> = !nonaktifkan
      ? {}
      : Array.isArray(nonaktifkan)
        ? Object.fromEntries((nonaktifkan as IdUnit[]).map((x) => [String(x), '']))
        : (nonaktifkan as Record<string, string>);
    const alasanBawaan = (u: UnitOrganisasi) => (typeof alasanProp === 'function' ? alasanProp(u) : alasanProp) || 'Tidak bisa dipilih di formulir ini.';

    const daftar: Butir[] = [];
    for (const u of rows) {
      const k = String(u.id);
      if (!tampil.has(k) || (dalamAkar && !dalamAkar.has(k))) continue;
      let al: string | null = null;
      if (larangKecuali?.has(k)) al = String(u.id) === String(kecuali) ? 'Unit yang sedang diubah.' : 'Turunan unit yang sedang diubah.';
      else if (k in nonaktifkanPeta) al = nonaktifkanPeta[k] || alasanBawaan(u);
      else if (boleh && !boleh(u)) al = alasanBawaan(u);
      daftar.push({ u, key: k, nama: namaUnitRapi(u.nama), konteks: Boolean(jenisSet && !jenisSet.has(u.jenis ?? '')), alasan: al, nonaktif: !aktifUnit(u) });
    }
    // Buang unit konteks (dan yang terlarang bila disembunyikan) yang tidak punya turunan terpilihkan.
    const pakai = new Set<string>();
    const bisa = (b: Butir) => !b.konteks && !(sembunyikanTerlarang && b.alasan);
    const byKey = new Map(daftar.map((b) => [b.key, b]));
    for (const b of daftar) {
      if (!bisa(b) && !nilaiSet.has(b.key)) continue;
      for (let x: Butir | undefined = b, n = 0; x && n < 30 && !pakai.has(x.key); n++) {
        pakai.add(x.key);
        x = x.u.induk_id == null ? undefined : byKey.get(String(x.u.induk_id));
      }
    }
    const akhir = daftar.filter((b) => pakai.has(b.key));
    const ns = susunPohon(akhir, { getKey: (b) => b.key, getParent: (b) => (b.u.induk_id == null ? null : String(b.u.induk_id)) });
    return { nodes: ns, butir: new Map(akhir.map((b) => [b.key, b])) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sumber, peta, semua, kampus, nilaiSet, akarKey, kecuali, jenisKey, nonaktifkanKey, boleh, alasanProp, sembunyikanTerlarang]);

  const nodeByKey = React.useMemo(() => new Map(nodes.map((n) => [n.key, n])), [nodes]);
  const bisaDipilih = (b: Butir) => !b.konteks && !b.alasan;

  // ---- buka/tutup
  const batasBuka = React.useMemo(() => {
    if (buka !== undefined) return buka;
    const fak = nodes.filter((n) => n.row.u.jenis === 'fakultas').map((n) => n.depth);
    return fak.length ? Math.max(1, Math.min(...fak)) : 1;
  }, [nodes, buka]);
  const [terbuka, setTerbuka] = React.useState<Set<string> | null>(null);
  const bukaAwal = React.useMemo(() => {
    const s = new Set<string>();
    for (const n of nodes) if (n.childCount > 0 && n.depth < batasBuka) s.add(n.key);
    // Leluhur nilai terpilih ikut terbuka supaya pilihan terlihat.
    for (const k of nilai) for (let n = nodeByKey.get(k); n?.parentKey; n = nodeByKey.get(n.parentKey)) s.add(n.parentKey);
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, batasBuka]);
  const terbukaKini = terbuka ?? bukaAwal;
  const ubahBuka = (k: string, v?: boolean) =>
    setTerbuka((s) => {
      const b = new Set(s ?? bukaAwal);
      if (v ?? !b.has(k)) b.add(k);
      else b.delete(k);
      return b;
    });

  // ---- popup + cari
  const [open, setOpen] = React.useState(false);
  const [kata, setKata] = React.useState('');
  const k = kata.trim().toLowerCase();
  const [aktif, setAktif] = React.useState<string | null>(null);
  const [listId] = React.useState(idUnik);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const daftarRef = React.useRef<HTMLDivElement>(null);
  const pemicuRef = React.useRef<HTMLDivElement>(null);

  const baris = React.useMemo<Array<{ node: NodePohon<Butir>; cari: boolean }>>(() => {
    if (k) {
      const hasil = new Set<string>();
      for (const n of nodes) {
        if (!teksCari(n.row).includes(k)) continue;
        if (!n.row.konteks) hasil.add(n.key);
        else {
          // Induk yang cocok (mis. fakultas saat hanya prodi yang boleh): tawarkan turunannya yang bisa dipilih.
          const i = nodes.indexOf(n);
          for (let j = i + 1; j < nodes.length && nodes[j].depth > n.depth; j++) if (!nodes[j].row.konteks) hasil.add(nodes[j].key);
        }
      }
      return nodes.filter((n) => hasil.has(n.key)).slice(0, 200).map((node) => ({ node, cari: true }));
    }
    const out: Array<{ node: NodePohon<Butir>; cari: boolean }> = [];
    let sembunyi = -1;
    for (const n of nodes) {
      if (sembunyi >= 0) {
        if (n.depth > sembunyi) continue;
        sembunyi = -1;
      }
      out.push({ node: n, cari: false });
      if (n.childCount > 0 && !terbukaKini.has(n.key)) sembunyi = n.depth;
    }
    return out;
  }, [nodes, k, terbukaKini]);

  const idBaris = (key: string) => `${listId}-${key}`;
  React.useEffect(() => {
    if (!open || !aktif) return;
    document.getElementById(idBaris(aktif))?.scrollIntoView({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktif, open]);
  // Kata berubah: butir aktif = hasil pertama yang bisa dipilih.
  React.useEffect(() => {
    if (!open) return;
    if (k) setAktif((baris.find((b) => bisaDipilih(b.node.row)) ?? baris[0])?.node.key ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, open]);

  const bukaPopup = (o: boolean, awalKata = '') => {
    if (o && disabled) return;
    setOpen(o);
    if (o) {
      setKata(awalKata);
      // Tampilkan pilihan pertama di pohon (leluhurnya dibuka).
      const pertama = nilai.find((x) => nodeByKey.has(x));
      if (pertama) {
        setTerbuka((s) => {
          const b = new Set(s ?? bukaAwal);
          for (let n = nodeByKey.get(pertama); n?.parentKey; n = nodeByKey.get(n.parentKey)) b.add(n.parentKey);
          return b;
        });
      }
      setAktif(pertama ?? nodes.find((n) => bisaDipilih(n.row))?.key ?? nodes[0]?.key ?? null);
    }
  };

  // ---- pilih
  const kirim = (keys: string[]) => {
    if (!terkendali) setInner(keys);
    const units = keys.map((x) => peta.get(x)).filter((u): u is UnitOrganisasi => !!u);
    if (props.multiple === true) props.onValueChange?.(keys.map(Number), units);
    else props.onValueChange?.(keys.length ? Number(keys[0]) : null, units[0] ?? null);
  };
  const [pesanKaki, setPesanKaki] = React.useState<string | null>(null);
  const pilih = (key: string) => {
    const b = butir.get(key);
    if (!b) return;
    const n = nodeByKey.get(key);
    if (b.konteks) {
      if (n?.childCount) ubahBuka(key);
      return;
    }
    if (b.alasan) {
      setPesanKaki(b.alasan);
      return;
    }
    if (banyak) {
      const maks = (props as PilihUnitBanyakProps).maks;
      if (nilaiSet.has(key)) kirim(nilai.filter((x) => x !== key));
      else if (maks && nilai.length >= maks) setPesanKaki(`Paling banyak ${maks} unit.`);
      else kirim(urutPohon([...nilai, key]));
    } else {
      kirim([key]);
      setOpen(false);
    }
  };
  const urutPohon = (keys: string[]) => {
    const pos = new Map(nodes.map((n, i) => [n.key, i]));
    return [...keys].sort((a, b) => (pos.get(a) ?? 1e9) - (pos.get(b) ?? 1e9));
  };
  React.useEffect(() => setPesanKaki(null), [aktif, k]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const i = baris.findIndex((b) => b.node.key === aktif);
    const n = i >= 0 ? baris[i].node : undefined;
    const pindah = (j: number) => {
      const b = baris[Math.max(0, Math.min(baris.length - 1, j))];
      if (b) setAktif(b.node.key);
    };
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        pindah(i < 0 ? 0 : i + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        pindah(i < 0 ? 0 : i - 1);
        break;
      case 'PageDown':
        e.preventDefault();
        pindah(i + 8);
        break;
      case 'PageUp':
        e.preventDefault();
        pindah(i - 8);
        break;
      case 'ArrowRight':
        if (k || !n) return;
        e.preventDefault();
        if (n.childCount && !terbukaKini.has(n.key)) ubahBuka(n.key, true);
        else if (n.childCount) pindah(i + 1);
        break;
      case 'ArrowLeft':
        if (k || !n) return;
        e.preventDefault();
        if (n.childCount && terbukaKini.has(n.key)) ubahBuka(n.key, false);
        else if (n.parentKey) setAktif(n.parentKey);
        break;
      case 'Enter':
        e.preventDefault();
        if (n) pilih(n.key);
        break;
      case 'Escape':
        if (kata) {
          e.preventDefault();
          e.stopPropagation();
          setKata('');
        }
        break;
    }
  };

  // ---- tampilan nilai
  const terpilih = nilai.map((x) => peta.get(x) ?? ({ id: x, nama: `Unit #${x}`, jenis: null, __hilang: true } as UnitOrganisasi & { __hilang?: boolean }));
  const satu = !banyak ? terpilih[0] : undefined;
  const jalurTerpilih = (u: UnitOrganisasi) => (sumber ? jalurUnit(u.id, sumber, { maks: 2 }) : '');
  const hilang = (u: UnitOrganisasi) => Boolean((u as { __hilang?: boolean }).__hilang) && !loading;
  const adaCabang = nodes.some((n) => n.childCount > 0);
  const semuaTerbuka = nodes.every((n) => !n.childCount || terbukaKini.has(n.key));
  const aktifButir = aktif ? butir.get(aktif) : undefined;
  const kaki = pesanKaki ?? (aktifButir?.alasan ? `Tidak bisa dipilih: ${aktifButir.alasan}` : null);
  const kosongPlaceholder = loading && nilai.length ? 'Memuat unit…' : (placeholder ?? 'Pilih unit');
  const garisLanjut = (n: NodePohon<Butir>) => {
    // Untuk tiap tingkat leluhur (selain akar): apakah garis vertikalnya berlanjut (leluhur itu bukan anak terakhir).
    const out: boolean[] = [];
    for (let x = n.parentKey ? nodeByKey.get(n.parentKey) : undefined; x && x.depth > 0; x = x.parentKey ? nodeByKey.get(x.parentKey) : undefined) out.unshift(!x.last);
    return out;
  };

  const isiPemicu = banyak ? (
    terpilih.length ? (
      <span className="u-pilih-unit-chip-daftar">
        {terpilih.map((u) => (
          <span key={String(u.id)} className="u-pilih-unit-chip" data-peringatan={dataFlag(!aktifUnit(u) || hilang(u))} title={[jalurTerpilih(u), namaUnitRapi(u.nama)].filter(Boolean).join(' › ')}>
            <IkonJenisUnit jenis={u.jenis} size="sm" />
            <span className="u-pilih-unit-chip-teks">
              {jalurTerpilih(u) && <span className="u-pilih-unit-chip-jalur">{jalurTerpilih(u)} › </span>}
              {pendek(u)}
            </span>
            {!disabled && (
              <span
                role="button"
                tabIndex={-1}
                className="u-pilih-unit-chip-hapus"
                aria-label={`Hapus ${namaUnitRapi(u.nama)}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  kirim(nilai.filter((x) => x !== String(u.id)));
                }}
              >
                <X />
              </span>
            )}
          </span>
        ))}
      </span>
    ) : (
      <span className="u-select-value" data-placeholder="">
        {kosongPlaceholder}
      </span>
    )
  ) : satu && !(loading && (satu as { __hilang?: boolean }).__hilang) ? (
    <span className="u-select-value u-pilih-unit-nilai">
      <IkonJenisUnit jenis={satu.jenis} size="sm" />
      <span className="u-pilih-unit-nilai-teks">
        <span className="u-pilih-unit-nilai-nama">{namaUnitRapi(satu.nama)}</span>
        {(!aktifUnit(satu) || hilang(satu)) ? (
          <span className="u-pilih-unit-nilai-peringatan">
            <AlertTriangle aria-hidden /> {hilang(satu) ? 'tidak ditemukan' : 'nonaktif'}
          </span>
        ) : (
          jalurTerpilih(satu) && <span className="u-pilih-unit-nilai-jalur">{jalurTerpilih(satu)}</span>
        )}
      </span>
    </span>
  ) : (
    <span className="u-select-value" data-placeholder="">
      {kosongPlaceholder}
    </span>
  );

  const bisaKosongkan = kosongkan && !disabled && nilai.length > 0 && !(required && !banyak);

  return (
    <div className={cn('u-pilih-unit', className)} data-banyak={dataFlag(banyak)} ref={pemicuRef}>
      <BasePopover.Root open={open} onOpenChange={(o) => bukaPopup(o)}>
        <BasePopover.Trigger
          render={
            <button
              type="button"
              id={id}
              className="u-select-trigger u-pilih-unit-pemicu"
              data-size={size}
              data-invalid={dataFlag(invalid)}
              data-dengan-hapus={dataFlag(bisaKosongkan)}
              disabled={disabled}
              aria-label={props['aria-label']}
              aria-describedby={props['aria-describedby']}
              aria-haspopup="tree"
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  bukaPopup(true);
                } else if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
                  e.preventDefault();
                  bukaPopup(true, e.key);
                }
              }}
            />
          }
        >
          {isiPemicu}
          <span className="u-select-icon" aria-hidden>
            <ChevronsUpDown />
          </span>
        </BasePopover.Trigger>
        {bisaKosongkan && (
          <button type="button" className="u-pilih-unit-hapus" aria-label={banyak ? 'Kosongkan semua unit' : 'Kosongkan unit'} onClick={() => kirim([])}>
            <X />
          </button>
        )}
        <BasePopover.Portal>
          <BasePopover.Positioner className="u-popup-positioner" side="bottom" align="start" sideOffset={6} collisionPadding={12} collisionAvoidance={{ side: 'flip', align: 'shift', fallbackAxisSide: 'none' }} anchor={pemicuRef}>
            <BasePopover.Popup className="u-pilih-unit-popup" initialFocus={inputRef} aria-label={props['aria-label'] ?? 'Pilih unit organisasi'}>
              <div className="u-pilih-unit-cari">
                <Search aria-hidden />
                <input
                  ref={inputRef}
                  value={kata}
                  onChange={(e) => setKata(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={placeholderCari ?? 'Cari nama, singkatan, atau kode unit'}
                  role="combobox"
                  aria-expanded
                  aria-controls={listId}
                  aria-autocomplete="list"
                  aria-activedescendant={aktif ? idBaris(aktif) : undefined}
                  aria-label="Cari unit"
                  autoComplete="off"
                  spellCheck={false}
                />
                {kata && (
                  <button type="button" className="u-pilih-unit-ikon-tombol" aria-label="Hapus kata cari" onClick={() => { setKata(''); inputRef.current?.focus(); }}>
                    <X />
                  </button>
                )}
              </div>
              <div className="u-pilih-unit-bilah">
                <span>
                  {loading ? 'Memuat…' : k ? `${baris.length} unit cocok` : `${nodes.filter((n) => bisaDipilih(n.row)).length} unit`}
                  {banyak && nilai.length > 0 && ` · ${nilai.length} dipilih`}
                </span>
                {!k && adaCabang && (
                  <button
                    type="button"
                    className="u-pilih-unit-teks-tombol"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setTerbuka(semuaTerbuka ? new Set() : new Set(nodes.filter((n) => n.childCount).map((n) => n.key)))}
                  >
                    {semuaTerbuka ? <ChevronsDownUp aria-hidden /> : <ChevronsUpDown aria-hidden />}
                    {semuaTerbuka ? 'Tutup semua' : 'Buka semua'}
                  </button>
                )}
              </div>
              <div ref={daftarRef} id={listId} role="tree" aria-label="Unit organisasi" aria-multiselectable={banyak || undefined} className="u-pilih-unit-daftar">
                {loading ? (
                  <div className="u-pilih-unit-status">
                    <Spinner size="sm" /> Memuat struktur organisasi…
                  </div>
                ) : !sumber && muat.error ? (
                  <div className="u-pilih-unit-status">
                    <span>Daftar unit tidak bisa dimuat.</span>
                    <button type="button" className="u-pilih-unit-teks-tombol" onClick={() => muat.refetch()}>
                      <RotateCw aria-hidden /> Coba lagi
                    </button>
                  </div>
                ) : !nodes.length ? (
                  <div className="u-pilih-unit-status">{teksKosong ?? 'Belum ada unit organisasi yang bisa dipilih.'}</div>
                ) : !baris.length ? (
                  <div className="u-pilih-unit-status">Tidak ada unit yang cocok dengan “{kata.trim()}”.</div>
                ) : (
                  baris.map(({ node: n, cari }) => {
                    const b = n.row;
                    const dipilih = nilaiSet.has(n.key);
                    const bisa = bisaDipilih(b);
                    const lanjut = cari ? [] : garisLanjut(n);
                    const ket = keterangan?.(b.u);
                    const meta = [b.u.singkatan && b.u.singkatan !== b.nama ? b.u.singkatan : null, b.u.kode && b.u.kode !== b.u.singkatan && b.u.kode.toLowerCase() !== b.u.nama.toLowerCase() ? b.u.kode : null].filter(Boolean).join(' · ');
                    const jalur = cari && sumber ? jalurUnit(b.u.id, sumber, { maks: 3 }) : '';
                    const adaTurunanTerpilih = !cari && banyak && n.childCount > 0 && !terbukaKini.has(n.key) && nilai.some((x) => nodeByKey.get(x)?.row && (nodeByKey.get(x)?.ancestors ?? []).some((a) => a.key === n.key));
                    return (
                      <div
                        key={n.key}
                        id={idBaris(n.key)}
                        role="treeitem"
                        aria-level={n.depth + 1}
                        aria-expanded={!cari && n.childCount ? terbukaKini.has(n.key) : undefined}
                        aria-selected={bisa || dipilih ? dipilih : undefined}
                        aria-disabled={!bisa || undefined}
                        title={b.alasan ?? undefined}
                        className="u-pilih-unit-baris"
                        data-aktif={dataFlag(aktif === n.key)}
                        data-dipilih={dataFlag(dipilih)}
                        data-konteks={dataFlag(b.konteks)}
                        data-terlarang={dataFlag(Boolean(b.alasan))}
                        data-akar={dataFlag(!cari && n.depth === 0)}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseMove={() => aktif !== n.key && setAktif(n.key)}
                        onClick={() => {
                          setAktif(n.key);
                          pilih(n.key);
                        }}
                      >
                        {!cari && n.depth > 0 && (
                          <span className="u-pilih-unit-garis" aria-hidden>
                            {lanjut.map((l, i) => (
                              <span key={i} data-lanjut={dataFlag(l)} />
                            ))}
                            <span data-siku="" data-terakhir={dataFlag(n.last)} />
                          </span>
                        )}
                        {!cari &&
                          (n.childCount ? (
                            <span
                              className="u-pilih-unit-lipat"
                              data-terbuka={dataFlag(terbukaKini.has(n.key))}
                              aria-hidden
                              onClick={(e) => {
                                e.stopPropagation();
                                ubahBuka(n.key);
                              }}
                            >
                              <ChevronRight />
                            </span>
                          ) : (
                            <span className="u-pilih-unit-lipat" data-daun="" aria-hidden />
                          ))}
                        {banyak && (
                          <span className="u-pilih-unit-centang" data-dipilih={dataFlag(dipilih)} aria-hidden>
                            {dipilih && <Check />}
                          </span>
                        )}
                        <IkonJenisUnit jenis={b.u.jenis} />
                        <span className="u-pilih-unit-teks">
                          <span className="u-pilih-unit-nama">
                            <Sorot teks={b.nama} kata={k} />
                          </span>
                          {(jalur || meta) && (
                            <span className="u-pilih-unit-meta">
                              {jalur && <span className="u-pilih-unit-jalur">{jalur}</span>}
                              {jalur && meta ? ' · ' : ''}
                              {meta && <Sorot teks={meta} kata={k} />}
                            </span>
                          )}
                        </span>
                        {adaTurunanTerpilih && <span className="u-pilih-unit-titik" title="Ada unit terpilih di dalamnya" />}
                        {!cari && n.childCount > 0 && !terbukaKini.has(n.key) && <span className="u-pilih-unit-jumlah">{n.descendantCount}</span>}
                        {ket != null && ket !== false && ket !== '' && <span className="u-pilih-unit-ket">{ket}</span>}
                        {b.nonaktif && <span className="u-pilih-unit-ket" data-nada="peringatan">Nonaktif</span>}
                        {b.alasan && <Info className="u-pilih-unit-info" aria-hidden />}
                        <LencanaJenisUnit jenis={b.u.jenis} className="u-pilih-unit-lencana" />
                        {!banyak && <span className="u-pilih-unit-tanda" aria-hidden>{dipilih && <Check />}</span>}
                      </div>
                    );
                  })
                )}
              </div>
              {(kaki || banyak) && (
                <div className="u-pilih-unit-kaki" data-pesan={dataFlag(Boolean(kaki))}>
                  {kaki ? (
                    <span className="u-pilih-unit-kaki-pesan" role="status">
                      <Info aria-hidden /> {kaki}
                    </span>
                  ) : (
                    <span>{nilai.length ? `${nilai.length} unit dipilih` : 'Belum ada unit dipilih'}</span>
                  )}
                  {banyak && (
                    <span className="u-pilih-unit-kaki-aksi">
                      {nilai.length > 0 && (
                        <button type="button" className="u-pilih-unit-teks-tombol" onClick={() => kirim([])}>
                          Kosongkan
                        </button>
                      )}
                      <button type="button" className="u-pilih-unit-selesai" onClick={() => setOpen(false)}>
                        Selesai
                      </button>
                    </span>
                  )}
                </div>
              )}
            </BasePopover.Popup>
          </BasePopover.Positioner>
        </BasePopover.Portal>
      </BasePopover.Root>
      {name && (banyak ? nilai.map((x) => <input key={x} type="hidden" name={name} value={x} />) : <input type="hidden" name={name} value={nilai[0] ?? ''} />)}
    </div>
  );
}

/** Nama unit + jalur ringkas untuk tampilan baca saja (tabel, kartu), dari data ter-cache yang sama dengan PilihUnit. */
export function NamaUnit({ id, data, jalur = true, ikon = true, className }: { id: IdUnit | null | undefined; data?: readonly UnitOrganisasi[]; jalur?: boolean; ikon?: boolean; className?: string }) {
  const muat = useUnitOrganisasi({ enabled: !data && id != null && id !== '' });
  const sumber = data ?? muat.data;
  if (id == null || id === '') return null;
  const u = sumber?.find((x) => String(x.id) === String(id));
  if (!u) return <span className={cn('u-nama-unit', className)}>{muat.loading ? '…' : `Unit #${id}`}</span>;
  const j = jalur && sumber ? jalurUnit(u.id, sumber, { maks: 2 }) : '';
  return (
    <span className={cn('u-nama-unit', className)} title={[j, namaUnitRapi(u.nama)].filter(Boolean).join(' › ')}>
      {ikon && <IkonJenisUnit jenis={u.jenis} size="sm" />}
      <span>
        {namaUnitRapi(u.nama)}
        {j && <span className="u-nama-unit-jalur"> · {j}</span>}
      </span>
    </span>
  );
}

