import * as React from 'react';

/** Target aplikasi: web (peramban), desktop (Electron/Tauri), atau mobile (Capacitor/WebView/PWA). */
export type Platform = 'web' | 'desktop' | 'mobile';
/** Sistem operasi untuk gaya khas: iOS (Cupertino) atau Android (Material). */
export type SistemOperasi = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'lain';

export interface InfoPlatform {
  platform: Platform;
  os: SistemOperasi;
  /** Layar sentuh (target sentuh lebih besar, tanpa efek sorot). */
  sentuh: boolean;
  mobile: boolean;
  desktop: boolean;
  ios: boolean;
  android: boolean;
}

export interface SetelPlatformOpsi {
  /** 'auto' mendeteksi Capacitor/Cordova (mobile), Electron/Tauri (desktop), atau peramban (web). */
  platform?: Platform | 'auto';
  /** Untuk mobile: 'ios' atau 'android'; 'auto' dari user agent. */
  os?: SistemOperasi | 'auto';
  /** Elemen yang diberi atribut data-u-platform/data-u-os (bawaan <html>). */
  target?: HTMLElement | null;
}

type W = Window & { Capacitor?: { getPlatform?: () => string; isNativePlatform?: () => boolean }; cordova?: unknown; __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown; electron?: unknown };

/** Deteksi platform dari lingkungan berjalan. */
export function deteksiPlatform(): { platform: Platform; os: SistemOperasi } {
  if (typeof window === 'undefined') return { platform: 'web', os: 'lain' };
  const w = window as W;
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const os: SistemOperasi = iOS ? 'ios' : /Android/.test(ua) ? 'android' : /Mac/.test(ua) ? 'macos' : /Win/.test(ua) ? 'windows' : /Linux/.test(ua) ? 'linux' : 'lain';
  const cap = w.Capacitor?.getPlatform?.();
  if (cap === 'ios' || cap === 'android') return { platform: 'mobile', os: cap };
  if (w.cordova) return { platform: 'mobile', os };
  if (w.__TAURI__ || w.__TAURI_INTERNALS__ || /Electron/.test(ua)) return { platform: 'desktop', os };
  return { platform: 'web', os };
}

function info(platform: Platform, os: SistemOperasi): InfoPlatform {
  const sentuh = typeof window !== 'undefined' ? window.matchMedia?.('(pointer: coarse)').matches || platform === 'mobile' : platform === 'mobile';
  return { platform, os, sentuh, mobile: platform === 'mobile', desktop: platform === 'desktop', ios: os === 'ios', android: os === 'android' };
}

let sekarang: InfoPlatform = info('web', 'lain');
const pendengar = new Set<() => void>();

/**
 * Atur target platform untuk seluruh komponen UNIPO. Panggil sekali di berkas awal aplikasi
 * (CLI `npx unipo-ui init --platform mobile --os ios` menuliskannya otomatis):
 *   setelPlatform({ platform: 'mobile', os: 'android' });
 * Komponen menyesuaikan: dialog dan panel jadi lembar bawah di mobile, target sentuh 44 px (iOS) / 48 px (Android),
 * gaya tombol, saklar, dan navigasi mengikuti iOS atau Android, tabel lebih rapat di desktop, area aman layar berponi.
 */
export function setelPlatform({ platform = 'auto', os = 'auto', target }: SetelPlatformOpsi = {}): InfoPlatform {
  const d = deteksiPlatform();
  const p = platform === 'auto' ? d.platform : platform;
  let o = os === 'auto' ? d.os : os;
  if (p === 'mobile' && o !== 'ios' && o !== 'android') o = 'android';
  sekarang = info(p, o);
  const el = target ?? (typeof document !== 'undefined' ? document.documentElement : null);
  if (el) {
    el.dataset.uPlatform = p;
    el.dataset.uOs = o;
    if (sekarang.sentuh) el.dataset.uSentuh = '';
    else delete el.dataset.uSentuh;
  }
  pendengar.forEach((l) => l());
  return sekarang;
}

/** Platform aktif (berubah bila setelPlatform dipanggil lagi). */
export function usePlatform(): InfoPlatform {
  return React.useSyncExternalStore(
    (l) => {
      pendengar.add(l);
      return () => void pendengar.delete(l);
    },
    () => sekarang,
    () => sekarang,
  );
}

/** Platform aktif di luar React. */
export function platformSekarang(): InfoPlatform {
  return sekarang;
}
