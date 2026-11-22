'use client';
import * as React from 'react';
import { Inbox, Plus } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './actions';
import { Sheet } from './overlays';

/**
 * Pola "pilihan kosong" untuk semua pemilih (Select, Combobox, Pilihan, PilihEntitas, pemilih SIAKAD): bila data yang
 * dipilih belum ada, pengguna yang berhak langsung bisa membuatnya dari pemilih itu sendiri (tombol di dalam daftar dan
 * di {@link InfoPilihanKosong}), lewat panel samping. Setelah tersimpan, data baru langsung terpilih dan fokus kembali
 * ke pemilih. Pengguna yang tidak berhak tidak melihat tombol, hanya keterangan siapa yang mengelola data itu.
 *
 * ```tsx
 * const buat: BuatPilihan<SelectOption> = {
 *   label: 'Mulai siklus baru',
 *   nama: 'siklus mutu',
 *   boleh: akses.admin_spmi,
 *   pengelola: 'LPM',
 *   panel: ({ selesai }) => <FormSiklus onTersimpan={(p) => selesai({ value: String(p.id), label: p.nama })} onBatal={() => selesai(null)} />,
 *   segarkan: () => qc.invalidateQueries({ queryKey: ['spmi', 'periode'] }),
 * };
 * <Select id="siklus" options={opsi} value={id} onValueChange={setId} memuat={q.isLoading} buat={buat} />
 * <InfoPilihanKosong buat={buat} kosong={!opsi.length} memuat={q.isLoading} fokusKe="siklus" onDibuat={(o) => setId(o.value)} />
 * ```
 */
export interface BuatPilihan<T = unknown> {
  /**
   * Teks tombol, kata kerja + nama data, mis. "Mulai siklus baru", "Tambah kategori". Bentuk fungsi menerima kata yang
   * sedang dicari (pemilih bercari), mis. `(k) => k ? \`Tambah instansi “${k}”\` : 'Tambah instansi'`.
   */
  label?: React.ReactNode | ((kata: string) => React.ReactNode);
  /** Pengguna ini berhak membuat data (hak dari server/RBAC). false = tanpa tombol, tampil keterangan pengelola. */
  boleh: boolean;
  /** Unit/peran yang mengelola data ini, untuk yang tidak berhak, mis. "LPM", "BAAK", "admin prodi". */
  pengelola?: React.ReactNode;
  /** Nama data dalam bahasa awam (huruf kecil), mis. "siklus mutu", "kategori surat". Dipakai di teks kosong. */
  nama?: string;
  /** Teks kosong sendiri. Bawaan: "Belum ada <nama>." */
  teksKosong?: React.ReactNode;
  /** Judul panel samping. Bawaan: teks tombol. */
  judul?: React.ReactNode;
  /** Keterangan singkat di bawah judul panel. */
  keterangan?: React.ReactNode;
  /** Lebar panel samping. Bawaan "md". */
  ukuranPanel?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Isi panel samping: formulir pembuatan. Panggil `selesai(baru)` setelah tersimpan (data baru langsung terpilih)
   * atau `selesai(null)` untuk batal. `kata` = teks yang sedang dicari, untuk mengisi awal nama.
   */
  panel?: (ctx: { kata: string; selesai: (baru: T | null) => void }) => React.ReactNode;
  /**
   * Tanpa panel: buat langsung (mis. simpan kata yang diketik) atau buka alur sendiri. Kembalikan data baru (boleh
   * Promise) agar langsung terpilih; null/undefined = tidak ada yang dipilih.
   */
  onBuat?: (kata: string) => T | null | void | Promise<T | null | void>;
  /** Dipanggil setelah data baru tersimpan, untuk memperbarui daftar (mis. invalidate query). */
  segarkan?: () => unknown;
  /** Tombol di daftar hanya muncul saat daftar/hasil cari kosong. Bawaan false: selalu di akhir daftar. */
  hanyaKosong?: boolean;
}

/** Teks kosong: "Belum ada siklus mutu." / teksKosong / bawaan. */
export function teksKosongPilihan(buat: Pick<BuatPilihan, 'nama' | 'teksKosong'> | undefined, bawaan: React.ReactNode = 'Belum ada pilihan.'): React.ReactNode {
  if (buat?.teksKosong != null) return buat.teksKosong;
  if (buat?.nama) return `Belum ada ${buat.nama}.`;
  return bawaan;
}

/** "Data ini dikelola LPM." untuk yang tidak berhak; null bila berhak atau pengelola tidak diisi. */
export function teksPengelolaPilihan(buat: Pick<BuatPilihan, 'boleh' | 'pengelola'> | undefined): React.ReactNode {
  if (!buat || buat.boleh || buat.pengelola == null || buat.pengelola === '') return null;
  return <>Data ini dikelola {buat.pengelola}.</>;
}

/** Teks tombol buat untuk kata cari tertentu. */
export function labelBuatPilihan(buat: Pick<BuatPilihan, 'label' | 'nama'>, kata = ''): React.ReactNode {
  const k = kata.trim();
  if (typeof buat.label === 'function') return buat.label(k);
  if (buat.label != null) return buat.label;
  const nama = buat.nama ?? 'data';
  return k ? `Tambah ${nama} “${k}”` : `Tambah ${nama} baru`;
}

export type FokusPemilih = string | React.RefObject<HTMLElement | null> | null | undefined;

function elemenFokus(f: FokusPemilih): HTMLElement | null {
  if (!f) return null;
  if (typeof f === 'string') return typeof document === 'undefined' ? null : document.getElementById(f);
  return f.current;
}

function fokuskan(f: FokusPemilih) {
  const run = () => elemenFokus(f)?.focus();
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
  else setTimeout(run, 0);
}

export interface OpsiBuatPilihan<T> {
  /** Data baru tersimpan: pilih di pemilih. */
  onDibuat?: (baru: T) => void;
  /** Elemen pemilih (id atau ref) yang difokus setelah panel tertutup. */
  fokusKe?: FokusPemilih;
}

/**
 * Mesin bersama pola pilihan kosong: `mulai(kata)` membuka panel samping (atau menjalankan `onBuat`), `elemen` adalah
 * panel yang harus dirender. Setelah tersimpan: `segarkan()`, `onDibuat(baru)`, lalu fokus kembali ke pemilih.
 */
export function useBuatPilihan<T>(buat: BuatPilihan<T> | undefined, { onDibuat, fokusKe }: OpsiBuatPilihan<T> = {}) {
  const [panel, setPanel] = React.useState<{ kata: string } | null>(null);
  const [sibuk, setSibuk] = React.useState(false);
  const terbaru = React.useRef({ buat, onDibuat, fokusKe });
  terbaru.current = { buat, onDibuat, fokusKe };

  const terima = React.useCallback((baru: T | null | void) => {
    const { buat: b, onDibuat: d } = terbaru.current;
    if (baru == null) return;
    b?.segarkan?.();
    d?.(baru);
  }, []);

  const mulai = React.useCallback(
    async (kata = '') => {
      const b = terbaru.current.buat;
      if (!b?.boleh) return;
      if (b.panel) return setPanel({ kata: kata.trim() });
      if (!b.onBuat) return;
      setSibuk(true);
      try {
        terima(await b.onBuat(kata.trim()));
      } finally {
        setSibuk(false);
        fokuskan(terbaru.current.fokusKe);
      }
    },
    [terima],
  );

  const selesai = React.useCallback(
    (baru: T | null) => {
      setPanel(null);
      terima(baru);
      // Dialog mengembalikan fokus lewat finalFocus; ini cadangan bila panel tertutup tanpa animasi.
      fokuskan(terbaru.current.fokusKe);
    },
    [terima],
  );

  const elemen =
    buat?.boleh && buat.panel ? (
      <Sheet
        open={Boolean(panel)}
        onOpenChange={(o) => !o && selesai(null)}
        title={buat.judul ?? labelBuatPilihan(buat, '')}
        description={buat.keterangan}
        size={buat.ukuranPanel ?? 'md'}
        finalFocus={() => elemenFokus(terbaru.current.fokusKe) ?? true}
      >
        {panel && buat.panel({ kata: panel.kata, selesai })}
      </Sheet>
    ) : null;

  return { mulai, selesai, elemen, terbuka: Boolean(panel), sibuk };
}

export interface InfoPilihanKosongProps<T> extends OpsiBuatPilihan<T> {
  buat: BuatPilihan<T>;
  /** Daftar pilihan memang kosong. Bawaan true (pasang hanya saat kosong). */
  kosong?: boolean;
  /** Sedang memuat: kotak tidak tampil (memuat bukan kosong). */
  memuat?: boolean;
  /** Ada galat pemuatan: kotak tidak tampil (galat ditampilkan pemanggil, mis. GalatApi). */
  galat?: unknown;
  /** Judul kotak. Bawaan teks kosong ("Belum ada siklus mutu."). */
  judul?: React.ReactNode;
  /** Penjelasan singkat untuk yang berhak, mis. "Buat siklus tahun ini agar unit bisa mulai mengisi." */
  children?: React.ReactNode;
  /**
   * samping: satu baris setinggi isian, diletakkan sebaris dengan pemilih (align-items: end).
   * bawah (bawaan): kotak selebar wadah di bawah pemilih.
   */
  letak?: 'samping' | 'bawah';
  className?: string;
}

/**
 * Kotak info keadaan kosong untuk pemilih. Berhak: teks + tombol buat (panel samping yang sama dengan tombol di daftar).
 * Tidak berhak: teks + "Data ini dikelola …". Tidak tampil selama memuat atau galat.
 */
export function InfoPilihanKosong<T>({ buat, kosong = true, memuat, galat, judul, children, letak = 'bawah', className, onDibuat, fokusKe }: InfoPilihanKosongProps<T>) {
  const b = useBuatPilihan(buat, { onDibuat, fokusKe });
  if (!kosong || memuat || galat) return b.elemen;
  const pengelola = teksPengelolaPilihan(buat);
  return (
    <>
      <div className={cn('u-info-pilihan-kosong', className)} data-letak={letak} data-boleh={buat.boleh ? '' : undefined} role="status">
        <span className="u-info-pilihan-kosong-ikon" aria-hidden>
          <Inbox />
        </span>
        <span className="u-info-pilihan-kosong-teks">
          <strong>{judul ?? teksKosongPilihan(buat)}</strong>
          {buat.boleh ? children && <span>{children}</span> : pengelola && <span>{pengelola}</span>}
        </span>
        {buat.boleh && (
          <Button size="sm" className="u-info-pilihan-kosong-aksi" loading={b.sibuk} onClick={() => void b.mulai('')}>
            <Plus aria-hidden />
            {labelBuatPilihan(buat, '')}
          </Button>
        )}
      </div>
      {b.elemen}
    </>
  );
}
