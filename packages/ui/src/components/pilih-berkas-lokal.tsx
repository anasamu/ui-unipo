'use client';
import * as React from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { formatBytes } from '../lib/format';
import { Button, type ButtonProps } from './actions';

// Pemilih berkas dari perangkat (belum diunggah): pengganti <input type="file"> di halaman. Elemen bawaan
// disimpan di sini saja agar halaman memakai satu pola: tombol bergaya unipo-ui, batas jenis/ukuran dengan pesan awam.

export interface OpsiPilihBerkas {
  /** Jenis yang diterima, mis. ".pdf,.jpg,.png" atau "image/*". */
  accept?: string;
  multiple?: boolean;
  /** Batas ukuran per berkas (byte). Berkas lebih besar ditolak lewat `onTolak`. */
  maxSize?: number;
  /** Dipanggil dengan berkas yang lolos batas. */
  onFiles: (files: File[]) => void;
  /**
   * Pesan awam bila ada berkas yang ditolak (jenis/ukuran). Tanpa `onTolak` berkas tidak disaring di peramban
   * (`accept` hanya menyaring dialog; server tetap memeriksa).
   */
  onTolak?: (pesan: string) => void;
  /** Pilih satu folder beserta isinya (webkitdirectory); jalur relatif ada di `file.webkitRelativePath`. */
  folder?: boolean;
}

function cocokJenis(file: File, accept?: string): boolean {
  if (!accept) return true;
  const nama = file.name.toLowerCase();
  const tipe = (file.type || '').toLowerCase();
  return accept
    .split(',')
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean)
    .some((a) => (a.startsWith('.') ? nama.endsWith(a) : a.endsWith('/*') ? tipe.startsWith(a.slice(0, -1)) : tipe === a));
}

/** Saring berkas terhadap `accept` dan `maxSize`; kembalikan yang lolos dan pesan penolakan (null bila semua lolos). */
export function saringBerkasLokal(files: File[], { accept, maxSize }: Pick<OpsiPilihBerkas, 'accept' | 'maxSize'>): { lolos: File[]; pesan: string | null } {
  const lolos: File[] = [];
  const tolak: string[] = [];
  for (const f of files) {
    if (!cocokJenis(f, accept)) tolak.push(`${f.name}: jenis berkas tidak diterima (${accept}).`);
    else if (maxSize && f.size > maxSize) tolak.push(`${f.name}: melebihi batas ${formatBytes(maxSize)}.`);
    else lolos.push(f);
  }
  return { lolos, pesan: tolak.length ? tolak.join(' ') : null };
}

/**
 * Hook pemilih berkas untuk pemicu bebas (foto profil, butir menu, area seret): `buka()` membuka dialog berkas,
 * `elemen` wajib dirender sekali (tersembunyi).
 */
export function usePilihBerkas({ accept, multiple, maxSize, onFiles, onTolak, folder }: OpsiPilihBerkas) {
  const ref = React.useRef<HTMLInputElement>(null);
  const terima = React.useCallback(
    (list: FileList | File[] | null | undefined) => {
      const files = list ? Array.from(list) : [];
      if (!files.length) return;
      const dipilih = multiple || folder ? files : files.slice(0, 1);
      if (!onTolak) return onFiles(dipilih);
      const { lolos, pesan } = saringBerkasLokal(dipilih, { accept: folder ? undefined : accept, maxSize });
      if (pesan) onTolak(pesan);
      if (lolos.length) onFiles(lolos);
    },
    [accept, maxSize, multiple, folder, onFiles, onTolak],
  );
  const elemen = (
    <input
      ref={ref}
      type="file"
      hidden
      accept={folder ? undefined : accept}
      multiple={multiple || folder}
      {...(folder ? ({ webkitdirectory: '', directory: '' } as Record<string, string>) : {})}
      onChange={(e) => {
        terima(e.target.files);
        e.target.value = '';
      }}
    />
  );
  return { buka: () => ref.current?.click(), terima, elemen };
}

export interface TombolPilihBerkasProps extends OpsiPilihBerkas, Omit<ButtonProps, 'onClick' | 'children' | 'render'> {
  /** Isi tombol; bawaan ikon unggah + "Pilih berkas". */
  children?: React.ReactNode;
}

/** Tombol yang membuka pemilih berkas perangkat. Pengganti pola `<input type="file" hidden>` + tombol buatan sendiri. */
export function TombolPilihBerkas({ accept, multiple, maxSize, onFiles, onTolak, folder, children, variant = 'outline', size = 'sm', ...tombol }: TombolPilihBerkasProps) {
  const { buka, elemen } = usePilihBerkas({ accept, multiple, maxSize, onFiles, onTolak, folder });
  return (
    <>
      <Button variant={variant} size={size} {...tombol} onClick={buka}>
        {children ?? (
          <>
            <Upload /> Pilih berkas
          </>
        )}
      </Button>
      {elemen}
    </>
  );
}

export interface IsianBerkasProps extends Omit<OpsiPilihBerkas, 'onFiles' | 'multiple' | 'folder'> {
  /** Berkas terpilih (belum diunggah). */
  value: File | null;
  onValueChange: (file: File | null) => void;
  disabled?: boolean;
  /** Teks tombol (bawaan "Pilih berkas"). */
  label?: React.ReactNode;
  /** Keterangan di bawah, mis. "PDF, maks. 5 MB". Bawaan dari accept + maxSize. */
  info?: React.ReactNode;
  /** Galat dari luar (mis. validasi server). */
  galat?: string | null;
  id?: string;
  'aria-label'?: string;
  className?: string;
}

/**
 * Isian satu berkas untuk formulir: tombol pilih, nama + ukuran berkas terpilih, tombol hapus, dan pesan bila jenis
 * atau ukuran ditolak. Nilai `File | null`; pengunggahan dilakukan saat formulir dikirim.
 */
export function IsianBerkas({ value, onValueChange, accept, maxSize, onTolak, disabled, label = 'Pilih berkas', info, galat, id, 'aria-label': ariaLabel, className }: IsianBerkasProps) {
  const [tolak, setTolak] = React.useState<string | null>(null);
  const idPesan = React.useId();
  const { buka, elemen } = usePilihBerkas({
    accept,
    maxSize,
    onFiles: (f) => {
      setTolak(null);
      onValueChange(f[0] ?? null);
    },
    onTolak: (p) => {
      setTolak(p);
      onTolak?.(p);
    },
  });
  const pesan = galat ?? tolak;
  const keterangan = info ?? [accept?.replace(/\./g, '').toUpperCase().replace(/,/g, ', '), maxSize && `maks. ${formatBytes(maxSize)}`].filter(Boolean).join(' · ');
  return (
    <div className={cn('u-berkas-lokal', className)} data-disabled={dataFlag(disabled)} data-invalid={dataFlag(Boolean(pesan))}>
      <div className="u-berkas-lokal-baris">
        <Button id={id} variant="outline" size="sm" disabled={disabled} onClick={buka} aria-label={ariaLabel} aria-describedby={pesan || keterangan ? idPesan : undefined}>
          <Upload /> {value ? 'Ganti berkas' : label}
        </Button>
        {value ? (
          <span className="u-berkas-lokal-nama" title={value.name}>
            <FileText aria-hidden />
            <span>{value.name}</span>
            <small>{formatBytes(value.size)}</small>
            <Button variant="ghost" size="xs" iconOnly aria-label={`Hapus ${value.name}`} disabled={disabled} onClick={() => onValueChange(null)}>
              <X />
            </Button>
          </span>
        ) : (
          <span className="u-berkas-lokal-kosong">Belum ada berkas dipilih</span>
        )}
      </div>
      {(pesan || keterangan) && (
        <span id={idPesan} className="u-isian-pesan" data-tone={pesan ? 'danger' : undefined} role={pesan ? 'alert' : undefined}>
          {pesan ?? keterangan}
        </span>
      )}
      {elemen}
    </div>
  );
}
