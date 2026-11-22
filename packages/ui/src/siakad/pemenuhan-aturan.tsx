'use client';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../components/actions';
import { Alert } from '../components/display';
import { Field, Input, SegmentedControl, Switch, Textarea } from '../components/forms';
import { Select } from '../components/select';
import type { GrupKondisi, IndikatorAturan } from './aturan';
import { IsianAngka } from '../components/isian-angka';
import { keAngka } from '../lib/angka';

/*
 * "Cara memenuhi" aturan syarat (wizard aturan, langkah Ketentuan). Disimpan di aturan.parameter untuk jenis syarat
 * (SIAKAD BuktiSyarat\Services\Pemenuhan, docs/BUKTI-SYARAT.md dan docs/PLAGIASI.md):
 *
 *   otomatis : dari data SIAKAD (bawaan)
 *   unggah / isian / ceklis / gabungan : mahasiswa mengirim bukti, divalidasi petugas unit (kondisi bukti_diterima memuat kode)
 *   plagiasi : layanan cek plagiasi (kondisi similarity_<jenis> <= batas), unit pemeriksa bawaan Pustikom
 *
 * Unit pemilik (penyusun kebijakan) dan unit validasi/pemeriksa dua isian terpisah.
 */

export type CaraPemenuhan = 'otomatis' | 'unggah' | 'isian' | 'ceklis' | 'gabungan' | 'plagiasi';

export interface IsianBukti {
  kode: string;
  label: string;
  tipe: 'teks' | 'angka' | 'tanggal' | 'tautan';
  wajib: boolean;
}

export interface ParameterPemenuhan {
  unit_pemilik?: string;
  pemenuhan?: {
    cara: CaraPemenuhan;
    kode?: string;
    label?: string;
    petunjuk?: string | null;
    format?: string[];
    maks_mb?: number;
    isian?: IsianBukti[];
    ceklis?: string[];
    berlaku_bulan?: number | null;
    pakai_ulang?: boolean;
    unit_validasi?: string;
  };
  plagiasi?: {
    jenis_naskah: string;
    unit_pemeriksa: string;
    berlaku_bulan: number;
    sampai_naskah_berubah: boolean;
    cek_gratis: number;
    cek_maks: number;
    sla_hari: number;
    format: string[];
    maks_mb: number;
    setuju_pembimbing: boolean;
    pengecualian?: string | null;
  };
}

export const UNIT_ATURAN: Array<{ value: string; label: string }> = [
  { value: 'BAAK', label: 'BAAK (akademik)' },
  { value: 'FAKULTAS', label: 'Fakultas/prodi' },
  { value: 'BAUK', label: 'BAUK (keuangan)' },
  { value: 'LP2M', label: 'LPPM/LP2M' },
  { value: 'PUSTIKOM', label: 'Pustikom' },
  { value: 'PERPUSTAKAAN', label: 'UPT Perpustakaan' },
  { value: 'BAHASA', label: 'UPT Bahasa' },
  { value: 'KEMAHASISWAAN', label: 'Kemahasiswaan' },
  { value: 'LABTERPADU', label: 'UPT Laboratorium' },
];

export const JENIS_NASKAH: Array<{ value: string; label: string }> = [
  { value: 'proposal', label: 'Proposal' },
  { value: 'hasil', label: 'Naskah seminar hasil' },
  { value: 'skripsi', label: 'Skripsi' },
  { value: 'tesis', label: 'Tesis' },
  { value: 'artikel', label: 'Artikel' },
];

const PLAGIASI_BAWAAN: NonNullable<ParameterPemenuhan['plagiasi']> = {
  jenis_naskah: 'skripsi',
  unit_pemeriksa: 'PUSTIKOM',
  berlaku_bulan: 6,
  sampai_naskah_berubah: true,
  cek_gratis: 2,
  cek_maks: 5,
  sla_hari: 3,
  format: ['pdf', 'docx'],
  maks_mb: 20,
  setuju_pembimbing: false,
  pengecualian: 'Kutipan bertanda, daftar pustaka, dan sumber kurang dari 8 kata dikecualikan.',
};

const CARA: Array<{ value: CaraPemenuhan; label: string }> = [
  { value: 'otomatis', label: 'Otomatis' },
  { value: 'unggah', label: 'Unggah berkas' },
  { value: 'isian', label: 'Isian' },
  { value: 'ceklis', label: 'Ceklis' },
  { value: 'gabungan', label: 'Gabungan' },
  { value: 'plagiasi', label: 'Cek plagiasi' },
];


/** Batas similarity dari kondisi aturan (similarity_<jenis> <= N). */
function batasSimilarity(k: GrupKondisi | null, jenis: string): number | null {
  if (!k) return null;
  const daftar = 'semua' in k ? k.semua : k.salah_satu;
  for (const c of daftar) {
    if ('indikator' in c && c.indikator === `similarity_${jenis}` && (c.op === '<=' || c.op === '<')) return Number(c.nilai);
    if (!('indikator' in c)) {
      const b = batasSimilarity(c as GrupKondisi, jenis);
      if (b !== null) return b;
    }
  }
  return null;
}

export function IsianPemenuhan({
  value,
  onValueChange,
  kondisi,
  onKondisi,
  indikator,
}: {
  value: ParameterPemenuhan | null;
  onValueChange: (v: ParameterPemenuhan | null) => void;
  kondisi: GrupKondisi | null;
  onKondisi: (k: GrupKondisi) => void;
  indikator: IndikatorAturan[];
}) {
  const p = value ?? {};
  const m = p.pemenuhan ?? { cara: 'otomatis' as CaraPemenuhan };
  const cara = m.cara;
  const pl = p.plagiasi ?? PLAGIASI_BAWAAN;
  const adaIndikator = (k: string) => indikator.some((i) => i.kode === k);
  const setM = (x: Partial<NonNullable<ParameterPemenuhan['pemenuhan']>>) => onValueChange({ ...p, pemenuhan: { ...m, ...x } });
  const setPl = (x: Partial<NonNullable<ParameterPemenuhan['plagiasi']>>) => onValueChange({ ...p, plagiasi: { ...pl, ...x }, pemenuhan: { cara: 'plagiasi' } });
  const gantiCara = (c: CaraPemenuhan) => {
    if (c === 'otomatis') {
      const { pemenuhan: _, plagiasi: __, ...sisa } = p;
      onValueChange(Object.keys(sisa).length ? sisa : null);
      return;
    }
    if (c === 'plagiasi') {
      onValueChange({ ...p, pemenuhan: { cara: 'plagiasi' }, plagiasi: pl, unit_pemilik: p.unit_pemilik ?? 'LP2M' });
      return;
    }
    const { plagiasi: _, ...sisa } = p;
    onValueChange({
      ...sisa,
      pemenuhan: {
        cara: c,
        kode: m.kode ?? '',
        label: m.label ?? '',
        petunjuk: m.petunjuk ?? '',
        format: m.format ?? ['pdf'],
        maks_mb: m.maks_mb ?? 5,
        isian: m.isian ?? (c === 'isian' || c === 'gabungan' ? [{ kode: 'nomor', label: 'Nomor', tipe: 'teks', wajib: true }] : []),
        ceklis: m.ceklis ?? (c === 'ceklis' ? ['Saya menyatakan data yang saya kirim benar.'] : []),
        berlaku_bulan: m.berlaku_bulan ?? null,
        pakai_ulang: m.pakai_ulang ?? true,
        unit_validasi: m.unit_validasi,
      },
    });
  };
  const batas = cara === 'plagiasi' ? batasSimilarity(kondisi, pl.jenis_naskah) : null;
  const unggah = cara === 'unggah' || cara === 'gabungan';
  const isian = cara === 'isian' || cara === 'gabungan';
  const ceklis = cara === 'ceklis' || cara === 'gabungan';

  return (
    <div className="u-pemenuhan">
      <Field label="Cara memenuhi" description="Otomatis dari data SIAKAD, atau mahasiswa mengirim bukti yang divalidasi unit.">
        <SegmentedControl options={CARA} value={cara} onValueChange={(v) => gantiCara(v as CaraPemenuhan)} />
      </Field>
      <div className="u-form-kisi" data-kolom="2">
        <Field label="Unit pemilik aturan" description="Yang menyusun dan mengusulkan kebijakan ini.">
          <Select options={UNIT_ATURAN} value={p.unit_pemilik ?? null} placeholder="Ikut kategori" onValueChange={(v) => onValueChange({ ...p, unit_pemilik: v ?? undefined })} />
        </Field>
        {cara !== 'otomatis' && cara !== 'plagiasi' && (
          <Field label="Unit validasi" description="Petugas unit ini yang menerima atau menolak bukti.">
            <Select options={UNIT_ATURAN} value={m.unit_validasi ?? null} placeholder="Sama dengan pemilik" onValueChange={(v) => setM({ unit_validasi: v ?? undefined })} />
          </Field>
        )}
        {cara === 'plagiasi' && (
          <Field label="Unit pemeriksa" description="Yang menjalankan cek dan mengunggah laporan.">
            <Select options={UNIT_ATURAN} value={pl.unit_pemeriksa} onValueChange={(v) => setPl({ unit_pemeriksa: v ?? 'PUSTIKOM' })} />
          </Field>
        )}
      </div>

      {cara !== 'otomatis' && cara !== 'plagiasi' && (
        <>
          <div className="u-form-kisi" data-kolom="2">
            <Field label="Nama bukti" required>
              <Input value={m.label ?? ''} onChange={(e) => setM({ label: e.target.value })} placeholder="Sertifikat TOEFL" />
            </Field>
            <Field label="Kode bukti" required description="Huruf kecil tanpa spasi. Kode sama = bukti dipakai ulang aturan lain.">
              <Input value={m.kode ?? ''} onChange={(e) => setM({ kode: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} placeholder="toefl" />
            </Field>
          </div>
          <Field label="Petunjuk untuk mahasiswa" optional>
            <Textarea rows={2} value={m.petunjuk ?? ''} onChange={(e) => setM({ petunjuk: e.target.value })} />
          </Field>
          {unggah && (
            <div className="u-form-kisi" data-kolom="2">
              <Field label="Format berkas" description="Pisahkan dengan koma.">
                <Input value={(m.format ?? ['pdf']).join(', ')} onChange={(e) => setM({ format: e.target.value.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean) })} />
              </Field>
              <Field label="Ukuran maksimal (MB)">
                <IsianAngka value={keAngka(m.maks_mb ?? 5)} min={1} max={50} onValueChange={(n) => setM({ maks_mb: n ?? 5 })} />
              </Field>
            </div>
          )}
          {isian && (
            <Field label="Isian">
              <ul className="u-pemenuhan-daftar">
                {(m.isian ?? []).map((f, i) => (
                  <li key={i}>
                    <Input aria-label="Label isian" value={f.label} onChange={(e) => setM({ isian: (m.isian ?? []).map((x, j) => (j === i ? { ...x, label: e.target.value, kode: x.kode || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_') } : x)) })} />
                    <Select
                      aria-label="Tipe isian"
                      options={[
                        { value: 'teks', label: 'Teks' },
                        { value: 'angka', label: 'Angka' },
                        { value: 'tanggal', label: 'Tanggal' },
                        { value: 'tautan', label: 'Tautan/DOI' },
                      ]}
                      value={f.tipe}
                      onValueChange={(v) => setM({ isian: (m.isian ?? []).map((x, j) => (j === i ? { ...x, tipe: (v ?? 'teks') as IsianBukti['tipe'] } : x)) })}
                    />
                    <label className="u-pemenuhan-wajib">
                      <Switch size="sm" checked={f.wajib} onCheckedChange={(c) => setM({ isian: (m.isian ?? []).map((x, j) => (j === i ? { ...x, wajib: c } : x)) })} /> Wajib
                    </label>
                    <Button variant="ghost" size="sm" iconOnly aria-label="Hapus isian" onClick={() => setM({ isian: (m.isian ?? []).filter((_, j) => j !== i) })}>
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" onClick={() => setM({ isian: [...(m.isian ?? []), { kode: '', label: '', tipe: 'teks', wajib: true }] })}>
                <Plus /> Tambah isian
              </Button>
            </Field>
          )}
          {ceklis && (
            <Field label="Pernyataan yang dicentang">
              <ul className="u-pemenuhan-daftar">
                {(m.ceklis ?? []).map((c, i) => (
                  <li key={i}>
                    <Input aria-label="Pernyataan" value={c} onChange={(e) => setM({ ceklis: (m.ceklis ?? []).map((x, j) => (j === i ? e.target.value : x)) })} />
                    <Button variant="ghost" size="sm" iconOnly aria-label="Hapus pernyataan" onClick={() => setM({ ceklis: (m.ceklis ?? []).filter((_, j) => j !== i) })}>
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" onClick={() => setM({ ceklis: [...(m.ceklis ?? []), ''] })}>
                <Plus /> Tambah pernyataan
              </Button>
            </Field>
          )}
          <div className="u-form-kisi" data-kolom="2">
            <Field label="Masa berlaku (bulan)" optional description="Kosong = tidak kedaluwarsa.">
              <IsianAngka value={keAngka(m.berlaku_bulan)} min={1} max={120} onValueChange={(n) => setM({ berlaku_bulan: n })} />
            </Field>
            <Field label="Bukti dipakai ulang" description="Bukti yang sudah diterima berlaku untuk aturan lain dengan kode sama.">
              <Switch checked={m.pakai_ulang ?? true} onCheckedChange={(c) => setM({ pakai_ulang: c })} />
            </Field>
          </div>
          {m.kode && (
            <Alert variant="info" title="Kondisi aturan">
              Aturan ini terpenuhi bila bukti “{m.label || m.kode}” sudah diterima unit.{' '}
              <Button variant="link" size="sm" onClick={() => onKondisi({ semua: [{ indikator: 'bukti_diterima', op: 'memuat', nilai: m.kode }] })} disabled={!adaIndikator('bukti_diterima')}>
                Pakai sebagai kondisi
              </Button>
            </Alert>
          )}
        </>
      )}

      {cara === 'plagiasi' && (
        <>
          <div className="u-form-kisi" data-kolom="3">
            <Field label="Jenis naskah">
              <Select options={JENIS_NASKAH} value={pl.jenis_naskah} onValueChange={(v) => setPl({ jenis_naskah: v ?? 'skripsi' })} />
            </Field>
            <Field label="Similarity paling tinggi (%)" description="Disimpan sebagai kondisi aturan.">
              <IsianAngka value={keAngka(batas)} min={0} max={100} placeholder="30" onValueChange={(n) => onKondisi({ semua: [{ indikator: `similarity_${pl.jenis_naskah}`, op: '<=', nilai: n ?? 30 }] })} />
            </Field>
            <Field label="Hasil berlaku (bulan)">
              <IsianAngka value={keAngka(pl.berlaku_bulan)} min={1} max={60} onValueChange={(n) => setPl({ berlaku_bulan: n ?? 6 })} />
            </Field>
            <Field label="Cek gratis">
              <IsianAngka value={keAngka(pl.cek_gratis)} min={0} max={20} onValueChange={(n) => setPl({ cek_gratis: n ?? 2 })} />
            </Field>
            <Field label="Cek paling banyak">
              <IsianAngka value={keAngka(pl.cek_maks)} min={1} max={50} onValueChange={(n) => setPl({ cek_maks: n ?? 5 })} />
            </Field>
            <Field label="Layanan selesai (hari kerja)">
              <IsianAngka value={keAngka(pl.sla_hari)} min={1} max={30} onValueChange={(n) => setPl({ sla_hari: n ?? 3 })} />
            </Field>
            <Field label="Format naskah">
              <Input value={pl.format.join(', ')} onChange={(e) => setPl({ format: e.target.value.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean) })} />
            </Field>
            <Field label="Ukuran maksimal (MB)">
              <IsianAngka value={keAngka(pl.maks_mb)} min={1} max={100} onValueChange={(n) => setPl({ maks_mb: n ?? 20 })} />
            </Field>
          </div>
          <div className="u-form-kisi" data-kolom="2">
            <Field label="Pembimbing menyetujui naskah dulu">
              <Switch checked={pl.setuju_pembimbing} onCheckedChange={(c) => setPl({ setuju_pembimbing: c })} />
            </Field>
            <Field label="Hasil gugur bila naskah diganti">
              <Switch checked={pl.sampai_naskah_berubah} onCheckedChange={(c) => setPl({ sampai_naskah_berubah: c })} />
            </Field>
          </div>
          <Field label="Pengecualian (catatan bagi pemeriksa)" optional>
            <Textarea rows={2} value={pl.pengecualian ?? ''} onChange={(e) => setPl({ pengecualian: e.target.value })} />
          </Field>
          {batas != null && (
            <p className="u-aturan-langkah-ket">
              Ringkasan: similarity {JENIS_NASKAH.find((j) => j.value === pl.jenis_naskah)?.label.toLowerCase()} paling tinggi {batas}%, dicek {UNIT_ATURAN.find((u) => u.value === pl.unit_pemeriksa)?.label ?? pl.unit_pemeriksa},
              hasil berlaku {pl.berlaku_bulan} bulan, {pl.cek_gratis} kali cek gratis dari paling banyak {pl.cek_maks}.
            </p>
          )}
        </>
      )}
    </div>
  );
}
