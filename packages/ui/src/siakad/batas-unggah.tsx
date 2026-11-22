'use client';
import * as React from 'react';
import { Check, CircleAlert, FlaskConical, Plus } from 'lucide-react';
import { Button, Tag } from '../components/actions';
import { Alert } from '../components/display';
import { Field, Input, Switch } from '../components/forms';
import { SliderNilai } from '../components/alokasi';
import { Sheet } from '../components/overlays';
import { formatBytes } from '../lib/format';
import { invalidateSiakad, pesanGalat, useSiakad } from './provider';
import { Tekan } from '../components/tekan';
import { sedangMenyusunIme } from '../lib/ime';

/**
 * Batas unggah per aplikasi dan per unit (aturan penyimpanan Pustikom, docs/PENYIMPANAN.md "Batas unggah per aplikasi
 * dan unit" di siakad_unipo): ukuran maksimal per berkas dan jenis berkas yang diterima/dilarang. Digabung paling ketat
 * dengan tingkat lain di server; panel ini hanya mengatur satu tingkat.
 */

/** Kelompok jenis berkas untuk chip preset (sama dengan Penyimpanan\Services\Aplikasi::PRESET; server mengirim versinya). */
export type PresetJenisBerkas = Record<string, { label: string; ekstensi: string[] }>;
export const PRESET_JENIS_BERKAS: PresetJenisBerkas = {
  dokumen: { label: 'Dokumen', ekstensi: ['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt'] },
  gambar: { label: 'Gambar', ekstensi: ['jpg', 'png', 'webp', 'gif'] },
  spreadsheet: { label: 'Spreadsheet', ekstensi: ['xls', 'xlsx', 'ods', 'csv'] },
  presentasi: { label: 'Presentasi', ekstensi: ['ppt', 'pptx', 'odp'] },
  arsip: { label: 'Arsip (zip)', ekstensi: ['zip', 'rar', '7z'] },
  video: { label: 'Video', ekstensi: ['mp4', 'webm', 'mov'] },
  audio: { label: 'Audio', ekstensi: ['mp3', 'wav', 'm4a'] },
  program: { label: 'Program & skrip (berbahaya)', ekstensi: ['exe', 'bat', 'cmd', 'msi', 'sh', 'ps1', 'js', 'vbs', 'jar', 'apk'] },
};

const MB = 1048576;
const normal = (e: string) => {
  const x = e.trim().toLowerCase().replace(/^\./, '');
  return x === 'jpeg' ? 'jpg' : x;
};
const unik = (l: string[]) => [...new Set(l.map(normal).filter((x) => /^[a-z0-9]{1,10}$/.test(x)))];
export const teksJenisBerkas = (l: string[]) => unik(l).map((e) => e.toUpperCase()).join(', ');

/** Nilai satu tingkat batas unggah. null = ikut tingkat di atas / tidak membatasi. */
export interface NilaiBatasUnggah {
  maks_berkas_byte: number | null;
  ekstensi_izin: string[] | null;
  ekstensi_larang: string[] | null;
}

/** Ringkas satu tingkat: "Maks 5 MB · PDF, JPG, PNG" (bagian yang tidak diatur tidak disebut). */
export function ringkasBatasUnggah(v: NilaiBatasUnggah | null | undefined, kosong = 'Belum diatur'): string {
  if (!v) return kosong;
  const o: string[] = [];
  if (v.maks_berkas_byte !== null) o.push(`Maks ${formatBytes(v.maks_berkas_byte)}`);
  if (v.ekstensi_izin?.length) o.push(`hanya ${teksJenisBerkas(v.ekstensi_izin)}`);
  if (v.ekstensi_larang?.length) o.push(`tanpa ${teksJenisBerkas(v.ekstensi_larang)}`);
  return o.length ? o.join(' · ') : kosong;
}

export interface PemilihEkstensiProps {
  /** null = tidak diatur (ikut tingkat di atas). */
  value: string[] | null;
  onValueChange: (v: string[] | null) => void;
  label: string;
  description?: string;
  /** Teks saklar saat tidak diatur, mis. "Ikut tingkat di atas". */
  teksMati: string;
  preset?: PresetJenisBerkas;
  /** Sembunyikan preset tertentu (mis. "program" untuk daftar izin). */
  tanpaPreset?: string[];
  nada?: 'izin' | 'larang';
}

/** Pemilih ekstensi dengan chip preset kelompok jenis (Dokumen, Gambar, …) dan isian ekstensi tambahan. */
export function PemilihEkstensi({ value, onValueChange, label, description, teksMati, preset = PRESET_JENIS_BERKAS, tanpaPreset = [], nada = 'izin' }: PemilihEkstensiProps) {
  const [ketik, setKetik] = React.useState('');
  const aktif = value !== null;
  const daftar = value ?? [];
  const tambah = (l: string[]) => onValueChange(unik([...daftar, ...l]));
  const kurangi = (l: string[]) => onValueChange(daftar.filter((e) => !l.map(normal).includes(normal(e))));
  const masukkan = () => {
    const l = ketik.split(/[\s,;]+/).filter(Boolean);
    if (l.length) tambah(l);
    setKetik('');
  };
  return (
    <div className="u-bu-ekstensi" data-nada={nada}>
      <label className="u-bu-saklar">
        <Switch checked={aktif} onCheckedChange={(v) => onValueChange(v ? [] : null)} aria-label={`Atur ${label.toLowerCase()}`} />
        <span>
          <b>{label}</b>
          <small>{aktif ? description : teksMati}</small>
        </span>
      </label>
      {aktif && (
        <>
          <div className="u-bu-preset" role="group" aria-label={`Preset ${label.toLowerCase()}`}>
            {Object.entries(preset)
              .filter(([k]) => !tanpaPreset.includes(k))
              .map(([k, p]) => {
                const semua = p.ekstensi.every((e) => daftar.map(normal).includes(normal(e)));
                return (
                  <Tag
                    key={k}
                    active={semua}
                    render={<Tekan terpilih={semua} title={p.ekstensi.map((e) => `.${e}`).join(' ')} />}
                    onClick={() => (semua ? kurangi(p.ekstensi) : tambah(p.ekstensi))}
                    icon={semua ? <Check size={12} aria-hidden /> : <Plus size={12} aria-hidden />}
                  >
                    {p.label}
                  </Tag>
                );
              })}
          </div>
          <div className="u-bu-terpilih" aria-live="polite">
            {daftar.length ? (
              daftar.map((e) => (
                <Tag key={e} size="sm" onRemove={() => kurangi([e])} removeLabel={`Hapus .${e}`}>
                  .{e}
                </Tag>
              ))
            ) : (
              <small>{nada === 'izin' ? 'Belum ada jenis dipilih: semua jenis aman diterima.' : 'Belum ada jenis dilarang.'}</small>
            )}
          </div>
          <div className="u-bu-ketik">
            <Input
              size="sm"
              value={ketik}
              onChange={(e) => setKetik(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  if (sedangMenyusunIme(e)) return;
                  masukkan();
                }
              }}
              placeholder="Tambah ekstensi lain, mis. dwg"
              aria-label={`Tambah ekstensi ke ${label.toLowerCase()}`}
            />
            <Button size="sm" variant="outline" onClick={masukkan} disabled={!ketik.trim()}>
              <Plus aria-hidden />
              Tambah
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/** Uji satu berkas terhadap nilai tingkat ini saja (tingkat lain bisa lebih ketat). */
function ujiBerkas(v: NilaiBatasUnggah, nama: string, ukuran: number | null, sumber: string): { ok: boolean; teks: string } {
  const ext = normal(nama.includes('.') ? (nama.split('.').pop() ?? '') : '');
  if (!ext) return { ok: false, teks: 'Tulis nama berkas dengan ekstensi, mis. laporan.docx.' };
  if (v.ekstensi_larang?.map(normal).includes(ext)) return { ok: false, teks: `${sumber} tidak menerima berkas .${ext}.` };
  const izin = v.ekstensi_izin?.length ? unik(v.ekstensi_izin) : null;
  const batas = `${izin ? teksJenisBerkas(izin) : 'berkas'}${v.maks_berkas_byte !== null ? ` hingga ${formatBytes(v.maks_berkas_byte)}` : ''}`;
  if (izin && !izin.includes(ext)) return { ok: false, teks: `${sumber} hanya menerima ${batas} (berkas ini .${ext}).` };
  if (ukuran !== null && v.maks_berkas_byte !== null && ukuran > v.maks_berkas_byte) return { ok: false, teks: `${sumber} hanya menerima ${batas} (berkas ini ${formatBytes(ukuran)}).` };
  return { ok: true, teks: `Diterima oleh ${sumber.charAt(0).toLowerCase()}${sumber.slice(1)}. Tingkat lain (bawaan, unit, aplikasi) bisa lebih ketat.` };
}

export interface PanelBatasUnggahProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** aplikasi = per klien (kunci client_id); unit = per unit (kunci kode unit, menurun ke sub-unit). */
  lingkup: 'aplikasi' | 'unit';
  kunci: string;
  /** Nama awam, mis. "Panitia PMB" atau "Fakultas Teknik". */
  nama: string;
  awal: NilaiBatasUnggah | null;
  preset?: PresetJenisBerkas;
  /** Keterangan tambahan, mis. batas yang diwarisi dari unit induk. */
  keterangan?: React.ReactNode;
  onTersimpan?: () => void;
}

/**
 * Panel samping Pustikom: atur ukuran maksimal per berkas dan jenis berkas diizinkan/dilarang untuk satu aplikasi atau
 * unit, dengan chip preset dan uji berkas. Simpan ke POST /v1/berkas/penyimpanan/kebijakan (hanya Pustikom).
 */
export function PanelBatasUnggah({ open, onOpenChange, lingkup, kunci, nama, awal, preset = PRESET_JENIS_BERKAS, keterangan, onTersimpan }: PanelBatasUnggahProps) {
  const siakad = useSiakad();
  const [maks, setMaks] = React.useState<number | null>(awal?.maks_berkas_byte ?? null);
  const [izin, setIzin] = React.useState<string[] | null>(awal?.ekstensi_izin ?? null);
  const [larang, setLarang] = React.useState<string[] | null>(awal?.ekstensi_larang ?? null);
  const [uji, setUji] = React.useState({ nama: '', mb: '' });
  const [galat, setGalat] = React.useState<string | null>(null);
  const [simpan, setSimpan] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    setMaks(awal?.maks_berkas_byte ?? null);
    setIzin(awal?.ekstensi_izin ?? null);
    setLarang(awal?.ekstensi_larang ?? null);
    setGalat(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kunci]);
  const sumber = lingkup === 'aplikasi' ? `Aplikasi ${nama}` : nama;
  const nilai: NilaiBatasUnggah = { maks_berkas_byte: maks, ekstensi_izin: izin && izin.length ? izin : izin === null ? null : [], ekstensi_larang: larang && larang.length ? larang : null };
  const hasilUji = uji.nama.trim() ? ujiBerkas(nilai, uji.nama.trim(), uji.mb.trim() ? Math.round(Number(uji.mb.replace(',', '.')) * MB) : null, sumber) : null;
  const kosong = maks === null && (izin === null || !izin.length) && (larang === null || !larang.length);

  const kirim = async () => {
    setGalat(null);
    setSimpan(true);
    try {
      if (lingkup === 'aplikasi' && kosong) {
        await siakad.request({ method: 'POST', path: '/v1/berkas/penyimpanan/kebijakan/hapus', body: { lingkup, kunci } });
      } else {
        await siakad.request({
          method: 'POST',
          path: '/v1/berkas/penyimpanan/kebijakan',
          body: { lingkup, kunci, maks_berkas_byte: maks, ekstensi_izin: izin && izin.length ? izin : null, ekstensi_larang: larang && larang.length ? larang : null },
        });
      }
      invalidateSiakad('penyimpanan');
      invalidateSiakad('berkas-info');
      onTersimpan?.();
      onOpenChange(false);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSimpan(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Batas unggah · ${nama}`}
      description={
        lingkup === 'aplikasi'
          ? 'Berlaku untuk semua unggahan lewat aplikasi ini, digabung paling ketat dengan aturan pengguna dan unit.'
          : 'Berlaku untuk unggahan ke ruang unit ini dan ruang pribadi anggotanya, termasuk sub-unit yang tidak mengatur sendiri.'
      }
      size="lg"
      footer={
        <div className="u-bu-kaki">
          <span>{kosong ? (lingkup === 'aplikasi' ? 'Tanpa batas khusus aplikasi' : 'Mengikuti induk/bawaan') : `Ringkas: ${ringkasBatasUnggah(nilai)}`}</span>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={simpan}>
            Batal
          </Button>
          <Button onClick={() => void kirim()} loading={simpan}>
            Simpan
          </Button>
        </div>
      }
    >
      <div className="u-bu">
        {galat && <Alert variant="danger">{galat}</Alert>}
        {keterangan && <div className="u-bu-ket">{keterangan}</div>}
        <section className="u-bu-bagian">
          <label className="u-bu-saklar">
            <Switch checked={maks !== null} onCheckedChange={(v) => setMaks(v ? 10 * MB : null)} aria-label="Atur ukuran maksimal per berkas" />
            <span>
              <b>Ukuran maksimal per berkas</b>
              <small>{maks === null ? (lingkup === 'aplikasi' ? 'Tidak dibatasi khusus aplikasi ini' : 'Mengikuti unit induk atau bawaan') : 'Yang terkecil dari semua tingkat yang berlaku'}</small>
            </span>
          </label>
          {maks !== null && <SliderNilai label="Maks per berkas" value={maks} onValueChange={setMaks} min={MB / 4} max={Math.max(500 * MB, maks)} />}
        </section>
        <section className="u-bu-bagian">
          <PemilihEkstensi
            label="Jenis berkas yang diterima"
            description="Hanya jenis ini yang boleh diunggah (irisan dengan tingkat lain)."
            teksMati={lingkup === 'aplikasi' ? 'Semua jenis yang diizinkan tingkat lain' : 'Mengikuti unit induk atau bawaan'}
            value={izin}
            onValueChange={setIzin}
            preset={preset}
            tanpaPreset={['program']}
          />
        </section>
        <section className="u-bu-bagian">
          <PemilihEkstensi
            label="Jenis berkas yang dilarang"
            description="Selalu ditolak, digabung dengan larangan tingkat lain."
            teksMati="Tidak ada larangan tambahan"
            value={larang}
            onValueChange={setLarang}
            preset={preset}
            nada="larang"
          />
        </section>
        <section className="u-bu-bagian u-bu-uji" aria-label="Uji berkas">
          <h4>
            <FlaskConical aria-hidden />
            Uji berkas
          </h4>
          <div className="u-bu-uji-isian">
            <Field label="Nama berkas">
              <Input size="sm" value={uji.nama} onChange={(e) => setUji((u) => ({ ...u, nama: e.target.value }))} placeholder="Mis. ijazah.docx" />
            </Field>
            <Field label="Ukuran (MB)">
              <Input size="sm" inputMode="decimal" value={uji.mb} onChange={(e) => setUji((u) => ({ ...u, mb: e.target.value.replace(/[^\d.,]/g, '') }))} placeholder="Mis. 6" />
            </Field>
          </div>
          {hasilUji && (
            <p className="u-bu-uji-hasil" data-ok={hasilUji.ok ? '' : undefined} role="status">
              {hasilUji.ok ? <Check aria-hidden /> : <CircleAlert aria-hidden />}
              {hasilUji.teks}
            </p>
          )}
        </section>
      </div>
    </Sheet>
  );
}
