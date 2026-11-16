'use client';
import * as React from 'react';
import { Upload } from 'lucide-react';
import { DatePicker } from '../components/calendar';
import { Field, Input, Switch, Textarea } from '../components/forms';
import { Pilihan, BagianForm, GridForm, IsianDaftar } from '../components/formulir';
export { IsianDaftar } from '../components/formulir';
import type { SelectOption } from '../components/select';
import { cn } from '../lib/cn';
import { PilihEntitas, SUMBER_ENTITAS, type SumberEntitas } from '../siakad/pilih';
import { PilihBerkas } from '../siakad/pilih-berkas';
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
  unggahWajib,
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

/**
 * Opsi enum dengan label dari keterangan skema bila ditulis "A wajib, B pilihan, C …" (pola backend SIAKAD);
 * selain itu label dari nilai (`paruh_waktu` → "Paruh waktu").
 */
const LABEL_DARI_KET = new WeakSet<Skema>();
/** Opsi pilihan dari enum skema OpenAPI, dengan label dari keterangan skema atau dari nilainya (`paruh_waktu` → "Paruh waktu"). */
export function opsiEnum(s: Skema): SelectOption<string>[] {
  const nilai = (s.e ?? []).filter((x) => x !== null).map(String);
  const peta: Record<string, string> = {};
  for (const bagian of (s.ds ?? '').split(/[,;]\s*/)) {
    const m = /^\s*([A-Za-z0-9_]+)\s*(?:=|:|-|\s)\s*(.+?)\s*\.?$/.exec(bagian);
    if (m && nilai.includes(m[1]) && !peta[m[1]]) peta[m[1]] = m[2].charAt(0).toUpperCase() + m[2].slice(1);
  }
  const lengkap = nilai.length > 0 && nilai.every((x) => peta[x]);
  if (lengkap) LABEL_DARI_KET.add(s);
  return nilai.map((x) => ({ value: x, label: lengkap ? (x.length <= 2 ? `${peta[x]} (${x})` : peta[x]) : labelNilai(x) }));
}

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
        <Pilihan
          id={id}
          value={teks(v) || null}
          onValueChange={(x) => {
            set(x ?? '');
            onBlur?.();
          }}
          disabled={disabled}
          placeholder="Pilih…"
          options={opsiEnum(s)}
        />
      );
    case 'tanggal':
      return <DatePicker id={id} value={keTanggal(v)} onValueChange={(d) => (set(dariTanggal(d)), onBlur?.())} disabled={disabled} />;
    case 'teks-panjang':
      return <Textarea id={id} value={teks(v)} onChange={(e) => set(e.target.value)} onBlur={onBlur} rows={4} maxLength={s.max} disabled={disabled} aria-invalid={invalid || undefined} />;
    case 'json':
      return <IsianJson id={id} value={v} onValueChange={set} onBlur={onBlur} disabled={disabled} />;
    case 'daftar':
      return (
        <IsianDaftar
          id={id}
          value={Array.isArray(v) ? v.map(String) : []}
          onValueChange={set}
          disabled={disabled}
          angka={s.i?.t === 'integer' || s.i?.t === 'number'}
          enumNilai={s.i?.e?.map(String) ?? daftarDariKeterangan(s.ds)}
        />
      );
    case 'berkas':
      return <PilihBerkas id={id} value={typeof v === 'string' && v ? v : null} onValueChange={(x) => set(x ?? '')} disabled={disabled} invalid={invalid} />;
    case 'file':
      return (
        <label htmlFor={id} className={cn('u-isian-berkas', disabled && 'is-disabled')}>
          <Upload aria-hidden />
          <span>
            {typeof FileList !== 'undefined' && v instanceof FileList && v.length
              ? Array.from(v)
                  .map((f) => f.name)
                  .join(', ')
              : 'Pilih berkas…'}
          </span>
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

/** Keterangan berupa daftar kode ("kuliah, responsi, tutorial, …") = pilihan tetap untuk isian daftar. */
function daftarDariKeterangan(ds?: string): string[] | undefined {
  const xs = (ds ?? '').split(/,\s*/).map((x) => x.trim());
  return xs.length >= 3 && xs.every((x) => /^[a-z][a-z0-9_]*$/.test(x)) ? xs : undefined;
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
const normal = (v: unknown) =>
  v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)
    ? ''
    : typeof v === 'object' && !(typeof FileList !== 'undefined' && v instanceof FileList)
      ? JSON.stringify(v)
      : String(v);

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
    /** Ada isian yang berbeda dari nilai awal (kosong, null, dan tidak diisi dianggap sama). */
    berubah: () => Object.keys({ ...awal, ...nilai }).some((k) => normal(nilai[k]) !== normal(awal[k])),
  };
}
export type FormulirSkemaState = ReturnType<typeof useFormulirSkema>;

/** Satu bagian formulir skema: judul, keterangan, dan isian yang masuk ke bagian ini (urutannya diikuti). */
export interface BagianSkema {
  judul: React.ReactNode;
  keterangan?: React.ReactNode;
  ikon?: React.ReactNode;
  kolom: string[];
  /** Kolom grid bagian ini. Bawaan ikut `columns`. */
  columns?: 1 | 2 | 3;
}

export interface FormulirSkemaProps {
  skema: Skema | undefined;
  form: FormulirSkemaState;
  /** Hanya tampilkan isian ini (urutannya diikuti). */
  kolom?: string[];
  /** Sembunyikan isian ini (mis. kolom induk yang sudah terisi). */
  sembunyi?: string[];
  /**
   * Kelompokkan isian per bagian (Identitas, Beban studi, …). Isian skema yang tidak disebut masuk bagian
   * "Lainnya" di akhir, kecuali `sisa={false}`.
   */
  bagian?: BagianSkema[];
  /** Judul bagian untuk isian yang tidak disebut di `bagian`; false untuk menyembunyikannya. */
  sisa?: React.ReactNode | false;
  /** Jumlah kolom grid di layar lebar. */
  columns?: 1 | 2 | 3;
  /** Isian yang selalu selebar bagian. */
  lebar?: string[];
  /** Ganti kontrol isian tertentu. */
  render?: Record<string, (p: IsianSkemaProps) => React.ReactNode>;
  /** Jadikan isian teks sebagai pilihan dari daftar ini (tombol, daftar, atau cari sesuai jumlah). */
  opsi?: Record<string, SelectOption<string>[]>;
  /** Label isian pengganti nama kolom. */
  label?: Record<string, React.ReactNode>;
  /** Keterangan isian pengganti keterangan skema. */
  keterangan?: Record<string, React.ReactNode>;
  /** Sisipkan konten selebar bagian setelah isian ini (mis. ringkasan SKS setelah isian SKS terakhir). */
  setelah?: Record<string, React.ReactNode | ((nilai: NilaiForm) => React.ReactNode)>;
  /** Saringan pilih-cari per isian. */
  query?: Record<string, Record<string, string | number | boolean | undefined>>;
  disabled?: boolean;
  className?: string;
}

/**
 * Formulir dari skema katalog: label dari nama kolom, tanda wajib dari `required`, kontrol dari tipe, dan
 * galat yang sama dengan backend. Kunci data lain (NIM, NIDN, ID tabel) selalu pilih-cari, bukan ketik ID.
 * Dengan `bagian`, isian dikelompokkan dalam bagian berjudul; grid menyesuaikan lebar panel (1 kolom di ponsel).
 */
export function FormulirSkema({
  skema,
  form,
  kolom,
  sembunyi,
  bagian,
  sisa = 'Lainnya',
  columns = 2,
  lebar: lebarPaksa,
  render,
  opsi,
  label,
  keterangan,
  setelah,
  query,
  disabled,
  className,
}: FormulirSkemaProps) {
  const wajib = new Set(skema?.rq ?? []);
  if (!form.ubah && unggahWajib(skema)) wajib.add('berkas_id');
  let props = isianSkema(skema);
  if (kolom) props = kolom.map((k) => [k, skema?.pr?.[k]] as [string, Skema]).filter(([, s]) => s && !penandaKolom(s).baca);
  if (sembunyi) props = props.filter(([k]) => !sembunyi.includes(k));
  if (!props.length) return <p className="u-field-description">Tidak ada isian.</p>;
  const peta = new Map(props);

  const isian = ([k, s]: [string, Skema], cols: number) => {
    const j = jenisIsian(k, s);
    const lebar = cols === 1 || lebarPaksa?.includes(k) || ['teks-panjang', 'json', 'file', 'berkas', 'daftar'].includes(j);
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
    const ket =
      keterangan?.[k] ??
      ([
        (j === 'enum' && (opsiEnum(s), LABEL_DARI_KET.has(s))) || (j === 'daftar' && !s.i?.e && daftarDariKeterangan(s.ds)) ? null : keteranganIsian(s),
        tanda.kelola ? 'Hanya pengelola' : null,
        s.max && j !== 'kode' && (j === 'teks' || j === 'teks-panjang') ? `Maksimal ${s.max} karakter` : null,
      ]
        .filter(Boolean)
        .join('. ') ||
        undefined);
    const kontrol = render?.[k] ? (
      render[k](p)
    ) : opsi?.[k] ? (
      <Pilihan
        id={p.id}
        options={opsi[k]}
        value={teks(p.value) || null}
        required={wajib.has(k)}
        disabled={disabled}
        onValueChange={(x) => {
          p.onValueChange(x ?? '');
          p.onBlur?.();
        }}
      />
    ) : (
      <IsianSkema {...p} />
    );
    return (
      <React.Fragment key={k}>
        <Field
          label={label?.[k] ?? labelKolom(k)}
          required={wajib.has(k) && !form.ubah}
          error={form.galat[k] ? rapikanGalat(form.galat[k]) : undefined}
          description={ket}
          className={lebar ? 'u-formulir-lebar' : undefined}
        >
          {kontrol}
        </Field>
        {setelah?.[k] != null && (
          <div className="u-form-lebar">{typeof setelah[k] === 'function' ? (setelah[k] as (n: NilaiForm) => React.ReactNode)(form.nilai) : (setelah[k] as React.ReactNode)}</div>
        )}
      </React.Fragment>
    );
  };

  if (!bagian?.length) {
    return (
      <GridForm kolom={columns} className={cn('u-formulir-skema', className)}>
        {props.map((x) => isian(x, columns))}
      </GridForm>
    );
  }
  const disebut = new Set(bagian.flatMap((b) => b.kolom));
  const lain = props.filter(([k]) => !disebut.has(k));
  const daftar = [...bagian.map((b) => ({ ...b, isi: b.kolom.filter((k) => peta.has(k)).map((k) => [k, peta.get(k)!] as [string, Skema]) }))];
  if (lain.length && sisa !== false) daftar.push({ judul: sisa, kolom: [], isi: lain });
  return (
    <div className={cn('u-formulir-skema u-formulir-berbagian', className)}>
      {daftar
        .filter((b) => b.isi.length)
        .map((b, i) => (
          <BagianForm key={i} judul={b.judul} keterangan={b.keterangan} ikon={b.ikon} kolom={b.columns ?? columns}>
            {b.isi.map((x) => isian(x, b.columns ?? columns))}
          </BagianForm>
        ))}
    </div>
  );
}
