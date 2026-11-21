import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Combobox } from '../src/components/select';
import { SUMBER_ENTITAS } from '../src/siakad/pilih';
import { CariDosen } from '../src/siakad/cari';

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

describe('dosen/pegawai nonaktif: pemilih hanya aktif, nilai lama berlencana', () => {
  it('sumber dosen: lencana Nonaktif + status di keterangan hanya untuk dosen tidak aktif', () => {
    const d = SUMBER_ENTITAS.dosen;
    expect(d.path).toBe('/v1/dosen');
    expect(d.lencana({ nidn: '1', aktif: true, status_aktif: 'A' })).toBeNull();
    expect(d.lencana({ nidn: '2', aktif: false, status_aktif: 'K', status_label: 'KELUAR' })).toBe('Nonaktif');
    expect(d.meta({ nidn: '2', aktif: false, status_label: 'KELUAR' })).toContain('Keluar');
    // Respons lama tanpa `aktif`: kode selain A tetap dianggap nonaktif.
    expect(d.lencana({ nidn: '3', status_aktif: 'P' })).toBe('Nonaktif');
  });

  it('sumber pegawai: status SDM tidak bekerja berlencana, cuti/tugas belajar tidak', () => {
    const p = SUMBER_ENTITAS.pegawai;
    expect(p.lencana({ id: 1, status_aktif: 'aktif' })).toBeNull();
    expect(p.lencana({ id: 2, status_aktif: 'tugas_belajar' })).toBeNull();
    expect(p.lencana({ id: 3, status_aktif: 'keluar' })).toBe('Nonaktif');
    expect(p.meta({ id: 3, status_aktif: 'keluar' })).toContain('Keluar');
  });

  it('Combobox: lencana butir terpilih tampil di isian', () => {
    const items = [{ id: 'a', n: 'Dosen Lama' }];
    const h = html(
      <Combobox items={items} value={items[0]} itemKey={(i) => i.id} itemToString={(i) => i.n} lencana={() => <span className="tes-lencana">Nonaktif</span>} aria-label="Dosen" />,
    );
    expect(h).toContain('data-lencana');
    expect(h).toContain('tes-lencana');
    const tanpa = html(<Combobox items={items} value={items[0]} itemKey={(i) => i.id} itemToString={(i) => i.n} lencana={() => null} aria-label="Dosen" />);
    expect(tanpa).not.toContain('data-lencana');
  });

  it('CariDosen: nilai tersimpan dosen nonaktif tampil dengan lencana Nonaktif', () => {
    const h = html(<CariDosen value={{ nidn: 'UJI1', nama: 'Dosen Pensiun', aktif: false, status_label: 'PENSIUN' }} load={async () => []} aria-label="Dosen" />);
    expect(h).toContain('Nonaktif');
    expect(h).toContain('title="Pensiun"');
    const aktif = html(<CariDosen value={{ nidn: 'UJI2', nama: 'Dosen Aktif', aktif: true }} load={async () => []} aria-label="Dosen" />);
    expect(aktif).not.toContain('Nonaktif');
  });
});
