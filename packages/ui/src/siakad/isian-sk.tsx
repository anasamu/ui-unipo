'use client';
import * as React from 'react';
import { FilePlus2, FileText, ScrollText } from 'lucide-react';
import { Combobox, OptionContent } from '../components/select';
import { DatePicker } from '../components/calendar';
import { Field, type ControlSize } from '../components/forms';
import { cn } from '../lib/cn';
import { formatDate } from '../lib/format';
import { CariAtauUnggahDokumen } from './cari-dokumen';
import { useOptionalSiakad } from './provider';

/** Satu SK yang ditemukan: dari arsip surat keluar, data aplikasi (mis. nomor_sk penugasan), atau nomor baru. */
export interface SKDitemukan {
  nomor: string;
  tanggal?: string | null;
  perihal?: string | null;
  /** Sumber singkat untuk ditampilkan, mis. "Arsip Biro Umum" atau "Penugasan peran". */
  asal?: string | null;
  /** UUID /v1/berkas bila berkas SK sudah diketahui. */
  berkas_id?: string | null;
  /** True bila nomor diketik baru (belum ada di arsip). */
  baru?: boolean;
  asli?: unknown;
}

/** Nilai {@link IsianSK}: nomor, tanggal, dan berkas SK. */
export interface NilaiSK {
  nomor: string;
  tanggal?: string | null;
  berkas_id?: string | null;
  perihal?: string | null;
}

const isoKeTanggal = (s?: string | null) => (s ? new Date(`${s.slice(0, 10)}T00:00:00`) : null);
const tanggalKeIso = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null);

/**
 * Cari SK di arsip surat keluar (GET /v1/arsip/surat-keluar?q=). Diam bila akun tidak punya akses arsip, agar sumber
 * lain tetap tampil.
 */
export function useCariSKArsip(aktif = true) {
  const siakad = useOptionalSiakad();
  return React.useCallback(
    async (q: string, signal: AbortSignal): Promise<SKDitemukan[]> => {
      if (!siakad || !aktif) return [];
      try {
        const r = await siakad.request<Array<Record<string, unknown>>>({ method: 'GET', path: '/v1/arsip/surat-keluar', query: { q: q || undefined, per_page: 15, urut: 'terbaru' } }, { signal });
        return (Array.isArray(r.data) ? r.data : [])
          .filter((s) => s.nomor_surat)
          .map((s) => ({
            nomor: String(s.nomor_surat),
            tanggal: (s.tanggal_surat as string) ?? null,
            perihal: (s.perihal as string) ?? null,
            asal: s.unit_nama ? `Arsip ${String(s.unit_nama)}` : 'Arsip surat',
            asli: s,
          }));
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') throw e;
        return [];
      }
    },
    [siakad, aktif],
  );
}

export interface PilihNomorSKProps {
  /** Nomor SK terpilih. */
  value?: string | null;
  onValueChange?: (nomor: string | null, sk: SKDitemukan | null) => void;
  /** Sumber tambahan, mis. nomor_sk yang sudah dipakai di tabel aplikasi Anda. Hasilnya digabung dengan arsip. */
  cari?: (q: string, signal: AbortSignal) => Promise<SKDitemukan[]>;
  /** Cari juga di arsip surat keluar (/v1/arsip/surat-keluar). Bawaan true. */
  arsip?: boolean;
  /** Boleh memakai nomor baru yang belum ada di daftar. Bawaan true. */
  bolehBaru?: boolean;
  placeholder?: string;
  disabled?: boolean;
  size?: ControlSize;
  id?: string;
  className?: string;
}

/**
 * Isian nomor SK yang bisa dicari: ketik sebagian nomor atau perihal, pilih SK yang sudah tercatat (arsip surat keluar
 * dan sumber aplikasi), atau pakai nomor baru bila belum ada. Pengganti kolom teks "Nomor SK" yang diketik manual.
 */
export function PilihNomorSK({ value, onValueChange, cari, arsip = true, bolehBaru = true, placeholder = 'Cari nomor atau perihal SK', disabled, size, id, className }: PilihNomorSKProps) {
  const cariArsip = useCariSKArsip(arsip);
  const [item, setItem] = React.useState<SKDitemukan | null>(value ? { nomor: value } : null);
  React.useEffect(() => {
    if ((value ?? null) !== (item?.nomor ?? null)) setItem(value ? { nomor: value } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const muat = React.useCallback(
    async (q: string, signal: AbortSignal) => {
      const [a, b] = await Promise.all([cariArsip(q, signal), cari ? cari(q, signal).catch(() => []) : Promise.resolve([])]);
      const lihat = new Set<string>();
      return [...b, ...a].filter((s) => {
        const k = s.nomor.trim().toLowerCase();
        if (!k || lihat.has(k)) return false;
        lihat.add(k);
        return true;
      });
    },
    [cariArsip, cari],
  );
  return (
    <Combobox<SKDitemukan>
      id={id}
      className={cn('u-pilih-sk', className)}
      size={size}
      disabled={disabled}
      placeholder={placeholder}
      icon={<ScrollText />}
      loadItems={muat}
      value={item}
      onValueChange={(s) => {
        setItem(s);
        onValueChange?.(s?.nomor ?? null, s);
      }}
      itemToString={(s) => s.nomor}
      itemKey={(s) => `${s.baru ? 'baru:' : ''}${s.nomor}`}
      emptyText="Belum ada SK yang cocok."
      renderItem={(s) => (
        <>
          <span className="u-option-media" data-shape="square">
            {s.baru ? <FilePlus2 size={14} /> : <FileText size={14} />}
          </span>
          <OptionContent title={s.nomor} meta={[s.perihal, s.tanggal && formatDate(s.tanggal), s.asal].filter(Boolean).join(' · ') || undefined} />
        </>
      )}
      tambah={
        bolehBaru
          ? {
              label: (k) => (k.trim() ? `Pakai nomor baru “${k.trim()}”` : 'Ketik nomor SK baru'),
              onTambah: (k) => (k.trim() ? { nomor: k.trim(), baru: true } : null),
            }
          : undefined
      }
    />
  );
}

export interface IsianSKProps extends Omit<PilihNomorSKProps, 'value' | 'onValueChange'> {
  value?: NilaiSK | null;
  onValueChange?: (nilai: NilaiSK | null) => void;
  /** Tampilkan tanggal SK. Bawaan true. */
  tanggal?: boolean;
  /** Tampilkan unggah/pilih berkas SK. Bawaan true. */
  berkas?: boolean;
  /** Label kelompok. Bawaan "Nomor SK". */
  label?: React.ReactNode;
  required?: boolean;
  error?: string;
  /** Ekstensi berkas SK. Bawaan PDF dan gambar. */
  accept?: string;
}

/**
 * Nomor SK (cari dari arsip/aplikasi atau nomor baru) + tanggal + berkas SK (cari di "Berkas saya" atau unggah, termasuk
 * kamera/galeri di HP). Simpan `berkas_id` sebagai lampiran baris Anda, mis. POST /v1/rbac/penugasan/{id}/berkas.
 */
export function IsianSK({ value, onValueChange, tanggal = true, berkas = true, label = 'Nomor SK', required, error, accept = '.pdf,.jpg,.jpeg,.png', className, ...pilih }: IsianSKProps) {
  const v = value ?? null;
  const set = (patch: Partial<NilaiSK>) => {
    const n = { nomor: v?.nomor ?? '', ...v, ...patch };
    onValueChange?.(n.nomor || n.berkas_id ? n : null);
  };
  return (
    <div className={cn('u-isian-sk', className)}>
      <Field label={label} required={required} error={error} description="Cari SK yang sudah tercatat, atau ketik nomor baru.">
        <PilihNomorSK
          {...pilih}
          value={v?.nomor || null}
          onValueChange={(nomor, sk) => {
            if (!nomor) return onValueChange?.(v?.berkas_id ? { nomor: '', berkas_id: v.berkas_id, tanggal: v.tanggal } : null);
            set({ nomor, tanggal: sk?.tanggal ?? v?.tanggal ?? null, perihal: sk?.perihal ?? null, berkas_id: sk?.berkas_id ?? v?.berkas_id ?? null });
          }}
        />
      </Field>
      {(tanggal || berkas) && (
        <div className="u-isian-sk-rinci">
          {tanggal && (
            <Field label="Tanggal SK" optional>
              <DatePicker value={isoKeTanggal(v?.tanggal)} onValueChange={(d) => set({ tanggal: tanggalKeIso(d) })} placeholder="Tanggal SK" />
            </Field>
          )}
          {berkas && (
            <Field label="Berkas SK" optional>
              <CariAtauUnggahDokumen value={v?.berkas_id ?? null} onValueChange={(id) => set({ berkas_id: id })} accept={accept} kategori="sk" placeholder="Cari atau unggah berkas SK" />
            </Field>
          )}
        </div>
      )}
    </div>
  );
}
