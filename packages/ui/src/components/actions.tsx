'use client';
import * as React from 'react';
import { useRender } from '@base-ui/react/use-render';
import { mergeProps } from '@base-ui/react/merge-props';
import { Separator as BaseSeparator } from '@base-ui/react/separator';
import { X } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';

// ---------------------------------------------------------------- Button
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'soft' | 'ghost' | 'destructive' | 'destructive-soft' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends useRender.ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Tombol berisi ikon saja (persegi). Wajib beri `aria-label`. */
  iconOnly?: boolean;
  fullWidth?: boolean;
  /** Menampilkan spinner dan menonaktifkan klik, lebar tombol tetap. */
  loading?: boolean;
}

/**
 * Tombol. Untuk tautan, pakai `render={<a href="..." />}` agar gaya tetap sama tanpa role="button".
 */
export function Button({ variant = 'primary', size = 'md', iconOnly, fullWidth, loading, className, render, children, disabled, ...props }: ButtonProps) {
  const defaultProps = {
    className: cn('u-button', className),
    'data-variant': variant,
    'data-size': size,
    'data-icon-only': dataFlag(iconOnly),
    'data-full-width': dataFlag(fullWidth),
    'data-loading': dataFlag(loading),
    'aria-busy': loading || undefined,
    disabled: disabled || loading,
    type: render ? undefined : ('button' as const),
    children: (
      <>
        {children}
        {loading && <Spinner size={size === 'lg' || size === 'xl' ? 'md' : 'sm'} />}
      </>
    ),
  };
  return useRender({ render, defaultTagName: 'button', props: mergeProps<'button'>(defaultProps, props) });
}

export function ButtonGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div role="group" className={cn('u-button-group', className)} {...props} />;
}

// ---------------------------------------------------------------- Badge
export type BadgeVariant = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'solid' | 'outline';

export interface BadgeProps extends React.ComponentProps<'span'> {
  variant?: BadgeVariant;
  size?: 'md' | 'lg';
  shape?: 'pill' | 'square';
  /** Titik status di depan teks. */
  dot?: boolean;
}

export function Badge({ variant = 'neutral', size, shape, dot, className, children, ...props }: BadgeProps) {
  return (
    <span className={cn('u-badge', className)} data-variant={variant} data-size={size} data-shape={shape} {...props}>
      {dot && <span className="u-badge-dot" aria-hidden />}
      {children}
    </span>
  );
}

// ---------------------------------------------------------------- Tag
export interface TagProps extends useRender.ComponentProps<'span'> {
  active?: boolean;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  /** Bila diisi, tombol hapus (x) ditampilkan. */
  onRemove?: () => void;
  removeLabel?: string;
}

/** Tag/label kategori, mis. kategori berita atau kata kunci. Bisa dijadikan tautan dengan `render={<a href />}`. */
export function Tag({ active, size, icon, onRemove, removeLabel = 'Hapus', className, render, children, ...props }: TagProps) {
  return useRender({
    render,
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn('u-tag', className),
        'data-active': dataFlag(active),
        'data-size': size,
        children: (
          <>
            {icon}
            {children}
            {onRemove && (
              <button
                type="button"
                className="u-tag-remove"
                aria-label={removeLabel}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove();
                }}
              >
                <X size={12} />
              </button>
            )}
          </>
        ),
      } as React.ComponentProps<'span'>,
      props,
    ),
  });
}

// ---------------------------------------------------------------- Kbd
export function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return <kbd className={cn('u-kbd', className)} {...props} />;
}

// ---------------------------------------------------------------- Spinner
export function Spinner({ size = 'md', className, label = 'Memuat', ...props }: { size?: 'sm' | 'md' | 'lg'; label?: string } & React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" role="status" aria-label={label} className={cn('u-spinner', className)} data-size={size} {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------- Skeleton
export function Skeleton({ shape, className, style, width, height, ...props }: { shape?: 'rect' | 'circle' | 'text'; width?: number | string; height?: number | string } & React.ComponentProps<'span'>) {
  return <span aria-hidden className={cn('u-skeleton', className)} data-shape={shape} style={{ width, height, ...style }} {...props} />;
}

// ---------------------------------------------------------------- Separator
export function Separator({ className, orientation = 'horizontal', label, ...props }: { orientation?: 'horizontal' | 'vertical'; label?: React.ReactNode } & Omit<React.ComponentProps<typeof BaseSeparator>, 'orientation'>) {
  if (label) {
    return (
      <div role="separator" className={cn('u-separator-label', typeof className === 'string' && className)}>
        {label}
      </div>
    );
  }
  return <BaseSeparator orientation={orientation} className={cn('u-separator', className)} {...props} />;
}

// ---------------------------------------------------------------- VisuallyHidden
export function VisuallyHidden(props: React.ComponentProps<'span'>) {
  return <span className="u-sr-only" {...props} />;
}
