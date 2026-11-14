'use client';
import * as React from 'react';
import { ArrowLeft, ArrowRight, Check, CircleAlert, Pencil } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { formatTime } from '../lib/format';
import { Button } from './actions';

export interface WizardStep {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  content: React.ReactNode;
  /**
   * Dipanggil saat menekan Lanjut. Kembalikan pesan galat (string) untuk menahan langkah,
   * atau lempar galat. Cocok untuk menyimpan langkah ini ke API.
   */
  onNext?: () => void | string | null | undefined | Promise<void | string | null | undefined>;
  /** Tandai langkah bermasalah (mis. dari validasi server) tanpa membukanya. */
  error?: boolean;
  optional?: boolean;
}

export interface WizardProps {
  steps: WizardStep[];
  /** Langkah aktif (terkendali). */
  step?: number;
  onStepChange?: (step: number) => void;
  /** Dipanggil di langkah terakhir. Kembalikan pesan galat untuk menahan. */
  onFinish: () => void | string | null | undefined | Promise<void | string | null | undefined>;
  finishLabel?: React.ReactNode;
  nextLabel?: React.ReactNode;
  /** Judul di atas daftar langkah (desktop). */
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Waktu simpan terakhir untuk teks "Tersimpan 10.42". */
  savedAt?: Date | null;
  /** Bebaskan lompat ke langkah mana pun (bawaan: hanya ke langkah yang sudah dilewati). */
  freeNavigation?: boolean;
  /** Isi di bawah daftar langkah, mis. kontak panitia. */
  aside?: React.ReactNode;
  className?: string;
}

/**
 * Formulir bertahap: daftar langkah di kiri (desktop) atau bilah kemajuan (ponsel), satu langkah per layar,
 * simpan per langkah lewat `onNext`, pesan galat di dekat tombol, dan fokus ke judul tiap pindah langkah.
 */
export function Wizard({
  steps,
  step: stepProp,
  onStepChange,
  onFinish,
  finishLabel = 'Kirim',
  nextLabel = 'Simpan & lanjut',
  title,
  description,
  savedAt,
  freeNavigation,
  aside,
  className,
}: WizardProps) {
  const [inner, setInner] = React.useState(0);
  const step = stepProp ?? inner;
  const [visited, setVisited] = React.useState(step);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const headRef = React.useRef<HTMLHeadingElement>(null);
  const first = React.useRef(true);
  const last = step === steps.length - 1;
  const cur = steps[step]!;

  const go = (i: number) => {
    setError(null);
    setInner(i);
    setVisited((v) => Math.max(v, i));
    onStepChange?.(i);
  };
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    headRef.current?.focus({ preventScroll: false });
  }, [step]);

  const lanjut = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await (last ? onFinish() : cur.onNext?.());
      if (typeof r === 'string' && r) setError(r);
      else if (!last) go(step + 1);
    } catch (e) {
      setError((e as Error)?.message || 'Gagal menyimpan. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const pct = Math.round(((step + 1) / steps.length) * 100);
  return (
    <div className={cn('u-wizard-wrap', className)}>
      <div className="u-wizard">
        <aside className="u-wizard-nav">
          {(title || description) && (
            <div className="u-wizard-intro">
              {title && <p className="u-wizard-intro-title">{title}</p>}
              {description && <p className="u-wizard-intro-desc">{description}</p>}
            </div>
          )}
          <ol className="u-wizard-steps">
            {steps.map((s, i) => {
              const state = s.error ? 'error' : i === step ? 'current' : i < step || i <= visited ? 'complete' : 'upcoming';
              const can = i !== step && (freeNavigation || i <= visited);
              return (
                <li key={s.id} data-state={state}>
                  <button type="button" className="u-wizard-step" disabled={!can} onClick={() => go(i)} aria-current={i === step ? 'step' : undefined}>
                    <span className="u-wizard-marker" aria-hidden>
                      {state === 'complete' ? <Check /> : state === 'error' ? <CircleAlert /> : i + 1}
                    </span>
                    <span className="u-wizard-step-text">
                      <span className="u-wizard-step-title">{s.title}</span>
                      {s.description && <span className="u-wizard-step-desc">{s.description}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {aside && <div className="u-wizard-aside">{aside}</div>}
        </aside>

        <section className="u-wizard-panel" aria-labelledby="u-wizard-heading">
          <div className="u-wizard-progress" aria-hidden>
            <span style={{ width: `${pct}%` }} />
          </div>
          <header className="u-wizard-head">
            <p className="u-wizard-count">
              Langkah {step + 1} dari {steps.length}
              {cur.optional && <span> · tidak wajib</span>}
            </p>
            <h2 id="u-wizard-heading" className="u-wizard-title" tabIndex={-1} ref={headRef}>
              {cur.title}
            </h2>
            {cur.description && <p className="u-wizard-desc">{cur.description}</p>}
          </header>
          <div className="u-wizard-body" key={cur.id}>
            {cur.content}
          </div>
          <footer className="u-wizard-foot">
            {error && (
              <p className="u-wizard-error" role="alert">
                <CircleAlert aria-hidden /> {error}
              </p>
            )}
            <div className="u-wizard-actions">
              {step > 0 ? (
                <Button variant="ghost" onClick={() => go(step - 1)} disabled={busy}>
                  <ArrowLeft /> Kembali
                </Button>
              ) : (
                <span />
              )}
              <span className="u-wizard-saved">{savedAt ? `Tersimpan ${formatTime(savedAt)}` : null}</span>
              <Button onClick={() => void lanjut()} loading={busy}>
                {last ? finishLabel : nextLabel}
                {!last && !busy && <ArrowRight />}
              </Button>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}

// ================================================================ Ringkasan
export interface ReviewSection {
  title: React.ReactNode;
  items: Array<{ label: React.ReactNode; value?: React.ReactNode }>;
  /** Tombol "Ubah" untuk kembali ke langkah terkait. */
  onEdit?: () => void;
  /** Tandai bagian yang belum lengkap. */
  missing?: React.ReactNode;
}

/** Ringkasan isian untuk langkah terakhir wizard: per bagian, dengan tombol Ubah dan penanda belum lengkap. */
export function WizardReview({ sections, className }: { sections: ReviewSection[]; className?: string }) {
  return (
    <div className={cn('u-review', className)}>
      {sections.map((s, i) => (
        <section key={i} className="u-review-section" data-missing={dataFlag(!!s.missing)}>
          <header>
            <h3>{s.title}</h3>
            {s.onEdit && (
              <Button variant="ghost" size="sm" onClick={s.onEdit}>
                <Pencil /> Ubah
              </Button>
            )}
          </header>
          {s.missing && (
            <p className="u-review-missing">
              <CircleAlert aria-hidden /> {s.missing}
            </p>
          )}
          <dl>
            {s.items.map((it, j) => (
              <div key={j}>
                <dt>{it.label}</dt>
                <dd data-empty={dataFlag(it.value == null || it.value === '')}>{it.value == null || it.value === '' ? 'Belum diisi' : it.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

/** Grid isian dua kolom yang turun ke satu kolom di layar sempit. `span` pada anak: style={{ gridColumn: '1 / -1' }}. */
export function FormGrid({ children, columns = 2, className }: { children: React.ReactNode; columns?: 1 | 2 | 3; className?: string }) {
  return (
    <div className={cn('u-form-grid', className)} style={{ '--cols': columns } as React.CSSProperties}>
      {children}
    </div>
  );
}
