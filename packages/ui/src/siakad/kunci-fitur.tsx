'use client';
import * as React from 'react';
import { Ban, FlaskConical, History, Lock, LockOpen, Plus, ShieldCheck, SlidersHorizontal, Undo2 } from 'lucide-react';
import { Badge, Button } from '../components/actions';
import { Alert, Tabs } from '../components/display';
import { DataTable, type DataColumn } from '../components/data-table';
import { Choice, Field, Input, RadioGroup, Switch, Textarea } from '../components/forms';
import { Pilihan, PilihanBanyak } from '../components/formulir';
import { Sheet, useToast } from '../components/overlays';
import { PanelLangkah } from '../components/panel-langkah';
import { FormGrid, WizardReview } from '../components/wizard';
import { IsianSK, bodySK, type NilaiSK } from './isian-sk';
import { LencanaPeriode, PilihPeriodeAkademik, tanggalKunci, useKunciPeriode } from './kunci-periode';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { IsianTanggal } from '../components/formulir';

/*
 * Kunci fitur per periode (SIAKAD /v1/kalender/kunci-fitur*, docs/KUNCI_PERIODE.md "Aturan kunci per fitur"): keputusan
 * kunci periode per fitur/rute diatur dari aplikasi tanpa mengubah kode. Pemilik tunggal Pustikom (Aturan & pengatur »
 * Kunci fitur; keputusan Anas 2026-11-22, menggantikan 2026-11-21 "diatur BAAK"): atur bila server menjawab
 * meta.boleh_atur (izin kalender.kunci.atur).
 * - Ikut kunci / Dikecualikan / Bukan berperiode = aturan (kal_kunci_aturan), opsional per periode dan prodi.
 * - Buka sementara di periode ditutup = Pengecualian waktu jenis buka kembali (mekanisme yang sama dengan Batas waktu),
 *   dengan cakupan fitur katalog ("fitur:<kode>").
 */

export type KeputusanKunci = 'ikut_kunci' | 'dikecualikan' | 'bukan_berperiode';
export type StatusFiturKunci = 'dibuka' | 'terkunci' | 'dikecualikan' | 'bukan_berperiode' | 'dibuka_kembali' | 'dibuka_kembali_sebagian';
type Sasaran = 'rute' | 'awalan' | 'fitur' | 'modul' | 'sumber';

export interface EntriKunci {
  jenis: 'rute' | 'sumber';
  kunci: string;
  metode: string;
  path: string;
  ringkas: string;
  tag: string;
  modul: string;
  fitur: string;
  fitur_label: string;
  bawaan: KeputusanKunci;
  alasan_bawaan: string | null;
  pemetaan: 'spesifikasi' | 'otomatis';
  belum_diklasifikasi: boolean;
  berperiode: boolean;
  keputusan: KeputusanKunci;
  sumber_keputusan: 'aturan' | 'bawaan';
  aturan_id: string | null;
  status: StatusFiturKunci;
  buka_kembali: { sampai?: string; semua_prodi?: boolean; prodi: string[] } | null;
  prodi_khusus: { keputusan: KeputusanKunci; prodi: string[]; id: string }[];
}
export interface FiturKatalog {
  kode: string;
  label: string;
  modul: string;
  jumlah: number;
  ringkas: Partial<Record<StatusFiturKunci, number>>;
  belum_diklasifikasi: number;
  berperiode: boolean;
}
export interface AturanKunciFitur {
  id: string;
  sasaran: Sasaran;
  sasaran_label: string;
  kunci: string;
  keputusan: KeputusanKunci;
  keputusan_label: string;
  tahun_id: string | null;
  prodi: string[] | null;
  mulai: string | null;
  sampai: string | null;
  alasan: string;
  dasar_nomor: string | null;
  oleh: string | null;
  waktu: string;
  dicabut_oleh: string | null;
  alasan_cabut: string | null;
  keadaan: 'berlaku' | 'akan' | 'berakhir' | 'dicabut';
}
interface Katalog {
  periode: { tahun_id: string; nama: string; ditutup: boolean; keadaan: string; sejak: string | null };
  entri: EntriKunci[];
  fitur: FiturKatalog[];
  modul: Record<string, string>;
  keputusan: Record<KeputusanKunci, string>;
  jumlah_rute_lain: number;
  aturan: AturanKunciFitur[];
  prodi: { kode_prodi: string; nama_prodi: string }[];
}
interface RiwayatAturan { id: number; aturan_id: string; aksi: 'buat' | 'cabut'; pelaku: string | null; alasan: string | null; waktu: string; kunci: string; keputusan_label: string }
interface HasilSimulasi {
  hasil: 'ditolak' | 'lolos' | 'galat';
  http: number | null;
  sebab: string;
  rute: string | null;
  sumber: string | null;
  fitur: string | null;
  bawaan: KeputusanKunci | null;
  aturan: { id: string; sasaran: string; kunci: string; keputusan: KeputusanKunci; alasan: string } | null;
  periode: { nama: string; keadaan: string };
}

const LABEL_STATUS: Record<StatusFiturKunci, { t: string; v: 'success' | 'danger' | 'info' | 'neutral' | 'warning' }> = {
  dibuka: { t: 'Dibuka', v: 'success' },
  terkunci: { t: 'Terkunci', v: 'danger' },
  dikecualikan: { t: 'Dikecualikan', v: 'info' },
  bukan_berperiode: { t: 'Bukan berperiode', v: 'neutral' },
  dibuka_kembali: { t: 'Dibuka kembali', v: 'warning' },
  dibuka_kembali_sebagian: { t: 'Dibuka kembali sebagian prodi', v: 'warning' },
};
const LABEL_KEPUTUSAN: Record<KeputusanKunci, string> = { ikut_kunci: 'Ikut kunci', dikecualikan: 'Dikecualikan', bukan_berperiode: 'Bukan berperiode' };
const IKON_STATUS: Record<StatusFiturKunci, React.ReactNode> = {
  dibuka: <LockOpen />, terkunci: <Lock />, dikecualikan: <ShieldCheck />, bukan_berperiode: <Ban />, dibuka_kembali: <LockOpen />, dibuka_kembali_sebagian: <LockOpen />,
};

function LencanaStatus({ s, sampai }: { s: StatusFiturKunci; sampai?: string | null }) {
  const x = LABEL_STATUS[s];
  return (
    <Badge variant={x.v}>
      {IKON_STATUS[s]} {x.t}
      {sampai && (s === 'dibuka_kembali' || s === 'dibuka_kembali_sebagian') ? ` s.d. ${tanggalKunci(sampai)}` : ''}
    </Badge>
  );
}

const baris: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' };
const tumpuk: React.CSSProperties = { display: 'grid', gap: '1rem' };

export interface KunciFiturPeriodeProps {
  /** Periode awal (bawaan: periode aktif). */
  tahunId?: string | null;
  /**
   * Hanya lihat walau server mengizinkan mengatur (`boleh_atur`): untuk aplikasi yang bukan pemilik fitur ini
   * (pemilik tunggal: Pustikom; aplikasi lain hanya memantau).
   */
  hanyaLihat?: boolean;
}

/** Halaman Kunci fitur per periode: katalog fitur × status, aturan, simulasi, riwayat. */
export function KunciFiturPeriode({ tahunId, hanyaLihat }: KunciFiturPeriodeProps) {
  const kunci = useKunciPeriode();
  const [tahun, setTahun] = React.useState<string | null>(tahunId ?? null);
  const t = tahun ?? kunci.aktif;
  const q = useSiakadQuery<Katalog>(['kalender/kunci-fitur', t], (s, signal) => s.request<Katalog>({ method: 'GET', path: '/v1/kalender/kunci-fitur', query: { tahun_id: t ?? undefined } }, { signal }), { enabled: Boolean(t) });
  const k = q.data;
  const boleh = !hanyaLihat && Boolean((q.meta as { boleh_atur?: boolean } | undefined)?.boleh_atur);
  const [modul, setModul] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [cari, setCari] = React.useState('');
  const [panel, setPanel] = React.useState<{ sasaran?: Sasaran; kunci?: string } | null>(null);
  const [sim, setSim] = React.useState<{ rute?: string } | null>(null);
  const [tab, setTab] = React.useState<'fitur' | 'rute' | 'baru' | 'aturan' | 'riwayat'>('fitur');
  const periode = t ? kunci.peta.get(t) : undefined;

  const saring = React.useCallback(
    <X extends { modul: string }>(rows: X[], teks: (r: X) => string, st: (r: X) => string[]) =>
      rows.filter((r) => (!modul || r.modul === modul) && (!status || st(r).includes(status)) && (!cari || teks(r).toLowerCase().includes(cari.toLowerCase()))),
    [modul, status, cari],
  );
  const fitur = React.useMemo(() => saring((k?.fitur ?? []).filter((f) => f.berperiode), (f) => `${f.label} ${f.kode}`, (f) => Object.keys(f.ringkas)), [k, saring]);
  const entri = React.useMemo(() => saring(k?.entri ?? [], (e) => `${e.metode} ${e.path} ${e.ringkas} ${e.fitur_label}`, (e) => [e.status]), [k, saring]);
  const belum = React.useMemo(() => (k?.entri ?? []).filter((e) => e.belum_diklasifikasi), [k]);
  const segarkan = () => {
    invalidateSiakad('kalender');
    q.refetch();
    kunci.refetch();
  };

  const kolomFitur: DataColumn<FiturKatalog>[] = [
    { key: 'label', header: 'Fitur', mobile: 'title', value: (f) => f.label, cell: (f) => <span><strong>{f.label}</strong><br /><small style={{ color: 'var(--u-fg-muted)' }}>{f.kode}</small></span> },
    { key: 'modul', header: 'Kelompok', mobile: 'subtitle', value: (f) => k?.modul[f.modul] ?? f.modul },
    { key: 'jumlah', header: 'Rute/data', align: 'end', shrink: true, value: (f) => f.jumlah },
    {
      key: 'status', header: `Status di ${k?.periode.nama ?? 'periode'}`, mobile: 'badge', value: (f) => Object.keys(f.ringkas).join(','),
      cell: (f) => (
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
          {(Object.entries(f.ringkas) as [StatusFiturKunci, number][]).map(([s, n]) => (
            <span key={s}><LencanaStatus s={s} />{Object.keys(f.ringkas).length > 1 ? <small> ×{n}</small> : null}</span>
          ))}
          {f.belum_diklasifikasi ? <Badge variant="warning">{f.belum_diklasifikasi} belum diklasifikasi</Badge> : null}
        </span>
      ),
    },
    {
      key: 'aksi', header: '', shrink: true, hideable: false, value: () => '',
      cell: (f) => (boleh ? <Button size="sm" variant="outline" onClick={() => setPanel({ sasaran: 'fitur', kunci: f.kode })}><SlidersHorizontal /> Atur</Button> : null),
    },
  ];
  const kolomEntri: DataColumn<EntriKunci>[] = [
    {
      key: 'rute', header: 'Rute / data', mobile: 'title', value: (e) => `${e.metode} ${e.path}`,
      cell: (e) => (
        <span>
          <code>{e.jenis === 'sumber' ? `Data ${e.kunci}` : `${e.metode} ${e.path}`}</code>
          {e.ringkas ? <><br /><small style={{ color: 'var(--u-fg-muted)' }}>{e.ringkas}</small></> : null}
        </span>
      ),
    },
    { key: 'fitur', header: 'Fitur', mobile: 'subtitle', value: (e) => e.fitur_label },
    {
      key: 'bawaan', header: 'Bawaan kode', value: (e) => e.bawaan,
      cell: (e) => <span title={e.alasan_bawaan ?? undefined}>{LABEL_KEPUTUSAN[e.bawaan]}{e.pemetaan === 'otomatis' ? <small style={{ color: 'var(--u-fg-muted)' }}> · otomatis</small> : null}</span>,
    },
    {
      key: 'keputusan', header: 'Keputusan berlaku', value: (e) => e.keputusan,
      cell: (e) => <span>{LABEL_KEPUTUSAN[e.keputusan]}{e.sumber_keputusan === 'aturan' ? <Badge variant="info" style={{ marginLeft: '0.375rem' }}>aturan aplikasi</Badge> : null}{e.prodi_khusus.length ? <small style={{ color: 'var(--u-fg-muted)' }}> · {e.prodi_khusus.length} aturan per prodi</small> : null}</span>,
    },
    { key: 'status', header: 'Status', mobile: 'badge', value: (e) => e.status, cell: (e) => <LencanaStatus s={e.status} sampai={e.buka_kembali?.sampai} /> },
    {
      key: 'aksi', header: '', shrink: true, hideable: false, value: () => '',
      cell: (e) => (
        <span style={{ display: 'flex', gap: '0.25rem' }}>
          {e.jenis === 'rute' ? <Button size="sm" variant="ghost" onClick={() => setSim({ rute: e.kunci })}><FlaskConical /> Uji</Button> : null}
          {boleh ? <Button size="sm" variant="outline" onClick={() => setPanel({ sasaran: e.jenis === 'sumber' ? 'sumber' : 'rute', kunci: e.kunci })}>Atur</Button> : null}
        </span>
      ),
    },
  ];

  const opsiModul = Object.entries(k?.modul ?? {}).map(([value, label]) => ({ value, label }));
  const opsiStatus = (Object.keys(LABEL_STATUS) as StatusFiturKunci[]).map((s) => ({ value: s, label: LABEL_STATUS[s].t }));
  const filter = modul || status || cari;

  return (
    <div style={tumpuk}>
      <div style={baris}>
        <Field label="Periode">
          <PilihPeriodeAkademik value={t} onValueChange={setTahun} lencana={false} />
        </Field>
        <Field label="Kelompok fitur">
          <Pilihan aria-label="Kelompok fitur" tampilan="cari" value={modul} onValueChange={setModul} options={opsiModul} placeholder="Pilih…" />
        </Field>
        <Field label="Status">
          <Pilihan aria-label="Status" tampilan="cari" value={status} onValueChange={setStatus} options={opsiStatus} placeholder="Pilih…" />
        </Field>
        <Field label="Cari">
          <Input aria-label="Cari fitur atau rute" value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Mis. wisuda, /v1/akademik/nilai" />
        </Field>
        <span style={{ flex: 1 }} />
        <Button variant="outline" onClick={() => setSim({})}><FlaskConical /> Simulasi</Button>
        {boleh ? <Button onClick={() => setPanel({})}><Plus /> Atur kunci fitur</Button> : null}
      </div>
      {k ? (
        <Alert
          variant={k.periode.ditutup ? 'warning' : 'info'}
          icon={k.periode.ditutup ? <Lock aria-hidden /> : <LockOpen aria-hidden />}
          title={<>Periode {k.periode.nama} <LencanaPeriode status={periode} /></>}
        >
          {k.periode.ditutup
            ? `Ditutup${k.periode.sejak ? ` sejak ${tanggalKunci(k.periode.sejak)}` : ''}: fitur yang ikut kunci menolak perubahan data periode ini (423). Pengecualian dan buka sementara diatur di sini tanpa mengubah kode.`
            : 'Periode masih dibuka: semua fitur boleh mengubah data periode ini (batas waktu tiap fitur diatur di Batas waktu). Aturan di sini berlaku saat periode ditutup.'}
          {hanyaLihat ? ' Hanya lihat di aplikasi ini: kunci fitur diatur di aplikasi Pustikom.' : !boleh ? ' Anda hanya bisa melihat (mengatur butuh izin kalender.kunci.atur dari Pustikom).' : ''}
        </Alert>
      ) : null}
      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'fitur', label: `Fitur${k ? ` (${fitur.length})` : ''}` },
          { value: 'rute', label: 'Rute & data' },
          { value: 'baru', label: `Belum diklasifikasi${belum.length ? ` (${belum.length})` : ''}` },
          { value: 'aturan', label: `Aturan${k ? ` (${k.aturan.filter((a) => a.keadaan === 'berlaku' || a.keadaan === 'akan').length})` : ''}` },
          { value: 'riwayat', label: 'Riwayat' },
        ]}
      />
      {tab === 'fitur' ? (
        <DataTable caption="Fitur berperiode" columns={kolomFitur} rows={k ? fitur : undefined} rowKey={(f) => f.kode} loading={q.loading} error={q.error} onRetry={q.refetch} filtered={Boolean(filter)}
          storageKey="kunci-fitur.fitur" empty={{ title: 'Belum ada fitur berperiode' }} emptyFiltered={{ onReset: () => { setModul(null); setStatus(null); setCari(''); } }} />
      ) : null}
      {tab === 'rute' ? (
        <>
          <DataTable caption="Rute tulis dan data berperiode" columns={kolomEntri} rows={k ? entri : undefined} rowKey={(e) => `${e.jenis}:${e.kunci}`} loading={q.loading} error={q.error} onRetry={q.refetch}
            filtered={Boolean(filter)} storageKey="kunci-fitur.rute" exportCsv="kunci-fitur-rute" empty={{ title: 'Tidak ada rute' }} emptyFiltered={{ onReset: () => { setModul(null); setStatus(null); setCari(''); } }} />
          {k ? <small style={{ color: 'var(--u-fg-muted)' }}>{k.jumlah_rute_lain} rute tulis lain tidak ditampilkan: tidak tercatat membawa tahun_id, tetapi tetap dijaga otomatis bila ternyata membawa tahun_id periode ditutup.</small> : null}
        </>
      ) : null}
      {tab === 'baru' ? (
        <div style={tumpuk}>
          <Alert variant="info" title="Rute baru belum diklasifikasi">
            Rute tulis di luar peta kode yang membawa tahun_id (dari dokumentasi rute atau terdeteksi saat dipakai). Bawaan aman: tetap ikut kunci. Putuskan di sini bila rute itu dikecualikan atau bukan berperiode; tidak perlu mengubah kode.
          </Alert>
          <DataTable caption="Rute belum diklasifikasi" columns={kolomEntri} rows={k ? belum : undefined} rowKey={(e) => e.kunci} loading={q.loading} error={q.error} onRetry={q.refetch}
            empty={{ title: 'Semua rute berperiode sudah diklasifikasi' }} />
        </div>
      ) : null}
      {tab === 'aturan' ? <DaftarAturan rows={k?.aturan} loading={q.loading} error={q.error} onRetry={q.refetch} boleh={boleh} prodi={k?.prodi ?? []} onUbah={segarkan} /> : null}
      {tab === 'riwayat' ? <RiwayatKunci /> : null}
      {panel && k && t ? <PanelAturan k={k} tahunId={t} awal={panel} onTutup={() => setPanel(null)} onSimpan={segarkan} /> : null}
      {sim && k && t ? <PanelSimulasi k={k} tahunId={t} awal={sim.rute} onTutup={() => setSim(null)} /> : null}
    </div>
  );
}

function DaftarAturan({ rows, loading, error, onRetry, boleh, prodi, onUbah }: {
  rows: AturanKunciFitur[] | undefined; loading: boolean; error: Error | null; onRetry: () => void; boleh: boolean; prodi: Katalog['prodi']; onUbah: () => void;
}) {
  const [cabut, setCabut] = React.useState<AturanKunciFitur | null>(null);
  const nama = (kp: string) => prodi.find((p) => p.kode_prodi === kp)?.nama_prodi ?? kp;
  const LENCANA: Record<AturanKunciFitur['keadaan'], { v: 'success' | 'info' | 'neutral'; t: string }> = {
    berlaku: { v: 'success', t: 'Berlaku' }, akan: { v: 'info', t: 'Akan berlaku' }, berakhir: { v: 'neutral', t: 'Berakhir' }, dicabut: { v: 'neutral', t: 'Dicabut' },
  };
  const kolom: DataColumn<AturanKunciFitur>[] = [
    { key: 'kunci', header: 'Sasaran', mobile: 'title', value: (a) => a.kunci, cell: (a) => <span><small style={{ color: 'var(--u-fg-muted)' }}>{a.sasaran_label}</small><br /><code>{a.kunci}</code></span> },
    { key: 'keputusan', header: 'Keputusan', mobile: 'subtitle', value: (a) => a.keputusan_label },
    {
      key: 'cakupan', header: 'Cakupan', value: (a) => `${a.tahun_id ?? ''} ${(a.prodi ?? []).join(',')}`,
      cell: (a) => <span>{a.tahun_id ? `Periode ${a.tahun_id}` : 'Semua periode'} · {a.prodi ? a.prodi.map(nama).join(', ') : 'Semua prodi'}</span>,
    },
    { key: 'masa', header: 'Berlaku', value: (a) => a.sampai ?? '', cell: (a) => <span>{a.mulai ? tanggalKunci(a.mulai) : 'Sekarang'} – {a.sampai ? tanggalKunci(a.sampai) : 'sampai dicabut'}</span> },
    { key: 'alasan', header: 'Alasan', value: (a) => a.alasan, cell: (a) => <span>{a.alasan}{a.dasar_nomor ? <small style={{ color: 'var(--u-fg-muted)' }}> · {a.dasar_nomor}</small> : null}</span> },
    { key: 'oleh', header: 'Oleh', value: (a) => a.oleh ?? '', cell: (a) => <span>{a.oleh}<br /><small style={{ color: 'var(--u-fg-muted)' }}>{tanggalKunci(a.waktu)}</small></span> },
    { key: 'keadaan', header: 'Status', mobile: 'badge', value: (a) => a.keadaan, cell: (a) => <Badge variant={LENCANA[a.keadaan].v} title={a.alasan_cabut ?? undefined}>{LENCANA[a.keadaan].t}{a.dicabut_oleh ? ` · ${a.dicabut_oleh}` : ''}</Badge> },
    {
      key: 'aksi', header: '', shrink: true, hideable: false, value: () => '',
      cell: (a) => (boleh && (a.keadaan === 'berlaku' || a.keadaan === 'akan') ? <Button size="sm" variant="ghost" onClick={() => setCabut(a)}><Undo2 /> Cabut</Button> : null),
    },
  ];
  return (
    <>
      <DataTable caption="Aturan kunci per fitur" columns={kolom} rows={rows} rowKey={(a) => a.id} loading={loading} error={error} onRetry={onRetry}
        empty={{ title: 'Belum ada aturan', description: 'Semua fitur mengikuti keputusan bawaan kode. Aturan dari aplikasi menimpa bawaan itu.' }} />
      {cabut ? <PanelCabut a={cabut} onTutup={() => setCabut(null)} onUbah={onUbah} /> : null}
    </>
  );
}

function PanelCabut({ a, onTutup, onUbah }: { a: AturanKunciFitur; onTutup: () => void; onUbah: () => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [alasan, setAlasan] = React.useState('');
  const [galat, setGalat] = React.useState<string | null>(null);
  const [kirim, setKirim] = React.useState(false);
  async function simpan() {
    if (alasan.trim().length < 5) return setGalat('Alasan minimal 5 karakter.');
    setKirim(true);
    try {
      await siakad.request({ method: 'POST', path: `/v1/kalender/kunci-fitur/aturan/${a.id}/cabut`, body: { alasan } });
      toast.add({ title: 'Aturan dicabut', description: 'Sasaran kembali ke keputusan bawaan (atau aturan lain yang berlaku).', type: 'success' });
      onUbah();
      onTutup();
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setKirim(false);
    }
  }
  return (
    <Sheet open onOpenChange={(o) => !o && onTutup()} title="Cabut aturan kunci" description={`${a.keputusan_label} · ${a.kunci}`}
      footer={<><Button variant="ghost" onClick={onTutup}>Batal</Button><Button variant="destructive" onClick={() => void simpan()} disabled={kirim}><Undo2 /> Cabut aturan</Button></>}>
      <div style={tumpuk}>
        <Alert variant="warning">Pencabutan berlaku seketika dan tercatat di riwayat beserta alasannya.</Alert>
        <Field label="Alasan pencabutan" required error={galat ?? undefined}>
          <Textarea rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Mis. koreksi presensi sudah selesai" />
        </Field>
      </div>
    </Sheet>
  );
}

function RiwayatKunci() {
  const q = useSiakadQuery<RiwayatAturan[]>(['kalender/kunci-fitur', 'riwayat'], (s, signal) => s.request<RiwayatAturan[]>({ method: 'GET', path: '/v1/kalender/kunci-fitur/riwayat' }, { signal }));
  const kolom: DataColumn<RiwayatAturan>[] = [
    { key: 'waktu', header: 'Waktu', mobile: 'meta', value: (r) => r.waktu, cell: (r) => tanggalKunci(r.waktu) },
    { key: 'aksi', header: 'Aksi', mobile: 'badge', value: (r) => r.aksi, cell: (r) => (r.aksi === 'buat' ? <Badge variant="success"><Plus /> Dibuat</Badge> : <Badge variant="neutral"><Undo2 /> Dicabut</Badge>) },
    { key: 'kunci', header: 'Aturan', mobile: 'title', value: (r) => r.kunci, cell: (r) => <span>{r.keputusan_label} · <code>{r.kunci}</code></span> },
    { key: 'alasan', header: 'Alasan', value: (r) => r.alasan ?? '' },
    { key: 'pelaku', header: 'Oleh', value: (r) => r.pelaku ?? '' },
  ];
  return <DataTable caption="Riwayat aturan kunci" columns={kolom} rows={q.data} rowKey={(r) => String(r.id)} loading={q.loading} error={q.error} onRetry={q.refetch} empty={{ icon: <History />, title: 'Belum ada riwayat' }} />;
}

type JenisAturan = KeputusanKunci | 'buka_sementara';

/** Wizard aturan: fitur → keputusan → cakupan → masa berlaku → alasan → tinjau. */
function PanelAturan({ k, tahunId, awal, onTutup, onSimpan }: { k: Katalog; tahunId: string; awal: { sasaran?: Sasaran; kunci?: string }; onTutup: () => void; onSimpan: () => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const kunci = useKunciPeriode();
  const [langkah, setLangkah] = React.useState(0);
  const [isi, setIsi] = React.useState({
    sasaran: (awal.sasaran ?? 'fitur') as Sasaran,
    kunci: awal.kunci ?? '',
    jenis: 'dikecualikan' as JenisAturan,
    periodeIni: true,
    semuaProdi: true,
    prodi: [] as string[],
    mulai: '',
    sampai: '',
    alasan: '',
    dasar: '',
  });
  const [sk, setSk] = React.useState<NilaiSK | null>(null);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const set = (p: Partial<typeof isi>) => setIsi((x) => ({ ...x, ...p }));
  const buka = isi.jenis === 'buka_sementara';
  const bolehBuka = k.periode.ditutup && kunci.bolehBukaKembali && (isi.sasaran === 'fitur' || isi.sasaran === 'modul');
  const opsiSasaran: Record<Sasaran, { value: string; label: string; description?: string }[]> = {
    fitur: k.fitur.map((f) => ({ value: f.kode, label: f.label, description: `${k.modul[f.modul] ?? f.modul} · ${f.jumlah} rute/data` })),
    modul: Object.entries(k.modul).map(([value, label]) => ({ value, label })),
    rute: k.entri.filter((e) => e.jenis === 'rute').map((e) => ({ value: e.kunci, label: e.kunci, description: e.ringkas })),
    sumber: k.entri.filter((e) => e.jenis === 'sumber').map((e) => ({ value: e.kunci, label: e.kunci, description: e.ringkas })),
    awalan: [],
  };
  const labelSasaran = isi.sasaran === 'awalan' ? isi.kunci : opsiSasaran[isi.sasaran].find((o) => o.value === isi.kunci)?.label ?? isi.kunci;
  const namaProdi = (kp: string) => k.prodi.find((p) => p.kode_prodi === kp)?.nama_prodi ?? kp;

  async function simpan() {
    setGalat({});
    try {
      if (buka) {
        const modul = isi.sasaran === 'fitur' ? `fitur:${isi.kunci}` : isi.kunci;
        await siakad.request({ method: 'POST', path: '/v1/kalender/pengecualian-waktu', body: {
          jenis: 'buka_kembali', tahun_id: tahunId, modul: [modul], prodi: isi.semuaProdi ? ['*'] : isi.prodi, mulai: isi.mulai || undefined, sampai: isi.sampai, alasan: isi.alasan, dasar: bodySK(sk) ?? undefined,
        } });
        toast.add({ title: 'Fitur dibuka sementara', description: `${labelSasaran} s.d. ${tanggalKunci(isi.sampai)}; tercatat di Pengecualian waktu, lalu otomatis terkunci lagi.`, type: 'success' });
      } else {
        await siakad.request({ method: 'POST', path: '/v1/kalender/kunci-fitur/aturan', body: {
          sasaran: isi.sasaran, kunci: isi.kunci, keputusan: isi.jenis, tahun_id: isi.periodeIni ? tahunId : null, prodi: isi.semuaProdi ? [] : isi.prodi,
          mulai: isi.mulai || undefined, sampai: isi.sampai || undefined, alasan: isi.alasan, dasar_nomor: isi.dasar || undefined,
        } });
        toast.add({ title: 'Aturan kunci disimpan', description: `${LABEL_KEPUTUSAN[isi.jenis as KeputusanKunci]}: ${labelSasaran}. Berlaku seketika dan tercatat di riwayat.`, type: 'success' });
      }
      onSimpan();
      onTutup();
      return null;
    } catch (e) {
      const d = (e as { details?: Record<string, string> }).details;
      if (d) setGalat(d);
      return pesanGalat(e);
    }
  }

  const ringkasCakupan = `${buka || isi.periodeIni ? `Periode ${k.periode.nama}` : 'Semua periode'} · ${isi.semuaProdi ? 'Semua prodi' : isi.prodi.map(namaProdi).join(', ') || '–'}`;
  return (
    <PanelLangkah
      open
      onOpenChange={(o) => !o && onTutup()}
      title="Atur kunci fitur"
      description={`Periode ${k.periode.nama} · ${k.periode.ditutup ? 'ditutup' : 'dibuka'}`}
      step={langkah}
      onStepChange={setLangkah}
      finishLabel={buka ? 'Buka sementara' : 'Simpan aturan'}
      onFinish={simpan}
      footerNote="Tercatat di riwayat beserta pelaku dan alasannya."
      steps={[
        {
          id: 'fitur',
          title: 'Fitur',
          content: (
            <div style={tumpuk}>
              <Field label="Sasaran" required>
                <Pilihan aria-label="Sasaran" tampilan="tombol" required value={isi.sasaran} onValueChange={(v) => v && set({ sasaran: v as Sasaran, kunci: '' })}
                  options={[{ value: 'fitur', label: 'Fitur' }, { value: 'rute', label: 'Satu rute' }, { value: 'awalan', label: 'Awalan path' }, { value: 'modul', label: 'Kelompok' }, { value: 'sumber', label: 'Data PusatData' }]} />
              </Field>
              {isi.sasaran === 'awalan' ? (
                <Field label="Awalan path" required error={galat.kunci} description="Semua rute yang path-nya diawali ini, mis. /v1/acara-wisuda.">
                  <Input value={isi.kunci} onChange={(e) => set({ kunci: e.target.value.trim() })} placeholder="/v1/…" />
                </Field>
              ) : (
                <Field label={isi.sasaran === 'fitur' ? 'Fitur' : isi.sasaran === 'modul' ? 'Kelompok fitur' : isi.sasaran === 'rute' ? 'Rute' : 'Data'} required error={galat.kunci}>
                  <Pilihan aria-label="Sasaran aturan" tampilan="cari" value={isi.kunci || null} onValueChange={(v) => set({ kunci: v ?? '' })} options={opsiSasaran[isi.sasaran]} placeholder="Pilih…" />
                </Field>
              )}
            </div>
          ),
          validate: () => (!isi.kunci ? 'Pilih sasaran aturan.' : isi.sasaran === 'awalan' && !/^\/v1\/[a-z0-9]/.test(isi.kunci) ? 'Awalan harus diawali /v1/.' : null),
        },
        {
          id: 'keputusan',
          title: 'Keputusan',
          content: (
            <RadioGroup<JenisAturan>
              variant="card"
              columns={1}
              value={isi.jenis}
              onValueChange={(v) => set({ jenis: v, ...(v === 'buka_sementara' ? { periodeIni: true } : {}) })}
              options={[
                { value: 'dikecualikan', label: 'Dikecualikan (pengecualian resmi)', description: 'Perubahan data periode ditutup tetap boleh dan dicatat sebagai pengecualian. Alasan wajib.', icon: <ShieldCheck /> },
                { value: 'bukan_berperiode', label: 'Bukan berperiode', description: 'Fitur ini tidak terikat periode akademik; tidak dijaga kunci periode sama sekali.', icon: <Ban /> },
                { value: 'ikut_kunci', label: 'Ikut kunci', description: 'Data periode ditutup ditolak (423), juga bila bawaan kode mengecualikannya. Mis. mencabut pengecualian untuk periode tertentu.', icon: <Lock /> },
                {
                  value: 'buka_sementara', label: 'Buka sementara (buka kembali)',
                  description: !k.periode.ditutup ? 'Tidak tersedia: periode masih dibuka.' : !(isi.sasaran === 'fitur' || isi.sasaran === 'modul') ? 'Hanya untuk sasaran Fitur atau Kelompok.' : kunci.bolehBukaKembali ? 'Periode ditutup dibuka sementara untuk fitur ini sampai tanggal tertentu (Pengecualian waktu), lalu otomatis terkunci lagi.' : 'Butuh izin akademik.periode.buka_kembali.',
                  icon: <LockOpen />, disabled: !bolehBuka,
                },
              ]}
            />
          ),
          validate: () => (buka && !bolehBuka ? 'Buka sementara tidak tersedia untuk pilihan ini.' : null),
        },
        {
          id: 'cakupan',
          title: 'Cakupan',
          content: (
            <div style={tumpuk}>
              {!buka ? (
                <Choice label={`Hanya periode ${k.periode.nama}`} description="Matikan untuk berlaku di semua periode." control={<Switch checked={isi.periodeIni} onCheckedChange={(v) => set({ periodeIni: v })} />} />
              ) : null}
              <Choice label="Semua prodi" description="Berlaku untuk semua program studi." control={<Switch checked={isi.semuaProdi} onCheckedChange={(v) => set({ semuaProdi: v })} />} />
              {!isi.semuaProdi ? (
                <Field label="Program studi" required error={galat.prodi} description="Permintaan tanpa prodi data yang jelas hanya cocok dengan aturan semua prodi.">
                  <PilihanBanyak aria-label="Program studi" value={isi.prodi} onValueChange={(v) => set({ prodi: v })} options={k.prodi.map((p) => ({ value: p.kode_prodi, label: p.nama_prodi }))} placeholder="Pilih prodi…" />
                </Field>
              ) : null}
            </div>
          ),
          validate: () => (!isi.semuaProdi && !isi.prodi.length ? 'Pilih minimal satu prodi.' : null),
        },
        {
          id: 'waktu',
          title: 'Masa berlaku',
          content: (
            <FormGrid columns={2}>
              <Field label="Mulai" description="Kosong = sekarang." error={galat.mulai}>
                <IsianTanggal value={isi.mulai} aria-label="Mulai" onValueChange={(v) => set({ mulai: v })} />
              </Field>
              <Field label="Sampai" required={buka} error={galat.sampai} description={buka ? 'Paling lama 180 hari; lewat tanggal ini otomatis terkunci lagi.' : 'Kosong = sampai dicabut.'}>
                <IsianTanggal value={isi.sampai} aria-label="Sampai" onValueChange={(v) => set({ sampai: v })} />
              </Field>
            </FormGrid>
          ),
          validate: () => (buka && !isi.sampai ? 'Isi tanggal sampai.' : isi.mulai && isi.sampai && isi.sampai < isi.mulai ? 'Sampai harus setelah mulai.' : null),
        },
        {
          id: 'alasan',
          title: 'Alasan',
          content: (
            <div style={tumpuk}>
              <Field label="Alasan" required error={galat.alasan}>
                <Textarea rows={3} value={isi.alasan} onChange={(e) => set({ alasan: e.target.value })} placeholder="Mis. acara wisuda berjalan sesudah periode ditutup (keputusan pimpinan)" />
              </Field>
              {buka ? (
                <IsianSK value={sk} onValueChange={setSk} label="Dasar (SK atau surat/memo bernomor)" required error={galat.dasar} />
              ) : (
                <Field label="Nomor dasar (opsional)" description="SK, surat, atau memo yang mendasari keputusan.">
                  <Input value={isi.dasar} onChange={(e) => set({ dasar: e.target.value })} placeholder="Mis. 012/BAAK/XI/2026" />
                </Field>
              )}
            </div>
          ),
          validate: () => (isi.alasan.trim().length < 10 ? 'Alasan minimal 10 karakter.' : buka && !sk?.nomor && !sk?.sk_id ? 'Dasar wajib untuk buka sementara.' : null),
        },
        {
          id: 'tinjau',
          title: 'Tinjau',
          content: (
            <WizardReview
              sections={[
                { title: 'Fitur', items: [{ label: 'Sasaran', value: `${isi.sasaran} · ${labelSasaran}` }], onEdit: () => setLangkah(0) },
                { title: 'Keputusan', items: [{ label: 'Keputusan', value: buka ? 'Buka sementara (Pengecualian waktu buka kembali)' : LABEL_KEPUTUSAN[isi.jenis as KeputusanKunci] }], onEdit: () => setLangkah(1) },
                { title: 'Cakupan', items: [{ label: 'Cakupan', value: ringkasCakupan }], onEdit: () => setLangkah(2) },
                { title: 'Masa berlaku', items: [{ label: 'Mulai', value: isi.mulai ? tanggalKunci(isi.mulai) : 'Sekarang' }, { label: 'Sampai', value: isi.sampai ? tanggalKunci(isi.sampai) : 'Sampai dicabut' }], onEdit: () => setLangkah(3) },
                { title: 'Alasan', items: [{ label: 'Alasan', value: isi.alasan || '–' }, { label: 'Dasar', value: (buka ? sk?.nomor : isi.dasar) || '–' }], onEdit: () => setLangkah(4) },
              ]}
            />
          ),
        },
      ]}
    />
  );
}

/** Simulasi: apakah rute X untuk periode Y prodi Z akan ditolak? Memakai penjaga sungguhan di API. */
function PanelSimulasi({ k, tahunId, awal, onTutup }: { k: Katalog; tahunId: string; awal?: string; onTutup: () => void }) {
  const siakad = useSiakad();
  const [rute, setRute] = React.useState<string | null>(awal ?? null);
  const [path, setPath] = React.useState('');
  const [tahun, setTahun] = React.useState<string>(tahunId);
  const [prodi, setProdi] = React.useState<string | null>(null);
  const [hasil, setHasil] = React.useState<HasilSimulasi | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [jalan, setJalan] = React.useState(false);
  async function uji() {
    setGalat(null);
    setHasil(null);
    const sumber = rute?.startsWith('data:') ? rute.slice(5) : null;
    const [metode, p] = path ? path.trim().split(/\s+/, 2) : (rute ?? '').split(' ', 2);
    if (!sumber && !p) return setGalat('Pilih rute atau isi "METODE /path".');
    setJalan(true);
    try {
      const { data } = await siakad.request<HasilSimulasi>({ method: 'POST', path: '/v1/kalender/kunci-fitur/simulasi', body: sumber ? { sumber, tahun_id: tahun, prodi: prodi ? [prodi] : [] } : { metode, path: p, tahun_id: tahun, prodi: prodi ? [prodi] : [] } });
      setHasil(data);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setJalan(false);
    }
  }
  const opsiRute = k.entri.map((e) => ({ value: e.jenis === 'sumber' ? `data:${e.kunci}` : e.kunci, label: e.jenis === 'sumber' ? `Data ${e.kunci}` : e.kunci, description: e.fitur_label }));
  return (
    <Sheet open onOpenChange={(o) => !o && onTutup()} title="Simulasi kunci periode" description="Menjalankan penjaga kunci periode sungguhan tanpa mengubah data."
      footer={<><Button variant="ghost" onClick={onTutup}>Tutup</Button><Button onClick={() => void uji()} disabled={jalan}><FlaskConical /> Uji</Button></>}>
      <div style={tumpuk}>
        <Field label="Rute atau data">
          <Pilihan aria-label="Rute" tampilan="cari" value={rute} onValueChange={(v) => { setRute(v); setPath(''); }} options={opsiRute} placeholder="Pilih…" />
        </Field>
        <Field label="Atau path nyata" description='Mis. "POST /v1/akademik/nilai/kelas/12373".'>
          <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="POST /v1/…" />
        </Field>
        <FormGrid columns={2}>
          <Field label="Periode data">
            <PilihPeriodeAkademik value={tahun} onValueChange={setTahun} lencana={false} />
          </Field>
          <Field label="Prodi data">
            <Pilihan aria-label="Prodi" tampilan="cari" value={prodi} onValueChange={setProdi} options={k.prodi.map((p) => ({ value: p.kode_prodi, label: p.nama_prodi }))} placeholder="Pilih…" />
          </Field>
        </FormGrid>
        {galat ? <Alert variant="danger">{galat}</Alert> : null}
        {hasil ? (
          <Alert variant={hasil.hasil === 'ditolak' ? 'danger' : hasil.hasil === 'lolos' ? 'success' : 'warning'} title={hasil.hasil === 'ditolak' ? `Ditolak (${hasil.http ?? 423})` : hasil.hasil === 'lolos' ? 'Lolos penjaga' : 'Galat'}>
            <div style={{ display: 'grid', gap: '0.25rem' }}>
              <span>{hasil.sebab}</span>
              <small>{hasil.rute ?? `Data ${hasil.sumber}`} · fitur {hasil.fitur ?? '–'} · bawaan {hasil.bawaan ? LABEL_KEPUTUSAN[hasil.bawaan] : '–'} · periode {hasil.periode.nama} ({hasil.periode.keadaan})</small>
              {hasil.aturan ? <small>Aturan aplikasi: {LABEL_KEPUTUSAN[hasil.aturan.keputusan]} ({hasil.aturan.sasaran} {hasil.aturan.kunci}) — {hasil.aturan.alasan}</small> : null}
            </div>
          </Alert>
        ) : null}
      </div>
    </Sheet>
  );
}
