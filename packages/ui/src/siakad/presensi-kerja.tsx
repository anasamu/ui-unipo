'use client';
import * as React from 'react';
import {
  Ban,
  Camera,
  CheckCircle2,
  CircleAlert,
  Clock,
  History,
  LogIn,
  LogOut,
  MapPin,
  MapPinOff,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  Trash2,
  Unlink,
  XCircle,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton, type BadgeVariant } from '../components/actions';
import { Alert, Card, CardHeader, DescriptionList, Empty, Tabs } from '../components/display';
import { DataTable } from '../components/data-table';
import { Field, Input, Switch, Textarea } from '../components/forms';
import { IsianTanggal, PanelForm, Pilihan } from '../components/formulir';
import { ConfirmDialog, Dialog, Menu, useToast } from '../components/overlays';
import { Peta, PilihTitikPeta, jarakMeterPeta, useLokasiPerangkat, type AreaPeta, type NadaPeta, type TitikPeta } from '../components/peta';
import { GalatApi } from './galat';
import { PilihEntitas, type SumberEntitas } from './pilih';
import { idPerangkatPresensi } from './presensi';
import { useUnggahBerkas } from './berkas';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

/*
 * Presensi kerja pegawai (/v1/sdm/presensi) dengan peta: layar presensi masuk/pulang (area kampus, posisi + akurasi,
 * swafoto, alasan di luar area), riwayat dan koreksi, persetujuan atasan, pemantauan sebaran + tanda curiga, serta
 * pengelolaan lokasi, jadwal/shift, kebijakan, dan perangkat. Semua aturan ditegakkan server; komponen di sini hanya
 * menampilkan perkiraan supaya pegawai tahu sebelum menekan tombol.
 */

const P = '/v1/sdm/presensi';

// ================================================================ Tipe
export interface LokasiPresensiKerja {
  id: string;
  kode: string;
  nama: string;
  kampus: string | null;
  lat: number;
  lng: number;
  radius_m: number;
  alamat: string | null;
  unit_id?: number | null;
  aktif?: boolean;
  keterangan?: string | null;
  boleh_ubah?: boolean;
}

export interface JadwalHariPresensi {
  kerja: boolean;
  libur: string | null;
  masuk: string;
  pulang: string;
  masuk_at: string | null;
  pulang_at: string | null;
  toleransi_terlambat_menit: number;
  buka_masuk_at: string | null;
  batas_masuk_at: string | null;
  tutup_pulang_at: string | null;
  lintas_hari: boolean;
  jadwal: { id: string | null; kode: string; nama: string };
}

export interface AturanPresensiKerja {
  kebijakan: { id: string; nama: string; cakupan: string } | null;
  mode_lokasi: 'area' | 'bebas';
  luar_area: 'tolak' | 'tinjau';
  wajib_foto: boolean;
  akurasi_maks_m: number;
  tolak_lokasi_palsu: boolean;
  perangkat_maks: number;
  lokasi: LokasiPresensiKerja[];
}

export interface BarisPresensiKerja {
  id: number;
  tanggal: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
  status: string;
  terlambat_menit: number;
  pulang_cepat_menit: number;
  sumber: string;
  keterangan: string | null;
}

export interface StatusPresensiSaya {
  waktu_server: string;
  zona_waktu: string;
  pegawai: { id: number; nama: string; jenis: string };
  tanggal: string;
  jadwal: JadwalHariPresensi;
  aturan: AturanPresensiKerja;
  cuti: { nama: string; status_presensi: string } | null;
  presensi: BarisPresensiKerja | null;
  aksi_berikutnya: 'masuk' | 'pulang' | null;
  perangkat: { terdaftar: boolean; status: string | null; nama?: string | null } | null;
  koreksi_menunggu: number;
}

export interface KejadianPresensi {
  id: string;
  pegawai_id: number;
  pegawai_nama: string | null;
  tanggal: string;
  aksi: 'masuk' | 'pulang';
  hasil: 'diterima' | 'ditolak' | 'tinjau' | 'dibatalkan';
  alasan: string | null;
  catatan: string | null;
  sumber: string;
  waktu: string;
  waktu_perangkat: string | null;
  posisi: { lat: number; lng: number; akurasi_m: number | null } | null;
  lokasi: { id: string; nama: string } | null;
  jarak_m: number | null;
  dalam_area: boolean | null;
  foto_berkas_id: string | null;
  perangkat: { nama: string | null; platform: string | null } | null;
  tanda: string[];
  ip: string | null;
}

export interface HasilCatatPresensiKerja {
  hasil: 'diterima' | 'tinjau';
  aksi: 'masuk' | 'pulang';
  tanggal: string;
  waktu: string;
  pesan: string;
  kejadian: KejadianPresensi;
  presensi: BarisPresensiKerja | null;
  ulang?: boolean;
}

export interface KoreksiPresensi {
  id: string;
  pegawai: { id: number; nama: string | null };
  tanggal: string;
  jenis: 'lupa_masuk' | 'lupa_pulang' | 'luar_area' | 'dinas_luar' | 'gangguan' | 'lainnya';
  jam_masuk: string | null;
  jam_pulang: string | null;
  alasan: string;
  berkas_id: string | null;
  kejadian: KejadianPresensi | null;
  status: 'diajukan' | 'disetujui' | 'ditolak' | 'dibatalkan';
  diputuskan_oleh: string | null;
  diputuskan_at: string | null;
  catatan_keputusan: string | null;
  created_at: string;
  hak: { putuskan: boolean; batal: boolean };
}

export interface JadwalKerja {
  id: string;
  kode: string;
  nama: string;
  unit_id: number | null;
  hari: Record<string, { masuk: string; pulang: string }>;
  toleransi_terlambat_menit: number;
  buka_masuk_menit: number;
  batas_masuk_menit: number | null;
  tutup_pulang_menit: number;
  lintas_hari: boolean;
  ikut_hari_libur: boolean;
  aktif: boolean;
  keterangan: string | null;
  boleh_ubah: boolean;
}

export interface KebijakanPresensi {
  id: string;
  nama: string;
  cakupan: 'semua' | 'jenis' | 'unit' | 'pegawai';
  jenis_pegawai: 'dosen' | 'tendik' | null;
  unit: { id: number; nama: string } | null;
  pegawai: { id: number; nama: string } | null;
  jadwal: { id: string; kode: string; nama: string } | null;
  mode_lokasi: 'area' | 'bebas';
  lokasi: Array<{ id: string; kode: string; nama: string }>;
  luar_area: 'tolak' | 'tinjau';
  wajib_foto: boolean;
  akurasi_maks_m: number;
  tolak_lokasi_palsu: boolean;
  perangkat_maks: number;
  berlaku_mulai: string | null;
  berlaku_selesai: string | null;
  aktif: boolean;
  keterangan: string | null;
  boleh_ubah: boolean;
}

export interface PerangkatPresensiKerja {
  id: string;
  pegawai_id: number;
  nama: string | null;
  platform: string;
  status: 'aktif' | 'diblokir' | 'dilepas';
  terakhir_at: string | null;
  terakhir_ip: string | null;
  catatan: string | null;
  created_at: string;
  perangkat_ini: boolean;
}

// ================================================================ Label dan bantuan
export const LABEL_TANDA_PRESENSI: Record<string, string> = {
  lokasi_palsu: 'Lokasi palsu',
  akurasi_rendah: 'Akurasi GPS rendah',
  jam_perangkat: 'Jam perangkat menyimpang',
  kecepatan: 'Perpindahan mustahil',
  perangkat_baru: 'Perangkat baru',
  luar_area: 'Di luar area',
  hari_libur: 'Hari libur',
};
export const LABEL_JENIS_KOREKSI: Record<KoreksiPresensi['jenis'], string> = {
  lupa_masuk: 'Lupa presensi masuk',
  lupa_pulang: 'Lupa presensi pulang',
  luar_area: 'Presensi di luar area',
  dinas_luar: 'Dinas luar / tugas lapangan',
  gangguan: 'Gangguan aplikasi atau mesin',
  lainnya: 'Lainnya',
};
const LABEL_HASIL: Record<KejadianPresensi['hasil'], [string, BadgeVariant]> = {
  diterima: ['Diterima', 'success'],
  ditolak: ['Ditolak', 'danger'],
  tinjau: ['Menunggu tinjauan', 'warning'],
  dibatalkan: ['Dibatalkan', 'neutral'],
};
const LABEL_STATUS_KOREKSI: Record<KoreksiPresensi['status'], [string, BadgeVariant]> = {
  diajukan: ['Menunggu', 'warning'],
  disetujui: ['Disetujui', 'success'],
  ditolak: ['Ditolak', 'danger'],
  dibatalkan: ['Dibatalkan', 'neutral'],
};
const NAMA_HARI = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

const jam = (w: string | null | undefined) => (w ? w.slice(11, 16) : '–');
const tgl = (d: string | null | undefined) => {
  if (!d) return '–';
  const x = new Date(`${d.slice(0, 10)}T00:00:00`);
  return Number.isNaN(x.getTime()) ? d : x.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};
const jarakTeks = (m: number) => (m >= 1000 ? `${(m / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} km` : `${Math.round(m)} m`);

function hariIni(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function BadgeHasilPresensi({ hasil }: { hasil: KejadianPresensi['hasil'] }) {
  const [l, v] = LABEL_HASIL[hasil] ?? [hasil, 'neutral'];
  return <Badge variant={v}>{l}</Badge>;
}

export function TandaPresensi({ tanda }: { tanda: string[] }) {
  if (!tanda.length) return null;
  return (
    <span className="u-pk-tanda">
      {tanda.map((t) => (
        <Badge key={t} variant={t === 'hari_libur' || t === 'perangkat_baru' ? 'info' : 'warning'}>
          {LABEL_TANDA_PRESENSI[t] ?? t}
        </Badge>
      ))}
    </span>
  );
}

/** Perkiraan hasil area untuk posisi saat ini (sama dengan hitungan server). */
export function nilaiAreaPresensiKerja(aturan: AturanPresensiKerja, posisi: { lat: number; lng: number; akurasi_m?: number | null } | null) {
  let dekat: { lokasi: LokasiPresensiKerja; jarak: number; dalam: boolean } | null = null;
  if (posisi) {
    for (const l of aturan.lokasi) {
      const j = jarakMeterPeta(posisi.lat, posisi.lng, l.lat, l.lng);
      const dalam = j <= l.radius_m;
      if (!dekat || (dalam && !dekat.dalam) || (dalam === dekat.dalam && j < dekat.jarak)) dekat = { lokasi: l, jarak: j, dalam };
    }
  }
  const akurasiCukup = !posisi?.akurasi_m || posisi.akurasi_m <= aturan.akurasi_maks_m;
  const bebas = aturan.mode_lokasi === 'bebas';
  return {
    lokasi: dekat?.lokasi ?? null,
    jarak_m: dekat ? Math.round(dekat.jarak) : null,
    dalam: dekat?.dalam ?? false,
    akurasiCukup,
    boleh: bebas || (!!posisi && akurasiCukup && !!dekat?.dalam),
    perluAlasan: !bebas && !!posisi && akurasiCukup && !dekat?.dalam && aturan.luar_area === 'tinjau',
  };
}

export function useStatusPresensiSaya() {
  return useSiakadQuery<StatusPresensiSaya>(['sdm-presensi', 'saya'], (s, signal) => s.request({ method: 'GET', path: `${P}/saya` }, { signal, headers: { 'X-Perangkat-Id': idPerangkatPresensi() } }), { staleTime: 15_000 });
}

function useJamServer(waktuServer: string | undefined) {
  const [selisih, setSelisih] = React.useState(0);
  const [kini, setKini] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!waktuServer) return;
    const s = new Date(waktuServer.replace(' ', 'T')).getTime();
    if (!Number.isNaN(s)) setSelisih(s - Date.now());
  }, [waktuServer]);
  React.useEffect(() => {
    const t = setInterval(() => setKini(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return new Date(kini + selisih);
}

// ================================================================ Layar presensi
export interface PresensiKerjaSayaProps {
  /** Buka formulir koreksi (bila tidak diisi, formulir bawaan dipakai). */
  onKoreksi?: () => void;
  className?: string;
}

/**
 * Layar presensi kerja: jam server, jadwal hari ini, peta area + posisi saya, status di dalam/luar area, swafoto bila
 * diwajibkan, lalu tombol Masuk/Pulang. Di luar area dengan kebijakan tinjau: isi alasan, menunggu persetujuan atasan.
 */
export function PresensiKerjaSaya({ onKoreksi, className }: PresensiKerjaSayaProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useStatusPresensiSaya();
  const s = q.data;
  const jamKini = useJamServer(s?.waktu_server);
  const butuhLokasi = !!s && (s.aturan.mode_lokasi === 'area' || s.aturan.lokasi.length > 0);
  const lok = useLokasiPerangkat({ pantau: true, aktif: butuhLokasi && !!s?.aksi_berikutnya });
  const unggah = useUnggahBerkas({ modul: 'sdm', kategori: 'gambar' } as never);
  const [alasan, setAlasan] = React.useState('');
  const [foto, setFoto] = React.useState<{ id: string; url: string } | null>(null);
  const [unggahFoto, setUnggahFoto] = React.useState(false);
  const [kirim, setKirim] = React.useState(false);
  const [hasil, setHasil] = React.useState<{ ok: boolean; pesan: string; tinjau?: boolean } | null>(null);
  const [koreksi, setKoreksi] = React.useState(false);
  const kunci = React.useRef<string | null>(null);
  const inputFoto = React.useRef<HTMLInputElement>(null);

  if (q.loading && !s) return <Skeleton className={className} style={{ height: 420 }} />;
  if (q.error && !s) return <GalatApi error={q.error} onRetry={q.refetch} />;
  if (!s) return null;

  const area = nilaiAreaPresensiKerja(s.aturan, lok.posisi);
  const aksi = s.aksi_berikutnya;
  const p = s.presensi;
  const butuhFoto = s.aturan.wajib_foto && !foto;
  const siapKirim = !!aksi && !kirim && !unggahFoto && !butuhFoto && (area.boleh || (area.perluAlasan && alasan.trim().length >= 5));

  const catat = async () => {
    if (!aksi) return;
    setKirim(true);
    setHasil(null);
    kunci.current ??= typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      const r = await siakad.request<HasilCatatPresensiKerja>({
        method: 'POST',
        path: `${P}/catat`,
        body: {
          aksi,
          ...(lok.posisi ? { lat: +lok.posisi.lat.toFixed(7), lng: +lok.posisi.lng.toFixed(7), akurasi_m: Math.round(lok.posisi.akurasi_m) } : {}),
          waktu_perangkat: new Date().toISOString(),
          perangkat_id: idPerangkatPresensi(),
          perangkat_nama: typeof navigator !== 'undefined' ? navigator.userAgent.match(/\(([^;)]+)/)?.[1]?.slice(0, 100) : undefined,
          platform: 'web',
          ...(foto ? { foto_berkas_id: foto.id } : {}),
          ...(area.perluAlasan && !area.dalam ? { alasan: alasan.trim() } : {}),
        },
      }, { headers: { 'Idempotency-Key': kunci.current } });
      kunci.current = null;
      setHasil({ ok: true, pesan: r.data.pesan, tinjau: r.data.hasil === 'tinjau' });
      toast.add({ title: r.data.pesan, type: r.data.hasil === 'tinjau' ? 'warning' : 'success' });
      setAlasan('');
      setFoto(null);
      invalidateSiakad('sdm-presensi');
      q.refetch();
    } catch (e) {
      // Kunci dipertahankan bila server tidak menjawab (jaringan putus), supaya tekan ulang tidak mencatat dua kali.
      if (typeof (e as { status?: unknown }).status === 'number' && (e as { status: number }).status > 0) kunci.current = null;
      setHasil({ ok: false, pesan: pesanGalat(e) });
    } finally {
      setKirim(false);
    }
  };

  const nadaArea: NadaPeta = area.dalam ? 'sukses' : 'utama';
  const statusArea = !butuhLokasi ? null : lok.galat ? (
    <span className="u-pk-chip" data-nada="bahaya">
      <MapPinOff aria-hidden /> {lok.galat}
    </span>
  ) : !lok.posisi ? (
    <span className="u-pk-chip">
      <RefreshCw aria-hidden className="u-pk-putar" /> Mencari lokasi…
    </span>
  ) : !area.akurasiCukup && s.aturan.mode_lokasi === 'area' ? (
    <span className="u-pk-chip" data-nada="peringatan">
      <CircleAlert aria-hidden /> Akurasi ±{Math.round(lok.posisi.akurasi_m)} m (batas {s.aturan.akurasi_maks_m} m). Tunggu sebentar atau pindah ke tempat terbuka.
    </span>
  ) : area.dalam ? (
    <span className="u-pk-chip" data-nada="sukses">
      <CheckCircle2 aria-hidden /> Di dalam area {area.lokasi?.nama} · {jarakTeks(area.jarak_m ?? 0)} dari pusat
    </span>
  ) : s.aturan.mode_lokasi === 'bebas' ? (
    <span className="u-pk-chip" data-nada="info">
      <MapPin aria-hidden /> Lokasi dicatat (presensi tidak dibatasi area){area.lokasi ? ` · ${jarakTeks(area.jarak_m ?? 0)} dari ${area.lokasi.nama}` : ''}
    </span>
  ) : (
    <span className="u-pk-chip" data-nada={area.perluAlasan ? 'peringatan' : 'bahaya'}>
      <MapPinOff aria-hidden /> Di luar area{area.lokasi ? ` · ${jarakTeks(area.jarak_m ?? 0)} dari ${area.lokasi.nama} (radius ${area.lokasi.radius_m} m)` : ''}
    </span>
  );

  return (
    <div className={cn('u-pk-layar', className)}>
      <Card className="u-pk-kartu">
        <div className="u-pk-kepala">
          <div>
            <p className="u-pk-tanggal">{jamKini.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="u-pk-jam" aria-live="off">
              {jamKini.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="u-pk-jadwal">
              {s.cuti ? (
                <>Anda tercatat {s.cuti.nama.toLowerCase()} hari ini.</>
              ) : s.jadwal.kerja ? (
                <>
                  {s.jadwal.jadwal.nama} · {s.jadwal.masuk}–{s.jadwal.pulang}
                  {s.jadwal.lintas_hari ? ' (esok hari)' : ''}
                  {s.jadwal.toleransi_terlambat_menit ? ` · toleransi ${s.jadwal.toleransi_terlambat_menit} menit` : ''}
                </>
              ) : (
                <>Bukan hari kerja{s.jadwal.libur ? `: ${s.jadwal.libur}` : ''}. Presensi tetap bisa dicatat sebagai lembur.</>
              )}
            </p>
          </div>
          <dl className="u-pk-ringkas">
            <div>
              <dt>Masuk</dt>
              <dd>{jam(p?.jam_masuk)}</dd>
              {p?.terlambat_menit ? <span className="u-pk-catatan">terlambat {p.terlambat_menit} mnt</span> : null}
            </div>
            <div>
              <dt>Pulang</dt>
              <dd>{jam(p?.jam_pulang)}</dd>
              {p?.pulang_cepat_menit ? <span className="u-pk-catatan">pulang cepat {p.pulang_cepat_menit} mnt</span> : null}
            </div>
          </dl>
        </div>

        {butuhLokasi && (
          <Peta
            tinggi={300}
            label="Peta area presensi dan posisi Anda"
            area={s.aturan.lokasi.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, radius_m: l.radius_m, label: l.nama, keterangan: l.kampus ?? undefined, nada: area.lokasi?.id === l.id ? nadaArea : 'utama' }))}
            posisi={lok.posisi}
            onPosisiSaya={lok.muatUlang}
          />
        )}

        <div className="u-pk-badan">
          {statusArea}
          {s.aturan.wajib_foto && aksi && (
            <div className="u-pk-foto">
              <input
                ref={inputFoto}
                type="file"
                accept="image/*"
                capture="user"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  setUnggahFoto(true);
                  try {
                    const b = await unggah(f);
                    setFoto({ id: b.id, url: URL.createObjectURL(f) });
                  } catch (err) {
                    toast.add({ title: 'Swafoto belum terunggah', description: pesanGalat(err), type: 'error' });
                  } finally {
                    setUnggahFoto(false);
                  }
                }}
              />
              {foto ? <img src={foto.url} alt="Swafoto presensi" /> : <span className="u-pk-foto-kosong" aria-hidden><Camera /></span>}
              <div>
                <strong>Swafoto wajib</strong>
                <p>Ambil foto wajah Anda di lokasi sebelum mencatat presensi.</p>
                <Button size="sm" variant="outline" loading={unggahFoto} onClick={() => inputFoto.current?.click()}>
                  <Camera aria-hidden /> {foto ? 'Ambil ulang' : 'Ambil swafoto'}
                </Button>
              </div>
            </div>
          )}
          {aksi && area.perluAlasan && !area.dalam && (
            <Field label="Alasan presensi di luar area" required description="Presensi dicatat dan menunggu persetujuan atasan langsung.">
              <Textarea rows={2} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Mis. rapat di gedung rektorat, kunjungan mitra" />
            </Field>
          )}
          {hasil && (
            <Alert variant={hasil.ok ? (hasil.tinjau ? 'warning' : 'success') : 'danger'} title={hasil.ok ? (hasil.tinjau ? 'Menunggu persetujuan' : 'Berhasil') : 'Presensi belum tercatat'}>
              {hasil.pesan}
            </Alert>
          )}
          <div className="u-pk-aksi">
            {aksi ? (
              <Button size="lg" variant={aksi === 'masuk' ? 'primary' : 'outline'} disabled={!siapKirim} loading={kirim} onClick={catat}>
                {aksi === 'masuk' ? <LogIn aria-hidden /> : <LogOut aria-hidden />} {aksi === 'masuk' ? 'Catat masuk' : 'Catat pulang'}
              </Button>
            ) : (
              <p className="u-pk-selesai">
                <CheckCircle2 aria-hidden /> {s.cuti ? 'Tidak perlu presensi hari ini.' : 'Presensi hari ini sudah lengkap.'}
              </p>
            )}
            <Button variant="ghost" onClick={() => (onKoreksi ? onKoreksi() : setKoreksi(true))}>
              <Pencil aria-hidden /> Ajukan koreksi
            </Button>
          </div>
          <p className="u-pk-catatan-kecil">
            Jam memakai jam server ({s.zona_waktu}). {s.aturan.kebijakan ? `Aturan: ${s.aturan.kebijakan.nama}.` : 'Aturan bawaan kepegawaian.'}
            {s.koreksi_menunggu ? ` ${s.koreksi_menunggu} koreksi menunggu keputusan.` : ''}
            {s.perangkat?.status === 'diblokir' ? ' Perangkat ini diblokir untuk presensi.' : ''}
          </p>
        </div>
      </Card>
      <FormKoreksiPresensi open={koreksi} onOpenChange={setKoreksi} />
    </div>
  );
}

// ================================================================ Riwayat / log kejadian
export interface RiwayatKejadianPresensiProps {
  /** `saya` (bawaan) atau ID pegawai; kosong untuk semua yang boleh dilihat (petugas). */
  pegawaiId?: number | 'saya' | null;
  unitId?: number | null;
  dari?: string;
  sampai?: string;
  /** Hanya yang punya tanda curiga. */
  bertanda?: boolean;
  hasil?: KejadianPresensi['hasil'];
  /** Tampilkan kolom pegawai. */
  denganPegawai?: boolean;
  className?: string;
}

export function useKejadianPresensi(f: { pegawaiId?: number | 'saya' | null; unitId?: number | null; dari?: string; sampai?: string; bertanda?: boolean; hasil?: string; page?: number; perPage?: number }) {
  const query = {
    pegawai_id: f.pegawaiId ?? undefined,
    unit_id: f.unitId ?? undefined,
    dari: f.dari,
    sampai: f.sampai,
    bertanda: f.bertanda ? 1 : undefined,
    hasil: f.hasil,
    page: f.page ?? 1,
    per_page: f.perPage ?? 50,
  };
  return useSiakadQuery<KejadianPresensi[]>(['sdm-presensi', 'kejadian', query], (s, signal) => s.request({ method: 'GET', path: `${P}/kejadian`, query }, { signal }), { staleTime: 10_000 });
}

/** Tabel percobaan presensi (diterima, ditolak beserta alasan, tinjau) dengan tanda curiga. */
export function RiwayatKejadianPresensi({ pegawaiId = 'saya', unitId, dari, sampai, bertanda, hasil, denganPegawai, className }: RiwayatKejadianPresensiProps) {
  const [hal, setHal] = React.useState(1);
  const [lihat, setLihat] = React.useState<KejadianPresensi | null>(null);
  const q = useKejadianPresensi({ pegawaiId, unitId, dari, sampai, bertanda, hasil, page: hal, perPage: 25 });
  return (
    <div className={className}>
      <DataTable<KejadianPresensi>
        columns={[
          { key: 'waktu', header: 'Waktu', mobile: 'title', cell: (k) => `${tgl(k.waktu)} ${jam(k.waktu)}` },
          ...(denganPegawai ? [{ key: 'pegawai_nama', header: 'Pegawai', mobile: 'subtitle' as const, cell: (k: KejadianPresensi) => k.pegawai_nama ?? '–' }] : []),
          { key: 'aksi', header: 'Aksi', shrink: true, cell: (k) => (k.aksi === 'masuk' ? 'Masuk' : 'Pulang') },
          { key: 'lokasi', header: 'Lokasi', cell: (k) => (k.lokasi ? `${k.lokasi.nama}${k.jarak_m != null ? ` · ${jarakTeks(k.jarak_m)}` : ''}` : k.posisi ? 'Tanpa area' : '–') },
          { key: 'akurasi', header: 'Akurasi', align: 'end', shrink: true, mobile: 'hidden', cell: (k) => (k.posisi?.akurasi_m != null ? `±${k.posisi.akurasi_m} m` : '–') },
          { key: 'tanda', header: 'Tanda', mobile: 'meta', cell: (k) => <TandaPresensi tanda={k.tanda} /> },
          { key: 'hasil', header: 'Hasil', shrink: true, mobile: 'badge', cell: (k) => <BadgeHasilPresensi hasil={k.hasil} /> },
        ]}
        rows={q.data}
        rowKey={(k) => k.id}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
        page={hal}
        perPage={25}
        total={q.meta?.total ?? undefined}
        onPageChange={setHal}
        onRowClick={setLihat}
        columnToggle={false}
        densityToggle={false}
        empty={{ title: bertanda ? 'Tidak ada presensi bertanda curiga' : 'Belum ada catatan presensi' }}
      />
      <Dialog open={!!lihat} onOpenChange={(o) => !o && setLihat(null)} title="Detail presensi" size="lg">
        {lihat && <DetailKejadianPresensi k={lihat} />}
      </Dialog>
    </div>
  );
}

export function DetailKejadianPresensi({ k }: { k: KejadianPresensi }) {
  return (
    <div className="u-pk-detail">
      {k.posisi && (
        <Peta
          tinggi={240}
          label="Posisi saat presensi"
          titik={[{ id: k.id, lat: k.posisi.lat, lng: k.posisi.lng, label: 'Posisi presensi', nada: k.hasil === 'diterima' ? 'sukses' : k.hasil === 'ditolak' ? 'bahaya' : 'peringatan' }]}
          posisi={k.posisi.akurasi_m ? { ...k.posisi } : null}
        />
      )}
      <DescriptionList
        items={[
          { label: 'Pegawai', value: k.pegawai_nama ?? '–' },
          { label: 'Waktu server', value: `${tgl(k.waktu)} ${k.waktu.slice(11, 19)}` },
          { label: 'Jam perangkat', value: k.waktu_perangkat ? k.waktu_perangkat.slice(11, 19) : '–' },
          { label: 'Aksi', value: k.aksi === 'masuk' ? 'Masuk' : 'Pulang' },
          { label: 'Hasil', value: <BadgeHasilPresensi hasil={k.hasil} /> },
          ...(k.alasan ? [{ label: 'Alasan ditolak', value: k.alasan }] : []),
          ...(k.catatan ? [{ label: 'Keterangan pegawai', value: k.catatan }] : []),
          { label: 'Lokasi terdekat', value: k.lokasi ? `${k.lokasi.nama}${k.jarak_m != null ? ` (${jarakTeks(k.jarak_m)}, ${k.dalam_area ? 'di dalam' : 'di luar'} area)` : ''}` : '–' },
          { label: 'Koordinat', value: k.posisi ? `${k.posisi.lat}, ${k.posisi.lng}${k.posisi.akurasi_m != null ? ` (±${k.posisi.akurasi_m} m)` : ''}` : '–' },
          { label: 'Perangkat', value: k.perangkat ? `${k.perangkat.nama ?? 'Tanpa nama'} (${k.perangkat.platform ?? '-'})` : '–' },
          { label: 'Sumber', value: k.sumber },
          { label: 'Tanda', value: k.tanda.length ? <TandaPresensi tanda={k.tanda} /> : 'Tidak ada' },
        ]}
      />
    </div>
  );
}

// ================================================================ Koreksi
export function FormKoreksiPresensi({ open, onOpenChange, tanggal: tanggalAwal, onSimpan }: { open: boolean; onOpenChange: (o: boolean) => void; tanggal?: string; onSimpan?: (k: KoreksiPresensi) => void }) {
  const siakad = useSiakad();
  const unggah = useUnggahBerkas({ modul: 'sdm' } as never);
  const awal = React.useCallback(() => ({ tanggal: tanggalAwal ?? hariIni(), jenis: 'lupa_pulang' as KoreksiPresensi['jenis'], masuk: '', pulang: '', alasan: '', berkas: null as { id: string; nama: string } | null }), [tanggalAwal]);
  const [f, setF] = React.useState(awal);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [unggahan, setUnggahan] = React.useState(false);
  React.useEffect(() => {
    if (open) {
      setF(awal());
      setGalat({});
    }
  }, [open, awal]);
  const butuhMasuk = f.jenis === 'lupa_masuk' || f.jenis === 'gangguan' || f.jenis === 'lainnya' || f.jenis === 'dinas_luar';
  const butuhPulang = f.jenis !== 'lupa_masuk';
  return (
    <PanelForm
      open={open}
      onOpenChange={onOpenChange}
      title="Ajukan koreksi presensi"
      description="Koreksi diputuskan atasan langsung atau petugas SDM unit Anda."
      size="md"
      labelSimpan="Ajukan"
      onSimpan={async () => {
        const err: Record<string, string> = {};
        if (f.jenis === 'lupa_masuk' && !f.masuk) err.masuk = 'Isi jam masuk yang benar.';
        if (f.jenis === 'lupa_pulang' && !f.pulang) err.pulang = 'Isi jam pulang yang benar.';
        if (f.alasan.trim().length < 5) err.alasan = 'Tulis alasan singkat.';
        setGalat(err);
        if (Object.keys(err).length) return false;
        try {
          const r = await siakad.request<KoreksiPresensi>({
            method: 'POST',
            path: `${P}/koreksi`,
            body: {
              tanggal: f.tanggal,
              jenis: f.jenis,
              jam_masuk: f.masuk ? `${f.tanggal} ${f.masuk}` : null,
              jam_pulang: f.pulang ? `${f.pulang < f.masuk ? tambahHari(f.tanggal) : f.tanggal} ${f.pulang}` : null,
              alasan: f.alasan.trim(),
              berkas_id: f.berkas?.id ?? null,
            },
          });
          invalidateSiakad('sdm-presensi');
          onSimpan?.(r.data);
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    >
      <div className="u-pk-form">
        <div className="u-pk-form-baris">
          <Field label="Tanggal" required>
            <IsianTanggal value={f.tanggal} onValueChange={(v) => v && setF((x) => ({ ...x, tanggal: v }))} />
          </Field>
          <Field label="Jenis koreksi" required>
            <Pilihan
              required
              tampilan="daftar"
              value={f.jenis}
              onValueChange={(v) => v && setF((x) => ({ ...x, jenis: v as KoreksiPresensi['jenis'] }))}
              options={(Object.keys(LABEL_JENIS_KOREKSI) as KoreksiPresensi['jenis'][]).filter((j) => j !== 'luar_area').map((j) => ({ value: j, label: LABEL_JENIS_KOREKSI[j] }))}
            />
          </Field>
        </div>
        <div className="u-pk-form-baris">
          {butuhMasuk && (
            <Field label="Jam masuk" required={f.jenis === 'lupa_masuk'} optional={f.jenis !== 'lupa_masuk'} error={galat.masuk}>
              <Input type="time" value={f.masuk} onChange={(e) => setF((x) => ({ ...x, masuk: e.target.value }))} />
            </Field>
          )}
          {butuhPulang && (
            <Field label="Jam pulang" required={f.jenis === 'lupa_pulang'} optional={f.jenis !== 'lupa_pulang'} error={galat.pulang} description="Lebih awal dari jam masuk = keesokan harinya (shift malam).">
              <Input type="time" value={f.pulang} onChange={(e) => setF((x) => ({ ...x, pulang: e.target.value }))} />
            </Field>
          )}
        </div>
        {f.jenis === 'dinas_luar' && <p className="u-pk-catatan-kecil">Kosongkan jam bila seharian dinas luar; hari itu dicatat sebagai dinas.</p>}
        <Field label="Alasan" required error={galat.alasan}>
          <Textarea rows={3} value={f.alasan} onChange={(e) => setF((x) => ({ ...x, alasan: e.target.value }))} placeholder="Mis. lupa presensi pulang karena baterai ponsel habis" />
        </Field>
        <Field label="Lampiran" optional description="Surat tugas, foto kegiatan, atau bukti lain.">
          <div className="u-pk-lampiran">
            <Button
              variant="outline"
              size="sm"
              loading={unggahan}
              onClick={() => {
                const i = document.createElement('input');
                i.type = 'file';
                i.accept = 'image/*,application/pdf';
                i.onchange = async () => {
                  const file = i.files?.[0];
                  if (!file) return;
                  setUnggahan(true);
                  try {
                    const b = await unggah(file);
                    setF((x) => ({ ...x, berkas: { id: b.id, nama: file.name } }));
                  } catch (e) {
                    setGalat((g) => ({ ...g, berkas: pesanGalat(e) }));
                  } finally {
                    setUnggahan(false);
                  }
                };
                i.click();
              }}
            >
              <Plus aria-hidden /> {f.berkas ? 'Ganti berkas' : 'Pilih berkas'}
            </Button>
            {f.berkas && <span>{f.berkas.nama}</span>}
            {galat.berkas && <span className="u-pk-galat">{galat.berkas}</span>}
          </div>
        </Field>
      </div>
    </PanelForm>
  );
}

function tambahHari(d: string): string {
  const x = new Date(`${d}T00:00:00`);
  x.setDate(x.getDate() + 1);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export function useKoreksiPresensi(sebagai: 'saya' | 'penyetuju' | 'semua', status?: string, page = 1) {
  const query = { sebagai, status, page, per_page: 25 };
  return useSiakadQuery<KoreksiPresensi[]>(['sdm-presensi', 'koreksi', query], (s, signal) => s.request({ method: 'GET', path: `${P}/koreksi`, query }, { signal }), { staleTime: 10_000 });
}

/**
 * Daftar koreksi: `saya` (pengajuan saya + tombol ajukan), `penyetuju` (menunggu keputusan saya, dengan setujui/tolak),
 * atau `semua` (yang boleh dilihat petugas).
 */
export function DaftarKoreksiPresensi({ sebagai = 'saya', className }: { sebagai?: 'saya' | 'penyetuju' | 'semua'; className?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [status, setStatus] = React.useState<string | undefined>(sebagai === 'penyetuju' ? 'diajukan' : undefined);
  const [hal, setHal] = React.useState(1);
  const q = useKoreksiPresensi(sebagai, status, hal);
  const [form, setForm] = React.useState(false);
  const [lihat, setLihat] = React.useState<KoreksiPresensi | null>(null);
  const [tolak, setTolak] = React.useState<KoreksiPresensi | null>(null);
  const [catatan, setCatatan] = React.useState('');
  const proses = async (k: KoreksiPresensi, aksi: 'setujui' | 'tolak' | 'batal', cat?: string) => {
    try {
      await siakad.request({ method: 'POST', path: `${P}/koreksi/${k.id}/${aksi}`, body: cat ? { catatan: cat } : {} });
      invalidateSiakad('sdm-presensi');
      toast.add({ title: aksi === 'setujui' ? 'Koreksi disetujui' : aksi === 'tolak' ? 'Koreksi ditolak' : 'Koreksi dibatalkan', type: 'success' });
      setLihat(null);
    } catch (e) {
      toast.add({ title: 'Belum tersimpan', description: pesanGalat(e), type: 'error' });
      throw e;
    }
  };
  return (
    <div className={cn('u-pk-stack', className)}>
      <DataTable<KoreksiPresensi>
        toolbar={
          <div className="u-pk-saring">
            <Pilihan
              tampilan="tombol"
              value={status ?? ''}
              onValueChange={(v) => {
                setStatus(v || undefined);
                setHal(1);
              }}
              options={[
                { value: '', label: 'Semua' },
                { value: 'diajukan', label: 'Menunggu' },
                { value: 'disetujui', label: 'Disetujui' },
                { value: 'ditolak', label: 'Ditolak' },
              ]}
            />
          </div>
        }
        actions={
          sebagai === 'saya' ? (
            <Button onClick={() => setForm(true)}>
              <Plus aria-hidden /> Ajukan koreksi
            </Button>
          ) : undefined
        }
        columns={[
          { key: 'tanggal', header: 'Tanggal', mobile: 'title', cell: (k) => tgl(k.tanggal) },
          ...(sebagai !== 'saya' ? [{ key: 'pegawai', header: 'Pegawai', mobile: 'subtitle' as const, cell: (k: KoreksiPresensi) => k.pegawai.nama ?? '–' }] : []),
          { key: 'jenis', header: 'Jenis', cell: (k) => LABEL_JENIS_KOREKSI[k.jenis] },
          { key: 'jam', header: 'Jam diajukan', cell: (k) => [k.jam_masuk && `masuk ${jam(k.jam_masuk)}`, k.jam_pulang && `pulang ${jam(k.jam_pulang)}`].filter(Boolean).join(', ') || '–' },
          { key: 'alasan', header: 'Alasan', mobile: 'meta', cell: (k) => <span className="u-pk-potong">{k.alasan}</span> },
          { key: 'status', header: 'Status', shrink: true, mobile: 'badge', cell: (k) => <Badge variant={LABEL_STATUS_KOREKSI[k.status][1]}>{LABEL_STATUS_KOREKSI[k.status][0]}</Badge> },
        ]}
        rows={q.data}
        rowKey={(k) => k.id}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
        page={hal}
        perPage={25}
        total={q.meta?.total ?? undefined}
        onPageChange={setHal}
        onRowClick={setLihat}
        rowActions={(k) => [
          ...(k.hak.putuskan
            ? [
                { label: 'Setujui', icon: <CheckCircle2 aria-hidden />, onSelect: () => void proses(k, 'setujui').catch(() => undefined) },
                { label: 'Tolak', icon: <XCircle aria-hidden />, onSelect: () => setTolak(k) },
              ]
            : []),
          ...(k.hak.batal ? [{ label: 'Batalkan', icon: <Ban aria-hidden />, destructive: true, onSelect: () => void proses(k, 'batal').catch(() => undefined) }] : []),
          { label: 'Lihat', icon: <History aria-hidden />, onSelect: () => setLihat(k) },
        ]}
        columnToggle={false}
        densityToggle={false}
        empty={{ title: sebagai === 'penyetuju' ? 'Tidak ada koreksi yang menunggu keputusan Anda' : 'Belum ada koreksi presensi' }}
      />
      <FormKoreksiPresensi open={form} onOpenChange={setForm} onSimpan={() => setForm(false)} />
      <Dialog open={!!lihat} onOpenChange={(o) => !o && setLihat(null)} title={lihat ? `${LABEL_JENIS_KOREKSI[lihat.jenis]} · ${tgl(lihat.tanggal)}` : ''} size="lg">
        {lihat && (
          <div className="u-pk-stack">
            <DescriptionList
              items={[
                { label: 'Pegawai', value: lihat.pegawai.nama ?? '–' },
                { label: 'Jam diajukan', value: [lihat.jam_masuk && `Masuk ${lihat.jam_masuk.slice(0, 16)}`, lihat.jam_pulang && `Pulang ${lihat.jam_pulang.slice(0, 16)}`].filter(Boolean).join(' · ') || 'Seharian (dinas)' },
                { label: 'Alasan', value: lihat.alasan },
                { label: 'Status', value: <Badge variant={LABEL_STATUS_KOREKSI[lihat.status][1]}>{LABEL_STATUS_KOREKSI[lihat.status][0]}</Badge> },
                ...(lihat.diputuskan_oleh ? [{ label: 'Diputuskan', value: `${lihat.diputuskan_oleh}, ${lihat.diputuskan_at?.slice(0, 16)}${lihat.catatan_keputusan ? ` — ${lihat.catatan_keputusan}` : ''}` }] : []),
              ]}
            />
            {lihat.kejadian && <DetailKejadianPresensi k={lihat.kejadian} />}
            {lihat.hak.putuskan && (
              <div className="u-pk-aksi">
                <Button onClick={() => void proses(lihat, 'setujui').catch(() => undefined)}>
                  <CheckCircle2 aria-hidden /> Setujui
                </Button>
                <Button variant="outline" onClick={() => setTolak(lihat)}>
                  <XCircle aria-hidden /> Tolak
                </Button>
              </div>
            )}
          </div>
        )}
      </Dialog>
      <ConfirmDialog
        open={!!tolak}
        onOpenChange={(o) => {
          if (!o) {
            setTolak(null);
            setCatatan('');
          }
        }}
        title="Tolak koreksi presensi?"
        description="Pegawai melihat catatan penolakan ini."
        confirmLabel="Tolak koreksi"
        onConfirm={async () => {
          if (!tolak) return;
          if (catatan.trim().length < 3) throw new Error('Tulis catatan penolakan.');
          await proses(tolak, 'tolak', catatan.trim());
          setCatatan('');
        }}
      >
        <Field label="Catatan" required>
          <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        </Field>
      </ConfirmDialog>
    </div>
  );
}

// ================================================================ Lokasi
export function useLokasiPresensiKerja(semua = false) {
  return useSiakadQuery<LokasiPresensiKerja[]>(['sdm-presensi', 'lokasi', semua], (s, signal) => s.request({ method: 'GET', path: `${P}/lokasi`, query: semua ? { semua: 1 } : {} }, { signal }));
}

export function FormLokasiPresensi({ open, onOpenChange, lokasi, semua, sumberUnit, onSimpan }: { open: boolean; onOpenChange: (o: boolean) => void; lokasi?: LokasiPresensiKerja | null; semua?: LokasiPresensiKerja[]; sumberUnit?: SumberEntitas; onSimpan?: () => void }) {
  const siakad = useSiakad();
  const awal = React.useCallback(
    () => ({
      kode: lokasi?.kode ?? '',
      nama: lokasi?.nama ?? '',
      kampus: lokasi?.kampus ?? '',
      alamat: lokasi?.alamat ?? '',
      unit_id: lokasi?.unit_id ?? null,
      titik: { lat: lokasi?.lat ?? null, lng: lokasi?.lng ?? null, radius_m: lokasi?.radius_m ?? 100 },
      aktif: lokasi?.aktif ?? true,
      keterangan: lokasi?.keterangan ?? '',
    }),
    [lokasi],
  );
  const [f, setF] = React.useState(awal);
  const [berubah, setBerubah] = React.useState(false);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (open) {
      setF(awal());
      setBerubah(false);
      setGalat({});
    }
  }, [open, awal]);
  const set = <K extends keyof ReturnType<typeof awal>>(k: K, v: ReturnType<typeof awal>[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setBerubah(true);
  };
  return (
    <PanelForm
      open={open}
      onOpenChange={onOpenChange}
      title={lokasi ? `Ubah ${lokasi.nama}` : 'Lokasi presensi baru'}
      description="Titik pusat dan radius area tempat pegawai boleh presensi."
      berubah={berubah}
      size="xl"
      onSimpan={async () => {
        const err: Record<string, string> = {};
        if (!f.nama.trim()) err.nama = 'Tulis nama lokasi.';
        if (!/^[A-Za-z0-9._-]{2,40}$/.test(f.kode)) err.kode = 'Huruf, angka, titik, atau garis; 2-40 karakter.';
        if (f.titik.lat == null || f.titik.lng == null) err.titik = 'Pilih titik di peta.';
        setGalat(err);
        if (Object.keys(err).length) return false;
        try {
          await siakad.request({
            method: 'POST',
            path: lokasi ? `${P}/lokasi/${lokasi.id}` : `${P}/lokasi`,
            body: { kode: f.kode, nama: f.nama.trim(), kampus: f.kampus || null, alamat: f.alamat || null, unit_id: f.unit_id, lat: f.titik.lat, lng: f.titik.lng, radius_m: f.titik.radius_m, aktif: f.aktif, keterangan: f.keterangan || null },
          });
          invalidateSiakad('sdm-presensi');
          onSimpan?.();
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    >
      <div className="u-pk-form">
        <Field label="Area di peta" required error={galat.titik}>
          <PilihTitikPeta
            value={f.titik}
            onChange={(v) => set('titik', v)}
            areaLain={(semua ?? []).filter((l) => l.id !== lokasi?.id).map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, radius_m: l.radius_m, label: l.nama }))}
            radiusMaks={2000}
            tinggi={320}
          />
        </Field>
        <div className="u-pk-form-baris">
          <Field label="Nama" required error={galat.nama}>
            <Input value={f.nama} onChange={(e) => set('nama', e.target.value)} placeholder="Mis. Kampus 1 – Gedung Rektorat" />
          </Field>
          <Field label="Kode" required error={galat.kode}>
            <Input value={f.kode} onChange={(e) => set('kode', e.target.value.toUpperCase())} placeholder="K1-REKTORAT" />
          </Field>
        </div>
        <div className="u-pk-form-baris">
          <Field label="Kampus" optional>
            <Input value={f.kampus} onChange={(e) => set('kampus', e.target.value)} placeholder="Kampus 1" />
          </Field>
          <Field label="Unit pemilik" optional description="Kosong = tingkat universitas (admin SDM).">
            {sumberUnit ? (
              <PilihEntitas jenis={sumberUnit} value={f.unit_id == null ? null : String(f.unit_id)} onValueChange={(v) => set('unit_id', v ? Number(v) : null)} />
            ) : (
              <Input type="number" value={f.unit_id ?? ''} onChange={(e) => set('unit_id', e.target.value ? Number(e.target.value) : null)} />
            )}
          </Field>
        </div>
        <Field label="Alamat" optional>
          <Input value={f.alamat} onChange={(e) => set('alamat', e.target.value)} />
        </Field>
        <Field label="Aktif" description="Lokasi nonaktif tidak dipakai saat presensi.">
          <Switch checked={f.aktif} onCheckedChange={(v) => set('aktif', v)} />
        </Field>
      </div>
    </PanelForm>
  );
}

/** Kelola lokasi presensi: peta semua area + daftar, tambah/ubah/hapus. */
export function KelolaLokasiPresensi({ sumberUnit, className }: { sumberUnit?: SumberEntitas; className?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useLokasiPresensiKerja(true);
  const [form, setForm] = React.useState<LokasiPresensiKerja | null | false>(false);
  const [hapus, setHapus] = React.useState<LokasiPresensiKerja | null>(null);
  const daftar = q.data ?? [];
  return (
    <div className={cn('u-pk-stack', className)}>
      <div className="u-pk-alat">
        <p className="u-pk-catatan-kecil">Pegawai hanya bisa presensi di dalam lingkaran area (bila kebijakannya mode area). Klik area di peta untuk mengubahnya.</p>
        <Button onClick={() => setForm(null)}>
          <Plus aria-hidden /> Lokasi baru
        </Button>
      </div>
      {q.loading && !q.data ? (
        <Skeleton style={{ height: 360 }} />
      ) : q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : daftar.length === 0 ? (
        <Empty
          bordered
          icon={<MapPin aria-hidden />}
          title="Belum ada lokasi presensi"
          description="Tandai area Kampus 1, Kampus 2, dan kantor lain di peta. Tanpa lokasi, presensi tidak dibatasi area."
          actions={
            <Button onClick={() => setForm(null)}>
              <Plus aria-hidden /> Tambah lokasi
            </Button>
          }
        />
      ) : (
        <div className="u-pk-dua">
          <Peta
            tinggi={420}
            label="Peta lokasi presensi"
            area={daftar.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, radius_m: l.radius_m, label: l.nama, keterangan: l.kampus ?? undefined, putus: !l.aktif, nada: l.aktif ? 'utama' : 'netral' }))}
            onPilihArea={(a: AreaPeta) => {
              const l = daftar.find((x) => x.id === a.id);
              if (l?.boleh_ubah) setForm(l);
            }}
          />
          <ul className="u-pk-daftar">
            {daftar.map((l) => (
              <li key={l.id} data-nonaktif={!l.aktif || undefined}>
                <div>
                  <p className="u-pk-daftar-judul">{l.nama}</p>
                  <p className="u-pk-daftar-meta">
                    {[l.kampus, l.kode, `radius ${l.radius_m} m`].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="u-pk-daftar-aksi">
                  {!l.aktif && <Badge>Nonaktif</Badge>}
                  {l.boleh_ubah && (
                    <Menu
                      trigger={
                        <Button size="xs" variant="ghost" iconOnly aria-label={`Aksi ${l.nama}`}>
                          <MoreHorizontal aria-hidden />
                        </Button>
                      }
                      items={[
                        { label: 'Ubah', icon: <Pencil aria-hidden />, onSelect: () => setForm(l) },
                        { type: 'separator' as const },
                        { label: 'Hapus', icon: <Trash2 aria-hidden />, destructive: true, onSelect: () => setHapus(l) },
                      ]}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <FormLokasiPresensi open={form !== false} onOpenChange={(o) => !o && setForm(false)} lokasi={form || null} semua={daftar} sumberUnit={sumberUnit} onSimpan={() => setForm(false)} />
      <ConfirmDialog
        open={!!hapus}
        onOpenChange={(o) => !o && setHapus(null)}
        title={`Hapus ${hapus?.nama ?? ''}?`}
        description="Kebijakan yang memilih lokasi ini tidak lagi memakainya. Riwayat presensi tetap tersimpan."
        confirmLabel="Hapus lokasi"
        onConfirm={async () => {
          if (!hapus) return;
          await siakad.request({ method: 'POST', path: `${P}/lokasi/${hapus.id}/hapus` });
          invalidateSiakad('sdm-presensi');
          toast.add({ title: `${hapus.nama} dihapus`, type: 'success' });
        }}
      />
    </div>
  );
}

// ================================================================ Jadwal kerja / shift
export function useJadwalKerja(semua = false) {
  return useSiakadQuery<{ bawaan: { kode: string; nama: string; hari: JadwalKerja['hari']; toleransi_terlambat_menit: number }; jadwal: JadwalKerja[] }>(['sdm-presensi', 'jadwal', semua], (s, signal) =>
    s.request({ method: 'GET', path: `${P}/jadwal`, query: semua ? { semua: 1 } : {} }, { signal }),
  );
}

const ringkasHari = (h: JadwalKerja['hari']) => {
  const g = new Map<string, number[]>();
  Object.entries(h).forEach(([d, j]) => {
    const k = `${j.masuk}–${j.pulang}`;
    g.set(k, [...(g.get(k) ?? []), Number(d)]);
  });
  return [...g.entries()].map(([k, ds]) => `${ds.length > 2 && ds[ds.length - 1] - ds[0] === ds.length - 1 ? `${NAMA_HARI[ds[0]]}–${NAMA_HARI[ds[ds.length - 1]]}` : ds.map((d) => NAMA_HARI[d].slice(0, 3)).join(', ')} ${k}`).join(' · ') || 'Tanpa hari kerja';
};

export function FormJadwalKerja({ open, onOpenChange, jadwal, onSimpan }: { open: boolean; onOpenChange: (o: boolean) => void; jadwal?: JadwalKerja | null; onSimpan?: () => void }) {
  const siakad = useSiakad();
  const awal = React.useCallback(
    () => ({
      kode: jadwal?.kode ?? '',
      nama: jadwal?.nama ?? '',
      hari: Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [String(d), jadwal ? (jadwal.hari[String(d)] ?? null) : d <= 5 ? { masuk: '07:30', pulang: d === 5 ? '16:30' : '16:00' } : null])) as Record<string, { masuk: string; pulang: string } | null>,
      toleransi: String(jadwal?.toleransi_terlambat_menit ?? 15),
      buka: String(jadwal?.buka_masuk_menit ?? 120),
      batas: jadwal?.batas_masuk_menit == null ? '' : String(jadwal.batas_masuk_menit),
      tutup: String(jadwal?.tutup_pulang_menit ?? 360),
      lintas: jadwal?.lintas_hari ?? false,
      libur: jadwal?.ikut_hari_libur ?? false,
      aktif: jadwal?.aktif ?? true,
    }),
    [jadwal],
  );
  const [f, setF] = React.useState(awal);
  const [berubah, setBerubah] = React.useState(false);
  React.useEffect(() => {
    if (open) {
      setF(awal());
      setBerubah(false);
    }
  }, [open, awal]);
  const set = <K extends keyof ReturnType<typeof awal>>(k: K, v: ReturnType<typeof awal>[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setBerubah(true);
  };
  const setHari = (d: string, v: { masuk: string; pulang: string } | null) => set('hari', { ...f.hari, [d]: v });
  return (
    <PanelForm
      open={open}
      onOpenChange={onOpenChange}
      title={jadwal ? `Ubah ${jadwal.nama}` : 'Jadwal kerja baru'}
      description="Jam kerja per hari. Hari yang tidak dicentang dianggap libur."
      berubah={berubah}
      onSimpan={async () => {
        const hari = Object.fromEntries(Object.entries(f.hari).filter(([, v]) => v)) as Record<string, { masuk: string; pulang: string }>;
        if (!f.nama.trim() || !/^[A-Za-z0-9._-]{2,40}$/.test(f.kode)) return 'Isi nama dan kode (huruf, angka, titik, garis).';
        if (!Object.keys(hari).length) return 'Centang minimal satu hari kerja.';
        try {
          await siakad.request({
            method: 'POST',
            path: jadwal ? `${P}/jadwal/${jadwal.id}` : `${P}/jadwal`,
            body: { kode: f.kode, nama: f.nama.trim(), hari, toleransi_terlambat_menit: Number(f.toleransi) || 0, buka_masuk_menit: Number(f.buka) || 0, batas_masuk_menit: f.batas === '' ? null : Number(f.batas), tutup_pulang_menit: Number(f.tutup) || 0, lintas_hari: f.lintas, ikut_hari_libur: f.libur, aktif: f.aktif },
          });
          invalidateSiakad('sdm-presensi');
          onSimpan?.();
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    >
      <div className="u-pk-form">
        <div className="u-pk-form-baris">
          <Field label="Nama" required>
            <Input value={f.nama} onChange={(e) => set('nama', e.target.value)} placeholder="Mis. Shift malam satpam" />
          </Field>
          <Field label="Kode" required>
            <Input value={f.kode} onChange={(e) => set('kode', e.target.value.toUpperCase())} placeholder="SHIFT-MALAM" />
          </Field>
        </div>
        <fieldset className="u-pk-hari">
          <legend>Jam kerja per hari</legend>
          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const v = f.hari[String(d)];
            return (
              <div key={d} className="u-pk-hari-baris" data-libur={!v || undefined}>
                <Switch checked={!!v} onCheckedChange={(on) => setHari(String(d), on ? (v ?? { masuk: '07:30', pulang: '16:00' }) : null)} aria-label={`${NAMA_HARI[d]} hari kerja`} />
                <span className="u-pk-hari-nama">{NAMA_HARI[d]}</span>
                {v ? (
                  <>
                    <Input type="time" aria-label={`Masuk ${NAMA_HARI[d]}`} value={v.masuk} onChange={(e) => setHari(String(d), { ...v, masuk: e.target.value })} />
                    <span aria-hidden>–</span>
                    <Input type="time" aria-label={`Pulang ${NAMA_HARI[d]}`} value={v.pulang} onChange={(e) => setHari(String(d), { ...v, pulang: e.target.value })} />
                  </>
                ) : (
                  <span className="u-pk-catatan-kecil">Libur</span>
                )}
              </div>
            );
          })}
        </fieldset>
        <Field label="Shift malam" description="Jam pulang jatuh di hari berikutnya (mis. 22.00–06.00).">
          <Switch checked={f.lintas} onCheckedChange={(v) => set('lintas', v)} />
        </Field>
        <div className="u-pk-form-baris">
          <Field label="Toleransi terlambat (menit)">
            <Input type="number" min={0} max={600} value={f.toleransi} onChange={(e) => set('toleransi', e.target.value)} />
          </Field>
          <Field label="Masuk dibuka (menit sebelum)">
            <Input type="number" min={0} max={720} value={f.buka} onChange={(e) => set('buka', e.target.value)} />
          </Field>
        </div>
        <div className="u-pk-form-baris">
          <Field label="Batas masuk (menit sesudah)" optional description="Kosong = boleh masuk sampai jam pulang.">
            <Input type="number" min={0} max={1440} value={f.batas} onChange={(e) => set('batas', e.target.value)} />
          </Field>
          <Field label="Pulang ditutup (menit sesudah)">
            <Input type="number" min={0} max={1440} value={f.tutup} onChange={(e) => set('tutup', e.target.value)} />
          </Field>
        </div>
        <Field label="Tetap masuk saat libur nasional" description="Mis. satpam, petugas jaga.">
          <Switch checked={f.libur} onCheckedChange={(v) => set('libur', v)} />
        </Field>
        <Field label="Aktif">
          <Switch checked={f.aktif} onCheckedChange={(v) => set('aktif', v)} />
        </Field>
      </div>
    </PanelForm>
  );
}

/** Kelola jadwal kerja dan shift. */
export function KelolaJadwalKerja({ className }: { className?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useJadwalKerja(true);
  const [form, setForm] = React.useState<JadwalKerja | null | false>(false);
  const b = q.data?.bawaan;
  return (
    <div className={cn('u-pk-stack', className)}>
      <div className="u-pk-alat">
        <p className="u-pk-catatan-kecil">Jadwal dipasang ke pegawai lewat kebijakan presensi. Tanpa kebijakan, pegawai memakai jadwal bawaan dari Pengaturan.</p>
        <Button onClick={() => setForm(null)}>
          <Plus aria-hidden /> Jadwal baru
        </Button>
      </div>
      {b && (
        <Card variant="muted">
          <CardHeader title={b.nama} description={`${ringkasHari(b.hari)} · toleransi ${b.toleransi_terlambat_menit} menit`} action={<Badge>Bawaan</Badge>} />
        </Card>
      )}
      {q.loading && !q.data ? (
        <Skeleton style={{ height: 160 }} />
      ) : q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} />
      ) : (
        <ul className="u-pk-daftar">
          {(q.data?.jadwal ?? []).map((j) => (
            <li key={j.id} data-nonaktif={!j.aktif || undefined}>
              <div>
                <p className="u-pk-daftar-judul">
                  {j.nama} {j.lintas_hari && <Badge variant="info">Shift malam</Badge>}
                </p>
                <p className="u-pk-daftar-meta">
                  {ringkasHari(j.hari)} · toleransi {j.toleransi_terlambat_menit} mnt{j.batas_masuk_menit != null ? ` · batas masuk +${j.batas_masuk_menit} mnt` : ''}
                </p>
              </div>
              <div className="u-pk-daftar-aksi">
                {!j.aktif && <Badge>Nonaktif</Badge>}
                {j.boleh_ubah && (
                  <Menu
                    trigger={
                      <Button size="xs" variant="ghost" iconOnly aria-label={`Aksi ${j.nama}`}>
                        <MoreHorizontal aria-hidden />
                      </Button>
                    }
                    items={[
                      { label: 'Ubah', icon: <Pencil aria-hidden />, onSelect: () => setForm(j) },
                      { type: 'separator' as const },
                      {
                        label: 'Hapus',
                        icon: <Trash2 aria-hidden />,
                        destructive: true,
                        onSelect: async () => {
                          try {
                            await siakad.request({ method: 'POST', path: `${P}/jadwal/${j.id}/hapus` });
                            invalidateSiakad('sdm-presensi');
                            toast.add({ title: `${j.nama} dihapus`, type: 'success' });
                          } catch (e) {
                            toast.add({ title: 'Belum terhapus', description: pesanGalat(e), type: 'error' });
                          }
                        },
                      },
                    ]}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <FormJadwalKerja open={form !== false} onOpenChange={(o) => !o && setForm(false)} jadwal={form || null} onSimpan={() => setForm(false)} />
    </div>
  );
}

// ================================================================ Kebijakan
export function useKebijakanPresensi() {
  return useSiakadQuery<KebijakanPresensi[]>(['sdm-presensi', 'kebijakan'], (s, signal) => s.request({ method: 'GET', path: `${P}/kebijakan` }, { signal }));
}

const LABEL_CAKUPAN: Record<KebijakanPresensi['cakupan'], string> = { semua: 'Semua pegawai', jenis: 'Jenis pegawai', unit: 'Unit dan turunannya', pegawai: 'Satu pegawai' };

export function FormKebijakanPresensi({ open, onOpenChange, kebijakan, sumberUnit, sumberPegawai, onSimpan }: { open: boolean; onOpenChange: (o: boolean) => void; kebijakan?: KebijakanPresensi | null; sumberUnit?: SumberEntitas; sumberPegawai?: SumberEntitas | 'pegawai'; onSimpan?: () => void }) {
  const siakad = useSiakad();
  const lok = useLokasiPresensiKerja();
  const jad = useJadwalKerja();
  const awal = React.useCallback(
    () => ({
      nama: kebijakan?.nama ?? '',
      cakupan: kebijakan?.cakupan ?? 'unit',
      jenis_pegawai: kebijakan?.jenis_pegawai ?? 'tendik',
      unit_id: kebijakan?.unit?.id ?? null,
      pegawai_id: kebijakan?.pegawai?.id ?? null,
      jadwal_id: kebijakan?.jadwal?.id ?? '',
      mode_lokasi: kebijakan?.mode_lokasi ?? 'area',
      lokasi_ids: kebijakan?.lokasi.map((l) => l.id) ?? [],
      luar_area: kebijakan?.luar_area ?? 'tolak',
      wajib_foto: kebijakan?.wajib_foto ?? false,
      akurasi_maks_m: String(kebijakan?.akurasi_maks_m ?? 100),
      tolak_lokasi_palsu: kebijakan?.tolak_lokasi_palsu ?? true,
      perangkat_maks: String(kebijakan?.perangkat_maks ?? 0),
      berlaku_mulai: kebijakan?.berlaku_mulai ?? null,
      berlaku_selesai: kebijakan?.berlaku_selesai ?? null,
      aktif: kebijakan?.aktif ?? true,
    }),
    [kebijakan],
  );
  const [f, setF] = React.useState(awal);
  const [berubah, setBerubah] = React.useState(false);
  React.useEffect(() => {
    if (open) {
      setF(awal());
      setBerubah(false);
    }
  }, [open, awal]);
  const set = <K extends keyof ReturnType<typeof awal>>(k: K, v: ReturnType<typeof awal>[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setBerubah(true);
  };
  const lokasi = lok.data ?? [];
  const terpilih = f.lokasi_ids.length ? lokasi.filter((l) => f.lokasi_ids.includes(l.id)) : lokasi;
  return (
    <PanelForm
      open={open}
      onOpenChange={onOpenChange}
      title={kebijakan ? `Ubah ${kebijakan.nama}` : 'Kebijakan presensi baru'}
      description="Berlaku untuk cakupan yang dipilih. Yang paling spesifik menang: pegawai, lalu unit terdekat, jenis, lalu semua."
      berubah={berubah}
      size="xl"
      onSimpan={async () => {
        if (!f.nama.trim()) return 'Tulis nama kebijakan.';
        if (f.cakupan === 'unit' && !f.unit_id) return 'Pilih unit.';
        if (f.cakupan === 'pegawai' && !f.pegawai_id) return 'Pilih pegawai.';
        try {
          await siakad.request({
            method: 'POST',
            path: kebijakan ? `${P}/kebijakan/${kebijakan.id}` : `${P}/kebijakan`,
            body: {
              ...f,
              nama: f.nama.trim(),
              jadwal_id: f.jadwal_id || null,
              akurasi_maks_m: Number(f.akurasi_maks_m) || 100,
              perangkat_maks: Number(f.perangkat_maks) || 0,
            },
          });
          invalidateSiakad('sdm-presensi');
          onSimpan?.();
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    >
      <div className="u-pk-form">
        <Field label="Nama" required>
          <Input value={f.nama} onChange={(e) => set('nama', e.target.value)} placeholder="Mis. Tendik BAAK: wajib di Kampus 1" />
        </Field>
        <Field label="Berlaku untuk" required>
          <Pilihan required tampilan="tombol" value={f.cakupan} onValueChange={(v) => v && set('cakupan', v as KebijakanPresensi['cakupan'])} options={(Object.keys(LABEL_CAKUPAN) as KebijakanPresensi['cakupan'][]).map((k) => ({ value: k, label: LABEL_CAKUPAN[k] }))} />
        </Field>
        {f.cakupan === 'jenis' && (
          <Field label="Jenis pegawai" required>
            <Pilihan required tampilan="tombol" value={f.jenis_pegawai} onValueChange={(v) => v && set('jenis_pegawai', v as 'dosen' | 'tendik')} options={[{ value: 'dosen', label: 'Dosen' }, { value: 'tendik', label: 'Tendik' }]} />
          </Field>
        )}
        {f.cakupan === 'unit' && (
          <Field label="Unit" required>
            {sumberUnit ? <PilihEntitas jenis={sumberUnit} value={f.unit_id == null ? null : String(f.unit_id)} onValueChange={(v) => set('unit_id', v ? Number(v) : null)} /> : <Input type="number" value={f.unit_id ?? ''} onChange={(e) => set('unit_id', e.target.value ? Number(e.target.value) : null)} />}
          </Field>
        )}
        {f.cakupan === 'pegawai' && (
          <Field label="Pegawai" required>
            <PilihEntitas jenis={sumberPegawai ?? 'pegawai'} value={f.pegawai_id == null ? null : String(f.pegawai_id)} onValueChange={(v) => set('pegawai_id', v ? Number(v) : null)} />
          </Field>
        )}
        <Field label="Jadwal kerja">
          <Pilihan tampilan="daftar" value={f.jadwal_id} onValueChange={(v) => set('jadwal_id', v ?? '')} options={[{ value: '', label: 'Jadwal bawaan (Pengaturan)' }, ...(jad.data?.jadwal ?? []).map((j) => ({ value: j.id, label: j.nama }))]} />
        </Field>
        <Field label="Lokasi" description="Wajib di area: presensi hanya dari dalam lingkaran lokasi. Bebas: untuk WFH atau tugas lapangan, lokasi hanya dicatat.">
          <Pilihan required tampilan="tombol" value={f.mode_lokasi} onValueChange={(v) => v && set('mode_lokasi', v as 'area' | 'bebas')} options={[{ value: 'area', label: 'Wajib di area' }, { value: 'bebas', label: 'Bebas (dicatat saja)' }]} />
        </Field>
        {f.mode_lokasi === 'area' && (
          <>
            <Field label="Area yang berlaku" description="Tidak dipilih = semua lokasi aktif.">
              <div className="u-pk-pilih-lokasi">
                {lokasi.map((l) => (
                  <label key={l.id}>
                    <input type="checkbox" checked={f.lokasi_ids.includes(l.id)} onChange={(e) => set('lokasi_ids', e.target.checked ? [...f.lokasi_ids, l.id] : f.lokasi_ids.filter((x) => x !== l.id))} />
                    {l.nama}
                  </label>
                ))}
              </div>
            </Field>
            {terpilih.length > 0 && <Peta tinggi={220} label="Area kebijakan" area={terpilih.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, radius_m: l.radius_m, label: l.nama }))} />}
            <Field label="Bila di luar area">
              <Pilihan required tampilan="tombol" value={f.luar_area} onValueChange={(v) => v && set('luar_area', v as 'tolak' | 'tinjau')} options={[{ value: 'tolak', label: 'Tolak' }, { value: 'tinjau', label: 'Boleh dengan alasan, ditinjau atasan' }]} />
            </Field>
          </>
        )}
        <div className="u-pk-form-baris">
          <Field label="Akurasi GPS maksimal (meter)" description="Posisi yang lebih kasar ditolak.">
            <Input type="number" min={5} max={5000} value={f.akurasi_maks_m} onChange={(e) => set('akurasi_maks_m', e.target.value)} />
          </Field>
          <Field label="Batas perangkat per pegawai" description="0 = tanpa batas.">
            <Input type="number" min={0} max={20} value={f.perangkat_maks} onChange={(e) => set('perangkat_maks', e.target.value)} />
          </Field>
        </div>
        <Field label="Wajib swafoto">
          <Switch checked={f.wajib_foto} onCheckedChange={(v) => set('wajib_foto', v)} />
        </Field>
        <Field label="Tolak lokasi palsu" description="Aplikasi mobile melaporkan mock location dari sistem operasi.">
          <Switch checked={f.tolak_lokasi_palsu} onCheckedChange={(v) => set('tolak_lokasi_palsu', v)} />
        </Field>
        <div className="u-pk-form-baris">
          <Field label="Berlaku mulai" optional>
            <IsianTanggal value={f.berlaku_mulai} onValueChange={(v) => set('berlaku_mulai', v ?? null)} />
          </Field>
          <Field label="Berlaku sampai" optional>
            <IsianTanggal value={f.berlaku_selesai} onValueChange={(v) => set('berlaku_selesai', v ?? null)} />
          </Field>
        </div>
        <Field label="Aktif">
          <Switch checked={f.aktif} onCheckedChange={(v) => set('aktif', v)} />
        </Field>
      </div>
    </PanelForm>
  );
}

/** Kelola kebijakan presensi per cakupan. */
export function KelolaKebijakanPresensi({ sumberUnit, sumberPegawai, className }: { sumberUnit?: SumberEntitas; sumberPegawai?: SumberEntitas | 'pegawai'; className?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useKebijakanPresensi();
  const [form, setForm] = React.useState<KebijakanPresensi | null | false>(false);
  return (
    <div className={cn('u-pk-stack', className)}>
      <div className="u-pk-alat">
        <p className="u-pk-catatan-kecil">Tanpa kebijakan, pegawai memakai jadwal bawaan dan wajib di salah satu lokasi aktif.</p>
        <Button onClick={() => setForm(null)}>
          <Plus aria-hidden /> Kebijakan baru
        </Button>
      </div>
      <DataTable<KebijakanPresensi>
        columns={[
          { key: 'nama', header: 'Kebijakan', mobile: 'title', cell: (k) => <strong>{k.nama}</strong> },
          { key: 'cakupan', header: 'Berlaku untuk', mobile: 'subtitle', cell: (k) => (k.cakupan === 'unit' ? k.unit?.nama : k.cakupan === 'pegawai' ? k.pegawai?.nama : k.cakupan === 'jenis' ? (k.jenis_pegawai === 'dosen' ? 'Semua dosen' : 'Semua tendik') : 'Semua pegawai') ?? '–' },
          { key: 'jadwal', header: 'Jadwal', cell: (k) => k.jadwal?.nama ?? 'Bawaan' },
          { key: 'lokasi', header: 'Lokasi', cell: (k) => (k.mode_lokasi === 'bebas' ? 'Bebas' : k.lokasi.length ? k.lokasi.map((l) => l.nama).join(', ') : 'Semua lokasi') + (k.mode_lokasi === 'area' && k.luar_area === 'tinjau' ? ' (luar area ditinjau)' : '') },
          { key: 'syarat', header: 'Syarat', mobile: 'meta', cell: (k) => [`GPS ≤${k.akurasi_maks_m} m`, k.wajib_foto && 'swafoto', k.perangkat_maks ? `${k.perangkat_maks} perangkat` : null].filter(Boolean).join(' · ') },
          { key: 'aktif', header: 'Status', shrink: true, mobile: 'badge', cell: (k) => <Badge variant={k.aktif ? 'success' : 'neutral'}>{k.aktif ? 'Aktif' : 'Nonaktif'}</Badge> },
        ]}
        rows={q.data}
        rowKey={(k) => k.id}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
        onRowClick={(k) => k.boleh_ubah && setForm(k)}
        rowActions={(k) =>
          k.boleh_ubah
            ? [
                { label: 'Ubah', icon: <Pencil aria-hidden />, onSelect: () => setForm(k) },
                {
                  label: 'Hapus',
                  icon: <Trash2 aria-hidden />,
                  destructive: true,
                  onSelect: async () => {
                    try {
                      await siakad.request({ method: 'POST', path: `${P}/kebijakan/${k.id}/hapus` });
                      invalidateSiakad('sdm-presensi');
                      toast.add({ title: `${k.nama} dihapus`, type: 'success' });
                    } catch (e) {
                      toast.add({ title: 'Belum terhapus', description: pesanGalat(e), type: 'error' });
                    }
                  },
                },
              ]
            : []
        }
        columnToggle={false}
        empty={{ title: 'Belum ada kebijakan presensi', description: 'Semua pegawai memakai aturan bawaan.' }}
      />
      <FormKebijakanPresensi open={form !== false} onOpenChange={(o) => !o && setForm(false)} kebijakan={form || null} sumberUnit={sumberUnit} sumberPegawai={sumberPegawai} onSimpan={() => setForm(false)} />
    </div>
  );
}

// ================================================================ Pantau (petugas)
/** Peta sebaran presensi satu tanggal + daftar, saring bertanda curiga. Untuk petugas SDM dan pimpinan unit. */
export function PantauPresensiKerja({ unitId, className }: { unitId?: number | null; className?: string }) {
  const [tanggal, setTanggal] = React.useState(hariIni());
  const [bertanda, setBertanda] = React.useState(false);
  const lok = useLokasiPresensiKerja();
  const q = useKejadianPresensi({ pegawaiId: null, unitId, dari: tanggal, sampai: tanggal, bertanda, perPage: 500 });
  const [lihat, setLihat] = React.useState<KejadianPresensi | null>(null);
  const daftar = q.data ?? [];
  const n = { diterima: 0, ditolak: 0, tinjau: 0, tanda: 0 };
  daftar.forEach((k) => {
    if (k.hasil in n) n[k.hasil as 'diterima' | 'ditolak' | 'tinjau']++;
    if (k.tanda.length) n.tanda++;
  });
  const titik: TitikPeta[] = daftar
    .filter((k) => k.posisi)
    .map((k) => ({
      id: k.id,
      lat: k.posisi!.lat,
      lng: k.posisi!.lng,
      label: `${k.pegawai_nama ?? ''} · ${k.aksi} ${jam(k.waktu)}`,
      keterangan: [LABEL_HASIL[k.hasil][0], k.alasan, ...k.tanda.map((t) => LABEL_TANDA_PRESENSI[t] ?? t)].filter(Boolean).join(' · '),
      nada: k.hasil === 'ditolak' ? 'bahaya' : k.hasil === 'tinjau' || k.tanda.length ? 'peringatan' : 'sukses',
    }));
  return (
    <div className={cn('u-pk-stack', className)}>
      <div className="u-pk-alat">
        <div className="u-pk-saring">
          <IsianTanggal value={tanggal} onValueChange={(v) => v && setTanggal(v)} />
          <label className="u-pk-saklar">
            <Switch checked={bertanda} onCheckedChange={setBertanda} /> Hanya bertanda curiga
          </label>
        </div>
        <div className="u-pk-hitung">
          <Badge variant="success">{n.diterima} diterima</Badge>
          <Badge variant="warning">{n.tinjau} ditinjau</Badge>
          <Badge variant="danger">{n.ditolak} ditolak</Badge>
          <Badge variant="info">
            <ShieldAlert aria-hidden /> {n.tanda} bertanda
          </Badge>
        </div>
      </div>
      <Peta
        tinggi={380}
        label="Peta sebaran presensi"
        area={(lok.data ?? []).map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, radius_m: l.radius_m, label: l.nama, nada: 'utama' }))}
        titik={titik}
        onPilihTitik={(t) => setLihat(daftar.find((k) => k.id === t.id) ?? null)}
      />
      <DataTable<KejadianPresensi>
        columns={[
          { key: 'waktu', header: 'Jam', shrink: true, cell: (k) => jam(k.waktu) },
          { key: 'pegawai_nama', header: 'Pegawai', mobile: 'title', cell: (k) => k.pegawai_nama ?? '–' },
          { key: 'aksi', header: 'Aksi', shrink: true, cell: (k) => (k.aksi === 'masuk' ? 'Masuk' : 'Pulang') },
          { key: 'lokasi', header: 'Lokasi', cell: (k) => (k.lokasi ? `${k.lokasi.nama}${k.jarak_m != null ? ` · ${jarakTeks(k.jarak_m)}` : ''}` : '–') },
          { key: 'tanda', header: 'Tanda / alasan', mobile: 'meta', cell: (k) => (k.alasan ? <span className="u-pk-potong">{k.alasan}</span> : <TandaPresensi tanda={k.tanda} />) },
          { key: 'hasil', header: 'Hasil', shrink: true, mobile: 'badge', cell: (k) => <BadgeHasilPresensi hasil={k.hasil} /> },
        ]}
        rows={daftar}
        rowKey={(k) => k.id}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
        onRowClick={setLihat}
        exportCsv
        columnToggle={false}
        empty={{ title: 'Belum ada presensi pada tanggal ini' }}
      />
      <Dialog open={!!lihat} onOpenChange={(o) => !o && setLihat(null)} title="Detail presensi" size="lg">
        {lihat && <DetailKejadianPresensi k={lihat} />}
      </Dialog>
    </div>
  );
}

// ================================================================ Perangkat
export function PerangkatPresensiSaya({ pegawaiId, className }: { /** Kosong = perangkat saya; isi untuk petugas. */ pegawaiId?: number; className?: string }) {
  const siakad = useSiakad();
  const toast = useToast();
  const query = { pegawai_id: pegawaiId, perangkat_id: pegawaiId ? undefined : idPerangkatPresensi() };
  const q = useSiakadQuery<PerangkatPresensiKerja[]>(['sdm-presensi', 'perangkat', query], (s, signal) => s.request({ method: 'GET', path: `${P}/perangkat`, query }, { signal }));
  const ubah = async (d: PerangkatPresensiKerja, aksi: 'lepas' | 'blokir' | 'aktifkan') => {
    try {
      await siakad.request({ method: 'POST', path: `${P}/perangkat/${d.id}/${aksi}`, body: {} });
      invalidateSiakad('sdm-presensi');
      toast.add({ title: aksi === 'lepas' ? 'Perangkat dilepas' : aksi === 'blokir' ? 'Perangkat diblokir' : 'Perangkat diaktifkan', type: 'success' });
    } catch (e) {
      toast.add({ title: 'Belum tersimpan', description: pesanGalat(e), type: 'error' });
    }
  };
  if (q.loading && !q.data) return <Skeleton style={{ height: 120 }} />;
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  const daftar = q.data ?? [];
  if (!daftar.length) return <Empty bordered icon={<Smartphone aria-hidden />} title="Belum ada perangkat" description="Perangkat terdaftar otomatis saat presensi pertama." />;
  return (
    <ul className={cn('u-pk-daftar', className)}>
      {daftar.map((d) => (
        <li key={d.id} data-nonaktif={d.status !== 'aktif' || undefined}>
          <div>
            <p className="u-pk-daftar-judul">
              <Smartphone aria-hidden /> {d.nama ?? 'Tanpa nama'} {d.perangkat_ini && <Badge variant="primary">Perangkat ini</Badge>}
            </p>
            <p className="u-pk-daftar-meta">
              {d.platform} · terakhir {d.terakhir_at ? `${tgl(d.terakhir_at)} ${jam(d.terakhir_at)}` : '–'}
            </p>
          </div>
          <div className="u-pk-daftar-aksi">
            <Badge variant={d.status === 'aktif' ? 'success' : d.status === 'diblokir' ? 'danger' : 'neutral'}>{d.status === 'aktif' ? 'Aktif' : d.status === 'diblokir' ? 'Diblokir' : 'Dilepas'}</Badge>
            <Menu
              trigger={
                <Button size="xs" variant="ghost" iconOnly aria-label={`Aksi ${d.nama ?? 'perangkat'}`}>
                  <MoreHorizontal aria-hidden />
                </Button>
              }
              items={[
                ...(d.status === 'aktif' ? [{ label: 'Lepas', icon: <Unlink aria-hidden />, onSelect: () => void ubah(d, 'lepas') }] : []),
                ...(pegawaiId && d.status !== 'diblokir' ? [{ label: 'Blokir', icon: <Ban aria-hidden />, destructive: true, onSelect: () => void ubah(d, 'blokir') }] : []),
                ...(pegawaiId && d.status !== 'aktif' ? [{ label: 'Aktifkan', icon: <CheckCircle2 aria-hidden />, onSelect: () => void ubah(d, 'aktifkan') }] : []),
              ]}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ================================================================ Modul lengkap
/** Halaman presensi kerja pegawai lengkap: presensi hari ini, riwayat, koreksi, perangkat. */
export function ModulPresensiKerja({ className }: { className?: string }) {
  const [tab, setTab] = React.useState<'hari-ini' | 'riwayat' | 'koreksi' | 'perangkat'>('hari-ini');
  return (
    <Tabs
      className={className}
      value={tab}
      onValueChange={setTab}
      items={[
        { value: 'hari-ini', label: 'Hari ini', content: <PresensiKerjaSaya onKoreksi={() => setTab('koreksi')} /> },
        { value: 'riwayat', label: 'Riwayat', content: <RiwayatKejadianPresensi /> },
        { value: 'koreksi', label: 'Koreksi', content: <DaftarKoreksiPresensi sebagai="saya" /> },
        { value: 'perangkat', label: 'Perangkat', content: <PerangkatPresensiSaya /> },
      ]}
    />
  );
}

export { Clock as IkonPresensiKerja };
