'use client';
import * as React from 'react';
import {
  CalendarClock, CheckCheck, Copy, Link2, ClipboardCheck, Download, FilePlus2, Pencil, Plus, Printer, RefreshCw, Send, Trash2, Undo2, UserCheck, UsersRound,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Card, CardContent, CardHeader, DescriptionList, Empty, Tabs } from '../components/display';
import { StatCard, StatGrid } from '../components/charts';
import { DataTable, type DataColumn } from '../components/data-table';
import { Checkbox, CheckboxGroup, Field, Input, SegmentedControl, Textarea } from '../components/forms';
import { Select } from '../components/select';
import { ConfirmDialog, Sheet, useToast } from '../components/overlays';
import { FormGrid, WizardReview } from '../components/wizard';
import { PanelLangkah } from '../components/panel-langkah';
import { IsianTanggal } from '../components/formulir';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { PilihTahunAkademik } from './cari';
import { PilihBerkas } from './pilih-berkas';
import { PilihEntitas } from './pilih';
import { AlurPemeriksa, LabelPemeriksa, type TahapPemeriksa } from './pemeriksa';
import { BannerPeriodeTerkunci, usePeriodeTerkunci } from './kunci-periode';
import { DaftarKegiatanBkd, KesimpulanBkd, RingkasanBebanBkd, SyaratBkd, TahapBkd, sksBkd, type BidangBkd, type KegiatanBkd, type SyaratBkdItem } from './bkd';

/*
 * Alur BKD lengkap (SIAKAD /v1/sdm/bkd, docs/BKD.md), dipakai bersama SDM dan portal Fakultas:
 *
 *   RuangBkdDosen        dasbor dosen: periode dibuka, susun rencana (wizard), laporan semester berjalan, riwayat
 *   LaporanBkd           isi laporan: tahap, beban per bidang, syarat, kegiatan + bukti, alur pemeriksa, aksi sesuai hak
 *   PanelLaporanBkd      LaporanBkd di panel samping (asesor, Kaprodi/Dekan, SDM)
 *   AntreanBkd           pekerjaan saya: menilai (asesor), mengetahui (Kaprodi/Dekan), menetapkan (Biro SDM)
 *   RekapBkd             rekap periode per fakultas/prodi/dosen, siapa belum mengisi, tindak lanjut; aksi SDM
 *   KelolaPeriodeBkd     periode BKD + wizard buka/ubah periode (jadwal tahap, versi aturan, penugasan asesor)
 *   KelolaAsesorBkd      daftar asesor BKD terdaftar (internal/PT lain, NIRA, masa berlaku, kuota, beban)
 *
 * Semua form di panel samping; form banyak isian memakai PanelLangkah (wizard).
 */

// ================================================================== tipe

export interface PeriodeBkd {
  id: number;
  nama: string;
  tahun_id: string | null;
  nama_tahun?: string | null;
  mulai: string;
  selesai: string;
  batas_pengisian: string | null;
  status: 'draft' | 'buka' | 'tutup';
  aturan_id: number | null;
  aturan_nama?: string | null;
  aturan_versi?: number | null;
  rencana_selesai?: string | null;
  kirim_selesai?: string | null;
  penilaian_selesai?: string | null;
  penetapan_selesai?: string | null;
  penugasan_asesor?: 'otomatis' | 'manual';
  catatan?: string | null;
  jumlah_laporan?: number;
  jumlah_ditetapkan?: number;
  tahap?: { kode: string; judul: string; tenggat: string | null };
}

export interface RumusBkd {
  jenis: 'manual' | 'per_sks' | 'per_volume' | 'tetap' | 'jabatan';
  faktor: number | null;
  nilai: number | null;
  maks: number | null;
}
export interface KategoriBkd {
  kode: string;
  bidang: string;
  nama: string;
  satuan: string;
  rumus: RumusBkd;
  sumber: string;
  bukti: { wajib: boolean; otomatis: boolean; jenis: string[] };
  aktif: boolean;
  keterangan: string;
}

export interface HasilBkd {
  dasar: 'rencana' | 'realisasi' | 'diakui';
  dasar_total: number;
  bidang: BidangBkd[];
  syarat: SyaratBkdItem[];
  total: { rencana: number; realisasi: number; diakui: number };
  minimal: number | null;
  maksimal: number | null;
  dibebaskan: { nama: string; keterangan: string } | null;
  kesimpulan_perkiraan: string;
  kesimpulan: string;
}

interface Orang {
  id: number;
  nama: string;
  gelar_depan?: string | null;
  gelar_belakang?: string | null;
  nidn?: string | null;
}

export interface LaporanBkdData {
  id: number;
  uuid: string;
  periode_id: number;
  pegawai_id: number;
  status: 'draft' | 'diajukan' | 'dikembalikan' | 'dinilai' | 'disahkan';
  kesimpulan: string;
  penilai1_id: number | null;
  penilai2_id: number | null;
  penilai1?: Orang | null;
  penilai2?: Orang | null;
  catatan_penilai?: string | null;
  disahkan_at?: string | null;
  periode: PeriodeBkd;
  pegawai: { id: number; nama: string; nidn: string | null; kode_prodi: string | null; jabatan_akademik?: { kode: string; nama: string } | null };
  item: (KegiatanBkd & { sumber_ref?: string | null; masa?: string | null; sks_dasar?: number | null })[];
  bkd: {
    fase: 'rencana' | 'pelaksanaan';
    kesimpulan: string;
    tindak_lanjut: string | null;
    asesor1_at: string | null;
    asesor2_at: string | null;
    kaprodi_at: string | null;
    kaprodi_catatan: string | null;
    dekan_at: string | null;
    dekan_catatan: string | null;
    aturan_id: number;
    asesor_luar?: Record<string, { id: number; nama: string; nidn: string | null; pt_asal: string | null; email: string | null; hp: string | null } | null>;
    jadwal: Record<'rencana_selesai' | 'kirim_selesai' | 'penilaian_selesai' | 'penetapan_selesai' | 'mulai' | 'selesai', string | null>;
  };
  hasil: HasilBkd;
  tahap: { kode: string; judul: string };
  pemeriksa: TahapPemeriksa[];
  pemeriksa_label: string | null;
  bisa: {
    ubah_isi: boolean;
    impor: boolean;
    fase: boolean;
    kirim: boolean;
    nilai: boolean;
    asesor_ke: number | null;
    kembalikan: boolean;
    mengetahui: ('kaprodi' | 'dekan')[];
    tetapkan: boolean;
    atur_asesor: boolean;
    tindak_lanjut: boolean;
    tautan_asesor?: number[];
  };
  aturan?: { id: number; nama: string; versi: number; dasar_hukum: string | null; bidang: { kode: string; nama: string }[]; kategori: KategoriBkd[]; batas: { min_total: number | null; maks_total: number | null }; asesor: { jumlah: number }; tahap: { kaprodi: boolean; dekan: boolean } };
  periksa?: { blokir: { kode: string; pesan: string; item_id?: number }[]; peringatan: { kode: string; pesan: string; item_id?: number }[] };
  unit?: { prodi: { nama: string } | null; fakultas: { nama: string } | null };
}

type RingkasLaporan = Pick<LaporanBkdData, 'id' | 'periode_id' | 'pegawai_id' | 'status' | 'periode' | 'pegawai' | 'bkd' | 'pemeriksa' | 'pemeriksa_label' | 'hasil' | 'tahap' | 'bisa'> & { jumlah_kegiatan: number };

// ================================================================== bantu

const tglPendek = (s?: string | null) => (s ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s.length <= 10 ? `${s}T00:00:00` : s.replace(' ', 'T'))) : '-');
const nama = (o?: Orang | null) => (o ? [o.gelar_depan, o.nama].filter(Boolean).join(' ') + (o.gelar_belakang ? `, ${o.gelar_belakang}` : '') : '-');
const angka = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
const teksAngka = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));

const SUMBER_IMPOR = [
  { value: 'mengajar', label: 'Kelas yang diampu', description: 'Jadwal kuliah dan team teaching semester ini (SKS dibagi rata bila team teaching).' },
  { value: 'bimbingan', label: 'Bimbingan tugas akhir', description: 'Mahasiswa bimbingan semester ini dan yang masih berjalan.' },
  { value: 'penguji', label: 'Menguji tugas akhir', description: 'Pengujian tugas akhir semester ini.' },
  { value: 'penelitian', label: 'Penelitian LPPM', description: 'Penelitian yang diterima/berjalan/selesai di LPPM (ketua atau anggota).' },
  { value: 'pengabdian', label: 'Pengabdian LPPM', description: 'Pengabdian kepada masyarakat yang tercatat di LPPM.' },
  { value: 'tugas_tambahan', label: 'Tugas tambahan', description: 'Jabatan pimpinan dari riwayat jabatan SDM dan Organisasi.' },
] as const;

const TAHAP_REKAP: Record<string, [string, React.ComponentProps<typeof Badge>['variant']]> = {
  belum_mengisi: ['Belum mengisi', 'neutral'],
  rencana: ['Menyusun rencana', 'info'],
  pelaksanaan: ['Mengisi kinerja', 'info'],
  perbaikan: ['Perlu perbaikan', 'warning'],
  penilaian: ['Dinilai asesor', 'warning'],
  mengetahui: ['Kaprodi/Dekan', 'warning'],
  ditetapkan: ['Ditetapkan', 'success'],
  dibebaskan: ['Dibebaskan', 'secondary'],
};
export function LencanaTahapBkd({ tahap }: { tahap: string }) {
  const [l, v] = TAHAP_REKAP[tahap] ?? [tahap, 'neutral'];
  return (
    <Badge variant={v} dot>
      {l}
    </Badge>
  );
}

function jalan<T>(s: ReturnType<typeof useSiakad>, method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) {
  return s.request<T>({ method, path, body } as Parameters<typeof s.request>[0]).then((r) => r.data as T);
}

/** Aksi tulis BKD: panggil API, toast, segarkan semua data BKD. Kembalikan hasil atau lempar galat (sudah di-toast). */
export function useAksiBkd() {
  const s = useSiakad();
  const toast = useToast();
  return React.useCallback(
    async <T,>(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown, sukses?: string): Promise<T> => {
      try {
        const r = await jalan<T>(s, method, path, body);
        if (sukses) toast.add({ title: sukses, type: 'success' });
        invalidateSiakad('bkd');
        return r;
      } catch (e) {
        toast.add({ title: 'Belum berhasil', description: pesanGalat(e), type: 'error' });
        throw e;
      }
    },
    [s, toast],
  );
}

const q = <T,>(path: string) => (s: ReturnType<typeof useSiakad>, signal: AbortSignal) => s.request<T>({ method: 'GET', path }, { signal });
export const useLaporanBkd = (id: number | string | null) => useSiakadQuery<LaporanBkdData>(['bkd', 'laporan', id], q(`/v1/sdm/bkd/laporan/${id}`), { enabled: id !== null && id !== '' });
export const useBkdSaya = () => useSiakadQuery<{ pegawai: LaporanBkdData['pegawai'] | null; periode: PeriodeBkd[]; laporan: RingkasLaporan[]; dibebaskan: { nama: string; keterangan: string } | null }>(['bkd', 'saya'], q('/v1/sdm/bkd/saya'));
export const useAntreanBkd = (enabled = true) => useSiakadQuery<{ menilai: RingkasLaporan[]; mengetahui: RingkasLaporan[]; menetapkan: RingkasLaporan[] }>(['bkd', 'antrean'], q('/v1/sdm/bkd/antrean'), { enabled });
export const usePeriodeBkd = () => useSiakadQuery<PeriodeBkd[]>(['bkd', 'periode'], q('/v1/sdm/bkd/periode'));

// ================================================================== dasbor dosen

/**
 * Dasbor BKD dosen: periode yang dibuka (mulai lewat wizard susun rencana), laporan semester berjalan lengkap, dan
 * riwayat semester. `pegawaiAda` false menampilkan petunjuk menghubungkan akun dengan data SDM.
 */
export function RuangBkdDosen({ className }: { className?: string }) {
  const saya = useBkdSaya();
  const [pilih, setPilih] = React.useState<number | null>(null);
  const [susun, setSusun] = React.useState<number | null>(null);
  if (saya.loading && !saya.data) return <Skeleton style={{ height: 320 }} />;
  if (saya.error) return <Alert variant="danger" title="BKD belum bisa dimuat">{pesanGalat(saya.error)}</Alert>;
  const d = saya.data;
  if (!d?.pegawai) {
    return (
      <Alert variant="warning" title="Akun belum terhubung dengan data pegawai">
        Laporan BKD membutuhkan data dosen di modul SDM. Minta operator kepegawaian menyinkronkan data dosen Anda.
      </Alert>
    );
  }
  const laporan = d.laporan;
  const aktif = laporan.find((l) => l.id === pilih) ?? laporan.find((l) => l.periode.status === 'buka') ?? laporan[0] ?? null;
  return (
    <div className={cn('u-bkd-ruang', className)}>
      {d.periode.map((p) => (
        <Card key={p.id} className="u-bkd-buka">
          <CardContent>
            <div className="u-bkd-buka-isi">
              <span className="u-bkd-buka-ikon">
                <CalendarClock aria-hidden />
              </span>
              <div>
                <p className="u-bkd-label">Periode BKD dibuka</p>
                <h3>{p.nama}</h3>
                <p className="u-bkd-keterangan">
                  {p.nama_tahun ?? p.tahun_id} · aturan {p.aturan_nama ?? '-'} v{p.aturan_versi ?? '-'} · rencana sampai {tglPendek(p.rencana_selesai)} · kirim sampai {tglPendek(p.kirim_selesai ?? p.batas_pengisian)}
                </p>
              </div>
              <TombolSusunBkd tahunId={p.tahun_id} prodi={d.pegawai?.kode_prodi ?? null} disabled={!!d.dibebaskan} onClick={() => setSusun(p.id)} />
            </div>
            {d.dibebaskan ? (
              <Alert variant="info" title={`Anda dibebaskan dari BKD: ${d.dibebaskan.nama}`}>
                {d.dibebaskan.keterangan}
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      ))}
      {aktif ? (
        <>
          {laporan.length > 1 ? (
            <div className="u-bkd-riwayat" role="tablist" aria-label="Riwayat semester">
              {laporan.map((l) => (
                <button key={l.id} type="button" role="tab" aria-selected={l.id === aktif.id} onClick={() => setPilih(l.id)}>
                  <span>{l.periode.nama}</span>
                  <KesimpulanBkd nilai={l.bkd.kesimpulan} />
                </button>
              ))}
            </div>
          ) : null}
          <LaporanBkd id={aktif.id} />
        </>
      ) : d.periode.length === 0 ? (
        <Empty bordered icon={<ClipboardCheck />} title="Belum ada periode BKD yang dibuka" description="Biro SDM membuka periode BKD per semester. Anda akan diberi tahu saat periode dibuka." />
      ) : null}
      {susun !== null ? <PanelSusunRencanaBkd periode={d.periode} awal={susun} onOpenChange={(o) => !o && setSusun(null)} onSelesai={(id) => setPilih(id)} /> : null}
    </div>
  );
}

/** Tombol mulai rencana; nonaktif bila semester periode ditutup (kunci periode akademik, fitur bkd). */
function TombolSusunBkd({ tahunId, prodi, disabled, onClick }: { tahunId: string | null; prodi: string | null; disabled?: boolean; onClick: () => void }) {
  const k = usePeriodeTerkunci(tahunId, { fitur: 'bkd', prodi });
  return (
    <Button onClick={onClick} disabled={disabled || k.terkunci} title={k.terkunci ? k.pesan : undefined}>
      <FilePlus2 /> Susun rencana BKD
    </Button>
  );
}

/** Wizard mulai laporan: pilih semester, pilih data yang diimpor dari SIAKAD, ringkasan. */
export function PanelSusunRencanaBkd({ periode, awal, pegawaiId, onOpenChange, onSelesai }: { periode: PeriodeBkd[]; awal?: number | null; pegawaiId?: number; onOpenChange: (o: boolean) => void; onSelesai?: (id: number) => void }) {
  const aksi = useAksiBkd();
  const [pid, setPid] = React.useState<string | null>(awal ? String(awal) : periode.length === 1 ? String(periode[0]!.id) : null);
  const [sumber, setSumber] = React.useState<string[]>(SUMBER_IMPOR.map((x) => x.value));
  const [step, setStep] = React.useState(0);
  const p = periode.find((x) => String(x.id) === pid) ?? null;
  const aturan = useSiakadQuery<{ isi: { batas: { min_total: number | null; maks_total: number | null }; bidang: { nama: string; aktif: boolean }[] } }>(['bkd', 'aturan', p?.aturan_id], q(`/v1/sdm/bkd/aturan/${p?.aturan_id}`), { enabled: !!p?.aturan_id });
  const batas = aturan.data?.isi.batas;
  return (
    <PanelLangkah
      open
      onOpenChange={onOpenChange}
      title="Susun rencana BKD"
      description="Kegiatan dari SIAKAD diisi otomatis; kegiatan lain bisa ditambahkan sesudahnya."
      step={step}
      onStepChange={setStep}
      finishLabel="Buat rencana"
      steps={[
        {
          id: 'semester',
          title: 'Semester',
          description: 'Pilih periode BKD yang sedang dibuka Biro SDM.',
          validate: () => (p ? null : 'Pilih periode BKD.'),
          content: (
            <div className="u-bkd-form">
              <Field label="Periode BKD" required>
                <Select options={periode.map((x) => ({ value: String(x.id), label: `${x.nama} (${x.nama_tahun ?? x.tahun_id})` }))} value={pid} onValueChange={setPid} placeholder="Pilih periode…" />
              </Field>
              {p ? (
                <>
                  <TahapBkd aktif={p.tahap?.kode ?? 'rencana'} tenggat={{ rencana: p.rencana_selesai, pelaksanaan: p.kirim_selesai ?? p.batas_pengisian, penilaian: p.penilaian_selesai, mengetahui: p.penetapan_selesai }} />
                  <DescriptionList
                    items={[
                      { label: 'Aturan BKD', value: `${p.aturan_nama ?? '-'} (versi ${p.aturan_versi ?? '-'})` },
                      { label: 'Beban yang dipersyaratkan', value: batas ? `${batas.min_total != null ? `minimal ${sksBkd(batas.min_total)}` : ''}${batas.maks_total != null ? `, maksimal ${sksBkd(batas.maks_total)}` : ''}` : '…' },
                      { label: 'Bidang', value: aturan.data?.isi.bidang.filter((b) => b.aktif).map((b) => b.nama).join(', ') ?? '…' },
                    ]}
                  />
                </>
              ) : null}
            </div>
          ),
        },
        {
          id: 'impor',
          title: 'Impor dari SIAKAD',
          description: 'Data ini dibaca dari SIAKAD dan LPPM; Anda tetap bisa mengubah atau menghapusnya.',
          optional: true,
          content: <CheckboxGroup variant="card" columns={2} options={SUMBER_IMPOR.map((x) => ({ ...x }))} value={sumber} onValueChange={setSumber} />,
        },
        {
          id: 'ringkasan',
          title: 'Ringkasan',
          content: (
            <WizardReview
              sections={[
                { title: 'Semester', items: [{ label: 'Periode', value: p?.nama }, { label: 'Aturan', value: p ? `${p.aturan_nama} v${p.aturan_versi}` : null }], onEdit: () => setStep(0) },
                { title: 'Diimpor otomatis', items: [{ label: 'Sumber', value: sumber.length ? SUMBER_IMPOR.filter((x) => sumber.includes(x.value)).map((x) => x.label).join(', ') : 'Tidak ada (isi manual)' }], onEdit: () => setStep(1) },
              ]}
            />
          ),
        },
      ]}
      onFinish={async () => {
        try {
          const r = await aksi<LaporanBkdData>('POST', '/v1/sdm/bkd/laporan', { periode_id: Number(pid), ...(pegawaiId ? { pegawai_id: pegawaiId } : {}) });
          if (sumber.length) await aksi('POST', `/v1/sdm/bkd/laporan/${r.id}/impor`, { sumber }, 'Rencana dibuat dan kegiatan dari SIAKAD sudah diimpor.');
          onSelesai?.(r.id);
          return null;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

// ================================================================== laporan

/**
 * Isi laporan BKD dengan aksi sesuai hak (`bisa` dari API): dosen menyusun/mengirim, asesor menilai, Kaprodi/Dekan
 * mengetahui, Biro SDM menugaskan asesor dan menetapkan. `ringkas` untuk tampilan di panel samping.
 */
export function LaporanBkd({ id, ringkas = false, className }: { id: number | string; ringkas?: boolean; className?: string }) {
  const lap = useLaporanBkd(id);
  const aksi = useAksiBkd();
  const [kegiatan, setKegiatan] = React.useState<LaporanBkdData['item'][number] | 'baru' | null>(null);
  const [bidangBaru, setBidangBaru] = React.useState<string | null>(null);
  const [hapus, setHapus] = React.useState<LaporanBkdData['item'][number] | null>(null);
  const [panel, setPanel] = React.useState<'kirim' | 'nilai' | 'ketahui' | 'kembalikan' | 'asesor' | 'tetapkan' | 'tindak' | 'impor' | 'tautan' | null>(null);
  const [sibuk, setSibuk] = React.useState(false);
  // Kunci periode akademik (BAAK): semester yang ditutup hanya bisa dilihat kecuali dibuka kembali untuk fitur bkd.
  const kunci = usePeriodeTerkunci(lap.data?.periode.tahun_id ?? null, { fitur: 'bkd', prodi: lap.data?.pegawai.kode_prodi ?? null });
  if (lap.loading && !lap.data) return <Skeleton style={{ height: 420 }} />;
  if (lap.error || !lap.data) return <Alert variant="danger" title="Laporan BKD belum bisa dimuat">{pesanGalat(lap.error)}</Alert>;
  const L = lap.data;
  const h = L.hasil;
  const b: LaporanBkdData['bisa'] = kunci.terkunci
    ? { ...L.bisa, ubah_isi: false, impor: false, fase: false, kirim: false, nilai: false, kembalikan: false, mengetahui: [], tetapkan: false, atur_asesor: false, tindak_lanjut: false }
    : L.bisa;
  const kat = Object.fromEntries((L.aturan?.kategori ?? []).map((k) => [k.kode, k.nama]));
  const jadwal = L.bkd.jadwal;
  const fase = async (f: 'rencana' | 'pelaksanaan') => {
    setSibuk(true);
    try {
      await aksi('POST', `/v1/sdm/bkd/laporan/${L.id}/fase-${f}`, undefined, f === 'pelaksanaan' ? 'Rencana selesai. Isi realisasi dan bukti kegiatan.' : 'Kembali ke penyusunan rencana.');
    } finally {
      setSibuk(false);
    }
  };
  return (
    <div className={cn('u-bkd-laporan', ringkas && 'u-bkd-laporan-ringkas', className)}>
      <Card>
        <CardContent>
          <div className="u-bkd-kepala">
            <div>
              <p className="u-bkd-label">{L.periode.nama} · aturan {L.aturan?.nama} v{L.aturan?.versi}</p>
              <h3 className="u-bkd-judul">{L.pegawai.nama}</h3>
              <p className="u-bkd-keterangan">
                {[L.pegawai.nidn ? `NIDN ${L.pegawai.nidn}` : null, L.unit?.prodi?.nama, L.pegawai.jabatan_akademik?.nama].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="u-bkd-kepala-status">
              <LabelPemeriksa pemeriksa={L.pemeriksa} cadangan={<Badge variant={L.status === 'dikembalikan' ? 'warning' : 'neutral'} dot>{L.tahap.judul}</Badge>} />
              <KesimpulanBkd nilai={L.status === 'dinilai' || L.status === 'disahkan' ? L.bkd.kesimpulan : h.kesimpulan_perkiraan} perkiraan={!(L.status === 'dinilai' || L.status === 'disahkan')} />
            </div>
          </div>
          <TahapBkd aktif={L.tahap.kode} tenggat={{ rencana: jadwal.rencana_selesai, pelaksanaan: jadwal.kirim_selesai, penilaian: jadwal.penilaian_selesai, mengetahui: jadwal.penetapan_selesai }} className="u-bkd-tahap-laporan" />
          <div className="u-bkd-aksi">
            {b.impor ? (
              <Button variant="outline" onClick={() => setPanel('impor')}>
                <RefreshCw /> Impor dari SIAKAD
              </Button>
            ) : null}
            {b.ubah_isi ? (
              <Button variant="outline" onClick={() => { setBidangBaru(null); setKegiatan('baru'); }}>
                <Plus /> Tambah kegiatan
              </Button>
            ) : null}
            {b.fase && L.bkd.fase === 'rencana' ? (
              <Button loading={sibuk} onClick={() => void fase('pelaksanaan')}>
                <CheckCheck /> Rencana selesai
              </Button>
            ) : null}
            {b.fase && L.bkd.fase === 'pelaksanaan' && L.status === 'draft' ? (
              <Button variant="ghost" loading={sibuk} onClick={() => void fase('rencana')}>
                <Undo2 /> Ubah rencana
              </Button>
            ) : null}
            {b.kirim ? (
              <Button onClick={() => setPanel('kirim')}>
                <Send /> Kirim ke asesor
              </Button>
            ) : null}
            {b.nilai ? (
              <Button onClick={() => setPanel('nilai')}>
                <ClipboardCheck /> Nilai sebagai asesor {b.asesor_ke ?? ''}
              </Button>
            ) : null}
            {b.mengetahui.length ? (
              <Button onClick={() => setPanel('ketahui')}>
                <UserCheck /> Mengetahui ({b.mengetahui[0] === 'kaprodi' ? 'Kaprodi' : 'Dekan'})
              </Button>
            ) : null}
            {b.tetapkan ? (
              <Button onClick={() => setPanel('tetapkan')}>
                <CheckCheck /> Tetapkan
              </Button>
            ) : null}
            {b.kembalikan ? (
              <Button variant="outline" onClick={() => setPanel('kembalikan')}>
                <Undo2 /> Kembalikan
              </Button>
            ) : null}
            {b.atur_asesor ? (
              <Button variant="outline" onClick={() => setPanel('asesor')}>
                <UsersRound /> Atur asesor
              </Button>
            ) : null}
            {b.tautan_asesor?.length ? (
              <Button variant="outline" onClick={() => setPanel('tautan')}>
                <Link2 /> Tautan asesor eksternal
              </Button>
            ) : null}
            {b.tindak_lanjut ? (
              <Button variant="outline" onClick={() => setPanel('tindak')}>
                <Pencil /> Tindak lanjut
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => cetakLaporanBkd(L)}>
              <Printer /> Unduh laporan
            </Button>
          </div>
        </CardContent>
      </Card>
      <BannerPeriodeTerkunci periode={L.periode.tahun_id} fitur="bkd" prodi={L.pegawai.kode_prodi} />
      {L.status === 'dikembalikan' && L.catatan_penilai ? (
        <Alert variant="warning" title="Laporan dikembalikan untuk diperbaiki">
          {L.catatan_penilai}
        </Alert>
      ) : null}
      {h.dibebaskan ? <Alert variant="info" title={`Dibebaskan: ${h.dibebaskan.nama}`}>{h.dibebaskan.keterangan}</Alert> : null}
      {L.bkd.tindak_lanjut ? <Alert variant="neutral" title="Tindak lanjut Biro SDM">{L.bkd.tindak_lanjut}</Alert> : null}
      <div className="u-bkd-grid">
        <Card>
          <CardContent>
            <RingkasanBebanBkd bidang={h.bidang} total={h.dasar_total} minimal={h.minimal} maksimal={h.maksimal} dasar={h.dasar} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="u-bkd-samping">
            <SyaratBkd syarat={h.syarat} />
            {L.periksa && (L.periksa.blokir.length > 0 || L.periksa.peringatan.length > 0) && (L.status === 'draft' || L.status === 'dikembalikan') ? <DaftarPeriksa periksa={L.periksa} /> : null}
            <AlurPemeriksa pemeriksa={L.pemeriksa} judul="Alur pemeriksaan" />
            <DescriptionList
              items={[
                { label: 'Asesor 1', value: L.bkd.asesor_luar?.[1] ? `${L.bkd.asesor_luar[1].nama} (eksternal, ${L.bkd.asesor_luar[1].pt_asal ?? 'PT lain'})` : nama(L.penilai1) },
                ...(L.aturan?.asesor.jumlah === 2 ? [{ label: 'Asesor 2', value: L.bkd.asesor_luar?.[2] ? `${L.bkd.asesor_luar[2].nama} (eksternal, ${L.bkd.asesor_luar[2].pt_asal ?? 'PT lain'})` : nama(L.penilai2) }] : []),
              ]}
            />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader title="Kegiatan" description={L.bkd.fase === 'rencana' && L.status === 'draft' ? 'Rencana kegiatan semester ini. Tandai rencana selesai bila sudah lengkap.' : 'Realisasi kegiatan beserta bukti. Bukti wajib mengikuti aturan BKD tiap kategori.'} />
        <CardContent>
          <DaftarKegiatanBkd
            bidang={L.aturan?.bidang ?? h.bidang}
            kegiatan={L.item}
            kategori={kat}
            dasar={h.dasar}
            kosong={(bd) =>
              b.ubah_isi ? (
                <Button variant="ghost" size="sm" onClick={() => { setBidangBaru(bd.kode); setKegiatan('baru'); }}>
                  <Plus /> Tambah kegiatan {bd.nama.toLowerCase()}
                </Button>
              ) : (
                'Belum ada kegiatan.'
              )
            }
            aksi={
              b.ubah_isi
                ? (k) => (
                    <>
                      <Button size="sm" variant="ghost" iconOnly aria-label={`Ubah ${k.kegiatan}`} onClick={() => setKegiatan(k as LaporanBkdData['item'][number])}>
                        <Pencil />
                      </Button>
                      <Button size="sm" variant="ghost" iconOnly aria-label={`Hapus ${k.kegiatan}`} onClick={() => setHapus(k as LaporanBkdData['item'][number])}>
                        <Trash2 />
                      </Button>
                    </>
                  )
                : undefined
            }
          />
        </CardContent>
      </Card>
      {kegiatan ? <PanelKegiatanBkd laporan={L} kegiatan={kegiatan === 'baru' ? null : kegiatan} bidangAwal={bidangBaru} onOpenChange={(o) => !o && setKegiatan(null)} /> : null}
      <ConfirmDialog
        open={!!hapus}
        onOpenChange={(o) => !o && setHapus(null)}
        title="Hapus kegiatan ini?"
        description={hapus?.kegiatan}
        confirmLabel="Hapus kegiatan"
        onConfirm={async () => {
          if (hapus) await aksi('DELETE', `/v1/sdm/bkd/kegiatan/${hapus.id}`, undefined, 'Kegiatan dihapus.');
          setHapus(null);
        }}
      />
      {panel === 'impor' ? <PanelImporBkd laporan={L} onOpenChange={(o) => !o && setPanel(null)} /> : null}
      {panel === 'kirim' ? <PanelKirimBkd laporan={L} onOpenChange={(o) => !o && setPanel(null)} /> : null}
      {panel === 'nilai' ? <PanelPenilaianBkd laporan={L} onOpenChange={(o) => !o && setPanel(null)} /> : null}
      {panel === 'ketahui' || panel === 'kembalikan' || panel === 'tetapkan' || panel === 'tindak' ? <PanelKeputusanBkd laporan={L} jenis={panel} onOpenChange={(o) => !o && setPanel(null)} /> : null}
      {panel === 'asesor' ? <PanelAturAsesorBkd laporan={L} onOpenChange={(o) => !o && setPanel(null)} /> : null}
      {panel === 'tautan' ? <PanelTautanAsesorBkd laporan={L} onOpenChange={(o) => !o && setPanel(null)} /> : null}
    </div>
  );
}

function DaftarPeriksa({ periksa }: { periksa: NonNullable<LaporanBkdData['periksa']> }) {
  return (
    <div className="u-bkd-periksa">
      {periksa.blokir.length ? (
        <>
          <p className="u-bkd-label">Belum bisa dikirim</p>
          <ul data-jenis="blokir">
            {periksa.blokir.map((x, i) => (
              <li key={i}>{x.pesan}</li>
            ))}
          </ul>
        </>
      ) : null}
      {periksa.peringatan.length ? (
        <>
          <p className="u-bkd-label">Perhatian</p>
          <ul data-jenis="peringatan">
            {periksa.peringatan.map((x, i) => (
              <li key={i}>{x.pesan}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

/** Panel samping berisi LaporanBkd (untuk asesor, pimpinan, SDM dari daftar/rekap). */
export function PanelLaporanBkd({ id, onOpenChange, title = 'Laporan BKD' }: { id: number | null; onOpenChange: (o: boolean) => void; title?: React.ReactNode }) {
  return (
    <Sheet open={id !== null} onOpenChange={onOpenChange} title={title} size="xl">
      {id !== null ? <LaporanBkd id={id} ringkas /> : null}
    </Sheet>
  );
}

// ------------------------------------------------------------------ kegiatan (wizard)

const PENJELASAN_RUMUS: Record<RumusBkd['jenis'], string> = {
  manual: 'SKS diisi dosen sesuai pedoman',
  per_sks: 'SKS kelas x faktor',
  per_volume: 'jumlah x SKS per satuan',
  tetap: 'nilai tetap per kegiatan',
  jabatan: 'ekuivalen SKS jabatan',
};
function uraiRumus(k: KategoriBkd) {
  const r = k.rumus;
  const s =
    r.jenis === 'per_sks' ? `SKS kelas x ${r.faktor ?? 1}`
    : r.jenis === 'per_volume' && r.faktor != null ? `jumlah ${k.satuan || 'satuan'} x ${sksBkd(r.faktor)}`
    : r.jenis === 'tetap' ? sksBkd(r.nilai)
    : PENJELASAN_RUMUS[r.jenis === 'per_volume' ? 'manual' : r.jenis];
  return `${s}${r.maks != null ? `, paling banyak ${sksBkd(r.maks)}` : ''}`;
}

/** Wizard tambah/ubah kegiatan: jenis (kategori aturan), rincian & SKS (sesuai rumus), bukti, ringkasan. */
export function PanelKegiatanBkd({ laporan: L, kegiatan: k, bidangAwal, onOpenChange }: { laporan: LaporanBkdData; kegiatan: LaporanBkdData['item'][number] | null; bidangAwal?: string | null; onOpenChange: (o: boolean) => void }) {
  const s = useSiakad();
  const aksi = useAksiBkd();
  const toast = useToast();
  const kategori = L.aturan?.kategori ?? [];
  const bidang = L.aturan?.bidang ?? [];
  const [step, setStep] = React.useState(0);
  const [n, setN] = React.useState(() => ({
    kategori: k?.kategori ?? (bidangAwal ? kategori.find((c) => c.bidang === bidangAwal && c.sumber === 'manual')?.kode ?? kategori.find((c) => c.bidang === bidangAwal)?.kode ?? null : null),
    kegiatan: k?.kegiatan ?? '',
    uraian: k?.uraian ?? '',
    masa: k?.masa ?? '',
    volume: teksAngka(k?.volume),
    sks_dasar: teksAngka(k?.sks_dasar),
    sks_rencana: teksAngka(k?.sks_rencana),
    sks_realisasi: teksAngka(k?.sks_realisasi),
    bukti: k?.bukti ?? '',
    sister_url: k?.sister_url ?? '',
  }));
  const [berkas, setBerkas] = React.useState<{ id: string; nama: string }[]>([]);
  const [berkasPilih, setBerkasPilih] = React.useState<string | null>(null);
  const c = kategori.find((x) => x.kode === n.kategori) ?? null;
  const set = (kunci: keyof typeof n) => (e: { target: { value: string } }) => setN({ ...n, [kunci]: e.target.value });
  const pelaksanaan = L.bkd.fase === 'pelaksanaan';
  const otomatisDariRumus = c && (c.rumus.jenis === 'per_sks' || (c.rumus.jenis === 'per_volume' && c.rumus.faktor != null) || c.rumus.jenis === 'tetap');
  const pratinjau = (() => {
    if (!c) return null;
    const r = c.rumus;
    const batas = (x: number) => (r.maks != null ? Math.min(x, r.maks) : x);
    if (r.jenis === 'per_sks' && angka(n.sks_dasar) != null) return batas(angka(n.sks_dasar)! * (r.faktor ?? 1));
    if (r.jenis === 'per_volume' && r.faktor != null && angka(n.volume) != null) return batas(angka(n.volume)! * r.faktor);
    if (r.jenis === 'tetap') return r.nilai;
    return angka(n.sks_rencana);
  })();
  const otomatisBukti = !!c?.bukti.otomatis && !!k?.sumber && k.sumber !== 'manual';
  const punyaBukti = (k?.file?.length ?? 0) + berkas.length > 0 || n.bukti.trim() !== '' || n.sister_url.trim() !== '';
  const opsiKategori = kategori.map((x) => ({ value: x.kode, label: x.nama, group: bidang.find((bd) => bd.kode === x.bidang)?.nama ?? x.bidang }));
  return (
    <PanelLangkah
      open
      onOpenChange={onOpenChange}
      title={k ? 'Ubah kegiatan' : 'Tambah kegiatan'}
      description={L.periode.nama}
      mode={k ? 'ubah' : 'buat'}
      step={step}
      onStepChange={setStep}
      finishLabel={k ? 'Simpan perubahan' : 'Simpan kegiatan'}
      footerNote="Kolom bertanda * wajib"
      steps={[
        {
          id: 'jenis',
          title: 'Jenis kegiatan',
          description: 'Kategori menentukan bidang, cara menghitung SKS, dan bukti yang diminta aturan BKD.',
          validate: () => (c ? null : 'Pilih kategori kegiatan.'),
          content: (
            <div className="u-bkd-form">
              <Field label="Kategori kegiatan" required>
                <Select options={opsiKategori} value={n.kategori} onValueChange={(v) => setN({ ...n, kategori: v })} placeholder="Pilih kategori…" />
              </Field>
              {c ? (
                <div className="u-bkd-info-kategori">
                  <DescriptionList
                    items={[
                      { label: 'Bidang', value: bidang.find((bd) => bd.kode === c.bidang)?.nama ?? c.bidang },
                      { label: 'Ekuivalen SKS', value: uraiRumus(c) },
                      { label: 'Bukti', value: c.bukti.wajib ? (c.bukti.jenis.length ? c.bukti.jenis.join(', ') : 'Wajib dilampirkan') : 'Tidak wajib' },
                    ]}
                  />
                  {c.keterangan ? <p className="u-bkd-keterangan">{c.keterangan}</p> : null}
                </div>
              ) : null}
            </div>
          ),
        },
        {
          id: 'rincian',
          title: 'Rincian dan SKS',
          validate: () => {
            if (!n.kegiatan.trim()) return 'Isi nama kegiatan.';
            if (c?.rumus.jenis === 'per_sks' && angka(n.sks_dasar) == null && angka(n.sks_rencana) == null) return 'Isi SKS kelas.';
            if (c?.rumus.jenis === 'per_volume' && c.rumus.faktor != null && angka(n.volume) == null) return `Isi jumlah ${c.satuan || 'satuan'}.`;
            if (!otomatisDariRumus && angka(n.sks_rencana) == null) return 'Isi SKS rencana.';
            if (c?.rumus.maks != null && (pratinjau ?? 0) > c.rumus.maks) return `SKS melebihi batas ${sksBkd(c.rumus.maks)} per kegiatan.`;
            return null;
          },
          content: (
            <FormGrid>
              <Field label="Nama kegiatan" required style={{ gridColumn: '1 / -1' }}>
                <Input value={n.kegiatan} onChange={set('kegiatan')} placeholder="mis. Panitia penerimaan mahasiswa baru 2026" />
              </Field>
              <Field label="Uraian" optional style={{ gridColumn: '1 / -1' }}>
                <Textarea rows={2} value={n.uraian} onChange={set('uraian')} />
              </Field>
              {c?.rumus.jenis === 'per_sks' ? (
                <Field label="SKS kelas/kegiatan" required description="Bagian Anda bila team teaching.">
                  <Input inputMode="decimal" value={n.sks_dasar} onChange={set('sks_dasar')} />
                </Field>
              ) : null}
              {c && (c.rumus.jenis === 'per_volume' || c.satuan) && c.rumus.jenis !== 'per_sks' ? (
                <Field label={`Jumlah ${c.satuan || 'satuan'}`} required={c.rumus.jenis === 'per_volume' && c.rumus.faktor != null}>
                  <Input inputMode="decimal" value={n.volume} onChange={set('volume')} />
                </Field>
              ) : null}
              {!otomatisDariRumus ? (
                <Field label="SKS rencana" required description={c ? uraiRumus(c) : undefined}>
                  <Input inputMode="decimal" value={n.sks_rencana} onChange={set('sks_rencana')} />
                </Field>
              ) : null}
              {pelaksanaan ? (
                <Field label="SKS realisasi" optional description="Kosongkan bila sama dengan rencana.">
                  <Input inputMode="decimal" value={n.sks_realisasi} onChange={set('sks_realisasi')} />
                </Field>
              ) : null}
              <Field label="Masa penugasan" optional>
                <Input value={n.masa} onChange={set('masa')} placeholder="mis. 1 semester" />
              </Field>
              <div className="u-bkd-pratinjau-sks" style={{ gridColumn: '1 / -1' }}>
                <span>Ekuivalen SKS</span>
                <strong>{pratinjau == null ? '-' : sksBkd(pratinjau)}</strong>
                {c ? <small>{uraiRumus(c)}</small> : null}
              </div>
            </FormGrid>
          ),
        },
        {
          id: 'bukti',
          title: 'Bukti',
          description: otomatisBukti ? 'Kegiatan dari SIAKAD sudah dianggap berbukti; lampiran tambahan boleh.' : c?.bukti.wajib ? 'Bukti wajib sebelum laporan dikirim ke asesor.' : 'Bukti tidak wajib untuk kategori ini.',
          optional: !c?.bukti.wajib || otomatisBukti,
          validate: () => (pelaksanaan && c?.bukti.wajib && !otomatisBukti && !punyaBukti ? 'Lampirkan berkas, tautan, atau nomor dokumen bukti.' : null),
          content: (
            <div className="u-bkd-form">
              {c?.bukti.jenis.length ? <Alert variant="info" title="Bukti yang diminta">{c.bukti.jenis.join(', ')}</Alert> : null}
              {k?.file?.length ? (
                <div>
                  <p className="u-bkd-label">Berkas terlampir</p>
                  <ul className="u-bkd-berkas">
                    {k.file.map((f) => (
                      <li key={f.uuid}>{f.nama}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Field label="Unggah berkas bukti" description="PDF/gambar; bisa beberapa berkas.">
                <PilihBerkas
                  value={berkasPilih}
                  kategori="dokumen"
                  modul="sdm_kinerja_item"
                  keterangan="Bukti BKD"
                  onValueChange={(id, b) => {
                    if (id && b) setBerkas((x) => (x.some((y) => y.id === id) ? x : [...x, { id, nama: (b as { nama?: string }).nama ?? 'Berkas' }]));
                    setBerkasPilih(null);
                  }}
                />
              </Field>
              {berkas.length ? (
                <ul className="u-bkd-berkas">
                  {berkas.map((f) => (
                    <li key={f.id}>
                      {f.nama} <Button size="sm" variant="ghost" onClick={() => setBerkas((x) => x.filter((y) => y.id !== f.id))}>Lepas</Button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <FormGrid>
                <Field label="Nomor/keterangan dokumen" optional>
                  <Input value={n.bukti} onChange={set('bukti')} placeholder="mis. SK Rektor 123/2026" />
                </Field>
                <Field label="Tautan SISTER" optional description="Tautan kegiatan di SISTER bila ada.">
                  <Input value={n.sister_url} onChange={set('sister_url')} placeholder="https://sister.kemdiktisaintek.go.id/…" />
                </Field>
              </FormGrid>
            </div>
          ),
        },
        {
          id: 'ringkasan',
          title: 'Ringkasan',
          content: (
            <WizardReview
              sections={[
                { title: 'Jenis', items: [{ label: 'Kategori', value: c?.nama }, { label: 'Bidang', value: bidang.find((bd) => bd.kode === c?.bidang)?.nama }], onEdit: () => setStep(0) },
                {
                  title: 'Rincian',
                  items: [
                    { label: 'Kegiatan', value: n.kegiatan },
                    { label: 'Uraian', value: n.uraian },
                    { label: 'SKS', value: pratinjau == null ? null : sksBkd(pratinjau) },
                    ...(pelaksanaan && n.sks_realisasi ? [{ label: 'SKS realisasi', value: sksBkd(angka(n.sks_realisasi)) }] : []),
                  ],
                  onEdit: () => setStep(1),
                },
                {
                  title: 'Bukti',
                  items: [
                    { label: 'Berkas', value: (k?.file?.length ?? 0) + berkas.length ? `${(k?.file?.length ?? 0) + berkas.length} berkas` : null },
                    { label: 'Dokumen', value: n.bukti },
                    { label: 'SISTER', value: n.sister_url },
                  ],
                  missing: pelaksanaan && c?.bukti.wajib && !otomatisBukti && !punyaBukti ? 'Bukti wajib belum ada.' : undefined,
                  onEdit: () => setStep(2),
                },
              ]}
            />
          ),
        },
      ]}
      onFinish={async () => {
        const body = {
          kategori: n.kategori,
          kegiatan: n.kegiatan.trim(),
          uraian: n.uraian.trim() || null,
          masa: n.masa.trim() || null,
          volume: angka(n.volume),
          sks_dasar: angka(n.sks_dasar),
          ...(otomatisDariRumus ? {} : { sks_rencana: angka(n.sks_rencana) }),
          ...(pelaksanaan && n.sks_realisasi.trim() !== '' ? { sks_realisasi: angka(n.sks_realisasi) } : {}),
          bukti: n.bukti.trim() || null,
          sister_url: n.sister_url.trim() || null,
        };
        try {
          const lama = new Set(L.item.map((i) => i.id));
          const r = k
            ? await aksi<LaporanBkdData>('PUT', `/v1/sdm/bkd/kegiatan/${k.id}`, body)
            : await aksi<LaporanBkdData>('POST', `/v1/sdm/bkd/laporan/${L.id}/kegiatan`, body);
          const itemId = k?.id ?? r.item.find((i) => !lama.has(i.id))?.id;
          if (itemId && berkas.length) {
            for (const f of berkas) await s.request({ method: 'POST', path: '/v1/sdm/file', body: { entitas: 'kinerja_item', entitas_id: itemId, berkas_id: f.id } });
            invalidateSiakad('bkd');
          }
          toast.add({ title: k ? 'Kegiatan diperbarui.' : 'Kegiatan ditambahkan.', type: 'success' });
          return null;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

function PanelImporBkd({ laporan: L, onOpenChange }: { laporan: LaporanBkdData; onOpenChange: (o: boolean) => void }) {
  const aksi = useAksiBkd();
  const toast = useToast();
  const [sumber, setSumber] = React.useState<string[]>(SUMBER_IMPOR.map((x) => x.value));
  const [sibuk, setSibuk] = React.useState(false);
  return (
    <Sheet
      open
      onOpenChange={onOpenChange}
      title="Impor kegiatan dari SIAKAD"
      description="Aman diulang: kegiatan yang sama diperbarui, SKS realisasi yang sudah Anda isi tidak ditimpa."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            loading={sibuk}
            disabled={!sumber.length}
            onClick={async () => {
              setSibuk(true);
              try {
                const r = await aksi<{ diimpor: Record<string, number> }>('POST', `/v1/sdm/bkd/laporan/${L.id}/impor`, { sumber });
                const t = Object.entries(r.diimpor).filter(([, v]) => v > 0).map(([k, v]) => `${SUMBER_IMPOR.find((x) => x.value === k)?.label ?? k}: ${v}`).join(', ');
                toast.add({ title: 'Impor selesai', description: t || 'Tidak ada data baru di SIAKAD untuk semester ini.', type: 'success' });
                onOpenChange(false);
              } finally {
                setSibuk(false);
              }
            }}
          >
            <Download /> Impor sekarang
          </Button>
        </>
      }
    >
      <CheckboxGroup variant="card" columns={1} options={SUMBER_IMPOR.map((x) => ({ ...x }))} value={sumber} onValueChange={setSumber} />
    </Sheet>
  );
}

// ------------------------------------------------------------------ kirim, nilai, keputusan

function PanelKirimBkd({ laporan: L, onOpenChange }: { laporan: LaporanBkdData; onOpenChange: (o: boolean) => void }) {
  const aksi = useAksiBkd();
  const [setuju, setSetuju] = React.useState(false);
  const [sibuk, setSibuk] = React.useState(false);
  const blokir = L.periksa?.blokir ?? [];
  return (
    <Sheet
      open
      onOpenChange={onOpenChange}
      title="Kirim BKD ke asesor"
      description={`${L.periode.nama} · batas kirim ${tglPendek(L.bkd.jadwal.kirim_selesai)}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            loading={sibuk}
            disabled={blokir.length > 0 || !setuju}
            onClick={async () => {
              setSibuk(true);
              try {
                await aksi('POST', `/v1/sdm/bkd/laporan/${L.id}/kirim`, {}, 'BKD terkirim ke asesor.');
                onOpenChange(false);
              } finally {
                setSibuk(false);
              }
            }}
          >
            <Send /> Kirim laporan
          </Button>
        </>
      }
    >
      <div className="u-bkd-form">
        <RingkasanBebanBkd bidang={L.hasil.bidang} total={L.hasil.dasar_total} minimal={L.hasil.minimal} maksimal={L.hasil.maksimal} dasar={L.hasil.dasar} kesimpulan={L.hasil.kesimpulan_perkiraan} perkiraan judul="Yang akan dikirim" />
        {L.periksa ? <DaftarPeriksa periksa={L.periksa} /> : null}
        {blokir.length === 0 && (L.periksa?.peringatan.length ?? 0) === 0 ? <Alert variant="success" title="Siap dikirim">Semua kegiatan sudah ber-SKS dan berbukti.</Alert> : null}
        <AlurPemeriksa pemeriksa={L.pemeriksa} judul="Laporan akan diperiksa oleh" />
        <label className="u-bkd-setuju">
          <Checkbox checked={setuju} onCheckedChange={(v) => setSetuju(v === true)} /> Saya menyatakan kegiatan dan bukti yang saya laporkan benar. Setelah dikirim laporan dikunci kecuali dikembalikan.
        </label>
      </div>
    </Sheet>
  );
}

/** Penilaian asesor: M/TM per kegiatan, SKS diakui, catatan (wajib untuk TM). Simpan sementara atau kirim. */
export function PanelPenilaianBkd({ laporan: L, onOpenChange }: { laporan: LaporanBkdData; onOpenChange: (o: boolean) => void }) {
  const aksi = useAksiBkd();
  const ke = L.bisa.asesor_ke ?? 1;
  const [nilai, setNilai] = React.useState<Record<number, { hasil: 'M' | 'TM' | null; sks: string; catatan: string }>>(() =>
    Object.fromEntries(
      L.item.map((i) => {
        const n = i.nilai_asesor?.find((x) => x.asesor_ke === ke);
        return [i.id, { hasil: n?.hasil ?? null, sks: teksAngka(n?.sks_diakui ?? i.sks_realisasi ?? i.sks_rencana), catatan: n?.catatan ?? '' }];
      }),
    ),
  );
  const [catatan, setCatatan] = React.useState('');
  const [sibuk, setSibuk] = React.useState<null | 'simpan' | 'kirim'>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const belum = L.item.filter((i) => !nilai[i.id]?.hasil).length;
  const tmTanpaCatatan = L.item.filter((i) => nilai[i.id]?.hasil === 'TM' && !nilai[i.id]?.catatan.trim()).length;
  const diakui = L.item.reduce((s, i) => s + (nilai[i.id]?.hasil === 'M' ? Number(angka(nilai[i.id]!.sks) ?? 0) : 0), 0);
  const kirim = async (selesai: boolean) => {
    if (selesai && belum) return setGalat(`Masih ada ${belum} kegiatan yang belum dinilai.`);
    if (tmTanpaCatatan) return setGalat('Catatan wajib diisi untuk setiap kegiatan TM.');
    setGalat(null);
    setSibuk(selesai ? 'kirim' : 'simpan');
    try {
      await aksi(
        'POST',
        `/v1/sdm/bkd/laporan/${L.id}/nilai`,
        {
          item: L.item.filter((i) => nilai[i.id]?.hasil).map((i) => ({ id: i.id, hasil: nilai[i.id]!.hasil, sks_diakui: nilai[i.id]!.hasil === 'M' ? angka(nilai[i.id]!.sks) : null, catatan: nilai[i.id]!.catatan.trim() || null })),
          catatan: catatan.trim() || null,
          selesai,
          ...(L.bisa.asesor_ke ? {} : { asesor_ke: ke }),
        },
        selesai ? 'Penilaian terkirim.' : 'Penilaian tersimpan sementara.',
      );
      if (selesai) onOpenChange(false);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSibuk(null);
    }
  };
  return (
    <Sheet
      open
      onOpenChange={onOpenChange}
      title={`Nilai BKD sebagai asesor ${ke}`}
      description={`${L.pegawai.nama} · ${L.periode.nama}`}
      size="xl"
      footer={
        <div className="u-bkd-kaki">
          {galat ? <p className="u-bkd-galat" role="alert">{galat}</p> : <p className="u-bkd-keterangan">{L.item.length - belum} dari {L.item.length} dinilai · diakui {sksBkd(diakui)}</p>}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <Button variant="outline" loading={sibuk === 'simpan'} onClick={() => void kirim(false)}>
            Simpan sementara
          </Button>
          <Button loading={sibuk === 'kirim'} onClick={() => void kirim(true)}>
            <Send /> Kirim penilaian
          </Button>
        </div>
      }
    >
      <div className="u-bkd-form">
        <RingkasanBebanBkd bidang={L.hasil.bidang} total={L.hasil.dasar_total} minimal={L.hasil.minimal} maksimal={L.hasil.maksimal} dasar={L.hasil.dasar} judul="Klaim dosen" />
        <div className="u-bkd-aksi">
          <Button size="sm" variant="outline" onClick={() => setNilai(Object.fromEntries(L.item.map((i) => [i.id, { ...nilai[i.id]!, hasil: nilai[i.id]?.hasil ?? 'M' }])))}>
            <CheckCheck /> Tandai yang belum sebagai M
          </Button>
        </div>
        <DaftarKegiatanBkd
          bidang={L.aturan?.bidang ?? L.hasil.bidang}
          kegiatan={L.item}
          kategori={Object.fromEntries((L.aturan?.kategori ?? []).map((k) => [k.kode, k.nama]))}
          dasar="realisasi"
          sisipan={(k) => {
            const v = nilai[k.id]!;
            const ubah = (x: Partial<typeof v>) => setNilai({ ...nilai, [k.id]: { ...v, ...x } });
            return (
              <div className="u-bkd-nilai" data-hasil={v.hasil ?? ''}>
                <SegmentedControl
                  aria-label={`Penilaian ${k.kegiatan}`}
                  options={[
                    { value: 'M', label: 'Memenuhi (M)' },
                    { value: 'TM', label: 'Tidak memenuhi (TM)' },
                  ]}
                  value={v.hasil ?? undefined}
                  onValueChange={(x) => ubah({ hasil: x as 'M' | 'TM' })}
                />
                <Input aria-label="SKS diakui" inputMode="decimal" value={v.sks} disabled={v.hasil !== 'M'} onChange={(e) => ubah({ sks: e.target.value })} placeholder="SKS diakui" />
                <Input aria-label="Catatan" value={v.catatan} onChange={(e) => ubah({ catatan: e.target.value })} placeholder={v.hasil === 'TM' ? 'Alasan TM (wajib)' : 'Catatan (opsional)'} aria-invalid={v.hasil === 'TM' && !v.catatan.trim() ? true : undefined} />
              </div>
            );
          }}
        />
        <Field label="Catatan umum untuk dosen" optional>
          <Textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  );
}

function PanelKeputusanBkd({ laporan: L, jenis, onOpenChange }: { laporan: LaporanBkdData; jenis: 'ketahui' | 'kembalikan' | 'tetapkan' | 'tindak'; onOpenChange: (o: boolean) => void }) {
  const aksi = useAksiBkd();
  const [catatan, setCatatan] = React.useState(jenis === 'tindak' ? L.bkd.tindak_lanjut ?? '' : '');
  const [sibuk, setSibuk] = React.useState(false);
  const sebagai = L.bisa.mengetahui[0] ?? 'kaprodi';
  const conf = {
    ketahui: { judul: `Mengetahui sebagai ${sebagai === 'kaprodi' ? 'Kaprodi' : 'Dekan'}`, tombol: 'Mengetahui', wajib: false, label: 'Catatan (opsional)', path: 'mengetahui', body: { sebagai, catatan: catatan.trim() || null }, sukses: 'BKD sudah diketahui.' },
    kembalikan: { judul: 'Kembalikan untuk diperbaiki', tombol: 'Kembalikan laporan', wajib: true, label: 'Yang perlu diperbaiki', path: 'kembalikan', body: { catatan: catatan.trim() }, sukses: 'Laporan dikembalikan ke dosen.' },
    tetapkan: { judul: 'Tetapkan BKD', tombol: 'Tetapkan', wajib: false, label: '', path: 'tetapkan', body: {}, sukses: 'BKD ditetapkan.' },
    tindak: { judul: 'Tindak lanjut tidak memenuhi', tombol: 'Simpan tindak lanjut', wajib: true, label: 'Rencana tindak lanjut (pembinaan, teguran, penyesuaian tugas)', path: 'tindak-lanjut', body: { tindak_lanjut: catatan.trim() }, sukses: 'Tindak lanjut disimpan.' },
  }[jenis];
  return (
    <Sheet
      open
      onOpenChange={onOpenChange}
      title={conf.judul}
      description={`${L.pegawai.nama} · ${L.periode.nama}`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            loading={sibuk}
            disabled={conf.wajib && !catatan.trim()}
            variant={jenis === 'kembalikan' ? 'outline' : undefined}
            onClick={async () => {
              setSibuk(true);
              try {
                await aksi('POST', `/v1/sdm/bkd/laporan/${L.id}/${conf.path}`, conf.body, conf.sukses);
                onOpenChange(false);
              } finally {
                setSibuk(false);
              }
            }}
          >
            {conf.tombol}
          </Button>
        </>
      }
    >
      <div className="u-bkd-form">
        <RingkasanBebanBkd bidang={L.hasil.bidang} total={L.hasil.dasar_total} minimal={L.hasil.minimal} maksimal={L.hasil.maksimal} dasar={L.hasil.dasar} kesimpulan={L.status === 'dinilai' || L.status === 'disahkan' ? L.bkd.kesimpulan : L.hasil.kesimpulan_perkiraan} perkiraan={!(L.status === 'dinilai' || L.status === 'disahkan')} />
        <SyaratBkd syarat={L.hasil.syarat} />
        {jenis === 'tetapkan' ? <Alert variant="info" title="Setelah ditetapkan">BKD dipakai untuk PAK, remunerasi, dan syarat usulan karier. Laporan dikunci.</Alert> : null}
        {conf.label ? (
          <Field label={conf.label} required={conf.wajib}>
            <Textarea rows={4} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </Field>
        ) : null}
      </div>
    </Sheet>
  );
}

interface AsesorBkdRow {
  id: number;
  pegawai_id: number | null;
  eksternal?: boolean;
  nama?: string | null;
  nomor_sertifikat?: string | null;
  email?: string | null;
  hp?: string | null;
  berkas_id?: string | null;
  nama_lengkap: string;
  nidn: string | null;
  nira: string | null;
  asal: 'internal' | 'luar';
  pt_asal: string | null;
  kode_prodi: string | null;
  prodi_pegawai: string | null;
  nama_prodi: string | null;
  bidang_ilmu: string | null;
  berlaku_sampai: string | null;
  kuota: number | null;
  aktif: number | boolean;
  berlaku: boolean;
  beban: number;
}

function PanelAturAsesorBkd({ laporan: L, onOpenChange }: { laporan: LaporanBkdData; onOpenChange: (o: boolean) => void }) {
  const aksi = useAksiBkd();
  const daftar = useSiakadQuery<AsesorBkdRow[]>(['bkd', 'asesor', L.periode_id], q(`/v1/sdm/bkd/asesor?periode_id=${L.periode_id}`));
  const luar = L.bkd.asesor_luar ?? {};
  const awal = (ke: 1 | 2) => (luar[ke] ? `luar:${luar[ke]!.id}` : (ke === 1 ? L.penilai1_id : L.penilai2_id) ? String(ke === 1 ? L.penilai1_id : L.penilai2_id) : null);
  const [a1, setA1] = React.useState<string | null>(awal(1));
  const [a2, setA2] = React.useState<string | null>(awal(2));
  const slot = (ke: 1 | 2, v: string | null) =>
    v?.startsWith('luar:') ? { [`asesor${ke}_luar_id`]: Number(v.slice(5)) } : { [`penilai${ke}_id`]: v ? Number(v) : null, [`asesor${ke}_luar_id`]: null };
  const [sibuk, setSibuk] = React.useState(false);
  const opsi = (daftar.data ?? [])
    .filter((x) => x.berlaku && x.pegawai_id !== L.pegawai_id)
    .map((x) => ({
      value: x.eksternal ? `luar:${x.id}` : String(x.pegawai_id),
      group: x.eksternal ? 'Asesor eksternal (menilai lewat tautan)' : 'Asesor internal',
      label: `${x.nama_lengkap} · ${x.asal === 'luar' ? x.pt_asal ?? 'PT lain' : x.nama_prodi ?? x.prodi_pegawai ?? '-'} · beban ${x.beban}${(x.kode_prodi ?? x.prodi_pegawai) === L.pegawai.kode_prodi && x.asal === 'internal' ? ' · satu prodi' : ''}`,
    }));
  const dua = (L.aturan?.asesor.jumlah ?? 2) === 2;
  return (
    <Sheet
      open
      onOpenChange={onOpenChange}
      title="Atur asesor"
      description={`${L.pegawai.nama} · ${L.periode.nama}`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            loading={sibuk}
            onClick={async () => {
              setSibuk(true);
              try {
                await aksi('POST', `/v1/sdm/bkd/laporan/${L.id}/asesor`, { ...slot(1, a1), ...(dua ? slot(2, a2) : {}) }, 'Asesor disimpan.');
                onOpenChange(false);
              } finally {
                setSibuk(false);
              }
            }}
          >
            Simpan asesor
          </Button>
        </>
      }
    >
      <div className="u-bkd-form">
        <Alert variant="neutral">Hanya asesor terdaftar dan masih berlaku. Server menolak asesor yang menilai dirinya sendiri atau satu program studi bila aturan BKD melarang.</Alert>
        <Field label="Asesor 1" required>
          <Select options={opsi} value={a1} onValueChange={setA1} placeholder="Pilih asesor…" />
        </Field>
        {dua ? (
          <Field label="Asesor 2" required>
            <Select options={opsi.filter((o) => o.value !== a1)} value={a2} onValueChange={setA2} placeholder="Pilih asesor…" />
          </Field>
        ) : null}
      </div>
    </Sheet>
  );
}

/** Biro SDM membuat tautan penilaian bertoken untuk asesor eksternal (berbatas waktu, token tampil sekali). */
function PanelTautanAsesorBkd({ laporan: L, onOpenChange }: { laporan: LaporanBkdData; onOpenChange: (o: boolean) => void }) {
  const aksi = useAksiBkd();
  const toast = useToast();
  const slot = L.bisa.tautan_asesor ?? [];
  const [ke, setKe] = React.useState<string>(String(slot[0] ?? 1));
  const [hari, setHari] = React.useState('14');
  const [hasil, setHasil] = React.useState<{ tautan: string | null; token: string; kedaluwarsa_at: string } | null>(null);
  const [sibuk, setSibuk] = React.useState(false);
  const a = L.bkd.asesor_luar?.[ke];
  const tautan = hasil ? hasil.tautan ?? `${typeof window !== 'undefined' ? window.location.origin : ''}/nilai-bkd/${hasil.token}` : '';
  return (
    <Sheet
      open
      onOpenChange={onOpenChange}
      title="Tautan penilaian asesor eksternal"
      description={`${L.pegawai.nama} · ${L.periode.nama}`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          {!hasil ? (
            <Button
              loading={sibuk}
              onClick={async () => {
                setSibuk(true);
                try {
                  setHasil(await aksi('POST', `/v1/sdm/bkd/laporan/${L.id}/tautan-asesor`, { asesor_ke: Number(ke), hari: Number(hari) || 14 }));
                } finally {
                  setSibuk(false);
                }
              }}
            >
              <Link2 /> Buat tautan
            </Button>
          ) : null}
        </>
      }
    >
      <div className="u-bkd-form">
        <Alert variant="neutral">
          Asesor eksternal menilai tanpa akun SIAKAD lewat tautan ini. Tautan berlaku terbatas, hanya untuk laporan ini, dan tautan lama slot yang sama otomatis dicabut. Kirim lewat email/WA resmi.
        </Alert>
        {slot.length > 1 ? (
          <Field label="Asesor">
            <SegmentedControl options={slot.map((x) => ({ value: String(x), label: `Asesor ${x}` }))} value={ke} onValueChange={(v) => { setKe(v); setHasil(null); }} />
          </Field>
        ) : null}
        {a ? <DescriptionList items={[{ label: 'Asesor', value: a.nama }, { label: 'PT asal', value: a.pt_asal ?? '-' }, { label: 'Kontak', value: [a.email, a.hp].filter(Boolean).join(' · ') || '-' }]} /> : null}
        {!hasil ? (
          <Field label="Berlaku (hari)" description="1 sampai 30 hari.">
            <Input inputMode="numeric" value={hari} onChange={(e) => setHari(e.target.value)} />
          </Field>
        ) : (
          <>
            <Alert variant="success" title={`Tautan dibuat, berlaku sampai ${tglPendek(hasil.kedaluwarsa_at)}`}>
              Salin sekarang; tautan tidak ditampilkan lagi. Buat tautan baru bila hilang.
            </Alert>
            <div className="u-bkd-tambah-kode">
              <Input readOnly value={tautan} aria-label="Tautan penilaian" onFocus={(e) => e.currentTarget.select()} />
              <Button
                variant="outline"
                onClick={() => {
                  void navigator.clipboard?.writeText(tautan);
                  toast.add({ title: 'Tautan disalin', type: 'success' });
                }}
              >
                <Copy /> Salin
              </Button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

// ================================================================== antrean

/**
 * Pekerjaan BKD pengguna: laporan yang harus dinilai (asesor), diketahui (Kaprodi/Dekan), ditetapkan (Biro SDM).
 * Detail dan keputusan dibuka di panel samping.
 */
export function AntreanBkd({ className, kosong }: { className?: string; kosong?: React.ReactNode }) {
  const a = useAntreanBkd();
  const [buka, setBuka] = React.useState<number | null>(null);
  const [tab, setTab] = React.useState<string | null>(null);
  if (a.loading && !a.data) return <Skeleton style={{ height: 240 }} />;
  if (a.error) return <Alert variant="danger" title="Antrean BKD belum bisa dimuat">{pesanGalat(a.error)}</Alert>;
  const d = a.data ?? { menilai: [], mengetahui: [], menetapkan: [] };
  const kolom: DataColumn<RingkasLaporan>[] = [
    { key: 'pegawai', header: 'Dosen', mobile: 'title', cell: (r) => <span className="u-bkd-sel"><strong>{r.pegawai.nama}</strong><small>{[r.pegawai.nidn, r.periode.nama].filter(Boolean).join(' · ')}</small></span>, value: (r) => r.pegawai.nama },
    { key: 'sks', header: 'SKS', align: 'end', shrink: true, cell: (r) => sksBkd(r.hasil.dasar_total), value: (r) => r.hasil.dasar_total },
    { key: 'kegiatan', header: 'Kegiatan', align: 'end', shrink: true, mobile: 'meta', cell: (r) => r.jumlah_kegiatan },
    { key: 'kesimpulan', header: 'Kesimpulan', shrink: true, cell: (r) => <KesimpulanBkd nilai={r.status === 'dinilai' || r.status === 'disahkan' ? r.bkd.kesimpulan : r.hasil.kesimpulan_perkiraan} perkiraan={r.status === 'diajukan'} /> },
    { key: 'tahap', header: 'Tahap', shrink: true, mobile: 'badge', cell: (r) => <LabelPemeriksa pemeriksa={r.pemeriksa} /> },
  ];
  const items = [
    { value: 'menilai', label: 'Perlu saya nilai', count: d.menilai.length, rows: d.menilai, kosong: 'Tidak ada BKD yang menunggu penilaian Anda.' },
    { value: 'mengetahui', label: 'Perlu diketahui', count: d.mengetahui.length, rows: d.mengetahui, kosong: 'Tidak ada BKD yang menunggu Kaprodi/Dekan.' },
    { value: 'menetapkan', label: 'Siap ditetapkan', count: d.menetapkan.length, rows: d.menetapkan, kosong: 'Tidak ada BKD yang siap ditetapkan.' },
  ];
  const ada = items.filter((x) => x.count > 0);
  if (!ada.length) return <>{kosong ?? <Empty bordered icon={<ClipboardCheck />} title="Tidak ada pekerjaan BKD" description="Laporan BKD yang menunggu Anda (asesor, Kaprodi/Dekan, atau Biro SDM) muncul di sini." />}</>;
  const aktif = tab && items.some((x) => x.value === tab) ? tab : ada[0]!.value;
  return (
    <div className={className}>
      <Tabs
        value={aktif}
        onValueChange={setTab}
        items={items.map((x) => ({
          value: x.value,
          label: x.label,
          count: x.count,
          content: (
            <DataTable<RingkasLaporan>
              columns={kolom}
              rows={x.rows}
              rowKey={(r) => String(r.id)}
              onRowClick={(r) => setBuka(r.id)}
              columnToggle={false}
              densityToggle={false}
              empty={{ title: x.kosong }}
            />
          ),
        }))}
      />
      <PanelLaporanBkd id={buka} onOpenChange={(o) => !o && setBuka(null)} />
    </div>
  );
}

// ================================================================== rekap

interface RekapDosen {
  pegawai_id: number;
  nama_lengkap: string;
  nidn: string | null;
  kode_prodi: string | null;
  nama_prodi: string | null;
  nama_fakultas: string | null;
  status_aktif: string;
  kinerja_id: number | null;
  status: string | null;
  tahap: string;
  sks: number | null;
  sks_dasar: string | null;
  bidang: Record<string, number> | null;
  kesimpulan: string;
  tindak_lanjut: string | null;
  penilai1_id: number | null;
  penilai2_id: number | null;
}
interface RekapPeriodeBkd {
  periode: PeriodeBkd;
  jumlah_dosen: number;
  tahap: Record<string, number>;
  kesimpulan: Record<string, number>;
  per_prodi: { kode_prodi: string; nama_prodi: string; nama_fakultas: string | null; jumlah: number; mengisi: number; ditetapkan: number; memenuhi: number; tidak_memenuhi: number }[];
  per_fakultas: { nama_fakultas: string; jumlah: number; mengisi: number; ditetapkan: number; memenuhi: number; tidak_memenuhi: number }[];
  dosen: RekapDosen[];
  kewajiban_khusus?: { pegawai_id: number; nama_lengkap: string; nidn: string | null; kode_prodi: string | null; jabatan: string; kewajiban: string; jumlah: number; minimal: number; semester_ditetapkan: number; semester_dievaluasi: number; status: 'terpenuhi' | 'belum_terpenuhi' | 'belum_lengkap'; mode: string }[];
}

/**
 * Rekap BKD satu periode dalam cakupan pengguna (Biro SDM: universitas/unitnya; Kaprodi/Dekan: prodi/fakultasnya):
 * angka per tahap dan kesimpulan, per fakultas/prodi, daftar dosen (saring tahap, ekspor CSV), detail di panel samping.
 * `sdm` menampilkan aksi Biro SDM (tugaskan asesor otomatis, tetapkan terpilih, tindak lanjut).
 */
export function RekapBkd({ periodeId: awal, sdm = false, className }: { periodeId?: number | null; sdm?: boolean; className?: string }) {
  const per = usePeriodeBkd();
  const aksi = useAksiBkd();
  const toast = useToast();
  const [pid, setPid] = React.useState<string | null>(awal ? String(awal) : null);
  const id = pid ?? (per.data?.find((p) => p.status === 'buka') ?? per.data?.[0])?.id?.toString() ?? null;
  const r = useSiakadQuery<RekapPeriodeBkd>(['bkd', 'rekap', id], q(`/v1/sdm/bkd/periode/${id}/rekap`), { enabled: !!id });
  const [tahap, setTahap] = React.useState('semua');
  const [buka, setBuka] = React.useState<number | null>(null);
  const [pilih, setPilih] = React.useState<string[]>([]);
  const [sibuk, setSibuk] = React.useState(false);
  const d = r.data;
  const rows = (d?.dosen ?? []).filter((x) => tahap === 'semua' || (tahap === 'tidak_memenuhi' ? x.kesimpulan === 'tidak_memenuhi' : x.tahap === tahap));
  const kolom: DataColumn<RekapDosen>[] = [
    { key: 'nama', header: 'Dosen', mobile: 'title', cell: (x) => <span className="u-bkd-sel"><strong>{x.nama_lengkap}</strong><small>{[x.nidn, x.nama_prodi].filter(Boolean).join(' · ')}</small></span>, value: (x) => x.nama_lengkap },
    { key: 'fakultas', header: 'Fakultas', defaultHidden: true, value: (x) => x.nama_fakultas ?? '', cell: (x) => x.nama_fakultas ?? '-' },
    { key: 'prodi', header: 'Prodi', defaultHidden: true, value: (x) => x.nama_prodi ?? '', cell: (x) => x.nama_prodi ?? '-' },
    { key: 'tahap', header: 'Tahap', shrink: true, mobile: 'badge', cell: (x) => <LencanaTahapBkd tahap={x.tahap} />, value: (x) => TAHAP_REKAP[x.tahap]?.[0] ?? x.tahap },
    { key: 'sks', header: 'SKS', align: 'end', shrink: true, cell: (x) => (x.sks == null ? '-' : sksBkd(x.sks)), value: (x) => x.sks ?? '' },
    { key: 'kesimpulan', header: 'Kesimpulan', shrink: true, cell: (x) => (x.kinerja_id || x.kesimpulan === 'dibebaskan' ? <KesimpulanBkd nilai={x.kesimpulan} /> : <span className="u-bkd-keterangan">-</span>), value: (x) => x.kesimpulan },
    ...(sdm ? [{ key: 'tindak', header: 'Tindak lanjut', defaultHidden: true, cell: (x: RekapDosen) => x.tindak_lanjut ?? '-', value: (x: RekapDosen) => x.tindak_lanjut ?? '' }] : []),
  ];
  const bagianProdi: DataColumn<RekapPeriodeBkd['per_prodi'][number]>[] = [
    { key: 'nama_prodi', header: 'Program studi', mobile: 'title', cell: (x) => <span className="u-bkd-sel"><strong>{x.nama_prodi}</strong><small>{x.nama_fakultas}</small></span> },
    { key: 'jumlah', header: 'Dosen', align: 'end', shrink: true },
    { key: 'mengisi', header: 'Mengisi', align: 'end', shrink: true, cell: (x) => `${x.mengisi} (${x.jumlah ? Math.round((x.mengisi / x.jumlah) * 100) : 0}%)` },
    { key: 'ditetapkan', header: 'Ditetapkan', align: 'end', shrink: true },
    { key: 'memenuhi', header: 'Memenuhi', align: 'end', shrink: true },
    { key: 'tidak_memenuhi', header: 'Tidak memenuhi', align: 'end', shrink: true },
  ];
  return (
    <div className={cn('u-bkd-rekap', className)}>
      <div className="u-bkd-rekap-kepala">
        <Field label="Periode BKD">
          <Select options={(per.data ?? []).map((p) => ({ value: String(p.id), label: `${p.nama} · ${p.status === 'buka' ? 'dibuka' : p.status === 'tutup' ? 'ditutup' : 'draf'}` }))} value={id} onValueChange={(v) => { setPid(v); setPilih([]); }} placeholder="Pilih periode…" />
        </Field>
        {sdm && id ? (
          <Button
            variant="outline"
            loading={sibuk}
            onClick={async () => {
              setSibuk(true);
              try {
                const h = await aksi<{ ditugaskan: number; belum_lengkap: string[] }>('POST', `/v1/sdm/bkd/periode/${id}/tugaskan-asesor`, {});
                toast.add({ title: `${h.ditugaskan} penugasan asesor dibuat`, description: h.belum_lengkap.length ? `Belum lengkap: ${h.belum_lengkap.slice(0, 5).join(', ')}${h.belum_lengkap.length > 5 ? `, +${h.belum_lengkap.length - 5}` : ''}. Tambah asesor terdaftar.` : 'Semua laporan sudah lengkap asesornya.', type: h.belum_lengkap.length ? 'warning' : 'success' });
              } finally {
                setSibuk(false);
              }
            }}
          >
            <UsersRound /> Tugaskan asesor otomatis
          </Button>
        ) : null}
      </div>
      {d ? (
        <StatGrid>
          <StatCard label="Dosen wajib BKD" value={d.jumlah_dosen - (d.tahap.dibebaskan ?? 0)} hint={d.tahap.dibebaskan ? `${d.tahap.dibebaskan} dibebaskan` : undefined} />
          <StatCard label="Belum mengisi" value={d.tahap.belum_mengisi ?? 0} tone={(d.tahap.belum_mengisi ?? 0) > 0 ? 'warning' : undefined} />
          <StatCard label="Dalam penilaian" value={(d.tahap.penilaian ?? 0) + (d.tahap.mengetahui ?? 0)} />
          <StatCard label="Ditetapkan" value={d.tahap.ditetapkan ?? 0} tone="success" />
          <StatCard label="Memenuhi" value={d.kesimpulan.memenuhi ?? 0} tone="success" />
          <StatCard label="Tidak memenuhi" value={d.kesimpulan.tidak_memenuhi ?? 0} tone={(d.kesimpulan.tidak_memenuhi ?? 0) > 0 ? 'danger' : undefined} />
        </StatGrid>
      ) : null}
      {d && d.per_prodi.length > 1 ? (
        <Card>
          <CardHeader title="Per program studi" />
          <CardContent>
            <DataTable rows={d.per_prodi} columns={bagianProdi} rowKey={(x) => x.kode_prodi} columnToggle={false} densityToggle={false} exportCsv={`rekap-bkd-prodi-${id}`} />
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader title="Dosen" description={d ? `${d.periode.nama} · aturan ${d.periode.aturan_nama ?? '-'} v${d.periode.aturan_versi ?? '-'}` : undefined} />
        <CardContent>
          <DataTable<RekapDosen>
            columns={kolom}
            rows={rows}
            rowKey={(x) => String(x.kinerja_id ?? `p${x.pegawai_id}`)}
            loading={r.loading}
            error={r.error}
            onRetry={r.refetch}
            onRowClick={(x) => (x.kinerja_id ? setBuka(x.kinerja_id) : undefined)}
            selectable={sdm}
            selected={pilih}
            onSelectedChange={setPilih}
            bulkActions={
              sdm
                ? (keys, clear) => (
                    <Button
                      size="sm"
                      onClick={async () => {
                        const ids = keys.filter((k) => /^\d+$/.test(k)).map(Number);
                        const h = await aksi<{ ditetapkan: number[]; gagal: { id: number; pesan: string }[] }>('POST', `/v1/sdm/bkd/periode/${id}/tetapkan`, { id: ids });
                        toast.add({ title: `${h.ditetapkan.length} BKD ditetapkan`, description: h.gagal.length ? `${h.gagal.length} belum bisa: ${h.gagal[0]!.pesan}` : undefined, type: h.gagal.length ? 'warning' : 'success' });
                        clear();
                      }}
                    >
                      <CheckCheck /> Tetapkan terpilih
                    </Button>
                  )
                : undefined
            }
            toolbar={
              <Select
                aria-label="Saring tahap"
                options={[
                  { value: 'semua', label: 'Semua tahap' },
                  ...Object.entries(TAHAP_REKAP).map(([value, [label]]) => ({ value, label: `${label} (${d?.tahap[value] ?? 0})` })),
                  { value: 'tidak_memenuhi', label: `Tidak memenuhi (${d?.kesimpulan.tidak_memenuhi ?? 0})` },
                ]}
                value={tahap}
                onValueChange={(v) => setTahap(v ?? 'semua')}
              />
            }
            exportCsv={`rekap-bkd-${id}`}
            empty={{ title: id ? 'Tidak ada dosen pada saringan ini' : 'Pilih periode BKD' }}
          />
        </CardContent>
      </Card>
      {sdm && d?.kewajiban_khusus?.length ? (
        <Card>
          <CardHeader title="Kewajiban khusus 3 tahunan" description={`Profesor dan lektor kepala: kegiatan wajib yang diterima asesor pada laporan yang ditetapkan, ${d.kewajiban_khusus[0]!.semester_dievaluasi} periode BKD terakhir. Per semester tetap peringatan.`} />
          <CardContent>
            <DataTable
              rows={d.kewajiban_khusus}
              rowKey={(x) => `${x.pegawai_id}-${x.kewajiban}`}
              columnToggle={false}
              densityToggle={false}
              exportCsv={`kewajiban-khusus-bkd-${id}`}
              columns={[
                { key: 'nama', header: 'Dosen', mobile: 'title', cell: (x) => <span className="u-bkd-sel"><strong>{x.nama_lengkap}</strong><small>{[x.nidn, x.jabatan].filter(Boolean).join(' · ')}</small></span>, value: (x) => x.nama_lengkap },
                { key: 'kewajiban', header: 'Kewajiban' },
                { key: 'jumlah', header: 'Kegiatan diterima', align: 'end', shrink: true, cell: (x) => `${x.jumlah} / ${x.minimal}` },
                { key: 'semester', header: 'Semester ditetapkan', align: 'end', shrink: true, cell: (x) => `${x.semester_ditetapkan} / ${x.semester_dievaluasi}` },
                {
                  key: 'status', header: 'Status', shrink: true, mobile: 'badge',
                  cell: (x) => <Badge variant={x.status === 'terpenuhi' ? 'success' : x.status === 'belum_lengkap' ? 'neutral' : 'warning'} dot>{x.status === 'terpenuhi' ? 'Terpenuhi' : x.status === 'belum_lengkap' ? 'Data belum lengkap' : 'Belum terpenuhi'}</Badge>,
                  value: (x) => x.status,
                },
              ]}
            />
          </CardContent>
        </Card>
      ) : null}
      <PanelLaporanBkd id={buka} onOpenChange={(o) => !o && setBuka(null)} />
    </div>
  );
}

// ================================================================== periode (SDM)

/** Periode BKD per semester dengan jadwal tahap, versi aturan, dan wizard buka/ubah periode di panel samping. */
export function KelolaPeriodeBkd({ onRekap, className }: { onRekap?: (p: PeriodeBkd) => void; className?: string }) {
  const per = usePeriodeBkd();
  const aksi = useAksiBkd();
  const [form, setForm] = React.useState<PeriodeBkd | 'baru' | null>(null);
  return (
    <div className={cn('u-bkd-periode', className)}>
      <div className="u-bkd-aksi">
        <Button onClick={() => setForm('baru')}>
          <Plus /> Buka periode BKD
        </Button>
      </div>
      {per.loading && !per.data ? <Skeleton style={{ height: 200 }} /> : null}
      {per.data && per.data.length === 0 ? <Empty bordered icon={<CalendarClock />} title="Belum ada periode BKD" description="Buka periode BKD semester ini: jadwal rencana, kirim, penilaian, dan penetapan." /> : null}
      <div className="u-bkd-kartu-periode">
        {(per.data ?? []).map((p) => (
          <Card key={p.id}>
            <CardContent>
              <div className="u-bkd-kepala">
                <div>
                  <p className="u-bkd-label">{p.nama_tahun ?? p.tahun_id}</p>
                  <h3 className="u-bkd-judul">{p.nama}</h3>
                  <p className="u-bkd-keterangan">
                    Aturan {p.aturan_nama ?? '-'} v{p.aturan_versi ?? '-'} · asesor {p.penugasan_asesor === 'manual' ? 'ditugaskan manual' : 'otomatis'} · {p.jumlah_laporan ?? 0} laporan, {p.jumlah_ditetapkan ?? 0} ditetapkan
                  </p>
                </div>
                <Badge variant={p.status === 'buka' ? 'success' : p.status === 'tutup' ? 'neutral' : 'outline'} dot>
                  {p.status === 'buka' ? p.tahap?.judul ?? 'Dibuka' : p.status === 'tutup' ? 'Ditutup' : 'Draf'}
                </Badge>
              </div>
              <TahapBkd aktif={p.status === 'tutup' ? 'ditetapkan' : p.status === 'draft' ? '' : p.tahap?.kode ?? 'rencana'} tenggat={{ rencana: p.rencana_selesai, pelaksanaan: p.kirim_selesai ?? p.batas_pengisian, penilaian: p.penilaian_selesai, mengetahui: p.penetapan_selesai }} />
              <div className="u-bkd-aksi">
                {onRekap ? (
                  <Button size="sm" variant="outline" onClick={() => onRekap(p)}>
                    Rekap
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => setForm(p)}>
                  <Pencil /> Ubah
                </Button>
                {p.status !== 'buka' ? (
                  <Button size="sm" variant="ghost" onClick={() => void aksi('PUT', `/v1/sdm/bkd/periode/${p.id}`, { status: 'buka' }, 'Periode dibuka.')}>
                    Buka pengisian
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => void aksi('PUT', `/v1/sdm/bkd/periode/${p.id}`, { status: 'tutup' }, 'Periode ditutup.')}>
                    Tutup periode
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {form ? <PanelPeriodeBkd periode={form === 'baru' ? null : form} onOpenChange={(o) => !o && setForm(null)} /> : null}
    </div>
  );
}

interface VersiAturanRingkas {
  id: number;
  nama: string;
  versi: number;
  status: 'draf' | 'terbit' | 'arsip';
  berlaku_mulai: string | null;
}

/** 20261 -> "BKD Ganjil 2026/2027". */
export function namaPeriodeDari(tahunId: string) {
  const y = Number(tahunId.slice(0, 4));
  const s = tahunId.slice(4);
  return `BKD ${s === '1' ? 'Ganjil' : s === '2' ? 'Genap' : 'Pendek'} ${y}/${y + 1}`;
}

function tambahHari(t: string, n: number | null | undefined) {
  if (!t || !n) return '';
  const d = new Date(`${t}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Wizard periode BKD: semester, jadwal tahap, aturan & asesor, ringkasan. Mode ubah untuk periode yang ada. */
export function PanelPeriodeBkd({ periode: p, onOpenChange }: { periode: PeriodeBkd | null; onOpenChange: (o: boolean) => void }) {
  const aksi = useAksiBkd();
  const versi = useSiakadQuery<VersiAturanRingkas[]>(['bkd', 'aturan'], q('/v1/sdm/bkd/aturan'));
  const [step, setStep] = React.useState(0);
  const [n, setN] = React.useState({
    nama: p?.nama ?? '',
    tahun_id: p?.tahun_id ?? null,
    status: p?.status ?? 'buka',
    mulai: p?.mulai ?? '',
    rencana_selesai: p?.rencana_selesai ?? '',
    kirim_selesai: p?.kirim_selesai ?? p?.batas_pengisian ?? '',
    penilaian_selesai: p?.penilaian_selesai ?? '',
    penetapan_selesai: p?.penetapan_selesai ?? '',
    selesai: p?.selesai ?? '',
    aturan_id: p?.aturan_id ? String(p.aturan_id) : null,
    penugasan_asesor: p?.penugasan_asesor ?? 'otomatis',
    catatan: p?.catatan ?? '',
  });
  const terbit = (versi.data ?? []).filter((v) => v.status === 'terbit');
  const aturanId = n.aturan_id ?? (terbit[0] ? String(terbit[0].id) : null);
  const det = useSiakadQuery<{ isi: { tenggat: Record<string, number | null>; batas: { min_total: number | null; maks_total: number | null }; asesor: { jumlah: number; larang_satu_prodi: boolean } } }>(['bkd', 'aturan', aturanId], q(`/v1/sdm/bkd/aturan/${aturanId}`), { enabled: !!aturanId });
  const tg = det.data?.isi.tenggat;
  const urut = ['mulai', 'rencana_selesai', 'kirim_selesai', 'penilaian_selesai', 'penetapan_selesai', 'selesai'] as const;
  const labelTgl: Record<(typeof urut)[number], string> = { mulai: 'Mulai periode', rencana_selesai: 'Batas menyusun rencana', kirim_selesai: 'Batas mengirim kinerja dan bukti', penilaian_selesai: 'Batas penilaian asesor', penetapan_selesai: 'Batas Kaprodi/Dekan dan penetapan SDM', selesai: 'Akhir periode' };
  return (
    <PanelLangkah
      open
      onOpenChange={onOpenChange}
      title={p ? `Ubah ${p.nama}` : 'Buka periode BKD'}
      description="Jadwal tahap dan versi aturan berlaku untuk semua dosen pada periode ini."
      mode={p ? 'ubah' : 'buat'}
      step={step}
      onStepChange={setStep}
      finishLabel={p ? 'Simpan periode' : 'Buka periode'}
      footerNote="Kolom bertanda * wajib"
      steps={[
        {
          id: 'semester',
          title: 'Semester',
          validate: () => (!n.tahun_id ? 'Pilih semester SIAKAD.' : !n.nama.trim() ? 'Isi nama periode.' : null),
          content: (
            <div className="u-bkd-form">
              <Field label="Semester SIAKAD" required description="Dipakai untuk mengimpor kelas, bimbingan, dan penelitian dosen.">
                <PilihTahunAkademik value={n.tahun_id} onValueChange={(v) => setN({ ...n, tahun_id: v, nama: n.nama || (v ? namaPeriodeDari(v) : '') })} />
              </Field>
              <Field label="Nama periode" required description="Mis. BKD Ganjil 2026/2027">
                <Input value={n.nama} onChange={(e) => setN({ ...n, nama: e.target.value })} />
              </Field>
              <Field label="Status" required>
                <SegmentedControl
                  options={[
                    { value: 'draft', label: 'Draf' },
                    { value: 'buka', label: 'Dibuka' },
                    { value: 'tutup', label: 'Ditutup' },
                  ]}
                  value={n.status}
                  onValueChange={(v) => setN({ ...n, status: v as PeriodeBkd['status'] })}
                />
              </Field>
            </div>
          ),
        },
        {
          id: 'jadwal',
          title: 'Jadwal tahap',
          description: tg && Object.values(tg).some((x) => x) ? 'Tanggal kosong bisa diisi otomatis dari tenggat bawaan aturan BKD.' : 'Urutan tanggal harus maju dari rencana sampai penetapan.',
          validate: () => {
            if (!n.mulai || !n.selesai) return 'Isi tanggal mulai dan akhir periode.';
            const isi = urut.map((k) => n[k]).filter(Boolean);
            for (let i = 1; i < isi.length; i++) if (isi[i]! < isi[i - 1]!) return 'Urutan tanggal tahap harus maju: mulai, rencana, kirim, penilaian, penetapan, akhir.';
            return null;
          },
          content: (
            <div className="u-bkd-form">
              {tg && Object.values(tg).some((x) => x) && n.mulai ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const r = tambahHari(n.mulai, tg.rencana_hari);
                    const k = tambahHari(r || n.mulai, tg.kirim_hari);
                    const pn = tambahHari(k || n.mulai, tg.penilaian_hari);
                    const pt = tambahHari(pn || n.mulai, tg.penetapan_hari);
                    setN({ ...n, rencana_selesai: n.rencana_selesai || r, kirim_selesai: n.kirim_selesai || k, penilaian_selesai: n.penilaian_selesai || pn, penetapan_selesai: n.penetapan_selesai || pt, selesai: n.selesai || pt });
                  }}
                >
                  Isi dari tenggat bawaan aturan
                </Button>
              ) : null}
              <FormGrid>
                {urut.map((k) => (
                  <Field key={k} label={labelTgl[k]} required={k === 'mulai' || k === 'selesai'}>
                    <IsianTanggal value={n[k]} onValueChange={(v) => setN({ ...n, [k]: v ?? '' })} />
                  </Field>
                ))}
              </FormGrid>
              <TahapBkd aktif="rencana" tenggat={{ rencana: n.rencana_selesai || null, pelaksanaan: n.kirim_selesai || null, penilaian: n.penilaian_selesai || null, mengetahui: n.penetapan_selesai || null }} />
            </div>
          ),
        },
        {
          id: 'aturan',
          title: 'Aturan dan asesor',
          validate: () => (aturanId ? null : 'Belum ada versi aturan BKD yang terbit. Terbitkan di Aturan BKD.'),
          content: (
            <div className="u-bkd-form">
              <Field label="Versi aturan BKD" required description={p ? 'Mengganti versi periode berjalan lewat Aturan BKD > Pratinjau dampak > Terapkan.' : 'Dikunci untuk periode ini; laporan dinilai dengan versi ini.'}>
                <Select options={terbit.map((v) => ({ value: String(v.id), label: `${v.nama} (versi ${v.versi})` }))} value={aturanId} onValueChange={(v) => setN({ ...n, aturan_id: v })} disabled={!!p} placeholder="Pilih versi…" />
              </Field>
              {det.data ? (
                <DescriptionList
                  items={[
                    { label: 'Batas beban', value: `${det.data.isi.batas.min_total != null ? `minimal ${sksBkd(det.data.isi.batas.min_total)}` : 'tanpa minimal'}${det.data.isi.batas.maks_total != null ? `, maksimal ${sksBkd(det.data.isi.batas.maks_total)}` : ''}` },
                    { label: 'Asesor per laporan', value: `${det.data.isi.asesor.jumlah} orang${det.data.isi.asesor.larang_satu_prodi ? ', tidak boleh satu prodi' : ''}` },
                  ]}
                />
              ) : null}
              <Field label="Penugasan asesor" required>
                <SegmentedControl
                  options={[
                    { value: 'otomatis', label: 'Otomatis saat dosen mengirim' },
                    { value: 'manual', label: 'Manual oleh Biro SDM' },
                  ]}
                  value={n.penugasan_asesor}
                  onValueChange={(v) => setN({ ...n, penugasan_asesor: v as 'otomatis' | 'manual' })}
                />
              </Field>
              <Field label="Catatan untuk dosen" optional>
                <Textarea rows={3} value={n.catatan} onChange={(e) => setN({ ...n, catatan: e.target.value })} />
              </Field>
            </div>
          ),
        },
        {
          id: 'ringkasan',
          title: 'Ringkasan',
          content: (
            <WizardReview
              sections={[
                { title: 'Semester', items: [{ label: 'Nama', value: n.nama }, { label: 'Semester SIAKAD', value: n.tahun_id }, { label: 'Status', value: n.status === 'buka' ? 'Dibuka' : n.status === 'tutup' ? 'Ditutup' : 'Draf' }], onEdit: () => setStep(0) },
                { title: 'Jadwal', items: urut.map((k) => ({ label: labelTgl[k], value: n[k] ? tglPendek(n[k]) : null })), onEdit: () => setStep(1) },
                { title: 'Aturan dan asesor', items: [{ label: 'Aturan', value: terbit.find((v) => String(v.id) === aturanId)?.nama }, { label: 'Penugasan asesor', value: n.penugasan_asesor }], onEdit: () => setStep(2) },
              ]}
            />
          ),
        },
      ]}
      onFinish={async () => {
        const body = {
          nama: n.nama.trim(),
          tahun_id: n.tahun_id,
          status: n.status,
          ...Object.fromEntries(urut.map((k) => [k, n[k] || null])),
          ...(p ? {} : { aturan_id: aturanId ? Number(aturanId) : null }),
          penugasan_asesor: n.penugasan_asesor,
          catatan: n.catatan.trim() || null,
        };
        try {
          await aksi(p ? 'PUT' : 'POST', p ? `/v1/sdm/bkd/periode/${p.id}` : '/v1/sdm/bkd/periode', body, p ? 'Periode diperbarui.' : 'Periode BKD dibuka.');
          return null;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

// ================================================================== asesor (SDM)

/** Daftar asesor BKD terdaftar dan bebannya pada periode; tambah/ubah di panel samping. */
export function KelolaAsesorBkd({ periodeId, className }: { periodeId?: number | null; className?: string }) {
  const daftar = useSiakadQuery<AsesorBkdRow[]>(['bkd', 'asesor', periodeId ?? null], q(`/v1/sdm/bkd/asesor${periodeId ? `?periode_id=${periodeId}` : ''}`));
  const [form, setFormDosen] = React.useState<AsesorBkdRow | 'baru' | null>(null);
  const [formLuar, setFormLuar] = React.useState<AsesorBkdRow | 'baru' | null>(null);
  const setForm = (x: AsesorBkdRow | 'baru' | null) => (x !== null && x !== 'baru' && x.eksternal ? setFormLuar(x) : setFormDosen(x));
  const aksi = useAksiBkd();
  const [hapus, setHapus] = React.useState<AsesorBkdRow | null>(null);
  return (
    <div className={className}>
      <DataTable<AsesorBkdRow>
        columns={[
          { key: 'nama', header: 'Asesor', mobile: 'title', cell: (x) => <span className="u-bkd-sel"><strong>{x.nama_lengkap}</strong><small>{[x.nidn, x.nira ? `NIRA ${x.nira}` : null].filter(Boolean).join(' · ')}</small></span>, value: (x) => x.nama_lengkap },
          { key: 'asal', header: 'Asal', cell: (x) => (x.eksternal ? <span className="u-bkd-sel"><span>{x.pt_asal ?? 'PT lain'}</span><small>Eksternal, menilai lewat tautan</small></span> : x.asal === 'luar' ? x.pt_asal ?? 'PT lain' : x.nama_prodi ?? x.prodi_pegawai ?? '-'), value: (x) => (x.asal === 'luar' ? x.pt_asal ?? '' : x.nama_prodi ?? '') },
          { key: 'bidang_ilmu', header: 'Bidang ilmu', defaultHidden: true },
          { key: 'berlaku_sampai', header: 'Berlaku sampai', shrink: true, cell: (x) => tglPendek(x.berlaku_sampai) },
          { key: 'beban', header: 'Beban', align: 'end', shrink: true, cell: (x) => `${x.beban}${x.kuota ? ` / ${x.kuota}` : ''}` },
          { key: 'aktif', header: 'Status', shrink: true, mobile: 'badge', cell: (x) => <Badge variant={x.berlaku ? 'success' : 'neutral'} dot>{x.berlaku ? 'Berlaku' : x.aktif ? 'Kedaluwarsa' : 'Nonaktif'}</Badge> },
        ]}
        rows={daftar.data}
        rowKey={(x) => String(x.id)}
        loading={daftar.loading}
        error={daftar.error}
        onRetry={daftar.refetch}
        onRowClick={(x) => setForm(x)}
        rowActions={(x) => [
          { label: 'Ubah', onSelect: () => setForm(x) },
          { label: 'Hapus', destructive: true, onSelect: () => setHapus(x) },
        ]}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => setFormLuar('baru')}>
              <Plus /> Asesor eksternal
            </Button>
            <Button size="sm" onClick={() => setForm('baru')}>
              <Plus /> Daftarkan asesor dosen
            </Button>
          </>
        }
        exportCsv="asesor-bkd"
        empty={{ icon: <UsersRound />, title: 'Belum ada asesor terdaftar', description: 'Daftarkan dosen bersertifikat asesor BKD (internal atau dari PT lain).' }}
      />
      {form ? <PanelAsesorBkd asesor={form === 'baru' ? null : form} onOpenChange={(o) => !o && setForm(null)} /> : null}
      {formLuar ? <PanelAsesorLuarBkd asesor={formLuar === 'baru' ? null : formLuar} onOpenChange={(o) => !o && setFormLuar(null)} /> : null}
      <ConfirmDialog
        open={!!hapus}
        onOpenChange={(o) => !o && setHapus(null)}
        title="Hapus asesor ini?"
        description={`${hapus?.nama_lengkap ?? ''}. Penugasan yang sudah ada tidak berubah.`}
        confirmLabel="Hapus asesor"
        onConfirm={async () => {
          if (hapus) await aksi('DELETE', `/v1/sdm/bkd/asesor/${hapus.id}`, undefined, 'Asesor dihapus.');
          setHapus(null);
        }}
      />
    </div>
  );
}

function PanelAsesorBkd({ asesor: a, onOpenChange }: { asesor: AsesorBkdRow | null; onOpenChange: (o: boolean) => void }) {
  const aksi = useAksiBkd();
  const [n, setN] = React.useState({
    pegawai_id: a ? String(a.pegawai_id) : null as string | null,
    nira: a?.nira ?? '',
    asal: a?.asal ?? 'internal',
    pt_asal: a?.pt_asal ?? '',
    kode_prodi: a?.kode_prodi ?? '',
    bidang_ilmu: a?.bidang_ilmu ?? '',
    berlaku_sampai: a?.berlaku_sampai ?? '',
    kuota: a?.kuota ? String(a.kuota) : '',
    aktif: a ? !!a.aktif : true,
  });
  const [sibuk, setSibuk] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  return (
    <Sheet
      open
      onOpenChange={onOpenChange}
      title={a ? 'Ubah asesor BKD' : 'Daftarkan asesor BKD'}
      footer={
        <>
          {galat ? <span className="u-bkd-galat">{galat}</span> : null}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            loading={sibuk}
            disabled={!n.pegawai_id}
            onClick={async () => {
              setSibuk(true);
              setGalat(null);
              try {
                const body = { pegawai_id: Number(n.pegawai_id), nira: n.nira.trim() || null, asal: n.asal, pt_asal: n.asal === 'luar' ? n.pt_asal.trim() || null : null, kode_prodi: n.kode_prodi.trim() || null, bidang_ilmu: n.bidang_ilmu.trim() || null, berlaku_sampai: n.berlaku_sampai || null, kuota: n.kuota ? Number(n.kuota) : null, aktif: n.aktif };
                await aksi(a ? 'PUT' : 'POST', a ? `/v1/sdm/bkd/asesor/${a.id}` : '/v1/sdm/bkd/asesor', body, 'Asesor disimpan.');
                onOpenChange(false);
              } catch (e) {
                setGalat(pesanGalat(e));
              } finally {
                setSibuk(false);
              }
            }}
          >
            Simpan asesor
          </Button>
        </>
      }
    >
      <FormGrid>
        <Field label="Dosen" required style={{ gridColumn: '1 / -1' }} description="Asesor dari PT lain dicatat sebagai pegawai mitra di SDM.">
          <PilihPegawaiBkd value={n.pegawai_id} onValueChange={(v) => setN({ ...n, pegawai_id: v })} />
        </Field>
        <Field label="Nomor registrasi asesor (NIRA)" optional>
          <Input value={n.nira} onChange={(e) => setN({ ...n, nira: e.target.value })} />
        </Field>
        <Field label="Asal" required>
          <SegmentedControl options={[{ value: 'internal', label: 'UNIPO' }, { value: 'luar', label: 'PT lain' }]} value={n.asal} onValueChange={(v) => setN({ ...n, asal: v as 'internal' | 'luar' })} />
        </Field>
        {n.asal === 'luar' ? (
          <Field label="Perguruan tinggi asal" required>
            <Input value={n.pt_asal} onChange={(e) => setN({ ...n, pt_asal: e.target.value })} />
          </Field>
        ) : null}
        <Field label="Kode prodi asesor" optional description="Kosong = prodi homebase.">
          <Input value={n.kode_prodi} onChange={(e) => setN({ ...n, kode_prodi: e.target.value })} />
        </Field>
        <Field label="Bidang ilmu" optional>
          <Input value={n.bidang_ilmu} onChange={(e) => setN({ ...n, bidang_ilmu: e.target.value })} />
        </Field>
        <Field label="Sertifikat berlaku sampai" optional>
          <IsianTanggal value={n.berlaku_sampai} onValueChange={(v) => setN({ ...n, berlaku_sampai: v ?? '' })} />
        </Field>
        <Field label="Kuota per periode" optional>
          <Input inputMode="numeric" value={n.kuota} onChange={(e) => setN({ ...n, kuota: e.target.value })} />
        </Field>
        <label className="u-bkd-setuju">
          <Checkbox checked={n.aktif} onCheckedChange={(v) => setN({ ...n, aktif: v === true })} /> Aktif menilai
        </label>
      </FormGrid>
    </Sheet>
  );
}

/**
 * Asesor eksternal (PT lain) tanpa menjadi pegawai: identitas, sertifikat asesor, kontak. Menilai lewat tautan bertoken
 * yang dibuat Biro SDM per laporan (tidak butuh akun SIAKAD).
 */
export function PanelAsesorLuarBkd({ asesor: a, onOpenChange }: { asesor: AsesorBkdRow | null; onOpenChange: (o: boolean) => void }) {
  const aksi = useAksiBkd();
  const [step, setStep] = React.useState(0);
  const [n, setN] = React.useState({
    nama: a?.nama ?? a?.nama_lengkap ?? '', nidn: a?.nidn ?? '', pt_asal: a?.pt_asal ?? '', bidang_ilmu: a?.bidang_ilmu ?? '', nira: a?.nira ?? '',
    nomor_sertifikat: a?.nomor_sertifikat ?? '', berlaku_sampai: a?.berlaku_sampai ?? '', berkas_id: a?.berkas_id ?? (null as string | null), email: a?.email ?? '', hp: a?.hp ?? '',
    aktif: a ? !!a.aktif : true,
  });
  const set = (k: keyof typeof n) => (e: { target: { value: string } }) => setN({ ...n, [k]: e.target.value });
  return (
    <PanelLangkah
      open
      onOpenChange={onOpenChange}
      title={a ? 'Ubah asesor eksternal' : 'Asesor eksternal'}
      description="Asesor BKD dari perguruan tinggi lain; tidak dicatat sebagai pegawai UNIPO."
      mode={a ? 'ubah' : 'buat'}
      step={step}
      onStepChange={setStep}
      finishLabel="Simpan asesor"
      footerNote="Kolom bertanda * wajib"
      steps={[
        {
          id: 'identitas',
          title: 'Identitas',
          validate: () => (!n.nama.trim() ? 'Isi nama asesor.' : !n.pt_asal.trim() ? 'Isi perguruan tinggi asal.' : null),
          content: (
            <FormGrid>
              <Field label="Nama lengkap dan gelar" required style={{ gridColumn: '1 / -1' }}>
                <Input value={n.nama} onChange={set('nama')} />
              </Field>
              <Field label="NIDN/NIDK" optional>
                <Input value={n.nidn} onChange={set('nidn')} />
              </Field>
              <Field label="Perguruan tinggi asal" required>
                <Input value={n.pt_asal} onChange={set('pt_asal')} />
              </Field>
              <Field label="Bidang ilmu" optional style={{ gridColumn: '1 / -1' }}>
                <Input value={n.bidang_ilmu} onChange={set('bidang_ilmu')} />
              </Field>
            </FormGrid>
          ),
        },
        {
          id: 'sertifikat',
          title: 'Sertifikat asesor',
          validate: () => (!n.nira.trim() && !n.nomor_sertifikat.trim() ? 'Isi NIRA atau nomor sertifikat asesor.' : null),
          content: (
            <div className="u-bkd-form">
              <FormGrid>
                <Field label="NIRA (nomor registrasi asesor)">
                  <Input value={n.nira} onChange={set('nira')} />
                </Field>
                <Field label="Nomor sertifikat asesor">
                  <Input value={n.nomor_sertifikat} onChange={set('nomor_sertifikat')} />
                </Field>
                <Field label="Berlaku sampai" optional>
                  <IsianTanggal value={n.berlaku_sampai} onValueChange={(v) => setN({ ...n, berlaku_sampai: v ?? '' })} />
                </Field>
              </FormGrid>
              <Field label="Berkas sertifikat" optional description="PDF/gambar sertifikat asesor BKD.">
                <PilihBerkas value={n.berkas_id} kategori="dokumen" modul="sdm_bkd_asesor" keterangan="Sertifikat asesor BKD" onValueChange={(id) => setN({ ...n, berkas_id: id })} />
              </Field>
            </div>
          ),
        },
        {
          id: 'kontak',
          title: 'Kontak',
          description: 'Dipakai Biro SDM untuk mengirim tautan penilaian.',
          validate: () => (!n.email.trim() && !n.hp.trim() ? 'Isi email atau nomor HP.' : null),
          content: (
            <FormGrid>
              <Field label="Email">
                <Input type="email" value={n.email} onChange={set('email')} />
              </Field>
              <Field label="Nomor HP/WA">
                <Input value={n.hp} onChange={set('hp')} />
              </Field>
              <label className="u-bkd-setuju">
                <Checkbox checked={n.aktif} onCheckedChange={(v) => setN({ ...n, aktif: v === true })} /> Aktif menilai
              </label>
            </FormGrid>
          ),
        },
        {
          id: 'ringkasan',
          title: 'Ringkasan',
          content: (
            <WizardReview
              sections={[
                { title: 'Identitas', items: [{ label: 'Nama', value: n.nama }, { label: 'NIDN', value: n.nidn }, { label: 'PT asal', value: n.pt_asal }, { label: 'Bidang', value: n.bidang_ilmu }], onEdit: () => setStep(0) },
                { title: 'Sertifikat', items: [{ label: 'NIRA', value: n.nira }, { label: 'Nomor sertifikat', value: n.nomor_sertifikat }, { label: 'Berlaku sampai', value: n.berlaku_sampai ? tglPendek(n.berlaku_sampai) : null }, { label: 'Berkas', value: n.berkas_id ? 'Terlampir' : null }], onEdit: () => setStep(1) },
                { title: 'Kontak', items: [{ label: 'Email', value: n.email }, { label: 'HP', value: n.hp }], onEdit: () => setStep(2) },
              ]}
            />
          ),
        },
      ]}
      onFinish={async () => {
        const body = {
          eksternal: true, nama: n.nama.trim(), nidn: n.nidn.trim() || null, pt_asal: n.pt_asal.trim(), bidang_ilmu: n.bidang_ilmu.trim() || null, nira: n.nira.trim() || null,
          nomor_sertifikat: n.nomor_sertifikat.trim() || null, berlaku_sampai: n.berlaku_sampai || null, berkas_id: n.berkas_id, email: n.email.trim() || null, hp: n.hp.trim() || null, aktif: n.aktif,
        };
        try {
          await aksi(a ? 'PUT' : 'POST', a ? `/v1/sdm/bkd/asesor/${a.id}` : '/v1/sdm/bkd/asesor', body, 'Asesor eksternal disimpan.');
          return null;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

function PilihPegawaiBkd({ value, onValueChange }: { value: string | null; onValueChange: (v: string | null) => void }) {
  return <PilihEntitas jenis="pegawai" query={{ jenis: 'dosen' }} value={value} onValueChange={(v) => onValueChange(v)} placeholder="Cari nama atau NIDN dosen" />;
}

// ================================================================== cetak

/** Buka jendela cetak laporan BKD (simpan sebagai PDF dari dialog cetak peramban). */
export function cetakLaporanBkd(L: LaporanBkdData) {
  const w = window.open('', '_blank', 'noopener=no,width=900,height=1000');
  if (!w) return;
  const e = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
  const h = L.hasil;
  const kat = Object.fromEntries((L.aturan?.kategori ?? []).map((k) => [k.kode, k.nama]));
  const baris = (L.aturan?.bidang ?? h.bidang)
    .map((b) => {
      const isi = L.item.filter((i) => i.unsur === b.kode);
      if (!isi.length) return '';
      return `<tr class="bidang"><td colspan="5">${e(b.nama)}</td></tr>${isi
        .map(
          (i, n) =>
            `<tr><td>${n + 1}</td><td>${e(i.kegiatan)}<div class="kecil">${e(kat[i.kategori ?? ''] ?? '')}${i.uraian ? ` · ${e(i.uraian)}` : ''}</div></td><td class="a">${e(i.sks_rencana ?? '-')}</td><td class="a">${e(i.sks_realisasi ?? i.sks_rencana ?? '-')}</td><td class="t">${i.penilaian === 'diterima' ? 'M' : i.penilaian === 'ditolak' ? 'TM' : '-'}</td></tr>`,
        )
        .join('')}`;
    })
    .join('');
  const tahap = L.pemeriksa.map((t) => `<li>${e(t.judul)}: ${t.status === 'selesai' ? `selesai${t.diproses_oleh ? `, ${e(t.diproses_oleh)}` : ''}${t.waktu ? `, ${e(tglPendek(t.waktu))}` : ''}` : t.status === 'sedang' ? 'sedang diproses' : 'belum'}</li>`).join('');
  w.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Laporan BKD ${e(L.pegawai.nama)} ${e(L.periode.nama)}</title>
<style>body{font:12px/1.45 system-ui,sans-serif;color:#111;margin:24px}h1{font-size:16px;margin:0 0 4px}h2{font-size:13px;margin:18px 0 6px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #bbb;padding:4px 6px;vertical-align:top}th{background:#f1f1f1;text-align:left}.a{text-align:right}.t{text-align:center}.bidang td{background:#fafafa;font-weight:600}.kecil{color:#555;font-size:11px}.meta td{border:0;padding:2px 8px 2px 0}@media print{body{margin:0}button{display:none}}</style></head><body>
<button onclick="print()">Cetak / simpan PDF</button>
<h1>Laporan Beban Kerja Dosen</h1><div class="kecil">${e(L.periode.nama)} · aturan ${e(L.aturan?.nama)} versi ${e(L.aturan?.versi)}</div>
<table class="meta"><tr><td>Nama</td><td>${e(L.pegawai.nama)}</td></tr><tr><td>NIDN</td><td>${e(L.pegawai.nidn ?? '-')}</td></tr><tr><td>Program studi</td><td>${e(L.unit?.prodi?.nama ?? L.pegawai.kode_prodi ?? '-')}</td></tr><tr><td>Jabatan akademik</td><td>${e(L.pegawai.jabatan_akademik?.nama ?? '-')}</td></tr><tr><td>Status</td><td>${e(L.tahap.judul)}</td></tr></table>
<h2>Rekapitulasi per bidang (${e(h.dasar)})</h2><table><tr><th>Bidang</th><th class="a">Rencana</th><th class="a">Realisasi</th><th class="a">Diakui</th></tr>${h.bidang.map((b) => `<tr><td>${e(b.nama)}</td><td class="a">${e(b.rencana)}</td><td class="a">${e(b.realisasi)}</td><td class="a">${e(b.diakui)}</td></tr>`).join('')}<tr><th>Total</th><th class="a">${e(h.total.rencana)}</th><th class="a">${e(h.total.realisasi)}</th><th class="a">${e(h.total.diakui)}</th></tr></table>
<p>Kesimpulan: <b>${e(L.status === 'dinilai' || L.status === 'disahkan' ? L.bkd.kesimpulan.replace('_', ' ') : `perkiraan ${h.kesimpulan_perkiraan.replace('_', ' ')}`)}</b>${h.minimal != null ? ` · minimal ${e(h.minimal)} SKS` : ''}${h.maksimal != null ? `, maksimal ${e(h.maksimal)} SKS` : ''}</p>
<h2>Kegiatan</h2><table><tr><th>No</th><th>Kegiatan</th><th class="a">SKS rencana</th><th class="a">SKS realisasi</th><th class="t">Asesor</th></tr>${baris}</table>
<h2>Alur pemeriksaan</h2><ul>${tahap}</ul>
<div class="kecil">Dicetak ${e(new Date().toLocaleString('id-ID'))} dari SIAKAD UNIPO.</div></body></html>`);
  w.document.close();
}
