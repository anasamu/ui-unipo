'use client';
import * as React from 'react';
import { Popover as BasePopover } from '@base-ui/react/popover';
import { Check, ListFilter, PlusCircle, Search, SlidersHorizontal, X } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { formatDate } from '../lib/format';
import { Badge, Button, Separator } from './actions';
import { Calendar } from './calendar';
import { Field, Input, InputGroup } from './forms';
import { Dialog, DialogClose } from './overlays';

// ================================================================ Tipe
export interface FilterOption {
  value: string;
  label: React.ReactNode;
  /** Teks untuk pencarian di dalam daftar (bila label bukan string). */
  text?: string;
  icon?: React.ReactNode;
  /** Jumlah data dengan nilai ini (ditampilkan di kanan). */
  count?: number;
}

export type FilterField =
  | { key: string; label: string; type: 'select'; options: FilterOption[]; icon?: React.ReactNode; searchable?: boolean }
  | { key: string; label: string; type: 'multi'; options: FilterOption[]; icon?: React.ReactNode; searchable?: boolean }
  | { key: string; label: string; type: 'date-range'; icon?: React.ReactNode; /** Nama parameter query [awal, akhir]; bawaan `<key>_dari`, `<key>_sampai`. */ params?: [string, string] }
  | { key: string; label: string; type: 'boolean'; icon?: React.ReactNode }
  | { key: string; label: string; type: 'custom'; icon?: React.ReactNode; render: (value: unknown, set: (v: unknown) => void) => React.ReactNode; format?: (value: unknown) => string };

export type FilterValues = Record<string, unknown>;
export interface DateRangeValue {
  from?: string;
  to?: string;
}

const isEmpty = (v: unknown) => v == null || v === '' || v === false || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && !Array.isArray(v) && !Object.values(v as object).some(Boolean));

function labelOf(f: FilterField, v: unknown): string {
  if (f.type === 'select') return String(f.options.find((o) => o.value === v)?.text ?? f.options.find((o) => o.value === v)?.label ?? v);
  if (f.type === 'multi') {
    const arr = v as string[];
    const first = f.options.find((o) => o.value === arr[0]);
    return arr.length > 1 ? `${arr.length} dipilih` : String(first?.text ?? first?.label ?? arr[0]);
  }
  if (f.type === 'date-range') {
    const r = v as DateRangeValue;
    return [r.from && formatDate(r.from, 'medium'), r.to && formatDate(r.to, 'medium')].filter(Boolean).join(' – ');
  }
  if (f.type === 'boolean') return 'Ya';
  return f.format ? f.format(v) : String(v);
}

// ================================================================ FacetFilter (tombol saringan bergaya pil)
export interface FacetFilterProps {
  field: FilterField;
  value: unknown;
  onChange: (value: unknown) => void;
}

function OptionList({ field, value, onChange, close }: FacetFilterProps & { close?: () => void }) {
  const [q, setQ] = React.useState('');
  if (field.type !== 'select' && field.type !== 'multi') return null;
  const multi = field.type === 'multi';
  const sel = new Set(multi ? ((value as string[]) ?? []) : value ? [value as string] : []);
  const opts = field.options.filter((o) => !q || String(o.text ?? o.label).toLowerCase().includes(q.toLowerCase()));
  const searchable = field.searchable ?? field.options.length > 7;
  return (
    <div className="u-facet-list">
      {searchable && (
        <div className="u-facet-search">
          <Search />
          <input autoFocus placeholder={`Cari ${field.label.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Cari ${field.label}`} />
        </div>
      )}
      <div role="listbox" aria-multiselectable={multi} aria-label={field.label} className="u-facet-options">
        {opts.map((o) => {
          const on = sel.has(o.value);
          return (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={on}
              className="u-facet-option"
              onClick={() => {
                if (multi) {
                  const next = new Set(sel);
                  if (on) next.delete(o.value);
                  else next.add(o.value);
                  onChange([...next]);
                } else {
                  onChange(on ? undefined : o.value);
                  close?.();
                }
              }}
            >
              <span className={multi ? 'u-facet-check' : 'u-facet-radio'} data-checked={dataFlag(on)}>
                {on && <Check />}
              </span>
              {o.icon}
              <span className="u-facet-label">{o.label}</span>
              {o.count != null && <span className="u-facet-count">{o.count.toLocaleString('id-ID')}</span>}
            </button>
          );
        })}
        {!opts.length && <p className="u-listbox-empty">Tidak ada pilihan.</p>}
      </div>
      {sel.size > 0 && (
        <>
          <Separator />
          <button type="button" className="u-facet-clear" onClick={() => onChange(undefined)}>
            Hapus saringan
          </button>
        </>
      )}
    </div>
  );
}

function FieldEditor({ field, value, onChange, close }: FacetFilterProps & { close?: () => void }) {
  if (field.type === 'select' || field.type === 'multi') return <OptionList field={field} value={value} onChange={onChange} close={close} />;
  if (field.type === 'date-range') {
    const r = (value as DateRangeValue) ?? {};
    const toD = (s?: string) => (s ? new Date(s + 'T00:00:00') : null);
    const iso = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : undefined);
    const today = new Date();
    const back = (n: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - n);
    const presets: Array<[string, Date, Date]> = [
      ['Hari ini', today, today],
      ['7 hari terakhir', back(6), today],
      ['30 hari terakhir', back(29), today],
      ['Bulan ini', new Date(today.getFullYear(), today.getMonth(), 1), today],
      ['Bulan lalu', new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 0)],
      ['Tahun ini', new Date(today.getFullYear(), 0, 1), today],
    ];
    return (
      <div className="u-facet-date">
        <div className="u-facet-presets" role="group" aria-label="Rentang cepat">
          {presets.map(([label, from, to]) => {
            const on = r.from === iso(from) && r.to === iso(to);
            return (
              <button key={label} type="button" className="u-facet-preset" data-active={dataFlag(on)} aria-pressed={on} onClick={() => onChange({ from: iso(from), to: iso(to) })}>
                {label}
              </button>
            );
          })}
          {(r.from || r.to) && (
            <button type="button" className="u-facet-clear" onClick={() => onChange(undefined)}>
              Hapus rentang
            </button>
          )}
        </div>
        <Calendar key={r.from ?? 'kosong'} range={{ from: toD(r.from), to: toD(r.to) }} onRangeChange={(n) => onChange({ from: iso(n.from), to: iso(n.to) })} />
      </div>
    );
  }
  if (field.type === 'boolean') return null;
  return <div style={{ padding: '0.75rem' }}>{field.render(value, onChange)}</div>;
}

/** Tombol saringan pil ("+ Status", "Status: Aktif, Cuti") dengan daftar pilihan + jumlah, seperti tabel data modern. */
export function FacetFilter({ field, value, onChange }: FacetFilterProps) {
  const [open, setOpen] = React.useState(false);
  const active = !isEmpty(value);
  if (field.type === 'boolean') {
    return (
      <button type="button" className="u-facet-trigger" data-active={dataFlag(active)} aria-pressed={active} onClick={() => onChange(active ? undefined : true)}>
        {field.icon ?? <PlusCircle />}
        {field.label}
      </button>
    );
  }
  const multiValues = field.type === 'multi' && Array.isArray(value) ? (value as string[]) : [];
  return (
    <BasePopover.Root open={open} onOpenChange={setOpen}>
      <BasePopover.Trigger className="u-facet-trigger" data-active={dataFlag(active)}>
        {field.icon ?? <PlusCircle />}
        {field.label}
        {active && (
          <>
            <span className="u-facet-divider" aria-hidden />
            {field.type === 'multi' && multiValues.length > 2 ? (
              <Badge variant="primary" shape="square">
                {multiValues.length} dipilih
              </Badge>
            ) : field.type === 'multi' ? (
              multiValues.map((v) => (
                <Badge key={v} variant="primary" shape="square">
                  {String(field.options.find((o) => o.value === v)?.text ?? field.options.find((o) => o.value === v)?.label ?? v)}
                </Badge>
              ))
            ) : (
              <Badge variant="primary" shape="square">
                {labelOf(field, value)}
              </Badge>
            )}
          </>
        )}
      </BasePopover.Trigger>
      <BasePopover.Portal>
        <BasePopover.Positioner className="u-popup-positioner" align="start" sideOffset={6}>
          <BasePopover.Popup className="u-popover u-facet-popup" data-kind={field.type}>
            <FieldEditor field={field} value={value} onChange={onChange} close={() => setOpen(false)} />
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}

// ================================================================ FilterBar
export interface FilterBarProps {
  fields: FilterField[];
  value: FilterValues;
  onValueChange: (value: FilterValues) => void;
  /** Kata kunci pencarian (disimpan di value[searchKey]). */
  search?: { placeholder?: string; key?: string } | false;
  /** Jumlah hasil, ditampilkan di kanan ("245 mahasiswa"). */
  resultCount?: number;
  resultLabel?: string;
  /** Konten tambahan di kanan (tombol ekspor, ganti tampilan). */
  actions?: React.ReactNode;
  /** Tampilkan chip saringan aktif di baris bawah (bawaan: true). */
  showChips?: boolean;
  className?: string;
}

/**
 * Bilah saringan responsif: kotak cari + tombol saringan pil di desktop, satu tombol "Saring" yang membuka panel di ponsel,
 * dan chip saringan aktif yang bisa dihapus satu per satu.
 */
export function FilterBar({ fields, value, onValueChange, search = {}, resultCount, resultLabel = 'data', actions, showChips = true, className }: FilterBarProps) {
  const searchKey = (search && search.key) || 'q';
  const set = (k: string, v: unknown) => {
    const next = { ...value };
    if (isEmpty(v)) delete next[k];
    else next[k] = v;
    onValueChange(next);
  };
  const activeFields = fields.filter((f) => !isEmpty(value[f.key]));
  const [q, setQ] = React.useState(String(value[searchKey] ?? ''));
  React.useEffect(() => setQ(String(value[searchKey] ?? '')), [value, searchKey]);
  React.useEffect(() => {
    const t = setTimeout(() => {
      if ((value[searchKey] ?? '') !== q) set(searchKey, q.trim() || undefined);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  const clearAll = () => onValueChange(search ? (value[searchKey] ? { [searchKey]: value[searchKey] } : {}) : {});

  return (
    <div className={cn('u-filter-bar', className)}>
      <div className="u-filter-row">
        {search !== false && (
          <InputGroup start={<Search />} size="sm" className="u-filter-search" end={q ? <button type="button" className="u-select-icon" aria-label="Kosongkan pencarian" onClick={() => setQ('')}><X /></button> : undefined}>
            <Input aria-label={search.placeholder ?? 'Cari'} placeholder={search.placeholder ?? 'Cari…'} value={q} onChange={(e) => setQ(e.target.value)} />
          </InputGroup>
        )}
        <div className="u-filter-facets">
          {fields.map((f) => (
            <FacetFilter key={f.key} field={f} value={value[f.key]} onChange={(v) => set(f.key, v)} />
          ))}
          {activeFields.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Atur ulang <X />
            </Button>
          )}
        </div>
        <Dialog
          side="bottom"
          title="Saring data"
          trigger={
            <Button variant="outline" size="sm" className="u-filter-mobile-trigger">
              <SlidersHorizontal /> Saring
              {activeFields.length > 0 && <span className="u-nav-badge">{activeFields.length}</span>}
            </Button>
          }
          footer={
            <>
              <Button variant="ghost" onClick={clearAll}>
                Atur ulang
              </Button>
              <DialogClose render={<Button />}>Tampilkan {resultCount != null ? `${resultCount.toLocaleString('id-ID')} ${resultLabel}` : 'hasil'}</DialogClose>
            </>
          }
        >
          <div className="u-filter-sheet">
            {fields.map((f) => (
              <Field key={f.key} label={f.label}>
                {f.type === 'boolean' ? (
                  <FacetFilter field={f} value={value[f.key]} onChange={(v) => set(f.key, v)} />
                ) : (
                  <div className="u-filter-sheet-box">
                    <FieldEditor field={f} value={value[f.key]} onChange={(v) => set(f.key, v)} />
                  </div>
                )}
              </Field>
            ))}
          </div>
        </Dialog>
        {(resultCount != null || actions) && (
          <div className="u-filter-end">
            {resultCount != null && (
              <span className="u-filter-count">
                <strong>{resultCount.toLocaleString('id-ID')}</strong> {resultLabel}
              </span>
            )}
            {actions}
          </div>
        )}
      </div>
      {showChips && activeFields.length > 0 && (
        <div className="u-filter-chips" aria-label="Saringan aktif">
          <ListFilter aria-hidden />
          {activeFields.map((f) => (
            <span key={f.key} className="u-tag" data-size="sm">
              <span style={{ color: 'var(--u-muted-foreground)' }}>{f.label}:</span> {labelOf(f, value[f.key])}
              <button type="button" className="u-tag-remove" aria-label={`Hapus saringan ${f.label}`} onClick={() => set(f.key, undefined)}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Simpan nilai saringan di URL (?status=A&prodi=55201) supaya bisa dibagikan dan bertahan saat dimuat ulang. */
export function useFilterParams(initial: FilterValues = {}): [FilterValues, (v: FilterValues) => void] {
  const read = (): FilterValues => {
    if (typeof window === 'undefined') return initial;
    const p = new URLSearchParams(window.location.search);
    const out: FilterValues = { ...initial };
    p.forEach((v, k) => {
      if (k.endsWith('[]')) out[k.slice(0, -2)] = [...((out[k.slice(0, -2)] as string[]) ?? []), v];
      else if (k.includes('.')) {
        const [a, b] = k.split('.');
        out[a] = { ...((out[a] as object) ?? {}), [b]: v };
      } else out[k] = v === 'true' ? true : v;
    });
    return out;
  };
  const [v, setV] = React.useState<FilterValues>(read);
  const update = (next: FilterValues) => {
    setV(next);
    const p = new URLSearchParams();
    for (const [k, val] of Object.entries(next)) {
      if (Array.isArray(val)) val.forEach((x) => p.append(`${k}[]`, String(x)));
      else if (val && typeof val === 'object') Object.entries(val).forEach(([a, b]) => b && p.set(`${k}.${a}`, String(b)));
      else if (val != null) p.set(k, String(val));
    }
    const qs = p.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? '?' + qs : ''}${window.location.hash}`);
  };
  return [v, update];
}

/**
 * Ubah nilai saringan menjadi parameter query SDK/REST:
 * multi → "a,b", rentang tanggal → `<key>_dari` & `<key>_sampai` (atau `params` field), boolean → 1. Nilai kosong dibuang.
 *   siakad.arsip.getSuratMasuk({ ...filterToQuery(values, fields), page })
 */
export function filterToQuery(values: FilterValues, fields?: FilterField[]): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(values)) {
    if (isEmpty(v)) continue;
    if (Array.isArray(v)) out[k] = v.join(',');
    else if (v === true) out[k] = 1;
    else if (typeof v === 'object') {
      const r = v as DateRangeValue;
      const f = fields?.find((x) => x.key === k);
      const [a, b] = f?.type === 'date-range' && f.params ? f.params : [`${k}_dari`, `${k}_sampai`];
      if (r.from) out[a] = r.from;
      if (r.to) out[b] = r.to;
    } else out[k] = v as string | number;
  }
  return out;
}
