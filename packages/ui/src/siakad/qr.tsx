'use client';
import * as React from 'react';
import { Plus, QrCode, Save, Trash2 } from 'lucide-react';
import { Badge, Button, Spinner } from '../components/actions';
import { Card, Empty } from '../components/display';
import { Field, Input } from '../components/forms';
import { ConfirmDialog, useToast } from '../components/overlays';
import { KodeQr, PembuatGayaQr, gabungGayaQr, normalGayaQr, type GayaQr, type GayaQrMasukan } from '../components/kode-qr';
import { GalatApi } from './galat';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

export interface GayaQrEfektif {
  kode: string;
  /** Unit pemilik gaya yang dipakai; null = kampus/preset. */
  bagian: string | null;
  sumber: 'tersimpan' | 'bawaan';
  id?: string | null;
  nama?: string | null;
  gaya: GayaQr;
}

export interface GayaQrTersimpan {
  id: string;
  kode: string;
  nama: string;
  keterangan?: string | null;
  bagian: string | null;
  bagian_nama?: string | null;
  gaya: GayaQr;
  aktif: boolean;
  diubah_oleh?: string | null;
  diubah_at?: string | null;
}

/**
 * Gaya QR yang berlaku untuk satu kode (presensi, dokumen, kartu, ...) di satu bagian (kode unit arsip), diwariskan
 * dari unit induk sampai kampus lalu preset (GET /v1/qr/gaya/efektif, publik). Logo dikirim sebagai data URI.
 */
export function useGayaQr(kode = 'bawaan', bagian?: string | null, opts: { enabled?: boolean } = {}) {
  return useSiakadQuery<GayaQrEfektif>(
    ['qr', 'efektif', kode, bagian ?? ''],
    (s, signal) => s.request<GayaQrEfektif>({ method: 'GET', path: '/v1/qr/gaya/efektif', query: { kode, ...(bagian ? { bagian } : {}) }, public: true }, { signal }),
    { staleTime: 5 * 60_000, enabled: opts.enabled ?? true },
  );
}

export interface KodeQrSiakadProps {
  /** Isi QR (URL presensi, URL verifikasi dokumen, ...). */
  nilai: string;
  /** Kode gaya tersimpan: presensi, dokumen, kartu, atau kode lain buatan bagian. Bawaan "bawaan". */
  kodeGaya?: string;
  /** Kode unit (fakultas/prodi/biro) untuk mencari gaya bagian itu. */
  bagian?: string | null;
  /** Timpa sebagian gaya di halaman ini saja, mis. teks bingkai. */
  gayaTambahan?: GayaQrMasukan;
  ukuran?: number;
  unduh?: boolean | string;
  label?: string;
  className?: string;
}

/**
 * KodeQr dengan gaya resmi bagian dari SIAKAD (warna, logo kampus/unit, bingkai). Gambar dibuat di browser, jadi
 * QR presensi yang berganti tiap beberapa detik tidak membebani server. Selama gaya dimuat, QR polos tetap tampil.
 */
export function KodeQrSiakad({ nilai, kodeGaya = 'bawaan', bagian, gayaTambahan, ukuran = 200, unduh, label, className }: KodeQrSiakadProps) {
  const e = useGayaQr(kodeGaya, bagian);
  const gaya = React.useMemo(() => gabungGayaQr(e.data?.gaya, gayaTambahan), [e.data, JSON.stringify(gayaTambahan ?? null)]);
  return <KodeQr nilai={nilai} gaya={gaya} ukuran={ukuran} unduh={unduh} label={label} className={className} data-sumber-gaya={e.data?.sumber} />;
}

export interface KelolaGayaQrProps {
  /** Batasi ke satu bagian (kode unit); kosong = semua yang boleh dilihat. */
  bagian?: string;
  /** Batasi ke satu kode gaya, mis. "presensi". */
  kode?: string;
  /** Isi QR untuk pratinjau. */
  contoh?: string;
  className?: string;
}

interface DaftarGaya {
  gaya: GayaQrTersimpan[];
  preset: string[];
  tersedia: boolean;
}

/**
 * Halaman pengelolaan gaya QR per bagian (GET/POST /v1/qr/gaya): daftar gaya tersimpan, penyusun gaya visual dengan
 * pratinjau, simpan dan hapus. Tingkat kampus hanya qr:admin; bagian oleh pimpinan/admin unit di arsip_petugas.
 */
export function KelolaGayaQr({ bagian, kode, contoh = 'https://siakad.unipo.ac.id', className }: KelolaGayaQrProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useSiakadQuery<DaftarGaya>(['qr', 'gaya', bagian ?? '', kode ?? ''], (s, signal) =>
    s.request<DaftarGaya>({ method: 'GET', path: '/v1/qr/gaya', query: { ...(bagian ? { bagian } : {}), ...(kode ? { kode } : {}) } }, { signal }),
  );
  const [pilih, setPilih] = React.useState<GayaQrTersimpan | 'baru' | null>(null);
  const [form, setForm] = React.useState<{ kode: string; nama: string; bagian: string; gaya: GayaQr }>({ kode: kode ?? 'presensi', nama: '', bagian: bagian ?? '', gaya: normalGayaQr(null) });
  const [simpan, setSimpan] = React.useState(false);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const efektif = useGayaQr(form.kode, form.bagian || null, { enabled: pilih !== null && form.kode.length > 1 });

  const buka = (g: GayaQrTersimpan | 'baru') => {
    setPilih(g);
    setGalat({});
    setForm(g === 'baru'
      ? { kode: kode ?? 'presensi', nama: '', bagian: bagian ?? '', gaya: normalGayaQr(null) }
      : { kode: g.kode, nama: g.nama, bagian: g.bagian ?? '', gaya: normalGayaQr(g.gaya) });
  };
  React.useEffect(() => {
    if (pilih === 'baru' && efektif.data) setForm((f) => ({ ...f, gaya: normalGayaQr(efektif.data!.gaya) }));
  }, [pilih, efektif.data]);

  const kirim = async () => {
    setSimpan(true);
    setGalat({});
    try {
      const body = { kode: form.kode, nama: form.nama || form.kode, ...(form.bagian ? { bagian: form.bagian } : {}), gaya: form.gaya };
      const r = pilih && pilih !== 'baru'
        ? await siakad.request<GayaQrTersimpan>({ method: 'POST', path: `/v1/qr/gaya/${pilih.id}`, body: { nama: body.nama, gaya: body.gaya } })
        : await siakad.request<GayaQrTersimpan>({ method: 'POST', path: '/v1/qr/gaya', body });
      toast.add({ title: 'Gaya QR disimpan', description: `${r.data.nama} berlaku untuk ${r.data.bagian_nama ?? 'kampus'}.`, type: 'success' });
      invalidateSiakad('qr');
      setPilih(r.data);
    } catch (e) {
      setGalat(((e as { details?: Record<string, string> }).details) ?? {});
      toast.add({ title: 'Gagal menyimpan gaya', description: pesanGalat(e), type: 'error' });
    } finally {
      setSimpan(false);
    }
  };

  const daftar = q.data?.gaya ?? [];
  return (
    <div className={['u-qr-kelola-wadah', className].filter(Boolean).join(' ')}>
    <div className="u-qr-kelola">
      <aside className="u-qr-kelola-daftar">
        <div className="u-qr-kelola-kepala">
          <strong>Gaya QR</strong>
          <Button size="sm" onClick={() => buka('baru')}>
            <Plus /> Gaya baru
          </Button>
        </div>
        {q.loading && <Spinner />}
        {q.error && <GalatApi error={q.error} onRetry={q.refetch} />}
        {!q.loading && !q.error && daftar.length === 0 && (
          <Empty icon={<QrCode />} title="Belum ada gaya tersimpan" description="Semua QR memakai preset bawaan. Buat gaya untuk bagian Anda." />
        )}
        <ul>
          {daftar.map((g) => (
            <li key={g.id}>
              <button type="button" aria-pressed={pilih !== 'baru' && pilih?.id === g.id} onClick={() => buka(g)}>
                <KodeQr nilai="UNIPO" gaya={{ ...g.gaya, logo: null, bingkai: null }} ukuran={40} aria-hidden />
                <span>
                  <strong>{g.nama}</strong>
                  <small>{g.kode} · {g.bagian_nama ?? 'Kampus'}</small>
                </span>
                {!g.aktif && <Badge variant="neutral">nonaktif</Badge>}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="u-qr-kelola-isi">
        {pilih === null ? (
          <Empty icon={<QrCode />} title="Pilih gaya" description="Pilih gaya di daftar atau buat gaya baru untuk presensi, dokumen, kartu, atau keperluan lain." />
        ) : (
          <Card className="u-qr-kelola-form">
            <div className="u-qr-dua">
              <Field label="Kode" description="presensi, dokumen, kartu, atau kode sendiri." error={galat['kode']}>
                <Input value={form.kode} disabled={pilih !== 'baru'} onChange={(e) => setForm({ ...form, kode: e.target.value.toLowerCase() })} />
              </Field>
              <Field label="Nama" error={galat['nama']}>
                <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="QR presensi FIK" />
              </Field>
            </div>
            <Field label="Bagian" description="Kode unit arsip (fakultas, prodi, biro). Kosong = seluruh kampus." error={galat['bagian']}>
              <Input value={form.bagian} disabled={pilih !== 'baru' || Boolean(bagian)} onChange={(e) => setForm({ ...form, bagian: e.target.value })} />
            </Field>
            <PembuatGayaQr value={form.gaya} onValueChange={(g) => setForm({ ...form, gaya: g })} contoh={contoh} logo={form.gaya.logo?.data ?? efektif.data?.gaya.logo?.data ?? null} />
            {Object.entries(galat).filter(([k]) => k.startsWith('gaya.')).map(([k, v]) => (
              <p key={k} className="u-qr-galat">{k.replace('gaya.', '')}: {v}</p>
            ))}
            <div className="u-qr-baris u-qr-aksi">
              <Button onClick={kirim} disabled={simpan}>
                {simpan ? <Spinner /> : <Save />} Simpan gaya
              </Button>
              {pilih !== 'baru' && (
                <ConfirmDialog
                  trigger={<Button variant="destructive-soft"><Trash2 /> Hapus</Button>}
                  title={`Hapus gaya “${pilih.nama}”?`}
                  description="QR bagian ini kembali memakai gaya unit induk atau preset kampus."
                  confirmLabel="Hapus gaya"
                  onConfirm={async () => {
                    try {
                      await siakad.request({ method: 'POST', path: `/v1/qr/gaya/${pilih.id}/hapus` });
                      invalidateSiakad('qr');
                      setPilih(null);
                      toast.add({ title: 'Gaya dihapus', type: 'success' });
                    } catch (e) {
                      toast.add({ title: 'Gagal menghapus', description: pesanGalat(e), type: 'error' });
                    }
                  }}
                />
              )}
            </div>
          </Card>
        )}
      </section>
    </div>
    </div>
  );
}
