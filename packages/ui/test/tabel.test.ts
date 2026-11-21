import { describe, expect, it } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ambilSemuaHalaman, keAngka, namaBerkasCsv, nilaiCsv, opsiPerHalaman, rataFormat, selCsv, susunCsv, teksFormat } from '../src/lib/tabel';
import { toCsv, type DataColumn } from '../src/components/data-table';
import { Select } from '../src/components/select';

/** Server tiruan: `total` baris, per_page dibatasi `maks`, dengan atau tanpa meta. */
function server(total: number, { maks = 100, meta = true } = {}) {
  const panggilan: Array<{ page: number; per: number }> = [];
  const ambil = async (page: number, per: number) => {
    panggilan.push({ page, per });
    const p = Math.min(per, maks);
    const data = Array.from({ length: Math.max(0, Math.min(p, total - (page - 1) * p)) }, (_, i) => ({ id: (page - 1) * p + i + 1 }));
    return { data, meta: meta ? { page, per_page: p, total, total_pages: Math.ceil(total / p) } : undefined };
  };
  return { ambil, panggilan };
}

describe('ambilSemuaHalaman (ekspor semua data dari server)', () => {
  it('mengambil semua halaman sesuai total, bukan hanya halaman tampil', async () => {
    const s = server(250);
    const progres: number[] = [];
    const h = await ambilSemuaHalaman({ ambil: s.ambil, signal: new AbortController().signal, onProgress: (n) => progres.push(n) });
    expect(h.rows).toHaveLength(250);
    expect(h.rows.at(-1)).toEqual({ id: 250 });
    expect(h.terpotong).toBe(false);
    expect(h.total).toBe(250);
    expect(s.panggilan.map((x) => x.page)).toEqual([1, 2, 3]);
    expect(progres).toEqual([100, 200, 250]);
  });

  it('mengikuti per_page yang dibatasi server (minta 100, diberi 50)', async () => {
    const s = server(120, { maks: 50 });
    const h = await ambilSemuaHalaman({ ambil: s.ambil, signal: new AbortController().signal });
    expect(h.rows).toHaveLength(120);
    expect(s.panggilan).toHaveLength(3);
  });

  it('tanpa meta: berhenti saat halaman tidak penuh', async () => {
    const s = server(230, { meta: false });
    const h = await ambilSemuaHalaman({ ambil: s.ambil, signal: new AbortController().signal });
    expect(h.rows).toHaveLength(230);
    expect(h.total).toBeNull();
  });

  it('memotong di batas aman dan menandai terpotong', async () => {
    const s = server(1000);
    const h = await ambilSemuaHalaman({ ambil: s.ambil, signal: new AbortController().signal, batas: 250 });
    expect(h.rows).toHaveLength(250);
    expect(h.terpotong).toBe(true);
    expect(s.panggilan).toHaveLength(3);
  });

  it('bisa dibatalkan', async () => {
    const ac = new AbortController();
    const s = server(500);
    const p = ambilSemuaHalaman({ ambil: s.ambil, signal: ac.signal, onProgress: () => ac.abort() });
    await expect(p).rejects.toThrow(/Dibatalkan/);
    expect(s.panggilan).toHaveLength(1);
  });

  it('kosong: satu panggilan, nol baris', async () => {
    const s = server(0);
    const h = await ambilSemuaHalaman({ ambil: s.ambil, signal: new AbortController().signal });
    expect(h.rows).toEqual([]);
    expect(s.panggilan).toHaveLength(1);
  });
});

describe('CSV', () => {
  it('menetralkan injeksi rumus tetapi tidak mengubah angka negatif', () => {
    expect(selCsv('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(selCsv('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(selCsv('-150000')).toBe('-150000');
    expect(selCsv(-150000)).toBe('-150000');
    expect(selCsv('+62 812')).toBe("'+62 812");
    expect(selCsv('a;b')).toBe('"a;b"');
    expect(selCsv(null)).toBe('');
  });

  it('uang tetap angka mentah, status memakai label', () => {
    expect(nilaiCsv('1500000', 'rupiah')).toBe(1500000);
    expect(nilaiCsv('lunas', 'status', { lunas: { label: 'Lunas', tone: 'success' } })).toBe('Lunas');
    expect(nilaiCsv('2026-11-21', 'tanggal')).toBe('2026-11-21');
  });

  it('toCsv memakai label kolom dan format', () => {
    type R = { nama: string; jumlah: number; status: string };
    const cols: DataColumn<R>[] = [
      { key: 'nama', header: 'Nama' },
      { key: 'jumlah', header: 'Jumlah', format: 'rupiah' },
      { key: 'status', header: 'Status', format: 'status', status: { lunas: 'Lunas' } },
    ];
    expect(toCsv(cols, [{ nama: 'Ani', jumlah: 2500000, status: 'lunas' }])).toBe('Nama,Jumlah,Status\r\nAni,2500000,Lunas');
    expect(susunCsv(['A'], [])).toBe('A');
  });

  it('nama berkas: .csv dan penanda sebagian', () => {
    expect(namaBerkasCsv('Tagihan')).toBe('Tagihan.csv');
    expect(namaBerkasCsv('Tagihan.csv')).toBe('Tagihan.csv');
    expect(namaBerkasCsv('Tagihan', { diambil: 10000, total: 23456 })).toBe('Tagihan-sebagian-10000-dari-23456.csv');
    expect(namaBerkasCsv('a/b')).toBe('a-b.csv');
  });
});

describe('format kolom', () => {
  it('angka rata kanan', () => {
    expect(rataFormat('rupiah')).toBe('end');
    expect(rataFormat('angka')).toBe('end');
    expect(rataFormat('persen')).toBe('end');
    expect(rataFormat('tanggal')).toBeUndefined();
    expect(rataFormat(undefined)).toBeUndefined();
  });
  it('teks berformat Indonesia', () => {
    expect(teksFormat(1500000, 'rupiah').replace(/\s/g, ' ')).toBe('Rp 1.500.000');
    expect(teksFormat('12345', 'angka')).toBe('12.345');
    expect(teksFormat('2026-11-21', 'tanggal')).toBe('21 Nov 2026');
    expect(teksFormat(null, 'rupiah')).toBe('–');
    expect(teksFormat('ditolak', 'status', { ditolak: { label: 'Ditolak', tone: 'danger' } })).toBe('Ditolak');
    expect(teksFormat('x', 'status')).toBe('x');
    expect(keAngka('12.5')).toBe(12.5);
    expect(keAngka('12a')).toBeNull();
  });
  it('pilihan baris per halaman memuat nilai yang sedang dipakai', () => {
    expect(opsiPerHalaman([10, 20, 50, 100], 25)).toEqual([10, 20, 25, 50, 100]);
    expect(opsiPerHalaman([10, 20, 50, 100], 20)).toEqual([10, 20, 50, 100]);
  });
});

describe('Select', () => {
  const html = (el: React.ReactElement) => renderToStaticMarkup(el);
  it("nilai '' tanpa opsi '' menampilkan placeholder, bukan penanda 'kosong'", () => {
    const out = html(React.createElement(Select<string>, { value: '', placeholder: 'Pilih jenis cuti', options: [{ value: 'tahunan', label: 'Cuti tahunan' }] }));
    expect(out).not.toContain('kosong');
    expect(out).toContain('Pilih jenis cuti');
  });
  it("defaultValue '' tanpa opsi '' juga menampilkan placeholder", () => {
    const out = html(React.createElement(Select<string>, { defaultValue: '', placeholder: 'Pilih…', options: [{ value: 'a', label: 'A' }] }));
    expect(out).not.toContain('kosong');
    expect(out).toContain('Pilih…');
  });
  it("opsi bernilai '' (mis. 'Semua status') tetap tampil labelnya", () => {
    const out = html(React.createElement(Select<string>, { value: '', options: [{ value: '', label: 'Semua status' }, { value: 'a', label: 'Aktif' }] }));
    expect(out).toContain('<span class="u-select-value">Semua status</span>');
  });
});

describe('Select di formulir', () => {
  it("opsi '' mengirim nilai formulir '' (bukan penanda internal)", () => {
    const out = renderToStaticMarkup(React.createElement(Select<string>, { name: 'status', value: '', options: [{ value: '', label: 'Semua status' }, { value: 'a', label: 'Aktif' }] }));
    expect(out).toContain('name="status" value=""');
    // Input bawaan Base UI tanpa `name` sehingga penanda internal tidak ikut terkirim.
    expect(out.match(/<input[^>]*name=[^>]*>/g)).toEqual(['<input type="hidden" name="status" value=""/>']);
  });
});
