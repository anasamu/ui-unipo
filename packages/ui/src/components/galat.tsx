'use client';
import { cn } from '../lib/cn';
import { CopyButton } from './code';

/**
 * Ambil ID permintaan (request_id) dari galat API: `requestId` di SiakadError (unipo-siakad-sdk),
 * `request_id` di jawaban JSON, atau `details.request_id`. Kosong bila tidak ada.
 */
export function requestIdDari(e: unknown): string | null {
  if (!e || typeof e !== 'object') return null;
  const g = e as { requestId?: unknown; request_id?: unknown; details?: { request_id?: unknown }; body?: { request_id?: unknown }; cause?: unknown };
  const id = g.requestId ?? g.request_id ?? g.details?.request_id ?? g.body?.request_id;
  if (typeof id === 'string' && id) return id;
  return g.cause && g.cause !== e ? requestIdDari(g.cause) : null;
}

/**
 * Baris "Kode laporan: abc123 [salin]" untuk ditaruh di bawah pesan galat. Tidak tampil apa pun bila
 * galat tidak membawa request_id. Pengguna cukup menyalin kode ini saat melapor ke Pustikom.
 */
export function KodeLaporan({ error, id, className }: { error?: unknown; /** Isi langsung bila sudah tahu ID-nya. */ id?: string | null; className?: string }) {
  const kode = id ?? requestIdDari(error);
  if (!kode) return null;
  return (
    <span className={cn('u-kode-laporan', className)}>
      <span>Kode laporan</span>
      <span className="u-kode-laporan-nilai">
        <code>{kode}</code>
        <CopyButton text={kode} label="Salin kode laporan" />
      </span>
    </span>
  );
}
