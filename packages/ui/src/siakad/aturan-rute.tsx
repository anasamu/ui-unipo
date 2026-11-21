'use client';
import * as React from 'react';
import { FlaskConical, Pencil, Plus, Route as IkonRute, Trash2, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Empty } from '../components/display';
import { Field, Input } from '../components/forms';
import { Pilihan, PanelForm } from '../components/formulir';
import { ConfirmDialog, useToast } from '../components/overlays';
import { labelKategoriAturan } from './aturan';
import type { TitikKelolaAturan } from './aturan-titik';
import { WizardTitikPenerapan } from './aturan-titik-wizard';
import { GalatApi } from './galat';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

/*
 * Titik aturan berbasis rute API (SIAKAD /v1/aturan/rute, docs/ATURAN-RUTE.md). Admin aturan (Pustikom) memilih AKSI
 * dari katalog rute tulis (nama ramah, per modul), menentukan SIAPA yang diperiksa dan dari mana datanya diambil,
 * lalu aturan aktif di titik itu ditegakkan SIAKAD sebelum aksi dijalankan (ditolak 422 dengan kalimat aturan)
 * tanpa mengubah kode aplikasi. Aturannya sendiri dibuat pejabat dari templat (SK dasar + rantai validator).
 *
 *   KelolaTitikRute     daftar titik rute + tambah/ubah/hapus + simulasi
 *   WizardTitikRute     PanelLangkah: Aksi → Siapa diperiksa → Data & syarat → Nama & pengatur → Tinjau
 *   SimulasiTitikRute   "Aksi ini akan ditolak?" memakai penjaga sungguhan (tanpa menjalankan aksi)
 */

// ================================================================ Tipe
export type SubjekRute = 'mahasiswa' | 'pegawai' | 'pendaftar' | 'umum';
export interface SumberSaran {
  sumber: string;
  label: string;
}
export interface RuteKatalog {
  kunci: string;
  metode: string;
  path: string;
  nama: string;
  tag: string;
  keterangan: string;
  parameter_path: string[];
  hanya_pengguna: boolean;
  saran: Record<'mahasiswa' | 'pegawai' | 'pendaftar' | 'tahun' | 'prodi', SumberSaran[]>;
  titik: Array<{ kode: string; judul: string }>;
}
export interface KatalogRute {
  kelompok: Array<{ modul: string; jumlah: number; rute: RuteKatalog[] }>;
  jumlah: number;
  cari: Array<{ kode: string; label: string; subjek: string; dari: string }>;
  sumber_pengguna: SumberSaran[];
}
export interface TitikRute {
  kode: string;
  judul: string;
  keterangan: string | null;
  aktif: boolean;
  rute: { kunci: string; metode: string; path: string; nama: string; modul: string | null; ada: boolean };
  subjek: SubjekRute;
  subjek_sumber: string[];
  tahun_sumber: string[];
  prodi_sumber: string[];
  konteks_sumber: Record<string, string>;
  bila: Array<{ sumber: string; nilai: string[] }>;
  kategori: string[];
  jenis: string[];
  konteks: Array<{ kode: string; judul: string; tipe: string }>;
  jumlah_aturan_aktif: number;
  diubah_oleh?: string | null;
  diubah_at?: string | null;
}
export interface HasilSimulasiRute {
  akan_ditolak: boolean;
  status: number | null;
  alasan: string | null;
  diperiksa: boolean;
  alasan_lewat: string | null;
  subjek: string[];
  hasil: Array<{ subjek: string; boleh: boolean; pesan?: string; indikator?: Record<string, unknown>; diterapkan?: number; catatan?: string }>;
  titik: { kode: string; judul: string };
  rute: string;
  hanya_aturan: boolean;
}

// ================================================================ Hook
export function useKatalogRute(aktif = true) {
  return useSiakadQuery<KatalogRute>(['aturan', 'rute', 'katalog'], (s, signal) => s.request({ method: 'GET', path: '/v1/aturan/rute/katalog' }, { signal }), { staleTime: 300_000, enabled: aktif });
}
export function useTitikRute() {
  return useSiakadQuery<TitikRute[]>(['aturan', 'rute', 'daftar'], (s, signal) => s.request({ method: 'GET', path: '/v1/aturan/rute' }, { signal }), { staleTime: 30_000 });
}

// ================================================================ Bahasa awam untuk sumber
const LABEL_SUBJEK: Record<SubjekRute, string> = { mahasiswa: 'mahasiswa', pegawai: 'pegawai', pendaftar: 'pendaftar', umum: 'umum' };

/** Sumber data dalam kalimat awam, mis. "body:nim" → "isian “nim” yang dikirim". */
export function labelSumberRute(src: string, katalog?: KatalogRute | null): string {
  const m = /^cari:([a-z_]+):(.+)$/.exec(src);
  if (m) {
    const c = katalog?.cari.find((x) => x.kode === m[1]);
    return `${c?.label ?? 'pencarian ' + m[1]} (dari ${labelSumberRute(m[2]!, katalog)})`;
  }
  const [dari, jalur] = [src.slice(0, src.indexOf(':')), src.slice(src.indexOf(':') + 1)];
  if (dari === 'pengguna') return jalur === 'nim' ? 'mahasiswa yang sedang masuk' : jalur === 'nidn' ? 'dosen yang sedang masuk' : 'pengguna yang sedang masuk';
  if (dari === 'path') return `bagian alamat “${jalur}”`;
  if (dari === 'query') return `parameter alamat “${jalur}”`;
  if (dari === 'body') return `isian “${jalur}” yang dikirim`;
  return src;
}

/** "mahasiswa yang sedang masuk" / "mahasiswa dari isian “nim” yang dikirim" / "semua permintaan". */
export function kalimatSubjek(subjek: SubjekRute | '', sumber: string[], katalog?: KatalogRute | null): string {
  if (!subjek || subjek === 'umum') return 'semua permintaan';
  if (sumber[0]?.startsWith('pengguna:')) return subjek === 'mahasiswa' ? 'mahasiswa yang sedang masuk' : `${LABEL_SUBJEK[subjek]} yang sedang masuk`;
  return `${LABEL_SUBJEK[subjek]} dari ${sumber.map((s) => labelSumberRute(s, katalog)).join(' / ') || '…'}`;
}

// ================================================================ Daftar
/** Halaman admin: titik aturan dari aksi API. */
export function KelolaTitikRute({ className }: { className?: string }) {
  const q = useTitikRute();
  const kat = useKatalogRute();
  const [wizard, setWizard] = React.useState<{ titik: TitikRute | null } | null>(null);
  const [sim, setSim] = React.useState<TitikRute | null>(null);
  const [hapus, setHapus] = React.useState<TitikRute | null>(null);
  const siakad = useSiakad();
  const toast = useToast();
  const status = (q.error as { status?: number } | null)?.status;
  if (q.error && (status === 404 || status === 405 || status === 503))
    return (
      <Alert className={className} title="Fitur ini belum aktif">
        Fitur titik pemeriksaan dari aksi aplikasi belum aktif di server SIAKAD kampus. Hubungi tim Pustikom untuk memperbaruinya.
      </Alert>
    );
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  if (!q.data) return <Skeleton height={200} className={className} />;
  return (
    <div className={cn('u-arute', className)}>
      <div className="u-arute-kepala">
        <p>
          Pilih aksi aplikasi (mis. <em>mendaftar seminar proposal</em>) lalu tentukan siapa yang diperiksa. Aturan yang aktif di titik ini akan diperiksa SIAKAD sebelum aksi dijalankan, tanpa
          mengubah aplikasinya. Isi aturannya ditulis pejabat dengan mengisi contoh kalimat, wajib mencantumkan SK, dan diperiksa dulu sebelum berlaku.
        </p>
        <Button onClick={() => setWizard({ titik: null })}>
          <Plus /> Tambah titik dari aksi
        </Button>
      </div>
      {!q.data.length && <Empty bordered icon={<IkonRute />} title="Belum ada titik pemeriksaan dari aksi aplikasi" description="Tambahkan titik untuk aksi yang ingin diberi aturan." />}
      <ul className="u-arute-daftar">
        {q.data.map((t) => (
          <li key={t.kode}>
            <div className="u-arute-kartu" data-nonaktif={!t.aktif || undefined}>
              <div className="u-arute-kartu-isi">
                <div className="u-arute-judul">
                  <strong>{t.judul}</strong>
                  {t.aktif ? <Badge variant="success">Aktif</Badge> : <Badge variant="warning">Nonaktif</Badge>}
                  {!t.rute.ada && <Badge variant="danger">Aksi tidak ada lagi</Badge>}
                </div>
                <p className="u-arute-kalimat">
                  Sebelum aksi aplikasi <strong>“{t.rute.nama}”</strong>
                  {t.rute.modul ? ` (${t.rute.modul})` : ''} dijalankan, SIAKAD memeriksa aturan untuk {kalimatSubjek(t.subjek, t.subjek_sumber, kat.data)}
                  {t.bila.length ? `, hanya bila ${t.bila.map((b) => `${labelSumberRute(b.sumber, kat.data)} berisi ${b.nilai.map((n) => `“${n}”`).join(' atau ')}`).join(' dan ')}` : ''}.
                </p>
                <span className="u-arute-meta">
                  {t.jumlah_aturan_aktif ? `${t.jumlah_aturan_aktif} aturan aktif` : 'Belum ada aturan aktif'} · {t.kategori.map(labelKategoriAturan).join(', ')}
                  <details className="u-arute-teknis">
                    <summary>Detail teknis</summary>
                    <code>{t.rute.kunci}</code> · <code>{t.kode}</code>
                  </details>
                </span>
              </div>
              <div className="u-arute-aksi">
                <Button variant="outline" size="sm" onClick={() => setSim(t)}>
                  <FlaskConical /> Simulasi
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setWizard({ titik: t })}>
                  <Pencil /> Ubah
                </Button>
                <Button variant="ghost" size="sm" iconOnly aria-label={`Hapus ${t.judul}`} onClick={() => setHapus(t)}>
                  <Trash2 />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <WizardTitikRute open={wizard !== null} titik={wizard?.titik ?? null} onOpenChange={(o) => !o && setWizard(null)} />
      <SimulasiTitikRute titik={sim} onOpenChange={(o) => !o && setSim(null)} />
      <ConfirmDialog
        open={hapus !== null}
        onOpenChange={(o) => !o && setHapus(null)}
        title={`Hapus titik “${hapus?.judul ?? ''}”?`}
        description="Aksinya tidak lagi diperiksa aturan. Titik yang masih punya aturan aktif atau diajukan tidak bisa dihapus."
        confirmLabel="Hapus titik"
        tone="danger"
        onConfirm={async () => {
          try {
            await siakad.request({ method: 'POST', path: `/v1/aturan/rute/${encodeURIComponent(hapus!.kode)}/hapus` });
          } catch (e) {
            toast.add({ title: 'Titik tidak dihapus', description: pesanGalat(e), type: 'error' });
            throw e;
          }
          invalidateSiakad('aturan');
          toast.add({ title: 'Titik dihapus', type: 'success' });
          setHapus(null);
        }}
      />
    </div>
  );
}

// ================================================================ Wizard
/** Sumber manual: pilih "dari" + nama isian. */
export function PilihSumberRute({ value, onChange, katalog, subjek, label }: { value: string; onChange: (v: string) => void; katalog?: KatalogRute; subjek?: SubjekRute | ''; label: string }) {
  const m = /^(pengguna|path|query|body|cari:[a-z_]+:(?:path|query|body)):(.*)$/.exec(value) ?? /^(cari:[a-z_]+):(pengguna):(.*)$/.exec(value);
  const dari = m?.[1] ?? 'body';
  const nama = m?.[2] ?? '';
  const opsi = [
    { value: 'body', label: 'Isian formulir' },
    { value: 'path', label: 'Bagian alamat (teknis)' },
    { value: 'query', label: 'Parameter alamat (teknis)' },
    { value: 'pengguna', label: 'Pengguna yang sedang masuk' },
    ...(katalog?.cari ?? [])
      .filter((c) => !subjek || c.subjek === subjek)
      .flatMap((c) => (['path', 'body'] as const).map((d) => ({ value: `cari:${c.kode}:${d}`, label: `${c.label}, dari ${d === 'path' ? 'alamat' : 'isian'} (${c.dari})` }))),
  ];
  return (
    <div className="u-arute-sumber" role="group" aria-label={label}>
      <Pilihan tampilan="daftar" aria-label={`${label}: dari`} options={opsi} value={dari} onValueChange={(v) => onChange(`${v ?? 'body'}:${v === 'pengguna' ? 'nim' : nama}`)} />
      {dari === 'pengguna' ? (
        <Pilihan
          tampilan="daftar"
          aria-label={`${label}: data pengguna`}
          options={[
            { value: 'nim', label: 'NIM (mahasiswa)' },
            { value: 'username', label: 'Username' },
            { value: 'nidn', label: 'NIDN (dosen)' },
          ]}
          value={nama || 'nim'}
          onValueChange={(v) => onChange(`pengguna:${v ?? 'nim'}`)}
        />
      ) : (
        <Input value={nama} onChange={(e) => onChange(`${dari}:${e.target.value.trim()}`)} placeholder="nama isian, mis. nim" aria-label={`${label}: nama isian`} spellCheck={false} />
      )}
    </div>
  );
}

/** Tambah/ubah titik dari aksi aplikasi: memakai panel tunggal `WizardTitikPenerapan` (sumber = aksi aplikasi). */
export function WizardTitikRute({ open, onOpenChange, titik }: { open: boolean; onOpenChange: (o: boolean) => void; titik: TitikRute | null }) {
  const daftar = useSiakadQuery<Array<TitikKelolaAturan>>(['aturan', 'titik-kelola'], (s, signal) => s.request({ method: 'GET', path: '/v1/aturan/titik' }, { signal }), { staleTime: 60_000, enabled: open && Boolean(titik) });
  const t = titik ? (daftar.data?.find((x) => x.kode === titik.kode) ?? null) : null;
  if (titik && !t) return null;
  return <WizardTitikPenerapan open={open} onOpenChange={onOpenChange} titik={t} sumberAwal={titik ? undefined : 'rute'} />;
}

// ================================================================ Simulasi
/** Panel simulasi: isi NIM/username + isian aksi → apakah aksi akan ditolak, dengan alasan kalimat aturan. */
export function SimulasiTitikRute({ titik, onOpenChange, aturanId }: { titik: TitikRute | null; onOpenChange: (o: boolean) => void; aturanId?: string | null }) {
  const siakad = useSiakad();
  const [sebagai, setSebagai] = React.useState('');
  const [isian, setIsian] = React.useState<Array<{ k: string; v: string }>>([]);
  const [path, setPath] = React.useState<Record<string, string>>({});
  const [hasil, setHasil] = React.useState<HasilSimulasiRute | null>(null);
  const [galat, setGalat] = React.useState<unknown>(null);
  const [sibuk, setSibuk] = React.useState(false);
  React.useEffect(() => {
    setHasil(null);
    setGalat(null);
    setSebagai('');
    setPath({});
    setIsian(titik ? titik.bila.filter((b) => b.sumber.startsWith('body:')).map((b) => ({ k: b.sumber.slice(5), v: b.nilai[0] ?? '' })) : []);
  }, [titik]);
  const pakaiPengguna = titik?.subjek_sumber.some((s) => s.startsWith('pengguna:')) ?? false;
  const paramPath = [...(titik?.rute.path.matchAll(/\{([a-z_]+)\}/g) ?? [])].map((m) => m[1]!);
  const jalankan = async () => {
    if (!titik) return;
    setSibuk(true);
    setGalat(null);
    try {
      const r = await siakad.request<HasilSimulasiRute>({
        method: 'POST',
        path: '/v1/aturan/rute/simulasi',
        body: { titik: titik.kode, sebagai: sebagai.trim() || undefined, path, isian: Object.fromEntries(isian.filter((x) => x.k.trim()).map((x) => [x.k.trim(), x.v])), aturan: aturanId ?? undefined },
      });
      setHasil(r.data);
    } catch (e) {
      setGalat(e);
    } finally {
      setSibuk(false);
    }
  };
  return (
    <PanelForm
      open={titik !== null}
      onOpenChange={onOpenChange}
      title={`Simulasi: ${titik?.judul ?? ''}`}
      description="Memakai pemeriksaan SIAKAD yang sungguhan, tanpa menjalankan aksinya. Tidak ada data yang berubah."
      labelSimpan={sibuk ? 'Memeriksa…' : 'Periksa sekarang'}
      labelBatal="Tutup"
      onSimpan={async (): Promise<false> => {
        await jalankan();
        return false;
      }}
      berubah={false}
    >
      <div className="u-arute-langkah">
        <Field
          label={pakaiPengguna ? 'Sebagai pengguna (NIM/username)' : 'Pengguna (opsional)'}
          required={pakaiPengguna}
          description={pakaiPengguna ? 'Aksi ini mengambil orang dari pengguna yang sedang masuk.' : 'Isi bila sumber data memakai pengguna yang masuk.'}
        >
          <Input value={sebagai} onChange={(e) => setSebagai(e.target.value)} placeholder="mis. K5523004" />
        </Field>
        {paramPath.map((p) => (
          <Field key={p} label={`Bagian alamat “${p}”`}>
            <Input value={path[p] ?? ''} onChange={(e) => setPath((x) => ({ ...x, [p]: e.target.value }))} />
          </Field>
        ))}
        <Field label="Isian yang dikirim aksi" optional>
          <div className="u-arute-baris-daftar">
            {isian.map((x, i) => (
              <div key={i} className="u-arute-baris">
                <Input value={x.k} onChange={(e) => setIsian((s) => s.map((y, j) => (j === i ? { ...y, k: e.target.value } : y)))} placeholder="nama, mis. jenis" aria-label={`Nama isian ${i + 1}`} />
                <span aria-hidden>=</span>
                <Input value={x.v} onChange={(e) => setIsian((s) => s.map((y, j) => (j === i ? { ...y, v: e.target.value } : y)))} placeholder="nilai" aria-label={`Nilai isian ${i + 1}`} />
                <Button variant="ghost" size="sm" iconOnly aria-label={`Hapus isian ${i + 1}`} onClick={() => setIsian((s) => s.filter((_, j) => j !== i))}>
                  <X />
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setIsian((s) => [...s, { k: '', v: '' }])}>
              <Plus /> Tambah isian
            </Button>
          </div>
        </Field>
        {galat !== null && <GalatApi error={galat as Error} />}
        {hasil && <HasilSimulasiRuteKartu hasil={hasil} />}
      </div>
    </PanelForm>
  );
}

/** Nama data awam dari kode indikator (singkatan tetap kapital). */
function labelIndikator(k: string): string {
  const t = k.replace(/_/g, ' ').replace(/\b(ipk|ips|sks|ukt|edom|bkd)\b/g, (m) => m.toUpperCase());
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function HasilSimulasiRuteKartu({ hasil }: { hasil: HasilSimulasiRute }) {
  if (!hasil.diperiksa)
    return (
      <Alert variant="neutral" title="Tidak diperiksa aturan">
        {hasil.alasan_lewat}
      </Alert>
    );
  const ind = hasil.hasil[0]?.indikator ?? {};
  const data = Object.entries(ind)
    .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
    .map(([k, v]) => `${labelIndikator(k)} ${typeof v === 'number' ? v.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : v}`);
  return hasil.akan_ditolak ? (
    <Alert variant="danger" title="Hasil: akan ditolak">
      <p>{hasil.alasan}</p>
    </Alert>
  ) : (
    <Alert variant="success" title="Hasil: akan diizinkan">
      <p>{hasil.hasil.some((h) => (h.diterapkan ?? 0) > 0) ? 'Semua syarat aturan yang berlaku terpenuhi.' : 'Belum ada aturan berlaku untuk orang ini.'}</p>
      {data.length > 0 && <p className="u-ask-sub">Data saat ini: {data.join(', ')}</p>}
    </Alert>
  );
}
