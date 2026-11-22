'use client';
import * as React from 'react';
import { Archive, Building2, ChevronRight, Clock, Eye, HardDrive, PencilLine, Pin, PinOff, Trash2, Users } from 'lucide-react';
import { nadaKuota } from '../components/alokasi';
import { cn } from '../lib/cn';
import { formatBytes } from '../lib/format';
import { useUnitBerkas } from './berkas-ruang';
import {
  AMBANG_BANYAK_UNIT,
  KUNCI_DRIVE,
  alihSematan,
  anakDrive,
  bacaIngat,
  catatTerakhir,
  daftarId,
  hakUmum,
  jumlahBisaDibuka,
  leluhurDrive,
  petaLipat,
  rapikanNamaUnit,
  saringDrive,
  simpanIngat,
  simpulTerbuka,
} from './drive-pohon';
import { useSiakadQuery } from './provider';
import { IsianCari } from '../components/isian-cari';
import { Tekan } from '../components/tekan';

// ================================================================ Tipe (GET /v1/berkas/drive, KONTRAK-RUANG)

/** Batas yang mengikat sebuah drive: kuota pribadi, ruang bersama unit, atau kolam unit (termasuk kolam induk yang diwariskan). */
export interface BatasDrive {
  byte: number;
  terpakai_byte: number;
  sisa_byte: number;
  persen: number;
  sumber: 'kuota' | 'bersama' | 'kolam' | string;
  /** Kode unit pemilik kolam/ruang bersama. */
  kode: string | null;
  label: string;
}

/** Satu drive di sidebar Kelola berkas. `hak` null = penanda jalur (unit induk yang tidak bisa dibuka). */
export interface DriveBerkasData {
  id: string;
  jenis: 'pribadi' | 'unit' | 'arsip';
  unit_id: string | null;
  unit_jenis?: string | null;
  /** id drive induk (mis. "unit:univ"); null = akar. */
  induk: string | null;
  tingkat: number;
  nama: string;
  singkatan?: string | null;
  hak: 'pemilik' | 'kelola' | 'anggota' | 'pembaca' | null;
  /** Ruang yang dibuka ManajerBerkas. */
  ruang: { unit?: string | null; modul?: string | null };
  pakai: { byte: number; jumlah: number } | null;
  /** null = tanpa batas (atau server belum memasang aturan penyimpanan). */
  batas: BatasDrive | null;
}

/**
 * Drive pemanggil: Berkas saya + pohon unit yang bisa dibuka (dengan penanda jalur), pemakaian, dan batas.
 * SIAKAD lama tanpa /v1/berkas/drive: dibentuk dari /v1/berkas/unit (daftar datar, tanpa bar).
 * Kunci cache di bawah "berkas-info" supaya ikut segar setiap unggah/hapus.
 */
export function useDriveBerkas(enabled = true) {
  const q = useSiakadQuery<{ drive: DriveBerkasData[]; penyimpanan?: boolean }>(
    ['berkas-info', 'drive'],
    (s, signal) => s.request({ method: 'GET', path: '/v1/berkas/drive' }, { signal }),
    { staleTime: 60_000, enabled },
  );
  const cadangan = Boolean(q.error);
  const unitQ = useUnitBerkas(false, enabled && cadangan);
  const drive = React.useMemo<DriveBerkasData[] | undefined>(() => {
    if (q.data) return q.data.drive;
    if (!cadangan || !unitQ.data) return undefined;
    return [{ id: 'pribadi', jenis: 'pribadi', unit_id: null, induk: null, tingkat: 0, nama: 'Berkas saya', hak: 'pemilik', ruang: {}, pakai: null, batas: null }, ...driveDariUnit(unitQ.data.unit)];
  }, [q.data, cadangan, unitQ.data]);
  return { drive, loading: (q.loading && !q.data) || (cadangan && unitQ.loading && !unitQ.data), error: cadangan ? unitQ.error : null };
}

const KELOMPOK_JENIS: Array<[string, string]> = [
  ['universitas', 'Universitas'],
  ['fakultas', 'Fakultas'],
  ['prodi', 'Program studi'],
  ['', 'Biro, lembaga, dan UPT'],
];

/**
 * SIAKAD lama tanpa /v1/berkas/drive hanya memberi daftar unit datar. Supaya tetap terbaca untuk banyak unit, unit
 * dikelompokkan menurut jenisnya (Fakultas, Program studi, Biro/lembaga/UPT) di bawah penanda kelompok yang tidak bisa
 * dibuka. Satu jenis saja (mis. pengguna dengan satu unit) = tanpa kelompok.
 */
export function driveDariUnit(unit: Array<{ kode: string; nama: string; singkatan?: string | null; jenis: string; akses: 'anggota' | 'kelola' | 'pembaca' }>): DriveBerkasData[] {
  const kel = (j: string) => (KELOMPOK_JENIS.some(([k]) => k && k === j) ? j : '');
  const jenisAda = new Set(unit.map((u) => kel(u.jenis)));
  const kelompok = unit.length > AMBANG_BANYAK_UNIT && jenisAda.size > 1;
  const out: DriveBerkasData[] = [];
  for (const [k, label] of KELOMPOK_JENIS) {
    const isi = unit.filter((u) => kel(u.jenis) === k);
    if (!isi.length) continue;
    const induk = kelompok && k !== 'universitas' ? `kelompok:${k || 'unit'}` : null;
    if (induk) out.push({ id: induk, jenis: 'unit', unit_id: null, unit_jenis: 'kelompok', induk: null, tingkat: 0, nama: label, hak: null, ruang: {}, pakai: null, batas: null });
    for (const u of isi) {
      out.push({
        id: `unit:${u.kode}`, jenis: 'unit', unit_id: u.kode, unit_jenis: u.jenis, induk, tingkat: induk ? 1 : 0, nama: u.nama, singkatan: u.singkatan,
        hak: u.akses, ruang: { unit: u.kode }, pakai: null, batas: null,
      });
    }
  }
  return out;
}

// ================================================================ Tampilan

export interface DaftarDriveProps {
  drive: DriveBerkasData[];
  /** id drive aktif. */
  aktif: string | null;
  onPilih: (d: DriveBerkasData) => void;
  /** Pohon subfolder drive aktif (tanpa simpul akar), ditaruh di bawah drive terpilih. */
  folder?: React.ReactNode;
  /** Drive aktif sedang menampilkan folder utamanya (bukan subfolder): barisnya disorot penuh. Bawaan true. */
  diAkar?: boolean;
  /** Jumlah berkas di drive aktif (dari pohon folder), dipakai bila drive tidak membawa `pakai`. */
  jumlahAktif?: number;
  /** Item "Dibagikan ke saya" di bagian Pintasan. */
  dibagikan?: { aktif: boolean; onPilih: () => void };
  /** Pintasan "Terbaru" untuk drive aktif. */
  terbaru?: { aktif: boolean; onPilih: () => void };
  /** Pintasan "Sampah": berkas yang dihapus dari Berkas saya dan ruang unit yang dikelola. */
  sampah?: { aktif: boolean; onPilih: () => void };
  /** Mode ikon saja (sidebar diringkas): tanpa label; bila unit banyak hanya unit tersemat/terakhir/aktif yang tampil. */
  ringkas?: boolean;
  /** Lebarkan sidebar (dipakai tombol "Semua unit" di mode ikon). */
  onLebarkan?: () => void;
  /** Lepas berkas/folder yang diseret ke sebuah drive (bukan drive aktif). */
  onLepas?: (d: DriveBerkasData, e: React.DragEvent) => void;
  bisaLepas?: (e: React.DragEvent) => boolean;
  /** Ingat keadaan lipat, unit tersemat, dan unit terakhir dibuka di peramban (bawaan true). */
  ingat?: boolean;
  memuat?: boolean;
  className?: string;
}

const LABEL_HAK: Record<string, string> = { kelola: 'Anda pengelola ruang ini', anggota: 'Anda anggota: bisa melihat dan mengunggah', pembaca: 'Hanya baca' };

function namaPendek(d: DriveBerkasData) {
  return d.jenis === 'pribadi' ? d.nama : d.singkatan || d.nama;
}

/** Nama yang tampil di sidebar: nama lengkap yang dirapikan ("Informatika", "Fakultas Hukum"). */
export function namaDrive(d: Pick<DriveBerkasData, 'jenis' | 'nama' | 'unit_jenis'>) {
  return d.jenis === 'pribadi' ? d.nama : rapikanNamaUnit(d.nama, d.unit_jenis);
}

/** Ikon drive menurut jenis: pribadi/unit = harddisk, arsip = arsip, penanda jalur = gedung. */
export function IkonDrive({ d }: { d: Pick<DriveBerkasData, 'jenis' | 'hak'> }) {
  if (d.hak === null) return <Building2 aria-hidden />;
  if (d.jenis === 'arsip') return <Archive aria-hidden />;
  return <HardDrive aria-hidden />;
}

/** Teks pemakaian satu drive untuk tooltip: "1,2 GB dari 5 GB" atau "424 KB dipakai · kuota belum diatur". */
export function teksPakaiDrive(d: DriveBerkasData) {
  if (d.batas) return `${formatBytes(d.batas.terpakai_byte)} dari ${formatBytes(d.batas.byte)}${d.batas.sumber === 'kolam' ? ` (${d.batas.label})` : ''}`;
  if (d.pakai) return `${formatBytes(d.pakai.byte)} dipakai · kuota belum diatur`;
  return '';
}

/** Bar pemakaian kecil satu drive: "x dari y" dengan warna 80/90/100%, atau "x dipakai · kuota belum diatur". */
export function MeterDrive({ d, namaKolam }: { d: DriveBerkasData; namaKolam?: (kode: string) => string | undefined }) {
  const b = d.batas;
  if (!b && !d.pakai) return null;
  if (!b) {
    return (
      <span className="u-dd-meter" data-nada="aman" data-tanpa="">
        <small title="Pustikom belum mengatur kuota untuk ruang ini">{formatBytes(d.pakai!.byte)} dipakai · kuota belum diatur</small>
      </span>
    );
  }
  const persen = b.byte > 0 ? (b.terpakai_byte / b.byte) * 100 : 100;
  const nada = nadaKuota(persen);
  const warisan = b.sumber === 'kolam' && b.kode && b.kode !== d.unit_id;
  const kolam = warisan ? (namaKolam?.(b.kode!) ?? b.label.replace(/^Kolam /, '')) : null;
  const teks = `${formatBytes(b.terpakai_byte)} dari ${formatBytes(b.byte)}`;
  return (
    <span className="u-dd-meter" data-nada={nada} title={`${b.label}: ${teks}${d.pakai && b.sumber === 'kolam' ? ` · isi ruang ini ${formatBytes(d.pakai.byte)}` : ''}`}>
      <span className="u-dd-trek" role="meter" aria-valuemin={0} aria-valuemax={b.byte} aria-valuenow={b.terpakai_byte} aria-valuetext={`${teks} (${b.label})`} aria-label={`Pemakaian ${namaPendek(d)}`}>
        <i style={{ width: `${Math.min(100, Math.max(persen, b.terpakai_byte > 0 ? 3 : 0))}%` }} />
      </span>
      <small>
        {nada === 'penuh' ? 'Penuh · ' : ''}
        {teks}
        {kolam ? ` · ${kolam}` : ''}
      </small>
    </span>
  );
}

/** Lencana hak halus: pensil = pengelola, mata = hanya baca (anggota tanpa lencana). */
function LencanaHak({ hak }: { hak: DriveBerkasData['hak'] }) {
  if (hak !== 'kelola' && hak !== 'pembaca') return null;
  return (
    <span className="u-dd-hak" data-hak={hak} title={LABEL_HAK[hak]}>
      {hak === 'kelola' ? <PencilLine aria-hidden /> : <Eye aria-hidden />}
      <span className="u-sr-only">{hak === 'kelola' ? 'pengelola' : 'hanya baca'}</span>
    </span>
  );
}

function hurufIkon(d: DriveBerkasData) {
  const s = (d.singkatan || d.nama).replace(/[^\p{L}\p{N}]/gu, '');
  return s.slice(0, 4).toUpperCase();
}

/**
 * Daftar drive ala Finder untuk sidebar Kelola berkas.
 *
 * - Pintasan: Berkas saya (satu item; subfolder tampil langsung di bawahnya), Terbaru, Dibagikan ke saya, Sampah.
 * - Tersemat dan Terakhir dibuka (unit yang sering dipakai), lalu Unit sebagai pohon berjenjang (universitas →
 *   fakultas → prodi, biro/lembaga/UPT) dengan nama lengkap, singkatan kecil, lencana hak, dan jumlah berkas.
 * - Unit banyak (> 8): kotak cari, tingkat kedua ke bawah terlipat bawaan; unit aktif dan leluhurnya selalu terbuka;
 *   keadaan lipat, sematan, dan riwayat diingat di peramban.
 * - Mode ikon: ikon pintasan + unit tersemat/terakhir/aktif (huruf singkatan); unit lain lewat tombol "Semua unit".
 */
export function DaftarDrive({
  drive,
  aktif,
  onPilih,
  folder,
  diAkar = true,
  jumlahAktif,
  dibagikan,
  terbaru,
  sampah,
  ringkas,
  onLebarkan,
  onLepas,
  bisaLepas,
  ingat = true,
  memuat,
  className,
}: DaftarDriveProps) {
  const [sasaran, setSasaran] = React.useState<string | null>(null);
  const [cari, setCari] = React.useState('');
  const [lipat, setLipat] = React.useState<Record<string, boolean>>(() => (ingat ? bacaIngat(KUNCI_DRIVE.lipat, {}, petaLipat) : {}));
  const [sematan, setSematan] = React.useState<string[]>(() => (ingat ? bacaIngat(KUNCI_DRIVE.sematan, [], daftarId) : []));
  const [terakhir, setTerakhir] = React.useState<string[]>(() => (ingat ? bacaIngat(KUNCI_DRIVE.terakhir, [], daftarId) : []));

  const peta = React.useMemo(() => new Map(drive.map((d) => [d.id, d])), [drive]);
  const anak = React.useMemo(() => anakDrive(drive), [drive]);
  const nBuka = React.useMemo(() => jumlahBisaDibuka(drive), [drive]);
  const banyak = nBuka > AMBANG_BANYAK_UNIT;
  const umum = React.useMemo(() => hakUmum(drive), [drive]);
  const leluhurAktif = React.useMemo(() => new Set(leluhurDrive(peta, aktif)), [peta, aktif]);
  const saring = React.useMemo(() => saringDrive(drive, cari), [drive, cari]);

  // Catat unit yang dibuka untuk "Terakhir dibuka" (Berkas saya tidak dicatat: selalu ada di Pintasan).
  React.useEffect(() => {
    const d = aktif ? peta.get(aktif) : null;
    if (!d || d.jenis === 'pribadi' || d.hak === null) return;
    setTerakhir((t) => {
      if (t[0] === d.id) return t;
      const n = catatTerakhir(t, d.id);
      if (ingat) simpanIngat(KUNCI_DRIVE.terakhir, n);
      return n;
    });
  }, [aktif, peta, ingat]);

  const alihLipat = (id: string, sekarang: boolean) =>
    setLipat((l) => {
      const n = { ...l, [id]: !sekarang };
      if (ingat) simpanIngat(KUNCI_DRIVE.lipat, n);
      return n;
    });
  const alihSemat = (id: string) =>
    setSematan((s) => {
      const n = alihSematan(s, id);
      if (ingat) simpanIngat(KUNCI_DRIVE.sematan, n);
      return n;
    });

  const lepas = (d: DriveBerkasData) =>
    onLepas && d.hak !== null && d.id !== aktif && d.hak !== 'pembaca'
      ? {
          onDragOver: (e: React.DragEvent) => {
            if (bisaLepas && !bisaLepas(e)) return;
            e.preventDefault();
            e.stopPropagation();
            setSasaran(d.id);
          },
          onDragLeave: () => setSasaran((s) => (s === d.id ? null : s)),
          onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setSasaran(null);
            onLepas(d, e);
          },
        }
      : {};

  const jumlahDrive = (d: DriveBerkasData) => (d.pakai ? d.pakai.jumlah : d.id === aktif ? jumlahAktif : undefined);

  /** Satu baris drive. `lipatan`: panah lipat (pohon); `denganFolder`: subfolder drive aktif di bawahnya. */
  const baris = (d: DriveBerkasData, o: { lipatan?: { terbuka: boolean } | 'kosong'; denganFolder?: boolean; bagian: string }) => {
    const ini = d.id === aktif;
    const nama = namaDrive(d);
    const jml = jumlahDrive(d);
    const pakai = teksPakaiDrive(d);
    const tersemat = sematan.includes(d.id);
    const judul = [d.nama, d.singkatan && d.jenis !== 'pribadi' ? `(${d.singkatan})` : null].filter(Boolean).join(' ');
    const tooltip = [judul, d.hak && d.jenis !== 'pribadi' ? LABEL_HAK[d.hak] : null, pakai].filter(Boolean).join('\n');
    return (
      <div
        className="u-dd-baris"
        data-aktif={ini && diAkar ? '' : undefined}
        data-dalam={ini && !diAkar ? '' : undefined}
        data-sasaran={sasaran === d.id ? '' : undefined}
        data-jenis={d.jenis}
        data-unit={d.unit_jenis ?? undefined}
        {...lepas(d)}
      >
        {o.lipatan === undefined ? null : o.lipatan === 'kosong' ? (
          <span className="u-dd-lipat" aria-hidden />
        ) : (
          <Tekan className="u-dd-lipat" tabIndex={-1} aria-label={`${o.lipatan.terbuka ? 'Lipat' : 'Buka'} ${nama}`} aria-expanded={o.lipatan.terbuka} onClick={() => alihLipat(d.id, (o.lipatan as { terbuka: boolean }).terbuka)}>
            <ChevronRight aria-hidden data-buka={o.lipatan.terbuka ? '' : undefined} />
          </Tekan>
        )}
        {d.hak === null ? (
          <span className="u-dd-jalur" title={d.unit_jenis === 'kelompok' ? d.nama : `${d.nama}: Anda tidak punya akses ke berkas unit ini`}>
            <span className="u-dd-ikon" data-ringkas-teks={ringkas ? hurufIkon(d) : undefined}>
              <IkonDrive d={d} />
            </span>
            <span className="u-dd-label">{nama}</span>
          </span>
        ) : (
          <Tekan className="u-dd-drive" aria-current={ini ? 'page' : undefined} title={tooltip} onClick={() => onPilih(d)}>
            <span className="u-dd-ikon">{ringkas && d.jenis !== 'pribadi' ? <b className="u-dd-huruf">{hurufIkon(d)}</b> : <IkonDrive d={d} />}</span>
            <span className="u-dd-label">{nama}</span>
            {d.singkatan && d.jenis !== 'pribadi' && d.singkatan.toLowerCase() !== nama.toLowerCase() && <small className="u-dd-singkat">{d.singkatan}</small>}
            {d.hak !== umum && <LencanaHak hak={d.hak} />}
            {jml ? <span className="u-dd-jumlah">{jml}</span> : null}
          </Tekan>
        )}
        {d.hak !== null && d.jenis !== 'pribadi' && !ringkas && (o.bagian === 'tersemat' || banyak) && (
          <Tekan className="u-dd-semat" data-tersemat={tersemat ? '' : undefined} aria-label={`${tersemat ? 'Lepas sematan' : 'Sematkan'} ${nama}`} title={tersemat ? 'Lepas dari Tersemat' : 'Sematkan ke atas'} onClick={() => alihSemat(d.id)}>
            {tersemat ? <PinOff aria-hidden /> : <Pin aria-hidden />}
          </Tekan>
        )}
      </div>
    );
  };

  const simpul = (d: DriveBerkasData, tingkat: number): React.ReactNode => {
    if (saring && !saring.has(d.id)) return null;
    const turunan = (anak.get(d.id) ?? []).filter((x) => !saring || saring.has(x.id));
    const terbuka = saring ? true : simpulTerbuka(d.id, { ingat: lipat, akar: tingkat === 0, banyak, leluhurAktif });
    const ini = d.id === aktif;
    return (
      <li key={d.id} role="treeitem" aria-expanded={turunan.length ? terbuka : undefined} aria-selected={ini} data-jalur={d.hak === null ? '' : undefined}>
        {baris(d, { lipatan: turunan.length ? { terbuka } : 'kosong', bagian: 'unit' })}
        {ini && folder && !ringkas && <div className="u-dd-folder">{folder}</div>}
        {turunan.length > 0 && terbuka && <ul role="group">{turunan.map((x) => simpul(x, tingkat + 1))}</ul>}
      </li>
    );
  };

  const pintas = (label: string, ikon: React.ReactNode, x: { aktif: boolean; onPilih: () => void }) => (
    <li role="treeitem" aria-selected={x.aktif}>
      <div className="u-dd-baris" data-aktif={x.aktif ? '' : undefined} data-pintas="">
        <Tekan className="u-dd-drive" aria-current={x.aktif ? 'page' : undefined} title={label} onClick={x.onPilih}>
          <span className="u-dd-ikon">{ikon}</span>
          <span className="u-dd-label">{label}</span>
        </Tekan>
      </div>
    </li>
  );

  const akar = anak.get(null) ?? [];
  const pribadi = akar.filter((d) => d.jenis === 'pribadi');
  const lain = akar.filter((d) => d.jenis !== 'pribadi');
  const bisaDibuka = (id: string) => {
    const d = peta.get(id);
    return d && d.hak !== null && d.jenis !== 'pribadi' ? d : null;
  };
  const daftarSemat = sematan.map(bisaDibuka).filter((d): d is DriveBerkasData => !!d);
  const daftarTerakhir = banyak ? terakhir.filter((id) => !sematan.includes(id) && id !== aktif).map(bisaDibuka).filter((d): d is DriveBerkasData => !!d).slice(0, 3) : [];
  // Mode ikon dengan unit banyak: hanya unit tersemat, terakhir, dan aktif (pohon lengkap lewat "Semua unit").
  const ringkasBanyak = ringkas && banyak;
  const ikonUnit = ringkasBanyak
    ? [...daftarSemat, ...daftarTerakhir, ...(aktif && bisaDibuka(aktif) ? [bisaDibuka(aktif)!] : [])].filter((d, i, a) => a.findIndex((x) => x.id === d.id) === i)
    : [];

  return (
    <nav className={cn('u-dd', className)} aria-label="Drive berkas" data-ringkas={ringkas ? '' : undefined}>
      {memuat && !drive.length ? (
        <div className="u-dd-muat" role="status" aria-label="Memuat drive">
          {[0.7, 0.55, 0.8, 0.6].map((w, i) => (
            <span key={i}>
              <i className="u-skeleton" />
              <i className="u-skeleton" style={{ width: `${w * 100}%` }} />
            </span>
          ))}
        </div>
      ) : null}
      {(pribadi.length > 0 || terbaru || dibagikan || sampah) && (
        <div className="u-dd-bagian">
          <h4 className="u-dd-bagian-judul">Pintasan</h4>
          <ul role="tree" aria-label="Pintasan">
            {pribadi.map((d) => (
              <li key={d.id} role="treeitem" aria-selected={d.id === aktif}>
                {baris(d, { bagian: 'pintasan' })}
                {d.id === aktif && folder && !ringkas && <div className="u-dd-folder">{folder}</div>}
              </li>
            ))}
            {terbaru && pintas('Terbaru', <Clock aria-hidden />, terbaru)}
            {dibagikan && pintas('Dibagikan ke saya', <Users aria-hidden />, dibagikan)}
            {sampah && pintas('Sampah', <Trash2 aria-hidden />, sampah)}
          </ul>
        </div>
      )}
      {ringkasBanyak ? (
        <div className="u-dd-bagian">
          <ul role="tree" aria-label="Unit">
            {ikonUnit.map((d) => (
              <li key={d.id} role="treeitem" aria-selected={d.id === aktif}>
                {baris(d, { bagian: 'ikon' })}
              </li>
            ))}
            {onLebarkan && (
              <li role="treeitem" aria-selected={false}>
                <div className="u-dd-baris" data-pintas="">
                  <Tekan className="u-dd-drive" title={`Semua unit (${nBuka})`} onClick={onLebarkan}>
                    <span className="u-dd-ikon">
                      <Building2 aria-hidden />
                    </span>
                    <span className="u-dd-label">Semua unit</span>
                  </Tekan>
                </div>
              </li>
            )}
          </ul>
        </div>
      ) : (
        <>
          {daftarSemat.length > 0 && !cari && (
            <div className="u-dd-bagian">
              <h4 className="u-dd-bagian-judul">Tersemat</h4>
              <ul role="tree" aria-label="Unit tersemat">
                {daftarSemat.map((d) => (
                  <li key={d.id} role="treeitem" aria-selected={d.id === aktif}>
                    {baris(d, { bagian: 'tersemat' })}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {daftarTerakhir.length > 0 && !cari && (
            <div className="u-dd-bagian">
              <h4 className="u-dd-bagian-judul">Terakhir dibuka</h4>
              <ul role="tree" aria-label="Unit terakhir dibuka">
                {daftarTerakhir.map((d) => (
                  <li key={d.id} role="treeitem" aria-selected={d.id === aktif}>
                    {baris(d, { bagian: 'terakhir' })}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {lain.length > 0 && (
            <div className="u-dd-bagian">
              <h4 className="u-dd-bagian-judul">
                <span>Unit</span>
                {(umum === 'kelola' || umum === 'pembaca') && !ringkas && (
                  <span className="u-dd-bagian-ket" title={umum === 'kelola' ? 'Anda pengelola unit-unit ini; unit dengan hak lain diberi tanda mata (hanya baca) atau tanpa tanda (anggota)' : 'Unit-unit ini hanya bisa Anda baca; unit yang bisa Anda kelola bertanda pensil'}>
                    {umum === 'kelola' ? <PencilLine aria-hidden /> : <Eye aria-hidden />}
                    {umum === 'kelola' ? 'Dapat dikelola' : 'Hanya baca'}
                  </span>
                )}
              </h4>
              {banyak && !ringkas && (
                <IsianCari className="u-dd-cari" size="sm" value={cari} onValueChange={setCari} placeholder={`Cari di ${nBuka} unit`} aria-label="Cari unit" />
              )}
              <ul role="tree" aria-label="Drive unit">
                {lain.map((d) => simpul(d, 0))}
              </ul>
              {saring && saring.size === 0 && <p className="u-dd-kosong">Tidak ada unit yang cocok dengan “{cari}”.</p>}
            </div>
          )}
        </>
      )}
    </nav>
  );
}
