'use client';
import * as React from 'react';
import { Building2, Check, Copy, Globe, Link2, Lock, LockOpen, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { Badge, Button } from '../components/actions';
import { Input, SegmentedControl, Textarea } from '../components/forms';
import { Select } from '../components/select';
import { Dialog } from '../components/overlays';
import { formatDate } from '../lib/format';
import type { BerkasManajer, FolderBerkas } from './manajer-berkas';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { PilihUnit, useUnitArsip } from './pilih-unit';

// ================================================================ Tipe (sama dengan /v1/berkas)

/** Mode enkripsi isi berkas: mati (Pustikom mematikan), opsional (diminta saat unggah), wajib (semua berkas baru). */
export type ModeEnkripsiBerkas = 'mati' | 'opsional' | 'wajib';

/** Ruang berkas bersama unit dari GET /v1/berkas/unit. */
export interface UnitBerkas {
  kode: string;
  nama: string;
  singkatan?: string | null;
  jenis: string;
  aplikasi?: string | null;
  /** anggota: lihat, unggah, ubah berkas; kelola: juga hapus folder, bagikan folder, atur enkripsi unit. */
  akses: 'anggota' | 'kelola';
  enkripsi?: ModeEnkripsiBerkas | null;
}

/** Periode akademik dari GET /v1/berkas/periode. */
export interface PeriodeBerkas {
  /** Kode m_tahun (mis. 20251) atau "tanpa". */
  periode: string;
  nama: string;
  tahun: string | null;
  semester: string | null;
  aktif: boolean;
  jumlah_berkas: number;
  ukuran: number;
}

/** Kebijakan enkripsi yang berlaku untuk satu ruang (GET /v1/berkas/kebijakan). */
export interface KebijakanBerkas {
  global: ModeEnkripsiBerkas;
  unit: ModeEnkripsiBerkas | null;
  pengguna: ModeEnkripsiBerkas | null;
  efektif: ModeEnkripsiBerkas;
  boleh_ubah: { global: boolean; unit: boolean; pengguna: boolean };
  /** Hanya admin (Pustikom): semua kebijakan tersimpan. */
  semua?: Array<{ lingkup: 'global' | 'unit' | 'pengguna'; kunci: string; enkripsi: ModeEnkripsiBerkas; catatan?: string | null; diubah_oleh?: string | null; updated_at?: string | null }>;
}

/** Satu berbagi berkas atau folder (berkas_bagi). */
export interface BagiBerkas {
  id: string;
  jenis: 'berkas' | 'folder';
  folder?: { path: string; nama: string; unit?: string | null };
  ke_jenis: 'pengguna' | 'unit' | 'tautan';
  ke?: string | null;
  ke_nama?: string | null;
  izin: 'lihat' | 'ubah';
  /** Alamat lengkap tautan publik; dibuka di browser tampil sebagai halaman unduh. */
  tautan?: string;
  bersandi?: boolean;
  kedaluwarsa_at?: string | null;
  pesan?: string | null;
  jumlah_akses?: number;
  dibuat_oleh?: string | null;
  dibuat_at?: string | null;
  berkas?: BerkasManajer;
}

/** Ruang yang dibuka manajer berkas: pribadi per modul, unit, atau folder yang dibagikan ke saya. */
export interface RuangBerkasOpsi {
  modul?: string;
  unit?: string;
  bagi?: string;
}

/** Parameter ruang untuk query/body /v1/berkas. */
export function paramRuang(r: RuangBerkasOpsi): Record<string, string | undefined> {
  if (r.bagi) return { bagi: r.bagi };
  if (r.unit) return { unit: r.unit };
  return { modul: r.modul || undefined };
}

// ================================================================ Hook data

/** Unit yang ruang berkasnya bisa saya buka; `semua` = juga daftar semua unit (untuk tujuan berbagi). */
export function useUnitBerkas(semua = false, enabled = true) {
  return useSiakadQuery<{ unit: UnitBerkas[]; semua?: Array<Pick<UnitBerkas, 'kode' | 'nama' | 'singkatan' | 'jenis'>> }>(
    ['berkas-unit', semua],
    (s, signal) => s.request({ method: 'GET', path: '/v1/berkas/unit', query: { semua: semua ? 1 : undefined } }, { signal }),
    { staleTime: 300_000, enabled },
  );
}

/** Periode akademik yang dipakai berkas di ruang ini, plus periode aktif. */
export function usePeriodeBerkas(r: RuangBerkasOpsi, enabled = true) {
  return useSiakadQuery<{ aktif: string | null; periode: PeriodeBerkas[] }>(
    ['berkas-periode', r.unit ?? '', r.modul ?? '', r.bagi ?? ''],
    (s, signal) => s.request({ method: 'GET', path: '/v1/berkas/periode', query: paramRuang(r) }, { signal }),
    { staleTime: 60_000, enabled },
  );
}

/** Kebijakan enkripsi untuk ruang pribadi (tanpa unit) atau ruang unit. */
export function useKebijakanBerkas(unit?: string, enabled = true) {
  return useSiakadQuery<KebijakanBerkas>(
    ['berkas-kebijakan', unit ?? ''],
    (s, signal) => s.request({ method: 'GET', path: '/v1/berkas/kebijakan', query: { unit: unit || undefined } }, { signal }),
    { staleTime: 60_000, enabled },
  );
}

/** Berkas dan folder yang dibagikan ke saya (`masuk`) atau yang saya bagikan (`keluar`). */
export function useDibagikanBerkas(arah: 'masuk' | 'keluar' = 'masuk', enabled = true) {
  return useSiakadQuery<{ dibagikan: BagiBerkas[] }>(
    ['berkas-dibagikan', arah],
    (s, signal) => s.request({ method: 'GET', path: '/v1/berkas/dibagikan', query: { arah } }, { signal }),
    { staleTime: 30_000, enabled },
  );
}

// ================================================================ Papan klip (salin / potong / tempel antar ruang)

/** Isi papan klip manajer berkas. Dibagi antar ManajerBerkas di halaman yang sama, jadi bisa tempel ke unit lain. */
export interface PapanBerkas {
  mode: 'salin' | 'potong';
  berkas: BerkasManajer[];
  folder?: FolderBerkas | null;
  asal: { unit?: string; modul?: string; label: string };
}

let papan: PapanBerkas | null = null;
const pendengarPapan = new Set<() => void>();

export function setelPapanBerkas(p: PapanBerkas | null) {
  papan = p;
  pendengarPapan.forEach((l) => l());
}

export function usePapanBerkas(): PapanBerkas | null {
  return React.useSyncExternalStore(
    (l) => {
      pendengarPapan.add(l);
      return () => void pendengarPapan.delete(l);
    },
    () => papan,
    () => null,
  );
}

// ================================================================ Enkripsi

const LABEL_MODE: Record<ModeEnkripsiBerkas, string> = { mati: 'Mati', opsional: 'Opsional', wajib: 'Wajib' };
const PENJELASAN_MODE: Record<ModeEnkripsiBerkas, string> = {
  mati: 'Berkas disimpan tanpa enkripsi.',
  opsional: 'Berkas dienkripsi bila pengunggah memintanya.',
  wajib: 'Semua berkas baru dienkripsi otomatis.',
};

/** Lencana kecil status enkripsi efektif. */
export function LencanaEnkripsi({ mode }: { mode: ModeEnkripsiBerkas | null | undefined }) {
  if (!mode || mode === 'mati') return null;
  return (
    <Badge variant={mode === 'wajib' ? 'success' : 'neutral'} title={PENJELASAN_MODE[mode]}>
      {mode === 'wajib' ? <Lock aria-hidden /> : <LockOpen aria-hidden />}
      {mode === 'wajib' ? 'Terenkripsi' : 'Enkripsi opsional'}
    </Badge>
  );
}

export interface KebijakanEnkripsiBerkasProps {
  /** Ruang unit; kosong = ruang pribadi pemanggil (dan kebijakan global bila admin). */
  unit?: string;
  /** Tampilkan daftar semua kebijakan tersimpan (khusus admin, mis. di Pustikom). */
  tampilkanSemua?: boolean;
  className?: string;
}

/**
 * Pengaturan enkripsi isi berkas di tiga tingkat: global (Pustikom), unit (pengelola unit), dan pengguna (diri sendiri).
 * Isi berkas dienkripsi AES-256-GCM di server sebelum dikirim ke penyimpanan; penyedia storage hanya melihat teks sandi.
 */
export function KebijakanEnkripsiBerkas({ unit, tampilkanSemua, className }: KebijakanEnkripsiBerkasProps) {
  const siakad = useSiakad();
  const { data, loading, error } = useKebijakanBerkas(unit);
  const [sibuk, setSibuk] = React.useState<string | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const simpan = async (lingkup: 'global' | 'unit' | 'pengguna', enkripsi: ModeEnkripsiBerkas) => {
    setSibuk(lingkup);
    setGalat(null);
    try {
      await siakad.request({ method: 'POST', path: '/v1/berkas/kebijakan', body: { lingkup, enkripsi, unit: lingkup === 'unit' ? unit : undefined } });
      invalidateSiakad('berkas-kebijakan');
      invalidateSiakad('berkas-info');
      invalidateSiakad('berkas-unit');
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSibuk(null);
    }
  };
  if (loading && !data) return <span className="u-skeleton u-mb-kebijakan-muat" aria-label="Memuat kebijakan enkripsi" />;
  if (error) return <p className="u-field-error">{pesanGalat(error)}</p>;
  if (!data) return null;
  const baris: Array<{ lingkup: 'global' | 'unit' | 'pengguna'; judul: string; ket: string; nilai: ModeEnkripsiBerkas | null; boleh: boolean; mode: ModeEnkripsiBerkas[] }> = [
    { lingkup: 'global', judul: 'Seluruh kampus', ket: 'Diatur Pustikom. Mati menonaktifkan enkripsi di semua ruang.', nilai: data.global, boleh: data.boleh_ubah.global, mode: ['mati', 'opsional', 'wajib'] },
    ...(data.unit !== null
      ? [{ lingkup: 'unit' as const, judul: 'Unit ini', ket: 'Diatur pengelola berkas unit.', nilai: data.unit, boleh: data.boleh_ubah.unit, mode: ['opsional', 'wajib'] as ModeEnkripsiBerkas[] }]
      : []),
    ...(data.pengguna !== null
      ? [{ lingkup: 'pengguna' as const, judul: 'Berkas saya', ket: 'Berlaku untuk ruang pribadi Anda.', nilai: data.pengguna, boleh: data.boleh_ubah.pengguna, mode: ['opsional', 'wajib'] as ModeEnkripsiBerkas[] }]
      : []),
  ];
  return (
    <div className={['u-mb-kebijakan', className].filter(Boolean).join(' ')}>
      <div className="u-mb-kebijakan-efektif" data-mode={data.efektif}>
        <ShieldCheck aria-hidden />
        <span>
          <b>Berlaku sekarang: {LABEL_MODE[data.efektif]}</b>
          <small>{PENJELASAN_MODE[data.efektif]} Isi dienkripsi AES-256-GCM di server sebelum disimpan; pengguna tetap membuka berkas seperti biasa, tanpa kata sandi.</small>
        </span>
      </div>
      {baris.map((b) => (
        <div key={b.lingkup} className="u-mb-kebijakan-baris">
          <span>
            <b>{b.judul}</b>
            <small>{b.ket}</small>
          </span>
          {b.boleh ? (
            <SegmentedControl<ModeEnkripsiBerkas>
              aria-label={`Enkripsi ${b.judul}`}
              value={b.nilai ?? 'opsional'}
              onValueChange={(v) => v !== b.nilai && void simpan(b.lingkup, v)}
              options={b.mode.map((m) => ({ value: m, label: LABEL_MODE[m] }))}
            />
          ) : (
            <Badge variant={b.nilai === 'wajib' ? 'success' : 'neutral'}>{b.nilai ? LABEL_MODE[b.nilai] : '—'}</Badge>
          )}
          {sibuk === b.lingkup && <small aria-live="polite">Menyimpan…</small>}
        </div>
      ))}
      {galat && <p className="u-field-error">{galat}</p>}
      <p className="u-field-description">Perubahan berlaku untuk berkas baru. Berkas lama bisa dienkripsi satu per satu dari menu berkas.</p>
      {tampilkanSemua && data.semua && data.semua.length > 0 && (
        <table className="u-mb-kebijakan-tabel">
          <thead>
            <tr>
              <th>Lingkup</th>
              <th>Unit/pengguna</th>
              <th>Mode</th>
              <th>Diubah</th>
            </tr>
          </thead>
          <tbody>
            {data.semua.map((k) => (
              <tr key={`${k.lingkup}:${k.kunci}`}>
                <td>{k.lingkup}</td>
                <td>{k.kunci || 'Seluruh kampus'}</td>
                <td>{LABEL_MODE[k.enkripsi]}</td>
                <td>{[k.diubah_oleh, k.updated_at ? formatDate(k.updated_at, 'short') : null].filter(Boolean).join(' · ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ================================================================ Dialog berbagi

export type SasaranBagi = { jenis: 'berkas'; b: BerkasManajer } | { jenis: 'folder'; path: string; nama: string; ruang: RuangBerkasOpsi };

async function salinTeks(t: string) {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    return false;
  }
}

function labelPenerima(x: BagiBerkas) {
  if (x.ke_jenis === 'tautan') return x.bersandi ? 'Tautan publik bersandi' : 'Tautan publik';
  if (x.ke_jenis === 'unit') return x.ke_nama ?? x.ke ?? 'Unit';
  return x.ke ?? 'Pengguna';
}

export function DialogBagikanBerkas({ sasaran, tutup }: { sasaran: SasaranBagi | null; tutup: () => void }) {
  const siakad = useSiakad();
  // Daftar semua unit hanya diambil saat dialog bagikan dibuka.
  const unitQ = useUnitBerkas(true, Boolean(sasaran));
  // Ruang unit = arsip_unit aktif; nilai yang dikirim tetap KODE unit (dipetakan dari ID pohon unit arsip).
  const unitArsip = useUnitArsip({ enabled: Boolean(sasaran) });
  const [jenis, setJenis] = React.useState<'pengguna' | 'unit' | 'tautan'>('pengguna');
  const [ke, setKe] = React.useState('');
  const [izin, setIzin] = React.useState<'lihat' | 'ubah'>('lihat');
  const [sandi, setSandi] = React.useState('');
  const [sampai, setSampai] = React.useState('');
  const [pesan, setPesan] = React.useState('');
  const [daftar, setDaftar] = React.useState<BagiBerkas[]>([]);
  const [memuat, setMemuat] = React.useState(false);
  const [sibuk, setSibuk] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [disalin, setDisalin] = React.useState<string | null>(null);
  const kunci = sasaran ? (sasaran.jenis === 'berkas' ? `b:${sasaran.b.id}` : `f:${JSON.stringify(sasaran.ruang)}:${sasaran.path}`) : '';

  const muat = React.useCallback(async () => {
    if (!sasaran) return;
    setMemuat(true);
    try {
      const r =
        sasaran.jenis === 'berkas'
          ? await siakad.request<{ dibagikan: BagiBerkas[] }>({ method: 'GET', path: `/v1/berkas/${encodeURIComponent(sasaran.b.id)}/bagikan` })
          : await siakad.request<{ dibagikan: BagiBerkas[] }>({ method: 'GET', path: '/v1/berkas/folder/bagikan', query: { path: sasaran.path, ...paramRuang(sasaran.ruang) } });
      setDaftar(r.data.dibagikan ?? []);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setMemuat(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siakad, kunci]);

  React.useEffect(() => {
    if (!sasaran) return;
    setJenis('pengguna');
    setKe('');
    setIzin('lihat');
    setSandi('');
    setSampai('');
    setPesan('');
    setGalat(null);
    setDisalin(null);
    setDaftar([]);
    void muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunci]);

  const salahSandi = jenis === 'tautan' && sandi !== '' && sandi.length < 4 ? 'Kata sandi minimal 4 karakter.' : null;
  const kurang = (jenis === 'pengguna' || jenis === 'unit') && !ke.trim();

  const kirim = async () => {
    if (!sasaran || salahSandi || kurang) return;
    setSibuk(true);
    setGalat(null);
    const body = {
      ke_jenis: jenis,
      ke: jenis === 'tautan' ? undefined : ke.trim(),
      izin: jenis === 'tautan' ? 'lihat' : izin,
      sandi: jenis === 'tautan' && sandi ? sandi : undefined,
      kedaluwarsa_at: sampai ? `${sampai} 23:59:59` : undefined,
      pesan: pesan.trim() || undefined,
    };
    try {
      const r =
        sasaran.jenis === 'berkas'
          ? await siakad.request<BagiBerkas>({ method: 'POST', path: `/v1/berkas/${encodeURIComponent(sasaran.b.id)}/bagikan`, body })
          : await siakad.request<BagiBerkas>({ method: 'POST', path: '/v1/berkas/folder/bagikan', body: { ...body, path: sasaran.path, ...paramRuang(sasaran.ruang) } });
      if (r.data.tautan && (await salinTeks(r.data.tautan))) setDisalin(r.data.id);
      setKe('');
      setSandi('');
      setPesan('');
      invalidateSiakad('berkas-dibagikan');
      await muat();
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSibuk(false);
    }
  };

  const cabut = async (x: BagiBerkas) => {
    try {
      await siakad.request({ method: 'POST', path: `/v1/berkas/bagikan/${encodeURIComponent(x.id)}/cabut` });
      setDaftar((d) => d.filter((y) => y.id !== x.id));
      invalidateSiakad('berkas-dibagikan');
    } catch (e) {
      setGalat(pesanGalat(e));
    }
  };

  const nama = sasaran ? (sasaran.jenis === 'berkas' ? sasaran.b.nama : sasaran.nama) : '';
  // Cadangan bila /v1/arsip/unit tidak bisa dibaca: daftar datar dari /v1/berkas/unit dengan kode sebagai ID.
  const unitCadangan = React.useMemo(() => (unitQ.data?.semua ?? unitQ.data?.unit ?? []).map((u) => ({ id: u.kode, kode: u.kode, nama: u.nama, singkatan: u.singkatan, jenis: u.jenis })), [unitQ.data]);
  const idUnitKe = ke ? (unitArsip.data?.find((u) => u.kode === ke)?.id ?? ke) : null;

  return (
    <Dialog
      open={Boolean(sasaran)}
      onOpenChange={(o) => !o && tutup()}
      title={`Bagikan ${nama}`}
      description={
        sasaran?.jenis === 'folder'
          ? 'Subfolder dan berkas di dalamnya ikut terbagi, termasuk yang ditambahkan nanti.'
          : 'Berkas tetap privat; hanya penerima di bawah yang bisa membukanya.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={tutup}>
            Selesai
          </Button>
          <Button onClick={kirim} loading={sibuk} disabled={kurang || Boolean(salahSandi)}>
            {jenis === 'tautan' ? <Link2 aria-hidden /> : jenis === 'unit' ? <Building2 aria-hidden /> : <UserRound aria-hidden />}
            {jenis === 'tautan' ? 'Buat tautan' : 'Bagikan'}
          </Button>
        </>
      }
    >
      <form
        className="u-mb-form"
        onSubmit={(e) => {
          e.preventDefault();
          void kirim();
        }}
      >
        <SegmentedControl<'pengguna' | 'unit' | 'tautan'>
          aria-label="Bagikan ke"
          fullWidth
          value={jenis}
          onValueChange={(v) => (setJenis(v), setKe(''), setGalat(null))}
          options={[
            { value: 'pengguna', label: 'Orang' },
            { value: 'unit', label: 'Unit' },
            { value: 'tautan', label: 'Tautan publik' },
          ]}
        />
        {jenis === 'pengguna' && (
          <>
            <label className="u-label" htmlFor="u-mb-bagi-ke">
              Username penerima
            </label>
            <Input id="u-mb-bagi-ke" value={ke} onChange={(e) => setKe(e.target.value)} placeholder="mis. 0123045601" autoComplete="off" />
          </>
        )}
        {jenis === 'unit' && (
          <>
            <label className="u-label" htmlFor="u-mb-bagi-unit">
              Unit penerima
            </label>
            <PilihUnit
              id="u-mb-bagi-unit"
              aria-label="Unit penerima"
              sumber="arsip"
              dataCadangan={unitCadangan}
              value={idUnitKe}
              onValueChange={(_, u) => setKe(u?.kode ?? '')}
              placeholder="Pilih unit"
            />
            <p className="u-field-description">Semua anggota unit itu bisa membukanya.</p>
          </>
        )}
        {jenis !== 'tautan' ? (
          <>
            <label className="u-label" htmlFor="u-mb-bagi-izin">
              Izin
            </label>
            <Select<'lihat' | 'ubah'>
              id="u-mb-bagi-izin"
              aria-label="Izin"
              value={izin}
              onValueChange={(v) => setIzin(v ?? 'lihat')}
              options={[
                { value: 'lihat', label: 'Lihat dan unduh' },
                { value: 'ubah', label: 'Lihat, unduh, dan ganti nama' },
              ]}
            />
          </>
        ) : (
          <>
            <label className="u-label" htmlFor="u-mb-bagi-sandi">
              Kata sandi <small>(opsional)</small>
            </label>
            <Input id="u-mb-bagi-sandi" type="password" value={sandi} onChange={(e) => setSandi(e.target.value)} autoComplete="new-password" aria-invalid={Boolean(salahSandi)} />
            {salahSandi ? <p className="u-field-error">{salahSandi}</p> : <p className="u-field-description">Siapa pun yang punya tautan bisa membuka tanpa login. Tambah kata sandi untuk dokumen penting.</p>}
          </>
        )}
        <label className="u-label" htmlFor="u-mb-bagi-sampai">
          Berlaku sampai <small>(opsional)</small>
        </label>
        <Input id="u-mb-bagi-sampai" type="date" value={sampai} min={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)} onChange={(e) => setSampai(e.target.value)} />
        <label className="u-label" htmlFor="u-mb-bagi-pesan">
          Pesan <small>(opsional)</small>
        </label>
        <Textarea id="u-mb-bagi-pesan" rows={2} maxLength={255} value={pesan} onChange={(e) => setPesan(e.target.value)} />
        {galat && <p className="u-field-error">{galat}</p>}
      </form>

      <div className="u-mb-bagi-daftar" aria-busy={memuat}>
        <h4>Sudah dibagikan ke</h4>
        {memuat && !daftar.length ? (
          <span className="u-skeleton u-mb-bagi-muat" aria-label="Memuat" />
        ) : !daftar.length ? (
          <p className="u-field-description">Belum dibagikan. Hanya Anda{sasaran?.jenis === 'folder' && sasaran.ruang.unit ? ' dan anggota unit' : ''} yang bisa membukanya.</p>
        ) : (
          <ul>
            {daftar.map((x) => (
              <li key={x.id}>
                {x.ke_jenis === 'tautan' ? <Globe aria-hidden /> : x.ke_jenis === 'unit' ? <Building2 aria-hidden /> : <UserRound aria-hidden />}
                <span>
                  <b>{labelPenerima(x)}</b>
                  <small>
                    {[
                      x.ke_jenis === 'tautan' ? `${x.jumlah_akses ?? 0}× dibuka` : x.izin === 'ubah' ? 'Bisa mengubah' : 'Bisa melihat',
                      x.kedaluwarsa_at ? `sampai ${formatDate(x.kedaluwarsa_at, 'short')}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </small>
                </span>
                {x.tautan && (
                  <Button variant="ghost" size="sm" onClick={async () => (await salinTeks(x.tautan!)) && setDisalin(x.id)}>
                    {disalin === x.id ? <Check aria-hidden /> : <Copy aria-hidden />}
                    {disalin === x.id ? 'Tersalin' : 'Salin tautan'}
                  </Button>
                )}
                <Button variant="ghost" size="sm" iconOnly aria-label={`Cabut berbagi ke ${labelPenerima(x)}`} onClick={() => void cabut(x)}>
                  <Trash2 aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}

// ================================================================ Dialog berkas baru (dokumen teks, catatan, CSV)

export type JenisBerkasBaru = 'txt' | 'md' | 'csv';
export const BERKAS_BARU: Record<JenisBerkasBaru, { label: string; mime: string; contoh: string }> = {
  txt: { label: 'Dokumen teks', mime: 'text/plain', contoh: '' },
  md: { label: 'Catatan (Markdown)', mime: 'text/markdown', contoh: '# Judul\n\n' },
  csv: { label: 'Tabel CSV', mime: 'text/csv', contoh: 'kolom1,kolom2\n' },
};

export function DialogBerkasBaru({
  jenis,
  tutup,
  buat,
}: {
  jenis: JenisBerkasBaru | null;
  tutup: () => void;
  buat: (file: File) => Promise<void>;
}) {
  const [nama, setNama] = React.useState('');
  const [isi, setIsi] = React.useState('');
  const [galat, setGalat] = React.useState<string | null>(null);
  const [sibuk, setSibuk] = React.useState(false);
  React.useEffect(() => {
    if (!jenis) return;
    setNama(jenis === 'csv' ? 'Tabel baru' : jenis === 'md' ? 'Catatan baru' : 'Dokumen baru');
    setIsi(BERKAS_BARU[jenis].contoh);
    setGalat(null);
  }, [jenis]);
  const bersih = nama.replace(/[/\\\r\n]/g, '').trim();
  const kirim = async () => {
    if (!jenis) return;
    if (!bersih) return setGalat('Nama berkas wajib diisi.');
    setSibuk(true);
    try {
      await buat(new File([isi], `${bersih}.${jenis}`, { type: BERKAS_BARU[jenis].mime }));
      tutup();
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSibuk(false);
    }
  };
  return (
    <Dialog
      open={Boolean(jenis)}
      onOpenChange={(o) => !o && tutup()}
      title={jenis ? `${BERKAS_BARU[jenis].label} baru` : ''}
      footer={
        <>
          <Button variant="ghost" onClick={tutup}>
            Batal
          </Button>
          <Button onClick={kirim} loading={sibuk}>
            Buat berkas
          </Button>
        </>
      }
    >
      <form
        className="u-mb-form"
        onSubmit={(e) => {
          e.preventDefault();
          void kirim();
        }}
      >
        <label className="u-label" htmlFor="u-mb-baru-nama">
          Nama berkas
        </label>
        <div className="u-mb-nama-ext">
          <Input id="u-mb-baru-nama" value={nama} onChange={(e) => (setNama(e.target.value), setGalat(null))} autoFocus />
          <span>.{jenis}</span>
        </div>
        <label className="u-label" htmlFor="u-mb-baru-isi">
          Isi
        </label>
        <Textarea id="u-mb-baru-isi" rows={10} value={isi} onChange={(e) => setIsi(e.target.value)} className="u-mb-baru-isi" spellCheck={jenis !== 'csv'} />
        {galat && <p className="u-field-error">{galat}</p>}
      </form>
    </Dialog>
  );
}

// ================================================================ Dialog periode berkas

export function DialogPeriodeBerkas({
  berkas,
  pilihan,
  tutup,
  simpan,
}: {
  berkas: BerkasManajer[] | null;
  pilihan: PeriodeBerkas[];
  tutup: () => void;
  simpan: (periode: string) => Promise<void>;
}) {
  const [nilai, setNilai] = React.useState<string>('tanpa');
  const [galat, setGalat] = React.useState<string | null>(null);
  const [sibuk, setSibuk] = React.useState(false);
  React.useEffect(() => {
    if (berkas) {
      setNilai(berkas[0]?.periode ?? 'tanpa');
      setGalat(null);
    }
  }, [berkas]);
  const opsi = [...pilihan.filter((p) => p.periode !== 'tanpa').map((p) => ({ value: p.periode, label: `${p.nama}${p.aktif ? ' (aktif)' : ''}` })), { value: 'tanpa', label: 'Tanpa periode' }];
  const kirim = async () => {
    setSibuk(true);
    setGalat(null);
    try {
      await simpan(nilai);
      tutup();
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSibuk(false);
    }
  };
  return (
    <Dialog
      open={Boolean(berkas)}
      onOpenChange={(o) => !o && tutup()}
      title={berkas && berkas.length > 1 ? `Periode ${berkas.length} berkas` : 'Periode akademik berkas'}
      description="Berkas dikelompokkan per periode akademik untuk memudahkan pencarian dan arsip."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={tutup}>
            Batal
          </Button>
          <Button onClick={kirim} loading={sibuk}>
            Simpan periode
          </Button>
        </>
      }
    >
      <label className="u-label" htmlFor="u-mb-periode-pilih">
        Periode
      </label>
      <Select<string> id="u-mb-periode-pilih" aria-label="Periode" value={nilai} onValueChange={(v) => setNilai(v ?? 'tanpa')} options={opsi} />
      {galat && <p className="u-field-error">{galat}</p>}
    </Dialog>
  );
}
