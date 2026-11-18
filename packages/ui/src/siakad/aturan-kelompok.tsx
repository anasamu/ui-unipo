'use client';
import * as React from 'react';
import { ChevronRight, Ellipsis, Eye, FileBadge, FilePlus2, Files, Scale, Search, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { Empty } from '../components/display';
import { Checkbox, Input, SegmentedControl } from '../components/forms';
import { Pilihan } from '../components/formulir';
import { Menu, useToast } from '../components/overlays';
import { PanelLangkah } from '../components/panel-langkah';
import { WizardReview } from '../components/wizard';
import { GalatApi } from './galat';
import { PilihSK } from './isian-sk';
import { useFakultasReferensi } from './prodi';
import { invalidateSiakad, pesanGalat, useSiakad } from './provider';
import {
  FormLampiranAturan,
  ringkasKetentuan,
  statusTampil,
  useDaftarAturan,
  useKatalogAturan,
  type Aturan,
  type KatalogAturan,
  type KategoriAturan,
} from './aturan';

/*
 * Daftar aturan berkelompok (registri aturan): satu baris per aturan, dikelompokkan per bidang langkah (Perwalian, KRS,
 * Cuti, Nilai & KHS, Tugas akhir, ...). Aturan dengan judul dan langkah sama di beberapa lingkup (mis. "Syarat dosen PA"
 * bawaan tiap fakultas) menjadi satu baris induk "6 fakultas" yang bisa dibuka. Dipakai KelolaAturan tampilan="kelompok".
 *
 *   <DaftarAturanKelompok kategori="akademik" onBuka={(a) => buka(a.id)} bolehAtur />
 *   <DaftarAturanKelompok kategori="akademik" fakultas="02" onBuka={...} />     portal Fakultas: universitas + fakultas 02
 */

const KATA_KECIL = new Set(['dan', 'atau', 'dari', 'di', 'ke', 'untuk', 'serta']);
/** "FAKULTAS TEKNIK DAN PERENCANAAN" -> "Fakultas Teknik dan Perencanaan" (nama referensi yang ditulis kapital semua). */
export function rapikanNamaUnit(nama: string): string {
  if (nama !== nama.toUpperCase()) return nama;
  return nama
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && KATA_KECIL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/** Lingkup aturan: pemilik (universitas atau fakultas) dan fakultas tempat berlakunya. */
export interface LingkupAturan {
  /** universitas = dikelola pusat (BAAK/WR); fakultas/prodi = aturan fakultas (SK Dekan, dikelola di aplikasi Fakultas). */
  tingkat: 'universitas' | 'fakultas' | 'prodi';
  /** Kode fakultas tempat aturan berlaku: aturan fakultas, atau aturan universitas yang cakupannya satu fakultas. */
  fakultas: string | null;
}

type AturanLingkup = Aturan & { tingkat?: 'universitas' | 'fakultas' | 'prodi'; lingkup_fakultas?: string | null };

export function lingkupAturan(a: Aturan): LingkupAturan {
  const x = a as AturanLingkup;
  const fakCakupan = a.cakupan?.fakultas?.length === 1 ? a.cakupan.fakultas[0]! : null;
  if (x.tingkat && x.tingkat !== 'universitas') return { tingkat: x.tingkat, fakultas: x.lingkup_fakultas ?? fakCakupan };
  return { tingkat: 'universitas', fakultas: fakCakupan };
}

/** Aturan ini berlaku (atau tampil) untuk fakultas `kode`: aturan universitas umum, atau yang lingkupnya fakultas itu. */
export function aturanUntukFakultas(a: Aturan, kode: string): boolean {
  const l = lingkupAturan(a);
  if (l.fakultas) return l.fakultas === kode;
  const fak = a.cakupan?.fakultas;
  return !fak?.length || fak.includes(kode);
}

/** Keadaan SK: ada, butuh (aktif tanpa SK, atau draf yang menunggu SK), atau tidak perlu ditampilkan. */
export function keadaanSkAturan(a: Aturan): 'ada' | 'butuh' {
  if (a.jumlah_sk || a.sk?.nomor) return 'ada';
  return 'butuh';
}

const BIDANG: Array<{ kode: string; label: string; awalan: string[] }> = [
  { kode: 'perwalian', label: 'Perwalian', awalan: ['akademik.pa'] },
  { kode: 'registrasi', label: 'Registrasi & her-registrasi', awalan: ['registrasi.', 'herregistrasi.'] },
  { kode: 'krs', label: 'KRS', awalan: ['krs.'] },
  { kode: 'kuliah', label: 'Perkuliahan & presensi', awalan: ['presensi.', 'kuliah.', 'jadwal.'] },
  { kode: 'ujian', label: 'Ujian semester', awalan: ['ujian.'] },
  { kode: 'edom', label: 'EDOM', awalan: ['edom.'] },
  { kode: 'nilai', label: 'Nilai & KHS', awalan: ['nilai.', 'khs.', 'transkrip.'] },
  { kode: 'cuti', label: 'Cuti & status mahasiswa', awalan: ['cuti.', 'mundur.', 'aktif.'] },
  { kode: 'ta', label: 'Tugas akhir', awalan: ['ta.'] },
  { kode: 'kkn', label: 'KKN & MBKM', awalan: ['kkn.', 'mbkm.'] },
  { kode: 'lulus', label: 'Kelulusan & wisuda', awalan: ['yudisium.', 'wisuda.', 'lulus.', 'skpi.'] },
];

function bidangTitik(titik: string): { kode: string; label: string } {
  return BIDANG.find((b) => b.awalan.some((x) => titik.startsWith(x))) ?? { kode: 'lain', label: 'Lainnya' };
}

interface BarisKelompok {
  kunci: string;
  nama: string;
  titik: string;
  titikJudul: string;
  anggota: Aturan[];
}

type SaringStatus = 'semua' | 'aktif' | 'belum' | 'nonaktif' | 'butuh_sk';

function cocokStatus(a: Aturan, s: SaringStatus): boolean {
  const st = statusTampil(a);
  if (s === 'semua') return true;
  if (s === 'aktif') return a.status === 'aktif';
  if (s === 'nonaktif') return a.status === 'nonaktif';
  if (s === 'belum') return st === 'draf' || st === 'diajukan' || st === 'disetujui' || st === 'dikembalikan';
  return a.status !== 'nonaktif' && keadaanSkAturan(a) === 'butuh';
}

const LABEL_STATUS_RINGKAS: Record<string, { label: string; nada: 'success' | 'warning' | 'info' | 'neutral' | 'danger' | 'primary' }> = {
  aktif: { label: 'Aktif', nada: 'success' },
  draf: { label: 'Draf', nada: 'warning' },
  diajukan: { label: 'Diajukan', nada: 'info' },
  disetujui: { label: 'Disetujui', nada: 'primary' },
  dikembalikan: { label: 'Dikembalikan', nada: 'danger' },
  nonaktif: { label: 'Nonaktif', nada: 'neutral' },
};

function StatusMini({ a }: { a: Aturan }) {
  const st = LABEL_STATUS_RINGKAS[statusTampil(a)] ?? LABEL_STATUS_RINGKAS.draf!;
  const sk = keadaanSkAturan(a);
  return (
    <span className="u-ak-status">
      <Badge variant={st.nada} dot>
        {st.label}
      </Badge>
      {a.status !== 'nonaktif' ? (
        <span className="u-ak-sk" data-sk={sk} title={sk === 'ada' ? `SK ${a.sk?.nomor ?? ''}`.trim() : 'Belum ada SK sebagai dasar hukum'}>
          <FileBadge aria-hidden />
          {sk === 'ada' ? 'Ber-SK' : 'Butuh SK'}
        </span>
      ) : null}
    </span>
  );
}

export interface DaftarAturanKelompokProps {
  kategori?: KategoriAturan;
  /** Portal Fakultas: hanya aturan universitas yang berlaku umum + aturan yang lingkupnya fakultas ini. */
  fakultas?: string | null;
  onBuka?: (a: Aturan) => void;
  /** Boleh melampirkan SK aturan universitas (pengatur kategori). */
  bolehAtur?: boolean;
  /** Boleh melampirkan SK aturan fakultas juga (admin aturan atau pengatur fakultas itu). */
  bolehAturFakultas?: boolean;
  /** Draf bawaan yang menunggu SK: buka wizard aturan di langkah SK (lampirkan & ajukan). */
  onLampirkan?: (a: Aturan) => void;
  /** Teks catatan untuk aturan milik fakultas, mis. "Dikelola di aplikasi Fakultas (SK Dekan)". */
  catatanFakultas?: React.ReactNode;
  className?: string;
}

/** Registri aturan berkelompok per bidang langkah, tanpa baris berulang, dengan saring lingkup/status/cari. */
export function DaftarAturanKelompok({
  kategori,
  fakultas,
  onBuka,
  bolehAtur = false,
  bolehAturFakultas = false,
  onLampirkan,
  catatanFakultas = 'Aturan fakultas ditetapkan dengan SK Dekan dan dikelola di aplikasi Fakultas masing-masing.',
  className,
}: DaftarAturanKelompokProps) {
  const katalog = useKatalogAturan();
  const d = useDaftarAturan({ kategori, per_page: 200 });
  const fakRef = useFakultasReferensi();
  const namaFak = React.useCallback((k: string | null) => (k ? rapikanNamaUnit(fakRef.data?.find((f) => f.kode_fakultas === k)?.nama_fakultas ?? `Fakultas ${k}`) : 'Universitas'), [fakRef.data]);
  const [q, setQ] = React.useState('');
  const [lingkup, setLingkup] = React.useState<string>('semua');
  const [status, setStatus] = React.useState<SaringStatus>('semua');
  const [buka, setBuka] = React.useState<Set<string>>(new Set());
  const [lampir, setLampir] = React.useState<string | null>(null);
  const [massal, setMassal] = React.useState(false);

  const semua = React.useMemo(() => (d.data ?? []).filter((a) => !a.dihapus_at && (!fakultas || aturanUntukFakultas(a, fakultas))), [d.data, fakultas]);
  const bolehLampir = (a: Aturan) => (lingkupAturan(a).tingkat === 'universitas' ? bolehAtur : bolehAturFakultas);

  const tersaring = React.useMemo(() => {
    const kata = q.trim().toLowerCase();
    return semua.filter((a) => {
      const l = lingkupAturan(a);
      if (lingkup === 'universitas' && l.tingkat !== 'universitas') return false;
      if (lingkup === 'fakultas' && l.tingkat === 'universitas') return false;
      if (lingkup.startsWith('fak:') && l.fakultas !== lingkup.slice(4)) return false;
      if (!cocokStatus(a, status)) return false;
      if (kata && ![a.nama, a.kode ?? '', a.titik_judul ?? a.titik, a.keterangan ?? ''].some((s) => s.toLowerCase().includes(kata))) return false;
      return true;
    });
  }, [semua, q, lingkup, status]);

  const kelompok = React.useMemo(() => {
    const baris = new Map<string, BarisKelompok>();
    for (const a of tersaring) {
      const kunci = `${a.titik}|${a.nama.trim().toLowerCase()}`;
      const b = baris.get(kunci) ?? { kunci, nama: a.nama, titik: a.titik, titikJudul: a.titik_judul ?? a.titik, anggota: [] };
      b.anggota.push(a);
      baris.set(kunci, b);
    }
    const bidang = new Map<string, { kode: string; label: string; baris: BarisKelompok[] }>();
    for (const b of baris.values()) {
      b.anggota.sort((x, y) => (lingkupAturan(x).fakultas ?? '').localeCompare(lingkupAturan(y).fakultas ?? ''));
      const g = bidangTitik(b.titik);
      const isi = bidang.get(g.kode) ?? { ...g, baris: [] };
      isi.baris.push(b);
      bidang.set(g.kode, isi);
    }
    const urut = [...BIDANG.map((x) => x.kode), 'lain'];
    return [...bidang.values()]
      .sort((x, y) => urut.indexOf(x.kode) - urut.indexOf(y.kode))
      .map((g) => ({ ...g, baris: g.baris.sort((x, y) => x.titikJudul.localeCompare(y.titikJudul) || x.nama.localeCompare(y.nama)) }));
  }, [tersaring]);

  const ringkas = React.useMemo(() => {
    const aktif = semua.filter((a) => a.status === 'aktif').length;
    const butuh = semua.filter((a) => cocokStatus(a, 'butuh_sk'));
    const fak = semua.filter((a) => lingkupAturan(a).tingkat !== 'universitas');
    return { total: semua.length, aktif, butuh: butuh.length, fakultas: fak.length, jumlahFak: new Set(fak.map((a) => lingkupAturan(a).fakultas)).size };
  }, [semua]);
  const calonMassal = React.useMemo(() => semua.filter((a) => a.status === 'aktif' && a.perlu_lampir_sk && bolehLampir(a)), [semua, bolehAtur, bolehAturFakultas]); // eslint-disable-line react-hooks/exhaustive-deps

  const opsiLingkup = React.useMemo(() => {
    const kode = [...new Set(semua.map((a) => lingkupAturan(a).fakultas).filter((x): x is string => Boolean(x)))].sort();
    return [
      { value: 'semua', label: 'Semua lingkup' },
      { value: 'universitas', label: 'Universitas' },
      ...(kode.length ? [{ value: 'fakultas', label: 'Semua aturan fakultas' }] : []),
      ...kode.map((k) => ({ value: `fak:${k}`, label: namaFak(k), group: 'Fakultas' })),
    ];
  }, [semua, namaFak]);

  const toggle = (k: string) =>
    setBuka((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const aksi = (a: Aturan) => {
    const items: Array<{ label: string; icon: React.ReactNode; onSelect: () => void }> = [{ label: 'Lihat rincian', icon: <Eye />, onSelect: () => onBuka?.(a) }];
    if (bolehLampir(a) && a.status === 'aktif' && a.perlu_lampir_sk) items.push({ label: 'Lampirkan SK', icon: <FilePlus2 />, onSelect: () => setLampir(a.id) });
    else if (bolehLampir(a) && onLampirkan && a.status !== 'aktif' && statusTampil(a) !== 'diajukan' && keadaanSkAturan(a) === 'butuh')
      items.push({ label: 'Lampirkan SK & ajukan', icon: <FilePlus2 />, onSelect: () => onLampirkan(a) });
    return (
      <Menu
        trigger={
          <Button variant="ghost" size="sm" className="u-ak-menu" aria-label={`Aksi ${a.nama}${lingkupAturan(a).fakultas ? ` (${namaFak(lingkupAturan(a).fakultas)})` : ''}`}>
            <Ellipsis />
          </Button>
        }
        items={items}
      />
    );
  };

  const disaring = Boolean(q || lingkup !== 'semua' || status !== 'semua');
  return (
    <div className={cn('u-ak', className)}>
      <div className="u-ak-ringkas" role="group" aria-label="Ringkasan aturan">
        <div>
          <strong>{d.data ? ringkas.total : '–'}</strong>
          <span>aturan</span>
        </div>
        <div data-nada="sukses">
          <strong>{d.data ? ringkas.aktif : '–'}</strong>
          <span>aktif</span>
        </div>
        <div data-nada={ringkas.butuh ? 'peringatan' : undefined}>
          <strong>{d.data ? ringkas.butuh : '–'}</strong>
          <span>butuh SK</span>
          {ringkas.butuh ? (
            <button type="button" className="u-ak-tautan" onClick={() => setStatus('butuh_sk')}>
              Lihat
            </button>
          ) : null}
        </div>
        {!fakultas && ringkas.fakultas ? (
          <div>
            <strong>{ringkas.fakultas}</strong>
            <span>aturan fakultas · {ringkas.jumlahFak} fakultas</span>
          </div>
        ) : null}
        {calonMassal.length > 1 ? (
          <Button variant="outline" size="sm" className="u-ak-massal" onClick={() => setMassal(true)}>
            <Files /> Lampirkan SK massal
          </Button>
        ) : null}
      </div>

      <div className="u-ak-saring">
        <div className="u-ak-cari">
          <Search aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul, kode, atau langkah" aria-label="Cari aturan" />
          {q ? (
            <button type="button" aria-label="Hapus pencarian" onClick={() => setQ('')}>
              <X />
            </button>
          ) : null}
        </div>
        {!fakultas && opsiLingkup.length > 2 ? (
          <Pilihan tampilan="daftar" className="u-ak-pilih-lingkup" aria-label="Lingkup" options={opsiLingkup} value={lingkup} onValueChange={(v) => setLingkup(v ?? 'semua')} />
        ) : null}
        <SegmentedControl<SaringStatus>
          aria-label="Status"
          value={status}
          onValueChange={setStatus}
          options={[
            { value: 'semua', label: 'Semua' },
            { value: 'aktif', label: 'Aktif' },
            { value: 'belum', label: 'Belum berlaku' },
            { value: 'nonaktif', label: 'Nonaktif' },
            { value: 'butuh_sk', label: 'Butuh SK' },
          ]}
        />
      </div>

      {d.error ? (
        <GalatApi error={d.error} onRetry={d.refetch} />
      ) : d.loading && !d.data ? (
        <div className="u-ak-bidang">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={56} />
          ))}
        </div>
      ) : !kelompok.length ? (
        <Empty
          bordered
          icon={<Scale />}
          title={disaring ? 'Tidak ada aturan yang cocok' : 'Belum ada aturan'}
          description={disaring ? 'Ubah kata kunci atau saringan.' : 'Aturan yang ditambahkan akan muncul di sini.'}
          actions={
            disaring ? (
              <Button
                variant="outline"
                onClick={() => {
                  setQ('');
                  setLingkup('semua');
                  setStatus('semua');
                }}
              >
                Hapus saringan
              </Button>
            ) : undefined
          }
        />
      ) : (
        kelompok.map((g) => (
          <section key={g.kode} className="u-ak-bidang" aria-labelledby={`u-ak-${g.kode}`}>
            <h3 id={`u-ak-${g.kode}`}>
              {g.label} <span>{g.baris.reduce((n, b) => n + b.anggota.length, 0)}</span>
            </h3>
            <ul>
              {g.baris.map((b) => {
                const a = b.anggota[0]!;
                const ganda = b.anggota.length > 1;
                const terbuka = buka.has(b.kunci);
                const lingkupSatu = lingkupAturan(a);
                const semuaFak = b.anggota.every((x) => lingkupAturan(x).tingkat !== 'universitas');
                const aktif = b.anggota.filter((x) => x.status === 'aktif').length;
                const butuh = b.anggota.filter((x) => cocokStatus(x, 'butuh_sk')).length;
                const ringkasan = ringkasKetentuan(a, katalog.data as KatalogAturan | undefined);
                return (
                  <li key={b.kunci} data-ganda={ganda || undefined} data-buka={terbuka || undefined}>
                    <div className="u-ak-baris">
                      {ganda ? (
                        <button type="button" className="u-ak-buka" aria-expanded={terbuka} aria-label={`${terbuka ? 'Tutup' : 'Buka'} rincian ${b.nama}`} onClick={() => toggle(b.kunci)}>
                          <ChevronRight aria-hidden />
                        </button>
                      ) : (
                        <span className="u-ak-buka" aria-hidden />
                      )}
                      <div className="u-ak-utama">
                        <button type="button" className="u-ak-judul" onClick={() => (ganda ? toggle(b.kunci) : onBuka?.(a))}>
                          {b.nama}
                        </button>
                        <p>
                          {b.titikJudul}
                          {ringkasan ? <> · {ringkasan}</> : null}
                        </p>
                      </div>
                      <span className="u-ak-lingkup" data-tingkat={ganda ? (semuaFak ? 'fakultas' : 'campur') : lingkupSatu.tingkat}>
                        {ganda ? `${b.anggota.length} ${semuaFak ? 'fakultas' : 'lingkup'}` : lingkupSatu.fakultas ? namaFak(lingkupSatu.fakultas) : 'Universitas'}
                      </span>
                      {ganda ? (
                        <span className="u-ak-status">
                          <Badge variant={aktif === b.anggota.length ? 'success' : aktif ? 'warning' : 'neutral'} dot>
                            {aktif === b.anggota.length ? 'Semua aktif' : `${aktif}/${b.anggota.length} aktif`}
                          </Badge>
                          {butuh ? (
                            <span className="u-ak-sk" data-sk="butuh">
                              <FileBadge aria-hidden />
                              {butuh} butuh SK
                            </span>
                          ) : (
                            <span className="u-ak-sk" data-sk="ada">
                              <FileBadge aria-hidden />
                              Ber-SK
                            </span>
                          )}
                        </span>
                      ) : (
                        <StatusMini a={a} />
                      )}
                      {ganda ? <span className="u-ak-menu" aria-hidden /> : aksi(a)}
                    </div>
                    {ganda && terbuka ? (
                      <div className="u-ak-anak">
                        {semuaFak && catatanFakultas ? <p className="u-ak-catatan">{catatanFakultas}</p> : null}
                        <ul>
                          {b.anggota.map((x) => {
                            const l = lingkupAturan(x);
                            return (
                              <li key={x.id} className="u-ak-baris" data-anak>
                                <span className="u-ak-buka" aria-hidden />
                                <div className="u-ak-utama">
                                  <button type="button" className="u-ak-judul" onClick={() => onBuka?.(x)}>
                                    {l.fakultas ? namaFak(l.fakultas) : 'Universitas'}
                                  </button>
                                  <p>{x.kode ? `${x.kode} · ` : ''}{ringkasKetentuan(x, katalog.data as KatalogAturan | undefined) || 'Ketentuan sama dengan induk'}</p>
                                </div>
                                <span className="u-ak-lingkup" data-tingkat={l.tingkat}>
                                  {l.tingkat === 'universitas' ? 'Universitas' : l.tingkat === 'prodi' ? 'Prodi' : 'Fakultas'}
                                </span>
                                <StatusMini a={x} />
                                {aksi(x)}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
      {lampir ? (
        <FormLampiranAturan
          aturanId={lampir}
          open
          onOpenChange={(o) => !o && setLampir(null)}
          onTersimpan={() => {
            setLampir(null);
            d.refetch();
          }}
        />
      ) : null}
      {massal ? (
        <LampirSkMassal
          aturan={calonMassal}
          namaLingkup={(a) => namaFak(lingkupAturan(a).fakultas)}
          onTutup={() => setMassal(false)}
          onSelesai={() => d.refetch()}
        />
      ) : null}
    </div>
  );
}

export interface LampirSkMassalProps {
  /** Aturan aktif tanpa SK yang boleh dilampiri. */
  aturan: Aturan[];
  namaLingkup?: (a: Aturan) => string;
  onTutup: () => void;
  onSelesai?: () => void;
}

/**
 * Lampirkan satu SK registri ke banyak aturan sekaligus (panel langkah: pilih aturan, pilih SK, tinjau). SK yang sama
 * dirujuk setiap aturan (POST /v1/aturan/{id}/lampiran {sk_id}); yang gagal dilaporkan per aturan.
 */
export function LampirSkMassal({ aturan, namaLingkup, onTutup, onSelesai }: LampirSkMassalProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const [pilih, setPilih] = React.useState<Set<string>>(() => new Set(aturan.map((a) => a.id)));
  const [skId, setSkId] = React.useState<string | null>(null);
  const [sk, setSk] = React.useState<{ nomor?: string | null; perihal?: string | null } | null>(null);
  const terpilih = aturan.filter((a) => pilih.has(a.id));
  const semua = terpilih.length === aturan.length;
  const ubah = (id: string, v: boolean) =>
    setPilih((s) => {
      const n = new Set(s);
      if (v) n.add(id);
      else n.delete(id);
      return n;
    });

  return (
    <PanelLangkah
      open
      onOpenChange={(o) => !o && onTutup()}
      title="Lampirkan SK massal"
      description="Satu SK dari registri SK menjadi dasar hukum beberapa aturan sekaligus."
      finishLabel={`Lampirkan ke ${terpilih.length} aturan`}
      steps={[
        {
          id: 'aturan',
          title: 'Pilih aturan',
          description: 'Aturan aktif yang belum punya SK. Hapus centang aturan yang memakai SK lain.',
          validate: () => (terpilih.length ? null : 'Pilih minimal satu aturan.'),
          content: (
            <div className="u-ak-massal-daftar">
              <label className="u-ak-massal-semua">
                <Checkbox checked={semua} indeterminate={!semua && terpilih.length > 0} onCheckedChange={(v) => setPilih(new Set(v ? aturan.map((a) => a.id) : []))} />
                <span>
                  Pilih semua <em>{terpilih.length} dari {aturan.length}</em>
                </span>
              </label>
              <ul>
                {aturan.map((a) => (
                  <li key={a.id}>
                    <label>
                      <Checkbox checked={pilih.has(a.id)} onCheckedChange={(v) => ubah(a.id, Boolean(v))} />
                      <span>
                        <strong>{a.nama}</strong>
                        <small>
                          {a.titik_judul ?? a.titik}
                          {namaLingkup ? ` · ${namaLingkup(a)}` : ''}
                        </small>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ),
        },
        {
          id: 'sk',
          title: 'Pilih SK',
          description: 'Pilih SK dari registri. Bila belum tercatat, catat dulu lewat tombol di bawah isian.',
          validate: () => (skId ? null : 'Pilih SK dari registri.'),
          content: (
            <PilihSK
              value={skId}
              onValueChange={(id, s) => {
                setSkId(id);
                setSk(s);
              }}
              jenis="aturan"
              catatSekarang={{ label: 'Catat SK aturan sekarang', isian: { jenis: 'aturan' } }}
              label="SK dari registri"
              required
            />
          ),
        },
        {
          id: 'tinjau',
          title: 'Tinjau',
          content: (
            <WizardReview
              sections={[
                { title: 'SK', items: [{ label: 'Nomor', value: sk?.nomor ?? '' }, { label: 'Perihal', value: sk?.perihal ?? '' }] },
                { title: `${terpilih.length} aturan`, items: terpilih.slice(0, 12).map((a) => ({ label: a.nama, value: namaLingkup ? namaLingkup(a) : a.titik_judul })) },
              ]}
            />
          ),
        },
      ]}
      onFinish={async () => {
        const gagal: string[] = [];
        let berhasil = 0;
        for (const a of terpilih) {
          try {
            await siakad.request({ method: 'POST', path: `/v1/aturan/${a.id}/lampiran`, body: { sk_id: skId, jenis: 'sk' } });
            berhasil++;
          } catch (e) {
            gagal.push(`${a.nama}${namaLingkup ? ` (${namaLingkup(a)})` : ''}: ${pesanGalat(e)}`);
          }
        }
        invalidateSiakad('aturan');
        onSelesai?.();
        if (berhasil) toast.add({ title: `SK dilampirkan ke ${berhasil} aturan`, type: 'success' });
        if (gagal.length) return `${gagal.length} aturan gagal. ${gagal.slice(0, 2).join('; ')}${gagal.length > 2 ? '; …' : ''}`;
        return null;
      }}
    />
  );
}
