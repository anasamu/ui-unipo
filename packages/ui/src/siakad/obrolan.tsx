'use client';
import * as React from 'react';
import { ContextMenu as BaseKonteks } from '@base-ui/react/context-menu';
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowLeft,
  Ban,
  Bell,
  Camera,
  BellOff,
  Check,
  CheckCheck,
  Clock,
  Copy,
  Download,
  Eraser,
  EllipsisVertical,
  FileText,
  FolderDown,
  Hourglass,
  Info,
  Lock,
  LogOut,
  MessageCircle,
  MessageCircleX,
  MessageSquarePlus,
  Paperclip,
  Pencil,
  Pin,
  PinOff,
  Reply,
  RotateCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SmilePlus,
  Timer,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Badge, Button, Skeleton, Spinner } from '../components/actions';
import { Alert, Avatar, Empty, Tabs } from '../components/display';
import { Checkbox, Field, Input, InputGroup, SegmentedControl, Switch } from '../components/forms';
import { ConfirmDialog, Dialog, Menu, Popover, Tooltip, useToast, type MenuEntry } from '../components/overlays';
import { cn } from '../lib/cn';
import { formatBytes } from '../lib/format';
import { judulRuang, lawanDari, mesinObrolan, namaDepan, type KeadaanObrolan, type MesinObrolan, type OrangObrolan, type PesanObrolan, type RuangObrolanData } from './obrolan-mesin';
import type { IsiPesan } from './obrolan-kripto';
import { pesanGalat, useSiakad } from './provider';
import { TabKabar } from './notifikasi';

export type { KeadaanObrolan, MesinObrolan, OrangObrolan, PesanObrolan, RuangObrolanData } from './obrolan-mesin';
export { mesinObrolan } from './obrolan-mesin';
/** Pustaka kripto obrolan (WebCrypto): untuk aplikasi lain atau bot yang memakai protokol yang sama. */
export * as kriptoObrolan from './obrolan-kripto';

// ================================================================ hook & util

/**
 * Keadaan obrolan (`/v1/obrolan`, terenkripsi di server) untuk komponen kustom. Semua komponen obrolan di halaman
 * berbagi satu mesin per instans Siakad: satu kunci perangkat, satu koneksi realtime.
 */
export function useObrolan(): { mesin: MesinObrolan; keadaan: KeadaanObrolan } {
  const siakad = useSiakad();
  const mesin = React.useMemo(() => mesinObrolan(siakad), [siakad]);
  const keadaan = React.useSyncExternalStore(
    mesin.langgan,
    () => mesin.keadaan,
    () => mesin.keadaan,
  );
  React.useEffect(() => mesin.pakai(), [mesin]);
  return { mesin, keadaan };
}

/** Mesin obrolan tanpa berlangganan keadaan (untuk komponen kecil yang hanya memanggil aksi). */
function useMesin(): MesinObrolan {
  const siakad = useSiakad();
  return React.useMemo(() => mesinObrolan(siakad), [siakad]);
}

const pendengarBuka = new Set<(pemilik: string) => void>();
/** Buka obrolan langsung dengan seseorang (id pemilik: username SIAKAD atau `pmb:<id>`) di `ChatMengambang`/`KotakObrolan` yang terpasang. */
export function bukaObrolan(pemilik: string) {
  pendengarBuka.forEach((f) => f(pemilik));
}
const pendengarRuang = new Set<(id: string | null) => void>();
/**
 * Buka satu ruang obrolan (id ruang) di `ChatMengambang` yang terpasang; `null` membuka daftar obrolan. Dipakai
 * `TombolPesan` di bilah atas.
 */
export function bukaRuangObrolan(id: string | null = null) {
  pendengarRuang.forEach((f) => f(id));
}
function useMintaBukaRuang(fn: (id: string | null) => void) {
  const ref = React.useRef(fn);
  ref.current = fn;
  React.useEffect(() => {
    const f = (id: string | null) => ref.current(id);
    pendengarRuang.add(f);
    return () => void pendengarRuang.delete(f);
  }, []);
}
function useMintaBuka(fn: (pemilik: string) => void) {
  const ref = React.useRef(fn);
  ref.current = fn;
  React.useEffect(() => {
    const f = (p: string) => ref.current(p);
    pendengarBuka.add(f);
    return () => void pendengarBuka.delete(f);
  }, []);
}

/** Tombol "Kirim pesan" untuk kartu profil, daftar dosen wali, dsb. Membuka obrolan langsung lewat `ChatMengambang`. */
export function TombolObrolan({ pemilik, children = 'Kirim pesan', ...props }: { pemilik: string } & Omit<React.ComponentProps<typeof Button>, 'onClick'>) {
  return (
    <Button variant="outline" size="sm" {...props} onClick={() => bukaObrolan(pemilik)}>
      <MessageCircle aria-hidden />
      {children}
    </Button>
  );
}

const tgl = (s: string) => new Date(s.includes('T') ? s : s.replace(' ', 'T'));
const hariSama = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const jam = (s: string) => tgl(s).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

function waktuSingkat(s: string): string {
  const d = tgl(s);
  const kini = new Date();
  if (hariSama(d, kini)) return jam(s);
  const kemarin = new Date(kini);
  kemarin.setDate(kini.getDate() - 1);
  if (hariSama(d, kemarin)) return 'Kemarin';
  if (kini.getTime() - d.getTime() < 6 * 86400_000) return d.toLocaleDateString('id-ID', { weekday: 'long' });
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function labelTanggal(d: Date): string {
  const kini = new Date();
  if (hariSama(d, kini)) return 'Hari ini';
  const kemarin = new Date(kini);
  kemarin.setDate(kini.getDate() - 1);
  if (hariSama(d, kemarin)) return 'Kemarin';
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() === kini.getFullYear() ? undefined : 'numeric' });
}

function terakhirAktif(s: string | null): string {
  if (!s) return '';
  const menit = Math.round((Date.now() - tgl(s).getTime()) / 60_000);
  if (menit < 1) return 'aktif baru saja';
  if (menit < 60) return `aktif ${menit} menit lalu`;
  if (menit < 24 * 60) return `aktif ${Math.round(menit / 60)} jam lalu`;
  return `aktif ${waktuSingkat(s).toLowerCase()}`;
}

function cuplikan(p: PesanObrolan | null, r: RuangObrolanData, saya: string): string {
  if (!p) return 'Belum ada pesan';
  if (p.status === 'dihapus') return 'Pesan dihapus';
  if (p.status === 'tak_terbaca') return 'Pesan lama tidak tersedia';
  if (p.status === 'menunggu') return 'Menunggu pesan…';
  const i = p.isi;
  if (!i) return '';
  const siapa = p.pengirim === saya ? 'Anda: ' : r.jenis === 'grup' ? `${namaDepan(r.anggota.find((a) => a.id === p.pengirim)?.nama ?? '')}: ` : '';
  if (i.t === 'sistem') return i.isi ?? '';
  if (i.t === 'reaksi') {
    const subjek = p.pengirim === saya ? 'Anda' : namaDepan(r.anggota.find((a) => a.id === p.pengirim)?.nama ?? '');
    return i.emoji ? `${subjek} memberi reaksi ${i.emoji}` : `${subjek} menghapus reaksi`;
  }
  if (i.t === 'berkas') {
    const b = i.berkas ?? [];
    const gambar = b.every((x) => x.mime.startsWith('image/'));
    return siapa + (i.isi || (gambar ? (b.length > 1 ? `${b.length} foto` : 'Foto') : (b[0]?.nama ?? 'Berkas')));
  }
  return siapa + (i.isi ?? '');
}

const EMOJI_CEPAT = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const MENGHILANG = [
  { value: '0', label: 'Mati' },
  { value: '86400', label: '24 jam' },
  { value: '604800', label: '7 hari' },
  { value: '7776000', label: '90 hari' },
];
const labelMenghilang = (d: number) => MENGHILANG.find((m) => Number(m.value) === d)?.label ?? `${Math.round(d / 3600)} jam`;

const draf = new Map<string, string>();

function AvatarRuang({ r, saya, size = 'md' }: { r: RuangObrolanData; saya: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const l = lawanDari(r, saya);
  const mesin = useMesin();
  const [url, setUrl] = React.useState<string | null>(null);
  const foto = r.jenis === 'grup' ? (r.foto ?? null) : null;
  React.useEffect(() => {
    setUrl(null);
    if (!foto) return;
    let hidup = true;
    mesin
      .urlFoto(r.id, foto)
      .then((u) => hidup && setUrl(u))
      .catch(() => {});
    return () => {
      hidup = false;
    };
  }, [mesin, r.id, foto]);
  if (l) return <Avatar name={l.nama} size={size} status={l.daring ? 'online' : undefined} />;
  return (
    <span className="u-ob-avatar-grup" data-size={size} data-foto={url ? '' : undefined} aria-hidden>
      {url ? <img src={url} alt="" /> : <Users />}
    </span>
  );
}

function PesanTeks({ teks }: { teks: string }) {
  const bagian = teks.split(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g);
  return (
    <>
      {bagian.map((b, i) =>
        i % 2 ? (
          <a key={i} href={b} target="_blank" rel="noopener noreferrer nofollow">
            {b}
          </a>
        ) : (
          b
        ),
      )}
    </>
  );
}

// ================================================================ DaftarPengguna

export interface SaringanPengguna {
  label: string;
  /** Level SIAKAD (DOSEN, MAHASISWA, ...) atau PENDAFTAR. Kosong = semua. */
  level?: string;
}
export const SARINGAN_PENGGUNA_BAWAAN: SaringanPengguna[] = [
  { label: 'Semua' },
  { label: 'Dosen', level: 'DOSEN' },
  { label: 'Mahasiswa', level: 'MAHASISWA' },
  { label: 'Mahasiswa baru', level: 'MABA' },
  { label: 'BAAK', level: 'BAK' },
  { label: 'Keuangan', level: 'KEUANGAN' },
  { label: 'Prodi', level: 'PROGDI' },
  { label: 'Panitia PMB', level: 'PANITIA' },
  { label: 'Pendaftar', level: 'PENDAFTAR' },
];

export interface DaftarPenggunaProps {
  /** Dipanggil saat satu orang dipilih (mode tunggal). */
  onPilih?: (orang: OrangObrolan) => void;
  /** Pilih beberapa orang (mis. anggota grup). */
  pilihBanyak?: boolean;
  terpilih?: OrangObrolan[];
  onTerpilihChange?: (orang: OrangObrolan[]) => void;
  /** Tombol saring per peran; `[]` menyembunyikannya. Pendaftar PMB tidak melihat saringan. */
  saringan?: SaringanPengguna[];
  /** ID yang tidak ditampilkan (mis. anggota grup yang sudah ada). */
  kecuali?: string[];
  autoFocus?: boolean;
  className?: string;
}

/**
 * Cari pengguna SIAKAD (mahasiswa, dosen, tendik, maba) dan pendaftar PMB yang boleh dihubungi. Tanpa kata kunci,
 * menampilkan kontak terakhir. Hanya nama dan peran yang tampil; email/HP tidak pernah dikirim server.
 */
export function DaftarPengguna({ onPilih, pilihBanyak, terpilih = [], onTerpilihChange, saringan = SARINGAN_PENGGUNA_BAWAAN, kecuali = [], autoFocus, className }: DaftarPenggunaProps) {
  const { mesin, keadaan: k } = useObrolan();
  const [q, setQ] = React.useState('');
  const [level, setLevel] = React.useState<string | undefined>();
  const [hasil, setHasil] = React.useState<OrangObrolan[] | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [memuat, setMemuat] = React.useState(false);
  const qBersih = q.trim();
  const pendekSekali = qBersih.length === 1;

  React.useEffect(() => {
    if (pendekSekali) return;
    const ac = new AbortController();
    setMemuat(true);
    const t = setTimeout(
      () => {
        mesin
          .cariPengguna(qBersih, level, ac.signal)
          .then((d) => (setHasil(d), setGalat(null)))
          .catch((e) => !ac.signal.aborted && setGalat(pesanGalat(e)))
          .finally(() => !ac.signal.aborted && setMemuat(false));
      },
      qBersih ? 250 : 0,
    );
    return () => (clearTimeout(t), ac.abort());
  }, [mesin, qBersih, level, pendekSekali]);

  const idTerpilih = new Set(terpilih.map((o) => o.id));
  const tampil = (hasil ?? []).filter((o) => !kecuali.includes(o.id));
  const pakaiSaringan = saringan.length > 0 && k.saya?.jenis !== 'pendaftar';
  const pilih = (o: OrangObrolan) => {
    if (!pilihBanyak) return onPilih?.(o);
    onTerpilihChange?.(idTerpilih.has(o.id) ? terpilih.filter((x) => x.id !== o.id) : [...terpilih, o]);
  };

  return (
    <div className={cn('u-ob-pengguna', className)}>
      <InputGroup start={<Search aria-hidden />} size="sm">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau NIM/NIDN" aria-label="Cari pengguna" autoFocus={autoFocus} />
      </InputGroup>
      {pakaiSaringan && (
        <div className="u-ob-saring" role="group" aria-label="Saring peran">
          {saringan.map((s) => (
            <button key={s.label} type="button" className="u-ob-chip" aria-pressed={level === s.level} onClick={() => setLevel(s.level)}>
              {s.label}
            </button>
          ))}
        </div>
      )}
      {pilihBanyak && terpilih.length > 0 && (
        <div className="u-ob-terpilih">
          {terpilih.map((o) => (
            <button key={o.id} type="button" className="u-ob-chip" data-terpilih onClick={() => pilih(o)} aria-label={`Batal pilih ${o.nama}`}>
              <Avatar name={o.nama} size="xs" />
              {namaDepan(o.nama)}
              <X aria-hidden />
            </button>
          ))}
        </div>
      )}
      <div className="u-ob-pengguna-daftar" aria-busy={memuat}>
        {!qBersih && !level && tampil.length > 0 && <p className="u-ob-subjudul">Kontak terakhir</p>}
        {pendekSekali ? (
          <p className="u-ob-petunjuk">Ketik minimal 2 huruf.</p>
        ) : galat ? (
          <Alert variant="danger">{galat}</Alert>
        ) : hasil === null ? (
          Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="u-ob-baris" aria-hidden>
              <Skeleton shape="circle" width={36} height={36} />
              <div className="u-ob-baris-teks">
                <Skeleton width="60%" height={12} />
                <Skeleton width="35%" height={10} />
              </div>
            </div>
          ))
        ) : tampil.length === 0 ? (
          <p className="u-ob-petunjuk">{qBersih || level ? 'Tidak ada pengguna yang cocok.' : 'Cari nama untuk memulai obrolan.'}</p>
        ) : (
          tampil.map((o) => (
            <button key={o.id} type="button" className="u-ob-baris" data-interaktif onClick={() => pilih(o)} aria-pressed={pilihBanyak ? idTerpilih.has(o.id) : undefined}>
              <Avatar name={o.nama} size="md" status={o.daring ? 'online' : undefined} />
              <span className="u-ob-baris-teks">
                <span className="u-ob-baris-nama">{o.nama}</span>
                <span className="u-ob-baris-sub">
                  {o.peran}
                  {!o.daring && o.terakhir_aktif ? ` · ${terakhirAktif(o.terakhir_aktif)}` : o.daring ? ' · daring' : ''}
                </span>
              </span>
              {!o.punya_kunci && (
                <Tooltip content="Belum pernah membuka obrolan. Pesan tetap bisa dikirim dan terbuka saat ia membukanya.">
                  <Badge variant="neutral">Belum aktif</Badge>
                </Tooltip>
              )}
              {pilihBanyak && <Checkbox checked={idTerpilih.has(o.id)} tabIndex={-1} aria-hidden />}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ================================================================ DaftarObrolan

export interface DaftarObrolanProps {
  aktif?: string | null;
  onPilih: (ruang: string) => void;
  /** Dipanggil setelah obrolan dihapus dari daftar (mis. tutup ruang yang sedang terbuka). */
  onHapus?: (ruang: string) => void;
  className?: string;
}

/** Menu klik kanan / tekan lama (layar sentuh) dengan isi yang sama seperti `Menu`. */
function MenuKonteks({ items, className, children }: { items: MenuEntry[]; className?: string; children: React.ReactNode }) {
  return (
    <BaseKonteks.Root>
      <BaseKonteks.Trigger className={className}>{children}</BaseKonteks.Trigger>
      <BaseKonteks.Portal>
        <BaseKonteks.Positioner className="u-popup-positioner">
          <BaseKonteks.Popup className="u-menu">
            {items.map((it, i) =>
              it.type === 'separator' ? (
                <BaseKonteks.Separator key={i} className="u-menu-separator" />
              ) : it.type === 'label' ? (
                <div key={i} className="u-menu-label">
                  {it.label}
                </div>
              ) : (
                <BaseKonteks.Item key={i} className="u-menu-item" onClick={it.onSelect} disabled={it.disabled} data-variant={it.destructive ? 'destructive' : undefined}>
                  {it.icon}
                  <span>{it.label}</span>
                </BaseKonteks.Item>
              ),
            )}
          </BaseKonteks.Popup>
        </BaseKonteks.Positioner>
      </BaseKonteks.Portal>
    </BaseKonteks.Root>
  );
}

/** Menu per obrolan (daftar dan kepala ruang): sematkan, bisukan, arsipkan, hapus obrolan. */
function menuObrolan(mesin: MesinObrolan, r: RuangObrolanData, onHapus: () => void, onArsip?: (arsip: boolean) => void): MenuEntry[] {
  const ubah = (u: Parameters<MesinObrolan['ubahRuang']>[1]) => void mesin.ubahRuang(r.id, u).catch(() => {});
  return [
    { label: r.sematkan ? 'Lepas sematan' : 'Sematkan', icon: r.sematkan ? <PinOff /> : <Pin />, onSelect: () => ubah({ sematkan: !r.sematkan }) },
    { label: r.bisu ? 'Bunyikan notifikasi' : 'Bisukan notifikasi', icon: r.bisu ? <Bell /> : <BellOff />, onSelect: () => ubah({ bisu: !r.bisu }) },
    { label: r.arsip ? 'Keluarkan dari arsip' : 'Arsipkan', icon: r.arsip ? <ArchiveRestore /> : <Archive />, onSelect: () => (ubah({ arsip: !r.arsip }), onArsip?.(!r.arsip)) },
    { type: 'separator' as const },
    { label: 'Hapus obrolan', icon: <MessageCircleX />, destructive: true, onSelect: onHapus },
  ];
}

/** Daftar ruang obrolan: pesan terakhir (didekripsi di perangkat), belum dibaca, sedang mengetik, sematan, bisu. */
export function DaftarObrolan({ aktif, onPilih, onHapus, className }: DaftarObrolanProps) {
  const { mesin, keadaan: k } = useObrolan();
  const [q, setQ] = React.useState('');
  const [arsip, setArsip] = React.useState<RuangObrolanData[] | null>(null);
  const [hapus, setHapus] = React.useState<RuangObrolanData | null>(null);
  const saya = k.saya?.id ?? '';
  const cocok = (r: RuangObrolanData) => !q.trim() || judulRuang(r, saya).toLowerCase().includes(q.trim().toLowerCase());
  const daftar = k.urutan.map((id) => k.ruang[id]).filter((r): r is RuangObrolanData => Boolean(r) && cocok(r));
  const daftarArsip = arsip?.map((r) => k.ruang[r.id]).filter((r): r is RuangObrolanData => Boolean(r) && r.arsip && cocok(r));

  const baris = (r: RuangObrolanData) => {
    const ketik = Object.keys(k.ketik[r.id] ?? {}).filter((p) => p !== saya);
    const p = r.pesan_terakhir;
    const menu = menuObrolan(
      mesin,
      r,
      () => setHapus(r),
      (a) => a && setArsip((x) => (x && !x.some((y) => y.id === r.id) ? [...x, r] : x)),
    );
    return (
      <MenuKonteks key={r.id} items={menu} className="u-ob-baris-bungkus">
        <button type="button" className="u-ob-baris" data-interaktif data-aktif={aktif === r.id ? '' : undefined} onClick={() => onPilih(r.id)}>
          <AvatarRuang r={r} saya={saya} />
          <span className="u-ob-baris-teks">
            <span className="u-ob-baris-atas">
              <span className="u-ob-baris-nama">{judulRuang(r, saya)}</span>
              {p && (
                <span className="u-ob-baris-waktu" data-belum={r.belum_dibaca > 0 && !r.bisu ? '' : undefined}>
                  {waktuSingkat(p.dibuat_at)}
                </span>
              )}
            </span>
            <span className="u-ob-baris-bawah">
              {ketik.length ? (
                <span className="u-ob-baris-sub" data-ketik>
                  {r.jenis === 'grup' ? `${namaDepan(r.anggota.find((a) => a.id === ketik[0])?.nama ?? '')} mengetik…` : 'mengetik…'}
                </span>
              ) : (
                <span className="u-ob-baris-sub">
                  {p?.status === 'tak_terbaca' && <Lock aria-hidden />}
                  {p?.status === 'menunggu' && <Hourglass aria-hidden />}
                  {p?.status === 'dihapus' && <Ban aria-hidden />}
                  {cuplikan(p, r, saya)}
                </span>
              )}
              <span className="u-ob-baris-ikon">
                {r.kedaluwarsa_detik > 0 && <Timer aria-label="Pesan menghilang" />}
                {r.bisu && <BellOff aria-label="Dibisukan" />}
                {r.sematkan && <Pin aria-label="Disematkan" />}
                {r.belum_dibaca > 0 && (
                  <span className="u-ob-lencana" data-bisu={r.bisu ? '' : undefined} aria-label={`${r.belum_dibaca} belum dibaca`}>
                    {r.belum_dibaca > 99 ? '99+' : r.belum_dibaca}
                  </span>
                )}
              </span>
            </span>
          </span>
        </button>
        <Menu
          items={menu}
          trigger={
            <button type="button" className="u-ob-baris-menu" aria-label={`Menu obrolan ${judulRuang(r, saya)}`}>
              <EllipsisVertical />
            </button>
          }
        />
      </MenuKonteks>
    );
  };

  return (
    <div className={cn('u-ob-daftar', className)}>
      <div className="u-ob-daftar-cari">
        <InputGroup start={<Search aria-hidden />} size="sm">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari obrolan" aria-label="Cari obrolan" />
        </InputGroup>
      </div>
      <div className="u-ob-daftar-isi">
        {k.status !== 'siap' && !k.urutan.length ? (
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="u-ob-baris" aria-hidden>
              <Skeleton shape="circle" width={40} height={40} />
              <div className="u-ob-baris-teks">
                <Skeleton width="55%" height={12} />
                <Skeleton width="80%" height={10} />
              </div>
            </div>
          ))
        ) : daftar.length === 0 && !q ? (
          <Empty
            icon={<MessageCircle />}
            title="Belum ada obrolan"
            description="Mulai obrolan dengan dosen, mahasiswa, atau staf. Pesan dan lampiran disimpan terenkripsi di server UNIPO. Hanya anggota obrolan yang bisa membukanya."
          />
        ) : daftar.length === 0 && !daftarArsip?.length ? (
          <p className="u-ob-petunjuk">Tidak ada obrolan yang cocok.</p>
        ) : (
          daftar.map(baris)
        )}
        {k.status === 'siap' &&
          (arsip === null ? (
            <button
              type="button"
              className="u-ob-tautan"
              onClick={() =>
                void mesin
                  .muatArsip()
                  .then(setArsip)
                  .catch(() => setArsip([]))
              }
            >
              <Archive aria-hidden /> Lihat obrolan yang diarsipkan
            </button>
          ) : (
            <>
              <p className="u-ob-subjudul">Diarsipkan</p>
              {daftarArsip?.length ? daftarArsip.map(baris) : <p className="u-ob-petunjuk">Tidak ada obrolan yang diarsipkan.</p>}
            </>
          ))}
      </div>
      <DialogBersihkan
        mode="hapus"
        ruangId={hapus?.id ?? ''}
        nama={hapus ? judulRuang(hapus, saya) : ''}
        grup={hapus?.jenis === 'grup'}
        open={hapus !== null}
        onOpenChange={(o) => !o && setHapus(null)}
        onSelesai={(id) => onHapus?.(id)}
      />
    </div>
  );
}

// ================================================================ Lampiran

type Berkas = NonNullable<IsiPesan['berkas']>[number];

/**
 * Salin lampiran (atau File yang baru dikirim) ke Berkas saya › Obrolan/<nama obrolan>. Hasil dan galat tampil sebagai
 * toast; tidak pernah melempar, jadi aman dipanggil tanpa ditunggu (mis. setelah pesan terkirim).
 */
function useSimpanKeBerkas() {
  const mesin = useMesin();
  const toast = useToast();
  const [proses, setProses] = React.useState(false);
  const simpan = React.useCallback(
    async (ruangId: string, berkas: Array<File | Berkas>, otomatis = false) => {
      if (!berkas.length) return;
      setProses(true);
      try {
        const { folder } = await mesin.simpanKeBerkas(ruangId, berkas);
        toast.add({
          type: 'success',
          title: otomatis ? 'Salinan disimpan ke Berkas saya' : berkas.length > 1 ? `${berkas.length} berkas disimpan ke Berkas saya` : 'Disimpan ke Berkas saya',
          description: `${folder}.`,
        });
      } catch (e) {
        toast.add({ type: 'warning', title: otomatis ? 'Pesan terkirim, salinan ke Berkas saya gagal' : 'Gagal menyimpan ke Berkas saya', description: pesanGalat(e) });
      } finally {
        setProses(false);
      }
    },
    [mesin, toast],
  );
  return { simpan, proses };
}

function useUrlLampiran(b: Berkas, aktif = true) {
  const mesin = useMesin();
  const [url, setUrl] = React.useState<string | null>(null);
  const [galat, setGalat] = React.useState(false);
  React.useEffect(() => {
    if (!aktif) return;
    let hidup = true;
    mesin
      .unduhBerkas(b)
      .then((u) => hidup && setUrl(u))
      .catch(() => hidup && setGalat(true));
    return () => void (hidup = false);
  }, [mesin, b, aktif]);
  return { url, galat };
}

function GambarLampiran({ b, onLihat }: { b: Berkas; onLihat: (b: Berkas) => void }) {
  const { url, galat } = useUrlLampiran(b);
  const rasio = b.lebar && b.tinggi ? `${b.lebar} / ${b.tinggi}` : '4 / 3';
  return (
    <button type="button" className="u-ob-gambar" style={{ aspectRatio: rasio }} onClick={() => url && onLihat(b)} aria-label={`Lihat ${b.nama}`}>
      {url ? (
        <img src={url} alt={b.nama} />
      ) : galat ? (
        <span className="u-ob-gambar-galat">
          <AlertTriangle aria-hidden /> Gagal membuka
        </span>
      ) : (
        <Spinner size="sm" />
      )}
    </button>
  );
}

function BerkasLampiran({ b, ruangId }: { b: Berkas; ruangId: string }) {
  const mesin = useMesin();
  const { simpan, proses } = useSimpanKeBerkas();
  const [memuat, setMemuat] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const unduh = async () => {
    setMemuat(true);
    setGalat(null);
    try {
      const u = await mesin.unduhBerkas(b);
      const a = document.createElement('a');
      a.href = u;
      a.download = b.nama;
      a.click();
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setMemuat(false);
    }
  };
  return (
    <div className="u-ob-berkas" title={galat ?? undefined}>
      <span className="u-ob-berkas-ikon" aria-hidden>
        <FileText />
      </span>
      <span className="u-ob-berkas-teks">
        <span className="u-ob-berkas-nama" title={b.nama}>
          {b.nama}
        </span>
        <span className="u-ob-berkas-sub">{galat ? 'Gagal mengunduh, coba lagi' : `${formatBytes(b.ukuran)} · ${(b.nama.split('.').pop() ?? '').toUpperCase()}`}</span>
      </span>
      <span className="u-ob-berkas-aksi">
        <Tooltip content="Unduh">
          <button type="button" className="u-ob-berkas-tombol" aria-label={`Unduh ${b.nama}`} disabled={memuat} onClick={(e) => (e.stopPropagation(), void unduh())}>
            {memuat ? <Spinner size="sm" /> : <Download aria-hidden />}
          </button>
        </Tooltip>
        <Tooltip content="Simpan ke Berkas saya">
          <button type="button" className="u-ob-berkas-tombol" aria-label={`Simpan ${b.nama} ke Berkas saya`} disabled={proses} onClick={(e) => (e.stopPropagation(), void simpan(ruangId, [b]))}>
            {proses ? <Spinner size="sm" /> : <FolderDown aria-hidden />}
          </button>
        </Tooltip>
      </span>
    </div>
  );
}

function LihatGambar({ b, ruangId, onTutup }: { b: Berkas | null; ruangId: string; onTutup: () => void }) {
  const { url } = useUrlLampiran(b ?? ({ id: '' } as Berkas), Boolean(b));
  const { simpan, proses } = useSimpanKeBerkas();
  return (
    <Dialog
      open={Boolean(b)}
      onOpenChange={(o) => !o && onTutup()}
      title={b?.nama ?? ''}
      size="xl"
      footer={
        url && b ? (
          <>
            <Button variant="ghost" loading={proses} onClick={() => void simpan(ruangId, [b])}>
              <FolderDown aria-hidden /> Simpan ke Berkas saya
            </Button>
            <Button render={<a href={url} download={b.nama} />} variant="outline">
              <Download aria-hidden /> Unduh
            </Button>
          </>
        ) : undefined
      }
    >
      {url && <img className="u-ob-lihat-gambar" src={url} alt={b?.nama ?? ''} />}
    </Dialog>
  );
}

// ================================================================ Gelembung pesan

interface GelembungProps {
  p: PesanObrolan;
  r: RuangObrolanData;
  saya: string;
  awalKelompok: boolean;
  akhirKelompok: boolean;
  dipilih: boolean;
  onPilih: () => void;
  onBalas: () => void;
  onUbah: () => void;
  onHapus: (untuk: 'saya' | 'semua') => void;
  onLihat: (b: Berkas) => void;
  onLompat: (uuid: string) => void;
}

function statusBaca(p: PesanObrolan, r: RuangObrolanData, saya: string): 'mengirim' | 'gagal' | 'menunggu' | 'terkirim' | 'diterima' | 'dibaca' {
  if (p.status === 'mengirim' || p.status === 'gagal') return p.status;
  const lain = r.anggota.filter((a) => a.id !== saya);
  if (!lain.length) return 'terkirim';
  if (lain.every((a) => (a.dibaca_sampai ?? 0) >= p.id)) return 'dibaca';
  if (lain.every((a) => (a.diterima_sampai ?? 0) >= p.id || (a.dibaca_sampai ?? 0) >= p.id)) return 'diterima';
  return 'terkirim';
}

const Gelembung = React.memo(function Gelembung({ p, r, saya, awalKelompok, akhirKelompok, dipilih, onPilih, onBalas, onUbah, onHapus, onLihat, onLompat }: GelembungProps) {
  const mesin = useMesin();
  const milikSaya = p.pengirim === saya;
  const pengirim = r.anggota.find((a) => a.id === p.pengirim);
  const nama = milikSaya ? 'Anda' : (pengirim?.nama ?? 'Mantan anggota');
  const isi = p.isi;
  const bisaAksi = p.status === 'terkirim' && Boolean(isi);
  const gambar = isi?.berkas?.filter((b) => b.mime.startsWith('image/') && b.mime !== 'image/svg+xml') ?? [];
  const lain = isi?.berkas?.filter((b) => !gambar.includes(b)) ?? [];
  const st = milikSaya && p.status !== 'dihapus' ? statusBaca(p, r, saya) : null;
  const [salin, setSalin] = React.useState(false);
  const { simpan } = useSimpanKeBerkas();

  const menu: MenuEntry[] = [
    { label: 'Balas', icon: <Reply />, onSelect: onBalas },
    ...(isi?.berkas?.length
      ? [{ label: isi.berkas.length > 1 ? `Simpan ${isi.berkas.length} lampiran ke Berkas saya` : 'Simpan ke Berkas saya', icon: <FolderDown />, onSelect: () => void simpan(r.id, isi.berkas ?? []) }]
      : []),
    ...(isi?.isi
      ? [
          {
            label: salin ? 'Tersalin' : 'Salin teks',
            icon: <Copy />,
            onSelect: () => void navigator.clipboard?.writeText(isi.isi ?? '').then(() => (setSalin(true), setTimeout(() => setSalin(false), 1500))),
          },
        ]
      : []),
    ...(milikSaya && isi?.t === 'teks' ? [{ label: 'Ubah', icon: <Pencil />, onSelect: onUbah }] : []),
    { type: 'separator' as const },
    { label: 'Hapus untuk saya', icon: <Trash2 />, destructive: true, onSelect: () => onHapus('saya') },
    // Pengirim dalam batas waktu (bawaan 60 menit), atau admin grup.
    ...(mesin.bolehHapusSemua(r.id, p) ? [{ label: 'Hapus untuk semua', icon: <Trash2 />, destructive: true, onSelect: () => onHapus('semua') }] : []),
  ];

  return (
    <div
      className="u-ob-pesan"
      data-saya={milikSaya ? '' : undefined}
      data-awal={awalKelompok ? '' : undefined}
      data-akhir={akhirKelompok ? '' : undefined}
      data-dipilih={dipilih ? '' : undefined}
      data-uuid={p.uuid}
    >
      {r.jenis === 'grup' && !milikSaya && <span className="u-ob-pesan-avatar">{akhirKelompok && <Avatar name={nama} size="sm" />}</span>}
      <div className="u-ob-pesan-kolom">
        <div className="u-ob-gelembung" data-status={p.status} data-gambar={gambar.length && !isi?.isi && !lain.length ? '' : undefined} onClick={onPilih}>
          {r.jenis === 'grup' && !milikSaya && awalKelompok && (
            <span className="u-ob-pengirim" style={{ color: `oklch(0.55 0.13 ${hue(p.pengirim)})` }}>
              {nama}
            </span>
          )}
          {p.status === 'dihapus' ? (
            <span className="u-ob-pesan-sistem">
              <Ban aria-hidden /> Pesan ini dihapus
            </span>
          ) : p.status === 'tak_terbaca' || p.status === 'menunggu' ? (
            <span className="u-ob-pesan-sistem">
              <Hourglass aria-hidden /> Pesan lama tidak tersedia
            </span>
          ) : isi ? (
            <>
              {isi.kutip && (
                <button
                  type="button"
                  className="u-ob-kutip"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isi.ke) onLompat(isi.ke);
                  }}
                >
                  <span className="u-ob-kutip-nama">{isi.kutip.pengirim === saya ? 'Anda' : (r.anggota.find((a) => a.id === isi.kutip!.pengirim)?.nama ?? '')}</span>
                  <span className="u-ob-kutip-isi">{isi.kutip.isi || 'Lampiran'}</span>
                </button>
              )}
              {gambar.length > 0 && (
                <div className="u-ob-galeri" data-jumlah={Math.min(gambar.length, 4)}>
                  {gambar.slice(0, 4).map((b) => (
                    <GambarLampiran key={b.id} b={b} onLihat={onLihat} />
                  ))}
                </div>
              )}
              {[...lain, ...gambar.slice(4)].map((b) => (
                <BerkasLampiran key={b.id} b={b} ruangId={r.id} />
              ))}
              {isi.isi && (
                <span className="u-ob-teks">
                  <PesanTeks teks={isi.isi} />
                </span>
              )}
            </>
          ) : null}
          <span className="u-ob-meta">
            {p.kedaluwarsa_at && <Timer aria-label="Pesan menghilang" />}
            {p.diubah && <span>diubah</span>}
            <time dateTime={p.dibuat_at}>{jam(p.dibuat_at)}</time>
            {st === 'mengirim' && <Clock aria-label="Mengirim" />}
            {st === 'terkirim' && <Check aria-label="Terkirim" />}
            {st === 'diterima' && <CheckCheck aria-label="Diterima" />}
            {st === 'dibaca' && <CheckCheck className="u-ob-meta-dibaca" aria-label="Dibaca" />}
          </span>
        </div>
        {p.reaksi && Object.keys(p.reaksi).length > 0 && (
          <div className="u-ob-reaksi">
            {Object.entries(p.reaksi).map(([e, siapa]) => (
              <button
                key={e}
                type="button"
                className="u-ob-reaksi-chip"
                aria-pressed={siapa.includes(saya)}
                title={siapa.map((s) => (s === saya ? 'Anda' : (r.anggota.find((a) => a.id === s)?.nama ?? s))).join(', ')}
                onClick={() => void mesin.reaksi(r.id, p, e).catch(() => {})}
              >
                {e}
                {siapa.length > 1 && <span>{siapa.length}</span>}
              </button>
            ))}
          </div>
        )}
        {p.status === 'gagal' && (
          <div className="u-ob-gagal" role="alert">
            <p className="u-ob-gagal-isi">
              <AlertTriangle aria-hidden />
              <span>
                <strong>Belum terkirim.</strong> {p.galat}
              </span>
            </p>
            <span className="u-ob-gagal-aksi">
              <button type="button" onClick={() => void mesin.kirimUlang(r.id, p).catch(() => {})}>
                <RotateCcw aria-hidden />
                Kirim ulang
              </button>
              <button type="button" onClick={() => mesin.buangGagal(r.id, p.uuid)}>
                <Trash2 aria-hidden />
                Hapus
              </button>
            </span>
          </div>
        )}
      </div>
      {bisaAksi && (
        <div className="u-ob-aksi" role="toolbar" aria-label="Aksi pesan">
          <Popover
            side="top"
            trigger={
              <button type="button" className="u-ob-aksi-tombol" aria-label="Beri reaksi">
                <SmilePlus />
              </button>
            }
          >
            <div className="u-ob-emoji">
              {EMOJI_CEPAT.map((e) => (
                <button key={e} type="button" aria-label={`Reaksi ${e}`} aria-pressed={p.reaksi?.[e]?.includes(saya)} onClick={() => void mesin.reaksi(r.id, p, e).catch(() => {})}>
                  {e}
                </button>
              ))}
            </div>
          </Popover>
          <button type="button" className="u-ob-aksi-tombol" aria-label="Balas" onClick={onBalas}>
            <Reply />
          </button>
          <Menu
            align={milikSaya ? 'end' : 'start'}
            items={menu}
            trigger={
              <button type="button" className="u-ob-aksi-tombol" aria-label="Aksi lain">
                <EllipsisVertical />
              </button>
            }
          />
        </div>
      )}
    </div>
  );
});

function hue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

// ================================================================ Nomor keamanan

/**
 * Nomor keamanan 60 angka dari kunci perangkat lama (enkripsi end-to-end sebelum 2026-11-17). Tidak dipakai lagi di
 * komponen obrolan sejak pesan dienkripsi di server; dipertahankan untuk kompatibilitas impor.
 * @deprecated
 */
export function NomorKeamanan({ pemilik, nama }: { pemilik: string; nama: string }) {
  const { mesin } = useObrolan();
  const [nomor, setNomor] = React.useState<string[] | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  React.useEffect(() => {
    let hidup = true;
    mesin
      .nomorKeamanan(pemilik)
      .then((n) => hidup && setNomor(n))
      .catch((e) => hidup && setGalat(pesanGalat(e)));
    return () => void (hidup = false);
  }, [mesin, pemilik]);
  if (galat) return <Alert variant="danger">{galat}</Alert>;
  return (
    <div className="u-ob-nomor">
      {nomor ? (
        <div className="u-ob-nomor-kisi" aria-label="Nomor keamanan">
          {nomor.map((g, i) => (
            <span key={i}>{g}</span>
          ))}
        </div>
      ) : (
        <Skeleton height={96} />
      )}
      <p className="u-ob-petunjuk">
        Bandingkan angka ini dengan layar {nama} (bertemu langsung atau lewat saluran lain). Bila sama, pesan Anda hanya bisa dibaca oleh kalian berdua. Angka berubah saat salah satu menambah atau
        mencabut perangkat.
      </p>
    </div>
  );
}

// ================================================================ Info ruang

function InfoRuang({ r, open, onOpenChange, onKeluar }: { r: RuangObrolanData; open: boolean; onOpenChange: (o: boolean) => void; onKeluar: () => void }) {
  const { mesin, keadaan: k } = useObrolan();
  const saya = k.saya?.id ?? '';
  const lawan = lawanDari(r, saya);
  const admin = r.peran_saya === 'admin';
  const [judul, setJudul] = React.useState(r.judul ?? '');
  const [tambah, setTambah] = React.useState(false);
  const [baru, setBaru] = React.useState<OrangObrolan[]>([]);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [blokir, setBlokir] = React.useState(false);
  const [keluar, setKeluar] = React.useState(false);
  React.useEffect(() => setJudul(r.judul ?? ''), [r.judul]);
  const jalan = (f: Promise<unknown>) => void f.then(() => setGalat(null)).catch((e) => setGalat(pesanGalat(e)));
  const [fotoProses, setFotoProses] = React.useState(false);
  const fotoRef = React.useRef<HTMLInputElement>(null);
  const kembaliRef = React.useRef<HTMLButtonElement>(null);
  const bolehFoto = r.jenis === 'grup' && admin;
  const gantiFoto = async (f: File | undefined) => {
    if (!f) return;
    setFotoProses(true);
    try {
      await mesin.gantiFoto(r.id, f);
      setGalat(null);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setFotoProses(false);
      if (fotoRef.current) fotoRef.current.value = '';
    }
  };
  React.useEffect(() => {
    if (open) kembaliRef.current?.focus();
  }, [open]);
  const judulPanel = r.jenis === 'grup' ? 'Info grup' : 'Info obrolan';

  return (
    <>
      {open && (
        <aside
          className="u-ob-info-panel"
          aria-label={judulPanel}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !e.defaultPrevented) (e.stopPropagation(), onOpenChange(false));
          }}
        >
          <header className="u-ob-info-panel-kepala">
            <Button ref={kembaliRef} variant="ghost" size="sm" iconOnly aria-label="Tutup info" onClick={() => onOpenChange(false)}>
              <X />
            </Button>
            <h3>{judulPanel}</h3>
          </header>
          <div className="u-ob-info">
            <div className="u-ob-info-kepala">
              {bolehFoto ? (
                <div className="u-ob-info-foto">
                  <button type="button" className="u-ob-info-foto-tombol" onClick={() => fotoRef.current?.click()} disabled={fotoProses} aria-label={r.foto ? 'Ganti foto grup' : 'Pasang foto grup'}>
                    <AvatarRuang r={r} saya={saya} size="xl" />
                    <span className="u-ob-info-foto-ikon" aria-hidden>
                      {fotoProses ? <Spinner size="sm" /> : <Camera />}
                    </span>
                  </button>
                  <input ref={fotoRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void gantiFoto(e.target.files?.[0])} />
                  {r.foto && (
                    <Button size="sm" variant="ghost" disabled={fotoProses} onClick={() => jalan(mesin.hapusFoto(r.id))}>
                      Hapus foto
                    </Button>
                  )}
                </div>
              ) : (
                <AvatarRuang r={r} saya={saya} size="xl" />
              )}
              {r.jenis === 'grup' && admin ? (
                <form
                  className="u-ob-info-judul"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (judul.trim() && judul.trim() !== r.judul) jalan(mesin.ubahRuang(r.id, { judul: judul.trim() }));
                  }}
                >
                  <Input value={judul} onChange={(e) => setJudul(e.target.value)} aria-label="Nama grup" maxLength={120} />
                  <Button type="submit" size="sm" variant="outline" disabled={!judul.trim() || judul.trim() === r.judul}>
                    Simpan
                  </Button>
                </form>
              ) : (
                <strong>{judulRuang(r, saya)}</strong>
              )}
              <span className="u-ob-baris-sub">
                {lawan ? `${lawan.peran}${lawan.daring ? ' · daring' : lawan.terakhir_aktif ? ` · ${terakhirAktif(lawan.terakhir_aktif)}` : ''}` : `${r.anggota.length} anggota`}
              </span>
            </div>
            {galat && <Alert variant="danger">{galat}</Alert>}

            <section className="u-ob-info-bagian">
              <h4>
                <ShieldCheck aria-hidden /> Keamanan
              </h4>
              <p className="u-ob-petunjuk">Pesan dan lampiran disimpan terenkripsi di server UNIPO. Hanya anggota obrolan yang bisa membukanya.</p>
            </section>

            <section className="u-ob-info-bagian">
              <h4>
                <Timer aria-hidden /> Pesan menghilang
              </h4>
              <SegmentedControl
                aria-label="Pesan menghilang"
                options={MENGHILANG}
                value={String(r.kedaluwarsa_detik)}
                onValueChange={(v) => (r.jenis === 'langsung' || admin) && jalan(mesin.ubahRuang(r.id, { kedaluwarsa_detik: Number(v) }))}
                fullWidth
              />
              <p className="u-ob-petunjuk">
                {r.jenis === 'grup' && !admin ? 'Hanya admin grup yang bisa mengubahnya. ' : ''}Berlaku untuk pesan baru; setelah waktunya lewat pesan disembunyikan dari semua anggota (tetap tersimpan terenkripsi di server).
              </p>
            </section>

            <section className="u-ob-info-bagian">
              <label className="u-ob-info-saklar">
                <span>
                  <BellOff aria-hidden /> Bisukan notifikasi
                </span>
                <Switch checked={r.bisu} onCheckedChange={(v) => jalan(mesin.ubahRuang(r.id, { bisu: v }))} />
              </label>
              <label className="u-ob-info-saklar">
                <span>
                  <Pin aria-hidden /> Sematkan di atas
                </span>
                <Switch checked={r.sematkan} onCheckedChange={(v) => jalan(mesin.ubahRuang(r.id, { sematkan: v }))} />
              </label>
            </section>

            {r.jenis === 'grup' && (
              <section className="u-ob-info-bagian">
                <div className="u-ob-info-baris-judul">
                  <h4>
                    <Users aria-hidden /> {r.anggota.length} anggota
                  </h4>
                  {admin && (
                    <Button size="sm" variant="ghost" onClick={() => (setBaru([]), setTambah(true))}>
                      <UserPlus aria-hidden /> Tambah
                    </Button>
                  )}
                </div>
                {r.anggota.map((a) => (
                  <div key={a.id} className="u-ob-baris">
                    <Avatar name={a.nama} size="sm" status={a.daring ? 'online' : undefined} />
                    <span className="u-ob-baris-teks">
                      <span className="u-ob-baris-nama">
                        {a.id === saya ? 'Anda' : a.nama}
                        {a.peran_ruang === 'admin' && <Badge variant="primary">Admin</Badge>}
                      </span>
                      <span className="u-ob-baris-sub">{a.peran}</span>
                    </span>
                    {admin && a.id !== saya && (
                      <Menu
                        items={[
                          { label: 'Kirim pesan', icon: <MessageCircle />, onSelect: () => bukaObrolan(a.id) },
                          a.peran_ruang === 'admin'
                            ? { label: 'Cabut admin', icon: <Users />, onSelect: () => jalan(mesin.aturAdmin(r.id, a.id, false)) }
                            : { label: 'Jadikan admin', icon: <ShieldCheck />, onSelect: () => jalan(mesin.aturAdmin(r.id, a.id, true)) },
                          { type: 'separator' },
                          { label: 'Keluarkan dari grup', icon: <LogOut />, destructive: true, onSelect: () => jalan(mesin.keluarkan(r.id, a.id)) },
                        ]}
                        trigger={
                          <Button size="sm" variant="ghost" iconOnly aria-label={`Kelola ${a.nama}`}>
                            <EllipsisVertical />
                          </Button>
                        }
                      />
                    )}
                  </div>
                ))}
              </section>
            )}

            <section className="u-ob-info-bagian u-ob-info-bahaya">
              {lawan ? (
                <Button variant="destructive-soft" onClick={() => setBlokir(true)}>
                  <Ban aria-hidden /> Blokir {namaDepan(lawan.nama)}
                </Button>
              ) : (
                <Button variant="destructive-soft" onClick={() => setKeluar(true)}>
                  <LogOut aria-hidden /> Keluar dari grup
                </Button>
              )}
            </section>
          </div>
        </aside>
      )}

      <Dialog
        open={tambah}
        onOpenChange={setTambah}
        title="Tambah anggota"
        description="Anggota baru tidak bisa membaca pesan sebelum mereka bergabung."
        footer={
          <Button
            disabled={!baru.length}
            onClick={() =>
              jalan(
                mesin
                  .tambahAnggota(
                    r.id,
                    baru.map((o) => o.id),
                  )
                  .then(() => setTambah(false)),
              )
            }
          >
            Tambah {baru.length || ''} anggota
          </Button>
        }
      >
        <DaftarPengguna pilihBanyak terpilih={baru} onTerpilihChange={setBaru} kecuali={r.anggota.map((a) => a.id)} autoFocus />
      </Dialog>

      {lawan && (
        <ConfirmDialog
          open={blokir}
          onOpenChange={setBlokir}
          title={`Blokir ${lawan.nama}?`}
          description="Ia tidak bisa mengirim pesan kepada Anda dan tidak melihat status daring Anda. Anda bisa membuka blokir di pengaturan obrolan."
          confirmLabel="Blokir"
          onConfirm={async () => {
            await mesin.blokir(lawan.id, true);
            onOpenChange(false);
          }}
        />
      )}
      <ConfirmDialog
        open={keluar}
        onOpenChange={setKeluar}
        title="Keluar dari grup?"
        description="Anda tidak menerima pesan baru dari grup ini. Pesan lama di perangkat ini ikut hilang."
        confirmLabel="Keluar dari grup"
        onConfirm={async () => {
          await mesin.keluarGrup(r.id);
          onOpenChange(false);
          onKeluar();
        }}
      />
    </>
  );
}

// ================================================================ RuangObrolan

export interface RuangObrolanProps {
  id: string;
  /** Tombol kembali (tampilan satu kolom). */
  onKembali?: () => void;
  /** Tombol tutup (panel mengambang). */
  onTutup?: () => void;
  className?: string;
}

/**
 * Satu ruang obrolan: gelembung pesan dengan pemisah tanggal, balas, ubah, hapus untuk semua, reaksi, tanda dibaca,
 * sedang mengetik, lampiran terenkripsi (seret/tempel), pesan menghilang, peringatan kunci berubah.
 */
export function RuangObrolan({ id, onKembali, onTutup, className }: RuangObrolanProps) {
  const { mesin, keadaan: k } = useObrolan();
  const r = k.ruang[id];
  const x = k.pesan[id];
  const saya = k.saya?.id ?? '';
  const siap = k.status === 'siap';
  const [galatMuat, setGalatMuat] = React.useState<string | null>(null);
  const [detak, setDetak] = React.useState(0);

  React.useEffect(() => {
    if (!siap) return;
    setGalatMuat(null);
    mesin.bukaRuang(id).catch((e) => setGalatMuat(pesanGalat(e)));
  }, [mesin, id, siap]);

  // Sembunyikan pesan menghilang tepat waktu.
  React.useEffect(() => {
    if (!r?.kedaluwarsa_detik && !x?.daftar.some((p) => p.kedaluwarsa_at)) return;
    const t = setInterval(() => setDetak((d) => d + 1), 30_000);
    return () => clearInterval(t);
  }, [r?.kedaluwarsa_detik, x]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pesan = React.useMemo(() => mesin.pesanTampil(id), [mesin, id, x, detak]);

  // ---------------------------------------------------------------- gulir
  const daftarRef = React.useRef<HTMLDivElement>(null);
  const dekatBawah = React.useRef(true);
  const tinggiSebelum = React.useRef<number | null>(null);
  const [diBawah, setDiBawah] = React.useState(true);
  const pertama = pesan[0]?.uuid;
  const terakhir = pesan[pesan.length - 1];

  React.useLayoutEffect(() => {
    const el = daftarRef.current;
    if (el && tinggiSebelum.current !== null) {
      el.scrollTop += el.scrollHeight - tinggiSebelum.current;
      tinggiSebelum.current = null;
    }
  }, [pertama]);

  const adaKetik = Object.keys(k.ketik[id] ?? {}).some((p) => p !== saya);
  React.useLayoutEffect(() => {
    const el = daftarRef.current;
    if (el && (dekatBawah.current || terakhir?.pengirim === saya)) el.scrollTop = el.scrollHeight;
  }, [terakhir?.uuid, terakhir?.status, saya, adaKetik]);

  React.useLayoutEffect(() => {
    dekatBawah.current = true;
    const el = daftarRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [id, x?.dimuat]);

  const keBawah = () => {
    const el = daftarRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  const onGulir = () => {
    const el = daftarRef.current;
    if (!el) return;
    const dekat = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    dekatBawah.current = dekat;
    if (dekat !== diBawah) setDiBawah(dekat);
    if (el.scrollTop < 160 && x?.lagi && !x.memuat) {
      tinggiSebelum.current = el.scrollHeight;
      void mesin.muatLebihLama(id);
    }
  };

  // ---------------------------------------------------------------- tandai dibaca
  React.useEffect(() => {
    if (!x?.dimuat || !diBawah) return;
    const tandai = () => document.visibilityState === 'visible' && mesin.tandaiBaca(id);
    tandai();
    document.addEventListener('visibilitychange', tandai);
    return () => document.removeEventListener('visibilitychange', tandai);
  }, [mesin, id, x?.dimuat, diBawah, terakhir?.uuid, r?.belum_dibaca]);

  // ---------------------------------------------------------------- penulis
  const [teks, setTeksMentah] = React.useState(() => draf.get(id) ?? '');
  const [balas, setBalas] = React.useState<PesanObrolan | null>(null);
  const [ubah, setUbah] = React.useState<PesanObrolan | null>(null);
  const [berkas, setBerkas] = React.useState<File[]>([]);
  const [unggah, setUnggah] = React.useState(false);
  const [galatKirim, setGalatKirim] = React.useState<string | null>(null);
  const [bersihkan, setBersihkan] = React.useState(false);
  const { simpan: simpanBerkas } = useSimpanKeBerkas();
  const [hapus, setHapus] = React.useState<{ p: PesanObrolan; untuk: 'saya' | 'semua' } | null>(null);
  const [hapusRuang, setHapusRuang] = React.useState(false);
  const toast = useToast();
  const [lihat, setLihat] = React.useState<Berkas | null>(null);
  const [info, setInfo] = React.useState(false);
  const [dipilih, setDipilih] = React.useState<string | null>(null);
  const [seret, setSeret] = React.useState(false);
  const areaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setTeksMentah(draf.get(id) ?? '');
    setBalas(null);
    setUbah(null);
    setBerkas([]);
    setGalatKirim(null);
  }, [id]);

  const setTeks = (v: string) => {
    setTeksMentah(v);
    if (!ubah) draf.set(id, v);
  };

  React.useLayoutEffect(() => {
    const a = areaRef.current;
    if (!a) return;
    a.style.height = 'auto';
    a.style.height = `${Math.min(a.scrollHeight, 160)}px`;
  }, [teks]);

  const fokus = () => requestAnimationFrame(() => areaRef.current?.focus());

  const tambahBerkas = (daftar: FileList | File[] | null) => {
    if (!daftar) return;
    const l = Array.from(daftar);
    if (!l.length) return;
    setBerkas((b) => [...b, ...l].slice(0, 10));
    setUbah(null);
    fokus();
  };

  const kirim = async () => {
    const t = teks.trim();
    setGalatKirim(null);
    if (ubah) {
      if (!t || t === ubah.isi?.isi) return (setUbah(null), setTeksMentah(draf.get(id) ?? ''));
      const target = ubah;
      setUbah(null);
      setTeksMentah(draf.get(id) ?? '');
      return void mesin.ubahPesan(id, target, t).catch((e) => setGalatKirim(pesanGalat(e)));
    }
    if (!t && !berkas.length) return;
    const b = balas ?? undefined;
    setBalas(null);
    setTeks('');
    dekatBawah.current = true;
    if (berkas.length) {
      const f = berkas;
      setBerkas([]);
      setUnggah(true);
      try {
        await mesin.kirimBerkas(id, f, t, b);
        // Salinan ke Berkas saya setelah terkirim, tanpa ditunggu: gagal menyimpan tidak menghalangi pengiriman.
        if (mesin.keadaan.setelan.simpan_kirim) void simpanBerkas(id, f, true);
      } catch (e) {
        if (!x?.daftar.some((p) => p.status === 'gagal')) setGalatKirim(pesanGalat(e));
        setBerkas(f);
      } finally {
        setUnggah(false);
      }
      return;
    }
    void mesin.kirimTeks(id, t, b).catch(() => {});
  };

  if (!r) {
    return (
      <div className={cn('u-ob-ruang', className)}>
        <Empty
          icon={<MessageCircle />}
          title={siap ? 'Obrolan tidak ditemukan' : 'Memuat obrolan…'}
          description={siap ? 'Mungkin Anda sudah keluar dari obrolan ini.' : undefined}
          actions={
            onKembali && (
              <Button variant="outline" onClick={onKembali}>
                Kembali
              </Button>
            )
          }
        />
      </div>
    );
  }

  const lawan = lawanDari(r, saya);
  const ketik = Object.keys(k.ketik[id] ?? {}).filter((p) => p !== saya);
  const namaKetik = ketik.map((p) => namaDepan(r.anggota.find((a) => a.id === p)?.nama ?? ''));
  const subjudul = ketik.length
    ? r.jenis === 'grup'
      ? `${namaKetik.join(', ')} mengetik…`
      : 'mengetik…'
    : lawan
      ? lawan.daring
        ? 'daring'
        : terakhirAktif(lawan.terakhir_aktif) || lawan.peran
      : r.anggota.map((a) => (a.id === saya ? 'Anda' : namaDepan(a.nama))).join(', ');

  const menuDasar = menuObrolan(mesin, r, () => setHapusRuang(true));
  const menuRuang: MenuEntry[] = [
    { label: r.jenis === 'grup' ? 'Info grup' : 'Info obrolan', icon: <Info />, onSelect: () => setInfo(true) },
    ...menuDasar.slice(0, -1),
    { label: 'Bersihkan obrolan', icon: <Eraser />, destructive: true, onSelect: () => setBersihkan(true) },
    menuDasar[menuDasar.length - 1],
  ];

  // Kelompokkan: pemisah tanggal + gelembung berurutan dari pengirim sama dalam 5 menit.
  const isi: React.ReactNode[] = [];
  let hariLalu = '';
  pesan.forEach((p, i) => {
    const d = tgl(p.dibuat_at);
    const kunciHari = d.toDateString();
    if (kunciHari !== hariLalu) {
      isi.push(
        <div key={`t-${kunciHari}`} className="u-ob-pemisah" role="separator">
          <span>{labelTanggal(d)}</span>
        </div>,
      );
      hariLalu = kunciHari;
    }
    if (p.isi?.t === 'sistem' && p.status === 'terkirim') {
      isi.push(
        <div key={p.uuid} className="u-ob-pemisah u-ob-sistem" role="note" data-uuid={p.uuid}>
          <span>{p.isi.isi}</span>
        </div>,
      );
      return;
    }
    const sebelum = pesan[i - 1];
    const sesudah = pesan[i + 1];
    const sambung = (a?: PesanObrolan, b?: PesanObrolan) =>
      Boolean(a && b && a.pengirim === b.pengirim && hariSama(tgl(a.dibuat_at), tgl(b.dibuat_at)) && Math.abs(tgl(b.dibuat_at).getTime() - tgl(a.dibuat_at).getTime()) < 300_000);
    isi.push(
      <Gelembung
        key={p.uuid}
        p={p}
        r={r}
        saya={saya}
        awalKelompok={!sambung(sebelum, p)}
        akhirKelompok={!sambung(p, sesudah)}
        dipilih={dipilih === p.uuid}
        onPilih={() => setDipilih((d) => (d === p.uuid ? null : p.uuid))}
        onBalas={() => (setUbah(null), setBalas(p), fokus())}
        onUbah={() => (setBalas(null), setBerkas([]), setUbah(p), setTeksMentah(p.isi?.isi ?? ''), fokus())}
        onHapus={(untuk) => setHapus({ p, untuk })}
        onLihat={setLihat}
        onLompat={(u) => {
          const el = daftarRef.current?.querySelector<HTMLElement>(`[data-uuid="${u}"]`);
          if (!el) return;
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          el.dataset.sorot = '';
          setTimeout(() => delete el.dataset.sorot, 1600);
        }}
      />,
    );
  });

  return (
    <div
      className={cn('u-ob-ruang', className)}
      data-seret={seret ? '' : undefined}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) (e.preventDefault(), setSeret(true));
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setSeret(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setSeret(false);
        tambahBerkas(e.dataTransfer.files);
      }}
    >
      <header className="u-ob-kepala">
        {onKembali && (
          <Button className="u-ob-kembali" variant="ghost" size="sm" iconOnly aria-label="Kembali ke daftar obrolan" onClick={onKembali}>
            <ArrowLeft />
          </Button>
        )}
        <button type="button" className="u-ob-kepala-identitas" onClick={() => setInfo(true)}>
          <AvatarRuang r={r} saya={saya} />
          <span className="u-ob-baris-teks">
            <span className="u-ob-baris-nama">{judulRuang(r, saya)}</span>
            <span className="u-ob-baris-sub" data-ketik={ketik.length ? '' : undefined} data-daring={lawan?.daring && !ketik.length ? '' : undefined}>
              {subjudul}
            </span>
          </span>
        </button>
        <Tooltip content="Info obrolan">
          <Button variant="ghost" size="sm" iconOnly aria-label="Info obrolan" onClick={() => setInfo(true)}>
            <Lock />
          </Button>
        </Tooltip>
        <Menu
          items={menuRuang}
          trigger={
            <Button variant="ghost" size="sm" iconOnly aria-label="Menu obrolan">
              <EllipsisVertical />
            </Button>
          }
        />
        {onTutup && (
          <Button variant="ghost" size="sm" iconOnly aria-label="Tutup obrolan" onClick={onTutup}>
            <X />
          </Button>
        )}
      </header>

      <div className="u-ob-pesan-daftar" ref={daftarRef} onScroll={onGulir} role="log" aria-live="polite" aria-label={`Pesan dengan ${judulRuang(r, saya)}`}>
        {x?.memuat && (
          <div className="u-ob-memuat">
            <Spinner size="sm" />
          </div>
        )}
        {x?.dimuat && !x.lagi && (
          <div className="u-ob-sambut">
            <Lock aria-hidden />
            <p>Pesan dan lampiran disimpan terenkripsi di server UNIPO. Hanya anggota obrolan yang bisa membukanya.</p>
          </div>
        )}
        {r.kedaluwarsa_detik > 0 && (
          <div className="u-ob-sambut" data-kecil>
            <Timer aria-hidden />
            <p>Pesan menghilang aktif: pesan baru terhapus {labelMenghilang(r.kedaluwarsa_detik)} setelah dikirim.</p>
          </div>
        )}
        {galatMuat && (
          <Alert
            variant="danger"
            actions={
              <Button size="sm" variant="outline" onClick={() => (setGalatMuat(null), mesin.bukaRuang(id).catch((e) => setGalatMuat(pesanGalat(e))))}>
                Coba lagi
              </Button>
            }
          >
            {galatMuat}
          </Alert>
        )}
        {!x?.dimuat && !galatMuat && (
          <div className="u-ob-kerangka" aria-hidden>
            {[60, 40, 72, 35].map((w, i) => (
              <Skeleton key={i} width={`${w}%`} height={34} className={i % 2 ? 'u-ob-kerangka-saya' : undefined} />
            ))}
          </div>
        )}
        {isi}
        {ketik.length > 0 && (
          <div className="u-ob-pesan">
            <div className="u-ob-gelembung u-ob-ketik" aria-label={`${namaKetik.join(', ')} sedang mengetik`}>
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>

      {!diBawah && (
        <button type="button" className="u-ob-ke-bawah" onClick={keBawah} aria-label="Ke pesan terbaru">
          <ArrowDown />
          {r.belum_dibaca > 0 && <span className="u-ob-lencana">{r.belum_dibaca}</span>}
        </button>
      )}

      <footer className="u-ob-penulis">
        {galatKirim && (
          <Alert variant="danger" className="u-ob-galat-kirim">
            {galatKirim}
          </Alert>
        )}
        {(balas || ubah) && (
          <div className="u-ob-konteks">
            {ubah ? <Pencil aria-hidden /> : <Reply aria-hidden />}
            <span className="u-ob-baris-teks">
              <span className="u-ob-kutip-nama">{ubah ? 'Ubah pesan' : `Membalas ${balas!.pengirim === saya ? 'diri sendiri' : (r.anggota.find((a) => a.id === balas!.pengirim)?.nama ?? '')}`}</span>
              <span className="u-ob-kutip-isi">{(ubah ?? balas)!.isi?.isi || (ubah ?? balas)!.isi?.berkas?.map((b) => b.nama).join(', ')}</span>
            </span>
            <Button
              variant="ghost"
              size="xs"
              iconOnly
              aria-label="Batal"
              onClick={() => {
                if (ubah) setTeksMentah(draf.get(id) ?? '');
                setBalas(null);
                setUbah(null);
              }}
            >
              <X />
            </Button>
          </div>
        )}
        {berkas.length > 0 && (
          <div className="u-ob-antrean">
            {berkas.map((f, i) => (
              <span key={`${f.name}-${i}`} className="u-ob-chip" data-terpilih>
                {f.type.startsWith('image/') ? <img src={URL.createObjectURL(f)} alt="" onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)} /> : <FileText aria-hidden />}
                <span className="u-ob-antrean-nama">{f.name}</span>
                <button type="button" aria-label={`Buang ${f.name}`} onClick={() => setBerkas((b) => b.filter((_, j) => j !== i))} disabled={unggah}>
                  <X aria-hidden />
                </button>
              </span>
            ))}
          </div>
        )}
        <form
          className="u-ob-penulis-baris"
          onSubmit={(e) => {
            e.preventDefault();
            void kirim();
          }}
        >
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => (tambahBerkas(e.target.files), (e.target.value = ''))} />
          <Tooltip content={`Lampirkan berkas (maks. ${k.lampiranMb} MB)`}>
            <Button type="button" variant="ghost" size="sm" iconOnly aria-label="Lampirkan berkas" onClick={() => fileRef.current?.click()} disabled={Boolean(ubah) || unggah || !siap}>
              <Paperclip />
            </Button>
          </Tooltip>
          <textarea
            ref={areaRef}
            className="u-ob-masukan"
            rows={1}
            value={teks}
            placeholder={berkas.length ? 'Tambahkan keterangan' : 'Tulis pesan'}
            aria-label="Tulis pesan"
            disabled={!siap}
            onChange={(e) => {
              setTeks(e.target.value);
              if (e.target.value) mesin.ketik(id);
            }}
            onPaste={(e) => {
              if (e.clipboardData.files.length) (e.preventDefault(), tambahBerkas(e.clipboardData.files));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia('(hover: hover)').matches) {
                e.preventDefault();
                void kirim();
              } else if (e.key === 'Escape' && (balas || ubah)) {
                if (ubah) setTeksMentah(draf.get(id) ?? '');
                setBalas(null);
                setUbah(null);
              } else if (e.key === 'ArrowUp' && !teks) {
                const akhir = [...pesan].reverse().find((p) => p.pengirim === saya && p.isi?.t === 'teks' && p.status === 'terkirim');
                if (akhir) (e.preventDefault(), setUbah(akhir), setTeksMentah(akhir.isi?.isi ?? ''));
              }
            }}
          />
          <Button type="submit" size="sm" iconOnly aria-label={ubah ? 'Simpan perubahan' : 'Kirim'} disabled={!siap || unggah || (!teks.trim() && !berkas.length)} loading={unggah}>
            {ubah ? <Check /> : <Send />}
          </Button>
        </form>
      </footer>

      {seret && (
        <div className="u-ob-seret" aria-hidden>
          <Paperclip />
          Lepas untuk melampirkan
        </div>
      )}

      <InfoRuang r={r} open={info} onOpenChange={setInfo} onKeluar={() => onKembali?.()} />
      <LihatGambar b={lihat} ruangId={id} onTutup={() => setLihat(null)} />
      <DialogBersihkan ruangId={id} nama={judulRuang(r, saya)} open={bersihkan} onOpenChange={setBersihkan} />
      <DialogBersihkan mode="hapus" ruangId={id} nama={judulRuang(r, saya)} grup={r.jenis === 'grup'} open={hapusRuang} onOpenChange={setHapusRuang} onSelesai={() => onKembali?.()} />
      <ConfirmDialog
        open={Boolean(hapus)}
        onOpenChange={(o) => !o && setHapus(null)}
        title={hapus?.untuk === 'semua' ? 'Hapus pesan untuk semua?' : 'Hapus pesan untuk saya?'}
        description={
          hapus?.untuk === 'semua'
            ? 'Pesan dan lampirannya hilang dari tampilan semua anggota dan diganti tulisan "Pesan ini dihapus".'
            : 'Pesan hilang dari akun Anda di semua perangkat. Anggota lain tetap melihatnya.'
        }
        confirmLabel={hapus?.untuk === 'semua' ? 'Hapus untuk semua' : 'Hapus untuk saya'}
        onConfirm={async () => {
          if (!hapus) return;
          try {
            if (hapus.untuk === 'semua') await mesin.hapusPesan(id, hapus.p);
            else await mesin.hapusUntukSaya(id, hapus.p);
          } catch (e) {
            toast.add({ type: 'error', title: 'Pesan tidak bisa dihapus', description: pesanGalat(e) });
          }
          setHapus(null);
        }}
      />
    </div>
  );
}

// ================================================================ Bersihkan obrolan

/**
 * Konfirmasi "Bersihkan obrolan" (riwayat hilang hanya untuk akun ini) atau, dengan `mode="hapus"`, "Hapus obrolan"
 * (riwayat hilang dan obrolan keluar dari daftar sampai ada pesan baru; grup: sekaligus keluar). Lampiran bisa disimpan
 * dulu ke Berkas saya. Tidak ada yang dihapus permanen.
 */
function DialogBersihkan({
  mode = 'bersihkan',
  ruangId,
  nama,
  grup,
  open,
  onOpenChange,
  onSelesai,
}: {
  mode?: 'bersihkan' | 'hapus';
  ruangId: string;
  nama: string;
  grup?: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelesai?: (ruangId: string) => void;
}) {
  const hapus = mode === 'hapus';
  const mesin = useMesin();
  const toast = useToast();
  const [info, setInfo] = React.useState<{ pesan: number; lampiran: number; sudah_disimpan: number; tidak_bisa_disimpan: number } | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [lampiran, setLampiran] = React.useState<'simpan' | 'hapus'>('simpan');
  const [proses, setProses] = React.useState(false);
  React.useEffect(() => {
    if (!open || !ruangId) return;
    setInfo(null);
    setGalat(null);
    setLampiran('simpan');
    mesin
      .infoBersihkan(ruangId)
      .then(setInfo)
      .catch((e) => setGalat(pesanGalat(e)));
  }, [open, ruangId, mesin]);
  const belum = info ? Math.max(0, info.lampiran - info.sudah_disimpan - info.tidak_bisa_disimpan) : 0;
  const jalan = async () => {
    setProses(true);
    try {
      const simpan = info !== null && info.lampiran > 0 && lampiran === 'simpan';
      const r = hapus ? await mesin.hapusRuang(ruangId, simpan) : await mesin.bersihkan(ruangId, simpan);
      toast.add({
        type: 'success',
        title: hapus ? 'Obrolan dihapus' : 'Obrolan dibersihkan',
        description: r.disimpan
          ? `${r.disimpan} lampiran disimpan ke Berkas saya › Obrolan/${nama}.`
          : hapus
            ? 'Obrolan hilang dari daftar Anda; anggota lain tidak terpengaruh.'
            : 'Riwayat hilang dari akun Anda; anggota lain tetap melihatnya.',
      });
      onOpenChange(false);
      onSelesai?.(ruangId);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setProses(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !proses && onOpenChange(o)}
      title={hapus ? 'Hapus obrolan?' : 'Bersihkan obrolan?'}
      size="sm"
      footer={
        <div className="u-ob-bersih-aksi">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={proses}>
            Batal
          </Button>
          <Button variant="destructive" onClick={() => void jalan()} loading={proses} disabled={!info}>
            {hapus ? 'Hapus obrolan' : 'Bersihkan obrolan'}
          </Button>
        </div>
      }
    >
      <div className="u-ob-bersih">
        {hapus ? (
          <p className="u-ob-petunjuk">
            Obrolan {grup ? 'grup' : 'dengan'} <b>{nama}</b> hilang dari daftar Anda di semua perangkat{grup ? ' dan Anda keluar dari grup' : ''}.{' '}
            {grup ? 'Anggota lain tetap melihat riwayatnya.' : 'Bila ada pesan baru, obrolan muncul lagi hanya dengan pesan baru itu. Anggota lain tidak terpengaruh.'}
          </p>
        ) : (
          <p className="u-ob-petunjuk">
            Semua pesan di obrolan dengan <b>{nama}</b> hilang dari akun Anda di semua perangkat. Anggota lain tetap melihatnya. Pesan tidak dihapus permanen dari server.
          </p>
        )}
        {galat && <Alert variant="danger">{galat}</Alert>}
        {!info && !galat ? (
          <Skeleton height={64} />
        ) : info && info.lampiran > 0 ? (
          <fieldset className="u-ob-bersih-pilih">
            <legend>
              {info.lampiran} lampiran di obrolan ini{info.sudah_disimpan ? ` (${info.sudah_disimpan} sudah ada di Berkas saya)` : ''}
            </legend>
            <label data-aktif={lampiran === 'simpan' ? '' : undefined}>
              <input type="radio" name="lampiran" checked={lampiran === 'simpan'} onChange={() => setLampiran('simpan')} />
              <span>
                <strong>{hapus ? 'Simpan ke Berkas saya' : 'Simpan lampiran ke Berkas saya'}</strong>
                <small>
                  {belum ? `${belum} lampiran disalin ke Berkas saya › Obrolan/${nama}.` : 'Semua lampiran yang bisa disalin sudah ada di Berkas saya.'}
                  {info.tidak_bisa_disimpan ? ` ${info.tidak_bisa_disimpan} lampiran lama tidak bisa disalin.` : ''}
                </small>
              </span>
            </label>
            <label data-aktif={lampiran === 'hapus' ? '' : undefined}>
              <input type="radio" name="lampiran" checked={lampiran === 'hapus'} onChange={() => setLampiran('hapus')} />
              <span>
                <strong>{hapus ? 'Hapus lampiran juga (hanya dari tampilan Anda)' : 'Hapus lampiran juga'}</strong>
                <small>Lampiran ikut hilang dari tampilan Anda (tidak disalin).</small>
              </span>
            </label>
          </fieldset>
        ) : null}
      </div>
    </Dialog>
  );
}

// ================================================================ Pengaturan

export interface PengaturanObrolanProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab?: 'privasi' | 'berkas' | 'blokir';
}

/** Privasi (status daring, tanda dibaca), salinan lampiran ke Berkas saya, dan daftar blokir. */
export function PengaturanObrolan({ open, onOpenChange, tab: tabAwal = 'privasi' }: PengaturanObrolanProps) {
  const { mesin, keadaan: k } = useObrolan();
  const [tab, setTab] = React.useState(tabAwal);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [blokir, setBlokir] = React.useState<Array<{ id: string; nama: string; peran: string }> | null>(null);
  const [proses, setProses] = React.useState<string | null>(null);
  const [berhasil, setBerhasil] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setTab(tabAwal);
    setGalat(null);
    setBerhasil(null);
    mesin
      .daftarBlokir()
      .then(setBlokir)
      .catch(() => setBlokir([]));
  }, [open, tabAwal, mesin]);

  const jalan = async (nama: string, f: () => Promise<unknown>, ok?: string) => {
    setProses(nama);
    setGalat(null);
    setBerhasil(null);
    try {
      await f();
      if (ok) setBerhasil(ok);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setProses(null);
    }
  };

  return (
    <Dialog side="right" open={open} onOpenChange={onOpenChange} title="Pengaturan obrolan" size="md">
      {galat && <Alert variant="danger">{galat}</Alert>}
      {berhasil && <Alert variant="success">{berhasil}</Alert>}
      <Tabs
        value={tab}
        onValueChange={(v) => (setTab(v), setGalat(null), setBerhasil(null))}
        items={[
          {
            value: 'privasi',
            label: 'Privasi',
            content: (
              <div className="u-ob-atur">
                <label className="u-ob-info-saklar">
                  <span>
                    <strong>Tampilkan status daring</strong>
                    <small>Bila dimatikan, Anda juga tidak melihat status daring orang lain.</small>
                  </span>
                  <Switch checked={k.setelan.tampil_daring} onCheckedChange={(v) => void jalan('setelan', () => mesin.simpanSetelan({ tampil_daring: v }))} />
                </label>
                <label className="u-ob-info-saklar">
                  <span>
                    <strong>Tanda dibaca</strong>
                    <small>Bila dimatikan, Anda juga tidak melihat tanda dibaca orang lain. Tanda dibaca di grup selalu aktif.</small>
                  </span>
                  <Switch checked={k.setelan.tanda_baca} onCheckedChange={(v) => void jalan('setelan', () => mesin.simpanSetelan({ tanda_baca: v }))} />
                </label>
              </div>
            ),
          },
          {
            value: 'berkas',
            label: 'Berkas',
            content: (
              <div className="u-ob-atur">
                <label className="u-ob-info-saklar">
                  <span>
                    <strong>Simpan otomatis berkas yang saya kirim</strong>
                    <small>Setiap berkas yang Anda kirim juga disalin ke Berkas saya › Obrolan › nama obrolan. Pesan tetap terkirim walau penyalinan gagal.</small>
                  </span>
                  <Switch checked={k.setelan.simpan_kirim} onCheckedChange={(v) => void jalan('setelan', () => mesin.simpanSetelan({ simpan_kirim: v }))} />
                </label>
                <Alert variant="info" icon={<FolderDown />}>
                  Salinan di Berkas saya mengikuti aturan dan enkripsi manajer berkas (ruang pribadi Anda).
                </Alert>
                <p className="u-ob-petunjuk">Berkas dari orang lain bisa disimpan lewat tombol Simpan ke Berkas saya pada lampiran atau menu pesan.</p>
              </div>
            ),
          },
          {
            value: 'blokir',
            label: 'Diblokir',
            count: blokir?.length || undefined,
            content: (
              <div className="u-ob-atur">
                {blokir === null ? (
                  <Skeleton height={48} />
                ) : blokir.length === 0 ? (
                  <p className="u-ob-petunjuk">Tidak ada yang Anda blokir.</p>
                ) : (
                  blokir.map((o) => (
                    <div key={o.id} className="u-ob-baris">
                      <Avatar name={o.nama} size="sm" />
                      <span className="u-ob-baris-teks">
                        <span className="u-ob-baris-nama">{o.nama}</span>
                        <span className="u-ob-baris-sub">{o.peran}</span>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        loading={proses === o.id}
                        onClick={() => void jalan(o.id, async () => (await mesin.blokir(o.id, false), setBlokir((b) => b?.filter((x) => x.id !== o.id) ?? null)))}
                      >
                        Buka blokir
                      </Button>
                    </div>
                  ))
                )}
              </div>
            ),
          },
        ]}
      />
    </Dialog>
  );
}

// ================================================================ Panel (dipakai KotakObrolan & ChatMengambang)

type Layar = 'daftar' | 'baru' | 'grup';

function PanelObrolan({
  mode,
  aktif,
  setAktif,
  onTutup,
  judul = 'Obrolan',
}: {
  mode: 'ganda' | 'tunggal';
  aktif: string | null;
  setAktif: (id: string | null) => void;
  onTutup?: () => void;
  judul?: React.ReactNode;
}) {
  const { mesin, keadaan: k } = useObrolan();
  const [layar, setLayar] = React.useState<Layar>('daftar');
  const [atur, setAtur] = React.useState<PengaturanObrolanProps['tab'] | null>(null);
  const [judulGrup, setJudulGrup] = React.useState('');
  const [anggota, setAnggota] = React.useState<OrangObrolan[]>([]);
  const [proses, setProses] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);

  const mulai = async (f: () => Promise<string>) => {
    setProses(true);
    setGalat(null);
    try {
      const id = await f();
      setLayar('daftar');
      setAktif(id);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setProses(false);
    }
  };

  const tutup = onTutup && (
    <Button variant="ghost" size="sm" iconOnly aria-label="Tutup obrolan" onClick={onTutup}>
      <X />
    </Button>
  );

  let sisi: React.ReactNode;
  if (layar === 'baru' || layar === 'grup') {
    sisi = (
      <div className="u-ob-sisi-isi">
        <header className="u-ob-kepala">
          <Button variant="ghost" size="sm" iconOnly aria-label="Kembali" onClick={() => (setLayar('daftar'), setGalat(null))}>
            <ArrowLeft />
          </Button>
          <h3 className="u-ob-judul">{layar === 'baru' ? 'Obrolan baru' : 'Grup baru'}</h3>
          {tutup}
        </header>
        <div className="u-ob-sisi-badan">
          {galat && <Alert variant="danger">{galat}</Alert>}
          {layar === 'baru' ? (
            <>
              {k.saya?.jenis !== 'pendaftar' && (
                <button type="button" className="u-ob-baris" data-interaktif onClick={() => (setAnggota([]), setJudulGrup(''), setLayar('grup'))}>
                  <span className="u-ob-avatar-grup" data-size="md" data-nada="primer" aria-hidden>
                    <Users />
                  </span>
                  <span className="u-ob-baris-teks">
                    <span className="u-ob-baris-nama">Grup baru</span>
                    <span className="u-ob-baris-sub">Kelas, organisasi, atau tim kerja</span>
                  </span>
                </button>
              )}
              <DaftarPengguna autoFocus onPilih={(o) => void mulai(() => mesin.mulaiLangsung(o.id))} />
            </>
          ) : (
            <>
              <Field label="Nama grup">
                <Input value={judulGrup} onChange={(e) => setJudulGrup(e.target.value)} placeholder="Mis. Kelas Basis Data A" maxLength={120} autoFocus />
              </Field>
              <DaftarPengguna pilihBanyak terpilih={anggota} onTerpilihChange={setAnggota} />
              <Button
                fullWidth
                loading={proses}
                disabled={!judulGrup.trim() || !anggota.length}
                onClick={() =>
                  void mulai(() =>
                    mesin.buatGrup(
                      judulGrup.trim(),
                      anggota.map((o) => o.id),
                    ),
                  )
                }
              >
                Buat grup ({anggota.length + 1} anggota)
              </Button>
            </>
          )}
        </div>
      </div>
    );
  } else {
    sisi = (
      <div className="u-ob-sisi-isi">
        <header className="u-ob-kepala">
          <h3 className="u-ob-judul">
            {judul}
            <Tooltip content={k.terhubung ? 'Tersambung, pesan masuk seketika' : 'Menyambung ulang…'}>
              <span className="u-ob-sinyal" data-hidup={k.terhubung ? '' : undefined} aria-label={k.terhubung ? 'Tersambung' : 'Menyambung ulang'} />
            </Tooltip>
          </h3>
          <Tooltip content="Obrolan baru">
            <Button variant="ghost" size="sm" iconOnly aria-label="Obrolan baru" onClick={() => setLayar('baru')} disabled={k.status !== 'siap'}>
              <MessageSquarePlus />
            </Button>
          </Tooltip>
          <Tooltip content="Pengaturan obrolan">
            <Button variant="ghost" size="sm" iconOnly aria-label="Pengaturan obrolan" onClick={() => setAtur('privasi')} disabled={k.status !== 'siap'}>
              <Settings />
            </Button>
          </Tooltip>
          {tutup}
        </header>
        {(k.status === 'galat' || k.status === 'tidak_didukung') && (
          <Alert
            variant="danger"
            className="u-ob-sisi-alert"
            actions={
              k.status === 'galat' && (
                <Button size="sm" variant="outline" onClick={() => void mesin.ulang()}>
                  <RotateCcw aria-hidden /> Coba lagi
                </Button>
              )
            }
          >
            {k.galat}
          </Alert>
        )}
        <DaftarObrolan aktif={aktif} onPilih={setAktif} onHapus={(id) => id === aktif && setAktif(null)} />
        <p className="u-ob-kaki">
          <Lock aria-hidden /> Terenkripsi di server UNIPO
        </p>
      </div>
    );
  }

  return (
    <div className="u-ob" data-mode={mode}>
      <div className="u-ob-isi" data-aktif={aktif ? '' : undefined}>
        <div className="u-ob-sisi">{sisi}</div>
        <div className="u-ob-utama">
          {aktif ? (
            <RuangObrolan key={aktif} id={aktif} onKembali={() => setAktif(null)} onTutup={mode === 'tunggal' ? onTutup : undefined} />
          ) : (
            <Empty
              className="u-ob-kosong"
              icon={<ShieldCheck />}
              title="Obrolan aman SIAKAD"
              description="Pilih obrolan atau mulai yang baru. Pesan dan lampiran disimpan terenkripsi di server UNIPO. Hanya anggota obrolan yang bisa membukanya."
              actions={
                <Button variant="outline" onClick={() => setLayar('baru')} disabled={k.status !== 'siap'}>
                  <MessageSquarePlus aria-hidden /> Obrolan baru
                </Button>
              }
            />
          )}
        </div>
      </div>
      <PengaturanObrolan open={atur !== null} onOpenChange={(o) => !o && setAtur(null)} tab={atur ?? 'privasi'} />
    </div>
  );
}

// ================================================================ KotakObrolan

export interface KotakObrolanProps {
  /** Tinggi kotak; bawaan 640px. */
  tinggi?: number | string;
  /** Ruang yang dibuka di awal. */
  ruang?: string | null;
  onRuangChange?: (ruang: string | null) => void;
  judul?: React.ReactNode;
  className?: string;
}

/** Halaman obrolan penuh: dua kolom di layar lebar, satu kolom (daftar ↔ ruang) di layar sempit. */
export function KotakObrolan({ tinggi = 640, ruang, onRuangChange, judul, className }: KotakObrolanProps) {
  const { mesin } = useObrolan();
  const [dalam, setDalam] = React.useState<string | null>(ruang ?? null);
  const aktif = ruang !== undefined ? ruang : dalam;
  const setAktif = (id: string | null) => (setDalam(id), onRuangChange?.(id));
  useMintaBuka(
    (p) =>
      void mesin
        .mulaiLangsung(p)
        .then(setAktif)
        .catch(() => {}),
  );
  return (
    <div className={cn('u-ob-kotak', className)} style={{ height: tinggi }}>
      <PanelObrolan mode="ganda" aktif={aktif} setAktif={setAktif} judul={judul} />
    </div>
  );
}

// ================================================================ ChatMengambang

export interface ChatMengambangProps {
  posisi?: 'kanan' | 'kiri';
  /**
   * Jarak dari tepi bawah (px). Kosongkan agar memakai posisi standar UNIPO: tombol 56px, 24px dari pojok kanan bawah,
   * dan di atas navigasi bawah ponsel bila `navBawah`.
   */
  bawah?: number;
  /** Ada navigasi bawah di ponsel (`KerangkaAplikasi` mengisinya): tombol dinaikkan di atasnya pada layar < 768px. */
  navBawah?: boolean;
  judul?: React.ReactNode;
  className?: string;
}

/**
 * Tombol obrolan mengambang di pojok layar dengan lencana pesan belum dibaca. Panel berisi daftar obrolan, cari
 * pengguna, dan ruang obrolan; layar penuh di ponsel. Pasang sekali di layout aplikasi.
 */
export function ChatMengambang({ posisi = 'kanan', bawah, navBawah, judul, className }: ChatMengambangProps) {
  const { mesin, keadaan: k } = useObrolan();
  const [buka, setBuka] = React.useState(false);
  const [aktif, setAktif] = React.useState<string | null>(null);
  const tombolRef = React.useRef<HTMLButtonElement>(null);
  const total = k.urutan.reduce((n, id) => n + (k.ruang[id] && !k.ruang[id].bisu ? k.ruang[id].belum_dibaca : 0), 0);

  useMintaBuka((p) => {
    setBuka(true);
    void mesin
      .mulaiLangsung(p)
      .then(setAktif)
      .catch(() => {});
  });

  useMintaBukaRuang((id) => {
    setBuka(true);
    setAktif(id);
  });

  const tutup = () => {
    setBuka(false);
    tombolRef.current?.focus();
  };

  React.useEffect(() => {
    if (!buka) return;
    const f = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.u-dialog, .u-sheet, .u-menu, .u-popover')) tutup();
    };
    document.addEventListener('keydown', f);
    return () => document.removeEventListener('keydown', f);
  }, [buka]);

  return (
    <div
      className={cn('u-ob-apung', className)}
      data-posisi={posisi}
      data-buka={buka ? '' : undefined}
      data-nav-bawah={navBawah ? '' : undefined}
      style={bawah != null ? ({ '--ob-bawah': `${bawah}px` } as React.CSSProperties) : undefined}
    >
      {buka && (
        <div className="u-ob-apung-panel" role="dialog" aria-label="Obrolan">
          <PanelObrolan mode="tunggal" aktif={aktif} setAktif={setAktif} onTutup={tutup} judul={judul} />
        </div>
      )}
      <button
        ref={tombolRef}
        type="button"
        className="u-ob-apung-tombol"
        aria-expanded={buka}
        aria-label={buka ? 'Tutup obrolan' : total ? `Obrolan, ${total} pesan belum dibaca` : 'Buka obrolan'}
        onClick={() => (buka ? tutup() : setBuka(true))}
      >
        {buka ? <X aria-hidden /> : <MessageCircle aria-hidden />}
        {!buka && total > 0 && <span className="u-ob-lencana">{total > 99 ? '99+' : total}</span>}
      </button>
    </div>
  );
}

// ================================================================ TombolPesan (bilah atas)

export interface TombolPesanProps {
  /** Jumlah ruang yang ditampilkan di panel. Bawaan 6. */
  jumlah?: number;
  /**
   * Aksi saat ruang atau "Semua obrolan" dipilih. Bawaan membuka `ChatMengambang` yang terpasang
   * (`bukaRuangObrolan`). Isi bila aplikasi punya halaman obrolan sendiri, mis. `(id) => navigate(id ? `/obrolan?ruang=${id}` : '/obrolan')`.
   */
  onBuka?: (ruang: string | null) => void;
  className?: string;
}

/**
 * Ikon pesan di bilah atas: lencana jumlah pesan belum dibaca (ruang yang tidak dibisukan) dan panel berisi obrolan
 * terbaru dengan cuplikan pesan yang didekripsi di browser. Tidak tampil bila obrolan tidak tersedia untuk akun ini
 * (token tanpa scope obrolan, browser tanpa WebCrypto).
 */
export function TombolPesan({ jumlah = 6, onBuka = bukaRuangObrolan, className }: TombolPesanProps) {
  const { mesin, keadaan: k } = useObrolan();
  const [buka, setBuka] = React.useState(false);
  const [tab, setTab] = React.useState<'semua' | 'belum'>('semua');
  const gagal = k.status === 'galat' || k.status === 'tidak_didukung';
  const saya = k.saya?.id ?? '';
  const semua = k.urutan.map((id) => k.ruang[id]).filter((r): r is RuangObrolanData => Boolean(r) && !r.arsip);
  const total = semua.reduce((n, r) => n + (r.bisu ? 0 : r.belum_dibaca), 0);
  const ruang = tab === 'belum' ? semua.filter((r) => r.belum_dibaca > 0 && !r.bisu) : semua;
  const pilih = (id: string | null) => {
    setBuka(false);
    onBuka(id);
  };
  return (
    <Popover
      open={buka}
      onOpenChange={(o) => {
        setBuka(o);
        if (o && gagal) void mesin.mulai().catch(() => {});
      }}
      align="end"
      width={384}
      className={cn('u-kabar-panel', className)}
      trigger={
        <Button variant="ghost" size="sm" iconOnly className="u-kabar-tombol" aria-label={total ? `Pesan, ${total} belum dibaca` : 'Pesan'}>
          <MessageCircle />
          {total > 0 && <span className="u-kabar-lencana">{total > 99 ? '99+' : total}</span>}
        </Button>
      }
    >
      <div className="u-kabar-kepala">
        <span className="u-kabar-judul">Pesan</span>
        <Button variant="ghost" size="xs" onClick={() => pilih(null)}>
          <MessageSquarePlus /> Obrolan baru
        </Button>
      </div>
      <TabKabar nilai={tab} onUbah={setTab} belum={total} />
      {gagal ? (
        <div className="u-kabar-daftar">
          <Alert variant="warning" title={k.status === 'tidak_didukung' ? 'Browser tidak mendukung obrolan' : 'Obrolan belum bisa dibuka'}>
            {k.galat ?? 'Coba lagi sebentar lagi.'}
          </Alert>
        </div>
      ) : (k.status === 'memuat' || k.status === 'mati') && !ruang.length ? (
        <div className="u-kabar-daftar" aria-busy>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={44} />
          ))}
        </div>
      ) : ruang.length ? (
        <div className="u-kabar-daftar" role="list">
          {ruang.slice(0, jumlah).map((r) => {
            const p = r.pesan_terakhir;
            const belum = r.belum_dibaca > 0 && !r.bisu;
            return (
              <button key={r.id} type="button" role="listitem" className="u-kabar-item" data-belum={belum ? '' : undefined} onClick={() => pilih(r.id)}>
                <AvatarRuang r={r} saya={saya} size="sm" />
                <span className="u-kabar-item-teks">
                  <span className="u-kabar-item-atas">
                    <b>{judulRuang(r, saya)}</b>
                    {p && <time>{waktuSingkat(p.dibuat_at)}</time>}
                  </span>
                  <span className="u-kabar-item-isi">{cuplikan(p, r, saya)}</span>
                </span>
                {belum && <span className="u-kabar-item-angka">{r.belum_dibaca > 99 ? '99+' : r.belum_dibaca}</span>}
              </button>
            );
          })}
        </div>
      ) : (
        <Empty
          icon={<MessageCircle />}
          title={tab === 'belum' ? 'Semua pesan sudah dibaca' : 'Belum ada obrolan'}
          description={tab === 'belum' ? 'Pesan baru akan tampil di sini.' : 'Pesan dari mahasiswa, dosen, dan tendik tampil di sini.'}
        />
      )}
      <div className="u-kabar-kaki">
        <Button variant="ghost" size="sm" onClick={() => pilih(null)}>
          Buka semua obrolan
        </Button>
      </div>
    </Popover>
  );
}
