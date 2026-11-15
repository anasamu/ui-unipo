'use client';
import * as React from 'react';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { ChevronDown, ChevronsUpDown, Camera, Check, IdCard, KeyRound, LogOut, Monitor, Moon, PenLine, ShieldCheck, Sun, UserRound, Users } from 'lucide-react';
import { cn } from '../lib/cn';
import { Avatar, type AvatarSize } from './display';
import type { MenuEntry } from './overlays';

// ================================================================ Data akun dan tautan

/** Akun yang sedang masuk (dari sesi SSO, /v1/auth/me, atau /v1/profil/saya). */
export interface AkunPengguna {
  nama: string;
  /** Username / NIM / NIDN, tampil di baris kedua. */
  username?: string;
  /** Level SIAKAD (ADMIN, DOSEN, MAHASISWA, ...). */
  level?: string;
  /** Peran yang lebih ramah (Mahasiswa, Dosen, Tendik, Alumni). Bila ada, dipakai menggantikan level. */
  peran?: string;
  /** Prodi/unit, baris tambahan di kepala menu. */
  unit?: string;
  email?: string | null;
  foto?: string | null;
  status?: 'online' | 'offline' | 'busy' | 'away';
}

/** Jalur di profile.unipo.ac.id dan sso.unipo.ac.id. Ganti lewat prop `tautan` bila rute aplikasi berubah. */
export interface TautanAkun {
  profil: string;
  ubahProfil: string;
  dataPribadi: string;
  foto: string;
  password: string;
  keamanan: string;
  keluar: string;
}
export const PROFIL_URL = 'https://profile.unipo.ac.id';
export const SSO_URL = 'https://sso.unipo.ac.id';

/** Tautan bawaan: profil, ubah data, foto, dan password di aplikasi Profil; keamanan dan keluar di SSO. */
export function tautanAkun(profilUrl: string = PROFIL_URL, ssoUrl: string = SSO_URL, ganti: Partial<TautanAkun> = {}): TautanAkun {
  const p = profilUrl.replace(/\/+$/, '');
  const s = ssoUrl.replace(/\/+$/, '');
  return {
    profil: `${p}/`,
    ubahProfil: `${p}/profil`,
    dataPribadi: `${p}/data-pribadi`,
    foto: `${p}/profil`,
    password: `${p}/akun`,
    keamanan: `${s}/akun`,
    keluar: `${s}/logout`,
    ...ganti,
  };
}

/** Baris kedua kepala menu, seperti di SSO: "990101 · ADMIN". */
export function subjudulAkun(a: AkunPengguna): string {
  return [a.username, a.peran ?? a.level].filter(Boolean).join(' · ');
}

export type TemaAkun = 'terang' | 'gelap' | 'sistem';

// ================================================================ Menu akun

export type VarianMenuAkun = 'pil' | 'nama' | 'avatar' | 'sidebar' | 'ikon';
export type ItemMenuAkun = 'profil' | 'ubah' | 'data' | 'foto' | 'password' | 'keamanan';

export interface MenuAkunProps {
  pengguna: AkunPengguna;
  /**
   * Bentuk pemicu:
   * `pil` (avatar + nama + panah dalam kapsul, seperti SSO), `nama` (avatar + nama dua baris tanpa bingkai),
   * `avatar` (foto saja), `sidebar` (selebar kolom, menu terbuka ke atas), `ikon` (ikon pengguna kecil).
   */
  varian?: VarianMenuAkun;
  /** Item bawaan yang tampil. Bawaan: profil, ubah, keamanan. */
  item?: ItemMenuAkun[];
  /** Alamat aplikasi Profil (bawaan https://profile.unipo.ac.id). */
  profilUrl?: string;
  /** Alamat SSO (bawaan https://sso.unipo.ac.id). */
  ssoUrl?: string;
  /** Ganti jalur tertentu. */
  tautan?: Partial<TautanAkun>;
  /** Persen kelengkapan data (0-100). Di bawah 100 tampil bilah dan item "Lengkapi profil". */
  kelengkapan?: number | null;
  /** Peran lain akun yang sama (mis. dosen yang juga pejabat). */
  peranLain?: Array<{ kode: string; label: string; aktif?: boolean }>;
  onGantiPeran?: (kode: string) => void;
  /** Tampilkan pilihan tema di menu. */
  tema?: TemaAkun;
  onTema?: (t: TemaAkun) => void;
  /** Item tambahan sebelum tombol keluar. */
  menu?: MenuEntry[];
  /** Ganti aksi keluar (mis. logout aplikasi lalu SSO). Bawaan: tautan ke SSO /logout. */
  onKeluar?: () => void;
  labelKeluar?: string;
  /** Buka tautan profil di tab baru. */
  tabBaru?: boolean;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const LABEL_ITEM: Record<ItemMenuAkun, { label: string; ikon: React.ReactNode; kunci: keyof TautanAkun }> = {
  profil: { label: 'Profil saya', ikon: <UserRound />, kunci: 'profil' },
  ubah: { label: 'Ubah profil', ikon: <PenLine />, kunci: 'ubahProfil' },
  data: { label: 'Data pribadi', ikon: <IdCard />, kunci: 'dataPribadi' },
  foto: { label: 'Ganti foto', ikon: <Camera />, kunci: 'foto' },
  password: { label: 'Ganti password', ikon: <KeyRound />, kunci: 'password' },
  keamanan: { label: 'Keamanan akun', ikon: <ShieldCheck />, kunci: 'keamanan' },
};

const UKURAN_AVATAR: Record<VarianMenuAkun, AvatarSize> = { pil: 'sm', nama: 'sm', avatar: 'md', sidebar: 'md', ikon: 'xs' };

function Kelengkapan({ persen, href, tabBaru }: { persen: number; href: string; tabBaru?: boolean }) {
  const p = Math.max(0, Math.min(100, Math.round(persen)));
  return (
    <BaseMenu.LinkItem href={href} className="u-akun-lengkap" target={tabBaru ? '_blank' : undefined} rel={tabBaru ? 'noopener' : undefined}>
      <span className="u-akun-lengkap-teks">
        <span>Lengkapi profil</span>
        <b>{p}%</b>
      </span>
      <span className="u-akun-bilah" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label="Kelengkapan profil">
        <span style={{ width: `${p}%` }} />
      </span>
    </BaseMenu.LinkItem>
  );
}

/**
 * Menu akun pengguna di bilah atas atau sidebar, dengan isi yang sama di semua aplikasi UNIPO: kepala (foto, nama,
 * username · peran), tautan ke profile.unipo.ac.id (profil, ubah data, foto, password), keamanan akun di SSO, item
 * tambahan, pilihan peran dan tema, lalu "Keluar dari semua aplikasi".
 */
export function MenuAkun({
  pengguna,
  varian = 'pil',
  item = ['profil', 'ubah', 'keamanan'],
  profilUrl,
  ssoUrl,
  tautan,
  kelengkapan,
  peranLain,
  onGantiPeran,
  tema,
  onTema,
  menu = [],
  onKeluar,
  labelKeluar = 'Keluar dari semua aplikasi',
  tabBaru,
  align,
  side,
  className,
}: MenuAkunProps) {
  const t = tautanAkun(profilUrl, ssoUrl, tautan);
  const sub = subjudulAkun(pengguna);
  const belumLengkap = kelengkapan != null && kelengkapan < 100;
  const target = tabBaru ? { target: '_blank', rel: 'noopener' } : {};
  const avatar = <Avatar name={pengguna.nama} src={pengguna.foto} size={UKURAN_AVATAR[varian]} status={pengguna.status} />;

  const pemicu =
    varian === 'avatar' ? (
      <button type="button" className={cn('u-akun-pemicu', className)} data-varian="avatar" data-cincin={belumLengkap ? '' : undefined} aria-label={`Menu akun ${pengguna.nama}`}>
        {avatar}
      </button>
    ) : varian === 'ikon' ? (
      <button type="button" className={cn('u-akun-pemicu', className)} data-varian="ikon" aria-label={`Menu akun ${pengguna.nama}`}>
        <UserRound />
      </button>
    ) : (
      <button type="button" className={cn('u-akun-pemicu', className)} data-varian={varian} aria-label={`Menu akun ${pengguna.nama}`}>
        {avatar}
        <span className="u-akun-teks">
          <b>{pengguna.nama}</b>
          {varian !== 'pil' && sub && <small>{sub}</small>}
        </span>
        {varian === 'sidebar' ? <ChevronsUpDown className="u-akun-panah" aria-hidden /> : <ChevronDown className="u-akun-panah" aria-hidden />}
      </button>
    );

  const isiMenu = (it: MenuEntry, i: number) => {
    if (it.type === 'separator') return <BaseMenu.Separator key={`x${i}`} className="u-menu-separator" />;
    if (it.type === 'label')
      return (
        <div key={`x${i}`} className="u-menu-label">
          {it.label}
        </div>
      );
    const inner = (
      <>
        {it.icon}
        <span>{it.label}</span>
        {it.shortcut && <span className="u-menu-shortcut">{it.shortcut}</span>}
      </>
    );
    return it.href ? (
      <BaseMenu.LinkItem key={`x${i}`} href={it.href} className="u-menu-item">
        {inner}
      </BaseMenu.LinkItem>
    ) : (
      <BaseMenu.Item key={`x${i}`} className="u-menu-item" onClick={it.onSelect} disabled={it.disabled} data-variant={it.destructive ? 'destructive' : undefined}>
        {inner}
      </BaseMenu.Item>
    );
  };

  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger render={pemicu} />
      <BaseMenu.Portal>
        <BaseMenu.Positioner className="u-popup-positioner" align={align ?? (varian === 'sidebar' ? 'start' : 'end')} side={side ?? (varian === 'sidebar' ? 'top' : 'bottom')} sideOffset={8}>
          <BaseMenu.Popup className="u-menu u-akun-menu">
            <div className="u-akun-kepala">
              <Avatar name={pengguna.nama} src={pengguna.foto} size="lg" />
              <div>
                <b>{pengguna.nama}</b>
                {sub && <small>{sub}</small>}
                {pengguna.unit && <small>{pengguna.unit}</small>}
              </div>
            </div>
            {belumLengkap && <Kelengkapan persen={kelengkapan!} href={t.dataPribadi} tabBaru={tabBaru} />}
            <BaseMenu.Separator className="u-menu-separator" />
            {item.map((k) => (
              <BaseMenu.LinkItem key={k} href={t[LABEL_ITEM[k].kunci]} className="u-menu-item" {...target}>
                {LABEL_ITEM[k].ikon}
                <span>{LABEL_ITEM[k].label}</span>
              </BaseMenu.LinkItem>
            ))}
            {peranLain && peranLain.length > 1 && (
              <>
                <BaseMenu.Separator className="u-menu-separator" />
                <div className="u-menu-label">Masuk sebagai</div>
                {peranLain.map((p) => (
                  <BaseMenu.Item key={p.kode} className="u-menu-item" onClick={() => onGantiPeran?.(p.kode)} data-aktif={p.aktif ? '' : undefined}>
                    <Users />
                    <span>{p.label}</span>
                    {p.aktif && <Check className="u-akun-centang" aria-label="Aktif" />}
                  </BaseMenu.Item>
                ))}
              </>
            )}
            {tema && onTema && (
              <>
                <BaseMenu.Separator className="u-menu-separator" />
                <div className="u-akun-tema" role="group" aria-label="Tema">
                  {(
                    [
                      ['terang', <Sun key="s" />, 'Terang'],
                      ['gelap', <Moon key="m" />, 'Gelap'],
                      ['sistem', <Monitor key="o" />, 'Sistem'],
                    ] as const
                  ).map(([v, ikon, label]) => (
                    <button key={v} type="button" aria-pressed={tema === v} onClick={() => onTema(v)}>
                      {ikon}
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
            {menu.length > 0 && <BaseMenu.Separator className="u-menu-separator" />}
            {menu.map(isiMenu)}
            <BaseMenu.Separator className="u-menu-separator" />
            {onKeluar ? (
              <BaseMenu.Item className="u-menu-item" data-variant="destructive" onClick={onKeluar}>
                <LogOut />
                <span>{labelKeluar}</span>
              </BaseMenu.Item>
            ) : (
              <BaseMenu.LinkItem href={t.keluar} className="u-menu-item" data-variant="destructive">
                <LogOut />
                <span>{labelKeluar}</span>
              </BaseMenu.LinkItem>
            )}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}

// ================================================================ Kartu akun (tanpa menu)

export type VarianKartuAkun = 'baris' | 'kartu' | 'sampul' | 'tengah';

export interface KartuAkunProps {
  pengguna: AkunPengguna;
  /**
   * `baris` (satu baris ringkas untuk laci ponsel), `kartu` (kepala + kelengkapan + tombol), `sampul` (latar
   * berwarna dengan foto menimpa tepi, gaya halaman profil), `tengah` (foto dan nama di tengah, untuk sambutan dasbor).
   */
  varian?: VarianKartuAkun;
  profilUrl?: string;
  ssoUrl?: string;
  tautan?: Partial<TautanAkun>;
  kelengkapan?: number | null;
  /** Statistik kecil (mis. { label: 'SKS', nilai: 98 }). */
  statistik?: Array<{ label: string; nilai: React.ReactNode }>;
  /** Tombol aksi; bawaan Ubah profil + Keamanan akun. `null` untuk menyembunyikan. */
  aksi?: React.ReactNode | null;
  onKeluar?: () => void;
  tabBaru?: boolean;
  className?: string;
}

/** Ringkasan akun berbentuk kartu dengan tautan ke profile.unipo.ac.id untuk mengubah profil. */
export function KartuAkun({ pengguna, varian = 'kartu', profilUrl, ssoUrl, tautan, kelengkapan, statistik, aksi, onKeluar, tabBaru, className }: KartuAkunProps) {
  const t = tautanAkun(profilUrl, ssoUrl, tautan);
  const sub = subjudulAkun(pengguna);
  const target = tabBaru ? { target: '_blank', rel: 'noopener' } : {};
  const p = kelengkapan == null ? null : Math.max(0, Math.min(100, Math.round(kelengkapan)));
  const tombol =
    aksi === undefined ? (
      <div className="u-akun-aksi">
        <a className="u-button" data-variant="primary" data-size="sm" href={t.ubahProfil} {...target}>
          <PenLine />
          Ubah profil
        </a>
        <a className="u-button" data-variant="outline" data-size="sm" href={t.keamanan}>
          <ShieldCheck />
          Keamanan akun
        </a>
        {onKeluar && (
          <button type="button" className="u-button" data-variant="ghost" data-size="sm" onClick={onKeluar}>
            <LogOut />
            Keluar
          </button>
        )}
      </div>
    ) : aksi === null ? null : (
      <div className="u-akun-aksi">{aksi}</div>
    );

  if (varian === 'baris') {
    return (
      <a className={cn('u-akun-kartu', className)} data-varian="baris" href={t.profil} {...target}>
        <Avatar name={pengguna.nama} src={pengguna.foto} size="md" status={pengguna.status} />
        <span className="u-akun-teks">
          <b>{pengguna.nama}</b>
          {sub && <small>{sub}</small>}
        </span>
        {p != null && p < 100 && <span className="u-akun-persen">{p}%</span>}
        <PenLine className="u-akun-panah" aria-hidden />
      </a>
    );
  }

  return (
    <section className={cn('u-akun-kartu', className)} data-varian={varian}>
      {varian === 'sampul' && <div className="u-akun-sampul" aria-hidden />}
      <div className="u-akun-identitas">
        <a href={t.foto} className="u-akun-foto" aria-label="Ganti foto profil" {...target}>
          <Avatar name={pengguna.nama} src={pengguna.foto} size={varian === 'kartu' ? 'lg' : 'xl'} status={pengguna.status} />
        </a>
        <div className="u-akun-teks">
          <b>{pengguna.nama}</b>
          {sub && <small>{sub}</small>}
          {pengguna.unit && <small>{pengguna.unit}</small>}
          {pengguna.email && <small>{pengguna.email}</small>}
        </div>
      </div>
      {p != null && (
        <a className="u-akun-lengkap" href={t.dataPribadi} {...target} data-penuh={p >= 100 ? '' : undefined}>
          <span className="u-akun-lengkap-teks">
            <span>{p >= 100 ? 'Profil lengkap' : 'Kelengkapan profil'}</span>
            <b>{p}%</b>
          </span>
          <span className="u-akun-bilah" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label="Kelengkapan profil">
            <span style={{ width: `${p}%` }} />
          </span>
        </a>
      )}
      {statistik && statistik.length > 0 && (
        <dl className="u-akun-statistik">
          {statistik.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.nilai}</dd>
            </div>
          ))}
        </dl>
      )}
      {tombol}
    </section>
  );
}
