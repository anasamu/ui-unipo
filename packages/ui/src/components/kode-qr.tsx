'use client';
import * as React from 'react';
import { Download } from 'lucide-react';
import { cn } from '../lib/cn';
import {
  PILIHAN_QR,
  PRESET_GAYA_QR,
  hexQr,
  kontrasQr,
  normalGayaQr,
  pngDariSvgQr,
  svgKodeQr,
  type BentukMataDalamQr,
  type BentukMataLuarQr,
  type BentukModulQr,
  type GayaQr,
  type GayaQrMasukan,
  type KoreksiQr,
} from '../lib/qr';
import { Button } from './actions';
import { Alert } from './display';
import { Field, Input, SegmentedControl, Slider, Switch } from './forms';
import { Select } from './select';

export * from '../lib/qr';

export interface KodeQrProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Isi QR: URL atau teks (maks. ±2000 byte). */
  nilai: string;
  /** Objek gaya (sama dengan /v1/qr) atau nama preset: bawaan, presensi, dokumen, kartu. */
  gaya?: GayaQrMasukan | GayaQr | keyof typeof PRESET_GAYA_QR | null;
  /** Lebar dalam piksel (bawaan 200). */
  ukuran?: number;
  /** URL atau data URI logo; wajib untuk logo sumber kampus/berkas. */
  logo?: string | null;
  /** Label aksesibilitas (bawaan "Kode QR"). */
  label?: string;
  /** Tampilkan tombol unduh PNG di bawah QR. */
  unduh?: boolean | string;
}

/**
 * Kode QR yang digambar di browser (SVG, tanpa server) dengan gaya yang sama persis seperti /v1/qr:
 * warna, gradasi, bentuk modul dan mata, logo, bingkai teks. Cocok untuk QR presensi yang berganti tiap beberapa detik.
 */
export function KodeQr({ nilai, gaya, ukuran = 200, logo, label, unduh, className, style, ...props }: KodeQrProps) {
  const g = typeof gaya === 'string' ? PRESET_GAYA_QR[gaya] ?? null : gaya;
  const hasil = React.useMemo(() => {
    try {
      return { ok: svgKodeQr(nilai, g, { ukuran, logo: logo ?? null, label }) };
    } catch (e) {
      return { galat: e instanceof Error ? e.message : String(e) };
    }
  }, [nilai, JSON.stringify(g), ukuran, logo, label]);

  if (!('ok' in hasil) || !hasil.ok) {
    return (
      <span className={cn('u-kode-qr u-kode-qr-galat', className)} style={{ width: ukuran, height: ukuran, ...style }} role="img" aria-label="Kode QR gagal dibuat" {...props}>
        Isi terlalu panjang untuk kode QR
      </span>
    );
  }
  const namaFile = typeof unduh === 'string' ? unduh : 'kode-qr.png';
  return (
    <span className={cn('u-kode-qr', className)} style={{ width: ukuran, ...style }} {...props}>
      <span className="u-kode-qr-gambar" dangerouslySetInnerHTML={{ __html: hasil.ok.svg }} />
      {unduh && (
        <Button
          size="sm"
          variant="outline"
          className="u-kode-qr-unduh"
          onClick={async () => {
            const blob = await pngDariSvgQr(hasil.ok.svg, 1024);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = namaFile;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          }}
        >
          <Download /> Unduh PNG
        </Button>
      )}
    </span>
  );
}

// ---------------------------------------------------------------- pembuat gaya

const LABEL_MODUL: Record<BentukModulQr, string> = {
  kotak: 'Kotak', bulat: 'Bulat', titik: 'Titik', rounded: 'Kotak tumpul', menyatu: 'Menyatu', berlian: 'Berlian', garis_v: 'Garis tegak', garis_h: 'Garis datar',
};
const LABEL_MATA: Record<BentukMataDalamQr, string> = { kotak: 'Kotak', rounded: 'Tumpul', bulat: 'Bulat', daun: 'Daun', berlian: 'Berlian' };
const PALET = ['#0f172a', '#0f3d5e', '#1d4ed8', '#0e7490', '#047857', '#7c2d12', '#b91c1c', '#7c3aed', '#db2777'];

function WarnaQr({ label, nilai, onChange, kosong }: { label: string; nilai: string | null; onChange: (v: string | null) => void; kosong?: string }) {
  const [teks, setTeks] = React.useState(nilai ?? '');
  React.useEffect(() => setTeks(nilai ?? ''), [nilai]);
  return (
    <Field label={label}>
      <div className="u-qr-warna">
        {PALET.map((c) => (
          <button key={c} type="button" title={c} aria-label={`${label} ${c}`} aria-pressed={nilai === c} style={{ background: c }} onClick={() => onChange(c)} />
        ))}
        <label className="u-qr-warna-bebas" title="Pilih warna bebas">
          <input type="color" value={nilai ?? '#000000'} onChange={(e) => onChange(e.target.value)} aria-label={`${label} bebas`} />
        </label>
        <Input
          size="sm"
          className="u-qr-hex"
          value={teks}
          placeholder={kosong}
          aria-label={`${label} (hex)`}
          onChange={(e) => setTeks(e.target.value)}
          onBlur={() => {
            if (teks.trim() === '' && kosong) return onChange(null);
            const h = hexQr(teks);
            if (h) onChange(h);
            else setTeks(nilai ?? '');
          }}
        />
      </div>
    </Field>
  );
}

export interface PembuatGayaQrProps {
  value?: GayaQrMasukan | null;
  defaultValue?: GayaQrMasukan | null;
  onValueChange?: (gaya: GayaQr) => void;
  /** Isi QR pratinjau. */
  contoh?: string;
  /** Logo untuk pratinjau (URL/data URI), mis. logo kampus dari useGayaQr. */
  logo?: string | null;
  /** Tampilkan pilihan preset di atas. */
  preset?: boolean;
  className?: string;
}

/**
 * Penyusun gaya QR visual: preset, warna dan gradasi, bentuk modul dan mata, logo, bingkai teks, koreksi, dengan
 * pratinjau langsung dan peringatan kontras. Hasilnya objek gaya untuk POST /v1/qr/gaya atau prop `gaya` KodeQr.
 */
export function PembuatGayaQr({ value, defaultValue, onValueChange, contoh = 'https://unipo.ac.id', logo, preset = true, className }: PembuatGayaQrProps) {
  const [dalam, setDalam] = React.useState<GayaQr>(() => normalGayaQr(defaultValue ?? null));
  const g = value !== undefined ? normalGayaQr(value) : dalam;
  const ubah = (sebagian: GayaQrMasukan) => {
    const baru = normalGayaQr(sebagian, g);
    if (value === undefined) setDalam(baru);
    onValueChange?.(baru);
  };
  const latarHex = g.latar === 'transparan' ? '#ffffff' : g.latar;
  const kontras = kontrasQr(g.gradasi ? g.gradasi.warna[0]! : g.warna, latarHex);

  return (
    <div className={cn('u-qr-pembuat-wadah', className)}>
    <div className="u-qr-pembuat">
      <div className="u-qr-pembuat-isian">
        {preset && (
          <Field label="Mulai dari preset">
            <div className="u-qr-preset">
              {(Object.keys(PRESET_GAYA_QR) as Array<keyof typeof PRESET_GAYA_QR>).map((k) => (
                <button key={k} type="button" className="u-qr-preset-butir" onClick={() => {
                  const baru = normalGayaQr(PRESET_GAYA_QR[k]);
                  if (value === undefined) setDalam(baru);
                  onValueChange?.(baru);
                }}>
                  <KodeQr nilai="UNIPO" gaya={PRESET_GAYA_QR[k]} ukuran={56} aria-hidden />
                  <span>{k}</span>
                </button>
              ))}
            </div>
          </Field>
        )}

        <fieldset className="u-qr-kelompok">
          <legend>Warna</legend>
          <SegmentedControl
            aria-label="Jenis warna"
            options={[{ value: 'polos', label: 'Polos' }, { value: 'linear', label: 'Gradasi linear' }, { value: 'radial', label: 'Gradasi radial' }]}
            value={g.gradasi ? g.gradasi.jenis : 'polos'}
            onValueChange={(v) => ubah({ gradasi: v === 'polos' ? null : { jenis: v, sudut: g.gradasi?.sudut ?? 45, warna: g.gradasi?.warna ?? [g.warna, '#0e7490'] } })}
          />
          {g.gradasi ? (
            <>
              {g.gradasi.warna.map((w, i) => (
                <WarnaQr key={i} label={`Warna gradasi ${i + 1}`} nilai={w} onChange={(v) => {
                  const warna = [...g.gradasi!.warna];
                  warna[i] = v ?? w;
                  ubah({ gradasi: { ...g.gradasi!, warna } });
                }} />
              ))}
              <div className="u-qr-baris">
                {g.gradasi.warna.length < 5 && <Button size="sm" variant="ghost" onClick={() => ubah({ gradasi: { ...g.gradasi!, warna: [...g.gradasi!.warna, '#7c3aed'] } })}>Tambah warna</Button>}
                {g.gradasi.warna.length > 2 && <Button size="sm" variant="ghost" onClick={() => ubah({ gradasi: { ...g.gradasi!, warna: g.gradasi!.warna.slice(0, -1) } })}>Kurangi warna</Button>}
              </div>
              {g.gradasi.jenis === 'linear' && (
                <Field label={`Sudut ${g.gradasi.sudut}°`}>
                  <Slider min={0} max={359} value={g.gradasi.sudut} onValueChange={(v) => ubah({ gradasi: { ...g.gradasi!, sudut: Array.isArray(v) ? v[0]! : (v as number) } })} />
                </Field>
              )}
            </>
          ) : (
            <WarnaQr label="Warna modul" nilai={g.warna} onChange={(v) => ubah({ warna: v ?? g.warna })} />
          )}
          <label className="u-qr-sakelar"><Switch checked={g.latar === 'transparan'} onCheckedChange={(c) => ubah({ latar: c ? 'transparan' : '#ffffff' })} /> Latar transparan</label>
          {g.latar !== 'transparan' && <WarnaQr label="Warna latar" nilai={g.latar} onChange={(v) => ubah({ latar: v ?? '#ffffff' })} />}
          <WarnaQr label="Warna mata luar" nilai={g.warna_mata_luar} kosong="ikut warna modul" onChange={(v) => ubah({ warna_mata_luar: v })} />
          <WarnaQr label="Warna mata dalam" nilai={g.warna_mata_dalam} kosong="ikut warna modul" onChange={(v) => ubah({ warna_mata_dalam: v })} />
        </fieldset>

        <fieldset className="u-qr-kelompok">
          <legend>Bentuk</legend>
          <Field label="Modul">
            <div className="u-qr-bentuk">
              {PILIHAN_QR.modul.map((m) => (
                <button key={m} type="button" aria-pressed={g.modul === m} onClick={() => ubah({ modul: m })} title={LABEL_MODUL[m]}>
                  <KodeQr nilai="UNIPO" gaya={{ ...g, modul: m, logo: null, bingkai: null, gradasi: null, margin: 1 }} ukuran={44} aria-hidden />
                  <span>{LABEL_MODUL[m]}</span>
                </button>
              ))}
            </div>
          </Field>
          <div className="u-qr-dua">
            <Field label="Mata luar">
              <Select<BentukMataLuarQr> options={PILIHAN_QR.mata_luar.map((m) => ({ value: m, label: LABEL_MATA[m] }))} value={g.mata_luar} onValueChange={(v) => v && ubah({ mata_luar: v })} />
            </Field>
            <Field label="Mata dalam">
              <Select<BentukMataDalamQr> options={PILIHAN_QR.mata_dalam.map((m) => ({ value: m, label: LABEL_MATA[m] }))} value={g.mata_dalam} onValueChange={(v) => v && ubah({ mata_dalam: v })} />
            </Field>
          </div>
          <Field label={`Sudut latar ${g.radius_latar}%`}>
            <Slider min={0} max={50} value={g.radius_latar} onValueChange={(v) => ubah({ radius_latar: Array.isArray(v) ? v[0]! : (v as number) })} />
          </Field>
          <Field label={`Zona tenang ${g.margin} modul`} description="Ruang kosong di sekeliling QR; minimal 2 agar mudah dipindai.">
            <Slider min={0} max={10} value={g.margin} onValueChange={(v) => ubah({ margin: Array.isArray(v) ? v[0]! : (v as number) })} />
          </Field>
        </fieldset>

        <fieldset className="u-qr-kelompok">
          <legend>Logo</legend>
          <label className="u-qr-sakelar"><Switch checked={g.logo !== null} onCheckedChange={(c) => ubah({ logo: c ? { sumber: 'kampus', ukuran: 0.2, latar: '#ffffff' } : null })} /> Logo di tengah QR</label>
          {g.logo && (
            <>
              <Field label="Sumber logo">
                <SegmentedControl
                  options={[{ value: 'kampus', label: 'Logo kampus' }, { value: 'berkas', label: 'Berkas' }, { value: 'data', label: 'Unggah kecil' }]}
                  value={g.logo.sumber}
                  onValueChange={(v) => ubah({ logo: { ...g.logo!, sumber: v } })}
                />
              </Field>
              {g.logo.sumber === 'berkas' && (
                <Field label="ID berkas logo" description="UUID gambar PNG/JPG di /v1/berkas.">
                  <Input value={g.logo.berkas_id ?? ''} onChange={(e) => ubah({ logo: { ...g.logo!, berkas_id: e.target.value.trim() || null } })} />
                </Field>
              )}
              {g.logo.sumber === 'data' && (
                <Field label="Gambar logo" description="PNG/JPG/WebP, maks. ±300 KB.">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const r = new FileReader();
                      r.onload = () => ubah({ logo: { ...g.logo!, data: String(r.result) } });
                      r.readAsDataURL(f);
                    }}
                  />
                </Field>
              )}
              <Field label={`Ukuran ${Math.round(g.logo.ukuran * 100)}% lebar QR`}>
                <Slider min={8} max={30} value={Math.round(g.logo.ukuran * 100)} onValueChange={(v) => ubah({ logo: { ...g.logo!, ukuran: (Array.isArray(v) ? v[0]! : (v as number)) / 100 } })} />
              </Field>
              <div className="u-qr-baris">
                <label className="u-qr-sakelar"><Switch checked={g.logo.bulat} onCheckedChange={(c) => ubah({ logo: { ...g.logo!, bulat: c } })} /> Bulat</label>
                <label className="u-qr-sakelar"><Switch checked={g.logo.kosongkan} onCheckedChange={(c) => ubah({ logo: { ...g.logo!, kosongkan: c } })} /> Kosongkan di bawah logo</label>
              </div>
              <WarnaQr label="Latar logo" nilai={g.logo.latar} kosong="tanpa latar" onChange={(v) => ubah({ logo: { ...g.logo!, latar: v } })} />
            </>
          )}
        </fieldset>

        <fieldset className="u-qr-kelompok">
          <legend>Bingkai</legend>
          <label className="u-qr-sakelar"><Switch checked={g.bingkai !== null} onCheckedChange={(c) => ubah({ bingkai: c ? { teks: 'PINDAI SAYA', warna: g.gradasi?.warna[0] ?? g.warna } : null })} /> Bingkai dengan teks</label>
          {g.bingkai && (
            <>
              <Field label="Teks" description="Maksimal 40 karakter.">
                <Input value={g.bingkai.teks} maxLength={40} onChange={(e) => ubah({ bingkai: { ...g.bingkai!, teks: e.target.value } })} />
              </Field>
              <div className="u-qr-dua">
                <Field label="Letak teks">
                  <SegmentedControl options={[{ value: 'bawah', label: 'Bawah' }, { value: 'atas', label: 'Atas' }]} value={g.bingkai.posisi} onValueChange={(v) => ubah({ bingkai: { ...g.bingkai!, posisi: v } })} />
                </Field>
                <Field label="Bentuk">
                  <SegmentedControl options={[{ value: 'kotak', label: 'Kotak' }, { value: 'pil', label: 'Pil' }]} value={g.bingkai.bentuk} onValueChange={(v) => ubah({ bingkai: { ...g.bingkai!, bentuk: v } })} />
                </Field>
              </div>
              <WarnaQr label="Warna bingkai" nilai={g.bingkai.warna} onChange={(v) => ubah({ bingkai: { ...g.bingkai!, warna: v ?? g.bingkai!.warna } })} />
              <WarnaQr label="Warna teks bingkai" nilai={g.bingkai.warna_teks} onChange={(v) => ubah({ bingkai: { ...g.bingkai!, warna_teks: v ?? g.bingkai!.warna_teks } })} />
            </>
          )}
        </fieldset>

        <Field label="Tingkat koreksi" description="Makin tinggi makin tahan rusak/logo, tapi QR makin rapat. Logo menaikkan koreksi otomatis.">
          <SegmentedControl<KoreksiQr> options={PILIHAN_QR.koreksi.map((k) => ({ value: k, label: k }))} value={g.koreksi} onValueChange={(v) => ubah({ koreksi: v })} />
        </Field>
      </div>

      <div className="u-qr-pembuat-pratinjau">
        <KodeQr nilai={contoh} gaya={g} ukuran={240} logo={logo ?? null} unduh="gaya-qr.png" />
        {kontras < 3 && (
          <Alert variant="warning" title="Kontras rendah">
            Warna modul dan latar terlalu mirip (kontras {kontras.toFixed(1)}:1); sebagian pemindai mungkin gagal. Usahakan minimal 4:1.
          </Alert>
        )}
        {g.logo && !logo && g.logo.sumber !== 'data' && <p className="u-qr-catatan">Logo {g.logo.sumber === 'kampus' ? 'kampus' : 'berkas'} tampil di QR dari server; pratinjau ini tanpa gambar logo.</p>}
      </div>
    </div>
    </div>
  );
}

