'use client';
import * as React from 'react';
import { Undo2, UserCog } from 'lucide-react';
import { cn } from '../lib/cn';

// ================================================================ Bilah "Masuk sebagai pengguna"
//
// Tampil selama admin membuka aplikasi sebagai akun lain (Pustikom → Akses → Masuk sebagai pengguna). Bilah tipis
// satu baris menempel di tepi atas dan menjadi bagian tata letak: selama tampil, `--u-offset-atas` di <html> diisi
// tinggi bilah dan <body> diberi padding atas sebesar itu, sehingga isi, pita pengumuman, sidebar dan bilah atas
// KerangkaAplikasi, panel samping, dialog, dan bilah progres bergeser ke bawah (tidak ada yang tertutup).

export interface InfoMenyamar {
  /** Username admin yang membuka sesi. */
  oleh: string;
  mode: 'lihat' | 'penuh';
  /** Database SIAKAD selama sesi; development hanya untuk mode penuh. */
  lingkungan?: 'live' | 'development';
  /** Detik Unix berakhirnya sesi (0 = tanpa batas). */
  berakhir: number;
  /** URL kembali ke akun admin. */
  kembali: string;
}

export interface BilahMenyamarProps {
  /** Akun (username) yang sedang dibuka. */
  akun?: string;
  /** Nama tampilan akun (opsional, ditulis sebelum username). */
  nama?: string;
  menyamar: InfoMenyamar;
  /** false = tampil di tempat (pratinjau/dokumentasi), tanpa menempel di tepi atas dan tanpa menggeser halaman. */
  tetap?: boolean;
  className?: string;
}

const ATRIBUT = 'data-bilah-menyamar';

export function BilahMenyamar({ akun, nama, menyamar, tetap = true, className }: BilahMenyamarProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  // Bilah jadi bagian tata letak: isi variabel offset + padding body selama tampil.
  React.useLayoutEffect(() => {
    if (!tetap) return;
    const html = document.documentElement;
    const el = ref.current;
    const pasang = () => {
      const h = el ? Math.round(el.getBoundingClientRect().height) : 0;
      if (h > 0) html.style.setProperty('--u-offset-atas', `${h}px`);
    };
    html.setAttribute(ATRIBUT, '');
    pasang();
    const ro = typeof ResizeObserver !== 'undefined' && el ? new ResizeObserver(pasang) : null;
    if (ro && el) ro.observe(el);
    return () => {
      ro?.disconnect();
      html.removeAttribute(ATRIBUT);
      html.style.removeProperty('--u-offset-atas');
    };
  }, [tetap]);

  const penuh = menyamar.mode === 'penuh';
  const dev = menyamar.lingkungan === 'development';
  // Database ditampilkan untuk mode penuh (bisa menulis) atau bila server menyebutkannya.
  const tampilDb = penuh || !!menyamar.lingkungan;
  const nada = penuh && !dev ? 'bahaya' : penuh ? 'waspada' : 'lihat';
  const jam =
    menyamar.berakhir > 0 ? new Date(menyamar.berakhir * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
  const siapa = nama ? `${nama}${akun ? ` (${akun})` : ''}` : (akun ?? 'pengguna lain');
  const keterangan = [
    `Masuk sebagai ${siapa}`,
    `dibuka oleh ${menyamar.oleh}`,
    penuh ? 'mode penuh' : 'hanya lihat',
    tampilDb ? `database ${dev ? 'development' : 'live'}` : null,
    jam ? `berakhir ${jam}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div ref={ref} role="status" aria-label={keterangan} className={cn('u-bilah-menyamar', className)} data-nada={nada} data-tetap={tetap ? undefined : 'tidak'}>
      <UserCog className="u-bm-ikon" aria-hidden />
      <span className="u-bm-teks" title={`Dibuka oleh ${menyamar.oleh}`}>
        <span className="u-bm-label">Masuk sebagai </span>
        <b className="u-bm-akun">{siapa}</b>
      </span>
      <span className="u-bm-chip" data-jenis="mode" title={penuh ? 'Mode penuh: perubahan tersimpan atas nama akun ini' : 'Hanya lihat: tidak dapat mengubah data'}>
        <span className="u-bm-panjang">{penuh ? 'Mode penuh' : 'Hanya lihat'}</span>
        <span className="u-bm-pendek" aria-hidden>{penuh ? 'Penuh' : 'Lihat'}</span>
      </span>
      {tampilDb && (
        <span className="u-bm-chip" data-jenis={dev ? 'dev' : 'live'} title={dev ? 'Database development (salinan uji)' : 'Database live (data asli)'}>
          <span className="u-bm-panjang">{dev ? 'Database development' : 'Database live'}</span>
          <span className="u-bm-pendek" aria-hidden>{dev ? 'Dev' : 'Live'}</span>
        </span>
      )}
      {jam && (
        <span className="u-bm-jam" title={`Sesi berakhir pukul ${jam}`}>
          berakhir {jam}
        </span>
      )}
      <a className="u-bm-kembali" href={menyamar.kembali} title="Kembali ke akun saya" aria-label="Kembali ke akun saya">
        <Undo2 aria-hidden />
        <span className="u-bm-panjang">Kembali ke akun saya</span>
      </a>
    </div>
  );
}
