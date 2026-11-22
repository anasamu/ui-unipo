'use client';
import * as React from 'react';
import {
  ArrowLeft,
  Armchair,
  Award,
  CalendarDays,
  CircleCheck,
  ClipboardList,
  Download,
  GraduationCap,
  ListOrdered,
  Megaphone,
  MapPin,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  ScanLine,
  Search,
  Shirt,
  Ticket,
  Trash2,
  UserCheck,
  Users,
  UsersRound,
  Wallet,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { formatDate, formatTime } from '../lib/format';
import { Badge, Button, Skeleton } from '../components/actions';
import { DataTable, type DataColumn } from '../components/data-table';
import { Alert, Card, CardContent, DescriptionList, Empty, Tabs } from '../components/display';
import { Checkbox, Field, Input, InputGroup, Textarea } from '../components/forms';
import { BagianForm, IsianTanggal, PanelForm, Pilihan } from '../components/formulir';
import { KodeQr } from '../components/kode-qr';
import { StatistikRingkas, TombolCsv, type ItemStatistik } from '../components/laporan';
import { PanelLangkah } from '../components/panel-langkah';
import { ConfirmDialog, useToast } from '../components/overlays';
import { WizardReview } from '../components/wizard';
import { PilihTahunAkademik } from './cari';
import { GalatApi } from './galat';
import { FormPanitia, useDaftarPanitia, useTugasPanitiaSaya, type PenugasanPanitia } from './panitia';
import { KameraPindaiQr } from './presensi';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

/*
 * Acara wisuda (/v1/acara-wisuda, docs/ACARA-WISUDA.md di SIAKAD). Satu set komponen untuk BAAK, Pustikom, dan Tugas
 * kepanitiaan di dasbor Fakultas: daftar dan ruang acara (jadwal, gladi, tempat, peserta dari pendaftar diterima, kursi,
 * toga, undangan QR, urutan pemanggilan, sambutan, laporan), pemindai QR hari-H, dan status wisuda di Profil mahasiswa.
 * Tombol dan tab mengikuti `boleh.*` dari API; backend menegakkan hak per acara dan per seksi.
 */

// ================================================================ Tipe
export type StatusAcaraWisuda = 'draf' | 'terbit' | 'selesai' | 'batal';
export interface AcaraWisuda {
  id: string;
  nama: string;
  tahun_id: string;
  prodi: string[];
  tanggal: string;
  jam_mulai: string | null;
  jam_selesai: string | null;
  gladi_tanggal: string | null;
  gladi_jam: string | null;
  gladi_tempat: string | null;
  tempat: string;
  alamat: string | null;
  kapasitas: number | null;
  kursi_per_baris: number;
  pendamping_maks: number;
  status: StatusAcaraWisuda;
  keterangan: string | null;
  diumumkan_at: string | null;
  humas_pengumuman_id: number | null;
  panitia: { id: string; nama: string; status: string; nomor_sk: string | null; mulai: string; selesai: string; unit_id: number } | null;
  jumlah: { peserta: number; hadir: number; toga: number; berkursi: number };
}
export interface BolehAcaraWisuda {
  kelola: boolean;
  lihat: boolean;
  ubah: boolean;
  kehadiran: boolean;
  toga: boolean;
  pemanggilan: boolean;
}
export interface DetailAcaraWisuda extends AcaraWisuda {
  fakultas: Array<{ kode: string | null; nama: string | null; peserta: number; hadir: number; toga: number }>;
  pendamping: { undangan: number; hadir: number };
  lunas: { lunas: number; belum: number; belum_dicek: number };
  tugas: Array<{ kode: string; nama: string; keterangan: string | null }>;
  boleh: BolehAcaraWisuda;
}
export interface PendampingWisuda {
  urut: number;
  nama: string | null;
  hubungan: string | null;
  kode: string | null;
  hadir_at: string | null;
}
export interface PesertaWisuda {
  id: string;
  nim: string;
  nama: string;
  kode_prodi: string | null;
  nama_prodi: string | null;
  kode_fakultas: string | null;
  nama_fakultas: string | null;
  ipk: number | null;
  predikat: string | null;
  ukuran_toga: string | null;
  nomor_kursi: string | null;
  urut_panggil: number | null;
  terbaik: string | null;
  lunas: boolean | null;
  tunggakan: number | null;
  kode: string | null;
  hadir_at: string | null;
  hadir_oleh: string | null;
  toga_at: string | null;
  toga_oleh: string | null;
  batal: boolean;
  pendamping: PendampingWisuda[];
}
export interface SusunanWisuda {
  id?: number;
  urut?: number;
  jenis: 'sambutan' | 'acara' | 'pemanggilan';
  judul: string;
  pengisi: string | null;
  durasi_menit: number | null;
  kode_fakultas: string | null;
}
export interface LaporanWisuda {
  acara: AcaraWisuda;
  baris: Array<{ kode_fakultas: string | null; nama_fakultas: string | null; kode_prodi: string | null; nama_prodi: string | null; peserta: number; hadir: number; toga: number; berkursi: number; lunas: number; terbaik: number; pendamping_hadir: number }>;
  total: { peserta: number; hadir: number; toga: number; berkursi: number; lunas: number; terbaik: number; pendamping_hadir: number };
  terbaik: Array<{ nim: string; nama: string; nama_prodi: string | null; ipk: number | null; terbaik: string }>;
}
export interface HasilPindaiWisuda {
  jenis: 'kehadiran' | 'toga';
  pemegang: 'wisudawan' | 'pendamping';
  status: 'tercatat' | 'sudah' | 'dibatalkan';
  sebelumnya: string | null;
  pendamping: { urut: number; nama: string | null; hubungan: string | null } | null;
  peserta: { id: string; nim: string; nama: string; nama_prodi: string | null; nama_fakultas: string | null; nomor_kursi: string | null; urut_panggil: number | null; ukuran_toga: string | null; terbaik: string | null; hadir_at: string | null; toga_at: string | null; lunas: boolean | null };
}
export interface StatusWisudaSaya {
  acara: { id: string; nama: string; status: StatusAcaraWisuda; tanggal: string; jam_mulai: string | null; jam_selesai: string | null; gladi_tanggal: string | null; gladi_jam: string | null; gladi_tempat: string | null; tempat: string; alamat: string | null };
  nim: string;
  nama: string;
  nama_prodi: string | null;
  nama_fakultas: string | null;
  nomor_kursi: string | null;
  urut_panggil: number | null;
  ukuran_toga: string | null;
  toga_at: string | null;
  hadir_at: string | null;
  terbaik: string | null;
  predikat: string | null;
  lunas: boolean | null;
  kode: string;
  pendamping: PendampingWisuda[];
  susunan: Array<{ jenis: string; judul: string; pengisi: string | null }>;
}
export interface HakAcaraWisuda {
  kelola: boolean;
  sumber: string;
  tugas: PenugasanPanitia[];
}

const bersih = (o: object) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false).map(([k, v]) => [k, v === true ? '1' : v]));
const P = '/v1/acara-wisuda';

// ================================================================ Data
export function useHakAcaraWisuda() {
  return useSiakadQuery<HakAcaraWisuda>(['wisuda', 'saya'], (s, signal) => s.request<HakAcaraWisuda>({ method: 'GET', path: `${P}/saya` }, { signal }), { staleTime: 60_000 });
}
export function useDaftarAcaraWisuda(filter: { status?: StatusAcaraWisuda; q?: string; page?: number; per_page?: number } = {}, opsi?: { enabled?: boolean }) {
  return useSiakadQuery<AcaraWisuda[]>(['wisuda', 'daftar', filter], (s, signal) => s.request<AcaraWisuda[]>({ method: 'GET', path: P, query: bersih(filter) }, { signal }), opsi);
}
export function useAcaraWisuda(id: string | null | undefined) {
  return useSiakadQuery<DetailAcaraWisuda>(['wisuda', 'detail', id ?? ''], (s, signal) => s.request<DetailAcaraWisuda>({ method: 'GET', path: `${P}/${id}` }, { signal }), { enabled: Boolean(id) });
}
export interface FilterPesertaWisuda {
  q?: string;
  fakultas?: string;
  prodi?: string;
  hadir?: '0' | '1';
  toga?: '0' | '1';
  kursi?: '0' | '1';
  lunas?: '0' | '1';
  terbaik?: '1';
  urut?: 'panggil' | 'kursi';
  page?: number;
  per_page?: number;
}
export function usePesertaAcaraWisuda(id: string, filter: FilterPesertaWisuda, opsi?: { enabled?: boolean }) {
  return useSiakadQuery<PesertaWisuda[]>(['wisuda', 'peserta', id, filter], (s, signal) => s.request<PesertaWisuda[]>({ method: 'GET', path: `${P}/${id}/peserta`, query: bersih(filter) }, { signal }), opsi);
}
export function useSusunanAcaraWisuda(id: string) {
  return useSiakadQuery<SusunanWisuda[]>(['wisuda', 'susunan', id], (s, signal) => s.request<SusunanWisuda[]>({ method: 'GET', path: `${P}/${id}/susunan` }, { signal }));
}
export function useLaporanAcaraWisuda(id: string, opsi?: { enabled?: boolean }) {
  return useSiakadQuery<LaporanWisuda>(['wisuda', 'laporan', id], (s, signal) => s.request<LaporanWisuda>({ method: 'GET', path: `${P}/${id}/laporan` }, { signal }), opsi);
}
export function useRiwayatAcaraWisuda(id: string, opsi?: { enabled?: boolean }) {
  return useSiakadQuery<Array<{ aksi: string; catatan: string | null; oleh: string | null; sumber: string | null; created_at: string | null }>>(
    ['wisuda', 'riwayat', id],
    (s, signal) => s.request({ method: 'GET', path: `${P}/${id}/riwayat` }, { signal }),
    opsi,
  );
}
/** Status wisuda milik mahasiswa yang masuk (GET /v1/profil/saya/wisuda, scope profil:read). */
export function useStatusWisudaSaya() {
  return useSiakadQuery<StatusWisudaSaya[]>(['wisuda', 'status-saya'], (s, signal) => s.request<StatusWisudaSaya[]>({ method: 'GET', path: '/v1/profil/saya/wisuda' }, { signal }), { staleTime: 60_000 });
}

// ================================================================ Bantu
export const LABEL_STATUS_ACARA_WISUDA: Record<StatusAcaraWisuda, string> = { draf: 'Draf', terbit: 'Terbit', selesai: 'Selesai', batal: 'Batal' };
export function StatusAcaraWisudaBadge({ status }: { status: StatusAcaraWisuda }) {
  const v = status === 'terbit' ? 'success' : status === 'draf' ? 'warning' : status === 'batal' ? 'danger' : 'neutral';
  return (
    <Badge variant={v} dot>
      {LABEL_STATUS_ACARA_WISUDA[status]}
    </Badge>
  );
}
const tgl = (v: string | null | undefined) => (v ? formatDate(v, 'full') : '—');
const jamRentang = (a: string | null, b: string | null) => (a ? `${a}${b ? `–${b}` : ''} WITA` : null);
const waktu = (v: string | null) => (v ? formatTime(v) : null);

function galatIsian(e: unknown, setGalat: (g: Record<string, string>) => void): string {
  const f = (e as { fields?: Record<string, unknown> }).fields;
  if (f && Object.keys(f).length) {
    setGalat(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, String(v)])));
    return Object.values(f).map(String).join(' ') || 'Periksa isian yang ditandai.';
  }
  throw e;
}

/** Jalankan aksi POST acara dengan toast dan penyegaran data. */
function useAksiWisuda() {
  const siakad = useSiakad();
  const toast = useToast();
  const [sibuk, setSibuk] = React.useState<string | null>(null);
  const jalan = async <T,>(kunci: string, path: string, body: unknown, pesan: (d: T) => string): Promise<T | null> => {
    setSibuk(kunci);
    try {
      const r = await siakad.request<T>({ method: 'POST', path, body: body ?? {} });
      invalidateSiakad('wisuda');
      toast.add({ title: pesan(r.data as T), type: 'success' });
      return r.data as T;
    } catch (e) {
      toast.add({ title: 'Gagal', description: pesanGalat(e), type: 'error' });
      return null;
    } finally {
      setSibuk(null);
    }
  };
  return { jalan, sibuk };
}

// ================================================================ Form acara (wizard)
interface IsiAcara {
  nama: string;
  tahun_id: string;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  gladi_tanggal: string;
  gladi_jam: string;
  gladi_tempat: string;
  tempat: string;
  alamat: string;
  kapasitas: string;
  kursi_per_baris: string;
  pendamping_maks: string;
  status: StatusAcaraWisuda;
  keterangan: string;
}

export interface FormAcaraWisudaProps {
  acara?: AcaraWisuda;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onTersimpan?: (a: DetailAcaraWisuda) => void;
}

/** Buat/ubah acara wisuda: wizard di panel samping (acara, jadwal & gladi, tempat & kursi, ringkasan). */
export function FormAcaraWisuda({ acara, open, onOpenChange, onTersimpan }: FormAcaraWisudaProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const awal = React.useMemo<IsiAcara>(
    () => ({
      nama: acara?.nama ?? '',
      tahun_id: acara?.tahun_id ?? '',
      tanggal: acara?.tanggal ?? '',
      jam_mulai: acara?.jam_mulai ?? '08:00',
      jam_selesai: acara?.jam_selesai ?? '',
      gladi_tanggal: acara?.gladi_tanggal ?? '',
      gladi_jam: acara?.gladi_jam ?? '',
      gladi_tempat: acara?.gladi_tempat ?? '',
      tempat: acara?.tempat ?? '',
      alamat: acara?.alamat ?? '',
      kapasitas: acara?.kapasitas != null ? String(acara.kapasitas) : '',
      kursi_per_baris: String(acara?.kursi_per_baris ?? 20),
      pendamping_maks: String(acara?.pendamping_maks ?? 2),
      status: acara?.status ?? 'draf',
      keterangan: acara?.keterangan ?? '',
    }),
    [acara],
  );
  const [isi, setIsi] = React.useState(awal);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [langkah, setLangkah] = React.useState(0);
  React.useEffect(() => {
    if (open) {
      setIsi(awal);
      setGalat({});
      setLangkah(0);
    }
  }, [open, awal]);
  const set = <K extends keyof IsiAcara>(k: K, v: IsiAcara[K]) => {
    setIsi((x) => ({ ...x, [k]: v }));
    setGalat((g) => ({ ...g, [k]: '' }));
  };
  const tandai = (g: Record<string, string>) => {
    setGalat((x) => ({ ...x, ...g }));
    return Object.keys(g).length ? 'Periksa isian yang ditandai.' : undefined;
  };
  const angka = (v: string) => v.replace(/[^\d]/g, '');
  return (
    <PanelLangkah
      open={open}
      onOpenChange={onOpenChange}
      mode={acara ? 'ubah' : 'buat'}
      step={langkah}
      onStepChange={setLangkah}
      size="lg"
      title={acara ? `Ubah ${acara.nama}` : 'Acara wisuda baru'}
      description="Peserta ditarik dari pendaftar wisuda yang sudah diterima pada periode akademik yang dipilih."
      finishLabel={acara ? 'Simpan' : 'Buat acara'}
      footerNote="Kolom bertanda * wajib"
      steps={[
        {
          id: 'acara',
          title: 'Acara',
          icon: <GraduationCap />,
          validate: () => tandai({ ...(!isi.nama.trim() && { nama: 'Nama acara wajib diisi.' }), ...(!isi.tahun_id && { tahun_id: 'Pilih periode pendaftar wisuda.' }) }),
          content: (
            <BagianForm judul="Acara" kolom={2}>
              <Field label="Nama acara" required className="u-form-lebar" error={galat.nama || undefined}>
                <Input value={isi.nama} maxLength={200} placeholder="mis. Wisuda Periode II 2026" onChange={(e) => set('nama', e.target.value)} />
              </Field>
              <Field label="Periode pendaftar" required error={galat.tahun_id || undefined} description="Pendaftar wisuda yang diterima pada periode ini menjadi peserta.">
                <PilihTahunAkademik value={isi.tahun_id || null} placeholder="Pilih…" onValueChange={(v) => set('tahun_id', v ?? '')} />
              </Field>
              {acara && (
                <Field label="Status">
                  <Pilihan
                    options={(['draf', 'terbit', 'selesai', 'batal'] as const).map((s) => ({ value: s, label: LABEL_STATUS_ACARA_WISUDA[s] }))}
                    value={isi.status}
                    tampilan="tombol"
                    onValueChange={(v) => v && set('status', v as StatusAcaraWisuda)}
                  />
                </Field>
              )}
              <Field label="Keterangan" optional className="u-form-lebar">
                <Textarea value={isi.keterangan} rows={2} maxLength={5000} onChange={(e) => set('keterangan', e.target.value)} />
              </Field>
            </BagianForm>
          ),
        },
        {
          id: 'jadwal',
          title: 'Jadwal & gladi',
          icon: <CalendarDays />,
          validate: () =>
            tandai({
              ...(!isi.tanggal && { tanggal: 'Tanggal wisuda wajib diisi.' }),
              ...(isi.gladi_tanggal && isi.tanggal && isi.gladi_tanggal > isi.tanggal && { gladi_tanggal: 'Gladi tidak boleh sesudah hari wisuda.' }),
              ...(isi.jam_mulai && isi.jam_selesai && isi.jam_selesai <= isi.jam_mulai && { jam_selesai: 'Harus sesudah jam mulai.' }),
            }),
          content: (
            <>
              <BagianForm judul="Hari wisuda" kolom={2}>
                <Field label="Tanggal" required error={galat.tanggal || undefined} className="u-form-lebar">
                  <IsianTanggal value={isi.tanggal || null} onValueChange={(v) => set('tanggal', v ?? '')} />
                </Field>
                <Field label="Jam mulai" optional error={galat.jam_mulai || undefined}>
                  <Input type="time" value={isi.jam_mulai} onChange={(e) => set('jam_mulai', e.target.value)} />
                </Field>
                <Field label="Jam selesai" optional error={galat.jam_selesai || undefined}>
                  <Input type="time" value={isi.jam_selesai} onChange={(e) => set('jam_selesai', e.target.value)} />
                </Field>
              </BagianForm>
              <BagianForm judul="Gladi bersih" kolom={2} keterangan="Opsional. Ikut diumumkan ke wisudawan.">
                <Field label="Tanggal gladi" optional error={galat.gladi_tanggal || undefined}>
                  <IsianTanggal value={isi.gladi_tanggal || null} max={isi.tanggal || undefined} onValueChange={(v) => set('gladi_tanggal', v ?? '')} />
                </Field>
                <Field label="Jam gladi" optional error={galat.gladi_jam || undefined}>
                  <Input type="time" value={isi.gladi_jam} onChange={(e) => set('gladi_jam', e.target.value)} />
                </Field>
                <Field label="Tempat gladi" optional className="u-form-lebar">
                  <Input value={isi.gladi_tempat} maxLength={200} placeholder="Sama dengan tempat acara bila kosong" onChange={(e) => set('gladi_tempat', e.target.value)} />
                </Field>
              </BagianForm>
            </>
          ),
        },
        {
          id: 'tempat',
          title: 'Tempat & kursi',
          icon: <MapPin />,
          validate: () => tandai({ ...(!isi.tempat.trim() && { tempat: 'Tempat wajib diisi.' }) }),
          content: (
            <BagianForm judul="Tempat dan kursi" kolom={2}>
              <Field label="Tempat" required className="u-form-lebar" error={galat.tempat || undefined}>
                <Input value={isi.tempat} maxLength={200} placeholder="mis. Auditorium UNIPO" onChange={(e) => set('tempat', e.target.value)} />
              </Field>
              <Field label="Alamat" optional className="u-form-lebar">
                <Input value={isi.alamat} maxLength={255} onChange={(e) => set('alamat', e.target.value)} />
              </Field>
              <Field label="Kapasitas kursi wisudawan" optional error={galat.kapasitas || undefined}>
                <Input value={isi.kapasitas} inputMode="numeric" maxLength={5} onChange={(e) => set('kapasitas', angka(e.target.value))} />
              </Field>
              <Field label="Kursi per baris" error={galat.kursi_per_baris || undefined} description="Nomor kursi otomatis A-01, A-02, …">
                <Input value={isi.kursi_per_baris} inputMode="numeric" maxLength={3} onChange={(e) => set('kursi_per_baris', angka(e.target.value))} />
              </Field>
              <Field label="Undangan pendamping per wisudawan" error={galat.pendamping_maks || undefined} description="Masing-masing ber-QR.">
                <Pilihan options={['0', '1', '2', '3', '4'].map((v) => ({ value: v, label: v }))} value={isi.pendamping_maks} tampilan="tombol" onValueChange={(v) => v && set('pendamping_maks', v)} />
              </Field>
            </BagianForm>
          ),
        },
        {
          id: 'ringkasan',
          title: 'Ringkasan',
          icon: <CircleCheck />,
          content: (
            <WizardReview
              sections={[
                { title: 'Acara', onEdit: () => setLangkah(0), items: [{ label: 'Nama', value: isi.nama }, { label: 'Periode pendaftar', value: isi.tahun_id }] },
                {
                  title: 'Jadwal',
                  onEdit: () => setLangkah(1),
                  items: [
                    { label: 'Wisuda', value: [tgl(isi.tanggal), jamRentang(isi.jam_mulai || null, isi.jam_selesai || null)].filter(Boolean).join(', ') },
                    { label: 'Gladi', value: isi.gladi_tanggal ? [tgl(isi.gladi_tanggal), isi.gladi_jam && `${isi.gladi_jam} WITA`, isi.gladi_tempat].filter(Boolean).join(', ') : '—' },
                  ],
                },
                {
                  title: 'Tempat',
                  onEdit: () => setLangkah(2),
                  items: [
                    { label: 'Tempat', value: [isi.tempat, isi.alamat].filter(Boolean).join(', ') },
                    { label: 'Kursi', value: `${isi.kapasitas || 'tanpa batas'} · ${isi.kursi_per_baris} per baris` },
                    { label: 'Pendamping', value: `${isi.pendamping_maks} undangan per wisudawan` },
                  ],
                },
              ]}
            />
          ),
        },
      ]}
      onFinish={async () => {
        const body = {
          nama: isi.nama.trim(),
          tahun_id: isi.tahun_id,
          tanggal: isi.tanggal,
          jam_mulai: isi.jam_mulai || null,
          jam_selesai: isi.jam_selesai || null,
          gladi_tanggal: isi.gladi_tanggal || null,
          gladi_jam: isi.gladi_jam || null,
          gladi_tempat: isi.gladi_tempat.trim() || null,
          tempat: isi.tempat.trim(),
          alamat: isi.alamat.trim() || null,
          kapasitas: isi.kapasitas ? Number(isi.kapasitas) : null,
          kursi_per_baris: Number(isi.kursi_per_baris || 20),
          pendamping_maks: Number(isi.pendamping_maks || 0),
          keterangan: isi.keterangan.trim() || null,
          ...(acara ? { status: isi.status } : {}),
        };
        let r;
        try {
          r = await siakad.request<DetailAcaraWisuda>({ method: 'POST', path: acara ? `${P}/${acara.id}` : P, body });
        } catch (e) {
          return galatIsian(e, setGalat);
        }
        invalidateSiakad('wisuda');
        toast.add({ title: acara ? 'Acara diperbarui' : 'Acara wisuda dibuat', description: acara ? undefined : 'Tautkan panitia, lalu tarik peserta dari pendaftar yang diterima.', type: 'success' });
        if (r.data) onTersimpan?.(r.data);
      }}
    />
  );
}

// ================================================================ Daftar acara
export interface KelolaAcaraWisudaProps {
  /** Unit pembentuk panitia wisuda (mis. id unit BAAK); kosong = pilih dari unit yang boleh dikelola. */
  unitPanitiaId?: number | null;
  judul?: React.ReactNode;
  deskripsi?: React.ReactNode;
  className?: string;
}

/**
 * Daftar acara wisuda dan ruang kerja acara terpilih. Pengelola (BAAK, Pustikom: wisuda:kelola) melihat semua acara;
 * anggota panitia hanya acara panitianya.
 */
export function KelolaAcaraWisuda({ unitPanitiaId, judul = 'Acara wisuda', deskripsi, className }: KelolaAcaraWisudaProps) {
  const hak = useHakAcaraWisuda();
  const [status, setStatus] = React.useState<StatusAcaraWisuda | 'semua'>('semua');
  const [q, setQ] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pilih, setPilih] = React.useState<string | null>(null);
  const [buat, setBuat] = React.useState(false);
  const daftar = useDaftarAcaraWisuda({ status: status === 'semua' ? undefined : status, q: q.trim() || undefined, page, per_page: 25 });
  if (pilih) return <RuangAcaraWisuda id={pilih} onKembali={() => setPilih(null)} unitPanitiaId={unitPanitiaId} className={className} />;
  const kolom: DataColumn<AcaraWisuda>[] = [
    {
      key: 'nama',
      header: 'Acara',
      cell: (a) => (
        <div className="u-wisuda-sel">
          <strong>{a.nama}</strong>
          <span>{a.panitia ? a.panitia.nama : 'Panitia belum ditautkan'}</span>
        </div>
      ),
      value: (a) => a.nama,
      mobile: 'title',
    },
    {
      key: 'tanggal',
      header: 'Jadwal',
      cell: (a) => (
        <div className="u-wisuda-sel">
          <span>{formatDate(a.tanggal, 'medium')}</span>
          <span>{a.tempat}</span>
        </div>
      ),
      value: (a) => a.tanggal,
    },
    { key: 'peserta', header: 'Peserta', align: 'end', cell: (a) => a.jumlah.peserta, value: (a) => a.jumlah.peserta },
    { key: 'hadir', header: 'Hadir', align: 'end', cell: (a) => (a.jumlah.peserta ? `${a.jumlah.hadir}/${a.jumlah.peserta}` : '—'), value: (a) => a.jumlah.hadir },
    { key: 'status', header: 'Status', shrink: true, cell: (a) => <StatusAcaraWisudaBadge status={a.status} />, value: (a) => a.status, mobile: 'badge' },
  ];
  if (hak.error) return <GalatApi error={hak.error} onRetry={hak.refetch} />;
  return (
    <div className={cn('u-wisuda', className)}>
      {/* judul={null}: kepala halaman/tab aplikasi sudah memuat judul & keterangan; hanya tombol yang tampil (rata kanan). */}
      {(judul !== null || hak.data?.kelola) && (
        <div className="u-wisuda-kepala" data-tanpa-judul={judul === null ? '' : undefined}>
          {judul !== null && (
            <div>
              <h2>{judul}</h2>
              <p>{deskripsi ?? 'Jadwal, gladi, tempat, peserta dari pendaftar yang diterima, kursi, toga, undangan QR, hari-H, dan laporan. Panitia ber-SK bekerja sesuai tugas seksinya.'}</p>
            </div>
          )}
          {hak.data?.kelola && (
            <Button onClick={() => setBuat(true)}>
              <Plus /> Acara baru
            </Button>
          )}
        </div>
      )}
      {hak.data?.kelola && hak.data.sumber === 'pustikom' && (
        <Alert variant="info" title="Mengelola dari Pustikom">
          Perubahan di sini tercatat bersumber Pustikom di riwayat acara (mengambil alih bila operator BAAK belum ada).
        </Alert>
      )}
      <DataTable
        columns={kolom}
        rows={daftar.data}
        rowKey={(a) => a.id}
        loading={daftar.loading || hak.loading}
        error={daftar.error}
        onRetry={daftar.refetch}
        page={page}
        perPage={25}
        total={daftar.meta?.total ?? undefined}
        onPageChange={setPage}
        onRowClick={(a) => setPilih(a.id)}
        toolbar={
          <div className="u-wisuda-toolbar">
            <Tabs
              variant="pill"
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              items={[
                { value: 'semua', label: 'Semua' },
                { value: 'draf', label: 'Draf' },
                { value: 'terbit', label: 'Terbit' },
                { value: 'selesai', label: 'Selesai' },
              ]}
            />
            <InputGroup start={<Search />} size="sm" className="u-wisuda-cari">
              <Input size="sm" value={q} placeholder="Cari acara atau tempat" aria-label="Cari acara" onChange={(e) => (setQ(e.target.value), setPage(1))} />
            </InputGroup>
          </div>
        }
        empty={{
          icon: <GraduationCap />,
          title: 'Belum ada acara wisuda',
          description: hak.data?.kelola ? 'Buat acara, tautkan panitia wisuda ber-SK, lalu tarik peserta dari pendaftar yang diterima.' : 'Acara yang ditangani panitia Anda tampil di sini.',
        }}
      />
      <FormAcaraWisuda open={buat} onOpenChange={setBuat} onTersimpan={(a) => setPilih(a.id)} />
    </div>
  );
}

// ================================================================ Ruang acara
type TabAcara = 'ringkasan' | 'peserta' | 'hari-h' | 'pemanggilan' | 'laporan' | 'riwayat';

export interface RuangAcaraWisudaProps {
  id: string;
  onKembali?: () => void;
  unitPanitiaId?: number | null;
  /** Tab awal (mis. "hari-h" untuk seksi registrasi). */
  tabAwal?: TabAcara;
  className?: string;
}

/** Ruang kerja satu acara wisuda; tab dan tombol mengikuti hak (pengelola, ketua/sekretaris, atau tugas seksi). */
export function RuangAcaraWisuda({ id, onKembali, unitPanitiaId, tabAwal, className }: RuangAcaraWisudaProps) {
  const d = useAcaraWisuda(id);
  const [tab, setTab] = React.useState<TabAcara | null>(tabAwal ?? null);
  const [ubah, setUbah] = React.useState(false);
  const [umumkan, setUmumkan] = React.useState(false);
  const { jalan, sibuk } = useAksiWisuda();
  if (d.error) return <GalatApi error={d.error} onRetry={d.refetch} />;
  if (!d.data) return <Skeleton style={{ height: 320 }} />;
  const a = d.data;
  const b = a.boleh;
  const tabs: Array<{ value: TabAcara; label: string }> = [
    { value: 'ringkasan', label: 'Ringkasan' },
    { value: 'peserta', label: 'Peserta, kursi & toga' },
    ...(b.kehadiran || b.toga ? [{ value: 'hari-h' as const, label: 'Hari-H: pindai QR' }] : []),
    { value: 'pemanggilan', label: 'Pemanggilan & sambutan' },
    { value: 'laporan', label: 'Laporan' },
    { value: 'riwayat', label: 'Riwayat' },
  ];
  const aktif: TabAcara = tab ?? (!b.ubah && (b.kehadiran || b.toga) ? 'hari-h' : !b.ubah && b.pemanggilan ? 'pemanggilan' : 'ringkasan');
  const stat: ItemStatistik[] = [
    { label: 'Wisudawan', nilai: a.jumlah.peserta, ikon: <GraduationCap />, keterangan: `${a.jumlah.berkursi} berkursi` },
    { label: 'Hadir', nilai: a.jumlah.hadir, ikon: <UserCheck />, nada: 'success', progres: a.jumlah.peserta ? Math.round((a.jumlah.hadir / a.jumlah.peserta) * 100) : null },
    { label: 'Toga diambil', nilai: a.jumlah.toga, ikon: <Shirt />, progres: a.jumlah.peserta ? Math.round((a.jumlah.toga / a.jumlah.peserta) * 100) : null },
    { label: 'Pendamping hadir', nilai: `${a.pendamping.hadir}/${a.pendamping.undangan}`, ikon: <Users /> },
    { label: 'Lunas', nilai: a.lunas.lunas, ikon: <Wallet />, keterangan: a.lunas.belum ? `${a.lunas.belum} belum lunas` : a.lunas.belum_dicek ? `${a.lunas.belum_dicek} belum dicek` : 'semua lunas', nada: a.lunas.belum ? 'warning' : undefined },
  ];
  return (
    <div className={cn('u-wisuda', className)}>
      <div className="u-wisuda-kepala">
        <div>
          {onKembali && (
            <Button variant="ghost" size="sm" onClick={onKembali} className="u-wisuda-kembali">
              <ArrowLeft /> Semua acara
            </Button>
          )}
          <h2>
            {a.nama} <StatusAcaraWisudaBadge status={a.status} />
          </h2>
          <p>
            {tgl(a.tanggal)}
            {a.jam_mulai && ` · ${jamRentang(a.jam_mulai, a.jam_selesai)}`} · {a.tempat}
          </p>
          <div className="u-wisuda-tugas">
            {a.tugas.map((t) => (
              <Badge key={t.kode} variant={t.kode === 'kelola' ? 'primary' : 'info'} title={t.keterangan ?? undefined}>
                <ClipboardList aria-hidden /> {t.nama}
              </Badge>
            ))}
          </div>
        </div>
        {b.ubah && (
          <div className="u-wisuda-aksi">
            <Button variant="outline" onClick={() => setUbah(true)}>
              <Pencil /> Ubah acara
            </Button>
            <Button onClick={() => setUmumkan(true)} disabled={!a.jumlah.peserta}>
              <Megaphone /> Umumkan
            </Button>
          </div>
        )}
      </div>
      <StatistikRingkas items={stat} min={170} />
      <Tabs<TabAcara> value={aktif} onValueChange={setTab} items={tabs} />
      {aktif === 'ringkasan' && <RingkasanAcara acara={a} unitPanitiaId={unitPanitiaId} />}
      {aktif === 'peserta' && <PesertaAcaraWisuda acara={a} />}
      {aktif === 'hari-h' && <PemindaiWisuda acara={a} />}
      {aktif === 'pemanggilan' && <PemanggilanWisuda acara={a} />}
      {aktif === 'laporan' && <LaporanAcaraWisuda acara={a} />}
      {aktif === 'riwayat' && <RiwayatAcara id={a.id} />}
      {b.ubah && <FormAcaraWisuda acara={a} open={ubah} onOpenChange={setUbah} />}
      <ConfirmDialog
        open={umumkan}
        onOpenChange={setUmumkan}
        tone="primary"
        icon={<Megaphone />}
        title="Umumkan acara wisuda?"
        description={`Notifikasi jadwal, kursi, dan undangan QR dikirim ke ${a.jumlah.peserta} wisudawan (tampil di Profil » Wisuda), dan pengumuman diajukan ke Humas untuk diperiksa lalu diterbitkan. ${a.status === 'draf' ? 'Status acara menjadi Terbit.' : ''}`}
        confirmLabel={sibuk === 'umumkan' ? 'Mengirim…' : 'Umumkan'}
        onConfirm={async () => {
          await jalan<{ kabar: number; humas: { id: number; status: string } | null }>('umumkan', `${P}/${a.id}/umumkan`, { kabar: true, humas: true }, (r) => `Notifikasi terkirim ke ${r.kabar} wisudawan${r.humas ? `; pengumuman Humas #${r.humas.id} (${r.humas.status})` : ''}`);
        }}
      />
    </div>
  );
}

function RingkasanAcara({ acara: a, unitPanitiaId }: { acara: DetailAcaraWisuda; unitPanitiaId?: number | null }) {
  const [bentuk, setBentuk] = React.useState(false);
  const [pilihPanitia, setPilihPanitia] = React.useState<string | null>(null);
  const { jalan, sibuk } = useAksiWisuda();
  const panitiaWisuda = useDaftarPanitia({ jenis: 'wisuda', per_page: 50 }, { enabled: a.boleh.kelola });
  const opsi = (panitiaWisuda.data ?? []).filter((p) => p.status === 'draf' || p.status === 'aktif').map((p) => ({ value: p.id, label: p.nama, description: [p.nomor_sk && `SK ${p.nomor_sk}`, `${p.jumlah_anggota} anggota`].filter(Boolean).join(' · ') }));
  const tautkan = (pid: string | null) => jalan('panitia', `${P}/${a.id}/panitia`, { panitia_id: pid }, () => (pid ? 'Panitia ditautkan ke acara' : 'Panitia dilepas'));
  return (
    <div className="u-wisuda-grid">
      <Card>
        <CardContent>
          <h3 className="u-wisuda-judul-kartu">
            <CalendarDays aria-hidden /> Jadwal
          </h3>
          <DescriptionList
            items={[
              { label: 'Hari wisuda', value: [tgl(a.tanggal), jamRentang(a.jam_mulai, a.jam_selesai)].filter(Boolean).join(', ') },
              { label: 'Gladi bersih', value: a.gladi_tanggal ? [tgl(a.gladi_tanggal), a.gladi_jam && `${a.gladi_jam} WITA`, a.gladi_tempat].filter(Boolean).join(', ') : '—' },
              { label: 'Tempat', value: [a.tempat, a.alamat].filter(Boolean).join(', ') },
              { label: 'Kursi', value: `${a.kapasitas ?? 'tanpa batas'} · ${a.kursi_per_baris} per baris · ${a.pendamping_maks} pendamping per wisudawan` },
              { label: 'Periode pendaftar', value: a.tahun_id },
              { label: 'Diumumkan', value: a.diumumkan_at ? `${formatDate(a.diumumkan_at)}${a.humas_pengumuman_id ? ` · pengumuman Humas #${a.humas_pengumuman_id}` : ''}` : 'Belum' },
            ]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <h3 className="u-wisuda-judul-kartu">
            <UsersRound aria-hidden /> Panitia
          </h3>
          {a.panitia ? (
            <DescriptionList
              items={[
                { label: 'Panitia', value: a.panitia.nama },
                { label: 'SK', value: a.panitia.nomor_sk ?? 'Belum dilampirkan' },
                { label: 'Masa tugas', value: `${formatDate(a.panitia.mulai)} – ${formatDate(a.panitia.selesai)} (hak anggota berakhir otomatis)` },
                { label: 'Status', value: a.panitia.status },
              ]}
            />
          ) : (
            <p className="u-wisuda-redup">Belum ada panitia. Bentuk panitia wisuda ber-SK (ketua, sekretaris, seksi); hak akses anggotanya disetujui Pustikom.</p>
          )}
          {a.boleh.kelola && (
            <div className="u-wisuda-aksi">
              <Button variant={a.panitia ? 'outline' : 'primary'} size="sm" onClick={() => setBentuk(true)}>
                <Plus /> Bentuk panitia
              </Button>
              {opsi.length > 0 && (
                <Pilihan options={opsi} value={pilihPanitia} tampilan="cari" size="sm" placeholder="Pilih…" aria-label="Tautkan panitia yang ada" onValueChange={(v) => (setPilihPanitia(v), v && tautkan(v))} />
              )}
              {a.panitia && (
                <Button variant="ghost" size="sm" loading={sibuk === 'panitia'} onClick={() => tautkan(null)}>
                  Lepas
                </Button>
              )}
            </div>
          )}
          <FormPanitia
            open={bentuk}
            onOpenChange={setBentuk}
            unitId={unitPanitiaId ?? undefined}
            jenisKode="wisuda"
            isiAwal={{ nama: `Panitia ${a.nama}`, mulai: new Date().toISOString().slice(0, 10), selesai: a.tanggal }}
            onTersimpan={(p) => tautkan(p.id)}
          />
        </CardContent>
      </Card>
      <Card className="u-wisuda-lebar">
        <CardContent>
          <h3 className="u-wisuda-judul-kartu">
            <GraduationCap aria-hidden /> Per fakultas
          </h3>
          {a.fakultas.length ? (
            <table className="u-wisuda-tabel">
              <thead>
                <tr>
                  <th>Fakultas</th>
                  <th>Wisudawan</th>
                  <th>Hadir</th>
                  <th>Toga</th>
                </tr>
              </thead>
              <tbody>
                {a.fakultas.map((f) => (
                  <tr key={f.kode ?? '-'}>
                    <td>{f.nama ?? f.kode ?? '—'}</td>
                    <td>{f.peserta}</td>
                    <td>{f.hadir}</td>
                    <td>{f.toga}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="u-wisuda-redup">Peserta belum ditarik.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- Peserta
function PesertaAcaraWisuda({ acara: a }: { acara: DetailAcaraWisuda }) {
  const [f, setF] = React.useState<FilterPesertaWisuda>({ page: 1, per_page: 50 });
  const [pilih, setPilih] = React.useState<PesertaWisuda | null>(null);
  const daftar = usePesertaAcaraWisuda(a.id, f);
  const { jalan, sibuk } = useAksiWisuda();
  const ubah = a.boleh.ubah;
  const kolom: DataColumn<PesertaWisuda>[] = [
    {
      key: 'nama',
      header: 'Wisudawan',
      cell: (p) => (
        <div className="u-wisuda-sel">
          <strong>{p.nama}</strong>
          <span>
            {p.nim} · {p.nama_prodi}
          </span>
        </div>
      ),
      value: (p) => `${p.nim} ${p.nama}`,
      mobile: 'title',
    },
    { key: 'ipk', header: 'IPK', align: 'end', cell: (p) => (p.ipk != null ? p.ipk.toFixed(2) : '—'), value: (p) => p.ipk },
    { key: 'kursi', header: 'Kursi', cell: (p) => p.nomor_kursi ?? '—', value: (p) => p.nomor_kursi },
    { key: 'urut', header: 'Urut', align: 'end', cell: (p) => p.urut_panggil ?? '—', value: (p) => p.urut_panggil },
    { key: 'toga', header: 'Toga', cell: (p) => (p.ukuran_toga ? <span>{p.ukuran_toga}{p.toga_at && <Badge variant="success"> diambil</Badge>}</span> : '—'), value: (p) => p.ukuran_toga },
    { key: 'lunas', header: 'Biaya', cell: (p) => (p.lunas == null ? <span className="u-wisuda-redup">belum dicek</span> : p.lunas ? <Badge variant="success">Lunas</Badge> : <Badge variant="warning">Belum lunas</Badge>), value: (p) => (p.lunas == null ? '' : p.lunas ? 'lunas' : 'belum') },
    { key: 'hadir', header: 'Hadir', shrink: true, cell: (p) => (p.hadir_at ? <Badge variant="success" dot>{waktu(p.hadir_at)}</Badge> : <span className="u-wisuda-redup">—</span>), value: (p) => p.hadir_at, mobile: 'badge' },
    { key: 'terbaik', header: 'Terbaik', cell: (p) => (p.terbaik ? <Badge variant="primary"><Award aria-hidden /> {p.terbaik}</Badge> : null), value: (p) => p.terbaik, defaultHidden: true },
  ];
  const fak = a.fakultas.map((x) => ({ value: x.kode ?? '', label: x.nama ?? x.kode ?? '—' })).filter((x) => x.value);
  return (
    <div className="u-wisuda-bagian">
      {ubah && (
        <div className="u-wisuda-aksi">
          <Button loading={sibuk === 'tarik'} onClick={() => jalan<{ baru: number; tetap: number; dibatalkan: number }>('tarik', `${P}/${a.id}/peserta/tarik`, {}, (r) => `Peserta: ${r.baru} baru, ${r.tetap} tetap, ${r.dibatalkan} dibatalkan`)}>
            <RefreshCw /> Tarik dari pendaftar diterima
          </Button>
          <Button variant="outline" loading={sibuk === 'kursi'} disabled={!a.jumlah.peserta} onClick={() => jalan<{ diatur: number }>('kursi', `${P}/${a.id}/kursi`, {}, (r) => `${r.diatur} nomor kursi diatur`)}>
            <Armchair /> Atur kursi otomatis
          </Button>
          <Button variant="outline" loading={sibuk === 'undangan'} disabled={!a.jumlah.peserta} onClick={() => jalan<{ baru: number }>('undangan', `${P}/${a.id}/undangan`, {}, (r) => `${r.baru} undangan pendamping diterbitkan`)}>
            <Ticket /> Terbitkan undangan pendamping
          </Button>
          <Button variant="ghost" loading={sibuk === 'keuangan'} disabled={!a.jumlah.peserta} onClick={() => jalan<{ lunas: number; belum: number }>('keuangan', `${P}/${a.id}/keuangan`, {}, (r) => `Status biaya: ${r.lunas} lunas, ${r.belum} belum lunas`)}>
            <Wallet /> Periksa status lunas
          </Button>
        </div>
      )}
      <DataTable
        columns={kolom}
        rows={daftar.data}
        rowKey={(p) => p.id}
        loading={daftar.loading}
        error={daftar.error}
        onRetry={daftar.refetch}
        page={f.page}
        perPage={f.per_page}
        total={daftar.meta?.total ?? undefined}
        onPageChange={(page) => setF((x) => ({ ...x, page }))}
        onRowClick={ubah ? setPilih : undefined}
        exportCsv={`peserta-${a.nama}`}
        toolbar={
          <div className="u-wisuda-toolbar">
            <InputGroup start={<Search />} size="sm" className="u-wisuda-cari">
              <Input size="sm" value={f.q ?? ''} placeholder="NIM, nama, atau kursi" aria-label="Cari peserta" onChange={(e) => setF((x) => ({ ...x, q: e.target.value || undefined, page: 1 }))} />
            </InputGroup>
            {fak.length > 1 && <Pilihan className="u-wisuda-saring" options={fak} value={f.fakultas ?? null} size="sm" placeholder="Semua fakultas" onValueChange={(v) => setF((x) => ({ ...x, fakultas: v ?? undefined, page: 1 }))} />}
            <Pilihan
              options={[
                { value: 'hadir1', label: 'Sudah hadir' },
                { value: 'hadir0', label: 'Belum hadir' },
                { value: 'toga0', label: 'Toga belum diambil' },
                { value: 'lunas0', label: 'Belum lunas' },
                { value: 'kursi0', label: 'Belum berkursi' },
                { value: 'terbaik1', label: 'Wisudawan terbaik' },
              ]}
              value={null}
              size="sm"
              className="u-wisuda-saring"
              placeholder="Saring…"
              onValueChange={(v) => {
                const m = v?.match(/^([a-z]+)([01])$/);
                setF((x) => ({ page: 1, per_page: x.per_page, q: x.q, fakultas: x.fakultas, ...(m ? { [m[1]]: m[2] } : {}) }));
              }}
            />
          </div>
        }
        empty={{ icon: <GraduationCap />, title: 'Belum ada peserta', description: ubah ? 'Tarik peserta dari pendaftar wisuda yang sudah diterima.' : undefined }}
      />
      {pilih && <FormPesertaWisuda acara={a} peserta={pilih} onTutup={() => setPilih(null)} />}
    </div>
  );
}

const UKURAN_TOGA = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

function FormPesertaWisuda({ acara: a, peserta: p, onTutup }: { acara: DetailAcaraWisuda; peserta: PesertaWisuda; onTutup: () => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const awal = React.useMemo(
    () => ({ ukuran_toga: p.ukuran_toga ?? '', nomor_kursi: p.nomor_kursi ?? '', terbaik: p.terbaik ?? '', batal: p.batal, pendamping: p.pendamping.map((x) => ({ urut: x.urut, nama: x.nama ?? '', hubungan: x.hubungan ?? '' })) }),
    [p],
  );
  const [isi, setIsi] = React.useState(awal);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  return (
    <PanelForm
      open
      onOpenChange={(o) => !o && onTutup()}
      size="lg"
      title={p.nama}
      description={`${p.nim} · ${p.nama_prodi ?? ''}${p.predikat ? ` · ${p.predikat}` : ''}`}
      berubah={JSON.stringify(isi) !== JSON.stringify(awal)}
      onSimpan={async () => {
        try {
          await siakad.request({ method: 'POST', path: `${P}/${a.id}/peserta/${p.id}`, body: { ukuran_toga: isi.ukuran_toga || null, nomor_kursi: isi.nomor_kursi.trim() || null, terbaik: isi.terbaik.trim() || null, batal: isi.batal, pendamping: isi.pendamping } });
        } catch (e) {
          return galatIsian(e, setGalat);
        }
        invalidateSiakad('wisuda');
        toast.add({ title: 'Data wisudawan disimpan', type: 'success' });
      }}
    >
      <BagianForm judul="Kursi, toga, dan predikat" kolom={2}>
        <Field label="Ukuran toga" error={galat.ukuran_toga || undefined}>
          <Pilihan options={UKURAN_TOGA.map((u) => ({ value: u, label: u }))} value={isi.ukuran_toga || null} tampilan="tombol" placeholder="Pilih…" onValueChange={(v) => setIsi((x) => ({ ...x, ukuran_toga: v ?? '' }))} />
        </Field>
        <Field label="Nomor kursi" error={galat.nomor_kursi || undefined} description="Kosongkan lalu pakai Atur kursi otomatis bila perlu.">
          <Input value={isi.nomor_kursi} maxLength={12} placeholder="mis. A-01" onChange={(e) => setIsi((x) => ({ ...x, nomor_kursi: e.target.value.toUpperCase() }))} />
        </Field>
        <Field label="Wisudawan terbaik" optional className="u-form-lebar" description={p.ipk != null ? `IPK ${p.ipk.toFixed(2)}` : undefined}>
          <Pilihan
            options={['Terbaik universitas', 'Terbaik fakultas', 'Terbaik program studi'].map((v) => ({ value: v, label: v }))}
            value={isi.terbaik || null}
            tampilan="tombol"
            placeholder="Pilih…"
            onValueChange={(v) => setIsi((x) => ({ ...x, terbaik: v ?? '' }))}
          />
        </Field>
        <label className="u-wisuda-centang u-form-lebar">
          <Checkbox checked={isi.batal} onCheckedChange={(c) => setIsi((x) => ({ ...x, batal: Boolean(c) }))} /> Batal ikut acara ini (undangan tidak berlaku)
        </label>
      </BagianForm>
      {isi.pendamping.length > 0 && (
        <BagianForm judul="Undangan pendamping" kolom={2} keterangan="Nama pada undangan (opsional). QR tiap undangan dipindai di pintu masuk.">
          {isi.pendamping.map((d, i) => (
            <React.Fragment key={d.urut}>
              <Field label={`Pendamping ${d.urut}`} optional>
                <Input value={d.nama} maxLength={150} onChange={(e) => setIsi((x) => ({ ...x, pendamping: x.pendamping.map((y, j) => (j === i ? { ...y, nama: e.target.value } : y)) }))} />
              </Field>
              <Field label="Hubungan" optional>
                <Pilihan
                  options={['Ayah', 'Ibu', 'Suami', 'Istri', 'Wali', 'Saudara'].map((v) => ({ value: v, label: v }))}
                  value={d.hubungan || null}
                  placeholder="Pilih…"
                  onValueChange={(v) => setIsi((x) => ({ ...x, pendamping: x.pendamping.map((y, j) => (j === i ? { ...y, hubungan: v ?? '' } : y)) }))}
                />
              </Field>
            </React.Fragment>
          ))}
        </BagianForm>
      )}
      {p.kode && (
        <BagianForm judul="Undangan QR" kolom={1}>
          <div className="u-wisuda-qr-deret">
            <figure>
              <KodeQr nilai={p.kode} ukuran={132} unduh={`undangan-${p.nim}`} />
              <figcaption>Wisudawan</figcaption>
            </figure>
            {p.pendamping.map((x) =>
              x.kode ? (
                <figure key={x.urut}>
                  <KodeQr nilai={x.kode} ukuran={132} unduh={`undangan-${p.nim}-pendamping-${x.urut}`} />
                  <figcaption>Pendamping {x.urut}{x.hadir_at ? ' · hadir' : ''}</figcaption>
                </figure>
              ) : null,
            )}
          </div>
        </BagianForm>
      )}
    </PanelForm>
  );
}

// ---------------------------------------------------------------- Hari-H
/** Pemindai QR hari-H: kehadiran wisudawan/pendamping dan pengambilan toga (sesuai tugas seksi). */
export function PemindaiWisuda({ acara: a, className }: { acara: DetailAcaraWisuda; className?: string }) {
  const siakad = useSiakad();
  const opsiJenis = [...(a.boleh.kehadiran ? [{ value: 'kehadiran', label: 'Kehadiran' }] : []), ...(a.boleh.toga ? [{ value: 'toga', label: 'Pengambilan toga' }] : [])];
  const [jenis, setJenis] = React.useState<'kehadiran' | 'toga'>((opsiJenis[0]?.value as 'kehadiran' | 'toga') ?? 'kehadiran');
  const [kamera, setKamera] = React.useState(false);
  const [manual, setManual] = React.useState('');
  const [hasil, setHasil] = React.useState<HasilPindaiWisuda | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [riwayat, setRiwayat] = React.useState<HasilPindaiWisuda[]>([]);
  const sibuk = React.useRef(false);
  const kirim = async (isi: string, batal = false) => {
    if (sibuk.current || !isi.trim()) return;
    sibuk.current = true;
    setGalat(null);
    const v = isi.trim();
    try {
      const r = await siakad.request<HasilPindaiWisuda>({ method: 'POST', path: `${P}/${a.id}/pindai`, body: { ...(v.startsWith('UNIPO-WSD:') || /^[0-9a-f]{32}$/.test(v) ? { kode: v } : { nim: v }), jenis, batal } });
      if (r.data) {
        setHasil(r.data);
        setRiwayat((x) => [r.data as HasilPindaiWisuda, ...x].slice(0, 8));
      }
      setManual('');
      invalidateSiakad('wisuda');
    } catch (e) {
      setHasil(null);
      setGalat(pesanGalat(e));
    } finally {
      sibuk.current = false;
    }
  };
  if (!opsiJenis.length) return <Empty icon={<ScanLine />} title="Bukan tugas Anda" description="Pemindaian hari-H dikerjakan seksi registrasi dan perlengkapan." />;
  return (
    <div className={cn('u-wisuda-pindai', className)}>
      <div className="u-wisuda-pindai-kiri">
        {opsiJenis.length > 1 && <Pilihan options={opsiJenis} value={jenis} tampilan="tombol" onValueChange={(v) => v && setJenis(v as 'kehadiran' | 'toga')} />}
        <div className="u-wisuda-kamera">
          {kamera ? (
            <KameraPindaiQr aktif={kamera} onBaca={(x) => kirim(x)} onGalat={(m) => (setGalat(m), setKamera(false))} />
          ) : (
            <Button size="lg" onClick={() => setKamera(true)}>
              <QrCode /> Buka kamera pemindai
            </Button>
          )}
        </div>
        <form
          className="u-wisuda-manual"
          onSubmit={(e) => {
            e.preventDefault();
            kirim(manual);
          }}
        >
          <Input value={manual} placeholder="Atau ketik NIM / kode undangan" aria-label="NIM atau kode undangan" onChange={(e) => setManual(e.target.value)} />
          <Button type="submit" variant="outline">
            Catat
          </Button>
        </form>
      </div>
      <div className="u-wisuda-pindai-kanan">
        {galat && <Alert variant="danger" title="Tidak tercatat">{galat}</Alert>}
        {hasil && (
          <Card className="u-wisuda-hasil" data-status={hasil.status}>
            <CardContent>
              <Badge variant={hasil.status === 'tercatat' ? 'success' : hasil.status === 'sudah' ? 'warning' : 'neutral'} size="lg">
                {hasil.status === 'tercatat' ? (hasil.jenis === 'toga' ? 'Toga dicatat diambil' : 'Hadir tercatat') : hasil.status === 'sudah' ? `Sudah tercatat ${waktu(hasil.sebelumnya)}` : 'Dibatalkan'}
              </Badge>
              <h3>{hasil.pemegang === 'pendamping' ? `Pendamping ${hasil.pendamping?.urut}${hasil.pendamping?.nama ? `: ${hasil.pendamping.nama}` : ''}` : hasil.peserta.nama}</h3>
              <p className="u-wisuda-redup">
                {hasil.pemegang === 'pendamping' ? `Pendamping ${hasil.peserta.nama} · ` : ''}
                {hasil.peserta.nim} · {hasil.peserta.nama_prodi}
              </p>
              <DescriptionList
                items={[
                  { label: 'Kursi', value: hasil.peserta.nomor_kursi ?? '—' },
                  { label: 'Urutan panggil', value: hasil.peserta.urut_panggil ?? '—' },
                  { label: 'Ukuran toga', value: hasil.peserta.ukuran_toga ?? '—' },
                  ...(hasil.peserta.terbaik ? [{ label: 'Terbaik', value: hasil.peserta.terbaik }] : []),
                ]}
              />
              {hasil.status !== 'dibatalkan' && (
                <Button variant="ghost" size="sm" onClick={() => kirim(hasil.pemegang === 'wisudawan' ? hasil.peserta.nim : '', true)} disabled={hasil.pemegang !== 'wisudawan'}>
                  Batalkan catatan ini
                </Button>
              )}
            </CardContent>
          </Card>
        )}
        {!hasil && !galat && <Empty icon={<ScanLine />} title="Siap memindai" description="Arahkan kamera ke QR undangan wisudawan atau pendamping." />}
        {riwayat.length > 1 && (
          <ul className="u-wisuda-riwayat-pindai">
            {riwayat.slice(1).map((r, i) => (
              <li key={i}>
                <span>{r.pemegang === 'pendamping' ? `Pendamping ${r.peserta.nama}` : r.peserta.nama}</span>
                <span className="u-wisuda-redup">{r.jenis === 'toga' ? 'toga' : 'hadir'} · {r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Pemanggilan & sambutan
function PemanggilanWisuda({ acara: a }: { acara: DetailAcaraWisuda }) {
  const susunan = useSusunanAcaraWisuda(a.id);
  const urutan = usePesertaAcaraWisuda(a.id, { urut: 'panggil', per_page: 500 });
  const [ubahSusunan, setUbahSusunan] = React.useState(false);
  const { jalan, sibuk } = useAksiWisuda();
  const boleh = a.boleh.pemanggilan;
  const geser = (i: number, arah: -1 | 1) => {
    const ids = (urutan.data ?? []).map((p) => p.id);
    const j = i + arah;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    jalan('urut', `${P}/${a.id}/urutan`, { urut: ids }, () => 'Urutan diperbarui');
  };
  return (
    <div className="u-wisuda-grid">
      <Card>
        <CardContent>
          <div className="u-wisuda-kepala-kartu">
            <h3 className="u-wisuda-judul-kartu">
              <ClipboardList aria-hidden /> Susunan acara
            </h3>
            {boleh && (
              <Button variant="outline" size="sm" onClick={() => setUbahSusunan(true)}>
                <Pencil /> Susun
              </Button>
            )}
          </div>
          {susunan.error && <GalatApi error={susunan.error} onRetry={susunan.refetch} />}
          {susunan.data?.length ? (
            <ol className="u-wisuda-susunan">
              {susunan.data.map((s) => (
                <li key={s.id} data-jenis={s.jenis}>
                  <strong>{s.judul}</strong>
                  <span className="u-wisuda-redup">{[s.jenis === 'sambutan' ? 'Sambutan' : s.jenis === 'pemanggilan' ? 'Pemanggilan' : 'Acara', s.pengisi, s.durasi_menit && `${s.durasi_menit} menit`].filter(Boolean).join(' · ')}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="u-wisuda-redup">Belum disusun.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <div className="u-wisuda-kepala-kartu">
            <h3 className="u-wisuda-judul-kartu">
              <ListOrdered aria-hidden /> Urutan pemanggilan
            </h3>
            {boleh && (
              <Button size="sm" loading={sibuk === 'urut-oto'} onClick={() => jalan<{ diatur: number }>('urut-oto', `${P}/${a.id}/urutan`, {}, (r) => `${r.diatur} wisudawan diurutkan per fakultas/prodi`)}>
                <RefreshCw /> Urutkan otomatis
              </Button>
            )}
          </div>
          {urutan.error && <GalatApi error={urutan.error} onRetry={urutan.refetch} />}
          <ol className="u-wisuda-urutan">
            {(urutan.data ?? []).slice(0, 200).map((p, i) => (
              <li key={p.id}>
                <span className="u-wisuda-nomor">{p.urut_panggil ?? '—'}</span>
                <span className="u-wisuda-sel">
                  <strong>
                    {p.nama} {p.terbaik && <Badge variant="primary">{p.terbaik}</Badge>}
                  </strong>
                  <span>
                    {p.nim} · {p.nama_prodi} · kursi {p.nomor_kursi ?? '—'}
                  </span>
                </span>
                {boleh && (
                  <span className="u-wisuda-geser">
                    <Button variant="ghost" size="xs" iconOnly aria-label="Naikkan" disabled={i === 0 || sibuk === 'urut'} onClick={() => geser(i, -1)}>
                      ↑
                    </Button>
                    <Button variant="ghost" size="xs" iconOnly aria-label="Turunkan" disabled={i === (urutan.data?.length ?? 0) - 1 || sibuk === 'urut'} onClick={() => geser(i, 1)}>
                      ↓
                    </Button>
                  </span>
                )}
              </li>
            ))}
          </ol>
          {(urutan.data?.length ?? 0) > 200 && <p className="u-wisuda-redup">Menampilkan 200 pertama; laporan memuat semuanya.</p>}
        </CardContent>
      </Card>
      {boleh && <FormSusunanWisuda acara={a} data={susunan.data ?? []} open={ubahSusunan} onOpenChange={setUbahSusunan} />}
    </div>
  );
}

function FormSusunanWisuda({ acara: a, data, open, onOpenChange }: { acara: DetailAcaraWisuda; data: SusunanWisuda[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [item, setItem] = React.useState<SusunanWisuda[]>([]);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (open) {
      setItem(data.length ? data : [{ jenis: 'acara', judul: 'Pembukaan', pengisi: null, durasi_menit: null, kode_fakultas: null }]);
      setGalat({});
    }
  }, [open, data]);
  const fak = a.fakultas.filter((f) => f.kode).map((f) => ({ value: f.kode as string, label: f.nama ?? (f.kode as string) }));
  const ubah = (i: number, patch: Partial<SusunanWisuda>) => setItem((x) => x.map((y, j) => (j === i ? { ...y, ...patch } : y)));
  return (
    <PanelForm
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Susunan acara"
      description="Sambutan, acara, dan blok pemanggilan per fakultas. Urutan otomatis pemanggilan mengikuti urutan blok fakultas di sini."
      onSimpan={async () => {
        try {
          await siakad.request({ method: 'POST', path: `${P}/${a.id}/susunan`, body: { item } });
        } catch (e) {
          return galatIsian(e, setGalat);
        }
        invalidateSiakad('wisuda');
        toast.add({ title: 'Susunan acara disimpan', type: 'success' });
      }}
    >
      <BagianForm
        judul="Butir susunan"
        kolom={1}
        aksi={
          <Button variant="outline" size="sm" onClick={() => setItem((x) => [...x, { jenis: 'sambutan', judul: '', pengisi: null, durasi_menit: null, kode_fakultas: null }])}>
            <Plus /> Butir
          </Button>
        }
      >
        {item.map((s, i) => (
          <div key={i} className="u-wisuda-butir">
            <Pilihan
              options={[
                { value: 'acara', label: 'Acara' },
                { value: 'sambutan', label: 'Sambutan' },
                { value: 'pemanggilan', label: 'Pemanggilan' },
              ]}
              value={s.jenis}
              size="sm"
              tampilan="tombol"
              onValueChange={(v) => v && ubah(i, { jenis: v as SusunanWisuda['jenis'] })}
            />
            <Field label="Judul" error={galat[`item.${i}.judul`] || undefined}>
              <Input value={s.judul} maxLength={200} placeholder={s.jenis === 'sambutan' ? 'mis. Sambutan Rektor' : s.jenis === 'pemanggilan' ? 'mis. Pemanggilan wisudawan FIK' : 'mis. Prosesi senat'} onChange={(e) => ubah(i, { judul: e.target.value })} />
            </Field>
            {s.jenis === 'pemanggilan' ? (
              <Field label="Fakultas">
                <Pilihan options={fak} value={s.kode_fakultas} placeholder="Pilih…" onValueChange={(v) => ubah(i, { kode_fakultas: v ?? null })} />
              </Field>
            ) : (
              <Field label="Pengisi" optional>
                <Input value={s.pengisi ?? ''} maxLength={150} onChange={(e) => ubah(i, { pengisi: e.target.value || null })} />
              </Field>
            )}
            <Field label="Menit" optional>
              <Input value={s.durasi_menit != null ? String(s.durasi_menit) : ''} inputMode="numeric" maxLength={3} onChange={(e) => ubah(i, { durasi_menit: e.target.value ? Number(e.target.value.replace(/\D/g, '')) : null })} />
            </Field>
            <Button variant="ghost" size="sm" iconOnly aria-label="Hapus butir" onClick={() => setItem((x) => x.filter((_, j) => j !== i))}>
              <Trash2 />
            </Button>
          </div>
        ))}
      </BagianForm>
    </PanelForm>
  );
}

// ---------------------------------------------------------------- Laporan & riwayat
function LaporanAcaraWisuda({ acara: a }: { acara: DetailAcaraWisuda }) {
  const lap = useLaporanAcaraWisuda(a.id);
  if (lap.error) return <GalatApi error={lap.error} onRetry={lap.refetch} />;
  if (!lap.data) return <Skeleton style={{ height: 240 }} />;
  const l = lap.data;
  const kolom = ['Fakultas', 'Program studi', 'Wisudawan', 'Hadir', 'Pendamping hadir', 'Toga', 'Berkursi', 'Lunas', 'Terbaik'];
  return (
    <div className="u-wisuda-bagian">
      <div className="u-wisuda-aksi">
        <TombolCsv
          namaFile={`laporan-${a.nama}`}
          label={
            <>
              <Download /> Ekspor CSV
            </>
          }
          data={() => ({
            kolom,
            baris: [
              ...l.baris.map((b) => [b.nama_fakultas, b.nama_prodi, b.peserta, b.hadir, b.pendamping_hadir, b.toga, b.berkursi, b.lunas, b.terbaik]),
              ['Jumlah', '', l.total.peserta, l.total.hadir, l.total.pendamping_hadir, l.total.toga, l.total.berkursi, l.total.lunas, l.total.terbaik],
            ],
          })}
        />
      </div>
      <div className="u-wisuda-gulir">
        <table className="u-wisuda-tabel">
          <thead>
            <tr>
              {kolom.map((k) => (
                <th key={k}>{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {l.baris.map((b) => (
              <tr key={`${b.kode_fakultas}-${b.kode_prodi}`}>
                <td>{b.nama_fakultas}</td>
                <td>{b.nama_prodi}</td>
                <td>{b.peserta}</td>
                <td>{b.hadir}</td>
                <td>{b.pendamping_hadir}</td>
                <td>{b.toga}</td>
                <td>{b.berkursi}</td>
                <td>{b.lunas}</td>
                <td>{b.terbaik}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={2}>Jumlah</th>
              <th>{l.total.peserta}</th>
              <th>{l.total.hadir}</th>
              <th>{l.total.pendamping_hadir}</th>
              <th>{l.total.toga}</th>
              <th>{l.total.berkursi}</th>
              <th>{l.total.lunas}</th>
              <th>{l.total.terbaik}</th>
            </tr>
          </tfoot>
        </table>
      </div>
      {l.terbaik.length > 0 && (
        <Card>
          <CardContent>
            <h3 className="u-wisuda-judul-kartu">
              <Award aria-hidden /> Wisudawan terbaik
            </h3>
            <ul className="u-wisuda-terbaik">
              {l.terbaik.map((t) => (
                <li key={t.nim}>
                  <strong>{t.nama}</strong>
                  <span className="u-wisuda-redup">
                    {t.terbaik} · {t.nama_prodi} · IPK {t.ipk?.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const LABEL_AKSI: Record<string, string> = {
  dibuat: 'Acara dibuat', diubah: 'Acara diubah', dihapus: 'Acara dihapus', panitia: 'Panitia', tarik_peserta: 'Tarik peserta', periksa_keuangan: 'Periksa status lunas',
  ubah_peserta: 'Ubah wisudawan', atur_kursi: 'Atur kursi', atur_urutan: 'Urutan pemanggilan', susunan: 'Susunan acara', undangan: 'Undangan pendamping',
  hadir: 'Hadir', hadir_pendamping: 'Pendamping hadir', toga: 'Toga diambil', batal_hadir: 'Batal hadir', batal_toga: 'Batal toga', batal_hadir_pendamping: 'Batal hadir pendamping', umumkan: 'Diumumkan',
};
const LABEL_SUMBER: Record<string, string> = { baak: 'BAAK', pustikom: 'Pustikom', fakultas: 'Fakultas', dashboard: 'Dasbor pimpinan' };

function RiwayatAcara({ id }: { id: string }) {
  const r = useRiwayatAcaraWisuda(id);
  if (r.error) return <GalatApi error={r.error} onRetry={r.refetch} />;
  if (!r.data) return <Skeleton style={{ height: 200 }} />;
  if (!r.data.length) return <Empty title="Belum ada riwayat" />;
  return (
    <ul className="u-wisuda-jejak">
      {r.data.map((x, i) => (
        <li key={i}>
          <strong>{LABEL_AKSI[x.aksi] ?? x.aksi}</strong>
          {x.catatan && <span>{x.catatan}</span>}
          <span className="u-wisuda-redup">
            {x.oleh}
            {x.sumber && ` · ${LABEL_SUMBER[x.sumber] ?? x.sumber}`} · {x.created_at ? `${formatDate(x.created_at, 'medium')} ${formatTime(x.created_at)}` : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ================================================================ Tugas panitia wisuda
/**
 * Isi menu "Tugas kepanitiaan" untuk penugasan panitia wisuda: acara yang ditangani panitianya, langsung ke ruang acara
 * dengan tab sesuai seksi (registrasi → Hari-H, acara → Pemanggilan, ketua → semua).
 */
export function TugasPanitiaWisuda({ penugasan, className }: { penugasan: PenugasanPanitia; className?: string }) {
  const daftar = useDaftarAcaraWisuda({ per_page: 50 });
  const [pilih, setPilih] = React.useState<string | null>(null);
  const milik = (daftar.data ?? []).filter((a) => a.panitia?.id === penugasan.panitia.id);
  React.useEffect(() => {
    if (!pilih && milik.length === 1) setPilih(milik[0].id);
  }, [pilih, milik]);
  if (daftar.error) return <GalatApi error={daftar.error} onRetry={daftar.refetch} />;
  if (pilih) return <RuangAcaraWisuda id={pilih} onKembali={milik.length > 1 ? () => setPilih(null) : undefined} className={className} />;
  if (daftar.loading) return <Skeleton style={{ height: 120 }} />;
  if (!milik.length) return <Empty icon={<GraduationCap />} title="Acara belum ditautkan" description="BAAK menautkan panitia ini ke acara wisuda; setelah itu tugas Anda tampil di sini." />;
  return (
    <ul className="u-wisuda-pilih-acara">
      {milik.map((a) => (
        <li key={a.id}>
          <Card interactive onClick={() => setPilih(a.id)}>
            <CardContent>
              <strong>{a.nama}</strong>
              <span className="u-wisuda-redup">
                {tgl(a.tanggal)} · {a.tempat}
              </span>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

// ================================================================ Profil mahasiswa
/** Status wisuda mahasiswa (Profil » Wisuda): jadwal, gladi, kursi, urutan, toga, undangan QR wisudawan dan pendamping. */
export function StatusWisudaSayaKartu({ className }: { className?: string }) {
  const s = useStatusWisudaSaya();
  if (s.error) return <GalatApi error={s.error} onRetry={s.refetch} />;
  if (!s.data) return <Skeleton style={{ height: 240 }} />;
  if (!s.data.length)
    return <Empty icon={<GraduationCap />} title="Belum terdaftar di acara wisuda" description="Setelah pendaftaran wisuda Anda diterima dan acara diumumkan BAAK, jadwal, nomor kursi, dan undangan QR tampil di sini." />;
  return (
    <div className={cn('u-wisuda-saya', className)}>
      {s.data.map((w) => (
        <Card key={w.acara.id}>
          <CardContent>
            <div className="u-wisuda-saya-kepala">
              <div>
                <h3>{w.acara.nama}</h3>
                <p className="u-wisuda-redup">
                  {w.nama} · {w.nim} · {w.nama_prodi}
                </p>
              </div>
              <StatusAcaraWisudaBadge status={w.acara.status} />
            </div>
            {w.terbaik && (
              <Alert variant="success" icon={<Award />} title={`Selamat, ${w.terbaik}`}>
                {w.predikat ? `Predikat ${w.predikat}.` : null}
              </Alert>
            )}
            <div className="u-wisuda-saya-isi">
              <DescriptionList
                items={[
                  { label: 'Hari wisuda', value: [tgl(w.acara.tanggal), jamRentang(w.acara.jam_mulai, w.acara.jam_selesai)].filter(Boolean).join(', ') },
                  { label: 'Tempat', value: [w.acara.tempat, w.acara.alamat].filter(Boolean).join(', ') },
                  { label: 'Gladi bersih', value: w.acara.gladi_tanggal ? [tgl(w.acara.gladi_tanggal), w.acara.gladi_jam && `${w.acara.gladi_jam} WITA`, w.acara.gladi_tempat].filter(Boolean).join(', ') : '—' },
                  { label: 'Nomor kursi', value: w.nomor_kursi ?? 'Belum diatur' },
                  { label: 'Urutan pemanggilan', value: w.urut_panggil ?? 'Belum diatur' },
                  { label: 'Ukuran toga', value: `${w.ukuran_toga ?? '—'}${w.toga_at ? ` · diambil ${formatDate(w.toga_at)}` : ' · belum diambil'}` },
                  ...(w.lunas === false ? [{ label: 'Biaya wisuda', value: <Badge variant="warning">Belum lunas, hubungi Keuangan</Badge> }] : []),
                ]}
              />
              <div className="u-wisuda-qr-deret">
                <figure>
                  <KodeQr nilai={w.kode} ukuran={168} unduh={`undangan-wisuda-${w.nim}`} />
                  <figcaption>Undangan wisudawan{w.hadir_at ? ' · hadir' : ''}</figcaption>
                </figure>
                {w.pendamping.map((d) =>
                  d.kode ? (
                    <figure key={d.urut}>
                      <KodeQr nilai={d.kode} ukuran={132} unduh={`undangan-pendamping-${w.nim}-${d.urut}`} />
                      <figcaption>
                        Pendamping {d.urut}
                        {d.nama ? `: ${d.nama}` : ''}
                      </figcaption>
                    </figure>
                  ) : null,
                )}
              </div>
            </div>
            {w.susunan.length > 0 && (
              <details className="u-wisuda-susunan-saya">
                <summary>Susunan acara</summary>
                <ol>
                  {w.susunan.map((x, i) => (
                    <li key={i}>
                      {x.judul}
                      {x.pengisi && <span className="u-wisuda-redup"> · {x.pengisi}</span>}
                    </li>
                  ))}
                </ol>
              </details>
            )}
            <p className="u-wisuda-redup">Tunjukkan QR di pintu masuk. QR pendamping diberikan kepada keluarga yang mendampingi.</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ================================================================ Tugas kepanitiaan (semua jenis)
export interface TugasKepanitiaanProps {
  /** Kode aplikasi tempat komponen dipasang (fakultas, baak, ...) untuk memilih tautan tugas. */
  aplikasi: string;
  /** Navigasi ke alamat dalam aplikasi (mis. useNavigate dari react-router). Bawaan: location.href. */
  buka?: (href: string) => void;
  judul?: React.ReactNode;
  className?: string;
}

/**
 * Halaman "Tugas kepanitiaan": penugasan panitia yang sedang AKTIF (semua jenis: wisuda, UTS/UAS, ...) beserta seksi
 * dan tugasnya. Tugas bertautan (mis. UTS/UAS: Jadwal ujian, CBT) membuka halaman aplikasinya; panitia wisuda langsung
 * bekerja di ruang acaranya. Hilang dengan sendirinya setelah masa SK lewat atau akses dicabut.
 */
export function TugasKepanitiaan({ aplikasi, buka, judul = 'Tugas kepanitiaan', className }: TugasKepanitiaanProps) {
  const t = useTugasPanitiaSaya();
  const [pilih, setPilih] = React.useState<number>(0);
  if (t.error) return <GalatApi error={t.error} onRetry={t.refetch} />;
  if (!t.data) return <Skeleton style={{ height: 200 }} />;
  if (!t.data.length) return <Empty icon={<UsersRound />} title="Tidak ada penugasan aktif" description="Penugasan panitia tampil di sini selama masa SK dan setelah hak aksesnya disetujui Pustikom." />;
  const p = t.data[Math.min(pilih, t.data.length - 1)];
  const ke = (href: string) => (buka ? buka(href) : (window.location.href = href));
  return (
    <div className={cn('u-wisuda', className)}>
      {judul !== null && (
        <div className="u-wisuda-kepala">
          <div>
            <h2>{judul}</h2>
            <p>Penugasan panitia yang sedang berjalan. Menu ini hilang otomatis setelah masa SK berakhir.</p>
          </div>
        </div>
      )}
      {t.data.length > 1 && (
        <Tabs value={String(Math.min(pilih, t.data.length - 1))} onValueChange={(v) => setPilih(Number(v))} variant="pill" items={t.data.map((x, i) => ({ value: String(i), label: x.panitia.nama }))} />
      )}
      <Card>
        <CardContent>
          <div className="u-wisuda-saya-kepala">
            <div>
              <h3>{p.panitia.nama}</h3>
              <p className="u-wisuda-redup">
                {p.jabatan.nama}
                {p.uraian && ` · ${p.uraian}`} · {p.panitia.unit.singkatan ?? p.panitia.unit.nama}
                {p.panitia.nomor_sk && ` · SK ${p.panitia.nomor_sk}`}
              </p>
            </div>
            <Badge variant={p.panitia.sisa_hari <= 3 ? 'warning' : 'info'}>
              s.d. {formatDate(p.panitia.selesai)} ({p.panitia.sisa_hari} hari lagi)
            </Badge>
          </div>
          <div className="u-wisuda-tugas">
            {p.tugas.length ? (
              p.tugas.map((x) =>
                x.tautan?.[aplikasi] ? (
                  <Button key={x.kode} variant="outline" size="sm" onClick={() => ke(x.tautan[aplikasi])}>
                    <ClipboardList /> {x.nama}
                  </Button>
                ) : (
                  <Badge key={x.kode} variant="info" title={x.keterangan ?? undefined}>
                    <ClipboardList aria-hidden /> {x.nama}
                  </Badge>
                ),
              )
            ) : (
              <span className="u-wisuda-redup">Jabatan ini belum diberi tugas oleh Pustikom.</span>
            )}
          </div>
        </CardContent>
      </Card>
      {p.panitia.jenis === 'wisuda' && <TugasPanitiaWisuda key={p.panitia.id} penugasan={p} />}
    </div>
  );
}

/** Ada penugasan panitia aktif? Untuk menampilkan menu "Tugas kepanitiaan" hanya selama penugasan berjalan. */
export function useAdaTugasKepanitiaan(opsi?: { enabled?: boolean }) {
  const t = useTugasPanitiaSaya(opsi);
  return { ada: Boolean(t.data?.length), loading: t.loading, data: t.data };
}
