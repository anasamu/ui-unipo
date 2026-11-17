'use client';
import * as React from 'react';
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowLeft,
  Ban,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Clock,
  Copy,
  Download,
  EllipsisVertical,
  FileText,
  FolderDown,
  Hourglass,
  Info,
  KeyRound,
  Lock,
  LogOut,
  MessageCircle,
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
  ShieldAlert,
  ShieldCheck,
  Smartphone,
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
 * Keadaan obrolan terenkripsi end-to-end (`/v1/obrolan`) untuk komponen kustom. Semua komponen obrolan di halaman
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
  if (p.status === 'tak_terbaca') return 'Pesan terenkripsi (tidak terbaca di perangkat ini)';
  if (p.status === 'menunggu') return 'Menunggu pesan…';
  const i = p.isi;
  if (!i) return '';
  const siapa = p.pengirim === saya ? 'Anda: ' : r.jenis === 'grup' ? `${namaDepan(r.anggota.find((a) => a.id === p.pengirim)?.nama ?? '')}: ` : '';
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
  if (l) return <Avatar name={l.nama} size={size} status={l.daring ? 'online' : undefined} />;
  return (
    <span className="u-ob-avatar-grup" data-size={size} aria-hidden>
      <Users />
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
  className?: string;
}

/** Daftar ruang obrolan: pesan terakhir (didekripsi di perangkat), belum dibaca, sedang mengetik, sematan, bisu. */
export function DaftarObrolan({ aktif, onPilih, className }: DaftarObrolanProps) {
  const { mesin, keadaan: k } = useObrolan();
  const [q, setQ] = React.useState('');
  const [arsip, setArsip] = React.useState<RuangObrolanData[] | null>(null);
  const saya = k.saya?.id ?? '';
  const cocok = (r: RuangObrolanData) => !q.trim() || judulRuang(r, saya).toLowerCase().includes(q.trim().toLowerCase());
  const daftar = k.urutan.map((id) => k.ruang[id]).filter((r): r is RuangObrolanData => Boolean(r) && cocok(r));
  const daftarArsip = arsip?.map((r) => k.ruang[r.id] ?? r).filter((r) => r.arsip && cocok(r));

  const baris = (r: RuangObrolanData) => {
    const ketik = Object.keys(k.ketik[r.id] ?? {}).filter((p) => p !== saya);
    const p = r.pesan_terakhir;
    return (
      <button key={r.id} type="button" className="u-ob-baris" data-interaktif data-aktif={aktif === r.id ? '' : undefined} onClick={() => onPilih(r.id)}>
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
          <Empty icon={<MessageCircle />} title="Belum ada obrolan" description="Mulai obrolan dengan dosen, mahasiswa, atau staf. Semua pesan terenkripsi end-to-end." />
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
          description: `${folder}. Salinan ini tidak terenkripsi end-to-end.`,
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
    <span className="u-ob-berkas-kotak">
      <button type="button" className="u-ob-berkas" onClick={unduh} disabled={memuat} title={galat ?? undefined}>
        <span className="u-ob-berkas-ikon" aria-hidden>
          <FileText />
        </span>
        <span className="u-ob-berkas-teks">
          <span className="u-ob-berkas-nama">{b.nama}</span>
          <span className="u-ob-berkas-sub">{galat ? 'Gagal mengunduh, coba lagi' : `${formatBytes(b.ukuran)} · ${(b.nama.split('.').pop() ?? '').toUpperCase()}`}</span>
        </span>
        {memuat ? <Spinner size="sm" /> : <Download aria-hidden />}
      </button>
      <Tooltip content="Simpan ke Berkas saya (salinan tidak terenkripsi end-to-end)">
        <button type="button" className="u-ob-berkas-simpan" aria-label={`Simpan ${b.nama} ke Berkas saya`} disabled={proses} onClick={(e) => (e.stopPropagation(), void simpan(ruangId, [b]))}>
          {proses ? <Spinner size="sm" /> : <FolderDown aria-hidden />}
        </button>
      </Tooltip>
    </span>
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
  onHapus: () => void;
  onLihat: (b: Berkas) => void;
  onLompat: (uuid: string) => void;
}

function statusBaca(p: PesanObrolan, r: RuangObrolanData, saya: string): 'mengirim' | 'gagal' | 'menunggu' | 'terkirim' | 'diterima' | 'dibaca' {
  if (p.status === 'mengirim' || p.status === 'gagal') return p.status;
  const lain = r.anggota.filter((a) => a.id !== saya);
  if (!lain.length) return 'terkirim';
  if (lain.every((a) => !a.punya_kunci)) return 'menunggu';
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
    ...(milikSaya ? [{ type: 'separator' as const }, { label: 'Hapus untuk semua', icon: <Trash2 />, destructive: true, onSelect: onHapus }] : []),
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
          ) : p.status === 'menunggu' ? (
            <span className="u-ob-pesan-sistem">
              <Hourglass aria-hidden /> Menunggu pesan ini. Pesan terbuka otomatis begitu {nama} daring.
            </span>
          ) : p.status === 'tak_terbaca' ? (
            <span className="u-ob-pesan-sistem">
              <Lock aria-hidden /> Pesan terenkripsi ini tidak bisa dibuka di perangkat ini. Pulihkan kunci dari cadangan untuk membacanya.
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
            {p.terverifikasi === false && (
              <Tooltip content="Tanda tangan perangkat pengirim tidak cocok. Periksa nomor keamanan.">
                <ShieldAlert className="u-ob-meta-bahaya" aria-label="Tidak terverifikasi" />
              </Tooltip>
            )}
            {p.kedaluwarsa_at && <Timer aria-label="Pesan menghilang" />}
            {p.diubah && <span>diubah</span>}
            <time dateTime={p.dibuat_at}>{jam(p.dibuat_at)}</time>
            {st === 'mengirim' && <Clock aria-label="Mengirim" />}
            {st === 'menunggu' && (
              <Tooltip content={`Terkirim ke server. Terbuka untuk ${namaDepan(r.anggota.find((a) => a.id !== saya)?.nama ?? 'penerima')} begitu ia membuka obrolan.`}>
                <Hourglass aria-label="Menunggu penerima mengaktifkan obrolan" />
              </Tooltip>
            )}
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

/** Nomor keamanan 60 angka antara pengguna ini dan `pemilik`. Cocokkan di kedua layar untuk memastikan tidak ada pihak ketiga. */
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
  const [periksa, setPeriksa] = React.useState<OrangObrolan | null>(null);
  const [tambah, setTambah] = React.useState(false);
  const [baru, setBaru] = React.useState<OrangObrolan[]>([]);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [blokir, setBlokir] = React.useState(false);
  const [keluar, setKeluar] = React.useState(false);
  React.useEffect(() => setJudul(r.judul ?? ''), [r.judul]);
  const jalan = (f: Promise<unknown>) => void f.then(() => setGalat(null)).catch((e) => setGalat(pesanGalat(e)));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange} title={r.jenis === 'grup' ? 'Info grup' : 'Info obrolan'} size="md">
        <div className="u-ob-info">
          <div className="u-ob-info-kepala">
            <AvatarRuang r={r} saya={saya} size="xl" />
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
              <ShieldCheck aria-hidden /> Enkripsi end-to-end
            </h4>
            <p className="u-ob-petunjuk">Pesan dan lampiran dikunci di perangkat Anda dan hanya bisa dibuka perangkat anggota obrolan ini. Server SIAKAD hanya menyimpan data terenkripsi.</p>
            {lawan ? <NomorKeamanan pemilik={lawan.id} nama={namaDepan(lawan.nama)} /> : <p className="u-ob-petunjuk">Periksa nomor keamanan per anggota lewat tombol kunci di daftar anggota.</p>}
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
              {r.jenis === 'grup' && !admin ? 'Hanya admin grup yang bisa mengubahnya. ' : ''}Berlaku untuk pesan baru; pesan dihapus permanen dari server setelah waktunya lewat.
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
                  {a.id !== saya && (
                    <Tooltip content="Nomor keamanan">
                      <Button size="sm" variant="ghost" iconOnly aria-label={`Nomor keamanan ${a.nama}`} onClick={() => setPeriksa(a)}>
                        <KeyRound />
                      </Button>
                    </Tooltip>
                  )}
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
      </Dialog>

      <Dialog open={Boolean(periksa)} onOpenChange={(o) => !o && setPeriksa(null)} title={`Nomor keamanan ${periksa?.nama ?? ''}`} size="sm">
        {periksa && <NomorKeamanan pemilik={periksa.id} nama={namaDepan(periksa.nama)} />}
      </Dialog>

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
  const { simpan: simpanBerkas } = useSimpanKeBerkas();
  const [hapus, setHapus] = React.useState<PesanObrolan | null>(null);
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
  const kunciBerubah = r.anggota.filter((a) => a.id !== saya && k.kunciBerubah[a.id]);
  const subjudul = ketik.length
    ? r.jenis === 'grup'
      ? `${namaKetik.join(', ')} mengetik…`
      : 'mengetik…'
    : lawan
      ? lawan.daring
        ? 'daring'
        : terakhirAktif(lawan.terakhir_aktif) || lawan.peran
      : r.anggota.map((a) => (a.id === saya ? 'Anda' : namaDepan(a.nama))).join(', ');
  const belumSiap = r.anggota.filter((a) => a.id !== saya && !a.punya_kunci);

  const menuRuang: MenuEntry[] = [
    { label: r.jenis === 'grup' ? 'Info grup' : 'Info dan nomor keamanan', icon: <Info />, onSelect: () => setInfo(true) },
    { label: r.bisu ? 'Bunyikan notifikasi' : 'Bisukan notifikasi', icon: r.bisu ? <Bell /> : <BellOff />, onSelect: () => void mesin.ubahRuang(id, { bisu: !r.bisu }) },
    { label: r.sematkan ? 'Lepas sematan' : 'Sematkan', icon: r.sematkan ? <PinOff /> : <Pin />, onSelect: () => void mesin.ubahRuang(id, { sematkan: !r.sematkan }) },
    { label: r.arsip ? 'Keluarkan dari arsip' : 'Arsipkan', icon: r.arsip ? <ArchiveRestore /> : <Archive />, onSelect: () => void mesin.ubahRuang(id, { arsip: !r.arsip }) },
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
        onHapus={() => setHapus(p)}
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
        <Tooltip content="Terenkripsi end-to-end. Klik untuk nomor keamanan.">
          <Button variant="ghost" size="sm" iconOnly aria-label="Terenkripsi end-to-end" onClick={() => setInfo(true)}>
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

      {kunciBerubah.length > 0 && (
        <div className="u-ob-pita" data-nada="peringatan" role="status">
          <ShieldAlert aria-hidden />
          <span>Kunci keamanan {kunciBerubah.map((a) => namaDepan(a.nama)).join(', ')} berubah, biasanya karena perangkat baru.</span>
          <button type="button" onClick={() => setInfo(true)}>
            Periksa
          </button>
        </div>
      )}

      <div className="u-ob-pesan-daftar" ref={daftarRef} onScroll={onGulir} role="log" aria-live="polite" aria-label={`Pesan dengan ${judulRuang(r, saya)}`}>
        {x?.memuat && (
          <div className="u-ob-memuat">
            <Spinner size="sm" />
          </div>
        )}
        {x?.dimuat && !x.lagi && (
          <div className="u-ob-sambut">
            <Lock aria-hidden />
            <p>Pesan dan lampiran di obrolan ini terenkripsi end-to-end. Hanya anggota obrolan yang bisa membacanya, server SIAKAD pun tidak.</p>
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
        {belumSiap.length > 0 && (
          <p className="u-ob-pita" data-nada="info">
            <Info aria-hidden />
            <span>
              {belumSiap.map((a) => namaDepan(a.nama)).join(', ')} belum pernah membuka obrolan. Pesan tetap terkirim dan terbuka otomatis begitu {belumSiap.length > 1 ? 'mereka' : 'ia'}{' '}
              membukanya.
            </span>
          </p>
        )}
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
          <Tooltip content={`Lampirkan berkas (maks. ${k.lampiranMb} MB, dienkripsi sebelum diunggah)`}>
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
          Lepas untuk melampirkan (dienkripsi sebelum diunggah)
        </div>
      )}

      <InfoRuang r={r} open={info} onOpenChange={setInfo} onKeluar={() => onKembali?.()} />
      <LihatGambar b={lihat} ruangId={id} onTutup={() => setLihat(null)} />
      <ConfirmDialog
        open={Boolean(hapus)}
        onOpenChange={(o) => !o && setHapus(null)}
        title="Hapus pesan untuk semua?"
        description="Pesan dan lampirannya dihapus permanen dari server dan dari perangkat semua anggota."
        confirmLabel="Hapus untuk semua"
        onConfirm={async () => {
          if (hapus) await mesin.hapusPesan(id, hapus);
          setHapus(null);
        }}
      />
    </div>
  );
}

// ================================================================ Pengaturan

export interface PengaturanObrolanProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab?: 'perangkat' | 'cadangan' | 'privasi' | 'berkas' | 'blokir';
}

/** Perangkat tertaut, cadangan kunci (dengan sandi), privasi (status daring, tanda dibaca), salinan lampiran ke Berkas saya, dan daftar blokir. */
export function PengaturanObrolan({ open, onOpenChange, tab: tabAwal = 'perangkat' }: PengaturanObrolanProps) {
  const { mesin, keadaan: k } = useObrolan();
  const [tab, setTab] = React.useState(tabAwal);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [cabut, setCabut] = React.useState<string | null>(null);
  const [blokir, setBlokir] = React.useState<Array<{ id: string; nama: string; peran: string }> | null>(null);
  const [sandi, setSandi] = React.useState('');
  const [sandi2, setSandi2] = React.useState('');
  const [sandiPulih, setSandiPulih] = React.useState('');
  const [proses, setProses] = React.useState<string | null>(null);
  const [berhasil, setBerhasil] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setTab(tabAwal);
    setGalat(null);
    setBerhasil(null);
    void mesin.muatPerangkat().catch(() => {});
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

  const sandiLemah = sandi.length > 0 && sandi.length < 10;
  const sandiBeda = sandi2.length > 0 && sandi !== sandi2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Pengaturan obrolan" size="md">
      {galat && <Alert variant="danger">{galat}</Alert>}
      {berhasil && <Alert variant="success">{berhasil}</Alert>}
      <Tabs
        value={tab}
        onValueChange={(v) => (setTab(v), setGalat(null), setBerhasil(null))}
        items={[
          {
            value: 'perangkat',
            label: 'Perangkat',
            content: (
              <div className="u-ob-atur">
                <p className="u-ob-petunjuk">Setiap browser punya kunci enkripsi sendiri. Pesan baru dikunci untuk semua perangkat aktif. Cabut perangkat yang hilang atau tidak dipakai.</p>
                {k.perangkatSaya.map((d) => (
                  <div key={d.id} className="u-ob-baris">
                    <span className="u-ob-avatar-grup" data-size="sm" aria-hidden>
                      <Smartphone />
                    </span>
                    <span className="u-ob-baris-teks">
                      <span className="u-ob-baris-nama">
                        {d.nama}
                        {d.id === k.perangkat && <Badge variant="success">Perangkat ini</Badge>}
                      </span>
                      <span className="u-ob-baris-sub">
                        Sidik{' '}
                        {d.sidik
                          .slice(0, 16)
                          .replace(/(.{4})/g, '$1 ')
                          .trim()}{' '}
                        · {d.terakhir_aktif ? terakhirAktif(d.terakhir_aktif) : `ditambahkan ${waktuSingkat(d.dibuat_at).toLowerCase()}`}
                      </span>
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => setCabut(d.id)}>
                      {d.id === k.perangkat ? 'Keluar' : 'Cabut'}
                    </Button>
                  </div>
                ))}
              </div>
            ),
          },
          {
            value: 'cadangan',
            label: 'Cadangan kunci',
            content: (
              <div className="u-ob-atur">
                <p className="u-ob-petunjuk">
                  Kunci hanya ada di browser ini. Buat cadangan terenkripsi dengan sandi agar pesan lama tetap terbaca saat Anda pindah browser. Sandi tidak dikirim ke server; bila lupa, cadangan
                  tidak bisa dibuka siapa pun.
                </p>
                <Alert variant={k.cadanganAda ? 'success' : 'warning'} icon={<KeyRound />}>
                  {k.cadanganAda ? 'Cadangan kunci tersimpan.' : 'Belum ada cadangan kunci.'}
                </Alert>
                <form
                  className="u-ob-atur-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (sandi.length < 10 || sandi !== sandi2) return;
                    void jalan('cadangan', () => mesin.simpanCadanganKunci(sandi), 'Cadangan kunci disimpan.').then(() => (setSandi(''), setSandi2('')));
                  }}
                >
                  <Field label="Sandi cadangan" description="Minimal 10 karakter, berbeda dari password SIAKAD." error={sandiLemah ? 'Sandi terlalu pendek.' : undefined}>
                    <Input type="password" value={sandi} onChange={(e) => setSandi(e.target.value)} autoComplete="new-password" />
                  </Field>
                  <Field label="Ulangi sandi" error={sandiBeda ? 'Sandi tidak sama.' : undefined}>
                    <Input type="password" value={sandi2} onChange={(e) => setSandi2(e.target.value)} autoComplete="new-password" />
                  </Field>
                  <div className="u-ob-atur-aksi">
                    <Button type="submit" loading={proses === 'cadangan'} disabled={sandi.length < 10 || sandi !== sandi2}>
                      {k.cadanganAda ? 'Perbarui cadangan' : 'Buat cadangan'}
                    </Button>
                    {k.cadanganAda && (
                      <Button type="button" variant="ghost" loading={proses === 'hapus'} onClick={() => void jalan('hapus', () => mesin.hapusCadanganKunci(), 'Cadangan kunci dihapus.')}>
                        Hapus cadangan
                      </Button>
                    )}
                  </div>
                </form>
                {k.cadanganAda && (
                  <form
                    className="u-ob-atur-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!sandiPulih) return;
                      void jalan('pulih', () => mesin.pulihkan(sandiPulih), 'Kunci dipulihkan. Pesan lama sekarang terbaca di browser ini.').then(() => setSandiPulih(''));
                    }}
                  >
                    <h4>Pulihkan di browser ini</h4>
                    <Field label="Sandi cadangan">
                      <Input type="password" value={sandiPulih} onChange={(e) => setSandiPulih(e.target.value)} autoComplete="current-password" />
                    </Field>
                    <div className="u-ob-atur-aksi">
                      <Button type="submit" variant="outline" loading={proses === 'pulih'} disabled={!sandiPulih}>
                        Pulihkan kunci
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            ),
          },
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
                <Alert variant="warning" icon={<FolderDown />}>
                  Salinan di Berkas saya tidak terenkripsi end-to-end: berkas didekripsi di browser ini lalu disimpan seperti berkas biasa (ikut aturan dan enkripsi manajer berkas). Lampiran di obrolan
                  tetap terenkripsi end-to-end.
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
      <ConfirmDialog
        open={Boolean(cabut)}
        onOpenChange={(o) => !o && setCabut(null)}
        title={cabut === k.perangkat ? 'Keluarkan browser ini dari obrolan?' : 'Cabut perangkat ini?'}
        description={
          cabut === k.perangkat
            ? 'Kunci di browser ini dihapus dan pesan lama tidak terbaca lagi di sini kecuali dipulihkan dari cadangan. Browser ini akan mendapat kunci baru.'
            : 'Perangkat itu tidak bisa membaca pesan baru lagi. Kontak Anda akan melihat bahwa kunci keamanan Anda berubah.'
        }
        confirmLabel={cabut === k.perangkat ? 'Keluarkan browser ini' : 'Cabut perangkat'}
        onConfirm={async () => {
          if (cabut) await mesin.cabutPerangkat(cabut);
          setCabut(null);
        }}
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
            <Button variant="ghost" size="sm" iconOnly aria-label="Pengaturan obrolan" onClick={() => setAtur('perangkat')} disabled={k.status !== 'siap'}>
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
        {k.sarankanPulihkan && (
          <Alert
            variant="info"
            className="u-ob-sisi-alert"
            icon={<KeyRound />}
            title="Browser baru"
            actions={
              <>
                <Button size="sm" onClick={() => setAtur('cadangan')}>
                  Pulihkan kunci
                </Button>
                <Button size="sm" variant="ghost" onClick={() => mesin.abaikanPulihkan()}>
                  Nanti
                </Button>
              </>
            }
          >
            Pulihkan kunci dari cadangan agar pesan lama terbaca di sini.
          </Alert>
        )}
        <DaftarObrolan aktif={aktif} onPilih={setAktif} />
        <p className="u-ob-kaki">
          <Lock aria-hidden /> Terenkripsi end-to-end
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
              description="Pilih obrolan atau mulai yang baru. Pesan dan lampiran dienkripsi di perangkat Anda; server hanya menyimpan data yang tidak bisa dibaca."
              actions={
                <Button variant="outline" onClick={() => setLayar('baru')} disabled={k.status !== 'siap'}>
                  <MessageSquarePlus aria-hidden /> Obrolan baru
                </Button>
              }
            />
          )}
        </div>
      </div>
      <PengaturanObrolan open={atur !== null} onOpenChange={(o) => !o && setAtur(null)} tab={atur ?? 'perangkat'} />
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
