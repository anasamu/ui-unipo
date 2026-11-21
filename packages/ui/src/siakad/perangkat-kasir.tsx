'use client';
import * as React from 'react';
import { Ban, CheckCircle2, Clock, Fingerprint, History, MonitorSmartphone, Pencil, Search, ShieldCheck, ShieldX, XCircle } from 'lucide-react';
import { Badge, Button, type BadgeVariant } from '../components/actions';
import { Alert, DescriptionList } from '../components/display';
import { DataTable, type DataColumn } from '../components/data-table';
import { Checkbox, Field, Input, InputGroup, SegmentedControl, Textarea } from '../components/forms';
import { Linimasa } from '../components/linimasa';
import { ConfirmDialog, Sheet, useToast, type MenuEntry } from '../components/overlays';
import { Select, type SelectOption } from '../components/select';
import { formatDate, formatNumber } from '../lib/format';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

// Persetujuan perangkat kasir (UNIPO Kasir desktop): komputer yang memasang aplikasi Kasir baru boleh membuka sesi dan
// menerima pembayaran setelah disetujui pemegang izin kasir.perangkat.setujui (diatur Pustikom). Dipakai di Pustikom
// (Aplikasi & integrasi » Perangkat kasir) dan tab "Perangkat & loket" PengaturanKasirUnit di aplikasi unit.
// API: GET /v1/kasir/kelola/perangkat-persetujuan, POST /v1/kasir/kelola/perangkat/{id}/setujui|tolak|cabut|nama.

const API = '/v1/kasir/kelola';

export type StatusPerangkatKasir = 'menunggu' | 'disetujui' | 'ditolak' | 'dicabut';

export interface UnitPerangkatRingkas {
  id: number;
  kode: string;
  nama: string;
  singkatan?: string | null;
  jenis?: string;
}

export interface PerangkatKasirBaris {
  id: number;
  perangkat_id: string;
  kode: string;
  nama: string;
  status: StatusPerangkatKasir;
  status_label: string;
  aktif: boolean;
  punya_kunci: boolean;
  sidik_kunci: string | null;
  sidik: { nama_komputer?: string; os?: string; arch?: string; versi?: string; pengguna_os?: string } | null;
  versi: string | null;
  os: string | null;
  pengguna: string | null;
  unit_id: number | null;
  unit: UnitPerangkatRingkas | null;
  unit_diminta_id: number | null;
  unit_diminta: UnitPerangkatRingkas | null;
  catatan_pemohon: string | null;
  pemohon: string | null;
  diminta_at: string | null;
  diputus_oleh: string | null;
  diputus_at: string | null;
  alasan: string | null;
  jumlah_transaksi: number;
  terakhir_aktif_at: string | null;
  sesi_aktif: { id: number; kasir: string; dibuka_at: string } | null;
  boleh_setujui?: boolean;
}

export interface PersetujuanPerangkatKasir {
  perangkat: PerangkatKasirBaris[];
  hitung: Record<StatusPerangkatKasir, number>;
  boleh_setujui: boolean;
  global: boolean;
  unit: UnitPerangkatRingkas[];
}

interface RiwayatPerangkat {
  id: number;
  aksi: string;
  status_dari: string | null;
  status_ke: string | null;
  oleh: string | null;
  alasan: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
}

export const STATUS_PERANGKAT_KASIR: Record<StatusPerangkatKasir, { label: string; nada: BadgeVariant; ikon: React.ReactNode }> = {
  menunggu: { label: 'Menunggu', nada: 'warning', ikon: <Clock /> },
  disetujui: { label: 'Disetujui', nada: 'success', ikon: <ShieldCheck /> },
  ditolak: { label: 'Ditolak', nada: 'danger', ikon: <ShieldX /> },
  dicabut: { label: 'Dicabut', nada: 'neutral', ikon: <Ban /> },
};

const AKSI: Record<string, string> = {
  daftar: 'Terdaftar dari aplikasi Kasir',
  ajukan: 'Pengajuan diperbarui',
  setujui: 'Disetujui',
  tolak: 'Ditolak',
  cabut: 'Persetujuan dicabut',
  ganti_nama: 'Nama diganti',
  kunci_baru: 'Kunci perangkat berganti (perlu disetujui ulang)',
  sesi_ditutup: 'Sesi kasir ditutup otomatis',
};

const tgl = (s: string | null | undefined) => (s ? formatDate(s.replace(' ', 'T'), 'medium') : '–');
const namaUnit = (u: UnitPerangkatRingkas | null | undefined) => (u ? u.singkatan || u.nama : null);

export function LencanaPerangkatKasir({ status }: { status: StatusPerangkatKasir }) {
  const s = STATUS_PERANGKAT_KASIR[status] ?? STATUS_PERANGKAT_KASIR.menunggu;
  return (
    <Badge variant={s.nada} className="u-pk-lencana">
      {s.ikon}
      {s.label}
    </Badge>
  );
}

function teksSidik(p: PerangkatKasirBaris): string {
  const s = p.sidik;
  return [s?.nama_komputer, s?.os && `${s.os}${s.arch ? '/' + s.arch : ''}`, (s?.versi || p.versi) && `Kasir v${s?.versi || p.versi}`].filter(Boolean).join(' · ') || '–';
}

/** Panel setujui: pilih unit loket, nama, dan cocokkan kode verifikasi. */
function FormSetujui({ p, data, onOpenChange }: { p: PerangkatKasirBaris | null; data: PersetujuanPerangkatKasir; onOpenChange: (o: boolean) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [unit, setUnit] = React.useState<string | null>(null);
  const [nama, setNama] = React.useState('');
  const [cocok, setCocok] = React.useState(false);
  const [sibuk, setSibuk] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!p) return;
    const awal = p.unit_id ?? p.unit_diminta_id;
    setUnit(awal != null && data.unit.some((u) => u.id === awal) ? String(awal) : null);
    setNama(p.nama);
    setCocok(false);
    setGalat(null);
  }, [p, data.unit]);
  const opsi: SelectOption<string>[] = [
    ...(data.global ? [{ value: 'semua', label: 'Semua unit (loket pusat)', description: 'Boleh menerima jenis biaya terbitan unit mana pun' }] : []),
    ...data.unit.map((u) => ({ value: String(u.id), label: u.singkatan ? `${u.singkatan} · ${u.nama}` : u.nama, description: u.kode })),
  ];
  const simpan = async () => {
    if (!p) return;
    if (!unit) return setGalat('Pilih unit loket.');
    if (!nama.trim()) return setGalat('Nama loket wajib diisi.');
    if (!cocok) return setGalat('Pastikan kode verifikasi sama dengan yang tampil di komputer kasir.');
    setSibuk(true);
    setGalat(null);
    try {
      await siakad.request({ method: 'POST', path: `${API}/perangkat/${p.id}/setujui`, body: { unit_id: unit === 'semua' ? null : Number(unit), nama: nama.trim() } });
      toast.add({ title: `${nama.trim()} disetujui`, description: 'Petugas di komputer itu sudah bisa membuka sesi kasir.', type: 'success' });
      invalidateSiakad(`${API}/perangkat`);
      onOpenChange(false);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSibuk(false);
    }
  };
  return (
    <Sheet
      open={Boolean(p)}
      onOpenChange={(o) => !sibuk && onOpenChange(o)}
      size="md"
      title={`Setujui ${p?.kode ?? ''}`}
      description="Komputer yang disetujui bisa membuka sesi kasir dan menerima pembayaran jenis biaya terbitan unit loketnya."
      footer={
        <div className="u-pk-kaki">
          {galat ? (
            <p className="u-pk-galat" role="alert">
              {galat}
            </p>
          ) : null}
          <span className="u-pk-spasi" />
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sibuk}>
            Batal
          </Button>
          <Button onClick={() => void simpan()} loading={sibuk}>
            <ShieldCheck /> Setujui perangkat
          </Button>
        </div>
      }
    >
      {p && (
        <div className="u-pk-isian">
          <div className="u-pk-sidik" aria-label="Kode verifikasi perangkat">
            <Fingerprint aria-hidden />
            <span>
              <small>Kode verifikasi di komputer kasir</small>
              <strong>{p.sidik_kunci ?? '–'}</strong>
            </span>
          </div>
          <Field label="Unit loket" required description={p.unit_diminta ? `Diminta pemohon: ${namaUnit(p.unit_diminta)}` : 'Pemohon belum memilih unit.'}>
            <Select<string> value={unit} onValueChange={setUnit} options={opsi} placeholder="Pilih…" />
          </Field>
          <Field label="Nama loket" required description="Tampil di kwitansi, laporan, dan riwayat. Mis. Loket FISIP 1.">
            <Input value={nama} maxLength={100} onChange={(e) => setNama(e.target.value)} />
          </Field>
          <label className="u-pk-centang">
            <Checkbox checked={cocok} onCheckedChange={(c) => setCocok(c === true)} />
            <span>
              Kode verifikasi <strong>{p.sidik_kunci}</strong> sama dengan yang tampil di layar Kasir komputer itu (menu Perangkat & printer). Jangan setujui bila berbeda.
            </span>
          </label>
          <DescriptionList
            items={[
              { label: 'Komputer', value: teksSidik(p) },
              { label: 'Pemohon', value: p.pemohon ?? '–' },
              { label: 'Diminta', value: tgl(p.diminta_at) },
              ...(p.catatan_pemohon ? [{ label: 'Catatan pemohon', value: p.catatan_pemohon }] : []),
            ]}
          />
        </div>
      )}
    </Sheet>
  );
}

/** Panel rincian: sidik, status, riwayat, dan aksi. */
function RincianPerangkat({
  p,
  onOpenChange,
  onAksi,
}: {
  p: PerangkatKasirBaris | null;
  onOpenChange: (o: boolean) => void;
  onAksi: (a: 'setujui' | 'tolak' | 'cabut' | 'nama', p: PerangkatKasirBaris) => void;
}) {
  const r = useSiakadQuery<RiwayatPerangkat[]>([`${API}/perangkat`, 'riwayat', p?.id ?? 0], (s, signal) => s.request({ method: 'GET', path: `${API}/perangkat/${p!.id}/riwayat` }, { signal }), { enabled: Boolean(p) });
  return (
    <Sheet
      open={Boolean(p)}
      onOpenChange={onOpenChange}
      size="md"
      title={p ? `${p.kode} · ${p.nama}` : ''}
      description="Perangkat kasir: komputer yang memasang aplikasi UNIPO Kasir."
      footer={
        p?.boleh_setujui ? (
          <div className="u-pk-kaki">
            <Button variant="ghost" onClick={() => onAksi('nama', p)}>
              <Pencil /> Ganti nama
            </Button>
            <span className="u-pk-spasi" />
            {p.status === 'menunggu' && (
              <Button variant="outline" onClick={() => onAksi('tolak', p)}>
                <XCircle /> Tolak
              </Button>
            )}
            {p.status === 'disetujui' && (
              <Button variant="outline" onClick={() => onAksi('cabut', p)}>
                <Ban /> Cabut
              </Button>
            )}
            {p.status !== 'disetujui' && (
              <Button onClick={() => onAksi('setujui', p)} disabled={!p.punya_kunci}>
                <ShieldCheck /> {p.status === 'menunggu' ? 'Setujui' : 'Setujui lagi'}
              </Button>
            )}
            {p.status === 'disetujui' && (
              <Button variant="ghost" onClick={() => onAksi('setujui', p)}>
                Ubah unit
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      {p && (
        <div className="u-pk-isian">
          <div className="u-pk-status">
            <LencanaPerangkatKasir status={p.status} />
            <span>
              {p.status === 'disetujui'
                ? `Loket ${namaUnit(p.unit) ?? 'semua unit'} · disetujui ${p.diputus_oleh ?? ''} ${tgl(p.diputus_at)}`
                : p.status === 'menunggu'
                  ? `Diminta ${p.pemohon ?? ''} ${tgl(p.diminta_at)}${p.unit_diminta ? ` untuk ${namaUnit(p.unit_diminta)}` : ''}`
                  : `${p.status_label} oleh ${p.diputus_oleh ?? '–'} ${tgl(p.diputus_at)}`}
            </span>
          </div>
          {p.alasan && p.status !== 'disetujui' ? <Alert variant={p.status === 'ditolak' ? 'danger' : 'warning'} title="Alasan">{p.alasan}</Alert> : null}
          {!p.punya_kunci ? (
            <Alert variant="warning" title="Aplikasi Kasir versi lama">
              Komputer ini belum punya kunci perangkat. Perbarui aplikasi UNIPO Kasir lalu buka sekali; setelah itu bisa disetujui.
            </Alert>
          ) : null}
          <div className="u-pk-sidik">
            <Fingerprint aria-hidden />
            <span>
              <small>Kode verifikasi</small>
              <strong>{p.sidik_kunci ?? '–'}</strong>
            </span>
          </div>
          <DescriptionList
            items={[
              { label: 'Komputer', value: teksSidik(p) },
              { label: 'Akun OS', value: p.sidik?.pengguna_os ?? '–' },
              { label: 'Petugas terakhir', value: p.pengguna ?? '–' },
              { label: 'Aktif terakhir', value: tgl(p.terakhir_aktif_at) },
              { label: 'Transaksi', value: formatNumber(p.jumlah_transaksi) },
              { label: 'Sesi kasir', value: p.sesi_aktif ? `Terbuka oleh ${p.sesi_aktif.kasir} sejak ${tgl(p.sesi_aktif.dibuka_at)}` : 'Tidak ada sesi terbuka' },
              ...(p.catatan_pemohon ? [{ label: 'Catatan pemohon', value: p.catatan_pemohon }] : []),
            ]}
          />
          <section className="u-pk-riwayat" aria-label="Riwayat perangkat">
            <h3>
              <History aria-hidden /> Riwayat
            </h3>
            <Linimasa
              items={(r.data ?? []).map((x, i) => ({
                id: x.id,
                judul: AKSI[x.aksi] ?? x.aksi,
                tanggal: tgl(x.created_at),
                keterangan: [x.oleh, x.alasan, x.data && typeof x.data.unit === 'string' ? `loket ${x.data.unit}` : null].filter(Boolean).join(' · ') || undefined,
                status: i === 0 ? 'aktif' : 'lalu',
              }))}
              kosong={<p className="u-pk-redup">{r.loading ? 'Memuat riwayat…' : 'Belum ada riwayat.'}</p>}
            />
          </section>
        </div>
      )}
    </Sheet>
  );
}

export interface PerangkatKasirProps {
  /** Batasi ke perangkat unit ini (aplikasi unit). Kosong = semua dalam lingkup izin. */
  unitId?: number;
  /** Buka rincian perangkat ini saat dimuat (tautan notifikasi `?id=`). */
  bukaId?: number | null;
  className?: string;
}

/**
 * Daftar dan persetujuan perangkat UNIPO Kasir: saringan status, cari, rincian (kode verifikasi, sidik komputer,
 * riwayat), setujui untuk unit loket, tolak, cabut (sesi aktif ditutup otomatis), ganti nama. Tombol aksi hanya tampil
 * bagi pemegang kasir.perangkat.setujui dalam lingkup unitnya; API tetap memeriksa.
 */
export function PerangkatKasir({ unitId, bukaId, className }: PerangkatKasirProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const [status, setStatus] = React.useState<'semua' | StatusPerangkatKasir>('semua');
  const [cari, setCari] = React.useState('');
  const q = useSiakadQuery<PersetujuanPerangkatKasir>([`${API}/perangkat`, 'persetujuan'], (s, signal) => s.request({ method: 'GET', path: `${API}/perangkat-persetujuan` }, { signal }));
  const [rinci, setRinci] = React.useState<number | null>(bukaId ?? null);
  const [setujui, setSetujui] = React.useState<PerangkatKasirBaris | null>(null);
  const [putus, setPutus] = React.useState<{ aksi: 'tolak' | 'cabut'; p: PerangkatKasirBaris } | null>(null);
  const [ganti, setGanti] = React.useState<PerangkatKasirBaris | null>(null);
  const [teks, setTeks] = React.useState('');

  const semua = React.useMemo(
    () => (q.data?.perangkat ?? []).filter((p) => unitId == null || (p.unit_id ?? p.unit_diminta_id) === unitId),
    [q.data, unitId],
  );
  const hitung = React.useMemo(() => {
    const h: Record<string, number> = { semua: semua.length, menunggu: 0, disetujui: 0, ditolak: 0, dicabut: 0 };
    for (const p of semua) h[p.status] = (h[p.status] ?? 0) + 1;
    return h;
  }, [semua]);
  const rows = semua.filter((p) => (status === 'semua' || p.status === status) && (!cari.trim() || `${p.kode} ${p.nama} ${p.pemohon ?? ''} ${p.pengguna ?? ''} ${p.sidik?.nama_komputer ?? ''}`.toLowerCase().includes(cari.trim().toLowerCase())));
  const terpilih = semua.find((p) => p.id === rinci) ?? null;

  const aksi = (a: 'setujui' | 'tolak' | 'cabut' | 'nama', p: PerangkatKasirBaris) => {
    setTeks(a === 'nama' ? p.nama : '');
    if (a === 'setujui') setSetujui(p);
    else if (a === 'nama') setGanti(p);
    else setPutus({ aksi: a, p });
  };
  const kirim = async (path: string, body: Record<string, unknown>, pesan: string) => {
    try {
      await siakad.request({ method: 'POST', path, body });
      toast.add({ title: pesan, type: 'success' });
      invalidateSiakad(`${API}/perangkat`);
    } catch (e) {
      toast.add({ title: 'Belum berhasil', description: pesanGalat(e), type: 'error' });
      throw e;
    }
  };

  const kolom: DataColumn<PerangkatKasirBaris>[] = [
    { key: 'kode', header: 'Kode', value: (p) => p.kode, cell: (p) => <span className="u-pk-mono">{p.kode}</span>, mobile: 'subtitle', shrink: true },
    {
      key: 'nama',
      header: 'Perangkat',
      value: (p) => p.nama,
      cell: (p) => (
        <span className="u-pk-sel">
          <strong>{p.nama}</strong>
          <small>{teksSidik(p)}</small>
        </span>
      ),
      mobile: 'title',
    },
    { key: 'unit', header: 'Unit loket', value: (p) => namaUnit(p.unit) ?? namaUnit(p.unit_diminta) ?? '', cell: (p) => (p.status === 'disetujui' ? namaUnit(p.unit) ?? 'Semua unit' : p.unit_diminta ? <span className="u-pk-redup">Diminta: {namaUnit(p.unit_diminta)}</span> : <span className="u-pk-redup">–</span>) },
    { key: 'pemohon', header: 'Pemohon', value: (p) => p.pemohon ?? '' },
    { key: 'waktu', header: 'Diminta', value: (p) => p.diminta_at ?? '', cell: (p) => tgl(p.diminta_at) },
    { key: 'sidik', header: 'Kode verifikasi', value: (p) => p.sidik_kunci ?? '', cell: (p) => <span className="u-pk-mono">{p.sidik_kunci ?? '–'}</span> },
    { key: 'status', header: 'Status', value: (p) => p.status, cell: (p) => <LencanaPerangkatKasir status={p.status} />, mobile: 'badge', shrink: true },
  ];

  const menuBaris = (p: PerangkatKasirBaris): MenuEntry[] => {
    const m: MenuEntry[] = [{ label: 'Rincian & riwayat', icon: <History />, onSelect: () => setRinci(p.id) }];
    if (!p.boleh_setujui) return m;
    if (p.status !== 'disetujui' && p.punya_kunci) m.push({ label: 'Setujui', icon: <CheckCircle2 />, onSelect: () => aksi('setujui', p) });
    if (p.status === 'menunggu') m.push({ label: 'Tolak', icon: <XCircle />, onSelect: () => aksi('tolak', p) });
    if (p.status === 'disetujui') m.push({ label: 'Cabut persetujuan', icon: <Ban />, onSelect: () => aksi('cabut', p) });
    m.push({ label: 'Ganti nama', icon: <Pencil />, onSelect: () => aksi('nama', p) });
    return m;
  };

  return (
    <div className={['u-pk', className].filter(Boolean).join(' ')}>
      {q.data && !q.data.boleh_setujui ? (
        <Alert variant="info" title="Hanya lihat">
          Menyetujui perangkat kasir butuh izin <code>kasir.perangkat.setujui</code> yang diatur Pustikom (Peran & izin » UNIPO Kasir » Aplikasi desktop).
        </Alert>
      ) : null}
      <DataTable<PerangkatKasirBaris>
        columns={kolom}
        rows={q.data ? rows : undefined}
        rowKey={(p) => String(p.id)}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
        onRowClick={(p) => setRinci(p.id)}
        rowActions={menuBaris}
        filtered={status !== 'semua' || cari.trim() !== ''}
        emptyFiltered={{ onReset: () => (setStatus('semua'), setCari('')) }}
        toolbar={
          <div className="u-pk-alat">
            <SegmentedControl<'semua' | StatusPerangkatKasir>
              aria-label="Saring status perangkat"
              value={status}
              onValueChange={setStatus}
              options={(['semua', 'menunggu', 'disetujui', 'ditolak', 'dicabut'] as const).map((k) => ({
                value: k,
                label: `${k === 'semua' ? 'Semua' : STATUS_PERANGKAT_KASIR[k].label} ${hitung[k] ?? 0}`,
              }))}
            />
            <InputGroup className="u-pk-cari" start={<Search aria-hidden />}>
              <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kode, nama, pemohon" aria-label="Cari perangkat" />
            </InputGroup>
          </div>
        }
        empty={{ title: 'Belum ada perangkat kasir', description: 'Perangkat terdaftar otomatis saat aplikasi UNIPO Kasir dibuka dan petugas masuk di sebuah komputer.', icon: <MonitorSmartphone /> }}
        mobile="cards"
        columnToggle={false}
      />
      {q.data ? <FormSetujui p={setujui} data={q.data} onOpenChange={(o) => !o && setSetujui(null)} /> : null}
      <RincianPerangkat p={terpilih} onOpenChange={(o) => !o && setRinci(null)} onAksi={aksi} />
      <ConfirmDialog
        open={Boolean(putus)}
        onOpenChange={(o) => !o && setPutus(null)}
        title={putus?.aksi === 'cabut' ? `Cabut persetujuan ${putus.p.kode}?` : `Tolak ${putus?.p.kode ?? ''}?`}
        description={
          putus?.aksi === 'cabut'
            ? 'Komputer ini tidak bisa lagi membuka sesi atau menerima pembayaran. Sesi kasir yang terbuka di komputer ini ditutup otomatis.'
            : 'Pemohon diberi tahu dan bisa mengajukan ulang dari aplikasi Kasir.'
        }
        confirmLabel={putus?.aksi === 'cabut' ? 'Cabut persetujuan' : 'Tolak perangkat'}
        tone="danger"
        onConfirm={async () => {
          if (!putus) return;
          if (teks.trim().length < 3) {
            toast.add({ title: 'Alasan wajib diisi', type: 'error' });
            throw new Error('alasan');
          }
          await kirim(`${API}/perangkat/${putus.p.id}/${putus.aksi}`, { alasan: teks.trim() }, putus.aksi === 'cabut' ? 'Persetujuan dicabut' : 'Perangkat ditolak');
          setPutus(null);
        }}
      >
        <Field label="Alasan" required description="Tampil bagi pemohon dan di riwayat perangkat.">
          <Textarea value={teks} onChange={(e) => setTeks(e.target.value)} rows={3} maxLength={255} />
        </Field>
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(ganti)}
        onOpenChange={(o) => !o && setGanti(null)}
        title={`Ganti nama ${ganti?.kode ?? ''}`}
        confirmLabel="Simpan nama"
        tone="primary"
        icon={<Pencil />}
        onConfirm={async () => {
          if (!ganti) return;
          await kirim(`${API}/perangkat/${ganti.id}/nama`, { nama: teks.trim() }, 'Nama perangkat disimpan');
          setGanti(null);
        }}
      >
        <Field label="Nama loket" required>
          <Input value={teks} onChange={(e) => setTeks(e.target.value)} maxLength={100} />
        </Field>
      </ConfirmDialog>
    </div>
  );
}
