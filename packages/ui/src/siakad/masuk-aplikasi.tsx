'use client';
import * as React from 'react';
import { LogIn } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from '../components/actions';
import { Alert } from '../components/display';
import { Ilustrasi, type NamaIlustrasi } from '../ikon/ilustrasi';

export interface FiturMasuk {
  ikon: React.ReactNode;
  judul: React.ReactNode;
  keterangan?: React.ReactNode;
}

export interface HalamanMasukAplikasiProps {
  /** Logo aplikasi (mis. <AppLogo />). */
  logo?: React.ReactNode;
  judul: React.ReactNode;
  deskripsi?: React.ReactNode;
  /** Alamat masuk SSO lewat BFF, mis. `/bff/masuk?kembali=/`. */
  hrefMasuk: string;
  labelMasuk?: React.ReactNode;
  /** Pesan galat (dari BFF atau ?galat=). */
  galat?: React.ReactNode;
  /** Galat berupa penolakan akses (nada peringatan, bukan bahaya). */
  ditolak?: boolean;
  /** Isian .env BFF yang masih kosong: tombol masuk dimatikan. */
  kurang?: string[];
  /** Tampilkan "Anda sudah keluar" (mis. ?keluar=1). */
  keluar?: boolean;
  /** Catatan kecil di bawah tombol (akun apa yang dipakai). */
  catatan?: React.ReactNode;
  /** Daftar fitur di panel sisi. */
  fitur?: FiturMasuk[];
  /** Ilustrasi panel sisi bila tanpa `fitur`. */
  ilustrasi?: NamaIlustrasi;
  /** Judul dan teks panel sisi. */
  judulSisi?: React.ReactNode;
  teksSisi?: React.ReactNode;
  className?: string;
}

/**
 * Halaman masuk baku aplikasi UNIPO yang memakai SSO lewat BFF: logo, judul, deskripsi, pesan galat/keluar/konfigurasi
 * kurang, tombol "Masuk dengan SSO UNIPO", catatan akun, dan panel sisi berisi fitur atau ilustrasi. Satu kolom di ponsel.
 */
export function HalamanMasukAplikasi({
  logo,
  judul,
  deskripsi,
  hrefMasuk,
  labelMasuk = 'Masuk dengan SSO UNIPO',
  galat,
  ditolak,
  kurang,
  keluar,
  catatan,
  fitur,
  ilustrasi = 'profil',
  judulSisi,
  teksSisi,
  className,
}: HalamanMasukAplikasiProps) {
  const belumSiap = (kurang?.length ?? 0) > 0;
  return (
    <div className={cn('u-masuk-aplikasi', className)}>
      <section className="u-masuk-aplikasi-panel">
        {logo}
        <div className="u-masuk-aplikasi-teks">
          <h1>{judul}</h1>
          {deskripsi && <p>{deskripsi}</p>}
        </div>
        {galat ? (
          <Alert variant={ditolak ? 'warning' : 'danger'} title="Belum bisa masuk">
            {galat}
          </Alert>
        ) : null}
        {belumSiap ? (
          <Alert variant="warning" title="Aplikasi belum selesai diatur">
            Isian {kurang!.join(', ')} di file .env BFF masih kosong. Hubungi Pustikom.
          </Alert>
        ) : null}
        {keluar && !galat ? <Alert variant="success">Anda sudah keluar. Sampai jumpa lagi.</Alert> : null}
        <Button size="lg" fullWidth disabled={belumSiap} render={<a href={hrefMasuk} />}>
          <LogIn /> {labelMasuk}
        </Button>
        {catatan && <p className="u-masuk-aplikasi-catatan">{catatan}</p>}
      </section>
      <aside className="u-masuk-aplikasi-sisi" aria-label={fitur ? 'Fitur aplikasi' : undefined} aria-hidden={fitur ? undefined : true}>
        {fitur ? (
          <ul>
            {fitur.map((f, i) => (
              <li key={i}>
                <span className="u-masuk-aplikasi-ikon" aria-hidden>
                  {f.ikon}
                </span>
                <div>
                  <strong>{f.judul}</strong>
                  {f.keterangan && <span>{f.keterangan}</span>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <Ilustrasi nama={ilustrasi} lebar={340} />
            {judulSisi && <h2>{judulSisi}</h2>}
            {teksSisi && <p>{teksSisi}</p>}
          </>
        )}
      </aside>
    </div>
  );
}
