'use client';
import * as React from 'react';
import { CheckCircle2, Send, XCircle } from 'lucide-react';
import { Badge, Skeleton } from '../components/actions';
import { Alert } from '../components/display';
import { Field, Input, Textarea } from '../components/forms';
import { ModalFitur, ModalSesiHabis, RincianModal, type ModalFiturProps } from '../components/modal-fitur';
import { IsianTanggal, Pilihan } from '../components/formulir';
import { AmbilKrs, PendaftaranWisuda, type HasilAmbilKrs, type SyaratItem } from './alur';
import { useAkunSaya } from './akun';
import { GalatApi } from './galat';
import { invalidateSiakad, pulihkanSesi, useSesiHabis, useSiakad, useSiakadQuery } from './provider';
import { Tekan } from '../components/tekan';

type Dasar = Pick<ModalFiturProps, 'open' | 'onOpenChange' | 'trigger' | 'className'>;

function useKendali(p: Dasar) {
  const [inner, setInner] = React.useState(false);
  const open = p.open ?? inner;
  const setOpen = (o: boolean) => {
    setInner(o);
    p.onOpenChange?.(o);
  };
  return [open, setOpen] as const;
}

// ================================================================ Penjaga sesi

export interface PenjagaSesiSiakadProps {
  /** Arahkan ke login (SSO). Bawaan: muat ulang halaman agar BFF mengarahkan ke SSO. */
  onMasuk?: () => void | Promise<void>;
  onSimpanDraf?: () => void | Promise<void>;
  children?: React.ReactNode;
}

/**
 * Pasang sekali di akar aplikasi. Saat API membalas 401 (token kedaluwarsa/dicabut) lewat useSiakadQuery atau
 * laporSesiHabis(), muncul ModalSesiHabis yang tidak bisa ditutup sampai pengguna masuk lagi.
 *   <UnipoProvider siakad={siakad}><PenjagaSesiSiakad onMasuk={() => location.assign('/bff/masuk')}>…</PenjagaSesiSiakad></UnipoProvider>
 */
export function PenjagaSesiSiakad({ onMasuk, onSimpanDraf, children }: PenjagaSesiSiakadProps) {
  const habis = useSesiHabis();
  return (
    <>
      {children}
      <ModalSesiHabis
        open={Boolean(habis)}
        onMasuk={async () => {
          if (onMasuk) await onMasuk();
          else window.location.reload();
          pulihkanSesi();
        }}
        onSimpanDraf={onSimpanDraf}
      />
    </>
  );
}

// ================================================================ Ajukan layanan (surat, legalisir, …)

export interface IsianLayanan {
  nama: string;
  label?: string;
  wajib?: boolean;
  /** teks (bawaan), panjang, angka, tanggal, pilihan. */
  tipe?: 'teks' | 'panjang' | 'angka' | 'tanggal' | 'pilihan';
  opsi?: string[];
  keterangan?: string;
}
export interface JenisLayanan {
  id: number;
  kode: string;
  nama: string;
  kategori: string;
  untuk?: string | null;
  keterangan?: string | null;
  syarat?: string | null;
  isian?: IsianLayanan[] | string | null;
  biaya?: number | string | null;
  sla_hari?: number | string | null;
  wajib_berkas?: boolean | number | string | null;
  terbitkan_dokumen?: boolean | number | string | null;
  aktif?: boolean | number | string | null;
}
export interface PermohonanLayanan {
  id: number;
  nomor: string;
  status: string;
  tenggat?: string | null;
  jenis_id: number;
}

function isianDari(j: JenisLayanan | undefined): IsianLayanan[] {
  if (!j?.isian) return [];
  if (Array.isArray(j.isian)) return j.isian;
  try {
    const x = JSON.parse(j.isian);
    return Array.isArray(x) ? x : [];
  } catch {
    return [];
  }
}
const ya = (v: unknown) => v === true || v === 1 || v === '1';
const rupiah = (n: unknown) => (Number(n) > 0 ? `Rp${Number(n).toLocaleString('id-ID')}` : 'Gratis');
const tanggal = (s?: string | null) => (s ? new Date(`${s.slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-');

export interface ModalAjukanLayananProps extends Dasar {
  /** Batasi katalog ke satu kategori (akademik, keuangan, kemahasiswaan, kepegawaian, umum). */
  kategori?: string;
  /** Langsung pilih jenis layanan ini (kode), mis. "SKAK" untuk surat keterangan aktif kuliah. */
  kodeJenis?: string;
  onTerkirim?: (p: PermohonanLayanan) => void;
}

/**
 * Ajukan layanan online: pilih jenis dari katalog /v1/layanan/jenis (syarat, biaya, SLA), isi formulir tambahan
 * sesuai `isian` jenis itu, lalu POST /v1/layanan/permohonan. Pemohon diisi dari akun yang masuk; server memeriksa
 * level yang boleh dan isian wajib (galat per field ditampilkan di field-nya).
 */
export function ModalAjukanLayanan({ kategori, kodeJenis, onTerkirim, ...p }: ModalAjukanLayananProps) {
  const siakad = useSiakad();
  const [open, setOpen] = useKendali(p);
  const akun = useAkunSaya({ foto: false });
  const q = useSiakadQuery<JenisLayanan[]>(
    ['layanan', 'jenis', kategori ?? ''],
    (s, signal) => s.request<JenisLayanan[]>({ method: 'GET', path: '/v1/layanan/jenis', query: { per_page: 100, kategori } }, { signal }),
    { enabled: open, staleTime: 300_000 },
  );
  const daftar = (q.data ?? []).filter((j) => (j.aktif == null || ya(j.aktif)) && (!kategori || j.kategori === kategori));
  const [jenisId, setJenisId] = React.useState<number | null>(null);
  const jenis = daftar.find((j) => j.id === jenisId) ?? (kodeJenis ? daftar.find((j) => j.kode === kodeJenis) : undefined);
  const isian = isianDari(jenis);
  const [data, setData] = React.useState<Record<string, string>>({});
  const [keperluan, setKeperluan] = React.useState('');
  const [salah, setSalah] = React.useState<Record<string, string>>({});
  const [hasil, setHasil] = React.useState<PermohonanLayanan | null>(null);

  const ulang = (o: boolean) => {
    setOpen(o);
    if (!o) {
      setJenisId(null);
      setData({});
      setKeperluan('');
      setSalah({});
      setHasil(null);
    }
  };

  if (hasil) {
    return (
      <ModalFitur
        {...p}
        open={open}
        onOpenChange={ulang}
        ilustrasi="sukses"
        title="Permohonan terkirim"
        description="Petugas akan memproses permohonan Anda. Perubahan status dikirim lewat notifikasi."
        aksi={{ label: 'Selesai', onClick: () => ulang(false) }}
        tutup={false}
      >
        <RincianModal
          baris={[
            ['Nomor', <span className="u-mono">{hasil.nomor}</span>],
            ['Layanan', jenis?.nama ?? '-'],
            ['Status', <Badge variant="info">Diajukan</Badge>],
            ['Perkiraan selesai', tanggal(hasil.tenggat)],
          ]}
        />
      </ModalFitur>
    );
  }

  return (
    <ModalFitur
      {...p}
      open={open}
      onOpenChange={ulang}
      size={jenis ? 'md' : 'lg'}
      ilustrasi="surat-layanan"
      title={jenis ? jenis.nama : 'Ajukan layanan'}
      description={jenis ? (jenis.keterangan ?? undefined) : 'Pilih layanan yang Anda butuhkan. Surat dan dokumen hasil layanan bisa dicek keasliannya lewat kode QR.'}
      tutup={jenis && !kodeJenis ? false : 'Batal'}
      aksiKedua={jenis && !kodeJenis ? { label: 'Ganti layanan', onClick: () => setJenisId(-1), tetapBuka: true, variant: 'outline' } : undefined}
      aksi={
        jenis
          ? {
              label: 'Kirim permohonan',
              icon: <Send />,
              tetapBuka: true,
              onClick: async () => {
                const kurang: Record<string, string> = {};
                for (const f of isian) if (f.wajib && !String(data[f.nama] ?? '').trim()) kurang[f.nama] = `${f.label ?? f.nama} wajib diisi`;
                setSalah(kurang);
                if (Object.keys(kurang).length) return 'Lengkapi isian yang ditandai.';
                const pemohon = akun.data?.akun.username;
                try {
                  const r = await siakad.request<PermohonanLayanan>({
                    method: 'POST',
                    path: '/v1/layanan/permohonan',
                    body: { jenis_id: jenis.id, pemohon, keperluan: keperluan.trim() || undefined, data },
                  });
                  setHasil(r.data);
                  invalidateSiakad('layanan');
                  onTerkirim?.(r.data);
                } catch (e) {
                  const f = (e as { fields?: Record<string, unknown> }).fields;
                  if (f) setSalah(Object.fromEntries(Object.entries(f).map(([k, v]) => [k.replace(/^data\./, ''), String(v)])));
                  throw e;
                }
              },
            }
          : undefined
      }
    >
      {q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} title="Katalog layanan tidak dapat dimuat" />
      ) : q.loading && !q.data ? (
        <Skeleton height={180} />
      ) : !jenis ? (
        daftar.length === 0 ? (
          <Alert variant="info" title="Belum ada layanan yang dibuka">
            Hubungi biro akademik bila Anda membutuhkan surat atau dokumen.
          </Alert>
        ) : (
          <div className="u-pilih-layanan" role="group" aria-label="Jenis layanan">
            {daftar.map((j) => (
              <Tekan key={j.id} terpilih={jenisId === j.id} onClick={() => setJenisId(j.id)}>
                <b>{j.nama}</b>
                <span>
                  {j.kategori} · {rupiah(j.biaya)} · {j.sla_hari ?? 3} hari kerja
                </span>
              </Tekan>
            ))}
          </div>
        )
      ) : (
        <>
          <RincianModal
            baris={[
              ['Biaya', rupiah(jenis.biaya)],
              ['Lama proses', `${jenis.sla_hari ?? 3} hari kerja`],
              ...(ya(jenis.wajib_berkas) ? ([['Lampiran', 'Wajib, unggah setelah permohonan terkirim']] as Array<[string, string]>) : []),
            ]}
          />
          {jenis.syarat && (
            <Alert variant="info" title="Syarat">
              <span style={{ whiteSpace: 'pre-line' }}>{jenis.syarat}</span>
            </Alert>
          )}
          {isian.map((f) => (
            <Field key={f.nama} label={f.label ?? f.nama} required={f.wajib} optional={!f.wajib} description={f.keterangan} error={salah[f.nama]}>
              {f.tipe === 'panjang' ? (
                <Textarea value={data[f.nama] ?? ''} onChange={(e) => setData({ ...data, [f.nama]: e.target.value })} rows={3} />
              ) : f.tipe === 'pilihan' && f.opsi?.length ? (
                <Pilihan required={f.wajib} value={data[f.nama] || null} onValueChange={(v) => setData({ ...data, [f.nama]: v ?? '' })} options={f.opsi.map((o) => ({ value: o, label: o }))} />
              ) : f.tipe === 'tanggal' ? (
                <IsianTanggal value={data[f.nama] || null} onValueChange={(v) => setData({ ...data, [f.nama]: v })} />
              ) : (
                <Input
                  type={f.tipe === 'angka' ? 'number' : 'text'}
                  inputMode={f.tipe === 'angka' ? 'numeric' : undefined}
                  value={data[f.nama] ?? ''}
                  onChange={(e) => setData({ ...data, [f.nama]: e.target.value })}
                />
              )}
            </Field>
          ))}
          <Field label="Keperluan" optional description="Mis. melamar beasiswa, tunjangan orang tua, syarat magang." error={salah.keperluan}>
            <Input value={keperluan} maxLength={255} onChange={(e) => setKeperluan(e.target.value)} />
          </Field>
        </>
      )}
    </ModalFitur>
  );
}

// ================================================================ Cek kelulusan (yudisium + wisuda)

export interface SyaratKelulusan {
  nim: string;
  nama: string;
  kode_prodi: string;
  tahun_id: string;
  status_aktif: string;
  sks: number;
  ipk: number;
  predikat?: string | null;
  akademik: { boleh: boolean; alasan?: string | null; sks_lulus_prodi?: number | null; sks: number; ipk: number };
  wisuda: { boleh_daftar: boolean; syarat: SyaratItem[]; pendaftaran?: Record<string, unknown> | null; status_pendaftaran?: string | null };
  tambahan: Array<SyaratItem & { untuk: string; jenis?: string }>;
  boleh_yudisium: boolean;
  boleh_wisuda: boolean;
  kurang: { yudisium: string[]; wisuda: string[] };
  status_akhir?: { status?: string; tanggal_lulus?: string | null; no_sk_yudisium?: string | null; no_ijazah?: string | null } | null;
}

function DaftarSyarat({ judul, item }: { judul: string; item: SyaratItem[] }) {
  if (!item.length) return null;
  return (
    <>
      <p className="u-syarat-judul">{judul}</p>
      <ul className="u-syarat-daftar">
        {item.map((s, i) => (
          <li key={s.kode ?? i} data-ok={String(s.terpenuhi)}>
            {s.terpenuhi ? <CheckCircle2 aria-label="Terpenuhi" /> : <XCircle aria-label="Belum" />}
            <span>{s.nama}</span>
            {typeof s.nilai === 'number' || typeof s.nilai === 'string' ? <small>{String(s.nilai)}</small> : <span />}
          </li>
        ))}
      </ul>
    </>
  );
}

export interface ModalCekKelulusanProps extends Dasar {
  /** NIM; bawaan akun yang masuk (mahasiswa). Pengelola memilih lewat PilihMahasiswa lalu mengirim NIM-nya. */
  nim?: string;
  tahunId?: string;
  /** Tombol lanjut ke pendaftaran wisuda bila syarat wisuda terpenuhi. */
  onDaftarWisuda?: () => void;
}

/**
 * Cek kesiapan yudisium dan wisuda dari GET /v1/kelulusan/mahasiswa/{nim}/syarat (aturan yang sama dengan menu
 * Lulus Akademik dan Pendaftaran Wisuda): SKS, IPK, predikat, TA, nilai D/E, syarat tambahan prodi (poin SKPI,
 * bebas pustaka, keuangan), dan status akhir bila sudah yudisium.
 */
export function ModalCekKelulusan({ nim: nimProp, tahunId, onDaftarWisuda, ...p }: ModalCekKelulusanProps) {
  const [open, setOpen] = useKendali(p);
  const akun = useAkunSaya({ foto: false });
  const nim = nimProp ?? akun.data?.akun.username;
  const q = useSiakadQuery<SyaratKelulusan>(
    ['kelulusan', 'syarat', nim, tahunId],
    (s, signal) => s.request<SyaratKelulusan>({ method: 'GET', path: `/v1/kelulusan/mahasiswa/${encodeURIComponent(nim!)}/syarat`, query: { tahun_id: tahunId } }, { signal }),
    { enabled: open && Boolean(nim), staleTime: 0 },
  );
  const d = q.data;
  const lulus = d?.status_akhir?.status === 'L';
  const ilus = !d ? 'kelulusan-saya' : lulus ? 'wisuda' : d.boleh_yudisium ? 'yudisium' : 'kelulusan-saya';
  return (
    <ModalFitur
      {...p}
      open={open}
      onOpenChange={setOpen}
      size="md"
      ilustrasi={d && !d.boleh_yudisium && !lulus ? { nama: 'kelulusan-saya', ekspresi: 'bingung', aksesori: ['ransel', 'buku'] } : ilus}
      title={!d ? 'Cek kesiapan kelulusan' : lulus ? 'Selamat, Anda sudah lulus' : d.boleh_yudisium ? 'Siap diajukan yudisium' : 'Belum memenuhi syarat yudisium'}
      description={d ? `${d.nama} · ${d.nim}` : undefined}
      aksi={d?.boleh_wisuda && onDaftarWisuda ? { label: 'Daftar wisuda', onClick: onDaftarWisuda } : undefined}
    >
      {q.error ? (
        <GalatApi error={q.error} onRetry={q.refetch} title="Syarat kelulusan tidak dapat dimuat" />
      ) : !d ? (
        <Skeleton height={240} />
      ) : (
        <>
          <RincianModal
            baris={[
              ['IPK', `${Number(d.ipk).toFixed(2)}${d.predikat ? ` · ${d.predikat}` : ''}`],
              ['SKS lulus', `${d.sks}${d.akademik.sks_lulus_prodi ? ` dari ${d.akademik.sks_lulus_prodi}` : ''}`],
              ...(lulus
                ? ([
                    ['Tanggal lulus', tanggal(d.status_akhir?.tanggal_lulus)],
                    ['SK yudisium', d.status_akhir?.no_sk_yudisium ?? '-'],
                    ['Nomor ijazah', d.status_akhir?.no_ijazah ?? '-'],
                  ] as Array<[string, string]>)
                : []),
            ]}
          />
          {!lulus && d.akademik.alasan && !d.akademik.boleh && (
            <Alert variant="warning" title="Catatan akademik">
              {d.akademik.alasan}
            </Alert>
          )}
          {!lulus && <DaftarSyarat judul="Syarat wisuda" item={d.wisuda.syarat} />}
          {!lulus && <DaftarSyarat judul="Syarat tambahan prodi" item={d.tambahan} />}
        </>
      )}
    </ModalFitur>
  );
}

// ================================================================ Daftar wisuda, Ambil KRS (modal untuk komponen alur)

export interface ModalDaftarWisudaProps extends Dasar {
  onTerdaftar?: (p: Record<string, unknown>) => void;
}

/** PendaftaranWisuda di dalam modal berilustrasi (periode dibuka, syarat, kelengkapan toga/topi/undangan). */
export function ModalDaftarWisuda({ onTerdaftar, ...p }: ModalDaftarWisudaProps) {
  const [open, setOpen] = useKendali(p);
  return (
    <ModalFitur {...p} open={open} onOpenChange={setOpen} size="lg" ilustrasi="wisuda" title="Pendaftaran wisuda" description="Periksa syarat, pilih periode, lalu lengkapi perlengkapan wisuda.">
      {open && <PendaftaranWisuda onTerdaftar={onTerdaftar} />}
    </ModalFitur>
  );
}

export interface ModalAmbilKrsProps extends Dasar {
  /** NIM; bawaan akun mahasiswa yang masuk. */
  nim?: string;
  onTersimpan?: (h: HasilAmbilKrs) => void;
}

/** AmbilKrs di dalam modal: penawaran, batas SKS, bentrok jadwal, dan simpan ke POST /v1/mahasiswa/{nim}/krs. */
export function ModalAmbilKrs({ nim: nimProp, onTersimpan, ...p }: ModalAmbilKrsProps) {
  const [open, setOpen] = useKendali(p);
  const akun = useAkunSaya({ foto: false });
  const nim = nimProp ?? akun.data?.akun.username;
  return (
    <ModalFitur
      {...p}
      open={open}
      onOpenChange={setOpen}
      size="xl"
      ilustrasi="krs"
      title="Ambil KRS"
      description="Pilih mata kuliah dan kelas untuk semester ini. Batas SKS dan jadwal bentrok diperiksa sebelum disimpan."
    >
      {open && (nim ? <AmbilKrs nim={nim} onTersimpan={onTersimpan} /> : akun.error ? <GalatApi error={akun.error} onRetry={akun.refetch} /> : <Skeleton height={240} />)}
    </ModalFitur>
  );
}
