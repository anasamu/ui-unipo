'use client';
import * as React from 'react';
import { HardDrive, Plus, Scale, Trash2, UserRound, Users, X } from 'lucide-react';
import { formatBytes, formatDate, formatTime } from '../lib/format';
import { Select } from '../components/select';
import { Badge, Button, Spinner } from '../components/actions';
import { Alert, Empty } from '../components/display';
import { Field, SegmentedControl, Switch, Textarea, Input } from '../components/forms';
import { ConfirmDialog, Sheet } from '../components/overlays';
import { BarList, DonutChart, GroupedBarChart, LineChart, chartColor } from '../components/charts';
import { PanelLangkah } from '../components/panel-langkah';
import { BatangAlokasi, MeterKuota, SliderNilai, nadaKuota, type BagianAlokasi } from '../components/alokasi';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { PanelBatasUnggah, ringkasBatasUnggah, type NilaiBatasUnggah } from './batas-unggah';
import type { BatasUnggah } from './berkas';
import { teksKuotaKaki } from './drive-pohon';

/**
 * Aturan penyimpanan online (API /v1/penyimpanan, docs/PENYIMPANAN.md di siakad_unipo):
 *   PanelPenyimpananSaya     statistik pribadi, kuota dan asalnya, kebijakan yang berlaku, minta tambah kuota
 *   PanelPenyimpananPengguna rincian seorang pengguna untuk Pustikom/pengelola unit (metadata saja; tercatat di log)
 *   PanelPenyimpananUnit     kolam unit, alokasi vs pemakaian per kelompok, anggota teratas, tombol Bagi kuota unit
 *   BagiKuotaUnit            wizard panel samping: kolam → kelompok/peran → sub-unit → pengguna → tinjau (slider)
 *   KuotaBerkas              ringkasan kuota di sisi ManajerBerkas
 */

// ---------------------------------------------------------------- tipe

export interface SumberNilai {
  lingkup: string;
  kunci: string;
  label: string;
}
export interface KolamPenyimpanan {
  kode: string;
  nama: string;
  kolam_byte: number;
  terpakai_byte?: number;
  persen?: number;
}
export interface KebijakanPenyimpanan {
  kuota_byte: number | null;
  maks_berkas_byte: number | null;
  maks_jumlah: number | null;
  sampah_hari: number | null;
  bagi_publik: boolean;
  tautan_maks_hari: number | null;
  wajib_enkripsi: boolean;
  retensi_versi: number | null;
  ekstensi: string[];
  ekstensi_larang: string[];
  mime_larang: string[];
  sumber: Record<string, SumberNilai | null>;
  kolam: KolamPenyimpanan[];
  lapisan: SumberNilai[];
  unit_utama: string | null;
  unit_utama_nama: string | null;
}
export interface KomposisiPenyimpanan {
  kunci: string;
  byte: number;
  jumlah: number;
}
export interface PermintaanKuota {
  id: string;
  pemohon: string;
  pemohon_nama: string | null;
  lingkup: 'pengguna' | 'unit';
  sasaran: string;
  sasaran_nama: string | null;
  unit: string | null;
  unit_nama: string | null;
  tambah_byte: number;
  alasan: string;
  status: 'menunggu_unit' | 'menunggu_pustikom' | 'disetujui' | 'ditolak' | 'dibatalkan';
  unit_oleh: string | null;
  unit_catatan: string | null;
  pustikom_oleh: string | null;
  pustikom_catatan: string | null;
  kuota_lama: number | null;
  kuota_baru: number | null;
  created_at: string;
}
export interface RincianPenyimpanan {
  username: string;
  nama: string | null;
  unit_utama: string | null;
  unit_utama_nama: string | null;
  kelompok: string[];
  peran: string[];
  kuota_byte: number | null;
  kuota_sumber: SumberNilai | null;
  /**
   * pribadi = kuota pribadi diatur; kolam = tanpa kuota pribadi, dibatasi kolam unit; belum_diatur = tidak ada batas di
   * tingkat mana pun (Pustikom belum mengisi kebijakan). SIAKAD lama: tidak ada (diturunkan dari kuota_byte & batas).
   */
  kuota_status?: 'pribadi' | 'kolam' | 'belum_diatur';
  /** Tautan "Atur di Pustikom » Penyimpanan" (hanya untuk Pustikom). */
  atur_url?: string | null;
  sampah_hari?: number | null;
  terpakai_byte: number;
  jumlah_berkas: number;
  sisa_byte: number | null;
  persen: number | null;
  sampah_byte: number;
  sampah_jumlah: number;
  per_modul: KomposisiPenyimpanan[];
  per_jenis: KomposisiPenyimpanan[];
  kolam: KolamPenyimpanan[];
  terbesar: Array<{ id: string; nama: string; ukuran: number; modul: string; created_at: string }>;
  sampah: Array<{ id: string; nama: string; ukuran: number; modul: string; dihapus_at: string }>;
  tren: Array<{ bulan: string; byte: number }>;
  kebijakan: KebijakanPenyimpanan;
  dihitung_at: string | null;
  permintaan?: PermintaanKuota[];
  unit_kelolaan?: Array<{ kode: string; nama: string }>;
  pustikom?: boolean;
  aturan?: string[];
  pengecualian?: { kuota_byte: number | null } | null;
  /** Batas yang mengikat (kuota pribadi atau kolam unit, termasuk kolam induk); null = tanpa batas. SIAKAD lama: tidak ada. */
  batas?: BatasPenyimpanan | null;
}
/** Batas yang mengikat sebuah ruang (Kebijakan::batasTampil di SIAKAD). */
export interface BatasPenyimpanan {
  byte: number;
  terpakai_byte: number;
  sisa_byte: number;
  persen: number;
  sumber: string;
  kode: string | null;
  label: string;
}
export interface KelompokUnit {
  kelompok: string;
  label: string;
  mode: 'orang' | 'total';
  kuota_byte: number;
  anggota: number;
  total_byte: number;
  per_orang_byte: number;
}
export interface RingkasUnitPenyimpanan {
  kode: string;
  nama: string;
  singkatan: string | null;
  jenis: string;
  induk: string | null;
  kolam_byte: number | null;
  /** Kolam unit induk terdekat yang diwariskan bila unit ini tidak punya kolam sendiri. */
  kolam_induk?: { kode: string; nama: string; kolam_byte: number; terpakai_byte: number; sisa_byte: number } | null;
  mengikuti_induk?: boolean;
  /** Tidak punya kolam sendiri dan tidak ada kolam induk. */
  mengikuti_bawaan: boolean;
  bersama_byte: number | null;
  boleh_lebih: boolean;
  teralokasi_byte: number;
  terpakai_byte: number;
  terpakai_bersama_byte: number;
  terpakai_pribadi_byte: number;
  jumlah_berkas: number;
  anggota: number;
  sisa_byte: number | null;
  persen: number | null;
  persen_alokasi: number | null;
  kelompok: KelompokUnit[];
}
export interface RincianUnitPenyimpanan extends RingkasUnitPenyimpanan {
  subunit: Array<{ kode: string; nama: string; kolam_byte: number | null; terpakai_byte: number; anggota: number }>;
  pengguna: Array<{ username: string; nama: string | null; kuota_byte: number; terpakai_byte: number }>;
  perkiraan_anggota: Record<'dosen' | 'tendik' | 'mahasiswa', number>;
  pakai_kelompok: Record<string, { byte: number; orang: number }>;
  komposisi: { modul: Record<string, { byte: number; jumlah: number }>; jenis: Record<string, { byte: number; jumlah: number }> };
  pustikom: boolean;
  /** Batas unggah unit ini (null = mewarisi induk/bawaan) dan batas efektif ruang bersamanya. SIAKAD lama: tidak ada. */
  unggahan?: NilaiBatasUnggah & { efektif: BatasUnggah };
}

export const LABEL_MODUL: Record<string, string> = {
  berkas: 'Berkas (manajer berkas)', profil: 'Profil', pemutakhiran: 'Pemutakhiran data', sk: 'Surat keputusan', sdm_kinerja_item: 'BKD / kinerja',
  helpdesk: 'Tiket bantuan', obrolan: 'Obrolan', lms: 'LMS', kurikulum: 'Kurikulum', pmb: 'PMB', tema: 'Tema', arsip: 'Arsip', spmi: 'SPMI', lppm: 'LPPM', tracer: 'Tracer',
};
export const LABEL_JENIS_BERKAS: Record<string, string> = {
  dokumen: 'Dokumen', spreadsheet: 'Spreadsheet', presentasi: 'Presentasi', gambar: 'Gambar', video: 'Video', audio: 'Audio', arsip: 'Arsip (zip)', lain: 'Lainnya',
};
const LABEL_KELOMPOK: Record<string, string> = { dosen: 'Dosen', tendik: 'Tenaga kependidikan', mahasiswa: 'Mahasiswa', bersama: 'Ruang bersama', lain: 'Lainnya' };
export const STATUS_PERMINTAAN: Record<PermintaanKuota['status'], { label: string; variant: 'warning' | 'info' | 'success' | 'danger' | 'neutral' }> = {
  menunggu_unit: { label: 'Menunggu pengelola unit', variant: 'warning' },
  menunggu_pustikom: { label: 'Menunggu Pustikom', variant: 'info' },
  disetujui: { label: 'Disetujui', variant: 'success' },
  ditolak: { label: 'Ditolak', variant: 'danger' },
  dibatalkan: { label: 'Dibatalkan', variant: 'neutral' },
};

const labelModul = (k: string) => LABEL_MODUL[k] ?? k;
const GB = 1073741824;
const MB = 1048576;

// ---------------------------------------------------------------- data

export function usePenyimpananSaya(enabled = true) {
  return useSiakadQuery<RincianPenyimpanan>(['penyimpanan', 'saya'], (s, signal) => s.request<RincianPenyimpanan>({ method: 'GET', path: '/v1/berkas/penyimpanan/saya' }, { signal }), { enabled, staleTime: 15_000 });
}

/** Segarkan semua data penyimpanan dan batas unggah setelah perubahan. */
export function segarkanPenyimpanan() {
  invalidateSiakad('penyimpanan');
  invalidateSiakad('berkas-info');
}

// ---------------------------------------------------------------- tampilan rincian

/** Kebijakan efektif dengan asal setiap nilai. */
export function DaftarKebijakan({ k, batas }: { k: KebijakanPenyimpanan; batas?: BatasPenyimpanan | null }) {
  const asal = (f: string) => (k.sumber[f] ? <small>{k.sumber[f]!.label}</small> : null);
  return (
    <dl className="u-pny-aturan">
      <dt>Kuota</dt>
      <dd>
        {k.kuota_byte !== null ? formatBytes(k.kuota_byte) : batas ? `Belum ada kuota pribadi; mengikuti ${batas.label} (${formatBytes(batas.byte)})` : 'Belum diatur'}
        {k.kuota_byte !== null && asal('kuota_byte')}
      </dd>
      <dt>Ukuran per berkas</dt>
      <dd>
        {k.maks_berkas_byte === null ? 'Belum diatur' : `maks. ${formatBytes(k.maks_berkas_byte)}`}
        {asal('maks_berkas_byte')}
      </dd>
      <dt>Jenis berkas</dt>
      <dd>
        {k.ekstensi.length ? k.ekstensi.map((e) => `.${e}`).join(', ') : 'Semua jenis aman'}
        {k.ekstensi_larang.length > 0 && <small>Dilarang: {k.ekstensi_larang.map((e) => `.${e}`).join(', ')}</small>}
      </dd>
      {k.maks_jumlah !== null && (
        <>
          <dt>Jumlah berkas</dt>
          <dd>
            maks. {k.maks_jumlah.toLocaleString('id-ID')} berkas{asal('maks_jumlah')}
          </dd>
        </>
      )}
      <dt>Sampah</dt>
      <dd>
        Tidak dihapus otomatis
        <small>Pulihkan atau hapus permanen berkas milik Anda; pengosongan sampah dilakukan admin Pustikom.</small>
      </dd>
      <dt>Tautan publik</dt>
      <dd>{k.bagi_publik ? (k.tautan_maks_hari ? `Boleh, berlaku paling lama ${k.tautan_maks_hari} hari` : 'Boleh') : 'Tidak diizinkan'}</dd>
      <dt>Enkripsi</dt>
      <dd>{k.wajib_enkripsi ? 'Wajib untuk berkas baru' : 'Opsional'}</dd>
    </dl>
  );
}

/** Status kuota pengguna: kuota pribadi, hanya kolam unit, atau belum diatur di tingkat mana pun. */
export function statusKuota(d: Pick<RincianPenyimpanan, 'kuota_status' | 'kuota_byte' | 'batas'>): 'pribadi' | 'kolam' | 'belum_diatur' {
  return d.kuota_status ?? (d.kuota_byte !== null ? 'pribadi' : d.batas ? 'kolam' : 'belum_diatur');
}

/**
 * Meter "Penyimpanan saya" yang sama dengan yang ditegakkan saat unggah: kuota pribadi, atau kolam unit yang mengikat
 * (bila tidak ada kuota pribadi), atau keterangan jujur "Kuota belum diatur" (bukan "tanpa batas"). Dipakai Penyimpanan
 * saya, Profil, dan bar kuota Kelola berkas.
 */
export function MeterPenyimpananSaya({ data, size = 'md', keterangan }: { data: RincianPenyimpanan; size?: 'sm' | 'md'; keterangan?: string }) {
  const st = statusKuota(data);
  if (st === 'belum_diatur') {
    return (
      <div className="u-pny-belum" role="status">
        <div className="u-meter-kuota-kepala">
          <span>Penyimpanan saya</span>
          <b>{formatBytes(data.terpakai_byte)} terpakai</b>
        </div>
        <p>
          <b>Kuota belum diatur.</b> Pustikom belum menetapkan kuota untuk Anda atau unit Anda, jadi belum ada batas total. Unggahan tetap dibatasi ukuran dan jenis
          berkas.
        </p>
        {data.atur_url && (
          <a className="u-pny-atur" href={data.atur_url} target="_blank" rel="noopener">
            Atur di Pustikom » Penyimpanan
          </a>
        )}
      </div>
    );
  }
  if (st === 'kolam' && data.batas) {
    return (
      <MeterKuota
        size={size}
        label={`Penyimpanan saya · mengikuti ${data.batas.label}`}
        terpakai={data.batas.terpakai_byte}
        kuota={data.batas.byte}
        keterangan={keterangan ?? `Belum ada kuota pribadi; yang membatasi adalah ${data.batas.label} yang dipakai bersama anggota unit. Berkas Anda ${formatBytes(data.terpakai_byte)}.`}
      />
    );
  }
  return (
    <MeterKuota
      size={size}
      label={data.kuota_sumber ? `Kuota pribadi · ${data.kuota_sumber.label}` : 'Kuota pribadi'}
      terpakai={data.terpakai_byte}
      kuota={data.kuota_byte}
      keterangan={keterangan}
    />
  );
}

/** Isi rincian penyimpanan seorang pengguna (tanpa pengambilan data). */
export function RincianPenyimpananPengguna({ data, aksi }: { data: RincianPenyimpanan; aksi?: React.ReactNode }) {
  const jenis = data.per_jenis.map((j, i) => ({ label: LABEL_JENIS_BERKAS[j.kunci] ?? j.kunci, value: j.byte, color: chartColor(i) }));
  const st = statusKuota(data);
  return (
    <div className="u-pny">
      <section className="u-pny-bagian" aria-label="Kuota">
        <MeterPenyimpananSaya data={data} keterangan={st === 'pribadi' && data.dihitung_at ? `Dihitung ${formatDate(data.dihitung_at)} ${formatTime(data.dihitung_at)}. Sampah tidak mengurangi kuota.` : undefined} />
        {data.kolam.filter((k) => !(st === 'kolam' && data.batas?.kode === k.kode)).map((k) => (
          <MeterKuota key={k.kode} size="sm" label={`Kolam unit ${k.nama}`} terpakai={k.terpakai_byte ?? 0} kuota={k.kolam_byte} keterangan="Dipakai bersama seluruh anggota unit; unggahan ditolak bila kolam penuh." />
        ))}
        {aksi && <div className="u-pny-alat">{aksi}</div>}
      </section>

      <div className="u-pny-kisi">
        <div className="u-pny-angka">
          <span>Terpakai</span>
          <b>{formatBytes(data.terpakai_byte)}</b>
          <small>{data.jumlah_berkas.toLocaleString('id-ID')} berkas</small>
        </div>
        <div className="u-pny-angka">
          <span>Sisa</span>
          <b>{data.batas ? formatBytes(data.batas.sisa_byte) : data.sisa_byte === null ? 'Belum diatur' : formatBytes(data.sisa_byte)}</b>
          <small>{data.unit_utama_nama ? `Unit utama: ${data.unit_utama_nama}` : 'Tanpa unit utama'}</small>
        </div>
        <div className="u-pny-angka">
          <span>Di sampah</span>
          <b>{formatBytes(data.sampah_byte)}</b>
          <small>{data.sampah_jumlah} berkas</small>
        </div>
      </div>

      <section className="u-pny-bagian">
        <h3>Per aplikasi/modul</h3>
        <BarList items={data.per_modul.map((m) => ({ label: labelModul(m.kunci), value: m.byte, secondary: `${m.jumlah} berkas` }))} format={formatBytes} empty="Belum ada berkas." />
      </section>
      {jenis.length > 0 && (
        <section className="u-pny-bagian">
          <h3>Per jenis berkas</h3>
          <DonutChart data={jenis} format={formatBytes} />
        </section>
      )}
      {data.tren.length > 1 && (
        <section className="u-pny-bagian">
          <h3>Tren pemakaian</h3>
          <LineChart labels={data.tren.map((t) => t.bulan)} series={[{ label: 'Terpakai', values: data.tren.map((t) => t.byte) }]} format={formatBytes} legendValue="akhir" height={140} />
        </section>
      )}
      <section className="u-pny-bagian">
        <h3>Berkas terbesar</h3>
        {data.terbesar.length ? (
          <ul className="u-pny-daftar">
            {data.terbesar.map((b) => (
              <li key={b.id}>
                <span title={b.nama}>{b.nama}</span>
                <small>{labelModul(b.modul)}</small>
                <b>{formatBytes(b.ukuran)}</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="u-meter-kuota-ket">Belum ada berkas.</p>
        )}
      </section>
      {data.sampah.length > 0 && (
        <section className="u-pny-bagian">
          <h3>Isi sampah</h3>
          <ul className="u-pny-daftar">
            {data.sampah.map((b) => (
              <li key={b.id}>
                <span title={b.nama}>{b.nama}</span>
                <small>{formatDate(b.dihapus_at)}</small>
                <b>{formatBytes(b.ukuran)}</b>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="u-pny-bagian">
        <h3>Aturan yang berlaku</h3>
        <DaftarKebijakan k={data.kebijakan} batas={data.batas} />
      </section>
      {data.permintaan && data.permintaan.length > 0 && (
        <section className="u-pny-bagian">
          <h3>Permintaan tambah kuota</h3>
          <ul className="u-pny-daftar">
            {data.permintaan.map((p) => (
              <li key={p.id}>
                <span title={p.alasan}>
                  +{formatBytes(p.tambah_byte)} · {formatDate(p.created_at)}
                </span>
                <Badge variant={STATUS_PERMINTAAN[p.status].variant}>{STATUS_PERMINTAAN[p.status].label}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
      {data.aturan && (
        <details>
          <summary className="u-meter-kuota-ket" style={{ cursor: 'pointer' }}>
            Cara kuota ditentukan
          </summary>
          <ul className="u-meter-kuota-ket">
            {data.aturan.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- panel penyimpanan saya

export interface PanelPenyimpananSayaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Panel samping "Penyimpanan saya": statistik pribadi, sumber kuota, aturan, dan tombol minta tambah kuota. */
export function PanelPenyimpananSaya({ open, onOpenChange }: PanelPenyimpananSayaProps) {
  const q = usePenyimpananSaya(open);
  const [minta, setMinta] = React.useState(false);
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} title="Penyimpanan saya" description="Pemakaian ruang pribadi Anda, termasuk lampiran yang Anda unggah di aplikasi lain." size="lg">
        {q.loading && !q.data ? (
          <div className="u-pny-alat" style={{ justifyContent: 'center', padding: '2rem' }}>
            <Spinner />
          </div>
        ) : q.error || !q.data ? (
          <Alert variant="warning">{q.error ? pesanGalat(q.error) : 'Belum bisa dimuat.'}</Alert>
        ) : (
          <RincianPenyimpananPengguna
            data={q.data}
            aksi={
              <Button size="sm" variant="outline" onClick={() => setMinta(true)}>
                <Plus aria-hidden />
                Minta tambah kuota
              </Button>
            }
          />
        )}
      </Sheet>
      {minta && <FormMintaKuota open onOpenChange={setMinta} unitKelolaan={q.data?.unit_kelolaan ?? []} />}
    </>
  );
}

// ---------------------------------------------------------------- minta tambah kuota

export interface FormMintaKuotaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Unit yang dikelola pemanggil (boleh meminta tambah kolam unit). */
  unitKelolaan?: Array<{ kode: string; nama: string }>;
  /** Langsung untuk kolam unit ini. */
  unitAwal?: string;
  onTerkirim?: (p: PermintaanKuota) => void;
}

/** Formulir panel samping permintaan tambah kuota (pribadi, atau kolam unit untuk pengelola unit). */
export function FormMintaKuota({ open, onOpenChange, unitKelolaan = [], unitAwal, onTerkirim }: FormMintaKuotaProps) {
  const siakad = useSiakad();
  const [lingkup, setLingkup] = React.useState<'pengguna' | 'unit'>(unitAwal ? 'unit' : 'pengguna');
  const [unit, setUnit] = React.useState(unitAwal ?? unitKelolaan[0]?.kode ?? '');
  const [tambah, setTambah] = React.useState(1 * GB);
  const [alasan, setAlasan] = React.useState('');
  const [galat, setGalat] = React.useState<string | null>(null);
  const [kirim, setKirim] = React.useState(false);
  const simpan = async () => {
    setGalat(null);
    if (alasan.trim().length < 5) return setGalat('Tuliskan alasan (minimal 5 huruf).');
    setKirim(true);
    try {
      const r = await siakad.request<PermintaanKuota>({ method: 'POST', path: '/v1/berkas/penyimpanan/permintaan', body: { lingkup, unit: lingkup === 'unit' ? unit : undefined, tambah_byte: tambah, alasan } });
      segarkanPenyimpanan();
      onTerkirim?.(r.data);
      onOpenChange(false);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setKirim(false);
    }
  };
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Minta tambah kuota"
      description={lingkup === 'unit' ? 'Diputuskan Pustikom.' : 'Diperiksa pengelola unit Anda, lalu diputuskan Pustikom.'}
      footer={
        <div className="u-pny-alat" style={{ justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button loading={kirim} onClick={() => void simpan()}>
            Kirim permintaan
          </Button>
        </div>
      }
    >
      <div className="u-pny">
        {galat && <Alert variant="danger">{galat}</Alert>}
        {(unitKelolaan.length > 0 || unitAwal) && (
          <Field label="Untuk">
            <SegmentedControl<'pengguna' | 'unit'>
              fullWidth
              aria-label="Untuk"
              value={lingkup}
              onValueChange={setLingkup}
              options={[
                { value: 'pengguna', label: 'Ruang pribadi saya', icon: <UserRound /> },
                { value: 'unit', label: 'Kolam unit', icon: <Users /> },
              ]}
            />
          </Field>
        )}
        {lingkup === 'unit' && unitKelolaan.length > 1 && (
          <Field label="Unit">
            <Select<string> options={unitKelolaan.map((u) => ({ value: u.kode, label: u.nama }))} value={unit} placeholder="Pilih unit…" onValueChange={(v) => setUnit(v ?? '')} aria-label="Unit" />
          </Field>
        )}
        <SliderNilai label="Tambahan kuota" value={tambah} onValueChange={setTambah} min={MB} max={lingkup === 'unit' ? 100 * GB : 10 * GB} />
        <Field label="Alasan" required description="Mis. bahan ajar video semester ini, arsip akreditasi.">
          <Textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} rows={4} placeholder="Tuliskan untuk apa ruang tambahan dipakai…" />
        </Field>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- panel pengguna (Pustikom / pengelola unit)

export interface PanelPenyimpananPenggunaProps {
  username: string | null;
  onOpenChange: (open: boolean) => void;
}

/** Rincian penyimpanan seorang pengguna untuk Pustikom/pengelola unit. Pustikom bisa mengubah kuota pribadi dan mengosongkan sampah. */
export function PanelPenyimpananPengguna({ username, onOpenChange }: PanelPenyimpananPenggunaProps) {
  const siakad = useSiakad();
  const q = useSiakadQuery<RincianPenyimpanan>(
    ['penyimpanan', 'pengguna', username],
    (s, signal) => s.request<RincianPenyimpanan>({ method: 'GET', path: `/v1/berkas/penyimpanan/pengguna/${encodeURIComponent(username ?? '')}` }, { signal }),
    { enabled: !!username, staleTime: 0 },
  );
  const [ubah, setUbah] = React.useState(false);
  const [kuota, setKuota] = React.useState(0);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [simpan, setSimpan] = React.useState(false);
  const d = q.data;
  React.useEffect(() => {
    if (d) setKuota(d.kuota_byte ?? 1 * GB);
  }, [d]);
  const simpanKuota = async (hapus = false) => {
    if (!username) return;
    setSimpan(true);
    setGalat(null);
    try {
      await siakad.request({ method: 'POST', path: '/v1/berkas/penyimpanan/kebijakan', body: { lingkup: 'pengguna', kunci: username, kuota_byte: hapus ? null : kuota } });
      segarkanPenyimpanan();
      setUbah(false);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSimpan(false);
    }
  };
  return (
    <Sheet open={!!username} onOpenChange={onOpenChange} title={d?.nama ?? username ?? 'Pengguna'} description={d ? `${d.username}${d.unit_utama_nama ? ` · ${d.unit_utama_nama}` : ''} · hanya metadata berkas, akses tercatat di log` : undefined} size="lg">
      {q.loading && !d ? (
        <div className="u-pny-alat" style={{ justifyContent: 'center', padding: '2rem' }}>
          <Spinner />
        </div>
      ) : q.error || !d ? (
        <Alert variant="warning">{q.error ? pesanGalat(q.error) : 'Belum bisa dimuat.'}</Alert>
      ) : (
        <>
          {galat && <Alert variant="danger">{galat}</Alert>}
          {ubah && (
            <div className="u-pny-kelompok" style={{ marginBottom: '1rem' }}>
              <SliderNilai label="Kuota pribadi (pengecualian)" value={kuota} onValueChange={setKuota} max={Math.max(20 * GB, kuota)} perkiraan={`Terpakai ${formatBytes(d.terpakai_byte)}`} />
              <div className="u-pny-alat">
                <Button size="sm" loading={simpan} onClick={() => void simpanKuota()}>
                  Simpan kuota
                </Button>
                {d.pengecualian?.kuota_byte != null && (
                  <Button size="sm" variant="outline" disabled={simpan} onClick={() => void simpanKuota(true)}>
                    Hapus pengecualian
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setUbah(false)}>
                  Batal
                </Button>
              </div>
            </div>
          )}
          <RincianPenyimpananPengguna
            data={d}
            aksi={
              d.pustikom ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setUbah(true)}>
                    <Scale aria-hidden />
                    Ubah kuota pribadi
                  </Button>
                  {d.sampah_jumlah > 0 && (
                    <ConfirmDialog
                      trigger={
                        <Button size="sm" variant="outline">
                          <Trash2 aria-hidden />
                          Kosongkan sampah
                        </Button>
                      }
                      title="Kosongkan sampah pengguna?"
                      description={`${d.sampah_jumlah} berkas (${formatBytes(d.sampah_byte)}) dihapus permanen dari penyimpanan dan tidak bisa dipulihkan. Lakukan hanya atas permintaan pengguna; tindakan ini tercatat di log.`}
                      confirmLabel="Hapus permanen"
                      onConfirm={async () => {
                        await siakad.request({ method: 'POST', path: `/v1/berkas/penyimpanan/pengguna/${encodeURIComponent(d.username)}/sampah/kosongkan` });
                        segarkanPenyimpanan();
                      }}
                    />
                  )}
                </>
              ) : undefined
            }
          />
        </>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------- panel unit

export interface PanelPenyimpananUnitProps {
  kode: string | null;
  onOpenChange: (open: boolean) => void;
  /** Klik anggota: buka rincian pengguna (bawaan: panel pengguna). */
  onPengguna?: (username: string) => void;
}

/** Rincian penyimpanan unit: kolam, alokasi per kelompok vs pemakaian nyata, komposisi, anggota teratas, dan Bagi kuota. */
export function PanelPenyimpananUnit({ kode, onOpenChange, onPengguna }: PanelPenyimpananUnitProps) {
  const q = useSiakadQuery<RincianUnitPenyimpanan>(
    ['penyimpanan', 'unit', kode],
    (s, signal) => s.request<RincianUnitPenyimpanan>({ method: 'GET', path: `/v1/berkas/penyimpanan/unit/${encodeURIComponent(kode ?? '')}` }, { signal }),
    { enabled: !!kode, staleTime: 0 },
  );
  const anggota = useSiakadQuery<Array<{ username: string; nama: string | null; terpakai_byte: number; kuota_byte: number | null; persen: number | null }>>(
    ['penyimpanan', 'unit-anggota', kode],
    (s, signal) => s.request({ method: 'GET', path: '/v1/berkas/penyimpanan/pengguna', query: { unit: kode ?? '', per_page: 10 } }, { signal }),
    { enabled: !!kode, staleTime: 0 },
  );
  const [bagi, setBagi] = React.useState(false);
  const [minta, setMinta] = React.useState(false);
  const [aturUnggah, setAturUnggah] = React.useState(false);
  const [pengguna, setPengguna] = React.useState<string | null>(null);
  const d = q.data;
  const bagian = d ? bagianUnit(d) : [];
  const kelompokNyata = d
    ? ['dosen', 'tendik', 'mahasiswa', 'bersama'].map((k) => ({
        k,
        alokasi: k === 'bersama' ? (d.bersama_byte ?? 0) : (d.kelompok.find((x) => x.kelompok === k)?.total_byte ?? 0),
        pakai: d.pakai_kelompok[k]?.byte ?? 0,
      }))
    : [];
  return (
    <>
      <Sheet open={!!kode} onOpenChange={onOpenChange} title={d ? `Penyimpanan ${d.nama}` : 'Penyimpanan unit'} description={d ? `${d.anggota.toLocaleString('id-ID')} anggota · ${d.jumlah_berkas.toLocaleString('id-ID')} berkas` : undefined} size="xl">
        {q.loading && !d ? (
          <div className="u-pny-alat" style={{ justifyContent: 'center', padding: '2rem' }}>
            <Spinner />
          </div>
        ) : q.error || !d ? (
          <Alert variant="warning">{q.error ? pesanGalat(q.error) : 'Belum bisa dimuat.'}</Alert>
        ) : (
          <div className="u-pny">
            <section className="u-pny-bagian">
              {d.kolam_byte === null && d.kolam_induk ? (
                <>
                  <MeterKuota label={`Mengikuti kolam ${d.kolam_induk.nama}`} terpakai={d.kolam_induk.terpakai_byte} kuota={d.kolam_induk.kolam_byte} keterangan={`Unit ini belum punya kolam sendiri; pemakaiannya (${formatBytes(d.terpakai_byte)}) dibebankan ke kolam ${d.kolam_induk.nama}.`} />
                </>
              ) : d.kolam_byte === null ? (
                <Alert variant="info" title="Mengikuti bawaan">
                  Unit ini belum punya kolam kuota khusus; anggotanya memakai kebijakan bawaan, peran, dan pengecualian. {d.pustikom ? 'Tetapkan kolam lewat Bagi kuota unit.' : 'Minta Pustikom menetapkan kolam unit.'}
                </Alert>
              ) : (
                <MeterKuota label="Kolam unit (pemakaian nyata)" terpakai={d.terpakai_byte} kuota={d.kolam_byte} keterangan={`Ruang bersama ${formatBytes(d.terpakai_bersama_byte)} + ruang pribadi anggota ${formatBytes(d.terpakai_pribadi_byte)}.`} />
              )}
              <BatangAlokasi judul="Pembagian kolam" bagian={bagian} batas={d.kolam_byte} terpakai={d.terpakai_byte} bolehLebih={d.boleh_lebih} />
              <div className="u-pny-alat">
                {(d.kolam_byte !== null || d.pustikom) && (
                  <Button size="sm" onClick={() => setBagi(true)}>
                    <Scale aria-hidden />
                    Bagi kuota unit
                  </Button>
                )}
                {!d.pustikom && (
                  <Button size="sm" variant="outline" onClick={() => setMinta(true)}>
                    <Plus aria-hidden />
                    Minta tambah kolam
                  </Button>
                )}
              </div>
            </section>
            {d.unggahan && (
              <section className="u-pny-bagian" aria-label="Unggahan">
                <h3>Unggahan</h3>
                <dl className="u-pny-aturan">
                  <dt>Diatur unit ini</dt>
                  <dd>{ringkasBatasUnggah(d.unggahan, 'Belum diatur (mengikuti unit induk/bawaan)')}</dd>
                  <dt>Berlaku di ruang unit</dt>
                  <dd>
                    {d.unggahan.efektif.teks}
                    {d.unggahan.efektif.maks_sumber && <small>Ukuran dari {d.unggahan.efektif.maks_sumber.label}</small>}
                    {(d.unggahan.efektif.izin ?? []).length > 0 && <small>Jenis dari {(d.unggahan.efektif.izin ?? []).map((c) => c.sumber.label).join(' dan ')}</small>}
                  </dd>
                </dl>
                <p className="u-meter-kuota-ket">Berlaku juga untuk anggota unit dan sub-unit yang tidak mengatur sendiri. Aplikasi yang dipakai mengunggah bisa lebih ketat.</p>
                {d.pustikom && (
                  <div className="u-pny-alat">
                    <Button size="sm" variant="outline" onClick={() => setAturUnggah(true)}>
                      <Scale aria-hidden />
                      Atur unggahan
                    </Button>
                  </div>
                )}
              </section>
            )}
            <section className="u-pny-bagian">
              <h3>Alokasi vs pemakaian nyata per kelompok</h3>
              <GroupedBarChart
                labels={kelompokNyata.map((x) => LABEL_KELOMPOK[x.k] ?? x.k)}
                series={[
                  { label: 'Alokasi', values: kelompokNyata.map((x) => x.alokasi) },
                  { label: 'Terpakai', values: kelompokNyata.map((x) => x.pakai) },
                ]}
                format={formatBytes}
                height={160}
              />
            </section>
            {d.subunit.length > 0 && (
              <section className="u-pny-bagian">
                <h3>Sub-unit</h3>
                <ul className="u-pny-daftar">
                  {d.subunit.map((s) => (
                    <li key={s.kode}>
                      <span>{s.nama}</span>
                      <small>{s.kolam_byte === null ? 'Mengikuti induk' : `kolam ${formatBytes(s.kolam_byte)}`}</small>
                      <b>{formatBytes(s.terpakai_byte)}</b>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section className="u-pny-bagian">
              <h3>Per aplikasi/modul</h3>
              <BarList items={Object.entries(d.komposisi.modul).map(([k, v]) => ({ label: labelModul(k), value: v.byte, secondary: `${v.jumlah} berkas` }))} format={formatBytes} empty="Belum ada berkas." />
            </section>
            <section className="u-pny-bagian">
              <h3>Anggota dengan pemakaian terbesar</h3>
              {anggota.loading && !anggota.data ? (
                <Spinner />
              ) : anggota.data && anggota.data.length ? (
                <ul className="u-pny-daftar">
                  {anggota.data.map((a) => (
                    <li key={a.username}>
                      <Button variant="link" size="sm" className="u-pny-tautan" onClick={() => (onPengguna ? onPengguna(a.username) : setPengguna(a.username))}>
                        {a.nama ?? a.username}
                      </Button>
                      <small>{a.kuota_byte === null ? 'tanpa batas' : `${a.persen ?? 0}% dari ${formatBytes(a.kuota_byte)}`}</small>
                      <b>{formatBytes(a.terpakai_byte)}</b>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty icon={<HardDrive />} title="Belum ada pemakaian" description="Anggota unit ini belum menyimpan berkas." />
              )}
            </section>
          </div>
        )}
      </Sheet>
      {bagi && d && <BagiKuotaUnit kode={d.kode} open onOpenChange={setBagi} />}
      {minta && d && <FormMintaKuota open onOpenChange={setMinta} unitAwal={d.kode} unitKelolaan={[{ kode: d.kode, nama: d.nama }]} />}
      {d?.unggahan && (
        <PanelBatasUnggah
          open={aturUnggah}
          onOpenChange={setAturUnggah}
          lingkup="unit"
          kunci={d.kode}
          nama={d.nama}
          awal={d.unggahan}
          keterangan={`Sekarang berlaku di ruang unit: ${d.unggahan.efektif.teks}${d.unggahan.efektif.maks_sumber ? ` (ukuran dari ${d.unggahan.efektif.maks_sumber.label})` : ''}. Nilai unit hanya bisa memperketat bawaan; sub-unit bisa menimpa nilai ini.`}
        />
      )}
      {!onPengguna && <PanelPenyimpananPengguna username={pengguna} onOpenChange={(o) => !o && setPengguna(null)} />}
    </>
  );
}

function bagianUnit(d: RincianUnitPenyimpanan): BagianAlokasi[] {
  const out: BagianAlokasi[] = [];
  if (d.bersama_byte) out.push({ kunci: 'bersama', label: 'Ruang bersama', nilai: d.bersama_byte, terpakai: d.terpakai_bersama_byte });
  d.kelompok.forEach((k) => out.push({ kunci: k.kelompok, label: k.mode === 'orang' ? `${k.label} (${formatBytes(k.kuota_byte)} × ${k.anggota})` : `${k.label} (total)`, nilai: k.total_byte, terpakai: d.pakai_kelompok[k.kelompok]?.byte }));
  d.subunit.forEach((s) => s.kolam_byte && out.push({ kunci: `sub:${s.kode}`, label: s.nama, nilai: s.kolam_byte, terpakai: s.terpakai_byte }));
  const peng = d.pengguna.reduce((a, p) => a + p.kuota_byte, 0);
  if (peng) out.push({ kunci: 'pengguna', label: `Pengecualian (${d.pengguna.length} orang)`, nilai: peng });
  return out;
}

// ---------------------------------------------------------------- wizard bagi kuota unit

interface BarisKelompok {
  kelompok: string;
  label: string;
  aktif: boolean;
  mode: 'orang' | 'total';
  kuota_byte: number;
  anggota: number;
  terkunci: boolean;
}

export interface BagiKuotaUnitProps {
  kode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (r: RincianUnitPenyimpanan) => void;
}

/**
 * Wizard panel samping "Bagi kuota unit": kolam (Pustikom) dan ruang bersama → kelompok/peran (slider per orang atau
 * total, × jumlah anggota nyata) → sub-unit → pengguna (pengecualian) → tinjau. Bar alokasi di atas setiap langkah ikut
 * berubah saat slider digeser. "Bagi rata" membagi sisa kolam ke kelompok aktif; mode proporsional menyesuaikan kelompok
 * lain (yang tidak dikunci) supaya total tetap di dalam kolam.
 */
export function BagiKuotaUnit({ kode, open, onOpenChange, onSaved }: BagiKuotaUnitProps) {
  const siakad = useSiakad();
  const q = useSiakadQuery<RincianUnitPenyimpanan>(['penyimpanan', 'unit', kode], (s, signal) => s.request<RincianUnitPenyimpanan>({ method: 'GET', path: `/v1/berkas/penyimpanan/unit/${encodeURIComponent(kode)}` }, { signal }), { enabled: open, staleTime: 0 });
  const d = q.data;
  const [kolam, setKolam] = React.useState<number>(0);
  const [bolehLebih, setBolehLebih] = React.useState(false);
  const [bersama, setBersama] = React.useState(0);
  const [kel, setKel] = React.useState<BarisKelompok[]>([]);
  const [sub, setSub] = React.useState<Record<string, number | null>>({});
  const [peng, setPeng] = React.useState<Array<{ username: string; nama: string | null; kuota_byte: number }>>([]);
  const [proporsional, setProporsional] = React.useState(false);
  const [baru, setBaru] = React.useState('');
  const [peranBaru, setPeranBaru] = React.useState('');
  const siap = React.useRef(false);

  React.useEffect(() => {
    if (!d || siap.current) return;
    siap.current = true;
    setKolam(d.kolam_byte ?? 0);
    setBolehLebih(d.boleh_lebih);
    setBersama(d.bersama_byte ?? 0);
    const dasar = (['dosen', 'tendik', 'mahasiswa'] as const).map((k) => {
      const ada = d.kelompok.find((x) => x.kelompok === k);
      return { kelompok: k, label: LABEL_KELOMPOK[k]!, aktif: !!ada, mode: ada?.mode ?? 'orang', kuota_byte: ada?.kuota_byte ?? (k === 'mahasiswa' ? 200 * MB : 1 * GB), anggota: d.perkiraan_anggota[k] ?? 0, terkunci: false } as BarisKelompok;
    });
    const lain = d.kelompok.filter((x) => !['dosen', 'tendik', 'mahasiswa'].includes(x.kelompok)).map((x) => ({ kelompok: x.kelompok, label: x.label, aktif: true, mode: x.mode, kuota_byte: x.kuota_byte, anggota: x.anggota, terkunci: false }));
    setKel([...dasar, ...lain]);
    setSub(Object.fromEntries(d.subunit.map((s) => [s.kode, s.kolam_byte])));
    setPeng(d.pengguna.map((p) => ({ username: p.username, nama: p.nama, kuota_byte: p.kuota_byte })));
  }, [d]);
  React.useEffect(() => {
    if (!open) siap.current = false;
  }, [open]);

  const totalKel = (b: BarisKelompok) => (!b.aktif ? 0 : b.mode === 'total' ? b.kuota_byte : b.kuota_byte * b.anggota);
  const totalSub = Object.values(sub).reduce<number>((a, v) => a + (v ?? 0), 0);
  const totalPeng = peng.reduce((a, p) => a + p.kuota_byte, 0);
  const teralokasi = bersama + kel.reduce((a, b) => a + totalKel(b), 0) + totalSub + totalPeng;
  const batas = kolam > 0 ? kolam : null;
  const lebih = batas !== null && teralokasi > batas;
  const bagian: BagianAlokasi[] = [
    ...(bersama ? [{ kunci: 'bersama', label: 'Ruang bersama', nilai: bersama }] : []),
    ...kel.filter((b) => b.aktif).map((b) => ({ kunci: b.kelompok, label: b.label, nilai: totalKel(b), terpakai: d?.pakai_kelompok[b.kelompok]?.byte })),
    ...(totalSub ? [{ kunci: 'sub', label: 'Sub-unit', nilai: totalSub }] : []),
    ...(totalPeng ? [{ kunci: 'peng', label: 'Pengecualian', nilai: totalPeng }] : []),
  ];
  const ubahKel = (i: number, ubah: Partial<BarisKelompok>) =>
    setKel((xs) => {
      let baruXs = xs.map((x, j) => (j === i ? { ...x, ...ubah } : x));
      if (proporsional && batas !== null && ubah.kuota_byte !== undefined) {
        // Sesuaikan kelompok lain (aktif, tidak dikunci) supaya total tetap di dalam kolam.
        const tetap = bersama + totalSub + totalPeng + baruXs.reduce((a, x, j) => a + (j === i || x.terkunci || !x.aktif ? totalKel(x) : 0), 0);
        const lentur = baruXs.filter((x, j) => j !== i && x.aktif && !x.terkunci);
        const lenturTotal = lentur.reduce((a, x) => a + totalKel(x), 0);
        const ruang = Math.max(0, batas - tetap);
        if (lenturTotal > ruang && lenturTotal > 0) {
          const f = ruang / lenturTotal;
          baruXs = baruXs.map((x, j) => (j !== i && x.aktif && !x.terkunci ? { ...x, kuota_byte: Math.floor(x.kuota_byte * f) } : x));
        }
      }
      return baruXs;
    });
  const bagiRata = () => {
    if (batas === null) return;
    const aktif = kel.filter((x) => x.aktif && !x.terkunci);
    const tetap = bersama + totalSub + totalPeng + kel.filter((x) => x.aktif && x.terkunci).reduce((a, x) => a + totalKel(x), 0);
    const ruang = Math.max(0, batas - tetap);
    const orang = aktif.reduce((a, x) => a + (x.mode === 'orang' ? Math.max(1, x.anggota) : 1), 0);
    if (!orang) return;
    const per = Math.floor(ruang / orang / MB) * MB;
    setKel((xs) => xs.map((x) => (x.aktif && !x.terkunci ? { ...x, kuota_byte: x.mode === 'orang' ? per : per } : x)));
  };

  const simpan = async (): Promise<string | void> => {
    try {
      const body: Record<string, unknown> = {
        bersama_byte: bersama || null,
        kelompok: kel.filter((x) => x.aktif).map((x) => ({ kelompok: x.kelompok, mode: x.mode, kuota_byte: x.kuota_byte })),
        subunit: Object.entries(sub).map(([k, v]) => ({ kode: k, kuota_byte: v })),
        pengguna: peng.map((p) => ({ username: p.username, kuota_byte: p.kuota_byte })),
      };
      if (d?.pustikom) Object.assign(body, { kolam_byte: kolam || null, boleh_lebih: bolehLebih });
      const r = await siakad.request<RincianUnitPenyimpanan>({ method: 'POST', path: `/v1/berkas/penyimpanan/unit/${encodeURIComponent(kode)}/bagi`, body });
      segarkanPenyimpanan();
      onSaved?.(r.data);
    } catch (e) {
      return pesanGalat(e);
    }
  };

  const ringkasan = (
    <div className="u-pny-lekat">
      <BatangAlokasi judul={d ? `Kolam ${d.singkatan || d.nama}` : 'Kolam'} bagian={bagian} batas={batas} terpakai={d?.terpakai_byte} bolehLebih={bolehLebih} />
      {lebih && !bolehLebih && <p className="u-meter-kuota-ket" style={{ color: 'var(--u-danger)' }}>Alokasi melebihi kolam; kurangi pembagian sebelum menyimpan.</p>}
    </div>
  );
  const maksSlider = Math.max(batas ?? 0, 10 * GB);

  const steps = !d
    ? [{ id: 'muat', title: 'Memuat', content: q.error ? <Alert variant="warning">{pesanGalat(q.error)}</Alert> : <Spinner /> }]
    : [
        {
          id: 'kolam',
          title: 'Kolam',
          description: 'Batas total unit dan ruang bersama',
          content: (
            <div className="u-pny">
              {ringkasan}
              {d.pustikom ? (
                <>
                  <SliderNilai label="Kolam kuota unit" value={kolam} onValueChange={setKolam} max={Math.max(200 * GB, kolam)} step={GB} perkiraan={`Pemakaian nyata saat ini ${formatBytes(d.terpakai_byte)} · ${d.anggota.toLocaleString('id-ID')} anggota`} />
                  <label className="u-pny-alat">
                    <Switch checked={bolehLebih} onCheckedChange={setBolehLebih} aria-label="Izinkan alokasi melebihi kolam" />
                    <span>Izinkan alokasi melebihi kolam (overcommit). Pemakaian nyata tetap dibatasi kolam.</span>
                  </label>
                </>
              ) : (
                <Alert variant="info">Kolam unit {formatBytes(kolam)} ditetapkan Pustikom.</Alert>
              )}
              <SliderNilai label="Ruang bersama unit" value={bersama} onValueChange={setBersama} max={maksSlider} keterangan="total" perkiraan={`Terpakai ${formatBytes(d.terpakai_bersama_byte)}`} />
            </div>
          ),
          validate: () => (d.pustikom && kolam <= 0 && kel.some((x) => x.aktif) ? 'Isi kolam unit lebih dulu.' : undefined),
        },
        {
          id: 'kelompok',
          title: 'Kelompok & peran',
          description: 'Per orang atau total kelompok',
          content: (
            <div className="u-pny">
              {ringkasan}
              <div className="u-pny-alat">
                <Button size="sm" variant="outline" onClick={bagiRata} disabled={batas === null}>
                  Bagi rata sisa kolam
                </Button>
                <label className="u-pny-alat">
                  <Switch checked={proporsional} onCheckedChange={setProporsional} aria-label="Mode proporsional" />
                  <span>Proporsional: geser satu kelompok menyesuaikan yang lain (kecuali yang dikunci)</span>
                </label>
              </div>
              {kel.map((b, i) => (
                <div key={b.kelompok} className="u-pny-kelompok" data-mati={b.aktif ? undefined : ''}>
                  <SliderNilai
                    label={b.label}
                    warna={chartColor(bagian.findIndex((x) => x.kunci === b.kelompok))}
                    value={b.kuota_byte}
                    onValueChange={(v) => ubahKel(i, { kuota_byte: v })}
                    max={b.mode === 'orang' ? Math.max(5 * GB, b.kuota_byte) : maksSlider}
                    keterangan={b.mode === 'orang' ? 'per orang' : 'total kelompok'}
                    perkiraan={b.mode === 'orang' ? `× ${b.anggota.toLocaleString('id-ID')} anggota = ${formatBytes(totalKel({ ...b, aktif: true }))}` : `≈ ${formatBytes(b.kuota_byte / Math.max(1, b.anggota))} per orang (${b.anggota.toLocaleString('id-ID')} anggota)`}
                    terkunci={b.terkunci}
                    onTerkunciChange={(v) => ubahKel(i, { terkunci: v })}
                    disabled={!b.aktif}
                    aksi={
                      <>
                        <SegmentedControl<'orang' | 'total'>
                          aria-label={`Mode ${b.label}`}
                          value={b.mode}
                          onValueChange={(m) => ubahKel(i, { mode: m })}
                          options={[
                            { value: 'orang', label: 'Per orang' },
                            { value: 'total', label: 'Total' },
                          ]}
                        />
                        <Switch checked={b.aktif} onCheckedChange={(v) => ubahKel(i, { aktif: v })} aria-label={`Aktifkan ${b.label}`} />
                      </>
                    }
                  />
                </div>
              ))}
              <Field label="Tambah kelompok peran" description="Kode peran RBAC, mis. kaprodi atau tim-humas. Anggota dihitung dari penugasan di unit ini.">
                <div className="u-pny-alat">
                  <Input value={peranBaru} onChange={(e) => setPeranBaru(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} placeholder="Pilih kode peran…" />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!peranBaru || kel.some((x) => x.kelompok === `peran:${peranBaru}`)}
                    onClick={() => {
                      setKel((xs) => [...xs, { kelompok: `peran:${peranBaru}`, label: `Peran ${peranBaru}`, aktif: true, mode: 'orang', kuota_byte: 1 * GB, anggota: 0, terkunci: false }]);
                      setPeranBaru('');
                    }}
                  >
                    <Plus aria-hidden />
                    Tambah
                  </Button>
                </div>
              </Field>
            </div>
          ),
        },
        {
          id: 'subunit',
          title: 'Sub-unit',
          description: 'Kolam untuk prodi/bagian di bawahnya',
          optional: true,
          content: (
            <div className="u-pny">
              {ringkasan}
              {d.subunit.length === 0 ? (
                <p className="u-meter-kuota-ket">Unit ini tidak punya sub-unit.</p>
              ) : (
                d.subunit.map((s) => (
                  <div key={s.kode} className="u-pny-kelompok" data-mati={sub[s.kode] == null ? '' : undefined}>
                    <SliderNilai
                      label={s.nama}
                      value={sub[s.kode] ?? 0}
                      onValueChange={(v) => setSub((x) => ({ ...x, [s.kode]: v }))}
                      max={maksSlider}
                      keterangan="kolam"
                      perkiraan={`${s.anggota.toLocaleString('id-ID')} anggota · terpakai ${formatBytes(s.terpakai_byte)}`}
                      aksi={<Switch checked={sub[s.kode] != null} onCheckedChange={(v) => setSub((x) => ({ ...x, [s.kode]: v ? (x[s.kode] ?? 1 * GB) : null }))} aria-label={`Kolam khusus ${s.nama}`} />}
                      disabled={sub[s.kode] == null}
                    />
                  </div>
                ))
              )}
            </div>
          ),
        },
        {
          id: 'pengguna',
          title: 'Pengguna',
          description: 'Pengecualian per orang',
          optional: true,
          content: (
            <div className="u-pny">
              {ringkasan}
              {peng.map((p, i) => (
                <div key={p.username} className="u-pny-kelompok">
                  <SliderNilai
                    label={`${p.nama ?? p.username}`}
                    value={p.kuota_byte}
                    onValueChange={(v) => setPeng((xs) => xs.map((x, j) => (j === i ? { ...x, kuota_byte: v } : x)))}
                    max={Math.max(20 * GB, p.kuota_byte)}
                    keterangan="kuota pribadi"
                    aksi={
                      <Button size="sm" variant="ghost" iconOnly aria-label={`Hapus pengecualian ${p.username}`} onClick={() => setPeng((xs) => xs.filter((_, j) => j !== i))}>
                        <X aria-hidden />
                      </Button>
                    }
                  />
                </div>
              ))}
              <Field label="Tambah pengecualian" description="Username anggota unit (NIDN, NIM, atau NIK).">
                <div className="u-pny-alat">
                  <Input value={baru} onChange={(e) => setBaru(e.target.value.trim())} placeholder="Pilih username…" />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!baru || peng.some((x) => x.username === baru)}
                    onClick={() => {
                      setPeng((xs) => [...xs, { username: baru, nama: null, kuota_byte: 5 * GB }]);
                      setBaru('');
                    }}
                  >
                    <Plus aria-hidden />
                    Tambah
                  </Button>
                </div>
              </Field>
            </div>
          ),
        },
        {
          id: 'tinjau',
          title: 'Tinjau',
          content: (
            <div className="u-pny">
              {ringkasan}
              <ul className="u-pny-daftar">
                <li>
                  <span>Kolam unit</span>
                  <b>{batas === null ? (d?.kolam_induk ? `Mengikuti kolam ${d.kolam_induk.nama}` : 'Mengikuti bawaan') : formatBytes(batas)}</b>
                </li>
                <li>
                  <span>Ruang bersama</span>
                  <b>{formatBytes(bersama)}</b>
                </li>
                {kel
                  .filter((x) => x.aktif)
                  .map((x) => (
                    <li key={x.kelompok}>
                      <span>
                        {x.label} · {x.mode === 'orang' ? `${formatBytes(x.kuota_byte)} per orang × ${x.anggota}` : 'total'}
                      </span>
                      <b>{formatBytes(totalKel(x))}</b>
                    </li>
                  ))}
                {totalSub > 0 && (
                  <li>
                    <span>Sub-unit</span>
                    <b>{formatBytes(totalSub)}</b>
                  </li>
                )}
                {peng.length > 0 && (
                  <li>
                    <span>Pengecualian {peng.length} orang</span>
                    <b>{formatBytes(totalPeng)}</b>
                  </li>
                )}
                <li>
                  <span>Teralokasi</span>
                  <b>
                    {formatBytes(teralokasi)}
                    {batas !== null && ` / ${formatBytes(batas)}`}
                  </b>
                </li>
              </ul>
              <p className="u-meter-kuota-ket">Alokasi adalah perkiraan kebutuhan; pemakaian nyata seluruh anggota tetap dibatasi kolam unit.</p>
            </div>
          ),
          validate: () => (lebih && !bolehLebih ? `Alokasi ${formatBytes(teralokasi)} melebihi kolam ${formatBytes(batas ?? 0)}.` : undefined),
        },
      ];

  return <PanelLangkah open={open} onOpenChange={onOpenChange} title="Bagi kuota unit" description={d?.nama} steps={steps} mode="ubah" size="xl" onFinish={simpan} finishLabel="Simpan pembagian" />;
}

// ---------------------------------------------------------------- ringkas di manajer berkas

export interface KuotaBerkasProps {
  kuota: { ruang: 'pribadi' | 'unit'; kuota_byte: number | null; terpakai_byte: number; sisa_kolam_byte: number | null; kolam: KolamPenyimpanan[]; sumber?: SumberNilai | null; batas?: BatasPenyimpanan | null } | null | undefined;
  unit?: string;
  /** Satu baris ringkas (meter tipis + teks kecil + tombol rincian) untuk kaki sidebar bergaya Finder. */
  ringkas?: boolean;
  className?: string;
}

/** Bar kuota di sisi ManajerBerkas: ruang pribadi (Penyimpanan saya) atau ruang bersama unit (Penyimpanan unit). */
export function KuotaBerkas({ kuota, unit, ringkas, className }: KuotaBerkasProps) {
  const [saya, setSaya] = React.useState(false);
  const [panelUnit, setPanelUnit] = React.useState<string | null>(null);
  const unitQ = useSiakadQuery<{ unit: RingkasUnitPenyimpanan[] }>(['penyimpanan', 'unit-kelola'], (s, signal) => s.request({ method: 'GET', path: '/v1/berkas/penyimpanan/unit' }, { signal }), { enabled: !!unit, staleTime: 60_000 });
  if (!kuota) return null;
  const kelolaUnit = unit ? unitQ.data?.unit.some((u) => u.kode === unit) : false;
  const kolam = kuota.kolam[kuota.kolam.length - 1];
  if (ringkas) {
    const kolamIkat = kuota.batas && kuota.batas.sumber === 'kolam';
    const pakai = kolamIkat ? kuota.batas!.terpakai_byte : kuota.terpakai_byte;
    const batas = kuota.batas ? kuota.batas.byte : kuota.kuota_byte;
    const persen = batas ? (pakai / batas) * 100 : null;
    const teks = batas ? `${formatBytes(pakai)} dari ${formatBytes(batas)}` : `${formatBytes(pakai)} · kuota belum diatur`;
    const kaki = teksKuotaKaki(formatBytes(pakai), batas ? formatBytes(batas) : null, kolamIkat ? kuota.batas!.label : null);
    const label = kuota.ruang === 'unit' ? 'Ruang bersama unit' : 'Penyimpanan saya';
    const bisaRinci = kuota.ruang === 'pribadi' || kelolaUnit;
    const Isi = bisaRinci ? 'button' : 'span';
    return (
      <>
        <Isi
          {...(bisaRinci ? { type: 'button' as const, onClick: () => (kuota.ruang === 'pribadi' ? setSaya(true) : setPanelUnit(unit ?? null)) } : {})}
          className={`u-mb-kuota-ringkas ${className ?? ''}`}
          data-nada={nadaKuota(persen)}
          title={`${label}: ${teks}${kolamIkat ? ` (mengikuti ${kuota.batas!.label})` : ''}${bisaRinci ? '. Klik untuk rincian & minta kuota.' : ''}`}
        >
          <HardDrive aria-hidden />
          <span>
            {batas ? (
              <span className="u-dd-trek" role="meter" aria-valuemin={0} aria-valuemax={batas} aria-valuenow={pakai} aria-label={label} aria-valuetext={teks}>
                <i style={{ width: `${Math.min(100, Math.max(persen ?? 0, pakai > 0 ? 3 : 0))}%` }} />
              </span>
            ) : null}
            {/* Dua baris pendek yang tidak dipotong: "424,1 KB dipakai" + "Kuota belum diatur" / "Mengikuti kolam ...". */}
            <small className="u-mb-kuota-utama">{kaki.utama}</small>
            {kaki.ket && <small className="u-mb-kuota-ket">{kaki.ket}</small>}
          </span>
        </Isi>
        {saya && <PanelPenyimpananSaya open onOpenChange={setSaya} />}
        <PanelPenyimpananUnit kode={panelUnit} onOpenChange={(o) => !o && setPanelUnit(null)} />
      </>
    );
  }
  return (
    <div className={`u-mb-kuota ${className ?? ''}`}>
      {kuota.batas && kuota.batas.sumber === 'kolam' ? (
        // Tanpa kuota ruang sendiri: yang mengikat adalah kolam unit (bisa kolam unit induk yang diwariskan).
        <MeterKuota
          size="sm"
          label={kuota.ruang === 'unit' ? 'Ruang bersama unit' : 'Penyimpanan saya'}
          terpakai={kuota.batas.terpakai_byte}
          kuota={kuota.batas.byte}
          keterangan={`Mengikuti ${kuota.batas.label}${kuota.ruang === 'unit' ? '. Isi ruang ini' : '. Berkas Anda'} ${formatBytes(kuota.terpakai_byte)}.`}
        />
      ) : (
        <MeterKuota
          size="sm"
          label={kuota.ruang === 'unit' ? 'Ruang bersama unit' : 'Penyimpanan saya'}
          terpakai={kuota.terpakai_byte}
          kuota={kuota.batas ? kuota.batas.byte : kuota.kuota_byte}
          keterangan={
            !kuota.batas && kuota.kuota_byte === null
              ? 'Kuota belum diatur Pustikom.'
              : kolam && kuota.sisa_kolam_byte !== null
                ? `Kolam ${kolam.nama}: sisa ${formatBytes(kuota.sisa_kolam_byte)}`
                : undefined
          }
        />
      )}
      {kuota.ruang === 'pribadi' ? (
        <Button size="sm" variant="ghost" onClick={() => setSaya(true)}>
          <HardDrive aria-hidden />
          Rincian & minta kuota
        </Button>
      ) : kelolaUnit ? (
        <Button size="sm" variant="ghost" onClick={() => setPanelUnit(unit ?? null)}>
          <Users aria-hidden />
          Penyimpanan unit
        </Button>
      ) : null}
      {saya && <PanelPenyimpananSaya open onOpenChange={setSaya} />}
      <PanelPenyimpananUnit kode={panelUnit} onOpenChange={(o) => !o && setPanelUnit(null)} />
    </div>
  );
}
