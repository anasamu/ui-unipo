'use client';
import * as React from 'react';
import { ArrowLeft, ArrowRight, Check, CircleAlert } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './actions';
import { Dialog } from './overlays';

type Hasil = void | string | null | undefined;

export interface PanelLangkahStep {
  id: string;
  /** Judul pendek (tampil di penanda langkah dan kepala isi). */
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  content: React.ReactNode;
  /**
   * Validasi langkah ini, dipanggil saat Lanjut dan sebelum simpan. Kembalikan pesan galat (string) untuk menahan;
   * kosong = lolos. Boleh async (mis. cek ke API).
   */
  validate?: () => Hasil | Promise<Hasil>;
  /** Tandai bermasalah dari luar (mis. galat server 422 pada kolom langkah ini). */
  error?: boolean;
  optional?: boolean;
  /**
   * Alasan tombol utama (Lanjut/Simpan) belum bisa ditekan di langkah ini, mis. "Isi nomor SK dulu". Tombol nonaktif dan
   * alasannya tampil di kaki panel, agar pengguna tahu apa yang kurang tanpa menebak.
   */
  blocked?: React.ReactNode;
}

export interface PanelLangkahProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  steps: PanelLangkahStep[];
  /** Langkah aktif (terkendali). */
  step?: number;
  onStepChange?: (step: number) => void;
  /**
   * `buat` (bawaan): maju berurutan, langkah yang belum dilewati terkunci. `ubah`: lompat ke langkah mana pun dan tombol
   * simpan tersedia di setiap langkah (semua langkah tetap divalidasi sebelum simpan).
   */
  mode?: 'buat' | 'ubah';
  /** Simpan. Kembalikan pesan galat untuk menahan panel tetap terbuka; kosong = panel ditutup. */
  onFinish: () => Hasil | Promise<Hasil>;
  finishLabel?: React.ReactNode;
  nextLabel?: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
  /** Isi kecil di kaki kiri, mis. "Kolom bertanda * wajib". */
  footerNote?: React.ReactNode;
  className?: string;
}

/**
 * Formulir bertahap di panel samping (Sheet): penanda langkah bernomor di atas isi (menempel saat digulir), satu
 * langkah per layar, validasi per langkah, Kembali/Lanjut, dan simpan di langkah terakhir (biasanya ringkasan
 * `WizardReview`). Mode `ubah` untuk mengubah data yang sudah ada: lompat bebas dan simpan dari langkah mana pun.
 * Di ponsel panel menjadi lembar bawah.
 */
export function PanelLangkah({
  open,
  onOpenChange,
  title,
  description,
  steps,
  step: stepProp,
  onStepChange,
  mode = 'buat',
  onFinish,
  finishLabel = 'Simpan',
  nextLabel = 'Lanjut',
  size = 'lg',
  footerNote,
  className,
}: PanelLangkahProps) {
  const [inner, setInner] = React.useState(0);
  const step = Math.min(stepProp ?? inner, Math.max(0, steps.length - 1));
  const [visited, setVisited] = React.useState(mode === 'ubah' ? steps.length - 1 : 0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [salah, setSalah] = React.useState<Set<string>>(new Set());
  const headRef = React.useRef<HTMLHeadingElement>(null);
  const first = React.useRef(true);
  const ubah = mode === 'ubah';
  const last = step === steps.length - 1;
  const cur = steps[step];

  React.useEffect(() => {
    if (!open) {
      // Panel yang tetap terpasang saat tertutup mulai bersih lagi saat dibuka berikutnya.
      first.current = true;
      setVisited(mode === 'ubah' ? steps.length - 1 : 0);
      setError(null);
      setSalah(new Set());
      return;
    }
    if (first.current) {
      first.current = false;
      return;
    }
    headRef.current?.focus({ preventScroll: true });
    headRef.current?.closest('.u-dialog-body')?.scrollTo({ top: 0 });
  }, [step, open]);

  const go = (i: number) => {
    setError(null);
    setInner(i);
    setVisited((v) => Math.max(v, i));
    onStepChange?.(i);
  };

  const tandai = (id: string, gagal: boolean) =>
    setSalah((s) => {
      if (s.has(id) === gagal) return s;
      const n = new Set(s);
      if (gagal) n.add(id);
      else n.delete(id);
      return n;
    });

  const periksa = async (s: PanelLangkahStep): Promise<string | null> => {
    const r = await s.validate?.();
    const pesan = typeof r === 'string' && r ? r : null;
    tandai(s.id, !!pesan);
    return pesan;
  };

  const jalankan = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error)?.message || 'Gagal menyimpan. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const lanjut = () =>
    jalankan(async () => {
      if (!cur) return;
      const p = await periksa(cur);
      if (p) setError(p);
      else go(step + 1);
    });

  const simpan = () =>
    jalankan(async () => {
      for (let i = 0; i < steps.length; i++) {
        const p = await periksa(steps[i]!);
        if (p) {
          if (i !== step) go(i);
          setError(p);
          return;
        }
      }
      const r = await onFinish();
      if (typeof r === 'string' && r) setError(r);
      else onOpenChange(false);
    });

  if (!cur) return null;
  const pct = Math.round(((step + 1) / steps.length) * 100);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !busy && onOpenChange(o)}
      side="right"
      size={size}
      title={title}
      description={description}
      className={cn('u-panel-langkah', className)}
      footer={
        <div className="u-pl-kaki">
          {error ? (
            <p className="u-pl-galat" role="alert">
              <CircleAlert aria-hidden /> {error}
            </p>
          ) : cur.blocked ? (
            <p className="u-pl-catatan" data-blokir="" aria-live="polite">
              {cur.blocked}
            </p>
          ) : footerNote ? (
            <p className="u-pl-catatan">{footerNote}</p>
          ) : null}
          <div className="u-pl-aksi">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => go(step - 1)} disabled={busy}>
                <ArrowLeft /> Kembali
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
                Batal
              </Button>
            )}
            <span className="u-pl-spasi" />
            {ubah && !last ? (
              <Button variant="outline" onClick={() => void simpan()} disabled={busy}>
                {finishLabel}
              </Button>
            ) : null}
            {last ? (
              <Button onClick={() => void simpan()} loading={busy} disabled={!busy && !!cur.blocked}>
                {finishLabel}
              </Button>
            ) : (
              <Button onClick={() => void lanjut()} loading={busy} disabled={!busy && !!cur.blocked}>
                {nextLabel}
                {!busy && <ArrowRight />}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <nav className="u-pl-langkah" aria-label="Langkah">
        <ol>
          {steps.map((s, i) => {
            const gagal = s.error || salah.has(s.id);
            const state = gagal ? 'error' : i === step ? 'current' : i < step || i <= visited ? 'complete' : 'upcoming';
            const bisa = i !== step && (ubah || i <= visited);
            return (
              <li key={s.id} data-state={state} data-aktif={i === step ? '' : undefined}>
                <button type="button" disabled={!bisa || busy} onClick={() => go(i)} aria-current={i === step ? 'step' : undefined} title={typeof s.title === 'string' ? s.title : undefined}>
                  <span className="u-pl-tanda" aria-hidden>
                    {state === 'error' ? <CircleAlert /> : state === 'complete' && i !== step ? <Check /> : i + 1}
                  </span>
                  <span className="u-pl-judul-langkah">{s.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="u-pl-progres" aria-hidden>
          <span style={{ width: `${pct}%` }} />
        </div>
      </nav>
      <section className="u-pl-isi" aria-labelledby="u-pl-judul">
        <header className="u-pl-kepala">
          <p className="u-pl-hitung">
            Langkah {step + 1} dari {steps.length}
            {cur.optional ? <span> · tidak wajib</span> : null}
          </p>
          <h3 id="u-pl-judul" className="u-pl-judul" tabIndex={-1} ref={headRef}>
            {cur.icon ? <span className="u-pl-ikon">{cur.icon}</span> : null}
            {cur.title}
          </h3>
          {cur.description ? <p className="u-pl-desk">{cur.description}</p> : null}
        </header>
        <div className="u-pl-badan" key={cur.id}>
          {cur.content}
        </div>
      </section>
    </Dialog>
  );
}
