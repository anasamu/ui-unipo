'use client';
import * as React from 'react';
import { AlertTriangle, BookOpenText, CircleAlert, FilePlus2, Plus, Scale, ShieldAlert, Timer } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Empty } from '../components/display';
import { StatCard, StatGrid } from '../components/charts';
import { DataTable } from '../components/data-table';
import { Checkbox, Field, Input, Textarea } from '../components/forms';
import { Select } from '../components/select';
import { Sheet } from '../components/overlays';
import { IsianTanggal } from '../components/formulir';
import { PanelLangkah } from '../components/panel-langkah';
import { WizardReview } from '../components/wizard';
import { pesanGalat } from './provider';
import { PilihUnit } from './pilih-unit';
import {
  LABEL_LINGKUP_PEDOMAN,
  LencanaStatusPedoman,
  tanggalPedoman,
  useAksiPedoman,
  useHakPedoman,
  usePedoman,
  type DokumenPedomanRow,
  type JenisPedoman,
  type KatalogPedoman,
  type LingkupPedoman,
  type TahapAlurPedoman,
  type VersiPedoman,
} from './pedoman';

/*
 * Pengelolaan pedoman di SPMI (dan Fakultas untuk pedoman fakultasnya):
 *   DaftarPedoman            daftar per jenis: status, versi berlaku, versi terakhir; "Susun pedoman" (langkah)
 *   KepatuhanPedoman         dasbor SPMI: aturan menyimpang, tanpa dasar pedoman, deviasi (telaah/putus), hampir habis
 *   KatalogParameterPedoman  katalog parameter (kunci -> unit pemilik -> target aturan, batas timpa fakultas)
 *   JenisDokumenPedoman      jenis dokumen sebagai data (unit pemilik/peninjau, alur pengesahan per lingkup, ketegasan)
 */

// ------------------------------------------------------------------ DaftarPedoman

export interface DaftarPedomanProps {
  /** Batasi ke lingkup/fakultas (aplikasi Fakultas: kode fakultas 01, 02, ...). */
  lingkup?: LingkupPedoman;
  fakultas?: string;
  /** induk_unit.id bawaan saat menyusun (fakultas). */
  unitBawaan?: number | null;
  onBuka: (versiId: number) => void;
  className?: string;
}

export function DaftarPedoman({ lingkup, fakultas, unitBawaan, onBuka, className }: DaftarPedomanProps) {
  const [jenis, setJenis] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [cari, setCari] = React.useState('');
  const hak = useHakPedoman();
  const jenisQ = usePedoman<JenisPedoman[]>(['jenis'], '/v1/pedoman/jenis');
  const q = usePedoman<DokumenPedomanRow[]>(['dokumen', lingkup, fakultas, jenis, status, cari], '/v1/pedoman/dokumen', {
    ...(lingkup ? { lingkup } : {}),
    ...(fakultas ? { fakultas } : {}),
    ...(jenis ? { jenis } : {}),
    ...(status ? { status } : {}),
    ...(cari.trim().length >= 2 ? { q: cari.trim() } : {}),
  });
  const [susun, setSusun] = React.useState(false);
  return (
    <div className={cn('u-pdm-daftar', className)}>
      <div className="u-pdm-saring">
        <Field label="Jenis">
          <Select options={[{ value: '', label: 'Semua jenis' }, ...(jenisQ.data ?? []).map((j) => ({ value: j.kode, label: j.nama, group: j.kelompok ?? undefined }))]} value={jenis ?? ''} onValueChange={(x) => setJenis(x || null)} placeholder="Pilih…" />
        </Field>
        <Field label="Status">
          <Select
            options={[{ value: '', label: 'Semua status' }, { value: 'berlaku', label: 'Ada versi berlaku' }, { value: 'draf', label: 'Draf' }, { value: 'ditinjau', label: 'Ditinjau' }, { value: 'disetujui', label: 'Menunggu SK' }]}
            value={status ?? ''}
            onValueChange={(x) => setStatus(x || null)}
            placeholder="Pilih…"
          />
        </Field>
        <Field label="Cari">
          <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari judul atau kode…" />
        </Field>
        {(hak.data?.susun || hak.data?.admin || unitBawaan || fakultas) && (
          <Button onClick={() => setSusun(true)}>
            <FilePlus2 /> Susun pedoman
          </Button>
        )}
      </div>
      <DataTable<DokumenPedomanRow>
        rows={q.data ?? []}
        loading={q.loading && !q.data}
        error={q.error ? pesanGalat(q.error) : undefined}
        rowKey={(r) => String(r.id)}
        onRowClick={(r) => {
          const id = r.versi_terakhir?.id ?? r.versi_berlaku?.id;
          if (id) onBuka(id);
        }}
        columns={[
          {
            key: 'judul',
            header: 'Pedoman/peraturan',
            cell: (r) => (
              <div className="u-pdm-sel">
                <strong>{r.judul}</strong>
                <span className="u-pdm-redup">
                  {r.kode} · {r.jenis.nama}
                </span>
              </div>
            ),
          },
          { key: 'lingkup', header: 'Lingkup', cell: (r) => `${LABEL_LINGKUP_PEDOMAN[r.lingkup]}${r.unit_nama ? ' · ' + r.unit_nama : ''}` },
          {
            key: 'berlaku',
            header: 'Versi berlaku',
            cell: (r) =>
              r.versi_berlaku ? (
                <div className="u-pdm-sel">
                  <span>
                    v{r.versi_berlaku.versi} <LencanaStatusPedoman status="berlaku" />
                  </span>
                  <span className="u-pdm-redup">
                    {r.versi_berlaku.sk_nomor ? `SK ${r.versi_berlaku.sk_nomor} · ` : ''}
                    {tanggalPedoman(r.versi_berlaku.berlaku_mulai)}
                  </span>
                </div>
              ) : (
                <span className="u-pdm-redup">Belum ada</span>
              ),
          },
          {
            key: 'terakhir',
            header: 'Versi terakhir',
            cell: (r) => (r.versi_terakhir && r.versi_terakhir.status !== 'berlaku' ? <span>v{r.versi_terakhir.versi} <LencanaStatusPedoman status={r.versi_terakhir.status} /></span> : <span className="u-pdm-redup">-</span>),
          },
        ]}
      />
      {!q.loading && (q.data ?? []).length === 0 ? <Empty icon={<BookOpenText />} title="Belum ada pedoman" description="Susun pedoman pertama: struktur bab, pasal, ayat, dan parameter yang dibaca sistem." bordered /> : null}
      {susun && <PanelSusunPedoman lingkupTetap={lingkup} unitBawaan={unitBawaan ?? null} fakultas={fakultas} onOpenChange={setSusun} onSelesai={onBuka} />}
    </div>
  );
}

function PanelSusunPedoman({ lingkupTetap, unitBawaan, fakultas, onOpenChange, onSelesai }: { lingkupTetap?: LingkupPedoman; unitBawaan: number | null; fakultas?: string; onOpenChange: (o: boolean) => void; onSelesai: (versiId: number) => void }) {
  const jenisQ = usePedoman<JenisPedoman[]>(['jenis'], '/v1/pedoman/jenis');
  const kirim = useAksiPedoman();
  const [step, setStep] = React.useState(0);
  const [f, setF] = React.useState<{ jenis_id: number | null; lingkup: LingkupPedoman; unit_id: number | null; judul: string; kode: string; salin_dari_versi_id: number | null }>({
    jenis_id: null,
    lingkup: lingkupTetap ?? 'universitas',
    unit_id: unitBawaan,
    judul: '',
    kode: '',
    salin_dari_versi_id: null,
  });
  const jenis = (jenisQ.data ?? []).find((j) => j.id === f.jenis_id) ?? null;
  const sumber = usePedoman<DokumenPedomanRow[]>(['dokumen', 'sumber', f.jenis_id], f.jenis_id ? '/v1/pedoman/dokumen' : null, { jenis_id: f.jenis_id });
  const [hasil, setHasil] = React.useState<number | null>(null);
  return (
    <PanelLangkah
      open
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o && hasil) onSelesai(hasil);
      }}
      title="Susun pedoman/peraturan"
      description="Dokumen dibuat sebagai draf versi 1 dengan kerangka Ketentuan Umum; susun bab, pasal, ayat, dan parameter di ruang kerja."
      step={step}
      onStepChange={setStep}
      finishLabel="Buat draf"
      steps={[
        {
          id: 'jenis',
          title: 'Jenis & lingkup',
          validate: () => (!jenis ? 'Pilih jenis dokumen.' : !jenis.lingkup.includes(f.lingkup) ? `Jenis ini hanya untuk lingkup ${jenis.lingkup.join(', ')}.` : f.lingkup !== 'universitas' && !f.unit_id && !(fakultas && f.lingkup === 'fakultas') ? 'Pilih unit pemilik.' : null),
          content: (
            <div className="u-pdm-form">
              <Field label="Jenis dokumen" required description={jenis ? `${jenis.keterangan ?? ''} Pemilik isi ${jenis.unit_pemilik ?? '-'}; peninjau ${jenis.unit_peninjau.join(', ') || '-'}.` : 'Jenis baru ditambah di tab Jenis dokumen (tanpa kode).'}>
                <Select
                  options={(jenisQ.data ?? []).map((j) => ({ value: String(j.id), label: j.nama, group: j.kelompok ?? undefined, description: j.lingkup.map((l) => LABEL_LINGKUP_PEDOMAN[l]).join(', ') }))}
                  value={f.jenis_id ? String(f.jenis_id) : null}
                  onValueChange={(x) => setF({ ...f, jenis_id: x ? Number(x) : null })}
                  placeholder="Pilih…"
                />
              </Field>
              {!lingkupTetap && (
                <Field label="Lingkup" required>
                  <Select
                    options={(jenis?.lingkup ?? ['universitas', 'fakultas', 'prodi', 'unit']).map((l) => ({ value: l, label: LABEL_LINGKUP_PEDOMAN[l as LingkupPedoman] }))}
                    value={f.lingkup}
                    onValueChange={(x) => setF({ ...f, lingkup: (x ?? 'universitas') as LingkupPedoman, unit_id: x === 'universitas' ? null : f.unit_id })}
                    placeholder="Pilih…"
                  />
                </Field>
              )}
              {f.lingkup !== 'universitas' && !unitBawaan && !(fakultas && f.lingkup === 'fakultas') && (
                <Field label={f.lingkup === 'fakultas' ? 'Fakultas' : f.lingkup === 'prodi' ? 'Program studi' : 'Unit'} required>
                  <PilihUnit
                    jenis={f.lingkup === 'fakultas' ? ['fakultas'] : f.lingkup === 'prodi' ? ['prodi'] : undefined}
                    value={f.unit_id ?? undefined}
                    onValueChange={(x: unknown) => setF({ ...f, unit_id: typeof x === 'number' ? x : x == null ? null : Number(x) })}
                    placeholder="Pilih unit…"
                  />
                </Field>
              )}
            </div>
          ),
        },
        {
          id: 'identitas',
          title: 'Identitas',
          validate: () => (f.judul.trim().length < 5 ? 'Judul minimal 5 karakter.' : null),
          content: (
            <div className="u-pdm-form">
              <Field label="Judul" required>
                <Input value={f.judul} onChange={(e) => setF({ ...f, judul: e.target.value })} placeholder="Mis. Pedoman Akademik Universitas Pohuwato 2026" />
              </Field>
              <Field label="Kode" optional description="Kosong = dibuat otomatis dari jenis, unit, dan tahun.">
                <Input value={f.kode} onChange={(e) => setF({ ...f, kode: e.target.value.toUpperCase() })} placeholder="Mis. PDM-AKADEMIK-2026" />
              </Field>
              <Field label="Salin isi dari" optional description="Pakai pedoman yang sudah ada sebagai kerangka (mis. pedoman universitas untuk pedoman fakultas).">
                <Select
                  options={[{ value: '', label: 'Tidak menyalin (kerangka kosong)' }, ...(sumber.data ?? []).filter((d) => d.versi_berlaku || d.versi_terakhir).map((d) => ({ value: String(d.versi_berlaku?.id ?? d.versi_terakhir?.id), label: `${d.judul} v${d.versi_berlaku?.versi ?? d.versi_terakhir?.versi}` }))]}
                  value={f.salin_dari_versi_id ? String(f.salin_dari_versi_id) : ''}
                  onValueChange={(x) => setF({ ...f, salin_dari_versi_id: x ? Number(x) : null })}
                  placeholder="Pilih…"
                />
              </Field>
            </div>
          ),
        },
        {
          id: 'periksa',
          title: 'Periksa',
          content: (
            <WizardReview
              sections={[
                { title: 'Jenis', items: [{ label: 'Jenis', value: jenis?.nama }, { label: 'Lingkup', value: LABEL_LINGKUP_PEDOMAN[f.lingkup] }], onEdit: () => setStep(0) },
                { title: 'Identitas', items: [{ label: 'Judul', value: f.judul }, { label: 'Kode', value: f.kode || 'otomatis' }], onEdit: () => setStep(1) },
                { title: 'Alur pengesahan', items: (jenis?.alur[f.lingkup] ?? []).map((t: TahapAlurPedoman, i: number) => ({ label: `${i + 1}. ${t.judul}`, value: t.unit === 'peninjau' ? jenis?.unit_peninjau.join(', ') : t.unit })) },
              ]}
            />
          ),
        },
      ]}
      onFinish={async () => {
        try {
          const v = await kirim<VersiPedoman>('POST', '/v1/pedoman/dokumen', { ...f, kode: f.kode || null, ...(fakultas ? { fakultas } : {}) }, 'Draf pedoman dibuat', true);
          setHasil(v.id);
          onSelesai(v.id);
          return undefined;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

// ------------------------------------------------------------------ KepatuhanPedoman

interface Deviasi {
  id: number;
  jenis: 'menyimpang' | 'darurat';
  target_jenis: string;
  target_ref: string;
  target_label: string;
  kunci: string;
  nama: string;
  teks_aturan: string;
  teks_pedoman: string;
  dasar: string | null;
  lingkup: string;
  alasan: string | null;
  status: 'diajukan' | 'ditelaah' | 'disetujui' | 'ditolak' | 'kedaluwarsa' | 'selesai' | 'dicabut';
  tindak: 'sementara' | 'revisi' | null;
  sampai: string | null;
  catatan_telaah: string | null;
  catatan_putusan: string | null;
  catatan_berakhir: string | null;
  boleh_telaah: boolean;
  boleh_putus: boolean;
}

interface Kepatuhan {
  ringkas: { menyimpang: number; tanpa_dasar: number; deviasi_menunggu: number; deviasi_aktif: number; hampir_habis: number; penerapan_tertunda: number };
  menyimpang: Array<{ kunci: string; nama: string; target_jenis: string; target_ref: string; target_label: string; unit_pemilik: string | null; teks_aturan: string; teks_pedoman: string; dasar: string; ketegasan: string; batas_universitas?: boolean; konflik_induk?: { dasar: string; teks: string } | null; deviasi: { id: number; jenis: string; tindak: string | null; sampai: string | null } | null; penerapan: { id: number; status: string } | null }>;
  tanpa_dasar: Array<{ target_jenis: string; target_ref: string; kode: string; nama: string; kategori: string; tingkat: string; ada_sk: boolean; bawaan: boolean; terpetakan: boolean }>;
  deviasi: Deviasi[];
  hampir_habis: Deviasi[];
}

const STATUS_DEVIASI: Record<Deviasi['status'], [string, React.ComponentProps<typeof Badge>['variant']]> = {
  diajukan: ['Menunggu telaah SPMI', 'warning'],
  ditelaah: ['Menunggu putusan pejabat', 'info'],
  disetujui: ['Disetujui', 'success'],
  ditolak: ['Ditolak', 'danger'],
  kedaluwarsa: ['Kedaluwarsa', 'neutral'],
  selesai: ['Selesai', 'neutral'],
  dicabut: ['Dicabut', 'neutral'],
};

/** Dasbor kepatuhan SPMI: aturan menyimpang, deviasi (telaah/putus), aturan tanpa dasar pedoman, hampir habis. */
export function KepatuhanPedoman({ className }: { className?: string }) {
  const q = usePedoman<Kepatuhan>(['kepatuhan'], '/v1/pedoman/kepatuhan');
  const [panel, setPanel] = React.useState<{ d: Deviasi; aksi: 'telaah' | 'putus' } | null>(null);
  const [saringTanpa, setSaringTanpa] = React.useState<string | null>(null);
  if (q.loading && !q.data) return <Skeleton style={{ height: 320 }} />;
  if (q.error || !q.data)
    return (
      <Alert variant="danger" title="Gagal memuat kepatuhan">
        {q.error ? pesanGalat(q.error) : null}
      </Alert>
    );
  const k = q.data;
  const kategori = Array.from(new Set(k.tanpa_dasar.map((t) => t.kategori)));
  return (
    <div className={cn('u-pdm-kepatuhan', className)}>
      <StatGrid min={170}>
        <StatCard label="Aturan berbeda dari pedoman" value={k.ringkas.menyimpang} icon={<CircleAlert />} />
        <StatCard label="Deviasi menunggu" value={k.ringkas.deviasi_menunggu} icon={<ShieldAlert />} />
        <StatCard label="Deviasi aktif" value={k.ringkas.deviasi_aktif} icon={<Scale />} />
        <StatCard label="Hampir habis (14 hari)" value={k.ringkas.hampir_habis} icon={<Timer />} />
        <StatCard label="Belum diatur pedoman" value={k.ringkas.tanpa_dasar} icon={<BookOpenText />} />
        <StatCard label="Usulan penerapan tertunda" value={k.ringkas.penerapan_tertunda} icon={<AlertTriangle />} />
      </StatGrid>

      <section className="u-pdm-bagian">
        <h3>Deviasi aturan terhadap pedoman</h3>
        <p className="u-pdm-redup">Aturan yang bertentangan dengan pedoman berlaku tidak berlaku sebelum disetujui: telaah SPMI, lalu pejabat penetap pedoman memilih deviasi sementara (berhenti otomatis) atau revisi pedoman.</p>
        {k.deviasi.length === 0 ? <Empty title="Tidak ada deviasi berjalan" bordered /> : null}
        <ul className="u-pdm-daftar-usulan">
          {k.deviasi.map((d) => {
            const [l, v] = STATUS_DEVIASI[d.status];
            return (
              <li key={d.id} className="u-pdm-usulan-item">
                <span className="u-pdm-centang-kosong" />
                <div className="u-pdm-usulan-isi">
                  <div className="u-pdm-usulan-judul">
                    <strong>{d.nama}</strong> <Badge variant={v}>{l}</Badge> {d.jenis === 'darurat' ? <Badge variant="danger">Jalur darurat</Badge> : null}
                    {d.tindak ? <Badge variant="outline">{d.tindak === 'sementara' ? `Sementara s.d. ${tanggalPedoman(d.sampai)}` : 'Revisi pedoman'}</Badge> : null}
                  </div>
                  <div className="u-pdm-redup">{d.target_label}</div>
                  <div className="u-pdm-banding">
                    <div>
                      <span className="u-pdm-label">Aturan</span>
                      <span className="u-pdm-nilai-lama">{d.teks_aturan}</span>
                    </div>
                    <div>
                      <span className="u-pdm-label">Pedoman ({d.dasar})</span>
                      <span className="u-pdm-nilai-baru">{d.teks_pedoman}</span>
                    </div>
                  </div>
                  {d.alasan ? <div className="u-pdm-redup">Alasan: {d.alasan}</div> : null}
                  {d.catatan_telaah ? <div className="u-pdm-redup">Telaah SPMI: {d.catatan_telaah}</div> : null}
                  {d.catatan_putusan ? <div className="u-pdm-redup">Putusan: {d.catatan_putusan}</div> : null}
                </div>
                <div className="u-pdm-aksi">
                  {d.boleh_telaah && (
                    <Button size="sm" variant="outline" onClick={() => setPanel({ d, aksi: 'telaah' })}>
                      Telaah
                    </Button>
                  )}
                  {d.boleh_putus && (
                    <Button size="sm" onClick={() => setPanel({ d, aksi: 'putus' })}>
                      {d.jenis === 'darurat' && d.status === 'disetujui' ? 'Sahkan/cabut' : 'Putuskan'}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="u-pdm-bagian">
        <h3>Aturan berbeda dari pedoman</h3>
        <DataTable
          rows={k.menyimpang}
          rowKey={(r) => r.kunci + r.target_ref}
          columns={[
            { key: 'nama', header: 'Parameter', cell: (r) => <div className="u-pdm-sel"><strong>{r.nama}</strong><span className="u-pdm-redup">{r.target_label}</span></div> },
            { key: 'nilai', header: 'Aturan → pedoman', cell: (r) => <span>{r.teks_aturan} → <strong>{r.teks_pedoman}</strong></span> },
            {
              key: 'dasar',
              header: 'Dasar',
              cell: (r) => (
                <div className="u-pdm-sel">
                  <span>{r.dasar}</span>
                  {r.konflik_induk ? (
                    <Badge variant="danger">Pedoman fakultas lebih longgar dari {r.konflik_induk.dasar} ({r.konflik_induk.teks})</Badge>
                  ) : r.batas_universitas ? (
                    <Badge variant="warning">Batas universitas</Badge>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'tindak',
              header: 'Tindak lanjut',
              cell: (r) =>
                r.deviasi ? <Badge variant="warning">Deviasi {r.deviasi.tindak ?? ''}</Badge> : r.penerapan ? <Badge variant="info">Penerapan {r.penerapan.status}</Badge> : <Badge variant={r.ketegasan === 'ketat' ? 'danger' : 'neutral'}>{r.ketegasan === 'ketat' ? 'Perlu tindak lanjut' : 'Penanda saja'}</Badge>,
            },
          ]}
        />
        {k.menyimpang.length === 0 ? <p className="u-pdm-redup">Semua aturan yang diatur pedoman sesuai dengan pedoman berlaku.</p> : null}
      </section>

      <section className="u-pdm-bagian">
        <h3>Belum diatur pedoman (usulan revisi pedoman)</h3>
        <p className="u-pdm-redup">Aturan aktif yang berlaku atas dasar SK unit tanpa pasal pedoman. Aturan bawaan tetap berlaku; masukkan ke revisi pedoman yang sesuai.</p>
        <Field label="Kategori">
          <Select options={[{ value: '', label: 'Semua kategori' }, ...kategori.map((x) => ({ value: x, label: x }))]} value={saringTanpa ?? ''} onValueChange={(x) => setSaringTanpa(x || null)} placeholder="Pilih…" />
        </Field>
        <DataTable
          rows={k.tanpa_dasar.filter((t) => !saringTanpa || t.kategori === saringTanpa)}
          rowKey={(r) => r.target_jenis + r.target_ref}
          pagination
          columns={[
            { key: 'nama', header: 'Aturan', cell: (r) => <div className="u-pdm-sel"><strong>{r.nama}</strong><span className="u-pdm-redup">{r.kode}</span></div> },
            { key: 'kategori', header: 'Kategori', cell: (r) => `${r.kategori}${r.tingkat !== 'universitas' ? ' · ' + r.tingkat : ''}` },
            { key: 'sk', header: 'SK', cell: (r) => (r.ada_sk ? <Badge variant="success">Ber-SK</Badge> : <Badge variant="warning">{r.bawaan ? 'Bawaan, lampirkan SK' : 'Tanpa SK'}</Badge>) },
            { key: 'katalog', header: 'Katalog', cell: (r) => (r.terpetakan ? <Badge variant="primary">Ada di katalog</Badge> : <Badge variant="neutral">Belum dipetakan</Badge>) },
          ]}
        />
      </section>
      {panel && <PanelDeviasi deviasi={panel.d} aksi={panel.aksi} onOpenChange={(o) => !o && setPanel(null)} />}
    </div>
  );
}

function PanelDeviasi({ deviasi: d, aksi, onOpenChange }: { deviasi: Deviasi; aksi: 'telaah' | 'putus'; onOpenChange: (o: boolean) => void }) {
  const kirim = useAksiPedoman();
  const [f, setF] = React.useState({ keputusan: aksi === 'telaah' ? 'lanjut' : 'setujui', tindak: 'sementara', sampai: '', catatan: '' });
  const [sibuk, setSibuk] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const simpan = async () => {
    setSibuk(true);
    try {
      await kirim('POST', `/v1/pedoman/deviasi/${d.id}/${aksi}`, f, 'Tersimpan', true);
      onOpenChange(false);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSibuk(false);
    }
  };
  return (
    <Sheet
      open
      onOpenChange={onOpenChange}
      size="md"
      title={aksi === 'telaah' ? 'Telaah deviasi (SPMI)' : 'Putusan deviasi'}
      description={`${d.nama}: aturan ${d.teks_aturan}, pedoman ${d.teks_pedoman}.`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button variant={f.keputusan === 'tolak' ? 'destructive' : 'primary'} loading={sibuk} onClick={() => void simpan()}>
            {f.keputusan === 'tolak' ? 'Tolak' : aksi === 'telaah' ? 'Teruskan ke pejabat' : 'Setujui'}
          </Button>
        </>
      }
    >
      <div className="u-pdm-form">
        <Field label="Keputusan" required>
          <Select
            options={aksi === 'telaah' ? [{ value: 'lanjut', label: 'Teruskan ke pejabat penetap' }, { value: 'tolak', label: 'Tolak (aturan tidak berlaku)' }] : [{ value: 'setujui', label: 'Setujui' }, { value: 'tolak', label: 'Tolak (aturan tidak berlaku/dikembalikan)' }]}
            value={f.keputusan}
            onValueChange={(x) => setF({ ...f, keputusan: x ?? f.keputusan })}
            placeholder="Pilih…"
          />
        </Field>
        {aksi === 'putus' && f.keputusan === 'setujui' && (
          <>
            <Field label="Tindak lanjut" required>
              <Select
                options={[
                  { value: 'sementara', label: 'Deviasi sementara', description: 'Berhenti otomatis pada tanggal akhir, kecuali pedoman sudah direvisi' },
                  { value: 'revisi', label: 'Buka revisi pedoman', description: 'Draf versi baru pedoman dibuat; deviasi berlaku sampai revisi berlaku' },
                ]}
                value={f.tindak}
                onValueChange={(x) => setF({ ...f, tindak: x ?? 'sementara' })}
                placeholder="Pilih…"
              />
            </Field>
            {f.tindak === 'sementara' && (
              <Field label="Berlaku sampai" required>
                <IsianTanggal value={f.sampai} onValueChange={(x) => setF({ ...f, sampai: x ?? '' })} />
              </Field>
            )}
          </>
        )}
        <Field label="Catatan" required={f.keputusan === 'tolak' || aksi === 'telaah'}>
          <Textarea rows={4} value={f.catatan} onChange={(e) => setF({ ...f, catatan: e.target.value })} />
        </Field>
        {d.alasan ? <Alert variant="neutral" title="Alasan pengaju">{d.alasan}</Alert> : null}
        {galat && (
          <Alert variant="danger" title="Belum berhasil">
            {galat}
          </Alert>
        )}
      </div>
    </Sheet>
  );
}

// ------------------------------------------------------------------ KatalogParameterPedoman

const TIMPA_LABEL: Record<KatalogPedoman['timpa'], string> = { tidak: 'Tidak boleh ditimpa', lebih_besar: 'Fakultas boleh ≥ (lebih ketat)', lebih_kecil: 'Fakultas boleh ≤ (lebih ketat)', bebas: 'Bebas' };

export function KatalogParameterPedoman({ className }: { className?: string }) {
  const q = usePedoman<KatalogPedoman[]>(['katalog', 'semua'], '/v1/pedoman/katalog', { semua: 1 });
  const hak = useHakPedoman();
  const [ubah, setUbah] = React.useState<KatalogPedoman | 'baru' | null>(null);
  const [cari, setCari] = React.useState('');
  const rows = (q.data ?? []).filter((k) => !cari || (k.kunci + k.nama).toLowerCase().includes(cari.toLowerCase()));
  return (
    <div className={cn('u-pdm-daftar', className)}>
      <div className="u-pdm-saring">
        <Field label="Cari">
          <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kunci atau nama…" />
        </Field>
        {hak.data?.admin && (
          <Button onClick={() => setUbah('baru')}>
            <Plus /> Tambah parameter
          </Button>
        )}
      </div>
      <DataTable<KatalogPedoman>
        rows={rows}
        loading={q.loading && !q.data}
        rowKey={(r) => String(r.id)}
        onRowClick={hak.data?.admin ? (r) => setUbah(r) : undefined}
        pagination
        columns={[
          { key: 'kunci', header: 'Kunci', cell: (r) => <div className="u-pdm-sel"><code>{r.kunci}</code><span className="u-pdm-redup">{r.nama}</span></div> },
          { key: 'tipe', header: 'Tipe', cell: (r) => `${r.tipe}${r.satuan ? ' · ' + r.satuan : ''}` },
          { key: 'unit', header: 'Unit pemilik', cell: (r) => r.unit_pemilik ?? '-' },
          {
            key: 'target',
            header: 'Target aturan',
            cell: (r) => (r.target ? <span className="u-pdm-redup">{r.target.jenis === 'mesin_aturan' ? r.target.kode : `aturan ${r.target.aturan_jenis}`} · {r.target.jalur}</span> : <Badge variant="neutral">Informatif</Badge>),
          },
          { key: 'timpa', header: 'Pedoman fakultas', cell: (r) => (r.lingkup === 'fakultas' ? <Badge variant="info">Aturan fakultas</Badge> : null) ?? TIMPA_LABEL[r.timpa] },
        ]}
      />
      {ubah && <PanelKatalog awal={ubah === 'baru' ? null : ubah} onOpenChange={(o) => !o && setUbah(null)} />}
    </div>
  );
}

function PanelKatalog({ awal, onOpenChange }: { awal: KatalogPedoman | null; onOpenChange: (o: boolean) => void }) {
  const kirim = useAksiPedoman();
  const [step, setStep] = React.useState(0);
  const [f, setF] = React.useState({
    kunci: awal?.kunci ?? '',
    nama: awal?.nama ?? '',
    keterangan: awal?.keterangan ?? '',
    kategori: awal?.kategori ?? '',
    tipe: awal?.tipe ?? 'angka',
    satuan: awal?.satuan ?? '',
    kolom: (awal?.opsi?.kolom ?? []).map((k) => `${k.kode}:${k.label}`).join('\n'),
    pilihan: (awal?.opsi?.pilihan ?? []).map((k) => `${k.value}:${k.label}`).join('\n'),
    unit_pemilik: awal?.unit_pemilik ?? '',
    target_jenis: awal?.target?.jenis ?? '',
    target_kode: awal?.target?.kode ?? awal?.target?.aturan_jenis ?? '',
    jalur: awal?.target?.jalur ?? '',
    lingkup: awal?.lingkup ?? 'universitas',
    timpa: awal?.timpa ?? 'tidak',
  });
  const opsi = () => {
    if (f.tipe === 'tabel') return { kolom: f.kolom.split('\n').filter(Boolean).map((b) => ({ kode: b.split(':')[0].trim(), label: (b.split(':')[1] ?? b).trim(), tipe: 'angka' })) };
    if (f.tipe === 'pilihan') return { pilihan: f.pilihan.split('\n').filter(Boolean).map((b) => ({ value: b.split(':')[0].trim(), label: (b.split(':')[1] ?? b).trim() })) };
    return null;
  };
  const target = () =>
    !f.target_jenis ? null : f.target_jenis === 'mesin_aturan' ? { ...(awal?.target ?? {}), jenis: 'mesin_aturan', kode: f.target_kode, jalur: f.jalur } : { ...(awal?.target ?? {}), jenis: 'aturan_versi', aturan_jenis: f.target_kode, jalur: f.jalur };
  return (
    <PanelLangkah
      open
      onOpenChange={onOpenChange}
      title={awal ? `Ubah ${awal.kunci}` : 'Tambah parameter katalog'}
      description="Kunci parameter yang dapat dipakai blok parameter pedoman. Tanpa target = informatif."
      mode={awal ? 'ubah' : 'buat'}
      step={step}
      onStepChange={setStep}
      steps={[
        {
          id: 'identitas',
          title: 'Identitas',
          validate: () => (!/^[a-z][a-z0-9_]*(\.[a-z0-9_]+){1,5}$/.test(f.kunci) ? 'Kunci: kelompok.nama huruf kecil (mis. akademik.sks_per_ips).' : !f.nama.trim() ? 'Isi nama.' : null),
          content: (
            <div className="u-pdm-form">
              <Field label="Kunci" required description="Huruf kecil, dipisah titik.">
                <Input value={f.kunci} onChange={(e) => setF({ ...f, kunci: e.target.value })} placeholder="Mis. keuangan.denda.persen_per_bulan" />
              </Field>
              <Field label="Nama" required>
                <Input value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} />
              </Field>
              <Field label="Kategori aturan" optional>
                <Select
                  options={['akademik', 'kelulusan', 'keuangan', 'kepegawaian', 'kemahasiswaan', 'penelitian', 'mutu', 'akun', 'pmb', 'umum'].map((x) => ({ value: x, label: x }))}
                  value={f.kategori || null}
                  onValueChange={(x) => setF({ ...f, kategori: x ?? '' })}
                  placeholder="Pilih…"
                />
              </Field>
              <Field label="Keterangan" optional>
                <Textarea rows={2} value={f.keterangan} onChange={(e) => setF({ ...f, keterangan: e.target.value })} />
              </Field>
            </div>
          ),
        },
        {
          id: 'tipe',
          title: 'Tipe nilai',
          content: (
            <div className="u-pdm-form">
              <Field label="Tipe" required>
                <Select
                  options={[
                    { value: 'angka', label: 'Angka' },
                    { value: 'rentang', label: 'Rentang (min–maks)' },
                    { value: 'pilihan', label: 'Pilihan' },
                    { value: 'bool', label: 'Ya/tidak' },
                    { value: 'teks', label: 'Teks' },
                    { value: 'tabel', label: 'Tabel baris' },
                  ]}
                  value={f.tipe}
                  onValueChange={(x) => setF({ ...f, tipe: (x ?? 'angka') as KatalogPedoman['tipe'] })}
                  placeholder="Pilih…"
                />
              </Field>
              <Field label="Satuan" optional>
                <Input value={f.satuan} onChange={(e) => setF({ ...f, satuan: e.target.value })} placeholder="Mis. SKS, %, hari" />
              </Field>
              {f.tipe === 'tabel' && (
                <Field label="Kolom tabel" required description="Satu baris per kolom: kode:Label">
                  <Textarea rows={3} value={f.kolom} onChange={(e) => setF({ ...f, kolom: e.target.value })} placeholder={'ips_min:IPS minimal\nsks_maks:SKS maksimal'} />
                </Field>
              )}
              {f.tipe === 'pilihan' && (
                <Field label="Pilihan" required description="Satu baris per pilihan: nilai:Label">
                  <Textarea rows={4} value={f.pilihan} onChange={(e) => setF({ ...f, pilihan: e.target.value })} />
                </Field>
              )}
            </div>
          ),
        },
        {
          id: 'target',
          title: 'Target aturan',
          description: 'Aturan yang menerima nilai saat pedoman berlaku (lewat usulan penerapan ke unit pemilik).',
          validate: () => (f.target_jenis && (!f.target_kode || !f.jalur) ? 'Lengkapi kode/jenis aturan dan jalur nilai.' : null),
          content: (
            <div className="u-pdm-form">
              <Field label="Unit pemilik aturan" optional description="Kode unit (BAAK, SDM, BAUK, PUSTIKOM, LP2M) atau FAKULTAS untuk aturan fakultas.">
                <Input value={f.unit_pemilik} onChange={(e) => setF({ ...f, unit_pemilik: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="Jenis target" optional>
                <Select
                  options={[{ value: '', label: 'Informatif (tanpa target)' }, { value: 'mesin_aturan', label: 'Mesin aturan (kode aturan)' }, { value: 'aturan_versi', label: 'Aturan berversi (BKD, karier, kurikulum)' }]}
                  value={f.target_jenis}
                  onValueChange={(x) => setF({ ...f, target_jenis: (x ?? '') as typeof f.target_jenis })}
                  placeholder="Pilih…"
                />
              </Field>
              {f.target_jenis && (
                <>
                  <Field label={f.target_jenis === 'mesin_aturan' ? 'Kode aturan' : 'Jenis aturan berversi'} required description={f.target_jenis === 'mesin_aturan' ? 'Boleh memakai {fakultas}, mis. FAK{fakultas}-PA.' : 'Mis. bkd, karier.'}>
                    <Input value={f.target_kode} onChange={(e) => setF({ ...f, target_kode: e.target.value })} />
                  </Field>
                  <Field label="Jalur nilai" required description="Mis. kondisi.semua[indikator=ipk].nilai atau batas.min_total.">
                    <Input value={f.jalur} onChange={(e) => setF({ ...f, jalur: e.target.value })} />
                  </Field>
                </>
              )}
              <Field label="Tingkat aturan">
                <Select options={[{ value: 'universitas', label: 'Universitas' }, { value: 'fakultas', label: 'Fakultas (aturan per fakultas)' }]} value={f.lingkup} onValueChange={(x) => setF({ ...f, lingkup: (x ?? 'universitas') as KatalogPedoman['lingkup'] })} placeholder="Pilih…" />
              </Field>
              <Field label="Pedoman fakultas/prodi" description="Apakah pedoman turunan boleh menetapkan nilai sendiri, dan dalam batas apa.">
                <Select options={(Object.keys(TIMPA_LABEL) as KatalogPedoman['timpa'][]).map((x) => ({ value: x, label: TIMPA_LABEL[x] }))} value={f.timpa} onValueChange={(x) => setF({ ...f, timpa: (x ?? 'tidak') as KatalogPedoman['timpa'] })} placeholder="Pilih…" />
              </Field>
            </div>
          ),
        },
      ]}
      onFinish={async () => {
        try {
          const body = { kunci: f.kunci, nama: f.nama, keterangan: f.keterangan || null, kategori: f.kategori || null, tipe: f.tipe, satuan: f.satuan || null, opsi: opsi(), unit_pemilik: f.unit_pemilik || null, target: target(), lingkup: f.lingkup, timpa: f.timpa };
          await kirim(awal ? 'PUT' : 'POST', awal ? `/v1/pedoman/katalog/${awal.id}` : '/v1/pedoman/katalog', body, 'Katalog disimpan', true);
          return undefined;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

// ------------------------------------------------------------------ JenisDokumenPedoman

export function JenisDokumenPedoman({ className }: { className?: string }) {
  const q = usePedoman<JenisPedoman[]>(['jenis', 'semua'], '/v1/pedoman/jenis', { semua: 1 });
  const hak = useHakPedoman();
  const [ubah, setUbah] = React.useState<JenisPedoman | 'baru' | null>(null);
  return (
    <div className={cn('u-pdm-daftar', className)}>
      <div className="u-pdm-saring">
        <p className="u-pdm-redup">Jenis dokumen adalah data: unit pemilik isi, unit peninjau, alur pengesahan per lingkup, akses baca, dan ketegasan terhadap aturan yang menyimpang.</p>
        {hak.data?.admin && (
          <Button onClick={() => setUbah('baru')}>
            <Plus /> Tambah jenis
          </Button>
        )}
      </div>
      <DataTable<JenisPedoman>
        rows={q.data ?? []}
        loading={q.loading && !q.data}
        rowKey={(r) => String(r.id)}
        onRowClick={hak.data?.admin ? (r) => setUbah(r) : undefined}
        columns={[
          { key: 'nama', header: 'Jenis', cell: (r) => <div className="u-pdm-sel"><strong>{r.nama}</strong><span className="u-pdm-redup">{r.keterangan}</span></div> },
          { key: 'unit', header: 'Pemilik / peninjau', cell: (r) => `${r.unit_pemilik ?? '-'} / ${r.unit_peninjau.join(', ') || '-'}` },
          { key: 'alur', header: 'Pengesah (universitas)', cell: (r) => (r.alur.universitas ?? []).filter((t) => t.jenis !== 'tinjau').map((t) => t.judul).join(' → ') },
          { key: 'lingkup', header: 'Lingkup', cell: (r) => r.lingkup.map((l) => LABEL_LINGKUP_PEDOMAN[l]).join(', ') },
          { key: 'tegas', header: 'Aturan menyimpang', cell: (r) => (r.ketegasan === 'ketat' ? <Badge variant="danger">Ketat</Badge> : <Badge variant="neutral">Longgar</Badge>) },
          { key: 'baca', header: 'Akses baca', cell: (r) => (r.akses_baca === 'publik' ? 'Publik' : 'Terbatas') },
          { key: 'n', header: 'Dokumen', align: 'end', cell: (r) => r.jumlah_dokumen ?? 0 },
        ]}
      />
      {ubah && <PanelJenis awal={ubah === 'baru' ? null : ubah} onOpenChange={(o) => !o && setUbah(null)} />}
    </div>
  );
}

function PanelJenis({ awal, onOpenChange }: { awal: JenisPedoman | null; onOpenChange: (o: boolean) => void }) {
  const kirim = useAksiPedoman();
  const [step, setStep] = React.useState(0);
  const [f, setF] = React.useState({
    kode: awal?.kode ?? '',
    nama: awal?.nama ?? '',
    kelompok: awal?.kelompok ?? '',
    keterangan: awal?.keterangan ?? '',
    lingkup: awal?.lingkup ?? (['universitas'] as LingkupPedoman[]),
    unit_pemilik: awal?.unit_pemilik ?? '',
    unit_peninjau: (awal?.unit_peninjau ?? []).join(', '),
    penyetuju: (awal?.alur.universitas ?? []).find((t) => t.jenis === 'setujui')?.unit ?? 'WR1',
    judul_setuju: (awal?.alur.universitas ?? []).find((t) => t.jenis === 'setujui')?.judul ?? 'Persetujuan Wakil Rektor I',
    akses_baca: awal?.akses_baca ?? 'terbatas',
    ketegasan: awal?.ketegasan ?? 'longgar',
    kategori_aturan: (awal?.kategori_aturan ?? []).join(', '),
  });
  const alur = () => {
    const dasar = awal?.alur ?? {};
    const univ = (dasar.universitas ?? [
      { kode: 'tinjau', judul: 'Tinjauan unit pemilik/terkait', jenis: 'tinjau', unit: 'peninjau', izin: 'pedoman.tinjau' },
      { kode: 'setujui', judul: '', jenis: 'setujui', unit: '', izin: 'pedoman.setujui' },
      { kode: 'sk', judul: 'Penetapan SK Rektor', jenis: 'sk', unit: 'REKTORAT', izin: 'pedoman.susun' },
    ]) as TahapAlurPedoman[];
    return { ...dasar, universitas: univ.map((t) => (t.jenis === 'setujui' ? { ...t, unit: f.penyetuju, judul: f.judul_setuju } : t)) };
  };
  return (
    <PanelLangkah
      open
      onOpenChange={onOpenChange}
      title={awal ? `Ubah jenis ${awal.nama}` : 'Tambah jenis dokumen'}
      mode={awal ? 'ubah' : 'buat'}
      step={step}
      onStepChange={setStep}
      steps={[
        {
          id: 'identitas',
          title: 'Identitas',
          validate: () => (!/^[a-z0-9_]{2,40}$/.test(f.kode) ? 'Kode: huruf kecil/angka/garis bawah.' : !f.nama.trim() ? 'Isi nama.' : f.lingkup.length === 0 ? 'Pilih minimal satu lingkup.' : null),
          content: (
            <div className="u-pdm-form">
              <Field label="Kode" required>
                <Input value={f.kode} onChange={(e) => setF({ ...f, kode: e.target.value })} disabled={!!awal} placeholder="Mis. kebijakan_ti" />
              </Field>
              <Field label="Nama" required>
                <Input value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} />
              </Field>
              <Field label="Kelompok" optional>
                <Input value={f.kelompok} onChange={(e) => setF({ ...f, kelompok: e.target.value })} placeholder="Mis. Akademik" />
              </Field>
              <Field label="Keterangan" optional>
                <Textarea rows={2} value={f.keterangan} onChange={(e) => setF({ ...f, keterangan: e.target.value })} />
              </Field>
              <Field label="Lingkup yang boleh" required>
                <div className="u-pdm-pilihan">
                  {(['universitas', 'fakultas', 'prodi', 'unit'] as LingkupPedoman[]).map((l) => (
                    <label key={l} className="u-pdm-centang">
                      <Checkbox checked={f.lingkup.includes(l)} onCheckedChange={(c) => setF({ ...f, lingkup: c ? [...f.lingkup, l] : f.lingkup.filter((x) => x !== l) })} /> {LABEL_LINGKUP_PEDOMAN[l]}
                    </label>
                  ))}
                </div>
              </Field>
            </div>
          ),
        },
        {
          id: 'alur',
          title: 'Unit & pengesahan',
          content: (
            <div className="u-pdm-form">
              <Field label="Unit pemilik isi" optional description="Kode unit, mis. BAAK.">
                <Input value={f.unit_pemilik} onChange={(e) => setF({ ...f, unit_pemilik: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="Unit peninjau" optional description="Kode unit dipisah koma, mis. BAAK, SDM.">
                <Input value={f.unit_peninjau} onChange={(e) => setF({ ...f, unit_peninjau: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="Pejabat penyetuju (pedoman universitas)" required>
                <Select
                  options={[
                    { value: 'WR1', label: 'Wakil Rektor I' },
                    { value: 'WR2', label: 'Wakil Rektor II' },
                    { value: 'WR3', label: 'Wakil Rektor III' },
                    { value: 'WR4', label: 'Wakil Rektor IV' },
                    { value: 'SENAT', label: 'Senat Universitas' },
                    { value: 'REKTORAT', label: 'Rektor' },
                  ]}
                  value={f.penyetuju}
                  onValueChange={(x) => setF({ ...f, penyetuju: x ?? 'WR1', judul_setuju: `Persetujuan ${({ WR1: 'Wakil Rektor I', WR2: 'Wakil Rektor II', WR3: 'Wakil Rektor III', WR4: 'Wakil Rektor IV', SENAT: 'Senat Universitas', REKTORAT: 'Rektor' } as Record<string, string>)[x ?? 'WR1']}` })}
                  placeholder="Pilih…"
                />
              </Field>
              <Alert variant="neutral" title="Pedoman fakultas/prodi">
                Keselarasan diperiksa SPMI/UPM, disetujui Dekan, ditetapkan SK Dekan (alur bawaan; dapat diubah lewat API jenis).
              </Alert>
            </div>
          ),
        },
        {
          id: 'kebijakan',
          title: 'Akses & ketegasan',
          content: (
            <div className="u-pdm-form">
              <Field label="Akses baca" required>
                <Select options={[{ value: 'publik', label: 'Publik (tanpa login)' }, { value: 'terbatas', label: 'Terbatas (pengguna masuk)' }]} value={f.akses_baca} onValueChange={(x) => setF({ ...f, akses_baca: (x ?? 'terbatas') as 'publik' | 'terbatas' })} placeholder="Pilih…" />
              </Field>
              <Field label="Aturan yang menyimpang dari pedoman jenis ini" required>
                <Select
                  options={[
                    { value: 'ketat', label: 'Ketat', description: 'Tidak berlaku sebelum deviasi disetujui' },
                    { value: 'longgar', label: 'Longgar', description: 'Boleh berlaku, cukup penanda "Berbeda dari pedoman"' },
                  ]}
                  value={f.ketegasan}
                  onValueChange={(x) => setF({ ...f, ketegasan: (x ?? 'longgar') as 'ketat' | 'longgar' })}
                  placeholder="Pilih…"
                />
              </Field>
              <Field label="Kategori aturan turunan" optional description="Kategori Mesin aturan yang diatur jenis ini, dipisah koma.">
                <Input value={f.kategori_aturan} onChange={(e) => setF({ ...f, kategori_aturan: e.target.value })} placeholder="Mis. akademik, kelulusan" />
              </Field>
            </div>
          ),
        },
      ]}
      onFinish={async () => {
        try {
          const split = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
          await kirim(awal ? 'PUT' : 'POST', awal ? `/v1/pedoman/jenis/${awal.id}` : '/v1/pedoman/jenis', {
            kode: f.kode, nama: f.nama, kelompok: f.kelompok || null, keterangan: f.keterangan || null, lingkup: f.lingkup, unit_pemilik: f.unit_pemilik || null,
            unit_peninjau: split(f.unit_peninjau), alur: alur(), akses_baca: f.akses_baca, ketegasan: f.ketegasan, kategori_aturan: split(f.kategori_aturan),
          }, 'Jenis disimpan', true);
          return undefined;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

