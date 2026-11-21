'use client';
import * as React from 'react';
import { Eye, FileClock, ImageUp, Palette, Pencil, Plus, Printer, Receipt, ScrollText, Settings2, Stamp, Trash2, Undo2 } from 'lucide-react';
import { Badge, Button, Spinner } from '../components/actions';
import { Alert, Card, Tabs } from '../components/display';
import { DataTable, type DataColumn } from '../components/data-table';
import { Field, Input, RadioGroup, Switch, Textarea } from '../components/forms';
import { IsianTanggal } from '../components/formulir';
import { ConfirmDialog, Sheet, useToast } from '../components/overlays';
import { PanelLangkah } from '../components/panel-langkah';
import { Select } from '../components/select';
import { WizardReview } from '../components/wizard';
import { cn } from '../lib/cn';
import { formatDate, formatRupiah } from '../lib/format';
import { GalatApi } from './galat';
import {
  Kwitansi,
  KwitansiResmi,
  LABEL_PENERBIT_KWITANSI,
  VARIAN_KWITANSI,
  contohKwitansi,
  type JenisPenerbitKwitansi,
  type PenerbitKwitansi,
  type VarianKwitansi,
} from './kwitansi';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { usePilihBerkas } from '../components/pilih-berkas-lokal';
import { IsianWarnaHex } from '../components/isian-warna';

// Pengaturan kwitansi resmi per unit penerbit (GET/POST /v1/kwitansi/penerbit), aturan catatan pembayaran
// (/v1/kwitansi/catatan), daftar kwitansi terbit (/v1/kwitansi/terbit), dan log (/v1/kwitansi/log).

// ================================================================ Tipe
export interface KwitansiSaya {
  siap: boolean;
  atur: boolean;
  lihat: boolean;
  global: boolean;
  unit_atur: number[];
  unit_lihat: number[];
  varian: VarianKwitansi[];
  variabel: string[];
  catatan_bawaan: string;
}

export interface PengaturanPenerbitKwitansi {
  unit_id: number;
  jenis: JenisPenerbitKwitansi;
  tersimpan: boolean;
  unit: { id: number; kode: string; nama: string; singkatan?: string | null; jenis: string } | null;
  nama: string;
  singkatan?: string | null;
  kode: string;
  label: string;
  varian: VarianKwitansi;
  warna: string;
  judul: string;
  kota?: string | null;
  jabatan_penerima?: string | null;
  ttd?: string | null;
  stempel?: string | null;
  kaki?: string | null;
  tampil_logo: boolean;
  tampil_qr: boolean;
  boleh_atur?: boolean;
  diubah_oleh?: string | null;
  diubah_at?: string | null;
}

export interface AturanCatatanKwitansi {
  id: number;
  unit_id: number | null;
  unit?: string | null;
  jenis_bayar: string | null;
  jenis_nama?: string | null;
  teks: string;
  berlaku_mulai: string | null;
  berlaku_sampai: string | null;
  urutan: number;
  aktif: boolean;
  tingkat: 'jenis_unit' | 'unit' | 'jenis' | 'semua';
  diubah_oleh?: string | null;
  dibuat_oleh?: string | null;
  updated_at?: string | null;
}

export interface KwitansiTerbitRingkas {
  id: number;
  sumber: 'keuangan' | 'pmb';
  nomor_bukti: string;
  tanggal: string;
  jumlah: number;
  unit_id: number | null;
  penerbit: { jenis: string; kode: string; nama: string };
  nomor_induk: string | null;
  nama: string | null;
  status: string;
  dicetak: number;
}

const TINGKAT: Record<AturanCatatanKwitansi['tingkat'], string> = { jenis_unit: 'Jenis + unit', unit: 'Unit', jenis: 'Jenis (semua unit)', semua: 'Bawaan semua' };
const VARIABEL_CONTOH: Record<string, string> = {
  nama: 'Dewi Kartika Sari',
  nomor_induk: '2501010099',
  nomor: 'KW261119-00012',
  tanggal: '19 November 2026',
  jenis_biaya: 'Uang Kuliah Tunggal',
  periode: 'Ganjil 2026/2027',
  jumlah: 'Rp 1.250.000',
  sisa: 'Rp 750.000',
  batas_tanggal: '15 Desember 2026',
  unit: 'Keuangan Universitas',
};

/** Isi variabel {nama} dkk. dengan data contoh (pratinjau). */
export function isiCatatanContoh(teks: string): string {
  return teks.replace(/\{([a-z_]+)\}/g, (m, k: string) => VARIABEL_CONTOH[k] ?? m);
}

function penerbitKe(p: PengaturanPenerbitKwitansi | Partial<PengaturanPenerbitKwitansi>): Partial<PenerbitKwitansi> {
  return {
    jenis: p.jenis,
    kode: p.kode,
    label: p.label,
    nama: p.nama,
    warna: p.warna,
    varian: p.varian,
    kota: p.kota,
    jabatan_penerima: p.jabatan_penerima,
    ttd: p.ttd,
    stempel: p.stempel,
    kaki: p.kaki,
    tampil_logo: p.tampil_logo,
    tampil_qr: p.tampil_qr,
  };
}

// ================================================================ Unggah gambar (tanda tangan / stempel)
async function gambarKeDataUri(f: File, maks = 640): Promise<string> {
  const url = URL.createObjectURL(f);
  try {
    const img = await new Promise<HTMLImageElement>((ok, gagal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => gagal(new Error('Berkas bukan gambar.'));
      i.src = url;
    });
    const skala = Math.min(1, maks / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * skala));
    c.height = Math.max(1, Math.round(img.height * skala));
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function UnggahGambar({ label, nilai, onChange, keterangan }: { label: string; nilai: string | null | undefined; onChange: (v: string | null) => void; keterangan: string }) {
  const toast = useToast();
  const pemilih = usePilihBerkas({
    accept: 'image/png,image/jpeg,image/webp',
    onFiles: async (files) => {
      const f = files[0];
      if (!f) return;
      try {
        const uri = await gambarKeDataUri(f);
        if (uri.length > 520_000) throw new Error('Gambar terlalu besar setelah diperkecil (maks. 400 KB). Pakai PNG berlatar transparan yang lebih sederhana.');
        onChange(uri);
      } catch (er) {
        toast.add({ title: `${label} tidak dapat dipakai`, description: (er as Error).message, type: 'error' });
      }
    },
  });
  return (
    <Field label={label} description={keterangan} optional>
      <div className="u-kwp-gambar">
        <span className="u-kwp-gambar-pratinjau" data-kosong={!nilai || undefined}>
          {nilai ? <img src={nilai} alt={label} /> : <ImageUp aria-hidden />}
        </span>
        <span className="u-kwp-gambar-aksi">
          {pemilih.elemen}
          <Button size="sm" variant="outline" onClick={pemilih.buka}>
            <ImageUp /> {nilai ? 'Ganti' : 'Unggah'}
          </Button>
          {nilai && (
            <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
              <Trash2 /> Hapus
            </Button>
          )}
        </span>
      </div>
    </Field>
  );
}

// ================================================================ Formulir penerbit (panel samping, bertahap)
interface IsianPenerbit {
  label: string;
  kode_nomor: string;
  jenis: JenisPenerbitKwitansi | null;
  varian: VarianKwitansi;
  warna: string;
  judul: string;
  tampil_logo: boolean;
  tampil_qr: boolean;
  kota: string;
  jabatan_penerima: string;
  ttd: string | null;
  stempel: string | null;
  kaki: string;
}

const WARNA_CEPAT = ['#0b6b3a', '#1d4ed8', '#c2410c', '#7c3aed', '#b45309', '#15803d', '#9f1239', '#0e7490', '#4338ca', '#475569'];

function FormPenerbit({ p, open, onOpenChange }: { p: PengaturanPenerbitKwitansi | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const siakad = useSiakad();
  const toast = useToast();
  const [v, setV] = React.useState<IsianPenerbit | null>(null);
  React.useEffect(() => {
    if (!p || !open) return;
    setV({
      label: p.label,
      kode_nomor: p.kode,
      jenis: p.jenis,
      varian: p.varian,
      warna: p.warna,
      judul: p.judul,
      tampil_logo: p.tampil_logo,
      tampil_qr: p.tampil_qr,
      kota: p.kota ?? '',
      jabatan_penerima: p.jabatan_penerima ?? '',
      ttd: p.ttd ?? null,
      stempel: p.stempel ?? null,
      kaki: p.kaki ?? '',
    });
  }, [p, open]);
  if (!p || !v) return null;
  const set = <K extends keyof IsianPenerbit>(k: K, x: IsianPenerbit[K]) => setV((o) => (o ? { ...o, [k]: x } : o));
  const contoh = contohKwitansi({ ...penerbitKe(p), ...penerbitKe({ ...v, kode: v.kode_nomor || p.kode, kota: v.kota || null, jabatan_penerima: v.jabatan_penerima || null, kaki: v.kaki || null } as Partial<PengaturanPenerbitKwitansi>), jenis: v.jenis ?? p.jenis }, { judul: v.judul || 'BUKTI KAS MASUK' });
  const kodeSalah = v.kode_nomor && !/^[A-Z0-9]{2,12}$/.test(v.kode_nomor) ? '2–12 huruf kapital atau angka, mis. KEU, BAAK, PMB, FAK05.' : null;
  const warnaSalah = !/^#[0-9a-fA-F]{6}$/.test(v.warna) ? 'Format #RRGGBB.' : null;
  return (
    <PanelLangkah
      open={open}
      onOpenChange={onOpenChange}
      mode="ubah"
      size="xl"
      title={`Kwitansi ${p.label}`}
      description="Tampilan kwitansi resmi yang diterbitkan unit ini. Isian kwitansi (Bukti Kas Masuk) tetap lengkap di semua varian."
      footerNote="Perubahan berlaku untuk kwitansi berikutnya; kwitansi yang sudah terbit tetap memakai nomor dan catatan saat terbit."
      steps={[
        {
          id: 'identitas',
          title: 'Penerbit',
          icon: <Receipt />,
          validate: () => (!v.label.trim() ? 'Label penerbit wajib diisi.' : kodeSalah),
          content: (
            <div className="u-kwp-isian">
              <Field label="Label lencana" required description="Tampil di lencana penerbit pada kwitansi, mis. Keuangan Universitas, Fakultas Hukum.">
                <Input value={v.label} maxLength={120} onChange={(e) => set('label', e.target.value)} />
              </Field>
              <Field label="Kode awalan nomor bukti" required error={kodeSalah} description={`Nomor bukti menjadi ${v.kode_nomor || p.kode}-KW261119-00012. Unik per unit.`}>
                <Input value={v.kode_nomor} maxLength={12} onChange={(e) => set('kode_nomor', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} className="u-kwp-kode" />
              </Field>
              <Field label="Jenis penerbit" description="Menentukan warna dan kode bawaan.">
                <Select<JenisPenerbitKwitansi>
                  value={v.jenis}
                  onValueChange={(x) => set('jenis', x)}
                  placeholder="Pilih…"
                  options={(Object.keys(LABEL_PENERBIT_KWITANSI) as JenisPenerbitKwitansi[]).map((k) => ({ value: k, label: LABEL_PENERBIT_KWITANSI[k] }))}
                />
              </Field>
            </div>
          ),
        },
        {
          id: 'tampilan',
          title: 'Tampilan',
          icon: <Palette />,
          validate: () => warnaSalah,
          content: (
            <div className="u-kwp-isian">
              <Field label="Varian bawaan" description="Petugas tetap bisa memilih varian lain saat mencetak.">
                <RadioGroup<VarianKwitansi> variant="card" columns={2} value={v.varian} onValueChange={(x) => set('varian', x)} options={VARIAN_KWITANSI.map((x) => ({ value: x.value, label: x.label, description: `${x.keterangan} (${x.kertas})` }))} />
              </Field>
              <Field label="Warna aksen" error={warnaSalah}>
                <IsianWarnaHex value={v.warna} onValueChange={(w) => set('warna', w)} bawaan="#0b6b3a" cepat={WARNA_CEPAT} aria-label="Warna aksen kwitansi" />
              </Field>
              <Field label="Judul kwitansi" description="Bawaan BUKTI KAS MASUK.">
                <Input value={v.judul} maxLength={60} placeholder="BUKTI KAS MASUK" onChange={(e) => set('judul', e.target.value)} />
              </Field>
              <label className="u-kwp-sakelar">
                <Switch checked={v.tampil_logo} onCheckedChange={(c: boolean) => set('tampil_logo', c)} /> Tampilkan logo universitas
              </label>
              <label className="u-kwp-sakelar">
                <Switch checked={v.tampil_qr} onCheckedChange={(c: boolean) => set('tampil_qr', c)} /> Tampilkan QR verifikasi keaslian
              </label>
            </div>
          ),
        },
        {
          id: 'pengesahan',
          title: 'Pengesahan',
          icon: <Stamp />,
          content: (
            <div className="u-kwp-isian">
              <Field label="Kota" optional description="Tampil di atas tanda tangan, mis. Marisa.">
                <Input value={v.kota} maxLength={60} onChange={(e) => set('kota', e.target.value)} />
              </Field>
              <Field label="Keterangan penerima" optional description="Di bawah nama petugas penerima, mis. Kasir BAUK, Bendahara Fakultas.">
                <Input value={v.jabatan_penerima} maxLength={80} onChange={(e) => set('jabatan_penerima', e.target.value)} />
              </Field>
              <UnggahGambar label="Tanda tangan" nilai={v.ttd} onChange={(x) => set('ttd', x)} keterangan="PNG berlatar transparan disarankan; diperkecil otomatis (maks. 400 KB)." />
              <UnggahGambar label="Stempel" nilai={v.stempel} onChange={(x) => set('stempel', x)} keterangan="PNG berlatar transparan; ditumpuk di atas tanda tangan." />
              <Field label="Catatan kaki" optional description="Baris kecil di bawah kwitansi. Catatan pembayaran diatur di tab Catatan pembayaran.">
                <Textarea rows={2} value={v.kaki} maxLength={255} onChange={(e) => set('kaki', e.target.value)} />
              </Field>
            </div>
          ),
        },
        {
          id: 'ringkasan',
          title: 'Ringkasan',
          icon: <Eye />,
          content: (
            <div className="u-kwp-isian">
              <WizardReview
                sections={[
                  {
                    title: 'Penerbit',
                    items: [
                      { label: 'Label', value: v.label },
                      { label: 'Awalan nomor', value: v.kode_nomor || p.kode },
                      { label: 'Jenis', value: v.jenis ? LABEL_PENERBIT_KWITANSI[v.jenis] : '–' },
                    ],
                  },
                  {
                    title: 'Tampilan',
                    items: [
                      { label: 'Varian', value: VARIAN_KWITANSI.find((x) => x.value === v.varian)?.label },
                      { label: 'Warna', value: <span className="u-kwp-warna-teks"><i style={{ background: v.warna }} /> {v.warna}</span> },
                      { label: 'Logo / QR', value: `${v.tampil_logo ? 'Logo' : 'Tanpa logo'} · ${v.tampil_qr ? 'QR' : 'Tanpa QR'}` },
                    ],
                  },
                  {
                    title: 'Pengesahan',
                    items: [
                      { label: 'Tanda tangan', value: v.ttd ? 'Ada' : 'Tidak ada' },
                      { label: 'Stempel', value: v.stempel ? 'Ada' : 'Tidak ada' },
                      { label: 'Kota', value: v.kota || '–' },
                    ],
                  },
                ]}
              />
              <div className="u-kwp-pratinjau-kecil">
                <Kwitansi data={contoh} varian={v.varian} />
              </div>
            </div>
          ),
        },
      ]}
      onFinish={async () => {
        try {
          await siakad.request({
            method: 'POST',
            path: '/v1/kwitansi/penerbit',
            body: {
              unit_id: p.unit_id,
              label: v.label,
              kode_nomor: v.kode_nomor,
              jenis: v.jenis ?? p.jenis,
              varian: v.varian,
              warna: v.warna,
              judul: v.judul,
              tampil_logo: v.tampil_logo,
              tampil_qr: v.tampil_qr,
              kota: v.kota,
              jabatan_penerima: v.jabatan_penerima,
              ttd: v.ttd ?? '',
              stempel: v.stempel ?? '',
              kaki: v.kaki,
            },
          });
          toast.add({ title: 'Pengaturan kwitansi disimpan', type: 'success' });
          invalidateSiakad('/v1/kwitansi');
          return null;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

// ================================================================ Tab penerbit
function TabPenerbit({ unitId, saya }: { unitId?: number; saya: KwitansiSaya }) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useSiakadQuery<PengaturanPenerbitKwitansi[]>(['/v1/kwitansi/penerbit'], (s, signal) => s.request({ method: 'GET', path: '/v1/kwitansi/penerbit' }, { signal }));
  const [ubah, setUbah] = React.useState<PengaturanPenerbitKwitansi | null>(null);
  const [lihat, setLihat] = React.useState<PengaturanPenerbitKwitansi | null>(null);
  const [bawaan, setBawaan] = React.useState<PengaturanPenerbitKwitansi | null>(null);
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} />;
  if (!q.data) return <Spinner />;
  const daftar = q.data.filter((p) => unitId == null || p.unit_id === unitId);
  return (
    <div className="u-kwp-penerbit">
      {daftar.map((p) => (
        <Card key={p.unit_id} className="u-kwp-kartu" style={{ '--kw-aksen': p.warna } as React.CSSProperties}>
          <button type="button" className="u-kwp-mini" onClick={() => setLihat(p)} aria-label={`Pratinjau kwitansi ${p.label}`}>
            <span className="u-kwp-mini-skala">
              <Kwitansi data={contohKwitansi(penerbitKe(p))} varian={p.varian} rincian={false} />
            </span>
          </button>
          <div className="u-kwp-kartu-isi">
            <span className="u-kwp-kartu-judul">
              <i style={{ background: p.warna }} aria-hidden />
              <b>{p.label}</b>
            </span>
            <span className="u-kwp-kartu-meta">
              <Badge variant="outline">{p.kode}</Badge>
              <Badge variant="secondary">{LABEL_PENERBIT_KWITANSI[p.jenis] ?? p.jenis}</Badge>
              <span>{VARIAN_KWITANSI.find((x) => x.value === p.varian)?.label}</span>
              {!p.tersimpan && <Badge variant="outline">Bawaan</Badge>}
            </span>
            <span className="u-kwp-kartu-aksi">
              <Button size="sm" variant="ghost" onClick={() => setLihat(p)}>
                <Eye /> Pratinjau
              </Button>
              {p.boleh_atur !== false && saya.atur && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setUbah(p)}>
                    <Settings2 /> Atur
                  </Button>
                  {p.tersimpan && (
                    <Button size="sm" variant="ghost" onClick={() => setBawaan(p)}>
                      <Undo2 /> Bawaan
                    </Button>
                  )}
                </>
              )}
            </span>
          </div>
        </Card>
      ))}
      {!daftar.length && <Alert variant="info" title="Belum ada unit penerbit di lingkup Anda" />}
      <FormPenerbit p={ubah} open={Boolean(ubah)} onOpenChange={(o) => !o && setUbah(null)} />
      <Sheet open={Boolean(lihat)} onOpenChange={(o) => !o && setLihat(null)} size="xl" title={`Pratinjau kwitansi ${lihat?.label ?? ''}`} description="Data rekaan. Coba varian lain dan cetak untuk memeriksa ukuran kertas.">
        {lihat && <KwitansiResmi data={contohKwitansi(penerbitKe(lihat))} catatCetak={false} />}
      </Sheet>
      <ConfirmDialog
        open={Boolean(bawaan)}
        onOpenChange={(o) => !o && setBawaan(null)}
        title={`Kembalikan kwitansi ${bawaan?.label ?? ''} ke bawaan?`}
        description="Varian, warna, awalan nomor, tanda tangan, dan stempel unit ini dihapus. Kwitansi yang sudah terbit tidak berubah."
        confirmLabel="Kembalikan ke bawaan"
        tone="warning"
        onConfirm={async () => {
          try {
            await siakad.request({ method: 'POST', path: `/v1/kwitansi/penerbit/${bawaan!.unit_id}/bawaan` });
            toast.add({ title: 'Kwitansi kembali ke bawaan', type: 'success' });
            invalidateSiakad('/v1/kwitansi');
          } catch (e) {
            toast.add({ title: 'Gagal', description: pesanGalat(e), type: 'error' });
          }
        }}
      />
    </div>
  );
}

// ================================================================ Tab catatan
interface IsianCatatan {
  id?: number;
  unit_id: number | null;
  jenis_bayar: string | null;
  teks: string;
  berlaku_mulai: string | null;
  berlaku_sampai: string | null;
  urutan: string;
  aktif: boolean;
}

function FormCatatan({ awal, open, onOpenChange, saya, penerbit }: { awal: IsianCatatan | null; open: boolean; onOpenChange: (o: boolean) => void; saya: KwitansiSaya; penerbit: PengaturanPenerbitKwitansi[] }) {
  const siakad = useSiakad();
  const toast = useToast();
  const jenis = useSiakadQuery<Array<{ kode: string; nama: string; kelompok: string }>>(['/v1/kwitansi/jenis'], (s, signal) => s.request({ method: 'GET', path: '/v1/kwitansi/jenis' }, { signal }), { enabled: open });
  const [v, setV] = React.useState<IsianCatatan | null>(null);
  const teksRef = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => {
    if (open && awal) setV(awal);
  }, [open, awal]);
  if (!v) return null;
  const set = <K extends keyof IsianCatatan>(k: K, x: IsianCatatan[K]) => setV((o) => (o ? { ...o, [k]: x } : o));
  const SEMUA = '__semua';
  const unitOpsi = [
    ...(saya.global ? [{ value: SEMUA, label: 'Semua unit (bawaan)' }] : []),
    ...penerbit.filter((p) => p.boleh_atur !== false).map((p) => ({ value: String(p.unit_id), label: p.unit?.nama ?? p.nama, description: p.kode })),
  ];
  const tingkat = v.unit_id != null ? (v.jenis_bayar ? 'Jenis + unit (paling khusus)' : 'Unit') : v.jenis_bayar ? 'Jenis (semua unit)' : 'Bawaan semua';
  const sisip = (k: string) => {
    const el = teksRef.current;
    const t = `{${k}}`;
    if (!el) return set('teks', v.teks + t);
    const a = el.selectionStart ?? v.teks.length;
    const b = el.selectionEnd ?? a;
    set('teks', v.teks.slice(0, a) + t + v.teks.slice(b));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + t.length, a + t.length);
    });
  };
  return (
    <PanelLangkah
      open={open}
      onOpenChange={onOpenChange}
      mode={v.id ? 'ubah' : 'buat'}
      title={v.id ? 'Ubah aturan catatan' : 'Tambah aturan catatan'}
      description="Catatan pembayaran pada kwitansi. Aturan paling khusus yang berlaku dipakai: jenis + unit, lalu unit, lalu jenis, lalu bawaan."
      footerNote="Kwitansi yang sudah terbit menyimpan teks catatan saat terbit."
      steps={[
        {
          id: 'cakupan',
          title: 'Cakupan',
          icon: <Settings2 />,
          validate: () => {
            if (v.unit_id == null && !saya.global) return 'Pilih unit penerbit.';
            if (v.berlaku_mulai && v.berlaku_sampai && v.berlaku_sampai < v.berlaku_mulai) return 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
            if (!/^\d{1,4}$/.test(v.urutan)) return 'Urutan 0–9999.';
            return null;
          },
          content: (
            <div className="u-kwp-isian">
              <Field label="Unit penerbit" required description="Kosongkan (Semua unit) untuk aturan bawaan universitas.">
                <Select<string> value={v.unit_id == null ? (saya.global && v.id ? SEMUA : null) : String(v.unit_id)} placeholder="Pilih…" onValueChange={(x) => set('unit_id', !x || x === SEMUA ? null : Number(x))} options={unitOpsi} />
              </Field>
              <Field label="Jenis pembayaran" optional description="Mis. almamater, UKT, PMB/pendaftaran, wisuda. Kosong = semua jenis.">
                <Select<string>
                  value={v.jenis_bayar ?? SEMUA}
                  placeholder="Pilih…"
                  onValueChange={(x) => set('jenis_bayar', !x || x === SEMUA ? null : x)}
                  options={[{ value: SEMUA, label: 'Semua jenis pembayaran' }, ...(jenis.data ?? []).map((j) => ({ value: j.kode, label: j.nama, group: j.kelompok }))]}
                />
              </Field>
              <div className="u-kwp-dua">
                <Field label="Berlaku mulai" optional>
                  <IsianTanggal value={v.berlaku_mulai} onValueChange={(x) => set('berlaku_mulai', x || null)} placeholder="Pilih…" />
                </Field>
                <Field label="Berlaku sampai" optional>
                  <IsianTanggal value={v.berlaku_sampai} onValueChange={(x) => set('berlaku_sampai', x || null)} min={v.berlaku_mulai} placeholder="Pilih…" />
                </Field>
              </div>
              <div className="u-kwp-dua">
                <Field label="Urutan" description="Kecil = didahulukan bila kekhususannya sama.">
                  <Input inputMode="numeric" value={v.urutan} maxLength={4} onChange={(e) => set('urutan', e.target.value.replace(/\D/g, ''))} />
                </Field>
                <Field label="Status">
                  <label className="u-kwp-sakelar">
                    <Switch checked={v.aktif} onCheckedChange={(c: boolean) => set('aktif', c)} /> {v.aktif ? 'Aktif' : 'Nonaktif'}
                  </label>
                </Field>
              </div>
              <Alert variant="info" title={`Tingkat: ${tingkat}`} />
            </div>
          ),
        },
        {
          id: 'teks',
          title: 'Teks catatan',
          icon: <ScrollText />,
          validate: () => (!v.teks.trim() ? 'Teks catatan wajib diisi.' : v.teks.split('\n').length > 6 ? 'Maksimal 6 baris.' : null),
          content: (
            <div className="u-kwp-isian">
              <Field label="Teks" required description="Boleh beberapa baris (maks. 6). Klik variabel untuk menyisipkan.">
                <Textarea ref={teksRef} rows={5} maxLength={1000} value={v.teks} placeholder={saya.catatan_bawaan} onChange={(e) => set('teks', e.target.value)} />
              </Field>
              <div className="u-kwp-variabel" role="group" aria-label="Variabel">
                {saya.variabel.map((k) => (
                  <button key={k} type="button" onClick={() => sisip(k)}>{`{${k}}`}</button>
                ))}
              </div>
              <div className="u-kwp-hasil">
                <small>Pratinjau dengan data contoh</small>
                <p>{isiCatatanContoh(v.teks || saya.catatan_bawaan)}</p>
              </div>
            </div>
          ),
        },
      ]}
      onFinish={async () => {
        try {
          await siakad.request({
            method: 'POST',
            path: '/v1/kwitansi/catatan',
            body: { id: v.id, unit_id: v.unit_id, jenis_bayar: v.jenis_bayar, teks: v.teks, berlaku_mulai: v.berlaku_mulai, berlaku_sampai: v.berlaku_sampai, urutan: Number(v.urutan || 100), aktif: v.aktif },
          });
          toast.add({ title: 'Aturan catatan disimpan', type: 'success' });
          invalidateSiakad('/v1/kwitansi/catatan');
          invalidateSiakad('/v1/kwitansi/log');
          return null;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

function TabCatatan({ unitId, saya }: { unitId?: number; saya: KwitansiSaya }) {
  const siakad = useSiakad();
  const toast = useToast();
  const query = unitId != null ? { unit_id: unitId } : {};
  const q = useSiakadQuery<AturanCatatanKwitansi[]>(['/v1/kwitansi/catatan', query], (s, signal) => s.request({ method: 'GET', path: '/v1/kwitansi/catatan', query }, { signal }));
  const pen = useSiakadQuery<PengaturanPenerbitKwitansi[]>(['/v1/kwitansi/penerbit'], (s, signal) => s.request({ method: 'GET', path: '/v1/kwitansi/penerbit' }, { signal }));
  const [form, setForm] = React.useState<IsianCatatan | null>(null);
  const [hapus, setHapus] = React.useState<AturanCatatanKwitansi | null>(null);
  const bolehUbah = (c: AturanCatatanKwitansi) => saya.atur && (saya.global || (c.unit_id != null && saya.unit_atur.includes(c.unit_id)));
  const kolom: DataColumn<AturanCatatanKwitansi>[] = [
    { key: 'teks', header: 'Catatan', value: (c) => c.teks, cell: (c) => <span className="u-kwp-teks">{c.teks}</span>, mobile: 'title' },
    { key: 'unit', header: 'Unit', value: (c) => c.unit ?? 'Semua unit', mobile: 'subtitle' },
    { key: 'jenis', header: 'Jenis pembayaran', value: (c) => c.jenis_nama ?? c.jenis_bayar ?? 'Semua jenis' },
    { key: 'tingkat', header: 'Tingkat', value: (c) => TINGKAT[c.tingkat] },
    { key: 'berlaku', header: 'Berlaku', value: (c) => `${c.berlaku_mulai ?? ''}${c.berlaku_sampai ?? ''}`, cell: (c) => (c.berlaku_mulai || c.berlaku_sampai ? `${c.berlaku_mulai ? formatDate(c.berlaku_mulai) : '…'} – ${c.berlaku_sampai ? formatDate(c.berlaku_sampai) : '…'}` : 'Selalu') },
    { key: 'urutan', header: 'Urutan', align: 'end', value: (c) => c.urutan },
    { key: 'aktif', header: 'Status', value: (c) => (c.aktif ? 'Aktif' : 'Nonaktif'), cell: (c) => <Badge variant={c.aktif ? 'success' : 'outline'}>{c.aktif ? 'Aktif' : 'Nonaktif'}</Badge>, mobile: 'badge' },
  ];
  const baru = (): IsianCatatan => ({ unit_id: unitId ?? (saya.global ? null : (saya.unit_atur[0] ?? null)), jenis_bayar: null, teks: '', berlaku_mulai: null, berlaku_sampai: null, urutan: '100', aktif: true });
  return (
    <div className="u-kwp-tumpuk">
      <Alert variant="info" title="Catatan pembayaran dinamis">
        Bawaan: “{saya.catatan_bawaan}”. Aturan paling khusus yang berlaku pada tanggal bayar dipakai: jenis + unit, unit, jenis (semua unit), lalu bawaan. Teks dipotret saat kwitansi terbit, jadi cetak ulang tidak berubah.
      </Alert>
      <DataTable<AturanCatatanKwitansi>
        columns={kolom}
        rows={q.data}
        rowKey={(c) => String(c.id)}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
        toolbar={
          saya.atur ? (
            <Button onClick={() => setForm(baru())}>
              <Plus /> Tambah aturan
            </Button>
          ) : undefined
        }
        rowActions={(c) =>
          bolehUbah(c)
            ? [
                { label: 'Ubah', icon: <Pencil />, onSelect: () => setForm({ id: c.id, unit_id: c.unit_id, jenis_bayar: c.jenis_bayar, teks: c.teks, berlaku_mulai: c.berlaku_mulai, berlaku_sampai: c.berlaku_sampai, urutan: String(c.urutan), aktif: c.aktif }) },
                { label: 'Hapus', icon: <Trash2 />, destructive: true, onSelect: () => setHapus(c) },
              ]
            : []
        }
        empty={{ title: 'Belum ada aturan catatan', description: `Semua kwitansi memakai catatan bawaan “${saya.catatan_bawaan}”.`, icon: <ScrollText /> }}
        mobile="cards"
      />
      <FormCatatan awal={form} open={Boolean(form)} onOpenChange={(o) => !o && setForm(null)} saya={saya} penerbit={pen.data ?? []} />
      <ConfirmDialog
        open={Boolean(hapus)}
        onOpenChange={(o) => !o && setHapus(null)}
        title="Hapus aturan catatan?"
        description="Kwitansi berikutnya memakai aturan lain yang berlaku. Kwitansi yang sudah terbit tidak berubah."
        confirmLabel="Hapus aturan"
        onConfirm={async () => {
          try {
            await siakad.request({ method: 'POST', path: `/v1/kwitansi/catatan/${hapus!.id}/hapus` });
            toast.add({ title: 'Aturan dihapus', type: 'success' });
            invalidateSiakad('/v1/kwitansi/catatan');
          } catch (e) {
            toast.add({ title: 'Gagal menghapus', description: pesanGalat(e), type: 'error' });
          }
        }}
      />
    </div>
  );
}

// ================================================================ Kwitansi terbit
export interface DaftarKwitansiTerbitProps {
  /** Saring satu unit penerbit (induk_unit.id). */
  unitId?: number;
  /** keuangan | pmb */
  sumber?: 'keuangan' | 'pmb';
  urlVerifikasi?: string;
  className?: string;
}

/** Daftar kwitansi resmi yang diterbitkan unit (GET /v1/kwitansi/terbit) dengan lihat + cetak ulang (SALINAN). */
export function DaftarKwitansiTerbit({ unitId, sumber, urlVerifikasi, className }: DaftarKwitansiTerbitProps) {
  const [page, setPage] = React.useState(1);
  const [cari, setCari] = React.useState('');
  const [q2, setQ2] = React.useState('');
  const [buka, setBuka] = React.useState<KwitansiTerbitRingkas | null>(null);
  React.useEffect(() => {
    const t = setTimeout(() => (setQ2(cari.trim()), setPage(1)), 350);
    return () => clearTimeout(t);
  }, [cari]);
  const query: Record<string, string | number> = { page, per_page: 25 };
  if (unitId != null) query.unit_id = unitId;
  if (sumber) query.sumber = sumber;
  if (q2) query.q = q2;
  const q = useSiakadQuery<KwitansiTerbitRingkas[]>(['/v1/kwitansi/terbit', query], (s, signal) => s.request({ method: 'GET', path: '/v1/kwitansi/terbit', query }, { signal }));
  const kolom: DataColumn<KwitansiTerbitRingkas>[] = [
    { key: 'nomor', header: 'No. Bukti', value: (k) => k.nomor_bukti, cell: (k) => <span className="u-kw-mono">{k.nomor_bukti}</span>, mobile: 'subtitle' },
    { key: 'tanggal', header: 'Tgl. Bayar', value: (k) => k.tanggal, cell: (k) => formatDate(k.tanggal, 'medium') },
    { key: 'nama', header: 'Terima dari', value: (k) => `${k.nama ?? ''} ${k.nomor_induk ?? ''}`, cell: (k) => (
      <span className="u-kwp-orang">
        <b>{k.nama ?? '–'}</b>
        <small>{k.nomor_induk}</small>
      </span>
    ), mobile: 'title' },
    { key: 'penerbit', header: 'Penerbit', value: (k) => k.penerbit.nama, cell: (k) => <Badge variant="outline">{k.penerbit.kode}</Badge> },
    { key: 'jumlah', header: 'Jumlah', align: 'end', value: (k) => k.jumlah, cell: (k) => formatRupiah(k.jumlah) },
    { key: 'cetak', header: 'Dicetak', align: 'end', value: (k) => k.dicetak },
    { key: 'status', header: 'Status', value: (k) => k.status, cell: (k) => <Badge variant={k.status === 'sah' ? 'success' : 'danger'}>{k.status === 'sah' ? 'Sah' : 'Batal'}</Badge>, mobile: 'badge' },
  ];
  return (
    <div className={cn('u-kwp-tumpuk', className)}>
      <DataTable<KwitansiTerbitRingkas>
        columns={kolom}
        rows={q.data}
        rowKey={(k) => String(k.id)}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
        page={page}
        perPage={25}
        total={q.meta?.total ?? undefined}
        onPageChange={setPage}
        toolbar={<Input className="u-kwp-cari" value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nomor bukti, NIM, atau nama" aria-label="Cari kwitansi" />}
        rowActions={(k) => [{ label: 'Lihat & cetak ulang', icon: <Printer />, onSelect: () => setBuka(k) }]}
        empty={{ title: 'Belum ada kwitansi terbit', description: 'Kwitansi tercatat saat pembayaran diterima kasir atau keuangan.', icon: <Receipt /> }}
        mobile="cards"
      />
      <Sheet open={Boolean(buka)} onOpenChange={(o) => !o && setBuka(null)} size="xl" title={`Kwitansi ${buka?.nomor_bukti ?? ''}`} description="Cetak ulang otomatis bertanda SALINAN.">
        {buka && <KwitansiResmi sumber={{ jenis: 'terbit', id: buka.id }} urlVerifikasi={urlVerifikasi} />}
      </Sheet>
    </div>
  );
}

// ================================================================ Log
interface LogKwitansi {
  id: number;
  entitas: 'penerbit' | 'catatan';
  aksi: string;
  oleh: string;
  waktu: string;
  detail: Record<string, unknown> | null;
}

function TabLog() {
  const [page, setPage] = React.useState(1);
  const query = { page, per_page: 25 };
  const q = useSiakadQuery<LogKwitansi[]>(['/v1/kwitansi/log', query], (s, signal) => s.request({ method: 'GET', path: '/v1/kwitansi/log', query }, { signal }));
  const ringkas = (l: LogKwitansi) => {
    const d = l.detail ?? {};
    if (l.entitas === 'catatan') return String(d.teks ?? '').slice(0, 120) || '–';
    const data = (d.data ?? {}) as Record<string, unknown>;
    return [d.unit ? String(d.unit) : null, Object.keys(data).join(', ')].filter(Boolean).join(': ') || '–';
  };
  const kolom: DataColumn<LogKwitansi>[] = [
    { key: 'waktu', header: 'Waktu', value: (l) => l.waktu, cell: (l) => formatDate(l.waktu, 'medium'), mobile: 'subtitle' },
    { key: 'oleh', header: 'Oleh', value: (l) => l.oleh },
    { key: 'aksi', header: 'Aksi', value: (l) => `${l.aksi} ${l.entitas}`, cell: (l) => (
      <span>
        <Badge variant="outline">{l.aksi}</Badge> {l.entitas === 'catatan' ? 'aturan catatan' : 'pengaturan penerbit'}
      </span>
    ), mobile: 'title' },
    { key: 'detail', header: 'Rincian', value: ringkas },
  ];
  return <DataTable<LogKwitansi> columns={kolom} rows={q.data} rowKey={(l) => String(l.id)} loading={q.loading} error={q.error} onRetry={q.refetch} page={page} perPage={25} total={q.meta?.total ?? undefined} onPageChange={setPage} empty={{ title: 'Belum ada perubahan', icon: <FileClock /> }} mobile="cards" />;
}

// ================================================================ Pengaturan kwitansi
export interface PengaturanKwitansiProps {
  /** Batasi ke satu unit penerbit (mis. aplikasi Fakultas untuk fakultasnya). */
  unitId?: number;
  /** Alamat dasar QR untuk kwitansi terbit. */
  urlVerifikasi?: string;
  className?: string;
}

/**
 * Pengaturan kwitansi resmi unit penerbit: tampilan per unit (varian, warna, awalan nomor, tanda tangan, stempel) lewat
 * panel samping bertahap, aturan catatan pembayaran dinamis, kwitansi terbit (cetak ulang = SALINAN), dan log.
 * Hak dari izin kwitansi.atur / kwitansi.lihat (berlingkup unit).
 */
export function PengaturanKwitansi({ unitId, urlVerifikasi, className }: PengaturanKwitansiProps) {
  const q = useSiakadQuery<KwitansiSaya>(['/v1/kwitansi/saya'], (s, signal) => s.request({ method: 'GET', path: '/v1/kwitansi/saya' }, { signal }));
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  if (!q.data) return <Spinner />;
  const saya = q.data;
  if (!saya.siap) return <Alert variant="warning" title="Kwitansi resmi belum siap" className={className}>Tabel kwitansi belum dibuat di server. Jalankan php artisan migrate.</Alert>;
  if (!saya.atur && !saya.lihat)
    return (
      <Alert variant="warning" title="Belum punya akses kwitansi" className={className}>
        Minta admin memberi izin kwitansi.atur atau kwitansi.lihat untuk unit Anda (Pustikom » Hak akses).
      </Alert>
    );
  return (
    <div className={cn('u-kwp', className)}>
      <Tabs
        items={[
          { value: 'penerbit', label: 'Tampilan penerbit', icon: <Palette />, content: <TabPenerbit unitId={unitId} saya={saya} /> },
          { value: 'catatan', label: 'Catatan pembayaran', icon: <ScrollText />, content: <TabCatatan unitId={unitId} saya={saya} /> },
          ...(saya.lihat ? [{ value: 'terbit', label: 'Kwitansi terbit', icon: <Receipt />, content: <DaftarKwitansiTerbit unitId={unitId} urlVerifikasi={urlVerifikasi} /> }] : []),
          ...(saya.atur ? [{ value: 'log', label: 'Log', icon: <FileClock />, content: <TabLog /> }] : []),
        ]}
      />
    </div>
  );
}
