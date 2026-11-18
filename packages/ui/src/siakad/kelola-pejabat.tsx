'use client';
import * as React from 'react';
import { AlertTriangle, BadgeCheck, KeyRound, ShieldCheck, UserRoundX } from 'lucide-react';
import { Combobox, Select } from '../components/select';
import { DatePicker, parseISODate, toISODate } from '../components/calendar';
import { Checkbox, Field, Input, SegmentedControl, Textarea } from '../components/forms';
import { Alert, Avatar } from '../components/display';
import { Badge, Button, Skeleton } from '../components/actions';
import { Sheet } from '../components/overlays';
import { PilihInduk } from '../components/pohon';
import { PilihSK, type SKRegistri } from './isian-sk';
import { pesanGalat, useSiakad } from './provider';

// ================================================================ Kelola pejabat (komponen bersama)

/**
 * Panel tambah/ubah pejabat struktural ber-SK, dipakai bersama Pustikom (Organisasi & pejabat), SDM (Struktur organisasi),
 * Fakultas (struktur fakultas saya), dan alur karier dosen ("Tetapkan pejabat dari usulan").
 *
 * - Unit dipilih dari pohon (`unit`, dibatasi sub-pohon `akar`); jabatan hanya yang berlaku untuk jenis unit itu
 *   (struktur jabatan unit dari server: `GET {basis}/unit/{id}/jabatan`).
 * - Pegawai dicari dari SDM/dosen/karyawan/akun (`GET {basis}/pegawai?q=`); peran yang akan didapat dan bentrok masa
 *   diperiksa langsung (`POST {basis}/pejabat/periksa`), dengan pilihan mengakhiri pejabat lama sehari sebelum TMT baru.
 * - SK WAJIB dari registri SK tunggal (`PilihSK`, bisa "Catat SK pengangkatan sekarang"); Plt/Plh memakai surat tugas.
 * - Kampus (opsional) untuk pejabat per kampus; bentrok dihitung per kampus.
 * - `basis`: awalan API. Bawaan `/v1/induk/organisasi` (Pustikom, SDM ber-izin sdm.pejabat.kelola); Fakultas memakai
 *   `/v1/fakultas/{kode}/organisasi` yang membatasi unit ke fakultasnya.
 *
 *   <KelolaPejabat unit={unit} kampus={kampus} awal={{ unit_id: 21, jabatan_id: 18 }} tutup={...} selesai={(p) => ...} />
 *   <KelolaPejabat basis={`/v1/fakultas/${kode}/organisasi`} akar={fakultasId} unit={unit} jabatanTerkunci={['DEKAN', 'WD1']} onUsulkan={...} ... />
 */

export interface UnitPejabat {
  id: number;
  induk_id: number | null;
  nama: string;
  kode?: string;
  jenis?: string;
  aktif?: boolean;
  /** Kampus tempat unit tersedia (m_kampus.idkp); kosong = semua kampus. */
  kampus?: string[];
}

export interface KampusPejabat {
  idkp: string;
  nama: string;
  utama?: boolean;
}

export interface CalonPejabat {
  nama: string;
  username?: string | null;
  nidn?: string | null;
  nik_karyawan?: string | null;
  nip?: string | null;
}

export interface AwalKelolaPejabat {
  unit_id?: number | null;
  jabatan_id?: number | null;
  /** Calon pejabat (mis. dari usulan karier dosen). */
  calon?: CalonPejabat | null;
  sk_id?: string | null;
  idkp?: string | null;
  mulai?: string | null;
  jenis_penugasan?: JenisPenugasanPejabat;
  catatan?: string | null;
}

export type JenisPenugasanPejabat = 'definitif' | 'plt' | 'plh';

/** Jawaban pejabat dari server (sebagian kolom). */
export interface PejabatTersimpan {
  id: number;
  nama: string;
  jabatan: string;
  unit: string;
  [k: string]: unknown;
}

export interface KelolaPejabatProps {
  /** Unit yang boleh dipilih (datar). */
  unit: UnitPejabat[];
  /** Batasi pilihan ke unit ini dan turunannya. */
  akar?: number | null;
  kampus?: KampusPejabat[];
  /** ID pejabat yang diubah (kosong = tambah). */
  id?: number | null;
  awal?: AwalKelolaPejabat;
  /** Awalan API organisasi. Bawaan `/v1/induk/organisasi`. */
  basis?: string;
  /** Kode jabatan yang tidak boleh ditetapkan di sini (mis. Dekan/Wakil Dekan dari Fakultas): tampil nonaktif. */
  jabatanTerkunci?: string[];
  /** Tombol "Usulkan" untuk jabatan terkunci (mis. alur usulan jabatan struktural). */
  onUsulkan?: (unitId: number, jabatanId: number | null) => void;
  /** Teks tambahan di kepala panel (mis. "Fakultas Ilmu Komputer"). */
  keterangan?: React.ReactNode;
  tutup: () => void;
  selesai: (p: PejabatTersimpan, pesan: string) => void;
}

interface Pegawai {
  nama: string;
  jenis?: string;
  nidn: string | null;
  nik_karyawan: string | null;
  username: string | null;
  nip: string | null;
  sumber?: string[];
  akun?: string | null;
}

interface JabatanUnitBaris {
  jabatan_id: number;
  kode: string;
  label: string;
  tersedia: boolean;
  sumber: string;
  tidak_berlaku?: boolean;
  /** Dari server lingkup unit (mis. Fakultas): jabatan pimpinan yang tidak boleh ditetapkan di sini. */
  terkunci?: boolean;
}

interface Periksa {
  bentrok: { id: number; nama: string; mulai: string; selesai: string | null; jenis: string }[];
  peringatan: string[];
  peran: { id: number; kode: string; nama: string; lingkup: string; warisan: { nama: string }[]; berlaku?: string }[];
  akun: { username: string; level: string }[];
  status: string;
}

interface Isian {
  unit_id: number | null;
  jabatan_id: number | null;
  pegawai: Pegawai | null;
  nama: string;
  nip: string;
  sk_id: string | null;
  sk: SKRegistri | null;
  skDiubah: boolean;
  mulai: string;
  selesai: string;
  jenis: JenisPenugasanPejabat;
  catatan: string;
  idkp: string;
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const tgl = (v?: string | null) => {
  if (!v) return '–';
  const [y, m, d] = v.slice(0, 10).split('-').map(Number);
  return y && m && d ? `${d} ${BULAN[m - 1]} ${y}` : v;
};
const geser = (iso: string, hari: number) => {
  const d = parseISODate(iso);
  if (!d) return '';
  d.setDate(d.getDate() + hari);
  return toISODate(d);
};
const kunciUnit = (u: UnitPejabat) => String(u.id);
const indukUnit = (u: UnitPejabat) => u.induk_id;
const labelUnit = (u: UnitPejabat) => u.nama;
const metaUnit = (u: UnitPejabat) => [u.jenis, u.kode].filter(Boolean).join(' · ');

function Tanggal({ nilai, ganti, min, placeholder = 'Pilih tanggal' }: { nilai: string; ganti: (v: string) => void; min?: string; placeholder?: string }) {
  return <DatePicker value={nilai ? parseISODate(nilai) : null} onValueChange={(d) => ganti(d ? toISODate(d) : '')} min={min ? parseISODate(min) ?? undefined : undefined} placeholder={placeholder} className="u-kp-penuh" />;
}

function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="u-kp-bagian">
      <h3>{judul}</h3>
      {children}
    </section>
  );
}

export function KelolaPejabat({
  unit, akar, kampus = [], id, awal = {}, basis = '/v1/induk/organisasi', jabatanTerkunci = [], onUsulkan, keterangan, tutup, selesai,
}: KelolaPejabatProps) {
  const siakad = useSiakad();
  const ubahMode = id != null;
  const [f, setF] = React.useState<Isian>(() => ({
    unit_id: awal.unit_id ?? null, jabatan_id: awal.jabatan_id ?? null,
    pegawai: awal.calon ? { nama: awal.calon.nama, nidn: awal.calon.nidn ?? null, nik_karyawan: awal.calon.nik_karyawan ?? null, username: awal.calon.username ?? null, nip: awal.calon.nip ?? null, akun: awal.calon.username ?? null } : null,
    nama: awal.calon?.nama ?? '', nip: awal.calon?.nip ?? '', sk_id: awal.sk_id ?? null, sk: null, skDiubah: !!awal.sk_id,
    mulai: awal.mulai ?? '', selesai: '', jenis: awal.jenis_penugasan ?? 'definitif', catatan: awal.catatan ?? '', idkp: awal.idkp ?? '',
  }));
  const [siap, setSiap] = React.useState(!ubahMode);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [pesan, setPesan] = React.useState<string | null>(null);
  const [kirim, setKirim] = React.useState(false);
  const [akhiriLama, setAkhiriLama] = React.useState(true);
  const ubah = <K extends keyof Isian>(k: K, v: Isian[K]) => setF((x) => ({ ...x, [k]: v }));

  // Ubah: muat pejabat.
  React.useEffect(() => {
    if (!ubahMode) return;
    const ctrl = new AbortController();
    siakad.request<Record<string, unknown>>({ method: 'GET', path: `${basis}/pejabat/${id}` }, { signal: ctrl.signal }).then((r) => {
      const p = r.data as Record<string, any>;
      setF({
        unit_id: p.unit_id, jabatan_id: p.jabatan_id,
        pegawai: { nama: p.nama, nidn: p.nidn, nik_karyawan: p.nik_karyawan, username: p.username, nip: p.nip, akun: p.akun?.[0]?.username ?? null },
        nama: p.nama ?? '', nip: p.nip ?? '', sk_id: p.sk?.id ?? null, sk: p.sk ?? null, skDiubah: false, mulai: p.mulai ?? '', selesai: p.selesai ?? '',
        jenis: p.plt ? 'plt' : p.plh ? 'plh' : 'definitif', catatan: p.catatan ?? '', idkp: p.idkp ?? '',
      });
      setSiap(true);
    }).catch((e) => { if (e?.name !== 'AbortError') setPesan(pesanGalat(e)); });
    return () => ctrl.abort();
  }, [ubahMode, id, basis, siakad]);

  // Unit dalam lingkup akar (aktif saja, kecuali yang sedang terpilih).
  const unitPilihan = React.useMemo(() => {
    let rows = unit.filter((u) => u.aktif !== false || u.id === f.unit_id);
    if (akar) {
      const ikut = new Set<number>([akar]);
      let tambah = true;
      while (tambah) {
        tambah = false;
        for (const u of rows) if (u.induk_id && ikut.has(u.induk_id) && !ikut.has(u.id)) { ikut.add(u.id); tambah = true; }
      }
      rows = rows.filter((u) => ikut.has(u.id)).map((u) => (u.id === akar ? { ...u, induk_id: null } : u));
    }
    return rows;
  }, [unit, akar, f.unit_id]);
  const unitPilih = unit.find((u) => u.id === f.unit_id);

  // Jabatan yang berlaku untuk unit terpilih.
  const [jabUnit, setJabUnit] = React.useState<{ jabatan: JabatanUnitBaris[]; pilihan: { id: number; kode: string; nama: string; khusus?: boolean }[] } | null>(null);
  React.useEffect(() => {
    setJabUnit(null);
    if (!f.unit_id) return;
    const ctrl = new AbortController();
    siakad.request<typeof jabUnit>({ method: 'GET', path: `${basis}/unit/${f.unit_id}/jabatan` }, { signal: ctrl.signal })
      .then((r) => setJabUnit(r.data))
      .catch((e) => { if (e?.name !== 'AbortError') setPesan(pesanGalat(e)); });
    return () => ctrl.abort();
  }, [f.unit_id, basis, siakad]);
  const terkunci = new Set(jabatanTerkunci.map((k) => k.toUpperCase()));
  const opsiJabatan = React.useMemo(() => {
    if (!jabUnit) return [];
    const out: { value: string; label: string; description?: string; group: string; disabled?: boolean }[] = [];
    const ada = new Set<number>();
    for (const j of jabUnit.jabatan) {
      if (ada.has(j.jabatan_id) || (j.tidak_berlaku && j.jabatan_id !== f.jabatan_id)) continue;
      ada.add(j.jabatan_id);
      const kunci = terkunci.has(j.kode.toUpperCase()) || j.terkunci === true;
      out.push({ value: String(j.jabatan_id), label: j.label, group: j.tersedia ? 'Jabatan unit ini' : 'Jabatan lain yang sesuai', disabled: kunci, description: kunci ? 'Ditetapkan oleh Rektorat/Pustikom; gunakan Usulkan' : undefined });
    }
    for (const p of jabUnit.pilihan) {
      if (ada.has(p.id)) continue;
      ada.add(p.id);
      const kunci = terkunci.has(p.kode.toUpperCase());
      out.push({ value: String(p.id), label: p.nama, group: p.khusus ? 'Khusus unit ini' : 'Jabatan lain yang sesuai', disabled: kunci, description: kunci ? 'Ditetapkan oleh Rektorat/Pustikom; gunakan Usulkan' : undefined });
    }
    return out;
  }, [jabUnit, f.jabatan_id, jabatanTerkunci.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const adaTerkunci = opsiJabatan.some((o) => o.disabled);
  const labelJabatan = opsiJabatan.find((o) => o.value === String(f.jabatan_id))?.label;

  // Isian kirim.
  const kirimIsian = (akhiri: { id: number; selesai: string } | null) => ({
    unit_id: f.unit_id, jabatan_id: f.jabatan_id,
    username: f.pegawai?.akun ?? f.pegawai?.username ?? null, nidn: f.pegawai?.nidn ?? null, nik_karyawan: f.pegawai?.nik_karyawan ?? null,
    nama: f.nama.trim() || undefined, nip: f.nip.trim() || null, ...(f.skDiubah ? { sk_id: f.sk_id } : {}),
    mulai: f.mulai, selesai: f.selesai || null, jenis_penugasan: f.jenis, catatan: f.catatan.trim() || null, akhiri_lama: akhiri, idkp: f.idkp || null,
  });

  // Pemeriksaan langsung (debounce).
  const lengkap = !!(f.unit_id && f.jabatan_id && f.mulai && f.pegawai);
  const [periksa, setPeriksa] = React.useState<Periksa | null>(null);
  const [memeriksa, setMemeriksa] = React.useState(false);
  const isiPeriksa = lengkap ? JSON.stringify({ ...kirimIsian(null), id: id ?? undefined }) : '';
  React.useEffect(() => {
    setPeriksa(null);
    if (!isiPeriksa) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setMemeriksa(true);
      siakad.request<Periksa>({ method: 'POST', path: `${basis}/pejabat/periksa`, body: JSON.parse(isiPeriksa) }, { signal: ctrl.signal })
        .then((r) => setPeriksa(r.data))
        .catch((e) => { if (e?.name !== 'AbortError') setPeriksa({ bentrok: [], peringatan: [pesanGalat(e)], peran: [], akun: [], status: '' }); })
        .finally(() => setMemeriksa(false));
    }, 400);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [isiPeriksa, basis, siakad]);
  const bentrok = periksa?.bentrok[0];
  const tglAkhirLama = f.mulai ? geser(f.mulai, -1) : '';
  const bisaAkhiri = !!bentrok && bentrok.mulai <= tglAkhirLama;

  const simpan = async () => {
    setGalat({});
    setPesan(null);
    if (bentrok && !(akhiriLama && bisaAkhiri)) return setPesan(`Jabatan ini masih dipegang ${bentrok.nama} pada masa yang sama.`);
    if (!f.sk_id && !(ubahMode && f.sk && !f.skDiubah)) {
      setGalat({ sk_id: 'Pilih SK dari registri, atau catat sekarang.' });
      return setPesan('Pejabat struktural hanya bisa disimpan dengan SK pengangkatan (Plt/Plh: surat tugas).');
    }
    setKirim(true);
    try {
      const isi = kirimIsian(bentrok && akhiriLama && bisaAkhiri ? { id: bentrok.id, selesai: tglAkhirLama } : null);
      const r = await siakad.request<PejabatTersimpan>({ method: ubahMode ? 'PUT' : 'POST', path: ubahMode ? `${basis}/pejabat/${id}` : `${basis}/pejabat`, body: isi });
      const p = r.data;
      selesai(p, `${p.nama} ${ubahMode ? 'diperbarui' : 'ditetapkan'} sebagai ${p.jabatan}.`);
    } catch (e) {
      const err = e as { status?: number; details?: Record<string, unknown> };
      if (err.status === 422 && err.details && Object.keys(err.details).length) setGalat(Object.fromEntries(Object.entries(err.details).map(([k, v]) => [k, String(v)])));
      setPesan(pesanGalat(e));
    } finally {
      setKirim(false);
    }
  };

  const muatPegawai = React.useCallback(async (q: string, signal: AbortSignal) => {
    const r = await siakad.request<Pegawai[]>({ method: 'GET', path: `${basis}/pegawai`, query: { q } }, { signal });
    return Array.isArray(r.data) ? r.data : [];
  }, [siakad, basis]);

  const kampusUnit = kampus.filter((k) => !unitPilih?.kampus?.length || unitPilih.kampus.includes(k.idkp));

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && tutup()}
      title={ubahMode ? 'Ubah pejabat' : 'Tetapkan pejabat'}
      description={<>{keterangan ? <>{keterangan}. </> : null}Pejabat aktif otomatis memegang peran jabatannya selama masa SK.</>}
      size="lg"
      footer={
        <div className="u-kp-kaki">
          <span>{memeriksa ? 'Memeriksa…' : periksa?.status ? `Status setelah disimpan: ${periksa.status === 'aktif' ? 'Aktif' : periksa.status === 'akan_datang' ? 'Akan datang' : 'Berakhir'}` : ''}</span>
          <div>
            <Button variant="outline" onClick={tutup}>Batal</Button>
            <Button loading={kirim} disabled={!lengkap || !siap} onClick={() => void simpan()}>{ubahMode ? 'Simpan perubahan' : 'Tetapkan pejabat'}</Button>
          </div>
        </div>
      }
    >
      {!siap ? (
        <div className="u-kp">{[0, 1, 2, 3].map((i) => <Skeleton key={i} style={{ height: 48 }} />)}</div>
      ) : (
        <div className="u-kp">
          {pesan && <Alert variant="danger">{pesan}</Alert>}

          <Bagian judul="Jabatan">
            <Field label="Unit" required error={galat.unit_id}>
              <PilihInduk<UnitPejabat> rows={unitPilihan} getKey={kunciUnit} getParent={indukUnit} getLabel={labelUnit} getMeta={metaUnit} value={f.unit_id ? String(f.unit_id) : null}
                onValueChange={(k) => setF((x) => ({ ...x, unit_id: k ? Number(k) : null, jabatan_id: null }))} placeholder="Pilih unit…" className="u-kp-penuh" />
            </Field>
            <Field label="Jabatan" required error={galat.jabatan_id} description={adaTerkunci ? 'Jabatan pimpinan yang terkunci ditetapkan oleh Rektorat/Pustikom. Gunakan Usulkan.' : 'Hanya jabatan yang berlaku untuk jenis unit ini.'}>
              <Select<string> value={f.jabatan_id ? String(f.jabatan_id) : null} onValueChange={(v) => ubah('jabatan_id', v ? Number(v) : null)} options={opsiJabatan} disabled={!f.unit_id}
                placeholder={!f.unit_id ? 'Pilih unit dulu' : jabUnit ? 'Pilih jabatan' : 'Memuat jabatan unit…'} />
            </Field>
            {adaTerkunci && onUsulkan && f.unit_id && (
              <div><Button size="sm" variant="soft" onClick={() => onUsulkan(f.unit_id!, f.jabatan_id)}>Usulkan pejabat pimpinan</Button></div>
            )}
            <Field label="Jenis penugasan" description={f.jenis === 'definitif' ? 'Pejabat tetap sesuai SK.' : f.jenis === 'plt' ? 'Pelaksana tugas, selama jabatan definitif kosong.' : 'Pelaksana harian, saat pejabat definitif berhalangan.'}>
              <SegmentedControl<JenisPenugasanPejabat> value={f.jenis} onValueChange={(v) => ubah('jenis', v)} options={[{ value: 'definitif', label: 'Definitif' }, { value: 'plt', label: 'Plt.' }, { value: 'plh', label: 'Plh.' }]} />
            </Field>
            {kampus.length > 1 && (
              <Field label="Kampus" optional error={galat.idkp} description="Isi bila jabatan hanya untuk satu kampus, mis. Koordinator Prodi di kampus pengembangan. Bentrok dihitung per kampus.">
                <Select<string> value={f.idkp} onValueChange={(v) => ubah('idkp', v ?? '')} options={[{ value: '', label: 'Semua kampus' }, ...kampusUnit.map((k) => ({ value: k.idkp, label: k.nama, description: k.utama ? 'Kampus utama' : 'Kampus pengembangan' }))]} />
              </Field>
            )}
          </Bagian>

          <Bagian judul="Pegawai">
            <Field label="Cari pegawai" required error={galat.pegawai ?? galat.nama} description="Dosen atau tendik dari SDM, data dosen/karyawan, dan akun SIAKAD.">
              <Combobox<Pegawai>
                loadItems={muatPegawai}
                minQueryLength={2}
                itemToString={(p) => p.nama}
                itemKey={(p) => `${p.nidn ?? ''}|${p.nik_karyawan ?? ''}|${p.username ?? ''}`}
                renderItem={(p) => (
                  <span className="u-kp-opsi-pegawai">
                    <Avatar name={p.nama} size="sm" />
                    <span>
                      <b>{p.nama}</b>
                      <small>{[p.nidn && `NIDN ${p.nidn}`, p.nik_karyawan && `NIK ${p.nik_karyawan}`, p.akun ? `akun ${p.akun}` : 'belum punya akun'].filter(Boolean).join(' · ')}</small>
                    </span>
                  </span>
                )}
                value={f.pegawai}
                onValueChange={(p) => setF((x) => ({ ...x, pegawai: p, nama: p?.nama ?? '', nip: x.nip || (p?.nip && p.nip !== '-' ? p.nip : '') }))}
                placeholder="Ketik nama, NIDN, NIK, atau username"
                hintText="Ketik minimal 2 huruf."
                emptyText="Pegawai tidak ditemukan."
              />
            </Field>
            {f.pegawai && (
              <div className="u-kp-pegawai">
                <Avatar name={f.pegawai.nama} />
                <div>
                  <b>{f.pegawai.nama}</b>
                  <small>{[f.pegawai.nidn && `NIDN ${f.pegawai.nidn}`, f.pegawai.nik_karyawan && `NIK ${f.pegawai.nik_karyawan}`].filter(Boolean).join(' · ')}</small>
                  {periksa && (periksa.akun.length ? (
                    <span className="u-kp-akun" data-ada="1"><BadgeCheck />Peran diberikan ke akun {periksa.akun.map((a) => <Badge key={a.username} variant="success"><KeyRound />{a.username} · {a.level}</Badge>)}</span>
                  ) : (
                    <span className="u-kp-akun"><UserRoundX />Belum terhubung ke akun SIAKAD: peran belum bisa diberikan.</span>
                  ))}
                </div>
              </div>
            )}
            <div className="u-kp-dua">
              <Field label="Nama di SK" optional description="Bawaan dari data pegawai, lengkap dengan gelar."><Input value={f.nama} onChange={(e) => ubah('nama', e.target.value)} /></Field>
              <Field label="NIP / NIDK" optional error={galat.nip}><Input value={f.nip} onChange={(e) => ubah('nip', e.target.value)} /></Field>
            </div>
          </Bagian>

          <Bagian judul="Surat keputusan">
            <PilihSK
              value={f.sk_id}
              sk={f.sk}
              onValueChange={(skId, sk) => setF((x) => ({ ...x, sk_id: skId, sk, skDiubah: true }))}
              jenis={f.jenis === 'definitif' ? 'pengangkatan' : 'surat_tugas'}
              label={f.jenis === 'definitif' ? 'SK pengangkatan' : 'Surat tugas / SK Plt-Plh'}
              required
              error={galat.sk_id || galat.nomor_sk || galat.tanggal_sk}
              description="Wajib untuk jabatan struktural. Pilih SK dari registri (nomor, tanggal, penandatangan, dan berkas diambil dari sana), atau catat sekarang bila belum ada."
              catatSekarang={{
                label: f.jenis === 'definitif' ? 'Catat SK pengangkatan sekarang' : 'Catat surat tugas sekarang',
                isian: {
                  jenis: f.jenis === 'definitif' ? 'pengangkatan' : 'surat_tugas', untukJabatanId: f.jabatan_id, untukUnitId: f.unit_id,
                  perihal: `${f.jenis === 'definitif' ? 'Pengangkatan' : 'Penugasan pelaksana'} ${labelJabatan ?? 'pejabat'} ${unitPilih?.nama ?? ''}${f.nama || f.pegawai?.nama ? ` (${f.nama || f.pegawai?.nama})` : ''}`.trim(),
                  tanggal: f.mulai || null,
                },
              }}
              tampilPemakaian={id ? { kecuali: { tabel: 'induk_pejabat', baris: id } } : true}
            />
          </Bagian>

          <Bagian judul="Masa jabatan">
            <div className="u-kp-dua">
              <Field label="Mulai (TMT)" required error={galat.mulai}><Tanggal nilai={f.mulai} ganti={(v) => ubah('mulai', v)} /></Field>
              <Field label="Selesai" optional error={galat.selesai} description="Kosongkan bila belum ditentukan."><Tanggal nilai={f.selesai} ganti={(v) => ubah('selesai', v)} min={f.mulai || undefined} placeholder="Belum ditentukan" /></Field>
            </div>
            {f.mulai && (
              <div className="u-kp-cepat">
                Masa cepat:
                {[4, 2, 1].map((th) => (
                  <Button key={th} size="xs" variant="soft" onClick={() => { const d = parseISODate(f.mulai); if (!d) return; d.setFullYear(d.getFullYear() + th); d.setDate(d.getDate() - 1); ubah('selesai', toISODate(d)); }}>{th} tahun</Button>
                ))}
              </div>
            )}
            <Field label="Catatan" optional><Textarea value={f.catatan} onChange={(e) => ubah('catatan', e.target.value)} rows={2} placeholder="mis. menggantikan pejabat sebelumnya" /></Field>
          </Bagian>

          {periksa && (periksa.bentrok.length > 0 || periksa.peringatan.length > 0 || periksa.peran.length > 0) && (
            <Bagian judul="Pemeriksaan">
              {bentrok && (
                <Alert variant="danger" title={`Bentrok dengan ${bentrok.nama}`}>
                  <p>Jabatan ini sudah dipegang {bentrok.nama} ({tgl(bentrok.mulai)} – {bentrok.selesai ? tgl(bentrok.selesai) : 'sekarang'}).</p>
                  {bisaAkhiri ? (
                    <label className="u-kp-centang"><Checkbox checked={akhiriLama} onCheckedChange={(v) => setAkhiriLama(v === true)} />Akhiri jabatan {bentrok.nama} pada <b>{tgl(tglAkhirLama)}</b> (sehari sebelum TMT baru).</label>
                  ) : <p>Ubah tanggal mulai, atau akhiri dulu jabatan {bentrok.nama}.</p>}
                </Alert>
              )}
              {periksa.peringatan.map((p) => <Alert key={p} variant="warning" icon={<AlertTriangle />}>{p}</Alert>)}
              {periksa.peran.length > 0 && (
                <ul className="u-kp-peran">
                  {periksa.peran.map((p) => (
                    <li key={p.id}>
                      <ShieldCheck />
                      <span><b>{p.nama}</b> <Badge variant="outline">{p.lingkup === 'global' ? 'Semua unit' : 'Per unit'}</Badge>{p.warisan.length > 0 && <small>Mewarisi {p.warisan.map((w) => w.nama).join(' › ')}</small>}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Bagian>
          )}
        </div>
      )}
    </Sheet>
  );
}
