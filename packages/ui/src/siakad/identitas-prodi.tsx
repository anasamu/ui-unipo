'use client';
import * as React from 'react';
import { BadgeCheck, CircleCheck, CircleX, Download, History, ImageUp, Lock, Palette, Plus, RotateCcw, Send, ShieldCheck, Trash2, Undo2 } from 'lucide-react';
import { Badge, Button } from '../components/actions';
import { Alert, Card, CardContent, CardHeader, DescriptionList, Empty } from '../components/display';
import { DataTable, type DataColumn } from '../components/data-table';
import { CheckboxGroup, Field, Input, SegmentedControl, Switch, Textarea } from '../components/forms';
import { IsianTanggal, Pilihan } from '../components/formulir';
import { ConfirmDialog, Sheet, useToast } from '../components/overlays';
import { FormGrid, WizardReview } from '../components/wizard';
import { PanelLangkah } from '../components/panel-langkah';
import { KotakLogo } from '../components/identity';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { useUnggahBerkas } from './berkas';
import { PilihBerkas } from './pilih-berkas';
import { AlurPemeriksa, LabelPemeriksa, type TahapPemeriksa } from './pemeriksa';

/*
 * Identitas fakultas & prodi (SIAKAD docs/IDENTITAS-PRODI.md):
 *
 *   IdentitasFakultas         Fakultas: Dekan mengganti logo (pratinjau KotakLogo, format/ukuran, potong persegi), nama
 *                             singkat, warna aksen; langsung berlaku; riwayat versi bisa dikembalikan.
 *   UsulanDataProdi           Fakultas: Kaprodi mengusulkan perubahan data prodi lewat wizard (isian -> nilai baru dengan
 *                             banding nilai lama -> dasar & lampiran -> tinjau & ajukan); status dari alur pemeriksa.
 *   AntreanUsulanProdi        BAAK: antrean usulan, putuskan per isian (setujui/tolak bercatatan).
 *   AturIsianProdi            BAAK: isian mana yang boleh diusulkan prodi dan mana yang hanya BAAK (data).
 *   UsulanAkreditasiProdi     Fakultas: usulan pembaruan status akreditasi (lembaga, peringkat, SK, berlaku, sertifikat).
 *   AntreanUsulanAkreditasi   SPMI: validasi usulan menjadi data akreditasi resmi (boleh koreksi isian).
 *
 * Semua formulir di panel samping; formulir berisian banyak memakai PanelLangkah.
 */

// ------------------------------------------------------------------ bantu
const tgl = (s?: string | null) => (s ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s.length <= 10 ? `${s}T00:00:00` : s.replace(' ', 'T'))) : '–');
const waktu = (s?: string | null) =>
  s ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(s.replace(' ', 'T'))) : '–';
const pesan = (e: unknown) => {
  const x = e as { status?: number; message?: string } | null;
  return x?.status === 403 && x.message ? x.message : pesanGalat(e);
};
function galatKolom(e: unknown): Record<string, string> {
  const d = (e as { details?: Record<string, unknown> } | null)?.details;
  const out: Record<string, string> = {};
  if (d && typeof d === 'object') for (const [k, v] of Object.entries(d)) if (typeof v === 'string') out[k] = v;
  return out;
}
function rapikanNama(s?: string | null): string {
  if (!s) return '';
  return s.toLowerCase().replace(/(^|\s|\/|\()([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase()).replace(/\bDan\b/g, 'dan');
}

function useKirim(prefix: string[]) {
  const s = useSiakad();
  const toast = useToast();
  const [sibuk, setSibuk] = React.useState(false);
  const kirim = React.useCallback(
    async <T,>(method: 'POST' | 'PUT' | 'PATCH', path: string, body: unknown, sukses?: string): Promise<T> => {
      setSibuk(true);
      try {
        const r = await s.request<T>({ method, path, body });
        if (sukses) toast.add({ title: sukses, type: 'success' });
        prefix.forEach((p) => invalidateSiakad(p));
        return r.data;
      } finally {
        setSibuk(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s, toast, prefix.join('|')],
  );
  return { kirim, sibuk };
}

/** Buka berkas dari endpoint API yang mengirim isi berkas (lampiran usulan, sertifikat). */
function useBukaBerkas() {
  const s = useSiakad();
  const toast = useToast();
  return async (path: string) => {
    try {
      const r = await s.request<unknown>({ method: 'GET', path });
      const v = r.data as { blob?: () => Blob } | Blob | null;
      const blob = v instanceof Blob ? v : v && typeof v === 'object' && typeof v.blob === 'function' ? v.blob() : null;
      if (!blob) throw new Error('Berkas tidak dapat dibuka.');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      toast.add({ title: 'Gagal membuka berkas', description: pesan(e), type: 'error' });
    }
  };
}

function Nilai({ v, baru }: { v?: string | null; baru?: boolean }) {
  return v ? (
    <p className="u-idp-nilai" data-baru={baru ? '' : undefined}>
      {v}
    </p>
  ) : (
    <p className="u-idp-nilai" data-kosong="">
      Kosong
    </p>
  );
}

// ================================================================== identitas fakultas (logo)
interface MediaLogo {
  id: number;
  url: string;
  nama_asli?: string | null;
  lebar?: number | null;
  tinggi?: number | null;
}
interface RiwayatLogo {
  id: number;
  aksi: 'awal' | 'unggah' | 'pulihkan' | 'hapus' | 'portal';
  media_id: number | null;
  logo: MediaLogo | null;
  catatan: string | null;
  oleh: string | null;
  oleh_nama: string | null;
  waktu: string | null;
  berlaku: boolean;
}
export interface DataIdentitasFakultas {
  fakultas: { kode_fakultas: string; nama: string; singkatan_unit: string | null };
  situs: { id: number; kode: string; nama: string; singkatan: string | null; warna_utama: string | null; logo_media_id: number | null; logo: MediaLogo | null } | null;
  riwayat: RiwayatLogo[];
  batas: { format: string[]; mime: string[]; maks_byte: number; min_px: number; maks_px: number };
  dipakai_di: string[];
  hak: { kelola: boolean };
}
const AKSI_LOGO: Record<RiwayatLogo['aksi'], string> = { awal: 'Logo awal', unggah: 'Diunggah', pulihkan: 'Dikembalikan', hapus: 'Dihapus', portal: 'Dari portal/Humas' };

type CaraPotong = 'asli' | 'potong' | 'bingkai';
interface GambarDipilih {
  file: File;
  url: string;
  lebar: number;
  tinggi: number;
}

async function bacaGambar(file: File): Promise<GambarDipilih> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((ok, gagal) => {
    img.onload = () => ok();
    img.onerror = () => gagal(new Error('Berkas bukan gambar yang bisa dibaca.'));
    img.src = url;
  });
  return { file, url, lebar: img.naturalWidth, tinggi: img.naturalHeight };
}

/** Potong ke persegi (tengah) atau beri bingkai persegi transparan; hasil PNG. */
async function olahGambar(g: GambarDipilih, cara: CaraPotong): Promise<GambarDipilih> {
  if (cara === 'asli' || g.lebar === g.tinggi) return g;
  const img = new Image();
  img.src = g.url;
  await img.decode();
  const sisi = cara === 'potong' ? Math.min(g.lebar, g.tinggi) : Math.max(g.lebar, g.tinggi);
  const kanvas = document.createElement('canvas');
  kanvas.width = sisi;
  kanvas.height = sisi;
  const c = kanvas.getContext('2d');
  if (!c) return g;
  if (cara === 'potong') c.drawImage(img, (g.lebar - sisi) / 2, (g.tinggi - sisi) / 2, sisi, sisi, 0, 0, sisi, sisi);
  else c.drawImage(img, (sisi - g.lebar) / 2, (sisi - g.tinggi) / 2);
  const blob = await new Promise<Blob | null>((ok) => kanvas.toBlob(ok, 'image/png'));
  if (!blob) return g;
  const file = new File([blob], `${g.file.name.replace(/\.[a-z0-9]+$/i, '') || 'logo'}-persegi.png`, { type: 'image/png' });
  return { file, url: URL.createObjectURL(file), lebar: sisi, tinggi: sisi };
}

const ukuranTeks = (n: number) => (n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB`);

export interface IdentitasFakultasProps {
  /** Kode fakultas (m_fakultas) atau kode/singkatan yang dikenali /v1/fakultas/{kode}. */
  kodeFakultas: string;
  /** Dipanggil setelah logo/nama singkat/warna berubah (mis. segarkan header aplikasi). */
  onBerubah?: () => void;
  className?: string;
}

/**
 * Logo dan identitas fakultas (Dekan, izin fakultas.identitas.kelola). Logo langsung berlaku di header dasbor, portal
 * fakultas, Humas, dan kop dokumen (satu sumber: situs portal fakultas); setiap versi tercatat dan bisa dikembalikan.
 */
export function IdentitasFakultas({ kodeFakultas, onBerubah, className }: IdentitasFakultasProps) {
  const path = `/v1/fakultas/${encodeURIComponent(kodeFakultas)}/identitas`;
  const q = useSiakadQuery<DataIdentitasFakultas>(['identitas-prodi', 'fakultas', kodeFakultas], (s, signal) => s.request<DataIdentitasFakultas>({ method: 'GET', path }, { signal }));
  const { kirim } = useKirim(['identitas-prodi']);
  const toast = useToast();
  const [ubah, setUbah] = React.useState(false);
  const [pulihkan, setPulihkan] = React.useState<RiwayatLogo | null>(null);
  const [hapus, setHapus] = React.useState(false);
  const d = q.data;
  const boleh = Boolean(d?.hak.kelola);
  const s = d?.situs;
  const singkat = s?.singkatan ?? d?.fakultas.singkatan_unit ?? '';

  const kolom: DataColumn<RiwayatLogo>[] = [
    {
      key: 'logo', header: 'Versi', mobile: 'title', value: (r) => `#${r.id}`,
      cell: (r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem' }}>
          <KotakLogo src={r.logo?.url} ukuran="sm" alt={`Logo versi #${r.id}`} cadangan={<Lock aria-hidden size={14} />} />
          <span>#{r.id}</span>
        </span>
      ),
    },
    { key: 'aksi', header: 'Perubahan', value: (r) => AKSI_LOGO[r.aksi], cell: (r) => (r.media_id === null && r.aksi !== 'awal' ? 'Tanpa logo (logo aplikasi)' : AKSI_LOGO[r.aksi]) },
    { key: 'oleh', header: 'Oleh', value: (r) => r.oleh_nama ?? r.oleh ?? '', cell: (r) => r.oleh_nama ?? r.oleh ?? '–' },
    { key: 'waktu', header: 'Waktu', value: (r) => r.waktu ?? '', cell: (r) => waktu(r.waktu) },
    { key: 'catatan', header: 'Catatan', defaultHidden: true, value: (r) => r.catatan ?? '' },
    { key: 'status', header: 'Status', mobile: 'badge', shrink: true, value: (r) => (r.berlaku ? 'Berlaku' : ''), cell: (r) => (r.berlaku ? <Badge variant="success">Berlaku</Badge> : null) },
  ];

  return (
    <div className={['u-idp-tumpuk', className].filter(Boolean).join(' ')}>
      {d && !d.situs ? (
        <Alert variant="warning" title="Situs portal fakultas belum terdaftar">
          Logo fakultas disimpan di situs portal fakultas. Minta Humas mendaftarkannya di Humas » Situs, lalu kembali ke sini.
        </Alert>
      ) : null}
      {d && !boleh ? (
        <Alert variant="info" title="Hanya lihat">
          Logo dan identitas fakultas diubah Dekan/Wakil Dekan (izin Kelola identitas fakultas di tingkat fakultas).
        </Alert>
      ) : null}
      <Card>
        <CardHeader
          title="Logo & identitas"
          description="Langsung berlaku tanpa validasi; setiap perubahan tercatat di riwayat dan bisa dikembalikan."
          action={
            boleh && s ? (
              <div className="u-idp-aksi">
                <Button onClick={() => setUbah(true)}>
                  <ImageUp /> Ganti logo & identitas
                </Button>
                {s.logo ? (
                  <Button variant="ghost" onClick={() => setHapus(true)}>
                    <Trash2 /> Hapus logo
                  </Button>
                ) : null}
              </div>
            ) : undefined
          }
        />
        <CardContent>
          {q.loading && !d ? (
            <p className="u-idp-nilai" data-kosong="">
              Memuat…
            </p>
          ) : (
            <div className="u-idp-identitas">
              <KotakLogo src={s?.logo?.url} ukuran="xl" alt={`Logo ${d?.fakultas.nama ?? ''}`} latar={s?.warna_utama ?? undefined} cadangan={<strong>{(singkat || 'F').slice(0, 4)}</strong>} />
              <div className="u-idp-identitas-info">
                <h3>{rapikanNama(d?.fakultas.nama)}</h3>
                <DescriptionList
                  items={[
                    { label: 'Nama singkat', value: singkat || 'Belum diisi' },
                    {
                      label: 'Warna aksen',
                      value: s?.warna_utama ? (
                        <span className="u-idp-warna" style={{ ['--u-idp-warna' as string]: s.warna_utama }}>
                          {s.warna_utama}
                        </span>
                      ) : (
                        'Mengikuti tema'
                      ),
                    },
                    { label: 'Logo', value: s?.logo ? `${s.logo.nama_asli ?? 'logo'}${s.logo.lebar ? ` · ${s.logo.lebar}×${s.logo.tinggi} px` : ''}` : 'Belum ada (logo aplikasi bawaan)' },
                    { label: 'Dipakai di', value: d?.dipakai_di.join(' · ') },
                  ]}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="Riwayat versi logo" description="Kembalikan versi lama bila logo baru belum sesuai." />
        <CardContent>
          <DataTable
            caption="Riwayat versi logo"
            columns={kolom}
            rows={d?.riwayat}
            rowKey={(r) => String(r.id)}
            loading={q.loading}
            error={d ? undefined : q.error}
            onRetry={q.refetch}
            pagination={false}
            mobile="cards"
            empty={{ title: 'Belum ada riwayat', description: 'Riwayat dimulai saat logo pertama kali diganti.' }}
            rowActions={(r) => (boleh && !r.berlaku ? [{ label: 'Kembalikan versi ini', icon: <RotateCcw />, onSelect: () => setPulihkan(r) }] : [])}
          />
        </CardContent>
      </Card>
      {ubah && d?.situs ? (
        <PanelGantiLogo
          data={d}
          path={path}
          onTutup={(berubah) => {
            setUbah(false);
            if (berubah) onBerubah?.();
          }}
        />
      ) : null}
      <ConfirmDialog
        open={pulihkan !== null}
        onOpenChange={(o) => !o && setPulihkan(null)}
        title={`Kembalikan logo versi #${pulihkan?.id ?? ''}?`}
        description={pulihkan?.media_id === null ? 'Fakultas kembali memakai logo aplikasi bawaan.' : 'Versi ini langsung menjadi logo fakultas di semua tempat. Versi sekarang tetap ada di riwayat.'}
        confirmLabel="Kembalikan versi"
        tone="primary"
        icon={<History />}
        onConfirm={async () => {
          if (!pulihkan) return;
          try {
            await kirim('POST', `${path}/logo/riwayat/${pulihkan.id}/pulihkan`, {}, 'Logo dikembalikan');
            setPulihkan(null);
            onBerubah?.();
          } catch (e) {
            toast.add({ title: 'Belum berhasil', description: pesan(e), type: 'error' });
          }
        }}
      />
      <ConfirmDialog
        open={hapus}
        onOpenChange={setHapus}
        title="Hapus logo fakultas?"
        description="Fakultas kembali memakai logo aplikasi bawaan. Logo sekarang tetap ada di riwayat dan bisa dikembalikan."
        confirmLabel="Hapus logo"
        onConfirm={async () => {
          try {
            await kirim('POST', `${path}/logo/hapus`, {}, 'Logo dihapus');
            setHapus(false);
            onBerubah?.();
          } catch (e) {
            toast.add({ title: 'Belum berhasil', description: pesan(e), type: 'error' });
          }
        }}
      />
    </div>
  );
}

function PanelGantiLogo({ data, path, onTutup }: { data: DataIdentitasFakultas; path: string; onTutup: (berubah: boolean) => void }) {
  const s = data.situs!;
  const b = data.batas;
  const unggah = useUnggahBerkas({ kategori: 'gambar', modul: 'fakultas' });
  const { kirim } = useKirim(['identitas-prodi']);
  const [langkah, setLangkah] = React.useState(0);
  const [asli, setAsli] = React.useState<GambarDipilih | null>(null);
  const [cara, setCara] = React.useState<CaraPotong>('asli');
  const [hasil, setHasil] = React.useState<GambarDipilih | null>(null);
  const [galatBerkas, setGalatBerkas] = React.useState<string | null>(null);
  const [singkatan, setSingkatan] = React.useState(s.singkatan ?? '');
  const [warna, setWarna] = React.useState(s.warna_utama ?? '');
  const [catatan, setCatatan] = React.useState('');
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const masukan = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let batal = false;
    if (!asli) {
      setHasil(null);
      return;
    }
    void olahGambar(asli, cara).then((h) => !batal && setHasil(h));
    return () => {
      batal = true;
    };
  }, [asli, cara]);

  const periksa = (g: GambarDipilih | null): string | null => {
    if (!g) return null;
    if (!b.mime.includes(g.file.type)) return `Format harus ${b.format.join(', ')}.`;
    if (g.file.size > b.maks_byte) return `Ukuran ${ukuranTeks(g.file.size)}; maksimal ${ukuranTeks(b.maks_byte)}.`;
    if (g.lebar < b.min_px || g.tinggi < b.min_px) return `Gambar ${g.lebar}×${g.tinggi} px; minimal ${b.min_px}×${b.min_px} px.`;
    if (g.lebar > b.maks_px || g.tinggi > b.maks_px) return `Gambar terlalu besar; maksimal ${b.maks_px} px per sisi.`;
    return null;
  };
  const pilihBerkas = async (f: File | undefined) => {
    setGalatBerkas(null);
    if (!f) return;
    if (!b.mime.includes(f.type)) {
      setGalatBerkas(`Format harus ${b.format.join(', ')} (bukan ${f.type || 'tidak dikenal'}).`);
      return;
    }
    try {
      const g = await bacaGambar(f);
      setAsli(g);
      setCara(g.lebar === g.tinggi ? 'asli' : 'bingkai');
    } catch (e) {
      setGalatBerkas((e as Error).message);
    }
  };
  const berubahIdentitas = singkatan.trim() !== (s.singkatan ?? '') || warna.trim().toLowerCase() !== (s.warna_utama ?? '').toLowerCase();
  const rasio = hasil ? (hasil.lebar / hasil.tinggi).toLocaleString('id-ID', { maximumFractionDigits: 2 }) : null;

  return (
    <PanelLangkah
      open
      onOpenChange={(o) => !o && onTutup(false)}
      title="Ganti logo & identitas fakultas"
      description={rapikanNama(data.fakultas.nama)}
      step={langkah}
      onStepChange={setLangkah}
      finishLabel="Simpan & terapkan"
      footerNote="Langsung berlaku di header dasbor, portal, Humas, dan kop dokumen."
      onFinish={async () => {
        if (!hasil && !berubahIdentitas) return 'Belum ada perubahan.';
        try {
          if (hasil) {
            const berkas = await unggah(hasil.file);
            await kirim('POST', `${path}/logo`, { berkas_id: berkas.id, catatan: catatan.trim() || null });
          }
          if (berubahIdentitas) await kirim('PATCH', path, { singkatan: singkatan.trim(), warna_utama: warna.trim() });
          onTutup(true);
          return null;
        } catch (e) {
          const g = galatKolom(e);
          setGalat(g);
          if (g.berkas_id) setLangkah(0);
          else if (g.singkatan || g.warna_utama) setLangkah(1);
          return pesan(e);
        }
      }}
      steps={[
        {
          id: 'logo',
          title: 'Logo',
          description: `${b.format.join(', ')} · maks. ${ukuranTeks(b.maks_byte)} · minimal ${b.min_px}×${b.min_px} px`,
          optional: true,
          error: Boolean(galat.berkas_id),
          validate: () => periksa(hasil),
          content: (
            <div className="u-idp-tumpuk">
              <Field label="Berkas logo" description="Kosongkan bila hanya mengubah nama singkat atau warna." error={galatBerkas ?? galat.berkas_id}>
                <div className="u-idp-aksi">
                  <input ref={masukan} type="file" accept={b.mime.join(',')} hidden onChange={(e) => void pilihBerkas(e.target.files?.[0])} />
                  <Button variant="outline" onClick={() => masukan.current?.click()}>
                    <ImageUp /> {asli ? 'Ganti berkas' : 'Pilih berkas logo'}
                  </Button>
                  {asli ? (
                    <Button variant="ghost" onClick={() => (setAsli(null), setGalatBerkas(null))}>
                      Batalkan berkas
                    </Button>
                  ) : null}
                </div>
              </Field>
              {asli ? (
                <>
                  <Field label="Rasio" description={`Asli ${asli.lebar}×${asli.tinggi} px. Logo tampil di kotak persegi; bingkai menjaga logo utuh, potong mengambil bagian tengah.`}>
                    <SegmentedControl<CaraPotong>
                      aria-label="Rasio logo"
                      value={cara}
                      onValueChange={(v) => setCara(v)}
                      options={[
                        { value: 'asli', label: 'Asli' },
                        { value: 'bingkai', label: 'Bingkai persegi' },
                        { value: 'potong', label: 'Potong persegi' },
                      ]}
                    />
                  </Field>
                  <div className="u-idp-pratinjau" aria-label="Pratinjau logo">
                    <div>
                      <KotakLogo src={hasil?.url} ukuran="xl" papanCatur alt="Pratinjau logo" />
                      <small>Pratinjau</small>
                    </div>
                    <div>
                      <KotakLogo src={hasil?.url} ukuran="md" alt="" />
                      <small>Portal</small>
                    </div>
                    <div>
                      <span className="u-idp-kepala">
                        <KotakLogo src={hasil?.url} ukuran={28} alt="" />
                        {singkatan || 'Fakultas'} UNIPO
                      </span>
                      <small>Header dasbor</small>
                    </div>
                  </div>
                  {hasil ? (
                    <p className="u-idp-nilai">
                      Hasil: {hasil.lebar}×{hasil.tinggi} px · rasio {rasio} · {ukuranTeks(hasil.file.size)}
                    </p>
                  ) : null}
                  {periksa(hasil) ? (
                    <Alert variant="danger" title="Logo belum memenuhi syarat">
                      {periksa(hasil)}
                    </Alert>
                  ) : null}
                </>
              ) : (
                <div className="u-idp-pratinjau">
                  <div>
                    <KotakLogo src={s.logo?.url} ukuran="xl" alt="Logo sekarang" />
                    <small>Logo sekarang</small>
                  </div>
                </div>
              )}
            </div>
          ),
        },
        {
          id: 'identitas',
          title: 'Nama & warna',
          optional: true,
          error: Boolean(galat.singkatan || galat.warna_utama),
          validate: () => (warna.trim() && !/^#[0-9a-f]{6}$/i.test(warna.trim()) ? 'Warna aksen harus berformat #RRGGBB.' : null),
          content: (
            <div className="u-idp-tumpuk">
              <Field label="Nama singkat" optional description="Tampil di header dasbor dan portal, mis. FKIP UNIPO." error={galat.singkatan}>
                <Input value={singkatan} onChange={(e) => setSingkatan(e.target.value)} maxLength={30} placeholder="mis. FKIP" />
              </Field>
              <Field label="Warna aksen" optional description="Dipakai portal bila Tema portal & dasbor belum diatur. Kosong = mengikuti tema." error={galat.warna_utama}>
                <div className="u-idp-aksi">
                  <input type="color" aria-label="Pilih warna aksen" value={/^#[0-9a-f]{6}$/i.test(warna) ? warna : '#1e5aa0'} onChange={(e) => setWarna(e.target.value)} style={{ width: '2.5rem', height: '2.25rem', padding: 0, border: 'none', background: 'none' }} />
                  <Input value={warna} onChange={(e) => setWarna(e.target.value)} maxLength={7} placeholder="#1E5AA0" style={{ maxWidth: '9rem' }} />
                  {warna ? (
                    <Button variant="ghost" size="sm" onClick={() => setWarna('')}>
                      <Palette /> Ikuti tema
                    </Button>
                  ) : null}
                </div>
              </Field>
            </div>
          ),
        },
        {
          id: 'tinjau',
          title: 'Tinjau',
          content: (
            <div className="u-idp-tumpuk">
              <WizardReview
                sections={[
                  {
                    title: 'Logo',
                    onEdit: () => setLangkah(0),
                    items: [{ label: 'Logo baru', value: hasil ? <KotakLogo src={hasil.url} ukuran="md" alt="Logo baru" /> : 'Tidak diganti' }],
                  },
                  {
                    title: 'Nama & warna',
                    onEdit: () => setLangkah(1),
                    items: [
                      { label: 'Nama singkat', value: singkatan.trim() || 'Kosong' },
                      { label: 'Warna aksen', value: warna.trim() || 'Mengikuti tema' },
                    ],
                  },
                ]}
              />
              <Field label="Catatan perubahan" optional description="Tercatat di riwayat versi logo.">
                <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={255} placeholder="mis. Logo baru sesuai SK Rektor tentang lambang fakultas" />
              </Field>
              <Alert variant="info" title="Langsung berlaku">
                Logo dipakai di: {data.dipakai_di.join(', ')}. Versi sekarang tetap tersimpan di riwayat.
              </Alert>
            </div>
          ),
        },
      ]}
    />
  );
}

// ================================================================== usulan data prodi
export interface IsianProdi {
  kode: string;
  label: string;
  grup: string;
  sumber: 'prodi' | 'unit' | 'portal';
  kolom: string;
  tipe: 'teks' | 'paragraf' | 'email' | 'url' | 'telepon' | 'angka';
  maks: number;
  boleh_usul: boolean;
  terkunci: boolean;
  aktif: boolean;
  urut: number;
  keterangan: string | null;
  diubah_oleh?: string | null;
  updated_at?: string | null;
  nilai?: string | null;
  diusulkan_di?: number | null;
}
export interface UsulanProdiRow {
  id: number;
  kode_prodi: string;
  nama_prodi: string | null;
  jenjang: string | null;
  kode_fakultas: string | null;
  nama_fakultas: string | null;
  status: 'diajukan' | 'disetujui' | 'sebagian' | 'ditolak' | 'dibatalkan';
  alasan: string | null;
  berkas_id: string | null;
  berkas_nama: string | null;
  diajukan_oleh: string | null;
  diajukan_at: string | null;
  diputus_oleh: string | null;
  diputus_at: string | null;
  catatan_putus: string | null;
  pemeriksa: TahapPemeriksa[];
  isian?: string[];
  jumlah?: Record<string, number>;
}
interface ButirUsulan {
  id: number;
  isian: string;
  label: string;
  grup: string | null;
  tipe: IsianProdi['tipe'];
  sumber: IsianProdi['sumber'] | null;
  nilai_lama: string | null;
  nilai_baru: string | null;
  nilai_kini: string | null;
  status: 'menunggu' | 'disetujui' | 'ditolak' | 'dibatalkan';
  catatan: string | null;
  diterapkan_at: string | null;
}
type DetailUsulanProdi = UsulanProdiRow & { butir: ButirUsulan[]; boleh_validasi: boolean };

const STATUS_USULAN: Record<UsulanProdiRow['status'], [string, 'info' | 'success' | 'warning' | 'danger' | 'neutral']> = {
  diajukan: ['Menunggu BAAK', 'info'],
  disetujui: ['Disetujui', 'success'],
  sebagian: ['Disetujui sebagian', 'warning'],
  ditolak: ['Ditolak', 'danger'],
  dibatalkan: ['Dibatalkan', 'neutral'],
};
const STATUS_BUTIR: Record<ButirUsulan['status'], [string, 'info' | 'success' | 'danger' | 'neutral']> = {
  menunggu: ['Menunggu', 'info'],
  disetujui: ['Disetujui', 'success'],
  ditolak: ['Ditolak', 'danger'],
  dibatalkan: ['Dibatalkan', 'neutral'],
};
const SUMBER: Record<IsianProdi['sumber'], string> = { prodi: 'Data prodi SIAKAD', unit: 'Unit Organisasi', portal: 'Situs portal prodi' };
const namaProdi = (r: { jenjang?: string | null; nama_prodi?: string | null; kode_prodi: string }) => `${r.jenjang ? `${r.jenjang} ` : ''}${rapikanNama(r.nama_prodi) || r.kode_prodi}`;

function kolomUsulan(baak: boolean): DataColumn<UsulanProdiRow>[] {
  return [
    { key: 'id', header: 'No.', shrink: true, mobile: 'hidden', value: (r) => r.id, cell: (r) => `#${r.id}` },
    { key: 'prodi', header: 'Program studi', mobile: 'title', value: (r) => namaProdi(r), cell: (r) => <strong>{namaProdi(r)}</strong> },
    ...(baak ? [{ key: 'fakultas', header: 'Fakultas', value: (r: UsulanProdiRow) => rapikanNama(r.nama_fakultas) } as DataColumn<UsulanProdiRow>] : []),
    { key: 'isian', header: 'Isian diusulkan', value: (r) => (r.isian ?? []).join(', '), cell: (r) => (r.isian ?? []).join(', ') || '–' },
    { key: 'diajukan', header: 'Diajukan', value: (r) => r.diajukan_at ?? '', cell: (r) => tgl(r.diajukan_at) },
    {
      key: 'status', header: 'Status', mobile: 'badge', value: (r) => STATUS_USULAN[r.status][0],
      cell: (r) => (r.status === 'diajukan' ? <LabelPemeriksa pemeriksa={r.pemeriksa} cadangan={<Badge variant="info">Menunggu BAAK</Badge>} /> : <Badge variant={STATUS_USULAN[r.status][1]}>{STATUS_USULAN[r.status][0]}</Badge>),
    },
  ];
}

export interface UsulanDataProdiProps {
  kodeFakultas: string;
  /** Batasi ke satu prodi. */
  prodi?: string;
  className?: string;
}

/** Fakultas: usulan perubahan data prodi (Kaprodi, izin fakultas.prodi.usul) dan statusnya di BAAK. */
export function UsulanDataProdi({ kodeFakultas, prodi, className }: UsulanDataProdiProps) {
  const basis = `/v1/fakultas/${encodeURIComponent(kodeFakultas)}/prodi-usulan`;
  const q = useSiakadQuery<{ usulan: UsulanProdiRow[]; ringkasan: { diajukan: number }; prodi_boleh: Array<{ kode_prodi: string; nama_prodi: string; jenjang?: string }> }>(
    ['identitas-prodi', 'usulan', kodeFakultas, prodi ?? ''],
    (s, signal) => s.request({ method: 'GET', path: basis, query: prodi ? { prodi } : undefined }, { signal }),
  );
  const [wizard, setWizard] = React.useState(false);
  const [buka, setBuka] = React.useState<number | null>(null);
  const d = q.data;
  return (
    <div className={['u-idp-tumpuk', className].filter(Boolean).join(' ')}>
      <Alert variant="info" title="Perubahan divalidasi BAAK">
        Isian yang boleh diusulkan prodi diatur BAAK. Usulan berlaku setelah BAAK menyetujui setiap isiannya; isian inti (kode, jenjang, nama resmi, SK izin) hanya diubah BAAK.
      </Alert>
      <DataTable
        caption="Usulan perubahan data prodi"
        columns={kolomUsulan(false)}
        rows={d?.usulan}
        rowKey={(r) => String(r.id)}
        loading={q.loading}
        error={d ? undefined : q.error}
        onRetry={q.refetch}
        mobile="cards"
        onRowClick={(r) => setBuka(r.id)}
        toolbar={
          d?.prodi_boleh.length ? (
            <Button onClick={() => setWizard(true)}>
              <Plus /> Usulkan perubahan
            </Button>
          ) : undefined
        }
        empty={{ title: 'Belum ada usulan', description: 'Usulkan perubahan visi, misi, kontak, gelar, atau data prodi lain yang diizinkan BAAK.' }}
      />
      {wizard && d ? (
        <WizardUsulanProdi
          basis={basis}
          pilihanProdi={d.prodi_boleh}
          prodiAwal={prodi}
          onTutup={(id) => {
            setWizard(false);
            if (id) setBuka(id);
          }}
        />
      ) : null}
      {buka !== null ? <PanelUsulanProdi path={`${basis}/${buka}`} bolehBatal onTutup={() => setBuka(null)} /> : null}
    </div>
  );
}

function WizardUsulanProdi({
  basis,
  pilihanProdi,
  prodiAwal,
  onTutup,
}: {
  basis: string;
  pilihanProdi: Array<{ kode_prodi: string; nama_prodi: string; jenjang?: string }>;
  prodiAwal?: string;
  onTutup: (idBaru?: number) => void;
}) {
  const s = useSiakad();
  const [langkah, setLangkah] = React.useState(0);
  const [prodi, setProdi] = React.useState<string | null>(prodiAwal ?? (pilihanProdi.length === 1 ? pilihanProdi[0]!.kode_prodi : null));
  const acuan = useSiakadQuery<{ prodi: { kode_prodi: string; nama_prodi: string; jenjang: string }; isian: IsianProdi[]; situs_portal: { kode: string; nama: string } | null }>(
    ['identitas-prodi', 'acuan', basis, prodi ?? ''],
    (x, signal) => x.request({ method: 'GET', path: `${basis}/acuan`, query: { prodi: prodi ?? '' } }, { signal }),
    { enabled: Boolean(prodi) },
  );
  const [pilih, setPilih] = React.useState<string[]>([]);
  const [nilai, setNilai] = React.useState<Record<string, string>>({});
  const [alasan, setAlasan] = React.useState('');
  const [berkas, setBerkas] = React.useState<string | null>(null);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    setPilih([]);
    setNilai({});
  }, [prodi]);
  const isian = acuan.data?.isian ?? [];
  const bolehUsul = isian.filter((i) => i.boleh_usul && !i.terkunci);
  const hanyaBaak = isian.filter((i) => !i.boleh_usul || i.terkunci);
  const dipilih = bolehUsul.filter((i) => pilih.includes(i.kode));
  const grup = Array.from(new Set(bolehUsul.map((i) => i.grup)));

  return (
    <PanelLangkah
      open
      onOpenChange={(o) => !o && onTutup()}
      title="Usulkan perubahan data prodi"
      description={acuan.data ? namaProdi({ ...acuan.data.prodi }) : 'Divalidasi BAAK per isian'}
      size="lg"
      step={langkah}
      onStepChange={setLangkah}
      finishLabel={
        <>
          <Send /> Ajukan ke BAAK
        </>
      }
      onFinish={async () => {
        try {
          const r = await s.request<UsulanProdiRow>({
            method: 'POST',
            path: basis,
            body: { kode_prodi: prodi, alasan: alasan.trim() || null, berkas_id: berkas, butir: dipilih.map((i) => ({ isian: i.kode, nilai: nilai[i.kode] ?? '' })) },
          });
          invalidateSiakad('identitas-prodi');
          onTutup(r.data.id);
          return null;
        } catch (e) {
          const g = galatKolom(e);
          setGalat(g);
          if (Object.keys(g).some((k) => k.startsWith('butir.'))) setLangkah(1);
          return pesan(e);
        }
      }}
      steps={[
        {
          id: 'isian',
          title: 'Pilih isian',
          validate: () => (!prodi ? 'Pilih program studi.' : !pilih.length ? 'Pilih minimal satu isian yang akan diubah.' : null),
          content: (
            <div className="u-idp-tumpuk">
              {pilihanProdi.length > 1 ? (
                <Field label="Program studi" required>
                  <Pilihan
                    aria-label="Program studi"
                    placeholder="Pilih…"
                    value={prodi}
                    onValueChange={setProdi}
                    options={pilihanProdi.map((p) => ({ value: p.kode_prodi, label: namaProdi(p) }))}
                  />
                </Field>
              ) : null}
              {acuan.error ? <Alert variant="danger">{pesan(acuan.error)}</Alert> : null}
              {prodi && acuan.loading ? <p className="u-idp-nilai" data-kosong="">Memuat isian…</p> : null}
              {grup.map((g) => (
                <Field key={g} label={g}>
                  <CheckboxGroup
                    value={pilih.filter((k) => bolehUsul.some((i) => i.kode === k && i.grup === g))}
                    onValueChange={(v) => setPilih((x) => [...x.filter((k) => !bolehUsul.some((i) => i.kode === k && i.grup === g)), ...v])}
                    options={bolehUsul
                      .filter((i) => i.grup === g)
                      .map((i) => ({
                        value: i.kode,
                        label: i.label,
                        disabled: i.diusulkan_di != null,
                        description: i.diusulkan_di != null ? `Sedang diusulkan (usulan #${i.diusulkan_di})` : (i.keterangan ?? undefined),
                      }))}
                  />
                </Field>
              ))}
              {hanyaBaak.length ? (
                <Field label="Hanya BAAK" description="Isian ini tidak bisa diusulkan prodi; hubungi BAAK bila perlu diubah.">
                  <div className="u-idp-isian-kunci">
                    {hanyaBaak.map((i) => (
                      <Badge key={i.kode} variant="neutral">
                        <Lock aria-hidden size={12} /> {i.label}
                      </Badge>
                    ))}
                  </div>
                </Field>
              ) : null}
            </div>
          ),
        },
        {
          id: 'nilai',
          title: 'Nilai baru',
          error: Object.keys(galat).some((k) => k.startsWith('butir.')),
          validate: () => {
            for (const i of dipilih) {
              const v = (nilai[i.kode] ?? '').trim();
              if (i.sumber === 'prodi' && !v) return `${i.label} wajib diisi.`;
              if (v === (i.nilai ?? '')) return `${i.label} sama dengan nilai sekarang.`;
              if (v.length > i.maks) return `${i.label} maksimal ${i.maks} karakter.`;
              if (v && i.tipe === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `${i.label}: alamat email tidak valid.`;
              if (v && i.tipe === 'url' && !/^https?:\/\/\S+\.\S+$/i.test(v)) return `${i.label}: tulis alamat lengkap http(s)://.`;
            }
            return null;
          },
          content: (
            <div className="u-idp-tumpuk">
              {dipilih.map((i) => (
                <div key={i.kode} className="u-idp-butir">
                  <header>
                    <strong>{i.label}</strong>
                    <Badge variant="neutral">{SUMBER[i.sumber]}</Badge>
                  </header>
                  <div className="u-idp-banding">
                    <div>
                      <span>Nilai sekarang</span>
                      <Nilai v={i.nilai} />
                    </div>
                    <Field label="Nilai baru" required={i.sumber === 'prodi'} error={galat[`butir.${i.kode}`]} description={i.keterangan ?? undefined}>
                      {i.tipe === 'paragraf' ? (
                        <Textarea rows={5} maxLength={i.maks} value={nilai[i.kode] ?? ''} onChange={(e) => setNilai((x) => ({ ...x, [i.kode]: e.target.value }))} placeholder={i.nilai ? 'Tulis nilai pengganti' : `Tulis ${i.label.toLowerCase()}`} />
                      ) : (
                        <Input
                          type={i.tipe === 'email' ? 'email' : i.tipe === 'url' ? 'url' : 'text'}
                          inputMode={i.tipe === 'telepon' || i.tipe === 'angka' ? 'tel' : undefined}
                          maxLength={i.maks}
                          value={nilai[i.kode] ?? ''}
                          onChange={(e) => setNilai((x) => ({ ...x, [i.kode]: e.target.value }))}
                          placeholder={i.nilai ?? `Tulis ${i.label.toLowerCase()}`}
                        />
                      )}
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          ),
        },
        {
          id: 'dasar',
          title: 'Dasar & lampiran',
          optional: true,
          content: (
            <div className="u-idp-tumpuk">
              <Field label="Alasan / dasar perubahan" optional description="mis. hasil rapat prodi, SK Dekan, atau penyesuaian akreditasi.">
                <Textarea rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} maxLength={5000} placeholder="mis. Penyesuaian visi dan misi hasil rapat prodi 12 November 2026" />
              </Field>
              <Field label="Lampiran" optional description="SK, notulen rapat, atau dokumen pendukung (PDF/gambar).">
                <PilihBerkas value={berkas} onValueChange={(v) => setBerkas(v)} accept=".pdf,.jpg,.jpeg,.png" modul="baak" />
              </Field>
            </div>
          ),
        },
        {
          id: 'tinjau',
          title: 'Tinjau & ajukan',
          content: (
            <div className="u-idp-tumpuk">
              <WizardReview
                sections={[
                  ...dipilih.map((i) => ({
                    title: i.label,
                    onEdit: () => setLangkah(1),
                    items: [
                      { label: 'Sekarang', value: i.nilai || 'Kosong' },
                      { label: 'Usulan', value: (nilai[i.kode] ?? '').trim() || 'Kosongkan' },
                    ],
                  })),
                  { title: 'Dasar', onEdit: () => setLangkah(2), items: [{ label: 'Alasan', value: alasan.trim() || '–' }, { label: 'Lampiran', value: berkas ? 'Ada' : 'Tanpa lampiran' }] },
                ]}
              />
              <Alert variant="info" title="Setelah diajukan">
                BAAK memeriksa setiap isian dan bisa menyetujui sebagian. Isian yang disetujui langsung berlaku di SIAKAD dan portal prodi.
              </Alert>
            </div>
          ),
        },
      ]}
    />
  );
}

/** Rincian satu usulan (Fakultas: lihat & batalkan). */
function PanelUsulanProdi({ path, bolehBatal, onTutup }: { path: string; bolehBatal?: boolean; onTutup: () => void }) {
  const q = useSiakadQuery<DetailUsulanProdi>(['identitas-prodi', 'detail', path], (s, signal) => s.request<DetailUsulanProdi>({ method: 'GET', path }, { signal }));
  const { kirim, sibuk } = useKirim(['identitas-prodi']);
  const toast = useToast();
  const buka = useBukaBerkas();
  const d = q.data;
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onTutup()}
      size="lg"
      title={d ? `Usulan #${d.id} · ${namaProdi(d)}` : 'Usulan perubahan data prodi'}
      description={d ? `Diajukan ${waktu(d.diajukan_at)}` : undefined}
      footer={
        d && bolehBatal && d.status === 'diajukan' ? (
          <Button
            variant="destructive-soft"
            loading={sibuk}
            onClick={async () => {
              try {
                await kirim('POST', `${path}/batal`, {}, 'Usulan dibatalkan');
                q.refetch();
              } catch (e) {
                toast.add({ title: 'Belum berhasil', description: pesan(e), type: 'error' });
              }
            }}
          >
            <Undo2 /> Batalkan usulan
          </Button>
        ) : undefined
      }
    >
      {q.error && !d ? <Alert variant="danger">{pesan(q.error)}</Alert> : null}
      {d ? (
        <div className="u-idp-tumpuk">
          <AlurPemeriksa pemeriksa={d.pemeriksa} ringkas />
          {d.catatan_putus ? (
            <Alert variant={d.status === 'ditolak' ? 'danger' : 'info'} title="Catatan BAAK">
              {d.catatan_putus}
            </Alert>
          ) : null}
          {d.butir.map((b) => (
            <div key={b.id} className="u-idp-butir">
              <header>
                <strong>{b.label}</strong>
                <Badge variant={STATUS_BUTIR[b.status][1]}>{STATUS_BUTIR[b.status][0]}</Badge>
              </header>
              <div className="u-idp-banding">
                <div>
                  <span>Saat diajukan</span>
                  <Nilai v={b.nilai_lama} />
                </div>
                <div>
                  <span>Usulan</span>
                  <Nilai v={b.nilai_baru} baru />
                </div>
              </div>
              {b.catatan ? <p className="u-idp-nilai">Catatan BAAK: {b.catatan}</p> : null}
            </div>
          ))}
          <DescriptionList
            items={[
              { label: 'Alasan', value: d.alasan || '–' },
              {
                label: 'Lampiran',
                value: d.berkas_id ? (
                  <Button variant="outline" size="sm" onClick={() => void buka(`${path}/berkas`)}>
                    <Download /> {d.berkas_nama ?? 'Lihat lampiran'}
                  </Button>
                ) : (
                  'Tanpa lampiran'
                ),
              },
            ]}
          />
        </div>
      ) : null}
    </Sheet>
  );
}

// ================================================================== BAAK: antrean & keputusan
export interface AntreanUsulanProdiProps {
  /** Buka langsung usulan ini (mis. dari notifikasi ?usulan=). */
  bukaId?: number | null;
  className?: string;
}

/** BAAK » Fakultas & prodi » Usulan perubahan: antrean semua fakultas, keputusan per isian. */
export function AntreanUsulanProdi({ bukaId, className }: AntreanUsulanProdiProps) {
  const [status, setStatus] = React.useState<'diajukan' | 'semua'>('diajukan');
  const q = useSiakadQuery<{ usulan: UsulanProdiRow[]; ringkasan: { diajukan: number }; boleh_validasi: boolean }>(['identitas-prodi', 'antrean', status], (s, signal) =>
    s.request({ method: 'GET', path: '/v1/master/fakultas-prodi/usulan', query: status === 'semua' ? undefined : { status } }, { signal }),
  );
  const [buka, setBuka] = React.useState<number | null>(bukaId ?? null);
  const d = q.data;
  return (
    <div className={['u-idp-tumpuk', className].filter(Boolean).join(' ')}>
      <DataTable
        caption="Antrean usulan perubahan data prodi"
        columns={kolomUsulan(true)}
        rows={d?.usulan}
        rowKey={(r) => String(r.id)}
        loading={q.loading}
        error={d ? undefined : q.error}
        onRetry={q.refetch}
        mobile="cards"
        onRowClick={(r) => setBuka(r.id)}
        toolbar={
          <SegmentedControl
            aria-label="Status usulan"
            value={status}
            onValueChange={(v) => setStatus(v as 'diajukan' | 'semua')}
            options={[
              { value: 'diajukan', label: 'Menunggu' },
              { value: 'semua', label: 'Semua' },
            ]}
          />
        }
        empty={{ title: status === 'diajukan' ? 'Tidak ada usulan yang menunggu' : 'Belum ada usulan', description: 'Usulan datang dari Kaprodi lewat dasbor Fakultas.' }}
      />
      {buka !== null ? <PanelPutusUsulanProdi id={buka} onTutup={() => setBuka(null)} /> : null}
    </div>
  );
}

function PanelPutusUsulanProdi({ id, onTutup }: { id: number; onTutup: () => void }) {
  const path = `/v1/master/fakultas-prodi/usulan/${id}`;
  const q = useSiakadQuery<DetailUsulanProdi>(['identitas-prodi', 'detail', path], (s, signal) => s.request<DetailUsulanProdi>({ method: 'GET', path }, { signal }));
  const { kirim } = useKirim(['identitas-prodi', 'master/fakultas-prodi']);
  const buka = useBukaBerkas();
  const [langkah, setLangkah] = React.useState(0);
  const [putus, setPutus] = React.useState<Record<number, { keputusan?: 'setujui' | 'tolak'; catatan: string }>>({});
  const [catatan, setCatatan] = React.useState('');
  const d = q.data;
  if (d && !d.boleh_validasi) return <PanelUsulanProdi path={path} onTutup={onTutup} />;
  const menunggu = (d?.butir ?? []).filter((b) => b.status === 'menunggu');
  const setuju = menunggu.filter((b) => putus[b.id]?.keputusan === 'setujui');
  return (
    <PanelLangkah
      open
      onOpenChange={(o) => !o && onTutup()}
      size="lg"
      title={d ? `Usulan #${d.id} · ${namaProdi(d)}` : 'Usulan perubahan data prodi'}
      description={d ? `${rapikanNama(d.nama_fakultas)} · diajukan ${waktu(d.diajukan_at)}` : undefined}
      step={langkah}
      onStepChange={setLangkah}
      finishLabel="Simpan keputusan"
      footerNote="Isian yang disetujui langsung ditulis ke sumber datanya."
      onFinish={async () => {
        try {
          await kirim('POST', `${path}/putuskan`, { butir: menunggu.map((b) => ({ id: b.id, keputusan: putus[b.id]?.keputusan, catatan: putus[b.id]?.catatan ?? '' })), catatan: catatan.trim() || null }, 'Keputusan disimpan');
          onTutup();
          return null;
        } catch (e) {
          return pesan(e);
        }
      }}
      steps={[
        {
          id: 'periksa',
          title: 'Periksa per isian',
          validate: () => {
            for (const b of menunggu) {
              const p = putus[b.id];
              if (!p?.keputusan) return `Putuskan isian ${b.label}.`;
              if (p.keputusan === 'tolak' && p.catatan.trim().length < 3) return `Tulis alasan penolakan ${b.label}.`;
            }
            return null;
          },
          content: !d ? (
            <p className="u-idp-nilai" data-kosong="">
              Memuat…
            </p>
          ) : (
            <div className="u-idp-tumpuk">
              <AlurPemeriksa pemeriksa={d.pemeriksa} ringkas />
              <DescriptionList
                items={[
                  { label: 'Alasan prodi', value: d.alasan || '–' },
                  {
                    label: 'Lampiran',
                    value: d.berkas_id ? (
                      <Button variant="outline" size="sm" onClick={() => void buka(`${path}/berkas`)}>
                        <Download /> {d.berkas_nama ?? 'Lihat lampiran'}
                      </Button>
                    ) : (
                      'Tanpa lampiran'
                    ),
                  },
                ]}
              />
              {menunggu.map((b) => {
                const p = putus[b.id] ?? { catatan: '' };
                const atur = (x: Partial<typeof p>) => setPutus((s) => ({ ...s, [b.id]: { ...p, ...x } }));
                return (
                  <div key={b.id} className="u-idp-butir" data-putusan={p.keputusan}>
                    <header>
                      <strong>{b.label}</strong>
                      <Badge variant="neutral">{b.sumber ? SUMBER[b.sumber] : b.grup}</Badge>
                    </header>
                    <div className="u-idp-banding">
                      <div>
                        <span>Nilai sekarang{b.nilai_kini !== b.nilai_lama ? ' (berubah sejak diajukan)' : ''}</span>
                        <Nilai v={b.nilai_kini} />
                      </div>
                      <div>
                        <span>Usulan prodi</span>
                        <Nilai v={b.nilai_baru} baru />
                      </div>
                    </div>
                    <SegmentedControl
                      aria-label={`Keputusan ${b.label}`}
                      value={p.keputusan ?? ''}
                      onValueChange={(v) => atur({ keputusan: v as 'setujui' | 'tolak' })}
                      options={[
                        { value: 'setujui', label: 'Setujui' },
                        { value: 'tolak', label: 'Tolak' },
                      ]}
                    />
                    {p.keputusan === 'tolak' ? (
                      <Field label="Alasan penolakan" required>
                        <Input value={p.catatan} onChange={(e) => atur({ catatan: e.target.value })} maxLength={2000} placeholder="mis. Belum selaras dengan visi fakultas" />
                      </Field>
                    ) : null}
                  </div>
                );
              })}
              {!menunggu.length ? <Alert variant="info">Usulan ini sudah diputus.</Alert> : null}
            </div>
          ),
        },
        {
          id: 'ringkasan',
          title: 'Ringkasan',
          content: (
            <div className="u-idp-tumpuk">
              <WizardReview
                sections={[
                  { title: 'Disetujui', onEdit: () => setLangkah(0), items: setuju.length ? setuju.map((b) => ({ label: b.label, value: <CircleCheck aria-label="Disetujui" size={16} /> })) : [{ label: 'Tidak ada' }] },
                  {
                    title: 'Ditolak',
                    onEdit: () => setLangkah(0),
                    items: menunggu.filter((b) => putus[b.id]?.keputusan === 'tolak').map((b) => ({ label: b.label, value: putus[b.id]?.catatan })),
                  },
                ]}
              />
              <Field label="Catatan untuk prodi" optional>
                <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={5000} placeholder="mis. Silakan perbaiki misi lalu ajukan lagi" />
              </Field>
              <Alert variant={setuju.length ? 'success' : 'warning'} icon={setuju.length ? <ShieldCheck /> : <CircleX />}>
                {setuju.length
                  ? `${setuju.length} isian akan langsung berlaku di SIAKAD, unit Organisasi, atau portal prodi; tercatat di log.`
                  : 'Semua isian ditolak; data prodi tidak berubah.'}
              </Alert>
            </div>
          ),
        },
      ]}
    />
  );
}

/** BAAK: isian data prodi yang boleh diusulkan prodi dan yang hanya BAAK (data, bukan kode). */
export function AturIsianProdi({ className }: { className?: string }) {
  const q = useSiakadQuery<{ isian: IsianProdi[]; boleh_kelola: boolean }>(['identitas-prodi', 'isian'], (s, signal) => s.request({ method: 'GET', path: '/v1/master/fakultas-prodi/isian' }, { signal }));
  const [ubah, setUbah] = React.useState<IsianProdi | null>(null);
  const boleh = Boolean(q.data?.boleh_kelola);
  const kolom: DataColumn<IsianProdi>[] = [
    { key: 'label', header: 'Isian', mobile: 'title', value: (r) => r.label, cell: (r) => <strong>{r.label}</strong> },
    { key: 'grup', header: 'Grup', value: (r) => r.grup },
    { key: 'sumber', header: 'Ditulis ke', value: (r) => SUMBER[r.sumber] },
    {
      key: 'hak', header: 'Pengubah', mobile: 'badge', value: (r) => (r.terkunci ? 'Terkunci' : r.boleh_usul ? 'Prodi (divalidasi BAAK)' : 'Hanya BAAK'),
      cell: (r) =>
        r.terkunci ? (
          <Badge variant="neutral">
            <Lock aria-hidden size={12} /> Terkunci
          </Badge>
        ) : r.boleh_usul ? (
          <Badge variant="info">Prodi, divalidasi BAAK</Badge>
        ) : (
          <Badge variant="warning">Hanya BAAK</Badge>
        ),
    },
    { key: 'aktif', header: 'Aktif', shrink: true, value: (r) => (r.aktif ? 'Ya' : 'Tidak'), cell: (r) => (r.aktif ? 'Ya' : <Badge variant="neutral">Nonaktif</Badge>) },
    { key: 'keterangan', header: 'Keterangan', defaultHidden: true, value: (r) => r.keterangan ?? '' },
  ];
  return (
    <div className={['u-idp-tumpuk', className].filter(Boolean).join(' ')}>
      <DataTable
        caption="Isian data prodi"
        columns={kolom}
        rows={q.data?.isian}
        rowKey={(r) => r.kode}
        loading={q.loading}
        error={q.data ? undefined : q.error}
        onRetry={q.refetch}
        pagination={false}
        mobile="cards"
        onRowClick={boleh ? (r) => setUbah(r) : undefined}
        rowActions={(r) => (boleh ? [{ label: 'Atur isian', icon: <BadgeCheck />, onSelect: () => setUbah(r) }] : [])}
      />
      {ubah ? <PanelAturIsian isian={ubah} onTutup={() => setUbah(null)} /> : null}
    </div>
  );
}

function PanelAturIsian({ isian, onTutup }: { isian: IsianProdi; onTutup: () => void }) {
  const { kirim, sibuk } = useKirim(['identitas-prodi']);
  const [label, setLabel] = React.useState(isian.label);
  const [ket, setKet] = React.useState(isian.keterangan ?? '');
  const [usul, setUsul] = React.useState(isian.boleh_usul);
  const [aktif, setAktif] = React.useState(isian.aktif);
  const [galat, setGalat] = React.useState<string | null>(null);
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onTutup()}
      title={`Atur isian: ${isian.label}`}
      description={`Ditulis ke ${SUMBER[isian.sumber]} (${isian.kolom})`}
      footer={
        <>
          <Button variant="ghost" onClick={onTutup}>
            Batal
          </Button>
          <Button
            loading={sibuk}
            onClick={async () => {
              try {
                await kirim('PUT', `/v1/master/fakultas-prodi/isian/${isian.kode}`, { label, keterangan: ket, boleh_usul: usul, aktif }, 'Isian disimpan');
                onTutup();
              } catch (e) {
                setGalat(Object.values(galatKolom(e))[0] ?? pesan(e));
              }
            }}
          >
            Simpan
          </Button>
        </>
      }
    >
      <div className="u-idp-tumpuk">
        {galat ? <Alert variant="danger">{galat}</Alert> : null}
        <Field label="Label" required>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={100} placeholder="mis. Visi" />
        </Field>
        <Field label="Keterangan untuk prodi" optional>
          <Textarea rows={2} value={ket} onChange={(e) => setKet(e.target.value)} maxLength={255} placeholder="mis. Satu paragraf; tampil di portal prodi" />
        </Field>
        <Field label="Prodi boleh mengusulkan" description={isian.terkunci ? 'Terkunci: mengubahnya ikut mengubah kode di semua data SIAKAD lama.' : 'Mati = hanya BAAK yang mengubah isian ini.'}>
          <Switch checked={usul} disabled={isian.terkunci} onCheckedChange={(v) => setUsul(Boolean(v))} aria-label="Prodi boleh mengusulkan" />
        </Field>
        <Field label="Aktif" description="Isian nonaktif tidak tampil di wizard usulan.">
          <Switch checked={aktif} onCheckedChange={(v) => setAktif(Boolean(v))} aria-label="Aktif" />
        </Field>
      </div>
    </Sheet>
  );
}

// ================================================================== usulan akreditasi
interface AkreditasiTerkiniRingkas {
  lembaga_singkatan?: string | null;
  lembaga_nama?: string | null;
  peringkat?: string | null;
  nomor_sk?: string | null;
  tanggal_sk?: string | null;
  berlaku_sampai?: string | null;
  keadaan_label?: string | null;
}
export interface UsulanAkreditasiRow {
  id: number;
  kode_prodi: string;
  nama_prodi: string | null;
  kode_jenjang: string | null;
  kode_fakultas: string | null;
  nama_fakultas: string | null;
  lembaga: string;
  lembaga_nama: string;
  peringkat: string;
  peringkat_nama: string;
  nomor_sk: string | null;
  tanggal_sk: string | null;
  berlaku_mulai: string | null;
  berlaku_sampai: string | null;
  berkas_id: string | null;
  berkas_nama: string | null;
  catatan: string | null;
  status: 'diajukan' | 'disetujui' | 'ditolak' | 'dibatalkan';
  diajukan_oleh: string | null;
  diajukan_at: string | null;
  diputus_at: string | null;
  catatan_putus: string | null;
  akreditasi_id: number | null;
  pemeriksa: TahapPemeriksa[];
}
type DetailUsulanAkreditasi = UsulanAkreditasiRow & { terkini: AkreditasiTerkiniRingkas | null; hak: { lihat: boolean; ajukan: boolean; validasi: boolean; putuskan: boolean } };
interface AcuanAkreditasi {
  prodi: { kode_prodi: string; nama_prodi: string } | null;
  terkini: AkreditasiTerkiniRingkas | null;
  lembaga: Array<{ kode: string; nama: string; singkatan: string | null }>;
  peringkat: Array<{ kode: string; nama: string; status: string; keterangan: string | null }>;
  menunggu: number | null;
  hak: { lihat: boolean; ajukan: boolean; validasi: boolean };
}
const STATUS_AKRED: Record<UsulanAkreditasiRow['status'], [string, 'info' | 'success' | 'danger' | 'neutral']> = {
  diajukan: ['Menunggu SPMI', 'info'],
  disetujui: ['Disetujui', 'success'],
  ditolak: ['Ditolak', 'danger'],
  dibatalkan: ['Dibatalkan', 'neutral'],
};
const JENJANG: Record<string, string> = { A: 'S3', B: 'S2', C: 'S1', D: 'D4', E: 'D3', F: 'D2', G: 'D1', J: 'Profesi' };
const prodiAkred = (r: { kode_jenjang?: string | null; nama_prodi?: string | null; kode_prodi: string }) => namaProdi({ jenjang: r.kode_jenjang ? (JENJANG[r.kode_jenjang] ?? null) : null, nama_prodi: r.nama_prodi, kode_prodi: r.kode_prodi });
const teksTerkini = (t?: AkreditasiTerkiniRingkas | null) =>
  t ? `${t.lembaga_singkatan ?? t.lembaga_nama ?? ''} ${t.peringkat ?? ''}${t.berlaku_sampai ? ` · berlaku s.d. ${tgl(t.berlaku_sampai)}` : ''}${t.keadaan_label ? ` (${t.keadaan_label})` : ''}`.trim() : 'Belum diisi';

function kolomAkred(spmi: boolean): DataColumn<UsulanAkreditasiRow>[] {
  return [
    { key: 'id', header: 'No.', shrink: true, mobile: 'hidden', value: (r) => r.id, cell: (r) => `#${r.id}` },
    { key: 'prodi', header: 'Program studi', mobile: 'title', value: (r) => prodiAkred(r), cell: (r) => <strong>{prodiAkred(r)}</strong> },
    ...(spmi ? [{ key: 'fakultas', header: 'Fakultas', value: (r: UsulanAkreditasiRow) => rapikanNama(r.nama_fakultas) } as DataColumn<UsulanAkreditasiRow>] : []),
    { key: 'usulan', header: 'Usulan', value: (r) => `${r.lembaga_nama} ${r.peringkat_nama}`, cell: (r) => `${r.lembaga_nama} · ${r.peringkat_nama}` },
    { key: 'sk', header: 'Nomor SK', value: (r) => r.nomor_sk ?? '', cell: (r) => r.nomor_sk ?? '–' },
    { key: 'berlaku', header: 'Berlaku s.d.', value: (r) => r.berlaku_sampai ?? '', cell: (r) => tgl(r.berlaku_sampai) },
    {
      key: 'status', header: 'Status', mobile: 'badge', value: (r) => STATUS_AKRED[r.status][0],
      cell: (r) => (r.status === 'diajukan' ? <LabelPemeriksa pemeriksa={r.pemeriksa} cadangan={<Badge variant="info">Menunggu SPMI</Badge>} /> : <Badge variant={STATUS_AKRED[r.status][1]}>{STATUS_AKRED[r.status][0]}</Badge>),
    },
  ];
}

export interface UsulanAkreditasiProdiProps {
  /** Prodi yang boleh diusulkan pengguna ini (mis. prodi berizin fakultas.akreditasi.kelola). */
  pilihanProdi: Array<{ kode_prodi: string; nama_prodi: string; jenjang?: string | null }>;
  /** Saring daftar ke fakultas ini. */
  kodeFakultas?: string;
  className?: string;
}

/** Fakultas » Akreditasi: usulan pembaruan status akreditasi prodi ke SPMI. */
export function UsulanAkreditasiProdi({ pilihanProdi, kodeFakultas, className }: UsulanAkreditasiProdiProps) {
  const q = useSiakadQuery<{ usulan: UsulanAkreditasiRow[] }>(['identitas-prodi', 'akreditasi', kodeFakultas ?? ''], (s, signal) =>
    s.request({ method: 'GET', path: '/v1/spmi/akreditasi-usulan', query: kodeFakultas ? { fakultas: kodeFakultas } : undefined }, { signal }),
  );
  const [wizard, setWizard] = React.useState(false);
  const [buka, setBuka] = React.useState<number | null>(null);
  return (
    <div className={['u-idp-tumpuk', className].filter(Boolean).join(' ')}>
      <DataTable
        caption="Usulan status akreditasi"
        columns={kolomAkred(false)}
        rows={q.data?.usulan}
        rowKey={(r) => String(r.id)}
        loading={q.loading}
        error={q.data ? undefined : q.error}
        onRetry={q.refetch}
        mobile="cards"
        onRowClick={(r) => setBuka(r.id)}
        toolbar={
          pilihanProdi.length ? (
            <Button onClick={() => setWizard(true)}>
              <Plus /> Usulkan pembaruan akreditasi
            </Button>
          ) : undefined
        }
        empty={{ title: 'Belum ada usulan akreditasi', description: 'Ajukan hasil akreditasi terbaru (lembaga, peringkat, SK, sertifikat) untuk divalidasi SPMI.' }}
      />
      {wizard ? (
        <WizardUsulanAkreditasi
          pilihanProdi={pilihanProdi}
          onTutup={(id) => {
            setWizard(false);
            if (id) setBuka(id);
          }}
        />
      ) : null}
      {buka !== null ? <PanelUsulanAkreditasi id={buka} onTutup={() => setBuka(null)} /> : null}
    </div>
  );
}

function WizardUsulanAkreditasi({ pilihanProdi, onTutup }: { pilihanProdi: UsulanAkreditasiProdiProps['pilihanProdi']; onTutup: (id?: number) => void }) {
  const s = useSiakad();
  const [langkah, setLangkah] = React.useState(0);
  const [prodi, setProdi] = React.useState<string | null>(pilihanProdi.length === 1 ? pilihanProdi[0]!.kode_prodi : null);
  const acuan = useSiakadQuery<AcuanAkreditasi>(['identitas-prodi', 'akreditasi-acuan', prodi ?? ''], (x, signal) => x.request({ method: 'GET', path: `/v1/spmi/akreditasi-usulan/acuan/${prodi}` }, { signal }), {
    enabled: Boolean(prodi),
  });
  const [isi, setIsi] = React.useState({ lembaga: null as string | null, peringkat: null as string | null, nomor_sk: '', tanggal_sk: '', berlaku_mulai: '', berlaku_sampai: '', catatan: '' });
  const [berkas, setBerkas] = React.useState<string | null>(null);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const a = acuan.data;
  const per = a?.peringkat.find((p) => p.kode === isi.peringkat);
  const tanpaSk = per?.status === 'tidak_terakreditasi';
  const atur = (k: keyof typeof isi, v: string | null) => setIsi((x) => ({ ...x, [k]: v }));
  const LANGKAH: Record<string, number> = { lembaga: 0, peringkat: 0, nomor_sk: 1, tanggal_sk: 1, berlaku_mulai: 1, berlaku_sampai: 1, berkas_id: 2 };
  return (
    <PanelLangkah
      open
      onOpenChange={(o) => !o && onTutup()}
      title="Usulkan pembaruan akreditasi"
      description="Divalidasi SPMI sebelum menjadi status akreditasi resmi"
      step={langkah}
      onStepChange={setLangkah}
      finishLabel={
        <>
          <Send /> Ajukan ke SPMI
        </>
      }
      onFinish={async () => {
        try {
          const r = await s.request<UsulanAkreditasiRow>({ method: 'POST', path: '/v1/spmi/akreditasi-usulan', body: { kode_prodi: prodi, ...isi, berkas_id: berkas } });
          invalidateSiakad('identitas-prodi');
          onTutup(r.data.id);
          return null;
        } catch (e) {
          const g = galatKolom(e);
          setGalat(g);
          const k = Object.keys(g)[0];
          if (k && LANGKAH[k] !== undefined) setLangkah(LANGKAH[k]!);
          return pesan(e);
        }
      }}
      steps={[
        {
          id: 'status',
          title: 'Lembaga & peringkat',
          error: Boolean(galat.lembaga || galat.peringkat),
          validate: () =>
            !prodi ? 'Pilih program studi.' : a?.menunggu ? `Masih ada usulan #${a.menunggu} yang menunggu SPMI.` : !isi.lembaga ? 'Pilih lembaga akreditasi.' : !isi.peringkat ? 'Pilih peringkat.' : null,
          content: (
            <div className="u-idp-tumpuk">
              <Field label="Program studi" required>
                <Pilihan aria-label="Program studi" placeholder="Pilih…" value={prodi} onValueChange={setProdi} options={pilihanProdi.map((p) => ({ value: p.kode_prodi, label: namaProdi(p) }))} />
              </Field>
              {a ? (
                <Alert variant={a.menunggu ? 'warning' : 'neutral'} title="Status resmi sekarang (SPMI)">
                  {teksTerkini(a.terkini)}
                  {a.menunggu ? ` · usulan #${a.menunggu} masih menunggu validasi SPMI.` : ''}
                </Alert>
              ) : null}
              <FormGrid columns={2}>
                <Field label="Lembaga akreditasi" required error={galat.lembaga}>
                  <Pilihan aria-label="Lembaga akreditasi" placeholder="Pilih…" tampilan="cari" value={isi.lembaga} onValueChange={(v) => atur('lembaga', v)} options={(a?.lembaga ?? []).map((l) => ({ value: l.kode, label: l.singkatan ?? l.nama }))} />
                </Field>
                <Field label="Peringkat" required error={galat.peringkat} description={per?.keterangan ?? undefined}>
                  <Pilihan aria-label="Peringkat" placeholder="Pilih…" value={isi.peringkat} onValueChange={(v) => atur('peringkat', v)} options={(a?.peringkat ?? []).map((p) => ({ value: p.kode, label: p.nama }))} />
                </Field>
              </FormGrid>
            </div>
          ),
        },
        {
          id: 'sk',
          title: 'SK & masa berlaku',
          error: Boolean(galat.nomor_sk || galat.tanggal_sk || galat.berlaku_mulai || galat.berlaku_sampai),
          validate: () => (!tanpaSk && !isi.nomor_sk.trim() ? 'Isi nomor SK akreditasi.' : !tanpaSk && !isi.tanggal_sk ? 'Isi tanggal SK.' : isi.berlaku_sampai && isi.berlaku_mulai && isi.berlaku_sampai < isi.berlaku_mulai ? 'Berlaku sampai tidak boleh sebelum berlaku mulai.' : null),
          content: (
            <div className="u-idp-tumpuk">
              <FormGrid columns={2}>
                <Field label="Nomor SK akreditasi" required={!tanpaSk} error={galat.nomor_sk}>
                  <Input value={isi.nomor_sk} onChange={(e) => atur('nomor_sk', e.target.value)} maxLength={150} placeholder="mis. 1234/SK/LAMDIK/Ak/S/X/2026" />
                </Field>
                <Field label="Tanggal SK" required={!tanpaSk} error={galat.tanggal_sk}>
                  <IsianTanggal value={isi.tanggal_sk} onValueChange={(v) => atur('tanggal_sk', v)} />
                </Field>
                <Field label="Berlaku mulai" optional description="Kosong = tanggal SK." error={galat.berlaku_mulai}>
                  <IsianTanggal value={isi.berlaku_mulai} onValueChange={(v) => atur('berlaku_mulai', v)} />
                </Field>
                <Field label="Berlaku sampai" optional description="Kosong = 5 tahun dari berlaku mulai." error={galat.berlaku_sampai}>
                  <IsianTanggal value={isi.berlaku_sampai} onValueChange={(v) => atur('berlaku_sampai', v)} min={isi.berlaku_mulai || isi.tanggal_sk || undefined} />
                </Field>
              </FormGrid>
            </div>
          ),
        },
        {
          id: 'sertifikat',
          title: 'Sertifikat',
          error: Boolean(galat.berkas_id),
          validate: () => (!tanpaSk && !berkas ? 'Unggah sertifikat atau SK akreditasi.' : null),
          content: (
            <div className="u-idp-tumpuk">
              <Field label="Sertifikat / SK akreditasi" required={!tanpaSk} description="PDF atau gambar; menjadi lampiran akreditasi resmi bila disetujui." error={galat.berkas_id}>
                <PilihBerkas value={berkas} onValueChange={(v) => setBerkas(v)} accept=".pdf,.jpg,.jpeg,.png" modul="spmi" invalid={Boolean(galat.berkas_id)} />
              </Field>
              <Field label="Catatan untuk SPMI" optional>
                <Textarea rows={3} value={isi.catatan} onChange={(e) => atur('catatan', e.target.value)} maxLength={5000} placeholder="mis. Hasil asesmen lapangan LAMDIK Oktober 2026" />
              </Field>
            </div>
          ),
        },
        {
          id: 'tinjau',
          title: 'Tinjau & ajukan',
          content: (
            <div className="u-idp-tumpuk">
              <WizardReview
                sections={[
                  {
                    title: 'Akreditasi',
                    onEdit: () => setLangkah(0),
                    items: [
                      { label: 'Program studi', value: pilihanProdi.find((p) => p.kode_prodi === prodi) ? namaProdi(pilihanProdi.find((p) => p.kode_prodi === prodi)!) : '–' },
                      { label: 'Sekarang', value: teksTerkini(a?.terkini) },
                      { label: 'Usulan', value: `${a?.lembaga.find((l) => l.kode === isi.lembaga)?.singkatan ?? isi.lembaga ?? '–'} · ${per?.nama ?? '–'}` },
                    ],
                  },
                  {
                    title: 'SK & masa berlaku',
                    onEdit: () => setLangkah(1),
                    items: [
                      { label: 'Nomor SK', value: isi.nomor_sk || '–' },
                      { label: 'Tanggal SK', value: tgl(isi.tanggal_sk) },
                      { label: 'Berlaku', value: `${tgl(isi.berlaku_mulai || isi.tanggal_sk)} s.d. ${isi.berlaku_sampai ? tgl(isi.berlaku_sampai) : '5 tahun'}` },
                    ],
                  },
                  { title: 'Sertifikat', onEdit: () => setLangkah(2), items: [{ label: 'Berkas', value: berkas ? 'Terunggah' : 'Tidak ada' }] },
                ]}
              />
              <Alert variant="info" title="Setelah diajukan">
                SPMI memeriksa sertifikat dan SK. Bila disetujui, status ini menjadi akreditasi resmi prodi (riwayat SPMI, SIAKAD lama, portal).
              </Alert>
            </div>
          ),
        },
      ]}
    />
  );
}

function PanelUsulanAkreditasi({ id, onTutup }: { id: number; onTutup: () => void }) {
  const path = `/v1/spmi/akreditasi-usulan/${id}`;
  const q = useSiakadQuery<DetailUsulanAkreditasi>(['identitas-prodi', 'akreditasi-detail', id], (s, signal) => s.request<DetailUsulanAkreditasi>({ method: 'GET', path }, { signal }));
  const { kirim, sibuk } = useKirim(['identitas-prodi']);
  const toast = useToast();
  const buka = useBukaBerkas();
  const d = q.data;
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onTutup()}
      size="lg"
      title={d ? `Usulan akreditasi #${d.id} · ${prodiAkred(d)}` : 'Usulan akreditasi'}
      description={d ? `Diajukan ${waktu(d.diajukan_at)}` : undefined}
      footer={
        d?.hak.ajukan && d.status === 'diajukan' ? (
          <Button
            variant="destructive-soft"
            loading={sibuk}
            onClick={async () => {
              try {
                await kirim('POST', `${path}/batal`, {}, 'Usulan dibatalkan');
                q.refetch();
              } catch (e) {
                toast.add({ title: 'Belum berhasil', description: pesan(e), type: 'error' });
              }
            }}
          >
            <Undo2 /> Batalkan usulan
          </Button>
        ) : undefined
      }
    >
      {q.error && !d ? <Alert variant="danger">{pesan(q.error)}</Alert> : null}
      {d ? <RincianUsulanAkreditasi d={d} onBuka={() => void buka(`${path}/berkas`)} /> : null}
    </Sheet>
  );
}

function RincianUsulanAkreditasi({ d, onBuka }: { d: DetailUsulanAkreditasi; onBuka: () => void }) {
  return (
    <div className="u-idp-tumpuk">
      <AlurPemeriksa pemeriksa={d.pemeriksa} ringkas />
      {d.catatan_putus ? (
        <Alert variant={d.status === 'ditolak' ? 'danger' : 'info'} title="Catatan SPMI">
          {d.catatan_putus}
        </Alert>
      ) : null}
      <div className="u-idp-banding">
        <div>
          <span>Status resmi sekarang</span>
          <Nilai v={teksTerkini(d.terkini)} />
        </div>
        <div>
          <span>Usulan</span>
          <Nilai v={`${d.lembaga_nama} ${d.peringkat_nama}\nSK ${d.nomor_sk ?? '–'} (${tgl(d.tanggal_sk)})\nBerlaku ${tgl(d.berlaku_mulai ?? d.tanggal_sk)} s.d. ${d.berlaku_sampai ? tgl(d.berlaku_sampai) : '5 tahun'}`} baru />
        </div>
      </div>
      <DescriptionList
        items={[
          { label: 'Catatan prodi', value: d.catatan || '–' },
          {
            label: 'Sertifikat / SK',
            value: d.berkas_id ? (
              <Button variant="outline" size="sm" onClick={onBuka}>
                <Download /> {d.berkas_nama ?? 'Lihat sertifikat'}
              </Button>
            ) : (
              'Tanpa berkas'
            ),
          },
        ]}
      />
    </div>
  );
}

/** SPMI » Akreditasi » Usulan prodi: validasi usulan menjadi akreditasi resmi. */
export function AntreanUsulanAkreditasi({ bukaId, className }: { bukaId?: number | null; className?: string }) {
  const [status, setStatus] = React.useState<'diajukan' | 'semua'>('diajukan');
  const q = useSiakadQuery<{ usulan: UsulanAkreditasiRow[]; boleh_validasi: boolean }>(['identitas-prodi', 'akreditasi-antrean', status], (s, signal) =>
    s.request({ method: 'GET', path: '/v1/spmi/akreditasi-usulan', query: status === 'semua' ? undefined : { status } }, { signal }),
  );
  const [buka, setBuka] = React.useState<number | null>(bukaId ?? null);
  return (
    <div className={['u-idp-tumpuk', className].filter(Boolean).join(' ')}>
      <DataTable
        caption="Usulan akreditasi dari prodi"
        columns={kolomAkred(true)}
        rows={q.data?.usulan}
        rowKey={(r) => String(r.id)}
        loading={q.loading}
        error={q.data ? undefined : q.error}
        onRetry={q.refetch}
        mobile="cards"
        onRowClick={(r) => setBuka(r.id)}
        toolbar={
          <SegmentedControl
            aria-label="Status usulan"
            value={status}
            onValueChange={(v) => setStatus(v as 'diajukan' | 'semua')}
            options={[
              { value: 'diajukan', label: 'Menunggu' },
              { value: 'semua', label: 'Semua' },
            ]}
          />
        }
        empty={{ title: status === 'diajukan' ? 'Tidak ada usulan yang menunggu' : 'Belum ada usulan', description: 'Usulan datang dari Kaprodi lewat dasbor Fakultas » Akreditasi.' }}
      />
      {buka !== null ? <PanelPutusAkreditasi id={buka} onTutup={() => setBuka(null)} /> : null}
    </div>
  );
}

function PanelPutusAkreditasi({ id, onTutup }: { id: number; onTutup: () => void }) {
  const path = `/v1/spmi/akreditasi-usulan/${id}`;
  const q = useSiakadQuery<DetailUsulanAkreditasi>(['identitas-prodi', 'akreditasi-detail', id], (s, signal) => s.request<DetailUsulanAkreditasi>({ method: 'GET', path }, { signal }));
  const acuan = useSiakadQuery<AcuanAkreditasi>(['identitas-prodi', 'akreditasi-acuan', q.data?.kode_prodi ?? ''], (x, signal) => x.request({ method: 'GET', path: `/v1/spmi/akreditasi-usulan/acuan/${q.data?.kode_prodi}` }, { signal }), {
    enabled: Boolean(q.data?.kode_prodi),
  });
  const { kirim } = useKirim(['identitas-prodi', 'spmi']);
  const buka = useBukaBerkas();
  const [langkah, setLangkah] = React.useState(0);
  const [keputusan, setKeputusan] = React.useState<'setujui' | 'tolak' | ''>('');
  const [catatan, setCatatan] = React.useState('');
  const [koreksi, setKoreksi] = React.useState<Record<string, string | null>>({});
  const d = q.data;
  if (d && !d.hak.putuskan) return <PanelUsulanAkreditasi id={id} onTutup={onTutup} />;
  const nilai = (k: 'lembaga' | 'peringkat' | 'nomor_sk' | 'tanggal_sk' | 'berlaku_mulai' | 'berlaku_sampai') => (k in koreksi ? koreksi[k] : (d?.[k] ?? null));
  const atur = (k: string, v: string | null) => setKoreksi((x) => ({ ...x, [k]: v }));
  return (
    <PanelLangkah
      open
      onOpenChange={(o) => !o && onTutup()}
      size="lg"
      title={d ? `Validasi akreditasi · ${prodiAkred(d)}` : 'Validasi usulan akreditasi'}
      description={d ? `${rapikanNama(d.nama_fakultas)} · usulan #${d.id}` : undefined}
      step={langkah}
      onStepChange={setLangkah}
      finishLabel="Simpan keputusan"
      onFinish={async () => {
        try {
          await kirim('POST', `${path}/putuskan`, { keputusan, catatan: catatan.trim() || null, koreksi: keputusan === 'setujui' ? koreksi : undefined }, keputusan === 'setujui' ? 'Akreditasi resmi diperbarui' : 'Usulan ditolak');
          onTutup();
          return null;
        } catch (e) {
          return Object.values(galatKolom(e))[0] ?? pesan(e);
        }
      }}
      steps={[
        {
          id: 'periksa',
          title: 'Periksa',
          content: d ? (
            <RincianUsulanAkreditasi d={d} onBuka={() => void buka(`${path}/berkas`)} />
          ) : (
            <p className="u-idp-nilai" data-kosong="">
              Memuat…
            </p>
          ),
        },
        {
          id: 'keputusan',
          title: 'Keputusan',
          validate: () => (!keputusan ? 'Pilih setujui atau tolak.' : keputusan === 'tolak' && catatan.trim().length < 5 ? 'Tulis alasan penolakan.' : null),
          content: (
            <div className="u-idp-tumpuk">
              <Field label="Keputusan" required>
                <SegmentedControl
                  aria-label="Keputusan"
                  value={keputusan}
                  onValueChange={(v) => setKeputusan(v as 'setujui' | 'tolak')}
                  options={[
                    { value: 'setujui', label: 'Setujui jadi data resmi' },
                    { value: 'tolak', label: 'Tolak' },
                  ]}
                />
              </Field>
              {keputusan === 'setujui' ? (
                <Card>
                  <CardHeader title="Koreksi isian (bila perlu)" description="Sesuaikan dengan sertifikat sebelum menjadi data resmi." />
                  <CardContent>
                    <FormGrid columns={2}>
                      <Field label="Lembaga">
                        <Pilihan aria-label="Lembaga" placeholder="Pilih…" tampilan="cari" value={nilai('lembaga')} onValueChange={(v) => atur('lembaga', v)} options={(acuan.data?.lembaga ?? []).map((l) => ({ value: l.kode, label: l.singkatan ?? l.nama }))} />
                      </Field>
                      <Field label="Peringkat">
                        <Pilihan aria-label="Peringkat" placeholder="Pilih…" value={nilai('peringkat')} onValueChange={(v) => atur('peringkat', v)} options={(acuan.data?.peringkat ?? []).map((p) => ({ value: p.kode, label: p.nama }))} />
                      </Field>
                      <Field label="Nomor SK">
                        <Input value={nilai('nomor_sk') ?? ''} onChange={(e) => atur('nomor_sk', e.target.value)} maxLength={150} placeholder="Nomor SK akreditasi" />
                      </Field>
                      <Field label="Tanggal SK">
                        <IsianTanggal value={nilai('tanggal_sk') ?? ''} onValueChange={(v) => atur('tanggal_sk', v)} />
                      </Field>
                      <Field label="Berlaku mulai">
                        <IsianTanggal value={nilai('berlaku_mulai') ?? ''} onValueChange={(v) => atur('berlaku_mulai', v)} />
                      </Field>
                      <Field label="Berlaku sampai">
                        <IsianTanggal value={nilai('berlaku_sampai') ?? ''} onValueChange={(v) => atur('berlaku_sampai', v)} />
                      </Field>
                    </FormGrid>
                  </CardContent>
                </Card>
              ) : null}
              <Field label={keputusan === 'tolak' ? 'Alasan penolakan' : 'Catatan'} required={keputusan === 'tolak'} optional={keputusan !== 'tolak'}>
                <Textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={5000} placeholder={keputusan === 'tolak' ? 'mis. Nomor SK tidak sesuai sertifikat' : 'mis. Sesuai sertifikat LAMDIK'} />
              </Field>
              {keputusan === 'setujui' ? (
                <Alert variant="success" icon={<ShieldCheck />}>
                  Menjadi akreditasi terkini prodi (riwayat SPMI), ditulis ke data prodi SIAKAD lama, dan sertifikat menjadi lampiran akreditasi.
                </Alert>
              ) : null}
            </div>
          ),
        },
      ]}
    />
  );
}

/** Kosong: dipakai halaman yang belum punya izin. */
export function TanpaIzinIdentitas({ judul = 'Tidak ada akses' }: { judul?: string }) {
  return <Empty icon={<Lock />} title={judul} description="Menu ini untuk Dekan (logo fakultas) atau Kaprodi (usulan data prodi)." />;
}
