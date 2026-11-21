'use client';
import * as React from 'react';
import {
  BriefcaseBusiness,
  CalendarClock,
  CircleCheck,
  Code2,
  Gauge,
  Globe,
  GraduationCap,
  Hash,
  ListChecks,
  Plus,
  Search,
  ShieldCheck,
  ToggleRight,
  Type,
  UserPlus,
  Waypoints,
  X,
  Zap,
} from 'lucide-react';
import { Badge, Button, Skeleton } from '../components/actions';
import { CodeBlock } from '../components/code';
import { Alert, Empty } from '../components/display';
import { Field, Input, Textarea } from '../components/forms';
import { PilihanBanyak } from '../components/formulir';
import { useToast } from '../components/overlays';
import { PanelLangkah, type PanelLangkahStep } from '../components/panel-langkah';
import { LABEL_JENIS_ATURAN, STATUS_MAHASISWA_ATURAN, labelKategoriAturan, useKatalogAturan, type JenisAturan } from './aturan';
import { PilihSumberRute, kalimatSubjek, labelSumberRute, useKatalogRute, type RuteKatalog, type SubjekRute, type TitikRute } from './aturan-rute';
import type { KonteksTitikAturan, TipeKonteksTitik, TitikKelolaAturan } from './aturan-titik';
import { GalatApi } from './galat';
import { PilihUnit, type UnitOrganisasi } from './pilih-unit';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

/*
 * Satu pintu "Tambah titik pemeriksaan" (panel samping PanelLangkah): langkah pertama memilih SUMBER
 *   - Dari aksi aplikasi (disarankan): titik `rute.*`, SIAKAD menegakkan aturan sebelum aksi dijalankan, tanpa kode;
 *   - Langkah manual: titik `kustom.*`, aplikasi memanggil POST /v1/aturan/periksa sendiri.
 * Lalu Aksi/Langkah → Siapa diperiksa → Jenis & data → Pemilik & pengatur → Tinjau (kartu titik seperti di daftar).
 * Mode ubah memakai panel yang sama (lompat langkah; sumber tidak bisa diganti). Kode titik dibuat otomatis dan hanya
 * tampil di "Detail teknis".
 */

type Sumber = 'rute' | 'manual';
type Subjek = SubjekRute;
interface Konteks extends KonteksTitikAturan {
  /** sumber nilai untuk titik rute (bawaan body:<kode>) */
  sumber?: string;
}
interface Isi {
  sumber: Sumber | '';
  rute: RuteKatalog | null;
  judul: string;
  keterangan: string;
  kategori: string;
  unit: string;
  subjek: Subjek | '';
  subjek_sumber: string[];
  tahun_sumber: string[];
  bila: Array<{ sumber: string; nilai: string }>;
  jenis: JenisAturan[];
  status_mahasiswa: string[];
  konteks: Konteks[];
  pengatur: string[];
}
const kosong = (sumber: Sumber | '' = ''): Isi => ({
  sumber,
  rute: null,
  judul: '',
  keterangan: '',
  kategori: '',
  unit: '',
  subjek: '',
  subjek_sumber: [],
  tahun_sumber: ['query:tahun_id', 'body:tahun_id'],
  bila: [],
  jenis: ['syarat'],
  status_mahasiswa: [],
  konteks: [],
  pengatur: [],
});

const slug = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);

const SUBJEK: Array<{ v: Subjek; judul: string; ket: string; ikon: React.ReactNode }> = [
  { v: 'mahasiswa', judul: 'Mahasiswa', ket: 'IPK, SKS, status, tagihan, dan data akademik mahasiswa.', ikon: <GraduationCap /> },
  { v: 'pegawai', judul: 'Dosen/tendik', ket: 'Masa kerja, jabatan, golongan, BKD/SKP.', ikon: <BriefcaseBusiness /> },
  { v: 'pendaftar', judul: 'Pendaftar', ket: 'Calon mahasiswa baru: gelombang, pembayaran, berkas PMB.', ikon: <UserPlus /> },
  { v: 'umum', judul: 'Tidak ada orang tertentu', ket: 'Hanya tanggal, periode, atau prodi. Cocok untuk masa buka layanan.', ikon: <Globe /> },
];
const JENIS: Array<{ v: JenisAturan; ikon: React.ReactNode; ket: string }> = [
  { v: 'syarat', ikon: <ShieldCheck />, ket: 'Ditolak bila kondisi tidak terpenuhi, mis. IPK paling sedikit 2,75.' },
  { v: 'batas_waktu', ikon: <CalendarClock />, ket: 'Hanya boleh pada rentang tanggal tertentu.' },
  { v: 'batas_nilai', ikon: <Gauge />, ket: 'Angka dari aplikasi tidak boleh melewati batas, mis. paling banyak 24 SKS.' },
];
const TIPE_DATA: Array<{ v: TipeKonteksTitik; label: string; contoh: string; ikon: React.ReactNode }> = [
  { v: 'angka', label: 'Angka', contoh: 'mis. jumlah SKS yang diambil', ikon: <Hash /> },
  { v: 'pilihan', label: 'Pilihan', contoh: 'mis. jenis seminar: proposal/hasil', ikon: <ListChecks /> },
  { v: 'benar_salah', label: 'Ya/tidak', contoh: 'mis. sudah unggah draf', ikon: <ToggleRight /> },
  { v: 'teks', label: 'Teks', contoh: 'mis. kode ruang', ikon: <Type /> },
];

// Unit pemilik = kategori aturan, dikelompokkan di bawah unit kerja yang lazim memilikinya (pohon untuk PilihUnit).
const UNIT_KATEGORI: Array<{ kode: string; nama: string; singkatan: string; kategori: string[] }> = [
  { kode: 'baak', nama: 'Biro Administrasi Akademik', singkatan: 'BAAK', kategori: ['akademik', 'kelulusan'] },
  { kode: 'bauk', nama: 'Biro Administrasi Umum & Keuangan', singkatan: 'BAUK', kategori: ['keuangan'] },
  { kode: 'kemahasiswaan', nama: 'Kemahasiswaan', singkatan: 'Kemahasiswaan', kategori: ['kemahasiswaan'] },
  { kode: 'sdm', nama: 'Sumber Daya Manusia', singkatan: 'SDM', kategori: ['kepegawaian'] },
  { kode: 'spmi', nama: 'Penjaminan Mutu', singkatan: 'SPMI', kategori: ['mutu'] },
  { kode: 'lppm', nama: 'Lembaga Penelitian & Pengabdian', singkatan: 'LP2M', kategori: ['penelitian'] },
  { kode: 'pustikom', nama: 'Pustikom', singkatan: 'Pustikom', kategori: ['akun'] },
  { kode: 'umum', nama: 'Universitas (umum)', singkatan: 'Umum', kategori: ['umum'] },
];
function pohonPemilik(kategori: Array<{ kode: string; judul: string }>) {
  const baris: UnitOrganisasi[] = [{ id: 1, induk_id: null, jenis: 'universitas', nama: 'Universitas Pohuwato' }];
  const peta = new Map<number, { kategori: string; unit: string }>();
  const sisa = new Set(kategori.map((k) => k.kode));
  UNIT_KATEGORI.forEach((u, i) => {
    const uid = 10 + i;
    baris.push({ id: uid, induk_id: 1, jenis: u.kode === 'umum' ? 'unit' : 'biro', nama: u.nama, singkatan: u.singkatan });
    const daftar = u.kode === 'umum' ? [...u.kategori, ...[...sisa].filter((k) => !UNIT_KATEGORI.some((x) => x.kategori.includes(k)))] : u.kategori;
    daftar.forEach((k, j) => {
      if (!sisa.has(k)) return;
      const id = 100 + i * 10 + j;
      const judul = kategori.find((x) => x.kode === k)?.judul ?? k;
      baris.push({ id, induk_id: uid, jenis: 'bagian', nama: `Aturan ${labelKategoriAturan(k).toLowerCase()}`, singkatan: judul.replace(/^[^(]*\(?/, '').replace(/\)$/, '') || null });
      peta.set(id, { kategori: k, unit: u.kode });
    });
  });
  return { baris, peta };
}

function usePeran(aktif: boolean) {
  return useSiakadQuery<Array<{ kode: string; nama: string }>>(['rbac', 'peran'], (s, signal) => s.request({ method: 'GET', path: '/v1/rbac/peran', query: { per_page: 100 } }, { signal }), {
    staleTime: 300_000,
    enabled: aktif,
  });
}

/** Kartu pilihan berikon (radio atau centang). */
function KartuPilih({ pilih, onPilih, ikon, judul, ket, peran = 'radio', disabled }: { pilih: boolean; onPilih: () => void; ikon: React.ReactNode; judul: string; ket: string; peran?: 'radio' | 'checkbox'; disabled?: boolean }) {
  return (
    <button type="button" role={peran} aria-checked={pilih} className="u-wtp-kartu" data-pilih={pilih || undefined} disabled={disabled} onClick={onPilih}>
      <span className="u-wtp-kartu-ikon" aria-hidden>
        {ikon}
      </span>
      <span className="u-wtp-kartu-teks">
        <strong>{judul}</strong>
        <span>{ket}</span>
      </span>
      {pilih && <CircleCheck className="u-wtp-kartu-centang" aria-hidden />}
    </button>
  );
}

/** Kartu titik (tinjau & ringkasan), sama gaya dengan daftar. */
export function KartuTitikPemeriksaan({ isi, katalogRute, peranNama, kode }: { isi: Isi; katalogRute?: Parameters<typeof labelSumberRute>[1]; peranNama: (k: string) => string; kode?: string }) {
  const rute = isi.sumber === 'rute';
  const bila = isi.bila.filter((b) => b.sumber && b.nilai.trim());
  return (
    <div className="u-wtp-titik">
      <div className="u-wtp-titik-kepala">
        <Waypoints aria-hidden />
        <strong>{isi.judul || 'Titik tanpa nama'}</strong>
        <Badge variant={rute ? 'primary' : 'neutral'}>{rute ? 'Dari aksi aplikasi' : 'Langkah manual'}</Badge>
      </div>
      <p>
        {rute
          ? `Sebelum aksi “${isi.rute?.nama ?? '…'}” dijalankan, SIAKAD memeriksa aturan untuk ${kalimatSubjek(isi.subjek, isi.subjek_sumber, katalogRute)}${
              bila.length ? `, hanya bila ${bila.map((b) => `${labelSumberRute(b.sumber, katalogRute)} berisi ${b.nilai.split(',').map((n) => `“${n.trim()}”`).join(' atau ')}`).join(' dan ')}` : ''
            }.`
          : `Aplikasi memanggil pemeriksaan sebelum “${isi.judul || '…'}” untuk ${isi.subjek && isi.subjek !== 'umum' ? SUBJEK.find((s) => s.v === isi.subjek)?.judul.toLowerCase() : 'semua permintaan'}.`}
      </p>
      <dl>
        <dt>Pemilik</dt>
        <dd>{isi.kategori ? `Aturan ${labelKategoriAturan(isi.kategori).toLowerCase()}` : '–'}</dd>
        <dt>Jenis aturan</dt>
        <dd>{isi.jenis.map((j) => LABEL_JENIS_ATURAN[j]?.label ?? j).join(', ') || '–'}</dd>
        {isi.konteks.length > 0 && (
          <>
            <dt>Data dari aplikasi</dt>
            <dd>{isi.konteks.map((k) => k.judul || k.kode).join(', ')}</dd>
          </>
        )}
        {isi.status_mahasiswa.length > 0 && (
          <>
            <dt>Status mahasiswa</dt>
            <dd>{isi.status_mahasiswa.map((s) => STATUS_MAHASISWA_ATURAN.find((x) => x.value === s)?.label ?? s).join(', ')}</dd>
          </>
        )}
        <dt>Pembuat aturan</dt>
        <dd>{isi.pengatur.length ? isi.pengatur.map(peranNama).join(', ') : 'Pengatur unit pemilik'}</dd>
      </dl>
      {kode && (
        <details className="u-arute-teknis">
          <summary>Detail teknis</summary>
          <code>{kode}</code>
          {isi.rute && (
            <>
              {' '}
              · <code>{isi.rute.kunci}</code>
            </>
          )}
        </details>
      )}
    </div>
  );
}

export function WizardTitikPenerapan({
  open,
  onOpenChange,
  titik,
  sumberAwal,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Titik yang diubah (dari GET /v1/aturan/titik); kosong = tambah. */
  titik?: TitikKelolaAturan | null;
  /** Sumber terpilih saat tambah (lewati pilihan sumber hanya bila diisi). */
  sumberAwal?: Sumber;
}) {
  const ubah = Boolean(titik);
  const ruteUbah = Boolean(titik && (titik.kode.startsWith('rute.') || (titik as { rute?: boolean }).rute));
  const siakad = useSiakad();
  const toast = useToast();
  const katalog = useKatalogAturan();
  const peran = usePeran(open);
  const [isi, setIsi] = React.useState<Isi>(kosong());
  const [langkah, setLangkah] = React.useState(0);
  const [cari, setCari] = React.useState('');
  const [modul, setModul] = React.useState<string | null>(null);
  const kat = useKatalogRute(open && (isi.sumber === 'rute' || ruteUbah));
  const detailRute = useSiakadQuery<TitikRute>(['aturan', 'rute', 'satu', titik?.kode], (s, signal) => s.request({ method: 'GET', path: `/v1/aturan/rute/${encodeURIComponent(titik!.kode)}` }, { signal }), {
    enabled: open && ruteUbah,
    staleTime: 0,
  });
  const set = <K extends keyof Isi>(k: K, v: Isi[K]) => setIsi((x) => ({ ...x, [k]: v }));

  // Isi awal
  React.useEffect(() => {
    if (!open) return;
    setLangkah(0);
    setCari('');
    setModul(null);
    if (!titik) return setIsi(kosong(sumberAwal ?? ''));
    const k = (titik.konteks ?? []).map((x) => (typeof x === 'string' ? { kode: x, judul: x, tipe: 'teks' as TipeKonteksTitik } : x));
    setIsi({
      ...kosong(ruteUbah ? 'rute' : 'manual'),
      judul: titik.judul,
      keterangan: titik.keterangan ?? '',
      kategori: titik.kategori[0] ?? '',
      unit: titik.unit ?? '',
      subjek: titik.subjek as Subjek,
      jenis: titik.jenis,
      status_mahasiswa: titik.status_mahasiswa ?? [],
      konteks: k,
      pengatur: (titik.pengatur ?? []).filter((p) => p.jenis === 'peran' && (p as { sumber?: string }).sumber === 'titik').map((p) => p.kode),
    });
  }, [open, titik, ruteUbah, sumberAwal]);
  // Data pemetaan titik rute (mode ubah)
  React.useEffect(() => {
    const d = detailRute.data;
    if (!open || !d || !kat.data) return;
    const r = kat.data.kelompok.flatMap((g) => g.rute).find((x) => x.kunci === d.rute.kunci) ?? null;
    setIsi((x) =>
      x.rute
        ? x
        : {
            ...x,
            rute: r ?? ({ kunci: d.rute.kunci, metode: d.rute.metode, path: d.rute.path, nama: d.rute.nama, tag: d.rute.modul ?? '', keterangan: '', parameter_path: [], hanya_pengguna: false, saran: { mahasiswa: [], pegawai: [], pendaftar: [], tahun: [], prodi: [] }, titik: [] } as RuteKatalog),
            subjek_sumber: d.subjek_sumber,
            tahun_sumber: d.tahun_sumber,
            bila: d.bila.map((b) => ({ sumber: b.sumber, nilai: b.nilai.join(', ') })),
            konteks: x.konteks.map((k) => ({ ...k, sumber: d.konteks_sumber[k.kode] ?? `body:${k.kode}` })),
          },
    );
  }, [open, detailRute.data, kat.data]);

  const peranNama = (k: string) => peran.data?.find((p) => p.kode === k)?.nama ?? k;
  const pemilik = React.useMemo(() => pohonPemilik(katalog.data?.kategori ?? []), [katalog.data]);
  const idPemilik = [...pemilik.peta.entries()].find(([, v]) => v.kategori === isi.kategori)?.[0] ?? null;
  const rute = isi.sumber === 'rute';
  const kodeManual = ubah ? titik!.kode : `kustom.${slug(isi.judul) || 'titik_baru'}`;
  const kodeTampil = ubah ? titik!.kode : rute ? `rute.${slug(isi.judul) || '…'} (dibuat otomatis)` : kodeManual;
  const indikator = (katalog.data?.indikator ?? []).filter((i) => i.sumber !== 'konteks' && (i.subjek === isi.subjek || (isi.subjek && i.subjek === 'umum')));

  // ---------------------------------------------------- langkah
  const kata = cari.trim().toLowerCase();
  const semua = kat.data?.kelompok.flatMap((g) => g.rute.map((r) => ({ ...r, modul: g.modul }))) ?? [];
  const hasilCari = kata ? semua.filter((r) => `${r.nama} ${r.modul} ${r.tag}`.toLowerCase().includes(kata)).slice(0, 50) : [];
  const ruteModul = modul ? (kat.data?.kelompok.find((g) => g.modul === modul)?.rute ?? []) : [];
  const pilihRute = (r: RuteKatalog) =>
    setIsi((x) => ({
      ...x,
      rute: r,
      judul: x.judul || r.nama,
      subjek: x.subjek || (r.saran.mahasiswa.length ? 'mahasiswa' : ''),
      subjek_sumber: x.subjek_sumber.length ? x.subjek_sumber : r.saran.mahasiswa[0] ? [r.saran.mahasiswa[0].sumber] : [],
    }));
  const kartuRute = (r: RuteKatalog & { modul?: string }) => (
    <button key={r.kunci} type="button" role="radio" aria-checked={isi.rute?.kunci === r.kunci} className="u-arute-opsi" data-pilih={isi.rute?.kunci === r.kunci || undefined} onClick={() => pilihRute(r)}>
      <strong>{r.nama}</strong>
      <span className="u-arute-opsi-sub">
        {r.modul ? `${r.modul} · ` : ''}
        {r.tag.includes(':') ? r.tag.split(':').slice(1).join(':').trim() : r.tag}
        {r.titik.length ? ` · sudah ada titik: ${r.titik.map((t) => t.judul).join(', ')}` : ''}
      </span>
    </button>
  );
  const saranSubjek = rute && isi.rute && isi.subjek && isi.subjek !== 'umum' ? isi.rute.saran[isi.subjek] : [];
  const ringkasan = isi.sumber ? (
    <div className="u-wtp-ringkas" aria-live="polite">
      <span className="u-wtp-ringkas-label">Ringkasan</span>
      <KartuTitikPemeriksaan isi={isi} katalogRute={kat.data} peranNama={peranNama} />
    </div>
  ) : null;
  const dgnRingkas = (n: React.ReactNode) => (
    <div className="u-wtp-langkah">
      {n}
      {ringkasan}
    </div>
  );

  const langkahSumber: PanelLangkahStep = {
    id: 'sumber',
    title: 'Sumber',
    description: 'Dari mana titik pemeriksaan ini?',
    validate: () => (isi.sumber ? null : 'Pilih sumber titik.'),
    content: (
      <div className="u-wtp-langkah">
        <div className="u-wtp-kisi" role="radiogroup" aria-label="Sumber titik">
          <KartuPilih
            pilih={isi.sumber === 'rute'}
            onPilih={() => set('sumber', 'rute')}
            ikon={<Zap />}
            judul="Dari aksi aplikasi (disarankan)"
            ket="Pilih tombol/aksi yang sudah ada, mis. “mendaftar seminar proposal”. SIAKAD memeriksa aturan otomatis sebelum aksi dijalankan, tanpa mengubah aplikasi."
          />
          <KartuPilih
            pilih={isi.sumber === 'manual'}
            onPilih={() => set('sumber', 'manual')}
            ikon={<Code2 />}
            judul="Langkah manual"
            ket="Untuk langkah yang belum ada di SIAKAD atau di aplikasi luar. Pengembang aplikasi memanggil pemeriksaan aturan sendiri."
          />
        </div>
      </div>
    ),
  };
  const langkahAksi: PanelLangkahStep = rute
    ? {
        id: 'aksi',
        title: 'Aksi',
        description: 'Aksi aplikasi mana yang diberi aturan?',
        validate: () => (isi.rute ? null : 'Pilih satu aksi.'),
        content: !kat.data ? (
          kat.error ? (
            <GalatApi error={kat.error} onRetry={kat.refetch} />
          ) : (
            <Skeleton height={240} />
          )
        ) : (
          dgnRingkas(
            <>
              {isi.rute && (
                <Alert variant="info" icon={<CircleCheck />} title={`Dipilih: ${isi.rute.nama}`}>
                  Cari atau pilih bagian lain untuk mengganti aksi.
                </Alert>
              )}
              <div className="u-aturan-cari">
                <Search aria-hidden />
                <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari aksi, mis. seminar proposal, KRS, cuti" aria-label="Cari aksi" />
              </div>
              {kata ? (
                <div className="u-arute-pilihan" role="radiogroup" aria-label="Hasil pencarian aksi">
                  {hasilCari.length ? hasilCari.map(kartuRute) : <Empty title="Tidak ada aksi yang cocok" />}
                </div>
              ) : modul ? (
                <div className="u-arute-pilihan" role="radiogroup" aria-label={`Aksi ${modul}`}>
                  <Button variant="ghost" size="sm" onClick={() => setModul(null)}>
                    ← Semua bagian
                  </Button>
                  {ruteModul.map(kartuRute)}
                </div>
              ) : (
                <ul className="u-arute-modul" aria-label="Bagian aplikasi">
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
            </>,
          )
        ),
      }
    : {
        id: 'langkah',
        title: 'Langkah',
        description: 'Langkah apa yang diperiksa?',
        validate: () => (isi.judul.trim() ? null : 'Tulis langkah yang diperiksa.'),
        content: dgnRingkas(
          <>
            <Field label="Langkah yang diperiksa" required description="Satu kalimat yang dimengerti semua orang, mis. “Mahasiswa mendaftar seminar proposal”.">
              <Input value={isi.judul} maxLength={150} placeholder="Mahasiswa mendaftar seminar proposal" onChange={(e) => set('judul', e.target.value)} autoFocus />
            </Field>
            <Field label="Kapan terjadi" optional description="Aplikasi mana dan saat apa, mis. saat mahasiswa menekan Daftar seminar di aplikasi Fakultas.">
              <Textarea rows={2} value={isi.keterangan} onChange={(e) => set('keterangan', e.target.value)} />
            </Field>
          </>,
        ),
      };
  const langkahSubjek: PanelLangkahStep = {
    id: 'subjek',
    title: 'Siapa diperiksa',
    description: 'Orang yang datanya dipakai kondisi aturan',
    validate: () =>
      !isi.subjek ? 'Pilih siapa yang diperiksa.' : rute && isi.subjek !== 'umum' && !isi.subjek_sumber.some((s) => /:[^:]+$/.test(s)) ? 'Pilih dari mana datanya diambil.' : null,
    content: dgnRingkas(
      <>
        <div className="u-wtp-kisi" role="radiogroup" aria-label="Siapa yang diperiksa">
          {SUBJEK.map((s) => (
            <KartuPilih
              key={s.v}
              pilih={isi.subjek === s.v}
              ikon={s.ikon}
              judul={s.judul}
              ket={s.ket}
              disabled={ubah && (titik?.jumlah_aturan_aktif ?? 0) > 0 && titik?.subjek !== s.v}
              onPilih={() => setIsi((x) => ({ ...x, subjek: s.v, subjek_sumber: s.v === 'umum' ? [] : rute && x.rute?.saran[s.v]?.[0] ? [x.rute.saran[s.v][0]!.sumber] : x.subjek === s.v ? x.subjek_sumber : [] }))}
            />
          ))}
        </div>
        {ubah && (titik?.jumlah_aturan_aktif ?? 0) > 0 && <p className="u-ask-sub">Sudah ada aturan aktif, jadi orang yang diperiksa tidak bisa diganti.</p>}
        {rute && isi.subjek && isi.subjek !== 'umum' && (
          <Field label={`Dari mana ${SUBJEK.find((s) => s.v === isi.subjek)?.judul.toLowerCase()} diambil?`} description="Disarankan dari aksi yang dipilih. Data diambil dari SIAKAD.">
            <div className="u-arute-saran" role="radiogroup" aria-label="Saran sumber">
              {saranSubjek.map((s) => (
                <button key={s.sumber} type="button" role="radio" aria-checked={isi.subjek_sumber[0] === s.sumber} className="u-arute-opsi" data-pilih={isi.subjek_sumber[0] === s.sumber || undefined} onClick={() => set('subjek_sumber', [s.sumber])}>
                  <strong>{s.label}</strong>
                </button>
              ))}
            </div>
            <details className="u-aturan-lanjutan" open={!saranSubjek.length || undefined}>
              <summary>Sumber lain (teknis)</summary>
              <PilihSumberRute value={isi.subjek_sumber[0] ?? 'body:'} onChange={(v) => set('subjek_sumber', [v])} katalog={kat.data} subjek={isi.subjek} label="Sumber subjek" />
            </details>
          </Field>
        )}
        {isi.subjek === 'mahasiswa' && (
          <Field label="Status mahasiswa yang boleh" optional description="Kosong = semua status. Status lain langsung ditolak sebelum aturan diperiksa.">
            <PilihanBanyak options={STATUS_MAHASISWA_ATURAN} value={isi.status_mahasiswa} onValueChange={(v) => set('status_mahasiswa', v)} placeholder="Semua status" />
          </Field>
        )}
        {isi.subjek && isi.subjek !== 'umum' && indikator.length > 0 && (
          <details className="u-aturan-lanjutan">
            <summary>Data SIAKAD yang bisa dipakai kondisi ({indikator.length})</summary>
            <p className="u-ask-sub">{indikator.slice(0, 18).map((i) => i.judul).join(', ')}{indikator.length > 18 ? `, dan ${indikator.length - 18} lainnya` : ''}.</p>
          </details>
        )}
      </>,
    ),
  };
  const ubahK = (i: number, p: Partial<Konteks>) => set('konteks', isi.konteks.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const langkahData: PanelLangkahStep = {
    id: 'data',
    title: 'Jenis & data',
    description: 'Aturan apa yang boleh dipasang, dan data tambahan dari aplikasi',
    validate: () =>
      !isi.jenis.length
        ? 'Pilih minimal satu jenis aturan.'
        : isi.konteks.some((k) => !k.judul.trim())
          ? 'Beri label setiap data tambahan.'
          : isi.konteks.some((k) => k.tipe === 'pilihan' && !(k.opsi ?? []).some((o) => o.label.trim()))
            ? 'Data pilihan butuh minimal satu pilihan.'
            : rute && isi.bila.some((b) => !b.sumber.split(':')[1] || !b.nilai.trim())
              ? 'Lengkapi syarat “hanya bila” atau hapus.'
              : null,
    content: dgnRingkas(
      <>
        <div className="u-wtp-kisi" data-kolom="3" role="group" aria-label="Jenis aturan">
          {JENIS.map((j) => (
            <KartuPilih
              key={j.v}
              peran="checkbox"
              pilih={isi.jenis.includes(j.v)}
              ikon={j.ikon}
              judul={LABEL_JENIS_ATURAN[j.v].label}
              ket={j.ket}
              onPilih={() => set('jenis', isi.jenis.includes(j.v) ? isi.jenis.filter((x) => x !== j.v) : [...isi.jenis, j.v])}
            />
          ))}
        </div>
        {isi.jenis.includes('batas_nilai') && !isi.konteks.some((k) => k.tipe === 'angka') && <Alert variant="info">Batas jumlah butuh angka dari aplikasi, mis. jumlah SKS. Tambahkan di bawah.</Alert>}
        <Field label="Data tambahan dari aplikasi" optional description="Boleh dikosongkan bila aturan cukup memakai data SIAKAD.">
          <div className="u-wtp-data">
            {isi.konteks.map((k, i) => (
              <div key={i} className="u-wtp-data-baris">
                <span className="u-wtp-kartu-ikon" aria-hidden>
                  {TIPE_DATA.find((t) => t.v === k.tipe)?.ikon}
                </span>
                <Input value={k.judul} aria-label={`Label data ${i + 1}`} placeholder="Label, mis. Jumlah SKS" onChange={(e) => ubahK(i, { judul: e.target.value, kode: ubah && k.kode ? k.kode : slug(e.target.value), sumber: `body:${slug(e.target.value)}` })} />
                <Badge variant="outline">{TIPE_DATA.find((t) => t.v === k.tipe)?.label}</Badge>
                <Button variant="ghost" size="sm" iconOnly aria-label={`Hapus data ${i + 1}`} onClick={() => set('konteks', isi.konteks.filter((_, j) => j !== i))}>
                  <X />
                </Button>
                {k.tipe === 'pilihan' && (
                  <div className="u-wtp-opsi">
                    {(k.opsi ?? []).map((o, oi) => (
                      <span key={oi}>
                        <Input
                          value={o.label}
                          aria-label={`Pilihan ${oi + 1} untuk ${k.judul || 'data'}`}
                          placeholder="mis. Seminar proposal"
                          onChange={(e) => ubahK(i, { opsi: (k.opsi ?? []).map((y, yi) => (yi === oi ? { label: e.target.value, nilai: slug(e.target.value) } : y)) })}
                        />
                        <Button variant="ghost" size="sm" iconOnly aria-label={`Hapus pilihan ${oi + 1}`} onClick={() => ubahK(i, { opsi: (k.opsi ?? []).filter((_, yi) => yi !== oi) })}>
                          <X />
                        </Button>
                      </span>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => ubahK(i, { opsi: [...(k.opsi ?? []), { nilai: '', label: '' }] })}>
                      <Plus /> Pilihan
                    </Button>
                  </div>
                )}
                <details className="u-arute-teknis u-wtp-data-teknis">
                  <summary>Detail teknis</summary>
                  <Input value={k.kode} aria-label={`Nama data ${i + 1} di aplikasi`} spellCheck={false} onChange={(e) => ubahK(i, { kode: e.target.value.trim() })} />
                  {rute && <PilihSumberRute value={k.sumber ?? `body:${k.kode}`} onChange={(v) => ubahK(i, { sumber: v })} label={`Sumber data ${i + 1}`} />}
                </details>
              </div>
            ))}
            {isi.konteks.length < 20 && (
              <div className="u-wtp-kisi" data-kolom="4" aria-label="Tambah data">
                {TIPE_DATA.map((t) => (
                  <button key={t.v} type="button" className="u-wtp-tambah" onClick={() => set('konteks', [...isi.konteks, { kode: '', judul: '', tipe: t.v, ...(t.v === 'pilihan' ? { opsi: [{ nilai: '', label: '' }] } : {}) }])}>
                    <span className="u-wtp-kartu-ikon" aria-hidden>
                      {t.ikon}
                    </span>
                    <span>
                      <strong>
                        <Plus aria-hidden /> {t.label}
                      </strong>
                      <small>{t.contoh}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>
        {rute && (
          <Field label="Hanya bila" optional description="Diperiksa hanya bila isian formulir berisi nilai tertentu, mis. jenis berisi “proposal”.">
            <div className="u-arute-baris-daftar">
              {isi.bila.map((b, i) => (
                <div key={i} className="u-arute-baris">
                  <PilihSumberRute value={b.sumber} onChange={(v) => set('bila', isi.bila.map((x, j) => (j === i ? { ...x, sumber: v } : x)))} label={`Hanya bila ${i + 1}`} />
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
        )}
      </>,
    ),
  };
  const langkahPemilik: PanelLangkahStep = {
    id: 'pemilik',
    title: 'Pemilik & pengatur',
    description: 'Siapa pemilik aturannya dan siapa yang boleh membuatnya',
    validate: () => (!isi.judul.trim() ? 'Tulis nama titik.' : !isi.kategori ? 'Pilih unit pemilik.' : null),
    content: dgnRingkas(
      <>
        {rute && (
          <Field label="Nama titik pemeriksaan" required description="Nama yang dilihat pejabat saat membuat aturan.">
            <Input value={isi.judul} maxLength={150} onChange={(e) => set('judul', e.target.value)} />
          </Field>
        )}
        <Field label="Unit pemilik" required description="Menentukan siapa yang berwenang mengatur aturannya. Ketik untuk mencari.">
          <PilihUnit
            data={pemilik.baris}
            jenis={['bagian']}
            value={idPemilik}
            onValueChange={(id) => {
              const p = id === null ? null : pemilik.peta.get(Number(id));
              setIsi((x) => ({ ...x, kategori: p?.kategori ?? '', unit: p && p.unit !== 'umum' ? p.unit : x.unit }));
            }}
            placeholder="Pilih unit pemilik…"
            placeholderCari="Cari unit, mis. BAAK atau keuangan"
          />
        </Field>
        <Field label="Yang boleh membuat aturan di sini" optional description="Bila kosong, yang boleh membuat aturan adalah pengatur unit pemilik.">
          <PilihanBanyak options={(peran.data ?? []).map((p) => ({ value: p.kode, label: p.nama }))} value={isi.pengatur} onValueChange={(v) => set('pengatur', v)} placeholder="Pilih jabatan/peran…" />
        </Field>
        {rute && (
          <Field label="Keterangan" optional>
            <Textarea rows={2} value={isi.keterangan} onChange={(e) => set('keterangan', e.target.value)} />
          </Field>
        )}
      </>,
    ),
  };
  const contohKonteks = Object.fromEntries(isi.konteks.map((k) => [k.kode || 'data', k.tipe === 'angka' ? 3 : k.tipe === 'benar_salah' ? true : (k.opsi?.[0]?.nilai ?? 'teks')]));
  const kunciSubjek = isi.subjek === 'pegawai' ? '"pegawai_id": 123,' : isi.subjek === 'pendaftar' ? '"pendaftar": "2026010001",' : isi.subjek === 'mahasiswa' ? '"nim": "2201010001",' : '';
  const langkahTinjau: PanelLangkahStep = {
    id: 'tinjau',
    title: 'Tinjau',
    description: 'Periksa sebelum disimpan',
    content: (
      <div className="u-wtp-langkah">
        <KartuTitikPemeriksaan isi={isi} katalogRute={kat.data} peranNama={peranNama} kode={kodeTampil} />
        {rute ? (
          <Alert variant="neutral" icon={<ShieldCheck />} title="Setelah titik dibuat">
            Pejabat membuat aturan untuk titik ini dengan mengisi contoh kalimat (wajib mencantumkan SK dan disetujui pemeriksa aturan). Uji dulu dengan tombol Simulasi.
          </Alert>
        ) : (
          <details className="u-aturan-lanjutan">
            <summary>Cara memakai dari aplikasi (untuk pengembang)</summary>
            <CodeBlock
              theme="auto"
              lineNumbers={false}
              tabs={[
                {
                  label: 'HTTP',
                  language: 'bash',
                  code: `curl -X POST https://api.unipo.ac.id/v1/aturan/periksa \\\n  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\\n  -d '{"titik": "${kodeManual}", ${kunciSubjek} "konteks": ${JSON.stringify(contohKonteks)}}'`,
                },
              ]}
            />
          </details>
        )}
      </div>
    ),
  };
  const steps = [...(ubah || sumberAwal ? [] : [langkahSumber]), ...(isi.sumber ? [langkahAksi, langkahSubjek, langkahData, langkahPemilik, langkahTinjau] : [])];

  const simpan = async (): Promise<string | null> => {
    const umum = {
      judul: isi.judul.trim(),
      keterangan: isi.keterangan.trim() || undefined,
      kategori: [isi.kategori],
      ...(isi.unit ? { unit: isi.unit } : {}),
      subjek: isi.subjek,
      jenis: isi.jenis,
      status_mahasiswa: isi.subjek === 'mahasiswa' && isi.status_mahasiswa.length ? isi.status_mahasiswa : null,
      konteks: isi.konteks.map((k) => ({ kode: k.kode || slug(k.judul), judul: k.judul.trim(), tipe: k.tipe, ...(k.tipe === 'pilihan' ? { opsi: (k.opsi ?? []).filter((o) => o.label.trim()).map((o) => ({ nilai: o.nilai || slug(o.label), label: o.label })) } : {}) })),
      pengatur: isi.pengatur.map((kode) => ({ jenis: 'peran', kode })),
    };
    try {
      if (rute) {
        await siakad.request({
          method: 'POST',
          path: ubah ? `/v1/aturan/rute/${encodeURIComponent(titik!.kode)}` : '/v1/aturan/rute',
          body: {
            ...umum,
            ...(isi.rute && (!ubah || isi.rute.kunci !== detailRute.data?.rute.kunci) ? { rute: isi.rute.kunci } : {}),
            subjek_sumber: isi.subjek === 'umum' ? [] : isi.subjek_sumber,
            tahun_sumber: isi.tahun_sumber,
            konteks_sumber: Object.fromEntries(isi.konteks.map((k) => [k.kode || slug(k.judul), k.sumber || `body:${k.kode || slug(k.judul)}`])),
            bila: isi.bila.map((b) => ({ sumber: b.sumber, nilai: b.nilai.split(',').map((x) => x.trim()).filter(Boolean) })),
          },
        });
      } else {
        const { subjek, ...tanpaSubjek } = umum;
        await siakad.request({
          method: 'POST',
          path: ubah ? `/v1/aturan/titik/${encodeURIComponent(titik!.kode)}` : '/v1/aturan/titik',
          body: ubah ? { ...tanpaSubjek, ...((titik?.jumlah_aturan_aktif ?? 0) > 0 ? {} : { subjek }) } : { ...umum, kode: kodeManual },
        });
      }
    } catch (e) {
      return pesanGalat(e);
    }
    invalidateSiakad('aturan');
    toast.add({ title: ubah ? 'Titik diperbarui' : 'Titik ditambahkan', description: ubah ? undefined : 'Pejabat kini bisa membuat aturan untuk titik ini.', type: 'success' });
    return null;
  };

  return (
    <PanelLangkah
      open={open}
      onOpenChange={onOpenChange}
      step={langkah}
      onStepChange={setLangkah}
      mode={ubah ? 'ubah' : 'buat'}
      size="xl"
      className="u-wtp"
      title={ubah ? `Ubah titik: ${titik?.judul}` : 'Tambah titik pemeriksaan'}
      description="Titik pemeriksaan = saat di aplikasi ketika aturan kampus diperiksa sebelum sesuatu dijalankan."
      finishLabel={ubah ? 'Simpan perubahan' : 'Tambah titik'}
      steps={steps.length ? steps : [langkahSumber]}
      onFinish={simpan}
    />
  );
}
