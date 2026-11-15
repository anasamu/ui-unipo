import * as React from 'react';
import { BookMarked, BookOpen, Check, Eye, FileText, GraduationCap, MessageSquareText, PenLine, Plus, Printer, Quote, Redo2, Search, Trash2, Undo2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from '../../components/actions';
import { Progress } from '../../components/display';
import { Field, Input, Textarea } from '../../components/forms';
import { Dialog, Tooltip } from '../../components/overlays';
import { Select } from '../../components/select';
import { EditorBlok, useRiwayatBlok, type SumberMedia } from '../EditorBlok';
import type { MediaEditor, OpsiPilihMedia } from '../konteks';
import { blokKeHtml } from '../render';
import { baru, hitungKata, idBaru, teksBlok, type Blok, type TipeBlok } from '../tipe';
import { saringHtml } from './saring';
import { useSisipDiKaret } from './sisip';
import { JENIS_PUSTAKA, dikutip, entriApa, pustakaLengkap, sitasi, urutPustaka, type JenisPustaka, type PustakaSkripsi } from './pustaka';

export interface BabSkripsi {
  id: string;
  /** Mis. "Pendahuluan". Nomor bab (I, II, ...) diberikan otomatis. */
  judul: string;
  blok: Blok[];
  /** Saran jumlah kata minimal untuk bilah kemajuan. */
  targetKata?: number;
}

export interface NaskahSkripsi {
  judul: string;
  penulis?: string;
  nim?: string;
  prodi?: string;
  fakultas?: string;
  tahun?: string;
  pembimbing?: string[];
  abstrak: string;
  kataKunci?: string;
  bab: BabSkripsi[];
  pustaka: PustakaSkripsi[];
}

/** Catatan bimbingan dari pembimbing pada satu bagian naskah. */
export interface CatatanBimbingan {
  id: string | number;
  /** id bab, 'abstrak', 'judul', atau 'pustaka'. Kosong = catatan umum. */
  bagian?: string | null;
  oleh: string;
  waktu: string;
  teks: string;
  selesai?: boolean;
}

/** Kerangka bawaan skripsi lima bab (kuantitatif/kualitatif umum). */
export function kerangkaSkripsi(): BabSkripsi[] {
  const bab = (judul: string, sub: string[], targetKata: number): BabSkripsi => ({
    id: idBaru(),
    judul,
    targetKata,
    blok: sub.flatMap((s) => [baru('judul', { teks: s, tingkat: 3 }), baru('paragraf')]),
  });
  return [
    bab('Pendahuluan', ['Latar Belakang', 'Rumusan Masalah', 'Tujuan Penelitian', 'Manfaat Penelitian'], 1500),
    bab('Tinjauan Pustaka', ['Landasan Teori', 'Penelitian Terdahulu', 'Kerangka Pikir'], 3000),
    bab('Metode Penelitian', ['Jenis Penelitian', 'Lokasi dan Waktu', 'Teknik Pengumpulan Data', 'Teknik Analisis Data'], 1500),
    bab('Hasil dan Pembahasan', ['Hasil Penelitian', 'Pembahasan'], 4000),
    bab('Penutup', ['Kesimpulan', 'Saran'], 500),
  ];
}

export function naskahKosong(awal: Partial<NaskahSkripsi> = {}): NaskahSkripsi {
  return { judul: '', abstrak: '', kataKunci: '', pembimbing: [], pustaka: [], ...awal, bab: awal.bab?.length ? awal.bab : kerangkaSkripsi() };
}

const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const romawi = (i: number) => ROMAWI[i] ?? String(i + 1);
const kataTeks = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

/** Tipe blok untuk naskah ilmiah: tanpa tombol, sematan video/peta, akordion. */
export const TIPE_SKRIPSI: TipeBlok[] = ['paragraf', 'judul', 'daftar', 'kutipan', 'tabel', 'gambar', 'kode', 'pemisah', 'kolom'];

/** HTML naskah lengkap (halaman judul, abstrak, bab, daftar pustaka) untuk dicetak atau disimpan. */
export function htmlNaskah(n: NaskahSkripsi): string {
  const e = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const bab = n.bab.map((b, i) => `<section class="ub-bab"><h2>BAB ${romawi(i)}<br>${e(b.judul.toUpperCase())}</h2>${saringHtml(blokKeHtml(b.blok))}</section>`).join('');
  const abstrak = n.abstrak.trim()
    ? `<section class="ub-bab"><h2>ABSTRAK</h2>${n.abstrak
        .split(/\n{2,}/)
        .map((p) => `<p>${e(p.trim())}</p>`)
        .join('')}${n.kataKunci ? `<p><strong>Kata kunci:</strong> ${e(n.kataKunci)}</p>` : ''}</section>`
    : '';
  const pustaka = n.pustaka.length ? `<section class="ub-bab"><h2>DAFTAR PUSTAKA</h2>${urutPustaka(n.pustaka).map((p) => `<p class="ub-pustaka">${entriApa(p)}</p>`).join('')}</section>` : '';
  return abstrak + bab + pustaka;
}

export interface EditorSkripsiProps {
  /** Naskah (dikendalikan). Mulai dari `naskahKosong()`. */
  nilai: NaskahSkripsi;
  onChange: (n: NaskahSkripsi) => void;
  /** Catatan pembimbing (baca saja di sini; tambah lewat `onCatatan`). */
  catatan?: CatatanBimbingan[];
  /** Bila diisi, muncul isian catatan (untuk pembimbing). */
  onCatatan?: (bagian: string | null, teks: string) => void | Promise<void>;
  /** Tandai catatan selesai (mahasiswa sudah memperbaiki). */
  onCatatanSelesai?: (c: CatatanBimbingan) => void;
  aksi?: (n: NaskahSkripsi) => React.ReactNode;
  status?: React.ReactNode;
  /** Kunci isi naskah (mis. setelah disetujui). */
  baca?: boolean;
  unggah?: (file: File, opsi: OpsiPilihMedia) => Promise<MediaEditor>;
  sumberMedia?: SumberMedia;
  tinggi?: number | string;
  /** Nama perguruan tinggi di halaman judul. */
  instansi?: string;
  className?: string;
}

type Bagian = 'judul' | 'abstrak' | 'pustaka' | string;

/**
 * Ruang menulis skripsi: kerangka bab dengan hitungan kata dan target, halaman judul, abstrak, kanvas bab di atas
 * kertas, pengelola daftar pustaka (APA 7) dengan sisip sitasi di posisi kursor, catatan bimbingan per bagian, dan
 * pratinjau naskah utuh siap cetak. Dikendalikan (`nilai`/`onChange`); simpan naskah lewat `aksi` ke API Anda.
 */
export function EditorSkripsi({ nilai, onChange, catatan = [], onCatatan, onCatatanSelesai, aksi, status, baca, unggah, sumberMedia, tinggi, instansi = 'Universitas Pohuwato', className }: EditorSkripsiProps) {
  const [bagian, setBagian] = React.useState<Bagian>(nilai.bab[0]?.id ?? 'judul');
  const [panel, setPanel] = React.useState<'pustaka' | 'bimbingan' | null>('pustaka');
  const [lihat, setLihat] = React.useState(false);
  const kertasRef = React.useRef<HTMLDivElement>(null);
  const sisip = useSisipDiKaret(kertasRef);
  const ubah = (x: Partial<NaskahSkripsi>) => onChange({ ...nilai, ...x });

  const babAktif = nilai.bab.find((b) => b.id === bagian) ?? null;
  const nomorBab = babAktif ? nilai.bab.indexOf(babAktif) : -1;
  const semuaTeks = React.useMemo(() => nilai.bab.map((b) => teksBlok(b.blok)).join(' '), [nilai.bab]);
  const totalKata = React.useMemo(() => nilai.bab.reduce((s, b) => s + hitungKata(b.blok), 0), [nilai.bab]);
  const catatanTerbuka = catatan.filter((c) => !c.selesai);
  const catatanDi = (id: string) => catatanTerbuka.filter((c) => c.bagian === id).length;

  const tambahBab = () => {
    const b: BabSkripsi = { id: idBaru(), judul: 'Bab baru', blok: [baru('paragraf')] };
    ubah({ bab: [...nilai.bab, b] });
    setBagian(b.id);
  };

  const kerangka = (
    <nav className="u-skripsi-kerangka" aria-label="Kerangka naskah">
      <p className="u-skripsi-total">
        <strong>{totalKata.toLocaleString('id-ID')}</strong> kata
      </p>
      <ul>
        {[
          { id: 'judul', label: 'Halaman judul', ikon: <GraduationCap aria-hidden /> },
          { id: 'abstrak', label: 'Abstrak', ikon: <FileText aria-hidden />, kata: kataTeks(nilai.abstrak), target: 250 },
        ].map((x) => (
          <ItemKerangka key={x.id} aktif={bagian === x.id} pilih={() => setBagian(x.id)} label={x.label} ikon={x.ikon} kata={x.kata} target={x.target} catatan={catatanDi(x.id)} />
        ))}
        {nilai.bab.map((b, i) => (
          <ItemKerangka key={b.id} aktif={bagian === b.id} pilih={() => setBagian(b.id)} label={`Bab ${romawi(i)}  ${b.judul}`} kata={hitungKata(b.blok)} target={b.targetKata} catatan={catatanDi(b.id)} />
        ))}
        <ItemKerangka aktif={bagian === 'pustaka'} pilih={() => setBagian('pustaka')} label={`Daftar pustaka (${nilai.pustaka.length})`} ikon={<BookMarked aria-hidden />} catatan={catatanDi('pustaka')} />
      </ul>
      {!baca && (
        <Button variant="ghost" size="sm" onClick={tambahBab}>
          <Plus />
          Tambah bab
        </Button>
      )}
    </nav>
  );

  let isiKertas: React.ReactNode;
  if (lihat) {
    isiKertas = <PratinjauNaskah n={nilai} instansi={instansi} />;
  } else if (bagian === 'judul') {
    isiKertas = <HalamanJudul n={nilai} ubah={ubah} baca={baca} />;
  } else if (bagian === 'abstrak') {
    isiKertas = (
      <div className="u-skripsi-abstrak">
        <h2 className="u-skripsi-kepala-bab">ABSTRAK</h2>
        <Textarea aria-label="Abstrak" rows={14} value={nilai.abstrak} disabled={baca} placeholder="Tulis abstrak 150–250 kata: latar, tujuan, metode, hasil, dan simpulan. Pisahkan paragraf dengan baris kosong." onChange={(e) => ubah({ abstrak: e.target.value })} />
        <p className="u-eb-redup">{kataTeks(nilai.abstrak)} kata (saran 150–250)</p>
        <Field label="Kata kunci" description="3–5 kata, dipisah titik koma.">
          <Input value={nilai.kataKunci ?? ''} disabled={baca} onChange={(e) => ubah({ kataKunci: e.target.value })} />
        </Field>
      </div>
    );
  } else if (bagian === 'pustaka') {
    isiKertas = <DaftarPustakaTampil pustaka={nilai.pustaka} teks={semuaTeks} />;
  } else if (babAktif) {
    isiKertas = (
      <KanvasBab
        key={babAktif.id}
        bab={babAktif}
        nomor={nomorBab}
        baca={baca}
        unggah={unggah}
        sumberMedia={sumberMedia}
        ganti={(b) => ubah({ bab: nilai.bab.map((x) => (x.id === b.id ? b : x)) })}
        hapus={
          nilai.bab.length > 1
            ? () => {
                const sisa = nilai.bab.filter((x) => x.id !== babAktif.id);
                ubah({ bab: sisa });
                setBagian(sisa[Math.max(0, nomorBab - 1)].id);
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className={cn('u-eb-berita u-dok u-skripsi', className)} data-panel={panel ? true : undefined} data-tinggi={tinggi !== undefined || undefined} style={tinggi !== undefined ? { height: tinggi } : undefined}>
      <div className="u-eb-atas" role="toolbar" aria-label="Alat naskah">
        <div className="u-eb-atas-kiri">
          <span className="u-skripsi-judul-bilah">{nilai.judul || 'Naskah tanpa judul'}</span>
          {status && <span className="u-eb-status">{status}</span>}
        </div>
        <div className="u-eb-atas-kanan">
          <Button variant={lihat ? 'soft' : 'ghost'} size="sm" aria-pressed={lihat} aria-label={lihat ? 'Sunting' : 'Pratinjau naskah'} onClick={() => setLihat((x) => !x)}>
            {lihat ? <PenLine /> : <Eye />}
            <span className="u-eb-label">{lihat ? 'Sunting' : 'Pratinjau'}</span>
          </Button>
          <Tooltip content="Cetak naskah">
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Cetak naskah"
              onClick={() => {
                setLihat(true);
                requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
              }}
            >
              <Printer />
            </Button>
          </Tooltip>
          <Button variant={panel === 'pustaka' ? 'soft' : 'ghost'} size="sm" aria-pressed={panel === 'pustaka'} aria-label="Pustaka" onClick={() => setPanel((p) => (p === 'pustaka' ? null : 'pustaka'))}>
            <BookOpen />
            <span className="u-eb-label">Pustaka</span>
          </Button>
          <Button variant={panel === 'bimbingan' ? 'soft' : 'ghost'} size="sm" aria-pressed={panel === 'bimbingan'} aria-label={`Bimbingan, ${catatanTerbuka.length} catatan terbuka`} onClick={() => setPanel((p) => (p === 'bimbingan' ? null : 'bimbingan'))}>
            <MessageSquareText />
            <span className="u-eb-label">Bimbingan</span>
            {catatanTerbuka.length > 0 && <span className="u-skripsi-hitung">{catatanTerbuka.length}</span>}
          </Button>
          {aksi?.(nilai)}
        </div>
      </div>

      <div className="u-eb-tubuh u-skripsi-tubuh">
        {kerangka}
        <div className={cn('u-eb-lembar u-dok-meja', lihat && 'u-cetak-saja')}>
          <div ref={kertasRef} className="u-dok-kertas">
            {isiKertas}
          </div>
        </div>
        {panel && (
          <aside className="u-eb-panel" aria-label={panel === 'pustaka' ? 'Pustaka' : 'Bimbingan'}>
            <div className="u-eb-panel-tab" role="tablist">
              <button type="button" role="tab" aria-selected={panel === 'pustaka'} onClick={() => setPanel('pustaka')}>
                Pustaka
              </button>
              <button type="button" role="tab" aria-selected={panel === 'bimbingan'} onClick={() => setPanel('bimbingan')}>
                Bimbingan
              </button>
            </div>
            <div className="u-eb-panel-isi">
              {panel === 'pustaka' ? (
                <PanelPustaka
                  pustaka={nilai.pustaka}
                  teks={semuaTeks}
                  baca={baca || lihat || !babAktif}
                  ganti={(pustaka) => ubah({ pustaka })}
                  kutip={(p, naratif) => {
                    if (!sisip(sitasi(p, { naratif }))) return false;
                    return true;
                  }}
                />
              ) : (
                <PanelBimbingan catatan={catatan} bagian={bagian} namaBagian={babAktif ? `Bab ${romawi(nomorBab)}` : bagian === 'judul' ? 'Halaman judul' : bagian === 'abstrak' ? 'Abstrak' : 'Daftar pustaka'} onCatatan={onCatatan} onSelesai={onCatatanSelesai} />
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function ItemKerangka({ aktif, pilih, label, ikon, kata, target, catatan }: { aktif: boolean; pilih: () => void; label: string; ikon?: React.ReactNode; kata?: number; target?: number; catatan: number }) {
  return (
    <li>
      <button type="button" className="u-skripsi-item" aria-current={aktif || undefined} onClick={pilih}>
        <span className="u-skripsi-item-baris">
          {ikon}
          <span className="u-skripsi-item-label">{label}</span>
          {catatan > 0 && (
            <span className="u-skripsi-hitung" aria-label={`${catatan} catatan`}>
              {catatan}
            </span>
          )}
        </span>
        {kata !== undefined && (
          <span className="u-skripsi-item-kata">
            {target ? <Progress value={Math.min(kata, target)} max={target} size="sm" tone={kata >= target ? 'success' : undefined} /> : null}
            <span>{target ? `${kata.toLocaleString('id-ID')} / ${target.toLocaleString('id-ID')}` : `${kata.toLocaleString('id-ID')} kata`}</span>
          </span>
        )}
      </button>
    </li>
  );
}

function KanvasBab({ bab, nomor, ganti, hapus, baca, unggah, sumberMedia }: { bab: BabSkripsi; nomor: number; ganti: (b: BabSkripsi) => void; hapus?: () => void; baca?: boolean; unggah?: EditorSkripsiProps['unggah']; sumberMedia?: SumberMedia }) {
  const r = useRiwayatBlok(bab.blok.length ? bab.blok : [baru('paragraf')]);
  const babRef = React.useRef(bab);
  babRef.current = bab;
  const gantiRef = React.useRef(ganti);
  gantiRef.current = ganti;
  const pertama = React.useRef(true);
  React.useEffect(() => {
    if (pertama.current) {
      pertama.current = false;
      return;
    }
    gantiRef.current({ ...babRef.current, blok: r.blok });
  }, [r.blok]);
  const [yakinHapus, setYakinHapus] = React.useState(false);

  return (
    <div className="u-skripsi-bab">
      <div className="u-skripsi-bab-alat">
        <Tooltip content="Urungkan" shortcut="Ctrl+Z">
          <Button variant="ghost" size="sm" iconOnly aria-label="Urungkan" onClick={r.urung} disabled={!r.bisaUrung || baca}>
            <Undo2 />
          </Button>
        </Tooltip>
        <Tooltip content="Ulangi" shortcut="Ctrl+Shift+Z">
          <Button variant="ghost" size="sm" iconOnly aria-label="Ulangi" onClick={r.ulang} disabled={!r.bisaUlang || baca}>
            <Redo2 />
          </Button>
        </Tooltip>
        {hapus && !baca && (
          <Button variant="ghost" size="sm" onClick={() => setYakinHapus(true)}>
            <Trash2 />
            Hapus bab
          </Button>
        )}
      </div>
      <p className="u-skripsi-kepala-bab">BAB {romawi(nomor)}</p>
      <input
        className="u-skripsi-judul-bab"
        aria-label={`Judul bab ${romawi(nomor)}`}
        value={bab.judul}
        disabled={baca}
        onChange={(e) => ganti({ ...bab, judul: e.target.value })}
      />
      <EditorBlok blok={r.blok} set={r.set} urung={r.urung} ulang={r.ulang} unggah={unggah} sumberMedia={sumberMedia} tipe={TIPE_SKRIPSI} baca={baca} />
      <Dialog
        open={yakinHapus}
        onOpenChange={setYakinHapus}
        size="sm"
        title={`Hapus Bab ${romawi(nomor)} ${bab.judul}?`}
        description={`${hitungKata(r.blok)} kata di bab ini ikut terhapus.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setYakinHapus(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setYakinHapus(false);
                hapus?.();
              }}
            >
              Hapus bab
            </Button>
          </>
        }
      />
    </div>
  );
}

function HalamanJudul({ n, ubah, baca }: { n: NaskahSkripsi; ubah: (x: Partial<NaskahSkripsi>) => void; baca?: boolean }) {
  const isian = (k: keyof NaskahSkripsi, label: string, ph?: string) => (
    <Field label={label}>
      <Input value={(n[k] as string) ?? ''} placeholder={ph} disabled={baca} onChange={(e) => ubah({ [k]: e.target.value } as Partial<NaskahSkripsi>)} />
    </Field>
  );
  return (
    <div className="u-skripsi-sampul">
      <Field label="Judul skripsi">
        <Textarea rows={3} value={n.judul} disabled={baca} placeholder="Judul ditulis singkat, jelas, dan menggambarkan variabel penelitian" onChange={(e) => ubah({ judul: e.target.value.replace(/\n/g, ' ') })} />
      </Field>
      <div className="u-skripsi-sampul-kisi">
        {isian('penulis', 'Nama penulis')}
        {isian('nim', 'NIM')}
        {isian('prodi', 'Program studi')}
        {isian('fakultas', 'Fakultas')}
        {isian('tahun', 'Tahun', String(new Date().getFullYear()))}
      </div>
      <Field label="Pembimbing" description="Satu nama per baris, lengkap dengan gelar.">
        <Textarea rows={2} value={(n.pembimbing ?? []).join('\n')} disabled={baca} onChange={(e) => ubah({ pembimbing: e.target.value.split('\n') })} />
      </Field>
    </div>
  );
}

function DaftarPustakaTampil({ pustaka, teks }: { pustaka: PustakaSkripsi[]; teks: string }) {
  return (
    <div className="ub-konten u-skripsi-pustaka-lembar">
      <h2 className="u-skripsi-kepala-bab">DAFTAR PUSTAKA</h2>
      {pustaka.length ? (
        urutPustaka(pustaka).map((p) => (
          <p key={p.id} className="ub-pustaka" data-tak-dikutip={!dikutip(p, teks) || undefined} dangerouslySetInnerHTML={{ __html: entriApa(p) }} />
        ))
      ) : (
        <p className="u-eb-redup">Tambahkan pustaka di panel Pustaka. Daftar ini tersusun otomatis sesuai APA edisi 7.</p>
      )}
    </div>
  );
}

function PratinjauNaskah({ n, instansi }: { n: NaskahSkripsi; instansi: string }) {
  return (
    <div className="u-skripsi-naskah">
      <div className="u-skripsi-sampul-cetak">
        <p className="u-skripsi-jenis">SKRIPSI</p>
        <p className="u-skripsi-judul-cetak">{(n.judul || 'Judul skripsi').toUpperCase()}</p>
        <p>
          Oleh
          <br />
          <strong>{n.penulis || 'Nama penulis'}</strong>
          <br />
          NIM {n.nim || '…'}
        </p>
        <p className="u-skripsi-instansi">
          {(n.prodi ? `Program Studi ${n.prodi}` : '').toUpperCase()}
          <br />
          {(n.fakultas ? `Fakultas ${n.fakultas}` : '').toUpperCase()}
          <br />
          {instansi.toUpperCase()}
          <br />
          {n.tahun || new Date().getFullYear()}
        </p>
      </div>
      <div className="ub-konten" dangerouslySetInnerHTML={{ __html: htmlNaskah(n) }} />
    </div>
  );
}

const pustakaBaru = (): PustakaSkripsi => ({ id: idBaru(), jenis: 'jurnal', penulis: '', tahun: '', judul: '', sumber: '' });

function PanelPustaka({ pustaka, teks, baca, ganti, kutip }: { pustaka: PustakaSkripsi[]; teks: string; baca?: boolean; ganti: (p: PustakaSkripsi[]) => void; kutip: (p: PustakaSkripsi, naratif: boolean) => boolean }) {
  const [q, setQ] = React.useState('');
  const [sunting, setSunting] = React.useState<PustakaSkripsi | null>(null);
  const [pesan, setPesan] = React.useState<string | null>(null);
  const daftar = urutPustaka(pustaka).filter((p) => !q || `${p.penulis} ${p.judul} ${p.tahun} ${p.sumber ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  const takDikutip = pustaka.filter((p) => !dikutip(p, teks)).length;

  return (
    <div className="u-eb-dokumen">
      <section>
        <h3 className="u-eb-panel-judul">
          <BookMarked aria-hidden />
          Daftar pustaka
        </h3>
        <p className="u-eb-redup">
          {pustaka.length} pustaka{takDikutip ? `, ${takDikutip} belum dikutip di naskah` : ''}. Klik kutip untuk menyisipkan sitasi di posisi kursor.
        </p>
      </section>
      <div className="u-eb-pustaka-cari">
        <Search aria-hidden />
        <input type="search" value={q} placeholder="Cari penulis atau judul" aria-label="Cari pustaka" onChange={(e) => setQ(e.target.value)} />
      </div>
      {pesan && (
        <p className="u-eb-redup" role="status">
          {pesan}
        </p>
      )}
      <ul className="u-skripsi-pustaka">
        {daftar.map((p) => (
          <li key={p.id} data-tak-dikutip={!dikutip(p, teks) || undefined}>
            <button type="button" className="u-skripsi-pustaka-isi" onClick={() => setSunting(p)} aria-label={`Sunting pustaka ${p.judul}`}>
              <span className="u-skripsi-pustaka-sitasi">{sitasi(p)}</span>
              <span className="u-skripsi-pustaka-judul">{p.judul || 'Tanpa judul'}</span>
            </button>
            <div className="u-skripsi-pustaka-aksi">
              <Tooltip content="Kutip: (Penulis, tahun)">
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label={`Kutip ${sitasi(p)}`}
                  disabled={baca}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setPesan(kutip(p, false) ? null : 'Klik dulu di teks bab tempat sitasi akan disisipkan.')}
                >
                  <Quote />
                </Button>
              </Tooltip>
              <Tooltip content="Kutip naratif: Penulis (tahun)">
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label={`Kutip naratif ${sitasi(p, { naratif: true })}`}
                  disabled={baca}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setPesan(kutip(p, true) ? null : 'Klik dulu di teks bab tempat sitasi akan disisipkan.')}
                >
                  <PenLine />
                </Button>
              </Tooltip>
            </div>
          </li>
        ))}
      </ul>
      <Button variant="outline" size="sm" onClick={() => setSunting(pustakaBaru())}>
        <Plus />
        Tambah pustaka
      </Button>

      {sunting && (
        <FormPustaka
          awal={sunting}
          baru={!pustaka.some((p) => p.id === sunting.id)}
          tutup={() => setSunting(null)}
          simpan={(p) => {
            ganti(pustaka.some((x) => x.id === p.id) ? pustaka.map((x) => (x.id === p.id ? p : x)) : [...pustaka, p]);
            setSunting(null);
          }}
          hapus={() => {
            ganti(pustaka.filter((x) => x.id !== sunting.id));
            setSunting(null);
          }}
        />
      )}
    </div>
  );
}

function FormPustaka({ awal, baru: adalahBaru, tutup, simpan, hapus }: { awal: PustakaSkripsi; baru: boolean; tutup: () => void; simpan: (p: PustakaSkripsi) => void; hapus: () => void }) {
  const [p, setP] = React.useState(awal);
  const [coba, setCoba] = React.useState(false);
  const set = (x: Partial<PustakaSkripsi>) => setP((v) => ({ ...v, ...x }));
  const def = JENIS_PUSTAKA.find((j) => j.value === p.jenis) ?? JENIS_PUSTAKA[0];
  const lengkap = pustakaLengkap(p);
  const isian = (k: keyof PustakaSkripsi, label: string, opsi: { ph?: string; wajib?: boolean; desk?: string } = {}) => (
    <Field label={label} required={opsi.wajib} description={opsi.desk} error={coba && opsi.wajib && !String(p[k] ?? '').trim() ? `${label} wajib diisi.` : undefined}>
      <Input value={(p[k] as string) ?? ''} placeholder={opsi.ph} onChange={(e) => set({ [k]: e.target.value } as Partial<PustakaSkripsi>)} />
    </Field>
  );
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && tutup()}
      size="lg"
      title={adalahBaru ? 'Tambah pustaka' : 'Sunting pustaka'}
      description="Penulis ditulis Nama belakang, Inisial. Pisahkan beberapa penulis dengan titik koma."
      footer={
        <>
          {!adalahBaru && (
            <Button variant="ghost" onClick={hapus}>
              <Trash2 />
              Hapus pustaka
            </Button>
          )}
          <Button variant="outline" onClick={tutup}>
            Batal
          </Button>
          <Button
            onClick={() => {
              setCoba(true);
              if (lengkap) simpan({ ...p, penulis: p.penulis.trim(), judul: p.judul.trim(), tahun: p.tahun.trim() });
            }}
          >
            <Check />
            Simpan pustaka
          </Button>
        </>
      }
    >
      <div className="u-dok-isian">
        <Field label="Jenis">
          <Select<JenisPustaka> value={p.jenis} onValueChange={(v) => set({ jenis: v ?? 'jurnal' })} options={JENIS_PUSTAKA.map((j) => ({ value: j.value, label: j.label }))} />
        </Field>
        {isian('penulis', 'Penulis', { ph: 'Santoso, B.; Wijaya, A. R.', wajib: true })}
        <div className="u-skripsi-sampul-kisi">
          {isian('tahun', 'Tahun', { ph: '2024', wajib: true })}
          {isian('sumber', def.sumber)}
        </div>
        {isian('judul', 'Judul', { wajib: true })}
        {p.jenis === 'jurnal' && (
          <div className="u-skripsi-sampul-kisi">
            {isian('volume', 'Volume')}
            {isian('nomor', 'Nomor')}
            {isian('halaman', 'Halaman', { ph: '45–60' })}
          </div>
        )}
        {p.jenis === 'buku' && isian('kota', 'Kota terbit', { desk: 'Tidak dipakai APA 7; isi bila pedoman prodi meminta.' })}
        <div className="u-skripsi-sampul-kisi">
          {isian('doi', 'DOI', { ph: '10.1234/abcd' })}
          {isian('url', 'URL')}
        </div>
        <div className="u-skripsi-contoh">
          <p className="u-dok-grup">Hasil di daftar pustaka</p>
          <p className="ub-pustaka" dangerouslySetInnerHTML={{ __html: entriApa(p) }} />
          <p className="u-dok-grup">Sitasi</p>
          <p>
            {sitasi(p)} · {sitasi(p, { naratif: true })}
          </p>
        </div>
      </div>
    </Dialog>
  );
}

function PanelBimbingan({ catatan, bagian, namaBagian, onCatatan, onSelesai }: { catatan: CatatanBimbingan[]; bagian: string; namaBagian: string; onCatatan?: EditorSkripsiProps['onCatatan']; onSelesai?: EditorSkripsiProps['onCatatanSelesai'] }) {
  const [teks, setTeks] = React.useState('');
  const [sibuk, setSibuk] = React.useState(false);
  const [semua, setSemua] = React.useState(false);
  const daftar = catatan.filter((c) => semua || c.bagian === bagian || !c.bagian);
  return (
    <div className="u-eb-dokumen">
      <section>
        <h3 className="u-eb-panel-judul">
          <MessageSquareText aria-hidden />
          Catatan {semua ? 'semua bagian' : namaBagian}
        </h3>
        <label className="u-skripsi-semua">
          <input type="checkbox" checked={semua} onChange={(e) => setSemua(e.target.checked)} /> Tampilkan semua bagian
        </label>
      </section>
      {daftar.length ? (
        <ul className="u-skripsi-catatan">
          {daftar.map((c) => (
            <li key={c.id} data-selesai={c.selesai || undefined}>
              <p className="u-skripsi-catatan-oleh">
                <strong>{c.oleh}</strong> · {new Date(c.waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
              </p>
              <p>{c.teks}</p>
              {onSelesai && !c.selesai && (
                <Button variant="ghost" size="sm" onClick={() => onSelesai(c)}>
                  <Check />
                  Tandai sudah diperbaiki
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="u-eb-redup">Belum ada catatan untuk bagian ini.</p>
      )}
      {onCatatan && (
        <form
          className="u-dok-isian"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!teks.trim()) return;
            setSibuk(true);
            try {
              await onCatatan(bagian, teks.trim());
              setTeks('');
            } finally {
              setSibuk(false);
            }
          }}
        >
          <Field label={`Catatan untuk ${namaBagian}`}>
            <Textarea rows={3} value={teks} onChange={(e) => setTeks(e.target.value)} />
          </Field>
          <Button type="submit" size="sm" loading={sibuk} disabled={!teks.trim()}>
            Kirim catatan
          </Button>
        </form>
      )}
    </div>
  );
}
