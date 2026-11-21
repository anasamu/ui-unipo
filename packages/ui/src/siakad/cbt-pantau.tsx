'use client';
import * as React from 'react';
import { AlertTriangle, Ban, Clock, KeyRound, Laptop, Lock, PlayCircle, RefreshCw, Search, Unlock } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatRelative, formatTime } from '../lib/format';
import { Badge, Button, Skeleton, type BadgeVariant } from '../components/actions';
import { Alert, Empty, Progress } from '../components/display';
import { Input, SegmentedControl, Textarea } from '../components/forms';
import { ConfirmDialog } from '../components/overlays';
import { invalidateSiakad, pesanGalat, useOptionalSiakad, useSiakadQuery } from './provider';

/*
 * Layar pengawas sesi CBT (CBT-03), dipakai bersama Fakultas (UTS/UAS), PMB, dan aplikasi lain: token besar, buka/tutup
 * sesi, ringkasan status, dan kartu tiap peserta (progres, sisa waktu, pelanggaran, perangkat terkunci) yang diperbarui
 * tiap 5 detik. Tindakan: reset perangkat, tambah waktu, diskualifikasi. Hak dicek server (pengawas sesi/pengelola).
 */

export interface PesertaPantauCbt {
  id: number;
  username: string;
  nama: string | null;
  nomor_peserta?: string | null;
  status: 'terdaftar' | 'mengerjakan' | 'selesai' | 'diskualifikasi' | 'tidak_hadir';
  tambahan_menit: number;
  pelanggaran: number;
  perangkat_terkunci: boolean;
  jumlah_soal: number | null;
  terjawab: number;
  sisa_detik: number | null;
  log_terakhir: { jenis: string; waktu: string } | null;
}
export interface PantauSesiCbtData {
  sesi: { id: number; nama: string; mulai: string; selesai: string; status: 'terjadwal' | 'dibuka' | 'ditutup'; token: string | null; pengawas: string | null };
  ujian: { id: number; kode: string; nama: string; durasi_menit: number; status: string };
  ringkas: Partial<Record<PesertaPantauCbt['status'], number>>;
  peserta: PesertaPantauCbt[];
}

const C = '/v1/cbt';
const VARIAN: Record<string, BadgeVariant> = { terdaftar: 'neutral', mengerjakan: 'warning', selesai: 'success', diskualifikasi: 'danger', tidak_hadir: 'neutral' };
const LABEL: Record<string, string> = { terdaftar: 'Belum mulai', mengerjakan: 'Mengerjakan', selesai: 'Selesai', diskualifikasi: 'Didiskualifikasi', tidak_hadir: 'Tidak hadir' };
const LOG: Record<string, string> = {
  pindah_tab: 'Pindah tab', keluar_layar: 'Keluar layar penuh', salin_tempel: 'Salin/tempel', koneksi_putus: 'Koneksi putus', mulai: 'Mulai', selesai: 'Selesai',
  reset_perangkat: 'Reset perangkat', tambah_waktu: 'Tambah waktu', diskualifikasi: 'Diskualifikasi', sambung_ulang: 'Masuk lagi', syarat_tidak_terpenuhi: 'Tidak memenuhi syarat',
  token_salah: 'Token salah', perangkat_lain: 'Coba perangkat lain',
};
const durasi = (d: number) => `${Math.floor(d / 60)}:${String(d % 60).padStart(2, '0')}`;
type Tindakan = { p: PesertaPantauCbt; a: 'tambah-waktu' | 'diskualifikasi' } | { a: 'tutup' } | null;

export function usePantauSesiCbt(sesiId: number | undefined) {
  return useSiakadQuery<PantauSesiCbtData>(['cbt-pantau', String(sesiId)], (s, signal) => s.request({ method: 'GET', path: `${C}/sesi/${sesiId}/pantau` }, { signal }) as never, {
    enabled: sesiId != null,
    staleTime: 0,
  });
}

export function PantauSesiCbt({ sesiId, className }: { sesiId: number; className?: string }) {
  const siakad = useOptionalSiakad();
  const q = usePantauSesiCbt(sesiId);
  const [cari, setCari] = React.useState('');
  const [saring, setSaring] = React.useState<'semua' | 'mengerjakan' | 'terdaftar' | 'selesai' | 'bermasalah'>('semua');
  const [tindakan, setTindakan] = React.useState<Tindakan>(null);
  const [f, setF] = React.useState({ menit: '10', alasan: '' });
  const [galat, setGalat] = React.useState<string | null>(null);
  const refetch = q.refetch;
  React.useEffect(() => {
    const t = setInterval(() => refetch(), 5000);
    return () => clearInterval(t);
  }, [refetch]);

  const aksi = async (path: string, body: unknown = {}) => {
    if (!siakad) return;
    setGalat(null);
    try {
      await siakad.request({ method: 'POST', path, body });
      invalidateSiakad('cbt-pantau');
      invalidateSiakad('cbt-ujian');
    } catch (e) {
      setGalat(pesanGalat(e));
      throw e;
    }
  };

  if (q.error && !q.data) return <Alert variant="danger" title="Sesi tidak dapat dimuat">{pesanGalat(q.error)}</Alert>;
  if (!q.data) return <Skeleton className={className} style={{ height: 320 }} />;
  const d = q.data;
  const daftar = d.peserta.filter(
    (p) => (saring === 'semua' || (saring === 'bermasalah' ? p.pelanggaran > 0 || p.perangkat_terkunci : p.status === saring)) && `${p.username} ${p.nama ?? ''}`.toLowerCase().includes(cari.toLowerCase()),
  );
  const s = d.sesi;
  return (
    <div className={cn('u-cbt-pantau', className)}>
      <section className="u-cbt-pantau-kepala">
        <div>
          <h3>{d.ujian.nama}</h3>
          <p>
            {s.nama} · {formatTime(s.mulai)}–{formatTime(s.selesai)} · {d.ujian.durasi_menit} menit
          </p>
        </div>
        <div className="u-cbt-pantau-token" aria-live="polite">
          {s.status === 'dibuka' && s.token ? (
            <>
              <small>Token</small>
              <b>{s.token}</b>
            </>
          ) : (
            <Badge variant={s.status === 'ditutup' ? 'neutral' : 'warning'} dot>
              {s.status === 'ditutup' ? 'Sesi ditutup' : 'Sesi belum dibuka'}
            </Badge>
          )}
        </div>
        <div className="u-cbt-pantau-aksi">
          {s.status === 'terjadwal' && (
            <Button onClick={() => void aksi(`${C}/sesi/${s.id}/buka`).catch(() => undefined)}>
              <PlayCircle /> Buka sesi
            </Button>
          )}
          {s.status === 'dibuka' && (
            <>
              <Button variant="outline" onClick={() => void aksi(`${C}/sesi/${s.id}/ganti-token`).catch(() => undefined)}>
                <KeyRound /> Ganti token
              </Button>
              <Button variant="destructive" onClick={() => setTindakan({ a: 'tutup' })}>
                <Lock /> Tutup sesi
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={refetch} aria-label="Muat ulang">
            <RefreshCw />
          </Button>
        </div>
      </section>
      {galat && <Alert variant="danger" title="Tindakan gagal">{galat}</Alert>}
      <dl className="u-cbt-pantau-ringkas">
        {(['terdaftar', 'mengerjakan', 'selesai', 'tidak_hadir', 'diskualifikasi'] as const).map((k) => (
          <div key={k}>
            <dt>{LABEL[k]}</dt>
            <dd>{d.ringkas[k] ?? 0}</dd>
          </div>
        ))}
      </dl>
      <div className="u-cbt-pantau-alat">
        <label className="u-cbt-pantau-cari">
          <Search aria-hidden />
          <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama atau NIM" aria-label="Cari peserta" />
        </label>
        <SegmentedControl
          value={saring}
          onValueChange={setSaring}
          options={[
            { value: 'semua', label: 'Semua' },
            { value: 'mengerjakan', label: 'Mengerjakan' },
            { value: 'terdaftar', label: 'Belum mulai' },
            { value: 'selesai', label: 'Selesai' },
            { value: 'bermasalah', label: 'Bermasalah' },
          ]}
        />
      </div>
      {daftar.length === 0 ? (
        <Empty title="Tidak ada peserta" description="Tidak ada peserta yang cocok dengan saringan." bordered />
      ) : (
        <ul className="u-cbt-pantau-grid">
          {daftar.map((p) => {
            const aktif = p.status === 'terdaftar' || p.status === 'mengerjakan';
            return (
              <li key={p.id} data-waspada={p.pelanggaran >= 3 ? 'tinggi' : p.pelanggaran > 0 ? 'ya' : undefined}>
                <header>
                  <span>
                    <b>{p.nama ?? p.username}</b>
                    <small>{p.nomor_peserta ? `No. ${p.nomor_peserta}` : p.username}</small>
                  </span>
                  <Badge variant={VARIAN[p.status] ?? 'neutral'} dot>
                    {LABEL[p.status] ?? p.status}
                  </Badge>
                </header>
                {p.status === 'mengerjakan' && (
                  <Progress value={p.terjawab} max={p.jumlah_soal || 1} size="sm" label={`${p.terjawab}/${p.jumlah_soal ?? '?'} terjawab · sisa ${durasi(p.sisa_detik ?? 0)}`} />
                )}
                <p className="u-cbt-pantau-tanda">
                  {p.pelanggaran > 0 && (
                    <span data-nada="bahaya">
                      <AlertTriangle aria-hidden /> {p.pelanggaran} pelanggaran
                    </span>
                  )}
                  {p.perangkat_terkunci && (
                    <span>
                      <Laptop aria-hidden /> perangkat terkunci
                    </span>
                  )}
                  {p.tambahan_menit > 0 && <span>+{p.tambahan_menit} menit</span>}
                  {p.log_terakhir && (
                    <span>
                      {LOG[p.log_terakhir.jenis] ?? p.log_terakhir.jenis} · {formatRelative(p.log_terakhir.waktu)}
                    </span>
                  )}
                </p>
                {aktif && (
                  <footer>
                    {p.perangkat_terkunci && (
                      <Button size="sm" variant="ghost" onClick={() => void aksi(`${C}/peserta/${p.id}/reset-perangkat`).catch(() => undefined)}>
                        <Unlock /> Reset perangkat
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setTindakan({ p, a: 'tambah-waktu' })}>
                      <Clock /> Tambah waktu
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setTindakan({ p, a: 'diskualifikasi' })}>
                      <Ban /> Diskualifikasi
                    </Button>
                  </footer>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        open={tindakan != null}
        onOpenChange={(o) => !o && setTindakan(null)}
        tone={tindakan?.a === 'tambah-waktu' ? 'primary' : 'danger'}
        title={tindakan?.a === 'tutup' ? 'Tutup sesi?' : tindakan?.a === 'tambah-waktu' ? `Tambah waktu untuk ${tindakan.p.nama ?? tindakan.p.username}` : `Diskualifikasi ${tindakan && 'p' in tindakan ? (tindakan.p.nama ?? tindakan.p.username) : ''}?`}
        description={
          tindakan?.a === 'tutup'
            ? 'Peserta yang masih mengerjakan diakhiri dan dinilai; yang belum mulai ditandai tidak hadir.'
            : tindakan?.a === 'diskualifikasi'
              ? 'Ujian peserta ini diakhiri. Pengelola bisa mengizinkan mengulang (susulan) dari halaman ujian.'
              : undefined
        }
        confirmLabel={tindakan?.a === 'tutup' ? 'Tutup sesi' : tindakan?.a === 'tambah-waktu' ? 'Tambah waktu' : 'Diskualifikasi'}
        onConfirm={async () => {
          if (!tindakan) return;
          if (tindakan.a === 'tutup') await aksi(`${C}/sesi/${s.id}/tutup`, { berita_acara: f.alasan || null });
          else if (tindakan.a === 'tambah-waktu') await aksi(`${C}/peserta/${tindakan.p.id}/tambah-waktu`, { menit: Number(f.menit) || 10, alasan: f.alasan || 'Gangguan teknis' });
          else await aksi(`${C}/peserta/${tindakan.p.id}/diskualifikasi`, { alasan: f.alasan || 'Pelanggaran tata tertib ujian' });
          setF({ menit: '10', alasan: '' });
          setTindakan(null);
        }}
      >
        {tindakan?.a === 'tambah-waktu' && (
          <label className="u-cbt-pantau-isian">
            Menit tambahan
            <Input type="number" min={1} max={240} value={f.menit} onChange={(e) => setF({ ...f, menit: e.target.value })} />
          </label>
        )}
        <label className="u-cbt-pantau-isian">
          {tindakan?.a === 'tutup' ? 'Berita acara (catatan pengawas)' : 'Alasan'}
          <Textarea rows={3} value={f.alasan} onChange={(e) => setF({ ...f, alasan: e.target.value })} />
        </label>
      </ConfirmDialog>
    </div>
  );
}
