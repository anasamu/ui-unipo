'use client';
import * as React from 'react';
import { Archive, BadgeCheck, CircleAlert, Copy, FileCheck2, FilePlus2, GitCompare, Paperclip, Pencil, Plus, RefreshCw, Scale, Send, Trash2, Undo2, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton, type BadgeVariant } from '../components/actions';
import { Alert, Card, CardContent, CardHeader, DescriptionList, Empty, Tabs } from '../components/display';
import { StatCard, StatGrid } from '../components/charts';
import { DataTable, type DataColumn } from '../components/data-table';
import { Checkbox, Field, Input, Textarea } from '../components/forms';
import { Select } from '../components/select';
import { ConfirmDialog, Sheet, useToast } from '../components/overlays';
import { IsianTanggal } from '../components/formulir';
import { FormGrid, WizardReview } from '../components/wizard';
import { PanelLangkah } from '../components/panel-langkah';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { PilihSK } from './isian-sk';
import { PilihTahunAkademik } from './cari';
import { PilihBerkas } from './pilih-berkas';
import { AlurPemeriksa, type TahapPemeriksa } from './pemeriksa';
import { LinimasaPengajuan, type LangkahRiwayat } from './pengajuan';
import { DaftarPerubahanAturan, DaftarVersiAturan, LencanaStatusVersi, PanelBandingAturan, type PerubahanAturan, type VersiAturanRow } from './aturan-versi';

/*
 * DUPAK dosen berversi (SIAKAD /v1/sdm/dupak, docs/KEPEGAWAIAN-DOSEN.md "DUPAK"). Rubrik angka kredit diatur Biro SDM
 * sebagai aturan berversi (sdm_aturan_versi jenis `dupak`): aturan baru dari kementerian = salin versi, ubah, terbitkan;
 * tanpa ubah kode. Pengajuan mengunci versi rubrik saat diajukan.
 *
 *   KelolaAturanDupak   SDM » Aturan karier » DUPAK: versi rubrik, butir per unsur, komposisi, wizard ubah draf
 *   RuangDupakDosen     Fakultas » Kenaikan saya: DUPAK saya + wizard susun (periode → kegiatan terisi otomatis → tinjau)
 *   AntreanDupak        verifikasi fakultas (Dekan/Tim PAK fakultas), penilaian Tim PAK universitas, penetapan PAK (SDM)
 *   PanelDupak          rincian satu DUPAK di panel samping (aksi sesuai hak)
 */

const BASIS = '/v1/sdm/dupak/aturan';
export const UNSUR_DUPAK: Record<string, string> = { pendidikan: 'Pendidikan & pengajaran', penelitian: 'Penelitian', pengabdian: 'Pengabdian kepada masyarakat', penunjang: 'Penunjang' };
const KODE_UNSUR = Object.keys(UNSUR_DUPAK);

// ================================================================== tipe

export interface ButirRubrikDupak {
  kode: string;
  uraian: string;
  satuan: string;
  ak: number | null;
  maks_ak_semester: number | null;
  maks_ak_pengajuan: number | null;
  bukti: string[];
  jabatan: string[];
  otomatis: string | null;
  aktif: boolean;
  perlu_dicek: boolean;
  catatan: string | null;
}
export interface SubRubrikDupak {
  kode: string;
  nama: string;
  butir: ButirRubrikDupak[];
}
export interface KomposisiDupak {
  jabatan: string;
  nama: string;
  pendidikan_min_persen: number | null;
  penelitian_min_persen: number | null;
  pengabdian_maks_persen: number | null;
  penunjang_maks_persen: number | null;
  sumber: string;
}
export interface IsiRubrikDupak {
  umum: { sumber: string; catatan: string };
  unsur: { kode: string; nama: string; sub: SubRubrikDupak[] }[];
  komposisi: KomposisiDupak[];
}
export interface AturanDupakRow extends VersiAturanRow {
  berlaku_tanggal: string | null;
  berlaku_sekarang: boolean;
}
export interface AturanDupakDetail extends AturanDupakRow {
  isi: IsiRubrikDupak;
  induk?: { id: number; nama: string; versi: number };
  perubahan?: PerubahanAturan[];
  periode: { id: number; status: string; nama: string; diajukan_at: string | null }[];
  riwayat: { waktu: string; username: string; aksi: string; ringkasan: string }[];
  jabatan_akademik: { id: number; kode: string; nama: string; urutan: number }[];
  otomatis: { kode: string; nama: string }[];
  jenis_luaran: { kode: string; nama: string }[];
}

export type StatusDupak = 'draf' | 'diajukan' | 'diverifikasi' | 'dinilai' | 'ditetapkan' | 'dikembalikan' | 'ditolak' | 'dibatalkan';
type PerUnsur<T> = Record<'pendidikan' | 'penelitian' | 'pengabdian' | 'penunjang' | 'total', T>;
export interface DupakRow {
  id: number;
  status: StatusDupak;
  status_label: string;
  pegawai_id: number;
  pegawai_nama?: string;
  nidn?: string | null;
  jabatan_asal: string | null;
  jabatan_tujuan: string | null;
  jabatan_tujuan_id: number | null;
  aturan_id: number | null;
  aturan_nama: string | null;
  aturan_versi: number | null;
  aturan_terkunci: boolean;
  periode_mulai: string;
  periode_selesai: string;
  ak_dasar: number;
  ak_usul: PerUnsur<number>;
  ak_diakui: PerUnsur<number | null>;
  ak_kumulatif: number | null;
  nomor_pak: string | null;
  tanggal_pak: string | null;
  catatan: string | null;
  catatan_pengusul: string | null;
  diajukan_at: string | null;
  aksi_boleh: string[];
  peringatan: PeringatanDupak[];
}
export interface PeringatanDupak {
  jenis: 'batas' | 'komposisi' | 'ak_kosong' | 'jabatan' | 'rubrik' | 'bukti' | 'kosong';
  butir_id: number | null;
  kode: string | null;
  pesan: string;
}
interface FileSdm {
  uuid: string;
  nama: string;
  url?: string;
}
export interface ButirDupak {
  id: number;
  kode_butir: string;
  unsur: string;
  uraian: string;
  semester: string | null;
  tanggal: string | null;
  volume: number;
  satuan: string | null;
  porsi: number;
  ak_satuan: number | null;
  ak_hitung: number;
  ak_usul: number;
  ak_fakultas: number | null;
  ak_diakui: number | null;
  catatan_penilai: string | null;
  sumber: string;
  rubrik: { uraian: string; sub_nama: string; bukti: string[]; maks_ak_semester: number | null; maks_ak_pengajuan: number | null } | null;
  file: FileSdm[];
}
export interface RubrikPilihan {
  kode: string;
  uraian: string;
  unsur: string;
  unsur_nama: string;
  sub_nama: string;
  satuan: string;
  ak: number | null;
  maks_ak_semester: number | null;
  maks_ak_pengajuan: number | null;
  bukti: string[];
  jabatan: string[];
  otomatis: string | null;
}
export interface DupakDetail extends DupakRow {
  pegawai: { id: number; nama: string; nidn: string | null; kode_prodi: string | null };
  semester: { tahun_id: string; nama: string }[];
  butir: ButirDupak[];
  ringkasan: {
    unsur: Record<string, { usul: number; hitung: number; fakultas: number; diakui: number; butir: number }>;
    total: { usul: number; hitung: number; fakultas: number; diakui: number };
    peringatan: PeringatanDupak[];
    blokir: PeringatanDupak[];
    komposisi: { unsur: string; op: string; batas: number; persen: number; terpenuhi: boolean }[];
  };
  aturan: { id: number; nama: string; versi: number; dasar_hukum: string | null; status: string; terkunci: boolean; berlaku_id: number | null } | null;
  rubrik: RubrikPilihan[];
  komposisi: KomposisiDupak | null;
  linimasa: LangkahRiwayat[];
  pemeriksa: TahapPemeriksa[];
  pemeriksa_label: string | null;
  peran: string | null;
  karier: { aturan: { id: number; nama: string; versi: number }; jabatan: string | null; ak_min: number | null; ak_kumulatif: number; dasar: 'usul' | 'diakui'; terpenuhi: boolean | null; kurang: number | null } | null;
  jabatan_akademik: { id: number; kode: string; nama: string; urutan: number }[];
}

// ================================================================== pembantu

const tgl = (s?: string | null) => (s ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s.length <= 10 ? `${s}T00:00:00` : s.replace(' ', 'T'))) : '-');
export const angkaDupak = (n: number | null | undefined, satuan = '') => (n == null ? '-' : `${Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 })}${satuan}`);
const angka = angkaDupak;
const q = <T,>(path: string, query?: Record<string, string>) => (s: ReturnType<typeof useSiakad>, signal: AbortSignal) => s.request<T>({ method: 'GET', path, query }, { signal });
const semesterTeks = (t: string) => {
  const s = t.slice(4);
  const th = Number(t.slice(0, 4));
  return s === '1' ? `${th}/${th + 1} Ganjil` : s === '2' ? `${th}/${th + 1} Genap` : t;
};
const NADA: Record<StatusDupak, BadgeVariant> = { draf: 'neutral', diajukan: 'info', diverifikasi: 'info', dinilai: 'primary', ditetapkan: 'success', dikembalikan: 'warning', ditolak: 'danger', dibatalkan: 'neutral' };

export function LencanaStatusDupak({ d }: { d: Pick<DupakRow, 'status' | 'status_label'> }) {
  return (
    <Badge variant={NADA[d.status] ?? 'neutral'} dot>
      {d.status_label}
    </Badge>
  );
}

function useAksiDupak() {
  const s = useSiakad();
  const toast = useToast();
  return React.useCallback(
    async <T,>(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown, sukses?: string): Promise<T> => {
      try {
        const r = await s.request<T>({ method, path, body: method === 'DELETE' ? undefined : (body ?? {}) });
        if (sukses) toast.add({ title: sukses, type: 'success' });
        invalidateSiakad('dupak');
        invalidateSiakad('aturan-versi');
        return r.data;
      } catch (e) {
        toast.add({ title: 'Belum berhasil', description: pesanGalat(e), type: 'error' });
        throw e;
      }
    },
    [s, toast],
  );
}

/** Isian angka desimal: teks lokal saat diketik (koma/titik), angka dikirim saat keluar dari kolom. */
function IsianAngka({ value, onChange, ...props }: { value: number | null; onChange: (n: number | null) => void } & Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'>) {
  const [teks, setTeks] = React.useState(value == null ? '' : String(value).replace('.', ','));
  React.useEffect(() => {
    setTeks((t) => (Number(t.replace(',', '.')) === value || (t === '' && value == null) ? t : value == null ? '' : String(value).replace('.', ',')));
  }, [value]);
  return (
    <Input
      inputMode="decimal"
      {...props}
      value={teks}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d.,]/g, '');
        setTeks(t);
        const n = t.trim() === '' ? null : Number(t.replace(',', '.'));
        if (n === null || !Number.isNaN(n)) onChange(n);
      }}
    />
  );
}

// ================================================================== rubrik berversi (SDM)

/** SDM » Aturan karier » DUPAK: versi rubrik angka kredit, rincian per unsur, komposisi, salin/ubah/terbitkan/banding. */
export function KelolaAturanDupak({ className }: { className?: string }) {
  const daftar = useSiakadQuery<AturanDupakRow[]>(['dupak', 'aturan', 'daftar'], q(BASIS));
  const [pilih, setPilih] = React.useState<number | null>(null);
  const rows = daftar.data ?? [];
  const id = pilih ?? rows.find((a) => a.status === 'draf')?.id ?? rows.find((a) => a.berlaku_sekarang)?.id ?? rows[0]?.id ?? null;
  if (daftar.loading && !daftar.data) return <Skeleton style={{ height: 360 }} />;
  if (daftar.error) return <Alert variant="danger" title="Rubrik DUPAK belum bisa dimuat">{pesanGalat(daftar.error)}</Alert>;
  return (
    <div className={cn('u-bkd-aturan u-ak', className)}>
      <div className="u-ak-kiri">
        <DaftarVersiAturan
          versi={rows.map((r) => ({ ...r, berlaku_mulai: r.berlaku_tanggal, berlaku_mulai_nama: r.berlaku_tanggal ? tgl(r.berlaku_tanggal) : null }))}
          value={id}
          onValueChange={setPilih}
          satuanPemakai="pengajuan"
          label="Versi rubrik DUPAK"
        />
        <p className="u-bkd-keterangan">Versi terbit dikunci. Untuk aturan baru dari kementerian, salin versi lalu ubah drafnya. DUPAK yang sudah diajukan tetap memakai versinya.</p>
      </div>
      {id ? <RincianAturanDupak id={id} onPilih={setPilih} /> : <Empty bordered icon={<Scale />} title="Belum ada rubrik DUPAK" description="Jalankan migration SIAKAD agar versi bawaan dibuat." />}
    </div>
  );
}

function RincianAturanDupak({ id, onPilih }: { id: number; onPilih: (id: number | null) => void }) {
  const d = useSiakadQuery<AturanDupakDetail>(['dupak', 'aturan', 'detail', id], q(`${BASIS}/${id}`));
  const aksi = useAksiDupak();
  const [panel, setPanel] = React.useState<'ubah' | 'banding' | 'hapus' | 'terbit' | null>(null);
  if (d.loading && !d.data) return <Skeleton style={{ height: 360 }} />;
  if (!d.data) return <Alert variant="danger">{pesanGalat(d.error)}</Alert>;
  const a = d.data;
  const semua = a.isi.unsur.flatMap((u) => u.sub.flatMap((s) => s.butir));
  const dicek = semua.filter((b) => b.aktif && b.perlu_dicek).length;
  const nmJab = (k: string) => a.jabatan_akademik.find((j) => j.kode === k)?.nama ?? k;
  const nmOto = (k: string | null) => (k ? (a.otomatis.find((o) => o.kode === k)?.nama ?? (k.startsWith('luaran:') ? `Luaran LPPM ${k.slice(7)}` : k)) : 'Diisi dosen');
  const kolomButir: DataColumn<ButirRubrikDupak & { sub_nama: string }>[] = [
    { key: 'kode', header: 'Kode', shrink: true, mobile: 'badge', cell: (b) => <span className="u-ak-kode">{b.kode}</span> },
    {
      key: 'uraian',
      header: 'Butir kegiatan',
      mobile: 'title',
      cell: (b) => (
        <span className="u-dupak-sel">
          <strong>{b.uraian}</strong>
          <small>
            {b.sub_nama}
            {!b.aktif ? ' · nonaktif' : ''}
          </small>
        </span>
      ),
    },
    { key: 'ak', header: 'AK per satuan', align: 'end', cell: (b) => (b.ak == null ? <span className="u-ak-kosong">Belum diatur</span> : `${angka(b.ak)} / ${b.satuan}`) },
    { key: 'batas', header: 'Batas', cell: (b) => [b.maks_ak_semester != null ? `${angka(b.maks_ak_semester)}/semester` : null, b.maks_ak_pengajuan != null ? `${angka(b.maks_ak_pengajuan)}/pengajuan` : null].filter(Boolean).join(', ') || '-' },
    { key: 'jabatan', header: 'Jabatan', cell: (b) => (b.jabatan.length ? b.jabatan.map(nmJab).join(', ') : 'Semua') },
    { key: 'otomatis', header: 'Isi otomatis', cell: (b) => nmOto(b.otomatis) },
    { key: 'bukti', header: 'Bukti wajib', cell: (b) => b.bukti.join(', ') || '-' },
  ];
  return (
    <section className="u-bkd-aturan-rincian">
      <Card>
        <CardContent>
          <div className="u-bkd-kepala">
            <div>
              <p className="u-bkd-label">
                Versi {a.versi}
                {a.induk ? ` · disalin dari ${a.induk.nama} v${a.induk.versi}` : ''}
              </p>
              <h3 className="u-bkd-judul">{a.nama}</h3>
              <p className="u-bkd-keterangan" style={{ whiteSpace: 'pre-line' }}>
                {a.dasar_hukum ?? 'Dasar hukum belum diisi.'}
              </p>
            </div>
            <div className="u-bkd-kepala-status">
              {a.berlaku_sekarang ? <Badge variant="primary">Berlaku sekarang</Badge> : null}
              <LencanaStatusVersi status={a.status}>{a.diterbitkan_at ? ` ${tgl(a.diterbitkan_at)}` : ''}</LencanaStatusVersi>
            </div>
          </div>
          <DescriptionList
            items={[
              { label: 'SK/pedoman', value: a.sk ? `${a.sk.nomor}${a.sk.tanggal ? `, ${tgl(a.sk.tanggal)}` : ''}` : <span className="u-bkd-keterangan">Belum dilampirkan (wajib sebelum terbit)</span> },
              { label: 'Berlaku mulai', value: a.berlaku_tanggal ? tgl(a.berlaku_tanggal) : a.status === 'terbit' ? 'Sejak diterbitkan' : 'Diisi sebelum terbit' },
              { label: 'Butir aktif', value: `${semua.filter((b) => b.aktif).length} butir di ${a.isi.unsur.length} unsur` },
              { label: 'Dipakai pengajuan', value: a.periode.length ? `${a.periode.length} DUPAK mengunci versi ini` : 'Belum ada' },
            ]}
          />
          {dicek ? (
            <Alert variant="warning" icon={<CircleAlert />} title={`${dicek} butir belum punya angka kredit`}>
              Nilai yang belum ada di ketentuan lama dibiarkan kosong (tidak dikarang) dan dihitung 0 di pengajuan. Salin versi ini, isi angkanya dari pedoman PAK yang berlaku, lalu terbitkan.
            </Alert>
          ) : null}
          <div className="u-bkd-aksi">
            {a.status === 'draf' ? (
              <Button onClick={() => setPanel('ubah')}>
                <Pencil /> Ubah draf
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={async () => {
                const r = await aksi<AturanDupakDetail>('POST', `${BASIS}/${a.id}/salin`, {}, 'Versi baru dibuat sebagai draf.');
                onPilih(r.id);
              }}
            >
              <Copy /> Salin jadi versi baru
            </Button>
            <Button variant="ghost" onClick={() => setPanel('banding')}>
              <GitCompare /> Banding
            </Button>
            {a.status === 'draf' ? (
              <Button variant="outline" onClick={() => setPanel('terbit')}>
                <FileCheck2 /> Terbitkan
              </Button>
            ) : null}
            {a.status === 'terbit' ? (
              <Button variant="ghost" onClick={() => void aksi('POST', `${BASIS}/${a.id}/arsipkan`, {}, 'Versi diarsipkan.')}>
                <Archive /> Arsipkan
              </Button>
            ) : null}
            {a.status === 'draf' ? (
              <Button variant="ghost" onClick={() => setPanel('hapus')}>
                <Trash2 /> Hapus draf
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <Tabs
        items={[
          ...a.isi.unsur.map((u) => ({
            value: u.kode,
            label: UNSUR_DUPAK[u.kode] ?? u.nama,
            count: u.sub.reduce((n, s) => n + s.butir.length, 0),
            content: (
              <DataTable
                rows={u.sub.flatMap((s) => s.butir.map((b) => ({ ...b, sub_nama: s.nama })))}
                rowKey={(b) => b.kode}
                columns={kolomButir}
                columnToggle={false}
                densityToggle={false}
                empty={{ title: 'Belum ada butir', description: 'Salin versi ini lalu tambahkan butir di drafnya.' }}
              />
            ),
          })),
          {
            value: 'komposisi',
            label: 'Komposisi unsur',
            content: (
              <DataTable
                rows={a.isi.komposisi}
                rowKey={(k) => k.jabatan}
                columnToggle={false}
                densityToggle={false}
                columns={[
                  { key: 'jabatan', header: 'Jabatan tujuan', mobile: 'title', cell: (k) => k.nama || nmJab(k.jabatan) },
                  { key: 'pendidikan_min_persen', header: 'Pendidikan min', align: 'end', cell: (k) => angka(k.pendidikan_min_persen, '%') },
                  { key: 'penelitian_min_persen', header: 'Penelitian min', align: 'end', cell: (k) => angka(k.penelitian_min_persen, '%') },
                  { key: 'pengabdian_maks_persen', header: 'Pengabdian maks', align: 'end', cell: (k) => angka(k.pengabdian_maks_persen, '%') },
                  { key: 'penunjang_maks_persen', header: 'Penunjang maks', align: 'end', cell: (k) => angka(k.penunjang_maks_persen, '%') },
                ]}
                empty={{ title: 'Komposisi belum diatur' }}
              />
            ),
          },
          ...(a.perubahan ? [{ value: 'perubahan', label: `Perubahan dari v${a.induk?.versi}`, count: a.perubahan.length, content: <Card><CardContent><DaftarPerubahanAturan perubahan={a.perubahan} /></CardContent></Card> }] : []),
          {
            value: 'pemakai',
            label: 'Pengajuan',
            count: a.periode.length,
            content: (
              <DataTable
                rows={a.periode}
                rowKey={(r) => String(r.id)}
                columnToggle={false}
                densityToggle={false}
                columns={[
                  { key: 'nama', header: 'Dosen', mobile: 'title' },
                  { key: 'status', header: 'Status', shrink: true },
                  { key: 'diajukan_at', header: 'Diajukan', shrink: true, cell: (r) => tgl(r.diajukan_at) },
                ]}
                empty={{ title: 'Belum ada DUPAK yang mengunci versi ini' }}
              />
            ),
          },
          {
            value: 'riwayat',
            label: 'Riwayat',
            content: (
              <DataTable
                rows={a.riwayat}
                rowKey={(r) => `${r.waktu}${r.aksi}`}
                columnToggle={false}
                densityToggle={false}
                columns={[
                  { key: 'waktu', header: 'Waktu', shrink: true, cell: (r) => tgl(r.waktu) },
                  { key: 'username', header: 'Oleh', shrink: true },
                  { key: 'ringkasan', header: 'Perubahan', mobile: 'title' },
                ]}
                empty={{ title: 'Belum ada riwayat', description: 'Versi bawaan dibuat oleh migration.' }}
              />
            ),
          },
        ]}
      />
      {panel === 'ubah' ? <PanelUbahAturanDupak aturan={a} onOpenChange={(o) => !o && setPanel(null)} /> : null}
      {panel === 'banding' ? <PanelBandingAturan basis={BASIS} aturan={a} onOpenChange={(o) => !o && setPanel(null)} /> : null}
      <ConfirmDialog
        open={panel === 'terbit'}
        onOpenChange={(o) => !o && setPanel(null)}
        tone="primary"
        title="Terbitkan rubrik ini?"
        description={`${a.nama} v${a.versi} dikunci dan ${a.berlaku_tanggal ? `berlaku untuk DUPAK yang diajukan sejak ${tgl(a.berlaku_tanggal)}` : 'langsung berlaku untuk DUPAK baru'}. DUPAK yang sudah diajukan tetap memakai versi yang dikuncinya; draf yang belum diajukan dihitung ulang dengan versi ini.`}
        confirmLabel="Terbitkan"
        onConfirm={async () => {
          await aksi('POST', `${BASIS}/${a.id}/terbitkan`, {}, 'Rubrik diterbitkan dan dikunci.');
          setPanel(null);
        }}
      />
      <ConfirmDialog
        open={panel === 'hapus'}
        onOpenChange={(o) => !o && setPanel(null)}
        title="Hapus draf ini?"
        description={`${a.nama} versi ${a.versi}. Versi terbit tidak terpengaruh.`}
        confirmLabel="Hapus draf"
        onConfirm={async () => {
          await aksi('POST', `${BASIS}/${a.id}/hapus`, {}, 'Draf dihapus.');
          setPanel(null);
          onPilih(null);
        }}
      />
    </section>
  );
}

// ------------------------------------------------------------------ editor draf rubrik (wizard)

const butirBaru = (kode: string): ButirRubrikDupak => ({ kode, uraian: '', satuan: 'kegiatan', ak: null, maks_ak_semester: null, maks_ak_pengajuan: null, bukti: [], jabatan: [], otomatis: null, aktif: true, perlu_dicek: true, catatan: null });

function IsianButirRubrik({ b, onChange, onHapus, jabatan, otomatis }: { b: ButirRubrikDupak; onChange: (x: Partial<ButirRubrikDupak>) => void; onHapus: () => void; jabatan: AturanDupakDetail['jabatan_akademik']; otomatis: { value: string; label: string }[] }) {
  const [buktiTeks, setBuktiTeks] = React.useState(b.bukti.join(', '));
  return (
    <fieldset className="u-ak-isian u-dupak-butir" data-aktif={b.aktif ? '' : undefined}>
      <legend>
        <span className="u-ak-kode">{b.kode || 'kode?'}</span>
        <Button size="sm" variant="ghost" aria-label={`Hapus butir ${b.kode}`} onClick={onHapus}>
          <X />
        </Button>
      </legend>
      <div className="u-dupak-butir-grid">
        <Field label="Kode" required>
          <Input value={b.kode} onChange={(e) => onChange({ kode: e.target.value.replace(/[^A-Za-z0-9._-]/g, '') })} />
        </Field>
        <Field label="Uraian kegiatan" required className="u-dupak-lebar">
          <Input value={b.uraian} onChange={(e) => onChange({ uraian: e.target.value })} />
        </Field>
        <Field label="Satuan hasil">
          <Input value={b.satuan} onChange={(e) => onChange({ satuan: e.target.value })} />
        </Field>
        <Field label="AK per satuan">
          <IsianAngka value={b.ak} onChange={(n) => onChange({ ak: n, perlu_dicek: n == null })} />
        </Field>
        <Field label="Batas AK/semester" description="Kosong = tanpa batas">
          <IsianAngka value={b.maks_ak_semester} onChange={(n) => onChange({ maks_ak_semester: n })} />
        </Field>
        <Field label="Batas AK/pengajuan" description="Kosong = tanpa batas">
          <IsianAngka value={b.maks_ak_pengajuan} onChange={(n) => onChange({ maks_ak_pengajuan: n })} />
        </Field>
        <Field label="Isi otomatis dari">
          <Select options={[{ value: '', label: 'Diisi dosen' }, ...otomatis]} value={b.otomatis ?? ''} onValueChange={(v) => onChange({ otomatis: v || null })} placeholder="Pilih…" />
        </Field>
        <Field label="Bukti wajib" description="Pisahkan dengan koma" className="u-dupak-lebar">
          <Input
            value={buktiTeks}
            onChange={(e) => {
              setBuktiTeks(e.target.value);
              onChange({ bukti: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) });
            }}
          />
        </Field>
      </div>
      <div className="u-ak-isian-kepala">
        <label className="u-ak-centang">
          <Checkbox checked={b.aktif} onCheckedChange={(v) => onChange({ aktif: v === true })} /> Butir aktif
        </label>
        <span className="u-bkd-keterangan">Jabatan yang boleh (kosong = semua):</span>
        {jabatan.map((j) => (
          <label key={j.kode} className="u-ak-centang">
            <Checkbox checked={b.jabatan.includes(j.kode)} onCheckedChange={(v) => onChange({ jabatan: v === true ? [...b.jabatan, j.kode] : b.jabatan.filter((x) => x !== j.kode) })} /> {j.kode}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function PanelUbahAturanDupak({ aturan: a, onOpenChange }: { aturan: AturanDupakDetail; onOpenChange: (o: boolean) => void }) {
  const aksi = useAksiDupak();
  const [step, setStep] = React.useState(0);
  const [isi, setIsi] = React.useState<IsiRubrikDupak>(() => JSON.parse(JSON.stringify(a.isi)) as IsiRubrikDupak);
  const [id, setId] = React.useState({ nama: a.nama, dasar_hukum: a.dasar_hukum ?? '', berlaku_tanggal: a.berlaku_tanggal ?? '', catatan_perubahan: a.catatan_perubahan ?? '', sk_id: a.sk?.id ?? (null as string | null) });
  const otomatis = [...a.otomatis.map((o) => ({ value: o.kode, label: o.nama })), ...a.jenis_luaran.map((l) => ({ value: `luaran:${l.kode}`, label: `Luaran LPPM: ${l.nama}` }))];
  const ubahUnsur = (ui: number, fn: (u: IsiRubrikDupak['unsur'][number]) => IsiRubrikDupak['unsur'][number]) => setIsi({ ...isi, unsur: isi.unsur.map((u, n) => (n === ui ? fn(u) : u)) });
  const ubahButir = (ui: number, si: number, bi: number, x: Partial<ButirRubrikDupak>) =>
    ubahUnsur(ui, (u) => ({ ...u, sub: u.sub.map((s, n) => (n === si ? { ...s, butir: s.butir.map((b, m) => (m === bi ? { ...b, ...x } : b)) } : s)) }));
  const semua = isi.unsur.flatMap((u) => u.sub.flatMap((s) => s.butir));
  const periksaUnsur = (ui: number) => {
    const u = isi.unsur[ui];
    for (const s of u.sub) {
      if (!s.nama.trim()) return 'Isi nama sub-unsur.';
      for (const b of s.butir) {
        if (!b.kode.trim() || !b.uraian.trim()) return `Lengkapi kode dan uraian butir di ${s.nama}.`;
        if (semua.filter((x) => x.kode === b.kode).length > 1) return `Kode ${b.kode} dipakai dua kali.`;
      }
    }
    return null;
  };
  return (
    <PanelLangkah
      open
      onOpenChange={onOpenChange}
      title={`Ubah ${a.nama} v${a.versi}`}
      description="Perubahan hanya pada draf. DUPAK yang sudah diajukan tetap memakai versi yang dikuncinya."
      mode="ubah"
      size="xl"
      step={step}
      onStepChange={setStep}
      finishLabel="Simpan draf"
      steps={[
        {
          id: 'dasar',
          title: 'Dasar hukum',
          description: 'Pedoman operasional PAK/Permen yang menjadi dasar versi ini dan tanggal mulai berlakunya.',
          validate: () => (id.nama.trim() ? null : 'Isi nama rubrik.'),
          content: (
            <div className="u-bkd-form">
              <Field label="Nama rubrik" required description="Mis. Rubrik DUPAK PO PAK 2026">
                <Input value={id.nama} onChange={(e) => setId({ ...id, nama: e.target.value })} />
              </Field>
              <Field label="Dasar hukum" description="Nomor, tanggal, dan penerbit peraturan/pedoman PAK.">
                <Textarea rows={4} value={id.dasar_hukum} onChange={(e) => setId({ ...id, dasar_hukum: e.target.value })} />
              </Field>
              <PilihSK value={id.sk_id} onValueChange={(v: string | null) => setId({ ...id, sk_id: v })} jenis="aturan" label="SK/pedoman yang dirujuk" description="Dari registri SK; wajib sebelum terbit." />
              <Field label="Berlaku mulai tanggal" optional description="DUPAK yang diajukan sejak tanggal ini memakai versi ini. Kosong = sejak diterbitkan.">
                <IsianTanggal value={id.berlaku_tanggal} onValueChange={(v) => setId({ ...id, berlaku_tanggal: v ?? '' })} />
              </Field>
              <Field label="Catatan perubahan" optional>
                <Textarea rows={2} value={id.catatan_perubahan} onChange={(e) => setId({ ...id, catatan_perubahan: e.target.value })} />
              </Field>
            </div>
          ),
        },
        ...isi.unsur.map((u, ui) => ({
          id: u.kode,
          title: UNSUR_DUPAK[u.kode] ?? u.nama,
          description: 'Sub-unsur dan butir kegiatan: angka kredit per satuan, batas, bukti wajib, jabatan yang boleh, dan sumber isi otomatis.',
          validate: () => periksaUnsur(ui),
          content: (
            <div className="u-bkd-form">
              {u.sub.map((s, si) => (
                <section key={si} className="u-dupak-sub">
                  <div className="u-dupak-sub-kepala">
                    <Field label="Sub-unsur" className="u-dupak-lebar">
                      <Input value={s.nama} onChange={(e) => ubahUnsur(ui, (x) => ({ ...x, sub: x.sub.map((y, n) => (n === si ? { ...y, nama: e.target.value } : y)) }))} />
                    </Field>
                    <Button size="sm" variant="ghost" disabled={s.butir.length > 0} title={s.butir.length ? 'Hapus butirnya dulu' : undefined} onClick={() => ubahUnsur(ui, (x) => ({ ...x, sub: x.sub.filter((_, n) => n !== si) }))}>
                      <Trash2 /> Hapus sub-unsur
                    </Button>
                  </div>
                  {s.butir.map((b, bi) => (
                    <IsianButirRubrik
                      key={bi}
                      b={b}
                      jabatan={a.jabatan_akademik}
                      otomatis={otomatis}
                      onChange={(x) => ubahButir(ui, si, bi, x)}
                      onHapus={() => ubahUnsur(ui, (x) => ({ ...x, sub: x.sub.map((y, n) => (n === si ? { ...y, butir: y.butir.filter((_, m) => m !== bi) } : y)) }))}
                    />
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => ubahUnsur(ui, (x) => ({ ...x, sub: x.sub.map((y, n) => (n === si ? { ...y, butir: [...y.butir, butirBaru(`${u.kode.slice(0, 3).toUpperCase()}.${semua.length + 1}`)] } : y)) }))}
                  >
                    <Plus /> Tambah butir
                  </Button>
                </section>
              ))}
              <Button variant="outline" onClick={() => ubahUnsur(ui, (x) => ({ ...x, sub: [...x.sub, { kode: `${u.kode}_${x.sub.length + 1}`, nama: '', butir: [] }] }))}>
                <Plus /> Tambah sub-unsur
              </Button>
            </div>
          ),
        })),
        {
          id: 'komposisi',
          title: 'Komposisi',
          description: 'Komposisi angka kredit per unsur untuk tiap jabatan tujuan (persen dari AK usul). Kosong = tidak diperiksa.',
          validate: () => (isi.komposisi.some((k) => [k.pendidikan_min_persen, k.penelitian_min_persen, k.pengabdian_maks_persen, k.penunjang_maks_persen].some((x) => x != null && (x < 0 || x > 100))) ? 'Persen harus 0-100.' : null),
          content: (
            <div className="u-bkd-form">
              {isi.komposisi.map((k, i) => {
                const ubah = (x: Partial<KomposisiDupak>) => setIsi({ ...isi, komposisi: isi.komposisi.map((y, n) => (n === i ? { ...y, ...x } : y)) });
                return (
                  <fieldset key={k.jabatan} className="u-ak-isian">
                    <legend>
                      <span className="u-ak-kode">{k.jabatan}</span> {k.nama}
                    </legend>
                    <FormGrid columns={2}>
                      <Field label="Pendidikan minimal (%)">
                        <IsianAngka value={k.pendidikan_min_persen} onChange={(n) => ubah({ pendidikan_min_persen: n })} />
                      </Field>
                      <Field label="Penelitian minimal (%)">
                        <IsianAngka value={k.penelitian_min_persen} onChange={(n) => ubah({ penelitian_min_persen: n })} />
                      </Field>
                      <Field label="Pengabdian maksimal (%)">
                        <IsianAngka value={k.pengabdian_maks_persen} onChange={(n) => ubah({ pengabdian_maks_persen: n })} />
                      </Field>
                      <Field label="Penunjang maksimal (%)">
                        <IsianAngka value={k.penunjang_maks_persen} onChange={(n) => ubah({ penunjang_maks_persen: n })} />
                      </Field>
                    </FormGrid>
                  </fieldset>
                );
              })}
            </div>
          ),
        },
        {
          id: 'tinjau',
          title: 'Tinjau',
          content: (
            <WizardReview
              sections={[
                { title: 'Dasar hukum', items: [{ label: 'Nama', value: id.nama }, { label: 'Dasar hukum', value: id.dasar_hukum || null }, { label: 'SK', value: id.sk_id ? 'Terlampir' : null }, { label: 'Berlaku mulai', value: id.berlaku_tanggal ? tgl(id.berlaku_tanggal) : 'Sejak diterbitkan' }], onEdit: () => setStep(0), missing: id.sk_id ? undefined : 'SK/pedoman wajib dilampirkan sebelum terbit.' },
                ...isi.unsur.map((u, ui) => {
                  const b = u.sub.flatMap((s) => s.butir);
                  const kosong = b.filter((x) => x.aktif && x.ak == null).length;
                  return {
                    title: UNSUR_DUPAK[u.kode] ?? u.nama,
                    items: [
                      { label: 'Butir aktif', value: `${b.filter((x) => x.aktif).length} dari ${b.length}` },
                      { label: 'Berbatas', value: `${b.filter((x) => x.maks_ak_semester != null || x.maks_ak_pengajuan != null).length} butir` },
                    ],
                    missing: kosong ? `${kosong} butir aktif belum punya angka kredit (dihitung 0).` : undefined,
                    onEdit: () => setStep(1 + ui),
                  };
                }),
                { title: 'Komposisi', items: isi.komposisi.map((k) => ({ label: k.nama || k.jabatan, value: [k.pendidikan_min_persen != null ? `pendidikan ≥ ${angka(k.pendidikan_min_persen, '%')}` : null, k.penelitian_min_persen != null ? `penelitian ≥ ${angka(k.penelitian_min_persen, '%')}` : null, k.pengabdian_maks_persen != null ? `pengabdian ≤ ${angka(k.pengabdian_maks_persen, '%')}` : null, k.penunjang_maks_persen != null ? `penunjang ≤ ${angka(k.penunjang_maks_persen, '%')}` : null].filter(Boolean).join(', ') || 'Tidak diperiksa' })), onEdit: () => setStep(1 + isi.unsur.length) },
              ]}
            />
          ),
        },
      ]}
      onFinish={async () => {
        try {
          await aksi('PUT', `${BASIS}/${a.id}`, { nama: id.nama.trim(), dasar_hukum: id.dasar_hukum.trim() || null, berlaku_tanggal: id.berlaku_tanggal || null, catatan_perubahan: id.catatan_perubahan.trim() || null, sk_id: id.sk_id, isi }, 'Draf rubrik disimpan.');
          return null;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

// ================================================================== DUPAK dosen (Fakultas » Kenaikan saya)

/** Daftar DUPAK milik dosen login + wizard susun/ajukan. Rubrik dan perhitungan dari server (versi berlaku). */
export function RuangDupakDosen({ className }: { className?: string }) {
  const daftar = useSiakadQuery<DupakRow[]>(['dupak', 'saya'], q('/v1/sdm/dupak', { sebagai: 'saya' }));
  const [susun, setSusun] = React.useState<number | 'baru' | null>(null);
  const [lihat, setLihat] = React.useState<number | null>(null);
  const rows = daftar.data ?? [];
  const draf = rows.find((r) => r.status === 'draf' || r.status === 'dikembalikan');
  const terakhir = rows.find((r) => r.status === 'ditetapkan');
  const kolom: DataColumn<DupakRow>[] = [
    { key: 'periode', header: 'Periode penilaian', mobile: 'title', cell: (r) => `${semesterTeks(r.periode_mulai)} – ${semesterTeks(r.periode_selesai)}` },
    { key: 'jabatan_tujuan', header: 'Jabatan tujuan', cell: (r) => r.jabatan_tujuan ?? '-' },
    { key: 'ak_usul', header: 'AK usul', align: 'end', cell: (r) => angka(r.ak_usul.total) },
    { key: 'ak_diakui', header: 'AK diakui', align: 'end', cell: (r) => angka(r.ak_diakui.total) },
    { key: 'rubrik', header: 'Rubrik', cell: (r) => (r.aturan_nama ? `${r.aturan_nama} v${r.aturan_versi}${r.aturan_terkunci ? '' : ' (belum dikunci)'}` : '-') },
    { key: 'status', header: 'Status', shrink: true, mobile: 'badge', cell: (r) => <LencanaStatusDupak d={r} /> },
  ];
  return (
    <Card className={className}>
      <CardHeader
        title="DUPAK (penilaian angka kredit)"
        description="Susun Daftar Usulan Penetapan Angka Kredit dari kegiatan Anda. Mengajar, bimbingan, BKD, penelitian, dan pengabdian terisi otomatis; angka kredit dihitung menurut rubrik yang berlaku. Diverifikasi fakultas, dinilai Tim PAK universitas, lalu ditetapkan Biro SDM."
        action={
          <Button onClick={() => setSusun(draf ? draf.id : 'baru')}>
            {draf ? <Pencil /> : <FilePlus2 />} {draf ? (draf.status === 'dikembalikan' ? 'Perbaiki DUPAK' : 'Lanjutkan draf') : 'Susun DUPAK'}
          </Button>
        }
      />
      <CardContent className="u-bkd-form">
        {terakhir ? (
          <Alert variant="success" icon={<BadgeCheck />} title={`PAK ${terakhir.nomor_pak} (${tgl(terakhir.tanggal_pak)})`}>
            Angka kredit kumulatif {angka(terakhir.ak_kumulatif)} dipakai sebagai syarat angka kredit kenaikan jabatan menurut aturan karier.
          </Alert>
        ) : null}
        {draf?.status === 'dikembalikan' && draf.catatan ? (
          <Alert variant="warning" title="DUPAK dikembalikan untuk diperbaiki">
            {draf.catatan}
          </Alert>
        ) : null}
        <DataTable<DupakRow>
          columns={kolom}
          rows={rows}
          rowKey={(r) => String(r.id)}
          loading={daftar.loading}
          error={daftar.error}
          onRetry={daftar.refetch}
          onRowClick={(r) => (r.status === 'draf' || r.status === 'dikembalikan' ? setSusun(r.id) : setLihat(r.id))}
          columnToggle={false}
          densityToggle={false}
          empty={{ icon: <Scale />, title: 'Belum ada DUPAK', description: 'Klik Susun DUPAK, pilih periode penilaian; kegiatan dari SIAKAD dan LP2M langsung terisi.' }}
        />
      </CardContent>
      {susun !== null ? <PanelSusunDupak id={susun === 'baru' ? null : susun} onOpenChange={(o) => !o && setSusun(null)} /> : null}
      {lihat !== null ? <PanelDupak id={lihat} onOpenChange={(o) => !o && setLihat(null)} /> : null}
    </Card>
  );
}

function RingkasanAkDupak({ d }: { d: DupakDetail }) {
  const r = d.ringkasan;
  return (
    <StatGrid>
      {KODE_UNSUR.map((u) => (
        <StatCard key={u} label={UNSUR_DUPAK[u]} value={angka(r.unsur[u]?.usul ?? 0)} hint={`${r.unsur[u]?.butir ?? 0} butir${(r.unsur[u]?.hitung ?? 0) > (r.unsur[u]?.usul ?? 0) ? ` · dihitung ${angka(r.unsur[u]?.hitung)}` : ''}`} />
      ))}
      <StatCard label="Total AK usul" value={angka(r.total.usul)} hint={`AK dasar ${angka(d.ak_dasar)} → kumulatif ${angka(d.ak_dasar + r.total.usul)}`} />
    </StatGrid>
  );
}

function DaftarPeringatan({ d }: { d: DupakDetail }) {
  const p = d.ringkasan.peringatan;
  const b = d.ringkasan.blokir;
  if (!p.length && !b.length) return null;
  const batas = p.filter((x) => x.jenis === 'batas' || x.jenis === 'komposisi' || x.jenis === 'jabatan');
  const lain = p.filter((x) => !batas.includes(x));
  return (
    <div className="u-bkd-form">
      {b.length ? (
        <Alert variant="danger" title="Belum bisa diajukan">
          <ul className="u-dupak-daftar">{b.map((x, i) => <li key={i}>{x.pesan}</li>)}</ul>
        </Alert>
      ) : null}
      {batas.length ? (
        <Alert variant="warning" title={`${batas.length} peringatan batas/komposisi`}>
          <ul className="u-dupak-daftar">{batas.map((x, i) => <li key={i}>{x.pesan}</li>)}</ul>
        </Alert>
      ) : null}
      {lain.length ? (
        <Alert variant="info" title={`${lain.length} catatan rubrik`}>
          <ul className="u-dupak-daftar">{lain.slice(0, 8).map((x, i) => <li key={i}>{x.pesan}</li>)}{lain.length > 8 ? <li>dan {lain.length - 8} lainnya</li> : null}</ul>
        </Alert>
      ) : null}
    </div>
  );
}

function DampakKarier({ d }: { d: DupakDetail }) {
  const k = d.karier;
  if (!k) return null;
  return (
    <Alert variant={k.terpenuhi === true ? 'success' : k.terpenuhi === false ? 'warning' : 'neutral'} title={`Syarat angka kredit ${k.jabatan ?? ''} (aturan karier ${k.aturan.nama} v${k.aturan.versi})`}>
      {k.ak_min == null
        ? `AK minimal jabatan ini belum diatur di aturan karier. AK kumulatif ${k.dasar === 'diakui' ? 'diakui' : 'bila disetujui'}: ${angka(k.ak_kumulatif)}.`
        : `Butuh ${angka(k.ak_min)}; AK kumulatif ${k.dasar === 'diakui' ? 'yang diakui' : 'bila semua usul diakui'} ${angka(k.ak_kumulatif)}${k.terpenuhi ? ' (terpenuhi).' : `, kurang ${angka(k.kurang)}.`}`}
    </Alert>
  );
}

/** Tabel butir DUPAK. `penilai` = kolom AK fakultas/diakui bisa diisi (verifikasi/nilai). */
function TabelButirDupak({ d, ubah, onUbah, onHapus, onBukti, penilai, nilai, onNilai }: {
  d: DupakDetail;
  ubah?: boolean;
  onUbah?: (b: ButirDupak) => void;
  onHapus?: (b: ButirDupak) => void;
  onBukti?: (b: ButirDupak) => void;
  penilai?: 'ak_fakultas' | 'ak_diakui';
  nilai?: Record<number, number | null>;
  onNilai?: (id: number, n: number | null) => void;
}) {
  const peringatan = new Map<number, string[]>();
  for (const p of d.ringkasan.peringatan) if (p.butir_id) peringatan.set(p.butir_id, [...(peringatan.get(p.butir_id) ?? []), p.pesan]);
  const kolom: DataColumn<ButirDupak>[] = [
    {
      key: 'uraian',
      header: 'Kegiatan',
      mobile: 'title',
      cell: (b) => (
        <span className="u-dupak-sel">
          <strong>{b.uraian}</strong>
          <small>
            <span className="u-ak-kode">{b.kode_butir}</span> {b.rubrik?.uraian ?? 'Butir tidak ada di rubrik versi ini'}
            {b.sumber !== 'manual' ? ' · terisi otomatis' : ''}
          </small>
          {peringatan.get(b.id)?.map((p, i) => (
            <small key={i} className="u-dupak-peringatan">
              <CircleAlert aria-hidden /> {p}
            </small>
          ))}
        </span>
      ),
    },
    { key: 'semester', header: 'Semester', shrink: true, cell: (b) => (b.semester ? semesterTeks(b.semester) : b.tanggal ? tgl(b.tanggal) : '-') },
    { key: 'volume', header: 'Volume', align: 'end', shrink: true, cell: (b) => `${angka(b.volume)} ${b.satuan ?? ''}${b.porsi < 1 ? ` × ${angka(b.porsi * 100, '%')}` : ''}` },
    { key: 'ak_usul', header: 'AK usul', align: 'end', shrink: true, cell: (b) => (b.ak_hitung > b.ak_usul ? <span title={`Dihitung ${angka(b.ak_hitung)} sebelum batas`}>{angka(b.ak_usul)} <small className="u-dupak-coret">{angka(b.ak_hitung)}</small></span> : angka(b.ak_usul)) },
    ...(d.status !== 'draf' && d.status !== 'dikembalikan'
      ? [
          {
            key: 'ak_fakultas',
            header: 'AK fakultas',
            align: 'end' as const,
            shrink: true,
            cell: (b: ButirDupak) =>
              penilai === 'ak_fakultas' ? <IsianAngka aria-label={`AK fakultas ${b.uraian}`} className="u-dupak-isian-ak" value={nilai?.[b.id] ?? b.ak_fakultas ?? b.ak_usul} onChange={(n) => onNilai?.(b.id, n)} /> : angka(b.ak_fakultas ?? (d.status === 'diajukan' ? null : b.ak_usul)),
          },
          {
            key: 'ak_diakui',
            header: 'AK diakui',
            align: 'end' as const,
            shrink: true,
            cell: (b: ButirDupak) =>
              penilai === 'ak_diakui' ? <IsianAngka aria-label={`AK diakui ${b.uraian}`} className="u-dupak-isian-ak" value={nilai?.[b.id] ?? b.ak_diakui ?? b.ak_fakultas ?? b.ak_usul} onChange={(n) => onNilai?.(b.id, n)} /> : angka(b.ak_diakui),
          },
        ]
      : []),
    {
      key: 'bukti',
      header: 'Bukti',
      shrink: true,
      cell: (b) =>
        b.file.length ? (
          <span className="u-dupak-bukti">
            {b.file.map((f) => (
              <a key={f.uuid} href={`/bff/api${f.url ?? `/v1/sdm/file/${f.uuid}`}?inline=1`} target="_blank" rel="noopener noreferrer" title={f.nama}>
                <Paperclip aria-hidden /> {f.nama.length > 18 ? `${f.nama.slice(0, 16)}…` : f.nama}
              </a>
            ))}
          </span>
        ) : b.sumber !== 'manual' ? (
          <span className="u-bkd-keterangan">Data SIAKAD</span>
        ) : b.rubrik?.bukti.length ? (
          <Badge variant="warning">Wajib</Badge>
        ) : (
          '-'
        ),
    },
  ];
  return (
    <DataTable<ButirDupak>
      columns={kolom}
      rows={d.butir}
      rowKey={(b) => String(b.id)}
      pagination={d.butir.length > 50}
      columnToggle={false}
      densityToggle={false}
      rowActions={
        ubah
          ? (b) => [
              { label: 'Ubah', icon: <Pencil />, onSelect: () => onUbah?.(b) },
              { label: 'Unggah bukti', icon: <Paperclip />, onSelect: () => onBukti?.(b) },
              { label: 'Hapus', icon: <Trash2 />, destructive: true, onSelect: () => onHapus?.(b) },
            ]
          : undefined
      }
      empty={{ title: 'Belum ada kegiatan', description: ubah ? 'Klik Isi otomatis atau Tambah kegiatan.' : undefined }}
    />
  );
}

/** Isian satu butir (tambah/ubah) di dalam langkah Kegiatan wizard. */
function IsianButirDupak({ d, b, onSelesai }: { d: DupakDetail; b: ButirDupak | null; onSelesai: () => void }) {
  const aksi = useAksiDupak();
  const s = useSiakad();
  const [n, setN] = React.useState({ kode_butir: b?.kode_butir ?? '', uraian: b?.uraian ?? '', semester: b?.semester ?? '', volume: b?.volume ?? (1 as number | null), berkas: null as string | null });
  const [galat, setGalat] = React.useState<string | null>(null);
  const [sibuk, setSibuk] = React.useState(false);
  const r = d.rubrik.find((x) => x.kode === n.kode_butir);
  const opsi = d.rubrik.map((x) => ({ value: x.kode, label: `${UNSUR_DUPAK[x.unsur] ?? x.unsur_nama} › ${x.uraian}`, description: `${x.ak == null ? 'AK belum diatur' : `${angka(x.ak)} AK/${x.satuan}`}${x.maks_ak_semester != null ? ` · maks ${angka(x.maks_ak_semester)}/semester` : ''}${x.jabatan.length ? ` · ${x.jabatan.join(', ')}` : ''}` }));
  return (
    <Card className="u-dupak-isian">
      <CardHeader title={b ? 'Ubah kegiatan' : 'Tambah kegiatan'} description={r ? `${r.sub_nama}${r.bukti.length ? ` · bukti wajib: ${r.bukti.join(', ')}` : ''}` : 'Pilih butir rubrik yang sesuai kegiatan Anda.'} />
      <CardContent className="u-bkd-form">
        <Field label="Butir rubrik" required>
          <Select options={opsi} value={n.kode_butir || null} onValueChange={(v) => setN({ ...n, kode_butir: v ?? '', uraian: n.uraian || (d.rubrik.find((x) => x.kode === v)?.uraian ?? '') })} placeholder="Pilih…" />
        </Field>
        <Field label="Uraian kegiatan" required description="Judul/nama kegiatan Anda (mis. judul artikel, nama pelatihan).">
          <Input value={n.uraian} onChange={(e) => setN({ ...n, uraian: e.target.value })} />
        </Field>
        <FormGrid columns={2}>
          <Field label="Semester">
            <Select options={d.semester.map((x) => ({ value: x.tahun_id, label: x.nama }))} value={n.semester || null} onValueChange={(v) => setN({ ...n, semester: v ?? '' })} placeholder="Pilih…" />
          </Field>
          <Field label={`Volume${r ? ` (${r.satuan})` : ''}`} required>
            <IsianAngka value={n.volume} onChange={(x) => setN({ ...n, volume: x })} />
          </Field>
        </FormGrid>
        {r ? <p className="u-bkd-keterangan">Perkiraan AK: {r.ak == null ? 'belum diatur di rubrik (0)' : angka((n.volume ?? 0) * r.ak)}{r.maks_ak_semester != null ? `; batas ${angka(r.maks_ak_semester)} AK per semester` : ''}.</p> : null}
        {!b ? (
          <Field label="Bukti" optional={!r?.bukti.length} required={!!r?.bukti.length} description={r?.bukti.length ? `Wajib: ${r.bukti.join(', ')}` : 'Bisa juga diunggah nanti.'}>
            <PilihBerkas value={n.berkas} kategori="dokumen" modul="sdm_dupak" keterangan="Bukti kegiatan DUPAK" onValueChange={(id) => setN({ ...n, berkas: id })} />
          </Field>
        ) : null}
        {galat ? <Alert variant="danger">{galat}</Alert> : null}
        <div className="u-bkd-aksi">
          <Button
            loading={sibuk}
            onClick={async () => {
              if (!n.kode_butir || !n.uraian.trim() || !n.volume) return setGalat('Pilih butir, isi uraian dan volume.');
              setSibuk(true);
              setGalat(null);
              try {
                const body = { kode_butir: n.kode_butir, uraian: n.uraian.trim(), semester: n.semester || null, volume: n.volume };
                const lama = new Set(d.butir.map((x) => x.id));
                const h = b ? await aksi<DupakDetail>('PUT', `/v1/sdm/dupak/butir/${b.id}`, body, 'Kegiatan diperbarui.') : await aksi<DupakDetail>('POST', `/v1/sdm/dupak/${d.id}/butir`, body, 'Kegiatan ditambahkan.');
                const baru = h.butir.find((x) => !lama.has(x.id));
                if (baru && n.berkas) {
                  await s.request({ method: 'POST', path: '/v1/sdm/file', body: { entitas: 'dupak_butir', entitas_id: baru.id, berkas_id: n.berkas } });
                  invalidateSiakad('dupak');
                }
                onSelesai();
              } catch (e) {
                setGalat(pesanGalat(e));
              } finally {
                setSibuk(false);
              }
            }}
          >
            {b ? 'Simpan kegiatan' : 'Tambah ke DUPAK'}
          </Button>
          <Button variant="ghost" onClick={onSelesai}>
            Batal
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UnggahBuktiButir({ b, onSelesai }: { b: ButirDupak; onSelesai: () => void }) {
  const s = useSiakad();
  const toast = useToast();
  return (
    <Card className="u-dupak-isian">
      <CardHeader title={`Bukti: ${b.uraian}`} description={b.rubrik?.bukti.length ? `Wajib: ${b.rubrik.bukti.join(', ')}` : undefined} action={<Button size="sm" variant="ghost" onClick={onSelesai}>Tutup</Button>} />
      <CardContent>
        <PilihBerkas
          value={null}
          kategori="dokumen"
          modul="sdm_dupak"
          keterangan="Bukti kegiatan DUPAK"
          onValueChange={async (id) => {
            if (!id) return;
            try {
              await s.request({ method: 'POST', path: '/v1/sdm/file', body: { entitas: 'dupak_butir', entitas_id: b.id, berkas_id: id } });
              toast.add({ title: 'Bukti dilampirkan.', type: 'success' });
              invalidateSiakad('dupak');
              onSelesai();
            } catch (e) {
              toast.add({ title: 'Belum berhasil', description: pesanGalat(e), type: 'error' });
            }
          }}
        />
      </CardContent>
    </Card>
  );
}

/** Wizard susun DUPAK: periode & jabatan tujuan → kegiatan (terisi otomatis, tambah/hapus, bukti) → tinjau → ajukan. */
export function PanelSusunDupak({ id: idAwal, onOpenChange }: { id: number | null; onOpenChange: (o: boolean) => void }) {
  const aksi = useAksiDupak();
  const [id, setId] = React.useState<number | null>(idAwal);
  const [step, setStep] = React.useState(idAwal ? 1 : 0);
  const d = useSiakadQuery<DupakDetail>(['dupak', 'detail', id], q(`/v1/sdm/dupak/${id}`), { enabled: id !== null, staleTime: 0 });
  const ref = useSiakadQuery<{ id: number; kode: string; nama: string; urutan: number; aktif?: number | boolean }[]>(['dupak', 'jabatan-akademik'], q('/v1/sdm/master/jabatan-akademik', { aktif: '1' }), { staleTime: 300_000 });
  const D = d.data;
  const [p, setP] = React.useState({ mulai: '', selesai: '', tujuan: '' as string, catatan: '' });
  React.useEffect(() => {
    if (D) setP({ mulai: D.periode_mulai, selesai: D.periode_selesai, tujuan: D.jabatan_tujuan_id ? String(D.jabatan_tujuan_id) : '', catatan: D.catatan_pengusul ?? '' });
  }, [D?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [isian, setIsian] = React.useState<ButirDupak | 'baru' | null>(null);
  const [bukti, setBukti] = React.useState<ButirDupak | null>(null);
  const [hapus, setHapus] = React.useState<ButirDupak | null>(null);
  const [tarik, setTarik] = React.useState(false);
  const jabatan = (D?.jabatan_akademik ?? ref.data ?? []).filter((j) => j.kode !== 'TP');
  return (
    <>
      <PanelLangkah
        open
        onOpenChange={onOpenChange}
        title={D ? `DUPAK ${semesterTeks(D.periode_mulai)} – ${semesterTeks(D.periode_selesai)}` : 'Susun DUPAK'}
        description={D?.aturan ? `Dihitung dengan ${D.aturan.nama} v${D.aturan.versi}${D.aturan.terkunci ? ' (terkunci sejak diajukan)' : ' (versi yang berlaku; dikunci saat diajukan)'}.` : 'Pilih periode penilaian; kegiatan Anda terisi otomatis.'}
        size="xl"
        mode={id ? 'ubah' : 'buat'}
        step={step}
        onStepChange={setStep}
        finishLabel="Ajukan DUPAK"
        steps={[
          {
            id: 'periode',
            title: 'Periode',
            description: 'Semester awal dan akhir kegiatan yang dinilai, serta jabatan yang dituju.',
            validate: async () => {
              if (!p.mulai || !p.selesai) return 'Pilih semester awal dan akhir.';
              if (p.mulai > p.selesai) return 'Semester akhir harus sesudah semester awal.';
              try {
                const body = { periode_mulai: p.mulai, periode_selesai: p.selesai, jabatan_tujuan_id: p.tujuan ? Number(p.tujuan) : null, catatan_pengusul: p.catatan.trim() || null };
                if (!id) {
                  const r = await aksi<DupakDetail>('POST', '/v1/sdm/dupak', body, 'Draf DUPAK dibuat; kegiatan terisi otomatis.');
                  setId(r.id);
                } else if (D && (D.periode_mulai !== p.mulai || D.periode_selesai !== p.selesai || String(D.jabatan_tujuan_id ?? '') !== p.tujuan || (D.catatan_pengusul ?? '') !== p.catatan)) {
                  await aksi('PUT', `/v1/sdm/dupak/${id}`, body);
                }
                return null;
              } catch (e) {
                return pesanGalat(e);
              }
            },
            content: (
              <div className="u-bkd-form">
                <FormGrid columns={2}>
                  <Field label="Semester awal" required>
                    <PilihTahunAkademik value={p.mulai || null} onValueChange={(v) => setP({ ...p, mulai: v ?? '' })} placeholder="Pilih…" />
                  </Field>
                  <Field label="Semester akhir" required>
                    <PilihTahunAkademik value={p.selesai || null} onValueChange={(v) => setP({ ...p, selesai: v ?? '' })} placeholder="Pilih…" />
                  </Field>
                </FormGrid>
                <Field label="Jabatan tujuan" description="Kosong = satu jenjang di atas jabatan Anda sekarang.">
                  <Select options={jabatan.map((j) => ({ value: String(j.id), label: j.nama }))} value={p.tujuan || null} onValueChange={(v) => setP({ ...p, tujuan: v ?? '' })} placeholder="Pilih…" />
                </Field>
                <Field label="Catatan untuk pemeriksa" optional>
                  <Textarea rows={2} value={p.catatan} onChange={(e) => setP({ ...p, catatan: e.target.value })} />
                </Field>
                {!id ? <Alert variant="info">Setelah Lanjut, draf dibuat dan kegiatan diisi otomatis dari jadwal mengajar, bimbingan tugas akhir, BKD yang disahkan, penelitian/pengabdian LP2M, dan luaran terverifikasi.</Alert> : null}
              </div>
            ),
          },
          {
            id: 'kegiatan',
            title: 'Kegiatan',
            description: 'Periksa kegiatan yang terisi otomatis, tambah yang belum ada, hapus yang tidak diajukan, dan unggah bukti.',
            validate: () => (D && D.butir.length === 0 ? 'Tambahkan minimal satu kegiatan.' : null),
            content: !D ? (
              <Skeleton style={{ height: 240 }} />
            ) : (
              <div className="u-bkd-form">
                <RingkasanAkDupak d={D} />
                <DaftarPeringatan d={D} />
                <div className="u-bkd-aksi">
                  <Button variant="outline" onClick={() => setIsian('baru')}>
                    <Plus /> Tambah kegiatan
                  </Button>
                  <Button
                    variant="ghost"
                    loading={tarik}
                    onClick={async () => {
                      setTarik(true);
                      try {
                        const r = await aksi<{ ditambah: number }>('POST', `/v1/sdm/dupak/${D.id}/tarik`, {});
                        void r;
                      } finally {
                        setTarik(false);
                      }
                    }}
                  >
                    <RefreshCw /> Isi otomatis lagi
                  </Button>
                </div>
                {isian ? <IsianButirDupak key={isian === 'baru' ? 'baru' : isian.id} d={D} b={isian === 'baru' ? null : isian} onSelesai={() => setIsian(null)} /> : null}
                {bukti ? <UnggahBuktiButir b={bukti} onSelesai={() => setBukti(null)} /> : null}
                <TabelButirDupak d={D} ubah onUbah={setIsian} onBukti={setBukti} onHapus={setHapus} />
              </div>
            ),
          },
          {
            id: 'tinjau',
            title: 'Tinjau & ajukan',
            content: !D ? (
              <Skeleton style={{ height: 240 }} />
            ) : (
              <div className="u-bkd-form">
                <WizardReview
                  sections={[
                    { title: 'Periode & jabatan', items: [{ label: 'Periode', value: `${semesterTeks(D.periode_mulai)} – ${semesterTeks(D.periode_selesai)} (${D.semester.length} semester)` }, { label: 'Jabatan', value: `${D.jabatan_asal ?? 'Belum ada'} → ${D.jabatan_tujuan ?? '-'}` }, { label: 'Rubrik', value: D.aturan ? `${D.aturan.nama} v${D.aturan.versi}` : null }], onEdit: () => setStep(0) },
                    {
                      title: 'Angka kredit usul',
                      items: [
                        ...KODE_UNSUR.map((u) => ({ label: UNSUR_DUPAK[u], value: `${angka(D.ringkasan.unsur[u]?.usul ?? 0)} (${D.ringkasan.unsur[u]?.butir ?? 0} kegiatan)` })),
                        { label: 'Total', value: <strong>{angka(D.ringkasan.total.usul)}</strong> },
                        { label: 'AK dasar (PAK terakhir)', value: angka(D.ak_dasar) },
                      ],
                      missing: D.ringkasan.blokir.length ? D.ringkasan.blokir.map((x) => x.pesan).join(' ') : undefined,
                      onEdit: () => setStep(1),
                    },
                    {
                      title: 'Komposisi unsur',
                      items: D.ringkasan.komposisi.length ? D.ringkasan.komposisi.map((k) => ({ label: UNSUR_DUPAK[k.unsur], value: `${angka(k.persen, '%')} (aturan ${k.op} ${angka(k.batas, '%')}) ${k.terpenuhi ? '✓' : '— perlu perhatian'}` })) : [{ label: 'Komposisi', value: 'Tidak diatur untuk jabatan ini' }],
                    },
                  ]}
                />
                <DampakKarier d={D} />
                <DaftarPeringatan d={D} />
                <AlurPemeriksa pemeriksa={D.pemeriksa} judul="Setelah diajukan, DUPAK diperiksa oleh" />
              </div>
            ),
          },
        ]}
        onFinish={async () => {
          if (!id) return 'Draf belum dibuat.';
          try {
            await aksi('POST', `/v1/sdm/dupak/${id}/ajukan`, {}, 'DUPAK diajukan ke fakultas.');
            return null;
          } catch (e) {
            return pesanGalat(e);
          }
        }}
      />
      <ConfirmDialog
        open={hapus !== null}
        onOpenChange={(o) => !o && setHapus(null)}
        title="Hapus kegiatan ini dari DUPAK?"
        description={hapus?.sumber !== 'manual' ? `${hapus?.uraian}. Kegiatan otomatis akan muncul lagi bila Anda menekan Isi otomatis lagi.` : hapus?.uraian}
        confirmLabel="Hapus kegiatan"
        onConfirm={async () => {
          if (hapus) await aksi('DELETE', `/v1/sdm/dupak/butir/${hapus.id}`, undefined, 'Kegiatan dihapus.');
          setHapus(null);
        }}
      />
    </>
  );
}

// ================================================================== rincian + penilaian

/** Rincian DUPAK di panel samping. Tombol mengikuti `aksi_boleh` dari server (pengusul, fakultas, Tim PAK, Biro SDM). */
export function PanelDupak({ id, onOpenChange }: { id: number; onOpenChange: (o: boolean) => void }) {
  const d = useSiakadQuery<DupakDetail>(['dupak', 'detail', id], q(`/v1/sdm/dupak/${id}`), { staleTime: 0 });
  const aksi = useAksiDupak();
  const [nilai, setNilai] = React.useState<Record<number, number | null>>({});
  const [dialog, setDialog] = React.useState<'kembalikan' | 'tolak' | 'tetapkan' | 'batal' | 'putus' | null>(null);
  const [catatan, setCatatan] = React.useState('');
  const [pak, setPak] = React.useState({ nomor: '', tanggal: new Date().toISOString().slice(0, 10) });
  const D = d.data;
  const boleh = (x: string) => !!D?.aksi_boleh.includes(x);
  const penilai = boleh('verifikasi') ? ('ak_fakultas' as const) : boleh('nilai') ? ('ak_diakui' as const) : undefined;
  const putus = boleh('verifikasi') ? 'verifikasi' : boleh('nilai') ? 'nilai' : null;
  const kirimNilai = async () => {
    if (!D || !putus) return;
    const butir = Object.entries(nilai).map(([bid, ak]) => ({ id: Number(bid), ak }));
    await aksi('POST', `/v1/sdm/dupak/${D.id}/${putus}`, { butir, catatan: catatan.trim() || null }, putus === 'verifikasi' ? 'DUPAK diverifikasi; diteruskan ke Tim PAK universitas.' : 'DUPAK dinilai; menunggu penetapan PAK.');
    setNilai({});
    setCatatan('');
    setDialog(null);
  };
  return (
    <Sheet
      open
      onOpenChange={onOpenChange}
      size="xl"
      title={D ? `DUPAK ${D.pegawai.nama}` : 'DUPAK'}
      description={D ? `${semesterTeks(D.periode_mulai)} – ${semesterTeks(D.periode_selesai)} · ${D.jabatan_asal ?? 'Belum ada jabatan'} → ${D.jabatan_tujuan ?? '-'}` : undefined}
      footer={
        D ? (
          <>
            {boleh('batal') ? (
              <Button variant="ghost" onClick={() => setDialog('batal')}>
                Batalkan pengajuan
              </Button>
            ) : null}
            {boleh('kembalikan') ? (
              <Button variant="outline" onClick={() => setDialog('kembalikan')}>
                <Undo2 /> Kembalikan
              </Button>
            ) : null}
            {boleh('tolak') ? (
              <Button variant="ghost" onClick={() => setDialog('tolak')}>
                <X /> Tolak
              </Button>
            ) : null}
            {putus ? (
              <Button onClick={() => setDialog('putus')}>
                <Send /> {putus === 'verifikasi' ? 'Verifikasi & teruskan' : 'Simpan penilaian'}
              </Button>
            ) : null}
            {boleh('tetapkan') ? (
              <Button onClick={() => setDialog('tetapkan')}>
                <BadgeCheck /> Tetapkan PAK
              </Button>
            ) : null}
          </>
        ) : undefined
      }
    >
      {!D ? (
        d.error ? <Alert variant="danger">{pesanGalat(d.error)}</Alert> : <Skeleton style={{ height: 360 }} />
      ) : (
        <div className="u-bkd-form">
          <div className="u-bkd-kepala">
            <div>
              <p className="u-bkd-label">{D.pegawai.nidn ? `NIDN ${D.pegawai.nidn}` : null}</p>
              <p className="u-bkd-keterangan">
                {D.aturan ? `${D.aturan.nama} v${D.aturan.versi}` : 'Rubrik belum ada'}
                {D.aturan?.terkunci ? ' (terkunci sejak diajukan)' : ''}
                {D.aturan && D.aturan.berlaku_id !== D.aturan.id && D.aturan.terkunci ? '; rubrik baru tidak mengubah pengajuan ini.' : ''}
              </p>
            </div>
            <div className="u-bkd-kepala-status">
              <LencanaStatusDupak d={D} />
              {D.peran ? <Badge variant="primary">Anda: {D.peran}</Badge> : null}
            </div>
          </div>
          {D.status === 'ditetapkan' ? (
            <Alert variant="success" icon={<BadgeCheck />} title={`PAK ${D.nomor_pak}, ${tgl(D.tanggal_pak)}`}>
              AK diakui {angka(D.ak_diakui.total)}; AK kumulatif {angka(D.ak_kumulatif)} langsung dipakai syarat angka kredit aturan karier.
            </Alert>
          ) : null}
          {D.catatan && D.status !== 'ditetapkan' ? <Alert variant={D.status === 'ditolak' || D.status === 'dikembalikan' ? 'warning' : 'info'} title="Catatan pemeriksa">{D.catatan}</Alert> : null}
          <DataTable
            rows={[...KODE_UNSUR, 'total'].map((u) => ({ u }))}
            rowKey={(r) => r.u}
            pagination={false}
            columnToggle={false}
            densityToggle={false}
            columns={[
              { key: 'u', header: 'Unsur', mobile: 'title', cell: (r) => (r.u === 'total' ? <strong>Total</strong> : UNSUR_DUPAK[r.u]) },
              { key: 'usul', header: 'AK usul', align: 'end', cell: (r) => angka(r.u === 'total' ? D.ringkasan.total.usul : D.ringkasan.unsur[r.u]?.usul) },
              { key: 'fakultas', header: 'AK fakultas', align: 'end', cell: (r) => (D.status === 'diajukan' ? '-' : angka(r.u === 'total' ? D.ringkasan.total.fakultas : D.ringkasan.unsur[r.u]?.fakultas)) },
              { key: 'diakui', header: 'AK diakui', align: 'end', cell: (r) => angka(r.u === 'total' ? D.ak_diakui.total : D.ak_diakui[r.u as 'pendidikan']) },
            ]}
          />
          <DampakKarier d={D} />
          <AlurPemeriksa pemeriksa={D.pemeriksa} />
          {penilai ? <Alert variant="info">Isi kolom {penilai === 'ak_fakultas' ? 'AK fakultas' : 'AK diakui'} bila berbeda dari usul (mis. bukti tidak sesuai), lalu {putus === 'verifikasi' ? 'verifikasi' : 'simpan penilaian'}.</Alert> : null}
          <DaftarPeringatan d={{ ...D, ringkasan: { ...D.ringkasan, blokir: [] } }} />
          <TabelButirDupak d={D} penilai={penilai} nilai={nilai} onNilai={(bid, n) => setNilai({ ...nilai, [bid]: n })} />
          <h4 className="u-bkd-label">Riwayat</h4>
          <LinimasaPengajuan langkah={D.linimasa} />
        </div>
      )}
      <ConfirmDialog
        open={dialog === 'putus'}
        onOpenChange={(o) => !o && setDialog(null)}
        tone="primary"
        title={putus === 'verifikasi' ? 'Verifikasi DUPAK ini?' : 'Simpan penilaian angka kredit?'}
        description={putus === 'verifikasi' ? 'DUPAK diteruskan ke Tim PAK universitas.' : 'AK diakui per butir disimpan; DUPAK menunggu penetapan PAK oleh Biro SDM.'}
        confirmLabel={putus === 'verifikasi' ? 'Verifikasi' : 'Simpan penilaian'}
        onConfirm={kirimNilai}
      >
        <Field label="Catatan" optional>
          <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        </Field>
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === 'kembalikan' || dialog === 'tolak' || dialog === 'batal'}
        onOpenChange={(o) => !o && setDialog(null)}
        tone={dialog === 'kembalikan' ? 'warning' : 'danger'}
        title={dialog === 'kembalikan' ? 'Kembalikan ke dosen?' : dialog === 'tolak' ? 'Tolak DUPAK ini?' : 'Batalkan pengajuan?'}
        description={dialog === 'kembalikan' ? 'Penilaian dihapus; dosen memperbaiki lalu mengajukan lagi (versi rubrik tetap).' : dialog === 'tolak' ? 'DUPAK tidak dilanjutkan.' : 'DUPAK tidak diproses lagi.'}
        confirmLabel={dialog === 'kembalikan' ? 'Kembalikan' : dialog === 'tolak' ? 'Tolak' : 'Batalkan pengajuan'}
        onConfirm={async () => {
          if (!D || !dialog || dialog === 'putus' || dialog === 'tetapkan') return;
          await aksi('POST', `/v1/sdm/dupak/${D.id}/${dialog}`, { catatan: catatan.trim() || null }, dialog === 'kembalikan' ? 'DUPAK dikembalikan.' : dialog === 'tolak' ? 'DUPAK ditolak.' : 'Pengajuan dibatalkan.');
          setCatatan('');
          setDialog(null);
        }}
      >
        {dialog !== 'batal' ? (
          <Field label="Catatan untuk dosen" required>
            <Textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </Field>
        ) : null}
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === 'tetapkan'}
        onOpenChange={(o) => !o && setDialog(null)}
        tone="primary"
        title="Tetapkan PAK?"
        description={D ? `AK diakui ${angka(D.ak_diakui.total)}; AK kumulatif menjadi ${angka((D.ak_dasar ?? 0) + (D.ak_diakui.total ?? 0))} dan langsung dipakai syarat aturan karier.` : undefined}
        confirmLabel="Tetapkan PAK"
        onConfirm={async () => {
          if (!D) return;
          await aksi('POST', `/v1/sdm/dupak/${D.id}/tetapkan`, { nomor_pak: pak.nomor.trim(), tanggal_pak: pak.tanggal, catatan: catatan.trim() || null }, 'PAK ditetapkan.');
          setDialog(null);
        }}
      >
        <FormGrid columns={2}>
          <Field label="Nomor PAK" required>
            <Input value={pak.nomor} onChange={(e) => setPak({ ...pak, nomor: e.target.value })} />
          </Field>
          <Field label="Tanggal PAK" required>
            <IsianTanggal value={pak.tanggal} onValueChange={(v) => setPak({ ...pak, tanggal: v ?? '' })} />
          </Field>
        </FormGrid>
      </ConfirmDialog>
    </Sheet>
  );
}

/** Antrean DUPAK: verifikasi fakultas, penilaian Tim PAK universitas, penetapan PAK. Tahap yang bisa diputus ditentukan server. */
export function AntreanDupak({ className, judulKosong }: { className?: string; judulKosong?: string }) {
  const [tab, setTab] = React.useState<'antrean' | 'semua'>('antrean');
  const daftar = useSiakadQuery<DupakRow[]>(['dupak', 'daftar', tab], q('/v1/sdm/dupak', { sebagai: tab }));
  const [buka, setBuka] = React.useState<number | null>(null);
  const kolom: DataColumn<DupakRow>[] = [
    { key: 'pegawai_nama', header: 'Dosen', mobile: 'title', cell: (r) => <span className="u-dupak-sel"><strong>{r.pegawai_nama}</strong>{r.nidn ? <small>NIDN {r.nidn}</small> : null}</span> },
    { key: 'jabatan', header: 'Jabatan', cell: (r) => `${r.jabatan_asal ?? 'Belum ada'} → ${r.jabatan_tujuan ?? '-'}` },
    { key: 'periode', header: 'Periode', cell: (r) => `${semesterTeks(r.periode_mulai)} – ${semesterTeks(r.periode_selesai)}` },
    { key: 'ak', header: 'AK usul', align: 'end', cell: (r) => angka(r.ak_usul.total) },
    { key: 'diakui', header: 'AK diakui', align: 'end', cell: (r) => angka(r.ak_diakui.total) },
    { key: 'status', header: 'Tahap', shrink: true, mobile: 'badge', cell: (r) => <LencanaStatusDupak d={r} /> },
  ];
  const tabel = (
    <DataTable<DupakRow>
      columns={kolom}
      rows={daftar.data}
      rowKey={(r) => String(r.id)}
      loading={daftar.loading}
      error={daftar.error}
      onRetry={daftar.refetch}
      onRowClick={(r) => setBuka(r.id)}
      columnToggle={false}
      densityToggle={false}
      empty={{ title: tab === 'antrean' ? (judulKosong ?? 'Tidak ada DUPAK yang menunggu Anda') : 'Belum ada DUPAK yang bisa Anda lihat' }}
    />
  );
  return (
    <div className={className}>
      <Tabs
        variant="underline"
        value={tab}
        onValueChange={(v) => setTab(v as 'antrean' | 'semua')}
        items={[
          { value: 'antrean', label: 'Menunggu saya', count: tab === 'antrean' ? daftar.data?.length : undefined, content: tabel },
          { value: 'semua', label: 'Semua DUPAK', content: tabel },
        ]}
      />
      {buka !== null ? <PanelDupak id={buka} onOpenChange={(o) => !o && setBuka(null)} /> : null}
    </div>
  );
}

/** Jumlah DUPAK yang menunggu pengguna (untuk lencana menu). */
export function useAntreanDupak() {
  return useSiakadQuery<DupakRow[]>(['dupak', 'daftar', 'antrean'], q('/v1/sdm/dupak', { sebagai: 'antrean' }), { staleTime: 60_000 });
}

