// @vitest-environment happy-dom
import * as React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { Combobox, InfoPilihanKosong, Select, type BuatPilihan, type SelectOption } from '../src/components/select';
import { Pilihan } from '../src/components/formulir';
import { Button } from '../src/components/actions';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// Interaksi DOM (buka daftar, panel, tutup) bisa lambat di mesin sibuk; jangan gagal karena batas 5 detik bawaan.
vi.setConfig({ testTimeout: 30_000 });

let root: Root | null = null;
let wadah: HTMLDivElement | null = null;

beforeAll(() => {
  // happy-dom: animasi Base UI selesai seketika.
  if (!('getAnimations' in Element.prototype)) (Element.prototype as unknown as { getAnimations: () => [] }).getAnimations = () => [];
});

afterEach(async () => {
  await act(async () => root?.unmount());
  wadah?.remove();
  root = null;
  wadah = null;
  document.body.innerHTML = '';
});

async function pasang(el: React.ReactElement) {
  wadah = document.createElement('div');
  document.body.appendChild(wadah);
  root = createRoot(wadah);
  await act(async () => root!.render(el));
}

const tunggu = async (ms = 30) => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
};

async function klik(el: Element | null | undefined) {
  if (!el) throw new Error('elemen tidak ada');
  await act(async () => {
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }));
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerType: 'mouse' }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
    (el as HTMLElement).click();
  });
  await tunggu();
}

async function tekan(el: Element, key: string) {
  await act(async () => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
  });
  await tunggu();
}

const teks = () => document.body.textContent ?? '';
const tombolBuat = () => document.querySelector('[data-buat]');

type Opsi = SelectOption<string>;
const buatSiklus = (boleh: boolean, extra: Partial<BuatPilihan<Opsi | string>> = {}): BuatPilihan<Opsi | string> => ({
  label: 'Mulai siklus baru',
  nama: 'siklus mutu',
  boleh,
  pengelola: 'LPM',
  panel: ({ selesai }) => (
    <div>
      <p>Formulir siklus</p>
      <Button onClick={() => selesai({ value: '27', label: 'Siklus 2027' })}>Simpan siklus</Button>
    </div>
  ),
  ...extra,
});

function SelectSiklus({ buat, opsi = [], memuat, onPilih }: { buat: BuatPilihan<Opsi | string>; opsi?: Opsi[]; memuat?: boolean; onPilih?: (v: string | null) => void }) {
  const [v, setV] = React.useState<string | null>(null);
  return (
    <Select
      id="siklus"
      aria-label="Siklus SPMI"
      options={opsi}
      value={v}
      memuat={memuat}
      onValueChange={(x) => {
        setV(x);
        onPilih?.(x);
      }}
      buat={buat}
    />
  );
}

describe('Select: pilihan kosong', () => {
  it('berhak: daftar kosong menampilkan tombol buat menonjol; panel samping; data baru langsung terpilih; fokus kembali ke pemilih', async () => {
    const segarkan = vi.fn();
    const onPilih = vi.fn();
    await pasang(<SelectSiklus buat={buatSiklus(true, { segarkan })} onPilih={onPilih} />);
    const pemicu = document.getElementById('siklus')!;
    expect(pemicu.textContent).toContain('Belum ada siklus mutu');
    await klik(pemicu);
    expect(teks()).toContain('Belum ada siklus mutu.');
    expect(teks()).not.toContain('dikelola');
    const b = tombolBuat();
    expect(b?.textContent).toContain('Mulai siklus baru');
    expect(b?.hasAttribute('data-menonjol')).toBe(true);
    await klik(b);
    expect(teks()).toContain('Formulir siklus');
    const simpan = [...document.querySelectorAll('button')].find((x) => x.textContent?.includes('Simpan siklus'));
    await klik(simpan);
    await tunggu(80);
    expect(onPilih).toHaveBeenCalledWith('27');
    expect(segarkan).toHaveBeenCalledTimes(1);
    expect(document.getElementById('siklus')!.textContent).toContain('Siklus 2027');
    expect(teks()).not.toContain('Formulir siklus');
    expect(document.activeElement).toBe(document.getElementById('siklus'));
  });

  it('tidak berhak: tanpa tombol, teks awam berisi unit pengelola', async () => {
    await pasang(<SelectSiklus buat={buatSiklus(false)} />);
    await klik(document.getElementById('siklus'));
    expect(teks()).toContain('Belum ada siklus mutu.');
    expect(teks()).toContain('Data ini dikelola LPM.');
    expect(tombolBuat()).toBeNull();
    expect(teks()).not.toContain('Mulai siklus baru');
  });

  it('memuat bukan kosong: tidak ada teks kosong maupun tombol', async () => {
    await pasang(<SelectSiklus buat={buatSiklus(true)} memuat />);
    expect(document.getElementById('siklus')!.textContent).toContain('Memuat');
    await klik(document.getElementById('siklus'));
    expect(teks()).not.toContain('Belum ada');
    expect(tombolBuat()).toBeNull();
  });

  it('ada data: tombol buat di akhir daftar, tidak menonjol', async () => {
    await pasang(<SelectSiklus buat={buatSiklus(true)} opsi={[{ value: '26', label: 'Siklus 2026' }]} />);
    await klik(document.getElementById('siklus'));
    const butir = [...document.querySelectorAll('[role="option"]')];
    expect(butir.at(-1)?.hasAttribute('data-buat')).toBe(true);
    expect(butir.at(-1)?.hasAttribute('data-menonjol')).toBe(false);
    expect(teks()).not.toContain('Belum ada');
  });
});

describe('InfoPilihanKosong', () => {
  it('berhak: teks + tombol; tidak berhak: teks pengelola tanpa tombol; memuat/galat: tidak tampil', () => {
    const b = renderToStaticMarkup(<InfoPilihanKosong buat={buatSiklus(true)}>Buat siklus tahun ini agar unit bisa mulai mengisi.</InfoPilihanKosong>);
    expect(b).toContain('Belum ada siklus mutu.');
    expect(b).toContain('Mulai siklus baru');
    expect(b).toContain('agar unit bisa mulai mengisi');
    const t = renderToStaticMarkup(<InfoPilihanKosong buat={buatSiklus(false)} letak="samping" />);
    expect(t).toContain('Data ini dikelola LPM.');
    expect(t).not.toContain('Mulai siklus baru');
    expect(t).toContain('data-letak="samping"');
    expect(renderToStaticMarkup(<InfoPilihanKosong buat={buatSiklus(true)} memuat />)).toBe('');
    expect(renderToStaticMarkup(<InfoPilihanKosong buat={buatSiklus(true)} galat={new Error('x')} />)).toBe('');
    expect(renderToStaticMarkup(<InfoPilihanKosong buat={buatSiklus(true)} kosong={false} />)).toBe('');
  });

  it('tombol kotak info membuka panel yang sama; data baru dikirim ke pemilih dan fokus pindah ke pemilih', async () => {
    function Contoh() {
      const [opsi, setOpsi] = React.useState<Opsi[]>([]);
      const [v, setV] = React.useState<string | null>(null);
      const buat = buatSiklus(true);
      return (
        <>
          <Select id="siklus" aria-label="Siklus" options={opsi} value={v} onValueChange={setV} buat={buat} />
          <InfoPilihanKosong
            buat={buat}
            kosong={!opsi.length}
            fokusKe="siklus"
            onDibuat={(o) => {
              const x = o as Opsi;
              setOpsi([x]);
              setV(x.value);
            }}
          />
        </>
      );
    }
    await pasang(<Contoh />);
    const tombol = [...document.querySelectorAll('.u-info-pilihan-kosong button')][0];
    expect(tombol?.textContent).toContain('Mulai siklus baru');
    await klik(tombol);
    await klik([...document.querySelectorAll('button')].find((x) => x.textContent?.includes('Simpan siklus')));
    await tunggu(80);
    expect(document.querySelector('.u-info-pilihan-kosong')).toBeNull();
    expect(document.getElementById('siklus')!.textContent).toContain('Siklus 2027');
    expect(document.activeElement).toBe(document.getElementById('siklus'));
  });
});

type Instansi = { id: string; nama: string };
describe('Combobox: pilihan kosong dengan keyboard', () => {
  it('butir buat (role option) memakai kata yang dicari; data baru terpilih, fokus kembali ke isian', async () => {
    const onValueChange = vi.fn();
    const onBuat = vi.fn(async (k: string) => ({ id: 'baru', nama: k || 'Instansi baru' }));
    await pasang(
      <Combobox<Instansi>
        id="instansi"
        aria-label="Instansi"
        items={[{ id: 'a', nama: 'Bank SulutGo' }]}
        itemKey={(i) => i.id}
        itemToString={(i) => i.nama}
        onValueChange={onValueChange}
        buat={{ boleh: true, nama: 'instansi', label: (k) => (k ? `Tambah instansi “${k}”` : 'Tambah instansi'), onBuat }}
      />,
    );
    const isian = document.getElementById('instansi') as HTMLInputElement;
    await act(async () => isian.focus());
    // Keyboard membuka daftar; butir buat adalah option sehingga terjangkau panah atas/bawah.
    await tekan(isian, 'ArrowDown');
    expect(isian.getAttribute('aria-expanded')).toBe('true');
    expect(tombolBuat()?.getAttribute('role')).toBe('option');
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      set.call(isian, 'PT Maju');
      isian.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await tunggu(50);
    expect(teks()).toContain('Tidak ada hasil.');
    expect(tombolBuat()?.textContent).toContain('Tambah instansi “PT Maju”');
    await klik(tombolBuat());
    await tunggu(50);
    expect(onBuat).toHaveBeenCalledWith('PT Maju');
    expect(onValueChange).toHaveBeenCalledWith({ id: 'baru', nama: 'PT Maju' });
    expect(isian.value).toBe('PT Maju');
    expect(document.activeElement).toBe(isian);
  });

  it('Escape menutup panel tanpa memilih apa pun; fokus kembali ke pemilih', async () => {
    const onPilih = vi.fn();
    await pasang(<SelectSiklus buat={buatSiklus(true)} onPilih={onPilih} />);
    const pemicu = document.getElementById('siklus')!;
    await klik(pemicu);
    await klik(tombolBuat());
    expect(teks()).toContain('Formulir siklus');
    await tekan(document.activeElement ?? document.body, 'Escape');
    await tunggu(80);
    expect(teks()).not.toContain('Formulir siklus');
    expect(onPilih).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(pemicu);
  });

  it('tidak berhak: hasil kosong menampilkan pengelola tanpa butir buat', async () => {
    await pasang(<Combobox<Instansi> id="i2" aria-label="Instansi" items={[]} itemKey={(i) => i.id} itemToString={(i) => i.nama} buat={{ boleh: false, nama: 'kategori surat', pengelola: 'Bagian Umum' }} />);
    const isian = document.getElementById('i2') as HTMLInputElement;
    await act(async () => isian.focus());
    await tekan(isian, 'ArrowDown');
    expect(teks()).toContain('Belum ada kategori surat.');
    expect(teks()).toContain('Data ini dikelola Bagian Umum.');
    expect(tombolBuat()).toBeNull();
  });

  it('bentuk lama `tambah` tetap berfungsi (diubah ke buat)', () => {
    const h = renderToStaticMarkup(<Combobox<Instansi> aria-label="x" items={[]} itemKey={(i) => i.id} itemToString={(i) => i.nama} tambah={{ onTambah: () => null }} />);
    expect(h).toContain('aria-label="x"');
  });
});

describe('Pilihan: daftar kosong dengan buat selalu jadi daftar', () => {
  it('tanpa opsi + buat: bukan deret tombol kosong', () => {
    const h = renderToStaticMarkup(<Pilihan options={[]} value={null} aria-label="Kategori" buat={{ boleh: false, nama: 'kategori', pengelola: 'BAAK' }} />);
    expect(h).toContain('u-select-trigger');
    expect(h).toContain('Belum ada kategori');
  });
});
