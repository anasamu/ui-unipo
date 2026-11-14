'use client';
import * as React from 'react';
import { Wizard, WizardReview, type WizardStep } from '../components/wizard';
import { useToast } from '../components/overlays';
import { Skeleton } from '../components/actions';
import { GalatApi } from '../siakad/galat';
import { invalidateSiakad, pesanGalat, useSiakad } from '../siakad/provider';
import { isianSkema, jenisIsian, labelKolom, labelNilai, rapikanGalat, validasiBody, type JenisIsian } from './aturan';
import { FormulirSkema, useFormulirSkema } from './isian';
import { useSumber } from './katalog';
import type { Baris, Skema } from './tipe';

export interface LangkahSkema {
  id: string;
  judul: string;
  keterangan?: string;
  /** Kolom skema di langkah ini. */
  kolom: string[];
}

const KELOMPOK: Array<{ id: string; judul: string; keterangan: string; cocok: (k: string, j: JenisIsian) => boolean }> = [
  { id: 'identitas', judul: 'Identitas', keterangan: 'Kode, nama, dan jenis.', cocok: (k, j) => /^(kode|nama|judul|jenis|tipe|kategori|level|bidang|perihal|subjek|nomor|no_)/.test(k) || (j === 'enum' && /jenis|tipe|kategori/.test(k)) },
  { id: 'pihak', judul: 'Pihak terkait', keterangan: 'Mahasiswa, dosen, unit, atau data lain yang dirujuk.', cocok: (_, j) => j === 'acuan' },
  { id: 'jadwal', judul: 'Waktu', keterangan: 'Tanggal, jam, dan periode.', cocok: (k, j) => j === 'tanggal' || j === 'waktu' || j === 'jam' || /(mulai|selesai|batas|periode|semester)/.test(k) },
  { id: 'nilai', judul: 'Angka & ketentuan', keterangan: 'Nominal, kuota, dan batas.', cocok: (_, j) => j === 'angka' || j === 'bulat' || j === 'boolean' },
  { id: 'uraian', judul: 'Uraian', keterangan: 'Keterangan, syarat, dan lampiran.', cocok: (_, j) => j === 'teks-panjang' || j === 'json' || j === 'file' || j === 'daftar' },
];

/** Bagi isian skema menjadi langkah (identitas, pihak terkait, waktu, angka, uraian, lainnya). */
export function langkahDariSkema(skema: Skema | undefined, maksPerLangkah = 6): LangkahSkema[] {
  const sisa = isianSkema(skema).map(([k, s]) => [k, jenisIsian(k, s)] as const);
  const out: LangkahSkema[] = [];
  const pakai = new Set<string>();
  for (const g of KELOMPOK) {
    const kolom = sisa.filter(([k, j]) => !pakai.has(k) && g.cocok(k, j)).map(([k]) => k);
    kolom.forEach((k) => pakai.add(k));
    for (let i = 0; i < kolom.length; i += maksPerLangkah) out.push({ id: `${g.id}-${i}`, judul: g.judul, keterangan: g.keterangan, kolom: kolom.slice(i, i + maksPerLangkah) });
  }
  const lain = sisa.filter(([k]) => !pakai.has(k)).map(([k]) => k);
  if (lain.length) {
    // Isian lain digabung ke langkah pertama bila sedikit.
    if (out.length && lain.length <= 2) out[0].kolom.push(...lain);
    else out.push({ id: 'lain', judul: 'Lainnya', kolom: lain });
  }
  return out.length ? out : [{ id: 'semua', judul: 'Data', kolom: [] }];
}

export interface WizardSumberProps {
  /** Path sumber data, mis. '/v1/sarpras/peminjaman'. */
  sumber: string;
  induk?: Record<string, unknown>;
  /** Langkah sendiri; bawaan dibagi otomatis dari skema. */
  langkah?: LangkahSkema[];
  /** Nilai awal. */
  nilai?: Record<string, unknown>;
  title?: React.ReactNode;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  finishLabel?: string;
  onSelesai?: (b: Baris) => void;
}

/**
 * Formulir tambah bertahap dari skema endpoint POST: tiap langkah divalidasi dengan aturan backend sebelum lanjut,
 * langkah terakhir ringkasan, lalu dikirim sekali. Galat 422 dari server membuka langkah isian yang salah.
 */
export function WizardSumber({ sumber: id, induk, langkah, nilai, title, description, aside, finishLabel, onSelesai }: WizardSumberProps) {
  const st = useSumber(id);
  const siakad = useSiakad();
  const toast = useToast();
  const op = st.op(st.sumber?.create);
  const skema = op?.b?.s;
  const form = useFormulirSkema(skema, { nilai });
  const [step, setStep] = React.useState(0);
  const daftar = React.useMemo(() => (langkah ?? langkahDariSkema(skema)).map((l) => ({ ...l, kolom: l.kolom.filter((k) => !(induk && k in induk)) })).filter((l) => l.kolom.length), [langkah, skema, induk]);
  if (st.loading) return <Skeleton height={320} />;
  if (st.error) return <GalatApi error={st.error} />;
  if (!op || !skema) return <GalatApi error={new Error('Sumber ini tidak bisa ditambah lewat API.')} />;
  const wajib = new Set(skema.rq ?? []);
  const periksaLangkah = (kolom: string[]) => {
    const sub: Skema = { ...skema, pr: Object.fromEntries(kolom.map((k) => [k, skema.pr![k]])), rq: (skema.rq ?? []).filter((k) => kolom.includes(k)) };
    const r = validasiBody(sub, form.nilai);
    form.setGalat((g) => ({ ...g, ...Object.fromEntries(kolom.map((k) => [k, r.galat[k] ?? ''])) }));
    const k = Object.keys(r.galat)[0];
    return k ? `${labelKolom(k)}: ${rapikanGalat(r.galat[k])}` : null;
  };
  const steps: WizardStep[] = [
    ...daftar.map((l) => ({
      id: l.id,
      title: l.judul,
      description: l.keterangan,
      error: l.kolom.some((k) => form.galat[k]),
      optional: !l.kolom.some((k) => wajib.has(k)),
      content: <FormulirSkema skema={skema} form={form} kolom={l.kolom} />,
      onNext: () => periksaLangkah(l.kolom),
    })),
    {
      id: 'tinjau',
      title: 'Tinjau',
      description: 'Periksa lalu kirim.',
      content: (
        <WizardReview
          sections={daftar.map((l, i) => ({
            title: l.judul,
            onEdit: () => setStep(i),
            items: l.kolom.map((k) => ({ label: labelKolom(k), value: tampilNilai(form.nilai[k]) })),
          }))}
        />
      ),
    },
  ];
  return (
    <Wizard
      steps={steps}
      step={step}
      onStepChange={setStep}
      title={title ?? `Tambah ${st.sumber?.title.toLowerCase()}`}
      description={description}
      aside={aside}
      finishLabel={finishLabel ?? 'Kirim'}
      onFinish={async () => {
        const body = form.kirim();
        if (!body) {
          const k = Object.keys(form.galat).find((x) => form.galat[x]);
          const i = daftar.findIndex((l) => k && l.kolom.includes(k));
          if (i >= 0) setStep(i);
          return 'Masih ada isian yang perlu diperbaiki.';
        }
        try {
          const r = await siakad.request({ method: op.m, path: op.path, query: { ...induk } as never, body, multipart: typeof FormData !== 'undefined' && body instanceof FormData });
          toast.add({ title: `${st.sumber?.title} terkirim`, type: 'success' });
          invalidateSiakad('katalog:');
          onSelesai?.((r.data as Baris) ?? {});
          return null;
        } catch (e) {
          if (form.galatServer(e)) {
            const g = (e as { details?: Record<string, unknown> }).details ?? {};
            const i = daftar.findIndex((l) => l.kolom.some((k) => k in g));
            if (i >= 0) setStep(i);
            return 'Server menolak beberapa isian. Periksa langkah yang ditandai.';
          }
          return pesanGalat(e);
        }
      }}
    />
  );
}

function tampilNilai(v: unknown): string {
  if (v === undefined || v === null || v === '') return '–';
  if (Array.isArray(v)) return v.join(', ') || '–';
  if (typeof FileList !== 'undefined' && v instanceof FileList) return Array.from(v).map((f) => f.name).join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return labelNilai(v);
}
