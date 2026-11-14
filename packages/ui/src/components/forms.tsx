'use client';
import * as React from 'react';
import { Field as BaseField } from '@base-ui/react/field';
import { Fieldset as BaseFieldset } from '@base-ui/react/fieldset';
import { Input as BaseInput } from '@base-ui/react/input';
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { CheckboxGroup as BaseCheckboxGroup } from '@base-ui/react/checkbox-group';
import { Radio as BaseRadio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { NumberField as BaseNumberField } from '@base-ui/react/number-field';
import { OTPField } from '@base-ui/react/otp-field';
import { Slider as BaseSlider } from '@base-ui/react/slider';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { Check, CircleAlert, Minus, Plus } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';

// ---------------------------------------------------------------- Label
export interface LabelProps extends React.ComponentProps<'label'> {
  required?: boolean;
  optional?: boolean;
}
export function Label({ className, required, optional, children, ...props }: LabelProps) {
  return (
    <label className={cn('u-label', className)} {...props}>
      {children}
      {required && <span className="u-label-required" aria-hidden>*</span>}
      {optional && <span className="u-label-optional">(opsional)</span>}
    </label>
  );
}

// ---------------------------------------------------------------- Field
export interface FieldProps extends Omit<React.ComponentProps<typeof BaseField.Root>, 'children'> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  /** Pesan galat. Bila diisi, field ditandai tidak valid. */
  error?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  orientation?: 'vertical' | 'horizontal';
  children: React.ReactNode;
}

/**
 * Pembungkus satu isian: label, kontrol, deskripsi, dan galat saling terhubung (aria) secara otomatis.
 * Kontrol di dalamnya harus komponen UNIPO (Input, Select, Checkbox, ...) atau dibungkus `FieldControl`.
 */
export function Field({ label, description, error, required, optional, orientation, className, children, invalid, ...props }: FieldProps) {
  return (
    <BaseField.Root className={cn('u-field', className)} data-orientation={orientation} invalid={invalid ?? Boolean(error)} {...props}>
      {label && (
        <BaseField.Label className="u-label">
          {label}
          {required && <span className="u-label-required" aria-hidden>*</span>}
          {optional && <span className="u-label-optional">(opsional)</span>}
        </BaseField.Label>
      )}
      {children}
      {description && !error && <BaseField.Description className="u-field-description">{description}</BaseField.Description>}
      {error && (
        <BaseField.Error className="u-field-error" match>
          <CircleAlert aria-hidden />
          {error}
        </BaseField.Error>
      )}
    </BaseField.Root>
  );
}
export const FieldControl = BaseField.Control;
export function FieldDescription({ className, ...props }: React.ComponentProps<typeof BaseField.Description>) {
  return <BaseField.Description className={cn('u-field-description', className)} {...props} />;
}
export function FieldError({ className, children, ...props }: React.ComponentProps<typeof BaseField.Error>) {
  return (
    <BaseField.Error className={cn('u-field-error', className)} {...props}>
      <CircleAlert aria-hidden />
      {children as React.ReactNode}
    </BaseField.Error>
  );
}

export function Fieldset({ legend, className, children, ...props }: { legend?: React.ReactNode } & React.ComponentProps<typeof BaseFieldset.Root>) {
  return (
    <BaseFieldset.Root className={cn('u-fieldset', className)} {...props}>
      {legend && <BaseFieldset.Legend className="u-fieldset-legend">{legend}</BaseFieldset.Legend>}
      {children as React.ReactNode}
    </BaseFieldset.Root>
  );
}

// ---------------------------------------------------------------- Input / Textarea
export type ControlSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<React.ComponentProps<typeof BaseInput>, 'size'> {
  size?: ControlSize;
}
export function Input({ className, size, ...props }: InputProps) {
  return <BaseInput className={cn('u-input', className)} data-size={size} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <BaseField.Control
      render={(p) => <textarea {...(p as React.ComponentProps<'textarea'>)} />}
      className={cn('u-textarea', className)}
      {...(props as React.ComponentProps<typeof BaseField.Control>)}
    />
  );
}

export interface InputGroupProps extends Omit<React.ComponentProps<'div'>, 'prefix'> {
  size?: ControlSize;
  /** Konten di kiri (ikon, teks "Rp", dsb.). */
  start?: React.ReactNode;
  /** Konten di kanan (ikon, tombol, satuan). */
  end?: React.ReactNode;
  /** Beri latar dan garis pemisah pada addon, mis. untuk "https://" atau "SKS". */
  boxed?: boolean;
  invalid?: boolean;
}
/** Input dengan ikon/teks di dalam bingkai yang sama. Taruh <Input /> sebagai anak. */
export function InputGroup({ size, start, end, boxed, invalid, className, children, ...props }: InputGroupProps) {
  return (
    <div className={cn('u-input-group', className)} data-size={size} data-invalid={dataFlag(invalid)} {...props}>
      {start != null && (
        <span className="u-input-addon" data-align="start" data-boxed={dataFlag(boxed)}>
          {start}
        </span>
      )}
      {children}
      {end != null && (
        <span className="u-input-addon" data-align="end" data-boxed={dataFlag(boxed)}>
          {end}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Checkbox / Radio
export function Checkbox({ className, ...props }: React.ComponentProps<typeof BaseCheckbox.Root>) {
  return (
    <BaseCheckbox.Root className={cn('u-checkbox', className)} {...props}>
      <BaseCheckbox.Indicator
        className="u-checkbox-indicator"
        render={(p, state) => <span {...p}>{state.indeterminate ? <Minus /> : <Check />}</span>}
      />
    </BaseCheckbox.Root>
  );
}

export function Radio({ className, ...props }: React.ComponentProps<typeof BaseRadio.Root>) {
  return (
    <BaseRadio.Root className={cn('u-radio', className)} {...props}>
      <BaseRadio.Indicator className="u-radio-indicator" />
    </BaseRadio.Root>
  );
}

export interface ChoiceProps extends Omit<React.ComponentProps<'label'>, 'title'> {
  label: React.ReactNode;
  description?: React.ReactNode;
  control: React.ReactElement;
  disabled?: boolean;
}
/** Satu baris pilihan: kontrol (Checkbox/Radio/Switch) + label + deskripsi. */
export function Choice({ label, description, control, disabled, className, ...props }: ChoiceProps) {
  return (
    <label className={cn('u-choice', className)} data-disabled={dataFlag(disabled)} {...props}>
      {control}
      <span className="u-choice-text">
        <span>{label}</span>
        {description && <span className="u-choice-description">{description}</span>}
      </span>
    </label>
  );
}

export interface ChoiceOption<V extends string = string> {
  value: V;
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface CheckboxGroupProps<V extends string> extends Omit<React.ComponentProps<typeof BaseCheckboxGroup>, 'value' | 'defaultValue' | 'onValueChange'> {
  options: ChoiceOption<V>[];
  value?: V[];
  defaultValue?: V[];
  onValueChange?: (value: V[]) => void;
  orientation?: 'vertical' | 'horizontal';
  /** Tampilan kartu (cocok untuk memilih paket, jalur, minat). */
  variant?: 'list' | 'card';
  columns?: number;
}
export function CheckboxGroup<V extends string>({ options, orientation, variant = 'list', columns = 2, className, onValueChange, ...props }: CheckboxGroupProps<V>) {
  return (
    <BaseCheckboxGroup
      className={cn(variant === 'card' ? 'u-choice-cards' : 'u-choice-group', className)}
      data-orientation={orientation}
      style={variant === 'card' ? ({ '--u-cols': columns } as React.CSSProperties) : undefined}
      onValueChange={(v) => onValueChange?.(v as V[])}
      {...(props as object)}
    >
      {options.map((o) =>
        variant === 'card' ? (
          <ChoiceCard key={o.value} {...o} control={<Checkbox value={o.value} disabled={o.disabled} />} />
        ) : (
          <Choice key={o.value} label={o.label} description={o.description} disabled={o.disabled} control={<Checkbox value={o.value} disabled={o.disabled} />} />
        ),
      )}
    </BaseCheckboxGroup>
  );
}

export interface RadioGroupProps<V extends string> extends Omit<React.ComponentProps<typeof BaseRadioGroup>, 'value' | 'defaultValue' | 'onValueChange'> {
  options: ChoiceOption<V>[];
  value?: V | null;
  defaultValue?: V;
  onValueChange?: (value: V) => void;
  orientation?: 'vertical' | 'horizontal';
  variant?: 'list' | 'card';
  columns?: number;
}
export function RadioGroup<V extends string>({ options, orientation, variant = 'list', columns = 2, className, onValueChange, ...props }: RadioGroupProps<V>) {
  return (
    <BaseRadioGroup
      className={cn(variant === 'card' ? 'u-choice-cards' : 'u-choice-group', className)}
      data-orientation={orientation}
      style={variant === 'card' ? ({ '--u-cols': columns } as React.CSSProperties) : undefined}
      onValueChange={(v) => onValueChange?.(v as V)}
      {...(props as object)}
    >
      {options.map((o) =>
        variant === 'card' ? (
          <ChoiceCard key={o.value} {...o} control={<Radio value={o.value} disabled={o.disabled} />} />
        ) : (
          <Choice key={o.value} label={o.label} description={o.description} disabled={o.disabled} control={<Radio value={o.value} disabled={o.disabled} />} />
        ),
      )}
    </BaseRadioGroup>
  );
}

/** Kartu pilihan (checkbox/radio). Umumnya dipakai lewat CheckboxGroup/RadioGroup variant="card". */
export function ChoiceCard({ label, description, icon, control, disabled }: ChoiceOption & { control: React.ReactElement }) {
  return (
    <label className="u-choice-card" data-disabled={dataFlag(disabled)}>
      {icon && <span className="u-choice-card-icon">{icon}</span>}
      <span className="u-choice-text">
        <span>{label}</span>
        {description && <span className="u-choice-description">{description}</span>}
      </span>
      {control}
    </label>
  );
}

// ---------------------------------------------------------------- Switch
export function Switch({ className, size, ...props }: { size?: 'sm' | 'md' } & React.ComponentProps<typeof BaseSwitch.Root>) {
  return (
    <BaseSwitch.Root className={cn('u-switch', className)} data-size={size} {...props}>
      <BaseSwitch.Thumb className="u-switch-thumb" />
    </BaseSwitch.Root>
  );
}

// ---------------------------------------------------------------- NumberField
export function NumberField({ className, ...props }: React.ComponentProps<typeof BaseNumberField.Root>) {
  return (
    <BaseNumberField.Root {...props}>
      <BaseNumberField.Group className={cn('u-number-field', className)}>
        <BaseNumberField.Decrement className="u-number-field-button" aria-label="Kurangi">
          <Minus />
        </BaseNumberField.Decrement>
        <BaseNumberField.Input />
        <BaseNumberField.Increment className="u-number-field-button" aria-label="Tambah">
          <Plus />
        </BaseNumberField.Increment>
      </BaseNumberField.Group>
    </BaseNumberField.Root>
  );
}

// ---------------------------------------------------------------- OTP
export interface OtpFieldProps extends Omit<React.ComponentProps<typeof OTPField.Root>, 'length'> {
  length?: number;
  /** Sisipkan pemisah setelah indeks ini, mis. 3 untuk 123-456. */
  separatorAfter?: number;
}
/** Isian kode OTP (verifikasi email/WA pendaftar PMB, login alumni). */
export function OtpField({ length = 6, separatorAfter, className, ...props }: OtpFieldProps) {
  return (
    <OTPField.Root length={length} className={cn('u-otp', className)} {...props}>
      {Array.from({ length }, (_, i) => (
        <React.Fragment key={i}>
          <OTPField.Input className="u-otp-input" />
          {separatorAfter === i + 1 && i + 1 < length && <span className="u-otp-separator" aria-hidden />}
        </React.Fragment>
      ))}
    </OTPField.Root>
  );
}

// ---------------------------------------------------------------- Slider
export function Slider({ className, ...props }: React.ComponentProps<typeof BaseSlider.Root>) {
  const value = props.value ?? props.defaultValue;
  const thumbs = Array.isArray(value) ? value.length : 1;
  return (
    <BaseSlider.Root className={cn('u-slider', className)} {...props}>
      <BaseSlider.Control className="u-slider-control">
        <BaseSlider.Track className="u-slider-track">
          <BaseSlider.Indicator className="u-slider-indicator" />
          {Array.from({ length: thumbs }, (_, i) => (
            <BaseSlider.Thumb key={i} index={thumbs > 1 ? i : undefined} className="u-slider-thumb" />
          ))}
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}

// ---------------------------------------------------------------- Toggle / ToggleGroup / SegmentedControl
export function Toggle({ className, variant, size, ...props }: { variant?: 'ghost' | 'outline'; size?: 'sm' | 'md' } & React.ComponentProps<typeof BaseToggle>) {
  return <BaseToggle className={cn('u-toggle', className)} data-variant={variant} data-size={size} {...props} />;
}

export function ToggleGroup({ className, ...props }: React.ComponentProps<typeof BaseToggleGroup>) {
  return <BaseToggleGroup className={cn('u-toggle-group', className)} {...props} />;
}

export interface SegmentedControlProps<V extends string> {
  options: Array<{ value: V; label: React.ReactNode; icon?: React.ReactNode; 'aria-label'?: string }>;
  value?: V;
  defaultValue?: V;
  onValueChange?: (value: V) => void;
  fullWidth?: boolean;
  className?: string;
  'aria-label'?: string;
}
/** Pilihan tunggal berbentuk tombol bersambung, mis. "Hari | Minggu | Bulan" atau "Tabel | Kartu". */
export function SegmentedControl<V extends string>({ options, value, defaultValue, onValueChange, fullWidth, className, ...rest }: SegmentedControlProps<V>) {
  const [inner, setInner] = React.useState<V | undefined>(defaultValue ?? options[0]?.value);
  const current = value ?? inner;
  return (
    <BaseToggleGroup
      className={cn('u-segmented', className)}
      data-full-width={dataFlag(fullWidth)}
      value={current ? [current] : []}
      onValueChange={(v) => {
        const next = v[0] as V | undefined;
        if (!next) return; // selalu ada satu yang terpilih
        setInner(next);
        onValueChange?.(next);
      }}
      aria-label={rest['aria-label']}
    >
      {options.map((o) => (
        <BaseToggle key={o.value} value={o.value} className="u-toggle" aria-label={o['aria-label']}>
          {o.icon}
          {o.label}
        </BaseToggle>
      ))}
    </BaseToggleGroup>
  );
}
