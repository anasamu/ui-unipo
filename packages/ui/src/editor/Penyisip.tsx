import * as React from 'react';
import { createPortal } from 'react-dom';
import { LayoutTemplate, Search } from 'lucide-react';
import { cn } from '../lib/cn';
import { useEditor, type PolaBlok } from './konteks';
import { baru, DEF, rapikan, salinBaru, URUTAN_GRUP, type Blok, type TipeBlok } from './tipe';

const SEMUA = Object.keys(DEF) as TipeBlok[];

/** Saring tipe blok dari kata pencarian (label, kata kunci, deskripsi). */
export function saringTipe(q: string, tipe: TipeBlok[] = SEMUA): TipeBlok[] {
  const k = q.trim().toLowerCase();
  if (!k) return tipe;
  return tipe
    .map((t) => {
      const d = DEF[t];
      const label = d.label.toLowerCase();
      const skor = label.startsWith(k) ? 3 : label.includes(k) ? 2 : `${d.kunci ?? ''} ${d.deskripsi}`.toLowerCase().includes(k) ? 1 : 0;
      return { t, skor };
    })
    .filter((x) => x.skor > 0)
    .sort((a, b) => b.skor - a.skor)
    .map((x) => x.t);
}

/** Isi pola siap disisipkan (id baru). */
export const blokPola = (p: PolaBlok): Blok[] => rapikan(p.blok).map(salinBaru);

/** Popover penyisip: tab Blok (cari + kisi per grup) dan tab Pola. Posisi di bawah elemen jangkar. */
export function Penyisip({ jangkar, pilih, tutup, tanpaKolom }: { jangkar: HTMLElement | null; pilih: (b: Blok[]) => void; tutup: () => void; tanpaKolom?: boolean }) {
  const { pola, tipe: boleh } = useEditor();
  const [tab, setTab] = React.useState<'blok' | 'pola'>('blok');
  const [q, setQ] = React.useState('');
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });

  React.useLayoutEffect(() => {
    const r = jangkar?.getBoundingClientRect();
    if (!r) return;
    const lebar = Math.min(352, window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.left + r.width / 2 - lebar / 2, window.innerWidth - lebar - 8));
    const bawah = window.innerHeight - r.bottom;
    setPos({ top: bawah > 380 ? r.bottom + 6 : Math.max(8, r.top - 386), left });
  }, [jangkar]);

  React.useEffect(() => {
    const klik = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !jangkar?.contains(e.target as Node)) tutup();
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && tutup();
    document.addEventListener('mousedown', klik);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', klik);
      document.removeEventListener('keydown', esc);
    };
  }, [jangkar, tutup]);

  const dasar = boleh ?? SEMUA;
  const tipe = saringTipe(q, tanpaKolom ? dasar.filter((t) => t !== 'kolom') : dasar);
  const grupPola = React.useMemo(() => {
    const m = new Map<string, PolaBlok[]>();
    (pola ?? []).filter((p) => !q || `${p.nama} ${p.kategori}`.toLowerCase().includes(q.toLowerCase())).forEach((p) => m.set(p.kategori, [...(m.get(p.kategori) ?? []), p]));
    return [...m.entries()];
  }, [pola, q]);

  return createPortal(
    <div ref={ref} style={{ top: pos.top, left: pos.left }} className="u-eb-penyisip" role="dialog" aria-label="Sisipkan blok">
      <div className="u-eb-penyisip-cari">
        <Search aria-hidden />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={pola ? 'Cari blok atau pola' : 'Cari blok'}
          aria-label="Cari blok"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && tab === 'blok' && tipe[0]) {
              e.preventDefault();
              pilih([baru(tipe[0])]);
            }
          }}
        />
      </div>
      {pola && (
        <div className="u-eb-penyisip-tab" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'blok'} onClick={() => setTab('blok')}>
            Blok
          </button>
          <button type="button" role="tab" aria-selected={tab === 'pola'} onClick={() => setTab('pola')}>
            <LayoutTemplate aria-hidden />
            Pola <span className="u-eb-jumlah">{pola.length}</span>
          </button>
        </div>
      )}
      <div className="u-eb-penyisip-isi">
        {tab === 'blok' &&
          (tipe.length === 0 ? (
            <p className="u-eb-kosong">Tidak ada blok “{q}”.</p>
          ) : q ? (
            <div className="u-eb-kisi-tipe">
              {tipe.map((t) => (
                <TombolTipe key={t} t={t} klik={() => pilih([baru(t)])} />
              ))}
            </div>
          ) : (
            URUTAN_GRUP.map((g) => {
              const isi = tipe.filter((t) => DEF[t].grup === g);
              return isi.length === 0 ? null : (
                <div key={g} className="u-eb-grup">
                  <p className="u-eb-grup-judul">{g}</p>
                  <div className="u-eb-kisi-tipe">
                    {isi.map((t) => (
                      <TombolTipe key={t} t={t} klik={() => pilih([baru(t)])} />
                    ))}
                  </div>
                </div>
              );
            })
          ))}
        {tab === 'pola' &&
          (grupPola.length === 0 ? (
            <p className="u-eb-kosong">Belum ada pola. Simpan tulisan sebagai pola dari menu editor.</p>
          ) : (
            grupPola.map(([kat, daftar]) => (
              <div key={kat} className="u-eb-grup">
                <p className="u-eb-grup-judul">{kat}</p>
                {daftar.map((p) => (
                  <button key={p.id} type="button" className="u-eb-pola" onClick={() => pilih(blokPola(p))}>
                    <strong>{p.nama}</strong>
                    {p.deskripsi && <span>{p.deskripsi}</span>}
                  </button>
                ))}
              </div>
            ))
          ))}
      </div>
    </div>,
    document.body,
  );
}

function TombolTipe({ t, klik }: { t: TipeBlok; klik: () => void }) {
  const d = DEF[t];
  const I = d.ikon;
  return (
    <button type="button" onClick={klik} title={d.deskripsi} className="u-eb-tipe">
      <I aria-hidden />
      {d.label}
    </button>
  );
}

/** Menu garis miring: daftar tipe hasil saring dengan sorotan aktif (navigasi diatur paragraf). */
export function MenuGaris({ tipe, aktif, pilih }: { tipe: TipeBlok[]; aktif: number; pilih: (t: TipeBlok) => void }) {
  if (tipe.length === 0) return null;
  return (
    <div className="u-eb-menu-garis" role="listbox" contentEditable={false}>
      {tipe.slice(0, 8).map((t, i) => {
        const d = DEF[t];
        const I = d.ikon;
        return (
          <button
            key={t}
            type="button"
            role="option"
            aria-selected={i === aktif}
            className={cn('u-eb-menu-garis-item')}
            onMouseDown={(e) => {
              e.preventDefault();
              pilih(t);
            }}
          >
            <span className="u-eb-menu-garis-ikon">
              <I aria-hidden />
            </span>
            <span>
              <strong>{d.label}</strong>
              <small>{d.deskripsi}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}
