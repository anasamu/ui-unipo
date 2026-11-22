'use client';
import * as React from 'react';
import { Archive, BadgeCheck, CircleAlert, ClipboardList, Copy, FileCheck2, GitCompare, Paperclip, Pencil, Plus, Send, Trash2, Undo2, X } from 'lucide-react';
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
import { PilihBerkas } from './pilih-berkas';
import { AlurPemeriksa, type TahapPemeriksa } from './pemeriksa';
import { LinimasaPengajuan, type LangkahRiwayat } from './pengajuan';
import { useKonfirmasi } from '../components/aksi';
import { aksiHapusDraf, TombolHapusDraf } from './hapus-draf';
import { DaftarPerubahanAturan, DaftarVersiAturan, LencanaStatusVersi, PanelBandingAturan, type PerubahanAturan, type VersiAturanRow } from './aturan-versi';

/*
 * SKP tendik berversi (SIAKAD /v1/sdm/skp, docs/KEPEGAWAIAN-DOSEN.md "SKP tendik"). Komponen SKP (jenis hasil kerja,
 * aspek indikator, perilaku kerja, rumus nilai, predikat) diatur Biro SDM sebagai aturan berversi (jenis `skp`).
 *
 *   KelolaAturanSkp   SDM » Aturan karier » SKP tendik: versi komponen + wizard ubah draf
 *   RuangSkpPegawai   tendik: mulai SKP periode, wizard rencana (atasan menyetujui), wizard realisasi + bukti, hasil
 *   AntreanSkp        atasan: setujui rencana, nilai (capaian + perilaku → nilai & predikat), SDM: sahkan
 *   PanelSkp          rincian SKP di panel samping (aksi sesuai hak)
 */

const BASIS = '/v1/sdm/skp/aturan';

// ================================================================== tipe

export interface IsiAturanSkp {
  umum: { sumber: string; catatan: string };
  hasil_kerja: {
    jenis: { kode: 'utama' | 'tambahan'; nama: string; min: number; maks: number | null }[];
    aspek: { kode: string; nama: string; arah: 'naik' | 'turun'; aktif: boolean }[];
    capaian_maks: number;
  };
  perilaku: { kode: string; nama: string; uraian: string }[];
  rumus: { bobot_hasil: number; bobot_perilaku: number };
  predikat: { kode: string; nama: string; min: number }[];
  memenuhi_min: number;
}
export interface AturanSkpRow extends VersiAturanRow {
  berlaku_tanggal: string | null;
  berlaku_sekarang: boolean;
}
export interface AturanSkpDetail extends AturanSkpRow {
  isi: IsiAturanSkp;
  induk?: { id: number; nama: string; versi: number };
  perubahan?: PerubahanAturan[];
  periode: { id: number; status: string; periode: string; nama: string }[];
  riwayat: { waktu: string; username: string; aksi: string; ringkasan: string }[];
}
type TahapSkp = 'rencana_draf' | 'rencana_diajukan' | 'rencana_dikembalikan' | 'pelaksanaan' | 'diajukan' | 'dikembalikan' | 'dinilai' | 'disahkan';
export interface SkpRow {
  id: number;
  periode: string;
  pegawai_nama: string;
  nik: string | null;
  tahap: TahapSkp;
  tahap_label: string;
  nilai_akhir: number | null;
  predikat: string | null;
  aksi_boleh: string[];
}
export interface ItemSkp {
  id: number;
  jenis: 'utama' | 'tambahan';
  rencana: string;
  uraian: string | null;
  indikator: string | null;
  aspek: string;
  target: number | null;
  satuan: string | null;
  realisasi: number | null;
  capaian: number | null;
  capaian_hitung: number | null;
  catatan_penilai: string | null;
  file: { uuid: string; nama: string; url?: string }[];
}
export interface SkpDetail {
  id: number;
  status: string;
  tahap: TahapSkp;
  tahap_label: string;
  periode: { id: number; nama: string; mulai: string; selesai: string };
  pegawai: { id: number; nama: string; nik: string | null };
  atasan: { id: number; nama: string } | null;
  aturan: { id: number; nama: string; versi: number; terkunci: boolean; isi: IsiAturanSkp } | null;
  item: ItemSkp[];
  perilaku: Record<string, number | null>;
  hitung: { nilai_hasil: number | null; nilai_perilaku: number | null; nilai_akhir: number | null; predikat: string | null; kesimpulan: string } | null;
  nilai_akhir: number | null;
  predikat: string | null;
  kesimpulan: string;
  catatan_pegawai: string | null;
  catatan_penilai: string | null;
  catatan_rencana: string | null;
  linimasa: LangkahRiwayat[];
  pemeriksa: TahapPemeriksa[];
  aksi_boleh: string[];
}

// ================================================================== pembantu

const tgl = (s?: string | null) => (s ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s.length <= 10 ? `${s}T00:00:00` : s.replace(' ', 'T'))) : '-');
const angka = (n: number | null | undefined, satuan = '') => (n == null ? '-' : `${Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 })}${satuan}`);
const q = <T,>(path: string, query?: Record<string, string>) => (s: ReturnType<typeof useSiakad>, signal: AbortSignal) => s.request<T>({ method: 'GET', path, query }, { signal });
const NADA: Record<TahapSkp, BadgeVariant> = { rencana_draf: 'neutral', rencana_diajukan: 'info', rencana_dikembalikan: 'warning', pelaksanaan: 'primary', diajukan: 'info', dikembalikan: 'warning', dinilai: 'info', disahkan: 'success' };
const namaPredikat = (isi: IsiAturanSkp | undefined, k: string | null) => (k ? (isi?.predikat.find((p) => p.kode === k)?.nama ?? k.replace('_', ' ')) : '-');

export function LencanaTahapSkp({ d }: { d: { tahap: TahapSkp; tahap_label: string } }) {
  return (
    <Badge variant={NADA[d.tahap] ?? 'neutral'} dot>
      {d.tahap_label}
    </Badge>
  );
}

function useAksiSkp() {
  const s = useSiakad();
  const toast = useToast();
  return React.useCallback(
    async <T,>(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown, sukses?: string): Promise<T> => {
      try {
        const r = await s.request<T>({ method, path, body: method === 'DELETE' ? undefined : (body ?? {}) });
        if (sukses) toast.add({ title: sukses, type: 'success' });
        invalidateSiakad('skp');
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

// ================================================================== aturan berversi (SDM)

/** SDM » Aturan karier » SKP tendik: versi komponen SKP, rincian, salin/ubah/terbitkan/banding. */
export function KelolaAturanSkp({ className }: { className?: string }) {
  const daftar = useSiakadQuery<AturanSkpRow[]>(['skp', 'aturan', 'daftar'], q(BASIS));
  const [pilih, setPilih] = React.useState<number | null>(null);
  const rows = daftar.data ?? [];
  const id = pilih ?? rows.find((a) => a.status === 'draf')?.id ?? rows.find((a) => a.berlaku_sekarang)?.id ?? rows[0]?.id ?? null;
  if (daftar.loading && !daftar.data) return <Skeleton style={{ height: 360 }} />;
  if (daftar.error) return <Alert variant="danger" title="Komponen SKP belum bisa dimuat">{pesanGalat(daftar.error)}</Alert>;
  return (
    <div className={cn('u-bkd-aturan u-ak', className)}>
      <div className="u-ak-kiri">
        <DaftarVersiAturan versi={rows.map((r) => ({ ...r, berlaku_mulai: r.berlaku_tanggal, berlaku_mulai_nama: r.berlaku_tanggal ? tgl(r.berlaku_tanggal) : null }))} value={id} onValueChange={setPilih} satuanPemakai="SKP" label="Versi komponen SKP" />
        <p className="u-bkd-keterangan">SKP mengunci versi saat rencana diajukan. Aturan baru: salin versi, ubah, lalu terbitkan.</p>
      </div>
      {id ? <RincianAturanSkp id={id} onPilih={setPilih} /> : <Empty bordered icon={<ClipboardList />} title="Belum ada komponen SKP" description="Jalankan migration SIAKAD agar versi bawaan dibuat." />}
    </div>
  );
}

function RincianAturanSkp({ id, onPilih }: { id: number; onPilih: (id: number | null) => void }) {
  const d = useSiakadQuery<AturanSkpDetail>(['skp', 'aturan', 'detail', id], q(`${BASIS}/${id}`));
  const aksi = useAksiSkp();
  const [panel, setPanel] = React.useState<'ubah' | 'banding' | 'hapus' | 'terbit' | null>(null);
  if (d.loading && !d.data) return <Skeleton style={{ height: 360 }} />;
  if (!d.data) return <Alert variant="danger">{pesanGalat(d.error)}</Alert>;
  const a = d.data;
  const isi = a.isi;
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
              <LencanaStatusVersi status={a.status} menunggu={a.menunggu_validasi}>{a.diterbitkan_at ? ` ${tgl(a.diterbitkan_at)}` : ''}</LencanaStatusVersi>
            </div>
          </div>
          <DescriptionList
            items={[
              { label: 'SK/pedoman', value: a.sk ? a.sk.nomor : <span className="u-bkd-keterangan">Belum dilampirkan (tetap bisa terbit dengan peringatan "Perlu SK")</span> },
              { label: 'Berlaku mulai', value: a.berlaku_tanggal ? tgl(a.berlaku_tanggal) : a.status === 'terbit' ? 'Sejak diterbitkan' : 'Diisi sebelum terbit' },
              { label: 'Rumus nilai', value: `${angka(isi.rumus.bobot_hasil, '%')} hasil kerja + ${angka(isi.rumus.bobot_perilaku, '%')} perilaku kerja` },
              { label: 'Dipakai', value: a.periode.length ? `${a.periode.length} SKP mengunci versi ini` : 'Belum ada' },
            ]}
          />
          {isi.rumus.bobot_perilaku === 0 ? (
            <Alert variant="warning" icon={<CircleAlert />} title="Perilaku kerja belum dinilai">
              Versi ini masih mengikuti perhitungan lama (nilai = rata-rata capaian hasil kerja). Bila peraturan mewajibkan perilaku kerja, salin versi, isi perilaku dan bobotnya, lalu terbitkan.
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
                const r = await aksi<AturanSkpDetail>('POST', `${BASIS}/${a.id}/salin`, {}, 'Versi baru dibuat sebagai draf.');
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
          {
            value: 'hasil',
            label: 'Hasil kerja',
            content: (
              <Card>
                <CardContent>
                  <DescriptionList
                    items={[
                      ...isi.hasil_kerja.jenis.map((j) => ({ label: j.nama, value: `minimal ${j.min}${j.maks != null ? `, maksimal ${j.maks}` : ''} rencana` })),
                      { label: 'Aspek indikator', value: isi.hasil_kerja.aspek.filter((x) => x.aktif).map((x) => `${x.nama} (${x.arah === 'turun' ? 'makin kecil makin baik' : 'makin besar makin baik'})`).join(', ') },
                      { label: 'Capaian maksimal', value: angka(isi.hasil_kerja.capaian_maks, '%') },
                    ]}
                  />
                </CardContent>
              </Card>
            ),
          },
          {
            value: 'perilaku',
            label: 'Perilaku kerja',
            count: isi.perilaku.length,
            content: (
              <DataTable
                rows={isi.perilaku}
                rowKey={(p) => p.kode}
                columnToggle={false}
                densityToggle={false}
                columns={[
                  { key: 'nama', header: 'Perilaku', mobile: 'title' },
                  { key: 'uraian', header: 'Uraian' },
                ]}
                empty={{ title: 'Perilaku kerja belum diatur', description: 'Dinilai atasan 0-100 bila bobot perilaku > 0.' }}
              />
            ),
          },
          {
            value: 'predikat',
            label: 'Predikat',
            content: (
              <DataTable
                rows={isi.predikat}
                rowKey={(p) => p.kode}
                columnToggle={false}
                densityToggle={false}
                columns={[
                  { key: 'nama', header: 'Predikat', mobile: 'title' },
                  { key: 'min', header: 'Nilai minimal', align: 'end', cell: (p) => angka(p.min) },
                ]}
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
      {panel === 'ubah' ? <PanelUbahAturanSkp aturan={a} onOpenChange={(o) => !o && setPanel(null)} /> : null}
      {panel === 'banding' ? <PanelBandingAturan basis={BASIS} aturan={a} onOpenChange={(o) => !o && setPanel(null)} /> : null}
      <ConfirmDialog
        open={panel === 'terbit'}
        onOpenChange={(o) => !o && setPanel(null)}
        tone="primary"
        title="Terbitkan komponen SKP ini?"
        description={`${a.nama} v${a.versi} dikunci dan dipakai SKP yang rencananya diajukan sesudah ini. SKP yang sudah diajukan tetap memakai versinya.`}
        confirmLabel="Terbitkan"
        onConfirm={async () => {
          await aksi('POST', `${BASIS}/${a.id}/terbitkan`, {}, 'Komponen SKP diterbitkan. Bila rantai validator diatur, berlaku setelah validator terakhir menyetujui.');
          setPanel(null);
        }}
      />
      <ConfirmDialog
        open={panel === 'hapus'}
        onOpenChange={(o) => !o && setPanel(null)}
        title="Hapus draf ini?"
        description={`${a.nama} versi ${a.versi}.`}
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

function PanelUbahAturanSkp({ aturan: a, onOpenChange }: { aturan: AturanSkpDetail; onOpenChange: (o: boolean) => void }) {
  const aksi = useAksiSkp();
  const [step, setStep] = React.useState(0);
  const [isi, setIsi] = React.useState<IsiAturanSkp>(() => structuredClone(a.isi) as IsiAturanSkp);
  const [id, setId] = React.useState({ nama: a.nama, dasar_hukum: a.dasar_hukum ?? '', berlaku_tanggal: a.berlaku_tanggal ?? '', catatan_perubahan: a.catatan_perubahan ?? '', sk_id: a.sk?.id ?? (null as string | null) });
  const hk = isi.hasil_kerja;
  return (
    <PanelLangkah
      open
      onOpenChange={onOpenChange}
      title={`Ubah ${a.nama} v${a.versi}`}
      description="Perubahan hanya pada draf. SKP yang sudah diajukan tetap memakai versinya."
      mode="ubah"
      size="xl"
      step={step}
      onStepChange={setStep}
      finishLabel="Simpan draf"
      steps={[
        {
          id: 'dasar',
          title: 'Dasar hukum',
          validate: () => (id.nama.trim() ? null : 'Isi nama.'),
          content: (
            <div className="u-bkd-form">
              <Field label="Nama" required>
                <Input value={id.nama} onChange={(e) => setId({ ...id, nama: e.target.value })} />
              </Field>
              <Field label="Dasar hukum" description="Peraturan penilaian kinerja pegawai yang berlaku.">
                <Textarea rows={3} value={id.dasar_hukum} onChange={(e) => setId({ ...id, dasar_hukum: e.target.value })} />
              </Field>
              <PilihSK value={id.sk_id} onValueChange={(v: string | null) => setId({ ...id, sk_id: v })} jenis="aturan" label="SK/pedoman yang dirujuk" description="Dari registri SK. Tanpa SK versi tetap bisa terbit dengan peringatan Perlu SK." />
              <Field label="Berlaku mulai tanggal" optional>
                <IsianTanggal value={id.berlaku_tanggal} onValueChange={(v) => setId({ ...id, berlaku_tanggal: v ?? '' })} />
              </Field>
              <Field label="Catatan perubahan" optional>
                <Textarea rows={2} value={id.catatan_perubahan} onChange={(e) => setId({ ...id, catatan_perubahan: e.target.value })} />
              </Field>
            </div>
          ),
        },
        {
          id: 'hasil',
          title: 'Hasil kerja',
          description: 'Jumlah rencana hasil kerja per jenis dan aspek indikator yang boleh dipilih pegawai.',
          validate: () => (hk.aspek.some((x) => x.aktif) ? null : 'Aktifkan minimal satu aspek.'),
          content: (
            <div className="u-bkd-form">
              {hk.jenis.map((j, i) => (
                <FormGrid key={j.kode} columns={3}>
                  <Field label="Jenis">
                    <Input value={j.nama} onChange={(e) => setIsi({ ...isi, hasil_kerja: { ...hk, jenis: hk.jenis.map((x, n) => (n === i ? { ...x, nama: e.target.value } : x)) } })} />
                  </Field>
                  <Field label="Minimal">
                    <IsianAngka value={j.min} onChange={(v) => setIsi({ ...isi, hasil_kerja: { ...hk, jenis: hk.jenis.map((x, n) => (n === i ? { ...x, min: v ?? 0 } : x)) } })} />
                  </Field>
                  <Field label="Maksimal" description="Kosong = tanpa batas">
                    <IsianAngka value={j.maks} onChange={(v) => setIsi({ ...isi, hasil_kerja: { ...hk, jenis: hk.jenis.map((x, n) => (n === i ? { ...x, maks: v } : x)) } })} />
                  </Field>
                </FormGrid>
              ))}
              <p className="u-bkd-label">Aspek indikator</p>
              {hk.aspek.map((x, i) => (
                <div key={i} className="u-ak-isian-kepala">
                  <label className="u-ak-centang">
                    <Checkbox checked={x.aktif} onCheckedChange={(v) => setIsi({ ...isi, hasil_kerja: { ...hk, aspek: hk.aspek.map((y, n) => (n === i ? { ...y, aktif: v === true } : y)) } })} /> {x.nama}
                  </label>
                  <span className="u-bkd-keterangan">{x.arah === 'turun' ? 'Makin kecil realisasi makin baik (mis. waktu)' : 'Makin besar realisasi makin baik'}</span>
                </div>
              ))}
              <Field label="Capaian maksimal (%)">
                <IsianAngka value={hk.capaian_maks} onChange={(v) => setIsi({ ...isi, hasil_kerja: { ...hk, capaian_maks: v ?? 100 } })} />
              </Field>
            </div>
          ),
        },
        {
          id: 'perilaku',
          title: 'Perilaku kerja',
          description: 'Perilaku yang dinilai atasan (0-100). Kosongkan bila tidak dinilai.',
          validate: () => (isi.perilaku.some((p) => !p.nama.trim()) ? 'Isi nama perilaku atau hapus barisnya.' : null),
          content: (
            <div className="u-bkd-form">
              {isi.perilaku.map((p, i) => (
                <div key={i} className="u-ak-karya">
                  <Input aria-label="Nama perilaku" placeholder="mis. Berorientasi pelayanan" value={p.nama} onChange={(e) => setIsi({ ...isi, perilaku: isi.perilaku.map((x, n) => (n === i ? { ...x, nama: e.target.value, kode: x.kode || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) } : x)) })} />
                  <Input aria-label="Uraian" placeholder="Uraian singkat" value={p.uraian} onChange={(e) => setIsi({ ...isi, perilaku: isi.perilaku.map((x, n) => (n === i ? { ...x, uraian: e.target.value } : x)) })} />
                  <span />
                  <span />
                  <Button size="sm" variant="ghost" aria-label="Hapus perilaku" onClick={() => setIsi({ ...isi, perilaku: isi.perilaku.filter((_, n) => n !== i) })}>
                    <X />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => setIsi({ ...isi, perilaku: [...isi.perilaku, { kode: '', nama: '', uraian: '' }] })}>
                <Plus /> Tambah perilaku
              </Button>
            </div>
          ),
        },
        {
          id: 'rumus',
          title: 'Rumus & predikat',
          description: 'Nilai akhir = bobot hasil kerja × rata-rata capaian + bobot perilaku × rata-rata perilaku. Predikat dari nilai minimal.',
          validate: () => (Math.abs(isi.rumus.bobot_hasil + isi.rumus.bobot_perilaku - 100) > 0.001 ? 'Bobot hasil + perilaku harus 100.' : isi.rumus.bobot_perilaku > 0 && !isi.perilaku.length ? 'Isi perilaku kerja bila bobotnya > 0.' : null),
          content: (
            <div className="u-bkd-form">
              <FormGrid columns={3}>
                <Field label="Bobot hasil kerja (%)">
                  <IsianAngka value={isi.rumus.bobot_hasil} onChange={(v) => setIsi({ ...isi, rumus: { ...isi.rumus, bobot_hasil: v ?? 0 } })} />
                </Field>
                <Field label="Bobot perilaku (%)">
                  <IsianAngka value={isi.rumus.bobot_perilaku} onChange={(v) => setIsi({ ...isi, rumus: { ...isi.rumus, bobot_perilaku: v ?? 0 } })} />
                </Field>
                <Field label="Nilai minimal memenuhi">
                  <IsianAngka value={isi.memenuhi_min} onChange={(v) => setIsi({ ...isi, memenuhi_min: v ?? 0 })} />
                </Field>
              </FormGrid>
              <p className="u-bkd-label">Predikat (nilai minimal)</p>
              <FormGrid columns={3}>
                {isi.predikat.map((p, i) => (
                  <Field key={p.kode} label={p.nama}>
                    <IsianAngka value={p.min} onChange={(v) => setIsi({ ...isi, predikat: isi.predikat.map((x, n) => (n === i ? { ...x, min: v ?? 0 } : x)) })} />
                  </Field>
                ))}
              </FormGrid>
            </div>
          ),
        },
        {
          id: 'tinjau',
          title: 'Tinjau',
          content: (
            <WizardReview
              sections={[
                { title: 'Dasar hukum', items: [{ label: 'Nama', value: id.nama }, { label: 'SK', value: id.sk_id ? 'Terlampir' : null }, { label: 'Berlaku mulai', value: id.berlaku_tanggal ? tgl(id.berlaku_tanggal) : 'Sejak diterbitkan' }], onEdit: () => setStep(0), missing: id.sk_id ? undefined : 'Belum ada SK/pedoman: versi terbit dengan peringatan "Perlu SK".' },
                { title: 'Hasil kerja', items: [...hk.jenis.map((j) => ({ label: j.nama, value: `min ${j.min}${j.maks != null ? `, maks ${j.maks}` : ''}` })), { label: 'Aspek', value: hk.aspek.filter((x) => x.aktif).map((x) => x.nama).join(', ') }], onEdit: () => setStep(1) },
                { title: 'Perilaku kerja', items: [{ label: 'Perilaku', value: isi.perilaku.map((p) => p.nama).join(', ') || 'Tidak dinilai' }], onEdit: () => setStep(2) },
                { title: 'Rumus & predikat', items: [{ label: 'Bobot', value: `${angka(isi.rumus.bobot_hasil, '%')} hasil + ${angka(isi.rumus.bobot_perilaku, '%')} perilaku` }, ...isi.predikat.map((p) => ({ label: p.nama, value: `≥ ${angka(p.min)}` }))], onEdit: () => setStep(3) },
              ]}
            />
          ),
        },
      ]}
      onFinish={async () => {
        try {
          await aksi('PUT', `${BASIS}/${a.id}`, { nama: id.nama.trim(), dasar_hukum: id.dasar_hukum.trim() || null, berlaku_tanggal: id.berlaku_tanggal || null, catatan_perubahan: id.catatan_perubahan.trim() || null, sk_id: id.sk_id, isi }, 'Draf disimpan.');
          return null;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

// ================================================================== SKP pegawai (tendik)

interface PeriodeSkp {
  id: number;
  nama: string;
  jenis: string;
  mulai: string;
  selesai: string;
  status: string;
}

/** SKP saya (tendik): periode dibuka, mulai SKP, wizard rencana/realisasi, dan riwayat. */
export function RuangSkpPegawai({ className }: { className?: string }) {
  const daftar = useSiakadQuery<SkpRow[]>(['skp', 'saya'], q('/v1/sdm/skp', { sebagai: 'saya' }));
  const periode = useSiakadQuery<PeriodeSkp[]>(['skp', 'periode'], q('/v1/sdm/kinerja/periode', { jenis: 'skp', status: 'buka' }));
  const aksi = useAksiSkp();
  const { konfirmasi, elemen } = useKonfirmasi();
  const [buka, setBuka] = React.useState<{ id: number; mode: 'rencana' | 'realisasi' | 'lihat' } | null>(null);
  const hapusDraf = async (r: SkpRow) => {
    const a = aksiHapusDraf({ apa: 'SKP', nama: r.periode, ikut: ['rencana hasil kerja yang sudah disusun'], onHapus: () => undefined });
    if (!(await konfirmasi({ nada: 'bahaya', ...a.konfirmasi!, label: a.konfirmasi!.label ?? a.label }))) return;
    await aksi('DELETE', `/v1/sdm/skp/${r.id}`, undefined, 'Draf SKP dihapus.').catch(() => undefined);
  };
  const sudah = new Set((daftar.data ?? []).map((r) => r.periode));
  const terbuka = (periode.data ?? []).filter((p) => !sudah.has(p.nama));
  const kolom: DataColumn<SkpRow>[] = [
    { key: 'periode', header: 'Periode', mobile: 'title' },
    { key: 'nilai', header: 'Nilai', align: 'end', cell: (r) => angka(r.nilai_akhir) },
    { key: 'predikat', header: 'Predikat', cell: (r) => (r.predikat ? r.predikat.replace('_', ' ') : '-') },
    { key: 'tahap', header: 'Tahap', shrink: true, mobile: 'badge', cell: (r) => <LencanaTahapSkp d={r} /> },
  ];
  const bukaBaris = (r: SkpRow) => setBuka({ id: r.id, mode: r.aksi_boleh.includes('ubah_rencana') ? 'rencana' : r.aksi_boleh.includes('isi_realisasi') ? 'realisasi' : 'lihat' });
  return (
    <div className={cn('u-bkd-form', className)}>
      {terbuka.map((p) => (
        <Alert
          key={p.id}
          variant="info"
          title={`Periode ${p.nama} dibuka`}
          actions={
            <Button
              onClick={async () => {
                const r = await aksi<SkpDetail>('POST', '/v1/sdm/skp', { periode_id: p.id }, 'SKP dibuat. Susun rencana hasil kerja.');
                setBuka({ id: r.id, mode: 'rencana' });
              }}
            >
              <Plus /> Susun rencana SKP
            </Button>
          }
        >
          {tgl(p.mulai)} – {tgl(p.selesai)}. Susun rencana hasil kerja, ajukan ke atasan, lalu isi realisasi dan bukti di akhir periode.
        </Alert>
      ))}
      <DataTable<SkpRow>
        columns={kolom}
        rows={daftar.data}
        rowKey={(r) => String(r.id)}
        loading={daftar.loading}
        error={daftar.error}
        onRetry={daftar.refetch}
        onRowClick={bukaBaris}
        columnToggle={false}
        densityToggle={false}
        rowActions={(r) => [
          ...(r.aksi_boleh.includes('ubah_rencana') ? [{ label: 'Susun rencana', icon: <Pencil />, onSelect: () => setBuka({ id: r.id, mode: 'rencana' }) }] : []),
          ...(r.aksi_boleh.includes('isi_realisasi') ? [{ label: 'Isi realisasi', icon: <Pencil />, onSelect: () => setBuka({ id: r.id, mode: 'realisasi' }) }] : []),
          { label: 'Lihat rincian', icon: <ClipboardList />, onSelect: () => setBuka({ id: r.id, mode: 'lihat' }) },
          ...(r.aksi_boleh.includes('hapus') ? [{ type: 'separator' as const }, { label: 'Hapus draf', icon: <Trash2 />, destructive: true, onSelect: () => void hapusDraf(r) }] : []),
        ]}
        empty={{ icon: <ClipboardList />, title: 'Belum ada SKP', description: 'SKP bisa disusun setelah Biro SDM membuka periode SKP.' }}
      />
      {buka?.mode === 'rencana' ? <PanelRencanaSkp id={buka.id} onOpenChange={(o) => !o && setBuka(null)} /> : null}
      {buka?.mode === 'realisasi' ? <PanelRealisasiSkp id={buka.id} onOpenChange={(o) => !o && setBuka(null)} /> : null}
      {buka?.mode === 'lihat' ? <PanelSkp id={buka.id} onOpenChange={(o) => !o && setBuka(null)} /> : null}
      {elemen}
    </div>
  );
}

interface BarisRencana {
  id?: number;
  jenis: 'utama' | 'tambahan';
  rencana: string;
  indikator: string;
  aspek: string;
  target: number | null;
  satuan: string;
}

/** Wizard rencana SKP: hasil kerja utama → tambahan → tinjau → ajukan ke atasan. */
export function PanelRencanaSkp({ id, onOpenChange }: { id: number; onOpenChange: (o: boolean) => void }) {
  const d = useSiakadQuery<SkpDetail>(['skp', 'detail', id], q(`/v1/sdm/skp/${id}`), { staleTime: 0 });
  const aksi = useAksiSkp();
  const [step, setStep] = React.useState(0);
  const [baris, setBaris] = React.useState<BarisRencana[] | null>(null);
  const [catatan, setCatatan] = React.useState('');
  const D = d.data;
  React.useEffect(() => {
    if (D && baris === null) {
      setBaris(D.item.map((i) => ({ id: i.id, jenis: i.jenis, rencana: i.rencana, indikator: i.indikator ?? '', aspek: i.aspek, target: i.target, satuan: i.satuan ?? '' })));
      setCatatan(D.catatan_pegawai ?? '');
    }
  }, [D, baris]);
  const isi = D?.aturan?.isi;
  const aspek = (isi?.hasil_kerja.aspek ?? []).filter((a) => a.aktif).map((a) => ({ value: a.kode, label: a.nama }));
  const B = baris ?? [];
  const ubah = (i: number, x: Partial<BarisRencana>) => setBaris(B.map((b, n) => (n === i ? { ...b, ...x } : b)));
  const simpan = async () => {
    await aksi('PUT', `/v1/sdm/skp/${id}/rencana`, { item: B.map((b) => ({ id: b.id, jenis: b.jenis, rencana: b.rencana.trim(), indikator: b.indikator.trim(), aspek: b.aspek, target: b.target, satuan: b.satuan.trim() })), catatan_pegawai: catatan.trim() || null });
  };
  const langkahJenis = (jenis: 'utama' | 'tambahan') => {
    const j = isi?.hasil_kerja.jenis.find((x) => x.kode === jenis);
    const daftar = B.map((b, i) => ({ b, i })).filter((x) => x.b.jenis === jenis);
    return {
      id: jenis,
      title: j?.nama ?? jenis,
      description: `Rencana hasil kerja ${jenis === 'utama' ? 'utama (tugas pokok)' : 'tambahan'}; tiap rencana punya indikator, aspek, dan target.${j ? ` Minimal ${j.min}${j.maks != null ? `, maksimal ${j.maks}` : ''}.` : ''}`,
      validate: () => {
        if (j && daftar.length < j.min) return `${j.nama} minimal ${j.min}.`;
        const kurang = daftar.find((x) => !x.b.rencana.trim() || !x.b.indikator.trim() || !x.b.target || !x.b.satuan.trim());
        return kurang ? 'Lengkapi rencana, indikator, target, dan satuan.' : null;
      },
      content: (
        <div className="u-bkd-form">
          {daftar.map(({ b, i }, n) => (
            <fieldset key={i} className="u-ak-isian">
              <legend>
                <span className="u-ak-kode">{n + 1}</span>
                <Button size="sm" variant="ghost" aria-label="Hapus rencana" onClick={() => setBaris(B.filter((_, m) => m !== i))}>
                  <X />
                </Button>
              </legend>
              <Field label="Rencana hasil kerja" required>
                <Input value={b.rencana} onChange={(e) => ubah(i, { rencana: e.target.value })} placeholder="mis. Data mahasiswa prodi termutakhir di SIAKAD" />
              </Field>
              <Field label="Indikator kinerja" required>
                <Input value={b.indikator} onChange={(e) => ubah(i, { indikator: e.target.value })} placeholder="mis. Jumlah data mahasiswa yang divalidasi" />
              </Field>
              <FormGrid columns={3}>
                <Field label="Aspek" required>
                  <Select options={aspek} value={b.aspek || null} onValueChange={(v) => ubah(i, { aspek: v ?? '' })} placeholder="Pilih…" />
                </Field>
                <Field label="Target" required>
                  <IsianAngka value={b.target} onChange={(v) => ubah(i, { target: v })} />
                </Field>
                <Field label="Satuan" required>
                  <Input value={b.satuan} onChange={(e) => ubah(i, { satuan: e.target.value })} placeholder="mis. dokumen, %, hari" />
                </Field>
              </FormGrid>
            </fieldset>
          ))}
          <Button variant="outline" onClick={() => setBaris([...B, { jenis, rencana: '', indikator: '', aspek: aspek[0]?.value ?? 'kuantitas', target: null, satuan: '' }])}>
            <Plus /> Tambah rencana {jenis}
          </Button>
        </div>
      ),
    };
  };
  return (
    <PanelLangkah
      open
      onOpenChange={onOpenChange}
      title={D ? `Rencana ${D.periode.nama}` : 'Rencana SKP'}
      description={D?.aturan ? `${D.aturan.nama} v${D.aturan.versi}${D.aturan.terkunci ? ' (terkunci)' : ' (dikunci saat diajukan)'} · atasan penilai: ${D.atasan?.nama ?? 'belum ada'}` : undefined}
      size="xl"
      step={step}
      onStepChange={async (n) => {
        if (n > step && baris) {
          try {
            await simpan();
          } catch {
            return;
          }
        }
        setStep(n);
      }}
      finishLabel="Ajukan ke atasan"
      steps={
        !D || !baris
          ? [{ id: 'muat', title: 'Memuat', content: <Skeleton style={{ height: 240 }} /> }]
          : [
              langkahJenis('utama'),
              langkahJenis('tambahan'),
              {
                id: 'tinjau',
                title: 'Tinjau & ajukan',
                content: (
                  <div className="u-bkd-form">
                    {D.tahap === 'rencana_dikembalikan' && D.catatan_rencana ? <Alert variant="warning" title="Catatan atasan">{D.catatan_rencana}</Alert> : null}
                    <WizardReview
                      sections={(['utama', 'tambahan'] as const).map((j, n) => ({
                        title: isi?.hasil_kerja.jenis.find((x) => x.kode === j)?.nama ?? j,
                        items: B.filter((b) => b.jenis === j).map((b) => ({ label: b.rencana || '(tanpa judul)', value: `${b.indikator}: ${angka(b.target)} ${b.satuan} (${aspek.find((a) => a.value === b.aspek)?.label ?? b.aspek})` })),
                        onEdit: () => setStep(n),
                      }))}
                    />
                    <Field label="Catatan untuk atasan" optional>
                      <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
                    </Field>
                    <AlurPemeriksa pemeriksa={D.pemeriksa} judul="Diperiksa oleh" />
                    <div className="u-bkd-aksi">
                      <TombolHapusDraf
                        apa="SKP"
                        nama={D.periode.nama}
                        ikut={['rencana hasil kerja yang sudah disusun']}
                        sembunyi={!D.aksi_boleh.includes('hapus')}
                        onHapus={async () => {
                          await aksi('DELETE', `/v1/sdm/skp/${id}`, undefined, 'Draf SKP dihapus.');
                          onOpenChange(false);
                        }}
                      />
                    </div>
                  </div>
                ),
              },
            ]
      }
      onFinish={async () => {
        try {
          await simpan();
          await aksi('POST', `/v1/sdm/skp/${id}/ajukan_rencana`, {}, 'Rencana SKP diajukan ke atasan.');
          return null;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

/** Wizard realisasi SKP: isi realisasi + bukti per hasil kerja → tinjau capaian → kirim ke atasan. */
export function PanelRealisasiSkp({ id, onOpenChange }: { id: number; onOpenChange: (o: boolean) => void }) {
  const d = useSiakadQuery<SkpDetail>(['skp', 'detail', id], q(`/v1/sdm/skp/${id}`), { staleTime: 0 });
  const aksi = useAksiSkp();
  const s = useSiakad();
  const [step, setStep] = React.useState(0);
  const [real, setReal] = React.useState<Record<number, number | null>>({});
  const D = d.data;
  const nilaiReal = (i: ItemSkp) => (i.id in real ? real[i.id] : i.realisasi);
  const simpan = async () => {
    if (!D) return;
    await aksi('PUT', `/v1/sdm/skp/${id}/realisasi`, { item: D.item.map((i) => ({ id: i.id, realisasi: nilaiReal(i) })) });
  };
  return (
    <PanelLangkah
      open
      onOpenChange={onOpenChange}
      title={D ? `Realisasi ${D.periode.nama}` : 'Realisasi SKP'}
      description="Rencana sudah disetujui atasan. Isi realisasi tiap hasil kerja dan lampirkan bukti, lalu kirim untuk dinilai."
      size="xl"
      step={step}
      onStepChange={async (n) => {
        if (n > step) {
          try {
            await simpan();
          } catch {
            return;
          }
        }
        setStep(n);
      }}
      finishLabel="Kirim untuk dinilai"
      steps={
        !D
          ? [{ id: 'muat', title: 'Memuat', content: <Skeleton style={{ height: 240 }} /> }]
          : [
              {
                id: 'realisasi',
                title: 'Realisasi & bukti',
                validate: () => (D.item.some((i) => nilaiReal(i) == null) ? 'Isi realisasi semua hasil kerja.' : null),
                content: (
                  <div className="u-bkd-form">
                    {D.tahap === 'dikembalikan' && D.catatan_penilai ? <Alert variant="warning" title="Catatan atasan">{D.catatan_penilai}</Alert> : null}
                    {D.item.map((i) => (
                      <fieldset key={i.id} className="u-ak-isian">
                        <legend>
                          <Badge variant={i.jenis === 'utama' ? 'primary' : 'neutral'}>{i.jenis}</Badge> {i.rencana}
                        </legend>
                        <p className="u-bkd-keterangan">
                          {i.indikator} · target {angka(i.target)} {i.satuan} · aspek {D.aturan?.isi.hasil_kerja.aspek.find((a) => a.kode === i.aspek)?.nama ?? i.aspek}
                        </p>
                        <FormGrid columns={2}>
                          <Field label={`Realisasi (${i.satuan ?? ''})`} required>
                            <IsianAngka value={nilaiReal(i)} onChange={(v) => setReal({ ...real, [i.id]: v })} />
                          </Field>
                          <Field label="Bukti" optional description={i.file.length ? `${i.file.length} berkas terlampir` : undefined}>
                            <PilihBerkas
                              value={null}
                              kategori="dokumen"
                              modul="sdm_skp"
                              keterangan="Bukti realisasi SKP"
                              onValueChange={async (bid) => {
                                if (!bid) return;
                                await s.request({ method: 'POST', path: '/v1/sdm/file', body: { entitas: 'kinerja_item', entitas_id: i.id, berkas_id: bid } });
                                invalidateSiakad('skp');
                              }}
                            />
                          </Field>
                        </FormGrid>
                      </fieldset>
                    ))}
                  </div>
                ),
              },
              {
                id: 'tinjau',
                title: 'Tinjau & kirim',
                content: (
                  <div className="u-bkd-form">
                    <DataTable<ItemSkp>
                      rows={D.item}
                      rowKey={(i) => String(i.id)}
                      pagination={false}
                      columnToggle={false}
                      densityToggle={false}
                      columns={[
                        { key: 'rencana', header: 'Hasil kerja', mobile: 'title' },
                        { key: 'target', header: 'Target', align: 'end', cell: (i) => `${angka(i.target)} ${i.satuan ?? ''}` },
                        { key: 'realisasi', header: 'Realisasi', align: 'end', cell: (i) => `${angka(i.realisasi)} ${i.satuan ?? ''}` },
                        { key: 'capaian', header: 'Capaian', align: 'end', cell: (i) => angka(i.capaian_hitung, '%') },
                        { key: 'file', header: 'Bukti', shrink: true, cell: (i) => (i.file.length ? <Badge variant="success">{i.file.length} berkas</Badge> : '-') },
                      ]}
                    />
                    {D.hitung ? <Alert variant="info" title="Perkiraan nilai hasil kerja">Rata-rata capaian {angka(D.hitung.nilai_hasil, '%')}. Nilai akhir dan predikat ditetapkan atasan{(D.aturan?.isi.rumus.bobot_perilaku ?? 0) > 0 ? ' bersama penilaian perilaku kerja' : ''}.</Alert> : null}
                    <AlurPemeriksa pemeriksa={D.pemeriksa} judul="Diperiksa oleh" />
                  </div>
                ),
              },
            ]
      }
      onFinish={async () => {
        try {
          await simpan();
          await aksi('POST', `/v1/sdm/skp/${id}/kirim`, {}, 'Realisasi SKP dikirim ke atasan.');
          return null;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

// ================================================================== rincian + penilaian atasan

/** Rincian SKP di panel samping; atasan menyetujui rencana atau menilai, Biro SDM mengesahkan. */
export function PanelSkp({ id, onOpenChange }: { id: number; onOpenChange: (o: boolean) => void }) {
  const d = useSiakadQuery<SkpDetail>(['skp', 'detail', id], q(`/v1/sdm/skp/${id}`), { staleTime: 0 });
  const aksi = useAksiSkp();
  const [dialog, setDialog] = React.useState<string | null>(null);
  const [catatan, setCatatan] = React.useState('');
  const [perilaku, setPerilaku] = React.useState<Record<string, number | null>>({});
  const [capaian, setCapaian] = React.useState<Record<number, number | null>>({});
  const D = d.data;
  const boleh = (x: string) => !!D?.aksi_boleh.includes(x);
  const isi = D?.aturan?.isi;
  const menilai = boleh('nilai');
  const nilaiPerilaku = (k: string) => (k in perilaku ? perilaku[k] : (D?.perilaku[k] ?? null));
  const pratinjau = React.useMemo(() => {
    if (!D || !isi) return null;
    const c = D.item.map((i) => (i.id in capaian ? capaian[i.id] : (i.capaian ?? i.capaian_hitung))).filter((x): x is number => x != null);
    const hasil = c.length ? c.reduce((a, b) => a + b, 0) / c.length : null;
    const p = isi.perilaku.map((x) => nilaiPerilaku(x.kode)).filter((x): x is number => x != null);
    const np = p.length ? p.reduce((a, b) => a + b, 0) / p.length : null;
    const akhir = hasil == null || (isi.rumus.bobot_perilaku > 0 && np == null) ? null : (isi.rumus.bobot_hasil / 100) * hasil + (isi.rumus.bobot_perilaku / 100) * (np ?? 0);
    const pred = akhir == null ? null : (isi.predikat.toSorted((a, b) => b.min - a.min).find((x) => akhir >= x.min)?.kode ?? null);
    return { hasil, np, akhir, pred };
  }, [D, isi, capaian, perilaku]); // eslint-disable-line react-hooks/exhaustive-deps
  const kirim = async (a: string, body: Record<string, unknown>, sukses: string) => {
    if (!D) return;
    await aksi('POST', `/v1/sdm/skp/${D.id}/${a}`, body, sukses);
    setDialog(null);
    setCatatan('');
  };
  return (
    <Sheet
      open
      onOpenChange={onOpenChange}
      size="xl"
      title={D ? `SKP ${D.pegawai.nama}` : 'SKP'}
      description={D ? `${D.periode.nama} · atasan penilai: ${D.atasan?.nama ?? '-'}` : undefined}
      footer={
        D ? (
          <>
            {boleh('kembalikan_rencana') || boleh('kembalikan') ? (
              <Button variant="outline" onClick={() => setDialog(boleh('kembalikan_rencana') ? 'kembalikan_rencana' : 'kembalikan')}>
                <Undo2 /> Kembalikan
              </Button>
            ) : null}
            {boleh('setujui_rencana') ? (
              <Button onClick={() => setDialog('setujui_rencana')}>
                <BadgeCheck /> Setujui rencana
              </Button>
            ) : null}
            {menilai ? (
              <Button onClick={() => setDialog('nilai')}>
                <Send /> Simpan penilaian
              </Button>
            ) : null}
            {boleh('sahkan') ? (
              <Button onClick={() => setDialog('sahkan')}>
                <FileCheck2 /> Sahkan
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
            <p className="u-bkd-keterangan">{D.aturan ? `${D.aturan.nama} v${D.aturan.versi}${D.aturan.terkunci ? ' (terkunci)' : ''}` : ''}</p>
            <LencanaTahapSkp d={D} />
          </div>
          {D.nilai_akhir != null ? (
            <StatGrid>
              <StatCard label="Nilai akhir" value={angka(D.nilai_akhir)} />
              <StatCard label="Predikat" value={namaPredikat(isi, D.predikat)} />
              <StatCard label="Kesimpulan" value={D.kesimpulan === 'memenuhi' ? 'Memenuhi' : D.kesimpulan === 'tidak_memenuhi' ? 'Tidak memenuhi' : '-'} />
            </StatGrid>
          ) : null}
          {D.catatan_pegawai ? <Alert variant="neutral" title="Catatan pegawai">{D.catatan_pegawai}</Alert> : null}
          <DataTable<ItemSkp>
            rows={D.item}
            rowKey={(i) => String(i.id)}
            pagination={false}
            columnToggle={false}
            densityToggle={false}
            columns={[
              { key: 'rencana', header: 'Rencana hasil kerja', mobile: 'title', cell: (i) => <span className="u-dupak-sel"><strong>{i.rencana}</strong><small>{i.jenis} · {i.indikator} · {isi?.hasil_kerja.aspek.find((a) => a.kode === i.aspek)?.nama ?? i.aspek}</small></span> },
              { key: 'target', header: 'Target', align: 'end', cell: (i) => `${angka(i.target)} ${i.satuan ?? ''}` },
              { key: 'realisasi', header: 'Realisasi', align: 'end', cell: (i) => (i.realisasi == null ? '-' : `${angka(i.realisasi)} ${i.satuan ?? ''}`) },
              {
                key: 'capaian',
                header: 'Capaian',
                align: 'end',
                cell: (i) => (menilai ? <IsianAngka aria-label={`Capaian ${i.rencana}`} className="u-dupak-isian-ak" value={i.id in capaian ? capaian[i.id] : (i.capaian ?? i.capaian_hitung)} onChange={(v) => setCapaian({ ...capaian, [i.id]: v })} /> : angka(i.capaian ?? i.capaian_hitung, '%')),
              },
              {
                key: 'file',
                header: 'Bukti',
                shrink: true,
                cell: (i) =>
                  i.file.length ? (
                    <span className="u-dupak-bukti">
                      {i.file.map((f) => (
                        <a key={f.uuid} href={`/bff/api${f.url ?? `/v1/sdm/file/${f.uuid}`}?inline=1`} target="_blank" rel="noopener noreferrer">
                          <Paperclip aria-hidden /> {f.nama.length > 16 ? `${f.nama.slice(0, 14)}…` : f.nama}
                        </a>
                      ))}
                    </span>
                  ) : (
                    '-'
                  ),
              },
            ]}
          />
          {menilai && isi ? (
            <Card>
              <CardHeader title="Penilaian" description={`Nilai = ${angka(isi.rumus.bobot_hasil, '%')} rata-rata capaian + ${angka(isi.rumus.bobot_perilaku, '%')} rata-rata perilaku kerja (komponen ${D.aturan?.nama} v${D.aturan?.versi}).`} />
              <CardContent className="u-bkd-form">
                {isi.perilaku.map((p) => (
                  <div key={p.kode} className="u-skp-nilai">
                    <span className="u-dupak-sel">
                      <strong>{p.nama}</strong>
                      {p.uraian ? <small>{p.uraian}</small> : null}
                    </span>
                    <IsianAngka aria-label={`Nilai ${p.nama}`} value={nilaiPerilaku(p.kode)} onChange={(v) => setPerilaku({ ...perilaku, [p.kode]: v })} />
                  </div>
                ))}
                {pratinjau ? (
                  <Alert variant="info" title={`Perkiraan: nilai ${angka(pratinjau.akhir)} · ${namaPredikat(isi, pratinjau.pred)}`}>
                    Hasil kerja {angka(pratinjau.hasil)}
                    {isi.perilaku.length ? `, perilaku ${angka(pratinjau.np)}` : ''}. Predikat dihitung server saat disimpan.
                  </Alert>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
          <AlurPemeriksa pemeriksa={D.pemeriksa} />
          <h4 className="u-bkd-label">Riwayat</h4>
          <LinimasaPengajuan langkah={D.linimasa} />
        </div>
      )}
      <ConfirmDialog
        open={dialog === 'setujui_rencana' || dialog === 'sahkan' || dialog === 'nilai'}
        onOpenChange={(o) => !o && setDialog(null)}
        tone="primary"
        title={dialog === 'setujui_rencana' ? 'Setujui rencana SKP?' : dialog === 'sahkan' ? 'Sahkan SKP ini?' : 'Simpan penilaian SKP?'}
        description={dialog === 'setujui_rencana' ? 'Pegawai lalu mengisi realisasi dan bukti di akhir periode.' : dialog === 'sahkan' ? 'Predikat yang disahkan dipakai syarat kinerja kenaikan pangkat.' : 'Nilai akhir dan predikat dihitung dari rumus komponen SKP yang dikunci.'}
        confirmLabel={dialog === 'setujui_rencana' ? 'Setujui' : dialog === 'sahkan' ? 'Sahkan' : 'Simpan penilaian'}
        onConfirm={async () => {
          if (dialog === 'nilai') {
            await kirim('nilai', { item: Object.entries(capaian).map(([iid, c]) => ({ id: Number(iid), capaian: c })), perilaku: Object.fromEntries((isi?.perilaku ?? []).map((p) => [p.kode, nilaiPerilaku(p.kode)])), catatan: catatan.trim() || null }, 'SKP dinilai.');
          } else if (dialog) {
            await kirim(dialog, { catatan: catatan.trim() || null }, dialog === 'sahkan' ? 'SKP disahkan.' : 'Rencana disetujui.');
          }
        }}
      >
        <Field label="Catatan" optional>
          <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        </Field>
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === 'kembalikan_rencana' || dialog === 'kembalikan'}
        onOpenChange={(o) => !o && setDialog(null)}
        tone="warning"
        title="Kembalikan ke pegawai?"
        confirmLabel="Kembalikan"
        onConfirm={async () => {
          if (dialog) await kirim(dialog, { catatan: catatan.trim() || null }, 'Dikembalikan ke pegawai.');
        }}
      >
        <Field label="Yang perlu diperbaiki" required>
          <Textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        </Field>
      </ConfirmDialog>
    </Sheet>
  );
}

/** Antrean SKP atasan/Biro SDM: rencana menunggu persetujuan, realisasi menunggu penilaian, menunggu pengesahan. */
export function AntreanSkp({ className }: { className?: string }) {
  const [tab, setTab] = React.useState<'antrean' | 'semua'>('antrean');
  const daftar = useSiakadQuery<SkpRow[]>(['skp', 'daftar', tab], q('/v1/sdm/skp', { sebagai: tab }));
  const [buka, setBuka] = React.useState<number | null>(null);
  const tabel = (
    <DataTable<SkpRow>
      rows={daftar.data}
      rowKey={(r) => String(r.id)}
      loading={daftar.loading}
      error={daftar.error}
      onRetry={daftar.refetch}
      onRowClick={(r) => setBuka(r.id)}
      columnToggle={false}
      densityToggle={false}
      columns={[
        { key: 'pegawai_nama', header: 'Pegawai', mobile: 'title' },
        { key: 'periode', header: 'Periode' },
        { key: 'nilai', header: 'Nilai', align: 'end', cell: (r) => angka(r.nilai_akhir) },
        { key: 'tahap', header: 'Tahap', shrink: true, mobile: 'badge', cell: (r) => <LencanaTahapSkp d={r} /> },
      ]}
      empty={{ title: tab === 'antrean' ? 'Tidak ada SKP yang menunggu Anda' : 'Belum ada SKP' }}
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
          { value: 'semua', label: 'Semua SKP', content: tabel },
        ]}
      />
      {buka !== null ? <PanelSkp id={buka} onOpenChange={(o) => !o && setBuka(null)} /> : null}
    </div>
  );
}
