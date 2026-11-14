'use client';
import * as React from 'react';
import { ArrowLeft, ChevronRight, Play, Search, Workflow } from 'lucide-react';
import { Badge, Button, Skeleton } from '../components/actions';
import { Card, Empty } from '../components/display';
import { Combobox } from '../components/select';
import type { NavGroup } from '../components/layout';
import { cn } from '../lib/cn';
import { GalatApi } from '../siakad/galat';
import { useSiakad } from '../siakad/provider';
import { isiPath, judulOperasi, labelKolom, paramPath, punyaScope, rapikanGalat, validasiParameter } from './aturan';
import { FormulirSkema, IsianSkema, useFormulirSkema } from './isian';
import { IkonKatalog } from './ikon';
import { IkonKotak } from '../ikon/kotak';
import { ADEGAN, Ilustrasi } from '../ikon/ilustrasi';
import { Animasi } from '../components/animasi';
import { KelolaSumber } from './kelola';
import { useKatalog, useModulKatalog, useModulTerlihat } from './katalog';
import { DetailBaris, NilaiSel } from './tampil';
import type { Baris, ModulIndeks, Operasi } from './tipe';
import { Field } from '../components/forms';
import { DataTable } from '../components/data-table';

// ================================================================ Menu
export interface MenuKatalogOpsi {
  /** Tautan modul, mis. (m) => `/fitur/${m}`. */
  href?: (modul: string) => string;
  onClick?: (modul: string) => void;
  /** Tampilkan sumber data sebagai sub-menu. */
  sumber?: boolean;
  hrefSumber?: (modul: string, sumber: string) => string;
}

/** Grup menu Sidebar dari katalog (sesuai scope di KatalogProvider). */
export function useMenuKatalog({ href, onClick, sumber, hrefSumber }: MenuKatalogOpsi = {}): NavGroup[] {
  const grup = useModulTerlihat();
  return grup.map(({ grup: g, modul }) => ({
    label: g.title,
    items: modul.map((m) => ({
      key: m.key,
      label: m.title,
      icon: <IkonKatalog nama={m.icon} />,
      href: href?.(m.key),
      onClick: onClick ? () => onClick(m.key) : undefined,
      children: sumber ? m.sumber.map((s) => ({ key: `${m.key}:${s.id}`, label: s.title, href: hrefSumber?.(m.key, s.id) })) : undefined,
    })),
  }));
}

// ================================================================ Daftar modul
export interface DaftarModulProps {
  /** Batasi ke grup tertentu, mis. ['akademik']. */
  grup?: string[];
  onPilih?: (modul: ModulIndeks) => void;
  href?: (modul: string) => string;
  className?: string;
}

/** Kartu modul per grup (Sistem & Akses, Referensi, Akademik, …) dengan jumlah sumber data dan operasi. */
export function DaftarModul({ grup, onPilih, href, className }: DaftarModulProps) {
  const semua = useModulTerlihat().filter((g) => !grup || grup.includes(g.grup.key));
  return (
    <div className={cn('u-daftar-modul', className)}>
      {semua.map(({ grup: g, modul }) => (
        <section key={g.key}>
          <h3>
            <IkonKotak nada={ADEGAN[g.key]?.nada} ukuran="sm" gaya="lembut">
              <IkonKatalog nama={g.icon} />
            </IkonKotak>{' '}
            {g.title}
          </h3>
          <div className="u-daftar-modul-kisi">
            {modul.map((m, i) => (
              <Animasi key={m.key} jenis="masuk" tunda={i} pemicu="terlihat">
              <Card
                interactive
                className="u-kartu-modul"
                render={href ? <a href={href(m.key)} /> : <button type="button" onClick={() => onPilih?.(m)} />}
              >
                <IkonKotak nada={ADEGAN[m.key]?.nada ?? ADEGAN[m.group]?.nada} ukuran="lg">
                  <IkonKatalog nama={m.icon} />
                </IkonKotak>
                <span className="u-kartu-modul-teks">
                  <b>{m.title}</b>
                  <small>{m.desc}</small>
                  <span className="u-kartu-modul-meta">
                    {m.sumber.length} data · {m.jumlahOperasi} operasi
                  </span>
                </span>
                <ChevronRight className="u-kartu-modul-panah" aria-hidden />
              </Card>
              </Animasi>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ================================================================ Halaman modul
export interface HalamanModulProps {
  modul: string;
  /** Sumber aktif (terkendali), mis. dari URL. */
  sumber?: string | null;
  onSumberChange?: (id: string | null) => void;
  onKembali?: () => void;
  className?: string;
}

/**
 * Satu modul lengkap: daftar sumber data di kiri, halaman kelola di kanan, plus operasi mandiri (laporan, impor,
 * sinkronisasi) yang dijalankan dengan formulir parameter.
 */
export function HalamanModul({ modul: key, sumber: sumberProp, onSumberChange, onKembali, className }: HalamanModulProps) {
  const { indeks, scopes } = useKatalog();
  const info = indeks.modul.find((m) => m.key === key);
  const st = useModulKatalog(key);
  const [inner, setInner] = React.useState<string | null>(null);
  const aktif = sumberProp !== undefined ? sumberProp : inner;
  const pilih = (id: string | null) => {
    setInner(id);
    onSumberChange?.(id);
  };
  if (!info) return <Empty title="Modul tidak ditemukan" description={key} bordered />;
  const akar = info.sumber.filter((s) => !scopes || !s.sc?.length || s.sc.every((x) => scopes.includes(x)));
  const mandiri = info.operasi.filter((o) => !scopes || !o.sc?.length || o.sc.every((x) => scopes.includes(x)));
  const pertama = aktif ?? akar[0]?.id ?? (mandiri[0] ? `op:${mandiri[0].id}` : null);
  const op = pertama?.startsWith('op:') ? st.modul?.ops[pertama.slice(3)] : undefined;
  // Kelompokkan sumber per tag ("Kemahasiswaan: Beasiswa" → "Beasiswa").
  const perTag = new Map<string, Array<{ id: string; title: string; op?: boolean }>>();
  for (const s of akar) {
    const t = s.tag.includes(':') ? s.tag.split(':').slice(1).join(':').trim() : s.tag;
    if (!perTag.has(t)) perTag.set(t, []);
    perTag.get(t)!.push({ id: s.id, title: s.title });
  }
  if (mandiri.length) perTag.set('Operasi lain', mandiri.map((o) => ({ id: `op:${o.id}`, title: judulOperasi({ sum: o.title, path: o.id }), op: true })));
  return (
    <div className={cn('u-halaman-modul', className)}>
      <header className="u-halaman-modul-head">
        {onKembali && (
          <Button variant="ghost" size="sm" iconOnly aria-label="Kembali" onClick={onKembali}>
            <ArrowLeft />
          </Button>
        )}
        <IkonKotak nada={ADEGAN[info.key]?.nada ?? ADEGAN[info.group]?.nada} ukuran="xl">
          <IkonKatalog nama={info.icon} />
        </IkonKotak>
        <div className="u-halaman-modul-judul">
          <h1>{info.title}</h1>
          <p>{info.desc}</p>
        </div>
        <Ilustrasi nama={ADEGAN[info.key] ? info.key : info.group} lebar={150} className="u-halaman-modul-ilus" />
      </header>
      <div className="u-halaman-modul-isi">
        <nav className="u-halaman-modul-nav" aria-label={`Data ${info.title}`}>
          {[...perTag.entries()].map(([t, items]) => (
            <div key={t}>
              <h4>{t}</h4>
              <ul>
                {items.map((s) => (
                  <li key={s.id}>
                    <button type="button" aria-current={s.id === pertama ? 'page' : undefined} onClick={() => pilih(s.id)}>
                      {s.op ? <Workflow aria-hidden /> : null}
                      {s.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="u-halaman-modul-konten">
          {st.loading ? <Skeleton height={320} /> : st.error ? <GalatApi error={st.error} /> : pertama?.startsWith('op:') ? op ? <FormOperasi op={op} key={op.id} /> : null : pertama ? <KelolaSumber key={pertama} sumber={pertama} /> : <Empty title="Belum ada data di modul ini" bordered />}
        </div>
      </div>
    </div>
  );
}

// ================================================================ Operasi mandiri
/** Jalankan satu operasi API dari katalog: isian parameter + body dengan aturan backend, lalu tampilkan hasilnya. */
export function FormOperasi({ op, nilaiPath, onSelesai }: { op: Operasi; nilaiPath?: Record<string, unknown>; onSelesai?: (data: unknown) => void }) {
  const siakad = useSiakad();
  const { scopes } = useKatalog();
  const params = (op.pa ?? []).filter((p) => p.in !== 'header' && !(nilaiPath && p.nm in nilaiPath));
  const [nilaiP, setNilaiP] = React.useState<Record<string, unknown>>({});
  const [galatP, setGalatP] = React.useState<Record<string, string>>({});
  const form = useFormulirSkema(op.b?.s);
  const [hasil, setHasil] = React.useState<{ data: unknown; meta?: unknown } | null>(null);
  const [galat, setGalat] = React.useState<unknown>(null);
  const [sibuk, setSibuk] = React.useState(false);
  const izin = punyaScope(op, scopes);
  const jalan = async () => {
    const gp = validasiParameter(params, nilaiP);
    setGalatP(gp);
    const body = op.b ? form.kirim() : undefined;
    if (Object.keys(gp).length || body === null) return;
    setSibuk(true);
    setGalat(null);
    try {
      const query: Record<string, unknown> = { ...nilaiPath };
      for (const p of params) if (nilaiP[p.nm] !== undefined && nilaiP[p.nm] !== '') query[p.nm] = nilaiP[p.nm];
      const r = await siakad.request({ method: op.m, path: op.path, query: query as never, body: body ?? (op.m === 'POST' ? {} : undefined), multipart: typeof FormData !== 'undefined' && body instanceof FormData, public: Boolean(op.pub) });
      setHasil({ data: r.data, meta: r.meta });
      onSelesai?.(r.data);
    } catch (e) {
      if (!form.galatServer(e)) setGalat(e);
    } finally {
      setSibuk(false);
    }
  };
  return (
    <section className="u-form-operasi">
      <header className="u-kelola-head">
        <div>
          <h2>{judulOperasi(op)}</h2>
          <p>
            <Badge variant={op.m === 'GET' ? 'info' : op.m === 'DELETE' ? 'danger' : 'primary'}>
              {op.m}
            </Badge>{' '}
            <span className="u-mono">{op.path}</span>
          </p>
          {op.ds && <p className="u-form-operasi-ds">{op.ds}</p>}
        </div>
        <div className="u-kelola-head-aksi">
          {(op.sc ?? []).map((sc) => (
            <Badge key={sc} variant={scopes && !scopes.includes(sc) ? 'danger' : 'neutral'}>
              {sc}
            </Badge>
          ))}
        </div>
      </header>
      {params.length > 0 && (
        <div className="u-formulir-skema" data-columns={2}>
          {params.map((p) => (
            <Field key={p.nm} label={labelKolom(p.nm)} required={Boolean(p.rq)} description={p.ds} error={galatP[p.nm] ? rapikanGalat(galatP[p.nm]) : undefined}>
              <IsianSkema
                nama={p.nm}
                skema={p.s}
                id={`param-${p.nm}`}
                value={nilaiP[p.nm] ?? ''}
                onValueChange={(v) => {
                  setNilaiP((x) => ({ ...x, [p.nm]: v }));
                  setGalatP((g) => ({ ...g, [p.nm]: '' }));
                }}
              />
            </Field>
          ))}
        </div>
      )}
      {op.b && <FormulirSkema skema={op.b.s} form={form} />}
      <div className="u-form-operasi-aksi">
        <Button onClick={jalan} loading={sibuk} disabled={!izin}>
          <Play /> {op.m === 'GET' ? 'Tampilkan' : judulOperasi(op)}
        </Button>
        {!izin && <small>Butuh izin {op.sc?.join(', ')}.</small>}
      </div>
      {galat ? <GalatApi error={galat} title={`${judulOperasi(op)} gagal`} /> : null}
      {hasil && <HasilOperasi data={hasil.data} />}
    </section>
  );
}

/** Hasil operasi: tabel untuk daftar, daftar label untuk objek, atau teks. */
export function HasilOperasi({ data }: { data: unknown }) {
  if (Array.isArray(data)) {
    if (!data.length) return <Empty title="Tidak ada data" bordered />;
    if (data.every((x) => x && typeof x === 'object')) {
      const keys = [...new Set(data.slice(0, 20).flatMap((x) => Object.keys(x as object)))].slice(0, 8);
      return (
        <DataTable<Baris>
          rows={data as Baris[]}
          rowKey={(b) => JSON.stringify(b).slice(0, 200)}
          columns={keys.map((k) => ({ key: k, header: labelKolom(k), label: labelKolom(k), cell: (b: Baris) => <NilaiSel nama={k} value={b[k]} /> }))}
          exportCsv="hasil"
        />
      );
    }
    return <pre className="u-nilai-json">{JSON.stringify(data, null, 2)}</pre>;
  }
  if (data && typeof data === 'object') return <DetailBaris baris={data as Baris} />;
  return <pre className="u-nilai-json">{data === undefined ? 'Selesai.' : String(data)}</pre>;
}

// ================================================================ Pencarian fitur
interface ButirFitur {
  key: string;
  modul: ModulIndeks;
  judul: string;
  jenis: 'modul' | 'sumber' | 'operasi';
  id?: string;
}

/** Kotak cari semua fitur (modul, sumber data, operasi) di katalog; cocok untuk palet perintah ⌘K. */
export function PencarianFitur({ onPilih, placeholder = 'Cari fitur: beasiswa, KRS, peminjaman ruang…', className }: { onPilih: (b: { modul: string; sumber?: string; operasi?: string }) => void; placeholder?: string; className?: string }) {
  const grup = useModulTerlihat();
  const items = React.useMemo<ButirFitur[]>(
    () =>
      grup.flatMap(({ modul }) =>
        modul.flatMap((m) => [
          { key: `m:${m.key}`, modul: m, judul: m.title, jenis: 'modul' as const },
          ...m.sumber.map((s) => ({ key: `s:${s.id}`, modul: m, judul: s.title, jenis: 'sumber' as const, id: s.id })),
          ...m.operasi.map((o) => ({ key: `o:${o.id}`, modul: m, judul: judulOperasi({ sum: o.title, path: o.id }), jenis: 'operasi' as const, id: o.id })),
        ]),
      ),
    [grup],
  );
  return (
    <Combobox<ButirFitur>
      className={className}
      items={items}
      icon={<Search />}
      placeholder={placeholder}
      itemKey={(b) => b.key}
      itemToString={(b) => `${b.judul} ${b.modul.title} ${b.id ?? ''}`}
      emptyText="Fitur tidak ditemukan."
      renderItem={(b) => (
        <span className="u-butir-fitur">
          <IkonKatalog nama={b.modul.icon} />
          <span>
            <b>{b.judul}</b>
            <small>{b.jenis === 'modul' ? 'Modul' : `${b.modul.title}${b.id && b.jenis === 'sumber' ? ` · ${b.id}` : ''}`}</small>
          </span>
        </span>
      )}
      value={null}
      onValueChange={(b) => b && onPilih({ modul: b.modul.key, sumber: b.jenis === 'sumber' ? b.id : undefined, operasi: b.jenis === 'operasi' ? b.id : undefined })}
    />
  );
}

/** Isi path dengan nilai, bila semua parameter tersedia; null bila belum. */
export function pathSiap(path: string, nilai: Record<string, unknown>): string | null {
  return paramPath(path).every((p) => nilai[p] !== undefined && nilai[p] !== '') ? isiPath(path, nilai) : null;
}
