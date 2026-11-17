'use client';
import * as React from 'react';
import { BadgeCheck, ChevronRight, GraduationCap, Search, ShieldAlert, Users } from 'lucide-react';
import { Badge, type BadgeVariant } from '../components/actions';
import { Input, InputGroup } from '../components/forms';
import { cn } from '../lib/cn';
import { formatDate } from '../lib/format';
import { useSiakadQuery } from './provider';
import { GalatApi } from './galat';

// ================================================================ Data referensi prodi dan fakultas
/** Baris GET /v1/referensi/prodi (kolom m_program_studi + nama_fakultas). */
export interface ProdiReferensi {
  kode_prodi: string;
  nama_prodi: string;
  kode_fak?: string | null;
  nama_fakultas?: string | null;
  /** Kode jenjang PDDikti: A S3, B S2, C S1, D D4, E D3, F D2, G D1, H Sp-1, I Sp-2, J Profesi. */
  kode_jenjang?: string | null;
  /** Peringkat akreditasi: A/B/C, Unggul/Baik Sekali/Baik, atau kosong. */
  kode_akreditasi?: string | null;
  no_sk_ban?: string | null;
  tgl_sk_ban?: string | null;
  tgl_akhir_sk_ban?: string | null;
  /** Status PDDikti: A aktif, N nonaktif, H dihapus, K alih bentuk, M merger, B pembinaan. */
  status_prodi?: string | null;
  gelar?: string | null;
  logo?: string | null;
  [k: string]: unknown;
}
/** Baris GET /v1/referensi/fakultas. `logo` = nama berkas di images/fakultas/ SIAKAD (atau URL lengkap). */
export interface FakultasReferensi {
  kode_fakultas: string;
  nama_fakultas: string;
  logo?: string | null;
  [k: string]: unknown;
}

const JENJANG: Record<string, string> = { A: 'S3', B: 'S2', C: 'S1', D: 'D4', E: 'D3', F: 'D2', G: 'D1', H: 'Sp-1', I: 'Sp-2', J: 'Profesi', X: 'Non-akademik' };
/** Kode jenjang PDDikti ke label: "C" → "S1", "E" → "D3". Label yang sudah jadi ("S1") dikembalikan apa adanya. */
export const jenjangProdi = (kode?: string | null) => (kode ? (JENJANG[kode.trim().toUpperCase()] ?? kode.trim()) : '');

const KECIL = new Set(['dan', 'di', 'ke', 'dari', 'atau', 'untuk', 'pada', 'dengan', 'yang']);
/** "FAKULTAS ILMU SOSIAL DAN ILMU POLITIK" → "Fakultas Ilmu Sosial dan Ilmu Politik". Teks yang sudah campuran tidak diubah. */
export const namaRapi = (s?: string | null) => {
  const t = (s ?? '').trim();
  if (!t || t !== t.toUpperCase()) return t;
  return t.toLowerCase().replace(/[\p{L}\p{N}]+/gu, (w, i: number) => (i > 0 && KECIL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)));
};

/** "S1 Teknik Sipil". */
export const judulProdi = (p: Pick<ProdiReferensi, 'nama_prodi' | 'kode_jenjang'>) => [jenjangProdi(p.kode_jenjang), namaRapi(p.nama_prodi)].filter(Boolean).join(' ');

export type KeadaanAkreditasi = 'berlaku' | 'segera_berakhir' | 'kedaluwarsa' | 'belum';
export interface InfoAkreditasi {
  /** "Unggul", "Baik Sekali", "A", atau "Belum terakreditasi". */
  peringkat: string;
  /** Teks lencana, mis. "Akreditasi B" atau "Unggul". */
  label: string;
  tone: BadgeVariant;
  keadaan: KeadaanAkreditasi;
  /** Tanggal akhir SK BAN-PT/LAM (ISO) bila ada. */
  berlakuSampai: string | null;
  /** Sisa hari sampai berakhir (negatif bila sudah lewat). */
  sisaHari: number | null;
}

const PERINGKAT: Array<[RegExp, string, BadgeVariant]> = [
  [/^(a|unggul|u)$/i, 'Unggul', 'success'],
  [/^(b|baik sekali|bs)$/i, 'Baik Sekali', 'info'],
  [/^(c|baik)$/i, 'Baik', 'warning'],
];
/**
 * Peringkat dan masa berlaku akreditasi prodi dari kolom kode_akreditasi dan tgl_akhir_sk_ban. Huruf lama (A/B/C) tetap
 * ditampilkan sebagai huruf; peringkat IAPS 4.0 (Unggul/Baik Sekali/Baik) ditampilkan sebagai kata. `segeraHari` =
 * batas "segera berakhir" (bawaan 180 hari).
 */
export function akreditasiProdi(p: Pick<ProdiReferensi, 'kode_akreditasi' | 'tgl_akhir_sk_ban'>, segeraHari = 180, kini = Date.now()): InfoAkreditasi {
  const kode = String(p.kode_akreditasi ?? '').trim();
  const akhir = p.tgl_akhir_sk_ban && !/^0000/.test(p.tgl_akhir_sk_ban) ? p.tgl_akhir_sk_ban.slice(0, 10) : null;
  const sisa = akhir ? Math.ceil((new Date(`${akhir}T23:59:59`).getTime() - kini) / 86_400_000) : null;
  if (!kode || kode === '-' || kode === '0' || /^(belum|tidak)/i.test(kode)) {
    return { peringkat: 'Belum terakreditasi', label: 'Belum terakreditasi', tone: 'neutral', keadaan: 'belum', berlakuSampai: akhir, sisaHari: sisa };
  }
  const cocok = PERINGKAT.find(([re]) => re.test(kode));
  const huruf = /^[abc]$/i.test(kode);
  const peringkat = huruf ? kode.toUpperCase() : cocok ? cocok[1] : namaRapi(kode.toUpperCase());
  const keadaan: KeadaanAkreditasi = sisa == null ? 'berlaku' : sisa < 0 ? 'kedaluwarsa' : sisa <= segeraHari ? 'segera_berakhir' : 'berlaku';
  return {
    peringkat,
    label: huruf ? `Akreditasi ${peringkat}` : peringkat,
    tone: cocok?.[2] ?? 'secondary',
    keadaan,
    berlakuSampai: akhir,
    sisaHari: sisa,
  };
}

const STATUS: Record<string, [string, BadgeVariant]> = {
  N: ['Nonaktif', 'neutral'],
  H: ['Dihapus', 'danger'],
  K: ['Alih bentuk', 'neutral'],
  M: ['Merger', 'neutral'],
  B: ['Pembinaan', 'warning'],
};
/** Status prodi PDDikti selain aktif ("A"), untuk lencana. Null bila aktif atau kosong. */
export const statusProdi = (kode?: string | null): { label: string; tone: BadgeVariant } | null => {
  const s =
    STATUS[
      String(kode ?? '')
        .trim()
        .toUpperCase()
    ];
  return s ? { label: s[0], tone: s[1] } : null;
};

// ================================================================ Logo fakultas
let asalBerkasSiakad = 'https://siakad.unipo.ac.id';
/**
 * Alamat situs SIAKAD tempat logo fakultas/prodi disimpan (images/fakultas/, images/prodi/). Bawaan
 * https://siakad.unipo.ac.id; panggil sekali di awal aplikasi bila berbeda (mis. server pengembangan).
 */
export function aturAsalBerkasSiakad(url: string) {
  asalBerkasSiakad = url.replace(/\/+$/, '');
}
/** Nama berkas logo → URL lengkap. URL http(s)/data: dipakai apa adanya. */
export function urlLogoSiakad(logo: string | null | undefined, folder: 'fakultas' | 'prodi'): string | null {
  const t = (logo ?? '').trim();
  if (!t) return null;
  if (/^(https?:|data:|blob:|\/)/.test(t)) return t;
  if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(t)) return null;
  return `${asalBerkasSiakad}/images/${folder}/${encodeURIComponent(t.split('/').pop()!)}`;
}

/** Daftar fakultas (GET /v1/referensi/fakultas), di-cache 10 menit dan dipakai bersama semua logo fakultas. */
export function useFakultasReferensi() {
  return useSiakadQuery<FakultasReferensi[]>(['referensi', 'fakultas'], (s, signal) => s.request({ method: 'GET', path: '/v1/referensi/fakultas' }, { signal }), { staleTime: 600_000 });
}
/** Peta logo fakultas untuk <LogoFakultas>: diam bila gagal (halaman publik tanpa izin referensi tetap tampil monogram). */
function usePetaFakultas(aktif: boolean) {
  const q = useSiakadQuery<FakultasReferensi[]>(
    ['referensi', 'fakultas', 'peta'],
    (s, signal) => s.request<FakultasReferensi[]>({ method: 'GET', path: '/v1/referensi/fakultas' }, { signal }).catch(() => ({ data: [] as FakultasReferensi[] }) as never),
    { staleTime: 600_000, enabled: aktif },
  );
  return q.data;
}
/** Daftar prodi (GET /v1/referensi/prodi), opsional per fakultas. */
export function useProdiReferensi(kodeFakultas?: string | null) {
  return useSiakadQuery<ProdiReferensi[]>(
    ['referensi', 'prodi', kodeFakultas ?? ''],
    (s, signal) => s.request({ method: 'GET', path: '/v1/referensi/prodi', query: kodeFakultas ? { fakultas: kodeFakultas } : undefined }, { signal }),
    { staleTime: 600_000 },
  );
}

const singkatan = (nama: string) => {
  const kata = namaRapi(nama)
    .replace(/^fakultas\s+/i, '')
    .split(/[\s/-]+/)
    .filter((w) => w && !KECIL.has(w.toLowerCase()));
  return ('F' + kata.map((w) => w[0]!.toUpperCase()).join('')).slice(0, 4);
};
const hue = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

export interface LogoFakultasProps {
  /** Kode fakultas; logo dan nama dicari dari /v1/referensi/fakultas bila `logo`/`nama` tidak diisi. */
  kode?: string | null;
  nama?: string | null;
  /** Nama berkas di images/fakultas/ atau URL lengkap. */
  logo?: string | null;
  ukuran?: 'sm' | 'md' | 'lg';
  className?: string;
}
/**
 * Logo fakultas dari SIAKAD. Bila belum diunggah atau gagal dimuat, tampil monogram singkatan fakultas (FT, FIK, FISIP)
 * dengan warna tetap per fakultas.
 */
export function LogoFakultas({ kode, nama, logo, ukuran = 'md', className }: LogoFakultasProps) {
  const perlu = (logo === undefined || nama == null) && !!kode;
  const fak = usePetaFakultas(perlu);
  const baris = perlu ? fak?.find((f) => String(f.kode_fakultas) === String(kode)) : undefined;
  const namaF = nama ?? baris?.nama_fakultas ?? '';
  const src = urlLogoSiakad(logo !== undefined ? logo : baris?.logo, 'fakultas');
  const [gagal, setGagal] = React.useState(false);
  React.useEffect(() => setGagal(false), [src]);
  const h = hue(String(kode ?? namaF));
  return (
    <span
      className={cn('u-logo-fak', className)}
      data-ukuran={ukuran}
      title={namaRapi(namaF) || undefined}
      style={{ '--u-logo-fak-h': h } as React.CSSProperties}
      data-monogram={!src || gagal || undefined}
    >
      {src && !gagal ? <img src={src} alt="" loading="lazy" onError={() => setGagal(true)} /> : <span aria-hidden>{namaF ? singkatan(namaF) : (kode ?? '?')}</span>}
    </span>
  );
}

// ================================================================ Lencana dan baris prodi
/** Lencana akreditasi dengan masa berlaku (tooltip) dan penanda kedaluwarsa/segera berakhir. */
export function LencanaAkreditasi({ prodi, ringkas, className }: { prodi: Pick<ProdiReferensi, 'kode_akreditasi' | 'tgl_akhir_sk_ban' | 'no_sk_ban'>; ringkas?: boolean; className?: string }) {
  const a = akreditasiProdi(prodi);
  const judul = [a.berlakuSampai ? `Berlaku sampai ${formatDate(a.berlakuSampai)}` : null, prodi.no_sk_ban && prodi.no_sk_ban !== '0' ? `SK ${prodi.no_sk_ban}` : null].filter(Boolean).join(' · ');
  return (
    <span className={cn('u-lencana-akred', className)} title={judul || undefined}>
      <Badge variant={a.tone}>
        {a.keadaan !== 'belum' && <BadgeCheck size={12} aria-hidden />}
        {ringkas ? a.peringkat : a.label}
      </Badge>
      {a.keadaan === 'kedaluwarsa' && (
        <Badge variant="danger">
          <ShieldAlert size={12} aria-hidden /> {ringkas ? 'Habis' : 'Masa berlaku habis'}
        </Badge>
      )}
      {a.keadaan === 'segera_berakhir' && <Badge variant="warning">{ringkas ? `${a.sisaHari} hr` : `Berakhir ${a.sisaHari} hari lagi`}</Badge>}
    </span>
  );
}

/** Isi satu baris prodi untuk daftar/pilihan: logo fakultas, "S1 Nama Prodi", kode + fakultas, lencana akreditasi dan status. */
export function BarisProdi({ prodi, ringkas, className }: { prodi: ProdiReferensi; ringkas?: boolean; className?: string }) {
  const st = statusProdi(prodi.status_prodi);
  const jenjang = jenjangProdi(prodi.kode_jenjang);
  return (
    <span className={cn('u-baris-prodi', className)}>
      <LogoFakultas kode={prodi.kode_fak ?? (prodi.kode_fakultas as string | undefined)} nama={prodi.nama_fakultas} ukuran={ringkas ? 'sm' : 'md'} />
      <span className="u-baris-prodi-teks">
        <span className="u-baris-prodi-meta">{[namaRapi(prodi.nama_fakultas), prodi.kode_prodi].filter(Boolean).join(' · ')}</span>
        <span className="u-baris-prodi-nama" title={namaRapi(prodi.nama_prodi)}>
          {namaRapi(prodi.nama_prodi)}
        </span>
      </span>
      <span className="u-baris-prodi-lencana">
        {jenjang && <span className="u-baris-prodi-jenjang">{jenjang}</span>}
        <LencanaAkreditasi prodi={prodi} ringkas />
        {st && <Badge variant={st.tone}>{st.label}</Badge>}
      </span>
    </span>
  );
}

// ================================================================ Daftar prodi
export interface DaftarProdiProps {
  /** Data sendiri; bawaan GET /v1/referensi/prodi. */
  data?: ProdiReferensi[];
  /** Saring satu fakultas. */
  kodeFakultas?: string | null;
  /** `daftar` baris dikelompokkan per fakultas · `kartu` kisi kartu · `ringkas` baris rapat tanpa kelompok. */
  varian?: 'daftar' | 'kartu' | 'ringkas';
  /** Kotak cari (nama, kode, jenjang, fakultas). Bawaan true. */
  cari?: boolean;
  /** Tampilkan prodi nonaktif/dihapus. Bawaan false. */
  semuaStatus?: boolean;
  aktif?: string | null;
  onPilih?: (prodi: ProdiReferensi) => void;
  /** Tautan per prodi, mis. (p) => `/prodi/${p.kode_prodi}`. */
  href?: (prodi: ProdiReferensi) => string;
  className?: string;
}

/**
 * Daftar program studi modern: logo fakultas, jenjang (S1, D3), nama, lencana akreditasi dengan masa berlaku, dan status
 * prodi. Dikelompokkan per fakultas, bisa dicari, dan mengikuti lebar layar (kartu satu kolom di mobile).
 */
export function DaftarProdi({ data, kodeFakultas, varian = 'daftar', cari = true, semuaStatus, aktif, onPilih, href, className }: DaftarProdiProps) {
  const q = useProdiReferensi(kodeFakultas);
  const [kata, setKata] = React.useState('');
  const semua = data ?? q.data ?? [];
  const t = kata.trim().toLowerCase();
  const rows = semua
    .filter((p) => semuaStatus || !statusProdi(p.status_prodi) || statusProdi(p.status_prodi)?.label === 'Pembinaan')
    .filter((p) => !kodeFakultas || !data || String(p.kode_fak) === String(kodeFakultas))
    .filter((p) => !t || `${judulProdi(p)} ${p.kode_prodi} ${p.nama_fakultas ?? ''} ${akreditasiProdi(p).peringkat}`.toLowerCase().includes(t));
  const grup = new Map<string, ProdiReferensi[]>();
  for (const p of rows) {
    const k = String(p.kode_fak ?? p.nama_fakultas ?? '');
    grup.set(k, [...(grup.get(k) ?? []), p]);
  }
  const Butir = ({ p }: { p: ProdiReferensi }) => {
    const isi = <BarisProdi prodi={p} ringkas={varian === 'ringkas'} />;
    const props = { className: 'u-daftar-prodi-butir', 'data-aktif': aktif === p.kode_prodi || undefined };
    if (href)
      return (
        <a href={href(p)} {...props} onClick={onPilih ? () => onPilih(p) : undefined}>
          {isi}
        </a>
      );
    if (onPilih)
      return (
        <button type="button" {...props} onClick={() => onPilih(p)}>
          {isi}
        </button>
      );
    return <div {...props}>{isi}</div>;
  };
  return (
    <div className={cn('u-daftar-prodi', className)} data-varian={varian}>
      {cari && (
        <InputGroup start={<Search aria-hidden />}>
          <Input placeholder="Cari prodi, kode, jenjang, atau akreditasi" value={kata} onChange={(e) => setKata(e.target.value)} aria-label="Cari program studi" />
        </InputGroup>
      )}
      {!data && q.error && <GalatApi error={q.error} onRetry={q.refetch} />}
      {!data && q.loading && !q.data && (
        <div className="u-daftar-prodi-muat" aria-busy>
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="u-skeleton" />
          ))}
        </div>
      )}
      {(data || q.data) && !rows.length && <p className="u-daftar-prodi-kosong">Tidak ada program studi yang cocok.</p>}
      {varian === 'daftar' ? (
        [...grup.entries()].map(([k, ps]) => (
          <section key={k} className="u-daftar-prodi-grup">
            <header>
              <LogoFakultas kode={ps[0]!.kode_fak} nama={ps[0]!.nama_fakultas} ukuran="sm" />
              <h4>{namaRapi(ps[0]!.nama_fakultas) || 'Tanpa fakultas'}</h4>
              <span>{ps.length} prodi</span>
            </header>
            <div className="u-daftar-prodi-isi">
              {ps.map((p) => (
                <Butir key={p.kode_prodi} p={p} />
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className="u-daftar-prodi-isi">
          {rows.map((p) => (
            <Butir key={p.kode_prodi} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

// ================================================================ Label prodi untuk komponen lain
/** Peta kode_prodi → baris referensi, diam bila gagal (halaman publik tanpa izin referensi tetap tampil). */
function usePetaProdi(aktif: boolean) {
  const q = useSiakadQuery<ProdiReferensi[]>(
    ['referensi', 'prodi', 'peta'],
    (s, signal) => s.request<ProdiReferensi[]>({ method: 'GET', path: '/v1/referensi/prodi' }, { signal }).catch(() => ({ data: [] as ProdiReferensi[] }) as never),
    { staleTime: 600_000, enabled: aktif },
  );
  return React.useMemo(() => new Map((q.data ?? []).map((p) => [String(p.kode_prodi), p])), [q.data]);
}

/** Satu baris referensi prodi dari kodenya (cache bersama, diam bila gagal). */
export function useProdiDariKode(kode?: string | null): ProdiReferensi | undefined {
  return usePetaProdi(!!kode).get(String(kode ?? ''));
}

/** Varian tampilan identitas prodi. */
export type VarianLabelProdi = 'baku' | 'ringkas' | 'kartu' | 'header' | 'sidebar' | 'chip' | 'daftar' | 'vertikal';

export interface LabelProdiProps {
  /** Kode prodi; jenjang, fakultas, logo, dan akreditasi dilengkapi dari /v1/referensi/prodi (cache bersama). */
  kode?: string | null;
  /** Nama dari data Anda (dipakai bila referensi belum termuat). */
  nama?: string | null;
  /** Baris prodi lengkap bila sudah ada; tanpa permintaan tambahan. */
  prodi?: Partial<ProdiReferensi> | null;
  /**
   * Tampilan:
   * - `baku` (bawaan): fakultas kecil di atas, nama prodi tebal di bawah, lencana jenjang + akreditasi di kanan.
   * - `ringkas`: satu baris, logo kecil ("S1 Informatika" + akreditasi), untuk tabel padat.
   * - `kartu`: kartu berbingkai dengan masa berlaku dan nomor SK akreditasi.
   * - `header`: besar, untuk kepala halaman/portal prodi.
   * - `sidebar`: rapat untuk brand sidebar.
   * - `chip`: pil sebaris di dalam teks atau sel tabel.
   * - `daftar`: baris daftar dengan panah, bisa diklik.
   * - `vertikal`: logo di atas, rata tengah, untuk kisi.
   */
  varian?: VarianLabelProdi;
  /** Tampilkan lencana akreditasi. Bawaan true. */
  akreditasi?: boolean;
  /** Baris fakultas: `fakultas` (bawaan), `kode`, atau isi sendiri. false = tanpa baris itu. */
  sub?: 'fakultas' | 'kode' | React.ReactNode | false;
  ukuran?: 'sm' | 'md' | 'lg';
  /** Bentuk logo fakultas. Bawaan kotak membulat. */
  bentukLogo?: 'kotak' | 'bulat';
  /** Angka opsional (mis. jumlah mahasiswa aktif dan dosen) di bawah identitas. */
  statistik?: { mahasiswa?: number | null; dosen?: number | null };
  /** Varian `daftar`/`kartu`/`chip` sebagai tombol atau tautan. */
  onClick?: () => void;
  href?: string;
  className?: string;
}

const UKURAN_LOGO: Record<VarianLabelProdi, Record<'sm' | 'md' | 'lg', 'sm' | 'md' | 'lg'>> = {
  baku: { sm: 'sm', md: 'md', lg: 'lg' },
  ringkas: { sm: 'sm', md: 'sm', lg: 'md' },
  kartu: { sm: 'md', md: 'lg', lg: 'lg' },
  header: { sm: 'md', md: 'lg', lg: 'lg' },
  sidebar: { sm: 'sm', md: 'sm', lg: 'md' },
  chip: { sm: 'sm', md: 'sm', lg: 'sm' },
  daftar: { sm: 'sm', md: 'md', lg: 'lg' },
  vertikal: { sm: 'md', md: 'lg', lg: 'lg' },
};
const angka = (n: number) => n.toLocaleString('id-ID');

/**
 * Identitas program studi siap pakai di tabel, kartu, kepala halaman, sidebar, dan daftar: logo fakultas, nama
 * fakultas, nama prodi, lencana jenjang (S1, D3) dan akreditasi (dengan peringatan masa berlaku). Cukup isi `kode`;
 * data lain dilengkapi otomatis lewat SDK. Pilih tampilan lewat `varian`.
 */
export function LabelProdi({ kode, nama, prodi, varian = 'baku', akreditasi = true, sub = 'fakultas', ukuran = 'md', bentukLogo = 'kotak', statistik, onClick, href, className }: LabelProdiProps) {
  const k = String(prodi?.kode_prodi ?? kode ?? '');
  const lengkap = !!prodi && prodi.kode_akreditasi !== undefined && prodi.kode_jenjang !== undefined;
  const peta = usePetaProdi(!lengkap && !!k);
  const p = { ...(peta.get(k) ?? {}), ...Object.fromEntries(Object.entries(prodi ?? {}).filter(([, v]) => v != null)) } as Partial<ProdiReferensi>;
  const namaP = namaRapi(p.nama_prodi ?? nama ?? k);
  const jenjang = jenjangProdi(p.kode_jenjang);
  const kodeFak = (p.kode_fak ?? (p.kode_fakultas as string | undefined)) || null;
  const baris2 = sub === false ? null : sub === 'fakultas' ? namaRapi(p.nama_fakultas) || null : sub === 'kode' ? k || null : sub;
  const adaAkred = akreditasi && (p.kode_akreditasi !== undefined || p.tgl_akhir_sk_ban !== undefined);
  const info = adaAkred ? akreditasiProdi(p as ProdiReferensi) : null;
  const satuBaris = varian === 'ringkas' || varian === 'chip';
  const logo =
    kodeFak || p.nama_fakultas ? (
      <LogoFakultas kode={kodeFak} nama={p.nama_fakultas} ukuran={UKURAN_LOGO[varian][ukuran]} />
    ) : (
      <span className="u-logo-fak" data-ukuran={UKURAN_LOGO[varian][ukuran]} data-monogram style={{ '--u-logo-fak-h': hue(k || namaP) } as React.CSSProperties}>
        <span aria-hidden>{jenjang || 'PS'}</span>
      </span>
    );
  const lencana =
    jenjang || adaAkred ? (
      <span className="u-label-prodi-lencana">
        {jenjang && <span className="u-baris-prodi-jenjang">{jenjang}</span>}
        {adaAkred && <LencanaAkreditasi prodi={p as ProdiReferensi} ringkas />}
      </span>
    ) : null;
  const stat =
    statistik && (statistik.mahasiswa != null || statistik.dosen != null) ? (
      <span className="u-label-prodi-stat">
        {statistik.mahasiswa != null && (
          <span>
            <GraduationCap aria-hidden /> <b>{angka(statistik.mahasiswa)}</b> mahasiswa
          </span>
        )}
        {statistik.dosen != null && (
          <span>
            <Users aria-hidden /> <b>{angka(statistik.dosen)}</b> dosen
          </span>
        )}
      </span>
    ) : null;
  const masaBerlaku =
    varian === 'kartu' && info && info.keadaan !== 'belum' ? (
      <span className="u-label-prodi-sk">
        {info.berlakuSampai ? `Akreditasi berlaku sampai ${formatDate(info.berlakuSampai)}` : 'Masa berlaku akreditasi tidak tercatat'}
        {p.no_sk_ban && p.no_sk_ban !== '0' ? ` · SK ${p.no_sk_ban}` : ''}
      </span>
    ) : null;
  const isi = (
    <>
      {logo}
      <span className="u-label-prodi-teks">
        {satuBaris ? (
          <span className="u-label-prodi-nama" title={[namaP, baris2].filter((x) => typeof x === 'string').join(' · ') || undefined}>
            {varian === 'chip' && jenjang ? `${jenjang} ${namaP}` : namaP || '–'}
          </span>
        ) : (
          <>
            {baris2 && <span className="u-label-prodi-sub">{baris2}</span>}
            <span className="u-label-prodi-nama" title={namaP || undefined}>
              {namaP || '–'}
            </span>
          </>
        )}
        {varian !== 'vertikal' && masaBerlaku}
        {varian !== 'vertikal' && varian !== 'chip' && varian !== 'ringkas' && stat}
      </span>
      {varian === 'chip' ? info && <span className="u-label-prodi-titik" data-tone={info.tone} title={info.label} aria-label={info.label} /> : lencana}
      {varian === 'vertikal' && masaBerlaku}
      {varian === 'vertikal' && stat}
      {varian === 'daftar' && <ChevronRight className="u-label-prodi-panah" aria-hidden />}
    </>
  );
  const atribut = {
    className: cn('u-label-prodi', className),
    'data-varian': varian,
    'data-ukuran': ukuran,
    'data-logo': bentukLogo === 'bulat' ? 'bulat' : undefined,
  };
  if (href) return <a {...atribut} href={href}>{isi}</a>;
  if (onClick) return <button type="button" {...atribut} onClick={onClick}>{isi}</button>;
  return <span {...atribut}>{isi}</span>;
}
