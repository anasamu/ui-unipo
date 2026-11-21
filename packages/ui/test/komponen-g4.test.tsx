import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { IsianAngka, IsianJam, IsianRupiah, IsianTanggalWaktu } from '../src/components/isian-angka';
import { MultiPilih } from '../src/components/multi-pilih';
import { BilahAksi, MenuAksiBaris } from '../src/components/aksi';
import { PilihIkon, PilihWarna, SwitchBaris } from '../src/components/pilih-tampilan';

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

describe('render komponen G4 (SSR, tanpa DOM)', () => {
  it('IsianRupiah: awalan Rp, nilai berformat, terbilang, inputmode angka', () => {
    const h = html(<IsianRupiah value={25000000} aria-label="Dana" />);
    expect(h).toContain('>Rp<');
    expect(h).toContain('value="25.000.000"');
    expect(h).toContain('inputMode="numeric"');
    expect(h).toContain('Dua puluh lima juta rupiah');
    expect(h).toContain('data-align="end"');
  });
  it('IsianAngka: galat luar tampil sebagai alert dan aria-invalid', () => {
    const h = html(<IsianAngka value={3} satuan="SKS" galat="Paling banyak 24." aria-label="SKS" />);
    expect(h).toContain('role="alert"');
    expect(h).toContain('aria-invalid="true"');
    expect(h).toContain('SKS');
  });
  it('IsianAngka hanya-baca & memuat', () => {
    expect(html(<IsianAngka value={1} readOnly />)).toContain('readOnly=""');
    expect(html(<IsianAngka value={1} memuat />)).toContain('u-isian-kerangka');
  });
  it('IsianJam & IsianTanggalWaktu', () => {
    expect(html(<IsianJam value="08:30" aria-label="Mulai" />)).toContain('value="08:30"');
    const h = html(<IsianTanggalWaktu value="2026-11-22T08:30" name="mulai" aria-label="Mulai ujian" kalenderAkademik={false} />);
    expect(h).toContain('role="group"');
    expect(h).toContain('aria-label="Mulai ujian: jam"');
    expect(h).toContain('value="2026-11-22T08:30"');
  });
  it('MultiPilih: chip berlabel + tombol hapus aksesibel; hanya-baca tanpa input', () => {
    const items = [{ id: 'a', n: 'Siti Aminah' }, { id: 'b', n: 'Budi' }];
    const h = html(<MultiPilih items={items} value={[items[0]!]} itemKey={(i) => i.id} itemToString={(i) => i.n} aria-label="Anggota" maks={3} />);
    expect(h).toContain('Siti Aminah');
    expect(h).toContain('aria-label="Hapus Siti Aminah"');
    expect(h).toContain('1 dari maks 3 dipilih');
    const ro = html(<MultiPilih items={items} value={[]} readOnly itemKey={(i) => i.id} itemToString={(i) => i.n} />);
    expect(ro).toContain('Belum ada pilihan');
    expect(ro).not.toContain('<input');
  });
  it('BilahAksi: utama paling akhir, alasan nonaktif, menu lipat ponsel', () => {
    const h = html(
      <BilahAksi
        aksi={[
          { kunci: 'ajukan', label: 'Ajukan proposal', nada: 'utama' },
          { kunci: 'hapus', label: 'Hapus', nada: 'bahaya', nonaktif: true, alasan: 'Sudah diajukan' },
          { kunci: 'unduh', label: 'Unduh PDF' },
        ]}
      />,
    );
    expect(h.indexOf('Unduh PDF')).toBeLessThan(h.indexOf('Ajukan proposal'));
    expect(h).toContain('aria-label="Hapus: Sudah diajukan"');
    expect(h).toContain('aria-label="Aksi lainnya"');
  });
  it('MenuAksiBaris: label menyebut nama baris; kosong bila semua disembunyikan', () => {
    expect(html(<MenuAksiBaris nama="Siti Aminah" aksi={[{ kunci: 'ubah', label: 'Ubah' }]} />)).toContain('aria-label="Aksi untuk Siti Aminah"');
    expect(html(<MenuAksiBaris aksi={[{ kunci: 'ubah', label: 'Ubah', sembunyi: true }]} />)).toBe('');
  });
  it('SwitchBaris, PilihWarna, PilihIkon', () => {
    const s = html(<SwitchBaris label="Kirim notifikasi" keterangan="Mahasiswa menerima email." disabled alasan="Diatur oleh BAAK" />);
    expect(s).toContain('Diatur oleh BAAK');
    expect(s).toContain('aria-describedby');
    const w = html(<PilihWarna value="success" />);
    expect(w).toContain('role="radiogroup"');
    expect(w).toContain('aria-checked="true"');
    expect(html(<PilihIkon value="Wallet" readOnly aria-label="Ikon menu" />)).toContain('Ikon menu: Dompet');
  });
});
