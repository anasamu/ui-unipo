'use client';
import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { Alert } from '../components/display';
import { Button } from '../components/actions';
import { KodeLaporan } from '../components/galat';
import { pesanGalat } from './provider';

export interface GalatApiProps {
  /** Galat dari SDK/API (SiakadError, SsoAdminError, Error biasa). */
  error: unknown;
  /** Judul kotak. Bawaan "Data tidak dapat dimuat". */
  title?: React.ReactNode;
  /** Pesan pengganti; bawaan dari pesanGalat(). */
  message?: React.ReactNode;
  /** Tampilkan tombol "Coba lagi". */
  onRetry?: () => void;
  variant?: 'danger' | 'warning';
  className?: string;
}

/**
 * Kotak galat API standar: judul, pesan ramah, kode laporan (request_id) yang bisa disalin, dan tombol coba lagi.
 * Pakai ini untuk semua galat dari API agar pengguna selalu punya kode yang bisa disebutkan saat melapor.
 *
 * ```tsx
 * if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
 * ```
 */
export function GalatApi({ error, title = 'Data tidak dapat dimuat', message, onRetry, variant = 'danger', className }: GalatApiProps) {
  return (
    <Alert
      variant={variant}
      title={title}
      className={className}
      actions={
        onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw /> Coba lagi
          </Button>
        )
      }
    >
      {message ?? pesanGalat(error, { kode: false })}
      <KodeLaporan error={error} />
    </Alert>
  );
}
