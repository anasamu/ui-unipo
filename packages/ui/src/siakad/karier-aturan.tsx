'use client';
import * as React from 'react';
import { Archive, CircleAlert, Copy, Eye, FileCheck2, GitCompare, Pencil, Plus, Scale, Trash2, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Card, CardContent, CardHeader, DescriptionList, Empty, Tabs } from '../components/display';
import { StatCard, StatGrid } from '../components/charts';
import { DataTable } from '../components/data-table';
import { Checkbox, Field, Input, Textarea } from '../components/forms';
import { Select } from '../components/select';
import { ConfirmDialog, Sheet, useToast } from '../components/overlays';
import { IsianTanggal } from '../components/formulir';
import { WizardReview } from '../components/wizard';
import { PanelLangkah } from '../components/panel-langkah';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { PilihSK } from './isian-sk';
import { DaftarPerubahanAturan, DaftarVersiAturan, LencanaStatusVersi, PanelBandingAturan, type PerubahanAturan, type VersiAturanRow } from './aturan-versi';

/*
 * Aturan karier berversi (SIAKAD /v1/sdm/karier/aturan, docs/KEPEGAWAIAN-DOSEN.md "Aturan karier"; mekanisme versi sama
 * dengan Aturan BKD: Sdm\Services\AturanVersi, tabel sdm_aturan_versi jenis `karier`). Syarat kenaikan jabatan
 * fungsional dosen, pangkat/golongan, dan sertifikasi dosen diatur Biro SDM di sini, bukan di kode. Aturan baru dari
 * kementerian = salin versi -> ubah (wizard per bagian) -> pratinjau dampak (berapa dosen jadi memenuhi/tidak) ->
 * terbitkan dengan tanggal berlaku. Usulan mengunci versi yang berlaku saat diajukan.
 */

const BASIS = '/v1/sdm/karier/aturan';

export interface KaryaKarier {
  kode: string;
  nama: string;
  jumlah: number;
  jenis_luaran: string[];
  penulis_utama: boolean;
}
export interface DokumenKarier {
  nama: string;
  wajib: boolean;
  keterangan: string;
}
export interface JenjangKarier {
  kode: string;
  nama: string;
  aktif: boolean;
  ak_min: number | null;
  unsur: { pendidikan_min_persen: number | null; penelitian_min_persen: number | null; pengabdian_maks_persen: number | null; penunjang_maks_persen: number | null };
  masa_jenjang_min_tahun: number | null;
  masa_dosen_tetap_min_tahun: number | null;
  pendidikan_min: string | null;
  karya: KaryaKarier[];
  serdos: boolean;
  uji_kompetensi: boolean;
  bkd_semester: number | null;
  dokumen: DokumenKarier[];
  sumber: string;
  perlu_dicek: boolean;
  catatan: string | null;
}
export interface IsiAturanKarier {
  umum: { dosen_tetap: boolean; loncat_boleh: boolean; loncat_syarat: string; indikator_manual: boolean; sumber: string };
  jenjang: JenjangKarier[];
  pangkat: { masa_min_tahun: number | null; kinerja_min: 'baik' | 'sangat_baik' | null; bebas_disiplin: boolean; golongan: { kode: string; nama: string; ak_min: number | null }[]; dokumen: DokumenKarier[]; sumber: string; perlu_dicek: boolean };
  serdos: { pengalaman_min_tahun: number | null; jabatan_min: string | null; dosen_tetap: boolean; dokumen: DokumenKarier[]; sumber: string };
}
interface AturanKarierRow extends VersiAturanRow {
  berlaku_tanggal: string | null;
  berlaku_sekarang?: boolean;
  jumlah_usulan?: number;
}
interface AturanKarierDetail extends AturanKarierRow {
  isi: IsiAturanKarier;
  usulan: { id: number; jenis: string; status: string; nama: string }[];
  riwayat: { waktu: string; username: string; aksi: string; ringkasan: string | null }[];
  jabatan_akademik: { id: number; kode: string; nama: string; urutan: number }[];
  golongan: { kode: string; pangkat: string }[];
  jenis_luaran: { kode: string; nama: string }[];
  induk?: { id: number; nama: string; versi: number };
  perubahan?: PerubahanAturan[];
}
interface PratinjauKarier {
  aturan: { id: number; nama: string; versi: number; status: string };
  aturan_sekarang: { id: number; nama: string; versi: number } | null;
  perubahan: PerubahanAturan[];
  ringkasan: { jumlah: number; memenuhi_sekarang: number; memenuhi_sesudah: number; berubah: number; jadi_memenuhi: number; jadi_tidak_memenuhi: number };
  laporan: { pegawai_id: number; nama: string; nidn: string | null; kode_prodi: string | null; sasaran: string | null; sekarang: string | null; sesudah: string; berubah: boolean; alasan: string[] }[];
}

const tgl = (s?: string | null) => (s ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s.length <= 10 ? `${s}T00:00:00` : s.replace(' ', 'T'))) : '-');
const angka = (n: number | null | undefined, satuan = '') => (n == null ? null : `${Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 })}${satuan}`);
const angkaAtauNull = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')));
const t = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));
const q = <T,>(path: string) => (s: ReturnType<typeof useSiakad>, signal: AbortSignal) => s.request<T>({ method: 'GET', path }, { signal });
const LABEL_KESIMPULAN: Record<string, [string, React.ComponentProps<typeof Badge>['variant']]> = { memenuhi: ['Memenuhi', 'success'], belum: ['Belum memenuhi', 'danger'], perlu_dicek: ['Perlu dicek', 'neutral'] };

function Kesimpulan({ nilai }: { nilai: string | null }) {
  if (!nilai) return <>-</>;
  const [l, v] = LABEL_KESIMPULAN[nilai] ?? [nilai, 'neutral'];
  return <Badge variant={v}>{l}</Badge>;
}
const BelumDiatur = () => <span className="u-ak-kosong">Belum diatur</span>;

function useAksiKarier() {
  const s = useSiakad();
  const toast = useToast();
  return React.useCallback(
    async <T,>(method: 'POST' | 'PUT', path: string, body?: unknown, sukses?: string): Promise<T> => {
      try {
        const r = await s.request<T>({ method, path, body: body ?? {} });
        if (sukses) toast.add({ title: sukses, type: 'success' });
        invalidateSiakad('karier-aturan');
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

/** Ringkasan satu jenjang dalam kalimat pendek (untuk tabel dan ringkasan wizard). */
function ringkasJenjang(j: JenjangKarier): string[] {
  const u = j.unsur;
  return [
    j.ak_min != null ? `AK kumulatif ≥ ${angka(j.ak_min)}` : 'AK minimal belum diatur',
    u.penelitian_min_persen != null ? `penelitian ≥ ${angka(u.penelitian_min_persen, '%')}` : null,
    u.pendidikan_min_persen != null ? `pendidikan ≥ ${angka(u.pendidikan_min_persen, '%')}` : null,
    u.pengabdian_maks_persen != null ? `pengabdian ≤ ${angka(u.pengabdian_maks_persen, '%')}` : null,
    u.penunjang_maks_persen != null ? `penunjang ≤ ${angka(u.penunjang_maks_persen, '%')}` : null,
    j.masa_jenjang_min_tahun != null ? `${angka(j.masa_jenjang_min_tahun)} th di jenjang` : null,
    j.masa_dosen_tetap_min_tahun != null ? `${angka(j.masa_dosen_tetap_min_tahun)} th dosen tetap` : null,
    j.pendidikan_min ? `pendidikan ${j.pendidikan_min}` : null,
    ...j.karya.filter((k) => k.jumlah > 0).map((k) => `${k.jumlah} ${k.nama.toLowerCase()}`),
    j.bkd_semester ? `BKD ${j.bkd_semester} smt memenuhi` : null,
    j.serdos ? 'bersertifikat pendidik' : null,
    j.uji_kompetensi ? 'uji kompetensi' : null,
  ].filter((x): x is string => !!x);
}

/** Halaman Aturan karier (SDM » Pengaturan): daftar versi, rincian per bagian, editor wizard, salin, terbitkan, banding, pratinjau dampak. */
export function KelolaAturanKarier({ className }: { className?: string }) {
  const daftar = useSiakadQuery<AturanKarierRow[]>(['karier-aturan', 'daftar'], q(BASIS));
  const [pilih, setPilih] = React.useState<number | null>(null);
  const rows = daftar.data ?? [];
  const id = pilih ?? rows.find((a) => a.status === 'draf')?.id ?? rows.find((a) => a.berlaku_sekarang)?.id ?? rows[0]?.id ?? null;
  if (daftar.loading && !daftar.data) return <Skeleton style={{ height: 360 }} />;
  if (daftar.error) return <Alert variant="danger" title="Aturan karier belum bisa dimuat">{pesanGalat(daftar.error)}</Alert>;
  return (
    <div className={cn('u-bkd-aturan u-ak', className)}>
      <div className="u-ak-kiri">
        <DaftarVersiAturan versi={rows.map((r) => ({ ...r, berlaku_mulai: r.berlaku_tanggal, berlaku_mulai_nama: r.berlaku_tanggal ? tgl(r.berlaku_tanggal) : null, jumlah_periode: r.jumlah_usulan ?? 0 }))} value={id} onValueChange={setPilih} satuanPemakai="usulan" label="Versi aturan karier" />
        <p className="u-bkd-keterangan">Versi terbit dikunci. Untuk aturan baru, salin versi lalu ubah drafnya.</p>
      </div>
      {id ? <RincianAturanKarier id={id} onPilih={setPilih} /> : <Empty bordered icon={<Scale />} title="Belum ada aturan karier" description="Jalankan migration SIAKAD agar versi bawaan dibuat." />}
    </div>
  );
}

function RincianAturanKarier({ id, onPilih }: { id: number; onPilih: (id: number | null) => void }) {
  const d = useSiakadQuery<AturanKarierDetail>(['karier-aturan', 'detail', id], q(`${BASIS}/${id}`));
  const aksi = useAksiKarier();
  const [panel, setPanel] = React.useState<'ubah' | 'pratinjau' | 'banding' | 'hapus' | 'terbit' | null>(null);
  if (d.loading && !d.data) return <Skeleton style={{ height: 360 }} />;
  if (!d.data) return <Alert variant="danger">{pesanGalat(d.error)}</Alert>;
  const a = d.data;
  const isi = a.isi;
  const dicek = isi.jenjang.filter((j) => j.perlu_dicek).length + (isi.pangkat.perlu_dicek ? 1 : 0);
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
              <p className="u-bkd-keterangan" style={{ whiteSpace: 'pre-line' }}>{a.dasar_hukum ?? 'Dasar hukum belum diisi.'}</p>
            </div>
            <div className="u-bkd-kepala-status">
              {a.berlaku_sekarang ? <Badge variant="primary">Berlaku sekarang</Badge> : null}
              <LencanaStatusVersi status={a.status}>{a.diterbitkan_at ? ` ${tgl(a.diterbitkan_at)}` : ''}</LencanaStatusVersi>
            </div>
          </div>
          <DescriptionList
            items={[
              { label: 'SK/pedoman', value: a.sk ? `${a.sk.nomor}${a.sk.tanggal ? `, ${tgl(a.sk.tanggal)}` : ''}` : <span className="u-bkd-keterangan">Belum dilampirkan</span> },
              { label: 'Berlaku mulai', value: a.berlaku_tanggal ? tgl(a.berlaku_tanggal) : a.status === 'terbit' ? 'Sejak diterbitkan' : 'Diisi sebelum terbit' },
              { label: 'Dipakai usulan', value: a.usulan.length ? `${a.usulan.length} usulan mengunci versi ini` : 'Belum ada' },
            ]}
          />
          {dicek ? (
            <Alert variant="warning" icon={<CircleAlert />} title={`${dicek} bagian perlu dicek SDM`}>
              Nilai yang belum ada di ketentuan lama dibiarkan kosong (tidak dikarang). Salin versi ini, isi angkanya dari pedoman yang berlaku, lalu terbitkan.
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
                const r = await aksi<AturanKarierDetail>('POST', `${BASIS}/${a.id}/salin`, {}, 'Versi baru dibuat sebagai draf.');
                onPilih(r.id);
              }}
            >
              <Copy /> Salin jadi versi baru
            </Button>
            <Button variant="outline" onClick={() => setPanel('pratinjau')}>
              <Eye /> Pratinjau dampak
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
          {
            value: 'jenjang',
            label: 'Jabatan fungsional',
            count: isi.jenjang.length,
            content: (
              <div className="u-ak-jenjang">
                {isi.jenjang.map((j) => (
                  <Card key={j.kode} className="u-ak-kartu" data-aktif={j.aktif ? '' : undefined}>
                    <CardHeader
                      title={
                        <span className="u-ak-judul">
                          <span className="u-ak-kode">{j.kode}</span> {j.nama}
                        </span>
                      }
                      description={j.sumber || undefined}
                      action={
                        <span className="u-bkd-kepala-status">
                          {j.perlu_dicek ? <Badge variant="warning">Perlu dicek SDM</Badge> : null}
                          {!j.aktif ? <Badge variant="neutral">Nonaktif</Badge> : null}
                        </span>
                      }
                    />
                    <CardContent>
                      <DescriptionList
                        items={[
                          { label: 'Angka kredit kumulatif', value: j.ak_min != null ? `≥ ${angka(j.ak_min)}` : <BelumDiatur /> },
                          { label: 'Komposisi unsur', value: ringkasJenjang({ ...j, ak_min: null, masa_jenjang_min_tahun: null, masa_dosen_tetap_min_tahun: null, pendidikan_min: null, karya: [], bkd_semester: null, serdos: false, uji_kompetensi: false }).slice(1).join(', ') || <BelumDiatur /> },
                          { label: 'Masa kerja', value: [j.masa_jenjang_min_tahun != null ? `${angka(j.masa_jenjang_min_tahun)} tahun di jenjang sebelumnya` : null, j.masa_dosen_tetap_min_tahun != null ? `${angka(j.masa_dosen_tetap_min_tahun)} tahun sebagai dosen tetap` : null].filter(Boolean).join('; ') || <BelumDiatur /> },
                          { label: 'Pendidikan minimal', value: j.pendidikan_min ?? <BelumDiatur /> },
                          { label: 'Karya wajib', value: j.karya.length ? j.karya.map((k) => `${k.jumlah} ${k.nama}${k.jenis_luaran.length ? ` (${k.jenis_luaran.join(', ')})` : ''}`).join('; ') : 'Tidak ada' },
                          { label: 'BKD', value: j.bkd_semester ? `${j.bkd_semester} semester terakhir memenuhi` : 'Tidak disyaratkan' },
                          { label: 'Lain', value: [j.serdos ? 'Sertifikat pendidik' : null, j.uji_kompetensi ? 'Lulus uji kompetensi' : null].filter(Boolean).join(', ') || '-' },
                          { label: 'Dokumen', value: j.dokumen.map((x) => `${x.nama}${x.wajib ? '' : ' (bila ada)'}`).join(', ') || '-' },
                          ...(j.catatan ? [{ label: 'Catatan', value: j.catatan }] : []),
                        ]}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ),
          },
          {
            value: 'pangkat',
            label: 'Pangkat/golongan',
            content: (
              <Card>
                <CardHeader title="Kenaikan pangkat/golongan" description={isi.pangkat.sumber || undefined} action={isi.pangkat.perlu_dicek ? <Badge variant="warning">Perlu dicek SDM</Badge> : undefined} />
                <CardContent>
                  <DescriptionList
                    items={[
                      { label: 'Masa dalam pangkat', value: isi.pangkat.masa_min_tahun != null ? `≥ ${angka(isi.pangkat.masa_min_tahun)} tahun` : <BelumDiatur /> },
                      { label: 'Kinerja terakhir', value: isi.pangkat.kinerja_min ? `minimal ${isi.pangkat.kinerja_min.replace('_', ' ')}` : 'Tidak disyaratkan' },
                      { label: 'Hukuman disiplin', value: isi.pangkat.bebas_disiplin ? 'Tidak sedang menjalani' : 'Tidak diperiksa' },
                      { label: 'Angka kredit per golongan (dosen)', value: isi.pangkat.golongan.filter((g) => g.ak_min != null).map((g) => `${g.kode} ≥ ${angka(g.ak_min)}`).join(', ') || <BelumDiatur /> },
                      { label: 'Dokumen', value: isi.pangkat.dokumen.map((x) => `${x.nama}${x.wajib ? '' : ' (bila ada)'}`).join(', ') || '-' },
                    ]}
                  />
                </CardContent>
              </Card>
            ),
          },
          {
            value: 'serdos',
            label: 'Sertifikasi & umum',
            content: (
              <div className="u-bkd-form">
                <Card>
                  <CardHeader title="Sertifikasi dosen" description={isi.serdos.sumber || undefined} />
                  <CardContent>
                    <DescriptionList
                      items={[
                        { label: 'Pengalaman pendidik', value: isi.serdos.pengalaman_min_tahun != null ? `≥ ${angka(isi.serdos.pengalaman_min_tahun)} tahun` : <BelumDiatur /> },
                        { label: 'Jabatan minimal', value: a.jabatan_akademik.find((x) => x.kode === isi.serdos.jabatan_min)?.nama ?? isi.serdos.jabatan_min ?? '-' },
                        { label: 'Dosen tetap', value: isi.serdos.dosen_tetap ? 'Wajib' : 'Tidak' },
                        { label: 'Dokumen', value: isi.serdos.dokumen.map((x) => `${x.nama}${x.wajib ? '' : ' (bila ada)'}`).join(', ') || '-' },
                      ]}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader title="Ketentuan umum" description={isi.umum.sumber || undefined} />
                  <CardContent>
                    <DescriptionList
                      items={[
                        { label: 'Hanya dosen tetap', value: isi.umum.dosen_tetap ? 'Ya' : 'Tidak' },
                        { label: 'Loncat jenjang', value: isi.umum.loncat_boleh ? `Boleh satu jenjang. ${isi.umum.loncat_syarat}` : 'Tidak diizinkan' },
                        { label: 'Indikator kinerja', value: isi.umum.indikator_manual ? 'Diperiksa manual oleh verifikator' : 'Tidak ditampilkan' },
                      ]}
                    />
                  </CardContent>
                </Card>
              </div>
            ),
          },
          ...(a.perubahan ? [{ value: 'perubahan', label: `Perubahan dari v${a.induk?.versi}`, count: a.perubahan.length, content: <Card><CardContent><DaftarPerubahanAturan perubahan={a.perubahan} /></CardContent></Card> }] : []),
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
      {panel === 'ubah' ? <PanelUbahAturanKarier aturan={a} onOpenChange={(o) => !o && setPanel(null)} /> : null}
      {panel === 'pratinjau' ? <PanelPratinjauAturanKarier aturan={a} onOpenChange={(o) => !o && setPanel(null)} onTerbit={() => setPanel('terbit')} /> : null}
      {panel === 'banding' ? <PanelBandingAturan basis={BASIS} aturan={a} onOpenChange={(o) => !o && setPanel(null)} /> : null}
      <ConfirmDialog
        open={panel === 'terbit'}
        onOpenChange={(o) => !o && setPanel(null)}
        tone="primary"
        title="Terbitkan versi ini?"
        description={`${a.nama} v${a.versi} dikunci dan ${a.berlaku_tanggal ? `berlaku untuk usulan yang diajukan sejak ${tgl(a.berlaku_tanggal)}` : 'langsung berlaku untuk usulan baru'}. Usulan yang sudah diajukan tetap memakai versi yang dikuncinya.`}
        confirmLabel="Terbitkan"
        onConfirm={async () => {
          await aksi('POST', `${BASIS}/${a.id}/terbitkan`, {}, 'Versi diterbitkan dan dikunci.');
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

// ------------------------------------------------------------------ editor draf (wizard di panel samping)
function DaftarDokumenIsian({ dokumen, onChange }: { dokumen: DokumenKarier[]; onChange: (d: DokumenKarier[]) => void }) {
  return (
    <div className="u-ak-dok">
      <p className="u-bkd-label">Dokumen</p>
      {dokumen.map((d, i) => (
        <div key={i} className="u-ak-dok-baris">
          <Input aria-label="Nama dokumen" placeholder="Nama dokumen" value={d.nama} onChange={(e) => onChange(dokumen.map((x, k) => (k === i ? { ...x, nama: e.target.value } : x)))} />
          <Input aria-label="Keterangan" placeholder="Keterangan untuk dosen" value={d.keterangan} onChange={(e) => onChange(dokumen.map((x, k) => (k === i ? { ...x, keterangan: e.target.value } : x)))} />
          <label className="u-ak-centang">
            <Checkbox checked={d.wajib} onCheckedChange={(v) => onChange(dokumen.map((x, k) => (k === i ? { ...x, wajib: v === true } : x)))} /> Wajib
          </label>
          <Button size="sm" variant="ghost" aria-label={`Hapus ${d.nama || 'dokumen'}`} onClick={() => onChange(dokumen.filter((_, k) => k !== i))}>
            <X />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={() => onChange([...dokumen, { nama: '', wajib: false, keterangan: '' }])}>
        <Plus /> Tambah dokumen
      </Button>
    </div>
  );
}

function IsianJenjang({ j, onChange, jenisLuaran }: { j: JenjangKarier; onChange: (x: Partial<JenjangKarier>) => void; jenisLuaran: { kode: string; nama: string }[] }) {
  const unsur = (k: keyof JenjangKarier['unsur'], v: string) => onChange({ unsur: { ...j.unsur, [k]: angkaAtauNull(v) } });
  const karya = (i: number, x: Partial<KaryaKarier>) => onChange({ karya: j.karya.map((k, n) => (n === i ? { ...k, ...x } : k)) });
  return (
    <fieldset className="u-ak-isian" data-aktif={j.aktif ? '' : undefined}>
      <legend>
        <span className="u-ak-kode">{j.kode}</span> {j.nama}
      </legend>
      <div className="u-ak-isian-kepala">
        <label className="u-ak-centang">
          <Checkbox checked={j.aktif} onCheckedChange={(v) => onChange({ aktif: v === true })} /> Jenjang aktif
        </label>
        <label className="u-ak-centang">
          <Checkbox checked={j.perlu_dicek} onCheckedChange={(v) => onChange({ perlu_dicek: v === true })} /> Tandai perlu dicek SDM
        </label>
      </div>
      <div className="u-bkd-grid-3">
        <Field label="AK kumulatif minimal" description="Kosongkan bila belum ditetapkan.">
          <Input inputMode="decimal" value={t(j.ak_min)} onChange={(e) => onChange({ ak_min: angkaAtauNull(e.target.value) })} />
        </Field>
        <Field label="Masa di jenjang sebelumnya (tahun)">
          <Input inputMode="decimal" value={t(j.masa_jenjang_min_tahun)} onChange={(e) => onChange({ masa_jenjang_min_tahun: angkaAtauNull(e.target.value) })} />
        </Field>
        <Field label="Masa dosen tetap (tahun)">
          <Input inputMode="decimal" value={t(j.masa_dosen_tetap_min_tahun)} onChange={(e) => onChange({ masa_dosen_tetap_min_tahun: angkaAtauNull(e.target.value) })} />
        </Field>
        <Field label="Penelitian minimal (%)">
          <Input inputMode="decimal" value={t(j.unsur.penelitian_min_persen)} onChange={(e) => unsur('penelitian_min_persen', e.target.value)} />
        </Field>
        <Field label="Pendidikan minimal (%)">
          <Input inputMode="decimal" value={t(j.unsur.pendidikan_min_persen)} onChange={(e) => unsur('pendidikan_min_persen', e.target.value)} />
        </Field>
        <Field label="Penunjang maksimal (%)">
          <Input inputMode="decimal" value={t(j.unsur.penunjang_maks_persen)} onChange={(e) => unsur('penunjang_maks_persen', e.target.value)} />
        </Field>
        <Field label="Pengabdian maksimal (%)">
          <Input inputMode="decimal" value={t(j.unsur.pengabdian_maks_persen)} onChange={(e) => unsur('pengabdian_maks_persen', e.target.value)} />
        </Field>
        <Field label="Pendidikan minimal">
          <Select options={[{ value: '', label: 'Tidak disyaratkan' }, ...['S1', 'S2', 'S3'].map((x) => ({ value: x, label: x }))]} value={j.pendidikan_min ?? ''} onValueChange={(v) => onChange({ pendidikan_min: v || null })} placeholder="Pilih…" />
        </Field>
        <Field label="BKD memenuhi (semester terakhir)" description="Kosong = tidak disyaratkan.">
          <Input inputMode="numeric" value={t(j.bkd_semester)} onChange={(e) => onChange({ bkd_semester: angkaAtauNull(e.target.value) })} />
        </Field>
      </div>
      <div className="u-ak-isian-kepala">
        <label className="u-ak-centang">
          <Checkbox checked={j.serdos} onCheckedChange={(v) => onChange({ serdos: v === true })} /> Wajib sertifikat pendidik
        </label>
        <label className="u-ak-centang">
          <Checkbox checked={j.uji_kompetensi} onCheckedChange={(v) => onChange({ uji_kompetensi: v === true })} /> Wajib lulus uji kompetensi
        </label>
      </div>
      <p className="u-bkd-label">Karya wajib</p>
      {j.karya.map((k, i) => (
        <div key={i} className="u-ak-karya">
          <Input aria-label="Nama karya" placeholder="mis. Artikel jurnal internasional bereputasi" value={k.nama} onChange={(e) => karya(i, { nama: e.target.value })} />
          <Input aria-label="Jumlah" inputMode="numeric" value={String(k.jumlah)} onChange={(e) => karya(i, { jumlah: Number(e.target.value.replace(/\D/g, '') || 0) })} />
          <Select
            aria-label="Jenis luaran LPPM yang dihitung otomatis"
            options={jenisLuaran.map((x) => ({ value: x.kode, label: x.nama }))}
            value={k.jenis_luaran[0] ?? ''}
            onValueChange={(v) => karya(i, { jenis_luaran: v ? Array.from(new Set([v, ...k.jenis_luaran.slice(1)])) : k.jenis_luaran.slice(1) })}
            placeholder="Jenis luaran LPPM…"
          />
          <label className="u-ak-centang">
            <Checkbox checked={k.penulis_utama} onCheckedChange={(v) => karya(i, { penulis_utama: v === true })} /> Penulis utama
          </label>
          <Button size="sm" variant="ghost" aria-label="Hapus karya" onClick={() => onChange({ karya: j.karya.filter((_, n) => n !== i) })}>
            <X />
          </Button>
          {k.jenis_luaran.length > 1 ? <small className="u-bkd-keterangan">Dihitung juga: {k.jenis_luaran.slice(1).join(', ')}</small> : null}
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={() => onChange({ karya: [...j.karya, { kode: `karya_${j.karya.length + 1}`, nama: '', jumlah: 1, jenis_luaran: [], penulis_utama: true }] })}>
        <Plus /> Tambah karya wajib
      </Button>
      <DaftarDokumenIsian dokumen={j.dokumen} onChange={(dokumen) => onChange({ dokumen })} />
      <div className="u-bkd-grid-3 u-ak-sumber">
        <Field label="Sumber/dasar hukum">
          <Input value={j.sumber} onChange={(e) => onChange({ sumber: e.target.value })} />
        </Field>
        <Field label="Catatan untuk SDM">
          <Input value={j.catatan ?? ''} onChange={(e) => onChange({ catatan: e.target.value || null })} />
        </Field>
      </div>
    </fieldset>
  );
}

function PanelUbahAturanKarier({ aturan: a, onOpenChange }: { aturan: AturanKarierDetail; onOpenChange: (o: boolean) => void }) {
  const aksi = useAksiKarier();
  const [step, setStep] = React.useState(0);
  const [isi, setIsi] = React.useState<IsiAturanKarier>(() => structuredClone(a.isi) as IsiAturanKarier);
  const [id, setId] = React.useState({ nama: a.nama, dasar_hukum: a.dasar_hukum ?? '', berlaku_tanggal: a.berlaku_tanggal ?? '', catatan_perubahan: a.catatan_perubahan ?? '', sk_id: a.sk?.id ?? (null as string | null) });
  const ubahJenjang = (i: number, x: Partial<JenjangKarier>) => setIsi({ ...isi, jenjang: isi.jenjang.map((j, n) => (n === i ? { ...j, ...x } : j)) });
  return (
    <PanelLangkah
      open
      onOpenChange={onOpenChange}
      title={`Ubah ${a.nama} v${a.versi}`}
      description="Perubahan hanya pada draf. Lihat pratinjau dampak sebelum menerbitkan."
      mode="ubah"
      size="xl"
      step={step}
      onStepChange={setStep}
      finishLabel="Simpan draf"
      steps={[
        {
          id: 'dasar',
          title: 'Dasar hukum',
          description: 'Peraturan yang menjadi dasar versi ini dan tanggal mulai berlakunya.',
          validate: () => (id.nama.trim() ? null : 'Isi nama aturan.'),
          content: (
            <div className="u-bkd-form">
              <Field label="Nama aturan" required description="Mis. Ketentuan jabatan fungsional dosen 2026">
                <Input value={id.nama} onChange={(e) => setId({ ...id, nama: e.target.value })} />
              </Field>
              <Field label="Dasar hukum" description="Peraturan menteri/pedoman PAK: nomor, tanggal, penerbit.">
                <Textarea rows={4} value={id.dasar_hukum} onChange={(e) => setId({ ...id, dasar_hukum: e.target.value })} />
              </Field>
              <PilihSK value={id.sk_id} onValueChange={(v: string | null) => setId({ ...id, sk_id: v })} jenis="aturan" label="SK/pedoman yang dirujuk" description="Dari registri SK; berkas tidak perlu diunggah ulang." />
              <Field label="Berlaku mulai tanggal" optional description="Usulan yang diajukan sejak tanggal ini memakai versi ini. Kosong = sejak diterbitkan.">
                <IsianTanggal value={id.berlaku_tanggal} onValueChange={(v) => setId({ ...id, berlaku_tanggal: v ?? '' })} />
              </Field>
              <Field label="Alasan perubahan" required description="Wajib (minimal 10 karakter) sebelum versi diterbitkan; tampil di riwayat dan pemeriksaan pedoman.">
                <Textarea rows={2} value={id.catatan_perubahan} onChange={(e) => setId({ ...id, catatan_perubahan: e.target.value })} />
              </Field>
            </div>
          ),
        },
        {
          id: 'jenjang',
          title: 'Jabatan fungsional',
          description: 'Syarat tiap jenjang tujuan. Nilai kosong berarti tidak diperiksa otomatis (diperiksa verifikator).',
          validate: () => {
            const salah = isi.jenjang.find((j) => [j.unsur.penelitian_min_persen, j.unsur.pendidikan_min_persen, j.unsur.penunjang_maks_persen, j.unsur.pengabdian_maks_persen].some((x) => x != null && (x < 0 || x > 100)));
            if (salah) return `Jenjang ${salah.nama}: persen unsur harus 0-100.`;
            const tanpaNama = isi.jenjang.find((j) => j.karya.some((k) => !k.nama.trim()) || j.dokumen.some((d) => !d.nama.trim()));
            return tanpaNama ? `Jenjang ${tanpaNama.nama}: isi nama karya/dokumen atau hapus barisnya.` : null;
          },
          content: (
            <div className="u-bkd-form">
              {isi.jenjang.map((j, i) => (
                <IsianJenjang key={j.kode} j={j} onChange={(x) => ubahJenjang(i, x)} jenisLuaran={a.jenis_luaran} />
              ))}
            </div>
          ),
        },
        {
          id: 'pangkat',
          title: 'Pangkat & sertifikasi',
          validate: () => (isi.pangkat.dokumen.some((d) => !d.nama.trim()) || isi.serdos.dokumen.some((d) => !d.nama.trim()) ? 'Isi nama dokumen atau hapus barisnya.' : null),
          content: (
            <div className="u-bkd-form">
              <fieldset className="u-ak-isian">
                <legend>Kenaikan pangkat/golongan</legend>
                <div className="u-bkd-grid-3">
                  <Field label="Masa dalam pangkat (tahun)">
                    <Input inputMode="decimal" value={t(isi.pangkat.masa_min_tahun)} onChange={(e) => setIsi({ ...isi, pangkat: { ...isi.pangkat, masa_min_tahun: angkaAtauNull(e.target.value) } })} />
                  </Field>
                  <Field label="Kinerja terakhir minimal">
                    <Select options={[{ value: '', label: 'Tidak disyaratkan' }, { value: 'baik', label: 'Baik' }, { value: 'sangat_baik', label: 'Sangat baik' }]} value={isi.pangkat.kinerja_min ?? ''} onValueChange={(v) => setIsi({ ...isi, pangkat: { ...isi.pangkat, kinerja_min: (v || null) as IsiAturanKarier['pangkat']['kinerja_min'] } })} placeholder="Pilih…" />
                  </Field>
                  <Field label="Sumber">
                    <Input value={isi.pangkat.sumber} onChange={(e) => setIsi({ ...isi, pangkat: { ...isi.pangkat, sumber: e.target.value } })} />
                  </Field>
                </div>
                <div className="u-ak-isian-kepala">
                  <label className="u-ak-centang">
                    <Checkbox checked={isi.pangkat.bebas_disiplin} onCheckedChange={(v) => setIsi({ ...isi, pangkat: { ...isi.pangkat, bebas_disiplin: v === true } })} /> Tidak sedang menjalani hukuman disiplin
                  </label>
                  <label className="u-ak-centang">
                    <Checkbox checked={isi.pangkat.perlu_dicek} onCheckedChange={(v) => setIsi({ ...isi, pangkat: { ...isi.pangkat, perlu_dicek: v === true } })} /> Tandai perlu dicek SDM
                  </label>
                </div>
                <p className="u-bkd-label">Angka kredit minimal per golongan (dosen)</p>
                <div className="u-ak-golongan">
                  {isi.pangkat.golongan.map((g, i) => (
                    <Field key={g.kode} label={g.kode}>
                      <Input inputMode="decimal" placeholder="-" value={t(g.ak_min)} onChange={(e) => setIsi({ ...isi, pangkat: { ...isi.pangkat, golongan: isi.pangkat.golongan.map((x, n) => (n === i ? { ...x, ak_min: angkaAtauNull(e.target.value) } : x)) } })} />
                    </Field>
                  ))}
                </div>
                <DaftarDokumenIsian dokumen={isi.pangkat.dokumen} onChange={(dokumen) => setIsi({ ...isi, pangkat: { ...isi.pangkat, dokumen } })} />
              </fieldset>
              <fieldset className="u-ak-isian">
                <legend>Sertifikasi dosen</legend>
                <div className="u-bkd-grid-3">
                  <Field label="Pengalaman pendidik minimal (tahun)">
                    <Input inputMode="decimal" value={t(isi.serdos.pengalaman_min_tahun)} onChange={(e) => setIsi({ ...isi, serdos: { ...isi.serdos, pengalaman_min_tahun: angkaAtauNull(e.target.value) } })} />
                  </Field>
                  <Field label="Jabatan fungsional minimal">
                    <Select options={a.jabatan_akademik.filter((x) => x.kode !== 'TP').map((x) => ({ value: x.kode, label: x.nama }))} value={isi.serdos.jabatan_min ?? ''} onValueChange={(v) => setIsi({ ...isi, serdos: { ...isi.serdos, jabatan_min: v || null } })} placeholder="Pilih…" />
                  </Field>
                  <Field label="Sumber">
                    <Input value={isi.serdos.sumber} onChange={(e) => setIsi({ ...isi, serdos: { ...isi.serdos, sumber: e.target.value } })} />
                  </Field>
                </div>
                <DaftarDokumenIsian dokumen={isi.serdos.dokumen} onChange={(dokumen) => setIsi({ ...isi, serdos: { ...isi.serdos, dokumen } })} />
              </fieldset>
              <fieldset className="u-ak-isian">
                <legend>Ketentuan umum</legend>
                <div className="u-ak-isian-kepala">
                  <label className="u-ak-centang">
                    <Checkbox checked={isi.umum.dosen_tetap} onCheckedChange={(v) => setIsi({ ...isi, umum: { ...isi.umum, dosen_tetap: v === true } })} /> Kenaikan hanya untuk dosen tetap
                  </label>
                  <label className="u-ak-centang">
                    <Checkbox checked={isi.umum.loncat_boleh} onCheckedChange={(v) => setIsi({ ...isi, umum: { ...isi.umum, loncat_boleh: v === true } })} /> Loncat satu jenjang diizinkan
                  </label>
                  <label className="u-ak-centang">
                    <Checkbox checked={isi.umum.indikator_manual} onCheckedChange={(v) => setIsi({ ...isi, umum: { ...isi.umum, indikator_manual: v === true } })} /> Tampilkan indikator kinerja (diperiksa manual)
                  </label>
                </div>
                <Field label="Syarat loncat jenjang">
                  <Textarea rows={2} value={isi.umum.loncat_syarat} onChange={(e) => setIsi({ ...isi, umum: { ...isi.umum, loncat_syarat: e.target.value } })} />
                </Field>
              </fieldset>
            </div>
          ),
        },
        {
          id: 'tinjau',
          title: 'Tinjau',
          content: (
            <WizardReview
              sections={[
                { title: 'Dasar hukum', onEdit: () => setStep(0), items: [{ label: 'Nama', value: id.nama }, { label: 'Dasar hukum', value: id.dasar_hukum }, { label: 'Berlaku mulai', value: id.berlaku_tanggal ? tgl(id.berlaku_tanggal) : 'Sejak diterbitkan' }] },
                { title: 'Jabatan fungsional', onEdit: () => setStep(1), missing: isi.jenjang.some((j) => j.aktif && j.ak_min == null) ? 'Ada jenjang tanpa angka kredit minimal (dinilai manual oleh Tim PAK).' : undefined, items: isi.jenjang.filter((j) => j.aktif).map((j) => ({ label: j.nama, value: ringkasJenjang(j).join(', ') })) },
                { title: 'Pangkat & sertifikasi', onEdit: () => setStep(2), items: [{ label: 'Masa pangkat', value: isi.pangkat.masa_min_tahun != null ? `${angka(isi.pangkat.masa_min_tahun)} tahun` : null }, { label: 'Serdos', value: isi.serdos.pengalaman_min_tahun != null ? `pengalaman ${angka(isi.serdos.pengalaman_min_tahun)} tahun` : null }] },
              ]}
            />
          ),
        },
      ]}
      onFinish={async () => {
        try {
          await aksi('PUT', `${BASIS}/${a.id}`, { ...id, berlaku_tanggal: id.berlaku_tanggal || null, isi }, 'Draf aturan karier tersimpan.');
          return null;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

// ------------------------------------------------------------------ pratinjau dampak
function PanelPratinjauAturanKarier({ aturan: a, onOpenChange, onTerbit }: { aturan: AturanKarierDetail; onOpenChange: (o: boolean) => void; onTerbit: () => void }) {
  const pr = useSiakadQuery<PratinjauKarier>(['karier-aturan', 'pratinjau', a.id], q(`${BASIS}/${a.id}/pratinjau`), { staleTime: 0 });
  const [hanyaBerubah, setHanyaBerubah] = React.useState(true);
  const d = pr.data;
  const sama = d?.aturan_sekarang?.id === a.id;
  return (
    <Sheet
      open
      onOpenChange={onOpenChange}
      title={`Pratinjau dampak ${a.nama} v${a.versi}`}
      description="Syarat kenaikan jabatan fungsional berikutnya untuk setiap dosen aktif, dengan aturan yang berlaku sekarang dibanding versi ini. Tidak menyimpan apa pun."
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          {a.status === 'draf' ? (
            <Button disabled={!d} onClick={onTerbit}>
              <FileCheck2 /> Terbitkan versi ini
            </Button>
          ) : null}
        </>
      }
    >
      <div className="u-bkd-form">
        {sama ? <Alert variant="neutral">Versi ini yang berlaku sekarang; tidak ada perbedaan.</Alert> : null}
        {pr.loading ? <Skeleton style={{ height: 160 }} /> : null}
        {pr.error ? <Alert variant="danger">{pesanGalat(pr.error)}</Alert> : null}
        {d ? (
          <>
            <StatGrid>
              <StatCard label="Dosen dihitung" value={d.ringkasan.jumlah} />
              <StatCard label="Memenuhi sekarang" value={d.ringkasan.memenuhi_sekarang} />
              <StatCard label="Memenuhi dengan versi ini" value={d.ringkasan.memenuhi_sesudah} tone="success" />
              <StatCard label="Jadi tidak memenuhi" value={d.ringkasan.jadi_tidak_memenuhi} tone={d.ringkasan.jadi_tidak_memenuhi ? 'danger' : undefined} />
            </StatGrid>
            {d.aturan_sekarang && !sama ? (
              <Card>
                <CardHeader title={`Perubahan dari ${d.aturan_sekarang.nama} v${d.aturan_sekarang.versi} (berlaku sekarang)`} />
                <CardContent>
                  <DaftarPerubahanAturan perubahan={d.perubahan} />
                </CardContent>
              </Card>
            ) : null}
            <DataTable
              rows={d.laporan.filter((x) => !hanyaBerubah || x.berubah)}
              rowKey={(x) => String(x.pegawai_id)}
              columnToggle={false}
              densityToggle={false}
              toolbar={
                <label className="u-ak-centang">
                  <Checkbox checked={hanyaBerubah} onCheckedChange={(v) => setHanyaBerubah(v === true)} /> Hanya yang berubah
                </label>
              }
              columns={[
                { key: 'nama', header: 'Dosen', mobile: 'title', cell: (x) => <span className="u-ak-sel"><strong>{x.nama}</strong><small>{[x.nidn, x.kode_prodi].filter(Boolean).join(' · ')}</small></span> },
                { key: 'sasaran', header: 'Jenjang berikutnya', shrink: true, cell: (x) => x.sasaran ?? '-' },
                { key: 'sekarang', header: 'Sekarang', shrink: true, cell: (x) => <Kesimpulan nilai={x.sekarang} /> },
                { key: 'sesudah', header: 'Dengan versi ini', shrink: true, mobile: 'badge', cell: (x) => <Kesimpulan nilai={x.sesudah} /> },
                { key: 'alasan', header: 'Syarat belum terpenuhi', cell: (x) => x.alasan.join('; ') || '-' },
              ]}
              empty={{ title: hanyaBerubah ? 'Tidak ada dosen yang hasilnya berubah' : 'Belum ada dosen aktif' }}
            />
          </>
        ) : null}
      </div>
    </Sheet>
  );
}
