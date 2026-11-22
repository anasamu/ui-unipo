import {
  Award,
  BadgeCheck,
  BarChart3,
  BellRing,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Clock,
  Compass,
  CreditCard,
  FileText,
  Globe,
  GraduationCap,
  Handshake,
  Heart,
  HelpCircle,
  Images,
  LayoutTemplate,
  Laptop,
  LifeBuoy,
  LineChart,
  ListOrdered,
  Mail,
  MapPin,
  Megaphone,
  MessageSquareQuote,
  MessagesSquare,
  MonitorSmartphone,
  MousePointerClick,
  Newspaper,
  PanelBottom,
  PanelTop,
  Puzzle,
  Rocket,
  School,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Type,
  UserCheck,
  Users,
  Video,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

/**
 * Skema pembangun halaman landing (blok unipo-ui yang diatur dari Pengaturan tema). Satu sumber untuk renderer
 * (HalamanLanding), penyunting (PenyuntingLanding), dan templat. Cermin pembersih server SIAKAD
 * (app/Modules/Tema/Services/SkemaHalaman.php): kolom baru harus ditambahkan di kedua tempat.
 */

export type TipeBlok =
  | 'hero'
  | 'fitur'
  | 'statistik'
  | 'langkah'
  | 'kabar'
  | 'ajakan'
  | 'faq'
  | 'testimoni'
  | 'logo'
  | 'galeri'
  | 'kontak'
  | 'teks'
  | 'media'
  | 'kaki'
  | 'slot';

/** Gaya bagian: hanya pilihan bertoken tema, tidak ada warna/CSS bebas. */
export interface GayaBlok {
  latar?: 'polos' | 'lembut' | 'utama' | 'gelap' | 'aksen' | 'gambar';
  latar_gambar?: string;
  jarak?: 'tanpa' | 'rapat' | 'normal' | 'lega';
  rata?: 'kiri' | 'tengah';
  lebar?: 'sempit' | 'normal' | 'lebar' | 'penuh';
  sembunyi?: 'ponsel' | 'desktop';
  /** Id bagian untuk tautan #jangkar. */
  jangkar?: string;
  /** Label di menu atas (bila diisi, bagian ini masuk menu navigasi landing). */
  menu?: string;
  /** Animasi muncul saat digulir (bawaan ya). */
  animasi?: boolean;
}

export type IsiBlok = Record<string, unknown>;

export interface BlokLanding {
  id: string;
  tipe: TipeBlok;
  isi: IsiBlok;
  gaya: GayaBlok;
}

export interface DokumenLanding {
  versi: 1;
  halaman?: { judul?: string; deskripsi?: string };
  blok: BlokLanding[];
}

export interface TombolLanding {
  label?: string;
  url?: string;
  gaya?: 'utama' | 'garis' | 'teks' | 'aksen';
  baru?: boolean;
}

// ---------------------------------------------------------------- kolom penyunting

interface KolomDasar {
  k: string;
  label: string;
  bantuan?: string;
  /** Tampilkan kolom hanya bila kondisi terpenuhi (mis. gambar hanya saat media = gambar). */
  bila?: (isi: IsiBlok) => boolean;
}
export type KolomBlok =
  | (KolomDasar & { jenis: 'teks'; maks: number; contoh?: string })
  | (KolomDasar & { jenis: 'paragraf'; maks: number; baris?: number; ringan?: boolean; contoh?: string })
  | (KolomDasar & { jenis: 'url'; contoh?: string })
  | (KolomDasar & { jenis: 'gambar' })
  | (KolomDasar & { jenis: 'pilihan'; opsi: Array<{ v: string; label: string }>; tampil?: 'segmen' | 'daftar' })
  | (KolomDasar & { jenis: 'angka'; min: number; max: number; langkah?: number; desimal?: boolean })
  | (KolomDasar & { jenis: 'saklar' })
  | (KolomDasar & { jenis: 'ikon' })
  | (KolomDasar & { jenis: 'ilustrasi' })
  | (KolomDasar & { jenis: 'slot' })
  | (KolomDasar & { jenis: 'tombol'; maks: number })
  | (KolomDasar & { jenis: 'daftar'; maks: number; kolom: KolomBlok[]; butir: string; judulButir: (b: Record<string, unknown>, i: number) => string; baru: () => Record<string, unknown> });

export type GrupBlok = 'Pembuka' | 'Isi' | 'Data' | 'Bukti' | 'Penutup';

export interface DefinisiBlok {
  label: string;
  keterangan: string;
  ikon: LucideIcon;
  grup: GrupBlok;
  kolom: KolomBlok[];
  bawaan: () => { isi: IsiBlok; gaya?: GayaBlok };
  /** Blok berisi data dari API (tampil memuat/kosong sendiri). */
  dinamis?: boolean;
}

// ---------------------------------------------------------------- ikon

/** Ikon pilihan untuk butir fitur/statistik (nama → komponen lucide, label awam). */
export const IKON_LANDING: Record<string, { label: string; Ikon: LucideIcon }> = {
  bintang: { label: 'Bintang', Ikon: Sparkles },
  buku: { label: 'Buku', Ikon: BookOpen },
  tugas: { label: 'Tugas', Ikon: ClipboardCheck },
  toga: { label: 'Toga', Ikon: GraduationCap },
  video: { label: 'Video', Ikon: Video },
  diskusi: { label: 'Diskusi', Ikon: MessagesSquare },
  hadir: { label: 'Kehadiran', Ikon: UserCheck },
  kalender: { label: 'Kalender', Ikon: CalendarDays },
  lonceng: { label: 'Notifikasi', Ikon: BellRing },
  perangkat: { label: 'Perangkat', Ikon: MonitorSmartphone },
  aman: { label: 'Aman', Ikon: ShieldCheck },
  orang: { label: 'Orang', Ikon: Users },
  gedung: { label: 'Gedung', Ikon: Building2 },
  sekolah: { label: 'Kampus', Ikon: School },
  karier: { label: 'Karier', Ikon: Briefcase },
  grafik: { label: 'Grafik', Ikon: LineChart },
  batang: { label: 'Diagram', Ikon: BarChart3 },
  penghargaan: { label: 'Penghargaan', Ikon: Award },
  terverifikasi: { label: 'Terverifikasi', Ikon: BadgeCheck },
  kompas: { label: 'Arah', Ikon: Compass },
  sasaran: { label: 'Sasaran', Ikon: Target },
  roket: { label: 'Roket', Ikon: Rocket },
  dompet: { label: 'Biaya', Ikon: Wallet },
  kartu: { label: 'Pembayaran', Ikon: CreditCard },
  laptop: { label: 'Laptop', Ikon: Laptop },
  dunia: { label: 'Dunia', Ikon: Globe },
  hati: { label: 'Peduli', Ikon: Heart },
  jabat: { label: 'Kerja sama', Ikon: Handshake },
  jam: { label: 'Waktu', Ikon: Clock },
  dokumen: { label: 'Dokumen', Ikon: FileText },
  cari: { label: 'Cari', Ikon: Search },
  bantuan: { label: 'Bantuan', Ikon: LifeBuoy },
  surel: { label: 'Surel', Ikon: Mail },
  lokasi: { label: 'Lokasi', Ikon: MapPin },
  pengumuman: { label: 'Pengumuman', Ikon: Megaphone },
  bintang5: { label: 'Nilai', Ikon: Star },
};

// ---------------------------------------------------------------- keamanan tautan dan gambar

/**
 * Tautan aman untuk dirender (pertahanan lapis kedua; server sudah menyaring): #jangkar, /alamat, http(s), mailto,
 * tel, dan aksi:<kunci> (aksi milik aplikasi, diterjemahkan HalamanLanding lewat prop `aksi`). Lainnya (javascript:,
 * data:, //host) → undefined.
 */
export function urlAman(u: unknown): string | undefined {
  if (typeof u !== 'string') return undefined;
  const v = u.trim();
  if (!v || v.length > 500 || /[\s<>"'`\\]/.test(v)) return undefined;
  if (/^#[A-Za-z0-9_-]{1,60}$/.test(v) || /^aksi:[a-z][a-z0-9-]{1,30}$/.test(v)) return v;
  if (v.startsWith('/') && !v.startsWith('//')) return v;
  if (/^https?:\/\/[^/?#]+/i.test(v)) return v;
  if (/^mailto:[^@\s]+@[^@\s]+$/i.test(v) || /^tel:\+?[0-9-]{4,20}$/i.test(v)) return v;
  return undefined;
}

/** Gambar aman: `berkas:<uuid>` lewat peta URL dari server, https://, atau /alamat. */
export function gambarAman(u: unknown, berkas?: Record<string, string> | null): string | undefined {
  if (typeof u !== 'string') return undefined;
  const m = /^berkas:([0-9a-f-]{36})$/i.exec(u.trim());
  if (m) return berkas?.[m[1]!.toLowerCase()];
  const v = urlAman(u);
  return v && (v.startsWith('https://') || (v.startsWith('/') && !v.startsWith('//'))) ? v : undefined;
}

export const idBlok = () => Math.random().toString(36).slice(2, 10).padEnd(8, '0');

// ---------------------------------------------------------------- kolom bersama

const KEPALA: KolomBlok[] = [
  { k: 'eyebrow', jenis: 'teks', label: 'Label kecil di atas judul', maks: 60, contoh: 'Fitur' },
  { k: 'judul', jenis: 'teks', label: 'Judul bagian', maks: 140 },
  { k: 'deskripsi', jenis: 'paragraf', label: 'Keterangan', maks: 400, baris: 2 },
];
const SOSIAL = [
  { v: 'instagram', label: 'Instagram' },
  { v: 'facebook', label: 'Facebook' },
  { v: 'youtube', label: 'YouTube' },
  { v: 'tiktok', label: 'TikTok' },
  { v: 'x', label: 'X' },
  { v: 'linkedin', label: 'LinkedIn' },
  { v: 'threads', label: 'Threads' },
  { v: 'whatsapp', label: 'WhatsApp' },
  { v: 'email', label: 'Surel' },
  { v: 'website', label: 'Situs web' },
];
const daftarSosial = (k = 'sosial'): KolomBlok => ({
  k,
  jenis: 'daftar',
  label: 'Media sosial',
  maks: 8,
  butir: 'akun',
  judulButir: (b) => SOSIAL.find((s) => s.v === b.jenis)?.label ?? 'Akun',
  baru: () => ({ jenis: 'instagram', url: '' }),
  kolom: [
    { k: 'jenis', jenis: 'pilihan', label: 'Jenis', opsi: SOSIAL, tampil: 'daftar' },
    { k: 'url', jenis: 'url', label: 'Alamat', contoh: 'https://instagram.com/unipo' },
  ],
});
const teks = (v: unknown) => (typeof v === 'string' ? v : '');

// ---------------------------------------------------------------- definisi blok

export const SKEMA_BLOK: Record<TipeBlok, DefinisiBlok> = {
  hero: {
    label: 'Pembuka (hero)',
    keterangan: 'Judul besar, ajakan, tombol, gambar atau ilustrasi, dan angka singkat.',
    ikon: PanelTop,
    grup: 'Pembuka',
    kolom: [
      { k: 'lencana', jenis: 'teks', label: 'Lencana di atas judul', maks: 60, contoh: 'Semester ganjil sudah berjalan' },
      { k: 'judul', jenis: 'teks', label: 'Judul', maks: 140 },
      { k: 'sorot', jenis: 'teks', label: 'Teks sorot (berwarna, setelah judul)', maks: 80 },
      { k: 'deskripsi', jenis: 'paragraf', label: 'Keterangan', maks: 400, baris: 3 },
      { k: 'tombol', jenis: 'tombol', label: 'Tombol', maks: 3 },
      { k: 'catatan', jenis: 'teks', label: 'Catatan kecil di bawah tombol', maks: 160 },
      {
        k: 'tata',
        jenis: 'pilihan',
        label: 'Tata letak',
        opsi: [
          { v: 'belah', label: 'Teks + media' },
          { v: 'tengah', label: 'Teks di tengah' },
          { v: 'gambar', label: 'Di atas foto' },
        ],
      },
      { k: 'media', jenis: 'pilihan', label: 'Media', opsi: [{ v: 'ilustrasi', label: 'Ilustrasi' }, { v: 'gambar', label: 'Gambar' }, { v: 'slot', label: 'Data aplikasi' }, { v: 'tanpa', label: 'Tanpa' }], bila: (i) => i.tata !== 'tengah' && i.tata !== 'gambar' },
      { k: 'slot', jenis: 'slot', label: 'Bagian data di samping judul', bila: (i) => i.tata !== 'tengah' && i.tata !== 'gambar' && i.media === 'slot' },
      { k: 'ilustrasi', jenis: 'ilustrasi', label: 'Ilustrasi', bila: (i) => i.tata !== 'tengah' && i.tata !== 'gambar' && (i.media ?? 'ilustrasi') === 'ilustrasi' },
      { k: 'gambar', jenis: 'gambar', label: 'Gambar', bantuan: 'Mendatar, minimal lebar 1600 px untuk tata "Di atas foto".', bila: (i) => i.tata === 'gambar' || (i.tata !== 'tengah' && i.media === 'gambar') },
      {
        k: 'angka',
        jenis: 'daftar',
        label: 'Angka singkat',
        maks: 4,
        butir: 'angka',
        judulButir: (b) => [teks(b.nilai), teks(b.label)].filter(Boolean).join(' ') || 'Angka',
        baru: () => ({ nilai: '', label: '' }),
        kolom: [
          { k: 'nilai', jenis: 'teks', label: 'Nilai', maks: 20, contoh: '2.500+' },
          { k: 'label', jenis: 'teks', label: 'Label', maks: 60, contoh: 'Mahasiswa aktif' },
        ],
      },
    ],
    bawaan: () => ({
      isi: {
        lencana: 'Pendaftaran dibuka',
        judul: 'Judul utama halaman Anda',
        deskripsi: 'Satu atau dua kalimat yang menjelaskan manfaat utama aplikasi ini bagi pengunjung.',
        tombol: [{ label: 'Masuk', url: '/masuk', gaya: 'utama' }, { label: 'Pelajari dulu', url: '#fitur', gaya: 'garis' }],
        tata: 'belah',
        media: 'ilustrasi',
        ilustrasi: 'portal',
      },
      gaya: { jarak: 'lega' },
    }),
  },
  fitur: {
    label: 'Fitur / keunggulan',
    keterangan: 'Kisi kartu berikon: fitur aplikasi, alasan memilih, layanan.',
    ikon: Sparkles,
    grup: 'Isi',
    kolom: [
      ...KEPALA,
      { k: 'kolom', jenis: 'pilihan', label: 'Kolom di layar lebar', opsi: [{ v: '2', label: '2' }, { v: '3', label: '3' }, { v: '4', label: '4' }] },
      { k: 'tampilan', jenis: 'pilihan', label: 'Tampilan', opsi: [{ v: 'kartu', label: 'Kartu' }, { v: 'polos', label: 'Polos' }, { v: 'garis', label: 'Bergaris' }] },
      {
        k: 'butir',
        jenis: 'daftar',
        label: 'Butir',
        maks: 12,
        butir: 'fitur',
        judulButir: (b, i) => teks(b.judul) || `Fitur ${i + 1}`,
        baru: () => ({ ikon: 'bintang', judul: '', teks: '' }),
        kolom: [
          { k: 'ikon', jenis: 'ikon', label: 'Ikon' },
          { k: 'judul', jenis: 'teks', label: 'Judul', maks: 80 },
          { k: 'teks', jenis: 'paragraf', label: 'Penjelasan', maks: 300, baris: 2 },
          { k: 'url', jenis: 'url', label: 'Tautan (opsional)' },
        ],
      },
    ],
    bawaan: () => ({
      isi: {
        eyebrow: 'Fitur',
        judul: 'Semua yang Anda butuhkan di satu tempat',
        kolom: 3,
        tampilan: 'kartu',
        butir: [
          { ikon: 'buku', judul: 'Fitur pertama', teks: 'Jelaskan manfaatnya dalam satu kalimat.' },
          { ikon: 'aman', judul: 'Fitur kedua', teks: 'Jelaskan manfaatnya dalam satu kalimat.' },
          { ikon: 'perangkat', judul: 'Fitur ketiga', teks: 'Jelaskan manfaatnya dalam satu kalimat.' },
        ],
      },
      gaya: { rata: 'tengah' },
    }),
  },
  statistik: {
    label: 'Angka / statistik',
    keterangan: 'Deret angka penting, diisi sendiri atau otomatis dari data SIAKAD.',
    ikon: BarChart3,
    grup: 'Data',
    kolom: [
      ...KEPALA,
      { k: 'sumber', jenis: 'pilihan', label: 'Sumber angka', opsi: [{ v: 'manual', label: 'Diisi sendiri' }, { v: 'kampus', label: 'Otomatis dari SIAKAD' }], bantuan: 'Otomatis: jumlah program studi, mahasiswa aktif, dosen, dan lulusan.' },
      { k: 'situs', jenis: 'teks', label: 'Cakupan (kode situs portal)', maks: 40, contoh: 'univ', bantuan: 'Kosong = seluruh universitas.', bila: (i) => i.sumber === 'kampus' },
      { k: 'tampilan', jenis: 'pilihan', label: 'Tampilan', opsi: [{ v: 'pita', label: 'Pita' }, { v: 'papan', label: 'Papan' }, { v: 'kartu', label: 'Kartu' }] },
      {
        k: 'butir',
        jenis: 'daftar',
        label: 'Angka',
        maks: 6,
        butir: 'angka',
        bila: (i) => i.sumber !== 'kampus',
        judulButir: (b, i) => [teks(b.nilai), teks(b.label)].filter(Boolean).join(' ') || `Angka ${i + 1}`,
        baru: () => ({ nilai: '', label: '' }),
        kolom: [
          { k: 'nilai', jenis: 'teks', label: 'Nilai', maks: 20, contoh: '98%' },
          { k: 'label', jenis: 'teks', label: 'Label', maks: 60 },
          { k: 'keterangan', jenis: 'teks', label: 'Keterangan kecil', maks: 80 },
          { k: 'ikon', jenis: 'ikon', label: 'Ikon (tampilan kartu)' },
        ],
      },
    ],
    bawaan: () => ({
      isi: {
        sumber: 'manual',
        tampilan: 'pita',
        butir: [
          { nilai: '12', label: 'Program studi' },
          { nilai: '2.500+', label: 'Mahasiswa aktif' },
          { nilai: '150+', label: 'Dosen' },
          { nilai: 'B', label: 'Akreditasi institusi' },
        ],
      },
    }),
  },
  langkah: {
    label: 'Langkah / alur',
    keterangan: 'Urutan langkah bernomor: cara mendaftar, cara mulai, alur layanan.',
    ikon: ListOrdered,
    grup: 'Isi',
    kolom: [
      ...KEPALA,
      { k: 'tampilan', jenis: 'pilihan', label: 'Tampilan', opsi: [{ v: 'alur', label: 'Alur mendatar' }, { v: 'kartu', label: 'Kartu' }, { v: 'garis', label: 'Garis tegak' }] },
      {
        k: 'butir',
        jenis: 'daftar',
        label: 'Langkah',
        maks: 8,
        butir: 'langkah',
        judulButir: (b, i) => teks(b.judul) || `Langkah ${i + 1}`,
        baru: () => ({ judul: '', teks: '' }),
        kolom: [
          { k: 'judul', jenis: 'teks', label: 'Judul', maks: 80 },
          { k: 'teks', jenis: 'paragraf', label: 'Penjelasan', maks: 300, baris: 2 },
        ],
      },
    ],
    bawaan: () => ({
      isi: {
        eyebrow: 'Cara mulai',
        judul: 'Tiga langkah mudah',
        tampilan: 'alur',
        butir: [
          { judul: 'Masuk', teks: 'Gunakan akun SSO UNIPO Anda.' },
          { judul: 'Lengkapi data', teks: 'Isi data yang diminta, tersimpan otomatis.' },
          { judul: 'Selesai', teks: 'Pantau hasilnya kapan saja.' },
        ],
      },
      gaya: { latar: 'lembut', rata: 'tengah' },
    }),
  },
  kabar: {
    label: 'Berita / pengumuman',
    keterangan: 'Berita, pengumuman, atau agenda terbaru dari portal Humas, otomatis.',
    ikon: Newspaper,
    grup: 'Data',
    dinamis: true,
    kolom: [
      ...KEPALA,
      { k: 'jenis', jenis: 'pilihan', label: 'Isi', opsi: [{ v: 'berita', label: 'Berita' }, { v: 'pengumuman', label: 'Pengumuman' }, { v: 'agenda', label: 'Agenda' }] },
      { k: 'situs', jenis: 'teks', label: 'Situs portal (kode)', maks: 40, contoh: 'univ', bantuan: 'Kosong = semua situs. Contoh: univ, kode fakultas.' },
      { k: 'jumlah', jenis: 'angka', label: 'Jumlah tampil', min: 2, max: 9 },
      { k: 'tampilan', jenis: 'pilihan', label: 'Tampilan', opsi: [{ v: 'kisi', label: 'Kartu' }, { v: 'daftar', label: 'Daftar' }] },
      { k: 'semua_label', jenis: 'teks', label: 'Label tautan "lihat semua"', maks: 40 },
      { k: 'semua_url', jenis: 'url', label: 'Alamat "lihat semua"' },
    ],
    bawaan: () => ({ isi: { eyebrow: 'Kabar kampus', judul: 'Berita terbaru', jenis: 'berita', jumlah: 3, tampilan: 'kisi' } }),
  },
  ajakan: {
    label: 'Ajakan (CTA)',
    keterangan: 'Pita ajakan dengan tombol, biasanya menjelang akhir halaman.',
    ikon: MousePointerClick,
    grup: 'Penutup',
    kolom: [
      { k: 'judul', jenis: 'teks', label: 'Judul', maks: 140 },
      { k: 'deskripsi', jenis: 'paragraf', label: 'Keterangan', maks: 400, baris: 2 },
      { k: 'tombol', jenis: 'tombol', label: 'Tombol', maks: 2 },
      { k: 'nada', jenis: 'pilihan', label: 'Warna pita', opsi: [{ v: 'utama', label: 'Warna utama' }, { v: 'lembut', label: 'Lembut' }, { v: 'gelap', label: 'Gelap' }] },
    ],
    bawaan: () => ({ isi: { judul: 'Siap mulai?', deskripsi: 'Masuk dengan akun SSO UNIPO.', tombol: [{ label: 'Masuk sekarang', url: '/masuk', gaya: 'aksen' }], nada: 'utama' } }),
  },
  faq: {
    label: 'Tanya jawab (FAQ)',
    keterangan: 'Pertanyaan yang sering diajukan, bisa dicari.',
    ikon: HelpCircle,
    grup: 'Isi',
    kolom: [
      ...KEPALA,
      { k: 'tampilan', jenis: 'pilihan', label: 'Tampilan', opsi: [{ v: 'garis', label: 'Bergaris' }, { v: 'kartu', label: 'Kartu' }, { v: 'dua', label: 'Judul di samping' }] },
      { k: 'cari', jenis: 'saklar', label: 'Tampilkan kotak cari' },
      {
        k: 'butir',
        jenis: 'daftar',
        label: 'Pertanyaan',
        maks: 24,
        butir: 'pertanyaan',
        judulButir: (b, i) => teks(b.tanya) || `Pertanyaan ${i + 1}`,
        baru: () => ({ tanya: '', jawab: '' }),
        kolom: [
          { k: 'tanya', jenis: 'teks', label: 'Pertanyaan', maks: 200 },
          { k: 'jawab', jenis: 'paragraf', label: 'Jawaban', maks: 1500, baris: 4, ringan: true },
        ],
      },
    ],
    bawaan: () => ({
      isi: {
        eyebrow: 'FAQ',
        judul: 'Pertanyaan yang sering diajukan',
        tampilan: 'kartu',
        butir: [
          { tanya: 'Siapa yang bisa memakai aplikasi ini?', jawab: 'Jelaskan siapa saja penggunanya.' },
          { tanya: 'Bagaimana cara masuk?', jawab: 'Masuk dengan akun SSO UNIPO.' },
        ],
      },
      gaya: { rata: 'tengah', lebar: 'sempit' },
    }),
  },
  testimoni: {
    label: 'Testimoni',
    keterangan: 'Kutipan pengguna dengan foto, peran, dan bintang.',
    ikon: MessageSquareQuote,
    grup: 'Bukti',
    kolom: [
      ...KEPALA,
      {
        k: 'butir',
        jenis: 'daftar',
        label: 'Testimoni',
        maks: 12,
        butir: 'testimoni',
        judulButir: (b, i) => teks(b.nama) || `Testimoni ${i + 1}`,
        baru: () => ({ kutipan: '', nama: '', peran: '', bintang: 5 }),
        kolom: [
          { k: 'kutipan', jenis: 'paragraf', label: 'Kutipan', maks: 500, baris: 3 },
          { k: 'nama', jenis: 'teks', label: 'Nama', maks: 80 },
          { k: 'peran', jenis: 'teks', label: 'Peran', maks: 80, contoh: 'Alumni Teknik Informatika 2022' },
          { k: 'foto', jenis: 'gambar', label: 'Foto' },
          { k: 'bintang', jenis: 'angka', label: 'Bintang (0 = tanpa)', min: 0, max: 5 },
        ],
      },
    ],
    bawaan: () => ({
      isi: {
        eyebrow: 'Kata mereka',
        judul: 'Pengalaman pengguna',
        butir: [{ kutipan: 'Tulis kutipan pengalaman pengguna di sini.', nama: 'Nama pengguna', peran: 'Mahasiswa', bintang: 5 }],
      },
      gaya: { latar: 'lembut', rata: 'tengah' },
    }),
  },
  logo: {
    label: 'Logo mitra',
    keterangan: 'Deret logo mitra, akreditasi, atau penghargaan.',
    ikon: Handshake,
    grup: 'Bukti',
    kolom: [
      ...KEPALA,
      { k: 'tampilan', jenis: 'pilihan', label: 'Warna logo', opsi: [{ v: 'abu', label: 'Abu-abu (berwarna saat disorot)' }, { v: 'warna', label: 'Berwarna' }] },
      {
        k: 'butir',
        jenis: 'daftar',
        label: 'Logo',
        maks: 24,
        butir: 'logo',
        judulButir: (b, i) => teks(b.nama) || `Logo ${i + 1}`,
        baru: () => ({ gambar: '', nama: '', url: '' }),
        kolom: [
          { k: 'gambar', jenis: 'gambar', label: 'Gambar logo' },
          { k: 'nama', jenis: 'teks', label: 'Nama mitra', maks: 80 },
          { k: 'url', jenis: 'url', label: 'Tautan (opsional)' },
        ],
      },
    ],
    bawaan: () => ({ isi: { eyebrow: 'Mitra', judul: 'Dipercaya oleh', tampilan: 'abu', butir: [] }, gaya: { rata: 'tengah', jarak: 'rapat' } }),
  },
  galeri: {
    label: 'Galeri foto',
    keterangan: 'Mosaik foto yang bisa diperbesar.',
    ikon: Images,
    grup: 'Bukti',
    kolom: [
      ...KEPALA,
      {
        k: 'butir',
        jenis: 'daftar',
        label: 'Foto',
        maks: 16,
        butir: 'foto',
        judulButir: (b, i) => teks(b.keterangan) || `Foto ${i + 1}`,
        baru: () => ({ gambar: '', keterangan: '' }),
        kolom: [
          { k: 'gambar', jenis: 'gambar', label: 'Foto' },
          { k: 'keterangan', jenis: 'teks', label: 'Keterangan', maks: 120 },
        ],
      },
    ],
    bawaan: () => ({ isi: { eyebrow: 'Galeri', judul: 'Suasana kampus', butir: [] } }),
  },
  kontak: {
    label: 'Kontak & peta',
    keterangan: 'Alamat, telepon, WhatsApp, surel, jam layanan, peta, dan media sosial.',
    ikon: MapPin,
    grup: 'Penutup',
    kolom: [
      ...KEPALA,
      { k: 'alamat', jenis: 'paragraf', label: 'Alamat', maks: 300, baris: 2 },
      { k: 'telepon', jenis: 'teks', label: 'Telepon', maks: 40 },
      { k: 'whatsapp', jenis: 'teks', label: 'WhatsApp', maks: 40, contoh: '0812…' },
      { k: 'surel', jenis: 'teks', label: 'Surel', maks: 120 },
      { k: 'jam', jenis: 'teks', label: 'Jam layanan', maks: 120, contoh: 'Senin–Jumat, 08.00–16.00 WITA' },
      { k: 'lintang', jenis: 'angka', label: 'Lintang peta', min: -90, max: 90, desimal: true, bantuan: 'Salin dari Google Maps (angka pertama). Kosong = tanpa peta.' },
      { k: 'bujur', jenis: 'angka', label: 'Bujur peta', min: -180, max: 180, desimal: true },
      { k: 'peta_url', jenis: 'url', label: 'Tautan petunjuk arah', contoh: 'https://maps.app.goo.gl/…' },
      daftarSosial(),
    ],
    bawaan: () => ({
      isi: {
        eyebrow: 'Kontak',
        judul: 'Butuh bantuan?',
        alamat: 'Jl. Trans Sulawesi No. 147, Marisa, Pohuwato, Gorontalo',
        jam: 'Senin–Jumat, 08.00–16.00 WITA',
        lintang: 0.4719,
        bujur: 121.9372,
      },
    }),
  },
  teks: {
    label: 'Teks bebas',
    keterangan: 'Paragraf dengan judul: sambutan, tentang, ketentuan.',
    ikon: Type,
    grup: 'Isi',
    kolom: [
      { k: 'eyebrow', jenis: 'teks', label: 'Label kecil di atas judul', maks: 60 },
      { k: 'judul', jenis: 'teks', label: 'Judul', maks: 140 },
      { k: 'isi', jenis: 'paragraf', label: 'Isi', maks: 5000, baris: 8, ringan: true },
    ],
    bawaan: () => ({ isi: { judul: 'Tentang', isi: 'Tulis paragraf di sini. Pakai **tebal**, *miring*, [tautan](/alamat), dan baris diawali "- " untuk daftar.' }, gaya: { lebar: 'sempit' } }),
  },
  media: {
    label: 'Gambar + teks',
    keterangan: 'Gambar di satu sisi, teks, poin, dan tombol di sisi lain.',
    ikon: LayoutTemplate,
    grup: 'Isi',
    kolom: [
      { k: 'eyebrow', jenis: 'teks', label: 'Label kecil di atas judul', maks: 60 },
      { k: 'judul', jenis: 'teks', label: 'Judul', maks: 140 },
      { k: 'isi', jenis: 'paragraf', label: 'Isi', maks: 1500, baris: 4, ringan: true },
      {
        k: 'poin',
        jenis: 'daftar',
        label: 'Poin centang',
        maks: 6,
        butir: 'poin',
        judulButir: (b, i) => teks(b.teks) || `Poin ${i + 1}`,
        baru: () => ({ teks: '' }),
        kolom: [{ k: 'teks', jenis: 'teks', label: 'Teks', maks: 120 }],
      },
      { k: 'tombol', jenis: 'tombol', label: 'Tombol', maks: 2 },
      { k: 'gambar', jenis: 'gambar', label: 'Gambar' },
      { k: 'alt', jenis: 'teks', label: 'Teks pengganti gambar', maks: 160, bantuan: 'Dibacakan pembaca layar.' },
      { k: 'posisi', jenis: 'pilihan', label: 'Posisi gambar', opsi: [{ v: 'kiri', label: 'Kiri' }, { v: 'kanan', label: 'Kanan' }] },
    ],
    bawaan: () => ({ isi: { judul: 'Judul bagian', isi: 'Ceritakan satu hal penting dengan gambar pendukung.', posisi: 'kanan', poin: [{ teks: 'Poin pertama' }, { teks: 'Poin kedua' }] } }),
  },
  kaki: {
    label: 'Kaki halaman',
    keterangan: 'Logo, keterangan singkat, tautan, media sosial, dan hak cipta.',
    ikon: PanelBottom,
    grup: 'Penutup',
    kolom: [
      { k: 'teks', jenis: 'paragraf', label: 'Keterangan singkat', maks: 300, baris: 2 },
      { k: 'tampilan', jenis: 'pilihan', label: 'Tampilan', opsi: [{ v: 'terang', label: 'Terang' }, { v: 'gelap', label: 'Gelap' }, { v: 'ringkas', label: 'Ringkas' }] },
      { k: 'logo', jenis: 'saklar', label: 'Tampilkan logo aplikasi' },
      {
        k: 'tautan',
        jenis: 'daftar',
        label: 'Tautan',
        maks: 12,
        butir: 'tautan',
        judulButir: (b, i) => teks(b.label) || `Tautan ${i + 1}`,
        baru: () => ({ label: '', url: '' }),
        kolom: [
          { k: 'label', jenis: 'teks', label: 'Label', maks: 40 },
          { k: 'url', jenis: 'url', label: 'Alamat' },
        ],
      },
      daftarSosial(),
    ],
    bawaan: () => ({ isi: { teks: 'Dikelola Pustikom Universitas Pohuwato.', tampilan: 'ringkas', logo: true }, gaya: { jarak: 'tanpa', lebar: 'penuh' } }),
  },
  slot: {
    label: 'Bagian data aplikasi',
    keterangan: 'Bagian khusus yang diisi aplikasi dari datanya sendiri (mis. kelas terbuka, ringkasan tracer).',
    ikon: Puzzle,
    grup: 'Data',
    dinamis: true,
    kolom: [{ k: 'kunci', jenis: 'slot', label: 'Bagian' }, ...KEPALA],
    bawaan: () => ({ isi: {} }),
  },
};

export const GRUP_BLOK: GrupBlok[] = ['Pembuka', 'Isi', 'Data', 'Bukti', 'Penutup'];
export const URUT_BLOK = Object.keys(SKEMA_BLOK) as TipeBlok[];

/** Blok baru berisi contoh bawaan tipe itu. */
export function blokBaru(tipe: TipeBlok, isi?: IsiBlok): BlokLanding {
  const b = SKEMA_BLOK[tipe].bawaan();
  return { id: idBlok(), tipe, isi: { ...b.isi, ...isi }, gaya: { ...(b.gaya ?? {}) } };
}

/** Salinan blok dengan id baru (untuk duplikat dan sisip templat). */
export function salinBlok(b: BlokLanding): BlokLanding {
  return { ...structuredClone(b), id: idBlok() } as BlokLanding;
}

const objek = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/**
 * Rapikan dokumen dari API/templat: hanya tipe yang dikenal, id unik, isi/gaya berupa objek, maks. 40 blok.
 * Pembersihan isi yang ketat dilakukan server; renderer tetap menyaring tautan dan gambar (urlAman, gambarAman).
 */
export function normalisasiDokumen(d: unknown): DokumenLanding {
  const o = objek(d);
  const daftar = Array.isArray(o.blok) ? o.blok : [];
  const ada = new Set<string>();
  const blok: BlokLanding[] = [];
  for (const x of daftar) {
    const b = objek(x);
    const tipe = b.tipe as TipeBlok;
    if (!(tipe in SKEMA_BLOK) || blok.length >= 40) continue;
    let id = typeof b.id === 'string' && /^[a-z0-9]{4,16}$/.test(b.id) ? b.id : idBlok();
    while (ada.has(id)) id = idBlok();
    ada.add(id);
    blok.push({ id, tipe, isi: { ...objek(b.isi) }, gaya: { ...objek(b.gaya) } as GayaBlok });
  }
  const h = objek(o.halaman);
  return { versi: 1, halaman: { judul: typeof h.judul === 'string' ? h.judul : undefined, deskripsi: typeof h.deskripsi === 'string' ? h.deskripsi : undefined }, blok };
}

/** Tautan menu atas dari blok yang punya label menu dan jangkar: [{ key, label, href: '#jangkar' }]. */
export function menuLanding(d: DokumenLanding | null | undefined): Array<{ key: string; label: string; href: string }> {
  return (d?.blok ?? [])
    .filter((b) => b.gaya.menu && b.gaya.jangkar)
    .map((b) => ({ key: b.id, label: b.gaya.menu!, href: `#${b.gaya.jangkar}` }));
}

/** Judul singkat blok untuk daftar penyunting (judul isi atau label tipe). */
export function judulBlok(b: BlokLanding): string {
  const i = b.isi;
  const t = [i.judul, i.kunci, i.teks].find((x) => typeof x === 'string' && x.trim()) as string | undefined;
  return t ? (t.length > 48 ? `${t.slice(0, 47)}…` : t) : SKEMA_BLOK[b.tipe].label;
}

