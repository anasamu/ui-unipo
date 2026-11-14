'use client';
import * as React from 'react';
import { cn } from '../lib/cn';

/** Warna ikon dan ilustrasi. Selain nada tema (primary…info) tersedia warna fitur yang tetap. */
export type NadaIkon = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'biru' | 'indigo' | 'ungu' | 'merah-muda' | 'mawar' | 'oranye' | 'kuning' | 'hijau' | 'toska' | 'langit' | 'abu';

export interface IkonKotakProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  children: React.ReactNode;
  nada?: NadaIkon;
  /** sm 32, md 40, lg 48, xl 64 px. */
  ukuran?: 'sm' | 'md' | 'lg' | 'xl';
  /** clay: timbul lembut seperti 3D (bawaan); lembut: latar pucat datar; padat: warna penuh; garis: tepi saja. */
  gaya?: 'clay' | 'lembut' | 'padat' | 'garis';
  bentuk?: 'kotak' | 'bulat';
  /** Gerak saat disorot: angkat (bawaan), ayun, putar, tidak. */
  gerak?: 'angkat' | 'ayun' | 'putar' | 'tidak';
}

/**
 * Ikon dalam kotak berwarna bergaya clay (timbul lembut), untuk kartu modul, statistik, menu, dan keadaan kosong.
 *   <IkonKotak nada="ungu"><IkonBeasiswa /></IkonKotak>
 */
export function IkonKotak({ children, nada = 'primary', ukuran = 'md', gaya = 'clay', bentuk = 'kotak', gerak = 'angkat', className, ...rest }: IkonKotakProps) {
  return (
    <span className={cn('u-ikon-kotak', className)} data-nada={nada} data-ukuran={ukuran} data-gaya={gaya} data-bentuk={bentuk} data-gerak={gerak} {...rest}>
      {children}
    </span>
  );
}
