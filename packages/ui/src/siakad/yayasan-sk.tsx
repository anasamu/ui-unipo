'use client';
import * as React from 'react';
import { History, Pencil, Plus, Trash2 } from 'lucide-react';
import { Select } from '../components/select';
import { DatePicker } from '../components/calendar';
import { Field, Input, Switch } from '../components/forms';
import { Alert, Empty } from '../components/display';
import { Badge, Button, Spinner } from '../components/actions';
import { ConfirmDialog, Dialog, useToast } from '../components/overlays';
import { cn } from '../lib/cn';
import { formatDate } from '../lib/format';
import { PilihBerkas } from './pilih-berkas';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

/*
 * Profil Yayasan / Badan Penyelenggara dan kewenangan penerbitan SK (SIAKAD /v1/sk/yayasan, /v1/sk/kewenangan,
 * docs/SK.md). Yayasan dipakai sebagai penerbit "instansi luar" bawaan SK Rektor (Ketua Yayasan sebagai penandatangan);
 * kewenangan menentukan penerbit + penandatangan bawaan per jenis SK / jabatan yang diangkat / jenis unit.
 * Ubah: izin sk.atur (Rektorat, Pustikom) atau administrator. Semua perubahan tercatat di riwayat.
 */

export interface PengurusYayasan {
  id?: number;
  jabatan: 'ketua' | 'sekretaris' | 'bendahara' | 'anggota';
  nama: string;
  mulai: string | null;
  selesai: string | null;
  pejabat_id: number | null;
  aktif?: boolean;
}

export interface ProfilYayasanData {
  ada: boolean;
  nama_resmi: string | null;
  singkatan: string | null;
  akta_nomor: string | null;
  akta_tanggal: string | null;
  notaris: string | null;
  sk_kemenkumham_nomor: string | null;
  sk_kemenkumham_tanggal: string | null;
  alamat: string | null;
  telepon: string | null;
  email: string | null;
  situs: string | null;
  logo_berkas_id: string | null;
  pengurus: PengurusYayasan[];
  ketua: { nama: string; jabatan: string; pejabat_id: number | null } | null;
  diubah_oleh: string | null;
  updated_at: string | null;
  boleh: { atur: boolean };
}

export interface KewenanganSKBaris {
  id: number;
  jenis: string | null;
  jenis_label: string;
  jabatan_kode: string | null;
  jenis_unit: string | null;
  penerbit: 'yayasan' | 'universitas' | 'fakultas' | 'unit';
  penerbit_label: string;
  penandatangan_kode: string;
  prioritas: number;
  keterangan: string | null;
  aktif: boolean;
}

const isoKeTanggal = (s?: string | null) => (s ? new Date(`${s.slice(0, 10)}T00:00:00`) : null);
const tanggalKeIso = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null);
const LABEL_PENGURUS: Record<PengurusYayasan['jabatan'], string> = { ketua: 'Ketua', sekretaris: 'Sekretaris', bendahara: 'Bendahara', anggota: 'Anggota' };

export function useProfilYayasan() {
  return useSiakadQuery<ProfilYayasanData>(['sk', 'yayasan'], (s, signal) => s.request<ProfilYayasanData>({ method: 'GET', path: '/v1/sk/yayasan' }, { signal }), { staleTime: 60_000 });
}

/** Riwayat perubahan profil Yayasan dan kewenangan SK (jejak audit). */
export function RiwayatYayasan() {
  const r = useSiakadQuery<Array<{ entitas: string; aksi: string; oleh: string; waktu: string; detail: Record<string, unknown> | null }>>(['sk', 'yayasan', 'riwayat'], (s, signal) =>
    s.request({ method: 'GET', path: '/v1/sk/yayasan/riwayat' }, { signal }),
  );
  if (r.loading && !r.data) return <Spinner />;
  if (!r.data?.length) return <p className="u-sk-kosong">Belum ada perubahan tercatat.</p>;
  const nama: Record<string, string> = { induk_yayasan: 'Profil Yayasan', induk_yayasan_pengurus: 'Pengurus Yayasan', sk_kewenangan: 'Kewenangan SK' };
  return (
    <ul className="u-riwayat-sk">
      {r.data.map((x, i) => (
        <li key={i}>
          <History aria-hidden />
          <span>
            <strong>{nama[x.entitas] ?? x.entitas}</strong> {x.aksi} oleh {x.oleh}
            {x.detail && x.entitas === 'induk_yayasan' && x.aksi === 'ubah' ? ` (${Object.keys(x.detail).join(', ')})` : ''}
          </span>
          <small className="u-kartu-sk-catatan">{formatDate(x.waktu)}</small>
        </li>
      ))}
    </ul>
  );
}

/**
 * Form profil Yayasan / Badan Penyelenggara: identitas, akta pendirian, SK Kemenkumham, kontak, logo, dan pengurus.
 * Nama resmi + Ketua dipakai sebagai penerbit dan penandatangan bawaan SK pengangkatan Rektor.
 */
export function ProfilYayasan({ className }: { className?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useProfilYayasan();
  const [isi, setIsi] = React.useState<ProfilYayasanData | null>(null);
  const [kirim, setKirim] = React.useState(false);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (q.data) setIsi(q.data);
  }, [q.data]);
  if (q.loading && !isi) return <Spinner />;
  if (q.error) return <Alert variant="danger">{pesanGalat(q.error)}</Alert>;
  if (!isi) return null;
  const boleh = isi.boleh.atur;
  const set = <K extends keyof ProfilYayasanData>(k: K, v: ProfilYayasanData[K]) => setIsi((x) => (x ? { ...x, [k]: v } : x));
  const teks = (k: keyof ProfilYayasanData, label: string, opsi: { wajib?: boolean; placeholder?: string } = {}) => (
    <Field label={label} required={opsi.wajib} optional={!opsi.wajib} error={galat[k as string]}>
      <Input value={(isi[k] as string | null) ?? ''} onChange={(e) => set(k, e.target.value as never)} placeholder={opsi.placeholder} disabled={!boleh} />
    </Field>
  );
  const tgl = (k: 'akta_tanggal' | 'sk_kemenkumham_tanggal', label: string) => (
    <Field label={label} optional error={galat[k]}>
      <DatePicker value={isoKeTanggal(isi[k])} onValueChange={(d) => set(k, tanggalKeIso(d))} disabled={!boleh} />
    </Field>
  );
  const ubahPengurus = (i: number, patch: Partial<PengurusYayasan>) => set('pengurus', isi.pengurus.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const simpan = async () => {
    setKirim(true);
    setGalat({});
    try {
      await siakad.request({
        method: 'POST',
        path: '/v1/sk/yayasan',
        body: {
          ...Object.fromEntries(
            (['nama_resmi', 'singkatan', 'akta_nomor', 'akta_tanggal', 'notaris', 'sk_kemenkumham_nomor', 'sk_kemenkumham_tanggal', 'alamat', 'telepon', 'email', 'situs', 'logo_berkas_id'] as const).map((k) => [k, isi[k] || null]),
          ),
          pengurus: isi.pengurus.map(({ jabatan, nama, mulai, selesai, pejabat_id }) => ({ jabatan, nama, mulai, selesai, pejabat_id })),
        },
      });
      invalidateSiakad('sk');
      toast.add({ title: 'Profil Yayasan disimpan', description: 'Dipakai sebagai penerbit bawaan SK pengangkatan Rektor.', type: 'success' });
    } catch (e) {
      const d = (e as { details?: Record<string, string> })?.details;
      if (d && typeof d === 'object') setGalat(d);
      toast.add({ title: 'Profil Yayasan belum tersimpan', description: pesanGalat(e), type: 'error' });
    } finally {
      setKirim(false);
    }
  };
  return (
    <div className={cn('u-yayasan', className)}>
      {!isi.ada && <Alert variant="info" title="Profil Yayasan belum diisi">Isi nama resmi dan Ketua Yayasan agar SK pengangkatan Rektor otomatis memakai penerbit dan penandatangan yang benar.</Alert>}
      {!boleh && <Alert variant="neutral">Hanya pemegang izin sk.atur (Rektorat, Pustikom) yang bisa mengubah profil Yayasan.</Alert>}
      <section className="u-ajukan-sk">
        <h3 className="u-sk-subjudul">Identitas</h3>
        <div className="u-ajukan-sk-dua">
          {teks('nama_resmi', 'Nama resmi', { wajib: true, placeholder: 'mis. Yayasan Pendidikan ...' })}
          {teks('singkatan', 'Singkatan')}
        </div>
        <div className="u-ajukan-sk-dua">
          {teks('akta_nomor', 'Nomor akta pendirian')}
          {tgl('akta_tanggal', 'Tanggal akta')}
        </div>
        {teks('notaris', 'Notaris')}
        <div className="u-ajukan-sk-dua">
          {teks('sk_kemenkumham_nomor', 'SK pengesahan Kemenkumham')}
          {tgl('sk_kemenkumham_tanggal', 'Tanggal SK Kemenkumham')}
        </div>
        <h3 className="u-sk-subjudul">Kontak</h3>
        {teks('alamat', 'Alamat')}
        <div className="u-ajukan-sk-dua">
          {teks('telepon', 'Telepon')}
          {teks('email', 'Email')}
        </div>
        {teks('situs', 'Situs web', { placeholder: 'https://' })}
        <Field label="Logo" optional>
          <PilihBerkas value={isi.logo_berkas_id} onValueChange={(v) => set('logo_berkas_id', v ?? null)} accept=".png,.jpg,.jpeg,.svg" />
        </Field>
        <h3 className="u-sk-subjudul">Pengurus</h3>
        {isi.pengurus.length === 0 && <p className="u-sk-kosong">Belum ada pengurus. Tambahkan minimal Ketua Yayasan (penandatangan SK pengangkatan Rektor).</p>}
        {isi.pengurus.map((p, i) => (
          <div key={i} className="u-yayasan-pengurus">
            <Select<PengurusYayasan['jabatan']>
              value={p.jabatan}
              onValueChange={(v) => v && ubahPengurus(i, { jabatan: v })}
              options={(Object.keys(LABEL_PENGURUS) as PengurusYayasan['jabatan'][]).map((k) => ({ value: k, label: LABEL_PENGURUS[k] }))}
              aria-label="Jabatan pengurus"
              disabled={!boleh}
            />
            <Input value={p.nama} onChange={(e) => ubahPengurus(i, { nama: e.target.value })} placeholder="Nama lengkap dengan gelar" aria-label="Nama pengurus" disabled={!boleh} />
            <DatePicker value={isoKeTanggal(p.mulai)} onValueChange={(d) => ubahPengurus(i, { mulai: tanggalKeIso(d) })} placeholder="Mulai" disabled={!boleh} />
            <DatePicker value={isoKeTanggal(p.selesai)} onValueChange={(d) => ubahPengurus(i, { selesai: tanggalKeIso(d) })} placeholder="Selesai" disabled={!boleh} />
            {p.aktif === false && <Badge variant="neutral">Tidak menjabat</Badge>}
            {boleh && (
              <Button variant="ghost" size="sm" iconOnly aria-label={`Hapus ${p.nama}`} onClick={() => set('pengurus', isi.pengurus.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
            )}
          </div>
        ))}
        {boleh && (
          <div>
            <Button variant="outline" size="sm" onClick={() => set('pengurus', [...isi.pengurus, { jabatan: isi.pengurus.some((p) => p.jabatan === 'ketua') ? 'anggota' : 'ketua', nama: '', mulai: null, selesai: null, pejabat_id: null }])}>
              <Plus /> Tambah pengurus
            </Button>
          </div>
        )}
        {isi.ketua && (
          <p className="u-pilih-sk-saran">
            Penandatangan bawaan SK pengangkatan Rektor: {isi.ketua.jabatan}, {isi.ketua.nama}.
          </p>
        )}
        {boleh && (
          <div>
            <Button onClick={simpan} loading={kirim} disabled={!isi.nama_resmi?.trim()}>
              Simpan profil Yayasan
            </Button>
          </div>
        )}
        <h3 className="u-sk-subjudul">Riwayat perubahan</h3>
        <RiwayatYayasan />
      </section>
    </div>
  );
}

const KOSONG: Omit<KewenanganSKBaris, 'id' | 'jenis_label' | 'penerbit_label'> = { jenis: null, jabatan_kode: null, jenis_unit: null, penerbit: 'universitas', penandatangan_kode: 'REKTOR', prioritas: 0, keterangan: null, aktif: true };

/**
 * Tabel kewenangan penerbitan SK: penerbit dan penandatangan bawaan per jenis SK, jabatan yang diangkat, dan jenis unit.
 * Dipakai PilihSK/AjukanPencatatanSK (GET /v1/sk/bawaan). Baris paling spesifik menang.
 */
export function KewenanganSK({ className }: { className?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useSiakadQuery<KewenanganSKBaris[]>(['sk', 'kewenangan'], (s, signal) => s.request<KewenanganSKBaris[]>({ method: 'GET', path: '/v1/sk/kewenangan' }, { signal }));
  const meta = q.meta as { boleh_atur?: boolean; penerbit?: Record<string, string>; jenis?: Record<string, string> } | undefined;
  const boleh = !!meta?.boleh_atur;
  const [edit, setEdit] = React.useState<(Partial<KewenanganSKBaris> & typeof KOSONG) | null>(null);
  const [kirim, setKirim] = React.useState(false);
  const simpan = async () => {
    if (!edit) return;
    setKirim(true);
    try {
      const { id, jenis, jabatan_kode, jenis_unit, penerbit, penandatangan_kode, prioritas, keterangan, aktif } = edit;
      await siakad.request({ method: 'POST', path: id ? `/v1/sk/kewenangan/${id}` : '/v1/sk/kewenangan', body: { jenis, jabatan_kode, jenis_unit, penerbit, penandatangan_kode, prioritas, keterangan, aktif } });
      invalidateSiakad('sk');
      q.refetch();
      setEdit(null);
      toast.add({ title: 'Kewenangan SK disimpan', type: 'success' });
    } catch (e) {
      toast.add({ title: 'Belum tersimpan', description: pesanGalat(e), type: 'error' });
    } finally {
      setKirim(false);
    }
  };
  const hapus = async (b: KewenanganSKBaris) => {
    await siakad.request({ method: 'POST', path: `/v1/sk/kewenangan/${b.id}/hapus` });
    q.refetch();
    toast.add({ title: 'Baris kewenangan dihapus', type: 'success' });
  };
  if (q.loading && !q.data) return <Spinner />;
  if (q.error) return <Alert variant="danger">{pesanGalat(q.error)}</Alert>;
  return (
    <div className={cn('u-kewenangan-sk', className)}>
      <p className="u-sk-kosong">
        Isian bawaan saat mencatat SK (penerbit dan penandatangan). Baris paling spesifik yang dipakai: jabatan yang diangkat, lalu jenis SK, lalu jenis unit, lalu prioritas. Penandatangan
        diisi kode jabatan (REKTOR, WR1, DEKAN, ...) atau KETUA_YAYASAN.
      </p>
      {!q.data?.length ? (
        <Empty title="Belum ada kewenangan" description="Tambahkan baris kewenangan." bordered />
      ) : (
        <ul className="u-kewenangan-daftar">
          {q.data.map((b) => (
            <li key={b.id} data-nonaktif={!b.aktif || undefined}>
              <div>
                <strong>
                  {b.jenis_label}
                  {b.jabatan_kode ? ` · jabatan ${b.jabatan_kode}` : ''}
                  {b.jenis_unit ? ` · unit ${b.jenis_unit}` : ''}
                </strong>
                <span>
                  Penerbit {b.penerbit_label}, penandatangan {b.penandatangan_kode === 'KETUA_YAYASAN' ? 'Ketua Yayasan' : b.penandatangan_kode} · prioritas {b.prioritas}
                </span>
                {b.keterangan && <span className="u-kartu-sk-catatan">{b.keterangan}</span>}
              </div>
              {!b.aktif && <Badge variant="neutral">Nonaktif</Badge>}
              {boleh && (
                <span className="u-kewenangan-aksi">
                  <Button variant="ghost" size="sm" iconOnly aria-label="Ubah" onClick={() => setEdit({ ...b })}>
                    <Pencil />
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="sm" iconOnly aria-label="Hapus">
                        <Trash2 />
                      </Button>
                    }
                    title="Hapus baris kewenangan?"
                    confirmLabel="Hapus"
                    onConfirm={() => hapus(b)}
                  />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {boleh && (
        <div>
          <Button variant="outline" size="sm" onClick={() => setEdit({ ...KOSONG })}>
            <Plus /> Tambah kewenangan
          </Button>
        </div>
      )}
      {edit && (
        <Dialog
          open
          onOpenChange={(o) => !o && setEdit(null)}
          title={edit.id ? 'Ubah kewenangan SK' : 'Tambah kewenangan SK'}
          footer={
            <>
              <Button variant="ghost" onClick={() => setEdit(null)}>
                Batal
              </Button>
              <Button onClick={simpan} loading={kirim}>
                Simpan
              </Button>
            </>
          }
        >
          <div className="u-ajukan-sk">
            <div className="u-ajukan-sk-dua">
              <Field label="Jenis SK" optional description="Kosong = semua jenis.">
                <Select<string>
                  value={edit.jenis ?? '__semua'}
                  onValueChange={(v) => setEdit({ ...edit, jenis: !v || v === '__semua' ? null : v })}
                  options={[{ value: '__semua', label: 'Semua jenis' }, ...Object.entries(meta?.jenis ?? {}).map(([k, v]) => ({ value: k, label: v }))]}
                />
              </Field>
              <Field label="Jabatan yang diangkat" optional description="Kode jabatan, mis. REKTOR. Kosong = semua.">
                <Input value={edit.jabatan_kode ?? ''} onChange={(e) => setEdit({ ...edit, jabatan_kode: e.target.value.toUpperCase() || null })} />
              </Field>
            </div>
            <div className="u-ajukan-sk-dua">
              <Field label="Jenis unit" optional description="fakultas, prodi, lembaga, ... Kosong = semua.">
                <Input value={edit.jenis_unit ?? ''} onChange={(e) => setEdit({ ...edit, jenis_unit: e.target.value.toLowerCase() || null })} />
              </Field>
              <Field label="Penerbit" required>
                <Select<KewenanganSKBaris['penerbit']>
                  value={edit.penerbit}
                  onValueChange={(v) => v && setEdit({ ...edit, penerbit: v })}
                  options={Object.entries(meta?.penerbit ?? {}).map(([k, v]) => ({ value: k as KewenanganSKBaris['penerbit'], label: v }))}
                />
              </Field>
            </div>
            <div className="u-ajukan-sk-dua">
              <Field label="Penandatangan" required description="Kode jabatan (REKTOR, WR1, DEKAN) atau KETUA_YAYASAN.">
                <Input value={edit.penandatangan_kode} onChange={(e) => setEdit({ ...edit, penandatangan_kode: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="Prioritas" optional>
                <Input inputMode="numeric" value={String(edit.prioritas ?? 0)} onChange={(e) => setEdit({ ...edit, prioritas: Number(e.target.value.replace(/[^\d-]/g, '')) || 0 })} />
              </Field>
            </div>
            <Field label="Keterangan" optional>
              <Input value={edit.keterangan ?? ''} onChange={(e) => setEdit({ ...edit, keterangan: e.target.value || null })} />
            </Field>
            <Field label="Aktif">
              <Switch checked={edit.aktif} onCheckedChange={(v) => setEdit({ ...edit, aktif: !!v })} />
            </Field>
          </div>
        </Dialog>
      )}
    </div>
  );
}
