import { useState, type ReactNode } from 'react';
import { FileDown, Film, Image as IkonGambar, Images, Link2, MapPin, Upload, X } from 'lucide-react';
import { Button } from '../../components/actions';
import { formatBytes } from '../../lib/format';
import { useEditor } from '../konteks';
import { TeksSebaris } from '../TeksSebaris';
import type { PropsBlok } from './props';

/** Kotak kosong blok media: judul, petunjuk, tombol pustaka, dan isian URL. */
export function Penampung({ ikon, judul, petunjuk, aksi, url, placeholderUrl = 'Tempel URL lalu Enter' }: { ikon: ReactNode; judul: string; petunjuk: string; aksi?: ReactNode; url?: (u: string) => void; placeholderUrl?: string }) {
  const [isi, setIsi] = useState('');
  const [tampilUrl, setTampilUrl] = useState(!aksi);
  return (
    <div className="u-eb-penampung" contentEditable={false}>
      <p className="u-eb-penampung-judul">{ikon}{judul}</p>
      <p className="u-eb-penampung-petunjuk">{petunjuk}</p>
      <div className="u-eb-penampung-aksi">
        {aksi}
        {url && aksi && !tampilUrl && <Button variant="outline" size="sm" onClick={() => setTampilUrl(true)}><Link2 aria-hidden />Dari URL</Button>}
      </div>
      {url && tampilUrl && (
        <form className="u-eb-penampung-url" onSubmit={(e) => { e.preventDefault(); if (isi.trim()) url(isi.trim()); }}>
          <input value={isi} onChange={(e) => setIsi(e.target.value)} placeholder={placeholderUrl} autoFocus={!!aksi}
            className="u-input" aria-label="URL" />
          <Button size="sm" type="submit">Pasang</Button>
        </form>
      )}
    </div>
  );
}

export function Gambar({ b, ubah }: PropsBlok) {
  const { pilihMedia } = useEditor();
  const ambil = async () => {
    const m = (await pilihMedia({ jenis: 'gambar' }))?.[0];
    if (m) ubah({ url: m.url, media_id: m.id, alt: b.data.alt || m.alt || m.judul || '' });
  };
  if (!b.data.url) {
    return <Penampung ikon={<IkonGambar aria-hidden />} judul="Gambar" petunjuk="Unggah foto, pilih dari pustaka media, atau tempel URL. JPG/PNG/WebP, lebar ideal 1600 px."
      aksi={<Button size="sm" onClick={() => void ambil()}><Upload aria-hidden />Pilih gambar</Button>} url={(u) => ubah({ url: u })} />;
  }
  const lebar = ['lebar', 'penuh'].includes(b.data.lebar) ? ` ub-lebar-${b.data.lebar}` : '';
  return (
    <figure className={`ub-gambar${lebar}`}>
      <img src={b.data.url} alt={b.data.alt ?? ''} />
      <TeksSebaris tag="figcaption" nilai={b.data.keterangan ?? ''} ganti={(h) => ubah({ keterangan: h })} placeholder="Tambahkan keterangan foto" />
    </figure>
  );
}

export function Galeri({ b, ubah }: PropsBlok) {
  const { pilihMedia } = useEditor();
  const gambar: { url: string; alt?: string; keterangan?: string; media_id?: number | string }[] = Array.isArray(b.data.gambar) ? b.data.gambar : [];
  const tambah = async () => {
    const m = await pilihMedia({ jenis: 'gambar', banyak: true });
    if (m?.length) ubah({ gambar: [...gambar, ...m.map((x) => ({ url: x.url, alt: x.alt ?? x.judul ?? '', keterangan: '', media_id: x.id }))] });
  };
  if (gambar.length === 0) {
    return <Penampung ikon={<Images aria-hidden />} judul="Galeri" petunjuk="Pilih beberapa foto sekaligus dari pustaka media." aksi={<Button size="sm" onClick={() => void tambah()}><Upload aria-hidden />Pilih foto</Button>} />;
  }
  const kolom = Math.max(2, Math.min(4, Number(b.data.kolom) || 3));
  return (
    <div>
      <div className={`ub-galeri ub-kolom-${kolom}`}>
        {gambar.map((g, i) => (
          <figure key={`${g.url}-${i}`} className="ub-galeri-item u-eb-galeri-item">
            <img src={g.url} alt={g.alt ?? ''} />
            <button type="button" aria-label="Buang foto" onClick={() => ubah({ gambar: gambar.filter((_, j) => j !== i) })}
              className="u-eb-buang-foto"><X aria-hidden /></button>
            <TeksSebaris tag="figcaption" polos nilai={g.keterangan ?? ''} ganti={(h) => ubah({ gambar: gambar.map((x, j) => (j === i ? { ...x, keterangan: h } : x)) })} placeholder="Keterangan" />
          </figure>
        ))}
      </div>
      <button type="button" onClick={() => void tambah()} className="u-eb-tautan-aksi">+ Tambah foto</button>
    </div>
  );
}

/** Sama dengan Blok::embedVideo di server. */
export function embedVideo(url: string): string | null {
  const u = url.trim();
  const yt = u.match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = u.match(/^https?:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d{5,12})/);
  return vm ? `https://player.vimeo.com/video/${vm[1]}` : null;
}

export function Video({ b, ubah }: PropsBlok) {
  const embed = b.data.url ? embedVideo(b.data.url) : null;
  if (!embed) {
    return <Penampung ikon={<Film aria-hidden />} judul="Video" petunjuk={b.data.url ? 'Alamat itu bukan video YouTube/Vimeo. Coba tempel ulang.' : 'Tempel tautan YouTube atau Vimeo.'}
      url={(u) => ubah({ url: u })} placeholderUrl="https://www.youtube.com/watch?v=…" />;
  }
  return (
    <figure className="ub-video">
      <div className="ub-video-bingkai"><iframe src={embed} title="Video" allowFullScreen loading="lazy" className="u-eb-tanpa-klik" /></div>
      <TeksSebaris tag="figcaption" nilai={b.data.keterangan ?? ''} ganti={(h) => ubah({ keterangan: h })} placeholder="Keterangan video" />
    </figure>
  );
}

export function Berkas({ b, ubah }: PropsBlok) {
  const { pilihMedia } = useEditor();
  const ambil = async () => {
    const m = (await pilihMedia({ jenis: 'dokumen' }))?.[0];
    if (m) ubah({ url: m.url, nama: b.data.nama || m.judul || m.nama || '', ukuran: m.ukuran ?? null, media_id: m.id });
  };
  if (!b.data.url) {
    return <Penampung ikon={<FileDown aria-hidden />} judul="Berkas" petunjuk="Lampirkan PDF/dokumen untuk diunduh pembaca." aksi={<Button size="sm" onClick={() => void ambil()}><Upload aria-hidden />Pilih berkas</Button>} url={(u) => ubah({ url: u })} />;
  }
  return (
    <div className="ub-berkas">
      <TeksSebaris tag="span" polos nilai={b.data.nama ?? ''} ganti={(h) => ubah({ nama: h })} placeholder="Nama berkas" className="u-eb-berkas-nama" />
      {b.data.ukuran ? <small className="ub-berkas-ukuran">{formatBytes(b.data.ukuran)}</small> : null}
    </div>
  );
}

/** Terima URL embed Google Maps atau kode <iframe> dari tombol "Sematkan peta". */
export function urlPeta(isi: string): string | null {
  const src = isi.match(/src=["']([^"']+)["']/)?.[1] ?? isi.trim();
  return /^https:\/\/(www\.)?google\.com\/maps\/embed\?[^"'<>\s]+$/i.test(src) ? src : null;
}

export function Peta({ b, ubah }: PropsBlok) {
  const url = b.data.url ? urlPeta(b.data.url) : null;
  if (!url) {
    return <Penampung ikon={<MapPin aria-hidden />} judul="Peta" petunjuk={b.data.url ? 'Alamat belum benar. Di Google Maps pilih Bagikan » Sematkan peta, lalu salin kodenya.' : 'Di Google Maps pilih Bagikan » Sematkan peta, salin kode HTML-nya, lalu tempel di sini.'}
      url={(u) => ubah({ url: urlPeta(u) ?? u })} placeholderUrl='<iframe src="https://www.google.com/maps/embed?…' />;
  }
  return <figure className="ub-peta"><div className="ub-video-bingkai"><iframe src={url} title="Peta lokasi" loading="lazy" className="u-eb-tanpa-klik" /></div></figure>;
}
