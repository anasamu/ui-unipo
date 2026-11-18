'use client';
import * as React from 'react';
import { ArrowLeft, BookOpenText, Check, CircleAlert, Copy, GitCompare, GripVertical, MessageSquare, Pencil, Plus, Save, Send, ShieldCheck, Stamp, Trash2, Undo2, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Empty, Tabs } from '../components/display';
import { Field, Input, Textarea } from '../components/forms';
import { Combobox, Select } from '../components/select';
import { ConfirmDialog, Sheet } from '../components/overlays';
import { IsianTanggal } from '../components/formulir';
import { PanelLangkah } from '../components/panel-langkah';
import { WizardReview } from '../components/wizard';
import { EditorBlok } from '../editor/EditorBlok';
import type { Blok, TipeBlok } from '../editor/tipe';
import { pesanGalat } from './provider';
import { PilihSK } from './isian-sk';
import { AlurPemeriksa, LabelPemeriksa, type TahapPemeriksa } from './pemeriksa';
import {
  BlokParameter,
  LABEL_LINGKUP_PEDOMAN,
  LencanaStatusPedoman,
  NaskahPedoman,
  TombolPdfPedoman,
  tanggalPedoman,
  useAksiPedoman,
  usePedoman,
  type ButirPedoman,
  type KatalogPedoman,
  type ParameterPedoman,
  type VersiPedoman,
} from './pedoman';

/*
 * Ruang kerja penyusunan pedoman: pohon bab/bagian/pasal/ayat (seret untuk urut, nomor otomatis) di kiri, editor blok
 * butir terpilih di tengah, panel parameter, pemeriksaan konflik, komentar per pasal, dan alur pengesahan di kanan.
 * Semua isian di panel samping; isian banyak memakai PanelLangkah.
 */

const TIPE_ISI: TipeBlok[] = ['paragraf', 'daftar', 'tabel', 'sorotan', 'kutipan'];
const ANAK: Record<string, ButirPedoman['tipe'][]> = { '': ['bab', 'pasal', 'lampiran'], bab: ['bagian', 'pasal'], bagian: ['pasal'], pasal: ['ayat', 'definisi'], ayat: ['definisi'], lampiran: [], definisi: [] };
const NAMA_TIPE: Record<ButirPedoman['tipe'], string> = { bab: 'Bab', bagian: 'Bagian', pasal: 'Pasal', ayat: 'Ayat', lampiran: 'Lampiran', definisi: 'Definisi istilah' };

export interface RuangPedomanProps {
  versiId: number;
  onVersi?: (id: number) => void;
  onKembali?: () => void;
  className?: string;
}

export function RuangPedoman({ versiId, onVersi, onKembali, className }: RuangPedomanProps) {
  const q = usePedoman<VersiPedoman>(['versi', versiId], `/v1/pedoman/versi/${versiId}`);
  const kirim = useAksiPedoman();
  const [pilih, setPilih] = React.useState<number | null>(null);
  const [panel, setPanel] = React.useState<null | 'param' | 'sahkan' | 'banding' | 'identitas' | { tinjau: string } | 'setujui' | 'kembalikan' | 'cabut' | 'ajukan'>(null);
  const [ubahParam, setUbahParam] = React.useState<ParameterPedoman | null>(null);
  const [hapus, setHapus] = React.useState<ButirPedoman | null>(null);
  const v = q.data;
  React.useEffect(() => {
    if (v && pilih === null) setPilih(v.butir.find((b) => b.tipe === 'pasal')?.id ?? v.butir[0]?.id ?? null);
  }, [v, pilih]);
  if (q.loading && !v) return <Skeleton style={{ height: 480 }} />;
  if (q.error || !v)
    return (
      <Alert variant="danger" title="Pedoman tidak dapat dibuka">
        {q.error ? pesanGalat(q.error) : null}
      </Alert>
    );
  const aksi = v.aksi ?? [];
  const draf = v.status === 'draf' && aksi.includes('ubah');
  const terpilih = v.butir.find((b) => b.id === pilih) ?? null;
  // aksi 'tinjau:BAAK' = kode tahap tinjau per unit; 'tinjau:tinjau' = satu tahap tinjau (kode 'tinjau').
  const tinjau = aksi.filter((a) => a.startsWith('tinjau:')).map((a) => (a === 'tinjau:tinjau' ? 'tinjau' : a));
  const galat = (v.periksa ?? []).filter((x) => x.tingkat === 'galat');
  const tambahButir = async (tipe: ButirPedoman['tipe'], induk: number | null) => {
    const r = await kirim<{ id: number }>('POST', `/v1/pedoman/versi/${v.id}/butir`, { tipe, induk_id: induk, judul: tipe === 'definisi' ? 'Istilah baru' : tipe === 'ayat' ? null : `${NAMA_TIPE[tipe]} baru` });
    setPilih(r.id);
  };
  const indukUntuk = (tipe: ButirPedoman['tipe']): number | null | undefined => {
    // Cari leluhur terdekat butir terpilih yang boleh menampung tipe ini.
    let b: ButirPedoman | null | undefined = terpilih;
    while (b) {
      if (ANAK[b.tipe]?.includes(tipe)) return b.id;
      const indukId: number | null = b.induk_id;
      b = indukId === null ? null : v.butir.find((x) => x.id === indukId);
    }
    return ANAK[''].includes(tipe) ? null : undefined;
  };
  return (
    <div className={cn('u-pdm-ruang', className)}>
      <header className="u-pdm-ruang-kepala">
        <div className="u-pdm-ruang-judul">
          {onKembali && (
            <Button variant="ghost" size="sm" iconOnly aria-label="Kembali ke daftar" onClick={onKembali}>
              <ArrowLeft />
            </Button>
          )}
          <div>
            <p className="u-pdm-label">
              {v.dokumen.jenis.nama} · {LABEL_LINGKUP_PEDOMAN[v.dokumen.lingkup]}
              {v.dokumen.unit_nama ? ` · ${v.dokumen.unit_nama}` : ''} · {v.dokumen.kode}
            </p>
            <h2>
              {v.judul} <LencanaStatusPedoman status={v.status} />
            </h2>
            <p className="u-pdm-redup">
              <LabelPemeriksa pemeriksa={(v.pemeriksa ?? []) as unknown as TahapPemeriksa[]} cadangan={v.sk ? `SK ${v.sk.nomor}, berlaku ${tanggalPedoman(v.berlaku_mulai)}` : `Diubah ${tanggalPedoman(v.diubah)}`} />
            </p>
          </div>
        </div>
        <div className="u-pdm-aksi">
          {v.versi_lain.length > 1 && (
            <Select
              size="sm"
              options={v.versi_lain.map((x) => ({ value: String(x.id), label: `Versi ${x.versi} · ${x.status}` }))}
              value={String(v.id)}
              onValueChange={(x) => x && onVersi?.(Number(x))}
              placeholder="Pilih versi…"
            />
          )}
          {(v.salin_dari_id || v.versi_lain.length > 1) && (
            <Button size="sm" variant="ghost" onClick={() => setPanel('banding')}>
              <GitCompare /> Banding
            </Button>
          )}
          <TombolPdfPedoman versiId={v.id} label={v.status === 'berlaku' ? 'PDF resmi' : 'Pratinjau PDF'} />
          {draf && (
            <Button size="sm" variant="ghost" onClick={() => setPanel('identitas')}>
              <Pencil /> Identitas
            </Button>
          )}
          {aksi.includes('salin') && (
            <Button size="sm" variant="outline" onClick={() => void kirim<VersiPedoman>('POST', `/v1/pedoman/versi/${v.id}/salin`, {}, 'Versi baru dibuat sebagai draf').then((x) => onVersi?.(x.id))}>
              <Copy /> Buat versi baru
            </Button>
          )}
          {aksi.includes('tarik') && (
            <Button size="sm" variant="ghost" onClick={() => void kirim('POST', `/v1/pedoman/versi/${v.id}/tarik`, {}, 'Ditarik ke draf')}>
              <Undo2 /> Tarik ke draf
            </Button>
          )}
          {tinjau.map((t) => (
            <Button key={t} size="sm" variant="outline" onClick={() => setPanel({ tinjau: t })}>
              <ShieldCheck /> Tinjau{t !== 'tinjau' ? ` ${t.replace('tinjau:', '')}` : ''}
            </Button>
          ))}
          {aksi.includes('kembalikan') && (
            <Button size="sm" variant="outline" onClick={() => setPanel('kembalikan')}>
              <Undo2 /> Kembalikan
            </Button>
          )}
          {aksi.includes('setujui') && (
            <Button size="sm" onClick={() => setPanel('setujui')}>
              <Check /> Setujui
            </Button>
          )}
          {aksi.includes('sahkan') && (
            <Button size="sm" onClick={() => setPanel('sahkan')}>
              <Stamp /> Sahkan dengan SK
            </Button>
          )}
          {aksi.includes('berlakukan') && (
            <Button size="sm" onClick={() => void kirim('POST', `/v1/pedoman/versi/${v.id}/berlakukan`, {}, 'Pedoman berlaku')}>
              <Check /> Berlakukan sekarang
            </Button>
          )}
          {aksi.includes('cabut') && (
            <Button size="sm" variant="destructive-soft" onClick={() => setPanel('cabut')}>
              <X /> Cabut
            </Button>
          )}
          {aksi.includes('ajukan') && (
            <Button size="sm" disabled={galat.length > 0} onClick={() => setPanel('ajukan')}>
              <Send /> Ajukan tinjauan
            </Button>
          )}
        </div>
      </header>
      {galat.length > 0 && (
        <Alert variant="danger" title="Ada konflik dengan pedoman induk atau pedoman lain">
          <ul className="u-pdm-ringkas">
            {galat.map((g, i) => (
              <li key={i}>
                <code>{g.kunci}</code> {g.pasal ? `(${g.pasal})` : ''}: {g.pesan}
              </li>
            ))}
          </ul>
        </Alert>
      )}
      <div className="u-pdm-ruang-kisi">
        <aside className="u-pdm-pohon" aria-label="Struktur pedoman">
          <PohonButir versi={v} pilih={pilih} onPilih={setPilih} bisaSeret={draf} />
          {draf && (
            <div className="u-pdm-pohon-tambah">
              {(['bab', 'bagian', 'pasal', 'ayat', 'definisi', 'lampiran'] as const).map((t) => {
                const induk = indukUntuk(t);
                return (
                  <Button key={t} size="xs" variant="ghost" disabled={induk === undefined} onClick={() => void tambahButir(t, induk ?? null)}>
                    <Plus /> {NAMA_TIPE[t]}
                  </Button>
                );
              })}
            </div>
          )}
        </aside>
        <section className="u-pdm-tengah">
          {draf && terpilih ? (
            <EditorButir key={terpilih.id + ':' + v.diubah} versi={v} butir={terpilih} onHapus={() => setHapus(terpilih)} onTambahParam={() => setPanel('param')} onUbahParam={setUbahParam} />
          ) : (
            <NaskahPedoman versi={v} pilih={pilih} onPilih={setPilih} />
          )}
        </section>
        <aside className="u-pdm-kanan">
          <PanelKanan versi={v} butir={terpilih} draf={draf} onTambahParam={() => setPanel('param')} onUbahParam={setUbahParam} />
        </aside>
      </div>

      {(panel === 'param' || ubahParam) && (
        <PanelParameter
          versi={v}
          butirAwal={ubahParam?.butir_id ?? terpilih?.id ?? null}
          awal={ubahParam}
          onOpenChange={(o) => {
            if (!o) {
              setPanel(null);
              setUbahParam(null);
            }
          }}
        />
      )}
      {panel === 'sahkan' && <PanelSahkan versi={v} onOpenChange={(o) => !o && setPanel(null)} />}
      {panel === 'banding' && <PanelBandingPedoman versi={v} onOpenChange={(o) => !o && setPanel(null)} />}
      {panel === 'identitas' && <PanelIdentitas versi={v} onOpenChange={(o) => !o && setPanel(null)} />}
      {panel && typeof panel === 'object' && 'tinjau' in panel && <PanelKeputusan versi={v} jenis="tinjau" tahap={panel.tinjau} onOpenChange={(o) => !o && setPanel(null)} />}
      {(panel === 'setujui' || panel === 'kembalikan' || panel === 'cabut' || panel === 'ajukan') && <PanelKeputusan versi={v} jenis={panel} onOpenChange={(o) => !o && setPanel(null)} />}
      <ConfirmDialog
        open={hapus !== null}
        onOpenChange={(o) => !o && setHapus(null)}
        title={`Hapus ${hapus ? hapus.label || NAMA_TIPE[hapus.tipe] : ''}?`}
        description="Butir turunan dan parameternya ikut terhapus. Penomoran disesuaikan otomatis."
        confirmLabel="Hapus"
        tone="danger"
        onConfirm={async () => {
          if (!hapus) return;
          await kirim('DELETE', `/v1/pedoman/butir/${hapus.id}`, undefined, 'Butir dihapus');
          setPilih(hapus.induk_id);
          setHapus(null);
        }}
      />
    </div>
  );
}

// ------------------------------------------------------------------ pohon (seret untuk urut)

function PohonButir({ versi: v, pilih, onPilih, bisaSeret }: { versi: VersiPedoman; pilih: number | null; onPilih: (id: number) => void; bisaSeret: boolean }) {
  const kirim = useAksiPedoman();
  const [seret, setSeret] = React.useState<number | null>(null);
  const [atas, setAtas] = React.useState<number | null>(null);
  const jatuh = async (target: ButirPedoman) => {
    const asal = v.butir.find((b) => b.id === seret);
    setSeret(null);
    setAtas(null);
    if (!asal || asal.id === target.id) return;
    // Pindah ke posisi sebelum target di induk target (atau ke dalam target bila target bisa menampungnya).
    const keDalam = target.tipe !== asal.tipe && (ANAK[target.tipe] ?? []).includes(asal.tipe);
    const indukBaru = keDalam ? target.id : target.induk_id;
    const saudara = v.butir.filter((b) => b.induk_id === indukBaru && b.id !== asal.id).map((b) => b.id);
    const posisi = keDalam ? saudara.length : Math.max(0, saudara.indexOf(target.id));
    saudara.splice(posisi, 0, asal.id);
    try {
      await kirim('POST', `/v1/pedoman/versi/${v.id}/urut`, { induk_id: indukBaru, urutan: saudara }, 'Urutan disimpan');
    } catch {
      /* toast sudah tampil */
    }
  };
  if (v.butir.length === 0) return <Empty title="Belum ada isi" description="Tambahkan bab atau pasal." />;
  return (
    <ul className="u-pdm-pohon-daftar">
      {v.butir.map((b) => (
        <li
          key={b.id}
          className="u-pdm-pohon-item"
          style={{ paddingInlineStart: 8 + b.kedalaman * 14 }}
          data-aktif={pilih === b.id || undefined}
          data-atas={atas === b.id || undefined}
          data-tipe={b.tipe}
          draggable={bisaSeret}
          onDragStart={(e) => {
            setSeret(b.id);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragOver={(e) => {
            if (seret !== null) {
              e.preventDefault();
              setAtas(b.id);
            }
          }}
          onDragLeave={() => setAtas((x) => (x === b.id ? null : x))}
          onDrop={(e) => {
            e.preventDefault();
            void jatuh(b);
          }}
          onDragEnd={() => {
            setSeret(null);
            setAtas(null);
          }}
        >
          <button type="button" onClick={() => onPilih(b.id)}>
            {bisaSeret && <GripVertical className="u-pdm-seret" aria-hidden />}
            <span className="u-pdm-pohon-nomor">{b.nomor}</span>
            <span className="u-pdm-pohon-judul">{b.judul || ringkasIsi(b)}</span>
            {v.parameter.some((p) => p.butir_id === b.id) && <Badge variant="primary" size="md">P</Badge>}
          </button>
        </li>
      ))}
    </ul>
  );
}

function ringkasIsi(b: ButirPedoman): string {
  const t = b.isi
    .map((x) => String((x.data as { teks?: string }).teks ?? ''))
    .join(' ')
    .replace(/<[^>]+>/g, '')
    .trim();
  return t ? (t.length > 48 ? t.slice(0, 48) + '…' : t) : '(kosong)';
}

// ------------------------------------------------------------------ editor butir

function EditorButir({ versi: v, butir: b, onHapus, onTambahParam, onUbahParam }: { versi: VersiPedoman; butir: ButirPedoman; onHapus: () => void; onTambahParam: () => void; onUbahParam: (p: ParameterPedoman) => void }) {
  const kirim = useAksiPedoman();
  const [judul, setJudul] = React.useState(b.judul ?? '');
  const [isi, setIsi] = React.useState<Blok[]>(b.isi as unknown as Blok[]);
  const [kotor, setKotor] = React.useState(false);
  const [sibuk, setSibuk] = React.useState(false);
  const simpan = async () => {
    setSibuk(true);
    try {
      await kirim('PUT', `/v1/pedoman/butir/${b.id}`, { judul: b.tipe === 'ayat' ? null : judul, isi }, 'Tersimpan');
      setKotor(false);
    } finally {
      setSibuk(false);
    }
  };
  const param = v.parameter.filter((p) => p.butir_id === b.id);
  const anak = v.butir.filter((x) => x.induk_id === b.id);
  return (
    <div className="u-pdm-editor">
      <div className="u-pdm-editor-kepala">
        <div>
          <p className="u-pdm-label">{NAMA_TIPE[b.tipe]}</p>
          <h3>{b.label || b.nomor}</h3>
        </div>
        <div className="u-pdm-aksi">
          {kotor && <Badge variant="warning">Belum disimpan</Badge>}
          {['pasal', 'ayat', 'lampiran'].includes(b.tipe) && (
            <Button size="sm" variant="outline" onClick={onTambahParam}>
              <Plus /> Parameter
            </Button>
          )}
          <Button size="sm" variant="ghost" iconOnly aria-label="Hapus butir" onClick={onHapus}>
            <Trash2 />
          </Button>
          <Button size="sm" loading={sibuk} disabled={!kotor} onClick={() => void simpan()}>
            <Save /> Simpan
          </Button>
        </div>
      </div>
      {b.tipe !== 'ayat' && (
        <Field label={b.tipe === 'definisi' ? 'Istilah' : 'Judul'} optional={b.tipe === 'pasal'}>
          <Input
            value={judul}
            onChange={(e) => {
              setJudul(e.target.value);
              setKotor(true);
            }}
            placeholder={b.tipe === 'definisi' ? 'Mis. Satuan Kredit Semester' : 'Mis. Beban belajar semester'}
          />
        </Field>
      )}
      <div className="u-pdm-editor-kanvas">
        <p className="u-pdm-label">{b.tipe === 'definisi' ? 'Arti istilah' : b.tipe === 'ayat' ? 'Bunyi ayat' : 'Isi (opsional untuk bab/pasal yang memiliki ayat)'}</p>
        <EditorBlok
          blok={isi}
          set={(x) => {
            setIsi(x);
            setKotor(true);
          }}
          tipe={TIPE_ISI}
        />
      </div>
      {param.map((p) => (
        <BlokParameter
          key={p.id}
          p={p}
          aksi={
            <Button size="xs" variant="ghost" onClick={() => onUbahParam(p)}>
              <Pencil /> Ubah
            </Button>
          }
        />
      ))}
      {anak.length > 0 && (
        <div className="u-pdm-editor-anak">
          <p className="u-pdm-label">Turunan</p>
          <NaskahPedoman kepala={false} versi={{ ...v, butir: v.butir.filter((x) => estTurunan(v.butir, x, b.id)) }} />
        </div>
      )}
    </div>
  );
}

function estTurunan(semua: ButirPedoman[], x: ButirPedoman, leluhur: number): boolean {
  let i: number | null = x.induk_id;
  for (let n = 0; n < 20 && i !== null; n++) {
    if (i === leluhur) return true;
    const induk = semua.find((y) => y.id === i);
    i = induk ? induk.induk_id : null;
  }
  return false;
}

// ------------------------------------------------------------------ panel kanan

interface Komentar {
  id: number;
  butir_kunci: string | null;
  isi: string;
  unit: string | null;
  oleh: string;
  nama: string | null;
  selesai: boolean;
  waktu: string;
}

function PanelKanan({ versi: v, butir, draf, onTambahParam, onUbahParam }: { versi: VersiPedoman; butir: ButirPedoman | null; draf: boolean; onTambahParam: () => void; onUbahParam: (p: ParameterPedoman) => void }) {
  const [tab, setTab] = React.useState('parameter');
  return (
    <Tabs
      value={tab}
      onValueChange={(x) => setTab(String(x))}
      variant="underline"
      items={[
        {
          value: 'parameter',
          label: 'Parameter',
          count: v.parameter.length,
          content: (
            <div className="u-pdm-kanan-isi">
              {draf && (
                <Button size="sm" variant="outline" fullWidth onClick={onTambahParam}>
                  <Plus /> Tambah parameter
                </Button>
              )}
              {v.parameter.length === 0 ? <p className="u-pdm-redup">Belum ada parameter. Parameter berkunci katalog dibaca aturan sistem setelah pedoman berlaku.</p> : null}
              {v.parameter.map((p) => (
                <button key={p.id} type="button" className="u-pdm-param-ringkas" onClick={() => draf && onUbahParam(p)}>
                  <strong>{p.nama}</strong>
                  <span>
                    {p.pasal} · <code>{p.kunci}</code>
                  </span>
                  <span className="u-pdm-param-teks">{p.teks}</span>
                  {p.terpetakan ? <Badge variant="primary">{p.unit_pemilik ?? 'Dibaca sistem'}</Badge> : <Badge variant="neutral">Informatif</Badge>}
                </button>
              ))}
              {(v.periksa ?? []).filter((x) => x.tingkat === 'info').length > 0 && (
                <p className="u-pdm-redup">
                  <CircleAlert className="u-pdm-ikon-kecil" /> {(v.periksa ?? []).filter((x) => x.tingkat === 'info').length} parameter informatif (belum dipetakan ke aturan).
                </p>
              )}
            </div>
          ),
        },
        { value: 'komentar', label: 'Komentar', count: v.komentar_terbuka, content: <PanelKomentar versi={v} butir={butir} /> },
        {
          value: 'alur',
          label: 'Alur',
          content: (
            <div className="u-pdm-kanan-isi">
              <AlurPemeriksa pemeriksa={(v.pemeriksa ?? []) as unknown as TahapPemeriksa[]} judul="Alur pengesahan" />
              {v.catatan_perubahan ? <p className="u-pdm-redup">Catatan perubahan: {v.catatan_perubahan}</p> : null}
            </div>
          ),
        },
      ]}
    />
  );
}

function PanelKomentar({ versi: v, butir }: { versi: VersiPedoman; butir: ButirPedoman | null }) {
  const q = usePedoman<Komentar[]>(['komentar', v.id], `/v1/pedoman/versi/${v.id}/komentar`);
  const kirim = useAksiPedoman();
  const [isi, setIsi] = React.useState('');
  const [semua, setSemua] = React.useState(false);
  const label = new Map(v.butir.map((b) => [b.kunci, b.label]));
  const daftar = (q.data ?? []).filter((k) => semua || !butir || k.butir_kunci === butir.kunci);
  return (
    <div className="u-pdm-kanan-isi">
      <label className="u-pdm-centang">
        <input type="checkbox" checked={semua} onChange={(e) => setSemua(e.target.checked)} /> Semua pasal
      </label>
      {daftar.length === 0 ? <p className="u-pdm-redup">Belum ada komentar {butir && !semua ? `untuk ${butir.label}` : ''}.</p> : null}
      {daftar.map((k) => (
        <div key={k.id} className="u-pdm-komentar" data-selesai={k.selesai || undefined}>
          <div className="u-pdm-komentar-kepala">
            <strong>{k.nama ?? k.oleh}</strong>
            {k.unit ? <Badge variant="outline">{k.unit}</Badge> : null}
            <span className="u-pdm-redup">{k.butir_kunci ? label.get(k.butir_kunci) : 'Umum'}</span>
          </div>
          <p>{k.isi}</p>
          {!k.selesai && (
            <Button size="xs" variant="ghost" onClick={() => void kirim('POST', `/v1/pedoman/komentar/${k.id}/selesai`, {})}>
              <Check /> Selesai
            </Button>
          )}
        </div>
      ))}
      <Field label={butir ? `Komentar untuk ${butir.label}` : 'Komentar umum'}>
        <Textarea rows={3} value={isi} onChange={(e) => setIsi(e.target.value)} placeholder="Tulis masukan tinjauan…" />
      </Field>
      <Button
        size="sm"
        disabled={!isi.trim()}
        onClick={() =>
          void kirim('POST', `/v1/pedoman/versi/${v.id}/komentar`, { isi, butir_kunci: butir?.kunci ?? null }, 'Komentar terkirim').then(() => {
            setIsi('');
          })
        }
      >
        <MessageSquare /> Kirim komentar
      </Button>
    </div>
  );
}

// ------------------------------------------------------------------ isian nilai parameter

export function IsianNilaiParameter({ kat, value, onChange }: { kat: Pick<KatalogPedoman, 'tipe' | 'opsi' | 'satuan'>; value: unknown; onChange: (v: unknown) => void }) {
  const angka = (x: string): number | string => (x.trim() === '' ? '' : Number.isNaN(Number(x.replace(',', '.'))) ? x : Number(x.replace(',', '.')));
  switch (kat.tipe) {
    case 'angka':
      return (
        <Field label={`Nilai${kat.satuan ? ` (${kat.satuan})` : ''}`} required>
          <Input inputMode="decimal" value={value === null || value === undefined ? '' : String(value)} onChange={(e) => onChange(angka(e.target.value))} placeholder="Mis. 24" />
        </Field>
      );
    case 'rentang': {
      const r = (value ?? {}) as { min?: unknown; maks?: unknown };
      return (
        <div className="u-pdm-grid-2">
          <Field label="Batas bawah" required>
            <Input inputMode="decimal" value={r.min === undefined ? '' : String(r.min)} onChange={(e) => onChange({ ...r, min: angka(e.target.value) })} />
          </Field>
          <Field label="Batas atas" required>
            <Input inputMode="decimal" value={r.maks === undefined ? '' : String(r.maks)} onChange={(e) => onChange({ ...r, maks: angka(e.target.value) })} />
          </Field>
        </div>
      );
    }
    case 'bool':
      return (
        <Field label="Nilai" required>
          <Select options={[{ value: '1', label: 'Ya' }, { value: '0', label: 'Tidak' }]} value={value === true ? '1' : value === false ? '0' : null} onValueChange={(x) => onChange(x === '1')} placeholder="Pilih…" />
        </Field>
      );
    case 'pilihan': {
      const opsi = kat.opsi?.pilihan ?? [];
      if (kat.opsi?.banyak) {
        const v = Array.isArray(value) ? (value as string[]) : [];
        return (
          <Field label="Pilihan" required>
            <div className="u-pdm-pilihan">
              {opsi.map((o) => (
                <label key={o.value} className="u-pdm-centang">
                  <input type="checkbox" checked={v.includes(o.value)} onChange={(e) => onChange(e.target.checked ? [...v, o.value] : v.filter((x) => x !== o.value))} /> {o.label}
                </label>
              ))}
            </div>
          </Field>
        );
      }
      return (
        <Field label="Pilihan" required>
          <Select options={opsi} value={typeof value === 'string' ? value : null} onValueChange={(x) => onChange(x)} placeholder="Pilih…" />
        </Field>
      );
    }
    case 'tabel': {
      const kolom = kat.opsi?.kolom ?? [];
      const rows = Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
      const ubah = (i: number, k: string, x: string) => onChange(rows.map((r, n) => (n === i ? { ...r, [k]: angka(x) } : r)));
      return (
        <div className="u-pdm-isian-tabel">
          <table>
            <thead>
              <tr>
                {kolom.map((k) => (
                  <th key={k.kode}>{k.label}</th>
                ))}
                <th aria-label="Hapus" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {kolom.map((k) => (
                    <td key={k.kode}>
                      <Input size="sm" aria-label={`${k.label} baris ${i + 1}`} inputMode={k.tipe === 'teks' ? undefined : 'decimal'} value={r[k.kode] === undefined ? '' : String(r[k.kode])} onChange={(e) => ubah(i, k.kode, e.target.value)} />
                    </td>
                  ))}
                  <td>
                    <Button size="xs" variant="ghost" iconOnly aria-label="Hapus baris" onClick={() => onChange(rows.filter((_, n) => n !== i))}>
                      <X />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button size="sm" variant="ghost" onClick={() => onChange([...rows, Object.fromEntries(kolom.map((k) => [k.kode, '']))])}>
            <Plus /> Tambah baris
          </Button>
        </div>
      );
    }
    default:
      return (
        <Field label="Nilai" required>
          <Textarea rows={3} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />
        </Field>
      );
  }
}

function teksNilai(v: unknown, kat?: Pick<KatalogPedoman, 'satuan'> | null): string {
  if (v === null || v === undefined || v === '') return '-';
  if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak';
  if (Array.isArray(v)) return v.map((r) => (typeof r === 'object' && r ? Object.values(r as object).join(': ') : String(r))).join('; ');
  if (typeof v === 'object') return `${(v as { min?: unknown }).min ?? '?'}–${(v as { maks?: unknown }).maks ?? '?'}${kat?.satuan ? ' ' + kat.satuan : ''}`;
  return `${String(v)}${kat?.satuan ? ' ' + kat.satuan : ''}`;
}

// ------------------------------------------------------------------ panel parameter (langkah)

function PanelParameter({ versi: v, butirAwal, awal, onOpenChange }: { versi: VersiPedoman; butirAwal: number | null; awal: ParameterPedoman | null; onOpenChange: (o: boolean) => void }) {
  const katalog = usePedoman<KatalogPedoman[]>(['katalog'], '/v1/pedoman/katalog');
  const kirim = useAksiPedoman();
  const [step, setStep] = React.useState(awal ? 1 : 0);
  const tempat = v.butir.filter((b) => ['pasal', 'ayat', 'lampiran'].includes(b.tipe));
  const [butir, setButir] = React.useState<number | null>(butirAwal && tempat.some((b) => b.id === butirAwal) ? butirAwal : (tempat[0]?.id ?? null));
  const [kunci, setKunci] = React.useState<string | null>(awal?.kunci ?? null);
  const [nilai, setNilai] = React.useState<unknown>(awal?.nilai ?? null);
  const [catatan, setCatatan] = React.useState(awal?.catatan ?? '');
  const kat = (katalog.data ?? []).find((k) => k.kunci === kunci) ?? null;
  const fakultasan = v.dokumen.lingkup !== 'universitas';
  const pilihan = (katalog.data ?? []).filter((k) => !fakultasan || k.lingkup === 'fakultas' || k.timpa !== 'tidak');
  const dipakai = new Set(v.parameter.filter((p) => p.id !== awal?.id).map((p) => p.kunci));
  return (
    <PanelLangkah
      open
      onOpenChange={onOpenChange}
      title={awal ? `Ubah parameter ${awal.nama}` : 'Tambah parameter'}
      description="Parameter berkunci katalog dibaca sistem: saat pedoman berlaku, unit pemilik aturan menerima usulan penerapan."
      mode={awal ? 'ubah' : 'buat'}
      size="lg"
      step={step}
      onStepChange={setStep}
      finishLabel="Simpan parameter"
      steps={[
        {
          id: 'kunci',
          title: 'Letak & kunci',
          description: fakultasan ? 'Pedoman fakultas/prodi hanya boleh menimpa parameter yang ditandai boleh ditimpa, dan hanya dalam batas pedoman universitas.' : 'Pilih pasal/ayat dan parameter dari katalog.',
          validate: () => (!butir ? 'Pilih pasal atau ayat.' : !kunci ? 'Pilih parameter.' : dipakai.has(kunci) ? 'Parameter ini sudah ada di versi ini.' : null),
          content: (
            <div className="u-pdm-form">
              <Field label="Pasal/ayat" required>
                <Select options={tempat.map((b) => ({ value: String(b.id), label: `${b.label}${b.judul ? ' · ' + b.judul : ''}` }))} value={butir ? String(butir) : null} onValueChange={(x) => setButir(x ? Number(x) : null)} placeholder="Pilih…" />
              </Field>
              <Field label="Parameter katalog" required description="Belum ada? Tambahkan di Pedoman & peraturan › Katalog parameter (tanpa kode).">
                <Combobox<KatalogPedoman>
                  items={pilihan}
                  value={kat}
                  onValueChange={(k) => {
                    setKunci(k?.kunci ?? null);
                    if (k && k.kunci !== awal?.kunci) setNilai(k.tipe === 'tabel' ? [] : null);
                  }}
                  itemToString={(k) => `${k.nama} (${k.kunci})`}
                  itemKey={(k) => k.kunci}
                  itemGroup={(k) => k.kategori ?? 'lainnya'}
                  renderItem={(k) => (
                    <span className="u-pdm-opsi">
                      <strong>{k.nama}</strong>
                      <span>
                        <code>{k.kunci}</code> · {k.terpetakan ? `aturan ${k.unit_pemilik ?? ''}` : 'informatif'}
                        {k.timpa !== 'tidak' ? ` · fakultas boleh ${k.timpa === 'lebih_besar' ? '≥' : k.timpa === 'lebih_kecil' ? '≤' : 'bebas'}` : ''}
                      </span>
                    </span>
                  )}
                  placeholder="Pilih parameter…"
                  emptyText="Tidak ada parameter yang cocok"
                />
              </Field>
              {kat?.keterangan ? <p className="u-pdm-redup">{kat.keterangan}</p> : null}
            </div>
          ),
        },
        {
          id: 'nilai',
          title: 'Nilai',
          description: kat ? `${kat.nama}${kat.satuan ? ` (${kat.satuan})` : ''}` : undefined,
          validate: () => {
            if (!kat) return 'Pilih parameter dulu.';
            if (nilai === null || nilai === '' || (Array.isArray(nilai) && nilai.length === 0)) return 'Isi nilai parameter.';
            return null;
          },
          content: kat ? (
            <div className="u-pdm-form">
              <IsianNilaiParameter kat={kat} value={nilai} onChange={setNilai} />
              <Field label="Catatan" optional>
                <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Mis. berlaku mulai angkatan 2026" />
              </Field>
              {kat.terpetakan ? (
                <Alert variant="info" title={`Dibaca aturan ${kat.unit_pemilik ?? ''}`}>
                  Target: {kat.target?.jenis === 'mesin_aturan' ? `Mesin aturan ${kat.target.kode}` : `aturan berversi ${kat.target?.aturan_jenis}`} · <code>{kat.target?.jalur}</code>
                </Alert>
              ) : (
                <Alert variant="neutral" title="Parameter informatif">
                  Belum dipetakan ke aturan sistem; tampil di pedoman dan PDF saja.
                </Alert>
              )}
            </div>
          ) : (
            <Empty title="Pilih parameter dulu" />
          ),
        },
        {
          id: 'tinjau',
          title: 'Periksa',
          content: (
            <WizardReview
              sections={[
                { title: 'Letak', items: [{ label: 'Pasal/ayat', value: tempat.find((b) => b.id === butir)?.label }], onEdit: () => setStep(0) },
                {
                  title: 'Parameter',
                  items: [
                    { label: 'Kunci', value: kunci },
                    { label: 'Nilai', value: teksNilai(nilai, kat) },
                    { label: 'Unit pemilik aturan', value: kat?.unit_pemilik ?? '-' },
                  ],
                  onEdit: () => setStep(1),
                },
              ]}
            />
          ),
        },
      ]}
      footerNote={fakultasan ? 'Nilai di luar batas pedoman universitas ditolak saat disimpan.' : undefined}
      onFinish={async () => {
        try {
          await kirim('POST', `/v1/pedoman/versi/${v.id}/parameter`, { butir_id: butir, kunci, nilai, catatan: catatan || null }, 'Parameter disimpan', true);
          return undefined;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

// ------------------------------------------------------------------ panel pengesahan

function PanelSahkan({ versi: v, onOpenChange }: { versi: VersiPedoman; onOpenChange: (o: boolean) => void }) {
  const kirim = useAksiPedoman();
  const [step, setStep] = React.useState(0);
  const [sk, setSk] = React.useState<string | null>(null);
  const [mulai, setMulai] = React.useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const tahapSk = (v.pemeriksa ?? []).find((p) => p.status === 'sedang');
  return (
    <PanelLangkah
      open
      onOpenChange={onOpenChange}
      title="Sahkan dengan SK"
      description={`${tahapSk?.judul ?? 'Penetapan SK'}: pilih SK dari registri SK. Pedoman berlaku pada tanggal berlaku; versi lama otomatis diganti.`}
      step={step}
      onStepChange={setStep}
      finishLabel="Sahkan"
      steps={[
        {
          id: 'sk',
          title: 'SK penetapan',
          validate: () => (sk ? null : 'Pilih SK dari registri.'),
          content: (
            <div className="u-pdm-form">
              <PilihSK value={sk} onValueChange={(x: string | null) => setSk(x)} jenis="aturan" perihal={`Penetapan ${v.judul}`} label="SK penetapan" required description="SK Rektor (pedoman universitas) atau SK Dekan (pedoman fakultas) yang sudah tercatat di registri SK." />
            </div>
          ),
        },
        {
          id: 'berlaku',
          title: 'Tanggal berlaku',
          validate: () => (mulai ? null : 'Isi tanggal berlaku.'),
          content: (
            <div className="u-pdm-form">
              <Field label="Berlaku mulai" required description="Hari ini atau sebelumnya = langsung berlaku; tanggal mendatang = diberlakukan otomatis pada tanggal itu.">
                <IsianTanggal value={mulai} onValueChange={(x) => setMulai(x ?? '')} />
              </Field>
              <Alert variant="info" title="Setelah berlaku">
                Setiap parameter terpetakan yang berbeda dari aturan sekarang menjadi usulan penerapan untuk unit pemiliknya. Tidak ada aturan yang berubah tanpa persetujuan unit.
              </Alert>
            </div>
          ),
        },
      ]}
      onFinish={async () => {
        try {
          await kirim('POST', `/v1/pedoman/versi/${v.id}/sahkan`, { sk_id: sk, berlaku_mulai: mulai }, 'Pedoman disahkan', true);
          return undefined;
        } catch (e) {
          return pesanGalat(e);
        }
      }}
    />
  );
}

function PanelKeputusan({ versi: v, jenis, tahap, onOpenChange }: { versi: VersiPedoman; jenis: 'tinjau' | 'setujui' | 'kembalikan' | 'cabut' | 'ajukan'; tahap?: string; onOpenChange: (o: boolean) => void }) {
  const kirim = useAksiPedoman();
  const [keputusan, setKeputusan] = React.useState<'setuju' | 'minta_ubah'>('setuju');
  const [catatan, setCatatan] = React.useState('');
  const [sibuk, setSibuk] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const judul = { tinjau: 'Tinjauan unit', setujui: 'Setujui pedoman', kembalikan: 'Kembalikan ke penyusun', cabut: 'Cabut pedoman', ajukan: 'Ajukan untuk ditinjau' }[jenis];
  const wajib = jenis === 'kembalikan' || jenis === 'cabut' || (jenis === 'tinjau' && keputusan === 'minta_ubah');
  const simpan = async () => {
    if (wajib && catatan.trim().length < (jenis === 'cabut' ? 10 : 3)) {
      setGalat(jenis === 'cabut' ? 'Alasan pencabutan minimal 10 karakter.' : 'Tulis catatan.');
      return;
    }
    setSibuk(true);
    try {
      const body = jenis === 'tinjau' ? { tahap, keputusan, catatan } : jenis === 'cabut' ? { alasan: catatan } : { catatan };
      await kirim('POST', `/v1/pedoman/versi/${v.id}/${jenis}`, body, jenis === 'ajukan' ? 'Diajukan untuk ditinjau' : 'Tersimpan', true);
      onOpenChange(false);
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSibuk(false);
    }
  };
  return (
    <Sheet
      open
      onOpenChange={onOpenChange}
      size="md"
      title={judul}
      description={`${v.judul} versi ${v.versi}`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button variant={jenis === 'cabut' || keputusan === 'minta_ubah' || jenis === 'kembalikan' ? 'destructive' : 'primary'} loading={sibuk} onClick={() => void simpan()}>
            {jenis === 'tinjau' ? (keputusan === 'setuju' ? 'Setujui tinjauan' : 'Minta perubahan') : judul}
          </Button>
        </>
      }
    >
      <div className="u-pdm-form">
        {jenis === 'tinjau' && (
          <Field label="Keputusan" required>
            <Select
              options={[
                { value: 'setuju', label: 'Setuju', description: 'Lanjut ke tahap berikutnya' },
                { value: 'minta_ubah', label: 'Minta perubahan', description: 'Kembali ke penyusun (draf)' },
              ]}
              value={keputusan}
              onValueChange={(x) => setKeputusan((x ?? 'setuju') as 'setuju' | 'minta_ubah')}
              placeholder="Pilih…"
            />
          </Field>
        )}
        {jenis === 'ajukan' && (
          <Alert variant="info" title="Alur pengesahan">
            {(v.pemeriksa ?? []).map((p) => p.judul).join(' → ')}
          </Alert>
        )}
        <Field label={jenis === 'cabut' ? 'Alasan pencabutan' : 'Catatan'} required={wajib} optional={!wajib}>
          <Textarea rows={4} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder={jenis === 'tinjau' ? 'Masukan untuk penyusun (pasal yang perlu diubah ada di tab Komentar)' : ''} />
        </Field>
        {galat && (
          <Alert variant="danger" title="Belum berhasil">
            {galat}
          </Alert>
        )}
      </div>
    </Sheet>
  );
}

function PanelIdentitas({ versi: v, onOpenChange }: { versi: VersiPedoman; onOpenChange: (o: boolean) => void }) {
  const kirim = useAksiPedoman();
  const [f, setF] = React.useState({ judul: v.judul, pembukaan: v.pembukaan ?? '', catatan_perubahan: v.catatan_perubahan ?? '' });
  const [sibuk, setSibuk] = React.useState(false);
  return (
    <Sheet
      open
      onOpenChange={onOpenChange}
      size="lg"
      title="Identitas versi"
      description="Judul, pembukaan (menimbang/mengingat), dan catatan perubahan versi ini."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            loading={sibuk}
            onClick={() => {
              setSibuk(true);
              void kirim('PUT', `/v1/pedoman/versi/${v.id}`, f, 'Tersimpan')
                .then(() => onOpenChange(false))
                .finally(() => setSibuk(false));
            }}
          >
            <Save /> Simpan
          </Button>
        </>
      }
    >
      <div className="u-pdm-form">
        <Field label="Judul" required>
          <Input value={f.judul} onChange={(e) => setF({ ...f, judul: e.target.value })} />
        </Field>
        <Field label="Pembukaan" optional description="Menimbang dan mengingat.">
          <Textarea rows={8} value={f.pembukaan} onChange={(e) => setF({ ...f, pembukaan: e.target.value })} />
        </Field>
        <Field label="Catatan perubahan" optional>
          <Textarea rows={3} value={f.catatan_perubahan} onChange={(e) => setF({ ...f, catatan_perubahan: e.target.value })} />
        </Field>
      </div>
    </Sheet>
  );
}

// ------------------------------------------------------------------ banding

interface Banding {
  dari: { id: number; versi: number; status: string };
  ke: { id: number; versi: number; status: string };
  butir: Array<{ kunci: string; jenis: 'tambah' | 'ubah' | 'hapus'; label: string; label_lama?: string; tipe: string; lama: string | null; baru: string | null }>;
  parameter: Array<{ kunci: string; nama: string; jenis: 'tambah' | 'ubah' | 'hapus'; lama: string | null; baru: string | null; pasal: string | null }>;
}

export function PanelBandingPedoman({ versi: v, onOpenChange }: { versi: VersiPedoman; onOpenChange: (o: boolean) => void }) {
  const lain = v.versi_lain.filter((x) => x.id !== v.id);
  const [dengan, setDengan] = React.useState<number | null>(v.salin_dari_id ?? lain[0]?.id ?? null);
  const q = usePedoman<Banding>(['banding', v.id, dengan], dengan ? `/v1/pedoman/versi/${v.id}/banding` : null, { dengan });
  const warna = { tambah: 'success', ubah: 'warning', hapus: 'danger' } as const;
  return (
    <Sheet open onOpenChange={onOpenChange} size="xl" title={`Banding versi ${v.versi}`} description="Perubahan per pasal (dicocokkan lewat kunci butir yang tetap antar versi) dan perubahan parameter.">
      <div className="u-pdm-form">
        <Field label="Bandingkan dengan">
          <Select options={lain.map((x) => ({ value: String(x.id), label: `Versi ${x.versi} · ${x.status}` }))} value={dengan ? String(dengan) : null} onValueChange={(x) => setDengan(x ? Number(x) : null)} placeholder="Pilih versi…" />
        </Field>
        {q.loading && !q.data ? <Skeleton style={{ height: 120 }} /> : null}
        {q.data && (
          <>
            <h4>Parameter</h4>
            {q.data.parameter.length === 0 ? <p className="u-pdm-redup">Tidak ada perubahan parameter.</p> : null}
            {q.data.parameter.map((p) => (
              <div key={p.kunci} className="u-pdm-beda">
                <div className="u-pdm-usulan-judul">
                  <Badge variant={warna[p.jenis]}>{p.jenis}</Badge> <strong>{p.nama}</strong> <span className="u-pdm-redup">{p.pasal}</span>
                </div>
                <div className="u-pdm-banding">
                  <div>
                    <span className="u-pdm-label">Versi {q.data?.dari.versi}</span>
                    <span className="u-pdm-nilai-lama">{p.lama ?? '-'}</span>
                  </div>
                  <div>
                    <span className="u-pdm-label">Versi {q.data?.ke.versi}</span>
                    <span className="u-pdm-nilai-baru">{p.baru ?? '-'}</span>
                  </div>
                </div>
              </div>
            ))}
            <h4>Pasal</h4>
            {q.data.butir.length === 0 ? <p className="u-pdm-redup">Tidak ada perubahan teks.</p> : null}
            {q.data.butir.map((b) => (
              <div key={b.kunci} className="u-pdm-beda">
                <div className="u-pdm-usulan-judul">
                  <Badge variant={warna[b.jenis]}>{b.jenis}</Badge> <strong>{b.label}</strong>
                  {b.label_lama && b.label_lama !== b.label ? <span className="u-pdm-redup"> (sebelumnya {b.label_lama})</span> : null}
                </div>
                <div className="u-pdm-banding">
                  <pre className="u-pdm-nilai-lama">{b.lama ?? '-'}</pre>
                  <pre className="u-pdm-nilai-baru">{b.baru ?? '-'}</pre>
                </div>
              </div>
            ))}
          </>
        )}
        {!dengan && <Empty icon={<BookOpenText />} title="Belum ada versi lain" />}
      </div>
    </Sheet>
  );
}
