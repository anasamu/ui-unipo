import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useEditor } from '../konteks';
import { MenuGaris, saringTipe } from '../Penyisip';
import { TeksSebaris } from '../TeksSebaris';
import { baru, type TipeBlok } from '../tipe';
import type { PropsBlok } from './props';

const polosDari = (h: string) => h.replace(/<[^>]+>/g, '').replace(/&nbsp;| /g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const kelasRata = (r?: string) => (r === 'tengah' ? 'ub-rata-tengah' : r === 'kanan' ? 'ub-rata-kanan' : '');

/** Pintasan ala Markdown di awal paragraf. */
const PINTASAN: [RegExp, TipeBlok, Record<string, unknown>][] = [
  [/^####\s/, 'judul', { tingkat: 4 }],
  [/^###\s/, 'judul', { tingkat: 3 }],
  [/^##?\s/, 'judul', { tingkat: 2 }],
  [/^[-*]\s/, 'daftar', { gaya: 'ul' }],
  [/^1[.)]\s/, 'daftar', { gaya: 'ol' }],
  [/^>\s/, 'kutipan', {}],
];

export function Paragraf({ b, ubah, ops }: PropsBlok) {
  const teks: string = b.data.teks ?? '';
  const polos = polosDari(teks);
  const garis = /^\/[\p{L}\d-]{0,24}$/u.test(polos) ? polos.slice(1) : null;
  const { tipe: boleh } = useEditor();
  const tipe = garis !== null ? saringTipe(garis, boleh) : [];
  const [aktif, setAktif] = useState(0);
  useEffect(() => setAktif(0), [garis]);

  const jadi = (t: TipeBlok) => ops.ubahJadi([baru(t)]);

  const ganti = (h: string) => {
    const p = polosDari(h);
    for (const [re, t, d] of PINTASAN) {
      if (re.test(p)) {
        const sisa = h.replace(/^(#{1,4}|[-*]|1[.)]|>|&gt;)(\s|&nbsp;)/, '');
        ops.ubahJadi([baru(t, t === 'daftar' ? { ...d, item: [sisa] } : { ...d, teks: sisa })]);
        return;
      }
    }
    if (p.trim() === '---') {
      ops.ubahJadi([baru('pemisah'), baru('paragraf')], 1);
      return;
    }
    ubah({ teks: h });
  };

  const kunci = (e: KeyboardEvent<HTMLElement>) => {
    if (garis === null || tipe.length === 0) return false;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = Math.min(tipe.length, 8);
      setAktif((a) => (a + (e.key === 'ArrowDown' ? 1 : n - 1)) % n);
      return true;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      jadi(tipe[aktif]);
      return true;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      ubah({ teks: '' });
      return true;
    }
    return false;
  };

  return (
    <div className="u-eb-relatif">
      <TeksSebaris idFokus={b.id} tag="p" nilai={teks} ganti={ganti} placeholder="Ketik teks, atau / untuk memilih blok" label="Paragraf"
        className={cn('ub-paragraf', b.data.besar && 'ub-pembuka', kelasRata(b.data.rata))} pecah={ops.pecah} hapusAwal={ops.gabungAtas} panah={ops.panah} kunci={kunci} />
      {garis !== null && <MenuGaris tipe={tipe} aktif={aktif} pilih={jadi} />}
    </div>
  );
}

export function Judul({ b, ubah, ops }: PropsBlok) {
  const t = Math.max(2, Math.min(4, Number(b.data.tingkat) || 2)) as 2 | 3 | 4;
  return (
    <TeksSebaris idFokus={b.id} tag={`h${t}`} nilai={b.data.teks ?? ''} ganti={(h) => ubah({ teks: h })} placeholder={`Judul H${t}`}
      className={cn('ub-judul', kelasRata(b.data.rata))} pecah={(s, d) => ops.pecah(s, d)} hapusAwal={ops.gabungAtas} panah={ops.panah} />
  );
}

export function Daftar({ b, ubah, ops }: PropsBlok) {
  const item: string[] = Array.isArray(b.data.item) && b.data.item.length ? b.data.item : [''];
  const { setFokus } = useEditor();
  const Tag = b.data.gaya === 'ol' ? 'ol' : 'ul';
  const set = (i: number, h: string) => ubah({ item: item.map((x, j) => (j === i ? h : x)) });
  const idItem = (i: number) => `${b.id}~${i}`;

  return (
    <Tag className="ub-daftar">
      {item.map((x, i) => (
        <TeksSebaris key={i} idFokus={idItem(i)} tag="li" nilai={x} ganti={(h) => set(i, h)} placeholder="Butir daftar"
          pecah={(sebelum, sesudah) => {
            if (!sebelum && !sesudah && i === item.length - 1) {
              // Enter di butir kosong terakhir: keluar dari daftar.
              const sisa = item.slice(0, -1);
              ops.ubahJadi(sisa.length ? [{ ...b, data: { ...b.data, item: sisa } }, baru('paragraf')] : [baru('paragraf')], sisa.length ? 1 : 0);
              return;
            }
            ubah({ item: [...item.slice(0, i), sebelum, sesudah, ...item.slice(i + 1)] });
            setFokus({ id: idItem(i + 1), di: 'awal' });
          }}
          hapusAwal={(h) => {
            if (i === 0) {
              if (item.length === 1) ops.ubahJadi([baru('paragraf', { teks: h })]);
              else ops.gabungAtas('');
              return;
            }
            const posisi = polosDari(item[i - 1]).length;
            ubah({ item: [...item.slice(0, i - 1), item[i - 1] + h, ...item.slice(i + 1)] });
            setFokus({ id: idItem(i - 1), di: posisi });
          }}
          panah={(a) => {
            const j = i + a;
            if (j < 0 || j >= item.length) ops.panah(a);
            else setFokus({ id: idItem(j), di: a < 0 ? 'akhir' : 'awal' });
          }}
        />
      ))}
    </Tag>
  );
}

export function Kutipan({ b, ubah, ops }: PropsBlok) {
  return (
    <blockquote className={cn('ub-kutipan', b.data.gaya === 'sorot' && 'ub-kutipan-sorot')}>
      <TeksSebaris idFokus={b.id} tag="p" nilai={b.data.teks ?? ''} ganti={(h) => ubah({ teks: h })} placeholder="Tulis kutipan" pecah={ops.pecah} hapusAwal={ops.gabungAtas} panah={ops.panah} />
      <TeksSebaris tag="cite" polos nilai={b.data.sumber ?? ''} ganti={(h) => ubah({ sumber: h })} placeholder="Nama narasumber, jabatan" className="ub-kutipan-sumber" />
    </blockquote>
  );
}

export function Kode({ b, ubah }: PropsBlok) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [b.data.teks]);
  return (
    <pre className="ub-kode"><textarea ref={ref} value={b.data.teks ?? ''} onChange={(e) => ubah({ teks: e.target.value })} spellCheck={false} placeholder="Tulis kode atau teks apa adanya"
      className="u-eb-kode-isian" rows={3} /></pre>
  );
}

const IKON_SOROTAN: Record<string, string> = { info: 'Info', sukses: 'Berhasil', peringatan: 'Perhatian', bahaya: 'Penting' };

export function Sorotan({ b, ubah }: PropsBlok) {
  const gaya = ['sukses', 'peringatan', 'bahaya'].includes(b.data.gaya) ? b.data.gaya : 'info';
  return (
    <div className={`ub-sorotan ub-sorotan-${gaya}`}>
      <TeksSebaris tag="span" polos nilai={b.data.judul ?? ''} ganti={(h) => ubah({ judul: h })} placeholder={`Judul (mis. ${IKON_SOROTAN[gaya]})`} className="ub-sorotan-judul" />
      <TeksSebaris idFokus={b.id} tag="div" banyakBaris nilai={b.data.teks ?? ''} ganti={(h) => ubah({ teks: h })} placeholder="Isi catatan" className="ub-sorotan-isi" />
    </div>
  );
}

export function Akordion({ b, ubah }: PropsBlok) {
  const item: { judul: string; isi: string }[] = Array.isArray(b.data.item) ? b.data.item : [];
  const set = (i: number, d: Partial<{ judul: string; isi: string }>) => ubah({ item: item.map((x, j) => (j === i ? { ...x, ...d } : x)) });
  return (
    <div className="ub-akordion">
      {item.map((x, i) => (
        <div key={i} className="ub-akordion-item u-eb-akordion-item" data-buka="">
          <TeksSebaris tag="div" polos nilai={x.judul} ganti={(h) => set(i, { judul: h })} placeholder="Pertanyaan atau judul" className="ub-akordion-judul" idFokus={i === 0 ? b.id : undefined} />
          <TeksSebaris tag="div" banyakBaris nilai={x.isi} ganti={(h) => set(i, { isi: h })} placeholder="Jawaban atau isi" className="u-eb-akordion-isi" />
          {item.length > 1 && (
            <button type="button" onClick={() => ubah({ item: item.filter((_, j) => j !== i) })} className="u-eb-hapus-butir">Hapus</button>
          )}
        </div>
      ))}
      <button type="button" onClick={() => ubah({ item: [...item, { judul: '', isi: '' }] })} className="u-eb-tautan-aksi"><Plus aria-hidden />Tambah butir</button>
    </div>
  );
}
