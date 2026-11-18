'use client';
import * as React from 'react';
import { Archive, Copy, Eye, FileCheck2, GitCompare, Pencil, Plus, Scale, Trash2 } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Card, CardContent, CardHeader, DescriptionList, Empty, Tabs } from '../components/display';
import { StatCard, StatGrid } from '../components/charts';
import { DataTable, type DataColumn } from '../components/data-table';
import { Checkbox, Field, Input, SegmentedControl, Textarea } from '../components/forms';
import { Select } from '../components/select';
import { ConfirmDialog, Sheet, useToast } from '../components/overlays';
import { WizardReview } from '../components/wizard';
import { PanelLangkah } from '../components/panel-langkah';
import { pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { PilihTahunAkademik } from './cari';
import { PilihSK } from './isian-sk';
import { KesimpulanBkd, sksBkd } from './bkd';
import { useAksiBkd, usePeriodeBkd, type KategoriBkd, type RumusBkd } from './bkd-alur';
import { DaftarPerubahanAturan, DaftarVersiAturan, PanelBandingAturan, type PerubahanAturan } from './aturan-versi';

const BASIS = '/v1/sdm/bkd/aturan';

/*
 * Aturan BKD berversi (SIAKAD /v1/sdm/bkd/aturan, docs/BKD.md): semua persyaratan BKD diatur Biro SDM, bukan kode.
 * Aturan baru dari kementerian = salin versi terbit -> ubah (wizard per bagian) -> pratinjau dampak ke periode berjalan
 * -> terbitkan -> terapkan ke periode. Versi terbit dikunci; periode mengunci versi yang dipakainya.
 */

interface IsiAturanBkd {
  bidang: { kode: string; nama: string; min: number | null; maks: number | null; aktif: boolean }[];
  kategori: KategoriBkd[];
  batas: { min_total: number | null; maks_total: number | null; maks_mode: 'peringatan' | 'wajib'; sumber: string };
  kombinasi: { kode: string; nama: string; bidang: string[]; min: number | null; berlaku: 'semua' | 'tugas_tambahan' | 'tanpa_tugas_tambahan'; aktif: boolean; sumber: string }[];
  kewajiban_khusus: { kode: string; nama: string; jabatan: string[]; kategori: string[]; minimal: number; mode: 'peringatan' | 'wajib'; aktif: boolean; keterangan: string; sumber: string }[];
  pembebasan: { kode: string; nama: string; status_aktif: string[]; aktif: boolean; keterangan: string }[];
  tugas_tambahan: { ekuivalen: Record<string, number> };
  asesor: { jumlah: 1 | 2; gabung: 'keduanya' | 'salah_satu' | 'asesor1'; larang_diri: boolean; larang_satu_prodi: boolean; wajib_terdaftar: boolean };
  tahap: { kaprodi: boolean; dekan: boolean };
  tenggat: Record<'rencana_hari' | 'kirim_hari' | 'penilaian_hari' | 'penetapan_hari', number | null>;
}

type Perubahan = PerubahanAturan;

interface AturanBkdRow {
  id: number;
  nama: string;
  versi: number;
  induk_id: number | null;
  status: 'draf' | 'terbit' | 'arsip';
  dasar_hukum: string | null;
  berlaku_mulai: string | null;
  berlaku_mulai_nama?: string | null;
  catatan_perubahan: string | null;
  diterbitkan_at: string | null;
  jumlah_periode?: number;
  sk?: { id: string; nomor: string; tanggal?: string | null; perihal?: string | null } | null;
}
interface AturanBkdDetail extends AturanBkdRow {
  isi: IsiAturanBkd;
  periode: { id: number; nama: string; status: string }[];
  riwayat: { waktu: string; username: string; aksi: string; ringkasan: string | null }[];
  jabatan_akademik: { kode: string; nama: string }[];
  jabatan_tugas_tambahan: { kode: string; nama: string; setara_sks: number | null }[];
  induk?: { id: number; nama: string; versi: number };
  perubahan?: Perubahan[];
}

const STATUS: Record<AturanBkdRow['status'], [string, React.ComponentProps<typeof Badge>['variant']]> = {
  draf: ['Draf', 'warning'],
  terbit: ['Terbit', 'success'],
  arsip: ['Arsip', 'neutral'],
};
const RUMUS: Record<RumusBkd['jenis'], string> = { manual: 'Diisi dosen', per_sks: 'SKS kelas x faktor', per_volume: 'Jumlah x SKS per satuan', tetap: 'Nilai tetap', jabatan: 'Ekuivalen jabatan' };
const STATUS_PEGAWAI = ['aktif', 'cuti', 'tugas_belajar', 'izin_belajar', 'diperbantukan'];
const tgl = (s?: string | null) => (s ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s.replace(' ', 'T'))) : '-');
const angkaAtauNull = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')));
const q = <T,>(path: string) => (s: ReturnType<typeof useSiakad>, signal: AbortSignal) => s.request<T>({ method: 'GET', path }, { signal });

/** Alias lama: DaftarPerubahanAturan. */
export const DaftarPerubahanBkd = DaftarPerubahanAturan;

/** Halaman Aturan BKD: daftar versi, rincian per bagian, editor wizard, salin, terbitkan, banding, pratinjau dampak, terapkan. */
export function KelolaAturanBkd({ className }: { className?: string }) {
  const daftar = useSiakadQuery<AturanBkdRow[]>(['bkd', 'aturan'], q('/v1/sdm/bkd/aturan'));
  const [pilih, setPilih] = React.useState<number | null>(null);
  const id = pilih ?? daftar.data?.find((a) => a.status === 'draf')?.id ?? daftar.data?.find((a) => a.status === 'terbit')?.id ?? daftar.data?.[0]?.id ?? null;
  if (daftar.loading && !daftar.data) return <Skeleton style={{ height: 360 }} />;
  if (daftar.error) return <Alert variant="danger" title="Aturan BKD belum bisa dimuat">{pesanGalat(daftar.error)}</Alert>;
  return (
    <div className={cn('u-bkd-aturan', className)}>
      <DaftarVersiAturan versi={daftar.data ?? []} value={id} onValueChange={setPilih} label="Versi aturan BKD" />
      {id ? <RincianAturanBkd id={id} onPilih={setPilih} /> : <Empty bordered icon={<Scale />} title="Belum ada aturan BKD" />}
    </div>
  );
}

function RincianAturanBkd({ id, onPilih }: { id: number; onPilih: (id: number | null) => void }) {
  const d = useSiakadQuery<AturanBkdDetail>(['bkd', 'aturan', id], q(`/v1/sdm/bkd/aturan/${id}`));
  const aksi = useAksiBkd();
  const [panel, setPanel] = React.useState<'ubah' | 'pratinjau' | 'banding' | 'hapus' | null>(null);
  if (d.loading && !d.data) return <Skeleton style={{ height: 360 }} />;
  if (!d.data) return <Alert variant="danger">{pesanGalat(d.error)}</Alert>;
  const a = d.data;
  const isi = a.isi;
  const kolomKategori: DataColumn<KategoriBkd>[] = [
    { key: 'nama', header: 'Kategori', mobile: 'title', cell: (k) => <span className="u-bkd-sel"><strong>{k.nama}</strong><small>{isi.bidang.find((b) => b.kode === k.bidang)?.nama}</small></span> },
    { key: 'rumus', header: 'Ekuivalen SKS', cell: (k) => `${RUMUS[k.rumus.jenis]}${k.rumus.faktor != null ? ` · faktor ${k.rumus.faktor}` : ''}${k.rumus.nilai != null ? ` · ${sksBkd(k.rumus.nilai)}` : ''}${k.rumus.maks != null ? ` · maks ${sksBkd(k.rumus.maks)}` : ''}` },
    { key: 'sumber', header: 'Sumber data', shrink: true, cell: (k) => (k.sumber === 'manual' ? 'Diisi dosen' : k.sumber) },
    { key: 'bukti', header: 'Bukti', cell: (k) => (k.bukti.wajib ? (k.bukti.otomatis ? 'Otomatis dari sumber' : k.bukti.jenis.join(', ') || 'Wajib') : 'Tidak wajib') },
    { key: 'aktif', header: 'Status', shrink: true, mobile: 'badge', cell: (k) => <Badge variant={k.aktif ? 'success' : 'neutral'}>{k.aktif ? 'Aktif' : 'Nonaktif'}</Badge> },
  ];
  return (
    <section className="u-bkd-aturan-rincian">
      <Card>
        <CardContent>
          <div className="u-bkd-kepala">
            <div>
              <p className="u-bkd-label">Versi {a.versi}{a.induk ? ` · disalin dari ${a.induk.nama} v${a.induk.versi}` : ''}</p>
              <h3 className="u-bkd-judul">{a.nama}</h3>
              <p className="u-bkd-keterangan" style={{ whiteSpace: 'pre-line' }}>{a.dasar_hukum ?? 'Dasar hukum belum diisi.'}</p>
            </div>
            <Badge variant={STATUS[a.status][1]} dot>
              {STATUS[a.status][0]}
              {a.diterbitkan_at ? ` ${tgl(a.diterbitkan_at)}` : ''}
            </Badge>
          </div>
          <DescriptionList
            items={[
              { label: 'SK penetapan', value: a.sk ? `${a.sk.nomor}${a.sk.tanggal ? `, ${tgl(a.sk.tanggal)}` : ''}` : <span className="u-bkd-keterangan">Belum dilampirkan</span> },
              { label: 'Berlaku mulai', value: a.berlaku_mulai_nama ?? a.berlaku_mulai ?? 'Bawaan periode baru' },
              { label: 'Dipakai periode', value: a.periode.length ? a.periode.map((p) => p.nama).join(', ') : 'Belum ada' },
            ]}
          />
          <div className="u-bkd-aksi">
            {a.status === 'draf' ? (
              <Button onClick={() => setPanel('ubah')}>
                <Pencil /> Ubah draf
              </Button>
            ) : null}
            <Button variant="outline" onClick={async () => { const r = await aksi<AturanBkdDetail>('POST', `/v1/sdm/bkd/aturan/${a.id}/salin`, {}, 'Versi baru dibuat sebagai draf.'); onPilih(r.id); }}>
              <Copy /> Salin jadi versi baru
            </Button>
            <Button variant="outline" onClick={() => setPanel('pratinjau')}>
              <Eye /> Pratinjau dampak
            </Button>
            <Button variant="ghost" onClick={() => setPanel('banding')}>
              <GitCompare /> Banding
            </Button>
            {a.status === 'draf' ? (
              <Button variant="outline" onClick={() => void aksi('POST', `/v1/sdm/bkd/aturan/${a.id}/terbitkan`, {}, 'Versi diterbitkan dan dikunci.')}>
                <FileCheck2 /> Terbitkan
              </Button>
            ) : null}
            {a.status === 'terbit' ? (
              <Button variant="ghost" onClick={() => void aksi('POST', `/v1/sdm/bkd/aturan/${a.id}/arsipkan`, {}, 'Versi diarsipkan.')}>
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
            value: 'ringkasan',
            label: 'Ringkasan',
            content: (
              <Card>
                <CardContent>
                  <DescriptionList
                    items={[
                      { label: 'Beban minimal', value: isi.batas.min_total != null ? sksBkd(isi.batas.min_total) : 'Tidak diatur' },
                      { label: 'Beban maksimal', value: isi.batas.maks_total != null ? `${sksBkd(isi.batas.maks_total)} (${isi.batas.maks_mode === 'wajib' ? 'tidak boleh dilampaui' : 'peringatan'})` : 'Tidak diatur' },
                      { label: 'Sumber batas', value: isi.batas.sumber || '-' },
                      { label: 'Bidang aktif', value: isi.bidang.filter((b) => b.aktif).map((b) => `${b.nama}${b.min != null ? ` (min ${b.min})` : ''}${b.maks != null ? ` (maks ${b.maks})` : ''}`).join(', ') },
                      { label: 'Asesor', value: `${isi.asesor.jumlah} asesor; ${isi.asesor.gabung === 'keduanya' ? 'kegiatan diakui bila semua asesor M' : isi.asesor.gabung === 'salah_satu' ? 'diakui bila salah satu M' : 'mengikuti asesor 1'}${isi.asesor.larang_satu_prodi ? '; tidak boleh satu prodi' : ''}${isi.asesor.wajib_terdaftar ? '; wajib terdaftar' : ''}` },
                      { label: 'Mengetahui', value: [isi.tahap.kaprodi ? 'Kaprodi' : null, isi.tahap.dekan ? 'Dekan' : null].filter(Boolean).join(' lalu ') || 'Langsung ke Biro SDM' },
                      { label: 'Tenggat bawaan', value: Object.values(isi.tenggat).some((x) => x) ? `rencana ${isi.tenggat.rencana_hari ?? '-'} hari, kirim ${isi.tenggat.kirim_hari ?? '-'} hari, penilaian ${isi.tenggat.penilaian_hari ?? '-'} hari, penetapan ${isi.tenggat.penetapan_hari ?? '-'} hari` : 'Tidak diatur (diisi di periode)' },
                    ]}
                  />
                </CardContent>
              </Card>
            ),
          },
          { value: 'kategori', label: 'Kategori kegiatan', count: isi.kategori.length, content: <DataTable rows={isi.kategori} columns={kolomKategori} rowKey={(k) => k.kode} columnToggle={false} densityToggle={false} /> },
          {
            value: 'syarat',
            label: 'Syarat khusus',
            content: (
              <div className="u-bkd-form">
                <Card>
                  <CardHeader title="Kombinasi bidang wajib" />
                  <CardContent>
                    {isi.kombinasi.length ? (
                      <ul className="u-bkd-daftar">
                        {isi.kombinasi.map((c) => (
                          <li key={c.kode}>
                            <strong>{c.nama}</strong> {c.min != null ? `paling sedikit ${sksBkd(c.min)}` : '(angka belum diisi)'} · {c.berlaku === 'semua' ? 'semua dosen' : c.berlaku === 'tugas_tambahan' ? 'dosen bertugas tambahan' : 'dosen tanpa tugas tambahan'} <Badge variant={c.aktif ? 'success' : 'neutral'}>{c.aktif ? 'Aktif' : 'Nonaktif'}</Badge>
                            {c.sumber ? <small>{c.sumber}</small> : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="u-bkd-keterangan">Tidak ada.</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader title="Kewajiban khusus per jabatan akademik" />
                  <CardContent>
                    <ul className="u-bkd-daftar">
                      {isi.kewajiban_khusus.map((c) => (
                        <li key={c.kode}>
                          <strong>{c.nama}</strong> · {c.jabatan.map((j) => a.jabatan_akademik.find((x) => x.kode === j)?.nama ?? j).join(', ')} · minimal {c.minimal} kegiatan {c.kategori.map((k) => isi.kategori.find((x) => x.kode === k)?.nama ?? k).join(' / ')} · {c.mode === 'wajib' ? 'menentukan kesimpulan' : 'peringatan'} <Badge variant={c.aktif ? 'success' : 'neutral'}>{c.aktif ? 'Aktif' : 'Nonaktif'}</Badge>
                          <small>{c.keterangan}{c.sumber ? ` · ${c.sumber}` : ''}</small>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader title="Pembebasan" />
                  <CardContent>
                    <ul className="u-bkd-daftar">
                      {isi.pembebasan.map((c) => (
                        <li key={c.kode}>
                          <strong>{c.nama}</strong> · status {c.status_aktif.join(', ')} <Badge variant={c.aktif ? 'success' : 'neutral'}>{c.aktif ? 'Aktif' : 'Nonaktif'}</Badge>
                          <small>{c.keterangan}</small>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            ),
          },
          {
            value: 'tugas',
            label: 'Tugas tambahan',
            content: (
              <DataTable
                rows={a.jabatan_tugas_tambahan}
                rowKey={(j) => j.kode}
                columnToggle={false}
                densityToggle={false}
                columns={[
                  { key: 'nama', header: 'Jabatan', mobile: 'title' },
                  { key: 'kode', header: 'Kode', shrink: true },
                  { key: 'ekv', header: 'Ekuivalen di aturan ini', align: 'end', cell: (j) => (isi.tugas_tambahan.ekuivalen[j.kode] != null ? sksBkd(isi.tugas_tambahan.ekuivalen[j.kode]) : '-') },
                  { key: 'setara_sks', header: 'Data master SDM', align: 'end', cell: (j) => (j.setara_sks != null ? sksBkd(j.setara_sks) : 'belum diisi') },
                ]}
                empty={{ title: 'Belum ada jabatan tugas tambahan di data master SDM' }}
              />
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
                empty={{ title: 'Belum ada riwayat' }}
              />
            ),
          },
        ]}
      />
      {panel === 'ubah' ? <PanelUbahAturanBkd aturan={a} onOpenChange={(o) => !o && setPanel(null)} /> : null}
      {panel === 'pratinjau' ? <PanelPratinjauAturanBkd aturan={a} onOpenChange={(o) => !o && setPanel(null)} /> : null}
      {panel === 'banding' ? <PanelBandingAturan basis={BASIS} aturan={a} onOpenChange={(o) => !o && setPanel(null)} /> : null}
      <ConfirmDialog
        open={panel === 'hapus'}
        onOpenChange={(o) => !o && setPanel(null)}
        title="Hapus draf ini?"
        description={`${a.nama} versi ${a.versi}. Versi terbit tidak terpengaruh.`}
        confirmLabel="Hapus draf"
        onConfirm={async () => {
          await aksi('POST', `/v1/sdm/bkd/aturan/${a.id}/hapus`, {}, 'Draf dihapus.');
          setPanel(null);
          onPilih(null);
        }}
      />
    </section>
  );
}

/** Editor draf aturan BKD: wizard per bagian (mode ubah: lompat bebas, simpan dari langkah mana pun). */
function PanelUbahAturanBkd({ aturan: a, onOpenChange }: { aturan: AturanBkdDetail; onOpenChange: (o: boolean) => void }) {
  const aksi = useAksiBkd();
  const [step, setStep] = React.useState(0);
  const [isi, setIsi] = React.useState<IsiAturanBkd>(() => JSON.parse(JSON.stringify(a.isi)) as IsiAturanBkd);
  const [id, setId] = React.useState({ nama: a.nama, dasar_hukum: a.dasar_hukum ?? '', berlaku_mulai: a.berlaku_mulai, catatan_perubahan: a.catatan_perubahan ?? '', sk_id: a.sk?.id ?? null as string | null });
  const ubahBidang = (i: number, x: Partial<IsiAturanBkd['bidang'][number]>) => setIsi({ ...isi, bidang: isi.bidang.map((b, j) => (j === i ? { ...b, ...x } : b)) });
  const ubahKat = (i: number, x: Partial<KategoriBkd>) => setIsi({ ...isi, kategori: isi.kategori.map((b, j) => (j === i ? { ...b, ...x } : b)) });
  const ubahRumus = (i: number, x: Partial<RumusBkd>) => ubahKat(i, { rumus: { ...isi.kategori[i]!.rumus, ...x } });
  const opsiBidang = isi.bidang.map((b) => ({ value: b.kode, label: b.nama }));
  const t = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));
  return (
    <PanelLangkah
      open
      onOpenChange={onOpenChange}
      title={`Ubah ${a.nama} v${a.versi}`}
      description="Perubahan hanya pada draf. Terbitkan setelah pratinjau dampak."
      mode="ubah"
      size="xl"
      step={step}
      onStepChange={setStep}
      finishLabel="Simpan draf"
      steps={[
        {
          id: 'identitas',
          title: 'Dasar hukum',
          validate: () => (id.nama.trim() ? null : 'Isi nama aturan.'),
          content: (
            <div className="u-bkd-form">
              <Field label="Nama aturan" required description="Mis. Pedoman Operasional BKD 2026">
                <Input value={id.nama} onChange={(e) => setId({ ...id, nama: e.target.value })} />
              </Field>
              <Field label="Dasar hukum" description="Peraturan/pedoman kementerian: nomor, tanggal, penerbit.">
                <Textarea rows={4} value={id.dasar_hukum} onChange={(e) => setId({ ...id, dasar_hukum: e.target.value })} />
              </Field>
              <PilihSK value={id.sk_id} onValueChange={(v: string | null) => setId({ ...id, sk_id: v })} jenis="aturan" label="SK Rektor penetapan aturan BKD kampus" description="Dirujuk dari registri SK; tidak perlu mengunggah ulang." />
              <Field label="Berlaku mulai semester" optional description="Bawaan untuk periode baru mulai semester ini.">
                <PilihTahunAkademik value={id.berlaku_mulai} onValueChange={(v) => setId({ ...id, berlaku_mulai: v })} />
              </Field>
              <Field label="Catatan perubahan" optional>
                <Textarea rows={2} value={id.catatan_perubahan} onChange={(e) => setId({ ...id, catatan_perubahan: e.target.value })} />
              </Field>
            </div>
          ),
        },
        {
          id: 'batas',
          title: 'Batas dan bidang',
          validate: () => (isi.batas.min_total != null && isi.batas.maks_total != null && isi.batas.maks_total < isi.batas.min_total ? 'Maksimal tidak boleh lebih kecil dari minimal.' : null),
          content: (
            <div className="u-bkd-form">
              <div className="u-bkd-grid-3">
                <Field label="Minimal total (SKS)">
                  <Input inputMode="decimal" value={t(isi.batas.min_total)} onChange={(e) => setIsi({ ...isi, batas: { ...isi.batas, min_total: angkaAtauNull(e.target.value) } })} />
                </Field>
                <Field label="Maksimal total (SKS)">
                  <Input inputMode="decimal" value={t(isi.batas.maks_total)} onChange={(e) => setIsi({ ...isi, batas: { ...isi.batas, maks_total: angkaAtauNull(e.target.value) } })} />
                </Field>
                <Field label="Bila melebihi maksimal">
                  <Select options={[{ value: 'peringatan', label: 'Peringatan saja' }, { value: 'wajib', label: 'Tidak bisa dikirim' }]} value={isi.batas.maks_mode} onValueChange={(v) => setIsi({ ...isi, batas: { ...isi.batas, maks_mode: (v ?? 'peringatan') as 'peringatan' | 'wajib' } })} />
                </Field>
              </div>
              <Field label="Sumber angka batas">
                <Input value={isi.batas.sumber} onChange={(e) => setIsi({ ...isi, batas: { ...isi.batas, sumber: e.target.value } })} />
              </Field>
              <p className="u-bkd-label">Bidang</p>
              <div className="u-bkd-tabel-isian">
                {isi.bidang.map((b, i) => (
                  <div key={b.kode} className="u-bkd-baris-isian">
                    <Input aria-label="Nama bidang" value={b.nama} onChange={(e) => ubahBidang(i, { nama: e.target.value })} />
                    <Input aria-label="Minimal bidang" inputMode="decimal" placeholder="Min" value={t(b.min)} onChange={(e) => ubahBidang(i, { min: angkaAtauNull(e.target.value) })} />
                    <Input aria-label="Maksimal bidang" inputMode="decimal" placeholder="Maks" value={t(b.maks)} onChange={(e) => ubahBidang(i, { maks: angkaAtauNull(e.target.value) })} />
                    <label className="u-bkd-setuju">
                      <Checkbox checked={b.aktif} onCheckedChange={(v) => ubahBidang(i, { aktif: v === true })} /> Aktif
                    </label>
                  </div>
                ))}
              </div>
              <TambahKode label="Tambah bidang" contoh="mis. kewirausahaan" ada={isi.bidang.map((b) => b.kode)} onTambah={(kode) => setIsi({ ...isi, bidang: [...isi.bidang, { kode, nama: kode.replace(/_/g, ' '), min: null, maks: null, aktif: true }] })} />
            </div>
          ),
        },
        {
          id: 'kategori',
          title: 'Kategori kegiatan',
          description: 'Ekuivalen SKS tiap jenis kegiatan dan bukti yang diminta. Kosongkan faktor agar dosen mengisi SKS sendiri.',
          validate: () => {
            const k = isi.kategori.find((x) => !x.nama.trim() || !isi.bidang.some((b) => b.kode === x.bidang));
            if (k) return `Kategori ${k.kode}: isi nama dan bidang.`;
            const tt = isi.kategori.find((x) => x.rumus.jenis === 'tetap' && x.rumus.nilai == null);
            return tt ? `Kategori ${tt.nama}: rumus tetap butuh nilai SKS.` : null;
          },
          content: (
            <div className="u-bkd-kategori-isian">
              {isi.kategori.map((k, i) => (
                <fieldset key={k.kode} className="u-bkd-kartu-isian" data-aktif={k.aktif ? '' : undefined}>
                  <legend>{k.kode}</legend>
                  <div className="u-bkd-grid-3">
                    <Field label="Nama">
                      <Input value={k.nama} onChange={(e) => ubahKat(i, { nama: e.target.value })} />
                    </Field>
                    <Field label="Bidang">
                      <Select options={opsiBidang} value={k.bidang} onValueChange={(v) => ubahKat(i, { bidang: v ?? k.bidang })} />
                    </Field>
                    <Field label="Satuan">
                      <Input value={k.satuan} onChange={(e) => ubahKat(i, { satuan: e.target.value })} />
                    </Field>
                    <Field label="Rumus ekuivalen">
                      <Select options={Object.entries(RUMUS).map(([value, label]) => ({ value, label }))} value={k.rumus.jenis} onValueChange={(v) => ubahRumus(i, { jenis: (v ?? 'manual') as RumusBkd['jenis'] })} />
                    </Field>
                    {k.rumus.jenis === 'per_sks' || k.rumus.jenis === 'per_volume' ? (
                      <Field label={k.rumus.jenis === 'per_sks' ? 'Faktor' : 'SKS per satuan'}>
                        <Input inputMode="decimal" value={t(k.rumus.faktor)} onChange={(e) => ubahRumus(i, { faktor: angkaAtauNull(e.target.value) })} />
                      </Field>
                    ) : k.rumus.jenis === 'tetap' ? (
                      <Field label="Nilai SKS">
                        <Input inputMode="decimal" value={t(k.rumus.nilai)} onChange={(e) => ubahRumus(i, { nilai: angkaAtauNull(e.target.value) })} />
                      </Field>
                    ) : (
                      <span />
                    )}
                    <Field label="Maks per kegiatan" optional>
                      <Input inputMode="decimal" value={t(k.rumus.maks)} onChange={(e) => ubahRumus(i, { maks: angkaAtauNull(e.target.value) })} />
                    </Field>
                  </div>
                  <Field label="Bukti yang diminta (pisahkan dengan koma)">
                    <Input value={k.bukti.jenis.join(', ')} onChange={(e) => ubahKat(i, { bukti: { ...k.bukti, jenis: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) } })} />
                  </Field>
                  <div className="u-bkd-aksi">
                    <label className="u-bkd-setuju">
                      <Checkbox checked={k.bukti.wajib} onCheckedChange={(v) => ubahKat(i, { bukti: { ...k.bukti, wajib: v === true } })} /> Bukti wajib
                    </label>
                    <label className="u-bkd-setuju">
                      <Checkbox checked={k.bukti.otomatis} onCheckedChange={(v) => ubahKat(i, { bukti: { ...k.bukti, otomatis: v === true } })} /> Data SIAKAD dianggap bukti
                    </label>
                    <label className="u-bkd-setuju">
                      <Checkbox checked={k.aktif} onCheckedChange={(v) => ubahKat(i, { aktif: v === true })} /> Aktif
                    </label>
                  </div>
                </fieldset>
              ))}
              <TambahKode
                label="Tambah kategori"
                contoh="mis. hki"
                ada={isi.kategori.map((k) => k.kode)}
                onTambah={(kode) => setIsi({ ...isi, kategori: [...isi.kategori, { kode, bidang: isi.bidang[0]?.kode ?? 'pendidikan', nama: kode.replace(/_/g, ' '), satuan: 'kegiatan', rumus: { jenis: 'manual', faktor: null, nilai: null, maks: null }, sumber: 'manual', bukti: { wajib: true, otomatis: false, jenis: [] }, aktif: true, keterangan: '' }] })}
              />
            </div>
          ),
        },
        {
          id: 'syarat',
          title: 'Syarat khusus',
          description: 'Kombinasi bidang wajib, kewajiban khusus per jabatan akademik, dan pembebasan.',
          validate: () => (isi.kombinasi.some((c) => c.aktif && (c.min == null || !c.bidang.length)) ? 'Kombinasi aktif butuh bidang dan angka minimal.' : null),
          content: (
            <div className="u-bkd-form">
              <p className="u-bkd-label">Kombinasi bidang</p>
              {isi.kombinasi.map((c, i) => (
                <fieldset key={c.kode} className="u-bkd-kartu-isian">
                  <div className="u-bkd-grid-3">
                    <Field label="Nama">
                      <Input value={c.nama} onChange={(e) => setIsi({ ...isi, kombinasi: isi.kombinasi.map((x, j) => (j === i ? { ...x, nama: e.target.value } : x)) })} />
                    </Field>
                    <Field label="Minimal (SKS)">
                      <Input inputMode="decimal" value={t(c.min)} onChange={(e) => setIsi({ ...isi, kombinasi: isi.kombinasi.map((x, j) => (j === i ? { ...x, min: angkaAtauNull(e.target.value) } : x)) })} />
                    </Field>
                    <Field label="Berlaku untuk">
                      <Select options={[{ value: 'semua', label: 'Semua dosen' }, { value: 'tugas_tambahan', label: 'Dosen bertugas tambahan' }, { value: 'tanpa_tugas_tambahan', label: 'Tanpa tugas tambahan' }]} value={c.berlaku} onValueChange={(v) => setIsi({ ...isi, kombinasi: isi.kombinasi.map((x, j) => (j === i ? { ...x, berlaku: (v ?? 'semua') as typeof c.berlaku } : x)) })} />
                    </Field>
                  </div>
                  <div className="u-bkd-aksi">
                    {isi.bidang.map((b) => (
                      <label key={b.kode} className="u-bkd-setuju">
                        <Checkbox checked={c.bidang.includes(b.kode)} onCheckedChange={(v) => setIsi({ ...isi, kombinasi: isi.kombinasi.map((x, j) => (j === i ? { ...x, bidang: v === true ? [...x.bidang, b.kode] : x.bidang.filter((y) => y !== b.kode) } : x)) })} /> {b.nama}
                      </label>
                    ))}
                    <label className="u-bkd-setuju">
                      <Checkbox checked={c.aktif} onCheckedChange={(v) => setIsi({ ...isi, kombinasi: isi.kombinasi.map((x, j) => (j === i ? { ...x, aktif: v === true } : x)) })} /> Aktif
                    </label>
                  </div>
                </fieldset>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setIsi({ ...isi, kombinasi: [...isi.kombinasi, { kode: `kombinasi_${isi.kombinasi.length + 1}`, nama: '', bidang: [], min: null, berlaku: 'semua', aktif: false, sumber: '' }] })}>
                <Plus /> Tambah kombinasi
              </Button>
              <p className="u-bkd-label">Kewajiban khusus</p>
              {isi.kewajiban_khusus.map((c, i) => (
                <fieldset key={c.kode} className="u-bkd-kartu-isian">
                  <div className="u-bkd-grid-3">
                    <Field label="Nama">
                      <Input value={c.nama} onChange={(e) => setIsi({ ...isi, kewajiban_khusus: isi.kewajiban_khusus.map((x, j) => (j === i ? { ...x, nama: e.target.value } : x)) })} />
                    </Field>
                    <Field label="Minimal kegiatan">
                      <Input inputMode="numeric" value={String(c.minimal)} onChange={(e) => setIsi({ ...isi, kewajiban_khusus: isi.kewajiban_khusus.map((x, j) => (j === i ? { ...x, minimal: Math.max(1, Number(e.target.value) || 1) } : x)) })} />
                    </Field>
                    <Field label="Sifat">
                      <Select options={[{ value: 'peringatan', label: 'Peringatan' }, { value: 'wajib', label: 'Menentukan kesimpulan' }]} value={c.mode} onValueChange={(v) => setIsi({ ...isi, kewajiban_khusus: isi.kewajiban_khusus.map((x, j) => (j === i ? { ...x, mode: (v ?? 'peringatan') as 'peringatan' | 'wajib' } : x)) })} />
                    </Field>
                  </div>
                  <div className="u-bkd-aksi">
                    {a.jabatan_akademik.map((jb) => (
                      <label key={jb.kode} className="u-bkd-setuju">
                        <Checkbox checked={c.jabatan.includes(jb.kode)} onCheckedChange={(v) => setIsi({ ...isi, kewajiban_khusus: isi.kewajiban_khusus.map((x, j) => (j === i ? { ...x, jabatan: v === true ? [...x.jabatan, jb.kode] : x.jabatan.filter((y) => y !== jb.kode) } : x)) })} /> {jb.nama}
                      </label>
                    ))}
                  </div>
                  <Field label="Kategori yang dihitung">
                    <Select
                      options={isi.kategori.map((k) => ({ value: k.kode, label: k.nama }))}
                      value={null}
                      placeholder={c.kategori.length ? c.kategori.map((k) => isi.kategori.find((x) => x.kode === k)?.nama ?? k).join(', ') + ' (pilih untuk menambah/lepas)' : 'Pilih kategori…'}
                      onValueChange={(v) => v && setIsi({ ...isi, kewajiban_khusus: isi.kewajiban_khusus.map((x, j) => (j === i ? { ...x, kategori: x.kategori.includes(v) ? x.kategori.filter((y) => y !== v) : [...x.kategori, v] } : x)) })}
                    />
                  </Field>
                  <label className="u-bkd-setuju">
                    <Checkbox checked={c.aktif} onCheckedChange={(v) => setIsi({ ...isi, kewajiban_khusus: isi.kewajiban_khusus.map((x, j) => (j === i ? { ...x, aktif: v === true } : x)) })} /> Aktif
                  </label>
                </fieldset>
              ))}
              <p className="u-bkd-label">Pembebasan</p>
              {isi.pembebasan.map((c, i) => (
                <fieldset key={c.kode} className="u-bkd-kartu-isian">
                  <Field label="Nama">
                    <Input value={c.nama} onChange={(e) => setIsi({ ...isi, pembebasan: isi.pembebasan.map((x, j) => (j === i ? { ...x, nama: e.target.value } : x)) })} />
                  </Field>
                  <div className="u-bkd-aksi">
                    {STATUS_PEGAWAI.map((st) => (
                      <label key={st} className="u-bkd-setuju">
                        <Checkbox checked={c.status_aktif.includes(st)} onCheckedChange={(v) => setIsi({ ...isi, pembebasan: isi.pembebasan.map((x, j) => (j === i ? { ...x, status_aktif: v === true ? [...x.status_aktif, st] : x.status_aktif.filter((y) => y !== st) } : x)) })} /> {st.replace('_', ' ')}
                      </label>
                    ))}
                    <label className="u-bkd-setuju">
                      <Checkbox checked={c.aktif} onCheckedChange={(v) => setIsi({ ...isi, pembebasan: isi.pembebasan.map((x, j) => (j === i ? { ...x, aktif: v === true } : x)) })} /> Aktif
                    </label>
                  </div>
                </fieldset>
              ))}
            </div>
          ),
        },
        {
          id: 'tugas',
          title: 'Tugas tambahan',
          description: 'Ekuivalen SKS per jabatan pimpinan. Kosong = memakai data master jabatan SDM.',
          optional: true,
          content: (
            <div className="u-bkd-tabel-isian">
              {a.jabatan_tugas_tambahan.map((j) => (
                <div key={j.kode} className="u-bkd-baris-isian u-bkd-baris-isian-2">
                  <span>
                    {j.nama} <small className="u-bkd-keterangan">({j.kode}{j.setara_sks != null ? `, master ${j.setara_sks}` : ''})</small>
                  </span>
                  <Input
                    aria-label={`Ekuivalen ${j.nama}`}
                    inputMode="decimal"
                    placeholder="SKS"
                    value={t(isi.tugas_tambahan.ekuivalen[j.kode])}
                    onChange={(e) => {
                      const ekv = { ...isi.tugas_tambahan.ekuivalen };
                      const v = angkaAtauNull(e.target.value);
                      if (v == null) delete ekv[j.kode];
                      else ekv[j.kode] = v;
                      setIsi({ ...isi, tugas_tambahan: { ekuivalen: ekv } });
                    }}
                  />
                </div>
              ))}
            </div>
          ),
        },
        {
          id: 'asesor',
          title: 'Asesor dan tahap',
          content: (
            <div className="u-bkd-form">
              <Field label="Jumlah asesor per laporan">
                <SegmentedControl options={[{ value: '1', label: '1 asesor' }, { value: '2', label: '2 asesor' }]} value={String(isi.asesor.jumlah)} onValueChange={(v) => setIsi({ ...isi, asesor: { ...isi.asesor, jumlah: Number(v) as 1 | 2 } })} />
              </Field>
              <Field label="Kegiatan diakui bila">
                <Select options={[{ value: 'keduanya', label: 'Semua asesor menilai M' }, { value: 'salah_satu', label: 'Salah satu asesor menilai M' }, { value: 'asesor1', label: 'Mengikuti asesor 1' }]} value={isi.asesor.gabung} onValueChange={(v) => setIsi({ ...isi, asesor: { ...isi.asesor, gabung: (v ?? 'keduanya') as IsiAturanBkd['asesor']['gabung'] } })} />
              </Field>
              <div className="u-bkd-aksi">
                <label className="u-bkd-setuju">
                  <Checkbox checked={isi.asesor.larang_satu_prodi} onCheckedChange={(v) => setIsi({ ...isi, asesor: { ...isi.asesor, larang_satu_prodi: v === true } })} /> Asesor internal tidak boleh satu prodi
                </label>
                <label className="u-bkd-setuju">
                  <Checkbox checked={isi.asesor.wajib_terdaftar} onCheckedChange={(v) => setIsi({ ...isi, asesor: { ...isi.asesor, wajib_terdaftar: v === true } })} /> Asesor wajib terdaftar
                </label>
                <label className="u-bkd-setuju">
                  <Checkbox checked={isi.tahap.kaprodi} onCheckedChange={(v) => setIsi({ ...isi, tahap: { ...isi.tahap, kaprodi: v === true } })} /> Kaprodi mengetahui
                </label>
                <label className="u-bkd-setuju">
                  <Checkbox checked={isi.tahap.dekan} onCheckedChange={(v) => setIsi({ ...isi, tahap: { ...isi.tahap, dekan: v === true } })} /> Dekan mengetahui
                </label>
              </div>
              <p className="u-bkd-label">Tenggat bawaan (hari, untuk mengisi jadwal periode)</p>
              <div className="u-bkd-grid-3">
                {(['rencana_hari', 'kirim_hari', 'penilaian_hari', 'penetapan_hari'] as const).map((k) => (
                  <Field key={k} label={{ rencana_hari: 'Rencana', kirim_hari: 'Kirim', penilaian_hari: 'Penilaian', penetapan_hari: 'Penetapan' }[k]} optional>
                    <Input inputMode="numeric" value={t(isi.tenggat[k])} onChange={(e) => setIsi({ ...isi, tenggat: { ...isi.tenggat, [k]: angkaAtauNull(e.target.value) } })} />
                  </Field>
                ))}
              </div>
            </div>
          ),
        },
        {
          id: 'ringkasan',
          title: 'Ringkasan',
          content: (
            <WizardReview
              sections={[
                { title: 'Dasar hukum', items: [{ label: 'Nama', value: id.nama }, { label: 'Berlaku mulai', value: id.berlaku_mulai }, { label: 'SK', value: id.sk_id ? 'Dirujuk' : null }], onEdit: () => setStep(0) },
                { title: 'Batas', items: [{ label: 'Minimal', value: isi.batas.min_total != null ? sksBkd(isi.batas.min_total) : null }, { label: 'Maksimal', value: isi.batas.maks_total != null ? sksBkd(isi.batas.maks_total) : null }], onEdit: () => setStep(1) },
                { title: 'Kategori', items: [{ label: 'Aktif', value: `${isi.kategori.filter((k) => k.aktif).length} dari ${isi.kategori.length}` }], onEdit: () => setStep(2) },
                { title: 'Syarat khusus', items: [{ label: 'Kombinasi aktif', value: String(isi.kombinasi.filter((k) => k.aktif).length) }, { label: 'Kewajiban khusus aktif', value: String(isi.kewajiban_khusus.filter((k) => k.aktif).length) }], onEdit: () => setStep(3) },
                { title: 'Asesor', items: [{ label: 'Jumlah', value: String(isi.asesor.jumlah) }, { label: 'Mengetahui', value: [isi.tahap.kaprodi ? 'Kaprodi' : null, isi.tahap.dekan ? 'Dekan' : null].filter(Boolean).join(', ') }], onEdit: () => setStep(5) },
              ]}
            />
          ),
        },
      ]}
      onFinish={async () => {
        try {
          await aksi('PUT', `/v1/sdm/bkd/aturan/${a.id}`, { nama: id.nama.trim(), dasar_hukum: id.dasar_hukum.trim() || null, berlaku_mulai: id.berlaku_mulai, catatan_perubahan: id.catatan_perubahan.trim() || null, sk_id: id.sk_id, isi }, 'Draf aturan BKD disimpan.');
          return null;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

/** Isian kode baru (huruf kecil) + tombol tambah, di dalam panel (tanpa dialog). */
function TambahKode({ label, contoh, ada, onTambah }: { label: string; contoh: string; ada: string[]; onTambah: (kode: string) => void }) {
  const [v, setV] = React.useState('');
  const kode = v.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
  const salah = kode !== '' && (!/^[a-z][a-z0-9_]{1,39}$/.test(kode) ? 'Kode diawali huruf, 2-40 karakter.' : ada.includes(kode) ? 'Kode sudah ada.' : null);
  return (
    <div className="u-bkd-tambah-kode">
      <Input aria-label={label} placeholder={`Kode baru, ${contoh}`} value={v} onChange={(e) => setV(e.target.value)} aria-invalid={salah ? true : undefined} />
      <Button size="sm" variant="outline" disabled={!kode || !!salah} onClick={() => { onTambah(kode); setV(''); }}>
        <Plus /> {label}
      </Button>
      {salah ? <small className="u-bkd-galat">{salah}</small> : null}
    </div>
  );
}

interface Pratinjau {
  aturan: { id: number; nama: string; versi: number; status: string };
  aturan_sekarang: { id: number; nama: string; versi: number };
  perubahan: Perubahan[];
  ringkasan: { jumlah: number; berubah: number; jadi_memenuhi: number; jadi_tidak_memenuhi: number; ditetapkan_tetap: number };
  laporan: { kinerja_id: number; nama: string; nidn: string | null; kode_prodi: string | null; status: string; sks: number; sekarang: string; sesudah: string; berubah: boolean; akan_diterapkan: boolean; alasan: string[] }[];
}

/** Pratinjau dampak versi ke periode lalu terapkan (hanya versi terbit). */
function PanelPratinjauAturanBkd({ aturan: a, onOpenChange }: { aturan: AturanBkdDetail; onOpenChange: (o: boolean) => void }) {
  const per = usePeriodeBkd();
  const aksi = useAksiBkd();
  const toast = useToast();
  const [pid, setPid] = React.useState<string | null>(null);
  const id = pid ?? (per.data?.find((p) => p.status === 'buka')?.id?.toString() ?? null);
  const pr = useSiakadQuery<Pratinjau>(['bkd', 'pratinjau', a.id, id], q(`/v1/sdm/bkd/aturan/${a.id}/pratinjau?periode_id=${id}`), { enabled: !!id, staleTime: 0 });
  const [hanyaBerubah, setHanyaBerubah] = React.useState(true);
  const [sibuk, setSibuk] = React.useState(false);
  const d = pr.data;
  const sama = d && d.aturan_sekarang.id === a.id;
  return (
    <Sheet
      open
      onOpenChange={onOpenChange}
      title={`Pratinjau dampak ${a.nama} v${a.versi}`}
      description="Kesimpulan setiap laporan periode dihitung ulang dengan versi ini tanpa menyimpan."
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <Button
            loading={sibuk}
            disabled={!d || a.status !== 'terbit' || !!sama}
            onClick={async () => {
              setSibuk(true);
              try {
                const r = await aksi<{ laporan_dihitung_ulang: number }>('POST', `/v1/sdm/bkd/aturan/${a.id}/terapkan`, { periode_id: Number(id) });
                toast.add({ title: 'Aturan diterapkan ke periode', description: `${r.laporan_dihitung_ulang} laporan dihitung ulang; laporan yang sudah ditetapkan tetap.`, type: 'success' });
                onOpenChange(false);
              } finally {
                setSibuk(false);
              }
            }}
          >
            Terapkan ke periode ini
          </Button>
        </>
      }
    >
      <div className="u-bkd-form">
        <Field label="Periode">
          <Select options={(per.data ?? []).map((p) => ({ value: String(p.id), label: `${p.nama} · aturan sekarang ${p.aturan_nama ?? '-'} v${p.aturan_versi ?? '-'}` }))} value={id} onValueChange={setPid} placeholder="Pilih periode…" />
        </Field>
        {a.status !== 'terbit' ? <Alert variant="warning" title="Versi ini masih draf">Pratinjau boleh; terbitkan dulu sebelum diterapkan ke periode.</Alert> : null}
        {sama ? <Alert variant="neutral">Periode ini sudah memakai versi ini.</Alert> : null}
        {pr.loading ? <Skeleton style={{ height: 160 }} /> : null}
        {pr.error ? <Alert variant="danger">{pesanGalat(pr.error)}</Alert> : null}
        {d ? (
          <>
            <StatGrid>
              <StatCard label="Laporan" value={d.ringkasan.jumlah} />
              <StatCard label="Kesimpulan berubah" value={d.ringkasan.berubah} tone={d.ringkasan.berubah ? 'warning' : undefined} />
              <StatCard label="Jadi memenuhi" value={d.ringkasan.jadi_memenuhi} tone="success" />
              <StatCard label="Jadi tidak memenuhi" value={d.ringkasan.jadi_tidak_memenuhi} tone={d.ringkasan.jadi_tidak_memenuhi ? 'danger' : undefined} />
            </StatGrid>
            {d.ringkasan.ditetapkan_tetap ? <Alert variant="info">{d.ringkasan.ditetapkan_tetap} laporan sudah ditetapkan dan tidak diubah bila diterapkan.</Alert> : null}
            <Card>
              <CardHeader title={`Perubahan dari ${d.aturan_sekarang.nama} v${d.aturan_sekarang.versi}`} />
              <CardContent>
                <DaftarPerubahanAturan perubahan={d.perubahan} />
              </CardContent>
            </Card>
            <DataTable
              rows={d.laporan.filter((x) => !hanyaBerubah || x.berubah)}
              rowKey={(x) => String(x.kinerja_id)}
              columnToggle={false}
              densityToggle={false}
              toolbar={
                <label className="u-bkd-setuju">
                  <Checkbox checked={hanyaBerubah} onCheckedChange={(v) => setHanyaBerubah(v === true)} /> Hanya yang berubah
                </label>
              }
              columns={[
                { key: 'nama', header: 'Dosen', mobile: 'title', cell: (x) => <span className="u-bkd-sel"><strong>{x.nama}</strong><small>{[x.nidn, x.kode_prodi].filter(Boolean).join(' · ')}</small></span> },
                { key: 'sks', header: 'SKS', align: 'end', shrink: true, cell: (x) => sksBkd(x.sks) },
                { key: 'sekarang', header: 'Sekarang', shrink: true, cell: (x) => <KesimpulanBkd nilai={x.sekarang} /> },
                { key: 'sesudah', header: 'Sesudah', shrink: true, mobile: 'badge', cell: (x) => <KesimpulanBkd nilai={x.sesudah} /> },
                { key: 'alasan', header: 'Syarat tidak terpenuhi', cell: (x) => x.alasan.join('; ') || '-' },
                { key: 'akan', header: 'Diterapkan', shrink: true, cell: (x) => (x.akan_diterapkan ? 'Ya' : 'Tidak (sudah ditetapkan)') },
              ]}
              empty={{ title: hanyaBerubah ? 'Tidak ada kesimpulan yang berubah' : 'Belum ada laporan di periode ini' }}
            />
          </>
        ) : null}
      </div>
    </Sheet>
  );
}

