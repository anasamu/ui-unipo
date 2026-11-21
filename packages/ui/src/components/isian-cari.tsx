'use client';
import { Search, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './actions';
import { Input, InputGroup, type ControlSize, type InputProps } from './forms';

export interface IsianCariProps extends Omit<InputProps, 'value' | 'onChange' | 'type' | 'size'> {
  value: string;
  onValueChange: (kata: string) => void;
  size?: ControlSize;
  /** Tombol hapus (x) saat ada kata kunci (bawaan true). */
  bisaDihapus?: boolean;
  /** Kelas pembungkus InputGroup. */
  className?: string;
}

/**
 * Isian kata kunci: ikon cari, tombol hapus, Escape mengosongkan. Pengganti `<input type="search">` buatan sendiri
 * di daftar, panel pemilih, dan bilah alat.
 */
export function IsianCari({ value, onValueChange, size, bisaDihapus = true, className, onKeyDown, 'aria-label': ariaLabel, placeholder = 'Cari…', ...props }: IsianCariProps) {
  return (
    <InputGroup
      size={size}
      className={cn('u-isian-cari', className)}
      start={<Search aria-hidden />}
      end={
        bisaDihapus && value ? (
          <Button variant="ghost" size="xs" iconOnly aria-label="Hapus kata kunci" onClick={() => onValueChange('')}>
            <X />
          </Button>
        ) : undefined
      }
    >
      <Input
        {...props}
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel ?? (typeof placeholder === 'string' ? placeholder : 'Cari')}
        autoComplete="off"
        onChange={(e) => onValueChange((e.target as HTMLInputElement).value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) {
            e.stopPropagation();
            onValueChange('');
          }
          onKeyDown?.(e);
        }}
      />
    </InputGroup>
  );
}
