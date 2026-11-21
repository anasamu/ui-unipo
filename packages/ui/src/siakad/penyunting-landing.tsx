'use client';
import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown,
  ArrowUp,
  CircleDot,
  Copy,
  Eye,
  EyeOff,
  FileClock,
  GripVertical,
  LayoutTemplate,
  Monitor,
  Moon,
  PanelsTopLeft,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Send,
  Settings2,
  SlidersHorizontal,
  Smartphone,
  Sun,
  Tablet,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { Badge, Button, Spinner } from '../components/actions';
import { Alert, Empty, Tabs } from '../components/display';
import { Field, Input, SegmentedControl, Switch, Textarea } from '../components/forms';
import { Select } from '../components/select';
import { PilihIkon, type IkonPilihan } from '../components/pilih-tampilan';
import { ConfirmDialog, Dialog, Sheet, useToast } from '../components/overlays';
import { HalamanLanding, type AksiLanding, type SlotLanding } from '../components/landing-blok';
import { POTONGAN_LANDING, TEMPLAT_LANDING, landingBawaan, templatLanding } from '../components/landing-kit';
import {
  GRUP_BLOK,
  IKON_LANDING,
  SKEMA_BLOK,
  URUT_BLOK,
  blokBaru,
  gambarAman,
  judulBlok,
  normalisasiDokumen,
  urlAman,
  type BlokLanding,
  type DokumenLanding,
  type GayaBlok,
  type IsiBlok,
  type KolomBlok,
} from '../components/landing-skema';
import { mulaiRiwayat, samaDokumen, setelKolom, terapkan, ulangi, urungkan, type AksiDokumen } from '../components/landing-sunting';
import { cn, dataFlag } from '../lib/cn';
import { PilihBerkas } from './pilih-berkas';
import { PENYEDIA_SIAKAD, pathHalaman, type DataHalamanLanding } from './landing-aplikasi';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

// ---------------------------------------------------------------- pratinjau dalam bingkai

const LAYAR = {
  desktop: { lebar: 1440, label: 'Desktop', ikon: <Monitor /> },
  tablet: { lebar: 820, label: 'Tablet', ikon: <Tablet /> },
  ponsel: { lebar: 390, label: 'Ponsel', ikon: <Smartphone /> },
} as const;
type Layar = keyof typeof LAYAR;

/**
 * Bingkai pratinjau: iframe selebar perangkat sebenarnya (media query dan container query aplikasi berlaku seperti di
 * perangkat itu) yang diperkecil agar muat. Isi dirender lewat portal React ke dokumen iframe; gaya halaman induk
 * disalin (dan diikuti bila berubah), lalu CSS tema draf dipasang paling akhir.
 */
export function BingkaiPratinjau({ lebar, gelap, cssTema, judul = 'Pratinjau halaman', onBody, children, className }: { lebar: number; gelap?: boolean; cssTema?: string; judul?: string; onBody?: (b: HTMLElement | null) => void; children: React.ReactNode; className?: string }) {
  const wadah = React.useRef<HTMLDivElement>(null);
  const bingkai = React.useRef<HTMLIFrameElement>(null);
  const [body, setBody] = React.useState<HTMLElement | null>(null);
  const [ukuran, setUkuran] = React.useState({ w: 0, h: 0 });

  React.useEffect(() => {
    const el = wadah.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setUkuran({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setUkuran({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    const doc = bingkai.current?.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write('<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"></body></html>');
    doc.close();
    // Kelas akar aplikasi (huruf, warna dasar unipo-ui) ikut dipasang di dokumen pratinjau.
    doc.body.className = ['u-root', ...Array.from(document.body.classList).filter((c) => c !== 'dark')].join(' ');
    let jadwal = 0;
    const salin = () => {
      jadwal = 0;
      doc.head.querySelectorAll('[data-salinan]').forEach((n) => n.remove());
      const akhir = doc.getElementById('ul-tema-draf');
      document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((n) => {
        const c = n.cloneNode(true) as HTMLElement;
        c.setAttribute('data-salinan', '');
        doc.head.insertBefore(c, akhir);
      });
    };
    salin();
    const mo = new MutationObserver(() => {
      if (!jadwal) jadwal = requestAnimationFrame(salin);
    });
    mo.observe(document.head, { childList: true, subtree: true, characterData: true });
    setBody(doc.body);
    onBody?.(doc.body);
    return () => {
      mo.disconnect();
      if (jadwal) cancelAnimationFrame(jadwal);
      onBody?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const doc = bingkai.current?.contentDocument;
    if (!doc || !body) return;
    doc.documentElement.classList.toggle('dark', !!gelap);
    doc.documentElement.setAttribute('data-theme', gelap ? 'dark' : 'light');
    let s = doc.getElementById('ul-tema-draf');
    if (!s) {
      s = doc.createElement('style');
      s.id = 'ul-tema-draf';
      doc.head.appendChild(s);
    }
    s.textContent = cssTema ?? '';
  }, [gelap, cssTema, body]);

  const skala = ukuran.w ? Math.min(1, ukuran.w / lebar) : 0;
  return (
    <div ref={wadah} className={cn('upl-bingkai', className)} data-penuh={dataFlag(skala === 1)}>
      <iframe
        ref={bingkai}
        title={judul}
        className="upl-iframe"
        style={{ width: lebar, height: skala ? ukuran.h / skala : 600, transform: `translateX(-50%) scale(${skala || 1})`, opacity: skala ? 1 : 0 }}
      />
      {body && createPortal(children, body)}
    </div>
  );
}

// ---------------------------------------------------------------- isian

/** Ikon blok landing dalam bentuk PilihIkon (G4). */
const IKON_PILIH: Record<string, IkonPilihan> = Object.fromEntries(Object.entries(IKON_LANDING).map(([k, v]) => [k, { ikon: v.Ikon, label: v.label, kata: k }]));

const ILUSTRASI_PILIHAN = ['portal', 'lms', 'pmb', 'tracer', 'karier', 'alumni', 'akademik', 'kemahasiswaan', 'layanan', 'fakultas', 'lppm', 'spmi', 'humas', 'sdm', 'keu', 'perpustakaan', 'wisuda', 'pendaftaran', 'e-learning', 'selamat-datang', 'pengumuman'];

function IsianGambar({ nilai, ubah, berkas, catat, aplikasi }: { nilai: string; ubah: (v: string) => void; berkas: Record<string, string>; catat: (id: string, url: string) => void; aplikasi: string }) {
  const id = /^berkas:([0-9a-f-]{36})$/i.exec(nilai)?.[1]?.toLowerCase() ?? null;
  const url = gambarAman(nilai, berkas);
  const [teks, setTeks] = React.useState(id ? '' : nilai);
  const salah = !!teks && !gambarAman(teks);
  return (
    <div className="upl-gambar">
      <div className="upl-gambar-pratinjau" aria-hidden>
        {url ? <img src={url} alt="" /> : <span>Belum ada gambar</span>}
      </div>
      <PilihBerkas
        value={id}
        accept=".png,.jpg,.jpeg,.webp,.svg,.avif"
        kategori="foto"
        modul="tema"
        visibilitas="publik"
        enkripsi={false}
        keterangan={`Gambar halaman depan ${aplikasi}`}
        onValueChange={(uuid, b) => {
          if (!uuid) return ubah('');
          if (b?.url) catat(uuid.toLowerCase(), b.url);
          setTeks('');
          ubah(`berkas:${uuid.toLowerCase()}`);
        }}
      />
      <Field label="atau alamat gambar" description="https://… atau /alamat di aplikasi ini." error={salah ? 'Alamat harus diawali https:// atau /' : undefined}>
        <Input
          size="sm"
          value={teks}
          placeholder="https://"
          onChange={(e) => {
            setTeks(e.target.value);
            if (!e.target.value) ubah('');
            else if (gambarAman(e.target.value)) ubah(e.target.value.trim());
          }}
        />
      </Field>
    </div>
  );
}

function IsianUrl({ nilai, ubah, aksi, contoh }: { nilai: string; ubah: (v: string) => void; aksi?: Record<string, AksiLanding>; contoh?: string }) {
  const [teks, setTeks] = React.useState(nilai);
  React.useEffect(() => setTeks(nilai), [nilai]);
  const salah = !!teks && !urlAman(teks);
  const opsiAksi = Object.entries(aksi ?? {});
  return (
    <div className="upl-url">
      <Input
        size="sm"
        value={teks}
        placeholder={contoh ?? '/alamat, #bagian, atau https://'}
        aria-invalid={salah || undefined}
        onChange={(e) => {
          setTeks(e.target.value);
          if (!e.target.value) ubah('');
          else if (urlAman(e.target.value)) ubah(e.target.value.trim());
        }}
      />
      {salah && <p className="upl-galat">Pakai /alamat, #bagian, https://, mailto:, atau tel:.</p>}
      {opsiAksi.length > 0 && (
        <div className="upl-aksi-cepat" aria-label="Aksi aplikasi">
          {opsiAksi.map(([k, a]) => (
            <button key={k} type="button" aria-pressed={teks === `aksi:${k}`} onClick={() => ubah(`aksi:${k}`)}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface KonteksIsian {
  berkas: Record<string, string>;
  catat: (id: string, url: string) => void;
  aplikasi: string;
  aksi?: Record<string, AksiLanding>;
  slot?: Record<string, SlotLanding>;
}

function Kolom({ kolom, isi, ubah, k }: { kolom: KolomBlok; isi: IsiBlok; ubah: (isi: IsiBlok) => void; k: KonteksIsian }) {
  if (kolom.bila && !kolom.bila(isi)) return null;
  const v = isi[kolom.k];
  const set = (x: unknown) => ubah(setelKolom(isi, kolom.k, x));
  const str = typeof v === 'string' || typeof v === 'number' ? String(v) : '';
  switch (kolom.jenis) {
    case 'teks':
      return (
        <Field label={kolom.label} description={kolom.bantuan}>
          <Input size="sm" value={str} maxLength={kolom.maks} placeholder={kolom.contoh} onChange={(e) => set(e.target.value)} />
        </Field>
      );
    case 'paragraf':
      return (
        <Field label={kolom.label} description={kolom.ringan ? (kolom.bantuan ?? 'Bisa **tebal**, *miring*, [tautan](/alamat), dan baris "- " untuk daftar.') : kolom.bantuan}>
          <Textarea rows={kolom.baris ?? 3} value={str} maxLength={kolom.maks} placeholder={kolom.contoh} onChange={(e) => set(e.target.value)} />
        </Field>
      );
    case 'url':
      return (
        <Field label={kolom.label} description={kolom.bantuan}>
          <IsianUrl nilai={str} ubah={set} aksi={k.aksi} contoh={kolom.contoh} />
        </Field>
      );
    case 'gambar':
      return (
        <Field label={kolom.label} description={kolom.bantuan ?? 'Diunggah sebagai berkas publik di Kelola berkas.'}>
          <IsianGambar nilai={str} ubah={set} berkas={k.berkas} catat={k.catat} aplikasi={k.aplikasi} />
        </Field>
      );
    case 'pilihan':
      return (
        <Field label={kolom.label} description={kolom.bantuan}>
          {kolom.tampil === 'daftar' || kolom.opsi.length > 4 ? (
            <Select size="sm" value={str || null} placeholder="Pilih…" onValueChange={(x) => x && set(x)} options={kolom.opsi.map((o) => ({ value: o.v, label: o.label }))} aria-label={kolom.label} />
          ) : (
            <SegmentedControl fullWidth value={str || kolom.opsi[0]!.v} onValueChange={(x) => set(/^\d+$/.test(x) ? Number(x) : x)} options={kolom.opsi.map((o) => ({ value: o.v, label: o.label }))} aria-label={kolom.label} />
          )}
        </Field>
      );
    case 'angka':
      return (
        <Field label={kolom.label} description={kolom.bantuan}>
          <Input
            size="sm"
            type="number"
            inputMode="decimal"
            min={kolom.min}
            max={kolom.max}
            step={kolom.desimal ? 'any' : 1}
            value={str}
            onChange={(e) => {
              const n = e.target.value === '' ? undefined : Number(e.target.value);
              set(n === undefined || Number.isNaN(n) ? undefined : Math.max(kolom.min, Math.min(kolom.max, kolom.desimal ? n : Math.round(n))));
            }}
          />
        </Field>
      );
    case 'saklar':
      return (
        <label className="upl-saklar">
          <Switch size="sm" checked={v === true} onCheckedChange={(c) => set(c)} />
          {kolom.label}
        </label>
      );
    case 'ikon':
      return (
        <Field label={kolom.label}>
          <PilihIkon value={str || 'bintang'} onValueChange={(x) => set(x ?? undefined)} ikon={IKON_PILIH} bisaDihapus={false} aria-label={kolom.label} />
        </Field>
      );
    case 'ilustrasi':
      return (
        <Field label={kolom.label}>
          <Select size="sm" value={str || 'portal'} onValueChange={(x) => x && set(x)} options={ILUSTRASI_PILIHAN.map((value) => ({ value, label: value.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()) }))} aria-label={kolom.label} />
        </Field>
      );
    case 'slot': {
      const opsi = Object.entries(k.slot ?? {});
      return (
        <Field label={kolom.label} description={opsi.length ? k.slot?.[str]?.keterangan : 'Aplikasi ini belum menyediakan bagian data. Blok tidak tampil ke pengunjung.'}>
          <Select size="sm" value={str || null} placeholder="Pilih bagian…" onValueChange={(x) => x && set(x)} options={opsi.map(([value, s]) => ({ value, label: s.label }))} disabled={!opsi.length} aria-label={kolom.label} />
        </Field>
      );
    }
    case 'tombol':
      return <DaftarTombol label={kolom.label} maks={kolom.maks} nilai={Array.isArray(v) ? (v as Record<string, unknown>[]) : []} ubah={set} k={k} />;
    case 'daftar':
      return <DaftarButir kolom={kolom} nilai={Array.isArray(v) ? (v as Record<string, unknown>[]) : []} ubah={set} k={k} />;
  }
}

function geser<T>(a: T[], i: number, ke: number): T[] {
  if (ke < 0 || ke >= a.length) return a;
  const b = a.slice();
  const [x] = b.splice(i, 1);
  b.splice(ke, 0, x!);
  return b;
}

function DaftarButir({ kolom, nilai, ubah, k }: { kolom: Extract<KolomBlok, { jenis: 'daftar' }>; nilai: Record<string, unknown>[]; ubah: (v: unknown) => void; k: KonteksIsian }) {
  const [buka, setBuka] = React.useState<number | null>(nilai.length === 1 ? 0 : null);
  return (
    <fieldset className="upl-daftar">
      <legend>
        {kolom.label} <span>{nilai.length}/{kolom.maks}</span>
      </legend>
      {nilai.length === 0 && <p className="upl-kosong">Belum ada {kolom.butir}.</p>}
      <ol>
        {nilai.map((b, i) => (
          <li key={i} data-buka={dataFlag(buka === i)}>
            <div className="upl-daftar-kepala">
              <button type="button" className="upl-daftar-judul" aria-expanded={buka === i} onClick={() => setBuka(buka === i ? null : i)}>
                <span className="upl-no">{i + 1}</span>
                {kolom.judulButir(b, i)}
              </button>
              <Button size="xs" variant="ghost" aria-label={`Naikkan ${kolom.butir} ${i + 1}`} title="Naikkan" disabled={i === 0} onClick={() => ubah(geser(nilai, i, i - 1))}>
                <ArrowUp />
              </Button>
              <Button size="xs" variant="ghost" aria-label={`Turunkan ${kolom.butir} ${i + 1}`} title="Turunkan" disabled={i === nilai.length - 1} onClick={() => ubah(geser(nilai, i, i + 1))}>
                <ArrowDown />
              </Button>
              <Button size="xs" variant="ghost" aria-label={`Hapus ${kolom.butir} ${i + 1}`} title="Hapus" onClick={() => ubah(nilai.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
            </div>
            {buka === i && (
              <div className="upl-daftar-isi">
                {kolom.kolom.map((kk) => (
                  <Kolom key={kk.k} kolom={kk} isi={b} ubah={(x) => ubah(nilai.map((y, j) => (j === i ? x : y)))} k={k} />
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
      {nilai.length < kolom.maks && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            ubah([...nilai, kolom.baru()]);
            setBuka(nilai.length);
          }}
        >
          <Plus /> Tambah {kolom.butir}
        </Button>
      )}
    </fieldset>
  );
}

const KOLOM_TOMBOL: KolomBlok[] = [
  { k: 'label', jenis: 'teks', label: 'Label', maks: 40 },
  { k: 'url', jenis: 'url', label: 'Tujuan' },
  { k: 'gaya', jenis: 'pilihan', label: 'Gaya', opsi: [{ v: 'utama', label: 'Utama' }, { v: 'garis', label: 'Garis' }, { v: 'aksen', label: 'Aksen' }, { v: 'teks', label: 'Teks' }] },
  { k: 'baru', jenis: 'saklar', label: 'Buka di tab baru', bila: (i) => /^https?:/.test(String(i.url ?? '')) },
];

function DaftarTombol({ label, maks, nilai, ubah, k }: { label: string; maks: number; nilai: Record<string, unknown>[]; ubah: (v: unknown) => void; k: KonteksIsian }) {
  return (
    <DaftarButir
      kolom={{ k: 'tombol', jenis: 'daftar', label, maks, butir: 'tombol', kolom: KOLOM_TOMBOL, judulButir: (b, i) => String(b.label || `Tombol ${i + 1}`), baru: () => ({ label: 'Tombol', url: '', gaya: nilai.length ? 'garis' : 'utama' }) }}
      nilai={nilai}
      ubah={ubah}
      k={k}
    />
  );
}

// ---------------------------------------------------------------- panel gaya

const LATAR: Array<{ v: NonNullable<GayaBlok['latar']>; label: string }> = [
  { v: 'polos', label: 'Polos' },
  { v: 'lembut', label: 'Lembut' },
  { v: 'utama', label: 'Warna utama' },
  { v: 'aksen', label: 'Aksen' },
  { v: 'gelap', label: 'Gelap' },
  { v: 'gambar', label: 'Foto' },
];

function PanelGaya({ blok, ubah, k }: { blok: BlokLanding; ubah: (g: GayaBlok) => void; k: KonteksIsian }) {
  const g = blok.gaya;
  const set = <K extends keyof GayaBlok>(kunci: K, v: GayaBlok[K] | undefined) => {
    const baru = { ...g };
    if (v === undefined || v === '') delete baru[kunci];
    else baru[kunci] = v;
    ubah(baru);
  };
  return (
    <div className="upl-gaya">
      <Field label="Latar">
        <div className="upl-latar" role="radiogroup" aria-label="Latar">
          {LATAR.map((l) => (
            <button key={l.v} type="button" role="radio" aria-checked={(g.latar ?? 'polos') === l.v} data-latar={l.v} onClick={() => set('latar', l.v === 'polos' ? undefined : l.v)}>
              <span aria-hidden />
              {l.label}
            </button>
          ))}
        </div>
      </Field>
      {g.latar === 'gambar' && (
        <Field label="Foto latar" description="Diberi lapisan gelap agar teks tetap terbaca.">
          <IsianGambar nilai={g.latar_gambar ?? ''} ubah={(v) => set('latar_gambar', v)} berkas={k.berkas} catat={k.catat} aplikasi={k.aplikasi} />
        </Field>
      )}
      <Field label="Jarak atas-bawah">
        <SegmentedControl fullWidth value={g.jarak ?? 'normal'} onValueChange={(v) => set('jarak', v === 'normal' ? undefined : v)} options={[{ value: 'tanpa', label: 'Tanpa' }, { value: 'rapat', label: 'Rapat' }, { value: 'normal', label: 'Normal' }, { value: 'lega', label: 'Lega' }]} aria-label="Jarak atas-bawah" />
      </Field>
      <Field label="Lebar isi">
        <SegmentedControl fullWidth value={g.lebar ?? 'normal'} onValueChange={(v) => set('lebar', v === 'normal' ? undefined : v)} options={[{ value: 'sempit', label: 'Sempit' }, { value: 'normal', label: 'Normal' }, { value: 'lebar', label: 'Lebar' }, { value: 'penuh', label: 'Penuh' }]} aria-label="Lebar isi" />
      </Field>
      <Field label="Perataan judul">
        <SegmentedControl fullWidth value={g.rata ?? 'kiri'} onValueChange={(v) => set('rata', v === 'kiri' ? undefined : v)} options={[{ value: 'kiri', label: 'Kiri' }, { value: 'tengah', label: 'Tengah' }]} aria-label="Perataan judul" />
      </Field>
      <Field label="Tampil di layar" description="Bagian yang disembunyikan tampil samar di pratinjau penyunting.">
        <SegmentedControl fullWidth value={g.sembunyi ? (g.sembunyi === 'ponsel' ? 'desktop' : 'ponsel') : 'semua'} onValueChange={(v) => set('sembunyi', v === 'semua' ? undefined : v === 'desktop' ? 'ponsel' : 'desktop')} options={[{ value: 'semua', label: 'Semua' }, { value: 'desktop', label: 'Layar lebar' }, { value: 'ponsel', label: 'Ponsel' }]} aria-label="Tampil di" />
      </Field>
      <div className="upl-dua">
        <Field label="Label di menu atas" description="Kosong = tidak masuk menu.">
          <Input
            size="sm"
            maxLength={30}
            value={g.menu ?? ''}
            onChange={(e) => {
              const menu = e.target.value;
              const baru = { ...g, menu: menu || undefined };
              if (menu && !g.jangkar) baru.jangkar = menu.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || undefined;
              ubah(baru);
            }}
          />
        </Field>
        <Field label="Nama bagian (#)" description="Untuk tautan #nama.">
          <Input size="sm" maxLength={40} value={g.jangkar ?? ''} onChange={(e) => set('jangkar', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') || undefined)} />
        </Field>
      </div>
      <label className="upl-saklar">
        <Switch size="sm" checked={g.animasi !== false} onCheckedChange={(c) => set('animasi', c ? undefined : false)} /> Animasi muncul saat digulir
      </label>
    </div>
  );
}

// ---------------------------------------------------------------- tambah blok, templat, riwayat

function PanelTambah({ open, tutup, tambah }: { open: boolean; tutup: () => void; tambah: (b: BlokLanding) => void }) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && tutup()} title="Tambah blok" description="Blok baru disisipkan setelah blok yang sedang dipilih." size="md">
      <div className="upl-tambah">
        {GRUP_BLOK.map((grup) => (
          <section key={grup}>
            <h3>{grup}</h3>
            <div className="upl-tambah-kisi">
              {URUT_BLOK.filter((t) => SKEMA_BLOK[t].grup === grup).map((t) => {
                const d = SKEMA_BLOK[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      tambah(blokBaru(t));
                      tutup();
                    }}
                  >
                    <d.ikon aria-hidden />
                    <strong>{d.label}</strong>
                    <span>{d.keterangan}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        <section>
          <h3>Siap pakai</h3>
          <div className="upl-tambah-kisi">
            {POTONGAN_LANDING.map((p) => {
              const d = SKEMA_BLOK[p.tipe];
              return (
                <button
                  key={p.kunci}
                  type="button"
                  onClick={() => {
                    tambah(p.buat());
                    tutup();
                  }}
                >
                  <d.ikon aria-hidden />
                  <strong>{p.nama}</strong>
                  <span>{d.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </Sheet>
  );
}

function PanelTemplat({ open, tutup, pakai, aplikasi }: { open: boolean; tutup: () => void; pakai: (d: DokumenLanding, nama: string) => void; aplikasi: string }) {
  const [pilih, setPilih] = React.useState<string | null>(null);
  const t = TEMPLAT_LANDING.find((x) => x.kunci === pilih);
  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && tutup()} title="Templat halaman" description="Ganti seluruh halaman dengan templat siap pakai. Bisa diurungkan sebelum disimpan." size="md">
        <ul className="upl-templat">
          {TEMPLAT_LANDING.map((x) => (
            <li key={x.kunci}>
              <div>
                <strong>
                  {x.nama} {x.aplikasi?.includes(aplikasi) && <Badge variant="primary">Bawaan aplikasi ini</Badge>}
                </strong>
                <p>{x.keterangan}</p>
                <small>{x.buat().blok.length} blok</small>
              </div>
              <Button size="sm" variant="outline" onClick={() => setPilih(x.kunci)}>
                Pakai
              </Button>
            </li>
          ))}
        </ul>
      </Sheet>
      <ConfirmDialog
        open={!!t}
        onOpenChange={(o) => !o && setPilih(null)}
        title={`Pakai templat ${t?.nama ?? ''}?`}
        description="Semua blok di draf diganti dengan isi templat. Anda masih bisa mengurungkannya sebelum menyimpan."
        confirmLabel="Ganti dengan templat"
        tone="warning"
        onConfirm={() => {
          if (t) pakai(normalisasiDokumen(t.buat()), t.nama);
          setPilih(null);
          tutup();
        }}
      />
    </>
  );
}

interface VersiHalaman {
  id: number;
  versi: number;
  aksi: string;
  jumlah_blok: number;
  catatan: string | null;
  oleh: string | null;
  pada: string | null;
}

function PanelRiwayat({ open, tutup, aplikasi, lingkup, halaman, pulihkan, lihat }: { open: boolean; tutup: () => void; aplikasi: string; lingkup?: string; halaman: string; pulihkan: (id: number, versi: number) => Promise<void>; lihat: (id: number) => void }) {
  const q = useSiakadQuery<{ riwayat: VersiHalaman[] }>(['tema-halaman', aplikasi, lingkup ?? '', halaman, 'riwayat'], (s, signal) => s.request({ method: 'GET', path: pathHalaman(aplikasi, halaman, '/riwayat'), query: lingkup ? { lingkup } : undefined }, { signal }), { enabled: open, staleTime: 0 });
  const [sasaran, setSasaran] = React.useState<VersiHalaman | null>(null);
  const daftar = q.data?.riwayat ?? [];
  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && tutup()} title="Riwayat terbitan" description="Pulihkan versi lama ke draf, periksa, lalu terbitkan lagi bila sudah sesuai." size="md">
        {q.loading ? (
          <div className="upl-muat">
            <Spinner aria-label="Memuat riwayat" />
          </div>
        ) : q.error ? (
          <Alert variant="danger" title="Riwayat tidak dapat dimuat">
            {pesanGalat(q.error)}
          </Alert>
        ) : !daftar.length ? (
          <Empty icon={<FileClock />} title="Belum pernah diterbitkan" description="Setiap kali halaman diterbitkan, salinannya tersimpan di sini." />
        ) : (
          <ol className="upl-riwayat">
            {daftar.map((r, i) => (
              <li key={r.id}>
                <div>
                  <strong>
                    Versi {r.versi} {i === 0 && <Badge variant="success">Tampil sekarang</Badge>}
                  </strong>
                  <small>
                    {r.jumlah_blok} blok · {r.oleh ?? '-'} · {r.pada ?? ''}
                  </small>
                  {r.catatan && <p>{r.catatan}</p>}
                </div>
                <div className="upl-riwayat-aksi">
                  <Button size="sm" variant="ghost" onClick={() => lihat(r.id)}>
                    <Eye /> Lihat
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSasaran(r)}>
                    <RotateCcw /> Pulihkan
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Sheet>
      <ConfirmDialog
        open={!!sasaran}
        onOpenChange={(o) => !o && setSasaran(null)}
        title={`Pulihkan versi ${sasaran?.versi ?? ''} ke draf?`}
        description="Draf yang sedang disunting diganti isi versi ini. Pengunjung belum melihat perubahan sampai Anda menerbitkannya."
        confirmLabel="Pulihkan ke draf"
        tone="warning"
        onConfirm={async () => {
          if (sasaran) await pulihkan(sasaran.id, sasaran.versi);
          setSasaran(null);
          tutup();
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------- penyunting

export interface PenyuntingLandingProps {
  aplikasi: string;
  lingkup?: string;
  /** Kode halaman (bawaan beranda). */
  halaman?: string;
  /** Nama aplikasi di judul penyunting. */
  nama?: React.ReactNode;
  /** Kunci templat bawaan bila belum pernah diterbitkan (bawaan = kode aplikasi). */
  bawaan?: string;
  /** Bagian data milik aplikasi (dipilih di blok "Bagian data aplikasi"). */
  slot?: Record<string, SlotLanding>;
  /** Aksi aplikasi untuk tombol (mis. { masuk: { label: 'Masuk SSO', href: '/bff/masuk' } }). */
  aksi?: Record<string, AksiLanding>;
  /** Logo aplikasi untuk blok kaki halaman. */
  merek?: React.ReactNode;
  /** CSS tema draf (buatTema) untuk pratinjau; bawaan tema yang sedang terpasang. */
  cssTema?: string;
  /** Pengguna boleh mengubah (dari useAksesTema). Tanpa hak: hanya pratinjau. */
  boleh?: boolean;
  onTutup?: () => void;
  /** Dipanggil saat status "ada perubahan belum disimpan" berubah (untuk konfirmasi tutup). */
  onBerubah?: (berubah: boolean) => void;
  className?: string;
}

type Panel = 'struktur' | 'pratinjau' | 'properti';

/**
 * Penyunting visual halaman landing (ala Elementor): daftar blok seret-lepas, panel properti per blok (isi & gaya
 * bertoken tema), pratinjau langsung desktop/tablet/ponsel terang/gelap, urungkan/ulangi, simpan draf, terbitkan,
 * riwayat & pulihkan, templat siap pakai. Data di SIAKAD /v1/tema/{aplikasi}/halaman/{halaman}.
 */
export function PenyuntingLanding({ aplikasi, lingkup, halaman = 'beranda', nama, bawaan, slot, aksi, merek, cssTema, boleh = true, onTutup, onBerubah, className }: PenyuntingLandingProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const kunciQ = ['tema-halaman', aplikasi, lingkup ?? '', halaman, 'draf'];
  const q = useSiakadQuery<DataHalamanLanding>(kunciQ, (s, signal) => s.request<DataHalamanLanding>({ method: 'GET', path: pathHalaman(aplikasi, halaman), query: { draf: 1, ...(lingkup ? { lingkup } : {}) } }, { signal }), { staleTime: 0 });
  const [riwayat, setRiwayat] = React.useState(() => mulaiRiwayat({ versi: 1, blok: [] } as DokumenLanding));
  const [dasar, setDasar] = React.useState<{ dok: DokumenLanding; revisi: number; adaDraf: boolean } | null>(null);
  const [versiTerbit, setVersiTerbit] = React.useState(0);
  const [pilih, setPilih] = React.useState<string | null>(null);
  const [layar, setLayar] = React.useState<Layar>(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 'ponsel' : typeof window !== 'undefined' && window.innerWidth < 1024 ? 'tablet' : 'desktop'));
  const [gelap, setGelap] = React.useState(false);
  const [panel, setPanel] = React.useState<Panel>('pratinjau');
  const [tabProp, setTabProp] = React.useState<'isi' | 'gaya'>('isi');
  const [buka, setBuka] = React.useState<null | 'tambah' | 'templat' | 'riwayat' | 'halaman' | 'terbit' | 'buang'>(null);
  const [lihatVersi, setLihatVersi] = React.useState<{ dok: DokumenLanding; versi: number; berkas: Record<string, string> } | null>(null);
  const [proses, setProses] = React.useState<null | 'simpan' | 'terbit'>(null);
  const [catatan, setCatatan] = React.useState('');
  const [berkasLokal, setBerkasLokal] = React.useState<Record<string, string>>({});
  const [seret, setSeret] = React.useState<string | null>(null);
  const [konflik, setKonflik] = React.useState(false);
  const bodyRef = React.useRef<HTMLElement | null>(null);

  const dok = riwayat.kini;
  const berkas = React.useMemo(() => ({ ...(q.data?.berkas ?? {}), ...berkasLokal }), [q.data?.berkas, berkasLokal]);
  const blokPilih = dok.blok.find((b) => b.id === pilih) ?? null;
  const berubah = dasar ? !samaDokumen(dok, dasar.dok) : false;

  // Muat draf (bila ada), isi terbit, atau templat bawaan, sekali per data baru dari server.
  const muat = React.useCallback(
    (d: DataHalamanLanding) => {
      const awal = d.draf ? normalisasiDokumen(d.draf) : d.terbit ? normalisasiDokumen(d.terbit) : landingBawaan(bawaan ?? aplikasi);
      setRiwayat(mulaiRiwayat(awal));
      setDasar({ dok: awal, revisi: d.revisi ?? 0, adaDraf: !!d.draf });
      setVersiTerbit(d.versi ?? 0);
      setPilih((p) => (p && awal.blok.some((b) => b.id === p) ? p : (awal.blok[0]?.id ?? null)));
      setKonflik(false);
    },
    [aplikasi, bawaan],
  );
  const sudahMuat = React.useRef(false);
  React.useEffect(() => {
    if (q.data && !sudahMuat.current) {
      sudahMuat.current = true;
      muat(q.data);
    }
  }, [q.data, muat]);

  const onBerubahRef = React.useRef(onBerubah);
  onBerubahRef.current = onBerubah;
  React.useEffect(() => onBerubahRef.current?.(berubah), [berubah]);

  // Peringatan sebelum menutup tab dengan perubahan belum disimpan.
  React.useEffect(() => {
    if (!berubah) return;
    const f = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', f);
    return () => window.removeEventListener('beforeunload', f);
  }, [berubah]);

  const ubah = React.useCallback((a: AksiDokumen) => setRiwayat((r) => terapkan(r, a)), []);

  // Pintasan papan ketik: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z / Ctrl+Y, Ctrl/Cmd+S.
  const simpanRef = React.useRef<() => void>(() => {});
  React.useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const t = e.key.toLowerCase();
      const diIsian = e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable="true"]');
      if (t === 's') {
        e.preventDefault();
        simpanRef.current();
      } else if (!diIsian && t === 'z') {
        e.preventDefault();
        setRiwayat((r) => (e.shiftKey ? ulangi(r) : urungkan(r)));
      } else if (!diIsian && t === 'y') {
        e.preventDefault();
        setRiwayat(ulangi);
      }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);

  const pilihBlok = React.useCallback((id: string, gulir = false) => {
    setPilih(id);
    setTabProp('isi');
    if (gulir) bodyRef.current?.querySelector(`[data-blok-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const galatSimpan = (e: unknown, judul: string) => {
    const err = e as { status?: number; code?: string };
    if (err?.status === 409) {
      setKonflik(true);
      toast.add({ title: 'Draf sudah diubah orang lain', description: pesanGalat(e), type: 'warning' });
    } else toast.add({ title: judul, description: pesanGalat(e), type: 'error' });
  };

  const simpanDraf = async () => {
    if (!boleh || !dasar || proses) return;
    setProses('simpan');
    try {
      const r = await siakad.request<DataHalamanLanding>({ method: 'POST', path: pathHalaman(aplikasi, halaman, '/draf'), query: lingkup ? { lingkup } : undefined, body: { dokumen: dok, revisi: dasar.revisi } });
      setDasar({ dok, revisi: r.data.revisi ?? dasar.revisi + 1, adaDraf: true });
      toast.add({ title: 'Draf tersimpan', description: 'Pengunjung belum melihat perubahan ini sampai diterbitkan.', type: 'success' });
    } catch (e) {
      galatSimpan(e, 'Draf belum tersimpan');
    } finally {
      setProses(null);
    }
  };
  simpanRef.current = () => void simpanDraf();

  const terbitkan = async () => {
    if (!boleh || !dasar) return;
    setProses('terbit');
    try {
      const r = await siakad.request<DataHalamanLanding>({ method: 'POST', path: pathHalaman(aplikasi, halaman, '/terbit'), query: lingkup ? { lingkup } : undefined, body: { dokumen: dok, revisi: dasar.revisi, catatan: catatan.trim() || undefined } });
      const terbit = r.data.terbit ? normalisasiDokumen(r.data.terbit) : dok;
      setRiwayat((x) => ({ ...x, kini: terbit }));
      setDasar({ dok: terbit, revisi: r.data.revisi ?? dasar.revisi + 1, adaDraf: false });
      setVersiTerbit(r.data.versi);
      setCatatan('');
      invalidateSiakad('tema-halaman');
      toast.add({ title: `Versi ${r.data.versi} terbit`, description: 'Halaman depan baru langsung tampil untuk semua pengunjung.', type: 'success' });
      setBuka(null);
    } catch (e) {
      galatSimpan(e, 'Halaman belum terbit');
    } finally {
      setProses(null);
    }
  };

  const buangDraf = async () => {
    try {
      const r = await siakad.request<DataHalamanLanding>({ method: 'POST', path: pathHalaman(aplikasi, halaman, '/draf/buang'), query: lingkup ? { lingkup } : undefined, body: {} });
      muat(r.data);
      toast.add({ title: 'Draf dibuang', description: r.data.terbit ? `Kembali ke versi ${r.data.versi} yang tampil sekarang.` : 'Kembali ke templat bawaan.', type: 'success' });
    } catch (e) {
      toast.add({ title: 'Draf belum dibuang', description: pesanGalat(e), type: 'error' });
    }
  };

  const muatUlang = async () => {
    try {
      const r = await siakad.request<DataHalamanLanding>({ method: 'GET', path: pathHalaman(aplikasi, halaman), query: { draf: 1, ...(lingkup ? { lingkup } : {}) } });
      muat(r.data);
    } catch (e) {
      toast.add({ title: 'Draf terbaru tidak dapat dimuat', description: pesanGalat(e), type: 'error' });
    }
  };

  const pulihkan = async (id: number, versi: number) => {
    try {
      const r = await siakad.request<DataHalamanLanding>({ method: 'POST', path: pathHalaman(aplikasi, halaman, `/riwayat/${id}/pulihkan`), query: lingkup ? { lingkup } : undefined, body: {} });
      setBerkasLokal((b) => ({ ...b, ...(r.data.berkas ?? {}) }));
      muat(r.data);
      toast.add({ title: `Versi ${versi} dipulihkan ke draf`, description: 'Periksa lalu terbitkan bila sudah sesuai.', type: 'success' });
    } catch (e) {
      toast.add({ title: 'Versi belum dipulihkan', description: pesanGalat(e), type: 'error' });
    }
  };

  const lihat = async (id: number) => {
    try {
      const r = await siakad.request<{ versi: number; dokumen: DokumenLanding; berkas: Record<string, string> }>({ method: 'GET', path: pathHalaman(aplikasi, halaman, `/riwayat/${id}`), query: lingkup ? { lingkup } : undefined });
      setLihatVersi({ dok: normalisasiDokumen(r.data.dokumen), versi: r.data.versi, berkas: r.data.berkas ?? {} });
    } catch (e) {
      toast.add({ title: 'Versi tidak dapat dibuka', description: pesanGalat(e), type: 'error' });
    }
  };

  const k: KonteksIsian = React.useMemo(() => ({ berkas, catat: (id, url) => setBerkasLokal((b) => ({ ...b, [id]: url })), aplikasi, aksi, slot }), [berkas, aplikasi, aksi, slot]);

  if (q.error) return <Alert variant="danger" title="Halaman depan tidak dapat dimuat">{pesanGalat(q.error)}</Alert>;
  if (!q.data || !dasar)
    return (
      <div className="upl-muat">
        <Spinner aria-label="Memuat halaman depan" />
      </div>
    );
  if (!q.data.tersedia) return <Alert variant="warning" title="Pembangun halaman belum aktif">Tabel halaman belum dibuat di server SIAKAD. Minta admin menjalankan <code>php artisan migrate</code>.</Alert>;

  const status = berubah ? (
    <Badge variant="warning" dot>
      Belum disimpan
    </Badge>
  ) : dasar.adaDraf ? (
    <Badge variant="info" dot>
      Draf tersimpan
    </Badge>
  ) : versiTerbit ? (
    <Badge variant="success" dot>
      Versi {versiTerbit} tampil
    </Badge>
  ) : (
    <Badge variant="neutral">Belum pernah terbit</Badge>
  );
  const idx = blokPilih ? dok.blok.indexOf(blokPilih) : -1;

  return (
    <div className={cn('upl', className)} data-panel={panel}>
      {/* ------------------------------------------------ bilah atas */}
      <header className="upl-bilah">
        <div className="upl-bilah-judul">
          <PanelsTopLeft aria-hidden />
          <div>
            <strong>Halaman depan{nama ? ` · ${typeof nama === 'string' ? nama : ''}` : ''}</strong>
            <span>{status}</span>
          </div>
        </div>
        <div className="upl-bilah-tengah">
          <SegmentedControl<Layar> value={layar} onValueChange={setLayar} options={(Object.keys(LAYAR) as Layar[]).map((l) => ({ value: l, label: <span className="upl-sembunyi-sempit">{LAYAR[l].label}</span>, icon: LAYAR[l].ikon, 'aria-label': LAYAR[l].label }))} aria-label="Ukuran layar pratinjau" />
          <Button size="sm" variant="ghost" aria-label={gelap ? 'Pratinjau mode terang' : 'Pratinjau mode gelap'} title={gelap ? 'Mode terang' : 'Mode gelap'} onClick={() => setGelap(!gelap)}>
            {gelap ? <Sun /> : <Moon />}
          </Button>
        </div>
        <div className="upl-bilah-aksi">
          <Button size="sm" variant="ghost" aria-label="Urungkan" title="Urungkan (Ctrl+Z)" disabled={!riwayat.lalu.length} onClick={() => setRiwayat(urungkan)}>
            <Undo2 />
          </Button>
          <Button size="sm" variant="ghost" aria-label="Ulangi" title="Ulangi (Ctrl+Shift+Z)" disabled={!riwayat.nanti.length} onClick={() => setRiwayat(ulangi)}>
            <Redo2 />
          </Button>
          {boleh && (
            <>
              <Button size="sm" variant="ghost" onClick={() => setBuka('templat')}>
                <LayoutTemplate /> <span className="upl-sembunyi-sempit">Templat</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setBuka('riwayat')}>
                <FileClock /> <span className="upl-sembunyi-sempit">Riwayat</span>
              </Button>
              <Button size="sm" variant="outline" loading={proses === 'simpan'} disabled={!berubah || !!proses} onClick={() => void simpanDraf()} title="Simpan draf (Ctrl+S)">
                <Save /> <span className="upl-sembunyi-sempit">Simpan draf</span>
              </Button>
              <Button size="sm" disabled={!!proses || (!berubah && !dasar.adaDraf && !!versiTerbit)} onClick={() => setBuka('terbit')}>
                <Send /> Terbitkan
              </Button>
            </>
          )}
        </div>
        {onTutup && (
          <Button size="sm" variant="ghost" className="upl-tutup" aria-label="Tutup penyunting" title="Tutup" onClick={onTutup}>
            <X />
          </Button>
        )}
      </header>

      {konflik && (
        <Alert variant="warning" title="Draf sudah diubah penyunting lain" className="upl-konflik">
          Simpan Anda ditolak agar perubahan mereka tidak tertimpa.{' '}
          <Button size="xs" variant="outline" onClick={() => void muatUlang()}>
            Muat draf terbaru
          </Button>{' '}
          (perubahan Anda yang belum disimpan akan hilang).
        </Alert>
      )}

      <div className="upl-badan">
        {/* ------------------------------------------------ struktur */}
        <aside className="upl-struktur" aria-label="Struktur halaman">
          <div className="upl-panel-kepala">
            <strong>Blok</strong>
            <span>{dok.blok.length}/40</span>
          </div>
          {dok.blok.length === 0 ? (
            <Empty icon={<PanelsTopLeft />} title="Halaman kosong" description="Tambah blok atau pakai templat." />
          ) : (
            <ol className="upl-daftar-blok">
              {dok.blok.map((b, i) => {
                const d = SKEMA_BLOK[b.tipe];
                return (
                  <li
                    key={b.id}
                    data-pilih={dataFlag(b.id === pilih)}
                    data-seret={dataFlag(seret === b.id)}
                    draggable={boleh}
                    onDragStart={(e) => {
                      setSeret(b.id);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', b.id);
                    }}
                    onDragEnd={() => setSeret(null)}
                    onDragOver={(e) => {
                      if (!seret || seret === b.id) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData('text/plain') || seret;
                      if (id) ubah({ t: 'pindah', id, ke: i });
                      setSeret(null);
                    }}
                  >
                    <span className="upl-pegangan" aria-hidden title="Seret untuk mengurutkan">
                      <GripVertical />
                    </span>
                    <button
                      type="button"
                      className="upl-blok-tombol"
                      aria-current={b.id === pilih ? 'true' : undefined}
                      onClick={() => {
                        pilihBlok(b.id, true);
                        setPanel('properti');
                      }}
                      onKeyDown={(e) => {
                        if (!boleh || !e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
                        e.preventDefault();
                        ubah({ t: 'geser', id: b.id, arah: e.key === 'ArrowUp' ? -1 : 1 });
                      }}
                      title="Alt+↑/↓ untuk memindah"
                    >
                      <d.ikon aria-hidden />
                      <span>
                        <strong>{judulBlok(b)}</strong>
                        <small>
                          {d.label}
                          {b.gaya.sembunyi ? ` · hanya ${b.gaya.sembunyi === 'ponsel' ? 'layar lebar' : 'ponsel'}` : ''}
                          {b.gaya.menu ? ` · menu "${b.gaya.menu}"` : ''}
                        </small>
                      </span>
                    </button>
                    {boleh && (
                      <span className="upl-blok-aksi">
                        <Button size="xs" variant="ghost" aria-label={`Naikkan ${judulBlok(b)}`} title="Naikkan" disabled={i === 0} onClick={() => ubah({ t: 'geser', id: b.id, arah: -1 })}>
                          <ArrowUp />
                        </Button>
                        <Button size="xs" variant="ghost" aria-label={`Turunkan ${judulBlok(b)}`} title="Turunkan" disabled={i === dok.blok.length - 1} onClick={() => ubah({ t: 'geser', id: b.id, arah: 1 })}>
                          <ArrowDown />
                        </Button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          {boleh && (
            <div className="upl-struktur-kaki">
              <Button size="sm" disabled={dok.blok.length >= 40} onClick={() => setBuka('tambah')}>
                <Plus /> Tambah blok
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setBuka('halaman')}>
                <Settings2 /> Judul halaman
              </Button>
              {dasar.adaDraf && (
                <Button size="sm" variant="ghost" onClick={() => setBuka('buang')}>
                  <Trash2 /> Buang draf
                </Button>
              )}
            </div>
          )}
        </aside>

        {/* ------------------------------------------------ kanvas */}
        <main className="upl-kanvas" aria-label="Pratinjau">
          <BingkaiPratinjau lebar={LAYAR[layar].lebar} gelap={gelap} cssTema={cssTema} onBody={(b) => (bodyRef.current = b)} judul={`Pratinjau ${LAYAR[layar].label}`}>
            <HalamanLanding dokumen={dok} berkas={berkas} slot={slot} aksi={aksi} merek={merek} penyedia={PENYEDIA_SIAKAD} pratinjau terpilih={pilih} onPilih={(id) => { pilihBlok(id); setPanel('properti'); }} />
          </BingkaiPratinjau>
        </main>

        {/* ------------------------------------------------ properti */}
        <aside className="upl-properti" aria-label="Properti blok">
          {blokPilih ? (
            <>
              <div className="upl-panel-kepala">
                <span className="upl-properti-judul">
                  {React.createElement(SKEMA_BLOK[blokPilih.tipe].ikon, { 'aria-hidden': true })}
                  <strong>{SKEMA_BLOK[blokPilih.tipe].label}</strong>
                </span>
                {boleh && (
                  <span className="upl-blok-aksi">
                    <Button size="xs" variant="ghost" aria-label="Gandakan blok" title="Gandakan" disabled={dok.blok.length >= 40} onClick={() => ubah({ t: 'duplikat', id: blokPilih.id })}>
                      <Copy />
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      aria-label={blokPilih.gaya.sembunyi ? 'Tampilkan di semua layar' : 'Sembunyikan di ponsel'}
                      title={blokPilih.gaya.sembunyi ? 'Tampilkan di semua layar' : 'Sembunyikan di ponsel'}
                      onClick={() => {
                        const g = { ...blokPilih.gaya };
                        if (g.sembunyi) delete g.sembunyi;
                        else g.sembunyi = 'ponsel';
                        ubah({ t: 'gaya', id: blokPilih.id, gaya: g });
                      }}
                    >
                      {blokPilih.gaya.sembunyi ? <Eye /> : <EyeOff />}
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      aria-label="Hapus blok"
                      title="Hapus (bisa diurungkan)"
                      onClick={() => {
                        const lanjut = dok.blok[idx + 1]?.id ?? dok.blok[idx - 1]?.id ?? null;
                        ubah({ t: 'hapus', id: blokPilih.id });
                        setPilih(lanjut);
                        toast.add({ title: 'Blok dihapus', description: 'Tekan Urungkan (Ctrl+Z) untuk mengembalikan.', type: 'info' });
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </span>
                )}
              </div>
              <Tabs<'isi' | 'gaya'> variant="underline" value={tabProp} onValueChange={setTabProp} items={[{ value: 'isi', label: 'Isi', icon: <CircleDot /> }, { value: 'gaya', label: 'Gaya', icon: <SlidersHorizontal /> }]} />
              <fieldset className="upl-properti-isi" disabled={!boleh}>
                {tabProp === 'isi' ? (
                  SKEMA_BLOK[blokPilih.tipe].kolom.map((kolom) => <Kolom key={`${blokPilih.id}-${kolom.k}`} kolom={kolom} isi={blokPilih.isi} ubah={(isi) => ubah({ t: 'isi', id: blokPilih.id, isi })} k={k} />)
                ) : (
                  <PanelGaya blok={blokPilih} ubah={(gaya) => ubah({ t: 'gaya', id: blokPilih.id, gaya })} k={k} />
                )}
              </fieldset>
            </>
          ) : (
            <Empty icon={<SlidersHorizontal />} title="Pilih blok" description="Klik blok di pratinjau atau di daftar untuk mengubah isi dan gayanya." />
          )}
        </aside>
      </div>

      {/* ------------------------------------------------ navigasi panel di layar sempit */}
      <nav className="upl-tab-sempit" aria-label="Panel penyunting">
        <SegmentedControl<Panel> fullWidth value={panel} onValueChange={setPanel} options={[{ value: 'struktur', label: 'Blok' }, { value: 'pratinjau', label: 'Pratinjau' }, { value: 'properti', label: 'Properti' }]} aria-label="Panel penyunting" />
      </nav>

      <PanelTambah
        open={buka === 'tambah'}
        tutup={() => setBuka(null)}
        tambah={(b) => {
          ubah({ t: 'tambah', blok: b, setelah: pilih });
          pilihBlok(b.id);
          setTimeout(() => bodyRef.current?.querySelector(`[data-blok-id="${b.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
        }}
      />
      <PanelTemplat
        open={buka === 'templat'}
        tutup={() => setBuka(null)}
        aplikasi={aplikasi}
        pakai={(d, nm) => {
          ubah({ t: 'ganti', dokumen: d });
          setPilih(d.blok[0]?.id ?? null);
          toast.add({ title: `Templat ${nm} dipasang`, description: 'Simpan draf atau terbitkan bila sudah sesuai. Ctrl+Z untuk mengurungkan.', type: 'success' });
        }}
      />
      <PanelRiwayat open={buka === 'riwayat'} tutup={() => setBuka(null)} aplikasi={aplikasi} lingkup={lingkup} halaman={halaman} pulihkan={pulihkan} lihat={(id) => void lihat(id)} />
      <Sheet open={buka === 'halaman'} onOpenChange={(o) => !o && setBuka(null)} title="Judul halaman" description="Tampil di tab peramban dan hasil mesin pencari." size="sm">
        <div className="upl-halaman-form">
          <Field label="Judul" description="Maks. 120 karakter.">
            <Input value={dok.halaman?.judul ?? ''} maxLength={120} placeholder={templatLanding(bawaan ?? aplikasi).buat().halaman?.judul ?? 'Judul halaman'} onChange={(e) => ubah({ t: 'halaman', halaman: { ...dok.halaman, judul: e.target.value || undefined } })} />
          </Field>
          <Field label="Deskripsi" description="Satu-dua kalimat, maks. 300 karakter.">
            <Textarea rows={3} maxLength={300} value={dok.halaman?.deskripsi ?? ''} onChange={(e) => ubah({ t: 'halaman', halaman: { ...dok.halaman, deskripsi: e.target.value || undefined } })} />
          </Field>
        </div>
      </Sheet>
      <Dialog
        open={buka === 'terbit'}
        onOpenChange={(o) => !o && setBuka(null)}
        title="Terbitkan halaman depan?"
        description={`Halaman ini langsung tampil untuk semua pengunjung ${typeof nama === 'string' ? nama : aplikasi}. Versi yang tampil sekarang tetap tersimpan di riwayat.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setBuka(null)}>
              Batal
            </Button>
            <Button loading={proses === 'terbit'} onClick={() => void terbitkan()}>
              <Send /> Terbitkan sekarang
            </Button>
          </>
        }
      >
        <Field label="Catatan perubahan" optional description="Membantu mengenali versi ini di riwayat.">
          <Textarea rows={2} maxLength={255} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="mis. jadwal semester genap dan FAQ baru" />
        </Field>
      </Dialog>
      <ConfirmDialog
        open={buka === 'buang'}
        onOpenChange={(o) => !o && setBuka(null)}
        title="Buang draf?"
        description="Semua perubahan yang belum diterbitkan dihapus. Halaman yang tampil ke pengunjung tidak berubah."
        confirmLabel="Buang draf"
        onConfirm={async () => {
          await buangDraf();
          setBuka(null);
        }}
      />
      <Dialog open={!!lihatVersi} onOpenChange={(o) => !o && setLihatVersi(null)} title={`Versi ${lihatVersi?.versi ?? ''}`} description="Pratinjau saja. Pulihkan dari panel Riwayat untuk menyuntingnya." size="full">
        {lihatVersi && (
          <BingkaiPratinjau lebar={LAYAR[layar].lebar} gelap={gelap} cssTema={cssTema} className="upl-bingkai-versi" judul={`Versi ${lihatVersi.versi}`}>
            <HalamanLanding dokumen={lihatVersi.dok} berkas={lihatVersi.berkas} slot={slot} aksi={aksi} merek={merek} penyedia={PENYEDIA_SIAKAD} pratinjau />
          </BingkaiPratinjau>
        )}
      </Dialog>
    </div>
  );
}

/** Kartu ringkas "Halaman depan" untuk PengaturanTema: status terbit dan tombol membuka penyunting layar penuh. */
export function KartuHalamanDepan({ aplikasi, lingkup, nama, boleh, buka }: { aplikasi: string; lingkup?: string; nama?: string; boleh: boolean; buka: () => void }) {
  const q = useSiakadQuery<DataHalamanLanding>(['tema-halaman', aplikasi, lingkup ?? '', 'beranda'], (s, signal) => s.request<DataHalamanLanding>({ method: 'GET', path: pathHalaman(aplikasi), query: lingkup ? { lingkup } : undefined, public: true }, { signal, maxRetries: 0 }), { staleTime: 30_000 });
  const d = q.data;
  return (
    <div className="upl-kartu">
      <div className="upl-kartu-teks">
        <span className="u-label">Halaman depan</span>
        <p>
          Susun landing page {nama ?? aplikasi} dari blok siap pakai: hero, fitur, angka, langkah, berita, FAQ, testimoni, kontak, dan lainnya. Pratinjau desktop, tablet, dan ponsel sebelum diterbitkan.
        </p>
        <small>
          {q.loading ? 'Memuat status…' : q.error ? 'Status belum dapat dibaca.' : d?.versi ? `Versi ${d.versi} tampil${d.terbit_oleh ? `, diterbitkan ${d.terbit_oleh}` : ''}${d.terbit_pada ? ` (${d.terbit_pada})` : ''}.` : 'Belum pernah diterbitkan: pengunjung melihat templat bawaan.'}
        </small>
      </div>
      <Button size="sm" variant={boleh ? 'primary' : 'outline'} onClick={buka}>
        <PanelsTopLeft /> {boleh ? 'Sunting halaman depan' : 'Lihat halaman depan'}
      </Button>
    </div>
  );
}

