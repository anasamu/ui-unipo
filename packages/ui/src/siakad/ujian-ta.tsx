'use client';
import * as React from 'react';
import { AlurPemeriksa, LabelPemeriksa, tahapAktif, teksAlurPemeriksa, type TahapPemeriksa } from './pemeriksa';
import {
  CalendarClock,
  CalendarDays,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Clock,
  Download,
  FileSearch,
  FileText,
  Gavel,
  Hourglass,
  MapPin,
  Plus,
  Send,
  Sparkles,
  TriangleAlert,
  Undo2,
  Upload,
  Users,
  Video,
} from 'lucide-react';
import { Badge, Button } from '../components/actions';
import { Alert, Card, DescriptionList, Empty, Tabs } from '../components/display';
import { DataTable, type DataColumn } from '../components/data-table';
import { Checkbox, Field, Input, SegmentedControl, Switch, Textarea } from '../components/forms';
import { Select } from '../components/select';
import { AgendaList, type CalendarEvent } from '../components/schedule';
import { ConfirmDialog, Dialog, Sheet, useToast } from '../components/overlays';
import { useUnggahBerkas } from './berkas';
import { PilihDosenBersyarat, type PeranPenetapanDosen } from './aturan-fakultas';
import { PilihSK } from './isian-sk';
import { PilihEntitas } from './pilih';
import { invalidateSiakad, useSaatInvalidasi, useSiakad, useSiakadQuery } from './provider';
import { SUMBER_DOSEN_TA } from './tugas-akhir';
import { IsianAngka, IsianJam } from '../components/isian-angka';
import { IsianTanggal } from '../components/formulir';
import { keAngka, teksAngka } from '../lib/angka';
import { IsianBerkas } from '../components/pilih-berkas-lokal';
import { Tekan } from '../components/tekan';

/*
 * Ujian tugas akhir (/v1/ta/ujian, SIAKAD docs/UJIAN-TA.md): ujian proposal, seminar hasil, sidang skripsi dalam satu
 * alur. Syarat ujian = gabungan aturan per unit (Akademik, Keuangan, LPPM/plagiasi, Perpustakaan, UPT Bahasa),
 * pengajuan mahasiswa -> persetujuan pembimbing -> jadwal + tim (cek bentrok dan syarat dosen) -> diajukan ke Dekan ->
 * ditetapkan dengan SK Dekan (registri SK, kolektif) -> kehadiran, nilai, keputusan, revisi. Juga layanan cek
 * plagiasi (/v1/plagiasi) dan bukti syarat yang divalidasi unit (/v1/bukti-syarat).
 */

const P = '/v1/ta/ujian';
const enc = encodeURIComponent;

// ================================================================ Tipe
export type JenisUjianTa = 'proposal' | 'hasil' | 'skripsi';
export type StatusSyarat = 'ok' | 'gagal' | 'menunggu' | 'peringatan';

export interface TindakanSyarat {
  jenis: 'kirim_bukti' | 'cek_plagiasi' | 'bayar';
  label: string;
  aturan_id?: string;
  jenis_naskah?: string;
}
export interface SyaratUjian {
  aturan_id?: string;
  unit: string;
  nama: string;
  status: StatusSyarat;
  pesan: string | null;
  mode: 'blokir' | 'peringatan';
  cara?: string;
  sk?: string | null;
  bawaan?: boolean;
  tindakan?: TindakanSyarat | null;
  unit_validasi?: string;
  plagiasi?: { skor: number; alat: string | null; berlaku_sampai: string | null } | null;
}
export interface UnitSyarat {
  unit: string;
  nama: string;
  status: StatusSyarat;
  syarat: SyaratUjian[];
}
export interface KelayakanUjianTa {
  jenis: JenisUjianTa;
  titik: string;
  titik_judul: string;
  layak: boolean;
  alasan: string[];
  jumlah_peringatan: number;
  unit: UnitSyarat[];
}
export interface AnggotaTimUjian {
  peran: 'ketua' | 'sekretaris' | 'penguji' | 'pembimbing_1' | 'pembimbing_2';
  peran_label: string;
  nidn: string;
  nama: string;
  urut: number;
  menilai: boolean;
  hadir: boolean | null;
  nilai: number | null;
  rubrik: Record<string, number> | null;
  catatan: string | null;
}
export interface HakUjianTa {
  setuju_pembimbing: boolean;
  jadwal: boolean;
  ajukan: boolean;
  tetapkan: boolean;
  kembalikan: boolean;
  hadir: boolean;
  nilai: boolean;
  putuskan: boolean;
  revisi_selesai: boolean;
  tunda: boolean;
  batal: boolean;
  dokumen: boolean;
}
export interface UjianTa {
  id: string;
  jenis: JenisUjianTa;
  jenis_label: string;
  nim: string;
  nama: string | null;
  kode_prodi: string;
  nama_prodi: string | null;
  kode_fak: string;
  judul: string | null;
  pembimbing: Array<{ nidn: string; nama: string }>;
  /** Alur pemeriksa (docs/PEMERIKSA.md): pembimbing, penjadwalan prodi/fakultas, penetapan SK Dekan. */
  pemeriksa?: TahapPemeriksa[];
  status: string;
  status_label: string;
  tanggal: string | null;
  mulai: string | null;
  selesai: string | null;
  ruang: { kode: string; nama: string | null } | null;
  daring: boolean;
  tautan: string | null;
  tim: AnggotaTimUjian[];
  sk: { id: string; nomor: string; tanggal: string | null } | null;
  nilai_akhir: number | null;
  huruf: string | null;
  keputusan: 'lanjut' | 'revisi' | 'ulang' | null;
  keputusan_label: string | null;
  catatan_revisi: string | null;
  batas_revisi: string | null;
  revisi_selesai_at: string | null;
  alasan: string | null;
  catatan_dekan: string | null;
  catatan_pembimbing: string | null;
  catatan_mahasiswa: string | null;
  hak: HakUjianTa;
  pengaturan?: { rubrik: Array<{ kode: string; label: string; bobot: number }>; min_penguji: number; maks_penguji: number; durasi_menit: number; sekretaris: boolean } | null;
  riwayat?: Array<{ aksi: string; status_dari: string | null; status_ke: string | null; catatan: string | null; oleh: string | null; created_at: string }>;
}
export interface BentrokUjian {
  jenis: string;
  keras: boolean;
  pesan: string;
  nidn?: string;
}
export interface SyaratDosenUjian {
  nidn: string;
  nama: string;
  peran: string;
  mode: 'blokir' | 'peringatan';
  pesan: string;
}

const JENIS: Array<{ value: JenisUjianTa; label: string }> = [
  { value: 'proposal', label: 'Ujian proposal' },
  { value: 'hasil', label: 'Seminar hasil' },
  { value: 'skripsi', label: 'Sidang skripsi' },
];

/** Pesan galat dari server (409/422/403 memuat penjelasan yang berguna). */
function pesan(e: unknown): string {
  const x = e as { status?: number; message?: string } | null;
  if (x?.status && x.status >= 500) return 'Server SIAKAD sedang bermasalah. Coba lagi beberapa saat.';
  return x?.message || 'Terjadi kesalahan.';
}

const tglPanjang = (t: string | null | undefined) =>
  t ? new Date(`${t.slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-';
const tglPendek = (t: string | null | undefined) => (t ? new Date(`${t.slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');

const WARNA_STATUS: Record<string, 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'primary'> = {
  permohonan: 'warning',
  dikembalikan: 'danger',
  layak: 'info',
  draf: 'neutral',
  diajukan: 'warning',
  ditetapkan: 'primary',
  terlaksana: 'info',
  selesai: 'success',
  ditunda: 'warning',
  dibatalkan: 'danger',
};

/** Petugas terakhir yang memproses (dari `pemeriksa`), untuk keterangan kecil di daftar petugas. */
function PetugasPemeriksa({ pemeriksa }: { pemeriksa?: TahapPemeriksa[] | null }) {
  const t = [...(pemeriksa ?? [])].reverse().find((x) => x.diproses_oleh && (x.status === 'selesai' || x.status === 'ditolak'));
  if (!t) return null;
  return (
    <small className="u-ta-redup" style={{ display: 'block' }} title={teksAlurPemeriksa(pemeriksa)}>
      {t.status === 'ditolak' ? 'Ditolak' : 'Diproses'} {t.diproses_oleh}
    </small>
  );
}

export function LencanaStatusUjianTa({ u }: { u: Pick<UjianTa, 'status' | 'status_label'> }) {
  return (
    <Badge variant={WARNA_STATUS[u.status] ?? 'neutral'} dot>
      {u.status_label}
    </Badge>
  );
}

async function bukaBerkas(siakad: ReturnType<typeof useSiakad>, path: string, nama: string, unduh = false) {
  const r = await siakad.request<unknown>({ method: 'GET', path, query: unduh ? { unduh: '1' } : {} });
  const d = r.data as { blob?: () => Blob } | Blob | null;
  const blob = d instanceof Blob ? d : d && typeof d === 'object' && typeof d.blob === 'function' ? d.blob() : null;
  if (!blob) throw new Error('Berkas tidak dapat dibuka.');
  const url = URL.createObjectURL(blob);
  if (unduh) {
    const a = document.createElement('a');
    a.href = url;
    a.download = nama;
    a.click();
  } else window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ================================================================ Syarat per unit
const IKON_SYARAT: Record<StatusSyarat, React.ReactNode> = {
  ok: <CircleCheck aria-hidden />,
  gagal: <CircleX aria-hidden />,
  menunggu: <Hourglass aria-hidden />,
  peringatan: <TriangleAlert aria-hidden />,
};
const LABEL_SYARAT: Record<StatusSyarat, string> = { ok: 'Terpenuhi', gagal: 'Belum', menunggu: 'Menunggu verifikasi', peringatan: 'Perhatian' };

/** Ringkas: satu lencana per unit (untuk tabel). */
export function RingkasSyaratUnit({ kelayakan }: { kelayakan: KelayakanUjianTa }) {
  return (
    <span className="u-ujta-unit-ringkas">
      {kelayakan.unit.map((u) => (
        <span key={u.unit} className="u-ujta-unit-chip" data-status={u.status} title={u.syarat.filter((s) => s.status !== 'ok').map((s) => s.pesan).join(' ') || 'Semua terpenuhi'}>
          {IKON_SYARAT[u.status]}
          {u.nama}
        </span>
      ))}
    </span>
  );
}

/** Syarat ujian dikelompokkan per unit pemilik aturan, dengan tindakan (kirim bukti, cek plagiasi, bayar). */
export function SyaratUjianPerUnit({ kelayakan, onTindakan }: { kelayakan: KelayakanUjianTa; onTindakan?: (t: TindakanSyarat) => void }) {
  return (
    <div className="u-ujta-syarat">
      <div className="u-ujta-syarat-kepala" data-layak={kelayakan.layak ? '' : undefined}>
        {kelayakan.layak ? <CircleCheck aria-hidden /> : <CircleX aria-hidden />}
        <strong>{kelayakan.layak ? 'Memenuhi syarat' : 'Belum memenuhi syarat'}</strong>
        {kelayakan.jumlah_peringatan > 0 && <span className="u-ta-redup">{kelayakan.jumlah_peringatan} perhatian</span>}
      </div>
      <ul className="u-ujta-unit">
        {kelayakan.unit.map((u) => (
          <li key={u.unit} data-status={u.status}>
            <div className="u-ujta-unit-nama">
              {IKON_SYARAT[u.status]}
              <strong>{u.nama}</strong>
              <span className="u-ta-redup">{LABEL_SYARAT[u.status]}</span>
            </div>
            <ul className="u-ujta-syarat-daftar">
              {u.syarat.map((s, i) => (
                <li key={s.aturan_id ?? i} data-status={s.status}>
                  {IKON_SYARAT[s.status]}
                  <div>
                    <span>{s.nama}</span>
                    {s.pesan && s.status !== 'ok' && <span className="u-ujta-pesan">{s.pesan}</span>}
                    {s.plagiasi && s.status === 'ok' && (
                      <span className="u-ta-redup">
                        Similarity {s.plagiasi.skor}% ({s.plagiasi.alat}), berlaku sampai {tglPendek(s.plagiasi.berlaku_sampai)}
                      </span>
                    )}
                  </div>
                  {s.tindakan && onTindakan && (
                    <Button size="xs" variant="outline" onClick={() => onTindakan(s.tindakan!)}>
                      {s.tindakan.jenis === 'cek_plagiasi' ? <FileSearch /> : <Upload />} {s.tindakan.label}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ================================================================ Bukti syarat (mahasiswa)
interface BuktiSaya {
  aturan: { id: string; nama: string; unit_pemilik_nama: string };
  pemenuhan: { cara: string; label?: string; petunjuk?: string | null; format?: string[]; maks_mb?: number; isian?: Array<{ kode: string; label: string; tipe: string; wajib: boolean }>; ceklis?: string[] };
  unit_validasi: string;
  status: string;
  bukti: { id: string; status_label: string; alasan: string | null; berlaku_sampai: string | null; pemeriksa?: TahapPemeriksa[] } | null;
}

/** Dialog kirim bukti syarat (unggah berkas, isian, ceklis) untuk satu aturan. */
export function KirimBuktiSyarat({ aturanId, open, onOpenChange }: { aturanId: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useSiakadQuery<BuktiSaya[]>(['bukti', 'saya'], (s, signal) => s.request<BuktiSaya[]>({ method: 'GET', path: '/v1/bukti-syarat/saya' }, { signal }), { enabled: open });
  const b = q.data?.find((x) => x.aturan.id === aturanId);
  const unggah = useUnggahBerkas({ kategori: 'dokumen', modul: 'bukti_syarat', keterangan: b?.pemenuhan.label ?? 'Bukti syarat' });
  const [file, setFile] = React.useState<File | null>(null);
  const [isian, setIsian] = React.useState<Record<string, string>>({});
  const [centang, setCentang] = React.useState<boolean[]>([]);
  const [kirim, setKirim] = React.useState(false);
  const m = b?.pemenuhan;
  const perluBerkas = m?.cara === 'unggah' || m?.cara === 'gabungan';
  const simpan = async () => {
    if (!b) return;
    setKirim(true);
    try {
      let berkas_id: string | undefined;
      if (perluBerkas) {
        if (!file) throw new Error('Pilih berkas lebih dulu.');
        berkas_id = (await unggah(file)).id;
      }
      await siakad.request({ method: 'POST', path: '/v1/bukti-syarat', body: { aturan_id: b.aturan.id, berkas_id, isian, ceklis: centang } });
      toast.add({ title: 'Bukti terkirim', description: `Menunggu validasi ${b.unit_validasi}.`, type: 'success' });
      invalidateSiakad('bukti');
      invalidateSiakad('ujian-ta');
      onOpenChange(false);
    } catch (e) {
      toast.add({ title: 'Bukti belum terkirim', description: pesan(e), type: 'error' });
    } finally {
      setKirim(false);
    }
  };
  return (
    <Dialog
      side="right"
      open={open}
      onOpenChange={onOpenChange}
      title={m?.label ?? 'Kirim bukti syarat'}
      description={b ? `Divalidasi ${b.unit_validasi}. ${b.aturan.nama}.` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={() => void simpan()} loading={kirim} disabled={!b}>
            <Send /> Kirim bukti
          </Button>
        </>
      }
    >
      {!b ? (
        <p className="u-ta-redup">{q.loading ? 'Memuat…' : 'Syarat ini tidak memerlukan bukti.'}</p>
      ) : (
        <div className="u-ujta-form">
          {b.bukti?.alasan && (
            <Alert variant="danger" title="Bukti sebelumnya ditolak">
              {b.bukti.alasan}
            </Alert>
          )}
          {b.bukti?.pemeriksa?.length ? <AlurPemeriksa pemeriksa={b.bukti.pemeriksa} ringkas judul="Pemeriksa bukti terakhir" /> : null}
          {m?.petunjuk && <p className="u-ta-redup">{m.petunjuk}</p>}
          {perluBerkas && (
            <Field label="Berkas" required description={`Format ${(m?.format ?? ['pdf']).join(', ')}, paling besar ${m?.maks_mb ?? 5} MB.`}>
              <IsianBerkas value={file} onValueChange={setFile} accept={(m?.format ?? ['pdf']).map((f) => `.${f}`).join(',')} maxSize={(m?.maks_mb ?? 5) * 1024 * 1024} info={false} />
            </Field>
          )}
          {(m?.isian ?? []).map((f) => (
            <Field key={f.kode} label={f.label} required={f.wajib} optional={!f.wajib}>
              <Input type={f.tipe === 'angka' ? 'number' : f.tipe === 'tanggal' ? 'date' : f.tipe === 'tautan' ? 'url' : 'text'} value={isian[f.kode] ?? ''} onChange={(e) => setIsian((o) => ({ ...o, [f.kode]: e.target.value }))} />
            </Field>
          ))}
          {(m?.ceklis ?? []).map((c, i) => (
            <label key={i} className="u-ujta-centang">
              <Checkbox checked={Boolean(centang[i])} onCheckedChange={(c) => setCentang((o) => Object.assign([...o], { [i]: c }))} /> {c}
            </label>
          ))}
        </div>
      )}
    </Dialog>
  );
}

// ================================================================ Cek plagiasi (mahasiswa)
interface KebijakanPlagiasi {
  jenis_naskah: string;
  jenis_label: string;
  batas: number | null;
  unit_pemeriksa_nama: string;
  berlaku_bulan: number;
  cek_gratis: number;
  cek_maks: number;
  sla_hari: number;
  format: string[];
  maks_mb: number;
  setuju_pembimbing: boolean;
  pengecualian: string | null;
  sudah_cek: number;
  sisa: number;
  aturan: unknown[];
  hasil_berlaku: { skor: number; memenuhi: boolean; berlaku_sampai: string | null } | null;
}
export interface CekPlagiasi {
  id: string;
  nim: string;
  nama?: string | null;
  nama_prodi?: string | null;
  jenis_naskah: string;
  jenis_label: string;
  judul: string;
  percobaan_ke: number;
  berbayar: boolean;
  status: string;
  status_label: string;
  skor: number | null;
  batas: number | null;
  memenuhi: boolean | null;
  alat: string | null;
  catatan: string | null;
  unit_pemeriksa_nama: string;
  naskah: { nama: string | null; url: string };
  laporan: { nama: string | null; url: string } | null;
  berlaku_sampai: string | null;
  sla_tenggat: string | null;
  lewat_sla: boolean;
  diajukan_at: string;
  pengecualian?: string | null;
  /** Alur pemeriksa (docs/PEMERIKSA.md SIAKAD): pembimbing (bila diwajibkan) lalu unit pemeriksa. */
  pemeriksa?: TahapPemeriksa[];
}

/** Layanan cek plagiasi untuk mahasiswa: kebijakan dari aturan, unggah naskah, status, laporan hasil. */
export function CekPlagiasiSaya({ jenisAwal }: { jenisAwal?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useSiakadQuery<{ kebijakan: KebijakanPlagiasi[]; pengajuan: CekPlagiasi[] }>(['plagiasi', 'saya'], (s, signal) => s.request({ method: 'GET', path: '/v1/plagiasi/saya' }, { signal }));
  useSaatInvalidasi('plagiasi', q.refetch);
  const [jenis, setJenis] = React.useState(jenisAwal ?? 'proposal');
  const [file, setFile] = React.useState<File | null>(null);
  const [kirim, setKirim] = React.useState(false);
  const unggah = useUnggahBerkas({ kategori: 'dokumen', modul: 'plagiasi', keterangan: `Naskah cek plagiasi ${jenis}` });
  const k = q.data?.kebijakan.find((x) => x.jenis_naskah === jenis);
  const ajukan = async () => {
    if (!file) return;
    setKirim(true);
    try {
      const b = await unggah(file);
      await siakad.request({ method: 'POST', path: '/v1/plagiasi', body: { jenis_naskah: jenis, berkas_id: b.id } });
      toast.add({ title: 'Naskah terkirim', description: `Masuk antrean ${k?.unit_pemeriksa_nama ?? 'pemeriksa'}.`, type: 'success' });
      setFile(null);
      invalidateSiakad('plagiasi');
      invalidateSiakad('ujian-ta');
    } catch (e) {
      toast.add({ title: 'Naskah belum terkirim', description: pesan(e), type: 'error' });
    } finally {
      setKirim(false);
    }
  };
  const kolom: DataColumn<CekPlagiasi>[] = [
    { key: 'jenis_label', header: 'Naskah', cell: (r) => `${r.jenis_label} · cek ke-${r.percobaan_ke}` },
    {
      key: 'status',
      header: 'Status',
      cell: (r) =>
        tahapAktif(r.pemeriksa) || r.status === 'ditolak_pembimbing' ? (
          <LabelPemeriksa pemeriksa={r.pemeriksa} />
        ) : (
          <>
            <Badge variant={r.status === 'selesai' ? (r.memenuhi === false ? 'danger' : 'success') : r.status === 'perlu_revisi' ? 'warning' : 'neutral'}>{r.status_label}</Badge>
            <PetugasPemeriksa pemeriksa={r.pemeriksa} />
          </>
        ),
    },
    { key: 'skor', header: 'Similarity', cell: (r) => (r.skor == null ? '-' : `${r.skor}%${r.batas != null ? ` (batas ${r.batas}%)` : ''}`) },
    { key: 'catatan', header: 'Catatan pemeriksa', cell: (r) => r.catatan ?? '-' },
    {
      key: 'laporan',
      header: '',
      shrink: true,
      cell: (r) =>
        r.laporan ? (
          <Button size="xs" variant="outline" onClick={() => void bukaBerkas(siakad, `/v1/plagiasi/${r.id}/laporan`, r.laporan?.nama ?? 'laporan.pdf').catch((e) => toast.add({ title: 'Gagal membuka', description: pesan(e), type: 'error' }))}>
            <Download /> Laporan
          </Button>
        ) : null,
    },
  ];
  return (
    <Card className="u-ta-kartu">
      <h3 className="u-ta-judul-kartu">
        <FileSearch aria-hidden /> Cek plagiasi
      </h3>
      <SegmentedControl options={(q.data?.kebijakan ?? []).filter((x) => ['proposal', 'hasil', 'skripsi'].includes(x.jenis_naskah)).map((x) => ({ value: x.jenis_naskah, label: x.jenis_label }))} value={jenis} onValueChange={setJenis} />
      {k && (
        <DescriptionList
          items={[
            { label: 'Batas similarity', value: k.batas == null ? 'Belum diatur' : `paling tinggi ${k.batas}%` },
            { label: 'Pemeriksa', value: `${k.unit_pemeriksa_nama}, selesai paling lama ${k.sla_hari} hari kerja` },
            { label: 'Kuota', value: `${k.sudah_cek} dari ${k.cek_maks} kali (gratis ${k.cek_gratis})` },
            { label: 'Hasil berlaku', value: k.hasil_berlaku ? `${k.hasil_berlaku.skor}% sampai ${tglPendek(k.hasil_berlaku.berlaku_sampai)}` : `Belum ada (berlaku ${k.berlaku_bulan} bulan)` },
          ]}
        />
      )}
      {k?.pengecualian && <p className="u-ta-redup">{k.pengecualian}</p>}
      <div className="u-ujta-unggah">
        <IsianBerkas value={file} onValueChange={setFile} accept={(k?.format ?? ['pdf']).map((f) => `.${f}`).join(',')} label="Pilih naskah" aria-label="Naskah" />
        <Button onClick={() => void ajukan()} loading={kirim} disabled={!file || (k ? k.sisa < 1 : false)}>
          <Upload /> Ajukan cek {k?.jenis_label.toLowerCase() ?? ''}
        </Button>
      </div>
      <DataTable columns={kolom} rows={q.data?.pengajuan} rowKey={(r) => r.id} loading={q.loading} pagination={false} empty={{ title: 'Belum ada pengajuan cek plagiasi' }} />
    </Card>
  );
}

// ================================================================ Mahasiswa
interface UjianSayaMhs {
  peran: 'mahasiswa';
  alur_mahasiswa: boolean;
  jenis: Array<{ jenis: JenisUjianTa; label: string; ujian: UjianTa | null; boleh_ajukan: boolean; kelayakan: KelayakanUjianTa }>;
}

export function useUjianTaSaya<T = UjianSayaMhs>() {
  const q = useSiakadQuery<T>(['ujian-ta', 'saya'], (s, signal) => s.request<T>({ method: 'GET', path: `${P}/saya` }, { signal }), { staleTime: 5_000 });
  useSaatInvalidasi('ujian-ta', q.refetch);
  return q;
}

/** Kartu jadwal ujian (tanggal, jam, tempat, tim, SK). */
export function KartuJadwalUjianTa({ u, aksi }: { u: UjianTa; aksi?: React.ReactNode }) {
  return (
    <Card className="u-ta-kartu u-ujta-jadwal">
      <div className="u-ujta-jadwal-kepala">
        <div>
          <strong>{u.jenis_label}</strong>
          <span className="u-ta-redup">
            {u.nim} {u.nama}
          </span>
        </div>
        <LencanaStatusUjianTa u={u} />
      </div>
      {u.judul && <p className="u-ujta-judul">{u.judul}</p>}
      {u.tanggal && (
        <ul className="u-ujta-fakta">
          <li>
            <CalendarDays aria-hidden /> {tglPanjang(u.tanggal)}
          </li>
          <li>
            <Clock aria-hidden /> {u.mulai}–{u.selesai} WITA
          </li>
          <li>
            {u.daring ? <Video aria-hidden /> : <MapPin aria-hidden />} {u.daring ? 'Daring' : (u.ruang?.nama ?? u.ruang?.kode)}
            {u.daring && u.tautan && (
              <a href={u.tautan} target="_blank" rel="noreferrer">
                Buka tautan
              </a>
            )}
          </li>
          {u.sk && (
            <li>
              <FileText aria-hidden /> SK Dekan {u.sk.nomor}
            </li>
          )}
        </ul>
      )}
      {u.tim.length > 0 && (
        <ul className="u-ujta-tim">
          {u.tim.map((t) => (
            <li key={`${t.peran}-${t.nidn}`}>
              <span className="u-ta-redup">{t.peran_label}</span>
              <span>{t.nama}</span>
            </li>
          ))}
        </ul>
      )}
      {u.keputusan_label && (
        <Alert variant={u.keputusan === 'ulang' ? 'danger' : u.keputusan === 'revisi' ? 'warning' : 'success'} title={`${u.keputusan_label}${u.nilai_akhir != null ? ` · nilai ${u.nilai_akhir} (${u.huruf})` : ''}`}>
          {u.catatan_revisi && (
            <>
              Revisi: {u.catatan_revisi} Paling lambat {tglPendek(u.batas_revisi)}.{u.revisi_selesai_at ? ' Revisi sudah dinyatakan selesai.' : ''}
            </>
          )}
        </Alert>
      )}
      {u.alasan && <p className="u-ta-redup">Alasan {u.status === 'ditunda' ? 'ditunda' : 'dibatalkan'}: {u.alasan}</p>}
      {u.catatan_pembimbing && <p className="u-ta-redup">Catatan pembimbing: {u.catatan_pembimbing}</p>}
      {u.catatan_dekan && u.status === 'draf' && <p className="u-ta-redup">Catatan Dekan: {u.catatan_dekan}</p>}
      {u.pemeriksa && u.pemeriksa.length > 0 && <AlurPemeriksa pemeriksa={u.pemeriksa} ringkas judul="Alur pemeriksaan" />}
      {aksi}
    </Card>
  );
}

/** Halaman mahasiswa: syarat per unit tiap jenis ujian, ajukan siap ujian, jadwal, hasil, cek plagiasi. */
export function UjianTaSaya() {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useUjianTaSaya<UjianSayaMhs>();
  const [bukti, setBukti] = React.useState<string | null>(null);
  const [plagiasi, setPlagiasi] = React.useState<string | null>(null);
  const [catatan, setCatatan] = React.useState('');
  const tindakan = (t: TindakanSyarat) => {
    if (t.jenis === 'kirim_bukti' && t.aturan_id) setBukti(t.aturan_id);
    else if (t.jenis === 'cek_plagiasi') setPlagiasi(t.jenis_naskah ?? 'proposal');
    else toast.add({ title: 'Pembayaran', description: 'Lunasi tagihan di BAUK/keuangan atau lewat kanal pembayaran resmi, lalu muat ulang halaman ini.', type: 'info' });
  };
  const ajukan = async (jenis: JenisUjianTa) => {
    try {
      await siakad.request({ method: 'POST', path: `${P}/ajukan`, body: { jenis, catatan: catatan || undefined } });
      toast.add({ title: 'Pengajuan terkirim', description: 'Menunggu persetujuan pembimbing.', type: 'success' });
      setCatatan('');
      invalidateSiakad('ujian-ta');
    } catch (e) {
      toast.add({ title: 'Belum bisa mengajukan', description: pesan(e), type: 'error' });
    }
  };
  if (q.loading && !q.data) return <p className="u-ta-redup">Memuat…</p>;
  if (q.error) return <Alert variant="danger" title="Data ujian belum bisa dimuat">{pesan(q.error)}</Alert>;
  const d = q.data;
  if (!d || d.peran !== 'mahasiswa') return <Empty title="Halaman ini untuk mahasiswa" />;
  return (
    <div className="u-ta">
      <Tabs
        items={d.jenis.map((j) => ({
          value: j.jenis,
          label: j.label,
          content: (
            <div className="u-ta">
              {j.ujian && j.ujian.status !== 'dibatalkan' && (
                <KartuJadwalUjianTa
                  u={j.ujian}
                  aksi={
                    j.ujian.hak.dokumen ? (
                      <div className="u-ujta-aksi">
                        <Button size="sm" variant="outline" onClick={() => void bukaBerkas(siakad, `${P}/${j.ujian!.id}/dokumen/undangan`, 'undangan.pdf').catch((e) => toast.add({ title: 'Gagal', description: pesan(e), type: 'error' }))}>
                          <Download /> Undangan
                        </Button>
                      </div>
                    ) : null
                  }
                />
              )}
              <Card className="u-ta-kartu">
                <h3 className="u-ta-judul-kartu">
                  <ClipboardCheck aria-hidden /> Syarat {j.label.toLowerCase()}
                </h3>
                <SyaratUjianPerUnit kelayakan={j.kelayakan} onTindakan={tindakan} />
                {j.boleh_ajukan && (
                  <div className="u-ujta-form">
                    <Field label="Catatan untuk pembimbing" optional>
                      <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
                    </Field>
                    <div className="u-ujta-aksi">
                      <ConfirmDialog
                        trigger={
                          <Button disabled={!j.kelayakan.layak}>
                            <Send /> Ajukan siap {j.label.toLowerCase()}
                          </Button>
                        }
                        title={`Ajukan ${j.label.toLowerCase()}?`}
                        description="Pembimbing akan menilai kelayakan, lalu prodi menjadwalkan dan Dekan menetapkan dengan SK."
                        confirmLabel="Ajukan"
                        onConfirm={() => ajukan(j.jenis)}
                      />
                    </div>
                  </div>
                )}
                {!d.alur_mahasiswa && <p className="u-ta-redup">Pengajuan ujian di prodi Anda dilakukan oleh operator prodi.</p>}
              </Card>
            </div>
          ),
        }))}
      />
      <Dialog open={plagiasi !== null} onOpenChange={(o) => !o && setPlagiasi(null)} title="Cek plagiasi" size="lg">
        {plagiasi && <CekPlagiasiSaya jenisAwal={plagiasi} />}
      </Dialog>
      <KirimBuktiSyarat aturanId={bukti} open={bukti !== null} onOpenChange={(o) => !o && setBukti(null)} />
    </div>
  );
}

// ================================================================ Detail ujian (semua peran)
function useUjian(id: string | null) {
  const q = useSiakadQuery<UjianTa>(['ujian-ta', 'detail', id ?? ''], (s, signal) => s.request<UjianTa>({ method: 'GET', path: `${P}/${enc(id ?? '')}` }, { signal }), { enabled: Boolean(id), staleTime: 2_000 });
  useSaatInvalidasi('ujian-ta', q.refetch);
  return q;
}

function NilaiDialog({ u, open, onOpenChange }: { u: UjianTa; open: boolean; onOpenChange: (o: boolean) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const rubrik = u.pengaturan?.rubrik ?? [];
  const [r, setR] = React.useState<Record<string, string>>({});
  const [catatan, setCatatan] = React.useState('');
  const total = rubrik.reduce((a, b) => a + (Number(r[b.kode] ?? 0) * b.bobot) / 100, 0);
  const simpan = async () => {
    try {
      await siakad.request({ method: 'POST', path: `${P}/${u.id}/nilai`, body: { rubrik: Object.fromEntries(rubrik.map((b) => [b.kode, Number(r[b.kode] ?? 0)])), catatan: catatan || undefined } });
      toast.add({ title: 'Nilai tersimpan', type: 'success' });
      invalidateSiakad('ujian-ta');
      onOpenChange(false);
    } catch (e) {
      toast.add({ title: 'Nilai belum tersimpan', description: pesan(e), type: 'error' });
    }
  };
  return (
    <Dialog side="right" open={open} onOpenChange={onOpenChange} title={`Nilai ${u.jenis_label.toLowerCase()}`} description={`${u.nim} ${u.nama ?? ''}`} footer={<Button onClick={() => void simpan()}>Simpan nilai</Button>}>
      <div className="u-ujta-form">
        {rubrik.map((b) => (
          <Field key={b.kode} label={`${b.label} (${b.bobot}%)`} required>
            <IsianAngka value={keAngka(r[b.kode])} min={0} max={100} onValueChange={(n) => setR((o) => ({ ...o, [b.kode]: teksAngka(n) }))} />
          </Field>
        ))}
        <p>
          Nilai Anda: <strong>{total.toFixed(2)}</strong>
        </p>
        <Field label="Catatan/masukan" optional>
          <Textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}

function PutuskanDialog({ u, open, onOpenChange }: { u: UjianTa; open: boolean; onOpenChange: (o: boolean) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [k, setK] = React.useState<'lanjut' | 'revisi' | 'ulang'>('revisi');
  const [cat, setCat] = React.useState('');
  const [batas, setBatas] = React.useState('');
  const simpan = async () => {
    try {
      await siakad.request({ method: 'POST', path: `${P}/${u.id}/putuskan`, body: { keputusan: k, catatan_revisi: cat || undefined, batas_revisi: batas || undefined } });
      toast.add({ title: 'Keputusan tersimpan', description: 'Mahasiswa dan pembimbing diberi notifikasi.', type: 'success' });
      invalidateSiakad('ujian-ta');
      onOpenChange(false);
    } catch (e) {
      toast.add({ title: 'Keputusan belum tersimpan', description: pesan(e), type: 'error' });
    }
  };
  return (
    <Dialog side="right" open={open} onOpenChange={onOpenChange} title="Keputusan sidang" footer={<Button onClick={() => void simpan()}>Simpan keputusan</Button>}>
      <div className="u-ujta-form">
        <SegmentedControl
          options={[
            { value: 'lanjut', label: 'Layak lanjut' },
            { value: 'revisi', label: 'Dengan revisi' },
            { value: 'ulang', label: 'Ulang' },
          ]}
          value={k}
          onValueChange={(v) => setK(v as typeof k)}
        />
        {k === 'revisi' && (
          <>
            <Field label="Revisi yang harus dikerjakan" required>
              <Textarea rows={4} value={cat} onChange={(e) => setCat(e.target.value)} />
            </Field>
            <Field label="Batas revisi" optional description="Kosong = sesuai pengaturan prodi.">
              <IsianTanggal value={batas} onValueChange={(v) => setBatas(v)} />
            </Field>
          </>
        )}
      </div>
    </Dialog>
  );
}

/** Panel detail satu ujian dengan aksi sesuai hak pengguna. */
export function DetailUjianTa({ id, open, onOpenChange, onJadwal }: { id: string | null; open: boolean; onOpenChange: (o: boolean) => void; onJadwal?: (u: UjianTa) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useUjian(open ? id : null);
  const u = q.data;
  const [nilai, setNilai] = React.useState(false);
  const [putus, setPutus] = React.useState(false);
  const [alasan, setAlasan] = React.useState('');
  const aksi = async (path: string, body: Record<string, unknown>, judul: string) => {
    try {
      await siakad.request({ method: 'POST', path: `${P}/${path}`, body });
      toast.add({ title: judul, type: 'success' });
      invalidateSiakad('ujian-ta');
    } catch (e) {
      toast.add({ title: 'Belum berhasil', description: pesan(e), type: 'error' });
    }
  };
  const dok = (jenis: string) => u && void bukaBerkas(siakad, `${P}/${u.id}/dokumen/${jenis}`, `${jenis}-${u.nim}.pdf`).catch((e) => toast.add({ title: 'Dokumen belum bisa dibuka', description: pesan(e), type: 'error' }));
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={u ? `${u.jenis_label} · ${u.nim}` : 'Ujian'} description={u?.nama ?? undefined} size="lg">
      {!u ? (
        <p className="u-ta-redup">Memuat…</p>
      ) : (
        <div className="u-ta">
          <KartuJadwalUjianTa u={u} />
          {u.tim.some((t) => t.nilai != null || t.hadir != null) && (
            <DataTable
              pagination={false}
              rowKey={(t) => `${t.peran}-${t.nidn}`}
              rows={u.tim}
              columns={[
                { key: 'peran_label', header: 'Tugas' },
                { key: 'nama', header: 'Nama' },
                { key: 'hadir', header: 'Hadir', cell: (t) => (t.hadir == null ? '-' : t.hadir ? 'Ya' : 'Tidak') },
                { key: 'nilai', header: 'Nilai', cell: (t) => (t.menilai ? (t.nilai ?? 'Belum') : '-') },
              ]}
            />
          )}
          <div className="u-ujta-aksi">
            {u.hak.setuju_pembimbing && (
              <>
                <Button onClick={() => void aksi(`${u.id}/pembimbing`, { keputusan: 'setuju' }, 'Disetujui: layak uji')}>
                  <CircleCheck /> Layak uji
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="outline">
                      <Undo2 /> Kembalikan
                    </Button>
                  }
                  title="Kembalikan permohonan"
                  description={<Textarea rows={3} placeholder="Yang perlu dipenuhi mahasiswa" value={alasan} onChange={(e) => setAlasan(e.target.value)} />}
                  confirmLabel="Kembalikan"
                  tone="warning"
                  onConfirm={() => aksi(`${u.id}/pembimbing`, { keputusan: 'kembalikan', catatan: alasan }, 'Permohonan dikembalikan')}
                />
              </>
            )}
            {u.hak.jadwal && onJadwal && (
              <Button onClick={() => onJadwal(u)}>
                <CalendarClock /> {u.tanggal ? 'Ubah jadwal' : 'Susun jadwal'}
              </Button>
            )}
            {u.hak.ajukan && (
              <Button variant="outline" onClick={() => void aksi('ajukan-penetapan', { ids: [u.id] }, 'Diajukan ke Dekan')}>
                <Send /> Ajukan ke Dekan
              </Button>
            )}
            {u.hak.hadir && (
              <Button
                variant="outline"
                onClick={() => void aksi(`${u.id}/hadir`, { mahasiswa_hadir: true, hadir: Object.fromEntries(u.tim.map((t) => [t.nidn, t.hadir ?? true])) }, 'Kehadiran tercatat')}
              >
                <Users /> Catat hadir semua
              </Button>
            )}
            {u.hak.nilai && (
              <Button onClick={() => setNilai(true)}>
                <ClipboardCheck /> Isi nilai
              </Button>
            )}
            {u.hak.putuskan && (
              <Button onClick={() => setPutus(true)}>
                <Gavel /> Keputusan
              </Button>
            )}
            {u.hak.revisi_selesai && (
              <Button variant="outline" onClick={() => void aksi(`${u.id}/revisi-selesai`, {}, 'Revisi dinyatakan selesai')}>
                <CircleCheck /> Revisi selesai
              </Button>
            )}
            {u.hak.dokumen && (
              <>
                <Button variant="ghost" onClick={() => dok('undangan')}>
                  <Download /> Undangan
                </Button>
                <Button variant="ghost" onClick={() => dok('berita-acara')}>
                  <Download /> Berita acara
                </Button>
              </>
            )}
            {(u.hak.tunda || u.hak.batal) && (
              <ConfirmDialog
                trigger={
                  <Button variant="destructive-soft">
                    <CircleX /> {u.hak.tunda ? 'Tunda/batalkan' : 'Batalkan'}
                  </Button>
                }
                title="Hentikan ujian"
                description={<Textarea rows={3} placeholder="Alasan (dikirim ke mahasiswa dan tim)" value={alasan} onChange={(e) => setAlasan(e.target.value)} />}
                confirmLabel={u.hak.tunda ? 'Tunda' : 'Batalkan'}
                tone="danger"
                onConfirm={() => aksi(`${u.id}/${u.hak.tunda ? 'tunda' : 'batal'}`, { alasan }, u.hak.tunda ? 'Ujian ditunda' : 'Ujian dibatalkan')}
              />
            )}
          </div>
          {u.riwayat && u.riwayat.length > 0 && (
            <details className="u-ujta-riwayat">
              <summary>Riwayat ({u.riwayat.length})</summary>
              <ol>
                {u.riwayat.map((r, i) => (
                  <li key={i}>
                    <span className="u-ta-redup">{r.created_at.slice(0, 16)}</span> {r.aksi.replace(/_/g, ' ')}
                    {r.catatan ? `: ${r.catatan}` : ''} <span className="u-ta-redup">({r.oleh})</span>
                  </li>
                ))}
              </ol>
            </details>
          )}
          <NilaiDialog u={u} open={nilai} onOpenChange={setNilai} />
          <PutuskanDialog u={u} open={putus} onOpenChange={setPutus} />
        </div>
      )}
    </Sheet>
  );
}

// ================================================================ Form jadwal
interface Ruang {
  kode: string;
  nama: string;
  sumber?: 'sarpras' | 'ruang_kuliah';
  kapasitas?: number | null;
}

/** Susun jadwal dan tim: cek bentrok dan syarat dosen langsung, saran slot kosong. */
export function FormJadwalUjianTa({ u, open, onOpenChange }: { u: UjianTa | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const ruang = useSiakadQuery<Ruang[]>(['ujian-ta', 'ruang'], (s, signal) => s.request<Ruang[]>({ method: 'GET', path: `${P}/ruang` }, { signal }), { staleTime: 600_000, enabled: open });
  const [f, setF] = React.useState({ tanggal: '', mulai: '09:00', selesai: '10:30', ruang: '', daring: false, tautan: '', ketua: '', sekretaris: '', penguji: [] as string[], abaikan_kuliah: false });
  const [cek, setCek] = React.useState<{ bentrok: BentrokUjian[]; syarat_dosen: SyaratDosenUjian[]; boleh: boolean } | null>(null);
  const [saran, setSaran] = React.useState<Array<{ tanggal: string; mulai: string; selesai: string; ruang_kode: string; ruang_nama: string }> | null>(null);
  const [simpan, setSimpan] = React.useState(false);
  React.useEffect(() => {
    if (!u || !open) return;
    const ketua = u.tim.find((t) => t.peran === 'ketua')?.nidn ?? '';
    setF({
      tanggal: u.tanggal ?? '',
      mulai: u.mulai ?? '09:00',
      selesai: u.selesai ?? '10:30',
      ruang: u.ruang?.kode ?? '',
      daring: u.daring,
      tautan: u.tautan ?? '',
      ketua,
      sekretaris: u.tim.find((t) => t.peran === 'sekretaris')?.nidn ?? '',
      penguji: u.tim.filter((t) => t.peran === 'penguji').map((t) => t.nidn),
      abaikan_kuliah: false,
    });
    setCek(null);
    setSaran(null);
  }, [u, open]);
  const body = () => ({ ...f, sekretaris: f.sekretaris || undefined, penguji: f.penguji.filter(Boolean), ruang: f.daring ? undefined : f.ruang });
  const siap = Boolean(f.tanggal && f.mulai && f.selesai && f.ketua && (f.daring ? f.tautan : f.ruang));
  React.useEffect(() => {
    if (!u || !open || !siap) return;
    const t = setTimeout(() => {
      siakad
        .request<{ bentrok: BentrokUjian[]; syarat_dosen: SyaratDosenUjian[]; boleh: boolean }>({ method: 'POST', path: `${P}/${u.id}/periksa-jadwal`, body: body() })
        .then((r) => setCek(r.data))
        .catch(() => setCek(null));
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(f), u?.id, open]);
  const cariSaran = async () => {
    if (!u) return;
    try {
      const r = await siakad.request<typeof saran>({ method: 'POST', path: `${P}/${u.id}/saran`, body: { dosen: [f.ketua, f.sekretaris, ...f.penguji].filter(Boolean), dari: f.tanggal || undefined, hari: 10 } });
      setSaran(r.data ?? []);
    } catch (e) {
      toast.add({ title: 'Saran belum tersedia', description: pesan(e), type: 'error' });
    }
  };
  const kirim = async () => {
    if (!u) return;
    setSimpan(true);
    try {
      await siakad.request({ method: 'POST', path: `${P}/${u.id}/jadwal`, body: body() });
      toast.add({ title: 'Jadwal tersimpan (draf)', description: 'Ajukan ke Dekan untuk ditetapkan dengan SK.', type: 'success' });
      invalidateSiakad('ujian-ta');
      onOpenChange(false);
    } catch (e) {
      toast.add({ title: 'Jadwal belum tersimpan', description: pesan(e), type: 'error' });
    } finally {
      setSimpan(false);
    }
  };
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((o) => ({ ...o, [k]: v }));
  // Pemilih dosen bersyarat (aturan universitas + fakultas mahasiswa, /v1/aturan/calon-dosen?nim=): ketua = penguji_1,
  // penguji ke-n = penguji_(n+1). Syarat bergantung mahasiswa (bukan pembimbingnya, kuota) ikut tampil di pemilih.
  const titikPenguji = u?.jenis === 'proposal' ? 'ta.penguji.proposal.tetapkan' : 'ta.penguji.skripsi.tetapkan';
  const maks = u?.pengaturan?.maks_penguji ?? 3;
  const min = u?.pengaturan?.min_penguji ?? 2;
  const lunak = cek?.bentrok.filter((b) => !b.keras) ?? [];
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={u ? `Jadwal ${u.jenis_label.toLowerCase()}` : 'Jadwal'}
      description={u ? `${u.nim} ${u.nama ?? ''} · ${u.nama_prodi ?? ''}` : undefined}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={() => void kirim()} loading={simpan} disabled={!siap}>
            Simpan jadwal
          </Button>
        </>
      }
    >
      {u && (
        <div className="u-ujta-form">
          <Field label="Pembimbing (ikut otomatis)">
            <p>{u.pembimbing.map((p, i) => `${i === 0 ? 'I' : 'II'}. ${p.nama}`).join(' · ') || '-'}</p>
          </Field>
          <Field label="Ketua sidang (pimpinan sidang)" required>
            <PilihDosenBersyarat titik={titikPenguji} nim={u.nim} peran="penguji_1" value={f.ketua || null} onValueChange={(v) => set('ketua', v ?? '')} placeholder="Pilih ketua sidang" />
          </Field>
          {Array.from({ length: Math.max(min, f.penguji.length) }, (_, i) => (
            <Field key={i} label={`Penguji ${i + 1}`} required={i < min}>
              <PilihDosenBersyarat
                titik={titikPenguji}
                nim={u.nim}
                peran={`penguji_${Math.min(4, i + 2)}` as PeranPenetapanDosen}
                value={f.penguji[i] || null}
                onValueChange={(v) => set('penguji', Object.assign([...f.penguji], { [i]: v ?? '' }))}
                placeholder={`Pilih penguji ${i + 1}`}
              />
            </Field>
          ))}
          {f.penguji.length < maks && f.penguji.length >= min && (
            <Button variant="outline" size="sm" onClick={() => set('penguji', [...f.penguji, ''])}>
              <Plus /> Tambah penguji
            </Button>
          )}
          <Field label="Sekretaris" optional>
            <PilihEntitas jenis={SUMBER_DOSEN_TA} value={f.sekretaris || null} onValueChange={(v) => set('sekretaris', v ?? '')} />
          </Field>
          <div className="u-form-kisi" data-kolom="3">
            <Field label="Tanggal" required>
              <IsianTanggal value={f.tanggal} onValueChange={(v) => set('tanggal', v)} />
            </Field>
            <Field label="Mulai" required>
              <IsianJam value={f.mulai || null} onValueChange={(v) => set('mulai', v ?? '')} />
            </Field>
            <Field label="Selesai" required>
              <IsianJam value={f.selesai || null} onValueChange={(v) => set('selesai', v ?? '')} />
            </Field>
          </div>
          <label className="u-ujta-centang">
            <Switch size="sm" checked={f.daring} onCheckedChange={(c) => set('daring', c)} /> Daring
          </label>
          {f.daring ? (
            <Field label="Tautan rapat" required>
              <Input type="url" placeholder="https://" value={f.tautan} onChange={(e) => set('tautan', e.target.value)} />
            </Field>
          ) : (
            <Field label="Ruang" required>
              <Select options={(ruang.data ?? []).map((r) => ({ value: r.kode, label: r.nama, description: `${r.kode}${r.sumber === 'ruang_kuliah' ? ' · ruang kuliah lama (belum di Sarpras)' : ' · Sarpras'}${r.kapasitas ? ` · ${r.kapasitas} orang` : ''}` }))} value={f.ruang || null} onValueChange={(v) => set('ruang', v ?? '')} placeholder="Pilih ruang" />
            </Field>
          )}
          <div className="u-ujta-aksi">
            <Button variant="outline" size="sm" onClick={() => void cariSaran()} disabled={!f.ketua}>
              <Sparkles /> Saran jadwal kosong
            </Button>
          </div>
          {saran && (
            <ul className="u-ujta-saran">
              {saran.length === 0 && <li className="u-ta-redup">Tidak ada slot kosong bersama dalam 10 hari kerja.</li>}
              {saran.map((s) => (
                <li key={`${s.tanggal}${s.mulai}`}>
                  <Tekan onClick={() => setF((o) => ({ ...o, tanggal: s.tanggal, mulai: s.mulai, selesai: s.selesai, ruang: s.ruang_kode, daring: false }))}>
                    {tglPendek(s.tanggal)} {s.mulai}–{s.selesai} · {s.ruang_nama}
                  </Tekan>
                </li>
              ))}
            </ul>
          )}
          {cek && (
            <div className="u-ujta-cek">
              {cek.bentrok.length === 0 && cek.syarat_dosen.filter((s) => s.mode === 'blokir').length === 0 ? (
                <Alert variant="success" title="Tidak ada bentrok">
                  Dosen, mahasiswa, dan ruang kosong pada jam ini.
                </Alert>
              ) : null}
              {cek.bentrok.length > 0 && (
                <Alert variant={cek.bentrok.some((b) => b.keras) ? 'danger' : 'warning'} title="Bentrok jadwal">
                  <ul>
                    {cek.bentrok.map((b, i) => (
                      <li key={i}>{b.pesan}</li>
                    ))}
                  </ul>
                  {lunak.length > 0 && !cek.bentrok.some((b) => b.keras) && (
                    <label className="u-ujta-centang">
                      <Checkbox checked={f.abaikan_kuliah} onCheckedChange={(c) => set('abaikan_kuliah', c)} /> Sudah dikoordinasikan (kuliah diganti/ruang dilepas)
                    </label>
                  )}
                </Alert>
              )}
              {cek.syarat_dosen.length > 0 && (
                <Alert variant={cek.syarat_dosen.some((s) => s.mode === 'blokir') ? 'danger' : 'info'} title="Syarat dosen (aturan fakultas)">
                  <ul>
                    {[...cek.syarat_dosen].sort((a, b) => (a.mode === b.mode ? 0 : a.mode === 'blokir' ? -1 : 1)).map((s, i) => (
                      <li key={i} data-mode={s.mode}>
                        <strong>{s.nama}</strong>: {s.mode === 'blokir' ? <strong>{s.pesan}</strong> : s.pesan}
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

// ================================================================ Operator: kelayakan
interface BarisKelayakan {
  nim: string;
  nama: string;
  kode_prodi: string;
  nama_prodi: string | null;
  angkatan: string;
  judul: string | null;
  pembimbing: Array<{ nidn: string; nama: string }>;
  ujian: { id: string; status: string } | null;
  kelayakan: KelayakanUjianTa;
}

/** Daftar mahasiswa calon ujian beserta syarat per unit; buat ujian untuk yang layak. */
export function KelayakanUjianTa({ prodi, onBuka }: { prodi?: Array<{ value: string; label: string }>; onBuka?: (id: string) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [jenis, setJenis] = React.useState<JenisUjianTa>('proposal');
  const [fProdi, setProdi] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string>('semua');
  const [kata, setKata] = React.useState('');
  const [angkatan, setAngkatan] = React.useState('');
  const [hal, setHal] = React.useState(1);
  const q = useSiakadQuery<BarisKelayakan[]>(['ujian-ta', 'kelayakan', jenis, fProdi, status, kata, angkatan, hal], (s, signal) =>
    s.request<BarisKelayakan[]>({ method: 'GET', path: `${P}/kelayakan`, query: { jenis, prodi: fProdi ?? undefined, status: status === 'semua' ? undefined : status, q: kata || undefined, angkatan: angkatan || undefined, page: hal, per_page: 20 } }, { signal }),
  );
  useSaatInvalidasi('ujian-ta', q.refetch);
  const buat = async (r: BarisKelayakan) => {
    try {
      const x = await siakad.request<UjianTa>({ method: 'POST', path: P, body: { nim: r.nim, jenis } });
      toast.add({ title: 'Ujian dibuat', description: 'Lanjutkan dengan menyusun jadwal.', type: 'success' });
      invalidateSiakad('ujian-ta');
      if (x.data) onBuka?.(x.data.id);
    } catch (e) {
      toast.add({ title: 'Belum bisa dibuat', description: pesan(e), type: 'error' });
    }
  };
  const kolom: DataColumn<BarisKelayakan>[] = [
    {
      key: 'nim',
      header: 'Mahasiswa',
      cell: (r) => (
        <span className="u-ujta-sel-mhs">
          <strong>{r.nama}</strong>
          <span className="u-ta-redup">
            {r.nim} · {r.nama_prodi} · {r.angkatan}
          </span>
        </span>
      ),
    },
    { key: 'pembimbing', header: 'Pembimbing', cell: (r) => r.pembimbing.map((p) => p.nama).join(', ') || '-' },
    { key: 'layak', header: 'Kelayakan', shrink: true, cell: (r) => (r.kelayakan.layak ? <Badge variant="success">Layak</Badge> : <Badge variant="danger">Belum</Badge>) },
    {
      key: 'syarat',
      header: 'Syarat per unit',
      cell: (r) => (
        <div className="u-ujta-sel-syarat">
          <RingkasSyaratUnit kelayakan={r.kelayakan} />
          {r.kelayakan.alasan.length > 0 && <span className="u-ujta-pesan">{r.kelayakan.alasan.join(' ')}</span>}
        </div>
      ),
    },
    {
      key: 'aksi',
      header: '',
      shrink: true,
      cell: (r) =>
        r.ujian ? (
          <Button size="xs" variant="outline" onClick={() => onBuka?.(r.ujian!.id)}>
            {r.ujian.status === 'permohonan' ? 'Menunggu pembimbing' : 'Buka'}
          </Button>
        ) : r.kelayakan.layak ? (
          <Button size="xs" onClick={() => void buat(r)}>
            <Plus /> Buat ujian
          </Button>
        ) : null,
    },
  ];
  return (
    <div className="u-ta">
      <div className="u-ujta-saring">
        <SegmentedControl options={JENIS} value={jenis} onValueChange={(v) => setJenis(v as JenisUjianTa)} />
        {prodi && prodi.length > 1 && <Select options={prodi} value={fProdi} onValueChange={setProdi} placeholder="Semua prodi" />}
        <Select
          options={[
            { value: 'semua', label: 'Semua' },
            { value: 'layak', label: 'Layak' },
            { value: 'belum', label: 'Belum layak' },
          ]}
          value={status}
          onValueChange={(v) => setStatus(v ?? 'semua')}
        />
        <Input placeholder="Angkatan" value={angkatan} onChange={(e) => setAngkatan(e.target.value.replace(/\D/g, '').slice(0, 4))} className="u-ujta-angkatan" />
        <Input placeholder="Cari NIM atau nama" value={kata} onChange={(e) => setKata(e.target.value)} />
      </div>
      <DataTable
        columns={kolom}
        rows={q.data}
        rowKey={(r) => r.nim}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
        page={hal}
        perPage={20}
        total={q.meta?.total ?? undefined}
        onPageChange={setHal}
        empty={{ title: 'Belum ada mahasiswa calon ujian', description: 'Mahasiswa aktif dengan judul yang sudah diterima akan muncul di sini.' }}
      />
    </div>
  );
}

// ================================================================ Operator: daftar & penjadwalan
const GRUP_STATUS: Array<{ value: string; label: string; status: string }> = [
  { value: 'perlu', label: 'Perlu dijadwalkan', status: 'layak,ditunda,permohonan' },
  { value: 'draf', label: 'Draf', status: 'draf' },
  { value: 'diajukan', label: 'Menunggu Dekan', status: 'diajukan' },
  { value: 'ditetapkan', label: 'Ditetapkan', status: 'ditetapkan,terlaksana' },
  { value: 'selesai', label: 'Selesai', status: 'selesai' },
  { value: 'batal', label: 'Dibatalkan', status: 'dibatalkan,dikembalikan' },
];

function kolomUjian(onBuka: (u: UjianTa) => void): DataColumn<UjianTa>[] {
  return [
    {
      key: 'nim',
      header: 'Mahasiswa',
      cell: (u) => (
        <span className="u-ujta-sel-mhs">
          <strong>{u.nama}</strong>
          <span className="u-ta-redup">
            {u.nim} · {u.nama_prodi}
          </span>
        </span>
      ),
    },
    { key: 'jenis_label', header: 'Ujian', shrink: true },
    { key: 'tanggal', header: 'Jadwal', cell: (u) => (u.tanggal ? `${tglPendek(u.tanggal)} ${u.mulai}–${u.selesai}` : '-') },
    { key: 'ruang', header: 'Tempat', cell: (u) => (u.daring ? 'Daring' : (u.ruang?.nama ?? '-')) },
    { key: 'tim', header: 'Ketua / penguji', cell: (u) => u.tim.filter((t) => t.peran === 'ketua' || t.peran === 'penguji').map((t) => t.nama.split(',')[0]).join(', ') || '-' },
    { key: 'status', header: 'Status', shrink: true, cell: (u) => <LencanaStatusUjianTa u={u} /> },
    { key: 'sk', header: 'SK', cell: (u) => u.sk?.nomor ?? '-', defaultHidden: true },
    {
      key: 'aksi',
      header: '',
      shrink: true,
      cell: (u) => (
        <Button size="xs" variant="outline" onClick={() => onBuka(u)}>
          Buka
        </Button>
      ),
    },
  ];
}

/** Operator prodi/fakultas: kelayakan, daftar ujian per status, susun jadwal, ajukan ke Dekan. */
export function PenjadwalanUjianTa({ prodi }: { prodi?: Array<{ value: string; label: string }> }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [tab, setTab] = React.useState('kelayakan');
  const [buka, setBuka] = React.useState<string | null>(null);
  const [jadwal, setJadwal] = React.useState<UjianTa | null>(null);
  const grup = GRUP_STATUS.find((g) => g.value === tab);
  const q = useSiakadQuery<UjianTa[]>(['ujian-ta', 'daftar', tab], (s, signal) => s.request<UjianTa[]>({ method: 'GET', path: P, query: { status: grup?.status, per_page: 100 } }, { signal }), { enabled: Boolean(grup) });
  useSaatInvalidasi('ujian-ta', q.refetch);
  const ajukan = async (ids: string[], clear: () => void) => {
    try {
      await siakad.request({ method: 'POST', path: `${P}/ajukan-penetapan`, body: { ids } });
      toast.add({ title: `${ids.length} jadwal diajukan ke Dekan`, type: 'success' });
      clear();
      invalidateSiakad('ujian-ta');
    } catch (e) {
      toast.add({ title: 'Belum bisa diajukan', description: pesan(e), type: 'error' });
    }
  };
  const bukaJadwal = async (u: UjianTa) => {
    try {
      const r = await siakad.request<UjianTa>({ method: 'GET', path: `${P}/${u.id}` });
      setJadwal(r.data ?? u);
    } catch {
      setJadwal(u);
    }
  };
  return (
    <div className="u-ta">
      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'kelayakan', label: 'Kelayakan' },
          ...GRUP_STATUS.map((g) => ({ value: g.value, label: g.label, count: tab === g.value ? q.data?.length : undefined })),
        ]}
      />
      {tab === 'kelayakan' ? (
        <KelayakanUjianTa prodi={prodi} onBuka={setBuka} />
      ) : (
        <DataTable
          columns={kolomUjian((u) => setBuka(u.id))}
          rows={q.data}
          rowKey={(u) => u.id}
          loading={q.loading}
          error={q.error}
          onRetry={q.refetch}
          selectable={tab === 'draf'}
          bulkActions={(ids, clear) => (
            <Button size="sm" onClick={() => void ajukan(ids, clear)}>
              <Send /> Ajukan {ids.length} ke Dekan
            </Button>
          )}
          empty={{ title: 'Tidak ada ujian di kelompok ini' }}
        />
      )}
      <DetailUjianTa id={buka} open={buka !== null} onOpenChange={(o) => !o && setBuka(null)} onJadwal={(u) => void bukaJadwal(u)} />
      <FormJadwalUjianTa u={jadwal} open={jadwal !== null} onOpenChange={(o) => !o && setJadwal(null)} />
    </div>
  );
}

// ================================================================ Dekan: penetapan SK
/** Dekan/WD I: usulan jadwal yang menunggu, tautkan SK Dekan (kolektif), tetapkan atau kembalikan. */
export function PenetapanUjianTa({ penerbitUnitId }: { penerbitUnitId?: number | null }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useSiakadQuery<UjianTa[]>(['ujian-ta', 'diajukan'], (s, signal) => s.request<UjianTa[]>({ method: 'GET', path: P, query: { status: 'diajukan', per_page: 200 } }, { signal }));
  useSaatInvalidasi('ujian-ta', q.refetch);
  const [pilih, setPilih] = React.useState<string[] | null>(null);
  const [sk, setSk] = React.useState<string | null>(null);
  const [catatan, setCatatan] = React.useState('');
  const [buka, setBuka] = React.useState<string | null>(null);
  const tetapkan = async () => {
    if (!pilih) return;
    try {
      const r = await siakad.request<{ sk: { nomor: string } }>({ method: 'POST', path: `${P}/tetapkan`, body: { ids: pilih, sk_id: sk, catatan: catatan || undefined } });
      toast.add({ title: `${pilih.length} ujian ditetapkan`, description: `SK Dekan ${r.data?.sk.nomor ?? ''}. Undangan terkirim ke mahasiswa dan tim.`, type: 'success' });
      setPilih(null);
      setSk(null);
      invalidateSiakad('ujian-ta');
    } catch (e) {
      toast.add({ title: 'Belum bisa ditetapkan', description: pesan(e), type: 'error' });
    }
  };
  const kembalikan = async (ids: string[], clear: () => void) => {
    try {
      await siakad.request({ method: 'POST', path: `${P}/kembalikan`, body: { ids, catatan } });
      toast.add({ title: 'Usulan dikembalikan', type: 'success' });
      clear();
      invalidateSiakad('ujian-ta');
    } catch (e) {
      toast.add({ title: 'Belum bisa dikembalikan', description: pesan(e), type: 'error' });
    }
  };
  const perihal = pilih ? `Penetapan Tim Penguji dan Jadwal Ujian Tugas Akhir (${pilih.length} mahasiswa)` : '';
  return (
    <div className="u-ta">
      <Alert variant="info" title="Ditetapkan dengan SK Dekan">
        Pilih usulan yang disetujui, lalu tautkan SK Dekan dari registri SK (satu SK boleh untuk sekumpulan ujian). Tanpa SK, jadwal tidak bisa ditetapkan.
      </Alert>
      <DataTable
        columns={kolomUjian((u) => setBuka(u.id))}
        rows={q.data}
        rowKey={(u) => u.id}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <Button size="sm" onClick={() => setPilih(ids)}>
              <Gavel /> Tetapkan {ids.length} dengan SK
            </Button>
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="outline">
                  <Undo2 /> Kembalikan
                </Button>
              }
              title="Kembalikan usulan ke penyusun"
              description={<Textarea rows={3} placeholder="Yang perlu diubah" value={catatan} onChange={(e) => setCatatan(e.target.value)} />}
              confirmLabel="Kembalikan"
              tone="warning"
              onConfirm={() => kembalikan(ids, clear)}
            />
          </>
        )}
        empty={{ icon: <Gavel />, title: 'Tidak ada usulan yang menunggu penetapan' }}
      />
      <Dialog
        side="right"
        open={pilih !== null}
        onOpenChange={(o) => !o && setPilih(null)}
        title={`Tetapkan ${pilih?.length ?? 0} ujian`}
        description="SK Dekan yang menetapkan susunan tim penguji dan jadwal."
        footer={
          <Button onClick={() => void tetapkan()} disabled={!sk}>
            <Gavel /> Tetapkan
          </Button>
        }
      >
        <div className="u-ujta-form">
          <PilihSK label="SK Dekan" required value={sk} onValueChange={(id) => setSk(id)} jenis="penetapan" penerbitUnitId={penerbitUnitId ?? null} perihal={perihal} catatSekarang={{ label: 'Catat SK sekarang', isian: { perihal, jenis: 'penetapan', penerbitUnitId: penerbitUnitId ?? null } }} />
          <Field label="Catatan" optional>
            <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </Field>
        </div>
      </Dialog>
      <DetailUjianTa id={buka} open={buka !== null} onOpenChange={(o) => !o && setBuka(null)} />
    </div>
  );
}

// ================================================================ Agenda
function senin(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Agenda ujian per minggu (daftar per hari atau papan per ruang). untuk="saya" = ujian dosen ini. */
export function AgendaUjianTa({ untuk = 'kelola' }: { untuk?: 'kelola' | 'saya' }) {
  const [awal, setAwal] = React.useState(() => senin(new Date()));
  const [tampil, setTampil] = React.useState<'hari' | 'ruang'>('hari');
  const [buka, setBuka] = React.useState<string | null>(null);
  const akhir = new Date(awal);
  akhir.setDate(akhir.getDate() + 6);
  const q = useSiakadQuery<UjianTa[]>(['ujian-ta', 'agenda', untuk, iso(awal)], (s, signal) => s.request<UjianTa[]>({ method: 'GET', path: `${P}/agenda`, query: { untuk, dari: iso(awal), sampai: iso(akhir) } }, { signal }));
  useSaatInvalidasi('ujian-ta', q.refetch);
  const geser = (n: number) => setAwal((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n * 7));
  const events: CalendarEvent[] = (q.data ?? []).map((u) => ({
    id: u.id,
    title: `${u.jenis_label}: ${u.nama ?? u.nim}`,
    start: u.tanggal ?? '',
    time: `${u.mulai}–${u.selesai}`,
    location: u.daring ? 'Daring' : (u.ruang?.nama ?? undefined),
    kind: u.jenis,
    description: `${u.status_label}${u.sk ? ` · SK ${u.sk.nomor}` : ''}`,
  }));
  const ruang = Array.from(new Set((q.data ?? []).map((u) => (u.daring ? 'Daring' : (u.ruang?.nama ?? '-'))))).sort();
  return (
    <div className="u-ta">
      <div className="u-ujta-saring">
        <Button variant="outline" size="sm" onClick={() => geser(-1)}>
          Minggu lalu
        </Button>
        <strong>
          {tglPendek(iso(awal))} – {tglPendek(iso(akhir))}
        </strong>
        <Button variant="outline" size="sm" onClick={() => geser(1)}>
          Minggu depan
        </Button>
        <SegmentedControl
          options={[
            { value: 'hari', label: 'Per hari' },
            { value: 'ruang', label: 'Per ruang' },
          ]}
          value={tampil}
          onValueChange={(v) => setTampil(v as 'hari' | 'ruang')}
        />
      </div>
      {tampil === 'hari' ? (
        <AgendaList events={events} groupBy="day" loading={q.loading} kindLabels={{ proposal: 'Proposal', hasil: 'Seminar hasil', skripsi: 'Sidang' }} onEventClick={(e) => setBuka(String(e.id))} empty={<Empty icon={<CalendarDays />} title="Tidak ada ujian minggu ini" />} />
      ) : (
        <div className="u-ujta-papan">
          {ruang.length === 0 && <Empty icon={<MapPin />} title="Tidak ada ujian minggu ini" />}
          {ruang.map((r) => (
            <section key={r}>
              <h4>
                <MapPin aria-hidden /> {r}
              </h4>
              <ul>
                {(q.data ?? [])
                  .filter((u) => (u.daring ? 'Daring' : (u.ruang?.nama ?? '-')) === r)
                  .map((u) => (
                    <li key={u.id}>
                      <Tekan onClick={() => setBuka(u.id)}>
                        <strong>
                          {tglPendek(u.tanggal)} {u.mulai}–{u.selesai}
                        </strong>
                        <span>
                          {u.jenis_label}: {u.nama}
                        </span>
                        <LencanaStatusUjianTa u={u} />
                      </Tekan>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <DetailUjianTa id={buka} open={buka !== null} onOpenChange={(o) => !o && setBuka(null)} />
    </div>
  );
}

// ================================================================ Dosen
interface UjianSayaDosen {
  peran: 'dosen' | 'lain';
  nidn?: string | null;
  ujian?: UjianTa[];
  menunggu_persetujuan?: number;
  perlu_nilai?: number;
}

/** Dosen: permohonan mahasiswa bimbingan, ujian yang diuji/dibimbing, isi nilai, keputusan (ketua). */
export function UjianTaDosen() {
  const q = useUjianTaSaya<UjianSayaDosen>();
  const [buka, setBuka] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState('perlu');
  const semua = q.data?.ujian ?? [];
  const perlu = semua.filter((u) => u.hak.setuju_pembimbing || u.hak.nilai || u.hak.putuskan || u.hak.revisi_selesai);
  return (
    <div className="u-ta">
      {(q.data?.menunggu_persetujuan ?? 0) > 0 && (
        <Alert variant="warning" title={`${q.data?.menunggu_persetujuan} mahasiswa bimbingan mengajukan siap ujian`}>
          Buka permohonannya, lalu nyatakan layak uji atau kembalikan dengan catatan.
        </Alert>
      )}
      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'perlu', label: 'Perlu tindakan', count: perlu.length },
          { value: 'semua', label: 'Semua ujian saya', count: semua.length },
          { value: 'agenda', label: 'Agenda' },
        ]}
      />
      {tab === 'agenda' ? (
        <AgendaUjianTa untuk="saya" />
      ) : (
        <DataTable
          columns={[
            ...kolomUjian((u) => setBuka(u.id)).slice(0, 4),
            { key: 'peran', header: 'Tugas saya', cell: (u) => u.tim.filter((t) => t.nidn === q.data?.nidn).map((t) => t.peran_label).join(', ') || 'Pembimbing' },
            { key: 'status', header: 'Status', shrink: true, cell: (u) => <LencanaStatusUjianTa u={u} /> },
            {
              key: 'aksi',
              header: '',
              shrink: true,
              cell: (u) => (
                <Button size="xs" variant={u.hak.nilai || u.hak.setuju_pembimbing ? 'primary' : 'outline'} onClick={() => setBuka(u.id)}>
                  {u.hak.setuju_pembimbing ? 'Tinjau' : u.hak.nilai ? 'Nilai' : 'Buka'}
                </Button>
              ),
            },
          ]}
          rows={tab === 'perlu' ? perlu : semua}
          rowKey={(u) => u.id}
          loading={q.loading}
          error={q.error}
          onRetry={q.refetch}
          empty={{ icon: <Users />, title: tab === 'perlu' ? 'Tidak ada yang perlu ditindaklanjuti' : 'Belum ada ujian' }}
        />
      )}
      <DetailUjianTa id={buka} open={buka !== null} onOpenChange={(o) => !o && setBuka(null)} />
    </div>
  );
}

// ================================================================ Unit pemeriksa plagiasi
/** Antrean layanan cek plagiasi (Pustikom/unit pemeriksa): unduh naskah, unggah laporan + skor, statistik. */
export function AntreanPlagiasi() {
  const siakad = useSiakad();
  const toast = useToast();
  const [status, setStatus] = React.useState('baru');
  const q = useSiakadQuery<CekPlagiasi[]>(['plagiasi', 'antrean', status], (s, signal) => s.request<CekPlagiasi[]>({ method: 'GET', path: '/v1/plagiasi/antrean', query: { status, per_page: 100 } }, { signal }));
  useSaatInvalidasi('plagiasi', q.refetch);
  const ring = (q.meta as unknown as { ringkasan?: { per_status: Record<string, number>; lewat_sla: number; rata_hari: number | null; rata_skor: number | null } } | undefined)?.ringkasan;
  const [hasil, setHasil] = React.useState<CekPlagiasi | null>(null);
  const [isi, setIsi] = React.useState({ skor: '', alat: 'Turnitin', catatan: '', revisi: false });
  const [file, setFile] = React.useState<File | null>(null);
  const unggah = useUnggahBerkas({ kategori: 'dokumen', modul: 'plagiasi', keterangan: 'Laporan cek plagiasi' });
  const aksi = async (path: string, body: Record<string, unknown>, judul: string) => {
    try {
      await siakad.request({ method: 'POST', path, body });
      toast.add({ title: judul, type: 'success' });
      invalidateSiakad('plagiasi');
      return true;
    } catch (e) {
      toast.add({ title: 'Belum berhasil', description: pesan(e), type: 'error' });
      return false;
    }
  };
  const kirimHasil = async () => {
    if (!hasil) return;
    let body: Record<string, unknown> = { perlu_revisi: true, catatan: isi.catatan };
    if (!isi.revisi) {
      if (!file) {
        toast.add({ title: 'Unggah laporan hasil cek (PDF)', type: 'error' });
        return;
      }
      const b = await unggah(file);
      body = { skor: Number(isi.skor), alat: isi.alat, catatan: isi.catatan || undefined, laporan_berkas_id: b.id };
    }
    if (await aksi(`/v1/plagiasi/${hasil.id}/hasil`, body, 'Hasil tersimpan, mahasiswa diberi notifikasi')) setHasil(null);
  };
  const kolom: DataColumn<CekPlagiasi>[] = [
    {
      key: 'nim',
      header: 'Mahasiswa',
      cell: (r) => (
        <span className="u-ujta-sel-mhs">
          <strong>{r.nama}</strong>
          <span className="u-ta-redup">
            {r.nim} · {r.nama_prodi}
          </span>
        </span>
      ),
    },
    { key: 'jenis_label', header: 'Naskah', cell: (r) => `${r.jenis_label} (cek ke-${r.percobaan_ke}${r.berbayar ? ', berbayar' : ''})` },
    { key: 'judul', header: 'Judul', cell: (r) => <span className="u-ujta-judul-sel">{r.judul}</span> },
    { key: 'sla_tenggat', header: 'Tenggat', cell: (r) => <span data-lewat={r.lewat_sla ? '' : undefined}>{tglPendek(r.sla_tenggat)}</span> },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (
        <>
          <Badge variant={r.lewat_sla ? 'danger' : r.status === 'selesai' ? 'success' : 'neutral'}>{r.status_label}{r.skor != null ? ` ${r.skor}%` : ''}</Badge>
          <PetugasPemeriksa pemeriksa={r.pemeriksa} />
        </>
      ),
    },
    {
      key: 'aksi',
      header: '',
      shrink: true,
      cell: (r) => (
        <span className="u-ujta-aksi">
          <Button size="xs" variant="ghost" onClick={() => void bukaBerkas(siakad, `/v1/plagiasi/${r.id}/naskah`, r.naskah.nama ?? 'naskah', true).catch((e) => toast.add({ title: 'Gagal', description: pesan(e), type: 'error' }))}>
            <Download /> Naskah
          </Button>
          {r.status === 'diajukan' && (
            <Button size="xs" variant="outline" onClick={() => void aksi(`/v1/plagiasi/${r.id}/proses`, {}, 'Ditandai sedang dicek')}>
              Proses
            </Button>
          )}
          {(r.status === 'diajukan' || r.status === 'diproses') && (
            <Button
              size="xs"
              onClick={() => {
                setHasil(r);
                setIsi({ skor: '', alat: 'Turnitin', catatan: '', revisi: false });
                setFile(null);
              }}
            >
              <Upload /> Hasil
            </Button>
          )}
        </span>
      ),
    },
  ];
  return (
    <div className="u-ta">
      {ring && (
        <div className="u-ujta-statistik">
          <Card>
            <span>Antrean baru</span>
            <strong>{ring.per_status.diajukan ?? 0}</strong>
          </Card>
          <Card>
            <span>Sedang dicek</span>
            <strong>{ring.per_status.diproses ?? 0}</strong>
          </Card>
          <Card>
            <span>Lewat tenggat</span>
            <strong>{ring.lewat_sla}</strong>
          </Card>
          <Card>
            <span>Rata-rata selesai</span>
            <strong>{ring.rata_hari ?? '-'} hari</strong>
          </Card>
          <Card>
            <span>Rata-rata similarity</span>
            <strong>{ring.rata_skor ?? '-'}%</strong>
          </Card>
        </div>
      )}
      <SegmentedControl
        options={[
          { value: 'baru', label: 'Baru' },
          { value: 'diproses', label: 'Diproses' },
          { value: 'selesai', label: 'Selesai' },
          { value: 'semua', label: 'Semua' },
        ]}
        value={status}
        onValueChange={setStatus}
      />
      <DataTable columns={kolom} rows={q.data} rowKey={(r) => r.id} loading={q.loading} error={q.error} onRetry={q.refetch} empty={{ icon: <FileSearch />, title: 'Antrean kosong' }} />
      <Dialog
        side="right"
        open={hasil !== null}
        onOpenChange={(o) => !o && setHasil(null)}
        title="Hasil cek plagiasi"
        description={hasil ? `${hasil.nim} ${hasil.nama ?? ''} · ${hasil.jenis_label}` : undefined}
        footer={<Button onClick={() => void kirimHasil()}>Simpan hasil</Button>}
      >
        <div className="u-ujta-form">
          {hasil?.pengecualian && <p className="u-ta-redup">Pengecualian: {hasil.pengecualian}</p>}
          <label className="u-ujta-centang">
            <Switch size="sm" checked={isi.revisi} onCheckedChange={(c) => setIsi((o) => ({ ...o, revisi: c }))} /> Naskah perlu diperbaiki dulu (tidak dicek)
          </label>
          {!isi.revisi && (
            <>
              <div className="u-form-kisi" data-kolom="2">
                <Field label="Similarity (%)" required>
                  <IsianAngka value={keAngka(isi.skor)} desimal={2} langkah={0.01} min={0} max={100} onValueChange={(n) => setIsi((o) => ({ ...o, skor: teksAngka(n) }))} />
                </Field>
                <Field label="Alat" required>
                  <Input value={isi.alat} onChange={(e) => setIsi((o) => ({ ...o, alat: e.target.value }))} />
                </Field>
              </div>
              <Field label="Laporan hasil (PDF)" required>
                <IsianBerkas value={file} onValueChange={setFile} accept=".pdf" info={false} />
              </Field>
            </>
          )}
          <Field label="Catatan untuk mahasiswa" required={isi.revisi} optional={!isi.revisi}>
            <Textarea rows={3} value={isi.catatan} onChange={(e) => setIsi((o) => ({ ...o, catatan: e.target.value }))} />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}

// ================================================================ Unit validasi bukti
interface BuktiAntrean {
  id: string;
  nim: string;
  nama: string | null;
  nama_prodi: string | null;
  label: string;
  unit_nama: string;
  status: string;
  status_label: string;
  isian: Record<string, string>;
  ceklis: string[];
  catatan: string | null;
  berkas: { nama: string | null } | null;
  dikirim_at: string;
  aturan: { nama: string } | null;
  pemeriksa?: TahapPemeriksa[];
}

/**
 * Antrean validasi bukti syarat unit (BAUK, LP2M, Perpustakaan, UPT Bahasa, ...): terima/tolak dengan alasan. `unit` =
 * kode induk_unit (mis. BAUK) untuk panel satu unit; kosong = semua unit yang boleh divalidasi pengguna.
 */
export function AntreanBuktiSyarat({ unit: unitAwal }: { unit?: string } = {}) {
  const siakad = useSiakad();
  const toast = useToast();
  const [status, setStatus] = React.useState('menunggu');
  const q = useSiakadQuery<BuktiAntrean[]>(['bukti', 'antrean', status, unitAwal ?? ''], (s, signal) =>
    s.request<BuktiAntrean[]>({ method: 'GET', path: '/v1/bukti-syarat/antrean', query: { status, unit: unitAwal, per_page: 100 } }, { signal }),
  );
  useSaatInvalidasi('bukti', q.refetch);
  const [alasan, setAlasan] = React.useState('');
  const putus = async (b: BuktiAntrean, keputusan: 'terima' | 'tolak') => {
    try {
      await siakad.request({ method: 'POST', path: `/v1/bukti-syarat/${b.id}/putuskan`, body: { keputusan, alasan: alasan || undefined } });
      toast.add({ title: keputusan === 'terima' ? 'Bukti diterima' : 'Bukti ditolak', type: 'success' });
      setAlasan('');
      invalidateSiakad('bukti');
    } catch (e) {
      toast.add({ title: 'Belum berhasil', description: pesan(e), type: 'error' });
    }
  };
  const unit = (q.meta as unknown as { unit?: string[] } | undefined)?.unit ?? [];
  if ((q.error as { status?: number } | null)?.status === 403)
    return (
      <Alert variant="warning" title="Akun Anda belum ditugaskan memvalidasi bukti syarat">
        {unitAwal ? `Validasi bukti unit ${unitAwal} butuh peran Petugas validasi syarat (atau pimpinan unit) berlingkup ${unitAwal}.` : 'Minta Pustikom memberi peran Petugas validasi syarat berlingkup unit Anda.'}{' '}
        {q.error?.message}
      </Alert>
    );
  return (
    <div className="u-ta">
      <div className="u-ujta-saring">
        <SegmentedControl
          options={[
            { value: 'menunggu', label: 'Menunggu' },
            { value: 'diterima', label: 'Diterima' },
            { value: 'ditolak', label: 'Ditolak' },
          ]}
          value={status}
          onValueChange={setStatus}
        />
        {unit.length > 0 && <span className="u-ta-redup">Unit: {unit.join(', ')}</span>}
      </div>
      <DataTable
        rows={q.data}
        rowKey={(b) => b.id}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
        empty={{ icon: <ClipboardCheck />, title: 'Tidak ada bukti di antrean', description: 'Bukti syarat dari mahasiswa untuk unit Anda muncul di sini.' }}
        columns={[
          {
            key: 'nim',
            header: 'Mahasiswa',
            cell: (b) => (
              <span className="u-ujta-sel-mhs">
                <strong>{b.nama}</strong>
                <span className="u-ta-redup">
                  {b.nim} · {b.nama_prodi}
                </span>
              </span>
            ),
          },
          { key: 'label', header: 'Bukti', cell: (b) => `${b.label} (${b.unit_nama})` },
          { key: 'isian', header: 'Isian', cell: (b) => Object.entries(b.isian).map(([k, v]) => `${k}: ${v}`).join(' · ') || '-' },
          {
            key: 'berkas',
            header: 'Berkas',
            cell: (b) =>
              b.berkas ? (
                <Button size="xs" variant="ghost" onClick={() => void bukaBerkas(siakad, `/v1/bukti-syarat/${b.id}/berkas`, b.berkas?.nama ?? 'bukti').catch((e) => toast.add({ title: 'Gagal', description: pesan(e), type: 'error' }))}>
                  <FileText /> {b.berkas.nama}
                </Button>
              ) : (
                '-'
              ),
          },
          {
            key: 'status',
            header: 'Status',
            shrink: true,
            cell: (b) => (
              <>
                <Badge variant={b.status === 'diterima' ? 'success' : b.status === 'ditolak' ? 'danger' : 'warning'}>{b.status_label}</Badge>
                <PetugasPemeriksa pemeriksa={b.pemeriksa} />
              </>
            ),
          },
          {
            key: 'aksi',
            header: '',
            shrink: true,
            cell: (b) =>
              b.status === 'menunggu' ? (
                <span className="u-ujta-aksi">
                  <Button size="xs" onClick={() => void putus(b, 'terima')}>
                    Terima
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button size="xs" variant="outline">
                        Tolak
                      </Button>
                    }
                    title="Tolak bukti"
                    description={<Textarea rows={3} placeholder="Alasan, agar mahasiswa bisa memperbaiki" value={alasan} onChange={(e) => setAlasan(e.target.value)} />}
                    confirmLabel="Tolak"
                    tone="danger"
                    onConfirm={() => putus(b, 'tolak')}
                  />
                </span>
              ) : null,
          },
        ]}
      />
    </div>
  );
}
