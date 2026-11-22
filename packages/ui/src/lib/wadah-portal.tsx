'use client';
import * as React from 'react';

/**
 * Wadah portal untuk popup (navbar dropdown/mega menu, dialog, menu). Bawaan document.body; pratinjau penyunting yang
 * merender halaman di dalam iframe (BingkaiPratinjau) memasang body iframe agar popup tampil di dalam pratinjau,
 * bukan di halaman penyunting.
 */
const KonteksWadahPortal = React.createContext<HTMLElement | null>(null);

export function WadahPortal({ wadah, children }: { wadah: HTMLElement | null; children: React.ReactNode }) {
  return <KonteksWadahPortal.Provider value={wadah}>{children}</KonteksWadahPortal.Provider>;
}

/** Wadah portal terdekat (undefined = document.body). */
export function useWadahPortal(): HTMLElement | undefined {
  return React.useContext(KonteksWadahPortal) ?? undefined;
}
