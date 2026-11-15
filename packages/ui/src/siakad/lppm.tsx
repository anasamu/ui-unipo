import { Badge } from '../components/actions';
import { Stepper } from '../components/display';

/*
 * Lencana dan alur untuk penelitian dan pengabdian (API SIAKAD /v1/lppm). Dipakai aplikasi LP2M (lp2m.unipo.ac.id),
 * dasbor fakultas, dan aplikasi lain yang menampilkan kegiatan LPPM, supaya status tampil sama di mana pun.
 */

type Nada = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'primary';

/** Label status usulan/kegiatan LPPM. */
export const LABEL_STATUS_LPPM: Record<string, string> = {
  draf: 'Draf',
  diajukan: 'Diajukan',
  direview: 'Direview',
  revisi: 'Revisi',
  diterima: 'Diterima',
  ditolak: 'Ditolak',
  berjalan: 'Berjalan',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

export const NADA_STATUS_LPPM: Record<string, Nada> = {
  draf: 'neutral',
  diajukan: 'info',
  direview: 'info',
  revisi: 'warning',
  diterima: 'success',
  ditolak: 'danger',
  berjalan: 'primary',
  selesai: 'success',
  dibatalkan: 'neutral',
};

/** Label verifikasi luaran LPPM. */
export const LABEL_VERIFIKASI_LUARAN: Record<string, string> = { belum: 'Belum diajukan', diajukan: 'Menunggu verifikasi', terverifikasi: 'Terverifikasi', ditolak: 'Ditolak' };
const NADA_VERIFIKASI: Record<string, Nada> = { belum: 'neutral', diajukan: 'warning', terverifikasi: 'success', ditolak: 'danger' };
const LABEL_PERSETUJUAN: Record<string, string> = { menunggu: 'Menunggu fakultas', disetujui: 'Disetujui fakultas', ditolak: 'Ditolak fakultas' };

/** Lencana status usulan/kegiatan penelitian atau PkM. */
export function StatusKegiatanLppm({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant={NADA_STATUS_LPPM[status] ?? 'neutral'} className={className}>
      {LABEL_STATUS_LPPM[status] ?? status}
    </Badge>
  );
}

/** Lencana status verifikasi luaran (publikasi, HKI, buku, produk). */
export function StatusVerifikasiLuaran({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant={NADA_VERIFIKASI[status] ?? 'neutral'} className={className}>
      {LABEL_VERIFIKASI_LUARAN[status] ?? status}
    </Badge>
  );
}

/** Lencana persetujuan fakultas; tidak tampil bila skema tidak mewajibkannya (`tidak_perlu`). */
export function PersetujuanFakultasLppm({ status, className }: { status: string | null | undefined; className?: string }) {
  if (!status || status === 'tidak_perlu') return null;
  return (
    <Badge variant={status === 'disetujui' ? 'success' : status === 'ditolak' ? 'danger' : 'warning'} className={className}>
      {LABEL_PERSETUJUAN[status] ?? status}
    </Badge>
  );
}

const LANGKAH_LPPM = [
  { key: 'draf', title: 'Draf', description: 'Proposal, tim, RAB' },
  { key: 'diajukan', title: 'Diajukan', description: 'Nomor registrasi terbit' },
  { key: 'direview', title: 'Review', description: 'Penilaian reviewer' },
  { key: 'diterima', title: 'Penetapan', description: 'SK & dana disetujui' },
  { key: 'berjalan', title: 'Pelaksanaan', description: 'Kontrak, logbook, laporan' },
  { key: 'selesai', title: 'Selesai', description: 'Laporan akhir diterima' },
];

/**
 * Alur kegiatan LPPM sebagai Stepper. Hibah internal (`asal = usulan`): draf, diajukan, review, penetapan,
 * pelaksanaan, selesai. Hibah eksternal/mandiri langsung dicatat, jadi hanya dua langkah terakhir. Status revisi
 * kembali ke langkah draf; ditolak/dibatalkan tidak menampilkan alur.
 *
 *   <AlurKegiatanLppm status={k.status} asal={k.asal} />
 */
export function AlurKegiatanLppm({ status, asal = 'usulan', className }: { status: string; asal?: string; className?: string }) {
  const langkah = asal === 'usulan' ? LANGKAH_LPPM : LANGKAH_LPPM.slice(4);
  const urut = langkah.map((l) => l.key);
  const idx = status === 'revisi' ? urut.indexOf('draf') : status === 'ditolak' || status === 'dibatalkan' ? -1 : urut.indexOf(status);
  if (idx < 0) return null;
  return (
    <Stepper
      className={className}
      steps={langkah.map((l) => ({ title: l.title, description: l.description }))}
      current={status === 'selesai' ? langkah.length : idx}
    />
  );
}
