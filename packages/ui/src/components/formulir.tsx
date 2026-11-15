'use client';
import * as React from 'react';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { Check, CircleDot } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { Button, Tag } from './actions';
import { DatePicker } from './calendar';
import { Alert } from './display';
import { Input, type ControlSize } from './forms';
import { KodeLaporan } from './galat';
import { ConfirmDialog, Dialog, Sheet } from './overlays';
import { Combobox, OptionContent, Select, type SelectOption } from './select';

/**
 * Bahan formulir tambah/ubah per fitur: pilihan yang memilih bentuknya sendiri (tombol, daftar, atau cari),
 * tanggal berbentuk teks API (YYYY-MM-DD), bagian berkelompok dengan grid responsif, dan panel formulir dengan
 * penanda perubahan, konfirmasi buang perubahan, Ctrl+Enter untuk simpan, serta kotak galat + kode laporan.
 */

// ================================================================ Pilihan
export type TampilanPilihan = 'otomatis' | 'tombol' | 'daftar' | 'cari';

export interface PilihanProps {
  options: SelectOption<string>[];
  value?: string | null;
  onValueChange?: (value: string | null) => void;
  /**
   * otomatis (bawaan): ≤ 4 pilihan pendek jadi tombol, > 8 pilihan jadi isian cari, sisanya daftar.
   * tombol: deret tombol (bisa dibatalkan dengan klik ulang bila tidak wajib). cari: ketik untuk menyaring.
   */
  tampilan?: TampilanPilihan;
  /** Wajib: tombol yang terpilih tidak bisa dibatalkan. */
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  size?: ControlSize;
  id?: string;
  name?: string;
  className?: string;
  'aria-label'?: string;
}

const teksLabel = (o: SelectOption<string>) => (typeof o.label === 'string' || typeof o.label === 'number' ? String(o.label) : o.value);

/** Bentuk pilihan yang dipakai `Pilihan` untuk daftar opsi ini. */
export function tampilanPilihan(options: SelectOption<string>[], tampilan: TampilanPilihan = 'otomatis'): Exclude<TampilanPilihan, 'otomatis'> {
  if (tampilan !== 'otomatis') return tampilan;
  if (options.length > 8) return 'cari';
  if (options.length <= 4 && options.every((o) => !o.description && teksLabel(o).length <= 18)) return 'tombol';
  return 'daftar';
}

/**
 * Satu pilihan dari daftar yang sudah diketahui. Bentuknya mengikuti jumlah opsi: tombol untuk 2–4 opsi pendek,
 * daftar tarik-turun untuk 5–8, dan isian cari untuk lebih dari 8 (provinsi, kelompok MK, bentuk pembelajaran).
 */
export function Pilihan({ options, value, onValueChange, tampilan, required, placeholder, disabled, size, id, name, className, ...rest }: PilihanProps) {
  const t = tampilanPilihan(options, tampilan);
  if (t === 'tombol') {
    return (
      <BaseToggleGroup
        id={id}
        className={cn('u-pilihan-tombol', className)}
        data-size={size}
        value={value ? [value] : []}
        disabled={disabled}
        aria-label={rest['aria-label']}
        onValueChange={(v) => {
          const next = (v[0] as string | undefined) ?? null;
          if (next === null && required) return;
          onValueChange?.(next);
        }}
      >
        {options.map((o) => (
          <BaseToggle key={o.value} value={o.value} disabled={o.disabled} className="u-pilihan-tombol-item">
            {o.icon ?? (
              <span className="u-pilihan-tombol-tanda" aria-hidden>
                <Check />
              </span>
            )}
            {o.label}
          </BaseToggle>
        ))}
        {name && <input type="hidden" name={name} value={value ?? ''} />}
      </BaseToggleGroup>
    );
  }
  if (t === 'cari') {
    const terpilih = options.find((o) => o.value === value) ?? null;
    return (
      <Combobox<SelectOption<string>>
        id={id}
        name={name}
        size={size}
        disabled={disabled}
        className={className}
        aria-label={rest['aria-label']}
        items={options.filter((o) => !o.disabled)}
        value={terpilih}
        onValueChange={(o) => onValueChange?.(o?.value ?? null)}
        itemKey={(o) => o.value}
        itemToString={teksLabel}
        renderItem={(o) => <OptionContent media={o.icon} title={o.label} meta={o.description ?? o.group} />}
        placeholder={placeholder ?? 'Ketik untuk mencari…'}
        icon={<CircleDot />}
      />
    );
  }
  return (
    <Select<string>
      id={id}
      name={name}
      size={size}
      disabled={disabled}
      className={className}
      aria-label={rest['aria-label']}
      options={options}
      value={value ?? null}
      onValueChange={(v) => onValueChange?.(v)}
      placeholder={placeholder}
    />
  );
}

export interface PilihanBanyakProps {
  options: SelectOption<string>[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  /** Batas jumlah pilihan; isian tambah disembunyikan setelah penuh. */
  maks?: number;
  disabled?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * Pilih beberapa nilai dari daftar (mis. cakupan prodi atau fakultas): yang terpilih tampil sebagai tag dengan tombol
 * hapus, sisanya dipilih lewat daftar atau isian cari (lebih dari 8 opsi). Kosong berarti "semua" di banyak API.
 */
export function PilihanBanyak({ options, value, onValueChange, placeholder, maks, disabled, id, className, ...rest }: PilihanBanyakProps) {
  const [putaran, setPutaran] = React.useState(0);
  const sisa = options.filter((o) => !value.includes(o.value));
  const label = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  return (
    <div className={cn('u-pilihan-banyak', className)}>
      {value.length > 0 && (
        <div className="u-pilihan-banyak-tag">
          {value.map((v) => (
            <Tag key={v} size="sm" removeLabel={`Hapus ${teksLabel({ value: v, label: label(v) })}`} onRemove={disabled ? undefined : () => onValueChange(value.filter((x) => x !== v))}>
              {label(v)}
            </Tag>
          ))}
        </div>
      )}
      {(!maks || value.length < maks) && sisa.length > 0 && (
        <Pilihan
          key={putaran}
          id={id}
          tampilan={sisa.length > 8 ? 'cari' : 'daftar'}
          options={sisa}
          value={null}
          disabled={disabled}
          aria-label={rest['aria-label']}
          placeholder={placeholder ?? (value.length ? 'Tambah lagi…' : 'Pilih…')}
          onValueChange={(v) => {
            if (!v) return;
            onValueChange([...value, v]);
            setPutaran((x) => x + 1);
          }}
        />
      )}
    </div>
  );
}

/** Ubah peta `{kode: label}` dari API (mis. jenis_tinggal, JENIS_MK) menjadi opsi Pilihan. */
export function opsiDariPeta(peta: Record<string, React.ReactNode> | undefined | null): SelectOption<string>[] {
  return Object.entries(peta ?? {}).map(([value, label]) => ({ value, label }));
}

// ================================================================ Tanggal teks
const keTanggal = (s: unknown) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};
const dariTanggal = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '');

export interface IsianTanggalProps {
  /** Tanggal format API, `YYYY-MM-DD` (bagian jam diabaikan). */
  value?: string | null;
  onValueChange?: (value: string) => void;
  /** Batas bawah/atas, juga `YYYY-MM-DD`. */
  min?: string | null;
  max?: string | null;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** Pemilih tanggal yang menerima dan mengembalikan teks `YYYY-MM-DD` seperti body API. */
export function IsianTanggal({ value, onValueChange, min, max, ...p }: IsianTanggalProps) {
  return <DatePicker {...p} value={keTanggal(value)} min={keTanggal(min) ?? undefined} max={keTanggal(max) ?? undefined} onValueChange={(d) => onValueChange?.(dariTanggal(d))} />;
}

// ================================================================ Bagian dan grid
export interface BagianFormProps {
  judul?: React.ReactNode;
  keterangan?: React.ReactNode;
  ikon?: React.ReactNode;
  /** Tombol kecil di kanan judul. */
  aksi?: React.ReactNode;
  /** Kolom grid di layar lebar. Bawaan 2; di layar sempit selalu 1. */
  kolom?: 1 | 2 | 3;
  children: React.ReactNode;
  className?: string;
}

/**
 * Satu bagian formulir: judul + keterangan di kiri (layar lebar) atau atas (ponsel), isian dalam grid responsif.
 * Isian yang perlu selebar bagian diberi `className="u-form-lebar"` (Field menerimanya).
 */
export function BagianForm({ judul, keterangan, ikon, aksi, kolom = 2, children, className }: BagianFormProps) {
  return (
    <section className={cn('u-bagian-form', className)}>
      {(judul || keterangan) && (
        <header className="u-bagian-form-kepala">
          {ikon && (
            <span className="u-bagian-form-ikon" aria-hidden>
              {ikon}
            </span>
          )}
          <div>
            {judul && <h3>{judul}</h3>}
            {keterangan && <p>{keterangan}</p>}
          </div>
          {aksi && <div className="u-bagian-form-aksi">{aksi}</div>}
        </header>
      )}
      <GridForm kolom={kolom}>{children}</GridForm>
    </section>
  );
}

/** Grid isian yang menyesuaikan lebar wadahnya (bukan layar): 1 kolom di panel sempit, 2–3 di panel lebar. */
export function GridForm({ kolom = 2, children, className }: { kolom?: 1 | 2 | 3; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('u-form-wadah', className)}>
      <div className="u-form-kisi" data-kolom={kolom}>
        {children}
      </div>
    </div>
  );
}

// ================================================================ Panel formulir
export interface PanelFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactElement;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /**
   * Simpan. Kembalikan `false` atau teks untuk menahan panel tetap terbuka (teks tampil sebagai galat);
   * lempar galat untuk kotak galat + kode laporan. Selain itu panel tertutup.
   */
  onSimpan: () => void | false | string | null | Promise<void | false | string | null>;
  /** Ada perubahan yang belum disimpan: tampilkan penanda dan minta konfirmasi sebelum menutup. */
  berubah?: boolean;
  labelSimpan?: React.ReactNode;
  labelBatal?: React.ReactNode;
  /** Panel samping (bawaan, cocok untuk formulir panjang) atau dialog tengah. Di ponsel keduanya jadi lembar bawah. */
  tampilan?: 'sheet' | 'dialog';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Galat dari luar (mis. 422 yang tidak terpetakan ke isian). */
  galat?: unknown;
  /** Tombol tambahan di kiri kaki panel (mis. "Simpan sebagai draf"). */
  aksiTambahan?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * Cangkang formulir tambah/ubah: isi di dalam `<form>` (Enter dan Ctrl/⌘+Enter menyimpan), kaki panel menempel
 * dengan penanda "belum disimpan", dan konfirmasi sebelum perubahan dibuang.
 */
export function PanelForm({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  onSimpan,
  berubah,
  labelSimpan = 'Simpan',
  labelBatal = 'Batal',
  tampilan = 'sheet',
  size = 'lg',
  galat: galatLuar,
  aksiTambahan,
  disabled,
  className,
}: PanelFormProps) {
  const [inner, setInner] = React.useState(false);
  const [sibuk, setSibuk] = React.useState(false);
  const [galat, setGalat] = React.useState<unknown>(null);
  const [tanya, setTanya] = React.useState(false);
  const formId = React.useId();
  const isOpen = open ?? inner;
  const tutup = () => {
    setInner(false);
    onOpenChange?.(false);
    setGalat(null);
  };
  const setOpen = (o: boolean) => {
    if (o) {
      setInner(true);
      onOpenChange?.(true);
      return;
    }
    if (sibuk) return;
    if (berubah) return setTanya(true);
    tutup();
  };
  const simpan = async () => {
    if (sibuk || disabled) return;
    setSibuk(true);
    setGalat(null);
    try {
      const r = await onSimpan();
      if (r === false) return;
      if (typeof r === 'string' && r) return setGalat(new Error(r));
      tutup();
    } catch (e) {
      setGalat(e);
    } finally {
      setSibuk(false);
    }
  };
  const W = tampilan === 'sheet' ? Sheet : Dialog;
  const g = galat ?? galatLuar;
  return (
    <>
      <W
        open={isOpen}
        onOpenChange={setOpen}
        trigger={trigger}
        size={size}
        title={title}
        description={description}
        className={cn('u-panel-form', className)}
        footer={
          <>
            <span className="u-panel-form-status" data-berubah={dataFlag(berubah)} aria-live="polite">
              {berubah ? 'Perubahan belum disimpan' : null}
            </span>
            {aksiTambahan}
            <Button variant="ghost" type="button" disabled={sibuk} onClick={() => setOpen(false)}>
              {labelBatal}
            </Button>
            <Button type="submit" form={formId} loading={sibuk} disabled={disabled}>
              {labelSimpan}
            </Button>
          </>
        }
      >
        <form
          id={formId}
          className="u-panel-form-isi"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void simpan();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void simpan();
            }
          }}
        >
          {g != null ? (
            <Alert variant="danger" title="Belum tersimpan">
              {(g as Error)?.message || 'Terjadi kesalahan.'}
              <KodeLaporan error={g} />
            </Alert>
          ) : null}
          {children}
        </form>
      </W>
      <ConfirmDialog
        open={tanya}
        onOpenChange={setTanya}
        title="Buang perubahan?"
        description="Isian yang sudah Anda ubah belum disimpan dan akan hilang."
        confirmLabel="Buang perubahan"
        cancelLabel="Lanjut mengisi"
        tone="warning"
        onConfirm={() => {
          setTanya(false);
          tutup();
        }}
      />
    </>
  );
}

// ================================================================ Daftar (tag)
const labelKode = (s: string) => (/^[a-z0-9]+(_[a-z0-9]+)*$/.test(s) && s.length > 1 ? (s.charAt(0).toUpperCase() + s.slice(1)).replace(/_/g, ' ') : s);

/** Daftar nilai pendek (tag): Enter atau koma menambah; dengan `enumNilai` menjadi tag pilihan ganda. */
export function IsianDaftar({
  value,
  onValueChange,
  id,
  disabled,
  angka,
  enumNilai,
  labelOpsi,
}: {
  value: string[];
  onValueChange: (v: string[]) => void;
  id?: string;
  disabled?: boolean;
  angka?: boolean;
  /** Pilihan tetap: tampil sebagai tag yang bisa dinyalakan/dimatikan. */
  enumNilai?: string[];
  labelOpsi?: (v: string) => React.ReactNode;
}) {
  const [draf, setDraf] = React.useState('');
  const tambah = (t: string) => {
    const x = t.trim().replace(/,$/, '');
    if (!x || value.includes(x) || (angka && Number.isNaN(Number(x))) || (enumNilai && !enumNilai.includes(x))) return;
    onValueChange([...value, x]);
    setDraf('');
  };
  if (enumNilai) {
    return (
      <div className="u-isian-daftar" id={id}>
        {enumNilai.map((x) => (
          <Tag key={x} active={value.includes(x)} render={<button type="button" disabled={disabled} />} onClick={() => onValueChange(value.includes(x) ? value.filter((y) => y !== x) : [...value, x])}>
            {labelOpsi ? labelOpsi(x) : labelKode(x)}
          </Tag>
        ))}
      </div>
    );
  }
  return (
    <div className="u-isian-daftar">
      {value.map((x) => (
        <Tag key={x} onRemove={disabled ? undefined : () => onValueChange(value.filter((y) => y !== x))}>
          {x}
        </Tag>
      ))}
      <Input
        id={id}
        value={draf}
        disabled={disabled}
        inputMode={angka ? 'numeric' : undefined}
        placeholder={value.length ? 'Tambah…' : 'Ketik lalu Enter'}
        onChange={(e) => (e.target.value.endsWith(',') ? tambah(e.target.value) : setDraf(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            tambah(draf);
          } else if (e.key === 'Backspace' && !draf && value.length) onValueChange(value.slice(0, -1));
        }}
        onBlur={() => tambah(draf)}
      />
    </div>
  );
}

/** Hitung karakter untuk isian panjang: "120/2000". */
export function HitungKarakter({ nilai, maks }: { nilai?: string | null; maks: number }) {
  const n = (nilai ?? '').length;
  return (
    <span className="u-hitung-karakter" data-lebih={dataFlag(n > maks)} data-hampir={dataFlag(n > maks * 0.9 && n <= maks)}>
      {n}/{maks}
    </span>
  );
}
