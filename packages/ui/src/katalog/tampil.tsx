'use client';
import * as React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { Badge } from '../components/actions';
import { DescriptionList } from '../components/display';
import { cn } from '../lib/cn';
import { formatDate, formatNumber, formatRupiah } from '../lib/format';
import { judulOperasi, keabsahanAksi, labelKolom, labelNilai, nadaStatus } from './aturan';
import type { Baris, Operasi, Skema } from './tipe';

// Dicocokkan per kata (dipisah _), agar mis. ruang_id tidak dianggap uang.
const UANG = /(^|_)(nominal|biaya|tarif|harga|jumlah_bayar|jumlah_tagihan|total_bayar|total_tagihan|saldo|anggaran|pagu|realisasi|denda|potongan|honor|gaji|nilai_kontrak|uang|rupiah|bayar|tagihan)(_|$)/i;
const STATUS = /(^status|_status$|^aktif$|^tahap$|^kondisi$)/i;

/** Tampilan satu nilai sesuai tipe skema: lencana status, tanggal, rupiah, Ya/Tidak, tautan, atau teks. */
export function NilaiSel({ nama, value: v, skema: s, ringkas = true }: { nama: string; value: unknown; skema?: Skema; ringkas?: boolean }) {
  if (v === null || v === undefined || v === '') return <span className="u-nilai-kosong">–</span>;
  if (typeof v === 'boolean' || s?.t === 'boolean') {
    const ya = v === true || v === 1 || v === '1' || v === 'Y' || v === 'true';
    return (
      <Badge variant={ya ? 'success' : 'neutral'}>
        {ya ? 'Ya' : 'Tidak'}
      </Badge>
    );
  }
  if ((s?.e || STATUS.test(nama)) && typeof v !== 'object') {
    return (
      <Badge variant={nadaStatus(v)} dot>
        {labelNilai(v)}
      </Badge>
    );
  }
  if (s?.f === 'date' || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v))) return <span className="u-nilai-tanggal">{formatDate(String(v), 'medium')}</span>;
  if (s?.f === 'date-time' || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(v))) {
    const d = new Date(String(v).replace(' ', 'T'));
    return <span className="u-nilai-tanggal">{Number.isNaN(d.getTime()) ? String(v) : `${formatDate(d, 'medium')} ${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`}</span>;
  }
  if ((typeof v === 'number' || (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v))) && (s?.t === 'number' || s?.t === 'integer' || typeof v === 'number')) {
    const n = Number(v);
    if (UANG.test(nama) && !/(^|_)id$/i.test(nama)) return <span className="u-nilai-angka">{formatRupiah(n)}</span>;
    if (/^(id|.*_id|tahun.*|kode.*|nim|nidn|nik|nip|no.*|nomor.*)$/i.test(nama)) return <span className="u-mono">{String(v)}</span>;
    return <span className="u-nilai-angka">{formatNumber(n)}</span>;
  }
  if (typeof v === 'string' && /^https?:\/\//.test(v)) {
    return (
      <a href={v} target="_blank" rel="noreferrer" className="u-link u-nilai-tautan">
        {v.replace(/^https?:\/\//, '').slice(0, 48)}
      </a>
    );
  }
  if (Array.isArray(v)) {
    if (v.every((x) => x === null || typeof x !== 'object'))
      return (
        <span className="u-nilai-daftar">
          {v.slice(0, ringkas ? 4 : undefined).map((x, i) => (
            <Badge key={i} variant="neutral">
              {labelNilai(x)}
            </Badge>
          ))}
          {ringkas && v.length > 4 && <small>+{v.length - 4}</small>}
        </span>
      );
    return <span className="u-nilai-kosong">{v.length} butir</span>;
  }
  if (typeof v === 'object') {
    const o = v as Baris;
    const j = o.nama ?? o.judul ?? o.label;
    if (j) return <span>{String(j)}</span>;
    return ringkas ? <span className="u-nilai-kosong">{Object.keys(o).length} kolom</span> : <pre className="u-nilai-json">{JSON.stringify(o, null, 2)}</pre>;
  }
  const t = String(v);
  if (/^(kode|nim|nidn|nik|nip|username|uuid|no_|nomor)/i.test(nama)) return <span className="u-mono">{t}</span>;
  if (ringkas && t.length > 90) return <span title={t}>{t.slice(0, 88)}…</span>;
  return <span className={ringkas ? undefined : 'u-nilai-panjang'}>{t}</span>;
}

export interface DetailBarisProps {
  baris: Baris;
  skema?: Skema;
  /** Kolom yang ditampilkan (bawaan semua kecuali teknis). */
  kolom?: string[];
  sembunyi?: string[];
  className?: string;
}

const TEKNIS = /^(uuid|deleted_at|password|secret|.*_hash|token)$/i;

/** Daftar label: nilai untuk satu baris API, dengan format yang sama dengan sel tabel. */
export function DetailBaris({ baris, skema, kolom, sembunyi = [], className }: DetailBarisProps) {
  const keys = kolom ?? [...new Set([...Object.keys(skema?.pr ?? {}).filter((k) => k in baris), ...Object.keys(baris)])].filter((k) => !TEKNIS.test(k) && !sembunyi.includes(k));
  return <DescriptionList className={className} items={keys.map((k) => ({ label: labelKolom(k), value: <NilaiSel nama={k} value={baris[k]} skema={skema?.pr?.[k]} ringkas={false} /> }))} />;
}

export interface AlurStatusProps {
  /** Nilai status yang mungkin (enum kolom status). */
  status: string[];
  /** Status sekarang. */
  sekarang?: string | null;
  /** Aksi berstatus dari katalog: menampilkan aksi yang menghubungkan tiap status. */
  aksi?: Operasi[];
  baris?: Baris | null;
  skemaBaris?: Skema;
  className?: string;
}

/**
 * Diagram alur status dari aturan backend (Status harus A, menjadi B): status yang sudah dilewati, sekarang,
 * dan aksi yang tersedia dari status sekarang.
 */
export function AlurStatus({ status, sekarang, aksi = [], baris, skemaBaris, className }: AlurStatusProps) {
  const urut = React.useMemo(() => {
    // Urutkan mengikuti rantai aksi bila bisa (draf → buka → seleksi → …), sisanya urutan enum.
    const ke = new Map<string, string>();
    for (const o of aksi) if (o.tr?.ke && o.tr.dari.length === 1) ke.set(o.tr.dari[0], o.tr.ke);
    const awal = status.find((s) => ![...ke.values()].includes(s) && ke.has(s)) ?? status[0];
    const out: string[] = [];
    let s: string | undefined = awal;
    while (s && !out.includes(s)) {
      out.push(s);
      s = ke.get(s);
    }
    return [...out, ...status.filter((x) => !out.includes(x))];
  }, [status, aksi]);
  const idx = sekarang ? urut.indexOf(sekarang) : -1;
  const tersedia = aksi.filter((o) => keabsahanAksi(o, baris ?? (sekarang ? { status: sekarang } : null), skemaBaris).boleh && o.tr);
  return (
    <div className={cn('u-alur-status', className)}>
      <ol>
        {urut.map((s, i) => (
          <li key={s} data-state={i < idx ? 'lewat' : i === idx ? 'sekarang' : 'nanti'} data-tone={nadaStatus(s)}>
            <span className="u-alur-titik">{i < idx ? <Check aria-hidden /> : null}</span>
            <span>{labelNilai(s)}</span>
          </li>
        ))}
      </ol>
      {sekarang && tersedia.length > 0 && (
        <p className="u-alur-lanjut">
          {tersedia.map((o) => (
            <span key={o.id}>
              {judulOperasi(o)} <ArrowRight aria-hidden /> <b>{labelNilai(o.tr!.ke ?? sekarang)}</b>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
