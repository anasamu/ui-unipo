'use client';
import * as React from 'react';
import { Award, Ban, Briefcase, CircleCheck, CircleDashed, CircleX, Clock, Download, FileText, GraduationCap, History, Paperclip, Plus, Receipt, RotateCcw, Send, Upload } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton, type BadgeVariant } from '../components/actions';
import { Alert, Card, DescriptionList, Empty, Tabs } from '../components/display';
import { Field, Input, Textarea } from '../components/forms';
import { Select } from '../components/select';
import { ConfirmDialog, Sheet, useToast } from '../components/overlays';
import { GalatApi } from './galat';
import { PilihBerkas } from './pilih-berkas';
import { SyaratSaya } from './aturan';
import { useProdiReferensi, judulProdi } from './prodi';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { AlurPemeriksa, LabelPemeriksa, PratinjauPemeriksa, type TahapPemeriksa } from './pemeriksa';

/*
 * Pengajuan mandiri mahasiswa ke unit lain, ujung ke ujung (docs/PRASYARAT.md di SIAKAD):
 * syarat dicek sebelum mengisi (prasyarat bawaan + aturan /v1/aturan), dokumen pendukung dikirim bersama pengajuan,
 * status dan catatan unit pemroses terlihat, lampiran bisa dilengkapi, dan linimasa ({path}/{id}/riwayat) menunjukkan
 * siapa memproses apa dan kapan.
 *
 *   status     /v1/akademik/pengajuan        cuti, aktif kembali, non-aktif, mengundurkan diri, pindah (BAAK/prodi)
 *   layanan    /v1/layanan/permohonan        surat keterangan, legalisir, ... (unit pelaksana katalog)
 *   beasiswa   /v1/kemahasiswaan/pendaftar   pendaftaran beasiswa (kemahasiswaan)
 *   mbkm       /v1/mbkm/peserta              pendaftaran program MBKM (prodi)
 *   dispensasi /v1/keuangan/dispensasi       dispensasi pembayaran (keuangan)
 */

// ================================================================ Tipe & label
export type JenisPengajuanMahasiswa = 'status' | 'layanan' | 'beasiswa' | 'mbkm' | 'dispensasi';

export interface LangkahRiwayat {
  aksi: string;
  judul: string;
  status: string | null;
  catatan: string | null;
  berkas: string | null;
  oleh: string;
  nama_oleh: string | null;
  waktu: string;
}
interface LampiranPusat {
  uuid: string;
  nama: string;
  ukuran: number;
  created_at?: string;
}
type Baris = Record<string, unknown> & { id: number; status: string; created_at?: string; catatan?: string | null; lampiran_wajib?: number; jumlah_lampiran?: number; pemeriksa?: TahapPemeriksa[] };

/** Kunci katalog alur pemeriksa (GET /v1/pemeriksa/alur/{jenis}) per jenis pengajuan mahasiswa. */
const JENIS_PEMERIKSA: Record<JenisPengajuanMahasiswa, string> = {
  status: 'akademik.pengajuan',
  layanan: 'layanan.permohonan',
  beasiswa: 'kemahasiswaan.beasiswa',
  mbkm: 'mbkm.peserta',
  dispensasi: 'keuangan.dispensasi',
};

const JENIS_STATUS: Record<string, string> = {
  cuti: 'Cuti akademik',
  aktif_kembali: 'Aktif kembali',
  non_aktif: 'Non-aktif',
  mengundurkan_diri: 'Mengundurkan diri',
  pindah_kelas: 'Pindah kelas',
  pindah_kampus: 'Pindah kampus',
  pindah_prodi: 'Pindah program studi',
};
const LABEL_STATUS: Record<string, [string, BadgeVariant]> = {
  draf: ['Draf', 'neutral'],
  diajukan: ['Menunggu diproses', 'warning'],
  diproses: ['Sedang diproses', 'info'],
  diverifikasi: ['Berkas lengkap', 'info'],
  perlu_perbaikan: ['Perlu perbaikan', 'danger'],
  disetujui: ['Disetujui', 'success'],
  dikembalikan: ['Dikembalikan', 'danger'],
  ditelaah: ['Ditelaah SPMI', 'info'],
  diterima: ['Diterima', 'success'],
  berjalan: ['Berjalan', 'info'],
  selesai: ['Selesai', 'success'],
  ditolak: ['Ditolak', 'danger'],
  dibatalkan: ['Dibatalkan', 'neutral'],
  dicabut: ['Dicabut', 'danger'],
  mengundurkan_diri: ['Mengundurkan diri', 'neutral'],
};
/** Label dan warna status pengajuan lintas unit. */
export function LencanaStatusPengajuan({ status }: { status: string | null | undefined }) {
  const [l, v] = LABEL_STATUS[status ?? ''] ?? [status ?? '-', 'neutral' as BadgeVariant];
  return <Badge variant={v}>{l}</Badge>;
}

const tgl = (s: unknown, jam = false) => {
  if (!s || typeof s !== 'string') return '-';
  const d = new Date(s.length <= 10 ? `${s}T00:00:00` : s.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', ...(jam ? { hour: '2-digit', minute: '2-digit' } : {}) });
};
const ukuran = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const rupiah = (n: unknown) => (n == null || n === '' ? '-' : `Rp${Number(n).toLocaleString('id-ID')}`);

// ================================================================ Linimasa & lampiran (umum)
/** Linimasa status satu pengajuan (GET {path}/{id}/riwayat): diajukan, diproses, dikembalikan, diputuskan, lampiran. */
export function LinimasaPengajuan({
  path,
  id,
  langkah,
  className,
}: {
  path?: string;
  id?: number | string;
  /** Langkah yang sudah ada (tanpa memanggil `{path}/{id}/riwayat`), mis. riwayat persetujuan aturan. */
  langkah?: LangkahRiwayat[];
  className?: string;
}) {
  const q = useSiakadQuery<LangkahRiwayat[]>(['riwayat', path ?? '', id ?? ''], (s, signal) => s.request<LangkahRiwayat[]>({ method: 'GET', path: `${path}/${id}/riwayat` }, { signal }), {
    staleTime: 5_000,
    enabled: !langkah && Boolean(path) && id != null,
  });
  const data = langkah ?? q.data;
  if (!langkah && q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  if (!data) return <Skeleton className={className} style={{ height: 120 }} />;
  if (!data.length) return <p className={cn('u-linimasa-kosong', className)}>Belum ada riwayat.</p>;
  return (
    <ol className={cn('u-linimasa', className)}>
      {data.map((r, i) => {
        const nada = r.status === 'ditolak' || r.status === 'dicabut' || r.status === 'perlu_perbaikan' || r.status === 'dikembalikan' ? 'buruk' : ['disetujui', 'diterima', 'selesai'].includes(r.status ?? '') ? 'baik' : r.aksi.includes('berkas') ? 'berkas' : 'biasa';
        return (
          <li key={i} className="u-linimasa-item" data-nada={nada}>
            <span className="u-linimasa-titik" aria-hidden>
              {nada === 'baik' ? <CircleCheck /> : nada === 'buruk' ? <CircleX /> : nada === 'berkas' ? <Paperclip /> : <CircleDashed />}
            </span>
            <div className="u-linimasa-isi">
              <p className="u-linimasa-judul">
                {r.judul}
                {r.status && r.aksi !== 'tambah' && <LencanaStatusPengajuan status={r.status} />}
              </p>
              <p className="u-linimasa-meta">
                {r.nama_oleh ?? r.oleh} · {tgl(r.waktu, true)}
              </p>
              {r.berkas && <p className="u-linimasa-catatan">{r.berkas}</p>}
              {r.catatan && r.aksi !== 'tambah' && <p className="u-linimasa-catatan">“{r.catatan}”</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

async function unduh(siakad: ReturnType<typeof useSiakad>, path: string, nama: string) {
  const r = await siakad.request<unknown>({ method: 'GET', path });
  const d = r.data as { blob?: () => Blob } | Blob | null;
  const blob = d instanceof Blob ? d : d && typeof d === 'object' && typeof d.blob === 'function' ? d.blob() : null;
  if (!blob) throw new Error('Berkas tidak dapat diunduh.');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nama;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Dokumen pendukung satu pengajuan: daftar, unduh, dan tambah (selama masih bisa diubah pemohon). */
export function LampiranPengajuan({ path, id, bolehTambah, wajib, className }: { path: string; id: number | string; bolehTambah?: boolean; wajib?: number; className?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useSiakadQuery<LampiranPusat[]>(['lampiran', path, id], (s, signal) => s.request<LampiranPusat[]>({ method: 'GET', path: `${path}/${id}/berkas` }, { signal }), { staleTime: 5_000 });
  const [kunci, setKunci] = React.useState(0);
  const tambah = async (berkasId: string | null) => {
    if (!berkasId) return;
    try {
      await siakad.request({ method: 'POST', path: `${path}/${id}/berkas`, body: { berkas_id: berkasId, jenis: 'pendukung' } });
      toast.add({ title: 'Lampiran ditambahkan', type: 'success' });
      q.refetch();
      invalidateSiakad('riwayat');
    } catch (e) {
      toast.add({ title: 'Gagal melampirkan', description: pesanGalat(e), type: 'error' });
    }
    setKunci((k) => k + 1);
  };
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  const daftar = q.data ?? [];
  return (
    <div className={cn('u-pengajuan-lampiran', className)}>
      {wajib ? (
        <p className="u-pengajuan-wajib" data-kurang={daftar.length < wajib || undefined}>
          Dokumen wajib minimal {wajib}; terlampir {daftar.length}.
        </p>
      ) : null}
      {!q.data ? (
        <Skeleton style={{ height: 48 }} />
      ) : daftar.length === 0 ? (
        <p className="u-linimasa-kosong">Belum ada lampiran.</p>
      ) : (
        <ul className="u-pengajuan-berkas">
          {daftar.map((b) => (
            <li key={b.uuid}>
              <FileText aria-hidden />
              <span>
                {b.nama}
                <small>{ukuran(b.ukuran)}</small>
              </span>
              <Button size="sm" variant="ghost" aria-label={`Unduh ${b.nama}`} onClick={() => unduh(siakad, `${path}/${id}/berkas/${b.uuid}`, b.nama).catch((e) => toast.add({ title: 'Gagal mengunduh', description: pesanGalat(e), type: 'error' }))}>
                <Download />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {bolehTambah && <PilihBerkas key={kunci} value={null} onValueChange={(v) => void tambah(v)} accept=".pdf,.jpg,.jpeg,.png" />}
    </div>
  );
}

/** Isian dokumen pendukung sebelum pengajuan dibuat (UUID /v1/berkas dikirim sebagai `lampiran`). */
export function IsianLampiranPengajuan({ value, onValueChange, wajib, maks = 5, disabled }: { value: string[]; onValueChange: (v: string[]) => void; wajib?: number; maks?: number; disabled?: boolean }) {
  const [kunci, setKunci] = React.useState(0);
  return (
    <div className="u-pengajuan-isian-lampiran">
      {value.map((id) => (
        <PilihBerkas key={id} value={id} accept=".pdf,.jpg,.jpeg,.png" disabled={disabled} onValueChange={(baru) => onValueChange(baru ? value.map((x) => (x === id ? baru : x)) : value.filter((x) => x !== id))} />
      ))}
      {value.length < maks && (
        <PilihBerkas
          key={`baru-${kunci}`}
          value={null}
          accept=".pdf,.jpg,.jpeg,.png"
          disabled={disabled}
          onValueChange={(id) => {
            if (id && !value.includes(id)) onValueChange([...value, id]);
            setKunci((k) => k + 1);
          }}
        />
      )}
      {wajib ? (
        <p className="u-pengajuan-wajib" data-kurang={value.length < wajib || undefined}>
          Wajib minimal {wajib} dokumen ({value.length} dipilih).
        </p>
      ) : null}
    </div>
  );
}

// ================================================================ Definisi tiap jenis
interface Program {
  id: number;
  kode: string;
  nama: string;
  syarat?: string | null;
  lampiran_minimal?: number | null;
  [k: string]: unknown;
}
interface JenisLayanan extends Program {
  kategori: string;
  sla_hari?: number;
  wajib_berkas?: boolean;
  isian?: Array<{ nama: string; label?: string; wajib?: boolean }> | string | null;
  aktif?: boolean;
}

interface Def {
  judul: string;
  ikon: React.ReactNode;
  path: string;
  unit: string;
  tombol: string;
  /** Status saat pemohon boleh membatalkan / menambah lampiran. */
  batal: string[];
  ubah: string[];
  aksiBatal: string;
  kirimUlang?: boolean;
  judulBaris: (r: Baris, program: Map<number, Program>) => React.ReactNode;
  rincian: (r: Baris, program: Map<number, Program>) => Array<{ label: React.ReactNode; value: React.ReactNode }>;
}
const DEF: Record<JenisPengajuanMahasiswa, Def> = {
  status: {
    judul: 'Status akademik',
    ikon: <GraduationCap />,
    path: '/v1/akademik/pengajuan',
    unit: 'BAAK / program studi',
    tombol: 'Ajukan perubahan status',
    batal: ['diajukan'],
    ubah: ['diajukan'],
    aksiBatal: 'batalkan',
    judulBaris: (r) => JENIS_STATUS[String(r.jenis)] ?? String(r.jenis),
    rincian: (r) => [
      { label: 'Jenis', value: JENIS_STATUS[String(r.jenis)] ?? String(r.jenis) },
      ...(r.jenis === 'cuti' ? [{ label: 'Masa cuti', value: `${tgl(r.tanggal_mulai)} s.d. ${tgl(r.tanggal_akhir)}` }] : []),
      ...(r.tujuan ? [{ label: 'Tujuan', value: String(r.tujuan) }] : []),
      { label: 'Alasan', value: String(r.alasan ?? '-') },
      ...(r.hasil_siakad ? [{ label: 'Dicatat ke SIAKAD', value: String(r.hasil_siakad) }] : []),
    ],
  },
  layanan: {
    judul: 'Surat & layanan',
    ikon: <FileText />,
    path: '/v1/layanan/permohonan',
    unit: 'unit pelaksana layanan',
    tombol: 'Ajukan permohonan',
    batal: ['diajukan', 'perlu_perbaikan'],
    ubah: ['diajukan', 'perlu_perbaikan'],
    aksiBatal: 'batalkan',
    kirimUlang: true,
    judulBaris: (r, p) => p.get(Number(r.jenis_id))?.nama ?? `Layanan #${r.jenis_id}`,
    rincian: (r, p) => [
      { label: 'Nomor', value: String(r.nomor ?? '-') },
      { label: 'Layanan', value: p.get(Number(r.jenis_id))?.nama ?? '-' },
      { label: 'Keperluan', value: String(r.keperluan ?? '-') },
      { label: 'Target selesai', value: tgl(r.tenggat) },
    ],
  },
  beasiswa: {
    judul: 'Beasiswa',
    ikon: <Award />,
    path: '/v1/kemahasiswaan/pendaftar',
    unit: 'bagian kemahasiswaan',
    tombol: 'Daftar beasiswa',
    batal: [],
    ubah: ['diajukan'],
    aksiBatal: '',
    judulBaris: (r, p) => p.get(Number(r.beasiswa_id))?.nama ?? `Beasiswa #${r.beasiswa_id}`,
    rincian: (r, p) => [
      { label: 'Program', value: p.get(Number(r.beasiswa_id))?.nama ?? '-' },
      { label: 'IPK (dihitung SIAKAD)', value: r.ipk != null ? Number(r.ipk).toFixed(2) : '-' },
      { label: 'Semester', value: String(r.semester ?? '-') },
      { label: 'Alasan', value: String(r.alasan ?? '-') },
    ],
  },
  mbkm: {
    judul: 'MBKM',
    ikon: <Briefcase />,
    path: '/v1/mbkm/peserta',
    unit: 'program studi',
    tombol: 'Daftar program MBKM',
    batal: [],
    ubah: ['diajukan'],
    aksiBatal: '',
    judulBaris: (r, p) => p.get(Number(r.program_id))?.nama ?? `Program #${r.program_id}`,
    rincian: (r, p) => [
      { label: 'Program', value: p.get(Number(r.program_id))?.nama ?? '-' },
      ...(r.posisi ? [{ label: 'Posisi', value: String(r.posisi) }] : []),
      ...(r.lokasi ? [{ label: 'Lokasi', value: String(r.lokasi) }] : []),
      { label: 'Motivasi', value: String(r.motivasi ?? '-') },
    ],
  },
  dispensasi: {
    judul: 'Dispensasi bayar',
    ikon: <Receipt />,
    path: '/v1/keuangan/dispensasi',
    unit: 'bagian keuangan',
    tombol: 'Ajukan dispensasi',
    batal: ['diajukan'],
    ubah: ['diajukan'],
    aksiBatal: 'batalkan',
    judulBaris: (r) => `Dispensasi ${r.untuk === 'semua' ? 'KRS & ujian' : String(r.untuk).toUpperCase()}`,
    rincian: (r) => [
      { label: 'Untuk', value: r.untuk === 'semua' ? 'KRS dan ujian' : String(r.untuk) },
      { label: 'Janji bayar', value: tgl(r.janji_bayar) },
      { label: 'Jumlah dijanjikan', value: rupiah(r.jumlah_janji) },
      { label: 'Alasan', value: String(r.alasan ?? '-') },
    ],
  },
};

function usePilihanProgram(jenis: JenisPengajuanMahasiswa) {
  const path = jenis === 'layanan' ? '/v1/layanan/jenis' : jenis === 'beasiswa' ? '/v1/kemahasiswaan/beasiswa' : jenis === 'mbkm' ? '/v1/mbkm/program' : null;
  return useSiakadQuery<Program[]>(['pengajuan-program', path], (s, signal) => s.request<Program[]>({ method: 'GET', path: path!, query: { per_page: 100 } }, { signal }), { enabled: Boolean(path), staleTime: 60_000 });
}

// ================================================================ Komponen utama
export interface PengajuanMahasiswaProps {
  nim: string;
  /** Jenis yang ditampilkan (urutan tab). Bawaan semua. */
  jenis?: JenisPengajuanMahasiswa[];
  /** Tab awal. */
  awal?: JenisPengajuanMahasiswa;
  className?: string;
}

/**
 * Pusat pengajuan mandiri mahasiswa ke unit lain (BAAK, unit layanan, kemahasiswaan, prodi, keuangan). Syarat
 * diperiksa sebelum formulir dibuka, dokumen pendukung dikirim bersama pengajuan, dan status + linimasa terlihat
 * sampai diputuskan.
 */
export function PengajuanMahasiswa({ nim, jenis = ['status', 'layanan', 'beasiswa', 'mbkm', 'dispensasi'], awal, className }: PengajuanMahasiswaProps) {
  const [tab, setTab] = React.useState<JenisPengajuanMahasiswa>(awal ?? jenis[0]);
  return (
    <div className={cn('u-pengajuan', className)}>
      <Tabs<JenisPengajuanMahasiswa> items={jenis.map((j) => ({ value: j, label: DEF[j].judul, icon: DEF[j].ikon }))} value={tab} onValueChange={setTab} variant="pill" />
      <DaftarPengajuan key={tab} jenis={tab} nim={nim} />
    </div>
  );
}

function DaftarPengajuan({ jenis, nim }: { jenis: JenisPengajuanMahasiswa; nim: string }) {
  const d = DEF[jenis];
  const q = useSiakadQuery<Baris[]>(['pengajuan', d.path], (s, signal) => s.request<Baris[]>({ method: 'GET', path: d.path, query: { per_page: 50, urut: '-id' } }, { signal }), { staleTime: 10_000 });
  const prog = usePilihanProgram(jenis);
  const peta = React.useMemo(() => new Map((prog.data ?? []).map((p) => [Number(p.id), p])), [prog.data]);
  const [form, setForm] = React.useState(false);
  const [pilih, setPilih] = React.useState<Baris | null>(null);
  const segarkan = () => {
    q.refetch();
    invalidateSiakad('riwayat');
  };
  return (
    <section className="u-pengajuan-bagian">
      <div className="u-pengajuan-kepala">
        <p>
          Diproses oleh <strong>{d.unit}</strong>. Syarat diperiksa otomatis sebelum Anda mengisi formulir.
        </p>
        <Button onClick={() => setForm(true)}>
          <Plus /> {d.tombol}
        </Button>
      </div>
      {q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : !q.data ? (
        <Skeleton style={{ height: 160 }} />
      ) : q.data.length === 0 ? (
        <Empty icon={d.ikon} title="Belum ada pengajuan" description={`Pengajuan ${d.judul.toLowerCase()} Anda dan statusnya akan tampil di sini.`} bordered />
      ) : (
        <ul className="u-pengajuan-daftar">
          {q.data.map((r) => (
            <li key={r.id}>
              <button type="button" className="u-pengajuan-baris" onClick={() => setPilih(r)}>
                <span className="u-pengajuan-ikon" aria-hidden>
                  {d.ikon}
                </span>
                <span className="u-pengajuan-teks">
                  <strong>{d.judulBaris(r, peta)}</strong>
                  <small>
                    <Clock aria-hidden /> Diajukan {tgl(r.created_at)}
                    {r.status === 'perlu_perbaikan' && r.catatan ? ` · ${r.catatan}` : ''}
                  </small>
                </span>
                <span className="u-pengajuan-lencana">
                  <LencanaStatusPengajuan status={r.status} />
                  {r.status !== 'disetujui' && r.status !== 'selesai' && r.status !== 'diterima' && <LabelPemeriksa pemeriksa={r.pemeriksa} />}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <FormPengajuan jenis={jenis} nim={nim} open={form} onOpenChange={setForm} program={prog.data ?? []} onSelesai={segarkan} />
      {pilih && <DetailPengajuan jenis={jenis} id={pilih.id} peta={peta} onClose={() => setPilih(null)} onBerubah={segarkan} />}
    </section>
  );
}

// ---------------------------------------------------------------- Detail
function DetailPengajuan({ jenis, id, peta, onClose, onBerubah }: { jenis: JenisPengajuanMahasiswa; id: number; peta: Map<number, Program>; onClose: () => void; onBerubah: () => void }) {
  const d = DEF[jenis];
  const siakad = useSiakad();
  const toast = useToast();
  const q = useSiakadQuery<Baris>(['pengajuan-detail', d.path, id], (s, signal) => s.request<Baris>({ method: 'GET', path: `${d.path}/${id}` }, { signal }), { staleTime: 0 });
  const [kerja, setKerja] = React.useState(false);
  const aksi = async (nama: string, judul: string) => {
    setKerja(true);
    try {
      await siakad.request({ method: 'POST', path: `${d.path}/${id}/${nama}`, body: {} });
      toast.add({ title: judul, type: 'success' });
      q.refetch();
      onBerubah();
    } catch (e) {
      toast.add({ title: 'Gagal', description: pesanGalat(e), type: 'error' });
    } finally {
      setKerja(false);
    }
  };
  const r = q.data;
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={r ? d.judulBaris(r, peta) : 'Detail pengajuan'}
      description={r ? `Diajukan ${tgl(r.created_at, true)} · diproses ${d.unit}` : undefined}
      footer={
        r && (
          <>
            {d.kirimUlang && r.status === 'perlu_perbaikan' && (
              <Button onClick={() => aksi('kirim-ulang', 'Dikirim ulang')} loading={kerja}>
                <RotateCcw /> Kirim ulang setelah diperbaiki
              </Button>
            )}
            {d.aksiBatal && d.batal.includes(r.status) && (
              <ConfirmDialog
                trigger={
                  <Button variant="destructive-soft" disabled={kerja}>
                    <Ban /> Batalkan pengajuan
                  </Button>
                }
                title="Batalkan pengajuan ini?"
                description="Pengajuan ditandai dibatalkan dan tidak diproses lagi. Anda bisa mengajukan ulang bila syarat terpenuhi."
                confirmLabel="Batalkan pengajuan"
                tone="danger"
                onConfirm={() => aksi(d.aksiBatal, 'Pengajuan dibatalkan')}
              />
            )}
          </>
        )
      }
    >
      {q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : !r ? (
        <Skeleton style={{ height: 240 }} />
      ) : (
        <div className="u-pengajuan-detail">
          <div className="u-pengajuan-status-besar">
            <LencanaStatusPengajuan status={r.status} />
            {r.status === 'perlu_perbaikan' && <span>Lengkapi sesuai catatan lalu kirim ulang.</span>}
          </div>
          {r.catatan && (
            <Alert variant={r.status === 'ditolak' || r.status === 'perlu_perbaikan' ? 'warning' : 'info'} title={`Catatan ${d.unit}`}>
              {String(r.catatan)}
            </Alert>
          )}
          <DescriptionList items={d.rincian(r, peta)} />
          {r.pemeriksa && r.pemeriksa.length > 0 && (
            <Card className="u-pengajuan-kartu">
              <AlurPemeriksa pemeriksa={r.pemeriksa} judul="Siapa yang memeriksa" />
            </Card>
          )}
          <Card className="u-pengajuan-kartu">
            <h3>
              <Paperclip aria-hidden /> Dokumen pendukung
            </h3>
            <LampiranPengajuan path={d.path} id={id} wajib={r.lampiran_wajib} bolehTambah={d.ubah.includes(r.status)} />
          </Card>
          <Card className="u-pengajuan-kartu">
            <h3>
              <History aria-hidden /> Riwayat proses
            </h3>
            <LinimasaPengajuan path={d.path} id={id} />
          </Card>
        </div>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------- Formulir
function FormPengajuan({ jenis, nim, open, onOpenChange, program, onSelesai }: { jenis: JenisPengajuanMahasiswa; nim: string; open: boolean; onOpenChange: (o: boolean) => void; program: Program[]; onSelesai: () => void }) {
  const d = DEF[jenis];
  const siakad = useSiakad();
  const toast = useToast();
  const [isi, setIsi] = React.useState<Record<string, string>>({});
  const [lampiran, setLampiran] = React.useState<string[]>([]);
  const [galat, setGalat] = React.useState<{ pesan: string; isian?: Record<string, string> } | null>(null);
  const [kirim, setKirim] = React.useState(false);
  const prodi = useProdiReferensi();
  React.useEffect(() => {
    if (open) {
      setIsi(jenis === 'status' ? { jenis: 'cuti' } : jenis === 'dispensasi' ? { untuk: 'semua' } : {});
      setLampiran([]);
      setGalat(null);
    }
  }, [open, jenis]);
  const set = (k: string) => (v: string | null) => setIsi((o) => ({ ...o, [k]: v ?? '' }));
  const terpilih = program.find((p) => String(p.id) === isi.program);
  const programBuka = program.filter((p) => (jenis === 'layanan' ? (p as JenisLayanan).aktif !== false : ['buka'].includes(String(p.status))));
  const wajibLampiran = jenis === 'layanan' ? ((terpilih as JenisLayanan | undefined)?.wajib_berkas ? 1 : 0) : Number(terpilih?.lampiran_minimal ?? 0);
  const isianLayanan = React.useMemo(() => {
    const raw = (terpilih as JenisLayanan | undefined)?.isian;
    try {
      const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(v) ? (v as Array<{ nama: string; label?: string; wajib?: boolean }>) : [];
    } catch {
      return [];
    }
  }, [terpilih]);

  const titik =
    jenis === 'status' ? (isi.jenis === 'cuti' ? 'cuti.ajukan' : 'akademik.status.ajukan') : jenis === 'layanan' ? 'layanan.permohonan.ajukan' : jenis === 'beasiswa' ? 'beasiswa.daftar' : jenis === 'mbkm' ? 'mbkm.daftar' : 'keuangan.dispensasi.ajukan';
  const konteks: Record<string, string | number> = { jumlah_lampiran: lampiran.length };
  if (jenis === 'status' && isi.jenis) konteks.jenis_pengajuan = isi.jenis;
  if (jenis === 'layanan' && terpilih) Object.assign(konteks, { kode_layanan: terpilih.kode, kategori_layanan: (terpilih as JenisLayanan).kategori });
  if (jenis === 'beasiswa' && terpilih) konteks.kode_beasiswa = terpilih.kode;
  if (jenis === 'mbkm' && terpilih) konteks.jenis_program_mbkm = String(terpilih.jenis ?? '');
  if (jenis === 'dispensasi' && isi.janji_bayar) konteks.hari_janji_bayar = Math.round((new Date(`${isi.janji_bayar}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
  const butuhProgram = jenis === 'layanan' || jenis === 'beasiswa' || jenis === 'mbkm';

  const body = (): Record<string, unknown> => {
    const b: Record<string, unknown> = { lampiran };
    if (jenis === 'status') Object.assign(b, { jenis: isi.jenis, alasan: isi.alasan, ...(isi.jenis === 'cuti' ? { tanggal_mulai: isi.tanggal_mulai, tanggal_akhir: isi.tanggal_akhir } : {}), ...(isi.jenis?.startsWith('pindah_') ? { tujuan: isi.tujuan } : {}) });
    if (jenis === 'layanan') Object.assign(b, { jenis_id: Number(isi.program), keperluan: isi.keperluan, data: Object.fromEntries(isianLayanan.map((f) => [f.nama, isi[`data.${f.nama}`] ?? ''])) });
    if (jenis === 'beasiswa') Object.assign(b, { beasiswa_id: Number(isi.program), alasan: isi.alasan });
    if (jenis === 'mbkm') Object.assign(b, { program_id: Number(isi.program), posisi: isi.posisi, lokasi: isi.lokasi, motivasi: isi.motivasi });
    if (jenis === 'dispensasi') Object.assign(b, { untuk: isi.untuk, janji_bayar: isi.janji_bayar, jumlah_janji: isi.jumlah_janji ? Number(isi.jumlah_janji) : undefined, alasan: isi.alasan });
    return b;
  };
  const ajukan = async () => {
    setKirim(true);
    setGalat(null);
    try {
      await siakad.request({ method: 'POST', path: d.path, body: body() });
      toast.add({ title: 'Pengajuan terkirim', description: `Status bisa dipantau di daftar ${d.judul.toLowerCase()}.`, type: 'success' });
      onOpenChange(false);
      onSelesai();
    } catch (e) {
      const det = (e as { details?: Record<string, unknown> }).details;
      const isian = det && typeof det === 'object' ? Object.fromEntries(Object.entries(det).filter(([, v]) => typeof v === 'string')) as Record<string, string> : undefined;
      setGalat({ pesan: pesanGalat(e), isian });
    } finally {
      setKirim(false);
    }
  };
  const g = (k: string) => galat?.isian?.[k];
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={d.tombol}
      description={`Diteruskan ke ${d.unit}. Pastikan syarat terpenuhi dan dokumen pendukung lengkap.`}
      footer={
        <Button onClick={ajukan} loading={kirim} disabled={butuhProgram && !isi.program}>
          <Send /> Kirim pengajuan
        </Button>
      }
    >
      <div className="u-pengajuan-form">
        {butuhProgram && (
          <Field label={jenis === 'layanan' ? 'Layanan' : 'Program'} required error={g(jenis === 'layanan' ? 'jenis_id' : jenis === 'beasiswa' ? 'beasiswa_id' : 'program_id')}>
            {programBuka.length === 0 ? (
              <Alert variant="info">{jenis === 'layanan' ? 'Belum ada layanan yang dibuka.' : 'Belum ada program yang membuka pendaftaran.'}</Alert>
            ) : (
              <Select<string> value={isi.program ?? null} onValueChange={set('program')} placeholder="Pilih…" options={programBuka.map((p) => ({ value: String(p.id), label: p.nama }))} />
            )}
          </Field>
        )}
        {terpilih && (
          <Card className="u-pengajuan-info-program">
            {jenis === 'beasiswa' && (
              <DescriptionList
                items={[
                  { label: 'IPK minimal', value: terpilih.ipk_minimal != null ? Number(terpilih.ipk_minimal).toFixed(2) : '-' },
                  { label: 'Semester', value: terpilih.semester_minimal || terpilih.semester_maksimal ? `${terpilih.semester_minimal ?? 1} s.d. ${terpilih.semester_maksimal ?? 14}` : 'Semua' },
                  { label: 'Pendaftaran', value: `${tgl(terpilih.daftar_mulai)} s.d. ${tgl(terpilih.daftar_selesai)}` },
                  { label: 'Kuota', value: String(terpilih.kuota ?? '-') },
                ]}
              />
            )}
            {jenis === 'mbkm' && (
              <DescriptionList
                items={[
                  { label: 'Jenis', value: String(terpilih.jenis ?? '-').replace(/_/g, ' ') },
                  { label: 'Pendaftaran', value: `${tgl(terpilih.daftar_mulai)} s.d. ${tgl(terpilih.daftar_selesai)}` },
                  { label: 'Konversi maksimal', value: `${terpilih.sks_maks ?? '-'} SKS` },
                ]}
              />
            )}
            {jenis === 'layanan' && <DescriptionList items={[{ label: 'Perkiraan selesai', value: `${(terpilih as JenisLayanan).sla_hari ?? '-'} hari kerja` }]} />}
            {terpilih.syarat && (
              <p className="u-pengajuan-syarat-teks">
                <strong>Persyaratan:</strong> {terpilih.syarat}
              </p>
            )}
          </Card>
        )}
        {(!butuhProgram || terpilih) && <SyaratSaya titik={titik} nim={nim} konteks={konteks} judul="Pemeriksaan syarat" />}
        <PratinjauPemeriksa jenis={JENIS_PEMERIKSA[jenis]} judul="Pengajuan ini akan diperiksa oleh" />

        {jenis === 'status' && (
          <>
            <Field label="Jenis pengajuan" required error={g('jenis')}>
              <Select<string> value={isi.jenis ?? null} onValueChange={set('jenis')} options={Object.entries(JENIS_STATUS).map(([value, label]) => ({ value, label }))} />
            </Field>
            {isi.jenis === 'cuti' && (
              <div className="u-pengajuan-dua">
                <Field label="Mulai cuti" required error={g('tanggal_mulai')}>
                  <Input type="date" value={isi.tanggal_mulai ?? ''} onChange={(e) => set('tanggal_mulai')(e.target.value)} />
                </Field>
                <Field label="Akhir cuti" required error={g('tanggal_akhir')}>
                  <Input type="date" value={isi.tanggal_akhir ?? ''} onChange={(e) => set('tanggal_akhir')(e.target.value)} />
                </Field>
              </div>
            )}
            {isi.jenis === 'pindah_prodi' && (
              <Field label="Program studi tujuan" required error={g('tujuan')}>
                <Select<string> value={isi.tujuan ?? null} onValueChange={set('tujuan')} options={(prodi.data ?? []).map((p) => ({ value: p.kode_prodi, label: judulProdi(p) }))} />
              </Field>
            )}
            {(isi.jenis === 'pindah_kelas' || isi.jenis === 'pindah_kampus') && (
              <Field label={isi.jenis === 'pindah_kelas' ? 'Kode kelas tujuan' : 'Kampus tujuan'} required error={g('tujuan')}>
                <Input value={isi.tujuan ?? ''} onChange={(e) => set('tujuan')(e.target.value)} maxLength={20} />
              </Field>
            )}
            <Field label="Alasan" required error={g('alasan')}>
              <Textarea rows={3} value={isi.alasan ?? ''} onChange={(e) => set('alasan')(e.target.value)} />
            </Field>
          </>
        )}
        {jenis === 'layanan' && terpilih && (
          <>
            <Field label="Keperluan" error={g('keperluan')} description="Mis. persyaratan beasiswa, melamar kerja.">
              <Input value={isi.keperluan ?? ''} onChange={(e) => set('keperluan')(e.target.value)} maxLength={255} />
            </Field>
            {isianLayanan.map((f) => (
              <Field key={f.nama} label={f.label ?? f.nama} required={f.wajib} error={g(`data.${f.nama}`)}>
                <Input value={isi[`data.${f.nama}`] ?? ''} onChange={(e) => set(`data.${f.nama}`)(e.target.value)} />
              </Field>
            ))}
          </>
        )}
        {jenis === 'beasiswa' && terpilih && (
          <Field label="Alasan / motivasi" error={g('alasan')}>
            <Textarea rows={3} value={isi.alasan ?? ''} onChange={(e) => set('alasan')(e.target.value)} />
          </Field>
        )}
        {jenis === 'mbkm' && terpilih && (
          <>
            <div className="u-pengajuan-dua">
              <Field label="Posisi/peran yang dilamar" error={g('posisi')}>
                <Input value={isi.posisi ?? ''} onChange={(e) => set('posisi')(e.target.value)} maxLength={150} />
              </Field>
              <Field label="Lokasi" error={g('lokasi')}>
                <Input value={isi.lokasi ?? ''} onChange={(e) => set('lokasi')(e.target.value)} maxLength={255} />
              </Field>
            </div>
            <Field label="Motivasi" error={g('motivasi')}>
              <Textarea rows={3} value={isi.motivasi ?? ''} onChange={(e) => set('motivasi')(e.target.value)} />
            </Field>
          </>
        )}
        {jenis === 'dispensasi' && (
          <>
            <Field label="Dispensasi untuk" required>
              <Select<string>
                value={isi.untuk ?? 'semua'}
                onValueChange={set('untuk')}
                options={[
                  { value: 'semua', label: 'KRS dan ujian' },
                  { value: 'krs', label: 'KRS saja' },
                  { value: 'ujian', label: 'Ujian saja' },
                ]}
              />
            </Field>
            <div className="u-pengajuan-dua">
              <Field label="Tanggal janji bayar" required error={g('janji_bayar')}>
                <Input type="date" value={isi.janji_bayar ?? ''} onChange={(e) => set('janji_bayar')(e.target.value)} />
              </Field>
              <Field label="Jumlah yang dijanjikan (Rp)" error={g('jumlah_janji')}>
                <Input type="number" min={0} value={isi.jumlah_janji ?? ''} onChange={(e) => set('jumlah_janji')(e.target.value)} />
              </Field>
            </div>
            <Field label="Alasan" required error={g('alasan')}>
              <Textarea rows={3} value={isi.alasan ?? ''} onChange={(e) => set('alasan')(e.target.value)} />
            </Field>
          </>
        )}
        <Field label="Dokumen pendukung" required={wajibLampiran > 0} error={g('lampiran')} description="PDF atau foto: surat permohonan, bukti, atau dokumen persyaratan lain.">
          <IsianLampiranPengajuan value={lampiran} onValueChange={setLampiran} wajib={wajibLampiran || undefined} disabled={kirim} />
        </Field>
        {galat && (
          <Alert variant="danger" title="Pengajuan belum bisa dikirim">
            {galat.pesan}
            {galat.isian && Object.keys(galat.isian).length > 0 && (
              <ul>
                {Object.entries(galat.isian).map(([k, v]) => (
                  <li key={k}>
                    {k}: {v}
                  </li>
                ))}
              </ul>
            )}
          </Alert>
        )}
        <p className="u-pengajuan-catatan">
          <Upload aria-hidden /> Dokumen ikut terkirim bersama pengajuan dan bisa dilengkapi selama status masih menunggu.
        </p>
      </div>
    </Sheet>
  );
}
