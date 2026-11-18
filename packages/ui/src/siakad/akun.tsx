'use client';
import * as React from 'react';
import { Skeleton } from '../components/actions';
import { KartuAkun, MenuAkun, type AkunPengguna, type ItemMenuAkun, type KartuAkunProps, type MenuAkunProps } from '../components/akun';
import { useOptionalSiakad, useSiakadQuery } from './provider';

/** Bagian GET /v1/profil/saya yang dipakai menu dan kartu akun. */
export interface ProfilSayaRingkas {
  akun: { username: string; nama: string; email: string | null; level: string; login_terakhir?: string | null; bisa_ganti_password?: boolean };
  identitas: { peran: string; peran_label: string; kunci: string; kunci_label: string; nama_prodi?: string | null; jenjang?: string | null; fakultas?: string | null };
  profil: { nama_panggilan?: string | null; judul?: string | null; punya_foto?: boolean; foto_versi?: string | null };
  ringkasan?: Record<string, number>;
  kelengkapan: { persen_wajib: number; lengkap: boolean; kurang: Array<{ kolom: string; label: string; wajib: boolean; bisa_diisi_sendiri: boolean }> } | null;
}

const cacheFoto = new Map<string, string>();

/**
 * Akun yang sedang masuk dari GET /v1/profil/saya (scope profil:read), lengkap dengan pas foto dari
 * /v1/profil/saya/foto sebagai object URL (foto butuh token, jadi tidak bisa langsung dipakai sebagai src).
 */
export function useAkunSaya(opsi: { foto?: boolean } = {}) {
  const siakad = useOptionalSiakad();
  const q = useSiakadQuery<ProfilSayaRingkas>(['profil', 'saya', 'ringkas'], (s, signal) => s.request<ProfilSayaRingkas>({ method: 'GET', path: '/v1/profil/saya' }, { signal }), {
    staleTime: 120_000,
  });
  const versi = q.data?.profil?.punya_foto ? `${q.data.akun.username}:${q.data.profil.foto_versi ?? ''}` : null;
  const [foto, setFoto] = React.useState<string | null>(versi ? (cacheFoto.get(versi) ?? null) : null);

  React.useEffect(() => {
    if (!versi || opsi.foto === false || !siakad) return void setFoto(null);
    const ada = cacheFoto.get(versi);
    if (ada) return void setFoto(ada);
    const ctrl = new AbortController();
    siakad
      .request<unknown>({ method: 'GET', path: '/v1/profil/saya/foto' }, { signal: ctrl.signal })
      .then((r) => {
        const d = r.data as { blob?: () => Blob } | Blob | string | null;
        const blob = d instanceof Blob ? d : d && typeof d === 'object' && typeof d.blob === 'function' ? d.blob() : null;
        const url = blob ? URL.createObjectURL(blob) : typeof d === 'string' && /^(https?:|data:image\/)/.test(d) ? d : null;
        if (url) cacheFoto.set(versi, url);
        if (!ctrl.signal.aborted) setFoto(url);
      })
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [versi, opsi.foto, siakad]);

  const d = q.data;
  const pengguna: AkunPengguna | null = d
    ? {
        nama: d.akun.nama,
        username: d.identitas?.kunci || d.akun.username,
        level: d.akun.level,
        peran: d.identitas?.peran_label,
        unit: [d.identitas?.jenjang, d.identitas?.nama_prodi].filter(Boolean).join(' ') || undefined,
        email: d.akun.email,
        foto,
      }
    : null;
  /** Kode peran profil (mahasiswa, dosen, tendik, alumni, pengguna). */
  const kodePeran = d?.identitas?.peran ?? null;
  return { ...q, pengguna, kodePeran, kelengkapan: d?.kelengkapan?.persen_wajib ?? null, kurang: d?.kelengkapan?.kurang ?? [] };
}

/**
 * MenuAkun yang mengisi dirinya dari /v1/profil/saya: nama, NIM/NIDN, peran, prodi, foto, dan kelengkapan data.
 * `cadangan` dipakai selama memuat atau bila token belum punya scope profil:read (mis. dari sesi SSO).
 */
export function MenuAkunSiakad({ cadangan, ...props }: Omit<MenuAkunProps, 'pengguna' | 'kelengkapan'> & { cadangan?: AkunPengguna }) {
  const a = useAkunSaya();
  const pengguna = a.pengguna ?? cadangan;
  if (!pengguna) return <Skeleton width={props.varian === 'avatar' || props.varian === 'ikon' ? 36 : 180} height={36} className="u-akun-memuat" />;
  return <MenuAkun {...props} item={itemDenganGaji(props.item, a.kodePeran)} pengguna={pengguna} kelengkapan={a.kelengkapan} />;
}

/** Dosen dan tendik mendapat "Riwayat gaji" (Profil /gaji) di menu akun, sebelum "Keamanan akun". */
function itemDenganGaji(item: ItemMenuAkun[] = ['profil', 'ubah', 'keamanan'], peran: string | null): ItemMenuAkun[] {
  // Pedoman & peraturan universitas (dasar aturan sistem) dapat dibuka dari menu akun semua aplikasi.
  const sisip = (daftar: ItemMenuAkun[], x: ItemMenuAkun): ItemMenuAkun[] => {
    if (daftar.includes(x)) return daftar;
    const i = daftar.indexOf('keamanan');
    return i < 0 ? [...daftar, x] : [...daftar.slice(0, i), x, ...daftar.slice(i)];
  };
  const dasar = sisip(item, 'pedoman');
  return peran !== 'dosen' && peran !== 'tendik' ? dasar : sisip(dasar, 'gaji');
}

/** KartuAkun yang mengisi dirinya dari /v1/profil/saya. */
export function KartuAkunSiakad({ cadangan, ...props }: Omit<KartuAkunProps, 'pengguna' | 'kelengkapan'> & { cadangan?: AkunPengguna }) {
  const a = useAkunSaya();
  const pengguna = a.pengguna ?? cadangan;
  if (!pengguna) return <Skeleton height={props.varian === 'baris' ? 60 : 180} />;
  return <KartuAkun {...props} pengguna={pengguna} kelengkapan={a.kelengkapan} />;
}
