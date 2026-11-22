import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Tabs, tataTab } from '../src/components/display';
import { Select } from '../src/components/select';
import { TabMenuHalaman } from '../src/components/tab-halaman';
import { AkarTingkatTab, PenyediaTingkatTab, useTingkatTab } from '../src/lib/tingkat-tab';
import type { HasilMenu } from '../src/components/menu-aplikasi';

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const SUB = [
  { value: 'menunggu', label: 'Menunggu', count: 0, content: <p>isi menunggu</p> },
  { value: 'belum', label: 'Belum isi', count: 3, content: <p>isi belum</p> },
  { value: 'disetujui', label: 'Disetujui', count: 42, content: <p>isi disetujui</p> },
];
/** Hitung tablist dan orientasinya di HTML. */
const daftarTab = (h: string) => [...h.matchAll(/<div[^>]*role="tablist"[^>]*>/g)].map((m) => m[0]);

describe('tataTab: aturan orientasi otomatis', () => {
  const akar = { tingkat: 0, dalamVertikal: false };
  const t1 = { tingkat: 1, dalamVertikal: false };
  it('tingkat pertama horizontal; tingkat kedua berisi = bersarang (vertikal)', () => {
    expect(tataTab('auto', akar, true)).toBe('horizontal');
    expect(tataTab(undefined, t1, true)).toBe('bersarang');
  });
  it('tab tanpa isi (hanya penyaring) tetap horizontal walau bersarang', () => {
    expect(tataTab('auto', t1, false)).toBe('horizontal');
  });
  it('di dalam tab yang sudah vertikal tidak vertikal lagi', () => {
    expect(tataTab('auto', { tingkat: 2, dalamVertikal: true }, true)).toBe('horizontal');
  });
  it('override orientation selalu menang', () => {
    expect(tataTab('horizontal', t1, true)).toBe('horizontal');
    expect(tataTab('vertical', akar, true)).toBe('vertical');
  });
});

describe('Tabs: deteksi sarang lewat konteks (SSR)', () => {
  it('tab tunggal: horizontal, tanpa wadah samping', () => {
    const h = html(<Tabs items={SUB} />);
    expect(h).not.toContain('u-tabs-wadah');
    expect(h).not.toContain('data-bersarang');
    expect(daftarTab(h)[0]).not.toContain('aria-orientation');
  });

  it('tab di dalam panel tab lain: vertikal, aria-orientation vertical, lencana jumlah, tanpa pilihan tarik-turun', () => {
    const h = html(
      <Tabs
        items={[
          { value: 'persetujuan', label: 'Persetujuan', content: <Tabs aria-label="Status KRS" items={SUB} /> },
          { value: 'atas-nama', label: 'Isi atas nama', content: null },
        ]}
      />,
    );
    const [luar, dalam] = daftarTab(h);
    expect(luar).not.toContain('aria-orientation');
    expect(dalam).toContain('aria-orientation="vertical"');
    expect(dalam).toContain('data-variant="side"');
    expect(h).toContain('data-bersarang=""');
    expect(h).toContain('u-tabs-wadah');
    // Jumlah 0 tetap tampil (redup), jumlah lain apa adanya.
    expect(h).toMatch(/data-kosong=""[^>]*>0</);
    expect(h).toContain('>42<');
    // Tab bersarang di layar sempit memakai deret gulir, bukan Select.
    expect(h).not.toContain('u-tabs-pilih');
  });

  it('isi lewat children juga dihitung (PersetujuanKrs: alat + tabel sebagai children)', () => {
    const h = html(
      <PenyediaTingkatTab>
        <Tabs items={SUB.map(({ content: _c, ...t }) => t)}>
          <table />
        </Tabs>
      </PenyediaTingkatTab>,
    );
    expect(daftarTab(h)[0]).toContain('aria-orientation="vertical"');
  });

  it('tab penyaring tanpa isi di dalam panel tetap horizontal', () => {
    const h = html(
      <PenyediaTingkatTab>
        <Tabs items={SUB.map(({ content: _c, ...t }) => t)} />
      </PenyediaTingkatTab>,
    );
    expect(daftarTab(h)[0]).not.toContain('aria-orientation');
    expect(h).not.toContain('data-bersarang');
  });

  it('tingkat ketiga (di dalam tab vertikal) kembali horizontal', () => {
    const h = html(
      <Tabs
        items={[
          {
            value: 'a',
            label: 'A',
            content: (
              <Tabs
                items={[
                  { value: 'x', label: 'X', content: <Tabs items={SUB} /> },
                  { value: 'y', label: 'Y', content: null },
                  { value: 'z', label: 'Z', content: null },
                ]}
              />
            ),
          },
        ]}
      />,
    );
    const t = daftarTab(h);
    expect(t).toHaveLength(3);
    expect(t[1]).toContain('aria-orientation="vertical"');
    expect(t[2]).not.toContain('aria-orientation');
  });

  it('override orientation="horizontal" pada tab bersarang', () => {
    const h = html(<Tabs items={[{ value: 'a', label: 'A', content: <Tabs orientation="horizontal" items={SUB} /> }]} />);
    expect(daftarTab(h)[1]).not.toContain('aria-orientation');
    expect(h).not.toContain('data-bersarang');
  });

  it('vertical eksplisit di tingkat pertama tetap memakai pilihan tarik-turun untuk layar sempit', () => {
    const h = html(<Tabs orientation="vertical" items={SUB} />);
    expect(daftarTab(h)[0]).toContain('aria-orientation="vertical"');
    expect(h).toContain('u-tabs-pilih');
    expect(h).not.toContain('data-bersarang');
  });

  it('dialog/panel samping mengembalikan tingkat ke 0', () => {
    let dicatat = -1;
    function Catat() {
      dicatat = useTingkatTab().tingkat;
      return null;
    }
    html(
      <PenyediaTingkatTab>
        <AkarTingkatTab>
          <Catat />
        </AkarTingkatTab>
      </PenyediaTingkatTab>,
    );
    expect(dicatat).toBe(0);
  });
});

describe('Aturan Anas 2026-11-22: 2 tab tetap horizontal; di panel samping horizontal → tarik-turun bila tidak muat', () => {
  const DUA = SUB.slice(0, 2);
  it('tataTab: bersarang hanya bila lebih dari 2 tab', () => {
    const t1 = { tingkat: 1, dalamVertikal: false };
    expect(tataTab('auto', t1, true, 2)).toBe('horizontal');
    expect(tataTab('auto', t1, true, 1)).toBe('horizontal');
    expect(tataTab('auto', t1, true, 3)).toBe('bersarang');
    // Orientasi eksplisit tetap menang.
    expect(tataTab('vertical', t1, true, 2)).toBe('vertical');
  });
  it('sub-tab berisi 2 tab di dalam panel tab: horizontal, tanpa wadah samping', () => {
    const h = html(<Tabs items={[{ value: 'a', label: 'A', content: <Tabs aria-label="Antrean" items={DUA} /> }]} />);
    const [, dalam] = daftarTab(h);
    expect(dalam).not.toContain('aria-orientation');
    expect(h).not.toContain('data-bersarang');
    expect(h).not.toContain('u-tabs-wadah');
  });
  it('tataTab: di dalam panel samping selalu "panel" (horizontal), di tingkat mana pun', () => {
    expect(tataTab('auto', { tingkat: 0, dalamVertikal: false, dalamPanel: true }, true, 5)).toBe('panel');
    expect(tataTab(undefined, { tingkat: 1, dalamVertikal: false, dalamPanel: true }, true, 8)).toBe('panel');
    expect(tataTab('vertical', { tingkat: 1, dalamVertikal: false, dalamPanel: true }, true, 8)).toBe('vertical');
  });
  it('tataTab: orientation="horizontal" eksplisit di panel samping juga "panel" (keputusan Anas 13:17)', () => {
    expect(tataTab('horizontal', { tingkat: 0, dalamVertikal: false, dalamPanel: true }, true, 2)).toBe('panel');
    expect(tataTab('horizontal', { tingkat: 2, dalamVertikal: true, dalamPanel: true }, false, 9)).toBe('panel');
    // Di luar panel horizontal eksplisit tetap horizontal biasa.
    expect(tataTab('horizontal', { tingkat: 1, dalamVertikal: false, dalamPanel: false }, true, 9)).toBe('horizontal');
  });
  it('Tabs orientation="horizontal" di panel samping: data-panel (diukur lalu jadi Select bila tidak muat)', () => {
    const h = html(
      <AkarTingkatTab panel>
        <Tabs orientation="horizontal" aria-label="Jenis riwayat" items={SUB} />
      </AkarTingkatTab>,
    );
    expect(h).toContain('data-panel=""');
    expect(daftarTab(h)[0]).not.toContain('aria-orientation');
    const v = html(
      <AkarTingkatTab panel>
        <Tabs orientation="vertical" aria-label="Jenis riwayat" items={SUB} />
      </AkarTingkatTab>,
    );
    expect(v).not.toContain('data-panel');
    expect(daftarTab(v)[0]).toContain('aria-orientation="vertical"');
  });
  it('AkarTingkatTab panel: konteks dalamPanel diteruskan ke tab bersarang', () => {
    const catat: Array<boolean | undefined> = [];
    function Catat() {
      catat.push(useTingkatTab().dalamPanel);
      return null;
    }
    html(
      <AkarTingkatTab panel>
        <Catat />
        <PenyediaTingkatTab>
          <Catat />
        </PenyediaTingkatTab>
      </AkarTingkatTab>,
    );
    html(
      <AkarTingkatTab>
        <Catat />
      </AkarTingkatTab>,
    );
    expect(catat).toEqual([true, true, false]);
  });
  it('tab bersarang di panel samping: horizontal (data-panel), deret tab utuh sebelum diukur, tanpa Select', () => {
    const h = html(
      <AkarTingkatTab panel>
        <Tabs aria-label="Rincian" items={[{ value: 'a', label: 'Data', content: <Tabs aria-label="Riwayat" items={SUB} /> }, { value: 'b', label: 'Berkas', content: null }]} />
      </AkarTingkatTab>,
    );
    const t = daftarTab(h);
    expect(t).toHaveLength(2);
    expect(t.every((x) => !x.includes('aria-orientation'))).toBe(true);
    expect(h).toContain('data-panel=""');
    expect(h).not.toContain('data-bersarang');
    expect(h).not.toContain('u-tabs-wadah');
    // Pilihan tarik-turun hanya muncul setelah ResizeObserver mengukur deret tidak muat (di peramban).
    expect(h).not.toContain('u-tabs-pilih-panel');
    expect(h).not.toContain('data-tak-muat');
  });
});

describe('TabMenuHalaman dihitung tingkat pertama', () => {
  const menu = {
    tab: {
      induk: 'krs',
      judul: 'KRS & batas SKS',
      aktif: 'krs',
      items: [
        { key: 'krs', label: 'Rekap KRS', href: '/krs' },
        { key: 'sks', label: 'Batas SKS', href: '/sks' },
      ],
    },
  } as unknown as HasilMenu;
  it('Tabs berisi di bawah tab halaman otomatis vertikal', () => {
    const h = html(
      <TabMenuHalaman menu={menu}>
        <Tabs items={SUB} />
      </TabMenuHalaman>,
    );
    expect(h).toContain('data-tab-halaman="krs"');
    expect(daftarTab(h)[0]).toContain('aria-orientation="vertical"');
  });
  it('halaman tanpa deret tab (satu tab) tidak menaikkan tingkat', () => {
    const satu = { tab: { ...menu.tab!, items: [menu.tab!.items[0]] } } as unknown as HasilMenu;
    const h = html(
      <TabMenuHalaman menu={satu}>
        <Tabs items={SUB} />
      </TabMenuHalaman>,
    );
    expect(daftarTab(h)[0]).not.toContain('aria-orientation');
  });
});

describe('Select lencana: lencana di dalam isian, bukan di bawah', () => {
  it('lencana dirender di dalam tombol pemicu sebelum ikon panah', () => {
    const h = html(<Select aria-label="Tahun akademik" options={[{ value: '20251', label: '2025/2026 Ganjil' }]} value="20251" lencana={<span className="u-badge">Aktif</span>} />);
    const pemicu = h.slice(h.indexOf('u-select-trigger'), h.indexOf('</button>'));
    expect(pemicu).toContain('u-select-lencana');
    expect(pemicu.indexOf('u-select-lencana')).toBeLessThan(pemicu.indexOf('u-select-icon'));
  });
  it('tanpa lencana tidak ada elemen tambahan', () => {
    expect(html(<Select aria-label="x" options={[]} />)).not.toContain('u-select-lencana');
  });
});
