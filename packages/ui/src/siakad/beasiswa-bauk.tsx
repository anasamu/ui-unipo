'use client';
import * as React from 'react';
import { Banknote, CheckCheck, Download, FileSpreadsheet, HandCoins, Landmark, ListChecks, Pencil, Plus, Printer, Send, ShieldAlert, Undo2, Users, Wallet, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton, type BadgeVariant } from '../components/actions';
import { Alert, Card, CardContent, CardHeader, DescriptionList, Empty, Progress, Tabs } from '../components/display';
import { StatCard, StatGrid } from '../components/charts';
import { DataTable } from '../components/data-table';
import { Checkbox, Field, Input, Switch, Textarea } from '../components/forms';
import { Select, type SelectOption } from '../components/select';
import { ConfirmDialog, Sheet, useToast } from '../components/overlays';
import { IsianTanggal } from '../components/formulir';
import { FormGrid } from '../components/wizard';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { PilihProdi, PilihTahunAkademik } from './cari';
import { PilihBerkas } from './pilih-berkas';
import { AlurPemeriksa, type TahapPemeriksa } from './pemeriksa';

/*
 * Beasiswa tahap 2 BAUK (SIAKAD /v1/keuangan/beasiswa/*, docs/KEMAHASISWAAN.md "Beasiswa: pencairan BAUK"; keputusan Anas
 * 2026-11-19 07:07-07:14):
 *   BeasiswaBauk           halaman BAUK: Pelacakan (corong, pagu, penerima, riwayat per mahasiswa, ekspor), Penyaluran
 *                          (aturan pencairan, salurkan per periode, timpa per penerima, proses sisa), Berkas pencairan
 *                          (rekening dari Profil, persetujuan berjenjang, ekspor bank, cair/gagal/retur), Dana & deposit
 *                          (dana masuk kolektif, deposit menunggu periode), Rekonsiliasi & SPJ (XLSX/CSV, cetak PDF).
 *   IsianAturanPencairan   isian aturan pencairan (dipakai wizard program BAAK langkah "Pencairan" dan BAUK).
 *   KartuDepositBeasiswa   kartu deposit mahasiswa (Profil & Fakultas): saldo, dana menunggu periode, alokasi + bukti.
 */

const B = '/v1/keuangan/beasiswa';

// ================================================================ tipe & bantu
export interface KomponenDana {
  kode?: string;
  label: string;
  nominal: number | null;
  tujuan: 'tagihan' | 'mahasiswa' | 'catat';
}
export interface AturanPencairan {
  mode: 'ke_mahasiswa' | 'ke_tagihan' | 'campuran';
  komponen: KomponenDana[];
  prioritas: string[];
  lintas_periode: boolean;
  aturan_sisa: 'deposit' | 'transfer' | 'kewajiban' | 'hangus';
  aturan_lulus: 'kelebihan' | 'transfer' | 'hangus';
  pagu: number | null;
  persetujuan: string[];
  tersimpan?: boolean;
  bawaan?: string | null;
  terpakai?: number;
  hak?: HakBauk;
}
interface HakBauk {
  kelola: boolean;
  setujui: boolean;
  wr2: boolean;
}

const q = <T,>(path: string) => (s: ReturnType<typeof useSiakad>, signal: AbortSignal) => s.request<T>({ method: 'GET', path }, { signal });
const tgl = (s?: string | null) => (s ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s.length <= 10 ? `${s}T00:00:00` : s.replace(' ', 'T'))) : '-');
const rp = (n?: number | null) => (n == null ? '-' : `Rp${Number(n).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`);
const kosongKeNull = (s: string) => (s.trim() === '' ? null : Number(s.replace(/\./g, '').replace(',', '.')));

function galat(e: unknown): string {
  const err = e as { status?: number; message?: string; details?: Record<string, unknown> } | null;
  if (err && (err.status === 403 || err.status === 409 || err.status === 423) && err.message) return err.message;
  if (err?.status === 422 && err.details) {
    const d = Object.values(err.details).filter((v) => typeof v === 'string');
    if (d.length) return d.join('; ');
  }
  return pesanGalat(e);
}

function useAksi() {
  const s = useSiakad();
  const toast = useToast();
  return React.useCallback(
    async <T,>(path: string, body?: unknown, sukses?: string): Promise<T> => {
      try {
        const r = await s.request<T>({ method: 'POST', path, body: body ?? {} });
        if (sukses) toast.add({ title: sukses, type: 'success' });
        invalidateSiakad('beasiswa');
        return r.data;
      } catch (e) {
        toast.add({ title: 'Belum berhasil', description: galat(e), type: 'error' });
        throw e;
      }
    },
    [s, toast],
  );
}

async function unduh(s: ReturnType<typeof useSiakad>, path: string, nama: string) {
  const r = await s.request<unknown>({ method: 'GET', path });
  const d = r.data as { blob?: () => Blob } | Blob | null;
  const blob = d instanceof Blob ? d : d && typeof (d as { blob?: () => Blob }).blob === 'function' ? (d as { blob: () => Blob }).blob() : null;
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nama;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function TombolEkspor({ path, nama, label = 'Ekspor' }: { path: string; nama: string; label?: string }) {
  const s = useSiakad();
  const toast = useToast();
  const jalan = (f: 'csv' | 'xlsx') => unduh(s, `${path}${path.includes('?') ? '&' : '?'}format=${f}`, `${nama}.${f}`).catch((e) => toast.add({ title: 'Ekspor gagal', description: galat(e), type: 'error' }));
  return (
    <span className="u-bsw-aksi">
      <Button variant="outline" size="sm" onClick={() => jalan('xlsx')}>
        <FileSpreadsheet /> {label} XLSX
      </Button>
      <Button variant="ghost" size="sm" onClick={() => jalan('csv')}>
        <Download /> CSV
      </Button>
    </span>
  );
}

const MODE: SelectOption<string>[] = [
  { value: 'ke_mahasiswa', label: 'Dicairkan ke mahasiswa', description: 'Transfer/tunai lewat pencairan kolektif BAUK' },
  { value: 'ke_tagihan', label: 'Langsung ke pembayaran tagihan', description: 'Melunasi tagihan berurutan prioritas; sisa sesuai aturan' },
  { value: 'campuran', label: 'Campuran', description: 'Per komponen: sebagian ke tagihan, sebagian ke mahasiswa' },
];
const TUJUAN: SelectOption<string>[] = [
  { value: 'tagihan', label: 'Ke tagihan' },
  { value: 'mahasiswa', label: 'Ke mahasiswa' },
  { value: 'catat', label: 'Hanya dicatat' },
];
const SISA: SelectOption<string>[] = [
  { value: 'deposit', label: 'Simpan sebagai deposit', description: 'Otomatis dipakai tagihan semester berikutnya' },
  { value: 'transfer', label: 'Transfer ke mahasiswa' },
  { value: 'kewajiban', label: 'Kewajiban kembali ke pemberi' },
  { value: 'hangus', label: 'Hangus' },
];
const LULUS: SelectOption<string>[] = [
  { value: 'kelebihan', label: 'Dicatat sebagai kelebihan', description: 'Dilaporkan; BAUK memutuskan' },
  { value: 'transfer', label: 'Transfer ke mahasiswa' },
  { value: 'hangus', label: 'Hangus' },
];
const TAHAP: { kode: string; label: string; wajib?: boolean }[] = [
  { kode: 'bauk', label: 'Operator BAUK (pengaju)', wajib: true },
  { kode: 'kepala_bauk', label: 'Kepala BAUK' },
  { kode: 'wr2', label: 'Wakil Rektor II' },
];
export const BAWAAN_KIP_PENCAIRAN: AturanPencairan = {
  mode: 'ke_tagihan',
  komponen: [
    { kode: 'biaya_pendidikan', label: 'Biaya pendidikan', nominal: null, tujuan: 'tagihan' },
    { kode: 'biaya_hidup', label: 'Biaya hidup (dibayar langsung pemberi)', nominal: null, tujuan: 'catat' },
  ],
  prioritas: [],
  lintas_periode: true,
  aturan_sisa: 'deposit',
  aturan_lulus: 'kelebihan',
  pagu: null,
  persetujuan: ['bauk', 'kepala_bauk'],
};
export function ringkasAturanPencairan(a: AturanPencairan): string {
  const m = MODE.find((x) => x.value === a.mode)?.label ?? a.mode;
  const k = a.komponen.map((x) => `${x.label} ${x.nominal == null ? '(nominal diisi BAUK)' : rp(x.nominal)} ${x.tujuan === 'catat' ? 'dicatat' : x.tujuan === 'tagihan' ? 'ke tagihan' : 'ke mahasiswa'}`).join('; ');
  return `${m}. ${k}. Sisa: ${String(SISA.find((x) => x.value === a.aturan_sisa)?.label ?? a.aturan_sisa).toLowerCase()}.`;
}

// ================================================================ isian aturan (wizard BAAK & BAUK)
/** Isian aturan pencairan program: mode, komponen dana, urutan jenis biaya, sisa, sisa saat lulus, pagu, persetujuan. */
export function IsianAturanPencairan({ value: a, onChange, disabled, jenis }: { value: AturanPencairan; onChange: (a: AturanPencairan) => void; disabled?: boolean; jenis?: string | null }) {
  const set = <K extends keyof AturanPencairan>(k: K, v: AturanPencairan[K]) => onChange({ ...a, [k]: v });
  const [prioritas, setPrioritas] = React.useState(a.prioritas.join(', '));
  return (
    <div className="u-bsw-form">
      {jenis === 'kip_kuliah' && (
        <Alert variant="info" actions={!disabled ? <Button size="sm" variant="outline" onClick={() => onChange({ ...BAWAAN_KIP_PENCAIRAN, prioritas: a.prioritas, pagu: a.pagu })}>Pakai bawaan KIP</Button> : undefined}>
          Bawaan KIP Kuliah: biaya pendidikan melunasi UKT lalu jenis biaya yang diizinkan berurutan; sisa menjadi deposit untuk semester berikutnya (setelah UKT habis dialihkan ke proposal, skripsi, wisuda). Nominal diisi BAUK.
        </Alert>
      )}
      <Field label="Mode pencairan" required>
        <Select options={MODE} value={a.mode} onValueChange={(v) => set('mode', (v ?? 'ke_mahasiswa') as AturanPencairan['mode'])} disabled={disabled} />
      </Field>
      <div className="u-bsw-baris-judul">
        <span>Komponen dana</span>
        {!disabled && (
          <Button variant="ghost" size="sm" onClick={() => set('komponen', [...a.komponen, { label: '', nominal: null, tujuan: a.mode === 'ke_tagihan' ? 'tagihan' : 'mahasiswa' }])}>
            <Plus /> Tambah komponen
          </Button>
        )}
      </div>
      {a.komponen.map((k, i) => (
        <div key={i} className="u-bsw-baris u-bsw-baris-komponen">
          <Input aria-label="Nama komponen" placeholder="Mis. Biaya pendidikan" value={k.label} onChange={(e) => set('komponen', a.komponen.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} disabled={disabled} />
          <Input aria-label="Nominal komponen" placeholder="Nominal (Rp)" inputMode="numeric" value={k.nominal == null ? '' : String(k.nominal)} onChange={(e) => set('komponen', a.komponen.map((x, j) => (j === i ? { ...x, nominal: kosongKeNull(e.target.value.replace(/[^\d]/g, '')) } : x)))} disabled={disabled} />
          <Select aria-label="Tujuan komponen" options={TUJUAN} value={k.tujuan} onValueChange={(v) => set('komponen', a.komponen.map((x, j) => (j === i ? { ...x, tujuan: (v ?? 'mahasiswa') as KomponenDana['tujuan'] } : x)))} disabled={disabled || (a.mode !== 'campuran' && k.tujuan !== 'catat')} />
          {!disabled && a.komponen.length > 1 && (
            <Button variant="ghost" size="sm" aria-label="Hapus komponen" onClick={() => set('komponen', a.komponen.filter((_, j) => j !== i))}>
              <X />
            </Button>
          )}
        </div>
      ))}
      <p className="u-bsw-ket">Mode ke mahasiswa/ke tagihan menentukan tujuan semua komponen (kecuali &ldquo;hanya dicatat&rdquo;); mode campuran memakai tujuan per komponen. Nominal kosong = nominal program.</p>
      <Field label="Urutan jenis biaya sasaran (kode biaya)" optional description="Dipisah koma, berurutan. Mis. kode UKT, lalu proposal, skripsi/TA, wisuda. Kosong = semua tagihan.">
        <Input value={prioritas} onChange={(e) => setPrioritas(e.target.value)} onBlur={() => set('prioritas', prioritas.split(',').map((x) => x.trim()).filter(Boolean))} disabled={disabled} />
      </Field>
      <label className="u-bsw-saklar">
        <Switch checked={a.lintas_periode} onCheckedChange={(c) => set('lintas_periode', !!c)} disabled={disabled} /> Sisa boleh dipakai tagihan periode lain (lintas periode, termasuk tunggakan)
      </label>
      <FormGrid>
        <Field label="Aturan sisa dana">
          <Select options={SISA} value={a.aturan_sisa} onValueChange={(v) => set('aturan_sisa', (v ?? 'deposit') as AturanPencairan['aturan_sisa'])} disabled={disabled} />
        </Field>
        <Field label="Sisa saat lulus/keluar">
          <Select options={LULUS} value={a.aturan_lulus} onValueChange={(v) => set('aturan_lulus', (v ?? 'kelebihan') as AturanPencairan['aturan_lulus'])} disabled={disabled} />
        </Field>
      </FormGrid>
      <Field label="Pagu program (Rp)" optional description="Anggaran total; penyaluran ditolak bila melebihi.">
        <Input inputMode="numeric" value={a.pagu == null ? '' : String(a.pagu)} onChange={(e) => set('pagu', kosongKeNull(e.target.value.replace(/[^\d]/g, '')))} disabled={disabled} />
      </Field>
      <div className="u-bsw-cek" aria-label="Tahap persetujuan berkas pencairan">
        <span className="u-bsw-label">Persetujuan pencairan:</span>
        {TAHAP.map((t) => (
          <label key={t.kode}>
            <Checkbox checked={a.persetujuan.includes(t.kode)} disabled={disabled || t.wajib} onCheckedChange={(c) => set('persetujuan', c ? [...new Set([...a.persetujuan, t.kode])] : a.persetujuan.filter((x) => x !== t.kode))} /> {t.label}
          </label>
        ))}
      </div>
    </div>
  );
}

// ================================================================ kartu deposit mahasiswa
interface KartuDeposit {
  berlaku?: boolean;
  saldo: number;
  menunggu: number;
  dana: { id: number; sumber: string; label: string; tahun_sasaran: string | null; nominal: number; terpakai: number; sisa: number; status: string; keterangan_status: string | null; masuk: string; alokasi: { tahun_id: string; kode_biaya: string; jenis_biaya: string | null; jumlah: number; nomor_bukti: string; waktu: string }[] }[];
}
const STATUS_DANA: Record<string, [string, BadgeVariant]> = { menunggu: ['Menunggu periode', 'warning'], aktif: ['Tersedia', 'success'], habis: ['Habis terpakai', 'neutral'], ditutup: ['Ditutup', 'neutral'] };

/** Kartu deposit mahasiswa (Profil & Fakultas): saldo, dana per sumber (menunggu tagihan semester X), alokasi berbukti. */
export function KartuDepositBeasiswa({ className }: { className?: string }) {
  const d = useSiakadQuery<KartuDeposit>(['beasiswa', 'deposit-saya'], q('/v1/profil/saya/deposit'));
  const k = d.data;
  if (!k || k.berlaku === false || (!k.dana.length && !k.saldo)) return null;
  return (
    <Card className={cn('u-bsw-deposit', className)}>
      <CardHeader title="Deposit beasiswa" description="Dana beasiswa yang dipakai melunasi tagihan Anda; sisa disimpan untuk tagihan berikutnya." action={<Wallet aria-hidden />} />
      <CardContent>
        <div className="u-bsw-form">
          <StatGrid min={160}>
            <StatCard label="Saldo deposit" value={rp(k.saldo)} />
            <StatCard label="Menunggu tagihan" value={rp(k.menunggu)} />
          </StatGrid>
          {k.dana.map((x) => (
            <div key={x.id} className="u-bsw-dana">
              <div className="u-bsw-kepala">
                <strong>{x.label}</strong>
                <Badge variant={STATUS_DANA[x.status]?.[1] ?? 'neutral'}>{STATUS_DANA[x.status]?.[0] ?? x.status}</Badge>
              </div>
              <p className="u-bsw-ket">
                Masuk {rp(x.nominal)} · terpakai {rp(x.terpakai)} · sisa {rp(x.sisa)}
                {x.keterangan_status ? ` · ${x.keterangan_status}` : ''}
              </p>
              {x.alokasi.length > 0 && (
                <ul className="u-bsw-list">
                  {x.alokasi.map((a, i) => (
                    <li key={i}>
                      {a.jenis_biaya ?? a.kode_biaya} {a.tahun_id}: {rp(a.jumlah)} (bukti {a.nomor_bukti})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ================================================================ halaman BAUK
type TabBauk = 'pelacakan' | 'penyaluran' | 'berkas' | 'dana' | 'rekonsiliasi';
interface ProgramLacak {
  id: number;
  kode: string;
  nama: string;
  tahun_id: string;
  status: string;
  sumber_dana: string | null;
  mode: string;
  corong: { pendaftar: number; lolos: number; ditetapkan: number; dicairkan: number; nominal_dicairkan: number };
  pagu: number | null;
  terpakai: number;
  sisa_pagu: number | null;
}
interface PenerimaLacak {
  pendaftar_id: number;
  program_id: number;
  program: string;
  nim: string;
  nama: string | null;
  kode_prodi: string;
  status: string;
  nomor_penerima: string | null;
  disalurkan: number;
  ke_tagihan: number;
  transfer: number;
  rencana_transfer: number;
  deposit: number;
  status_pencairan: string;
}
interface Pelacakan {
  total: { pendaftar: number; lolos: number; ditetapkan: number; dicairkan: number; nominal_dicairkan: number };
  program: ProgramLacak[];
  penerima: PenerimaLacak[];
  hak: HakBauk;
}

/** Halaman Beasiswa BAUK: pelacakan, penyaluran, berkas pencairan kolektif, dana & deposit, rekonsiliasi & SPJ. */
export function BeasiswaBauk({ className }: { className?: string }) {
  const [tab, setTab] = React.useState<TabBauk>('pelacakan');
  const [program, setProgram] = React.useState<number | null>(null);
  return (
    <div className={cn('u-bsw', className)}>
      <Tabs<TabBauk>
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'pelacakan', label: 'Pelacakan', icon: <ListChecks />, content: <TabPelacakan onProgram={(id) => { setProgram(id); setTab('penyaluran'); }} /> },
          { value: 'penyaluran', label: 'Penyaluran', icon: <HandCoins />, content: <TabPenyaluran program={program} onProgram={setProgram} /> },
          { value: 'berkas', label: 'Berkas pencairan', icon: <Banknote />, content: <TabBerkas /> },
          { value: 'dana', label: 'Dana masuk & deposit', icon: <Landmark />, content: <TabDana /> },
          { value: 'rekonsiliasi', label: 'Rekonsiliasi & SPJ', icon: <FileSpreadsheet />, content: <TabRekonsiliasi program={program} onProgram={setProgram} /> },
        ]}
      />
    </div>
  );
}

function usePelacakan(f: { tahun?: string | null; prodi?: string | null; sumber?: string | null } = {}) {
  const qs = new URLSearchParams(Object.entries({ tahun_id: f.tahun ?? '', kode_prodi: f.prodi ?? '', sumber_dana: f.sumber ?? '' }).filter(([, v]) => v)).toString();
  return useSiakadQuery<Pelacakan>(['beasiswa', 'bauk', 'pelacakan', qs], q(`${B}/pelacakan${qs ? `?${qs}` : ''}`));
}

function PilihProgramBauk({ value, onValueChange }: { value: number | null; onValueChange: (id: number | null) => void }) {
  const d = usePelacakan();
  const rows = (d.data?.program ?? []).filter((p) => ['berjalan', 'selesai'].includes(p.status));
  React.useEffect(() => {
    if (value === null && rows.length) onValueChange(rows[0].id);
  }, [value, rows.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Select aria-label="Program" placeholder="Pilih…" value={value === null ? null : String(value)} onValueChange={(v) => onValueChange(v ? Number(v) : null)} options={rows.map((p) => ({ value: String(p.id), label: p.nama, description: `${p.kode} · ${p.tahun_id}` }))} />;
}

function TabPelacakan({ onProgram }: { onProgram: (id: number) => void }) {
  const [tahun, setTahun] = React.useState<string | null>(null);
  const [prodi, setProdi] = React.useState<string | null>(null);
  const [sumber, setSumber] = React.useState<string>('');
  const d = usePelacakan({ tahun, prodi, sumber });
  const [mhs, setMhs] = React.useState<string | null>(null);
  const qs = new URLSearchParams(Object.entries({ tahun_id: tahun ?? '', kode_prodi: prodi ?? '', sumber_dana: sumber }).filter(([, v]) => v)).toString();
  if (d.error) return <Alert variant="danger">{galat(d.error)}</Alert>;
  const t = d.data?.total;
  return (
    <div className="u-bsw-form">
      <div className="u-bsw-saring">
        <PilihTahunAkademik aria-label="Periode program" placeholder="Semua periode" value={tahun} onValueChange={setTahun} />
        <PilihProdi aria-label="Program studi" value={prodi} onValueChange={setProdi} />
        <Select aria-label="Sumber dana" value={sumber} onValueChange={(v) => setSumber(v ?? '')} options={[{ value: '', label: 'Semua sumber dana' }, { value: 'internal', label: 'Internal' }, { value: 'pemerintah', label: 'Pemerintah' }, { value: 'swasta', label: 'Swasta' }]} />
        <TombolEkspor path={`${B}/pelacakan/ekspor${qs ? `?${qs}` : ''}`} nama="pelacakan-beasiswa" />
      </div>
      {!d.data ? (
        <Skeleton style={{ height: 300 }} />
      ) : (
        <>
          <StatGrid min={150}>
            <StatCard label="Pendaftar" value={t!.pendaftar} icon={<Users />} />
            <StatCard label="Lolos verifikasi" value={t!.lolos} />
            <StatCard label="Ditetapkan" value={t!.ditetapkan} />
            <StatCard label="Dicairkan" value={t!.dicairkan} hint={rp(t!.nominal_dicairkan)} icon={<Banknote />} />
          </StatGrid>
          <div className="u-bsw-grid">
            {d.data.program.map((p) => (
              <Card key={p.id} interactive onClick={() => onProgram(p.id)}>
                <CardHeader title={p.nama} description={`${p.kode} · ${p.tahun_id} · ${MODE.find((m) => m.value === p.mode)?.label ?? p.mode}`} />
                <CardContent>
                  <ol className="u-bsw-corong" aria-label="Corong penerima">
                    {[['Pendaftar', p.corong.pendaftar], ['Lolos verifikasi', p.corong.lolos], ['Ditetapkan', p.corong.ditetapkan], ['Dicairkan', p.corong.dicairkan]].map(([l, n]) => (
                      <li key={l as string} style={{ ['--lebar' as string]: `${p.corong.pendaftar ? Math.max(8, ((n as number) / p.corong.pendaftar) * 100) : 0}%` }}>
                        <span>{l}</span>
                        <strong>{n}</strong>
                      </li>
                    ))}
                  </ol>
                  <p className="u-bsw-ket">Dicairkan {rp(p.corong.nominal_dicairkan)}</p>
                  {p.pagu != null && <Progress value={Math.min(100, (p.terpakai / Math.max(1, p.pagu)) * 100)} label={`Pagu ${rp(p.pagu)} · terpakai ${rp(p.terpakai)} · sisa ${rp(p.sisa_pagu)}`} showValue={false} />}
                </CardContent>
              </Card>
            ))}
          </div>
          <DataTable
            columns={[
              { key: 'nama', header: 'Penerima', cell: (r) => <span className="u-bsw-sel"><strong>{r.nama ?? r.nim}</strong><small>{r.nim} · {r.kode_prodi}</small></span>, value: (r) => r.nama ?? r.nim, sortable: true },
              { key: 'program', header: 'Program', value: (r) => r.program },
              { key: 'disalurkan', header: 'Disalurkan', align: 'end', cell: (r) => rp(r.disalurkan), value: (r) => r.disalurkan, sortable: true },
              { key: 'ke_tagihan', header: 'Ke tagihan', align: 'end', cell: (r) => rp(r.ke_tagihan), value: (r) => r.ke_tagihan },
              { key: 'transfer', header: 'Ditransfer', align: 'end', cell: (r) => rp(r.transfer), value: (r) => r.transfer },
              { key: 'deposit', header: 'Sisa deposit', align: 'end', cell: (r) => rp(r.deposit), value: (r) => r.deposit },
              { key: 'status_pencairan', header: 'Status', cell: (r) => <Badge variant={r.status === 'dicabut' ? 'danger' : r.status_pencairan === 'tuntas' ? 'success' : r.status_pencairan === 'belum disalurkan' ? 'neutral' : 'warning'}>{r.status === 'dicabut' ? 'dicabut' : r.status_pencairan}</Badge>, value: (r) => r.status_pencairan },
            ]}
            rows={d.data.penerima}
            rowKey={(r) => `${r.program_id}-${r.pendaftar_id}`}
            onRowClick={(r) => setMhs(r.nim)}
            empty={{ icon: <Users />, title: 'Belum ada penerima' }}
          />
        </>
      )}
      {mhs && <PanelRiwayatMahasiswa nim={mhs} onClose={() => setMhs(null)} />}
    </div>
  );
}

function PanelRiwayatMahasiswa({ nim, onClose }: { nim: string; onClose: () => void }) {
  const d = useSiakadQuery<{ nama: string | null; rekening: { bank: string; no_rekening: string; atas_nama: string } | null; pendaftaran: { id: number; program: string; status: string; nomor_penerima: string | null; tahun_id: string }[]; salur: { id: number; program: string; tahun_id: string; label: string; tujuan: string; nominal: number; status: string; catatan: string | null }[]; pencairan: { id: number; program: string; tahun_id: string; nominal: number; status: string; tanggal: string | null; keterangan: string | null }[]; deposit: KartuDeposit }>(['beasiswa', 'bauk', 'mhs', nim], q(`${B}/mahasiswa/${nim}`));
  const r = d.data;
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={r?.nama ?? nim} description={`Riwayat beasiswa ${nim}`} size="lg">
      {!r ? (
        <Skeleton style={{ height: 240 }} />
      ) : (
        <div className="u-bsw-form">
          <DescriptionList items={[{ label: 'Rekening (Profil)', value: r.rekening ? `${r.rekening.bank} ${r.rekening.no_rekening} a.n. ${r.rekening.atas_nama}` : <Badge variant="warning">Belum diisi</Badge> }, { label: 'Saldo deposit', value: rp(r.deposit.saldo) }, { label: 'Menunggu periode', value: rp(r.deposit.menunggu) }]} />
          <Card variant="muted">
            <CardHeader title="Program" />
            <CardContent>
              <ul className="u-bsw-list">{r.pendaftaran.map((p) => <li key={p.id}>{p.program} ({p.tahun_id}): {p.status}{p.nomor_penerima ? ` · ${p.nomor_penerima}` : ''}</li>)}</ul>
            </CardContent>
          </Card>
          <Card variant="muted">
            <CardHeader title="Penyaluran" />
            <CardContent>
              <ul className="u-bsw-list">{r.salur.map((s) => <li key={s.id}>{s.tahun_id} {s.program} — {s.label}: {rp(s.nominal)} ({s.tujuan === 'tagihan' ? 'ke tagihan/deposit' : s.tujuan === 'mahasiswa' ? 'transfer' : 'dicatat'}, {s.status}){s.catatan ? ` · ${s.catatan}` : ''}</li>)}</ul>
            </CardContent>
          </Card>
          <Card variant="muted">
            <CardHeader title="Pencairan transfer" />
            <CardContent>
              <ul className="u-bsw-list">{r.pencairan.map((c) => <li key={c.id}>{c.tahun_id} {c.program}: {rp(c.nominal)} — {c.status}{c.tanggal ? ` ${tgl(c.tanggal)}` : ''}{c.keterangan ? ` · ${c.keterangan}` : ''}</li>)}</ul>
            </CardContent>
          </Card>
          <Card variant="muted">
            <CardHeader title="Dana deposit" />
            <CardContent>
              <ul className="u-bsw-list">
                {r.deposit.dana.map((x) => (
                  <li key={x.id}>
                    {x.label}: sisa {rp(x.sisa)} ({STATUS_DANA[x.status]?.[0] ?? x.status}){x.alokasi.length ? ` · ${x.alokasi.map((a) => `${a.kode_biaya} ${a.tahun_id} ${rp(a.jumlah)} (${a.nomor_bukti})`).join('; ')}` : ''}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------- penyaluran
function TabPenyaluran({ program, onProgram }: { program: number | null; onProgram: (id: number | null) => void }) {
  const aturan = useSiakadQuery<AturanPencairan>(['beasiswa', 'bauk', 'aturan', program ?? 0], q(`${B}/program/${program ?? 0}/aturan`), { enabled: program !== null });
  const lacak = usePelacakan();
  const aksi = useAksi();
  const [ubah, setUbah] = React.useState(false);
  const [salur, setSalur] = React.useState(false);
  const [timpa, setTimpa] = React.useState<PenerimaLacak | null>(null);
  const [sisa, setSisa] = React.useState(false);
  const a = aturan.data;
  const p = lacak.data?.program.find((x) => x.id === program);
  const penerima = (lacak.data?.penerima ?? []).filter((x) => x.program_id === program);
  return (
    <div className="u-bsw-form">
      <div className="u-bsw-pilih u-bsw-pilih-2">
        <PilihProgramBauk value={program} onValueChange={onProgram} />
        <span />
        <Button variant="ghost" onClick={() => setSisa(true)}>
          <Undo2 /> Proses sisa dana
        </Button>
      </div>
      {program === null ? (
        <Empty bordered icon={<HandCoins />} title="Pilih program" description="Program yang penerimanya sudah ditetapkan BAAK." />
      ) : !a ? (
        aturan.error ? <Alert variant="danger">{galat(aturan.error)}</Alert> : <Skeleton style={{ height: 200 }} />
      ) : (
        <>
          <Card>
            <CardHeader
              title="Aturan pencairan"
              description={a.tersimpan ? 'Tersimpan' : a.bawaan === 'kip_kuliah' ? 'Bawaan KIP Kuliah (belum disimpan)' : 'Bawaan (belum disimpan)'}
              action={
                <span className="u-bsw-aksi">
                  <Button variant="outline" size="sm" onClick={() => setUbah(true)}>
                    <Pencil /> Ubah aturan
                  </Button>
                  <Button size="sm" onClick={() => setSalur(true)}>
                    <Send /> Salurkan periode
                  </Button>
                </span>
              }
            />
            <CardContent>
              <DescriptionList
                items={[
                  { label: 'Mode', value: MODE.find((m) => m.value === a.mode)?.label },
                  { label: 'Komponen', value: a.komponen.map((k) => `${k.label} ${k.nominal == null ? '(nominal program)' : rp(k.nominal)} → ${String(TUJUAN.find((t) => t.value === k.tujuan)?.label ?? k.tujuan).toLowerCase()}`).join('; ') },
                  { label: 'Urutan jenis biaya', value: a.prioritas.length ? a.prioritas.join(' → ') : 'Semua tagihan' },
                  { label: 'Sisa dana', value: `${SISA.find((x) => x.value === a.aturan_sisa)?.label}${a.lintas_periode ? ', boleh lintas periode' : ''}` },
                  { label: 'Saat lulus/keluar', value: LULUS.find((x) => x.value === a.aturan_lulus)?.label },
                  { label: 'Pagu', value: a.pagu == null ? 'Tanpa batas' : `${rp(a.pagu)} · terpakai ${rp(a.terpakai ?? 0)} · sisa ${rp(a.pagu - (a.terpakai ?? 0))}` },
                  { label: 'Persetujuan', value: a.persetujuan.map((t) => TAHAP.find((x) => x.kode === t)?.label ?? t).join(' → ') },
                ]}
              />
            </CardContent>
          </Card>
          <DataTable
            columns={[
              { key: 'nama', header: 'Penerima', cell: (r) => <span className="u-bsw-sel"><strong>{r.nama ?? r.nim}</strong><small>{r.nim} · {r.nomor_penerima ?? '-'}</small></span>, value: (r) => r.nama ?? r.nim },
              { key: 'disalurkan', header: 'Disalurkan', align: 'end', cell: (r) => rp(r.disalurkan), value: (r) => r.disalurkan },
              { key: 'ke_tagihan', header: 'Ke tagihan', align: 'end', cell: (r) => rp(r.ke_tagihan), value: (r) => r.ke_tagihan },
              { key: 'transfer', header: 'Ditransfer', align: 'end', cell: (r) => rp(r.transfer), value: (r) => r.transfer },
              { key: 'rencana_transfer', header: 'Menunggu transfer', align: 'end', cell: (r) => rp(r.rencana_transfer), value: (r) => r.rencana_transfer },
              { key: 'deposit', header: 'Sisa deposit', align: 'end', cell: (r) => rp(r.deposit), value: (r) => r.deposit },
            ]}
            rows={penerima}
            rowKey={(r) => String(r.pendaftar_id)}
            rowActions={(r) => [{ label: 'Timpa aturan penerima', icon: <Pencil />, onSelect: () => setTimpa(r) }]}
            empty={{ title: 'Belum ada penerima' }}
          />
        </>
      )}
      {ubah && a && program !== null && <PanelAturan program={program} aturan={a} onClose={() => setUbah(false)} />}
      {salur && program !== null && p && <PanelSalurkan program={p} onClose={() => setSalur(false)} />}
      {timpa && a && <PanelTimpa penerima={timpa} aturan={a} onClose={() => setTimpa(null)} />}
      {sisa && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setSisa(false)}
          title="Proses sisa dana beasiswa?"
          description="Dana dialokasikan ulang ke tagihan yang sudah terbit. Sisa yang tidak punya tagihan sasaran mengikuti aturan sisa program (transfer/kewajiban/hangus); mahasiswa lulus/keluar mengikuti aturan saat lulus. Aturan deposit tidak diubah."
          confirmLabel="Proses"
          onConfirm={async () => {
            await aksi(`${B}/proses-sisa`, {}, 'Sisa dana diproses.');
          }}
        />
      )}
    </div>
  );
}

function PanelAturan({ program, aturan, onClose }: { program: number; aturan: AturanPencairan; onClose: () => void }) {
  const aksi = useAksi();
  const [a, setA] = React.useState<AturanPencairan>(aturan);
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title="Aturan pencairan"
      description="Berlaku untuk penyaluran berikutnya; penyaluran yang sudah dibuat tidak berubah."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={() => void aksi(`${B}/program/${program}/aturan`, a, 'Aturan pencairan disimpan.').then(onClose, () => undefined)}>
            <CheckCheck /> Simpan
          </Button>
        </>
      }
    >
      <IsianAturanPencairan value={a} onChange={setA} />
    </Sheet>
  );
}

function PanelSalurkan({ program: p, onClose }: { program: ProgramLacak; onClose: () => void }) {
  const aksi = useAksi();
  const toast = useToast();
  const masuk = useSiakadQuery<{ id: number; nomor: string; tahun_id: string; nominal: number; teralokasi: number }[]>(['beasiswa', 'bauk', 'penerimaan', p.id], q(`${B}/penerimaan?program_id=${p.id}`));
  const [tahun, setTahun] = React.useState<string | null>(null);
  const [penerimaan, setPenerimaan] = React.useState<string | null>(null);
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Salurkan ${p.nama}`}
      description="Komponen ke tagihan menjadi dana deposit bertujuan (periode yang tagihannya belum terbit = menunggu); komponen ke mahasiswa menjadi rencana transfer. Aman diulang per penerima, periode, komponen."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            disabled={!tahun}
            onClick={async () => {
              try {
                const r = await aksi<{ ke_deposit: number; rencana_transfer: number; dicatat: number; nominal: number; alokasi: number; dilewati: { nim: string; komponen: string; alasan: string }[] }>(`${B}/program/${p.id}/salurkan`, { tahun_id: tahun, penerimaan_id: penerimaan ? Number(penerimaan) : null });
                toast.add({ title: 'Dana disalurkan', description: `${r.ke_deposit} ke tagihan/deposit (${r.alokasi} alokasi berkwitansi), ${r.rencana_transfer} rencana transfer, ${r.dicatat} dicatat; ${rp(r.nominal)}${r.dilewati.length ? `; ${r.dilewati.length} dilewati (nominal kosong)` : ''}.`, type: 'success' });
                onClose();
              } catch {
                /* toast sudah */
              }
            }}
          >
            <Send /> Salurkan
          </Button>
        </>
      }
    >
      <div className="u-bsw-form">
        <Field label="Periode" required>
          <PilihTahunAkademik value={tahun} onValueChange={setTahun} />
        </Field>
        <Field label="Dari dana masuk" optional description="Penyaluran dicatat terhadap dana masuk kolektif ini (sisa dicek).">
          <Select
            value={penerimaan}
            onValueChange={setPenerimaan}
            options={[{ value: '', label: 'Tanpa dana masuk tertentu' }, ...(masuk.data ?? []).map((m) => ({ value: String(m.id), label: `${m.nomor} · ${m.tahun_id}`, description: `${rp(m.nominal)} · teralokasi ${rp(m.teralokasi)}` }))]}
          />
        </Field>
      </div>
    </Sheet>
  );
}

function PanelTimpa({ penerima: r, aturan, onClose }: { penerima: PenerimaLacak; aturan: AturanPencairan; onClose: () => void }) {
  const aksi = useAksi();
  const [mode, setMode] = React.useState<string | null>(null);
  const [nominal, setNominal] = React.useState<Record<string, string>>({});
  const [alasan, setAlasan] = React.useState('');
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title="Timpa aturan penerima"
      description={`${r.nama ?? r.nim} · ${r.program}. Berlaku untuk penyaluran berikutnya; tercatat dengan alasan.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button disabled={!alasan.trim()} onClick={() => void aksi(`${B}/penerima/${r.pendaftar_id}/atur`, { mode, nominal: Object.fromEntries(Object.entries(nominal).filter(([, v]) => v)), alasan }, 'Aturan penerima ditimpa.').then(onClose, () => undefined)}>
            <CheckCheck /> Simpan
          </Button>
        </>
      }
    >
      <div className="u-bsw-form">
        <Field label="Mode untuk penerima ini" optional>
          <Select value={mode} onValueChange={setMode} options={[{ value: '', label: 'Ikut program' }, ...MODE]} />
        </Field>
        {aturan.komponen.map((k) => (
          <Field key={k.kode} label={`Nominal ${k.label}`} optional description={`Program: ${k.nominal == null ? 'nominal program' : rp(k.nominal)}`}>
            <Input inputMode="numeric" value={nominal[k.kode ?? ''] ?? ''} onChange={(e) => setNominal({ ...nominal, [k.kode ?? '']: e.target.value.replace(/[^\d]/g, '') })} />
          </Field>
        ))}
        <Field label="Alasan" required>
          <Textarea rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- berkas pencairan
interface BerkasCair {
  id: number;
  nomor: string;
  tahun_id: string;
  judul: string;
  status: string;
  total: number;
  jumlah: number;
  diekspor: number;
  jurnal_id: number | null;
  pemeriksa: TahapPemeriksa[];
  baris?: { id: number; nim: string; nama: string | null; bank: string | null; kode_bank: string | null; no_rekening: string | null; atas_nama: string | null; nominal: number; status: string; masalah: string | null; catatan: string | null; percobaan: number; program: string }[];
  bukti?: { uuid: string; nama: string }[];
  hak?: HakBauk;
}
const STATUS_BERKAS: Record<string, [string, BadgeVariant]> = { draf: ['Draf', 'neutral'], diajukan: ['Menunggu persetujuan', 'warning'], disetujui: ['Disetujui, siap transfer', 'info'], ditolak: ['Ditolak', 'danger'], selesai: ['Selesai', 'success'], dibatalkan: ['Dibatalkan', 'neutral'] };
const STATUS_BARIS: Record<string, [string, BadgeVariant]> = { menunggu: ['Menunggu', 'neutral'], dicairkan: ['Dicairkan', 'success'], gagal: ['Gagal', 'danger'], retur: ['Retur', 'danger'], dikeluarkan: ['Dikeluarkan', 'neutral'] };

function TabBerkas() {
  const d = useSiakadQuery<BerkasCair[]>(['beasiswa', 'bauk', 'berkas'], q(`${B}/berkas`));
  const [buat, setBuat] = React.useState(false);
  const [pilih, setPilih] = React.useState<number | null>(null);
  return (
    <>
      <DataTable
        columns={[
          { key: 'nomor', header: 'Berkas', cell: (r) => <span className="u-bsw-sel"><strong>{r.nomor}</strong><small>{r.judul}</small></span>, value: (r) => r.nomor },
          { key: 'tahun_id', header: 'Periode' },
          { key: 'jumlah', header: 'Baris', align: 'end' },
          { key: 'total', header: 'Total', align: 'end', cell: (r) => rp(r.total), value: (r) => r.total },
          { key: 'status', header: 'Status', cell: (r) => <Badge variant={STATUS_BERKAS[r.status]?.[1] ?? 'neutral'}>{STATUS_BERKAS[r.status]?.[0] ?? r.status}</Badge>, value: (r) => r.status },
        ]}
        rows={d.data}
        rowKey={(r) => String(r.id)}
        loading={d.loading}
        error={d.error}
        onRowClick={(r) => setPilih(r.id)}
        actions={
          <Button onClick={() => setBuat(true)}>
            <Plus /> Buat berkas pencairan
          </Button>
        }
        empty={{ icon: <Banknote />, title: 'Belum ada berkas pencairan', description: 'Salurkan dana program (mode ke mahasiswa) lalu buat berkas dari rencana transfer.' }}
      />
      {buat && <PanelBuatBerkas onClose={() => setBuat(false)} onDibuat={(id) => { setBuat(false); setPilih(id); }} />}
      {pilih !== null && <PanelBerkas id={pilih} onClose={() => setPilih(null)} />}
    </>
  );
}

function PanelBuatBerkas({ onClose, onDibuat }: { onClose: () => void; onDibuat: (id: number) => void }) {
  const [tahun, setTahun] = React.useState<string | null>(null);
  const calon = useSiakadQuery<{ id: number; nim: string; nama: string | null; nominal: number; program: string; bank: string | null; no_rekening: string | null; atas_nama: string | null }[]>(['beasiswa', 'bauk', 'calon', tahun ?? ''], q(`${B}/berkas-calon?tahun_id=${tahun ?? ''}`), { enabled: !!tahun });
  const [pilih, setPilih] = React.useState<number[] | null>(null);
  const [judul, setJudul] = React.useState('');
  const aksi = useAksi();
  const rows = calon.data ?? [];
  const terpilih = pilih ?? rows.map((r) => r.id);
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title="Buat berkas pencairan"
      description="Rencana transfer yang belum masuk berkas. Rekening diambil dari data keuangan Profil mahasiswa."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button disabled={!tahun || !terpilih.length} onClick={() => void aksi<BerkasCair>(`${B}/berkas`, { tahun_id: tahun, pencairan_id: terpilih, judul }, 'Berkas pencairan dibuat.').then((r) => onDibuat(r.id), () => undefined)}>
            <Plus /> Buat berkas ({terpilih.length})
          </Button>
        </>
      }
    >
      <div className="u-bsw-form">
        <FormGrid>
          <Field label="Periode" required>
            <PilihTahunAkademik value={tahun} onValueChange={(v) => { setTahun(v); setPilih(null); }} />
          </Field>
          <Field label="Judul" optional>
            <Input value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Mis. Pencairan beasiswa yayasan Nov 2026" />
          </Field>
        </FormGrid>
        {tahun && !rows.length && !calon.loading && <Empty bordered title="Tidak ada rencana transfer" description="Salurkan program bermode ke mahasiswa untuk periode ini." />}
        <ul className="u-bsw-pilihan">
          {rows.map((r) => {
            const kosong = !r.no_rekening;
            return (
              <li key={r.id}>
                <label>
                  <Checkbox checked={terpilih.includes(r.id)} onCheckedChange={(c) => setPilih(c ? [...terpilih, r.id] : terpilih.filter((x) => x !== r.id))} />
                  <span className="u-bsw-sel">
                    <strong>{r.nama ?? r.nim}</strong>
                    <small>
                      {r.nim} · {r.program} · {kosong ? 'rekening belum diisi' : `${r.bank} ${r.no_rekening} a.n. ${r.atas_nama}`}
                    </small>
                  </span>
                  <span className="u-bsw-aksi">
                    {kosong && <Badge variant="warning">Rekening kosong</Badge>}
                    <strong>{rp(r.nominal)}</strong>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
}

function PanelBerkas({ id, onClose }: { id: number; onClose: () => void }) {
  const d = useSiakadQuery<BerkasCair>(['beasiswa', 'bauk', 'berkas', id], q(`${B}/berkas/${id}`));
  const aksi = useAksi();
  const [konfirmasi, setKonfirmasi] = React.useState<null | 'ajukan' | 'setujui' | 'tolak' | 'batal'>(null);
  const [catatan, setCatatan] = React.useState('');
  const [cair, setCair] = React.useState(false);
  const [gagal, setGagal] = React.useState<number | null>(null);
  const r = d.data;
  const hak = r?.hak;
  const giliran = r?.pemeriksa.find((t) => t.status === 'sedang');
  const bolehSetujui = r?.status === 'diajukan' && giliran && (giliran.tahap === 'wr2' ? hak?.wr2 : hak?.setujui);
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={r?.nomor ?? 'Berkas pencairan'} description={r ? `${r.judul} · ${r.tahun_id}` : undefined} size="xl">
      {!r ? (
        d.error ? <Alert variant="danger">{galat(d.error)}</Alert> : <Skeleton style={{ height: 300 }} />
      ) : (
        <div className="u-bsw-form">
          <div className="u-bsw-kepala">
            <Badge variant={STATUS_BERKAS[r.status]?.[1] ?? 'neutral'}>{STATUS_BERKAS[r.status]?.[0] ?? r.status}</Badge>
            <Badge variant="outline">{r.jumlah} baris · {rp(r.total)}</Badge>
            {r.jurnal_id && <Badge variant="info">Jurnal #{r.jurnal_id} (draf)</Badge>}
          </div>
          <AlurPemeriksa pemeriksa={r.pemeriksa} judul="Persetujuan berjenjang" />
          <div className="u-bsw-aksi">
            {r.status === 'draf' && hak?.kelola && (
              <Button onClick={() => setKonfirmasi('ajukan')}>
                <Send /> Ajukan persetujuan
              </Button>
            )}
            {bolehSetujui && (
              <>
                <Button onClick={() => setKonfirmasi('setujui')}>
                  <CheckCheck /> Setujui ({giliran?.judul})
                </Button>
                <Button variant="outline" onClick={() => setKonfirmasi('tolak')}>
                  <X /> Tolak
                </Button>
              </>
            )}
            {['disetujui', 'selesai'].includes(r.status) && <TombolEkspor path={`${B}/berkas/${r.id}/ekspor`} nama={r.nomor.toLowerCase()} label="Daftar transfer" />}
            {r.status === 'disetujui' && hak?.kelola && (
              <Button onClick={() => setCair(true)}>
                <Banknote /> Tandai cair
              </Button>
            )}
            {['draf', 'ditolak'].includes(r.status) && hak?.kelola && (
              <Button variant="ghost" onClick={() => setKonfirmasi('batal')}>
                Batalkan berkas
              </Button>
            )}
          </div>
          {r.baris?.some((b) => b.masalah && b.status === 'menunggu') && (
            <Alert variant="warning" icon={<ShieldAlert />} title="Periksa rekening">
              Rekening diambil dari data keuangan Profil mahasiswa. Baris tanpa rekening menahan pengajuan; keluarkan barisnya atau minta mahasiswa melengkapi data.
            </Alert>
          )}
          <DataTable
            columns={[
              { key: 'nama', header: 'Penerima', cell: (b) => <span className="u-bsw-sel"><strong>{b.nama ?? b.nim}</strong><small>{b.nim} · {b.program}{b.percobaan > 1 ? ` · percobaan ke-${b.percobaan}` : ''}</small></span> },
              { key: 'rekening', header: 'Rekening (Profil)', cell: (b) => (b.no_rekening ? <span className="u-bsw-sel"><span>{b.bank} {b.no_rekening}</span><small>a.n. {b.atas_nama}</small></span> : '-') },
              { key: 'nominal', header: 'Nominal', align: 'end', cell: (b) => rp(b.nominal), value: (b) => b.nominal },
              { key: 'status', header: 'Status', cell: (b) => <span className="u-bsw-sel"><Badge variant={STATUS_BARIS[b.status]?.[1] ?? 'neutral'}>{STATUS_BARIS[b.status]?.[0] ?? b.status}</Badge>{b.masalah && b.status === 'menunggu' ? <small className="u-bsw-masalah">{b.masalah}</small> : b.catatan ? <small>{b.catatan}</small> : null}</span> },
            ]}
            rows={r.baris}
            rowKey={(b) => String(b.id)}
            pagination={false}
            rowActions={(b) => [
              ...(r.status === 'draf' && b.status === 'menunggu' ? [{ label: 'Keluarkan dari berkas', icon: <X />, onSelect: () => void aksi(`${B}/berkas/${r.id}/keluarkan`, { baris_id: b.id, catatan: b.masalah ?? 'Dikeluarkan operator' }, 'Baris dikeluarkan.') }] : []),
              ...(['disetujui', 'selesai'].includes(r.status) && ['menunggu', 'dicairkan'].includes(b.status) ? [{ label: 'Tandai gagal/retur', icon: <Undo2 />, onSelect: () => setGagal(b.id) }] : []),
            ]}
          />
          {r.bukti && r.bukti.length > 0 && <p className="u-bsw-ket">Bukti transfer: {r.bukti.map((x) => x.nama).join(', ')}</p>}
        </div>
      )}
      {r && konfirmasi && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setKonfirmasi(null)}
          title={{ ajukan: 'Ajukan berkas untuk disetujui?', setujui: `Setujui berkas ${r.nomor}?`, tolak: `Tolak berkas ${r.nomor}?`, batal: 'Batalkan berkas?' }[konfirmasi]}
          description={{ ajukan: 'Penyetuju berikutnya mendapat Kabar.', setujui: `Total ${rp(r.total)} untuk ${r.jumlah} penerima.`, tolak: 'Baris dilepas dan bisa dimasukkan ke berkas baru.', batal: 'Baris dilepas.' }[konfirmasi]}
          confirmLabel={{ ajukan: 'Ajukan', setujui: 'Setujui', tolak: 'Tolak', batal: 'Batalkan berkas' }[konfirmasi]}
          tone={konfirmasi === 'tolak' || konfirmasi === 'batal' ? 'danger' : 'primary'}
          onConfirm={async () => {
            await aksi(`${B}/berkas/${r.id}/${konfirmasi}`, { catatan, alasan: catatan }, { ajukan: 'Berkas diajukan.', setujui: 'Berkas disetujui.', tolak: 'Berkas ditolak.', batal: 'Berkas dibatalkan.' }[konfirmasi]);
            setCatatan('');
          }}
        >
          {(konfirmasi === 'setujui' || konfirmasi === 'tolak') && (
            <Field label={konfirmasi === 'tolak' ? 'Alasan' : 'Catatan'} required={konfirmasi === 'tolak'} optional={konfirmasi !== 'tolak'}>
              <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
            </Field>
          )}
        </ConfirmDialog>
      )}
      {r && cair && <PanelCairBerkas berkas={r} onClose={() => setCair(false)} />}
      {r && gagal !== null && <PanelGagal berkas={r} barisId={gagal} onClose={() => setGagal(null)} />}
    </Sheet>
  );
}

function PanelCairBerkas({ berkas: r, onClose }: { berkas: BerkasCair; onClose: () => void }) {
  const aksi = useAksi();
  const menunggu = (r.baris ?? []).filter((b) => b.status === 'menunggu');
  const [pilih, setPilih] = React.useState<number[]>(menunggu.map((b) => b.id));
  const [tanggal, setTanggal] = React.useState(new Date().toISOString().slice(0, 10));
  const [bukti, setBukti] = React.useState<string | null>(null);
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title="Tandai cair"
      description={`${r.nomor}: pilih baris yang sudah ditransfer dan unggah bukti transfer.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button disabled={!pilih.length || (!bukti && !(r.bukti ?? []).length)} onClick={() => void aksi(`${B}/berkas/${r.id}/cair`, { baris_id: pilih.length === menunggu.length ? [] : pilih, tanggal, berkas_id: bukti }, 'Pencairan dicatat; mahasiswa mendapat Kabar.').then(onClose, () => undefined)}>
            <CheckCheck /> Tandai {pilih.length} baris cair
          </Button>
        </>
      }
    >
      <div className="u-bsw-form">
        <FormGrid>
          <Field label="Tanggal transfer" required>
            <IsianTanggal value={tanggal} onValueChange={setTanggal} />
          </Field>
          <Field label="Bukti transfer" required={!(r.bukti ?? []).length}>
            <PilihBerkas value={bukti} onValueChange={(id) => setBukti(id)} accept=".pdf,.jpg,.jpeg,.png" modul="kemahasiswaan" kategori="beasiswa" />
          </Field>
        </FormGrid>
        <ul className="u-bsw-pilihan">
          {menunggu.map((b) => (
            <li key={b.id}>
              <label>
                <Checkbox checked={pilih.includes(b.id)} onCheckedChange={(c) => setPilih(c ? [...pilih, b.id] : pilih.filter((x) => x !== b.id))} />
                <span className="u-bsw-sel">
                  <strong>{b.nama ?? b.nim}</strong>
                  <small>{b.bank} {b.no_rekening}</small>
                </span>
                <strong>{rp(b.nominal)}</strong>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}

function PanelGagal({ berkas: r, barisId, onClose }: { berkas: BerkasCair; barisId: number; onClose: () => void }) {
  const aksi = useAksi();
  const [status, setStatus] = React.useState('gagal');
  const [catatan, setCatatan] = React.useState('');
  const b = r.baris?.find((x) => x.id === barisId);
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title="Transfer gagal atau retur"
      description={`${b?.nama ?? b?.nim} · ${rp(b?.nominal)}. Rencana transfer kembali dan bisa dimasukkan ke berkas berikutnya.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button disabled={!catatan.trim()} onClick={() => void aksi(`${B}/berkas/${r.id}/baris/${barisId}/gagal`, { status, catatan }, 'Baris ditandai; mahasiswa diminta memeriksa rekening.').then(onClose, () => undefined)}>
            <Undo2 /> Simpan
          </Button>
        </>
      }
    >
      <div className="u-bsw-form">
        <Field label="Status">
          <Select value={status} onValueChange={(v) => setStatus(v ?? 'gagal')} options={[{ value: 'gagal', label: 'Gagal transfer' }, { value: 'retur', label: 'Retur dari bank' }]} />
        </Field>
        <Field label="Catatan" required>
          <Textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Mis. rekening tidak aktif" />
        </Field>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- dana masuk & deposit
function TabDana() {
  const masuk = useSiakadQuery<{ id: number; nomor: string; program: string; tahun_id: string; tanggal: string; pemberi: string | null; nominal: number; teralokasi: number; bukti: number; jurnal_id: number | null }[]>(['beasiswa', 'bauk', 'penerimaan', 'semua'], q(`${B}/penerimaan`));
  const dep = useSiakadQuery<{ tahun_aktif: string; ringkas: { tahun_sasaran: string | null; mahasiswa: number; dana: number; nominal: number; terlambat: boolean }[]; dana: { id: number; nim: string; nama: string | null; label: string; tahun_sasaran: string | null; sisa: number; status: string; terlambat: number }[] }>(['beasiswa', 'bauk', 'deposit'], q(`${B}/deposit`));
  const [catat, setCatat] = React.useState(false);
  const terlambat = (dep.data?.ringkas ?? []).filter((r) => r.terlambat);
  return (
    <div className="u-bsw-form">
      <Card>
        <CardHeader title="Deposit menunggu periode" description="Dana beasiswa/bayar di muka untuk periode yang tagihannya belum terbit. Dialokasikan otomatis saat tagihan terbit (tugas terjadwal keu:deposit) atau lewat Proses sisa dana." />
        <CardContent>
          {terlambat.length > 0 && (
            <Alert variant="warning" icon={<ShieldAlert />} title="Menunggu terlalu lama">
              {terlambat.map((r) => `${r.tahun_sasaran}: ${r.mahasiswa} mahasiswa ${rp(r.nominal)}`).join('; ')} — periode sasaran sudah lewat (aktif {dep.data?.tahun_aktif}) tetapi tagihannya belum ada. Periksa tagihan atau aturan dana.
            </Alert>
          )}
          <StatGrid min={170}>
            {(dep.data?.ringkas ?? []).map((r) => (
              <StatCard key={r.tahun_sasaran ?? '-'} label={`Menunggu ${r.tahun_sasaran ?? '-'}`} value={rp(r.nominal)} hint={`${r.mahasiswa} mahasiswa · ${r.dana} dana`} />
            ))}
            {!(dep.data?.ringkas ?? []).length && <StatCard label="Menunggu periode" value="Tidak ada" />}
          </StatGrid>
          <DataTable
            columns={[
              { key: 'nama', header: 'Mahasiswa', cell: (r) => <span className="u-bsw-sel"><strong>{r.nama ?? r.nim}</strong><small>{r.nim}</small></span> },
              { key: 'label', header: 'Dana' },
              { key: 'tahun_sasaran', header: 'Periode sasaran' },
              { key: 'sisa', header: 'Sisa', align: 'end', cell: (r) => rp(r.sisa), value: (r) => r.sisa },
              { key: 'status', header: 'Status', cell: (r) => <Badge variant={Number(r.terlambat) ? 'danger' : (STATUS_DANA[r.status]?.[1] ?? 'neutral')}>{Number(r.terlambat) && r.status === 'menunggu' ? 'Terlambat' : (STATUS_DANA[r.status]?.[0] ?? r.status)}</Badge> },
            ]}
            rows={dep.data?.dana}
            rowKey={(r) => String(r.id)}
            loading={dep.loading}
            empty={{ icon: <Wallet />, title: 'Tidak ada dana deposit aktif' }}
          />
        </CardContent>
      </Card>
      <DataTable
        columns={[
          { key: 'nomor', header: 'Dana masuk', cell: (r) => <span className="u-bsw-sel"><strong>{r.nomor}</strong><small>{r.program} · {r.pemberi ?? '-'}</small></span> },
          { key: 'tanggal', header: 'Tanggal', cell: (r) => tgl(r.tanggal) },
          { key: 'tahun_id', header: 'Periode' },
          { key: 'nominal', header: 'Nominal', align: 'end', cell: (r) => rp(r.nominal), value: (r) => r.nominal },
          { key: 'teralokasi', header: 'Disalurkan', align: 'end', cell: (r) => rp(r.teralokasi), value: (r) => r.teralokasi },
          { key: 'jurnal_id', header: 'Jurnal', cell: (r) => (r.jurnal_id ? `#${r.jurnal_id}` : '-') },
        ]}
        rows={masuk.data}
        rowKey={(r) => String(r.id)}
        loading={masuk.loading}
        actions={
          <Button onClick={() => setCatat(true)}>
            <Plus /> Catat dana masuk
          </Button>
        }
        empty={{ icon: <Landmark />, title: 'Belum ada dana masuk', description: 'Catat dana kolektif dari pemberi (mis. KIP Kuliah) lalu salurkan per penerima.' }}
      />
      {catat && <PanelDanaMasuk onClose={() => setCatat(false)} />}
    </div>
  );
}

function PanelDanaMasuk({ onClose }: { onClose: () => void }) {
  const aksi = useAksi();
  const [program, setProgram] = React.useState<number | null>(null);
  const [f, setF] = React.useState({ tahun_id: null as string | null, tanggal: new Date().toISOString().slice(0, 10), pemberi: '', nominal: '', keterangan: '', berkas_id: null as string | null, salurkan: true });
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title="Catat dana masuk dari pemberi"
      description="Satu penerimaan kolektif; bisa langsung disalurkan ke semua penerima program sesuai aturan pencairannya."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button disabled={!program || !f.tahun_id || !f.nominal} onClick={() => void aksi(`${B}/program/${program}/penerimaan`, { ...f, nominal: Number(f.nominal) }, 'Dana masuk dicatat.').then(onClose, () => undefined)}>
            <CheckCheck /> Simpan
          </Button>
        </>
      }
    >
      <div className="u-bsw-form">
        <Field label="Program" required>
          <PilihProgramBauk value={program} onValueChange={setProgram} />
        </Field>
        <FormGrid>
          <Field label="Periode" required>
            <PilihTahunAkademik value={f.tahun_id} onValueChange={(v) => setF({ ...f, tahun_id: v })} />
          </Field>
          <Field label="Tanggal diterima" required>
            <IsianTanggal value={f.tanggal} onValueChange={(v) => setF({ ...f, tanggal: v })} />
          </Field>
          <Field label="Pemberi" optional>
            <Input value={f.pemberi} onChange={(e) => setF({ ...f, pemberi: e.target.value })} placeholder="Mis. Puslapdik" />
          </Field>
          <Field label="Nominal (Rp)" required>
            <Input inputMode="numeric" value={f.nominal} onChange={(e) => setF({ ...f, nominal: e.target.value.replace(/[^\d]/g, '') })} />
          </Field>
        </FormGrid>
        <Field label="Bukti penerimaan" optional>
          <PilihBerkas value={f.berkas_id} onValueChange={(id) => setF({ ...f, berkas_id: id })} accept=".pdf,.jpg,.jpeg,.png" modul="kemahasiswaan" kategori="beasiswa" />
        </Field>
        <Field label="Keterangan" optional>
          <Input value={f.keterangan} onChange={(e) => setF({ ...f, keterangan: e.target.value })} />
        </Field>
        <label className="u-bsw-saklar">
          <Switch checked={f.salurkan} onCheckedChange={(c) => setF({ ...f, salurkan: !!c })} /> Langsung salurkan ke penerima periode ini
        </label>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- rekonsiliasi
interface Rekon {
  program: { id: number; kode: string; nama: string; sumber_dana: string; nomor_sk: string | null };
  tahun_id: string | null;
  total: Record<string, number>;
  baris: { nim: string; nama: string | null; kode_prodi: string; tahun_id: string; diterima: number; ke_tagihan: number; dialokasikan: number; ditransfer: number; sisa_deposit: number; menunggu: number; ditutup: number; dicatat: number; alokasi: { tahun_id: string; kode_biaya: string; jenis_biaya: string | null; jumlah: number; nomor_bukti: string }[]; keterangan: string[] }[];
  penerimaan: { nomor: string; tahun_id: string; tanggal: string; pemberi: string | null; nominal: number; teralokasi: number }[];
}

function TabRekonsiliasi({ program, onProgram }: { program: number | null; onProgram: (id: number | null) => void }) {
  const [tahun, setTahun] = React.useState<string | null>(null);
  const d = useSiakadQuery<Rekon>(['beasiswa', 'bauk', 'rekon', program ?? 0, tahun ?? ''], q(`${B}/program/${program ?? 0}/rekonsiliasi${tahun ? `?tahun_id=${tahun}` : ''}`), { enabled: program !== null });
  const ref = React.useRef<HTMLDivElement>(null);
  const r = d.data;
  const cetak = () => {
    const el = ref.current;
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>SPJ ${r?.program.nama ?? ''}</title><style>body{font:12px system-ui,sans-serif;margin:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:4px 6px;text-align:left;vertical-align:top}td.n{text-align:right}h1{font-size:16px}</style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };
  return (
    <div className="u-bsw-form">
      <div className="u-bsw-saring">
        <PilihProgramBauk value={program} onValueChange={onProgram} />
        <PilihTahunAkademik aria-label="Periode" placeholder="Semua periode" value={tahun} onValueChange={setTahun} />
        {program !== null && <TombolEkspor path={`${B}/program/${program}/rekonsiliasi/ekspor${tahun ? `?tahun_id=${tahun}` : ''}`} nama={`spj-${program}${tahun ? `-${tahun}` : ''}`} label="SPJ" />}
        <Button variant="outline" size="sm" onClick={cetak} disabled={!r}>
          <Printer /> Cetak/PDF
        </Button>
      </div>
      {!r ? (
        program === null ? <Empty bordered title="Pilih program" /> : <Skeleton style={{ height: 240 }} />
      ) : (
        <>
          <StatGrid min={150}>
            <StatCard label="Diterima" value={rp(r.total.diterima)} />
            <StatCard label="Dialokasikan ke tagihan" value={rp(r.total.dialokasikan)} />
            <StatCard label="Ditransfer" value={rp(r.total.ditransfer)} />
            <StatCard label="Sisa deposit" value={rp(r.total.sisa_deposit)} />
            <StatCard label="Menunggu periode" value={rp(r.total.menunggu)} />
            <StatCard label="Ditutup" value={rp(r.total.ditutup)} hint="kelebihan/kewajiban" />
          </StatGrid>
          <div ref={ref} className="u-bsw-cetak">
            <h1>
              Rekonsiliasi dan SPJ {r.program.nama}
              {r.tahun_id ? ` periode ${r.tahun_id}` : ''}
            </h1>
            <p>
              SK {r.program.nomor_sk ?? '-'} · sumber dana {r.program.sumber_dana}
            </p>
            <table className="u-bsw-tabel">
              <thead>
                <tr>
                  <th>NIM / Nama</th>
                  <th>Periode</th>
                  <th>Diterima</th>
                  <th>Alokasi ke tagihan (bukti)</th>
                  <th>Ditransfer</th>
                  <th>Sisa deposit</th>
                  <th>Menunggu</th>
                  <th>Ditutup</th>
                  <th>Dicatat</th>
                </tr>
              </thead>
              <tbody>
                {r.baris.map((b, i) => (
                  <tr key={i}>
                    <td>
                      {b.nim}
                      <br />
                      {b.nama}
                    </td>
                    <td>{b.tahun_id}</td>
                    <td className="n">{rp(b.diterima)}</td>
                    <td>
                      {b.alokasi.map((a, j) => (
                        <div key={j}>
                          {a.jenis_biaya ?? a.kode_biaya} {a.tahun_id}: {rp(a.jumlah)} ({a.nomor_bukti})
                        </div>
                      ))}
                      {!b.alokasi.length && '-'}
                    </td>
                    <td className="n">{rp(b.ditransfer)}</td>
                    <td className="n">{rp(b.sisa_deposit)}</td>
                    <td className="n">{rp(b.menunggu)}</td>
                    <td className="n">
                      {rp(b.ditutup)}
                      {b.keterangan.length ? <small> {b.keterangan.join('; ')}</small> : null}
                    </td>
                    <td className="n">{rp(b.dicatat)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={2}>
                    <strong>Total</strong>
                  </td>
                  <td className="n">{rp(r.total.diterima)}</td>
                  <td className="n">{rp(r.total.dialokasikan)}</td>
                  <td className="n">{rp(r.total.ditransfer)}</td>
                  <td className="n">{rp(r.total.sisa_deposit)}</td>
                  <td className="n">{rp(r.total.menunggu)}</td>
                  <td className="n">{rp(r.total.ditutup)}</td>
                  <td className="n">{rp(r.total.dicatat)}</td>
                </tr>
              </tbody>
            </table>
            {r.penerimaan.length > 0 && (
              <p>
                Dana masuk: {r.penerimaan.map((p) => `${p.nomor} (${tgl(p.tanggal)}, ${p.pemberi ?? '-'}) ${rp(p.nominal)}, disalurkan ${rp(p.teralokasi)}`).join('; ')}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
