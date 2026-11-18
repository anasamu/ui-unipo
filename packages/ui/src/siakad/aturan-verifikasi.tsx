'use client';
import * as React from 'react';
import { RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatDate } from '../lib/format';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Empty } from '../components/display';
import { SegmentedControl, Switch } from '../components/forms';
import { Select } from '../components/select';
import { ConfirmDialog, useToast } from '../components/overlays';
import { Cluster, Stack, Text } from '../components/tata-letak';
import { GalatApi } from './galat';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import type { PemilikPemutakhiran } from './pemutakhiran';

// ================================================================ Tipe GET /v1/profil/pemutakhiran/{pemilik}/aturan

export type ModeAturanVerifikasi = 'langsung' | 'verifikasi' | 'ajukan' | 'baca';
export type PemeriksaAturanVerifikasi = 'pusat' | 'unit';

export interface NilaiAturanVerifikasi {
  mode: ModeAturanVerifikasi;
  bukti: boolean;
  wajib: boolean;
  pemeriksa: PemeriksaAturanVerifikasi;
}
export interface IsianAturanVerifikasi extends NilaiAturanVerifikasi {
  /** "peran:kode", kunci simpan. */
  kunci: string;
  kode: string;
  label: string;
  rahasia: boolean;
  peran: string[] | null;
  /** Berbeda dari bawaan kode. */
  diatur: boolean;
  bawaan: NilaiAturanVerifikasi & { mode_peran: Record<string, ModeAturanVerifikasi> | null };
}
export interface BagianAturanVerifikasi {
  sasaran: 'pegawai' | 'mahasiswa';
  kode: string;
  label: string;
  keterangan: string;
  isian: IsianAturanVerifikasi[];
}
export interface AturanVerifikasiDataRespons {
  pemilik: PemilikPemutakhiran;
  pemilik_label: string;
  /** Peran yang sedang ditampilkan (dosen, tendik, mahasiswa). */
  peran: string;
  peran_opsi: Array<{ value: string; label: string; diatur: number }>;
  bagian: BagianAturanVerifikasi[];
  boleh_ubah: boolean;
  terakhir: { diubah_oleh: string; updated_at: string } | null;
}

const MODE_LABEL: Record<ModeAturanVerifikasi, string> = { langsung: 'Langsung tersimpan', verifikasi: 'Diverifikasi', ajukan: 'Lewat pengajuan', baca: 'Hanya baca' };
const PERAN_LABEL: Record<string, string> = { dosen: 'Dosen', tendik: 'Tendik', mahasiswa: 'Mahasiswa' };

/** "a", "a dan b", "a, b, dan c". */
function daftarKata(x: string[]): string {
  return x.length <= 2 ? x.join(' dan ') : `${x.slice(0, -1).join(', ')}, dan ${x[x.length - 1]}`;
}

function ringkasBawaan(i: IsianAturanVerifikasi, unit: string): string {
  const b = i.bawaan;
  const mode = b.mode_peran
    ? Object.entries(b.mode_peran)
        .map(([p, m]) => `${PERAN_LABEL[p] ?? p} ${MODE_LABEL[m].toLowerCase()}`)
        .join(', ')
    : MODE_LABEL[b.mode].toLowerCase();
  return [mode, b.bukti ? 'wajib bukti' : null, b.wajib ? 'wajib diisi' : null, b.pemeriksa === 'pusat' ? `pemeriksa ${unit} pusat` : null].filter(Boolean).join(' · ');
}

export interface AturanVerifikasiDataProps {
  pemilik: PemilikPemutakhiran;
  /** Teks pengantar di atas tabel. */
  deskripsi?: React.ReactNode;
  className?: string;
}

/**
 * Aturan verifikasi bawaan per isian pemutakhiran data milik satu unit (SDM: identitas, kontak, alamat, kepegawaian;
 * BAAK: data mahasiswa; BAUK: data keuangan): mode (langsung tersimpan, diverifikasi, lewat pengajuan, hanya baca),
 * wajib bukti, wajib diisi, dan pemeriksa (unit pusat atau petugas fakultas/prodi). Berlaku di luar periode
 * pemutakhiran dan menjadi nilai awal periode baru. Pasang di halaman pengaturan unit:
 * `<AturanVerifikasiData pemilik="sdm" />`. Izin `<pemilik>.pemutakhiran.kelola`; hanya petugas pusat yang mengubah.
 */
export function AturanVerifikasiData({ pemilik, deskripsi, className }: AturanVerifikasiDataProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const path = `/v1/profil/pemutakhiran/${pemilik}/aturan`;
  const [peran, setPeran] = React.useState<string | null>(null);
  const q = useSiakadQuery<AturanVerifikasiDataRespons>(['pemutakhiran', pemilik, 'aturan', peran], (s, signal) =>
    s.request<AturanVerifikasiDataRespons>({ method: 'GET', path, query: peran ? { peran } : undefined }, { signal }),
  );
  const [ubah, setUbah] = React.useState<Record<string, NilaiAturanVerifikasi>>({});
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [simpan, setSimpan] = React.useState(false);
  const [kembali, setKembali] = React.useState(false);

  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  if (!q.data) return <Skeleton height={320} className={className} />;
  const d = q.data;
  const peranAktif = d.peran;
  const labelPeran = d.peran_opsi.find((o) => o.value === peranAktif)?.label ?? peranAktif;
  const unit = d.pemilik_label;
  const boleh = d.boleh_ubah;
  const nilai = (i: IsianAturanVerifikasi): NilaiAturanVerifikasi => ubah[i.kunci] ?? { mode: i.mode, bukti: i.bukti, wajib: i.wajib, pemeriksa: i.pemeriksa };
  const atur = (i: IsianAturanVerifikasi, n: Partial<NilaiAturanVerifikasi>) =>
    setUbah((x) => {
      const baru = { ...nilai(i), ...n };
      if (baru.mode === 'langsung' || baru.mode === 'baca') baru.bukti = false;
      const sama = baru.mode === i.mode && baru.bukti === i.bukti && baru.wajib === i.wajib && baru.pemeriksa === i.pemeriksa;
      const hasil = { ...x };
      if (sama) delete hasil[i.kunci];
      else hasil[i.kunci] = baru;
      return hasil;
    });
  const jumlahUbah = Object.keys(ubah).length;
  const jumlahDiatur = d.bagian.reduce((n, b) => n + b.isian.filter((i) => i.diatur).length, 0);
  const modeOpsi = (Object.keys(MODE_LABEL) as ModeAturanVerifikasi[]).map((m) => ({ value: m, label: m === 'verifikasi' ? `Diverifikasi ${unit}` : MODE_LABEL[m] }));
  const pemeriksaOpsi = [
    { value: 'pusat' as const, label: `${unit} pusat` },
    { value: 'unit' as const, label: 'Petugas unit', description: 'Termasuk petugas fakultas/prodi' },
  ];

  const kirim = async () => {
    setSimpan(true);
    setGalat({});
    try {
      await siakad.request({ method: 'POST', path, body: { aturan: ubah, peran: peranAktif } });
      toast.add({ title: 'Aturan verifikasi disimpan', description: `${jumlahUbah} isian diperbarui. Berlaku untuk perubahan data berikutnya di aplikasi Profil.`, type: 'success' });
      setUbah({});
      invalidateSiakad('pemutakhiran');
    } catch (e) {
      const f = (e as { fields?: Record<string, unknown> }).fields;
      if (f) setGalat(Object.fromEntries(Object.entries(f).map(([k, v]) => [k.replace(/^aturan\./, ''), String(Array.isArray(v) ? v[0] : v)])));
      toast.add({ title: 'Aturan belum tersimpan', description: pesanGalat(e), type: 'error' });
    } finally {
      setSimpan(false);
    }
  };

  return (
    <Stack gap={4} className={cn('u-pmk-aturan', className)}>
      <Cluster justify="between" align="start" gap={3}>
        <Stack gap={1} className="u-pmk-aturan-pengantar">
          <Text size="sm" tone="muted">
            {deskripsi ??
              `Menentukan cara setiap isian diperbarui dari aplikasi Profil di luar periode pemutakhiran: langsung tersimpan, diverifikasi ${unit}, lewat pengajuan dengan alasan, atau hanya baca. Periode pemutakhiran baru memakai aturan ini sebagai nilai awal dan tetap bisa menimpanya.`}
          </Text>
          <Text size="xs" tone="muted">
            {jumlahDiatur ? `${labelPeran}: ${jumlahDiatur} isian berbeda dari bawaan.` : `${labelPeran}: semua isian memakai bawaan.`}
            {d.terakhir ? ` Terakhir diubah ${d.terakhir.diubah_oleh} pada ${formatDate(d.terakhir.updated_at, 'medium')}.` : ''}
          </Text>
        </Stack>
        {boleh ? (
          <Cluster gap={2}>
            <Button variant="outline" onClick={() => setKembali(true)} disabled={jumlahDiatur === 0}>
              <RotateCcw /> Kembalikan {d.peran_opsi.length > 1 ? labelPeran.toLowerCase() : ''} ke bawaan
            </Button>
            <Button onClick={() => void kirim()} loading={simpan} disabled={jumlahUbah === 0}>
              <Save /> {jumlahUbah ? `Simpan ${jumlahUbah} perubahan` : 'Simpan aturan'}
            </Button>
          </Cluster>
        ) : null}
      </Cluster>
      {d.peran_opsi.length > 1 ? (
        <Cluster gap={3}>
          <SegmentedControl
            value={peranAktif}
            onValueChange={(v) => setPeran(v)}
            options={d.peran_opsi.map((o) => ({ value: o.value, label: o.diatur ? `${o.label} (${o.diatur})` : o.label }))}
            aria-label="Aturan untuk"
          />
          <Text size="xs" tone="muted">
            Aturan diatur terpisah untuk {daftarKata(d.peran_opsi.map((o) => o.label.toLowerCase()))}.{jumlahUbah ? ` ${jumlahUbah} perubahan belum disimpan.` : ''}
          </Text>
        </Cluster>
      ) : null}
      {!boleh ? <Alert variant="info">Aturan berlaku untuk seluruh universitas. Anda bisa melihatnya; yang mengubah hanya petugas {unit} pusat.</Alert> : null}
      {d.bagian.length === 0 ? <Empty bordered icon={<ShieldCheck />} title="Tidak ada isian" description={`Belum ada isian pemutakhiran milik ${unit}.`} /> : null}
      {d.bagian.map((b) => (
        <section key={`${b.sasaran}-${b.kode}`} className="u-pmk-atur">
          <header>
            <div>
              <strong>{b.label}</strong>
              <small>
                {labelPeran} · {b.keterangan}
              </small>
            </div>
          </header>
          <div className="u-pmk-aturan-kepala" aria-hidden>
            <span>Isian</span>
            <span>Cara memperbarui</span>
            <span>Pemeriksa</span>
            <span>Wajib bukti</span>
            <span>Wajib diisi</span>
          </div>
          <div className="u-pmk-atur-baris">
            {b.isian.map((i) => {
              const n = nilai(i);
              const berubah = !!ubah[i.kunci];
              const periksa = n.mode === 'verifikasi' || n.mode === 'ajukan';
              return (
                <div key={i.kunci} className={cn('u-pmk-aturan-isian', (berubah || i.diatur) && 'is-buka')}>
                  <div className="u-pmk-atur-label">
                    <span>
                      {i.label}{' '}
                      {berubah ? (
                        <Badge variant="warning">
                          Belum disimpan
                        </Badge>
                      ) : i.diatur ? (
                        <Badge variant="info">
                          Diatur
                        </Badge>
                      ) : null}
                    </span>
                    <small>
                      Bawaan: {ringkasBawaan(i, unit)}
                      {i.rahasia ? ' · rahasia' : ''}
                      {i.peran ? ` · hanya ${i.peran.map((x) => PERAN_LABEL[x] ?? x).join('/')}` : ''}
                    </small>
                    {galat[i.kunci] ? (
                      <Text size="xs" tone="danger">
                        {galat[i.kunci]}
                      </Text>
                    ) : null}
                  </div>
                  <Select aria-label={`Cara memperbarui ${i.label}`} size="sm" options={modeOpsi} value={n.mode} disabled={!boleh} onValueChange={(v) => v && atur(i, { mode: v })} />
                  <Select aria-label={`Pemeriksa ${i.label}`} size="sm" options={pemeriksaOpsi} value={n.pemeriksa} disabled={!boleh || !periksa} onValueChange={(v) => v && atur(i, { pemeriksa: v })} />
                  <label className={cn('u-pmk-cek', !periksa && 'is-mati')}>
                    <Switch size="sm" checked={n.bukti} disabled={!boleh || !periksa} onCheckedChange={(v) => atur(i, { bukti: v })} aria-label={`Wajib bukti ${i.label}`} />
                    <span className="u-pmk-aturan-sel">Wajib bukti</span>
                  </label>
                  <label className="u-pmk-cek">
                    <Switch size="sm" checked={n.wajib} disabled={!boleh} onCheckedChange={(v) => atur(i, { wajib: v })} aria-label={`Wajib diisi ${i.label}`} />
                    <span className="u-pmk-aturan-sel">Wajib diisi</span>
                  </label>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <ConfirmDialog
        open={kembali}
        onOpenChange={setKembali}
        title={d.peran_opsi.length > 1 ? `Kembalikan aturan ${labelPeran.toLowerCase()} ke bawaan?` : 'Kembalikan semua aturan ke bawaan?'}
        description={`Semua isian ${unit} untuk ${labelPeran.toLowerCase()} kembali ke aturan bawaan sistem. Aturan peran lain dan periode pemutakhiran yang sudah dibuat tidak berubah.`}
        confirmLabel="Kembalikan ke bawaan"
        onConfirm={async () => {
          try {
            await siakad.request({ method: 'POST', path: `${path}/kembalikan`, body: { peran: peranAktif } });
            setUbah((x) => Object.fromEntries(Object.entries(x).filter(([k]) => !k.startsWith(`${peranAktif}:`))));
            toast.add({ title: 'Aturan dikembalikan ke bawaan', type: 'success' });
            invalidateSiakad('pemutakhiran');
          } catch (e) {
            toast.add({ title: 'Gagal', description: pesanGalat(e), type: 'error' });
          }
        }}
      />
    </Stack>
  );
}
