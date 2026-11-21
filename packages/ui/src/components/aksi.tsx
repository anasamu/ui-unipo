'use client';
import * as React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button, type ButtonSize } from './actions';
import { Field, Input, Textarea } from './forms';
import { ConfirmDialog, Menu, Tooltip, type MenuEntry } from './overlays';

// ================================================================ KonfirmasiAksi
export interface KonfirmasiOpsi {
  /** Pertanyaan berbentuk tindakan, mis. "Hapus kegiatan “Pengabdian Desa Marisa”?". */
  judul: React.ReactNode;
  /** Akibat tindakan dalam bahasa awam, mis. "Anggota tim tidak bisa lagi membuka kegiatan ini." */
  keterangan?: React.ReactNode;
  /** Label tombol: kata kerja + objek, mis. "Hapus kegiatan". */
  label: string;
  nada?: 'bahaya' | 'utama' | 'peringatan';
  labelBatal?: string;
}

export interface TanyaOpsi extends KonfirmasiOpsi {
  /** Label isian, mis. "Alasan penolakan". */
  labelIsian: string;
  /** Teks bantuan di bawah isian. */
  bantuan?: React.ReactNode;
  placeholder?: string;
  nilaiAwal?: string;
  /** Isian banyak baris (alasan, catatan). */
  panjang?: boolean;
  /** Wajib diisi (bawaan true). */
  wajib?: boolean;
  min?: number;
  maks?: number;
  /** Validasi tambahan; kembalikan pesan awam atau null. */
  periksa?: (nilai: string) => string | null;
}

/** Pesan awam untuk isian teks konfirmasi (dipakai `tanya`). */
export function periksaIsianTanya(nilai: string, o: Pick<TanyaOpsi, 'wajib' | 'min' | 'maks' | 'periksa'>): string | null {
  const t = nilai.trim();
  if (!t) return o.wajib === false ? null : 'Wajib diisi.';
  if (o.min && t.length < o.min) return `Tulis paling sedikit ${o.min} huruf (sekarang ${t.length}).`;
  if (o.maks && t.length > o.maks) return `Paling banyak ${o.maks} huruf (sekarang ${t.length}).`;
  return o.periksa?.(t) ?? null;
}

type Permintaan =
  | { jenis: 'konfirmasi'; opsi: KonfirmasiOpsi; selesai: (ok: boolean) => void }
  | { jenis: 'tanya'; opsi: TanyaOpsi; selesai: (nilai: string | null) => void };

const NADA = { bahaya: 'danger', utama: 'primary', peringatan: 'warning' } as const;

/**
 * Pengganti `window.confirm` dan `window.prompt` yang bisa di-`await`, dengan dialog unipo-ui (fokus terkunci, Esc
 * membatalkan, tombol berlabel tindakan). Render `elemen` sekali di komponen yang memakai.
 *
 * ```tsx
 * const { konfirmasi, tanya, elemen } = useKonfirmasi();
 * if (!(await konfirmasi({ judul: 'Hapus berkas?', label: 'Hapus berkas' }))) return;
 * const alasan = await tanya({ judul: 'Tolak pengajuan?', label: 'Tolak', labelIsian: 'Alasan', min: 5, panjang: true });
 * return <>{elemen}...</>;
 * ```
 */
export function useKonfirmasi() {
  const [minta, setMinta] = React.useState<Permintaan | null>(null);
  const konfirmasi = React.useCallback((opsi: KonfirmasiOpsi) => new Promise<boolean>((selesai) => setMinta({ jenis: 'konfirmasi', opsi, selesai })), []);
  const tanya = React.useCallback((opsi: TanyaOpsi) => new Promise<string | null>((selesai) => setMinta({ jenis: 'tanya', opsi, selesai })), []);
  const tutup = () => setMinta(null);
  const elemen = minta ? (
    minta.jenis === 'konfirmasi' ? (
      <KonfirmasiAksi
        open
        {...minta.opsi}
        onOpenChange={(o) => {
          if (!o) {
            minta.selesai(false);
            tutup();
          }
        }}
        onKonfirmasi={() => {
          minta.selesai(true);
          tutup();
        }}
      />
    ) : (
      <KonfirmasiAksi
        open
        {...minta.opsi}
        isian={minta.opsi}
        onOpenChange={(o) => {
          if (!o) {
            minta.selesai(null);
            tutup();
          }
        }}
        onKonfirmasi={(nilai) => {
          minta.selesai(nilai ?? '');
          tutup();
        }}
      />
    )
  ) : null;
  return { konfirmasi, tanya, elemen };
}

export interface KonfirmasiAksiProps extends KonfirmasiOpsi {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Elemen pemicu (mis. <Button>). */
  trigger?: React.ReactElement;
  /** Minta isian teks sebelum konfirmasi (alasan, catatan). */
  isian?: Omit<TanyaOpsi, keyof KonfirmasiOpsi>;
  /**
   * Dijalankan saat tombol ditekan; boleh async (dialog menampilkan memuat). Lempar Error untuk menahan dialog dan
   * menampilkan pesannya di dalam dialog.
   */
  onKonfirmasi: (nilai?: string) => void | Promise<void>;
  children?: React.ReactNode;
}

/**
 * Dialog konfirmasi tindakan dengan pesan akibat, tombol berlabel kata kerja, status memuat, dan galat di dalam dialog.
 * Dengan `isian`, sekaligus meminta alasan/catatan yang divalidasi (pengganti `window.prompt`).
 */
export function KonfirmasiAksi({ open, onOpenChange, trigger, judul, keterangan, label, nada = 'bahaya', labelBatal = 'Batal', isian, onKonfirmasi, children }: KonfirmasiAksiProps) {
  const [teks, setTeks] = React.useState(isian?.nilaiAwal ?? '');
  const [galatIsian, setGalatIsian] = React.useState<string | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const idIsian = React.useId();
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setGalat(null);
          setGalatIsian(null);
        }
        onOpenChange?.(o);
      }}
      trigger={trigger}
      title={judul}
      description={keterangan}
      confirmLabel={label}
      cancelLabel={labelBatal}
      tone={NADA[nada]}
      onConfirm={async () => {
        setGalat(null);
        if (isian) {
          const g = periksaIsianTanya(teks, isian);
          setGalatIsian(g);
          if (g) throw new Error(g);
        }
        try {
          await onKonfirmasi(isian ? teks.trim() : undefined);
        } catch (e) {
          setGalat((e as Error)?.message || 'Tindakan gagal. Coba lagi.');
          throw e;
        }
      }}
    >
      {children || isian || galat ? (
        <div className="u-konfirmasi-isi">
          {children}
          {isian && (
            <Field label={isian.labelIsian} description={isian.bantuan} error={galatIsian ?? undefined} required={isian.wajib !== false}>
              {isian.panjang ? (
                <Textarea
                  id={idIsian}
                  rows={3}
                  value={teks}
                  placeholder={isian.placeholder}
                  maxLength={isian.maks}
                  onChange={(e) => {
                    setTeks(e.target.value);
                    if (galatIsian) setGalatIsian(null);
                  }}
                />
              ) : (
                <Input
                  id={idIsian}
                  value={teks}
                  placeholder={isian.placeholder}
                  maxLength={isian.maks}
                  onChange={(e) => {
                    setTeks(e.target.value);
                    if (galatIsian) setGalatIsian(null);
                  }}
                />
              )}
            </Field>
          )}
          {galat && galat !== galatIsian && (
            <p className="u-isian-pesan" data-tone="danger" role="alert">
              {galat}
            </p>
          )}
        </div>
      ) : null}
    </ConfirmDialog>
  );
}

// ================================================================ Aksi (definisi bersama)
export type NadaAksi = 'utama' | 'sekunder' | 'bahaya' | 'senyap';

export interface Aksi {
  /** Kunci unik (untuk key React dan uji). */
  kunci: string;
  /** Kata kerja + objek, mis. "Ajukan proposal". */
  label: string;
  ikon?: React.ReactNode;
  /** utama = satu per bilah; bahaya = merah dan wajib konfirmasi bila `konfirmasi` diisi. Bawaan sekunder. */
  nada?: NadaAksi;
  onClick?: () => unknown;
  /** Tautan (mis. ke halaman detail). */
  href?: string;
  /** Nonaktif; isi `alasan` agar pengguna tahu kenapa (tampil sebagai tooltip/keterangan). */
  nonaktif?: boolean;
  alasan?: string;
  /** Tampilkan spinner (dikelola sendiri saat onClick async). */
  memuat?: boolean;
  /** Minta konfirmasi dulu. */
  konfirmasi?: Omit<KonfirmasiOpsi, 'label'> & { label?: string };
  /** Sembunyikan (mis. tidak punya hak). Lebih baik daripada menampilkan tombol yang selalu gagal. */
  sembunyi?: boolean;
  /** Pintasan keyboard yang ditampilkan di tooltip/menu, mis. "Ctrl+S" (penanganannya di halaman). */
  pintasan?: string;
}

const NADA_TOMBOL: Record<NadaAksi, 'primary' | 'outline' | 'destructive' | 'ghost'> = { utama: 'primary', sekunder: 'outline', bahaya: 'destructive', senyap: 'ghost' };

/** Urutan baku: sekunder/senyap → bahaya → utama (utama paling kanan, dekat jempol dan arah baca). */
export function urutkanAksi(aksi: Aksi[]): Aksi[] {
  const bobot = (a: Aksi) => (a.nada === 'utama' ? 3 : a.nada === 'bahaya' ? 2 : a.nada === 'senyap' ? 0 : 1);
  return aksi.filter((a) => !a.sembunyi).sort((a, b) => bobot(a) - bobot(b));
}

function useJalankan(konfirmasi: (o: KonfirmasiOpsi) => Promise<boolean>) {
  const [sibuk, setSibuk] = React.useState<string | null>(null);
  const jalankan = async (a: Aksi) => {
    if (a.nonaktif || sibuk) return;
    if (a.konfirmasi && !(await konfirmasi({ nada: a.nada === 'bahaya' ? 'bahaya' : 'utama', ...a.konfirmasi, label: a.konfirmasi.label ?? a.label }))) return;
    if (!a.onClick) return;
    setSibuk(a.kunci);
    try {
      await a.onClick();
    } finally {
      setSibuk(null);
    }
  };
  return { sibuk, jalankan };
}

// ================================================================ BilahAksi
export interface BilahAksiProps {
  aksi: Aksi[];
  size?: ButtonSize;
  /** Jumlah tombol yang tetap tampil di layar sempit (sisanya masuk menu ⋯). Bawaan 1 (aksi utama). */
  tampilPonsel?: number;
  /** Rata: 'akhir' (kanan, bawaan untuk kepala halaman/kaki form) atau 'awal'. */
  rata?: 'awal' | 'akhir';
  /** Lebar penuh di ponsel (kaki panel samping). */
  penuhPonsel?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * Bilah tombol aksi standar untuk kepala halaman, kaki form, dan panel detail: ikon + label, satu aksi utama paling
 * kanan, aksi bahaya berkonfirmasi, alasan nonaktif sebagai tooltip, spinner saat async. Di ponsel, aksi selain
 * `tampilPonsel` teratas masuk menu ⋯ agar tidak meluap.
 */
export function BilahAksi({ aksi, size = 'md', tampilPonsel = 1, rata = 'akhir', penuhPonsel, className, 'aria-label': ariaLabel = 'Aksi' }: BilahAksiProps) {
  const { konfirmasi, elemen } = useKonfirmasi();
  const { sibuk, jalankan } = useJalankan(konfirmasi);
  const urut = urutkanAksi(aksi);
  // Yang tetap tampil di ponsel: dari kanan (utama dulu).
  const tetap = new Set(urut.slice(-tampilPonsel).map((a) => a.kunci));
  const lipat = urut.filter((a) => !tetap.has(a.kunci));
  return (
    <div className={cn('u-bilah-aksi', className)} role="group" aria-label={ariaLabel} data-rata={rata} data-penuh-ponsel={penuhPonsel ? '' : undefined}>
      {lipat.length > 0 && (
        <span className="u-bilah-aksi-lipat">
          <Menu
            align="start"
            trigger={
              <Button variant="outline" size={size} iconOnly aria-label="Aksi lainnya">
                <MoreHorizontal />
              </Button>
            }
            items={lipat.map((a) => keMenuEntry(a, () => jalankan(a)))}
          />
        </span>
      )}
      {urut.map((a) => {
        const tombol = (
          <Button
            key={a.kunci}
            variant={NADA_TOMBOL[a.nada ?? 'sekunder']}
            size={size}
            disabled={a.nonaktif}
            aria-disabled={a.nonaktif || undefined}
            loading={a.memuat || sibuk === a.kunci}
            className={tetap.has(a.kunci) ? undefined : 'u-bilah-aksi-lebar'}
            render={a.href && !a.nonaktif ? <a href={a.href} /> : undefined}
            onClick={a.href ? undefined : () => void jalankan(a)}
          >
            {a.ikon}
            {a.label}
          </Button>
        );
        return a.nonaktif && a.alasan ? (
          <Tooltip key={a.kunci} content={a.alasan}>
            <span className={cn('u-bilah-aksi-bungkus', !tetap.has(a.kunci) && 'u-bilah-aksi-lebar')} tabIndex={0} aria-label={`${a.label}: ${a.alasan}`}>
              {tombol}
            </span>
          </Tooltip>
        ) : a.pintasan ? (
          <Tooltip key={a.kunci} content={a.label} shortcut={a.pintasan}>
            {tombol}
          </Tooltip>
        ) : (
          tombol
        );
      })}
      {elemen}
    </div>
  );
}

/** Ubah Aksi menjadi butir Menu (dipakai BilahAksi dan MenuAksiBaris; bisa juga untuk `DataTable.rowActions`). */
export function keMenuEntry(a: Aksi, jalankan: () => void): MenuEntry {
  return {
    label: a.nonaktif && a.alasan ? `${a.label} (${a.alasan})` : a.label,
    icon: a.ikon,
    shortcut: a.pintasan,
    disabled: a.nonaktif,
    destructive: a.nada === 'bahaya',
    href: a.href && !a.nonaktif ? a.href : undefined,
    onSelect: a.href ? undefined : jalankan,
  };
}

// ================================================================ MenuAksiBaris
export interface MenuAksiBarisProps {
  aksi: Aksi[];
  /** Nama data di baris ini untuk label aksesibel, mis. nama mahasiswa. Hasilnya "Aksi untuk Siti Aminah". */
  nama?: string;
  size?: ButtonSize;
  /** Aksi utama yang ditampilkan sebagai tombol di samping ⋯ (mis. "Buka"). */
  utama?: Aksi;
  className?: string;
}

/**
 * Menu ⋯ di ujung baris tabel/kartu: aksi bahaya dipisah garis di bawah dan berkonfirmasi, alasan nonaktif tampil,
 * label aksesibel menyebut nama baris. Bila tidak ada aksi yang boleh, menu tidak dirender.
 */
export function MenuAksiBaris({ aksi, nama, size = 'sm', utama, className }: MenuAksiBarisProps) {
  const { konfirmasi, elemen } = useKonfirmasi();
  const { sibuk, jalankan } = useJalankan(konfirmasi);
  const tampil = aksi.filter((a) => !a.sembunyi);
  const biasa = tampil.filter((a) => a.nada !== 'bahaya');
  const bahaya = tampil.filter((a) => a.nada === 'bahaya');
  const items: MenuEntry[] = [...biasa.map((a) => keMenuEntry(a, () => void jalankan(a))), ...(biasa.length && bahaya.length ? [{ type: 'separator' as const }] : []), ...bahaya.map((a) => keMenuEntry(a, () => void jalankan(a)))];
  if (!items.length && !utama) return null;
  return (
    <span className={cn('u-menu-aksi-baris', className)} onClick={(e) => e.stopPropagation()}>
      {utama && !utama.sembunyi && (
        <Button variant="ghost" size={size} disabled={utama.nonaktif} loading={sibuk === utama.kunci} render={utama.href ? <a href={utama.href} /> : undefined} onClick={utama.href ? undefined : () => void jalankan(utama)}>
          {utama.ikon}
          {utama.label}
        </Button>
      )}
      {items.length > 0 && (
        <Menu
          trigger={
            <Button variant="ghost" size={size} iconOnly aria-label={nama ? `Aksi untuk ${nama}` : 'Aksi baris'} loading={sibuk !== null && sibuk !== utama?.kunci}>
              <MoreHorizontal />
            </Button>
          }
          items={items}
        />
      )}
      {elemen}
    </span>
  );
}
