'use client';
import * as React from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button, type ButtonSize } from '../components/actions';
import { useKonfirmasi, type Aksi } from '../components/aksi';

/**
 * Aturan umum G4 (keputusan Anas 2026-11-22): data pengajuan yang masih draf bisa dihapus pemiliknya. Server menolak
 * 403 bila bukan pemilik dan 409 bila sudah diajukan (pakai Batalkan); lampiran draf pindah ke Sampah. Komponen ini
 * menyeragamkan aksi "Hapus draf" di semua widget: aksi baris ⋯ (MenuAksiBaris) dan tombol di halaman lanjutkan draf.
 */
export interface HapusDrafOpsi {
  /** Nama data dalam bahasa awam, mis. "DUPAK", "laporan BKD", "SKP". */
  apa: string;
  /** Penanda baris agar pengguna yakin yang dihapus benar, mis. periode "Ganjil 2025/2026 – Genap 2025/2026". */
  nama?: string;
  /** Yang ikut terhapus, mis. ["semua kegiatan yang sudah diisi", "bukti yang diunggah"]. */
  ikut?: string[];
  /** Panggil API hapus; lempar galat agar pesan server tampil. */
  onHapus: () => unknown;
  /** Sembunyikan bila pengguna tidak berhak atau data bukan draf (jangan tampilkan tombol yang pasti gagal). */
  sembunyi?: boolean;
}

/** Kalimat akibat untuk dialog konfirmasi hapus draf. */
export function keteranganHapusDraf(o: Pick<HapusDrafOpsi, 'ikut'>): string {
  const ikut = o.ikut?.filter(Boolean) ?? [];
  const daftar = ikut.length > 1 ? `${ikut.slice(0, -1).join(', ')} dan ${ikut[ikut.length - 1]}` : ikut[0];
  return `Draf ini belum pernah diajukan, jadi bisa dihapus.${daftar ? ` Ikut terhapus: ${daftar}.` : ''} Berkas lampiran dipindah ke Sampah. Data yang sudah dihapus tidak bisa dibuka lagi dari sini.`;
}

/** Aksi "Hapus draf" untuk MenuAksiBaris / BilahAksi (nada bahaya, berkonfirmasi). */
export function aksiHapusDraf(o: HapusDrafOpsi): Aksi {
  return {
    kunci: 'hapus-draf',
    label: 'Hapus draf',
    ikon: <Trash2 />,
    nada: 'bahaya',
    sembunyi: o.sembunyi,
    konfirmasi: { judul: `Hapus draf ${o.apa}${o.nama ? ` ${o.nama}` : ''}?`, keterangan: keteranganHapusDraf(o), label: `Hapus draf ${o.apa}` },
    onClick: o.onHapus,
  };
}

/** Tombol "Hapus draf" (mis. di kaki/kepala halaman lanjutkan draf) dengan konfirmasi yang sama. */
export function TombolHapusDraf({ size = 'md', className, ...o }: HapusDrafOpsi & { size?: ButtonSize; className?: string }) {
  const { konfirmasi, elemen } = useKonfirmasi();
  const [sibuk, setSibuk] = React.useState(false);
  if (o.sembunyi) return null;
  const a = aksiHapusDraf(o);
  return (
    <>
      <Button
        variant="destructive-soft"
        size={size}
        className={cn('u-hapus-draf', className)}
        loading={sibuk}
        onClick={async () => {
          if (!(await konfirmasi({ nada: 'bahaya', ...a.konfirmasi!, label: a.konfirmasi!.label ?? a.label }))) return;
          setSibuk(true);
          try {
            await o.onHapus();
          } catch {
            // Pesan galat sudah ditampilkan pemanggil (toast).
          } finally {
            setSibuk(false);
          }
        }}
      >
        <Trash2 /> Hapus draf
      </Button>
      {elemen}
    </>
  );
}
