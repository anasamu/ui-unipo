'use client';
import * as React from 'react';
import { FilePlus2, FileText, ScrollText, ShieldCheck } from 'lucide-react';
import { Combobox, OptionContent, Select } from '../components/select';
import { DatePicker } from '../components/calendar';
import { Field, Input, type ControlSize } from '../components/forms';
import { Alert } from '../components/display';
import { Badge, Button } from '../components/actions';
import { Dialog, useToast } from '../components/overlays';
import { cn } from '../lib/cn';
import { formatDate } from '../lib/format';
import { CariAtauUnggahDokumen } from './cari-dokumen';
import { pesanGalat, useOptionalSiakad } from './provider';

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
  penandatangan?: { pejabat_id: number | null; jabatan: string | null; nama: string | null; ttd?: string | null } | null;
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
            <dd>{sk.penandatangan?.nama ? `${sk.penandatangan.jabatan ?? ''}${sk.penandatangan.jabatan ? ', ' : ''}${sk.penandatangan.nama}` : 'Diisi penerbit di registri'}</dd>
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

/**
 * Pilih SK dari registri SK tunggal: cari nomor/perihal, tampilkan nomor, tanggal, perihal, penerbit, penandatangan, dan
 * status, lihat berkasnya (hak baca, tanpa salinan). Nomor yang belum tercatat bisa diajukan pencatatannya ke penerbit;
 * nomor yang sama dengan tulisan berbeda langsung disarankan. Simpan `id` sebagai `sk_id` di data Anda.
 */
export function PilihSK({ value, sk: skAwal, onValueChange, jenis, penerbitUnitId, perihal, bolehAjukan = true, label = 'Surat keputusan', description, required, error, placeholder = 'Cari nomor atau perihal SK di registri', disabled, size, id, className }: PilihSKProps) {
  const siakad = useOptionalSiakad();
  const cari = useCariSK();
  const periksa = usePeriksaSK();
  const [sk, setSk] = React.useState<SKRegistri | null>(skAwal ?? null);
  const [ajukan, setAjukan] = React.useState<string | null>(null);
  const [saran, setSaran] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (skAwal && skAwal.id === value) setSk(skAwal);
  }, [skAwal, value]);
  React.useEffect(() => {
    if (!value) {
      setSk(null);
      return;
    }
    if (sk?.id === value || !siakad || value.startsWith('surat:')) return;
    const ac = new AbortController();
    siakad
      .request<SKRegistri>({ method: 'GET', path: `/v1/sk/${value}` }, { signal: ac.signal })
      .then((r) => setSk(r.data))
      .catch(() => undefined);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, siakad]);
  const pilih = (s: SKRegistri | null) => {
    setSk(s);
    onValueChange?.(s?.id ?? null, s);
  };
  const item = sk ? keDitemukan(sk) : null;
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
                  label: (k) => (k.trim() ? `Belum ada? Ajukan pencatatan SK “${k.trim()}”` : 'Ajukan pencatatan SK baru'),
                  onTambah: async (k) => {
                    const nomor = k.trim();
                    const h = nomor ? await periksa(nomor, penerbitUnitId) : null;
                    if (h?.sama?.length) {
                      // Nomor yang sama sudah tercatat (tulisan bisa berbeda): pakai SK itu, jangan catat ulang.
                      pilih(h.sama[0]);
                      setSaran(`SK ini sudah tercatat sebagai ${h.sama[0].nomor}. SK itu yang dipilih; tidak perlu mencatat ulang.`);
                      return keDitemukan(h.sama[0]);
                    }
                    setAjukan(nomor);
                    return null;
                  },
                }
              : undefined
          }
        />
      </Field>
      {saran && (
        <Alert variant="info" title={saran.startsWith('Ajuan') ? 'Ajuan pencatatan terkirim' : 'SK sudah tercatat'}>
          {saran}
        </Alert>
      )}
      {sk && <KartuSK sk={sk} />}
      {ajukan !== null && (
        <AjukanPencatatanSK
          open
          onOpenChange={(o) => !o && setAjukan(null)}
          nomor={ajukan}
          jenis={jenis}
          penerbitUnitId={penerbitUnitId}
          perihal={perihal}
          onTercatat={(s, pesan) => {
            setAjukan(null);
            setSaran(pesan ?? null);
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
  boleh_catat: boolean;
}
interface PenandatanganSK {
  pejabat_id: number;
  nama: string;
  jabatan: string;
  unit_penerbit_id: number;
}

export interface AjukanPencatatanSKProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nomor?: string;
  jenis?: string;
  penerbitUnitId?: number | null;
  perihal?: string;
  /** SK hasil pencatatan (atau SK yang ternyata sudah ada). */
  onTercatat: (sk: SKRegistri, pesan?: string) => void;
}

/**
 * Dialog mencatat SK ke registri. Pemegang sk.catat di unit penerbit: SK langsung terbit (penandatangan dipilih dari
 * data pejabat, tidak diketik). Unit lain: ajuan pencatatan (draf) yang diverifikasi penerbit.
 */
export function AjukanPencatatanSK({ open, onOpenChange, nomor: nomorAwal = '', jenis, penerbitUnitId, perihal: perihalAwal = '', onTercatat }: AjukanPencatatanSKProps) {
  const siakad = useOptionalSiakad();
  const periksa = usePeriksaSK();
  const [nomor, setNomor] = React.useState(nomorAwal);
  const [tanggal, setTanggal] = React.useState<string | null>(null);
  const [perihal, setPerihal] = React.useState(perihalAwal);
  const [penerbit, setPenerbit] = React.useState<number | null>(penerbitUnitId ?? null);
  const [pejabat, setPejabat] = React.useState<number | null>(null);
  const [tempat, setTempat] = React.useState('');
  const [berkas, setBerkas] = React.useState<string | null>(null);
  const [daftarPenerbit, setDaftarPenerbit] = React.useState<PenerbitSK[]>([]);
  const [daftarPejabat, setDaftarPejabat] = React.useState<PenandatanganSK[]>([]);
  const [cek, setCek] = React.useState<PeriksaSK | null>(null);
  const [mirip, setMirip] = React.useState(false);
  const [kirim, setKirim] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!siakad || !open) return;
    siakad
      .request<PenerbitSK[]>({ method: 'GET', path: '/v1/sk/penerbit' })
      .then((r) => {
        const d = Array.isArray(r.data) ? r.data : [];
        setDaftarPenerbit(d);
        // SK kalender, aturan, pengangkatan pejabat, dan kurikulum lazimnya SK Rektor: bawaan penerbit universitas.
        if (penerbitUnitId == null && jenis && ['kalender', 'aturan', 'pengangkatan', 'kurikulum'].includes(jenis)) {
          const u = d.find((x) => x.jenis === 'universitas');
          if (u) setPenerbit((p) => p ?? u.unit_id);
        }
      })
      .catch(() => setDaftarPenerbit([]));
  }, [siakad, open, penerbitUnitId, jenis]);
  const bolehCatat = daftarPenerbit.find((u) => u.unit_id === penerbit)?.boleh_catat ?? false;
  React.useEffect(() => {
    if (!siakad || !penerbit || !bolehCatat) {
      setDaftarPejabat([]);
      return;
    }
    siakad
      .request<PenandatanganSK[]>({ method: 'GET', path: '/v1/sk/penandatangan', query: { unit_id: penerbit } })
      .then((r) => setDaftarPejabat(Array.isArray(r.data) ? r.data : []))
      .catch(() => setDaftarPejabat([]));
  }, [siakad, penerbit, bolehCatat]);
  React.useEffect(() => {
    if (!nomor.trim()) {
      setCek(null);
      return;
    }
    const t = setTimeout(() => void periksa(nomor, penerbit).then(setCek), 350);
    return () => clearTimeout(t);
  }, [nomor, penerbit, periksa]);
  const simpan = async () => {
    if (!siakad) return;
    setKirim(true);
    setGalat(null);
    try {
      const r = await siakad.request<SKRegistri>({
        method: 'POST',
        path: '/v1/sk',
        body: { nomor, tanggal, perihal: perihal || null, jenis, penerbit_unit_id: penerbit, penandatangan_pejabat_id: bolehCatat ? pejabat : null, tempat: bolehCatat ? tempat || null : null, berkas_id: berkas, abaikan_mirip: mirip || undefined },
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
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={bolehCatat ? 'Catat SK di registri' : 'Ajukan pencatatan SK'}
      description={
        bolehCatat
          ? 'Anda pencatat SK unit penerbit ini: SK langsung terbit dan bisa dirujuk semua unit.'
          : 'SK belum ada di registri. Ajuan dikirim ke unit penerbit untuk diverifikasi; sementara itu SK sudah bisa dirujuk.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={simpan} loading={kirim} disabled={!nomor.trim() || !penerbit || !!sama}>
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
        <Field label="Unit penerbit" required description="Rektorat/universitas untuk SK Rektor, fakultas untuk SK Dekan, dan seterusnya.">
          <Select<number>
            value={penerbit}
            onValueChange={(v) => {
              setPenerbit(v);
              setPejabat(null);
            }}
            options={daftarPenerbit.map((u) => ({ value: u.unit_id, label: u.nama, description: u.boleh_catat ? 'Anda pencatat SK unit ini' : undefined }))}
            placeholder="Pilih unit penerbit"
          />
        </Field>
        <div className="u-ajukan-sk-dua">
          <Field label="Tanggal SK" optional>
            <DatePicker value={isoKeTanggal(tanggal)} onValueChange={(d) => setTanggal(tanggalKeIso(d))} placeholder="Tanggal SK" />
          </Field>
          <Field label="Perihal" optional>
            <Input value={perihal} onChange={(e) => setPerihal(e.target.value)} placeholder="mis. Kalender Akademik 2026/2027" />
          </Field>
        </div>
        {bolehCatat && (
          <div className="u-ajukan-sk-dua">
            <Field label="Penandatangan" description="Dari data pejabat (Organisasi & pejabat), tidak diketik.">
              <Select<number>
                value={pejabat}
                onValueChange={setPejabat}
                options={daftarPejabat.map((p) => ({ value: p.pejabat_id, label: p.nama, description: p.jabatan }))}
                placeholder={daftarPejabat.length ? 'Pilih pejabat' : 'Belum ada pejabat aktif'}
              />
            </Field>
            <Field label="Ditetapkan di" optional>
              <Input value={tempat} onChange={(e) => setTempat(e.target.value)} placeholder="Kosong = sama dengan SK terakhir unit ini" />
            </Field>
          </div>
        )}
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

