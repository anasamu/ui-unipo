'use client';
import * as React from 'react';
import {
  Archive, Award, BadgeCheck, Bell, BookOpen, Briefcase, Building2, Calendar, ChartBar, Check, ClipboardCheck, ClipboardList,
  Clock, Coins, Database, FileText, Files, FlaskConical, Folder, Gauge, Globe, GraduationCap, Handshake, Heart, House, IdCard,
  Image, KeyRound, Landmark, Library, Mail, Map, Megaphone, MessageSquare, Monitor, Newspaper, Package, Receipt, School, Search,
  Settings, ShieldCheck, Star, Target, Trophy, UserRound, Users, Wallet, Wrench, type LucideIcon,
} from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { Button, Spinner } from './actions';
import { Input, Switch } from './forms';
import { Popover } from './overlays';

// ================================================================ SwitchBaris
export interface SwitchBarisProps {
  label: React.ReactNode;
  /** Penjelasan akibat bila dinyalakan, bahasa awam. */
  keterangan?: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  /**
   * Boleh async (mis. langsung menyimpan pengaturan). Selama menunggu, switch memuat; bila gagal (lempar Error),
   * posisi kembali dan pesan galat tampil di baris.
   */
  onCheckedChange?: (nyala: boolean) => void | Promise<void>;
  disabled?: boolean;
  /** Alasan nonaktif yang ditampilkan di bawah keterangan (mis. "Diatur oleh BAAK"). */
  alasan?: React.ReactNode;
  readOnly?: boolean;
  name?: string;
  id?: string;
  className?: string;
}

/** Baris pengaturan nyala/mati: judul + keterangan di kiri, switch di kanan, seluruh baris bisa diklik. */
export function SwitchBaris({ label, keterangan, checked, defaultChecked, onCheckedChange, disabled, alasan, readOnly, name, id, className }: SwitchBarisProps) {
  const [dalam, setDalam] = React.useState(Boolean(defaultChecked));
  const [sibuk, setSibuk] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const nyala = checked ?? dalam;
  const idAuto = React.useId();
  const idSwitch = id ?? idAuto;
  const idKet = `${idSwitch}-ket`;
  const ubah = async (v: boolean) => {
    if (readOnly || sibuk) return;
    const lama = nyala;
    setDalam(v);
    setGalat(null);
    const r = onCheckedChange?.(v);
    if (r && typeof (r as Promise<void>).then === 'function') {
      setSibuk(true);
      try {
        await r;
      } catch (e) {
        setDalam(lama);
        setGalat((e as Error)?.message || 'Gagal menyimpan. Coba lagi.');
      } finally {
        setSibuk(false);
      }
    }
  };
  return (
    <div className={cn('u-switch-baris', className)} data-disabled={dataFlag(disabled)} data-readonly={dataFlag(readOnly)}>
      <label htmlFor={idSwitch} className="u-switch-baris-teks">
        <span className="u-switch-baris-label">{label}</span>
        {keterangan && (
          <span id={idKet} className="u-switch-baris-ket">
            {keterangan}
          </span>
        )}
        {disabled && alasan && <span className="u-switch-baris-ket" data-tone="muted">{alasan}</span>}
        {galat && (
          <span className="u-isian-pesan" data-tone="danger" role="alert">
            {galat}
          </span>
        )}
      </label>
      <span className="u-switch-baris-kontrol">
        {sibuk && <Spinner size="sm" label="Menyimpan" />}
        <Switch
          id={idSwitch}
          name={name}
          checked={nyala}
          onCheckedChange={(v) => void ubah(v)}
          disabled={disabled || sibuk}
          readOnly={readOnly}
          aria-describedby={keterangan ? idKet : undefined}
        />
      </span>
    </div>
  );
}

// ================================================================ PilihIkon
export interface IkonPilihan {
  ikon: LucideIcon | React.ComponentType<{ size?: number }>;
  /** Label awam (bahasa Indonesia) untuk pencarian dan pembaca layar. */
  label: string;
  /** Kata kunci tambahan. */
  kata?: string;
}

/** Ikon bawaan untuk menu, kategori, dan layanan (nama = nama ikon lucide, sama dengan yang disimpan di data menu). */
export const IKON_PILIHAN: Record<string, IkonPilihan> = {
  House: { ikon: House, label: 'Beranda', kata: 'rumah dasbor' },
  GraduationCap: { ikon: GraduationCap, label: 'Akademik', kata: 'mahasiswa wisuda toga kuliah' },
  School: { ikon: School, label: 'Sekolah', kata: 'kampus fakultas' },
  BookOpen: { ikon: BookOpen, label: 'Buku', kata: 'mata kuliah kurikulum bacaan' },
  Library: { ikon: Library, label: 'Perpustakaan', kata: 'pustaka repositori' },
  Users: { ikon: Users, label: 'Kelompok orang', kata: 'tim pegawai anggota' },
  UserRound: { ikon: UserRound, label: 'Orang', kata: 'akun profil pengguna' },
  IdCard: { ikon: IdCard, label: 'Kartu identitas', kata: 'ktm nik kartu' },
  Building2: { ikon: Building2, label: 'Gedung', kata: 'unit lembaga kantor' },
  Landmark: { ikon: Landmark, label: 'Lembaga', kata: 'rektorat yayasan pemerintah' },
  Calendar: { ikon: Calendar, label: 'Kalender', kata: 'jadwal agenda tanggal' },
  Clock: { ikon: Clock, label: 'Waktu', kata: 'jam presensi riwayat' },
  ClipboardCheck: { ikon: ClipboardCheck, label: 'Penilaian', kata: 'evaluasi audit periksa' },
  ClipboardList: { ikon: ClipboardList, label: 'Daftar tugas', kata: 'formulir isian' },
  FileText: { ikon: FileText, label: 'Dokumen', kata: 'surat berkas laporan' },
  Files: { ikon: Files, label: 'Banyak dokumen', kata: 'arsip berkas' },
  Folder: { ikon: Folder, label: 'Folder', kata: 'berkas drive' },
  Archive: { ikon: Archive, label: 'Arsip', kata: 'simpan lama' },
  Mail: { ikon: Mail, label: 'Surat/email', kata: 'persuratan pesan' },
  MessageSquare: { ikon: MessageSquare, label: 'Pesan', kata: 'obrolan diskusi forum' },
  Megaphone: { ikon: Megaphone, label: 'Pengumuman', kata: 'humas berita siaran' },
  Newspaper: { ikon: Newspaper, label: 'Berita', kata: 'artikel humas' },
  Bell: { ikon: Bell, label: 'Notifikasi', kata: 'pemberitahuan' },
  Wallet: { ikon: Wallet, label: 'Dompet', kata: 'keuangan tagihan bayar' },
  Coins: { ikon: Coins, label: 'Uang', kata: 'biaya ukt dana' },
  Receipt: { ikon: Receipt, label: 'Kwitansi', kata: 'struk pembayaran kasir' },
  ChartBar: { ikon: ChartBar, label: 'Grafik', kata: 'statistik laporan data' },
  Gauge: { ikon: Gauge, label: 'Kinerja', kata: 'indikator iku capaian' },
  Target: { ikon: Target, label: 'Sasaran', kata: 'target mutu' },
  Award: { ikon: Award, label: 'Penghargaan', kata: 'prestasi sertifikat' },
  Trophy: { ikon: Trophy, label: 'Juara', kata: 'lomba prestasi' },
  BadgeCheck: { ikon: BadgeCheck, label: 'Terverifikasi', kata: 'sah akreditasi' },
  ShieldCheck: { ikon: ShieldCheck, label: 'Keamanan', kata: 'mutu izin perlindungan' },
  KeyRound: { ikon: KeyRound, label: 'Kunci', kata: 'akses sandi izin' },
  Settings: { ikon: Settings, label: 'Pengaturan', kata: 'konfigurasi' },
  Wrench: { ikon: Wrench, label: 'Perbaikan', kata: 'sarpras pemeliharaan alat' },
  Package: { ikon: Package, label: 'Barang', kata: 'aset inventaris' },
  Database: { ikon: Database, label: 'Basis data', kata: 'data induk server' },
  Monitor: { ikon: Monitor, label: 'Komputer', kata: 'lab perangkat' },
  Globe: { ikon: Globe, label: 'Situs web', kata: 'internet portal' },
  Map: { ikon: Map, label: 'Peta', kata: 'lokasi wilayah kkn' },
  FlaskConical: { ikon: FlaskConical, label: 'Penelitian', kata: 'riset lab lppm' },
  Handshake: { ikon: Handshake, label: 'Kerja sama', kata: 'mitra mou pengabdian' },
  Briefcase: { ikon: Briefcase, label: 'Pekerjaan', kata: 'karier lowongan alumni' },
  Heart: { ikon: Heart, label: 'Kesejahteraan', kata: 'kesehatan favorit' },
  Star: { ikon: Star, label: 'Unggulan', kata: 'favorit bintang' },
  Image: { ikon: Image, label: 'Gambar', kata: 'foto galeri media' },
  Search: { ikon: Search, label: 'Cari', kata: 'temukan' },
};

export interface PilihIkonProps {
  /** Nama ikon (kunci di `ikon`). */
  value?: string | null;
  onValueChange?: (nama: string | null) => void;
  /** Daftar ikon yang boleh dipilih (bawaan IKON_PILIHAN). */
  ikon?: Record<string, IkonPilihan>;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  /** Boleh dikosongkan (bawaan true). */
  bisaDihapus?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
}

/** Saring ikon dengan kata kunci (label, kata kunci, nama). */
export function saringIkon(daftar: Record<string, IkonPilihan>, kata: string): string[] {
  const k = kata.trim().toLowerCase();
  return Object.keys(daftar).filter((n) => !k || `${n} ${daftar[n]!.label} ${daftar[n]!.kata ?? ''}`.toLowerCase().includes(k));
}

/** Pemilih ikon berbentuk tombol + kisi ikon berpencarian (label Indonesia). Panah menggeser pilihan, Enter memilih. */
export function PilihIkon({ value, onValueChange, ikon = IKON_PILIHAN, placeholder = 'Pilih ikon', disabled, readOnly, bisaDihapus = true, id, className, 'aria-label': ariaLabel }: PilihIkonProps) {
  const [open, setOpen] = React.useState(false);
  const [kata, setKata] = React.useState('');
  const kisi = React.useRef<HTMLDivElement>(null);
  const hasil = saringIkon(ikon, kata);
  const kini = value ? ikon[value] : undefined;
  const KiniIkon = kini?.ikon;
  const pilih = (n: string | null) => {
    onValueChange?.(n);
    setOpen(false);
    setKata('');
  };
  const geserFokus = (e: React.KeyboardEvent) => {
    const tombol = [...(kisi.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    const i = tombol.indexOf(document.activeElement as HTMLButtonElement);
    const kolom = Math.max(1, Math.round((kisi.current?.clientWidth ?? 280) / 44));
    const ke = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + kolom, ArrowUp: i - kolom, Home: 0, End: tombol.length - 1 }[e.key];
    if (ke === undefined) return;
    e.preventDefault();
    tombol[Math.max(0, Math.min(tombol.length - 1, ke))]?.focus();
  };
  const pemicu = (
    <button type="button" id={id} className={cn('u-select-trigger u-pilih-ikon-pemicu', className)} disabled={disabled} aria-label={ariaLabel ? `${ariaLabel}: ${kini?.label ?? 'belum dipilih'}` : undefined} data-readonly={dataFlag(readOnly)}>
      <span className="u-pilih-ikon-kini" aria-hidden>
        {KiniIkon ? <KiniIkon size={16} /> : null}
      </span>
      <span className={kini ? 'u-select-value' : 'u-select-value u-pilih-ikon-placeholder'}>{kini?.label ?? placeholder}</span>
    </button>
  );
  if (readOnly || disabled) return pemicu;
  return (
    <Popover open={open} onOpenChange={setOpen} trigger={pemicu} align="start" width={320} className="u-pilih-ikon-popup">
      <Input placeholder="Cari ikon, mis. keuangan" value={kata} onChange={(e) => setKata(e.target.value)} aria-label="Cari ikon" autoFocus onKeyDown={(e) => e.key === 'ArrowDown' && (e.preventDefault(), kisi.current?.querySelector<HTMLButtonElement>('button')?.focus())} />
      <div ref={kisi} className="u-pilih-ikon-kisi" role="group" aria-label="Daftar ikon" onKeyDown={geserFokus}>
        {hasil.map((n) => {
          const I = ikon[n]!.ikon;
          return (
            <button key={n} type="button" className="u-pilih-ikon-butir" aria-pressed={n === value} aria-label={ikon[n]!.label} title={ikon[n]!.label} onClick={() => pilih(n)}>
              <I size={18} />
            </button>
          );
        })}
        {!hasil.length && <p className="u-listbox-empty">Tidak ada ikon untuk “{kata}”.</p>}
      </div>
      {bisaDihapus && value && (
        <Button variant="ghost" size="xs" onClick={() => pilih(null)}>
          Tanpa ikon
        </Button>
      )}
    </Popover>
  );
}

// ================================================================ PilihWarna
export interface WarnaToken {
  /** Nama token, disimpan sebagai nilai (mis. "primary"). */
  token: string;
  label: string;
}

/** Warna tema yang boleh dipakai untuk label, kategori, dan grafik. Mengikuti mode terang/gelap otomatis. */
export const WARNA_TOKEN: WarnaToken[] = [
  { token: 'primary', label: 'Warna utama kampus' },
  { token: 'info', label: 'Biru (informasi)' },
  { token: 'success', label: 'Hijau (berhasil)' },
  { token: 'warning', label: 'Kuning (perhatian)' },
  { token: 'danger', label: 'Merah (bahaya)' },
  { token: 'neutral-500', label: 'Abu-abu (netral)' },
  { token: 'chart-1', label: 'Grafik 1' },
  { token: 'chart-2', label: 'Grafik 2' },
  { token: 'chart-3', label: 'Grafik 3' },
  { token: 'chart-4', label: 'Grafik 4' },
  { token: 'chart-5', label: 'Grafik 5' },
  { token: 'chart-6', label: 'Grafik 6' },
];

/** Nilai CSS untuk token warna, mis. `warnaToken('success')` → `var(--u-success)`. */
export const warnaToken = (token: string | null | undefined) => (token ? `var(--u-${token})` : undefined);

export interface PilihWarnaProps {
  value?: string | null;
  onValueChange?: (token: string) => void;
  /** Pilihan warna (bawaan WARNA_TOKEN). */
  warna?: WarnaToken[];
  disabled?: boolean;
  readOnly?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * Pemilih warna dari token tema (bukan kode hex bebas), agar warna tetap terbaca di mode gelap dan sesuai identitas
 * kampus. Berperilaku sebagai radio group: panah kiri/kanan berpindah, Spasi/Enter memilih.
 */
export function PilihWarna({ value, onValueChange, warna = WARNA_TOKEN, disabled, readOnly, id, className, 'aria-label': ariaLabel = 'Warna' }: PilihWarnaProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const aktif = Math.max(0, warna.findIndex((w) => w.token === value));
  const pindah = (i: number) => {
    const n = (i + warna.length) % warna.length;
    ref.current?.querySelectorAll<HTMLButtonElement>('[role=radio]')[n]?.focus();
    if (!readOnly) onValueChange?.(warna[n]!.token);
  };
  return (
    <div ref={ref} id={id} role="radiogroup" aria-label={ariaLabel} aria-readonly={readOnly || undefined} aria-disabled={disabled || undefined} className={cn('u-pilih-warna', className)} data-disabled={dataFlag(disabled)}>
      {warna.map((w, i) => {
        const pilih = w.token === value;
        return (
          <button
            key={w.token}
            type="button"
            role="radio"
            aria-checked={pilih}
            aria-label={w.label}
            title={w.label}
            tabIndex={i === aktif ? 0 : -1}
            disabled={disabled}
            className="u-pilih-warna-butir"
            style={{ '--u-warna': warnaToken(w.token) } as React.CSSProperties}
            onClick={() => !readOnly && onValueChange?.(w.token)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') (e.preventDefault(), pindah(i + 1));
              else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') (e.preventDefault(), pindah(i - 1));
            }}
          >
            {pilih && <Check aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
