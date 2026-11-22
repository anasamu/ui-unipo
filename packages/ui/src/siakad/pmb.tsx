'use client';
import * as React from 'react';
import { Pilihan } from '../components/formulir';
import { Check, GraduationCap, MapPin, Medal, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/cn';
import { Alert, Empty, Table, TableContainer } from '../components/display';
import { DatePicker, parseISODate, toISODate } from '../components/calendar';
import { Field, Input, RadioGroup, Textarea } from '../components/forms';
import { Combobox, OptionContent, Select } from '../components/select';
import { Badge, Button, Skeleton } from '../components/actions';
import { Dialog } from '../components/overlays';
import { FormGrid, Wizard, WizardReview, type ReviewSection, type WizardStep } from '../components/wizard';
import { formatDate } from '../lib/format';
import { CariPerguruanTinggi, CariSekolah } from './cari';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { hurufJudul, labelJenjang } from './pmb-publik';
import { Tekan } from '../components/tekan';

// ================================================================ Tipe formulir (PATCH /v1/pmb/saya/pendaftaran/{id})
type Isian = Record<string, string | number | null | undefined>;
export interface FormulirPmb {
  pribadi?: Isian;
  alamat?: Isian;
  asal_sekolah?: Isian;
  orang_tua?: { ayah?: Isian; ibu?: Isian; wali?: Isian };
  pilihan?: string[];
  sumber_informasi?: string | null;
  kode_referal?: string | null;
}
export type Opsi = { kode: string; nama: string };
/** Referensi kode dari `GET /v1/pmb/info/referensi-formulir` (tabel r_kode SIAKAD). */
export type ReferensiFormulir = Partial<
  Record<'jenis_kelamin' | 'agama' | 'warga_negara' | 'status_sipil' | 'hidup' | 'status_masuk' | 'asal_jenjang' | 'pendidikan' | 'pekerjaan' | 'penghasilan' | 'sumber_informasi', Opsi[]>
>;

/** Ambil referensi kode formulir (publik, di-cache 1 jam). */
export function useReferensiFormulir() {
  return useSiakadQuery<ReferensiFormulir>(['pmb-referensi-formulir'], (s, signal) => s.pmb.getInfoReferensiFormulir({}, { signal }) as never, { staleTime: 3_600_000 });
}

const opsi = (xs?: Opsi[]) => (xs ?? []).map((o) => ({ value: o.kode, label: o.nama }));
const nama = (xs: Opsi[] | undefined, kode: unknown) => (kode == null || kode === '' ? null : (xs?.find((o) => o.kode === String(kode))?.nama ?? String(kode)));

// ================================================================ Bagian isian (dipakai wizard PMB dan biodata)
interface BagianProps {
  value: Isian;
  onChange: (patch: Isian) => void;
  ref_: ReferensiFormulir;
  errors?: Record<string, string>;
}
const teks = (v: unknown) => (v == null ? '' : String(v));

export function IsianDataDiri({ value: v, onChange, ref_, errors = {} }: BagianProps) {
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ [k]: e.target.value });
  return (
    <FormGrid>
      <Field label="Nama lengkap" required description="Sesuai ijazah. Maksimal 30 karakter (batas kolom SIAKAD)." error={errors.nama} style={{ gridColumn: '1 / -1' }}>
        <Input value={teks(v.nama)} onChange={set('nama')} maxLength={30} autoComplete="name" />
      </Field>
      <Field label="NIK" required error={errors.no_identitas} description="16 digit, sesuai KTP/KK.">
        <Input value={teks(v.no_identitas)} onChange={(e) => onChange({ no_identitas: e.target.value.replace(/\D/g, '').slice(0, 16) })} inputMode="numeric" />
      </Field>
      <Field label="NISN" optional error={errors.nisn}>
        <Input value={teks(v.nisn)} onChange={(e) => onChange({ nisn: e.target.value.replace(/\D/g, '').slice(0, 10) })} inputMode="numeric" />
      </Field>
      <Field label="Jenis kelamin" required error={errors.jenis_kelamin} style={{ gridColumn: '1 / -1' }}>
        <RadioGroup orientation="horizontal" options={opsi(ref_.jenis_kelamin)} value={teks(v.jenis_kelamin) || null} onValueChange={(x) => onChange({ jenis_kelamin: x })} />
      </Field>
      <Field label="Tempat lahir" required error={errors.tempat_lahir}>
        <Input value={teks(v.tempat_lahir)} onChange={set('tempat_lahir')} />
      </Field>
      <Field label="Tanggal lahir" required error={errors.tanggal_lahir}>
        <DatePicker value={v.tanggal_lahir ? parseISODate(String(v.tanggal_lahir)) : null} onValueChange={(d) => onChange({ tanggal_lahir: d ? toISODate(d) : null })} max={new Date()} />
      </Field>
      <Field label="Agama" required error={errors.agama}>
        <Pilihan options={opsi(ref_.agama)} value={teks(v.agama) || null} onValueChange={(x) => onChange({ agama: x })} />
      </Field>
      <Field label="Kewarganegaraan" error={errors.warga_negara}>
        <Pilihan options={opsi(ref_.warga_negara)} value={teks(v.warga_negara) || null} onValueChange={(x) => onChange({ warga_negara: x })} />
      </Field>
      <Field label="Status sipil" optional error={errors.status_sipil}>
        <Pilihan options={opsi(ref_.status_sipil)} value={teks(v.status_sipil) || null} onValueChange={(x) => onChange({ status_sipil: x })} />
      </Field>
      <Field label="Nomor HP (WhatsApp)" required error={errors.hp} description="Untuk informasi seleksi dan pembayaran.">
        <Input value={teks(v.hp)} onChange={(e) => onChange({ hp: e.target.value.replace(/[^\d+]/g, '') })} inputMode="tel" autoComplete="tel" placeholder="08xx" />
      </Field>
      <Field label="Email" optional error={errors.email}>
        <Input type="email" value={teks(v.email)} onChange={set('email')} autoComplete="email" />
      </Field>
    </FormGrid>
  );
}

/** Kecamatan PDDikti (r_wilayah level 3) dari GET /v1/pmb/info/wilayah. */
export interface WilayahPmb {
  kode: string;
  nama: string;
  kabupaten?: string;
  provinsi?: string;
}
export const labelWilayah = (w: WilayahPmb) => [w.nama, w.kabupaten].filter(Boolean).join(', ');

/**
 * Pemilih kecamatan formulir PMB (audit PMB-26: dulu teks bebas). Menyimpan KODE kecamatan PDDikti, sama dengan
 * m_mahasiswa.kecamatan di Kelengkapan data, sehingga terbawa ke data mahasiswa dan Feeder setelah daftar ulang.
 * Nilai lama berupa teks (draf sebelum pemilih ini) tampil sebagai label dan bisa diganti.
 */
export function CariKecamatanPmb({ kode, label, onPilih, disabled }: { kode?: string; label?: string; onPilih: (w: WilayahPmb | null) => void; disabled?: boolean }) {
  const siakad = useSiakad();
  const nilai = React.useMemo<WilayahPmb | null>(() => (kode ? { kode, nama: label || kode } : null), [kode, label]);
  const muat = React.useCallback(
    async (q: string, signal: AbortSignal) => (await siakad.request<WilayahPmb[]>({ method: 'GET', path: '/v1/pmb/info/wilayah', query: { q }, public: true }, { signal })).data,
    [siakad],
  );
  return (
    <Combobox<WilayahPmb>
      value={nilai}
      onValueChange={onPilih}
      loadItems={muat}
      minQueryLength={3}
      disabled={disabled}
      placeholder="Cari kecamatan, mis. Marisa"
      hintText="Ketik minimal 3 huruf nama kecamatan atau kabupaten."
      emptyText="Kecamatan tidak ditemukan. Coba nama kabupaten/kota."
      icon={<MapPin />}
      itemKey={(w) => w.kode}
      itemToString={labelWilayah}
      renderItem={(w) => <OptionContent title={w.nama} meta={[w.kabupaten, w.provinsi].filter(Boolean).join(' · ')} />}
    />
  );
}

export function IsianAlamat({ value: v, onChange, errors = {}, pilihKecamatan = false }: Omit<BagianProps, 'ref_'> & { ref_?: ReferensiFormulir; /** Kecamatan lewat pemilih wilayah PMB (kode PDDikti) alih-alih teks. */ pilihKecamatan?: boolean }) {
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ [k]: e.target.value });
  return (
    <FormGrid columns={3}>
      <Field label="Alamat" required error={errors.alamat} description="Nama jalan, nomor rumah, atau patokan." style={{ gridColumn: '1 / -1' }}>
        <Textarea rows={2} value={teks(v.alamat)} onChange={set('alamat')} autoComplete="street-address" />
      </Field>
      <Field label="RT" optional>
        <Input value={teks(v.rt)} onChange={set('rt')} inputMode="numeric" maxLength={3} />
      </Field>
      <Field label="RW" optional>
        <Input value={teks(v.rw)} onChange={set('rw')} inputMode="numeric" maxLength={3} />
      </Field>
      <Field label="Kode pos" optional>
        <Input value={teks(v.kode_pos)} onChange={set('kode_pos')} inputMode="numeric" maxLength={5} autoComplete="postal-code" />
      </Field>
      <Field label="Dusun/lingkungan" optional>
        <Input value={teks(v.dusun)} onChange={set('dusun')} />
      </Field>
      <Field label="Desa/kelurahan" required error={errors.desa}>
        <Input value={teks(v.desa)} onChange={set('desa')} />
      </Field>
      {pilihKecamatan ? (
        <Field label="Kecamatan" required error={errors.kecamatan} description="Ketik nama kecamatan atau kabupaten, lalu pilih." style={{ gridColumn: '1 / -1' }}>
          <CariKecamatanPmb
            kode={teks(v.kecamatan)}
            label={teks(v.kecamatan_nama) || teks(v.kecamatan)}
            onPilih={(w) => onChange({ kecamatan: w?.kode ?? '', kecamatan_nama: w ? labelWilayah(w) : '' })}
          />
        </Field>
      ) : (
        <Field label="Kecamatan" required error={errors.kecamatan}>
          <Input value={teks(v.kecamatan)} onChange={set('kecamatan')} />
        </Field>
      )}
    </FormGrid>
  );
}

export function IsianAsalSekolah({ value: v, onChange, ref_, errors = {} }: BagianProps) {
  const pindahan = ['P', 'pindahan', '2'].includes(teks(v.status_masuk));
  const tahun = new Date().getFullYear();
  return (
    <FormGrid>
      <Field label="Status masuk" required style={{ gridColumn: '1 / -1' }}>
        <RadioGroup
          variant="card"
          options={(ref_.status_masuk?.length
            ? ref_.status_masuk
            : [
                { kode: 'B', nama: 'Mahasiswa baru' },
                { kode: 'P', nama: 'Pindahan' },
              ]
          ).map((o) => ({
            value: o.kode,
            label: o.nama,
            description: ['P', 'pindahan', '2'].includes(o.kode) ? 'Dari perguruan tinggi lain, dengan pengakuan SKS' : 'Lulusan SMA/SMK/MA atau sederajat',
          }))}
          value={teks(v.status_masuk) || null}
          onValueChange={(x) => onChange({ status_masuk: x })}
        />
      </Field>
      {!pindahan ? (
        <>
          <Field label="Asal sekolah" required error={errors.nama_sekolah} description="Cari nama atau NPSN. Tidak ketemu? Ketik namanya lalu pilih “Pakai …”." style={{ gridColumn: '1 / -1' }}>
            <CariSekolah
              value={v.nama_sekolah ? { kode: teks(v.kode_sekolah), nama: teks(v.nama_sekolah) } : null}
              onValueChange={(s) => onChange({ kode_sekolah: s?.kode || null, nama_sekolah: s?.nama ?? null })}
            />
          </Field>
          <Field label="Tahun lulus" required error={errors.tahun_lulus}>
            <Select
              options={Array.from({ length: 8 }, (_, i) => ({ value: String(tahun - i + 1), label: String(tahun - i + 1) }))}
              value={v.tahun_lulus ? String(v.tahun_lulus) : null}
              onValueChange={(x) => onChange({ tahun_lulus: x ? Number(x) : null })}
            />
          </Field>
          <Field label="NIS" optional error={errors.nis_asal}>
            <Input value={teks(v.nis_asal)} onChange={(e) => onChange({ nis_asal: e.target.value })} />
          </Field>
          <Field label="Nilai rata-rata ijazah" optional>
            <Input value={teks(v.nilai_un)} onChange={(e) => onChange({ nilai_un: e.target.value.replace(/[^\d.,]/g, '') })} inputMode="decimal" placeholder="mis. 85,40" />
          </Field>
        </>
      ) : (
        <>
          <Field label="Perguruan tinggi asal" required error={errors.nama_asal_pt} style={{ gridColumn: '1 / -1' }}>
            <CariPerguruanTinggi
              value={v.nama_asal_pt ? { kode: teks(v.kode_asal_pt), nama: teks(v.nama_asal_pt) } : null}
              onValueChange={(p) => onChange({ kode_asal_pt: p?.kode || null, nama_asal_pt: p?.nama ?? null })}
            />
          </Field>
          <Field label="Jenjang asal">
            <Pilihan options={opsi(ref_.asal_jenjang)} value={teks(v.asal_jenjang) || null} onValueChange={(x) => onChange({ asal_jenjang: x })} />
          </Field>
          <Field label="Program studi asal" required error={errors.nama_asal_prodi}>
            <Input value={teks(v.nama_asal_prodi)} onChange={(e) => onChange({ nama_asal_prodi: e.target.value })} />
          </Field>
          <Field label="NIM asal" optional>
            <Input value={teks(v.nim_asal)} onChange={(e) => onChange({ nim_asal: e.target.value })} />
          </Field>
          <Field label="SKS yang sudah ditempuh" optional description="Diakui setelah verifikasi prodi.">
            <Input value={teks(v.sks_diakui)} onChange={(e) => onChange({ sks_diakui: e.target.value.replace(/\D/g, '') ? Number(e.target.value.replace(/\D/g, '')) : null })} inputMode="numeric" />
          </Field>
        </>
      )}
    </FormGrid>
  );
}

function IsianSatuOrtu({ label, value: v, onChange, ref_, wali }: BagianProps & { label: string; wali?: boolean }) {
  return (
    <>
      <p className="u-form-section-title">{label}</p>
      <Field label={`Nama ${label.toLowerCase().replace(' (opsional)', '')}`} required={!wali} style={{ gridColumn: '1 / -1' }}>
        <Input value={teks(v.nama)} onChange={(e) => onChange({ nama: e.target.value })} maxLength={50} />
      </Field>
      <Field label="Tanggal lahir" optional>
        <DatePicker value={v.tanggal_lahir ? parseISODate(String(v.tanggal_lahir)) : null} onValueChange={(d) => onChange({ tanggal_lahir: d ? toISODate(d) : null })} max={new Date()} />
      </Field>
      <Field label="Agama" optional>
        <Pilihan options={opsi(ref_.agama)} value={teks(v.agama) || null} onValueChange={(x) => onChange({ agama: x })} />
      </Field>
      <Field label="Pendidikan terakhir">
        <Pilihan options={opsi(ref_.pendidikan)} value={teks(v.pendidikan) || null} onValueChange={(x) => onChange({ pendidikan: x })} />
      </Field>
      <Field label="Pekerjaan">
        <Pilihan options={opsi(ref_.pekerjaan)} value={teks(v.pekerjaan) || null} onValueChange={(x) => onChange({ pekerjaan: x })} />
      </Field>
      <Field label="Penghasilan per bulan">
        <Pilihan options={opsi(ref_.penghasilan)} value={teks(v.penghasilan) || null} onValueChange={(x) => onChange({ penghasilan: x })} />
      </Field>
      {!wali && (
        <Field label="Status" optional>
          <Pilihan options={opsi(ref_.hidup)} value={teks(v.hidup) || null} onValueChange={(x) => onChange({ hidup: x })} />
        </Field>
      )}
      <Field label="Nomor HP" optional>
        <Input value={teks(v.hp)} onChange={(e) => onChange({ hp: e.target.value.replace(/[^\d+]/g, '') })} inputMode="tel" />
      </Field>
      <Field label="Alamat" optional>
        <Input value={teks(v.alamat)} onChange={(e) => onChange({ alamat: e.target.value })} maxLength={50} />
      </Field>
      <Field label="Kota / kabupaten" optional>
        <Input value={teks(v.kota)} onChange={(e) => onChange({ kota: e.target.value })} maxLength={20} />
      </Field>
      <Field label="Provinsi" optional>
        <Input value={teks(v.propinsi)} onChange={(e) => onChange({ propinsi: e.target.value })} maxLength={20} />
      </Field>
    </>
  );
}

/** Data ayah dan ibu, opsional wali (`wali`) bila tidak tinggal bersama orang tua. */
export function IsianOrangTua({
  value,
  onChange,
  ref_,
  wali,
}: {
  value: NonNullable<FormulirPmb['orang_tua']>;
  onChange: (v: NonNullable<FormulirPmb['orang_tua']>) => void;
  ref_: ReferensiFormulir;
  wali?: boolean;
}) {
  const hub = wali ? (['ayah', 'ibu', 'wali'] as const) : (['ayah', 'ibu'] as const);
  return (
    <FormGrid>
      {hub.map((h) => (
        <IsianSatuOrtu
          key={h}
          wali={h === 'wali'}
          label={h === 'ayah' ? 'Ayah' : h === 'ibu' ? 'Ibu' : 'Wali (opsional)'}
          value={value[h] ?? {}}
          ref_={ref_}
          onChange={(p) => onChange({ ...value, [h]: { ...(value[h] ?? {}), ...p } })}
        />
      ))}
    </FormGrid>
  );
}

// ================================================================ Pilihan prodi
export interface ProdiGelombang {
  kode_prodi: string;
  nama_prodi: string;
  jenjang?: string | null;
  kode_fakultas?: string | null;
  /** Nama fakultas (SIAKAD terbaru); bila kosong hanya jenjang yang ditampilkan. */
  nama_fakultas?: string | null;
  kuota?: number | null;
  jumlah_peminat?: number | null;
}

/** "C" + "ILMU HUKUM" -> "S1 Ilmu Hukum". */
export const namaProdiPmb = (p: { jenjang?: string | null; nama_prodi?: string | null; kode_prodi?: string }) =>
  [p.jenjang ? labelJenjang(p.jenjang) : null, hurufJudul(p.nama_prodi || p.kode_prodi || '')].filter(Boolean).join(' ');

/** Pilih program studi sesuai urutan prioritas (pilihan 1, 2, …) dengan kuota dan jumlah peminat. */
export function PilihanProdi({ prodi, value, onChange, maks = 2 }: { prodi: ProdiGelombang[]; value: string[]; onChange: (v: string[]) => void; maks?: number }) {
  const toggle = (k: string) => (value.includes(k) ? onChange(value.filter((x) => x !== k)) : value.length < maks ? onChange([...value, k]) : onChange([...value.slice(0, maks - 1), k]));
  return (
    <div className="u-prodi-pick">
      <p className="u-prodi-pick-hint">
        Pilih hingga <b>{maks}</b> program studi. Urutan klik menjadi urutan prioritas.
      </p>
      <ul>
        {prodi.map((p) => {
          const i = value.indexOf(p.kode_prodi);
          const rasio = p.kuota ? (p.jumlah_peminat ?? 0) / p.kuota : 0;
          return (
            <li key={p.kode_prodi}>
              <Tekan className="u-prodi-opt" terpilih={i >= 0} onClick={() => toggle(p.kode_prodi)}>
                <span className="u-prodi-rank" aria-hidden>
                  {i >= 0 ? i + 1 : <GraduationCap />}
                </span>
                <span className="u-prodi-text">
                  <span className="u-prodi-name">{namaProdiPmb(p)}</span>
                  {p.nama_fakultas && (
                    <span className="u-prodi-fak">{hurufJudul(p.nama_fakultas)}</span>
                  )}
                  <span className="u-prodi-meta">{[p.kuota ? `Kuota ${p.kuota}` : null, p.jumlah_peminat != null ? `${p.jumlah_peminat} peminat` : null].filter(Boolean).join(' · ')}</span>
                </span>
                {p.kuota ? (
                  <span className="u-prodi-meter" data-level={rasio > 1.5 ? 'tinggi' : rasio > 0.8 ? 'sedang' : 'rendah'} title="Perbandingan peminat dan kuota">
                    {rasio > 1.5 ? 'Persaingan tinggi' : rasio > 0.8 ? 'Sedang' : 'Peluang besar'}
                  </span>
                ) : null}
                {i >= 0 && <Check className="u-prodi-check" aria-hidden />}
              </Tekan>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ================================================================ Wizard pendaftaran PMB
export interface WizardPendaftaranPmbProps {
  /** UUID pendaftaran (dari `POST /v1/pmb/saya/pendaftaran`). */
  id: string;
  /** Dipanggil setelah pendaftaran diajukan. */
  onDiajukan?: (hasil: { no_pmb?: string | null; status?: string }) => void;
  /** Kontak panitia di bawah daftar langkah. */
  kontak?: React.ReactNode;
  /** Langkah aktif menurut id (prodi, pribadi, alamat, asal, ortu, prestasi, rapor, tinjau), mis. dari `?langkah=`. */
  langkah?: string | null;
  onLangkahChange?: (id: string) => void;
  /** Kode referal bawaan (mis. dari tautan ?ref=) bila formulir belum punya. */
  kodeReferal?: string | null;
  /** Kunci formulir (mis. email belum diverifikasi) dengan pesan ini. */
  kunci?: React.ReactNode;
  className?: string;
}

interface PrestasiPmb {
  id: number;
  nama: string;
  bidang: string | null;
  tingkat: string;
  peringkat: string | null;
  tahun: number | null;
  penyelenggara: string | null;
  berkas_id: number | null;
}
interface Pendaftaran {
  id: string;
  no_pmb: string | null;
  status: string;
  catatan_verifikasi?: string | null;
  sumber_informasi?: string | null;
  gelombang: { id: number; nama: string; jalur?: string | null };
  formulir: FormulirPmb;
  pilihan: Array<{ urut: number; kode_prodi: string; nama_prodi?: string | null }>;
  kelengkapan: Record<string, string> | [];
  prestasi?: PrestasiPmb[];
  rapor?: Array<{ semester: number; mapel: string; nilai: number }>;
  berkas?: Array<{ id: number; jenis: string; nama_asli: string }>;
}
const judulKata = (x?: string | null) => (x ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Daftar prestasi pendaftar + tambah/hapus lewat `pmb.postSayaPendaftaranByIdPrestasi`. */
export function IsianPrestasiPmb({
  id,
  prestasi,
  sertifikat = [],
  kunci,
  onBerubah,
}: {
  id: string;
  prestasi: PrestasiPmb[];
  sertifikat?: Array<{ id: number; nama_asli: string }>;
  kunci?: boolean;
  onBerubah: () => void;
}) {
  const siakad = useSiakad();
  const kosong = { nama: '', bidang: 'akademik', tingkat: 'kabupaten', peringkat: '', tahun: '', penyelenggara: '', berkas_id: '' };
  const [buka, setBuka] = React.useState(false);
  const [f, setF] = React.useState(kosong);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [proses, setProses] = React.useState(false);
  const tambah = async () => {
    setProses(true);
    setGalat(null);
    try {
      await siakad.pmb.postSayaPendaftaranByIdPrestasi(id, {
        nama: f.nama,
        bidang: f.bidang,
        tingkat: f.tingkat,
        peringkat: f.peringkat || undefined,
        tahun: f.tahun ? Number(f.tahun) : undefined,
        penyelenggara: f.penyelenggara || undefined,
        berkas_id: f.berkas_id ? Number(f.berkas_id) : undefined,
      } as never);
      setBuka(false);
      setF(kosong);
      onBerubah();
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setProses(false);
    }
  };
  const hapus = async (pid: number) => {
    try {
      await siakad.pmb.deleteSayaPendaftaranByIdPrestasiByPrestasi(id, pid);
      onBerubah();
    } catch (e) {
      setGalat(pesanGalat(e));
    }
  };
  const BIDANG = ['akademik', 'olahraga', 'seni', 'keagamaan', 'organisasi', 'lainnya'];
  const TINGKAT = ['sekolah', 'kabupaten', 'provinsi', 'nasional', 'internasional'];
  return (
    <div className="u-pmb-prestasi">
      {galat && !buka && <Alert variant="danger">{galat}</Alert>}
      {prestasi.length === 0 ? (
        <Empty icon={<Medal aria-hidden />} title="Belum ada prestasi" description="Tambahkan prestasi akademik atau non-akademik yang pernah diraih." bordered />
      ) : (
        <ul className="u-pmb-prestasi-list">
          {prestasi.map((x) => (
            <li key={x.id}>
              <Medal aria-hidden />
              <span>
                <strong>{x.nama}</strong>
                <small>{[x.peringkat, judulKata(x.bidang), x.penyelenggara, x.tahun].filter(Boolean).join(' · ')}</small>
              </span>
              <Badge variant="secondary">{judulKata(x.tingkat)}</Badge>
              {!kunci && (
                <Button size="sm" variant="ghost" iconOnly aria-label={`Hapus ${x.nama}`} onClick={() => void hapus(x.id)}>
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!kunci && (
        <Button variant="outline" size="sm" onClick={() => setBuka(true)}>
          <Plus aria-hidden /> Tambah prestasi
        </Button>
      )}
      <Dialog
        side="right"
        open={buka}
        onOpenChange={setBuka}
        title="Tambah prestasi"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBuka(false)}>
              Batal
            </Button>
            <Button loading={proses} disabled={!f.nama.trim()} onClick={() => void tambah()}>
              Simpan prestasi
            </Button>
          </>
        }
      >
        {galat && <Alert variant="danger">{galat}</Alert>}
        <FormGrid>
          <Field label="Nama lomba / prestasi" required style={{ gridColumn: '1 / -1' }}>
            <Input value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} maxLength={200} />
          </Field>
          <Field label="Bidang">
            <Select options={BIDANG.map((v) => ({ value: v, label: judulKata(v) }))} value={f.bidang} onValueChange={(v) => setF({ ...f, bidang: v ?? 'akademik' })} />
          </Field>
          <Field label="Tingkat" required>
            <Select options={TINGKAT.map((v) => ({ value: v, label: judulKata(v) }))} value={f.tingkat} onValueChange={(v) => setF({ ...f, tingkat: v ?? 'kabupaten' })} />
          </Field>
          <Field label="Peringkat" optional>
            <Input value={f.peringkat} onChange={(e) => setF({ ...f, peringkat: e.target.value })} placeholder="Juara 1" />
          </Field>
          <Field label="Tahun" optional>
            <Input value={f.tahun} onChange={(e) => setF({ ...f, tahun: e.target.value.replace(/\D/g, '').slice(0, 4) })} inputMode="numeric" />
          </Field>
          <Field label="Penyelenggara" optional style={{ gridColumn: '1 / -1' }}>
            <Input value={f.penyelenggara} onChange={(e) => setF({ ...f, penyelenggara: e.target.value })} maxLength={150} />
          </Field>
          {sertifikat.length > 0 && (
            <Field label="Bukti sertifikat" optional description="Unggah sertifikat dulu di menu Berkas." style={{ gridColumn: '1 / -1' }}>
              <Select options={sertifikat.map((b) => ({ value: String(b.id), label: b.nama_asli }))} value={f.berkas_id || null} onValueChange={(v) => setF({ ...f, berkas_id: v ?? '' })} />
            </Field>
          )}
        </FormGrid>
      </Dialog>
    </div>
  );
}

const SEMESTER_RAPOR = [1, 2, 3, 4, 5];
/** Tabel nilai rapor semester 1-5 per mata pelajaran (skala 0-100) dengan rata-rata per baris. */
export function IsianRaporPmb({
  value,
  onChange,
  kunci,
}: {
  value: { mapel: string[]; nilai: Record<string, string> };
  onChange: (v: { mapel: string[]; nilai: Record<string, string> }) => void;
  kunci?: boolean;
}) {
  const { mapel, nilai } = value;
  const rata = (m: string) => {
    const a = SEMESTER_RAPOR.map((x) => Number(nilai[`${m}|${x}`])).filter((x) => x > 0);
    return a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-';
  };
  return (
    <div className="u-pmb-rapor">
      <TableContainer>
        <Table density="compact">
          <thead>
            <tr>
              <th>Mata pelajaran</th>
              {SEMESTER_RAPOR.map((x) => (
                <th key={x}>Smt {x}</th>
              ))}
              <th>Rata-rata</th>
              <th aria-label="Aksi" />
            </tr>
          </thead>
          <tbody>
            {mapel.map((m, i) => (
              <tr key={i}>
                <td>
                  <Input
                    size="sm"
                    value={m}
                    disabled={kunci}
                    aria-label={`Mata pelajaran ${i + 1}`}
                    onChange={(e) => onChange({ mapel: mapel.map((y, j) => (j === i ? e.target.value : y)), nilai })}
                  />
                </td>
                {SEMESTER_RAPOR.map((x) => (
                  <td key={x}>
                    <Input
                      size="sm"
                      className="u-pmb-rapor-nilai"
                      value={nilai[`${m}|${x}`] ?? ''}
                      disabled={kunci}
                      inputMode="decimal"
                      aria-label={`${m || 'Mapel'} semester ${x}`}
                      onChange={(e) => onChange({ mapel, nilai: { ...nilai, [`${m}|${x}`]: e.target.value.replace(/[^\d.]/g, '').slice(0, 5) } })}
                    />
                  </td>
                ))}
                <td className="u-pmb-rapor-rata">{rata(m)}</td>
                <td>
                  {!kunci && (
                    <Button size="sm" variant="ghost" iconOnly aria-label="Hapus mata pelajaran" onClick={() => onChange({ mapel: mapel.filter((_, j) => j !== i), nilai })}>
                      <Trash2 />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableContainer>
      {!kunci && (
        <Button variant="ghost" size="sm" onClick={() => onChange({ mapel: [...mapel, ''], nilai })}>
          <Plus aria-hidden /> Tambah mata pelajaran
        </Button>
      )}
    </div>
  );
}

/**
 * Wizard formulir PMB yang tersambung ke SIAKAD: memuat draf `pmb.getSayaPendaftaranById`, menyimpan tiap langkah
 * dengan `pmb.patchSayaPendaftaranById` (hanya bagian langkah itu), prestasi/rapor bila jalur memintanya, lalu
 * `pmb.postSayaPendaftaranByIdAjukan`. Galat validasi server ditampilkan di field terkait. Setelah diajukan
 * formulir terkunci dan tampil sebagai ringkasan.
 */
export function WizardPendaftaranPmb({ id, onDiajukan, kontak, langkah, onLangkahChange, kodeReferal, kunci: kunciLuar, className }: WizardPendaftaranPmbProps) {
  const siakad = useSiakad();
  const det = useSiakadQuery<Pendaftaran>(['pmb-pendaftaran', id], (s, signal) => s.pmb.getSayaPendaftaranById(id, {}, { signal }) as never, { staleTime: 0 });
  const ref = useReferensiFormulir();
  const gelId = det.data?.gelombang.id;
  const gel = useSiakadQuery<{ maks_pilihan?: number; prodi: ProdiGelombang[]; perlu_rapor?: boolean; perlu_prestasi?: boolean }>(
    ['pmb-info', 'gelombang', String(gelId)],
    (s, signal) => s.pmb.getInfoGelombangById(gelId!, {}, { signal }) as never,
    { enabled: !!gelId, staleTime: 600_000 },
  );

  const [f, setF] = React.useState<FormulirPmb | null>(null);
  const [rapor, setRapor] = React.useState<{ mapel: string[]; nilai: Record<string, string> } | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [stepIn, setStepIn] = React.useState(0);
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);
  const [selesai, setSelesai] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (det.data && !f)
      setF({
        ...det.data.formulir,
        pilihan: det.data.formulir.pilihan ?? det.data.pilihan.map((p) => p.kode_prodi),
        sumber_informasi: det.data.formulir.sumber_informasi ?? det.data.sumber_informasi ?? null,
        kode_referal: det.data.formulir.kode_referal ?? kodeReferal ?? null,
      });
    if (det.data && !rapor) {
      const r = det.data.rapor ?? [];
      setRapor({
        mapel: r.length ? [...new Set(r.map((x) => x.mapel))] : ['Matematika', 'Bahasa Indonesia', 'Bahasa Inggris'],
        nilai: Object.fromEntries(r.map((x) => [`${x.mapel}|${x.semester}`, String(x.nilai)])),
      });
    }
  }, [det.data, f, rapor, kodeReferal]);

  if (det.error)
    return (
      <Alert variant="danger" title="Formulir tidak bisa dimuat">
        {pesanGalat(det.error)}
      </Alert>
    );
  if (!f || !ref.data || !det.data || !rapor)
    return (
      <div className="u-wizard" aria-busy>
        <Skeleton style={{ height: 420, borderRadius: 16 }} />
      </div>
    );
  if (selesai)
    return (
      <Alert variant="success" title="Pendaftaran berhasil diajukan">
        Nomor pendaftaran Anda <b>{selesai}</b>. Panitia akan memverifikasi data; pantau status di dasbor.
      </Alert>
    );

  const d = det.data;
  const r = ref.data;
  const bisaUbah = d.status === 'draf' || d.status === 'perlu_perbaikan';
  const terkunci = !bisaUbah || !!kunciLuar;
  const ubah = <K extends keyof FormulirPmb>(k: K, patch: Partial<NonNullable<FormulirPmb[K]>>) => {
    setF((x) => ({ ...x, [k]: Array.isArray(patch) ? patch : { ...((x?.[k] as object) ?? {}), ...patch } }));
    setErrors((e) => {
      const n = { ...e };
      for (const key of Object.keys(patch)) delete n[key];
      return n;
    });
  };
  const tanganiGalat = (e: unknown) => {
    const err = e as { status?: number; details?: Record<string, unknown> };
    const fields = err.status === 422 && err.details && Object.keys(err.details).length ? err.details : null;
    if (fields) {
      setErrors(Object.fromEntries(Object.entries(fields).map(([k, v]) => [k.split('.').pop()!, String(v)])));
      return 'Periksa kembali isian yang ditandai.';
    }
    return pesanGalat(e);
  };
  const kirimPatch = async (body: Record<string, unknown>) => {
    if (terkunci) return;
    try {
      await siakad.pmb.patchSayaPendaftaranById(id, body as never);
      setSavedAt(new Date());
      setErrors({});
    } catch (e) {
      return tanganiGalat(e);
    }
  };
  const simpan = (bagian: keyof FormulirPmb) => () => kirimPatch({ [bagian]: f[bagian] });
  const simpanProdi = () => {
    const body: Record<string, unknown> = { sumber_informasi: f.sumber_informasi || null };
    if (!d.no_pmb) body.pilihan = f.pilihan;
    if (f.kode_referal?.trim()) body.kode_referal = f.kode_referal.trim().toUpperCase();
    return kirimPatch(body);
  };
  const simpanRapor = async () => {
    if (terkunci) return;
    const nilai: Array<{ mapel: string; semester: number; nilai: number }> = [];
    rapor.mapel.forEach((m) =>
      SEMESTER_RAPOR.forEach((x) => {
        const v = rapor.nilai[`${m}|${x}`];
        if (m.trim() && v) nilai.push({ mapel: m.trim(), semester: x, nilai: Number(v) });
      }),
    );
    try {
      await siakad.pmb.putSayaPendaftaranByIdRapor(id, { nilai } as never);
      setSavedAt(new Date());
    } catch (e) {
      return tanganiGalat(e);
    }
  };

  const p = f.pribadi ?? {};
  const a = f.alamat ?? {};
  const s = f.asal_sekolah ?? {};
  const o = f.orang_tua ?? {};
  const prodi = gel.data?.prodi ?? [];
  const wajib = (obj: Isian, keys: string[]) => keys.filter((k) => obj[k] == null || obj[k] === '');
  const kurang = {
    pilihan: (f.pilihan ?? []).length ? null : 'Pilih minimal satu program studi.',
    pribadi: wajib(p, ['nama', 'no_identitas', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'agama', 'hp']).length ? 'Data diri belum lengkap.' : null,
    alamat: wajib(a, ['alamat', 'desa', 'kecamatan']).length ? 'Alamat belum lengkap.' : null,
    asal_sekolah: !(s.nama_sekolah || s.nama_asal_pt) ? 'Asal sekolah belum diisi.' : null,
    orang_tua: !(o.ayah?.nama || o.ibu?.nama) ? 'Isi minimal nama ayah atau ibu.' : null,
  };
  const perluPrestasi = !!gel.data?.perlu_prestasi || (d.prestasi?.length ?? 0) > 0;
  const perluRapor = !!gel.data?.perlu_rapor || (d.rapor?.length ?? 0) > 0;
  const sertifikat = (d.berkas ?? []).filter((b) => b.jenis.startsWith('sertifikat'));

  const steps: WizardStep[] = [
    {
      id: 'prodi',
      title: 'Program studi',
      description: 'Pilihan dan urutan prioritas',
      content: gel.loading ? (
        <Skeleton style={{ height: 240 }} />
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {d.no_pmb ? (
            <Alert variant="info">Pilihan program studi tidak bisa diubah setelah pendaftaran diajukan.</Alert>
          ) : (
            <PilihanProdi prodi={prodi} value={f.pilihan ?? []} maks={gel.data?.maks_pilihan ?? 2} onChange={(v) => setF((x) => ({ ...x, pilihan: v }))} />
          )}
          <FormGrid>
            <Field label="Dari mana Anda mengetahui PMB ini?" optional error={errors.sumber_informasi}>
              <Pilihan options={opsi(r.sumber_informasi)} value={f.sumber_informasi || null} onValueChange={(v) => setF((x) => ({ ...x, sumber_informasi: v }))} />
            </Field>
            <Field label="Kode referal" optional error={errors.kode_referal} description="Dari sekolah, alumni, atau agen promosi.">
              <Input value={f.kode_referal ?? ''} onChange={(e) => setF((x) => ({ ...x, kode_referal: e.target.value.toUpperCase() }))} maxLength={30} className="u-pmb-kode" />
            </Field>
          </FormGrid>
        </div>
      ),
      onNext: async () => (d.no_pmb ? await simpanProdi() : (kurang.pilihan ?? (await simpanProdi()))),
      error: !!errors.pilihan,
    },
    {
      id: 'pribadi',
      title: 'Data diri',
      description: 'Sesuai KTP/KK dan ijazah',
      content: <IsianDataDiri value={p} ref_={r} errors={errors} onChange={(x) => ubah('pribadi', x)} />,
      onNext: simpan('pribadi'),
    },
    { id: 'alamat', title: 'Alamat', description: 'Domisili saat ini', content: <IsianAlamat value={a} errors={errors} onChange={(x) => ubah('alamat', x)} pilihKecamatan />, onNext: simpan('alamat') },
    {
      id: 'asal',
      title: 'Asal sekolah',
      description: 'Sekolah atau kampus asal',
      content: <IsianAsalSekolah value={s} ref_={r} errors={errors} onChange={(x) => ubah('asal_sekolah', x)} />,
      onNext: simpan('asal_sekolah'),
    },
    {
      id: 'ortu',
      title: 'Orang tua',
      description: 'Ayah, ibu, dan wali',
      content: <IsianOrangTua wali value={o} ref_={r} onChange={(x) => setF((y) => ({ ...y, orang_tua: x }))} />,
      onNext: simpan('orang_tua'),
    },
    ...(perluPrestasi
      ? [
          {
            id: 'prestasi',
            title: 'Prestasi',
            description: 'Lomba dan penghargaan',
            optional: !gel.data?.perlu_prestasi,
            content: <IsianPrestasiPmb id={id} prestasi={d.prestasi ?? []} sertifikat={sertifikat} kunci={terkunci} onBerubah={det.refetch} />,
          } satisfies WizardStep,
        ]
      : []),
    ...(perluRapor
      ? [
          {
            id: 'rapor',
            title: 'Nilai rapor',
            description: 'Semester 1-5',
            content: <IsianRaporPmb value={rapor} onChange={setRapor} kunci={terkunci} />,
            onNext: simpanRapor,
          } satisfies WizardStep,
        ]
      : []),
    {
      id: 'tinjau',
      title: 'Tinjau & ajukan',
      description: 'Pastikan semua benar',
      content: <PmbReview f={f} r={r} prodi={prodi} kurang={kurang} server={Array.isArray(d.kelengkapan) ? {} : d.kelengkapan} go={(n) => setStepIn(n)} />,
    },
  ];
  const idx = langkah ? steps.findIndex((x) => x.id === langkah || (langkah === 'sekolah' && x.id === 'asal')) : -1;
  const step = idx >= 0 ? idx : stepIn;
  const gantiStep = (n: number) => {
    setStepIn(n);
    onLangkahChange?.(steps[n]?.id ?? 'prodi');
  };

  if (terkunci && !bisaUbah)
    return (
      <div className={cn('u-pmb-formulir-kunci', className)}>
        <Alert variant="info" title="Formulir sudah diajukan">
          Formulir tidak bisa diubah lagi. Hubungi panitia bila ada data yang salah.
        </Alert>
        <PmbReview f={f} r={r} prodi={prodi} kurang={kurang} server={{}} />
      </div>
    );

  return (
    <div className={cn('u-pmb-formulir', className)}>
      {d.status === 'perlu_perbaikan' && (
        <Alert variant="warning" title="Panitia meminta perbaikan">
          {d.catatan_verifikasi ?? 'Periksa kembali isian dan berkas Anda, lalu ajukan ulang.'}
        </Alert>
      )}
      {kunciLuar && <Alert variant="warning">{kunciLuar}</Alert>}
      <Wizard
        steps={steps}
        step={Math.min(step, steps.length - 1)}
        onStepChange={gantiStep}
        savedAt={savedAt}
        freeNavigation
        title="Langkah pengisian"
        description="Isian tersimpan tiap langkah. Anda bisa melanjutkan kapan saja."
        aside={kontak}
        finishLabel={d.status === 'perlu_perbaikan' ? 'Ajukan ulang' : 'Ajukan pendaftaran'}
        onFinish={async () => {
          if (kunciLuar) return typeof kunciLuar === 'string' ? kunciLuar : 'Formulir belum bisa diajukan.';
          const k = Object.values(kurang).find(Boolean);
          if (k) return k;
          try {
            const res = await siakad.pmb.postSayaPendaftaranByIdAjukan(id);
            const hasil = res.data as { no_pmb?: string | null; status?: string };
            invalidateSiakad('pmb');
            setSelesai(hasil.no_pmb ?? '-');
            onDiajukan?.(hasil);
          } catch (e) {
            return tanganiGalat(e);
          }
        }}
      />
    </div>
  );
}

function PmbReview({
  f,
  r,
  prodi,
  kurang,
  server,
  go,
}: {
  f: FormulirPmb;
  r: ReferensiFormulir;
  prodi: ProdiGelombang[];
  kurang: Record<string, string | null>;
  server: Record<string, string>;
  go?: (n: number) => void;
}) {
  const p = f.pribadi ?? {};
  const a = f.alamat ?? {};
  const s = f.asal_sekolah ?? {};
  const o = f.orang_tua ?? {};
  const ke = (n: number) => (go ? () => go(n) : undefined);
  const sections: ReviewSection[] = [
    {
      title: 'Program studi',
      onEdit: ke(0),
      missing: kurang.pilihan,
      items: [
        ...(f.pilihan ?? []).map((k, i) => ({ label: `Pilihan ${i + 1}`, value: (() => { const x = prodi.find((y) => y.kode_prodi === k); return x ? namaProdiPmb(x) : k; })() })),
        { label: 'Sumber informasi', value: nama(r.sumber_informasi, f.sumber_informasi) },
        { label: 'Kode referal', value: f.kode_referal },
      ],
    },
    {
      title: 'Data diri',
      onEdit: ke(1),
      missing: kurang.pribadi,
      items: [
        { label: 'Nama', value: p.nama },
        { label: 'NIK', value: p.no_identitas },
        { label: 'Jenis kelamin', value: nama(r.jenis_kelamin, p.jenis_kelamin) },
        { label: 'Tempat, tanggal lahir', value: p.tempat_lahir || p.tanggal_lahir ? `${p.tempat_lahir ?? '…'}, ${p.tanggal_lahir ? formatDate(String(p.tanggal_lahir), 'long') : '…'}` : null },
        { label: 'Agama', value: nama(r.agama, p.agama) },
        { label: 'Nomor HP', value: p.hp },
      ],
    },
    {
      title: 'Alamat',
      onEdit: ke(2),
      missing: kurang.alamat,
      items: [
        { label: 'Alamat', value: [a.alamat, a.rt && `RT ${a.rt}`, a.rw && `RW ${a.rw}`].filter(Boolean).join(', ') },
        { label: 'Desa/kelurahan', value: a.desa },
        { label: 'Kecamatan', value: a.kecamatan_nama || a.kecamatan },
      ],
    },
    {
      title: 'Asal sekolah',
      onEdit: ke(3),
      missing: kurang.asal_sekolah,
      items: [
        { label: 'Sekolah/PT asal', value: s.nama_sekolah ?? s.nama_asal_pt },
        { label: 'Tahun lulus', value: s.tahun_lulus },
      ],
    },
    {
      title: 'Orang tua',
      onEdit: ke(4),
      missing: kurang.orang_tua,
      items: [
        { label: 'Ayah', value: o.ayah?.nama },
        { label: 'Ibu', value: o.ibu?.nama },
        ...(o.wali?.nama ? [{ label: 'Wali', value: o.wali.nama }] : []),
        { label: 'Pekerjaan ayah', value: nama(r.pekerjaan, o.ayah?.pekerjaan) },
        { label: 'Pekerjaan ibu', value: nama(r.pekerjaan, o.ibu?.pekerjaan) },
      ],
    },
  ];
  const lain = Object.entries(server).filter(([k]) => k.startsWith('berkas') || k === 'rapor' || k === 'prestasi' || k.startsWith('akun'));
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {lain.length > 0 && (
        <Alert variant="warning" title="Masih ada yang perlu dilengkapi di luar formulir">
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {lain.map(([k, v]) => (
              <li key={k}>
                {k.replace('berkas.', 'Berkas ').replace('akun.', 'Akun ')}: {v}
              </li>
            ))}
          </ul>
        </Alert>
      )}
      <WizardReview sections={sections} />
    </div>
  );
}

// ================================================================ Wizard biodata mahasiswa
export interface BiodataMahasiswa {
  pribadi: Isian;
  alamat: Isian;
  asal_sekolah: Isian;
  orang_tua: NonNullable<FormulirPmb['orang_tua']>;
}
export interface WizardBiodataProps {
  /** Nilai awal, mis. dari `mahasiswa.getByNim`. */
  nilaiAwal?: Partial<BiodataMahasiswa>;
  /**
   * Simpan biodata. SIAKAD belum menyediakan endpoint ubah biodata mahasiswa untuk umum,
   * jadi aplikasi yang menentukan tujuannya (mis. pengajuan perubahan data ke BAAK).
   */
  onSimpan: (data: BiodataMahasiswa, bagian: keyof BiodataMahasiswa | 'semua') => void | string | Promise<void | string | null | undefined>;
  className?: string;
}

/** Wizard pemutakhiran biodata mahasiswa (data diri, alamat, riwayat pendidikan, orang tua) memakai referensi kode SIAKAD. */
export function WizardBiodata({ nilaiAwal, onSimpan, className }: WizardBiodataProps) {
  const ref = useReferensiFormulir();
  const [d, setD] = React.useState<BiodataMahasiswa>(() => ({ pribadi: {}, alamat: {}, asal_sekolah: { status_masuk: 'B' }, orang_tua: {}, ...nilaiAwal }));
  const [step, setStep] = React.useState(0);
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);
  const [ok, setOk] = React.useState(false);
  if (!ref.data) return <Skeleton style={{ height: 420, borderRadius: 16 }} />;
  const r = ref.data;
  const set = (k: keyof BiodataMahasiswa) => (patch: Isian) => setD((x) => ({ ...x, [k]: { ...x[k], ...patch } }));
  const save = (k: keyof BiodataMahasiswa) => async () => {
    const res = await onSimpan(d, k);
    if (typeof res === 'string') return res;
    setSavedAt(new Date());
  };
  if (ok)
    return (
      <Alert variant="success" title="Biodata tersimpan">
        Terima kasih, data Anda sudah diperbarui.
      </Alert>
    );
  return (
    <Wizard
      className={className}
      title="Pemutakhiran biodata"
      description="Data ini dipakai untuk ijazah, PDDikti, dan surat keterangan."
      step={step}
      onStepChange={setStep}
      savedAt={savedAt}
      finishLabel="Simpan biodata"
      steps={[
        { id: 'pribadi', title: 'Data diri', content: <IsianDataDiri value={d.pribadi} ref_={r} onChange={set('pribadi')} />, onNext: save('pribadi') },
        { id: 'alamat', title: 'Alamat', content: <IsianAlamat value={d.alamat} onChange={set('alamat')} />, onNext: save('alamat') },
        { id: 'riwayat', title: 'Riwayat pendidikan', content: <IsianAsalSekolah value={d.asal_sekolah} ref_={r} onChange={set('asal_sekolah')} />, onNext: save('asal_sekolah') },
        { id: 'ortu', title: 'Orang tua', content: <IsianOrangTua value={d.orang_tua} ref_={r} onChange={(x) => setD((y) => ({ ...y, orang_tua: x }))} />, onNext: save('orang_tua') },
        {
          id: 'tinjau',
          title: 'Tinjau',
          content: (
            <WizardReview
              sections={[
                {
                  title: 'Data diri',
                  onEdit: () => setStep(0),
                  items: [
                    { label: 'Nama', value: d.pribadi.nama },
                    { label: 'NIK', value: d.pribadi.no_identitas },
                    { label: 'Agama', value: nama(r.agama, d.pribadi.agama) },
                    { label: 'Nomor HP', value: d.pribadi.hp },
                  ],
                },
                {
                  title: 'Alamat',
                  onEdit: () => setStep(1),
                  items: [
                    { label: 'Alamat', value: d.alamat.alamat },
                    { label: 'Desa', value: d.alamat.desa },
                    { label: 'Kecamatan', value: d.alamat.kecamatan },
                  ],
                },
                {
                  title: 'Riwayat pendidikan',
                  onEdit: () => setStep(2),
                  items: [
                    { label: 'Asal', value: d.asal_sekolah.nama_sekolah ?? d.asal_sekolah.nama_asal_pt },
                    { label: 'Tahun lulus', value: d.asal_sekolah.tahun_lulus },
                  ],
                },
                {
                  title: 'Orang tua',
                  onEdit: () => setStep(3),
                  items: [
                    { label: 'Ayah', value: d.orang_tua.ayah?.nama },
                    { label: 'Ibu', value: d.orang_tua.ibu?.nama },
                  ],
                },
              ]}
            />
          ),
        },
      ]}
      onFinish={async () => {
        const res = await onSimpan(d, 'semua');
        if (typeof res === 'string') return res;
        setOk(true);
      }}
    />
  );
}
