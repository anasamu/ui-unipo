'use client';
import * as React from 'react';
import { FlaskConical, Lock, Pencil, Plus, Search, Trash2, Waypoints, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Empty } from '../components/display';
import { Field, Input, Switch, Textarea } from '../components/forms';
import { BagianForm, PilihanBanyak, PanelForm } from '../components/formulir';
import { ConfirmDialog, useToast } from '../components/overlays';
import { LABEL_JENIS_ATURAN, kelompokTitik, keteranganTitikRamah, type TitikAturan } from './aturan';
import { SimulasiTitikRute, useTitikRute, type TitikRute } from './aturan-rute';
import { WizardTitikPenerapan } from './aturan-titik-wizard';
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
  /** Titik dari aksi aplikasi (rute.*), ditegakkan otomatis oleh SIAKAD. */
  rute?: boolean;
  /** Kode konteks (titik bawaan) atau definisi lengkap (titik kustom). */
  konteks: Array<string | KonteksTitikAturan>;
  pengatur?: Array<{ jenis: 'peran' | 'izin'; kode: string; keterangan?: string | null }>;
  status_mahasiswa?: string[] | null;
  /** Jumlah aturan aktif di titik ini (untuk peringatan hapus). */
  jumlah_aturan?: number;
  /** Jumlah aturan aktif (nama dari API /v1/aturan/titik). */
  jumlah_aturan_aktif?: number;
}

const SUBJEK: Array<{ v: 'mahasiswa' | 'pegawai' | 'pendaftar' | 'umum'; judul: string; ket: string }> = [
  { v: 'mahasiswa', judul: 'Mahasiswa', ket: 'Yang diperiksa satu mahasiswa: IPK, SKS, status, tagihan, dan data akademik lain.' },
  { v: 'pegawai', judul: 'Pegawai', ket: 'Yang diperiksa dosen atau tendik: masa kerja, jabatan, golongan, BKD/SKP.' },
  { v: 'pendaftar', judul: 'Pendaftar', ket: 'Yang diperiksa calon mahasiswa baru: gelombang, pembayaran, berkas PMB.' },
  { v: 'umum', judul: 'Umum', ket: 'Tidak terkait orang tertentu, mis. hanya hari dan jam. Cocok untuk batas waktu layanan.' },
];
const LABEL_SUBJEK_LAIN: Record<string, string> = { kelas: 'Kelas kuliah', akun: 'Akun' };

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
  const [cari, setCari] = React.useState('');
  const [wizard, setWizard] = React.useState<{ titik: TitikKelolaAturan | null } | null>(null);
  const [ubahBawaan, setUbahBawaan] = React.useState<TitikKelolaAturan | null>(null);
  const [hapus, setHapus] = React.useState<TitikKelolaAturan | null>(null);
  const [sim, setSim] = React.useState<TitikRute | null>(null);
  const rute = useTitikRute();
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
            <Plus /> Tambah titik pemeriksaan
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
                      {t.rute ? <Badge variant="primary">Dari aksi aplikasi</Badge> : t.kustom ? <Badge variant="primary">Langkah manual</Badge> : <Badge variant="neutral">Bawaan</Badge>}
                      {t.aktif === false && <Badge variant="warning">Nonaktif</Badge>}
                    </div>
                    <span className="u-titik-ket">{keteranganTitikRamah(t.keterangan).replace(/\s*Contoh aturan( kampus)?:.*$/i, '')}</span>
                    <span className="u-titik-meta">
                      {SUBJEK.find((s) => s.v === t.subjek)?.judul ?? LABEL_SUBJEK_LAIN[t.subjek] ?? t.subjek} ·{' '}
                      {t.jenis.map((j) => LABEL_JENIS_ATURAN[j]?.label ?? j).join(', ')}
                      {t.jumlah_aturan ? ` · ${t.jumlah_aturan} aturan` : ''}
                    </span>
                  </div>
                  <div className="u-titik-aksi">
                    {t.rute && rute.data?.find((r) => r.kode === t.kode) && (
                      <Button variant="outline" size="sm" onClick={() => setSim(rute.data!.find((r) => r.kode === t.kode)!)}>
                        <FlaskConical /> Simulasi
                      </Button>
                    )}
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
      <WizardTitikPenerapan open={wizard !== null} titik={wizard?.titik ?? null} onOpenChange={(o) => !o && setWizard(null)} />
      <SimulasiTitikRute titik={sim} onOpenChange={(o) => !o && setSim(null)} />
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

// ================================================================ Wizard titik (panel tunggal)
/**
 * Tambah/ubah titik kustom. Sejak tahap 2a memakai panel samping tunggal `WizardTitikPenerapan` (sumber: aksi aplikasi
 * atau langkah manual). `katalogIndikator` tidak dipakai lagi (dibaca dari katalog aturan), dipertahankan untuk kompatibilitas.
 */
export function WizardTitikAturan({
  open,
  onOpenChange,
  titik,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  titik: TitikKelolaAturan | null;
  katalogIndikator?: unknown;
}) {
  return <WizardTitikPenerapan open={open} onOpenChange={onOpenChange} titik={titik} />;
}
