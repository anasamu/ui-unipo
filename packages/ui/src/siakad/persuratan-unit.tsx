'use client';
/**
 * Persuratan satu unit kerja (BAAK, BAUK, SDM, LPM, PMB, atau unit arsip lain) dalam satu halaman: surat masuk,
 * surat keluar, disposisi saya, format nomor dan templat, serta petugas surat. Dipasang di aplikasi bagian dengan
 * kode unit arsip-nya, mis. <PersuratanUnit kodeUnit="baak" />. Semua lewat /v1/arsip; tindakan yang tampil
 * mengikuti `peran_saya` di unit dan `hak` surat dari API, jadi aturan tetap di server.
 */
import * as React from 'react';
import { Archive, CheckCircle2, CircleUser, Download, FilePlus2, FileText, Inbox, Mail, PenLine, Plus, Send, Settings2, Share2, Stamp, Trash2, UserCog, Users, XCircle } from 'lucide-react';
import { formatDate, formatRelative } from '../lib/format';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Empty, Tabs } from '../components/display';
import { DataTable, type DataColumn } from '../components/data-table';
import { Field, Input, Switch, Textarea } from '../components/forms';
import { ConfirmDialog, Dialog, useToast } from '../components/overlays';
import { Select } from '../components/select';
import { FormGrid } from '../components/wizard';
import { GalatApi } from './galat';
import { PilihEntitas, type SumberEntitas } from './pilih';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { CatatArsipSurat, EditorSuratKeluar, PengaturanPenomoran } from './persuratan';
import { KelolaTemplatSurat, type UnitArsip } from './surat';
import { IsianTanggal } from '../components/formulir';

// ---------------------------------------------------------------- tipe

export interface SuratRingkasArsip {
  id: number;
  uuid: string;
  arah: 'masuk' | 'keluar';
  unit_nama?: string | null;
  nomor_surat: string | null;
  nomor_agenda: string | null;
  tanggal_surat: string | null;
  tanggal_diterima?: string | null;
  tanggal_kirim?: string | null;
  perihal: string;
  pengirim_nama?: string | null;
  pengirim_instansi?: string | null;
  tujuan_ringkas?: string | null;
  sifat: string;
  status: string;
  batas_waktu?: string | null;
  jumlah_file?: number;
}

export type HakSurat = 'kelola' | 'ubah' | 'ajukan' | 'setujui' | 'beri_nomor' | 'kirim' | 'disposisi' | 'selesai' | 'arsipkan' | 'batalkan';

export interface SuratDetailArsip extends SuratRingkasArsip {
  unit_id?: number | null;
  isi: string | null;
  ringkasan: string | null;
  lampiran: string | null;
  keamanan: string;
  penandatangan_nama?: string | null;
  kode_verifikasi?: string | null;
  verifikasi_url?: string | null;
  tujuan: { jenis: string; nama: string | null; username: string | null; unit_nama?: string | null }[];
  persetujuan: { id?: number; urutan?: number; username: string; nama: string | null; peran: string; status: string; catatan: string | null }[];
  disposisi: {
    id: number;
    kepada_nama?: string | null;
    ke_nama?: string | null;
    ke_username?: string | null;
    instruksi?: string[] | null;
    catatan: string | null;
    status: string;
    created_at: string;
  }[];
  file: { uuid: string; nama: string; ukuran?: number }[];
  riwayat?: { aksi: string; oleh: string; created_at: string; catatan?: string | null }[];
  hak: Partial<Record<HakSurat, boolean>>;
}

export interface DisposisiArsip {
  id: number;
  surat_uuid: string;
  perihal: string;
  nomor_surat?: string | null;
  pengirim_nama?: string | null;
  pengirim_instansi?: string | null;
  dari_nama?: string | null;
  dari_jabatan?: string | null;
  instruksi?: string[] | null;
  catatan?: string | null;
  batas_waktu?: string | null;
  status: string;
  lewat_batas?: boolean;
  created_at: string;
}

export interface PetugasArsip {
  id: number;
  unit_id: number;
  username: string;
  nama?: string | null;
  peran: PeranArsip;
  jabatan: string | null;
  bisa_tandatangan: boolean | number;
  aktif: boolean | number;
  mulai?: string | null;
  selesai?: string | null;
}

export type PeranArsip = 'admin' | 'pimpinan' | 'sekretaris' | 'arsiparis' | 'staf';

export const PERAN_ARSIP: { value: PeranArsip; label: string; description: string }[] = [
  { value: 'pimpinan', label: 'Pimpinan', description: 'Melihat semua surat termasuk rahasia, disposisi, menyetujui dan menandatangani' },
  { value: 'admin', label: 'Admin unit', description: 'Semua tindakan, format nomor, templat, dan petugas surat' },
  { value: 'sekretaris', label: 'Sekretaris / TU', description: 'Catat surat masuk, disposisi, beri nomor, kirim surat keluar' },
  { value: 'arsiparis', label: 'Arsiparis', description: 'Catat surat dan arsip lama, dokumen, berkas, peminjaman' },
  { value: 'staf', label: 'Staf', description: 'Menyusun konsep surat keluar, menerima disposisi' },
];

/** Peran yang boleh mengatur nomor dan templat (sama dengan server). */
const PERAN_ATUR = ['admin', 'sekretaris', 'arsiparis'];
/** Peran yang boleh mencatat surat masuk dan arsip surat lama. */
const PERAN_CATAT = ['admin', 'pimpinan', 'sekretaris', 'arsiparis'];

type Nada = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
const NADA_STATUS: Record<string, Nada> = {
  baru: 'info',
  didisposisi: 'secondary',
  diproses: 'warning',
  selesai: 'success',
  diarsipkan: 'neutral',
  dibatalkan: 'danger',
  draf: 'neutral',
  konsep: 'neutral',
  review: 'warning',
  revisi: 'danger',
  disetujui: 'success',
  terkirim: 'info',
  dibaca: 'info',
  dikembalikan: 'danger',
  menunggu: 'warning',
  ditolak: 'danger',
};
const NADA_SIFAT: Record<string, Nada> = { biasa: 'neutral', penting: 'info', segera: 'warning', sangat_segera: 'danger' };
const label = (s: string | null | undefined) => (s ? s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '–');
const tgl = (s: string | null | undefined) => (s ? formatDate(s) : '–');
const STATUS_MASUK = ['baru', 'didisposisi', 'diproses', 'selesai', 'diarsipkan'];
const STATUS_KELUAR = ['draf', 'review', 'revisi', 'disetujui', 'terkirim', 'diarsipkan'];

/** Akun untuk tujuan disposisi dan petugas surat (GET /v1/arsip/pengguna, cukup scope arsip:read). */
export const SUMBER_PENGGUNA_ARSIP: SumberEntitas = {
  nama: 'akun',
  path: '/v1/arsip/pengguna',
  kunci: 'username',
  saringKunci: 'username',
  judul: (r) => String(r.nama || r.username || ''),
  meta: (r) => [r.username, r.jabatan || r.level].filter(Boolean).join(' · '),
  avatar: true,
  ikon: <CircleUser />,
  placeholder: 'Cari nama atau username',
};

// ---------------------------------------------------------------- hook

/** Unit arsip berdasarkan kode (arsip_unit.kode), lengkap dengan `peran_saya`. */
export function useUnitArsipKode(kode: string) {
  const q = useSiakadQuery<UnitArsip[]>(['arsip/unit', 'kode', kode], (s, signal) => s.request<UnitArsip[]>({ method: 'GET', path: '/v1/arsip/unit', query: { q: kode, per_page: 100 } }, { signal }), {
    staleTime: 120_000,
  });
  return { ...q, unit: (q.data ?? []).find((u) => u.kode === kode) ?? null };
}

/** Angka kotak kerja saya (GET /v1/arsip/saya): disposisi aktif/lewat batas, menunggu persetujuan, konsep. */
export function useRingkasSuratSaya() {
  return useSiakadQuery<{ jumlah?: Record<string, number> }>(['arsip/saya'], (s, signal) => s.request({ method: 'GET', path: '/v1/arsip/saya' }, { signal }), { staleTime: 30_000 });
}

/** Unduh atau buka file surat (/v1/arsip/file/{uuid}/unduh) lewat SDK, karena butuh token. */
export async function bukaFileArsip(siakad: ReturnType<typeof useSiakad>, uuid: string, nama: string, unduh = false) {
  const r = await siakad.request<unknown>({ method: 'GET', path: `/v1/arsip/file/${encodeURIComponent(uuid)}/unduh`, query: unduh ? {} : { inline: 1 } });
  const d = r.data as { blob?: () => Blob } | Blob | null;
  const blob = d instanceof Blob ? d : d && typeof d === 'object' && typeof d.blob === 'function' ? d.blob() : null;
  if (!blob) throw new Error('File tidak dapat dibuka.');
  const url = URL.createObjectURL(blob);
  if (unduh) {
    const a = document.createElement('a');
    a.href = url;
    a.download = nama;
    a.click();
  } else {
    window.open(url, '_blank', 'noopener');
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ---------------------------------------------------------------- halaman

export type TabPersuratan = 'masuk' | 'keluar' | 'disposisi' | 'pengaturan' | 'petugas';

export interface PersuratanUnitProps {
  /** Kode unit arsip (arsip_unit.kode), mis. `baak`, `bauk`, `sdm`, `lpm`, `pmb`. */
  kodeUnit: string;
  /** Nama bagian untuk teks petunjuk, mis. "BAAK". Bawaan: nama unit dari API. */
  namaBagian?: string;
  /** Logo kop untuk editor surat keluar. */
  logo?: string;
  tabAwal?: TabPersuratan;
  /** Judul dan keterangan di atas halaman. Isi `false` bila aplikasi sudah punya kepala halaman sendiri (tombol catat/buat surat tetap tampil). */
  kepala?: boolean;
  className?: string;
}

/**
 * Halaman persuratan unit: surat masuk (catat, disposisi, selesai), surat keluar (editor dokumen, persetujuan, nomor,
 * kirim, arsip), disposisi untuk saya, format nomor dan templat, serta petugas surat unit. Pengguna tanpa peran di
 * unit tetap bisa melihat disposisi yang ditujukan kepadanya.
 */
export function PersuratanUnit({ kodeUnit, namaBagian, logo, tabAwal = 'masuk', kepala = true, className }: PersuratanUnitProps) {
  const { unit, loading, error, refetch } = useUnitArsipKode(kodeUnit);
  const saya = useRingkasSuratSaya();
  const j = saya.data?.jumlah ?? {};
  const peran = unit?.peran_saya ?? null;
  const bolehAtur = PERAN_ATUR.includes(peran ?? '');
  const bolehCatat = PERAN_CATAT.includes(peran ?? '');
  const bolehPetugas = peran === 'admin' || peran === 'pimpinan';
  const [tabPilih, setTab] = React.useState<TabPersuratan | null>(null);
  const tabBoleh = (t: TabPersuratan) => (t === 'disposisi' ? true : t === 'masuk' || t === 'keluar' ? Boolean(peran) : t === 'pengaturan' ? bolehAtur : bolehPetugas);
  const tab: TabPersuratan = tabPilih && tabBoleh(tabPilih) ? tabPilih : tabBoleh(tabAwal) ? tabAwal : peran ? 'masuk' : 'disposisi';
  const [buka, setBuka] = React.useState<string | null>(null);
  const [catat, setCatat] = React.useState<'masuk' | 'keluar' | null>(null);
  const [editor, setEditor] = React.useState<{ surat: string | null } | null>(null);
  const nama = namaBagian ?? unit?.singkatan ?? unit?.nama ?? kodeUnit.toUpperCase();
  const segarkan = () => invalidateSiakad('arsip');

  if (loading) {
    return (
      <div className={['u-psu', className].filter(Boolean).join(' ')}>
        <Skeleton style={{ height: 72 }} />
        <Skeleton style={{ height: 320 }} />
      </div>
    );
  }
  if (error) return <GalatApi error={error} onRetry={refetch} />;

  const tabs = [
    ...(peran
      ? [
          { value: 'masuk' as const, label: 'Surat masuk', icon: <Inbox /> },
          { value: 'keluar' as const, label: 'Surat keluar', icon: <Send /> },
        ]
      : []),
    { value: 'disposisi' as const, label: 'Disposisi saya', icon: <Share2 />, count: j.disposisi_aktif || undefined },
    ...(bolehAtur ? [{ value: 'pengaturan' as const, label: 'Nomor & templat', icon: <Settings2 /> }] : []),
    ...(bolehPetugas ? [{ value: 'petugas' as const, label: 'Petugas surat', icon: <Users /> }] : []),
  ];

  return (
    <div className={['u-psu', className].filter(Boolean).join(' ')}>
      {(kepala || (unit && peran)) && (
        <header className="u-psu-kepala" data-tanpa-judul={kepala ? undefined : ''}>
          {kepala && (
            <div>
              <h2>Surat masuk & keluar</h2>
              <p>{unit ? `${unit.nama}${peran ? ` · Anda: ${label(peran)}` : ''}` : nama}</p>
            </div>
          )}
          {unit && peran && (
            <div className="u-psu-alat">
              {bolehCatat && (
                <Button variant="outline" onClick={() => setCatat(tab === 'keluar' ? 'keluar' : 'masuk')}>
                  <Inbox aria-hidden /> Catat surat / arsip lama
                </Button>
              )}
              <Button onClick={() => setEditor({ surat: null })}>
                <FilePlus2 aria-hidden /> Buat surat keluar
              </Button>
            </div>
          )}
        </header>
      )}

      {!unit ? (
        <Alert variant="warning" title={`Unit surat ${nama} belum terdaftar`}>
          Admin arsip SIAKAD perlu menjalankan <b>Arsip » Unit » Sinkron dari SIAKAD</b> (atau <code>php artisan migrate</code>) agar unit <code>{kodeUnit}</code> dibuat.
        </Alert>
      ) : (
        <>
          {!peran && (
            <Alert variant="info" title={`Anda belum menjadi petugas surat ${nama}`}>
              Disposisi yang ditujukan kepada Anda tetap tampil di sini. Untuk mencatat dan mengirim surat atas nama {nama}, minta admin unit menambahkan Anda di tab Petugas surat.
            </Alert>
          )}
          <div className="u-psu-ringkas">
            <Angka label="Disposisi untuk saya" nilai={j.disposisi_aktif} nada="secondary" onClick={() => setTab('disposisi')} />
            <Angka label="Lewat batas waktu" nilai={j.disposisi_lewat_batas} nada="danger" />
            <Angka label="Menunggu persetujuan saya" nilai={j.menunggu_persetujuan} nada="warning" />
            <Angka label="Konsep saya" nilai={j.konsep_saya} nada="info" onClick={peran ? () => setTab('keluar') : undefined} />
          </div>
          <Tabs<TabPersuratan> items={tabs} value={tab} onValueChange={setTab} />
          {tab === 'masuk' || tab === 'keluar' ? (
            <DaftarSuratUnit key={tab} unitId={unit.id} arah={tab} onBuka={setBuka} />
          ) : tab === 'disposisi' ? (
            <KotakDisposisiSaya onBuka={setBuka} />
          ) : tab === 'pengaturan' ? (
            <div className="u-psu-bagian">
              <section>
                <h3>
                  <Settings2 aria-hidden /> Format nomor surat
                </h3>
                <p>Nomor surat keluar dan agenda dibuat otomatis dari format ini saat surat disetujui atau dicatat.</p>
                <PengaturanPenomoran unitId={unit.id} />
              </section>
              <section>
                <h3>
                  <FileText aria-hidden /> Templat surat
                </h3>
                <p>Templat ditulis di editor dokumen dengan penanda data, lalu dipilih saat membuat surat keluar.</p>
                <KelolaTemplatSurat tinggi="calc(100dvh - 10rem)" />
              </section>
            </div>
          ) : (
            <KelolaPetugasSurat unitId={unit.id} bolehUbah={peran === 'admin'} />
          )}
        </>
      )}

      {buka && (
        <DetailSuratArsip
          uuid={buka}
          onClose={() => setBuka(null)}
          onSunting={(uuid) => {
            setBuka(null);
            setEditor({ surat: uuid });
          }}
        />
      )}
      {catat && unit && (
        <Dialog
          open
          onOpenChange={(o) => !o && setCatat(null)}
          side="right"
          size="lg"
          title="Catat surat / arsip lama"
          description="Surat masuk diberi nomor agenda otomatis. Surat keluar yang ditandatangani di luar sistem dicatat dengan nomornya."
        >
          <CatatArsipSurat
            unitId={unit.id}
            arahAwal={catat}
            onBatal={() => setCatat(null)}
            onSelesai={(s) => {
              setCatat(null);
              segarkan();
              if (s.arah === 'masuk' || s.arah === 'keluar') setTab(s.arah);
              if (s.uuid) setBuka(s.uuid);
            }}
          />
        </Dialog>
      )}
      {editor && unit && (
        <div className="u-psu-editor" role="dialog" aria-modal="true" aria-label="Editor surat keluar">
          <EditorSuratKeluar
            unitId={unit.id}
            surat={editor.surat}
            logo={logo}
            tinggi="calc(100dvh - 1.5rem)"
            onTutup={() => {
              setEditor(null);
              segarkan();
            }}
            onSelesai={(s) => {
              setEditor(null);
              segarkan();
              setTab('keluar');
              if (s.uuid) setBuka(s.uuid);
            }}
          />
        </div>
      )}
    </div>
  );
}

function Angka({ label: l, nilai, nada, onClick }: { label: string; nilai?: number; nada: Nada; onClick?: () => void }) {
  const isi = (
    <>
      <span className="u-psu-angka-nilai" data-nada={nada}>
        {nilai ?? '–'}
      </span>
      <span className="u-psu-angka-label">{l}</span>
    </>
  );
  return onClick ? (
    <button type="button" className="u-psu-angka" onClick={onClick}>
      {isi}
    </button>
  ) : (
    <div className="u-psu-angka">{isi}</div>
  );
}

// ---------------------------------------------------------------- daftar surat

export interface DaftarSuratUnitProps {
  unitId: number;
  arah: 'masuk' | 'keluar';
  /** Sertakan surat unit turunan (bawaan ya). */
  turunan?: boolean;
  onBuka?: (uuid: string) => void;
}

/** Tabel surat masuk/keluar satu unit dengan pencarian, saringan status, dan halaman. */
export function DaftarSuratUnit({ unitId, arah, turunan = true, onBuka }: DaftarSuratUnitProps) {
  const [cari, setCari] = React.useState('');
  const [kata, setKata] = React.useState('');
  const [status, setStatus] = React.useState<string>('');
  const [hal, setHal] = React.useState(1);
  React.useEffect(() => {
    const t = setTimeout(() => {
      setKata(cari.trim());
      setHal(1);
    }, 350);
    return () => clearTimeout(t);
  }, [cari]);
  const query = { unit_id: unitId, turunan: turunan ? 1 : undefined, q: kata || undefined, status: status || undefined, page: hal, per_page: 20, urut: 'terbaru' };
  const q = useSiakadQuery<SuratRingkasArsip[]>(['arsip/surat', arah, query], (s, signal) => s.request<SuratRingkasArsip[]>({ method: 'GET', path: `/v1/arsip/surat-${arah}`, query }, { signal }), {
    staleTime: 15_000,
  });
  const kolom: DataColumn<SuratRingkasArsip>[] = [
    {
      key: 'perihal',
      header: 'Perihal',
      mobile: 'title',
      cell: (s) => (
        <div className="u-psu-sel">
          <b>{s.perihal}</b>
          <small>
            {s.nomor_surat ?? 'Belum bernomor'}
            {s.nomor_agenda ? ` · agenda ${s.nomor_agenda}` : ''}
          </small>
        </div>
      ),
    },
    {
      key: 'pihak',
      header: arah === 'masuk' ? 'Pengirim' : 'Tujuan',
      mobile: 'subtitle',
      cell: (s) => (arah === 'masuk' ? s.pengirim_instansi || s.pengirim_nama || '–' : s.tujuan_ringkas || '–'),
    },
    { key: 'tanggal', header: 'Tanggal', shrink: true, mobile: 'meta', cell: (s) => tgl(arah === 'masuk' ? (s.tanggal_diterima ?? s.tanggal_surat) : (s.tanggal_kirim ?? s.tanggal_surat)) },
    { key: 'sifat', header: 'Sifat', shrink: true, mobile: 'hidden', cell: (s) => <Badge variant={NADA_SIFAT[s.sifat] ?? 'neutral'}>{label(s.sifat)}</Badge> },
    {
      key: 'status',
      header: 'Status',
      shrink: true,
      mobile: 'badge',
      cell: (s) => (
        <Badge dot variant={NADA_STATUS[s.status] ?? 'neutral'}>
          {label(s.status)}
        </Badge>
      ),
    },
  ];
  return (
    <div className="u-psu-daftar">
      <div className="u-psu-saring">
        <Input type="search" size="sm" aria-label="Cari surat" placeholder="Cari perihal, nomor, pengirim…" value={cari} onChange={(e) => setCari(e.target.value)} />
        <div className="u-psu-status">
          <Select<string>
            size="sm"
            aria-label="Status"
            value={status || 'semua'}
            onValueChange={(v) => {
              setStatus(!v || v === 'semua' ? '' : v);
              setHal(1);
            }}
            options={[{ value: 'semua', label: 'Semua status' }, ...(arah === 'masuk' ? STATUS_MASUK : STATUS_KELUAR).map((v) => ({ value: v, label: label(v) }))]}
          />
        </div>
      </div>
      <DataTable<SuratRingkasArsip>
        columns={kolom}
        rows={q.data}
        rowKey={(s) => s.uuid}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
        onRowClick={onBuka ? (s) => onBuka(s.uuid) : undefined}
        page={hal}
        perPage={20}
        total={q.meta?.total ?? undefined}
        onPageChange={setHal}
        filtered={Boolean(kata || status)}
        emptyFiltered={{
          onReset: () => {
            setCari('');
            setStatus('');
          },
        }}
        empty={{
          icon: <Mail />,
          title: arah === 'masuk' ? 'Belum ada surat masuk' : 'Belum ada surat keluar',
          description: arah === 'masuk' ? 'Catat surat yang diterima unit agar mendapat nomor agenda dan bisa didisposisikan.' : 'Buat surat keluar di editor dokumen, ajukan persetujuan, lalu kirim.',
        }}
        exportCsv={`surat-${arah}`}
      />
    </div>
  );
}

// ---------------------------------------------------------------- disposisi saya

/** Kotak disposisi yang ditujukan kepada saya (dan unit saya), yang belum selesai di atas. */
export function KotakDisposisiSaya({ onBuka }: { onBuka?: (uuid: string) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [semua, setSemua] = React.useState(false);
  const q = useSiakadQuery<DisposisiArsip[]>(
    ['arsip/disposisi', semua],
    (s, signal) => s.request<DisposisiArsip[]>({ method: 'GET', path: '/v1/arsip/disposisi', query: { kotak: 'masuk', aktif: semua ? undefined : 1, per_page: 50 } }, { signal }),
    { staleTime: 15_000 },
  );
  const [lapor, setLapor] = React.useState<{ d: DisposisiArsip; aksi: 'selesai' | 'kembalikan' } | null>(null);
  const [laporan, setLaporan] = React.useState('');
  const [sibuk, setSibuk] = React.useState(false);
  const jalankan = async (d: DisposisiArsip, aksi: 'proses' | 'selesai' | 'kembalikan', isi?: string) => {
    setSibuk(true);
    try {
      await siakad.request({ method: 'POST', path: `/v1/arsip/disposisi/${d.id}/${aksi}`, body: isi ? { laporan: isi } : {} });
      toast.add({ title: aksi === 'selesai' ? 'Disposisi selesai.' : aksi === 'kembalikan' ? 'Disposisi dikembalikan.' : 'Disposisi ditandai diproses.', type: 'success' });
      setLapor(null);
      setLaporan('');
      invalidateSiakad('arsip');
    } catch (e) {
      toast.add({ title: pesanGalat(e), type: 'error' });
    } finally {
      setSibuk(false);
    }
  };
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  return (
    <div className="u-psu-daftar">
      <div className="u-psu-saring">
        <label className="u-psu-tombol-alih">
          <Switch checked={semua} onCheckedChange={setSemua} size="sm" /> Tampilkan yang sudah selesai
        </label>
      </div>
      {q.loading && !q.data ? (
        <Skeleton style={{ height: 160 }} />
      ) : !(q.data ?? []).length ? (
        <Empty icon={<CheckCircle2 />} title="Tidak ada disposisi" description="Disposisi surat yang ditujukan kepada Anda akan tampil di sini." bordered />
      ) : (
        <ul className="u-psu-disposisi">
          {(q.data ?? []).map((d) => (
            <li key={d.id} data-lewat={d.lewat_batas ? '' : undefined}>
              <button type="button" className="u-psu-disposisi-isi" onClick={() => onBuka?.(d.surat_uuid)}>
                <Share2 aria-hidden />
                <span>
                  <b>{d.perihal}</b>
                  <small>
                    Dari {d.dari_nama ?? '–'}
                    {d.dari_jabatan ? ` (${d.dari_jabatan})` : ''} · {formatRelative(d.created_at)}
                    {d.batas_waktu ? ` · batas ${tgl(d.batas_waktu)}` : ''}
                  </small>
                  {(d.instruksi?.length || d.catatan) && <small className="u-psu-instruksi">{[...(d.instruksi ?? []), d.catatan].filter(Boolean).join(' · ')}</small>}
                </span>
              </button>
              <div className="u-psu-disposisi-aksi">
                <Badge dot variant={d.lewat_batas ? 'danger' : (NADA_STATUS[d.status] ?? 'neutral')}>
                  {d.lewat_batas ? 'Lewat batas' : label(d.status)}
                </Badge>
                {['baru', 'dibaca'].includes(d.status) && (
                  <Button size="sm" variant="ghost" disabled={sibuk} onClick={() => jalankan(d, 'proses')}>
                    Proses
                  </Button>
                )}
                {['baru', 'dibaca', 'diproses'].includes(d.status) && (
                  <>
                    <Button size="sm" variant="ghost" disabled={sibuk} onClick={() => setLapor({ d, aksi: 'kembalikan' })}>
                      Kembalikan
                    </Button>
                    <Button size="sm" variant="soft" disabled={sibuk} onClick={() => setLapor({ d, aksi: 'selesai' })}>
                      Selesai
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {lapor && (
        <Dialog
          open
          onOpenChange={(o) => !o && setLapor(null)}
          title={lapor.aksi === 'selesai' ? 'Laporkan tindak lanjut' : 'Kembalikan disposisi'}
          description={lapor.d.perihal}
          footer={
            <>
              <Button variant="ghost" onClick={() => setLapor(null)}>
                Batal
              </Button>
              <Button
                variant={lapor.aksi === 'kembalikan' ? 'destructive' : 'primary'}
                loading={sibuk}
                disabled={lapor.aksi === 'kembalikan' && !laporan.trim()}
                onClick={() => jalankan(lapor.d, lapor.aksi, laporan.trim() || undefined)}
              >
                {lapor.aksi === 'selesai' ? 'Tandai selesai' : 'Kembalikan ke pengirim'}
              </Button>
            </>
          }
        >
          <Field label={lapor.aksi === 'selesai' ? 'Laporan tindak lanjut' : 'Alasan'} required={lapor.aksi === 'kembalikan'} optional={lapor.aksi === 'selesai'}>
            <Textarea
              rows={4}
              value={laporan}
              onChange={(e) => setLaporan(e.target.value)}
              placeholder={lapor.aksi === 'selesai' ? 'Mis. sudah ditindaklanjuti dengan surat balasan nomor …' : 'Mis. bukan kewenangan bagian kami'}
            />
          </Field>
        </Dialog>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- detail surat

export interface DetailSuratArsipProps {
  uuid: string;
  onClose: () => void;
  /** Buka surat keluar di editor (tampil bila `hak.ubah`). */
  onSunting?: (uuid: string) => void;
}

/** Panel detail surat: isi, file, tujuan, persetujuan, disposisi, riwayat, dan tindakan sesuai `hak` dari API. */
export function DetailSuratArsip({ uuid, onClose, onSunting }: DetailSuratArsipProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useSiakadQuery<SuratDetailArsip>(
    ['arsip/surat', 'detail', uuid],
    (s, signal) => s.request<SuratDetailArsip>({ method: 'GET', path: `/v1/arsip/surat/${encodeURIComponent(uuid)}` }, { signal }),
    { staleTime: 0 },
  );
  const s = q.data;
  const [mode, setMode] = React.useState<'disposisi' | 'ajukan' | 'tolak' | 'batalkan' | null>(null);
  const [tujuan, setTujuan] = React.useState<string[]>([]);
  const [pilih, setPilih] = React.useState<string | null>(null);
  const [catatan, setCatatan] = React.useState('');
  const [batas, setBatas] = React.useState('');
  const [sibuk, setSibuk] = React.useState(false);
  const petugas = useSiakadQuery<PetugasArsip[]>(
    ['arsip/petugas', s?.unit_id ?? 0],
    (x, signal) => x.request<PetugasArsip[]>({ method: 'GET', path: `/v1/arsip/unit/${s?.unit_id}/petugas` }, { signal }),
    { enabled: mode === 'ajukan' && Boolean(s?.unit_id) },
  );
  const penandatangan = (petugas.data ?? []).filter((p) => Number(p.bisa_tandatangan) && Number(p.aktif ?? 1));

  const jalankan = async (aksi: string, body: unknown = {}, pesan = 'Surat diperbarui.') => {
    setSibuk(true);
    try {
      await siakad.request({ method: 'POST', path: `/v1/arsip/surat/${encodeURIComponent(uuid)}/${aksi}`, body });
      toast.add({ title: pesan, type: 'success' });
      setMode(null);
      setTujuan([]);
      setCatatan('');
      setBatas('');
      invalidateSiakad('arsip');
      q.refetch();
    } catch (e) {
      toast.add({ title: pesanGalat(e), type: 'error' });
    } finally {
      setSibuk(false);
    }
  };
  const buka = async (f: { uuid: string; nama: string }) => {
    try {
      await bukaFileArsip(siakad, f.uuid, f.nama);
    } catch (e) {
      toast.add({ title: pesanGalat(e), type: 'error' });
    }
  };
  const hak = s?.hak ?? {};

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      side="right"
      size="xl"
      title={s?.perihal ?? 'Surat'}
      description={s ? `${s.arah === 'masuk' ? 'Surat masuk' : 'Surat keluar'} · ${s.nomor_surat ?? 'belum bernomor'}${s.nomor_agenda ? ` · agenda ${s.nomor_agenda}` : ''}` : undefined}
      footer={
        s && (
          <div className="u-psu-aksi">
            {hak.ubah && s.arah === 'keluar' && onSunting && (
              <Button variant="outline" onClick={() => onSunting(s.uuid)}>
                <PenLine aria-hidden /> Sunting
              </Button>
            )}
            {hak.disposisi && (
              <Button variant="outline" onClick={() => setMode('disposisi')}>
                <Share2 aria-hidden /> Disposisi
              </Button>
            )}
            {hak.ajukan && (
              <Button variant="outline" onClick={() => setMode('ajukan')}>
                <Stamp aria-hidden /> Ajukan persetujuan
              </Button>
            )}
            {hak.setujui && (
              <>
                <Button variant="outline" onClick={() => setMode('tolak')}>
                  <XCircle aria-hidden /> Kembalikan
                </Button>
                <Button loading={sibuk} onClick={() => jalankan('setujui', {}, 'Surat disetujui.')}>
                  <CheckCircle2 aria-hidden /> Setujui
                </Button>
              </>
            )}
            {hak.beri_nomor && !s.nomor_surat && (
              <Button variant="outline" loading={sibuk} onClick={() => jalankan('nomor', {}, 'Nomor surat diberikan.')}>
                Beri nomor
              </Button>
            )}
            {hak.kirim && (
              <Button loading={sibuk} onClick={() => jalankan('kirim', {}, 'Surat dikirim.')}>
                <Send aria-hidden /> Kirim
              </Button>
            )}
            {hak.selesai && (
              <Button variant="outline" loading={sibuk} onClick={() => jalankan('selesai', {}, 'Surat ditandai selesai.')}>
                <CheckCircle2 aria-hidden /> Selesai
              </Button>
            )}
            {hak.arsipkan && (
              <Button variant="outline" loading={sibuk} onClick={() => jalankan('arsipkan', {}, 'Surat diarsipkan.')}>
                <Archive aria-hidden /> Arsipkan
              </Button>
            )}
            {hak.batalkan && (
              <Button variant="destructive-soft" onClick={() => setMode('batalkan')}>
                Batalkan
              </Button>
            )}
          </div>
        )
      }
    >
      {q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : !s ? (
        <div className="u-psu-bagian">
          <Skeleton style={{ height: 96 }} />
          <Skeleton style={{ height: 240 }} />
        </div>
      ) : (
        <div className="u-psu-detail">
          <div className="u-psu-detail-utama">
            <div className="u-psu-lencana">
              <Badge dot variant={NADA_STATUS[s.status] ?? 'neutral'}>
                {label(s.status)}
              </Badge>
              <Badge variant={NADA_SIFAT[s.sifat] ?? 'neutral'}>{label(s.sifat)}</Badge>
              {s.keamanan && s.keamanan !== 'biasa' && <Badge variant="outline">{label(s.keamanan)}</Badge>}
            </div>
            {mode && (
              <div className="u-psu-formulir">
                {mode === 'disposisi' && (
                  <>
                    <Field label="Teruskan kepada" description="Pilih satu per satu; bisa lebih dari satu orang.">
                      <PilihEntitas jenis={SUMBER_PENGGUNA_ARSIP} value={null} onValueChange={(v) => v && !tujuan.includes(v) && setTujuan([...tujuan, v])} placeholder="Cari nama atau username" />
                    </Field>
                    {tujuan.length > 0 && (
                      <div className="u-psu-lencana">
                        {tujuan.map((t) => (
                          <Badge key={t} variant="secondary">
                            {t}{' '}
                            <Button variant="ghost" size="xs" iconOnly aria-label={`Hapus ${t}`} className="u-psu-hapus" onClick={() => setTujuan(tujuan.filter((x) => x !== t))}>
                              ×
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <FormGrid>
                      <Field label="Instruksi / catatan">
                        <Textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Mis. tindak lanjuti, hadiri, siapkan bahan" />
                      </Field>
                      <Field label="Batas waktu" optional>
                        <IsianTanggal value={batas} onValueChange={(v) => setBatas(v)} />
                      </Field>
                    </FormGrid>
                    <Button
                      disabled={!tujuan.length}
                      loading={sibuk}
                      onClick={() =>
                        jalankan(
                          'disposisi',
                          { tujuan: tujuan.map((u) => ({ username: u })), instruksi: catatan ? [catatan] : [], catatan: catatan || undefined, batas_waktu: batas || undefined },
                          'Disposisi dikirim.',
                        )
                      }
                    >
                      Kirim disposisi
                    </Button>
                  </>
                )}
                {mode === 'ajukan' && (
                  <>
                    <Field label="Penandatangan" description="Petugas unit yang diberi hak tanda tangan (tab Petugas surat).">
                      <Select<string>
                        value={pilih}
                        onValueChange={setPilih}
                        placeholder={petugas.loading ? 'Memuat…' : penandatangan.length ? 'Pilih penandatangan' : 'Belum ada petugas bertanda tangan'}
                        options={penandatangan.map((p) => ({ value: p.username, label: p.nama ?? p.username, description: p.jabatan ?? label(p.peran) }))}
                      />
                    </Field>
                    <Button disabled={!pilih} loading={sibuk} onClick={() => jalankan('ajukan', { persetujuan: [{ username: pilih, peran: 'tandatangan' }] }, 'Surat diajukan untuk persetujuan.')}>
                      Ajukan
                    </Button>
                  </>
                )}
                {(mode === 'tolak' || mode === 'batalkan') && (
                  <>
                    <Field label={mode === 'tolak' ? 'Catatan revisi' : 'Alasan pembatalan'} required>
                      <Textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
                    </Field>
                    <Button
                      variant="destructive"
                      disabled={!catatan.trim()}
                      loading={sibuk}
                      onClick={() => jalankan(mode, { catatan }, mode === 'tolak' ? 'Surat dikembalikan untuk revisi.' : 'Surat dibatalkan.')}
                    >
                      {mode === 'tolak' ? 'Kembalikan untuk revisi' : 'Batalkan surat'}
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
                  Tutup formulir
                </Button>
              </div>
            )}
            <dl className="u-psu-dl">
              <div>
                <dt>{s.arah === 'masuk' ? 'Pengirim' : 'Tujuan'}</dt>
                <dd>
                  {s.arah === 'masuk'
                    ? [s.pengirim_nama, s.pengirim_instansi].filter(Boolean).join(', ') || '–'
                    : (s.tujuan ?? [])
                        .map((t) => t.nama ?? t.unit_nama ?? t.username)
                        .filter(Boolean)
                        .join('; ') || '–'}
                </dd>
              </div>
              <div>
                <dt>Tanggal surat</dt>
                <dd>{tgl(s.tanggal_surat)}</dd>
              </div>
              {s.arah === 'masuk' && (
                <div>
                  <dt>Diterima</dt>
                  <dd>{tgl(s.tanggal_diterima)}</dd>
                </div>
              )}
              {s.batas_waktu && (
                <div>
                  <dt>Batas waktu</dt>
                  <dd>{tgl(s.batas_waktu)}</dd>
                </div>
              )}
              {s.penandatangan_nama && (
                <div>
                  <dt>Ditandatangani</dt>
                  <dd>{s.penandatangan_nama}</dd>
                </div>
              )}
              {s.lampiran && (
                <div>
                  <dt>Lampiran</dt>
                  <dd>{s.lampiran}</dd>
                </div>
              )}
            </dl>
            {s.ringkasan && <p className="u-psu-ringkasan">{s.ringkasan}</p>}
            {(s.file ?? []).length > 0 && (
              <div className="u-psu-file">
                {s.file.map((f, i) => (
                  <Button key={f.uuid} variant="outline" size="sm" onClick={() => buka(f)}>
                    <Download aria-hidden /> {f.nama}
                    {i > 0 && <small> lampiran</small>}
                  </Button>
                ))}
              </div>
            )}
            {s.isi && <div className="u-psu-isi" dangerouslySetInnerHTML={{ __html: s.isi }} />}
          </div>
          <aside className="u-psu-samping">
            {(s.persetujuan ?? []).length > 0 && (
              <section>
                <h4>Persetujuan</h4>
                {s.persetujuan.map((p, i) => (
                  <p key={p.id ?? i} className="u-psu-baris">
                    <span>
                      {p.nama ?? p.username} <small>({p.peran})</small>
                    </span>
                    <Badge variant={NADA_STATUS[p.status] ?? 'warning'}>{label(p.status)}</Badge>
                  </p>
                ))}
              </section>
            )}
            <section>
              <h4>Disposisi</h4>
              {(s.disposisi ?? []).length ? (
                s.disposisi.map((d) => (
                  <div key={d.id} className="u-psu-jejak">
                    <p>{d.kepada_nama ?? d.ke_nama ?? d.ke_username}</p>
                    <small>
                      {[...(d.instruksi ?? []), d.catatan].filter(Boolean).join(', ')} · {label(d.status)}
                    </small>
                  </div>
                ))
              ) : (
                <small>Belum ada.</small>
              )}
            </section>
            {s.riwayat && s.riwayat.length > 0 && (
              <section>
                <h4>Riwayat</h4>
                <ol className="u-psu-riwayat">
                  {s.riwayat.slice(0, 15).map((r, i) => (
                    <li key={i}>
                      <b>{label(r.aksi)}</b>{' '}
                      <small>
                        · {r.oleh} · {formatRelative(r.created_at)}
                      </small>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </aside>
        </div>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------- petugas surat

export interface KelolaPetugasSuratProps {
  unitId: number;
  /** Tambah/ubah/hapus (admin unit). Tanpa ini hanya daftar. */
  bolehUbah?: boolean;
}

/** Petugas surat unit (arsip_petugas): pimpinan penandatangan, admin, sekretaris/TU, arsiparis, staf. */
export function KelolaPetugasSurat({ unitId, bolehUbah = false }: KelolaPetugasSuratProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useSiakadQuery<PetugasArsip[]>(['arsip/petugas', unitId], (s, signal) => s.request<PetugasArsip[]>({ method: 'GET', path: `/v1/arsip/unit/${unitId}/petugas` }, { signal }));
  const [form, setForm] = React.useState<Partial<PetugasArsip> | null>(null);
  const [hapus, setHapus] = React.useState<PetugasArsip | null>(null);
  const [sibuk, setSibuk] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);

  const simpan = async () => {
    if (!form) return;
    setSibuk(true);
    setGalat(null);
    try {
      const body = {
        username: form.username,
        peran: form.peran,
        jabatan: form.jabatan || null,
        bisa_tandatangan: Boolean(Number(form.bisa_tandatangan ?? 0)),
        aktif: Boolean(Number(form.aktif ?? 1)),
        mulai: form.mulai || null,
        selesai: form.selesai || null,
      };
      await siakad.request(form.id ? { method: 'PUT', path: `/v1/arsip/petugas/${form.id}`, body } : { method: 'POST', path: `/v1/arsip/unit/${unitId}/petugas`, body });
      toast.add({ title: form.id ? 'Petugas diperbarui.' : 'Petugas ditambahkan.', type: 'success' });
      setForm(null);
      invalidateSiakad('arsip');
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSibuk(false);
    }
  };

  const kolom: DataColumn<PetugasArsip>[] = [
    {
      key: 'nama',
      header: 'Petugas',
      mobile: 'title',
      cell: (p) => (
        <div className="u-psu-sel">
          <b>{p.nama ?? p.username}</b>
          <small>
            {p.username}
            {p.jabatan ? ` · ${p.jabatan}` : ''}
          </small>
        </div>
      ),
    },
    { key: 'peran', header: 'Peran', shrink: true, mobile: 'subtitle', cell: (p) => PERAN_ARSIP.find((x) => x.value === p.peran)?.label ?? p.peran },
    { key: 'ttd', header: 'Tanda tangan', shrink: true, mobile: 'meta', cell: (p) => (Number(p.bisa_tandatangan) ? <Badge variant="success">Ya</Badge> : '–') },
    {
      key: 'aktif',
      header: 'Status',
      shrink: true,
      mobile: 'badge',
      cell: (p) => (
        <Badge dot variant={Number(p.aktif) ? 'success' : 'neutral'}>
          {Number(p.aktif) ? 'Aktif' : 'Nonaktif'}
          {p.selesai ? ` s.d. ${tgl(p.selesai)}` : ''}
        </Badge>
      ),
    },
  ];

  return (
    <div className="u-psu-daftar">
      <div className="u-psu-saring">
        <p className="u-psu-petunjuk">
          <UserCog aria-hidden /> Pimpinan yang diberi hak tanda tangan bisa dipilih saat surat keluar diajukan. Pemegang izin persuratan dari menu Akses tetap bisa bekerja tanpa didaftarkan di sini.
        </p>
        {bolehUbah && (
          <Button
            size="sm"
            onClick={() => {
              setGalat(null);
              setForm({ peran: 'staf', aktif: 1, bisa_tandatangan: 0 });
            }}
          >
            <Plus aria-hidden /> Tambah petugas
          </Button>
        )}
      </div>
      <DataTable<PetugasArsip>
        columns={kolom}
        rows={q.data}
        rowKey={(p) => String(p.id)}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
        rowActions={
          bolehUbah
            ? (p) => [
                {
                  label: 'Ubah',
                  icon: <PenLine />,
                  onSelect: () => {
                    setGalat(null);
                    setForm(p);
                  },
                },
                { label: 'Hapus', icon: <Trash2 />, destructive: true, onSelect: () => setHapus(p) },
              ]
            : undefined
        }
        empty={{ icon: <Users />, title: 'Belum ada petugas surat', description: 'Tambahkan pimpinan (penandatangan), sekretaris/TU, arsiparis, dan staf unit ini.' }}
      />
      {form && (
        <Dialog
          side="right"
          open
          onOpenChange={(o) => !o && setForm(null)}
          title={form.id ? 'Ubah petugas surat' : 'Tambah petugas surat'}
          footer={
            <>
              <Button variant="ghost" onClick={() => setForm(null)}>
                Batal
              </Button>
              <Button loading={sibuk} disabled={!form.username || !form.peran} onClick={simpan}>
                Simpan
              </Button>
            </>
          }
        >
          <div className="u-psu-bagian">
            {galat && <Alert variant="danger">{galat}</Alert>}
            <Field label="Akun" required description={form.id ? 'Akun tidak bisa diganti; hapus lalu tambah bila keliru.' : 'Akun SIAKAD/SSO pegawai.'}>
              <PilihEntitas
                jenis={SUMBER_PENGGUNA_ARSIP}
                value={form.username ?? null}
                disabled={Boolean(form.id)}
                onValueChange={(v) => setForm({ ...form, username: v ?? undefined })}
                placeholder="Cari nama atau username"
              />
            </Field>
            <Field label="Peran" required>
              <Select<PeranArsip> value={form.peran ?? null} onValueChange={(v) => setForm({ ...form, peran: v ?? undefined })} options={PERAN_ARSIP} />
            </Field>
            <FormGrid>
              <Field label="Jabatan" optional>
                <Input value={form.jabatan ?? ''} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} placeholder="Mis. Kepala BAAK" />
              </Field>
              <Field label="Masa tugas sampai" optional>
                <IsianTanggal value={form.selesai ?? ''} onValueChange={(v) => setForm({ ...form, selesai: v })} />
              </Field>
            </FormGrid>
            <label className="u-psu-tombol-alih">
              <Switch checked={Boolean(Number(form.bisa_tandatangan ?? 0))} onCheckedChange={(v) => setForm({ ...form, bisa_tandatangan: v ? 1 : 0 })} /> Boleh menandatangani surat keluar
            </label>
            <label className="u-psu-tombol-alih">
              <Switch checked={Boolean(Number(form.aktif ?? 1))} onCheckedChange={(v) => setForm({ ...form, aktif: v ? 1 : 0 })} /> Aktif
            </label>
          </div>
        </Dialog>
      )}
      <ConfirmDialog
        open={Boolean(hapus)}
        onOpenChange={(o) => !o && setHapus(null)}
        title={`Hapus ${hapus?.nama ?? hapus?.username ?? 'petugas'} dari petugas surat?`}
        description="Surat dan disposisi yang sudah ada tidak terhapus."
        confirmLabel="Hapus petugas"
        onConfirm={async () => {
          if (!hapus) return;
          try {
            await siakad.request({ method: 'DELETE', path: `/v1/arsip/petugas/${hapus.id}` });
            toast.add({ title: 'Petugas dihapus.', type: 'success' });
            invalidateSiakad('arsip');
          } catch (e) {
            toast.add({ title: pesanGalat(e), type: 'error' });
          }
          setHapus(null);
        }}
      />
    </div>
  );
}
