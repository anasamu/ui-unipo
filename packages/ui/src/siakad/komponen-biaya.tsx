import * as React from 'react';
import { ArrowLeft, Building2, CalendarClock, Coins, Gavel, Pencil, Plus, Receipt, Search, Split, Trash2 } from 'lucide-react';
import { Badge, Button, Spinner } from '../components/actions';
import { Empty, Tabs } from '../components/display';
import { DataTable, type DataColumn } from '../components/data-table';
import { Field, Input } from '../components/forms';
import { PanelForm, Pilihan } from '../components/formulir';
import { ConfirmDialog, useToast } from '../components/overlays';
import type { SelectOption } from '../components/select';
import { cn } from '../lib/cn';
import { formatNumber, formatRupiah } from '../lib/format';
import { KelolaAturanBiaya } from './biaya';
import { PilihTahunAkademik } from './cari';
import { GalatApi } from './galat';
import {
  AturanPenerimaanKasir,
  FormJenisBiayaKasir,
  JadwalPenerimaanBiaya,
  labelPerlakuanKasir,
  namaUnitPenerbitKasir,
  useJenisBiayaKasir,
  useKasirKelolaSaya,
  type JenisBiayaKasir,
  type KasirKelolaSaya,
} from './kasir-unit';
import { labelTahunAkademik } from './label-tahun';
import { namaRapi } from './prodi';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

// Komponen biaya (BAUK): satu tempat untuk mengatur satu jenis biaya dari hulu ke hilir:
// identitas & unit penerbit (kasir jenis), tarif per prodi/angkatan (m_biaya lewat /v1/keuangan/tarif),
// pembagian ke unit (aturan biaya /v1/biaya), dan penerimaan di loket kasir (jadwal + aturan kasir.terima).

const TARIF = '/v1/keuangan/tarif';

export interface TarifBiayaBaris {
  idb: number;
  kode_prodi: string;
  nama_prodi: string | null;
  kode_jenjang: string | null;
  kode_shift: string | null;
  semester_masuk: string | null;
  kampus: string | null;
  nama_kampus: string | null;
  rupiah: number;
  persen_krs: number;
  persen_ujian: number;
  persen_her: number;
}

export interface TarifBiaya {
  kode_biaya: string;
  nama: string | null;
  tahun_id: string;
  data: TarifBiayaBaris[];
  pilihan: { prodi: string[]; shift: string[]; kampus: Array<{ kode: string; nama: string }>; wajib_angkatan: boolean; wajib_rupiah: boolean };
}

/** Tarif satu jenis biaya di semua prodi yang dikelola (GET /v1/keuangan/tarif/biaya). */
export function useTarifBiaya(kodeBiaya: string, tahunId?: string | null) {
  return useSiakadQuery<TarifBiaya>([TARIF, 'biaya', kodeBiaya, tahunId ?? ''], (s, signal) =>
    s.request({ method: 'GET', path: `${TARIF}/biaya`, query: { kode_biaya: kodeBiaya, ...(tahunId ? { tahun_id: tahunId } : {}) } }, { signal }),
  );
}

const namaProdi = (r: { kode_prodi: string; nama_prodi: string | null; kode_jenjang: string | null }) =>
  [r.kode_jenjang, namaRapi(r.nama_prodi) || r.kode_prodi].filter(Boolean).join(' ');
const persen = (n: number) => (n ? `${formatNumber(n)}%` : '—');

// ================================================================ Daftar

export interface DaftarKomponenBiayaProps {
  /** Buka detail satu komponen (mis. navigasi ke /komponen-biaya/:kode). */
  onPilih: (kodeBiaya: string) => void;
  className?: string;
}

/** Daftar jenis biaya dalam lingkup pengguna; klik baris membuka detail, tombol Tambah membuka form bertahap. */
export function DaftarKomponenBiaya({ onPilih, className }: DaftarKomponenBiayaProps) {
  const sq = useKasirKelolaSaya();
  const jq = useJenisBiayaKasir();
  const [tambah, setTambah] = React.useState(false);
  const [cari, setCari] = React.useState('');
  const saya = sq.data;
  if (sq.error) return <GalatApi error={sq.error} onRetry={sq.refetch} />;
  if (!saya) return <Spinner />;
  const c = cari.trim().toLowerCase();
  const rows = c ? jq.data?.filter((j) => `${j.kode_biaya} ${j.nama} ${j.unit ?? ''}`.toLowerCase().includes(c)) : jq.data;
  const kolom: DataColumn<JenisBiayaKasir>[] = [
    { key: 'kode_biaya', header: 'Kode', value: (j) => j.kode_biaya, cell: (j) => <span className="u-ksu-mono">{j.kode_biaya}</span>, mobile: 'subtitle', shrink: true },
    { key: 'nama', header: 'Nama', value: (j) => j.nama, mobile: 'title' },
    { key: 'unit', header: 'Unit penerbit', value: (j) => namaUnitPenerbitKasir(saya, j.unit_id, j.unit) },
    { key: 'kategori', header: 'Kategori', value: (j) => (j.kategori ? (saya.kategori[j.kategori] ?? j.kategori) : '') },
    { key: 'perlakuan', header: 'Penagihan', value: (j) => labelPerlakuanKasir(j.perlakuan) },
    { key: 'aktif', header: 'Status', value: (j) => (j.aktif ? 'Aktif' : 'Nonaktif'), cell: (j) => <Badge variant={j.aktif ? 'success' : 'neutral'}>{j.aktif ? 'Aktif' : 'Nonaktif'}</Badge>, mobile: 'badge', shrink: true },
  ];
  return (
    <div className={cn('u-ksu-tumpuk', className)}>
      <DataTable<JenisBiayaKasir>
        columns={kolom}
        rows={rows}
        rowKey={(j) => j.kode_biaya}
        loading={jq.loading}
        error={jq.error}
        onRetry={jq.refetch}
        filtered={Boolean(c)}
        emptyFiltered={{ title: 'Tidak ditemukan', onReset: () => setCari('') }}
        toolbar={
          <span className="u-ksu-cari">
            <Search aria-hidden />
            <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kode, nama, atau unit" aria-label="Cari komponen biaya" />
          </span>
        }
        actions={
          <Button onClick={() => setTambah(true)}>
            <Plus /> Tambah komponen biaya
          </Button>
        }
        onRowClick={(j) => onPilih(j.kode_biaya)}
        empty={{ title: 'Belum ada komponen biaya', description: 'Tambahkan komponen seperti BPP, gedung, almamater, atau praktikum beserta unit penerbitnya.', icon: <Receipt /> }}
        mobile="cards"
        exportCsv="komponen-biaya"
      />
      <FormJenisBiayaKasir open={tambah} onOpenChange={setTambah} saya={saya} daftar={jq.data ?? []} />
    </div>
  );
}

// ================================================================ Detail

type TabKomponen = 'identitas' | 'tarif' | 'pembagian' | 'penerimaan';

export interface DetailKomponenBiayaProps {
  kodeBiaya: string;
  onKembali?: () => void;
  tabAwal?: TabKomponen;
  className?: string;
}

/** Detail satu komponen biaya: identitas & penerbit, tarif per prodi/angkatan, pembagian, dan penerimaan kasir. */
export function DetailKomponenBiaya({ kodeBiaya, onKembali, tabAwal = 'identitas', className }: DetailKomponenBiayaProps) {
  const sq = useKasirKelolaSaya();
  const jq = useJenisBiayaKasir();
  const [ubah, setUbah] = React.useState(false);
  if (sq.error || jq.error) return <GalatApi error={sq.error ?? jq.error} onRetry={() => (sq.refetch(), jq.refetch())} />;
  if (!sq.data || !jq.data) return <Spinner />;
  const saya = sq.data;
  const jenis = jq.data.find((j) => j.kode_biaya === kodeBiaya);
  const kembali = onKembali && (
    <Button variant="ghost" size="sm" onClick={onKembali} className="u-kb-kembali">
      <ArrowLeft /> Semua komponen biaya
    </Button>
  );
  if (!jenis)
    return (
      <div className={cn('u-ksu-tumpuk', className)}>
        {kembali}
        <Empty bordered icon={<Receipt />} title={`Komponen ${kodeBiaya} tidak ditemukan`} description="Komponen ini tidak ada atau di luar unit yang boleh Anda atur." />
      </div>
    );
  return (
    <div className={cn('u-ksu-tumpuk', className)}>
      {kembali}
      <header className="u-kb-kepala">
        <div>
          <h2>{jenis.nama}</h2>
          <p>
            <span className="u-ksu-mono">{jenis.kode_biaya}</span> · Diterbitkan {namaUnitPenerbitKasir(saya, jenis.unit_id, jenis.unit)}
            {!jenis.aktif && <Badge variant="neutral">Nonaktif</Badge>}
          </p>
        </div>
        <Button variant="outline" onClick={() => setUbah(true)}>
          <Pencil /> Ubah identitas
        </Button>
      </header>
      <Tabs<TabKomponen>
        defaultValue={tabAwal}
        aria-label="Pengaturan komponen biaya"
        items={[
          { value: 'identitas', label: 'Identitas & penerbit', icon: <Building2 />, content: <RingkasanIdentitas saya={saya} jenis={jenis} /> },
          { value: 'tarif', label: 'Tarif', icon: <Coins />, content: <TarifKomponen kodeBiaya={jenis.kode_biaya} nama={jenis.nama} /> },
          { value: 'pembagian', label: 'Pembagian', icon: <Split />, content: <KelolaAturanBiaya judul={null} kodeBiaya={jenis.kode_biaya} /> },
          {
            value: 'penerimaan',
            label: 'Penerimaan kasir',
            icon: <CalendarClock />,
            content: (
              <div className="u-ksu-tumpuk">
                <JadwalPenerimaanBiaya saya={saya} jenis={jenis} />
                <section className="u-ksu-tumpuk" aria-labelledby="u-kb-aturan">
                  <h3 id="u-kb-aturan" className="u-kb-subjudul">
                    <Gavel aria-hidden /> Aturan penerimaan
                  </h3>
                  <AturanPenerimaanKasir saya={saya} />
                </section>
              </div>
            ),
          },
        ]}
      />
      <FormJenisBiayaKasir open={ubah} onOpenChange={setUbah} saya={saya} jenis={jenis} daftar={jq.data} />
    </div>
  );
}

function RingkasanIdentitas({ saya, jenis }: { saya: KasirKelolaSaya; jenis: JenisBiayaKasir }) {
  const baris: Array<[string, React.ReactNode]> = [
    ['Kode', <span className="u-ksu-mono">{jenis.kode_biaya}</span>],
    ['Nama', jenis.nama],
    ['Unit penerbit', namaUnitPenerbitKasir(saya, jenis.unit_id, jenis.unit)],
    ['Dipungut di', jenis.unit_id == null || jenis.unit_id === saya.bauk_id ? 'Loket BAUK saja' : 'Loket unit penerbit dan BAUK'],
    ['Kategori', jenis.kategori ? (saya.kategori[jenis.kategori] ?? jenis.kategori) : 'Belum diatur'],
    ['Penagihan', labelPerlakuanKasir(jenis.perlakuan)],
    ['Tagih otomatis', jenis.tagih_otomatis ? `Ya${jenis.nominal_bawaan ? `, ${formatRupiah(jenis.nominal_bawaan)}` : ''}` : 'Tidak'],
    ['Bayar di muka', jenis.bayar_dimuka ? (jenis.dimuka_hari ? `Ya, paling cepat ${jenis.dimuka_hari} hari sebelum dibuka` : 'Ya') : 'Tidak'],
    ['Status', jenis.aktif ? 'Aktif' : 'Nonaktif'],
    ...(jenis.keterangan ? ([['Keterangan', jenis.keterangan]] as Array<[string, React.ReactNode]>) : []),
  ];
  return (
    <dl className="u-kb-ringkas">
      {baris.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

// ================================================================ Tarif

interface IsianTarif {
  idb: number | null;
  prodi: string | null;
  semester_masuk: string;
  kode_shift: string | null;
  kampus: string | null;
  rupiah: string;
  persen_krs: string;
  persen_ujian: string;
  persen_her: string;
}

const angka = (s: string) => s.replace(/[^\d.]/g, '');

/** Tarif satu komponen biaya per prodi, angkatan, shift, dan kampus untuk satu periode. */
export function TarifKomponen({ kodeBiaya, nama }: { kodeBiaya: string; nama?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [tahun, setTahun] = React.useState<string | null>(null);
  const q = useTarifBiaya(kodeBiaya, tahun);
  const [form, setForm] = React.useState<IsianTarif | null>(null);
  const [hapus, setHapus] = React.useState<TarifBiayaBaris | null>(null);
  const d = q.data;
  const tahunId = tahun ?? d?.tahun_id ?? null;
  const kolom: DataColumn<TarifBiayaBaris>[] = [
    { key: 'prodi', header: 'Program studi', value: (r) => namaProdi(r), mobile: 'title' },
    { key: 'angkatan', header: 'Angkatan', value: (r) => r.semester_masuk ?? '', cell: (r) => (r.semester_masuk ? labelTahunAkademik(r.semester_masuk, true) : <span className="u-ksu-redup">Semua</span>) },
    { key: 'shift', header: 'Kelas', value: (r) => r.kode_shift ?? '' },
    { key: 'kampus', header: 'Kampus', value: (r) => r.nama_kampus ?? r.kampus ?? '' },
    { key: 'rupiah', header: 'Nominal', align: 'end', value: (r) => r.rupiah, cell: (r) => formatRupiah(r.rupiah), mobile: 'badge' },
    { key: 'krs', header: 'Syarat KRS', align: 'end', value: (r) => r.persen_krs, cell: (r) => persen(r.persen_krs) },
    { key: 'ujian', header: 'Syarat ujian', align: 'end', value: (r) => r.persen_ujian, cell: (r) => persen(r.persen_ujian), defaultHidden: true },
    { key: 'her', header: 'Syarat her', align: 'end', value: (r) => r.persen_her, cell: (r) => persen(r.persen_her), defaultHidden: true },
  ];
  const isianDari = (r: TarifBiayaBaris): IsianTarif => ({
    idb: r.idb,
    prodi: r.kode_prodi,
    semester_masuk: r.semester_masuk ?? '',
    kode_shift: r.kode_shift,
    kampus: r.kampus,
    rupiah: String(r.rupiah || ''),
    persen_krs: String(r.persen_krs || ''),
    persen_ujian: String(r.persen_ujian || ''),
    persen_her: String(r.persen_her || ''),
  });
  const baru = (): IsianTarif => ({
    idb: null,
    prodi: d?.pilihan.prodi.length === 1 ? d.pilihan.prodi[0]! : null,
    semester_masuk: '',
    kode_shift: d?.pilihan.shift.length === 1 ? d.pilihan.shift[0]! : null,
    kampus: d?.pilihan.kampus.length === 1 ? d.pilihan.kampus[0]!.kode : null,
    rupiah: '',
    persen_krs: '',
    persen_ujian: '',
    persen_her: '',
  });
  return (
    <div className="u-ksu-tumpuk">
      {q.error && !d ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : (
        <DataTable<TarifBiayaBaris>
          columns={kolom}
          rows={d?.data}
          rowKey={(r) => String(r.idb)}
          loading={q.loading}
          error={q.error}
          onRetry={q.refetch}
          toolbar={<PilihTahunAkademik value={tahunId} onValueChange={(x) => setTahun(x)} placeholder="Periode aktif" size="sm" aria-label="Periode tarif" className="u-ksu-pilih-periode" />}
          actions={
            <Button onClick={() => setForm(baru())} disabled={!d}>
              <Plus /> Tambah tarif
            </Button>
          }
          onRowClick={(r) => setForm(isianDari(r))}
          rowActions={(r) => [
            { label: 'Ubah', icon: <Pencil />, onSelect: () => setForm(isianDari(r)) },
            { label: 'Hapus', icon: <Trash2 />, destructive: true, onSelect: () => setHapus(r) },
          ]}
          empty={{
            title: `Belum ada tarif ${nama ?? kodeBiaya} di periode ini`,
            description: 'Tambahkan nominal per program studi dan angkatan. Tarif dipakai saat tagihan mahasiswa diterbitkan.',
            icon: <Coins />,
          }}
          mobile="cards"
          exportCsv={`tarif-${kodeBiaya}-${tahunId ?? ''}`}
        />
      )}
      {d && <FormTarif awal={form} onOpenChange={(o) => !o && setForm(null)} data={d} tahunId={tahunId ?? d.tahun_id} />}
      <ConfirmDialog
        open={Boolean(hapus)}
        onOpenChange={(o) => !o && setHapus(null)}
        title="Hapus tarif ini?"
        description={hapus ? `${namaProdi(hapus)}, ${hapus.semester_masuk ? `angkatan ${labelTahunAkademik(hapus.semester_masuk, true)}` : 'semua angkatan'}: ${formatRupiah(hapus.rupiah)}. Tarif yang sudah dipakai menerbitkan tagihan tidak bisa dihapus.` : undefined}
        confirmLabel="Hapus tarif"
        onConfirm={async () => {
          try {
            await siakad.request({ method: 'POST', path: `${TARIF}/${hapus!.idb}/hapus`, query: { prodi: hapus!.kode_prodi, tahun_id: tahunId ?? undefined } });
            toast.add({ title: 'Tarif dihapus', type: 'success' });
            invalidateSiakad(TARIF);
          } catch (e) {
            toast.add({ title: 'Tarif tidak dihapus', description: pesanGalat(e), type: 'error' });
          }
        }}
      />
    </div>
  );
}

function FormTarif({ awal, onOpenChange, data, tahunId }: { awal: IsianTarif | null; onOpenChange: (o: boolean) => void; data: TarifBiaya; tahunId: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [v, setV] = React.useState<IsianTarif | null>(awal);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (awal) {
      setV(awal);
      setGalat({});
    }
  }, [awal]);
  const prodiRef = useSiakadQuery(['referensi', 'prodi'], (s, signal) => s.referensi.getProdi({}, { signal }), { staleTime: 10 * 60_000 });
  const opsiProdi: SelectOption<string>[] = React.useMemo(() => {
    const nama = new Map(((prodiRef.data ?? []) as Array<Record<string, unknown>>).map((p) => [String(p.kode_prodi), [p.kode_jenjang, namaRapi(String(p.nama_prodi ?? ''))].filter(Boolean).join(' ')]));
    return data.pilihan.prodi.map((k) => ({ value: k, label: nama.get(k) || k, description: k }));
  }, [prodiRef.data, data.pilihan.prodi]);
  if (!v) return null;
  const set = (x: Partial<IsianTarif>) => setV((o) => (o ? { ...o, ...x } : o));
  const ubah = v.idb != null;
  return (
    <PanelForm
      open={Boolean(awal)}
      onOpenChange={onOpenChange}
      title={ubah ? 'Ubah tarif' : 'Tambah tarif'}
      description={`${data.nama ?? data.kode_biaya}, periode ${labelTahunAkademik(tahunId)}`}
      labelSimpan={ubah ? 'Simpan perubahan' : 'Tambah tarif'}
      onSimpan={async () => {
        const g: Record<string, string> = {};
        if (!v.prodi) g.prodi = 'Pilih program studi.';
        if (data.pilihan.wajib_angkatan && !/^\d{5}$/.test(v.semester_masuk)) g.semester_masuk = 'Isi angkatan, mis. 20251.';
        if (v.semester_masuk && !/^\d{5}$/.test(v.semester_masuk)) g.semester_masuk = 'Angkatan 5 angka, mis. 20251.';
        if (!v.kode_shift) g.kode_shift = 'Pilih kelas.';
        if (!v.kampus) g.kampus = 'Pilih kampus.';
        if (data.pilihan.wajib_rupiah && !v.rupiah) g.rupiah = 'Isi nominal.';
        setGalat(g);
        if (Object.keys(g).length) return false;
        try {
          await siakad.request({
            method: 'POST',
            path: TARIF,
            query: { prodi: v.prodi!, tahun_id: tahunId },
            body: {
              ...(ubah ? { idb: v.idb } : {}),
              kode_biaya: data.kode_biaya,
              jenis: data.nama ?? data.kode_biaya,
              kode_shift: v.kode_shift,
              kampus: v.kampus,
              semester_masuk: v.semester_masuk,
              rupiah: v.rupiah || '0',
              persen_krs: v.persen_krs || '0',
              persen_ujian: v.persen_ujian || '0',
              persen_her: v.persen_her || '0',
            },
          });
          toast.add({ title: ubah ? 'Tarif diperbarui' : 'Tarif ditambahkan', type: 'success' });
          invalidateSiakad(TARIF);
          return null;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    >
      <div className="u-ksu-isian">
        <Field label="Program studi" required error={galat.prodi}>
          <Pilihan options={opsiProdi} value={v.prodi} tampilan="cari" placeholder="Pilih program studi" disabled={ubah} onValueChange={(x) => set({ prodi: x })} />
        </Field>
        <Field
          label="Angkatan"
          required={data.pilihan.wajib_angkatan}
          optional={!data.pilihan.wajib_angkatan}
          error={galat.semester_masuk}
          description={data.pilihan.wajib_angkatan ? 'Periode masuk mahasiswa, mis. 20251 untuk angkatan Ganjil 2025/2026.' : 'Kosongkan bila berlaku untuk semua angkatan.'}
        >
          <Input value={v.semester_masuk} inputMode="numeric" maxLength={5} onChange={(e) => set({ semester_masuk: e.target.value.replace(/\D/g, '') })} />
        </Field>
        <div className="u-ksu-dua">
          <Field label="Kelas" required error={galat.kode_shift}>
            <Pilihan options={data.pilihan.shift.map((s) => ({ value: s, label: s }))} value={v.kode_shift} placeholder="Pilih kelas" onValueChange={(x) => set({ kode_shift: x })} />
          </Field>
          <Field label="Kampus" required error={galat.kampus}>
            <Pilihan options={data.pilihan.kampus.map((k) => ({ value: k.kode, label: k.nama || k.kode }))} value={v.kampus} placeholder="Pilih kampus" onValueChange={(x) => set({ kampus: x })} />
          </Field>
        </div>
        <Field label="Nominal (Rp)" required={data.pilihan.wajib_rupiah} error={galat.rupiah} description={v.rupiah ? formatRupiah(Number(v.rupiah)) : undefined}>
          <Input value={v.rupiah} inputMode="numeric" onChange={(e) => set({ rupiah: e.target.value.replace(/\D/g, '') })} />
        </Field>
        <Field label="Syarat pembayaran" optional description="Persen minimal yang sudah dibayar sebelum mahasiswa boleh KRS, ujian, atau her registrasi. Kosong = tanpa syarat.">
          <div className="u-kb-tiga">
            <Input value={v.persen_krs} inputMode="decimal" aria-label="Syarat KRS (%)" placeholder="KRS %" onChange={(e) => set({ persen_krs: angka(e.target.value) })} />
            <Input value={v.persen_ujian} inputMode="decimal" aria-label="Syarat ujian (%)" placeholder="Ujian %" onChange={(e) => set({ persen_ujian: angka(e.target.value) })} />
            <Input value={v.persen_her} inputMode="decimal" aria-label="Syarat her registrasi (%)" placeholder="Her %" onChange={(e) => set({ persen_her: angka(e.target.value) })} />
          </div>
        </Field>
      </div>
    </PanelForm>
  );
}

// ================================================================ Gabungan

export interface HalamanKomponenBiayaProps {
  /** Kode komponen yang dibuka (dari rute /komponen-biaya/:kode); kosong = daftar. */
  kodeBiaya?: string | null;
  onPilih: (kodeBiaya: string) => void;
  onKembali: () => void;
  className?: string;
}

/** Halaman Komponen biaya: daftar, atau detail bila `kodeBiaya` diisi. */
export function HalamanKomponenBiaya({ kodeBiaya, onPilih, onKembali, className }: HalamanKomponenBiayaProps) {
  return kodeBiaya ? <DetailKomponenBiaya kodeBiaya={kodeBiaya} onKembali={onKembali} className={className} /> : <DaftarKomponenBiaya onPilih={onPilih} className={className} />;
}
