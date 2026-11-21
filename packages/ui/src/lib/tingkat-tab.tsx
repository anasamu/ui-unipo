'use client';
import * as React from 'react';

// ================================================================ Tingkat sarang tab
//
// Tab di dalam panel tab lain (tingkat kedua) otomatis tampil vertikal supaya tidak ada dua baris tab horizontal
// bertumpuk. Tingkat dihitung lewat konteks: `Tabs` dan tab halaman dari menu (`TabMenuHalaman`) menaikkan tingkat
// untuk isinya; Dialog/Sheet/Popover mengembalikannya ke 0 karena merupakan permukaan baru.

export interface TingkatTab {
  /** 0 = belum di dalam tab apa pun; 1 = di dalam panel tab tingkat pertama; dst. */
  tingkat: number;
  /** Salah satu leluhur sudah memakai tata letak vertikal (tab di dalamnya tidak dibuat vertikal lagi). */
  dalamVertikal: boolean;
}

const AKAR: TingkatTab = { tingkat: 0, dalamVertikal: false };
const KonteksTingkatTab = React.createContext<TingkatTab>(AKAR);

/** Tingkat sarang tab di posisi komponen ini. */
export function useTingkatTab(): TingkatTab {
  return React.useContext(KonteksTingkatTab);
}

/** Isi panel tab: menaikkan tingkat sarang satu. `vertikal` = tab pemiliknya tampil vertikal. */
export function PenyediaTingkatTab({ vertikal = false, children }: { vertikal?: boolean; children?: React.ReactNode }) {
  const induk = useTingkatTab();
  const nilai = React.useMemo(() => ({ tingkat: induk.tingkat + 1, dalamVertikal: induk.dalamVertikal || vertikal }), [induk, vertikal]);
  return <KonteksTingkatTab.Provider value={nilai}>{children}</KonteksTingkatTab.Provider>;
}

/** Permukaan baru (dialog, panel samping, popover): tab di dalamnya kembali dihitung tingkat pertama. */
export function AkarTingkatTab({ children }: { children?: React.ReactNode }) {
  return <KonteksTingkatTab.Provider value={AKAR}>{children}</KonteksTingkatTab.Provider>;
}
