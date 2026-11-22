'use client';
import { BookOpenCheck, CalendarClock, CalendarRange, ClipboardList, GraduationCap, Presentation, Users } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Progress } from '../../components/display';
import { StatCard, StatGrid } from '../../components/charts';
import type { RenderLink } from '../../lib/tautan';
import { labelTahunAkademik } from '../label-tahun';
import { statusKrs } from './krs';
import { predikatDariIpk, type PredikatKelulusan } from './skala';
import { tahapanSaatIni, type TahapanKalender } from './tahapan';
import { adaAngka, angka, hariDari, jamPendek, menitDari, nomorHari, type DataKrs, type DataTranskrip, type SesiKuliah } from './tipe';

/** Tautan tiap kartu portal ke menu aplikasi (mis. { krs: '/krs', transkrip: '/nilai' }). Tanpa tautan kartu tidak bisa diklik. */
export interface TautanPortal {
  ipk?: string;
  sks?: string;
  krs?: string;
  jadwal?: string;
  tahapan?: string;
  bimbingan?: string;
  kelas?: string;
}

interface UmumPortal {
  memuat?: boolean;
  tautan?: TautanPortal;
  renderLink?: RenderLink;
  kini?: Date;
  /** Tahapan periode dari kalender akademik server; kartu "Tahapan" tampil bila diisi. */
  tahapan?: ReadonlyArray<TahapanKalender> | null;
  /** Lebar minimum kartu (px) sebelum kisi turun kolom. */
  min?: number;
  className?: string;
}

/** Sesi hari ini berikutnya (atau yang sedang berlangsung). */
function sesiBerikut(jadwal: ReadonlyArray<SesiKuliah>, kini: Date) {
  const h = hariDari(kini);
  const m = kini.getHours() * 60 + kini.getMinutes();
  const hari = jadwal.filter((s) => nomorHari(s.hari) === h).sort((a, b) => (menitDari(a.jam_mulai) ?? 9999) - (menitDari(b.jam_mulai) ?? 9999));
  const nanti = hari.find((s) => (menitDari(s.jam_selesai) ?? (menitDari(s.jam_mulai) ?? 0) + 50) > m);
  return { jumlah: hari.length, nanti };
}

function KartuTahapan({ tahapan, kini, href, renderLink }: { tahapan: ReadonlyArray<TahapanKalender>; kini: Date; href?: string; renderLink?: RenderLink }) {
  const t = tahapanSaatIni(tahapan, kini);
  return (
    <StatCard
      label="Tahapan akademik"
      icon={<CalendarRange />}
      value={t ? t.judul : 'Tidak ada'}
      hint={t ? t.status.teks : 'Semua tahapan periode ini selesai'}
      tone={t?.status.keadaan === 'berlangsung' ? 'success' : 'info'}
      href={href}
      renderLink={renderLink}
    />
  );
}

export interface PortalAkademikMahasiswaProps extends UmumPortal {
  /** GET /v1/mahasiswa/{nim}/transkrip: IPK dan SKS lulus. */
  transkrip?: DataTranskrip | null;
  /** GET /v1/mahasiswa/{nim}/krs periode aktif. */
  krs?: DataKrs | null;
  /** `jadwal` dari GET /v1/mahasiswa/{nim}/jadwal. */
  jadwal?: ReadonlyArray<SesiKuliah> | null;
  /** m_predikat (usePredikatKelulusan) untuk keterangan predikat IPK. */
  predikat?: ReadonlyArray<PredikatKelulusan> | null;
  jenjang?: string | null;
  /** SKS minimal lulus prodi (aturan kurikulum server) untuk bilah kemajuan studi. */
  sksLulus?: number | null;
}

/** Kartu ringkas portal mahasiswa: IPK & predikat, SKS lulus, KRS periode ini, kuliah hari ini, tahapan berjalan. */
export function PortalAkademikMahasiswa({ transkrip, krs, jadwal, predikat, jenjang, sksLulus, tahapan, memuat, tautan = {}, renderLink, kini, min = 200, className }: PortalAkademikMahasiswaProps) {
  const sekarang = kini ?? new Date();
  const ipk = adaAngka(transkrip?.ipk?.nilai) ? Number(transkrip!.ipk!.nilai) : null;
  const sks = adaAngka(transkrip?.jumlah_sks) ? angka(transkrip?.jumlah_sks) : adaAngka(transkrip?.ipk?.sks) ? angka(transkrip?.ipk?.sks) : null;
  const pred = transkrip?.predikat_sementara ?? predikatDariIpk(ipk, predikat, jenjang);
  const mk = krs?.mata_kuliah ?? [];
  const st = statusKrs(mk);
  const sksKrs = adaAngka(krs?.jumlah_sks) ? angka(krs?.jumlah_sks) : mk.reduce((a, m) => a + angka(m.sks), 0);
  const kuliah = sesiBerikut(jadwal ?? [], sekarang);
  const muatTr = memuat && !transkrip;
  return (
    <StatGrid min={min} className={cn('u-ak-portal', className)}>
      <StatCard label="IPK" icon={<GraduationCap />} value={ipk != null ? ipk.toFixed(2) : '–'} hint={pred ?? (transkrip ? 'Indeks prestasi kumulatif' : undefined)} loading={muatTr} href={tautan.ipk} renderLink={renderLink} />
      <StatCard
        label="SKS lulus"
        icon={<BookOpenCheck />}
        value={sks != null ? (sksLulus ? `${sks} / ${sksLulus}` : sks) : '–'}
        hint={sksLulus && sks != null ? `${Math.max(0, sksLulus - sks)} SKS lagi` : undefined}
        footer={sksLulus && sks != null ? <Progress value={Math.min(sks, sksLulus)} max={sksLulus} size="sm" tone={sks >= sksLulus ? 'success' : 'primary'} /> : undefined}
        tone="success"
        loading={muatTr}
        href={tautan.sks}
        renderLink={renderLink}
      />
      <StatCard
        label={krs?.tahun_id ? `KRS ${labelTahunAkademik(krs.tahun_id, true)}` : 'KRS'}
        icon={<ClipboardList />}
        value={mk.length ? `${sksKrs} SKS` : 'Belum diisi'}
        hint={mk.length ? `${mk.length} mata kuliah · ${st.label}` : 'Isi KRS selama masa KRS dibuka'}
        tone={!mk.length ? 'warning' : st.setuju === st.total ? 'success' : 'warning'}
        loading={memuat && !krs}
        href={tautan.krs}
        renderLink={renderLink}
      />
      <StatCard
        label="Kuliah hari ini"
        icon={<CalendarClock />}
        value={kuliah.jumlah ? `${kuliah.jumlah} sesi` : 'Tidak ada'}
        hint={kuliah.nanti ? `Berikutnya ${jamPendek(kuliah.nanti.jam_mulai)} ${kuliah.nanti.nama_mk ?? ''}${kuliah.nanti.nama_ruang || kuliah.nanti.ruang ? ` · ${kuliah.nanti.nama_ruang || kuliah.nanti.ruang}` : ''}` : kuliah.jumlah ? 'Kuliah hari ini sudah selesai' : undefined}
        tone="info"
        loading={memuat && !jadwal}
        href={tautan.jadwal}
        renderLink={renderLink}
      />
      {tahapan?.length ? <KartuTahapan tahapan={tahapan} kini={sekarang} href={tautan.tahapan} renderLink={renderLink} /> : null}
    </StatGrid>
  );
}

export interface PortalMengajarDosenProps extends UmumPortal {
  /** GET /v1/dosen/{nidn}/jadwal periode aktif. */
  jadwal?: ReadonlyArray<SesiKuliah> | null;
  /** Jumlah mahasiswa bimbingan akademik aktif (meta.total GET /v1/dosen/{nidn}/mahasiswa-bimbingan). */
  jumlahBimbingan?: number | null;
  /** Jumlah KRS bimbingan yang menunggu persetujuan (GET /v1/akademik/krs/persetujuan). */
  krsMenunggu?: number | null;
}

/** Kartu ringkas portal dosen: kelas & SKS mengajar, mengajar hari ini, bimbingan akademik, KRS menunggu, tahapan. */
export function PortalMengajarDosen({ jadwal, jumlahBimbingan, krsMenunggu, tahapan, memuat, tautan = {}, renderLink, kini, min = 200, className }: PortalMengajarDosenProps) {
  const sekarang = kini ?? new Date();
  const data = jadwal ?? [];
  const kelas = new Set(data.map((s) => s.idj ?? `${s.kode_mk}-${s.kelas}`)).size;
  const sks = [...new Map(data.map((s) => [s.idj ?? `${s.kode_mk}-${s.kelas}`, angka(s.sks)])).values()].reduce((a, b) => a + b, 0);
  const hariIni = sesiBerikut(data, sekarang);
  return (
    <StatGrid min={min} className={cn('u-ak-portal', className)}>
      <StatCard label="Kelas diampu" icon={<Presentation />} value={kelas} hint={`${sks} SKS mengajar`} loading={memuat && !jadwal} href={tautan.kelas} renderLink={renderLink} />
      <StatCard
        label="Mengajar hari ini"
        icon={<CalendarClock />}
        value={hariIni.jumlah ? `${hariIni.jumlah} sesi` : 'Tidak ada'}
        hint={hariIni.nanti ? `Berikutnya ${jamPendek(hariIni.nanti.jam_mulai)} ${hariIni.nanti.nama_mk ?? ''}${hariIni.nanti.nama_ruang || hariIni.nanti.ruang ? ` · ${hariIni.nanti.nama_ruang || hariIni.nanti.ruang}` : ''}` : undefined}
        tone="info"
        loading={memuat && !jadwal}
        href={tautan.jadwal}
        renderLink={renderLink}
      />
      {jumlahBimbingan != null && <StatCard label="Mahasiswa bimbingan" icon={<Users />} value={jumlahBimbingan} hint="Bimbingan akademik aktif" tone="success" href={tautan.bimbingan} renderLink={renderLink} />}
      {krsMenunggu != null && (
        <StatCard label="KRS menunggu" icon={<ClipboardList />} value={krsMenunggu} hint={krsMenunggu ? 'Perlu persetujuan Anda' : 'Semua KRS bimbingan sudah diperiksa'} tone={krsMenunggu ? 'warning' : 'success'} href={tautan.krs} renderLink={renderLink} />
      )}
      {tahapan?.length ? <KartuTahapan tahapan={tahapan} kini={sekarang} href={tautan.tahapan} renderLink={renderLink} /> : null}
    </StatGrid>
  );
}
