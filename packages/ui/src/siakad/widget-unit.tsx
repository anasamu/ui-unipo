'use client';
import * as React from 'react';
import { Archive, BookUser, Briefcase, ClipboardCheck, FlaskConical, GraduationCap, Inbox, Mail, ScanLine, ShieldCheck, UserPlus, Users, Wallet } from 'lucide-react';
import { Badge, Button, Skeleton } from '../components/actions';
import { ProgressBertumpuk, ProgressCincinBanyak, ProgressGauge, ProgressLangkah, ProgressTebal, type BagianProgres, type LangkahProgres } from '../components/progres';
import { Sparkline } from '../components/charts';
import { cn } from '../lib/cn';
import { formatNumber, formatRupiahRingkas } from '../lib/format';
import { usePlatform } from '../lib/platform';
import { useDasborSpmi, useLaporanArsip, useRekapLppm, useRingkasAkademik, useRingkasanSdm, useSerapanAnggaran, useStatistikPmb, useTrenAkademik } from './dasbor';
import { usePresensiSaya } from './presensi';
import { pesanGalat, type QueryState } from './provider';
import { Tekan } from '../components/tekan';

// Widget per unit dengan lima varian tampilan yang sama: kartu (angka + progres), ringkas (satu baris), cincin,
// baris (daftar rincian), sorot (kartu berwarna besar). Setiap widget memakai hook dasbor yang sudah ada, jadi
// beberapa widget dengan kueri sama berbagi satu panggilan API. Di mobile varian `baris` dan `sorot` lebih rapat.

type Angka = number | string | null | undefined;
const n = (v: Angka) => (v == null || v === '' ? 0 : Number(v) || 0);

export type VarianWidget = 'kartu' | 'ringkas' | 'cincin' | 'baris' | 'sorot';

/** Data netral yang dirender KartuWidget. */
export interface DataWidget {
  judul: React.ReactNode;
  ikon?: React.ReactNode;
  nilai: React.ReactNode;
  satuan?: React.ReactNode;
  keterangan?: React.ReactNode;
  /** 0–1 untuk bilah/cincin/gauge. */
  rasio?: number | null;
  rasioLabel?: React.ReactNode;
  /** Komposisi (bilah bertumpuk). */
  bagian?: BagianProgres[];
  /** Rincian untuk varian `baris`. */
  rincian?: Array<{ label: React.ReactNode; nilai: React.ReactNode; tone?: 'success' | 'warning' | 'danger' | 'info' }>;
  /** Titik tren (sparkline). */
  tren?: number[];
  /** Langkah (mis. PPEPP SPMI, tahap pengajuan). */
  langkah?: LangkahProgres[];
  /** Penanda kondisi. */
  lencana?: { teks: React.ReactNode; tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' };
  /** Warna aksen kartu (CSS). */
  warna?: string;
}

export interface KartuWidgetProps {
  data?: DataWidget | null;
  varian?: VarianWidget;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  /** Tautan "Lihat semua". */
  href?: string;
  aksi?: React.ReactNode;
  className?: string;
}

/** Kerangka widget bersama: satu data, lima varian tampilan. */
export function KartuWidget({ data, varian = 'kartu', loading, error, onRetry, href, aksi, className }: KartuWidgetProps) {
  const p = usePlatform();
  const gaya = data?.warna ? ({ '--u-wu-warna': data.warna } as React.CSSProperties) : undefined;
  if (error)
    return (
      <div className={cn('u-wu', className)} data-varian={varian} role="alert">
        <span className="u-wu-galat">{pesanGalat(error, { kode: false })}</span>
        {onRetry && (
          <Button size="sm" variant="ghost" onClick={onRetry}>
            Muat ulang
          </Button>
        )}
      </div>
    );
  if (loading || !data)
    return (
      <div className={cn('u-wu', className)} data-varian={varian} aria-busy="true">
        <Skeleton shape="text" width="40%" />
        <Skeleton height={varian === 'ringkas' ? 20 : 36} width="60%" />
        {varian !== 'ringkas' && <Skeleton shape="text" width="80%" />}
      </div>
    );
  const kepala = (
    <div className="u-wu-kepala">
      {data.ikon && (
        <span className="u-wu-ikon" aria-hidden>
          {data.ikon}
        </span>
      )}
      <span className="u-wu-judul">{data.judul}</span>
      {data.lencana && <Badge variant={data.lencana.tone ?? 'neutral'}>{data.lencana.teks}</Badge>}
      {aksi}
    </div>
  );
  const nilai = (
    <div className="u-wu-nilai">
      <b>{data.nilai}</b>
      {data.satuan && <span>{data.satuan}</span>}
    </div>
  );
  const kaki = href ? (
    <a className="u-wu-tautan" href={href}>
      Lihat rincian
    </a>
  ) : null;

  if (varian === 'ringkas')
    return (
      <div className={cn('u-wu', className)} data-varian="ringkas" style={gaya}>
        <span className="u-wu-ikon" aria-hidden>
          {data.ikon}
        </span>
        <span className="u-wu-judul">{data.judul}</span>
        {data.rasio != null && !p.mobile && <ProgressTebal value={data.rasio * 100} label="" className="u-wu-mini" />}
        {nilai}
      </div>
    );
  if (varian === 'cincin')
    return (
      <div className={cn('u-wu', className)} data-varian="cincin" style={gaya}>
        {kepala}
        <div className="u-wu-cincin">
          {data.bagian && data.bagian.length > 1 ? (
            <ProgressCincinBanyak
              ukuran={p.mobile ? 104 : 120}
              tengah={<b>{data.nilai}</b>}
              cincin={data.bagian.slice(0, 3).map((b) => {
                const t = data.bagian!.reduce((a, x) => a + x.nilai, 0) || 1;
                return { label: b.label, nilai: (b.nilai / t) * 100, tone: b.tone === 'muted' ? undefined : b.tone };
              })}
            />
          ) : (
            <ProgressGauge nilai={(data.rasio ?? 0) * 100} teks={data.nilai} label={data.satuan} tone="primary" ukuran={p.mobile ? 140 : 168} />
          )}
        </div>
        {(data.rasioLabel || data.keterangan) && (
          <div className="u-wu-cincin-ket">
            {data.rasioLabel && <span className="u-wu-cincin-rasio">{data.rasioLabel}</span>}
            {data.keterangan && <p className="u-wu-ket">{data.keterangan}</p>}
          </div>
        )}
        {kaki}
      </div>
    );
  if (varian === 'baris')
    return (
      <div className={cn('u-wu', className)} data-varian="baris" style={gaya}>
        {kepala}
        {nilai}
        <ul className="u-wu-rincian">
          {(data.rincian ?? data.bagian?.map((b) => ({ label: b.label, nilai: formatNumber(b.nilai), tone: undefined })) ?? []).map((r, i) => (
            <li key={i} data-tone={r.tone}>
              <span>{r.label}</span>
              <b>{r.nilai}</b>
            </li>
          ))}
        </ul>
        {kaki}
      </div>
    );
  if (varian === 'sorot')
    return (
      <div className={cn('u-wu', className)} data-varian="sorot" style={gaya}>
        {kepala}
        {nilai}
        {data.keterangan && <p className="u-wu-ket">{data.keterangan}</p>}
        {data.rasio != null && <ProgressTebal value={data.rasio * 100} label={data.rasioLabel} />}
        {data.tren && data.tren.length > 1 && <Sparkline data={data.tren} width={p.mobile ? 120 : 180} height={36} tone="currentColor" />}
        {kaki}
      </div>
    );
  return (
    <div className={cn('u-wu', className)} data-varian="kartu" style={gaya}>
      {kepala}
      <div className="u-wu-baris-nilai">
        {nilai}
        {data.tren && data.tren.length > 1 && <Sparkline data={data.tren} />}
      </div>
      {data.keterangan && <p className="u-wu-ket">{data.keterangan}</p>}
      {data.langkah ? (
        <ProgressLangkah langkah={data.langkah} varian="segmen" />
      ) : data.bagian ? (
        <ProgressBertumpuk bagian={data.bagian} tinggi="sm" legenda={!p.mobile} />
      ) : data.rasio != null ? (
        <ProgressTebal value={data.rasio * 100} label={data.rasioLabel} />
      ) : null}
      {kaki}
    </div>
  );
}

/** Pabrik widget: satu hook data + pengubah ke DataWidget. */
function buatWidgetUnit<Q extends object, D>(nama: string, useData: (q: Q) => QueryState<D>, ubah: (d: D, q: Q) => DataWidget) {
  function Widget({ varian, href, aksi, className, ...q }: Q & { varian?: VarianWidget; href?: string; aksi?: React.ReactNode; className?: string }) {
    const r = useData(q as Q);
    return <KartuWidget data={r.data ? ubah(r.data, q as Q) : null} varian={varian} loading={r.loading && !r.data} error={r.error} onRetry={r.refetch} href={href} aksi={aksi} className={className} />;
  }
  Widget.displayName = nama;
  return Widget;
}

/** "keamanan_kebersihan" → "Keamanan kebersihan". */
const manusiawi = (k: string) => (k ? k[0]!.toUpperCase() + k.slice(1).replace(/_/g, ' ') : k);

const top = (rec: Record<string, Angka> | undefined, maks = 4): BagianProgres[] =>
  Object.entries(rec ?? {})
    .map(([k, v]) => ({ label: manusiawi(k), nilai: n(v) }))
    .sort((a, b) => b.nilai - a.nilai)
    .slice(0, maks);

// ================================================================ SDM, dosen, tendik
/** Pegawai: total, dosen vs tendik, pendidikan. GET /v1/sdm/laporan/ringkasan. */
export const WidgetSdm = buatWidgetUnit('WidgetSdm', useRingkasanSdm, (d) => {
  const dosen = n(d.per_jenis?.dosen ?? d.per_jenis?.Dosen);
  const tendik = n(d.total) - dosen;
  return {
    judul: 'Pegawai',
    ikon: <Users />,
    nilai: formatNumber(n(d.total)),
    satuan: 'orang',
    keterangan: `${formatNumber(dosen)} dosen · ${formatNumber(tendik)} tendik`,
    bagian: [
      { label: 'Dosen', nilai: dosen, tone: 'primary' },
      { label: 'Tendik', nilai: tendik, tone: 'secondary' },
    ],
    rincian: top(d.per_status_kepegawaian).map((b) => ({ label: b.label, nilai: formatNumber(b.nilai) })),
    warna: 'var(--u-chart-1)',
  };
});

/** Dosen: jabatan akademik, sertifikasi, pendidikan S3. */
export const WidgetDosen = buatWidgetUnit('WidgetDosen', useRingkasanSdm, (d) => {
  const jab = top(d.dosen?.per_jabatan_akademik, 5);
  const total = jab.reduce((a, b) => a + b.nilai, 0) || n(d.per_jenis?.dosen);
  const serdos = n(d.dosen?.serdos?.sudah ?? d.dosen?.serdos?.Sudah ?? d.dosen?.serdos?.ya);
  const s3 = n(d.dosen?.per_pendidikan?.S3);
  return {
    judul: 'Dosen',
    ikon: <BookUser />,
    nilai: formatNumber(total),
    satuan: 'dosen',
    keterangan: `${formatNumber(serdos)} bersertifikat pendidik · ${formatNumber(s3)} bergelar S3`,
    rasio: total ? serdos / total : null,
    rasioLabel: `${total ? Math.round((serdos / total) * 100) : 0}% serdos`,
    bagian: jab,
    rincian: jab.map((b) => ({ label: b.label, nilai: formatNumber(b.nilai) })),
    warna: 'var(--u-chart-2)',
  };
});

/** Tenaga kependidikan per jenis. */
export const WidgetTendik = buatWidgetUnit('WidgetTendik', useRingkasanSdm, (d) => {
  const per = top(d.tendik?.per_jenis_tendik, 5);
  const total = per.reduce((a, b) => a + b.nilai, 0);
  return {
    judul: 'Tenaga kependidikan',
    ikon: <Briefcase />,
    nilai: formatNumber(total),
    satuan: 'orang',
    keterangan: per[0] ? `Terbanyak: ${per[0].label}` : undefined,
    bagian: per,
    rincian: per.map((b) => ({ label: b.label, nilai: formatNumber(b.nilai) })),
    warna: 'var(--u-chart-3)',
  };
});

// ================================================================ BAAK & mahasiswa
/** BAAK: mahasiswa aktif dan pengisian KRS semester ini (dengan tren). */
export function WidgetBaak({ tahunId, kodeProdi, varian, href, className }: { tahunId?: string; kodeProdi?: string; varian?: VarianWidget; href?: string; className?: string }) {
  const r = useRingkasAkademik({ tahunId, kodeProdi });
  const t = useTrenAkademik({ semester: 8, kodeProdi });
  const d = r.data?.total;
  const aktif = n(d?.mahasiswa_aktif);
  const krs = n(d?.mengisi_krs);
  return (
    <KartuWidget
      varian={varian}
      href={href}
      className={className}
      loading={r.loading && !r.data}
      error={r.error}
      onRetry={r.refetch}
      data={
        r.data && {
          judul: `KRS ${r.data.tahun_id}`,
          ikon: <ClipboardCheck />,
          nilai: formatNumber(krs),
          satuan: `/ ${formatNumber(aktif)} mahasiswa`,
          rasio: aktif ? krs / aktif : 0,
          rasioLabel: `${aktif ? Math.round((krs / aktif) * 100) : 0}% sudah KRS`,
          tren: t.data?.map((x) => n(x.mengisi_krs)),
          lencana: n(d?.ews_tinggi) ? { teks: `${formatNumber(n(d?.ews_tinggi))} EWS tinggi`, tone: 'danger' } : undefined,
          rincian: [
            { label: 'Mahasiswa baru', nilai: formatNumber(n(d?.mahasiswa_baru)) },
            { label: 'Cuti', nilai: formatNumber(n(d?.cuti)), tone: 'warning' },
            { label: 'Nonaktif', nilai: formatNumber(n(d?.nonaktif)), tone: 'danger' },
            { label: 'Lulusan', nilai: formatNumber(n(d?.lulusan)), tone: 'success' },
          ],
          warna: 'var(--u-chart-4)',
        }
      }
    />
  );
}

/** Mahasiswa: komposisi status (aktif, cuti, nonaktif) dan lulusan. */
export const WidgetMahasiswa = buatWidgetUnit('WidgetMahasiswa', useRingkasAkademik, (r) => {
  const d = r.total;
  return {
    judul: 'Mahasiswa',
    ikon: <GraduationCap />,
    nilai: formatNumber(n(d.mahasiswa_aktif)),
    satuan: 'aktif',
    keterangan: `${formatNumber(n(d.mahasiswa_baru))} mahasiswa baru · ${formatNumber(n(d.lulusan))} lulusan`,
    bagian: [
      { label: 'Aktif', nilai: n(d.status_aktif_semester ?? d.mahasiswa_aktif), tone: 'success' },
      { label: 'Cuti', nilai: n(d.cuti), tone: 'warning' },
      { label: 'Nonaktif', nilai: n(d.nonaktif), tone: 'danger' },
    ],
    warna: 'var(--u-chart-5)',
  };
});

// ================================================================ SPMI & LP2M
const PPEPP = ['penetapan', 'pelaksanaan', 'evaluasi', 'pengendalian', 'peningkatan'] as const;
/** SPMI: siklus PPEPP, capaian standar, temuan terbuka. GET /v1/spmi/dasbor. */
export const WidgetSpmi = buatWidgetUnit('WidgetSpmi', useDasborSpmi, (d) => {
  const persen = n(d.capaian?.persen_terpenuhi);
  const terbuka = n(d.temuan.terbuka);
  return {
    judul: d.periode?.nama ? `SPMI ${d.periode.nama}` : 'SPMI',
    ikon: <ShieldCheck />,
    nilai: `${Math.round(persen)}%`,
    satuan: 'standar terpenuhi',
    rasio: persen / 100,
    rasioLabel: `${Math.round(persen)}% terpenuhi`,
    keterangan: `${formatNumber(terbuka)} temuan terbuka${n(d.temuan.terlambat) ? `, ${formatNumber(n(d.temuan.terlambat))} terlambat` : ''}`,
    langkah: PPEPP.map((k) => ({ label: k[0].toUpperCase() + k.slice(1), status: d.ppepp[k]?.terpenuhi ? ('selesai' as const) : ('menunggu' as const) })),
    lencana: n(d.temuan.kts_mayor) ? { teks: `${formatNumber(n(d.temuan.kts_mayor))} KTS mayor`, tone: 'danger' } : undefined,
    rincian: [
      { label: 'Tercapai', nilai: formatNumber(n(d.capaian?.tercapai)), tone: 'success' },
      { label: 'Melampaui', nilai: formatNumber(n(d.capaian?.melampaui)), tone: 'info' },
      { label: 'Tidak tercapai', nilai: formatNumber(n(d.capaian?.tidak_tercapai)), tone: 'danger' },
      { label: 'Temuan terbuka', nilai: formatNumber(terbuka), tone: 'warning' },
    ],
    warna: 'var(--u-chart-6)',
  };
});

/** LP2M: penelitian/pengabdian per status, dana, tugas pengelola. GET /v1/lppm/rekap/dasbor. */
export const WidgetLppm = buatWidgetUnit('WidgetLppm', useRekapLppm, (d) => {
  const per = new Map<string, number>();
  d.kegiatan_per_status.forEach((k) => per.set(k.status, (per.get(k.status) ?? 0) + n(k.jumlah)));
  const total = [...per.values()].reduce((a, b) => a + b, 0);
  const dana = d.kegiatan_per_status.reduce((a, k) => a + n(k.dana_disetujui), 0);
  const tugas = d.tugas_pengelola ?? {};
  const menunggu = Object.values(tugas).reduce((a: number, v) => a + n(v), 0);
  return {
    judul: d.tahun ? `Kegiatan LP2M ${d.tahun}` : 'Kegiatan LP2M',
    ikon: <FlaskConical />,
    nilai: formatNumber(total),
    satuan: 'kegiatan',
    keterangan: `Dana disetujui ${formatRupiahRingkas(dana)} · ${formatNumber(n(d.dosen_terlibat))} dosen terlibat`,
    bagian: [...per.entries()].map(([label, nilai]) => ({ label: label.replace(/_/g, ' '), nilai })).slice(0, 5),
    lencana: menunggu ? { teks: `${formatNumber(menunggu)} menunggu`, tone: 'warning' } : undefined,
    rincian: Object.entries(tugas).map(([k, v]) => ({ label: manusiawi(k), nilai: formatNumber(n(v)), tone: n(v) ? ('warning' as const) : undefined })),
    warna: 'var(--u-chart-2)',
  };
});

// ================================================================ Keuangan & PMB
/** Serapan anggaran: realisasi terhadap anggaran. GET /v1/keu/serapan. */
export const WidgetKeuangan = buatWidgetUnit('WidgetKeuangan', useSerapanAnggaran, (d) => {
  const persen = n(d.persen);
  const unitRendah = d.per_unit.toSorted((a, b) => n(a.persen) - n(b.persen)).slice(0, 4);
  return {
    judul: d.periode?.nama ? `Serapan ${d.periode.nama}` : 'Serapan anggaran',
    ikon: <Wallet />,
    nilai: formatRupiahRingkas(n(d.realisasi)),
    satuan: `dari ${formatRupiahRingkas(n(d.anggaran))}`,
    rasio: persen / 100,
    rasioLabel: `${Math.round(persen)}% terserap`,
    keterangan: d.penerimaan_lain ? `Penerimaan lain ${formatRupiahRingkas(n(d.penerimaan_lain))}` : undefined,
    rincian: unitRendah.map((u) => ({ label: u.unit ?? `Unit ${u.unit_id}`, nilai: `${Math.round(n(u.persen))}%`, tone: n(u.persen) < 40 ? ('warning' as const) : undefined })),
    warna: 'var(--u-chart-1)',
  };
});

/** PMB: corong pendaftaran sampai daftar ulang. GET /v1/pmb/admin/statistik. */
export const WidgetPmb = buatWidgetUnit('WidgetPmb', useStatistikPmb, (d) => {
  const c = d.corong;
  return {
    judul: 'Penerimaan mahasiswa baru',
    ikon: <UserPlus />,
    nilai: formatNumber(n(c.daftar_ulang)),
    satuan: `daftar ulang dari ${formatNumber(n(c.pendaftaran))} pendaftar`,
    tren: d.harian_30_hari.map((h) => n(h.diajukan)),
    langkah: [
      { label: 'Daftar', status: n(c.pendaftaran) ? 'selesai' : 'menunggu' },
      { label: 'Diajukan', status: n(c.diajukan) ? 'selesai' : 'menunggu' },
      { label: 'Terverifikasi', status: n(c.terverifikasi) ? 'selesai' : 'menunggu' },
      { label: 'Lulus', status: n(c.lulus) ? 'selesai' : 'menunggu' },
      { label: 'Daftar ulang', status: n(c.daftar_ulang) ? 'aktif' : 'menunggu' },
    ],
    rincian: [
      { label: 'Pendaftaran', nilai: formatNumber(n(c.pendaftaran)) },
      { label: 'Diajukan', nilai: formatNumber(n(c.diajukan)) },
      { label: 'Bayar formulir', nilai: formatNumber(n(c.bayar_formulir)) },
      { label: 'Lulus', nilai: formatNumber(n(c.lulus)), tone: 'success' },
      { label: 'Daftar ulang', nilai: formatNumber(n(c.daftar_ulang)), tone: 'success' },
    ],
    warna: 'var(--u-chart-5)',
  };
});

// ================================================================ Arsip & surat
/** Arsip: dokumen, kedaluwarsa, retensi jatuh tempo. GET /v1/arsip/laporan/ringkasan. */
export const WidgetArsip = buatWidgetUnit('WidgetArsip', useLaporanArsip, (d) => {
  const dok = d.dokumen ?? {};
  const kedaluwarsa = n(dok.kedaluwarsa);
  return {
    judul: 'Arsip dokumen',
    ikon: <Archive />,
    nilai: formatNumber(n(dok.total)),
    satuan: 'dokumen',
    keterangan: `${formatNumber(n(dok.akan_kedaluwarsa_90_hari))} kedaluwarsa dalam 90 hari · ${formatNumber(n(d.peminjaman_aktif))} sedang dipinjam`,
    rasio: n(dok.total) ? 1 - kedaluwarsa / n(dok.total) : null,
    rasioLabel: `${formatNumber(kedaluwarsa)} kedaluwarsa`,
    lencana: kedaluwarsa ? { teks: `${formatNumber(kedaluwarsa)} kedaluwarsa`, tone: 'warning' } : { teks: 'Terkini', tone: 'success' },
    rincian: [
      { label: 'Retensi: pindah', nilai: formatNumber(n(d.retensi_jatuh_tempo?.pemindahan)) },
      { label: 'Retensi: musnah/serah', nilai: formatNumber(n(d.retensi_jatuh_tempo?.pemusnahan_penyerahan)), tone: 'warning' },
      { label: 'Peminjaman aktif', nilai: formatNumber(n(d.peminjaman_aktif)) },
    ],
    warna: 'var(--u-chart-3)',
  };
});

/** Surat: masuk/keluar tahun ini, disposisi aktif dan lewat batas, tren per bulan. */
export const WidgetSurat = buatWidgetUnit('WidgetSurat', useLaporanArsip, (d) => {
  const masuk = d.surat_per_bulan.reduce((a, b) => a + n(b.masuk), 0);
  const keluar = d.surat_per_bulan.reduce((a, b) => a + n(b.keluar), 0);
  const disp = d.disposisi ?? {};
  return {
    judul: `Surat ${d.tahun}`,
    ikon: <Mail />,
    nilai: formatNumber(masuk + keluar),
    satuan: 'surat',
    keterangan: `${formatNumber(n(disp.aktif))} disposisi aktif${n(disp.rata_jam_selesai) ? ` · rata-rata selesai ${Math.round(n(disp.rata_jam_selesai))} jam` : ''}`,
    bagian: [
      { label: 'Masuk', nilai: masuk, tone: 'info' },
      { label: 'Keluar', nilai: keluar, tone: 'primary' },
    ],
    tren: d.surat_per_bulan.map((b) => n(b.masuk) + n(b.keluar)),
    lencana: n(disp.lewat_batas) ? { teks: `${formatNumber(n(disp.lewat_batas))} lewat batas`, tone: 'danger' } : undefined,
    rincian: [
      { label: 'Surat masuk', nilai: formatNumber(masuk) },
      { label: 'Surat keluar', nilai: formatNumber(keluar) },
      { label: 'Disposisi aktif', nilai: formatNumber(n(disp.aktif)), tone: 'warning' },
      { label: 'Disposisi selesai', nilai: formatNumber(n(disp.selesai)), tone: 'success' },
    ],
    warna: 'var(--u-chart-4)',
  };
});

// ================================================================ Presensi saya
/** Kehadiran saya dari presensi QR: persen hadir, terlambat, sesi berlangsung. */
export function WidgetPresensi({ varian, href, className }: { varian?: VarianWidget; href?: string; className?: string }) {
  const r = usePresensiSaya();
  const d = r.data;
  const h = d?.riwayat ?? [];
  const hit = (s: string) => h.filter((x) => x.status === s).length;
  const hadir = hit('H');
  const telat = h.filter((x) => x.terlambat).length;
  return (
    <KartuWidget
      varian={varian}
      href={href}
      className={className}
      loading={r.loading && !d}
      error={r.error}
      onRetry={r.refetch}
      data={
        d && {
          judul: 'Kehadiran saya',
          ikon: <ScanLine />,
          nilai: h.length ? `${Math.round((hadir / h.length) * 100)}%` : '–',
          satuan: `hadir dari ${h.length} sesi`,
          rasio: h.length ? hadir / h.length : null,
          rasioLabel: `${hadir} hadir`,
          keterangan: telat ? `${telat} kali terlambat` : 'Tidak pernah terlambat',
          lencana: d.berlangsung.length ? { teks: `${d.berlangsung.length} sesi berlangsung`, tone: 'info' } : undefined,
          bagian: [
            { label: 'Hadir', nilai: hadir, tone: 'success' },
            { label: 'Izin', nilai: hit('I'), tone: 'info' },
            { label: 'Sakit', nilai: hit('S'), tone: 'warning' },
            { label: 'Alpa', nilai: hit('A'), tone: 'danger' },
          ],
          warna: 'var(--u-chart-2)',
        }
      }
    />
  );
}

// ================================================================ Pengajuan (presentasional)
export interface PengajuanRingkas {
  id: string | number;
  judul: React.ReactNode;
  nomor?: React.ReactNode;
  tanggal?: React.ReactNode;
  /** Tahap alur, mis. Diajukan → Diverifikasi prodi → Disetujui dekan → Selesai. */
  langkah: LangkahProgres[];
  status?: { teks: React.ReactNode; tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' };
  href?: string;
  onClick?: () => void;
}

export interface WidgetPengajuanProps {
  judul?: React.ReactNode;
  items: PengajuanRingkas[];
  /** `daftar` baris dengan bilah tahap · `linimasa` tahap vertikal untuk satu pengajuan · `kartu` kisi kartu. */
  varian?: 'daftar' | 'linimasa' | 'kartu';
  kosong?: React.ReactNode;
  aksi?: React.ReactNode;
  className?: string;
}

/**
 * Lacak pengajuan (surat keterangan, cuti, dispensasi, dana, legalisir, perubahan data, izin presensi): setiap
 * pengajuan menampilkan posisi tahapnya. Data dari endpoint modul mana pun, dipetakan ke `langkah`.
 */
export function WidgetPengajuan({ judul = 'Pengajuan saya', items, varian = 'daftar', kosong = 'Belum ada pengajuan.', aksi, className }: WidgetPengajuanProps) {
  return (
    <section className={cn('u-wp', className)} data-varian={varian}>
      <header className="u-wp-kepala">
        <Inbox aria-hidden />
        <b>{judul}</b>
        {aksi}
      </header>
      {!items.length && <p className="u-wp-kosong">{kosong}</p>}
      <div className="u-wp-isi">
        {items.map((it) => {
          const isi = (
            <>
              <div className="u-wp-baris">
                <span className="u-wp-judul">
                  <b>{it.judul}</b>
                  <small>
                    {[it.nomor, it.tanggal].filter(Boolean).map((x, i) => (
                      <React.Fragment key={i}>
                        {i ? ' · ' : ''}
                        {x}
                      </React.Fragment>
                    ))}
                  </small>
                </span>
                {it.status && <Badge variant={it.status.tone ?? 'neutral'}>{it.status.teks}</Badge>}
              </div>
              <ProgressLangkah langkah={it.langkah} varian={varian === 'linimasa' ? 'vertikal' : varian === 'kartu' ? 'ringkas' : 'segmen'} />
            </>
          );
          return it.href ? (
            <a key={it.id} className="u-wp-item" href={it.href}>
              {isi}
            </a>
          ) : it.onClick ? (
            <Tekan key={it.id} className="u-wp-item" onClick={it.onClick}>
              {isi}
            </Tekan>
          ) : (
            <div key={it.id} className="u-wp-item">
              {isi}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ================================================================ Kisi widget unit
export type JenisWidgetUnit = 'sdm' | 'dosen' | 'tendik' | 'baak' | 'mahasiswa' | 'spmi' | 'lppm' | 'keuangan' | 'pmb' | 'arsip' | 'surat' | 'presensi';

const PETA: Record<JenisWidgetUnit, React.ComponentType<{ varian?: VarianWidget; href?: string }>> = {
  sdm: WidgetSdm as never,
  dosen: WidgetDosen as never,
  tendik: WidgetTendik as never,
  baak: WidgetBaak,
  mahasiswa: WidgetMahasiswa as never,
  spmi: WidgetSpmi as never,
  lppm: WidgetLppm as never,
  keuangan: WidgetKeuangan as never,
  pmb: WidgetPmb as never,
  arsip: WidgetArsip as never,
  surat: WidgetSurat as never,
  presensi: WidgetPresensi,
};

/** Kisi widget siap pakai untuk beranda unit: `<KisiWidgetUnit widget={['sdm','dosen','tendik']} varian="kartu" />`. */
export function KisiWidgetUnit({
  widget,
  varian = 'kartu',
  href,
  min = 240,
  className,
}: {
  widget: JenisWidgetUnit[];
  varian?: VarianWidget;
  href?: Partial<Record<JenisWidgetUnit, string>>;
  min?: number;
  className?: string;
}) {
  return (
    <div className={cn('u-wu-kisi', className)} style={{ '--u-wu-min': `${min}px` } as React.CSSProperties} data-varian={varian}>
      {widget.map((w) => {
        const W = PETA[w];
        return <W key={w} varian={varian} href={href?.[w]} />;
      })}
    </div>
  );
}
