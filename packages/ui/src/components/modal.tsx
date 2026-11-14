'use client';
import * as React from 'react';
import { Button } from './actions';
import { Field, Input } from './forms';
import { Dialog, DialogClose } from './overlays';
import { Wizard, type WizardProps } from './wizard';

export interface KonfirmasiKetikProps {
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Teks yang harus diketik persis, mis. kode atau nama data. */
  word: string;
  /** Label tombol; tulis kata kerja + objek, mis. "Hapus prodi". */
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
}

/**
 * Konfirmasi untuk tindakan berat yang tidak bisa dibatalkan (hapus massal, musnahkan arsip, reset data):
 * pengguna harus mengetik nama/kode sasaran sebelum tombol aktif.
 */
export function KonfirmasiKetik({ trigger, open, onOpenChange, title, description, word, confirmLabel, onConfirm, children }: KonfirmasiKetikProps) {
  const [inner, setInner] = React.useState(false);
  const [teks, setTeks] = React.useState('');
  const [sibuk, setSibuk] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const isOpen = open ?? inner;
  const setOpen = (o: boolean) => {
    if (sibuk) return;
    setInner(o);
    onOpenChange?.(o);
    if (!o) {
      setTeks('');
      setGalat(null);
    }
  };
  const cocok = teks.trim() === word;
  return (
    <Dialog
      open={isOpen}
      onOpenChange={setOpen}
      trigger={trigger}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <DialogClose render={<Button variant="outline" disabled={sibuk} />}>Batal</DialogClose>
          <Button
            variant="destructive"
            disabled={!cocok}
            loading={sibuk}
            onClick={async () => {
              setSibuk(true);
              setGalat(null);
              try {
                await onConfirm();
                setSibuk(false);
                setOpen(false);
              } catch (e) {
                setGalat((e as Error)?.message || 'Gagal.');
                setSibuk(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      <Field label={<>Ketik <b className="u-mono">{word}</b> untuk melanjutkan</>} error={galat ?? undefined}>
        <Input value={teks} onChange={(e) => setTeks(e.target.value)} autoComplete="off" spellCheck={false} />
      </Field>
    </Dialog>
  );
}

export interface DialogWizardProps extends Omit<WizardProps, 'onFinish'> {
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  /** Judul dialog. */
  dialogTitle: React.ReactNode;
  /** Kembalikan pesan galat untuk menahan dialog tetap terbuka. */
  onFinish: WizardProps['onFinish'];
}

/** Wizard bertahap di dalam dialog besar: cocok untuk pengajuan singkat (3–5 langkah) tanpa pindah halaman. */
export function DialogWizard({ trigger, open, onOpenChange, dialogTitle, onFinish, ...wizard }: DialogWizardProps) {
  const [inner, setInner] = React.useState(false);
  const isOpen = open ?? inner;
  const setOpen = (o: boolean) => {
    setInner(o);
    onOpenChange?.(o);
  };
  return (
    <Dialog open={isOpen} onOpenChange={setOpen} trigger={trigger} title={dialogTitle} size="xl" className="u-dialog-wizard">
      <Wizard
        {...wizard}
        onFinish={async () => {
          const r = await onFinish();
          if (!r) setOpen(false);
          return r;
        }}
      />
    </Dialog>
  );
}
