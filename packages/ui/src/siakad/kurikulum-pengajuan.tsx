'use client';
import * as React from 'react';
import { CircleAlert, CircleCheck, CircleX, FileCheck2, GitCompare, Plus, Send, Trash2, Undo2 } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Card, CardContent, CardHeader, DescriptionList, Tabs } from '../components/display';
import { StatCard, StatGrid } from '../components/charts';
import { DataTable } from '../components/data-table';
import { Field, Input, RadioGroup, SegmentedControl, Textarea } from '../components/forms';
import { Select } from '../components/select';
import { Sheet, useToast } from '../components/overlays';
import { FormGrid, WizardReview } from '../components/wizard';
import { PanelLangkah } from '../components/panel-langkah';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { PilihSK } from './isian-sk';
import { AlurPemeriksa, LabelPemeriksa, type TahapPemeriksa } from './pemeriksa';
import { IsianTanggal } from '../components/formulir';
import { IsianAngka } from '../components/isian-angka';
import { keAngka, teksAngka } from '../lib/angka';

/*
 * Pengajuan kurikulum baru dari Fakultas dan validasi administrasinya di BAAK (SIAKAD /v1/kurikulum-aturan/pengajuan,
 * docs/KURIKULUM.md "Pengajuan kurikulum dari Fakultas"). Alur pengesahan memakai mesin pengesahan berjenjang yang sudah
 * ada (tim kurikulum -> GPM -> Dekan -> verifikasi administrasi BAAK -> SK Rektor); hak tiap tahap dari server.
 *
 *   WizardKurikulumBaru         Fakultas & BAAK: kerangka/versi -> identitas -> struktur & MK -> CPL/BK -> tinjau & ajukan
 *   AntreanValidasiKurikulum    BAAK: antrean semua fakultas, rincian, banding kurikulum aktif, cek administrasi otomatis
 *   PengajuanKurikulumProdi     Fakultas: pengajuan prodi beserta alur pemeriksanya (GPM/Dekan bertindak di tahapnya)
 *   PanelPengajuanKurikulum     rincian satu pengajuan (dipakai keduanya)
 */

const BASIS = '/v1/kurikulum-aturan/pengajuan';
const RANAH: { value: string; label: string }[] = [
  { value: 'sikap', label: 'Sikap' },
  { value: 'pengetahuan', label: 'Pengetahuan' },
  { value: 'keterampilan_umum', label: 'Keterampilan umum' },
  { value: 'keterampilan_khusus', label: 'Keterampilan khusus' },
];

const q =
  <T,>(path: string, query?: Record<string, string | number | undefined | null>) =>
  (s: ReturnType<typeof useSiakad>, signal: AbortSignal) =>
    s.request<T>({ method: 'GET', path, query: query ? Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])) : undefined }, { signal });
const angka = (n: number | null | undefined) => (n == null ? '-' : Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 }));
const tgl = (s?: string | null) => (s ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s.length <= 10 ? `${s}T00:00:00` : s.replace(' ', 'T'))) : '-');
const semesterLabel = (t: string) => `${t.slice(0, 4)}/${Number(t.slice(0, 4)) + 1} ${t.endsWith('1') ? 'Ganjil' : t.endsWith('2') ? 'Genap' : 'Pendek'}`;

function galatKolom(e: unknown): Record<string, string> {
  const d = (e as { details?: Record<string, unknown> } | null)?.details;
  const out: Record<string, string> = {};
  if (d && typeof d === 'object') for (const [k, v] of Object.entries(d)) if (typeof v === 'string') out[k] = v;
  return out;
}
const pesan = (e: unknown) => {
  const x = e as { status?: number; message?: string } | null;
  return x?.status === 403 && x.message ? x.message : pesanGalat(e);
};

// ------------------------------------------------------------------ tipe
export interface AcuanPengajuanKurikulum {
  prodi: { kode_prodi: string; nama_prodi: string; kode_jenjang: string; kode_fakultas: string; sks_lulus: number | null };
  jenjang: { nama: string; sks_min: number | null; masa_tempuh: number | null; ipk_min: number | null } | null;
  versi_universitas: { id: number; nama: string; versi: number; kerangka: string | null; kerangka_nama: string | null; angkatan_mulai: number | null; angkatan_selesai: number | null; sks_lulus: number | null; masa_studi: { normal: number | null; maks: number | null }; obe: boolean }[];
  kerangka: { kode: string; nama: string; keterangan: string | null; cpl: boolean; bahan_kajian: boolean; profil_lulusan: boolean; alur: { jenis: string; tahap: string[] } | null }[];
  kurikulum: { id: number; kode: string; nama: string; status: string; versi: number; tahun_berlaku: number | null; jumlah_mk: number; total_sks: number; jumlah_cpl: number }[];
  semester_lama: { tahun_id: string; jumlah_mk: number; total_sks: number }[];
  aktif: { sumber: 'obe' | 'lama'; kode: string; nama: string; sks_lulus: number | null } | null;
  pengajuan_berjalan: { evaluasi_id: number; status: string; kurikulum_id: number; kode: string; nama: string }[];
  hak: { buat: boolean; impor_lama: boolean };
}
interface AlurEvaluasi {
  kode: string;
  judul: string;
  unit: string;
  peran: string;
  status: 'selesai' | 'sedang' | 'menunggu' | 'dikembalikan';
  oleh: string | null;
  waktu: string | null;
  catatan: string | null;
}
export interface PengajuanKurikulumRow {
  id: number;
  status: 'draf' | 'proses' | 'disahkan' | 'dikembalikan';
  kode_prodi: string;
  nama_prodi?: string | null;
  kode_fakultas?: string | null;
  nama_fakultas?: string | null;
  objek_id: number | null;
  tahap_ke: number;
  jumlah_tahap: number;
  tahap_sekarang: { kode: string; judul: string; aksi: string; peran: string[]; wajib_sk?: boolean } | null;
  alur: AlurEvaluasi[];
  boleh: boolean;
  isian?: Record<string, string>;
  definisi?: { instrumen: { kode: string; nama: string; wajib: boolean }[] } | null;
  penilaian?: Record<string, { oleh: string; waktu: string; keputusan: string; catatan: string | null }>;
  dibuat_oleh: string | null;
  created_at: string;
  updated_at: string;
  kurikulum?: { id: number; kode: string; nama: string; status: string; versi: number; tahun_berlaku: number | null; angkatan_mulai: number | null; kerangka: string | null; sks_lulus: number | null; jumlah_mk: number; total_sks: number } | null;
}
interface HasilPeriksa {
  aturan: string | null;
  jenjang: string | null;
  hasil: { kelompok: 'struktur' | 'kode_mk' | 'pddikti'; kode: string; tingkat: 'lolos' | 'peringatan' | 'galat'; pesan: string; rujukan: string | null }[];
  lolos: boolean;
  ringkasan: { galat: number; peringatan: number; lolos: number; jumlah_mk: number; total_sks: number; sks_wajib: number; sks_pilihan: number };
  validasi_isi: { galat: number; peringatan: number; info?: number };
}
interface MkBanding {
  kode_mk: string;
  nama: string;
  sks: number;
  semester: number;
  jenis: string | null;
}
interface HasilBanding {
  kurikulum: { kode: string; nama: string; jumlah_mk: number; total_sks: number };
  aktif: { sumber: 'obe' | 'lama'; kode: string; nama: string; jumlah_mk: number; total_sks: number } | null;
  identitas: { kolom: string; lama: unknown; baru: unknown }[];
  tambah: MkBanding[];
  hapus: MkBanding[];
  ubah: { kode_mk: string; nama: string; beda: { kolom: string; lama: unknown; baru: unknown }[] }[];
  sama: number;
}

/**
 * Alur evaluasi (bentuk server) ke bentuk AlurPemeriksa/LabelPemeriksa. Dikembalikan: tahap penyusunan kembali menjadi
 * giliran prodi, dan tahap yang mengembalikan (dari penilaian, bila ada) ditandai ditolak beserta catatannya.
 */
export function alurKePemeriksa(alur: AlurEvaluasi[] | undefined, status?: string, penilaian?: PengajuanKurikulumRow['penilaian']): TahapPemeriksa[] {
  const balik = status === 'dikembalikan' ? Object.entries(penilaian ?? {}).filter(([, p]) => p.keputusan === 'kembalikan').sort((a, b) => (a[1].waktu < b[1].waktu ? -1 : 1)).pop()?.[0] : undefined;
  return (alur ?? []).map((a, i) => ({
    tahap: a.kode,
    urut: i + 1,
    judul: a.judul,
    unit: a.unit,
    peran: a.peran,
    status: status === 'dikembalikan' ? (i === 0 ? 'sedang' : a.kode === balik ? 'ditolak' : penilaian?.[a.kode] ? 'selesai' : 'menunggu') : a.status === 'dikembalikan' ? 'sedang' : a.status,
    diproses_oleh: a.oleh,
    waktu: a.waktu,
    catatan: a.catatan,
  }));
}

function useKirim() {
  const s = useSiakad();
  const toast = useToast();
  const [sibuk, setSibuk] = React.useState(false);
  const kirim = React.useCallback(
    async <T,>(method: 'POST' | 'PUT', path: string, body: unknown, sukses?: string): Promise<T> => {
      setSibuk(true);
      try {
        const r = await s.request<T>({ method, path, body });
        if (sukses) toast.add({ title: sukses, type: 'success' });
        invalidateSiakad('kurikulum-aturan');
        invalidateSiakad('kur');
        return r.data;
      } catch (e) {
        toast.add({ title: 'Belum berhasil', description: pesan(e), type: 'error' });
        throw e;
      } finally {
        setSibuk(false);
      }
    },
    [s, toast],
  );
  return { kirim, sibuk };
}

// ================================================================== wizard kurikulum baru
interface ButirCpl {
  kode: string;
  deskripsi: string;
  ranah: string;
}
interface ButirBk {
  kode: string;
  nama: string;
}

export interface WizardKurikulumBaruProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prodi bawaan. */
  kodeProdi?: string;
  /** Prodi yang boleh dipilih (mis. prodi kelolaan kaprodi). Kosong = hanya kodeProdi. */
  pilihanProdi?: Array<{ kode_prodi: string; nama_prodi: string }>;
  /** Tampilkan opsi "ajukan" di langkah tinjau (bawaan true). */
  bolehAjukan?: boolean;
  onSelesai?: (hasil: { kurikulum: { id: number; kode: string; nama: string }; evaluasi: PengajuanKurikulumRow | null; ajukan_galat?: string | null }) => void;
}

/**
 * Wizard kurikulum baru di panel samping: (1) kerangka/versi universitas yang berlaku, (2) identitas & angkatan berlaku,
 * (3) struktur & mata kuliah (mulai kosong, salin kurikulum OBE prodi, atau impor MK kurikulum lama SIAKAD), (4) CPL &
 * bahan kajian bila kerangkanya memuat CPL, (5) tinjau lalu simpan draf atau ajukan ke alur pengesahan berjenjang.
 */
export function WizardKurikulumBaru({ open, onOpenChange, kodeProdi, pilihanProdi, bolehAjukan = true, onSelesai }: WizardKurikulumBaruProps) {
  const [prodi, setProdi] = React.useState(kodeProdi ?? pilihanProdi?.[0]?.kode_prodi ?? '');
  React.useEffect(() => {
    if (open) setProdi(kodeProdi ?? pilihanProdi?.[0]?.kode_prodi ?? '');
  }, [open, kodeProdi, pilihanProdi]);
  const acuan = useSiakadQuery<AcuanPengajuanKurikulum>(['kurikulum-aturan', 'pengajuan-acuan', prodi], q(`${BASIS}/acuan`, { prodi }), { enabled: open && !!prodi, staleTime: 0 });
  const a = acuan.data;
  const [step, setStep] = React.useState(0);
  const [versiId, setVersiId] = React.useState<string>('');
  const [kerangka, setKerangka] = React.useState<string>('');
  const tahunIni = new Date().getFullYear();
  const [f, setF] = React.useState({ kode: '', nama: '', nama_en: '', tahun_berlaku: String(tahunIni + 1), angkatan_mulai: String(tahunIni + 1), sks_lulus: '', sks_wajib: '', sks_pilihan: '', masa_tempuh: '', ipk_min_lulus: '', kompetensi_utama: '' });
  const [sumber, setSumber] = React.useState<'kosong' | 'kurikulum' | 'lama'>('lama');
  const [sumberKur, setSumberKur] = React.useState<string>('');
  const [sumberTahun, setSumberTahun] = React.useState<string>('');
  const [cpl, setCpl] = React.useState<ButirCpl[]>([]);
  const [bk, setBk] = React.useState<ButirBk[]>([]);
  const [ajukan, setAjukan] = React.useState<'ajukan' | 'draf'>(bolehAjukan ? 'ajukan' : 'draf');
  const [isian, setIsian] = React.useState({ ringkasan: '', dasar: '' });
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const { kirim } = useKirim();

  React.useEffect(() => {
    if (!open) {
      setStep(0);
      setGalat({});
      setCpl([]);
      setBk([]);
      setIsian({ ringkasan: '', dasar: '' });
      setF((x) => ({ ...x, kode: '', nama: '', nama_en: '', sks_lulus: '', sks_wajib: '', sks_pilihan: '', masa_tempuh: '', ipk_min_lulus: '', kompetensi_utama: '' }));
    }
  }, [open]);
  // Bawaan dari acuan: versi universitas terbaru, kerangkanya, semester lama terbaru.
  React.useEffect(() => {
    if (!a) return;
    const v = a.versi_universitas[0];
    setVersiId(v ? String(v.id) : '');
    setKerangka(v?.kerangka ?? a.kerangka.find((k) => k.kode === 'obe')?.kode ?? a.kerangka[0]?.kode ?? '');
    setSumberTahun(a.semester_lama[0]?.tahun_id ?? '');
    setSumber(a.semester_lama.length ? 'lama' : a.kurikulum.length ? 'kurikulum' : 'kosong');
    setSumberKur(a.kurikulum[0] ? String(a.kurikulum[0].id) : '');
  }, [a]);

  const versi = a?.versi_universitas.find((v) => String(v.id) === versiId) ?? null;
  const kr = a?.kerangka.find((k) => k.kode === kerangka) ?? null;
  const kurSumber = a?.kurikulum.find((k) => String(k.id) === sumberKur) ?? null;
  const semSumber = a?.semester_lama.find((s) => s.tahun_id === sumberTahun) ?? null;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const setN = (k: keyof typeof f) => (n: number | null) => setF((x) => ({ ...x, [k]: teksAngka(n) }));
  const nomor = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')));
  const pakaiCpl = !!kr?.cpl;
  const pakaiBk = !!kr?.bahan_kajian;
  const sksMin = Math.max(versi?.sks_lulus ?? 0, a?.jenjang?.sks_min ?? 0) || null;

  const steps = [
    {
      id: 'kerangka',
      title: 'Kerangka',
      description: 'Versi aturan kurikulum universitas yang berlaku dan kerangka penyusunan.',
      validate: () => (!prodi ? 'Pilih program studi.' : !a ? 'Acuan belum termuat.' : !a.hak.buat ? 'Akun Anda tidak berwenang menyusun kurikulum prodi ini.' : !kerangka ? 'Pilih kerangka kurikulum.' : null),
      content: (
        <div className="u-bkd-form">
          {(pilihanProdi?.length ?? 0) > 1 ? (
            <Field label="Program studi" required>
              <Select options={(pilihanProdi ?? []).map((p) => ({ value: p.kode_prodi, label: p.nama_prodi }))} value={prodi || null} onValueChange={(v) => setProdi(v ? String(v) : '')} placeholder="Pilih…" />
            </Field>
          ) : null}
          {acuan.error ? <Alert variant="danger">{pesan(acuan.error)}</Alert> : null}
          {!a ? (
            prodi ? <Skeleton style={{ height: 160 }} /> : null
          ) : (
            <>
              <p className="u-bkd-keterangan">
                {a.prodi.nama_prodi} · jenjang {a.jenjang?.nama ?? a.prodi.kode_jenjang}
                {a.jenjang?.sks_min ? ` · SKS minimal ${a.jenjang.sks_min}` : ''}
                {a.aktif ? ` · kurikulum aktif: ${a.aktif.nama}` : ' · belum ada kurikulum aktif'}
              </p>
              {a.pengajuan_berjalan.length ? (
                <Alert variant="warning" title="Ada pengajuan yang masih berjalan">
                  {a.pengajuan_berjalan.map((p) => `${p.kode} · ${p.nama} (${p.status})`).join('; ')}. Kurikulum baru tetap bisa disusun.
                </Alert>
              ) : null}
              <Field label="Versi aturan kurikulum universitas" description={a.versi_universitas.length ? 'Struktur SKS dan batas per semester diperiksa terhadap versi ini.' : 'BAAK belum menerbitkan versi aturan kurikulum universitas; struktur diperiksa terhadap ketentuan jenjang.'}>
                <Select
                  options={a.versi_universitas.map((v) => ({ value: String(v.id), label: `${v.nama} v${v.versi}${v.kerangka_nama ? ` · ${v.kerangka_nama}` : ''}${v.angkatan_mulai ? ` · angkatan ≥ ${v.angkatan_mulai}` : ''}` }))}
                  value={versiId || null}
                  onValueChange={(v) => {
                    const x = a.versi_universitas.find((y) => String(y.id) === String(v));
                    setVersiId(v ? String(v) : '');
                    if (x?.kerangka) setKerangka(x.kerangka);
                  }}
                  placeholder="Pilih…"
                  disabled={!a.versi_universitas.length}
                />
              </Field>
              <Field label="Kerangka kurikulum" required description="Menentukan bagian yang disusun (profil lulusan, CPL, bahan kajian, MK, RPS) dan alur pengesahannya.">
                <RadioGroup
                  variant="card"
                  columns={2}
                  value={kerangka || null}
                  onValueChange={(v) => setKerangka(v)}
                  options={a.kerangka.map((k) => ({ value: k.kode, label: k.nama, description: k.alur ? `Pengesahan: ${k.alur.tahap.length} tahap` : 'Belum ada alur pengesahan' }))}
                />
              </Field>
              {kr?.alur ? <p className="u-bkd-keterangan">Alur pengesahan: {kr.alur.tahap.join(' → ')}</p> : null}
            </>
          )}
        </div>
      ),
    },
    {
      id: 'identitas',
      title: 'Identitas',
      description: 'Nama, tahun, angkatan berlaku, dan beban belajar.',
      error: !!(galat['identitas.kode'] || galat.kode || galat.nama),
      validate: () => {
        if (!f.kode.trim() || !f.nama.trim()) return 'Isi kode dan nama kurikulum.';
        if (!/^[A-Za-z0-9._-]{1,30}$/.test(f.kode.trim())) return 'Kode hanya huruf, angka, titik, strip (maks. 30).';
        if (a?.kurikulum.some((k) => k.kode.toLowerCase() === f.kode.trim().toLowerCase())) return `Kode ${f.kode} sudah dipakai kurikulum lain prodi ini.`;
        const ang = Number(f.angkatan_mulai);
        if (!ang || ang < 2000 || ang > 2100) return 'Isi angkatan pertama yang memakai kurikulum ini.';
        const s = nomor(f.sks_lulus);
        if (s !== null && sksMin && s < sksMin) return `SKS lulus minimal ${sksMin}.`;
        return null;
      },
      content: (
        <div className="u-bkd-form">
          <FormGrid>
            <Field label="Kode kurikulum" required error={galat['identitas.kode'] ?? galat.kode} description="Unik per prodi, mis. K2026">
              <Input value={f.kode} onChange={set('kode')} placeholder="K2026" />
            </Field>
            <Field label="Tahun berlaku" required>
              <IsianAngka ribuan={false} value={keAngka(f.tahun_berlaku)} onValueChange={setN('tahun_berlaku')} />
            </Field>
          </FormGrid>
          <Field label="Nama kurikulum" required error={galat.nama}>
            <Input value={f.nama} onChange={set('nama')} placeholder={`Kurikulum ${a?.prodi.nama_prodi ? `${a.prodi.nama_prodi.toLowerCase().replace(/^./, (c) => c.toUpperCase())} ` : ''}${f.tahun_berlaku}`} />
          </Field>
          <FormGrid>
            <Field label="Nama (Inggris)" optional>
              <Input value={f.nama_en} onChange={set('nama_en')} />
            </Field>
            <Field label="Angkatan pertama" required description="Penetapan angkatan dilakukan setelah disahkan.">
              <IsianAngka ribuan={false} value={keAngka(f.angkatan_mulai)} onValueChange={setN('angkatan_mulai')} />
            </Field>
          </FormGrid>
          <fieldset className="u-kk-fieldset">
            <legend>Beban belajar</legend>
            <p className="u-bkd-keterangan">Kosongkan untuk memakai ketentuan jenjang{sumber !== 'kosong' ? ' atau nilai dari sumber struktur' : ''}.</p>
            <div className="u-bkd-grid-3">
              <Field label="SKS lulus" error={galat['sks_lulus']} description={sksMin ? `Minimal ${sksMin}` : undefined}>
                <IsianAngka value={keAngka(f.sks_lulus)} onValueChange={setN('sks_lulus')} />
              </Field>
              <Field label="SKS wajib">
                <IsianAngka value={keAngka(f.sks_wajib)} onValueChange={setN('sks_wajib')} />
              </Field>
              <Field label="SKS pilihan">
                <IsianAngka value={keAngka(f.sks_pilihan)} onValueChange={setN('sks_pilihan')} />
              </Field>
              <Field label="Masa tempuh (semester)">
                <IsianAngka value={keAngka(f.masa_tempuh)} onValueChange={setN('masa_tempuh')} placeholder={a?.jenjang?.masa_tempuh ? String(a.jenjang.masa_tempuh) : ''} />
              </Field>
              <Field label="IPK minimal lulus">
                <IsianAngka desimal={2} langkah={0.01} value={keAngka(f.ipk_min_lulus)} onValueChange={setN('ipk_min_lulus')} placeholder={a?.jenjang?.ipk_min ? String(a.jenjang.ipk_min) : ''} />
              </Field>
            </div>
          </fieldset>
          <Field label="Kompetensi utama lulusan" optional>
            <Textarea rows={2} value={f.kompetensi_utama} onChange={set('kompetensi_utama')} />
          </Field>
        </div>
      ),
    },
    {
      id: 'struktur',
      title: 'Struktur & MK',
      description: 'Mulai dari mata kuliah yang sudah ada, lalu sesuaikan di ruang kerja kurikulum.',
      validate: () => (sumber === 'kurikulum' && !sumberKur ? 'Pilih kurikulum sumber.' : sumber === 'lama' && !sumberTahun ? 'Pilih semester kurikulum lama.' : null),
      content: (
        <div className="u-bkd-form">
          <RadioGroup
            variant="card"
            columns={1}
            value={sumber}
            onValueChange={(v) => setSumber(v as typeof sumber)}
            options={[
              { value: 'lama', label: 'Impor dari kurikulum lama (SIAKAD)', description: a?.semester_lama.length ? `MK, SKS, semester, dan prasyarat dari tabel mata kuliah SIAKAD; tabel lama tidak diubah.` : 'Tidak ada data MK lama.', disabled: !a?.semester_lama.length },
              { value: 'kurikulum', label: 'Salin kurikulum OBE prodi', description: a?.kurikulum.length ? 'Profil lulusan, CPL, bahan kajian, MK, prasyarat, CPMK, dan matriks ikut disalin.' : 'Prodi belum punya kurikulum OBE.', disabled: !a?.kurikulum.length },
              { value: 'kosong', label: 'Mulai kosong', description: 'MK ditambahkan satu per satu di ruang kerja kurikulum.' },
            ]}
          />
          {sumber === 'lama' && a ? (
            <Field label="Semester sumber" required description="MK semester ini menjadi titik awal struktur kurikulum baru.">
              <Select options={a.semester_lama.map((s) => ({ value: s.tahun_id, label: `${semesterLabel(s.tahun_id)} · ${s.jumlah_mk} MK · ${s.total_sks} SKS` }))} value={sumberTahun || null} onValueChange={(v) => setSumberTahun(v ? String(v) : '')} placeholder="Pilih…" />
            </Field>
          ) : null}
          {sumber === 'kurikulum' && a ? (
            <Field label="Kurikulum sumber" required>
              <Select options={a.kurikulum.map((k) => ({ value: String(k.id), label: `${k.kode} · ${k.nama} (${k.status}) · ${k.jumlah_mk} MK · ${angka(k.total_sks)} SKS` }))} value={sumberKur || null} onValueChange={(v) => setSumberKur(v ? String(v) : '')} placeholder="Pilih…" />
            </Field>
          ) : null}
        </div>
      ),
    },
    ...(pakaiCpl
      ? [
          {
            id: 'cpl',
            title: pakaiBk ? 'CPL & bahan kajian' : 'CPL',
            description: 'Capaian pembelajaran lulusan (OBE). Bisa dilengkapi lagi di ruang kerja kurikulum.',
            optional: true,
            validate: () => {
              const kosong = cpl.find((c) => !c.kode.trim() || !c.deskripsi.trim());
              if (kosong) return 'Lengkapi kode dan deskripsi setiap CPL, atau hapus barisnya.';
              const kode = cpl.map((c) => c.kode.trim().toLowerCase());
              if (new Set(kode).size !== kode.length) return 'Kode CPL ganda.';
              if (bk.find((b) => !b.kode.trim() || !b.nama.trim())) return 'Lengkapi kode dan nama setiap bahan kajian, atau hapus barisnya.';
              return null;
            },
            content: (
              <div className="u-bkd-form">
                {sumber === 'kurikulum' && kurSumber ? <Alert variant="info">{kurSumber.jumlah_cpl} CPL dari {kurSumber.kode} ikut disalin. CPL baru di bawah ditambahkan (kode sama dilewati).</Alert> : null}
                <p className="u-bkd-label">Capaian pembelajaran lulusan</p>
                {cpl.map((c, i) => (
                  <Card key={i}>
                    <CardContent>
                      <div className="u-bkd-grid-3">
                        <Field label="Kode" required>
                          <Input value={c.kode} onChange={(e) => setCpl(cpl.map((x, j) => (j === i ? { ...x, kode: e.target.value } : x)))} placeholder={`CPL${i + 1}`} />
                        </Field>
                        <Field label="Ranah" required>
                          <Select options={RANAH} value={c.ranah || null} onValueChange={(v) => setCpl(cpl.map((x, j) => (j === i ? { ...x, ranah: v ? String(v) : '' } : x)))} placeholder="Pilih…" />
                        </Field>
                        <div className="u-bkd-aksi">
                          <Button variant="ghost" size="sm" onClick={() => setCpl(cpl.filter((_, j) => j !== i))}>
                            <Trash2 /> Hapus
                          </Button>
                        </div>
                      </div>
                      <Field label="Deskripsi" required>
                        <Textarea rows={2} value={c.deskripsi} onChange={(e) => setCpl(cpl.map((x, j) => (j === i ? { ...x, deskripsi: e.target.value } : x)))} />
                      </Field>
                    </CardContent>
                  </Card>
                ))}
                <div>
                  <Button variant="outline" size="sm" onClick={() => setCpl([...cpl, { kode: `CPL${cpl.length + 1}`, deskripsi: '', ranah: 'keterampilan_khusus' }])}>
                    <Plus /> Tambah CPL
                  </Button>
                </div>
                {pakaiBk ? (
                  <>
                    <p className="u-bkd-label">Bahan kajian</p>
                    {bk.map((b, i) => (
                      <div key={i} className="u-bkd-grid-3">
                        <Field label="Kode" required>
                          <Input value={b.kode} onChange={(e) => setBk(bk.map((x, j) => (j === i ? { ...x, kode: e.target.value } : x)))} placeholder={`BK${i + 1}`} />
                        </Field>
                        <Field label="Nama" required>
                          <Input value={b.nama} onChange={(e) => setBk(bk.map((x, j) => (j === i ? { ...x, nama: e.target.value } : x)))} />
                        </Field>
                        <div className="u-bkd-aksi">
                          <Button variant="ghost" size="sm" onClick={() => setBk(bk.filter((_, j) => j !== i))}>
                            <Trash2 /> Hapus
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div>
                      <Button variant="outline" size="sm" onClick={() => setBk([...bk, { kode: `BK${bk.length + 1}`, nama: '' }])}>
                        <Plus /> Tambah bahan kajian
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            ),
          },
        ]
      : []),
    {
      id: 'tinjau',
      title: 'Tinjau & ajukan',
      description: 'Periksa ringkasan, lalu simpan sebagai draf atau ajukan ke alur pengesahan.',
      validate: () => (ajukan === 'ajukan' && kr?.alur && (!isian.ringkasan.trim() || !isian.dasar.trim()) ? 'Isi ringkasan dan dasar penyusunan untuk mengajukan.' : null),
      content: (
        <div className="u-bkd-form">
          <WizardReview
            sections={[
              { title: 'Kerangka', onEdit: () => setStep(0), items: [{ label: 'Program studi', value: a?.prodi.nama_prodi }, { label: 'Versi universitas', value: versi ? `${versi.nama} v${versi.versi}` : 'Ketentuan jenjang' }, { label: 'Kerangka', value: kr?.nama }] },
              {
                title: 'Identitas',
                onEdit: () => setStep(1),
                items: [
                  { label: 'Kurikulum', value: f.kode && f.nama ? `${f.kode} · ${f.nama}` : '' },
                  { label: 'Tahun berlaku', value: f.tahun_berlaku },
                  { label: 'Angkatan pertama', value: f.angkatan_mulai },
                  { label: 'SKS lulus', value: f.sks_lulus || (sksMin ? `${sksMin} (bawaan)` : 'Bawaan jenjang') },
                ],
              },
              {
                title: 'Struktur & MK',
                onEdit: () => setStep(2),
                items: [{ label: 'Sumber', value: sumber === 'lama' ? `Kurikulum lama ${semSumber ? `${semesterLabel(semSumber.tahun_id)} (${semSumber.jumlah_mk} MK, ${semSumber.total_sks} SKS)` : ''}` : sumber === 'kurikulum' ? `Salinan ${kurSumber ? `${kurSumber.kode} (${kurSumber.jumlah_mk} MK)` : ''}` : 'Mulai kosong' }],
              },
              ...(pakaiCpl ? [{ title: pakaiBk ? 'CPL & bahan kajian' : 'CPL', onEdit: () => setStep(3), items: [{ label: 'CPL baru', value: cpl.length ? cpl.map((c) => c.kode).join(', ') : sumber === 'kurikulum' ? 'Dari sumber salinan' : 'Diisi nanti' }, ...(pakaiBk ? [{ label: 'Bahan kajian baru', value: bk.length ? bk.map((b) => b.kode).join(', ') : 'Diisi nanti' }] : [])] }] : []),
            ]}
          />
          {bolehAjukan && kr?.alur ? (
            <>
              <SegmentedControl<'ajukan' | 'draf'>
                options={[
                  { value: 'ajukan', label: 'Simpan & ajukan' },
                  { value: 'draf', label: 'Simpan draf' },
                ]}
                value={ajukan}
                onValueChange={setAjukan}
                aria-label="Simpan sebagai"
              />
              {ajukan === 'ajukan' ? (
                <>
                  <p className="u-bkd-keterangan">Diajukan ke: {kr.alur.tahap.slice(1).join(' → ')}. Bila dikembalikan, perbaiki di ruang kerja lalu ajukan ulang.</p>
                  <Field label="Ringkasan kurikulum dan perubahan" required>
                    <Textarea rows={3} value={isian.ringkasan} onChange={(e) => setIsian({ ...isian, ringkasan: e.target.value })} />
                  </Field>
                  <Field label="Dasar penyusunan" required description="Pedoman, masukan pemangku kepentingan, hasil peninjauan.">
                    <Textarea rows={3} value={isian.dasar} onChange={(e) => setIsian({ ...isian, dasar: e.target.value })} />
                  </Field>
                </>
              ) : (
                <p className="u-bkd-keterangan">Draf bisa dilengkapi di ruang kerja kurikulum, lalu diajukan dari tab Evaluasi & pengesahan.</p>
              )}
            </>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <PanelLangkah
      open={open}
      onOpenChange={onOpenChange}
      title="Kurikulum baru"
      description="Disusun prodi, diperiksa GPM, disetujui Dekan, diverifikasi BAAK, lalu ditetapkan SK Rektor."
      size="xl"
      step={step}
      onStepChange={setStep}
      steps={steps}
      finishLabel={ajukan === 'ajukan' && bolehAjukan && kr?.alur ? 'Simpan & ajukan' : 'Simpan draf'}
      onFinish={async () => {
        setGalat({});
        const body = {
          kode_prodi: prodi,
          kerangka,
          acuan_versi_id: versiId ? Number(versiId) : null,
          identitas: {
            kode: f.kode.trim(),
            nama: f.nama.trim(),
            nama_en: f.nama_en.trim() || null,
            tahun_berlaku: nomor(f.tahun_berlaku),
            angkatan_mulai: nomor(f.angkatan_mulai),
            sks_lulus: nomor(f.sks_lulus),
            sks_wajib: nomor(f.sks_wajib),
            sks_pilihan: nomor(f.sks_pilihan),
            masa_tempuh: nomor(f.masa_tempuh),
            ipk_min_lulus: nomor(f.ipk_min_lulus),
            kompetensi_utama: f.kompetensi_utama.trim() || null,
          },
          sumber: { jenis: sumber, kurikulum_id: sumber === 'kurikulum' ? Number(sumberKur) : null, tahun_id: sumber === 'lama' ? [sumberTahun] : [] },
          cpl: pakaiCpl ? cpl : [],
          bahan_kajian: pakaiBk ? bk : [],
          ajukan: bolehAjukan && !!kr?.alur && ajukan === 'ajukan',
          isian,
        };
        try {
          const r = await kirim<{ kurikulum: { id: number; kode: string; nama: string }; evaluasi: PengajuanKurikulumRow | null; ajukan_galat?: string | null }>('POST', BASIS, body, body.ajukan ? 'Kurikulum dibuat dan diajukan.' : 'Draf kurikulum dibuat.');
          onSelesai?.(r);
          return null;
        } catch (e) {
          const g = galatKolom(e);
          setGalat(g);
          return pesan(e);
        }
      }}
    />
  );
}

// ================================================================== rincian pengajuan
const STATUS: Record<PengajuanKurikulumRow['status'], [string, React.ComponentProps<typeof Badge>['variant']]> = {
  draf: ['Draf', 'neutral'],
  proses: ['Diperiksa', 'info'],
  disahkan: ['Disahkan', 'success'],
  dikembalikan: ['Dikembalikan', 'warning'],
};
const KELOMPOK: Record<HasilPeriksa['hasil'][number]['kelompok'], string> = { struktur: 'Struktur SKS', kode_mk: 'Kode mata kuliah', pddikti: 'Kesiapan PDDikti' };

function IkonTingkat({ t }: { t: 'lolos' | 'peringatan' | 'galat' }) {
  return t === 'lolos' ? <CircleCheck aria-hidden className="u-kp-ikon" data-t="lolos" /> : t === 'galat' ? <CircleX aria-hidden className="u-kp-ikon" data-t="galat" /> : <CircleAlert aria-hidden className="u-kp-ikon" data-t="peringatan" />;
}

/** Cek administrasi otomatis satu kurikulum (struktur SKS, kode MK, kesiapan PDDikti). */
export function CekAdministrasiKurikulum({ kurikulumId, className }: { kurikulumId: number; className?: string }) {
  const d = useSiakadQuery<HasilPeriksa>(['kurikulum-aturan', 'pengajuan-periksa', kurikulumId], q(`${BASIS}/kurikulum/${kurikulumId}/periksa`), { staleTime: 0 });
  if (!d.data) return d.error ? <Alert variant="danger">{pesan(d.error)}</Alert> : <Skeleton style={{ height: 180 }} />;
  const x = d.data;
  return (
    <div className={cn('u-bkd-form', className)}>
      <Alert variant={x.lolos ? 'success' : 'warning'} title={x.lolos ? 'Lolos cek administrasi' : `${x.ringkasan.galat} temuan perlu diperbaiki prodi`}>
        {x.ringkasan.jumlah_mk} MK · {angka(x.ringkasan.total_sks)} SKS (wajib {angka(x.ringkasan.sks_wajib)}, pilihan {angka(x.ringkasan.sks_pilihan)}) · acuan {x.aturan ?? `ketentuan jenjang ${x.jenjang ?? ''}`}
      </Alert>
      {(['struktur', 'kode_mk', 'pddikti'] as const).map((k) => (
        <div key={k}>
          <p className="u-bkd-label">{KELOMPOK[k]}</p>
          <ul className="u-kp-cek">
            {x.hasil
              .filter((h) => h.kelompok === k)
              .map((h) => (
                <li key={h.kode} data-t={h.tingkat}>
                  <IkonTingkat t={h.tingkat} />
                  <span>
                    {h.pesan}
                    {h.rujukan ? <small> ({h.rujukan})</small> : null}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ))}
      <p className="u-bkd-keterangan">
        Validasi isi (SN Dikti/OBE, dinilai GPM/Dekan, bukan wewenang BAAK): {x.validasi_isi.galat} galat, {x.validasi_isi.peringatan} peringatan.
      </p>
    </div>
  );
}

/** Banding kurikulum yang diajukan dengan kurikulum aktif prodi (OBE berlaku/disahkan, atau MK SIAKAD lama). */
export function BandingKurikulumAktif({ kurikulumId, className }: { kurikulumId: number; className?: string }) {
  const d = useSiakadQuery<HasilBanding>(['kurikulum-aturan', 'pengajuan-banding', kurikulumId], q(`${BASIS}/kurikulum/${kurikulumId}/banding`), { staleTime: 0 });
  if (!d.data) return d.error ? <Alert variant="danger">{pesan(d.error)}</Alert> : <Skeleton style={{ height: 180 }} />;
  const x = d.data;
  if (!x.aktif) return <Alert variant="info">Prodi belum punya kurikulum aktif; semua {x.kurikulum.jumlah_mk} MK adalah MK baru.</Alert>;
  const tabelMk = (rows: MkBanding[]) => (
    <table className="u-kur-tabel">
      <thead>
        <tr>
          <th>Kode</th>
          <th>Nama</th>
          <th>SKS</th>
          <th>Smt</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((m) => (
          <tr key={m.kode_mk}>
            <td>{m.kode_mk}</td>
            <td>{m.nama}</td>
            <td>{angka(m.sks)}</td>
            <td>{m.semester}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  return (
    <div className={cn('u-bkd-form', className)}>
      <p className="u-bkd-keterangan">
        Dibanding {x.aktif.nama} ({x.aktif.jumlah_mk} MK, {angka(x.aktif.total_sks)} SKS) → {x.kurikulum.kode} ({x.kurikulum.jumlah_mk} MK, {angka(x.kurikulum.total_sks)} SKS).
      </p>
      <StatGrid>
        <StatCard label="MK baru" value={x.tambah.length} />
        <StatCard label="MK dihapus" value={x.hapus.length} />
        <StatCard label="MK berubah" value={x.ubah.length} />
        <StatCard label="MK sama" value={x.sama} />
      </StatGrid>
      {x.identitas.length ? (
        <DescriptionList items={x.identitas.map((i) => ({ label: i.kolom, value: `${String(i.lama)} → ${String(i.baru)}` }))} />
      ) : null}
      {x.ubah.length ? (
        <Card>
          <CardHeader title="MK berubah" />
          <CardContent>
            <ul className="u-kp-cek">
              {x.ubah.map((u) => (
                <li key={u.kode_mk}>
                  <GitCompare aria-hidden className="u-kp-ikon" />
                  <span>
                    <strong>{u.kode_mk}</strong> {u.nama}: {u.beda.map((b) => `${b.kolom} ${String(b.lama)} → ${String(b.baru)}`).join('; ')}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
      {x.tambah.length ? (
        <Card>
          <CardHeader title="MK baru" />
          <CardContent>{tabelMk(x.tambah)}</CardContent>
        </Card>
      ) : null}
      {x.hapus.length ? (
        <Card>
          <CardHeader title="MK tidak ada lagi" />
          <CardContent>{tabelMk(x.hapus)}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export interface PanelPengajuanKurikulumProps {
  evaluasiId: number;
  onOpenChange: (open: boolean) => void;
  /** Teks tombol setuju (bawaan dari aksi tahap: Ajukan / Verifikasi / Setujui & teruskan / Tetapkan). */
  labelSetuju?: string;
  /** Buka ruang kerja kurikulum (Fakultas/BAAK). */
  onBukaKurikulum?: (kurikulumId: number) => void;
}

/** Rincian satu pengajuan kurikulum: alur pemeriksa, identitas, cek administrasi, banding, dan tindakan tahap sekarang. */
export function PanelPengajuanKurikulum({ evaluasiId, onOpenChange, labelSetuju, onBukaKurikulum }: PanelPengajuanKurikulumProps) {
  const d = useSiakadQuery<PengajuanKurikulumRow>(['kurikulum-aturan', 'evaluasi', 'detail', evaluasiId], q(`/v1/kurikulum-aturan/evaluasi/${evaluasiId}`), { staleTime: 0 });
  const x = d.data;
  const kur = useSiakadQuery<{ id: number; kode: string; nama: string; status: string; nama_prodi?: string; tahun_berlaku: number | null; angkatan_mulai?: number | null; kerangka?: string | null; sks_lulus: number | null; masa_tempuh: number | null; ipk_min_lulus: number | null; ringkasan?: { mata_kuliah: number; cpl: number; bahan_kajian: number; sks_wajib_mk: number; sks_pilihan_mk: number } }>(
    ['kur', 'kurikulum', x?.objek_id],
    q(`/v1/kurikulum-obe/kurikulum/${x?.objek_id}`),
    { enabled: !!x?.objek_id, staleTime: 0 },
  );
  const { kirim, sibuk } = useKirim();
  const [tab, setTab] = React.useState<'ringkasan' | 'cek' | 'banding'>('ringkasan');
  const [catatan, setCatatan] = React.useState('');
  const [sk, setSk] = React.useState<{ sk_id: string | null; no_sk: string; tanggal_sk: string }>({ sk_id: null, no_sk: '', tanggal_sk: '' });
  const t = x?.tahap_sekarang;
  const aktif = !!x && x.boleh && x.status !== 'disahkan';
  const wajibSk = !!t?.wajib_sk && aktif;
  const isiTahap = t?.aksi === 'isi';
  const terakhir = !!x && x.tahap_ke + 1 >= x.jumlah_tahap;
  const label = labelSetuju ?? (isiTahap ? 'Ajukan' : terakhir ? 'Tetapkan' : t?.kode === 'baak' ? 'Verifikasi' : 'Setujui & teruskan');
  const proses = async (keputusan: 'lanjut' | 'kembalikan') => {
    if (!x) return;
    if (isiTahap && keputusan === 'lanjut' && x.objek_id) {
      await kirim('POST', `${BASIS}/kurikulum/${x.objek_id}/ajukan`, { isian: x.isian ?? {} }, 'Kurikulum diajukan.');
    } else {
      await kirim('POST', `/v1/kurikulum-aturan/evaluasi/${evaluasiId}/proses`, { keputusan, catatan, ...(wajibSk && keputusan === 'lanjut' ? { sk_id: sk.sk_id, no_sk: sk.no_sk || null, tanggal_sk: sk.tanggal_sk || null } : {}) }, keputusan === 'kembalikan' ? 'Dikembalikan ke prodi.' : terakhir ? 'Kurikulum ditetapkan.' : 'Diteruskan ke tahap berikutnya.');
    }
    setCatatan('');
    d.refetch();
  };
  const k = kur.data;
  return (
    <Sheet
      open
      onOpenChange={onOpenChange}
      size="xl"
      title={k ? `${k.kode} · ${k.nama}` : 'Pengajuan kurikulum'}
      description={x ? `${x.nama_prodi ?? k?.nama_prodi ?? x.kode_prodi} · ${STATUS[x.status][0]}${t && x.status !== 'disahkan' ? ` · tahap ${x.tahap_ke + 1}/${x.jumlah_tahap}: ${t.judul}` : ''}` : undefined}
      footer={
        aktif ? (
          <>
            {x!.tahap_ke > 0 ? (
              <Button variant="destructive-soft" loading={sibuk} disabled={catatan.trim().length < 5} onClick={() => void proses('kembalikan')}>
                <Undo2 /> Kembalikan
              </Button>
            ) : null}
            <Button loading={sibuk} disabled={wajibSk && !sk.sk_id && !sk.no_sk.trim()} onClick={() => void proses('lanjut')}>
              {isiTahap ? <Send /> : <FileCheck2 />} {label}
            </Button>
          </>
        ) : undefined
      }
    >
      {!x ? (
        d.error ? <Alert variant="danger">{pesan(d.error)}</Alert> : <Skeleton style={{ height: 240 }} />
      ) : (
        <div className="u-bkd-form">
          <AlurPemeriksa pemeriksa={alurKePemeriksa(x.alur, x.status, x.penilaian)} judul="Alur pengesahan" />
          {x.status === 'dikembalikan' ? (
            <Alert variant="warning" title="Dikembalikan ke prodi">
              {Object.values(x.penilaian ?? {}).filter((p) => p.keputusan === 'kembalikan').slice(-1)[0]?.catatan ?? 'Perbaiki lalu ajukan ulang.'}
            </Alert>
          ) : null}
          {!aktif && x.status !== 'disahkan' && t ? <p className="u-bkd-keterangan">Menunggu {x.alur[x.tahap_ke]?.unit ?? t.judul}. Anda dapat melihat rincian; tindakan hanya untuk pemegang peran tahap ini.</p> : null}
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as typeof tab)}
            items={[
              {
                value: 'ringkasan',
                label: 'Ringkasan',
                content: (
                  <div className="u-bkd-form">
                    {k ? (
                      <DescriptionList
                        items={[
                          { label: 'Program studi', value: k.nama_prodi ?? x.kode_prodi },
                          { label: 'Kurikulum', value: `${k.kode} · ${k.nama} (${k.status})` },
                          { label: 'Tahun berlaku / angkatan', value: `${k.tahun_berlaku ?? '-'} / ${k.angkatan_mulai ?? '-'}` },
                          { label: 'Kerangka', value: k.kerangka ?? '-' },
                          { label: 'Beban belajar', value: `${k.sks_lulus ?? '-'} SKS lulus · ${k.masa_tempuh ?? '-'} semester · IPK ≥ ${k.ipk_min_lulus ?? '-'}` },
                          { label: 'Isi', value: k.ringkasan ? `${k.ringkasan.mata_kuliah} MK (${angka(k.ringkasan.sks_wajib_mk)} SKS wajib, ${angka(k.ringkasan.sks_pilihan_mk)} pilihan) · ${k.ringkasan.cpl} CPL · ${k.ringkasan.bahan_kajian} bahan kajian` : '-' },
                          { label: 'Diajukan', value: `${x.dibuat_oleh ?? '-'} · ${tgl(x.created_at)}` },
                        ]}
                      />
                    ) : (
                      <Skeleton style={{ height: 120 }} />
                    )}
                    {(x.definisi?.instrumen ?? []).map((i) => (
                      <Field key={i.kode} label={i.nama}>
                        <p className="u-kp-isian">{x.isian?.[i.kode] || '-'}</p>
                      </Field>
                    ))}
                    {onBukaKurikulum && x.objek_id ? (
                      <div>
                        <Button variant="outline" size="sm" onClick={() => onBukaKurikulum(x.objek_id!)}>
                          Buka ruang kerja kurikulum
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ),
              },
              { value: 'cek', label: 'Cek administrasi', content: x.objek_id ? <CekAdministrasiKurikulum kurikulumId={x.objek_id} /> : null },
              { value: 'banding', label: 'Banding kurikulum aktif', content: x.objek_id ? <BandingKurikulumAktif kurikulumId={x.objek_id} /> : null },
            ]}
          />
          {wajibSk ? (
            <Card>
              <CardHeader title="SK penetapan" description="Wajib di tahap ini: pilih SK dari registri SK, atau isi nomor SK." />
              <CardContent>
                <div className="u-bkd-form">
                  <PilihSK value={sk.sk_id} onValueChange={(v: string | null) => setSk({ ...sk, sk_id: v })} jenis="kurikulum" label="SK dari registri" />
                  <FormGrid>
                    <Field label="Nomor SK" optional>
                      <Input value={sk.no_sk} onChange={(e) => setSk({ ...sk, no_sk: e.target.value })} />
                    </Field>
                    <Field label="Tanggal SK" optional>
                      <IsianTanggal value={sk.tanggal_sk} onValueChange={(v) => setSk({ ...sk, tanggal_sk: v })} />
                    </Field>
                  </FormGrid>
                </div>
              </CardContent>
            </Card>
          ) : null}
          {aktif && !isiTahap ? (
            <Field label={`Catatan ${t?.judul ?? ''}`} description="Wajib bila mengembalikan (minimal 5 huruf).">
              <Textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
            </Field>
          ) : null}
        </div>
      )}
    </Sheet>
  );
}

// ================================================================== antrean BAAK
type SaringAntrean = 'saya' | 'proses' | 'dikembalikan' | 'disahkan' | 'semua';

/** BAAK: antrean validasi pengajuan kurikulum dari semua fakultas (verifikasi administrasi, bukan menilai isi). */
export function AntreanValidasiKurikulum({ className, onBukaKurikulum }: { className?: string; onBukaKurikulum?: (kurikulumId: number) => void }) {
  const [saring, setSaring] = React.useState<SaringAntrean>('saya');
  const [fak, setFak] = React.useState<string>('');
  const daftar = useSiakadQuery<PengajuanKurikulumRow[]>(['kurikulum-aturan', 'pengajuan', saring], q(BASIS, saring === 'saya' ? { giliran: 'saya' } : saring === 'semua' ? {} : { status: saring }), { staleTime: 0 });
  const semua = useSiakadQuery<PengajuanKurikulumRow[]>(['kurikulum-aturan', 'pengajuan', 'semua'], q(BASIS), { staleTime: 0 });
  const [buka, setBuka] = React.useState<number | null>(null);
  const rows = (daftar.data ?? []).filter((r) => !fak || r.kode_fakultas === fak);
  const fakultas = Array.from(new Map((semua.data ?? []).filter((r) => r.kode_fakultas).map((r) => [r.kode_fakultas!, r.nama_fakultas ?? r.kode_fakultas!])).entries());
  const n = (f: (r: PengajuanKurikulumRow) => boolean) => (semua.data ?? []).filter(f).length;
  return (
    <div className={cn('u-bkd-form', className)}>
      <StatGrid>
        <StatCard label="Menunggu Anda" value={n((r) => r.boleh && r.status !== 'disahkan')} />
        <StatCard label="Sedang diperiksa" value={n((r) => r.status === 'proses')} />
        <StatCard label="Dikembalikan" value={n((r) => r.status === 'dikembalikan')} />
        <StatCard label="Disahkan" value={n((r) => r.status === 'disahkan')} />
      </StatGrid>
      <p className="u-bkd-keterangan">BAAK memverifikasi administrasi (struktur SKS sesuai aturan, kode MK, kesiapan PDDikti). Isi kurikulum disusun prodi dan dinilai GPM/Dekan.</p>
      <div className="u-bkd-aksi">
        <SegmentedControl<SaringAntrean>
          options={[
            { value: 'saya', label: 'Menunggu saya' },
            { value: 'proses', label: 'Diperiksa' },
            { value: 'dikembalikan', label: 'Dikembalikan' },
            { value: 'disahkan', label: 'Disahkan' },
            { value: 'semua', label: 'Semua' },
          ]}
          value={saring}
          onValueChange={setSaring}
          aria-label="Saring antrean"
        />
        {fakultas.length > 1 ? <Select options={fakultas.map(([v, l]) => ({ value: v, label: l }))} value={fak || null} onValueChange={(v) => setFak(v ? String(v) : '')} placeholder="Pilih…" /> : null}
      </div>
      {daftar.error ? <Alert variant="danger">{pesan(daftar.error)}</Alert> : null}
      <DataTable
        rows={rows}
        rowKey={(r) => String(r.id)}
        columnToggle={false}
        densityToggle={false}
        loading={daftar.loading && !daftar.data}
        onRowClick={(r) => setBuka(r.id)}
        columns={[
          { key: 'kurikulum', header: 'Kurikulum', mobile: 'title', cell: (r) => <span className="u-kur-sel"><strong>{r.kurikulum ? `${r.kurikulum.kode} · ${r.kurikulum.nama}` : `#${r.objek_id}`}</strong><small>{r.nama_prodi ?? r.kode_prodi} · {r.nama_fakultas ?? r.kode_fakultas ?? '-'}</small></span> },
          { key: 'isi', header: 'Isi', cell: (r) => (r.kurikulum ? `${r.kurikulum.jumlah_mk} MK · ${angka(r.kurikulum.total_sks)} SKS` : '-') },
          { key: 'pemeriksa', header: 'Pemeriksa', mobile: 'badge', cell: (r) => (r.status === 'dikembalikan' ? <Badge variant="warning">Dikembalikan ke prodi</Badge> : <LabelPemeriksa pemeriksa={alurKePemeriksa(r.alur, r.status)} cadangan={<Badge variant={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge>} />) },
          { key: 'waktu', header: 'Diperbarui', shrink: true, cell: (r) => tgl(r.updated_at) },
        ]}
        empty={{ title: saring === 'saya' ? 'Tidak ada pengajuan yang menunggu Anda' : 'Belum ada pengajuan', description: 'Pengajuan kurikulum dari Fakultas tampil di sini setelah melewati tahap GPM dan Dekan.' }}
      />
      {buka ? <PanelPengajuanKurikulum evaluasiId={buka} onOpenChange={(o) => !o && setBuka(null)} onBukaKurikulum={onBukaKurikulum} /> : null}
    </div>
  );
}

/** Fakultas: pengajuan kurikulum satu prodi beserta alur pemeriksanya. */
export function PengajuanKurikulumProdi({ prodi, kepala, className, onBukaKurikulum }: { prodi: string; /** Tampil di atas daftar bila ada pengajuan. */ kepala?: React.ReactNode; className?: string; onBukaKurikulum?: (kurikulumId: number) => void }) {
  const daftar = useSiakadQuery<PengajuanKurikulumRow[]>(['kurikulum-aturan', 'pengajuan', 'prodi', prodi], q(BASIS, { prodi }), { staleTime: 0, enabled: !!prodi });
  const [buka, setBuka] = React.useState<number | null>(null);
  const rows = daftar.data ?? [];
  if (!rows.length) return null;
  return (
    <div className={cn('u-bkd-form', className)}>
      {kepala}
      <DataTable
        rows={rows}
        rowKey={(r) => String(r.id)}
        columnToggle={false}
        densityToggle={false}
        loading={daftar.loading && !daftar.data}
        onRowClick={(r) => setBuka(r.id)}
        columns={[
          { key: 'kurikulum', header: 'Pengajuan kurikulum', mobile: 'title', cell: (r) => <span className="u-kur-sel"><strong>{r.kurikulum ? `${r.kurikulum.kode} · ${r.kurikulum.nama}` : `#${r.objek_id}`}</strong><small>{r.kurikulum ? `${r.kurikulum.jumlah_mk} MK · ${angka(r.kurikulum.total_sks)} SKS` : ''}</small></span> },
          { key: 'pemeriksa', header: 'Pemeriksa', mobile: 'badge', cell: (r) => (r.status === 'dikembalikan' ? <Badge variant="warning">Dikembalikan ke prodi</Badge> : <LabelPemeriksa pemeriksa={alurKePemeriksa(r.alur, r.status)} cadangan={<Badge variant={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge>} />) },
          { key: 'aksi', header: '', shrink: true, cell: (r) => (r.boleh && r.status !== 'disahkan' ? <Badge variant="warning">Giliran Anda</Badge> : null) },
          { key: 'waktu', header: 'Diperbarui', shrink: true, cell: (r) => tgl(r.updated_at) },
        ]}
      />
      {buka ? <PanelPengajuanKurikulum evaluasiId={buka} onOpenChange={(o) => !o && setBuka(null)} onBukaKurikulum={onBukaKurikulum} /> : null}
    </div>
  );
}
