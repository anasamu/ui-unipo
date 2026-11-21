'use client';
import * as React from 'react';
import { Archive, Building2, ChevronRight, HardDrive, Users } from 'lucide-react';
import { nadaKuota } from '../components/alokasi';
import { cn } from '../lib/cn';
import { formatBytes } from '../lib/format';
import { useUnitBerkas } from './berkas-ruang';
import { useSiakadQuery } from './provider';

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
    return [
      { id: 'pribadi', jenis: 'pribadi', unit_id: null, induk: null, tingkat: 0, nama: 'Berkas saya', hak: 'pemilik', ruang: {}, pakai: null, batas: null },
      ...unitQ.data.unit.map(
        (u): DriveBerkasData => ({
          id: `unit:${u.kode}`, jenis: 'unit', unit_id: u.kode, unit_jenis: u.jenis, induk: null, tingkat: 0, nama: u.nama, singkatan: u.singkatan,
          hak: u.akses, ruang: { unit: u.kode }, pakai: null, batas: null,
        }),
      ),
    ];
  }, [q.data, cadangan, unitQ.data]);
  return { drive, loading: (q.loading && !q.data) || (cadangan && unitQ.loading && !unitQ.data), error: cadangan ? unitQ.error : null };
}

// ================================================================ Tampilan

export interface DaftarDriveProps {
  drive: DriveBerkasData[];
  /** id drive aktif. */
  aktif: string | null;
  onPilih: (d: DriveBerkasData) => void;
  /** Pohon folder drive aktif, ditaruh di bawah drive terpilih. */
  folder?: React.ReactNode;
  /** Item "Dibagikan" di bawah daftar. */
  dibagikan?: { aktif: boolean; onPilih: () => void };
  memuat?: boolean;
  className?: string;
}

const LABEL_HAK: Record<string, string> = { kelola: 'pengelola', pembaca: 'baca' };

function namaPendek(d: DriveBerkasData) {
  return d.jenis === 'pribadi' ? d.nama : d.singkatan || d.nama;
}

/** Ikon drive menurut jenis: pribadi/unit = harddisk, arsip = arsip, penanda jalur = gedung. */
export function IkonDrive({ d }: { d: Pick<DriveBerkasData, 'jenis' | 'hak'> }) {
  if (d.hak === null) return <Building2 aria-hidden />;
  if (d.jenis === 'arsip') return <Archive aria-hidden />;
  return <HardDrive aria-hidden />;
}

/** Bar pemakaian kecil satu drive: "x dari y" dengan warna 80/90/100%, atau "x · tanpa batas". */
export function MeterDrive({ d, namaKolam }: { d: DriveBerkasData; namaKolam?: (kode: string) => string | undefined }) {
  const b = d.batas;
  if (!b && !d.pakai) return null;
  if (!b) {
    return (
      <span className="u-dd-meter" data-nada="aman" data-tanpa="">
        <small>{formatBytes(d.pakai!.byte)} · tanpa batas</small>
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

/**
 * Daftar drive ala harddisk untuk sidebar Kelola berkas: Berkas saya di atas, lalu pohon unit (universitas → fakultas →
 * prodi/unit bagian) yang terindentasi dan bisa dilipat. Unit induk yang tidak bisa dibuka tampil sebagai penanda jalur
 * nonaktif. Pohon folder drive aktif tampil tepat di bawahnya.
 */
export function DaftarDrive({ drive, aktif, onPilih, folder, dibagikan, memuat, className }: DaftarDriveProps) {
  const anak = React.useMemo(() => {
    const m = new Map<string | null, DriveBerkasData[]>();
    const ada = new Set(drive.map((d) => d.id));
    for (const d of drive) {
      const i = d.induk && ada.has(d.induk) ? d.induk : null;
      m.set(i, [...(m.get(i) ?? []), d]);
    }
    return m;
  }, [drive]);
  const peta = React.useMemo(() => new Map(drive.map((d) => [d.id, d])), [drive]);
  const namaKolam = React.useCallback((kode: string) => {
    const d = peta.get(`unit:${kode}`);
    return d ? (d.singkatan || d.nama) : undefined;
  }, [peta]);

  // Terlipat: simpan yang DITUTUP pengguna; leluhur drive aktif selalu terbuka.
  const [tutup, setTutup] = React.useState<Set<string>>(() => new Set());
  React.useEffect(() => {
    if (!aktif) return;
    setTutup((t) => {
      let n = t;
      for (let x = peta.get(aktif)?.induk; x; x = peta.get(x)?.induk) {
        if (n.has(x)) {
          if (n === t) n = new Set(t);
          n.delete(x);
        }
      }
      return n;
    });
  }, [aktif, peta]);
  const alih = (id: string) =>
    setTutup((t) => {
      const n = new Set(t);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const simpul = (d: DriveBerkasData): React.ReactNode => {
    const turunan = anak.get(d.id) ?? [];
    const terbuka = !tutup.has(d.id);
    const jalur = d.hak === null;
    const ini = d.id === aktif;
    return (
      <li key={d.id} role="treeitem" aria-expanded={turunan.length ? terbuka : undefined} aria-selected={ini} data-jalur={jalur ? '' : undefined}>
        <div className="u-dd-baris" data-aktif={ini ? '' : undefined} data-jenis={d.jenis} data-unit={d.unit_jenis ?? undefined}>
          {turunan.length ? (
            <button type="button" className="u-dd-lipat" aria-label={`${terbuka ? 'Lipat' : 'Buka'} ${namaPendek(d)}`} aria-expanded={terbuka} onClick={() => alih(d.id)}>
              <ChevronRight aria-hidden data-buka={terbuka ? '' : undefined} />
            </button>
          ) : (
            <span className="u-dd-lipat" aria-hidden />
          )}
          {jalur ? (
            <span className="u-dd-jalur" title={`${d.nama}: Anda tidak punya akses ke berkas unit ini`}>
              <IkonDrive d={d} />
              <span>{namaPendek(d)}</span>
            </span>
          ) : (
            <button type="button" className="u-dd-drive" aria-current={ini ? 'page' : undefined} title={d.nama} onClick={() => onPilih(d)}>
              <span className="u-dd-ikon">
                <IkonDrive d={d} />
              </span>
              <span className="u-dd-teks">
                <span className="u-dd-nama">
                  <b>{namaPendek(d)}</b>
                  {d.hak && LABEL_HAK[d.hak] && <small>{LABEL_HAK[d.hak]}</small>}
                </span>
                <MeterDrive d={d} namaKolam={namaKolam} />
              </span>
            </button>
          )}
        </div>
        {ini && folder && <div className="u-dd-folder">{folder}</div>}
        {turunan.length > 0 && terbuka && <ul role="group">{turunan.map(simpul)}</ul>}
      </li>
    );
  };

  return (
    <nav className={cn('u-dd', className)} aria-label="Drive berkas">
      {memuat && !drive.length ? (
        <div className="u-dd-muat" role="status" aria-label="Memuat drive">
          {[0.7, 0.55, 0.8, 0.6].map((w, i) => (
            <span key={i}>
              <i className="u-skeleton" />
              <i className="u-skeleton" style={{ width: `${w * 100}%` }} />
            </span>
          ))}
        </div>
      ) : (
        <ul role="tree" aria-label="Drive">
          {(anak.get(null) ?? []).map(simpul)}
        </ul>
      )}
      {dibagikan && (
        <ul role="tree" aria-label="Dibagikan" className="u-dd-lain">
          <li role="treeitem" aria-selected={dibagikan.aktif}>
            <div className="u-dd-baris" data-aktif={dibagikan.aktif ? '' : undefined}>
              <span className="u-dd-lipat" aria-hidden />
              <button type="button" className="u-dd-drive" aria-current={dibagikan.aktif ? 'page' : undefined} onClick={dibagikan.onPilih}>
                <span className="u-dd-ikon">
                  <Users aria-hidden />
                </span>
                <span className="u-dd-teks">
                  <span className="u-dd-nama">
                    <b>Dibagikan</b>
                  </span>
                </span>
              </button>
            </div>
          </li>
        </ul>
      )}
    </nav>
  );
}
