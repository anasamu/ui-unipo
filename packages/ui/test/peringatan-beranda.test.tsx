import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PeringatanBeranda, statusTenggat, urutPeringatan, type JenisPeringatan } from '../src/siakad/peringatan-beranda';

const kini = new Date('2026-11-22T09:00:00');
const jenis: JenisPeringatan[] = [
  { key: 'krs', judul: 'Pengisian KRS rendah', tingkat: 'warning', butir: [{ key: 'k', judul: '55% mengisi', tenggat: '2026-11-30' }] },
  { key: 'kosong', judul: 'Tidak ada', tingkat: 'danger', butir: [] },
  {
    key: 'akred-segera', judul: 'Akreditasi segera habis', satuan: 'prodi', tingkat: 'warning',
    butir: [{ key: 'b', judul: 'Sistem Informasi', tenggat: '2027-02-01' }, { key: 'a', judul: 'Informatika', tenggat: '2026-12-10' }],
  },
  { key: 'akred-habis', judul: 'Akreditasi habis', satuan: 'prodi', tingkat: 'danger', butir: [{ key: 'c', judul: 'Arsitektur', tenggat: '2026-01-01' }] },
  { key: 'info', judul: 'Info', tingkat: 'info', butir: [{ key: 'i', judul: 'x' }] },
];

describe('PeringatanBeranda', () => {
  it('urut: tingkat dulu, lalu tenggat terdekat; jenis kosong dibuang; butir urut tenggat', () => {
    const u = urutPeringatan(jenis);
    expect(u.map((j) => j.key)).toEqual(['akred-habis', 'krs', 'akred-segera', 'info']);
    expect(u[2].butir.map((b) => b.key)).toEqual(['a', 'b']);
  });

  it('status tenggat dalam bahasa awam', () => {
    expect(statusTenggat('2026-11-20', kini)).toBe('Lewat 2 hari');
    expect(statusTenggat('2026-11-22', kini)).toBe('Hari ini');
    expect(statusTenggat('2026-12-22', kini)).toBe('Sisa 30 hari');
    expect(statusTenggat(null, kini)).toBeNull();
  });

  it('maks 3 jenis tampil, hitungan per jenis, dan Lihat semua bila terpotong', () => {
    const h = renderToStaticMarkup(<PeringatanBeranda jenis={jenis} kini={kini} />);
    expect((h.match(/class="u-peringatan-kartu"/g) ?? []).length).toBe(3);
    expect(h).toContain('Akreditasi habis');
    expect(h).toContain('2 prodi');
    expect(h).toContain('Lihat semua (5)');
    expect(h).not.toContain('>Info<');
  });

  it('kartu bergeser bertanda slide berposisi dan wilayah status untuk pembaca layar', () => {
    const h = renderToStaticMarkup(<PeringatanBeranda jenis={jenis} kini={kini} />);
    expect(h).toContain('aria-roledescription="slide"');
    expect(h).toContain('aria-label="1 dari 3: Akreditasi habis"');
    expect(h).toContain('role="status"');
    expect(h).not.toContain('<button type="button" class="u-peringatan-lagi"');
  });

  it('tanpa peringatan merender `kosong`', () => {
    expect(renderToStaticMarkup(<PeringatanBeranda jenis={[]} kosong={<p>Aman</p>} />)).toBe('<p>Aman</p>');
  });
});
