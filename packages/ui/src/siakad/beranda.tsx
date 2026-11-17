'use client';
import * as React from 'react';
import { ArrowRight, BookOpenCheck, FileText, GraduationCap, IdCard, PartyPopper, Wallet } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatDate, formatRupiah } from '../lib/format';
import { Button, Skeleton } from '../components/actions';
import { Card, CardContent, CardHeader } from '../components/display';
import { Ilustrasi, type NamaIlustrasi } from '../ikon/ilustrasi';
import { JadwalMengajar, KartuProfilDosen, KartuProfilMahasiswa, KrsMahasiswa, MahasiswaBimbingan } from './akademik';
import { GalatApi } from './galat';
import { KalenderSidebar } from './kalender';
import { PengumumanSaya } from './kerangka-portal';
import { PengingatKelengkapan } from './kelengkapan';
import { ModalAjukanLayanan, ModalAmbilKrs, ModalCekKelulusan, ModalDaftarWisuda } from './modal-fitur';
import { KepegawaianSaya, useProfilSaya, type KeuanganMahasiswaData, type PeranProfil } from './profil-modul';
import { useSiakadQuery } from './provider';

/**
 * Beranda siap pakai per peran: sapaan, pengingat kelengkapan data, aksi cepat yang membuka modal fitur, dan widget
 * yang relevan (KRS, tagihan, jadwal mengajar, mahasiswa PA, kepegawaian, pengumuman sesuai akun, kalender).
 * Peran dan NIM/NIDN dibaca dari akun yang masuk (`/v1/profil/saya`).
 */

// ================================================================ Sapaan
function salam(d = new Date()): string {
  const j = d.getHours();
  return j < 11 ? 'Selamat pagi' : j < 15 ? 'Selamat siang' : j < 18 ? 'Selamat sore' : 'Selamat malam';
}

export interface SapaanBerandaProps {
  nama?: React.ReactNode;
  /** Baris kedua, mis. prodi atau unit. */
  keterangan?: React.ReactNode;
  ilustrasi?: NamaIlustrasi;
  /** Tombol di kanan (mis. "Lihat profil"). */
  aksi?: React.ReactNode;
  className?: string;
}

/** Kepala beranda: salam sesuai jam, nama, tanggal hari ini, dan ilustrasi peran. */
export function SapaanBeranda({ nama, keterangan, ilustrasi, aksi, className }: SapaanBerandaProps) {
  return (
    <section className={cn('u-beranda-sapaan', className)}>
      <div>
        <p className="u-beranda-tanggal">{formatDate(new Date(), 'full')}</p>
        <h2>
          {salam()}
          {nama ? <>, {nama}</> : null}
        </h2>
        {keterangan && <p className="u-beranda-ket">{keterangan}</p>}
        {aksi && <div className="u-beranda-sapaan-aksi">{aksi}</div>}
      </div>
      {ilustrasi && <Ilustrasi nama={ilustrasi} ekspresi="senang" lebar={190} className="u-beranda-ilus" />}
    </section>
  );
}

// ================================================================ Aksi cepat
export interface AksiCepatItem {
  key: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  icon: React.ReactNode;
  /** Tombol biasa. */
  onClick?: () => void;
  href?: string;
  /** Bungkus pemicu, mis. (t) => <ModalAmbilKrs trigger={t} />. */
  modal?: (trigger: React.ReactElement) => React.ReactNode;
}

/** Deret petak aksi cepat; tiap petak bisa membuka modal fitur, tautan, atau fungsi. */
export function AksiCepat({ items, className }: { items: AksiCepatItem[]; className?: string }) {
  return (
    <ul className={cn('u-aksi-cepat', className)}>
      {items.map((a) => {
        const isi = (
          <>
            <span className="u-aksi-cepat-ikon" aria-hidden>
              {a.icon}
            </span>
            <span className="u-aksi-cepat-teks">
              <b>{a.label}</b>
              {a.description && <small>{a.description}</small>}
            </span>
          </>
        );
        const tombol = a.href ? (
          <a className="u-aksi-cepat-item" href={a.href}>
            {isi}
          </a>
        ) : (
          <button type="button" className="u-aksi-cepat-item" onClick={a.onClick}>
            {isi}
          </button>
        );
        return <li key={a.key}>{a.modal ? a.modal(tombol) : tombol}</li>;
      })}
    </ul>
  );
}

// ================================================================ Tagihan
/** Ringkas tagihan mahasiswa untuk beranda: sisa, invoice aktif (nomor bayar + batas), tombol rincian. */
export function TagihanSaya({ nim, onLihat, className }: { nim: string; onLihat?: () => void; className?: string }) {
  const q = useSiakadQuery<KeuanganMahasiswaData>(
    ['keuangan', 'mahasiswa', nim],
    (s, signal) => s.request<KeuanganMahasiswaData>({ method: 'GET', path: `/v1/keuangan/mahasiswa/${encodeURIComponent(nim)}` }, { signal }),
    {
      enabled: Boolean(nim),
    },
  );
  return (
    <Card className={cn('u-beranda-tagihan', className)}>
      <CardHeader
        title="Tagihan"
        action={
          onLihat && (
            <Button size="sm" variant="ghost" onClick={onLihat}>
              Rincian <ArrowRight />
            </Button>
          )
        }
      />
      <CardContent>
        {q.error ? (
          <GalatApi error={q.error} onRetry={q.refetch} />
        ) : !q.data ? (
          <Skeleton height={84} />
        ) : q.data.ringkasan.sisa > 0 ? (
          <div className="u-beranda-tagihan-isi" data-nada="bahaya">
            <span>Belum dibayar</span>
            <b>{formatRupiah(q.data.ringkasan.sisa)}</b>
            {(q.data.invoice_aktif ?? []).slice(0, 1).map((i) => (
              <small key={i.id}>
                Bayar ke <span className="u-mono">{i.nomor}</span>
                {i.berlaku_sampai ? ` sebelum ${formatDate(i.berlaku_sampai, 'medium')}` : ''}
              </small>
            ))}
          </div>
        ) : (
          <div className="u-beranda-tagihan-isi" data-nada="baik">
            <span>Semua tagihan lunas</span>
            <b>{formatRupiah(0)}</b>
            <small>Terima kasih, KRS dan ujian tidak tertahan pembayaran.</small>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Panel({ title, action, children }: { title: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} action={action} />
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ================================================================ Beranda per peran
export interface BerandaSayaProps {
  /** Aksi cepat tambahan di ujung deret. */
  aksiTambahan?: AksiCepatItem[];
  /** Buka halaman profil (tombol di sapaan dan pengingat kelengkapan). */
  onBukaProfil?: () => void;
  /** Buka rincian keuangan (mahasiswa). */
  onBukaKeuangan?: () => void;
  /** Tautan "Semua pengumuman". */
  hrefPengumuman?: string;
  /**
   * Nyalakan/matikan widget bawaan (bawaan semua menyala sesuai peran). Aplikasi yang hanya boleh memanggil sebagian
   * API (mis. Profil: /v1/profil, /v1/kelengkapan) mematikan widget yang datanya tidak bisa diambil:
   * `layanan` (aksi cepat KRS, cek lulus, wisuda, ajukan layanan), `akademik` (profil + KRS mahasiswa), `tagihan`,
   * `mengajar` (profil dosen, jadwal, mahasiswa PA), `kepegawaian` (tendik), `pengumuman`, `kalender`,
   * `kelengkapan` (pengingat data PDDikti).
   */
  widget?: Partial<Record<WidgetBeranda, boolean>>;
  /** Isi tambahan kolom utama (di bawah widget bawaan), mis. ringkasan khusus aplikasi. */
  utama?: React.ReactNode;
  /** Isi tambahan kolom samping (di atas pengumuman). */
  samping?: React.ReactNode;
  className?: string;
}

export type WidgetBeranda = 'layanan' | 'akademik' | 'tagihan' | 'mengajar' | 'kepegawaian' | 'pengumuman' | 'kalender' | 'kelengkapan';

const ILUS: Record<PeranProfil, NamaIlustrasi> = { mahasiswa: 'mahasiswa', alumni: 'wisuda', dosen: 'dosen', tendik: 'tendik', pengguna: 'mahasiswa' };

/**
 * Satu komponen beranda untuk semua peran. Mahasiswa: KRS, tagihan, profil akademik, aksi ambil KRS / ajukan surat /
 * cek kelulusan / daftar wisuda. Dosen: jadwal mengajar, mahasiswa PA. Tendik: kepegawaian. Semua: pengumuman sesuai
 * akun dan kalender akademik.
 */
export function BerandaSaya({ aksiTambahan = [], onBukaProfil, onBukaKeuangan, hrefPengumuman, widget = {}, utama, samping: sampingTambahan, className }: BerandaSayaProps) {
  const p = useProfilSaya();
  const w = (k: WidgetBeranda) => widget[k] !== false;
  const [wisuda, setWisuda] = React.useState(false);
  if (p.error) return <GalatApi error={p.error} onRetry={p.refetch} className={className} />;
  if (!p.data)
    return (
      <div className={cn('u-beranda', className)} aria-busy>
        <Skeleton height={150} />
        <Skeleton height={88} />
        <Skeleton height={320} />
      </div>
    );
  const { peran, kunci } = p.data.identitas;
  const nama = p.data.profil?.nama_panggilan || String(p.data.akun.nama ?? '').split(' ')[0] || undefined;
  const id = p.data.identitas;
  const ket = [id.peran_label, [id.jenjang, id.nama_prodi].filter(Boolean).join(' ') || (id.unit as string | undefined)].filter(Boolean).join(' · ') || undefined;
  const mhs = peran === 'mahasiswa';
  const dosen = peran === 'dosen';

  const aksi: AksiCepatItem[] = [
    ...(mhs && w('layanan')
      ? [
          { key: 'krs', label: 'Ambil KRS', description: 'Pilih kelas semester ini', icon: <BookOpenCheck />, modal: (t: React.ReactElement) => <ModalAmbilKrs trigger={t} /> },
          {
            key: 'lulus',
            label: 'Cek kesiapan lulus',
            description: 'IPK, SKS, syarat yudisium',
            icon: <GraduationCap />,
            modal: (t: React.ReactElement) => <ModalCekKelulusan trigger={t} onDaftarWisuda={() => setWisuda(true)} />,
          },
          { key: 'wisuda', label: 'Daftar wisuda', description: 'Bila syarat terpenuhi', icon: <PartyPopper />, onClick: () => setWisuda(true) },
        ]
      : []),
    ...(w('layanan')
      ? [
          {
            key: 'layanan',
            label: 'Ajukan layanan',
            description: mhs ? 'Surat aktif kuliah, cuti, transkrip' : 'Surat tugas, keterangan, lainnya',
            icon: <FileText />,
            modal: (t: React.ReactElement) => <ModalAjukanLayanan trigger={t} />,
          },
        ]
      : []),
    ...(onBukaProfil ? [{ key: 'profil', label: 'Profil saya', description: 'Data pribadi dan riwayat', icon: <IdCard />, onClick: onBukaProfil }] : []),
    ...(mhs && onBukaKeuangan && w('tagihan') ? [{ key: 'keu', label: 'Keuangan', description: 'UKT dan riwayat bayar', icon: <Wallet />, onClick: onBukaKeuangan }] : []),
    ...aksiTambahan,
  ];

  const samping = (
    <>
      {mhs && w('tagihan') && <TagihanSaya nim={kunci} onLihat={onBukaKeuangan} />}
      {sampingTambahan}
      {w('pengumuman') && (
        <Panel
          title="Pengumuman untuk Anda"
          action={
            hrefPengumuman && (
              <Button size="sm" variant="ghost" render={<a href={hrefPengumuman} />}>
                Semua <ArrowRight />
              </Button>
            )
          }
        >
          <PengumumanSaya jumlah={5} />
        </Panel>
      )}
      {w('kalender') && <KalenderSidebar limit={4} />}
    </>
  );

  return (
    <div className={cn('u-beranda', className)} data-peran={peran}>
      <SapaanBeranda
        nama={nama}
        keterangan={ket}
        ilustrasi={ILUS[peran]}
        aksi={
          onBukaProfil && (
            <Button size="sm" variant="outline" onClick={onBukaProfil}>
              Lihat profil
            </Button>
          )
        }
      />
      {(mhs || dosen) && w('kelengkapan') && <PengingatKelengkapan onBuka={onBukaProfil} />}
      {aksi.length > 0 && <AksiCepat items={aksi} />}
      <div className="u-beranda-grid">
        <div className="u-beranda-utama">
          {mhs && w('akademik') && (
            <>
              <KartuProfilMahasiswa nim={kunci} />
              <Panel title="KRS semester ini">
                <KrsMahasiswa nim={kunci} />
              </Panel>
            </>
          )}
          {dosen && w('mengajar') && (
            <>
              <KartuProfilDosen nidn={kunci} />
              <Panel title="Jadwal mengajar">
                <JadwalMengajar nidn={kunci} />
              </Panel>
              <Panel title="Mahasiswa bimbingan akademik">
                <MahasiswaBimbingan nidn={kunci} />
              </Panel>
            </>
          )}
          {peran === 'tendik' && w('kepegawaian') && <KepegawaianSaya />}
          {utama}
        </div>
        <aside className="u-beranda-samping">{samping}</aside>
      </div>
      {mhs && w('layanan') && <ModalDaftarWisuda open={wisuda} onOpenChange={setWisuda} />}
    </div>
  );
}
