'use client';
import * as React from 'react';
import { Upload } from 'lucide-react';
import { Tag } from '../components/actions';
import { DatePicker } from '../components/calendar';
import { Field, Input, Switch, Textarea } from '../components/forms';
import { Select } from '../components/select';
import { cn } from '../lib/cn';
import { PilihEntitas, SUMBER_ENTITAS, type SumberEntitas } from '../siakad/pilih';
import {
  galatDariServer,
  isianSkema,
  jenisIsian,
  keteranganIsian,
  labelKolom,
  labelNilai,
  nilaiAwal,
  penandaKolom,
  rapikanGalat,
  validasiBody,
  validasiNilai,
  type GalatForm,
  type NilaiForm,
} from './aturan';
import { judulBaris } from './aturan';
import type { Acuan, Baris, Skema } from './tipe';

const teks = (v: unknown) => (v == null ? '' : String(v));
const gabung = (...xs: unknown[]) => xs.filter((x) => x != null && x !== '').join(' · ');

// ================================================================ Acuan → sumber PilihEntitas
const cacheSumber = new Map<string, SumberEntitas>();

/**
 * Sumber pilih-cari untuk isian referensi dari katalog (`rf`). Kunci tabel lama (NIM, NIDN, username, prodi,
 * fakultas) memakai sumber bawaan {@link SUMBER_ENTITAS}; tabel modul memakai endpoint daftarnya sendiri.
 */
export function sumberDariAcuan(rf: Acuan, nama = ''): SumberEntitas {
  const id = `${rf.l}|${rf.k}|${rf.d ?? ''}|${rf.q ?? ''}`;
  const hit = cacheSumber.get(id);
  if (hit) return hit;
  let s: SumberEntitas | undefined;
  if (rf.l === 'pengguna') s = SUMBER_ENTITAS.pengguna;
  else s = Object.values(SUMBER_ENTITAS).find((x) => x.path === rf.l && x.kunci === rf.k);
  if (!s && rf.l === '/v1/referensi/tahun-akademik') {
    s = {
      nama: 'tahun akademik',
      path: rf.l,
      kunci: rf.k,
      klien: true,
      judul: (r) => teks(r.nama ?? r.nama_tahun ?? r.tahun_id),
      meta: (r) => gabung(r.tahun_id, r.aktif === true || r.aktif === 'Y' ? 'Aktif' : null),
      placeholder: 'Pilih tahun akademik',
    };
  }
  if (!s) {
    const benda = labelKolom(nama || rf.l.split('/').pop() || '').toLowerCase();
    s = {
      nama: benda || 'data',
      path: rf.l,
      kunci: rf.k,
      satu: rf.d,
      klien: rf.q === 0,
      judul: (r) => judulBaris(r, rf.k),
      meta: (r) => gabung(r.kode && r.kode !== judulBaris(r) ? r.kode : null, r.jenis && labelNilai(r.jenis), r.status && labelNilai(r.status)),
      placeholder: `Cari ${benda || 'data'}`,
    };
  }
  cacheSumber.set(id, s);
  return s;
}

// ================================================================ Satu isian
export interface IsianSkemaProps {
  nama: string;
  skema: Skema;
  value: unknown;
  onValueChange: (v: unknown) => void;
  onBlur?: () => void;
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** Saringan tambahan untuk isian pilih-cari, mis. { prodi: '55201' }. */
  query?: Record<string, string | number | boolean | undefined>;
}

const keTanggal = (s: unknown) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};
const dariTanggal = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '');

/** Kontrol untuk satu properti skema: pilih-cari, pilihan, tanggal, angka, saklar, berkas, daftar, JSON, atau teks. */
export function IsianSkema({ nama, skema: s, value: v, onValueChange: set, onBlur, id, disabled, invalid, query }: IsianSkemaProps) {
  const j = jenisIsian(nama, s);
  switch (j) {
    case 'acuan':
      return (
        <PilihEntitas
          id={id}
          jenis={sumberDariAcuan(s.rf!, nama)}
          value={teks(v) || null}
          onValueChange={(x) => {
            set(x ?? '');
            onBlur?.();
          }}
          query={query}
          disabled={disabled}
        />
      );
    case 'boolean':
      return (
        <span className="u-isian-saklar">
          <Switch id={id} checked={Boolean(v)} onCheckedChange={(x) => set(x)} disabled={disabled} />
          <span>{v ? 'Ya' : 'Tidak'}</span>
        </span>
      );
    case 'enum':
      return (
        <Select<string>
          id={id}
          value={teks(v) || null}
          onValueChange={(x) => {
            set(x ?? '');
            onBlur?.();
          }}
          disabled={disabled}
          placeholder="Pilih…"
          options={s.e!.filter((x) => x !== null).map((x) => ({ value: String(x), label: labelNilai(x) }))}
        />
      );
    case 'tanggal':
      return <DatePicker id={id} value={keTanggal(v)} onValueChange={(d) => (set(dariTanggal(d)), onBlur?.())} disabled={disabled} />;
    case 'teks-panjang':
      return <Textarea id={id} value={teks(v)} onChange={(e) => set(e.target.value)} onBlur={onBlur} rows={4} maxLength={s.max} disabled={disabled} aria-invalid={invalid || undefined} />;
    case 'json':
      return <IsianJson id={id} value={v} onValueChange={set} onBlur={onBlur} disabled={disabled} />;
    case 'daftar':
      return <IsianDaftar id={id} value={Array.isArray(v) ? v.map(String) : []} onValueChange={set} disabled={disabled} angka={s.i?.t === 'integer' || s.i?.t === 'number'} enumNilai={s.i?.e?.map(String)} />;
    case 'file':
      return (
        <label htmlFor={id} className={cn('u-isian-berkas', disabled && 'is-disabled')}>
          <Upload aria-hidden />
          <span>{typeof FileList !== 'undefined' && v instanceof FileList && v.length ? Array.from(v).map((f) => f.name).join(', ') : 'Pilih berkas…'}</span>
          <input id={id} type="file" className="u-sr-only" multiple={s.t === 'array'} onChange={(e) => set(e.target.files)} disabled={disabled} />
        </label>
      );
    default: {
      const type = { bulat: 'number', angka: 'number', waktu: 'datetime-local', email: 'email', url: 'url', jam: 'time', telepon: 'tel' }[j as string] ?? 'text';
      return (
        <Input
          id={id}
          type={type}
          inputMode={j === 'bulat' ? 'numeric' : j === 'angka' ? 'decimal' : undefined}
          value={teks(v)}
          onChange={(e) => set(e.target.value)}
          onBlur={onBlur}
          maxLength={s.max}
          min={s.min}
          max={s.mx}
          step={j === 'angka' ? 'any' : undefined}
          placeholder={s.ex !== undefined ? String(s.ex) : j === 'kode' ? 'huruf, angka, . _ - /' : undefined}
          disabled={disabled}
          className={j === 'kode' ? 'u-mono' : undefined}
        />
      );
    }
  }
}

/** Daftar nilai pendek (tag): Enter atau koma menambah. */
export function IsianDaftar({ value, onValueChange, id, disabled, angka, enumNilai }: { value: string[]; onValueChange: (v: string[]) => void; id?: string; disabled?: boolean; angka?: boolean; enumNilai?: string[] }) {
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
            {labelNilai(x)}
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

/** Objek/array JSON sebagai teks yang diurai saat keluar dari isian. */
export function IsianJson({ value, onValueChange, onBlur, id, disabled }: { value: unknown; onValueChange: (v: unknown) => void; onBlur?: () => void; id?: string; disabled?: boolean }) {
  const [t, setT] = React.useState(() => (value === undefined || value === null || value === '' ? '' : typeof value === 'string' ? value : JSON.stringify(value, null, 2)));
  return (
    <Textarea
      id={id}
      className="u-mono"
      rows={5}
      value={t}
      disabled={disabled}
      placeholder='{"kunci": "nilai"}'
      onChange={(e) => {
        setT(e.target.value);
        onValueChange(e.target.value);
      }}
      onBlur={() => {
        try {
          if (t.trim()) {
            const x = JSON.parse(t);
            onValueChange(x);
            setT(JSON.stringify(x, null, 2));
          } else onValueChange(undefined);
        } catch {
          /* galat ditampilkan validasi */
        }
        onBlur?.();
      }}
    />
  );
}

// ================================================================ Formulir
export interface UseFormulirSkemaOpsi {
  /** Baris yang diubah (mode ubah). Tanpa ini = mode tambah dengan nilai bawaan skema. */
  data?: Baris | null;
  /** Nilai awal tambahan (mis. kolom induk pada sumber anak). */
  nilai?: NilaiForm;
}

/**
 * State formulir dari skema: nilai, galat per isian (diperiksa saat keluar isian, dihapus saat diketik),
 * dan `kirim()` yang memvalidasi semua isian lalu membentuk body seperti backend.
 */
export function useFormulirSkema(skema: Skema | undefined, { data, nilai: tambahan }: UseFormulirSkemaOpsi = {}) {
  const ubah = Boolean(data);
  const awal = React.useMemo(() => ({ ...nilaiAwal(skema, data), ...tambahan }), [skema, data, JSON.stringify(tambahan ?? {})]); // eslint-disable-line react-hooks/exhaustive-deps
  const [nilai, setNilai] = React.useState<NilaiForm>(awal);
  const [galat, setGalat] = React.useState<GalatForm>({});
  React.useEffect(() => {
    setNilai(awal);
    setGalat({});
  }, [awal]);
  const multipart = isianSkema(skema).some(([k, s]) => jenisIsian(k, s) === 'file');
  return {
    nilai,
    galat,
    ubah,
    setGalat,
    set: (k: string, v: unknown) => {
      setNilai((n) => ({ ...n, [k]: v }));
      setGalat((g) => (g[k] ? { ...g, [k]: '' } : g));
    },
    periksa: (k: string) => {
      const s = skema?.pr?.[k];
      if (!s) return;
      const g = validasiNilai(k, s, nilai[k]);
      setGalat((x) => ({ ...x, [k]: g ?? '' }));
    },
    reset: () => {
      setNilai(awal);
      setGalat({});
    },
    /** Validasi semua isian; kembalikan body atau null bila ada galat (galat ditampilkan). */
    kirim: (): Record<string, unknown> | FormData | null => {
      const r = validasiBody(skema, nilai, { ubah, awal, multipart });
      const ada = Object.keys(r.galat).length > 0;
      setGalat(r.galat);
      if (ada) {
        const k = Object.keys(r.galat)[0];
        requestAnimationFrame(() => document.getElementById(`isian-${k}`)?.focus());
      }
      return ada ? null : r.body;
    },
    /** Petakan galat 422 server ke isian. Kembalikan true bila ada yang terpetakan. */
    galatServer: (e: unknown) => {
      const g = galatDariServer(e);
      if (g) setGalat(g);
      return Boolean(g);
    },
    berubah: () => validasiBody(skema, nilai, { ubah, awal }).berubah.length > 0,
  };
}
export type FormulirSkemaState = ReturnType<typeof useFormulirSkema>;

export interface FormulirSkemaProps {
  skema: Skema | undefined;
  form: FormulirSkemaState;
  /** Hanya tampilkan isian ini (urutannya diikuti). */
  kolom?: string[];
  /** Sembunyikan isian ini (mis. kolom induk yang sudah terisi). */
  sembunyi?: string[];
  /** Jumlah kolom grid di layar lebar. */
  columns?: 1 | 2;
  /** Ganti kontrol isian tertentu. */
  render?: Record<string, (p: IsianSkemaProps) => React.ReactNode>;
  /** Saringan pilih-cari per isian. */
  query?: Record<string, Record<string, string | number | boolean | undefined>>;
  disabled?: boolean;
  className?: string;
}

/**
 * Formulir dari skema katalog: label dari nama kolom, tanda wajib dari `required`, kontrol dari tipe, dan
 * galat yang sama dengan backend. Kunci data lain (NIM, NIDN, ID tabel) selalu pilih-cari, bukan ketik ID.
 */
export function FormulirSkema({ skema, form, kolom, sembunyi, columns = 2, render, query, disabled, className }: FormulirSkemaProps) {
  const wajib = new Set(skema?.rq ?? []);
  let props = isianSkema(skema);
  if (kolom) props = kolom.map((k) => [k, skema?.pr?.[k]] as [string, Skema]).filter(([, s]) => s && !penandaKolom(s).baca);
  if (sembunyi) props = props.filter(([k]) => !sembunyi.includes(k));
  if (!props.length) return <p className="u-field-description">Tidak ada isian.</p>;
  return (
    <div className={cn('u-formulir-skema', className)} data-columns={columns}>
      {props.map(([k, s]) => {
        const j = jenisIsian(k, s);
        const lebar = columns === 1 || ['teks-panjang', 'json', 'file', 'daftar'].includes(j);
        const p: IsianSkemaProps = {
          nama: k,
          skema: s,
          value: form.nilai[k],
          onValueChange: (v) => form.set(k, v),
          onBlur: () => form.periksa(k),
          id: `isian-${k}`,
          disabled,
          invalid: Boolean(form.galat[k]),
          query: query?.[k],
        };
        const tanda = penandaKolom(s);
        const ket = [keteranganIsian(s), tanda.kelola ? 'Hanya pengelola' : null, s.max && j !== 'kode' && (j === 'teks' || j === 'teks-panjang') ? `Maksimal ${s.max} karakter` : null].filter(Boolean).join('. ');
        return (
          <Field
            key={k}
            label={labelKolom(k)}
            required={wajib.has(k) && !form.ubah}
            error={form.galat[k] ? rapikanGalat(form.galat[k]) : undefined}
            description={ket || undefined}
            className={lebar ? 'u-formulir-lebar' : undefined}
          >
            {render?.[k] ? render[k](p) : <IsianSkema {...p} />}
          </Field>
        );
      })}
    </div>
  );
}
