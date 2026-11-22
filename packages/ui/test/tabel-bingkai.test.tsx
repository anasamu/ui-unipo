import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataTable } from '../src/components/data-table';
import { FilterBar } from '../src/components/filter';

type R = { id: string; nama: string };
const rows: R[] = [{ id: '1', nama: 'Ani' }, { id: '2', nama: 'Budi' }];
const cols = [{ key: 'nama', header: 'Nama', sortable: true }];
const html = (el: React.ReactElement) => renderToStaticMarkup(el);

describe('DataTable: bingkai dan bilah alat sebaris (jarak tabel)', () => {
  it('bawaan berbingkai; saringan (toolbar) dan kerapatan/Kolom/CSV dalam satu bilah alat', () => {
    const h = html(
      <DataTable<R>
        columns={cols}
        rows={rows}
        rowKey={(r) => r.id}
        exportCsv="uji"
        toolbar={<FilterBar value={{}} onValueChange={() => {}} fields={[{ key: 's', label: 'Status', type: 'select', options: [{ value: 'a', label: 'Aktif' }] }]} />}
      />,
    );
    expect(h).toMatch(/class="u-data-table"[^>]*data-framed=""/);
    const bilah = h.slice(h.indexOf('class="u-dt-toolbar"'), h.indexOf('u-table-wrap'));
    expect(bilah).toContain('u-filter-bar');
    expect(bilah).toContain('aria-label="Ubah kerapatan baris"');
    expect(bilah).toContain('aria-label="Pilih kolom"');
    expect(bilah).toContain('Unduh CSV');
    // Hanya satu bilah alat, tidak ada bilah saringan terpisah di luar.
    expect(h.split('u-dt-toolbar"').length - 1).toBe(1);
  });
  it('wadah gulir = region bernama yang bisa difokus papan ketik', () => {
    const tanpa = html(<DataTable<R> columns={cols} rows={rows} rowKey={(r) => r.id} />);
    expect(tanpa).toMatch(/class="u-table-wrap u-dt-scroll" role="region" tabindex="0" aria-label="Tabel data"/);
    const dengan = html(<DataTable<R> columns={cols} rows={rows} rowKey={(r) => r.id} caption="Daftar mahasiswa" />);
    const id = /aria-labelledby="([^"]+)"/.exec(dengan)?.[1];
    expect(id).toBeTruthy();
    expect(dengan).toContain(`<caption id="${id}"`);
  });
  it('framed={false} melepas bingkai luar', () => {
    expect(html(<DataTable<R> columns={cols} rows={rows} rowKey={(r) => r.id} framed={false} />)).not.toContain('data-framed');
  });
  it('SCSS: bilah alat & kaki halaman berjarak dalam token, tabel di dalam bingkai rata tepi, Card menjadi bingkai', () => {
    const scss = readFileSync(new URL('../scss/components/_data-table.scss', import.meta.url), 'utf8');
    expect(scss).toMatch(/@mixin dt-isi-berbingkai\s*\{[^]*?> \.u-dt-toolbar\s*\{\s*padding: var\(--u-dt-inset-y\) var\(--u-dt-inset-x\)/);
    // Bingkai luar hanya untuk tabel yang berdiri sendiri: di dalam Card/Sheet/Dialog/panel/pembungkus `border` tidak dobel.
    expect(scss).toMatch(/\.u-data-table\[data-framed\]:not\(\[data-cards\]\):not\(:is\(#\{\$dt-wadah\}\) \*\)/);
    expect(scss).toMatch(/\$dt-wadah: '\.u-card, \.u-sheet, \.u-dialog, \.u-panel/);
    expect(scss).toMatch(/> \.u-dt-footer\s*\{\s*padding: var\(--u-dt-inset-y\) var\(--u-dt-inset-x\)/);
    expect(scss).toMatch(/--u-dt-inset-x: var\(--u-space-4\)/);
    expect(scss).toMatch(/\.u-card > \.u-data-table\[data-framed\]/);
    expect(scss).toMatch(/\.u-dt-toolbar\s*\{\s*display: flex;\s*flex-wrap: wrap;/);
  });
});
