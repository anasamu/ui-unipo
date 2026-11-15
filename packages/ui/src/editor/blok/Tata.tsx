import { Columns2, Plus, Rows2, Trash2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Kanvas } from '../Kanvas';
import { TeksSebaris } from '../TeksSebaris';
import { baru, RASIO, type Blok } from '../tipe';
import type { PropsBlok } from './props';

interface DataTombol { label: string; url: string; gaya: 'utama' | 'garis' }

export function TombolBlok({ b, ubah, terpilih }: PropsBlok) {
  const tombol: DataTombol[] = Array.isArray(b.data.tombol) ? b.data.tombol : [];
  const set = (i: number, d: Partial<DataTombol>) => ubah({ tombol: tombol.map((x, j) => (j === i ? { ...x, ...d } : x)) });
  const rata = b.data.rata === 'tengah' ? ' ub-rata-tengah' : b.data.rata === 'kanan' ? ' ub-rata-kanan' : '';
  return (
    <div>
      <div className={`ub-tombol-grup${rata}`}>
        {tombol.map((t, i) => (
          <span key={i} className={`ub-tombol ub-tombol-${t.gaya === 'garis' ? 'garis' : 'utama'}`}>
            <TeksSebaris tag="span" polos nilai={t.label} ganti={(h) => set(i, { label: h })} placeholder="Label tombol" />
          </span>
        ))}
      </div>
      {terpilih && (
        <div className="u-eb-tombol-atur" contentEditable={false}>
          {tombol.map((t, i) => (
            <div key={i} className="u-eb-tombol-baris">
              <input value={t.url} onChange={(e) => set(i, { url: e.target.value })} placeholder="https://… atau /pmb" aria-label={`Tautan tombol ${i + 1}`}
                className="u-input" data-size="sm" />
              <select value={t.gaya} onChange={(e) => set(i, { gaya: e.target.value as DataTombol['gaya'] })} aria-label="Gaya" className="u-eb-pilih">
                <option value="utama">Penuh</option><option value="garis">Garis</option>
              </select>
              {tombol.length > 1 && <button type="button" onClick={() => ubah({ tombol: tombol.filter((_, j) => j !== i) })} className="u-eb-ikon-hapus" aria-label="Hapus tombol"><Trash2 aria-hidden /></button>}
            </div>
          ))}
          <button type="button" onClick={() => ubah({ tombol: [...tombol, { label: 'Tombol', url: '', gaya: 'garis' }] })} className="u-eb-tautan-aksi">+ Tombol lain</button>
        </div>
      )}
    </div>
  );
}

export function Pemisah({ b }: PropsBlok) {
  return <hr className={cn('ub-pemisah', b.data.gaya === 'titik' && 'ub-pemisah-titik')} />;
}

export function Spasi({ b }: PropsBlok) {
  const u = ['kecil', 'besar'].includes(b.data.ukuran) ? b.data.ukuran : 'sedang';
  return <div className={`ub-spasi ub-spasi-${u} u-eb-spasi`} aria-label={`Spasi ${u}`} />;
}

export function Kolom({ b, ganti }: PropsBlok) {
  const rasio = b.data.rasio in RASIO ? b.data.rasio : '50-50';
  const anak = b.anak ?? [];
  return (
    <div className={`ub-kolom-grup ub-rasio-${rasio}`}>
      {anak.map((k, i) => (
        <div key={i} className="ub-kolom u-eb-kolom">
          <Kanvas daftar={k} ganti={(baruK: Blok[]) => ganti({ ...b, anak: anak.map((x, j) => (j === i ? (baruK.length ? baruK : [baru('paragraf')]) : x)) })} dalamKolom />
        </div>
      ))}
    </div>
  );
}

/** Ubah jumlah kolom sesuai rasio baru; isi kolom yang dibuang digabung ke kolom terakhir. */
export function aturRasio(b: Blok, rasio: string): Blok {
  const n = RASIO[rasio] ?? 2;
  const lama = b.anak ?? [];
  let anak = lama.slice(0, n);
  if (lama.length > n) anak[n - 1] = [...anak[n - 1], ...lama.slice(n).flat()];
  while (anak.length < n) anak = [...anak, [baru('paragraf')]];
  return { ...b, data: { ...b.data, rasio }, anak };
}

export function Tabel({ b, ubah, terpilih }: PropsBlok) {
  const baris: string[][] = Array.isArray(b.data.baris) && b.data.baris.length ? b.data.baris : [['']];
  const lebar = Math.max(...baris.map((r) => r.length));
  const set = (i: number, j: number, v: string) => ubah({ baris: baris.map((r, a) => (a === i ? Array.from({ length: lebar }, (_, c) => (c === j ? v : r[c] ?? '')) : r)) });
  const tambahBaris = () => ubah({ baris: [...baris, Array(lebar).fill('')] });
  const tambahKolom = () => ubah({ baris: baris.map((r) => [...r, ...Array(lebar - r.length + 1).fill('')]) });
  const kepala = !!b.data.kepala;
  return (
    <figure className="ub-tabel">
      <table>
        <tbody>
          {baris.map((r, i) => (
            <tr key={i} className="u-eb-tr">
              {Array.from({ length: lebar }, (_, j) => {
                const Sel = kepala && i === 0 ? 'th' : 'td';
                return (
                  <Sel key={j}>
                    <TeksSebaris tag="div" nilai={r[j] ?? ''} ganti={(h) => set(i, j, h)} placeholder={kepala && i === 0 ? 'Judul' : ''} />
                  </Sel>
                );
              })}
              {terpilih && baris.length > 1 && (
                <td className="u-eb-td-aksi" contentEditable={false}>
                  <button type="button" onClick={() => ubah({ baris: baris.filter((_, a) => a !== i) })} className="u-eb-ikon-hapus" aria-label="Hapus baris"><Trash2 aria-hidden /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <TeksSebaris tag="figcaption" nilai={b.data.keterangan ?? ''} ganti={(h) => ubah({ keterangan: h })} placeholder="Keterangan tabel (opsional)" />
      {terpilih && (
        <div className="u-eb-tabel-aksi" contentEditable={false}>
          <button type="button" onClick={tambahBaris} className="u-eb-tautan-aksi"><Rows2 aria-hidden />Baris</button>
          <button type="button" onClick={tambahKolom} className="u-eb-tautan-aksi"><Columns2 aria-hidden />Kolom</button>
          {lebar > 1 && <button type="button" onClick={() => ubah({ baris: baris.map((r) => r.slice(0, lebar - 1)) })} className="u-eb-tautan-aksi" data-bahaya=""><Plus aria-hidden style={{ rotate: '45deg' }} />Kolom terakhir</button>}
        </div>
      )}
    </figure>
  );
}
