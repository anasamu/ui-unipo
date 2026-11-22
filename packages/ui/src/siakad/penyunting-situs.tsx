'use client';
import * as React from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  CornerDownRight,
  CornerUpLeft,
  FileClock,
  GripVertical,
  LayoutTemplate,
  Moon,
  PanelsTopLeft,
  Plus,
  Redo2,
  Save,
  Send,
  SlidersHorizontal,
  Sun,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { Badge, Button, Spinner } from '../components/actions';
import { Alert, Empty } from '../components/display';
import { Field, SegmentedControl, Textarea } from '../components/forms';
import { ConfirmDialog, Dialog, Sheet, useToast } from '../components/overlays';
import { HalamanLanding, type AksiLanding, type SlotLanding } from '../components/landing-blok';
import { menuLanding, type DokumenLanding, type IsiBlok } from '../components/landing-skema';
import { KerangkaSitus } from '../components/situs';
import {
  BAGIAN_SITUS,
  BATAS_MENU,
  KOLOM_BUTIR_MENU,
  KOLOM_SOROT,
  PRESET_SITUS,
  URUT_BAGIAN_SITUS,
  bentukMenu,
  butirDi,
  butirMenuBaru,
  geserButir,
  hapusButir,
  jalurMenu,
  kedalaman,
  keluarkanButir,
  menjorokButir,
  normalisasiSitus,
  pindahButir,
  setelButir,
  situsBawaan,
  tambahButir,
  type ButirMenu,
  type DokumenSitus,
  type JalurMenu,
  type KunciBagianSitus,
} from '../components/situs-skema';
import { cn, dataFlag } from '../lib/cn';
import { Tekan } from '../components/tekan';
import { PENYEDIA_SIAKAD, useDokumenLanding } from './landing-aplikasi';
import { BingkaiPratinjau, KolomIsian, LAYAR_PRATINJAU, PanelRiwayat, type KonteksIsian, type LayarPratinjau } from './penyunting-landing';
import { atasGelapLanding, pathSitus, type DataSitus } from './situs-aplikasi';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

// ---------------------------------------------------------------- riwayat urungkan (umum)

interface Riwayat {
  lalu: DokumenSitus[];
  kini: DokumenSitus;
  nanti: DokumenSitus[];
  kunci?: string;
  pada?: number;
}
const mulai = (d: DokumenSitus): Riwayat => ({ lalu: [], kini: d, nanti: [] });
/** Catat dokumen baru; perubahan berkunci sama dalam 700 ms digabung (satu urungkan per ketikan). */
function catat(r: Riwayat, baru: DokumenSitus, kunci?: string, sekarang = Date.now()): Riwayat {
  if (JSON.stringify(baru) === JSON.stringify(r.kini)) return r;
  const gabung = kunci && r.kunci === kunci && r.pada !== undefined && sekarang - r.pada < 700;
  return { lalu: gabung ? r.lalu : [...r.lalu, r.kini].slice(-80), kini: baru, nanti: [], kunci, pada: sekarang };
}
const urungkan = (r: Riwayat): Riwayat => (r.lalu.length ? { lalu: r.lalu.slice(0, -1), kini: r.lalu[r.lalu.length - 1]!, nanti: [r.kini, ...r.nanti] } : r);
const ulangi = (r: Riwayat): Riwayat => (r.nanti.length ? { lalu: [...r.lalu, r.kini], kini: r.nanti[0]!, nanti: r.nanti.slice(1) } : r);
const sama = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// ---------------------------------------------------------------- pohon menu

const BENTUK_LABEL = { tautan: 'Tautan', dropdown: 'Dropdown', mega: 'Mega menu' } as const;

type Jatuh = { jalur: JalurMenu; zona: 'sebelum' | 'sesudah' | 'dalam' } | null;

/**
 * Penyunting pohon menu utama: seret-lepas (atas/bawah/ke dalam butir), tombol pindah yang selalu terlihat untuk
 * butir terpilih, dan pintasan Alt+panah (↑↓ urutan, → jadikan sub menu, ← keluarkan). Batas 3 tingkat.
 */
export function PohonMenuSitus({
  menu,
  ubah,
  pilih,
  setPilih,
  boleh = true,
}: {
  menu: ButirMenu[];
  ubah: (m: ButirMenu[], pesan: string) => void;
  pilih: string | null;
  setPilih: (id: string | null) => void;
  boleh?: boolean;
}) {
  const [seret, setSeret] = React.useState<string | null>(null);
  const [jatuh, setJatuh] = React.useState<Jatuh>(null);
  const jalurPilih = pilih ? jalurMenu(menu, pilih) : null;
  const butirPilih = jalurPilih ? butirDi(menu, jalurPilih) : undefined;
  const nama = (b?: ButirMenu) => (b?.label ? `"${b.label}"` : 'Menu');

  const aksi = (jenis: 'naik' | 'turun' | 'masuk' | 'keluar', jalur: JalurMenu) => {
    const b = butirDi(menu, jalur);
    const baru = jenis === 'naik' ? geserButir(menu, jalur, -1) : jenis === 'turun' ? geserButir(menu, jalur, 1) : jenis === 'masuk' ? menjorokButir(menu, jalur) : keluarkanButir(menu, jalur);
    if (baru === menu) return;
    const j = b ? jalurMenu(baru, b.id) : null;
    ubah(baru, `${nama(b)} ${jenis === 'masuk' ? 'menjadi sub menu' : jenis === 'keluar' ? 'naik satu tingkat' : 'dipindah'}, posisi ${(j?.[j.length - 1] ?? 0) + 1} di tingkat ${j?.length ?? 1}.`);
  };

  const zona = (e: React.DragEvent<HTMLElement>, jalur: JalurMenu): Jatuh => {
    const r = e.currentTarget.getBoundingClientRect();
    const y = (e.clientY - r.top) / r.height;
    const z = y < 0.3 ? 'sebelum' : y > 0.7 ? 'sesudah' : 'dalam';
    return { jalur, zona: z === 'dalam' && jalur.length >= 3 ? 'sesudah' : z };
  };

  const lepas = (j: NonNullable<Jatuh>) => {
    const id = seret;
    setSeret(null);
    setJatuh(null);
    if (!id) return;
    const dari = jalurMenu(menu, id);
    if (!dari) return;
    const induk = j.zona === 'dalam' ? j.jalur : j.jalur.slice(0, -1);
    const ke = j.zona === 'dalam' ? (butirDi(menu, j.jalur)?.anak?.length ?? 0) : j.jalur[j.jalur.length - 1]! + (j.zona === 'sesudah' ? 1 : 0);
    const baru = pindahButir(menu, dari, induk, ke);
    if (baru !== menu) {
      const b = butirDi(menu, dari);
      const ja = jalurMenu(baru, id);
      ubah(baru, `${nama(b)} dipindah ke posisi ${(ja?.[ja.length - 1] ?? 0) + 1} di tingkat ${ja?.length ?? 1}.`);
    }
  };

  const baris = (daftar: ButirMenu[], induk: JalurMenu): React.ReactNode =>
    daftar.map((b, i) => {
      const jalur = [...induk, i];
      const bentuk = induk.length === 0 ? bentukMenu(b) : null;
      const jt = jatuh && jatuh.jalur.join('.') === jalur.join('.') ? jatuh.zona : undefined;
      return (
        <li key={b.id} className="ups-butir" data-tingkat={jalur.length}>
          <div
            className="ups-baris"
            data-pilih={dataFlag(b.id === pilih)}
            data-seret={dataFlag(seret === b.id)}
            data-jatuh={jt}
            onDragOver={(e) => {
              if (!seret || seret === b.id) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              const z = zona(e, jalur);
              if (!jatuh || jatuh.zona !== z?.zona || jatuh.jalur.join('.') !== jalur.join('.')) setJatuh(z);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setJatuh((x) => (x && x.jalur.join('.') === jalur.join('.') ? null : x));
            }}
            onDrop={(e) => {
              e.preventDefault();
              const z = zona(e, jalur);
              if (z) lepas(z);
            }}
          >
            {boleh && (
              <span
                className="ups-pegangan"
                draggable
                title="Seret untuk memindah"
                aria-hidden
                onDragStart={(e) => {
                  setSeret(b.id);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', b.id);
                }}
                onDragEnd={() => {
                  setSeret(null);
                  setJatuh(null);
                }}
              >
                <GripVertical />
              </span>
            )}
            <Tekan
              className="ups-label"
              aria-current={b.id === pilih ? 'true' : undefined}
              title={boleh ? 'Alt+↑/↓ memindah, Alt+→ jadikan sub menu, Alt+← keluarkan' : undefined}
              onClick={() => setPilih(b.id)}
              onKeyDown={(e) => {
                if (!boleh || !e.altKey) return;
                const peta: Record<string, 'naik' | 'turun' | 'masuk' | 'keluar'> = { ArrowUp: 'naik', ArrowDown: 'turun', ArrowRight: 'masuk', ArrowLeft: 'keluar' };
                const j = peta[e.key];
                if (!j) return;
                e.preventDefault();
                aksi(j, jalur);
              }}
            >
              <strong>{b.label || 'Tanpa label'}</strong>
              <small>{bentuk ? BENTUK_LABEL[bentuk] : b.anak?.length ? `${b.anak.length} tautan` : (b.url ?? 'Belum ada tujuan')}</small>
            </Tekan>
            {b.lencana && <Badge variant="neutral">{b.lencana}</Badge>}
          </div>
          {!!b.anak?.length && <ol className="ups-anak">{baris(b.anak, jalur)}</ol>}
        </li>
      );
    });

  const jalurP = jalurPilih ?? [];
  const iP = jalurP[jalurP.length - 1] ?? 0;
  const saudara = jalurP.length > 1 ? (butirDi(menu, jalurP.slice(0, -1))?.anak?.length ?? 0) : menu.length;
  const bolehMasuk = !!butirPilih && iP > 0 && jalurP.length - 1 + 1 + kedalaman(butirPilih) <= 3;
  const tingkatAnak = jalurP.length + 1;
  return (
    <div className="ups-pohon">
      {menu.length === 0 ? (
        <Empty icon={<PanelsTopLeft />} title="Menu utama kosong" description="Tambah menu, atau pakai preset. Bagian halaman bertanda menu tetap tampil bila diaktifkan di Kepala situs." />
      ) : (
        <ol className="ups-akar" aria-label="Menu utama">
          {baris(menu, [])}
        </ol>
      )}
      {boleh && (
        <div className="ups-alat" role="toolbar" aria-label="Atur menu terpilih">
          <Button
            size="sm"
            variant="outline"
            disabled={menu.length >= BATAS_MENU[1]}
            onClick={() => {
              const b = butirMenuBaru();
              ubah(tambahButir(menu, null, b), 'Menu baru ditambahkan di akhir.');
              setPilih(b.id);
            }}
          >
            <Plus /> Menu
          </Button>
          {butirPilih && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={tingkatAnak > 3 || (butirPilih.anak?.length ?? 0) >= BATAS_MENU[Math.min(3, tingkatAnak) as 1 | 2 | 3]}
                title={tingkatAnak > 3 ? 'Menu paling banyak tiga tingkat' : undefined}
                onClick={() => {
                  const b = butirMenuBaru('Sub menu');
                  ubah(tambahButir(menu, jalurP, b), `Sub menu ditambahkan di ${nama(butirPilih)}.`);
                  setPilih(b.id);
                }}
              >
                <Plus /> Sub menu
              </Button>
              <span className="ups-alat-pisah" aria-hidden />
              <Button size="sm" variant="ghost" aria-label={`Naikkan ${nama(butirPilih)}`} title="Naikkan (Alt+↑)" disabled={iP === 0} onClick={() => aksi('naik', jalurP)}>
                <ArrowUp />
              </Button>
              <Button size="sm" variant="ghost" aria-label={`Turunkan ${nama(butirPilih)}`} title="Turunkan (Alt+↓)" disabled={iP >= saudara - 1} onClick={() => aksi('turun', jalurP)}>
                <ArrowDown />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Jadikan ${nama(butirPilih)} sub menu dari menu di atasnya`}
                title="Jadikan sub menu (Alt+→)"
                disabled={!bolehMasuk}
                onClick={() => aksi('masuk', jalurP)}
              >
                <CornerDownRight />
              </Button>
              <Button size="sm" variant="ghost" aria-label={`Keluarkan ${nama(butirPilih)} satu tingkat`} title="Keluarkan (Alt+←)" disabled={jalurP.length < 2} onClick={() => aksi('keluar', jalurP)}>
                <CornerUpLeft />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Hapus ${nama(butirPilih)}`}
                title="Hapus (bisa diurungkan)"
                onClick={() => {
                  ubah(hapusButir(menu, jalurP), `${nama(butirPilih)}${butirPilih.anak?.length ? ' beserta sub menunya' : ''} dihapus. Tekan Urungkan untuk mengembalikan.`);
                  setPilih(null);
                }}
              >
                <Trash2 />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- penyunting

export interface PenyuntingSitusProps {
  aplikasi: string;
  lingkup?: string;
  /** Nama aplikasi di judul penyunting. */
  nama?: React.ReactNode;
  /** Logo aplikasi untuk navbar dan kaki di pratinjau. */
  merek?: React.ReactNode;
  /** Kunci templat halaman depan bawaan untuk pratinjau (bawaan = kode aplikasi). */
  bawaan?: string;
  slot?: Record<string, SlotLanding>;
  /** Aksi aplikasi untuk tombol dan menu (aksi:<kunci>), mis. masuk dan daftar. */
  aksi?: Record<string, AksiLanding>;
  /** CSS tema draf (buatTema) untuk pratinjau. */
  cssTema?: string;
  /** Pengguna boleh mengubah (useAksesTema). Tanpa hak: hanya pratinjau. */
  boleh?: boolean;
  onTutup?: () => void;
  onBerubah?: (berubah: boolean) => void;
  className?: string;
}

const CONTOH_DALAM: DokumenLanding = {
  versi: 1,
  blok: [
    {
      id: 'contoh01',
      tipe: 'teks',
      isi: {
        eyebrow: 'Contoh halaman dalam',
        judul: 'Jadwal layanan akademik semester ganjil',
        isi: 'Halaman ini hanya contoh untuk melihat **sidebar** dan kaki situs pada halaman berita, profil, atau layanan.\n\nIsi halaman yang sebenarnya diatur oleh aplikasi masing-masing.\n\n- Pengajuan surat keterangan: Senin-Jumat\n- Legalisasi ijazah: Selasa dan Kamis\n- Konsultasi akademik: dengan janji temu',
      },
      gaya: { jarak: 'rapat', lebar: 'penuh' },
    },
  ],
};

/**
 * Penyunting kerangka situs (ala Elementor Theme Builder): pita pengumuman, bilah atas, kepala situs, menu utama
 * (pohon seret-lepas sampai tiga tingkat, mega menu + kartu sorotan), kaki situs, dan sidebar. Pratinjau langsung
 * bersama halaman depan aplikasi di desktop/tablet/ponsel terang/gelap; draf, terbit, riwayat, pulihkan, preset.
 * Data di SIAKAD /v1/tema/{aplikasi}/situs.
 */
export function PenyuntingSitus({ aplikasi, lingkup, nama, merek, bawaan, slot, aksi, cssTema, boleh = true, onTutup, onBerubah, className }: PenyuntingSitusProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const kunciQ = ['tema-situs', aplikasi, lingkup ?? '', 'draf'];
  const q = useSiakadQuery<DataSitus>(kunciQ, (s, signal) => s.request<DataSitus>({ method: 'GET', path: pathSitus(aplikasi), query: { draf: 1, ...(lingkup ? { lingkup } : {}) } }, { signal }), {
    staleTime: 0,
  });
  const landing = useDokumenLanding(aplikasi, { lingkup, bawaan });
  const [riwayat, setRiwayat] = React.useState(() => mulai(situsBawaan()));
  const [dasar, setDasar] = React.useState<{ dok: DokumenSitus; revisi: number; adaDraf: boolean } | null>(null);
  const [versiTerbit, setVersiTerbit] = React.useState(0);
  const [bagian, setBagian] = React.useState<KunciBagianSitus>('kepala');
  const [pilihMenu, setPilihMenu] = React.useState<string | null>(null);
  const [layar, setLayar] = React.useState<LayarPratinjau>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'ponsel' : typeof window !== 'undefined' && window.innerWidth < 1024 ? 'tablet' : 'desktop',
  );
  const [gelap, setGelap] = React.useState(false);
  const [contoh, setContoh] = React.useState<'depan' | 'dalam'>('depan');
  const [panel, setPanel] = React.useState<'struktur' | 'pratinjau' | 'properti'>('pratinjau');
  const [buka, setBuka] = React.useState<null | 'preset' | 'riwayat' | 'terbit' | 'buang'>(null);
  const [lihatVersi, setLihatVersi] = React.useState<{ dok: DokumenSitus; versi: number; berkas: Record<string, string> } | null>(null);
  const [proses, setProses] = React.useState<null | 'simpan' | 'terbit'>(null);
  const [catatan, setCatatan] = React.useState('');
  const [berkasLokal, setBerkasLokal] = React.useState<Record<string, string>>({});
  const [konflik, setKonflik] = React.useState(false);
  const [umumkan, setUmumkan] = React.useState('');

  const dok = riwayat.kini;
  const berkas = React.useMemo(() => ({ ...(q.data?.berkas ?? {}), ...berkasLokal }), [q.data?.berkas, berkasLokal]);
  const berubah = dasar ? !sama(dok, dasar.dok) : false;

  const muat = React.useCallback((d: DataSitus) => {
    const awal = d.draf ? normalisasiSitus(d.draf) : d.terbit ? normalisasiSitus(d.terbit) : situsBawaan();
    setRiwayat(mulai(awal));
    setDasar({ dok: awal, revisi: d.revisi ?? 0, adaDraf: !!d.draf });
    setVersiTerbit(d.versi ?? 0);
    setKonflik(false);
  }, []);
  const sudahMuat = React.useRef(false);
  React.useEffect(() => {
    if (q.data && !sudahMuat.current) {
      sudahMuat.current = true;
      muat(q.data);
    }
  }, [q.data, muat]);

  const onBerubahRef = React.useRef(onBerubah);
  onBerubahRef.current = onBerubah;
  React.useEffect(() => onBerubahRef.current?.(berubah), [berubah]);
  React.useEffect(() => {
    if (!berubah) return;
    const f = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', f);
    return () => window.removeEventListener('beforeunload', f);
  }, [berubah]);

  const ubah = React.useCallback((baru: DokumenSitus, kunci?: string) => setRiwayat((r) => catat(r, baru, kunci)), []);
  const ubahBagian = (k: Exclude<KunciBagianSitus, 'menu'>, isi: IsiBlok) => ubah({ ...dok, [k]: isi }, `bagian:${k}`);
  const ubahMenu = (menu: ButirMenu[], pesan: string, kunci?: string) => {
    ubah({ ...dok, menu }, kunci);
    if (pesan) setUmumkan(pesan);
  };

  const simpanRef = React.useRef<() => void>(() => {});
  React.useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const t = e.key.toLowerCase();
      const diIsian = e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable="true"]');
      if (t === 's') {
        e.preventDefault();
        simpanRef.current();
      } else if (!diIsian && t === 'z') {
        e.preventDefault();
        setRiwayat((r) => (e.shiftKey ? ulangi(r) : urungkan(r)));
      } else if (!diIsian && t === 'y') {
        e.preventDefault();
        setRiwayat(ulangi);
      }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);

  const galatSimpan = (e: unknown, judul: string) => {
    if ((e as { status?: number })?.status === 409) {
      setKonflik(true);
      toast.add({ title: 'Draf sudah diubah orang lain', description: pesanGalat(e), type: 'warning' });
    } else toast.add({ title: judul, description: pesanGalat(e), type: 'error' });
  };

  const simpanDraf = async () => {
    if (!boleh || !dasar || proses || !berubah) return;
    setProses('simpan');
    try {
      const r = await siakad.request<DataSitus>({ method: 'POST', path: pathSitus(aplikasi, '/draf'), query: lingkup ? { lingkup } : undefined, body: { dokumen: dok, revisi: dasar.revisi } });
      setDasar({ dok, revisi: r.data.revisi ?? dasar.revisi + 1, adaDraf: true });
      toast.add({ title: 'Draf tersimpan', description: 'Pengunjung belum melihat perubahan ini sampai diterbitkan.', type: 'success' });
    } catch (e) {
      galatSimpan(e, 'Draf belum tersimpan');
    } finally {
      setProses(null);
    }
  };
  simpanRef.current = () => void simpanDraf();

  const terbitkan = async () => {
    if (!boleh || !dasar) return;
    setProses('terbit');
    try {
      const r = await siakad.request<DataSitus>({
        method: 'POST',
        path: pathSitus(aplikasi, '/terbit'),
        query: lingkup ? { lingkup } : undefined,
        body: { dokumen: dok, revisi: dasar.revisi, catatan: catatan.trim() || undefined },
      });
      const terbit = r.data.terbit ? normalisasiSitus(r.data.terbit) : dok;
      setRiwayat((x) => ({ ...x, kini: terbit }));
      setDasar({ dok: terbit, revisi: r.data.revisi ?? dasar.revisi + 1, adaDraf: false });
      setVersiTerbit(r.data.versi);
      setCatatan('');
      invalidateSiakad('tema-situs');
      toast.add({ title: `Versi ${r.data.versi} terbit`, description: 'Kepala, menu, dan kaki situs baru langsung tampil untuk semua pengunjung.', type: 'success' });
      setBuka(null);
    } catch (e) {
      galatSimpan(e, 'Pengaturan situs belum terbit');
    } finally {
      setProses(null);
    }
  };

  const buangDraf = async () => {
    try {
      const r = await siakad.request<DataSitus>({ method: 'POST', path: pathSitus(aplikasi, '/draf/buang'), query: lingkup ? { lingkup } : undefined, body: {} });
      muat(r.data);
      toast.add({ title: 'Draf dibuang', description: r.data.terbit ? `Kembali ke versi ${r.data.versi} yang tampil sekarang.` : 'Kembali ke kerangka bawaan.', type: 'success' });
    } catch (e) {
      toast.add({ title: 'Draf belum dibuang', description: pesanGalat(e), type: 'error' });
    }
  };

  const muatUlang = async () => {
    try {
      const r = await siakad.request<DataSitus>({ method: 'GET', path: pathSitus(aplikasi), query: { draf: 1, ...(lingkup ? { lingkup } : {}) } });
      muat(r.data);
    } catch (e) {
      toast.add({ title: 'Draf terbaru tidak dapat dimuat', description: pesanGalat(e), type: 'error' });
    }
  };

  const pulihkan = async (id: number, versi: number) => {
    try {
      const r = await siakad.request<DataSitus>({ method: 'POST', path: pathSitus(aplikasi, `/riwayat/${id}/pulihkan`), query: lingkup ? { lingkup } : undefined, body: {} });
      setBerkasLokal((b) => ({ ...b, ...(r.data.berkas ?? {}) }));
      muat(r.data);
      toast.add({ title: `Versi ${versi} dipulihkan ke draf`, description: 'Periksa lalu terbitkan bila sudah sesuai.', type: 'success' });
    } catch (e) {
      toast.add({ title: 'Versi belum dipulihkan', description: pesanGalat(e), type: 'error' });
    }
  };

  const lihat = async (id: number) => {
    try {
      const r = await siakad.request<{ versi: number; dokumen: DokumenSitus; berkas: Record<string, string> }>({
        method: 'GET',
        path: pathSitus(aplikasi, `/riwayat/${id}`),
        query: lingkup ? { lingkup } : undefined,
      });
      setLihatVersi({ dok: normalisasiSitus(r.data.dokumen), versi: r.data.versi, berkas: r.data.berkas ?? {} });
    } catch (e) {
      toast.add({ title: 'Versi tidak dapat dibuka', description: pesanGalat(e), type: 'error' });
    }
  };

  const k: KonteksIsian = React.useMemo(() => ({ berkas, catat: (id, url) => setBerkasLokal((b) => ({ ...b, [id]: url })), aplikasi, aksi, slot }), [berkas, aplikasi, aksi, slot]);

  if (q.error)
    return (
      <Alert variant="danger" title="Pengaturan situs tidak dapat dimuat">
        {pesanGalat(q.error)}
      </Alert>
    );
  if (!q.data || !dasar)
    return (
      <div className="upl-muat">
        <Spinner aria-label="Memuat pengaturan situs" />
      </div>
    );
  if (!q.data.tersedia)
    return (
      <Alert variant="warning" title="Pengaturan situs belum aktif">
        Tabel halaman tema belum dibuat di server SIAKAD. Minta admin menjalankan <code>php artisan migrate</code>.
      </Alert>
    );

  const status = berubah ? (
    <Badge variant="warning" dot>
      Belum disimpan
    </Badge>
  ) : dasar.adaDraf ? (
    <Badge variant="info" dot>
      Draf tersimpan
    </Badge>
  ) : versiTerbit ? (
    <Badge variant="success" dot>
      Versi {versiTerbit} tampil
    </Badge>
  ) : (
    <Badge variant="neutral">Memakai kerangka bawaan</Badge>
  );

  const isiPratinjau = contoh === 'depan' ? landing.dok : CONTOH_DALAM;
  const pratinjau = (d: DokumenSitus, b: Record<string, string>, pilihBagian?: (x: KunciBagianSitus) => void) => (
    <KerangkaSitus
      situs={d}
      berkas={b}
      merek={merek ?? <strong>{typeof nama === 'string' ? nama : aplikasi}</strong>}
      aksi={aksi}
      menuBagian={menuLanding(landing.dok)}
      atasGelap={contoh === 'depan' && atasGelapLanding(landing.dok)}
      penyedia={PENYEDIA_SIAKAD}
      sidebar={contoh === 'dalam'}
      pratinjau
      terpilih={pilihBagian ? bagian : null}
      onPilih={pilihBagian}
    >
      {isiPratinjau ? <HalamanLanding dokumen={isiPratinjau} berkas={landing.berkas} slot={slot} aksi={aksi} merek={merek} penyedia={PENYEDIA_SIAKAD} pratinjau /> : null}
    </KerangkaSitus>
  );
  const jalurP = pilihMenu ? jalurMenu(dok.menu, pilihMenu) : null;
  const butirP = jalurP ? butirDi(dok.menu, jalurP) : undefined;
  const def = BAGIAN_SITUS[bagian];

  return (
    <div className={cn('upl ups', className)} data-panel={panel}>
      <header className="upl-bilah">
        <div className="upl-bilah-judul">
          <PanelsTopLeft aria-hidden />
          <div>
            <strong>Kepala & kaki situs{nama ? ` · ${typeof nama === 'string' ? nama : ''}` : ''}</strong>
            <span>{status}</span>
          </div>
        </div>
        <div className="upl-bilah-tengah">
          <SegmentedControl<LayarPratinjau>
            value={layar}
            onValueChange={setLayar}
            options={(Object.keys(LAYAR_PRATINJAU) as LayarPratinjau[]).map((l) => ({
              value: l,
              label: <span className="upl-sembunyi-sempit">{LAYAR_PRATINJAU[l].label}</span>,
              icon: LAYAR_PRATINJAU[l].ikon,
              'aria-label': LAYAR_PRATINJAU[l].label,
            }))}
            aria-label="Ukuran layar pratinjau"
          />
          <SegmentedControl<'depan' | 'dalam'>
            value={contoh}
            onValueChange={setContoh}
            options={[
              { value: 'depan', label: 'Halaman depan' },
              { value: 'dalam', label: 'Halaman dalam' },
            ]}
            aria-label="Contoh halaman di pratinjau"
          />
          <Button size="sm" variant="ghost" aria-label={gelap ? 'Pratinjau mode terang' : 'Pratinjau mode gelap'} title={gelap ? 'Mode terang' : 'Mode gelap'} onClick={() => setGelap(!gelap)}>
            {gelap ? <Sun /> : <Moon />}
          </Button>
        </div>
        <div className="upl-bilah-aksi">
          <Button size="sm" variant="ghost" aria-label="Urungkan" title="Urungkan (Ctrl+Z)" disabled={!riwayat.lalu.length} onClick={() => setRiwayat(urungkan)}>
            <Undo2 />
          </Button>
          <Button size="sm" variant="ghost" aria-label="Ulangi" title="Ulangi (Ctrl+Shift+Z)" disabled={!riwayat.nanti.length} onClick={() => setRiwayat(ulangi)}>
            <Redo2 />
          </Button>
          {boleh && (
            <>
              <Button size="sm" variant="ghost" onClick={() => setBuka('preset')}>
                <LayoutTemplate /> <span className="upl-sembunyi-sempit">Preset</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setBuka('riwayat')}>
                <FileClock /> <span className="upl-sembunyi-sempit">Riwayat</span>
              </Button>
              <Button size="sm" variant="outline" loading={proses === 'simpan'} disabled={!berubah || !!proses} onClick={() => void simpanDraf()} title="Simpan draf (Ctrl+S)">
                <Save /> <span className="upl-sembunyi-sempit">Simpan draf</span>
              </Button>
              <Button size="sm" disabled={!!proses || (!berubah && !dasar.adaDraf && !!versiTerbit)} onClick={() => setBuka('terbit')}>
                <Send /> Terbitkan
              </Button>
            </>
          )}
        </div>
        {onTutup && (
          <Button size="sm" variant="ghost" className="upl-tutup" aria-label="Tutup penyunting" title="Tutup" onClick={onTutup}>
            <X />
          </Button>
        )}
      </header>

      {konflik && (
        <Alert variant="warning" title="Draf sudah diubah penyunting lain" className="upl-konflik">
          Simpan Anda ditolak agar perubahan mereka tidak tertimpa.{' '}
          <Button size="xs" variant="outline" onClick={() => void muatUlang()}>
            Muat draf terbaru
          </Button>{' '}
          (perubahan Anda yang belum disimpan akan hilang).
        </Alert>
      )}

      <div className="upl-badan">
        <aside className="upl-struktur" aria-label="Bagian situs">
          <div className="upl-panel-kepala">
            <strong>Bagian</strong>
          </div>
          <ol className="upl-daftar-blok">
            {URUT_BAGIAN_SITUS.map((kb) => {
              const d = BAGIAN_SITUS[kb];
              const nyala = kb === 'kepala' || kb === 'menu' ? true : (dok[kb] as { aktif?: boolean }).aktif === true;
              const ket =
                kb === 'menu'
                  ? `${dok.menu.length} menu${dok.kepala.menu_bagian ? ' + bagian halaman' : ''}`
                  : kb === 'kepala'
                    ? ({ portal: 'Portal', aplikasi: 'Aplikasi', ringkas: 'Ringkas' }[dok.kepala.tampilan ?? 'portal'] ?? 'Portal')
                    : nyala
                      ? 'Tampil'
                      : 'Disembunyikan';
              return (
                <li key={kb} data-pilih={dataFlag(kb === bagian)} data-mati={dataFlag(!nyala)}>
                  <Tekan
                    className="upl-blok-tombol"
                    aria-current={kb === bagian ? 'true' : undefined}
                    onClick={() => {
                      setBagian(kb);
                      setPanel('properti');
                    }}
                  >
                    <d.ikon aria-hidden />
                    <span>
                      <strong>{d.label}</strong>
                      <small>{ket}</small>
                    </span>
                    <ChevronRight aria-hidden className="ups-panah" />
                  </Tekan>
                </li>
              );
            })}
          </ol>
          {boleh && dasar.adaDraf && (
            <div className="upl-struktur-kaki">
              <Button size="sm" variant="ghost" onClick={() => setBuka('buang')}>
                <Trash2 /> Buang draf
              </Button>
            </div>
          )}
        </aside>

        <main className="upl-kanvas" aria-label="Pratinjau">
          <BingkaiPratinjau lebar={LAYAR_PRATINJAU[layar].lebar} gelap={gelap} cssTema={cssTema} judul={`Pratinjau ${LAYAR_PRATINJAU[layar].label}`}>
            {pratinjau(dok, berkas, (x) => {
              setBagian(x);
              setPanel('properti');
            })}
          </BingkaiPratinjau>
        </main>

        <aside className="upl-properti" aria-label={`Pengaturan ${def.label}`}>
          <div className="upl-panel-kepala">
            <span className="upl-properti-judul">
              <def.ikon aria-hidden />
              <strong>{def.label}</strong>
            </span>
          </div>
          <p className="ups-keterangan">{def.keterangan}</p>
          <fieldset className="upl-properti-isi" disabled={!boleh}>
            {bagian === 'menu' ? (
              <>
                <PohonMenuSitus menu={dok.menu} ubah={(m, pesan) => ubahMenu(m, pesan)} pilih={pilihMenu} setPilih={setPilihMenu} boleh={boleh} />
                {butirP && jalurP && (
                  <div className="ups-butir-form">
                    <p className="u-label">
                      {jalurP.length === 1 ? 'Menu' : jalurP.length === 2 ? 'Sub menu' : 'Tautan tingkat 3'}: {butirP.label || 'Tanpa label'}
                    </p>
                    {KOLOM_BUTIR_MENU.map((kol) => (
                      <KolomIsian
                        key={`${butirP.id}-${kol.k}`}
                        kolom={kol}
                        isi={butirP as unknown as IsiBlok}
                        ubah={(isi) =>
                          ubahMenu(
                            setelButir(dok.menu, jalurP, () => ({ ...(isi as unknown as ButirMenu), id: butirP.id })),
                            '',
                            `menu:${butirP.id}`,
                          )
                        }
                        k={k}
                      />
                    ))}
                    {jalurP.length === 1 && bentukMenu(butirP) !== 'tautan' && (
                      <fieldset className="upl-daftar">
                        <legend>Kartu sorotan di panel menu</legend>
                        {KOLOM_SOROT.map((kol) => (
                          <KolomIsian
                            key={`${butirP.id}-sorot-${kol.k}`}
                            kolom={kol}
                            isi={(butirP.sorot ?? {}) as IsiBlok}
                            ubah={(isi) =>
                              ubahMenu(
                                setelButir(dok.menu, jalurP, (b) => ({ ...b, sorot: Object.keys(isi).length ? (isi as ButirMenu['sorot']) : undefined })),
                                '',
                                `menu:${butirP.id}:sorot`,
                              )
                            }
                            k={k}
                          />
                        ))}
                      </fieldset>
                    )}
                  </div>
                )}
              </>
            ) : (
              def.kolom.map((kol) => <KolomIsian key={`${bagian}-${kol.k}`} kolom={kol} isi={dok[bagian] as IsiBlok} ubah={(isi) => ubahBagian(bagian, isi)} k={k} />)
            )}
            {bagian === 'kepala' && dok.kepala.transparan && !atasGelapLanding(landing.dok) && (
              <Alert variant="info" title="Navbar tetap solid di halaman ini">
                Tembus pandang hanya berlaku bila bagian pertama halaman berlatar foto atau warna gelap, agar menu tetap terbaca.
              </Alert>
            )}
            {bagian === 'sidebar' && contoh === 'depan' && (
              <Alert variant="info" title="Sidebar tampil di halaman dalam">
                Pilih "Halaman dalam" di atas pratinjau untuk melihatnya. Halaman depan tidak memakai sidebar.
              </Alert>
            )}
          </fieldset>
          <p role="status" className="u-sr-only">
            {umumkan}
          </p>
        </aside>
      </div>

      <nav className="upl-tab-sempit" aria-label="Panel penyunting">
        <SegmentedControl
          fullWidth
          value={panel}
          onValueChange={(v) => setPanel(v as typeof panel)}
          options={[
            { value: 'struktur', label: 'Bagian' },
            { value: 'pratinjau', label: 'Pratinjau' },
            { value: 'properti', label: 'Pengaturan' },
          ]}
          aria-label="Panel penyunting"
        />
      </nav>

      <Sheet
        open={buka === 'preset'}
        onOpenChange={(o) => !o && setBuka(null)}
        title="Preset kerangka situs"
        description="Pasang susunan siap pakai, lalu ubah isinya. Bisa diurungkan dengan Ctrl+Z."
        size="md"
      >
        <ul className="ups-preset">
          {Object.entries(PRESET_SITUS).map(([kunci, p]) => (
            <li key={kunci}>
              <Tekan
                className="ups-preset-kartu"
                onClick={() => {
                  ubah(p.buat());
                  setPilihMenu(null);
                  setBuka(null);
                  toast.add({ title: `Preset ${p.nama} dipasang`, description: 'Simpan draf atau terbitkan bila sudah sesuai.', type: 'success' });
                }}
              >
                <strong>{p.nama}</strong>
                <span>{p.keterangan}</span>
              </Tekan>
            </li>
          ))}
        </ul>
      </Sheet>
      <PanelRiwayat
        open={buka === 'riwayat'}
        tutup={() => setBuka(null)}
        path={pathSitus(aplikasi, '/riwayat')}
        kunci={['tema-situs', aplikasi, lingkup ?? '']}
        lingkup={lingkup}
        satuan="butir menu"
        pulihkan={pulihkan}
        lihat={(id) => void lihat(id)}
      />
      <Dialog
        open={buka === 'terbit'}
        onOpenChange={(o) => !o && setBuka(null)}
        title="Terbitkan kepala dan kaki situs?"
        description={`Pengaturan ini langsung tampil di semua halaman publik ${typeof nama === 'string' ? nama : aplikasi}. Versi yang tampil sekarang tetap tersimpan di riwayat.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setBuka(null)}>
              Batal
            </Button>
            <Button loading={proses === 'terbit'} onClick={() => void terbitkan()}>
              <Send /> Terbitkan sekarang
            </Button>
          </>
        }
      >
        <Field label="Catatan perubahan" optional description="Membantu mengenali versi ini di riwayat.">
          <Textarea rows={2} maxLength={255} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="mis. menu Akademik jadi mega menu" />
        </Field>
      </Dialog>
      <ConfirmDialog
        open={buka === 'buang'}
        onOpenChange={(o) => !o && setBuka(null)}
        title="Buang draf?"
        description="Semua perubahan yang belum diterbitkan dihapus. Kepala dan kaki situs yang tampil ke pengunjung tidak berubah."
        confirmLabel="Buang draf"
        onConfirm={async () => {
          await buangDraf();
          setBuka(null);
        }}
      />
      <Dialog
        open={!!lihatVersi}
        onOpenChange={(o) => !o && setLihatVersi(null)}
        title={`Versi ${lihatVersi?.versi ?? ''}`}
        description="Pratinjau saja. Pulihkan dari panel Riwayat untuk menyuntingnya."
        size="full"
      >
        {lihatVersi && (
          <BingkaiPratinjau lebar={LAYAR_PRATINJAU[layar].lebar} gelap={gelap} cssTema={cssTema} className="upl-bingkai-versi" judul={`Versi ${lihatVersi.versi}`}>
            {pratinjau(lihatVersi.dok, lihatVersi.berkas)}
          </BingkaiPratinjau>
        )}
      </Dialog>
    </div>
  );
}

/** Kartu ringkas "Kepala & kaki situs" untuk PengaturanTema: status terbit dan tombol membuka penyunting layar penuh. */
export function KartuKerangkaSitus({ aplikasi, lingkup, nama, boleh, buka }: { aplikasi: string; lingkup?: string; nama?: string; boleh: boolean; buka: () => void }) {
  const q = useSiakadQuery<DataSitus>(
    ['tema-situs', aplikasi, lingkup ?? ''],
    (s, signal) => s.request<DataSitus>({ method: 'GET', path: pathSitus(aplikasi), query: lingkup ? { lingkup } : undefined, public: true }, { signal, maxRetries: 0 }),
    { staleTime: 30_000 },
  );
  const d = q.data;
  return (
    <div className="upl-kartu">
      <div className="upl-kartu-teks">
        <span className="u-label">Kepala & kaki situs</span>
        <p>Atur pita pengumuman, bilah kontak, navbar, menu utama dengan sub menu dan mega menu, kaki situs, dan sidebar halaman dalam {nama ?? aplikasi}. Berlaku di semua halaman publik.</p>
        <small>
          {q.loading
            ? 'Memuat status…'
            : q.error
              ? 'Status belum dapat dibaca.'
              : d?.versi
                ? `Versi ${d.versi} tampil${d.terbit_oleh ? `, diterbitkan ${d.terbit_oleh}` : ''}${d.terbit_pada ? ` (${d.terbit_pada})` : ''}.`
                : 'Belum pernah diterbitkan: pengunjung melihat kerangka bawaan.'}
        </small>
      </div>
      <Button size="sm" variant={boleh ? 'primary' : 'outline'} onClick={buka}>
        <SlidersHorizontal /> {boleh ? 'Atur kepala & kaki' : 'Lihat kepala & kaki'}
      </Button>
    </div>
  );
}
