'use client';
import * as React from 'react';
import { ArrowRightLeft, Ban, Check, Link2, Pencil, Plus, Search, X } from 'lucide-react';
import { Select } from '../components/select';
import { Field, Input, SegmentedControl, Textarea } from '../components/forms';
import { Alert, Empty } from '../components/display';
import { Badge, Button, Spinner } from '../components/actions';
import { ConfirmDialog, Dialog, Sheet, useToast } from '../components/overlays';
import { DatePicker } from '../components/calendar';
import { CariAtauUnggahDokumen } from './cari-dokumen';
import { cn } from '../lib/cn';
import { AjukanPencatatanSK, KartuSK, STATUS_SK, type SKRegistri } from './isian-sk';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

/*
 * Halaman registri SK tunggal (SIAKAD /v1/sk, docs/SK.md) untuk unit penerbit dan pengawas:
 *   - KelolaSK / DaftarSK: cari, catat SK baru, verifikasi ajuan pencatatan dari unit lain, cabut, gabung catatan ganda.
 *   - RiwayatSK: rantai SK yang mengubah/mencabut.
 *   - useSK / useDaftarSK: data registri.
 * Aplikasi penerbit (Dasbor Pimpinan/Rektorat, Fakultas, unit) memasang KelolaSK di menu "Registri SK"; Pustikom
 * memasangnya dengan `pengawasan` untuk melihat semua dan menggabungkan duplikat.
 */

export interface DetailSK extends SKRegistri {
  pemakaian: Array<{ modul: string; tabel: string; baris: string; peran: string; label: string; uraian: string | null; oleh: string | null; sejak: string | null }>;
  mengubah: Array<{ id: string; nomor: string; perihal: string | null; jenis: 'mengubah' | 'mencabut'; status: SKRegistri['status'] }>;
  diubah_oleh_sk: Array<{ id: string; nomor: string; perihal: string | null; jenis: 'mengubah' | 'mencabut'; status: SKRegistri['status'] }>;
  ganda: SKRegistri[];
  boleh: { catat: boolean };
}

export interface SaringanSK {
  q?: string;
  status?: string;
  jenis?: string;
  penerbit?: number | null;
}

/** Detail SK registri (GET /v1/sk/{id}): pemakaian, relasi, catatan ganda, hak. */
export function useSK(id: string | null | undefined) {
  return useSiakadQuery<DetailSK>(['sk', 'detail', id], (s, signal) => s.request<DetailSK>({ method: 'GET', path: `/v1/sk/${id}` }, { signal }), { enabled: !!id, staleTime: 10_000 });
}

/** Daftar SK registri (GET /v1/sk). meta.unit_catat = unit tempat pengguna boleh mencatat (null = semua). */
export function useDaftarSK(s: SaringanSK = {}) {
  return useSiakadQuery<SKRegistri[]>(
    ['sk', 'daftar', s],
    (k, signal) => k.request<SKRegistri[]>({ method: 'GET', path: '/v1/sk', query: { q: s.q || undefined, status: s.status || undefined, jenis: s.jenis || undefined, penerbit: s.penerbit ?? undefined, per_page: 50, arsip: '0' } }, { signal }),
    { staleTime: 10_000 },
  );
}

/** Rantai perubahan SK: SK yang diubah/dicabut oleh SK ini, dan SK yang mengubah/mencabut SK ini. */
export function RiwayatSK({ sk, onBuka }: { sk: Pick<DetailSK, 'mengubah' | 'diubah_oleh_sk' | 'status'>; onBuka?: (id: string) => void }) {
  if (!sk.mengubah.length && !sk.diubah_oleh_sk.length) return <p className="u-sk-kosong">Belum ada SK yang mengubah atau dicabut oleh SK ini.</p>;
  const baris = (x: DetailSK['mengubah'][number], arah: 'keluar' | 'masuk') => (
    <li key={`${arah}${x.id}`}>
      <ArrowRightLeft aria-hidden />
      <span>
        {arah === 'keluar' ? (x.jenis === 'mencabut' ? 'Mencabut' : 'Mengubah') : x.jenis === 'mencabut' ? 'Dicabut oleh' : 'Diubah oleh'}{' '}
        {onBuka ? (
          <button type="button" className="u-sk-tautan" onClick={() => onBuka(x.id)}>
            {x.nomor}
          </button>
        ) : (
          <strong>{x.nomor}</strong>
        )}
        {x.perihal ? ` (${x.perihal})` : ''}
      </span>
      <Badge variant={STATUS_SK[x.status]?.variant ?? 'neutral'}>{STATUS_SK[x.status]?.label ?? x.status}</Badge>
    </li>
  );
  return (
    <ul className="u-riwayat-sk">
      {sk.diubah_oleh_sk.map((x) => baris(x, 'masuk'))}
      {sk.mengubah.map((x) => baris(x, 'keluar'))}
    </ul>
  );
}

const isoKeTanggal = (s?: string | null) => (s ? new Date(`${s.slice(0, 10)}T00:00:00`) : null);
const tanggalKeIso = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null);

/**
 * Ubah SK oleh penerbit (POST /v1/sk/{id}): tanggal, perihal, penandatangan dari data pejabat (tidak diketik), tempat,
 * berkas SK (satu, di Berkas unit penerbit), dan gambar tanda tangan resmi. Salinan di modul pemakai ikut diselaraskan.
 */
export function UbahSK({ sk, open, onOpenChange, onTersimpan }: { sk: DetailSK; open: boolean; onOpenChange: (o: boolean) => void; onTersimpan?: () => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [isi, setIsi] = React.useState({ nomor: sk.nomor, tanggal: sk.tanggal ?? null, perihal: sk.perihal ?? '', pejabat: sk.penandatangan?.pejabat_id ?? null, tempat: sk.tempat ?? '', berkas: null as string | null, ttd: null as string | null });
  const [kirim, setKirim] = React.useState(false);
  const pejabat = useSiakadQuery<Array<{ pejabat_id: number; nama: string; jabatan: string }>>(
    ['sk', 'penandatangan', sk.penerbit?.unit_id ?? null],
    (s, signal) => s.request({ method: 'GET', path: '/v1/sk/penandatangan', query: { unit_id: sk.penerbit?.unit_id ?? undefined } }, { signal }),
    { enabled: open && !!sk.penerbit?.unit_id },
  );
  const simpan = async () => {
    setKirim(true);
    try {
      await siakad.request({
        method: 'POST',
        path: `/v1/sk/${sk.id}`,
        body: {
          nomor: isi.nomor, tanggal: isi.tanggal, perihal: isi.perihal || null, tempat: isi.tempat || null,
          ...(isi.pejabat ? { penandatangan_pejabat_id: isi.pejabat } : {}), ...(isi.berkas ? { berkas_id: isi.berkas } : {}), ...(isi.ttd ? { ttd_berkas_id: isi.ttd } : {}),
        },
      });
      invalidateSiakad('sk');
      toast.add({ title: 'SK diperbarui', description: 'Modul yang merujuk SK ini ikut menampilkan data terbaru.', type: 'success' });
      onTersimpan?.();
      onOpenChange(false);
    } catch (e) {
      toast.add({ title: 'SK belum tersimpan', description: pesanGalat(e), type: 'error' });
    } finally {
      setKirim(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={`Ubah SK ${sk.nomor}`}
      description="Hanya unit penerbit. Penandatangan dipilih dari data pejabat; berkas cukup diunggah sekali di sini."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={simpan} loading={kirim} disabled={!isi.nomor.trim()}>
            Simpan
          </Button>
        </>
      }
    >
      <div className="u-ajukan-sk">
        <Field label="Nomor SK" required description="Tulisan resmi penerbit. Nomor yang sama di penerbit sama ditolak.">
          <Input value={isi.nomor} onChange={(e) => setIsi((x) => ({ ...x, nomor: e.target.value }))} />
        </Field>
        <div className="u-ajukan-sk-dua">
          <Field label="Tanggal SK" optional>
            <DatePicker value={isoKeTanggal(isi.tanggal)} onValueChange={(d) => setIsi((x) => ({ ...x, tanggal: tanggalKeIso(d) }))} />
          </Field>
          <Field label="Ditetapkan di" optional>
            <Input value={isi.tempat} onChange={(e) => setIsi((x) => ({ ...x, tempat: e.target.value }))} />
          </Field>
        </div>
        <Field label="Perihal" optional>
          <Input value={isi.perihal} onChange={(e) => setIsi((x) => ({ ...x, perihal: e.target.value }))} />
        </Field>
        <Field label="Penandatangan" description="Dari data pejabat (Organisasi & pejabat), tidak diketik.">
          <Select<number>
            value={isi.pejabat}
            onValueChange={(v) => setIsi((x) => ({ ...x, pejabat: v }))}
            options={(pejabat.data ?? []).map((p) => ({ value: p.pejabat_id, label: p.nama, description: p.jabatan }))}
            placeholder={(pejabat.data ?? []).length ? 'Pilih pejabat' : 'Belum ada pejabat aktif di unit penerbit'}
          />
        </Field>
        <Field label={sk.berkas?.ada ? 'Ganti berkas SK' : 'Berkas SK'} optional description="Satu berkas, disimpan di Berkas unit penerbit; unit lain membacanya dari registri.">
          <CariAtauUnggahDokumen value={isi.berkas} onValueChange={(id) => setIsi((x) => ({ ...x, berkas: id }))} accept=".pdf,.jpg,.jpeg,.png" kategori="sk" placeholder="Cari atau unggah berkas SK" />
        </Field>
        <Field label="Gambar tanda tangan" optional description="Hanya tanda tangan resmi penandatangan (PNG transparan); dipakai dokumen turunan seperti kalender unduhan.">
          <CariAtauUnggahDokumen value={isi.ttd} onValueChange={(id) => setIsi((x) => ({ ...x, ttd: id }))} accept=".png,.jpg,.jpeg" kategori="sk" placeholder="Cari atau unggah gambar tanda tangan" />
        </Field>
      </div>
    </Dialog>
  );
}

/** Lembar rincian SK: kartu, pemakaian, riwayat, catatan ganda, dan aksi penerbit (verifikasi, cabut, gabung). */
export function RincianSK({ id, open, onOpenChange, onBuka }: { id: string | null; open: boolean; onOpenChange: (o: boolean) => void; onBuka?: (id: string) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const { data: sk, loading, error, refetch } = useSK(open ? id : null);
  const [catatan, setCatatan] = React.useState('');
  const [ubah, setUbah] = React.useState(false);
  const aksi = async (judul: string, path: string, body: Record<string, unknown>) => {
    try {
      await siakad.request({ method: 'POST', path, body });
      invalidateSiakad('sk');
      refetch();
      toast.add({ title: judul, type: 'success' });
    } catch (e) {
      toast.add({ title: 'Gagal', description: pesanGalat(e), type: 'error' });
      throw e;
    }
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange} size="lg" title={sk ? `SK ${sk.nomor}` : 'Rincian SK'} description="Satu SK, satu catatan. Modul lain merujuk SK ini; berkasnya dibaca dari sini.">
      {loading && !sk ? (
        <Spinner />
      ) : error ? (
        <Alert variant="danger">{pesanGalat(error)}</Alert>
      ) : sk ? (
        <div className="u-rincian-sk">
          <KartuSK
            sk={sk}
            aksi={
              sk.boleh.catat && sk.status !== 'ditolak' ? (
                <Button size="sm" variant="ghost" onClick={() => setUbah(true)}>
                  <Pencil /> Ubah
                </Button>
              ) : undefined
            }
          />
          {ubah && <UbahSK sk={sk} open onOpenChange={setUbah} onTersimpan={refetch} />}
          {sk.boleh.catat && sk.status === 'draf' && (
            <Alert
              variant="warning"
              title="Ajuan pencatatan menunggu verifikasi Anda"
              actions={
                <>
                  <Button size="sm" onClick={() => aksi('SK diterbitkan di registri', `/v1/sk/${sk.id}/verifikasi`, { keputusan: 'terima', catatan: catatan || undefined })}>
                    <Check /> Terima
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="outline">
                        <X /> Tolak
                      </Button>
                    }
                    title="Tolak ajuan pencatatan?"
                    description="Tulis alasan di kolom catatan lebih dulu. SK yang ditolak tidak bisa dirujuk lagi."
                    confirmLabel="Tolak ajuan"
                    onConfirm={() => aksi('Ajuan ditolak', `/v1/sk/${sk.id}/verifikasi`, { keputusan: 'tolak', catatan })}
                  />
                </>
              }
            >
              Periksa nomor dan berkasnya. Lengkapi penandatangan lewat Ubah bila perlu.
              <Field label="Catatan" optional>
                <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} />
              </Field>
            </Alert>
          )}
          <section>
            <h3 className="u-sk-subjudul">Dipakai di ({sk.pemakaian.length})</h3>
            {sk.pemakaian.length ? (
              <ul className="u-sk-pakai">
                {sk.pemakaian.map((p) => (
                  <li key={`${p.tabel}${p.baris}${p.peran}`}>
                    <Link2 aria-hidden />
                    <span>
                      <strong>{p.label}</strong>
                      {p.uraian ? `: ${p.uraian}` : ` #${p.baris}`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="u-sk-kosong">Belum dirujuk modul mana pun.</p>
            )}
          </section>
          <section>
            <h3 className="u-sk-subjudul">Riwayat perubahan</h3>
            <RiwayatSK sk={sk} onBuka={onBuka} />
          </section>
          {sk.ganda.length > 0 && (
            <section>
              <h3 className="u-sk-subjudul">Catatan lain bernomor sama</h3>
              <Alert variant="warning">Nomor ini tercatat lebih dari sekali. Gabungkan agar semua modul merujuk satu SK.</Alert>
              {sk.ganda.map((g) => (
                <KartuSK
                  key={g.id}
                  sk={g}
                  aksi={
                    sk.boleh.catat ? (
                      <ConfirmDialog
                        trigger={
                          <Button size="sm" variant="outline">
                            Gabungkan ke SK ini
                          </Button>
                        }
                        title="Gabungkan catatan ganda?"
                        description={`Rujukan dan berkas dari ${g.nomor} dipindah ke ${sk.nomor}; catatan ganda dihapus.`}
                        confirmLabel="Gabungkan"
                        tone="primary"
                        onConfirm={() => aksi('Catatan digabung', `/v1/sk/${g.id}/gabung`, { ke: sk.id })}
                      />
                    ) : undefined
                  }
                />
              ))}
            </section>
          )}
          {sk.boleh.catat && sk.status === 'terbit' && (
            <ConfirmDialog
              trigger={
                <Button variant="outline" size="sm">
                  <Ban /> Cabut SK
                </Button>
              }
              title={`Cabut SK ${sk.nomor}?`}
              description="SK ditandai dicabut. Modul yang merujuknya tetap menyimpan rujukan untuk riwayat."
              confirmLabel="Cabut SK"
              onConfirm={() => aksi('SK dicabut', `/v1/sk/${sk.id}/cabut`, { catatan: catatan || undefined })}
            />
          )}
        </div>
      ) : null}
    </Sheet>
  );
}

export interface KelolaSKProps {
  /** Unit penerbit bawaan untuk saringan dan pencatatan (induk_unit.id). */
  penerbitUnitId?: number | null;
  /** Mode pengawasan Pustikom: semua penerbit, saringan ganda. */
  pengawasan?: boolean;
  /** Jenis SK bawaan saat mencatat. */
  jenis?: string;
  className?: string;
}

/**
 * Registri SK untuk unit penerbit: cari, catat SK baru (penandatangan dari data pejabat), verifikasi ajuan pencatatan
 * dari unit lain, cabut, dan gabungkan catatan ganda. Pasang di menu "Registri SK".
 */
export function KelolaSK({ penerbitUnitId = null, pengawasan, jenis, className }: KelolaSKProps) {
  const [q, setQ] = React.useState('');
  const [kata, setKata] = React.useState('');
  const [status, setStatus] = React.useState<'semua' | 'terbit' | 'draf' | 'dicabut'>(pengawasan ? 'semua' : 'semua');
  const [penerbit, setPenerbit] = React.useState<number | null>(penerbitUnitId);
  const [catat, setCatat] = React.useState(false);
  const [buka, setBuka] = React.useState<string | null>(null);
  React.useEffect(() => {
    const t = setTimeout(() => setKata(q), 300);
    return () => clearTimeout(t);
  }, [q]);
  const daftar = useDaftarSK({ q: kata, status: status === 'semua' ? undefined : status === 'dicabut' ? 'dicabut,diubah' : status, penerbit });
  const unitPenerbit = useSiakadQuery<Array<{ unit_id: number; nama: string; boleh_catat: boolean }>>(['sk', 'penerbit'], (s, signal) => s.request({ method: 'GET', path: '/v1/sk/penerbit' }, { signal }), {
    staleTime: 5 * 60_000,
  });
  const unitCatat = (daftar.meta as { unit_catat?: number[] | null } | undefined)?.unit_catat;
  const bolehCatat = unitCatat === null || (Array.isArray(unitCatat) && unitCatat.length > 0);
  const menunggu = (daftar.data ?? []).filter((s) => s.status === 'draf').length;
  return (
    <div className={cn('u-kelola-sk', className)}>
      <div className="u-kelola-sk-alat">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nomor atau perihal SK" aria-label="Cari SK" />
        <SegmentedControl<'semua' | 'terbit' | 'draf' | 'dicabut'>
          value={status}
          onValueChange={setStatus}
          options={[
            { value: 'semua', label: 'Semua' },
            { value: 'terbit', label: 'Terbit' },
            { value: 'draf', label: menunggu ? `Ajuan (${menunggu})` : 'Ajuan' },
            { value: 'dicabut', label: 'Dicabut/diubah' },
          ]}
          aria-label="Status SK"
        />
        <Select<number>
          value={penerbit}
          onValueChange={setPenerbit}
          placeholder="Semua penerbit"
          aria-label="Unit penerbit"
          options={[...(unitPenerbit.data ?? []).filter((u) => pengawasan || u.boleh_catat || u.unit_id === penerbitUnitId).map((u) => ({ value: u.unit_id, label: u.nama }))]}
        />
        {penerbit !== null && (
          <Button variant="ghost" size="sm" onClick={() => setPenerbit(null)}>
            Semua penerbit
          </Button>
        )}
        {bolehCatat && (
          <Button onClick={() => setCatat(true)}>
            <Plus /> Catat SK
          </Button>
        )}
      </div>
      {!bolehCatat && !pengawasan && (
        <Alert variant="info" title="Hanya melihat">
          Anda belum memegang izin pencatat SK (sk.catat) di unit mana pun. Minta peran Pencatat SK unit ke Pustikom bila unit Anda menerbitkan SK.
        </Alert>
      )}
      {daftar.loading && !daftar.data ? (
        <Spinner />
      ) : daftar.error ? (
        <Alert variant="danger">{pesanGalat(daftar.error)}</Alert>
      ) : (daftar.data ?? []).length === 0 ? (
        <Empty icon={<Search />} title="Belum ada SK" description={kata ? 'Tidak ada SK yang cocok dengan pencarian.' : 'SK yang dicatat unit penerbit tampil di sini.'} bordered />
      ) : (
        <div className="u-kelola-sk-daftar">
          {(daftar.data ?? []).map((s) => (
            <KartuSK
              key={s.id}
              sk={s}
              aksi={
                <Button variant="ghost" size="sm" onClick={() => setBuka(s.id)}>
                  Rincian
                </Button>
              }
            />
          ))}
        </div>
      )}
      {catat && (
        <AjukanPencatatanSK
          open
          onOpenChange={(o) => !o && setCatat(false)}
          jenis={jenis}
          penerbitUnitId={penerbit ?? penerbitUnitId}
          onTercatat={(s) => {
            setCatat(false);
            invalidateSiakad('sk');
            daftar.refetch();
            setBuka(s.id);
          }}
        />
      )}
      <RincianSK id={buka} open={!!buka} onOpenChange={(o) => !o && setBuka(null)} onBuka={setBuka} />
    </div>
  );
}

/** Alias {@link KelolaSK} untuk halaman baca saja (tombol catat tetap mengikuti izin sk.catat). */
export const DaftarSK = KelolaSK;
