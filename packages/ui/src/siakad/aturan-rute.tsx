'use client';
import * as React from 'react';
import { CircleCheck, FlaskConical, Pencil, Plus, Route as IkonRute, Search, ShieldAlert, Trash2, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Empty } from '../components/display';
import { Field, Input, Textarea } from '../components/forms';
import { Pilihan, PilihanBanyak, PanelForm } from '../components/formulir';
import { ConfirmDialog, useToast } from '../components/overlays';
import { PanelLangkah } from '../components/panel-langkah';
import { labelKategoriAturan, useKatalogAturan } from './aturan';
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
function usePeran() {
  return useSiakadQuery<Array<{ kode: string; nama: string }>>(['rbac', 'peran'], (s, signal) => s.request({ method: 'GET', path: '/v1/rbac/peran', query: { per_page: 100 } }, { signal }), { staleTime: 300_000 });
}

// ================================================================ Bahasa awam untuk sumber
const SUBJEK: Array<{ v: SubjekRute; judul: string; ket: string }> = [
  { v: 'mahasiswa', judul: 'Mahasiswa', ket: 'IPK, SKS, status, tagihan, dan data akademik mahasiswa yang melakukan/dikenai aksi.' },
  { v: 'pegawai', judul: 'Pegawai', ket: 'Dosen atau tendik: masa kerja, jabatan, BKD.' },
  { v: 'pendaftar', judul: 'Pendaftar', ket: 'Calon mahasiswa baru (PMB).' },
  { v: 'umum', judul: 'Tidak ada orang tertentu', ket: 'Hanya waktu/periode/prodi, mis. masa buka layanan.' },
];
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
interface IsiRute {
  rute: RuteKatalog | null;
  subjek: SubjekRute | '';
  subjek_sumber: string[];
  tahun_sumber: string[];
  prodi_sumber: string[];
  bila: Array<{ sumber: string; nilai: string }>;
  konteks: Array<{ kode: string; judul: string; tipe: 'angka' | 'teks' | 'benar_salah'; sumber: string }>;
  judul: string;
  keterangan: string;
  kategori: string;
  jenis: string[];
  pengatur: string[];
}
const kosong = (): IsiRute => ({ rute: null, subjek: '', subjek_sumber: [], tahun_sumber: ['query:tahun_id', 'body:tahun_id'], prodi_sumber: [], bila: [], konteks: [], judul: '', keterangan: '', kategori: '', jenis: ['syarat'], pengatur: [] });

/** Sumber manual: pilih "dari" + nama isian. */
function PilihSumber({ value, onChange, katalog, subjek, label }: { value: string; onChange: (v: string) => void; katalog?: KatalogRute; subjek?: SubjekRute | ''; label: string }) {
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

export function WizardTitikRute({ open, onOpenChange, titik }: { open: boolean; onOpenChange: (o: boolean) => void; titik: TitikRute | null }) {
  const kat = useKatalogRute(open);
  const katalogAturan = useKatalogAturan();
  const peran = usePeran();
  const siakad = useSiakad();
  const toast = useToast();
  const ubah = Boolean(titik);
  const [langkah, setLangkah] = React.useState(0);
  const [isi, setIsi] = React.useState<IsiRute>(kosong);
  const [cari, setCari] = React.useState('');
  const [modul, setModul] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!open) return;
    setLangkah(0);
    setCari('');
    setModul(null);
    if (!titik) return setIsi(kosong());
    setIsi({
      rute: null,
      subjek: titik.subjek,
      subjek_sumber: titik.subjek_sumber,
      tahun_sumber: titik.tahun_sumber,
      prodi_sumber: titik.prodi_sumber,
      bila: titik.bila.map((b) => ({ sumber: b.sumber, nilai: b.nilai.join(', ') })),
      konteks: titik.konteks.map((k) => ({ kode: k.kode, judul: k.judul, tipe: (k.tipe as 'angka') ?? 'teks', sumber: titik.konteks_sumber[k.kode] ?? `body:${k.kode}` })),
      judul: titik.judul,
      keterangan: titik.keterangan ?? '',
      kategori: titik.kategori[0] ?? '',
      jenis: titik.jenis,
      pengatur: [],
    });
  }, [open, titik]);
  // Saat ubah, rute dari katalog (untuk saran) setelah katalog termuat.
  React.useEffect(() => {
    if (!titik || !kat.data || isi.rute) return;
    const r = kat.data.kelompok.flatMap((g) => g.rute).find((x) => x.kunci === titik.rute.kunci);
    if (r) setIsi((x) => ({ ...x, rute: r }));
  }, [titik, kat.data, isi.rute]);
  const set = <K extends keyof IsiRute>(k: K, v: IsiRute[K]) => setIsi((x) => ({ ...x, [k]: v }));
  const kata = cari.trim().toLowerCase();
  const semua = kat.data?.kelompok.flatMap((g) => g.rute.map((r) => ({ ...r, modul: g.modul }))) ?? [];
  const hasilCari = kata ? semua.filter((r) => `${r.nama} ${r.modul} ${r.tag} ${r.path}`.toLowerCase().includes(kata)).slice(0, 60) : [];
  const ruteModul = modul ? (kat.data?.kelompok.find((g) => g.modul === modul)?.rute ?? []) : [];
  const saranSubjek = isi.rute && isi.subjek && isi.subjek !== 'umum' ? isi.rute.saran[isi.subjek] : [];
  const pilihRute = (r: RuteKatalog) =>
    setIsi((x) => ({
      ...x,
      rute: r,
      judul: x.judul && ubah ? x.judul : r.nama,
      subjek: x.subjek || (r.saran.mahasiswa.length ? 'mahasiswa' : ''),
      subjek_sumber: x.subjek_sumber.length && ubah ? x.subjek_sumber : r.saran.mahasiswa[0] ? [r.saran.mahasiswa[0].sumber] : [],
    }));
  const kartuRute = (r: RuteKatalog & { modul?: string }) => (
    <button
      key={r.kunci}
      type="button"
      role="radio"
      aria-checked={isi.rute?.kunci === r.kunci}
      className="u-arute-opsi"
      data-pilih={isi.rute?.kunci === r.kunci || undefined}
      onClick={() => pilihRute(r)}
    >
      <strong>{r.nama}</strong>
      <span className="u-arute-opsi-sub">
        {r.modul ? `${r.modul} · ` : ''}
        {r.tag.includes(':') ? r.tag.split(':').slice(1).join(':').trim() : r.tag}
        {r.titik.length ? ` · sudah ada titik: ${r.titik.map((t) => t.judul).join(', ')}` : ''}
      </span>
      <details className="u-arute-teknis" onClick={(e) => e.stopPropagation()}>
        <summary>Detail teknis</summary>
        <code>{r.kunci}</code>
      </details>
    </button>
  );
  const kalimat = isi.rute
    ? `Sebelum aksi aplikasi “${isi.rute.nama}” dijalankan, SIAKAD memeriksa aturan aktif untuk ${kalimatSubjek(isi.subjek, isi.subjek_sumber, kat.data)}${
        isi.bila.filter((b) => b.sumber && b.nilai.trim()).length ? `, hanya bila ${isi.bila.filter((b) => b.sumber && b.nilai.trim()).map((b) => `${labelSumberRute(b.sumber, kat.data)} berisi ${b.nilai.split(',').map((n) => `“${n.trim()}”`).join(' atau ')}`).join(' dan ')}` : ''
      }. Bila aturan dilanggar, aksi ditolak dengan kalimat aturannya.`
    : '';
  return (
    <>
      <PanelLangkah
        open={open}
        onOpenChange={onOpenChange}
        step={langkah}
        onStepChange={setLangkah}
        mode={ubah ? 'ubah' : 'buat'}
        size="xl"
        title={ubah ? `Ubah titik pemeriksaan: ${titik?.judul}` : 'Titik pemeriksaan baru'}
        description="Pilih aksi aplikasi, siapa yang diperiksa, dan dari mana datanya. Aplikasinya tidak perlu diubah."
        finishLabel={ubah ? 'Simpan perubahan' : 'Buat titik'}
        steps={[
          {
            id: 'aksi',
            title: 'Aksi',
            description: 'Aksi mana yang diberi aturan?',
            validate: () => (isi.rute || ubah ? null : 'Pilih satu aksi.'),
            content: !kat.data ? (
              kat.error ? (
                <GalatApi error={kat.error} onRetry={kat.refetch} />
              ) : (
                <Skeleton height={240} />
              )
            ) : (
              <div className="u-arute-langkah">
                {isi.rute && (
                  <Alert variant="info" icon={<CircleCheck />} title={`Dipilih: ${isi.rute.nama}`}>
                    {isi.rute.keterangan.slice(0, 220) || isi.rute.tag}
                  </Alert>
                )}
                <div className="u-aturan-cari">
                  <Search aria-hidden />
                  <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder={`Cari di ${kat.data.jumlah} aksi, mis. seminar proposal, KRS, cuti`} aria-label="Cari aksi" />
                </div>
                {kata ? (
                  <div className="u-arute-pilihan" role="radiogroup" aria-label="Hasil pencarian aksi">
                    {hasilCari.length ? hasilCari.map(kartuRute) : <Empty title="Tidak ada aksi yang cocok" />}
                  </div>
                ) : modul ? (
                  <div className="u-arute-pilihan" role="radiogroup" aria-label={`Aksi ${modul}`}>
                    <Button variant="ghost" size="sm" onClick={() => setModul(null)}>
                      ← Semua modul
                    </Button>
                    {ruteModul.map(kartuRute)}
                  </div>
                ) : (
                  <ul className="u-arute-modul" aria-label="Modul">
                    {kat.data.kelompok.map((g) => (
                      <li key={g.modul}>
                        <button type="button" onClick={() => setModul(g.modul)}>
                          <strong>{g.modul}</strong>
                          <span>{g.jumlah} aksi</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ),
          },
          {
            id: 'subjek',
            title: 'Siapa diperiksa',
            description: 'Orang yang datanya dipakai kondisi aturan',
            validate: () => (!isi.subjek ? 'Pilih siapa yang diperiksa.' : isi.subjek !== 'umum' && !isi.subjek_sumber.filter((s) => /:[^:]+$/.test(s)).length ? 'Pilih dari mana datanya diambil.' : null),
            content: (
              <div className="u-arute-langkah">
                <div className="u-aturan-jenis-kisi" data-kolom="4" role="radiogroup" aria-label="Siapa yang diperiksa">
                  {SUBJEK.map((s) => (
                    <button
                      key={s.v}
                      type="button"
                      role="radio"
                      aria-checked={isi.subjek === s.v}
                      className="u-aturan-jenis-opsi"
                      data-pilih={isi.subjek === s.v || undefined}
                      disabled={ubah && (titik?.jumlah_aturan_aktif ?? 0) > 0 && titik?.subjek !== s.v}
                      onClick={() => setIsi((x) => ({ ...x, subjek: s.v, subjek_sumber: s.v === 'umum' ? [] : x.rute?.saran[s.v]?.[0] ? [x.rute.saran[s.v][0]!.sumber] : [] }))}
                    >
                      <strong>{s.judul}</strong>
                      <span className="u-aturan-jenis-contoh">{s.ket}</span>
                    </button>
                  ))}
                </div>
                {isi.subjek && isi.subjek !== 'umum' && (
                  <Field label={`Dari mana ${LABEL_SUBJEK[isi.subjek]} diambil?`} description="Disarankan dari aksi yang dipilih. Data diambil dari SIAKAD.">
                    <div className="u-arute-saran" role="radiogroup" aria-label="Saran sumber">
                      {saranSubjek.map((s) => (
                        <button
                          key={s.sumber}
                          type="button"
                          role="radio"
                          aria-checked={isi.subjek_sumber[0] === s.sumber}
                          className="u-arute-opsi"
                          data-pilih={isi.subjek_sumber[0] === s.sumber || undefined}
                          onClick={() => set('subjek_sumber', [s.sumber])}
                        >
                          <strong>{s.label}</strong>
                        </button>
                      ))}
                    </div>
                    <details className="u-aturan-lanjutan" open={!saranSubjek.length || (isi.subjek_sumber[0] !== undefined && !saranSubjek.some((s) => s.sumber === isi.subjek_sumber[0])) || undefined}>
                      <summary>Sumber lain (teknis)</summary>
                      <PilihSumber value={isi.subjek_sumber[0] ?? 'body:'} onChange={(v) => set('subjek_sumber', [v])} katalog={kat.data} subjek={isi.subjek} label="Sumber subjek" />
                    </details>
                  </Field>
                )}
              </div>
            ),
          },
          {
            id: 'data',
            title: 'Data & syarat',
            optional: true,
            description: 'Periode, hanya bila, data tambahan',
            validate: () =>
              isi.bila.some((b) => !b.sumber.split(':')[1] || !b.nilai.trim())
                ? 'Lengkapi baris “hanya bila” atau hapus.'
                : isi.konteks.some((k) => !/^[a-z][a-z0-9_]{1,40}$/.test(k.kode) || !k.judul.trim())
                  ? 'Data tambahan: kode huruf kecil (mis. jumlah_sks) dan label wajib.'
                  : null,
            content: (
              <div className="u-arute-langkah">
                <Field label="Periode" description="Periode diambil dari periode yang dipilih di aplikasi; bila tidak ada, dipakai periode aktif.">
                  <PilihanBanyak
                    options={[
                      { value: 'query:tahun_id', label: 'Periode di alamat (teknis: tahun_id)' },
                      { value: 'body:tahun_id', label: 'Periode di isian formulir (teknis: tahun_id)' },
                    ]}
                    value={isi.tahun_sumber}
                    onValueChange={(v) => set('tahun_sumber', v)}
                    placeholder="Periode aktif"
                  />
                </Field>
                {isi.subjek === 'umum' && (
                  <Field label="Prodi" optional description="Untuk cakupan aturan per prodi bila tidak ada orang yang diperiksa.">
                    <PilihanBanyak options={(isi.rute?.saran.prodi ?? []).map((s) => ({ value: s.sumber, label: s.label }))} value={isi.prodi_sumber} onValueChange={(v) => set('prodi_sumber', v)} placeholder="Tanpa prodi" />
                  </Field>
                )}
                <Field label="Hanya bila" optional description="Hanya diperiksa bila isian formulir berisi nilai tertentu, mis. jenis berisi “proposal” (bukan seminar hasil).">
                  <div className="u-arute-baris-daftar">
                    {isi.bila.map((b, i) => (
                      <div key={i} className="u-arute-baris">
                        <PilihSumber value={b.sumber} onChange={(v) => set('bila', isi.bila.map((x, j) => (j === i ? { ...x, sumber: v } : x)))} katalog={undefined} label={`Hanya bila ${i + 1}`} />
                        <span>berisi</span>
                        <Input value={b.nilai} onChange={(e) => set('bila', isi.bila.map((x, j) => (j === i ? { ...x, nilai: e.target.value } : x)))} placeholder="nilai, pisahkan koma" aria-label={`Nilai hanya bila ${i + 1}`} />
                        <Button variant="ghost" size="sm" iconOnly aria-label={`Hapus syarat ${i + 1}`} onClick={() => set('bila', isi.bila.filter((_, j) => j !== i))}>
                          <X />
                        </Button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => set('bila', [...isi.bila, { sumber: 'body:jenis', nilai: '' }])}>
                      <Plus /> Tambah syarat “hanya bila”
                    </Button>
                  </div>
                </Field>
                <Field label="Data tambahan dari aksi" optional description="Angka/teks yang dikirim aksi dan ingin dipakai di kondisi, mis. jumlah SKS yang diambil.">
                  <div className="u-arute-baris-daftar">
                    {isi.konteks.map((k, i) => {
                      const ubahK = (p: Partial<IsiRute['konteks'][number]>) => set('konteks', isi.konteks.map((x, j) => (j === i ? { ...x, ...p } : x)));
                      return (
                        <div key={i} className="u-arute-baris">
                          <Input value={k.judul} onChange={(e) => ubahK({ judul: e.target.value })} placeholder="Label, mis. Jumlah SKS" aria-label={`Label data ${i + 1}`} />
                          <Input value={k.kode} onChange={(e) => ubahK({ kode: e.target.value.trim(), sumber: `body:${e.target.value.trim()}` })} placeholder="kode, mis. jumlah_sks" aria-label={`Kode data ${i + 1}`} spellCheck={false} />
                          <Pilihan
                            tampilan="daftar"
                            aria-label={`Jenis data ${i + 1}`}
                            options={[
                              { value: 'angka', label: 'Angka' },
                              { value: 'teks', label: 'Teks' },
                              { value: 'benar_salah', label: 'Ya/tidak' },
                            ]}
                            value={k.tipe}
                            onValueChange={(v) => ubahK({ tipe: (v ?? 'teks') as 'angka' })}
                          />
                          <Button variant="ghost" size="sm" iconOnly aria-label={`Hapus data ${i + 1}`} onClick={() => set('konteks', isi.konteks.filter((_, j) => j !== i))}>
                            <X />
                          </Button>
                        </div>
                      );
                    })}
                    <Button variant="ghost" size="sm" onClick={() => set('konteks', [...isi.konteks, { kode: '', judul: '', tipe: 'angka', sumber: 'body:' }])}>
                      <Plus /> Tambah data
                    </Button>
                  </div>
                </Field>
              </div>
            ),
          },
          {
            id: 'nama',
            title: 'Nama & pengatur',
            description: 'Dilihat pejabat saat membuat aturan',
            validate: () => (!isi.judul.trim() ? 'Tulis nama titik pemeriksaan.' : !isi.kategori ? 'Pilih unit pemilik aturan.' : null),
            content: (
              <div className="u-arute-langkah">
                <Field label="Nama titik pemeriksaan" required description="Dalam bahasa sehari-hari, mis. “Mahasiswa mendaftar seminar proposal”. Nama ini yang dilihat pejabat.">
                  <Input value={isi.judul} maxLength={150} onChange={(e) => set('judul', e.target.value)} />
                </Field>
                <Field label="Keterangan" optional>
                  <Textarea rows={2} value={isi.keterangan} onChange={(e) => set('keterangan', e.target.value)} />
                </Field>
                <Field label="Unit pemilik" required description="Menentukan siapa yang berwenang mengatur aturannya.">
                  <Pilihan
                    options={(katalogAturan.data?.kategori ?? []).map((k) => ({ value: k.kode, label: labelKategoriAturan(k.kode) }))}
                    value={isi.kategori || null}
                    onValueChange={(v) => set('kategori', v ?? '')}
                    placeholder="Pilih…"
                  />
                </Field>
                <Field label="Pejabat yang boleh membuat aturan di sini" optional description="Bila kosong, yang boleh membuat aturan adalah pengatur unit pemilik.">
                  <PilihanBanyak options={(peran.data ?? []).map((p) => ({ value: p.kode, label: p.nama }))} value={isi.pengatur} onValueChange={(v) => set('pengatur', v)} placeholder="Pilih peran…" />
                </Field>
                <Field label="Jenis aturan yang boleh" description="Syarat = tolak bila tidak terpenuhi. Batas waktu = hanya pada tanggal tertentu.">
                  <PilihanBanyak
                    options={[
                      { value: 'syarat', label: 'Syarat' },
                      { value: 'batas_waktu', label: 'Batas waktu' },
                      { value: 'batas_nilai', label: 'Batas jumlah' },
                    ]}
                    value={isi.jenis}
                    onValueChange={(v) => set('jenis', v)}
                  />
                </Field>
              </div>
            ),
          },
          {
            id: 'tinjau',
            title: 'Tinjau',
            description: 'Periksa sebelum disimpan',
            content: (
              <div className="u-arute-langkah">
                <div className="u-arute-tinjau">
                  <p className="u-arute-kalimat">{kalimat || 'Pilih aksi dulu.'}</p>
                  <dl>
                    <dt>Nama titik</dt>
                    <dd>{isi.judul || '-'}</dd>
                    <dt>Unit pemilik</dt>
                    <dd>{isi.kategori ? labelKategoriAturan(isi.kategori) : '-'}</dd>
                    <dt>Periode</dt>
                    <dd>{isi.tahun_sumber.length ? isi.tahun_sumber.map((s) => labelSumberRute(s, kat.data)).join(' / ') : 'Periode aktif'}</dd>
                    {isi.konteks.length > 0 && (
                      <>
                        <dt>Data tambahan</dt>
                        <dd>{isi.konteks.map((k) => k.judul).join(', ')}</dd>
                      </>
                    )}
                  </dl>
                </div>
                <Alert variant="neutral" icon={<ShieldAlert />} title="Setelah titik dibuat">
                  Pejabat membuat aturan untuk titik ini dengan mengisi contoh kalimat (wajib mencantumkan SK dan disetujui pemeriksa aturan). Aturan baru diperiksa setelah berlaku. Uji dulu dengan tombol Simulasi.
                </Alert>
              </div>
            ),
          },
        ]}
        onFinish={async () => {
          const body = {
            judul: isi.judul.trim(),
            keterangan: isi.keterangan.trim() || undefined,
            ...(isi.rute && (!ubah || isi.rute.kunci !== titik?.rute.kunci) ? { rute: isi.rute.kunci } : {}),
            subjek: isi.subjek,
            subjek_sumber: isi.subjek === 'umum' ? [] : isi.subjek_sumber,
            tahun_sumber: isi.tahun_sumber,
            prodi_sumber: isi.prodi_sumber,
            kategori: [isi.kategori],
            jenis: isi.jenis.length ? isi.jenis : ['syarat'],
            konteks: isi.konteks.map((k) => ({ kode: k.kode, judul: k.judul.trim(), tipe: k.tipe })),
            konteks_sumber: Object.fromEntries(isi.konteks.map((k) => [k.kode, k.sumber])),
            bila: isi.bila.map((b) => ({ sumber: b.sumber, nilai: b.nilai.split(',').map((x) => x.trim()).filter(Boolean) })),
            ...(isi.pengatur.length ? { pengatur: isi.pengatur.map((kode) => ({ jenis: 'peran', kode })) } : {}),
          };
          try {
            await siakad.request({ method: 'POST', path: ubah ? `/v1/aturan/rute/${encodeURIComponent(titik!.kode)}` : '/v1/aturan/rute', body });
          } catch (e) {
            return pesanGalat(e);
          }
          invalidateSiakad('aturan');
          toast.add({ title: ubah ? 'Titik diperbarui' : 'Titik dibuat', description: ubah ? undefined : 'Pejabat kini bisa membuat aturan untuk titik ini.', type: 'success' });
          onOpenChange(false);
          return null;
        }}
      />
    </>
  );
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
