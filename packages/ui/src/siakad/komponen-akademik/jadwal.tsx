'use client';
import * as React from 'react';
import { CalendarClock, Clock, MapPin, User } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Badge } from '../../components/actions';
import { Empty } from '../../components/display';
import { SegmentedControl } from '../../components/forms';
import { Tekan } from '../../components/tekan';
import { KepalaAkademik, keadaanData, type KeadaanDataProps } from './bersama';
import { MENIT_PER_SKS_BAWAAN, useBebanSks } from './hooks';
import { angka, hariDari, jamPendek, menitDari, namaDosenSesi, namaHari, nomorHari, type SesiKuliah } from './tipe';

/** Warna tetap per mata kuliah (1–6, token --u-chart-*), supaya MK yang sama berwarna sama di semua tampilan. */
export function warnaMk(kunci: string | null | undefined): number {
  let h = 0;
  for (const c of String(kunci ?? '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 6) + 1;
}

export interface TataSesi {
  sesi: SesiKuliah;
  hari: number;
  mulai: number;
  selesai: number;
  /** Lajur (0..) bila ada sesi bertumpuk di hari yang sama, dan jumlah lajur kelompoknya. */
  lajur: number;
  lajurTotal: number;
}

/**
 * Susun sesi berjam ke hari dan lajur (sesi yang waktunya bertumpuk diletakkan berdampingan). Sesi tanpa jam mulai
 * dikembalikan di `tanpaJam`. Sesi tanpa jam selesai diperkirakan SKS × `menitPerSks` (hanya untuk tinggi kotak; jam
 * resmi tetap dari jadwal server).
 */
export function tataJadwal(jadwal: ReadonlyArray<SesiKuliah>, menitPerSks = MENIT_PER_SKS_BAWAAN): { sesi: TataSesi[]; tanpaJam: SesiKuliah[]; awal: number; akhir: number } {
  const tanpaJam: SesiKuliah[] = [];
  const perHari = new Map<number, TataSesi[]>();
  for (const s of jadwal) {
    const hari = nomorHari(s.hari);
    const mulai = menitDari(s.jam_mulai);
    if (!hari || mulai == null) {
      tanpaJam.push(s);
      continue;
    }
    const sel = menitDari(s.jam_selesai);
    const selesai = sel != null && sel > mulai ? sel : mulai + Math.max(1, angka(s.sks)) * menitPerSks;
    perHari.set(hari, [...(perHari.get(hari) ?? []), { sesi: s, hari, mulai, selesai, lajur: 0, lajurTotal: 1 }]);
  }
  const semua: TataSesi[] = [];
  for (const daftar of perHari.values()) {
    daftar.sort((a, b) => a.mulai - b.mulai || a.selesai - b.selesai);
    let kelompok: TataSesi[] = [];
    let ujung = -1;
    const tutup = () => {
      const n = Math.max(1, ...kelompok.map((x) => x.lajur + 1));
      kelompok.forEach((x) => (x.lajurTotal = n));
      kelompok = [];
    };
    for (const t of daftar) {
      if (t.mulai >= ujung && kelompok.length) tutup();
      const dipakai = new Set(kelompok.filter((x) => x.selesai > t.mulai).map((x) => x.lajur));
      let l = 0;
      while (dipakai.has(l)) l++;
      t.lajur = l;
      kelompok.push(t);
      ujung = Math.max(ujung, t.selesai);
      semua.push(t);
    }
    tutup();
  }
  const awal = semua.length ? Math.floor(Math.min(...semua.map((x) => x.mulai)) / 60) * 60 : 7 * 60;
  const akhir = semua.length ? Math.ceil(Math.max(...semua.map((x) => x.selesai)) / 60) * 60 : 16 * 60;
  return { sesi: semua, tanpaJam, awal, akhir: Math.max(akhir, awal + 60) };
}

const teksJam = (s: SesiKuliah) => (s.jam_mulai ? `${jamPendek(s.jam_mulai)}${s.jam_selesai ? `–${jamPendek(s.jam_selesai)}` : ''}` : s.jam_ke ? `Jam ke-${s.jam_ke}` : '');

export interface JadwalMingguanProps extends KeadaanDataProps {
  /** Sesi kuliah dari GET /v1/mahasiswa/{nim}/jadwal (`jadwal`), /v1/dosen/{nidn}/jadwal, atau /v1/jadwal. */
  jadwal?: ReadonlyArray<SesiKuliah> | null;
  /** Hari yang ditampilkan (1 Senin … 7 Minggu). Bawaan Senin–Jumat ditambah hari lain yang berisi jadwal. */
  hari?: number[];
  /** Tampilan: `otomatis` (kisi mingguan, berubah jadi daftar per hari di wadah sempit), `minggu`, atau `daftar`. */
  tampilan?: 'otomatis' | 'minggu' | 'daftar';
  /** Tampilkan pilihan Mingguan | Per hari di kepala (bawaan true). */
  pilihTampilan?: boolean;
  /** Waktu acuan untuk penanda hari ini dan garis jam sekarang (bawaan sekarang). */
  kini?: Date;
  /** Sembunyikan nama dosen (mis. jadwal mengajar dosen sendiri). */
  tanpaDosen?: boolean;
  /**
   * Durasi satu SKS (menit) untuk tinggi sesi yang tidak punya jam selesai. Tanpa nilai ini diambil dari aturan
   * kurikulum ber-SK lewat GET /v1/referensi/beban-sks (prodi & periode jadwal); bawaan 50 menit bila aturan belum
   * mengatur atau tidak ada SDK. Jam resmi tetap dari jadwal server.
   */
  menitPerSks?: number;
  /** Kode prodi untuk membaca aturan beban SKS (bawaan: kode_prodi sesi pertama). */
  kodeProdi?: string | null;
  onPilih?: (s: SesiKuliah) => void;
  judul?: React.ReactNode | false;
  aksi?: React.ReactNode;
  kosong?: { title: React.ReactNode; description?: React.ReactNode };
  className?: string;
}

/** Jadwal kuliah mingguan: kisi hari × jam dengan sesi bertumpuk berdampingan, atau daftar kartu per hari di ponsel. */
export function JadwalMingguan({ jadwal, hari, tampilan = 'otomatis', pilihTampilan = true, kini, tanpaDosen, menitPerSks: menitProp, kodeProdi, onPilih, judul, aksi, kosong, className, ...k }: JadwalMingguanProps) {
  const [mode, setMode] = React.useState(tampilan);
  React.useEffect(() => setMode(tampilan), [tampilan]);
  const data = React.useMemo(() => jadwal ?? [], [jadwal]);
  const beban = useBebanSks({ prodi: kodeProdi ?? data[0]?.kode_prodi ?? null, tahunId: data[0]?.tahun_id ?? null, enabled: menitProp == null && data.length > 0 });
  const menitPerSks = menitProp ?? beban.menitPerSks;
  const tata = React.useMemo(() => tataJadwal(data, menitPerSks), [data, menitPerSks]);
  const sekarang = kini ?? new Date();
  const hariIni = hariDari(sekarang);
  const keadaan = keadaanData(k, !!jadwal, 320, className);
  if (keadaan) return keadaan;
  if (!data.length) return <Empty icon={<CalendarClock />} title={kosong?.title ?? 'Belum ada jadwal'} description={kosong?.description ?? 'Jadwal muncul setelah KRS disetujui dan kelas dijadwalkan.'} className={className} />;
  const terpakai = new Set([...tata.sesi.map((s) => s.hari), ...tata.tanpaJam.map((s) => nomorHari(s.hari)).filter(Boolean)]);
  const daftarHari = hari ?? [1, 2, 3, 4, 5, 6, 7].filter((h) => h <= 5 || terpakai.has(h));
  const sks = data.reduce((a, s) => a + angka(s.sks), 0);
  const rentang = tata.akhir - tata.awal;
  const jam = Array.from({ length: rentang / 60 + 1 }, (_, i) => tata.awal + i * 60);
  const menitKini = sekarang.getHours() * 60 + sekarang.getMinutes();
  const perHari = (h: number) => data.filter((s) => nomorHari(s.hari) === h).sort((a, b) => (menitDari(a.jam_mulai) ?? 9999) - (menitDari(b.jam_mulai) ?? 9999));

  // ringkas: 'kisi' (kotak di kisi: nama, jam, ruang), 'sempit' (sesi bertumpuk: nama + jam), atau false (kartu penuh).
  const kartu = (s: SesiKuliah, i: number, ringkas: false | 'kisi' | 'sempit' = false) => {
    const isi = (
      <>
        <b className="u-ak-sesi-mk">{s.nama_mk ?? s.kode_mk ?? 'Mata kuliah'}</b>
        <span className="u-ak-sesi-meta">
          {(s.jam_mulai || s.jam_ke) && (
            <span>
              <Clock aria-hidden />
              {s.jam_mulai ? `${jamPendek(s.jam_mulai)}${s.jam_selesai ? `–${jamPendek(s.jam_selesai)}` : ''}` : `Jam ke-${s.jam_ke}`}
            </span>
          )}
          {ringkas !== 'sempit' && (s.nama_ruang || s.ruang) && (
            <span>
              <MapPin aria-hidden />
              {s.nama_ruang || s.ruang}
            </span>
          )}
          {!ringkas && s.kelas && <span>Kelas {s.kelas}</span>}
          {!ringkas && s.sks != null && <span>{angka(s.sks)} SKS</span>}
        </span>
        {!tanpaDosen && !ringkas && namaDosenSesi(s) && (
          <span className="u-ak-sesi-dosen">
            <User aria-hidden />
            {namaDosenSesi(s)}
          </span>
        )}
      </>
    );
    const judulPenuh = [s.nama_mk ?? s.kode_mk, teksJam(s), s.nama_ruang || s.ruang, s.kelas ? `Kelas ${s.kelas}` : '', !tanpaDosen ? namaDosenSesi(s) : ''].filter(Boolean).join(' · ');
    const props = { className: 'u-ak-sesi', 'data-warna': warnaMk(s.kode_mk ?? s.nama_mk), 'data-ringkas': ringkas || undefined, title: ringkas ? judulPenuh : undefined } as const;
    return onPilih ? (
      // Seluruh kartu dapat diklik (area sentuh besar di ponsel); Tekan menambah Enter/Spasi dan cincin fokus token.
      <Tekan key={`${s.idj ?? i}`} elemen="div" {...props} onClick={() => onPilih(s)}>
        {isi}
      </Tekan>
    ) : (
      <div key={`${s.idj ?? i}`} {...props}>
        {isi}
      </div>
    );
  };

  return (
    <section className={cn('u-ak-blok u-ak-jadwal', className)} data-tampilan={mode}>
      {judul !== false && (
        <KepalaAkademik
          judul={judul ?? 'Jadwal mingguan'}
          meta={`${data.length} sesi · ${sks} SKS`}
          aksi={
            pilihTampilan || aksi ? (
              <>
                {pilihTampilan && (
                  <SegmentedControl<'otomatis' | 'daftar'>
                    aria-label="Tampilan jadwal"
                    value={mode === 'daftar' ? 'daftar' : 'otomatis'}
                    onValueChange={setMode}
                    options={[
                      { value: 'otomatis', label: 'Mingguan' },
                      { value: 'daftar', label: 'Per hari' },
                    ]}
                  />
                )}
                {aksi}
              </>
            ) : undefined
          }
        />
      )}
      {mode !== 'daftar' && (
        <div className="u-ak-kisi-gulir">
          <div className="u-ak-kisi" style={{ '--ak-hari': daftarHari.length, '--ak-jam': rentang / 60 } as React.CSSProperties}>
            <div className="u-ak-kisi-pojok" aria-hidden />
            {daftarHari.map((h) => (
              <div key={h} className="u-ak-kisi-hari" data-hari-ini={h === hariIni ? '' : undefined}>
                {namaHari(h)}
              </div>
            ))}
            <div className="u-ak-kisi-jam" aria-hidden>
              {jam.map((m) => (
                <span key={m} style={{ top: `${((m - tata.awal) / rentang) * 100}%` }}>
                  {jamPendek(`${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`)}
                </span>
              ))}
            </div>
            {daftarHari.map((h) => (
              <div key={h} className="u-ak-kisi-kolom" data-hari-ini={h === hariIni ? '' : undefined} aria-label={`Jadwal ${namaHari(h)}`}>
                {tata.sesi
                  .filter((t) => t.hari === h)
                  .map((t, i) => (
                    <div
                      key={`${t.sesi.idj ?? i}`}
                      className="u-ak-kisi-sesi"
                      style={{
                        top: `${((t.mulai - tata.awal) / rentang) * 100}%`,
                        height: `${((t.selesai - t.mulai) / rentang) * 100}%`,
                        left: `${(t.lajur / t.lajurTotal) * 100}%`,
                        width: `${100 / t.lajurTotal}%`,
                      }}
                    >
                      {kartu(t.sesi, i, t.lajurTotal > 1 ? 'sempit' : 'kisi')}
                    </div>
                  ))}
                {h === hariIni && menitKini >= tata.awal && menitKini <= tata.akhir && <span className="u-ak-kisi-kini" style={{ top: `${((menitKini - tata.awal) / rentang) * 100}%` }} title="Sekarang" />}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="u-ak-perhari" data-paksa={mode === 'daftar' ? '' : undefined}>
        {daftarHari
          .filter((h) => perHari(h).length)
          .map((h) => (
            <section key={h} className="u-ak-perhari-hari">
              <h4>
                {namaHari(h)}
                {h === hariIni && <Badge variant="primary">Hari ini</Badge>}
              </h4>
              <div className="u-ak-perhari-daftar">{perHari(h).map((s, i) => kartu(s, i))}</div>
            </section>
          ))}
      </div>
      {mode !== 'daftar' && tata.tanpaJam.length > 0 && (
        <div className="u-ak-tanpa-jam">
          <h4>Belum berjam pasti</h4>
          <div className="u-ak-perhari-daftar">{tata.tanpaJam.map((s, i) => kartu(s, i))}</div>
        </div>
      )}
    </section>
  );
}

export interface KuliahHariIniProps extends KeadaanDataProps {
  jadwal?: ReadonlyArray<SesiKuliah> | null;
  kini?: Date;
  tanpaDosen?: boolean;
  /** Maksimal sesi yang ditampilkan. */
  batas?: number;
  /** Durasi satu SKS (menit) bila jam selesai kosong; tanpa nilai ini dari aturan beban SKS (bawaan 50 menit). */
  menitPerSks?: number;
  kodeProdi?: string | null;
  className?: string;
}

/** Sesi kuliah hari ini (yang sedang berlangsung ditandai), untuk kartu portal/beranda. */
export function KuliahHariIni({ jadwal, kini, tanpaDosen, batas = 4, menitPerSks: menitProp, kodeProdi, className, ...k }: KuliahHariIniProps) {
  const pertama = jadwal?.[0];
  const beban = useBebanSks({ prodi: kodeProdi ?? pertama?.kode_prodi ?? null, tahunId: pertama?.tahun_id ?? null, enabled: menitProp == null && !!pertama });
  const menitPerSks = menitProp ?? beban.menitPerSks;
  const sekarang = kini ?? new Date();
  const keadaan = keadaanData(k, !!jadwal, 140, className);
  if (keadaan) return keadaan;
  const h = hariDari(sekarang);
  const m = sekarang.getHours() * 60 + sekarang.getMinutes();
  const hari = (jadwal ?? []).filter((s) => nomorHari(s.hari) === h).sort((a, b) => (menitDari(a.jam_mulai) ?? 9999) - (menitDari(b.jam_mulai) ?? 9999));
  if (!hari.length) return <Empty icon={<CalendarClock />} title={`Tidak ada kuliah hari ${namaHari(h)}`} className={className} />;
  return (
    <ul className={cn('u-ak-hariini', className)}>
      {hari.slice(0, batas).map((s, i) => {
        const a = menitDari(s.jam_mulai);
        const b = menitDari(s.jam_selesai) ?? (a != null ? a + Math.max(1, angka(s.sks)) * menitPerSks : null);
        const keadaanSesi = a == null ? 'tanpa-jam' : m >= a && b != null && m < b ? 'berlangsung' : b != null && m >= b ? 'selesai' : 'nanti';
        return (
          <li key={`${s.idj ?? i}`} data-keadaan={keadaanSesi} data-warna={warnaMk(s.kode_mk ?? s.nama_mk)}>
            <span className="u-ak-hariini-jam">
              {s.jam_mulai ? jamPendek(s.jam_mulai) : s.jam_ke ? `Jam ${s.jam_ke}` : '–'}
              {s.jam_selesai && <small>{jamPendek(s.jam_selesai)}</small>}
            </span>
            <span className="u-ak-hariini-isi">
              <b>{s.nama_mk ?? s.kode_mk}</b>
              <small>{[s.nama_ruang || s.ruang, !tanpaDosen ? namaDosenSesi(s) : '', s.kelas ? `Kelas ${s.kelas}` : ''].filter(Boolean).join(' · ')}</small>
            </span>
            {keadaanSesi === 'berlangsung' && <Badge variant="success" dot>Berlangsung</Badge>}
            {keadaanSesi === 'selesai' && <Badge variant="neutral">Selesai</Badge>}
          </li>
        );
      })}
      {hari.length > batas && <li className="u-ak-hariini-lagi">+{hari.length - batas} sesi lagi</li>}
    </ul>
  );
}
