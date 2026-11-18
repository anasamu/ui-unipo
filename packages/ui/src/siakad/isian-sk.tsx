'use client';
import * as React from 'react';
import { FilePlus2, FileText, ScrollText, ShieldCheck } from 'lucide-react';
import { Combobox, OptionContent, Select } from '../components/select';
import { DatePicker } from '../components/calendar';
import { Field, Input, SegmentedControl, type ControlSize } from '../components/forms';
import { Alert } from '../components/display';
import { Badge, Button } from '../components/actions';
import { Dialog, useToast } from '../components/overlays';
import { cn } from '../lib/cn';
import { formatDate } from '../lib/format';
import { CariAtauUnggahDokumen } from './cari-dokumen';
import { pesanGalat, useOptionalSiakad } from './provider';
import { PilihUnit } from './pilih-unit';

/*
 * Registri SK tunggal (SIAKAD /v1/sk, docs/SK.md). Satu SK dicatat satu kali oleh unit penerbitnya (mis. Rektorat untuk
 * SK Rektor); form lain hanya MERUJUK SK itu (simpan sk_id), tidak mengetik ulang nomor, penetap, atau mengunggah ulang
 * berkasnya. Nomor yang diketik dinormalisasi di server: nomor yang sama dengan tulisan berbeda langsung disarankan.
 */

/** SK di registri (GET /v1/sk, /v1/sk/{id}). */
export interface SKRegistri {
  /** UUID registri, atau "surat:<uuid>" untuk surat keluar arsip berjenis SK yang belum tercatat. */
  id: string;
  nomor: string;
  nomor_kunci?: string;
  tanggal?: string | null;
  perihal?: string | null;
  jenis?: string;
  jenis_label?: string;
  penerbit?: { unit_id: number | null; nama: string; kode?: string; jenis?: string; luar?: boolean } | null;
  /** tautan: pejabat = data pejabat; jabatan = jabatan di unit tanpa orang; teks = diketik, belum tertaut. */
  penandatangan?: { pejabat_id: number | null; jabatan_id?: number | null; unit_id?: number | null; jabatan: string | null; nama: string | null; tautan?: 'pejabat' | 'jabatan' | 'teks'; ttd?: string | null } | null;
  tempat?: string | null;
  berkas?: { ada: boolean; nama?: string | null; mime?: string | null; ukuran?: number | null; url: string } | null;
  status: 'draf' | 'terbit' | 'ditolak' | 'dicabut' | 'diubah';
  keamanan?: 'biasa' | 'terbatas';
  sumber?: string | null;
  diverifikasi_at?: string | null;
}

/** Satu SK yang ditemukan: dari registri SK, arsip surat keluar, data aplikasi, atau nomor baru. */
export interface SKDitemukan {
  nomor: string;
  tanggal?: string | null;
  perihal?: string | null;
  /** Sumber singkat untuk ditampilkan, mis. "Rektorat · terbit" atau "Arsip Biro Umum". */
  asal?: string | null;
  /** UUID /v1/berkas bila berkas SK sudah diketahui. */
  berkas_id?: string | null;
  /** True bila nomor diketik baru (belum ada di registri). */
  baru?: boolean;
  /** UUID SK registri (kirim sebagai sk_id). */
  id?: string | null;
  /** Data registri lengkap bila dari /v1/sk. */
  sk?: SKRegistri | null;
  asli?: unknown;
}

/** Nilai {@link IsianSK}: rujukan SK registri (sk_id) beserta salinan nomor/tanggal untuk tampilan. */
export interface NilaiSK {
  nomor: string;
  tanggal?: string | null;
  berkas_id?: string | null;
  perihal?: string | null;
  /** UUID SK registri; kirim ke API sebagai sk_id (server mengambil nomor, tanggal, penetap, berkas dari registri). */
  sk_id?: string | null;
  sk?: SKRegistri | null;
}

const isoKeTanggal = (s?: string | null) => (s ? new Date(`${s.slice(0, 10)}T00:00:00`) : null);
const tanggalKeIso = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null);

export const STATUS_SK: Record<SKRegistri['status'], { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' | 'info' }> = {
  terbit: { label: 'Terbit', variant: 'success' },
  draf: { label: 'Menunggu verifikasi penerbit', variant: 'warning' },
  ditolak: { label: 'Ditolak penerbit', variant: 'danger' },
  dicabut: { label: 'Dicabut', variant: 'danger' },
  diubah: { label: 'Diubah SK lain', variant: 'info' },
};

const keDitemukan = (s: SKRegistri): SKDitemukan => ({
  id: s.id,
  nomor: s.nomor,
  tanggal: s.tanggal ?? null,
  perihal: s.perihal ?? null,
  asal: [s.penerbit?.nama, s.sumber === 'arsip' ? 'arsip surat keluar' : s.status !== 'terbit' ? STATUS_SK[s.status]?.label.toLowerCase() : null].filter(Boolean).join(' · ') || null,
  sk: s,
});

const tidakAda = (e: unknown) => {
  const st = (e as { status?: number })?.status;
  return st === 404 || st === 405;
};

/**
 * Cari SK di registri SK tunggal (GET /v1/sk?q=). Server lama tanpa registri: jatuh ke arsip surat keluar
 * (GET /v1/arsip/surat-keluar). Diam bila akun tidak punya akses, agar sumber lain tetap tampil.
 */
export function useCariSK(aktif = true) {
  const siakad = useOptionalSiakad();
  return React.useCallback(
    async (q: string, signal: AbortSignal): Promise<SKDitemukan[]> => {
      if (!siakad || !aktif) return [];
      try {
        const r = await siakad.request<SKRegistri[]>({ method: 'GET', path: '/v1/sk', query: { q: q || undefined, per_page: 15 } }, { signal });
        return (Array.isArray(r.data) ? r.data : []).map(keDitemukan);
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') throw e;
        if (!tidakAda(e)) return [];
      }
      try {
        const r = await siakad.request<Array<Record<string, unknown>>>({ method: 'GET', path: '/v1/arsip/surat-keluar', query: { q: q || undefined, per_page: 15, urut: 'terbaru' } }, { signal });
        return (Array.isArray(r.data) ? r.data : [])
          .filter((s) => s.nomor_surat)
          .map((s) => ({ nomor: String(s.nomor_surat), tanggal: (s.tanggal_surat as string) ?? null, perihal: (s.perihal as string) ?? null, asal: s.unit_nama ? `Arsip ${String(s.unit_nama)}` : 'Arsip surat', asli: s }));
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') throw e;
        return [];
      }
    },
    [siakad, aktif],
  );
}

/** @deprecated Pakai {@link useCariSK} (registri SK; arsip surat keluar ikut ditawarkan dari server). */
export const useCariSKArsip = useCariSK;

export interface PeriksaSK {
  nomor: string | null;
  nomor_kunci: string;
  sama: SKRegistri[];
  mirip: SKRegistri[];
  pesan: string | null;
}

/** Periksa nomor yang diketik: SK yang sama (setelah normalisasi spasi, huruf besar, tanda baca, nol depan). */
export function usePeriksaSK() {
  const siakad = useOptionalSiakad();
  return React.useCallback(
    async (nomor: string, penerbit?: number | null): Promise<PeriksaSK | null> => {
      if (!siakad || !nomor.trim()) return null;
      try {
        const r = await siakad.request<PeriksaSK>({ method: 'GET', path: '/v1/sk/periksa', query: { nomor, penerbit_unit_id: penerbit ?? undefined } });
        return r.data;
      } catch {
        return null;
      }
    },
    [siakad],
  );
}

/** Buka berkas SK lewat registri (hak baca, tanpa salinan) di tab baru. */
export function useBukaBerkasSK() {
  const siakad = useOptionalSiakad();
  const toast = useToast();
  return React.useCallback(
    async (sk: Pick<SKRegistri, 'id' | 'nomor'>, unduh = false) => {
      if (!siakad) return;
      const tab = unduh ? null : window.open('', '_blank');
      try {
        const r = await siakad.request<unknown>({ method: 'GET', path: `/v1/sk/${sk.id}/berkas`, query: unduh ? { unduh: '1' } : undefined });
        const d = r.data as { blob?: () => Blob } | Blob | null;
        const blob = d instanceof Blob ? d : d && typeof d === 'object' && typeof d.blob === 'function' ? d.blob() : null;
        if (!blob) throw new Error('Berkas SK tidak dapat dibuka.');
        const url = URL.createObjectURL(blob);
        if (tab) tab.location.href = url;
        else {
          const el = document.createElement('a');
          el.href = url;
          el.download = `SK-${sk.nomor.replace(/[^\w.-]+/g, '_')}.pdf`;
          el.click();
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch (e) {
        tab?.close();
        toast.add({ title: 'Berkas SK tidak bisa dibuka', description: pesanGalat(e), type: 'error' });
      }
    },
    [siakad, toast],
  );
}

/** Kartu ringkas SK registri: nomor, perihal, penerbit, penandatangan, status, tombol lihat berkas. */
export function KartuSK({ sk, aksi, className }: { sk: SKRegistri; aksi?: React.ReactNode; className?: string }) {
  const buka = useBukaBerkasSK();
  const st = STATUS_SK[sk.status] ?? STATUS_SK.terbit;
  const arsip = sk.id.startsWith('surat:');
  return (
    <div className={cn('u-kartu-sk', className)} data-status={sk.status}>
      <span className="u-kartu-sk-ikon" aria-hidden>
        <ScrollText />
      </span>
      <div className="u-kartu-sk-isi">
        <div className="u-kartu-sk-judul">
          <strong>{sk.nomor}</strong>
          <Badge variant={st.variant} size="md">
            {arsip ? 'Dari arsip surat keluar' : st.label}
          </Badge>
        </div>
        {sk.perihal && <span className="u-kartu-sk-perihal">{sk.perihal}</span>}
        <dl className="u-kartu-sk-rinci">
          {sk.tanggal && (
            <div>
              <dt>Tanggal</dt>
              <dd>{formatDate(sk.tanggal)}</dd>
            </div>
          )}
          <div>
            <dt>Penerbit</dt>
            <dd>{sk.penerbit?.nama ?? 'Belum diketahui'}</dd>
          </div>
          <div>
            <dt>Penandatangan</dt>
            <dd>
              {sk.penandatangan?.jabatan || sk.penandatangan?.nama ? [sk.penandatangan.jabatan, sk.penandatangan.nama].filter(Boolean).join(', ') : 'Diisi penerbit di registri'}
              {sk.penandatangan?.tautan === 'teks' ? <small className="u-kartu-sk-catatan"> (belum tertaut ke data pejabat)</small> : null}
              {sk.penandatangan?.tautan === 'jabatan' && !sk.penandatangan.nama ? <small className="u-kartu-sk-catatan"> (jabatan; pejabatnya belum tercatat)</small> : null}
            </dd>
          </div>
          {sk.tempat && (
            <div>
              <dt>Ditetapkan di</dt>
              <dd>{sk.tempat}</dd>
            </div>
          )}
        </dl>
        {sk.status === 'draf' && <span className="u-kartu-sk-catatan">Dicatat sebagai ajuan; unit penerbit memverifikasi nomor, penandatangan, dan berkasnya.</span>}
        {sk.status === 'terbit' && !sk.diverifikasi_at && sk.sumber?.startsWith('impor') && <span className="u-kartu-sk-catatan">Dicatat dari data lama; belum diverifikasi penerbit.</span>}
      </div>
      <div className="u-kartu-sk-aksi">
        {sk.berkas?.ada ? (
          <Button variant="outline" size="sm" onClick={() => buka(sk)}>
            <FileText /> Lihat berkas
          </Button>
        ) : !arsip ? (
          <span className="u-kartu-sk-catatan">Berkas belum diunggah penerbit</span>
        ) : null}
        {aksi}
      </div>
    </div>
  );
}

/** Penandatangan SK: pejabat aktif, jabatan di unit tanpa orang, atau teks (belum tertaut). */
export interface NilaiPenandatangan {
  tautan: 'pejabat' | 'jabatan' | 'teks';
  pejabat_id?: number | null;
  jabatan_id?: number | null;
  unit_id?: number | null;
  jabatan?: string | null;
  nama?: string | null;
}

/** Body API dari {@link NilaiPenandatangan}. */
export function bodyPenandatangan(t: NilaiPenandatangan | null | undefined): Record<string, unknown> {
  if (!t) return { penandatangan_pejabat_id: null, penandatangan_jabatan_id: null, penandatangan_jabatan: null, penandatangan_nama: null };
  if (t.tautan === 'pejabat' && t.pejabat_id) return { penandatangan_pejabat_id: t.pejabat_id };
  if (t.tautan === 'jabatan' && t.jabatan_id) return { penandatangan_jabatan_id: t.jabatan_id, penandatangan_unit_id: t.unit_id ?? null, penandatangan_nama: t.nama || null };
  return { penandatangan_pejabat_id: null, penandatangan_jabatan_id: null, penandatangan_jabatan: t.jabatan || null, penandatangan_nama: t.nama || null };
}

interface PenandatanganSK {
  pejabat_id: number;
  nama: string;
  jabatan: string;
  unit_penerbit_id: number;
}
interface JabatanSK {
  jabatan_id: number;
  kode: string;
  jabatan_lengkap: string;
  unit_id: number | null;
}

/**
 * Isian penandatangan SK tanpa ketergantungan melingkar: pilih pejabat aktif, atau JABATAN di unit (mis. "Rektor
 * Universitas Pohuwato") bila pejabatnya belum tercatat, atau ketik jabatan + nama (mis. Ketua Yayasan) yang ditandai
 * belum tertaut. Tidak wajib.
 */
export function IsianPenandatangan({ value, onValueChange, unitId, label = 'Penandatangan' }: { value: NilaiPenandatangan | null; onValueChange: (v: NilaiPenandatangan | null) => void; unitId?: number | null; label?: React.ReactNode }) {
  const siakad = useOptionalSiakad();
  const [pejabat, setPejabat] = React.useState<PenandatanganSK[]>([]);
  const [jabatan, setJabatan] = React.useState<JabatanSK[]>([]);
  const tautan = value?.tautan ?? 'pejabat';
  React.useEffect(() => {
    if (!siakad) return;
    const q = { unit_id: unitId ?? undefined };
    siakad.request<PenandatanganSK[]>({ method: 'GET', path: '/v1/sk/penandatangan', query: q }).then((r) => setPejabat(Array.isArray(r.data) ? r.data : [])).catch(() => setPejabat([]));
    siakad.request<JabatanSK[]>({ method: 'GET', path: '/v1/sk/jabatan-penandatangan', query: q }).then((r) => setJabatan(Array.isArray(r.data) ? r.data : [])).catch(() => setJabatan([]));
  }, [siakad, unitId]);
  const set = (patch: Partial<NilaiPenandatangan>) => onValueChange({ tautan, ...value, ...patch } as NilaiPenandatangan);
  return (
    <Field
      label={label}
      optional
      description={
        tautan === 'pejabat'
          ? 'Dari data pejabat (Organisasi & pejabat).'
          : tautan === 'jabatan'
            ? 'Jabatan di unit penerbit tanpa orang, mis. sebelum pejabatnya tercatat. Tertaut otomatis saat pejabat jabatan itu ditetapkan.'
            : 'Jabatan dan nama diketik (mis. Ketua Yayasan). Ditandai belum tertaut; bisa ditautkan ke pejabat kemudian.'
      }
    >
      <div className="u-isian-ttd">
        <SegmentedControl<'pejabat' | 'jabatan' | 'teks'>
          value={tautan}
          onValueChange={(t) => onValueChange({ tautan: t })}
          options={[
            { value: 'pejabat', label: 'Pejabat' },
            { value: 'jabatan', label: 'Jabatan saja' },
            { value: 'teks', label: 'Ketik' },
          ]}
          aria-label="Jenis penandatangan"
        />
        {tautan === 'pejabat' ? (
          <Select<number>
            value={value?.pejabat_id ?? null}
            onValueChange={(v) => set({ pejabat_id: v })}
            options={pejabat.map((p) => ({ value: p.pejabat_id, label: p.nama, description: p.jabatan }))}
            placeholder={pejabat.length ? 'Pilih pejabat' : 'Belum ada pejabat aktif; pilih "Jabatan saja" atau "Ketik"'}
            aria-label="Pejabat penandatangan"
          />
        ) : tautan === 'jabatan' ? (
          <div className="u-ajukan-sk-dua">
            <Select<number>
              value={value?.jabatan_id ?? null}
              onValueChange={(v) => set({ jabatan_id: v, unit_id: jabatan.find((j) => j.jabatan_id === v)?.unit_id ?? unitId ?? null })}
              options={jabatan.map((j) => ({ value: j.jabatan_id, label: j.jabatan_lengkap }))}
              placeholder="Pilih jabatan"
              aria-label="Jabatan penandatangan"
            />
            <Input value={value?.nama ?? ''} onChange={(e) => set({ nama: e.target.value })} placeholder="Nama (opsional)" aria-label="Nama penandatangan" />
          </div>
        ) : (
          <div className="u-ajukan-sk-dua">
            <Input value={value?.jabatan ?? ''} onChange={(e) => set({ jabatan: e.target.value })} placeholder="Jabatan, mis. Ketua Yayasan" aria-label="Jabatan penandatangan" />
            <Input value={value?.nama ?? ''} onChange={(e) => set({ nama: e.target.value })} placeholder="Nama penandatangan" aria-label="Nama penandatangan" />
          </div>
        )}
      </div>
    </Field>
  );
}

/** Isian awal pencatatan SK (tombol "Catat SK ... sekarang" di form pemakai). */
export interface IsianAwalSK {
  nomor?: string;
  tanggal?: string | null;
  perihal?: string;
  jenis?: string;
  penerbitUnitId?: number | null;
  penerbitLuar?: string | null;
  penandatangan?: NilaiPenandatangan | null;
  /** Ambil bawaan dari server (/v1/sk/bawaan): penerbit, perihal, penandatangan menurut jabatan yang diangkat. */
  untukJabatanId?: number | null;
  untukUnitId?: number | null;
}

export interface PilihSKProps {
  /** UUID SK registri terpilih. */
  value?: string | null;
  /** Data SK awal (mis. objek `sk` dari API modul) agar tidak perlu memuat ulang. */
  sk?: SKRegistri | null;
  onValueChange?: (id: string | null, sk: SKRegistri | null) => void;
  /** Jenis SK bawaan saat mengajukan pencatatan, mis. "kalender", "pengangkatan", "penugasan", "panitia". */
  jenis?: string;
  /** Unit penerbit bawaan (induk_unit.id), mis. universitas untuk SK Rektor. */
  penerbitUnitId?: number | null;
  /** Perihal bawaan saat mengajukan pencatatan. */
  perihal?: string;
  /** Tampilkan tombol "Ajukan pencatatan SK baru" bila SK belum ada di registri. Bawaan true. */
  bolehAjukan?: boolean;
  /**
   * Tombol "Catat SK ... sekarang" di bawah isian (bila belum ada SK terpilih): membuka dialog pencatatan dengan isian
   * terisi; setelah tersimpan SK langsung terpilih.
   */
  catatSekarang?: { label?: string; isian?: IsianAwalSK };
  /** Tampilkan "SK ini juga dipakai untuk: ..." (SK kolektif). `kecuali` = baris milik form ini. */
  tampilPemakaian?: boolean | { kecuali?: { tabel: string; baris: string | number } };
  label?: React.ReactNode;
  description?: React.ReactNode;
  required?: boolean;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  size?: ControlSize;
  id?: string;
  className?: string;
}

interface PemakaianSK {
  tabel: string;
  baris: string;
  label: string;
  uraian: string | null;
}

/**
 * Pilih SK dari registri SK tunggal: cari nomor/perihal, tampilkan nomor, tanggal, perihal, penerbit, penandatangan, dan
 * status, lihat berkasnya (hak baca, tanpa salinan). Nomor yang belum tercatat bisa diajukan pencatatannya ke penerbit;
 * nomor yang sama dengan tulisan berbeda langsung disarankan. Simpan `id` sebagai `sk_id` di data Anda.
 */
export function PilihSK({
  value, sk: skAwal, onValueChange, jenis, penerbitUnitId, perihal, bolehAjukan = true, catatSekarang, tampilPemakaian, label = 'Surat keputusan', description, required, error,
  placeholder = 'Cari nomor atau perihal SK di registri', disabled, size, id, className,
}: PilihSKProps) {
  const siakad = useOptionalSiakad();
  const cari = useCariSK();
  const periksa = usePeriksaSK();
  const [sk, setSk] = React.useState<SKRegistri | null>(skAwal ?? null);
  const [ajukan, setAjukan] = React.useState<{ isian: IsianAwalSK } | null>(null);
  const [saran, setSaran] = React.useState<string | null>(null);
  const [pakai, setPakai] = React.useState<PemakaianSK[]>([]);
  React.useEffect(() => {
    if (skAwal && skAwal.id === value) setSk(skAwal);
  }, [skAwal, value]);
  React.useEffect(() => {
    if (!value) {
      setSk(null);
      setPakai([]);
      return;
    }
    if (!siakad || value.startsWith('surat:') || (sk?.id === value && !tampilPemakaian)) return;
    const ac = new AbortController();
    siakad
      .request<SKRegistri & { pemakaian?: PemakaianSK[] }>({ method: 'GET', path: `/v1/sk/${value}` }, { signal: ac.signal })
      .then((r) => {
        setSk(r.data);
        const k = typeof tampilPemakaian === 'object' ? tampilPemakaian.kecuali : undefined;
        setPakai((r.data.pemakaian ?? []).filter((p) => !k || !(p.tabel === k.tabel && String(p.baris) === String(k.baris))));
      })
      .catch(() => undefined);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, siakad]);
  const pilih = (s: SKRegistri | null) => {
    setSk(s);
    onValueChange?.(s?.id ?? null, s);
  };
  const item = sk ? keDitemukan(sk) : null;
  const isianDasar: IsianAwalSK = { jenis, penerbitUnitId, perihal, ...(catatSekarang?.isian ?? {}) };
  return (
    <div className={cn('u-pilih-sk', className)}>
      <Field
        label={label}
        required={required}
        error={error}
        description={description ?? 'Pilih SK yang sudah dicatat unit penerbit. Nomor, tanggal, penandatangan, dan berkas diambil dari registri SK.'}
      >
        <Combobox<SKDitemukan>
          id={id}
          size={size}
          disabled={disabled}
          placeholder={placeholder}
          icon={<ScrollText />}
          loadItems={cari}
          value={item}
          onValueChange={(s) => {
            setSaran(null);
            pilih(s?.sk ?? null);
          }}
          itemToString={(s) => s.nomor}
          itemKey={(s) => s.id ?? `nomor:${s.nomor}`}
          emptyText="Belum ada SK yang cocok di registri."
          renderItem={(s) => (
            <>
              <span className="u-option-media" data-shape="square">
                <FileText size={14} />
              </span>
              <OptionContent title={s.nomor} meta={[s.perihal, s.tanggal && formatDate(s.tanggal), s.asal].filter(Boolean).join(' · ') || undefined} />
            </>
          )}
          tambah={
            bolehAjukan && siakad
              ? {
                  label: (k) => (k.trim() ? `Belum ada? Catat/ajukan SK “${k.trim()}”` : 'Catat atau ajukan SK baru'),
                  onTambah: async (k) => {
                    const nomor = k.trim();
                    const h = nomor ? await periksa(nomor, penerbitUnitId) : null;
                    if (h?.sama?.length) {
                      // Nomor yang sama sudah tercatat (tulisan bisa berbeda): pakai SK itu, jangan catat ulang.
                      pilih(h.sama[0]);
                      setSaran(`SK ini sudah tercatat sebagai ${h.sama[0].nomor}. SK itu yang dipilih; tidak perlu mencatat ulang.`);
                      return keDitemukan(h.sama[0]);
                    }
                    setAjukan({ isian: { ...isianDasar, nomor } });
                    return null;
                  },
                }
              : undefined
          }
        />
      </Field>
      {!sk && catatSekarang && bolehAjukan && siakad && !disabled && (
        <div>
          <Button variant="outline" size="sm" onClick={() => setAjukan({ isian: isianDasar })}>
            <FilePlus2 /> {catatSekarang.label ?? 'Catat SK sekarang'}
          </Button>
        </div>
      )}
      {saran && (
        <Alert variant="info" title={saran.startsWith('Ajuan') ? 'Ajuan pencatatan terkirim' : saran.startsWith('SK tercatat') ? 'SK tercatat' : 'SK sudah tercatat'}>
          {saran}
        </Alert>
      )}
      {sk && <KartuSK sk={sk} />}
      {sk && tampilPemakaian && pakai.length > 0 && (
        <p className="u-pilih-sk-saran">
          SK ini juga dipakai untuk: {pakai.slice(0, 6).map((p) => p.uraian ?? `${p.label} #${p.baris}`).join('; ')}
          {pakai.length > 6 ? `; dan ${pakai.length - 6} lainnya` : ''}.
        </p>
      )}
      {ajukan !== null && (
        <AjukanPencatatanSK
          open
          onOpenChange={(o) => !o && setAjukan(null)}
          isian={ajukan.isian}
          onTercatat={(s, pesan) => {
            setAjukan(null);
            setSaran(pesan ?? (s.status === 'terbit' ? 'SK tercatat di registri dan langsung dipilih.' : null));
            pilih(s);
          }}
        />
      )}
    </div>
  );
}

interface PenerbitSK {
  unit_id: number;
  kode: string;
  jenis: string;
  nama: string;
  induk_id?: number | null;
  boleh_catat: boolean;
}

export interface AjukanPencatatanSKProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Isian awal (nomor, tanggal, perihal, jenis, penerbit, penandatangan, atau jabatan yang diangkat untuk bawaan). */
  isian?: IsianAwalSK;
  /** @deprecated pakai isian.nomor */
  nomor?: string;
  /** @deprecated pakai isian.jenis */
  jenis?: string;
  /** @deprecated pakai isian.penerbitUnitId */
  penerbitUnitId?: number | null;
  /** @deprecated pakai isian.perihal */
  perihal?: string;
  /** SK hasil pencatatan (atau SK yang ternyata sudah ada). */
  onTercatat: (sk: SKRegistri, pesan?: string) => void;
}

const LUAR = -1;

/**
 * Dialog mencatat SK ke registri. Pemegang sk.catat di unit penerbit: SK langsung terbit. Unit lain: ajuan pencatatan
 * (draf) yang diverifikasi penerbit. Penandatangan opsional: pejabat, jabatan saja, atau teks (Ketua Yayasan, dsb.).
 */
export function AjukanPencatatanSK({ open, onOpenChange, isian: isianProp, nomor: nomorLama, jenis: jenisLama, penerbitUnitId: penerbitLama, perihal: perihalLama, onTercatat }: AjukanPencatatanSKProps) {
  const isian: IsianAwalSK = { nomor: nomorLama, jenis: jenisLama, penerbitUnitId: penerbitLama, perihal: perihalLama, ...(isianProp ?? {}) };
  const siakad = useOptionalSiakad();
  const periksa = usePeriksaSK();
  const [nomor, setNomor] = React.useState(isian.nomor ?? '');
  const [tanggal, setTanggal] = React.useState<string | null>(isian.tanggal ?? null);
  const [perihal, setPerihal] = React.useState(isian.perihal ?? '');
  const [penerbit, setPenerbit] = React.useState<number | null>(isian.penerbitLuar ? LUAR : (isian.penerbitUnitId ?? null));
  // Unit terakhir yang dipilih, dipulihkan saat beralih kembali dari "Instansi luar".
  const unitTerakhir = React.useRef<number | null>(isian.penerbitUnitId ?? null);
  React.useEffect(() => {
    if (penerbit !== null && penerbit !== LUAR) unitTerakhir.current = penerbit;
  }, [penerbit]);
  const [luar, setLuar] = React.useState(isian.penerbitLuar ?? '');
  const [ttd, setTtd] = React.useState<NilaiPenandatangan | null>(isian.penandatangan ?? null);
  const [tempat, setTempat] = React.useState('');
  const [berkas, setBerkas] = React.useState<string | null>(null);
  const [daftarPenerbit, setDaftarPenerbit] = React.useState<PenerbitSK[]>([]);
  const [cek, setCek] = React.useState<PeriksaSK | null>(null);
  const [mirip, setMirip] = React.useState(false);
  const [kirim, setKirim] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const jenis = isian.jenis;
  React.useEffect(() => {
    if (!siakad || !open) return;
    siakad
      .request<PenerbitSK[]>({ method: 'GET', path: '/v1/sk/penerbit' })
      .then((r) => {
        const d = Array.isArray(r.data) ? r.data : [];
        setDaftarPenerbit(d);
        // SK kalender, aturan, pengangkatan pejabat, dan kurikulum lazimnya SK Rektor: bawaan penerbit universitas.
        if (isian.penerbitUnitId == null && !isian.penerbitLuar && !isian.untukJabatanId && jenis && ['kalender', 'aturan', 'pengangkatan', 'kurikulum'].includes(jenis)) {
          const u = d.find((x) => x.jenis === 'universitas');
          if (u) setPenerbit((p) => p ?? u.unit_id);
        }
      })
      .catch(() => setDaftarPenerbit([]));
    // Bawaan menurut jenis SK dan jabatan yang diangkat (pengangkatan Rektor -> Yayasan; pejabat lain -> Rektor).
    if (isian.untukJabatanId || (jenis && !isian.penandatangan)) {
      siakad
        .request<{ penerbit_unit_id: number | null; penerbit_luar: string | null; perihal: string | null; penandatangan: (NilaiPenandatangan & { jabatan?: string | null }) | null }>({
          method: 'GET',
          path: '/v1/sk/bawaan',
          query: { jenis, penerbit_unit_id: isian.penerbitUnitId ?? undefined, untuk_jabatan_id: isian.untukJabatanId ?? undefined, untuk_unit_id: isian.untukUnitId ?? undefined },
        })
        .then(({ data: b }) => {
          if (isian.untukJabatanId) {
            if (b.penerbit_luar) {
              setPenerbit(LUAR);
              setLuar(b.penerbit_luar);
            } else if (b.penerbit_unit_id) setPenerbit(b.penerbit_unit_id);
            if (b.perihal) setPerihal((p) => p || b.perihal!);
          }
          if (b.penandatangan && !isian.penandatangan) setTtd(b.penandatangan);
        })
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siakad, open]);
  const unitPenerbit = penerbit === LUAR ? null : penerbit;
  const bolehCatat = (penerbit === LUAR ? daftarPenerbit.some((u) => u.boleh_catat) : daftarPenerbit.find((u) => u.unit_id === penerbit)?.boleh_catat) ?? false;
  React.useEffect(() => {
    if (!nomor.trim()) {
      setCek(null);
      return;
    }
    const t = setTimeout(() => void periksa(nomor, unitPenerbit).then(setCek), 350);
    return () => clearTimeout(t);
  }, [nomor, unitPenerbit, periksa]);
  const simpan = async () => {
    if (!siakad) return;
    setKirim(true);
    setGalat(null);
    try {
      const r = await siakad.request<SKRegistri>({
        method: 'POST',
        path: '/v1/sk',
        body: {
          nomor, tanggal, perihal: perihal || null, jenis, ...(penerbit === LUAR ? { penerbit_luar: luar || null } : { penerbit_unit_id: penerbit }),
          ...bodyPenandatangan(ttd), tempat: tempat || null, berkas_id: berkas, abaikan_mirip: mirip || undefined,
        },
      });
      onTercatat(r.data, r.data.status === 'draf' ? 'Ajuan pencatatan SK terkirim ke unit penerbit untuk diverifikasi. SK ini sudah bisa dirujuk.' : undefined);
    } catch (e) {
      const d = (e as { details?: Record<string, unknown> })?.details ?? {};
      if (d.kode === 'sk_sudah_tercatat' && d.sk) {
        onTercatat(d.sk as SKRegistri, `SK ini sudah tercatat sebagai ${(d.sk as SKRegistri).nomor}. SK itu yang dipilih.`);
        return;
      }
      if (d.kode === 'sk_mirip') setMirip(true);
      setGalat(pesanGalat(e));
    } finally {
      setKirim(false);
    }
  };
  const sama = cek?.sama?.[0];
  const unitPilihan = React.useMemo(() => daftarPenerbit.map((u) => ({ id: u.unit_id, induk_id: u.induk_id ?? null, kode: u.kode, jenis: u.jenis, nama: u.nama })), [daftarPenerbit]);
  const pencatat = React.useMemo(() => new Set(daftarPenerbit.filter((u) => u.boleh_catat).map((u) => u.unit_id)), [daftarPenerbit]);
  // Lencana "Anda pencatat" hanya bila membedakan (bukan di semua unit, mis. admin).
  const semuaPencatat = daftarPenerbit.length > 0 && pencatat.size === daftarPenerbit.length;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={bolehCatat ? 'Catat SK di registri' : 'Ajukan pencatatan SK'}
      description={
        bolehCatat
          ? 'Anda pencatat SK unit ini: SK langsung terbit dan bisa dirujuk semua unit.'
          : 'SK belum ada di registri. Ajuan dikirim ke unit penerbit untuk diverifikasi; sementara itu SK sudah bisa dirujuk.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={simpan} loading={kirim} disabled={!nomor.trim() || penerbit === null || (penerbit === LUAR && !luar.trim()) || !!sama}>
            {bolehCatat ? <ShieldCheck /> : <FilePlus2 />} {mirip ? 'Tetap catat' : bolehCatat ? 'Catat SK' : 'Ajukan pencatatan'}
          </Button>
        </>
      }
    >
      <div className="u-ajukan-sk">
        <Field label="Nomor SK" required>
          <Input value={nomor} onChange={(e) => setNomor(e.target.value)} placeholder="mis. 91.01/UNIPO-SK/VII/2026" />
        </Field>
        {sama && (
          <Alert
            variant="info"
            title="SK ini sudah tercatat"
            actions={
              <Button size="sm" onClick={() => onTercatat(sama, `SK ini sudah tercatat sebagai ${sama.nomor}. SK itu yang dipilih.`)}>
                Pakai SK ini
              </Button>
            }
          >
            {sama.nomor}
            {sama.perihal ? ` (${sama.perihal})` : ''}
            {sama.penerbit?.nama ? `, penerbit ${sama.penerbit.nama}` : ''}. Pilih SK itu, jangan catat ulang.
          </Alert>
        )}
        {!sama && cek?.mirip?.length ? (
          <Alert variant="warning" title="Nomor sama dengan penerbit lain">
            {cek.mirip.map((m) => `${m.nomor} (${m.penerbit?.nama ?? 'penerbit belum diketahui'})`).join(', ')}. Pastikan penerbitnya benar.
          </Alert>
        ) : null}
        <Field label="Penerbit" required description="Universitas untuk SK Rektor, fakultas untuk SK Dekan; SK pengangkatan Rektor diterbitkan Yayasan (instansi luar).">
          <div className="u-ajukan-sk-penerbit">
            <SegmentedControl<'unit' | 'luar'>
              aria-label="Jenis penerbit"
              value={penerbit === LUAR ? 'luar' : 'unit'}
              onValueChange={(v) => setPenerbit(v === 'luar' ? LUAR : unitTerakhir.current)}
              options={[
                { value: 'unit', label: 'Unit UNIPO' },
                { value: 'luar', label: 'Instansi luar' },
              ]}
            />
            {penerbit === LUAR ? (
              <Input value={luar} onChange={(e) => setLuar(e.target.value)} placeholder="Nama instansi, mis. Yayasan (Badan Penyelenggara), LLDIKTI, BAN-PT" aria-label="Nama instansi penerbit" />
            ) : (
              <PilihUnit
                dataCadangan={unitPilihan}
                value={penerbit}
                onValueChange={(v) => {
                  unitTerakhir.current = v;
                  setPenerbit(v);
                }}
                keterangan={semuaPencatat ? undefined : (u) => (pencatat.has(Number(u.id)) ? 'Anda pencatat' : null)}
                placeholder="Pilih unit penerbit"
                aria-label="Unit penerbit"
              />
            )}
          </div>
        </Field>
        <Field label="Tanggal SK" optional>
          <DatePicker value={isoKeTanggal(tanggal)} onValueChange={(d) => setTanggal(tanggalKeIso(d))} placeholder="Tanggal SK" />
        </Field>
        <Field label="Perihal" optional>
          <Input value={perihal} onChange={(e) => setPerihal(e.target.value)} placeholder="mis. Pengangkatan Dekan Fakultas Ilmu Komputer" />
        </Field>
        <IsianPenandatangan value={ttd} onValueChange={setTtd} unitId={unitPenerbit} />
        <Field label="Ditetapkan di" optional>
          <Input value={tempat} onChange={(e) => setTempat(e.target.value)} placeholder="Kosong = sama dengan SK terakhir unit penerbit" />
        </Field>
        <Field label="Berkas SK" optional description="Satu berkas, disimpan di Berkas unit penerbit. Unit lain membacanya dari registri, tidak mengunggah ulang.">
          <CariAtauUnggahDokumen value={berkas} onValueChange={setBerkas} accept=".pdf,.jpg,.jpeg,.png" kategori="sk" placeholder="Cari atau unggah berkas SK" />
        </Field>
        {galat && <Alert variant="danger">{galat}</Alert>}
      </div>
    </Dialog>
  );
}

export interface PilihNomorSKProps {
  /** Nomor SK terpilih. */
  value?: string | null;
  onValueChange?: (nomor: string | null, sk: SKDitemukan | null) => void;
  /** Sumber tambahan, mis. nomor_sk yang sudah dipakai di tabel aplikasi Anda. Hasilnya digabung dengan registri. */
  cari?: (q: string, signal: AbortSignal) => Promise<SKDitemukan[]>;
  /** Cari di registri SK (/v1/sk; arsip surat keluar ikut ditawarkan). Bawaan true. */
  arsip?: boolean;
  /** Boleh memakai nomor yang belum ada di registri (akan diajukan pencatatannya oleh server). Bawaan true. */
  bolehBaru?: boolean;
  placeholder?: string;
  disabled?: boolean;
  size?: ControlSize;
  id?: string;
  className?: string;
}

/**
 * Isian nomor SK yang bisa dicari di registri SK tunggal. Nomor baru diperiksa dulu: bila nomor yang sama (tulisan bisa
 * berbeda) sudah tercatat, SK itu yang dipilih. Untuk form baru pakai {@link PilihSK} (menyimpan sk_id).
 */
export function PilihNomorSK({ value, onValueChange, cari, arsip = true, bolehBaru = true, placeholder = 'Cari nomor atau perihal SK', disabled, size, id, className }: PilihNomorSKProps) {
  const cariSK = useCariSK(arsip);
  const periksa = usePeriksaSK();
  const [item, setItem] = React.useState<SKDitemukan | null>(value ? { nomor: value } : null);
  const [saran, setSaran] = React.useState<string | null>(null);
  React.useEffect(() => {
    if ((value ?? null) !== (item?.nomor ?? null)) setItem(value ? { nomor: value } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const muat = React.useCallback(
    async (q: string, signal: AbortSignal) => {
      const [a, b] = await Promise.all([cariSK(q, signal), cari ? cari(q, signal).catch(() => []) : Promise.resolve([])]);
      const lihat = new Set<string>();
      return [...a, ...b].filter((s) => {
        const k = s.nomor.trim().toUpperCase().replace(/[^\p{L}\p{N}]+/gu, '');
        if (!k || lihat.has(k)) return false;
        lihat.add(k);
        return true;
      });
    },
    [cariSK, cari],
  );
  const set = (s: SKDitemukan | null) => {
    setItem(s);
    onValueChange?.(s?.nomor ?? null, s);
  };
  return (
    <>
      <Combobox<SKDitemukan>
        id={id}
        className={cn('u-pilih-sk-nomor', className)}
        size={size}
        disabled={disabled}
        placeholder={placeholder}
        icon={<ScrollText />}
        loadItems={muat}
        value={item}
        onValueChange={(s) => {
          setSaran(null);
          set(s);
        }}
        itemToString={(s) => s.nomor}
        itemKey={(s) => s.id ?? `${s.baru ? 'baru:' : ''}${s.nomor}`}
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
                onTambah: async (k) => {
                  const nomor = k.trim();
                  if (!nomor) return null;
                  const h = await periksa(nomor);
                  if (h?.sama?.length) {
                    setSaran(`Nomor ini sudah tercatat sebagai ${h.sama[0].nomor}${h.sama[0].perihal ? ` (${h.sama[0].perihal})` : ''}. SK itu yang dipakai.`);
                    return keDitemukan(h.sama[0]);
                  }
                  return { nomor, baru: true };
                },
              }
            : undefined
        }
      />
      {saran && <span className="u-pilih-sk-saran">{saran}</span>}
    </>
  );
}

export interface IsianSKProps extends Omit<PilihNomorSKProps, 'value' | 'onValueChange'> {
  value?: NilaiSK | null;
  onValueChange?: (nilai: NilaiSK | null) => void;
  /** Tampilkan tanggal SK untuk nomor baru. Bawaan true. */
  tanggal?: boolean;
  /** Tampilkan unggah/pilih berkas SK untuk nomor baru. Bawaan true. */
  berkas?: boolean;
  /** Label kelompok. Bawaan "Nomor SK". */
  label?: React.ReactNode;
  required?: boolean;
  error?: string;
  /** Ekstensi berkas SK. Bawaan PDF dan gambar. */
  accept?: string;
}

/**
 * Nomor SK dari registri SK tunggal. SK terpilih dari registri: tanggal, penerbit, penandatangan, dan berkas tampil dari
 * registri (tidak diunggah ulang), nilai membawa `sk_id`. Nomor baru (belum tercatat): tanggal + berkas diisi, lalu
 * server mengajukan pencatatannya ke unit penerbit. Kirim `sk_id` bila ada, selain itu nomor/tanggal/berkas_id.
 */
export function IsianSK({ value, onValueChange, tanggal = true, berkas = true, label = 'Nomor SK', required, error, accept = '.pdf,.jpg,.jpeg,.png', className, ...pilih }: IsianSKProps) {
  const v = value ?? null;
  const set = (patch: Partial<NilaiSK>) => {
    const n = { nomor: v?.nomor ?? '', ...v, ...patch };
    onValueChange?.(n.nomor || n.berkas_id ? n : null);
  };
  const dariRegistri = !!v?.sk_id && !!v.sk;
  return (
    <div className={cn('u-isian-sk', className)}>
      <Field
        label={label}
        required={required}
        error={error}
        description={pilih.bolehBaru === false ? 'Cari SK yang sudah tercatat di registri SK.' : 'Cari SK di registri SK. Belum tercatat? Ketik nomornya; pencatatannya diajukan ke unit penerbit.'}
      >
        <PilihNomorSK
          {...pilih}
          value={v?.nomor || null}
          onValueChange={(nomor, sk) => {
            if (!nomor) return onValueChange?.(null);
            if (sk?.sk && sk.id) {
              onValueChange?.({ nomor: sk.sk.nomor, tanggal: sk.sk.tanggal ?? null, perihal: sk.sk.perihal ?? null, berkas_id: null, sk_id: sk.id, sk: sk.sk });
              return;
            }
            set({ nomor, tanggal: sk?.tanggal ?? v?.tanggal ?? null, perihal: sk?.perihal ?? null, berkas_id: sk?.berkas_id ?? v?.berkas_id ?? null, sk_id: null, sk: null });
          }}
        />
      </Field>
      {dariRegistri && v?.sk ? (
        <KartuSK sk={v.sk} />
      ) : (
        (tanggal || berkas) && (
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
        )
      )}
    </div>
  );
}

/** Body API dari {@link NilaiSK}: `sk_id` bila SK dari registri, selain itu nomor/tanggal/berkas_id (diajukan ke registri). */
export function bodySK(n: NilaiSK | null | undefined): Record<string, unknown> | null {
  if (!n) return null;
  if (n.sk_id) return { sk_id: n.sk_id };
  return { nomor: n.nomor, tanggal: n.tanggal ?? null, perihal: n.perihal ?? null, berkas_id: n.berkas_id ?? null };
}

