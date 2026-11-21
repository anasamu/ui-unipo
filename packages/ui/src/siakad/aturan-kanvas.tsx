'use client';
import * as React from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Ban,
  CircleAlert,
  Copy,
  GripVertical,
  IndentDecrease,
  IndentIncrease,
  LayoutList,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
  Workflow,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Empty } from '../components/display';
import { Field, Input, SegmentedControl, Switch, Textarea } from '../components/forms';
import { Pilihan, PilihanBanyak } from '../components/formulir';
import { ConfirmDialog, useToast } from '../components/overlays';
import { GalatApi } from './galat';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

/*
 * Kanvas seret-lepas templat kasus (mode ADMIN aturan; SIAKAD /v1/aturan/templat/{palet,kelola,pratinjau},
 * docs/ATURAN-RUTE.md). Admin menyusun logika satu kasus sebagai DATA: Kondisi (dikelompokkan awam), Penghubung
 * DAN/ATAU/BUKAN (grup bersarang), dan Akibat dari registri. Nilai kondisi bisa tetap atau "Diisi pejabat" (slot
 * bertipe) yang menjadi celah isian kalimat di wizard pejabat ("Mulai dari contoh"). Kalimat & validasi dari SIAKAD
 * (satu sumber kebenaran, pratinjau langsung). Pejabat tidak pernah melihat kanvas ini.
 *
 * Aksesibel tanpa mouse: setiap blok palet punya tombol Tambah (ke grup terpilih); setiap blok di kanvas punya
 * Naik/Turun/Keluarkan/Masukkan ke grup/Gandakan/Hapus dan pintasan Alt+↑/↓, Delete. Ponsel/layar sempit = mode daftar.
 *
 *   KelolaTemplatAturan  daftar templat (draf/terbit/arsip) per jenis + buka kanvas
 *   KanvasTemplat        editor kanvas satu templat
 */

// ================================================================ Tipe
export type NilaiKanvas = { tetap: unknown } | { slot: SlotKanvas };
export interface SlotKanvas {
  kode: string;
  label: string;
  tipe: 'angka' | 'uang' | 'tanggal' | 'teks';
  satuan?: string;
  bawaan?: unknown;
  min?: number | string;
  maks?: number | string;
  contoh?: string;
  petunjuk?: string;
}
export interface KondisiKanvas {
  id: string;
  tipe: 'kondisi';
  indikator: string;
  op: string;
  nilai?: NilaiKanvas;
  bukan?: boolean;
  pesan?: string;
}
export interface GrupKanvas {
  id: string;
  tipe: 'grup';
  gabung: 'semua' | 'salah_satu';
  bukan?: boolean;
  anak: Array<GrupKanvas | KondisiKanvas>;
}
export interface AkibatKanvas {
  id: string;
  tipe: string;
  pesan?: string;
  target?: string;
  op?: string;
  nilai?: NilaiKanvas;
  mulai?: NilaiKanvas;
  selesai?: NilaiKanvas;
}
export interface Kanvas {
  titik: string;
  kategori?: string;
  nama?: string;
  kalimat?: string;
  akibat: AkibatKanvas[];
  kondisi: GrupKanvas;
}
export interface PaletKanvas {
  jenis: Array<{ kode: string; judul: string; ikon: string; keterangan: string }>;
  akibat: Array<{ kode: string; label: string; keterangan: string; ikon: string; siap: boolean; langkah: boolean }>;
  titik: Array<{ kode: string; judul: string; kelompok: string; subjek: string; kategori: string[]; jenis: string[]; indikator: string[]; rute: boolean }>;
  indikator: Array<{ kode: string; judul: string; tipe: string; subjek: string; kelompok: string; satuan: string | null; keterangan: string | null; opsi: Array<{ nilai: string; label: string }> | null }>;
  operator: Record<string, Array<{ kode: string; label: string }>>;
  kategori: Array<{ kode: string; judul: string }>;
}
export interface TemplatKelolaBaris {
  id: string;
  kode: string;
  judul: string;
  jenis_aturan: string;
  jenis_judul: string;
  status: 'draf' | 'terbit' | 'arsip';
  versi_terbit: number | null;
  versi_akhir: number;
  ada_draf: boolean;
  sumber: 'awal' | 'kanvas';
  diubah_oleh?: string | null;
  diubah_at?: string | null;
}
export interface TemplatKelolaDetail extends TemplatKelolaBaris {
  isi: { kalimat: string; slot: SlotKanvas[]; akibat: string } | null;
  kanvas: Kanvas | null;
  kanvas_catatan: string | null;
  versi: Array<{ versi: number; status: string; catatan: string | null; dibuat_oleh: string | null; dibuat_at: string; diterbitkan_oleh: string | null; diterbitkan_at: string | null }>;
}
export interface PratinjauKanvas {
  ok: boolean;
  kalimat: string;
  galat: Record<string, string>;
  slot: SlotKanvas[];
  siap: boolean;
}

// ================================================================ Hook
export function usePaletKanvas() {
  return useSiakadQuery<PaletKanvas>(['aturan', 'templat', 'palet'], (s, signal) => s.request({ method: 'GET', path: '/v1/aturan/templat/palet' }, { signal }), { staleTime: 300_000 });
}
export function useTemplatKelola() {
  return useSiakadQuery<TemplatKelolaBaris[]>(['aturan', 'templat', 'kelola'], (s, signal) => s.request({ method: 'GET', path: '/v1/aturan/templat/kelola' }, { signal }), { staleTime: 15_000 });
}

// ================================================================ Operasi pohon (murni)
let nomor = 0;
const idBaru = (awalan: string) => `${awalan}${Date.now().toString(36).slice(-4)}${(++nomor).toString(36)}`;
type Simpul = GrupKanvas | KondisiKanvas;

function petakan(g: GrupKanvas, f: (s: Simpul) => Simpul | null): GrupKanvas {
  return { ...g, anak: g.anak.map((a) => f(a.tipe === 'grup' ? petakan(a, f) : a)).filter((x): x is Simpul => x !== null) };
}
function cariSimpul(g: GrupKanvas, id: string): { induk: GrupKanvas; i: number } | null {
  for (let i = 0; i < g.anak.length; i++) {
    const a = g.anak[i]!;
    if (a.id === id) return { induk: g, i };
    if (a.tipe === 'grup') {
      const r = cariSimpul(a, id);
      if (r) return r;
    }
  }
  return null;
}
function cariGrup(g: GrupKanvas, id: string): GrupKanvas | null {
  if (g.id === id) return g;
  for (const a of g.anak) if (a.tipe === 'grup') {
    const r = cariGrup(a, id);
    if (r) return r;
  }
  return null;
}
function ubahGrup(akar: GrupKanvas, id: string, f: (g: GrupKanvas) => GrupKanvas): GrupKanvas {
  if (akar.id === id) return f(akar);
  return { ...akar, anak: akar.anak.map((a) => (a.tipe === 'grup' ? ubahGrup(a, id, f) : a)) };
}
function hapusSimpul(akar: GrupKanvas, id: string): [GrupKanvas, Simpul | null] {
  let diambil: Simpul | null = null;
  const baru = petakan(akar, (s) => {
    if (s.id === id) {
      diambil = s;
      return null;
    }
    return s;
  });
  return [baru, diambil];
}
function sisipkan(akar: GrupKanvas, grupId: string, i: number, s: Simpul): GrupKanvas {
  return ubahGrup(akar, grupId, (g) => {
    const anak = [...g.anak];
    anak.splice(Math.max(0, Math.min(i, anak.length)), 0, s);
    return { ...g, anak };
  });
}
function salin<T extends Simpul>(s: T): T {
  return (s.tipe === 'grup' ? { ...s, id: idBaru('g'), anak: s.anak.map((a) => salin(a)) } : { ...structuredClone(s), id: idBaru('k') }) as T;
}
function memuat(g: Simpul, id: string): boolean {
  return g.id === id || (g.tipe === 'grup' && g.anak.some((a) => memuat(a, id)));
}

// ================================================================ Bahasa
const LABEL_GABUNG = { semua: 'Semua syarat (DAN)', salah_satu: 'Salah satu (ATAU)' } as const;
const fmt = (v: unknown) => (typeof v === 'number' ? v.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : String(v ?? ''));
function slotAwal(ind: PaletKanvas['indikator'][number], op: string, semua: string[]): SlotKanvas {
  const akhir = op === '>=' || op === '>' ? '_min' : op === '<=' || op === '<' ? '_maks' : '';
  let kode = (ind.kode + akhir).slice(0, 36);
  for (let i = 2; semua.includes(kode); i++) kode = `${ind.kode}${akhir}_${i}`.slice(0, 40);
  const frasa = { '>=': 'paling sedikit', '>': 'lebih dari', '<=': 'paling banyak', '<': 'kurang dari' }[op] ?? '';
  return {
    kode,
    label: `${ind.judul} ${frasa}`.trim(),
    tipe: ind.tipe === 'angka' ? (ind.satuan === 'Rp' ? 'uang' : 'angka') : 'teks',
    ...(ind.satuan && ind.satuan !== 'Rp' ? { satuan: ind.satuan } : {}),
  };
}
function semuaSlot(k: Kanvas): string[] {
  const out: string[] = [];
  const jalan = (g: GrupKanvas) => g.anak.forEach((a) => (a.tipe === 'grup' ? jalan(a) : a.nilai && 'slot' in a.nilai && out.push(a.nilai.slot.kode)));
  jalan(k.kondisi);
  k.akibat.forEach((a) => [a.nilai, a.mulai, a.selesai].forEach((n) => n && 'slot' in n && out.push(n.slot.kode)));
  return out;
}

// ================================================================ Daftar templat
const LABEL_STATUS: Record<string, { label: string; v: 'success' | 'warning' | 'outline' }> = {
  terbit: { label: 'Terbit', v: 'success' },
  draf: { label: 'Draf', v: 'warning' },
  arsip: { label: 'Diarsipkan', v: 'outline' },
};

/** Halaman admin Pustikom: templat kasus per jenis + kanvas. */
export function KelolaTemplatAturan({ className }: { className?: string }) {
  const q = useTemplatKelola();
  const [buka, setBuka] = React.useState<{ kode: string | null } | null>(null);
  const [cari, setCari] = React.useState('');
  const [konfirmasi, setKonfirmasi] = React.useState<{ aksi: 'terbit' | 'arsip' | 'hapus' | 'gandakan'; t: TemplatKelolaBaris } | null>(null);
  const siakad = useSiakad();
  const toast = useToast();
  if (buka) return <KanvasTemplat kode={buka.kode} onKembali={() => setBuka(null)} onTersimpan={(kode) => setBuka({ kode })} className={className} />;
  const status = (q.error as { status?: number } | null)?.status;
  if (q.error && (status === 404 || status === 405 || status === 503))
    return (
      <Alert className={className} title="Kanvas templat belum tersedia">
        Fitur kanvas templat belum aktif di server SIAKAD kampus. Hubungi tim Pustikom untuk memperbaruinya.
      </Alert>
    );
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  if (!q.data) return <Skeleton height={240} className={className} />;
  const kata = cari.trim().toLowerCase();
  const daftar = q.data.filter((t) => !kata || `${t.judul} ${t.jenis_judul}`.toLowerCase().includes(kata));
  const jenis = [...new Set(daftar.map((t) => t.jenis_judul))];
  const jalankan = async (aksi: 'terbit' | 'arsip' | 'hapus' | 'gandakan', t: TemplatKelolaBaris) => {
    try {
      await siakad.request({ method: 'POST', path: `/v1/aturan/templat/kelola/${encodeURIComponent(t.kode)}/${aksi}`, body: {} });
    } catch (e) {
      toast.add({ title: `Templat “${t.judul}” gagal ${{ terbit: 'diterbitkan', arsip: 'diarsipkan', hapus: 'dihapus', gandakan: 'digandakan' }[aksi]}`, description: pesanGalat(e), type: 'error' });
      throw e;
    }
    invalidateSiakad('aturan');
    toast.add({
      title: { terbit: 'Templat diterbitkan', arsip: 'Templat diarsipkan', hapus: 'Templat dihapus', gandakan: 'Templat digandakan' }[aksi],
      description: aksi === 'terbit' ? 'Kini muncul di “Mulai dari contoh” untuk pejabat.' : undefined,
      type: 'success',
    });
  };
  return (
    <div className={cn('u-akv', className)}>
      <div className="u-aturan-saring">
        <div className="u-aturan-cari">
          <Search aria-hidden />
          <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari templat kasus" aria-label="Cari templat kasus" />
        </div>
        <div className="u-aturan-saring-aksi">
          <Button onClick={() => setBuka({ kode: null })}>
            <Plus /> Templat baru di kanvas
          </Button>
        </div>
      </div>
      {!daftar.length && <Empty bordered icon={<Workflow />} title="Tidak ada templat yang cocok" />}
      {jenis.map((j) => (
        <section key={j} className="u-akv-grup">
          <h4>{j}</h4>
          <ul>
            {daftar
              .filter((t) => t.jenis_judul === j)
              .map((t) => (
                <li key={t.kode}>
                  <div className="u-akv-baris-isi">
                    <strong>{t.judul}</strong>
                    <span className="u-akv-lencana">
                      <Badge variant={LABEL_STATUS[t.status]!.v}>
                        {LABEL_STATUS[t.status]!.label}
                        {t.status === 'terbit' && t.versi_terbit ? ` · versi ${t.versi_terbit}` : ''}
                      </Badge>
                      {t.ada_draf && t.status === 'terbit' && <Badge variant="warning">Ada perubahan belum terbit</Badge>}
                      <Badge variant="outline">{t.sumber === 'awal' ? 'Templat awal' : 'Dari kanvas'}</Badge>
                    </span>
                  </div>
                  <div className="u-akv-baris-aksi">
                    <Button variant="outline" size="sm" onClick={() => setBuka({ kode: t.kode })}>
                      <Workflow /> Buka kanvas
                    </Button>
                    {(t.ada_draf || t.status === 'arsip') && (
                      <Button size="sm" onClick={() => setKonfirmasi({ aksi: 'terbit', t })}>
                        <Send /> Terbitkan
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" iconOnly aria-label={`Gandakan ${t.judul}`} title="Gandakan" onClick={() => setKonfirmasi({ aksi: 'gandakan', t })}>
                      <Copy />
                    </Button>
                    {t.status === 'terbit' && (
                      <Button variant="ghost" size="sm" onClick={() => setKonfirmasi({ aksi: 'arsip', t })}>
                        Arsipkan
                      </Button>
                    )}
                    {t.versi_terbit === null && t.sumber === 'kanvas' && (
                      <Button variant="ghost" size="sm" iconOnly aria-label={`Hapus ${t.judul}`} onClick={() => setKonfirmasi({ aksi: 'hapus', t })}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ))}
      <ConfirmDialog
        open={konfirmasi !== null}
        onOpenChange={(o) => !o && setKonfirmasi(null)}
        title={
          konfirmasi
            ? { terbit: `Terbitkan “${konfirmasi.t.judul}”?`, arsip: `Arsipkan “${konfirmasi.t.judul}”?`, hapus: `Hapus draf “${konfirmasi.t.judul}”?`, gandakan: `Gandakan “${konfirmasi.t.judul}”?` }[konfirmasi.aksi]
            : ''
        }
        description={
          konfirmasi
            ? {
                terbit: 'Pejabat akan melihat versi ini di “Mulai dari contoh”. Aturan yang sudah dibuat dari versi lama tidak berubah.',
                arsip: 'Templat tidak tampil lagi untuk pejabat. Aturan yang sudah dibuat tetap berjalan.',
                hapus: 'Draf yang belum pernah terbit dihapus.',
                gandakan: 'Salinan dibuat sebagai draf baru yang bisa Anda ubah.',
              }[konfirmasi.aksi]
            : ''
        }
        confirmLabel={konfirmasi ? { terbit: 'Terbitkan', arsip: 'Arsipkan', hapus: 'Hapus', gandakan: 'Gandakan' }[konfirmasi.aksi] : 'Ya'}
        tone={konfirmasi?.aksi === 'hapus' ? 'danger' : undefined}
        onConfirm={async () => {
          if (!konfirmasi) return;
          await jalankan(konfirmasi.aksi, konfirmasi.t);
          setKonfirmasi(null);
        }}
      />
    </div>
  );
}

// ================================================================ Kanvas
const KANVAS_KOSONG = (titik = ''): Kanvas => ({ titik, akibat: [], kondisi: { id: 'akar', tipe: 'grup', gabung: 'semua', anak: [] } });
type Seret = { jenis: 'baru'; simpul: () => Simpul } | { jenis: 'pindah'; id: string } | { jenis: 'akibat'; kode: string };
const MIME = 'application/x-unipo-blok';

export function KanvasTemplat({ kode, onKembali, onTersimpan, className }: { kode: string | null; onKembali: () => void; onTersimpan?: (kode: string) => void; className?: string }) {
  const palet = usePaletKanvas();
  const detail = useSiakadQuery<TemplatKelolaDetail>(['aturan', 'templat', 'kelola', kode], (s, signal) => s.request({ method: 'GET', path: `/v1/aturan/templat/kelola/${encodeURIComponent(kode!)}` }, { signal }), {
    enabled: Boolean(kode),
    staleTime: 0,
  });
  const siakad = useSiakad();
  const toast = useToast();
  const [judul, setJudul] = React.useState('');
  const [jenis, setJenis] = React.useState<string | null>(null);
  const [k, setK] = React.useState<Kanvas>(KANVAS_KOSONG());
  const [pilihGrup, setPilihGrup] = React.useState('akar');
  const [pra, setPra] = React.useState<PratinjauKanvas | null>(null);
  const [galatServer, setGalatServer] = React.useState<Record<string, string>>({});
  const [sibuk, setSibuk] = React.useState<'simpan' | 'terbit' | null>(null);
  const [mode, setMode] = React.useState<'kanvas' | 'daftar'>('kanvas');
  const [cariPalet, setCariPalet] = React.useState('');
  const [umum, setUmum] = React.useState('');
  const [berubah, setBerubah] = React.useState(false);
  const [atas, setAtas] = React.useState<string | null>(null);
  const seret = React.useRef<Seret | null>(null);
  const muat = React.useRef(false);
  // Muat detail
  React.useEffect(() => {
    if (!kode || !detail.data || muat.current) return;
    muat.current = true;
    setJudul(detail.data.judul);
    setJenis(detail.data.jenis_aturan);
    if (detail.data.kanvas) setK({ ...KANVAS_KOSONG(), ...detail.data.kanvas, kondisi: { ...detail.data.kanvas.kondisi, id: detail.data.kanvas.kondisi?.id || 'akar' } });
  }, [kode, detail.data]);
  // Layar sempit: mode daftar otomatis.
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches) setMode('daftar');
  }, []);
  // Pratinjau langsung (debounce) dari SIAKAD.
  React.useEffect(() => {
    if (!k.titik) return setPra(null);
    const t = window.setTimeout(async () => {
      try {
        const r = await siakad.request<PratinjauKanvas>({ method: 'POST', path: '/v1/aturan/templat/pratinjau', body: { kanvas: k, judul: judul || 'Templat' } });
        setPra(r.data);
      } catch {
        // pratinjau tidak wajib
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [k, judul, siakad]);
  const ubah = (f: (x: Kanvas) => Kanvas) => {
    setK((x) => f(x));
    setBerubah(true);
    setGalatServer({});
  };
  const umumkan = (s: string) => setUmum(s);

  if (kode && detail.error) return <GalatApi error={detail.error} onRetry={detail.refetch} className={className} />;
  if (!palet.data || (kode && !detail.data)) return <Skeleton height={420} className={className} />;
  const P = palet.data;
  const titik = P.titik.find((t) => t.kode === k.titik) ?? null;
  const indPeta = new Map(P.indikator.map((i) => [i.kode, i]));
  const indTitik = titik ? titik.indikator.map((x) => indPeta.get(x)).filter((x): x is PaletKanvas['indikator'][number] => Boolean(x)) : [];
  const kataP = cariPalet.trim().toLowerCase();
  const kelompok = [...new Set(indTitik.map((i) => i.kelompok))];
  const galat: Record<string, string> = { ...(pra?.galat ?? {}), ...galatServer };
  // validasi lokal: grup kosong
  const jalanGrup = (g: GrupKanvas) => {
    if (g.id !== 'akar' && !g.anak.length) galat[g.id] ??= 'Grup kosong: seret Kondisi ke dalamnya atau hapus grup ini.';
    g.anak.forEach((a) => a.tipe === 'grup' && jalanGrup(a));
  };
  jalanGrup(k.kondisi);

  // --------------------------------------------------- operasi
  const kondisiBaru = (ind: PaletKanvas['indikator'][number]): KondisiKanvas => {
    const op = P.operator[ind.tipe]?.[0]?.kode ?? '=';
    const n: KondisiKanvas = { id: idBaru('k'), tipe: 'kondisi', indikator: ind.kode, op };
    if (ind.tipe === 'angka') n.nilai = { slot: slotAwal(ind, op, semuaSlot(k)) };
    else if (ind.tipe === 'pilihan') n.nilai = { tetap: ind.opsi?.[0]?.nilai ?? '' };
    else if (ind.tipe !== 'benar_salah') n.nilai = { tetap: '' };
    return n;
  };
  const grupBaru = (gabung: 'semua' | 'salah_satu', bukan = false): GrupKanvas => ({ id: idBaru('g'), tipe: 'grup', gabung, bukan, anak: [] });
  const tambahKe = (grupId: string, s: Simpul, i?: number) => {
    ubah((x) => {
      const g = cariGrup(x.kondisi, grupId) ?? x.kondisi;
      return { ...x, kondisi: sisipkan(x.kondisi, g.id, i ?? g.anak.length, s) };
    });
    if (s.tipe === 'grup') setPilihGrup(s.id);
    umumkan(`${s.tipe === 'grup' ? 'Grup' : 'Kondisi'} ditambahkan.`);
    window.setTimeout(() => document.getElementById(`akv-${s.id}`)?.focus(), 50);
  };
  const tambahAkibat = (kode: string) => {
    const a = P.akibat.find((x) => x.kode === kode);
    if (!a || !a.siap) return;
    ubah((x) => {
      const lain = a.langkah ? x.akibat.filter((y) => !P.akibat.find((z) => z.kode === y.tipe)?.langkah) : x.akibat;
      const baru: AkibatKanvas = { id: idBaru('a'), tipe: kode };
      if (kode === 'batasi_waktu') {
        baru.mulai = { slot: { kode: 'mulai', label: 'Mulai', tipe: 'tanggal' } };
        baru.selesai = { slot: { kode: 'selesai', label: 'Selesai', tipe: 'tanggal' } };
      }
      if (kode === 'batasi_kuota') {
        const t = indTitik.find((i) => i.tipe === 'angka' && i.kelompok === 'Data dari langkah ini') ?? indTitik.find((i) => i.tipe === 'angka');
        baru.target = t?.kode;
        baru.op = '<=';
        baru.nilai = { slot: { kode: 'batas', label: 'Paling banyak', tipe: 'angka', ...(t?.satuan ? { satuan: t.satuan } : {}) } };
      }
      return { ...x, akibat: [...lain, baru] };
    });
    umumkan(`Akibat “${a.label}” dipasang.`);
  };
  const pindahUrut = (id: string, arah: -1 | 1) =>
    ubah((x) => {
      const r = cariSimpul(x.kondisi, id);
      if (!r) return x;
      const j = r.i + arah;
      if (j < 0 || j >= r.induk.anak.length) return x;
      return {
        ...x,
        kondisi: ubahGrup(x.kondisi, r.induk.id, (g) => {
          const anak = [...g.anak];
          [anak[r.i], anak[j]] = [anak[j]!, anak[r.i]!];
          return { ...g, anak };
        }),
      };
    });
  const keluarkan = (id: string) =>
    ubah((x) => {
      const r = cariSimpul(x.kondisi, id);
      if (!r || r.induk.id === x.kondisi.id) return x;
      const atasnya = cariSimpul(x.kondisi, r.induk.id);
      if (!atasnya) return x;
      const [tanpa, s] = hapusSimpul(x.kondisi, id);
      return s ? { ...x, kondisi: sisipkan(tanpa, atasnya.induk.id, atasnya.i + 1, s) } : x;
    });
  const masukkan = (id: string) =>
    ubah((x) => {
      const r = cariSimpul(x.kondisi, id);
      const sebelum = r && r.i > 0 ? r.induk.anak[r.i - 1] : null;
      if (!sebelum || sebelum.tipe !== 'grup') return x;
      const [tanpa, s] = hapusSimpul(x.kondisi, id);
      return s ? { ...x, kondisi: sisipkan(tanpa, sebelum.id, sebelum.anak.length, s) } : x;
    });
  const gandakan = (id: string) =>
    ubah((x) => {
      const r = cariSimpul(x.kondisi, id);
      if (!r) return x;
      const s = salin(r.induk.anak[r.i]!);
      // slot salinan diberi kode baru
      const kodeAda = semuaSlot(x);
      const beriKode = (n: Simpul): Simpul =>
        n.tipe === 'grup'
          ? { ...n, anak: n.anak.map(beriKode) }
          : n.nilai && 'slot' in n.nilai
            ? { ...n, nilai: { slot: { ...n.nilai.slot, kode: (() => { let c = `${n.nilai.slot.kode}_2`; for (let i = 3; kodeAda.includes(c); i++) c = `${n.nilai.slot.kode}_${i}`; kodeAda.push(c); return c; })() } } }
            : n;
      return { ...x, kondisi: sisipkan(x.kondisi, r.induk.id, r.i + 1, beriKode(s)) };
    });
  const hapus = (id: string) => {
    ubah((x) => ({ ...x, kondisi: hapusSimpul(x.kondisi, id)[0] }));
    if (pilihGrup === id) setPilihGrup('akar');
    umumkan('Blok dihapus.');
  };
  const setSimpul = (id: string, p: Partial<KondisiKanvas> | Partial<GrupKanvas>) =>
    ubah((x) => ({ ...x, kondisi: x.kondisi.id === id ? ({ ...x.kondisi, ...p } as GrupKanvas) : petakan(x.kondisi, (s) => (s.id === id ? ({ ...s, ...p } as Simpul) : s)) }));
  const setAkibat = (id: string, p: Partial<AkibatKanvas>) => ubah((x) => ({ ...x, akibat: x.akibat.map((a) => (a.id === id ? { ...a, ...p } : a)) }));

  // --------------------------------------------------- seret-lepas
  const mulaiSeret = (e: React.DragEvent, s: Seret) => {
    seret.current = s;
    e.dataTransfer.effectAllowed = s.jenis === 'pindah' ? 'move' : 'copy';
    e.dataTransfer.setData(MIME, s.jenis);
    e.dataTransfer.setData('text/plain', s.jenis);
  };
  const lepas = (grupId: string, i: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAtas(null);
    const s = seret.current;
    seret.current = null;
    if (!s) return;
    if (s.jenis === 'akibat') return tambahAkibat(s.kode);
    if (s.jenis === 'baru') return tambahKe(grupId, s.simpul(), i);
    ubah((x) => {
      const asal = cariSimpul(x.kondisi, s.id);
      if (!asal) return x;
      const simpul = asal.induk.anak[asal.i]!;
      if (memuat(simpul, grupId)) return x; // tidak boleh ke dalam dirinya sendiri
      const [tanpa] = hapusSimpul(x.kondisi, s.id);
      const geser = asal.induk.id === grupId && asal.i < i ? i - 1 : i;
      return { ...x, kondisi: sisipkan(tanpa, grupId, geser, simpul) };
    });
    umumkan('Blok dipindahkan.');
  };
  const zona = (grupId: string, i: number) => {
    const key = `${grupId}:${i}`;
    return (
      <div
        className="u-akv-zona"
        data-atas={atas === key || undefined}
        onDragOver={(e) => {
          if (!seret.current || seret.current.jenis === 'akibat') return;
          e.preventDefault();
          setAtas(key);
        }}
        onDragLeave={() => setAtas((a) => (a === key ? null : a))}
        onDrop={lepas(grupId, i)}
        aria-hidden
      />
    );
  };

  // --------------------------------------------------- render blok
  const tombolBlok = (s: Simpul, r: { induk: GrupKanvas; i: number }) => {
    const sebelum = r.i > 0 ? r.induk.anak[r.i - 1] : null;
    const nama = s.tipe === 'grup' ? 'grup' : (indPeta.get(s.indikator)?.judul ?? 'kondisi');
    return (
      <div className="u-akv-blok-tombol">
        <Button variant="ghost" size="xs" iconOnly aria-label={`Naikkan ${nama}`} disabled={r.i === 0} onClick={() => pindahUrut(s.id, -1)}>
          <ArrowUp />
        </Button>
        <Button variant="ghost" size="xs" iconOnly aria-label={`Turunkan ${nama}`} disabled={r.i === r.induk.anak.length - 1} onClick={() => pindahUrut(s.id, 1)}>
          <ArrowDown />
        </Button>
        <Button variant="ghost" size="xs" iconOnly aria-label={`Keluarkan ${nama} dari grup`} title="Keluarkan dari grup" disabled={r.induk.id === k.kondisi.id} onClick={() => keluarkan(s.id)}>
          <IndentDecrease />
        </Button>
        <Button variant="ghost" size="xs" iconOnly aria-label={`Masukkan ${nama} ke grup di atasnya`} title="Masukkan ke grup di atasnya" disabled={!sebelum || sebelum.tipe !== 'grup'} onClick={() => masukkan(s.id)}>
          <IndentIncrease />
        </Button>
        <Button variant="ghost" size="xs" iconOnly aria-label={`Gandakan ${nama}`} onClick={() => gandakan(s.id)}>
          <Copy />
        </Button>
        <Button variant="ghost" size="xs" iconOnly aria-label={`Hapus ${nama}`} onClick={() => hapus(s.id)}>
          <Trash2 />
        </Button>
      </div>
    );
  };
  const kunciBlok = (s: Simpul) => (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault();
      pindahUrut(s.id, -1);
    } else if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      pindahUrut(s.id, 1);
    } else if (e.key === 'Delete') {
      e.preventDefault();
      hapus(s.id);
    }
  };
  const editorNilai = (n: NilaiKanvas | undefined, set: (v: NilaiKanvas) => void, tipe: 'angka' | 'uang' | 'tanggal' | 'teks', label: string, bawaanSlot: () => SlotKanvas, id: string) => {
    const slot = n && 'slot' in n ? n.slot : null;
    return (
      <div className="u-akv-nilai">
        <SegmentedControl
          aria-label={`${label}: cara mengisi`}
          options={[
            { value: 'slot', label: 'Diisi pejabat' },
            { value: 'tetap', label: 'Nilai tetap' },
          ]}
          value={slot ? 'slot' : 'tetap'}
          onValueChange={(v) => set(v === 'slot' ? { slot: bawaanSlot() } : { tetap: '' })}
        />
        {slot ? (
          <div className="u-akv-slot">
            <Field label="Label isian untuk pejabat">
              <Input id={`akv-${id}-label`} value={slot.label} onChange={(e) => set({ slot: { ...slot, label: e.target.value } })} />
            </Field>
            {tipe !== 'tanggal' && (
              <div className="u-akv-slot-angka">
                <Field label="Nilai bawaan" optional>
                  <Input value={fmt(slot.bawaan ?? '')} inputMode={tipe === 'teks' ? undefined : 'decimal'} onChange={(e) => set({ slot: { ...slot, bawaan: e.target.value } })} />
                </Field>
                {tipe !== 'teks' && (
                  <>
                    <Field label="Paling kecil" optional>
                      <Input value={String(slot.min ?? '')} inputMode="decimal" onChange={(e) => set({ slot: { ...slot, min: e.target.value } })} />
                    </Field>
                    <Field label="Paling besar" optional>
                      <Input value={String(slot.maks ?? '')} inputMode="decimal" onChange={(e) => set({ slot: { ...slot, maks: e.target.value } })} />
                    </Field>
                  </>
                )}
              </div>
            )}
            <details className="u-aturan-lanjutan">
              <summary>Lanjutan: kode isian, satuan, petunjuk</summary>
              <div className="u-akv-slot-angka">
                <Field label="Kode isian">
                  <Input value={slot.kode} spellCheck={false} onChange={(e) => set({ slot: { ...slot, kode: e.target.value.trim() } })} />
                </Field>
                <Field label="Satuan" optional>
                  <Input value={slot.satuan ?? ''} onChange={(e) => set({ slot: { ...slot, satuan: e.target.value } })} />
                </Field>
              </div>
              <Field label="Petunjuk untuk pejabat" optional>
                <Input value={slot.petunjuk ?? ''} onChange={(e) => set({ slot: { ...slot, petunjuk: e.target.value } })} />
              </Field>
            </details>
          </div>
        ) : (
          <Input
            aria-label={`${label}: nilai tetap`}
            type={tipe === 'tanggal' ? 'date' : 'text'}
            inputMode={tipe === 'angka' || tipe === 'uang' ? 'decimal' : undefined}
            value={String((n as { tetap: unknown } | undefined)?.tetap ?? '')}
            onChange={(e) => set({ tetap: e.target.value })}
          />
        )}
      </div>
    );
  };
  const blokKondisi = (s: KondisiKanvas, r: { induk: GrupKanvas; i: number }) => {
    const ind = indPeta.get(s.indikator);
    const ops = P.operator[ind?.tipe ?? 'teks'] ?? [];
    const g = galat[s.id];
    return (
      <div
        key={s.id}
        id={`akv-${s.id}`}
        className="u-akv-blok"
        data-jenis="kondisi"
        data-galat={g ? '' : undefined}
        role="group"
        aria-label={`Kondisi: ${ind?.judul ?? s.indikator}`}
        tabIndex={0}
        draggable={mode === 'kanvas'}
        onDragStart={(e) => {
          e.stopPropagation();
          mulaiSeret(e, { jenis: 'pindah', id: s.id });
        }}
        onKeyDown={kunciBlok(s)}
      >
        <div className="u-akv-blok-kepala">
          {mode === 'kanvas' && <GripVertical className="u-akv-pegangan" aria-hidden />}
          <span className="u-akv-jenis-blok">Kondisi</span>
          <label className="u-akv-bukan">
            <Switch size="sm" checked={Boolean(s.bukan)} onCheckedChange={(v) => setSimpul(s.id, { bukan: Boolean(v) })} aria-label="BUKAN: kondisi ini terpenuhi bila TIDAK benar" />
            BUKAN (dibalik)
          </label>
          {tombolBlok(s, r)}
        </div>
        <div className="u-akv-kondisi">
          <Pilihan
            tampilan="cari"
            aria-label="Data yang diperiksa"
            options={indTitik.map((i) => ({ value: i.kode, label: i.judul, description: i.kelompok }))}
            value={s.indikator}
            onValueChange={(v) => {
              const b = v ? indPeta.get(v) : undefined;
              if (b) setSimpul(s.id, { ...kondisiBaru(b), id: s.id });
            }}
          />
          {ops.length > 1 && <Pilihan tampilan="daftar" aria-label="Cara membandingkan" options={ops.map((o) => ({ value: o.kode, label: o.label }))} value={s.op} onValueChange={(v) => setSimpul(s.id, { op: v ?? s.op })} />}
          {ind?.tipe === 'benar_salah' ? (
            <Pilihan tampilan="tombol" aria-label="Harus" options={[{ value: 'benar', label: 'Ya' }, { value: 'salah', label: 'Tidak' }]} value={s.op} required onValueChange={(v) => setSimpul(s.id, { op: v ?? 'benar' })} />
          ) : ind?.tipe === 'pilihan' ? (
            s.op === 'dalam' || s.op === 'bukan_dalam' ? (
              <PilihanBanyak
                aria-label="Nilai"
                options={(ind.opsi ?? []).map((o) => ({ value: o.nilai, label: o.label }))}
                value={Array.isArray((s.nilai as { tetap?: unknown })?.tetap) ? ((s.nilai as { tetap: string[] }).tetap) : []}
                onValueChange={(v) => setSimpul(s.id, { nilai: { tetap: v } })}
              />
            ) : (
              <Pilihan aria-label="Nilai" options={(ind.opsi ?? []).map((o) => ({ value: o.nilai, label: o.label }))} value={String((s.nilai as { tetap?: unknown })?.tetap ?? '')} onValueChange={(v) => setSimpul(s.id, { nilai: { tetap: v ?? '' } })} />
            )
          ) : ind ? (
            editorNilai(s.nilai, (v) => setSimpul(s.id, { nilai: v }), ind.tipe === 'angka' ? (ind.satuan === 'Rp' ? 'uang' : 'angka') : 'teks', ind.judul, () => slotAwal(ind, s.op, semuaSlot(k)), s.id)
          ) : null}
        </div>
        <details className="u-aturan-lanjutan">
          <summary>Pesan khusus bila tidak terpenuhi</summary>
          <Input value={s.pesan ?? ''} onChange={(e) => setSimpul(s.id, { pesan: e.target.value })} placeholder="Kosong = kalimat otomatis" aria-label="Pesan khusus" />
        </details>
        {g && (
          <p className="u-akv-galat" role="alert">
            <CircleAlert aria-hidden /> {g}
          </p>
        )}
      </div>
    );
  };
  const blokGrup = (g: GrupKanvas, r: { induk: GrupKanvas; i: number } | null): React.ReactNode => {
    const akar = r === null;
    const gal = galat[g.id] ?? (akar ? galat.kondisi : undefined);
    return (
      <div
        key={g.id}
        id={`akv-${g.id}`}
        className="u-akv-grup-blok"
        data-akar={akar || undefined}
        data-pilih={pilihGrup === g.id || undefined}
        data-galat={gal ? '' : undefined}
        data-bukan={g.bukan || undefined}
        role="group"
        aria-label={`${akar ? 'Ketentuan' : 'Grup'}: ${LABEL_GABUNG[g.gabung]}${g.bukan ? ', dibalik (BUKAN)' : ''}`}
        tabIndex={0}
        onFocus={(e) => e.target === e.currentTarget && setPilihGrup(g.id)}
        onClick={(e) => {
          e.stopPropagation();
          setPilihGrup(g.id);
        }}
        draggable={!akar && mode === 'kanvas'}
        onDragStart={(e) => {
          if (akar) return;
          e.stopPropagation();
          mulaiSeret(e, { jenis: 'pindah', id: g.id });
        }}
        onKeyDown={akar ? undefined : kunciBlok(g)}
      >
        <div className="u-akv-blok-kepala">
          {!akar && mode === 'kanvas' && <GripVertical className="u-akv-pegangan" aria-hidden />}
          <span className="u-akv-jenis-blok">{akar ? 'Ketentuan' : 'Grup'}</span>
          <SegmentedControl
            aria-label="Penghubung"
            options={[
              { value: 'semua', label: 'DAN (semua)' },
              { value: 'salah_satu', label: 'ATAU (salah satu)' },
            ]}
            value={g.gabung}
            onValueChange={(v) => setSimpul(g.id, { gabung: v })}
          />
          {!akar && (
            <label className="u-akv-bukan">
              <Switch size="sm" checked={Boolean(g.bukan)} onCheckedChange={(v) => setSimpul(g.id, { bukan: Boolean(v) })} aria-label="BUKAN: grup ini terpenuhi bila TIDAK benar" />
              BUKAN (dibalik)
            </label>
          )}
          {pilihGrup === g.id && <Badge variant="info">Blok baru masuk ke sini</Badge>}
          {!akar && tombolBlok(g, r!)}
        </div>
        <div className="u-akv-anak">
          {zona(g.id, 0)}
          {g.anak.map((a, i) => (
            <React.Fragment key={a.id}>
              {i > 0 && <span className="u-akv-penghubung">{g.gabung === 'semua' ? 'DAN' : 'ATAU'}</span>}
              {a.tipe === 'grup' ? blokGrup(a, { induk: g, i }) : blokKondisi(a, { induk: g, i })}
              {zona(g.id, i + 1)}
            </React.Fragment>
          ))}
          {!g.anak.length && <p className="u-akv-kosong">{mode === 'kanvas' ? 'Seret Kondisi atau Penghubung ke sini, atau pilih dari palet lalu tekan Tambah.' : 'Tambahkan Kondisi dari daftar di atas.'}</p>}
        </div>
        {gal && (
          <p className="u-akv-galat" role="alert">
            <CircleAlert aria-hidden /> {gal}
          </p>
        )}
      </div>
    );
  };
  const blokAkibat = (a: AkibatKanvas) => {
    const def = P.akibat.find((x) => x.kode === a.tipe);
    const gal = galat[a.id];
    const angka = indTitik.filter((i) => i.tipe === 'angka');
    return (
      <div key={a.id} id={`akv-${a.id}`} className="u-akv-blok" data-jenis="akibat" data-galat={gal ? '' : undefined} role="group" aria-label={`Akibat: ${def?.label ?? a.tipe}`} tabIndex={0}>
        <div className="u-akv-blok-kepala">
          <span className="u-akv-jenis-blok">Akibat</span>
          <strong>{def?.label ?? a.tipe}</strong>
          <div className="u-akv-blok-tombol">
            <Button variant="ghost" size="xs" iconOnly aria-label={`Hapus akibat ${def?.label ?? ''}`} onClick={() => ubah((x) => ({ ...x, akibat: x.akibat.filter((y) => y.id !== a.id) }))}>
              <Trash2 />
            </Button>
          </div>
        </div>
        {(a.tipe === 'tolak' || a.tipe === 'izinkan_dengan_peringatan') && (
          <Field label="Pesan pembuka (opsional)" description="Ditampilkan sebelum kalimat aturan saat ditolak.">
            <Input value={a.pesan ?? ''} onChange={(e) => setAkibat(a.id, { pesan: e.target.value })} placeholder="mis. IPK Anda belum memenuhi syarat." />
          </Field>
        )}
        {a.tipe === 'batasi_waktu' && (
          <div className="u-akv-dua">
            <Field label="Mulai">{editorNilai(a.mulai, (v) => setAkibat(a.id, { mulai: v }), 'tanggal', 'Mulai', () => ({ kode: 'mulai', label: 'Mulai', tipe: 'tanggal' }), `${a.id}-m`)}</Field>
            <Field label="Selesai">{editorNilai(a.selesai, (v) => setAkibat(a.id, { selesai: v }), 'tanggal', 'Selesai', () => ({ kode: 'selesai', label: 'Selesai', tipe: 'tanggal' }), `${a.id}-s`)}</Field>
          </div>
        )}
        {a.tipe === 'batasi_kuota' && (
          <div className="u-akv-kondisi">
            <Pilihan aria-label="Angka yang dibatasi" options={angka.map((i) => ({ value: i.kode, label: i.judul }))} value={a.target ?? null} onValueChange={(v) => setAkibat(a.id, { target: v ?? undefined })} placeholder="Pilih…" />
            <Pilihan
              tampilan="daftar"
              aria-label="Batas"
              options={[
                { value: '<=', label: 'paling banyak' },
                { value: '<', label: 'kurang dari' },
                { value: '>=', label: 'paling sedikit' },
                { value: '>', label: 'lebih dari' },
              ]}
              value={a.op ?? '<='}
              onValueChange={(v) => setAkibat(a.id, { op: v ?? '<=' })}
            />
            {editorNilai(a.nilai, (v) => setAkibat(a.id, { nilai: v }), 'angka', 'Batas', () => ({ kode: 'batas', label: 'Paling banyak', tipe: 'angka' }), `${a.id}-n`)}
          </div>
        )}
        {gal && (
          <p className="u-akv-galat" role="alert">
            <CircleAlert aria-hidden /> {gal}
          </p>
        )}
      </div>
    );
  };

  // --------------------------------------------------- palet
  const itemPalet = (key: string, label: string, sub: string | null, s: Seret, onTambah: () => void, nonaktif?: string) => (
    <li key={key} className="u-akv-palet-item" data-nonaktif={nonaktif ? '' : undefined}>
      <span
        className="u-akv-palet-seret"
        draggable={!nonaktif && mode === 'kanvas'}
        onDragStart={(e) => mulaiSeret(e, s)}
        onDragEnd={() => {
          seret.current = null;
          setAtas(null);
        }}
      >
        {mode === 'kanvas' && !nonaktif && <GripVertical aria-hidden />}
        <span>
          <strong>{label}</strong>
          {sub && <small>{sub}</small>}
          {nonaktif && <small>{nonaktif}</small>}
        </span>
      </span>
      <Button variant="ghost" size="xs" iconOnly aria-label={`Tambah ${label}`} title="Tambah ke grup terpilih" disabled={Boolean(nonaktif) || !k.titik} onClick={onTambah}>
        <Plus />
      </Button>
    </li>
  );
  const paletEl = (
    <aside className="u-akv-palet" aria-label="Palet blok">
      <h4>Kondisi</h4>
      {!titik ? (
        <p className="u-ask-sub">Pilih dulu kapan aturan diperiksa; data yang bisa diperiksa mengikuti pilihan itu.</p>
      ) : (
        <>
          <div className="u-aturan-cari">
            <Search aria-hidden />
            <Input value={cariPalet} onChange={(e) => setCariPalet(e.target.value)} placeholder="Cari data, mis. IPK" aria-label="Cari kondisi" />
          </div>
          {kelompok.map((kel) => {
            const isi = indTitik.filter((i) => i.kelompok === kel && (!kataP || `${i.judul} ${i.keterangan ?? ''}`.toLowerCase().includes(kataP)));
            if (!isi.length) return null;
            return (
              <details key={kel} className="u-akv-palet-kelompok" open={Boolean(kataP) || kel === kelompok[0]}>
                <summary>
                  {kel} <span>{isi.length}</span>
                </summary>
                <ul>{isi.map((i) => itemPalet(i.kode, i.judul, i.satuan, { jenis: 'baru', simpul: () => kondisiBaru(i) }, () => tambahKe(pilihGrup, kondisiBaru(i))))}</ul>
              </details>
            );
          })}
        </>
      )}
      <h4>Penghubung</h4>
      <ul>
        {itemPalet('dan', 'DAN', 'semua syarat harus terpenuhi', { jenis: 'baru', simpul: () => grupBaru('semua') }, () => tambahKe(pilihGrup, grupBaru('semua')))}
        {itemPalet('atau', 'ATAU', 'cukup salah satu', { jenis: 'baru', simpul: () => grupBaru('salah_satu') }, () => tambahKe(pilihGrup, grupBaru('salah_satu')))}
        {itemPalet('bukan', 'BUKAN', 'kebalikan isi grup', { jenis: 'baru', simpul: () => grupBaru('semua', true) }, () => tambahKe(pilihGrup, grupBaru('semua', true)))}
      </ul>
      <h4>Akibat</h4>
      <ul>
        {P.akibat.map((a) =>
          itemPalet(`a-${a.kode}`, a.label, a.keterangan, { jenis: 'akibat', kode: a.kode }, () => tambahAkibat(a.kode), !a.siap ? 'Segera tersedia' : titik && a.langkah && !titik.jenis.includes(a.kode === 'batasi_waktu' ? 'batas_waktu' : a.kode === 'batasi_kuota' ? 'batas_nilai' : 'syarat') ? 'Tidak untuk titik ini' : undefined),
        )}
      </ul>
    </aside>
  );

  // --------------------------------------------------- pratinjau
  const slotPeta = new Map((pra?.slot ?? []).map((s) => [s.kode, s]));
  const kalimatEl = (pra?.kalimat ?? '').split(/(\{[a-z0-9_]+\})/).map((b, i) => {
    const m = /^\{([a-z0-9_]+)\}$/.exec(b);
    if (!m) return <React.Fragment key={i}>{b}</React.Fragment>;
    const s = slotPeta.get(m[1]!);
    return (
      <mark key={i} className="u-ask-celah" title={s ? `Diisi pejabat: ${s.label}` : undefined}>
        {s?.bawaan !== undefined && s.bawaan !== '' ? fmt(s.bawaan) : `[${s?.label ?? m[1]}]`}
      </mark>
    );
  });
  const daftarGalat = Object.entries(galat);
  const simpan = async (terbit: boolean) => {
    if (!judul.trim()) return toast.add({ title: 'Isi nama templat', type: 'warning' });
    if (!jenis) return toast.add({ title: 'Pilih jenis aturan', type: 'warning' });
    setSibuk(terbit ? 'terbit' : 'simpan');
    try {
      const r = await siakad.request<TemplatKelolaDetail>({
        method: 'POST',
        path: kode ? `/v1/aturan/templat/kelola/${encodeURIComponent(kode)}` : '/v1/aturan/templat/kelola',
        body: { judul: judul.trim(), jenis_aturan: jenis, kanvas: k },
      });
      const kd = r.data.kode;
      if (terbit) await siakad.request({ method: 'POST', path: `/v1/aturan/templat/kelola/${encodeURIComponent(kd)}/terbit`, body: {} });
      invalidateSiakad('aturan');
      setBerubah(false);
      toast.add({ title: terbit ? 'Templat diterbitkan' : 'Draf disimpan', description: terbit ? 'Kini muncul di “Mulai dari contoh” untuk pejabat.' : 'Pejabat belum melihatnya sampai diterbitkan.', type: 'success' });
      if (!kode) {
        muat.current = false;
        onTersimpan?.(kd);
      }
    } catch (e) {
      const d = (e as { details?: Record<string, string> }).details ?? {};
      const g: Record<string, string> = {};
      for (const [x, v] of Object.entries(d)) if (x.startsWith('kanvas.')) g[x.slice(7)] = String(v);
      setGalatServer(g);
      toast.add({ title: 'Belum bisa disimpan', description: pesanGalat(e), type: 'error' });
    } finally {
      setSibuk(null);
    }
  };

  return (
    <div className={cn('u-akv-editor', className)} data-mode={mode}>
      <div className="u-akv-editor-kepala">
        <Button variant="ghost" size="sm" onClick={onKembali}>
          <ArrowLeft /> Daftar templat
        </Button>
        <div className="u-akv-editor-judul">
          <Input value={judul} onChange={(e) => (setJudul(e.target.value), setBerubah(true))} placeholder="Nama templat, mis. Syarat IPK daftar seminar proposal" aria-label="Nama templat" />
          {kode && detail.data && (
            <Badge variant={LABEL_STATUS[detail.data.status]!.v}>
              {LABEL_STATUS[detail.data.status]!.label}
              {detail.data.versi_terbit ? ` · v${detail.data.versi_terbit}` : ''}
            </Badge>
          )}
        </div>
        <SegmentedControl
          aria-label="Tampilan"
          options={[
            { value: 'kanvas', label: 'Kanvas', icon: <Workflow /> },
            { value: 'daftar', label: 'Daftar', icon: <LayoutList /> },
          ]}
          value={mode}
          onValueChange={setMode}
        />
      </div>
      {kode && detail.data?.kanvas_catatan && !detail.data.kanvas && (
        <Alert variant="warning" title="Belum bisa disusun di kanvas">
          {detail.data.kanvas_catatan}
        </Alert>
      )}
      <div className="u-akv-atur">
        <Field label="Jenis aturan" required>
          <Pilihan tampilan="cari" options={P.jenis.map((j) => ({ value: j.kode, label: j.judul, description: j.keterangan }))} value={jenis} onValueChange={(v) => (setJenis(v), setBerubah(true))} placeholder="Pilih…" />
        </Field>
        <Field label="Diperiksa saat" required description="Titik pemeriksaan, termasuk yang dibuat dari aksi aplikasi.">
          <Pilihan
            tampilan="cari"
            options={P.titik.map((t) => ({ value: t.kode, label: t.judul, description: t.rute ? `Aksi aplikasi · ${t.kelompok}` : t.kelompok }))}
            value={k.titik || null}
            onValueChange={(v) => ubah((x) => ({ ...x, titik: v ?? '', kategori: P.titik.find((t) => t.kode === v)?.kategori[0] }))}
            placeholder="Pilih titik pemeriksaan…"
          />
        </Field>
        {titik && titik.kategori.length > 1 && (
          <Field label="Kategori">
            <Pilihan
              options={titik.kategori.map((c) => ({ value: c, label: P.kategori.find((x) => x.kode === c)?.judul ?? c }))}
              value={k.kategori ?? titik.kategori[0]!}
              onValueChange={(v) => ubah((x) => ({ ...x, kategori: v ?? undefined }))}
            />
          </Field>
        )}
      </div>
      <div className="u-akv-tata">
        {paletEl}
        <section className="u-akv-kanvas" aria-label="Kanvas ketentuan">
          <h4>Bila</h4>
          {blokGrup(k.kondisi, null)}
          <h4>Maka</h4>
          <div
            className="u-akv-akibat"
            data-atas={atas === 'akibat' || undefined}
            data-galat={galat.akibat ? '' : undefined}
            onDragOver={(e) => {
              if (seret.current?.jenis !== 'akibat') return;
              e.preventDefault();
              setAtas('akibat');
            }}
            onDragLeave={() => setAtas((a) => (a === 'akibat' ? null : a))}
            onDrop={(e) => {
              e.preventDefault();
              setAtas(null);
              const s = seret.current;
              seret.current = null;
              if (s?.jenis === 'akibat') tambahAkibat(s.kode);
            }}
          >
            {k.akibat.map(blokAkibat)}
            {!k.akibat.length && <p className="u-akv-kosong">Seret satu Akibat ke sini (mis. “Tolak / hentikan langkah”).</p>}
            {galat.akibat && (
              <p className="u-akv-galat" role="alert">
                <CircleAlert aria-hidden /> {galat.akibat}
              </p>
            )}
          </div>
        </section>
        <aside className="u-akv-pratinjau" aria-label="Pratinjau">
          <div className="u-akv-pratinjau-kartu">
            <h4>Kalimat untuk pejabat</h4>
            <p className="u-ask-kalimat" aria-live="polite">
              {pra?.kalimat ? kalimatEl : <span className="u-ask-sub">Susun ketentuan untuk melihat kalimatnya.</span>}
            </p>
            {pra && (pra.ok ? <Badge variant={pra.siap ? 'success' : 'warning'}>{pra.siap ? 'Siap dipakai pejabat' : 'Bisa disimpan, tetapi belum bisa dipakai pejabat: akibat ini belum aktif'}</Badge> : <Badge variant="danger">Belum lengkap</Badge>)}
            {(pra?.slot.length ?? 0) > 0 && (
              <>
                <h5>Isian yang diisi pejabat</h5>
                <ul className="u-akv-slot-daftar">
                  {pra!.slot.map((s) => (
                    <li key={s.kode}>
                      <strong>{s.label}</strong> <span className="u-ask-sub">{s.tipe === 'uang' ? 'rupiah' : s.tipe}{s.satuan ? ` · ${s.satuan}` : ''}{s.bawaan !== undefined ? ` · bawaan ${fmt(s.bawaan)}` : ''}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {daftarGalat.length > 0 && (
              <>
                <h5>Perlu diperbaiki</h5>
                <ul className="u-akv-galat-daftar">
                  {daftarGalat.map(([id, p]) => (
                    <li key={id}>
                      <button type="button" onClick={() => document.getElementById(`akv-${id}`)?.focus()}>
                        <Ban aria-hidden /> {p}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <details className="u-aturan-lanjutan">
              <summary>Tulis kalimat sendiri</summary>
              <Textarea
                rows={3}
                value={k.kalimat ?? ''}
                onChange={(e) => ubah((x) => ({ ...x, kalimat: e.target.value || undefined }))}
                placeholder="Kosong = kalimat otomatis. Tulis celah isian dalam kurung kurawal, mis. {ipk_min}. Semua celah wajib ada."
                aria-label="Kalimat sendiri"
              />
            </details>
          </div>
          <div className="u-akv-simpan">
            <Button variant="outline" onClick={() => simpan(false)} disabled={sibuk !== null}>
              <Save /> {sibuk === 'simpan' ? 'Menyimpan…' : 'Simpan draf'}
            </Button>
            <Button onClick={() => simpan(true)} disabled={sibuk !== null || !pra?.ok}>
              <Send /> {sibuk === 'terbit' ? 'Menerbitkan…' : 'Simpan & terbitkan'}
            </Button>
          </div>
          {berubah && <p className="u-ask-sub">Ada perubahan yang belum disimpan.</p>}
        </aside>
      </div>
      <p className="u-sr-only" aria-live="polite">
        {umum}
      </p>
    </div>
  );
}
