import * as React from 'react';
import { Braces, Eye, PanelRight, PenLine, Plus, Printer, Redo2, Undo2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from '../../components/actions';
import { Tooltip } from '../../components/overlays';
import { EditorBlok, useRiwayatBlok, type PilihMedia, type SumberMedia } from '../EditorBlok';
import { PengaturanBlok } from '../blok';
import type { MediaEditor, OpsiPilihMedia, PolaBlok } from '../konteks';
import { blokKeHtml } from '../render';
import { baru, cariBlok, hitungKata, htmlKeBlok, ubahBlok, type Blok, type TipeBlok } from '../tipe';
import { saringHtml } from './saring';
import { useSisipDiKaret } from './sisip';
import { PENANDA_BAWAAN, penandaDi, type PenandaTemplat } from './templat';
import type { UkuranKertas } from './LembarSurat';

/** Tipe blok yang cocok untuk surat/dokumen resmi (lolos saringan HTML server, tanpa sematan video/peta). */
export const TIPE_DOKUMEN: TipeBlok[] = ['paragraf', 'judul', 'daftar', 'kutipan', 'tabel', 'gambar', 'kolom', 'pemisah', 'spasi', 'sorotan', 'berkas'];

/** HTML dokumen dari blok, sudah disaring sama seperti server (aman dikirim ke kolom `isi`). */
export function htmlDokumen(blok: Blok[]): string {
  return saringHtml(blokKeHtml(blok));
}

export interface EditorDokumenProps {
  /** Isi awal: HTML dari server (kolom `isi`) atau daftar blok. Untuk memuat ulang, ganti `key`. */
  nilaiAwal?: string | Blok[] | null;
  /** Dipanggil setiap perubahan dengan HTML siap kirim dan bloknya. */
  onChange?: (html: string, blok: Blok[]) => void;
  /** Penanda `{{nama}}` yang bisa disisipkan. Penanda bawaan arsip ditambahkan bila `penandaBawaan`. */
  penanda?: PenandaTemplat[];
  /** Tampilkan penanda bawaan arsip (unit, tanggal, perihal, lampiran). Bawaan: true bila `penanda` diisi. */
  penandaBawaan?: boolean;
  /** Boleh menambah penanda baru dengan mengetik namanya. */
  penandaBebas?: boolean;
  kertas?: UkuranKertas;
  /** Isi tetap di atas isi dokumen pada kertas (mis. kop surat). Tidak ikut tersimpan. */
  kop?: React.ReactNode;
  /** Isi tetap di bawah isi dokumen (mis. tanda tangan, tembusan). */
  kaki?: React.ReactNode;
  /** Tipe blok yang boleh disisipkan. Bawaan TIPE_DOKUMEN. */
  tipe?: TipeBlok[];
  /** Tampilan pratinjau sendiri (mis. LembarSurat berisi data uji). Bawaan: isi pada kertas apa adanya. */
  pratinjau?: (html: string) => React.ReactNode;
  /** Tombol simpan di bilah atas. */
  aksi?: (html: string, blok: Blok[]) => React.ReactNode;
  /** Isi tambahan panel Dokumen, ditaruh paling atas (mis. isian nama dan perihal templat). */
  panelDokumen?: React.ReactNode;
  status?: React.ReactNode;
  /** Tombol cetak (window.print) di bilah atas. */
  bisaCetak?: boolean;
  /** Panel samping terbuka saat awal (bawaan true). */
  panelAwal?: boolean;
  tinggi?: number | string;
  pilihMedia?: PilihMedia;
  unggah?: (file: File, opsi: OpsiPilihMedia) => Promise<MediaEditor>;
  sumberMedia?: SumberMedia;
  pola?: PolaBlok[];
  baca?: boolean;
  className?: string;
}

const NAMA_PENANDA = /^[a-z0-9_]{1,40}$/;

/**
 * Editor dokumen di atas kertas (A4/F4/Letter) untuk isi surat dan templat surat: kanvas blok yang sama dengan
 * editor berita, huruf dokumen, panel penanda `{{nama}}` yang disisipkan di posisi kursor, pengaturan blok, dan
 * pratinjau. Hasil `onChange` sudah disaring seperti `HtmlSanitizer` di SIAKAD, jadi bisa langsung dikirim ke
 * kolom `isi` di /v1/arsip/template atau surat.
 */
export function EditorDokumen({
  nilaiAwal,
  onChange,
  penanda,
  penandaBawaan,
  penandaBebas = true,
  kertas = 'a4',
  kop,
  kaki,
  tipe = TIPE_DOKUMEN,
  pratinjau: tampilPratinjau,
  aksi,
  panelDokumen,
  status,
  bisaCetak,
  panelAwal = true,
  tinggi,
  pilihMedia,
  unggah,
  sumberMedia,
  pola,
  baca,
  className,
}: EditorDokumenProps) {
  const awal = React.useMemo(() => {
    const b = typeof nilaiAwal === 'string' ? htmlKeBlok(nilaiAwal) : (nilaiAwal ?? []);
    return b.length ? b : [baru('paragraf')];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const r = useRiwayatBlok(awal);
  const [pilih, setPilih] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<'dokumen' | 'blok'>('dokumen');
  const [panel, setPanel] = React.useState(panelAwal);
  const [lihat, setLihat] = React.useState(false);
  const [baruNama, setBaruNama] = React.useState('');
  const kertasRef = React.useRef<HTMLDivElement>(null);

  const html = React.useMemo(() => htmlDokumen(r.blok), [r.blok]);
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const pertama = React.useRef(true);
  React.useEffect(() => {
    if (pertama.current) {
      pertama.current = false;
      return;
    }
    onChangeRef.current?.(html, r.blok);
  }, [html, r.blok]);


  const pakaiBawaan = penandaBawaan ?? Boolean(penanda);
  const dipakai = React.useMemo(() => penandaDi(html), [html]);
  const daftarPenanda = React.useMemo(() => {
    const ada = new Set<string>();
    const out: Array<PenandaTemplat & { grup: 'bawaan' | 'isian' }> = [];
    if (pakaiBawaan)
      for (const p of PENANDA_BAWAAN) {
        ada.add(p.nama);
        out.push({ ...p, grup: 'bawaan' });
      }
    for (const p of penanda ?? [])
      if (!ada.has(p.nama)) {
        ada.add(p.nama);
        out.push({ ...p, grup: p.bawaan ? 'bawaan' : 'isian' });
      }
    for (const n of dipakai)
      if (!ada.has(n)) {
        ada.add(n);
        out.push({ nama: n, label: n.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()), grup: 'isian' });
      }
    return out;
  }, [pakaiBawaan, penanda, dipakai]);
  const adaPanelPenanda = Boolean(penanda) || pakaiBawaan || penandaBebas;
  // Dengan panel penanda, tab Dokumen tetap terbuka saat mengetik supaya penanda bisa disisipkan di kursor.
  React.useEffect(() => {
    if (pilih && !adaPanelPenanda) setTab('blok');
  }, [pilih, adaPanelPenanda]);

  const sisipKaret = useSisipDiKaret(kertasRef);
  /** Sisipkan `{{nama}}` di posisi kursor; tanpa kursor di kertas, jadi paragraf baru di akhir. */
  const sisip = (nama: string) => {
    const teks = `{{${nama}}}`;
    if (!sisipKaret(teks)) r.set([...r.blok, baru('paragraf', { teks })]);
  };

  const tambahPenanda = () => {
    const n = baruNama.trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (!NAMA_PENANDA.test(n)) return;
    sisip(n);
    setBaruNama('');
  };

  const blokPilih = pilih ? cariBlok(r.blok, pilih) : null;
  const kata = hitungKata(r.blok);

  const chip = (p: PenandaTemplat & { grup: string }) => (
    <button
      key={p.nama}
      type="button"
      className="u-dok-penanda"
      data-dipakai={dipakai.includes(p.nama) || undefined}
      title={p.contoh ? `${p.label}, mis. ${p.contoh}` : p.label}
      disabled={baca || lihat}
      // mousedown + preventDefault: fokus tetap di teks yang sedang diketik, jadi penanda masuk di posisi kursor.
      onMouseDown={(e) => {
        e.preventDefault();
        sisip(p.nama);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          sisip(p.nama);
        }
      }}
    >
      <code>{`{{${p.nama}}}`}</code>
      <span>{p.label}</span>
    </button>
  );

  return (
    <div className={cn('u-eb-berita u-dok', className)} data-panel={panel || undefined} data-tinggi={tinggi !== undefined || undefined} style={tinggi !== undefined ? { height: tinggi } : undefined}>
      <div className="u-eb-atas" role="toolbar" aria-label="Alat editor dokumen">
        <div className="u-eb-atas-kiri">
          <Tooltip content="Urungkan" shortcut="Ctrl+Z">
            <Button variant="ghost" size="sm" iconOnly aria-label="Urungkan" onClick={r.urung} disabled={!r.bisaUrung || lihat || baca}>
              <Undo2 />
            </Button>
          </Tooltip>
          <Tooltip content="Ulangi" shortcut="Ctrl+Shift+Z">
            <Button variant="ghost" size="sm" iconOnly aria-label="Ulangi" onClick={r.ulang} disabled={!r.bisaUlang || lihat || baca}>
              <Redo2 />
            </Button>
          </Tooltip>
          <span className="u-eb-statistik">{kata} kata</span>
          {status && <span className="u-eb-status">{status}</span>}
        </div>
        <div className="u-eb-atas-kanan">
          <Button variant={lihat ? 'soft' : 'ghost'} size="sm" onClick={() => setLihat((x) => !x)} aria-pressed={lihat} aria-label={lihat ? 'Sunting' : 'Pratinjau'}>
            {lihat ? <PenLine /> : <Eye />}
            <span className="u-eb-label">{lihat ? 'Sunting' : 'Pratinjau'}</span>
          </Button>
          {bisaCetak && (
            <Tooltip content="Cetak">
              <Button variant="ghost" size="sm" iconOnly aria-label="Cetak" onClick={() => {
                  setLihat(true);
                  // Tunggu pratinjau tergambar dulu supaya yang tercetak kertasnya saja, tanpa alat editor.
                  requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
                }}>
                <Printer />
              </Button>
            </Tooltip>
          )}
          <Tooltip content={panel ? 'Tutup panel' : 'Buka panel'}>
            <Button variant={panel ? 'soft' : 'ghost'} size="sm" iconOnly aria-label="Panel pengaturan" aria-pressed={panel} onClick={() => setPanel((x) => !x)}>
              <PanelRight />
            </Button>
          </Tooltip>
          {aksi?.(html, r.blok)}
        </div>
      </div>

      <div className="u-eb-tubuh">
        <div className={cn('u-eb-lembar u-dok-meja', lihat && 'u-cetak-saja')}>
          {lihat && tampilPratinjau ? (
            tampilPratinjau(html)
          ) : (
            <div ref={kertasRef} className="u-dok-kertas" data-kertas={kertas}>
              {kop && <div className="u-dok-tetap">{kop}</div>}
              {lihat ? (
                <div className="ub-konten" dangerouslySetInnerHTML={{ __html: html }} />
              ) : (
                <EditorBlok blok={r.blok} set={r.set} urung={r.urung} ulang={r.ulang} pilih={pilih} setPilih={setPilih} pilihMedia={pilihMedia} unggah={unggah} sumberMedia={sumberMedia} pola={pola} tipe={tipe} baca={baca} />
              )}
              {kaki && <div className="u-dok-tetap">{kaki}</div>}
            </div>
          )}
        </div>

        {panel && (
          <aside className="u-eb-panel" aria-label="Pengaturan dokumen">
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
                blokPilih && !baca ? (
                  <PengaturanBlok b={blokPilih} ganti={(x) => r.set(ubahBlok(r.blok, x.id, () => x))} />
                ) : (
                  <p className="u-eb-redup">Pilih satu blok di kertas untuk melihat pengaturannya.</p>
                )
              ) : (
                <div className="u-eb-dokumen">
                  {panelDokumen}
                  {adaPanelPenanda && (
                    <section>
                      <h3 className="u-eb-panel-judul">
                        <Braces aria-hidden />
                        Penanda isian
                      </h3>
                      <p className="u-eb-redup">Klik untuk menyisipkan di posisi kursor. Saat surat dibuat, penanda diganti dengan datanya.</p>
                      {daftarPenanda.some((p) => p.grup === 'bawaan') && (
                        <>
                          <p className="u-dok-grup">Diisi otomatis</p>
                          <div className="u-dok-penanda-daftar">{daftarPenanda.filter((p) => p.grup === 'bawaan').map(chip)}</div>
                        </>
                      )}
                      {daftarPenanda.some((p) => p.grup === 'isian') && (
                        <>
                          <p className="u-dok-grup">Diisi saat membuat surat</p>
                          <div className="u-dok-penanda-daftar">{daftarPenanda.filter((p) => p.grup === 'isian').map(chip)}</div>
                        </>
                      )}
                      {penandaBebas && !baca && (
                        <form
                          className="u-dok-penanda-baru"
                          onSubmit={(e) => {
                            e.preventDefault();
                            tambahPenanda();
                          }}
                        >
                          <label className="u-sr-only" htmlFor="u-dok-penanda-baru">
                            Penanda baru
                          </label>
                          <input
                            id="u-dok-penanda-baru"
                            className="u-input"
                            value={baruNama}
                            placeholder="nama_mahasiswa"
                            onChange={(e) => setBaruNama(e.target.value)}
                            aria-invalid={baruNama !== '' && !NAMA_PENANDA.test(baruNama.trim().toLowerCase().replace(/[\s-]+/g, '_')) ? true : undefined}
                          />
                          <Button type="submit" variant="outline" size="sm" disabled={!baruNama.trim() || lihat}>
                            <Plus />
                            Sisipkan
                          </Button>
                        </form>
                      )}
                    </section>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
