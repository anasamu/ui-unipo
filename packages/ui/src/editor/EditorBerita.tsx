import * as React from 'react';
import { AlertTriangle, CheckCircle2, Eye, Info, ListTree, PanelRight, PenLine, Redo2, Undo2 } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from '../components/actions';
import { Dialog, Tooltip } from '../components/overlays';
import { EditorBlok, useRiwayatBlok, type PilihMedia, type SumberMedia } from './EditorBlok';
import { PengaturanBlok } from './blok';
import type { MediaEditor, OpsiPilihMedia, PolaBlok } from './konteks';
import { blokKeHtml, daftarIsiBlok, waktuBaca } from './render';
import { baru, cariBlok, cariSemua, hitungKata, ubahBlok, type Blok } from './tipe';

export interface NilaiBerita {
  judul: string;
  ringkasan?: string;
  blok: Blok[];
}

export interface CekTerbit {
  ok: boolean;
  teks: string;
  /** Wajib lolos sebelum tombol Terbitkan aktif. */
  wajib?: boolean;
}

/**
 * Pemeriksaan sebelum terbit (sama dengan panel pra-terbit di ruang redaksi humas): judul, panjang isi, ringkasan,
 * dan teks alternatif gambar. Tambahkan cek lain lewat `cekTambahan` di EditorBerita.
 */
export function cekTerbitBerita(n: NilaiBerita, minKata = 80): CekTerbit[] {
  const kata = hitungKata(n.blok);
  const tanpaAlt = cariSemua(n.blok, (b) => b.tipe === 'gambar' && Boolean(b.data.url) && !String(b.data.alt ?? '').trim()).length;
  const c: CekTerbit[] = [
    { ok: Boolean(n.judul.trim()), teks: 'Judul sudah diisi', wajib: true },
    { ok: kata >= minKata, teks: `Isi cukup panjang (${kata} kata, saran minimal ${minKata})` },
    { ok: Boolean(n.ringkasan?.trim()), teks: 'Ringkasan diisi (kalau kosong, diambil dari paragraf pertama)' },
  ];
  if (tanpaAlt) c.push({ ok: false, teks: `${tanpaAlt} gambar belum punya teks alternatif` });
  return c;
}

/** Tampilkan isi blok sebagai HTML (kelas ub-*), sama dengan hasil render server. */
export function TampilBlok({ blok, className }: { blok: Blok[]; className?: string }) {
  const html = React.useMemo(() => blokKeHtml(blok), [blok]);
  return <div className={cn('ub-konten', className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

function JudulOtomatis({ nilai, ganti, placeholder, className, label }: { nilai: string; ganti: (v: string) => void; placeholder: string; className: string; label: string }) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const ukur = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);
  React.useLayoutEffect(ukur, [nilai, ukur]);
  // Lebar berubah (putar layar, panel dibuka/tutup) → baris judul ikut berubah.
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let lebar = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== lebar) {
        lebar = el.clientWidth;
        ukur();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ukur]);
  return <textarea ref={ref} rows={1} className={className} value={nilai} placeholder={placeholder} aria-label={label} onChange={(e) => ganti(e.target.value.replace(/\n/g, ' '))} />;
}

export interface EditorBeritaProps {
  /** Nilai awal (tidak dikendalikan). Untuk memuat ulang, ganti `key`. */
  nilaiAwal?: Partial<NilaiBerita>;
  /** Dipanggil setiap perubahan (judul, ringkasan, blok). */
  onChange?: (n: NilaiBerita) => void;
  /** Tombol simpan/terbit di bilah atas. Terima nilai terkini dan hasil cek terbit. */
  aksi?: (n: NilaiBerita, cek: CekTerbit[]) => React.ReactNode;
  /** Isi tambahan tab Dokumen (kategori, topik, gambar unggulan, jadwal, SEO). */
  panelDokumen?: React.ReactNode;
  /** Cek terbit tambahan, mis. "Topik tayang dipilih". */
  cekTambahan?: (n: NilaiBerita) => CekTerbit[];
  /** Saran jumlah kata minimal. Bawaan 80 (berita). */
  minKata?: number;
  pilihMedia?: PilihMedia;
  unggah?: (file: File, opsi: OpsiPilihMedia) => Promise<MediaEditor>;
  /** Berkas yang sudah ada di sistem (tab Pustaka: cari + pilih), mis. `useMediaPortal(situs).sumber`. */
  sumberMedia?: SumberMedia;
  pola?: PolaBlok[];
  /** Teks status simpan, mis. "Tersimpan 10.42". */
  status?: React.ReactNode;
  /** Tanpa isian ringkasan. */
  tanpaRingkasan?: boolean;
  placeholderJudul?: string;
  /**
   * Tinggi tetap (mis. `'calc(100dvh - 4rem)'` di dalam dasbor). Isi dan panel lalu bergulir sendiri-sendiri.
   * Tanpa ini, editor memanjang mengikuti isi dan bilah atas menempel saat halaman digulir.
   */
  tinggi?: number | string;
  className?: string;
}

/**
 * Editor berita lengkap gaya Gutenberg: judul dan ringkasan di atas kanvas, kanvas blok, panel samping dengan tab
 * Dokumen (daftar isi, statistik, cek terbit, isian sendiri) dan Blok (pengaturan blok terpilih), urung/ulang,
 * hitung kata dan waktu baca, serta pratinjau hasil akhir. Kirim `blok` apa adanya ke API humas.
 */
export function EditorBerita({
  nilaiAwal,
  onChange,
  aksi,
  panelDokumen,
  cekTambahan,
  minKata = 80,
  pilihMedia,
  unggah,
  sumberMedia,
  pola,
  status,
  tanpaRingkasan,
  placeholderJudul = 'Tulis judul berita',
  tinggi,
  className,
}: EditorBeritaProps) {
  const [judul, setJudul] = React.useState(nilaiAwal?.judul ?? '');
  const [ringkasan, setRingkasan] = React.useState(nilaiAwal?.ringkasan ?? '');
  const r = useRiwayatBlok(nilaiAwal?.blok?.length ? nilaiAwal.blok : [baru('paragraf')]);
  const [pilih, setPilih] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<'dokumen' | 'blok'>('dokumen');
  const [panel, setPanel] = React.useState(true);
  const [pratinjau, setPratinjau] = React.useState(false);
  const [cekBuka, setCekBuka] = React.useState(false);

  const nilai = React.useMemo<NilaiBerita>(() => ({ judul, ringkasan: tanpaRingkasan ? undefined : ringkasan, blok: r.blok }), [judul, ringkasan, r.blok, tanpaRingkasan]);
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const pertama = React.useRef(true);
  React.useEffect(() => {
    if (pertama.current) {
      pertama.current = false;
      return;
    }
    onChangeRef.current?.(nilai);
  }, [nilai]);

  React.useEffect(() => {
    if (pilih) setTab('blok');
  }, [pilih]);

  const kata = hitungKata(r.blok);
  const cek = React.useMemo(() => [...cekTerbitBerita(nilai, minKata), ...(cekTambahan?.(nilai) ?? [])], [nilai, minKata, cekTambahan]);
  const blokPilih = pilih ? cariBlok(r.blok, pilih) : null;
  const isi = daftarIsiBlok(r.blok);
  const belum = cek.filter((c) => !c.ok).length;

  const kepala = (
    <div className="u-eb-kepala" onMouseDown={(e) => e.stopPropagation()}>
      <JudulOtomatis nilai={judul} ganti={setJudul} placeholder={placeholderJudul} className="u-eb-judul" label="Judul" />
      {!tanpaRingkasan && (
        <JudulOtomatis nilai={ringkasan} ganti={setRingkasan} placeholder="Ringkasan singkat (tampil di kartu berita dan mesin pencari)" className="u-eb-ringkasan" label="Ringkasan" />
      )}
    </div>
  );

  return (
    <div className={cn('u-eb-berita', className)} data-panel={panel || undefined} data-tinggi={tinggi !== undefined || undefined} style={tinggi !== undefined ? { height: tinggi } : undefined}>
      <div className="u-eb-atas" role="toolbar" aria-label="Alat editor">
        <div className="u-eb-atas-kiri">
          <Tooltip content="Urungkan" shortcut="Ctrl+Z">
            <Button variant="ghost" size="sm" iconOnly aria-label="Urungkan" onClick={r.urung} disabled={!r.bisaUrung || pratinjau}>
              <Undo2 />
            </Button>
          </Tooltip>
          <Tooltip content="Ulangi" shortcut="Ctrl+Shift+Z">
            <Button variant="ghost" size="sm" iconOnly aria-label="Ulangi" onClick={r.ulang} disabled={!r.bisaUlang || pratinjau}>
              <Redo2 />
            </Button>
          </Tooltip>
          <span className="u-eb-statistik">
            {kata} kata · {waktuBaca(kata)} menit baca
          </span>
          {status && <span className="u-eb-status">{status}</span>}
        </div>
        <div className="u-eb-atas-kanan">
          <Button variant={pratinjau ? 'soft' : 'ghost'} size="sm" onClick={() => setPratinjau((x) => !x)} aria-pressed={pratinjau} aria-label={pratinjau ? 'Sunting' : 'Pratinjau'}>
            {pratinjau ? <PenLine /> : <Eye />}
            <span className="u-eb-label">{pratinjau ? 'Sunting' : 'Pratinjau'}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCekBuka(true)} aria-label={belum ? `Cek terbit, ${belum} belum lolos` : 'Cek terbit'}>
            {belum ? <Info /> : <CheckCircle2 />}
            <span className="u-eb-label">Cek terbit</span>
            {belum ? ` (${belum})` : ''}
          </Button>
          <Tooltip content={panel ? 'Tutup panel' : 'Buka panel'}>
            <Button variant={panel ? 'soft' : 'ghost'} size="sm" iconOnly aria-label="Panel pengaturan" aria-pressed={panel} onClick={() => setPanel((x) => !x)}>
              <PanelRight />
            </Button>
          </Tooltip>
          {aksi?.(nilai, cek)}
        </div>
      </div>

      <div className="u-eb-tubuh">
        <div className="u-eb-lembar">
          {pratinjau ? (
            <article className="u-eb-pratinjau">
              <h1 className="u-eb-judul">{judul || 'Tanpa judul'}</h1>
              {ringkasan && !tanpaRingkasan && <p className="u-eb-ringkasan">{ringkasan}</p>}
              <TampilBlok blok={r.blok} />
            </article>
          ) : (
            <EditorBlok blok={r.blok} set={r.set} urung={r.urung} ulang={r.ulang} pilih={pilih} setPilih={setPilih} pilihMedia={pilihMedia} unggah={unggah} sumberMedia={sumberMedia} pola={pola} kepala={kepala} />
          )}
        </div>

        {panel && (
          <aside className="u-eb-panel" aria-label="Pengaturan">
            <div className="u-eb-panel-tab" role="tablist">
              <button type="button" role="tab" aria-selected={tab === 'dokumen'} onClick={() => setTab('dokumen')}>
                Dokumen
              </button>
              <button type="button" role="tab" aria-selected={tab === 'blok'} onClick={() => setTab('blok')}>
                Blok
              </button>
            </div>
            <div className="u-eb-panel-isi">
              {tab === 'blok' ? (
                blokPilih ? (
                  <PengaturanBlok b={blokPilih} ganti={(x) => r.set(ubahBlok(r.blok, x.id, () => x))} />
                ) : (
                  <p className="u-eb-redup">Pilih satu blok di kanvas untuk melihat pengaturannya.</p>
                )
              ) : (
                <div className="u-eb-dokumen">
                  {panelDokumen}
                  <section>
                    <h3 className="u-eb-panel-judul">
                      <ListTree aria-hidden />
                      Daftar isi
                    </h3>
                    {isi.length ? (
                      <ol className="u-eb-daftar-isi">
                        {isi.map((x, i) => (
                          <li key={`${x.id}-${i}`} data-tingkat={x.tingkat}>
                            {x.teks}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="u-eb-redup">Tambahkan blok Judul (ketik ## di awal paragraf) untuk membagi tulisan.</p>
                    )}
                  </section>
                  <section>
                    <h3 className="u-eb-panel-judul">Cek terbit</h3>
                    <DaftarCek cek={cek} />
                  </section>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      <Dialog
        open={cekBuka}
        onOpenChange={setCekBuka}
        title={cek.some((c) => c.wajib && !c.ok) ? 'Belum siap terbit' : 'Siap terbit?'}
        description="Periksa sekali lagi sebelum tampil di semua situs terkait."
        footer={
          <>
            <Button variant="outline" onClick={() => setCekBuka(false)}>
              Kembali menyunting
            </Button>
            {aksi?.(nilai, cek)}
          </>
        }
      >
        <DaftarCek cek={cek} />
      </Dialog>
    </div>
  );
}

/** Daftar hasil cek terbit dengan ikon lolos / wajib / saran. */
export function DaftarCek({ cek }: { cek: CekTerbit[] }) {
  return (
    <ul className="u-eb-cek">
      {cek.map((c) => (
        <li key={c.teks} data-ok={c.ok || undefined} data-wajib={(c.wajib && !c.ok) || undefined}>
          {c.ok ? <CheckCircle2 aria-hidden /> : c.wajib ? <AlertTriangle aria-hidden /> : <Info aria-hidden />}
          <span>{c.teks}</span>
        </li>
      ))}
    </ul>
  );
}
