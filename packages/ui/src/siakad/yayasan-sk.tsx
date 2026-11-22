'use client';
import * as React from 'react';
import { History, Pencil, Plus, Trash2 } from 'lucide-react';
import { Select } from '../components/select';
import { DatePicker } from '../components/calendar';
import { Field, Input, Switch } from '../components/forms';
import { Alert, Avatar, Empty } from '../components/display';
import { Badge, Button, Spinner } from '../components/actions';
import { ConfirmDialog, Dialog, Sheet, useToast } from '../components/overlays';
import { cn } from '../lib/cn';
import { formatDate } from '../lib/format';
import { PilihBerkas } from './pilih-berkas';
import { useUnggahBerkas } from './berkas';
import { PilihSK } from './isian-sk';
import { lupakanFotoBagan, useFotoApi } from './foto-bagan';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { usePilihBerkas } from '../components/pilih-berkas-lokal';
import { Tekan } from '../components/tekan';

/*
 * Profil Yayasan / Badan Penyelenggara dan kewenangan penerbitan SK (SIAKAD /v1/sk/yayasan, /v1/sk/kewenangan,
 * docs/SK.md). Yayasan dipakai sebagai penerbit "instansi luar" bawaan SK Rektor (Ketua Yayasan sebagai penandatangan);
 * kewenangan menentukan penerbit + penandatangan bawaan per jenis SK / jabatan yang diangkat / jenis unit.
 * Ubah: izin sk.atur (Rektorat, Pustikom) atau administrator. Semua perubahan tercatat di riwayat.
 */

export type JabatanPengurusYayasan = 'pembina' | 'ketua' | 'wakil_ketua' | 'sekretaris' | 'bendahara' | 'anggota' | 'pengawas';

export interface PengurusYayasan {
  id?: number;
  jabatan: JabatanPengurusYayasan;
  jabatan_label?: string;
  /** Organ Yayasan (UU Yayasan): pembina, pengurus, pengawas. */
  organ?: 'pembina' | 'pengurus' | 'pengawas';
  nama: string;
  /** Nama dengan gelar depan/belakang. */
  nama_lengkap?: string;
  gelar_depan?: string | null;
  gelar_belakang?: string | null;
  nik?: string | null;
  telepon?: string | null;
  email?: string | null;
  foto_berkas_id?: string | null;
  mulai: string | null;
  selesai: string | null;
  pejabat_id: number | null;
  sk_id?: string | null;
  akta_nomor?: string | null;
  catatan?: string | null;
  /** Status aktif yang diatur (bukan dihitung dari masa). */
  status_aktif?: boolean;
  /** Menjabat hari ini (status aktif dan dalam masa). */
  aktif?: boolean;
  urut?: number;
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
const LABEL_PENGURUS: Record<JabatanPengurusYayasan, string> = {
  pembina: 'Pembina', ketua: 'Ketua', wakil_ketua: 'Wakil Ketua', sekretaris: 'Sekretaris', bendahara: 'Bendahara', anggota: 'Anggota Pengurus', pengawas: 'Pengawas',
};
const ORGAN: Record<JabatanPengurusYayasan, string> = { pembina: 'Pembina', ketua: 'Pengurus', wakil_ketua: 'Pengurus', sekretaris: 'Pengurus', bendahara: 'Pengurus', anggota: 'Pengurus', pengawas: 'Pengawas' };

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
        <h3 className="u-sk-subjudul">Pembina, Pengurus, dan Pengawas</h3>
        <DaftarPengurusYayasan pengurus={isi.pengurus} boleh={boleh} />
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
          side="right"
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

// ---------------------------------------------------------------- pengurus Yayasan (kartu + panel samping)

/** Potong gambar ke rasio 3:4 (tengah), perkecil ke 600x800, JPEG; menolak berkas > 2 MB atau bukan JPG/PNG. */
async function pasFoto34(file: File): Promise<File> {
  if (!/^image\/(jpeg|png)$/.test(file.type)) throw new Error('Pas foto harus JPG atau PNG.');
  if (file.size > 2 * 1024 * 1024) throw new Error('Pas foto maksimal 2 MB.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('Gambar tidak bisa dibaca.'));
      i.src = url;
    });
    const rasio = 3 / 4;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;
    let sx = 0;
    let sy = 0;
    if (sw / sh > rasio) { sw = Math.round(sh * rasio); sx = Math.round((img.naturalWidth - sw) / 2); } else { sh = Math.round(sw / rasio); sy = Math.round((img.naturalHeight - sh) / 4); }
    const c = document.createElement('canvas');
    c.width = 600;
    c.height = 800;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.88));
    if (!blob) throw new Error('Pas foto gagal diproses.');
    return new File([blob], (file.name.replace(/\.[^.]+$/, '') || 'pas-foto') + '.jpg', { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function FotoPengurus({ p, besar }: { p: PengurusYayasan; besar?: boolean }) {
  const foto = useFotoApi(p.id && p.foto_berkas_id ? `/v1/induk/organisasi/foto/pengurus/${p.id}?v=${p.foto_berkas_id.slice(0, 8)}` : null);
  return (
    <span className="u-yys-foto" data-besar={besar ? '' : undefined}>
      {foto ? <img src={foto} alt={`Pas foto ${p.nama_lengkap ?? p.nama}`} /> : <Avatar name={p.nama} size={besar ? 'lg' : 'md'} />}
    </span>
  );
}

/** Daftar Pembina, Pengurus, Pengawas Yayasan sebagai kartu berpas foto; tambah/ubah lewat panel samping. */
export function DaftarPengurusYayasan({ pengurus, boleh }: { pengurus: PengurusYayasan[]; boleh: boolean }) {
  const [panel, setPanel] = React.useState<PengurusYayasan | 'baru' | null>(null);
  const kelompok = (['pembina', 'pengurus', 'pengawas'] as const).map((o) => ({ o, isi: pengurus.filter((p) => (p.organ ?? 'pengurus') === o) }));
  return (
    <div className="u-yys">
      {pengurus.length === 0 && <p className="u-sk-kosong">Belum ada pengurus. Tambahkan minimal Ketua Yayasan (penandatangan SK pengangkatan Rektor).</p>}
      {kelompok.filter((k) => k.isi.length).map((k) => (
        <section key={k.o}>
          <h4>{k.o === 'pembina' ? 'Pembina' : k.o === 'pengawas' ? 'Pengawas' : 'Pengurus'}</h4>
          <ul className="u-yys-kartu">
            {k.isi.map((p) => (
              <li key={p.id} data-nonaktif={p.aktif === false ? '' : undefined}>
                <Tekan onClick={() => boleh && setPanel(p)} disabled={!boleh} aria-label={`Ubah ${p.nama_lengkap ?? p.nama}`}>
                  <FotoPengurus p={p} />
                  <span>
                    <b>{p.nama_lengkap ?? p.nama}</b>
                    <small>{p.jabatan_label ?? LABEL_PENGURUS[p.jabatan]}</small>
                    <small>{p.mulai ? formatDate(p.mulai) : '…'} – {p.selesai ? formatDate(p.selesai) : 'sekarang'}</small>
                    {p.aktif === false && <Badge variant="neutral">Tidak menjabat</Badge>}
                  </span>
                </Tekan>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {boleh && <div><Button variant="outline" size="sm" onClick={() => setPanel('baru')}><Plus /> Tambah pengurus</Button></div>}
      {panel && <PanelPengurusYayasan awal={panel === 'baru' ? null : panel} tutup={() => setPanel(null)} />}
    </div>
  );
}

const ISIAN_KOSONG = { jabatan: 'ketua' as JabatanPengurusYayasan, nama: '', gelar_depan: '', gelar_belakang: '', nik: '', telepon: '', email: '', foto_berkas_id: null as string | null, mulai: null as string | null, selesai: null as string | null, sk_id: null as string | null, akta_nomor: '', catatan: '', aktif: true };

/** Panel samping tambah/ubah pengurus Yayasan: pas foto 3:4, nama + gelar, jabatan (organ), NIK, kontak, masa, dasar SK/akta, status. */
function PanelPengurusYayasan({ awal, tutup }: { awal: PengurusYayasan | null; tutup: () => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const unggah = useUnggahBerkas({ kategori: 'pas_foto', modul: 'sk', keterangan: 'Pas foto pengurus Yayasan' });
  const [f, setF] = React.useState(() => (awal ? {
    jabatan: awal.jabatan, nama: awal.nama, gelar_depan: awal.gelar_depan ?? '', gelar_belakang: awal.gelar_belakang ?? '', nik: awal.nik ?? '', telepon: awal.telepon ?? '', email: awal.email ?? '',
    foto_berkas_id: awal.foto_berkas_id ?? null, mulai: awal.mulai, selesai: awal.selesai, sk_id: awal.sk_id ?? null, akta_nomor: awal.akta_nomor ?? '', catatan: awal.catatan ?? '', aktif: awal.status_aktif !== false,
  } : { ...ISIAN_KOSONG }));
  const [pratinjau, setPratinjau] = React.useState<string | null>(null);
  const fotoLama = useFotoApi(awal?.id && awal.foto_berkas_id ? `/v1/induk/organisasi/foto/pengurus/${awal.id}?v=${awal.foto_berkas_id.slice(0, 8)}` : null);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [sibuk, setSibuk] = React.useState<null | 'foto' | 'simpan' | 'hapus'>(null);
  const [hapus, setHapus] = React.useState(false);
  const masuk = usePilihBerkas({ accept: '.jpg,.jpeg,.png,image/jpeg,image/png', onFiles: (f) => void pilihFoto(f[0]) });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const pilihFoto = async (file?: File | null) => {
    if (!file) return;
    setGalat((g) => ({ ...g, foto_berkas_id: '' }));
    setSibuk('foto');
    try {
      const kecil = await pasFoto34(file);
      setPratinjau(URL.createObjectURL(kecil));
      const b = await unggah(kecil);
      set('foto_berkas_id', b.id);
    } catch (e) {
      setGalat((g) => ({ ...g, foto_berkas_id: e instanceof Error ? e.message : pesanGalat(e) }));
    } finally {
      setSibuk(null);
    }
  };
  const simpan = async () => {
    setSibuk('simpan');
    setGalat({});
    try {
      const body = { ...f, nik: f.nik || null, gelar_depan: f.gelar_depan || null, gelar_belakang: f.gelar_belakang || null, telepon: f.telepon || null, email: f.email || null, akta_nomor: f.akta_nomor || null, catatan: f.catatan || null };
      await siakad.request({ method: 'POST', path: awal?.id ? `/v1/sk/yayasan/pengurus/${awal.id}` : '/v1/sk/yayasan/pengurus', body });
      if (awal?.id) lupakanFotoBagan();
      invalidateSiakad('sk');
      invalidateSiakad('organisasi');
      toast.add({ title: awal ? 'Pengurus diperbarui' : 'Pengurus ditambahkan', type: 'success' });
      tutup();
    } catch (e) {
      const d = (e as { details?: Record<string, string> })?.details;
      if (d && typeof d === 'object') setGalat(d);
      toast.add({ title: 'Belum tersimpan', description: pesanGalat(e), type: 'error' });
    } finally {
      setSibuk(null);
    }
  };
  const aksi = async (jenis: 'akhiri' | 'hapus') => {
    if (!awal?.id) return;
    setSibuk(jenis === 'hapus' ? 'hapus' : 'simpan');
    try {
      await siakad.request({ method: 'POST', path: `/v1/sk/yayasan/pengurus/${awal.id}/${jenis}`, body: {} });
      invalidateSiakad('sk');
      toast.add({ title: jenis === 'hapus' ? 'Pengurus dihapus' : 'Masa pengurus diakhiri hari ini', type: 'success' });
      tutup();
    } catch (e) {
      toast.add({ title: 'Gagal', description: pesanGalat(e), type: 'error' });
    } finally {
      setSibuk(null);
    }
  };
  const foto = pratinjau ?? fotoLama;
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && tutup()}
      title={awal ? `Ubah ${LABEL_PENGURUS[awal.jabatan].toLowerCase()} Yayasan` : 'Tambah pengurus Yayasan'}
      description="Organ Yayasan (UU Yayasan): Pembina, Pengurus (Ketua, Wakil Ketua, Sekretaris, Bendahara, Anggota), dan Pengawas. Pas foto tampil di bagan organisasi."
      size="lg"
      footer={
        <div className="u-yys-kaki">
          {awal?.id ? (
            <span>
              <Button variant="outline" size="sm" onClick={() => void aksi('akhiri')} disabled={!!sibuk}>Akhiri hari ini</Button>
              <Button variant="destructive-soft" size="sm" onClick={() => setHapus(true)} disabled={!!sibuk}><Trash2 />Hapus</Button>
            </span>
          ) : <span />}
          <span>
            <Button variant="outline" onClick={tutup}>Batal</Button>
            <Button loading={sibuk === 'simpan'} disabled={!f.nama.trim() || sibuk === 'foto'} onClick={() => void simpan()}>{awal ? 'Simpan perubahan' : 'Tambah pengurus'}</Button>
          </span>
        </div>
      }
    >
      <div className="u-yys-form">
        <div className="u-yys-pasfoto">
          <span className="u-yys-foto" data-besar="">{foto ? <img src={foto} alt="Pratinjau pas foto" /> : <Avatar name={f.nama || '?'} size="lg" />}</span>
          <div>
            <b>Pas foto</b>
            <small>JPG/PNG maks 2 MB; dipotong otomatis ke 3:4 (tengah). Gunakan latar polos.</small>
            <span>
              <Button size="sm" variant="outline" loading={sibuk === 'foto'} onClick={() => masuk.buka()}>{foto ? 'Ganti foto' : 'Unggah pas foto'}</Button>
              {f.foto_berkas_id && <Button size="sm" variant="ghost" onClick={() => { set('foto_berkas_id', null); setPratinjau(null); }}>Hapus foto</Button>}
            </span>
            {galat.foto_berkas_id && <em role="alert">{galat.foto_berkas_id}</em>}
            {masuk.elemen}
          </div>
        </div>
        <Field label="Jabatan" required error={galat.jabatan}>
          <Select<JabatanPengurusYayasan> value={f.jabatan} onValueChange={(v) => v && set('jabatan', v)}
            options={(Object.keys(LABEL_PENGURUS) as JabatanPengurusYayasan[]).map((k) => ({ value: k, label: LABEL_PENGURUS[k], group: ORGAN[k] }))} />
        </Field>
        <div className="u-yys-tiga">
          <Field label="Gelar depan" optional><Input value={f.gelar_depan} onChange={(e) => set('gelar_depan', e.target.value)} placeholder="Dr., Prof., H." /></Field>
          <Field label="Nama lengkap" required error={galat.nama}><Input value={f.nama} onChange={(e) => set('nama', e.target.value)} /></Field>
          <Field label="Gelar belakang" optional><Input value={f.gelar_belakang} onChange={(e) => set('gelar_belakang', e.target.value)} placeholder="S.H., M.H." /></Field>
        </div>
        <div className="u-yys-tiga">
          <Field label="NIK" optional error={galat.nik}><Input value={f.nik} onChange={(e) => set('nik', e.target.value.replace(/\D/g, '').slice(0, 16))} inputMode="numeric" /></Field>
          <Field label="Telepon" optional><Input value={f.telepon} onChange={(e) => set('telepon', e.target.value)} /></Field>
          <Field label="Email" optional error={galat.email}><Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
        </div>
        <div className="u-yys-dua">
          <Field label="Mulai menjabat" optional error={galat.mulai}><DatePicker value={isoKeTanggal(f.mulai)} onValueChange={(d) => set('mulai', tanggalKeIso(d))} /></Field>
          <Field label="Selesai" optional error={galat.selesai}><DatePicker value={isoKeTanggal(f.selesai)} onValueChange={(d) => set('selesai', tanggalKeIso(d))} placeholder="Belum ditentukan" /></Field>
        </div>
        <PilihSK value={f.sk_id} onValueChange={(v) => set('sk_id', v)} label="Dasar pengangkatan (SK)" error={galat.sk_id} description="Pilih SK/keputusan Pembina dari registri SK, atau isi nomor akta di bawah." />
        <Field label="Nomor akta" optional><Input value={f.akta_nomor} onChange={(e) => set('akta_nomor', e.target.value)} placeholder="Akta notaris pengangkatan pengurus" /></Field>
        <Field label="Catatan" optional><Input value={f.catatan} onChange={(e) => set('catatan', e.target.value)} /></Field>
        <label className="u-yys-saklar"><Switch checked={f.aktif} onCheckedChange={(v) => set('aktif', !!v)} />Status aktif</label>
      </div>
      {hapus && (
        <ConfirmDialog open onOpenChange={(o) => !o && setHapus(false)} title={`Hapus ${f.nama}?`} description="Hanya untuk salah input. Pergantian pengurus pakai Akhiri supaya riwayatnya tetap ada." confirmLabel="Hapus pengurus" onConfirm={() => void aksi('hapus')} />
      )}
    </Sheet>
  );
}
