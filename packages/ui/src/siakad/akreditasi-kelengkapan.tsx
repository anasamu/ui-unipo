'use client';
import * as React from 'react';
import { Award, CalendarClock, Download, FileUp, MessageSquare, Play, Send, Undo2 } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Card, CardContent, CardHeader, DescriptionList, Progress, Tabs } from '../components/display';
import { StatCard, StatGrid } from '../components/charts';
import { DataTable } from '../components/data-table';
import { Field, Input, Textarea } from '../components/forms';
import { Select } from '../components/select';
import { Sheet, useToast } from '../components/overlays';
import { FormGrid } from '../components/wizard';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { PilihBerkas } from './pilih-berkas';
import { AlurPemeriksa, LabelPemeriksa, type TahapPemeriksa } from './pemeriksa';
import { GarisWaktuAkreditasi, KartuAkreditasi, type IntegrasiAkreditasiData, type RiwayatAkreditasi } from './akreditasi-rinci';

/*
 * Kelengkapan akreditasi prodi terintegrasi SPMI (SIAKAD /v1/spmi/akreditasi-kelengkapan, docs/AKREDITASI.md
 * "Kelengkapan akreditasi"). Status akreditasi dari SPMI hanya dibaca; dokumen yang dibutuhkan lembaga adalah data per
 * instrumen (SPMI » Akreditasi » Dokumen kebutuhan). Alur tiap dokumen: unggah (prodi) -> periksa UPM fakultas
 * (opsional) -> verifikasi SPMI -> lengkap, atau dikembalikan untuk perbaikan.
 *
 *   StatusAkreditasiProdi            kartu akreditasi terkini (lembaga, peringkat, SK, masa berlaku, pengingat)
 *   RuangKelengkapanAkreditasi       ruang kerja satu prodi: ringkasan %, per kriteria, dokumen, panel butir, lampiran data
 *   RingkasanKelengkapanAkreditasi   semua prodi (SPMI) / prodi berizin (Fakultas)
 *   LampiranDataAkreditasi           data otomatis dari SIAKAD siap pakai + ekspor CSV
 */

const BASIS = '/v1/spmi/akreditasi-kelengkapan';
const q =
  <T,>(path: string, query?: Record<string, string | number | undefined | null>) =>
  (s: ReturnType<typeof useSiakad>, signal: AbortSignal) =>
    s.request<T>({ method: 'GET', path, query: query ? Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])) : undefined }, { signal });
const tgl = (s?: string | null) => (s ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s.length <= 10 ? `${s}T00:00:00` : s.replace(' ', 'T'))) : '-');
const angka = (n: number | null | undefined, d = 1) => (n == null ? '-' : Number(n).toLocaleString('id-ID', { maximumFractionDigits: d }));
const pesan = (e: unknown) => {
  const x = e as { status?: number; message?: string } | null;
  return x?.status === 403 && x.message ? x.message : pesanGalat(e);
};

// ------------------------------------------------------------------ tipe
export interface InfoAkreditasiProdi {
  lembaga?: string | null;
  lembaga_nama?: string | null;
  lembaga_singkatan?: string | null;
  peringkat?: string | null;
  nomor_sk?: string | null;
  tanggal_sk?: string | null;
  berlaku_sampai?: string | null;
  sisa_hari?: number | null;
  keadaan?: 'berlaku' | 'segera_habis' | 'habis' | 'proses' | 'tidak_terakreditasi' | null;
  keadaan_label?: string | null;
  target_reakreditasi?: string | null;
}
interface HakKelengkapan {
  lihat: boolean;
  kelola: boolean;
  upm: boolean;
  spmi: boolean;
}
interface Persiapan {
  id: number;
  jenis: string;
  status: string;
  target_pengajuan: string | null;
  kode_instrumen: string | null;
  nama_instrumen: string | null;
  lembaga: string | null;
}
interface Hitung {
  jumlah: number;
  wajib: number;
  lengkap: number;
  menunggu_periksa: number;
  perbaikan: number;
  belum: number;
  terlambat: number;
  persen: number;
}
export interface ButirKelengkapan {
  id: number;
  kriteria_id: number | null;
  dokumen: { id: number; kode: string; nama: string; jenis: string; keterangan: string | null; wajib: boolean; sumber_data: string | null };
  status: 'belum' | 'diunggah' | 'diperiksa' | 'lengkap' | 'perbaikan';
  pic_username: string | null;
  pic_nama: string | null;
  tenggat: string | null;
  terlambat: boolean;
  berkas_id: string | null;
  berkas_nama: string | null;
  diunggah_at: string | null;
  catatan_periksa: string | null;
  upm_catatan: string | null;
  komentar: number;
  pemeriksa: TahapPemeriksa[];
}
interface RuangKelengkapan {
  prodi: { kode_prodi: string; nama_prodi: string; kode_jenjang: string };
  akreditasi: InfoAkreditasiProdi | null;
  persiapan: Persiapan | null;
  hak: HakKelengkapan;
  hitung: Hitung | null;
  pengingat: string;
  instrumen: { id: number; kode: string; nama: string; lembaga: string; jumlah_dokumen: number }[];
  kriteria: { id: number | null; kode: string; nama: string; jumlah: number; lengkap: number; persen: number; item: ButirKelengkapan[] }[];
  /** Rincian akreditasi dari SPMI (kartu yang sama dengan SPMI » Akreditasi, hanya baca). */
  akreditasi_rinci?: { riwayat: RiwayatAkreditasi[]; integrasi: IntegrasiAkreditasiData } | null;
}
interface DetailButir extends ButirKelengkapan {
  kode_prodi: string;
  hak: HakKelengkapan & { unggah: boolean; periksa: boolean };
  komentar_daftar: { id: number; username: string; nama: string | null; isi: string; created_at: string }[];
}

const STATUS: Record<ButirKelengkapan['status'], [string, React.ComponentProps<typeof Badge>['variant']]> = {
  belum: ['Belum ada', 'neutral'],
  diunggah: ['Diunggah', 'info'],
  diperiksa: ['Diperiksa UPM', 'info'],
  lengkap: ['Lengkap', 'success'],
  perbaikan: ['Perlu perbaikan', 'warning'],
};
const KEADAAN: Record<string, React.ComponentProps<typeof Badge>['variant']> = { berlaku: 'success', segera_habis: 'warning', habis: 'danger', proses: 'info', tidak_terakreditasi: 'danger' };

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
        invalidateSiakad('akreditasi-kelengkapan');
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

// ================================================================== status akreditasi
/**
 * Kartu akreditasi terkini prodi (dari SPMI, hanya baca). Dengan `rinci` (riwayat dari SPMI) tampil kartu lengkap yang
 * sama dengan SPMI: peringkat besar, keadaan & sisa masa, tanda data impor, SK di Registri SK, sertifikat di arsip,
 * dan garis waktu riwayat.
 */
export function StatusAkreditasiProdi({ akreditasi, pengingat, rinci, className }: { akreditasi: InfoAkreditasiProdi | null | undefined; pengingat?: string; rinci?: RiwayatAkreditasi[] | null; className?: string }) {
  const a = akreditasi;
  const terkini = rinci?.find((r) => r.terkini);
  if (terkini)
    return (
      <Card className={className}>
        <CardHeader title="Status akreditasi" description="Dari SPMI (hanya baca). Perubahan dicatat petugas SPMI di SPMI » Akreditasi; usulan status baru lewat tab Usulan status akreditasi." />
        <CardContent>
          <div className="u-bkd-form">
            <KartuAkreditasi a={terkini} />
            {rinci && rinci.length > 1 ? <GarisWaktuAkreditasi riwayat={rinci} /> : null}
            {pengingat ? (
              <p className="u-bkd-keterangan u-ak-pengingat">
                <CalendarClock aria-hidden /> {pengingat}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  return (
    <Card className={className}>
      <CardHeader title="Status akreditasi" description="Dari SPMI (hanya baca). Perubahan dicatat petugas SPMI di SPMI » Akreditasi." />
      <CardContent>
        {!a ? (
          <Alert variant="warning" title="Akreditasi belum diisi">Minta petugas SPMI mencatat akreditasi prodi ini.</Alert>
        ) : (
          <div className="u-bkd-form">
            <div className="u-ak-kepala">
              <Award aria-hidden />
              <strong>{a.peringkat ?? '-'}</strong>
              <span>{a.lembaga_singkatan ?? a.lembaga_nama ?? a.lembaga ?? ''}</span>
              {a.keadaan ? <Badge variant={KEADAAN[a.keadaan] ?? 'neutral'}>{a.keadaan_label ?? a.keadaan}</Badge> : null}
            </div>
            <DescriptionList
              items={[
                { label: 'Nomor SK', value: a.nomor_sk || '-' },
                { label: 'Berlaku sampai', value: `${tgl(a.berlaku_sampai)}${a.sisa_hari != null ? (a.sisa_hari >= 0 ? ` (${angka(a.sisa_hari, 0)} hari lagi)` : ` (lewat ${angka(-a.sisa_hari, 0)} hari)`) : ''}` },
                ...(a.target_reakreditasi ? [{ label: 'Target reakreditasi', value: tgl(a.target_reakreditasi) }] : []),
              ]}
            />
          </div>
        )}
        {pengingat ? (
          <p className="u-bkd-keterangan u-ak-pengingat">
            <CalendarClock aria-hidden /> {pengingat}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ================================================================== lampiran data
interface Lampiran {
  ts: number;
  tahun_akademik: string;
  data: { kode: string; nama: string; nilai: string | number | null; satuan: string; sumber: string; catatan?: string }[];
  lkps_tabel: { kode: string; judul: string }[];
}

/** Data otomatis dari SIAKAD untuk dokumen akreditasi + ekspor CSV; tabel LKPS lengkap diunduh per tabel. */
export function LampiranDataAkreditasi({ kodeProdi, className }: { kodeProdi: string; className?: string }) {
  const d = useSiakadQuery<Lampiran>(['akreditasi-kelengkapan', 'lampiran', kodeProdi], q(`${BASIS}/prodi/${kodeProdi}/lampiran`));
  const s = useSiakad();
  const toast = useToast();
  const unduhLkps = async (kode: string) => {
    try {
      const r = await s.request<unknown>({ method: 'GET', path: `/v1/spmi/lkps/${kodeProdi}`, query: { format: 'csv', tabel: kode } });
      const x = r.data as { blob?: () => Blob } | Blob | string | null;
      const blob = x instanceof Blob ? x : x && typeof x === 'object' && typeof x.blob === 'function' ? x.blob() : new Blob([typeof x === 'string' ? x : JSON.stringify(x)], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const el = document.createElement('a');
      el.href = url;
      el.download = `lkps-${kodeProdi}-${kode}.csv`;
      el.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      toast.add({ title: 'Gagal mengunduh', description: pesan(e), type: 'error' });
    }
  };
  if (!d.data) return d.error ? <Alert variant="danger">{pesan(d.error)}</Alert> : <Skeleton style={{ height: 200 }} />;
  return (
    <div className={cn('u-bkd-form', className)}>
      <p className="u-bkd-keterangan">TS {d.data.ts} ({d.data.tahun_akademik}). Dihitung dari data SIAKAD, SDM, LP2M, kurikulum, tracer, dan EDOM; perbaiki datanya di sumber bila keliru.</p>
      <DataTable
        rows={d.data.data}
        rowKey={(r) => r.kode}
        columnToggle={false}
        densityToggle={false}
        exportCsv={`lampiran-akreditasi-${kodeProdi}`}
        columns={[
          { key: 'nama', header: 'Data', mobile: 'title', value: (r) => r.nama },
          { key: 'nilai', header: 'Nilai', align: 'end', mobile: 'badge', value: (r) => (r.nilai == null ? '' : `${r.nilai}${r.satuan && r.satuan !== '' ? ` ${r.satuan}` : ''}`), cell: (r) => (r.nilai == null ? <span className="u-bkd-keterangan">{r.catatan ?? 'Belum ada data'}</span> : `${typeof r.nilai === 'number' ? angka(r.nilai, 2) : r.nilai}${r.satuan ? ` ${r.satuan}` : ''}`) },
          { key: 'sumber', header: 'Sumber', value: (r) => r.sumber },
        ]}
      />
      <Card>
        <CardHeader title="Tabel LKPS (CSV)" description="Disusun otomatis per tabel IAPS; unduh lalu salin ke templat lembaga." />
        <CardContent>
          <div className="u-ak-lkps">
            {d.data.lkps_tabel.map((t) => (
              <Button key={t.kode} variant="outline" size="sm" onClick={() => void unduhLkps(t.kode)}>
                <Download /> {t.kode} · {t.judul}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ================================================================== panel butir
/** Panel samping satu dokumen: alur pemeriksa, bukti, penanggung jawab & tenggat, pemeriksaan, komentar. */
export function PanelButirKelengkapan({ id, onOpenChange }: { id: number; onOpenChange: (o: boolean) => void }) {
  const d = useSiakadQuery<DetailButir>(['akreditasi-kelengkapan', 'butir', id], q(`${BASIS}/${id}`), { staleTime: 0 });
  const x = d.data;
  const s = useSiakad();
  const toast = useToast();
  const { kirim, sibuk } = useKirim();
  const [berkas, setBerkas] = React.useState<string | null>(null);
  const [pj, setPj] = React.useState<{ pic: string; tenggat: string } | null>(null);
  const [catatan, setCatatan] = React.useState('');
  const [komentar, setKomentar] = React.useState('');
  const atur = pj ?? { pic: x?.pic_username ?? '', tenggat: x?.tenggat ?? '' };
  const muat = () => d.refetch();
  const lihatBukti = async () => {
    try {
      const r = await s.request<unknown>({ method: 'GET', path: `${BASIS}/${id}/berkas` });
      const v = r.data as { blob?: () => Blob } | Blob | null;
      const blob = v instanceof Blob ? v : v && typeof v === 'object' && typeof v.blob === 'function' ? v.blob() : null;
      if (!blob) throw new Error('Bukti tidak dapat dibuka.');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      toast.add({ title: 'Gagal membuka bukti', description: pesan(e), type: 'error' });
    }
  };
  const tombolPeriksa = x?.hak.periksa ? (x.hak.spmi ? 'Nyatakan lengkap' : 'Teruskan ke SPMI') : null;
  return (
    <Sheet
      open
      onOpenChange={onOpenChange}
      size="lg"
      title={x ? `${x.dokumen.kode} · ${x.dokumen.nama}` : 'Dokumen akreditasi'}
      description={x ? `${STATUS[x.status][0]}${x.tenggat ? ` · tenggat ${tgl(x.tenggat)}` : ''}${x.pic_nama ? ` · PJ ${x.pic_nama}` : ''}` : undefined}
      footer={
        x && tombolPeriksa ? (
          <>
            <Button variant="destructive-soft" loading={sibuk} disabled={catatan.trim().length < 5} onClick={async () => { await kirim('POST', `${BASIS}/${id}/periksa`, { keputusan: 'kembalikan', catatan }, 'Dikembalikan untuk perbaikan.'); setCatatan(''); muat(); }}>
              <Undo2 /> Kembalikan
            </Button>
            <Button loading={sibuk} onClick={async () => { await kirim('POST', `${BASIS}/${id}/periksa`, { keputusan: 'lanjut', catatan }, x.hak.spmi ? 'Dokumen dinyatakan lengkap.' : 'Diteruskan ke SPMI.'); setCatatan(''); muat(); }}>
              <Send /> {tombolPeriksa}
            </Button>
          </>
        ) : undefined
      }
    >
      {!x ? (
        d.error ? <Alert variant="danger">{pesan(d.error)}</Alert> : <Skeleton style={{ height: 240 }} />
      ) : (
        <div className="u-bkd-form">
          <AlurPemeriksa pemeriksa={x.pemeriksa} judul="Alur pemeriksaan" />
          {x.dokumen.keterangan ? <p className="u-bkd-keterangan">{x.dokumen.keterangan}</p> : null}
          {x.status === 'perbaikan' && (x.catatan_periksa || x.upm_catatan) ? <Alert variant="warning" title="Perlu perbaikan">{x.catatan_periksa || x.upm_catatan}</Alert> : null}
          <Card>
            <CardHeader title="Bukti" description={x.berkas_nama ? `${x.berkas_nama} · diunggah ${tgl(x.diunggah_at)}` : 'Belum ada bukti.'} />
            <CardContent>
              <div className="u-bkd-form">
                {x.berkas_id ? (
                  <div>
                    <Button variant="outline" size="sm" onClick={() => void lihatBukti()}>
                      <Download /> Lihat bukti
                    </Button>
                  </div>
                ) : null}
                {x.hak.unggah ? (
                  <>
                    <Field label={x.berkas_id ? 'Ganti bukti' : 'Unggah bukti'} description="PDF/gambar/dokumen; disimpan di berkas terpusat.">
                      <PilihBerkas value={berkas} onValueChange={(v) => setBerkas(v)} modul="spmi" />
                    </Field>
                    <div>
                      <Button size="sm" disabled={!berkas} loading={sibuk} onClick={async () => { await kirim('POST', `${BASIS}/${id}/unggah`, { berkas_id: berkas }, 'Bukti diunggah.'); setBerkas(null); muat(); }}>
                        <FileUp /> Kirim bukti
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
          {x.hak.kelola ? (
            <Card>
              <CardHeader title="Penanggung jawab & tenggat" />
              <CardContent>
                <FormGrid>
                  <Field label="Penanggung jawab" description="Username/NIDN dosen atau tendik.">
                    <Input value={atur.pic} onChange={(e) => setPj({ ...atur, pic: e.target.value })} />
                  </Field>
                  <Field label="Tenggat">
                    <Input type="date" value={atur.tenggat} onChange={(e) => setPj({ ...atur, tenggat: e.target.value })} />
                  </Field>
                </FormGrid>
                <div className="u-bkd-aksi">
                  <Button size="sm" variant="outline" disabled={!pj} loading={sibuk} onClick={async () => { await kirim('PUT', `${BASIS}/${id}`, { pic_username: atur.pic.trim() || null, tenggat: atur.tenggat || null }, 'Penanggung jawab dan tenggat disimpan.'); setPj(null); muat(); }}>
                    Simpan
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
          {tombolPeriksa ? (
            <Field label="Catatan pemeriksaan" description="Wajib bila mengembalikan (minimal 5 huruf); tersimpan juga sebagai komentar.">
              <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
            </Field>
          ) : null}
          <Card>
            <CardHeader title={`Komentar (${x.komentar_daftar.length})`} />
            <CardContent>
              <ul className="u-ak-komentar">
                {x.komentar_daftar.map((k) => (
                  <li key={k.id}>
                    <strong>{k.nama || k.username}</strong> <small>{tgl(k.created_at)}</small>
                    <p>{k.isi}</p>
                  </li>
                ))}
              </ul>
              <Field label="Tulis komentar">
                <Textarea rows={2} value={komentar} onChange={(e) => setKomentar(e.target.value)} />
              </Field>
              <div className="u-bkd-aksi">
                <Button size="sm" variant="outline" disabled={!komentar.trim()} loading={sibuk} onClick={async () => { await kirim('POST', `${BASIS}/${id}/komentar`, { isi: komentar }); setKomentar(''); muat(); }}>
                  <MessageSquare /> Kirim komentar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Sheet>
  );
}

// ================================================================== ruang kerja satu prodi
/** Ruang kerja kelengkapan akreditasi satu prodi (Fakultas dan SPMI). */
export function RuangKelengkapanAkreditasi({ kodeProdi, className }: { kodeProdi: string; className?: string }) {
  const d = useSiakadQuery<RuangKelengkapan>(['akreditasi-kelengkapan', 'ruang', kodeProdi], q(`${BASIS}/prodi/${kodeProdi}`), { staleTime: 0 });
  const [buka, setBuka] = React.useState<number | null>(null);
  const [tab, setTab] = React.useState<'dokumen' | 'lampiran'>('dokumen');
  const [saring, setSaring] = React.useState<string>('');
  const { kirim, sibuk } = useKirim();
  const [mulai, setMulai] = React.useState<{ instrumen: string; target: string; jenis: string }>({ instrumen: '', target: '', jenis: 'reakreditasi' });
  const x = d.data;
  if (!x) return d.error ? <Alert variant="danger">{pesan(d.error)}</Alert> : <Skeleton style={{ height: 320 }} />;
  const h = x.hitung;
  const semua = x.kriteria.flatMap((k) => k.item);
  const tampil = (item: ButirKelengkapan[]) => item.filter((i) => !saring || (saring === 'terlambat' ? i.terlambat : i.status === saring));
  return (
    <div className={cn('u-bkd-form', className)}>
      {x.akreditasi_rinci?.riwayat.some((r) => r.terkini) ? <StatusAkreditasiProdi akreditasi={x.akreditasi} pengingat={x.pengingat} rinci={x.akreditasi_rinci.riwayat} /> : null}
      <div className="u-ak-atas">
        {x.akreditasi_rinci?.riwayat.some((r) => r.terkini) ? null : <StatusAkreditasiProdi akreditasi={x.akreditasi} pengingat={x.pengingat} />}
        {x.persiapan && h ? (
          <Card>
            <CardHeader title="Kelengkapan dokumen" description={`${x.persiapan.nama_instrumen ?? x.persiapan.kode_instrumen ?? 'Instrumen'} · ${x.persiapan.jenis}${x.persiapan.target_pengajuan ? ` · target pengajuan ${tgl(x.persiapan.target_pengajuan)}` : ''}`} />
            <CardContent>
              <Progress value={h.persen} max={100} label={`${h.lengkap} dari ${h.wajib} dokumen wajib lengkap`} showValue format={(v) => `${angka(v)}%`} tone={h.persen >= 100 ? 'success' : undefined} />
              <StatGrid>
                <StatCard label="Menunggu periksa" value={h.menunggu_periksa} />
                <StatCard label="Perlu perbaikan" value={h.perbaikan} />
                <StatCard label="Belum ada" value={h.belum} />
                <StatCard label="Lewat tenggat" value={h.terlambat} />
              </StatGrid>
            </CardContent>
          </Card>
        ) : null}
      </div>
      {!x.persiapan ? (
        <Card>
          <CardHeader title="Ruang kerja kelengkapan belum dimulai" description="Pilih instrumen lembaga; daftar dokumen (LED, LKPS, tabel, dokumen pendukung per kriteria) diambil dari data SPMI." />
          <CardContent>
            {x.hak.kelola ? (
              <div className="u-bkd-form">
                <FormGrid columns={3}>
                  <Field label="Instrumen" required>
                    <Select options={x.instrumen.map((i) => ({ value: String(i.id), label: `${i.nama} (${i.jumlah_dokumen} dokumen)` }))} value={mulai.instrumen || null} onValueChange={(v) => setMulai({ ...mulai, instrumen: v ? String(v) : '' })} placeholder="Pilih…" />
                  </Field>
                  <Field label="Jenis">
                    <Select options={[{ value: 'reakreditasi', label: 'Reakreditasi' }, { value: 'baru', label: 'Akreditasi baru' }, { value: 'peningkatan', label: 'Peningkatan peringkat' }, { value: 'perpanjangan', label: 'Perpanjangan' }]} value={mulai.jenis} onValueChange={(v) => setMulai({ ...mulai, jenis: v ? String(v) : 'reakreditasi' })} placeholder="Pilih…" />
                  </Field>
                  <Field label="Target pengajuan" optional>
                    <Input type="date" value={mulai.target} onChange={(e) => setMulai({ ...mulai, target: e.target.value })} />
                  </Field>
                </FormGrid>
                <div>
                  <Button disabled={!mulai.instrumen} loading={sibuk} onClick={() => void kirim('POST', `${BASIS}/prodi/${kodeProdi}/mulai`, { instrumen_id: Number(mulai.instrumen), jenis: mulai.jenis, target_pengajuan: mulai.target || null }, 'Ruang kerja kelengkapan dimulai.').then(() => d.refetch())}>
                    <Play /> Mulai ruang kerja
                  </Button>
                </div>
              </div>
            ) : (
              <p className="u-bkd-keterangan">Dimulai oleh Kaprodi/penanggung jawab akreditasi prodi atau petugas SPMI.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as typeof tab)}
          items={[
            {
              value: 'dokumen',
              label: `Dokumen (${semua.length})`,
              content: (
                <div className="u-bkd-form">
                  <div className="u-ak-kriteria">
                    {x.kriteria.map((k) => (
                      <div key={k.kode}>
                        <Progress size="sm" value={k.persen} max={100} label={`${k.kode} · ${k.nama}`} showValue format={(v) => `${angka(v, 0)}%`} tone={k.persen >= 100 ? 'success' : undefined} />
                      </div>
                    ))}
                  </div>
                  <div className="u-bkd-aksi">
                    <Select
                      options={[{ value: 'belum', label: 'Belum ada' }, { value: 'perbaikan', label: 'Perlu perbaikan' }, { value: 'diunggah', label: 'Menunggu periksa' }, { value: 'lengkap', label: 'Lengkap' }, { value: 'terlambat', label: 'Lewat tenggat' }]}
                      value={saring || null}
                      onValueChange={(v) => setSaring(v ? String(v) : '')}
                      placeholder="Pilih…"
                    />
                    {saring ? <Button variant="ghost" size="sm" onClick={() => setSaring('')}>Semua status</Button> : null}
                  </div>
                  {x.kriteria.map((k) =>
                    tampil(k.item).length ? (
                      <Card key={k.kode}>
                        <CardHeader title={`${k.kode === 'UMUM' ? '' : `${k.kode} · `}${k.nama}`} description={`${k.lengkap} dari ${k.jumlah} lengkap`} />
                        <CardContent>
                          <DataTable
                            rows={tampil(k.item)}
                            rowKey={(r) => String(r.id)}
                            columnToggle={false}
                            densityToggle={false}
                            pagination={false}
                            onRowClick={(r) => setBuka(r.id)}
                            columns={[
                              { key: 'dokumen', header: 'Dokumen', mobile: 'title', value: (r) => r.dokumen.nama, cell: (r) => <span className="u-kur-sel"><strong>{r.dokumen.nama}</strong><small>{r.dokumen.kode}{r.dokumen.wajib ? '' : ' · opsional'}{r.dokumen.sumber_data ? ' · ada data otomatis' : ''}</small></span> },
                              { key: 'pj', header: 'Penanggung jawab', value: (r) => r.pic_nama ?? '', cell: (r) => r.pic_nama ?? '-' },
                              { key: 'tenggat', header: 'Tenggat', shrink: true, value: (r) => r.tenggat ?? '', cell: (r) => (r.tenggat ? <span data-terlambat={r.terlambat || undefined} className="u-ak-tenggat">{tgl(r.tenggat)}</span> : '-') },
                              { key: 'status', header: 'Status', mobile: 'badge', value: (r) => STATUS[r.status][0], cell: (r) => (r.status === 'lengkap' || r.status === 'belum' || r.status === 'perbaikan' ? <Badge variant={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge> : <LabelPemeriksa pemeriksa={r.pemeriksa} cadangan={<Badge variant={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge>} />) },
                              { key: 'komentar', header: '', shrink: true, value: (r) => r.komentar, cell: (r) => (r.komentar ? <span className="u-ak-jml"><MessageSquare aria-hidden /> {r.komentar}</span> : null) },
                            ]}
                          />
                        </CardContent>
                      </Card>
                    ) : null,
                  )}
                </div>
              ),
            },
            { value: 'lampiran', label: 'Lampiran data otomatis', content: <LampiranDataAkreditasi kodeProdi={kodeProdi} /> },
          ]}
        />
      )}
      {buka ? <PanelButirKelengkapan id={buka} onOpenChange={(o) => { if (!o) { setBuka(null); d.refetch(); } }} /> : null}
    </div>
  );
}

// ================================================================== ringkasan semua prodi
interface RingkasanProdi {
  kode_prodi: string;
  nama_prodi: string;
  jenjang: string;
  kode_fakultas: string;
  nama_fakultas: string | null;
  akreditasi: InfoAkreditasiProdi | null;
  persiapan: Persiapan | null;
  hitung: Hitung | null;
  hak: HakKelengkapan;
}

/** Ringkasan kelengkapan akreditasi per prodi (SPMI: semua prodi; Fakultas: prodi berizin). */
export function RingkasanKelengkapanAkreditasi({ fakultas, onPilih, className }: { fakultas?: string; onPilih: (kodeProdi: string) => void; className?: string }) {
  const d = useSiakadQuery<{ prodi: RingkasanProdi[]; total: { prodi: number; ruang_kerja: number; menunggu_periksa: number; segera_habis: number } }>(['akreditasi-kelengkapan', 'ringkasan', fakultas ?? ''], q(BASIS, { fakultas }), { staleTime: 0 });
  if (!d.data) return d.error ? <Alert variant="danger">{pesan(d.error)}</Alert> : <Skeleton style={{ height: 240 }} />;
  const t = d.data.total;
  return (
    <div className={cn('u-bkd-form', className)}>
      <StatGrid>
        <StatCard label="Program studi" value={t.prodi} />
        <StatCard label="Ruang kerja berjalan" value={t.ruang_kerja} />
        <StatCard label="Dokumen menunggu periksa" value={t.menunggu_periksa} />
        <StatCard label="Akreditasi segera habis/habis" value={t.segera_habis} />
      </StatGrid>
      <DataTable
        rows={d.data.prodi}
        rowKey={(r) => r.kode_prodi}
        columnToggle={false}
        densityToggle={false}
        exportCsv="kelengkapan-akreditasi"
        onRowClick={(r) => onPilih(r.kode_prodi)}
        columns={[
          { key: 'prodi', header: 'Program studi', mobile: 'title', value: (r) => r.nama_prodi, cell: (r) => <span className="u-kur-sel"><strong>{r.nama_prodi}</strong><small>{r.kode_prodi} · {r.nama_fakultas ?? r.kode_fakultas}</small></span> },
          { key: 'akreditasi', header: 'Akreditasi', value: (r) => (r.akreditasi ? `${r.akreditasi.peringkat ?? ''} ${r.akreditasi.lembaga_singkatan ?? ''}` : 'Belum diisi'), cell: (r) => (r.akreditasi ? <span className="u-kur-sel"><strong>{r.akreditasi.peringkat ?? '-'} · {r.akreditasi.lembaga_singkatan ?? r.akreditasi.lembaga ?? ''}</strong><small>{r.akreditasi.keadaan_label ?? ''}{r.akreditasi.berlaku_sampai ? ` · s.d. ${tgl(r.akreditasi.berlaku_sampai)}` : ''}</small></span> : <Badge variant="warning">Belum diisi</Badge>) },
          { key: 'persen', header: 'Kelengkapan', value: (r) => r.hitung?.persen ?? '', cell: (r) => (r.hitung ? <Progress size="sm" value={r.hitung.persen} max={100} showValue format={(v) => `${angka(v, 0)}%`} /> : <span className="u-bkd-keterangan">Belum dimulai</span>) },
          { key: 'menunggu', header: 'Menunggu periksa', align: 'end', value: (r) => r.hitung?.menunggu_periksa ?? '', cell: (r) => (r.hitung?.menunggu_periksa ? <Badge variant="info">{r.hitung.menunggu_periksa}</Badge> : '-') },
          { key: 'perbaikan', header: 'Perbaikan', align: 'end', value: (r) => r.hitung?.perbaikan ?? '', cell: (r) => r.hitung?.perbaikan || '-' },
          { key: 'terlambat', header: 'Lewat tenggat', align: 'end', value: (r) => r.hitung?.terlambat ?? '', cell: (r) => r.hitung?.terlambat || '-' },
        ]}
        empty={{ title: 'Belum ada prodi', description: 'Anda belum berwenang melihat akreditasi prodi mana pun.' }}
      />
    </div>
  );
}
