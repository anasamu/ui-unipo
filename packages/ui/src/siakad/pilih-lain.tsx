'use client';
import * as React from 'react';
import { Mail } from 'lucide-react';
import { MultiPilih } from '../components/multi-pilih';
import { OptionContent } from '../components/select';
import type { ControlSize } from '../components/forms';
import { Avatar } from '../components/display';
import { useOptionalSiakad } from './provider';
import { PilihEntitas, SUMBER_ENTITAS, type JenisEntitas, type SumberEntitas } from './pilih';

type Baris = Record<string, unknown>;
const teks = (v: unknown) => (v == null ? '' : String(v));

// ================================================================ PilihEntitasBanyak
export interface PilihEntitasBanyakProps {
  jenis: JenisEntitas | SumberEntitas;
  /** Daftar nilai kunci (NIM, username, ID). */
  value?: Array<string | number>;
  defaultValue?: Array<string | number>;
  onValueChange?: (nilai: string[], baris: Baris[]) => void;
  query?: Record<string, string | number | boolean | undefined>;
  /** Ganti pemuat (data contoh/uji). */
  load?: (q: string, signal: AbortSignal) => Promise<Baris[]>;
  /** Baris yang tidak boleh dipilih beserta alasannya, mis. anggota tim sendiri. */
  tidakBoleh?: (baris: Baris) => string | null | undefined;
  maks?: number;
  limit?: number;
  placeholder?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
  readOnly?: boolean;
  galat?: string | null;
  size?: ControlSize;
  className?: string;
  'aria-label'?: string;
}

/**
 * Pilih banyak data rujukan (mahasiswa, dosen, pengguna, unit, ...) dengan pencarian server dan chip berisi nama.
 * Nilai tetap kunci (NIM/username/ID). Pengganti daftar checkbox buatan sendiri dan Textarea "satu NIM per baris".
 */
export function PilihEntitasBanyak({ jenis, value, defaultValue, onValueChange, query, load, tidakBoleh, maks, limit = 20, placeholder, ...rest }: PilihEntitasBanyakProps) {
  const siakad = useOptionalSiakad();
  const src: SumberEntitas = typeof jenis === 'string' ? SUMBER_ENTITAS[jenis] : jenis;
  const kunciDari = React.useCallback((r: Baris) => teks(r[src.kunci]), [src.kunci]);
  const q = JSON.stringify(query ?? {});
  const [dalam, setDalam] = React.useState<string[]>((defaultValue ?? []).map(String));
  const kunci = value ? value.map(String) : dalam;
  const [kenal, setKenal] = React.useState<Record<string, Baris>>({});

  const ambil = React.useCallback(
    async (kata: string, signal: AbortSignal, ekstra: Record<string, unknown> = {}): Promise<Baris[]> => {
      if (load) return load(kata, signal);
      if (!siakad) throw new Error('SDK belum dipasang di <UnipoProvider>.');
      const r = await siakad.request<Baris[]>({ method: 'GET', path: src.path, query: { ...src.query, ...JSON.parse(q), q: kata || undefined, per_page: limit, ...ekstra } }, { signal });
      return Array.isArray(r.data) ? r.data : [];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [siakad, load, src.path, q, limit],
  );

  // Nilai awal yang belum dikenal → muat barisnya satu per satu agar chip menampilkan nama, bukan kode.
  const belum = kunci.filter((k) => !kenal[k]).join('|');
  React.useEffect(() => {
    if (!belum) return;
    const ctrl = new AbortController();
    for (const k of belum.split('|')) {
      (async () => {
        if (src.satu && siakad && !load) return (await siakad.request<Baris>({ method: 'GET', path: src.satu, query: { id: k } }, { signal: ctrl.signal })).data;
        const rows = await ambil(src.saringKunci ? '' : k, ctrl.signal, src.saringKunci ? { [src.saringKunci]: k } : {});
        return rows.find((r) => kunciDari(r) === k) ?? null;
      })()
        .then((r) => !ctrl.signal.aborted && r && setKenal((m) => ({ ...m, [k]: r })))
        .catch(() => undefined);
    }
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [belum]);

  const baris = kunci.map((k) => kenal[k] ?? { [src.kunci]: k, __stub: true });
  const label = (r: Baris) => (r.__stub ? 'Memuat…' : src.judul(r) || kunciDari(r));
  return (
    <MultiPilih<Baris>
      {...rest}
      maks={maks}
      placeholder={placeholder ?? src.placeholder ?? `Cari ${src.nama}`}
      loadItems={ambil}
      value={baris}
      onValueChange={(rows) => {
        setKenal((m) => Object.fromEntries([...Object.entries(m), ...rows.map((r) => [kunciDari(r), r] as const)]));
        const ks = rows.map(kunciDari);
        setDalam(ks);
        onValueChange?.(ks, rows);
      }}
      itemToString={label}
      itemKey={kunciDari}
      itemDisabled={tidakBoleh}
      emptyText={`Tidak ada ${src.nama} yang cocok.`}
      renderItem={(r) =>
        src.tampil ? (
          src.tampil(r)
        ) : (
          <span className="u-pilih-entitas-butir">
            {src.avatar && <Avatar name={label(r)} src={typeof r.foto === 'string' ? r.foto : undefined} size="sm" />}
            <OptionContent title={label(r)} meta={src.meta?.(r)} />
          </span>
        )
      }
    />
  );
}

// ================================================================ PilihPengguna
export type PilihPenggunaProps =
  | ({ banyak?: false; value?: string | null; defaultValue?: string | null; onValueChange?: (username: string | null, baris: Baris | null) => void } & DasarPengguna)
  | ({ banyak: true } & Omit<PilihEntitasBanyakProps, 'jenis'>);

interface DasarPengguna {
  query?: Record<string, string | number | boolean | undefined>;
  load?: (q: string, signal: AbortSignal) => Promise<Baris[]>;
  placeholder?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
  size?: ControlSize;
  className?: string;
  'aria-label'?: string;
}

/**
 * Pilih akun pengguna (mahasiswa, dosen, tendik) dari nama, username, atau email; nilainya username. `banyak`
 * untuk memilih beberapa akun sekaligus (tim, penerima, reviewer). Pengganti isian "Username SIAKAD" yang diketik.
 */
export function PilihPengguna(props: PilihPenggunaProps) {
  if (props.banyak) {
    const { banyak: _b, ...p } = props;
    return <PilihEntitasBanyak jenis="pengguna" {...p} />;
  }
  const { banyak: _b, ...p } = props;
  return <PilihEntitas jenis="pengguna" {...p} />;
}

// ================================================================ PilihSurat
export interface SuratRingkas {
  id?: number | string;
  nomor_surat: string;
  perihal?: string | null;
  tanggal_surat?: string | null;
  arah?: string | null;
  unit_nama?: string | null;
  pengirim_nama?: string | null;
  pengirim_instansi?: string | null;
}

export interface PilihSuratProps {
  /** Nomor surat terpilih. */
  value?: string | null;
  onValueChange?: (nomor: string | null, surat: SuratRingkas | null) => void;
  /** Batasi arah: 'masuk' atau 'keluar'. Bawaan keduanya. */
  arah?: 'masuk' | 'keluar';
  /** Saringan tambahan ke /v1/arsip/surat (mis. `{ unit_id: 12, tahun: 2026 }`). */
  query?: Record<string, string | number | boolean | undefined>;
  load?: (q: string, signal: AbortSignal) => Promise<SuratRingkas[]>;
  placeholder?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
  size?: ControlSize;
  className?: string;
  'aria-label'?: string;
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const tgl = (s: unknown) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(teks(s));
  return m ? `${Number(m[3])} ${BULAN[Number(m[2]) - 1]} ${m[1]}` : '';
};

/**
 * Pilih surat dari registri arsip (GET /v1/arsip/surat) berdasarkan nomor atau perihal; hanya surat yang sudah bernomor
 * dan boleh dilihat pengguna. Nilainya nomor surat (tidak membuka detail, jadi surat tidak ikut tertandai dibaca).
 * Untuk SK yang disimpan sebagai rujukan berversi, pakai {@link PilihNomorSK}/PilihSK.
 */
export function PilihSurat({ value, onValueChange, arah, query, load, placeholder = 'Cari nomor atau perihal surat', ...rest }: PilihSuratProps) {
  const siakad = useOptionalSiakad();
  const q = JSON.stringify(query ?? {});
  const muat = React.useCallback(
    async (kata: string, signal: AbortSignal): Promise<Baris[]> => {
      let rows: Baris[];
      if (load) rows = (await load(kata, signal)) as unknown as Baris[];
      else if (siakad) rows = (await siakad.request<Baris[]>({ method: 'GET', path: '/v1/arsip/surat', query: { ...JSON.parse(q), arah, q: kata || undefined, per_page: 20, urut: 'terbaru' } }, { signal })).data ?? [];
      else throw new Error('SDK belum dipasang di <UnipoProvider>.');
      return (Array.isArray(rows) ? rows : []).filter((r) => r.nomor_surat);
    },
    [siakad, load, arah, q],
  );
  const sumber: SumberEntitas = React.useMemo(
    () => ({
      nama: 'surat',
      path: '/v1/arsip/surat',
      kunci: 'nomor_surat',
      judul: (r) => teks(r.perihal) || teks(r.nomor_surat),
      meta: (r) => [r.nomor_surat, tgl(r.tanggal_surat), r.arah === 'masuk' ? [r.pengirim_nama, r.pengirim_instansi].filter(Boolean).join(', ') : r.unit_nama].filter(Boolean).join(' · '),
      ikon: <Mail size={14} />,
    }),
    [],
  );
  return <PilihEntitas jenis={sumber} value={value} onValueChange={(v, r) => onValueChange?.(v, (r as unknown as SuratRingkas) ?? null)} load={muat} placeholder={placeholder} {...rest} />;
}
