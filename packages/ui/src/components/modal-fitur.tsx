'use client';
import * as React from 'react';
import { ArrowRight, KeyRound, LogIn, RefreshCw } from 'lucide-react';
import { cn } from '../lib/cn';
import { Ilustrasi, type IlustrasiProps, type NamaIlustrasi } from '../ikon/ilustrasi';
import { Button } from './actions';
import { Alert } from './display';
import { KodeLaporan } from './galat';
import { Dialog, DialogClose } from './overlays';

export interface AksiModalFitur {
  label: React.ReactNode;
  /** Kembalikan teks untuk menahan modal tetap terbuka dengan pesan itu; lempar galat untuk kotak galat + kode laporan. */
  onClick: () => void | string | null | Promise<void | string | null>;
  variant?: 'primary' | 'destructive' | 'outline' | 'secondary';
  icon?: React.ReactNode;
  disabled?: boolean;
  /** Biarkan modal tetap terbuka setelah aksi berhasil (mis. pindah ke langkah berikutnya). */
  tetapBuka?: boolean;
}

export interface ModalFiturProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactElement;
  /** Adegan ilustrasi (wisuda, krs, salah-password, sesi-habis, …) atau props Ilustrasi lengkap. */
  ilustrasi?: NamaIlustrasi | IlustrasiProps;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Tombol utama. */
  aksi?: AksiModalFitur;
  /** Tombol kedua (kiri dari tombol utama). */
  aksiKedua?: AksiModalFitur;
  /** Label tombol tutup; false menyembunyikannya. Bawaan "Tutup". */
  tutup?: React.ReactNode | false;
  /** Tidak bisa ditutup dengan klik luar/Esc (mis. sesi habis). */
  wajib?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Modal berilustrasi untuk satu fitur atau keadaan: ilustrasi tokoh di atas judul, isi, dan tombol aksi yang
 * menunggu janji (async) dengan kotak galat dan kode laporan (request_id) bila gagal.
 *
 * ```tsx
 * <ModalFitur ilustrasi="wisuda" title="Daftar wisuda" aksi={{ label: 'Daftar', onClick: () => siakad.request(...) }} />
 * ```
 */
export function ModalFitur({ open, defaultOpen, onOpenChange, trigger, ilustrasi, title, description, children, aksi, aksiKedua, tutup = 'Tutup', wajib, size = 'sm', className }: ModalFiturProps) {
  const [inner, setInner] = React.useState(defaultOpen ?? false);
  const [sibuk, setSibuk] = React.useState<0 | 1 | 2>(0);
  const [galat, setGalat] = React.useState<unknown>(null);
  const isOpen = open ?? inner;
  const setOpen = (o: boolean) => {
    if (!o && (sibuk || wajib)) return;
    setInner(o);
    onOpenChange?.(o);
    if (!o) setGalat(null);
  };
  const jalankan = async (a: AksiModalFitur, k: 1 | 2) => {
    setSibuk(k);
    setGalat(null);
    try {
      const r = await a.onClick();
      setSibuk(0);
      if (typeof r === 'string' && r) return setGalat(new Error(r));
      if (!a.tetapBuka) {
        setInner(false);
        onOpenChange?.(false);
      }
    } catch (e) {
      setSibuk(0);
      setGalat(e);
    }
  };
  const ilus = typeof ilustrasi === 'string' ? { nama: ilustrasi } : ilustrasi;
  const tombol = (a: AksiModalFitur, k: 1 | 2) => (
    <Button variant={a.variant ?? (k === 1 ? 'primary' : 'outline')} loading={sibuk === k} disabled={a.disabled || (sibuk !== 0 && sibuk !== k)} onClick={() => void jalankan(a, k)}>
      {a.icon}
      {a.label}
    </Button>
  );
  return (
    <Dialog
      open={isOpen}
      onOpenChange={setOpen}
      trigger={trigger}
      size={size}
      className={cn('u-modal-fitur', wajib && 'u-modal-fitur-wajib', className)}
      title={
        <>
          {ilus && <Ilustrasi lebar={200} {...ilus} className={cn('u-modal-fitur-ilus', ilus.className)} />}
          <span className="u-modal-fitur-judul">{title}</span>
        </>
      }
      description={description}
      footer={
        (aksi || aksiKedua || tutup !== false) && (
          <>
            {tutup !== false && !wajib && <DialogClose render={<Button variant="ghost" disabled={sibuk !== 0} />}>{tutup}</DialogClose>}
            {aksiKedua && tombol(aksiKedua, 2)}
            {aksi && tombol(aksi, 1)}
          </>
        )
      }
    >
      {children || galat != null ? (
        <>
          {children}
          {galat != null ? (
            <Alert variant="danger" title="Belum berhasil">
              {(galat as Error)?.message || 'Terjadi kesalahan.'}
              <KodeLaporan error={galat} />
            </Alert>
          ) : null}
        </>
      ) : null}
    </Dialog>
  );
}

// ---------------------------------------------------------------- Preset keadaan

type Dasar = Pick<ModalFiturProps, 'open' | 'onOpenChange' | 'trigger' | 'className'>;

export interface ModalSesiHabisProps extends Dasar {
  /** Arahkan ke login SSO (mis. siakad.auth.loginUrl() atau window.location ke /masuk). */
  onMasuk: () => void | Promise<void>;
  /** Simpan pekerjaan yang belum terkirim sebelum pindah (opsional). */
  onSimpanDraf?: () => void | Promise<void>;
}

/** Sesi berakhir (401): tidak bisa ditutup, hanya "Masuk lagi" agar data tidak terkirim tanpa token. */
export function ModalSesiHabis({ onMasuk, onSimpanDraf, ...p }: ModalSesiHabisProps) {
  return (
    <ModalFitur
      {...p}
      wajib
      ilustrasi="sesi-habis"
      title="Sesi Anda berakhir"
      description="Demi keamanan, Anda keluar otomatis setelah lama tidak aktif. Masuk lagi untuk melanjutkan; halaman ini akan dibuka kembali."
      aksiKedua={onSimpanDraf ? { label: 'Simpan draf dulu', onClick: onSimpanDraf, tetapBuka: true } : undefined}
      aksi={{ label: 'Masuk lagi', icon: <LogIn />, onClick: onMasuk, tetapBuka: true }}
    />
  );
}

export interface ModalSalahPasswordProps extends Dasar {
  /** Sisa percobaan sebelum akun dikunci sementara. */
  sisaPercobaan?: number | null;
  /** Akun terkunci sampai waktu ini (dari galat 429/423 SSO). */
  terkunciSampai?: Date | string | null;
  onCobaLagi?: () => void;
  /** Buka alur lupa password SSO. */
  onLupaPassword?: () => void;
}

/** Username atau password salah, dengan sisa percobaan dan tautan lupa password. */
export function ModalSalahPassword({ sisaPercobaan, terkunciSampai, onCobaLagi, onLupaPassword, ...p }: ModalSalahPasswordProps) {
  const kunci = terkunciSampai ? new Date(terkunciSampai) : null;
  const terkunci = kunci != null && kunci.getTime() > Date.now();
  return (
    <ModalFitur
      {...p}
      ilustrasi={terkunci ? 'terkunci' : 'salah-password'}
      title={terkunci ? 'Akun dikunci sementara' : 'Username atau password belum cocok'}
      description={
        terkunci
          ? `Terlalu banyak percobaan. Coba lagi setelah pukul ${kunci!.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}, atau atur ulang password sekarang.`
          : 'Periksa huruf besar/kecil dan pastikan Caps Lock mati. Gunakan NIM, NIDN, atau username yang terdaftar.'
      }
      tutup={false}
      aksiKedua={onLupaPassword ? { label: 'Lupa password', icon: <KeyRound />, onClick: onLupaPassword, variant: 'outline' } : undefined}
      aksi={!terkunci && onCobaLagi ? { label: 'Coba lagi', icon: <RefreshCw />, onClick: onCobaLagi } : undefined}
    >
      {!terkunci && sisaPercobaan != null && (
        <Alert variant={sisaPercobaan <= 1 ? 'danger' : 'warning'} title={`Sisa ${sisaPercobaan} percobaan`}>
          Setelah itu akun dikunci sementara untuk melindungi data Anda.
        </Alert>
      )}
    </ModalFitur>
  );
}

export interface ModalAksesDitolakProps extends Dasar {
  /** Scope yang dibutuhkan (dari PermissionError.requiredScopes). */
  scope?: string[];
  /** Nama fitur yang dibuka. */
  fitur?: React.ReactNode;
  /** Ajukan akses (mis. buka Pustikom/api.unipo.ac.id). */
  onMintaAkses?: () => void | Promise<void>;
}

/** Galat 403: tampilkan scope yang kurang dan jalan untuk meminta akses. */
export function ModalAksesDitolak({ scope = [], fitur, onMintaAkses, ...p }: ModalAksesDitolakProps) {
  return (
    <ModalFitur
      {...p}
      ilustrasi="akses-ditolak"
      title="Akses belum diberikan"
      description={<>Akun Anda belum punya izin untuk {fitur ?? 'fitur ini'}. Hubungi admin prodi atau ajukan akses ke Pustikom.</>}
      aksi={onMintaAkses ? { label: 'Ajukan akses', icon: <ArrowRight />, onClick: onMintaAkses } : undefined}
    >
      {scope.length > 0 && (
        <div className="u-modal-fitur-scope">
          <span>Izin yang dibutuhkan</span>
          <div>
            {scope.map((s) => (
              <code key={s}>{s}</code>
            ))}
          </div>
        </div>
      )}
    </ModalFitur>
  );
}

export interface ModalBerhasilProps extends Dasar {
  ilustrasi?: NamaIlustrasi;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Langkah berikutnya, mis. { label: 'Lihat permohonan', onClick: … }. */
  aksi?: AksiModalFitur;
}

/** Konfirmasi setelah aksi berhasil (permohonan terkirim, pembayaran diterima, pendaftaran wisuda tersimpan). */
export function ModalBerhasil({ ilustrasi = 'sukses', title, description, children, aksi, ...p }: ModalBerhasilProps) {
  return (
    <ModalFitur {...p} ilustrasi={ilustrasi} title={title} description={description} aksi={aksi}>
      {children}
    </ModalFitur>
  );
}

/** Ringkasan nilai di modal: label kiri, isi kanan. */
export function RincianModal({ baris, className }: { baris: Array<[React.ReactNode, React.ReactNode]>; className?: string }) {
  return (
    <dl className={cn('u-modal-fitur-rincian', className)}>
      {baris.map(([k, v], i) => (
        <React.Fragment key={i}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
