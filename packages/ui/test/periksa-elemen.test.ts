import { describe, expect, it } from 'vitest';
// @ts-expect-error modul CLI .mjs tanpa deklarasi tipe
import { bandingDasar, hitungDasar, periksaTeks } from '../cli/periksa-elemen.mjs';

type P = { aturan: string; baris: number; pesan: string };
const aturan = (teks: string, opsi = {}) => (periksaTeks(teks, 'src/halaman/X.tsx', opsi).pelanggaran as P[]).map((p) => p.aturan);

describe('periksa-elemen', () => {
  it('mengenali elemen bawaan dengan aturan paling khusus', () => {
    expect(aturan('<Input type="date" value={a} />')).toEqual(['input-tanggal']);
    expect(aturan('<Input type="datetime-local" />')).toEqual(['input-waktu']);
    expect(aturan('<Input onChange={(e) => set(e.target.value)} type="number" />')).toEqual(['input-angka']);
    expect(aturan('<input type="file" hidden ref={r} />')).toEqual(['input-berkas']);
    expect(aturan('<input type="checkbox" checked />')).toEqual(['pilihan-bawaan']);
    expect(aturan('<input value={q} />')).toEqual(['input-bawaan']);
    expect(aturan('<select value={x}>')).toEqual(['select-bawaan']);
    expect(aturan('<textarea />')).toEqual(['textarea-bawaan']);
    expect(aturan('<table className="x">')).toEqual(['tabel-bawaan']);
    expect(aturan('<Table>')).toEqual(['tabel-primitif']);
    expect(aturan('<button type="button">')).toEqual(['tombol-bawaan']);
    expect(aturan('if (!window.confirm("Hapus?")) return;')).toEqual(['dialog-peramban']);
    expect(aturan('const a = prompt("x")')).toEqual(['dialog-peramban']);
  });
  it('tidak salah tangkap komponen unipo-ui, input tersembunyi, komentar, atau metode bernama sama', () => {
    expect(aturan('<Input value={q} /><Button>OK</Button><DataTable rows={r} /><Select options={o} />')).toEqual([]);
    expect(aturan('<input type="hidden" name="a" value="1" />')).toEqual([]);
    expect(aturan('// dulu <table> di sini\n/* <select> */')).toEqual([]);
    expect(aturan('dialog.confirm(); onConfirm(); konfirmasi();')).toEqual([]);
    expect(aturan('<TableContainer>')).toEqual([]);
  });
  it('pengecualian tertulis wajib beralasan', () => {
    expect(aturan('{/* unipo-ui-izinkan tabel-bawaan: tata letak cetak kwitansi */}\n<table>')).toEqual([]);
    expect(aturan('<table> {/* unipo-ui-izinkan tabel-bawaan: cetak */}')).toEqual([]);
    const tanpa = periksaTeks('// unipo-ui-izinkan tabel-bawaan\n<table>', 'x').pelanggaran as P[];
    expect(tanpa[0]?.pesan).toContain('tanpa alasan');
    expect(aturan('<table>', { pengecualian: [{ berkas: 'src/halaman/X.tsx', aturan: 'tabel-bawaan', alasan: 'cetak' }] })).toEqual([]);
    expect(aturan('<table>', { pengecualian: [{ berkas: 'src/halaman/Y.tsx', aturan: 'tabel-bawaan', alasan: 'cetak' }] })).toEqual(['tabel-bawaan']);
  });
  it('nomor baris tepat untuk tag berbaris banyak', () => {
    const r = periksaTeks('a\nb\n<Input\n  value={x}\n  type="number"\n/>', 'x').pelanggaran as P[];
    expect(r).toMatchObject([{ aturan: 'input-angka', baris: 3 }]);
  });
  it('dasar migrasi: hanya gagal bila bertambah', () => {
    const kini = hitungDasar({ 'a.tsx': { pelanggaran: [{ aturan: 'tabel-bawaan' }, { aturan: 'tabel-bawaan' }], pengecualian: [] } });
    expect(kini).toEqual({ 'a.tsx#tabel-bawaan': 2 });
    expect(bandingDasar({ 'a.tsx#tabel-bawaan': 2 }, kini)).toEqual([]);
    expect(bandingDasar({ 'a.tsx#tabel-bawaan': 1 }, kini)).toEqual([{ kunci: 'a.tsx#tabel-bawaan', dasar: 1, kini: 2 }]);
  });
});
