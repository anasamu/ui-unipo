'use client';
import * as React from 'react';
import { ArrowRight, BadgeCheck, CircleAlert, Home, IdCard, Lock, Phone, Users } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button, Skeleton } from '../components/actions';
import { Alert, Avatar } from '../components/display';
import { Field, Input, Textarea } from '../components/forms';
import { Combobox, Select } from '../components/select';
import { FormGrid, Wizard, WizardReview, type WizardStep } from '../components/wizard';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

// ================================================================ Tipe (GET /v1/kelengkapan/saya)
export interface IsianKurang {
  kolom: string;
  label: string;
  wajib: boolean;
  /** kosong | tidak_sah | ganda */
  alasan: 'kosong' | 'tidak_sah' | 'ganda' | string;
  bisa_diisi_sendiri: boolean;
}
export interface KelengkapanSaya {
  entitas: 'mahasiswa' | 'dosen' | string;
  /** NIM atau NIDN. */
  kunci: string;
  nama: string;
  kode_prodi?: string | null;
  lengkap: boolean;
  perlu_wizard: boolean;
  persen_wajib: number;
  kurang: IsianKurang[];
  isian_sendiri: string[];
  diperiksa_pada?: string;
}

/** Data tampilan pengguna untuk kartu profil. Foto biasanya dari SSO (`picture` di userinfo). */
export interface PenggunaKelengkapan {
  nama?: string;
  foto?: string | null;
  /** Baris kedua, mis. "S1 Informatika · Angkatan 2023". */
  keterangan?: React.ReactNode;
}

const PATH = '/v1/kelengkapan/saya';

/** Ambil kelengkapan data pengguna yang login (token pengguna, scope `kelengkapan:saya`). */
export function useKelengkapanSaya(opts: { enabled?: boolean } = {}) {
  return useSiakadQuery<KelengkapanSaya>(['kelengkapan-saya'], (s, signal) => s.request<KelengkapanSaya>({ method: 'GET', path: PATH }, { signal }), { staleTime: 60_000, ...opts });
}

// ================================================================ Kelompok isian
type Kelompok = 'identitas' | 'keluarga' | 'alamat' | 'kontak';
const KELOMPOK: Record<Kelompok, { title: string; description: string; icon: React.ReactNode; kolom: string[] }> = {
  identitas: { title: 'Identitas', description: 'NIK, NISN, NPWP', icon: <IdCard />, kolom: ['nik', 'nik_dosen', 'nisn', 'npwp'] },
  keluarga: { title: 'Keluarga', description: 'Nama orang tua', icon: <Users />, kolom: ['nama_ibu_kandung', 'nama_ibu', 'nama_ayah'] },
  alamat: { title: 'Alamat', description: 'Tempat tinggal saat ini', icon: <Home />, kolom: ['alamat', 'dusun', 'rt', 'rw', 'desa', 'kecamatan', 'kode_pos', 'jenis_tinggal'] },
  kontak: { title: 'Kontak', description: 'Nomor HP dan email', icon: <Phone />, kolom: ['hp', 'email'] },
};
const kelompokDari = (kolom: string): Kelompok => (Object.keys(KELOMPOK) as Kelompok[]).find((k) => KELOMPOK[k].kolom.includes(kolom)) ?? 'identitas';

const ALASAN: Record<string, string> = { kosong: 'Belum diisi', tidak_sah: 'Format belum sesuai', ganda: 'Sama dengan data orang lain' };

const PETUNJUK: Record<
  string,
  {
    description?: string;
    placeholder?: string;
    inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
    maxLength?: number;
    filter?: (v: string) => string;
    span?: boolean;
    multiline?: boolean;
    type?: string;
  }
> = {
  nik: { description: '16 digit sesuai KTP/KK.', inputMode: 'numeric', maxLength: 16, filter: (v) => v.replace(/\D/g, '') },
  nik_dosen: { description: '16 digit sesuai KTP.', inputMode: 'numeric', maxLength: 16, filter: (v) => v.replace(/\D/g, '') },
  nisn: { description: '10 digit, lihat di ijazah atau nisn.data.kemdikbud.go.id.', inputMode: 'numeric', maxLength: 10, filter: (v) => v.replace(/\D/g, '') },
  npwp: { description: '15 atau 16 digit.', inputMode: 'numeric', maxLength: 16, filter: (v) => v.replace(/\D/g, '') },
  nama_ibu_kandung: { description: 'Sesuai akta kelahiran/KK. Dipakai untuk verifikasi ijazah di PDDikti.', span: true },
  nama_ibu: { description: 'Sesuai akta kelahiran/KK.', span: true },
  nama_ayah: { span: true },
  alamat: { description: 'Nama jalan, nomor rumah, atau patokan.', span: true, multiline: true },
  rt: { inputMode: 'numeric', maxLength: 3, filter: (v) => v.replace(/\D/g, '') },
  rw: { inputMode: 'numeric', maxLength: 3, filter: (v) => v.replace(/\D/g, '') },
  kode_pos: { inputMode: 'numeric', maxLength: 5, filter: (v) => v.replace(/\D/g, '') },
  hp: { description: 'Nomor aktif, sebaiknya WhatsApp.', inputMode: 'tel', placeholder: '08xx', filter: (v) => v.replace(/[^\d+]/g, '') },
  email: { type: 'email', placeholder: 'nama@contoh.com' },
  kecamatan: { span: true },
};

interface Wilayah {
  kode: string;
  nama: string;
  kabupaten?: string;
}

function IsianKelengkapan({
  isian,
  value,
  onChange,
  error,
  jenisTinggal,
}: {
  isian: IsianKurang;
  value: string;
  onChange: (v: string, label?: string) => void;
  error?: string;
  jenisTinggal: Array<{ value: string; label: string }>;
}) {
  const siakad = useSiakad();
  const p = PETUNJUK[isian.kolom] ?? {};
  const [wil, setWil] = React.useState<Wilayah | null>(null);
  const loadWil = React.useCallback(
    async (q: string, signal: AbortSignal) => (await siakad.request<Wilayah[]>({ method: 'GET', path: '/v1/kelengkapan/referensi/wilayah', query: { q }, public: true }, { signal })).data,
    [siakad],
  );
  const desc = (
    <>
      {isian.alasan !== 'kosong' && <span className="u-kl-alasan">{ALASAN[isian.alasan] ?? isian.alasan}. </span>}
      {p.description}
    </>
  );
  let control: React.ReactNode;
  if (isian.kolom === 'kecamatan')
    control = (
      <Combobox<Wilayah>
        loadItems={loadWil}
        minQueryLength={3}
        hintText="Ketik minimal 3 huruf nama kecamatan atau kabupaten."
        placeholder="Cari kecamatan"
        value={wil}
        itemToString={(w) => w.nama}
        itemKey={(w) => w.kode}
        renderItem={(w) => (
          <span style={{ display: 'grid' }}>
            <span>{w.nama}</span>
            <span style={{ fontSize: 12, color: 'var(--u-muted-foreground)' }}>{w.kabupaten}</span>
          </span>
        )}
        onValueChange={(w) => {
          setWil(w);
          onChange(w?.kode ?? '', w ? `${w.nama}${w.kabupaten ? `, ${w.kabupaten}` : ''}` : undefined);
        }}
      />
    );
  else if (isian.kolom === 'jenis_tinggal') control = <Select options={jenisTinggal} value={value || null} onValueChange={(v) => onChange(v ?? '', jenisTinggal.find((o) => o.value === v)?.label)} />;
  else if (p.multiline) control = <Textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} />;
  else
    control = (
      <Input value={value} type={p.type} inputMode={p.inputMode} maxLength={p.maxLength} placeholder={p.placeholder} onChange={(e) => onChange(p.filter ? p.filter(e.target.value) : e.target.value)} />
    );
  return (
    <Field label={isian.label} required={isian.wajib} optional={!isian.wajib} description={desc} error={error} style={p.span ? { gridColumn: '1 / -1' } : undefined}>
      {control}
    </Field>
  );
}

// ================================================================ Kartu profil
function RingFoto({ nama, foto, persen, size = 88 }: { nama: string; foto?: string | null; persen: number; size?: number }) {
  const t = 4;
  const r = (size - t) / 2;
  const c = 2 * Math.PI * r;
  const tone = persen >= 100 ? 'var(--u-success)' : persen >= 70 ? 'var(--u-primary)' : 'var(--u-warning)';
  return (
    <span className="u-kl-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--u-border)" strokeWidth={t} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={t}
          strokeLinecap="round"
          strokeDasharray={`${(c * Math.min(100, persen)) / 100} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <Avatar name={nama} src={foto} size="xl" className="u-kl-avatar" />
      <span className="u-kl-pct" style={{ background: tone }}>
        {persen}%
      </span>
    </span>
  );
}

export interface KartuProfilKelengkapanProps {
  data: KelengkapanSaya;
  pengguna?: PenggunaKelengkapan;
  /** Tombol aksi, mis. "Lengkapi data". */
  action?: React.ReactNode;
  className?: string;
}

/** Kartu profil: foto dengan cincin persen kelengkapan, nama, NIM/NIDN, dan ringkasan isian yang kurang. */
export function KartuProfilKelengkapan({ data, pengguna, action, className }: KartuProfilKelengkapanProps) {
  const nama = pengguna?.nama ?? data.nama;
  const wajib = data.kurang.filter((k) => k.wajib).length;
  return (
    <div className={cn('u-kl-card', className)} data-lengkap={data.lengkap ? '' : undefined}>
      <RingFoto nama={nama} foto={pengguna?.foto} persen={data.persen_wajib} />
      <div className="u-kl-who">
        <p className="u-kl-name">
          {nama}
          {data.lengkap && <BadgeCheck aria-label="Data lengkap" />}
        </p>
        <p className="u-kl-sub">
          <span className="u-kl-id">
            {data.entitas === 'dosen' ? 'NIDN' : 'NIM'} {data.kunci}
          </span>
          {pengguna?.keterangan ?? (data.kode_prodi ? <span>Prodi {data.kode_prodi}</span> : null)}
        </p>
        <p className="u-kl-status">
          {data.lengkap ? (
            'Data wajib PDDikti sudah lengkap.'
          ) : (
            <>
              <CircleAlert aria-hidden /> {wajib} isian wajib belum lengkap
            </>
          )}
        </p>
      </div>
      {action && <div className="u-kl-action">{action}</div>}
    </div>
  );
}

// ================================================================ Wizard
export interface WizardKelengkapanProps {
  pengguna?: PenggunaKelengkapan;
  /** Setelah semua isian tersimpan. */
  onSelesai?: (data: KelengkapanSaya) => void;
  /** Tombol "Nanti saja" di layar sambutan. */
  onLewati?: () => void;
  /** Kontak BAK/SDM untuk isian yang tidak bisa diubah sendiri. */
  kontakPetugas?: React.ReactNode;
  className?: string;
}

/**
 * Wizard kelengkapan data dari `GET /v1/kelengkapan/saya`: kartu profil berfoto dengan persen kelengkapan,
 * langkah dibentuk otomatis dari isian yang kurang (identitas, keluarga, alamat, kontak), lalu semua isian
 * dikirim sekaligus ke `POST /v1/kelengkapan/saya`. Galat 422 kembali ke langkah dan isian yang salah.
 */
export function WizardKelengkapan({ pengguna, onSelesai, onLewati, kontakPetugas, className }: WizardKelengkapanProps) {
  const siakad = useSiakad();
  const q = useKelengkapanSaya();
  const ref = useSiakadQuery<{ jenis_tinggal: Record<string, string> }>(
    ['kelengkapan-referensi'],
    (s, signal) => s.request({ method: 'GET', path: '/v1/kelengkapan/referensi', public: true }, { signal }),
    { staleTime: 3_600_000 },
  );
  const [mulai, setMulai] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [nilai, setNilai] = React.useState<Record<string, string>>({});
  const [label, setLabel] = React.useState<Record<string, string>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [hasil, setHasil] = React.useState<KelengkapanSaya | null>(null);

  if (q.error)
    return (
      <Alert variant="danger" title="Kelengkapan data tidak bisa diperiksa">
        {pesanGalat(q.error)}
      </Alert>
    );
  if (!q.data)
    return (
      <div className={cn('u-kl', className)} aria-busy>
        <div className="u-kl-card">
          <Skeleton shape="circle" style={{ width: 88, height: 88 }} />
          <div style={{ flex: 1, display: 'grid', gap: 8 }}>
            <Skeleton style={{ height: 18, width: '50%' }} />
            <Skeleton style={{ height: 14, width: '35%' }} />
          </div>
        </div>
      </div>
    );

  const data = hasil ?? q.data;
  const sendiri = data.kurang.filter((k) => k.bisa_diisi_sendiri);
  const petugas = data.kurang.filter((k) => !k.bisa_diisi_sendiri);
  const jenisTinggal = Object.entries(ref.data?.jenis_tinggal ?? {}).map(([value, label]) => ({ value, label }));
  const grup = (Object.keys(KELOMPOK) as Kelompok[]).map((k) => ({ k, isian: sendiri.filter((i) => kelompokDari(i.kolom) === k) })).filter((g) => g.isian.length);

  const PanelPetugas = petugas.length > 0 && (
    <div className="u-kl-petugas">
      <p>
        <Lock aria-hidden /> Perlu diubah petugas {data.entitas === 'dosen' ? 'SDM' : 'BAK'} dengan dokumen
      </p>
      <ul>
        {petugas.map((k) => (
          <li key={k.kolom}>
            {k.label}
            <span>{ALASAN[k.alasan] ?? k.alasan}</span>
          </li>
        ))}
      </ul>
      {kontakPetugas && <div className="u-kl-kontak">{kontakPetugas}</div>}
    </div>
  );

  // ---- selesai / sudah lengkap
  if (hasil || !data.perlu_wizard || !sendiri.length) {
    return (
      <div className={cn('u-kl', className)}>
        <KartuProfilKelengkapan data={data} pengguna={pengguna} />
        {hasil && (
          <Alert variant="success" title="Terima kasih, data Anda tersimpan">
            Perubahan langsung tercatat di SIAKAD dan ikut dilaporkan ke PDDikti pada sinkronisasi berikutnya.
          </Alert>
        )}
        {PanelPetugas}
      </div>
    );
  }

  // ---- sambutan
  if (!mulai) {
    return (
      <div className={cn('u-kl', className)}>
        <KartuProfilKelengkapan
          data={data}
          pengguna={pengguna}
          action={
            <>
              {onLewati && (
                <Button variant="ghost" onClick={onLewati}>
                  Nanti saja
                </Button>
              )}
              <Button onClick={() => setMulai(true)}>
                Lengkapi sekarang <ArrowRight />
              </Button>
            </>
          }
        />
        <div className="u-kl-groups">
          {grup.map((g) => (
            <div key={g.k} className="u-kl-group">
              <span className="u-kl-group-icon">{KELOMPOK[g.k].icon}</span>
              <div>
                <p>{KELOMPOK[g.k].title}</p>
                <span>{g.isian.map((i) => i.label).join(', ')}</span>
              </div>
            </div>
          ))}
        </div>
        {PanelPetugas}
      </div>
    );
  }

  const ubah = (kolom: string) => (v: string, l?: string) => {
    setNilai((x) => ({ ...x, [kolom]: v }));
    if (l !== undefined) setLabel((x) => ({ ...x, [kolom]: l }));
    setErrors((e) => {
      const n = { ...e };
      delete n[kolom];
      return n;
    });
  };
  const cekLangkah = (isian: IsianKurang[]) => () => {
    const kosong = isian.filter((i) => i.wajib && !(nilai[i.kolom] ?? '').trim());
    if (kosong.length) {
      setErrors((e) => ({ ...e, ...Object.fromEntries(kosong.map((i) => [i.kolom, 'Wajib diisi.'])) }));
      return `Lengkapi ${kosong.map((i) => i.label).join(', ')}.`;
    }
  };

  const steps: WizardStep[] = [
    ...grup.map((g) => ({
      id: g.k,
      title: KELOMPOK[g.k].title,
      description: g.isian.map((i) => i.label).join(', '),
      error: g.isian.some((i) => errors[i.kolom] && errors[i.kolom] !== 'Wajib diisi.'),
      content: (
        <FormGrid>
          {g.isian.map((i) => (
            <IsianKelengkapan key={i.kolom} isian={i} value={nilai[i.kolom] ?? ''} onChange={ubah(i.kolom)} error={errors[i.kolom]} jenisTinggal={jenisTinggal} />
          ))}
        </FormGrid>
      ),
      onNext: cekLangkah(g.isian),
    })),
    {
      id: 'tinjau',
      title: 'Tinjau & simpan',
      description: 'Periksa sebelum disimpan',
      content: (
        <WizardReview
          sections={grup.map((g, idx) => ({
            title: KELOMPOK[g.k].title,
            onEdit: () => setStep(idx),
            items: g.isian.map((i) => ({ label: i.label, value: label[i.kolom] ?? nilai[i.kolom] })),
          }))}
        />
      ),
    },
  ];

  return (
    <div className={cn('u-kl', className)}>
      <KartuProfilKelengkapan data={data} pengguna={pengguna} />
      <Wizard
        steps={steps}
        step={step}
        onStepChange={setStep}
        title="Lengkapi data"
        description="Isian ini wajib dilaporkan ke PDDikti. Hanya isian yang kurang yang ditanyakan."
        aside={petugas.length ? PanelPetugas : undefined}
        finishLabel="Simpan data"
        onFinish={async () => {
          const body = Object.fromEntries(Object.entries(nilai).filter(([, v]) => v.trim() !== ''));
          if (!Object.keys(body).length) return 'Belum ada isian yang diisi.';
          try {
            const res = await siakad.request<KelengkapanSaya>({ method: 'POST', path: PATH, body });
            invalidateSiakad('kelengkapan');
            setHasil(res.data);
            onSelesai?.(res.data);
          } catch (e) {
            const err = e as { status?: number; details?: Record<string, unknown> };
            if (err.status === 422 && err.details && Object.keys(err.details).length) {
              setErrors(Object.fromEntries(Object.entries(err.details).map(([k, v]) => [k, String(v)])));
              const idx = grup.findIndex((g) => g.isian.some((i) => i.kolom in err.details!));
              if (idx >= 0) setStep(idx);
              return 'Ada isian yang belum sesuai. Periksa yang ditandai merah.';
            }
            return pesanGalat(e);
          }
        }}
      />
    </div>
  );
}

/** Pengingat ringkas untuk dasbor: tampil hanya bila `perlu_wizard`. */
export function PengingatKelengkapan({ pengguna, href, onBuka, className }: { pengguna?: PenggunaKelengkapan; href?: string; onBuka?: () => void; className?: string }) {
  const { data } = useKelengkapanSaya();
  if (!data || !data.perlu_wizard) return null;
  return (
    <KartuProfilKelengkapan
      className={cn('u-kl-reminder', className)}
      data={data}
      pengguna={pengguna}
      action={
        <Button size="sm" onClick={onBuka} render={href ? <a href={href} /> : undefined}>
          Lengkapi data <ArrowRight />
        </Button>
      }
    />
  );
}
