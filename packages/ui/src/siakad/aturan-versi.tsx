'use client';
import * as React from 'react';
import { Badge, Skeleton } from '../components/actions';
import { Field } from '../components/forms';
import { Select } from '../components/select';
import { Sheet } from '../components/overlays';
import { useSiakad, useSiakadQuery } from './provider';

/*
 * Komponen bersama aturan BERVERSI (SIAKAD Sdm\Services\AturanVersi, tabel sdm_aturan_versi; dipakai Aturan BKD dan
 * jenis lain seperti Aturan karier). `basis` = alamat API koleksi versi jenis itu, mis. `/v1/sdm/bkd/aturan`, yang
 * menyediakan: GET basis (daftar), GET basis/{id} (detail), GET basis/{id}/banding?dengan=, POST basis/{id}/salin,
 * POST basis/{id}/terbitkan|arsipkan|hapus, PUT basis/{id}.
 *
 *   DaftarVersiAturan       daftar versi (nama, status, versi, berlaku mulai, pemakai, SK) untuk dipilih
 *   DaftarPerubahanAturan   perubahan antar versi {jalur, judul, lama, baru, jenis}
 *   PanelBandingAturan      panel samping: banding versi ini dengan versi lain
 *   LencanaStatusVersi      draf / terbit / arsip
 */

export interface PerubahanAturan {
  jalur: string;
  judul: string;
  lama: unknown;
  baru: unknown;
  jenis: 'tambah' | 'hapus' | 'ubah';
}

export interface VersiAturanRow {
  id: number;
  jenis?: string;
  nama: string;
  versi: number;
  induk_id: number | null;
  status: 'draf' | 'terbit' | 'arsip';
  dasar_hukum: string | null;
  berlaku_mulai: string | null;
  berlaku_mulai_nama?: string | null;
  catatan_perubahan: string | null;
  diterbitkan_at: string | null;
  jumlah_periode?: number;
  sk?: { id: string; nomor: string; tanggal?: string | null; perihal?: string | null } | null;
}

const STATUS_VERSI: Record<VersiAturanRow['status'], [string, React.ComponentProps<typeof Badge>['variant']]> = {
  draf: ['Draf', 'warning'],
  terbit: ['Terbit', 'success'],
  arsip: ['Arsip', 'neutral'],
};
export const labelStatusVersi = (s: VersiAturanRow['status']) => STATUS_VERSI[s]?.[0] ?? s;

export function LencanaStatusVersi({ status, children }: { status: VersiAturanRow['status']; children?: React.ReactNode }) {
  const [l, v] = STATUS_VERSI[status] ?? [status, 'neutral'];
  return (
    <Badge variant={v} dot>
      {l}
      {children}
    </Badge>
  );
}

const nilaiTeks = (v: unknown) => (v === null || v === undefined || v === '' ? 'kosong' : typeof v === 'boolean' ? (v ? 'ya' : 'tidak') : String(v));

/** Daftar versi aturan satu jenis. Kunci cache: ['aturan-versi', basis] (+ invalidateSiakad dari pemakai). */
export function useVersiAturan(basis: string, kunci: ReadonlyArray<unknown> = ['aturan-versi', basis]) {
  return useSiakadQuery<VersiAturanRow[]>(kunci, (s, signal) => s.request<VersiAturanRow[]>({ method: 'GET', path: basis }, { signal }));
}

export function DaftarPerubahanAturan({ perubahan, kosong = 'Tidak ada perubahan isi.' }: { perubahan: PerubahanAturan[]; kosong?: React.ReactNode }) {
  if (!perubahan.length) return <p className="u-bkd-keterangan">{kosong}</p>;
  return (
    <ul className="u-bkd-perubahan">
      {perubahan.map((p) => (
        <li key={p.jalur} data-jenis={p.jenis}>
          <span className="u-bkd-perubahan-judul">{p.judul}</span>
          <span className="u-bkd-perubahan-nilai">
            {p.jenis === 'tambah' ? (
              <ins>{nilaiTeks(p.baru)}</ins>
            ) : p.jenis === 'hapus' ? (
              <del>{nilaiTeks(p.lama)}</del>
            ) : (
              <>
                <del>{nilaiTeks(p.lama)}</del> → <ins>{nilaiTeks(p.baru)}</ins>
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Daftar versi untuk dipilih (kolom kiri halaman aturan). `satuanPemakai` mis. "periode" atau "usulan". */
export function DaftarVersiAturan({ versi, value, onValueChange, satuanPemakai = 'periode', label = 'Versi aturan' }: { versi: VersiAturanRow[]; value: number | null; onValueChange: (id: number) => void; satuanPemakai?: string; label?: string }) {
  return (
    <aside className="u-bkd-aturan-daftar" aria-label={label}>
      {versi.map((a) => (
        <button key={a.id} type="button" aria-current={a.id === value ? 'true' : undefined} onClick={() => onValueChange(a.id)}>
          <span className="u-bkd-aturan-nama">
            {a.nama}
            <LencanaStatusVersi status={a.status} />
          </span>
          <small>
            Versi {a.versi}
            {a.berlaku_mulai ? ` · berlaku mulai ${a.berlaku_mulai_nama ?? a.berlaku_mulai}` : ''} · {a.jumlah_periode ?? 0} {satuanPemakai}
          </small>
          {a.sk ? <small>SK {a.sk.nomor}</small> : null}
        </button>
      ))}
    </aside>
  );
}

/** Panel samping: banding versi `aturan` dengan versi lain (bawaan: versi asal salinan). */
export function PanelBandingAturan({ basis, aturan: a, onOpenChange }: { basis: string; aturan: Pick<VersiAturanRow, 'id' | 'nama' | 'versi' | 'induk_id'>; onOpenChange: (o: boolean) => void }) {
  const daftar = useVersiAturan(basis);
  const [lawan, setLawan] = React.useState<string | null>(a.induk_id ? String(a.induk_id) : null);
  const b = useSiakadQuery<{ perubahan: PerubahanAturan[] }>(['aturan-versi', basis, 'banding', a.id, lawan], (s: ReturnType<typeof useSiakad>, signal) => s.request({ method: 'GET', path: `${basis}/${a.id}/banding`, query: { dengan: lawan ?? '' } }, { signal }), { enabled: !!lawan });
  return (
    <Sheet open onOpenChange={onOpenChange} title={`Banding ${a.nama} v${a.versi}`} size="lg">
      <div className="u-bkd-form">
        <Field label="Dibanding dengan">
          <Select options={(daftar.data ?? []).filter((x) => x.id !== a.id).map((x) => ({ value: String(x.id), label: `${x.nama} v${x.versi} (${labelStatusVersi(x.status)})` }))} value={lawan} onValueChange={setLawan} placeholder="Pilih versi…" />
        </Field>
        {b.data ? <DaftarPerubahanAturan perubahan={b.data.perubahan} /> : lawan ? <Skeleton style={{ height: 120 }} /> : null}
      </div>
    </Sheet>
  );
}
