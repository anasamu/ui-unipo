'use client';
import * as React from 'react';
import { Check, GraduationCap } from 'lucide-react';
import { Alert } from '../components/display';
import { DatePicker, parseISODate, toISODate } from '../components/calendar';
import { Field, Input, RadioGroup, Textarea } from '../components/forms';
import { Select } from '../components/select';
import { Skeleton } from '../components/actions';
import { FormGrid, Wizard, WizardReview, type ReviewSection, type WizardStep } from '../components/wizard';
import { formatDate } from '../lib/format';
import { CariPerguruanTinggi, CariSekolah } from './cari';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

// ================================================================ Tipe formulir (PATCH /v1/pmb/saya/pendaftaran/{id})
type Isian = Record<string, string | number | null | undefined>;
export interface FormulirPmb {
  pribadi?: Isian;
  alamat?: Isian;
  asal_sekolah?: Isian;
  orang_tua?: { ayah?: Isian; ibu?: Isian; wali?: Isian };
  pilihan?: string[];
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
        <Select options={opsi(ref_.agama)} value={teks(v.agama) || null} onValueChange={(x) => onChange({ agama: x })} />
      </Field>
      <Field label="Kewarganegaraan" error={errors.warga_negara}>
        <Select options={opsi(ref_.warga_negara)} value={teks(v.warga_negara) || null} onValueChange={(x) => onChange({ warga_negara: x })} />
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

export function IsianAlamat({ value: v, onChange, errors = {} }: Omit<BagianProps, 'ref_'> & { ref_?: ReferensiFormulir }) {
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
      <Field label="Kecamatan" required error={errors.kecamatan}>
        <Input value={teks(v.kecamatan)} onChange={set('kecamatan')} />
      </Field>
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
            <Select options={opsi(ref_.asal_jenjang)} value={teks(v.asal_jenjang) || null} onValueChange={(x) => onChange({ asal_jenjang: x })} />
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

function IsianSatuOrtu({ label, value: v, onChange, ref_ }: BagianProps & { label: string }) {
  return (
    <>
      <p className="u-form-section-title">{label}</p>
      <Field label={`Nama ${label.toLowerCase()}`} required style={{ gridColumn: '1 / -1' }}>
        <Input value={teks(v.nama)} onChange={(e) => onChange({ nama: e.target.value })} />
      </Field>
      <Field label="Pendidikan terakhir">
        <Select options={opsi(ref_.pendidikan)} value={teks(v.pendidikan) || null} onValueChange={(x) => onChange({ pendidikan: x })} />
      </Field>
      <Field label="Pekerjaan">
        <Select options={opsi(ref_.pekerjaan)} value={teks(v.pekerjaan) || null} onValueChange={(x) => onChange({ pekerjaan: x })} />
      </Field>
      <Field label="Penghasilan per bulan">
        <Select options={opsi(ref_.penghasilan)} value={teks(v.penghasilan) || null} onValueChange={(x) => onChange({ penghasilan: x })} />
      </Field>
      <Field label="Nomor HP" optional>
        <Input value={teks(v.hp)} onChange={(e) => onChange({ hp: e.target.value.replace(/[^\d+]/g, '') })} inputMode="tel" />
      </Field>
    </>
  );
}

export function IsianOrangTua({ value, onChange, ref_ }: { value: NonNullable<FormulirPmb['orang_tua']>; onChange: (v: NonNullable<FormulirPmb['orang_tua']>) => void; ref_: ReferensiFormulir }) {
  return (
    <FormGrid>
      {(['ayah', 'ibu'] as const).map((h) => (
        <IsianSatuOrtu key={h} label={h === 'ayah' ? 'Ayah' : 'Ibu'} value={value[h] ?? {}} ref_={ref_} onChange={(p) => onChange({ ...value, [h]: { ...(value[h] ?? {}), ...p } })} />
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
  kuota?: number | null;
  jumlah_peminat?: number | null;
}

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
              <button type="button" className="u-prodi-opt" aria-pressed={i >= 0} onClick={() => toggle(p.kode_prodi)}>
                <span className="u-prodi-rank" aria-hidden>
                  {i >= 0 ? i + 1 : <GraduationCap />}
                </span>
                <span className="u-prodi-text">
                  <span className="u-prodi-name">
                    {p.jenjang ? `${p.jenjang} ` : ''}
                    {p.nama_prodi}
                  </span>
                  <span className="u-prodi-meta">
                    {p.kode_fakultas}
                    {p.kuota ? ` · kuota ${p.kuota}` : ''}
                    {p.jumlah_peminat != null ? ` · ${p.jumlah_peminat} peminat` : ''}
                  </span>
                </span>
                {p.kuota ? (
                  <span className="u-prodi-meter" data-level={rasio > 1.5 ? 'tinggi' : rasio > 0.8 ? 'sedang' : 'rendah'} title="Perbandingan peminat dan kuota">
                    {rasio > 1.5 ? 'Persaingan tinggi' : rasio > 0.8 ? 'Sedang' : 'Peluang besar'}
                  </span>
                ) : null}
                {i >= 0 && <Check className="u-prodi-check" aria-hidden />}
              </button>
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
  className?: string;
}

interface Pendaftaran {
  id: string;
  no_pmb: string | null;
  status: string;
  gelombang: { id: number; nama: string; jalur?: string | null };
  formulir: FormulirPmb;
  pilihan: Array<{ urut: number; kode_prodi: string; nama_prodi?: string | null }>;
  kelengkapan: Record<string, string> | [];
}

/**
 * Wizard formulir PMB yang tersambung ke SIAKAD: memuat draf `pmb.getSayaPendaftaranById`, menyimpan tiap langkah
 * dengan `pmb.patchSayaPendaftaranById` (hanya bagian langkah itu), lalu `pmb.postSayaPendaftaranByIdAjukan`.
 * Galat validasi server ditampilkan di field terkait.
 */
export function WizardPendaftaranPmb({ id, onDiajukan, kontak, className }: WizardPendaftaranPmbProps) {
  const siakad = useSiakad();
  const det = useSiakadQuery<Pendaftaran>(['pmb-pendaftaran', id], (s, signal) => s.pmb.getSayaPendaftaranById(id, {}, { signal }) as never, { staleTime: 0 });
  const ref = useReferensiFormulir();
  const gelId = det.data?.gelombang.id;
  const gel = useSiakadQuery<{ maks_pilihan?: number; prodi: ProdiGelombang[] }>(['pmb-gelombang', gelId], (s, signal) => s.pmb.getInfoGelombangById(gelId!, {}, { signal }) as never, {
    enabled: !!gelId,
    staleTime: 600_000,
  });

  const [f, setF] = React.useState<FormulirPmb | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [step, setStep] = React.useState(0);
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);
  const [selesai, setSelesai] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (det.data && !f) setF({ ...det.data.formulir, pilihan: det.data.formulir.pilihan ?? det.data.pilihan.map((p) => p.kode_prodi) });
  }, [det.data, f]);

  if (det.error)
    return (
      <Alert variant="danger" title="Formulir tidak bisa dimuat">
        {pesanGalat(det.error)}
      </Alert>
    );
  if (!f || !ref.data)
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

  const r = ref.data;
  const ubah = <K extends keyof FormulirPmb>(k: K, patch: Partial<NonNullable<FormulirPmb[K]>>) => {
    setF((x) => ({ ...x, [k]: Array.isArray(patch) ? patch : { ...((x?.[k] as object) ?? {}), ...patch } }));
    setErrors((e) => {
      const n = { ...e };
      for (const key of Object.keys(patch)) delete n[key];
      return n;
    });
  };
  const simpan = (bagian: keyof FormulirPmb) => async () => {
    try {
      await siakad.pmb.patchSayaPendaftaranById(id, { [bagian]: f[bagian] } as never);
      setSavedAt(new Date());
      setErrors({});
    } catch (e) {
      const err = e as { status?: number; details?: Record<string, unknown> };
      const fields = err.status === 422 && err.details && Object.keys(err.details).length ? err.details : null;
      if (fields) {
        setErrors(Object.fromEntries(Object.entries(fields).map(([k, v]) => [k.split('.').pop()!, String(v)])));
        return 'Periksa kembali isian yang ditandai.';
      }
      return pesanGalat(e);
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

  const steps: WizardStep[] = [
    {
      id: 'prodi',
      title: 'Program studi',
      description: det.data!.gelombang.nama + (det.data!.gelombang.jalur ? ` · ${det.data!.gelombang.jalur}` : ''),
      content: gel.loading ? (
        <Skeleton style={{ height: 240 }} />
      ) : (
        <PilihanProdi prodi={prodi} value={f.pilihan ?? []} maks={gel.data?.maks_pilihan ?? 2} onChange={(v) => setF((x) => ({ ...x, pilihan: v }))} />
      ),
      onNext: async () => kurang.pilihan ?? (await simpan('pilihan')()),
      error: !!errors.pilihan,
    },
    {
      id: 'pribadi',
      title: 'Data diri',
      description: 'Sesuai KTP/KK dan ijazah',
      content: <IsianDataDiri value={p} ref_={r} errors={errors} onChange={(x) => ubah('pribadi', x)} />,
      onNext: simpan('pribadi'),
    },
    { id: 'alamat', title: 'Alamat', description: 'Domisili saat ini', content: <IsianAlamat value={a} errors={errors} onChange={(x) => ubah('alamat', x)} />, onNext: simpan('alamat') },
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
      description: 'Data ayah dan ibu',
      content: <IsianOrangTua value={o} ref_={r} onChange={(x) => setF((y) => ({ ...y, orang_tua: x }))} />,
      onNext: simpan('orang_tua'),
    },
    {
      id: 'tinjau',
      title: 'Tinjau & ajukan',
      description: 'Pastikan semua benar',
      content: <PmbReview f={f} r={r} prodi={prodi} kurang={kurang} server={Array.isArray(det.data!.kelengkapan) ? {} : det.data!.kelengkapan} go={setStep} />,
    },
  ];

  return (
    <Wizard
      className={className}
      steps={steps}
      step={step}
      onStepChange={setStep}
      savedAt={savedAt}
      title="Formulir pendaftaran"
      description="Isian tersimpan otomatis tiap langkah. Anda bisa melanjutkan kapan saja."
      aside={kontak}
      finishLabel="Ajukan pendaftaran"
      onFinish={async () => {
        const k = Object.values(kurang).find(Boolean);
        if (k) return k;
        try {
          const res = await siakad.pmb.postSayaPendaftaranByIdAjukan(id);
          const d = res.data as { no_pmb?: string | null; status?: string };
          invalidateSiakad('pmb');
          setSelesai(d.no_pmb ?? '-');
          onDiajukan?.(d);
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
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
  go: (n: number) => void;
}) {
  const p = f.pribadi ?? {};
  const a = f.alamat ?? {};
  const s = f.asal_sekolah ?? {};
  const o = f.orang_tua ?? {};
  const sections: ReviewSection[] = [
    {
      title: 'Program studi',
      onEdit: () => go(0),
      missing: kurang.pilihan,
      items: (f.pilihan ?? []).map((k, i) => ({ label: `Pilihan ${i + 1}`, value: prodi.find((x) => x.kode_prodi === k)?.nama_prodi ?? k })),
    },
    {
      title: 'Data diri',
      onEdit: () => go(1),
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
      onEdit: () => go(2),
      missing: kurang.alamat,
      items: [
        { label: 'Alamat', value: [a.alamat, a.rt && `RT ${a.rt}`, a.rw && `RW ${a.rw}`].filter(Boolean).join(', ') },
        { label: 'Desa/kelurahan', value: a.desa },
        { label: 'Kecamatan', value: a.kecamatan },
      ],
    },
    {
      title: 'Asal sekolah',
      onEdit: () => go(3),
      missing: kurang.asal_sekolah,
      items: [
        { label: 'Sekolah/PT asal', value: s.nama_sekolah ?? s.nama_asal_pt },
        { label: 'Tahun lulus', value: s.tahun_lulus },
      ],
    },
    {
      title: 'Orang tua',
      onEdit: () => go(4),
      missing: kurang.orang_tua,
      items: [
        { label: 'Ayah', value: o.ayah?.nama },
        { label: 'Ibu', value: o.ibu?.nama },
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
