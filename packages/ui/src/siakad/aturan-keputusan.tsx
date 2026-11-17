'use client';
import * as React from 'react';
import { BadgeCheck, CircleAlert, CircleX, ExternalLink, FileBadge, Lock, Pencil, ShieldAlert, ShieldCheck, Siren, Unlock, UserCheck } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Card, Empty } from '../components/display';
import { Field, Input, SegmentedControl, Textarea } from '../components/forms';
import { IsianTanggal, PanelForm, Pilihan, PilihanBanyak } from '../components/formulir';
import { ConfirmDialog, useToast } from '../components/overlays';
import {
  formatWaktuAturan,
  useAturanSaya,
  useDaftarAturan,
  useKatalogAturan,
  labelKategoriAturan,
  type Aturan,
  type HasilPeriksaAturan,
  type KategoriAturan,
  type PelanggaranAturan,
  type PengecualianAturan,
  type SifatAturan,
} from './aturan';
import { PilihTahunAkademik } from './cari';
import { CariAtauUnggahDokumen } from './cari-dokumen';
import { GalatApi } from './galat';
import { IsianSK, type NilaiSK } from './isian-sk';
import { PilihEntitas } from './pilih';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

/*
 * Keputusan pemilik atas aturan dinamis: pejabat penyetuju per kategori (bisa beberapa jabatan), jalur darurat
 * (aktif dulu, disahkan susulan), dan sifat aturan (ketat atau boleh pengecualian berdokumen) beserta pengajuan dan
 * antrean pengecualiannya. Semua field dari SIAKAD terbaru bersifat opsional; endpoint yang belum ada ditangani
 * sebagai "belum tersedia", bukan galat.
 */

// ================================================================ Sifat
export const LABEL_SIFAT_ATURAN: Record<SifatAturan, { label: string; keterangan: string }> = {
  ketat: { label: 'Ketat', keterangan: 'Tidak bisa dilewati siapa pun, kecuali dispensasi keuangan resmi.' },
  boleh_pengecualian: {
    label: 'Boleh pengecualian',
    keterangan: 'Orang yang terkena aturan, atau petugas atas namanya, bisa mengajukan pengecualian dengan SK atau dokumen kebijakan. Pengecualian punya masa berlaku dan cakupan.',
  },
};

/** Lencana sifat aturan (Ketat / Boleh pengecualian). Tidak tampil bila server belum mengirim `sifat`. */
export function SifatAturanBadge({ sifat }: { sifat?: SifatAturan | null }) {
  if (!sifat) return null;
  return sifat === 'ketat' ? (
    <Badge variant="outline" className="u-aturan-sifat" data-sifat="ketat">
      <Lock aria-hidden /> Ketat
    </Badge>
  ) : (
    <Badge variant="outline" className="u-aturan-sifat" data-sifat="boleh_pengecualian">
      <Unlock aria-hidden /> Boleh pengecualian
    </Badge>
  );
}

/** Lencana aturan yang aktif lewat jalur darurat (menunggu pengesahan susulan). */
export function DaruratAturanBadge({ aturan: a }: { aturan: Pick<Aturan, 'darurat' | 'darurat_info'> }) {
  if (!a.darurat) return null;
  return (
    <Badge variant="danger" className="u-aturan-mode">
      <Siren aria-hidden /> {a.darurat_info?.label ?? 'Aktif lewat jalur darurat'}
    </Badge>
  );
}

/**
 * Pilihan sifat aturan untuk wizard: kartu Ketat dan Boleh pengecualian dengan penjelasan awam, dan (bila boleh
 * pengecualian) peran yang menyetujui pengajuan pengecualian; kosong = pengatur langkah ini.
 */
export function PilihSifatAturan({
  value,
  onValueChange,
  penyetuju,
  onPenyetujuChange,
}: {
  value: SifatAturan;
  onValueChange: (v: SifatAturan) => void;
  penyetuju: string[];
  onPenyetujuChange: (v: string[]) => void;
}) {
  const peran = usePeranRbac();
  return (
    <div className="u-aturan-sifat-pilih">
      <div className="u-aturan-mode-kisi" role="radiogroup" aria-label="Sifat aturan">
        {(['ketat', 'boleh_pengecualian'] as SifatAturan[]).map((s) => (
          <button key={s} type="button" role="radio" aria-checked={value === s} className="u-aturan-mode-opsi" data-sifat={s} data-pilih={value === s || undefined} onClick={() => onValueChange(s)}>
            <span aria-hidden>{s === 'ketat' ? <Lock /> : <Unlock />}</span>
            <strong>{LABEL_SIFAT_ATURAN[s].label}</strong>
            <span>{LABEL_SIFAT_ATURAN[s].keterangan}</span>
          </button>
        ))}
      </div>
      {value === 'boleh_pengecualian' && (
        <Field label="Yang menyetujui pengecualian" optional description="Kosong = pengatur langkah ini.">
          <PilihanBanyak
            options={(peran.data ?? []).map((p) => ({ value: p.kode, label: p.nama, description: p.kode }))}
            value={penyetuju}
            onValueChange={onPenyetujuChange}
            placeholder="Pengatur langkah ini"
          />
        </Field>
      )}
    </div>
  );
}

function usePeranRbac() {
  return useSiakadQuery<Array<{ kode: string; nama: string }>>(
    ['rbac', 'peran'],
    (s, signal) => s.request<Array<{ kode: string; nama: string }>>({ method: 'GET', path: '/v1/rbac/peran', query: { per_page: 200 } }, { signal }),
    { staleTime: 5 * 60_000 },
  );
}

const belumAda = (e: unknown) => [404, 405].includes((e as { status?: number } | null)?.status ?? 0);

// ================================================================ Pejabat penyetuju
export interface PejabatPenyetuju {
  jabatan: string;
  nama_jabatan?: string | null;
  username?: string | null;
  nama?: string | null;
}
export interface PenyetujuKategoriAturan {
  kategori: KategoriAturan;
  judul?: string;
  bidang?: string | null;
  /** Jabatan pertama (SIAKAD lama). */
  jabatan?: string | string[] | null;
  /** Beberapa jabatan; salah satu pejabatnya cukup untuk menyetujui. */
  jabatan_daftar?: string[] | null;
  keterangan?: string | null;
  telaah_spmi?: boolean;
  /** Pejabat saat ini per jabatan; kosong = belum diisi di data induk. */
  pejabat?: PejabatPenyetuju[];
  penyetuju?: {
    rektor?: boolean;
    keterangan?: string | null;
    orang?: Array<{ username: string; nama?: string | null; sebagai?: string | null }>;
    /** Pejabat aktif tiap jabatan; `username` kosong = belum bisa menyetujui. */
    jabatan_rinci?: Array<{ kode: string; nama?: string | null; pejabat: Array<{ username: string | null; nama?: string | null; plt?: boolean; bisa_menyetujui?: boolean }> }>;
    /** Sudah ada orang yang bisa menyetujui. */
    siap?: boolean;
    /** Tempat mengisi pejabat. */
    isi_di?: Array<{ aplikasi: string; menu: string; path?: string; api?: string; langkah?: string }>;
  } | null;
  /** Petunjuk dan tautan tempat mengisi pejabat. */
  petunjuk?: string | null;
  tautan_pejabat?: string | null;
}

const JABATAN_UMUM = [
  { value: 'REKTOR', label: 'Rektor' },
  { value: 'WR1', label: 'Wakil Rektor I (akademik)' },
  { value: 'WR2', label: 'Wakil Rektor II (keuangan dan SDM)' },
  { value: 'WR3', label: 'Wakil Rektor III (kemahasiswaan)' },
  { value: 'WR4', label: 'Wakil Rektor IV (penelitian dan kerja sama)' },
];

export const daftarJabatanPenyetuju = (r: Pick<PenyetujuKategoriAturan, 'jabatan' | 'jabatan_daftar'>): string[] =>
  r.jabatan_daftar?.length ? r.jabatan_daftar : Array.isArray(r.jabatan) ? r.jabatan : r.jabatan ? [r.jabatan] : [];

type OrangPejabat = { username?: string | null; nama?: string | null; plt?: boolean };
/** Pejabat per jabatan: dari `penyetuju.jabatan_rinci` (SIAKAD terbaru), `pejabat`, atau `penyetuju.orang`. */
function pejabatPer(r: PenyetujuKategoriAturan): Array<{ jabatan: string; nama?: string | null; orang: OrangPejabat[] }> {
  return daftarJabatanPenyetuju(r).map((j) => {
    const rinci = r.penyetuju?.jabatan_rinci?.find((k) => k.kode === j);
    if (rinci) return { jabatan: j, nama: rinci.nama, orang: rinci.pejabat };
    const dariPejabat = (r.pejabat ?? []).filter((p) => p.jabatan === j && (p.username || p.nama));
    const dariOrang = (r.penyetuju?.orang ?? []).filter((o) => (o.sebagai ?? '').toUpperCase().includes(j.toUpperCase()));
    return { jabatan: j, orang: dariPejabat.length ? dariPejabat : dariOrang };
  });
}
const bisaSetujui = (o: OrangPejabat) => Boolean(o.username);

/**
 * Pejabat penyetuju aturan per kategori (GET/POST /v1/aturan/penyetuju): jabatan yang dipetakan (salah satu cukup),
 * pejabat yang menjabat sekarang, peringatan bila kosong (persetujuan jatuh ke Rektor), ubah pemetaan untuk admin, dan
 * tautan ke tempat mengisi pejabat.
 */
export function PejabatPenyetujuAturan({
  tautanPejabat,
  className,
}: {
  /** Halaman pengisian pejabat, mis. https://pustikom.unipo.ac.id/induk/pejabat. */ tautanPejabat?: string;
  className?: string;
}) {
  const q = useSiakadQuery<PenyetujuKategoriAturan[]>(['aturan', 'penyetuju'], (s, signal) => s.request<PenyetujuKategoriAturan[]>({ method: 'GET', path: '/v1/aturan/penyetuju' }, { signal }));
  const saya = useAturanSaya();
  const [ubah, setUbah] = React.useState<PenyetujuKategoriAturan | null>(null);
  if (q.error && belumAda(q.error)) return <Alert className={className}>Server SIAKAD ini belum mendukung pengaturan pejabat penyetuju.</Alert>;
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  if (!q.data) return <Skeleton height={240} className={className} />;
  const tautan = (r: PenyetujuKategoriAturan) => r.tautan_pejabat ?? tautanPejabat;
  const siap = (r: PenyetujuKategoriAturan) => r.penyetuju?.siap ?? pejabatPer(r).some((p) => p.orang.some(bisaSetujui));
  const kosong = q.data.filter((r) => !siap(r));
  const isiDi = q.data.find((r) => r.penyetuju?.isi_di?.length)?.penyetuju?.isi_di ?? [];
  const rektor = (r: PenyetujuKategoriAturan) => {
    const rk = r.penyetuju?.jabatan_rinci?.find((k) => k.kode === 'REKTOR')?.pejabat.filter(bisaSetujui) ?? [];
    return rk.length ? rk : (r.penyetuju?.orang ?? []);
  };
  return (
    <div className={cn('u-aturan-penyetuju', className)}>
      <p className="u-aturan-sub">Aturan baru dan perubahan aturan berlaku setelah disetujui salah satu pejabat di bawah. Bila belum ada pejabat yang bisa menyetujui, persetujuan jatuh ke Rektor.</p>
      {kosong.length > 0 && (
        <Alert
          variant="warning"
          title={`${kosong.length} kategori belum punya pejabat yang bisa menyetujui`}
          actions={
            tautanPejabat ? (
              <Button size="sm" variant="outline" render={<a href={tautanPejabat} target="_blank" rel="noreferrer" />}>
                Isi pejabat <ExternalLink />
              </Button>
            ) : undefined
          }
        >
          {kosong.map((r) => labelKategoriAturan(r.kategori)).join(', ')}. Aturan di kategori ini menunggu persetujuan Rektor sampai pejabatnya diisi.
          {isiDi.length > 0 ? (
            <ul className="u-aturan-isi-di">
              {isiDi.map((x, k) => (
                <li key={k}>
                  <strong>
                    {x.aplikasi} » {x.menu}
                  </strong>
                  {x.langkah && <span>{x.langkah}</span>}
                </li>
              ))}
            </ul>
          ) : (
            ' Isi di Pustikom » Modul Pusat data (induk) » Pejabat struktural.'
          )}
        </Alert>
      )}
      <div className="u-aturan-penyetuju-tabel" role="table" aria-label="Pejabat penyetuju per kategori">
        <div role="row" className="u-aturan-penyetuju-kepala">
          <span role="columnheader">Kategori</span>
          <span role="columnheader">Jabatan penyetuju</span>
          <span role="columnheader">Pejabat saat ini</span>
          <span role="columnheader" aria-label="Aksi" />
        </div>
        {q.data.map((r) => {
          const per = pejabatPer(r);
          const ok = siap(r);
          const rk = rektor(r);
          return (
            <div role="row" key={r.kategori} className="u-aturan-penyetuju-baris" data-kosong={!ok || undefined}>
              <span role="cell">
                <strong>{labelKategoriAturan(r.kategori)}</strong>
                {r.telaah_spmi === false && <em>Tanpa telaah SPMI</em>}
              </span>
              <span role="cell" className="u-aturan-penyetuju-jabatan">
                {per.length ? (
                  per.map((p) => (
                    <Badge key={p.jabatan} variant="outline" title={p.nama ?? p.jabatan}>
                      {labelJabatan(p.jabatan)}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline">Rektor</Badge>
                )}
              </span>
              <span role="cell" className="u-aturan-penyetuju-orang">
                {per.flatMap((p) =>
                  p.orang.map((o, i) => (
                    <span key={`${p.jabatan}-${i}`} data-tanpa-akun={!bisaSetujui(o) || undefined}>
                      {bisaSetujui(o) ? <UserCheck aria-hidden /> : <CircleAlert aria-hidden />} {o.nama ?? o.username}
                      {o.plt ? ' (Plt)' : ''} <em>{labelJabatan(p.jabatan)}</em>
                      {!bisaSetujui(o) && <em>belum punya akun, belum bisa menyetujui</em>}
                    </span>
                  )),
                )}
                {!ok && (
                  <span className="u-aturan-penyetuju-kosong">
                    <CircleAlert aria-hidden />
                    {per.some((p) => p.orang.length) ? 'Pejabat belum punya akun SIAKAD' : 'Belum ada pejabat'}; persetujuan jatuh ke Rektor
                    {rk.length ? ` (${rk.map((o) => o.nama ?? o.username).join(', ')})` : ''}.{' '}
                    {r.petunjuk ??
                      (tautan(r) ? (
                        <a href={tautan(r)} target="_blank" rel="noreferrer">
                          Isi pejabat
                        </a>
                      ) : null)}
                  </span>
                )}
              </span>
              <span role="cell">
                {saya.data?.admin && (
                  <Button variant="ghost" size="sm" onClick={() => setUbah(r)}>
                    <Pencil /> Ubah
                  </Button>
                )}
              </span>
            </div>
          );
        })}
      </div>
      {ubah && <FormPenyetuju baris={ubah} onTutup={() => setUbah(null)} />}
    </div>
  );
}

function labelJabatan(kode: string) {
  return JABATAN_UMUM.find((j) => j.value === kode)?.label.replace(/ \(.*\)$/, '') ?? kode;
}

function FormPenyetuju({ baris: r, onTutup }: { baris: PenyetujuKategoriAturan; onTutup: () => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const opsiJabatan = useSiakadQuery<Array<{ kode: string; nama: string }>>(
    ['induk', 'jabatan'],
    (s, signal) => s.request<Array<{ kode: string; nama: string }>>({ method: 'GET', path: '/v1/induk/jabatan', query: { per_page: 200 } }, { signal }),
    { staleTime: 10 * 60_000 },
  );
  const awal = daftarJabatanPenyetuju(r);
  const [jabatan, setJabatan] = React.useState<string[]>(awal);
  const dariRinci = (r.penyetuju?.jabatan_rinci ?? []).map((k) => ({ value: k.kode, label: k.nama ?? k.kode }));
  const opsi = opsiJabatan.data?.length
    ? opsiJabatan.data.map((j) => ({ value: j.kode, label: j.nama, description: j.kode }))
    : [...JABATAN_UMUM.filter((j) => !dariRinci.some((d) => d.value === j.value)), ...dariRinci];
  return (
    <PanelForm
      open
      onOpenChange={(o) => !o && onTutup()}
      tampilan="dialog"
      title={`Penyetuju aturan ${labelKategoriAturan(r.kategori).toLowerCase()}`}
      description="Pilih satu atau beberapa jabatan. Salah satu pejabatnya cukup untuk menyetujui. Kosong = Rektor."
      berubah={JSON.stringify(jabatan) !== JSON.stringify(awal)}
      labelSimpan="Simpan penyetuju"
      onSimpan={async () => {
        await siakad.request({
          method: 'POST',
          path: '/v1/aturan/penyetuju',
          body: { penyetuju: [{ kategori: r.kategori, bidang: r.bidang ?? null, jabatan, keterangan: r.keterangan ?? null }] },
        });
        invalidateSiakad('aturan');
        toast.add({ title: 'Penyetuju disimpan', type: 'success' });
        onTutup();
      }}
    >
      <Field label="Jabatan penyetuju" description="Pejabatnya diambil dari data induk pejabat yang sedang menjabat.">
        <PilihanBanyak options={opsi} value={jabatan} onValueChange={setJabatan} placeholder="Rektor" />
      </Field>
    </PanelForm>
  );
}

// ================================================================ Jalur darurat
/**
 * Aktifkan aturan lewat jalur darurat (POST /v1/aturan/{id}/darurat): alasan dan SK atau dokumen wajib. Aturan langsung
 * berlaku dan masuk antrean pengesahan susulan penyetuju. Hanya untuk pemegang izin `aturan.darurat`.
 */
export function AktifkanDaruratAturan({
  aturan: a,
  open,
  onOpenChange,
  trigger,
  onSelesai,
}: {
  aturan: Pick<Aturan, 'id' | 'nama' | 'titik_judul' | 'titik'> & { lampiran?: Array<{ id: string; jenis: string; nomor: string | null; tanggal: string | null; dilepas_at?: string | null }> };
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  trigger?: React.ReactElement;
  onSelesai?: () => void;
}) {
  const skAda = (a.lampiran ?? []).filter((l) => l.jenis === 'sk' && !l.dilepas_at);
  const siakad = useSiakad();
  const toast = useToast();
  const [inner, setInner] = React.useState(false);
  const isOpen = open ?? inner;
  const [alasan, setAlasan] = React.useState('');
  const [cara, setCara] = React.useState<'sk' | 'lampiran'>('sk');
  const [sk, setSk] = React.useState<NilaiSK | null>(null);
  const [dokumen, setDokumen] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (isOpen && skAda.length) setCara('lampiran');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (isOpen) {
      setAlasan('');
      setSk(null);
      setDokumen(null);
      setGalat({});
    }
  }, [isOpen]);
  return (
    <PanelForm
      open={isOpen}
      onOpenChange={(o) => {
        setInner(o);
        onOpenChange?.(o);
      }}
      trigger={trigger}
      tampilan="dialog"
      size="lg"
      title="Aktifkan lewat jalur darurat"
      description={`“${a.nama}” langsung diperiksa di ${a.titik_judul ?? a.titik} tanpa menunggu persetujuan, lalu masuk antrean pengesahan susulan. Penyetuju bisa mengesahkan atau mencabutnya.`}
      berubah={Boolean(alasan || sk || dokumen)}
      labelSimpan="Aktifkan sekarang"
      onSimpan={async () => {
        const g: Record<string, string> = {};
        if (alasan.trim().length < 10) g.alasan = 'Tulis alasan darurat, minimal 10 karakter.';
        if (cara === 'sk' && !(sk?.nomor && sk.tanggal && sk.berkas_id)) g.sk = 'Lengkapi nomor, tanggal, dan berkas SK.';
        if (cara === 'lampiran' && !dokumen) g.dokumen = 'Pilih SK yang sudah dilampirkan.';
        setGalat(g);
        if (Object.keys(g).length) return 'Periksa isian yang ditandai.';
        try {
          await siakad.request({
            method: 'POST',
            path: `/v1/aturan/${a.id}/darurat`,
            body: { alasan: alasan.trim(), ...(cara === 'sk' ? { sk: { berkas_id: sk!.berkas_id, nomor: sk!.nomor, tanggal: sk!.tanggal, perihal: sk!.perihal ?? null } } : { lampiran_id: dokumen }) },
          });
        } catch (e) {
          if (belumAda(e)) return 'Server SIAKAD ini belum mendukung jalur darurat.';
          throw e;
        }
        invalidateSiakad('aturan');
        toast.add({ title: 'Aturan aktif lewat jalur darurat', description: 'Menunggu pengesahan susulan penyetuju.', type: 'warning' });
        onSelesai?.();
      }}
    >
      <div className="u-aturan-dialog-isi">
        <Alert variant="warning" icon={<Siren />}>
          Pakai hanya bila aturan harus berlaku hari ini dan persetujuan biasa tidak sempat. Pemakaian jalur ini tercatat dan dikabarkan ke penyetuju.
        </Alert>
        <Field label="Alasan darurat" required error={galat.alasan || undefined}>
          <Textarea rows={3} value={alasan} maxLength={1000} onChange={(e) => setAlasan(e.target.value)} placeholder="mis. Pendaftaran KKN dibuka besok dan kuota lokasi sudah ditetapkan SK Rektor." />
        </Field>
        <Field label="Dasar" required>
          <SegmentedControl<'sk' | 'lampiran'>
            aria-label="Jenis dasar"
            value={cara}
            onValueChange={setCara}
            options={[{ value: 'sk', label: 'SK baru dari arsip' }, ...(skAda.length ? [{ value: 'lampiran' as const, label: 'SK yang sudah dilampirkan' }] : [])]}
          />
        </Field>
        {cara === 'sk' ? (
          <IsianSK value={sk} onValueChange={setSk} bolehBaru={false} required error={galat.sk || undefined} />
        ) : (
          <Field label="SK" required error={galat.dokumen || undefined}>
            <Pilihan
              tampilan="daftar"
              options={skAda.map((l) => ({ value: l.id, label: `SK ${l.nomor ?? ''}`.trim(), description: l.tanggal ? formatWaktuAturan(l.tanggal) : undefined }))}
              value={dokumen}
              onValueChange={setDokumen}
              placeholder="Pilih SK"
            />
          </Field>
        )}
      </div>
    </PanelForm>
  );
}

// ================================================================ Ajukan pengecualian
const SUBJEK_PENGECUALIAN: Record<string, { jenis: PengecualianAturan['subjek_jenis']; label: string }> = {
  mahasiswa: { jenis: 'mahasiswa', label: 'Mahasiswa' },
  kelas: { jenis: 'prodi', label: 'Program studi' },
  pegawai: { jenis: 'pegawai', label: 'Pegawai' },
  pendaftar: { jenis: 'pendaftar', label: 'Pendaftar' },
  akun: { jenis: 'akun', label: 'Akun' },
  umum: { jenis: 'prodi', label: 'Program studi' },
};

export type JenisDokumenPengecualian = 'sk' | 'dokumen_kebijakan' | 'bukti_bayar' | 'dokumen';
export const LABEL_DOKUMEN_PENGECUALIAN: Record<JenisDokumenPengecualian, string> = {
  sk: 'SK dari arsip',
  dokumen_kebijakan: 'Dokumen kebijakan',
  bukti_bayar: 'Bukti bayar',
  dokumen: 'Dokumen lain',
};

export interface AjukanPengecualianAturanProps {
  /** Aturan yang ingin dikecualikan. */
  aturan: Pick<Aturan, 'id' | 'nama' | 'titik'> & Partial<Pick<Aturan, 'titik_judul' | 'tahun_id'>>;
  /** Subjek terisi (mis. NIM mahasiswa yang sedang mengajukan). Kosong = dipilih di dialog. */
  subjek?: { jenis: PengecualianAturan['subjek_jenis']; kode: string; nama?: string };
  /** Pesan pelanggaran yang memicu pengajuan, untuk konteks. */
  pesan?: string;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  trigger?: React.ReactElement;
  onTerkirim?: () => void;
}

/**
 * Dialog ajukan pengecualian berdokumen (POST /v1/aturan/{id}/pengecualian/ajukan): subjek, alasan, SK atau dokumen
 * kebijakan, masa berlaku, dan cakupan periode. Pengajuan diputus oleh penyetuju pengecualian aturan itu.
 */
export function AjukanPengecualianAturan({ aturan: a, subjek: subjekTetap, pesan, open, onOpenChange, trigger, onTerkirim }: AjukanPengecualianAturanProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const katalog = useKatalogAturan();
  const t = katalog.data?.titik.find((x) => x.kode === a.titik);
  const jenisSubjek = SUBJEK_PENGECUALIAN[t?.subjek ?? 'mahasiswa'] ?? SUBJEK_PENGECUALIAN.mahasiswa!;
  const [inner, setInner] = React.useState(false);
  const isOpen = open ?? inner;
  const kosong = {
    subjek: subjekTetap?.kode ?? '',
    alasan: '',
    cara: 'sk' as JenisDokumenPengecualian,
    sk: null as NilaiSK | null,
    dokumen: null as string | null,
    nomor: '',
    tanggal: '',
    sampai: '',
    tahun: a.tahun_id ?? '',
  };
  const [isi, setIsi] = React.useState(kosong);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (isOpen) {
      setIsi(kosong);
      setGalat({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  const set = <K extends keyof typeof kosong>(k: K, v: (typeof kosong)[K]) => {
    setIsi((x) => ({ ...x, [k]: v }));
    setGalat((g) => ({ ...g, [k]: '' }));
  };
  return (
    <PanelForm
      open={isOpen}
      onOpenChange={(o) => {
        setInner(o);
        onOpenChange?.(o);
      }}
      trigger={trigger}
      tampilan="dialog"
      size="lg"
      title="Ajukan pengecualian"
      description={`Dari aturan “${a.nama}”${a.titik_judul || t?.judul ? ` di ${a.titik_judul ?? t?.judul}` : ''}. Pengecualian berlaku setelah disetujui dan hanya selama masa berlakunya.`}
      berubah={JSON.stringify(isi) !== JSON.stringify(kosong)}
      labelSimpan="Kirim pengajuan"
      onSimpan={async () => {
        const g: Record<string, string> = {};
        if (!isi.subjek) g.subjek = `Pilih ${jenisSubjek.label.toLowerCase()}.`;
        if (isi.alasan.trim().length < 10) g.alasan = 'Tulis alasan, minimal 10 karakter.';
        if (isi.cara === 'sk' && !(isi.sk?.nomor && isi.sk.tanggal && isi.sk.berkas_id)) g.sk = 'Lengkapi nomor, tanggal, dan berkas SK.';
        if (isi.cara !== 'sk' && !isi.dokumen) g.dokumen = 'Unggah atau pilih dokumennya.';
        if (isi.cara === 'dokumen_kebijakan' && !isi.nomor.trim()) g.nomor = 'Nomor dokumen kebijakan wajib diisi.';
        setGalat(g);
        if (Object.keys(g).length) return 'Periksa isian yang ditandai.';
        try {
          await siakad.request({
            method: 'POST',
            path: `/v1/aturan/${a.id}/pengecualian/ajukan`,
            body: {
              subjek_jenis: subjekTetap?.jenis ?? jenisSubjek.jenis,
              subjek: isi.subjek,
              alasan: isi.alasan.trim(),
              dok_jenis: isi.cara,
              ...(isi.cara === 'sk'
                ? { berkas_id: isi.sk!.berkas_id, dok_nomor: isi.sk!.nomor, dok_tanggal: isi.sk!.tanggal }
                : { berkas_id: isi.dokumen, dok_nomor: isi.nomor.trim() || null, dok_tanggal: isi.tanggal || null }),
              berlaku_sampai: isi.sampai || null,
              tahun_id: isi.tahun || null,
            },
          });
        } catch (e) {
          if (belumAda(e)) return 'Server SIAKAD ini belum menerima pengajuan pengecualian.';
          const f = (e as { fields?: Record<string, unknown> }).fields;
          if (f && Object.keys(f).length) {
            const kunci: Record<string, string> = { berlaku_sampai: 'sampai', tahun_id: 'tahun', dok_nomor: isi.cara === 'sk' ? 'sk' : 'nomor', berkas_id: isi.cara === 'sk' ? 'sk' : 'dokumen' };
            setGalat(Object.fromEntries(Object.entries(f).map(([k, v]) => [kunci[k] ?? k, String(v)])));
            return 'Periksa isian yang ditandai.';
          }
          throw e;
        }
        invalidateSiakad('aturan');
        toast.add({ title: 'Pengajuan pengecualian terkirim', description: 'Anda akan dikabari setelah diputus.', type: 'success' });
        onTerkirim?.();
      }}
    >
      {pesan && (
        <Alert variant="danger" icon={<CircleX />} title="Yang tidak terpenuhi">
          {pesan}
        </Alert>
      )}
      <div className="u-form-kisi" data-kolom="2">
        <Field label={jenisSubjek.label} required className="u-form-lebar" error={galat.subjek || undefined}>
          {subjekTetap ? (
            <p className="u-aturan-nilai-tetap">{subjekTetap.nama ? `${subjekTetap.nama} (${subjekTetap.kode})` : subjekTetap.kode}</p>
          ) : jenisSubjek.jenis === 'mahasiswa' || jenisSubjek.jenis === 'pegawai' || jenisSubjek.jenis === 'prodi' ? (
            <PilihEntitas jenis={jenisSubjek.jenis} value={isi.subjek || null} onValueChange={(v) => set('subjek', v ?? '')} />
          ) : (
            <Input value={isi.subjek} onChange={(e) => set('subjek', e.target.value.trim())} placeholder={jenisSubjek.jenis === 'akun' ? 'Username' : 'Nomor pendaftaran'} />
          )}
        </Field>
        <Field label="Alasan" required className="u-form-lebar" error={galat.alasan || undefined}>
          <Textarea rows={3} value={isi.alasan} maxLength={1000} onChange={(e) => set('alasan', e.target.value)} placeholder="mis. Mahasiswa pertukaran MBKM; SKS diakui lewat SK Dekan." />
        </Field>
        <Field label="Dasar pengecualian" required className="u-form-lebar">
          <Pilihan
            tampilan="tombol"
            required
            options={(Object.keys(LABEL_DOKUMEN_PENGECUALIAN) as JenisDokumenPengecualian[]).map((v) => ({ value: v, label: LABEL_DOKUMEN_PENGECUALIAN[v] }))}
            value={isi.cara}
            onValueChange={(v) => v && set('cara', v as JenisDokumenPengecualian)}
          />
        </Field>
        {isi.cara === 'sk' ? (
          <div className="u-form-lebar">
            <IsianSK value={isi.sk} onValueChange={(v) => set('sk', v)} bolehBaru={false} required error={galat.sk || undefined} />
          </div>
        ) : (
          <>
            <Field label="Dokumen" required className="u-form-lebar" error={galat.dokumen || undefined}>
              <CariAtauUnggahDokumen value={isi.dokumen} onValueChange={(id) => set('dokumen', id)} accept=".pdf,.jpg,.jpeg,.png" placeholder="Cari atau unggah dokumen" />
            </Field>
            <Field
              label={isi.cara === 'bukti_bayar' ? 'Nomor kuitansi' : 'Nomor dokumen'}
              required={isi.cara === 'dokumen_kebijakan'}
              optional={isi.cara !== 'dokumen_kebijakan'}
              error={galat.nomor || undefined}
            >
              <Input value={isi.nomor} maxLength={100} onChange={(e) => set('nomor', e.target.value)} />
            </Field>
            <Field label="Tanggal dokumen" optional>
              <IsianTanggal value={isi.tanggal || null} onValueChange={(v) => set('tanggal', v ?? '')} />
            </Field>
          </>
        )}
        <Field label="Berlaku sampai" optional description="Kosong = sampai dicabut atau aturan berubah." error={galat.sampai || undefined}>
          <IsianTanggal value={isi.sampai || null} onValueChange={(v) => set('sampai', v ?? '')} />
        </Field>
        <Field label="Hanya untuk periode" optional description="Kosong = semua periode selama masa berlaku." error={galat.tahun || undefined}>
          <PilihTahunAkademik value={isi.tahun || null} onValueChange={(v) => set('tahun', v ?? '')} placeholder="Semua periode" />
        </Field>
      </div>
    </PanelForm>
  );
}

// ================================================================ Pesan pelanggaran
/**
 * Pesan aturan yang dilanggar (dari /periksa atau galat 409 `aturan_dilanggar`), dengan tombol "Ajukan pengecualian"
 * di samping pelanggaran yang membawa `boleh_pengecualian: true`. Pakai di aplikasi tempat langkah dijalankan.
 */
export function PesanAturanDilanggar({
  hasil,
  subjek,
  className,
  onTerkirim,
}: {
  hasil: Pick<HasilPeriksaAturan, 'pelanggaran' | 'peringatan' | 'titik'> & Partial<Pick<HasilPeriksaAturan, 'judul'>>;
  /** Subjek pengajuan, mis. `{ jenis: 'mahasiswa', kode: nim }`. Kosong = dipilih di dialog. */
  subjek?: AjukanPengecualianAturanProps['subjek'];
  className?: string;
  onTerkirim?: () => void;
}) {
  const [ajukan, setAjukan] = React.useState<PelanggaranAturan | null>(null);
  const semua: Array<[PelanggaranAturan, 'danger' | 'warning']> = [
    ...hasil.pelanggaran.map((p) => [p, 'danger'] as [PelanggaranAturan, 'danger']),
    ...hasil.peringatan.map((p) => [p, 'warning'] as [PelanggaranAturan, 'warning']),
  ];
  if (!semua.length) return null;
  return (
    <div className={cn('u-aturan-dilanggar', className)}>
      {semua.map(([p, nada]) => (
        <div key={p.id} className="u-aturan-langgar" data-nada={nada}>
          {nada === 'danger' ? <CircleX aria-hidden /> : <CircleAlert aria-hidden />}
          <div>
            <strong>{p.nama}</strong>
            <p>{p.pesan}</p>
            {p.rincian && p.rincian.length > 1 && (
              <ul>
                {p.rincian.map((r, i) => (
                  <li key={i}>{r.pesan}</li>
                ))}
              </ul>
            )}
            {p.sifat === 'ketat' && <span className="u-aturan-langgar-ket">Aturan ketat: tidak bisa diajukan pengecualian.</span>}
          </div>
          {p.boleh_pengecualian && (
            <Button size="sm" variant="outline" className="u-aturan-langgar-aksi" onClick={() => setAjukan(p)}>
              <FileBadge /> Ajukan pengecualian
            </Button>
          )}
        </div>
      ))}
      {ajukan && (
        <AjukanPengecualianAturan
          open
          onOpenChange={(o) => !o && setAjukan(null)}
          aturan={{ id: ajukan.aturan_id ?? ajukan.uuid ?? ajukan.id, nama: ajukan.nama, titik: hasil.titik, titik_judul: hasil.judul ?? null }}
          subjek={subjek}
          pesan={ajukan.pesan}
          onTerkirim={() => {
            setAjukan(null);
            onTerkirim?.();
          }}
        />
      )}
    </div>
  );
}

// ================================================================ Antrean pengecualian
/** Satu pengajuan pengecualian (GET /v1/aturan/pengecualian/ajuan). */
export interface AjuanPengecualianAturan {
  id: string;
  subjek_jenis: PengecualianAturan['subjek_jenis'];
  subjek: string;
  subjek_nama?: string | null;
  tahun_id: string | null;
  berlaku_sampai: string | null;
  alasan: string;
  dokumen: { berkas_id: string; jenis: JenisDokumenPengecualian | string; nomor: string | null; tanggal: string | null } | null;
  status: 'diajukan' | 'disetujui' | 'ditolak' | 'dibatalkan';
  diajukan_oleh: string | null;
  diajukan_at: string | null;
  diputus_oleh: string | null;
  diputus_at: string | null;
  catatan_putusan: string | null;
  aturan: { id: string; nama: string; titik: string; status: string } | null;
  boleh_putus?: boolean;
}
const LABEL_SUBJEK_AJUAN: Record<string, string> = { mahasiswa: 'Mahasiswa', pegawai: 'Pegawai', dosen: 'Dosen', prodi: 'Prodi', pendaftar: 'Pendaftar', akun: 'Akun' };

/** Pengajuan pengecualian: `antrean: 'saya'` untuk yang bisa saya putus, `diajukan_saya` untuk pengajuan saya. */
export function useAjuanPengecualianAturan(filter: { antrean?: 'saya'; status?: AjuanPengecualianAturan['status']; aturan?: string; diajukan_saya?: boolean } = {}) {
  const query = Object.fromEntries(
    Object.entries(filter)
      .filter(([, v]) => v !== undefined && v !== false)
      .map(([k, v]) => [k, v === true ? '1' : String(v)]),
  );
  return useSiakadQuery<AjuanPengecualianAturan[]>(['aturan', 'pengecualian-ajuan', query], (s, signal) =>
    s.request<AjuanPengecualianAturan[]>({ method: 'GET', path: '/v1/aturan/pengecualian/ajuan', query }, { signal }),
  );
}
/**
 * Antrean pengajuan pengecualian yang menunggu keputusan akun ini (GET /v1/aturan/pengecualian?status=diajukan):
 * setujui atau tolak (catatan wajib saat menolak).
 */
export function AntreanPengecualianAturan({ aturanId, className }: { /** Batasi ke satu aturan (UUID). */ aturanId?: string; className?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useAjuanPengecualianAturan({ antrean: 'saya', status: 'diajukan', aturan: aturanId });
  const [putus, setPutus] = React.useState<{ p: AjuanPengecualianAturan; jenis: 'setujui' | 'tolak' } | null>(null);
  const [catatan, setCatatan] = React.useState('');
  const [galat, setGalat] = React.useState('');
  if (q.error && belumAda(q.error)) return <Alert className={className}>Server SIAKAD ini belum mendukung pengajuan pengecualian.</Alert>;
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  if (!q.data) return <Skeleton height={160} className={className} />;
  if (!q.data.length)
    return (
      <Empty
        className={className}
        bordered
        icon={<ShieldCheck />}
        title="Tidak ada pengajuan pengecualian"
        description="Pengajuan dari mahasiswa, pegawai, atau petugas untuk aturan yang boleh dikecualikan akan muncul di sini."
      />
    );
  return (
    <div className={cn('u-aturan-antrean', className)}>
      {q.data.map((p) => (
        <Card key={p.id} className="u-aturan-antrean-baris">
          <span className="u-aturan-ikon" aria-hidden>
            <ShieldAlert />
          </span>
          <div className="u-aturan-antrean-isi">
            <strong>
              {LABEL_SUBJEK_AJUAN[p.subjek_jenis] ?? p.subjek_jenis} {p.subjek_nama ? `${p.subjek_nama} (${p.subjek})` : p.subjek}
            </strong>
            <span>
              {p.aturan?.nama ?? 'Aturan'}
              {p.diajukan_oleh ? ` · diajukan ${p.diajukan_oleh}${p.diajukan_at ? `, ${formatWaktuAturan(p.diajukan_at, { jam: true })}` : ''}` : ''}
            </span>
            <p>{p.alasan}</p>
            <span className="u-aturan-di-titik-sk">
              {[
                p.dokumen
                  ? `${({ sk: 'SK', dokumen_kebijakan: 'Dokumen kebijakan', bukti_bayar: 'Bukti bayar', dokumen: 'Dokumen' } as Record<string, string>)[p.dokumen.jenis] ?? 'Dokumen'}${p.dokumen.nomor ? ` ${p.dokumen.nomor}` : ''}${p.dokumen.tanggal ? ` · ${formatWaktuAturan(p.dokumen.tanggal)}` : ''}`
                  : null,
                p.berlaku_sampai ? `berlaku sampai ${formatWaktuAturan(p.berlaku_sampai)}` : 'tanpa batas tanggal',
                p.tahun_id ? `periode ${p.tahun_id}` : 'semua periode',
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
          <div className="u-aturan-antrean-aksi">
            <Button size="sm" onClick={() => setPutus({ p, jenis: 'setujui' })}>
              <BadgeCheck /> Setujui
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPutus({ p, jenis: 'tolak' })}>
              <CircleX /> Tolak
            </Button>
          </div>
        </Card>
      ))}
      <ConfirmDialog
        open={putus !== null}
        onOpenChange={(o) => {
          if (!o) {
            setPutus(null);
            setCatatan('');
            setGalat('');
          }
        }}
        title={putus?.jenis === 'setujui' ? 'Setujui pengecualian?' : 'Tolak pengecualian?'}
        description={
          putus?.jenis === 'setujui'
            ? `${putus.p.subjek_nama ?? putus.p.subjek} tidak diperiksa aturan “${putus.p.aturan?.nama ?? ''}”${putus.p.berlaku_sampai ? ` sampai ${formatWaktuAturan(putus.p.berlaku_sampai)}` : ''}.`
            : 'Pengaju dikabari beserta catatan Anda.'
        }
        confirmLabel={putus?.jenis === 'setujui' ? 'Setujui' : 'Tolak'}
        tone={putus?.jenis === 'setujui' ? 'primary' : 'danger'}
        onConfirm={async () => {
          if (!putus) return;
          if (putus.jenis === 'tolak' && !catatan.trim()) {
            setGalat('Catatan wajib diisi.');
            throw new Error('Catatan wajib diisi.');
          }
          try {
            await siakad.request({ method: 'POST', path: `/v1/aturan/pengecualian/ajuan/${putus.p.id}/${putus.jenis}`, body: { catatan: catatan.trim() || null } });
          } catch (e) {
            toast.add({ title: 'Gagal', description: pesanGalat(e), type: 'error' });
            throw e;
          }
          invalidateSiakad('aturan');
          setCatatan('');
          toast.add({ title: putus.jenis === 'setujui' ? 'Pengecualian disetujui' : 'Pengecualian ditolak', type: 'success' });
        }}
      >
        <Field label="Catatan" required={putus?.jenis === 'tolak'} optional={putus?.jenis !== 'tolak'} error={galat || undefined}>
          <Textarea
            rows={3}
            value={catatan}
            onChange={(e) => (setCatatan(e.target.value), setGalat(''))}
            placeholder={putus?.jenis === 'tolak' ? 'mis. SK yang dilampirkan bukan untuk periode ini' : 'Masuk riwayat aturan'}
          />
        </Field>
      </ConfirmDialog>
    </div>
  );
}

// ================================================================ Antrean jalur darurat
/** Aturan yang aktif lewat jalur darurat dan menunggu pengesahan susulan akun ini: Sahkan atau Cabut. */
export function AntreanDaruratAturan({ kategori, onBuka, className }: { kategori?: KategoriAturan; onBuka?: (a: Aturan) => void; className?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const d = useDaftarAturan({ antrean: 'persetujuan_saya', kategori, per_page: 100 });
  const [putus, setPutus] = React.useState<{ a: Aturan; jenis: 'sahkan' | 'cabut' } | null>(null);
  const [catatan, setCatatan] = React.useState('');
  const [galat, setGalat] = React.useState('');
  if (d.error && (belumAda(d.error) || (d.error as { status?: number }).status === 422)) return <Alert className={className}>Server SIAKAD ini belum mendukung jalur darurat.</Alert>;
  if (d.error) return <GalatApi error={d.error} onRetry={d.refetch} className={className} />;
  if (!d.data) return <Skeleton height={160} className={className} />;
  const daftar = d.data.filter((a) => a.usulan?.jenis === 'darurat' || a.darurat);
  if (!daftar.length)
    return <Empty className={className} bordered icon={<Siren />} title="Tidak ada aturan jalur darurat" description="Aturan yang diaktifkan lewat jalur darurat menunggu pengesahan Anda di sini." />;
  return (
    <div className={cn('u-aturan-antrean', className)}>
      {daftar.map((a) => (
        <Card key={a.id} className="u-aturan-antrean-baris" data-darurat>
          <span className="u-aturan-ikon" data-jenis={a.jenis} aria-hidden>
            <Siren />
          </span>
          <div className="u-aturan-antrean-isi">
            <div className="u-aturan-detail-lencana">
              <DaruratAturanBadge aturan={{ darurat: true, darurat_info: a.darurat_info }} />
              <SifatAturanBadge sifat={a.sifat} />
            </div>
            <strong>{a.nama}</strong>
            <span>
              {a.titik_judul ?? a.titik} · aktif sejak {formatWaktuAturan(a.darurat_info?.waktu ?? a.diaktifkan_at, { jam: true })}
              {(a.darurat_info?.oleh ?? a.diaktifkan_oleh) ? ` oleh ${a.darurat_info?.oleh ?? a.diaktifkan_oleh}` : ''}
            </span>
            {a.darurat_info?.alasan && <p>Alasan: {a.darurat_info.alasan}</p>}
            {a.sk?.nomor && <span className="u-aturan-di-titik-sk">SK {a.sk.nomor}</span>}
          </div>
          <div className="u-aturan-antrean-aksi">
            <Button size="sm" onClick={() => setPutus({ a, jenis: 'sahkan' })}>
              <BadgeCheck /> Sahkan
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPutus({ a, jenis: 'cabut' })}>
              <CircleX /> Cabut
            </Button>
            {onBuka && (
              <Button size="sm" variant="ghost" onClick={() => onBuka(a)}>
                Lihat detail
              </Button>
            )}
          </div>
        </Card>
      ))}
      <ConfirmDialog
        open={putus !== null}
        onOpenChange={(o) => {
          if (!o) {
            setPutus(null);
            setCatatan('');
            setGalat('');
          }
        }}
        title={putus?.jenis === 'sahkan' ? `Sahkan “${putus.a.nama}”?` : `Cabut “${putus?.a.nama ?? ''}”?`}
        description={putus?.jenis === 'sahkan' ? 'Aturan tetap berlaku sebagai aturan yang disetujui biasa.' : 'Aturan berhenti diperiksa sekarang dan menjadi nonaktif. Pengaktif dikabari.'}
        confirmLabel={putus?.jenis === 'sahkan' ? 'Sahkan' : 'Cabut'}
        tone={putus?.jenis === 'sahkan' ? 'primary' : 'danger'}
        onConfirm={async () => {
          if (!putus) return;
          if (putus.jenis === 'cabut' && !catatan.trim()) {
            setGalat('Catatan wajib diisi.');
            throw new Error('Catatan wajib diisi.');
          }
          try {
            // Pengesahan susulan = /setujui, pencabutan = /kembalikan (usulan jenis darurat).
            await siakad.request({ method: 'POST', path: `/v1/aturan/${putus.a.id}/${putus.jenis === 'sahkan' ? 'setujui' : 'kembalikan'}`, body: { catatan: catatan.trim() || null } });
          } catch (e) {
            toast.add({ title: 'Gagal', description: pesanGalat(e), type: 'error' });
            throw e;
          }
          invalidateSiakad('aturan');
          setCatatan('');
          toast.add({ title: putus.jenis === 'sahkan' ? 'Jalur darurat disahkan' : 'Aturan dicabut', type: 'success' });
        }}
      >
        <Field label="Catatan" required={putus?.jenis === 'cabut'} optional={putus?.jenis !== 'cabut'} error={galat || undefined}>
          <Textarea rows={3} value={catatan} onChange={(e) => (setCatatan(e.target.value), setGalat(''))} />
        </Field>
      </ConfirmDialog>
    </div>
  );
}

/** Ringkas siapa yang menyetujui (riwayat): "Dr. X (Wakil Rektor I)". */
export function namaPenyetuju(r: { oleh?: string | null; nama_oleh?: string | null; jabatan?: string | null; peran?: string | null }): string {
  const nama = r.nama_oleh ?? r.oleh ?? 'Sistem';
  const jab = r.jabatan ? labelJabatan(r.jabatan) : r.peran;
  return jab ? `${nama} (${jab})` : nama;
}
