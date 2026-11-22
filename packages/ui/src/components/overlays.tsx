'use client';
import * as React from 'react';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog';
import { Popover as BasePopover } from '@base-ui/react/popover';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { Toast as BaseToast } from '@base-ui/react/toast';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { AkarTingkatTab } from '../lib/tingkat-tab';
import { usePlatform } from '../lib/platform';
import { Button, Kbd, Spinner } from './actions';
import { infoGalatDari, TombolLaporGalat, type InfoGalat } from './galat';

function Arrow() {
  return (
    <svg width="14" height="7" viewBox="0 0 14 7" aria-hidden>
      <path className="u-arrow-stroke" d="M0 7 7 0l7 7h-1.4L7 1.4 1.4 7Z" />
      <path className="u-arrow-fill" d="M1.4 7 7 1.4 12.6 7Z" />
    </svg>
  );
}

// ---------------------------------------------------------------- Dialog
export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Elemen pemicu (biasanya <Button>). */
  trigger?: React.ReactElement;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Tombol di kaki dialog. */
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children?: React.ReactNode;
  className?: string;
  /** Tampilkan sebagai panel geser dari sisi layar. */
  side?: 'right' | 'left' | 'bottom';
  /** Elemen yang difokus saat dialog terbuka (bawaan: elemen pertama yang bisa difokus). false = popup itu sendiri. */
  initialFocus?: boolean | React.RefObject<HTMLElement | null> | (() => HTMLElement | null | boolean | void);
}

/** Dialog modal. Dengan `side`, menjadi Sheet (panel samping/bawah) untuk filter, detail, atau formulir panjang. */
export function Dialog({ open, defaultOpen, onOpenChange, trigger, title, description, footer, size = 'md', side: sideProp, children, className, initialFocus }: DialogProps) {
  // Di platform mobile dialog dan panel kanan menjadi lembar bawah (bottom sheet), kecuali ukuran penuh.
  const plat = usePlatform();
  const side = plat.mobile && size !== 'full' && sideProp !== 'left' ? 'bottom' : sideProp;
  const popup = (
    <BaseDialog.Popup className={cn(side ? 'u-sheet' : 'u-dialog', className)} data-size={size} data-side={side} initialFocus={initialFocus}>
      {side === 'bottom' && <span className="u-sheet-grabber" aria-hidden />}
      <div className="u-dialog-header">
        <BaseDialog.Title className="u-dialog-title">{title}</BaseDialog.Title>
        {description && <BaseDialog.Description className="u-dialog-description">{description}</BaseDialog.Description>}
      </div>
      {children && (
        <div className="u-dialog-body">
          <AkarTingkatTab panel={Boolean(side)}>{children}</AkarTingkatTab>
        </div>
      )}
      {footer && <div className="u-dialog-footer">{footer}</div>}
      <BaseDialog.Close className="u-dialog-close" aria-label="Tutup">
        <X />
      </BaseDialog.Close>
    </BaseDialog.Popup>
  );
  return (
    <BaseDialog.Root open={open} defaultOpen={defaultOpen} onOpenChange={(o) => onOpenChange?.(o)}>
      {trigger && <BaseDialog.Trigger render={trigger} />}
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="u-backdrop" />
        {side ? popup : <BaseDialog.Viewport className="u-dialog-viewport">{popup}</BaseDialog.Viewport>}
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
export const DialogClose = BaseDialog.Close;

export function Sheet(props: Omit<DialogProps, 'side'> & { side?: 'right' | 'left' | 'bottom' }) {
  return <Dialog side="right" {...props} />;
}

// ---------------------------------------------------------------- Confirm (AlertDialog)
export interface ConfirmDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactElement;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Label tombol aksi; tulis kata kerja, mis. "Hapus mahasiswa". */
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary' | 'warning';
  icon?: React.ReactNode;
  /** Boleh async; dialog menunggu dan menampilkan spinner. */
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
}

/** Konfirmasi tindakan yang tidak bisa dibatalkan. */
export function ConfirmDialog({ open, onOpenChange, trigger, title, description, confirmLabel, cancelLabel = 'Batal', tone = 'danger', icon, onConfirm, children }: ConfirmDialogProps) {
  const [inner, setInner] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const isOpen = open ?? inner;
  const setOpen = (o: boolean) => {
    setInner(o);
    onOpenChange?.(o);
  };
  return (
    <BaseAlertDialog.Root open={isOpen} onOpenChange={(o) => !busy && setOpen(o)}>
      {trigger && <BaseAlertDialog.Trigger render={trigger} />}
      <BaseAlertDialog.Portal>
        <BaseAlertDialog.Backdrop className="u-backdrop" />
        <BaseAlertDialog.Viewport className="u-dialog-viewport">
          <BaseAlertDialog.Popup className="u-dialog" data-size="sm">
            <div className="u-dialog-header" style={{ paddingInlineEnd: '1.25rem' }}>
              <span className="u-alert-dialog-icon" data-tone={tone}>
                {icon ?? (tone === 'primary' ? <Info /> : <TriangleAlert />)}
              </span>
              <BaseAlertDialog.Title className="u-dialog-title">{title}</BaseAlertDialog.Title>
              {description && <BaseAlertDialog.Description className="u-dialog-description">{description}</BaseAlertDialog.Description>}
            </div>
            {children && (
              <div className="u-dialog-body">
                <AkarTingkatTab>{children}</AkarTingkatTab>
              </div>
            )}
            <div className="u-dialog-footer" style={children ? undefined : { marginTop: '1.25rem' }}>
              <BaseAlertDialog.Close render={<Button variant="outline" disabled={busy} />}>{cancelLabel}</BaseAlertDialog.Close>
              <Button
                variant={tone === 'danger' ? 'destructive' : 'primary'}
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onConfirm();
                    setOpen(false);
                  } catch {
                    // Galat dari onConfirm menahan dialog tetap terbuka; pemanggil yang menampilkan pesannya.
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {confirmLabel}
              </Button>
            </div>
          </BaseAlertDialog.Popup>
        </BaseAlertDialog.Viewport>
      </BaseAlertDialog.Portal>
    </BaseAlertDialog.Root>
  );
}

// ---------------------------------------------------------------- Popover
export interface PopoverProps {
  trigger: React.ReactElement;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  width?: number | string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  /** Buka saat kursor di atas pemicu (kartu pratinjau). */
  openOnHover?: boolean;
}
export function Popover({ trigger, title, description, children, side = 'bottom', align = 'center', width, open, onOpenChange, className, openOnHover }: PopoverProps) {
  return (
    <BasePopover.Root open={open} onOpenChange={(o) => onOpenChange?.(o)}>
      <BasePopover.Trigger render={trigger} openOnHover={openOnHover} />
      <BasePopover.Portal>
        <BasePopover.Positioner className="u-popup-positioner" side={side} align={align} sideOffset={8}>
          <BasePopover.Popup className={cn('u-popover', className)} style={width ? ({ '--u-popover-w': typeof width === 'number' ? `${width}px` : width } as React.CSSProperties) : undefined}>
            <BasePopover.Arrow className="u-popup-arrow">
              <Arrow />
            </BasePopover.Arrow>
            {title && <BasePopover.Title className="u-popover-title">{title}</BasePopover.Title>}
            {description && <BasePopover.Description className="u-popover-description">{description}</BasePopover.Description>}
            <AkarTingkatTab>{children}</AkarTingkatTab>
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}

// ---------------------------------------------------------------- Tooltip
export const TooltipProvider = BaseTooltip.Provider;
export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  shortcut?: string;
  delay?: number;
}
/** Keterangan singkat saat kursor/fokus. Wajib untuk tombol ikon. */
export function Tooltip({ content, children, side = 'top', shortcut, delay = 300 }: TooltipProps) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} delay={delay} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner className="u-popup-positioner" side={side} sideOffset={8}>
          <BaseTooltip.Popup className="u-tooltip">
            <BaseTooltip.Arrow className="u-popup-arrow">
              <Arrow />
            </BaseTooltip.Arrow>
            {content}
            {shortcut && <Kbd>{shortcut}</Kbd>}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}

// ---------------------------------------------------------------- Menu
export type MenuEntry =
  | { type?: 'item'; label: React.ReactNode; icon?: React.ReactNode; shortcut?: string; onSelect?: () => void; href?: string; disabled?: boolean; destructive?: boolean }
  | { type: 'separator' }
  | { type: 'label'; label: React.ReactNode };

export interface MenuProps {
  trigger: React.ReactElement;
  items: MenuEntry[];
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Buka saat kursor di atas pemicu (mis. sub menu sidebar mini). */
  openOnHover?: boolean;
}
/** Menu tarik-turun untuk aksi baris tabel, profil pengguna, dsb. */
export function Menu({ trigger, items, align = 'end', side = 'bottom', openOnHover }: MenuProps) {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger render={trigger} openOnHover={openOnHover} delay={openOnHover ? 80 : undefined} />
      <BaseMenu.Portal>
        <BaseMenu.Positioner className="u-popup-positioner" align={align} side={side} sideOffset={6}>
          <BaseMenu.Popup className="u-menu">
            {items.map((it, i) => {
              if (it.type === 'separator') return <BaseMenu.Separator key={i} className="u-menu-separator" />;
              if (it.type === 'label') return <div key={i} className="u-menu-label">{it.label}</div>;
              const inner = (
                <>
                  {it.icon}
                  <span>{it.label}</span>
                  {it.shortcut && <span className="u-menu-shortcut">{it.shortcut}</span>}
                </>
              );
              return it.href ? (
                <BaseMenu.LinkItem key={i} href={it.href} className="u-menu-item">
                  {inner}
                </BaseMenu.LinkItem>
              ) : (
                <BaseMenu.Item key={i} className="u-menu-item" onClick={it.onSelect} disabled={it.disabled} data-variant={it.destructive ? 'destructive' : undefined}>
                  {inner}
                </BaseMenu.Item>
              );
            })}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}

// ---------------------------------------------------------------- Toast
const ICONS: Record<string, React.ReactNode> = {
  success: <CircleCheck />,
  error: <CircleAlert />,
  warning: <TriangleAlert />,
  info: <Info />,
};

/**
 * Kode laporan pada toast galat: `data.galat` (objek galat API), `data.requestId`, atau teks "Kode laporan: abc123" /
 * "(request_id: abc123)" di deskripsi atau judul (pesanGalat menyertakannya untuk galat 5xx). Dipakai untuk tombol "Buat tiket" di toast.
 */
function galatToast(t: { type?: string; title?: React.ReactNode; description?: React.ReactNode; data?: unknown }): InfoGalat | null {
  const d = (t.data ?? {}) as { galat?: unknown; requestId?: unknown };
  const dariData = infoGalatDari(d.galat, typeof d.requestId === 'string' ? d.requestId : null);
  if (dariData) return dariData;
  if (t.type !== 'error') return null;
  // Teks galat dari pesanGalat(): "... Kode laporan: abc123." atau "... (request_id: abc123)".
  const pola = /\(?\s*(?:Kode laporan|request_id):?\s*([A-Za-z0-9._:-]{6,64}?)\.?\)?(?=[\s.)]|$)/;
  for (const teks of [t.description, t.title]) {
    if (typeof teks !== 'string') continue;
    const m = pola.exec(teks);
    if (m) return { requestId: m[1], pesan: teks.replace(pola, '').trim() || null };
  }
  return null;
}

function ToastList() {
  const { toasts } = BaseToast.useToastManager();
  return toasts.map((t) => {
    const galat = galatToast(t);
    return (
    <BaseToast.Root key={t.id} toast={t} className="u-toast">
      {t.type && (
        <span className="u-toast-icon" data-type={t.type}>
          {t.type === 'loading' ? <Spinner size="sm" /> : ICONS[t.type]}
        </span>
      )}
      <BaseToast.Content className="u-toast-content">
        <BaseToast.Title className="u-toast-title" />
        <BaseToast.Description className="u-toast-description" />
        {galat && <TombolLaporGalat info={galat} className="u-toast-lapor" />}
      </BaseToast.Content>
      {/* toast.add({ ..., actionProps: { children: 'Urungkan', onClick } }) */}
      {t.actionProps && <BaseToast.Action className="u-toast-aksi" />}
      <BaseToast.Close className="u-toast-close" aria-label="Tutup">
        <X />
      </BaseToast.Close>
    </BaseToast.Root>
    );
  });
}

/** Pasang sekali di akar aplikasi (sudah termasuk di <UnipoProvider>). */
export function Toaster({ children, limit = 3, timeout = 5000 }: { children?: React.ReactNode; limit?: number; timeout?: number }) {
  return (
    <BaseToast.Provider limit={limit} timeout={timeout}>
      {children}
      <BaseToast.Portal>
        <BaseToast.Viewport className="u-toast-viewport">
          <ToastList />
        </BaseToast.Viewport>
      </BaseToast.Portal>
    </BaseToast.Provider>
  );
}

/**
 * const toast = useToast();
 * toast.add({ title: 'Data tersimpan', type: 'success' });
 * toast.add({ title: 'Gagal menyimpan', description: pesanGalat(e), type: 'error', data: { galat: e } }); // + tombol Buat tiket
 * toast.promise(simpan(), { loading: 'Menyimpan…', success: 'Tersimpan', error: 'Gagal menyimpan' });
 * toast.add({ title: 'Dipindahkan ke Sampah', actionProps: { children: 'Urungkan', onClick: urungkan } }); // tombol aksi
 */
export const useToast = BaseToast.useToastManager;
