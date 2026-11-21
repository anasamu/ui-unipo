'use client';
import * as React from 'react';
import { ArrowLeft, ArrowRight, Check, Code2, Lock, Pencil, Plus, Search, Trash2, Users, Waypoints, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { CodeBlock } from '../components/code';
import { Alert, Empty, Stepper } from '../components/display';
import { Field, Input, Switch, Textarea } from '../components/forms';
import { BagianForm, Pilihan, PilihanBanyak, PanelForm } from '../components/formulir';
import { ConfirmDialog, Dialog, useToast } from '../components/overlays';
import { LABEL_JENIS_ATURAN, STATUS_MAHASISWA_ATURAN, kelompokTitik, keteranganTitikRamah, labelKategoriAturan, useKatalogAturan, type JenisAturan, type TitikAturan } from './aturan';
import { GalatApi } from './galat';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

/*
 * Kelola titik penerapan aturan (GET/POST /v1/aturan/titik, scope aturan:admin). Titik bawaan berasal dari kode
 * SIAKAD: hanya judul, keterangan, contoh, pengatur, dan status aktif yang bisa diubah. Titik kustom (kode `kustom.*`)
 * dibuat admin untuk langkah aplikasi yang belum punya titik; aplikasinya memanggil POST /v1/aturan/periksa sendiri.
 */

// ================================================================ Tipe
export type TipeKonteksTitik = 'angka' | 'teks' | 'pilihan' | 'benar_salah';
/** Data tambahan yang dikirim aplikasi saat memeriksa titik kustom. */
export interface KonteksTitikAturan {
  kode: string;
  judul: string;
  tipe: TipeKonteksTitik;
  opsi?: Array<{ nilai: string; label: string }>;
}
export interface TitikKelolaAturan extends Omit<TitikAturan, 'konteks'> {
  /** Kode konteks (titik bawaan) atau definisi lengkap (titik kustom). */
  konteks: Array<string | KonteksTitikAturan>;
  pengatur?: Array<{ jenis: 'peran' | 'izin'; kode: string; keterangan?: string | null }>;
  status_mahasiswa?: string[] | null;
  /** Jumlah aturan aktif di titik ini (untuk peringatan hapus). */
  jumlah_aturan?: number;
}

const SUBJEK: Array<{ v: 'mahasiswa' | 'pegawai' | 'pendaftar' | 'umum'; judul: string; ket: string }> = [
  { v: 'mahasiswa', judul: 'Mahasiswa', ket: 'Yang diperiksa satu mahasiswa: IPK, SKS, status, tagihan, dan data akademik lain.' },
  { v: 'pegawai', judul: 'Pegawai', ket: 'Yang diperiksa dosen atau tendik: masa kerja, jabatan, golongan, BKD/SKP.' },
  { v: 'pendaftar', judul: 'Pendaftar', ket: 'Yang diperiksa calon mahasiswa baru: gelombang, pembayaran, berkas PMB.' },
  { v: 'umum', judul: 'Umum', ket: 'Tidak terkait orang tertentu, mis. hanya hari dan jam. Cocok untuk batas waktu layanan.' },
];
const LABEL_SUBJEK_LAIN: Record<string, string> = { kelas: 'Kelas kuliah', akun: 'Akun' };
const JENIS_AWAM: Record<JenisAturan, string> = {
  syarat: 'Hanya boleh jika memenuhi kondisi, mis. SKS lulus minimal 100.',
  batas_waktu: 'Hanya boleh pada rentang tanggal tertentu.',
  batas_nilai: 'Angka yang dikirim aplikasi tidak boleh melewati batas, mis. paling banyak 24 SKS.',
  akibat: 'Kebijakan yang dipakai SIAKAD (tarif, konversi nilai, predikat) atau menyesuaikan tagihan dengan jejak.',
};
const LABEL_TIPE_KONTEKS: Record<TipeKonteksTitik, string> = { angka: 'Angka', teks: 'Teks', pilihan: 'Pilihan', benar_salah: 'Ya/tidak' };

/** Ubah nama menjadi slug kode, mis. "Mahasiswa mendaftar seminar proposal" → "mahasiswa-mendaftar-seminar-proposal". */
export function slugTitikAturan(nama: string): string {
  return nama
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

// ================================================================ Hook
/** Daftar titik bawaan + kustom (GET /v1/aturan/titik). 404 = SIAKAD belum mendukung kelola titik. */
export function useTitikAturan() {
  return useSiakadQuery<TitikKelolaAturan[]>(['aturan', 'titik-kelola'], (s, signal) => s.request<TitikKelolaAturan[]>({ method: 'GET', path: '/v1/aturan/titik' }, { signal }), { staleTime: 60_000 });
}

function usePeranRbac() {
  return useSiakadQuery<Array<{ kode: string; nama: string }>>(
    ['rbac', 'peran'],
    (s, signal) => s.request<Array<{ kode: string; nama: string }>>({ method: 'GET', path: '/v1/rbac/peran', query: { per_page: 100 } }, { signal }),
    { staleTime: 5 * 60_000 },
  );
}

const konteksObjek = (k: string | KonteksTitikAturan): KonteksTitikAturan => (typeof k === 'string' ? { kode: k, judul: k, tipe: 'teks' } : k);

// ================================================================ Daftar
/**
 * Halaman titik penerapan: daftar per unit dengan lencana Bawaan/Kustom/Nonaktif, tambah titik kustom lewat wizard
 * pendek, ubah titik bawaan (hanya bagian yang aman), dan hapus titik kustom dengan konfirmasi nama.
 */
export function KelolaTitikAturan({ className }: { className?: string }) {
  const q = useTitikAturan();
  const katalog = useKatalogAturan();
  const [cari, setCari] = React.useState('');
  const [wizard, setWizard] = React.useState<{ titik: TitikKelolaAturan | null } | null>(null);
  const [ubahBawaan, setUbahBawaan] = React.useState<TitikKelolaAturan | null>(null);
  const [hapus, setHapus] = React.useState<TitikKelolaAturan | null>(null);
  const status = (q.error as { status?: number } | null)?.status;
  if (q.error && (status === 404 || status === 405))
    return (
      <Alert className={className} title="Kelola titik penerapan belum tersedia">
        Server SIAKAD ini belum mendukung titik penerapan kustom. Titik bawaan tetap bisa dipakai untuk menyusun aturan.
      </Alert>
    );
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  if (!q.data) return <Skeleton height={240} className={className} />;
  const kata = cari.trim().toLowerCase();
  const daftar = q.data.filter((t) => !kata || `${t.judul} ${t.kode} ${t.keterangan}`.toLowerCase().includes(kata));
  const grup = [...new Set(daftar.map(kelompokTitik))];
  return (
    <div className={cn('u-titik-kelola', className)}>
      <div className="u-aturan-saring">
        <div className="u-aturan-cari">
          <Search aria-hidden />
          <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari titik penerapan" aria-label="Cari titik penerapan" />
        </div>
        <div className="u-aturan-saring-aksi">
          <Button onClick={() => setWizard({ titik: null })}>
            <Plus /> Tambah titik
          </Button>
        </div>
      </div>
      {!daftar.length && <Empty bordered icon={<Waypoints />} title="Tidak ada titik yang cocok" />}
      {grup.map((g) => (
        <section key={g} className="u-titik-grup">
          <h4>{g}</h4>
          <ul>
            {daftar
              .filter((t) => kelompokTitik(t) === g)
              .map((t) => (
                <li key={t.kode} data-nonaktif={t.aktif === false || undefined}>
                  <div className="u-titik-isi">
                    <div className="u-titik-judul">
                      <strong>{t.judul}</strong>
                      {t.kustom ? <Badge variant="primary">Kustom</Badge> : <Badge variant="neutral">Bawaan</Badge>}
                      {t.aktif === false && <Badge variant="warning">Nonaktif</Badge>}
                    </div>
                    <span className="u-titik-ket">{keteranganTitikRamah(t.keterangan).replace(/\s*Contoh aturan( kampus)?:.*$/i, '')}</span>
                    <span className="u-titik-meta">
                      <code>{t.kode}</code> · {SUBJEK.find((s) => s.v === t.subjek)?.judul ?? LABEL_SUBJEK_LAIN[t.subjek] ?? t.subjek} ·{' '}
                      {t.jenis.map((j) => LABEL_JENIS_ATURAN[j]?.label ?? j).join(', ')}
                      {t.jumlah_aturan ? ` · ${t.jumlah_aturan} aturan` : ''}
                    </span>
                  </div>
                  <div className="u-titik-aksi">
                    <Button variant="ghost" size="sm" onClick={() => (t.kustom ? setWizard({ titik: t }) : setUbahBawaan(t))}>
                      <Pencil /> Ubah
                    </Button>
                    {t.kustom && (
                      <Button variant="ghost" size="sm" iconOnly aria-label={`Hapus ${t.judul}`} title="Hapus titik" onClick={() => setHapus(t)}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ))}
      <WizardTitikAturan open={wizard !== null} titik={wizard?.titik ?? null} onOpenChange={(o) => !o && setWizard(null)} katalogIndikator={katalog.data?.indikator ?? []} />
      {ubahBawaan && <FormTitikBawaan titik={ubahBawaan} onTutup={() => setUbahBawaan(null)} />}
      <HapusTitikAturan titik={hapus} onTutup={() => setHapus(null)} />
    </div>
  );
}

// ================================================================ Ubah titik bawaan
function FormTitikBawaan({ titik: t, onTutup }: { titik: TitikKelolaAturan; onTutup: () => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const peran = usePeranRbac();
  const awal = React.useMemo(
    () => ({
      judul: t.judul,
      keterangan: t.keterangan ?? '',
      aktif: t.aktif !== false,
      pengatur: (t.pengatur ?? []).filter((p) => p.jenis === 'peran').map((p) => p.kode),
      contoh: (t.contoh ?? []).map((c) => ({ ...c })),
    }),
    [t],
  );
  const [isi, setIsi] = React.useState(awal);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  return (
    <PanelForm
      open
      onOpenChange={(o) => !o && onTutup()}
      title={`Ubah titik: ${t.judul}`}
      description="Titik bawaan dipakai langsung oleh kode SIAKAD, jadi hanya nama, keterangan, contoh, pengatur, dan status aktif yang bisa diubah."
      berubah={JSON.stringify(isi) !== JSON.stringify(awal)}
      labelSimpan="Simpan"
      onSimpan={async () => {
        if (!isi.judul.trim()) {
          setGalat({ judul: 'Nama titik wajib diisi.' });
          return 'Periksa isian yang ditandai.';
        }
        await siakad.request({
          method: 'POST',
          path: `/v1/aturan/titik/${encodeURIComponent(t.kode)}`,
          body: {
            judul: isi.judul.trim(),
            keterangan: isi.keterangan.trim(),
            aktif: isi.aktif,
            contoh: isi.contoh,
            pengatur: isi.pengatur.map((kode) => ({ jenis: 'peran', kode })),
          },
        });
        invalidateSiakad('aturan');
        toast.add({ title: 'Titik diperbarui', type: 'success' });
        onTutup();
      }}
    >
      <div className="u-titik-terkunci">
        <Lock aria-hidden />
        <div>
          <strong>Tidak bisa diubah</strong>
          <span>
            Kode <code>{t.kode}</code>, subjek {SUBJEK.find((s) => s.v === t.subjek)?.judul.toLowerCase() ?? t.subjek}, dan data tambahan (
            {t.konteks.length ? t.konteks.map((k) => konteksObjek(k).kode).join(', ') : 'tidak ada'}) dibaca langsung oleh kode SIAKAD. Mengubahnya bisa membuat pemeriksaan di aplikasi berhenti
            bekerja.
          </span>
        </div>
      </div>
      <BagianForm kolom={1}>
        <Field label="Nama titik" required error={galat.judul || undefined}>
          <Input value={isi.judul} maxLength={150} onChange={(e) => setIsi((x) => ({ ...x, judul: e.target.value }))} />
        </Field>
        <Field label="Keterangan" optional>
          <Textarea rows={3} value={isi.keterangan} onChange={(e) => setIsi((x) => ({ ...x, keterangan: e.target.value }))} />
        </Field>
        <Field label="Pengatur" optional description="Peran yang boleh membuat aturan di titik ini. Kosong = mengikuti pengatur kategori.">
          <PilihanBanyak
            options={(peran.data ?? []).map((p) => ({ value: p.kode, label: p.nama, description: p.kode }))}
            value={isi.pengatur}
            onValueChange={(v) => setIsi((x) => ({ ...x, pengatur: v }))}
            placeholder="Pilih peran"
          />
        </Field>
        {isi.contoh.length > 0 && (
          <Field label="Contoh aturan" optional description="Ditawarkan sebagai “Mulai dari contoh” di formulir aturan.">
            <ul className="u-titik-contoh">
              {isi.contoh.map((c, i) => (
                <li key={i}>
                  <Input
                    value={c.judul}
                    aria-label={`Judul contoh ${i + 1}`}
                    onChange={(e) => setIsi((x) => ({ ...x, contoh: x.contoh.map((y, j) => (j === i ? { ...y, judul: e.target.value } : y)) }))}
                  />
                  <Button variant="ghost" size="sm" iconOnly aria-label={`Hapus contoh ${i + 1}`} onClick={() => setIsi((x) => ({ ...x, contoh: x.contoh.filter((_, j) => j !== i) }))}>
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          </Field>
        )}
        <label className="u-titik-saklar">
          <Switch checked={isi.aktif} onCheckedChange={(v) => setIsi((x) => ({ ...x, aktif: Boolean(v) }))} />
          <span>
            <strong>{isi.aktif ? 'Aktif' : 'Nonaktif'}</strong>
            <span>Titik nonaktif tetap tampil di formulir aturan tetapi tidak bisa dipilih untuk aturan baru. Aturan yang sudah ada tetap berjalan.</span>
          </span>
        </label>
      </BagianForm>
    </PanelForm>
  );
}

// ================================================================ Hapus titik kustom
function HapusTitikAturan({ titik: t, onTutup }: { titik: TitikKelolaAturan | null; onTutup: () => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [ketik, setKetik] = React.useState('');
  const [tolak, setTolak] = React.useState<{ pesan: string; aturan: Array<{ id?: string; nama: string }> } | null>(null);
  React.useEffect(() => {
    setKetik('');
    setTolak(null);
  }, [t]);
  const cocok = Boolean(t) && ketik.trim() === t!.judul.trim();
  return (
    <ConfirmDialog
      open={t !== null}
      onOpenChange={(o) => !o && onTutup()}
      title={`Hapus titik “${t?.judul ?? ''}”?`}
      description="Aplikasi yang masih memanggil titik ini akan mendapat galat. Titik yang masih punya aturan aktif tidak bisa dihapus."
      confirmLabel="Hapus titik"
      tone="danger"
      onConfirm={async () => {
        if (!t || !cocok) throw new Error('Ketik nama titik untuk mengonfirmasi.');
        try {
          await siakad.request({ method: 'POST', path: `/v1/aturan/titik/${encodeURIComponent(t.kode)}/hapus` });
        } catch (e) {
          const err = e as { status?: number; details?: { aturan?: Array<{ id?: string; nama: string }> } };
          if (err.status === 409 || err.status === 422) {
            setTolak({ pesan: pesanGalat(e), aturan: err.details?.aturan ?? [] });
            throw e;
          }
          toast.add({ title: 'Gagal menghapus', description: pesanGalat(e), type: 'error' });
          throw e;
        }
        invalidateSiakad('aturan');
        toast.add({ title: 'Titik dihapus', type: 'success' });
        onTutup();
      }}
    >
      {tolak ? (
        <Alert variant="danger" title="Titik masih dipakai">
          {tolak.pesan}
          {tolak.aturan.length > 0 && (
            <ul className="u-titik-tolak">
              {tolak.aturan.map((a, i) => (
                <li key={a.id ?? i}>{a.nama}</li>
              ))}
            </ul>
          )}
          Nonaktifkan atau hapus aturan itu dulu.
        </Alert>
      ) : null}
      <Field label={`Ketik “${t?.judul ?? ''}” untuk mengonfirmasi`}>
        <Input value={ketik} onChange={(e) => setKetik(e.target.value)} autoComplete="off" />
      </Field>
    </ConfirmDialog>
  );
}

// ================================================================ Wizard titik kustom
interface IsiTitik {
  judul: string;
  keterangan: string;
  kategori: string;
  kode: string;
  kodeManual: boolean;
  subjek: 'mahasiswa' | 'pegawai' | 'pendaftar' | 'umum' | '';
  jenis: JenisAturan[];
  status_mahasiswa: string[];
  konteks: KonteksTitikAturan[];
  pengatur: string[];
}
const LANGKAH_TITIK = [
  { title: 'Langkah', description: 'Apa yang diperiksa' },
  { title: 'Subjek', description: 'Siapa yang diperiksa' },
  { title: 'Jenis aturan', description: 'Yang boleh dipakai' },
  { title: 'Data tambahan', description: 'Dari aplikasi' },
  { title: 'Pengatur & tinjau', description: 'Siapa dan cara pakai' },
];

function isiTitikDari(t: TitikKelolaAturan | null): IsiTitik {
  return {
    judul: t?.judul ?? '',
    keterangan: t?.keterangan ?? '',
    kategori: t?.kategori[0] ?? '',
    kode: t?.kode ?? '',
    kodeManual: Boolean(t),
    subjek: (t?.subjek as IsiTitik['subjek']) ?? '',
    jenis: t?.jenis ?? ['syarat'],
    status_mahasiswa: t?.status_mahasiswa ?? [],
    konteks: (t?.konteks ?? []).map(konteksObjek),
    pengatur: (t?.pengatur ?? []).filter((p) => p.jenis === 'peran').map((p) => p.kode),
  };
}

/** Wizard tambah/ubah titik kustom: langkah, subjek, jenis aturan, data tambahan, pengatur dan cara pakai. */
export function WizardTitikAturan({
  open,
  onOpenChange,
  titik,
  katalogIndikator,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  titik: TitikKelolaAturan | null;
  katalogIndikator: Array<{ kode: string; judul: string; subjek: string; sumber: string; keterangan: string }>;
}) {
  const siakad = useSiakad();
  const toast = useToast();
  const peran = usePeranRbac();
  const katalog = useKatalogAturan();
  const ubah = Boolean(titik);
  const awal = React.useMemo(() => isiTitikDari(titik), [titik]);
  const [isi, setIsi] = React.useState<IsiTitik>(awal);
  const [langkah, setLangkah] = React.useState(0);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [sibuk, setSibuk] = React.useState(false);
  const [galatSimpan, setGalatSimpan] = React.useState<unknown>(null);
  const [tanya, setTanya] = React.useState(false);
  React.useEffect(() => {
    if (open) {
      setIsi(awal);
      setLangkah(0);
      setGalat({});
      setGalatSimpan(null);
    }
  }, [open, awal]);
  const berubah = JSON.stringify(isi) !== JSON.stringify(awal);
  const set = <K extends keyof IsiTitik>(k: K, v: IsiTitik[K]) => {
    setIsi((x) => ({ ...x, [k]: v }));
    setGalat((g) => ({ ...g, [k]: '' }));
  };
  const kode = isi.kodeManual ? isi.kode : `kustom.${slugTitikAturan(isi.judul) || 'titik_baru'}`;
  const kategoriOpsi = (katalog.data?.kategori ?? []).map((k) => ({ value: k.kode, label: labelKategoriAturan(k.kode) }));

  const periksa = (i: number): Record<string, string> => {
    const g: Record<string, string> = {};
    if (i === 0) {
      if (!isi.judul.trim()) g.judul = 'Tulis langkah yang diperiksa.';
      if (!isi.kategori) g.kategori = 'Pilih unit pemilik.';
      if (!/^kustom\.[a-z0-9_.]{2,60}$/.test(kode)) g.kode = 'Kode berawalan kustom. lalu huruf kecil, angka, atau garis bawah.';
    }
    if (i === 1 && !isi.subjek) g.subjek = 'Pilih siapa yang diperiksa.';
    if (i === 2 && !isi.jenis.length) g.jenis = 'Pilih minimal satu jenis aturan.';
    if (i === 3)
      isi.konteks.forEach((k, j) => {
        if (!/^[a-z][a-z0-9_]{1,40}$/.test(k.kode)) g[`konteks.${j}`] = 'Nama data: huruf kecil, angka, garis bawah, mis. jumlah_sks.';
        else if (!k.judul.trim()) g[`konteks.${j}`] = 'Isi label yang mudah dibaca.';
        else if (k.tipe === 'pilihan' && !(k.opsi ?? []).some((o) => o.nilai.trim())) g[`konteks.${j}`] = 'Tambahkan minimal satu pilihan.';
      });
    return g;
  };
  const lanjut = () => {
    const g = periksa(langkah);
    setGalat(g);
    if (Object.keys(g).length) return;
    setLangkah((l) => Math.min(LANGKAH_TITIK.length - 1, l + 1));
  };
  const simpan = async () => {
    for (let i = 0; i < 4; i++) {
      const g = periksa(i);
      if (Object.keys(g).length) {
        setGalat(g);
        setLangkah(i);
        return;
      }
    }
    setSibuk(true);
    setGalatSimpan(null);
    try {
      await siakad.request({
        method: 'POST',
        path: ubah ? `/v1/aturan/titik/${encodeURIComponent(titik!.kode)}` : '/v1/aturan/titik',
        body: {
          kode,
          judul: isi.judul.trim(),
          keterangan: isi.keterangan.trim(),
          kategori: [isi.kategori],
          subjek: isi.subjek,
          jenis: isi.jenis,
          status_mahasiswa: isi.subjek === 'mahasiswa' && isi.status_mahasiswa.length ? isi.status_mahasiswa : null,
          konteks: isi.konteks.map((k) => ({ kode: k.kode, judul: k.judul.trim(), tipe: k.tipe, ...(k.tipe === 'pilihan' ? { opsi: (k.opsi ?? []).filter((o) => o.nilai.trim()) } : {}) })),
          pengatur: isi.pengatur.map((p) => ({ jenis: 'peran', kode: p })),
        },
      });
      invalidateSiakad('aturan');
      toast.add({ title: ubah ? 'Titik diperbarui' : 'Titik ditambahkan', description: ubah ? undefined : 'Sekarang aturan bisa dipasang di titik ini.', type: 'success' });
      onOpenChange(false);
    } catch (e) {
      setGalatSimpan(e);
    } finally {
      setSibuk(false);
    }
  };
  const tutup = (o: boolean) => {
    if (o) return onOpenChange(true);
    if (sibuk) return;
    if (berubah) return setTanya(true);
    onOpenChange(false);
  };

  const indSubjek = katalogIndikator.filter((i) => i.sumber !== 'konteks' && (i.subjek === isi.subjek || (isi.subjek && i.subjek === 'umum')));
  const contohKonteks = (isi.konteks.length ? isi.konteks : [{ kode: 'jumlah_sks', judul: 'Jumlah SKS', tipe: 'angka' as const }]).reduce<Record<string, unknown>>((o, k) => {
    o[k.kode] = k.tipe === 'angka' ? 3 : k.tipe === 'benar_salah' ? true : k.tipe === 'pilihan' ? (k.opsi?.[0]?.nilai ?? 'nilai') : 'teks';
    return o;
  }, {});
  const kunciSubjek = isi.subjek === 'pegawai' ? '"pegawai_id": 123' : isi.subjek === 'pendaftar' ? '"no_pendaftaran": "2026010001"' : isi.subjek === 'mahasiswa' ? '"nim": "2201010001"' : null;
  const bodyContoh = `{\n  "titik": "${kode}",${kunciSubjek ? `\n  ${kunciSubjek},` : ''}\n  "konteks": ${JSON.stringify(contohKonteks)}\n}`;
  const kodeSdk = `import { Siakad } from 'unipo-siakad-sdk';

const siakad = new Siakad({ /* token aplikasi */ });
const { data } = await siakad.request({
  method: 'POST',
  path: '/v1/aturan/periksa',
  body: ${bodyContoh.replace(/\n/g, '\n  ')},
});
if (!data.boleh) {
  // Tampilkan data.pelanggaran[].pesan, atau pakai <HasilPeriksaAturanPanel hasil={data} />
}`;

  const isiLangkah = [
    <div key="0" className="u-aturan-langkah">
      <p className="u-aturan-langkah-ket">Tulis langkah yang ingin diberi aturan, dalam satu kalimat yang dimengerti semua orang.</p>
      <Field label="Langkah yang diperiksa" required error={galat.judul || undefined} description="Mis. “Mahasiswa mendaftar seminar proposal” atau “Dosen mengajukan hibah internal”.">
        <Input value={isi.judul} maxLength={150} placeholder="Mahasiswa mendaftar seminar proposal" onChange={(e) => set('judul', e.target.value)} />
      </Field>
      <Field label="Keterangan" optional description="Kapan langkah ini terjadi dan aplikasi mana yang menjalankannya.">
        <Textarea rows={2} value={isi.keterangan} onChange={(e) => set('keterangan', e.target.value)} placeholder="Mis. Diperiksa aplikasi Fakultas saat mahasiswa menekan Daftar seminar." />
      </Field>
      <Field label="Unit pemilik" required error={galat.kategori || undefined} description="Menentukan siapa yang berwenang mengatur aturannya.">
        <Pilihan options={kategoriOpsi} value={isi.kategori || null} onValueChange={(v) => set('kategori', v ?? '')} placeholder="Pilih unit" />
      </Field>
      <details className="u-aturan-lanjutan" open={Boolean(galat.kode) || undefined}>
        <summary>Lanjutan: kode titik</summary>
        <Field
          label="Kode"
          error={galat.kode || undefined}
          description={ubah ? 'Kode tidak bisa diubah setelah titik dibuat karena dipakai aplikasi.' : 'Dibuat otomatis dari nama. Aplikasi memakai kode ini saat memeriksa.'}
        >
          <Input value={kode} disabled={ubah} onChange={(e) => setIsi((x) => ({ ...x, kode: e.target.value.trim(), kodeManual: true }))} spellCheck={false} />
        </Field>
      </details>
    </div>,

    <div key="1" className="u-aturan-langkah">
      <p className="u-aturan-langkah-ket">Siapa yang diperiksa saat langkah ini dijalankan? Ini menentukan data yang bisa dipakai di kondisi aturan.</p>
      <div className="u-aturan-jenis-kisi" data-kolom="4" role="radiogroup" aria-label="Subjek">
        {SUBJEK.map((s) => (
          <button
            key={s.v}
            type="button"
            role="radio"
            aria-checked={isi.subjek === s.v}
            className="u-aturan-jenis-opsi"
            data-pilih={isi.subjek === s.v || undefined}
            disabled={ubah && isi.subjek !== s.v}
            onClick={() => set('subjek', s.v)}
          >
            <strong>{s.judul}</strong>
            <span className="u-aturan-jenis-contoh">{s.ket}</span>
          </button>
        ))}
      </div>
      {galat.subjek && <p className="u-field-error">{galat.subjek}</p>}
      {ubah && <p className="u-aturan-sub">Subjek tidak bisa diganti setelah titik dibuat.</p>}
      {isi.subjek && (
        <div className="u-titik-pratinjau">
          <p className="u-aturan-di-titik-label">Data yang bisa dipakai di kondisi ({indSubjek.length})</p>
          {indSubjek.length ? (
            <ul>
              {indSubjek.slice(0, 12).map((i) => (
                <li key={i.kode} title={i.keterangan}>
                  {i.judul}
                </li>
              ))}
              {indSubjek.length > 12 && <li>dan {indSubjek.length - 12} lainnya</li>}
            </ul>
          ) : (
            <p className="u-aturan-sub">Belum ada data bawaan untuk subjek ini. Tambahkan data dari aplikasi di langkah 4.</p>
          )}
        </div>
      )}
    </div>,

    <div key="2" className="u-aturan-langkah">
      <p className="u-aturan-langkah-ket">Jenis aturan apa yang boleh dipasang di titik ini?</p>
      <div className="u-aturan-jenis-kisi">
        {(['syarat', 'batas_waktu', 'batas_nilai'] as JenisAturan[]).map((j) => {
          const on = isi.jenis.includes(j);
          return (
            <button
              key={j}
              type="button"
              aria-pressed={on}
              className="u-aturan-jenis-opsi"
              data-pilih={on || undefined}
              onClick={() => set('jenis', on ? isi.jenis.filter((x) => x !== j) : [...isi.jenis, j])}
            >
              <span className="u-titik-centang" aria-hidden>
                {on && <Check />}
              </span>
              <strong>{LABEL_JENIS_ATURAN[j].label}</strong>
              <span className="u-aturan-jenis-contoh">{JENIS_AWAM[j]}</span>
            </button>
          );
        })}
      </div>
      {galat.jenis && <p className="u-field-error">{galat.jenis}</p>}
      {isi.jenis.includes('batas_nilai') && !isi.konteks.some((k) => k.tipe === 'angka') && (
        <Alert variant="info">Batas nilai butuh angka yang dikirim aplikasi, mis. jumlah SKS. Tambahkan di langkah berikutnya.</Alert>
      )}
      {isi.subjek === 'mahasiswa' && (
        <Field label="Status mahasiswa yang boleh menjalankan langkah ini" optional description="Kosong = semua status. Mahasiswa dengan status lain langsung ditolak sebelum aturan diperiksa.">
          <PilihanBanyak options={STATUS_MAHASISWA_ATURAN} value={isi.status_mahasiswa} onValueChange={(v) => set('status_mahasiswa', v)} placeholder="Semua status" />
        </Field>
      )}
    </div>,

    <div key="3" className="u-aturan-langkah">
      <p className="u-aturan-langkah-ket">
        Data yang dikirim aplikasi saat langkah dijalankan, mis. jumlah SKS yang diambil atau jenis seminar. Boleh dikosongkan bila aturan cukup memakai data SIAKAD.
      </p>
      <div className="u-titik-konteks">
        {isi.konteks.length > 0 && (
          <div className="u-titik-konteks-judul" aria-hidden>
            <span>Label yang dibaca orang</span>
            <span>Nama data di aplikasi</span>
            <span>Tipe</span>
          </div>
        )}
        {isi.konteks.map((k, j) => (
          <div key={j} className="u-titik-konteks-baris" data-invalid={galat[`konteks.${j}`] ? '' : undefined}>
            <Input
              value={k.judul}
              aria-label="Label"
              placeholder="Label, mis. Jenis seminar"
              onChange={(e) =>
                set(
                  'konteks',
                  isi.konteks.map((x, i) => (i === j ? { ...x, judul: e.target.value, kode: x.kode || slugTitikAturan(e.target.value) } : x)),
                )
              }
            />
            <Input
              value={k.kode}
              aria-label="Nama data"
              placeholder="nama_data"
              spellCheck={false}
              onChange={(e) =>
                set(
                  'konteks',
                  isi.konteks.map((x, i) => (i === j ? { ...x, kode: e.target.value.trim() } : x)),
                )
              }
            />
            <Pilihan
              tampilan="daftar"
              aria-label="Tipe"
              options={(Object.keys(LABEL_TIPE_KONTEKS) as TipeKonteksTitik[]).map((v) => ({ value: v, label: LABEL_TIPE_KONTEKS[v] }))}
              value={k.tipe}
              onValueChange={(v) =>
                v &&
                set(
                  'konteks',
                  isi.konteks.map((x, i) => (i === j ? { ...x, tipe: v as TipeKonteksTitik, opsi: v === 'pilihan' ? (x.opsi?.length ? x.opsi : [{ nilai: '', label: '' }]) : undefined } : x)),
                )
              }
            />
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Hapus data"
              onClick={() =>
                set(
                  'konteks',
                  isi.konteks.filter((_, i) => i !== j),
                )
              }
            >
              <X />
            </Button>
            {k.tipe === 'pilihan' && (
              <div className="u-titik-opsi">
                <span className="u-aturan-sub">Pilihan:</span>
                {(k.opsi ?? []).map((o, oi) => (
                  <span key={oi} className="u-titik-opsi-baris">
                    <Input
                      value={o.label}
                      aria-label={`Pilihan ${oi + 1}`}
                      placeholder="mis. Seminar proposal"
                      onChange={(e) =>
                        set(
                          'konteks',
                          isi.konteks.map((x, i) =>
                            i === j
                              ? {
                                  ...x,
                                  opsi: (x.opsi ?? []).map((y, yi) =>
                                    yi === oi ? { label: e.target.value, nilai: y.nilai && y.nilai !== slugTitikAturan(y.label) ? y.nilai : slugTitikAturan(e.target.value) } : y,
                                  ),
                                }
                              : x,
                          ),
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      aria-label={`Hapus pilihan ${oi + 1}`}
                      onClick={() =>
                        set(
                          'konteks',
                          isi.konteks.map((x, i) => (i === j ? { ...x, opsi: (x.opsi ?? []).filter((_, yi) => yi !== oi) } : x)),
                        )
                      }
                    >
                      <X />
                    </Button>
                  </span>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    set(
                      'konteks',
                      isi.konteks.map((x, i) => (i === j ? { ...x, opsi: [...(x.opsi ?? []), { nilai: '', label: '' }] } : x)),
                    )
                  }
                >
                  <Plus /> Pilihan
                </Button>
              </div>
            )}
            {galat[`konteks.${j}`] && <p className="u-field-error">{galat[`konteks.${j}`]}</p>}
          </div>
        ))}
        <div className="u-kondisi-tambah">
          <Button variant="soft" size="sm" disabled={isi.konteks.length >= 20} onClick={() => set('konteks', [...isi.konteks, { kode: '', judul: '', tipe: 'angka' }])}>
            <Plus /> Tambah data
          </Button>
          {!isi.konteks.length && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                set('konteks', [
                  {
                    kode: 'jenis_seminar',
                    judul: 'Jenis seminar',
                    tipe: 'pilihan',
                    opsi: [
                      { nilai: 'proposal', label: 'Seminar proposal' },
                      { nilai: 'hasil', label: 'Seminar hasil' },
                    ],
                  },
                  { kode: 'jumlah_pembimbing', judul: 'Jumlah pembimbing', tipe: 'angka' },
                ])
              }
            >
              Isi dengan contoh
            </Button>
          )}
        </div>
      </div>
    </div>,

    <div key="4" className="u-aturan-langkah">
      <Field label="Peran yang boleh membuat aturan di titik ini" optional description="Kosong = mengikuti pengatur unit pemilik.">
        <PilihanBanyak
          options={(peran.data ?? []).map((p) => ({ value: p.kode, label: p.nama, description: p.kode }))}
          value={isi.pengatur}
          onValueChange={(v) => set('pengatur', v)}
          placeholder="Pilih peran"
        />
      </Field>
      <div className="u-titik-ringkas">
        <Waypoints aria-hidden />
        <div>
          <strong>{isi.judul || 'Tanpa nama'}</strong>
          <span>
            <code>{kode}</code> · {labelKategoriAturan(isi.kategori || 'umum')} · subjek {SUBJEK.find((s) => s.v === isi.subjek)?.judul.toLowerCase() ?? '–'}
          </span>
          <span>Jenis aturan: {isi.jenis.map((j) => LABEL_JENIS_ATURAN[j].label).join(', ') || '–'}</span>
          {isi.konteks.length > 0 && <span>Data dari aplikasi: {isi.konteks.map((k) => `${k.judul || k.kode} (${LABEL_TIPE_KONTEKS[k.tipe].toLowerCase()})`).join(', ')}</span>}
          {isi.pengatur.length > 0 && (
            <span>
              <Users aria-hidden /> {isi.pengatur.map((p) => peran.data?.find((x) => x.kode === p)?.nama ?? p).join(', ')}
            </span>
          )}
        </div>
      </div>
      <div className="u-titik-pakai">
        <p className="u-aturan-di-titik-label">
          <Code2 aria-hidden /> Cara memakai dari aplikasi
        </p>
        <p className="u-aturan-sub">Panggil pemeriksaan sebelum menyimpan langkah. Bila hasil “boleh” bernilai false, tolak langkah dan tampilkan pesannya.</p>
        <CodeBlock
          theme="auto"
          lineNumbers={false}
          tabs={[
            { label: 'unipo-siakad-sdk', language: 'ts', code: kodeSdk },
            {
              label: 'HTTP',
              language: 'bash',
              code: `curl -X POST https://api.unipo.ac.id/v1/aturan/periksa \\\n  -H "Authorization: Bearer $TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '${bodyContoh}'`,
            },
          ]}
        />
      </div>
    </div>,
  ];

  const terakhir = langkah === LANGKAH_TITIK.length - 1;
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={tutup}
        size="xl"
        className="u-aturan-wizard"
        initialFocus={false}
        title={ubah ? `Ubah titik: ${titik?.judul}` : 'Tambah titik penerapan'}
        description="Titik penerapan adalah langkah di aplikasi yang bisa diberi aturan."
        footer={
          <>
            <span className="u-panel-form-status" data-berubah={berubah || undefined} aria-live="polite">
              {berubah ? 'Perubahan belum disimpan' : null}
            </span>
            {langkah > 0 ? (
              <Button variant="ghost" disabled={sibuk} onClick={() => setLangkah((l) => l - 1)}>
                <ArrowLeft /> Kembali
              </Button>
            ) : (
              <Button variant="ghost" disabled={sibuk} onClick={() => tutup(false)}>
                Batal
              </Button>
            )}
            {terakhir ? (
              <Button loading={sibuk} onClick={() => void simpan()}>
                {ubah ? 'Simpan titik' : 'Tambah titik'}
              </Button>
            ) : (
              <Button onClick={lanjut}>
                Lanjut <ArrowRight />
              </Button>
            )}
          </>
        }
      >
        <div className="u-aturan-wizard-kepala">
          <Stepper steps={LANGKAH_TITIK} current={langkah} onStepClick={(i) => setLangkah(i)} />
        </div>
        {galatSimpan != null && <GalatApi error={galatSimpan} title="Belum tersimpan" />}
        {isiLangkah[langkah]}
      </Dialog>
      <ConfirmDialog
        open={tanya}
        onOpenChange={setTanya}
        title="Tutup tanpa menyimpan?"
        description="Isian yang Anda ubah belum disimpan dan akan hilang."
        confirmLabel="Buang perubahan"
        cancelLabel="Lanjut mengisi"
        tone="warning"
        onConfirm={() => {
          setTanya(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
