import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Tekan, ariaTerpilih, kunciTekan, propsKlikWadah, propsTekan } from '../src/components/tekan';

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

/** Tiruan event papan ketik: sasaran = elemen itu sendiri kecuali diberi `sasaran`. */
function tekanKunci(props: Record<string, unknown>, key: string, sasaran?: object) {
  const el = { click: vi.fn(() => (props.onClick as (e: unknown) => void)?.({ preventDefault: vi.fn() })) };
  const e = { key, target: sasaran ?? el, currentTarget: el, defaultPrevented: false, preventDefault: vi.fn(() => (e.defaultPrevented = true)) };
  (props.onKeyDown as (e: unknown) => void)(e);
  return { e, el };
}

describe('Tekan: elemen semantik', () => {
  it('bawaan <button type="button"> dengan kelas u-tekan dan bentuk', () => {
    const h = html(<Tekan bentuk="kartu">Kelas</Tekan>);
    expect(h).toMatch(/^<button[^>]*type="button"/);
    expect(h).toContain('class="u-tekan"');
    expect(h).toContain('data-bentuk="kartu"');
  });
  it('href → <a href> tanpa role tambahan; target _blank diberi rel aman', () => {
    const h = html(
      <Tekan href="/krs" target="_blank">
        KRS
      </Tekan>,
    );
    expect(h).toMatch(/^<a[^>]*href="\/krs"/);
    expect(h).not.toContain('role=');
    expect(h).toContain('rel="noopener noreferrer"');
    expect(h).not.toContain('type=');
  });
  it('kelas pemanggil digabung dan atribut data milik pemanggil tidak tertimpa', () => {
    const h = html(
      <Tekan className="u-ob-chip" data-terpilih="">
        Chip
      </Tekan>,
    );
    expect(h).toContain('class="u-tekan u-ob-chip"');
    expect(h).toContain('data-terpilih=""');
  });
  it('elemen div memakai role button + tabindex 0', () => {
    const h = html(<Tekan elemen="div">Kartu berisi menu</Tekan>);
    expect(h).toMatch(/^<div[^>]*role="button"/);
    expect(h).toContain('tabindex="0"');
  });
});

describe('Tekan: status terpilih, kini, nonaktif', () => {
  it('terpilih → aria-pressed di tombol', () => {
    expect(html(<Tekan terpilih>Semester 3</Tekan>)).toContain('aria-pressed="true"');
    expect(html(<Tekan terpilih={false}>Semester 3</Tekan>)).toContain('aria-pressed="false"');
    expect(html(<Tekan>Semester 3</Tekan>)).not.toContain('aria-pressed');
  });
  it('terpilih mengikuti peran: checkbox → aria-checked, option/treeitem → aria-selected', () => {
    expect(ariaTerpilih('checkbox', true)).toEqual({ 'aria-checked': true });
    expect(ariaTerpilih('treeitem', false)).toEqual({ 'aria-selected': false });
    expect(ariaTerpilih('link', true)).toEqual({});
    expect(html(<Tekan elemen="span" role="checkbox" terpilih>Pilih</Tekan>)).toContain('aria-checked="true"');
  });
  it('kini → aria-current', () => {
    const h = html(
      <Tekan href="/krs" kini="page">
        KRS
      </Tekan>,
    );
    expect(h).toContain('aria-current="page"');
    expect(html(<Tekan kini>Langkah 2</Tekan>)).toContain('aria-current="true"');
  });
  it('nonaktif: <button disabled>; <a> kehilangan href, aria-disabled, keluar dari urutan Tab', () => {
    expect(html(<Tekan disabled>X</Tekan>)).toMatch(/disabled=""/);
    const a = html(
      <Tekan href="/x" disabled>
        X
      </Tekan>,
    );
    expect(a).not.toContain('href=');
    expect(a).toContain('aria-disabled="true"');
    expect(a).toContain('tabindex="-1"');
    expect(a).toContain('role="button"');
  });
});

describe('Tekan: papan ketik (Enter/Space)', () => {
  it('kunciTekan hanya Enter dan Space', () => {
    expect(['Enter', ' ', 'Spacebar'].every(kunciTekan)).toBe(true);
    expect(['a', 'Tab', 'Escape', 'ArrowDown'].some(kunciTekan)).toBe(false);
  });
  it('button asli: tidak menambah penangan (Enter/Space bawaan peramban)', () => {
    const p = propsTekan({ elemen: 'button' });
    expect(p.onKeyDown).toBeUndefined();
    expect(p.type).toBe('button');
  });
  it('elemen div: Enter dan Space mengklik sekali, Space tidak menggulir', () => {
    for (const key of ['Enter', ' ']) {
      const onClick = vi.fn();
      const p = propsTekan({ elemen: 'div', onClick });
      const { e, el } = tekanKunci(p, key);
      expect(el.click).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(e.preventDefault).toHaveBeenCalled();
    }
  });
  it('kunci lain tidak mengaktifkan', () => {
    const onClick = vi.fn();
    const { el } = tekanKunci(propsTekan({ elemen: 'div', onClick }), 'a');
    expect(el.click).not.toHaveBeenCalled();
  });
  it('tombol yang ditekan di elemen anak (mis. isian di dalam kartu) diabaikan', () => {
    const onClick = vi.fn();
    const { el } = tekanKunci(propsTekan({ elemen: 'div', onClick }), ' ', { anak: true });
    expect(el.click).not.toHaveBeenCalled();
  });
  it('nonaktif: Enter/Space dan klik tidak memanggil onClick', () => {
    const onClick = vi.fn();
    const p = propsTekan({ elemen: 'div', onClick, disabled: true });
    tekanKunci(p, 'Enter');
    (p.onClick as (e: unknown) => void)({ preventDefault: vi.fn() });
    expect(onClick).not.toHaveBeenCalled();
    expect(p.tabIndex).toBe(-1);
  });
  it('tautan: Enter dibiarkan ke peramban, Space mengklik', () => {
    const onClick = vi.fn();
    const p = propsTekan({ elemen: 'a', href: '/krs', onClick });
    const enter = tekanKunci(p, 'Enter');
    expect(enter.el.click).not.toHaveBeenCalled();
    expect(enter.e.preventDefault).not.toHaveBeenCalled();
    const spasi = tekanKunci(p, ' ');
    expect(spasi.el.click).toHaveBeenCalledTimes(1);
  });
  it('onKeyDown pemanggil dijalankan lebih dulu dan bisa membatalkan', () => {
    const onClick = vi.fn();
    const p = propsTekan({ elemen: 'div', onClick, onKeyDown: (e) => e.preventDefault() });
    const { el } = tekanKunci(p, 'Enter');
    expect(el.click).not.toHaveBeenCalled();
  });
});

describe('propsKlikWadah: baris tabel / butir daftar yang bisa diklik', () => {
  it('tanpa onClick: tidak menambah apa pun (baris biasa tidak jadi henti Tab)', () => {
    expect(propsKlikWadah(undefined)).toEqual({});
    expect(propsKlikWadah(false)).toEqual({});
  });
  it('dengan onClick: dapat difokus, tanpa role tambahan (peran <tr>/listitem dipertahankan)', () => {
    const p = propsKlikWadah(() => {});
    expect(p.tabIndex).toBe(0);
    expect(p.role).toBeUndefined();
    expect(html(<table><tbody><tr {...p}><td>A</td></tr></tbody></table>)).toMatch(/<tr tabindex="0">/);
  });
  it('Enter/Space pada baris memanggil onClick; dari tombol di dalam baris diabaikan', () => {
    const onClick = vi.fn();
    const p = propsKlikWadah(onClick) as Record<string, unknown>;
    tekanKunci(p, 'Enter');
    tekanKunci(p, ' ');
    expect(onClick).toHaveBeenCalledTimes(2);
    tekanKunci(p, 'Enter', { tombolMenu: true });
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
