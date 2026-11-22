import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataTable } from '../src/components/data-table';

type B = { id: string; nama: string; aktif: boolean };
const rows: B[] = [{ id: '1', nama: 'Satu', aktif: true }, { id: '2', nama: 'Dua', aktif: false }];

describe('DataTable: rowActions kosong', () => {
  it('tombol aksi hanya tampil pada baris yang punya aksi', () => {
    const h = renderToStaticMarkup(
      <DataTable<B>
        columns={[{ key: 'nama', header: 'Nama' }]}
        rows={rows}
        rowKey={(b) => b.id}
        rowActions={(b) => (b.aktif ? [{ label: 'Cabut', onSelect: () => {} }] : [])}
      />,
    );
    expect(h.split('aria-label="Aksi baris"').length - 1).toBe(1);
  });
});
