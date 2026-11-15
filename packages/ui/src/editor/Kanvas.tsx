import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import {
  Bold, ChevronDown, ChevronUp, Code, Copy, GripVertical, Highlighter, Italic, Link2, MoreVertical, Plus, Trash2, Unlink,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { Menu } from '../components/overlays';
import { BISA_UBAH, RENDER, ubahTipe, type OpsBlok } from './blok';
import { useEditor } from './konteks';
import { Penyisip } from './Penyisip';
import { baru, DEF, salinBaru, type Blok } from './tipe';

const polos = (h: string) => h.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, '_');

/** Id elemen teks yang difokus untuk blok (butir daftar punya id sendiri). */
export function idFokus(b: Blok, akhir: boolean): string {
  if (b.tipe === 'daftar') return `${b.id}~${akhir ? Math.max(0, (b.data.item?.length ?? 1) - 1) : 0}`;
  return b.id;
}

/** Elemen contentEditable yang memuat seleksi saat ini. */
function editableAktif(): HTMLElement | null {
  const n = window.getSelection()?.anchorNode;
  const el = n ? (n.nodeType === 1 ? (n as HTMLElement) : n.parentElement) : null;
  return el?.closest('[contenteditable="true"]') ?? null;
}

function bungkusMark() {
  const sel = window.getSelection();
  const akar = editableAktif();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !akar) return;
  const r = sel.getRangeAt(0);
  const m = document.createElement('mark');
  m.appendChild(r.extractContents());
  r.insertNode(m);
  akar.dispatchEvent(new Event('input', { bubbles: true }));
}

function bungkusKode() {
  const sel = window.getSelection();
  const akar = editableAktif();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !akar) return;
  const r = sel.getRangeAt(0);
  const c = document.createElement('code');
  c.textContent = r.toString();
  r.deleteContents();
  r.insertNode(c);
  akar.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Tombol format teks sebaris + isian tautan. Tombol memakai onMouseDown agar seleksi tidak hilang. */
function FormatTeks() {
  const [tautan, setTautan] = useState<{ r: Range; url: string } | null>(null);
  const tombol = (label: string, Ikon: typeof Bold, aksi: () => void) => (
    <button key={label} type="button" title={label} aria-label={label} onMouseDown={(e) => { e.preventDefault(); aksi(); }}
      className="u-eb-tb"><Ikon aria-hidden /></button>
  );
  return (
    <>
      {tombol('Tebal (Ctrl+B)', Bold, () => document.execCommand('bold'))}
      {tombol('Miring (Ctrl+I)', Italic, () => document.execCommand('italic'))}
      {tombol('Tautan (Ctrl+K)', Link2, () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount && editableAktif()) setTautan({ r: sel.getRangeAt(0).cloneRange(), url: 'https://' });
      })}
      {tombol('Hapus tautan', Unlink, () => document.execCommand('unlink'))}
      {tombol('Sorot', Highlighter, bungkusMark)}
      {tombol('Kode sebaris', Code, bungkusKode)}
      {tautan && (
        <form className="u-eb-tautan-form"
          onSubmit={(e) => {
            e.preventDefault();
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(tautan.r);
            if (tautan.url.trim() && tautan.url !== 'https://') {
              if (tautan.r.collapsed) document.execCommand('insertHTML', false, `<a href="${tautan.url.replace(/"/g, '%22')}">${tautan.url.replace(/</g, '&lt;')}</a>`);
              else document.execCommand('createLink', false, tautan.url.trim());
            }
            setTautan(null);
          }}>
          <input autoFocus value={tautan.url} onChange={(e) => setTautan({ ...tautan, url: e.target.value })} onKeyDown={(e) => e.key === 'Escape' && setTautan(null)}
            className="u-input" data-size="sm" aria-label="Alamat tautan" />
          <button type="submit" className="u-btn" data-variant="primary" data-size="sm">Pasang</button>
        </form>
      )}
    </>
  );
}

interface PropsBilah {
  b: Blok;
  i: number;
  jumlah: number;
  pindah: (arah: -1 | 1) => void;
  ganti: (b: Blok) => void;
  duplikat: () => void;
  sisipSebelum: () => void;
  sisipSesudah: () => void;
  hapus: () => void;
  mulaiSeret: (e: DragEvent) => void;
}

/** Bilah alat blok terpilih: tipe, seret, naik/turun, format teks, menu lainnya. */
function BilahBlok({ b, i, jumlah, pindah, ganti, duplikat, sisipSebelum, sisipSesudah, hapus, mulaiSeret }: PropsBilah) {
  const D = DEF[b.tipe];
  const I = D.ikon;
  const teks = D.teks || ['daftar', 'sorotan', 'tabel', 'akordion'].includes(b.tipe);
  const bisaUbah = BISA_UBAH.includes(b.tipe);
  const kotak = 'u-eb-bilah-kotak';
  const tb = 'u-eb-tb';
  return (
    <div className="u-eb-bilah" contentEditable={false} onMouseDown={(e) => e.stopPropagation()}>
      <div className={kotak}>
        {bisaUbah ? (
          <Menu align="start" trigger={<button type="button" title={`${D.label}: ubah jenis blok`} aria-label={`${D.label}: ubah jenis blok`} className={tb}><I aria-hidden /></button>}
            items={BISA_UBAH.filter((t) => t !== b.tipe).map((t) => { const X = DEF[t].ikon; return { label: DEF[t].label, icon: <X />, onSelect: () => ganti(ubahTipe(b, t)) }; })} />
        ) : <span className={tb} title={D.label}><I aria-hidden /></span>}
        <span draggable onDragStart={mulaiSeret} title="Seret untuk memindah" className={cn(tb, 'u-eb-seret')}><GripVertical aria-hidden /></span>
        <span className="u-eb-naik-turun">
          <button type="button" disabled={i === 0} onClick={() => pindah(-1)} aria-label="Naikkan"><ChevronUp aria-hidden /></button>
          <button type="button" disabled={i === jumlah - 1} onClick={() => pindah(1)} aria-label="Turunkan"><ChevronDown aria-hidden /></button>
        </span>
      </div>
      {teks && <div className={cn(kotak, 'u-eb-format')}><FormatTeks /></div>}
      <div className={kotak}>
        <Menu trigger={<button type="button" className={tb} aria-label="Lainnya"><MoreVertical aria-hidden /></button>} items={[
          { label: 'Duplikat', icon: <Copy />, onSelect: duplikat },
          { label: 'Sisip blok sebelum', icon: <Plus />, onSelect: sisipSebelum },
          { label: 'Sisip blok sesudah', icon: <Plus />, onSelect: sisipSesudah },
          { type: 'separator' },
          { label: 'Hapus blok', icon: <Trash2 />, onSelect: hapus, destructive: true },
        ]} />
      </div>
    </div>
  );
}

/** Daftar blok yang bisa disunting. Dipakai untuk isi utama dan untuk tiap kolom blok Kolom. */
export function Kanvas({ daftar, ganti, dalamKolom }: { daftar: Blok[]; ganti: (d: Blok[]) => void; dalamKolom?: boolean }) {
  const { pilih, setPilih, setFokus, baca } = useEditor();
  const [penyisip, setPenyisip] = useState<{ i: number; el: HTMLElement } | null>(null);
  const [seret, setSeret] = useState<{ dari: number; ke: number } | null>(null);
  const akhirRef = useRef<HTMLButtonElement>(null);

  const fokuskan = (b: Blok, akhir: boolean) => {
    setPilih(b.id);
    if (DEF[b.tipe].teks || b.tipe === 'daftar') setFokus({ id: idFokus(b, akhir), di: akhir ? 'akhir' : 'awal' });
  };

  const sisip = (i: number, bs: Blok[], fokusKe = 0) => {
    const n = [...daftar];
    n.splice(i, 0, ...bs);
    ganti(n);
    if (bs[fokusKe]) fokuskan(bs[fokusKe], true);
  };

  const hapus = (i: number) => {
    const n = daftar.filter((_, j) => j !== i);
    ganti(n.length || dalamKolom ? n : [baru('paragraf')]);
    const sebelum = n[i - 1] ?? n[0];
    if (sebelum) fokuskan(sebelum, true);
    else setPilih(null);
  };

  const pindah = (i: number, a: -1 | 1) => {
    const j = i + a;
    if (j < 0 || j >= daftar.length) return;
    const n = [...daftar];
    [n[i], n[j]] = [n[j], n[i]];
    ganti(n);
  };

  const opsUntuk = (i: number): OpsBlok => ({
    pecah: (s, d) => {
      const b = daftar[i];
      const p = baru('paragraf', { teks: d });
      const n = [...daftar];
      n.splice(i, 1, { ...b, data: { ...b.data, teks: s } }, p);
      ganti(n);
      setPilih(p.id);
      setFokus({ id: p.id, di: 'awal' });
    },
    gabungAtas: (html) => {
      const b = daftar[i];
      const prev = daftar[i - 1];
      if (!prev) {
        if (b.tipe !== 'paragraf' && DEF[b.tipe].teks) ganti(daftar.map((x, j) => (j === i ? ubahTipe(b, 'paragraf') : x)));
        else if (!html && daftar.length > 1) hapus(i);
        return;
      }
      const n = daftar.filter((_, j) => j !== i);
      if (DEF[prev.tipe].teks && typeof prev.data.teks === 'string') {
        const pos = polos(prev.data.teks).length;
        n[i - 1] = { ...prev, data: { ...prev.data, teks: prev.data.teks + html } };
        ganti(n);
        setPilih(prev.id);
        setFokus({ id: prev.id, di: pos });
      } else if (prev.tipe === 'daftar') {
        const item: string[] = [...(prev.data.item ?? [''])];
        const pos = polos(item[item.length - 1] ?? '').length;
        item[item.length - 1] = (item[item.length - 1] ?? '') + html;
        n[i - 1] = { ...prev, data: { ...prev.data, item } };
        ganti(n);
        setPilih(prev.id);
        setFokus({ id: `${prev.id}~${item.length - 1}`, di: pos });
      } else if (!html) {
        ganti(n);
        setPilih(prev.id);
      } else setPilih(prev.id);
    },
    panah: (a) => {
      const t = daftar[i + a];
      if (t) fokuskan(t, a < 0);
    },
    ubahJadi: (bs, fokusKe = 0) => {
      const n = [...daftar];
      n.splice(i, 1, ...bs);
      ganti(n);
      if (bs[fokusKe]) fokuskan(bs[fokusKe], true);
    },
    sisipSesudah: (b) => sisip(i + 1, [b]),
    hapus: () => hapus(i),
  });

  const lepas = (e: DragEvent) => {
    if (!seret) return;
    e.preventDefault();
    const { dari, ke } = seret;
    setSeret(null);
    if (ke === dari || ke === dari + 1) return;
    const n = [...daftar];
    const [b] = n.splice(dari, 1);
    n.splice(ke > dari ? ke - 1 : ke, 0, b);
    ganti(n);
  };

  return (
    <div className={cn('u-eb-kanvas', dalamKolom && 'u-eb-kanvas-kolom')} onDragOver={(e) => seret && e.preventDefault()} onDrop={lepas}>
      {daftar.map((b, i) => {
        const R = RENDER[b.tipe];
        const terpilih = pilih === b.id && !baca;
        const garisSeret = seret && seret.ke === i && seret.dari !== i && seret.dari !== i - 1;
        return (
          <div key={b.id} data-blok={b.id} tabIndex={-1}
            className="u-eb-blok"
            data-terpilih={terpilih || undefined}
            data-baca={baca || undefined}
            data-diseret={seret?.dari === i || undefined}
            onMouseDown={(e) => { e.stopPropagation(); if (pilih !== b.id) setPilih(b.id); }}
            onFocus={(e) => { e.stopPropagation(); if (pilih !== b.id) setPilih(b.id); }}
            onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); hapus(i); }
              if (e.key === 'Enter') { e.preventDefault(); sisip(i + 1, [baru('paragraf')]); }
            }}
            onDragOver={(e) => {
              if (!seret) return;
              e.preventDefault();
              e.stopPropagation();
              const r = e.currentTarget.getBoundingClientRect();
              const ke = e.clientY < r.top + r.height / 2 ? i : i + 1;
              if (ke !== seret.ke) setSeret({ ...seret, ke });
            }}
            onDragEnd={() => setSeret(null)}>
            {garisSeret && <div className="u-eb-garis-seret" data-posisi="atas" />}
            {i === daftar.length - 1 && seret && seret.ke === daftar.length && seret.dari !== i && <div className="u-eb-garis-seret" data-posisi="bawah" />}
            {terpilih && (
              <BilahBlok b={b} i={i} jumlah={daftar.length} pindah={(a) => pindah(i, a)}
                ganti={(x) => { ganti(daftar.map((y, j) => (j === i ? x : y))); fokuskan(x, true); }}
                duplikat={() => sisip(i + 1, [salinBaru(b)])}
                sisipSebelum={() => sisip(i, [baru('paragraf')])}
                sisipSesudah={() => sisip(i + 1, [baru('paragraf')])}
                hapus={() => hapus(i)}
                mulaiSeret={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', b.id);
                  const el = (e.currentTarget as HTMLElement).closest('[data-blok]');
                  if (el) e.dataTransfer.setDragImage(el, 20, 20);
                  setSeret({ dari: i, ke: i });
                }} />
            )}
            <R b={b} terpilih={terpilih} ops={opsUntuk(i)}
              ubah={(d) => ganti(daftar.map((x, j) => (j === i ? { ...x, data: { ...x.data, ...d } } : x)))}
              ganti={(x) => ganti(daftar.map((y, j) => (j === i ? x : y)))} />
            {!baca && (
              <button type="button" aria-label="Sisipkan blok di sini" title="Sisipkan blok"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => setPenyisip({ i: i + 1, el: e.currentTarget })}
                className="u-eb-sisip-antara">
                <Plus aria-hidden />
              </button>
            )}
          </div>
        );
      })}
      {!baca && (
        <button ref={akhirRef} type="button" onClick={(e) => {
          const akhir = daftar[daftar.length - 1];
          if (!dalamKolom && akhir?.tipe === 'paragraf' && !akhir.data.teks) setPenyisip({ i: daftar.length, el: e.currentTarget });
          else sisip(daftar.length, [baru('paragraf')]);
        }}
          className="u-eb-tambah-akhir" data-kolom={dalamKolom || undefined}>
          <Plus aria-hidden />{dalamKolom ? 'Blok' : 'Tambah blok (atau ketik / di paragraf kosong)'}
        </button>
      )}
      {penyisip && (
        <Penyisip jangkar={penyisip.el} tanpaKolom={dalamKolom} tutup={() => setPenyisip(null)} pilih={(bs) => {
          const i = penyisip.i;
          setPenyisip(null);
          const akhir = daftar[i - 1];
          // Ganti paragraf kosong di posisi itu daripada menyisakan baris kosong.
          if (akhir && akhir.tipe === 'paragraf' && !akhir.data.teks && i === daftar.length) {
            const n = [...daftar];
            n.splice(i - 1, 1, ...bs);
            ganti(n);
            fokuskan(bs[0], true);
          } else sisip(i, bs);
        }} />
      )}
    </div>
  );
}
