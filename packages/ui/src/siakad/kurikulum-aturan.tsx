'use client';
import * as React from 'react';
import { Archive, BookCheck, CircleAlert, Copy, Eye, FileCheck2, FileUp, GitBranch, GitCompare, Import, Layers, Pencil, Plus, Send, ShieldCheck, Trash2, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Card, CardContent, CardHeader, DescriptionList, Empty, Tabs } from '../components/display';
import { StatCard, StatGrid } from '../components/charts';
import { DataTable } from '../components/data-table';
import { labelTahunAkademik } from './akademik';
import { Checkbox, Field, Input, Textarea } from '../components/forms';
import { Select } from '../components/select';
import { ConfirmDialog, Sheet, useToast } from '../components/overlays';
import { WizardReview } from '../components/wizard';
import { PanelLangkah, type PanelLangkahStep } from '../components/panel-langkah';
import { PilihTahunAkademik } from './cari';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { PilihSK } from './isian-sk';
import { PilihBerkas } from './pilih-berkas';
import { AlurPemeriksa, type TahapPemeriksa } from './pemeriksa';
import { DaftarPerubahanAturan, DaftarVersiAturan, LencanaStatusVersi, PanelBandingAturan, type PerubahanAturan, type VersiAturanRow } from './aturan-versi';
import { IsianTanggal } from '../components/formulir';
import { Tekan } from '../components/tekan';

/*
 * Aturan kurikulum BERVERSI (SIAKAD /v1/kurikulum-aturan, docs/KURIKULUM.md "Aturan kurikulum berversi"). Mekanisme versi
 * sama dengan Aturan BKD/karier (AturanVersi, komponen aturan-versi.tsx). Kerangka kurikulum (KBK, KKNI, MBKM, OBE, dan
 * kerangka baru) adalah DATA (/v1/kurikulum-aturan/kerangka-versi), jadi wizard, perangkat MK, dan isian mengikuti
 * definisi kerangka tanpa cabang kode per kerangka.
 *
 *   KelolaAturanKurikulum      BAAK: daftar versi, rincian, wizard buat/ubah, salin, turunan, impor lama, banding, pratinjau dampak
 *   KelolaKerangkaKurikulum    BAAK: definisi kerangka (bagian, isian, perangkat, taksonomi, templat RPS) berversi
 *   PerangkatMataKuliah        kelengkapan perangkat MK berbukti (unggah, verifikasi, riwayat)
 *   RekapPerangkatMk           rekap kelengkapan per prodi/periode + pengingat
 *   LaporanKetercapaianCpl     ketercapaian CPL per angkatan dari nilai komponen
 *   EditorSkalaNilai, EditorDaftarKode   komponen isian bersama
 */

const BASIS = '/v1/kurikulum-aturan';
const BASIS_KERANGKA = '/v1/kurikulum-aturan/kerangka-versi';

// ------------------------------------------------------------------ tipe
export interface SkalaNilaiKurikulum {
  huruf: string;
  min: number;
  maks: number;
  bobot: number;
  lulus: boolean;
}
export interface ButirKode {
  kode: string;
  nama: string;
  [k: string]: unknown;
}
export interface PerangkatAturan extends ButirKode {
  wajib_untuk: string[];
  format: string[];
  verifikator: string;
  pddikti: string | null;
  sumber: 'unggah' | 'rps' | 'otomatis';
  keterangan?: string;
}
export interface IsiAturanKurikulum {
  struktur: {
    sks_lulus: number | null;
    distribusi: Record<'wajib_universitas' | 'wajib_fakultas' | 'wajib_prodi' | 'pilihan' | 'mbkm', number | null>;
    sks_semester: { kode: string; dari: number; sampai: number | null; maks: number | null }[];
    sks_antara_maks: number | null;
    masa_studi: { normal: number | null; maks: number | null };
  };
  penilaian: { skala: SkalaNilaiKurikulum[]; komponen: { kode: string; nama: string; persen: number }[]; catatan: string };
  mbkm: { aktif: boolean; sks_luar_prodi_maks: number | null; semester_luar_prodi_maks: number | null; semester_mulai: number | null; bentuk: (ButirKode & { sks_maks: number | null })[]; konversi: string };
  kelulusan: { sks_min: number | null; ipk_min: number | null; nilai_d_maks: number | null; nilai_e_boleh: boolean | null; mk_wajib: string[]; ta_wajib: boolean | null; skpi_wajib: boolean | null; syarat_lain: string[] };
  obe: { aktif: boolean; ambang_cpl: number | null; ambang_persen_mahasiswa: number | null; sumber_nilai: 'komponen' | 'mk'; metode_asesmen: ButirKode[]; rubrik: (ButirKode & { min: number })[] };
  mata_kuliah: { perangkat: PerangkatAturan[]; pertemuan_min: number | null; metode: ButirKode[]; kategori: ButirKode[]; isian_wajib: string[] };
  turunan: { boleh: string[] };
  rujukan: { kode: string; pedoman: string; pasal: string; pedoman_id?: string | null }[];
}
export interface AturanKurikulumRow extends VersiAturanRow {
  kerangka: string | null;
  kerangka_nama: string | null;
  lingkup: 'universitas' | 'fakultas' | 'prodi';
  kode_fakultas: string | null;
  kode_prodi: string | null;
  induk_universitas_id: number | null;
  angkatan_mulai: number | null;
  angkatan_selesai: number | null;
  berlaku_selesai: string | null;
  kurikulum_id: number | null;
  sumber: string;
  unit: string;
  jumlah_mahasiswa: number;
  berlaku_sekarang: boolean;
}
interface AturanKurikulumDetail extends AturanKurikulumRow {
  isi: IsiAturanKurikulum;
  mahasiswa: { kode_prodi: string; nama_prodi: string; jumlah: number }[];
  turunan: { id: number; nama: string; versi: number; status: VersiAturanRow['status']; lingkup: string; unit: string }[];
  induk_universitas?: { id: number; nama: string; versi: number; status: string; boleh: string[] };
  kurikulum?: { id: number; kode: string; nama: string; status: string } | null;
  kerangka_definisi?: { id: number; nama: string; versi: number; isi: DefinisiKerangka };
  riwayat: { waktu: string; username: string; aksi: string; ringkasan: string | null }[];
  induk?: { id: number; nama: string; versi: number };
  perubahan?: PerubahanAturan[];
  hak: { ubah: boolean; kelola: boolean; universitas: boolean };
}
export interface IsianKerangka {
  kode: string;
  nama: string;
  jenis: string;
  wajib: boolean;
  keterangan?: string;
  pilihan: string[];
  min?: number | null;
  maks?: number | null;
  relasi?: string | null;
}
export interface DefinisiKerangka {
  kode: string;
  keterangan: string;
  bagian: { kode: string; nama: string; aktif: boolean; urutan: number; keterangan: string; primitif?: boolean; isian: IsianKerangka[] }[];
  isian_mk: IsianKerangka[];
  perangkat: PerangkatAturan[];
  taksonomi: { kode: string; nama: string }[];
  rps: { bagian: { kode: string; nama: string; aktif: boolean; wajib: boolean }[]; kolom_pertemuan: { kode: string; nama: string; jenis: string }[]; pertemuan_min: number | null; menit_per_sks: number | null; validasi: { kode: string; kiri: string; op: string; kanan: number; pesan: string }[] };
  aturan_bawaan: Partial<IsiAturanKurikulum>;
}
interface Referensi {
  kerangka: { kode: string; nama: string; keterangan: string | null; aktif: number }[];
  jalur_turunan: { kode: string; nama: string }[];
  komponen_siakad: string[];
  parameter: { kode: string; jalur: string; nama: string }[];
  jenis_mk: Record<string, string>;
  verifikator: Record<string, string>;
  kolom_pddikti: Record<string, string>;
  isian_mk: Record<string, string>;
  fakultas: { kode_fakultas: string; nama_fakultas: string }[];
  prodi: { kode_prodi: string; nama: string; kode_fakultas: string; sks_lulus: number | null }[];
  tahun: { tahun_id: string; nama_tahun: string; buka: string }[];
  hak: { universitas: boolean; prodi: string[] };
  bawaan: IsiAturanKurikulum;
}
interface Pratinjau {
  aturan: { id: number; nama: string; versi: number; status: string };
  pembanding: { id: number; nama: string } | null;
  perubahan: PerubahanAturan[];
  ringkasan: { mahasiswa_aktif: number; terdampak: number; prodi: number; sks_lulus_berubah: number; skala_berubah: number; jadi_memenuhi: number; jadi_tidak_memenuhi: number };
  per_prodi: { kode_prodi: string; nama_prodi: string; jumlah: number; jadi_memenuhi: number; jadi_tidak_memenuhi: number }[];
  laporan: { nim: string; nama: string; kode_prodi: string; angkatan: number | null; versi_sekarang: string; versi_sesudah: string; sks: number; ipk: number; sks_lulus_sekarang: number | null; sks_lulus_sesudah: number | null; skala_berubah: boolean; lulus_sekarang: boolean; lulus_sesudah: boolean; berubah: boolean; alasan: string[] }[];
}

// ------------------------------------------------------------------ util
const q = <T,>(path: string, query?: Record<string, string | number | undefined>) => (s: ReturnType<typeof useSiakad>, signal: AbortSignal) =>
  s.request<T>({ method: 'GET', path, query: query ? Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])) : undefined }, { signal });
const tgl = (s?: string | null) => (s ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s.length <= 10 ? `${s}T00:00:00` : s.replace(' ', 'T'))) : '-');
const angka = (n: number | null | undefined, satuan = '') => (n == null ? null : `${Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 })}${satuan}`);
const keAngka = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')));
const t = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));
const Lama = ({ teks = 'Ikut ketentuan lama' }: { teks?: string }) => <span className="u-kur-lama">{teks}</span>;
const LINGKUP: Record<string, string> = { universitas: 'Universitas', fakultas: 'Fakultas', prodi: 'Prodi' };
const rentangAngkatan = (a: Pick<AturanKurikulumRow, 'angkatan_mulai' | 'angkatan_selesai'>) =>
  a.angkatan_mulai && a.angkatan_selesai ? `Angkatan ${a.angkatan_mulai}–${a.angkatan_selesai}` : a.angkatan_mulai ? `Angkatan ≥ ${a.angkatan_mulai}` : a.angkatan_selesai ? `Angkatan ≤ ${a.angkatan_selesai}` : 'Semua angkatan';

function useAksi(prefix = 'kurikulum-aturan') {
  const s = useSiakad();
  const toast = useToast();
  return React.useCallback(
    async <T,>(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown, sukses?: string): Promise<T> => {
      try {
        const r = await s.request<T>({ method, path, body: body ?? {} });
        if (sukses) toast.add({ title: sukses, type: 'success' });
        invalidateSiakad(prefix);
        invalidateSiakad('aturan-versi');
        return r.data;
      } catch (e) {
        toast.add({ title: 'Belum berhasil', description: pesanGalat(e), type: 'error' });
        throw e;
      }
    },
    [s, toast, prefix],
  );
}

export function useReferensiKurikulum() {
  return useSiakadQuery<Referensi>(['kurikulum-aturan', 'referensi'], q(`${BASIS}/referensi`), { staleTime: 120_000 });
}

// ------------------------------------------------------------------ komponen isian bersama
/** Editor skala nilai huruf: huruf, rentang angka, bobot, lulus. Kosong = ikut m_nilai SIAKAD. */
export function EditorSkalaNilai({ value, onChange, disabled }: { value: SkalaNilaiKurikulum[]; onChange: (v: SkalaNilaiKurikulum[]) => void; disabled?: boolean }) {
  const ubah = (i: number, x: Partial<SkalaNilaiKurikulum>) => onChange(value.map((s, k) => (k === i ? { ...s, ...x } : s)));
  const urut = [...value].sort((a, b) => b.min - a.min);
  const tumpuk = urut.some((s, i) => i > 0 && s.maks >= urut[i - 1].min);
  return (
    <div className="u-kur-skala">
      {value.length ? (
        <table className="u-kur-tabel">
          <thead>
            <tr>
              <th>Huruf</th>
              <th>Nilai min</th>
              <th>Nilai maks</th>
              <th>Bobot</th>
              <th>Lulus</th>
              <th aria-label="Aksi" />
            </tr>
          </thead>
          <tbody>
            {value.map((s, i) => (
              <tr key={i}>
                <td><Input aria-label="Huruf" value={s.huruf} disabled={disabled} onChange={(e) => ubah(i, { huruf: e.target.value.toUpperCase() })} /></td>
                <td><Input aria-label="Nilai min" inputMode="decimal" value={t(s.min)} disabled={disabled} onChange={(e) => ubah(i, { min: keAngka(e.target.value) ?? 0 })} /></td>
                <td><Input aria-label="Nilai maks" inputMode="decimal" value={t(s.maks)} disabled={disabled} onChange={(e) => ubah(i, { maks: keAngka(e.target.value) ?? 0 })} /></td>
                <td><Input aria-label="Bobot" inputMode="decimal" value={t(s.bobot)} disabled={disabled} onChange={(e) => ubah(i, { bobot: keAngka(e.target.value) ?? 0 })} /></td>
                <td><Checkbox aria-label="Lulus" checked={s.lulus} disabled={disabled} onCheckedChange={(v) => ubah(i, { lulus: v === true })} /></td>
                <td>
                  <Button size="sm" variant="ghost" aria-label={`Hapus ${s.huruf || 'baris'}`} disabled={disabled} onClick={() => onChange(value.filter((_, k) => k !== i))}>
                    <X />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="u-bkd-keterangan">Skala kosong: nilai huruf mengikuti skala m_nilai prodi di SIAKAD (perilaku sekarang).</p>
      )}
      {tumpuk ? <p className="u-kur-galat">Ada rentang yang bertumpuk.</p> : null}
      {!disabled ? (
        <div className="u-bkd-aksi">
          <Button size="sm" variant="ghost" onClick={() => onChange([...value, { huruf: '', min: 0, maks: 0, bobot: 0, lulus: true }])}>
            <Plus /> Tambah huruf
          </Button>
          {!value.length ? (
            <Button size="sm" variant="ghost" onClick={() => onChange([
              { huruf: 'A', min: 85, maks: 100, bobot: 4, lulus: true }, { huruf: 'B', min: 75, maks: 84.99, bobot: 3, lulus: true }, { huruf: 'C', min: 65, maks: 74.99, bobot: 2, lulus: true },
              { huruf: 'D', min: 50, maks: 64.99, bobot: 1, lulus: true }, { huruf: 'E', min: 0, maks: 49.99, bobot: 0, lulus: false },
            ])}>
              Isi contoh A–E (ubah sesuai SK)
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Editor daftar berkode (metode, bentuk kegiatan, rubrik, ...). `kolom` menambah isian per baris. */
export function EditorDaftarKode<T extends ButirKode>({ value, onChange, baru, kolom = [], tambahLabel = 'Tambah', kosong }: { value: T[]; onChange: (v: T[]) => void; baru: () => T; kolom?: { kunci: keyof T & string; label: string; jenis?: 'teks' | 'angka' }[]; tambahLabel?: string; kosong?: React.ReactNode }) {
  const ubah = (i: number, x: Partial<T>) => onChange(value.map((s, k) => (k === i ? { ...s, ...x } : s)));
  return (
    <div className="u-kur-daftar">
      {value.length === 0 && kosong ? <p className="u-bkd-keterangan">{kosong}</p> : null}
      {value.map((b, i) => (
        <div key={i} className="u-kur-daftar-baris">
          <Input aria-label="Kode" placeholder="Kode" value={b.kode} onChange={(e) => ubah(i, { kode: e.target.value } as Partial<T>)} className="u-kur-kode" />
          <Input aria-label="Nama" placeholder="Nama" value={b.nama} onChange={(e) => ubah(i, { nama: e.target.value } as Partial<T>)} />
          {kolom.map((k) => (
            <Input key={k.kunci} aria-label={k.label} placeholder={k.label} inputMode={k.jenis === 'angka' ? 'decimal' : undefined} value={t(b[k.kunci] as number | null) || (typeof b[k.kunci] === 'string' ? (b[k.kunci] as string) : '')}
              onChange={(e) => ubah(i, { [k.kunci]: k.jenis === 'angka' ? keAngka(e.target.value) : e.target.value } as Partial<T>)} />
          ))}
          <Button size="sm" variant="ghost" aria-label={`Hapus ${b.nama || 'baris'}`} onClick={() => onChange(value.filter((_, k) => k !== i))}>
            <X />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={() => onChange([...value, baru()])}>
        <Plus /> {tambahLabel}
      </Button>
    </div>
  );
}

function IsianAngka({ label, value, onChange, description, satuan }: { label: string; value: number | null; onChange: (v: number | null) => void; description?: React.ReactNode; satuan?: string }) {
  return (
    <Field label={label} description={description} optional>
      <Input inputMode="decimal" placeholder={satuan ? `kosong = ketentuan lama (${satuan})` : 'kosong = ketentuan lama'} value={t(value)} onChange={(e) => onChange(keAngka(e.target.value))} />
    </Field>
  );
}

function PilihYaTidak({ label, value, onChange, description }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void; description?: React.ReactNode }) {
  return (
    <Field label={label} description={description} optional>
      <Select options={[{ value: '', label: 'Ikut ketentuan lama' }, { value: 'ya', label: 'Ya' }, { value: 'tidak', label: 'Tidak' }]} value={value === null ? '' : value ? 'ya' : 'tidak'} onValueChange={(v) => onChange(v === '' || v == null ? null : v === 'ya')} placeholder="Pilih…" />
    </Field>
  );
}

/** Editor perangkat MK wajib (jenis dokumen, wajib untuk jenis MK, format, verifikator, kolom PDDikti, sumber). */
export function EditorPerangkat({ value, onChange, opsi: r }: { value: PerangkatAturan[]; onChange: (v: PerangkatAturan[]) => void; opsi: Pick<Referensi, 'jenis_mk' | 'verifikator' | 'kolom_pddikti'> }) {
  const ubah = (i: number, x: Partial<PerangkatAturan>) => onChange(value.map((p, k) => (k === i ? { ...p, ...x } : p)));
  return (
    <div className="u-kur-perangkat-editor">
      {value.map((p, i) => (
        <fieldset key={i} className="u-kur-kartu-isian">
          <legend>{p.nama || `Perangkat ${i + 1}`}</legend>
          <div className="u-bkd-grid-3">
            <Field label="Kode"><Input value={p.kode} onChange={(e) => ubah(i, { kode: e.target.value })} /></Field>
            <Field label="Nama dokumen" required><Input value={p.nama} onChange={(e) => ubah(i, { nama: e.target.value })} /></Field>
            <Field label="Diverifikasi oleh">
              <Select options={Object.entries(r.verifikator).map(([value, label]) => ({ value, label }))} value={p.verifikator} onValueChange={(v) => ubah(i, { verifikator: String(v ?? 'kaprodi') })} placeholder="Pilih…" />
            </Field>
            <Field label="Sumber bukti">
              <Select options={[{ value: 'unggah', label: 'Unggah berkas' }, { value: 'rps', label: 'RPS disahkan (otomatis)' }, { value: 'otomatis', label: 'CPMK terpetakan (otomatis)' }]} value={p.sumber} onValueChange={(v) => ubah(i, { sumber: (v ?? 'unggah') as PerangkatAturan['sumber'] })} placeholder="Pilih…" />
            </Field>
            <Field label="Kolom PDDikti" optional>
              <Select options={[{ value: '', label: 'Tidak dilaporkan' }, ...Object.entries(r.kolom_pddikti).map(([value, label]) => ({ value, label }))]} value={p.pddikti ?? ''} onValueChange={(v) => ubah(i, { pddikti: v ? String(v) : null })} placeholder="Pilih…" />
            </Field>
            <Field label="Format berkas" description="Pisahkan koma, mis. pdf, docx">
              <Input value={p.format.join(', ')} onChange={(e) => ubah(i, { format: e.target.value.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean) })} />
            </Field>
          </div>
          <Field label="Wajib untuk jenis mata kuliah" description="Tidak dicentang semua = opsional.">
            <div className="u-kur-centang">
              {Object.entries(r.jenis_mk).map(([k, l]) => (
                <label key={k}>
                  <Checkbox checked={p.wajib_untuk.includes(k)} onCheckedChange={(v) => ubah(i, { wajib_untuk: v === true ? [...p.wajib_untuk, k] : p.wajib_untuk.filter((x) => x !== k) })} /> {l}
                </label>
              ))}
            </div>
          </Field>
          <Button size="sm" variant="ghost" onClick={() => onChange(value.filter((_, k) => k !== i))}>
            <Trash2 /> Hapus perangkat
          </Button>
        </fieldset>
      ))}
      <Button size="sm" variant="outline" onClick={() => onChange([...value, { kode: '', nama: '', wajib_untuk: ['teori'], format: ['pdf'], verifikator: 'kaprodi', pddikti: null, sumber: 'unggah' }])}>
        <Plus /> Tambah perangkat
      </Button>
    </div>
  );
}

// ------------------------------------------------------------------ ringkasan isi
function RingkasanIsi({ isi, boleh }: { isi: IsiAturanKurikulum; boleh?: string[] }) {
  const s = isi.struktur;
  const k = isi.kelulusan;
  return (
    <div className="u-kur-ringkas">
      <Card>
        <CardHeader title="Struktur & SKS" />
        <CardContent>
          <DescriptionList
            items={[
              { label: 'SKS lulus', value: s.sks_lulus ?? <Lama teks="Ikut SKS lulus prodi (SIAKAD)" /> },
              { label: 'Distribusi SKS', value: Object.entries(s.distribusi).filter(([, v]) => v != null).map(([x, v]) => `${x.replace('_', ' ')} ${v}`).join(', ') || <Lama teks="Belum diatur" /> },
              { label: 'Batas SKS per semester', value: s.sks_semester.filter((b) => b.maks != null).map((b) => `semester ${b.dari}${b.sampai ? `–${b.sampai}` : '+'}: ${b.maks}`).join('; ') || <Lama teks="Ikut batas SIAKAD/IPS" /> },
              { label: 'Semester antara', value: s.sks_antara_maks != null ? `maks ${s.sks_antara_maks} SKS` : <Lama /> },
              { label: 'Masa studi', value: s.masa_studi.normal || s.masa_studi.maks ? `normal ${s.masa_studi.normal ?? '-'} · maks ${s.masa_studi.maks ?? '-'} semester` : <Lama /> },
            ]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="Penilaian" description={isi.penilaian.catatan || undefined} action={boleh?.includes('penilaian.skala') ? <Badge variant="info">Boleh diturunkan</Badge> : undefined} />
        <CardContent>
          {isi.penilaian.skala.length ? (
            <div className="u-kur-chip-baris">
              {[...isi.penilaian.skala].sort((a, b) => b.min - a.min).map((x) => (
                <span key={x.huruf} className="u-kur-chip" data-lulus={x.lulus ? '' : undefined}>
                  <strong>{x.huruf}</strong> {angka(x.min)}–{angka(x.maks)} · {angka(x.bobot)}
                </span>
              ))}
            </div>
          ) : (
            <Lama teks="Skala ikut m_nilai prodi (SIAKAD)" />
          )}
          <p className="u-bkd-keterangan">Komponen bawaan: {isi.penilaian.komponen.map((c) => `${c.nama} ${angka(c.persen)}%`).join(', ') || 'diatur per kelas'}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="Kelulusan" />
        <CardContent>
          <DescriptionList
            items={[
              { label: 'SKS minimal', value: k.sks_min ?? s.sks_lulus ?? <Lama /> },
              { label: 'IPK minimal', value: k.ipk_min != null ? angka(k.ipk_min) : <Lama teks="Ikut syarat jenjang (2,00 / 3,00)" /> },
              { label: 'Nilai D', value: k.nilai_d_maks != null ? `paling banyak ${k.nilai_d_maks} MK` : <Lama teks="Ikut aturan wisuda (≤ 3)" /> },
              { label: 'Nilai E', value: k.nilai_e_boleh == null ? <Lama teks="Ikut aturan wisuda (tidak boleh)" /> : k.nilai_e_boleh ? 'Boleh' : 'Tidak boleh' },
              { label: 'MK wajib lulus', value: k.mk_wajib.join(', ') || '-' },
              { label: 'TA / SKPI', value: [k.ta_wajib ? 'TA wajib' : null, k.skpi_wajib ? 'SKPI wajib' : null].filter(Boolean).join(', ') || '-' },
              { label: 'Syarat lain', value: k.syarat_lain.join('; ') || '-' },
            ]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="MBKM & OBE" />
        <CardContent>
          <DescriptionList
            items={[
              { label: 'MBKM', value: isi.mbkm.aktif ? `aktif · maks ${isi.mbkm.sks_luar_prodi_maks ?? '-'} SKS / ${isi.mbkm.semester_luar_prodi_maks ?? '-'} semester di luar prodi` : 'Tidak aktif' },
              { label: 'Bentuk kegiatan', value: isi.mbkm.bentuk.map((b) => b.nama).join(', ') || '-' },
              { label: 'OBE', value: isi.obe.aktif ? `aktif · ambang CPL ${isi.obe.ambang_cpl ?? '-'} · ${isi.obe.ambang_persen_mahasiswa ?? '-'}% mahasiswa` : 'Tidak aktif' },
              { label: 'Metode asesmen', value: isi.obe.metode_asesmen.map((b) => b.nama).join(', ') || '-' },
              { label: 'Rubrik', value: isi.obe.rubrik.map((b) => `${b.nama} ≥ ${b.min}`).join(', ') || '-' },
            ]}
          />
        </CardContent>
      </Card>
      <Card className="u-kur-lebar">
        <CardHeader title="Perangkat mata kuliah wajib" description={`Pertemuan minimal ${isi.mata_kuliah.pertemuan_min ?? '-'} · isian wajib: ${isi.mata_kuliah.isian_wajib.join(', ') || '-'}`} />
        <CardContent>
          {isi.mata_kuliah.perangkat.length ? (
            <ul className="u-kur-perangkat-ringkas">
              {isi.mata_kuliah.perangkat.map((p) => (
                <li key={p.kode}>
                  <strong>{p.nama}</strong>
                  <small>
                    {p.wajib_untuk.length ? `wajib: ${p.wajib_untuk.join(', ')}` : 'opsional'} · {p.sumber === 'unggah' ? `unggah ${p.format.join('/')}` : p.sumber === 'rps' ? 'RPS disahkan' : 'otomatis'} · verifikasi {p.verifikator}
                    {p.pddikti ? ` · PDDikti ${p.pddikti}` : ''}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <Lama teks="Ikut centang lama (silabus, SAP, bahan ajar, diktat, acara praktikum)" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------ halaman BAAK
/** Halaman Aturan kurikulum: versi per kerangka/lingkup/angkatan, rincian, wizard, salin, turunan, impor lama, banding, pratinjau dampak. `prodi` = tampilan fakultas (versi universitas + versi prodi itu). */
export function KelolaAturanKurikulum({ prodi, fakultas, className }: { prodi?: string; fakultas?: string; className?: string }) {
  const daftar = useSiakadQuery<AturanKurikulumRow[]>(['kurikulum-aturan', 'daftar', prodi, fakultas], q(BASIS, { prodi, fakultas }));
  const ref = useReferensiKurikulum();
  const [pilih, setPilih] = React.useState<number | null>(null);
  const [saring, setSaring] = React.useState<string>('semua');
  const [panel, setPanel] = React.useState<'baru' | 'impor' | null>(null);
  const rows = (daftar.data ?? []).filter((r) => saring === 'semua' || r.lingkup === saring || (saring === 'arsip' ? r.status === 'arsip' : false));
  const id = pilih ?? rows.find((a) => a.berlaku_sekarang)?.id ?? rows[0]?.id ?? null;
  if (daftar.loading && !daftar.data) return <Skeleton style={{ height: 360 }} />;
  if (daftar.error) return <Alert variant="danger" title="Aturan kurikulum belum bisa dimuat">{pesanGalat(daftar.error)}</Alert>;
  const hakUniv = !!ref.data?.hak.universitas;
  const hakProdi = !!prodi && (ref.data?.hak.prodi ?? []).includes(prodi);
  return (
    <div className={cn('u-bkd-aturan u-kur', className)}>
      <div className="u-kur-kiri">
        <div className="u-bkd-aksi">
          {hakUniv ? (
            <Button size="sm" onClick={() => setPanel('baru')}>
              <Plus /> Versi baru
            </Button>
          ) : null}
          {hakUniv || hakProdi ? (
            <Button size="sm" variant="outline" onClick={() => setPanel('impor')}>
              <Import /> Impor kurikulum lama
            </Button>
          ) : null}
        </div>
        <Select options={[{ value: 'semua', label: 'Semua lingkup' }, { value: 'universitas', label: 'Universitas' }, { value: 'fakultas', label: 'Fakultas' }, { value: 'prodi', label: 'Prodi' }]} value={saring} onValueChange={(v) => setSaring(String(v ?? 'semua'))} placeholder="Pilih…" />
        <DaftarVersiAturan
          versi={rows.map((r) => ({ ...r, nama: `${r.nama}`, berlaku_mulai: r.berlaku_mulai, jumlah_periode: r.jumlah_mahasiswa }))}
          value={id}
          onValueChange={setPilih}
          satuanPemakai="mahasiswa aktif"
          label="Versi aturan kurikulum"
        />
        <p className="u-bkd-keterangan">Versi terbit dikunci. Untuk aturan baru, salin versi lalu ubah drafnya. Tanpa versi yang cocok, mahasiswa mengikuti ketentuan lama SIAKAD.</p>
      </div>
      {id ? <RincianAturanKurikulum id={id} onPilih={setPilih} referensi={ref.data} /> : <Empty bordered icon={<Layers />} title="Belum ada versi aturan kurikulum" description="Buat versi baru atau impor kurikulum lama prodi. Selama belum ada, semua aturan mengikuti ketentuan lama SIAKAD." />}
      {panel === 'baru' && ref.data ? <PanelAturanKurikulum referensi={ref.data} onOpenChange={(o) => !o && setPanel(null)} onSelesai={(x) => { setPanel(null); setPilih(x); }} /> : null}
      {panel === 'impor' && ref.data ? <PanelImporLama referensi={ref.data} prodi={prodi} onOpenChange={(o) => !o && setPanel(null)} onSelesai={(x) => { setPanel(null); setPilih(x); }} /> : null}
    </div>
  );
}

function RincianAturanKurikulum({ id, onPilih, referensi }: { id: number; onPilih: (id: number | null) => void; referensi?: Referensi }) {
  const d = useSiakadQuery<AturanKurikulumDetail>(['kurikulum-aturan', 'detail', id], q(`${BASIS}/${id}`));
  const aksi = useAksi();
  const [panel, setPanel] = React.useState<'ubah' | 'pratinjau' | 'banding' | 'hapus' | 'terbit' | 'turunkan' | null>(null);
  if (d.loading && !d.data) return <Skeleton style={{ height: 360 }} />;
  if (!d.data) return <Alert variant="danger">{pesanGalat(d.error)}</Alert>;
  const a = d.data;
  return (
    <section className="u-bkd-aturan-rincian">
      <Card>
        <CardContent>
          <div className="u-bkd-kepala">
            <div>
              <p className="u-bkd-label">
                {a.kerangka_nama ?? a.kerangka} · {a.unit} · versi {a.versi}
                {a.induk ? ` · disalin dari ${a.induk.nama} v${a.induk.versi}` : ''}
              </p>
              <h3 className="u-bkd-judul">{a.nama}</h3>
              <p className="u-bkd-keterangan" style={{ whiteSpace: 'pre-line' }}>{a.dasar_hukum ?? 'Dasar hukum belum diisi.'}</p>
            </div>
            <div className="u-bkd-kepala-status">
              {a.berlaku_sekarang ? <Badge variant="primary">Berlaku</Badge> : null}
              {a.sumber === 'impor_lama' ? <Badge variant="info">Impor kurikulum lama</Badge> : null}
              <LencanaStatusVersi status={a.status}>{a.diterbitkan_at ? ` ${tgl(a.diterbitkan_at)}` : ''}</LencanaStatusVersi>
            </div>
          </div>
          <DescriptionList
            items={[
              { label: 'Berlaku untuk', value: `${rentangAngkatan(a)} · periode ${a.berlaku_mulai ?? 'awal'}–${a.berlaku_selesai ?? 'seterusnya'}` },
              { label: 'Lingkup', value: a.induk_universitas ? `${a.unit} (turunan dari ${a.induk_universitas.nama} v${a.induk_universitas.versi})` : a.unit },
              { label: 'SK', value: a.sk ? `${a.sk.nomor}${a.sk.tanggal ? `, ${tgl(a.sk.tanggal)}` : ''}` : <span className="u-bkd-keterangan">Belum dilampirkan</span> },
              { label: 'Kurikulum OBE prodi', value: a.kurikulum ? `${a.kurikulum.kode} · ${a.kurikulum.nama} (${a.kurikulum.status})` : '-' },
              { label: 'Kerangka', value: a.kerangka_definisi ? `${a.kerangka_definisi.nama} v${a.kerangka_definisi.versi} (dikunci)` : a.kerangka_nama ?? '-' },
              { label: 'Mahasiswa aktif', value: a.jumlah_mahasiswa ? `${a.jumlah_mahasiswa} (${a.mahasiswa.map((m) => `${m.nama_prodi} ${m.jumlah}`).join(', ')})` : 'Belum ada' },
            ]}
          />
          <div className="u-bkd-aksi">
            {a.hak.ubah ? (
              <Button onClick={() => setPanel('ubah')}>
                <Pencil /> Ubah draf
              </Button>
            ) : null}
            {a.hak.kelola ? (
              <Button variant="outline" onClick={async () => onPilih((await aksi<AturanKurikulumDetail>('POST', `${BASIS}/${a.id}/salin`, {}, 'Versi baru dibuat sebagai draf.')).id)}>
                <Copy /> Salin jadi versi baru
              </Button>
            ) : null}
            {a.lingkup === 'universitas' && a.isi.turunan.boleh.length ? (
              <Button variant="outline" onClick={() => setPanel('turunkan')}>
                <GitBranch /> Buat turunan prodi/fakultas
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setPanel('pratinjau')}>
              <Eye /> Pratinjau dampak
            </Button>
            <Button variant="ghost" onClick={() => setPanel('banding')}>
              <GitCompare /> Banding
            </Button>
            {a.status === 'draf' && a.hak.kelola ? (
              <Button variant="outline" onClick={() => setPanel('terbit')}>
                <FileCheck2 /> Terbitkan
              </Button>
            ) : null}
            {a.status === 'terbit' && a.hak.kelola ? (
              <Button variant="ghost" onClick={() => void aksi('POST', `${BASIS}/${a.id}/arsipkan`, {}, 'Versi diarsipkan.')}>
                <Archive /> Arsipkan
              </Button>
            ) : null}
            {a.status === 'draf' && a.hak.kelola ? (
              <Button variant="ghost" onClick={() => setPanel('hapus')}>
                <Trash2 /> Hapus draf
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <Tabs
        items={[
          { value: 'isi', label: 'Isi aturan', content: <RingkasanIsi isi={a.isi} boleh={a.isi.turunan.boleh} /> },
          ...(a.lingkup === 'universitas'
            ? [{
                value: 'turunan',
                label: 'Turunan',
                count: a.turunan.length,
                content: (
                  <Card>
                    <CardContent>
                      <p className="u-bkd-keterangan">Bagian yang boleh ditimpa fakultas/prodi: {a.isi.turunan.boleh.map((b) => referensi?.jalur_turunan.find((x) => x.kode === b)?.nama ?? b).join(', ') || 'tidak ada'}.</p>
                      <ul className="u-kur-perangkat-ringkas">
                        {a.turunan.map((x) => (
                          <li key={x.id}>
                            <Tekan className="u-kur-tautan" onClick={() => onPilih(x.id)}>{x.nama} v{x.versi}</Tekan> <LencanaStatusVersi status={x.status} /> <small>{x.unit}</small>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ),
              }]
            : []),
          ...(a.perubahan ? [{ value: 'perubahan', label: `Perubahan dari v${a.induk?.versi}`, count: a.perubahan.length, content: <Card><CardContent><DaftarPerubahanAturan perubahan={a.perubahan} /></CardContent></Card> }] : []),
          {
            value: 'riwayat',
            label: 'Riwayat',
            content: (
              <DataTable rows={a.riwayat} rowKey={(r) => `${r.waktu}${r.aksi}`} columnToggle={false} densityToggle={false}
                columns={[{ key: 'waktu', header: 'Waktu', shrink: true, cell: (r) => tgl(r.waktu) }, { key: 'username', header: 'Oleh', shrink: true }, { key: 'ringkasan', header: 'Perubahan', mobile: 'title' }]}
                empty={{ title: 'Belum ada riwayat' }} />
            ),
          },
        ]}
      />
      {panel === 'ubah' && referensi ? <PanelAturanKurikulum referensi={referensi} aturan={a} onOpenChange={(o) => !o && setPanel(null)} onSelesai={() => setPanel(null)} /> : null}
      {panel === 'pratinjau' ? <PanelPratinjauKurikulum aturan={a} onOpenChange={(o) => !o && setPanel(null)} onTerbit={() => setPanel('terbit')} /> : null}
      {panel === 'banding' ? <PanelBandingAturan basis={BASIS} aturan={a} onOpenChange={(o) => !o && setPanel(null)} /> : null}
      {panel === 'turunkan' && referensi ? <PanelTurunan aturan={a} referensi={referensi} onOpenChange={(o) => !o && setPanel(null)} onSelesai={(x) => { setPanel(null); onPilih(x); }} /> : null}
      <ConfirmDialog open={panel === 'terbit'} onOpenChange={(o) => !o && setPanel(null)} tone="primary" title="Terbitkan versi ini?"
        description={`${a.nama} v${a.versi} dikunci dan langsung dibaca otomatis oleh mahasiswa ${rentangAngkatan(a).toLowerCase()} di ${a.unit.toLowerCase()}. Periode yang sudah ditutup tidak bisa terkena kecuali dibuka kembali.`}
        confirmLabel="Terbitkan" onConfirm={async () => { await aksi('POST', `${BASIS}/${a.id}/terbitkan`, {}, 'Versi diterbitkan dan dikunci.'); setPanel(null); }} />
      <ConfirmDialog open={panel === 'hapus'} onOpenChange={(o) => !o && setPanel(null)} title="Hapus draf ini?" description={`${a.nama} versi ${a.versi}. Versi terbit tidak terpengaruh.`} confirmLabel="Hapus draf"
        onConfirm={async () => { await aksi('POST', `${BASIS}/${a.id}/hapus`, {}, 'Draf dihapus.'); setPanel(null); onPilih(null); }} />
    </section>
  );
}

// ------------------------------------------------------------------ wizard buat/ubah
interface Identitas {
  nama: string;
  kerangka: string;
  dasar_hukum: string;
  sk_id: string | null;
  catatan_perubahan: string;
  lingkup: AturanKurikulumRow['lingkup'];
  kode_fakultas: string;
  kode_prodi: string;
  angkatan_mulai: string;
  angkatan_selesai: string;
  berlaku_mulai: string;
  berlaku_selesai: string;
}

/** Wizard versi aturan kurikulum di panel samping: Kerangka & dasar hukum → Berlaku → Struktur → Penilaian → MBKM → Kelulusan → OBE → Mata kuliah → Turunan → Tinjau. */
export function PanelAturanKurikulum({ referensi: r, aturan: a, onOpenChange, onSelesai }: { referensi: Referensi; aturan?: AturanKurikulumDetail; onOpenChange: (o: boolean) => void; onSelesai: (id: number) => void }) {
  const aksi = useAksi();
  const s = useSiakad();
  const ubah = !!a;
  const turunan = !!a?.induk_universitas;
  const boleh = a?.induk_universitas?.boleh ?? null;
  const bisa = (jalur: string) => !turunan || (boleh ?? []).some((b) => b === jalur || jalur.startsWith(`${b}.`) || b.startsWith(`${jalur}.`));
  const [step, setStep] = React.useState(0);
  const [id, setId] = React.useState<Identitas>(() => ({
    nama: a?.nama ?? '', kerangka: a?.kerangka ?? '', dasar_hukum: a?.dasar_hukum ?? '', sk_id: a?.sk?.id ?? null, catatan_perubahan: a?.catatan_perubahan ?? '',
    lingkup: a?.lingkup ?? 'universitas', kode_fakultas: a?.kode_fakultas ?? '', kode_prodi: a?.kode_prodi ?? '',
    angkatan_mulai: t(a?.angkatan_mulai), angkatan_selesai: t(a?.angkatan_selesai), berlaku_mulai: a?.berlaku_mulai ?? '', berlaku_selesai: a?.berlaku_selesai ?? '',
  }));
  const [isi, setIsi] = React.useState<IsiAturanKurikulum>(() => structuredClone(a?.isi ?? r.bawaan));
  const [dariKerangka, setDariKerangka] = React.useState(false);
  const set = <K extends keyof IsiAturanKurikulum>(k: K, v: Partial<IsiAturanKurikulum[K]>) => setIsi((x) => ({ ...x, [k]: { ...x[k], ...v } }));
  const tahun = r.tahun.map((x) => ({ value: x.tahun_id, label: `${x.nama_tahun}${x.buka === 'Y' ? ' (aktif)' : ''}` }));
  const total = isi.penilaian.komponen.reduce((n, c) => n + (Number(c.persen) || 0), 0);

  // Versi baru: isian awal dari aturan bawaan definisi kerangka (data, bukan kode).
  const muatKerangka = async (kode: string) => {
    if (ubah || !kode) return;
    try {
      const daftar = await s.request<{ id: number; kode: string; status: string }[]>({ method: 'GET', path: BASIS_KERANGKA });
      const def = daftar.data.find((x) => x.kode === kode && x.status === 'terbit');
      if (!def) return;
      const d = await s.request<{ isi: DefinisiKerangka }>({ method: 'GET', path: `${BASIS_KERANGKA}/${def.id}` });
      const bawaan = d.data.isi.aturan_bawaan as Partial<IsiAturanKurikulum>;
      setIsi((x) => {
        const y = structuredClone(r.bawaan);
        for (const k of Object.keys(bawaan) as (keyof IsiAturanKurikulum)[]) Object.assign(y[k] as object, bawaan[k]);
        if (!y.mata_kuliah.perangkat.length) y.mata_kuliah.perangkat = d.data.isi.perangkat;
        return { ...y, turunan: x.turunan };
      });
      setDariKerangka(true);
    } catch {
      /* kerangka tanpa definisi: isi tetap bawaan */
    }
  };

  const steps: PanelLangkahStep[] = [
    {
      id: 'dasar',
      title: 'Kerangka & dasar hukum',
      description: 'Kerangka menentukan bagian, perangkat MK, dan templat RPS (diatur di Kerangka kurikulum).',
      validate: () => (!id.nama.trim() ? 'Isi nama versi.' : !id.kerangka ? 'Pilih kerangka kurikulum.' : null),
      content: (
        <div className="u-bkd-form">
          <Field label="Nama versi" required description="Mis. OBE 2024, Merdeka Belajar 2020">
            <Input value={id.nama} onChange={(e) => setId({ ...id, nama: e.target.value })} />
          </Field>
          <Field label="Kerangka kurikulum" required description={dariKerangka ? 'Isian awal diambil dari aturan bawaan definisi kerangka ini.' : undefined}>
            <Select options={r.kerangka.filter((k) => k.aktif).map((k) => ({ value: k.kode, label: k.nama }))} value={id.kerangka || null} disabled={turunan}
              onValueChange={(v) => { setId({ ...id, kerangka: String(v ?? '') }); void muatKerangka(String(v ?? '')); }} placeholder="Pilih…" />
          </Field>
          <Field label="Dasar hukum" description="Peraturan menteri, pedoman, SK Rektor/Dekan: nomor, tanggal, penerbit.">
            <Textarea rows={4} value={id.dasar_hukum} onChange={(e) => setId({ ...id, dasar_hukum: e.target.value })} />
          </Field>
          <PilihSK value={id.sk_id} onValueChange={(v: string | null) => setId({ ...id, sk_id: v })} jenis="aturan" label="SK yang dirujuk" description="Dari registri SK; berkas tidak perlu diunggah ulang." />
          <Field label="Alasan perubahan" required description="Wajib (minimal 10 karakter) sebelum versi diterbitkan; tampil di riwayat dan pemeriksaan pedoman.">
            <Textarea rows={2} value={id.catatan_perubahan} onChange={(e) => setId({ ...id, catatan_perubahan: e.target.value })} />
          </Field>
        </div>
      ),
    },
    {
      id: 'berlaku',
      title: 'Berlaku',
      description: 'Mahasiswa dipetakan otomatis menurut lingkup, angkatan, dan periode.',
      validate: () => (id.lingkup === 'prodi' && !id.kode_prodi ? 'Pilih prodi.' : id.lingkup === 'fakultas' && !id.kode_fakultas ? 'Pilih fakultas.' : id.angkatan_mulai && id.angkatan_selesai && Number(id.angkatan_selesai) < Number(id.angkatan_mulai) ? 'Angkatan selesai harus ≥ angkatan mulai.' : null),
      content: (
        <div className="u-bkd-form">
          <Field label="Lingkup">
            <Select options={[{ value: 'universitas', label: 'Universitas' }, { value: 'fakultas', label: 'Fakultas' }, { value: 'prodi', label: 'Prodi' }]} value={id.lingkup} disabled={ubah}
              onValueChange={(v) => setId({ ...id, lingkup: (v ?? 'universitas') as Identitas['lingkup'] })} placeholder="Pilih…" />
          </Field>
          {id.lingkup === 'fakultas' ? (
            <Field label="Fakultas" required>
              <Select options={r.fakultas.map((f) => ({ value: f.kode_fakultas, label: f.nama_fakultas }))} value={id.kode_fakultas || null} onValueChange={(v) => setId({ ...id, kode_fakultas: String(v ?? '') })} placeholder="Pilih…" />
            </Field>
          ) : null}
          {id.lingkup === 'prodi' ? (
            <Field label="Prodi" required>
              <Select options={r.prodi.map((p) => ({ value: p.kode_prodi, label: p.nama }))} value={id.kode_prodi || null} disabled={ubah && turunan} onValueChange={(v) => setId({ ...id, kode_prodi: String(v ?? '') })} placeholder="Pilih…" />
            </Field>
          ) : null}
          <div className="u-bkd-grid-3">
            <Field label="Angkatan mulai" optional description="Kosong = semua angkatan sebelumnya">
              <Input inputMode="numeric" value={id.angkatan_mulai} onChange={(e) => setId({ ...id, angkatan_mulai: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
            </Field>
            <Field label="Angkatan selesai" optional description="Kosong = seterusnya">
              <Input inputMode="numeric" value={id.angkatan_selesai} onChange={(e) => setId({ ...id, angkatan_selesai: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
            </Field>
          </div>
          <div className="u-bkd-grid-3">
            <Field label="Periode mulai" optional>
              <Select options={[{ value: '', label: 'Sejak awal' }, ...tahun]} value={id.berlaku_mulai} onValueChange={(v) => setId({ ...id, berlaku_mulai: String(v ?? '') })} placeholder="Pilih…" />
            </Field>
            <Field label="Periode selesai" optional>
              <Select options={[{ value: '', label: 'Seterusnya' }, ...tahun]} value={id.berlaku_selesai} onValueChange={(v) => setId({ ...id, berlaku_selesai: String(v ?? '') })} placeholder="Pilih…" />
            </Field>
          </div>
          <Alert variant="neutral" icon={<CircleAlert />}>Versi yang periodenya sudah ditutup tidak bisa diterbitkan/diarsipkan kecuali periode dibuka kembali (BAAK » Batas waktu).</Alert>
        </div>
      ),
    },
    {
      id: 'struktur',
      title: 'Struktur SKS',
      description: 'Kosong = ketentuan lama SIAKAD. Batas SKS menurut IPS tetap diatur di Aturan akademik; yang dipakai yang paling ketat.',
      validate: () => (isi.struktur.masa_studi.normal && isi.struktur.masa_studi.maks && isi.struktur.masa_studi.maks < isi.struktur.masa_studi.normal ? 'Masa studi maksimal harus ≥ normal.' : null),
      content: (
        <div className="u-bkd-form">
          {!bisa('struktur.sks_lulus') ? <Alert variant="neutral">Bagian ini mengikuti versi universitas.</Alert> : null}
          <div className="u-bkd-grid-3">
            <IsianAngka label="SKS lulus" value={isi.struktur.sks_lulus} onChange={(v) => set('struktur', { sks_lulus: v })} />
            <IsianAngka label="Maks. SKS semester antara" value={isi.struktur.sks_antara_maks} onChange={(v) => set('struktur', { sks_antara_maks: v })} />
            <IsianAngka label="Masa studi normal (semester)" value={isi.struktur.masa_studi.normal} onChange={(v) => set('struktur', { masa_studi: { ...isi.struktur.masa_studi, normal: v } })} />
            <IsianAngka label="Masa studi maksimal (semester)" value={isi.struktur.masa_studi.maks} onChange={(v) => set('struktur', { masa_studi: { ...isi.struktur.masa_studi, maks: v } })} />
          </div>
          <p className="u-bkd-label">Distribusi SKS</p>
          <div className="u-bkd-grid-3">
            {(Object.keys(isi.struktur.distribusi) as (keyof IsiAturanKurikulum['struktur']['distribusi'])[]).map((k) => (
              <IsianAngka key={k} label={k.replace('_', ' ')} value={isi.struktur.distribusi[k]} onChange={(v) => set('struktur', { distribusi: { ...isi.struktur.distribusi, [k]: v } })} />
            ))}
          </div>
          <p className="u-bkd-label">Batas SKS per semester</p>
          {isi.struktur.sks_semester.map((b, i) => (
            <div key={i} className="u-kur-daftar-baris">
              <Input aria-label="Semester dari" inputMode="numeric" value={t(b.dari)} onChange={(e) => set('struktur', { sks_semester: isi.struktur.sks_semester.map((x, k) => (k === i ? { ...x, dari: keAngka(e.target.value) ?? 1 } : x)) })} />
              <Input aria-label="Semester sampai" inputMode="numeric" placeholder="seterusnya" value={t(b.sampai)} onChange={(e) => set('struktur', { sks_semester: isi.struktur.sks_semester.map((x, k) => (k === i ? { ...x, sampai: keAngka(e.target.value) } : x)) })} />
              <Input aria-label="Maks SKS" inputMode="numeric" placeholder="maks SKS (kosong = lama)" value={t(b.maks)} onChange={(e) => set('struktur', { sks_semester: isi.struktur.sks_semester.map((x, k) => (k === i ? { ...x, maks: keAngka(e.target.value) } : x)) })} />
              <Button size="sm" variant="ghost" aria-label="Hapus rentang" onClick={() => set('struktur', { sks_semester: isi.struktur.sks_semester.filter((_, k) => k !== i) })}><X /></Button>
            </div>
          ))}
          <Button size="sm" variant="ghost" onClick={() => set('struktur', { sks_semester: [...isi.struktur.sks_semester, { kode: `s${isi.struktur.sks_semester.length + 1}`, dari: 1, sampai: null, maks: null }] })}>
            <Plus /> Tambah rentang semester
          </Button>
        </div>
      ),
    },
    {
      id: 'penilaian',
      title: 'Penilaian',
      validate: () => (isi.penilaian.skala.some((x) => !x.huruf.trim()) ? 'Isi huruf setiap baris skala.' : isi.penilaian.komponen.length && Math.abs(total - 100) > 0.01 ? `Jumlah persen komponen harus 100 (sekarang ${total}).` : null),
      content: (
        <div className="u-bkd-form">
          {!bisa('penilaian.skala') ? <Alert variant="neutral">Skala nilai mengikuti versi universitas.</Alert> : null}
          <EditorSkalaNilai value={isi.penilaian.skala} onChange={(v) => set('penilaian', { skala: v })} disabled={!bisa('penilaian.skala')} />
          <p className="u-bkd-label">Komponen nilai bawaan (jumlah 100%)</p>
          {isi.penilaian.komponen.map((c, i) => (
            <div key={i} className="u-kur-daftar-baris">
              <Select options={r.komponen_siakad.map((x) => ({ value: x, label: x }))} value={c.kode} onValueChange={(v) => set('penilaian', { komponen: isi.penilaian.komponen.map((x, k) => (k === i ? { ...x, kode: String(v ?? 'UAS') } : x)) })} placeholder="Pilih…" />
              <Input aria-label="Nama" value={c.nama} onChange={(e) => set('penilaian', { komponen: isi.penilaian.komponen.map((x, k) => (k === i ? { ...x, nama: e.target.value } : x)) })} />
              <Input aria-label="Persen" inputMode="decimal" value={t(c.persen)} onChange={(e) => set('penilaian', { komponen: isi.penilaian.komponen.map((x, k) => (k === i ? { ...x, persen: keAngka(e.target.value) ?? 0 } : x)) })} />
              <Button size="sm" variant="ghost" aria-label="Hapus komponen" onClick={() => set('penilaian', { komponen: isi.penilaian.komponen.filter((_, k) => k !== i) })}><X /></Button>
            </div>
          ))}
          <Button size="sm" variant="ghost" onClick={() => set('penilaian', { komponen: [...isi.penilaian.komponen, { kode: 'UAS', nama: 'UAS', persen: 0 }] })}>
            <Plus /> Tambah komponen
          </Button>
          <Field label="Catatan" optional>
            <Textarea rows={2} value={isi.penilaian.catatan} onChange={(e) => set('penilaian', { catatan: e.target.value })} />
          </Field>
        </div>
      ),
    },
    {
      id: 'mbkm',
      title: 'MBKM',
      content: (
        <div className="u-bkd-form">
          <label className="u-kur-centang-satu">
            <Checkbox checked={isi.mbkm.aktif} onCheckedChange={(v) => set('mbkm', { aktif: v === true })} /> Hak belajar di luar prodi aktif
          </label>
          <div className="u-bkd-grid-3">
            <IsianAngka label="Maks. SKS di luar prodi" value={isi.mbkm.sks_luar_prodi_maks} onChange={(v) => set('mbkm', { sks_luar_prodi_maks: v })} />
            <IsianAngka label="Maks. semester di luar prodi" value={isi.mbkm.semester_luar_prodi_maks} onChange={(v) => set('mbkm', { semester_luar_prodi_maks: v })} />
            <IsianAngka label="Mulai semester" value={isi.mbkm.semester_mulai} onChange={(v) => set('mbkm', { semester_mulai: v })} />
          </div>
          <p className="u-bkd-label">Bentuk kegiatan</p>
          <EditorDaftarKode value={isi.mbkm.bentuk} onChange={(v) => set('mbkm', { bentuk: v })} baru={() => ({ kode: '', nama: '', sks_maks: null })} kolom={[{ kunci: 'sks_maks', label: 'Maks SKS', jenis: 'angka' }]} tambahLabel="Tambah bentuk kegiatan" />
          <Field label="Ketentuan konversi" optional>
            <Textarea rows={3} value={isi.mbkm.konversi} onChange={(e) => set('mbkm', { konversi: e.target.value })} />
          </Field>
        </div>
      ),
    },
    {
      id: 'kelulusan',
      title: 'Kelulusan',
      description: 'Hanya butir yang diisi yang ikut menahan yudisium/wisuda; kosong = aturan Lulus Akademik dan wisuda lama.',
      content: (
        <div className="u-bkd-form">
          <div className="u-bkd-grid-3">
            <IsianAngka label="SKS minimal lulus" value={isi.kelulusan.sks_min} onChange={(v) => set('kelulusan', { sks_min: v })} description="Kosong = SKS lulus di struktur" />
            <IsianAngka label="IPK minimal" value={isi.kelulusan.ipk_min} onChange={(v) => set('kelulusan', { ipk_min: v })} />
            <IsianAngka label="Nilai D paling banyak (MK)" value={isi.kelulusan.nilai_d_maks} onChange={(v) => set('kelulusan', { nilai_d_maks: v })} />
            <PilihYaTidak label="Nilai E diperbolehkan" value={isi.kelulusan.nilai_e_boleh} onChange={(v) => set('kelulusan', { nilai_e_boleh: v })} />
            <PilihYaTidak label="Tugas akhir wajib" value={isi.kelulusan.ta_wajib} onChange={(v) => set('kelulusan', { ta_wajib: v })} />
            <PilihYaTidak label="SKPI wajib" value={isi.kelulusan.skpi_wajib} onChange={(v) => set('kelulusan', { skpi_wajib: v })} />
          </div>
          <Field label="MK wajib lulus" optional description="Kode MK dipisah koma.">
            <Input value={isi.kelulusan.mk_wajib.join(', ')} onChange={(e) => set('kelulusan', { mk_wajib: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} />
          </Field>
          <Field label="Syarat lain" optional description="Satu syarat per baris (ditampilkan sebagai informasi).">
            <Textarea rows={3} value={isi.kelulusan.syarat_lain.join('\n')} onChange={(e) => set('kelulusan', { syarat_lain: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })} />
          </Field>
        </div>
      ),
    },
    {
      id: 'obe',
      title: 'OBE (CPL)',
      description: 'CPL, CPMK, dan pemetaan disusun prodi di Kurikulum OBE; di sini ambang ketercapaian, metode asesmen, dan rubrik.',
      content: (
        <div className="u-bkd-form">
          <label className="u-kur-centang-satu">
            <Checkbox checked={isi.obe.aktif} onCheckedChange={(v) => set('obe', { aktif: v === true })} /> OBE aktif (ketercapaian CPL dihitung)
          </label>
          <div className="u-bkd-grid-3">
            <IsianAngka label="Ambang CPL bawaan (0-100)" value={isi.obe.ambang_cpl} onChange={(v) => set('obe', { ambang_cpl: v })} description="Dipakai bila CPL tidak punya target" />
            <IsianAngka label="Ambang persen mahasiswa" value={isi.obe.ambang_persen_mahasiswa} onChange={(v) => set('obe', { ambang_persen_mahasiswa: v })} description="CPL tercapai di tingkat prodi" />
            <Field label="Sumber nilai">
              <Select options={[{ value: 'komponen', label: 'Nilai komponen (RPS → CPMK → CPL)' }, { value: 'mk', label: 'Nilai akhir MK' }]} value={isi.obe.sumber_nilai} onValueChange={(v) => set('obe', { sumber_nilai: (v ?? 'komponen') as 'komponen' | 'mk' })} placeholder="Pilih…" />
            </Field>
          </div>
          <p className="u-bkd-label">Metode asesmen</p>
          <EditorDaftarKode value={isi.obe.metode_asesmen} onChange={(v) => set('obe', { metode_asesmen: v })} baru={() => ({ kode: '', nama: '' })} tambahLabel="Tambah metode" />
          <p className="u-bkd-label">Rubrik (nilai minimal per tingkat)</p>
          <EditorDaftarKode value={isi.obe.rubrik} onChange={(v) => set('obe', { rubrik: v })} baru={() => ({ kode: '', nama: '', min: 0 })} kolom={[{ kunci: 'min', label: 'Nilai min', jenis: 'angka' }]} tambahLabel="Tambah tingkat rubrik" />
        </div>
      ),
    },
    {
      id: 'mk',
      title: 'Mata kuliah',
      description: 'Perangkat wajib berbukti per jenis MK, pilihan metode & kategori, isian wajib.',
      validate: () => (isi.mata_kuliah.perangkat.some((p) => !p.nama.trim()) ? 'Isi nama setiap perangkat.' : null),
      content: (
        <div className="u-bkd-form">
          <EditorPerangkat value={isi.mata_kuliah.perangkat} onChange={(v) => set('mata_kuliah', { perangkat: v })} opsi={r} />
          <IsianAngka label="Pertemuan minimal per semester" value={isi.mata_kuliah.pertemuan_min} onChange={(v) => set('mata_kuliah', { pertemuan_min: v })} />
          <p className="u-bkd-label">Pilihan metode perkuliahan</p>
          <EditorDaftarKode value={isi.mata_kuliah.metode} onChange={(v) => set('mata_kuliah', { metode: v })} baru={() => ({ kode: '', nama: '' })} tambahLabel="Tambah metode" />
          <p className="u-bkd-label">Kategori kurikulum MK (mis. inti, institusional)</p>
          <EditorDaftarKode value={isi.mata_kuliah.kategori} onChange={(v) => set('mata_kuliah', { kategori: v })} baru={() => ({ kode: '', nama: '', keterangan: '' })} kolom={[{ kunci: 'keterangan', label: 'Keterangan' }]} tambahLabel="Tambah kategori" />
          <Field label="Isian MK wajib">
            <div className="u-kur-centang">
              {Object.entries(r.isian_mk).map(([k, l]) => (
                <label key={k}>
                  <Checkbox checked={isi.mata_kuliah.isian_wajib.includes(k)} onCheckedChange={(v) => set('mata_kuliah', { isian_wajib: v === true ? [...isi.mata_kuliah.isian_wajib, k] : isi.mata_kuliah.isian_wajib.filter((x) => x !== k) })} /> {l}
                </label>
              ))}
            </div>
          </Field>
        </div>
      ),
    },
    ...(id.lingkup === 'universitas'
      ? [{
          id: 'turunan',
          title: 'Turunan & rujukan',
          description: 'Bagian yang boleh ditimpa fakultas/prodi, dan dasar pedoman per parameter.',
          content: (
            <div className="u-bkd-form">
              <div className="u-kur-centang">
                {r.jalur_turunan.map((j) => (
                  <label key={j.kode}>
                    <Checkbox checked={isi.turunan.boleh.includes(j.kode)} onCheckedChange={(v) => set('turunan', { boleh: v === true ? [...isi.turunan.boleh, j.kode] : isi.turunan.boleh.filter((x) => x !== j.kode) })} /> {j.nama}
                  </label>
                ))}
              </div>
              <p className="u-bkd-label">Rujukan pedoman/peraturan per parameter</p>
              {isi.rujukan.map((x, i) => (
                <div key={i} className="u-kur-daftar-baris">
                  <Select options={r.parameter.map((p) => ({ value: p.kode, label: p.nama }))} value={x.kode || null} onValueChange={(v) => setIsi({ ...isi, rujukan: isi.rujukan.map((y, k) => (k === i ? { ...y, kode: String(v ?? '') } : y)) })} placeholder="Pilih…" />
                  <Input aria-label="Pedoman" placeholder="Pedoman/peraturan" value={x.pedoman} onChange={(e) => setIsi({ ...isi, rujukan: isi.rujukan.map((y, k) => (k === i ? { ...y, pedoman: e.target.value } : y)) })} />
                  <Input aria-label="Pasal" placeholder="Pasal" value={x.pasal} onChange={(e) => setIsi({ ...isi, rujukan: isi.rujukan.map((y, k) => (k === i ? { ...y, pasal: e.target.value } : y)) })} />
                  <Button size="sm" variant="ghost" aria-label="Hapus rujukan" onClick={() => setIsi({ ...isi, rujukan: isi.rujukan.filter((_, k) => k !== i) })}><X /></Button>
                </div>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setIsi({ ...isi, rujukan: [...isi.rujukan, { kode: '', pedoman: '', pasal: '' }] })}>
                <Plus /> Tambah rujukan
              </Button>
            </div>
          ),
        } as PanelLangkahStep]
      : []),
    {
      id: 'tinjau',
      title: 'Tinjau',
      content: (
        <WizardReview
          sections={[
            { title: 'Kerangka & dasar hukum', onEdit: () => setStep(0), items: [{ label: 'Nama', value: id.nama }, { label: 'Kerangka', value: r.kerangka.find((k) => k.kode === id.kerangka)?.nama ?? id.kerangka }, { label: 'Dasar hukum', value: id.dasar_hukum || null }] },
            { title: 'Berlaku', onEdit: () => setStep(1), items: [{ label: 'Lingkup', value: LINGKUP[id.lingkup] + (id.kode_prodi ? ` ${r.prodi.find((p) => p.kode_prodi === id.kode_prodi)?.nama ?? id.kode_prodi}` : '') }, { label: 'Angkatan', value: rentangAngkatan({ angkatan_mulai: id.angkatan_mulai ? Number(id.angkatan_mulai) : null, angkatan_selesai: id.angkatan_selesai ? Number(id.angkatan_selesai) : null }) }] },
            { title: 'Struktur', onEdit: () => setStep(2), items: [{ label: 'SKS lulus', value: isi.struktur.sks_lulus ?? 'ketentuan lama' }, { label: 'Batas SKS', value: isi.struktur.sks_semester.filter((b) => b.maks != null).map((b) => `smt ${b.dari}${b.sampai ? `–${b.sampai}` : '+'}: ${b.maks}`).join('; ') || 'ketentuan lama' }] },
            { title: 'Penilaian', onEdit: () => setStep(3), items: [{ label: 'Skala', value: isi.penilaian.skala.map((x) => x.huruf).join(', ') || 'm_nilai SIAKAD' }, { label: 'Komponen', value: isi.penilaian.komponen.map((c) => `${c.nama} ${c.persen}%`).join(', ') || '-' }] },
            { title: 'Kelulusan', onEdit: () => setStep(5), items: [{ label: 'IPK', value: isi.kelulusan.ipk_min ?? 'ketentuan lama' }, { label: 'Nilai D', value: isi.kelulusan.nilai_d_maks ?? 'ketentuan lama' }] },
            { title: 'Mata kuliah', onEdit: () => setStep(7), items: [{ label: 'Perangkat wajib', value: isi.mata_kuliah.perangkat.map((p) => p.nama).join(', ') || 'centang lama' }] },
          ]}
        />
      ),
    },
  ];
  return (
    <PanelLangkah
      open
      onOpenChange={onOpenChange}
      title={ubah ? `Ubah ${a!.nama} v${a!.versi}` : 'Versi aturan kurikulum baru'}
      description={turunan ? 'Turunan: hanya bagian yang diizinkan versi universitas yang tersimpan.' : 'Nilai kosong berarti ketentuan lama SIAKAD tetap dipakai.'}
      size="xl"
      mode={ubah ? 'ubah' : 'buat'}
      step={step}
      onStepChange={setStep}
      steps={steps}
      finishLabel={ubah ? 'Simpan draf' : 'Buat draf'}
      onFinish={async () => {
        const body = {
          ...id, sk_id: id.sk_id, isi,
          angkatan_mulai: id.angkatan_mulai ? Number(id.angkatan_mulai) : null, angkatan_selesai: id.angkatan_selesai ? Number(id.angkatan_selesai) : null,
          berlaku_mulai: id.berlaku_mulai || null, berlaku_selesai: id.berlaku_selesai || null, kode_prodi: id.kode_prodi || null, kode_fakultas: id.kode_fakultas || null,
        };
        try {
          const x = await aksi<AturanKurikulumDetail>(ubah ? 'PUT' : 'POST', ubah ? `${BASIS}/${a!.id}` : BASIS, body, ubah ? 'Draf tersimpan.' : 'Draf versi baru dibuat.');
          onSelesai(x.id);
          return null;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

/** Panel turunan fakultas/prodi dari versi universitas. */
function PanelTurunan({ aturan: a, referensi: r, onOpenChange, onSelesai }: { aturan: AturanKurikulumDetail; referensi: Referensi; onOpenChange: (o: boolean) => void; onSelesai: (id: number) => void }) {
  const aksi = useAksi();
  const [lingkup, setLingkup] = React.useState<'prodi' | 'fakultas'>('prodi');
  const [kode, setKode] = React.useState<string | null>(null);
  const [kur, setKur] = React.useState('');
  return (
    <Sheet open onOpenChange={onOpenChange} title={`Turunan dari ${a.nama} v${a.versi}`} description={`Fakultas/prodi hanya boleh menimpa: ${a.isi.turunan.boleh.map((b) => r.jalur_turunan.find((x) => x.kode === b)?.nama ?? b).join(', ')}.`} size="md"
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button><Button disabled={!kode} onClick={async () => onSelesai((await aksi<AturanKurikulumDetail>('POST', `${BASIS}/${a.id}/turunkan`, { lingkup, [lingkup === 'prodi' ? 'kode_prodi' : 'kode_fakultas']: kode, kurikulum_id: kur ? Number(kur) : null }, 'Turunan dibuat sebagai draf.')).id)}><GitBranch /> Buat turunan</Button></>}>
      <div className="u-bkd-form">
        <Field label="Untuk">
          <Select options={[{ value: 'prodi', label: 'Prodi' }, { value: 'fakultas', label: 'Fakultas' }]} value={lingkup} onValueChange={(v) => { setLingkup((v ?? 'prodi') as 'prodi' | 'fakultas'); setKode(null); }} placeholder="Pilih…" />
        </Field>
        <Field label={lingkup === 'prodi' ? 'Prodi' : 'Fakultas'} required>
          <Select options={lingkup === 'prodi' ? r.prodi.map((p) => ({ value: p.kode_prodi, label: p.nama })) : r.fakultas.map((f) => ({ value: f.kode_fakultas, label: f.nama_fakultas }))} value={kode} onValueChange={(v) => setKode(v ? String(v) : null)} placeholder="Pilih…" />
        </Field>
        {lingkup === 'prodi' ? (
          <Field label="ID kurikulum OBE prodi" optional description="Tautkan CPL, MK, CPMK, dan ekuivalensi dari Kurikulum OBE.">
            <Input inputMode="numeric" value={kur} onChange={(e) => setKur(e.target.value.replace(/\D/g, ''))} />
          </Field>
        ) : null}
      </div>
    </Sheet>
  );
}

/** Impor kurikulum lama SIAKAD menjadi versi "lama" (wizard). */
function PanelImporLama({ referensi: r, prodi, onOpenChange, onSelesai }: { referensi: Referensi; prodi?: string; onOpenChange: (o: boolean) => void; onSelesai: (id: number) => void }) {
  const s = useSiakad();
  const aksi = useAksi();
  const [f, setF] = React.useState({ kode_prodi: prodi ?? '', tahun_id: [] as string[], nama: '', kerangka: 'mbkm', angkatan_mulai: '', angkatan_selesai: '', dasar_hukum: '', impor_mk: true });
  const [pra, setPra] = React.useState<{ sumber: Record<string, string>; isi: IsiAturanKurikulum } | null>(null);
  const body = (jalankan: boolean) => ({ ...f, angkatan_mulai: f.angkatan_mulai ? Number(f.angkatan_mulai) : null, angkatan_selesai: f.angkatan_selesai ? Number(f.angkatan_selesai) : null, jalankan });
  return (
    <PanelLangkah
      open
      onOpenChange={onOpenChange}
      title="Impor kurikulum lama"
      description="Membaca m_program_studi, m_kurikulum, m_nilai, m_mata_kuliah tanpa mengubahnya. Hasilnya draf; terbitkan setelah dicek."
      size="lg"
      steps={[
        {
          id: 'sumber',
          title: 'Sumber',
          validate: () => (!f.kode_prodi ? 'Pilih prodi.' : !f.tahun_id.length ? 'Pilih semester sumber.' : null),
          content: (
            <div className="u-bkd-form">
              <Field label="Prodi" required>
                <Select options={r.prodi.filter((p) => r.hak.universitas || r.hak.prodi.includes(p.kode_prodi)).map((p) => ({ value: p.kode_prodi, label: p.nama }))} value={f.kode_prodi || null} onValueChange={(v) => setF({ ...f, kode_prodi: String(v ?? '') })} placeholder="Pilih…" />
              </Field>
              <Field label="Semester sumber" required description="Ambil sepasang ganjil + genap agar semua MK ikut.">
                <div className="u-kur-centang">
                  {r.tahun.slice(0, 16).map((x) => (
                    <label key={x.tahun_id}>
                      <Checkbox checked={f.tahun_id.includes(x.tahun_id)} onCheckedChange={(v) => setF({ ...f, tahun_id: v === true ? [...f.tahun_id, x.tahun_id] : f.tahun_id.filter((y) => y !== x.tahun_id) })} /> {x.nama_tahun}
                    </label>
                  ))}
                </div>
              </Field>
            </div>
          ),
        },
        {
          id: 'versi',
          title: 'Versi & berlaku',
          validate: async () => {
            try {
              const x = await s.request<{ sumber: Record<string, string>; isi: IsiAturanKurikulum }>({ method: 'POST', path: `${BASIS}/impor-lama`, body: body(false) });
              setPra(x.data);
              return null;
            } catch (e) {
              return pesanGalat(e);
            }
          },
          content: (
            <div className="u-bkd-form">
              <Field label="Nama versi" description="Mis. Merdeka Belajar 2020">
                <Input value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} />
              </Field>
              <Field label="Kerangka">
                <Select options={r.kerangka.map((k) => ({ value: k.kode, label: k.nama }))} value={f.kerangka} onValueChange={(v) => setF({ ...f, kerangka: String(v ?? 'mbkm') })} placeholder="Pilih…" />
              </Field>
              <div className="u-bkd-grid-3">
                <Field label="Angkatan mulai" optional><Input inputMode="numeric" value={f.angkatan_mulai} onChange={(e) => setF({ ...f, angkatan_mulai: e.target.value.replace(/\D/g, '').slice(0, 4) })} /></Field>
                <Field label="Angkatan selesai" optional><Input inputMode="numeric" value={f.angkatan_selesai} onChange={(e) => setF({ ...f, angkatan_selesai: e.target.value.replace(/\D/g, '').slice(0, 4) })} /></Field>
              </div>
              <Field label="Dasar hukum" optional><Textarea rows={3} value={f.dasar_hukum} onChange={(e) => setF({ ...f, dasar_hukum: e.target.value })} /></Field>
              <label className="u-kur-centang-satu"><Checkbox checked={f.impor_mk} onCheckedChange={(v) => setF({ ...f, impor_mk: v === true })} /> Impor juga mata kuliah ke Kurikulum OBE (draf) untuk CPL & ekuivalensi</label>
            </div>
          ),
        },
        {
          id: 'tinjau',
          title: 'Tinjau',
          content: pra ? (
            <div className="u-bkd-form">
              <DescriptionList items={Object.entries(pra.sumber).map(([k, v]) => ({ label: k.replace('_', ' '), value: v }))} />
              <RingkasanIsi isi={pra.isi} />
            </div>
          ) : <Skeleton style={{ height: 120 }} />,
        },
      ]}
      finishLabel="Buat versi draf"
      onFinish={async () => {
        try {
          const x = await aksi<{ versi: { id: number } }>('POST', `${BASIS}/impor-lama`, body(true), 'Versi kurikulum lama dibuat sebagai draf.');
          onSelesai(x.versi.id);
          return null;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

/** Pratinjau dampak: mahasiswa aktif yang berpindah aturan, SKS lulus/skala yang berubah, status lulus akademik. */
function PanelPratinjauKurikulum({ aturan: a, onOpenChange, onTerbit }: { aturan: AturanKurikulumDetail; onOpenChange: (o: boolean) => void; onTerbit: () => void }) {
  const pr = useSiakadQuery<Pratinjau>(['kurikulum-aturan', 'pratinjau', a.id], q(`${BASIS}/${a.id}/pratinjau`), { staleTime: 0 });
  const [hanyaBerubah, setHanyaBerubah] = React.useState(false);
  const d = pr.data;
  return (
    <Sheet open onOpenChange={onOpenChange} title={`Pratinjau dampak ${a.nama} v${a.versi}`} description="Mahasiswa aktif yang aturannya berubah bila versi ini terbit (periode aktif). Tidak menyimpan apa pun." size="xl"
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Tutup</Button>{a.status === 'draf' && a.hak.kelola ? <Button disabled={!d} onClick={onTerbit}><FileCheck2 /> Terbitkan versi ini</Button> : null}</>}>
      <div className="u-bkd-form">
        {pr.loading ? <Skeleton style={{ height: 160 }} /> : null}
        {pr.error ? <Alert variant="danger">{pesanGalat(pr.error)}</Alert> : null}
        {d ? (
          <>
            <StatGrid>
              <StatCard label="Mahasiswa terdampak" value={d.ringkasan.terdampak} hint={`dari ${d.ringkasan.mahasiswa_aktif} aktif · ${d.ringkasan.prodi} prodi`} />
              <StatCard label="SKS lulus berubah" value={d.ringkasan.sks_lulus_berubah} />
              <StatCard label="Skala nilai berubah" value={d.ringkasan.skala_berubah} tone={d.ringkasan.skala_berubah ? 'warning' : undefined} />
              <StatCard label="Jadi tidak memenuhi lulus" value={d.ringkasan.jadi_tidak_memenuhi} tone={d.ringkasan.jadi_tidak_memenuhi ? 'danger' : 'success'} hint={`${d.ringkasan.jadi_memenuhi} jadi memenuhi`} />
            </StatGrid>
            {d.per_prodi.length ? (
              <Card>
                <CardHeader title="Per prodi" />
                <CardContent>
                  <div className="u-kur-chip-baris">{d.per_prodi.map((p) => <span key={p.kode_prodi} className="u-kur-chip"><strong>{p.nama_prodi}</strong> {p.jumlah}{p.jadi_tidak_memenuhi ? ` · ${p.jadi_tidak_memenuhi} jadi tidak lulus` : ''}</span>)}</div>
                </CardContent>
              </Card>
            ) : null}
            {d.pembanding ? (
              <Card>
                <CardHeader title={`Perubahan dari ${d.pembanding.nama}`} />
                <CardContent><DaftarPerubahanAturan perubahan={d.perubahan} /></CardContent>
              </Card>
            ) : null}
            <DataTable rows={d.laporan.filter((x) => !hanyaBerubah || x.berubah)} rowKey={(x) => x.nim} columnToggle={false} densityToggle={false}
              toolbar={<label className="u-kur-centang-satu"><Checkbox checked={hanyaBerubah} onCheckedChange={(v) => setHanyaBerubah(v === true)} /> Hanya status lulus berubah</label>}
              columns={[
                { key: 'nama', header: 'Mahasiswa', mobile: 'title', cell: (x) => <span className="u-kur-sel"><strong>{x.nama}</strong><small>{x.nim} · {x.kode_prodi} · {x.angkatan ?? '-'}</small></span> },
                { key: 'versi', header: 'Aturan sekarang → sesudah', cell: (x) => <span className="u-kur-sel"><small>{x.versi_sekarang}</small><strong>{x.versi_sesudah}</strong></span> },
                { key: 'sks', header: 'SKS / IPK', shrink: true, cell: (x) => `${x.sks} / ${angka(x.ipk)}` },
                { key: 'lulus', header: 'SKS lulus', shrink: true, cell: (x) => (x.sks_lulus_sekarang === x.sks_lulus_sesudah ? String(x.sks_lulus_sesudah ?? '-') : `${x.sks_lulus_sekarang ?? '-'} → ${x.sks_lulus_sesudah ?? '-'}`) },
                { key: 'status', header: 'Lulus akademik', shrink: true, mobile: 'badge', cell: (x) => <Badge variant={x.lulus_sesudah ? 'success' : x.berubah ? 'danger' : 'neutral'}>{x.lulus_sesudah ? 'Memenuhi' : 'Belum'}{x.berubah ? ' (berubah)' : ''}</Badge> },
                { key: 'alasan', header: 'Belum terpenuhi', cell: (x) => x.alasan.join('; ') || '-' },
              ]}
              empty={{ title: 'Tidak ada mahasiswa aktif yang terdampak' }} />
          </>
        ) : null}
      </div>
    </Sheet>
  );
}

// ------------------------------------------------------------------ kerangka kurikulum (data)
interface KerangkaRow extends VersiAturanRow {
  kode: string | null;
}
interface KerangkaDetail extends KerangkaRow {
  isi: DefinisiKerangka;
  primitif: Record<string, string>;
  jenis_isian: string[];
  fakta_rps: Record<string, string>;
  jumlah_aturan: number;
  induk?: { id: number; nama: string; versi: number };
  perubahan?: PerubahanAturan[];
}

/** BAAK » Kurikulum » Kerangka: definisi kerangka sebagai data (bagian, isian, perangkat, taksonomi, templat RPS) berversi. Kerangka baru = salin + ubah + terbitkan, tanpa kode. */
export function KelolaKerangkaKurikulum({ className }: { className?: string }) {
  const daftar = useSiakadQuery<KerangkaRow[]>(['kurikulum-aturan', 'kerangka'], q(BASIS_KERANGKA));
  const [pilih, setPilih] = React.useState<number | null>(null);
  const rows = daftar.data ?? [];
  const id = pilih ?? rows[0]?.id ?? null;
  if (daftar.loading && !daftar.data) return <Skeleton style={{ height: 360 }} />;
  if (daftar.error) return <Alert variant="danger">{pesanGalat(daftar.error)}</Alert>;
  return (
    <div className={cn('u-bkd-aturan u-kur', className)}>
      <div className="u-kur-kiri">
        <DaftarVersiAturan versi={rows.map((r) => ({ ...r, jumlah_periode: r.jumlah_periode ?? 0 }))} value={id} onValueChange={setPilih} satuanPemakai="versi aturan" label="Kerangka kurikulum" />
        <p className="u-bkd-keterangan">Kerangka bawaan dibuat sebagai data dan bisa diubah. Versi aturan kurikulum mengunci versi kerangka yang dipakai.</p>
      </div>
      {id ? <RincianKerangka id={id} onPilih={setPilih} /> : <Empty bordered icon={<Layers />} title="Belum ada kerangka" />}
    </div>
  );
}

function RincianKerangka({ id, onPilih }: { id: number; onPilih: (id: number | null) => void }) {
  const d = useSiakadQuery<KerangkaDetail>(['kurikulum-aturan', 'kerangka', id], q(`${BASIS_KERANGKA}/${id}`));
  const aksi = useAksi();
  const [panel, setPanel] = React.useState<'ubah' | 'baru' | 'banding' | null>(null);
  if (!d.data) return d.error ? <Alert variant="danger">{pesanGalat(d.error)}</Alert> : <Skeleton style={{ height: 360 }} />;
  const k = d.data;
  return (
    <section className="u-bkd-aturan-rincian">
      <Card>
        <CardContent>
          <div className="u-bkd-kepala">
            <div>
              <p className="u-bkd-label">Kode {k.isi.kode} · versi {k.versi} · dipakai {k.jumlah_aturan} versi aturan</p>
              <h3 className="u-bkd-judul">{k.nama}</h3>
              <p className="u-bkd-keterangan">{k.isi.keterangan}</p>
            </div>
            <LencanaStatusVersi status={k.status} />
          </div>
          <div className="u-bkd-aksi">
            {k.status === 'draf' ? <Button onClick={() => setPanel('ubah')}><Pencil /> Ubah draf</Button> : null}
            <Button variant="outline" onClick={() => setPanel('baru')}><Plus /> Kerangka baru dari ini</Button>
            <Button variant="outline" onClick={async () => onPilih((await aksi<KerangkaDetail>('POST', `${BASIS_KERANGKA}/${k.id}/salin`, {}, 'Revisi kerangka dibuat sebagai draf.')).id)}><Copy /> Revisi</Button>
            <Button variant="ghost" onClick={() => setPanel('banding')}><GitCompare /> Banding</Button>
            {k.status === 'draf' ? <Button variant="outline" onClick={() => void aksi('POST', `${BASIS_KERANGKA}/${k.id}/terbitkan`, {}, 'Kerangka diterbitkan.')}><FileCheck2 /> Terbitkan</Button> : null}
          </div>
        </CardContent>
      </Card>
      <div className="u-kur-ringkas">
        <Card>
          <CardHeader title="Bagian ruang kerja kurikulum" />
          <CardContent>
            <ol className="u-kur-tahap">
              {k.isi.bagian.map((b) => (
                <li key={b.kode} data-aktif={b.aktif ? '' : undefined}>
                  <strong>{b.nama}</strong> <small>{b.primitif ? 'penyunting bawaan' : `${b.isian.length} isian dinamis`}{b.aktif ? '' : ' · nonaktif'}</small>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Templat RPS" description={`Pertemuan min ${k.isi.rps.pertemuan_min ?? '-'} · ${k.isi.rps.menit_per_sks ?? '-'} menit per SKS/minggu`} />
          <CardContent>
            <p className="u-bkd-label">Bagian</p>
            <p className="u-bkd-keterangan">{k.isi.rps.bagian.map((b) => b.nama).join(' · ')}</p>
            <p className="u-bkd-label">Kolom tabel pertemuan</p>
            <p className="u-bkd-keterangan">{k.isi.rps.kolom_pertemuan.map((b) => b.nama).join(' · ')}</p>
            <p className="u-bkd-label">Validasi</p>
            <ul className="u-kur-perangkat-ringkas">{k.isi.rps.validasi.map((v) => <li key={v.kode}><small>{k.fakta_rps[v.kiri] ?? v.kiri} {v.op} {v.kanan}</small> {v.pesan}</li>)}</ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Perangkat MK & isian" />
          <CardContent>
            <p className="u-bkd-keterangan">{k.isi.perangkat.map((p) => p.nama).join(' · ') || '-'}</p>
            <p className="u-bkd-label">Isian MK tambahan</p>
            <p className="u-bkd-keterangan">{k.isi.isian_mk.map((p) => `${p.nama} (${p.jenis})`).join(' · ') || '-'}</p>
            <p className="u-bkd-label">Taksonomi kognitif</p>
            <p className="u-bkd-keterangan">{k.isi.taksonomi.map((p) => `${p.kode} ${p.nama}`).join(' · ') || '-'}</p>
          </CardContent>
        </Card>
      </div>
      {panel === 'ubah' ? <PanelKerangka kerangka={k} onOpenChange={(o) => !o && setPanel(null)} /> : null}
      {panel === 'baru' ? <PanelKerangkaBaru kerangka={k} onOpenChange={(o) => !o && setPanel(null)} onSelesai={(x) => { setPanel(null); onPilih(x); }} /> : null}
      {panel === 'banding' ? <PanelBandingAturan basis={BASIS_KERANGKA} aturan={k} onOpenChange={(o) => !o && setPanel(null)} /> : null}
    </section>
  );
}

function PanelKerangkaBaru({ kerangka: k, onOpenChange, onSelesai }: { kerangka: KerangkaDetail; onOpenChange: (o: boolean) => void; onSelesai: (id: number) => void }) {
  const aksi = useAksi();
  const [nama, setNama] = React.useState('');
  const [kode, setKode] = React.useState('');
  return (
    <Sheet open onOpenChange={onOpenChange} title={`Kerangka baru dari ${k.nama}`} description="Semua bagian, isian, perangkat, dan templat RPS disalin; ubah lalu terbitkan." size="md"
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button><Button disabled={!nama.trim() || !/^[a-z0-9_-]{2,30}$/.test(kode)} onClick={async () => onSelesai((await aksi<KerangkaDetail>('POST', `${BASIS_KERANGKA}/${k.id}/salin`, { nama, kode }, 'Kerangka baru dibuat sebagai draf.')).id)}><Plus /> Buat</Button></>}>
      <div className="u-bkd-form">
        <Field label="Nama kerangka" required><Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Mis. Kurikulum 2030" /></Field>
        <Field label="Kode" required description="huruf kecil/angka, 2-30 karakter"><Input value={kode} onChange={(e) => setKode(e.target.value.toLowerCase())} /></Field>
      </div>
    </Sheet>
  );
}

/** Wizard definisi kerangka: Identitas → Bagian → Isian MK → Perangkat → Templat RPS → Tinjau. */
function PanelKerangka({ kerangka: k, onOpenChange }: { kerangka: KerangkaDetail; onOpenChange: (o: boolean) => void }) {
  const aksi = useAksi();
  const ref = useReferensiKurikulum();
  const [isi, setIsi] = React.useState<DefinisiKerangka>(() => structuredClone(k.isi));
  const [nama, setNama] = React.useState(k.nama);
  const jenis = k.jenis_isian.map((x) => ({ value: x, label: x.replace('_', ' ') }));
  const EditorIsian = ({ value, onChange }: { value: IsianKerangka[]; onChange: (v: IsianKerangka[]) => void }) => (
    <div className="u-kur-daftar">
      {value.map((x, i) => (
        <div key={i} className="u-kur-daftar-baris">
          <Input aria-label="Kode isian" placeholder="kode" value={x.kode} onChange={(e) => onChange(value.map((y, n) => (n === i ? { ...y, kode: e.target.value } : y)))} className="u-kur-kode" />
          <Input aria-label="Nama isian" placeholder="Nama" value={x.nama} onChange={(e) => onChange(value.map((y, n) => (n === i ? { ...y, nama: e.target.value } : y)))} />
          <Select options={jenis} value={x.jenis} onValueChange={(v) => onChange(value.map((y, n) => (n === i ? { ...y, jenis: String(v ?? 'teks') } : y)))} placeholder="Pilih…" />
          <Input aria-label="Pilihan" placeholder="pilihan (pisah koma)" value={x.pilihan.join(', ')} onChange={(e) => onChange(value.map((y, n) => (n === i ? { ...y, pilihan: e.target.value.split(',').map((z) => z.trim()).filter(Boolean) } : y)))} />
          <label className="u-kur-centang-satu"><Checkbox checked={x.wajib} onCheckedChange={(v) => onChange(value.map((y, n) => (n === i ? { ...y, wajib: v === true } : y)))} /> Wajib</label>
          <Button size="sm" variant="ghost" aria-label="Hapus isian" onClick={() => onChange(value.filter((_, n) => n !== i))}><X /></Button>
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={() => onChange([...value, { kode: '', nama: '', jenis: 'teks', wajib: false, pilihan: [] }])}><Plus /> Tambah isian</Button>
    </div>
  );
  return (
    <PanelLangkah open onOpenChange={onOpenChange} title={`Ubah kerangka ${k.nama}`} description="Definisi kerangka adalah data: bagian, isian, perangkat, taksonomi, dan templat RPS." size="xl" mode="ubah"
      steps={[
        { id: 'identitas', title: 'Identitas', validate: () => (!nama.trim() ? 'Isi nama.' : null), content: (
          <div className="u-bkd-form">
            <Field label="Nama" required><Input value={nama} onChange={(e) => setNama(e.target.value)} /></Field>
            <Field label="Keterangan & sumber pedoman"><Textarea rows={4} value={isi.keterangan} onChange={(e) => setIsi({ ...isi, keterangan: e.target.value })} /></Field>
            <p className="u-bkd-label">Taksonomi kognitif (kisi-kisi soal)</p>
            <EditorDaftarKode value={isi.taksonomi} onChange={(v) => setIsi({ ...isi, taksonomi: v })} baru={() => ({ kode: '', nama: '' })} tambahLabel="Tambah tingkat" />
          </div>
        ) },
        { id: 'bagian', title: 'Bagian', description: 'Tahap ruang kerja kurikulum. Kode primitif memakai penyunting bawaan; bagian lain dibangkitkan dari isian.', content: (
          <div className="u-bkd-form">
            {isi.bagian.map((b, i) => (
              <fieldset key={i} className="u-kur-kartu-isian">
                <legend>{b.nama || `Bagian ${i + 1}`}</legend>
                <div className="u-bkd-grid-3">
                  <Field label="Kode"><Input value={b.kode} onChange={(e) => setIsi({ ...isi, bagian: isi.bagian.map((x, n) => (n === i ? { ...x, kode: e.target.value } : x)) })} /></Field>
                  <Field label="Label"><Input value={b.nama} onChange={(e) => setIsi({ ...isi, bagian: isi.bagian.map((x, n) => (n === i ? { ...x, nama: e.target.value } : x)) })} /></Field>
                  <Field label="Urutan"><Input inputMode="numeric" value={t(b.urutan)} onChange={(e) => setIsi({ ...isi, bagian: isi.bagian.map((x, n) => (n === i ? { ...x, urutan: Number(e.target.value) || 0 } : x)) })} /></Field>
                </div>
                <label className="u-kur-centang-satu"><Checkbox checked={b.aktif} onCheckedChange={(v) => setIsi({ ...isi, bagian: isi.bagian.map((x, n) => (n === i ? { ...x, aktif: v === true } : x)) })} /> Aktif {k.primitif[b.kode] ? '(penyunting bawaan)' : ''}</label>
                {!k.primitif[b.kode] ? <EditorIsian value={b.isian} onChange={(v) => setIsi({ ...isi, bagian: isi.bagian.map((x, n) => (n === i ? { ...x, isian: v } : x)) })} /> : null}
              </fieldset>
            ))}
            <Button size="sm" variant="outline" onClick={() => setIsi({ ...isi, bagian: [...isi.bagian, { kode: '', nama: '', aktif: true, urutan: (isi.bagian.length + 1) * 10, keterangan: '', isian: [] }] })}><Plus /> Tambah bagian</Button>
          </div>
        ) },
        { id: 'isian_mk', title: 'Isian MK', content: <EditorIsian value={isi.isian_mk} onChange={(v) => setIsi({ ...isi, isian_mk: v })} /> },
        { id: 'perangkat', title: 'Perangkat MK', content: ref.data ? <EditorPerangkat value={isi.perangkat} onChange={(v) => setIsi({ ...isi, perangkat: v })} opsi={ref.data} /> : <Skeleton style={{ height: 120 }} /> },
        { id: 'rps', title: 'Templat RPS', content: (
          <div className="u-bkd-form">
            <div className="u-bkd-grid-3">
              <IsianAngka label="Pertemuan minimal" value={isi.rps.pertemuan_min} onChange={(v) => setIsi({ ...isi, rps: { ...isi.rps, pertemuan_min: v } })} />
              <IsianAngka label="Menit per SKS per minggu" value={isi.rps.menit_per_sks} onChange={(v) => setIsi({ ...isi, rps: { ...isi.rps, menit_per_sks: v } })} />
            </div>
            <p className="u-bkd-label">Bagian RPS</p>
            <EditorDaftarKode value={isi.rps.bagian as (ButirKode & { aktif: boolean; wajib: boolean })[]} onChange={(v) => setIsi({ ...isi, rps: { ...isi.rps, bagian: v.map((x) => ({ ...x, aktif: x.aktif ?? true, wajib: x.wajib ?? false })) } })} baru={() => ({ kode: '', nama: '', aktif: true, wajib: false })} tambahLabel="Tambah bagian RPS" />
            <p className="u-bkd-label">Kolom tabel pertemuan</p>
            <EditorDaftarKode value={isi.rps.kolom_pertemuan as (ButirKode & { jenis: string })[]} onChange={(v) => setIsi({ ...isi, rps: { ...isi.rps, kolom_pertemuan: v.map((x) => ({ ...x, jenis: x.jenis ?? 'teks' })) } })} baru={() => ({ kode: '', nama: '', jenis: 'teks' })} kolom={[{ kunci: 'jenis', label: 'Jenis' }]} tambahLabel="Tambah kolom" />
            <p className="u-bkd-label">Validasi (tanpa kode: fakta, operator, angka)</p>
            {isi.rps.validasi.map((v, i) => (
              <div key={i} className="u-kur-daftar-baris">
                <Select options={Object.entries(k.fakta_rps).map(([value, label]) => ({ value, label }))} value={v.kiri} onValueChange={(x) => setIsi({ ...isi, rps: { ...isi.rps, validasi: isi.rps.validasi.map((y, n) => (n === i ? { ...y, kiri: String(x ?? '') } : y)) } })} placeholder="Pilih…" />
                <Select options={['=', '!=', '>=', '<=', '>', '<'].map((o) => ({ value: o, label: o }))} value={v.op} onValueChange={(x) => setIsi({ ...isi, rps: { ...isi.rps, validasi: isi.rps.validasi.map((y, n) => (n === i ? { ...y, op: String(x ?? '=') } : y)) } })} placeholder="Pilih…" />
                <Input aria-label="Nilai" inputMode="decimal" value={t(v.kanan)} onChange={(e) => setIsi({ ...isi, rps: { ...isi.rps, validasi: isi.rps.validasi.map((y, n) => (n === i ? { ...y, kanan: keAngka(e.target.value) ?? 0 } : y)) } })} />
                <Input aria-label="Pesan" placeholder="Pesan" value={v.pesan} onChange={(e) => setIsi({ ...isi, rps: { ...isi.rps, validasi: isi.rps.validasi.map((y, n) => (n === i ? { ...y, pesan: e.target.value } : y)) } })} />
                <Button size="sm" variant="ghost" aria-label="Hapus validasi" onClick={() => setIsi({ ...isi, rps: { ...isi.rps, validasi: isi.rps.validasi.filter((_, n) => n !== i) } })}><X /></Button>
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setIsi({ ...isi, rps: { ...isi.rps, validasi: [...isi.rps.validasi, { kode: `v${isi.rps.validasi.length + 1}`, kiri: 'total_bobot_evaluasi', op: '=', kanan: 100, pesan: '' }] } })}><Plus /> Tambah validasi</Button>
          </div>
        ) },
        { id: 'tinjau', title: 'Tinjau', content: <WizardReview sections={[{ title: 'Kerangka', items: [{ label: 'Nama', value: nama }, { label: 'Bagian aktif', value: isi.bagian.filter((b) => b.aktif).map((b) => b.nama).join(', ') }, { label: 'Perangkat', value: isi.perangkat.map((p) => p.nama).join(', ') }, { label: 'Validasi RPS', value: `${isi.rps.validasi.length} aturan` }] }]} /> },
      ]}
      onFinish={async () => {
        try {
          await aksi('PUT', `${BASIS_KERANGKA}/${k.id}`, { nama, isi }, 'Draf kerangka tersimpan.');
          return null;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

// ------------------------------------------------------------------ perangkat MK berbukti
interface PerangkatStatus extends PerangkatAturan {
  wajib: boolean;
  status: 'belum' | 'dinyatakan' | 'diunggah' | 'diverifikasi' | 'ditolak';
  otomatis: string | null;
  nama_verifikator: string;
  bukti: BuktiPerangkat | null;
  riwayat: BuktiPerangkat[];
}
interface BuktiPerangkat {
  id: number;
  versi: number;
  status: string;
  berkas_id: string | null;
  nama_berkas: string | null;
  catatan: string | null;
  diunggah_oleh: string | null;
  diunggah_at: string | null;
  diverifikasi_oleh: string | null;
  diverifikasi_at: string | null;
  catatan_verifikasi: string | null;
}
export interface PerangkatMkData {
  mata_kuliah: { kode_prodi: string; kode_mk: string; nama_mk: string; tahun_id: string; sks: number; nidn: string | null; jenis_mk: string[] };
  aturan: { id: number; nama: string; versi: number; kerangka: string } | null;
  kurikulum_mk: { id: number; kurikulum_id: number; kode_kurikulum: string } | null;
  isian_wajib: string[];
  pertemuan_min: number | null;
  perangkat: PerangkatStatus[];
  ringkasan: { wajib: number; terverifikasi: number; lengkap: boolean; persen: number };
  pddikti: Record<string, { nilai: string; berbukti: boolean; centang_lama: boolean }>;
  hak: { unggah: boolean; verifikasi: string[] };
}
const STATUS_PERANGKAT: Record<PerangkatStatus['status'], [string, React.ComponentProps<typeof Badge>['variant']]> = {
  belum: ['Belum ada', 'neutral'],
  dinyatakan: ['Dinyatakan (tanpa bukti)', 'warning'],
  diunggah: ['Menunggu verifikasi', 'info'],
  diverifikasi: ['Terverifikasi', 'success'],
  ditolak: ['Ditolak', 'danger'],
};
export const LencanaPerangkat = ({ status }: { status: PerangkatStatus['status'] }) => <Badge variant={STATUS_PERANGKAT[status][1]} dot>{STATUS_PERANGKAT[status][0]}</Badge>;

export function usePerangkatMataKuliah(prodi?: string, kodeMk?: string, tahun?: string) {
  return useSiakadQuery<PerangkatMkData>(['kurikulum-aturan', 'perangkat', prodi, kodeMk, tahun], q(`${BASIS}/perangkat/mk`, { prodi, kode_mk: kodeMk, tahun_id: tahun }), { enabled: !!prodi && !!kodeMk });
}

/** Kelengkapan perangkat MK berbukti: daftar perangkat menurut aturan versi MK, unggah bukti, verifikasi, riwayat. */
export function PerangkatMataKuliah({ prodi, kodeMk, tahun, ringkas, className }: { prodi: string; kodeMk: string; tahun?: string; ringkas?: boolean; className?: string }) {
  const d = usePerangkatMataKuliah(prodi, kodeMk, tahun);
  const aksi = useAksi();
  const [unggah, setUnggah] = React.useState<PerangkatStatus | null>(null);
  const [periksa, setPeriksa] = React.useState<PerangkatStatus | null>(null);
  if (!d.data) return d.error ? <Alert variant="danger">{pesanGalat(d.error)}</Alert> : <Skeleton style={{ height: 160 }} />;
  const x = d.data;
  return (
    <div className={cn('u-kur-perangkat', className)}>
      <div className="u-kur-perangkat-kepala">
        <div>
          <p className="u-bkd-label">{x.aturan ? `Aturan ${x.aturan.nama} v${x.aturan.versi}` : 'Belum ada aturan kurikulum: centang lama'} · jenis MK {x.mata_kuliah.jenis_mk.join(', ')}</p>
          <strong>{x.ringkasan.terverifikasi}/{x.ringkasan.wajib} perangkat wajib terverifikasi</strong>
        </div>
        <Badge variant={x.ringkasan.lengkap ? 'success' : 'warning'}>{x.ringkasan.lengkap ? 'Lengkap' : `${x.ringkasan.persen}%`}</Badge>
      </div>
      <ul className="u-kur-perangkat-daftar">
        {x.perangkat.filter((p) => !ringkas || p.wajib || p.status !== 'belum').map((p) => (
          <li key={p.kode} data-wajib={p.wajib ? '' : undefined}>
            <div className="u-kur-perangkat-teks">
              <strong>{p.nama}</strong>
              <small>
                {p.wajib ? 'Wajib' : 'Opsional'} · diverifikasi {p.nama_verifikator}
                {p.otomatis ? ` · ${p.otomatis}` : ''}
                {p.bukti?.nama_berkas ? ` · ${p.bukti.nama_berkas} (v${p.bukti.versi})` : ''}
                {p.bukti?.catatan_verifikasi ? ` · catatan: ${p.bukti.catatan_verifikasi}` : ''}
              </small>
            </div>
            <LencanaPerangkat status={p.status} />
            <span className="u-kur-perangkat-aksi">
              {p.sumber === 'unggah' && x.hak.unggah ? <Button size="sm" variant="outline" onClick={() => setUnggah(p)}><FileUp /> {p.bukti ? 'Unggah versi baru' : 'Unggah bukti'}</Button> : null}
              {p.status === 'diunggah' && p.bukti && x.hak.verifikasi.includes(p.verifikator) ? <Button size="sm" onClick={() => setPeriksa(p)}><ShieldCheck /> Periksa</Button> : null}
            </span>
          </li>
        ))}
      </ul>
      {!ringkas ? (
        <p className="u-bkd-keterangan">
          Pelaporan PDDikti (dihitung): {Object.entries(x.pddikti).map(([k, v]) => `${k} ${v.nilai}${v.berbukti ? ' ✓bukti' : v.centang_lama ? ' (centang lama)' : ''}`).join(' · ')}
        </p>
      ) : null}
      {unggah ? <PanelUnggahBukti data={x} perangkat={unggah} onOpenChange={(o) => !o && setUnggah(null)} /> : null}
      {periksa && periksa.bukti ? (
        <PanelVerifikasiBukti perangkat={periksa} onOpenChange={(o) => !o && setPeriksa(null)} onPutus={async (setuju, catatan) => { await aksi('POST', `${BASIS}/perangkat/bukti/${periksa.bukti!.id}/verifikasi`, { keputusan: setuju ? 'setuju' : 'tolak', catatan }, setuju ? 'Bukti diverifikasi.' : 'Bukti ditolak.'); setPeriksa(null); }} />
      ) : null}
    </div>
  );
}

function PanelUnggahBukti({ data: x, perangkat: p, onOpenChange }: { data: PerangkatMkData; perangkat: PerangkatStatus; onOpenChange: (o: boolean) => void }) {
  const aksi = useAksi();
  const [berkas, setBerkas] = React.useState<string | null>(null);
  const [catatan, setCatatan] = React.useState('');
  return (
    <Sheet open onOpenChange={onOpenChange} title={`Unggah ${p.nama}`} description={`${x.mata_kuliah.kode_mk} · ${x.mata_kuliah.nama_mk}. Bukti diverifikasi ${p.nama_verifikator}.`} size="md"
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button><Button disabled={!berkas} onClick={async () => { await aksi('POST', `${BASIS}/perangkat/unggah`, { kode_prodi: x.mata_kuliah.kode_prodi, kode_mk: x.mata_kuliah.kode_mk, tahun_id: x.mata_kuliah.tahun_id, perangkat: p.kode, berkas_id: berkas, catatan }, 'Bukti diunggah, menunggu verifikasi.'); onOpenChange(false); }}><Send /> Kirim untuk verifikasi</Button></>}>
      <div className="u-bkd-form">
        <Field label="Berkas" required description={p.format.length ? `Format ${p.format.join(', ')}` : undefined}>
          <PilihBerkas value={berkas} onValueChange={(v) => setBerkas(v)} accept={p.format.map((f) => `.${f}`).join(',') || undefined} modul="kurikulum" />
        </Field>
        <Field label="Catatan" optional><Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} /></Field>
        {p.riwayat.length ? (
          <div>
            <p className="u-bkd-label">Riwayat versi</p>
            <ul className="u-kur-perangkat-ringkas">{p.riwayat.map((b) => <li key={b.id}><strong>v{b.versi} {b.nama_berkas}</strong> <small>{b.status} · {b.diunggah_oleh} {tgl(b.diunggah_at)}</small></li>)}</ul>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}

function PanelVerifikasiBukti({ perangkat: p, onOpenChange, onPutus }: { perangkat: PerangkatStatus; onOpenChange: (o: boolean) => void; onPutus: (setuju: boolean, catatan: string) => Promise<void> }) {
  const [catatan, setCatatan] = React.useState('');
  return (
    <Sheet open onOpenChange={onOpenChange} title={`Verifikasi ${p.nama}`} description={`${p.bukti?.nama_berkas ?? ''} · v${p.bukti?.versi} · diunggah ${p.bukti?.diunggah_oleh ?? ''} ${tgl(p.bukti?.diunggah_at)}`} size="md"
      footer={<><Button variant="destructive-soft" disabled={catatan.trim().length < 5} onClick={() => void onPutus(false, catatan)}>Tolak</Button><Button onClick={() => void onPutus(true, catatan)}><BookCheck /> Setujui</Button></>}>
      <div className="u-bkd-form">
        {p.bukti?.catatan ? <Alert variant="neutral">{p.bukti.catatan}</Alert> : null}
        <Field label="Catatan verifikasi" description="Wajib bila menolak (min. 5 karakter)."><Textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} /></Field>
      </div>
    </Sheet>
  );
}

/** Rekap kelengkapan perangkat per prodi/periode: persen, MK kurang bukti, menunggu verifikasi, pengingat ke dosen koordinator. */
export function RekapPerangkatMk({ prodi, tahun, onBukaMk, className }: { prodi: string; tahun?: string; onBukaMk?: (kodeMk: string) => void; className?: string }) {
  const d = useSiakadQuery<{ ringkasan: { mk: number; lengkap: number; persen_mk_lengkap: number; persen_perangkat: number; menunggu_verifikasi: number }; data: { kode_mk: string; nama_mk: string; semester: number; sks: number; koordinator: string | null; persen: number; lengkap: boolean; kurang: { kode: string; nama: string; status: PerangkatStatus['status'] }[]; menunggu_verifikasi: number; aturan: string | null }[] }>(
    ['kurikulum-aturan', 'rekap-perangkat', prodi, tahun], q(`${BASIS}/perangkat/rekap`, { prodi, tahun_id: tahun }), { enabled: !!prodi });
  const aksi = useAksi();
  const [hanyaKurang, setHanyaKurang] = React.useState(true);
  if (!d.data) return d.error ? <Alert variant="danger">{pesanGalat(d.error)}</Alert> : <Skeleton style={{ height: 200 }} />;
  const r = d.data;
  return (
    <div className={cn('u-bkd-form', className)}>
      <StatGrid>
        <StatCard label="MK lengkap" value={`${r.ringkasan.lengkap}/${r.ringkasan.mk}`} hint={`${r.ringkasan.persen_mk_lengkap}%`} tone={r.ringkasan.persen_mk_lengkap >= 80 ? 'success' : 'warning'} />
        <StatCard label="Perangkat wajib terverifikasi" value={`${r.ringkasan.persen_perangkat}%`} />
        <StatCard label="Menunggu verifikasi" value={r.ringkasan.menunggu_verifikasi} tone={r.ringkasan.menunggu_verifikasi ? 'info' : undefined} />
      </StatGrid>
      <DataTable rows={r.data.filter((x) => !hanyaKurang || !x.lengkap)} rowKey={(x) => x.kode_mk} columnToggle={false} densityToggle={false}
        toolbar={<span className="u-bkd-aksi"><label className="u-kur-centang-satu"><Checkbox checked={hanyaKurang} onCheckedChange={(v) => setHanyaKurang(v === true)} /> Hanya yang belum lengkap</label>
          <Button size="sm" variant="outline" onClick={() => void aksi('POST', `${BASIS}/perangkat/pengingat`, { kode_prodi: prodi, tahun_id: tahun }, 'Pengingat dikirim ke dosen koordinator.')}><Send /> Kirim pengingat</Button></span>}
        onRowClick={onBukaMk ? (x) => onBukaMk(x.kode_mk) : undefined}
        columns={[
          { key: 'mk', header: 'Mata kuliah', mobile: 'title', cell: (x) => <span className="u-kur-sel"><strong>{x.nama_mk}</strong><small>{x.kode_mk} · smt {x.semester} · {x.sks} SKS</small></span> },
          { key: 'koordinator', header: 'Koordinator', cell: (x) => x.koordinator ?? <span className="u-kur-lama">Belum ditentukan</span> },
          { key: 'persen', header: 'Lengkap', shrink: true, mobile: 'badge', cell: (x) => <Badge variant={x.lengkap ? 'success' : x.persen >= 50 ? 'warning' : 'danger'}>{x.persen}%</Badge> },
          { key: 'kurang', header: 'Kurang bukti', cell: (x) => x.kurang.map((k) => `${k.nama}${k.status === 'dinyatakan' ? ' (centang lama)' : k.status === 'diunggah' ? ' (menunggu)' : ''}`).join('; ') || '-' },
        ]}
        empty={{ title: hanyaKurang ? 'Semua mata kuliah lengkap' : 'Belum ada mata kuliah' }} />
    </div>
  );
}

// ------------------------------------------------------------------ ketercapaian CPL
interface Ketercapaian {
  aturan: { id: number; nama: string; versi: number } | null;
  ambang: { cpl_bawaan: number | null; persen_mahasiswa: number | null; sumber_nilai: string };
  pemetaan: { mk_berkomponen: number; cpmk_ke_cpl: number; mk_ke_cpl: number };
  metode: string;
  cpl: { cpl_id: number; kode: string; ranah: string; deskripsi: string; ambang: number | null; jumlah_mahasiswa: number; rata_rata: number | null; persen_tercapai: number | null; tercapai_prodi: boolean | null;
    mk_terlemah: { kode_mk: string; nama: string; rata_rata: number } | null; jumlah_belum_tercapai: number; belum_tercapai: { nim: string; nama: string; nilai: number | null }[] }[];
  mahasiswa: { nim: string; nama: string; cpl: { kode: string; nilai: number | null; tercapai: boolean | null }[] }[];
}

/** Laporan ketercapaian CPL per angkatan, dihitung otomatis dari nilai komponen (RPS → CPMK → CPL). */
export function LaporanKetercapaianCpl({ kurikulumId, angkatanAwal, className }: { kurikulumId: number; angkatanAwal?: number; className?: string }) {
  const [angkatan, setAngkatan] = React.useState<string>(angkatanAwal ? String(angkatanAwal) : '');
  const d = useSiakadQuery<Ketercapaian>(['kurikulum-aturan', 'ketercapaian', kurikulumId, angkatan], q(`${BASIS}/ketercapaian`, { kurikulum_id: kurikulumId, angkatan }));
  const tren = useSiakadQuery<{ periode: string[]; data: { kode: string; tahun_id: string; persen_tercapai: number | null; rata_rata: number | null }[] }>(['kurikulum-aturan', 'tren', kurikulumId, angkatan], q(`${BASIS}/ketercapaian/tren`, { kurikulum_id: kurikulumId, angkatan }));
  const s0 = useSiakad();
  const toast = useToast();
  const tahun = new Date().getFullYear();
  const ekspor = async () => {
    try {
      const r = await s0.request<{ nama_berkas: string; csv: string }>({ method: 'GET', path: `${BASIS}/ketercapaian/ekspor`, query: { kurikulum_id: String(kurikulumId) } });
      const url = URL.createObjectURL(new Blob([r.data.csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = r.data.nama_berkas;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.add({ title: 'Ekspor gagal', description: pesanGalat(e), type: 'error' });
    }
  };
  return (
    <div className={cn('u-bkd-form', className)}>
      <div className="u-bkd-aksi">
        <Select options={[{ value: '', label: 'Semua angkatan' }, ...Array.from({ length: 8 }, (_, i) => ({ value: String(tahun - i), label: `Angkatan ${tahun - i}` }))]} value={angkatan} onValueChange={(v) => setAngkatan(String(v ?? ''))} placeholder="Pilih…" />
        <Button variant="outline" onClick={() => void ekspor()}>Ekspor LED/borang (CSV)</Button>
      </div>
      {d.data && d.data.cpl.length >= 3 ? <RadarCpl cpl={d.data.cpl.map((c) => ({ kode: c.kode, nilai: c.persen_tercapai, ambang: c.ambang }))} /> : null}
      {tren.data && tren.data.periode.length ? (
        <Card>
          <CardHeader title="Tren ketercapaian antar periode" description="Rekap terjadwal (Penjadwal: Hitung ulang ketercapaian CPL)." />
          <CardContent>
            <DataTable<{ kode: string }>
              columns={[
                { key: 'kode', header: 'CPL', mobile: 'title' },
                ...tren.data.periode.map((p) => ({
                  key: p,
                  header: labelTahunAkademik(p, true),
                  label: labelTahunAkademik(p),
                  align: 'end' as const,
                  value: (r: { kode: string }) => tren.data!.data.find((y) => y.kode === r.kode && y.tahun_id === p)?.persen_tercapai ?? null,
                  cell: (r: { kode: string }) => {
                    const x = tren.data!.data.find((y) => y.kode === r.kode && y.tahun_id === p);
                    return x?.persen_tercapai != null ? `${angka(x.persen_tercapai)}%` : '-';
                  },
                })),
              ]}
              rows={[...new Set(tren.data.data.map((x) => x.kode))].map((kode) => ({ kode }))}
              rowKey={(r) => r.kode}
              exportCsv="tren-ketercapaian-cpl"
              pagination={false} columnToggle={false} densityToggle={false} defaultDensity="compact"
            />
          </CardContent>
        </Card>
      ) : null}
      {!d.data ? (d.error ? <Alert variant="danger">{pesanGalat(d.error)}</Alert> : <Skeleton style={{ height: 200 }} />) : (
        <>
          <p className="u-bkd-keterangan">{d.data.metode} {d.data.aturan ? `Ambang dari ${d.data.aturan.nama} v${d.data.aturan.versi}.` : ''} Pemetaan: {d.data.pemetaan.mk_berkomponen} MK berkomponen, {d.data.pemetaan.cpmk_ke_cpl} CPMK→CPL, {d.data.pemetaan.mk_ke_cpl} MK→CPL.</p>
          <div className="u-kur-cpl">
            {d.data.cpl.map((c) => (
              <Card key={c.cpl_id}>
                <CardContent>
                  <div className="u-kur-perangkat-kepala">
                    <strong>{c.kode}</strong>
                    {c.tercapai_prodi == null ? <Badge>Belum ada data</Badge> : <Badge variant={c.tercapai_prodi ? 'success' : 'danger'}>{c.tercapai_prodi ? 'Tercapai' : 'Belum tercapai'}</Badge>}
                  </div>
                  <p className="u-bkd-keterangan">{c.deskripsi}</p>
                  <div className="u-kur-bar" aria-label={`${c.persen_tercapai ?? 0}% mahasiswa mencapai`}><span style={{ width: `${c.persen_tercapai ?? 0}%` }} /></div>
                  <small>{c.persen_tercapai ?? '-'}% dari {c.jumlah_mahasiswa} mahasiswa ≥ {c.ambang ?? '-'} · rata-rata {c.rata_rata ?? '-'}</small>
                  {c.mk_terlemah ? <p className="u-bkd-keterangan">Penyumbang terlemah: {c.mk_terlemah.kode_mk} {c.mk_terlemah.nama} (rata-rata {angka(c.mk_terlemah.rata_rata)})</p> : null}
                  {c.jumlah_belum_tercapai ? <p className="u-bkd-keterangan" title={c.belum_tercapai.map((m) => `${m.nim} ${m.nama}`).join('\n')}>{c.jumlah_belum_tercapai} mahasiswa belum mencapai (bahan remedial/bimbingan PA)</p> : null}
                </CardContent>
              </Card>
            ))}
          </div>
          <DataTable rows={d.data.mahasiswa} rowKey={(m) => m.nim} columnToggle={false} densityToggle={false}
            columns={[{ key: 'nama', header: 'Mahasiswa', mobile: 'title', cell: (m) => <span className="u-kur-sel"><strong>{m.nama}</strong><small>{m.nim}</small></span> },
              ...d.data.cpl.map((c, i) => ({ key: c.kode, header: c.kode, shrink: true, cell: (m: Ketercapaian['mahasiswa'][number]) => { const x = m.cpl[i]; return x?.nilai == null ? '-' : <span data-tercapai={x.tercapai ? '' : undefined} className="u-kur-nilai">{angka(x.nilai)}</span>; } }))]}
            empty={{ title: 'Belum ada mahasiswa' }} />
        </>
      )}
    </div>
  );
}

/** Aturan kurikulum yang berlaku untuk satu mahasiswa (versi, sumber, syarat lulus efektif). */
export function AturanKurikulumMahasiswa({ nim, className }: { nim: string; className?: string }) {
  const d = useSiakadQuery<{ sumber: string; versi: { nama: string; versi: number } | null; turunan: { nama: string }[]; mahasiswa: { angkatan: number | null; semester_ke: number | null }; efektif: { sks_maks_semester: number | null; skala: SkalaNilaiKurikulum[] | { sumber: string } }; kelulusan: { kode: string; nama: string; terpenuhi: boolean; sumber: string }[] }>(
    ['kurikulum-aturan', 'mahasiswa', nim], q(`${BASIS}/mahasiswa/${nim}`));
  if (!d.data) return d.error ? <Alert variant="danger">{pesanGalat(d.error)}</Alert> : <Skeleton style={{ height: 120 }} />;
  const x = d.data;
  return (
    <Card className={className}>
      <CardHeader title={x.versi ? `${x.versi.nama} v${x.versi.versi}` : 'Ketentuan lama SIAKAD'} description={`${x.sumber === 'timpaan' ? 'Dipindahkan manual' : 'Otomatis'} · angkatan ${x.mahasiswa.angkatan ?? '-'} · semester ${x.mahasiswa.semester_ke ?? '-'}${x.turunan.length ? ` · ${x.turunan.map((t2) => t2.nama).join(', ')}` : ''}`} />
      <CardContent>
        <DescriptionList items={[
          { label: 'Batas SKS semester ini', value: x.efektif.sks_maks_semester ?? 'ketentuan lama' },
          { label: 'Skala nilai', value: Array.isArray(x.efektif.skala) ? x.efektif.skala.map((s) => s.huruf).join(', ') : 'm_nilai SIAKAD' },
          ...x.kelulusan.map((k) => ({ label: k.nama, value: <Badge variant={k.terpenuhi ? 'success' : 'warning'}>{k.terpenuhi ? 'Terpenuhi' : 'Belum'}</Badge> })),
        ]} />
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------ statistik mata kuliah
interface StatistikMk {
  nama_mk: string | null;
  aturan: { nama: string; versi: number } | null;
  periode: { tahun_id: string; peserta: number; bernilai: number; lulus: number; sebaran: Record<string, number>; rata_bobot: number | null; persen_lulus: number | null }[];
  kelas: { kelas: string; dosen: string | null; peserta: number; rata_bobot: number | null; persen_lulus: number | null }[];
  kehadiran_persen: number | null;
  cpmk: { kode: string; deskripsi: string; target: number; mahasiswa: number; rata_rata: number | null; persen_tercapai: number | null }[];
  kontribusi_cpl: { kode: string; deskripsi: string; bobot: number; persen_dari_cpl: number | null }[];
  perangkat: { wajib: number; terverifikasi: number; lengkap: boolean; persen: number } | null;
}

/** Statistik satu mata kuliah untuk indikator CPL: tren antar periode, sebaran huruf, kelas/dosen, CPMK, kontribusi ke CPL, perangkat. */
export function StatistikMataKuliah({ prodi, kodeMk, tahun, className }: { prodi: string; kodeMk: string; tahun?: string; className?: string }) {
  const d = useSiakadQuery<StatistikMk>(['kurikulum-aturan', 'statistik-mk', prodi, kodeMk, tahun], q(`${BASIS}/statistik/mk`, { prodi, kode_mk: kodeMk, tahun_id: tahun }), { enabled: !!prodi && !!kodeMk });
  if (!d.data) return d.error ? <Alert variant="danger">{pesanGalat(d.error)}</Alert> : <Skeleton style={{ height: 240 }} />;
  const x = d.data;
  const kini = x.periode[0];
  const huruf = [...new Set(x.periode.flatMap((p) => Object.keys(p.sebaran)))].sort();
  const maks = Math.max(1, ...x.periode.map((p) => Math.max(0, ...Object.values(p.sebaran))));
  return (
    <div className={cn('u-bkd-form', className)}>
      <StatGrid>
        <StatCard label="Peserta periode ini" value={kini?.peserta ?? 0} hint={x.aturan ? `${x.aturan.nama} v${x.aturan.versi}` : 'Ketentuan lama'} />
        <StatCard label="Lulus" value={kini?.persen_lulus != null ? `${angka(kini.persen_lulus)}%` : '-'} delta={x.periode[1]?.persen_lulus != null && kini?.persen_lulus != null ? Number((kini.persen_lulus - x.periode[1].persen_lulus).toFixed(1)) : null} deltaUnit=" poin" />
        <StatCard label="Rata-rata bobot" value={kini?.rata_bobot != null ? angka(kini.rata_bobot) : '-'} />
        <StatCard label="Kehadiran" value={x.kehadiran_persen != null ? `${angka(x.kehadiran_persen)}%` : '-'} />
        <StatCard label="Perangkat" value={x.perangkat ? `${x.perangkat.terverifikasi}/${x.perangkat.wajib}` : '-'} tone={x.perangkat?.lengkap ? 'success' : 'warning'} />
      </StatGrid>
      <Card>
        <CardHeader title="Sebaran nilai antar periode" description="Bandingkan periode untuk melihat tren." />
        <CardContent>
          <DataTable<(typeof x.periode)[number]>
            className="u-kur-sebaran"
            columns={[
              { key: 'tahun_id', header: 'Periode', mobile: 'title', value: (p) => p.tahun_id, cell: (p) => labelTahunAkademik(p.tahun_id) },
              ...huruf.map((h) => ({
                key: `h-${h}`,
                header: h,
                value: (p: (typeof x.periode)[number]) => p.sebaran[h] ?? 0,
                cell: (p: (typeof x.periode)[number]) => (
                  <>
                    <span className="u-kur-batang" style={{ width: `${(100 * (p.sebaran[h] ?? 0)) / maks}%` }} />
                    {p.sebaran[h] ?? 0}
                  </>
                ),
              })),
              { key: 'persen_lulus', header: 'Lulus', align: 'end', mobile: 'badge', value: (p) => p.persen_lulus ?? null, cell: (p) => (p.persen_lulus != null ? `${angka(p.persen_lulus)}%` : '-') },
            ]}
            rows={x.periode}
            rowKey={(p) => p.tahun_id}
            pagination={false} columnToggle={false} densityToggle={false} defaultDensity="compact"
          />
        </CardContent>
      </Card>
      <div className="u-kur-ringkas">
        <Card>
          <CardHeader title="Capaian CPMK (komponen nilai)" />
          <CardContent>
            {x.cpmk.length ? x.cpmk.map((c) => (
              <div key={c.kode} className="u-kur-cpmk">
                <strong>{c.kode}</strong> <small>{c.deskripsi}</small>
                <div className="u-kur-bar"><span style={{ width: `${c.persen_tercapai ?? 0}%` }} /></div>
                <small>{c.persen_tercapai != null ? `${angka(c.persen_tercapai)}% mencapai ${angka(c.target)} · rata-rata ${angka(c.rata_rata)}` : 'Belum ada nilai komponen yang dipetakan (rencana evaluasi RPS).'}</small>
              </div>
            )) : <p className="u-bkd-keterangan">MK belum ada di kurikulum OBE atau belum punya CPMK.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Kontribusi ke CPL" />
          <CardContent>
            {x.kontribusi_cpl.length ? x.kontribusi_cpl.map((c) => (
              <div key={c.kode} className="u-kur-cpmk">
                <strong>{c.kode}</strong> <small>{c.deskripsi}</small>
                <div className="u-kur-bar"><span style={{ width: `${c.persen_dari_cpl ?? 0}%` }} /></div>
                <small>bobot {angka(c.bobot)} · {angka(c.persen_dari_cpl)}% dari total bobot CPL</small>
              </div>
            )) : <p className="u-bkd-keterangan">Belum dipetakan di matriks CPL-MK.</p>}
          </CardContent>
        </Card>
      </div>
      <DataTable rows={x.kelas} rowKey={(k) => k.kelas} columnToggle={false} densityToggle={false}
        columns={[{ key: 'kelas', header: 'Kelas', shrink: true }, { key: 'dosen', header: 'Dosen', cell: (k) => k.dosen ?? '-' }, { key: 'peserta', header: 'Peserta', shrink: true },
          { key: 'rata', header: 'Rata-rata bobot', shrink: true, cell: (k) => angka(k.rata_bobot) ?? '-' }, { key: 'lulus', header: 'Lulus', shrink: true, cell: (k) => (k.persen_lulus != null ? `${angka(k.persen_lulus)}%` : '-') }]}
        empty={{ title: 'Belum ada kelas di periode ini' }} />
    </div>
  );
}

// ------------------------------------------------------------------ evaluasi & peninjauan (dinamis dari kerangka)
interface JenisEvaluasi {
  kode: string;
  nama: string;
  tingkat: 'mk' | 'prodi';
  siklus: string;
  siklus_tahun: number | null;
  ppepp: string;
  masukan: string[];
  instrumen: IsianKerangka[];
  tahap: { kode: string; judul: string; aksi: string; peran: string[] }[];
  hasil_versi: boolean;
  objek?: 'kurikulum' | 'rps' | 'mk' | null;
}
interface EvaluasiRow {
  id: number;
  jenis: string;
  nama_jenis: string;
  ppepp: string | null;
  kode_mk: string | null;
  periode: string;
  status: 'draf' | 'proses' | 'disahkan' | 'dikembalikan';
  tahap_ke: number;
  tahap_sekarang: { judul: string; aksi: string; peran: string[]; wajib_sk?: boolean } | null;
  objek?: 'kurikulum' | 'rps' | 'mk' | null;
  objek_id?: number | null;
  kategori?: 'evaluasi' | 'pengesahan';
  jumlah_tahap: number;
  versi_baru_id: number | null;
  updated_at: string;
}
interface EvaluasiDetail extends EvaluasiRow {
  definisi: JenisEvaluasi | null;
  isian: Record<string, string>;
  masukan: Record<string, { nama: string; tersedia: boolean; catatan?: string; [k: string]: unknown }>;
  alur: { kode: string; judul: string; unit: string; peran: string; status: string; oleh: string | null; waktu: string | null; catatan: string | null }[];
  boleh: boolean;
}
const STATUS_EVALUASI: Record<EvaluasiRow['status'], [string, React.ComponentProps<typeof Badge>['variant']]> = {
  draf: ['Draf', 'neutral'], proses: ['Diperiksa', 'info'], disahkan: ['Disahkan', 'success'], dikembalikan: ['Dikembalikan', 'warning'],
};
const SIKLUS: Record<string, string> = { semester: 'per semester', tahunan: 'tahunan', n_tahun: 'berkala' };

function RingkasMasukan({ m }: { m: EvaluasiDetail['masukan'][string] }) {
  if (!m.tersedia) return <span className="u-kur-lama">{m.catatan ?? 'Belum tersedia; isi manual di instrumen.'}</span>;
  const x = m as Record<string, unknown>;
  if (Array.isArray(x.cpl)) return <>{(x.cpl as { kode: string; persen_tercapai: number | null; tercapai_prodi: boolean | null }[]).map((c) => `${c.kode} ${c.persen_tercapai ?? '-'}%${c.tercapai_prodi === false ? ' (di bawah ambang)' : ''}`).join(' · ')}</>;
  if (Array.isArray(x.cpmk)) return <>{(x.cpmk as { kode: string; persen_tercapai: number | null }[]).map((c) => `${c.kode} ${c.persen_tercapai ?? '-'}%`).join(' · ')}</>;
  if (Array.isArray(x.periode)) return <>{(x.periode as { tahun_id: string; persen_lulus: number | null; rata_bobot: number | null }[]).map((p) => `${p.tahun_id}: lulus ${p.persen_lulus ?? '-'}%, rata ${p.rata_bobot ?? '-'}`).join(' · ')}</>;
  return <>{Object.entries(x).filter(([k]) => !['nama', 'tersedia'].includes(k)).map(([k, v]) => `${k.replace(/_/g, ' ')} ${String(v)}`).join(' · ')}</>;
}

/** Evaluasi, peninjauan, dan PENGESAHAN BERJENJANG kurikulum prodi (kurikulum, usulan MK, RPS): jenis, instrumen, masukan otomatis, dan tahap dari definisi kerangka. */
export function EvaluasiKurikulum({ prodi, mkPilihan = [], className }: { prodi: string; mkPilihan?: { kode_mk: string; nama_mk: string }[]; className?: string }) {
  const def = useSiakadQuery<{ aturan: { nama: string; versi: number } | null; jenis: JenisEvaluasi[]; sumber: Record<string, string> }>(['kurikulum-aturan', 'evaluasi-def', prodi], q(`${BASIS}/evaluasi/definisi`, { prodi }));
  const daftar = useSiakadQuery<EvaluasiRow[]>(['kurikulum-aturan', 'evaluasi', prodi], q(`${BASIS}/evaluasi`, { prodi }));
  const [buka, setBuka] = React.useState<number | null>(null);
  const [baru, setBaru] = React.useState<JenisEvaluasi | null>(null);
  if (!def.data) return def.error ? <Alert variant="danger">{pesanGalat(def.error)}</Alert> : <Skeleton style={{ height: 200 }} />;
  return (
    <div className={cn('u-bkd-form', className)}>
      <p className="u-bkd-keterangan">Jenis evaluasi, instrumen, masukan, dan tahap pemeriksa mengikuti kerangka {def.data.aturan ? `${def.data.aturan.nama} v${def.data.aturan.versi}` : '-'} (data, bisa diubah di Kerangka tanpa kode).</p>
      <div className="u-kur-ringkas">
        {def.data.jenis.map((j) => (
          <Card key={j.kode}>
            <CardHeader title={j.nama} description={`${j.tingkat === 'mk' ? 'Per mata kuliah' : 'Prodi'} · ${SIKLUS[j.siklus] ?? j.siklus}${j.siklus_tahun && j.siklus === 'n_tahun' ? ` (${j.siklus_tahun} tahun)` : ''} · PPEPP: ${j.ppepp}`} />
            <CardContent>
              <p className="u-bkd-keterangan">Masukan otomatis: {j.masukan.map((m) => def.data!.sumber[m] ?? m).join(', ') || '-'}</p>
              <p className="u-bkd-keterangan">Tahap: {j.tahap.map((t) => t.judul).join(' → ')}{j.hasil_versi ? ' → draf versi kurikulum baru' : ''}</p>
              <Button size="sm" onClick={() => setBaru(j)}><Plus /> Mulai</Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <DataTable rows={daftar.data ?? []} rowKey={(r) => String(r.id)} columnToggle={false} densityToggle={false} onRowClick={(r) => setBuka(r.id)}
        columns={[
          { key: 'jenis', header: 'Evaluasi', mobile: 'title', cell: (r) => <span className="u-kur-sel"><strong>{r.nama_jenis}</strong><small>{r.kode_mk ? `${r.kode_mk} · ` : ''}periode {r.periode}</small></span> },
          { key: 'tahap', header: 'Tahap', cell: (r) => (r.status === 'disahkan' ? `Selesai${r.versi_baru_id ? ` · draf versi #${r.versi_baru_id}` : ''}` : `${r.tahap_ke + 1}/${r.jumlah_tahap} ${r.tahap_sekarang?.judul ?? ''}`) },
          { key: 'status', header: 'Status', shrink: true, mobile: 'badge', cell: (r) => <Badge variant={STATUS_EVALUASI[r.status][1]}>{STATUS_EVALUASI[r.status][0]}</Badge> },
          { key: 'waktu', header: 'Diperbarui', shrink: true, cell: (r) => tgl(r.updated_at) },
        ]}
        empty={{ title: 'Belum ada evaluasi', description: 'Mulai portofolio MK, evaluasi CPL tahunan, atau peninjauan kurikulum.' }} />
      {baru ? <PanelMulaiEvaluasi prodi={prodi} jenis={baru} mkPilihan={mkPilihan} onOpenChange={(o) => !o && setBaru(null)} onSelesai={(id) => { setBaru(null); setBuka(id); }} /> : null}
      {buka ? <PanelEvaluasi id={buka} onOpenChange={(o) => !o && setBuka(null)} /> : null}
    </div>
  );
}

function PanelMulaiEvaluasi({ prodi, jenis: j, mkPilihan, onOpenChange, onSelesai }: { prodi: string; jenis: JenisEvaluasi; mkPilihan: { kode_mk: string; nama_mk: string }[]; onOpenChange: (o: boolean) => void; onSelesai: (id: number) => void }) {
  const aksi = useAksi();
  const [mk, setMk] = React.useState<string | null>(null);
  const [periode, setPeriode] = React.useState(j.siklus === 'semester' ? '' : String(new Date().getFullYear()));
  const [tim, setTim] = React.useState('');
  const [objekId, setObjekId] = React.useState<string>('');
  const kur = useSiakadQuery<{ id: number; kode: string; nama: string; status: string }[]>(['kurikulum-aturan', 'kurikulum-obe', prodi], q('/v1/kurikulum-obe/kurikulum', { prodi, per_page: 50 }), { enabled: j.objek === 'kurikulum' });
  return (
    <Sheet open onOpenChange={onOpenChange} title={`Mulai ${j.nama}`} description="Masukan otomatis ditarik saat dibuat dan dibekukan saat diajukan." size="md"
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button><Button disabled={!periode || (j.tingkat === 'mk' && j.objek !== 'rps' && !mk) || ((j.objek === 'kurikulum' || j.objek === 'rps') && !objekId)} onClick={async () => onSelesai((await aksi<EvaluasiDetail>('POST', `${BASIS}/evaluasi`, { jenis: j.kode, kode_prodi: prodi, kode_mk: mk, periode, objek_id: objekId ? Number(objekId) : null, tim: tim.split(',').map((x) => x.trim()).filter(Boolean) }, j.objek ? 'Alur pengesahan dimulai.' : 'Evaluasi dimulai.')).id)}><Plus /> Mulai</Button></>}>
      <div className="u-bkd-form">
        {j.objek === 'kurikulum' ? (
          <Field label="Kurikulum yang disahkan" required description="Kurikulum OBE prodi berstatus draf/diajukan.">
            <Select options={(kur.data ?? []).filter((k) => ['draf', 'diajukan'].includes(k.status)).map((k) => ({ value: String(k.id), label: `${k.kode} · ${k.nama} (${k.status})` }))} value={objekId || null} onValueChange={(v) => setObjekId(v ? String(v) : '')} placeholder="Pilih…" />
          </Field>
        ) : null}
        {j.objek === 'rps' ? (
          <Field label="ID RPS" required description="RPS draf dari detail mata kuliah di ruang kerja kurikulum.">
            <Input inputMode="numeric" value={objekId} onChange={(e) => setObjekId(e.target.value.replace(/\D/g, ''))} />
          </Field>
        ) : null}
        {j.tingkat === 'mk' && j.objek !== 'rps' ? (
          <Field label="Mata kuliah" required>
            <Select options={mkPilihan.map((m) => ({ value: m.kode_mk, label: `${m.kode_mk} · ${m.nama_mk}` }))} value={mk} onValueChange={(v) => setMk(v ? String(v) : null)} placeholder="Pilih…" />
          </Field>
        ) : null}
        {j.siklus === 'semester' ? (
          <Field label="Periode" required description="Semester yang dievaluasi.">
            <PilihTahunAkademik value={periode || null} onValueChange={(v) => setPeriode(v ?? '')} aria-label="Periode" />
          </Field>
        ) : (
          <Field label="Tahun" required description="Mis. 2025">
            <Input inputMode="numeric" value={periode} onChange={(e) => setPeriode(e.target.value.replace(/\D/g, '').slice(0, 4))} />
          </Field>
        )}
        {j.tahap.some((t) => t.peran.includes('tim_penyusun')) ? (
          <Field label="Tim penyusun" optional description="Username/NIDN dosen, pisahkan koma. Koordinator MK otomatis.">
            <Input value={tim} onChange={(e) => setTim(e.target.value)} />
          </Field>
        ) : null}
      </div>
    </Sheet>
  );
}

function PanelEvaluasi({ id, onOpenChange }: { id: number; onOpenChange: (o: boolean) => void }) {
  const d = useSiakadQuery<EvaluasiDetail>(['kurikulum-aturan', 'evaluasi', 'detail', id], q(`${BASIS}/evaluasi/${id}`), { staleTime: 0 });
  const aksi = useAksi();
  const [isian, setIsian] = React.useState<Record<string, string> | null>(null);
  const [catatan, setCatatan] = React.useState('');
  const [sk, setSk] = React.useState<{ sk_id: string | null; no_sk: string; tanggal_sk: string }>({ sk_id: null, no_sk: '', tanggal_sk: '' });
  const x = d.data;
  const wajibSk = !!x?.tahap_sekarang?.wajib_sk && x.status !== 'disahkan';
  const nilai = isian ?? x?.isian ?? {};
  const bolehIsi = !!x && x.boleh && x.tahap_sekarang?.aksi === 'isi' && x.status !== 'disahkan';
  const alur: TahapPemeriksa[] = (x?.alur ?? []).map((a, i) => ({ tahap: a.kode, urut: i + 1, judul: a.judul, unit: a.unit, peran: a.peran, status: (a.status === 'dikembalikan' ? 'ditolak' : a.status) as TahapPemeriksa['status'], diproses_oleh: a.oleh, waktu: a.waktu, catatan: a.catatan }));
  return (
    <Sheet open onOpenChange={onOpenChange} title={x ? `${x.nama_jenis}${x.kode_mk ? ` ${x.kode_mk}` : ''} · ${x.periode}` : 'Evaluasi'} description={x ? `PPEPP: ${x.ppepp ?? '-'} · ${STATUS_EVALUASI[x.status][0]}` : undefined} size="xl"
      footer={x && x.boleh && x.status !== 'disahkan' ? (
        <>
          {bolehIsi ? <Button variant="outline" onClick={() => void aksi('PUT', `${BASIS}/evaluasi/${id}/isian`, { isian: nilai }, 'Instrumen tersimpan.')}>Simpan isian</Button> : null}
          {x.tahap_ke > 0 ? <Button variant="destructive-soft" disabled={catatan.trim().length < 5} onClick={() => void aksi('POST', `${BASIS}/evaluasi/${id}/proses`, { keputusan: 'kembalikan', catatan }, 'Dikembalikan ke penyusun.')}>Kembalikan</Button> : null}
          <Button onClick={async () => { if (bolehIsi) await aksi('PUT', `${BASIS}/evaluasi/${id}/isian`, { isian: nilai }); await aksi('POST', `${BASIS}/evaluasi/${id}/proses`, { keputusan: 'lanjut', catatan, ...(wajibSk ? { sk_id: sk.sk_id, no_sk: sk.no_sk || null, tanggal_sk: sk.tanggal_sk || null } : {}) }, x.tahap_ke + 1 >= x.jumlah_tahap ? 'Disahkan.' : 'Diteruskan ke tahap berikutnya.'); setCatatan(''); }}>
            <Send /> {x.tahap_sekarang?.aksi === 'isi' ? 'Ajukan' : x.tahap_ke + 1 >= x.jumlah_tahap ? 'Sahkan' : 'Setujui & teruskan'}
          </Button>
        </>
      ) : undefined}>
      {!x ? <Skeleton style={{ height: 200 }} /> : (
        <div className="u-bkd-form">
          <AlurPemeriksa pemeriksa={alur} judul="Alur penilaian & pengesahan" />
          {x.versi_baru_id ? <Alert variant="success" title="Rekomendasi menjadi draf versi kurikulum baru">Draf versi aturan #{x.versi_baru_id} dibuat dari peninjauan ini; lanjutkan di Aturan kurikulum.</Alert> : null}
          <Card>
            <CardHeader title="Masukan otomatis" description="Ditarik dari asesmen & ketercapaian, EDOM, tracer study; sumber yang belum tersedia diisi manual." />
            <CardContent>
              <DescriptionList items={Object.entries(x.masukan).map(([k, m]) => ({ label: m.nama ?? k, value: <RingkasMasukan m={m} /> }))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Instrumen" />
            <CardContent>
              <div className="u-bkd-form">
                {(x.definisi?.instrumen ?? []).map((i) => (
                  <Field key={i.kode} label={i.nama} required={i.wajib}>
                    <Textarea rows={3} disabled={!bolehIsi} value={nilai[i.kode] ?? ''} onChange={(e) => setIsian({ ...nilai, [i.kode]: e.target.value })} />
                  </Field>
                ))}
              </div>
            </CardContent>
          </Card>
          {x.boleh && wajibSk ? (
            <Card>
              <CardHeader title="SK penetapan" description="Wajib di tahap ini: pilih SK dari registri SK, atau isi nomor SK." />
              <CardContent>
                <div className="u-bkd-form">
                  <PilihSK value={sk.sk_id} onValueChange={(v: string | null) => setSk({ ...sk, sk_id: v })} jenis="kurikulum" label="SK dari registri" />
                  <div className="u-bkd-grid-3">
                    <Field label="Nomor SK" optional><Input value={sk.no_sk} onChange={(e) => setSk({ ...sk, no_sk: e.target.value })} /></Field>
                    <Field label="Tanggal SK" optional><IsianTanggal value={sk.tanggal_sk} onValueChange={(v) => setSk({ ...sk, tanggal_sk: v })} /></Field>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
          {x.objek ? <Alert variant="neutral" title={`Objek: ${x.objek === 'kurikulum' ? 'kurikulum' : x.objek === 'rps' ? 'RPS' : 'mata kuliah'} #${x.objek_id ?? x.kode_mk ?? ''}`}>Disahkan di tahap terakhir: {x.objek === 'kurikulum' ? 'status kurikulum menjadi disahkan dengan SK.' : x.objek === 'rps' ? 'RPS disahkan dan menjadi bukti perangkat MK.' : 'usulan tercatat terverifikasi.'}</Alert> : null}
          {x.boleh && x.status !== 'disahkan' && x.tahap_sekarang?.aksi !== 'isi' ? (
            <Field label={`Catatan ${x.tahap_sekarang?.judul ?? ''}`} description="Wajib bila mengembalikan."><Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} /></Field>
          ) : null}
        </div>
      )}
    </Sheet>
  );
}

/** Radar ketercapaian CPL (persen mahasiswa mencapai ambang), SVG mengikuti tema (warna token). */
export function RadarCpl({ cpl, ukuran = 260 }: { cpl: { kode: string; nilai: number | null; ambang?: number | null }[]; ukuran?: number }) {
  const n = cpl.length;
  const r = ukuran / 2 - 30;
  const c = ukuran / 2;
  const titik = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + Math.cos(a) * r * (v / 100), c + Math.sin(a) * r * (v / 100)] as const;
  };
  const poli = (vs: number[]) => vs.map((v, i) => titik(i, v).join(',')).join(' ');
  return (
    <figure className="u-kur-radar" aria-label="Radar ketercapaian CPL">
      <svg viewBox={`0 0 ${ukuran} ${ukuran}`} width={ukuran} height={ukuran} role="img">
        {[25, 50, 75, 100].map((g) => <polygon key={g} points={poli(cpl.map(() => g))} className="u-kur-radar-grid" />)}
        <polygon points={poli(cpl.map((x) => x.nilai ?? 0))} className="u-kur-radar-isi" />
        {cpl.map((x, i) => { const [tx, ty] = titik(i, 118); return <text key={x.kode} x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" className="u-kur-radar-label">{x.kode}</text>; })}
      </svg>
      <figcaption>Persen mahasiswa mencapai ambang tiap CPL</figcaption>
    </figure>
  );
}

// ------------------------------------------------------------------ penanda asesmen & kelas dari RPS (LMS/CBT)
export interface PilihanPenanda {
  aturan: string | null;
  cpmk: { id: number; kode: string; deskripsi: string }[];
  sub_cpmk: { id: number; cpmk_id: number; kode: string; deskripsi: string }[];
  taksonomi: { kode: string; nama: string }[];
  bentuk: { kode: string; nama: string }[];
}

/** Penanda kurikulum untuk satu butir asesmen (soal bank/CBT, tugas/kuis LMS): CPMK, sub-CPMK, tingkat kognitif (taksonomi kerangka), bentuk asesmen. */
export function PenandaKurikulum({ entitas, entitasId, prodi, kodeMk, onSimpan, className }: { entitas: 'lms_bank_soal' | 'cbt_soal' | 'lms_tugas' | 'lms_kuis' | 'lms_kuis_soal'; entitasId: number; prodi: string; kodeMk: string; onSimpan?: () => void; className?: string }) {
  const pil = useSiakadQuery<PilihanPenanda>(['kurikulum-aturan', 'penanda-pilihan', prodi, kodeMk], q(`${BASIS}/asesmen/pilihan`, { prodi, kode_mk: kodeMk }));
  const ada = useSiakadQuery<{ tanda: { entitas_id: number; cpmk_id: number | null; sub_cpmk_id: number | null; kognitif: string | null; bentuk: string | null }[] }>(['kurikulum-aturan', 'penanda', entitas, entitasId], q(`${BASIS}/asesmen/tanda`, { entitas, ids: String(entitasId) }));
  const aksi = useAksi();
  const awal = ada.data?.tanda[0];
  const [v, setV] = React.useState<{ cpmk_id: string | null; sub_cpmk_id: string | null; kognitif: string | null; bentuk: string | null } | null>(null);
  const x = v ?? { cpmk_id: awal?.cpmk_id ? String(awal.cpmk_id) : null, sub_cpmk_id: awal?.sub_cpmk_id ? String(awal.sub_cpmk_id) : null, kognitif: awal?.kognitif ?? null, bentuk: awal?.bentuk ?? null };
  if (!pil.data) return pil.error ? <Alert variant="danger">{pesanGalat(pil.error)}</Alert> : <Skeleton style={{ height: 80 }} />;
  if (!pil.data.cpmk.length) return <p className="u-bkd-keterangan">MK ini belum punya CPMK di kurikulum OBE; penanda belum tersedia.</p>;
  return (
    <div className={cn('u-kur-penanda', className)}>
      <div className="u-bkd-grid-3">
        <Field label="CPMK"><Select options={pil.data.cpmk.map((c) => ({ value: String(c.id), label: `${c.kode} · ${c.deskripsi}` }))} value={x.cpmk_id} onValueChange={(c) => setV({ ...x, cpmk_id: c ? String(c) : null, sub_cpmk_id: null })} placeholder="Pilih…" /></Field>
        <Field label="Sub-CPMK" optional><Select options={pil.data.sub_cpmk.filter((s) => String(s.cpmk_id) === x.cpmk_id).map((s) => ({ value: String(s.id), label: `${s.kode} · ${s.deskripsi}` }))} value={x.sub_cpmk_id} onValueChange={(c) => setV({ ...x, sub_cpmk_id: c ? String(c) : null })} placeholder="Pilih…" /></Field>
        <Field label="Tingkat kognitif" optional><Select options={pil.data.taksonomi.map((t) => ({ value: t.kode, label: `${t.kode} ${t.nama}` }))} value={x.kognitif} onValueChange={(c) => setV({ ...x, kognitif: c ? String(c) : null })} placeholder="Pilih…" /></Field>
        <Field label="Bentuk asesmen" optional><Select options={pil.data.bentuk.map((t) => ({ value: t.kode, label: t.nama }))} value={x.bentuk} onValueChange={(c) => setV({ ...x, bentuk: c ? String(c) : null })} placeholder="Pilih…" /></Field>
      </div>
      <Button size="sm" disabled={!x.cpmk_id} onClick={async () => { await aksi('POST', `${BASIS}/asesmen/tanda`, { entitas, entitas_id: entitasId, cpmk_id: Number(x.cpmk_id), sub_cpmk_id: x.sub_cpmk_id ? Number(x.sub_cpmk_id) : null, kognitif: x.kognitif, bentuk: x.bentuk }, 'Penanda kurikulum tersimpan.'); onSimpan?.(); }}>Simpan penanda</Button>
    </div>
  );
}

/** Kisi-kisi ujian CBT dibanding rencana evaluasi RPS (proporsi soal per CPMK, sebaran kognitif, peringatan). */
export function KisiKisiCbt({ ujianId, className }: { ujianId: number; className?: string }) {
  const d = useSiakadQuery<{ berlaku: boolean; komponen: string | null; jumlah_soal: number; soal_tanpa_tanda: number; cpmk: { kode: string; target_persen: number | null; poin_persen: number; selisih: number | null }[]; kognitif: Record<string, number>; pesan: string[]; sesuai: boolean }>(['kurikulum-aturan', 'kisi', ujianId], q(`${BASIS}/asesmen/cbt/${ujianId}/kisi`), { staleTime: 0 });
  if (!d.data) return d.error ? <Alert variant="danger">{pesanGalat(d.error)}</Alert> : <Skeleton style={{ height: 120 }} />;
  const x = d.data;
  return (
    <div className={cn('u-bkd-form', className)}>
      {x.pesan.length ? <Alert variant="warning" title="Kisi-kisi belum sesuai RPS">{x.pesan.join(' ')}</Alert> : <Alert variant="success">Proporsi soal sesuai rencana asesmen RPS.</Alert>}
      <DataTable<(typeof x.cpmk)[number]>
        columns={[
          { key: 'kode', header: 'CPMK', mobile: 'title' },
          { key: 'target_persen', header: `Rencana RPS (${x.komponen ?? '-'})`, label: 'Rencana RPS', align: 'end', value: (c) => c.target_persen, cell: (c) => (c.target_persen != null ? `${angka(c.target_persen)}%` : '-') },
          { key: 'poin_persen', header: 'Poin soal', align: 'end', value: (c) => c.poin_persen, cell: (c) => `${angka(c.poin_persen)}%` },
          { key: 'selisih', header: 'Selisih', align: 'end', mobile: 'badge', value: (c) => c.selisih, cell: (c) => (c.selisih != null ? angka(c.selisih) : '-') },
        ]}
        rows={x.cpmk}
        rowKey={(c) => c.kode}
        pagination={false} columnToggle={false} densityToggle={false} defaultDensity="compact"
      />
      <p className="u-bkd-keterangan">{x.jumlah_soal} soal · {x.soal_tanpa_tanda} belum bertanda · kognitif: {Object.entries(x.kognitif).map(([k, n]) => `${k} ${n}`).join(', ') || '-'}</p>
    </div>
  );
}

/** "Siapkan kelas dari RPS": pratinjau lalu bangkitkan topik per pertemuan dan tugas bertanda CPMK di kelas LMS. */
export function SiapkanKelasDariRps({ kelasId, onSelesai }: { kelasId: number; onSelesai?: () => void }) {
  const s0 = useSiakad();
  const aksi = useAksi();
  const [buka, setBuka] = React.useState(false);
  const [pra, setPra] = React.useState<{ rps: { versi: number; status: string }; topik_baru: { pertemuan_ke: number; judul: string; deskripsi: string }[]; tugas_baru: { judul: string; cpmk_id: number | null }[]; dilewati_pertemuan: number[] } | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const muat = async () => {
    setBuka(true);
    setGalat(null);
    try {
      setPra((await s0.request<NonNullable<typeof pra>>({ method: 'POST', path: `${BASIS}/lms/kelas/${kelasId}/dari-rps`, body: {} })).data);
    } catch (e) {
      setGalat(pesanGalat(e));
    }
  };
  return (
    <>
      <Button variant="outline" onClick={() => void muat()}>Siapkan kelas dari RPS</Button>
      {buka ? (
        <Sheet open onOpenChange={setBuka} title="Siapkan kelas dari RPS" description="Topik per pertemuan dan tugas dari rencana evaluasi RPS (bertanda CPMK). Yang sudah ada dilewati." size="lg"
          footer={<><Button variant="ghost" onClick={() => setBuka(false)}>Batal</Button><Button disabled={!pra || (!pra.topik_baru.length && !pra.tugas_baru.length)} onClick={async () => { await aksi('POST', `${BASIS}/lms/kelas/${kelasId}/dari-rps`, { jalankan: true }, 'Kelas disiapkan dari RPS.'); setBuka(false); onSelesai?.(); }}>Bangkitkan</Button></>}>
          {galat ? <Alert variant="danger">{galat}</Alert> : !pra ? <Skeleton style={{ height: 160 }} /> : (
            <div className="u-bkd-form">
              <p className="u-bkd-keterangan">RPS versi {pra.rps.versi} ({pra.rps.status}) · {pra.topik_baru.length} topik baru · {pra.tugas_baru.length} tugas baru · {pra.dilewati_pertemuan.length} pertemuan sudah ada</p>
              <ol className="u-kur-tahap" data-aktif="">{pra.topik_baru.map((t) => <li key={t.pertemuan_ke} data-aktif=""><strong>{t.judul}</strong><small>{t.deskripsi}</small></li>)}</ol>
              {pra.tugas_baru.length ? <p className="u-bkd-keterangan">Tugas: {pra.tugas_baru.map((t) => t.judul).join(', ')}</p> : null}
            </div>
          )}
        </Sheet>
      ) : null}
    </>
  );
}

// ------------------------------------------------------------------ RPS menurut templat kerangka
interface PeriksaRps {
  rps: { id: number; versi: number; status: string; kode_prodi: string; kode_mk: string };
  kerangka: string | null;
  templat: DefinisiKerangka['rps'] | null;
  fakta: Record<string, number>;
  hasil: { kode: string; terpenuhi: boolean; nilai: number | null; pesan: string }[];
  lolos: boolean;
  alur_pengesahan: { jenis: string; tahap: string[]; evaluasi_id: number | null } | null;
}

/** RPS menurut templat kerangka versi MK: bagian wajib, kolom pertemuan, validasi berparameter, cetak, dan ajukan pengesahan berjenjang. */
export function RpsMenurutKerangka({ rpsId, onCetak, className }: { rpsId: number; onCetak?: () => void; className?: string }) {
  const d = useSiakadQuery<PeriksaRps>(['kurikulum-aturan', 'periksa-rps', rpsId], q(`${BASIS}/rps/${rpsId}/periksa`), { staleTime: 0 });
  const aksi = useAksi();
  const [evalId, setEvalId] = React.useState<number | null>(null);
  if (!d.data) return d.error ? <Alert variant="danger">{pesanGalat(d.error)}</Alert> : <Skeleton style={{ height: 160 }} />;
  const x = d.data;
  const t = x.templat;
  return (
    <div className={cn('u-bkd-form', className)}>
      <Alert variant={x.lolos ? 'success' : 'warning'} title={x.lolos ? 'RPS memenuhi templat kerangka' : 'RPS belum memenuhi templat kerangka'}>
        Kerangka {x.kerangka ?? '-'} · {x.hasil.filter((h) => h.terpenuhi).length}/{x.hasil.length} validasi terpenuhi.
      </Alert>
      <ul className="u-kur-perangkat-ringkas">
        {x.hasil.map((h) => <li key={h.kode}><strong>{h.terpenuhi ? '✓' : '✗'} {h.pesan}</strong><small>nilai sekarang: {h.nilai ?? '-'}</small></li>)}
      </ul>
      {t ? (
        <div className="u-kur-ringkas">
          <Card><CardHeader title="Bagian RPS (templat)" /><CardContent><ol className="u-kur-tahap">{t.bagian.filter((b) => b.aktif).map((b) => <li key={b.kode} data-aktif=""><strong>{b.nama}</strong><small>{b.wajib ? 'wajib' : 'opsional'}</small></li>)}</ol></CardContent></Card>
          <Card><CardHeader title="Kolom rencana pertemuan" description={`Minimal ${t.pertemuan_min ?? '-'} pertemuan · ${t.menit_per_sks ?? '-'} menit per SKS per minggu`} /><CardContent><p className="u-bkd-keterangan">{t.kolom_pertemuan.map((k) => k.nama).join(' · ')}</p></CardContent></Card>
        </div>
      ) : null}
      <div className="u-bkd-aksi">
        {onCetak ? <Button variant="outline" onClick={onCetak}>Cetak RPS (PDF)</Button> : null}
        {x.alur_pengesahan && x.rps.status === 'draf' && !x.alur_pengesahan.evaluasi_id ? (
          <Button disabled={!x.lolos} onClick={async () => setEvalId((await aksi<EvaluasiDetail>('POST', `${BASIS}/evaluasi`, { jenis: x.alur_pengesahan!.jenis, kode_prodi: x.rps.kode_prodi, periode: String(new Date().getFullYear()), objek_id: x.rps.id }, 'Pengesahan RPS diajukan.')).id)}>
            <Send /> Ajukan pengesahan ({x.alur_pengesahan.tahap.join(' → ')})
          </Button>
        ) : null}
        {x.alur_pengesahan?.evaluasi_id || evalId ? <Button variant="ghost" onClick={() => setEvalId(x.alur_pengesahan?.evaluasi_id ?? evalId)}>Lihat alur pengesahan</Button> : null}
      </div>
      {evalId ? <PanelEvaluasi id={evalId} onOpenChange={(o) => !o && setEvalId(null)} /> : null}
    </div>
  );
}
